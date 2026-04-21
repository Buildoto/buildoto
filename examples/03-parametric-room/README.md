# 03 — Pièce paramétrique

**Niveau** : avancé
**Outils** : `spreadsheet_create`, `spreadsheet_write`, `arch_create_wall` × 4, `arch_create_floor`
**Durée** : 2-3 minutes

## Objectif

Créer une pièce rectangulaire dont les dimensions sont pilotées par un spreadsheet : changer une
valeur dans la feuille recalcule automatiquement la géométrie.

Démontre :
1. Aliasing de cellules (`length`, `width`, `height`, `wall_thickness`)
2. Chaînage Arch : un étage qui contient les murs
3. Pattern "paramétrique" typique BIM

## Prérequis

- Clé IA configurée (préférer un modèle capable de multi-step, ex. Claude Sonnet 4.6 ou GPT-4o)
- Un projet Buildoto ouvert

## Résultat attendu

- Une feuille `Parameters` avec `length=4m`, `width=3m`, `height=2.5m`, `wall_thickness=0.2m`
- 4 murs formant un rectangle, chacun référençant les cellules aliasées
- 1 étage regroupant les murs
- Fichier `room.FCStd` enregistré

## Pour aller plus loin

Modifiez une cellule dans le spreadsheet et recalculez — les murs doivent suivre.
