"""Part workbench handlers."""

from __future__ import annotations

import FreeCAD  # type: ignore

try:
    import Part  # type: ignore
except Exception:  # pragma: no cover
    Part = None  # type: ignore


_AXES = {
    "X": FreeCAD.Vector(1, 0, 0),
    "Y": FreeCAD.Vector(0, 1, 0),
    "Z": FreeCAD.Vector(0, 0, 1),
}


def _vec(position, default=(0, 0, 0)):
    v = tuple(position or default)
    return FreeCAD.Vector(*v)


def part_create_box(payload, doc):
    length = float(payload["length_mm"])
    width = float(payload["width_mm"])
    height = float(payload["height_mm"])
    name = payload.get("name") or "Box"
    obj = doc.addObject("Part::Box", name)
    obj.Length = length
    obj.Width = width
    obj.Height = height
    pos = _vec(payload.get("position"))
    obj.Placement = FreeCAD.Placement(pos, FreeCAD.Rotation())
    doc.recompute()
    return {
        "ok": True,
        "object_id": obj.Name,
        "label": obj.Label,
        "dimensions_mm": [length, width, height],
    }


def part_create_cylinder(payload, doc):
    radius = float(payload["radius_mm"])
    height = float(payload["height_mm"])
    axis = payload.get("axis") or "Z"
    name = payload.get("name") or "Cylinder"
    obj = doc.addObject("Part::Cylinder", name)
    obj.Radius = radius
    obj.Height = height
    rot = FreeCAD.Rotation()
    if axis == "X":
        rot = FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), 90)
    elif axis == "Y":
        rot = FreeCAD.Rotation(FreeCAD.Vector(1, 0, 0), -90)
    pos = _vec(payload.get("position"))
    obj.Placement = FreeCAD.Placement(pos, rot)
    doc.recompute()
    return {
        "ok": True,
        "object_id": obj.Name,
        "label": obj.Label,
        "radius_mm": radius,
        "height_mm": height,
        "axis": axis,
    }


def part_boolean(payload, doc):
    op = payload["operation"]
    a_id = payload["a_id"]
    b_id = payload["b_id"]
    a = doc.getObject(a_id)
    b = doc.getObject(b_id)
    if a is None or b is None:
        raise LookupError(f"unknown object: {a_id if a is None else b_id}")
    kind = {"union": "Part::Fuse", "cut": "Part::Cut", "common": "Part::Common"}[op]
    name = payload.get("name") or op.capitalize()
    obj = doc.addObject(kind, name)
    obj.Base = a
    obj.Tool = b
    doc.recompute()
    return {"ok": True, "object_id": obj.Name, "operation": op}


def part_extrude(payload, doc):
    sketch_id = payload["sketch_id"]
    depth = float(payload["depth_mm"])
    sketch = doc.getObject(sketch_id)
    if sketch is None:
        raise LookupError(f"unknown sketch: {sketch_id}")
    name = "Extrusion"
    obj = doc.addObject("Part::Extrusion", name)
    obj.Base = sketch
    direction = payload.get("direction") or "normal"
    if direction == "normal":
        obj.DirMode = "Normal"
        obj.LengthFwd = depth
    else:
        v = _vec(direction)
        obj.DirMode = "Custom"
        obj.Dir = v
        obj.LengthFwd = depth
    obj.Solid = True
    doc.recompute()
    return {"ok": True, "object_id": obj.Name, "depth_mm": depth}


TOOLS = {
    "part_create_box": part_create_box,
    "part_create_cylinder": part_create_cylinder,
    "part_boolean": part_boolean,
    "part_extrude": part_extrude,
}
