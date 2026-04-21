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
export const COMMIT_MESSAGE_MODEL = 'claude-haiku-4-5-20251001'

export const WATCHER_DEBOUNCE_MS = 150
export const GIT_STATUS_DEBOUNCE_MS = 500

// Buildoto AI (sprint 8). Portal hosts the OAuth-lite PKCE consent screen +
// token endpoints; the AI service is OpenAI-compatible. Env overrides keep
// staging/local testing cheap without rebuilding.
export const BUILDOTO_PORTAL_URL = process.env.BUILDOTO_PORTAL_URL || 'https://app.buildoto.com'
export const BUILDOTO_AI_URL = process.env.BUILDOTO_AI_URL || 'https://api.buildoto.com'
export const BUILDOTO_DEEP_LINK_SCHEME = 'buildoto'
