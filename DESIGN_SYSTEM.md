# Unicancer SaaS — Design System v1.0
> Systeme de design pour la gestion des marches et formations
> Inspire de la charte visuelle unicancer.fr · Healthcare-grade · WCAG AA

---

## Table des matieres

1. Philosophie
2. Palette de couleurs
3. Typographie
4. Espacement et grille
5. Tokens CSS
6. Composants
7. Architecture UX
8. Patterns par page
9. Etats speciaux
10. Accessibilite
11. Annexes

---

## 1. Philosophie

### 1.1 Valeurs de design

| Valeur | Traduction UI |
|---|---|
| **Institutionnel** | Typographie serieuse, densite maitrisee, pas de gadgets visuels |
| **Confiance** | Hierarchie claire, couleurs stables, coherence absolue entre ecrans |
| **Minimalisme** | White space genereux, une action primaire par ecran, zero decoration inutile |
| **Lisibilite** | Contraste WCAG AA minimum, corps >= 13px, interligne >= 1.5 |
| **Modernite calme** | Ombres legeres, border-radius modere, animations < 250ms |

### 1.2 References de design

- **Unicancer.fr** : palette bleue institutionnelle, sections blanches structurees, typographie sobre
- **Linear** : densite maitrisee, sidebar sombre, transitions rapides (< 200ms)
- **Stripe Dashboard** : tableaux lisibles, KPI cards propres, etats de donnees explicites
- **Polaris (Shopify)** : accessibilite, coherence composant, documentation exhaustive

### 1.3 Anti-patterns a eviter

- Pas de gradients multi-couleurs
- Pas d'animations de plus de 300ms
- Pas de plus de 3 niveaux de gris sur un meme ecran
- Pas de bouton ghost comme CTA primaire
- Pas d'icones seules sans label dans la navigation principale

---

## 2. Palette de couleurs

### 2.1 Bleu institutionnel — couleur dominante

```
--uc-blue-900   #001E45   Sidebar, headers critiques
--uc-blue-800   #002E6B   Titres de section forts
--uc-blue-700   #003B8E   Liens, etats actifs, icones action
--uc-blue-600   #1554B5   Bouton primaire
--uc-blue-500   #2563EB   Badges informatifs, highlights
--uc-blue-400   #60A5FA   Accents doux sur fond blanc
--uc-blue-100   #DBEAFE   Chips, hover subtil
--uc-blue-50    #EFF6FF   Surface de card selectionnee
```

### 2.2 Orange Unicancer — accent secondaire (jamais dominant)

```
--uc-orange-600  #C84910   Hover bouton orange
--uc-orange-500  #E8501A   Etat actif sidebar, badge urgence
--uc-orange-400  #F07040   Icone alerte, indicateur
--uc-orange-100  #FFF0E8   Background etat actif
--uc-orange-50   #FFF7F3   Hover doux sur fond blanc
```

### 2.3 Surfaces

```
--bg-app        #F4F6FB   Fond de page (legerement bleute)
--bg-card       #FFFFFF   Cards et panels
--bg-surface    #F8FAFD   Rows alternees, zones secondaires
--bg-subtle     #EEF2F8   Sections de formulaire, headers de card
```

### 2.4 Texte

```
--text-primary   #0A1628   Corps principal (quasi-noir bleute)
--text-secondary #2D4066   Sous-titres, meta-donnees importantes
--text-tertiary  #5B7199   Labels, descriptions, support
--text-muted     #8FA3C0   Placeholders, texte desactive
--text-inverse   #FFFFFF   Sur fond sombre
```

### 2.5 Couleurs semantiques

```
Succes    bg #ECFDF5  text #065F46  border #A7F3D0  accent #10B981
Attention bg #FFFBEB  text #78350F  border #FDE68A  accent #F59E0B
Erreur    bg #FEF2F2  text #7F1D1D  border #FECACA  accent #EF4444
Info      bg #EFF6FF  text #1E3A5F  border #BFDBFE  accent #3B82F6
```

### 2.6 Contrastes WCAG AA

| Combinaison | Ratio | Niveau |
|---|---|---|
| text-primary sur bg-app | 14.5:1 | AAA |
| text-secondary sur bg-card | 8.2:1 | AAA |
| text-tertiary sur bg-card | 4.8:1 | AA |
| text-inverse sur blue-700 | 6.1:1 | AA |
| text-inverse sur orange-500 | 3.5:1 | AA (large text) |

---

## 3. Typographie

### 3.1 Polices

```
Primaire : Inter
  Sans-serif institutionnel, optimise pour les interfaces numeriques
  Fallback : system-ui, -apple-system, Segoe UI, sans-serif

Mono : JetBrains Mono
  Pour chiffres, codes, montants, references de marche
  Fallback : SFMono-Regular, Consolas, monospace
```

> Pourquoi Inter ? Concue pour les interfaces a petite taille.
> Lisibilite superieure sur les tableaux denses (12-13px).
> Utilisee par Linear, Notion, Vercel, GitHub.

### 3.2 Echelle typographique

```
TOKEN              SIZE   WEIGHT  LINE-H  TRACKING   USAGE
--------------------------------------------------------------
--type-display     28px   900     1.2     -0.03em    KPI numbers, hero
--type-h1          22px   800     1.25    -0.02em    Titre de page
--type-h2          17px   700     1.3     -0.015em   Titre de section
--type-h3          14px   700     1.4     -0.01em    Titre de card
--type-body-lg     14px   400     1.65    0          Corps large
--type-body        13px   400     1.60    0          Corps standard (tables)
--type-body-sm     12px   400     1.55    0          Meta, timestamps
--type-label       11px   700     1.4     +0.06em    Labels de champs (UPPERCASE)
--type-overline    10px   800     1.3     +0.10em    Section headers (UPPERCASE)
--type-caption     10px   400     1.45    0          Notes de bas de page
--type-mono        13px   500     1.5     0          Chiffres, montants
```

### 3.3 Regles

- **Uppercase uniquement** pour les labels de champs (<=11px) et les overlines
- **Jamais uppercase** sur les titres de page ou les corps de texte
- **Poids 900** reserve aux KPI numbers et titres de dashboard
- **Mono obligatoire** pour montants, scores, references de marche, dates en tableau
- **Interligne 1.6 minimum** pour tout texte de plus d'une ligne

---

## 4. Espacement et grille

### 4.1 Echelle d'espacement (base 4px)

```
--space-1    4px    Micro-gaps (icon + label)
--space-2    8px    Gap interne composant
--space-3    12px   Padding compact (nav items, chips)
--space-4    16px   Padding standard (card body, table cells)
--space-5    20px   Padding confortable (card header)
--space-6    24px   Section gap, padding de page
--space-8    32px   Gap entre sections majeures
--space-10   40px   Grands espaces visuels
--space-12   48px   Empty states, hero zones
--space-16   64px   Padding de page sur grands ecrans
```

### 4.2 Layout principal

```
+----------------------------------------------------------+
|  SIDEBAR 256px (fixe)  |  MAIN AREA (flex: 1)           |
|                        |  +------------------------+    |
|  Logo zone             |  |  TOPBAR 58px (sticky)  |    |
|  Navigation sections   |  +------------------------+    |
|                        |  +------------------------+    |
|  Marches list          |  |  CONTENT (overflow-y)  |    |
|  (scrollable)          |  |  padding: 26px 28px    |    |
|                        |  |  max-width: 1400px     |    |
+----------------------------------------------------------+
```

### 4.3 Grilles de contenu

```css
/* Dashboard KPIs */
grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
gap: 16px;

/* Cards marches */
grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
gap: 18px;

/* Formulaire */
grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
gap: 16px;

/* Charts dashboard */
grid-template-columns: 2fr 1fr;
gap: 20px;
```

### 4.4 Breakpoints

```
--bp-sm   640px    Mobile (sidebar collapsee)
--bp-md   768px    Tablette (sidebar en overlay)
--bp-lg   1024px   Desktop standard
--bp-xl   1280px   Desktop large
--bp-2xl  1536px   Grand ecran (max-width actif)
```

---

## 5. Tokens CSS complets

```css
:root {
  /* BRAND */
  --color-primary:          #1554B5;
  --color-primary-hover:    #003B8E;
  --color-primary-active:   #002E6B;
  --color-primary-soft:     #EFF6FF;
  --color-primary-border:   #BFDBFE;
  --color-accent:           #E8501A;
  --color-accent-hover:     #C84910;
  --color-accent-soft:      #FFF0E8;

  /* SURFACES */
  --color-background:       #F4F6FB;
  --color-surface:          #FFFFFF;
  --color-surface-subtle:   #F8FAFD;
  --color-surface-overlay:  rgba(0, 30, 69, 0.50);

  /* TEXTE */
  --color-text-primary:     #0A1628;
  --color-text-secondary:   #2D4066;
  --color-text-tertiary:    #5B7199;
  --color-text-muted:       #8FA3C0;
  --color-text-inverse:     #FFFFFF;
  --color-text-link:        #1554B5;

  /* BORDURES */
  --color-border:           #D4DCF0;
  --color-border-subtle:    #E8EDF8;
  --color-border-strong:    #B0BDD8;
  --color-border-focus:     #1554B5;

  /* SIDEBAR */
  --color-sidebar-bg:       #001E45;
  --color-sidebar-border:   rgba(255,255,255,0.07);
  --color-sidebar-text:     rgba(255,255,255,0.55);
  --color-sidebar-active:   rgba(21,84,181,0.25);

  /* SEMANTIQUE */
  --color-success:          #10B981;
  --color-success-text:     #065F46;
  --color-success-bg:       #ECFDF5;
  --color-success-border:   #A7F3D0;
  --color-warning:          #F59E0B;
  --color-warning-text:     #78350F;
  --color-warning-bg:       #FFFBEB;
  --color-warning-border:   #FDE68A;
  --color-error:            #EF4444;
  --color-error-text:       #7F1D1D;
  --color-error-bg:         #FEF2F2;
  --color-error-border:     #FECACA;
  --color-info:             #3B82F6;
  --color-info-text:        #1E3A5F;
  --color-info-bg:          #EFF6FF;
  --color-info-border:      #BFDBFE;

  /* TYPOGRAPHIE */
  --font-sans:      'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:      'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  --text-xs: 10px; --text-sm: 12px; --text-base: 13px;
  --text-md: 14px; --text-lg: 17px; --text-xl: 22px; --text-2xl: 28px;
  --font-regular: 400; --font-medium: 500; --font-semibold: 600;
  --font-bold: 700; --font-extrabold: 800; --font-black: 900;

  /* ESPACEMENT */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 20px;  --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px;

  /* BORDER RADIUS */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --radius-xl: 16px; --radius-full: 9999px;

  /* OMBRES */
  --shadow-xs: 0 1px 2px rgba(10,22,40,.05);
  --shadow-sm: 0 1px 3px rgba(10,22,40,.08), 0 1px 2px rgba(10,22,40,.04);
  --shadow-md: 0 4px 12px rgba(10,22,40,.10), 0 2px 4px rgba(10,22,40,.05);
  --shadow-lg: 0 8px 24px rgba(10,22,40,.12), 0 4px 8px rgba(10,22,40,.06);
  --shadow-xl: 0 16px 48px rgba(10,22,40,.16), 0 8px 16px rgba(10,22,40,.08);

  /* TRANSITIONS */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 100ms; --duration-base: 150ms; --duration-slow: 250ms;

  /* Z-INDEX */
  --z-dropdown: 100; --z-sticky: 200; --z-overlay: 300;
  --z-modal: 400; --z-toast: 500;
}
```

---

## 6. Composants

### 6.1 Boutons

**Hierarchie**

```
Primary   : Action principale de la page (1 seul par vue)
Secondary : Actions secondaires importantes
Outline   : Actions tertiaires, Annuler
Ghost     : Actions inline dans les tables
Danger    : Suppression et actions destructives
Accent    : CTA identitaire orange (rare)
```

| Variant | Background | Border | Text | Usage |
|---|---|---|---|---|
| primary | --color-primary | meme | white | Sauvegarder, Creer |
| secondary | --color-primary-soft | --primary-border | --color-primary | Exporter, Filtrer |
| outline | white | --color-border | --text-secondary | Annuler, Retour |
| ghost | transparent | none | --text-tertiary | Inline dans tables |
| danger | --error-bg | --error-border | --error-text | Supprimer |
| accent | --color-accent | meme | white | CTA identitaire orange |

| Taille | Height | Padding H | Font | Radius |
|---|---|---|---|---|
| lg | 42px | 20px | 14px / 600 | --radius-md |
| md (defaut) | 36px | 16px | 13px / 600 | --radius-md |
| sm | 30px | 12px | 12px / 600 | --radius-sm |
| xs | 24px | 8px | 11px / 700 | --radius-sm |

**Regles**
- font-weight 600 minimum, jamais 400
- Jamais width: 100% sauf formulaire mobile
- Icone toujours avant le label
- :disabled -> opacity: 0.45, cursor: not-allowed
- :loading -> spinner 16px inline, clic desactive

### 6.2 Formulaires

```
INPUT
  height: 38px
  border: 1.5px solid var(--color-border)
  border-radius: var(--radius-md)
  padding: 0 12px
  font: 13px / Regular

  :hover    -> border-color: var(--color-border-strong)
  :focus    -> border-color: var(--color-border-focus)
              box-shadow: 0 0 0 3px rgba(21,84,181,0.12)
  :disabled -> background: var(--color-surface-subtle), opacity: 0.65
  :error    -> border-color: var(--color-error)
              box-shadow: 0 0 0 3px rgba(239,68,68,0.12)

LABEL
  font: 10px / 700 / uppercase / +0.07em
  color: var(--color-text-tertiary)
  margin-bottom: 5px

STRUCTURE
  [Label UPPERCASE]
  [Input / Select / Textarea]
  [Message aide ou erreur en 11px]
```

### 6.3 Tables

```
CONTAINER
  border-radius: var(--radius-lg)
  border: 1px solid var(--color-border)
  box-shadow: var(--shadow-sm)

HEADER (thead)
  background: #001E45
  color: rgba(255,255,255,0.75)
  font: 10px / 800 / uppercase / +0.10em
  height: 40px

ROW (tbody tr)
  height: 44px
  border-bottom: 1px solid var(--color-border-subtle)
  :hover -> background: var(--color-surface-subtle), 100ms

CELL (td)
  font: 13px / Regular / padding: 0 16px
  .cell-mono   -> font-family: mono, weight 600
  .cell-muted  -> color: --text-muted
  .cell-action -> text-align: right, white-space: nowrap
```

| Colonne | Alignement | Rendu |
|---|---|---|
| Reference | Gauche | Mono orange, uppercase |
| Nom | Gauche | 13px bold |
| Statut | Gauche | Badge pill colore |
| Responsable | Gauche | Initiales + nom |
| Echeance | Centre | Mono, rouge si < 30j |
| Score | Droite | Chip colore mono |
| Actions | Droite | Boutons ghost |

### 6.4 Cards

```
SURFACE CARD (standard)
  background: var(--color-surface)
  border-radius: var(--radius-lg)
  border: 1px solid var(--color-border)
  box-shadow: var(--shadow-sm)
  .card-header -> padding: 16px 20px; border-bottom
  .card-body   -> padding: 20px
  .card-footer -> padding: 12px 20px; border-top

KPI CARD
  Accent bar top: 3px solid var(--kpi-color)
  Nombre: 28px / black / mono
  Label: 10px / 800 / uppercase
  :hover -> box-shadow: var(--shadow-md); translateY(-2px)

CARD INTERACTIVE
  cursor: pointer
  :hover -> box-shadow: var(--shadow-md); translateY(-2px); border-top colore
  transition: 180ms var(--ease-default)
```

### 6.5 Badges statuts

```
Anatomie : [dot 5px] [texte 10px/700]
Padding  : 3px 10px
Radius   : var(--radius-full)
```

| Statut | Background | Texte |
|---|---|---|
| En cours | --success-bg | --success-text |
| Termine | --color-border-subtle | --text-tertiary |
| En attente | --warning-bg | --warning-text |
| Critique | --error-bg | --error-text |
| Nouveau | --primary-soft | --primary-active |
| Annule | #F1F5F9 | #475569 |

### 6.6 Sidebar

```
width: 256px
background: #001E45

LOGO ZONE
  padding: 24px 20px 18px
  border-bottom: 1px solid rgba(255,255,255,0.07)

SECTION LABEL
  font: 9px / 800 / uppercase / +0.12em
  color: rgba(255,255,255,0.25)

NAV ITEM
  height: 36px / padding: 0 16px / margin: 1px 8px
  border-radius: var(--radius-sm)
  font: 12.5px / 500
  color: rgba(255,255,255,0.55)

  :hover  -> bg rgba(255,255,255,0.06), color rgba(255,255,255,0.85)
  .active -> bg rgba(21,84,181,0.25), color #FFF, weight 600
             border-left: 3px solid var(--color-accent)
             padding-left: 13px
```

> Regle d'or : le seul orange dans la sidebar est la bordure gauche de
> l'item actif. Tout le reste est en bleu ou blanc.

### 6.7 Topbar

```
height: 58px
background: var(--color-surface)
border-bottom: 1px solid var(--color-border)
box-shadow: var(--shadow-xs)
padding: 0 28px

CONTENU (gauche -> droite)
  [Breadcrumb / Titre]  [spacer flex:1]  [Actions]  [Avatar]

Titre      : 16px / 800 / -0.02em
Breadcrumb : 12px / 500, separateur '/' gap 8px, --text-tertiary
```

### 6.8 Modals

```
Overlay : rgba(0,30,69,0.50) + backdrop-filter: blur(2px)
Modal   : bg white, border-radius: var(--radius-xl)
          box-shadow: var(--shadow-xl)
          width: 560px (md) / 720px (lg)
          max-height: 80vh

.modal-header -> padding: 20px 24px; border-bottom
  Titre: 16px / 700, bouton fermeture ghost top-right
.modal-body   -> padding: 24px; overflow-y: auto
.modal-footer -> padding: 16px 24px; border-top
  [Annuler (outline)] ............. [Action (primary)]

Apparition  : opacity 0->1 + translateY(8px->0), 200ms ease-out
Disparition : opacity 1->0 + scale(0.98), 150ms ease-in
```

### 6.9 Toasts

```
Position : fixed bottom-right, gap 8px
Width    : 360px max
padding  : 14px 16px
border-radius: var(--radius-lg)

Types (border-left 4px) :
  success -> var(--color-success)
  warning -> var(--color-warning)
  error   -> var(--color-error)
  info    -> var(--color-info)

Auto-dismiss : 4s (succes), 6s (info), jamais (erreur, warning)
Animation    : slide-in depuis la droite, 200ms
```

### 6.10 Onglets (Tabs)

```
UNDERLINE (pages principales)
  border-bottom: 2px solid transparent
  padding: 10px 18px / font: 13px / 600
  .active -> color: --color-primary; border-color: --color-primary

PILLS (filtres embarques)
  background: transparent -> --primary-soft si actif
  border-radius: var(--radius-md)
  border: 1px solid transparent -> --primary-border si actif
  padding: 5px 14px / font: 12px / 600
```

---

## 7. Architecture UX

### 7.1 Pattern Application Shell

```
Trois zones stables, jamais melangees :

1. SIDEBAR (256px, fixe)
   Navigation principale uniquement.
   Jamais de donnees ici.

2. TOPBAR (58px, sticky)
   Contexte de la page courante (breadcrumb).
   Actions principales de la vue.

3. CONTENT (flex:1, overflow-y: auto)
   Zone de travail. Padding 26px 28px. Max-width 1400px.
```

### 7.2 Hierarchie de navigation

```
Niveau 1  Sidebar      -> Dashboard, Marches, Formations, Reporting
Niveau 2  Sous-items   -> Marches individuels (sidebar scrollable)
Niveau 3  Tabs de page -> Notation / Reponses / Informations / Documents
Niveau 4  Sous-tabs    -> Uniquement si absolument necessaire

Regle : 2 clics maximum pour atteindre n'importe quelle donnee.
```

### 7.3 Dashboard

```
Row 1 : KPI strip (4-5 chiffres, full width)
  Marches actifs / Score moyen / Prochaines echeances / Formations

Row 2 : Zone principale (2/3) + Zone laterale (1/3)
  Principale : table condensee des marches recents
  Laterale   : timeline evenements, alertes critiques

Row 3 (optionnel) : Charts

Regles :
  KPIs = premier regard -> les rendre evidents
  Max 6 KPIs sans scroll
  Chaque KPI a un delta (variation vs periode precedente)
  Table principale scannable en 3 secondes
```

### 7.4 Pages de formulaire

```
[Card 'Informations generales']
  Champs en grille 2-3 colonnes
  Champs larges (description, notes) : full-width

[Card 'Parametres avances'] - collapsible si > 4 champs

[Sticky footer]
  [Annuler (outline)] ......... [Sauvegarder (primary)]

Regles :
  Jamais de formulaire en modal si > 5 champs
  Grouper par theme, pas alphabetiquement
  Validation inline en temps reel
```

### 7.5 Pages de donnees (tables)

```
[Page header] : Titre + compteur '[X] resultats'

[Barre de filtres]
  [Recherche] [Statut] [Date]    [Export] [+ Creer]

[Filtres actifs]
  Badges pills 'Statut: En cours x' - effacables
  Lien 'Effacer les filtres' si filtres actifs

[Table]
  Pagination : 25 / 50 / 100 par page
  Colonne actions sticky a droite
```

---

## 8. Patterns par page

### 8.1 Dashboard

```
REQUIS
  KPI cards avec delta (haut/bas)
  Table marches recents (5-8 lignes)
  Timeline prochaines echeances
  Bandeau alerte si evenement critique

ANTI-PATTERNS
  Graphiques sans valeur reelle
  Messages de bienvenue generiques
  Tooltips qui masquent les donnees
```

### 8.2 Page de notation

```
FLUX
  1. Selectionner le prestataire (vendor tabs)
  2. Naviguer les questions (progress dots)
  3. Lire la reponse -> noter (slider / etoiles)
  4. Commentaire optionnel
  5. Skip si non applicable
  6. Resume final

COMPOSANTS CLES
  Vendor tabs   : mini-card avec score courant
  Question card : header sombre (contexte) + body blanc (notation)
  Progress dots : 1-N colores par etat (note / skippe / vide)
  Score chip    : mono, rouge < 5, vert > 7
```

### 8.3 Fiche marche (detail)

```
CARDS SEPAREES
  1. Identite    : nom, reference, type, statut, tags
  2. Calendrier  : dates cles, duree, alertes
  3. Intervenants: responsable, contact, partenaires
  4. Description : texte libre
  5. Notes       : zone privee non exportable

ACTION PRINCIPALE : Sauvegarder, sticky en bas de page
```

### 8.4 Fiche formation (detail)

```
TABS
  Informations : statut, notes, meta, responsable pedagogique
  Inscriptions : table participants + ajout inline
  Documents    : drag & drop + liste avec preview
  Modele eco.  : calculateur de couts temps reel

REGLE : chaque tab est auto-suffisant.
```

---

## 9. Etats speciaux

### 9.1 Empty states

```
[Icone ou illustration - 48px, couleur --text-muted]
[Titre clair : 'Aucun marche' ou 'Commencez ici']
[Description 2-3 lignes, --text-tertiary]
[CTA primary]

REGLES
  Expliquer POURQUOI c'est vide
  Proposer une action concrete et immediate
  Fond var(--color-background), pas blanc
  Ne jamais afficher pendant un chargement
```

### 9.2 Loading states

```
SKELETON LOADER (pages et listes)
  Blocs gris animes reproduisant la shape du contenu
  Animation : shimmer gauche -> droite, 1.5s infinite

SPINNER (actions courtes)
  Taille  : 16px inline, 32px page-level
  Couleur : var(--color-primary)

REGLES
  Minimum 300ms d'affichage pour eviter le flash
  Si > 2s : message 'Chargement des donnees...'
  Desactiver les interactions pendant le chargement
```

### 9.3 Etats d'erreur

```
ERREUR DE PAGE
  Card centree, icone warning, message humain, bouton Reessayer
  Jamais de stack trace visible

ERREUR DE CHAMP
  Message inline sous le champ (12px, --error-text)
  Recapitulatif en haut si > 3 erreurs
  Focus auto sur le premier champ en erreur

ERREUR RESEAU
  Toast persistant + retry automatique
```

---

## 10. Accessibilite

### 10.1 Contrastes WCAG AA

| Element | Ratio minimum |
|---|---|
| Texte corps (< 18px) | 4.5:1 |
| Texte large (>= 18px ou 14px bold) | 3:1 |
| Composants UI interactifs | 3:1 |
| Focus outline | 3:1 |

> Regle : ne jamais transmettre une information uniquement par la couleur.
> Toujours doubler avec une icone ou un texte.

### 10.2 Navigation clavier

```
Tab order  : logique, suit le flux visuel (LTR, top -> bottom)
Focus      : outline 2px solid var(--color-border-focus), offset 2px
Modal      : focus trap imperatif
Dropdown   : fleches haut/bas pour naviguer, Enter=selectionner, Escape=fermer
```

### 10.3 Attributs ARIA essentiels

```html
<!-- Navigation -->
<nav aria-label="Navigation principale">
<a aria-current="page">Dashboard</a>

<!-- Statuts live -->
<span role="status" aria-live="polite">Sauvegarde en cours...</span>

<!-- Tables -->
<table aria-label="Liste des marches">
<th scope="col">Reference</th>

<!-- Formulaires -->
<label for="nom">Nom du marche</label>
<input id="nom" aria-required="true" aria-describedby="nom-aide" />
<p id="nom-aide" role="note">255 caracteres maximum</p>

<!-- Modals -->
<dialog role="dialog" aria-modal="true" aria-labelledby="modal-title">
```

### 10.4 Tailles minimales

- Cible tactile : 44x44px minimum
- Corps de texte : jamais en dessous de 11px
- Gap entre elements cliquables : 8px minimum

---

## 11. Annexes

### 11.1 Decisions architecturales

| Decision | Choix retenu | Justification |
|---|---|---|
| Police principale | Inter | Lisibilite superieure a 12-13px, standard B2B SaaS |
| Fond de page | #F4F6FB (bleute) | Coherent avec la palette bleue institutionnelle |
| Sidebar | #001E45 (bleu Unicancer) | Ancrage institutionnel, credibilite healthcare |
| Bouton primaire | Bleu #1554B5 | Standard institutionnel (orange = accent identitaire) |
| Accent orange | Etat actif + badges urgents uniquement | Signature Unicancer = rarete = impact |
| Table header | Bleu marine #001E45 | Scannabilite immediate, coherence sidebar |
| Border-radius | 12px cards, 8px boutons | Moderne sans etre startup |
| Ombres | Legeres 5-12% opacity | Hierarchie subtile, pas de profondeur excessive |
| Typographie mono | JetBrains Mono | Tabular numbers, meilleur alignement des chiffres |

### 11.2 Checklist d'implementation

**Priorite 1 - Fondations**
- [ ] Installer Inter + JetBrains Mono (Google Fonts)
- [ ] Implementer tous les CSS tokens dans :root
- [ ] Migrer le fond de page vers #F4F6FB
- [ ] Migrer la sidebar vers #001E45

**Priorite 2 - Composants critiques**
- [ ] Boutons : nouvelle hierarchie (primary bleu, accent orange separe)
- [ ] Tables : header marine, rows 44px height
- [ ] Badges statut : systeme semantique complet
- [ ] Inputs : focus ring bleu, label uppercase 10px

**Priorite 3 - Pages**
- [ ] Dashboard avec KPI strip + delta
- [ ] Page marches avec filtres actifs visibles
- [ ] Fiche marche avec cards sectionees
- [ ] Empty states illustres

**Priorite 4 - Accessibilite**
- [ ] Audit WCAG AA sur tous les ecrans
- [ ] Focus visible sur tous les elements interactifs
- [ ] Attributs ARIA sur tables, modals, navigation

---

*Design System v1.0 - Unicancer Gestion des Marches - Mars 2025*
