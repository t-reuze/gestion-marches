# Guide de collaboration Git — Gestion Marchés

> Pour l'équipe : t-reuze · Tom MEURET · Gaspar

---

## Branches actives du projet

| Branche | Qui | Quoi |
|---|---|---|
| `main` | — | Version stable. **On ne touche jamais directement.** |
| `chore/data-layer` | t-reuze | Données des marchés (`mockData.js`) + contextes |
| `feature/analyse-offres` | t-reuze | Page analyse (Excel, QT, BPU, RSE…) |
| `feature/notation` | Tom ou Gaspar | Grille de notation des offres |
| `feature/reporting` | Tom ou Gaspar | Dashboard + Reporting + graphiques |

> Pour rejoindre une branche existante : `git checkout feature/notation` puis `git pull`

---

## Fichiers partagés — règle du "freeze"

Ces fichiers sont utilisés par tout le monde. **Une seule personne à la fois peut les modifier.**
Avant d'y toucher, annoncez-le sur Teams/Slack.

| Fichier | Risque | Propriétaire habituel |
|---|---|---|
| `src/data/mockData.js` | Très élevé — tout en dépend | branche `chore/data-layer` |
| `src/components/Layout.jsx` | Élevé — toutes les pages | décision d'équipe |
| `src/components/MarcheNavTabs.jsx` | Moyen | décision d'équipe |
| `src/App.jsx` | Faible — seulement si nouvelle route | décision d'équipe |

---

## Sécurité — fichiers confidentiels

`.env` et `.env.local` sont dans le `.gitignore` : ils ne sont **jamais envoyés sur GitHub**. ✓

Règles à respecter :
- Ne jamais coller de mot de passe, clé API ou donnée sensible dans un fichier `.js` ou `.jsx`
- Si tu as besoin d'une variable d'environnement, utilise `import.meta.env.VITE_MA_VARIABLE` et mets la valeur dans `.env.local` uniquement
- En cas de doute sur ce qui est exposé : `git status` avant chaque `git push`

---

## La règle d'or

> **On ne pousse JAMAIS directement sur `main`.**
> `main` = la version qui marche. On n'y touche qu'en passant par une Pull Request validée par un collègue.

---

## Comprendre en 2 minutes

### Avant (ce qu'on faisait)
```
main ──●──●──●──●──●──●   ← tout le monde pousse ici en même temps
         ↑   ↑   ↑
       Tom  Toi Gaspar     = risque de conflits et de casser la version stable
```

### Maintenant (ce qu'on fait)
```
main  ──────────────────●────────────────●──
                       /↑\              /↑\
         feature/xxx ─  PR  feature/yyy   PR
         (Tom)                (Gaspar)
```

Chaque personne travaille dans sa propre branche, isolée. Quand c'est prêt, on demande une validation (Pull Request) avant de fusionner dans `main`.

---

## Le workflow étape par étape

### 1. Avant de commencer une tâche — se mettre à jour

```bash
git checkout main        # revenir sur main
git pull                 # récupérer les dernières modifs des collègues
```

> Toujours faire ça avant de créer une nouvelle branche, sinon tu pars d'une version ancienne.

---

### 2. Créer sa branche de travail

```bash
git checkout -b feature/nom-de-ma-tache
```

**Exemples concrets pour notre projet :**
```bash
git checkout -b feature/export-pdf-analyse
git checkout -b fix/detection-lots-bpu
git checkout -b ui/refonte-onglet-fournisseurs
```

**Convention de nommage :**
| Préfixe | Quand l'utiliser |
|---|---|
| `feature/` | Nouvelle fonctionnalité |
| `fix/` | Correction de bug |
| `ui/` | Changement d'interface / design |
| `chore/` | Maintenance, mise à jour dépendances |

---

### 3. Travailler normalement

Rien ne change dans ta façon de coder. Tu commites comme avant :

```bash
git add .
git commit -m "feat: ajout export PDF de l'analyse des offres"
```

Tu peux faire autant de commits que tu veux dans ta branche — ça n'affecte personne.

---

### 4. Pousser sa branche sur GitHub

```bash
git push origin feature/nom-de-ma-tache
```

> La première fois, Git te propose la commande complète — copie-colle simplement ce qu'il affiche.

---

### 5. Ouvrir une Pull Request sur GitHub

1. Aller sur **github.com/t-reuze/gestion-marches**
2. GitHub affiche une bannière jaune **"Compare & pull request"** → cliquer dessus
3. Remplir un titre clair et une description courte de ce que tu as fait
4. Assigner un collègue en **Reviewer** (celui qui va relire)
5. Cliquer **"Create pull request"**

---

### 6. Review et merge

- Le collègue reviewer lit le code, peut commenter ou approuver
- Une fois approuvé → cliquer **"Merge pull request"** sur GitHub
- GitHub fusionne ta branche dans `main` automatiquement
- Tu peux ensuite supprimer ta branche (GitHub le propose)

---

### 7. Après le merge — nettoyer en local

```bash
git checkout main        # revenir sur main
git pull                 # récupérer le merge
git branch -d feature/nom-de-ma-tache   # supprimer la branche locale
```

---

## Résumé en 7 commandes

```bash
# Début de tâche
git checkout main
git pull
git checkout -b feature/ma-tache

# Pendant le travail
git add .
git commit -m "description de ce que j'ai fait"

# Quand c'est prêt
git push origin feature/ma-tache
# → ouvrir la Pull Request sur GitHub
```

---

## Situations fréquentes

### "Un collègue a mergé des modifs dans main, je veux les récupérer dans ma branche"
```bash
git checkout main
git pull
git checkout feature/ma-branche
git merge main
```

### "J'ai accidentellement fait des modifs sur main"
```bash
git stash                          # mettre de côté tes modifs
git checkout -b feature/ma-tache   # créer la branche
git stash pop                      # récupérer tes modifs
```

### "Je veux voir les branches qui existent"
```bash
git branch -a
```

---

## Ce qui est configuré sur GitHub

`main` est **protégée** : il est impossible de pousser directement dessus.
Tout passage par `main` nécessite une Pull Request avec **au moins 1 approbation**.

---

## En cas de doute

Demande avant d'agir — un conflit mal géré est plus long à réparer qu'une question posée à l'avance.
