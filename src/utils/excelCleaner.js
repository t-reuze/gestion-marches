/**
 * excelCleaner.js
 * Utilitaire de validation et nettoyage des fichiers Excel d'évaluation fournisseurs.
 * Utilisé par SmartExcelImport avant le chargement dans le moteur de notation.
 */

export const EXPECTED_STRUCTURE = {
  headerRow: 3,         // ligne 4 (index 3) = en-têtes fournisseurs
  dataStartRow: 4,      // ligne 5 (index 4) = première question/critère
  numCol: 0,            // colonne A = numéro critère
  questionCol: 1,       // colonne B = intitulé critère
  methodeCol: 2,        // colonne C = méthode d'évaluation
  responseColsStart: 3, // colonnes D-I = réponses fournisseurs (6 max)
  noteColsStart: 9,     // colonnes J-O = notes (6 max)
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
    errors.push('Fichier trop court — au moins 5 lignes attendues (en-têtes ligne 4, données ligne 5+).');
    return { valid: false, errors, warnings, info };
  }

  const headerRow = raw[EXPECTED_STRUCTURE.headerRow] || [];

  // Détecter les fournisseurs (colonnes D à I)
  const vendors = [];
  for (let i = 0; i < EXPECTED_STRUCTURE.maxVendors; i++) {
    const ci = EXPECTED_STRUCTURE.responseColsStart + i;
    const h = String(headerRow[ci] || '').trim();
    if (h) vendors.push({ colIdx: ci, noteColIdx: EXPECTED_STRUCTURE.noteColsStart + i, name: h.split('\n')[0].trim() });
  }

  if (vendors.length === 0) {
    errors.push('Aucun fournisseur détecté en ligne 4 (colonnes D–I). Vérifiez que les en-têtes sont bien présents.');
  } else {
    info.vendors = vendors;
    if (vendors.length < 2) warnings.push('Un seul fournisseur détecté — l\'analyse comparative nécessite au moins 2 fournisseurs.');
  }

  // Compter les critères/questions
  let qCount = 0;
  for (let ri = EXPECTED_STRUCTURE.dataStartRow; ri < raw.length; ri++) {
    const row = raw[ri];
    if (!row || !String(row[EXPECTED_STRUCTURE.questionCol] || '').trim()) break;
    qCount++;
  }
  info.questionCount = qCount;

  if (qCount === 0) {
    errors.push('Aucun critère détecté (colonne B vide à partir de la ligne 5). Vérifiez la structure du fichier.');
  } else if (qCount < 3) {
    warnings.push(qCount + ' critère(s) seulement — un fichier d\'évaluation en contient généralement plus de 5.');
  }

  // Vérifier si les colonnes de notes sont déjà remplies
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
 * Retourne le rowOffset (0 = structure standard).
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
 * Nettoie le contenu d'une cellule texte (supprime espaces/retours parasites).
 */
export function cleanCell(value) {
  if (value == null) return '\u2014';
  const s = String(value).trim();
  if (!s) return '\u2014';
  return s.replace(/\r\n|\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Normalise le nom d'un fournisseur (retire caractères parasites en début/fin).
 */
export function cleanVendorName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ').replace(/^\W+|\W+$/g, '').trim() || 'Fournisseur';
}
