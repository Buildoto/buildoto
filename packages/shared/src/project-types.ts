// Project, session, git, github, provider, and MCP domain types shared between main and renderer.

// ── Provider & mode ─────────────────────────────────────────────────────────

export const PROVIDER_IDS = [
  'buildoto-ai',
  'anthropic',
  'openai',
  'mistral',
  'google',
  'ollama',
  'openrouter',
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

export const DEFAULT_PROVIDER_ID: ProviderId = 'anthropic'

export type AgentMode = 'build' | 'plan'

export interface ProviderStatusEntry {
  isSet: boolean
  model: string | null
}

export type ProvidersStatus = Record<ProviderId, ProviderStatusEntry>

export interface McpServerConfig {
  name: string
  transport: 'stdio' | 'sse'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  enabled: boolean
}

export interface McpServerStatus {
  name: string
  state: 'stopped' | 'starting' | 'ready' | 'error'
  toolCount: number
  error?: string
}

export type ToolCallProvenance = 'builtin' | 'mcp' | 'freecad'

// ── Project ─────────────────────────────────────────────────────────────────

export interface ProjectGithubInfo {
  remoteUrl: string
  defaultBranch: string
}

export interface Project {
  projectId: string
  path: string
  name: string
  createdAt: string
  github: ProjectGithubInfo | null
  activeSessionId: string | null
}

export interface RecentProject {
  projectId: string
  path: string
  name: string
  lastOpenedAt: string
}

export interface ProjectConfigV1 {
  schemaVersion: 1
  projectId: string
  name: string
  createdAt: string
  agent: {
    provider: 'anthropic'
    model: string
    temperature: number
  }
  git: {
    autoCommit: boolean
    commitMessageLanguage: 'fr' | 'en'
  }
  github: ProjectGithubInfo | null
  paths: {
    generations: string
    documents: string
    exports: string
  }
  activeSessionId: string | null
}

export interface ProviderOverride {
  model: string
  temperature?: number
}

export interface ProjectConfigV2 {
  schemaVersion: 2
  projectId: string
  name: string
  createdAt: string
  agent: {
    defaultProvider: ProviderId
    mode: AgentMode
    providers: Partial<Record<ProviderId, ProviderOverride>>
  }
  mcpServers: McpServerConfig[]
  git: {
    autoCommit: boolean
    commitMessageLanguage: 'fr' | 'en'
  }
  github: ProjectGithubInfo | null
  paths: {
    generations: string
    documents: string
    exports: string
  }
  activeSessionId: string | null
}

export type ProjectConfig = ProjectConfigV2
export type AnyProjectConfig = ProjectConfigV1 | ProjectConfigV2

// ── Session ─────────────────────────────────────────────────────────────────
// UI-facing messages are structured (discriminated union). The opaque
// provider-agnostic history used to resume the agent loop is stored separately
// as `CoreMessage[]` (shape matches AI SDK's CoreMessage at runtime).

export interface ToolCallMessage {
  id: string
  role: 'tool_call'
  toolUseId: string
  name: string
  input: unknown
  provenance: ToolCallProvenance
  ts: string
}

export interface ToolResultMessage {
  id: string
  role: 'tool_result'
  toolUseId: string
  output: string
  isError: boolean
  ts: string
}

export type SessionMessage =
  | { id: string; role: 'user'; text: string; ts: string }
  | { id: string; role: 'assistant'; text: string; ts: string; provider?: ProviderId }
  | ToolCallMessage
  | ToolResultMessage
  | { id: string; role: 'error'; text: string; ts: string }

// Kept as `unknown` at the shared layer to avoid leaking the AI SDK into the
// renderer bundle. The main process treats these as `CoreMessage[]` from `ai`.
export type CoreMessageEntry = unknown

// Legacy shape (Anthropic SDK MessageParam). Retained for v1→v2 migration.
export type AnthropicHistoryEntry = unknown

export interface SessionTurnRecord {
  startedAt: string
  provider: ProviderId
  model: string
  mode: AgentMode
  stopReason: string
}

export interface SessionFileV1 {
  schemaVersion: 1
  sessionId: string
  createdAt: string
  updatedAt: string
  title: string
  messages: SessionMessage[]
  anthropicHistory: AnthropicHistoryEntry[]
  generations: { file: string; commit: string }[]
}

export interface SessionFileV2 {
  schemaVersion: 2
  sessionId: string
  createdAt: string
  updatedAt: string
  title: string
  messages: SessionMessage[]
  history: CoreMessageEntry[]
  turns: SessionTurnRecord[]
  generations: { file: string; commit: string }[]
}

export type SessionFile = SessionFileV2
export type AnySessionFile = SessionFileV1 | SessionFileV2

export interface SessionSummary {
  sessionId: string
  title: string
  updatedAt: string
  messageCount: number
}

// ── Git ─────────────────────────────────────────────────────────────────────

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  staged: string[]
  unstaged: string[]
  untracked: string[]
  conflicted: string[]
}

export interface GitCommit {
  sha: string
  shortSha: string
  message: string
  author: { name: string; email: string }
  date: string
}

export interface GitPushResult {
  ok: boolean
  remote: string
  branch: string
  error?: string
}

export interface GitPullResult {
  ok: boolean
  summary: string
  error?: string
}

// ── GitHub ──────────────────────────────────────────────────────────────────

export interface DeviceAuthStart {
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export type DeviceAuthPollState =
  | { state: 'pending' }
  | { state: 'authorized'; login: string }
  | { state: 'expired' }
  | { state: 'denied' }
  | { state: 'error'; message: string }

export interface GithubAuthStatus {
  isAuthed: boolean
  login?: string
}

export interface GithubCreateRepoResult {
  cloneUrl: string
  htmlUrl: string
  fullName: string
}

// ── Tree events ─────────────────────────────────────────────────────────────

export interface ProjectTreeDelta {
  projectId: string
  added: string[]
  removed: string[]
  changed: string[]
}
