"""Draft workbench handlers."""

from __future__ import annotations

import FreeCAD  # type: ignore

try:
    import Draft  # type: ignore
except Exception:  # pragma: no cover
    Draft = None  # type: ignore


def _vec(p):
    return FreeCAD.Vector(*p)


def _require_draft():
    if Draft is None:
        raise RuntimeError("Draft workbench unavailable in this FreeCAD build")


def draft_line(payload, doc):
    _require_draft()
    start = _vec(payload["start"])
    end = _vec(payload["end"])
    line = Draft.makeLine(start, end)
    doc.recompute()
    return {"ok": True, "object_id": line.Name, "label": line.Label}


def draft_polygon(payload, doc):
    _require_draft()
    vertices = payload.get("vertices") or []
    if len(vertices) < 3:
        raise ValueError("polygon requires at least 3 vertices")
    closed = bool(payload.get("closed", True))
    points = [_vec(v) for v in vertices]
    if closed:
        points.append(points[0])
    wire = Draft.makeWire(points, closed=closed, face=False)
    doc.recompute()
    return {"ok": True, "object_id": wire.Name, "label": wire.Label, "closed": closed}


def draft_dimension(payload, doc):
    _require_draft()
    from_pt = _vec(payload["from"])
    to_pt = _vec(payload["to"])
    label = payload.get("label", "")
    dim = Draft.makeDimension(from_pt, to_pt)
    if label:
        dim.Label = label
    doc.recompute()
    return {"ok": True, "object_id": dim.Name, "label": dim.Label}


TOOLS = {
    "draft_line": draft_line,
    "draft_polygon": draft_polygon,
    "draft_dimension": draft_dimension,
}
