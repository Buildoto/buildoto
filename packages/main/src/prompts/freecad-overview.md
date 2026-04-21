# Aide-mémoire FreeCAD pour l'agent Buildoto

Ce document complète les descriptions d'outils. Lis-le une fois au début de
chaque conversation : il cadre les conventions, les raccourcis usuels, et
indique quand préférer un outil structuré ou le script Python brut.

## 1. Unités et conventions

- **Unité par défaut : millimètre.** Un mur de 3 m s'écrit 3000 ; une pièce
  de 5 × 4 m = 5000 × 4000.
- **Repère :** axe X = droite, Y = profondeur, Z = hauteur (vertical).
- Angles en degrés (les outils convertissent en interne).
- Placements (`position`, `origin`) : `[x, y, z]` — origine du coin
  inférieur gauche sauf mention contraire.
- **Document actif :** un document nommé `Buildoto` est créé et activé
  avant chaque appel d'outil. La variable `doc` pointe dessus dans
  `execute_python_freecad`.
- Après chaque mutation, `doc.recompute()` est appelé par l'hôte ; tu n'as
  pas besoin de l'invoquer toi-même.

## 2. Espaces de noms (fallback Python)

Dans `execute_python_freecad`, sont pré-importés : `App` (= `FreeCAD`),
`FreeCAD`, `Part`, `Draft`, `Arch`, `Sketcher`, `Spreadsheet`, et la
variable `doc` pointant sur le document actif.

## 3. Quand utiliser quel outil

**Préfère systématiquement les outils structurés aux scripts bruts.** Ils
retournent un `object_id` fiable, sont plus rapides à invoquer, et leurs
résultats sont validés côté serveur.

| Besoin | Outil recommandé |
|---|---|
| Boîte, cube, mur plein | `part_create_box` |
| Cylindre, poteau, tuyau | `part_create_cylinder` |
| Union / différence / intersection | `part_boolean` |
| Extrusion d'un profil 2D | `part_extrude` |
| Rectangle / cercle 2D sur un plan | `sketcher_create_rectangle`, `sketcher_create_circle` |
| Ligne ou polygone Draft | `draft_line`, `draft_polygon` |
| Cote (dimension) | `draft_dimension` |
| Mur BIM | `arch_create_wall` |
| Sol / dalle | `arch_create_floor` |
| Fenêtre / porte | `arch_create_window`, `arch_create_door` |
| Toiture | `arch_create_roof` |
| Tableau de paramètres | `spreadsheet_write` |
| Capture du viewport | `screenshot` |
| Export glTF (viewport) | `export_gltf` |
| Export IFC (BIM) | `export_ifc` |
| Lister les documents / objets | `list_documents`, `get_objects`, `get_object_properties` |

**N'utilise `execute_python_freecad` que** lorsque aucun outil structuré
ne convient : boucles sur une collection, accès à une propriété rare,
manipulation fine de placement (rotations composées), ou opération
expérimentale non couverte par les ateliers ci-dessus.

## 4. Patrons courants (recettes Python de secours)

```python
# Primitive Part
box = doc.addObject("Part::Box", "Mur")
box.Length, box.Width, box.Height = 3000, 200, 2500

# Extrusion d'une esquisse
ext = doc.addObject("Part::Extrusion", "Ext")
ext.Base = sketch
ext.LengthFwd = 100
ext.Solid = True

# Booléen
cut = doc.addObject("Part::Cut", "Cut")
cut.Base, cut.Tool = a, b
```

## 5. BIM (Arch)

- `arch_create_wall` : `length_mm`, `height_mm`, `thickness_mm` obligatoires.
  `alignment` contrôle la position de l'axe (`left` / `center` / `right`).
- `arch_create_window` et `arch_create_door` : `host_wall_id` est requis ;
  `offset_along_wall_mm` positionne l'ouverture le long de la paroi
  depuis son extrémité gauche.
- `arch_create_floor` : accepte un polygone de base (liste de sommets) ou
  un `base_object_id` déjà existant.
- `arch_create_roof` : nécessite un `base_object_id` (généralement un
  sol ou un profil fermé) ; `angle_deg` est l'inclinaison.

## 6. Exports

- **glTF** : `export_gltf` sert au viewport temps réel. Renvoie un blob
  base64. L'hôte le pousse à la fenêtre 3D automatiquement.
- **IFC** : `export_ifc` écrit un fichier `.ifc` dans `exports/` (ou au
  chemin fourni). Utilise-le pour livrer un échange BIM.

## 7. Discipline

- Réponds en français, de façon concise (une à deux phrases).
- Ne décris pas ce que tu vas faire : fais-le, puis confirme.
- Si une opération échoue, explique brièvement et propose une alternative
  (par exemple passer au fallback Python).
