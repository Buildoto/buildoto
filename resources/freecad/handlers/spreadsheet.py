"""Spreadsheet workbench handlers."""

from __future__ import annotations


def spreadsheet_write(payload, doc):
    name = payload.get("sheet_name") or "Spreadsheet"
    cells = payload.get("cells") or {}
    sheet = doc.getObject(name)
    if sheet is None:
        sheet = doc.addObject("Spreadsheet::Sheet", name)
    for ref, value in cells.items():
        sheet.set(ref, str(value))
    doc.recompute()
    return {
        "ok": True,
        "object_id": sheet.Name,
        "label": sheet.Label,
        "cells_written": len(cells),
    }


TOOLS = {
    "spreadsheet_write": spreadsheet_write,
}
