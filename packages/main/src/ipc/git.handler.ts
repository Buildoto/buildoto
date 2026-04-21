import { ipcMain, type BrowserWindow } from 'electron'
import {
  IpcChannels,
  type GitCheckoutRequest,
  type GitCommit,
  type GitCommitRequest,
  type GitCommitResult,
  type GitCreateBranchRequest,
  type GitDiffRequest,
  type GitLogRequest,
  type GitPullResult,
  type GitPushResult,
  type GitStatus,
  type Project,
} from '@buildoto/shared'
import { GIT_STATUS_DEBOUNCE_MS } from '../lib/constants'
import { GitRepo } from '../git/repo'
import { projectRegistry } from '../project/registry'

// One GitRepo instance per active project. Rebuilt when the active project changes.
let currentRepo: GitRepo | null = null
let statusTimer: NodeJS.Timeout | null = null

function withRepo(): GitRepo {
  const project = projectRegistry.get()
  if (!project) throw new Error('No active project')
  if (!currentRepo || currentRepo.path !== project.path) {
    currentRepo = new GitRepo(project.path)
  }
  return currentRepo
}

export function registerGitHandlers(window: BrowserWindow) {
  projectRegistry.on('active-changed', (project: Project | null) => {
    currentRepo = project ? new GitRepo(project.path) : null
    if (project) void broadcastStatus(window)
  })

  projectRegistry.on('tree-changed', () => {
    if (statusTimer) return
    statusTimer = setTimeout(() => {
      statusTimer = null
      void broadcastStatus(window)
    }, GIT_STATUS_DEBOUNCE_MS)
  })

  ipcMain.handle(IpcChannels.GIT_STATUS, (): Promise<GitStatus> => withRepo().status())
  ipcMain.handle(IpcChannels.GIT_LOG, (_e, req?: GitLogRequest): Promise<GitCommit[]> =>
    withRepo().log(req?.limit),
  )
  ipcMain.handle(
    IpcChannels.GIT_COMMIT,
    async (_e, req: GitCommitRequest): Promise<GitCommitResult> => {
      const result = await withRepo().commit(req.message, req.files)
      void broadcastStatus(window)
      return result
    },
  )
  ipcMain.handle(IpcChannels.GIT_PUSH, async (): Promise<GitPushResult> => {
    const result = await withRepo().push()
    void broadcastStatus(window)
    return result
  })
  ipcMain.handle(IpcChannels.GIT_PULL, async (): Promise<GitPullResult> => {
    const result = await withRepo().pull()
    void broadcastStatus(window)
    return result
  })
  ipcMain.handle(IpcChannels.GIT_CHECKOUT, async (_e, req: GitCheckoutRequest): Promise<void> => {
    await withRepo().checkout(req.branch, req.create ?? false)
    void broadcastStatus(window)
  })
  ipcMain.handle(
    IpcChannels.GIT_CREATE_BRANCH,
    async (_e, req: GitCreateBranchRequest): Promise<void> => {
      await withRepo().createBranch(req.name, req.checkout ?? true)
      void broadcastStatus(window)
    },
  )
  ipcMain.handle(IpcChannels.GIT_LIST_BRANCHES, (): Promise<string[]> =>
    withRepo().listBranches(),
  )
  ipcMain.handle(IpcChannels.GIT_DIFF, (_e, req?: GitDiffRequest): Promise<string> =>
    withRepo().diff(req?.path),
  )
}

async function broadcastStatus(window: BrowserWindow) {
  const repo = currentRepo
  if (!repo) return
  try {
    repo.invalidateStatus()
    const status = await repo.status()
    if (!window.isDestroyed()) window.webContents.send(IpcChannels.GIT_STATUS_CHANGED, status)
  } catch (err) {
    console.warn('[git] status broadcast failed:', err)
  }
}
