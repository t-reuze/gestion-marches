// ══════════════════════════════════════════════════════════════
// Base de connaissances — Assistant UNICANCER
// Moteur de recherche sémantique par scoring TF-IDF simplifié
// ══════════════════════════════════════════════════════════════

export const SYSTEM_PROMPT = `Tu es l'assistant intégré de la plateforme "Gestion des Marchés" d'UNICANCER.
Tu aides les utilisateurs (acheteurs, ingénieurs biomédicaux, pharmaciens, chefs de service) à utiliser l'outil.

RÈGLES STRICTES :
- Réponds en français, de façon concise et directe
- Réfléchis à ce que l'utilisateur veut VRAIMENT avant de répondre
- Si la question est vague, pose une question de clarification
- Guide pas à pas avec des étapes numérotées
- Ne donne jamais d'informations médicales ou de conseil juridique
- Utilise le vouvoiement
- Si tu ne sais pas, dis "Je ne suis pas sûr, mais voici ce que je peux vous dire..."

STRUCTURE DE L'APPLICATION :
- 4 sections navbar : Marchés, Formations, Reporting, Contacts
- Sidebar gauche : marchés groupés par secteur (Investissements, Pharma, Logistique, R&D)
- Chaque marché a des onglets : Analyse, Notation, Réponses fournisseurs, Informations, Reporting, Interlocuteurs, ERP·KPI
- Contacts = annuaire des 19 CLCC (Centres de Lutte Contre le Cancer) avec 491 contacts par fonction
- Formations = formations scientifiques avec inscriptions, documents, modèle économique`;

// ── Entrées de la base (topic + question patterns + réponse) ──

export const ENTRIES = [
  // ── CONTACTS ───────────────────────────────────────────────
  {
    topic: 'contacts_trouver',
    patterns: ['trouver contact', 'chercher contact', 'où contact', 'mes contacts', 'trouver interlocuteur', 'trouver quelqu'],
    answer: `Pour trouver vos contacts :

1. Cliquez sur **"Contacts"** dans la barre de navigation en haut
2. Vous verrez les **19 CLCC** (centres Unicancer) sous forme de cartes
3. Cliquez sur le centre qui vous intéresse
4. Utilisez le **menu déroulant** pour filtrer par fonction (Acheteur, DRH, Physicien, etc.)
5. Utilisez la **barre de recherche** pour chercher par nom ou email

Vous pouvez aussi chercher un contact depuis un marché → onglet **"Interlocuteurs"**.`
  },
  {
    topic: 'contacts_ajouter',
    patterns: ['ajouter contact', 'nouveau contact', 'créer contact', 'rajouter'],
    answer: `Pour ajouter un contact :

1. Allez dans **Contacts** (barre de navigation)
2. Cliquez sur le **CLCC** concerné
3. Cliquez sur **"+ Ajouter un contact"** en haut à droite
4. Remplissez : Nom, Fonction, Service, Email, Téléphone
5. Cochez les **marchés liés** si applicable
6. Cliquez **"Enregistrer"**`
  },
  {
    topic: 'contacts_modifier',
    patterns: ['modifier contact', 'éditer contact', 'changer contact', 'mettre à jour contact', 'supprimer contact'],
    answer: `Pour modifier un contact, cliquez sur le bouton **crayon** sur sa carte, modifiez les champs, puis cliquez "Sauvegarder".

Pour supprimer un contact, cliquez sur le bouton **croix** (✗) et confirmez.`
  },
  {
    topic: 'contacts_mail',
    patterns: ['envoyer mail', 'envoyer email', 'mailing', 'mailto', 'outlook', 'email groupe', 'contacter', 'mail groupé', 'écrire'],
    answer: `3 façons d'envoyer des emails :

**Mail individuel** — Cliquez sur l'adresse email d'un contact → Outlook s'ouvre.

**Mail à une fonction (tous les CLCC)** — Page Contacts → dropdown "Envoyer un mail par fonction..." → choisissez ex: "Ingénieur Biomédical (19 emails)" → Outlook s'ouvre avec tous les destinataires.

**Mail à une fonction (un seul CLCC)** — Ouvrez un centre → filtrez par fonction → cliquez "Envoyer un mail (N)".`
  },
  {
    topic: 'contacts_clcc',
    patterns: ['CLCC', 'centre', 'centres', 'combien de centres', 'liste centres', 'annuaire'],
    answer: `L'annuaire contient les **19 Centres de Lutte Contre le Cancer** du réseau UNICANCER (Gustave Roussy, Institut Curie, Centre Léon Bérard, etc.).

Chaque centre a ses contacts classés par **fonction** : Acheteur, DRH, DSI, Ingénieur Biomédical, Physicien, Chef de service, Référent Qualité, etc.

Accès : **Contacts** dans la barre de navigation.`
  },
  {
    topic: 'contacts_export',
    patterns: ['exporter contact', 'export excel contact', 'télécharger contact', 'xlsx contact'],
    answer: `Pour exporter les contacts :

**Tout l'annuaire** — Page Contacts → bouton **"Exporter tout (.xlsx)"** en haut à droite.

**Un seul CLCC** — Ouvrez le centre → bouton **"Exporter Excel"** à côté du filtre fonctions.

Le fichier Excel contient : Centre, Ville, Nom, Fonction, Email, Téléphone.`
  },

  // ── MARCHÉS ────────────────────────────────────────────────
  {
    topic: 'marches_liste',
    patterns: ['liste marché', 'voir marché', 'tous les marchés', 'tableau de bord', 'dashboard', 'accueil'],
    answer: `Le **Tableau de bord** (page d'accueil) affiche tous les marchés.

**Filtrer :**
- Par **secteur** : boutons "Investissements", "Pharma", "Logistique", "R&D"
- Par **statut** : onglets "Ouverts", "En analyse", "Attribution", etc.
- Par **nom** : barre de recherche

**Accéder à un marché** : cliquez sur sa carte → vous arrivez sur ses onglets.`
  },
  {
    topic: 'marches_statut',
    patterns: ['statut', 'ouvert', 'en analyse', 'attribution', 'clôturé', 'avancement', 'progression'],
    answer: `Les statuts des marchés :

- **Ouvert** (bleu) — Appel d'offres en cours
- **En analyse** (jaune) — Offres en cours d'évaluation
- **Attribution** (violet) — Sélection finale
- **En cours** (gris) — Marché attribué, en exécution
- **Clôturé** (vert) — Terminé

Pour modifier : allez sur le marché → onglet **"Informations"** → champ "Statut".`
  },
  {
    topic: 'marches_secteur',
    patterns: ['secteur', 'investissement', 'pharma', 'logistique', 'r&d', 'catégorie'],
    answer: `4 secteurs de marchés :

- **Investissements** — Équipements biomédicaux (accélérateurs, IRM, biologie moléculaire...)
- **Pharma** — Médicaments, hygiène, produits de contraste, nutrition...
- **Logistique** — Fournitures de labo, contrôles réglementaires, intérim...
- **R&D** — Recherche et développement

Filtrez par secteur sur le tableau de bord avec les boutons en haut.`
  },
  {
    topic: 'marches_onglets',
    patterns: ['onglet', 'onglets marché', 'que contient', 'fiche marché', 'page marché'],
    answer: `Chaque marché a ces onglets :

- **Analyse** — Charger un dossier AO, voir les offres standardisées
- **Notation** — Importer un Excel et noter les fournisseurs critère par critère
- **Réponses fournisseurs** — Voir les réponses de chaque prestataire (après import)
- **Informations** — Métadonnées du marché (statut, référent, dates, budget, tags)
- **Reporting** — Suivi et bilan si le marché a du reporting
- **Interlocuteurs** — Contacts liés à ce marché
- **ERP · KPI** — Indicateurs de performance (budget tracker, timeline)`
  },

  // ── NOTATION ───────────────────────────────────────────────
  {
    topic: 'notation_comment',
    patterns: ['notation', 'noter', 'évaluer', 'note', 'critère', 'fournisseur', 'comment noter'],
    answer: `Pour noter les fournisseurs :

1. Allez sur un marché → onglet **"Notation"**
2. **Importez** votre fichier Excel d'évaluation (glissez-déposez ou "Parcourir")
3. Naviguez entre les critères avec **Précédent / Suivant**
4. Pour chaque fournisseur : notez de **0 à 5** (slider ou étoiles)
5. Vous pouvez marquer "Non noté" pour exclure un critère
6. Les **moyennes** se calculent en temps réel en haut

**Format attendu** : fichier .xlsx — ligne 4 = en-têtes fournisseurs, lignes 5+ = critères.`
  },
  {
    topic: 'notation_export',
    patterns: ['exporter note', 'exporter notation', 'export xlsx', 'télécharger note', 'résultat notation'],
    answer: `Après la notation :

1. Allez sur l'onglet **"Synthèse"** (dans la page Notation)
2. Vous verrez le **classement**, les graphiques radar et barres
3. Cliquez **"Exporter XLSX"** → le fichier se télécharge avec vos notes intégrées

Le fichier exporté reprend le fichier original avec les notes remplies dans les colonnes J-O.`
  },

  // ── ANALYSE / AO ───────────────────────────────────────────
  {
    topic: 'analyse_ao',
    patterns: ['analyse', 'appel d\'offre', 'AO', 'dossier', 'offre', 'standardis', 'BPU', 'questionnaire'],
    answer: `L'onglet **Analyse** permet d'analyser un dossier d'appel d'offres :

1. Cliquez **"Sélectionner un dossier AO"**
2. L'outil détecte les fichiers : BPU, questionnaires techniques, fiches contacts, RSE
3. Onglet **"Standardisation BPU"** → compare les prix entre fournisseurs
4. Onglet **"Questionnaire Technique"** → réponses techniques
5. Onglet **"Contrôle Qualité"** → vérifie la complétude

**Structure attendue** : un dossier avec des sous-dossiers par fournisseur contenant des fichiers .xlsx.`
  },

  // ── FORMATIONS ─────────────────────────────────────────────
  {
    topic: 'formations',
    patterns: ['formation', 'formations', 'renouvellement', 'inscription', 'pédagogique', 'inscrire'],
    answer: `Section **Formations** (barre de navigation) :

**Vue liste** — Tableau avec domaine, date d'échéance, statut, responsable. Les dates en rouge = échéance < 6 mois.

**Vue détail** (cliquez sur une formation) :
- **Informations** — Données générales et statut
- **Inscriptions** — Gérer les inscrits
- **Documents** — Pièces jointes
- **Modèle économique** — Calcul automatique des coûts`
  },

  // ── REPORTING ──────────────────────────────────────────────
  {
    topic: 'reporting',
    patterns: ['reporting', 'rapport', 'graphique', 'suivi', 'CA', 'maintenance', 'bilan'],
    answer: `Le **Reporting** est accessible de deux façons :

**Reporting global** — Barre de navigation → "Reporting". Importez un fichier Excel de suivi pour générer des graphiques (CA, maintenance).

**Reporting par marché** — Sur un marché qui a du reporting → onglet "Reporting". Affiche la progression, les KPIs et le tableau de synthèse.

Vous pouvez exporter en PDF via le bouton 🖨️.`
  },

  // ── ERP / KPI ──────────────────────────────────────────────
  {
    topic: 'erp',
    patterns: ['erp', 'kpi', 'indicateur', 'performance', 'budget tracker'],
    answer: `L'onglet **ERP · KPI** d'un marché affiche :

- **Budget tracker** — Suivi budget consommé vs estimé
- **Timeline** — Événements clés
- **Notes** — Commentaires libres

Cette section est en cours de développement.`
  },

  // ── EXPORT / IMPORT ────────────────────────────────────────
  {
    topic: 'export_general',
    patterns: ['exporter', 'export', 'télécharger', 'pdf', 'xlsx', 'excel', 'imprimer'],
    answer: `Les exports disponibles :

- **Contacts** → Excel (.xlsx) — par CLCC ou annuaire complet
- **Notation** → Excel (.xlsx) — fichier avec notes intégrées
- **Reporting** → PDF (bouton 🖨️)
- **Réponses fournisseurs** → PDF

Tous les fichiers se téléchargent dans votre dossier Téléchargements.`
  },

  // ── RECHERCHE ──────────────────────────────────────────────
  {
    topic: 'recherche',
    patterns: ['recherche', 'chercher', 'filtrer', 'trouver', 'barre de recherche'],
    answer: `Vous pouvez chercher à plusieurs endroits :

- **Tableau de bord** — Recherche par nom ou référence de marché
- **Sidebar** — Recherche rapide dans la liste des marchés
- **Contacts** — Recherche par CLCC, ville ou nom de contact
- **Dans un CLCC** — Recherche par nom, email ou fonction

Tous les filtres fonctionnent en **temps réel**.`
  },

  // ── NAVIGATION ─────────────────────────────────────────────
  {
    topic: 'navigation',
    patterns: ['navigation', 'menu', 'section', 'page', 'aller', 'accéder', 'où se trouve'],
    answer: `La plateforme a **4 sections principales** dans la barre de navigation en haut :

1. **Marchés** — Tableau de bord, tous les marchés par secteur
2. **Formations** — Formations scientifiques
3. **Reporting** — Suivi global (import Excel)
4. **Contacts** — Annuaire des 19 CLCC

La **sidebar gauche** liste les marchés groupés par secteur. Cliquez sur un marché pour ouvrir sa fiche.`
  },

  // ── AIDE / PROBLÈMES ──────────────────────────────────────
  {
    topic: 'probleme',
    patterns: ['problème', 'bug', 'erreur', 'marche pas', 'bloqué', 'page blanche', 'ne fonctionne pas'],
    answer: `En cas de problème :

1. **Ctrl+Shift+R** — Rafraîchissement forcé (résout la plupart des soucis d'affichage)
2. Vérifiez le **format du fichier** — Les imports attendent du .xlsx uniquement
3. **Données disparues ?** — Elles sont dans le cache du navigateur. Changer de navigateur ou vider le cache les supprime.

Si ça persiste, contactez l'équipe technique.`
  },
  {
    topic: 'donnees',
    patterns: ['données', 'sauvegarde', 'stockage', 'perdre', 'cache', 'localStorage'],
    answer: `Les données sont stockées à deux niveaux :

- **Statiques** (marchés, formations, contacts importés) — dans le code, partagées par tous
- **Dynamiques** (notes, modifications, contacts ajoutés) — dans le **localStorage** de votre navigateur

⚠️ Le localStorage est lié à votre navigateur. Si vous changez de navigateur ou videz le cache, les données dynamiques seront perdues.`
  },

  // ── ASTUCES ────────────────────────────────────────────────
  {
    topic: 'astuces',
    patterns: ['astuce', 'conseil', 'raccourci', 'productivité', 'gagner du temps', 'tips'],
    answer: `Astuces pour gagner du temps :

- **Glissez-déposez** vos fichiers Excel sur la zone d'import
- **Clic sur un email** → ouvre Outlook directement
- **Clic sur un téléphone** → lance l'appel via Teams
- **"Envoyer un mail par fonction"** → contacte tous les CLCC d'un coup
- **Filtrez par secteur** pour réduire la liste des marchés
- **Sidebar rétractable** : cliquez la flèche pour gagner de l'espace`
  },

  // ── APPEL TÉLÉPHONIQUE ─────────────────────────────────────
  {
    topic: 'telephone',
    patterns: ['appeler', 'téléphone', 'tel', 'appel', 'teams'],
    answer: `Pour appeler un contact :

Cliquez sur son **numéro de téléphone** dans sa fiche contact → l'appel se lance via Teams ou votre application téléphone par défaut.

Les numéros sont cliquables partout dans l'application (annuaire CLCC et interlocuteurs par marché).`
  },

  // ── SIDEBAR ────────────────────────────────────────────────
  {
    topic: 'sidebar',
    patterns: ['sidebar', 'barre latérale', 'gauche', 'réduire', 'replier', 'ouvrir sidebar'],
    answer: `La **sidebar gauche** affiche les marchés groupés par secteur.

- Cliquez sur un **secteur** pour le déplier/replier
- Cliquez sur un **marché** pour ouvrir sa fiche
- La **barre de recherche** en haut filtre les marchés
- Le **bouton flèche** à droite réduit/agrandit la sidebar
- Le **point coloré** indique le statut du marché`
  },

  // ── C'EST QUOI / PRÉSENTATION ─────────────────────────────
  {
    topic: 'presentation',
    patterns: ['c\'est quoi', 'à quoi sert', 'présentation', 'objectif', 'outil', 'plateforme'],
    answer: `**Gestion des Marchés** est un outil développé par UNICANCER pour les centrales d'achat.

Il permet de :
- **Gérer les appels d'offres** — suivi, analyse, notation des fournisseurs
- **Piloter les marchés** — statut, progression, KPIs
- **Gérer les contacts** — annuaire des 19 CLCC avec 491 interlocuteurs
- **Suivre les formations** — inscriptions, documents, modèle économique
- **Reporting** — tableaux de bord et graphiques depuis vos fichiers Excel

L'outil est destiné aux professionnels de santé : acheteurs, ingénieurs biomédicaux, pharmaciens, DRH.`
  },
];

// ── Normalisation ────────────────────────────────────────────

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mots vides français
const STOP_WORDS = new Set([
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux',
  'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'dont', 'quoi',
  'dans', 'sur', 'sous', 'avec', 'pour', 'par', 'en', 'a', 'est',
  'ne', 'pas', 'plus', 'rien', 'jamais',
  'suis', 'es', 'est', 'sommes', 'etes', 'sont',
  'ai', 'as', 'avons', 'avez', 'ont',
  'faire', 'fait', 'fais', 'peut', 'peux', 'veux', 'veut', 'dois', 'doit',
  'comment', 'pourquoi', 'quand', 'combien',
  'ça', 'ca', 'y', 'si', 'se', 'me', 'te',
  'bien', 'tres', 'aussi', 'encore', 'deja',
  'bonjour', 'salut', 'merci', 'svp', 'stp',
]);

function extractWords(text) {
  return normalize(text).split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

// Radicaux simplifiés (stemming basique français)
function stem(word) {
  if (word.length < 4) return word;
  return word
    .replace(/(ement|ation|ment|eur|euse|eurs|euses|tion|sion|ite|ites)$/, '')
    .replace(/(er|ir|re|ant|ent|ons|ent|ez|ais|ait|aient)$/, '')
    .replace(/(es|s)$/, '');
}

// ── Moteur de recherche ──────────────────────────────────────

export function findAnswer(question, conversationHistory = []) {
  const qWords = extractWords(question);
  const qStems = qWords.map(stem);
  const qNorm = normalize(question);

  if (qWords.length === 0) return null;

  const scores = ENTRIES.map(entry => {
    let score = 0;

    // 1. Pattern matching (poids fort)
    for (const pattern of entry.patterns) {
      const pNorm = normalize(pattern);
      // Exact pattern match in question
      if (qNorm.includes(pNorm)) {
        score += 10;
      }
      // Word-level overlap with patterns
      const pWords = pNorm.split(' ').filter(w => w.length > 1);
      const matchedWords = pWords.filter(pw => qWords.some(qw => qw === pw || stem(qw) === stem(pw)));
      if (matchedWords.length === pWords.length && pWords.length > 0) {
        score += 8; // All pattern words matched
      } else {
        score += matchedWords.length * 3;
      }
    }

    // 2. Topic match (poids moyen)
    const topicWords = entry.topic.split('_').filter(w => w.length > 1);
    for (const tw of topicWords) {
      if (qStems.some(qs => qs === stem(tw) || qs.includes(stem(tw)) || stem(tw).includes(qs))) {
        score += 4;
      }
    }

    // 3. Answer content match (poids faible — fallback)
    const answerNorm = normalize(entry.answer);
    for (const qw of qWords) {
      if (answerNorm.includes(qw)) score += 0.5;
    }

    return { entry, score };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  // Threshold : need at least score 4 to be relevant
  if (!best || best.score < 4) return null;

  // If two entries are very close in score, combine them
  if (second && second.score >= best.score * 0.7 && second.score >= 4) {
    return best.entry.answer + '\n\n---\n\n' + second.entry.answer;
  }

  return best.entry.answer;
}

// ── Réponse de clarification ─────────────────────────────────

export function getClarification(question) {
  const qNorm = normalize(question);
  const words = extractWords(question);

  // Too vague
  if (words.length <= 1) {
    return `Pourriez-vous préciser votre question ? Par exemple :
- "Comment noter les fournisseurs ?"
- "Où trouver les contacts d'un CLCC ?"
- "Comment exporter un fichier Excel ?"`;
  }

  return null;
}
