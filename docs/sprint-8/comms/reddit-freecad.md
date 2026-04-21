# Reddit — r/freecad

*Draft. Ton dev/user humble. r/freecad tolère l'auto-promo si elle apporte quelque chose à la communauté. Publier **J+2 matin CET** (J+2 après-midi si HN a cartonné — laisser le post HN respirer). Utiliser un compte Reddit > 6 mois, avec un peu de karma dans la sub (commentaires sur autres posts).*

---

## Titre

```
[Show] I built an open-source desktop app that drives FreeCAD from an AI agent — v1.0 out today
```

*Alternatives plus humbles :*
- `Open-source Electron app wrapping FreeCAD with an AI agent + Git versioning`
- `Feedback wanted: I bundled FreeCAD into an Electron IDE with AI scripting`

---

## Body

```
Hi r/freecad,

TL;DR — I built **Buildoto** (MIT, GitHub: buildoto/buildoto), an Electron
app that bundles `freecadcmd` as a sidecar and lets an AI agent drive
FreeCAD via Python scripts. v1.0 ships today for Mac/Win/Linux. Not
a replacement for FreeCAD — a thin layer on top of it.

Why I built it: I'm an architect, been using FreeCAD on real projects
for years. The Python API is powerful but writing and debugging a macro
every time you want to batch-place beams is tedious. LLMs are great
at writing FreeCAD Python. So I wired the loop: you describe what you
want, the agent writes the script, FreeCAD executes it, geometry
updates in a 3D viewport inside the app.

Technical bits that might interest this sub:
- `freecadcmd` is spawned as a subprocess and talks to the main process
  over a local WebSocket with a typed protocol (23 tools exposed:
  create_box, extrude, boolean_union, import_step, etc.).
- Auto-restart on segfault — apparently common on heavy Assembly4
  files. The app queues pending requests while the sidecar comes back.
- Every modification the agent makes is a Git commit. So you can
  `git diff` a building, roll back, branch, etc.
- Geometry is exported to glTF for the in-app 3D viewport (three.js).
  The 3D view is **read-only** — all edits round-trip through FreeCAD.

What this is NOT:
- A fork of FreeCAD (zero patches to upstream, we just spawn binaries).
- A replacement for Part Design / Sketcher (you still open `.FCStd` in
  FreeCAD proper for detailed work — Buildoto is better for repetitive
  or structural tasks).
- Always right (LLMs hallucinate; we show RAG sources to make it
  auditable but you still need to verify).

What I'd love feedback on:
1. Does the bundled FreeCAD policy feel right? We ship `freecadcmd` to
   avoid forcing users to install and version-match themselves. But
   advanced users may want to point at their own FreeCAD build — not
   supported yet.
2. Tool coverage (23 today). What's missing for your workflow?
3. The "Git = history" pattern — too dev-heavy for traditional AEC
   users? We made it optional.

Install (unsigned binaries, guide explains the OS warnings):
https://buildoto.com/install

Code: https://github.com/buildoto/buildoto

Happy to answer anything. If a core FreeCAD dev sees this and wants to
flag anything problematic about the sidecar approach, please do — better
to fix it now.
```

---

## Règles à respecter

- r/freecad : pas de **no-self-promotion** stricte, mais la sub attend du contenu technique. Ne pas poster si on peut pas répondre aux questions pendant 3-4 h.
- **Flair** : utiliser le flair « Discussion » ou « Development », pas « Help »/« Question ».
- **Ne pas crossposter** à l'identique sur r/BIM et r/architecture. Adapter.

## À surveiller dans les commentaires

- Critique du sidecar (licence GPL FreeCAD vs notre MIT) → répondre avec le fait qu'on ne distribue pas FreeCAD patché, juste les binaires officiels, avec attribution et lien source. On a validé ça en amont (cf. `docs/sprint-8/legal-notes.md` si tu l'as écrit, sinon réponse plus prudente).
- Demandes de features spécifiques → répondre « ouvrir une issue GitHub », ne pas promettre de date.
- Mention d'un autre outil concurrent → ne pas descendre, lister les différences factuelles.
