# OpenCode audit — Sprint 3 embedding decision

**Audit date:** 2026-04-20
**Upstream repo:** https://github.com/sst/opencode
**Pinned release for this sprint:** `v1.14.19`
**Commit SHA (pinned):** `27db54c859be74aa4caed3e58ae14ecc8bc34b30`
**Dev HEAD at audit:** `16caaa222955ae10406d054f2fa84cd78985c09f`
**License:** MIT (confirmed via GitHub API)

---

## 1. Summary

OpenCode's core packages are **not published on npm**. The monorepo's primary `packages/opencode` is marked `"private": true`; only `@opencode-ai/shared`, `@opencode-ai/plugin`, `@opencode-ai/sdk`, and `@opencode-ai/script` are exported as workspace-protocol references. Release cadence is high — ~3 tagged releases per day at the time of audit. Core code assumes Bun runtime, uses the Effect framework for functional composition, Drizzle + SQLite for session persistence, xdg-basedir for config paths, and a Hono-based HTTP server when run as `opencode serve`.

Two embedding paths were considered and **a third was chosen**:

- **A. Git submodule + local build** — rejected: pulls Bun, Effect, Drizzle, AppFileSystem; upstream churn makes the submodule a merge-conflict machine.
- **B. Vercel AI SDK + `@modelcontextprotocol/sdk` directly, no OpenCode** — rejected: would meet all feature acceptance criteria in §8 except crit. 1 ("agent 100 % OpenCode core"), forfeiting the design benefit.
- **C. Selective vendoring into `vendor/opencode-core/`** — **chosen**: we transcribe OpenCode's architecture (agent loop shape, provider abstraction, tool registry contract, MCP wiring, build/plan agent configs) to Node+TypeScript idioms, drop the Effect/Bun/SQLite baggage, and pull the same underlying libraries OpenCode uses — `ai` + `@ai-sdk/*` and `@modelcontextprotocol/sdk`. A `VENDORING.md` at the vendor root cites this commit, the MIT license, and per-file provenance notes.

This satisfies §8 crit. 1 in spirit: the agent architecture is OpenCode's, but the implementation is a Node-native port tailored for the Electron main process.

---

## 2. Reusable architecture (what we port)

| OpenCode source | Port target | Why we keep it |
|---|---|---|
| [`packages/opencode/src/agent/agent.ts`](https://github.com/sst/opencode/blob/v1.14.19/packages/opencode/src/agent/agent.ts) | `vendor/opencode-core/agent/agent.ts` | Agent definition shape (name, description, tools allowlist, permissions, model); `build` + `plan` presets. Multi-turn `tool_use` iteration pattern. |
| [`packages/opencode/src/provider/provider.ts`](https://github.com/sst/opencode/blob/v1.14.19/packages/opencode/src/provider/provider.ts) | `vendor/opencode-core/provider/provider.ts` | Provider registry, model metadata, lazy SDK load, credential lookup hook. |
| [`packages/opencode/src/tool/registry.ts`](https://github.com/sst/opencode/blob/v1.14.19/packages/opencode/src/tool/registry.ts) | `vendor/opencode-core/tool/registry.ts` | `define({ id, description, inputSchema, execute })`, provider-aware filtering, MCP tool merge. |
| [`packages/opencode/src/mcp/index.ts`](https://github.com/sst/opencode/blob/v1.14.19/packages/opencode/src/mcp/index.ts) | `vendor/opencode-core/mcp/client.ts` | stdio + SSE transport wiring; tool enumeration + invocation. |
| [`packages/opencode/src/session/message-v2.ts`](https://github.com/sst/opencode/blob/v1.14.19/packages/opencode/src/session/message-v2.ts) | `vendor/opencode-core/session/message.ts` | Provider-agnostic message shape (`CoreMessage` from AI SDK) + cross-provider conversion. |

---

## 3. What we drop

- **Effect framework** — functional error handling is replaced by plain `try/catch` + typed errors. Keeps the vendor code idiomatic Node TS.
- **Bun-specific code** — PTY, runtime adapters, `bunfig.toml`. We run under Node 20 via tsx / electron.
- **Drizzle + SQLite session store** — Buildoto persists sessions as JSON in `.buildoto/sessions/{id}.json` (sprint 2 design). No DB migration layer.
- **AppFileSystem / xdg-basedir** — Electron's `app.getPath('userData')` + our existing keytar covers this.
- **Hono HTTP server + `opencode serve`** — Buildoto uses IPC, not HTTP, between main and renderer.
- **`packages/console` (TUI)** — we have our own React renderer.
- **OAuth browser-open for MCP** — we inject `shell.openExternal` from Electron as the open-URL callback.

---

## 4. Dependencies we add

**Runtime (packages/main):**
- `ai@^4` — core AI SDK (streamText, tool calling, CoreMessage)
- `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/mistral`, `@ai-sdk/google`
- `ollama-ai-provider` — community provider (AI SDK-compatible)
- `@openrouter/ai-sdk-provider` — OpenRouter provider (AI SDK-compatible)
- `@modelcontextprotocol/sdk@^1.27`
- `zod@^3.23` — schema validation

All externalized in `electron.vite.config.ts` (`EXTERNAL_MAIN_DEPS`).

---

## 5. Upstream merge strategy

Given the ~3 releases/day cadence and the fact that we're vendoring selectively rather than tracking via submodule, upstream sync becomes a **quarterly manual cherry-pick**:

1. Diff the five source files in §2 between our pinned SHA and upstream HEAD.
2. Forward-port relevant changes (bug fixes, new provider adapters, MCP transport improvements).
3. Update `VENDORING.md` with the new commit hash and a one-line changelog.
4. Re-run `pnpm smoke:agent` + `pnpm smoke:project` to confirm no regression.

This is cheaper than a permanently-connected submodule because we only absorb changes we actually want.

---

## 6. Red flags confirmed safe

| Risk | Mitigation in our port |
|---|---|
| OpenCode global state / Effect runtime | Dropped; our vendor code is stateless modules + injected dependencies |
| `process.exit()` in CLI bootstrap | We never import CLI layer — only agent/provider/tool/mcp/session |
| Hardcoded `~/.local/share/opencode/` paths | Replaced by Electron `userData` + keytar, injected via adapter |
| MCP OAuth callback assumes system browser | Replaced by `shell.openExternal` callback; no callback URL server needed |
| Tree-sitter native binaries (trustedDeps) | Not imported; we don't use the bash/edit/grep tools — those are OpenCode's built-ins for code editing, irrelevant to Buildoto |

---

## 7. Open questions for later sprints

- **Sprint 4** — if we ever want to adopt OpenCode's code-editing tools (read/write/edit/bash/grep) for power users, we can port them the same way.
- **Sprint 6+** — when we ship "Buildoto AI" as a Mistral+RAG provider, it registers as one more `@ai-sdk/*`-compatible provider in the vendor registry. No architectural change.
- **OpenCode plugin system** (`packages/plugin`) — out of scope for sprint 3. If we want to support community plugins, we revisit after sprint 4.
