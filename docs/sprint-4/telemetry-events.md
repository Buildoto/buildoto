# Sprint 4 — Telemetry event catalog

PostHog Cloud EU. Opt-in only. Fully anonymous (never `identify`, never PII).

---

## Principles

1. **Consent gate.** Events drop unless `settings.telemetryConsent === 'granted'`. Default state is `'pending'`; onboarding Step 1 resolves it to `'granted'` or `'denied'`.
2. **Anonymous distinct ID.** `settings.telemetryAnonymousId` = uuid v4 generated at first launch, encrypted via Electron `safeStorage`. Never linked to GitHub login, email, keytar providers, or hardware IDs.
3. **No PII.** No file paths, no project names, no chat content, no tool inputs, no tool outputs, no error stacks with user paths. `beforeCapture` in `posthog.ts` scrubs `/Users/...`, `/home/...`, `C:\\Users\\...`.
4. **Retention.** PostHog project configured to 90-day event retention. Person profiles disabled (anonymous-only).
5. **Opt-out is hard delete.** `telemetry_opted_out` event (final) + local `telemetryAnonymousId` regenerated on next opt-in cycle (to prevent re-identification).
6. **Transport.** Main process owns `posthog-node` client. Renderer calls `TELEMETRY_CAPTURE { event, properties }` via IPC; main enriches with `$set` and forwards.
7. **Error handling.** PostHog flush failures never crash the app. Silent drop on network error.

---

## Event catalog

Each event specifies: `purpose` (what funnel/metric it powers), `properties` (keys + types), `privacy audit` (what is **not** collected).

### `app_launched`

- **Purpose:** daily active users, version distribution, provider configuration rates.
- **Trigger:** Every `app.whenReady()` once telemetry consent resolved.
- **Properties:**
  - `os`: `'darwin' | 'win32' | 'linux'`
  - `osVersion`: `string` (e.g. "14.2.1")
  - `arch`: `'arm64' | 'x64'`
  - `appVersion`: `string` (semver)
  - `channel`: `'alpha' | 'beta' | 'stable'`
  - `providersConfigured`: `string[]` (sorted provider ids, e.g. `['anthropic', 'mistral']`)
- **NOT collected:** API keys, hardware UUIDs, hostname, username, locale.

### `onboarding_step_completed`

- **Purpose:** onboarding funnel drop-off analysis.
- **Trigger:** "Continuer" or "Passer" clicked on each step.
- **Properties:**
  - `step`: `1 | 2 | 3 | 4 | 5`
  - `skipped`: `boolean`
  - `durationMs`: `number` (time since previous step)
  - Step 2: `providersConfiguredCount`: `number`
  - Step 3: `githubConnected`: `boolean`
  - Step 4: `projectCreated`: `boolean`
- **NOT collected:** project name, project path, GitHub login, API key values.

### `onboarding_completed`

- **Purpose:** activation rate, time-to-activation metric.
- **Trigger:** "Commencer" on Step 5 (tour).
- **Properties:**
  - `totalDurationMs`: `number` (time from Step 1 Continuer to Step 5 Commencer)
  - `stepsSkipped`: `number[]` (indices of skipped steps)
- **NOT collected:** anything else.

### `agent_turn_started`

- **Purpose:** usage frequency, provider mix, mode distribution.
- **Trigger:** `AGENT_RUN_TURN` handler entry.
- **Properties:**
  - `provider`: `ProviderId`
  - `mode`: `'build' | 'plan'`
  - `toolCountAvailable`: `number` (sum of builtin + freecad + mcp tools)
  - `mcpToolCount`: `number`
- **NOT collected:** user message text, model id, history length.

### `agent_turn_completed`

- **Purpose:** success rate, latency distribution, tool adoption, error taxonomy.
- **Trigger:** `done` or `error` AgentEvent.
- **Properties:**
  - `provider`: `ProviderId`
  - `mode`: `'build' | 'plan'`
  - `status`: `'success' | 'error'`
  - `durationMs`: `number`
  - `toolsInvoked`: `string[]` (unique tool ids in invocation order, **names only** — never inputs)
  - `toolCallCount`: `number`
  - `errorCode`: `string | null` (from FreeCAD `TOOL_NOT_FOUND` / `OBJECT_NOT_FOUND` / provider HTTP status class / `network` / `cancelled`)
  - `tokensEstimate`: `number | null` (if provider returned usage, else null — **no cost derivation upstream of us**)
- **NOT collected:** assistant text, tool inputs/outputs, full error message, stack trace.

### `project_created`

- **Purpose:** project creation rate, template popularity.
- **Trigger:** `PROJECT_CREATE` handler success.
- **Properties:**
  - `template`: `'empty' | 'house' | 'renovation'`
  - `fromOnboarding`: `boolean`
- **NOT collected:** name, path, parent dir.

### `commit_created`

- **Purpose:** auto-commit reliability.
- **Trigger:** `commit_created` AgentEvent OR manual commit.
- **Properties:**
  - `source`: `'agent' | 'manual'`
  - `filesChangedCount`: `number`
- **NOT collected:** commit message, file paths, file contents, SHA.

### `mcp_server_added`

- **Purpose:** MCP adoption.
- **Trigger:** `MCP_UPSERT_SERVER` on new (not edit).
- **Properties:**
  - `transport`: `'stdio' | 'sse'`
  - `toolsEnumerated`: `number`
- **NOT collected:** server name, command, args, env, URL.

### `update_downloaded`

- **Purpose:** update adoption speed, channel health.
- **Trigger:** electron-updater `update-downloaded` event.
- **Properties:**
  - `fromVersion`: `string`
  - `toVersion`: `string`
  - `channel`: `'alpha' | 'beta' | 'stable'`
- **NOT collected:** release notes, size.

### `telemetry_opted_out`

- **Purpose:** opt-out rate, final signal before going silent.
- **Trigger:** User flips telemetry switch OFF in settings.
- **Properties:**
  - `sessionEventCount`: `number` (events captured since current opt-in)
- **After this event fires:** PostHog client calls `flush()`, then shuts down. No further events until a new `'granted'`.

---

## Properties applied to every event (`$set`)

- `channel`: `'alpha' | 'beta' | 'stable'`
- `appVersion`: `string`
- `os`: `'darwin' | 'win32' | 'linux'`

Applied via `posthog.capture({ event, properties, $set: { ... } })` so cohort analysis works without re-including them per event.

---

## Privacy policy source (for vitrine `/privacy`)

Markdown version in `apps/site/src/content/privacy.md`. Public-facing summary:

> Buildoto peut collecter des statistiques d'usage **anonymes** pour améliorer le produit, uniquement si tu l'autorises. Les données ne sont jamais liées à ton compte, ton email, tes clés API ni au contenu de tes projets. Liste exhaustive des événements: lien vers `docs/sprint-4/telemetry-events.md` sur GitHub.
>
> Tu peux désactiver la collecte à tout moment dans Réglages → Confidentialité. La désactivation efface l'identifiant anonyme local et arrête tout envoi.

---

## Implementation notes

### Main process (`packages/main/src/telemetry/posthog.ts`)

- Lazy-init: only load `posthog-node` when both `POSTHOG_KEY` env var is set at build time AND `telemetryConsent === 'granted'`.
- Host: `https://eu.i.posthog.com` (EU region).
- `beforeCapture` regex scrubber strips absolute paths, UUIDs that aren't the install id, and any key-like pattern (`sk-...`, `ghp_...`).
- On `app.will-quit`, call `posthog.shutdown()` with 2s timeout to flush.

### Renderer (`packages/renderer/src/hooks/use-telemetry.ts`)

```ts
export function useCapture() {
  const consent = useSessionStore((s) => s.telemetryConsent)
  return (event: string, properties?: Record<string, unknown>) => {
    if (consent !== 'granted') return
    void window.buildoto.telemetry.capture({ event, properties })
  }
}
```

### Env vars

- `POSTHOG_KEY`: project API key, embedded at build time via `vite.define`.
- `POSTHOG_HOST`: defaults to `https://eu.i.posthog.com`.

Missing → telemetry module logs `[posthog] disabled (no key)` and exports a no-op shim.

---

## Verification

1. `POSTHOG_KEY=<test-key> pnpm dev`, opt in during onboarding, complete all 5 steps.
   - PostHog dashboard shows 1 `app_launched` + 5 `onboarding_step_completed` + 1 `onboarding_completed`.
2. Run one agent turn with a tool call.
   - Dashboard shows `agent_turn_started` + `agent_turn_completed` with `toolsInvoked` array.
3. Flip telemetry OFF.
   - Dashboard shows `telemetry_opted_out`. Do another agent turn — no new event.
4. Flip telemetry back ON.
   - `telemetryAnonymousId` regenerated (check electron-store). Next `app_launched` has new distinct id.
5. `pnpm dev` without `POSTHOG_KEY`.
   - No crash. Logs: `[posthog] disabled (no key)`. No network calls to posthog.com (verify with devtools network tab in main, via `--inspect`).
