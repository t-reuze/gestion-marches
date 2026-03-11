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
    id: 'med-nuc', reference: 'PPE041',
    nom: 'Médecine Nucléaire',
    description: "Renouvellement des équipements de médecine nucléaire (gamma-caméras, TEP-scan) pour les plateaux d'imagerie oncologique.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'anapath', reference: 'PPE037',
    nom: 'Anatomopathologie',
    description: "Acquisition de systèmes d'analyse numérique des lames et de scanners de pathologie pour l'anatomopathologie moléculaire.",
    statut: 'attribution',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'bio-mol', reference: 'PPE048',
    nom: 'Biologie Moléculaire',
    description: "Acquisition de plateformes de séquençage NGS et équipements associés pour les laboratoires de biologie moléculaire oncologique.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'telerad', reference: 'PPE029',
    nom: 'Téléradiologie',
    description: "Déploiement d'une solution de téléradiologie mutualisée pour les centres membres, incluant la plateforme de transmission et de stockage des images.",
    statut: 'reporting',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'rad-int', reference: 'PPE052',
    nom: 'Radiologie interventionnelle',
    description: "Acquisition de salles de radiologie interventionnelle hybrides pour le traitement des tumeurs par voie endovasculaire et percutanée.",
    statut: 'analyse',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
  {
    id: 'ia', reference: 'PPE055',
    nom: 'Intelligence Artificielle',
    description: "Acquisition de solutions d'intelligence artificielle pour l'aide au diagnostic en oncologie radiologique et anatomopathologique.",
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: [],
  },
];

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return d + '/' + m + '/' + y;
}

export function getAnalyseData(_marcheId) {
  return null;
}
