#!/usr/bin/env node
// Génère une présentation PPTX basée sur le template Unicancer.
// - Réutilise le master/layouts/theme/médias du template (charte préservée)
// - Remplace les 2 slides existants par notre contenu
//
// Lancement : node scripts/generate-dsi-pptx.mjs

import JSZip from 'jszip';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMPLATE_PATH = 'C:/Users/g-gourrion/OneDrive - UNICANCER/Bureau/Points hebdo/template.pptx';
const OUTPUT_PATH   = resolve(__dirname, '..', 'docs', 'ARCHITECTURE_DSI.pptx');

// ── Helpers XML ────────────────────────────────────────────────────────────
const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

// ── Briques de slide ───────────────────────────────────────────────────────

// Couverture (layout 1) — titre central + sous-titre + auteur/département
function slideCover({ title, subtitle, author, department }) {
  return `${XML_HEAD}
<p:sld ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>

<!-- Titre principal -->
<p:sp>
  <p:nvSpPr><p:cNvPr id="10" name="Titre"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="846358" y="2400000"/><a:ext cx="7831218" cy="1400000"/></a:xfrm></p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p><a:r><a:rPr lang="fr-FR" dirty="0"/><a:t>${esc(title)}</a:t></a:r></a:p>
  </p:txBody>
</p:sp>

<!-- Sous-titre orange -->
<p:sp>
  <p:nvSpPr><p:cNvPr id="11" name="Sous-titre"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="body" sz="quarter" idx="13"/></p:nvPr></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="846358" y="3900000"/><a:ext cx="7831218" cy="600000"/></a:xfrm></p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p><a:pPr marL="0" indent="0" algn="ctr"><a:buNone/></a:pPr>
      <a:r><a:rPr lang="fr-FR" sz="2000" b="0" dirty="0"><a:solidFill><a:srgbClr val="EA560D"/></a:solidFill></a:rPr><a:t>${esc(subtitle)}</a:t></a:r></a:p>
  </p:txBody>
</p:sp>

<!-- Auteur -->
<p:sp>
  <p:nvSpPr><p:cNvPr id="12" name="Auteur"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="body" sz="quarter" idx="16"/></p:nvPr></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="3312000" y="6071602"/><a:ext cx="2520000" cy="215444"/></a:xfrm></p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p><a:pPr marL="0" indent="0"><a:buNone/></a:pPr>
      <a:r><a:rPr lang="fr-FR" dirty="0"/><a:t>${esc(department)}</a:t></a:r></a:p>
  </p:txBody>
</p:sp>

</p:spTree><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:cSld></p:sld>`;
}

// Slide intercalaire (layout 2) — gros titre centré sur fond Unicancer
function slideDivider({ title }) {
  return `${XML_HEAD}
<p:sld ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
<p:sp>
  <p:nvSpPr><p:cNvPr id="7" name="Titre"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr>
  <p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p><a:r><a:rPr lang="fr-FR" dirty="0"/><a:t>${esc(title)}</a:t></a:r></a:p>
  </p:txBody>
</p:sp>
</p:spTree><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:cSld></p:sld>`;
}

// Slide contenu (layout 4) — titre + intro (idx=17, orange/gras) + corps puces (idx=18)
// bullets : tableau d'objets { text, level=0 } OU strings
function slideContent({ title, intro, bullets = [] }) {
  const bulletsXml = bullets.map(b => {
    const text  = typeof b === 'string' ? b : b.text;
    const level = typeof b === 'string' ? 0 : (b.level ?? 0);
    return `<a:p><a:pPr lvl="${level}"/><a:r><a:rPr lang="fr-FR" dirty="0"/><a:t>${esc(text)}</a:t></a:r></a:p>`;
  }).join('');

  const introXml = intro
    ? `<a:p><a:r><a:rPr lang="fr-FR" dirty="0"/><a:t>${esc(intro)}</a:t></a:r></a:p>`
    : `<a:p><a:endParaRPr lang="fr-FR" dirty="0"/></a:p>`;

  return `${XML_HEAD}
<p:sld ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>

<!-- Titre -->
<p:sp>
  <p:nvSpPr><p:cNvPr id="3" name="Titre"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
  <p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p><a:r><a:rPr lang="fr-FR" dirty="0"/><a:t>${esc(title)}</a:t></a:r></a:p>
  </p:txBody>
</p:sp>

<!-- Intro (orange, gras) -->
<p:sp>
  <p:nvSpPr><p:cNvPr id="11" name="Intro"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph sz="quarter" idx="17"/></p:nvPr></p:nvSpPr>
  <p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    ${introXml}
  </p:txBody>
</p:sp>

<!-- Corps bullets -->
<p:sp>
  <p:nvSpPr><p:cNvPr id="7" name="Corps"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="body" sz="quarter" idx="18"/></p:nvPr></p:nvSpPr>
  <p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    ${bulletsXml || '<a:p><a:endParaRPr lang="fr-FR" dirty="0"/></a:p>'}
  </p:txBody>
</p:sp>

</p:spTree><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:cSld></p:sld>`;
}

// ── Définition de la présentation ──────────────────────────────────────────
// chaque slide : { layout: 1|2|3|4, xml: string }

const SLIDES = [
  // 1 — Couverture
  {
    layout: 1,
    xml: slideCover({
      title: 'Gestion des Marchés Unicancer',
      subtitle: 'Architecture technique & code — Document DSI',
      author: 'Gaspar GOURRION-JOLY',
      department: 'DAAI · Mai 2026',
    }),
  },

  // 2 — Sommaire
  {
    layout: 4,
    xml: slideContent({
      title: 'Sommaire',
      intro: 'Ce que couvre cette présentation',
      bullets: [
        'Présentation du projet et cas d\'usage',
        'Architecture globale de l\'application',
        'Stack technique — outils utilisés',
        'Structure du code source',
        'Couche de données et état applicatif',
        'Pipelines de traitement de fichiers',
        'Authentification & assistant IA (Copilot)',
        'Déploiement, build et synthèse DSI',
      ],
    }),
  },

  // 3 — Intercalaire : Présentation
  { layout: 2, xml: slideDivider({ title: '1 · Présentation du projet' }) },

  // 4 — Présentation
  {
    layout: 4,
    xml: slideContent({
      title: 'Gestion des Marchés Unicancer',
      intro: 'Une application web métier pour le pilotage des marchés publics',
      bullets: [
        'Cycle couvert : sourcing → ouverture → analyse → notation → attribution → reporting',
        '4 secteurs : Investissements · Pharma · Logistique · R&D',
        '~30 marchés actifs et 491 contacts répartis sur 19 CLCC',
        { text: 'Cas d\'usage principaux :', level: 0 },
        { text: 'Analyse automatisée des offres (PDF / DOCX / XLSX)', level: 1 },
        { text: 'Notation collaborative des candidats', level: 1 },
        { text: 'Reporting d\'exécution (CA, maintenances, renouvellements)', level: 1 },
        { text: 'Annuaire CLCC et gestion des formations', level: 1 },
      ],
    }),
  },

  // 5 — Intercalaire : Architecture
  { layout: 2, xml: slideDivider({ title: '2 · Architecture globale' }) },

  // 6 — Architecture
  {
    layout: 4,
    xml: slideContent({
      title: 'Une SPA 100 % client-side',
      intro: 'Aucun backend, aucune base de données distante',
      bullets: [
        'Application React monobloc, exécutée dans le navigateur de l\'utilisateur',
        { text: '3 sources de données convergentes :', level: 0 },
        { text: 'Données de référence en dur dans le code (marchés, contacts CLCC)', level: 1 },
        { text: 'Fichiers importés par l\'utilisateur (Excel, PDF, Word)', level: 1 },
        { text: 'Persistance navigateur via localStorage (notations, métadonnées)', level: 1 },
        { text: 'Bénéfices :', level: 0 },
        { text: 'Aucune donnée ne quitte le poste — confidentialité maximale', level: 1 },
        { text: 'Déployable sur n\'importe quel hébergement statique', level: 1 },
        { text: 'Pas de serveur à maintenir, pas d\'infrastructure lourde', level: 1 },
      ],
    }),
  },

  // 7 — Intercalaire : Stack
  { layout: 2, xml: slideDivider({ title: '3 · Stack technique' }) },

  // 8 — Stack
  {
    layout: 4,
    xml: slideContent({
      title: 'Technologies utilisées',
      intro: 'Stack moderne basée sur l\'écosystème React',
      bullets: [
        { text: 'Cœur applicatif', level: 0 },
        { text: 'React 18 — framework UI à composants', level: 1 },
        { text: 'Vite 5 — outil de build rapide (dev server + bundler production)', level: 1 },
        { text: 'React Router 6 — navigation interne sans rechargement', level: 1 },
        { text: 'JavaScript ES2022 (pas de TypeScript)', level: 1 },
        { text: 'Traitement de fichiers (dans le navigateur)', level: 0 },
        { text: 'xlsx + xlsx-js-style — lecture / écriture Excel', level: 1 },
        { text: 'jspdf + html2canvas — génération de PDF avec graphiques', level: 1 },
        { text: 'pdfjs-dist — extraction texte des PDF', level: 1 },
        { text: 'mammoth — lecture des fichiers Word (.docx)', level: 1 },
        { text: 'recharts — graphiques (barres, lignes, camemberts)', level: 1 },
        { text: 'Intégrations externes (optionnelles)', level: 0 },
        { text: '@azure/msal-browser — authentification Azure AD (non activée)', level: 1 },
        { text: 'Anthropic API (Claude) — assistant IA Copilot via proxy Node', level: 1 },
      ],
    }),
  },

  // 9 — Intercalaire : Code
  { layout: 2, xml: slideDivider({ title: '4 · Structure du code' }) },

  // 10 — Structure
  {
    layout: 4,
    xml: slideContent({
      title: 'Organisation du code source',
      intro: 'Découpage par domaine métier (et non par couche technique)',
      bullets: [
        { text: 'src/pages/  — 9 pages globales (Accueil, Dashboard, Calendrier…)', level: 0 },
        { text: 'src/features/  — 7 modules métier autonomes', level: 0 },
        { text: 'ao/  → analyse d\'offres (6 onglets)', level: 1 },
        { text: 'notation/  → évaluation des candidats', level: 1 },
        { text: 'reporting/  → suivi d\'exécution + BDD investissements', level: 1 },
        { text: 'sourcing/  · formations/  · contacts/  · erp/', level: 1 },
        { text: 'src/components/  — briques UI partagées (Layout, KpiCard, Modals…)', level: 0 },
        { text: 'src/context/  — 9 états globaux (notation, méta marchés, reporting…)', level: 0 },
        { text: 'src/data/  — données de référence en dur (mockData.js, clccContacts.js)', level: 0 },
        { text: 'src/utils/  — pipelines de traitement et utilitaires', level: 0 },
      ],
    }),
  },

  // 11 — Routing
  {
    layout: 4,
    xml: slideContent({
      title: 'Routing & navigation',
      intro: '20 routes définies, mode « hash » compatible hébergement statique',
      bullets: [
        { text: 'Routes globales (vues transverses)', level: 0 },
        { text: '/marches · /reporting · /formations · /contacts · /calendrier · /fournisseurs', level: 1 },
        { text: 'Routes contextualisées à un marché : /marche/:id/...', level: 0 },
        { text: 'infos · sourcing · templates · analyse · notation · reporting', level: 1 },
        { text: 'reponses · interlocuteurs · contacts-fournisseurs', level: 1 },
        { text: 'Redirection intelligente sur /marche/:id', level: 0 },
        { text: 'choisit automatiquement l\'onglet pertinent (notation ou reporting)', level: 1 },
        { text: 'selon les données disponibles pour ce marché', level: 1 },
        { text: 'Authentification : aucune (Azure AD configuré mais non activé)', level: 0 },
      ],
    }),
  },

  // 12 — Intercalaire : Données
  { layout: 2, xml: slideDivider({ title: '5 · Données & état' }) },

  // 13 — Données
  {
    layout: 4,
    xml: slideContent({
      title: 'Couche de données',
      intro: 'Triple source convergeant vers les composants UI',
      bullets: [
        { text: 'Source 1 — Données de référence (en dur dans le code)', level: 0 },
        { text: 'mockData.js : ~30 marchés (id, statut, dates, lots, budget, tags)', level: 1 },
        { text: 'clccContacts.js : 491 contacts (19 CLCC × 27 fonctions)', level: 1 },
        { text: 'fournisseursContacts.js : annuaire fournisseurs', level: 1 },
        { text: 'Source 2 — Fichiers importés par l\'utilisateur', level: 0 },
        { text: 'Suivi_Invest.xlsx, BPU fournisseurs, offres PDF / DOCX', level: 1 },
        { text: 'Traitement intégralement côté client (zéro upload réseau)', level: 1 },
        { text: 'Source 3 — Persistance localStorage du navigateur', level: 0 },
        { text: 'gm-notation-history, gm-metas, gm-reporting-data, gm-bdd-pending', level: 1 },
        { text: 'Limite : 5-10 Mo par domaine, isolé par utilisateur', level: 1 },
      ],
    }),
  },

  // 14 — Contexts
  {
    layout: 4,
    xml: slideContent({
      title: 'État applicatif — 9 React Contexts',
      intro: 'Pas de Redux ni Zustand : Context API natif de React',
      bullets: [
        { text: 'Approche : un Context = un domaine de données partagées', level: 0 },
        { text: 'Chacun expose ses propres hooks et gère sa persistance localStorage', level: 1 },
        { text: 'Les 9 contexts :', level: 0 },
        { text: 'NotationContext — sessions et historique des notations', level: 1 },
        { text: 'MarcheMetaContext — métadonnées éditées (responsables, tags…)', level: 1 },
        { text: 'ReportingDataContext — dataset Excel parsé en mémoire', level: 1 },
        { text: 'BddPendingContext — queue de lignes BDD à exporter', level: 1 },
        { text: 'NewMarchesContext · NewFormationsContext (drafts)', level: 1 },
        { text: 'FormationsMetaContext · SourcingTemplatesContext', level: 1 },
        { text: 'ShortcutsContext (raccourcis clavier, mémoire seule)', level: 1 },
      ],
    }),
  },

  // 15 — Intercalaire : Pipelines
  { layout: 2, xml: slideDivider({ title: '6 · Pipelines de traitement' }) },

  // 16 — Pipelines
  {
    layout: 4,
    xml: slideContent({
      title: 'Deux pipelines critiques',
      intro: 'Transformation des fichiers utilisateur en données structurées',
      bullets: [
        { text: 'analysePipeline/ — Ingestion des offres AO (12 modules)', level: 0 },
        { text: 'Détection automatique du type de fichier (PDF / DOCX / XLSX)', level: 1 },
        { text: 'Extraction des contacts (emails, téléphones) via regex', level: 1 },
        { text: 'Normalisation des en-têtes (accents, espaces, casse)', level: 1 },
        { text: 'Mapping standardisé des BPU et questionnaires techniques', level: 1 },
        { text: 'Validation finale des allotissements', level: 1 },
        { text: 'bddBuilder/ — Construction de la BDD investissements (8 modules)', level: 0 },
        { text: 'Parsing des reportings fournisseurs hétérogènes', level: 1 },
        { text: 'Matching automatique fournisseur ↔ CLCC (distance Levenshtein)', level: 1 },
        { text: 'Apprentissage des alias utilisateur pour affiner les matchings', level: 1 },
        { text: 'Export final en Suivi_Invest.xlsx (avec graphiques natifs)', level: 1 },
      ],
    }),
  },

  // 17 — Intercalaire : Auth / Copilot
  { layout: 2, xml: slideDivider({ title: '7 · Authentification & Copilot' }) },

  // 18 — Auth & Copilot
  {
    layout: 4,
    xml: slideContent({
      title: 'Sécurité et assistant IA',
      intro: 'Deux briques optionnelles, indépendantes du cœur applicatif',
      bullets: [
        { text: 'Authentification Azure AD (MSAL) — préparée mais non activée', level: 0 },
        { text: 'Librairie @azure/msal-browser configurée dans utils/msalConfig.js', level: 1 },
        { text: 'Scopes prévus : User.Read, Contacts.ReadWrite', level: 1 },
        { text: 'Activation : définir VITE_AZURE_CLIENT_ID et VITE_AZURE_AUTHORITY', level: 1 },
        { text: 'Usage prévu : SSO Unicancer + synchronisation Outlook', level: 1 },
        { text: 'Assistant IA Copilot (widget en bas à droite de l\'app)', level: 0 },
        { text: 'Modèle : Claude (Anthropic), version sonnet-4', level: 1 },
        { text: 'Proxy Node Express local (port 3001) protège la clé API', level: 1 },
        { text: 'Contexte injecté : extraits mockData + clccContacts (~8 Ko)', level: 1 },
        { text: 'Coût : facturation à l\'usage selon tokens consommés', level: 1 },
      ],
    }),
  },

  // 19 — Intercalaire : Déploiement
  { layout: 2, xml: slideDivider({ title: '8 · Synthèse DSI' }) },

  // 20 — Build & déploiement
  {
    layout: 4,
    xml: slideContent({
      title: 'Build & déploiement',
      intro: 'Mise en production simple : un dossier statique',
      bullets: [
        { text: 'Commandes npm', level: 0 },
        { text: 'npm run dev — serveur de développement (localhost:5173)', level: 1 },
        { text: 'npm run build — bundle de production dans dist/', level: 1 },
        { text: 'npm run preview — vérification locale du build', level: 1 },
        { text: 'npm run copilot — proxy IA (uniquement si Copilot activé)', level: 1 },
        { text: 'Cibles d\'hébergement possibles', level: 0 },
        { text: 'GitHub Pages, Azure Static Web Apps, S3 + CloudFront, Netlify…', level: 1 },
        { text: 'Aucun runtime serveur requis (sauf proxy Copilot si activé)', level: 1 },
        { text: 'Mode hash router → pas de configuration 404 nécessaire', level: 1 },
      ],
    }),
  },

  // 21 — Synthèse forces / vigilances
  {
    layout: 4,
    xml: slideContent({
      title: 'Forces et points de vigilance',
      intro: 'Lecture DSI : architecture saine, mais limites structurelles à connaître',
      bullets: [
        { text: 'Forces', level: 0 },
        { text: 'Souveraineté des données : aucune fuite réseau', level: 1 },
        { text: 'Stack moderne et stable (React + Vite, écosystème mainstream)', level: 1 },
        { text: 'Code organisé par feature, facilement extensible', level: 1 },
        { text: 'Déploiement statique trivial, coûts d\'hébergement quasi nuls', level: 1 },
        { text: 'Points de vigilance', level: 0 },
        { text: 'Aucune authentification active aujourd\'hui (à activer avant prod)', level: 1 },
        { text: 'Données mono-utilisateur (localStorage non partagé)', level: 1 },
        { text: 'Quota localStorage limité (5-10 Mo par domaine)', level: 1 },
        { text: 'mockData.js versionné dans le code → redéploiement requis pour MAJ', level: 1 },
      ],
    }),
  },

  // 22 — Pistes d'évolution
  {
    layout: 4,
    xml: slideContent({
      title: 'Pistes d\'évolution recommandées',
      intro: 'Évolutions classées par effort estimé',
      bullets: [
        { text: 'Effort faible (quelques jours)', level: 0 },
        { text: 'Activation MSAL Azure AD → SSO Unicancer + traçabilité', level: 1 },
        { text: 'Externalisation du proxy Copilot (Azure Function ou Cloud Run)', level: 1 },
        { text: 'Effort moyen (2 à 4 semaines)', level: 0 },
        { text: 'Backend léger (Azure Functions + Cosmos DB) pour le partage temps réel', level: 1 },
        { text: 'Migration mockData vers une API REST (MAJ sans redéploiement)', level: 1 },
        { text: 'Couverture de tests automatisés (Vitest + Playwright)', level: 1 },
        { text: 'Effort élevé (1 à 2 mois)', level: 0 },
        { text: 'Migration progressive vers TypeScript pour sécuriser les refactorings', level: 1 },
      ],
    }),
  },

  // 23 — Fin
  {
    layout: 4,
    xml: slideContent({
      title: 'Merci',
      intro: 'Questions, échanges, démonstration',
      bullets: [
        'Gaspar GOURRION-JOLY — DAAI',
        'g-gourrion@unicancer.fr',
        '',
        'Code source : github.com/t-reuze/gestion-marches',
        'Documentation détaillée : docs/ARCHITECTURE_DSI.html',
      ],
    }),
  },
];

// ── Construction du PPTX ───────────────────────────────────────────────────

async function main() {
  console.log('📂 Lecture du template...');
  const templateBuf = await readFile(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(templateBuf);

  // Supprimer les slides existants (et leurs rels + notes)
  console.log('🗑️  Suppression des slides existants...');
  zip.remove('ppt/slides/slide1.xml');
  zip.remove('ppt/slides/slide2.xml');
  zip.remove('ppt/slides/_rels/slide1.xml.rels');
  zip.remove('ppt/slides/_rels/slide2.xml.rels');
  zip.remove('ppt/notesSlides/notesSlide1.xml');
  zip.remove('ppt/notesSlides/_rels/notesSlide1.xml.rels');
  // Garder notesSlides/_rels/ vide est OK

  // Injecter nos nouveaux slides
  console.log(`✏️  Génération de ${SLIDES.length} slides...`);
  SLIDES.forEach((slide, i) => {
    const n = i + 1;
    zip.file(`ppt/slides/slide${n}.xml`, slide.xml);
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout${slide.layout}.xml"/>
</Relationships>`);
  });

  // Mettre à jour presentation.xml — sldIdLst
  console.log('🔗 Mise à jour des références (presentation.xml)...');
  let presXml = await zip.file('ppt/presentation.xml').async('string');
  const sldIdLst = SLIDES.map((_, i) =>
    `<p:sldId id="${256 + i}" r:id="rId${100 + i}"/>`
  ).join('');
  presXml = presXml.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${sldIdLst}</p:sldIdLst>`
  );
  zip.file('ppt/presentation.xml', presXml);

  // Mettre à jour presentation.xml.rels — relations vers les slides
  let presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  // Retirer toutes les anciennes relations vers slides
  presRels = presRels.replace(
    /<Relationship[^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/slide"[^/]*\/>/g,
    ''
  );
  // Ajouter les nouvelles
  const slideRels = SLIDES.map((_, i) =>
    `<Relationship Id="rId${100 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
  ).join('');
  presRels = presRels.replace('</Relationships>', `${slideRels}</Relationships>`);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);

  // Mettre à jour [Content_Types].xml
  let contentTypes = await zip.file('[Content_Types].xml').async('string');
  // Retirer les anciennes overrides slides + notesSlides
  contentTypes = contentTypes.replace(
    /<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^/]*\/>/g,
    ''
  );
  contentTypes = contentTypes.replace(
    /<Override PartName="\/ppt\/notesSlides\/notesSlide\d+\.xml"[^/]*\/>/g,
    ''
  );
  // Ajouter les nouvelles
  const newOverrides = SLIDES.map((_, i) =>
    `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', `${newOverrides}</Types>`);
  zip.file('[Content_Types].xml', contentTypes);

  // Générer le fichier final
  console.log('💾 Écriture du fichier final...');
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  const out = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  await writeFile(OUTPUT_PATH, out);

  console.log(`\n✅ Présentation générée : ${OUTPUT_PATH}`);
  console.log(`   ${SLIDES.length} slides · ${(out.length / 1024).toFixed(0)} Ko`);
}

main().catch(err => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
