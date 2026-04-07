import * as XLSX from 'xlsx';
import { COLUMN_MAP, NUMERIC_KEYS, MARCHE_GROUPING } from './reportingConstants';

/**
 * Normalise une chaîne pour comparaison de headers :
 * lowercase, remplace \r\n \n \t et espaces multiples par un seul espace, trim.
 */
function normalizeHeader(str) {
  return String(str).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Construit le mapping header brut → clé propre pour un jeu de colonnes Excel.
 */
function buildHeaderMap(rawHeaders) {
  const map = {};
  for (const raw of rawHeaders) {
    const normalized = normalizeHeader(raw);
    if (COLUMN_MAP[normalized]) {
      map[raw] = COLUMN_MAP[normalized];
    }
  }
  return map;
}

/**
 * Détermine si une ligne est une ligne de données valide
 * (exclut les lignes d'instructions et les lignes vides).
 */
function isValidRow(row) {
  const etab = row.etablissement;
  if (!etab || typeof etab !== 'string') return false;
  if (etab.length > 50) return false; // lignes d'instructions
  const lower = etab.toLowerCase();
  if (lower.startsWith('insérer') || lower.startsWith('pour tableau') || lower.startsWith('penser')) return false;
  return true;
}

/**
 * Parse une valeur numérique depuis les données Excel.
 */
function parseNum(val) {
  if (val === '' || val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[€\s]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Groupe un marché Excel vers son label unifié.
 */
function groupMarche(rawMarche) {
  if (!rawMarche) return 'Autre';
  const key = rawMarche.toLowerCase().trim();
  return MARCHE_GROUPING[key] || rawMarche;
}

/**
 * Parse un fichier Excel (ArrayBuffer) et retourne les données normalisées.
 *
 * @param {ArrayBuffer} buffer - contenu du fichier Excel
 * @returns {{ rows: Object[], meta: Object }}
 */
export function parseReportingExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });

  // Chercher la feuille BDD ou prendre la première
  const sheetName = wb.SheetNames.find(n => n.toUpperCase() === 'BDD') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rawData.length === 0) return { rows: [], meta: emptyMeta() };

  // Construire le mapping des headers
  const rawHeaders = Object.keys(rawData[0]);
  const headerMap = buildHeaderMap(rawHeaders);

  // Mapper et nettoyer chaque ligne
  const rows = [];
  for (const rawRow of rawData) {
    const row = {};
    for (const [rawKey, cleanKey] of Object.entries(headerMap)) {
      row[cleanKey] = rawRow[rawKey];
    }

    // Convertir les champs numériques
    for (const key of NUMERIC_KEYS) {
      if (key in row) row[key] = parseNum(row[key]);
    }

    // Ajouter le marché groupé
    row.marcheGroupe = groupMarche(row.marche);

    // Filtrer les lignes invalides
    if (!isValidRow(row)) continue;

    rows.push(row);
  }

  // Calculer les méta-données
  const meta = {
    rowCount: rows.length,
    years: [...new Set(rows.map(r => r.annee).filter(Boolean))].sort(),
    clccs: [...new Set(rows.map(r => r.clcc).filter(Boolean))].sort(),
    marches: [...new Set(rows.map(r => r.marcheGroupe).filter(Boolean))].sort(),
    marchesRaw: [...new Set(rows.map(r => r.marche).filter(Boolean))].sort(),
    fournisseurs: [...new Set(rows.map(r => r.fournisseur).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })),
    typesEquipement: [...new Set(rows.map(r => r.typeEquipement).filter(Boolean))].sort(),
  };

  return { rows, meta };
}

function emptyMeta() {
  return { rowCount: 0, years: [], clccs: [], marches: [], marchesRaw: [], fournisseurs: [], typesEquipement: [] };
}

/**
 * Fusionne les fournisseurs en case-insensitive pour les agrégations.
 * Retourne le nom canonique (la forme la plus fréquente).
 */
export function normalizeFournisseur(fournisseur, rows) {
  if (!fournisseur) return 'Autre';
  return fournisseur.trim();
}

/**
 * Agrège les CA TTC par dimension (fournisseur, année, marché, etc.).
 * Retourne un tableau trié par valeur décroissante.
 *
 * @param {Object[]} rows - lignes filtrées
 * @param {string} key - clé de groupement ('fournisseur', 'annee', 'marcheGroupe')
 * @param {Object} options - { topN, sortDir, caseInsensitive }
 */
export function aggregateBy(rows, key, { topN = 0, sortDir = 'desc', caseInsensitive = false } = {}) {
  const map = {};
  for (const row of rows) {
    let val = row[key];
    if (val === '' || val === null || val === undefined) continue;
    if (caseInsensitive) val = String(val).toUpperCase();
    const label = caseInsensitive ? String(val) : String(val);
    map[label] = (map[label] || 0) + (row.caTtc || 0);
  }

  let entries = Object.entries(map).map(([name, value]) => ({ name, value }));
  entries.sort((a, b) => sortDir === 'desc' ? b.value - a.value : a.value - b.value);

  // Top N + "Autres"
  if (topN > 0 && entries.length > topN) {
    const top = entries.slice(0, topN);
    const rest = entries.slice(topN).reduce((s, e) => s + e.value, 0);
    if (rest > 0) top.push({ name: 'Autres', value: rest });
    entries = top;
  }

  return entries;
}
