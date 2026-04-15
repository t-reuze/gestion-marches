/**
 * analyseFolder.js
 * Logique de scan et compilation de dossiers AO fournisseurs.
 * Paramétré par une config marché (lots, docLabels, bpuReq, lotSheets…).
 *
 * Extrait de AnalyseMarche.jsx pour être réutilisable par marché.
 */
import XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import { extractContactsFromWorkbook } from './analysePipeline/contactExtractor.js';
import { extractContactFromPdfFile, extractAllContactsFromPdfFile } from './analysePipeline/pdfContact.js';
import { extractContactFromDocxFile, extractAllContactsFromDocxFile } from './analysePipeline/docxContact.js';

// ─── Helpers fichiers ─────────────────────────────────────────────────────────

export async function getAllFiles(dirHandle, path = '') {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('~') || name.startsWith('.')) continue;
    const fullPath = path ? path + '/' + name : name;
    if (handle.kind === 'file') files.push({ name, path: fullPath, handle });
    else files.push(...await getAllFiles(handle, fullPath));
  }
  return files;
}

export async function getSubdirs(dirHandle) {
  const dirs = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory' && !name.startsWith('.')) dirs.push({ name, handle });
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function findStdDir(dirHandle, depth = 0) {
  if (depth > 5) return null;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) entries.push([name, handle]);

  for (const [name, handle] of entries) {
    if (handle.kind === 'directory' && norm(name) === 'standardises') return handle;
  }

  const hasQT = entries.some(([n, h]) => h.kind === 'file' && /_qt_standardis/i.test(n) && !n.startsWith('~'));
  const subNorm = new Set(entries.filter(([, h]) => h.kind === 'directory').map(([n]) => norm(n)));
  if (hasQT || subNorm.has('bpu') || subNorm.has('rse') || subNorm.has('chiffrage')) return dirHandle;

  const SKIP = new Set(['standardises', 'compilation', '__pycache__', 'node_modules']);
  for (const [name, handle] of entries) {
    if (handle.kind !== 'directory' || name.startsWith('.') || SKIP.has(norm(name))) continue;
    const found = await findStdDir(handle, depth + 1);
    if (found) return found;
  }
  return null;
}

export async function findSubdirByName(dirHandle, name) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for await (const [n, h] of dirHandle.entries()) {
    if (h.kind === 'directory' && norm(n) === norm(name)) return h;
  }
  return null;
}

export async function listXlsxFiles(dirHandle, suffixRe) {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && /\.xlsx$/i.test(name) && !name.startsWith('~')) {
      const supName = name.replace(suffixRe, '').trim();
      files.push({ name, handle, supName });
    }
  }
  return files.sort((a, b) => a.supName.localeCompare(b.supName));
}

// ─── Helpers valeurs ──────────────────────────────────────────────────────────

const NA_VALS = new Set(['na', 'n/a', 'n.a.', 'n.a', 'non applicable', 'néant', 'neant', '-']);
export const isRealVal = v => { const s = String(v || '').trim().toLowerCase(); return s !== '' && !NA_VALS.has(s); };

/**
 * Normalisation aggressive pour rapprocher les noms fournisseurs entre sources.
 * Ex : "CAMO" ≈ "Camo medical", "DERODES" ≈ "DERODES PARTNERS",
 *      "AGATE life sciences" ≈ "AGATE LIFE SCIENCES"
 *
 * Stratégie : minuscules, sans accents, sans suffixes corporate, sans
 * mots génériques (life sciences, partners, sas, sa, sarl, group, etc.)
 */
const SUP_STOPWORDS = new Set([
  'sas', 'sa', 'sarl', 'sasu', 'eurl', 'snc', 'scop', 'gie', 'sci',
  'group', 'groupe', 'holding', 'company', 'co', 'inc', 'ltd', 'llc', 'plc',
  'partners', 'partner', 'consulting', 'consultants', 'consultant',
  'services', 'service', 'solutions', 'solution',
  'life', 'sciences', 'science', 'health', 'healthcare', 'medical', 'pharma',
  'france', 'fr', 'international', 'intl', 'europe', 'eu',
  'agency', 'agence', 'societe', 'cie',
]);

export const normSupName = s => {
  const base = String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+ok$/i, '')
    .replace(/[\(\)\[\]\.,;:'"\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Garde la version "loose" : tokens significatifs (≥ 2 caractères, pas stopwords)
  const tokens = base.split(' ').filter(t => t.length >= 2 && !SUP_STOPWORDS.has(t));
  return tokens.length ? tokens.join(' ') : base;
};

/**
 * Cherche dans un index la meilleure correspondance d'un nom fournisseur.
 * @param {string} target - nom à matcher
 * @param {string[]} candidates - noms candidats (déjà normalisés)
 * @returns {{match: string|null, score: number}}
 */
export function fuzzyMatchSupplier(target, candidates) {
  const t = normSupName(target);
  if (!t) return { match: null, score: 0 };
  let best = null, bestScore = 0;
  for (const c of candidates) {
    let score = 0;
    if (c === t) score = 1;
    else if (c.includes(t) || t.includes(c)) {
      score = Math.min(c.length, t.length) / Math.max(c.length, t.length);
    } else {
      // Jaccard sur tokens
      const tt = new Set(t.split(' '));
      const cc = new Set(c.split(' '));
      const inter = [...tt].filter(x => cc.has(x)).length;
      const union = new Set([...tt, ...cc]).size;
      score = union > 0 ? inter / union : 0;
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return { match: bestScore >= 0.5 ? best : null, score: bestScore };
}

export async function readXlsxHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

const normPath = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ─── Détection documents ──────────────────────────────────────────────────────

const DOC_RULES = {
  'QT (Annexe 1)': {
    ext: ['.xls', '.xlsx'],
    any: ['annexe 1', 'annexe1', 'qt lot', 'qt_lot', 'questionnaire technique',
          'questionnaire tech', 'cctp annexe', 'qt-lot', ' qt '],
    exclude: ['annexe 3', 'annexe3', 'annexe 5', 'annexe5', 'bpu', 'chiffrage', 'rse',
              'bordereau', 'standardis'],
  },
  'BPU (Annexe 5)': {
    ext: ['.xls', '.xlsx'],
    any: ['annexe 5', 'annexe5', 'bpu', 'bordereau de prix', 'bordereau prix',
          'bordereau unitaire', 'tarifs', 'grille tarifaire', 'grille de prix'],
    exclude: ['annexe 3', 'annexe3', 'chiffrage', 'standardis'],
  },
  'Optim. Tarifaire': {
    ext: ['.xls', '.xlsx'],
    any: ['optim', 'optimisation tarifaire', 'remise', 'tarif optim', 'grille remise'],
    exclude: ['standardis'],
  },
  'BPU Chiffrage': {
    ext: ['.xls', '.xlsx'],
    any: ['annexe 3', 'annexe3', 'chiffrage', 'chiffre', 'estimation', 'valorisation',
          'bordereau chiffrage', 'devis'],
    exclude: ['annexe 5', 'annexe5', 'bpu', 'standardis'],
  },
  'Questionnaire RSE': {
    ext: ['.xls', '.xlsx', '.pdf', '.doc', '.docx'],
    any: ['rse', 'developpement durable', 'questionnaire rse', 'responsabilite sociale',
          'responsabilite environnementale', 'dd ', 'environnement', 'annexe rse'],
    exclude: ['standardis'],
  },
  'CCAP signé': {
    ext: ['.pdf', '.p7m'],
    any: ['ccap', 'clauses administratives particulieres', 'clauses admin',
          'cahier des clauses admin', 'conditions administratives'],
    exclude: ['bpu', 'bordereau', 'annexe 5', 'annexe5', 'cctp'],
  },
  'CCTP signé': {
    ext: ['.pdf', '.p7m'],
    any: ['cctp', 'clauses techniques particulieres', 'clauses tech',
          'cahier technique', 'specifications techniques'],
    exclude: ['annexe 1', 'annexe1', 'qt', 'bpu', 'bordereau', 'ccap'],
  },
  'DC1': {
    ext: ['.pdf', '.p7m', '.doc', '.docx', '.xlsx'],
    any: ['dc1', 'lettre de candidature', 'lettre candidature',
          'habilitation mandataire', 'declaration candidature', 'formulaire dc1',
          'candidature lettre', 'pouvoir mandataire'],
    exclude: ['dc2'],
  },
  'DC2': {
    ext: ['.pdf', '.p7m', '.doc', '.docx', '.xlsx'],
    any: ['dc2', 'declaration du candidat', 'declaration candidat',
          'renseignements du candidat', 'renseignements candidat',
          'renseignements entreprise', 'formulaire dc2', 'capacites candidat'],
    exclude: ['dc1'],
  },
  'ATTRI1': {
    ext: ['.pdf', '.p7m'],
    any: ['attri1', 'attri', 'attribution', 'accord-cadre', 'accord cadre',
          'acte d engagement', 'acte engagement', 'notification de marche',
          'marche attribue', 'lettre attribution', 'avis attribution'],
    exclude: [],
  },
  'Fiche Contacts': {
    ext: null,
    any: ['contact', 'coordonnee', 'coordonnees', 'annexe 4', 'interlocuteur',
          'fiche contact', 'referent', 'correspondant', 'equipe', 'responsable marche'],
    exclude: [],
  },
};

/** Génère les règles de détection pour les lots dynamiquement */
function buildLotRules(lots) {
  const rules = {};
  for (const lot of lots) {
    const n = lot.num;
    const otherLots = lots.filter(l => l.num !== n);
    const excludeKw = otherLots.flatMap(l => [`lot ${l.num}`, `lot${l.num}`]);
    excludeKw.push('standardis');
    rules[`Lot ${n}`] = {
      ext: ['.xls', '.xlsx', '.pdf'],
      any: [`lot ${n}`, `lot${n}`, `lot_${n}`, `lot-${n}`],
      exclude: excludeKw,
    };
  }
  return rules;
}

export function detectDocs(files, lots = []) {
  const allRules = { ...DOC_RULES, ...buildLotRules(lots) };
  const entries = files.map(f => ({
    p: normPath(f.path),
    ext: (f.name.match(/\.[^.]+$/) || [''])[0].toLowerCase(),
  }));

  const result = {};
  for (const [label, { ext: exts, any: anyKw, exclude: exclKw }] of Object.entries(allRules)) {
    result[label] = entries.some(({ p, ext }) => {
      if (exts && !exts.includes(ext)) return false;
      if (exclKw.some(kw => p.includes(normPath(kw)))) return false;
      return anyKw.some(kw => p.includes(normPath(kw)));
    });
  }
  return result;
}

// ─── Scan annuaire ────────────────────────────────────────────────────────────

/**
 * Scanne un dossier AO et construit l'annuaire des fournisseurs.
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {object} config - analyseConfig du marché
 * @param {function} onProgress - callback (message)
 * @returns {Promise<{ rows: object[], warning: string }>}
 */
export async function scanAnnuaire(rootHandle, config, onProgress = () => {}) {
  let { lots = [], docLabels = [], bpuReq = {} } = config;
  // Lots / labels auto-détectés si absents du config (mode default)
  const autoLots = new Set();
  const autoMode = lots.length === 0;
  const val = b => b ? 'x' : '';

  const supInfo = {};
  const ensure = (norm, display) => {
    if (!supInfo[norm]) supInfo[norm] = {
      displayName: display, lots: new Set(),
      hasQT: false, hasBpu: false, hasOptim: false, hasRse: false, hasChiffrage: false,
      bpuMissing: {},
    };
  };

  let warning = '';

  // ── Helpers de traitement réutilisables (std + per-supplier) ──
  const isNum = v => {
    if (v == null || v === '') return false;
    if (typeof v === 'number') return Number.isFinite(v);
    const s = String(v).replace(/\s/g, '').replace(',', '.').replace(/[€%]/g, '');
    return !Number.isNaN(parseFloat(s)) && Number.isFinite(parseFloat(s));
  };
  function processBpuWb(wb, n) {
    ensure(n, n);
    supInfo[n].hasBpu = true;
    if (!supInfo[n].lotStatus) supInfo[n].lotStatus = {};
    for (const s of wb.SheetNames) {
      if (/optim/i.test(s)) {
        const rawSheet = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
        const hasContent = rawSheet.slice(1).some(r => r.slice(1).some(v => isRealVal(v)));
        supInfo[n].hasOptim = true;
        supInfo[n].optimFilled = hasContent;
        continue;
      }
      let lotNum = 0;
      const autoMatch = s.match(/lot\s*(\d+)/i);
      if (autoMode && autoMatch) {
        lotNum = parseInt(autoMatch[1], 10);
        autoLots.add(lotNum);
      } else {
        for (const lot of lots) {
          if (new RegExp(`lot\\s*${lot.num}`, 'i').test(s)) { lotNum = lot.num; break; }
        }
      }
      if (!lotNum) continue;
      const rawSheet = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
      const dataRows = rawSheet.slice(1).filter(r => String(r[0] || '').trim());
      const reqCols = bpuReq[lotNum] || [];
      const totalLines = dataRows.length;
      let filledLines = 0;
      const missing = [];
      for (const { col, name: colName } of reqCols) {
        const filled = dataRows.filter(r => isRealVal(r[col])).length;
        if (filled === 0) missing.push(colName);
      }
      for (const r of dataRows) {
        const isFilled = reqCols.length
          ? reqCols.some(({ col }) => isRealVal(r[col]))
          : r.slice(1).some(isNum);
        if (isFilled) filledLines++;
      }
      let status;
      if (totalLines === 0 || filledLines === 0) status = 'vide';
      else if (filledLines < totalLines || missing.length > 0) status = 'partiel';
      else status = 'rempli';
      supInfo[n].lotStatus[lotNum] = { status, filledLines, totalLines, missing };
      if (status !== 'vide') supInfo[n].lots.add(lotNum);
      if (missing.length) supInfo[n].bpuMissing[lotNum] = missing;
    }
  }

  const stdHandle = await findStdDir(rootHandle);
  if (stdHandle) {
    // QT
    onProgress('Lecture QT standardisés…');
    const qtDir = await findSubdirByName(stdHandle, 'QT') ?? stdHandle;
    for await (const [name, handle] of qtDir.entries()) {
      if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
      if (!/_qt_standardis/i.test(name)) continue;
      const display = name.replace(/_QT_standardis[eé]\.xlsx$/i, '').trim();
      const n = normSupName(display);
      ensure(n, display);
      try {
        const wb = await readXlsxHandle(handle);
        wb.SheetNames.forEach(s => {
          for (const lot of lots) {
            if (new RegExp(`lot\\s*${lot.num}`, 'i').test(s)) supInfo[n].lots.add(lot.num);
          }
        });
        supInfo[n].hasQT = true;
      } catch {}
    }

    // BPU — on délègue à processBpuWb (réutilisé en mode fallback)
    onProgress('Lecture BPU standardisés…');
    const bpuDir = await findSubdirByName(stdHandle, 'BPU');
    if (bpuDir) {
      for await (const [name, handle] of bpuDir.entries()) {
        if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
        const display = name.replace(/_BPU_standardis[eé]\.xlsx$/i, '').trim();
        const n = normSupName(display);
        ensure(n, display);
        try { processBpuWb(await readXlsxHandle(handle), n); } catch {}
      }
    }

    // RSE
    onProgress('Lecture RSE standardisés…');
    const rseDir = await findSubdirByName(stdHandle, 'RSE');
    if (rseDir) {
      for await (const [name, handle] of rseDir.entries()) {
        if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
        const display = name.replace(/_RSE_standardis[eé]\.xlsx$/i, '').trim();
        const n = normSupName(display);
        ensure(n, display);
        supInfo[n].hasRse = true;
      }
    }

    // Chiffrage
    onProgress('Lecture Chiffrage standardisés…');
    const chifDir = await findSubdirByName(stdHandle, 'Chiffrage');
    if (chifDir) {
      for await (const [name, handle] of chifDir.entries()) {
        if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
        const display = name.replace(/_Chiffrage_standardis[eé]\.xlsx$/i, '').trim();
        const n = normSupName(display);
        ensure(n, display);
        supInfo[n].hasChiffrage = true;
      }
    }
  }

  // ── Fallback : scan récursif et classification par nom de fichier ──
  // Couvre les structures DCE brutes (Reponses AO/Fournisseur/.../BPU Lot 1.xls)
  // ou dossier de templates au root.
  onProgress('Scan dossiers fournisseur…');
  const SKIP_FALLBACK = new Set(['standardises', 'compilation', '__pycache__',
    'consignes', 'instructions', 'template', 'modele', 'modeles']);

  function classifyAndProcess(file, supplierName) {
    const lower = file.name.toLowerCase();
    if (/standardis/i.test(lower)) return; // déjà traité
    const isBpu = /bpu|annexe.?5|bordereau|prix|tarif/i.test(lower) && !/chiffrage|mission.type/i.test(lower);
    const isChiffrage = /chiffrage|annexe.?3|mission.type|simulation/i.test(lower);
    const isRse = /rse|durable|environn|developpement.durable/i.test(lower);
    const isQt = /(?:^|[\s_\-])qt(?:[\s_\-.]|$)|questionnaire.?tech|questionnaire.?technique|annexe.?1/i.test(lower)
      || (/questionnaire/i.test(lower) && !isRse);
    if (!isBpu && !isChiffrage && !isQt && !isRse) return;
    return (async () => {
      try {
        const wb = await readXlsxHandle(file.handle);
        const norm = normSupName(supplierName);
        ensure(norm, supplierName);
        if (isBpu && !supInfo[norm].hasBpu) processBpuWb(wb, norm);
        if (isChiffrage) supInfo[norm].hasChiffrage = true;
        if (isQt) supInfo[norm].hasQT = true;
        if (isRse) supInfo[norm].hasRse = true;
      } catch {}
    })();
  }

  // Cas 1 : sous-dossiers fournisseur (chacun = un fournisseur)
  // Si les sous-dossiers sont des lots (Lot1/, Lot2/…), on descend d'un niveau
  // pour trouver les vrais dossiers fournisseurs à l'intérieur de chaque lot.
  const rootSubdirs = await getSubdirs(rootHandle);
  const isLotDir = (name) => /^lot\s*\d+$/i.test(name.trim());
  const hasLotStructure = rootSubdirs.some(s => isLotDir(s.name));

  let supplierFolders = []; // { dirName, dirHandle }
  if (hasLotStructure) {
    for (const { name: lotName, handle: lotHandle } of rootSubdirs) {
      if (!isLotDir(lotName) && SKIP_FALLBACK.has(normSupName(lotName))) continue;
      if (isLotDir(lotName)) {
        const lotMatch = lotName.match(/lot\s*(\d+)/i);
        const lotNum = lotMatch ? parseInt(lotMatch[1], 10) : null;
        if (lotNum) autoLots.add(lotNum);
        const lotSubdirs = await getSubdirs(lotHandle);
        for (const { name, handle } of lotSubdirs) {
          if (SKIP_FALLBACK.has(normSupName(name))) continue;
          supplierFolders.push({ dirName: name, dirHandle: handle });
          // Positionnement par lot : le fournisseur est dans ce dossier de lot
          if (lotNum) {
            const sn = normSupName(name);
            const display = name.replace(/\s+(ok|OK|valid[eé])\s*$/i, '').trim();
            ensure(sn, display);
            supInfo[sn].lots.add(lotNum);
          }
        }
      } else {
        supplierFolders.push({ dirName: lotName, dirHandle: lotHandle });
      }
    }
    // Dédoublonne par nom de fournisseur (même fournisseur dans plusieurs lots)
    const seen = new Map();
    for (const sf of supplierFolders) {
      const key = normSupName(sf.dirName);
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(sf);
    }
    supplierFolders = [];
    for (const [, entries] of seen) supplierFolders.push(entries[0]);
  } else {
    supplierFolders = rootSubdirs
      .filter(s => !SKIP_FALLBACK.has(normSupName(s.name)))
      .map(s => ({ dirName: s.name, dirHandle: s.handle }));
  }

  let processedAny = false;
  for (const { dirName, dirHandle } of supplierFolders) {
    const norm = normSupName(dirName);
    if (SKIP_FALLBACK.has(norm)) continue;
    const files = await getAllFiles(dirHandle);
    const xlsFiles = files.filter(f => /\.xlsx?$/i.test(f.name) && !f.name.startsWith('~'));
    if (!xlsFiles.length) continue;
    // Display name : retire suffixes "ok", "OK", trailing punctuation
    const display = dirName.replace(/\s+(ok|OK|valid[eé])\s*$/i, '').trim();
    for (const f of xlsFiles) await classifyAndProcess(f, display);
    processedAny = true;
  }

  // Cas 2 : pas de sous-dossier fournisseur exploitable → fichiers au root
  // (cas DCE templates), on les traite comme un fournisseur unique
  if (!processedAny && !stdHandle) {
    const rootFiles = [];
    for await (const [name, handle] of rootHandle.entries()) {
      if (handle.kind === 'file' && /\.xlsx?$/i.test(name) && !name.startsWith('~')) {
        rootFiles.push({ name, handle });
      }
    }
    for (const f of rootFiles) await classifyAndProcess(f, 'Templates AO');
  }

  if (!stdHandle && Object.keys(supInfo).length === 0) {
    warning = 'Aucun fichier xlsx/xls exploitable trouvé — vérifie la structure du dossier.';
  }

  // Scan PDF
  onProgress('Scan PDFs…');
  const SKIP_DIRS = new Set([
    'standardises', 'compilation', '__pycache__',
    'qt', 'bpu', 'rse', 'chiffrage',
    'ao', 'reponses', 'action a faire', 'actions a faire',
    'consignes', 'instructions', 'template', 'modele', 'modeles',
  ]);
  // Réutilise la même logique de détection lot/fournisseur que le scan principal
  const subdirs2 = await getSubdirs(rootHandle);
  const folderMap = {};
  if (hasLotStructure) {
    for (const { name: lotName, handle: lotHandle } of subdirs2) {
      if (isLotDir(lotName)) {
        const lotSubs = await getSubdirs(lotHandle);
        for (const { name, handle } of lotSubs) {
          const n = normSupName(name);
          if (SKIP_DIRS.has(n)) continue;
          if (!folderMap[n]) folderMap[n] = { name, handle };
        }
      } else {
        const n = normSupName(lotName);
        if (!SKIP_DIRS.has(n)) folderMap[n] = { name: lotName, handle: lotHandle };
      }
    }
  } else {
    for (const { name, handle } of subdirs2) {
      const n = normSupName(name);
      if (SKIP_DIRS.has(n)) continue;
      folderMap[n] = { name, handle };
    }
  }

  const hasStdData = Object.keys(supInfo).length > 0;
  if (!hasStdData) {
    for (const [n, { name }] of Object.entries(folderMap)) {
      ensure(n, name);
    }
  }

  // Matérialise les lots auto-détectés et injecte les colonnes Lot dans docLabels
  if (autoMode && autoLots.size) {
    lots = [...autoLots].sort((a, b) => a - b).map(num => ({ num, label: `Lot ${num}` }));
    docLabels = [...lots.map(l => l.label), ...docLabels];
  }

  // Index global des fichiers contacts (xlsx exploitables + pdf en marqueur)
  onProgress('Recherche fichiers contacts…');
  const allRootFiles = await getAllFiles(rootHandle);
  const contactFiles = allRootFiles.filter(f => {
    if (f.name.startsWith('~')) return false;
    if (!/\.(xlsx?|pdf|docx?)$/i.test(f.name)) return false;
    const p = normSupName(f.path);
    return p.includes('contact') || p.includes('annexe 4') || p.includes('interlocuteur');
  });

  const allNorms = Object.keys(supInfo).sort((a, b) =>
    supInfo[a].displayName.localeCompare(supInfo[b].displayName, 'fr', { sensitivity: 'base' })
  );
  const rows = [];
  for (let i = 0; i < allNorms.length; i++) {
    const n = allNorms[i];
    const info = supInfo[n];
    onProgress(`${i + 1}/${allNorms.length} — ${info.displayName}`);

    let raw = {};
    let contact = { prenom: '', nom: '', tel: '', mail: '' };
    const folder = folderMap[n];
    let supFiles = [];
    if (folder) {
      supFiles = await getAllFiles(folder.handle);
      raw = detectDocs(supFiles, lots);
    }
    // Étape "rangement virtuel" : classifie tous les fichiers du fournisseur
    // par catégorie (comme l'export zip), puis lit TOUS les fichiers Contacts
    // et fusionne les résultats. Fallback : recherche globale par tokens.
    const classifyFile = (name) => {
      const l = name.toLowerCase();
      if (/standardis/i.test(l)) return null;
      if (/contact|annexe.?4|interlocuteur|coordonn|referent|correspondant/i.test(l)) return 'Contacts';
      if (/bpu|annexe.?5|bordereau/i.test(l) && !/chiffrage|mission.type/i.test(l)) return 'BPU';
      if (/chiffrage|annexe.?3|mission.type|simulation/i.test(l)) return 'Chiffrage';
      if (/rse|durable|environn/i.test(l)) return 'RSE';
      if (/(?:^|[\s_\-])qt(?:[\s_\-.]|$)|questionnaire.?tech|questionnaire.?technique|annexe.?1/i.test(l)) return 'QT';
      if (/questionnaire/i.test(l)) return 'QT';
      if (/dc1|dc2|kbis|rib|attestation|urssaf|ccap|cctp|attri|engagement|delegation|signe/i.test(l)) return 'Candidature';
      return 'Autres';
    };
    let contactCandidates = supFiles.filter(f => {
      if (f.name.startsWith('~')) return false;
      if (!/\.(xlsx?|pdf|docx?)$/i.test(f.name)) return false;
      return classifyFile(f.name) === 'Contacts';
    });
    if (!contactCandidates.length) {
      const supTokens = n.split(/\s+/).filter(t => t.length > 2);
      contactCandidates = contactFiles.filter(f => {
        const p = normSupName(f.path);
        return supTokens.some(t => p.includes(t));
      });
    }

    // Collecte TOUS les contacts (pas juste le premier)
    const allContacts = [];
    const seen = new Set();
    const pushContact = (c) => {
      if (!c) return;
      if (!c.mail && !c.tel && !c.nom && !c.prenom) return;
      const key = (c.mail || '') + '|' + (c.nom || '').toLowerCase() + '|' + (c.prenom || '').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      allContacts.push(c);
    };
    let pdfSeen = false;
    const xlsxs = contactCandidates.filter(f => /\.xlsx?$/i.test(f.name));
    const pdfs = contactCandidates.filter(f => /\.pdf$/i.test(f.name));
    const docxs = contactCandidates.filter(f => /\.docx?$/i.test(f.name));
    for (const f of xlsxs) {
      try {
        const file = await f.handle.getFile();
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const cs = extractContactsFromWorkbook(wb);
        for (const c of cs) pushContact(c);
      } catch {}
    }
    for (const f of pdfs) {
      pdfSeen = true;
      try {
        const cs = await extractAllContactsFromPdfFile(f.handle);
        for (const c of cs) pushContact(c);
      } catch (e) {
        console.warn('PDF contact extraction failed:', e);
      }
    }
    for (const f of docxs) {
      pdfSeen = true;
      try {
        const cs = await extractAllContactsFromDocxFile(f.handle);
        for (const c of cs) pushContact(c);
      } catch (e) {
        console.warn('DOCX contact extraction failed:', e);
      }
    }
    if (allContacts.length) contact = allContacts[0];
    if (pdfSeen && !allContacts.length) {
      contact._pdfFound = true;
    }

    const bpuMissing = info.bpuMissing || {};
    const bpuHasMissing = Object.keys(bpuMissing).length > 0;
    const lotStatus = info.lotStatus || {};
    const bpuVal = info.hasBpu
      ? (bpuHasMissing ? 'partiel' : 'x')
      : (raw['BPU (Annexe 5)'] ? 'x' : 'non fourni');

    const row = { 'Nom fournisseur': info.displayName };

    // Lots dynamiques — sémantique riche par lot
    // 'x' (rempli) | 'partiel' | 'vide' (template présent mais pas rempli) | '' (absent)
    for (const lot of lots) {
      const lotLabel = docLabels.find(l => l.includes(`Lot ${lot.num}`)) || `Lot ${lot.num}`;
      const ls = lotStatus[lot.num];
      let v = '';
      if (ls) {
        if (ls.status === 'rempli') v = 'x';
        else if (ls.status === 'partiel') v = `partiel ${ls.filledLines}/${ls.totalLines}`;
        else v = 'vide';
      } else if (info.lots.has(lot.num) || raw[`Lot ${lot.num}`]) {
        v = 'x';
      }
      row[lotLabel] = v;
    }
    row._lotStatus = lotStatus;

    // Documents — on écrit sous les deux jeux de clés (court + long)
    // pour gérer DEFAULT_ANALYSE_CONFIG (BPU/QT) et configs détaillées
    // 'x' = présent et rempli · 'vide' = template présent non rempli · 'non fourni' = absent
    const docVal = (present, filled = true) => {
      if (!present) return 'non fourni';
      return filled ? 'x' : 'vide';
    };
    row['BPU (Annexe 5)'] = bpuVal;
    row['BPU'] = bpuVal;
    row['Optim. Tarifaire'] = info.hasOptim
      ? (info.optimFilled ? 'x' : 'vide')
      : (raw['Optim. Tarifaire'] ? 'x' : 'non fourni');
    row['QT (Annexe 1)'] = docVal(info.hasQT || raw['QT (Annexe 1)']);
    row['QT'] = docVal(info.hasQT || raw['QT (Annexe 1)']);
    row['BPU Chiffrage'] = docVal(info.hasChiffrage || raw['BPU Chiffrage']);
    row['Chiffrage'] = docVal(info.hasChiffrage || raw['BPU Chiffrage']);
    row['Questionnaire RSE'] = docVal(info.hasRse || raw['Questionnaire RSE']);
    row['CCAP signé'] = docVal(raw['CCAP signé']);
    row['CCTP signé'] = docVal(raw['CCTP signé']);
    row['DC1'] = docVal(raw['DC1']);
    row['DC2'] = docVal(raw['DC2']);
    row['ATTRI1'] = docVal(raw['ATTRI1']);
    row['Fiche Contacts'] = docVal(raw['Fiche Contacts']);
    row['PRENOM'] = contact.prenom || '';
    row['NOM'] = contact.nom || '';
    row['TEL'] = contact.tel || '';
    row['MAIL'] = contact.mail || '';
    row['FONCTION'] = contact.fonction || '';
    row._contacts = allContacts;
    row._contactPdfOnly = contact._pdfFound === true;
    row._bpuMissing = bpuMissing;

    rows.push(row);
  }

  return { rows, warning, docLabels };
}

// ─── Bundle par type de document ──────────────────────────────────────────────

/**
 * Réorganise un dossier de réponses fournisseur en un zip structuré
 * par type de document : un dossier par catégorie (BPU/QT/RSE/Chiffrage/
 * Candidature/Autres) contenant tous les fichiers de tous les fournisseurs,
 * préfixés par le nom du fournisseur.
 *
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {function} onProgress
 * @returns {Promise<Blob>} archive zip
 */
export async function bundleResponsesByDocType(rootHandle, onProgress = () => {}) {
  const zip = new JSZip();
  const SKIP = new Set(['standardises', 'compilation', '__pycache__',
    'consignes', 'instructions', 'template', 'modele', 'modeles']);

  const classify = (name) => {
    const l = name.toLowerCase();
    if (/standardis/i.test(l)) return null; // exclure fichiers déjà standardisés
    if (/bpu|annexe.?5|bordereau/i.test(l) && !/chiffrage|mission.type/i.test(l)) return 'BPU';
    if (/chiffrage|annexe.?3|mission.type|simulation/i.test(l)) return 'Chiffrage';
    if (/rse|durable|environn|developpement.durable/i.test(l)) return 'RSE';
    if (/(?:^|[\s_\-])qt(?:[\s_\-.]|$)|questionnaire.?tech|questionnaire.?technique|annexe.?1/i.test(l)) return 'QT';
    if (/questionnaire/i.test(l)) return 'QT';
    if (/dc1|dc2|kbis|rib|attestation|urssaf|ccap|cctp|attri|engagement|delegation|signe/i.test(l)) return 'Candidature';
    if (/contact|annexe.?4|interlocuteur/i.test(l)) return 'Contacts';
    return 'Autres';
  };

  const subdirs = await getSubdirs(rootHandle);
  const isLotDir2 = (n) => /^lot\s*\d+$/i.test(n.trim());
  const hasLots = subdirs.some(s => isLotDir2(s.name));

  let supplierDirs = [];
  if (hasLots) {
    for (const { name, handle } of subdirs) {
      if (isLotDir2(name)) {
        const lotSubs = await getSubdirs(handle);
        for (const sub of lotSubs) {
          if (!SKIP.has(normSupName(sub.name))) {
            const key = normSupName(sub.name);
            if (!supplierDirs.some(s => normSupName(s.name) === key)) {
              supplierDirs.push(sub);
            }
          }
        }
      } else if (!SKIP.has(normSupName(name))) {
        supplierDirs.push({ name, handle });
      }
    }
  } else {
    supplierDirs = subdirs.filter(s => !SKIP.has(normSupName(s.name)));
  }
  if (!supplierDirs.length) {
    throw new Error('Aucun sous-dossier fournisseur trouvé.');
  }

  let totalFiles = 0;
  for (let i = 0; i < supplierDirs.length; i++) {
    const { name: dirName, handle } = supplierDirs[i];
    const display = dirName.replace(/\s+(ok|OK|valid[eé])\s*$/i, '').trim();
    const safeSup = display.replace(/[\\/:*?"<>|]/g, '_');
    onProgress(`${i + 1}/${supplierDirs.length} — ${display}`);
    const files = await getAllFiles(handle);
    for (const f of files) {
      if (f.name.startsWith('~') || f.name.startsWith('.')) continue;
      const cat = classify(f.name);
      if (!cat) continue;
      try {
        const file = await f.handle.getFile();
        const buf = await file.arrayBuffer();
        const ext = (f.name.match(/\.[^.]+$/) || [''])[0];
        const baseName = f.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
        zip.file(`${cat}/${safeSup} - ${baseName}${ext}`, buf);
        totalFiles++;
      } catch {}
    }
  }

  if (!totalFiles) throw new Error('Aucun fichier classé trouvé dans les sous-dossiers.');
  onProgress(`Génération du zip (${totalFiles} fichiers)…`);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// ─── Compilation QT ───────────────────────────────────────────────────────────

export async function compileQT(rootHandle, config, selectedLots) {
  const { bpuReqCols = {} } = config;
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const qtDir = await findSubdirByName(stdDir, 'QT') ?? stdDir;
  const xlsxFiles = await listXlsxFiles(qtDir, /_QT_standardis[eé]\.xlsx$/i);

  // BPU source de vérité
  const bpuLotSups = {};
  for (const lotNum of selectedLots) bpuLotSups[lotNum] = new Set();

  const bpuDir = await findSubdirByName(stdDir, 'BPU');
  if (bpuDir) {
    for await (const [name, handle] of bpuDir.entries()) {
      if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
      const supName = name.replace(/_BPU_standardis[eé]\.xlsx$/i, '').trim();
      try {
        const wb = await readXlsxHandle(handle);
        for (const s of wb.SheetNames) {
          let ln = 0;
          for (const lotNum of selectedLots) {
            if (new RegExp(`lot\\s*${lotNum}`, 'i').test(s)) { ln = lotNum; break; }
          }
          if (!ln) continue;
          const req = bpuReqCols[ln] || [];
          const raw = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
          const dRows = raw.slice(1).filter(r => String(r[0] || '').trim());
          if (req.some(ci => dRows.some(r => isRealVal(r[ci])))) bpuLotSups[ln].add(supName);
        }
      } catch {}
    }
  }

  const result = {};
  for (const lot of selectedLots) {
    const lotSheetName = `QT LOT ${lot}`;
    const supData = {};

    for (const { handle, supName } of xlsxFiles) {
      const wb = await readXlsxHandle(handle);
      if (!wb.SheetNames.includes(lotSheetName)) continue;
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[lotSheetName], { header: 1, defval: '' });
      const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
      supData[supName] = rows.map(r => ({
        q: String(r[0] || '').trim(),
        a: String(r[2] || '').trim(),
      }));
    }

    for (const supName of (bpuLotSups[lot] || [])) {
      if (!supData[supName]) supData[supName] = [];
    }

    if (!Object.keys(supData).length) continue;

    const refSup = Object.keys(supData).find(s => supData[s].length > 0);
    if (!refSup) continue;
    const questions = supData[refSup].map(d => d.q);
    const supNames = Object.keys(supData).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

    const compiled = [['Question', ...supNames]];
    questions.forEach((q, qi) => {
      compiled.push([q, ...supNames.map(sup => {
        const rows = supData[sup];
        if (!rows.length) return '';
        return rows[qi]?.a || rows.find(r => r.q === q)?.a || '';
      })]);
    });

    const realQIdx = questions
      .map((_, qi) => supNames.some(sup => supData[sup][qi]?.a) ? qi : -1)
      .filter(i => i >= 0);
    const totalReal = realQIdx.length || questions.length;

    const supStatus = {};
    supNames.forEach(sup => {
      if (!supData[sup].length) {
        supStatus[sup] = { status: 'absent', filled: 0, total: totalReal };
      } else {
        const filled = realQIdx.filter(qi => supData[sup][qi]?.a).length;
        const status = filled === totalReal ? 'ok' : filled > 0 ? 'partial' : 'empty';
        supStatus[sup] = { status, filled, total: totalReal };
      }
    });

    result[lot] = { compiled, supStatus, questions, supData };
  }
  return result;
}

// ─── Compilation RSE ──────────────────────────────────────────────────────────

export async function compileRSE(rootHandle) {
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const rseDir = await findSubdirByName(stdDir, 'RSE');
  if (!rseDir) throw new Error('Dossier Standardisés/RSE/ introuvable.');

  const xlsxFiles = await listXlsxFiles(rseDir, /_RSE_standardis[eé]\.xlsx$/i);
  const SHEET = 'RSE DD';
  const supData = {};

  for (const { handle, supName } of xlsxFiles) {
    try {
      const wb = await readXlsxHandle(handle);
      if (!wb.SheetNames.includes(SHEET)) continue;
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { header: 1, defval: '' });
      const rows = raw.slice(1).filter(r => String(r[0] || '').trim() || String(r[1] || '').trim());
      if (!rows.some(r => String(r[2] || '').trim())) continue;
      supData[supName] = rows;
    } catch {}
  }

  if (!Object.keys(supData).length) return {};

  const refSup = Object.keys(supData).reduce((a, b) => supData[a].length >= supData[b].length ? a : b);
  const refRows = supData[refSup];
  const supNames = Object.keys(supData);

  const compiled = [['Thème', 'Question', ...supNames]];
  refRows.forEach((refRow, qi) => {
    compiled.push([
      String(refRow[0] || '').trim(),
      String(refRow[1] || '').trim(),
      ...supNames.map(sup => {
        const row = supData[sup][qi];
        return row ? String(row[2] || '').trim() : '';
      }),
    ]);
  });

  return { compiled, supNames };
}

// ─── Compilation BPU ──────────────────────────────────────────────────────────

/** Résout la keyFn à partir d'un identifiant string */
function resolveKeyFn(keyFnId) {
  if (keyFnId === 'profil-niveau') return r => `${String(r[0] || '').trim()}||${String(r[1] || '').trim()}`;
  if (keyFnId === 'profil') return r => String(r[0] || '').trim();
  return r => String(r[0] || '').trim();
}

export async function compileBPU(rootHandle, config) {
  const { lotSheets = [] } = config;
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const bpuDir = await findSubdirByName(stdDir, 'BPU');
  if (!bpuDir) throw new Error('Dossier Standardisés/BPU/ introuvable.');

  const xlsxFiles = await listXlsxFiles(bpuDir, /_BPU_standardis[eé]\.xlsx$/i);
  const result = {};

  for (const lotDef of lotSheets) {
    const keyFn = resolveKeyFn(lotDef.keyFn);
    const supPrices = {};
    const keyOrder = [];
    const keyRowMap = {};

    for (const { handle, supName } of xlsxFiles) {
      try {
        const wb = await readXlsxHandle(handle);
        if (!wb.SheetNames.includes(lotDef.name)) continue;
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[lotDef.name], { header: 1, defval: '' });
        const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
        const priceMap = new Map();
        for (const row of rows) {
          const key = keyFn(row);
          if (!key) continue;
          const price = String(row[lotDef.priceCol] || '').trim();
          priceMap.set(key, price);
          if (!keyRowMap[key]) { keyRowMap[key] = row; keyOrder.push(key); }
        }
        if ([...priceMap.values()].some(p => p !== '')) supPrices[supName] = priceMap;
      } catch {}
    }

    if (!Object.keys(supPrices).length) continue;

    const supNames = Object.keys(supPrices);
    const compiled = [[...lotDef.headers, ...supNames]];
    for (const key of keyOrder) {
      const refRow = keyRowMap[key];
      const rowCells = lotDef.headers.map((_, hi) => String(refRow[hi] || '').trim());
      rowCells.push(...supNames.map(sup => supPrices[sup]?.get(key) || ''));
      compiled.push(rowCells);
    }

    result[lotDef.name] = { compiled, supNames };
  }

  return result;
}

// ─── Compilation Chiffrage ────────────────────────────────────────────────────

export async function compileChiffrage(rootHandle, config) {
  const { chiffrageLotSheets = [] } = config;
  const stdDir = await findStdDir(rootHandle);
  if (!stdDir) throw new Error('Dossier "Standardisés" introuvable.');

  const chiffrageDir = await findSubdirByName(stdDir, 'Chiffrage');
  if (!chiffrageDir) throw new Error('Dossier Standardisés/Chiffrage/ introuvable.');

  const xlsxFiles = await listXlsxFiles(chiffrageDir, /_Chiffrage_standardis[eé]\.xlsx$/i);
  const result = {};

  for (const sheetName of chiffrageLotSheets) {
    const supPrices = {};
    const keyOrder = [];
    const keyRowMap = {};

    for (const { handle, supName } of xlsxFiles) {
      try {
        const wb = await readXlsxHandle(handle);
        if (!wb.SheetNames.includes(sheetName)) continue;
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
        const priceMap = new Map();
        for (const row of rows) {
          const profil = String(row[0] || '').trim();
          const niveau = String(row[1] || '').trim();
          const duree = String(row[2] || '').trim();
          const key = `${profil}||${niveau}||${duree}`;
          if (!profil) continue;
          priceMap.set(key, String(row[3] || '').trim());
          if (!keyRowMap[key]) { keyRowMap[key] = row; keyOrder.push(key); }
        }
        if ([...priceMap.values()].some(p => p !== '')) supPrices[supName] = priceMap;
      } catch {}
    }

    if (!Object.keys(supPrices).length) continue;

    const supNames = Object.keys(supPrices);
    const compiled = [['Profil', 'Niveau expérience', 'Durée mission', ...supNames]];
    for (const key of keyOrder) {
      const refRow = keyRowMap[key];
      compiled.push([
        String(refRow[0] || '').trim(),
        String(refRow[1] || '').trim(),
        String(refRow[2] || '').trim(),
        ...supNames.map(sup => supPrices[sup]?.get(key) || ''),
      ]);
    }

    result[sheetName] = { compiled, supNames };
  }

  return result;
}

// ─── Exports Excel ────────────────────────────────────────────────────────────

export function download(data, filename, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
