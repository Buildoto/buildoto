# Exemples Buildoto

Trois projets prêts à essayer, par ordre de complexité croissante. Chaque exemple contient :
- `README.md` — objectif + prérequis
- `prompt.md` — le prompt à copier dans le panneau Agent de Buildoto
- `expected-result.png` — aperçu attendu (à générer après première exécution)

## Liste

| Exemple | Niveau | Outils démontrés |
|---|---|---|
| [01-cube](./01-cube) | Débutant | `part_create_box` |
| [02-wall-door](./02-wall-door) | Intermédiaire | `arch_create_wall`, `arch_create_door` |
| [03-parametric-room](./03-parametric-room) | Avancé | `spreadsheet_create`, `spreadsheet_write`, `arch_create_wall` × 4, `arch_create_floor` |

## Utilisation

1. Ouvrez Buildoto et créez un nouveau projet.
2. Ouvrez le fichier `prompt.md` de l'exemple qui vous intéresse.
3. Copiez le contenu dans le panneau Agent.
4. Observez les outils s'exécuter et la géométrie apparaître dans le modeleur 3D.
