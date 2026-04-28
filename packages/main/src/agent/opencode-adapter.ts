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
import { BUILDOTO_AI_URL, MAX_HISTORY_TURNS } from '../lib/constants'
import { getApiKey, getProviderModel } from '../store/settings'
import { mcpManager } from '../mcp/manager'
import { setViewportUpdateCallback } from '../freecad/client'
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
import { sanitizeHistory } from './sanitize-history'
import { DEFAULT_MODEL_BY_PROVIDER } from '../lib/constants'
import { DEFAULT_PROVIDER_ID } from '@buildoto/shared'
import { safeErrorMessage } from '../lib/safe-error'

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
  // Initial fallback kept on DEFAULT_PROVIDER_ID (not 'buildoto-ai') so the
  // adapter never triggers an implicit portal auth flow before init() hydrates
  // from the settings store. On nominal paths init() replaces this immediately.
  private state: AdapterState = {
    providerId: DEFAULT_PROVIDER_ID,
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
    this.state.model =
      model && model.trim() !== '' ? model : this.resolveModel(providerId)
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
    setViewportUpdateCallback(args.onViewportUpdate ?? null)
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

    // Truncate to the last N turns so we don't exceed the provider's context
    // window. Keeps the last `MAX_HISTORY_TURNS` assistant+user pairs plus the
    // original system-style messages.
    const truncated = args.history.length > MAX_HISTORY_TURNS
      ? args.history.slice(-MAX_HISTORY_TURNS) as CoreMessage[]
      : args.history as CoreMessage[]

    // Repair any orphan tool_calls in the persisted history before handing
    // it to the provider — OpenAI-compatible backends reject turns with
    // unterminated tool calls. See sanitize-history.ts.
    const sanitizeReport = { injected: 0, orphanToolCallIds: [] as string[] }
    const safeHistory = sanitizeHistory(truncated,
      sanitizeReport,
    )
    if (sanitizeReport.injected > 0) {
      console.warn(
        `[opencode-adapter] history had ${sanitizeReport.injected} orphan tool_call(s); injected synthetic error results`,
        sanitizeReport.orphanToolCallIds,
      )
    }

    try {
      const result = await runAgentTurn({
        agentConfig,
        providerId: this.state.providerId,
        modelId: this.state.model,
        providers,
        tools,
        history: safeHistory,
        userMessage: args.userMessage,
        abortSignal: args.abortSignal,
        onEvent: (event) => {
          const translated = this.translateEvent(event)
          if (event.type === 'token_delta') {
            // Defensive: the AI SDK's `textDelta` is typed as string, but
            // an OpenAI-compatible upstream (buildoto-ai via Mistral) can
            // surface non-string content parts in the delta. Skipping a
            // non-string keeps the rendered transcript clean instead of
            // emitting "[object Object]" into the chat.
            const delta =
              typeof event.delta === 'string'
                ? event.delta
                : ''
            accumulatedText += delta
          }
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
    // A 401 here means the JWT we sent was rejected — most often because the
    // cached token expired between getKey() and the server's decode. Drop the
    // cache so the next retry (ai-sdk retries 3× on transient errors) mints a
    // fresh JWT instead of replaying the dead one.
    if (res.status === 401) {
      buildotoAuth.invalidateAccessToken()
      // The provider registry caches the LanguageModel factory keyed by the
      // API key string — bust it so the next ai-sdk retry rebuilds it with a
      // freshly minted JWT instead of replaying the dead closure.
      this.providers?.invalidate('buildoto-ai')
    }
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
        // For error results the raw `output` is often a native Error or a
        // bare object — stringifying it with JSON yields `{}` because Error
        // props aren't enumerable, leaving the user staring at "[object Object]".
        // Route errors through safeErrorMessage so the chat surfaces the real
        // cause; success paths keep the structured JSON so downstream tools
        // can still parse it.
        const output = event.isError
          ? safeErrorMessage(event.output, 'tool failed (no message)')
          : typeof event.output === 'string'
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
    const stored = getProviderModel(providerId)
    return stored && stored.trim() !== ''
      ? stored
      : DEFAULT_MODEL_BY_PROVIDER[providerId]
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
      if (!incomingIds.has(id)) {
        tools.unregister(id)
        this.registeredMcpIds.delete(id)
      }
    }
  }
}

export const openCodeAdapter = new OpenCodeAdapter()
