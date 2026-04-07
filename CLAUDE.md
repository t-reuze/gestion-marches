# CLAUDE.md — Gestion Marchés

Instructions pour Claude Code sur ce projet.

## Projet

Application React + Vite de gestion des marchés publics — Unicancer.
Équipe : t-reuze (lead), Tom MEURET, Gaspar.
Repo : https://github.com/t-reuze/gestion-marches

## Stack

- React 18 + Vite
- React Router v6
- Recharts / Chart.js pour les graphiques
- XLSX pour l'import/export Excel
- Pas de backend — données dans `src/data/mockData.js`

## Structure clé

- `src/data/mockData.js` — toutes les données marchés (fichier critique, partagé)
- `src/pages/` — une page par section (AnalyseOffres, Notation, Reporting, Formations…)
- `src/context/` — contextes React (MarcheMetaContext, NotationContext, FormationsMetaContext)
- `src/components/` — composants partagés (Layout, MarcheNavTabs, EmptyState…)

## Règles Git — à respecter impérativement

- **Ne jamais pousser directement sur `main`** — toujours passer par une branche + Pull Request
- Nommage des branches : `feature/`, `fix/`, `ui/`, `chore/`
- Au moins 1 approbation requise avant de merger
- Voir [COLLABORATION_GUIDE.md](COLLABORATION_GUIDE.md) pour le workflow complet

## Fichiers partagés — règle du freeze

Avant de modifier ces fichiers, vérifier que personne d'autre ne travaille dessus :

| Fichier | Risque |
|---|---|
| `src/data/mockData.js` | Très élevé — tout en dépend |
| `src/components/Layout.jsx` | Élevé — toutes les pages |
| `src/App.jsx` | Faible — seulement si nouvelle route |

## Guides disponibles dans ce repo

- [COLLABORATION_GUIDE.md](COLLABORATION_GUIDE.md) — workflow Git complet pour l'équipe
- [GUIDE_DEBUTANT.md](GUIDE_DEBUTANT.md) — guide Git pas-à-pas pour Tom et Gaspar
- [GUIDE_CLAUDE_CODE.md](GUIDE_CLAUDE_CODE.md) — comment utiliser Claude Code sur ce projet

## Comportement attendu de Claude

- Lire `mockData.js` et la page concernée avant toute modification
- Vérifier la branche Git active avant de modifier des fichiers
- Ne pas modifier les fichiers partagés sans signaler le risque de conflit
- Ne pas commiter à la place de l'utilisateur — indiquer les commandes à lancer
- Poser une question si la demande est ambiguë plutôt que de supposer
