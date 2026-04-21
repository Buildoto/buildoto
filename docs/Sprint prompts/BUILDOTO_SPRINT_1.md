# Kickoff Claude Code — Buildoto Sprint 1
*Shell Electron unifié + OpenCode intégré + FreeCAD sidecar*

---

## 1. Contexte produit

**Buildoto** est une application desktop open-source pour le *vibe-building* — la conception de bâtiments et d'objets AEC (construction, structure, plomberie, charpente) par dialogue avec un agent IA qui génère du code Python FreeCAD.

**Positionnement :** *"Cursor pour la construction."* Un seul outil qui unifie l'agent IA (vibe-coding), le modeleur 3D (FreeCAD), et le versioning (GitHub). L'utilisateur bascule entre les trois volets sans quitter l'app.

**Cible :** techniciens AEC (archi BIM, BET, ingé structure, charpentiers, plombiers, usineurs) qui connaissent Python ou qui veulent le comprendre via l'agent.

**Business model :** app et code 100 % open-source (MIT). Monétisation = abonnement à un *modèle Mistral + RAG AEC* hébergé par Buildoto. L'utilisateur peut utiliser n'importe quel modèle (OpenAI, Claude, local Ollama) gratuitement ; le modèle spécialisé AEC est le seul service payant.

**Trois briques intégrées dans UNE SEULE app Electron :**
1. **OpenCode** (fork, code embarqué comme packages) — volet agent
2. **FreeCAD** (sidecar `freecadcmd` bundlé) — moteur géométrique
3. **React UI** (frontend shadcn + three.js via react-three-fiber) — volet modeleur

**Versioning :** GitHub natif. L'app est un client GitHub qui clone, commit, push, ouvre des PRs. Zéro UI custom pour masquer Git — l'utilisateur est un technicien, il comprend Git.

---

## 2. Mission de ce sprint

Construire le **shell Electron** qui unifie les trois briques dans une seule fenêtre, avec les trois volets accessibles par onglets ou split-view. Tout doit démarrer d'un seul binaire. FreeCAD sidecar embarqué, agent OpenCode opérationnel avec au moins un provider externe (Claude via API key utilisateur), viewer three.js minimal.

**Pas encore :** intégration GitHub (sprint 2), RAG (phase 2), signed releases (sprint 4), onboarding polish (sprint 4).

À la fin du sprint : un développeur lance `pnpm dev`, voit l'app Buildoto, peut taper dans le volet agent "Crée un mur de 5 mètres sur 3 mètres", l'agent génère du Python FreeCAD, le sidecar FreeCAD l'exécute, le viewer three.js affiche le résultat en glTF.

---

## 3. Stack technique

- **Electron 34+** (main process) avec **electron-builder** pour le packaging
- **Vite + React 19 + TypeScript strict** (renderer process)
- **Tailwind 4 + shadcn/ui** (composants copiés dans le code)
- **TanStack Router** + **TanStack Query**
- **Zustand** pour l'état global
- **react-three-fiber** + **drei** pour three.js idiomatique React
- **FreeCAD AppImage** (Linux) / DMG (macOS) / portable (Windows) bundlés comme ressource native — le binaire `freecadcmd` extrait à l'installation
- **OpenCode packages core** importés comme dépendances (via fork npm ou submodule Git)
- **node-ipc** ou **WebSocket local** pour la communication avec le sidecar FreeCAD
- **pnpm** pour la gestion des dépendances

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Buildoto Electron App                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Renderer (React SPA)                       │   │
│  │                                                       │   │
│  │  ┌──────────────┬──────────────┬──────────────┐    │   │
│  │  │  Volet Agent │ Volet Modeleur│  Volet Git  │    │   │
│  │  │  (OpenCode   │ (three.js +   │ (phase sp.2) │    │   │
│  │  │   embedded)  │  panneaux)    │              │    │   │
│  │  └──────────────┴──────────────┴──────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │ IPC                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Main Process (Node.js)                     │   │
│  │                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐ ┌───────────┐   │   │
│  │  │ OpenCode     │  │ FreeCAD      │ │ Project   │   │   │
│  │  │ agent loop   │  │ Sidecar      │ │ Manager   │   │   │
│  │  │ (multi-prov) │  │ (freecadcmd) │ │           │   │   │
│  │  └──────────────┘  └──────────────┘ └───────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Resources bundled:                                          │
│    - /freecad-portable/ (binaire freecadcmd + libs)         │
│    - /assets/ (modèles three.js par défaut, icônes)         │
└─────────────────────────────────────────────────────────────┘
```

**Trois processes clés :**

1. **Main process Electron** : orchestration, fenêtre, menu système, spawn des sidecars, IPC router.
2. **Sidecar FreeCAD** : `freecadcmd` lancé au démarrage, écoute un port local (WebSocket ou ZeroMQ), exécute le Python qu'on lui envoie, renvoie résultats + glTF export.
3. **Renderer React** : UI, three.js viewport, panneaux agent/modeleur/git.

**Communication :**
- Renderer ↔ Main : Electron IPC standard (`ipcRenderer.invoke`)
- Main ↔ Sidecar FreeCAD : WebSocket local sur port aléatoire attribué au boot

---

## 5. Fork vs embedding OpenCode

Pour ce sprint, **on n'embarque pas encore OpenCode entier**. On fait un MVP d'agent custom minimaliste qui suffit à prouver le concept :

- Boucle agentique simple (user → Claude API → tools → user)
- **Un seul tool** pour ce sprint : `executer_python_freecad(code: string) -> resultat`
- Un seul provider : Anthropic Claude (via API key utilisateur saisie dans settings)
- UI de chat simple avec messages, pas encore plans/modes/sessions

**Pourquoi ne pas embarquer OpenCode tout de suite :**
Embarquer OpenCode est un chantier d'intégration complexe (packaging, shell partagé, state management partagé). Ce sprint doit prouver que le triptyque Electron + FreeCAD + three.js fonctionne. L'embedding OpenCode est sprint 3. Si tu embarques OpenCode dès le sprint 1, tu multiplies les sources de problèmes.

---

## 6. Arborescence du projet

```
buildoto/
├── package.json
├── pnpm-workspace.yaml
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── README.md
├── LICENSE (MIT)
├── packages/
│   ├── main/                        # Electron main process
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts            # Entry point, createWindow
│   │   │   ├── ipc/
│   │   │   │   ├── agent.ts        # IPC handlers agent
│   │   │   │   └── freecad.ts      # IPC handlers freecad
│   │   │   ├── agent/
│   │   │   │   ├── loop.ts         # Boucle agentique Claude
│   │   │   │   └── tools.ts        # Tool executer_python_freecad
│   │   │   ├── freecad/
│   │   │   │   ├── sidecar.ts      # Lance freecadcmd, gère WebSocket
│   │   │   │   ├── runner.py       # Script Python dans freecadcmd
│   │   │   │   └── protocol.ts     # Messages WebSocket typés
│   │   │   └── store/
│   │   │       └── settings.ts     # electron-store (API key, etc.)
│   │   └── tsconfig.json
│   ├── renderer/                    # Vite + React SPA
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/              # shadcn
│   │   │   │   ├── layout/
│   │   │   │   │   ├── app-shell.tsx
│   │   │   │   │   ├── tab-bar.tsx
│   │   │   │   │   └── settings-dialog.tsx
│   │   │   │   ├── agent/
│   │   │   │   │   ├── chat-panel.tsx
│   │   │   │   │   ├── message.tsx
│   │   │   │   │   └── input-box.tsx
│   │   │   │   └── modeler/
│   │   │   │       ├── viewport.tsx      # react-three-fiber canvas
│   │   │   │       ├── gltf-loader.tsx
│   │   │   │       └── controls.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-agent.ts
│   │   │   │   └── use-freecad.ts
│   │   │   ├── stores/
│   │   │   │   └── session-store.ts
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   └── vite.config.ts
│   └── shared/                      # Types partagés
│       ├── package.json
│       └── src/
│           ├── ipc-types.ts
│           └── freecad-protocol.ts
├── resources/
│   └── freecad/                     # Script de post-install qui télécharge FreeCAD
│       └── download.ts
└── scripts/
    ├── postinstall.ts               # Télécharge FreeCAD portable selon OS
    └── build.ts
```

---

## 7. Deliverables de ce sprint (ordre strict)

1. **Monorepo pnpm** avec packages `main`, `renderer`, `shared`. Builds fonctionnels (`pnpm build` produit un dist).
2. **Main process** Electron minimal : fenêtre 1280x800, menu système (File, Edit, View, Help), DevTools en dev.
3. **Postinstall script** : détecte l'OS, télécharge le bon FreeCAD portable (AppImage / DMG extrait / Windows portable zip), extrait dans `resources/freecad/{platform}/`. Documente la stratégie dans le README.
4. **Sidecar FreeCAD** :
   - Au démarrage de l'app, main process spawn `freecadcmd -c runner.py` avec un port WebSocket passé en env var
   - `runner.py` (Python FreeCAD) ouvre un WebSocket, écoute les commandes `{type: 'exec_python', code: '...'}` et `{type: 'export_gltf', doc: '...'}`
   - Renvoie `{type: 'result', output: '...', error: null}` ou `{type: 'gltf', data: base64}`
5. **Panneau Agent (Chat)** :
   - UI chat simple (bulles user/assistant, input avec Enter)
   - Settings modal pour saisir la clé API Anthropic
   - Boucle agentique côté main : user message → Claude API → si tool_use → IPC vers sidecar FreeCAD → résultat → Claude API → texte final → renderer
   - Un seul tool exposé : `executer_python_freecad(code: string)` avec schéma JSON pour Claude
6. **Panneau Modeleur (Viewport)** :
   - Canvas react-three-fiber avec contrôles OrbitControls (drei)
   - Éclairage basique (ambient + directional)
   - Grille de sol et axes
   - Loader glTF (via drei `<Gltf />`) : écoute les événements "nouveau modèle dispo", recharge le glTF émis par FreeCAD
7. **Layout avec tab bar** :
   - Un seul écran divisé en tabs ou split-view : "Agent" | "Modeleur"
   - État partagé : quand l'agent exécute du Python qui produit une géométrie, le Modeleur se met à jour automatiquement
8. **Smoke test** :
   - User tape "Crée un cube de 2 mètres à l'origine"
   - Claude appelle `executer_python_freecad` avec du code FreeCAD valide
   - FreeCAD exécute, exporte en glTF
   - Viewport affiche le cube
   - Message "Cube créé" apparaît dans le chat
9. **README** : instructions claires pour dev (clone, pnpm install, pnpm dev), avec prérequis OS et note sur le download de FreeCAD.

---

## 8. Critères d'acceptation

- [ ] `pnpm install && pnpm dev` lance l'app Electron avec les deux volets visibles
- [ ] Le sidecar FreeCAD démarre dans les 3 secondes après l'app
- [ ] Le chat agent fonctionne avec une API key Claude valide
- [ ] Le smoke test du cube passe end-to-end
- [ ] Les trois packages (main, renderer, shared) buildent sans erreur
- [ ] `electron-builder` produit un installeur pour la plateforme courante (même sans signing)
- [ ] Aucun crash quand FreeCAD renvoie une erreur (erreurs Python affichées dans le chat)
- [ ] L'app peut être fermée proprement sans processus FreeCAD zombie

---

## 9. Ce que tu ne dois PAS faire ce sprint

- Ne pas essayer d'embarquer le vrai OpenCode — agent custom minimal uniquement
- Ne pas implémenter la persistence de sessions / historique de chat (sprint 2)
- Ne pas implémenter l'intégration GitHub (sprint 2)
- Ne pas implémenter RAG ni Mistral — uniquement Claude API pour ce sprint
- Ne pas signer les binaires macOS/Windows — on packagera proprement en sprint 4
- Ne pas optimiser la taille du binaire final — on verra en sprint 4
- Ne pas implémenter multi-documents FreeCAD — un seul document actif

---

## 10. Première action

Avant d'écrire du code, propose-moi :

1. **Monorepo layout** : contenu exact des `package.json` des trois packages + pnpm-workspace.yaml + electron-builder.yml.
2. **Stratégie de bundling FreeCAD** : comment tu télécharges/extrais FreeCAD sur chaque OS, quelle variante (AppImage ? conda-pack ? standalone Windows ?), et combien pèse le résultat final. **C'est le risque technique numéro un de ce sprint, je veux qu'on en discute avant que tu codes.**
3. **Protocole WebSocket FreeCAD** : schéma TypeScript complet des messages entre main process et sidecar Python. Tous les types IN et OUT, avec gestion d'erreur.
4. **Squelette de la boucle agentique** : pseudo-code de `agent/loop.ts` qui orchestre Claude API + tool_use + IPC sidecar, pour que je valide le pattern avant l'implémentation.

**Ne crée aucun fichier avant que je valide ces quatre éléments.**
