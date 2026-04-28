import type { FreecadSidecarStatus } from './freecad-protocol'
import type {
  AgentMode,
  DeviceAuthPollState,
  DeviceAuthStart,
  GitCommit,
  GitPullResult,
  GitPushResult,
  GitStatus,
  GithubAuthStatus,
  GithubCreateRepoResult,
  McpServerConfig,
  McpServerStatus,
  Project,
  ProjectTreeDelta,
  ProviderId,
  ProvidersStatus,
  RecentProject,
  SessionFile,
  SessionMessage,
  SessionSummary,
  ToolCallProvenance,
} from './project-types'

// Every IPC channel used between main and renderer. Do not use string literals elsewhere.
export const IpcChannels = {
  // Agent (sprint 1, extended sprint 3)
  AGENT_RUN_TURN: 'agent:run-turn',
  AGENT_ABORT: 'agent:abort',
  AGENT_EVENT: 'agent:event',
  AGENT_SET_PROVIDER: 'agent:set-provider',
  AGENT_SET_MODE: 'agent:set-mode',
  AGENT_GET_STATE: 'agent:get-state',

  // FreeCAD (sprint 1)
  FREECAD_GET_STATUS: 'freecad:get-status',
  FREECAD_STATUS_CHANGE: 'freecad:status-change',
  FREECAD_RESTART: 'freecad:restart',

  // Settings (sprint 1, multi-provider in sprint 3)
  SETTINGS_GET_PROVIDERS_STATUS: 'settings:get-providers-status',
  SETTINGS_SET_PROVIDER_KEY: 'settings:set-provider-key',
  SETTINGS_CLEAR_PROVIDER_KEY: 'settings:clear-provider-key',
  SETTINGS_SET_PROVIDER_MODEL: 'settings:set-provider-model',
  SETTINGS_SET_DEFAULT_PROVIDER: 'settings:set-default-provider',

  // MCP (sprint 3)
  MCP_LIST_SERVERS: 'mcp:list-servers',
  MCP_UPSERT_SERVER: 'mcp:upsert-server',
  MCP_DELETE_SERVER: 'mcp:delete-server',
  MCP_RESTART_SERVER: 'mcp:restart-server',
  MCP_STATUS_CHANGED: 'mcp:status-changed',

  // Project lifecycle (sprint 2)
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_PICK_DIRECTORY: 'project:pick-directory',
  PROJECT_CLONE: 'project:clone',
  PROJECT_CLOSE: 'project:close',
  PROJECT_GET_ACTIVE: 'project:get-active',
  PROJECT_LIST_RECENT: 'project:list-recent',
  PROJECT_ACTIVE_CHANGED: 'project:active-changed',
  PROJECT_TREE_CHANGED: 'project:tree-changed',
  PROJECT_LIST_TREE: 'project:list-tree',
  PROJECT_READ_FILE: 'project:read-file',
  PROJECT_WRITE_FILE: 'project:write-file',

  // Sessions (sprint 2)
  SESSION_LIST: 'session:list',
  SESSION_LOAD: 'session:load',
  SESSION_NEW: 'session:new',
  SESSION_SET_ACTIVE: 'session:set-active',
  SESSION_DELETE: 'session:delete',
  SESSION_ACTIVE_CHANGED: 'session:active-changed',

  // Git (sprint 2)
  GIT_STATUS: 'git:status',
  GIT_LOG: 'git:log',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_CHECKOUT: 'git:checkout',
  GIT_CREATE_BRANCH: 'git:create-branch',
  GIT_LIST_BRANCHES: 'git:list-branches',
  GIT_DIFF: 'git:diff',
  GIT_FETCH: 'git:fetch',
  GIT_ABORT_MERGE: 'git:abort-merge',
  GIT_STATUS_CHANGED: 'git:status-changed',

  // Menu actions (sprint 2)
  MENU_ACTION: 'menu:action',

  // GitHub (sprint 2)
  GITHUB_START_DEVICE_AUTH: 'github:start-device-auth',
  GITHUB_POLL_DEVICE_AUTH: 'github:poll-device-auth',
  GITHUB_CANCEL_DEVICE_AUTH: 'github:cancel-device-auth',
  GITHUB_GET_AUTH_STATUS: 'github:get-auth-status',
  GITHUB_SIGN_OUT: 'github:sign-out',
  GITHUB_CREATE_REPO: 'github:create-repo',
  GITHUB_LINK_REMOTE: 'github:link-remote',

  // App-wide settings (sprint 4): theme, onboarding, telemetry consent
  APP_SETTINGS_GET: 'app-settings:get',
  APP_SETTINGS_SET_THEME: 'app-settings:set-theme',
  APP_SETTINGS_SET_ONBOARDING_STEP: 'app-settings:set-onboarding-step',
  APP_SETTINGS_COMPLETE_ONBOARDING: 'app-settings:complete-onboarding',
  APP_SETTINGS_SET_TELEMETRY_CONSENT: 'app-settings:set-telemetry-consent',
  APP_SETTINGS_SET_CRASH_REPORTING: 'app-settings:set-crash-reporting',
  APP_SETTINGS_SET_AUTO_UPDATE: 'app-settings:set-auto-update',
  APP_SETTINGS_RESET_ANONYMOUS_ID: 'app-settings:reset-anonymous-id',

  // App metadata (sprint 4)
  APP_GET_METADATA: 'app:get-metadata',

  // Telemetry (sprint 4)
  TELEMETRY_CAPTURE: 'telemetry:capture',

  // Auto-updater (sprint 4)
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_QUIT_AND_INSTALL: 'updater:quit-and-install',
  UPDATER_STATUS_CHANGED: 'updater:status-changed',

  // Buildoto AI auth (sprint 8) — OAuth-lite PKCE deep-link flow
  BUILDOTO_AUTH_START: 'buildoto-auth:start',
  BUILDOTO_AUTH_CANCEL: 'buildoto-auth:cancel',
  BUILDOTO_AUTH_SIGN_OUT: 'buildoto-auth:sign-out',
  BUILDOTO_AUTH_GET_STATUS: 'buildoto-auth:get-status',
  BUILDOTO_AUTH_STATUS_CHANGED: 'buildoto-auth:status-changed',

  // Usage (sprint 8) — quota snapshot driven by X-Quota-* response headers
  BUILDOTO_USAGE_GET: 'buildoto-usage:get',
  BUILDOTO_USAGE_UPDATED: 'buildoto-usage:updated',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

// ── Agent ───────────────────────────────────────────────────────────────────

export interface AgentRunTurnRequest {
  userMessage: string
}

export interface AgentRunTurnResult {
  stopReason: string
}

export interface AgentSetProviderRequest {
  providerId: ProviderId
  model?: string
}

export interface AgentSetModeRequest {
  mode: AgentMode
}

export interface AgentState {
  providerId: ProviderId
  model: string
  mode: AgentMode
}

export type AgentEvent =
  | { type: 'assistant_text'; text: string; provider?: ProviderId }
  | { type: 'token_delta'; text: string }
  | {
      type: 'tool_call'
      toolUseId: string
      name: string
      input: unknown
      provenance: ToolCallProvenance
    }
  | { type: 'tool_result'; toolUseId: string; output: string; isError: boolean }
  | { type: 'viewport_update'; gltfBase64: string; bytes: number }
  | { type: 'commit_created'; sha: string; message: string; file: string }
  | { type: 'mode_changed'; mode: AgentMode }
  | { type: 'provider_changed'; providerId: ProviderId; model: string }
  | { type: 'sources'; sources: BuildotoRagSource[] }
  | { type: 'done'; stopReason: string }
  | { type: 'canceled' }
  | { type: 'error'; message: string }

// ── Settings ────────────────────────────────────────────────────────────────

export interface SetProviderKeyRequest {
  providerId: ProviderId
  apiKey: string
}

export interface ClearProviderKeyRequest {
  providerId: ProviderId
}

export interface SetProviderModelRequest {
  providerId: ProviderId
  model: string
}

export interface SetDefaultProviderRequest {
  providerId: ProviderId
}

// ── MCP ─────────────────────────────────────────────────────────────────────

export interface McpUpsertServerRequest {
  config: McpServerConfig
}

export interface McpDeleteServerRequest {
  name: string
}

export interface McpRestartServerRequest {
  name: string
}

// ── Project ─────────────────────────────────────────────────────────────────

export interface ProjectCreateRequest {
  name: string
  parentPath: string
  createGithubRepo?: { private: boolean }
}

export interface ProjectOpenRequest {
  path: string
}

export interface ProjectCloneRequest {
  url: string
  destPath: string
}

export interface ProjectReadFileRequest {
  relativePath: string
}

export interface ProjectReadFileResult {
  relativePath: string
  content: string
  encoding: 'utf-8' | 'base64'
  sizeBytes: number
}

export interface ProjectWriteFileRequest {
  relativePath: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

export interface ProjectTreeEntry {
  path: string
  name: string
  isDirectory: boolean
  children?: ProjectTreeEntry[]
}

// ── Session ─────────────────────────────────────────────────────────────────

export interface SessionLoadRequest {
  sessionId: string
}

export interface SessionSetActiveRequest {
  sessionId: string
}

export interface SessionNewResult {
  sessionId: string
}

export interface SessionActiveChanged {
  sessionId: string
  messages: SessionMessage[]
}

// ── Git ─────────────────────────────────────────────────────────────────────

export interface GitLogRequest {
  limit?: number
}

export interface GitCommitRequest {
  message: string
  files?: string[]
}

export interface GitCommitResult {
  sha: string
}

export interface GitCheckoutRequest {
  branch: string
  create?: boolean
}

export interface GitCreateBranchRequest {
  name: string
  checkout?: boolean
}

export interface GitDiffRequest {
  path?: string
}

// ── GitHub ──────────────────────────────────────────────────────────────────

export interface GithubCreateRepoRequest {
  name: string
  description?: string
  private: boolean
}

export interface GithubLinkRemoteRequest {
  cloneUrl: string
}

// ── Menu ────────────────────────────────────────────────────────────────────

export type MenuAction =
  | { kind: 'new-project' }
  | { kind: 'open-project' }
  | { kind: 'open-recent'; path: string }
  | { kind: 'close-project' }
  | { kind: 'open-settings' }

// ── App settings (sprint 4) ─────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system'
export type TelemetryConsent = 'pending' | 'granted' | 'denied'

export interface AppSettings {
  theme: ThemePreference
  onboardingCompleted: boolean
  onboardingStep: number
  telemetryConsent: TelemetryConsent
  crashReportingEnabled: boolean
  autoUpdateEnabled: boolean
}

export interface SetThemeRequest {
  theme: ThemePreference
}

export interface SetOnboardingStepRequest {
  step: number
}

export interface SetTelemetryConsentRequest {
  consent: TelemetryConsent
}

export interface SetCrashReportingRequest {
  enabled: boolean
}

export interface SetAutoUpdateRequest {
  enabled: boolean
}

export interface AppMetadata {
  version: string
  platform: 'darwin' | 'win32' | 'linux'
  arch: 'arm64' | 'x64' | string
  channel: 'alpha' | 'beta' | 'stable'
  isPackaged: boolean
}

// ── Telemetry (sprint 4) ────────────────────────────────────────────────────

export interface TelemetryCaptureRequest {
  event: string
  properties?: Record<string, unknown>
}

// ── Buildoto AI auth (sprint 8) ─────────────────────────────────────────────

export type BuildotoAuthState =
  | { kind: 'signed-out' }
  | { kind: 'pending'; startedAt: number }
  | { kind: 'signed-in'; email: string | null; planTier: string; sessionId: string }
  | { kind: 'error'; message: string }

export interface BuildotoRagSource {
  title: string
  url: string | null
  license: string | null
  excerpt: string
}

// ── Buildoto AI usage snapshot (sprint 8) ───────────────────────────────────

export interface BuildotoUsageSnapshot {
  // Zero for signed-out users; the renderer hides the pill when `known` is
  // false, so the exact number doesn't matter in that state.
  known: boolean
  planTier: 'free' | 'pro' | string
  limit: number
  used: number
  remaining: number
  // ISO string so the renderer can tell stale-cached data from a fresh
  // X-Quota-* header tick.
  updatedAt: string | null
}

// ── Updater (sprint 4) ──────────────────────────────────────────────────────

export type UpdaterStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string }
  | { kind: 'not-available' }
  | { kind: 'downloading'; percent: number; bytesPerSecond: number }
  | { kind: 'downloaded'; version: string }
  | { kind: 'error'; message: string }
  | { kind: 'disabled'; reason: string }

// ── Re-exports + window.buildoto API ────────────────────────────────────────

export type { FreecadSidecarStatus }
export * from './project-types'

export interface BuildotoApi {
  agent: {
    runTurn: (req: AgentRunTurnRequest) => Promise<AgentRunTurnResult>
    abort: () => Promise<void>
    setProvider: (req: AgentSetProviderRequest) => Promise<AgentState>
    setMode: (req: AgentSetModeRequest) => Promise<AgentState>
    getState: () => Promise<AgentState>
    onEvent: (handler: (event: AgentEvent) => void) => () => void
  }
  freecad: {
    getStatus: () => Promise<FreecadSidecarStatus>
    restart: () => Promise<FreecadSidecarStatus>
    onStatusChange: (handler: (status: FreecadSidecarStatus) => void) => () => void
  }
  settings: {
    getProvidersStatus: () => Promise<ProvidersStatus>
    setProviderKey: (req: SetProviderKeyRequest) => Promise<ProvidersStatus>
    clearProviderKey: (req: ClearProviderKeyRequest) => Promise<ProvidersStatus>
    setProviderModel: (req: SetProviderModelRequest) => Promise<ProvidersStatus>
    setDefaultProvider: (req: SetDefaultProviderRequest) => Promise<ProvidersStatus>
  }
  mcp: {
    listServers: () => Promise<{ configs: McpServerConfig[]; statuses: McpServerStatus[] }>
    upsertServer: (req: McpUpsertServerRequest) => Promise<McpServerStatus>
    deleteServer: (req: McpDeleteServerRequest) => Promise<void>
    restartServer: (req: McpRestartServerRequest) => Promise<McpServerStatus>
    onStatusChanged: (handler: (status: McpServerStatus) => void) => () => void
  }
  project: {
    create: (req: ProjectCreateRequest) => Promise<Project>
    open: (req: ProjectOpenRequest) => Promise<Project>
    pickDirectory: (opts?: { title?: string }) => Promise<string | null>
    clone: (req: ProjectCloneRequest) => Promise<Project>
    close: () => Promise<void>
    getActive: () => Promise<Project | null>
    listRecent: () => Promise<RecentProject[]>
    listTree: () => Promise<ProjectTreeEntry[]>
    readFile: (req: ProjectReadFileRequest) => Promise<ProjectReadFileResult>
    writeFile: (req: ProjectWriteFileRequest) => Promise<void>
    onActiveChanged: (handler: (project: Project | null) => void) => () => void
    onTreeChanged: (handler: (delta: ProjectTreeDelta) => void) => () => void
  }
  session: {
    list: () => Promise<SessionSummary[]>
    load: (req: SessionLoadRequest) => Promise<SessionFile>
    new: () => Promise<SessionNewResult>
    setActive: (req: SessionSetActiveRequest) => Promise<void>
    delete: (req: SessionLoadRequest) => Promise<void>
    onActiveChanged: (handler: (payload: SessionActiveChanged) => void) => () => void
  }
  git: {
    status: () => Promise<GitStatus>
    log: (req?: GitLogRequest) => Promise<GitCommit[]>
    commit: (req: GitCommitRequest) => Promise<GitCommitResult>
    push: () => Promise<GitPushResult>
    pull: () => Promise<GitPullResult>
    checkout: (req: GitCheckoutRequest) => Promise<void>
    createBranch: (req: GitCreateBranchRequest) => Promise<void>
    listBranches: () => Promise<string[]>
    diff: (req?: GitDiffRequest) => Promise<string>
    fetch: () => Promise<void>
    abortMerge: () => Promise<void>
    onStatusChanged: (handler: (status: GitStatus) => void) => () => void
  }
  github: {
    startDeviceAuth: () => Promise<DeviceAuthStart>
    pollDeviceAuth: () => Promise<DeviceAuthPollState>
    cancelDeviceAuth: () => Promise<void>
    getAuthStatus: () => Promise<GithubAuthStatus>
    signOut: () => Promise<void>
    createRepo: (req: GithubCreateRepoRequest) => Promise<GithubCreateRepoResult>
    linkRemote: (req: GithubLinkRemoteRequest) => Promise<void>
  }
  menu: {
    onAction: (handler: (action: MenuAction) => void) => () => void
  }
  app: {
    getMetadata: () => Promise<AppMetadata>
  }
  appSettings: {
    get: () => Promise<AppSettings>
    setTheme: (req: SetThemeRequest) => Promise<AppSettings>
    setOnboardingStep: (req: SetOnboardingStepRequest) => Promise<AppSettings>
    completeOnboarding: () => Promise<AppSettings>
    setTelemetryConsent: (req: SetTelemetryConsentRequest) => Promise<AppSettings>
    setCrashReporting: (req: SetCrashReportingRequest) => Promise<AppSettings>
    setAutoUpdate: (req: SetAutoUpdateRequest) => Promise<AppSettings>
    resetAnonymousId: () => Promise<void>
  }
  telemetry: {
    capture: (req: TelemetryCaptureRequest) => Promise<void>
  }
  updater: {
    check: () => Promise<UpdaterStatus>
    download: () => Promise<UpdaterStatus>
    quitAndInstall: () => Promise<void>
    onStatusChanged: (handler: (status: UpdaterStatus) => void) => () => void
  }
  buildotoAuth: {
    start: () => Promise<BuildotoAuthState>
    cancel: () => Promise<void>
    signOut: () => Promise<void>
    getStatus: () => Promise<BuildotoAuthState>
    onStatusChanged: (handler: (state: BuildotoAuthState) => void) => () => void
  }
  buildotoUsage: {
    get: () => Promise<BuildotoUsageSnapshot>
    onUpdated: (handler: (snapshot: BuildotoUsageSnapshot) => void) => () => void
  }
}

declare global {
  interface Window {
    buildoto: BuildotoApi
  }
}
