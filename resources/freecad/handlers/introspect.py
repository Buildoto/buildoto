"""Introspection and export handlers."""

from __future__ import annotations

import base64
import os
import time

import FreeCAD  # type: ignore

try:
    import Import  # type: ignore
except Exception:  # pragma: no cover
    Import = None  # type: ignore


def _all_docs():
    return list(FreeCAD.listDocuments().values())


def _resolve_doc(doc, document_id=None):
    if document_id:
        target = FreeCAD.getDocument(document_id) if document_id in [d.Name for d in _all_docs()] else None
        if target is None:
            raise LookupError(f"unknown document: {document_id}")
        return target
    return doc


def list_documents(payload, doc):
    out = []
    for d in _all_docs():
        out.append({
            "id": d.Name,
            "label": d.Label,
            "object_count": len(d.Objects),
        })
    return {"ok": True, "documents": out}


def get_objects(payload, doc):
    target = _resolve_doc(doc, payload.get("document_id"))
    out = []
    for obj in target.Objects:
        item = {
            "id": obj.Name,
            "label": obj.Label,
            "type": obj.TypeId,
        }
        try:
            item["visible"] = bool(obj.ViewObject.Visibility) if obj.ViewObject else True
        except Exception:
            item["visible"] = True
        out.append(item)
    return {"ok": True, "objects": out}


def get_object_properties(payload, doc):
    target = _resolve_doc(doc, payload.get("document_id"))
    obj_id = payload["object_id"]
    obj = target.getObject(obj_id)
    if obj is None:
        raise LookupError(f"unknown object: {obj_id}")
    props = {}
    for name in obj.PropertiesList:
        try:
            value = getattr(obj, name)
            props[name] = _serialise_property(value)
        except Exception as exc:
            props[name] = {"_error": str(exc)}
    return {
        "ok": True,
        "object_id": obj.Name,
        "label": obj.Label,
        "type": obj.TypeId,
        "properties": props,
    }


def _serialise_property(value):
    if isinstance(value, (int, float, bool, str)) or value is None:
        return value
    if isinstance(value, FreeCAD.Vector):
        return [value.x, value.y, value.z]
    if isinstance(value, FreeCAD.Placement):
        return {
            "position": [value.Base.x, value.Base.y, value.Base.z],
            "rotation": list(value.Rotation.Q),
        }
    if isinstance(value, (list, tuple)):
        return [_serialise_property(v) for v in value]
    if hasattr(value, "Name"):
        return {"_ref": value.Name}
    return repr(value)


def export_gltf(payload, doc):
    if Import is None:
        raise RuntimeError("Import module unavailable for glTF export")
    target = _resolve_doc(doc, payload.get("document_id"))
    objects = [o for o in target.Objects if hasattr(o, "Shape")]
    if not objects:
        empty = b"glTF" + (0x00000002).to_bytes(4, "little") + (0).to_bytes(4, "little")
        return {"ok": True, "data_base64": base64.b64encode(empty).decode("ascii"), "bytes": len(empty)}
    tmp = os.path.join(FreeCAD.ConfigGet("UserAppData") or "/tmp", f"buildoto-tool-export-{int(time.time() * 1000)}.glb")
    Import.export(objects, tmp)
    with open(tmp, "rb") as fh:
        data = fh.read()
    try:
        os.remove(tmp)
    except OSError:
        pass
    return {"ok": True, "data_base64": base64.b64encode(data).decode("ascii"), "bytes": len(data)}


def export_ifc(payload, doc):
    target = _resolve_doc(doc, payload.get("document_id"))
    path = payload.get("path") or os.path.join(
        FreeCAD.ConfigGet("UserAppData") or "/tmp",
        f"buildoto-export-{int(time.time() * 1000)}.ifc",
    )
    try:
        import exportIFC  # type: ignore
    except Exception as exc:
        raise RuntimeError(f"IFC export unavailable: {exc}")
    exportIFC.export(target.Objects, path)
    bytes_ = os.path.getsize(path) if os.path.exists(path) else 0
    return {"ok": True, "file_path": path, "bytes": bytes_}


def screenshot(payload, doc):
    raise NotImplementedError("screenshot requires a GUI build of FreeCAD; not supported in freecadcmd")


TOOLS = {
    "list_documents": list_documents,
    "get_objects": get_objects,
    "get_object_properties": get_object_properties,
    "export_gltf": export_gltf,
    "export_ifc": export_ifc,
    "screenshot": screenshot,
}
