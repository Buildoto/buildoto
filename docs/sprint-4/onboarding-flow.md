# Sprint 4 — Onboarding flow design

5-screen flow triggered at first launch when `settings.onboardingCompleted === false`. Copy is French (user-facing text); identifiers are English (per CLAUDE.md §0).

All screens share a layout: illustration left, form/content right, progress bar top, "Précédent" / "Passer" / "Continuer" footer. Data-attr `data-onboarding-step` on the shell for integration tests.

---

## Step 1 — `welcome-screen.tsx`

**User goal:** understand what Buildoto is, consent to telemetry, start.

**Content:**
- Wordmark + tagline: "L'assistant IA pour l'architecture, la construction et le BIM."
- 3-line value prop: agent IA, modeleur FreeCAD intégré, versioning GitHub.
- Checkbox "Autoriser l'envoi de statistiques anonymes d'usage" (unchecked by default). Link "En savoir plus" → opens `https://buildoto.com/privacy` via `shell.openExternal`.
- Checkbox "Autoriser l'envoi de rapports de crash anonymes" (unchecked by default).

**Inputs:** two checkbox values.

**Validation:** none (both optional).

**IPC on "Continuer":**
- `TELEMETRY_SET_CONSENT { consent: checked ? 'granted' : 'denied' }`
- `SETTINGS_SET { crashReportingEnabled: checked2 }`
- `ONBOARDING_SET_STEP { step: 2 }`

**Skippable:** no — user must click Continuer.

**Error states:** none expected (pure local writes).

---

## Step 2 — `api-key-screen.tsx`

**User goal:** configure at least one LLM provider so the agent is usable.

**Content:**
- Header: "Configure un fournisseur d'IA."
- Provider list (6 rows, reusing `ProviderRow` from `settings-dialog.tsx`): Anthropic, OpenAI, Mistral, Gemini, Ollama, OpenRouter.
- Each row: name + description + password input + "Valider" button + status pill (`Non configuré` / `Configuré`).
- Ollama row shows "Aucune clé requise" + a "Tester la connexion" button instead.
- Radio "Utiliser par défaut" across rows (mirrors `defaultProvider` setting).

**Inputs:** provider id + API key string per row.

**Validation:**
- Key must be non-empty when "Valider" clicked.
- At least one provider must be configured to leave this step (button disabled otherwise, hint: "Configure au moins un fournisseur pour continuer.").

**IPC per row:**
- `SETTINGS_SET_API_KEY { providerId, key }` → returns `{ ok: true }` or throws.
- `SETTINGS_SET_DEFAULT_PROVIDER { providerId }` on radio change.

**IPC on "Continuer":** `ONBOARDING_SET_STEP { step: 3 }`.

**Skippable:** only the Ollama path is skippable without a key. Other providers are independently optional; user just needs ≥1 configured.

**Error states:**
- Key validation fails (400/401 from provider on first agent turn — not tested here, just stored) → toast "Clé enregistrée, non vérifiée."
- Keytar write fails (rare) → toast "Impossible de sauvegarder la clé. Redémarre l'application."

---

## Step 3 — `github-screen.tsx`

**User goal:** connect GitHub for auto-commits & remote sync.

**Content:**
- Explainer: "Buildoto peut pousser automatiquement tes modifications sur GitHub. C'est optionnel."
- Button "Se connecter à GitHub" → triggers Device Flow.
- While flow active: show user code + verification URL + "Ouvrir dans le navigateur" button.
- On success: show connected account + repos count + "Continuer" enabled.
- Secondary CTA: "Connecter plus tard."

**Inputs:** none (OAuth Device Flow).

**Validation:** none.

**IPC:**
- `GITHUB_START_DEVICE_FLOW` → `{ userCode, verificationUri }`
- `GITHUB_POLL_DEVICE_FLOW` (called internally by handler, event-based)
- Event `github:auth-changed` → `{ login, avatarUrl }`
- `ONBOARDING_SET_STEP { step: 4 }` on Continuer/Skip.

**Skippable:** yes, "Connecter plus tard" sets `onboardingStep: 4` without auth.

**Error states:**
- Device code expired (15 min) → "Le code a expiré, réessaie."
- Network error → inline banner + retry.
- Access denied → "Autorisation refusée, réessaie."

---

## Step 4 — `project-screen.tsx`

**User goal:** create the first Buildoto project so the workspace isn't empty on entry.

**Content:**
- Header: "Crée ton premier projet."
- Form:
  - Nom du projet (text, required, 2-60 chars, no `/`)
  - Emplacement (path picker button using `dialog.showOpenDialog({ properties: ['openDirectory'] })`)
  - Template (radio: Vide / Maison individuelle / Réhabilitation — "Vide" preselected; other 2 are placeholders for sprint 6, ship disabled with tooltip "Disponible prochainement")
- Live preview of final path: `{selectedDir}/{projectName}/`.

**Inputs:** name, parent dir, template id.

**Validation:**
- Name: regex `^[\w\- ]{2,60}$`, not already existing at target path, inline error.
- Parent dir: must be writable (check via handler).

**IPC on "Continuer":**
- `PROJECT_CREATE { name, parentDir, templateId: 'empty' }` → `{ projectId, path }` or `{ error }`.
- On success: `ONBOARDING_SET_STEP { step: 5 }` + store `activeProjectId: projectId`.

**Skippable:** yes, "Créer plus tard" sets step 5 without project. Tour will be generic in that case.

**Error states:**
- Dir not writable → "Dossier en lecture seule, choisis un autre emplacement."
- Name collision → "Un projet nommé X existe déjà à cet emplacement."
- Git init fails → "Impossible d'initialiser le repo Git. Vérifie que Git est installé."

---

## Step 5 — `tour-screen.tsx`

**User goal:** learn where the 4 main panels are + key shortcuts.

**Content:**
- Full-screen overlay with dim backdrop.
- Tooltip anchored to each of 4 regions, one at a time (using `data-tour-target` attributes on the main layout):
  1. Agent panel — "Écris ce que tu veux construire ici. Tab bascule Build ↔ Plan."
  2. Viewport — "La géométrie s'actualise à chaque appel d'outil FreeCAD."
  3. Git panel — "Chaque modification crée un commit automatique."
  4. Settings button — "Gère tes clés, fournisseurs et serveurs MCP ici."
- Footer: "Précédent" / progress (1/4 → 4/4) / "Suivant" → on 4/4 button becomes "Commencer".

**Inputs:** none.

**Validation:** none.

**IPC on "Commencer":** `ONBOARDING_COMPLETE {}` → sets `onboardingCompleted: true`, fires `onboarding_completed` telemetry with `durationMs`, redirects to `/`.

**Skippable:** yes, "Passer la visite" on every frame.

**Error states:** none (UI-only).

---

## Persistence & resume

- `settings.onboardingCompleted: boolean` (default false).
- `settings.onboardingStep: 1 | 2 | 3 | 4 | 5` (default 1) — lets users resume if they quit mid-flow.
- Router on app start: `!onboardingCompleted` → redirect to `/onboarding/{onboardingStep}`.
- Exit app button on each step triggers `dialog.showMessageBox` with "Reprendre plus tard / Continuer la configuration".

## Telemetry events fired

- Step 1 Continuer → `onboarding_step_completed { step: 1 }`
- Step 2 Continuer → `onboarding_step_completed { step: 2, providerCount: N }`
- Step 3 Continuer/Skip → `onboarding_step_completed { step: 3, githubConnected: bool }`
- Step 4 Continuer/Skip → `onboarding_step_completed { step: 4, projectCreated: bool }`
- Step 5 Commencer → `onboarding_step_completed { step: 5 }` then `onboarding_completed { durationMs }`

Events only fire if `telemetryConsent === 'granted'` (user-enabled in Step 1).

## Integration test hooks

Smoke script `pnpm smoke:onboarding` (optional, sprint 4.5):
- Wipe electron-store
- Boot Electron with `ONBOARDING_AUTOMATION=1` flag (bypasses dialogs, accepts defaults)
- Assert `onboardingCompleted === true` at the end
- Assert 5 `onboarding_step_completed` + 1 `onboarding_completed` in capture queue
