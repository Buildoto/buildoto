# Sprint 4 — Release checklist for v0.1.0-alpha.0

End-to-end procedure from code-freeze to published GitHub release + live vitrine + live docs.

Execute phases in order. Each phase has a rollback note.

---

## Phase 0 — Preflight (local)

Run on a clean macOS arm64 machine (signing tooling most mature there).

```bash
pnpm install --frozen-lockfile
pnpm type-check          # all packages green
pnpm lint                # no errors
pnpm build               # all packages build (main, renderer, shared)
pnpm smoke               # sprint 1 cube smoke
pnpm smoke:project       # sprint 2 auto-commit smoke
pnpm smoke:agent         # sprint 3 multi-provider smoke (≥ anthropic key required)
```

All green → proceed. Any red → fix before tagging.

**Rollback:** nothing to roll back; just fix and retry.

---

## Phase 1 — Version bump + changelog

```bash
# From repo root
pnpm version 0.1.0-alpha.0 --no-git-tag-version
# Propagate to all workspace packages
pnpm -r exec -- npm version 0.1.0-alpha.0 --no-git-tag-version --allow-same-version
```

Edit `CHANGELOG.md`:

```
## [0.1.0-alpha.0] — 2026-04-XX

### Added
- Agent multi-provider (Anthropic, OpenAI, Mistral, Gemini, Ollama, OpenRouter)
- 23 structured FreeCAD tools across Sketcher/Part/Draft/Arch/Spreadsheet/introspection
- MCP server registry (stdio + SSE transports)
- Build/Plan mode toggle (Tab binding)
- 5-screen onboarding with API key setup and GitHub Device Flow
- Command palette (Cmd/Ctrl+K), keyboard shortcuts
- Light/dark/system theme
- Auto-updater (alpha channel)
- Opt-in anonymous telemetry (PostHog Cloud EU)
- Opt-in crash reporting (Sentry)
- 3 example projects

### Known limitations
- Unsigned builds on macOS and Windows (use right-click → Open on macOS, allow in SmartScreen on Windows)
- `sketcher_*` tools stubbed (sprint 5 delivery)
- `screenshot` tool unavailable in headless freecadcmd (sprint 5)
- No session search, no multi-window
```

Commit: `chore(release): bump to 0.1.0-alpha.0`.

**Rollback:** `git reset --hard HEAD~1` before tagging.

---

## Phase 2 — Tag + push

Requires Phase H.4 (git bootstrap) to have completed previously.

```bash
git tag v0.1.0-alpha.0
git push origin main
git push origin v0.1.0-alpha.0
```

**Rollback:** `git tag -d v0.1.0-alpha.0 && git push --delete origin v0.1.0-alpha.0`.

---

## Phase 3 — CI release workflow

GitHub Actions `release.yml` triggers on tag `v*.*.*-alpha.*`. Matrix builds:

- `macos-latest` → `package:mac-arm64` + `package:mac-x64` (two separate DMG uploads)
- `windows-latest` → `package:win` (NSIS installer)
- `ubuntu-latest` → `package:linux` (AppImage)

All runs:
1. `pnpm install --frozen-lockfile`
2. `pnpm type-check && pnpm lint && pnpm build`
3. Platform-specific `pnpm package:*`
4. electron-builder publishes to GitHub Release draft via `GH_TOKEN`.

Monitor at `https://github.com/<org>/buildoto/actions`.

**Expected artifacts on GitHub Release:**
- `Buildoto-0.1.0-alpha.0-arm64.dmg` + `.blockmap`
- `Buildoto-0.1.0-alpha.0-x64.dmg` + `.blockmap`
- `Buildoto-Setup-0.1.0-alpha.0.exe` + `.blockmap`
- `Buildoto-0.1.0-alpha.0.AppImage`
- `latest-mac.yml`
- `latest.yml` (Windows)
- `latest-linux.yml`

**Rollback:** delete the GitHub Release draft + delete the tag (Phase 2 rollback).

---

## Phase 4 — Release notes

Draft release body from CHANGELOG section. Sections:

```
## Téléchargements

- **macOS Apple Silicon** : Buildoto-0.1.0-alpha.0-arm64.dmg
- **macOS Intel** : Buildoto-0.1.0-alpha.0-x64.dmg
- **Windows** : Buildoto-Setup-0.1.0-alpha.0.exe
- **Linux** : Buildoto-0.1.0-alpha.0.AppImage

## Installation

Les builds **ne sont pas signés** pour cette alpha.

- **macOS** : clic droit → Ouvrir (une seule fois).
- **Windows** : "Informations complémentaires" → "Exécuter quand même" dans SmartScreen.
- **Linux** : `chmod +x Buildoto-0.1.0-alpha.0.AppImage && ./Buildoto-0.1.0-alpha.0.AppImage`

## Limitations connues

(see CHANGELOG)

## Retours

Issues GitHub : https://github.com/<org>/buildoto/issues
```

Mark as **pre-release**. Don't publish yet — wait for Phase 5 smoke.

---

## Phase 5 — Post-build smoke (manual, per OS)

For each artifact, on a fresh machine (or VM):

1. Download + install.
2. Launch — onboarding appears.
3. Complete Step 1 (decline telemetry, decline crash reports — test the `pending → denied` path).
4. Step 2: enter a real `ANTHROPIC_API_KEY`.
5. Step 3: skip GitHub.
6. Step 4: create `~/tmp/alpha-smoke` project.
7. Step 5: click through tour.
8. Agent panel: prompt "Crée un cube de 1m". Expect `part_create_box` tool call + viewport update.
9. Quit app. Relaunch. Expect straight entry to main screen (onboarding not replayed).
10. Open Settings → Apparence → toggle dark mode. Confirm theme persists across restart.

Pass criteria: no crash, no unreadable error, agent produces at least one geometry primitive. Any fail → investigate, potentially delete release + re-tag as `-alpha.1`.

---

## Phase 6 — Publish release

Once all 3 OS smokes pass:

1. GitHub Release: click "Publish release" (no longer draft).
2. Verify `latest-mac.yml` / `latest.yml` / `latest-linux.yml` are public URLs (auto-updater needs them).

**Rollback:** unpublish release → tag remains, but download URLs 404. In extreme cases, delete tag (Phase 2 rollback) and bump to `-alpha.1`.

---

## Phase 7 — Vitrine + docs deploy

Cloudflare Pages first deploy (manual, sub-apps not yet git-hooked):

### Vitrine — `apps/site/`

```bash
pnpm --filter @buildoto/site build
# Output: apps/site/dist/
```

Upload `apps/site/dist/` via `wrangler pages deploy apps/site/dist/ --project-name=buildoto-site`. Target domain: `buildoto.com`.

### Docs — `apps/docs/`

```bash
pnpm --filter @buildoto/docs build
# Output: apps/docs/.vitepress/dist/
```

`wrangler pages deploy apps/docs/.vitepress/dist/ --project-name=buildoto-docs`. Target domain: `docs.buildoto.com`.

### DNS

- `buildoto.com` → CNAME to `buildoto-site.pages.dev`
- `docs.buildoto.com` → CNAME to `buildoto-docs.pages.dev`

### Post-deploy check

- `curl -I https://buildoto.com` returns 200.
- Download CTA on vitrine points to `https://github.com/<org>/buildoto/releases/latest`.
- `https://docs.buildoto.com/reference/tools` lists 23 tools.

**Rollback:** Cloudflare Pages keeps deploy history; promote previous deploy via dashboard.

---

## Phase 8 — Monitoring window (48h)

Dashboards to watch:

### PostHog

- Funnel: `app_launched` → `onboarding_step_completed (step=1)` → `... (step=5)` → `onboarding_completed`. Expect drop-off < 50% on step 2 (API key step).
- Event: `agent_turn_completed` where `status='error'`. Alert if > 20% of total agent turns.
- Event: `update_downloaded`. Tracks adoption.

### Sentry

- New issues dashboard. Any unhandled exception → triage within 24h.
- Expected noise: `ECONNRESET` on provider calls (network flakiness) — ignore.

### GitHub

- Issues tracker: new issues tagged `alpha-feedback`.
- Releases: download counts per artifact.

---

## Rollback playbook

### Critical bug in shipped artifact

1. Unpublish GitHub Release.
2. Update vitrine download CTAs to point to previous version (manual edit + redeploy) OR gray out the button with "Mise à jour en cours".
3. Fix bug on `main`.
4. Tag `v0.1.0-alpha.1` → CI publishes new artifacts → re-enable downloads.
5. Push update via electron-updater to existing installs.

### PostHog telemetry flood

If `app_launched` count is wildly off (ingestion loop, rogue property):
1. Disable `POSTHOG_KEY` env var on CI for next build.
2. Ship `-alpha.1` with telemetry temporarily disabled.
3. Fix root cause, re-enable.

### Domain outage

If `buildoto.com` is down and tag is live:
- GitHub Release page serves as fallback; update its body to link artifacts directly.
- Tweet / channel post pointing to release URL.

---

## Final green-light checklist

- [ ] Phase 0: all 3 smokes green on macOS arm64
- [ ] Phase 1: CHANGELOG updated, version bumped, commit pushed
- [ ] Phase 2: tag pushed
- [ ] Phase 3: CI release workflow completed with all artifacts attached
- [ ] Phase 5: fresh-install smoke passed on macOS arm64 + Windows x64 + Linux x64
- [ ] Phase 6: release published (not draft)
- [ ] Phase 7: vitrine live, docs live, DNS resolves
- [ ] Phase 8: PostHog ingesting first events, Sentry quiet

Definition of done: the "Télécharger" button on `buildoto.com` downloads a working build, and the user can complete onboarding + run one agent turn without reading docs.
