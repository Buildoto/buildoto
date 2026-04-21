// MCP client — port of packages/opencode/src/mcp/index.ts @ v1.14.19.
// Manages a pool of Model Context Protocol clients (stdio + SSE transports),
// enumerates their tools on startup, and exposes a `ToolDefinition`-shaped
// façade so MCP tools register into the same registry as our built-ins.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { z } from 'zod'
import {
  defineTool,
  type ToolDefinition,
  type ToolHandlerOptions,
} from '../tool/registry'

export type McpTransport = 'stdio' | 'sse'

export interface McpServerStartSpec {
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export interface McpServerStatus {
  name: string
  state: 'stopped' | 'starting' | 'ready' | 'error'
  toolCount: number
  error?: string
}

export type OpenExternalFn = (url: string) => Promise<void> | void

export interface McpClientManagerOptions {
  openExternal?: OpenExternalFn
  clientName?: string
  clientVersion?: string
}

interface ClientHandle {
  spec: McpServerStartSpec
  client: Client
  status: McpServerStatus
  tools: Array<{ name: string; description: string }>
}

export interface McpClientManager {
  startServer(spec: McpServerStartSpec): Promise<McpServerStatus>
  startServers(
    specs: readonly McpServerStartSpec[],
  ): Promise<McpServerStatus[]>
  stopServer(name: string): Promise<void>
  stopAll(): Promise<void>
  statuses(): readonly McpServerStatus[]
  /**
   * Wrap every live server's tool list into `ToolDefinition` handles that can
   * be registered on the main tool registry. Tool ids are prefixed with the
   * server name to avoid collisions (`{server}__{tool}`).
   */
  toToolDefinitions(): ToolDefinition[]
}

export function createMcpClientManager(
  options: McpClientManagerOptions = {},
): McpClientManager {
  const clientName = options.clientName ?? 'buildoto'
  const clientVersion = options.clientVersion ?? '0.1.0'
  const handles = new Map<string, ClientHandle>()

  async function startOne(spec: McpServerStartSpec): Promise<ClientHandle> {
    const status: McpServerStatus = {
      name: spec.name,
      state: 'starting',
      toolCount: 0,
    }
    const client = new Client(
      { name: clientName, version: clientVersion },
      { capabilities: {} },
    )
    try {
      if (spec.transport === 'stdio') {
        if (!spec.command) {
          throw new Error(`stdio MCP server '${spec.name}' missing 'command'`)
        }
        const transport = new StdioClientTransport({
          command: spec.command,
          args: spec.args ?? [],
          env: spec.env,
        })
        await client.connect(transport)
      } else {
        if (!spec.url) {
          throw new Error(`sse MCP server '${spec.name}' missing 'url'`)
        }
        const transport = new SSEClientTransport(new URL(spec.url))
        await client.connect(transport)
      }

      const list = await client.listTools()
      const tools = list.tools.map((t) => ({
        name: t.name,
        description: t.description ?? '',
      }))
      status.state = 'ready'
      status.toolCount = tools.length
      const handle: ClientHandle = { spec, client, status, tools }
      handles.set(spec.name, handle)
      return handle
    } catch (err) {
      status.state = 'error'
      status.error = err instanceof Error ? err.message : String(err)
      const handle: ClientHandle = { spec, client, status, tools: [] }
      handles.set(spec.name, handle)
      throw err
    }
  }

  return {
    async startServer(spec) {
      try {
        const handle = await startOne(spec)
        return handle.status
      } catch {
        return handles.get(spec.name)?.status ?? {
          name: spec.name,
          state: 'error',
          toolCount: 0,
        }
      }
    },
    async startServers(specs) {
      const results = await Promise.allSettled(specs.map((s) => startOne(s)))
      return results.map((r, i) =>
        r.status === 'fulfilled' ? r.value.status : handles.get(specs[i]!.name)?.status ?? {
          name: specs[i]!.name,
          state: 'error' as const,
          toolCount: 0,
        },
      )
    },
    async stopServer(name) {
      const h = handles.get(name)
      if (!h) return
      try {
        await h.client.close()
      } finally {
        handles.delete(name)
      }
    },
    async stopAll() {
      const names = Array.from(handles.keys())
      await Promise.all(names.map((n) => this.stopServer(n)))
    },
    statuses() {
      return Array.from(handles.values()).map((h) => h.status)
    },
    toToolDefinitions() {
      const defs: ToolDefinition[] = []
      for (const h of handles.values()) {
        if (h.status.state !== 'ready') continue
        for (const t of h.tools) {
          const toolId = `${h.spec.name}__${t.name}`
          const def = defineTool({
            id: toolId,
            description: t.description,
            provenance: 'mcp',
            // MCP tools declare their own JSON schema server-side; we let
            // the model pass anything through and the server validates.
            inputSchema: z.record(z.unknown()),
            handler: async (
              input: Record<string, unknown>,
              _opts: ToolHandlerOptions,
            ): Promise<unknown> => {
              const res = await h.client.callTool({
                name: t.name,
                arguments: input,
              })
              return res
            },
          })
          defs.push(def as unknown as ToolDefinition)
        }
      }
      return defs
    },
  }
}
