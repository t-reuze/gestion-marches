import * as XLSX from 'xlsx';
import fs from 'fs';

// Charge la BDD du Suivi_Invest en tableau d'objets, en limitant aux 28 vraies colonnes (A-AB)
// et en trimmant les en-têtes (le fichier source en a avec espaces : " CATTC ", etc.).
export function loadBddRows(suiviInvestPath) {
  const wb = XLSX.read(fs.readFileSync(suiviInvestPath), { type: 'buffer' });
  const ws = wb.Sheets['BDD'];
  const range = XLSX.utils.decode_range(ws['!ref']);
  range.e.c = Math.min(range.e.c, 27);
  ws['!ref'] = XLSX.utils.encode_range(range);
  const rows2d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  const headers = (rows2d[0] || []).map(h => String(h).trim());
  return rows2d.slice(1).map(row => {
    const o = {};
    for (let i = 0; i < headers.length; i++) o[headers[i]] = row[i] ?? '';
    return o;
  });
}

// Filtre la liste des fichiers reporting pour ne garder qu'une version par fournisseur.
// Heuristique : élimine les copies, brouillons, fichiers de test.
export function filterDuplicateFiles(files) {
  const isTest = /(^|[\s\-_])test([\s\-_]|$)/i;
  const isCopy = /(- copie|\(\d+\)|^copie de|^copy of)/i;
  const isJunk = (f) => isTest.test(f) || isCopy.test(f);

  // 1. On retire d'office tous les fichiers explicitement de test
  const candidates = files.filter(f => !isTest.test(f));

  // 2. Déduplication par fournisseur (préfère la forme la plus propre)
  const keep = [];
  const seen = new Map();
  for (const f of candidates) {
    const key = supplierKey(f);
    const existingIdx = seen.get(key);
    if (existingIdx == null) {
      seen.set(key, keep.length);
      keep.push(f);
      continue;
    }
    const existing = keep[existingIdx];
    if (isJunk(existing) && !isJunk(f)) keep[existingIdx] = f;
  }
  return keep;
}

// Liste des fournisseurs reconnus pour la déduplication. On prend des libellés
// suffisamment longs pour éviter les faux positifs (ex: 'MM' matchait 'COMMANDES').
const SUPPLIERS = [
  'AGILENT', 'ILLUMINA', 'LIFE TECH', 'PROMEGA', 'STILLA',
  'SYNORIS', 'HAMILTON', 'THERMOFISHER', 'AATI', 'EUROGENTEC',
  'STARLAB', 'QIAGEN', 'BIO-RAD', 'BIORAD', 'PERKINELMER',
  'TELEMIS', 'LEICA', 'HAMAMATSU', 'ROCHE', 'DIAPATH',
  'MM FRANCE',  // remplace 'MM' (trop court, faux positifs)
  'NEB',        // gardé court mais protégé par regex word-boundary
  'NEW ENGLAND',
];

function supplierKey(name) {
  const upper = name.toUpperCase();
  // Match avec frontières de mot pour éviter les faux positifs ('MM' dans 'COMMANDES').
  for (const s of SUPPLIERS) {
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^A-Z])${escaped}([^A-Z]|$)`);
    if (re.test(upper)) return s;
  }
  return upper.replace(/[^A-Z]/gi, '').toUpperCase();
}
