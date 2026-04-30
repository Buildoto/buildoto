## Conventions

- Unité par défaut : millimètre. 3 m = 3000 mm.
- Axe X = droite, Y = profondeur, Z = hauteur.
- Angles en degrés.
- Document actif : `Buildoto`. La variable `doc` pointe dessus.
- `doc.recompute()` est automatique après chaque appel.

## Namespace

Sont pré-importés : `App` (= `FreeCAD`), `FreeCAD`, `Part`, `Draft`, `Arch`, `Sketcher`, `Spreadsheet`, et `doc`.

## API FreeCAD disponibles

```python
# Part primitive
box = doc.addObject("Part::Box", "MonMur")
box.Length, box.Width, box.Height = 3000, 200, 2500

# Booléen
cut = doc.addObject("Part::Cut", "Decoupe")
cut.Base, cut.Tool = objetA, objetB

# Mur Arch
base = Draft.makeLine(App.Vector(0,0,0), App.Vector(3000,0,0))
mur = Arch.makeWall(base, length=3000, width=200, height=2500)

# Dalle / plancher (utiliser l'outil Arch)
wire = Draft.makeWire([App.Vector(0,0,0), App.Vector(8000,0,0), App.Vector(8000,10000,0), App.Vector(0,10000,0)], closed=True, face=True)
dalle = Arch.makeStructure(wire, height=200)

# Fenêtre
fenetre = Arch.makeWindow(mur, width=1200, height=1200)

# Porte (utilise la même API que les fenêtres — Arch.makeDoor N'EXISTE PAS)
porte = Arch.makeWindow(mur, width=900, height=2100)

# Toit
toit = Arch.makeRoof(dalle, angle=30, thickness=150)

# Déplacement
obj.Placement = App.Placement(App.Vector(x, y, z), App.Rotation())
```

## API qui N'EXISTENT PAS

Ces fonctions FreeCAD n'existent pas dans la version utilisée :
- ~~`Arch.makeDoor`~~ → utiliser `Arch.makeWindow(width=900, height=2100)`
- ~~`Arch.makeStructure(height=200).Width/Length`~~ → `Arch.makeStructure` prend un `height` seul, pas Width/Length. Créer d'abord un wire fermé avec face=True.
- ~~`Arch.makeFloor`~~ → utiliser `Arch.makeStructure`

## Récupération des object_id

Chaque objet FreeCAD a un `Name` (unique, auto-généré). Pour référencer un objet créé précédemment, utilise `doc.getObject(name)`.
