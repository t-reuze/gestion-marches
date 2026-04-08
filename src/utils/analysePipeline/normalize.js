/**
 * normalize.js
 * Nettoyage bas niveau d'une feuille Excel avant mapping.
 *
 * Étapes :
 *   1. unmerge — propage les valeurs des cellules fusionnées
 *   2. trim    — strip les strings, convertit "" en null
 *   3. dropEmptyRows / dropEmptyCols
 *   4. detectHeaderRow — heuristique pour trouver la ligne d'en-tête
 *   5. propagateHeaders — remplit les cellules d'en-tête vides (sous-headers)
 */
import XLSX from 'xlsx-js-style';

/** Normalise une chaîne pour comparaison : minuscules, sans accents, espaces simples. */
export function normStr(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valeurs traitées comme "non applicable" / vides au sens métier. */
const NA_VALS = new Set([
  'na', 'n/a', 'n.a.', 'n.a', 'non applicable', 'sans objet', 'so',
  'neant', 'néant', '-', '—', '–', '/', '.', '*',
]);

/** True si la valeur est "vide" au sens métier (incluant NA, néant, etc.). */
export function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return true;
    if (NA_VALS.has(normStr(s))) return true;
  }
  return false;
}

/** True si la valeur représente un nombre exploitable. */
export function isNumeric(v) {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'number') return Number.isFinite(v);
  const s = String(v).replace(/\s/g, '').replace(',', '.').replace(/[€%]/g, '');
  return !Number.isNaN(parseFloat(s)) && Number.isFinite(parseFloat(s));
}

/** Convertit en nombre, sinon null. */
export function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/\s/g, '').replace(',', '.').replace(/[€%]/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

/**
 * De-fusionne les cellules : pour chaque range mergé, copie la valeur du
 * top-left vers toutes les cellules du range. Mute la worksheet.
 */
export function unmerge(ws) {
  if (!ws['!merges']) return ws;
  for (const m of ws['!merges']) {
    const topLeft = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
    const val = ws[topLeft];
    if (!val) continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) ws[addr] = { ...val };
      }
    }
  }
  ws['!merges'] = [];
  return ws;
}

/**
 * Convertit une worksheet en matrice 2D, après unmerge.
 * @returns {any[][]}
 */
export function sheetToMatrix(ws) {
  unmerge(ws);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
  return rows.map(row => row.map(cell => (typeof cell === 'string' ? cell.trim() : cell)));
}

/** Supprime les lignes entièrement vides. */
export function dropEmptyRows(matrix) {
  return matrix.filter(row => row.some(cell => !isEmpty(cell)));
}

/** Supprime les colonnes de droite entièrement vides. */
export function trimEmptyCols(matrix) {
  if (!matrix.length) return matrix;
  const maxCol = Math.max(...matrix.map(r => r.length));
  let lastUsed = -1;
  for (let c = 0; c < maxCol; c++) {
    if (matrix.some(r => !isEmpty(r[c]))) lastUsed = c;
  }
  return matrix.map(r => r.slice(0, lastUsed + 1));
}

/**
 * Détecte la ligne d'en-tête.
 * Heuristique : on cherche la ligne qui maximise le score
 *   (nb cellules non-vides string) - (nb cellules numériques)
 * parmi les 15 premières lignes, et qui est suivie d'au moins 2 lignes
 * contenant des valeurs numériques (sinon ce n'est probablement pas un BPU).
 *
 * @returns {number} index 0-based, ou -1 si aucune ligne convaincante
 */
/** Mots-clés typiques d'un header BPU — utilisés en fallback pour templates vides. */
const HEADER_KEYWORDS = [
  'profil', 'poste', 'designation', 'libelle', 'description',
  'puht', 'pu ht', 'prix', 'tarif', 'taux', 'remise', 'montant',
  'unite', 'quantite', 'qte', 'experience', 'niveau', 'reference',
  // Questionnaires (QT, RSE)
  'theme', 'section', 'question', 'reponse', 'commentaire', 'critere',
  'documentation', 'intitule', 'item', 'axe', 'domaine', 'categorie',
];

function looksLikeHeaderRow(row) {
  const nonEmpty = row.filter(c => !isEmpty(c));
  if (nonEmpty.length < 2) return 0;
  const strings = nonEmpty.filter(c => !isNumeric(c));
  if (strings.length < 2) return 0;
  // Pénalise les lignes "titre fusionné" : si toutes les cellules non-vides
  // ont la même valeur (résultat d'un unmerge sur un titre), ce n'est pas un header.
  const uniq = new Set(strings.map(c => normStr(c)));
  if (uniq.size < 2) return 0;
  // Bonus diversité : ratio uniques/total
  const diversityBonus = uniq.size / strings.length;
  // Score = nb de cellules string + bonus si mots-clés header trouvés
  let kwBonus = 0;
  for (const c of strings) {
    const norm = normStr(c);
    if (HEADER_KEYWORDS.some(k => norm.includes(k))) kwBonus += 0.5;
  }
  return strings.length + kwBonus + diversityBonus;
}

export function detectHeaderRow(matrix, lookAhead = 15) {
  const limit = Math.min(lookAhead, matrix.length);
  let best = -1;
  let bestScore = -Infinity;
  let bestStrict = -1;
  let bestStrictScore = -Infinity;

  for (let r = 0; r < limit; r++) {
    const row = matrix[r];
    if (!row) continue;
    const score = looksLikeHeaderRow(row);
    if (score <= 0) continue;

    // Mode strict : exige des lignes numériques après (cas idéal BPU rempli)
    let numericRowsAfter = 0;
    for (let rr = r + 1; rr < Math.min(r + 6, matrix.length); rr++) {
      if ((matrix[rr] || []).some(c => isNumeric(c))) numericRowsAfter++;
    }
    if (numericRowsAfter >= 2 && score > bestStrictScore) {
      bestStrictScore = score;
      bestStrict = r;
    }

    // Mode permissif : meilleure ligne ressemblant à un header (template vide)
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  // Préfère le strict s'il existe, sinon fallback permissif
  return bestStrict >= 0 ? bestStrict : best;
}

/**
 * Propage les headers fusionnés vers la droite (cellules vides → valeur précédente).
 * Utile quand un header parent couvre plusieurs colonnes filles.
 */
export function propagateHeaderRow(headerRow) {
  const out = [...headerRow];
  let last = null;
  for (let i = 0; i < out.length; i++) {
    if (isEmpty(out[i])) out[i] = last;
    else last = out[i];
  }
  return out;
}

/**
 * Pipeline normalize complet : worksheet → { headers, dataRows, headerRowIdx }
 */
export function normalizeSheet(ws) {
  const matrix = trimEmptyCols(dropEmptyRows(sheetToMatrix(ws)));
  const headerRowIdx = detectHeaderRow(matrix);
  if (headerRowIdx < 0) {
    return { headers: [], dataRows: [], headerRowIdx: -1, matrix };
  }
  const headers = propagateHeaderRow(matrix[headerRowIdx]).map(h => normStr(h));
  const dataRows = matrix.slice(headerRowIdx + 1);
  return { headers, dataRows, headerRowIdx, matrix };
}
