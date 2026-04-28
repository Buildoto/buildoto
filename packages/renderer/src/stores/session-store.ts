import { create } from 'zustand'
import type {
  AgentMode,
  BuildotoRagSource,
  FreecadSidecarStatus,
  ProviderId,
  SessionMessage,
} from '@buildoto/shared'
import { DEFAULT_PROVIDER_ID } from '@buildoto/shared'

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string }
  | { id: string; role: 'tool_call'; name: string; input: unknown; toolUseId: string }
  | { id: string; role: 'tool_result'; output: string; isError: boolean; toolUseId: string }
  | { id: string; role: 'error'; text: string }
  | { id: string; role: 'commit_created'; sha: string; message: string; file: string }

interface SessionState {
  sessionId: string | null
  messages: ChatMessage[]
  isRunning: boolean
  gltfBase64: string | null
  freecadStatus: FreecadSidecarStatus
  mode: AgentMode
  providerId: ProviderId
  model: string | null
  // Sources parsed from X-Buildoto-Sources headers or SSE `event: sources`
  // blocks, keyed by the assistant message they belong to. The adapter emits
  // the sources mid-turn, so the store attaches them to the most recent
  // assistant message by id at receive time.
  sourcesByMessageId: Record<string, BuildotoRagSource[]>

  setSessionId: (id: string | null) => void
  setMessages: (messages: ChatMessage[]) => void
  appendMessage: (message: ChatMessage) => void
  updateLastAssistantText: (text: string) => void
  setLastAssistantText: (text: string) => void
  setRunning: (running: boolean) => void
  setGltf: (base64: string) => void
  setFreecadStatus: (status: FreecadSidecarStatus) => void
  setAgentState: (state: { mode?: AgentMode; providerId?: ProviderId; model?: string }) => void
  attachSourcesToLastAssistant: (sources: BuildotoRagSource[]) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  messages: [],
  isRunning: false,
  gltfBase64: null,
  freecadStatus: { state: 'booting' },
  mode: 'build',
  providerId: DEFAULT_PROVIDER_ID,
  model: null,
  sourcesByMessageId: {},

  setSessionId: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateLastAssistantText: (text) =>
    set((s) => {
      const last = s.messages[s.messages.length - 1]
      if (last && last.role === 'assistant') {
        const updated = [...s.messages]
        updated[updated.length - 1] = { ...last, text: last.text + text }
        return { messages: updated }
      }
      const id = `a-${Date.now()}-${Math.random().toString(36).slice(2)}`
      return { messages: [...s.messages, { id, role: 'assistant', text }] }
    }),
  setLastAssistantText: (text) =>
    set((s) => {
      for (let i = s.messages.length - 1; i >= 0; i--) {
        const m = s.messages[i]
        if (m && m.role === 'assistant') {
          const updated = [...s.messages]
          updated[i] = { ...m, text }
          return { messages: updated }
        }
      }
      const id = `a-${Date.now()}-${Math.random().toString(36).slice(2)}`
      return { messages: [...s.messages, { id, role: 'assistant', text }] }
    }),
  setRunning: (isRunning) => set({ isRunning }),
  setGltf: (gltfBase64) => set({ gltfBase64 }),
  setFreecadStatus: (freecadStatus) => set({ freecadStatus }),
  setAgentState: (next) =>
    set((s) => ({
      mode: next.mode ?? s.mode,
      providerId: next.providerId ?? s.providerId,
      model: next.model ?? s.model,
    })),
  attachSourcesToLastAssistant: (sources) =>
    set((s) => {
      for (let i = s.messages.length - 1; i >= 0; i--) {
        const m = s.messages[i]
        if (m && m.role === 'assistant') {
          return {
            sourcesByMessageId: { ...s.sourcesByMessageId, [m.id]: sources },
          }
        }
      }
      return {}
    }),
  clear: () => set({ messages: [], gltfBase64: null, sourcesByMessageId: {} }),
}))

export function fromSessionMessages(messages: SessionMessage[]): ChatMessage[] {
  return messages.map((m): ChatMessage => {
    if (m.role === 'tool_call') {
      return { id: m.id, role: 'tool_call', name: m.name, input: m.input, toolUseId: m.toolUseId }
    }
    if (m.role === 'tool_result') {
      return {
        id: m.id,
        role: 'tool_result',
        output: m.output,
        isError: m.isError,
        toolUseId: m.toolUseId,
      }
    }
    return { id: m.id, role: m.role, text: m.text }
  })
}
