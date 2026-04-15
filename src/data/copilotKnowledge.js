// ══════════════════════════════════════════════════════════════
// Base de connaissances du SaaS — Gestion des Marchés UNICANCER
// Utilisée par le chatbot Copilot pour guider les utilisateurs
// ══════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT = `Tu es l'assistant intégré de la plateforme "Gestion des Marchés" d'UNICANCER.
Tu aides les utilisateurs (acheteurs, ingénieurs biomédicaux, pharmaciens, chefs de service) à utiliser l'outil.

RÈGLES :
- Réponds en français, de façon concise et directe
- Guide l'utilisateur pas à pas si nécessaire
- Si tu ne connais pas la réponse, dis-le honnêtement
- Ne donne jamais d'informations médicales ou de conseil juridique
- Utilise le vouvoiement

CONTEXTE DE L'OUTIL :
La plateforme est un SaaS de gestion des marchés publics pour les centrales d'achat UNICANCER.
Elle permet de gérer les appels d'offres, la notation des fournisseurs, le reporting et les contacts des 19 CLCC (Centres de Lutte Contre le Cancer).`;

export const KNOWLEDGE_BASE = [
  // ── Navigation principale ──────────────────────────────────
  {
    keywords: ['navigation', 'menu', 'section', 'où', 'trouver', 'accéder', 'page', 'aller'],
    answer: `La plateforme comporte 4 sections principales accessibles depuis la barre de navigation en haut :

**Marchés** — Tableau de bord avec tous les marchés, filtrables par secteur (Investissements, Pharma, Logistique, R&D) et par statut.

**Formations** — Liste des formations scientifiques à renouveler ou en cours. Vous pouvez gérer les inscriptions, documents et modèles économiques.

**Reporting** — Tableaux de bord Excel avec suivi CA et maintenance. Importez vos fichiers Excel pour générer des graphiques et KPIs.

**Contacts** — Annuaire des 19 CLCC avec 491 contacts classés par fonction (Acheteurs, DRH, Physiciens, etc.).`
  },
  {
    keywords: ['sidebar', 'barre latérale', 'gauche', 'secteur'],
    answer: `La barre latérale gauche affiche les marchés groupés par secteur. Vous pouvez :
- Cliquer sur un secteur pour le déplier/replier
- Cliquer sur un marché pour accéder directement à sa fiche
- Utiliser la barre de recherche en haut de la sidebar pour filtrer les marchés
- Le point coloré à côté de chaque marché indique son statut (bleu = ouvert, jaune = en analyse, etc.)`
  },

  // ── Marchés ────────────────────────────────────────────────
  {
    keywords: ['marché', 'marchés', 'tableau de bord', 'dashboard', 'liste'],
    answer: `Le **Tableau de bord** (page d'accueil) affiche tous les marchés sous forme de cartes.

**Filtrer les marchés :**
- Par secteur : cliquez sur les boutons "Investissements", "Pharma", "Logistique", "R&D"
- Par statut : utilisez les onglets "Ouverts", "En analyse", "Attribution", "Reporting", "Clôturés"
- Par nom : tapez dans la barre de recherche

**Accéder à un marché :**
Cliquez sur la carte du marché. Vous arriverez sur ses onglets : Analyse, Notation, Informations, Reporting, Interlocuteurs, ERP·KPI.`
  },
  {
    keywords: ['statut', 'ouvert', 'analyse', 'attribution', 'cloturé', 'clôturé', 'reporting'],
    answer: `Chaque marché a un statut qui indique son avancement :

- **Ouvert** (bleu) — L'appel d'offres est en cours, les fournisseurs peuvent répondre
- **En analyse** (jaune) — Les offres sont reçues et en cours d'évaluation
- **Attribution** (violet) — Le marché est en phase de sélection finale
- **En cours / Reporting** (gris) — Le marché est attribué, en phase d'exécution
- **Clôturé** (vert) — Le marché est terminé

Vous pouvez modifier le statut d'un marché depuis l'onglet **Informations**.`
  },
  {
    keywords: ['secteur', 'investissement', 'pharma', 'logistique', 'r&d'],
    answer: `Les marchés sont organisés en 4 secteurs :

- **Investissements** — Équipements biomédicaux (accélérateurs, IRM, médecine nucléaire, biologie moléculaire...)
- **Pharma** — Médicaments, hygiène, produits de contraste, nutrition, macrobiopsie...
- **Logistique** — Fournitures de laboratoire, contrôles réglementaires, intérim & recrutement...
- **R&D** — Marchés de recherche et développement

Utilisez les boutons secteur sur le tableau de bord pour filtrer.`
  },

  // ── Analyse / AO ───────────────────────────────────────────
  {
    keywords: ['analyse', 'offre', 'AO', 'appel', 'dossier', 'fournisseur', 'standardis'],
    answer: `L'onglet **Analyse** d'un marché permet d'analyser les réponses des fournisseurs à un appel d'offres.

**Comment ça marche :**
1. Cliquez sur "Sélectionner un dossier AO" pour charger le dossier contenant les réponses fournisseurs
2. L'outil détecte automatiquement les fichiers : BPU, questionnaires techniques, fiches contacts, RSE
3. Consultez l'onglet "Standardisation BPU" pour comparer les prix
4. Consultez l'onglet "Questionnaire Technique" pour les réponses techniques
5. L'onglet "Contrôle Qualité" vérifie la complétude des dossiers

**Format attendu :** Dossier avec sous-dossiers par fournisseur, contenant des fichiers Excel (.xlsx).`
  },

  // ── Notation ───────────────────────────────────────────────
  {
    keywords: ['notation', 'noter', 'note', 'critère', 'évaluer', 'évaluation', 'excel', 'import'],
    answer: `L'onglet **Notation** permet de noter les fournisseurs critère par critère.

**Pour commencer :**
1. Allez sur un marché → onglet "Notation"
2. Importez votre fichier Excel d'évaluation (glissez-déposez ou cliquez "Parcourir")
3. Le fichier doit respecter le template Unicancer : ligne 4 = en-têtes fournisseurs, lignes 5+ = critères

**Pendant la notation :**
- Naviguez entre les questions avec les boutons Précédent/Suivant
- Notez chaque fournisseur de 0 à 5 (slider ou étoiles)
- Vous pouvez marquer un critère comme "Non noté" pour l'exclure
- Les moyennes se mettent à jour en temps réel

**Après la notation :**
- Onglet "Synthèse" : classement, graphiques radar et barres
- Bouton "Exporter XLSX" : télécharge le fichier avec vos notes intégrées`
  },

  // ── Réponses fournisseurs ──────────────────────────────────
  {
    keywords: ['réponse', 'fournisseur', 'réponses fournisseurs', 'comparaison'],
    answer: `L'onglet **Réponses fournisseurs** apparaît après avoir chargé un fichier Excel dans la Notation.

Il affiche les réponses de chaque fournisseur question par question, avec :
- Les réponses textuelles à chaque critère
- La note attribuée
- Vos commentaires

Utilisez les onglets fournisseurs en haut pour naviguer entre les prestataires.
Vous pouvez exporter cette vue en PDF via le bouton "Exporter PDF".`
  },

  // ── Informations marché ────────────────────────────────────
  {
    keywords: ['information', 'infos', 'modifier', 'référent', 'budget', 'date', 'progression', 'tag'],
    answer: `L'onglet **Informations** d'un marché permet de consulter et modifier ses métadonnées :

- **Référent marché** — Nom du responsable
- **Statut** — Ouvert, En analyse, Attribution, Reporting, Clôturé
- **Progression** — Pourcentage d'avancement (slider)
- **Nombre de lots et offres reçues**
- **Budget estimé**
- **Dates clés** — Limite de dépôt, attribution prévue
- **Tags** — Mots-clés pour retrouver le marché

Cliquez "Sauvegarder" pour enregistrer vos modifications.`
  },

  // ── Reporting ──────────────────────────────────────────────
  {
    keywords: ['reporting', 'rapport', 'graphique', 'synthèse', 'excel', 'CA', 'maintenance'],
    answer: `La section **Reporting** propose deux modes :

**Reporting par marché :**
Accessible depuis l'onglet "Reporting" d'un marché. Affiche la progression, les KPIs et le tableau de synthèse de ce marché spécifique.

**Reporting global :**
Accessible depuis la barre de navigation → "Reporting". Vous pouvez :
1. Importer un fichier Excel de suivi (CA, maintenance)
2. Voir les graphiques générés automatiquement
3. Filtrer par période, par centre, par type
4. Exporter les graphiques en Excel

Le bouton "Exporter PDF" (🖨️) génère une version imprimable.`
  },

  // ── ERP / KPI ──────────────────────────────────────────────
  {
    keywords: ['erp', 'kpi', 'indicateur', 'budget tracker', 'timeline'],
    answer: `L'onglet **ERP · KPI** d'un marché affiche les indicateurs de performance :

- **Budget tracker** — Suivi du budget consommé vs estimé
- **Timeline** — Événements clés du marché
- **Notes** — Espace libre pour ajouter des commentaires

Cette section est encore en développement. Les données sont saisies manuellement pour l'instant.`
  },

  // ── Contacts / CLCC ────────────────────────────────────────
  {
    keywords: ['contact', 'annuaire', 'CLCC', 'centre', 'interlocuteur', 'email', 'mail'],
    answer: `La section **Contacts** est un annuaire des 19 Centres de Lutte Contre le Cancer (CLCC).

**Vue principale :**
- 19 cartes CLCC avec le nombre de contacts par centre
- Barre de recherche pour filtrer par nom ou ville
- Dropdown "Envoyer un mail par fonction" pour contacter tous les contacts d'une même fonction
- Bouton "Exporter tout (.xlsx)" pour télécharger l'annuaire complet

**Vue détail CLCC :**
Cliquez sur un centre pour voir ses contacts, filtrés par fonction :
- Dropdown pour choisir une fonction (Acheteur, DRH, Physicien, etc.)
- Barre de recherche dans le centre
- Bouton "Envoyer un mail" → ouvre Outlook avec tous les emails
- Bouton "Exporter Excel" → télécharge les contacts du centre
- Clic sur un email → ouvre Outlook directement
- Clic sur un téléphone → lance l'appel`
  },
  {
    keywords: ['ajouter contact', 'nouveau contact', 'créer contact'],
    answer: `Pour ajouter un contact à un CLCC :

1. Allez dans **Contacts** (barre de navigation)
2. Cliquez sur le CLCC concerné
3. Cliquez sur le bouton **"+ Ajouter un contact"** en haut à droite
4. Remplissez le formulaire : Nom, Fonction, Service, Email, Téléphone
5. Cochez les marchés liés si applicable
6. Cliquez "Enregistrer le contact"

Le contact sera sauvegardé et visible dans l'annuaire.`
  },
  {
    keywords: ['modifier contact', 'supprimer contact', 'éditer contact'],
    answer: `Pour modifier un contact :
- Cliquez sur le bouton crayon (✏️) sur la carte du contact
- Modifiez les champs dans le formulaire inline
- Cliquez "Sauvegarder"

Pour supprimer un contact :
- Cliquez sur le bouton croix (✗) sur la carte du contact
- Confirmez la suppression

Note : les contacts importés depuis le listing Excel peuvent aussi être modifiés ou masqués.`
  },
  {
    keywords: ['envoyer mail', 'mailing', 'mailto', 'outlook', 'email groupe'],
    answer: `Plusieurs façons d'envoyer des emails depuis la plateforme :

**Mail individuel :** Cliquez sur l'adresse email d'un contact → Outlook s'ouvre avec le destinataire.

**Mail par fonction (tous les CLCC) :** Sur la page Contacts, utilisez le dropdown "Envoyer un mail par fonction..." → sélectionnez une fonction (ex: "Ingénieur Biomédical (19 emails)") → Outlook s'ouvre avec tous les destinataires.

**Mail par fonction (un CLCC) :** Dans la vue détail d'un CLCC, filtrez par fonction puis cliquez "Envoyer un mail (N)" → Outlook s'ouvre avec les contacts filtrés.`
  },

  // ── Formations ─────────────────────────────────────────────
  {
    keywords: ['formation', 'formations', 'renouvellement', 'inscription', 'pédagogique'],
    answer: `La section **Formations** liste les formations scientifiques UNICANCER.

**Vue liste :**
- Tableau avec domaine, date d'échéance, statut de renouvellement, responsable pédagogique, contact
- Les dates en rouge = échéance dans moins de 6 mois

**Vue détail** (cliquez sur une formation) :
- **Informations** — Données générales, statut, responsable
- **Inscriptions** — Liste des inscrits, ajout/modification
- **Documents** — Pièces jointes liées à la formation
- **Modèle économique** — Calcul automatique des coûts (pédagogie, formateurs, déplacements, temps salarial)`
  },

  // ── Fonctionnalités générales ──────────────────────────────
  {
    keywords: ['export', 'exporter', 'télécharger', 'pdf', 'xlsx', 'excel'],
    answer: `Plusieurs exports sont disponibles :

- **Export Excel (.xlsx)** — Contacts (par CLCC ou global), Reporting
- **Export PDF** — Reporting (bouton 🖨️ "Exporter PDF")
- **Export XLSX des notes** — Notation (bouton "Exporter XLSX" après la notation)

Tous les exports se téléchargent directement dans votre dossier Téléchargements.`
  },
  {
    keywords: ['recherche', 'chercher', 'filtrer', 'trouver'],
    answer: `Vous pouvez chercher à plusieurs endroits :

- **Tableau de bord** — Barre de recherche par nom ou référence de marché
- **Sidebar** — Recherche rapide dans la liste des marchés
- **Contacts** — Recherche par nom de CLCC, ville ou contact
- **Vue détail CLCC** — Recherche par nom, email ou fonction

Tous les filtres fonctionnent en temps réel (pas besoin de valider).`
  },
  {
    keywords: ['raccourci', 'astuce', 'conseil', 'productivité'],
    answer: `Quelques astuces pour gagner du temps :

- **Glissez-déposez** vos fichiers Excel directement sur la zone d'import (Notation, Analyse)
- **Clic sur un email** = ouvre Outlook directement
- **Clic sur un téléphone** = lance l'appel via Teams
- **Filtrez par secteur** sur le tableau de bord pour réduire la liste
- **Export groupé** : "Envoyer un mail par fonction" contacte tous les CLCC d'un coup`
  },

  // ── Aide / Problèmes ──────────────────────────────────────
  {
    keywords: ['problème', 'bug', 'erreur', 'marche pas', 'bloqué', 'aide'],
    answer: `Si vous rencontrez un problème :

1. **Rafraîchissez la page** (Ctrl+Shift+R) — résout la plupart des problèmes d'affichage
2. **Vérifiez le format du fichier** — Les imports attendent du .xlsx (pas .xls, .csv ou .pdf)
3. **Données non sauvegardées ?** — Les données sont stockées dans votre navigateur. Si vous changez de navigateur ou videz le cache, elles seront perdues.

Si le problème persiste, contactez l'équipe technique.`
  },
  {
    keywords: ['données', 'sauvegarde', 'stockage', 'perdre', 'cache'],
    answer: `Les données de la plateforme sont stockées à deux niveaux :

- **Données statiques** (marchés, formations, contacts importés) — dans le code source, partagées par tous
- **Données dynamiques** (notes, méta, contacts ajoutés manuellement) — dans le localStorage de votre navigateur

⚠️ Le localStorage est lié à votre navigateur. Si vous changez de navigateur, videz le cache, ou utilisez la navigation privée, les données dynamiques ne seront pas disponibles.`
  },
];

// ── Recherche dans la base de connaissances ──────────────────

export function findAnswer(question) {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (q.includes(kwNorm)) score += 2;
      // Partial word match
      const words = kwNorm.split(/\s+/);
      for (const w of words) {
        if (w.length > 2 && q.includes(w)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch && bestScore >= 2 ? bestMatch.answer : null;
}

export const SUGGESTED_QUESTIONS = [
  'Comment fonctionne la notation ?',
  'Où trouver les contacts ?',
  'Comment exporter un fichier Excel ?',
  'Comment envoyer un mail groupé ?',
  'Comment ajouter un contact ?',
  'Quels sont les secteurs de marchés ?',
];
