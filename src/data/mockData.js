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
    id: 'bio-mol', reference: 'PPE044',
    nom: 'Biologie Moléculaire',
    secteur: 'investissements',
    description: 'Renouvellement du marché PPE025 — plateformes de séquençage NGS et équipements associés.',
    statut: 'ouvert',
    dateOuverture: '2026-04-03', dateLimiteDepot: '2029-04-03', dateAttributionPrevue: '',
    responsable: 'Eloïse SALLES', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 15, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 2, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 2, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    responsable: 'TBD', service: '',
    nbLots: 3, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    responsable: 'TBD', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    responsable: 'TBD', service: '',
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: true,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
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
    nbLots: 0, nbOffresRecues: 0, hasAnalyse: false, hasReporting: false,
    budgetEstime: '', progression: 5,
    tags: ['Questionnaire en cours'],
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
      'CCTP signé', 'DC1', 'DC2', 'ATTRI1', 'Fiche Contacts',
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
  docLabels: [
    'BPU', 'QT', 'Questionnaire RSE', 'CCAP signé',
    'CCTP signé', 'DC1', 'DC2', 'ATTRI1', 'Fiche Contacts',
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
// UTILS
// ═══════════════════════════════════════════════════════════

export function formatDate(iso) {
  if (!iso) return '—';
  if (!iso.includes('-')) return iso;
  const [y, m, d] = iso.split('-');
  if (!d) return iso;
  return d + '/' + m + '/' + y;
}

