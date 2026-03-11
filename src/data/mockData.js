// ═══════════════════════════════════════════════════════════
// DONNÉES MARCHÉS
// ═══════════════════════════════════════════════════════════

export const STATUT_CONFIG = {
  ouvert:      { label: 'Ouvert',       color: '#3B82F6', bg: '#EFF6FF' },
  analyse:     { label: 'En analyse',   color: '#F59E0B', bg: '#FFFBEB' },
  attribution: { label: 'Attribution',  color: '#8B5CF6', bg: '#F5F3FF' },
  cloture:     { label: 'Clôturé',      color: '#10B981', bg: '#F0FDF4' },
  reporting:   { label: 'Reporting',    color: '#64748B', bg: '#F8FAFC' },
};

export const marches = [
  {
    id: 'acc-lin', reference: 'PPE033',
    nom: 'Accélérateurs de particules',
    description: "Acquisition d'accélérateurs linéaires de traitement pour les centres membres du réseau Unicancer — Lot 1.",
    statut: 'analyse',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'med-nuc', reference: 'PPE045',
    nom: 'Médecine Nucléaire',
    description: "Renouvellement du marché Médecine nucléaire PPE027 — gamma-caméras, TEP-scan pour les plateaux d'imagerie oncologique.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2027-01-01', dateAttributionPrevue: '2030-01-01',
    responsable: 'Jean Noël BADEL', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Renouvellement PPE027', '1 an reconductible'],
  },
  {
    id: 'anapath', reference: 'PPE028',
    nom: 'Anatomopathologie',
    description: "Renouvellement prévu février 2026 — systèmes d'analyse numérique des lames et scanners de pathologie.",
    statut: 'attribution',
    dateOuverture: '', dateLimiteDepot: '2023-02-25', dateAttributionPrevue: '2027-02-25',
    responsable: 'Eloïse SALLES', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Année activée'],
  },
  {
    id: 'bio-mol', reference: 'PPE044',
    nom: 'Biologie Moléculaire',
    description: "Renouvellement du marché Biologie moléculaire PPE025 — plateformes de séquençage NGS et équipements associés.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2026-04-03', dateAttributionPrevue: '2029-04-03',
    responsable: 'Eloïse SALLES', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Renouvellement PPE025'],
  },
  {
    id: 'telerad', reference: 'PPE029',
    nom: 'Téléradiologie',
    description: "Solution de téléradiologie mutualisée avec logistique — cahier des charges en cours de refecture, publication février 2026.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2026-08-20', dateAttributionPrevue: '',
    responsable: 'Gaëtan RAYMOND / Alban HARTMANN', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'rad-int', reference: 'PPE030',
    nom: 'Radiologie interventionnelle',
    description: "Salle avec base ConeBeam CT (CBCT) Canon, GE, Philips, Siemens + salle multi-modale avec base TDM et arceau fixe.",
    statut: 'analyse',
    dateOuverture: '', dateLimiteDepot: '2024-01-23', dateAttributionPrevue: '2026-01-23',
    responsable: 'Sergio RABENJASON', service: '',
    nbLots: 2, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Année activée'],
  },
  {
    id: 'ia', reference: 'PPE055',
    nom: 'Intelligence Artificielle',
    description: "IA avec logistique — recensement des besoins en cours.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: 'Gaëtan RAYMOND / Alban HARTMANN', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'lert', reference: 'PPE041',
    nom: 'LERT',
    description: "Nouveau marché LERT.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2026-02-15', dateAttributionPrevue: '2029-02-15',
    responsable: 'Eloïse SALLES', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['1 an reconductible'],
  },
  {
    id: 'ctrl-regl-al109', reference: 'AL109',
    nom: 'Contrôles Réglementaires (Radioprotection)',
    description: "Renouvellement — vérifications de radioprotection, missions CRP, logiciels de calcul, contrôle des effluents, caractérisation pièces activées. 15 lots.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2027-01-23', dateAttributionPrevue: '2030-01-23',
    responsable: 'Claire FOURIS', service: '',
    nbLots: 15, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ["March\u00e9 prolong\u00e9 d'un an"],
  },
  {
    id: 'ctrl-qual-al083', reference: 'AL083',
    nom: 'Contrôles Qualité Externes Radiologie & MN',
    description: "Renouvellement — Contrôles qualité externes en Radiologie et Médecine Nucléaire. 2 lots.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2027-01-02', dateAttributionPrevue: '2030-01-02',
    responsable: 'Claire FOURIS', service: '',
    nbLots: 2, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Année optionnelle non activée'],
  },
  {
    id: 'ctrl-regl-al080', reference: 'AL080',
    nom: 'Contrôles Réglementaires (Locaux & Effluents)',
    description: "Contrôle des locaux à pollution spécifique (Infructueux), salles blanches, salles EOLIA, effluents liquides non-radioactifs.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2023-02-20', dateAttributionPrevue: '2026-02-20',
    responsable: 'Sergio RABENJASON', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['1 an reconductible'],
  },
];

// ═══════════════════════════════════════════════════════════
// DONNÉES FORMATIONS
// ═══════════════════════════════════════════════════════════

export const formations = [
  {
    id: 'french-dosimetry',
    nom: 'French Dosimetry School',
    dateEcheance: '2027',
    renouvellement: true,
    responsablePedagogique: 'Mme Delaby / Mme Barateau',
    contact: 'Claire FOURIS',
    commentaires: 'Dr Roch en responsable département physique',
  },
  {
    id: 'reirrad-stras',
    nom: 'Réirradiation Strasbourg',
    dateEcheance: '2026-06-25',
    renouvellement: true,
    responsablePedagogique: 'Pr Noël / Dr Beddok',
    contact: 'Sergio RABENJASON',
    commentaires: '',
  },
  {
    id: 'gate-hadron',
    nom: 'GATE hadronthérapie',
    dateEcheance: '2026-04-24',
    renouvellement: true,
    responsablePedagogique: 'Dr Grevillot / Dr Favaretto',
    contact: 'Sergio RABENJASON / Claire FOURIS',
    commentaires: 'Pr Maigne en responsable de la collaboration GATE',
  },
  {
    id: 'airo',
    nom: 'AIRO',
    dateEcheance: 'début 2027',
    renouvellement: true,
    responsablePedagogique: 'Dr Beddok',
    contact: 'Gaëtan RAYMOND / Sergio RABENJASON',
    commentaires: '',
  },
  {
    id: 'ia-radiotherapie',
    nom: 'IA en radiothérapie',
    dateEcheance: 'mi 2026',
    renouvellement: true,
    responsablePedagogique: 'Dr Beddok',
    contact: 'Sergio RABENJASON',
    commentaires: '',
  },
  {
    id: 'risques-chimiques',
    nom: 'Risques chimiques (Kaptitude)',
    dateEcheance: 'début 2026',
    renouvellement: true,
    responsablePedagogique: 'Laurence Baron',
    contact: 'Claire FOURIS',
    commentaires: '',
  },
  {
    id: 'riv',
    nom: 'RIV',
    dateEcheance: '2027',
    renouvellement: false,
    responsablePedagogique: '',
    contact: 'Claire FOURIS / Eloïse SALLES',
    commentaires: '',
  },
  {
    id: 'journee-proton',
    nom: 'Journée proton',
    dateEcheance: 'mi 2026',
    renouvellement: false,
    responsablePedagogique: '',
    contact: 'Gaëtan RAYMOND',
    commentaires: '',
  },
];

export function formatDate(iso) {
  if (!iso) return '—';
  if (!iso.includes('-')) return iso; // already formatted or approximate
  const [y, m, d] = iso.split('-');
  if (!d) return iso;
  return d + '/' + m + '/' + y;
}

export function getAnalyseData(_marcheId) {
  return null;
}
