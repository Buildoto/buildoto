// Agent loop — port of packages/opencode/src/agent/agent.ts @ v1.14.19.
// Wraps `streamText` from the AI SDK with multi-step tool execution, build/
// plan presets, and a host-injected event sink. The host (Buildoto adapter)
// supplies the provider registry, tool registry, and persistence.

import { streamText, type CoreMessage } from 'ai'
import type { ProviderId, ProviderRegistry } from '../provider/provider'
import type { ToolProvenance, ToolRegistry } from '../tool/registry'

export type AgentPreset = 'build' | 'plan'

export interface AgentConfig {
  name: string
  preset: AgentPreset
  description: string
  systemPrompt: string
  /**
   * Either an explicit allowlist of tool ids or `'all'` to expose every
   * registered tool. Plan-mode presets typically narrow this to read-only
   * tools (e.g. `list_documents`, `get_objects`) so the model can reason
   * about state without mutating it.
   */
  allowedTools: readonly string[] | 'all'
}

export type AgentEvent =
  | { type: 'turn_start'; providerId: ProviderId; modelId: string }
  | { type: 'token_delta'; delta: string }
  | {
      type: 'tool_call'
      toolCallId: string
      toolName: string
      input: unknown
      provenance: ToolProvenance
    }
  | {
      type: 'tool_result'
      toolCallId: string
      output: unknown
      isError: boolean
    }
  | { type: 'turn_finish'; finishReason: string; usage?: unknown }
  | { type: 'error'; message: string }

export interface AgentRunOptions {
  agentConfig: AgentConfig
  providerId: ProviderId
  modelId: string
  providers: ProviderRegistry
  tools: ToolRegistry
  history: CoreMessage[]
  userMessage: string
  onEvent: (event: AgentEvent) => void
  abortSignal?: AbortSignal
  maxSteps?: number
}

export interface AgentRunResult {
  history: CoreMessage[]
  finishReason: string
  text: string
}

/**
 * Default tool allowlists per preset. Build mode exposes everything; plan
 * mode keeps only introspection helpers so the model can describe state but
 * cannot mutate the FreeCAD document or filesystem.
 */
export const PLAN_MODE_READONLY_TOOL_IDS: readonly string[] = [
  'list_documents',
  'get_objects',
  'get_object_properties',
  'screenshot',
]

export function buildPresetAllowlist(
  preset: AgentPreset,
  allRegisteredIds: readonly string[],
): readonly string[] | 'all' {
  if (preset === 'build') return 'all'
  // Plan: keep only read-only tools that are actually registered.
  const allow = new Set(PLAN_MODE_READONLY_TOOL_IDS)
  return allRegisteredIds.filter((id) => allow.has(id))
}

export async function runAgentTurn(
  options: AgentRunOptions,
): Promise<AgentRunResult> {
  const {
    agentConfig,
    providerId,
    modelId,
    providers,
    tools,
    history,
    userMessage,
    onEvent,
    abortSignal,
    maxSteps = 8,
  } = options

  onEvent({ type: 'turn_start', providerId, modelId })

  const model = await providers.getModel(providerId, modelId)
  const aiTools = tools.toAiSdkTools(agentConfig.allowedTools)
  const toolDefById = new Map(tools.list().map((d) => [d.id, d]))

  const messages: CoreMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
  ]

  let finishReason = 'unknown'

  try {
    const result = streamText({
      model,
      system: agentConfig.systemPrompt,
      messages,
      tools: aiTools,
      maxSteps,
      abortSignal,
    })

    for await (const part of result.fullStream) {
      // The AI SDK's `TextStreamPart<TOOLS>` collapses the `tool-result`
      // variant to `never` when TOOLS is a generic `Record<string, Tool>`,
      // so we narrow on the runtime tag and re-cast field-by-field.
      const tag = (part as { type: string }).type
      switch (tag) {
        case 'text-delta':
          onEvent({
            type: 'token_delta',
            delta: (part as { textDelta: string }).textDelta,
          })
          break
        case 'tool-call': {
          const tc = part as {
            toolCallId: string
            toolName: string
            args: unknown
          }
          onEvent({
            type: 'tool_call',
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.args,
            provenance: toolDefById.get(tc.toolName)?.provenance ?? 'builtin',
          })
          break
        }
        case 'tool-result': {
          const tr = part as unknown as { toolCallId: string; result: unknown }
          onEvent({
            type: 'tool_result',
            toolCallId: tr.toolCallId,
            output: tr.result,
            isError: false,
          })
          break
        }
        case 'error': {
          const e = (part as { error: unknown }).error
          onEvent({
            type: 'error',
            message: coerceStreamError(e),
          })
          try {
            console.error('[adapter:error-part]', e)
          } catch {
            /* ignore */
          }
          break
        }
        case 'finish':
          finishReason = (part as { finishReason: string }).finishReason
          break
        default:
          // step-start/finish, reasoning, source, file, etc. are ignored at
          // this layer; the host can wire them later if needed.
          break
      }
    }

    const text = await result.text
    const responseMessages = (await result.response).messages
    const newHistory: CoreMessage[] = [...messages, ...responseMessages]

    onEvent({
      type: 'turn_finish',
      finishReason,
      usage: await result.usage,
    })

    return { history: newHistory, finishReason, text }
  } catch (err) {
    onEvent({ type: 'error', message: coerceStreamError(err) })
    throw err
  }
}

// Streams can surface plain objects (or fetch Response errors) instead of
// Error instances; `String(obj)` then yields "[object Object]" and the chat
// renders a meaningless error. Extract a useful string across all shapes so
// the user always sees what actually went wrong.
function coerceStreamError(e: unknown): string {
  const fallback = 'stream error (see main-process console for details)'
  if (e instanceof Error) {
    if (e.message) return e.message
    try {
      const j = JSON.stringify(e, Object.getOwnPropertyNames(e))
      return j && j !== '{}' ? j : fallback
    } catch {
      return fallback
    }
  }
  if (typeof e === 'string') return e.length > 0 ? e : fallback
  if (e && typeof e === 'object') {
    const msg = (e as { message?: unknown }).message
    if (typeof msg === 'string' && msg.length > 0) return msg
    try {
      const j = JSON.stringify(e, Object.getOwnPropertyNames(e as object))
      return j && j !== '{}' ? j : fallback
    } catch {
      return fallback
    }
  }
  const s = String(e)
  return s && s !== '[object Object]' ? s : fallback
}

// Preset factories — mirrored from OpenCode's `build` / `plan` agent
// definitions but stripped down to what Buildoto needs. The systemPrompt is
// supplied by the host so it can prepend the FreeCAD overview cheat-sheet.

export function buildAgent(systemPrompt: string): AgentConfig {
  return {
    name: 'build',
    preset: 'build',
    description: 'Default agent: full tool access for editing CAD models.',
    systemPrompt,
    allowedTools: 'all',
  }
}

export function planAgent(
  systemPrompt: string,
  allRegisteredIds: readonly string[],
): AgentConfig {
  return {
    name: 'plan',
    preset: 'plan',
    description: 'Read-only agent: describes the model, never mutates it.',
    systemPrompt,
    allowedTools: buildPresetAllowlist('plan', allRegisteredIds),
  }
}
