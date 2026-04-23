import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels } from '@buildoto/shared'
import { freecadSidecar } from '../freecad/sidecar'

export function registerFreecadHandlers(window: BrowserWindow) {
  ipcMain.handle(IpcChannels.FREECAD_GET_STATUS, () => freecadSidecar.getStatus())
  // `restart` is the UI escape hatch when the sidecar is wedged in `error`.
  // We swallow the throw here so the handler always resolves with the latest
  // status — the renderer reads the state directly off the returned payload
  // and shows the error message from the status pill rather than a toast.
  ipcMain.handle(IpcChannels.FREECAD_RESTART, async () => {
    try {
      return await freecadSidecar.restart()
    } catch {
      return freecadSidecar.getStatus()
    }
  })

  freecadSidecar.on('status', (status) => {
    if (!window.isDestroyed()) window.webContents.send(IpcChannels.FREECAD_STATUS_CHANGE, status)
  })
}
