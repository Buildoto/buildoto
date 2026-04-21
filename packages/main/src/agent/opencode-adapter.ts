import type {
  AgentEvent as BuildotoAgentEvent,
  AgentMode,
  BuildotoRagSource,
  CoreMessageEntry,
  ProviderId,
} from '@buildoto/shared'
import type { CoreMessage } from '@buildoto/opencode-core/session'
import {
  buildAgent,
  planAgent,
  runAgentTurn,
  type AgentEvent as VendorAgentEvent,
} from '@buildoto/opencode-core/agent'
import {
  createProviderRegistry,
  type ProviderRegistry,
} from '@buildoto/opencode-core/provider'
import {
  createToolRegistry,
  type ToolDefinition,
  type ToolRegistry,
} from '@buildoto/opencode-core/tool'
import { buildotoAuth } from '../auth/buildoto'
import { buildotoUsage } from '../auth/usage'
import { BUILDOTO_AI_URL } from '../lib/constants'
import { getApiKey, getProviderModel } from '../store/settings'
import { mcpManager } from '../mcp/manager'
import { STRUCTURED_FREECAD_TOOLS } from '../tools/registry'
import {
  createLegacyFreecadTool,
  type LegacyToolContext,
} from './legacy-tool'
import { buildSystemPrompt } from './system-prompt'
import {
  isEventStream,
  parseSourcesHeader,
  readSourcesFromSse,
} from './buildoto-sources'

const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderId, string> = {
  'buildoto-ai': 'buildoto-ai-v1',
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  mistral: 'mistral-large-latest',
  google: 'gemini-1.5-pro',
  ollama: 'llama3.2',
  openrouter: 'anthropic/claude-sonnet-4',
}

export interface AdapterState {
  providerId: ProviderId
  model: string
  mode: AgentMode
}

export interface RunTurnArgs {
  userMessage: string
  history: CoreMessageEntry[]
  abortSignal?: AbortSignal
  onEvent: (event: BuildotoAgentEvent) => void
  onGeneration?: LegacyToolContext['onGeneration']
  onViewportUpdate?: LegacyToolContext['onViewportUpdate']
}

export interface RunTurnResult {
  stopReason: string
  history: CoreMessageEntry[]
  assistantText: string
}

class OpenCodeAdapter {
  private providers: ProviderRegistry | null = null
  private tools: ToolRegistry | null = null
  private legacyCtxRef: { current: LegacyToolContext } = { current: {} }
  // Per-turn sink for RAG sources parsed from buildoto-ai responses. Set in
  // runTurn(), cleared in the `finally` block so stray late-arriving SSE reads
  // after the turn don't leak into the next one.
  private sourcesSinkRef: {
    current: ((sources: BuildotoRagSource[]) => void) | null
  } = { current: null }
  // Initial fallback kept on 'anthropic' (not 'buildoto-ai') so the adapter
  // never triggers an implicit portal auth flow before init() hydrates from
  // the settings store. On nominal paths init() replaces this immediately.
  private state: AdapterState = {
    providerId: 'anthropic',
    model: DEFAULT_MODEL_BY_PROVIDER.anthropic,
    mode: 'build',
  }

  init(initialProvider?: ProviderId, initialMode?: AgentMode) {
    if (initialProvider) {
      this.state.providerId = initialProvider
      this.state.model = this.resolveModel(initialProvider)
    }
    if (initialMode) this.state.mode = initialMode
    if (!this.providers) {
      this.providers = createProviderRegistry({
        // Buildoto AI uses a short-lived JWT (5 min, minted by the portal). We
        // route that one provider through the auth manager instead of keytar
        // so the token is refreshed on-demand for each request.
        getKey: (providerId) =>
          providerId === 'buildoto-ai'
            ? buildotoAuth.getAccessToken().catch(() => null)
            : getApiKey(providerId),
        buildotoAiBaseUrl: `${BUILDOTO_AI_URL}/v1`,
        onBuildotoAiResponse: (res) => this.handleBuildotoAiResponse(res),
      })
    }
    if (!this.tools) {
      this.tools = createToolRegistry()
      this.tools.register(
        createLegacyFreecadTool(this.legacyCtxRef) as unknown as ToolDefinition,
      )
      this.tools.registerMany(STRUCTURED_FREECAD_TOOLS)
    }
  }

  getState(): AdapterState {
    return { ...this.state }
  }

  setProvider(providerId: ProviderId, model?: string): AdapterState {
    this.state.providerId = providerId
    this.state.model = model ?? this.resolveModel(providerId)
    return this.getState()
  }

  setMode(mode: AgentMode): AdapterState {
    this.state.mode = mode
    return this.getState()
  }

  async runTurn(args: RunTurnArgs): Promise<RunTurnResult> {
    this.init()
    const providers = this.providers!
    const tools = this.tools!

    this.syncMcpTools(tools)

    this.legacyCtxRef.current = {
      onGeneration: args.onGeneration,
      onViewportUpdate: args.onViewportUpdate,
    }
    this.sourcesSinkRef.current = (sources) => {
      if (sources.length === 0) return
      args.onEvent({ type: 'sources', sources })
    }

    const systemPrompt = await buildSystemPrompt(this.state.mode)
    const agentConfig =
      this.state.mode === 'plan'
        ? planAgent(systemPrompt, tools.listIds())
        : buildAgent(systemPrompt)

    let accumulatedText = ''
    let stopReason = 'unknown'

    try {
      const result = await runAgentTurn({
        agentConfig,
        providerId: this.state.providerId,
        modelId: this.state.model,
        providers,
        tools,
        history: args.history as CoreMessage[],
        userMessage: args.userMessage,
        abortSignal: args.abortSignal,
        onEvent: (event) => {
          const translated = this.translateEvent(event)
          if (event.type === 'token_delta') accumulatedText += event.delta
          if (event.type === 'turn_finish') stopReason = event.finishReason
          if (translated) args.onEvent(translated)
        },
      })

      if (accumulatedText.trim().length > 0) {
        args.onEvent({
          type: 'assistant_text',
          text: accumulatedText,
          provider: this.state.providerId,
        })
      }
      args.onEvent({ type: 'done', stopReason })

      return {
        stopReason,
        history: result.history as CoreMessageEntry[],
        assistantText: result.text ?? accumulatedText,
      }
    } finally {
      this.legacyCtxRef.current = {}
      this.sourcesSinkRef.current = null
    }
  }

  // Called from the vendored provider tap for every buildoto-ai HTTP response.
  // Splits the single hook into usage-headers (sync) and sources parsing
  // (which may need to await the cloned SSE body). Runs best-effort so a
  // malformed sources payload never breaks the agent turn.
  private handleBuildotoAiResponse(res: Response): void {
    buildotoUsage.applyQuotaHeaders(res.headers)
    const sink = this.sourcesSinkRef.current
    if (!sink) return
    const fromHeader = parseSourcesHeader(res.headers)
    if (fromHeader && fromHeader.length > 0) {
      sink(fromHeader)
      return
    }
    if (!isEventStream(res.headers) || !res.body) return
    void readSourcesFromSse(res.body)
      .then((sources) => {
        if (!sources || sources.length === 0) return
        // The sink may have been cleared if the turn already finished. That's
        // fine — late SSE reads shouldn't spill into the next turn.
        const live = this.sourcesSinkRef.current
        if (live) live(sources)
      })
      .catch(() => {
        /* best-effort — swallow */
      })
  }

  private translateEvent(event: VendorAgentEvent): BuildotoAgentEvent | null {
    switch (event.type) {
      case 'token_delta':
        return { type: 'token_delta', text: event.delta }
      case 'tool_call':
        return {
          type: 'tool_call',
          toolUseId: event.toolCallId,
          name: event.toolName,
          input: event.input,
          provenance: event.provenance,
        }
      case 'tool_result': {
        const output =
          typeof event.output === 'string'
            ? event.output
            : JSON.stringify(event.output)
        return {
          type: 'tool_result',
          toolUseId: event.toolCallId,
          output,
          isError: event.isError,
        }
      }
      case 'error':
        return { type: 'error', message: event.message }
      default:
        return null
    }
  }

  private resolveModel(providerId: ProviderId): string {
    return (
      getProviderModel(providerId) ?? DEFAULT_MODEL_BY_PROVIDER[providerId]
    )
  }

  private registeredMcpIds = new Set<string>()

  private syncMcpTools(tools: ToolRegistry) {
    const incoming = mcpManager.toToolDefinitions()
    const incomingIds = new Set(incoming.map((d) => d.id))
    for (const def of incoming) {
      if (!this.registeredMcpIds.has(def.id)) {
        try {
          tools.register(def)
          this.registeredMcpIds.add(def.id)
        } catch {
          // already registered under the same id — skip
        }
      }
    }
    for (const id of [...this.registeredMcpIds]) {
      if (!incomingIds.has(id)) this.registeredMcpIds.delete(id)
    }
  }
}

export const openCodeAdapter = new OpenCodeAdapter()
