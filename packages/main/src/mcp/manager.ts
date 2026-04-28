import { shell } from 'electron'
import type { McpServerConfig, McpServerStatus } from '@buildoto/shared'
import {
  createMcpClientManager,
  type McpClientManager,
  type McpServerStartSpec,
} from '@buildoto/opencode-core/mcp'
import type { ToolDefinition } from '@buildoto/opencode-core/tool'
import { listMcpServers, upsertMcpServer, deleteMcpServer } from '../store/settings'

function configToSpec(config: McpServerConfig): McpServerStartSpec {
  return {
    name: config.name,
    transport: config.transport,
    command: config.command,
    args: config.args,
    env: config.env,
    url: config.url,
  }
}

class McpManager {
  private inner: McpClientManager | null = null
  private listeners = new Set<(status: McpServerStatus) => void>()

  private ensure(): McpClientManager {
    if (!this.inner) {
      this.inner = createMcpClientManager({
        openExternal: (url) => shell.openExternal(url),
      })
    }
    return this.inner
  }

  async startEnabled(): Promise<McpServerStatus[]> {
    const enabled = listMcpServers().filter((s) => s.enabled)
    if (enabled.length === 0) return []
    const statuses = await this.ensure().startServers(enabled.map(configToSpec))
    for (const s of statuses) this.emit(s)
    return statuses
  }

  async upsert(config: McpServerConfig): Promise<McpServerStatus> {
    upsertMcpServer(config)
    const inner = this.ensure()
    await inner.stopServer(config.name).catch(() => undefined)
    if (!config.enabled) {
      const status: McpServerStatus = {
        name: config.name,
        state: 'stopped',
        toolCount: 0,
      }
      this.emit(status)
      return status
    }
    const status = await inner.startServer(configToSpec(config))
    this.emit(status)
    return status
  }

  async delete(name: string): Promise<void> {
    deleteMcpServer(name)
    await this.inner?.stopServer(name).catch(() => undefined)
    this.emit({ name, state: 'stopped', toolCount: 0 })
  }

  async restart(name: string): Promise<McpServerStatus> {
    const config = listMcpServers().find((s) => s.name === name)
    if (!config)       throw new Error(`Serveur MCP inconnu : ${name}`)
    return this.upsert(config)
  }

  list(): { configs: McpServerConfig[]; statuses: McpServerStatus[] } {
    const configs = listMcpServers()
    const statuses = this.inner ? [...this.inner.statuses()] : []
    return { configs, statuses }
  }

  toToolDefinitions(): ToolDefinition[] {
    return this.inner?.toToolDefinitions() ?? []
  }

  async stopAll(): Promise<void> {
    await this.inner?.stopAll()
  }

  onStatusChange(handler: (status: McpServerStatus) => void): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }

  private emit(status: McpServerStatus) {
    for (const h of this.listeners) {
      try {
        h(status)
      } catch (err) {
        console.warn('[mcp] status listener failed:', err)
      }
    }
  }
}

export const mcpManager = new McpManager()
