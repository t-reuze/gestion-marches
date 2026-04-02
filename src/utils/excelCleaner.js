/**
 * excelCleaner.js
 * Utilitaire de validation, nettoyage et profils templates pour fichiers Excel.
 * Utilisé par SmartExcelImport avant le chargement dans le moteur de notation.
 */
import * as XLSX from 'xlsx';

export const EXPECTED_STRUCTURE = {
  headerRow: 3,
  dataStartRow: 4,
  numCol: 0,
  questionCol: 1,
  methodeCol: 2,
  responseColsStart: 3,
  noteColsStart: 9,
  maxVendors: 6,
};

/**
 * Analyse la structure d'un fichier Excel et retourne un rapport de validation.
 * @param {Array[]} raw - tableau brut issu de XLSX.utils.sheet_to_json({ header:1, defval:'' })
 * @returns {{ valid: boolean, warnings: string[], errors: string[], info: object }}
 */
export function validateExcelStructure(raw) {
  const errors = [];
  const warnings = [];
  const info = {};

  if (!raw || raw.length < 5) {
    errors.push('Fichier trop court \u2014 au moins 5 lignes attendues (en-t\u00eates ligne 4, donn\u00e9es ligne 5+).');
    return { valid: false, errors, warnings, info };
  }

  const headerRow = raw[EXPECTED_STRUCTURE.headerRow] || [];

  const vendors = [];
  for (let i = 0; i < EXPECTED_STRUCTURE.maxVendors; i++) {
    const ci = EXPECTED_STRUCTURE.responseColsStart + i;
    const h = String(headerRow[ci] || '').trim();
    if (h) vendors.push({ colIdx: ci, noteColIdx: EXPECTED_STRUCTURE.noteColsStart + i, name: h.split('\n')[0].trim() });
  }

  if (vendors.length === 0) {
    errors.push('Aucun fournisseur d\u00e9tect\u00e9 en ligne 4 (colonnes D\u2013I). V\u00e9rifiez que les en-t\u00eates sont bien pr\u00e9sents.');
  } else {
    info.vendors = vendors;
    if (vendors.length < 2) warnings.push('Un seul fournisseur d\u00e9tect\u00e9 \u2014 l\'analyse comparative n\u00e9cessite au moins 2 fournisseurs.');
  }

  let qCount = 0;
  for (let ri = EXPECTED_STRUCTURE.dataStartRow; ri < raw.length; ri++) {
    const row = raw[ri];
    if (!row || !String(row[EXPECTED_STRUCTURE.questionCol] || '').trim()) break;
    qCount++;
  }
  info.questionCount = qCount;

  if (qCount === 0) {
    errors.push('Aucun crit\u00e8re d\u00e9tect\u00e9 (colonne B vide \u00e0 partir de la ligne 5). V\u00e9rifiez la structure du fichier.');
  } else if (qCount < 3) {
    warnings.push(qCount + ' crit\u00e8re(s) seulement \u2014 un fichier d\'\u00e9valuation en contient g\u00e9n\u00e9ralement plus de 5.');
  }

  let hasAnyNote = false;
  for (let ri = EXPECTED_STRUCTURE.dataStartRow; ri < Math.min(raw.length, EXPECTED_STRUCTURE.dataStartRow + 10); ri++) {
    const row = raw[ri];
    if (!row) continue;
    for (let i = 0; i < EXPECTED_STRUCTURE.maxVendors; i++) {
      const val = row[EXPECTED_STRUCTURE.noteColsStart + i];
      if (val !== '' && val != null && !isNaN(parseFloat(val))) { hasAnyNote = true; break; }
    }
    if (hasAnyNote) break;
  }
  info.notesEmpty = !hasAnyNote;
  info.headerRowSample = headerRow.slice(0, 15).map(c => String(c || '').slice(0, 40));

  return { valid: errors.length === 0, errors, warnings, info };
}

/**
 * Tente de détecter un décalage de lignes si la structure standard n'est pas respectée.
 */
export function detectRowOffset(raw) {
  for (let ri = 2; ri <= 6; ri++) {
    const row = raw[ri] || [];
    const dCell = String(row[EXPECTED_STRUCTURE.responseColsStart] || '').trim();
    if (dCell && dCell.length > 2) return ri - EXPECTED_STRUCTURE.headerRow;
  }
  return 0;
}

/**
 * Nettoie le contenu d'une cellule texte.
 */
export function cleanCell(value) {
  if (value == null) return '\u2014';
  const s = String(value).trim();
  if (!s) return '\u2014';
  return s.replace(/\r\n|\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Normalise le nom d'un fournisseur.
 */
export function cleanVendorName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ').replace(/^\W+|\W+$/g, '').trim() || 'Fournisseur';
}

// ─── Profils templates apprenants ───────────────────────────────────────────

/**
 * detectStructure(ws)
 * Analyse un worksheet XLSX et retourne la structure probable du fichier.
 * Heuristique : première ligne avec >= 3 cellules texte non vides = en-tête.
 *
 * @param {object} ws - worksheet XLSX (wb.Sheets[sheetName])
 * @returns {{ headerRow: number, dataRange: string|null, mergedCells: Array, columnCount: number }}
 */
export function detectStructure(ws) {
  if (!ws) return { headerRow: 0, dataRange: null, mergedCells: [], columnCount: 0 };

  const mergedCells = (ws['!merges'] || []).map(m => ({
    s: { r: m.s.r, c: m.s.c },
    e: { r: m.e.r, c: m.e.c },
  }));

  let columnCount = 0;
  try {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    columnCount = range.e.c - range.s.c + 1;
  } catch { /* invalid ref */ }

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Chercher la première ligne avec >= 3 cellules texte significatives
  let headerRow = 0;
  for (let ri = 0; ri < Math.min(raw.length, 15); ri++) {
    const row = raw[ri] || [];
    const filled = row.filter(c => String(c || '').trim().length > 1);
    if (filled.length >= 3) { headerRow = ri; break; }
  }

  const dataStartRow = headerRow + 1;
  let dataEndRow = raw.length - 1;
  for (let ri = raw.length - 1; ri >= dataStartRow; ri--) {
    if ((raw[ri] || []).some(c => String(c || '').trim())) { dataEndRow = ri; break; }
  }

  const endCol = columnCount > 0 ? _colLetter(columnCount - 1) : 'Z';
  const dataRange = dataStartRow <= dataEndRow
    ? `A${dataStartRow + 1}:${endCol}${dataEndRow + 1}`
    : null;

  return { headerRow, dataRange, mergedCells, columnCount };
}

function _colLetter(idx) {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * normalize(raw, profile)
 * Nettoie un tableau brut selon un profil de template.
 * - Applique headerRow pour identifier les colonnes
 * - Ignore les lignes décoratives (skipPatterns)
 * - Mappe les noms de colonnes (columnMapping)
 *
 * @param {Array[]} raw   - données brutes
 * @param {object}  profile - profil template (optionnel)
 * @returns {{ headers: string[], rows: object[], skipped: number }}
 */
export function normalize(raw, profile = {}) {
  const headerRow = profile.headerRow ?? 0;
  const skipPatterns = (profile.skipPatterns || ['^\\s*$', '^total', '^page\\s+\\d'])
    .map(p => { try { return new RegExp(p, 'i'); } catch { return null; } })
    .filter(Boolean);
  const columnMapping = profile.columnMapping || {};

  const rawHeaders = raw[headerRow] || [];
  const headers = rawHeaders
    .slice(0, 20)
    .map((h, i) => {
      const s = String(h || '').trim();
      return columnMapping[s] || s || `col_${i}`;
    });

  const rows = [];
  let skipped = 0;

  for (let ri = headerRow + 1; ri < raw.length; ri++) {
    const row = raw[ri] || [];
    const firstCell = String(row[0] || '').trim();

    if (skipPatterns.some(p => p.test(firstCell))) { skipped++; continue; }
    if (!row.some(c => String(c || '').trim())) { skipped++; continue; }

    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = String(row[i] ?? '').trim() || '\u2014'; });
    rows.push(obj);
  }

  return { headers, rows, skipped };
}

// ─── Persistance des profils (localStorage) ──────────────────────────────────

const PROFILE_PREFIX = 'gm-excel-profile-';

/**
 * saveProfile(name, profile) — persiste un profil dans localStorage.
 * @returns {boolean} true si succès
 */
export function saveProfile(name, profile) {
  if (!name?.trim()) return false;
  try {
    localStorage.setItem(
      PROFILE_PREFIX + name.trim(),
      JSON.stringify({ ...profile, name: name.trim(), savedAt: new Date().toISOString() })
    );
    return true;
  } catch { return false; }
}

/**
 * loadProfile(name) — charge un profil depuis localStorage.
 * @returns {object|null}
 */
export function loadProfile(name) {
  try {
    const stored = localStorage.getItem(PROFILE_PREFIX + name);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

/**
 * listProfiles() — liste tous les profils sauvegardés, triés par date desc.
 * @returns {Array<{ name: string, savedAt: string }>}
 */
export function listProfiles() {
  const profiles = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PROFILE_PREFIX)) {
        try {
          const p = JSON.parse(localStorage.getItem(key) || '{}');
          profiles.push({
            name: p.name || key.slice(PROFILE_PREFIX.length),
            savedAt: p.savedAt || '',
          });
        } catch { /* entrée corrompue */ }
      }
    }
  } catch { /* SSR / accès restreint */ }
  return profiles.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
