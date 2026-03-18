# Analyse des offres Unicancer

Interface Streamlit de traçabilité et compilation des réponses AO recrutement de personnel 2026.

## Lancement

```bash
# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Lancer l'application
streamlit run completion_tracabilite.py
```

L'application s'ouvre sur `http://localhost:8501`.

## Fonctionnalités

- **Annuaire documents** : détection automatique des 14 documents par fournisseur (Lots 1/2/3, BPU, QT, RSE, CCAP, CCTP, DC1/DC2, ATTRI1, Contacts)
- **Compilation QT** : compilation des Questionnaires Techniques pour les Lots 1, 2 et 3
- **Export Excel** : export de l'annuaire et des compilations avec mise en forme
- **Contacts** : gestion des contacts fournisseurs
- **Détail QT** : statut de complétion des QT par fournisseur et par lot

## Prérequis

- Python 3.12+
- Accès au répertoire OneDrive `travail stagiaires _ AO recrutement personnel 2026`
