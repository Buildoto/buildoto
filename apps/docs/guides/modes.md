# Modes Plan / Build

L'agent Buildoto fonctionne en deux modes, bascule via `Tab` dans le champ de saisie.

## Plan (lecture seule)

- Seuls les outils **read-only** sont exposés : lecture de fichiers, inspection FreeCAD,
  diff Git, recherche, etc.
- Aucune modification du projet n'est possible.
- Indicateur visuel : pastille bleue sur le badge de statut.

**Cas d'usage** :
- Comprendre un projet existant
- Demander un diagnostic
- Reviewer un commit
- Brainstorming sans risque d'écriture

## Build (lecture/écriture)

- Tous les outils sont disponibles : création/modification/suppression FreeCAD, édition fichiers,
  commits Git, etc.
- Indicateur visuel : pastille orange.

**Cas d'usage** :
- Générer un nouveau modèle
- Modifier un existant
- Commiter / pusher

## Convention

Buildoto démarre toujours en **Plan** au début d'une session, pour éviter tout changement
accidentel pendant l'exploration.
