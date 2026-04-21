"""Sketcher workbench handlers (stubs — wired sprint 4)."""

from __future__ import annotations


def sketcher_create_rectangle(payload, doc):
    raise NotImplementedError("sketcher_create_rectangle is planned for sprint 4")


def sketcher_create_circle(payload, doc):
    raise NotImplementedError("sketcher_create_circle is planned for sprint 4")


def sketcher_close_sketch(payload, doc):
    raise NotImplementedError("sketcher_close_sketch is planned for sprint 4")


TOOLS = {
    "sketcher_create_rectangle": sketcher_create_rectangle,
    "sketcher_create_circle": sketcher_create_circle,
    "sketcher_close_sketch": sketcher_close_sketch,
}
