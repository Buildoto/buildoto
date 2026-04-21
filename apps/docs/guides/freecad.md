# Outils FreeCAD

Buildoto embarque FreeCAD 1.1 qui est piloté par 23 outils structurés, regroupés par workbench.

## Architecture des workbenches

- **Part** — primitives géométriques, opérations booléennes
- **Arch / BIM** — murs, portes, fenêtres, sites, bâtiments, étages
- **Draft** — géométrie 2D, lignes, arcs, polygones
- **Spreadsheet** — tableaux paramétriques pour pilotage de modèles
- **Sketcher** — croquis 2D contraints

## Communication

FreeCAD tourne en sidecar (processus enfant) et communique avec Buildoto via WebSocket local.
Chaque outil structuré produit :
1. Un résultat JSON (succès/échec, diagnostics)
2. Une exportation glTF du modèle pour la 3D view
3. Un fichier `.FCStd` persisté dans le projet

## Ajouter un outil

Pour étendre la palette d'outils, regardez `packages/main/src/tools/registry.ts` et ajoutez
une nouvelle entrée conforme au schéma Zod. Le prompt système de l'agent est généré
automatiquement à partir de la registry.
