// ═══════════════════════════════════════════════════════════
// Canonicalisation des noms de fournisseur pour cohérence avec la BDD.
//
// Source : observation des libellés réels dans la BDD Suivi_Invest
// (col F "Fournisseur"). Le but est de mapper toutes les variantes
// (casse, alias commerciaux, fusions/acquisitions) vers un libellé unique.
// ═══════════════════════════════════════════════════════════

// Clé : forme normalisée (uppercase, sans espaces ni tirets multiples).
// Valeur : libellé canonique tel qu'écrit dans la BDD.
const ALIASES = {
  // BioMol PPE025
  'AGILENT':              'Agilent',
  'ILLUMINA':             'Illumina',
  'PROMEGA':              'Promega',
  'NEB':                  'New England Biolabs',
  'NEWENGLANDBIOLABS':    'New England Biolabs',
  'LIFETECHNOLOGIES':     'Life Technologies',
  'LIFETECH':             'Life Technologies',
  'STILLA':               'STILLA',
  'SYNORIS':              'SYNORIS',
  'HAMILTON':             'Hamilton',
  'THERMOFISHER':         'ThermoFisher',
  'THERMOFISCHER':        'ThermoFisher',  // typo observée
  'TELEMIS':              'Telemis',
  'STARLAB':              'Starlab',
  'EUROGENTEC':           'Eurogentec',
  'AATI':                 'AATI',
  'PERKINELMER':          'Perkinelmer',
  'QIAGEN':               'Qiagen',
  'BIORAD':               'BIO-RAD',
  // ACP / Anapath PPE028
  'LEICA':                'Leica',
  'HAMAMATSU':            'Hamamatsu',
  'ROCHE':                'ROCHE',
  'DIAPATH':              'Diapath',
  'MMFRANCE':             'MM France',
  'MM':                   'MM France',
};

function normKey(s) {
  return String(s || '').toUpperCase().replace(/[\s\-_.]/g, '').trim();
}

/**
 * Retourne le libellé canonique du fournisseur tel qu'attendu dans la BDD.
 * Si pas d'alias connu, retourne le nom original (juste trimmé) — on ne casse
 * pas un nom inconnu, on le passe tel quel pour ne pas perdre de données.
 */
export function canonFournisseur(name) {
  const key = normKey(name);
  if (!key) return '';
  return ALIASES[key] || String(name).trim();
}
