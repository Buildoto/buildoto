"""Buildoto FreeCAD sidecar runner.

Runs inside freecadcmd. Connects to the Electron main process over a local TCP
socket and processes JSON-RPC style messages. Framing: each message is a single
line of JSON terminated by b'\\n' (UTF-8). A 4-byte big-endian length prefix is
NOT used — newline-delimited JSON is sufficient since JSON serialisation escapes
all newlines inside payloads. Large glTF base64 payloads remain on a single line.

Protocol matches packages/shared/src/freecad-protocol.ts.
"""

from __future__ import annotations

import base64
import io
import json
import os
import socket
import struct
import sys
import time
import traceback
from contextlib import redirect_stderr, redirect_stdout

try:
    import FreeCAD  # type: ignore
    import Import  # type: ignore  # glTF/STEP import-export module
except Exception as exc:  # pragma: no cover — fails outside freecadcmd
    sys.stderr.write(f"[runner] FreeCAD import failed: {exc}\n")
    sys.exit(2)

# Make the bundled handlers package importable when freecadcmd runs this file
# directly (sys.path[0] is set to the script's dir, so a sibling package import
# works once we ensure that dir is present).
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

import handlers  # noqa: E402  (after sys.path tweak)


DOC_NAME = "Buildoto"


def _get_or_create_doc():
    doc = FreeCAD.getDocument(DOC_NAME) if DOC_NAME in [d.Name for d in FreeCAD.listDocuments().values()] else None
    if doc is None:
        doc = FreeCAD.newDocument(DOC_NAME)
    FreeCAD.setActiveDocument(doc.Name)
    return doc


def _reset_doc():
    for name in list(FreeCAD.listDocuments().keys()):
        FreeCAD.closeDocument(name)
    return _get_or_create_doc()


def _exec_python(code: str, timeout_ms: int) -> dict:
    doc = _get_or_create_doc()
    out_buf = io.StringIO()
    err_buf = io.StringIO()
    start = time.monotonic()
    ns = {
        "App": FreeCAD,
        "FreeCAD": FreeCAD,
        "doc": doc,
    }
    try:
        import Part  # type: ignore
        ns["Part"] = Part
    except Exception:
        pass
    try:
        import Draft  # type: ignore
        ns["Draft"] = Draft
    except Exception:
        pass
    try:
        import Arch  # type: ignore
        ns["Arch"] = Arch
    except Exception:
        pass

    with redirect_stdout(out_buf), redirect_stderr(err_buf):
        exec(compile(code, "<agent>", "exec"), ns)
        doc.recompute()
    duration_ms = int((time.monotonic() - start) * 1000)
    return {
        "stdout": out_buf.getvalue(),
        "stderr": err_buf.getvalue(),
        "duration_ms": duration_ms,
    }


def _mesh_to_glb(objects: list) -> bytes:
    """Build a minimal binary glTF from FreeCAD objects with Shape.
    
    Works without the optional import_glTF module. Uses shape.tessellate()
    which is available in every FreeCAD build.
    Returns the raw .glb bytes."""
    vertices = []  # flat [x,y,z, x,y,z, ...]
    indices = []   # flat [i,j,k, i,j,k, ...]
    offset = 0

    for obj in objects:
        try:
            shape = obj.Shape
            if shape is None or shape.isNull():
                continue
            # Tessellate with a fine linear deflection
            mesh_data = shape.tessellate(1.0)  # 1 mm deflection
            verts = mesh_data[0]  # list of Vector
            faces = mesh_data[1]  # list of tuples (i,j,k)
            for v in verts:
                vertices.extend([v.x, v.y, v.z])
            for f in faces:
                indices.extend([f[0] + offset, f[1] + offset, f[2] + offset])
            offset += len(verts)
        except Exception:
            continue

    if not vertices or not indices:
        return b"glTF" + (0x00000002).to_bytes(4, "little") + (0).to_bytes(4, "little")

    vertex_count = len(vertices) // 3
    index_count = len(indices)

    # Compute bounding box
    min_x = min_y = min_z = float("inf")
    max_x = max_y = max_z = float("-inf")
    for i in range(0, len(vertices), 3):
        x, y, z = vertices[i], vertices[i+1], vertices[i+2]
        min_x = min(min_x, x)
        min_y = min(min_y, y)
        min_z = min(min_z, z)
        max_x = max(max_x, x)
        max_y = max(max_y, y)
        max_z = max(max_z, z)

    # Pack into binary glTF
    vert_bytes = struct.pack(f"<{len(vertices)}f", *vertices)
    idx_bytes = struct.pack(f"<{len(indices)}I", *indices)
    bin_data = vert_bytes + idx_bytes

    max_index = max(indices) if indices else 0

    json_str = json.dumps({
        "asset": {"version": "2.0", "generator": "buildoto"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "material": 0}]}],
        "materials": [{
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.6, 0.6, 0.65, 1.0],
                "metallicFactor": 0.2,
                "roughnessFactor": 0.6,
            },
        }],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": vertex_count,
             "type": "VEC3", "min": [min_x, min_y, min_z], "max": [max_x, max_y, max_z]},
            {"bufferView": 1, "componentType": 5125, "count": index_count,
             "type": "SCALAR", "min": [0], "max": [max_index]},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(vert_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": len(vert_bytes), "byteLength": len(idx_bytes), "target": 34963},
        ],
        "buffers": [{"byteLength": len(bin_data)}],
    }, separators=(",", ":"))

    json_bytes = json_str.encode("utf-8")
    # Pad to 4 bytes
    while len(json_bytes) % 4:
        json_bytes += b" "
    while len(bin_data) % 4:
        bin_data += b"\x00"

    # Build GLB
    glb = struct.pack("<I", 0x46546C67)  # magic glTF
    glb += struct.pack("<I", 2)           # version 2
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    glb += struct.pack("<I", total)       # total length
    glb += struct.pack("<I", len(json_bytes))
    glb += struct.pack("<I", 0x4E4F534A)  # JSON chunk type
    glb += json_bytes
    glb += struct.pack("<I", len(bin_data))
    glb += struct.pack("<I", 0x004E4942)  # BIN chunk type
    glb += bin_data
    return glb


def _export_gltf(doc_name: str | None) -> dict:
    target_doc = FreeCAD.getDocument(doc_name) if doc_name else FreeCAD.ActiveDocument
    if target_doc is None:
        return {"error": "DOCUMENT_NOT_FOUND", "message": f"document {doc_name!r} not found"}

    objects = [o for o in target_doc.Objects if hasattr(o, "Shape") and o.Shape and not o.Shape.isNull()]
    if not objects:
        return {
            "data": base64.b64encode(
                b"glTF" + (0x00000002).to_bytes(4, "little") + (0).to_bytes(4, "little")
            ).decode("ascii"),
            "bytes": 12,
        }

    glb_bytes = _mesh_to_glb(objects)
    return {"data": base64.b64encode(glb_bytes).decode("ascii"), "bytes": len(glb_bytes)}


def _handle(msg: dict) -> dict:
    mid = msg.get("id", "_unknown")
    mtype = msg.get("type")
    try:
        if mtype == "ping":
            return {"id": mid, "type": "pong"}
        if mtype == "exec_python":
            timeout_ms = int(msg.get("timeout_ms") or 30_000)
            result = _exec_python(msg["code"], timeout_ms)
            return {"id": mid, "type": "result", **result}
        if mtype == "export_gltf":
            out = _export_gltf(msg.get("doc_name"))
            if "error" in out:
                return {"id": mid, "type": "error", "message": out["message"], "code": out["error"]}
            return {"id": mid, "type": "gltf", "mime": "model/gltf-binary", **out}
        if mtype == "tool_invoke":
            doc = _get_or_create_doc()
            data = handlers.dispatch(msg["tool_id"], msg.get("payload") or {}, doc)
            doc.recompute()
            # Auto-export glTF so the TypeScript side gets viewport data
            # without needing a second round-trip. Read-only tools (introspection)
            # set a flag so we don't export if not needed.
            if not data.get("_readonly"):
                gltf = _export_gltf(None)
                if "error" not in gltf:
                    data["_viewport_gltf"] = gltf["data"]
                    data["_viewport_bytes"] = gltf["bytes"]
            return {"id": mid, "type": "tool_result", "data": data}
        if mtype == "reset_document":
            _reset_doc()
            return {"id": mid, "type": "result", "stdout": "", "stderr": "", "duration_ms": 0}
        if mtype == "shutdown":
            return {"id": mid, "type": "result", "stdout": "bye", "stderr": "", "duration_ms": 0}
        return {"id": mid, "type": "error", "message": f"unknown type {mtype}", "code": "INVALID_REQUEST"}
    except KeyError as exc:
        if mtype == "tool_invoke":
            return {
                "id": mid,
                "type": "error",
                "message": f"unknown tool: {exc!s}",
                "traceback": traceback.format_exc(),
                "code": "TOOL_NOT_FOUND",
            }
        return {
            "id": mid,
            "type": "error",
            "message": str(exc),
            "traceback": traceback.format_exc(),
            "code": "PYTHON_EXCEPTION",
        }
    except NotImplementedError as exc:
        return {
            "id": mid,
            "type": "error",
            "message": str(exc) or "tool not implemented",
            "traceback": traceback.format_exc(),
            "code": "TOOL_NOT_IMPLEMENTED",
        }
    except LookupError as exc:
        return {
            "id": mid,
            "type": "error",
            "message": str(exc),
            "traceback": traceback.format_exc(),
            "code": "OBJECT_NOT_FOUND",
        }
    except Exception as exc:
        return {
            "id": mid,
            "type": "error",
            "message": str(exc),
            "traceback": traceback.format_exc(),
            "code": "PYTHON_EXCEPTION",
        }


def _send(sock: socket.socket, obj: dict) -> None:
    payload = (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8")
    sock.sendall(payload)


def _recv_lines(sock: socket.socket):
    buf = b""
    while True:
        chunk = sock.recv(65536)
        if not chunk:
            return
        buf += chunk
        while b"\n" in buf:
            line, buf = buf.split(b"\n", 1)
            if line:
                yield line


def _main() -> int:
    port = int(os.environ.get("BUILDOTO_SIDECAR_PORT") or 0)
    host = os.environ.get("BUILDOTO_SIDECAR_HOST") or "127.0.0.1"
    token = os.environ.get("BUILDOTO_SIDECAR_TOKEN") or ""
    if not port:
        sys.stderr.write("[runner] BUILDOTO_SIDECAR_PORT not set\n")
        return 2

    sock = socket.create_connection((host, port), timeout=10)
    sock.settimeout(None)
    _send(sock, {"id": "_handshake", "type": "handshake", "token": token})

    py_version = ".".join(str(v) for v in sys.version_info[:3])
    _send(
        sock,
        {
            "id": "_boot",
            "type": "ready",
            "version": FreeCAD.Version()[0] + "." + FreeCAD.Version()[1] + "." + FreeCAD.Version()[2],
            "python_version": py_version,
        },
    )

    for raw in _recv_lines(sock):
        try:
            msg = json.loads(raw.decode("utf-8"))
        except Exception as exc:
            _send(sock, {"id": "_parse", "type": "error", "message": str(exc), "code": "INVALID_REQUEST"})
            continue
        response = _handle(msg)
        _send(sock, response)
        if msg.get("type") == "shutdown":
            break

    sock.close()
    return 0


# freecadcmd loads this file as a module (sets __name__ to "runner"), so the
# standard `__name__ == "__main__"` guard never fires. Boot unconditionally
# once the env var is present — that var is only set by the Electron sidecar
# manager, so running the file by hand (e.g. `python3 runner.py`) still stays
# import-safe for developers poking at it.
if os.environ.get("BUILDOTO_SIDECAR_PORT"):
    sys.exit(_main())
