import { app } from 'electron'
import type { UpdaterStatus } from '@buildoto/shared'
import { safeErrorMessage } from '../lib/safe-error'
import { getAppSettings } from '../store/settings'

// electron-updater is loaded lazily so type-check passes when the dep is
// absent during an alpha scaffold, and so the module is skipped entirely in
// dev mode (`app.isPackaged === false`) where it would error anyway.

type StatusHandler = (status: UpdaterStatus) => void

let currentStatus: UpdaterStatus = { kind: 'idle' }
let notify: StatusHandler | null = null
let autoUpdaterModule: unknown = null

async function loadAutoUpdater(): Promise<
  | {
      autoUpdater: {
        autoDownload: boolean
        autoInstallOnAppQuit: boolean
        channel: string
        allowDowngrade: boolean
        logger: unknown
        checkForUpdates: () => Promise<unknown>
        downloadUpdate: () => Promise<unknown>
        quitAndInstall: () => void
        on: (event: string, cb: (...args: unknown[]) => void) => void
      }
    }
  | null
> {
  if (autoUpdaterModule) return autoUpdaterModule as never
  try {
    autoUpdaterModule = await import('electron-updater')
    return autoUpdaterModule as never
  } catch (err) {
    console.warn(
      '[updater] electron-updater not available:',
      safeErrorMessage(err),
    )
    return null
  }
}

function setStatus(status: UpdaterStatus) {
  currentStatus = status
  notify?.(status)
}

export async function initUpdater(handler: StatusHandler): Promise<void> {
  notify = handler
  if (!app.isPackaged) {
    setStatus({ kind: 'disabled', reason: 'dev build' })
    return
  }
  const settings = getAppSettings()
  if (!settings.autoUpdateEnabled) {
    setStatus({ kind: 'disabled', reason: 'user opt-out' })
    return
  }
  const mod = await loadAutoUpdater()
  if (!mod) {
    setStatus({ kind: 'disabled', reason: 'electron-updater missing' })
    return
  }
  const { autoUpdater } = mod
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  // Force the stable channel at runtime so existing alpha installs (Sprint 4
  // shipped with channel=alpha) migrate to v1.0 without the user reinstalling.
  autoUpdater.channel = 'stable'
  autoUpdater.allowDowngrade = false

  autoUpdater.on('checking-for-update', () => setStatus({ kind: 'checking' }))
  autoUpdater.on('update-available', (info: unknown) => {
    const version = (info as { version?: string } | undefined)?.version ?? ''
    setStatus({ kind: 'available', version })
  })
  autoUpdater.on('update-not-available', () => setStatus({ kind: 'not-available' }))
  autoUpdater.on('download-progress', (progress: unknown) => {
    const p = progress as { percent?: number; bytesPerSecond?: number } | undefined
    setStatus({
      kind: 'downloading',
      percent: p?.percent ?? 0,
      bytesPerSecond: p?.bytesPerSecond ?? 0,
    })
  })
  autoUpdater.on('update-downloaded', (info: unknown) => {
    const version = (info as { version?: string } | undefined)?.version ?? ''
    setStatus({ kind: 'downloaded', version })
  })
  autoUpdater.on('error', (err: unknown) => {
    setStatus({ kind: 'error', message: safeErrorMessage(err) })
  })

  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    setStatus({
      kind: 'error',
      message: safeErrorMessage(err, 'check failed'),
    })
  }
}

export async function checkForUpdates(): Promise<UpdaterStatus> {
  const mod = await loadAutoUpdater()
  if (!mod || !app.isPackaged) {
    return currentStatus
  }
  try {
    await mod.autoUpdater.checkForUpdates()
  } catch (err) {
    setStatus({
      kind: 'error',
      message: safeErrorMessage(err, 'check failed'),
    })
  }
  return currentStatus
}

export async function downloadUpdate(): Promise<UpdaterStatus> {
  const mod = await loadAutoUpdater()
  if (!mod || !app.isPackaged) return currentStatus
  try {
    await mod.autoUpdater.downloadUpdate()
  } catch (err) {
    setStatus({
      kind: 'error',
      message: safeErrorMessage(err, 'download failed'),
    })
  }
  return currentStatus
}

export async function quitAndInstall(): Promise<void> {
  const mod = await loadAutoUpdater()
  if (!mod || !app.isPackaged) return
  mod.autoUpdater.quitAndInstall()
}
