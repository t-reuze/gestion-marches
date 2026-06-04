// ═══════════════════════════════════════════════════════════
// Configuration par marché d'investissement — alimentation Suivi_Invest
//
// Chaque entrée est keyée par l'id du marché dans mockData.js.
// - excelMarcheLabel : étiquette à écrire en col C "Marché" de la BDD
// - ppeRef           : référence utilisée dans le libellé de lot
// - lotLabel(n)      : fonction qui construit le libellé de lot tel qu'il doit apparaître en col E "Lot"
// - typeEquipementByLot : mapping numLot -> "Type d'équipement" (col D), si connu
// - includeAllLots   : si true, on ingère toutes les feuilles "Lots X-Y" du reporting fournisseur
// - consommablesLotRange : [from, to] inclusif si certains lots sont des consommables typés par défaut
//
// Marchés non listés ici : un fallback automatique est dérivé de mockData.js
// (voir getInvestConfig + DEFAULT_INVEST_CONFIG ci-dessous).
// ═══════════════════════════════════════════════════════════

import { marches } from './mockData.js';

export const MARCHE_INVEST_CONFIG = {
  'bio-mol': {
    excelMarcheLabel: 'Biologie moléculaire',
    ppeRef: 'PPE025',
    lotLabel: (n) => `Biologie moléculaire PPE025_Lot_${n}`,
    // BDD : tous les achats de lots 13-40 sont regroupés sous ce libellé unique.
    consommablesGroupedLotLabel: 'Biologie moléculaire PPE025_Lots_13-40',
    includeAllLots: true,
    typeEquipementByLot: {
      1: 'Automate', 2: 'Automate', 3: 'Automate', 4: 'Automate',
      5: 'Automate', 6: 'Automate', 7: 'Automate', 8: 'Automate',
      9: 'Automate', 10: 'Logiciels', 11: 'Logiciels', 12: 'Automate',
      41: 'Logiciels',
    },
    typeEquipementDefaultForConsommables: 'Consommables',
    consommablesLotRange: [13, 40],
    // Taux de gain/achats négocié pour ce marché (col Y de la BDD).
    // Valeur observée dans la BDD ground truth pour PPE025.
    gainAchatsRefDefault: 0.15,
  },
  'anapath': {
    excelMarcheLabel: 'Anatomopathologie',
    ppeRef: 'PPE028',
    lotLabel: (n) => `Anatomopathologie_PPE028_Lot_${n}`,
    includeAllLots: true,
    typeEquipementByLot: {
      1: 'Automate', 2: 'Automate', 3: 'Automate', 4: 'Automate',
      5: 'Automate', 6: 'Automate', 7: 'Automate', 8: 'Automate',
      9: 'Automate', 10: 'Automate', 11: 'Automate',
      12: 'Logiciels', 13: 'Logiciels',
    },
    typeEquipementDefaultForConsommables: 'Consommables',
    consommablesLotRange: null,
    gainAchatsRefDefault: 0.15,
  },
};

// Slug compatible Excel (pas d'apostrophes, espaces conservés) à partir du nom du marché.
function slugForLabel(nom) {
  return String(nom || 'Marché').replace(/'/g, '').trim();
}

// Fabrique une config par défaut pour tout marché invest non listé explicitement.
function buildDefaultConfig(m) {
  const slug = slugForLabel(m.nom);
  const ppe  = m.reference || '';
  const prefix = ppe ? `${slug}_${ppe}` : slug;
  return {
    excelMarcheLabel: prefix,
    ppeRef: ppe,
    lotLabel: (n) => `${prefix}_Lot${n}`,
    includeAllLots: true,
    typeEquipementByLot: {},     // l'utilisateur saisit le type lui-même
    typeEquipementDefaultForConsommables: 'Consommables',
    consommablesLotRange: null,
    isDefault: true,
  };
}

export function getInvestConfig(marcheId) {
  if (MARCHE_INVEST_CONFIG[marcheId]) return MARCHE_INVEST_CONFIG[marcheId];
  const m = marches.find(x => x.id === marcheId);
  if (m && m.secteur === 'investissements') return buildDefaultConfig(m);
  return null;
}

export function isInvestConfigured(marcheId) {
  if (marcheId in MARCHE_INVEST_CONFIG) return true;
  const m = marches.find(x => x.id === marcheId);
  return !!(m && m.secteur === 'investissements');
}

// Indique si le marché utilise une config "complète" (mapping lots -> types)
// vs une config minimale dérivée par défaut.
export function hasFullInvestConfig(marcheId) {
  return marcheId in MARCHE_INVEST_CONFIG;
}
