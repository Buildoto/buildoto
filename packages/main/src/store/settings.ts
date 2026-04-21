import { randomUUID } from 'node:crypto'
import Store from 'electron-store'
import keytar from 'keytar'
import {
  PROVIDER_IDS,
  type AppSettings,
  type McpServerConfig,
  type ProviderId,
  type ProvidersStatus,
  type RecentProject,
  type TelemetryConsent,
  type ThemePreference,
} from '@buildoto/shared'
import {
  KEYTAR_ACCOUNT_GITHUB,
  KEYTAR_SERVICE,
  PROVIDER_KEYTAR_ACCOUNTS,
} from '../lib/constants'
import { decryptField, encryptField } from './safe-storage'

interface ProviderModelMap {
  // Per-provider preferred model. Keyed by ProviderId; only set for providers
  // the user has touched. Renderer reads via SETTINGS_GET_PROVIDERS_STATUS.
  [providerId: string]: string
}

interface SettingsSchema {
  schemaVersion: number
  windowBounds?: { x?: number; y?: number; width: number; height: number }
  defaultProvider: ProviderId
  providerModels: ProviderModelMap
  mcpServers: McpServerConfig[]
  recentProjects: RecentProject[]
  lastActiveProjectId: string | null
  // Sprint 4 additions
  theme: ThemePreference
  onboardingCompleted: boolean
  onboardingStep: number
  telemetryConsent: TelemetryConsent
  telemetryAnonymousId: string // stored as safeStorage ciphertext with `enc:v1:` sentinel
  crashReportingEnabled: boolean
  autoUpdateEnabled: boolean
}

export const store = new Store<SettingsSchema>({
  defaults: {
    schemaVersion: 2,
    defaultProvider: 'anthropic',
    providerModels: {},
    mcpServers: [],
    recentProjects: [],
    lastActiveProjectId: null,
    theme: 'system',
    onboardingCompleted: false,
    onboardingStep: 1,
    telemetryConsent: 'pending',
    telemetryAnonymousId: '',
    crashReportingEnabled: false,
    autoUpdateEnabled: true,
  },
})

// Migrate V1 stores (sprint 1-3) to V2 on first read. Runs once per install.
function migrateStoreIfNeeded(): void {
  const current = (store.get('schemaVersion') as number | undefined) ?? 1
  if (current >= 2) return
  const defaults: Partial<SettingsSchema> = {
    theme: 'system',
    onboardingCompleted: false,
    onboardingStep: 1,
    telemetryConsent: 'pending',
    telemetryAnonymousId: '',
    crashReportingEnabled: false,
    autoUpdateEnabled: true,
  }
  for (const [key, value] of Object.entries(defaults)) {
    const existing = store.get(key as keyof SettingsSchema)
    if (existing === undefined || existing === null) {
      store.set(key as keyof SettingsSchema, value as never)
    }
  }
  store.set('schemaVersion', 2)
}
migrateStoreIfNeeded()

function ensureAnonymousId(): string {
  const stored = store.get('telemetryAnonymousId')
  if (stored) {
    const plain = decryptField(stored)
    if (plain) return plain
  }
  const fresh = randomUUID()
  store.set('telemetryAnonymousId', encryptField(fresh))
  return fresh
}

export function getAppSettings(): AppSettings {
  return {
    theme: store.get('theme'),
    onboardingCompleted: store.get('onboardingCompleted'),
    onboardingStep: store.get('onboardingStep'),
    telemetryConsent: store.get('telemetryConsent'),
    crashReportingEnabled: store.get('crashReportingEnabled'),
    autoUpdateEnabled: store.get('autoUpdateEnabled'),
  }
}

export function setTheme(theme: ThemePreference): void {
  store.set('theme', theme)
}

export function setOnboardingStep(step: number): void {
  const clamped = Math.max(1, Math.min(5, Math.floor(step)))
  store.set('onboardingStep', clamped)
}

export function completeOnboarding(): void {
  store.set('onboardingCompleted', true)
}

export function setTelemetryConsent(consent: TelemetryConsent): void {
  store.set('telemetryConsent', consent)
  if (consent === 'denied') {
    // Regenerate the anonymous id on next opt-in to prevent re-identification.
    store.set('telemetryAnonymousId', '')
  } else if (consent === 'granted') {
    ensureAnonymousId()
  }
}

export function setCrashReporting(enabled: boolean): void {
  store.set('crashReportingEnabled', enabled)
}

export function setAutoUpdate(enabled: boolean): void {
  store.set('autoUpdateEnabled', enabled)
}

export function resetAnonymousId(): void {
  store.set('telemetryAnonymousId', '')
}

export function getTelemetryAnonymousId(): string {
  return ensureAnonymousId()
}

// ── Per-provider API key (keytar) ───────────────────────────────────────────

export async function getApiKey(providerId: ProviderId): Promise<string | null> {
  return keytar.getPassword(KEYTAR_SERVICE, PROVIDER_KEYTAR_ACCOUNTS[providerId])
}

export async function setApiKey(
  providerId: ProviderId,
  apiKey: string,
): Promise<void> {
  if (!apiKey.trim()) throw new Error('API key is empty')
  await keytar.setPassword(
    KEYTAR_SERVICE,
    PROVIDER_KEYTAR_ACCOUNTS[providerId],
    apiKey.trim(),
  )
}

export async function clearApiKey(providerId: ProviderId): Promise<void> {
  await keytar.deletePassword(
    KEYTAR_SERVICE,
    PROVIDER_KEYTAR_ACCOUNTS[providerId],
  )
}

export async function hasApiKey(providerId: ProviderId): Promise<boolean> {
  const key = await keytar.getPassword(
    KEYTAR_SERVICE,
    PROVIDER_KEYTAR_ACCOUNTS[providerId],
  )
  return !!key
}

export async function getProvidersStatus(): Promise<ProvidersStatus> {
  const models = store.get('providerModels')
  const out = {} as ProvidersStatus
  for (const id of PROVIDER_IDS) {
    out[id] = {
      isSet: id === 'ollama' ? true : await hasApiKey(id),
      model: models[id] ?? null,
    }
  }
  return out
}

export function getDefaultProvider(): ProviderId {
  return store.get('defaultProvider')
}

export function setDefaultProvider(providerId: ProviderId): void {
  store.set('defaultProvider', providerId)
}

export function getProviderModel(providerId: ProviderId): string | null {
  return store.get('providerModels')[providerId] ?? null
}

export function setProviderModel(providerId: ProviderId, model: string): void {
  const models = { ...store.get('providerModels'), [providerId]: model }
  store.set('providerModels', models)
}

// ── MCP server configs (electron-store) ─────────────────────────────────────

export function listMcpServers(): McpServerConfig[] {
  return store.get('mcpServers')
}

export function upsertMcpServer(config: McpServerConfig): McpServerConfig[] {
  const all = store.get('mcpServers')
  const next = all.filter((s) => s.name !== config.name).concat(config)
  store.set('mcpServers', next)
  return next
}

export function deleteMcpServer(name: string): McpServerConfig[] {
  const next = store.get('mcpServers').filter((s) => s.name !== name)
  store.set('mcpServers', next)
  return next
}

// ── GitHub OAuth token ──────────────────────────────────────────────────────

export async function getGithubToken(): Promise<string | null> {
  return keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_GITHUB)
}

export async function setGithubToken(token: string): Promise<void> {
  if (!token.trim()) throw new Error('GitHub token is empty')
  await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_GITHUB, token.trim())
}

export async function clearGithubToken(): Promise<void> {
  await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_GITHUB)
}
