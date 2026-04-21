# Référence — Outils FreeCAD

::: info
Cette page est régénérée automatiquement depuis `packages/main/src/tools/registry.ts` au build.
Elle liste les 23 outils structurés disponibles dans Buildoto v0.1.0-alpha.0.
:::

## Workbench Part

### `part_create_box`
Crée une boîte paramétrique. Paramètres : `length`, `width`, `height`, `placement?`, `label?`.

### `part_create_cylinder`
Crée un cylindre. Paramètres : `radius`, `height`, `angle?`, `placement?`, `label?`.

### `part_create_sphere`
Crée une sphère. Paramètres : `radius`, `placement?`, `label?`.

### `part_boolean`
Opération booléenne entre deux solides. `operation: 'fuse' | 'cut' | 'common'`, `shapeA`, `shapeB`.

## Workbench Arch (BIM)

### `arch_create_wall`
Crée un mur. `length`, `width?`, `height`, `alignment?: 'Left' | 'Right' | 'Center'`, `baseLine?`.

### `arch_create_door`
Place une porte dans un mur hôte. `host`, `width?`, `height?`, `placement`.

### `arch_create_window`
Place une fenêtre dans un mur hôte. `host`, `width`, `height`, `placement`.

### `arch_create_floor`
Niveau (étage) qui regroupe des murs/pièces. `label?`, `height?`.

### `arch_create_site`
Site BIM englobant. `label?`, `address?`.

### `arch_create_building`
Bâtiment contenant des étages. `label?`.

### `arch_create_structure`
Élément structurel générique (poteau, poutre). `length`, `width`, `height`, `nodes?`.

### `arch_create_stairs`
Escalier paramétrique. `length`, `width`, `height`, `numberOfSteps`.

### `arch_create_roof`
Toit. `baseWall`, `angle?`, `overhang?`.

## Workbench Draft

### `draft_line`
Ligne entre deux points. `start`, `end`.

### `draft_rectangle`
Rectangle par longueur × largeur. `length`, `width`, `placement?`.

### `draft_circle`
Cercle. `radius`, `placement?`.

### `draft_polygon`
Polygone régulier. `faces`, `radius`, `placement?`.

## Workbench Spreadsheet

### `spreadsheet_create`
Nouvelle feuille dans le document. `label?`.

### `spreadsheet_write`
Écrit une cellule. `sheet`, `cell` (ex `A1`), `value`, `alias?`.

### `spreadsheet_read`
Lit une cellule. `sheet`, `cell`.

## Workbench Sketcher

### `sketch_create`
Nouveau croquis 2D dans un plan. `plane: 'XY' | 'XZ' | 'YZ'`, `support?`.

### `sketch_add_geometry`
Ajoute une géométrie au croquis actif. `kind`, `points`, `constraints?`.

## Système de fichiers

### `fs_read_file`
Lit un fichier du projet. `path`.

### `fs_write_file`
Écrit / modifie un fichier. `path`, `content`.
