/**
 * ingest.js
 * Lecture d'un fichier xlsx + détection du type de document par contenu.
 *
 * Heuristiques :
 *   - BPU  : feuilles "Lot N" + headers prix (puHT, remise…) + lignes numériques
 *   - QT   : feuilles avec colonnes question/réponse, peu de numérique
 *   - RSE  : mots-clés RSE dans cellules (responsabilité, environnement…)
 *   - Chiffrage : estimations / valorisations / quantités × prix
 */
import XLSX from 'xlsx-js-style';
import { normalizeSheet, normStr, isNumeric, isEmpty } from './normalize.js';
import { mapBpuHeaders } from './mappers/bpuMapper.js';

export async function readWorkbook(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

const RSE_KEYWORDS = [
  'rse', 'responsabilite societale', 'responsabilite sociale',
  'environnement', 'developpement durable', 'iso 26000', 'iso26000',
  'empreinte carbone', 'eco-responsable', 'parite', 'inclusion',
];

const CHIFFRAGE_KEYWORDS = [
  'chiffrage', 'estimation', 'valorisation', 'simulation',
  'quantite estimee', 'volume estime', 'budget', 'cout estime',
];

const QT_KEYWORDS = [
  'question', 'reponse', 'commentaire', 'questionnaire',
  'critere', 'sous critere', 'sous-critere',
];

/**
 * Score un workbook pour chaque type de document.
 * Retourne { type, confidence, scores }.
 */
export function detectDocType(wb) {
  const scores = { BPU: 0, QT: 0, RSE: 0, Chiffrage: 0 };

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const sn = normStr(sheetName);

    // Indice nom de feuille
    if (/lot\s*\d/.test(sn)) { scores.BPU += 0.3; scores.QT += 0.2; }
    if (/optim/.test(sn)) scores.BPU += 0.2;
    if (RSE_KEYWORDS.some(k => sn.includes(k))) scores.RSE += 0.4;
    if (CHIFFRAGE_KEYWORDS.some(k => sn.includes(k))) scores.Chiffrage += 0.5;
    if (QT_KEYWORDS.some(k => sn.includes(k))) scores.QT += 0.3;

    // Analyse contenu
    const { headers, dataRows } = normalizeSheet(ws);
    if (!headers.length) continue;

    // BPU : mapping fuzzy + ratio numérique
    const { confidence: bpuConf } = mapBpuHeaders(headers);
    if (bpuConf > 0) scores.BPU += bpuConf * 0.6;

    const totalCells = dataRows.reduce((sum, r) => sum + r.filter(c => !isEmpty(c)).length, 0);
    const numCells = dataRows.reduce((sum, r) => sum + r.filter(c => isNumeric(c)).length, 0);
    const numRatio = totalCells > 0 ? numCells / totalCells : 0;

    if (numRatio > 0.25) scores.BPU += 0.2;
    if (numRatio < 0.1 && totalCells > 10) scores.QT += 0.2;

    // Mots-clés dans headers
    const headerStr = headers.join(' ');
    if (RSE_KEYWORDS.some(k => headerStr.includes(k))) scores.RSE += 0.3;
    if (QT_KEYWORDS.some(k => headerStr.includes(k))) scores.QT += 0.3;
    if (CHIFFRAGE_KEYWORDS.some(k => headerStr.includes(k))) scores.Chiffrage += 0.3;
  }

  // Type retenu = max
  let type = 'unknown';
  let max = 0;
  for (const [t, s] of Object.entries(scores)) {
    if (s > max) { max = s; type = t; }
  }
  if (max < 0.3) type = 'unknown';

  return { type, confidence: Math.min(max, 1), scores };
}

/**
 * Extrait un nom fournisseur depuis le nom de fichier (fallback).
 * Retire suffixes type "_BPU_standardisé.xlsx", "_QT.xlsx", etc.
 */
export function fournisseurFromFilename(filename) {
  return filename
    .replace(/\.xlsx?$/i, '')
    .replace(/[_\-\s]*(bpu|qt|rse|chiffrage)[_\-\s]*(standardis[eé])?$/i, '')
    .replace(/[_\-]+$/g, '')
    .replace(/[_]+/g, ' ')
    .trim();
}
