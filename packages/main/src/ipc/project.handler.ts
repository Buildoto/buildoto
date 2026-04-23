import { ipcMain, dialog, type BrowserWindow } from 'electron'
import {
  IpcChannels,
  type Project,
  type ProjectCloneRequest,
  type ProjectCreateRequest,
  type ProjectOpenRequest,
  type ProjectReadFileRequest,
  type ProjectReadFileResult,
  type ProjectTreeDelta,
  type ProjectTreeEntry,
  type ProjectWriteFileRequest,
  type RecentProject,
  type SessionActiveChanged,
  type SessionFile,
  type SessionLoadRequest,
  type SessionNewResult,
  type SessionSetActiveRequest,
  type SessionSummary,
} from '@buildoto/shared'
import {
  cloneProject,
  createProject,
  listTree,
  openProject,
  readProjectFile,
  writeProjectFile,
} from '../project/project'
import { listRecentProjects } from '../project/recent'
import { projectRegistry } from '../project/registry'
import { listSessions } from '../project/sessions'

export function registerProjectHandlers(window: BrowserWindow) {
  projectRegistry.on('active-changed', (project: Project | null) => {
    if (!window.isDestroyed()) window.webContents.send(IpcChannels.PROJECT_ACTIVE_CHANGED, project)
  })
  projectRegistry.on('tree-changed', (delta: ProjectTreeDelta) => {
    if (!window.isDestroyed()) window.webContents.send(IpcChannels.PROJECT_TREE_CHANGED, delta)
  })
  projectRegistry.on('session-active-changed', (payload: SessionActiveChanged) => {
    if (!window.isDestroyed()) window.webContents.send(IpcChannels.SESSION_ACTIVE_CHANGED, payload)
  })

  ipcMain.handle(
    IpcChannels.PROJECT_CREATE,
    async (_e, req: ProjectCreateRequest): Promise<Project> => {
      const project = await createProject({ name: req.name, parentPath: req.parentPath })
      return projectRegistry.activate(project)
    },
  )

  ipcMain.handle(IpcChannels.PROJECT_OPEN, async (_e, req: ProjectOpenRequest): Promise<Project> => {
    const project = await openProject(req.path)
    return projectRegistry.activate(project)
  })

  ipcMain.handle(
    IpcChannels.PROJECT_PICK_DIRECTORY,
    async (_e, opts?: { title?: string }): Promise<string | null> => {
      const result = await dialog.showOpenDialog(window, {
        title: opts?.title ?? 'Choisir un dossier',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0] ?? null
    },
  )

  ipcMain.handle(
    IpcChannels.PROJECT_CLONE,
    async (_e, req: ProjectCloneRequest): Promise<Project> => {
      const project = await cloneProject({ url: req.url, destPath: req.destPath })
      return projectRegistry.activate(project)
    },
  )

  ipcMain.handle(IpcChannels.PROJECT_CLOSE, async (): Promise<void> => {
    await projectRegistry.close()
  })

  ipcMain.handle(IpcChannels.PROJECT_GET_ACTIVE, (): Project | null => projectRegistry.get())

  ipcMain.handle(IpcChannels.PROJECT_LIST_RECENT, (): RecentProject[] => listRecentProjects())

  ipcMain.handle(IpcChannels.PROJECT_LIST_TREE, async (): Promise<ProjectTreeEntry[]> => {
    const project = projectRegistry.get()
    if (!project) return []
    return listTree(project.path)
  })

  ipcMain.handle(
    IpcChannels.PROJECT_READ_FILE,
    async (_e, req: ProjectReadFileRequest): Promise<ProjectReadFileResult> => {
      const project = projectRegistry.get()
      if (!project) throw new Error('No active project')
      return readProjectFile(project.path, req.relativePath)
    },
  )

  ipcMain.handle(
    IpcChannels.PROJECT_WRITE_FILE,
    async (_e, req: ProjectWriteFileRequest): Promise<void> => {
      const project = projectRegistry.get()
      if (!project) throw new Error('No active project')
      const abs = await pathForWrite(project.path, req.relativePath)
      projectRegistry.markSelfWrite(abs)
      await writeProjectFile(project.path, req.relativePath, req.content, req.encoding ?? 'utf-8')
    },
  )

  // Sessions
  ipcMain.handle(IpcChannels.SESSION_LIST, async (): Promise<SessionSummary[]> => {
    const project = projectRegistry.get()
    if (!project) return []
    return listSessions(project.path)
  })

  ipcMain.handle(
    IpcChannels.SESSION_LOAD,
    async (_e, req: SessionLoadRequest): Promise<SessionFile> => {
      const project = projectRegistry.get()
      if (!project) throw new Error('No active project')
      const { loadSession } = await import('../project/sessions')
      return loadSession(project.path, req.sessionId)
    },
  )

  ipcMain.handle(IpcChannels.SESSION_NEW, async (): Promise<SessionNewResult> => {
    const session = await projectRegistry.newSession()
    // Wipe the FreeCAD document so the new chat starts from a blank model.
    // If the sidecar is down the reset is best-effort — the new session must
    // still be created.
    try {
      const { resetDocument } = await import('../freecad/client')
      await resetDocument()
    } catch (err) {
      console.warn('[session:new] reset_document failed:', err)
    }
    return { sessionId: session.sessionId }
  })

  ipcMain.handle(
    IpcChannels.SESSION_SET_ACTIVE,
    async (_e, req: SessionSetActiveRequest): Promise<void> => {
      await projectRegistry.setActiveSession(req.sessionId)
    },
  )
}

async function pathForWrite(projectPath: string, relativePath: string): Promise<string> {
  const { resolveWithin } = await import('../project/project')
  return resolveWithin(projectPath, relativePath)
}
