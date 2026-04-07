# Méthodologie — Analyse des offres de marché

Ce fichier documente la démarche complète pour analyser un dossier d'appel d'offres dans l'app `gestion-marches` (React/Vite, `src/pages/AnalyseUnicancer.jsx`). Il sert de référence pour adapter le travail à tout nouveau marché.

---

## 1. Comprendre le marché avant de toucher au code

Avant toute modification, explorer le dossier de réponses et répondre à ces questions :

| Question | Où chercher |
|---|---|
| Combien de lots ? Quels noms ? | Nom des dossiers fournisseurs, intitulés des annexes |
| Quels documents sont attendus par lot ? | CCTP, RC, CCAP, règlement de consultation |
| Quelle est la nomenclature des annexes ? | ex. Annexe 1 = QT, Annexe 5 = BPU, Annexe 3 = Chiffrage, ou toute autre numérotation |
| Les fournisseurs ont-ils répondu par lot séparé ou dans un seul fichier ? | Regarder la structure des dossiers de 2-3 fournisseurs |
| Y a-t-il un fichier RSE/DD ? | Chercher "RSE", "développement durable", "DD" |
| Y a-t-il une feuille "Optimisation tarifaire" dans le BPU ? | Ouvrir un BPU et lister les onglets |
| Quels documents administratifs ? | DC1, DC2, ATTRI1, CCAP signé, CCTP signé, fiche contacts |

**Règle d'or :** ouvrir manuellement au moins 2-3 fichiers de fournisseurs différents pour repérer la structure réelle avant de standardiser.

---

## 2. Structure attendue des fichiers standardisés

L'app attend un dossier racine (sélectionné via `showDirectoryPicker`) contenant les fichiers standardisés. La détection est automatique par `findStdDir()` qui cherche :
- un sous-dossier nommé `Standardisés` (ou `standardises` sans accent), OU
- un dossier contenant directement des `*_QT_standardisé.xlsx`, OU
- un dossier ayant des sous-dossiers `BPU/`, `RSE/`, `Chiffrage/`

### Arborescence recommandée

```
AO_[NomMarche]_Standardisés/
├── QT/
│   ├── Fournisseur1_QT_standardisé.xlsx      ← une feuille par lot : "QT LOT 1", "QT LOT 2", ...
│   └── Fournisseur2_QT_standardisé.xlsx
├── BPU/
│   ├── Fournisseur1_BPU_standardisé.xlsx     ← une feuille par lot (noms identiques aux LOT_SHEETS)
│   └── Fournisseur2_BPU_standardisé.xlsx
├── RSE/
│   └── Fournisseur1_RSE_standardisé.xlsx     ← une seule feuille
└── Chiffrage/
    └── Fournisseur1_Chiffrage_standardisé.xlsx
```

### Convention de nommage des fichiers

`[NomFournisseur]_[TYPE]_standardisé.xlsx`

Le nom fournisseur doit être **cohérent entre tous les types** (QT, BPU, RSE, Chiffrage) car la correspondance se fait par `normSupName()` qui :
- supprime les accents
- met en minuscules
- retire le suffixe ` ok` éventuel
- normalise les espaces

---

## 3. Paramètres à adapter dans `AnalyseUnicancer.jsx`

### 3.1 Labels de l'annuaire (`DOC_LABELS`)

```js
const DOC_LABELS = [
  'Lot 1 MAD Personnel', 'Lot 2 Recrutement', 'Lot 3 Freelance',  // ← adapter au marché
  'BPU (Annexe 5)', 'Optim. Tarifaire', 'QT (Annexe 1)',
  'BPU Chiffrage (Annexe 3)', 'Questionnaire RSE', 'CCAP signé',
  'CCTP signé', 'DC1', 'DC2', 'ATTRI1', 'Fiche Contacts',
];
```

Adapter : noms des lots, numéros d'annexes, et retirer/ajouter des documents si absents du marché.

### 3.2 Noms des feuilles BPU (`LOT_SHEETS` dans `compileBPU`)

```js
const LOT_SHEETS = [
  { name: 'LOT 1 – MAD Personnel',   col: 0, priceCol: 4 },
  { name: 'LOT 2 – Recrutement',      col: 0, priceCol: 1 },
  { name: 'LOT 3 – Freelance',        col: 0, priceCol: 5 },
  { name: 'Optimisation Tarifaire',   col: 0, priceCol: 1 },
];
```

**CRITIQUE :** le tiret dans les noms de feuilles est un **em dash `—` (U+2014)**, pas un tiret ordinaire `-`. Vérifier avec Python :
```python
wb = openpyxl.load_workbook(fichier_bpu)
print([(s, [hex(ord(c)) for c in s if ord(c) > 127]) for s in wb.sheetnames])
```

### 3.3 Colonnes BPU requises par lot (`BPU_REQ` dans `scan`)

```js
const BPU_REQ = {
  1: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: '% Remise' }],
  2: [{ col: 1, name: '% Taux' }],
  3: [{ col: 2, name: 'PUHT/jour' }, { col: 3, name: 'PUHT/heure' }, { col: 4, name: '% Remise' }],
};
```

Pour identifier les colonnes réelles : ouvrir un BPU standardisé, identifier les colonnes que **le fournisseur doit remplir** (exclure les colonnes calculées automatiquement et les colonnes pré-remplies par le donneur d'ordre). Les index sont 0-based.

### 3.4 Colonnes requises pour `compileQT` (`BPU_REQ_COLS`)

```js
const BPU_REQ_COLS = { 1: [2, 3], 2: [1], 3: [2, 4] };
```

Même logique que BPU_REQ mais juste les index de colonnes (sans les noms). Sert à déterminer si un fournisseur est **positionné** sur un lot.

### 3.5 Noms des feuilles pour `compileChiffrage`

```js
const LOT_SHEETS = ['LOT 1 – MAD Personnel', 'LOT 3 – Freelance'];
```

Adapter aux lots qui ont un chiffrage. Même attention au tiret em dash.

---

## 4. Règles de détection documentaire (`DOC_RULES`)

Les `DOC_RULES` permettent de détecter les documents dans les dossiers fournisseurs (mode non-standardisé ou fallback). Structure :

```js
'QT (Annexe 1)': {
  ext: ['.xls', '.xlsx'],
  any: ['annexe 1', 'qt lot', 'questionnaire technique', 'cctp annexe'],
  exclude: ['annexe 3', 'annexe 5', 'bpu', 'chiffrage', 'rse'],
},
```

- `any` : au moins un de ces termes dans le chemin complet (normalisé, sans accents)
- `exclude` : aucun de ces termes ne doit être présent
- `ext: null` : accepte tous les formats (pour PDF, p7m, etc.)

Pour un nouveau marché, adapter les mots-clés selon les noms réels des fichiers.

---

## 5. Exclusion des valeurs NA dans les BPU

Les fournisseurs écrivent parfois "NA", "N/A", "néant" dans les lots où ils ne sont pas positionnés. Ces valeurs sont exclues par `isRealVal()` :

```js
const NA_VALS = new Set(['na', 'n/a', 'n.a.', 'n.a', 'non applicable', 'néant', 'neant', '-']);
const isRealVal = v => { const s = String(v||'').trim().toLowerCase(); return s !== '' && !NA_VALS.has(s); };
```

Vérifier si le marché utilise d'autres termes équivalents et les ajouter si nécessaire.

---

## 6. Processus de standardisation Python (openpyxl)

### Workflow type

1. **Explorer** le dossier de réponses → comprendre la structure par fournisseur
2. **Créer le dossier standardisé** (ex: `AO_[Marche]_Standardisés/QT/`, `/BPU/`, `/RSE/`, `/Chiffrage/`)
3. **Pour chaque type de document**, écrire un script Python qui :
   - Trouve le fichier source (chercher par mots-clés dans le nom ou chemin)
   - Identifie la feuille correspondant au lot
   - Copie les données avec `copy_sheet()` ci-dessous
   - Nomme la feuille destination `QT LOT X` / `LOT X — Nom` selon la convention
4. **Vérifier** avec l'app en chargeant le dossier standardisé

### Fonction de copie de feuille entre workbooks

```python
import openpyxl, copy

def copy_sheet(src_wb, src_sheet_name, dst_wb, dst_sheet_name):
    src_ws = src_wb[src_sheet_name]
    dst_ws = dst_wb.create_sheet(title=dst_sheet_name)
    for col_letter, col_dim in src_ws.column_dimensions.items():
        dst_ws.column_dimensions[col_letter].width = col_dim.width
    for row_num, row_dim in src_ws.row_dimensions.items():
        dst_ws.row_dimensions[row_num].height = row_dim.height
    for merged_range in src_ws.merged_cells.ranges:
        dst_ws.merge_cells(str(merged_range))
    for row in src_ws.iter_rows():
        for cell in row:
            dst_cell = dst_ws.cell(row=cell.row, column=cell.column)
            dst_cell.value = cell.value
            if cell.has_style:
                dst_cell.font = copy.copy(cell.font)
                dst_cell.border = copy.copy(cell.border)
                dst_cell.fill = copy.copy(cell.fill)
                dst_cell.number_format = cell.number_format
                dst_cell.alignment = copy.copy(cell.alignment)
    return dst_ws
```

### Gestion des cas particuliers fréquents

| Problème | Solution |
|---|---|
| Fichier verrouillé (OneDrive) | `try/except PermissionError` → logger et continuer |
| Un seul fichier pour tous les lots | Extraire chaque feuille séparément vers le fichier standardisé du bon lot |
| Lots dans des fichiers séparés | Fusionner : créer un fichier standardisé par fournisseur avec une feuille par lot |
| Fournisseur absent sur un lot | Ne pas créer la feuille correspondante → l'app affichera "Absent" |
| Extension `.xls` (ancien format) | `openpyxl` ne lit pas `.xls` → utiliser `xlrd` pour lire puis réécrire en xlsx |

---

## 7. Vérifications avant livraison

### Checklist Python (vérification des fichiers standardisés)

```python
import openpyxl, os

# 1. Vérifier la cohérence des noms de feuilles
for f in os.listdir('BPU/'):
    wb = openpyxl.load_workbook(f'BPU/{f}', read_only=True)
    print(f, wb.sheetnames)
    # Vérifier : noms identiques entre tous les fichiers BPU

# 2. Vérifier le tiret dans les noms de feuilles BPU
for s in wb.sheetnames:
    tirets = [hex(ord(c)) for c in s if ord(c) in (0x2013, 0x2014, 0x2012, 0x002D)]
    print(s, tirets)
    # Attendu : 0x2014 (em dash —) pour les feuilles LOT X — Nom

# 3. Vérifier que les colonnes requises ont des données réelles
NA = {'na','n/a','neant','néant','-','non applicable'}
def has_real_data(ws, col_idx):
    return any(
        str(row[col_idx] or '').strip().lower() not in NA and str(row[col_idx] or '').strip()
        for row in ws.iter_rows(min_row=2, values_only=True)
        if col_idx < len(row)
    )
```

### Checklist app

- [ ] Annuaire : chaque fournisseur apparaît une seule fois (pas de doublon "Action a faire" etc.)
- [ ] Annuaire : les lots cochés correspondent au BPU (pas aux noms de dossiers)
- [ ] BPU "Partiel" → vérifier le tooltip avec les colonnes manquantes
- [ ] QT : tous les fournisseurs positionnés sur un lot apparaissent (même "Absent")
- [ ] Compilation QT : le nombre de questions est cohérent entre fournisseurs d'un même lot

---

## 8. Dossiers à exclure lors du scan de l'annuaire (`SKIP_DIRS`)

Dossiers qui ne sont pas des fournisseurs et doivent être ignorés :

```js
const SKIP_DIRS = new Set([
  'standardises', 'compilation', 'qt', 'bpu', 'rse', 'chiffrage',
  'ao', 'action a faire', '__pycache__', 'node_modules', '.git',
  'template', 'modele', 'modèle', 'vierge',
]);
```

Pour un nouveau marché, identifier les dossiers non-fournisseurs présents et les ajouter.

---

## 9. Points d'attention spécifiques au marché AO Recrutement 2026 (référence)

- **3 lots** : LOT 1 MAD Personnel, LOT 2 Recrutement, LOT 3 Freelance
- **Annexe 1** = QT (Questionnaire Technique)
- **Annexe 5** = BPU (avec feuilles LOT 1—3 + Optimisation Tarifaire)
- **Annexe 3** = Chiffrage (LOT 1 et LOT 3 uniquement)
- Colonnes requises BPU : LOT 1 → PUHT/jour (col C) + % Remise (col D) ; LOT 2 → % Taux (col B) ; LOT 3 → PUHT/jour + PUHT/heure + % Remise
- Certains fournisseurs remplissent les lots où ils ne sont PAS positionnés avec "NA" → exclus par `isRealVal()`
- 14 fournisseurs dans le dossier standardisé de test (`AO_Recrutement_Standardisés`)
- Dossier de travail original : `OneDrive - UNICANCER/Bureau/travail stagiaires _ AO recrutement personnel 2026/Reponses/`
