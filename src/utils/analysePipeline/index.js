/**
 * index.js
 * Point d'entrée du pipeline d'analyse — orchestration complète.
 *
 * Entrée : un dossier sélectionné par l'utilisateur (FileSystemDirectoryHandle)
 * Sortie : Map<fournisseur, StandardizedBPU>
 */
import XLSX from 'xlsx-js-style';
import { normalizeSheet, normStr } from './normalize.js';
import { detectDocType, readWorkbook, fournisseurFromFilename } from './ingest.js';
import { mapBpuHeaders, applyBpuMapping } from './mappers/bpuMapper.js';
import {
  emptyStandardizedBPU,
  emptyStandardizedBpuLot,
  BPU_REQUIRED_FIELDS,
} from './schemas.js';
import { loadMapping, headersMatch } from './mappingStore.js';

/** Classe un nom de fichier dans une catégorie (BPU/QT/RSE/Chiffrage/Contacts/Candidature/Autres). */
function classifyFileName(name) {
  const l = name.toLowerCase();
  if (/standardis/i.test(l)) return null;
  // Ordre important : les catégories thématiques (RSE, QT, Contacts, Chiffrage)
  // l'emportent sur "BPU/Annexe 5" car certains fichiers RSE/QT contiennent
  // aussi "Annexe 5" dans leur nom (ex: "Annexe 5 - Questionnaire DD").
  if (/contact|annexe.?4|interlocuteur|coordonn|referent|correspondant/i.test(l)) return 'Contacts';
  if (/rse|developpement.?durable|d[eé]veloppement.?durable|durable|environn/i.test(l)) return 'RSE';
  if (/(?:^|[\s_\-])qt(?:[\s_\-.]|$)|questionnaire.?tech|questionnaire.?technique|annexe.?1/i.test(l)) return 'QT';
  if (/chiffrage|annexe.?3|mission.?type|simulation/i.test(l)) return 'Chiffrage';
  if (/bpu|annexe.?5|bordereau/i.test(l)) return 'BPU';
  if (/dc1|dc2|kbis|rib|attestation|urssaf|ccap|cctp|attri|engagement|delegation|signe/i.test(l)) return 'Candidature';
  return 'Autres';
}

const SKIP_DIRS = new Set(['standardises', 'compilation', '__pycache__', 'node_modules',
  'consignes', 'instructions', 'template', 'modele', 'modeles']);

/**
 * Récupère les fichiers xlsx dans un sous-dossier nommé (ex: BPU/, QT/).
 * Si le sous-dossier n'existe pas → rangement virtuel : descend récursivement
 * dans les dossiers fournisseurs et classifie chaque fichier par catégorie.
 */
async function listXlsxInSubdir(rootHandle, subdirName) {
  const norm = s => normStr(s);
  // 1. Chemin direct : sous-dossier explicite
  let target = null;
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind === 'directory' && norm(name) === norm(subdirName)) {
      target = handle;
      break;
    }
  }
  if (target) {
    const out = [];
    for await (const [name, handle] of target.entries()) {
      if (handle.kind === 'file' && /\.xlsx$/i.test(name) && !name.startsWith('~')) {
        out.push({ name, handle });
      }
    }
    if (out.length) return out.sort((a, b) => a.name.localeCompare(b.name));
  }
  // 2. Fallback : rangement virtuel — scan récursif + classification par nom
  const wanted = norm(subdirName);
  const gathered = [];
  const isLotDir = (n) => /^lot\s*\d+$/i.test(n.trim());
  async function walk(dir, depth = 0, supplierName = null) {
    if (depth > 6) return;
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'directory') {
        if (name.startsWith('.') || SKIP_DIRS.has(norm(name))) continue;
        // Les dossiers "Lot N" ne sont pas des fournisseurs, on les traverse sans capturer le nom
        const nextSup = supplierName || (depth >= 0 && !isLotDir(name) ? name : null);
        await walk(handle, depth + 1, nextSup);
      } else if (handle.kind === 'file') {
        if (!/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
        const cat = classifyFileName(name);
        if (!cat) continue;
        if (norm(cat) !== wanted) continue;
        // Préfixe le nom du fichier par le fournisseur pour que les compileurs
        // puissent extraire le supplier name via fournisseurFromFilename().
        const sup = supplierName ? supplierName.replace(/\s+(ok|OK|valid[eé])\s*$/i, '').trim() : '';
        const safeSup = sup.replace(/[\\/:*?"<>|]/g, '_');
        const fileName = sup ? `${safeSup} - ${name}` : name;
        gathered.push({ name: fileName, handle, _originalName: name });
      }
    }
  }
  await walk(rootHandle);
  return gathered.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Détecte les feuilles "Lot N" d'un workbook.
 * @returns Map<lotNum, sheetName>
 */
function detectLotSheets(wb) {
  const lots = new Map();
  for (const sn of wb.SheetNames) {
    const m = normStr(sn).match(/lot\s*(\d+)/);
    if (m) lots.set(parseInt(m[1], 10), sn);
  }
  return lots;
}

/**
 * Pipeline complet pour un fichier BPU.
 * @param {FileSystemFileHandle} fileHandle
 * @param {string} filename
 * @param {string} marcheId - pour lookup mapping persisté
 * @returns {Promise<StandardizedBPU>}
 */
export async function processBpuFile(fileHandle, filename, marcheId) {
  const wb = await readWorkbook(fileHandle);
  const fournisseur = fournisseurFromFilename(filename);
  const result = emptyStandardizedBPU(fournisseur, filename);

  const detection = detectDocType(wb);
  result.meta.detectedType = detection.type;

  const lotSheets = detectLotSheets(wb);
  if (!lotSheets.size) {
    // Pas de feuilles "Lot N" — on essaie quand même la première feuille
    const firstSheet = wb.SheetNames[0];
    if (firstSheet) lotSheets.set(0, firstSheet);
  }

  let totalConf = 0;
  let lotCount = 0;

  for (const [lotNum, sheetName] of lotSheets.entries()) {
    const ws = wb.Sheets[sheetName];
    const { headers, dataRows, headerRowIdx } = normalizeSheet(ws);
    if (headerRowIdx < 0 || !headers.length) continue;

    // Lookup mapping persisté
    let mapping;
    let confidence;
    let unmapped = [];
    let missing = [];
    let ambiguous = [];
    let userValidated = false;

    const saved = loadMapping(marcheId, fournisseur, 'BPU', lotNum);
    if (saved && headersMatch(saved.headers, headers)) {
      mapping = saved.mapping;
      confidence = 1.0;
      userValidated = true;
      missing = BPU_REQUIRED_FIELDS.filter(f => !(f in mapping));
    } else {
      const auto = mapBpuHeaders(headers);
      mapping = auto.mapping;
      confidence = auto.confidence;
      unmapped = auto.unmapped;
      missing = auto.missing;
      ambiguous = auto.ambiguous;
    }

    const { lignes, stats } = applyBpuMapping(dataRows, mapping);
    if (!lignes.length) continue;
    // Fournisseur non positionné sur ce lot : aucune ligne avec prix renseigné
    if ((stats.filled || 0) + (stats.partial || 0) === 0) continue;

    const lot = emptyStandardizedBpuLot(sheetName, headerRowIdx);
    lot.lignes = lignes;
    lot.meta.mappingConfidence = confidence;
    lot.meta.unmappedHeaders = unmapped;
    lot.meta.missingFields = missing;
    lot.meta.ambiguous = ambiguous;
    lot.meta.headers = headers;
    lot.meta.userValidated = userValidated;
    lot.meta.mapping = mapping;
    lot.meta.stats = stats;
    result.lots[lotNum] = lot;

    totalConf += confidence;
    lotCount++;
  }

  result.meta.overallConfidence = lotCount > 0 ? totalConf / lotCount : 0;
  result.meta.userValidated = Object.values(result.lots).every(l => l.meta.userValidated);
  return result;
}

/**
 * Traite tout un dossier BPU/.
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string} marcheId
 * @param {function} onProgress
 * @returns {Promise<StandardizedBPU[]>}
 */
export async function processBpuFolder(rootHandle, marcheId, onProgress = () => {}) {
  // BPU principal (Annexe 5)
  const filesBpu = await listXlsxInSubdir(rootHandle, 'BPU');
  // Chiffrage (Annexe 3) — fallback de positionnement quand l'Annexe 5 est vide
  let filesChiffrage = [];
  try { filesChiffrage = await listXlsxInSubdir(rootHandle, 'Chiffrage'); } catch (_) {}
  const allFiles = [...filesBpu, ...filesChiffrage.map(f => ({ ...f, _chiffrage: true }))];
  if (!allFiles.length) {
    throw new Error('Aucun fichier .xlsx trouvé dans le sous-dossier BPU/');
  }

  // Map fournisseur → result fusionné (lots agrégés depuis BPU + Chiffrage)
  const byFournisseur = new Map();
  for (let i = 0; i < allFiles.length; i++) {
    const { name, handle, _chiffrage } = allFiles[i];
    onProgress(`${i + 1}/${allFiles.length} — ${name}`);
    try {
      const std = await processBpuFile(handle, name, marcheId);
      if (_chiffrage) std.meta.fromChiffrage = true;
      const key = (std.fournisseur || '').toLowerCase().trim();
      if (!byFournisseur.has(key)) {
        byFournisseur.set(key, std);
      } else {
        // Fusion : pour chaque lot, on garde celui qui a le plus de lignes "filled"
        const existing = byFournisseur.get(key);
        for (const [lotNum, lot] of Object.entries(std.lots)) {
          const prev = existing.lots[lotNum];
          const newFilled = lot.meta.stats?.filled || 0;
          const prevFilled = prev?.meta?.stats?.filled || 0;
          if (!prev || newFilled > prevFilled) {
            existing.lots[lotNum] = lot;
          }
        }
      }
    } catch (e) {
      const fournisseur = fournisseurFromFilename(name);
      const key = fournisseur.toLowerCase().trim();
      if (!byFournisseur.has(key)) {
        byFournisseur.set(key, {
          fournisseur, sourceFile: name, lots: {},
          meta: { detectedType: 'unknown', overallConfidence: 0, userValidated: false, error: String(e) },
        });
      }
    }
  }
  return Array.from(byFournisseur.values());
}

// Re-exports pour faciliter l'import (placeholder)
// ─── Pipeline questionnaires (QT, RSE) ────────────────────────────────────────

import { mapQuestionnaireHeaders, applyQuestionnaireMapping } from './mappers/questionnaireMapper.js';
import { sheetToMatrix, dropEmptyRows, trimEmptyCols, isEmpty } from './normalize.js';

/**
 * Fallback robuste pour les questionnaires CCTP "Annexe technique" qui n'ont
 * pas de header reconnaissable. Stratégie : parcourir la matrice, identifier
 * les paires (question, réponse) en se basant sur la structure visuelle.
 *
 * Heuristique :
 *  - Une "question" est une cellule texte de longueur 5..400 char dans la 1re
 *    colonne textuelle d'une ligne, qui n'est pas un titre de section seul.
 *  - La "réponse" est la cellule textuelle suivante (à droite) sur la même
 *    ligne, ou la première cellule non-vide de la ligne suivante si vide.
 *  - On ignore les rangées entièrement vides et les titres de section
 *    (cellule unique en majuscules sur une ligne).
 */
const HEADER_LABEL_RE = /^(question|exigence|r[eé]ponse(\s+candidat|\s+fournisseur|\s+soumissionnaire)?|commentaire|observation|theme|th[eè]me|crit[eè]re|intitul[eé]|item|conformit[eé]|oui\s*\/\s*non)$/i;

function isLikelyQuestion(s) {
  if (!s) return false;
  if (s.length < 5 || s.length > 300) return false;
  // Doit contenir des lettres
  if (!/[a-zà-ÿ]/i.test(s)) return false;
  // Rejette les paragraphes (plusieurs phrases)
  const sentenceBreaks = (s.match(/\.\s+[A-ZÀ-Ý]/g) || []).length;
  if (sentenceBreaks >= 2) return false;
  return true;
}

function isSectionTitle(s) {
  if (!s) return false;
  if (s.length > 80) return false;
  // Pas de "?" ni ":" ni longue ponctuation = probablement un titre
  if (/[?:]/.test(s)) return false;
  // ALL CAPS court
  if (s.length < 60 && s === s.toUpperCase() && /[A-ZÀ-Ý]/.test(s)) return true;
  // Court & peu de mots
  const words = s.split(/\s+/);
  if (words.length <= 5 && s.length < 60) return true;
  return false;
}

function extractQuestionsHeuristic(ws) {
  const matrix = trimEmptyCols(dropEmptyRows(sheetToMatrix(ws)));
  if (!matrix.length) return { items: [], stats: { total: 0, answered: 0, empty: 0 } };

  // Score chaque colonne : nombre de cellules "question-like" (texte court, mono-phrase)
  const colStats = {};
  for (const row of matrix) {
    for (let c = 0; c < row.length; c++) {
      if (isEmpty(row[c])) continue;
      const v = String(row[c]).trim();
      if (!/[a-zà-ÿ]/i.test(v)) continue;
      if (!colStats[c]) colStats[c] = { qLike: 0, total: 0, lenSum: 0 };
      colStats[c].total++;
      colStats[c].lenSum += v.length;
      if (isLikelyQuestion(v)) colStats[c].qLike++;
    }
  }
  const candidates = Object.entries(colStats)
    .map(([c, s]) => ({ c: parseInt(c, 10), ...s, avgLen: s.lenSum / s.total }))
    .filter(s => s.qLike >= 3);
  if (!candidates.length) return { items: [], stats: { total: 0, answered: 0, empty: 0 } };
  // Préfère colonne avec beaucoup de questions ET avgLen modérée (pas un champ paragraphe)
  candidates.sort((a, b) => (b.qLike - b.avgLen / 50) - (a.qLike - a.avgLen / 50));
  const qCol = candidates[0].c;

  let theme = '';
  const items = [];
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    const qCell = row[qCol];
    if (isEmpty(qCell)) continue;
    const qText = String(qCell).trim();
    if (qText.length < 5) continue;
    if (HEADER_LABEL_RE.test(qText)) continue;

    const otherFilled = row.some((c, ci) => ci !== qCol && !isEmpty(c));

    // Titre de section : seule cellule remplie + court
    if (!otherFilled && isSectionTitle(qText)) {
      theme = qText;
      continue;
    }

    // Rejette paragraphes / réponses mal détectées
    if (!isLikelyQuestion(qText)) continue;

    // Cherche la réponse : première cellule non-vide à droite de qCol qui n'est pas identique
    let aText = '';
    for (let c = qCol + 1; c < row.length; c++) {
      if (isEmpty(row[c])) continue;
      const v = String(row[c]).trim();
      // Skip si c'est la même cellule (artefact unmerge)
      if (normStr(v) === normStr(qText)) continue;
      // Skip si c'est un label d'en-tête
      if (HEADER_LABEL_RE.test(v)) continue;
      aText = v;
      break;
    }
    items.push({ question: qText, reponse: aText, detail: '', theme, documentation: '' });
  }

  const answered = items.filter(it => it.reponse).length;
  return {
    items,
    stats: { total: items.length, answered, empty: items.length - answered },
  };
}

/**
 * Extracteur dédié au template Unicancer "Annexe 1 CCTP — questionnaire technique".
 * Structure attendue :
 *  - Feuilles nommées "QT LOT N" (parfois mono-feuille pour fichiers découpés)
 *  - Header en ligne 9 ou 10 (parfois autre) contenant "réponse candidat" qq part
 *  - Col A = question / titre de section, dernière col "réponse..." = réponse
 *  - Col "détail" (si présente) = aide, à ignorer
 *  - Lignes-section : col A remplie, col réponse vide, texte court
 *  - Bruit possible avant le header (coordonnées société, mentions custom)
 *  - Cellules réponses parfois fusionnées sur plusieurs questions (déjà géré par unmerge())
 */
function extractUnicancerQt(ws) {
  const matrix = trimEmptyCols(dropEmptyRows(sheetToMatrix(ws)));
  if (matrix.length < 3) return null;

  // 1. Trouve le header : ligne dans les 15 premières contenant "reponse" + col A non vide
  let headerIdx = -1;
  let aCol = -1;
  let qCol = -1;
  const lookAhead = Math.min(15, matrix.length);
  for (let r = 0; r < lookAhead; r++) {
    const row = matrix[r];
    if (!row || row.length < 2) continue;
    let foundA = -1;
    for (let c = 0; c < row.length; c++) {
      if (isEmpty(row[c])) continue;
      const cell = normStr(row[c]);
      // Strict : doit ressembler à un libellé de colonne réponse (et pas une mention type "Réponse AO UNICANCER")
      if (/^reponse(\s+(candidat|fournisseur|soumissionnaire))?$/.test(cell)) foundA = c;
    }
    if (foundA < 0) continue;
    // qCol = première colonne non-vide à gauche de aCol
    let foundQ = -1;
    for (let c = 0; c < foundA; c++) {
      if (!isEmpty(row[c])) { foundQ = c; break; }
    }
    if (foundQ < 0) continue;
    headerIdx = r;
    qCol = foundQ;
    aCol = foundA;
    break;
  }
  if (headerIdx < 0) return null;

  // 2bis. Si la colonne "réponse candidat" détectée est vide en data,
  // fallback : cherche une autre colonne à droite de qCol qui contient effectivement des réponses (cas CAMO LOT 2/3 où le label est en C mais les réponses sont en B).
  {
    let answersInACol = 0;
    for (let r = headerIdx + 1; r < Math.min(matrix.length, headerIdx + 40); r++) {
      if (!isEmpty(matrix[r]?.[aCol])) answersInACol++;
    }
    if (answersInACol === 0) {
      // Cherche une colonne entre qCol+1 et aCol-1 qui a des données
      for (let c = qCol + 1; c < aCol; c++) {
        let cnt = 0;
        for (let r = headerIdx + 1; r < Math.min(matrix.length, headerIdx + 40); r++) {
          if (!isEmpty(matrix[r]?.[c])) cnt++;
        }
        if (cnt >= 3) { aCol = c; break; }
      }
    }
  }

  // 2. Borne basse : dernière ligne avec col A non vide (max +60)
  let lastRow = headerIdx;
  for (let r = headerIdx + 1; r < Math.min(matrix.length, headerIdx + 80); r++) {
    if (!isEmpty(matrix[r]?.[qCol])) lastRow = r;
  }

  // 3. Parcours
  let theme = '';
  const items = [];
  for (let r = headerIdx + 1; r <= lastRow; r++) {
    const row = matrix[r] || [];
    const qCell = row[qCol];
    if (isEmpty(qCell)) continue;
    const qText = String(qCell).trim();
    if (qText.length < 3) continue;
    if (HEADER_LABEL_RE.test(qText)) continue;

    const aCell = row[aCol];
    const aText = isEmpty(aCell) ? '' : String(aCell).trim();
    // Filtre label "réponse candidat" leaké
    const aClean = HEADER_LABEL_RE.test(aText) || normStr(aText) === normStr(qText) ? '' : aText;

    // Détection section : pas de réponse + texte court/sans ponctuation interrogative
    if (!aClean && isSectionTitle(qText)) {
      theme = qText;
      continue;
    }
    // Bruit (titre QUESTIONNAIRE TECHNIQUE LOT N — déjà au-dessus du header normalement)
    if (/^questionnaire technique/i.test(qText)) continue;

    items.push({ question: qText, reponse: aClean, detail: '', theme, documentation: '' });
  }

  if (items.length < 2) return null;
  const answered = items.filter(it => it.reponse).length;
  return {
    items,
    stats: { total: items.length, answered, empty: items.length - answered },
  };
}

/**
 * Traite un fichier questionnaire (QT ou RSE).
 * @param {string} docType - 'QT' | 'RSE'
 * @returns {Promise<{fournisseur, sourceFile, sections, meta}>}
 */
export async function processQuestionnaireFile(fileHandle, filename, docType, marcheId) {
  const wb = await readWorkbook(fileHandle);
  const fournisseur = fournisseurFromFilename(filename);
  const sections = {};
  let totalConf = 0, sheetCount = 0;

  // Si le nom du fichier indique un lot précis (ex: "QT_Lot1_..."), on ne lit que ce lot
  const fileLotMatch = filename.match(/lot\s*(\d+)/i);
  const fileLotNum = fileLotMatch ? parseInt(fileLotMatch[1], 10) : null;

  for (const sheetName of wb.SheetNames) {
    // Ne traite que les feuilles "Lot N" (réponses par lot)
    if (!/lot\s*\d+/i.test(sheetName)) continue;
    // Si le fichier cible un lot précis, ignorer les feuilles des autres lots
    const sheetLotMatch = sheetName.match(/lot\s*(\d+)/i);
    if (fileLotNum && sheetLotMatch && parseInt(sheetLotMatch[1], 10) !== fileLotNum) continue;
    const ws = wb.Sheets[sheetName];
    const { headers, dataRows, headerRowIdx } = normalizeSheet(ws);

    let items = [], stats = { total: 0, answered: 0, empty: 0 }, confidence = 0;

    // 1. Template Unicancer dédié (QT) — couvre tous les fournisseurs analysés
    if (docType === 'QT') {
      const u = extractUnicancerQt(ws);
      if (u) { items = u.items; stats = u.stats; confidence = 0.95; }
    }
    // 2. Mapping par headers génériques
    if (!items.length && headerRowIdx >= 0 && headers.length) {
      const m = mapQuestionnaireHeaders(headers);
      if (m.confidence > 0) {
        const r = applyQuestionnaireMapping(dataRows, m.mapping);
        if (r.items.length) {
          items = r.items; stats = r.stats; confidence = m.confidence;
        }
      }
    }
    // 3. Fallback heuristique : scan brut de la matrice
    if (!items.length) {
      const r = extractQuestionsHeuristic(ws);
      if (r.items.length) {
        items = r.items; stats = r.stats; confidence = 0.4;
      }
    }
    if (!items.length) continue;
    // Si aucune réponse remplie pour ce lot → fournisseur non positionné, on l'ignore
    if (stats.answered === 0) continue;

    // Détecte un éventuel numéro de lot dans le nom de feuille
    const lotMatch = sheetName.match(/lot\s*(\d+)/i);
    const sectionKey = lotMatch ? `lot${lotMatch[1]}` : sheetName;

    sections[sectionKey] = {
      sheetSource: sheetName,
      lotNum: lotMatch ? parseInt(lotMatch[1], 10) : null,
      items,
      stats,
      mappingConfidence: confidence,
    };
    totalConf += confidence;
    sheetCount++;
  }

  return {
    fournisseur,
    sourceFile: filename,
    docType,
    sections,
    meta: {
      overallConfidence: sheetCount > 0 ? totalConf / sheetCount : 0,
      totalSections: sheetCount,
    },
  };
}

export async function processQuestionnaireFolder(rootHandle, subdirName, docType, marcheId, onProgress = () => {}) {
  const files = await listXlsxInSubdir(rootHandle, subdirName);
  if (!files.length) throw new Error(`Aucun fichier ${subdirName} détecté. Vérifiez que les fichiers contiennent "${subdirName}" ou "questionnaire technique" dans leur nom.`);

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const { name, handle } = files[i];
    onProgress(`${i + 1}/${files.length} — ${name}`);
    try {
      results.push(await processQuestionnaireFile(handle, name, docType, marcheId));
    } catch (e) {
      results.push({
        fournisseur: fournisseurFromFilename(name),
        sourceFile: name, docType, sections: {},
        meta: { overallConfidence: 0, error: String(e) },
      });
    }
  }
  // Dédoublonne par fournisseur : si plusieurs fichiers pour le même fournisseur,
  // fusionne les sections (lot par lot, en gardant celle qui a le plus de réponses).
  const merged = new Map();
  for (const r of results) {
    const key = (r.fournisseur || '').toLowerCase().trim();
    if (!merged.has(key)) { merged.set(key, r); continue; }
    const existing = merged.get(key);
    for (const [secKey, sec] of Object.entries(r.sections || {})) {
      const prev = existing.sections[secKey];
      if (!prev || (sec.stats?.answered || 0) > (prev.stats?.answered || 0)) {
        existing.sections[secKey] = sec;
      }
    }
  }
  return Array.from(merged.values());
}

export { mapQuestionnaireHeaders, applyQuestionnaireMapping } from './mappers/questionnaireMapper.js';
export { mapBpuHeaders, applyBpuMapping } from './mappers/bpuMapper.js';
export { normalizeSheet } from './normalize.js';
export { detectDocType, readWorkbook } from './ingest.js';
export { saveMapping, loadMapping, deleteMapping, listMappings } from './mappingStore.js';
export { BPU_TARGET_FIELDS, BPU_REQUIRED_FIELDS } from './schemas.js';
