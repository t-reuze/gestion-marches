// ═══════════════════════════════════════════════════════════
// REPORTING — Constantes pour le parsing Excel et les charts
// ═══════════════════════════════════════════════════════════

/**
 * Mapping colonnes Excel brutes → clés propres.
 * Les clés du map sont normalisées (lowercase, espaces collapsés, trim).
 * Le parser normalise aussi les headers Excel de la même façon avant lookup.
 */
export const COLUMN_MAP = {
  'etablissement':                                      'etablissement',
  'clcc unique':                                        'clcc',
  'marché':                                             'marche',
  "type d'équipement":                                  'typeEquipement',
  'lot':                                                'lot',
  'fournisseur':                                        'fournisseur',
  'nom equipement':                                     'nomEquipement',
  'année':                                              'annee',
  'quantite':                                           'quantite',
  'cattc':                                              'caTtc',
  'coût annuel du contrat de maintenance (ttc)':        'coutMaintenanceAnnuel',
  'durée tco -années':                                  'dureeTco',
  'tco final ttc':                                      'tcoFinalTtc',
  'gain/achats de référence':                           'gainAchatsRef',
  'gain/achats (euros) nouvelle formule dgos':          'gainAchatsDgos',
  'gain/achats (euros) ancienne formule dgos':          'gainAchatsAncien',
  'gain/achats maintenance (euros)':                    'gainAchatsMaintenance',
  'contrat de maintenance en cours ?':                  'contratMaintenance',
  "coût maintenance total à aujourd'hui (réel avec tco)": 'coutMaintenanceReel',
  "potentiellement à renouveller (tco terminé) attention , si la durée tco n'est pas remplie": 'aRenouveler',
  'année de changement théorique (annee d\'installation + tco)': 'anneeChangement',
};

/** Colonnes numériques à parser en Number */
export const NUMERIC_KEYS = [
  'annee', 'quantite', 'caTtc', 'coutMaintenanceAnnuel', 'dureeTco',
  'tcoFinalTtc', 'gainAchatsRef', 'gainAchatsDgos', 'gainAchatsAncien',
  'gainAchatsMaintenance', 'coutMaintenanceReel', 'anneeChangement',
];

/**
 * Groupement des marchés Excel vers un label unifié.
 * Toutes les variantes "Radiothérapie_*" → "Radiothérapie"
 */
export const MARCHE_GROUPING = {
  'imagerie':                                         'Imagerie',
  'médecine nucléaire':                               'Médecine nucléaire',
  'radiologie interventionnelle':                     'Radiologie interventionnelle',
  'radiothérapie':                                    'Radiothérapie',
  'radiothérapie_acc_2020_2023':                      'Radiothérapie',
  'radiothérapie_cont_2020_2023':                     'Radiothérapie',
  'radiothérapie_cq_2020_2023':                       'Radiothérapie',
  'radiothérapie_log_ppe034':                         'Radiothérapie',
  'radiothérapie_acc_hyp_recosurf_asserv_ppe033':     'Radiothérapie',
  'radiothérapie_rtpo_rts_curie_ppe035':              'Radiothérapie',
  'biologie moléculaire':                             'Biologie moléculaire',
  'anatomopathologie':                                'Anatomopathologie',
};

/**
 * Mapping marché groupé → ID marché dans mockData.js
 * Utilisé pour le pré-filtrage en vue par marché
 */
export const MARCHE_TO_APP_ID = {
  'Imagerie':                       ['imagerie'],
  'Médecine nucléaire':             ['med-nuc'],
  'Radiologie interventionnelle':   ['rad-int'],
  'Radiothérapie':                  ['radiotherapie'],
  'Biologie moléculaire':           ['bio-mol'],
  'Anatomopathologie':              ['anapath'],
};

/**
 * Reverse : ID app → labels marchés Excel groupés
 */
export const APP_ID_TO_MARCHE = {};
Object.entries(MARCHE_TO_APP_ID).forEach(([label, ids]) => {
  ids.forEach(id => {
    if (!APP_ID_TO_MARCHE[id]) APP_ID_TO_MARCHE[id] = [];
    APP_ID_TO_MARCHE[id].push(label);
  });
});

/** Palette couleurs pour les charts */
export const CHART_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b',
  '#0891b2', '#db2777', '#0d9488', '#ea580c', '#4f46e5',
  '#059669', '#e11d48', '#7c3aed', '#d97706', '#0284c7',
];

/** Années disponibles pour l'upload */
export const AVAILABLE_YEARS = ['2023', '2024', '2025', '2026'];
