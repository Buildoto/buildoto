// Tool registry — port of packages/opencode/src/tool/registry.ts
// @ v1.14.19 of sst/opencode. Provides a typed `defineTool({...})` façade
// around the AI SDK's `Tool` interface, a registry keyed by tool id, and a
// converter that produces the `Record<string, Tool>` shape expected by
// `streamText({ tools })`.

import type { Tool, ToolExecutionOptions } from 'ai'
import type { z } from 'zod'

export type ToolProvenance = 'builtin' | 'mcp' | 'freecad'

export interface ToolDefinition<
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TResult = unknown,
> {
  id: string
  description: string
  provenance: ToolProvenance
  inputSchema: TSchema
  handler: (
    input: z.infer<TSchema>,
    options: ToolHandlerOptions,
  ) => Promise<TResult>
}

export interface ToolHandlerOptions {
  toolCallId: string
  abortSignal?: AbortSignal
}

export function defineTool<TSchema extends z.ZodTypeAny, TResult>(
  def: ToolDefinition<TSchema, TResult>,
): ToolDefinition<TSchema, TResult> {
  return def
}

export interface ToolRegistry {
  register(tool: ToolDefinition): void
  registerMany(tools: readonly ToolDefinition[]): void
  get(id: string): ToolDefinition | undefined
  list(): readonly ToolDefinition[]
  listIds(): readonly string[]
  filter(allowedIds: readonly string[] | 'all'): readonly ToolDefinition[]
  toAiSdkTools(allowedIds?: readonly string[] | 'all'): Record<string, Tool>
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ToolDefinition>()

  function toAiSdkTool(def: ToolDefinition): Tool {
    return {
      description: def.description,
      parameters: def.inputSchema,
      execute: async (
        input: unknown,
        opts: ToolExecutionOptions,
      ): Promise<unknown> =>
        def.handler(input, {
          toolCallId: opts.toolCallId,
          abortSignal: opts.abortSignal,
        }),
    }
  }

  return {
    register(tool) {
      if (tools.has(tool.id)) {
        throw new Error(`Tool '${tool.id}' already registered`)
      }
      tools.set(tool.id, tool)
    },
    registerMany(defs) {
      for (const def of defs) this.register(def)
    },
    get(id) {
      return tools.get(id)
    },
    list() {
      return Array.from(tools.values())
    },
    listIds() {
      return Array.from(tools.keys())
    },
    filter(allowedIds) {
      if (allowedIds === 'all') return Array.from(tools.values())
      const allow = new Set(allowedIds)
      return Array.from(tools.values()).filter((t) => allow.has(t.id))
    },
    toAiSdkTools(allowedIds = 'all') {
      const defs = this.filter(allowedIds)
      const out: Record<string, Tool> = {}
      for (const def of defs) out[def.id] = toAiSdkTool(def)
      return out
    },
  }
}
