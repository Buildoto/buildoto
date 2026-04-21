import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels, type BuildotoUsageSnapshot } from '@buildoto/shared'

import { buildotoUsage } from '../auth/usage'

export function registerBuildotoUsageHandlers(window: BrowserWindow) {
  const unsubscribe = buildotoUsage.onUpdated((snapshot) => {
    if (window.isDestroyed()) return
    window.webContents.send(IpcChannels.BUILDOTO_USAGE_UPDATED, snapshot)
  })
  window.on('closed', unsubscribe)

  ipcMain.handle(
    IpcChannels.BUILDOTO_USAGE_GET,
    (): BuildotoUsageSnapshot => buildotoUsage.get(),
  )

  buildotoUsage.start()
}
