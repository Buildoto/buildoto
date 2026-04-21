# Kickoff Claude Code — Buildoto Sprint 3
*Embedding OpenCode + multi-provider + MCP + tools FreeCAD étendus*

---

## 1. Contexte

**Sprint 3 de Buildoto.** Après sprint 2 : projets, GitHub, persistence. L'agent fonctionne mais il est minimaliste — un seul provider (Claude), un seul tool (`executer_python_freecad`), pas de modes, pas de plans, pas de MCP.

Ce sprint remplace l'agent maison par le **vrai moteur OpenCode embarqué** + **élargit les tools FreeCAD** à tout l'écosystème (Sketcher, Draft, Part, Arch, Spreadsheet, etc.).

---

## 2. Mission de ce sprint

1. Extraire les packages core d'OpenCode (boucle agentique, providers, tool system, MCP client) et les embarquer dans le main process Buildoto — pas comme dépendance externe, comme **code intégré**.
2. Supporter les providers multiples : Anthropic, OpenAI, Mistral, Gemini, Ollama local.
3. Exposer **chaque workbench FreeCAD** comme un tool structuré pour l'agent, avec documentation injectée.
4. Supporter les **serveurs MCP externes** (l'utilisateur peut ajouter ses propres MCP).

---

## 3. Stratégie d'embedding OpenCode

**Ne pas forker le repo OpenCode entier.** Approche plus propre :

- Identifier dans le repo OpenCode les packages réutilisables : `@opencode-ai/core`, `@opencode-ai/providers`, `@opencode-ai/tools`, `@opencode-ai/mcp` (noms exacts à valider en lisant le monorepo).
- Les consommer via **npm (si publiés)** ou **git submodule + build local** (si non publiés).
- Écrire un **adaptateur Buildoto** dans `packages/main/src/agent/opencode-adapter.ts` qui :
  - Initialise la boucle OpenCode avec notre config
  - Remplace le registry de tools par notre registry étendu FreeCAD
  - Redirige les events (token streaming, tool calls) vers notre IPC renderer
  - Gère le lifecycle (start, pause, cancel) via nos contrôles UI

**Si les packages OpenCode ne sont pas publiés npm** : on ajoute leur repo comme submodule Git dans `vendor/opencode/`, on build leurs packages via pnpm workspace, et on les consomme via `workspace:*` protocol.

**Principe directeur :** le moins de code OpenCode modifié possible. Toute logique Buildoto-spécifique vit dans notre adaptateur, pas dans le code OpenCode. Ça rend les merges upstream indolores.

---

## 4. Multi-provider

Providers supportés via OpenCode (qui les gère nativement) :

- **Anthropic Claude** (avec support Claude Pro/Max via OAuth si dispo)
- **OpenAI GPT-4/5** (API key)
- **Mistral** (API key — utile pour tester plus tard ton propre modèle Mistral+RAG)
- **Google Gemini** (API key)
- **Ollama** (local, URL configurable, aucun API key)
- **OpenRouter** (proxy multi-modèle)

Dans la settings UI :
- Liste des providers disponibles avec statut (connecté / non configuré)
- Pour chaque provider : champ API key, modèle par défaut sélectionné
- Un provider "par défaut" global pour les nouvelles sessions
- Overridable par projet dans `.buildoto/config.json`

---

## 5. Tools FreeCAD étendus

**Approche :** ne PAS créer un tool par fonction FreeCAD (il y en a des milliers). On expose :

- **Un tool générique** `executer_python_freecad` (déjà au sprint 1) — l'agent écrit du Python FreeCAD libre.
- **Des tools structurés pour les workbenches principaux** — l'agent peut les appeler directement sans écrire de Python, pour les actions courantes :
  - `sketcher_create_rectangle({ width, height, plan })`
  - `part_create_box({ length, width, height, position })`
  - `arch_create_wall({ length, height, thickness, ... })`
  - `draft_line({ start, end })`
  - `spreadsheet_write({ cells })`
  - etc.
- **Des tools d'introspection** :
  - `list_documents()` : documents FreeCAD ouverts
  - `get_objects(document_id)` : objets dans un document
  - `get_object_properties(object_id)` : propriétés d'un objet
  - `export_gltf(document_id) -> path` : exporte en glTF pour le viewport
  - `export_ifc(document_id) -> path` : exporte en IFC
  - `screenshot(document_id, view) -> png` : capture d'écran 3D

**Registry des tools :** un fichier `packages/main/src/tools/registry.ts` qui liste tous les tools avec leur schéma JSON Claude-compatible, leur docstring, et leur handler.

**Documentation injectée :** avant d'envoyer le prompt à l'agent, on injecte dans le system prompt un résumé de l'API FreeCAD disponible + des patterns courants. Ce contenu vient de fichiers Markdown dans `packages/main/src/prompts/` — template de base, enrichi en phase 2 par le RAG.

---

## 6. Support MCP externes

OpenCode supporte nativement MCP (Model Context Protocol). On expose cette capacité :

- Section settings "Serveurs MCP" : liste des serveurs MCP configurés
- Pour chaque serveur : name, command (ex: `uvx mcp-server-git`), args, env vars
- Au démarrage de session, le main process lance les serveurs MCP, récupère leurs tools, les merge avec notre registry FreeCAD
- L'agent voit tous les tools en une liste unifiée

**Utilité concrète pour les techniciens AEC :**
- MCP "GitHub" : l'agent peut créer issues, PRs, rechercher dans le code
- MCP "Filesystem" : l'agent peut lire/écrire des fichiers hors du projet
- MCP "fetch" : l'agent peut consulter une doc en ligne
- MCP custom "DTU-reader" (exemple futur) : l'agent consulte ta base normative privée

---

## 7. Deliverables de ce sprint (ordre strict)

1. **Audit du monorepo OpenCode** : liste exacte des packages réutilisables, leur licence (doit être MIT ou compatible), leur état de publication npm. Produire un document `docs/opencode-audit.md` en début de sprint.
2. **Intégration des packages OpenCode** (via npm ou submodule).
3. **Adaptateur `agent/opencode-adapter.ts`** : bridge entre OpenCode core et notre main process. Remplace l'agent maison du sprint 1.
4. **Registry des tools étendu** : fichier central `tools/registry.ts` avec 15-25 tools FreeCAD structurés + les 3-5 tools d'introspection + le tool générique `executer_python_freecad`. Chaque tool testé en isolation.
5. **UI Settings enrichie** : providers multiples, MCP servers, model override par projet.
6. **Injecter la documentation FreeCAD** dans le system prompt via un fichier statique `prompts/freecad-overview.md` (contenu à rédiger — version courte et dense).
7. **Modes Build / Plan** repris d'OpenCode : en mode Plan, l'agent décrit ce qu'il va faire sans exécuter. En mode Build, il exécute. Toggle avec Tab.
8. **Sessions multi-provider** : changer de provider au milieu d'une session doit préserver l'historique (conversion transparente des messages au format du nouveau provider).
9. **Tests d'intégration** : un scénario qui démarre l'app, configure Claude + Mistral, lance une session, génère un mur via tools Arch, bascule vers Mistral, continue la session.

---

## 8. Critères d'acceptation

- [ ] L'agent utilisé est 100 % OpenCode core (notre code custom agent du sprint 1 est supprimé)
- [ ] Quatre providers différents fonctionnent au moins (Anthropic, OpenAI, Mistral, Ollama)
- [ ] Les tools FreeCAD structurés sont visibles dans les logs de l'agent (pas juste `executer_python_freecad`)
- [ ] Les mises à jour de la branche OpenCode upstream peuvent être mergées sans casser Buildoto (test avec un sync simulé)
- [ ] Un serveur MCP externe (ex: `mcp-server-fetch`) peut être ajouté dans settings et ses tools apparaissent à l'agent
- [ ] Les modes Build et Plan fonctionnent et sont toggleables
- [ ] Changer de provider en cours de session fonctionne sans perte de contexte

---

## 9. Ce que tu ne dois PAS faire ce sprint

- Ne pas fork OpenCode entier — juste consommer ses packages
- Ne pas implémenter le RAG ou le modèle Mistral AEC (phase 2)
- Ne pas polish l'onboarding (sprint 4)
- Ne pas construire tous les tools FreeCAD possibles — 15-25 bien choisis suffisent, le reste passe par `executer_python_freecad` générique
- Ne pas gérer la facturation / subscription (phase 2)

---

## 10. Première action

Avant de coder :

1. **Audit OpenCode** (livrable 1 ci-dessus) : tu explores le repo `sst/opencode`, tu lis les packages, tu me proposes un plan d'intégration concret avec noms de packages et stratégie.
2. **Liste des 15-25 tools FreeCAD** que tu proposes d'exposer, avec leur signature JSON schema. Je valide la liste avant que tu codes les handlers.
3. **Prompt système `freecad-overview.md`** en version v1 (à itérer) : je valide le niveau de détail avant l'intégration.
4. **Plan de test d'intégration** : quel scénario end-to-end tu vas utiliser pour valider le sprint.

**Validation avant code.**
