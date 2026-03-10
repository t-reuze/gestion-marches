// ═══════════════════════════════════════════════════════════
// MOCK DATA — Données fictives
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
    dateOuverture: '2024-01-15', dateLimiteDepot: '2024-10-31', dateAttributionPrevue: '2025-07-01',
    responsable: 'Dr. A. Martin', service: 'Radiothérapie',
    nbLots: 1, nbOffresRecues: 6, hasAnalyse: false, hasReporting: false,
    budgetEstime: '15 000 000 €', progression: 72,
    tags: ['Radiothérapie', 'Équipement lourd', 'Prioritaire'],
  },
  {
    id: 'med-nuc', reference: 'PPE041',
    nom: 'Médecine Nucléaire',
    description: "Renouvellement des équipements de médecine nucléaire (gamma-caméras, TEP-scan) pour les plateaux d'imagerie oncologique.",
    statut: 'ouvert',
    dateOuverture: '2025-01-10', dateLimiteDepot: '2025-09-30', dateAttributionPrevue: '2026-02-01',
    responsable: 'Dr. P. Lefebvre', service: 'Imagerie médicale',
    nbLots: 2, nbOffresRecues: 3, hasAnalyse: false, hasReporting: false,
    budgetEstime: '12 000 000 €', progression: 25,
    tags: ['Imagerie', 'Nucléaire', 'Multi-lots'],
  },
  {
    id: 'anapath', reference: 'PPE037',
    nom: 'Anatomopathologie',
    description: "Acquisition de systèmes d'analyse numérique des lames et de scanners de pathologie pour l'anatomopathologie moléculaire.",
    statut: 'attribution',
    dateOuverture: '2023-11-01', dateLimiteDepot: '2024-06-15', dateAttributionPrevue: '2024-12-01', dateAttribution: '2024-11-22',
    responsable: 'Dr. C. Bernard', service: 'Anatomopathologie',
    nbLots: 3, nbOffresRecues: 5, hasAnalyse: false, hasReporting: false,
    budgetEstime: '4 800 000 €', progression: 95,
    tags: ['Pathologie', 'Numérique', 'IA'],
  },
  {
    id: 'bio-mol', reference: 'PPE048',
    nom: 'Biologie Moléculaire',
    description: "Acquisition de plateformes de séquençage NGS et équipements associés pour les laboratoires de biologie moléculaire oncologique.",
    statut: 'ouvert',
    dateOuverture: '2025-02-01', dateLimiteDepot: '2025-10-15', dateAttributionPrevue: '2026-03-01',
    responsable: 'M. E. Durand', service: 'Biologie moléculaire',
    nbLots: 2, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '6 500 000 €', progression: 10,
    tags: ['NGS', 'Génomique', 'Laboratoire'],
  },
  {
    id: 'telerad', reference: 'PPE029',
    nom: 'Téléradiologie',
    description: "Déploiement d'une solution de téléradiologie mutualisée pour les centres membres, incluant la plateforme de transmission et de stockage des images.",
    statut: 'reporting',
    dateOuverture: '2023-06-01', dateLimiteDepot: '2023-12-31', dateAttributionPrevue: '2024-06-01', dateAttribution: '2024-05-28',
    responsable: 'Mme. S. Moreau', service: 'Imagerie médicale',
    nbLots: 1, nbOffresRecues: 4, hasAnalyse: false, hasReporting: false,
    budgetEstime: '3 200 000 €', progression: 100,
    tags: ['Numérique', 'PACS', 'Clôturé'],
  },
  {
    id: 'rad-int', reference: 'PPE052',
    nom: 'Radiologie interventionnelle',
    description: "Acquisition de salles de radiologie interventionnelle hybrides pour le traitement des tumeurs par voie endovasculaire et percutanée.",
    statut: 'analyse',
    dateOuverture: '2024-09-01', dateLimiteDepot: '2025-04-30', dateAttributionPrevue: '2025-11-01',
    responsable: 'Dr. T. Rousseau', service: 'Radiologie',
    nbLots: 2, nbOffresRecues: 4, hasAnalyse: false, hasReporting: false,
    budgetEstime: '9 000 000 €', progression: 50,
    tags: ['Imagerie', 'Interventionnel', 'Multi-lots'],
  },
  {
    id: 'ia', reference: 'PPE055',
    nom: 'Intelligence Artificielle',
    description: "Acquisition de solutions d'intelligence artificielle pour l'aide au diagnostic en oncologie radiologique et anatomopathologique.",
    statut: 'ouvert',
    dateOuverture: '2025-03-15', dateLimiteDepot: '2025-12-31', dateAttributionPrevue: '2026-06-01',
    responsable: 'Dr. N. Petit', service: 'Innovation',
    nbLots: 3, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '5 000 000 €', progression: 5,
    tags: ['IA', 'Innovation', 'Multi-lots'],
  },
];

export const reportingData = {
  totalMarches: 7, marchesActifs: 5, marchesClotures: 1,
  totalOffresRecues: 17, analysesEnCours: 0, budgetTotalGere: '55 500 000 €',
  progressionParMarche: [
    { reference: 'PPE033', nom: 'Accélérateurs',            progression: 72,  statut: 'analyse'     },
    { reference: 'PPE037', nom: 'Anatomopathologie',         progression: 95,  statut: 'attribution' },
    { reference: 'PPE052', nom: 'Rad. interventionnelle',    progression: 50,  statut: 'analyse'     },
    { reference: 'PPE041', nom: 'Médecine Nucléaire',        progression: 25,  statut: 'ouvert'      },
    { reference: 'PPE048', nom: 'Biologie Moléculaire',      progression: 10,  statut: 'ouvert'      },
    { reference: 'PPE055', nom: 'Intelligence Artificielle', progression: 5,   statut: 'ouvert'      },
    { reference: 'PPE029', nom: 'Téléradiologie',            progression: 100, statut: 'reporting'   },
  ],
  evenementsRecents: [],
  alertes: [],
};

// Aucune donnée mock d'analyse — les données viennent des fichiers Excel chargés via la notation

export function getNoteGlobale(fournisseurId, criteres, notes) {
  let total = 0;
  criteres.forEach(c => {
    const n = notes.find(x => x.fournisseurId === fournisseurId && x.critereId === c.id);
    if (n) total += n.note * (c.poids / 100);
  });
  return total;
}

export function getClassement(fournisseurs, criteres, notes) {
  return [...fournisseurs]
    .map(f => ({ ...f, noteGlobale: getNoteGlobale(f.id, criteres, notes) }))
    .sort((a, b) => b.noteGlobale - a.noteGlobale);
}

export function noteColor(note) {
  if (note >= 4.25) return '#10B981';
  if (note >= 3.5)  return '#F59E0B';
  return '#EF4444';
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return d + '/' + m + '/' + y;
}

export function getAnalyseData(_marcheId) {
  return null;
}
