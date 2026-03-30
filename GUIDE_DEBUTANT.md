# Guide Git pour débutants — Gestion Marchés

> Ce guide s'adresse à Tom et Gaspar.
> Pas besoin de connaître Git. Suis les étapes dans l'ordre.

---

## C'est quoi Git et GitHub — en 30 secondes

Imagine que le projet est un **document Word partagé**, mais en beaucoup mieux :

- **GitHub** = le serveur où est stocké le projet (comme SharePoint, mais pour du code)
- **Git** = l'outil sur ton ordinateur qui synchronise ton travail avec GitHub
- **Une branche** = ta propre copie du projet où tu travailles sans déranger les autres

> Concrètement : tu travailles dans ton coin, et quand c'est prêt, tu demandes à Tom-Reuze de valider avant que ça parte dans la version officielle.

---

## Étape 0 — Ce qu'il te faut (à faire une seule fois)

### Vérifier que Git est installé

Ouvre **VS Code**, puis ouvre le terminal intégré avec `Ctrl + J`.

Tape :
```
git --version
```

Si tu vois quelque chose comme `git version 2.xx.x` → c'est bon.
Si tu vois une erreur → télécharge Git sur **git-scm.com** et installe-le.

### Configurer ton identité Git (une seule fois)

Dans le terminal, tape ces deux lignes en remplaçant par tes vraies infos :
```
git config --global user.name "Ton Prénom Nom"
git config --global user.email "ton.email@exemple.com"
```

---

## Étape 1 — Récupérer le projet sur ton ordinateur (une seule fois)

Dans le terminal VS Code, navigue où tu veux stocker le projet, puis tape :

```
git clone https://github.com/t-reuze/gestion-marches.git
```

Ça télécharge tout le projet dans un dossier `gestion-marches`.

Ensuite, ouvre ce dossier dans VS Code :
**Fichier → Ouvrir le dossier → sélectionner `gestion-marches`**

---

## Étape 2 — Aller sur ta branche

Chaque personne a sa branche assignée :

| Personne | Branche |
|---|---|
| Tom | `feature/notation` |
| Gaspar | `feature/reporting` |

Dans le terminal, tape :

```
git checkout feature/notation
```
*(remplace par ton nom de branche)*

Tu verras :
```
Switched to branch 'feature/notation'
```

> **Comment savoir sur quelle branche tu es ?**
> En bas à gauche de VS Code, tu vois le nom de la branche actuelle. C'est là que tu travailles.

---

## Étape 3 — Avant de commencer à travailler

**Chaque matin** (ou avant de reprendre le travail), récupère les dernières modifications :

```
git pull
```

C'est comme "actualiser" — ça t'assure d'avoir la version la plus récente.

---

## Étape 4 — Travailler normalement

Ouvre, modifie, crée tes fichiers dans VS Code comme d'habitude.
Ton travail reste dans ta branche — tu ne risques pas de casser quoi que ce soit pour les autres.

---

## Étape 5 — Sauvegarder et envoyer son travail

C'est l'équivalent d'un **"Enregistrer et partager"**. Ça se fait en 3 commandes.

### 5a. Voir ce que tu as modifié
```
git status
```
Ça affiche la liste de tes fichiers modifiés (en rouge = pas encore sauvegardé).

### 5b. Sélectionner les fichiers à sauvegarder
```
git add .
```
Le point `.` veut dire "tout ce que j'ai modifié". Tu peux aussi cibler un fichier précis :
```
git add src/pages/Notation.jsx
```

### 5c. Créer un point de sauvegarde avec un message
```
git commit -m "feat: ajout colonne pondération dans la grille de notation"
```

> Le message doit décrire **ce que tu as fait**, pas comment. Exemples :
> - `feat: ajout filtre par fournisseur`
> - `fix: correction calcul total lots`
> - `ui: mise en page tableau notation`

### 5d. Envoyer sur GitHub
```
git push
```

---

## Étape 6 — Demander une validation (Pull Request)

Quand ta tâche est terminée et que tu as fait ton `git push`, tu demandes à Tom-Reuze de valider.

1. Va sur **github.com/t-reuze/gestion-marches**
2. Tu verras une bannière jaune avec **"Compare & pull request"** → clique dessus

   *(Si tu ne la vois pas : clique sur l'onglet "Pull requests" → "New pull request")*

3. Remplis le formulaire :
   - **Titre** : ce que tu as fait en une phrase (`Grille de notation — ajout pondération`)
   - **Description** : quelques lignes pour expliquer les changements
   - **Reviewers** (à droite) : assigne **t-reuze**

4. Clique **"Create pull request"**

Tom-Reuze reçoit une notification, regarde ton travail, et valide (ou commente si besoin).

---

## Étape 7 — Après la validation

Une fois que Tom-Reuze a approuvé et mergé ta Pull Request :

```
git checkout main
git pull
```

Ton travail est maintenant dans la version officielle.

---

## Résumé — les 5 commandes du quotidien

```bash
git pull                          # récupérer les dernières modifs (chaque matin)

git status                        # voir ce que j'ai modifié

git add .                         # sélectionner mes modifs

git commit -m "description"       # créer un point de sauvegarde

git push                          # envoyer sur GitHub
```

---

## Problèmes fréquents

### "Je ne sais plus sur quelle branche je suis"
Regarde en bas à gauche de VS Code, ou tape :
```
git branch
```
La branche active a une `*` devant elle.

### "J'ai modifié un fichier par erreur et je veux annuler"
```
git restore nom-du-fichier.jsx
```
⚠️ Cette commande efface définitivement tes modifications sur ce fichier.

### "Git me demande un mot de passe"
C'est le mot de passe de ton compte **GitHub** (pas ton ordinateur).
Si ça bloque, dis-le à Tom-Reuze — il peut configurer une clé d'authentification.

### "J'ai un conflit"
Ne touche à rien et appelle Tom-Reuze. Les conflits se règlent à deux.

---

## Fichiers à ne pas modifier sans prévenir l'équipe

| Fichier | Pourquoi |
|---|---|
| `src/data/mockData.js` | Contient les données de tous les marchés |
| `src/components/Layout.jsx` | Touche toutes les pages |

Avant de modifier ces fichiers : **envoie un message sur Teams** pour prévenir.

---

## En cas de doute — demande avant d'agir

Un message Teams prend 10 secondes. Réparer un conflit mal géré prend 30 minutes.
