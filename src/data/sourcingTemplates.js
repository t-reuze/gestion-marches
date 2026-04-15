// ═══════════════════════════════════════════════════════════════
// Templates par défaut pour le sourcing fournisseurs
// ═══════════════════════════════════════════════════════════════

function section(id, nom, criteres) {
  return { id, nom, criteres: criteres.map((c, i) => typeof c === 'string' ? { id: id + '-' + i, nom: c } : c) };
}

export const DEFAULT_TEMPLATES = [
  {
    id: 'prestations',
    nom: 'Prestations de services',
    type: 'default',
    description: 'Marchés de prestations récurrentes (contrôles qualité, audits, maintenance externalisée, formations...).',
    sections: [
      section('identite', 'Identité & positionnement', [
        'Type de structure',
        'Année de création',
        'Intervenants réunion',
        'Positionnement sur le marché',
        'Références clients (CLCC, CHU...)',
      ]),
      section('perimetre', 'Périmètre de prestations', [
        'Prestations couvertes',
        'Accréditations (COFRAC, ISO...)',
        'Limites du périmètre',
      ]),
      section('intervenants', 'Profil des intervenants', [
        'Effectif terrain',
        'Niveau de formation',
        'Expérience / ancienneté moyenne',
        'Spécialisation / organisation',
        'Intervenant dédié par site',
        'Système de backup',
      ]),
      section('couverture', 'Couverture géographique', [
        'Métropole',
        'DOM-TOM',
        'Modalités de déplacement',
      ]),
      section('operationnel', 'Fonctionnement opérationnel', [
        'Délai de planification',
        'Délai de rapport',
        'Outils / plateforme client',
        'Modalités de facturation',
        'Gestion des urgences',
      ]),
      section('prix', 'Prix & engagements', [
        'Grille tarifaire',
        'Engagements contractuels',
        'Indexation / révision',
        'Clauses de sortie',
      ]),
      section('analyse', 'Points forts / vigilance', [
        'Points forts',
        'Points de vigilance',
      ]),
      section('notes', 'Notes libres', [
        'Commentaires complémentaires',
      ]),
    ],
  },
  {
    id: 'materiel-biomedical',
    nom: 'Matériel biomédical',
    type: 'default',
    description: 'Achat d\'équipements lourds (scanners, IRM, accélérateurs, mammographes...).',
    sections: [
      section('identite', 'Identité fournisseur', [
        'Raison sociale',
        'Positionnement / part de marché',
        'Intervenants réunion',
        'Références installations CLCC',
      ]),
      section('technique', 'Caractéristiques techniques', [
        'Modèle proposé',
        'Performances clés',
        'Normes respectées',
        'Évolutions prévues / roadmap',
      ]),
      section('configuration', 'Configuration & options', [
        'Configuration de base',
        'Options proposées',
        'Accessoires inclus',
        'Consommables',
      ]),
      section('installation', 'Installation & mise en service', [
        'Délai de livraison',
        'Génie civil / adaptations locales',
        'Raccordements nécessaires',
        'Délai de mise en service',
      ]),
      section('formation', 'Formation utilisateurs', [
        'Formation initiale (durée, contenu)',
        'Formation continue',
        'Supports pédagogiques',
      ]),
      section('maintenance', 'Maintenance & SAV', [
        'Garantie constructeur',
        'Délai d\'intervention',
        'Astreinte / 24-7',
        'Disponibilité pièces détachées',
        'Contrat de maintenance (options)',
      ]),
      section('compatibilite', 'Compatibilité SI / PACS', [
        'Interfaces DICOM / HL7',
        'Compatibilité RIS / PACS existant',
        'Cybersécurité',
      ]),
      section('prix', 'Prix & conditions', [
        'Prix de l\'équipement',
        'Coût d\'installation',
        'Coût de maintenance annuel',
        'Conditions de paiement',
      ]),
      section('analyse', 'Points forts / vigilance', [
        'Points forts',
        'Points de vigilance',
      ]),
      section('notes', 'Notes libres', [
        'Commentaires complémentaires',
      ]),
    ],
  },
  {
    id: 'generique',
    nom: 'Générique minimal',
    type: 'default',
    description: 'Template simple pour démarrer sur n\'importe quel type de marché.',
    sections: [
      section('identite', 'Identité fournisseur', [
        'Raison sociale',
        'Contact principal',
        'Références',
      ]),
      section('offre', 'Offre & périmètre', [
        'Description de l\'offre',
        'Périmètre couvert',
      ]),
      section('prix', 'Prix & conditions', [
        'Prix indicatif',
        'Conditions',
      ]),
      section('analyse', 'Points forts / vigilance', [
        'Points forts',
        'Points de vigilance',
      ]),
    ],
  },
];

export function getTemplateById(id, userTemplates = []) {
  return [...DEFAULT_TEMPLATES, ...userTemplates].find(t => t.id === id) || null;
}
