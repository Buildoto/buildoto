# Reddit — r/BIM

*Draft. r/BIM est plus pro/AEC que r/freecad. Mettre en avant l'IFC / BIM / interop — qui est la fonctionnalité la plus demandée par cette audience. Publier **J+2, 2-3 h après le post r/freecad** pour éviter un effet « spam ».*

---

## Titre

```
Open-source AI-assisted BIM tooling on top of FreeCAD — v1.0 just released
```

*Alternative moins promotionnelle :*
- `Experimenting with LLM-assisted BIM workflows on FreeCAD — feedback wanted`

---

## Body

```
Sharing a project I've been working on: **Buildoto** (MIT, open source).
Think of it as Cursor — the AI coding assistant — but for architects
and structural engineers who already use FreeCAD.

The goal isn't "AI replaces BIM software"; it's removing the 30 %
repetitive Python-scripting / rebuilding-a-macro overhead from real
FreeCAD workflows so you can spend more time on judgment calls.

What v1.0 does today:
- Chat with an AI agent that can actually modify your `.FCStd` model:
  create walls/slabs/columns, extrude sketches, boolean ops, import
  STEP, run measurements.
- Each AI-made change is a Git commit — concrete change log, reversible.
- RAG-backed answers: when the hosted Buildoto AI model cites a source
  (DTU, Eurocode, FreeCAD wiki), you see the exact passage under the
  reply. Lets you verify before using in a deliverable.
- Bring your own model: Anthropic, OpenAI, Mistral, Google, OpenRouter,
  or Ollama (fully offline).

What it honestly doesn't do yet:
- **IFC export is not agent-piloted yet.** FreeCAD's File → Export →
  IFC works fine and is the current recommended path. The agent will
  get a dedicated IFC tool in v1.1.
- **No multi-user/collaboration.** One project, one user. If there's
  enough BIM interest, a Teams tier is planned for v1.2.
- **DTU / Eurocode corpus is partial.** English references are solid
  (FreeCAD wiki, OpenCASCADE docs); French DTUs and localized building
  codes are being ingested progressively.
- **Archicad / Revit interop?** Only through IFC round-trip via FreeCAD
  — no native plug-ins planned.

If you use FreeCAD in a professional context (even as a side tool for
one-off tasks), I'd love to hear:
1. What's the one BIM task that eats most of your time and could use AI
   assistance?
2. How much do you trust an AI assistant to write to your production
   model? (We made it commit-per-change precisely to make trust
   recoverable if the AI goofs.)
3. Would bundled FreeCAD be an issue for anyone who already runs a
   pinned version with plugins?

Install (Mac/Windows/Linux, unsigned — install guide handles the OS
warnings): https://buildoto.com/install

Code: https://github.com/buildoto/buildoto

I'm the solo dev (20 years in architecture). AMA.
```

---

## Attention règles r/BIM

- Les mods demandent souvent une participation régulière avant d'autoriser un post produit. **Vérifier qu'on a déjà au moins 5-10 commentaires d'appui sur d'autres posts de la sub.** Sinon, démarcher un mod par DM avant de poster.
- Flair: choisir « Discussion » ou « Software ».
- Mentionner explicitement le side projet / open source — r/BIM apprécie la transparence.

## Commentaires attendus

- « Does it do QTO / cost estimation? » → non, pas v1.0, noté roadmap.
- « Pricing? » → app gratuite MIT, service cloud optionnel 19 €/mois.
- « Why not build on BlenderBIM? » → BlenderBIM est excellent pour IFC-first workflows ; notre cible est des AEC users qui utilisent déjà FreeCAD pour la géométrie. Complémentaires plutôt que concurrents.
- « AI and building regulations?? Liability?? » → répondre *exactement* ce qu'on dit dans la FAQ: sources visibles, utilisateur responsable de la vérification avant livrable, clause dans CGU.
