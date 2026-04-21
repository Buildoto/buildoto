import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels, type UpdaterStatus } from '@buildoto/shared'
import { checkForUpdates, downloadUpdate, initUpdater, quitAndInstall } from '../updater/updater'

export function registerUpdaterHandlers(window: BrowserWindow) {
  initUpdater((status: UpdaterStatus) => {
    if (window.isDestroyed()) return
    window.webContents.send(IpcChannels.UPDATER_STATUS_CHANGED, status)
  })

  ipcMain.handle(IpcChannels.UPDATER_CHECK, () => checkForUpdates())
  ipcMain.handle(IpcChannels.UPDATER_DOWNLOAD, () => downloadUpdate())
  ipcMain.handle(IpcChannels.UPDATER_QUIT_AND_INSTALL, () => quitAndInstall())
}
