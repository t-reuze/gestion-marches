/**
 * bpuMapper.js
 * Mapping fuzzy headers BPU fournisseur → schéma cible standardisé.
 *
 * Stratégie :
 *   1. Pour chaque champ cible, on a une liste d'alias normalisés.
 *   2. Pour chaque header normalisé du fichier, on score sa correspondance
 *      avec chaque champ cible (inclusion exacte > inclusion partielle).
 *   3. On résout les conflits par ordre de score décroissant (un header ne
 *      peut mapper qu'à un seul champ, un champ qu'à un seul header).
 *
 * Retourne un mapping { field: colIdx } + un score de confiance global.
 */
import { normStr, toNumber, isEmpty } from '../normalize.js';
import { BPU_TARGET_FIELDS, BPU_REQUIRED_FIELDS, BPU_REQUIRED_MODE } from '../schemas.js';

/** Alias pour chaque champ cible. Ordre = priorité (premier = + spécifique). */
export const BPU_ALIASES = {
  ref: [
    'ref', 'reference', 'n', 'num', 'numero', 'code', 'item', 'ligne', 'n ligne',
  ],
  designation: [
    'designation', 'libelle', 'description', 'intitule', 'prestation',
    'objet', 'produit', 'service', 'article',
    'profil', 'poste', 'fonction', 'metier', 'profession',
  ],
  unite: [
    'unite', 'u', 'unit', 'unite de mesure', 'mesure',
    'niveau experience', 'niveau d experience', 'experience',
    'seniorite', 'niveau',
  ],
  quantite: [
    'quantite', 'qte', 'qty', 'qt', 'volume', 'nb', 'nombre',
  ],
  puHT: [
    'pu ht', 'puht', 'pu h t', 'prix unitaire ht', 'prix ht', 'prix unitaire',
    'tarif ht', 'tarif unitaire ht', 'tarif unitaire', 'pu jour ht',
    'puht jour', 'pu jour', 'puht/jour', 'pu/jour', 'tarif/jour',
    'tarif jour', 'taux jour', 'puht/heure', 'pu heure', 'tarif heure',
  ],
  remise: [
    'remise', '% remise', 'taux remise', 'pct remise', 'pourcentage remise',
    'discount', 'rabais', '% discount', 'taux', '% taux',
    '% taux remuneration', 'taux remuneration', 'remuneration',
    '% taux remuneration annuelle brute',
  ],
  totalHT: [
    'total ht', 'montant ht', 'total', 'montant', 'total ligne', 'sous total',
    'total general', 'cout total', 'total prix',
    'prix ht/jour remise', 'prix remise', 'prix ht remise',
    'prix ht/heure remise', 'tarif remise',
  ],
};

/**
 * Score de match entre un header normalisé et un alias normalisé.
 * - 1.0 : égalité
 * - 0.8 : alias est inclus exactement comme mot dans header
 * - 0.6 : alias est inclus en sous-string
 * - 0.0 : aucun match
 */
function aliasScore(header, alias) {
  if (!header || !alias) return 0;
  if (header === alias) return 1.0;
  // mot entier
  const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
  if (re.test(header)) return 0.8;
  if (header.includes(alias)) return 0.6;
  return 0;
}

/**
 * Score le meilleur match entre un header et un champ cible (sur tous ses alias).
 */
function fieldScore(header, field) {
  const aliases = BPU_ALIASES[field] || [];
  let best = 0;
  for (const a of aliases) {
    const s = aliasScore(header, a);
    if (s > best) best = s;
  }
  return best;
}

/**
 * Mappe les headers d'un BPU vers les champs cibles.
 * @param {string[]} headers - headers normalisés (sortie de normalizeSheet)
 * @returns {{
 *   mapping: Object<string, number>,
 *   confidence: number,
 *   unmapped: string[],
 *   missing: string[],
 *   ambiguous: Array<{field: string, candidates: Array<{col: number, score: number}>}>,
 * }}
 */
export function mapBpuHeaders(headers) {
  // Matrice [fieldIdx][colIdx] = score
  const candidates = [];
  for (let c = 0; c < headers.length; c++) {
    for (const field of BPU_TARGET_FIELDS) {
      const score = fieldScore(headers[c], field);
      if (score > 0) candidates.push({ field, col: c, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const mapping = {};
  const usedCols = new Set();
  const usedFields = new Set();
  for (const cand of candidates) {
    if (usedFields.has(cand.field) || usedCols.has(cand.col)) continue;
    mapping[cand.field] = cand.col;
    usedFields.add(cand.field);
    usedCols.add(cand.col);
  }

  // Ambiguïtés : champs avec plusieurs candidats au même score max
  const ambiguous = [];
  for (const field of BPU_TARGET_FIELDS) {
    const fieldCands = candidates
      .filter(c => c.field === field)
      .sort((a, b) => b.score - a.score);
    if (fieldCands.length >= 2 && fieldCands[0].score === fieldCands[1].score) {
      ambiguous.push({
        field,
        candidates: fieldCands.slice(0, 3).map(c => ({ col: c.col, score: c.score })),
      });
    }
  }

  // "missing" = champs requis manquants selon le mode
  const reqMapped = BPU_REQUIRED_FIELDS.filter(f => f in mapping);
  const missing = BPU_REQUIRED_MODE === 'any'
    ? (reqMapped.length === 0 ? [...BPU_REQUIRED_FIELDS] : [])
    : BPU_REQUIRED_FIELDS.filter(f => !(f in mapping));

  const unmapped = headers
    .map((h, i) => ({ h, i }))
    .filter(({ i, h }) => !usedCols.has(i) && !isEmpty(h))
    .map(({ h }) => h);

  // Confiance : meilleur score parmi les champs requis (mode 'any')
  const reqScores = reqMapped.map(f => {
    const cand = candidates.find(c => c.field === f && c.col === mapping[f]);
    return cand ? cand.score : 0;
  });
  const confidence = BPU_REQUIRED_MODE === 'any'
    ? Math.max(0, ...reqScores)
    : (reqScores.length ? reqScores.reduce((a, b) => a + b, 0) / reqScores.length : 0);

  return { mapping, confidence, unmapped, missing, ambiguous };
}

/**
 * Applique un mapping aux dataRows pour produire des BpuLigne[].
 */
/**
 * Applique un mapping aux dataRows.
 * @returns {{lignes: BpuLigne[], stats: {total, filled, partial, empty}}}
 */
export function applyBpuMapping(dataRows, mapping) {
  const lignes = [];
  let filled = 0, partial = 0, empty = 0;

  for (const row of dataRows) {
    if (!row || !Array.isArray(row) || row.every(isEmpty)) continue;

    const ligne = {
      ref: 'ref' in mapping && !isEmpty(row[mapping.ref]) ? row[mapping.ref] : '',
      designation: 'designation' in mapping && !isEmpty(row[mapping.designation]) ? row[mapping.designation] : '',
      unite: 'unite' in mapping && !isEmpty(row[mapping.unite]) ? row[mapping.unite] : '',
      quantite: 'quantite' in mapping ? toNumber(row[mapping.quantite]) : null,
      puHT: 'puHT' in mapping ? toNumber(row[mapping.puHT]) : null,
      remise: 'remise' in mapping ? toNumber(row[mapping.remise]) : null,
      totalHT: 'totalHT' in mapping ? toNumber(row[mapping.totalHT]) : null,
      extra: {},
    };

    const hasDesignation = typeof ligne.designation === 'string' && ligne.designation.trim();
    const hasPriceField = ligne.puHT !== null || ligne.remise !== null;
    if (!hasDesignation && !hasPriceField) continue;

    lignes.push(ligne);
    if (hasDesignation && hasPriceField) filled++;
    else if (hasDesignation && !hasPriceField) empty++;
    else partial++;
  }

  return {
    lignes,
    stats: { total: lignes.length, filled, partial, empty },
  };
}
