"""Per-workbench FreeCAD tool handlers.

Each module exposes a `TOOLS` dict mapping tool_id -> callable(payload, doc)
-> dict. The callable is expected to be pure with respect to state beyond the
active FreeCAD document — return a JSON-serialisable dict describing what was
produced (object_id, dimensions, etc.).

Handlers throw Python exceptions; the runner converts those to wire-level
error frames with code PYTHON_EXCEPTION. A dedicated NotImplementedError is
mapped to code TOOL_NOT_IMPLEMENTED.
"""

from __future__ import annotations

from . import part, arch, introspect, sketcher, draft, spreadsheet


ALL_TOOLS = {}
for mod in (part, arch, introspect, sketcher, draft, spreadsheet):
    for tool_id, fn in getattr(mod, "TOOLS", {}).items():
        if tool_id in ALL_TOOLS:
            raise RuntimeError(f"duplicate tool_id: {tool_id}")
        ALL_TOOLS[tool_id] = fn


def dispatch(tool_id: str, payload, doc):
    fn = ALL_TOOLS.get(tool_id)
    if fn is None:
        raise KeyError(tool_id)
    return fn(payload or {}, doc)
