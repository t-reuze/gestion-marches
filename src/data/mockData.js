// ═══════════════════════════════════════════════════════════
// SECTEURS  — source : plan de charge.xls (2026-04-02)
// ═══════════════════════════════════════════════════════════

export const SECTEURS = {
  investissements: { label: 'Investissements' },
  pharma:          { label: 'Pharma' },
  logistique:      { label: 'Logistique' },
  rd:              { label: 'R&D' },
};

export function getMarchesBySecteur(secteurId) {
  return marches.filter(m => m.secteur === secteurId);
}

// ═══════════════════════════════════════════════════════════
// STATUTS
// ═══════════════════════════════════════════════════════════

export const STATUT_CONFIG = {
  sourcing:    { label: 'Sourcing',    color: '#0EA5E9', bg: '#E0F2FE' },
  ouvert:      { label: 'Ouvert',      color: '#3B82F6', bg: '#EFF6FF' },
  analyse:     { label: 'En analyse',  color: '#F59E0B', bg: '#FFFBEB' },
  attribution: { label: 'Attribution', color: '#8B5CF6', bg: '#F5F3FF' },
  cloture:     { label: 'Clôturé',     color: '#10B981', bg: '#F0FDF4' },
  reporting:   { label: 'En cours',    color: '#64748B', bg: '#F8FAFC' },
};

// ═══════════════════════════════════════════════════════════
// MARCHÉS  — source : plan de charge.xls
// ═══════════════════════════════════════════════════════════

export const marches = [

  // ── Investissements ──────────────────────────────────────

  {
    id: 'inv-accelerateurs', reference: 'PPE033',
    nom: 'Accélérateurs Radiothérapie',
    secteur: 'investissements',
    description: 'Marché d\'acquisition et maintenance d\'accélérateurs de radiothérapie — 6 lots (linéaires, stéréotaxie, IRM-linac, hyperthermie, positionnement, respiratoire).',
    statut: 'analyse',
    dateOuverture: '2024-01-15', dateLimiteDepot: '2024-02-15', dateAttributionPrevue: '2024-09-30',
    responsable: '', service: 'Investissements',
    nbLots: 6, nbOffresRecues: 12, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 60,
    tags: ['Radiothérapie', '6 lots', '12 candidats', 'PPE033'],
  },
  {
    id: 'bio-mol', reference: 'PPE044',
    nom: 'Biologie Moléculaire',
    secteur: 'investissements',
    description: 'Renouvellement du marché PPE025 — plateformes de séquençage NGS et équipements associés.',
    statut: 'ouvert',
    dateOuverture: '2026-04-03', dateLimiteDepot: '2029-04-03', dateAttributionPrevue: '',
    responsable: 'Eloïse SALLES', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Renouvellement PPE025', '3 mois overlap PPE025'],
  },
  {
    id: 'lert', reference: 'PPE041',
    nom: 'LERT',
    secteur: 'investissements',
    description: 'Nouveau marché — prise d\'effet février 2026.',
    statut: 'reporting',
    dateOuverture: '2026-02-15', dateLimiteDepot: '2029-02-15', dateAttributionPrevue: '',
    responsable: 'Eloïse SALLES', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 20,
    tags: ['1 an reconductible'],
  },
  {
    id: 'med-nuc', reference: 'PPE045',
    nom: 'Médecine Nucléaire',
    secteur: 'investissements',
    description: 'Renouvellement PPE027 — gamma-caméras, TEP-scan pour les plateaux d\'imagerie oncologique.',
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2030-01-01', dateAttributionPrevue: '2027-01-01',
    responsable: 'Jean Noël BADEL', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Renouvellement PPE027', '1 an reconductible'],
  },
  {
    id: 'anapath', reference: 'PPE028',
    nom: 'Anatomopathologie',
    secteur: 'investissements',
    description: 'Systèmes d\'analyse numérique des lames et scanners de pathologie — année optionnelle activée.',
    statut: 'reporting',
    dateOuverture: '2023-02-25', dateLimiteDepot: '2027-02-25', dateAttributionPrevue: '',
    responsable: 'Eloïse SALLES', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 65,
    tags: ['Année activée'],
  },
  {
    id: 'ctrl-regl-al109', reference: 'AL109',
    nom: 'Radioprotection & Sûreté Radiologique',
    secteur: 'investissements',
    description: 'Vérifications radioprotection, missions CRP, logiciels calcul, contrôle effluents, 15 lots.',
    statut: 'ouvert',
    dateOuverture: '2027-01-23', dateLimiteDepot: '2030-01-23', dateAttributionPrevue: '',
    responsable: 'Claire FOURIS', service: '',
    nbLots: 15, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Marché en cours prolongé 1 an'],
  },
  {
    id: 'ctrl-qual-al083', reference: 'AL083',
    nom: 'Contrôle Qualité Externe — Radiologie & Médecine Nucléaire',
    secteur: 'investissements',
    description: 'Renouvellement prise d\'effet janvier 2027 — 2 lots. Année optionnelle non activée.',
    statut: 'ouvert',
    dateOuverture: '2027-01-02', dateLimiteDepot: '2030-01-02', dateAttributionPrevue: '',
    responsable: 'Claire FOURIS', service: '',
    nbLots: 2, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Année optionnelle non activée'],
  },
  {
    id: 'rad-int', reference: 'PPE030',
    nom: 'Radiologie Interventionnelle',
    secteur: 'investissements',
    description: 'Salle ConeBeam CT (CBCT) Canon/GE/Philips/Siemens + salle multi-modale TDM avec arceau fixe.',
    statut: 'reporting',
    dateOuverture: '2024-01-23', dateLimiteDepot: '2026-01-23', dateAttributionPrevue: '',
    responsable: 'Sergio RABENJASON', service: '',
    nbLots: 2, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 85,
    tags: ['Année activée'],
  },
  {
    id: 'ctrl-regl-al080', reference: 'AL080',
    nom: 'Contrôle des Locaux & Effluents (Salles Blanches, EOLIA)',
    secteur: 'investissements',
    description: 'Contrôle locaux pollution spécifique (infructueux), salles blanches EOLIA, effluents non-radioactifs.',
    statut: 'reporting',
    dateOuverture: '2023-02-20', dateLimiteDepot: '2026-02-20', dateAttributionPrevue: '',
    responsable: 'Sergio RABENJASON', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 90,
    tags: ['1 an reconductible'],
  },
  {
    id: 'telerad', reference: 'PPE029',
    nom: 'Téléradiologie',
    secteur: 'investissements',
    description: 'Solution téléradiologie mutualisée avec logistique — publication prévue février 2026.',
    statut: 'ouvert',
    dateOuverture: '2026-06-20', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: 'Gaëtan RAYMOND / Alban HARTMANN', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['CDC en cours de relecture'],
  },
  {
    id: 'ia', reference: 'PPE055',
    nom: 'IA avec logistique',
    secteur: 'investissements',
    description: 'Intelligence Artificielle avec logistique — nouvelle proposition de marché.',
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Nouvelle proposition'],
  },
  {
    id: 'pacs-dacs', reference: '',
    nom: 'PACS / DACS',
    secteur: 'investissements',
    description: 'Nouvelle proposition de marché — PACS/DACS.',
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Nouvelle proposition'],
  },

  // ── Logistique ───────────────────────────────────────────

  {
    id: 'telecoms', reference: '',
    nom: 'Marché Télécoms',
    secteur: 'logistique',
    description: 'Renouvellement — enquête de satisfaction en cours. Statut : à voir.',
    statut: 'analyse',
    dateOuverture: '2026-05-01', dateLimiteDepot: '2029-05-01', dateAttributionPrevue: '2030-05-01',
    responsable: 'Franck MESTRE', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 15,
    tags: ['Enquête satisfaction en cours'],
  },
  {
    id: 'sterilisation', reference: '',
    nom: 'Externalisation de la Stérilisation',
    secteur: 'logistique',
    description: 'Stérilisation externalisée DM stériles, basse température, maintenance. DI et appel à candidatures en cours.',
    statut: 'ouvert',
    dateOuverture: '2026-05-01', dateLimiteDepot: '2029-05-01', dateAttributionPrevue: '2030-05-01',
    responsable: '', service: '',
    nbLots: 3, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 10,
    tags: ['DI en cours'],
  },
  {
    id: 'linge', reference: '',
    nom: 'Location et Entretien du Linge',
    secteur: 'logistique',
    description: 'Prestation de location et entretien du linge — lot par centre. DI à venir. Enquête de satisfaction en cours.',
    statut: 'ouvert',
    dateOuverture: '2026-12-01', dateLimiteDepot: '2029-12-01', dateAttributionPrevue: '',
    responsable: 'Frédéric PERRIER-GUSTIN', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 5,
    tags: ['DI à venir', 'Enquête satisfaction'],
  },
  {
    id: 'fournitures-labo', reference: '',
    nom: 'Fournitures de Laboratoire',
    secteur: 'logistique',
    description: 'Outils de coupe, lames/lamelles, chimie, consommables plastiques. Début travaux : septembre 2026.',
    statut: 'ouvert',
    dateOuverture: '2027-02-25', dateLimiteDepot: '2030-02-26', dateAttributionPrevue: '2031-02-26',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Travaux sept. 2026'],
  },
  {
    id: 'ctrl-regl-log', reference: '',
    nom: 'Contrôles Réglementaires — Technique & Biomédical',
    secteur: 'logistique',
    description: 'Électricité, incendie/sécurité, équipements sous-pression, mécaniques, audit énergétique. Travaux : sept. 2026.',
    statut: 'ouvert',
    dateOuverture: '2027-03-20', dateLimiteDepot: '2031-03-20', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Travaux sept. 2026'],
  },
  {
    id: 'interim', reference: '',
    nom: 'Intérim & Recrutement',
    secteur: 'logistique',
    description: 'Intérim médical/paramédical, support/technique, recrutement, prestations diverses. Travaux : nov. 2026.',
    statut: 'ouvert',
    dateOuverture: '2027-07-01', dateLimiteDepot: '2030-07-01', dateAttributionPrevue: '2031-07-01',
    responsable: 'Yaël GLIKSMAN', service: '',
    nbLots: 4, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 0,
    tags: ['Travaux nov. 2026'],
    analyseConfigId: 'interim-recrutement-2026',
  },

  // ── Pharma ───────────────────────────────────────────────

  {
    id: 'pharma-medicaments-1', reference: '',
    nom: 'Médicaments (actuel)',
    secteur: 'pharma',
    description: 'Marché médicaments — prolongation active jusqu\'au 30/06/2026.',
    statut: 'reporting',
    dateOuverture: '2023-07-01', dateLimiteDepot: '2026-06-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 92,
    tags: ['Prolongation active'],
  },
  {
    id: 'pharma-hygiene', reference: '',
    nom: 'Hygiène',
    secteur: 'pharma',
    description: 'Marché Hygiène — en cours d\'exécution.',
    statut: 'reporting',
    dateOuverture: '2023-07-01', dateLimiteDepot: '2027-06-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 50,
    tags: [],
  },
  {
    id: 'pharma-mrp', reference: '',
    nom: 'MRP',
    secteur: 'pharma',
    description: 'Marché MRP — en cours d\'exécution.',
    statut: 'reporting',
    dateOuverture: '2025-04-01', dateLimiteDepot: '2028-03-31', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 30,
    tags: [],
  },
  {
    id: 'pharma-contraste', reference: '',
    nom: 'Produits de Contraste',
    secteur: 'pharma',
    description: 'Marché produits de contraste — prolongation active jusqu\'au 30/06/2026.',
    statut: 'reporting',
    dateOuverture: '2025-03-15', dateLimiteDepot: '2026-06-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 85,
    tags: ['Prolongation active'],
  },
  {
    id: 'pharma-cart', reference: '',
    nom: 'CAR-T',
    secteur: 'pharma',
    description: 'Marché CAR-T — prolongation en cours.',
    statut: 'reporting',
    dateOuverture: '2024-01-01', dateLimiteDepot: '2025-12-31', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 95,
    tags: ['Prolongation en cours'],
  },
  {
    id: 'pharma-nutrition', reference: '',
    nom: 'Nutrition Entérale',
    secteur: 'pharma',
    description: 'Marché nutrition entérale — prolongation active jusqu\'au 30/04/2026.',
    statut: 'reporting',
    dateOuverture: '2022-05-01', dateLimiteDepot: '2026-04-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 98,
    tags: ['Prolongation active'],
  },
  {
    id: 'pharma-macrobiopsie', reference: '',
    nom: 'Macrobiopsie',
    secteur: 'pharma',
    description: 'Marché macrobiopsie — marché gré à gré.',
    statut: 'reporting',
    dateOuverture: '2025-07-01', dateLimiteDepot: '2027-06-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 35,
    tags: ['Gré à gré'],
  },
  {
    id: 'pharma-diffuseurs', reference: '',
    nom: 'Diffuseurs',
    secteur: 'pharma',
    description: 'Marché diffuseurs — prolongation active jusqu\'au 30/06/2026.',
    statut: 'reporting',
    dateOuverture: '2022-07-18', dateLimiteDepot: '2026-06-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 90,
    tags: ['Prolongation active'],
  },
  {
    id: 'pharma-curietherapie', reference: '',
    nom: 'Curiethérapie',
    secteur: 'pharma',
    description: 'Marché curiethérapie — prolongation active jusqu\'au 30/09/2026.',
    statut: 'reporting',
    dateOuverture: '2022-10-01', dateLimiteDepot: '2026-09-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 88,
    tags: ['Prolongation active'],
  },
  {
    id: 'pharma-implants', reference: '',
    nom: 'Implants Mammaires',
    secteur: 'pharma',
    description: 'Marché implants mammaires — en cours d\'exécution.',
    statut: 'reporting',
    dateOuverture: '2024-04-01', dateLimiteDepot: '2028-03-31', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 40,
    tags: [],
  },
  {
    id: 'pharma-picc-cci', reference: '',
    nom: 'PICC / CCI',
    secteur: 'pharma',
    description: 'Marché PICC CCI — en cours d\'exécution.',
    statut: 'reporting',
    dateOuverture: '2024-04-01', dateLimiteDepot: '2028-03-31', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 40,
    tags: [],
  },
  {
    id: 'pharma-sutures', reference: '',
    nom: 'Sutures',
    secteur: 'pharma',
    description: 'Marché sutures — en cours d\'exécution.',
    statut: 'reporting',
    dateOuverture: '2024-07-01', dateLimiteDepot: '2028-06-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 35,
    tags: [],
  },
  {
    id: 'pharma-pachi', reference: '',
    nom: 'PACHI',
    secteur: 'pharma',
    description: 'Marché PACHI — en cours d\'exécution.',
    statut: 'reporting',
    dateOuverture: '2024-07-01', dateLimiteDepot: '2028-06-30', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 35,
    tags: [],
  },
  {
    id: 'pharma-microbiopsie', reference: '',
    nom: 'Microbiopsie',
    secteur: 'pharma',
    description: 'Marché microbiopsie — prolongation activée jusqu\'au 28/02/2029.',
    statut: 'reporting',
    dateOuverture: '2025-03-01', dateLimiteDepot: '2029-02-28', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 15,
    tags: ['Prolongation activée'],
  },
  {
    id: 'pharma-clips', reference: '',
    nom: 'Clips Magnétiques',
    secteur: 'pharma',
    description: 'Marché clips magnétiques — en cours jusqu\'au 31/05/2026.',
    statut: 'reporting',
    dateOuverture: '2025-06-01', dateLimiteDepot: '2026-05-31', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: true,
    budgetEstime: '', progression: 75,
    tags: [],
  },
  {
    id: 'pharma-fluides', reference: '',
    nom: 'Fluides Médicaux',
    secteur: 'pharma',
    description: 'Marché fluides médicaux — publication en cours.',
    statut: 'ouvert',
    dateOuverture: '2026-02-01', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 5,
    tags: ['Publication en cours'],
  },
  {
    id: 'pharma-medicaments-2', reference: '',
    nom: 'Médicaments (nouveau)',
    secteur: 'pharma',
    description: 'Nouveau marché médicaments — AO en cours.',
    statut: 'ouvert',
    dateOuverture: '2026-07-01', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: '', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 10,
    tags: ['En cours'],
  },

  // ── R&D ──────────────────────────────────────────────────

  {
    id: 'rd-recrutement', reference: '',
    nom: 'Recrutement de Personnel',
    secteur: 'rd',
    description: 'DCE finalisé, envoi mandat en cours. Prolongation exceptionnelle 3 mois (fin mars 2026).',
    statut: 'ouvert',
    dateOuverture: '2026-04-01', dateLimiteDepot: '2030-03-31', dateAttributionPrevue: '',
    responsable: 'Soumaya EL HIMDI', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 20,
    tags: ['DCE finalisé', 'Envoi mandat en cours'],
  },
  {
    id: 'rd-soumission', reference: '',
    nom: 'Soumission Réglementaire & Monitoring',
    secteur: 'rd',
    description: 'Finalisation DCE pour envoi mandat. Prolongation exceptionnelle 8 mois max (août 2026). Prise d\'effet prévue juin/juillet 2026.',
    statut: 'ouvert',
    dateOuverture: '2026-07-01', dateLimiteDepot: '2030-07-01', dateAttributionPrevue: '',
    responsable: 'Soumaya EL HIMDI', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 15,
    tags: ['Finalisation DCE'],
  },
  {
    id: 'rd-pharma-prest', reference: '',
    nom: 'Prestations Pharmaceutiques',
    secteur: 'rd',
    description: 'Constitution GT + envoi DI à programmer. Début travaux : avril 2026. Prolongation exceptionnelle 12 mois.',
    statut: 'ouvert',
    dateOuverture: '2026-10-14', dateLimiteDepot: '2030-10-14', dateAttributionPrevue: '',
    responsable: 'Soumaya EL HIMDI', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 10,
    tags: ['Travaux avril 2026', 'GT à constituer'],
  },
  {
    id: 'rd-transport', reference: '',
    nom: 'Transport Échantillons',
    secteur: 'rd',
    description: 'Constitution GT + envoi DI à programmer. Début travaux : avril 2026. Prolongation 12 mois activée. Échéance : 26/12/2026.',
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2026-12-26', dateAttributionPrevue: '',
    responsable: 'Soumaya EL HIMDI', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 10,
    tags: ['Travaux avril 2026', 'Prolongation 12 mois'],
  },
  {
    id: 'rd-tests-genomiques', reference: '',
    nom: 'Tests Génomiques',
    secteur: 'rd',
    description: 'Constitution GT + envoi DI à programmer. Début travaux : juin 2026. Prolongation 12 mois activée. Échéance : 01/04/2027.',
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '2027-04-01', dateAttributionPrevue: '',
    responsable: 'Soumaya EL HIMDI', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 5,
    tags: ['Travaux juin 2026', 'Prolongation 12 mois'],
  },
  {
    id: 'rd-remboursement', reference: '',
    nom: 'Remboursement Patients',
    secteur: 'rd',
    description: 'DCE finalisé, envoi mandat en cours.',
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: 'Soumaya EL HIMDI', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 20,
    tags: ['DCE finalisé'],
  },
  {
    id: 'rd-bdd-juridique', reference: '',
    nom: 'Base de Données Juridiques',
    secteur: 'rd',
    description: 'Questionnaire en cours d\'analyse, programmation envoi DI + constitution GT.',
    statut: 'ouvert',
    dateOuverture: '', dateLimiteDepot: '', dateAttributionPrevue: '',
    responsable: 'Soumaya EL HIMDI', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 5,
    tags: ['Questionnaire en cours'],
  },

  // ── R&D — Cybersécurité ──
  {
    id: 'rd-cybersecurite', reference: '',
    nom: 'Cybersécurité',
    secteur: 'rd',
    description: 'Prestations de conseil, audit, intégration et services managés en cybersécurité.',
    statut: 'analyse',
    dateOuverture: '2025-01-15', dateLimiteDepot: '2025-03-01', dateAttributionPrevue: '2025-06-30',
    responsable: '', service: 'DSI',
    nbLots: 5, nbOffresRecues: 33, hasAnalyse: true, hasReporting: false,
    budgetEstime: '', progression: 30,
    tags: ['Cybersécurité', 'DSI', '5 lots', '33 candidats'],
  },

];

// ═══════════════════════════════════════════════════════════
// FORMATIONS  — source : onglet Formations_scientifiques
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

// ═══════════════════════════════════════════════════════════
// CONFIGURATIONS ANALYSE PAR MARCHÉ
// ═══════════════════════════════════════════════════════════

/**
 * Chaque config décrit la structure d'un AO pour l'analyse de dossier :
 * - lots : liste des lots avec label et numéro
 * - docLabels : documents attendus par fournisseur (pour l'annuaire)
 * - bpuReq : colonnes BPU obligatoires par lot (index 0-based)
 * - bpuReqCols : mêmes colonnes, format simplifié pour compileQT
 * - lotSheets : config des feuilles BPU (nom de feuille Excel, colonnes clé, colonne prix)
 * - chiffrageLotSheets : noms des feuilles de chiffrage
 * - docRules : règles de détection documentaire (any/exclude/ext)
 */
export const ANALYSE_CONFIGS = {
  'interim-recrutement-2026': {
    label: 'AO Recrutement de Personnel 2026',
    lots: [
      { num: 1, label: 'LOT 1 MAD Personnel' },
      { num: 2, label: 'LOT 2 Recrutement' },
      { num: 3, label: 'LOT 3 Freelance' },
    ],
    docLabels: [
      'Lot 1 MAD Personnel', 'Lot 2 Recrutement', 'Lot 3 Freelance',
      'BPU (Annexe 5)', 'Optim. Tarifaire', 'QT (Annexe 1)',
      'BPU Chiffrage', 'Questionnaire RSE', 'CCAP signé',
      'CCTP signé', 'DC1', 'DC2', 'ATTRI1 / Acte Engagement', 'Fiche Contacts',
    ],
    bpuReq: {
      1: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: '% Remise' }],
      2: [{ col: 1, name: '% Taux' }],
      3: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: 'PUHT/heure' }, { col: 4, name: '% Remise' }],
    },
    bpuReqCols: { 1: [2, 3], 2: [1], 3: [2, 4] },
    lotSheets: [
      { name: 'LOT 1 \u2013 MAD Personnel', keyFn: 'profil-niveau', priceCol: 4, headers: ['Profil', 'Niveau exp\u00e9rience'] },
      { name: 'LOT 2 \u2013 Recrutement',   keyFn: 'profil',        priceCol: 1, headers: ['Profil'] },
      { name: 'LOT 3 \u2013 Freelance',     keyFn: 'profil-niveau', priceCol: 5, headers: ['Profil', 'Niveau exp\u00e9rience'] },
      { name: 'Optimisation Tarifaire',     keyFn: 'profil',        priceCol: 1, headers: ['Condition'] },
    ],
    chiffrageLotSheets: ['LOT 1 \u2013 MAD Personnel', 'LOT 3 \u2013 Freelance'],
  },
};

/** Config par défaut pour les marchés sans config spécifique */
export const DEFAULT_ANALYSE_CONFIG = {
  label: 'Analyse des offres',
  lots: [],
  // Colonnes affichées dans l'annuaire — alignées sur la grille acheteur
  docLabels: [
    // Documents techniques
    'QT', 'BPU', 'Optim. Tarifaire', 'BPU Chiffrage',
    'Mémoire technique', 'Brochures commerciales', 'Certificats de visites',
    'Contrat maintenance', 'Rétroplanning',
    'Questionnaire RSE', 'Documentation politique RSE',
    'Liste de références', 'Management qualité', 'Modules de formation',
    'Matériovigilance', 'Cybersécurité',
    // Documents administratifs
    'CCAP signé', 'CCTP signé', 'RC signé', 'Complément CCAP',
    'DC1', 'DC2', 'DUME', 'Délégation de pouvoir',
    'ATTRI1 / Acte Engagement', 'Engagement confidentialité',
    'Attestation fiscale', 'Attestation sociale', 'Attestation assurance',
    'Critères économiques', 'Marquage CE', 'Certifications ISO',
    'KBIS', 'RIB', 'Fiche Contacts', 'Partenariat',
  ],
  bpuReq: {},
  bpuReqCols: {},
  lotSheets: [],
  chiffrageLotSheets: [],
};

export function getAnalyseConfig(marcheId) {
  const marche = marches.find(m => m.id === marcheId);
  if (marche?.analyseConfigId && ANALYSE_CONFIGS[marche.analyseConfigId]) {
    return ANALYSE_CONFIGS[marche.analyseConfigId];
  }
  return DEFAULT_ANALYSE_CONFIG;
}

// ═══════════════════════════════════════════════════════════
// TEMPLATES DE DOCUMENTS — socle commun + spécifiques par marché
// ═══════════════════════════════════════════════════════════

// Socle commun à tous les marchés publics Unicancer
const TEMPLATES_SOCLE = [
  { category: 'Dossier de candidature', docs: [
    { id: 'dc1',      label: 'DC1 — Lettre de candidature',            format: '.xlsx',  obligatoire: true,  description: 'Formulaire DC1 signé — identification du candidat, forme du groupement' },
    { id: 'dc2',      label: 'DC2 — Déclaration du candidat',          format: '.xlsx',  obligatoire: true,  description: 'Formulaire DC2 — capacités économiques, financières et techniques' },
    { id: 'kbis',     label: 'Extrait KBIS',                            format: '.xlsx',  obligatoire: true,  description: 'Extrait KBIS de moins de 3 mois (ou équivalent pour les candidats étrangers)' },
    { id: 'rib',      label: 'RIB',                                     format: '.xlsx',  obligatoire: true,  description: 'Relevé d\'identité bancaire — IBAN, BIC, nom du titulaire' },
    { id: 'att-fisc', label: 'Attestation de régularité fiscale',       format: '.xlsx',  obligatoire: true,  description: 'Attestation délivrée par l\'administration fiscale (impôts directs et TVA)' },
    { id: 'att-soc',  label: 'Attestation sociale (URSSAF)',            format: '.xlsx',  obligatoire: true,  description: 'Attestation de vigilance URSSAF en cours de validité — vérifie la régularité des cotisations' },
    { id: 'att-ass',  label: 'Attestation assurance RC Pro',            format: '.xlsx',  obligatoire: true,  description: 'Attestation d\'assurance responsabilité civile professionnelle couvrant la durée du marché' },
    { id: 'honneur',  label: 'Attestation sur l\'honneur',              format: '.xlsx',  obligatoire: true,  description: 'Déclaration sur l\'honneur du candidat (absence d\'exclusion, régularité fiscale et sociale)' },
    { id: 'pouvoir',  label: 'Délégation de pouvoir de signature',      format: '.xlsx',  obligatoire: false, description: 'Si le signataire n\'est pas le représentant légal — justificatif d\'habilitation' },
    { id: 'ca-eff',   label: 'Déclaration CA et effectifs',             format: '.xlsx',  obligatoire: true,  description: 'Chiffre d\'affaires annuel et effectifs sur les 3 derniers exercices (N-2, N-1, N)' },
  ]},
  { category: 'Documents contractuels signés', docs: [
    { id: 'ccap',     label: 'CCAP daté et signé',                     format: '.xlsx',  obligatoire: true,  description: 'Cahier des Clauses Administratives Particulières — parapher chaque page, dater et signer la dernière' },
    { id: 'cctp',     label: 'CCTP daté et signé',                     format: '.xlsx',  obligatoire: true,  description: 'Cahier des Clauses Techniques Particulières — parapher et signer' },
    { id: 'rc',       label: 'Règlement de consultation signé',         format: '.xlsx',  obligatoire: true,  description: 'RC/RGC daté et signé par le représentant habilité' },
    { id: 'ae',       label: 'Annexe 7 — Acte d\'engagement (ATTRI1)',  format: '.xlsx',  obligatoire: true,  description: 'Acte d\'engagement signé — un par lot sur lequel le candidat se positionne' },
    { id: 'confid',   label: 'Annexe 10 — Engagement de confidentialité', format: '.xlsx', obligatoire: true, description: 'Engagement de confidentialité signé — protection des données échangées dans le cadre du marché' },
  ]},
  { category: 'Offre financière', docs: [
    { id: 'bpu-xls',  label: 'BPU Excel — Bordereau de Prix Unitaires', format: '.xlsx', obligatoire: true,  description: 'Un BPU par lot — fichier Excel avec les prix complétés (PUHT, remises, TVA, PUTTC)' },
  ]},
  { category: 'Offre technique', docs: [
    { id: 'memoire',  label: 'Mémoire technique',                       format: '.xlsx',  obligatoire: true,  description: 'Présentation de l\'offre : organisation, méthodologie, moyens humains et matériels, références, CV des intervenants clés' },
    { id: 'contact',  label: 'Annexe 4 — Fiche contacts',               format: '.xlsx', obligatoire: true,  description: 'Coordonnées des interlocuteurs du marché : commercial, technique, facturation, SAV, référent marché' },
  ]},
  { category: 'RSE & Développement durable', docs: [
    { id: 'rse-quest', label: 'Annexe 8 — Questionnaire Développement Durable', format: '.xls', obligatoire: true, description: 'Questionnaire RSE/DD Unicancer — thématiques : pilier social, gouvernance, achats responsables, performance environnementale, échanges dématérialisés' },
    { id: 'rse-pol',   label: 'Documentation politique RSE',                     format: '.xlsx', obligatoire: false, description: 'Rapport RSE/DD, politique EHS, certification EcoVadis, Pacte Mondial, charte diversité, bilan carbone…' },
  ]},
];

// Documents spécifiques par marché (s'ajoutent au socle)
const TEMPLATES_SPECIFIQUES = {
  'inv-accelerateurs': [
    { category: 'Technique — Accélérateurs Radiothérapie', docs: [
      { id: 'qt',       label: 'Annexe 1 CCTP — Questionnaire Technique',       format: '.xlsx', obligatoire: true,  description: 'QT standardisé par lot — un onglet par lot, réponses aux questions techniques complémentaires (spécifications, performance, installation, maintenance, formation)' },
      { id: 'retro',    label: 'Annexe 3 CCTP — Rétroplanning installation',     format: '.xlsx', obligatoire: true,  description: 'Planning prévisionnel par site bénéficiaire : commande, fabrication, livraison, installation, mise en service, formation' },
      { id: 'visite',   label: 'Annexe 3 RC — Formulaire de visite sur site',    format: '.xlsx',  obligatoire: false, description: 'Formulaire de visite de fonctionnement à remplir pour chaque centre bénéficiaire visité (CLCC)' },
    ]},
    { category: 'Financier — Accélérateurs', docs: [
      { id: 'bpu-mono', label: 'BPU Mono-Référence (Excel)',                     format: '.xlsx', obligatoire: true,  description: 'BPU pour achat unitaire — onglets : Base, Variante 1, Variante 2, Financement, DROM-COM' },
      { id: 'bpu-multi', label: 'BPU Multi-Références (Excel)',                  format: '.xlsx', obligatoire: true,  description: 'BPU pour achat groupé multi-sites — mêmes onglets + Guide des Remises dégressives' },
    ]},
    { category: 'Administratif — Accélérateurs', docs: [
      { id: 'ce',         label: 'Marquage CE / MDR',                            format: '.xlsx',  obligatoire: true,  description: 'Certificat CE (MDR 2017/745 ou MDD 93/42) pour chaque équipement proposé — offre de base + variantes' },
      { id: 'iso',        label: 'Certifications ISO 13485 / ISO 9001',          format: '.xlsx',  obligatoire: true,  description: 'Certificats de conformité au système de management de la qualité' },
      { id: 'maint',      label: 'Contrat de maintenance type',                  format: '.xlsx',  obligatoire: true,  description: 'Descriptif organisation maintenance, délais d\'intervention, stock pièces détachées, contrat type' },
      { id: 'vigil',      label: 'Procédure de matériovigilance',                format: '.xlsx',  obligatoire: true,  description: 'Processus de déclaration et suivi des incidents, post-market surveillance' },
      { id: 'formation',  label: 'Descriptif des modules de formation',          format: '.xlsx',  obligatoire: true,  description: 'Programme de formation par fonction (utilisateur, physicien, technicien), durée, contenu' },
      { id: 'ref-clients', label: 'Liste de références clients',                 format: '.xlsx',  obligatoire: true,  description: 'Références d\'installations similaires — clients, sites, équipements, dates' },
      { id: 'partenariat', label: 'Annexe 7 CCAP — Partenariat scientifique',    format: '.xlsx', obligatoire: false, description: 'Formulaire de partenariat scientifique — collaborations recherche avec les CLCC' },
      { id: 'complement-ccap', label: 'Complément CCAP signé',                   format: '.xlsx',  obligatoire: false, description: 'Complément au CCAP si fourni par Unicancer — parapher et signer' },
    ]},
  ],
  'rd-cybersecurite': [
    { category: 'Technique — Cybersécurité', docs: [
      { id: 'memoire-lot', label: 'Mémoire technique par lot',                   format: '.xlsx',  obligatoire: true,  description: 'Proposition organisationnelle et technique par lot — méthodologie, équipe, outils, planning, références' },
      { id: 'passi',       label: 'Qualification PASSI ANSSI',                   format: '.xlsx',  obligatoire: false, description: 'Attestation PASSI (Prestataire d\'Audit de Sécurité des SI) délivrée par l\'ANSSI' },
      { id: 'iso27001',    label: 'Certification ISO 27001 / HDS',              format: '.xlsx',  obligatoire: false, description: 'Certification ISO 27001 système de management de la sécurité de l\'information, ou HDS' },
      { id: 'ref-missions', label: 'Déclaration de références missions',         format: '.xlsx',  obligatoire: true,  description: 'Références de missions similaires — secteur santé, volume, périmètre, résultats' },
      { id: 'outillage',   label: 'Description de l\'outillage',                 format: '.xlsx',  obligatoire: false, description: 'Outils et plateformes utilisés (SIEM, scanner, EDR, SOC…)' },
    ]},
    { category: 'Financier — Cybersécurité', docs: [
      { id: 'bpu-tjm',     label: 'BPU — Taux Journaliers Moyens (TJM)',        format: '.xlsx', obligatoire: true,  description: 'TJM par profil (Junior, Senior, Expert) et par lot — colonnes : TJM HT, TVA, TTC' },
      { id: 'bpu-cas',     label: 'BPU — Cas d\'usage',                          format: '.xlsx', obligatoire: true,  description: 'Chiffrage de cas d\'usage types par lot (test d\'intrusion simple/moyen/complexe, audit architecture…)' },
    ]},
    { category: 'Administratif — Cybersécurité', docs: [
      { id: 'dc4',         label: 'DC4 — Sous-traitance',                       format: '.xlsx',  obligatoire: false, description: 'Déclaration de sous-traitance si le candidat prévoit de confier une partie des prestations' },
      { id: 'annexe1',     label: 'Annexe 1 — Liste des bénéficiaires',         format: '.xlsx',  obligatoire: false, description: 'Liste des centres Unicancer bénéficiaires du marché' },
      { id: 'annexe3',     label: 'Annexe 3 — Référents Unicancer Achats',      format: '.xlsx',  obligatoire: false, description: 'Coordonnées des référents Unicancer pour le suivi du marché' },
      { id: 'annexe6',     label: 'Annexe 6 — Volumes du marché',               format: '.xlsx', obligatoire: false, description: 'Estimation des volumes prévisionnels par lot et par an' },
    ]},
  ],
  // Config par défaut pour les marchés sans templates spécifiques
  '_default': [],
};

export function getDocTemplates(marcheId) {
  const specifiques = TEMPLATES_SPECIFIQUES[marcheId] || TEMPLATES_SPECIFIQUES['_default'];
  return [...TEMPLATES_SOCLE, ...specifiques];
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════

export function formatDate(iso) {
  if (!iso) return '—';
  if (!iso.includes('-')) return iso;
  const [y, m, d] = iso.split('-');
  if (!d) return iso;
  return d + '/' + m + '/' + y;
}

export function getAnalyseData(_marcheId) {
  return null;
}

// ══════════════════════════════════════════════════════════════
// CLCC  — Centres de Lutte Contre le Cancer (réseau Unicancer)
// Source : Synthèse enquête CQE + liste bénéficiaires
// ══════════════════════════════════════════════════════════════

export const FONCTIONS = [
  'Ingénieur Biomédical',
  'Physicien Médical',
  'Responsable Achats / Acheteur',
  'DRH',
  'Directeur',
  'Pharmacien',
  'Cadre de santé',
  'Juriste',
  'Autre',
];

export const clccs = [
  {
    id: 'ico',
    nom: "Institut de Cancérologie de l'Ouest",
    ville: 'Angers / Nantes',
    region: 'Pays de la Loire',
    contacts: [],
  },
  {
    id: 'bergonie',
    nom: 'Institut Bergonié',
    ville: 'Bordeaux',
    region: 'Nouvelle-Aquitaine',
    contacts: [],
  },
  {
    id: 'baclesse',
    nom: 'Centre François Baclesse',
    ville: 'Caen',
    region: 'Normandie',
    contacts: [],
  },
  {
    id: 'jean-perrin',
    nom: 'Centre Jean Perrin',
    ville: 'Clermont-Ferrand',
    region: 'Auvergne-Rhône-Alpes',
    contacts: [],
  },
  {
    id: 'cgfl',
    nom: 'Centre Georges-François Leclerc',
    ville: 'Dijon',
    region: 'Bourgogne-Franche-Comté',
    contacts: [],
  },
  {
    id: 'oscar-lambret',
    nom: 'Centre Oscar Lambret',
    ville: 'Lille',
    region: 'Hauts-de-France',
    contacts: [],
  },
  {
    id: 'leon-berard',
    nom: 'Centre Léon Bérard',
    ville: 'Lyon',
    region: 'Auvergne-Rhône-Alpes',
    contacts: [],
  },
  {
    id: 'ipc',
    nom: 'Institut Paoli-Calmettes',
    ville: 'Marseille',
    region: "Provence-Alpes-Côte d'Azur",
    contacts: [],
  },
  {
    id: 'icm',
    nom: 'ICM — Institut du Cancer de Montpellier',
    ville: 'Montpellier',
    region: 'Occitanie',
    contacts: [],
  },
  {
    id: 'icl',
    nom: 'ICL — Institut de Cancérologie de Lorraine',
    ville: 'Nancy',
    region: 'Grand Est',
    contacts: [],
  },
  {
    id: 'lacassagne',
    nom: 'Centre Antoine Lacassagne',
    ville: 'Nice',
    region: "Provence-Alpes-Côte d'Azur",
    contacts: [],
  },
  {
    id: 'curie',
    nom: 'Institut Curie',
    ville: 'Paris / Saint-Cloud',
    region: 'Île-de-France',
    contacts: [],
  },
  {
    id: 'godinot',
    nom: 'Institut Jean Godinot',
    ville: 'Reims',
    region: 'Grand Est',
    contacts: [],
  },
  {
    id: 'eugene-marquis',
    nom: 'Centre Eugène Marquis',
    ville: 'Rennes',
    region: 'Bretagne',
    contacts: [],
  },
  {
    id: 'becquerel',
    nom: 'Centre Henri Becquerel',
    ville: 'Rouen',
    region: 'Normandie',
    contacts: [],
  },
  {
    id: 'paul-strauss',
    nom: 'Centre Paul Strauss',
    ville: 'Strasbourg',
    region: 'Grand Est',
    contacts: [],
  },
  {
    id: 'iuct',
    nom: 'IUCT Oncopole — Institut Claudius Regaud',
    ville: 'Toulouse',
    region: 'Occitanie',
    contacts: [],
  },
  {
    id: 'gustave-roussy',
    nom: 'Gustave Roussy',
    ville: 'Villejuif',
    region: 'Île-de-France',
    contacts: [],
  },
  {
    id: 'sainte-catherine',
    nom: 'Institut Sainte-Catherine',
    ville: 'Avignon',
    region: "Provence-Alpes-Côte d'Azur",
    contacts: [],
  },
];

// ══════════════════════════════════════════════════════════════
// ÉTABLISSEMENTS AFFILIÉS — CHU, Cliniques, CH partenaires
// ══════════════════════════════════════════════════════════════

export const etablissementsAffilies = [
  { id: 'chu-lyon', nom: 'CHU de Lyon (HCL)', ville: 'Lyon', type: 'CHU', region: 'Auvergne-Rhône-Alpes' },
  { id: 'chu-bordeaux', nom: 'CHU de Bordeaux', ville: 'Bordeaux', type: 'CHU', region: 'Nouvelle-Aquitaine' },
  { id: 'chu-toulouse', nom: 'CHU de Toulouse', ville: 'Toulouse', type: 'CHU', region: 'Occitanie' },
  { id: 'chu-montpellier', nom: 'CHU de Montpellier', ville: 'Montpellier', type: 'CHU', region: 'Occitanie' },
  { id: 'chu-lille', nom: 'CHU de Lille', ville: 'Lille', type: 'CHU', region: 'Hauts-de-France' },
  { id: 'chu-nantes', nom: 'CHU de Nantes', ville: 'Nantes', type: 'CHU', region: 'Pays de la Loire' },
  { id: 'chu-strasbourg', nom: 'CHRU de Strasbourg', ville: 'Strasbourg', type: 'CHRU', region: 'Grand Est' },
  { id: 'chu-rennes', nom: 'CHU de Rennes', ville: 'Rennes', type: 'CHU', region: 'Bretagne' },
  { id: 'chu-rouen', nom: 'CHU de Rouen', ville: 'Rouen', type: 'CHU', region: 'Normandie' },
  { id: 'chu-caen', nom: 'CHU de Caen', ville: 'Caen', type: 'CHU', region: 'Normandie' },
  { id: 'chu-nancy', nom: 'CHRU de Nancy', ville: 'Nancy', type: 'CHRU', region: 'Grand Est' },
  { id: 'chu-reims', nom: 'CHU de Reims', ville: 'Reims', type: 'CHU', region: 'Grand Est' },
  { id: 'chu-dijon', nom: 'CHU Dijon Bourgogne', ville: 'Dijon', type: 'CHU', region: 'Bourgogne-Franche-Comté' },
  { id: 'chu-clermont', nom: 'CHU de Clermont-Ferrand', ville: 'Clermont-Ferrand', type: 'CHU', region: 'Auvergne-Rhône-Alpes' },
  { id: 'chu-nice', nom: 'CHU de Nice', ville: 'Nice', type: 'CHU', region: "Provence-Alpes-Côte d'Azur" },
  { id: 'aphp', nom: 'AP-HP (Assistance Publique)', ville: 'Paris', type: 'CHU', region: 'Île-de-France' },
  { id: 'aphm', nom: 'AP-HM (Assistance Publique Marseille)', ville: 'Marseille', type: 'CHU', region: "Provence-Alpes-Côte d'Azur" },
  { id: 'chu-grenoble', nom: 'CHU Grenoble Alpes', ville: 'Grenoble', type: 'CHU', region: 'Auvergne-Rhône-Alpes' },
  { id: 'chu-angers', nom: 'CHU d\'Angers', ville: 'Angers', type: 'CHU', region: 'Pays de la Loire' },
  { id: 'chu-poitiers', nom: 'CHU de Poitiers', ville: 'Poitiers', type: 'CHU', region: 'Nouvelle-Aquitaine' },
];

// ══════════════════════════════════════════════════════════════
// CONTACTS INTERNES UNICANCER (Siège)
// ══════════════════════════════════════════════════════════════

export const contactsSiege = [
  { id: 'siege-achats', service: 'Direction des Achats', contacts: [
    { nom: 'Gaëtan RAYMOND', fonction: 'Directeur des Achats', email: '', telephone: '' },
    { nom: 'Alban HARTMANN', fonction: 'Responsable Achats', email: '', telephone: '' },
    { nom: 'Eloïse SALLES', fonction: 'Acheteuse', email: '', telephone: '' },
    { nom: 'Claire FOURIS', fonction: 'Acheteuse', email: '', telephone: '' },
    { nom: 'Sergio RABENJASON', fonction: 'Acheteur', email: '', telephone: '' },
    { nom: 'Jean Noël BADEL', fonction: 'Acheteur', email: '', telephone: '' },
    { nom: 'Frédéric PERRIER-GUSTIN', fonction: 'Acheteur', email: '', telephone: '' },
    { nom: 'Yaël GLIKSMAN', fonction: 'Acheteuse', email: '', telephone: '' },
    { nom: 'Soumaya EL HIMDI', fonction: 'Acheteuse', email: '', telephone: '' },
  ]},
  { id: 'siege-formation', service: 'Formation Scientifique', contacts: [] },
  { id: 'siege-dsi', service: 'Direction des Systèmes d\'Information', contacts: [] },
  { id: 'siege-drh', service: 'Direction des Ressources Humaines', contacts: [] },
  { id: 'siege-juridique', service: 'Direction Juridique', contacts: [] },
  { id: 'siege-direction', service: 'Direction Générale', contacts: [] },
];
