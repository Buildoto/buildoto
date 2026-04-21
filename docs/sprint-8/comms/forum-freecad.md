# Forum FreeCAD — forum.freecad.org

*Draft. **Canal primaire technique** — la communauté FreeCAD est tolérante si on est transparent, hostile si on over-sell. Publier **J0 à 10:30 CET** juste après le post LinkedIn. Ton : humble, factuel, surtout pas « annonce produit ».*

---

## Section cible

**Category:** « Users Showcase » ou « Developer's Corner » — éviter « General » (moins visible) et « Help » (mauvais canal).

Si le modérateur bouge le thread, c'est OK — ne pas insister.

---

## Titre

```
New project: Buildoto — Electron desktop app spawning freecadcmd as a sidecar, controlled by an AI agent. v1.0 just released.
```

*Alternative courte :*
- `Sharing a project: AI-driven IDE wrapping freecadcmd (open source, MIT)`

---

## Body

```
Hello everyone,

I've been lurking here for years using FreeCAD in my architecture
practice, and I want to share a project I've been building on top
of it. It's called Buildoto (MIT, github.com/buildoto/buildoto), and
it just hit v1.0.

**What it is**

An Electron desktop app that bundles `freecadcmd` and communicates
with it via a local WebSocket. An AI agent (Claude/GPT/Mistral/
Ollama — user's choice) writes Python scripts, sends them to the
sidecar, FreeCAD executes, the resulting geometry gets exported to
glTF and shown in a three.js viewport inside the app. Every AI
modification is automatically git-committed so the user has a
revert path.

**What it is NOT**

- Not a fork of FreeCAD. We don't patch anything. We just spawn
  `freecadcmd` from the official distribution binaries.
- Not a replacement for FreeCAD. For detailed sketching / Part
  Design / Assembly work, users still open `.FCStd` files in
  FreeCAD proper. Buildoto is for the batched/scripted/AI-assisted
  part of the workflow.
- Not a wrapper around a single LLM. Multi-provider, including
  fully-offline Ollama.

**Why I'm posting here**

A few questions I'd genuinely like input on from this community:

1. **Sidecar approach.** We bundle `freecadcmd` binaries for
   macOS/Windows/Linux (downloaded at postinstall from the
   official releases, not re-hosted). License-wise I believe this
   is fine because FreeCAD itself is LGPL and we're invoking it as
   an external process, not linking. But if a core dev disagrees I
   really want to know now before the launch amplifies.

2. **Tool coverage.** I've wrapped 23 FreeCAD primitives as typed
   tools (create_box, extrude, boolean_union, import_step, etc.).
   Looking for feedback on what's missing for real workflows —
   especially from BIM users (NativeIFC users in particular).

3. **Version pinning.** Right now we ship a specific FreeCAD build.
   Users can't point at their own. This is intentional for v1.0
   (fewer support matrices) but I know it'll frustrate power users.
   Planning an "advanced" option for v1.1 — any thoughts on the
   right mechanism (env var? app setting? .freecadrc-style file?)

**Technical specifics for the curious**

- Agent loop forked from OpenCode
  (github.com/sst/opencode) — MIT. Vendored as
  `@buildoto/opencode-core` in our monorepo.
- Sidecar protocol is typed (TypeScript `packages/shared/` →
  Python `freecad_sidecar/`). Messages flow over ws://localhost.
- Auto-restart on segfault: sidecar process is monitored,
  restarted, pending requests re-queued. Catches the classic
  Assembly4-on-heavy-model crash.
- Optional RAG layer: we run a hosted service (Buildoto AI) with
  a corpus of FreeCAD wiki + OpenCASCADE docs + selected AEC
  references. Sources are rendered under answers in-app. This
  service is commercial; the desktop app stays MIT free-to-use
  with any other provider.

**Install**

Unsigned binaries, the website explains how to get past Gatekeeper
/SmartScreen/chmod: https://buildoto.com/install

Code: https://github.com/buildoto/buildoto

Thanks for reading, and thanks for FreeCAD. The fact that this
project is possible is a testament to how powerful FreeCAD's
scripting API is.
```

---

## À surveiller après publication

- **Réponse d'un core dev** (especially Kunda1, yorik, wmayer) — répondre dans l'heure. Leur avis oriente la perception de la communauté.
- **Licences** — si quelqu'un soulève la compat LGPL/MIT sur le bundling, avoir prêt : on ne link pas, on invoque un binaire externe non patché, attribution claire dans /install et /about. Si doute, on retire le bundle et on demande à l'utilisateur d'installer FreeCAD séparément — prêt à pivoter.
- **Questions techniques** — répondre toujours plus précisément que la question. Le forum valorise la profondeur.

## Ce qu'il ne faut PAS faire

- Pas de « révolutionnaire », « disruptif », « game changer ».
- Pas de benchmark marketing (« 10× plus rapide que… »).
- Pas de réponse condescendante aux critiques, même injustifiées.
- Pas de mention Buildoto AI (commercial) dans le titre. Ça vient en bas du body, une fois la partie technique honorée.
