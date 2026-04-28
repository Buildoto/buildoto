# CLAUDE.md — Buildoto Development Guide

Reference guide for Claude Code. Details are in local CLAUDE.md files and sprint specs in `docs/`.

---

## 0. ENGLISH-ONLY RULE (CRITICAL)

**ALL code, schemas, and identifiers MUST be in English across ALL layers:**

| Layer | Scope | Examples |
|-------|-------|---------|
| **Electron main** | Variable names, IPC channel names, handler names, store keys, file names | `activeProject`, `freecadStatus`, `agent:run`, `project_id` |
| **Renderer (React/TS)** | Component names, hook names, type/interface names, prop names, store keys | `AgentPanel`, `useAgentMessages`, `FreecadSidecar`, `status` |
| **Shared types** | IPC type names, FreeCAD protocol types, enum values | `IpcChannels`, `FreecadEvent`, `AgentStatus` |
| **Phase 2 (Supabase/FastAPI)** | Table names, column names, RPC names, Python variables | `projects`, `user_id`, `start_agent_session()` |

**Allowed in French:** UI display text (labels, buttons, tooltips, toasts). Only CODE identifiers must be English.

---

## 0.5. SECURITY INVARIANTS (CRITICAL)

### Electron security model

- **`contextIsolation: true`, `nodeIntegration: false`** — non-negotiable. The renderer process has zero direct access to Node.js APIs.
- All Node.js capabilities are exposed via the **preload script** (`packages/main/src/preload.ts`), using `contextBridge.exposeInMainWorld`. Never add raw Node APIs; expose typed, scoped functions only.
- **IPC channels must be typed** in `packages/shared/src/ipc-types.ts` before use. Never call `ipcRenderer.send` with an untyped string literal.

### API keys and secrets

- API keys (Claude, OpenAI, etc.) are stored exclusively via **keytar** (OS keychain). Never in electron-store (plain JSON on disk), never in env files shipped with the app, never in renderer state.
- The renderer **never sees raw API keys** — only an opaque confirmation of whether a key is set.
- When the agent calls an LLM, the key is read in the main process and injected into the HTTP request. It never crosses the IPC boundary.

### Phase 2 — Supabase (separate project from Beforbuild)

Buildoto's Phase 2 Supabase project is **entirely separate** from Beforbuild. Do not reuse credentials, migrations, or schemas from Beforbuild. The same SQL security rules apply (RLS on every table, no `service_role` exposure to the app, `authenticated`-only RPCs).

### Hard bans

- ❌ `nodeIntegration: true` in any BrowserWindow
- ❌ `contextIsolation: false` in any BrowserWindow
- ❌ Storing API keys in `electron-store` or any plain-text file
- ❌ Exposing raw `ipcRenderer` / `ipcMain` to the renderer
- ❌ Untyped IPC channels (string literals outside `ipc-types.ts`)

---

## 1. CORE PRINCIPLES

### 1.1 Two-layer autonomy

Claude has **full control** over both layers:
- **Renderer**: React/TypeScript (`packages/renderer/src/`)
- **Main process + IPC**: Electron main (`packages/main/src/`) + shared types (`packages/shared/src/`)

**Rule:** Act on **all concerned layers** autonomously when a feature spans them.

### 1.2 Commands

```bash
pnpm install                  # Install all workspace dependencies (runs postinstall: FreeCAD download)
pnpm dev                      # Start Electron app + Vite renderer (parallel)
pnpm build                    # Build all packages
pnpm type-check               # TypeScript strict check across all packages
pnpm lint                     # ESLint (entire repo)
pnpm lint                     # ESLint
pnpm type-check               # TypeScript strict check

electron-builder              # Package for distribution (DMG / NSIS / AppImage)

# Phase 2 — Python / RAG services
docker-compose up                      # Start Qdrant + ingestion container
python scripts/ingest_all.py           # Ingest AEC corpus into Qdrant
python scripts/evaluate_quality.py     # Evaluate RAG retrieval quality
```

- **ALWAYS** test before commit: `pnpm build && pnpm lint`

### 1.3 Branches

- **`main`**: production releases
- **`develop`**: integration branch
- **NEVER** push directly to `main`

---

## 2. ARCHITECTURE

### 2.1 Stack

Electron 34 + Vite + React 19 + TypeScript (strict) + Tailwind 4 + shadcn/ui + react-three-fiber + drei + TanStack Query + TanStack Router + Zustand + electron-store + keytar + simple-git + @octokit/rest + Anthropic Claude API

### 2.2 Monorepo structure

```
packages/
├── main/src/
│   ├── index.ts              # Electron entry, BrowserWindow creation
│   ├── preload.ts            # contextBridge — typed IPC exposure only
│   ├── ipc/                  # IPC handler registration
│   ├── agent/                # Agent loop (Claude API + tool execution)
│   ├── freecad/              # FreeCAD sidecar manager
│   ├── git/                  # simple-git + GitHub OAuth
│   └── store/                # electron-store (settings, recent projects)
├── renderer/src/
│   ├── components/ui/        # shadcn (READ-ONLY)
│   ├── components/           # App-level shared components
│   ├── panels/               # AgentPanel, ModelerPanel, GitPanel, FilePanel
│   ├── hooks/                # React hooks (useAgent, useFreecad, useProject…)
│   ├── stores/               # Zustand stores
│   └── lib/                  # constants.ts, utils.ts
└── shared/src/
    ├── ipc-types.ts          # All IPC channel names + payload types
    └── freecad-protocol.ts   # WebSocket message types for FreeCAD sidecar
```

### 2.3 IPC contract

**`packages/shared/src/ipc-types.ts` is the source of truth for all IPC.** Every channel name and payload type is declared there. Pattern:

```typescript
// shared/src/ipc-types.ts
export const IpcChannels = {
  AGENT_RUN: 'agent:run',
  FREECAD_EXEC: 'freecad:exec',
} as const

export interface AgentRunPayload { prompt: string; projectId: string }
export interface FreecadExecPayload { script: string }
```

Never use string literals for channel names outside this file.

### 2.4 Data flow: Renderer → Main → External

```
Renderer (React)
  └─ contextBridge (preload.ts)
       └─ ipcRenderer.invoke(IpcChannels.AGENT_RUN, payload)
            └─ Main process ipc/ handler
                 ├─ agent/          → Claude API (key from keytar)
                 ├─ freecad/        → FreeCAD WebSocket sidecar
                 ├─ git/            → simple-git + GitHub API
                 └─ store/          → electron-store (settings)
```

**NEVER** call external APIs (Claude, GitHub, FreeCAD) from the renderer process.

### 2.5 Agent loop (`packages/main/src/agent/`)

- **Sprint 1**: custom minimal loop — Claude API + tool use (file read/write, terminal exec, FreeCAD exec)
- **Sprint 3**: replaced by embedded OpenCode library (audit packages before embedding)
- Tool results flow: FreeCAD script output → agent loop → next LLM call
- Streaming responses are forwarded to the renderer via IPC events

### 2.6 FreeCAD sidecar (`packages/main/src/freecad/`)

- `freecadcmd` bundled under `resources/freecad/` (downloaded at postinstall, OS-specific path — see `scripts/postinstall.ts`)
- Sidecar communicates via **local WebSocket** (not node-ipc — simpler for Python interop)
- Protocol types in `packages/shared/src/freecad-protocol.ts`
- Sidecar manager: spawn, health-check, auto-restart on crash
- 3D viewport (react-three-fiber) is **read-only** — it renders geometry exported by FreeCAD (STEP/BREP → three.js), it does not edit directly

### 2.7 State management

- **Zustand** (`packages/renderer/src/stores/`) — UI state: agent messages, active project, viewport camera
- **electron-store** (main process) — persistent settings: recent projects, provider config, window bounds
- **keytar** (main process) — API keys (never in electron-store)
- **TanStack Query** — async data fetching with caching (staleTime 5 min, retry 1)

---

## 3. BUSINESS INTEGRITY RULES

### 3.1 IPC is the contract

Business rules that involve external state (file system, FreeCAD, Git) **MUST** be enforced in the main process. The renderer may mirror the state for UX but is **never** the sole guard.

### 3.2 Decision tree

| Need | Pattern |
|------|---------|
| Validate a user action before executing | Handler checks in main process, throws typed error via IPC |
| Prevent concurrent FreeCAD calls | Sidecar manager queue — one script at a time |
| Persist project state | electron-store write in main, broadcast to renderer via IPC event |
| Show realtime FreeCAD output | IPC event stream (main → renderer) |

### 3.3 Naming conventions

| Element | Pattern | Example |
|---------|---------|---------|
| IPC channel | `domain:action` | `agent:run`, `freecad:exec`, `git:commit` |
| Zustand store | `use{Domain}Store` | `useAgentStore`, `useProjectStore` |
| IPC handler file | `{domain}.handler.ts` | `agent.handler.ts`, `freecad.handler.ts` |
| Electron-store key | `camelCase` | `activeProjectPath`, `selectedProvider` |

### 3.4 Renderer UX mirrors

- Disable buttons / inputs while an IPC call is in flight
- Show spinner in `AgentPanel` during agent loop turns
- Show FreeCAD sidecar status badge (idle / running / error) in UI

---

## 4. SECURITY & AUTHENTICATION

### 4.1 Preload as the boundary

The preload script (`packages/main/src/preload.ts`) is the **only** bridge between renderer and main. Every API exposed must be:
1. Typed (parameter + return types)
2. Minimal — expose exactly what the renderer needs, nothing more
3. Validated in the main handler (treat renderer input as untrusted)

### 4.2 Key management

- `keytar.setPassword('buildoto', provider, apiKey)` — store
- `keytar.getPassword('buildoto', provider)` — retrieve in main only
- The renderer calls `ipcRenderer.invoke(IpcChannels.SET_API_KEY, { provider, key })` and receives only `{ ok: true }`

### 4.3 Phase 2 — Auth (Supabase)

- JWT from Supabase Auth **never** leaves the backend service (FastAPI or CF Worker)
- Desktop app authenticates via GitHub OAuth Device Flow (no embedded browser)
- Session tokens stored in electron-store (encrypted via safeStorage if available)

---

## 5. CODE CONVENTIONS

### 5.1 UI: shadcn/ui only

**NO** custom UI components. `packages/renderer/src/components/ui/` is READ-ONLY.

### 5.2 Centralized constants

All business values (provider names, IPC timeouts, FreeCAD WebSocket port, etc.) in `packages/renderer/src/lib/constants.ts` (renderer) and `packages/main/src/lib/constants.ts` (main). **FORBIDDEN** to hardcode in components or handlers.

### 5.3 TypeScript strict

- Strict mode across all packages
- Path alias `@/` → `./src/` in renderer and main
- Shared types imported from `@buildoto/shared`

### 5.4 TanStack Query cache keys

Format: `['domain', id?]` — e.g. `['project', projectId]`, `['agent-messages', sessionId]`

### 5.5 Barrels

Barrel `index.ts` mandatory for folders with 3+ exported files. Add every new file to the barrel if the folder has one.

---

## 6. REFERENCE FILES

| File | Content |
|------|---------|
| `docs/audit-codebase.md` | Code audit findings + todo tracker |
| `docs/production-readiness-plan.md` | Production readiness plan + status |
| `packages/shared/src/ipc-types.ts` | All IPC channels + payload types |
| `packages/shared/src/freecad-protocol.ts` | FreeCAD TCP protocol |
| `packages/shared/src/project-types.ts` | Project, session, provider, Git types |
