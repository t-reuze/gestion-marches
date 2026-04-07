# Travailler avec Claude Code — Gestion Marchés

> Ce guide explique comment utiliser Claude Code efficacement sur ce projet.
> Valable pour toute l'équipe : t-reuze · Tom · Gaspar

---

## C'est quoi Claude Code

Claude Code est un assistant IA directement intégré à VS Code.
Il **lit les fichiers du projet**, comprend le contexte, et peut modifier le code à ta place.

Tu n'as pas besoin de lui expliquer comment le projet est structuré — il le lit lui-même.
Tu n'as pas besoin de copier-coller du code — il l'écrit directement dans les bons fichiers.

---

## Comment y accéder

| Depuis | Comment |
|---|---|
| VS Code | Icône Claude dans la barre latérale gauche |
| Terminal | Ouvre un terminal dans le dossier `gestion-marches` et tape `claude` |
| Navigateur | **claude.ai/code** avec ton compte Anthropic |

---

## Ce que Claude fait quand tu lui donnes une tâche

Exemple : *"Je veux travailler sur le marché Médecine Nucléaire, page Analyse"*

Voilà ce qu'il fait dans l'ordre, sans que tu aies besoin de lui demander :

1. **Il lit les fichiers concernés** — `mockData.js` pour les données du marché, `AnalyseOffres.jsx` pour l'état de la page
2. **Il te donne un état des lieux** — ce qui existe, ce qui manque, ce qui est vide
3. **Il te pose une question si c'est flou** — *"Tu veux travailler sur quoi exactement : les données fournisseurs, les critères, l'import Excel ?"*
4. **Il vérifie ta branche Git** — pour s'assurer que tu travailles au bon endroit
5. **Il fait les modifications directement** dans les bons fichiers
6. **Il te dit quoi commiter** — les commandes exactes à lancer

---

## Comment bien lui parler

### La règle d'or : donne du contexte

| ❌ Vague | ✅ Efficace |
|---|---|
| "Ça marche pas" | "La page Notation est vide pour le marché `acc-lin` — pourquoi ?" |
| "Fais quelque chose de joli" | "Dans `KpiCard.jsx`, rends le titre plus lisible, police plus grande" |
| "Ajoute une fonctionnalité" | "Dans la page Reporting, ajoute un filtre par statut au-dessus du tableau" |
| "Travaille sur médecine nucléaire" | "Je veux remplir les données du marché `med-nuc` dans mockData et activer la page Analyse" |

### Formules qui marchent bien

**Pour démarrer sur un marché :**
> *"Je veux travailler sur le marché [nom], section [analyse / notation / reporting / infos]. Dis-moi ce qui existe et ce qui manque."*

**Pour corriger un bug :**
> *"La page [nom] affiche [description du problème]. Regarde pourquoi et corrige."*

**Pour ajouter quelque chose :**
> *"Dans [fichier ou page], ajoute [description précise de ce que tu veux]."*

**Pour comprendre du code :**
> *"Explique-moi comment fonctionne [fichier ou fonction]."*

**Pour de l'aide Git :**
> *"Je veux créer une branche pour [tâche]. Comment faire ?"*
> *"J'ai un conflit sur ce fichier — aide-moi à le résoudre."*

---

## Exemples concrets sur ce projet

### Travailler sur un marché

```
"Je veux travailler sur le marché Médecine Nucléaire.
Regarde l'état actuel dans mockData et dis-moi ce qui manque
pour que la page Analyse fonctionne."
```

```
"Remplis les données manquantes de med-nuc dans mockData :
responsable = Jean Noël BADEL, nbLots = 3, statut = ouvert"
```

### Corriger un bug

```
"La grille de notation s'affiche vide pour acc-lin.
Regarde pourquoi et corrige."
```

```
"J'ai cette erreur dans la console :
[coller l'erreur ici]
Qu'est-ce que ça veut dire et comment corriger ?"
```

### Ajouter une fonctionnalité

```
"Dans la page Notation, ajoute un bouton Exporter
qui télécharge la grille au format Excel."
```

```
"Dans le Dashboard, ajoute une colonne Progression
avec une barre de progression visuelle."
```

### Comprendre le code

```
"Explique-moi comment AnalyseOffres.jsx lit les fichiers Excel."
```

```
"C'est quoi le rôle de NotationContext.jsx et pourquoi
il est séparé de la page Notation ?"
```

---

## Ce que Claude ne fait PAS (sauf si tu lui demandes)

- Il ne touche pas à `main` directement — il respecte le workflow des branches
- Il ne modifie pas des fichiers hors de ton périmètre de travail
- Il ne suppose pas ce que tu veux si c'est ambigu — il te pose la question
- Il ne commit pas à ta place — tu restes maître de ce qui part sur GitHub

---

## Bonnes pratiques

**Travaille toujours sur ta branche avant de demander des modifications.**
Vérifie avec `git branch` que tu es au bon endroit. Claude peut le vérifier pour toi si tu lui demandes.

**Une tâche à la fois.**
*"Corrige ce bug et refais tout le design"* = trop large. Découpe en deux demandes.

**Relis avant d'accepter.**
Claude peut se tromper sur la logique métier spécifique à Unicancer. Il ne connaît pas les règles métier — toi oui.

**Commite après chaque modification.**
Si une modification de Claude casse quelque chose, `git restore .` annule tout proprement.

**Tu peux lui demander d'expliquer.**
*"Pourquoi tu fais ça comme ça ?"* est une question valide. Il justifie chaque choix.

---

## Les fichiers partagés — prévenir avant de modifier

Ces fichiers sont utilisés par tout le monde. Avant de demander à Claude de les modifier, **annonce-le sur Teams**.

| Fichier | Pourquoi c'est sensible |
|---|---|
| `src/data/mockData.js` | Contient les données de tous les marchés |
| `src/components/Layout.jsx` | Touche toutes les pages |
| `src/App.jsx` | Définit toutes les routes de l'application |

---

## En résumé

> Dis à Claude **ce que tu veux faire** et **sur quel marché / quelle page**.
> Il fait le reste : lire, analyser, modifier, et t'indiquer quoi commiter.
> Tu restes décideur — lui exécute.
