# Hacker News — Show HN

*Draft — HN est le canal le plus stratégique mais aussi le plus impitoyable. Cibler **un mardi J+1, 07:00 Pacific Time** (≈ 16:00 CET). Se bloquer 4 h après publication pour répondre — 80 % de la traction d'un post HN vient de la réactivité aux commentaires.*

---

## Titre

```
Show HN: Buildoto – Vibe-building with FreeCAD and AI
```

*Alternatives si le premier est rejeté par `hn.algolia.com` comme déjà pris :*
- `Show HN: Buildoto – an open-source IDE for building design`
- `Show HN: Buildoto – Cursor-like experience for FreeCAD`

*URL du post :* `https://buildoto.com` (pas le GitHub — HN permet d'ajouter le GitHub en commentaire 1).

---

## Body (HN autorise ~2500 caractères, on en utilise ~1800)

```
Hi HN — Buildoto is an open-source Electron desktop app that wraps
FreeCAD with an AI coding-agent loop and Git versioning. Think "Cursor,
but for architects and structural engineers using FreeCAD."

Why: FreeCAD is the only viable open-source BIM/CAD tool but its UI is
notoriously hostile. Meanwhile AI agents (Claude, GPT) are great at
generating Python scripts — and FreeCAD is fully scriptable in Python.
So we close the loop: you describe what you want in natural language,
an agent calls FreeCAD via a local sidecar, you see the geometry update.

How it's built:
- Electron 34 + Vite + React 19. Main-process-only access to FS /
  FreeCAD / git. Renderer is pure UI, no Node access.
- FreeCAD sidecar: we bundle `freecadcmd`, spawn it at launch, speak to
  it over a local WebSocket with a typed protocol (23 tools). Auto-restart
  on crash.
- Agent loop: forked from OpenCode (thanks @sst), vendored as
  `@buildoto/opencode-core`. Tool calls, streaming, MCP support.
- Multi-provider: Anthropic, OpenAI, Mistral, Google, OpenRouter, Ollama,
  or our hosted Buildoto AI (Mistral-Large + RAG over an AEC corpus).
- Every AI-made modification is an auto-commit. Git history = change log
  of your building.

What's unique vs "just use Claude":
- The RAG corpus is AEC-specific (FreeCAD wiki, OpenCASCADE docs, a
  selection of DTU/building-code content). Sources are returned in a
  response header and rendered under each answer in-app — clickable,
  verifiable. Reduces hallucination risk for regulatory content.

What's rough:
- Binaries are unsigned (Apple dev cert + EV Windows cert = ~$280/yr
  we don't want to burn yet). Install guide covers Gatekeeper /
  SmartScreen / AppImage chmod.
- Corpus is skewed English; French DTUs only partially ingested.
- No real-time multi-user yet. One user, one project.
- Export-to-IFC works via FreeCAD menu but not yet agent-piloted.

Code: https://github.com/buildoto/buildoto  (MIT)
Install: https://buildoto.com/install  (Mac/Win/Linux)

Happy to answer anything — architecture, pricing model, how RAG
sources are wired, why we forked OpenCode.
```

---

## Commentaire #1 — à poster **immédiatement après publication** par l'auteur

*But : ancrer en haut un FAQ anticipé et les liens complémentaires. Dans l'historique HN c'est ce qui monte avec le post.*

```
A few anticipated questions:

• "Is this just Claude with a FreeCAD wrapper?" — The wrapper is the
  hard part. FreeCAD has 23 working tools behind a typed WebSocket
  protocol with auto-restart on segfault (which happens on big
  Assembly4 files). That took 3 sprints. The LLM part is swappable —
  you can run it offline with Ollama.

• "Why not a FreeCAD extension?" — Distribution (FreeCAD addon
  manager is friction-heavy for AEC users), and we need main-process
  control over the FS + git + keychain that a Python addon can't do
  cleanly.

• "What's the business model?" — App is MIT, free forever. We run a
  hosted service (Buildoto AI) for ~$19/mo that gives you a
  RAG-augmented AEC model. You don't have to use it — bring your own
  Claude/GPT/Mistral key.

• "Privacy?" — API keys live in the OS keychain (keytar), never on
  disk in plaintext, never in renderer memory. Your .FCStd files
  stay local. We log request latency only, no prompt retention.

• "Why 'vibe-building'?" — Nod to vibe-coding. The demo moment is
  describing a wall and seeing it appear. Felt right.

Docs: https://docs.buildoto.com
Release notes v1.0: https://github.com/buildoto/buildoto/releases/tag/v1.0.0
```

---

## Checklist avant post

- [ ] Être **loggé sur HN avec un compte > 1 an** (les comptes neufs sont shadowbannés).
- [ ] **Jour** : mardi, mercredi, jeudi. Pas lundi (trafic weekend), pas vendredi (post meurt).
- [ ] **Heure** : 07:00 PT (= 16:00 CET). Trafic HN pique entre 08:00 PT et 11:00 PT.
- [ ] Ne **pas** demander des upvotes ailleurs (Twitter, Discord). Auto-ban.
- [ ] Ne **pas** republier si le post n'accroche pas. 1 tentative.
- [ ] Si titre refusé par dup : tenter une des alternatives ci-dessus.

## Checklist pendant les 4 premières heures

- [ ] Répondre à chaque commentaire top-level en < 20 min.
- [ ] Si un commentaire est factuellement faux : corriger poliment, sources à l'appui.
- [ ] Si un commentaire est toxique : laisser la communauté répondre. Pas escalader.
- [ ] Suivre `hnrankings.info` ou `hn.algolia.com` pour voir la position en temps réel.
- [ ] Si on atteint front page top 30 : tenir la permanence 2 h de plus.

## Si post meurt (< 5 points en 2 h)

- Pas de drama. C'est 80 % du destin des Show HN.
- Ne pas retenter avec le même titre.
- Capitaliser sur les 3-4 personnes qui ont commenté — les ajouter à la newsletter / Discord.
