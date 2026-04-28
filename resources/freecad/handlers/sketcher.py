"""Sketcher workbench handlers."""

from __future__ import annotations

import FreeCAD  # type: ignore

try:
    import Part  # type: ignore
except Exception:  # pragma: no cover
    Part = None  # type: ignore


def _vec(p):
    return FreeCAD.Vector(*p)


def _placement(plane: str, origin: list[float] | None) -> FreeCAD.Placement:
    pos = _vec(origin) if origin else FreeCAD.Vector(0, 0, 0)
    if plane == "XY":
        return FreeCAD.Placement(pos, FreeCAD.Rotation())
    elif plane == "XZ":
        return FreeCAD.Placement(pos, FreeCAD.Rotation(FreeCAD.Vector(1, 0, 0), 90))
    else:
        return FreeCAD.Placement(pos, FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), -90))


def _require_part():
    if Part is None:
        raise RuntimeError("Part workbench unavailable in this FreeCAD build")


def sketcher_create_rectangle(payload, doc):
    _require_part()
    w = payload["width_mm"]
    h = payload["height_mm"]
    plane = payload.get("plane", "XY")
    origin = payload.get("origin")

    sketch = doc.addObject("Sketcher::SketchObject", "RectangleSketch")
    sketch.Placement = _placement(plane, origin)

    v1 = FreeCAD.Vector(0, 0, 0)
    v2 = FreeCAD.Vector(w, 0, 0)
    v3 = FreeCAD.Vector(w, h, 0)
    v4 = FreeCAD.Vector(0, h, 0)

    sketch.addGeometry(Part.LineSegment(v1, v2), False)
    sketch.addGeometry(Part.LineSegment(v2, v3), False)
    sketch.addGeometry(Part.LineSegment(v3, v4), False)
    sketch.addGeometry(Part.LineSegment(v4, v1), False)

    doc.recompute()
    return {"ok": True, "object_id": sketch.Name, "label": sketch.Label}


def sketcher_create_circle(payload, doc):
    _require_part()
    r = payload["radius_mm"]
    plane = payload.get("plane", "XY")
    center_raw = payload.get("center", [0, 0, 0])

    sketch = doc.addObject("Sketcher::SketchObject", "CircleSketch")
    sketch.Placement = _placement(plane, center_raw)

    c = FreeCAD.Vector(0, 0, 0)
    axis = FreeCAD.Vector(0, 0, 1)
    sketch.addGeometry(Part.Circle(c, axis, r), False)

    doc.recompute()
    return {"ok": True, "object_id": sketch.Name, "label": sketch.Label}


def sketcher_close_sketch(payload, doc):
    sid = payload["sketch_id"]
    obj = doc.getObject(sid)
    if not obj:
        raise LookupError(f"Sketch introuvable : {sid}")
    if not obj.TypeId.startswith("Sketcher::"):
        raise LookupError(f"L'objet n'est pas un sketch : {sid}")
    doc.recompute()
    return {"ok": True, "object_id": sid, "label": obj.Label}


TOOLS = {
    "sketcher_create_rectangle": sketcher_create_rectangle,
    "sketcher_create_circle": sketcher_create_circle,
    "sketcher_close_sketch": sketcher_close_sketch,
}
