# X/Twitter — thread de launch

*Draft. Utilité principale : URL de référence linkée depuis LinkedIn/Reddit/HN. Publier **J+2 après-midi CET** une fois que HN + Reddit ont donné leur verdict. Ajouter GIF/vidéo à T1 et T4.*

---

## Format

Thread de 7 tweets. Chaque tweet ≤ 280 caractères (compte les liens en 23 chars). Le premier tweet doit pouvoir vivre seul.

---

## T1 — hook + vidéo démo

```
Built Buildoto over 18 months — an AI agent that drives FreeCAD in real
time, with Git versioning every change.

Just shipped v1.0. MIT, open source.

20 years in architecture → the tool I wish I'd had on day one.

🎥 Demo ↓
```

*📎 Joindre la vidéo 45 s du moment aha (prompt → FreeCAD → commit).*

---

## T2 — pourquoi

```
Why: FreeCAD is the only viable open-source BIM/CAD tool. Its Python
API is powerful but tedious.

LLMs write FreeCAD Python really well. So I closed the loop:
describe it → agent runs the script → geometry updates.

Like Cursor, but for buildings.
```

---

## T3 — stack

```
Stack:
• Electron 34 + React 19
• FreeCAD bundled as a WebSocket sidecar (auto-restarts on segfault)
• 23 structured tools exposed to the agent
• Forked OpenCode loop for agent + MCP support
• Git autocommits every AI modification
```

---

## T4 — sources RAG (différenciateur)

```
The killer feature isn't the agent — it's the sources.

Ask about a building regulation, you get the answer + the exact
source passage rendered under the reply, clickable, verifiable.

No more "the AI told me so." RAG over an AEC corpus, headers or SSE.

🎥 ↓
```

*📎 GIF 8 s de l'ouverture du drawer sources sous une réponse.*

---

## T5 — le business, honnête

```
MIT app. Free forever.

Optional hosted service (Buildoto AI) gives you a RAG-augmented model
for €19/mo. You don't need it — bring your own Claude/GPT/Mistral/
Ollama key, it all works the same.

100 requests/mo free to try Buildoto AI.
```

---

## T6 — limites, honnêtes aussi

```
What v1.0 does NOT do:
• Real-time multi-user (v1.2 if there's demand)
• Agent-piloted IFC export (manual via FreeCAD menu, v1.1)
• Full French DTU corpus (partial; expanding)
• Signed binaries (unsigned for now, install guide covers Gatekeeper/SmartScreen)

Trade-offs documented.
```

---

## T7 — CTA

```
Try it: https://buildoto.com
Code: https://github.com/buildoto/buildoto
Pitch for Buildoto AI: https://buildoto.com/ai

RTs appreciated. Feedback even more so — I'm the solo dev and I
read every DM.
```

---

## Post-publication

- **Épingler le thread** sur le profil pendant 2 semaines.
- **Re-tweeter le T1** une fois à J+3 (nouvelles timezone US/Asia), avec un quote de type « ICYMI ».
- **Ne pas re-tweeter plus de 2 fois**. L'algo pénalise.
- **Répondre à tous les QTs/mentions pendant 48 h.**

## Si un influenceur AEC like/RT

- Remercier par DM dans les 2 h.
- Proposer démo 15 min.
- Ne pas tag d'autres influenceurs en réponse — hard flag.

## Ne PAS faire

- Pas de `#hashtags` dans le corps des tweets — X a dégradé leur ranking en 2024.
- Pas de lien dans le T1 (l'algo dégrade les tweets avec lien sortant en position de hook).
- Pas d'emoji dans chaque tweet — 1-2 par thread max.
