import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannels, type BuildotoAuthState } from '@buildoto/shared'

import { buildotoAuth } from '../auth/buildoto'

export function registerBuildotoAuthHandlers(window: BrowserWindow) {
  // Push every status transition to the renderer so the status bar + Compte
  // tab stay in lockstep without the renderer having to poll.
  const unsubscribe = buildotoAuth.onStateChanged((state) => {
    if (window.isDestroyed()) return
    window.webContents.send(IpcChannels.BUILDOTO_AUTH_STATUS_CHANGED, state)
  })
  window.on('closed', unsubscribe)

  ipcMain.handle(
    IpcChannels.BUILDOTO_AUTH_START,
    async (): Promise<BuildotoAuthState> => {
      try {
        return await buildotoAuth.startAuth()
      } catch (e) {
        return {
          kind: 'error',
          message: e instanceof Error ? e.message : String(e),
        }
      }
    },
  )

  ipcMain.handle(IpcChannels.BUILDOTO_AUTH_CANCEL, (): void => {
    buildotoAuth.cancel()
  })

  ipcMain.handle(IpcChannels.BUILDOTO_AUTH_SIGN_OUT, async (): Promise<void> => {
    await buildotoAuth.signOut()
  })

  ipcMain.handle(
    IpcChannels.BUILDOTO_AUTH_GET_STATUS,
    (): BuildotoAuthState => buildotoAuth.getStatus(),
  )
}
