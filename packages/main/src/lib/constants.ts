// Centralized constants for the main process. Values that may vary between
// environments are read from process.env with a safe default.

export const KEYTAR_SERVICE = 'buildoto'
export const KEYTAR_ACCOUNT_GITHUB = 'github'
export const KEYTAR_ACCOUNT_BUILDOTO_REFRESH = 'buildoto-ai-refresh'

// Per-provider keytar accounts. Provider id == account name; defining the
// constants here keeps the spelling under one roof and surfaces typos at
// type-check time via the ProviderId union.
import type { ProviderId } from '@buildoto/shared'
export const PROVIDER_KEYTAR_ACCOUNTS: Record<ProviderId, string> = {
  'buildoto-ai': KEYTAR_ACCOUNT_BUILDOTO_REFRESH,
  anthropic: 'anthropic',
  openai: 'openai',
  mistral: 'mistral',
  google: 'google',
  ollama: 'ollama',
  openrouter: 'openrouter',
}

// GitHub OAuth App public Client ID (Device Flow). Public identifier, not a
// secret. Fill `BUILDOTO_GITHUB_CLIENT_ID` in `.env.local` (the value is
// inlined into the main bundle by `electron.vite.config.ts` via Vite's
// loadEnv + define). Register the OAuth App with Device Flow enabled at
// https://github.com/settings/applications/new.
export const GITHUB_CLIENT_ID = process.env.BUILDOTO_GITHUB_CLIENT_ID || ''

export const GITHUB_DEVICE_CODE_ENDPOINT = 'https://github.com/login/device/code'
export const GITHUB_ACCESS_TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token'

export const BUILDOTO_DIR = '.buildoto'
export const BUILDOTO_CONFIG_FILE = 'config.json'
export const BUILDOTO_SESSIONS_DIR = 'sessions'
export const BUILDOTO_CACHE_DIR = 'cache'

export const DEFAULT_AGENT_MODEL = 'claude-sonnet-4-5-20250929'
export const MAX_HISTORY_TURNS = 50
export const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderId, string> = {
  'buildoto-ai': 'buildoto-ai-v1',
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  mistral: 'mistral-large-latest',
  google: 'gemini-1.5-pro',
  ollama: 'llama3.2',
  openrouter: 'anthropic/claude-sonnet-4',
}
export const COMMIT_MESSAGE_MODEL = 'claude-haiku-4-5-20251001'

export const WATCHER_DEBOUNCE_MS = 150
export const GIT_STATUS_DEBOUNCE_MS = 500

// Window defaults
export const DEFAULT_WINDOW_WIDTH = 1280
export const DEFAULT_WINDOW_HEIGHT = 800
export const MIN_WINDOW_WIDTH = 960
export const MIN_WINDOW_HEIGHT = 600

// Dev renderer URL (process.env override for custom ports)
export const DEV_RENDERER_URL = 'http://localhost:5173'

// GitHub repo link (Help menu)
export const BUILDOTO_GITHUB_URL = 'https://github.com/buildoto/buildoto'

// PostHog telemetry defaults
export const POSTHOG_DEFAULT_HOST = 'https://eu.i.posthog.com'
export const POSTHOG_FLUSH_AT = 20
export const POSTHOG_FLUSH_INTERVAL = 10_000

// FreeCAD sidecar
export const SIDECAR_BOOT_RETRY_ATTEMPTS = 2
export const SIDECAR_BOOT_RETRY_BACKOFF_MS = 1000
export const SIDECAR_SHUTDOWN_TIMEOUT_MS = 2_000
export const SIDECAR_PING_TIMEOUT_MS = 3_000
export const SIDECAR_PING_INTERVAL_MS = 30_000

// User-facing error messages (French — UI convention)
export const ERR_NO_ACTIVE_PROJECT = 'Aucun projet actif.'
export const ERR_NO_ACTIVE_SESSION = 'Aucune session active.'
export const ERR_NO_STAGED_CHANGES = 'Aucune modification à valider.'
export const SIDECAR_AUTO_RESTART_MAX_ATTEMPTS = 3
export const SIDECAR_LOG_DIR = '.buildoto-logs'
export const SIDECAR_LOG_FILE = 'freecad-sidecar.log'
export const SIDECAR_LOG_MAX_BYTES = 10 * 1024 * 1024
export const SIDECAR_REQUEST_DEFAULT_TIMEOUT_MS = 60_000
export const FREECAD_RESOURCES_DIR = 'resources/freecad'
export const FREECAD_RUNNER_SCRIPT = 'runner.py'

// Project directory defaults (fixed — existing projects use these names)
export const PROJECT_DIR_GENERATIONS = 'generations'
export const PROJECT_DIR_DOCUMENTS = 'documents'
export const PROJECT_DIR_EXPORTS = 'exports'
export const PROJECT_ID_PREFIX = 'prj_'
export const SESSION_ID_PREFIX = 'ses_'
export const MAX_TREE_DEPTH = 4
export const MAX_RECENT_PROJECTS = 20

// Git defaults
export const GIT_AUTHOR_NAME = 'Buildoto'
export const GIT_AUTHOR_EMAIL = 'bot@buildoto.app'

// Commit message generation
export const COMMIT_MESSAGE_MAX_TOKENS = 80
export const COMMIT_MESSAGE_CODE_SLICE = 1200
export const COMMIT_MESSAGE_TRUNCATE = 100

// Buildoto AI auth
export const AUTH_TIMEOUT_MS = 2 * 60 * 1000
export const REFRESH_SKEW_SEC = 90
export const USAGE_POLL_INTERVAL_MS = 5 * 60 * 1000

// Buildoto AI (sprint 8). Portal SPA hosts the OAuth-lite PKCE consent screen
// (opened in the user's browser); the portal FastAPI backend mints/refreshes
// the desktop tokens; the AI service is OpenAI-compatible. SPA and API live
// on distinct hostnames in prod (CF Worker vs Coolify) — keep them split so
// fetch() calls don't hit the SPA's static-asset fallback. Env overrides keep
// staging/local testing cheap without rebuilding.
export const BUILDOTO_PORTAL_URL = process.env.BUILDOTO_PORTAL_URL || 'https://app.buildoto.com'
export const BUILDOTO_PORTAL_API_URL =
  process.env.BUILDOTO_PORTAL_API_URL || 'https://app-api.buildoto.com'
export const BUILDOTO_AI_URL = process.env.BUILDOTO_AI_URL || 'https://api.buildoto.com'
export const BUILDOTO_DEEP_LINK_SCHEME = 'buildoto'
