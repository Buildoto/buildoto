import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { BrowserWindow, Menu, app, ipcMain, shell } from 'electron'

import { IpcChannels, type MenuAction } from '@buildoto/shared'
import { buildotoAuth } from './auth/buildoto'
import { registerAgentHandlers } from './ipc/agent.handler'
import { registerAppSettingsHandlers } from './ipc/app-settings.handler'
import { registerBuildotoAuthHandlers } from './ipc/buildoto-auth.handler'
import { registerBuildotoUsageHandlers } from './ipc/usage.handler'
import { registerFreecadHandlers } from './ipc/freecad.handler'
import { registerGitHandlers } from './ipc/git.handler'
import { registerGithubHandlers } from './ipc/github.handler'
import { registerMcpHandlers } from './ipc/mcp.handler'
import { registerProjectHandlers } from './ipc/project.handler'
import { registerSettingsHandlers } from './ipc/settings.handler'
import { registerTelemetryHandlers } from './ipc/telemetry.handler'
import { registerUpdaterHandlers } from './ipc/updater.handler'
import {
  BUILDOTO_DEEP_LINK_SCHEME,
  BUILDOTO_GITHUB_URL,
  DEFAULT_WINDOW_WIDTH,
  DEFAULT_WINDOW_HEIGHT,
  DEV_RENDERER_URL,
  MIN_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
} from './lib/constants'
import { freecadSidecar } from './freecad/sidecar'
import { mcpManager } from './mcp/manager'
import { listRecentProjects } from './project/recent'
import { projectRegistry } from './project/registry'
import { store } from './store/settings'
import { initSentry } from './telemetry/sentry'
import { shutdownTelemetry } from './telemetry/posthog'

// Make ipcMain.handle idempotent so register*Handlers() can be called multiple
// times without crashing (macOS activate event re-creates the window).
const _origHandle = ipcMain.handle.bind(ipcMain)
ipcMain.handle = ((channel: string, handler: (...args: unknown[]) => unknown) => {
  try { _origHandle(channel, handler) } catch { /* already registered — safe */ }
  return ipcMain
}) as typeof ipcMain.handle

const __dirname = dirname(fileURLToPath(import.meta.url))
const IS_DEV = !app.isPackaged
const DEV_URL = process.env['ELECTRON_RENDERER_URL'] ?? DEV_RENDERER_URL

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const bounds = store.get('windowBounds')
  const window = new BrowserWindow({
    width: bounds?.width ?? DEFAULT_WINDOW_WIDTH,
    height: bounds?.height ?? DEFAULT_WINDOW_HEIGHT,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    title: 'Buildoto',
    show: false,
    backgroundColor: '#0b0c0f',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  window.on('ready-to-show', () => window.show())

  window.on('close', () => {
    if (!window.isDestroyed()) {
      const b = window.getBounds()
      store.set('windowBounds', { x: b.x, y: b.y, width: b.width, height: b.height })
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (IS_DEV) {
    void window.loadURL(DEV_URL)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

function emitMenuAction(action: MenuAction) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(IpcChannels.MENU_ACTION, action)
}

function buildRecentSubmenu(): Electron.MenuItemConstructorOptions[] {
  const items = listRecentProjects().slice(0, 10)
  if (items.length === 0) {
    return [{ label: 'Aucun projet récent', enabled: false }]
  }
  return items.map((r) => ({
    label: `${r.name}  —  ${r.path}`,
    click: () => emitMenuAction({ kind: 'open-recent', path: r.path }),
  }))
}

function buildAppMenu(): Electron.MenuItemConstructorOptions[] {
  return [
    { role: 'about' as const },
    { type: 'separator' as const },
    {
      label: 'Préférences…',
      accelerator: 'CmdOrCtrl+,',
      click: () => emitMenuAction({ kind: 'open-settings' }),
    },
    { type: 'separator' as const },
    { role: 'services' as const },
    { type: 'separator' as const },
    { role: 'hide' as const },
    { role: 'hideOthers' as const },
    { role: 'unhide' as const },
    { type: 'separator' as const },
    { role: 'quit' as const },
  ]
}

function buildFileMenu(): Electron.MenuItemConstructorOptions {
  const isMac = process.platform === 'darwin'
  return {
    label: 'File',
    submenu: [
      {
        label: 'Nouveau projet…',
        accelerator: 'CmdOrCtrl+N',
        click: () => emitMenuAction({ kind: 'new-project' }),
      },
      {
        label: 'Ouvrir un projet…',
        accelerator: 'CmdOrCtrl+O',
        click: () => emitMenuAction({ kind: 'open-project' }),
      },
      {
        label: 'Ouvrir un projet récent',
        submenu: buildRecentSubmenu(),
      },
      { type: 'separator' as const },
      {
        label: 'Fermer le projet',
        accelerator: 'CmdOrCtrl+Shift+W',
        click: () => {
          void projectRegistry.close()
          emitMenuAction({ kind: 'close-project' })
        },
      },
      { type: 'separator' as const },
      isMac ? { role: 'close' as const } : { role: 'quit' as const },
    ],
  }
}

function buildEditMenu(): Electron.MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      { role: 'undo' as const },
      { role: 'redo' as const },
      { type: 'separator' as const },
      { role: 'cut' as const },
      { role: 'copy' as const },
      { role: 'paste' as const },
      { role: 'selectAll' as const },
    ],
  }
}

function buildViewMenu(): Electron.MenuItemConstructorOptions {
  return {
    label: 'View',
    submenu: [
      { role: 'reload' as const },
      { role: 'forceReload' as const },
      { role: 'toggleDevTools' as const },
      { type: 'separator' as const },
      { role: 'resetZoom' as const },
      { role: 'zoomIn' as const },
      { role: 'zoomOut' as const },
      { type: 'separator' as const },
      { role: 'togglefullscreen' as const },
    ],
  }
}

function buildHelpMenu(): Electron.MenuItemConstructorOptions {
  return {
    label: 'Help',
    submenu: [
      {
        label: 'Buildoto on GitHub',
        click: () => void shell.openExternal(BUILDOTO_GITHUB_URL),
      },
    ],
  }
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ label: app.name, submenu: buildAppMenu() }] : []),
    buildFileMenu(),
    buildEditMenu(),
    buildViewMenu(),
    buildHelpMenu(),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function bootstrap() {
  await initSentry()
  buildMenu()
  mainWindow = createWindow()
  registerAgentHandlers(mainWindow)
  registerFreecadHandlers(mainWindow)
  registerSettingsHandlers()
  registerAppSettingsHandlers()
  registerProjectHandlers(mainWindow)
  registerGitHandlers(mainWindow)
  registerGithubHandlers()
  registerMcpHandlers(mainWindow)
  registerTelemetryHandlers()
  registerUpdaterHandlers(mainWindow)
  registerBuildotoAuthHandlers(mainWindow)
  registerBuildotoUsageHandlers(mainWindow)

  // Rebuild the recent-projects submenu whenever the active project changes.
  projectRegistry.on('active-changed', () => buildMenu())

  freecadSidecar.start().catch((err: Error) => {
    console.error('[main] freecad sidecar failed to start:', err.message)
  })

  mcpManager.startEnabled().catch((err: Error) => {
    console.error('[main] MCP startup failed:', err.message)
  })

  // Warm the Buildoto AI auth state: reads the refresh token and, if present,
  // refreshes a short JWT so the status bar + Compte tab render "signed in"
  // immediately instead of flashing "signed out".
  buildotoAuth.initialStatus().catch((err: Error) => {
    console.error('[main] buildoto auth init failed:', err.message)
  })
}

// Ensure a single instance so deep links and dock clicks are funneled into the
// already-running window instead of spawning a second app.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

// Register the custom URL scheme. In dev, `process.argv[1]` points to the
// renderer entry and must be forwarded so Electron can relaunch us when the OS
// invokes `buildoto://…` on Windows/Linux.
if (process.defaultApp) {
  const rendererEntry = process.argv[1]
  if (rendererEntry) {
    app.setAsDefaultProtocolClient(BUILDOTO_DEEP_LINK_SCHEME, process.execPath, [
      rendererEntry,
    ])
  }
} else {
  app.setAsDefaultProtocolClient(BUILDOTO_DEEP_LINK_SCHEME)
}

// macOS delivers deep links via `open-url`.
app.on('open-url', (event, url) => {
  event.preventDefault()
  void buildotoAuth.handleDeepLink(url)
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Windows/Linux deliver deep links as a command-line arg to a new instance.
// The single-instance lock re-routes them here.
app.on('second-instance', (_event, argv) => {
  const deepLink = argv.find((arg) =>
    arg.startsWith(`${BUILDOTO_DEEP_LINK_SCHEME}://`),
  )
  if (deepLink) void buildotoAuth.handleDeepLink(deepLink)
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow()
    registerAgentHandlers(mainWindow)
    registerFreecadHandlers(mainWindow)
    registerProjectHandlers(mainWindow)
    registerGitHandlers(mainWindow)
    registerMcpHandlers(mainWindow)
    registerUpdaterHandlers(mainWindow)
    registerBuildotoAuthHandlers(mainWindow)
    registerBuildotoUsageHandlers(mainWindow)
  }
})

app.on('before-quit', async (event) => {
  if (freecadSidecar.getStatus().state !== 'stopped') {
    event.preventDefault()
    await Promise.allSettled([
      freecadSidecar.stop(),
      mcpManager.stopAll(),
      shutdownTelemetry(),
    ])
    app.quit()
  } else {
    await Promise.allSettled([mcpManager.stopAll(), shutdownTelemetry()])
  }
})
