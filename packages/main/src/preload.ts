import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IpcChannels,
  type AgentEvent,
  type AgentRunTurnRequest,
  type AgentRunTurnResult,
  type AgentSetModeRequest,
  type AgentSetProviderRequest,
  type AgentState,
  type AppMetadata,
  type AppSettings,
  type BuildotoApi,
  type BuildotoAuthState,
  type BuildotoUsageSnapshot,
  type ClearProviderKeyRequest,
  type DeviceAuthPollState,
  type DeviceAuthStart,
  type FreecadSidecarStatus,
  type GitCheckoutRequest,
  type GitCommit,
  type GitCommitRequest,
  type GitCommitResult,
  type GitCreateBranchRequest,
  type GitDiffRequest,
  type GitPullResult,
  type GitPushResult,
  type GitStatus,
  type GithubAuthStatus,
  type GithubCreateRepoRequest,
  type GithubCreateRepoResult,
  type GithubLinkRemoteRequest,
  type McpDeleteServerRequest,
  type McpRestartServerRequest,
  type McpServerConfig,
  type McpServerStatus,
  type McpUpsertServerRequest,
  type MenuAction,
  type Project,
  type ProjectCloneRequest,
  type ProjectCreateRequest,
  type ProjectOpenRequest,
  type ProjectReadFileRequest,
  type ProjectReadFileResult,
  type ProjectTreeDelta,
  type ProjectTreeEntry,
  type ProjectWriteFileRequest,
  type ProvidersStatus,
  type RecentProject,
  type SessionActiveChanged,
  type SessionFile,
  type SessionLoadRequest,
  type SessionNewResult,
  type SessionSetActiveRequest,
  type SessionSummary,
  type SetAutoUpdateRequest,
  type SetCrashReportingRequest,
  type SetDefaultProviderRequest,
  type SetOnboardingStepRequest,
  type SetProviderKeyRequest,
  type SetProviderModelRequest,
  type SetTelemetryConsentRequest,
  type SetThemeRequest,
  type TelemetryCaptureRequest,
  type UpdaterStatus,
} from '@buildoto/shared'

function subscribe<T>(channel: string, handler: (payload: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, payload: T) => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: BuildotoApi = {
  agent: {
    runTurn: (req: AgentRunTurnRequest) =>
      ipcRenderer.invoke(IpcChannels.AGENT_RUN_TURN, req) as Promise<AgentRunTurnResult>,
    abort: () => ipcRenderer.invoke(IpcChannels.AGENT_ABORT) as Promise<void>,
    setProvider: (req: AgentSetProviderRequest) =>
      ipcRenderer.invoke(IpcChannels.AGENT_SET_PROVIDER, req) as Promise<AgentState>,
    setMode: (req: AgentSetModeRequest) =>
      ipcRenderer.invoke(IpcChannels.AGENT_SET_MODE, req) as Promise<AgentState>,
    getState: () =>
      ipcRenderer.invoke(IpcChannels.AGENT_GET_STATE) as Promise<AgentState>,
    onEvent: (handler) => subscribe<AgentEvent>(IpcChannels.AGENT_EVENT, handler),
  },
  freecad: {
    getStatus: () =>
      ipcRenderer.invoke(IpcChannels.FREECAD_GET_STATUS) as Promise<FreecadSidecarStatus>,
    restart: () =>
      ipcRenderer.invoke(IpcChannels.FREECAD_RESTART) as Promise<FreecadSidecarStatus>,
    onStatusChange: (handler) =>
      subscribe<FreecadSidecarStatus>(IpcChannels.FREECAD_STATUS_CHANGE, handler),
  },
  settings: {
    getProvidersStatus: () =>
      ipcRenderer.invoke(IpcChannels.SETTINGS_GET_PROVIDERS_STATUS) as Promise<ProvidersStatus>,
    setProviderKey: (req: SetProviderKeyRequest) =>
      ipcRenderer.invoke(IpcChannels.SETTINGS_SET_PROVIDER_KEY, req) as Promise<ProvidersStatus>,
    clearProviderKey: (req: ClearProviderKeyRequest) =>
      ipcRenderer.invoke(IpcChannels.SETTINGS_CLEAR_PROVIDER_KEY, req) as Promise<ProvidersStatus>,
    setProviderModel: (req: SetProviderModelRequest) =>
      ipcRenderer.invoke(IpcChannels.SETTINGS_SET_PROVIDER_MODEL, req) as Promise<ProvidersStatus>,
    setDefaultProvider: (req: SetDefaultProviderRequest) =>
      ipcRenderer.invoke(
        IpcChannels.SETTINGS_SET_DEFAULT_PROVIDER,
        req,
      ) as Promise<ProvidersStatus>,
  },
  mcp: {
    listServers: () =>
      ipcRenderer.invoke(IpcChannels.MCP_LIST_SERVERS) as Promise<{
        configs: McpServerConfig[]
        statuses: McpServerStatus[]
      }>,
    upsertServer: (req: McpUpsertServerRequest) =>
      ipcRenderer.invoke(IpcChannels.MCP_UPSERT_SERVER, req) as Promise<McpServerStatus>,
    deleteServer: (req: McpDeleteServerRequest) =>
      ipcRenderer.invoke(IpcChannels.MCP_DELETE_SERVER, req) as Promise<void>,
    restartServer: (req: McpRestartServerRequest) =>
      ipcRenderer.invoke(IpcChannels.MCP_RESTART_SERVER, req) as Promise<McpServerStatus>,
    onStatusChanged: (handler) =>
      subscribe<McpServerStatus>(IpcChannels.MCP_STATUS_CHANGED, handler),
  },
  project: {
    create: (req: ProjectCreateRequest) =>
      ipcRenderer.invoke(IpcChannels.PROJECT_CREATE, req) as Promise<Project>,
    open: (req: ProjectOpenRequest) =>
      ipcRenderer.invoke(IpcChannels.PROJECT_OPEN, req) as Promise<Project>,
    pickDirectory: (opts) =>
      ipcRenderer.invoke(IpcChannels.PROJECT_PICK_DIRECTORY, opts ?? {}) as Promise<string | null>,
    clone: (req: ProjectCloneRequest) =>
      ipcRenderer.invoke(IpcChannels.PROJECT_CLONE, req) as Promise<Project>,
    close: () => ipcRenderer.invoke(IpcChannels.PROJECT_CLOSE) as Promise<void>,
    getActive: () => ipcRenderer.invoke(IpcChannels.PROJECT_GET_ACTIVE) as Promise<Project | null>,
    listRecent: () =>
      ipcRenderer.invoke(IpcChannels.PROJECT_LIST_RECENT) as Promise<RecentProject[]>,
    listTree: () =>
      ipcRenderer.invoke(IpcChannels.PROJECT_LIST_TREE) as Promise<ProjectTreeEntry[]>,
    readFile: (req: ProjectReadFileRequest) =>
      ipcRenderer.invoke(IpcChannels.PROJECT_READ_FILE, req) as Promise<ProjectReadFileResult>,
    writeFile: (req: ProjectWriteFileRequest) =>
      ipcRenderer.invoke(IpcChannels.PROJECT_WRITE_FILE, req) as Promise<void>,
    onActiveChanged: (handler) =>
      subscribe<Project | null>(IpcChannels.PROJECT_ACTIVE_CHANGED, handler),
    onTreeChanged: (handler) =>
      subscribe<ProjectTreeDelta>(IpcChannels.PROJECT_TREE_CHANGED, handler),
  },
  session: {
    list: () => ipcRenderer.invoke(IpcChannels.SESSION_LIST) as Promise<SessionSummary[]>,
    load: (req: SessionLoadRequest) =>
      ipcRenderer.invoke(IpcChannels.SESSION_LOAD, req) as Promise<SessionFile>,
    new: () => ipcRenderer.invoke(IpcChannels.SESSION_NEW) as Promise<SessionNewResult>,
    setActive: (req: SessionSetActiveRequest) =>
      ipcRenderer.invoke(IpcChannels.SESSION_SET_ACTIVE, req) as Promise<void>,
    delete: (req: SessionLoadRequest) =>
      ipcRenderer.invoke(IpcChannels.SESSION_DELETE, req) as Promise<void>,
    onActiveChanged: (handler) =>
      subscribe<SessionActiveChanged>(IpcChannels.SESSION_ACTIVE_CHANGED, handler),
  },
  git: {
    status: () => ipcRenderer.invoke(IpcChannels.GIT_STATUS) as Promise<GitStatus>,
    log: (req) => ipcRenderer.invoke(IpcChannels.GIT_LOG, req ?? {}) as Promise<GitCommit[]>,
    commit: (req: GitCommitRequest) =>
      ipcRenderer.invoke(IpcChannels.GIT_COMMIT, req) as Promise<GitCommitResult>,
    push: () => ipcRenderer.invoke(IpcChannels.GIT_PUSH) as Promise<GitPushResult>,
    pull: () => ipcRenderer.invoke(IpcChannels.GIT_PULL) as Promise<GitPullResult>,
    checkout: (req: GitCheckoutRequest) =>
      ipcRenderer.invoke(IpcChannels.GIT_CHECKOUT, req) as Promise<void>,
    createBranch: (req: GitCreateBranchRequest) =>
      ipcRenderer.invoke(IpcChannels.GIT_CREATE_BRANCH, req) as Promise<void>,
    listBranches: () =>
      ipcRenderer.invoke(IpcChannels.GIT_LIST_BRANCHES) as Promise<string[]>,
    diff: (req?: GitDiffRequest) =>
      ipcRenderer.invoke(IpcChannels.GIT_DIFF, req ?? {}) as Promise<string>,
    fetch: () =>
      ipcRenderer.invoke(IpcChannels.GIT_FETCH) as Promise<void>,
    abortMerge: () =>
      ipcRenderer.invoke(IpcChannels.GIT_ABORT_MERGE) as Promise<void>,
    onStatusChanged: (handler) =>
      subscribe<GitStatus>(IpcChannels.GIT_STATUS_CHANGED, handler),
  },
  github: {
    startDeviceAuth: () =>
      ipcRenderer.invoke(IpcChannels.GITHUB_START_DEVICE_AUTH) as Promise<DeviceAuthStart>,
    pollDeviceAuth: () =>
      ipcRenderer.invoke(IpcChannels.GITHUB_POLL_DEVICE_AUTH) as Promise<DeviceAuthPollState>,
    cancelDeviceAuth: () =>
      ipcRenderer.invoke(IpcChannels.GITHUB_CANCEL_DEVICE_AUTH) as Promise<void>,
    getAuthStatus: () =>
      ipcRenderer.invoke(IpcChannels.GITHUB_GET_AUTH_STATUS) as Promise<GithubAuthStatus>,
    signOut: () => ipcRenderer.invoke(IpcChannels.GITHUB_SIGN_OUT) as Promise<void>,
    createRepo: (req: GithubCreateRepoRequest) =>
      ipcRenderer.invoke(IpcChannels.GITHUB_CREATE_REPO, req) as Promise<GithubCreateRepoResult>,
    linkRemote: (req: GithubLinkRemoteRequest) =>
      ipcRenderer.invoke(IpcChannels.GITHUB_LINK_REMOTE, req) as Promise<void>,
  },
  menu: {
    onAction: (handler) => subscribe<MenuAction>(IpcChannels.MENU_ACTION, handler),
  },
  app: {
    getMetadata: () => ipcRenderer.invoke(IpcChannels.APP_GET_METADATA) as Promise<AppMetadata>,
  },
  appSettings: {
    get: () => ipcRenderer.invoke(IpcChannels.APP_SETTINGS_GET) as Promise<AppSettings>,
    setTheme: (req: SetThemeRequest) =>
      ipcRenderer.invoke(IpcChannels.APP_SETTINGS_SET_THEME, req) as Promise<AppSettings>,
    setOnboardingStep: (req: SetOnboardingStepRequest) =>
      ipcRenderer.invoke(
        IpcChannels.APP_SETTINGS_SET_ONBOARDING_STEP,
        req,
      ) as Promise<AppSettings>,
    completeOnboarding: () =>
      ipcRenderer.invoke(IpcChannels.APP_SETTINGS_COMPLETE_ONBOARDING) as Promise<AppSettings>,
    setTelemetryConsent: (req: SetTelemetryConsentRequest) =>
      ipcRenderer.invoke(
        IpcChannels.APP_SETTINGS_SET_TELEMETRY_CONSENT,
        req,
      ) as Promise<AppSettings>,
    setCrashReporting: (req: SetCrashReportingRequest) =>
      ipcRenderer.invoke(
        IpcChannels.APP_SETTINGS_SET_CRASH_REPORTING,
        req,
      ) as Promise<AppSettings>,
    setAutoUpdate: (req: SetAutoUpdateRequest) =>
      ipcRenderer.invoke(IpcChannels.APP_SETTINGS_SET_AUTO_UPDATE, req) as Promise<AppSettings>,
    resetAnonymousId: () =>
      ipcRenderer.invoke(IpcChannels.APP_SETTINGS_RESET_ANONYMOUS_ID) as Promise<void>,
  },
  telemetry: {
    capture: (req: TelemetryCaptureRequest) =>
      ipcRenderer.invoke(IpcChannels.TELEMETRY_CAPTURE, req) as Promise<void>,
  },
  updater: {
    check: () => ipcRenderer.invoke(IpcChannels.UPDATER_CHECK) as Promise<UpdaterStatus>,
    download: () => ipcRenderer.invoke(IpcChannels.UPDATER_DOWNLOAD) as Promise<UpdaterStatus>,
    quitAndInstall: () =>
      ipcRenderer.invoke(IpcChannels.UPDATER_QUIT_AND_INSTALL) as Promise<void>,
    onStatusChanged: (handler) =>
      subscribe<UpdaterStatus>(IpcChannels.UPDATER_STATUS_CHANGED, handler),
  },
  buildotoAuth: {
    start: () =>
      ipcRenderer.invoke(IpcChannels.BUILDOTO_AUTH_START) as Promise<BuildotoAuthState>,
    cancel: () => ipcRenderer.invoke(IpcChannels.BUILDOTO_AUTH_CANCEL) as Promise<void>,
    signOut: () =>
      ipcRenderer.invoke(IpcChannels.BUILDOTO_AUTH_SIGN_OUT) as Promise<void>,
    getStatus: () =>
      ipcRenderer.invoke(IpcChannels.BUILDOTO_AUTH_GET_STATUS) as Promise<BuildotoAuthState>,
    onStatusChanged: (handler) =>
      subscribe<BuildotoAuthState>(IpcChannels.BUILDOTO_AUTH_STATUS_CHANGED, handler),
  },
  buildotoUsage: {
    get: () =>
      ipcRenderer.invoke(IpcChannels.BUILDOTO_USAGE_GET) as Promise<BuildotoUsageSnapshot>,
    onUpdated: (handler) =>
      subscribe<BuildotoUsageSnapshot>(IpcChannels.BUILDOTO_USAGE_UPDATED, handler),
  },
}

contextBridge.exposeInMainWorld('buildoto', api)
