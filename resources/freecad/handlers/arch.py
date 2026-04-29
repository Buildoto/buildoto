"""Arch (BIM) workbench handlers."""

from __future__ import annotations

import FreeCAD  # type: ignore

try:
    import Arch  # type: ignore
except Exception:  # pragma: no cover
    Arch = None  # type: ignore

try:
    import Draft  # type: ignore
except Exception:  # pragma: no cover
    Draft = None  # type: ignore

try:
    import Part  # type: ignore
except Exception:  # pragma: no cover
    Part = None  # type: ignore


_ALIGNMENTS = {"left": "Left", "center": "Center", "right": "Right"}


def _vec(pos, default=(0, 0, 0)):
    v = tuple(pos or default)
    return FreeCAD.Vector(*v)


def _resolve(doc, obj_id):
    """Resolve an object ID, trying direct lookup first, then case-insensitive."""
    obj = doc.getObject(obj_id)
    if obj is not None:
        return obj
    # Case-insensitive fallback — LLMs often lowercase FreeCAD's capitalized Names.
    for o in doc.Objects:
        if o.Name.lower() == obj_id.lower() or o.Label.lower() == obj_id.lower():
            return o
    return None


def _require_arch():
    if Arch is None:
        raise RuntimeError("Arch workbench unavailable in this FreeCAD build")


def arch_create_wall(payload, doc):
    _require_arch()
    length = float(payload["length_mm"])
    height = float(payload["height_mm"])
    thickness = float(payload["thickness_mm"])
    alignment = _ALIGNMENTS.get(payload.get("alignment") or "center", "Center")
    pos = _vec(payload.get("position"))

    if Draft is None:
        raise RuntimeError("Draft workbench required for Arch.makeWall baseline")
    base = Draft.makeLine(pos, pos.add(FreeCAD.Vector(length, 0, 0)))
    wall = Arch.makeWall(base, length=length, width=thickness, height=height)
    wall.Align = alignment
    doc.recompute()
    return {
        "ok": True,
        "object_id": wall.Name,
        "label": wall.Label,
        "length_mm": length,
        "height_mm": height,
        "thickness_mm": thickness,
        "alignment": payload.get("alignment") or "center",
    }


def arch_create_floor(payload, doc):
    _require_arch()
    thickness = float(payload["thickness_mm"])
    polygon = payload.get("polygon")
    if not polygon or len(polygon) < 3:
        raise ValueError("polygon must have at least 3 vertices")
    if Draft is None:
        raise RuntimeError("Draft workbench required for floor baseline")
    points = [FreeCAD.Vector(*p) for p in polygon]
    points.append(points[0])
    wire = Draft.makeWire(points, closed=True, face=True)
    floor = Arch.makeStructure(wire, height=thickness)
    floor.IfcType = "Slab"
    floor.Label = "Floor"
    doc.recompute()
    return {
        "ok": True,
        "object_id": floor.Name,
        "label": floor.Label,
        "thickness_mm": thickness,
    }


def arch_create_window(payload, doc):
    _require_arch()
    host_id = payload["host_wall_id"]
    width = float(payload["width_mm"])
    height = float(payload["height_mm"])
    sill = float(payload["sill_height_mm"])
    offset = float(payload["offset_along_wall_mm"])
    host = _resolve(doc, host_id)
    if host is None:
        raise LookupError(f"unknown host wall: {host_id}")
    window = Arch.makeWindow(host, width=width, height=height)
    try:
        window.HoleDepth = 500
    except Exception:
        pass
    placement = FreeCAD.Placement()
    placement.Base = FreeCAD.Vector(offset, 0, sill)
    window.Placement = placement
    doc.recompute()
    return {
        "ok": True,
        "object_id": window.Name,
        "label": window.Label,
        "host_wall_id": host_id,
    }


def arch_create_door(payload, doc):
    _require_arch()
    host_id = payload["host_wall_id"]
    width = float(payload["width_mm"])
    height = float(payload["height_mm"])
    offset = float(payload["offset_along_wall_mm"])
    host = _resolve(doc, host_id)
    if host is None:
        raise LookupError(f"unknown host wall: {host_id}")
    door = Arch.makeWindow(host, width=width, height=height)
    try:
        door.WindowParts = ["Door", "Frame", "Wire0", "30", "40"]
    except Exception:
        pass
    door.Label = "Door"
    placement = FreeCAD.Placement()
    placement.Base = FreeCAD.Vector(offset, 0, 0)
    door.Placement = placement
    doc.recompute()
    return {
        "ok": True,
        "object_id": door.Name,
        "label": door.Label,
        "host_wall_id": host_id,
    }


def arch_create_roof(payload, doc):
    _require_arch()
    base_id = payload["base_object_id"]
    angle = float(payload["angle_deg"])
    thickness = float(payload["thickness_mm"])
    base = _resolve(doc, base_id)
    if base is None:
        raise LookupError(f"unknown base: {base_id}")
    roof = Arch.makeRoof(base, angle=angle, thickness=thickness)
    doc.recompute()
    return {
        "ok": True,
        "object_id": roof.Name,
        "label": roof.Label,
        "angle_deg": angle,
        "thickness_mm": thickness,
    }


TOOLS = {
    "arch_create_wall": arch_create_wall,
    "arch_create_floor": arch_create_floor,
    "arch_create_window": arch_create_window,
    "arch_create_door": arch_create_door,
    "arch_create_roof": arch_create_roof,
}
