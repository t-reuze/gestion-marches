/**
 * questionnaireMapper.js
 * Mapper générique pour les questionnaires (QT, RSE).
 * Format attendu : table avec colonnes Question / Réponse / [Détail] / [Thème]
 */
import { normStr, isEmpty } from '../normalize.js';

const QUESTION_ALIASES = ['question', 'intitule', 'libelle', 'item', 'critere'];
const REPONSE_ALIASES = ['reponse', 'reponse candidat', 'reponse fournisseur', 'commentaire', 'answer'];
const DETAIL_ALIASES = ['detail', 'precision', 'description', 'sous critere', 'sous-critere'];
const THEME_ALIASES = ['theme', 'section', 'categorie', 'axe', 'domaine'];
const DOC_ALIASES = ['documentation', 'piece jointe', 'annexe', 'document', 'reference'];

function findCol(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (aliases.some(a => h === a || h.includes(a))) return i;
  }
  return -1;
}

/**
 * Mappe les headers d'un questionnaire.
 * @returns {{mapping, confidence}}
 */
export function mapQuestionnaireHeaders(headers) {
  const mapping = {};
  const q = findCol(headers, QUESTION_ALIASES);
  const r = findCol(headers, REPONSE_ALIASES);
  const d = findCol(headers, DETAIL_ALIASES);
  const t = findCol(headers, THEME_ALIASES);
  const doc = findCol(headers, DOC_ALIASES);
  if (q >= 0) mapping.question = q;
  if (r >= 0) mapping.reponse = r;
  if (d >= 0) mapping.detail = d;
  if (t >= 0) mapping.theme = t;
  if (doc >= 0) mapping.documentation = doc;

  // Confiance : a-t-on au moins question ET reponse ?
  const confidence = (q >= 0 && r >= 0) ? 1.0 : (q >= 0 || r >= 0) ? 0.5 : 0;
  return { mapping, confidence };
}

/**
 * Applique le mapping pour produire des items standardisés.
 * @returns {{items, stats: {total, answered, empty}}}
 */
export function applyQuestionnaireMapping(dataRows, mapping) {
  const items = [];
  let answered = 0, empty = 0;

  for (const row of dataRows) {
    if (!row || !Array.isArray(row) || row.every(isEmpty)) continue;
    const item = {
      question: mapping.question != null && !isEmpty(row[mapping.question]) ? String(row[mapping.question]).trim() : '',
      reponse: mapping.reponse != null && !isEmpty(row[mapping.reponse]) ? String(row[mapping.reponse]).trim() : '',
      detail: mapping.detail != null && !isEmpty(row[mapping.detail]) ? String(row[mapping.detail]).trim() : '',
      theme: mapping.theme != null && !isEmpty(row[mapping.theme]) ? String(row[mapping.theme]).trim() : '',
      documentation: mapping.documentation != null && !isEmpty(row[mapping.documentation]) ? String(row[mapping.documentation]).trim() : '',
    };
    if (!item.question) continue;
    items.push(item);
    if (item.reponse) answered++;
    else empty++;
  }
  return { items, stats: { total: items.length, answered, empty } };
}
