import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels } from '@buildoto/shared'
import { freecadSidecar } from '../freecad/sidecar'

export function registerFreecadHandlers(window: BrowserWindow) {
  ipcMain.handle(IpcChannels.FREECAD_GET_STATUS, () => freecadSidecar.getStatus())

  freecadSidecar.on('status', (status) => {
    if (!window.isDestroyed()) window.webContents.send(IpcChannels.FREECAD_STATUS_CHANGE, status)
  })
}
