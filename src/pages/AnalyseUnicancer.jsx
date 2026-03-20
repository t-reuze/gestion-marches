import { useState } from 'react';
import XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import Layout from '../components/Layout';

/* ── Icons ──────────────────────────────────────────────────────────────── */
const IconAO = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconFolder = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6a2 2 0 0 1 2-2h3.5l2 2H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 10 8 14 16 6"/>
  </svg>
);

const DOC_LABELS = [
  'Lot 1 MAD Personnel', 'Lot 2 Recrutement', 'Lot 3 Freelance',
  'BPU (Annexe 5)', 'Optim. Tarifaire', 'QT (Annexe 1)',
  'BPU Chiffrage', 'Questionnaire RSE', 'CCAP signé',
  'CCTP signé', 'DC1', 'DC2', 'ATTRI1', 'Fiche Contacts',
];

// ─── Helpers fichiers ──────────────────────────────────────────────────────────

const val = b => b ? 'x' : '';

async function getAllFiles(dirHandle, path = '') {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('~') || name.startsWith('.')) continue;
    const fullPath = path ? path + '/' + name : name;
    if (handle.kind === 'file') files.push({ name, path: fullPath, handle });
    else files.push(...await getAllFiles(handle, fullPath));
  }
  return files;
}

async function getSubdirs(dirHandle) {
  const dirs = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory' && !name.startsWith('.')) dirs.push({ name, handle });
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Cherche récursivement le dossier contenant les fichiers standardisés.
 * Reconnaît :
 *   - un dossier nommé "Standardisés" (ou "standardises")
 *   - OU un dossier qui contient directement des *_QT_standardisé.xlsx
 *   - OU un dossier qui a des sous-dossiers BPU / RSE / Chiffrage
 */
async function findStdDir(dirHandle, depth = 0) {
  if (depth > 5) return null;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Collecter les entrées une seule fois
  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) entries.push([name, handle]);

  // 1. Enfant nommé "Standardisés"
  for (const [name, handle] of entries) {
    if (handle.kind === 'directory' && norm(name) === 'standardises') return handle;
  }

  // 2. Ce dossier lui-même contient des QT ou des sous-dossiers BPU/RSE/Chiffrage
  const hasQT   = entries.some(([n, h]) => h.kind === 'file' && /_qt_standardis/i.test(n) && !n.startsWith('~'));
  const subNorm = new Set(entries.filter(([, h]) => h.kind === 'directory').map(([n]) => norm(n)));
  if (hasQT || subNorm.has('bpu') || subNorm.has('rse') || subNorm.has('chiffrage')) return dirHandle;

  // 3. Descendre dans les sous-dossiers (hors cachés et dossiers système)
  const SKIP = new Set(['standardises', 'compilation', '__pycache__', 'node_modules']);
  for (const [name, handle] of entries) {
    if (handle.kind !== 'directory' || name.startsWith('.') || SKIP.has(norm(name))) continue;
    const found = await findStdDir(handle, depth + 1);
    if (found) return found;
  }
  return null;
}

async function findSubdirByName(dirHandle, name) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for await (const [n, h] of dirHandle.entries()) {
    if (h.kind === 'directory' && norm(n) === norm(name)) return h;
  }
  return null;
}

async function listXlsxFiles(dirHandle, suffixRe) {
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && /\.xlsx$/i.test(name) && !name.startsWith('~')) {
      const supName = name.replace(suffixRe, '').trim();
      files.push({ name, handle, supName });
    }
  }
  return files.sort((a, b) => a.supName.localeCompare(b.supName));
}

// Valeur réelle = non vide, non placeholder NA/N/A
const NA_VALS = new Set(['na', 'n/a', 'n.a.', 'n.a', 'non applicable', 'néant', 'neant', '-']);
const isRealVal = v => { const s = String(v||'').trim().toLowerCase(); return s !== '' && !NA_VALS.has(s); };

async function readXlsxHandle(fileHandle) {
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

// Normalise un nom fournisseur pour la comparaison (strip accents, espaces, "OK" final)
const normSupName = s => s.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+ok$/i, '').replace(/\s+/g, ' ').trim();

// ─── Styles Excel ─────────────────────────────────────────────────────────────

const ST = {
  header: (ci) => ({
    fill: { patternType: 'solid', fgColor: { rgb: ci === 0 ? '1B3A5C' : '2A5C8A' } },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { bottom: { style: 'medium', color: { rgb: 'E87722' } }, top: { style: 'thin', color: { rgb: '1B3A5C' } }, left: { style: 'thin', color: { rgb: '1B3A5C' } }, right: { style: 'thin', color: { rgb: '1B3A5C' } } },
  }),
  question: (even) => ({
    fill: { patternType: 'solid', fgColor: { rgb: even ? 'EBF3FF' : 'FFFFFF' } },
    font: { sz: 10, name: 'Calibri', color: { rgb: '1A1A2E' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: { top: { style: 'thin', color: { rgb: 'CCDDEE' } }, bottom: { style: 'thin', color: { rgb: 'CCDDEE' } }, left: { style: 'thin', color: { rgb: 'CCDDEE' } }, right: { style: 'thin', color: { rgb: 'CCDDEE' } } },
  }),
  answer: (even) => ({
    fill: { patternType: 'solid', fgColor: { rgb: even ? 'EBF3FF' : 'FFFFFF' } },
    font: { sz: 10, name: 'Calibri', color: { rgb: '333333' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: { top: { style: 'thin', color: { rgb: 'CCDDEE' } }, bottom: { style: 'thin', color: { rgb: 'CCDDEE' } }, left: { style: 'thin', color: { rgb: 'CCDDEE' } }, right: { style: 'thin', color: { rgb: 'CCDDEE' } } },
  }),
  ok:      { fill: { patternType: 'solid', fgColor: { rgb: 'DCFCE7' } }, font: { bold: true, color: { rgb: '15803D' }, sz: 10, name: 'Calibri' }, alignment: { horizontal: 'center' } },
  partial: { fill: { patternType: 'solid', fgColor: { rgb: 'FEF9C3' } }, font: { bold: true, color: { rgb: '92400E' }, sz: 10, name: 'Calibri' }, alignment: { horizontal: 'center' } },
  empty:   { fill: { patternType: 'solid', fgColor: { rgb: 'FEF2F2' } }, font: { bold: true, color: { rgb: 'BE185D' }, sz: 10, name: 'Calibri' }, alignment: { horizontal: 'center' } },
  absent:  { fill: { patternType: 'solid', fgColor: { rgb: 'FFE4E4' } }, font: { bold: true, color: { rgb: 'DC2626' }, sz: 10, name: 'Calibri' }, alignment: { horizontal: 'center' } },
};

function styledSheet(aoa, colWidths, { rowHeight = 40, freezeCol = false } = {}) {
  const ws = {};
  const nRows = aoa.length;
  const nCols = aoa[0]?.length || 0;
  aoa.forEach((row, ri) => {
    const isHeader = ri === 0;
    const even = ri % 2 === 0;
    row.forEach((val, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
      ws[ref] = {
        v: val == null ? '' : String(val), t: 's',
        s: isHeader ? ST.header(ci) : ci === 0 ? ST.question(even) : ST.answer(even),
      };
    });
  });
  const range = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: nRows - 1, c: nCols - 1 } });
  ws['!ref'] = range;
  ws['!cols'] = colWidths.map(wch => ({ wch }));
  ws['!rows'] = [{ hpt: rowHeight }];
  ws['!autofilter'] = { ref: range };
  ws['!freeze'] = freezeCol
    ? { xSplit: 1, ySplit: 1, topLeftCell: 'B2' }
    : { xSplit: 0, ySplit: 1, topLeftCell: 'A2' };
  return ws;
}

// ─── Exports Excel ────────────────────────────────────────────────────────────

function buildXlsx(rows) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nom fournisseur', ...DOC_LABELS],
    ...rows.map(r => [r['Nom fournisseur'], ...DOC_LABELS.map(l => r[l] || '')]),
  ]);
  ws['!cols'] = [{ wch: 36 }, ...DOC_LABELS.map(() => ({ wch: 12 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ANNUAIRE');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function buildQTXlsx(qtData) {
  const wb = XLSX.utils.book_new();

  const recapAoa = [['Lot', 'Fournisseur', 'Statut', 'Questions répondues']];
  for (const [lot, { supStatus }] of Object.entries(qtData)) {
    for (const [sup, { status, filled, total }] of Object.entries(supStatus)) {
      recapAoa.push([`LOT ${lot}`, sup,
        status === 'ok' ? 'Complet ✓' : status === 'partial' ? 'Partiel' : status === 'absent' ? 'Absent' : 'Vide',
        `${filled}/${total}`,
      ]);
    }
  }
  const recapWs = styledSheet(recapAoa, [12, 42, 16, 20], { rowHeight: 28 });
  recapAoa.forEach((row, ri) => {
    if (ri === 0) return;
    const ref = XLSX.utils.encode_cell({ r: ri, c: 2 });
    const s = row[2];
    recapWs[ref] = { v: s, t: 's', s: s.includes('Complet') ? ST.ok : s.includes('Partiel') ? ST.partial : s === 'Absent' ? ST.absent : ST.empty };
  });
  XLSX.utils.book_append_sheet(wb, recapWs, 'Récapitulatif');

  for (const [lot, { compiled }] of Object.entries(qtData)) {
    if (!compiled?.length) continue;
    const nSup = compiled[0].length - 1;

    // Intercale une colonne "Note" vide après chaque fournisseur
    const compiledWithNotes = compiled.map((row, ri) =>
      [row[0], ...Array.from({ length: nSup }, (_, si) => [
        row[si + 1] ?? '',
        ri === 0 ? 'Note' : '',
      ]).flat()]
    );

    const colWidths = [52, ...Array(nSup).flatMap(() => [40, 18])];
    const ws = styledSheet(compiledWithNotes, colWidths, { rowHeight: 36, freezeCol: true });

    // Re-style les cellules d'en-tête "Note" (gris clair)
    const noteStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: '4A6B8A' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri', italic: true },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'medium', color: { rgb: 'E87722' } }, top: { style: 'thin', color: { rgb: '1B3A5C' } }, left: { style: 'thin', color: { rgb: '1B3A5C' } }, right: { style: 'thin', color: { rgb: '1B3A5C' } } },
    };
    for (let si = 0; si < nSup; si++) {
      const noteCol = 1 + si * 2 + 1; // col index of "Note" header
      const ref = XLSX.utils.encode_cell({ r: 0, c: noteCol });
      if (ws[ref]) ws[ref].s = noteStyle;
    }

    XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// Template vierge : questions pré-remplies, col C vide
function buildTemplateXlsx(qtData) {
  const wb = XLSX.utils.book_new();
  for (const [lot, { questions }] of Object.entries(qtData)) {
    const aoa = [
      ['Question', 'Détail', 'Réponse candidat'],
      ...questions.map(q => [q, '', '']),
    ];
    const ws = styledSheet(aoa, [55, 25, 55], { rowHeight: 36, freezeCol: false });
    XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// ZIP des fichiers standardisés par fournisseur (un xlsx par fournisseur, une feuille par lot)
async function buildStandardizedZip(qtData) {
  const zip = new JSZip();

  // Collecter tous les fournisseurs positionnés
  const allSups = new Set();
  for (const { supData } of Object.values(qtData)) {
    if (supData) Object.keys(supData).filter(s => supData[s]?.some(r => r.a)).forEach(s => allSups.add(s));
  }

  for (const sup of allSups) {
    const wb = XLSX.utils.book_new();
    for (const [lot, { questions, supData }] of Object.entries(qtData)) {
      const rows = supData?.[sup];
      if (!rows?.some(r => r.a)) continue;
      const aoa = [
        ['Question', 'Détail', 'Réponse candidat'],
        ...questions.map((q, qi) => [q, '', rows[qi]?.a || rows.find(r => r.q === q)?.a || '']),
      ];
      const ws = styledSheet(aoa, [55, 25, 55], { rowHeight: 36, freezeCol: false });
      XLSX.utils.book_append_sheet(wb, ws, `QT LOT ${lot}`);
    }
    if (!wb.SheetNames.length) continue;
    const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    zip.file(`${sup}_QT_standardise.xlsx`, data);
  }

  return zip.generateAsync({ type: 'uint8array' });
}

function buildRSEXlsx(rseData) {
  const wb = XLSX.utils.book_new();
  const { compiled, supNames } = rseData;
  if (!compiled?.length) return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const n = supNames?.length || 0;
  const ws = styledSheet(compiled, [40, 55, ...Array(n).fill(50)], { rowHeight: 36, freezeCol: true });
  XLSX.utils.book_append_sheet(wb, ws, 'RSE DD');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function buildBPUXlsx(bpuData) {
  const wb = XLSX.utils.book_new();
  for (const [lotName, { compiled, supNames }] of Object.entries(bpuData)) {
    if (!compiled?.length) continue;
    const n = supNames?.length || 0;
    const isLot2OrOptim = lotName.includes('LOT 2') || lotName.includes('Optimisation');
    const colWidths = isLot2OrOptim
      ? [40, ...Array(n).fill(18)]
      : [40, 22, ...Array(n).fill(16)];
    const ws = styledSheet(compiled, colWidths, { rowHeight: 28, freezeCol: true });
    const sheetName = lotName.length > 31 ? lotName.substring(0, 31) : lotName;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function buildChiffrageXlsx(chiffrageData) {
  const wb = XLSX.utils.book_new();
  for (const [lotName, { compiled, supNames }] of Object.entries(chiffrageData)) {
    if (!compiled?.length) continue;
    const n = supNames?.length || 0;
    const ws = styledSheet(compiled, [40, 22, 28, ...Array(n).fill(16)], { rowHeight: 28, freezeCol: true });
    const sheetName = lotName.length > 31 ? lotName.substring(0, 31) : lotName;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

// ─── Détection documents par patterns étendus ────────────────────────────────
// ext : null = toutes extensions ; sinon liste d'extensions acceptées
// any : au moins un mot-clé doit être présent (dans nom de fichier OU dossier parent)
// exclude : aucun de ces mots ne doit être présent

const normPath = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const DOC_RULES = {
  // ── Documents Excel ──────────────────────────────────────────────────────
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
  // ── Lots (détectés par nom de fichier ou dossier) ────────────────────────
  'Lot 1': {
    ext: ['.xls', '.xlsx', '.pdf'],
    any: ['lot 1', 'lot1', 'lot_1', 'lot-1', 'mad', 'mise a disposition',
          'mise a dispo', 'personnel', 'interimaire'],
    exclude: ['lot 2', 'lot2', 'lot 3', 'lot3', 'standardis'],
  },
  'Lot 2': {
    ext: ['.xls', '.xlsx', '.pdf'],
    any: ['lot 2', 'lot2', 'lot_2', 'lot-2', 'recrutement', 'recruitment', 'cdi', 'cdd'],
    exclude: ['lot 1', 'lot1', 'lot 3', 'lot3', 'standardis'],
  },
  'Lot 3': {
    ext: ['.xls', '.xlsx', '.pdf'],
    any: ['lot 3', 'lot3', 'lot_3', 'lot-3', 'freelance', 'independant', 'portage'],
    exclude: ['lot 1', 'lot1', 'lot 2', 'lot2', 'standardis'],
  },
  // ── Documents PDF / signés ───────────────────────────────────────────────
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

function detectDocs(files) {
  const entries = files.map(f => ({
    p: normPath(f.path),
    ext: (f.name.match(/\.[^.]+$/) || [''])[0].toLowerCase(),
  }));

  const result = {};
  for (const [label, { ext: exts, any: anyKw, exclude: exclKw }] of Object.entries(DOC_RULES)) {
    result[label] = entries.some(({ p, ext }) => {
      if (exts && !exts.includes(ext)) return false;
      if (exclKw.some(kw => p.includes(normPath(kw)))) return false;
      return anyKw.some(kw => p.includes(normPath(kw)));
    });
  }
  return result;
}

function download(data, filename, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AnalyseUnicancer() {
  const [tab, setTab] = useState(0);
  const [reponsesDirHandle, setReponsesDirHandle] = useState(null);
  const [reponsesDirPath, setReponsesDirPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [annuaire, setAnnuaire] = useState([]);
  const [edits, setEdits] = useState({});
  const [lotsSelected, setLotsSelected] = useState([1, 2, 3]);
  const [compilingQt, setCompilingQt] = useState(false);
  const [qtData, setQtData] = useState({});
  const [dirWarning, setDirWarning] = useState('');
  const [generatingZip, setGeneratingZip] = useState(false);
  const [rseData, setRseData] = useState({});
  const [bpuData, setBpuData] = useState({});
  const [chiffrageData, setChiffrageData] = useState({});
  const [compilingRse, setCompilingRse] = useState(false);
  const [compilingBpu, setCompilingBpu] = useState(false);
  const [compilingChiffrage, setCompilingChiffrage] = useState(false);

  const supportsApi = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  async function pickDir() {
    try {
      const root = await window.showDirectoryPicker();
      setAnnuaire([]); setEdits({}); setDirWarning('');
      setReponsesDirHandle(root);
      setReponsesDirPath(root.name);
    } catch (e) { if (e.name !== 'AbortError') console.error(e); }
  }

  async function scan() {
    if (!reponsesDirHandle) return;
    setScanning(true); setAnnuaire([]); setEdits({});
    try {
      // ── 1. Charger les infos depuis Standardisés/ ────────────────────────────
      // supInfo : normName → { displayName, lots, hasQT, hasBpu, hasOptim, hasRse, hasChiffrage, bpuMissing }
      const supInfo = {};
      const ensure = (norm, display) => {
        if (!supInfo[norm]) supInfo[norm] = {
          displayName: display, lots: new Set(),
          hasQT: false, hasBpu: false, hasOptim: false, hasRse: false, hasChiffrage: false,
          bpuMissing: {}, // { lotNum: ['colonne manquante', ...] }
        };
      };

      // Colonnes fournisseur obligatoires par lot dans les BPU standardisés (index 0-based)
      const BPU_REQ = {
        1: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: '% Remise' }],
        2: [{ col: 1, name: '% Taux' }],
        3: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: 'PUHT/heure' }, { col: 4, name: '% Remise' }],
      };

      const stdHandle = await findStdDir(reponsesDirHandle);
      if (stdHandle) {
        // QT — les fichiers peuvent être directement dans stdHandle (structure Standardisés/)
        // ou dans un sous-dossier QT/ (structure AO_Recrutement_Standardisés/)
        setScanProgress('Lecture QT standardisés…');
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
              if (/lot\s*1/i.test(s)) supInfo[n].lots.add(1);
              if (/lot\s*2/i.test(s)) supInfo[n].lots.add(2);
              if (/lot\s*3/i.test(s)) supInfo[n].lots.add(3);
            });
            supInfo[n].hasQT = true;
          } catch {}
        }

        // BPU — source principale pour la détection des lots
        // Chaque feuille "LOT X — …" présente = fournisseur positionné sur ce lot
        setScanProgress('Lecture BPU standardisés…');
        const bpuDir = await findSubdirByName(stdHandle, 'BPU');
        if (bpuDir) {
          for await (const [name, handle] of bpuDir.entries()) {
            if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
            const display = name.replace(/_BPU_standardis[eé]\.xlsx$/i, '').trim();
            const n = normSupName(display);
            ensure(n, display);
            supInfo[n].hasBpu = true;
            try {
              const wb = await readXlsxHandle(handle);
              for (const s of wb.SheetNames) {
                if (/optim/i.test(s)) { supInfo[n].hasOptim = true; continue; }
                const lotNum = /lot\s*1/i.test(s) ? 1 : /lot\s*2/i.test(s) ? 2 : /lot\s*3/i.test(s) ? 3 : 0;
                if (!lotNum) continue;

                const rawSheet = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
                const dataRows = rawSheet.slice(1).filter(r => String(r[0]||'').trim());
                if (!dataRows.length) continue;

                // Vérifier chaque colonne obligatoire pour ce lot
                const reqCols = BPU_REQ[lotNum] || [];
                let anyFilled = false;
                const missing = [];
                for (const { col, name } of reqCols) {
                  const filled = dataRows.some(r => isRealVal(r[col]));
                  if (filled) anyFilled = true;
                  else missing.push(name);
                }
                if (anyFilled) {
                  supInfo[n].lots.add(lotNum);
                  if (missing.length) supInfo[n].bpuMissing[lotNum] = missing;
                }
              }
            } catch {}
          }
        }

        // RSE
        setScanProgress('Lecture RSE standardisés…');
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
        setScanProgress('Lecture Chiffrage standardisés…');
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
      } else {
        setDirWarning('Dossier "Standardisés" introuvable — données Excel absentes, seuls les PDFs seront détectés.');
      }

      // ── 2. Scan des dossiers fournisseurs pour les PDFs ──────────────────────
      // On ne scanne les dossiers QUE pour les PDFs des fournisseurs déjà connus.
      // Quand des fichiers standardisés existent, on n'ajoute PAS de nouveaux fournisseurs
      // depuis les dossiers bruts (évite "action a faire", "QT/", "BPU/" etc.).
      setScanProgress('Scan PDFs…');
      const SKIP_DIRS = new Set([
        'standardises', 'compilation', '__pycache__',
        'qt', 'bpu', 'rse', 'chiffrage',
        'ao', 'reponses', 'action a faire', 'actions a faire',
        'consignes', 'instructions', 'template', 'modele', 'modeles',
      ]);
      const subdirs = await getSubdirs(reponsesDirHandle);
      const folderMap = {};
      for (const { name, handle } of subdirs) {
        const n = normSupName(name);
        if (SKIP_DIRS.has(n)) continue;
        folderMap[n] = { name, handle };
      }

      // Si aucun fichier standardisé trouvé → fallback : tous les dossiers sont des fournisseurs
      // Si des fichiers standardisés existent → on n'ajoute pas les dossiers inconnus
      const hasStdData = Object.keys(supInfo).length > 0;
      if (!hasStdData) {
        for (const [n, { name }] of Object.entries(folderMap)) {
          ensure(n, name);
        }
      }

      // Construire les lignes de l'annuaire
      const allNorms = Object.keys(supInfo).sort((a, b) =>
        supInfo[a].displayName.localeCompare(supInfo[b].displayName, 'fr', { sensitivity: 'base' })
      );
      const rows = [];
      for (let i = 0; i < allNorms.length; i++) {
        const n = allNorms[i];
        const info = supInfo[n];
        setScanProgress(`${i + 1}/${allNorms.length} — ${info.displayName}`);

        // Scan des fichiers bruts pour compléter ce que les standardisés ne couvrent pas
        let raw = {};
        const folder = folderMap[n];
        if (folder) {
          const files = await getAllFiles(folder.handle);
          raw = detectDocs(files);
        }

        // BPU : 'x' si complet, 'partiel' si colonnes fournisseur manquantes, '' si absent
        const bpuMissing = info.bpuMissing || {};
        const bpuHasMissing = Object.keys(bpuMissing).length > 0;
        const bpuVal = info.hasBpu
          ? (bpuHasMissing ? 'partiel' : 'x')
          : (raw['BPU (Annexe 5)'] ? 'x' : '');

        rows.push({
          'Nom fournisseur':          info.displayName,
          // Lots : standardisés en priorité, sinon détection brute
          'Lot 1 MAD Personnel':      val(info.lots.has(1) || raw['Lot 1']),
          'Lot 2 Recrutement':        val(info.lots.has(2) || raw['Lot 2']),
          'Lot 3 Freelance':          val(info.lots.has(3) || raw['Lot 3']),
          // Excel : standardisés en priorité, sinon détection brute
          'BPU (Annexe 5)':           bpuVal,
          'Optim. Tarifaire':         val(info.hasOptim    || raw['Optim. Tarifaire']),
          'QT (Annexe 1)':            val(info.hasQT       || raw['QT (Annexe 1)']),
          'BPU Chiffrage': val(info.hasChiffrage|| raw['BPU Chiffrage']),
          'Questionnaire RSE':        val(info.hasRse      || raw['Questionnaire RSE']),
          // PDFs : détection brute uniquement
          'CCAP signé':               val(raw['CCAP signé']),
          'CCTP signé':               val(raw['CCTP signé']),
          'DC1':                      val(raw['DC1']),
          'DC2':                      val(raw['DC2']),
          'ATTRI1':                   val(raw['ATTRI1']),
          // Métadonnées (non affichées dans le tableau principal)
          _bpuMissing:                bpuMissing,
          'Fiche Contacts':           val(raw['Fiche Contacts']),
        });
      }
      setAnnuaire(rows);
    } catch (e) { console.error(e); }
    setScanning(false); setScanProgress('');
  }

  const getRows = () => annuaire.map((row, i) => ({ ...row, ...(edits[i] || {}) }));
  const setCell = (ri, col, value) => setEdits(e => ({ ...e, [ri]: { ...(e[ri] || {}), [col]: value } }));

  async function compileQT() {
    if (!reponsesDirHandle || !lotsSelected.length) return;
    setCompilingQt(true);
    try {
      // Cherche le dossier Standardisés/ dans Réponses/
      const stdDir = await findStdDir(reponsesDirHandle);
      if (!stdDir) {
        setDirWarning('Dossier "Standardisés" introuvable. Lancez d\'abord la standardisation Python.');
        setCompilingQt(false);
        return;
      }
      setDirWarning('');

      // Cherche QT/ subfolder (structure AO_Recrutement_Standardisés) ou lit directement
      const qtDir = await findSubdirByName(stdDir, 'QT') ?? stdDir;
      const xlsxFiles = await listXlsxFiles(qtDir, /_QT_standardis[eé]\.xlsx$/i);

      // ── Source de vérité des lots : BPU standardisés (avec exclusion NA) ──────
      // Pour chaque lot, récupère tous les fournisseurs réellement positionnés.
      const BPU_REQ_COLS = { 1: [2, 3], 2: [1], 3: [2, 4] };
      const bpuLotSups = { 1: new Set(), 2: new Set(), 3: new Set() };
      const bpuDir = await findSubdirByName(stdDir, 'BPU');
      if (bpuDir) {
        for await (const [name, handle] of bpuDir.entries()) {
          if (handle.kind !== 'file' || !/\.xlsx$/i.test(name) || name.startsWith('~')) continue;
          const supName = name.replace(/_BPU_standardis[eé]\.xlsx$/i, '').trim();
          try {
            const wb = await readXlsxHandle(handle);
            for (const s of wb.SheetNames) {
              const ln = /lot\s*1/i.test(s) ? 1 : /lot\s*2/i.test(s) ? 2 : /lot\s*3/i.test(s) ? 3 : 0;
              if (!ln) continue;
              const req = BPU_REQ_COLS[ln] || [];
              const raw = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' });
              const dRows = raw.slice(1).filter(r => String(r[0]||'').trim());
              if (req.some(ci => dRows.some(r => isRealVal(r[ci])))) bpuLotSups[ln].add(supName);
            }
          } catch {}
        }
      }

      const result = {};

      for (const lot of lotsSelected) {
        const lotSheetName = `QT LOT ${lot}`;
        const supData = {};

        // 1. Lire les réponses QT de chaque fournisseur qui a un fichier pour ce lot
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

        // 2. Ajouter les fournisseurs positionnés (BPU) mais sans QT pour ce lot → "Absent"
        for (const supName of bpuLotSups[lot]) {
          if (!supData[supName]) supData[supName] = [];  // tableau vide = pas de QT
        }

        if (!Object.keys(supData).length) continue;

        // Questions de référence = premier fournisseur qui a des données QT
        const refSup = Object.keys(supData).find(s => supData[s].length > 0);
        if (!refSup) continue;
        const questions = supData[refSup].map(d => d.q);

        // Tous les fournisseurs triés (avec et sans QT)
        const supNames = Object.keys(supData).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

        const compiled = [['Question', ...supNames]];
        questions.forEach((q, qi) => {
          compiled.push([q, ...supNames.map(sup => {
            const rows = supData[sup];
            if (!rows.length) return '';   // pas de QT pour ce lot
            return rows[qi]?.a || rows.find(r => r.q === q)?.a || '';
          })]);
        });

        // Statut : questions répondues par au moins un fournisseur
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
      setQtData(result);
    } catch (e) { console.error(e); }
    setCompilingQt(false);
  }

  async function compileRSE() {
    if (!reponsesDirHandle) return;
    setCompilingRse(true);
    try {
      const stdDir = await findStdDir(reponsesDirHandle);
      if (!stdDir) {
        setDirWarning('Dossier "Standardisés" introuvable.');
        setCompilingRse(false);
        return;
      }
      setDirWarning('');

      const rseDir = await findSubdirByName(stdDir, 'RSE');
      if (!rseDir) {
        setDirWarning('Dossier Standardisés/RSE/ introuvable.');
        setCompilingRse(false);
        return;
      }

      const xlsxFiles = await listXlsxFiles(rseDir, /_RSE_standardis[eé]\.xlsx$/i);

      const SHEET = 'RSE DD';
      const supData = {};

      for (const { handle, supName } of xlsxFiles) {
        try {
          const wb = await readXlsxHandle(handle);
          if (!wb.SheetNames.includes(SHEET)) continue;
          const raw = XLSX.utils.sheet_to_json(wb.Sheets[SHEET], { header: 1, defval: '' });
          // row 0 = headers, rows 1+ = data
          const rows = raw.slice(1).filter(r => String(r[0] || '').trim() || String(r[1] || '').trim());
          if (!rows.some(r => String(r[2] || '').trim())) continue;
          supData[supName] = rows;
        } catch (err) { console.error(err); }
      }

      if (!Object.keys(supData).length) {
        setRseData({});
        setCompilingRse(false);
        return;
      }

      // Reference questions from supplier with most rows
      const refSup = Object.keys(supData).reduce((a, b) => supData[a].length >= supData[b].length ? a : b);
      const refRows = supData[refSup];
      const supNames = Object.keys(supData);

      const compiled = [['Thème', 'Question', ...supNames]];
      refRows.forEach((refRow, qi) => {
        const theme = String(refRow[0] || '').trim();
        const question = String(refRow[1] || '').trim();
        compiled.push([
          theme,
          question,
          ...supNames.map(sup => {
            const row = supData[sup][qi];
            return row ? String(row[2] || '').trim() : '';
          }),
        ]);
      });

      setRseData({ compiled, supNames });
    } catch (e) { console.error(e); }
    setCompilingRse(false);
  }

  async function compileBPU() {
    if (!reponsesDirHandle) return;
    setCompilingBpu(true);
    try {
      const stdDir = await findStdDir(reponsesDirHandle);
      if (!stdDir) {
        setDirWarning('Dossier "Standardisés" introuvable.');
        setCompilingBpu(false);
        return;
      }
      setDirWarning('');

      const bpuDir = await findSubdirByName(stdDir, 'BPU');
      if (!bpuDir) {
        setDirWarning('Dossier Standardisés/BPU/ introuvable.');
        setCompilingBpu(false);
        return;
      }

      const xlsxFiles = await listXlsxFiles(bpuDir, /_BPU_standardis[eé]\.xlsx$/i);

      const LOT_SHEETS = [
        { name: 'LOT 1 – MAD Personnel', keyFn: r => `${String(r[0]||'').trim()}||${String(r[1]||'').trim()}`, priceCol: 4, headers: ['Profil', 'Niveau expérience'] },
        { name: 'LOT 2 – Recrutement',   keyFn: r => String(r[0]||'').trim(),                                   priceCol: 1, headers: ['Profil'] },
        { name: 'LOT 3 – Freelance',     keyFn: r => `${String(r[0]||'').trim()}||${String(r[1]||'').trim()}`, priceCol: 5, headers: ['Profil', 'Niveau expérience'] },
        { name: 'Optimisation Tarifaire',keyFn: r => String(r[0]||'').trim(),                                   priceCol: 1, headers: ['Condition'] },
      ];

      const result = {};

      for (const lotDef of LOT_SHEETS) {
        const supPrices = {}; // supName -> Map(key -> price)
        const keyOrder = [];
        const keyRowMap = {}; // key -> reference row

        for (const { handle, supName } of xlsxFiles) {
          try {
            const wb = await readXlsxHandle(handle);
            if (!wb.SheetNames.includes(lotDef.name)) continue;
            const raw = XLSX.utils.sheet_to_json(wb.Sheets[lotDef.name], { header: 1, defval: '' });
            const rows = raw.slice(1).filter(r => String(r[0] || '').trim());
            const priceMap = new Map();
            for (const row of rows) {
              const key = lotDef.keyFn(row);
              if (!key) continue;
              const price = String(row[lotDef.priceCol] || '').trim();
              priceMap.set(key, price);
              if (!keyRowMap[key]) {
                keyRowMap[key] = row;
                keyOrder.push(key);
              }
            }
            const hasPrice = [...priceMap.values()].some(p => p !== '');
            if (hasPrice) supPrices[supName] = priceMap;
          } catch (err) { console.error(err); }
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

      setBpuData(result);
    } catch (e) { console.error(e); }
    setCompilingBpu(false);
  }

  async function compileChiffrage() {
    if (!reponsesDirHandle) return;
    setCompilingChiffrage(true);
    try {
      const stdDir = await findStdDir(reponsesDirHandle);
      if (!stdDir) {
        setDirWarning('Dossier "Standardisés" introuvable.');
        setCompilingChiffrage(false);
        return;
      }
      setDirWarning('');

      const chiffrageDir = await findSubdirByName(stdDir, 'Chiffrage');
      if (!chiffrageDir) {
        setDirWarning('Dossier Standardisés/Chiffrage/ introuvable.');
        setCompilingChiffrage(false);
        return;
      }

      const xlsxFiles = await listXlsxFiles(chiffrageDir, /_Chiffrage_standardis[eé]\.xlsx$/i);

      const LOT_SHEETS = [
        'LOT 1 – MAD Personnel',
        'LOT 3 – Freelance',
      ];

      const result = {};

      for (const sheetName of LOT_SHEETS) {
        const supPrices = {}; // supName -> Map(key -> price)
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
              const duree  = String(row[2] || '').trim();
              const key = `${profil}||${niveau}||${duree}`;
              if (!profil) continue;
              const price = String(row[3] || '').trim();
              priceMap.set(key, price);
              if (!keyRowMap[key]) {
                keyRowMap[key] = row;
                keyOrder.push(key);
              }
            }
            if ([...priceMap.values()].some(p => p !== '')) supPrices[supName] = priceMap;
          } catch (err) { console.error(err); }
        }

        if (!Object.keys(supPrices).length) continue;

        const supNames = Object.keys(supPrices);
        const compiled = [['Profil', 'Niveau expérience', 'Durée mission', ...supNames]];

        for (const key of keyOrder) {
          const refRow = keyRowMap[key];
          const rowCells = [
            String(refRow[0] || '').trim(),
            String(refRow[1] || '').trim(),
            String(refRow[2] || '').trim(),
            ...supNames.map(sup => supPrices[sup]?.get(key) || ''),
          ];
          compiled.push(rowCells);
        }

        result[sheetName] = { compiled, supNames };
      }

      setChiffrageData(result);
    } catch (e) { console.error(e); }
    setCompilingChiffrage(false);
  }

  async function handleDownloadZip() {
    setGeneratingZip(true);
    try {
      const data = await buildStandardizedZip(qtData);
      download(data, 'QT_standardises.zip', 'application/zip');
    } catch (e) { console.error(e); }
    setGeneratingZip(false);
  }

  const rows = getRows();
  const nbF = annuaire.length;
  const hasQT = Object.keys(qtData).length > 0;
  const hasRSE = rseData.compiled?.length > 0;
  const hasBPU = Object.keys(bpuData).length > 0;
  const hasChiffrage = Object.keys(chiffrageData).length > 0;

  // Helper: find lowest price index among supplier columns for a data row
  function lowestPriceIdx(rowCells, startCol) {
    const nums = rowCells.slice(startCol).map(v => {
      const n = parseFloat(String(v).replace(',', '.').replace(/[^0-9.-]/g, ''));
      return isNaN(n) ? null : n;
    });
    const valid = nums.filter(n => n !== null);
    if (!valid.length) return -1;
    const min = Math.min(...valid);
    return nums.findIndex(n => n === min);
  }

  return (
    <Layout title="AO Recrutement Personnel 2026" sub="— Analyse des offres">

      <div style={{ background: 'linear-gradient(135deg,#001120 0%,#002456 100%)', borderRadius: 10, padding: '20px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(232,80,26,.18)', border: '1px solid rgba(232,80,26,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E87722', flexShrink: 0 }}>
          <IconAO />
        </div>
        <div>
          <div style={{ color: '#E87722', fontWeight: 700, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 5 }}>Unicancer</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Traçabilité &amp; Compilation — AO Recrutement de Personnel 2026</div>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 3 }}>Détection automatique · Compilation QT · Standardisation</div>
        </div>
      </div>

      {!supportsApi && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          <strong>Navigateur non compatible</strong> — Cette fonctionnalité nécessite Chrome ou Edge.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><IconFolder /> Dossier de l&apos;AO</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={pickDir} disabled={!supportsApi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconFolder /> Sélectionner le dossier…</button>
            {reponsesDirPath && (
              <>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Dossier fournisseurs :</div>
                  <code style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 5, fontSize: 12 }}>{reponsesDirPath}</code>
                </div>
                <button className="btn btn-primary" onClick={scan} disabled={scanning} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {scanning ? scanProgress : <><IconSearch /> Analyser</>}
                </button>
              </>
            )}
            {nbF > 0 && !scanning && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#15803d', fontWeight: 600, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 10px' }}>
                <IconCheck /> {nbF} fournisseur{nbF > 1 ? 's' : ''} détecté{nbF > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {dirWarning && <div style={{ marginTop: 8, fontSize: 12, color: '#d97706', display: 'flex', alignItems: 'center', gap: 5 }}>Avertissement : {dirWarning}</div>}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {['Annuaire documents', 'Compilation QT', 'Comparatif BPU', 'RSE', 'Chiffrage', 'Détail QT', 'Outils'].map((t, i) => (
          <div key={i} className={'tab' + (tab === i ? ' active' : '')} onClick={() => setTab(i)}>{t}</div>
        ))}
      </div>

      {/* ─── Onglet 0 : Annuaire ─── */}
      {tab === 0 && (
        <div className="fade-in">
          {rows.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => download(buildXlsx(rows), 'ANNUAIRE_documents_fournisseurs.xlsx')}>Exporter Excel</button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tapez <strong>x</strong> si présent, laissez vide sinon.</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Fournisseur</th>
                      {DOC_LABELS.map(l => <th key={l} className="td-center" style={{ fontSize: 10, padding: '6px 3px', minWidth: 58 }}>{l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{row['Nom fournisseur']}</td>
                        {DOC_LABELS.map(col => {
                          const v = row[col] || '';
                          const isX = v.toLowerCase() === 'x';
                          const isPartiel = v.toLowerCase() === 'partiel';
                          // Tooltip pour BPU partiel
                          const tooltip = isPartiel && col === 'BPU (Annexe 5)' && row._bpuMissing
                            ? 'Colonnes manquantes : ' + Object.entries(row._bpuMissing).map(([l, cs]) => `Lot ${l} : ${cs.join(', ')}`).join(' | ')
                            : undefined;
                          return (
                            <td key={col} className="td-center" style={{ padding: '3px 2px' }}>
                              <input value={v} onChange={e => setCell(ri, col, e.target.value)}
                                title={tooltip}
                                style={{ width: 40, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', fontSize: 12,
                                  background: isX ? '#dcfce7' : v ? '#fef9c3' : '#fef2f2',
                                  color: isX ? '#15803d' : v ? '#92400e' : '#be185d', fontWeight: isX ? 700 : 400,
                                  cursor: tooltip ? 'help' : 'text' }} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Récapitulatif — documents manquants</div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Fournisseur</th><th className="td-center">Reçus</th><th>Manquants</th></tr></thead>
                    <tbody>
                      {rows.map((row, ri) => {
                        const present = DOC_LABELS.filter(l => row[l]?.trim());
                        const manquants = DOC_LABELS.filter(l => !row[l]?.trim());
                        return (
                          <tr key={ri}>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>{row['Nom fournisseur']}</td>
                            <td className="td-center">
                              <span className="score-chip" style={{ background: present.length === DOC_LABELS.length ? '#dcfce7' : '#fef2f2', color: present.length === DOC_LABELS.length ? '#15803d' : '#be185d' }}>
                                {present.length}/{DOC_LABELS.length}
                              </span>
                            </td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {manquants.join(', ') || '—'}
                              {row._bpuMissing && Object.keys(row._bpuMissing).length > 0 && (
                                <div style={{ marginTop: 4, color: '#d97706', fontSize: 10 }}>
                                  BPU colonnes manquantes — {Object.entries(row._bpuMissing).map(([lot, cols]) => `Lot ${lot} : ${cols.join(', ')}`).join(' | ')}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">—</div>
              <div className="empty-title">Aucune donnée</div>
              <div className="empty-sub">Sélectionnez le dossier de l&apos;AO et cliquez sur Analyser.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 1 : Compilation QT ─── */}
      {tab === 1 && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Lots à compiler</span></div>
            <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {[1, 2, 3].map(lot => (
                <label key={lot} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={lotsSelected.includes(lot)}
                    onChange={e => setLotsSelected(s => e.target.checked ? [...s, lot].sort() : s.filter(l => l !== lot))} />
                  LOT {lot}
                </label>
              ))}
              <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={compileQT}
                disabled={compilingQt || !reponsesDirHandle || !lotsSelected.length}>
                {compilingQt ? 'Compilation…' : 'Compiler les QT'}
              </button>
              {hasQT && (
                <button className="btn btn-outline" onClick={() => download(buildQTXlsx(qtData), 'Compilation_QT_recrutement.xlsx')}>
                  Exporter Excel
                </button>
              )}
            </div>
          </div>

          {hasQT ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {Object.entries(qtData).map(([lot, { questions, supStatus }]) => (
                <div key={lot} className="card">
                  <div className="card-header">
                    <span className="card-title">LOT {lot}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{questions.length} questions</span>
                  </div>
                  <div className="card-body">
                    {Object.entries(supStatus).map(([sup, { status, filled, total }]) => (
                      <div key={sup} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 500 }}>{sup}</span>
                        <span style={{ color: status === 'ok' ? '#15803d' : status === 'partial' ? '#d97706' : status === 'absent' ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                          {status === 'ok' ? 'Complet' : status === 'partial' ? 'Partiel' : status === 'absent' ? 'Absent' : 'Vide'}
                          {status !== 'absent' && <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 6, opacity: 0.8 }}>({filled}/{total})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">—</div>
              <div className="empty-title">Aucune compilation</div>
              <div className="empty-sub">Sélectionnez le dossier de l&apos;AO puis compilez.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 2 : Comparatif BPU ─── */}
      {tab === 2 && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Comparatif BPU</span></div>
            <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={compileBPU}
                disabled={compilingBpu || !reponsesDirHandle}>
                {compilingBpu ? 'Compilation…' : 'Compiler les BPU'}
              </button>
              {hasBPU && (
                <button className="btn btn-outline" onClick={() => download(buildBPUXlsx(bpuData), 'Comparatif_BPU.xlsx')}>
                  Exporter Excel
                </button>
              )}
            </div>
          </div>

          {hasBPU ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(bpuData).map(([lotName, { compiled, supNames }]) => {
                if (!compiled?.length) return null;
                const isLot2OrOptim = lotName.includes('LOT 2') || lotName.includes('Optimisation');
                const keyColCount = isLot2OrOptim ? 1 : 2;
                return (
                  <div key={lotName} className="card">
                    <div className="card-header">
                      <span className="card-title">{lotName}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{supNames.length} fournisseur{supNames.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              {compiled[0].map((h, ci) => (
                                <th key={ci} style={{ fontSize: 11, padding: '6px 8px', textAlign: ci >= keyColCount ? 'right' : 'left' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {compiled.slice(1).map((row, ri) => {
                              const lowestIdx = lowestPriceIdx(row, keyColCount);
                              return (
                                <tr key={ri}>
                                  {row.map((cell, ci) => {
                                    const isPrice = ci >= keyColCount;
                                    const isLowest = isPrice && (ci - keyColCount) === lowestIdx;
                                    const displayVal = cell === '' ? '—' : cell;
                                    return (
                                      <td key={ci} style={{
                                        fontSize: 12,
                                        textAlign: isPrice ? 'right' : 'left',
                                        fontWeight: isLowest ? 700 : 400,
                                        color: isLowest ? '#15803d' : 'inherit',
                                        background: isLowest ? '#dcfce7' : 'inherit',
                                        padding: '4px 8px',
                                      }}>
                                        {displayVal}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">—</div>
              <div className="empty-title">Aucune donnée BPU</div>
              <div className="empty-sub">Sélectionnez le dossier de l&apos;AO puis compilez les BPU.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 3 : RSE ─── */}
      {tab === 3 && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">RSE — Développement Durable</span></div>
            <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={compileRSE}
                disabled={compilingRse || !reponsesDirHandle}>
                {compilingRse ? 'Compilation…' : 'Compiler les RSE'}
              </button>
              {hasRSE && (
                <button className="btn btn-outline" onClick={() => download(buildRSEXlsx(rseData), 'Compilation_RSE.xlsx')}>
                  Exporter Excel
                </button>
              )}
            </div>
          </div>

          {hasRSE ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    {rseData.compiled[0].map((h, ci) => (
                      <th key={ci} style={{ fontSize: 11, padding: '6px 8px', minWidth: ci === 0 ? 120 : ci === 1 ? 220 : 160 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rseData.compiled.slice(1).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          verticalAlign: 'top',
                          fontWeight: ci === 0 ? 600 : 400,
                          color: cell === '' ? 'var(--text-muted)' : 'inherit',
                        }}>
                          {cell === '' ? '—' : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">—</div>
              <div className="empty-title">Aucune donnée RSE</div>
              <div className="empty-sub">Sélectionnez le dossier de l&apos;AO puis compilez les RSE.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 4 : Chiffrage ─── */}
      {tab === 4 && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Chiffrage</span></div>
            <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={compileChiffrage}
                disabled={compilingChiffrage || !reponsesDirHandle}>
                {compilingChiffrage ? 'Compilation…' : 'Compiler le Chiffrage'}
              </button>
              {hasChiffrage && (
                <button className="btn btn-outline" onClick={() => download(buildChiffrageXlsx(chiffrageData), 'Comparatif_Chiffrage.xlsx')}>
                  Exporter Excel
                </button>
              )}
            </div>
          </div>

          {hasChiffrage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(chiffrageData).map(([lotName, { compiled, supNames }]) => {
                if (!compiled?.length) return null;
                const keyColCount = 3; // Profil, Niveau, Durée
                return (
                  <div key={lotName} className="card">
                    <div className="card-header">
                      <span className="card-title">{lotName}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{supNames.length} fournisseur{supNames.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              {compiled[0].map((h, ci) => (
                                <th key={ci} style={{ fontSize: 11, padding: '6px 8px', textAlign: ci >= keyColCount ? 'right' : 'left' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {compiled.slice(1).map((row, ri) => {
                              const lowestIdx = lowestPriceIdx(row, keyColCount);
                              return (
                                <tr key={ri}>
                                  {row.map((cell, ci) => {
                                    const isPrice = ci >= keyColCount;
                                    const isLowest = isPrice && (ci - keyColCount) === lowestIdx;
                                    const displayVal = cell === '' ? '—' : cell;
                                    return (
                                      <td key={ci} style={{
                                        fontSize: 12,
                                        textAlign: isPrice ? 'right' : 'left',
                                        fontWeight: isLowest ? 700 : 400,
                                        color: isLowest ? '#15803d' : 'inherit',
                                        background: isLowest ? '#dcfce7' : 'inherit',
                                        padding: '4px 8px',
                                      }}>
                                        {displayVal}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">—</div>
              <div className="empty-title">Aucune donnée Chiffrage</div>
              <div className="empty-sub">Sélectionnez le dossier de l&apos;AO puis compilez le chiffrage.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 5 : Détail QT ─── */}
      {tab === 5 && (
        <div className="fade-in">
          {hasQT ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Fournisseur</th><th className="td-center">Lot</th><th className="td-center">Statut</th></tr>
                </thead>
                <tbody>
                  {Object.entries(qtData).flatMap(([lot, { supStatus }]) =>
                    Object.entries(supStatus).map(([sup, { status, filled, total }]) => (
                      <tr key={lot + sup}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{sup}</td>
                        <td className="td-center"><span className="score-chip" style={{ background: '#e0e7ff', color: '#3730a3' }}>LOT {lot}</span></td>
                        <td className="td-center">
                          <span style={{ color: status === 'ok' ? '#15803d' : status === 'partial' ? '#d97706' : status === 'absent' ? '#dc2626' : '#64748b', fontWeight: 600, fontSize: 12 }}>
                            {status === 'ok' ? 'Complet' : status === 'partial' ? 'Partiel' : status === 'absent' ? 'Absent' : 'Vide'}
                            {status !== 'absent' && <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 6, opacity: 0.8 }}>({filled}/{total})</span>}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">—</div>
              <div className="empty-title">Aucune donnée QT</div>
              <div className="empty-sub">Lancez d&apos;abord la compilation QT.</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet 6 : Outils ─── */}
      {tab === 6 && (
        <div className="fade-in">
          {/* Format standard */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Format standard attendu</span></div>
            <div className="card-body" style={{ fontSize: 13 }}>
              <p style={{ marginBottom: 8 }}>Pour que la compilation fonctionne de façon fiable, les fichiers Annexe 1 QT doivent respecter ce format :</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1B3A5C', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', border: '1px solid #ddd' }}>Col A — Question</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #ddd' }}>Col B — Détail</th>
                    <th style={{ padding: '6px 10px', border: '1px solid #ddd', background: '#E87722' }}>Col C — Réponse candidat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#EBF3FF' }}>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd' }}>Présentation de la société</td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd', color: '#888' }}>info</td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd', fontStyle: 'italic', color: '#15803d' }}>← réponse du fournisseur ici</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd' }}>Description du portefeuille client…</td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '5px 10px', border: '1px solid #ddd', fontStyle: 'italic', color: '#15803d' }}>← réponse du fournisseur ici</td>
                  </tr>
                </tbody>
              </table>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Feuilles nommées <strong>QT LOT 1</strong>, <strong>QT LOT 2</strong>, <strong>QT LOT 3</strong></li>
                <li>1ère ligne avec en-têtes : <code>Question</code> | <code>Détail</code> | <code>Réponse candidat</code></li>
                <li><strong>Col C = réponse du fournisseur</strong> — toujours</li>
              </ul>
            </div>
          </div>

          {/* Template vierge */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Template vierge à envoyer aux fournisseurs</span></div>
            <div className="card-body">
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                Génère un fichier Excel standardisé avec les questions pré-remplies et la colonne <strong>Réponse candidat</strong> vide — à envoyer à chaque fournisseur.
              </p>
              <button className="btn btn-primary" onClick={() => download(buildTemplateXlsx(qtData), 'Template_QT_vierge.xlsx')} disabled={!hasQT}>
                Télécharger le template vierge
              </button>
              {!hasQT && <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>Compilez d&apos;abord les QT pour générer le template.</span>}
            </div>
          </div>

          {/* Standardisation */}
          <div className="card">
            <div className="card-header"><span className="card-title">Standardiser les fichiers existants</span></div>
            <div className="card-body">
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                Reformat les fichiers QT de tous les fournisseurs positionnés dans le format standard (col C = réponse).
                Génère un <strong>.zip</strong> avec un fichier Excel par fournisseur.
              </p>
              <button className="btn btn-primary" onClick={handleDownloadZip} disabled={!hasQT || generatingZip}>
                {generatingZip ? 'Génération…' : 'Télécharger les QT standardisés (.zip)'}
              </button>
              {!hasQT && <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>Compilez d&apos;abord les QT.</span>}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
