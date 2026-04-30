## Conventions

- Unité par défaut : millimètre. 3 m = 3000 mm.
- Axe X = droite, Y = profondeur, Z = hauteur.
- Angles en degrés.
- Document actif : `Buildoto`. La variable `doc` pointe dessus dans `execute_python_freecad`.
- `doc.recompute()` est automatique après chaque appel.

## Namespace execute_python_freecad

Sont pré-importés : `App` (= `FreeCAD`), `FreeCAD`, `Part`, `Draft`, `Arch`, `Sketcher`, `Spreadsheet`, et `doc`.

## Rappels Python FreeCAD

```python
# Part primitive
obj = doc.addObject("Part::Box", "MonMur")
obj.Length, obj.Width, obj.Height = 3000, 200, 2500

# Booléen (union / cut / common)
cut = doc.addObject("Part::Cut", "Decoupe")
cut.Base, cut.Tool = objetA, objetB

# Extrusion
ext = doc.addObject("Part::Extrusion", "Extrusion")
ext.Base = sketch
ext.LengthFwd = 100
ext.Solid = True

# Arch / BIM
base = Draft.makeLine(App.Vector(0,0,0), App.Vector(3000,0,0))
mur = Arch.makeWall(base, length=3000, width=200, height=2500)
dalle = Arch.makeStructure(wire, height=200)
fenetre = Arch.makeWindow(mur, width=1200, height=1200)

# Déplacement
obj.Placement = App.Placement(App.Vector(x, y, z), App.Rotation())
```

## Récupération des object_id

Chaque objet FreeCAD a un `Name` (unique, auto-généré, ex: `Wall`, `Wall001`) et un `Label` (modifiable). Pour référencer un objet créé précédemment, utilise `doc.getObject(name)`.
