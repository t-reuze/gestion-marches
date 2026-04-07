/**
 * schemas.js
 * Schémas cibles standardisés pour le pipeline d'analyse des offres.
 *
 * Le pipeline transforme des fichiers Excel hétérogènes (un format par
 * fournisseur) en structures uniformes consommables par l'analyse, le
 * comparatif et la notation.
 */

/**
 * @typedef {Object} BpuLigne
 * @property {string} ref          Référence ligne (col 0 typiquement)
 * @property {string} designation  Libellé / description
 * @property {string} unite        Unité (jour, heure, forfait…)
 * @property {number|null} quantite
 * @property {number|null} puHT    Prix unitaire HT
 * @property {number|null} remise  % remise (0..100)
 * @property {number|null} totalHT
 * @property {Object} extra        Colonnes non mappées, gardées brutes
 */

/**
 * @typedef {Object} StandardizedBpuLot
 * @property {BpuLigne[]} lignes
 * @property {Object} meta
 * @property {string} meta.sheetSource          Nom de la feuille d'origine
 * @property {number} meta.headerRow            Index 0-based de la ligne header
 * @property {number} meta.mappingConfidence    0..1 — qualité du mapping auto
 * @property {string[]} meta.unmappedHeaders    Headers non reconnus
 * @property {string[]} meta.missingFields      Champs cibles non trouvés
 */

/**
 * @typedef {Object} StandardizedBPU
 * @property {string} fournisseur
 * @property {string} sourceFile
 * @property {Object<number, StandardizedBpuLot>} lots  Indexé par numéro de lot
 * @property {Object} meta
 * @property {string} meta.detectedType         'BPU' | 'unknown'
 * @property {number} meta.overallConfidence    0..1
 * @property {boolean} meta.userValidated       True si l'utilisateur a confirmé
 */

/** Champs cibles pour un BPU standardisé. */
export const BPU_TARGET_FIELDS = [
  'ref',
  'designation',
  'unite',
  'quantite',
  'puHT',
  'remise',
  'totalHT',
];

/**
 * Champs obligatoires : un BPU est valide s'il a AU MOINS UN champ de cette
 * liste mappé. On accepte puHT (cas standard MAD/Freelance) OU remise (cas
 * recrutement où seul un % de taux est demandé).
 */
export const BPU_REQUIRED_FIELDS = ['puHT', 'remise'];
export const BPU_REQUIRED_MODE = 'any'; // 'any' | 'all'

/** Crée un objet StandardizedBPU vide. */
export function emptyStandardizedBPU(fournisseur, sourceFile) {
  return {
    fournisseur,
    sourceFile,
    lots: {},
    meta: {
      detectedType: 'unknown',
      overallConfidence: 0,
      userValidated: false,
    },
  };
}

/** Crée un objet StandardizedBpuLot vide. */
export function emptyStandardizedBpuLot(sheetSource, headerRow) {
  return {
    lignes: [],
    meta: {
      sheetSource,
      headerRow,
      mappingConfidence: 0,
      unmappedHeaders: [],
      missingFields: [],
    },
  };
}
