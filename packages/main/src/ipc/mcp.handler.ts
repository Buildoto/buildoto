import { ipcMain, type BrowserWindow } from 'electron'
import {
  IpcChannels,
  type McpDeleteServerRequest,
  type McpRestartServerRequest,
  type McpUpsertServerRequest,
} from '@buildoto/shared'
import { mcpManager } from '../mcp/manager'

export function registerMcpHandlers(window: BrowserWindow) {
  const unsubscribe = mcpManager.onStatusChange((status) => {
    if (!window.isDestroyed()) {
      window.webContents.send(IpcChannels.MCP_STATUS_CHANGED, status)
    }
  })

  ipcMain.handle(IpcChannels.MCP_LIST_SERVERS, () => mcpManager.list())

  ipcMain.handle(
    IpcChannels.MCP_UPSERT_SERVER,
    (_e, req: McpUpsertServerRequest) => mcpManager.upsert(req.config),
  )

  ipcMain.handle(
    IpcChannels.MCP_DELETE_SERVER,
    async (_e, req: McpDeleteServerRequest) => {
      await mcpManager.delete(req.name)
    },
  )

  ipcMain.handle(
    IpcChannels.MCP_RESTART_SERVER,
    (_e, req: McpRestartServerRequest) => mcpManager.restart(req.name),
  )

  window.on('closed', () => unsubscribe())
}
