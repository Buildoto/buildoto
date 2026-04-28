# Buildoto — AGENTS.md

Compact reference for agent sessions. If it's not here it's either obvious or
covered by `CLAUDE.md` (architecture deep-dive, security invariants, IPC contract).

## Commands

```bash
pnpm dev               # electron-vite dev (Electron + Vite HMR)
pnpm build             # electron-vite build
pnpm lint              # ESLint (entire repo, ignores apps/ + out/ + dist/)
pnpm type-check        # pnpm -r run type-check (tsc --noEmit in each package)
pnpm postinstall       # tsx scripts/postinstall.ts (downloads FreeCAD per OS)
pnpm smoke             # tsx --env-file=.env.local packages/main/src/__smoke__/cube.ts
pnpm smoke:project     # tsx --env-file=.env.local packages/main/src/__smoke__/project.ts
pnpm smoke:agent       # tsx --env-file=.env.local packages/main/src/__smoke__/agent-multiprovider.ts
pnpm package           # pnpm build && electron-builder
pnpm package:mac-arm64 # postinstall --target=darwin-arm64 && build && electron-builder --mac --arm64
pnpm package:mac-x64   # postinstall --target=darwin-x64 && build && electron-builder --mac --x64
pnpm package:linux     # postinstall --target=linux-x64 && build && electron-builder --linux
pnpm package:win       # postinstall --target=win32-x64 && build && electron-builder --win
```

CI order: `pnpm type-check` → `pnpm lint` → `pnpm build`. Always pass all three.
Passing `pnpm build` is the final verification before commit — the vite bundler catches issues that tsc may miss with path aliases and dynamic imports.

## Architecture

**pnpm monorepo** — 3 core packages, 1 vendored dep, 2 apps:

| Path | Role |
|------|------|
| `packages/main/` | Electron main process (Node). IPC handlers, agent loop, FreeCAD sidecar, git, GitHub OAuth, store |
| `packages/renderer/` | React 19 + Tailwind 4 + shadcn/ui + react-three-fiber + TanStack Query + Zustand |
| `packages/shared/` | **Source of truth** for IPC types + FreeCAD protocol + project/session schemas |
| `vendor/opencode-core/` | Vendored agent core (multi-provider LLM loop, tool registry, MCP client). Bundled via path aliases |
| `apps/site/` | Astro marketing site (buildoto.com) — not part of desktop app |
| `apps/docs/` | VitePress docs (docs.buildoto.com) — not part of desktop app |

**Build system**: `electron-vite` with 3 separate build targets — main, preload, renderer. Config in `electron.vite.config.ts`. Output goes to `out/main/`, `out/preload/`, `out/renderer/`.

**Entrypoints**:
- Main: `packages/main/src/index.ts` — creates BrowserWindow, registers 12+ IPC handlers, starts FreeCAD sidecar + MCP manager
- Preload: `packages/main/src/preload.ts` — `contextBridge.exposeInMainWorld('buildoto', api)` — the **only** bridge
- Renderer: `packages/renderer/src/main.tsx` — mounts React app with TanStack Query + Zustand
- Shared: `packages/shared/src/index.ts` — re-exports `ipc-types`, `project-types`, `freecad-protocol`

## Key rules

- **English only** for code identifiers (variables, types, IPC channels, column names). French allowed in UI display text only.
- **IPC channels must be typed** in `packages/shared/src/ipc-types.ts`. No string literals. Renderer accesses via `window.buildoto.<domain>.<method>()`.
- **shadcn/ui only** for UI — `packages/renderer/src/components/ui/` is READ-ONLY. No custom UI components.
- **Centralized constants** in `packages/main/src/lib/constants.ts`. Never hardcode business values in components/handlers.
- **User-facing errors in French** — all `throw new Error()` that reaches the renderer must be in French. Common messages centralised as `ERR_NO_ACTIVE_PROJECT`, `ERR_NO_ACTIVE_SESSION`, `ERR_NO_STAGED_CHANGES`.
- **Barrel `index.ts`** mandatory for folders with 3+ exported files.
- **Path alias** `@/` → `./src/` in renderer and main.
- **TanStack Query cache keys** format: `['domain', id?]`.
- **Unused vars**: ESLint warns, prefix with `_` to suppress.

## Vendored opencode-core

`vendor/opencode-core/` is a vendored copy of the OpenCode agent core, mapped via path aliases in `electron.vite.config.ts`:
- `@buildoto/opencode-core/agent` → `vendor/opencode-core/src/agent/agent.ts`
- `@buildoto/opencode-core/provider` → `vendor/opencode-core/src/provider/provider.ts`
- etc. (see config for full list)

The adapter lives in `packages/main/src/agent/opencode-adapter.ts` and bridges vendor types to Buildoto's IPC event system. The agent supports two modes (`plan` / `build`), 7 providers (buildoto-ai, anthropic, openai, mistral, google, ollama, openrouter), MCP tool sync, and 22 FreeCAD tools.

## State management

- **Renderer (Zustand)**: `packages/renderer/src/stores/` — UI state (project, session, settings)
- **Main (electron-store)**: `packages/main/src/store/settings.ts` — persistent settings, window bounds, MCP config, recent projects
- **API keys (keytar)**: main process only, never in electron-store, never in renderer
- **TanStack Query**: staleTime 5 min, retry 1 (configured in renderer/src/main.tsx)

## FreeCAD sidecar

- Downloaded at postinstall to `resources/freecad/<platform>/` (darwin-arm64, darwin-x64, linux-x64, win32-x64)
- Communicates via **local TCP socket** (newline-delimited JSON), not WebSocket
- Protocol: `packages/shared/src/freecad-protocol.ts` — request/response with UUID matching + `_boot` ready frame
- Manager in `packages/main/src/freecad/` — spawn, health-check, auto-restart, single-queue execution
- Default exec timeout: 30s, boot timeout: 15s
- **Ping healthcheck** every 30s (`SIDECAR_PING_INTERVAL_MS`), auto-restarts after 3 consecutive failures
- **Auto-restart** on crash (circuit breaker, max 3 attempts, no backoff)
- Viewport auto-refresh: every structured tool call (except read-only introspection) triggers a glTF export

## Env / secrets

- `.env.local` (git-ignored, see `.env.local.example`) for build-time config only
- Key runtime var: `BUILDOTO_GITHUB_CLIENT_ID` — inlined at build by `electron.vite.config.ts` via Vite's `loadEnv`
- Smoke scripts read `.env.local` via `tsx --env-file=.env.local`
- API keys (Claude, OpenAI, etc.) are **never** in env files — stored via keytar in-app

## Project / session storage

Projects live in arbitrary user-chosen directories. Each project contains:
```
.buildoto/
  config.json   # ProjectConfigV2 (schemaVersion: 2)
  sessions/     # SessionFileV2 per session
  cache/        # misc caches
```

Session history stores `CoreMessage[]` as opaque `unknown` (shapes match AI SDK's `CoreMessage` at runtime). Legacy V1 sessions migrated on load.

## Packaging

- Config: `electron-builder.yml`
- Protocols: `buildoto://` deep link scheme registered
- **Builds are unsigned** — no Apple Developer or Windows EV licenses
- Gatekeeper (macOS) and SmartScreen (Windows) show warnings on first launch
- Users bypass via right-click → Open (macOS) or "More info" → "Run anyway" (Windows)
- See `docs/installation-unsigned.md` for the guide shipped with each release
- extraResources paths differ per platform due to Node.js vs electron-builder OS naming (`darwin-*` vs `mac`, `win32-*` vs `win`)

## Testing

**No unit test framework installed.** Smoke tests in `packages/main/src/__smoke__/` run via `tsx`:
- `cube.ts` — FreeCAD sidecar smoke
- `project.ts` — project lifecycle + git smoke
- `agent-multiprovider.ts` — agent loop smoke
- `sidecar-tool-call.ts`, `buildoto-ai-turn.ts`, `sanitize-history-check.ts`

## Key files

| File | Purpose |
|------|---------|
| `docs/audit-codebase.md` | Code audit findings + todo tracker |
| `docs/production-readiness-plan.md` | Production readiness plan (25 items, all resolved) |
| `packages/main/src/lib/constants.ts` | Centralised constants (timeouts, URLs, paths, models, error messages) |
