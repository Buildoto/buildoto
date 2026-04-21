# vendor/opencode-core

Selective Node-TypeScript port of [sst/opencode](https://github.com/sst/opencode) core
architecture (agent loop, provider registry, tool registry, MCP client, session
message model). Consumed by `@buildoto/main` as `@buildoto/opencode-core`.

## Provenance

- **Upstream repo:** https://github.com/sst/opencode
- **License:** MIT (upstream `LICENSE` preserved at repo root; see reference below)
- **Pinned tag:** `v1.14.19`
- **Pinned commit SHA:** `27db54c859be74aa4caed3e58ae14ecc8bc34b30`
- **Audit date:** 2026-04-20
- **Full audit:** see `docs/opencode-audit.md`

## Why we port rather than depend

OpenCode's core package (`packages/opencode`) is marked `"private": true` and is
not published on npm. Only `@opencode-ai/shared`, `@opencode-ai/plugin`,
`@opencode-ai/sdk`, `@opencode-ai/script` are exported and they don't cover the
agent runtime. A git submodule was rejected: it pulls Bun runtime, the Effect
framework, Drizzle + SQLite, Hono, AppFileSystem, and node-pty; release cadence
is ~3 tagged releases per day, which turns the submodule into a permanent merge
conflict.

Instead, we transcribe the architecture to Node + TypeScript idioms, drop the
dependencies we don't need, and pull the same underlying libraries OpenCode
itself uses (`ai` + `@ai-sdk/*` + `@modelcontextprotocol/sdk`).

## Per-file provenance

| This file | Upstream origin | Adaptation notes |
|---|---|---|
| `src/agent/agent.ts` | `packages/opencode/src/agent/agent.ts` | Dropped Effect runtime; agent loop is plain async/await. `build`/`plan` presets preserved. |
| `src/provider/provider.ts` | `packages/opencode/src/provider/provider.ts` | Dropped Effect + AppFileSystem; credential lookup is a plain callback injected by the host. |
| `src/tool/registry.ts` | `packages/opencode/src/tool/registry.ts` | `define()` shape preserved. Zod schemas converted to AI SDK `Tool` at call time. Provider-aware filtering preserved. |
| `src/mcp/client.ts` | `packages/opencode/src/mcp/index.ts` | stdio + SSE transports preserved via `@modelcontextprotocol/sdk`. Auth open-URL callback is a pluggable function (host provides `shell.openExternal`). |
| `src/session/message.ts` | `packages/opencode/src/session/message-v2.ts` | Kept `CoreMessage` (from `ai`) as canonical shape; added Anthropic-SDK-shape → CoreMessage converter for session v1 migration. |

## What we dropped

- **Effect framework** — functional error handling replaced by plain `try/catch` + typed errors.
- **Bun runtime, PTY, `bunfig.toml`** — we run on Node 20 under Electron.
- **Drizzle + SQLite session store** — Buildoto persists sessions as JSON (`.buildoto/sessions/{id}.json`).
- **AppFileSystem / xdg-basedir** — Electron `app.getPath('userData')` + keytar handle this.
- **Hono HTTP server + `opencode serve`** — Buildoto uses Electron IPC.
- **`packages/console` TUI** — replaced by our React renderer.
- **OAuth browser-open** — replaced by `shell.openExternal` callback.

## Upstream sync policy

Quarterly manual cherry-pick (not a submodule pull):

1. `git diff v1.14.19..HEAD -- packages/opencode/src/{agent,provider,tool,mcp,session}`
2. Forward-port relevant changes (bug fixes, new provider adapters, MCP transport improvements).
3. Update **Pinned tag / SHA / Audit date** in this file with a one-line changelog.
4. Re-run `pnpm smoke:agent` + `pnpm smoke:project`.

## MIT license reproduction

The MIT license of the upstream project applies to code derived from it. The
upstream `LICENSE` reads (retrieved 2026-04-20 from
`https://github.com/sst/opencode/blob/v1.14.19/LICENSE`):

```
MIT License

Copyright (c) 2025 SST

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
