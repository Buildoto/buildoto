import { useEffect, useCallback } from 'react'
import type { AgentEvent, AgentMode, ProviderId, SessionActiveChanged } from '@buildoto/shared'
import { fromSessionMessages, useSessionStore } from '@/stores/session-store'

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useAgentEvents() {
  const {
    appendMessage,
    updateLastAssistantText,
    setGltf,
    setRunning,
    attachSourcesToLastAssistant,
  } = useSessionStore()

  useEffect(() => {
    const unsubscribe = window.buildoto.agent.onEvent((event: AgentEvent) => {
      switch (event.type) {
        case 'assistant_text': {
          // Belt-and-braces: upstream providers (buildoto-ai via Mistral)
          // can surface non-string content in streamed deltas. Coerce to a
          // readable string so the chat never renders "[object Object]".
          const text =
            typeof event.text === 'string'
              ? event.text
              : JSON.stringify(event.text)
          updateLastAssistantText(text)
          break
        }
        case 'tool_call':
          appendMessage({
            id: genId('tc'),
            role: 'tool_call',
            name: event.name,
            input: event.input,
            toolUseId: event.toolUseId,
          })
          break
        case 'tool_result':
          appendMessage({
            id: genId('tr'),
            role: 'tool_result',
            output: event.output,
            isError: event.isError,
            toolUseId: event.toolUseId,
          })
          break
        case 'viewport_update':
          setGltf(event.gltfBase64)
          break
        case 'commit_created':
          appendMessage({
            id: genId('cc'),
            role: 'commit_created',
            sha: event.sha,
            message: event.message,
            file: event.file,
          })
          break
        case 'sources':
          attachSourcesToLastAssistant(event.sources)
          break
        case 'done':
          setRunning(false)
          break
        case 'error': {
          const raw =
            typeof event.message === 'string'
              ? event.message
              : JSON.stringify(event.message)
          // Last rampart: older sessions persisted the literal "[object Object]"
          // back when the coercion layers still let it through. Rewrite it in
          // place so the transcript is readable; the raw shape is already in
          // the main-process console for diagnosis.
          const text =
            raw === '[object Object]'
              ? 'erreur inconnue — voir console Electron'
              : raw
          if (raw === '[object Object]') {
            console.warn('[use-agent] legacy "[object Object]" error replaced')
          }
          appendMessage({ id: genId('err'), role: 'error', text })
          setRunning(false)
          break
        }
      }
    })
    return unsubscribe
  }, [
    appendMessage,
    updateLastAssistantText,
    setGltf,
    setRunning,
    attachSourcesToLastAssistant,
  ])
}

export function useActiveSessionStream() {
  const setSessionId = useSessionStore((s) => s.setSessionId)
  const setMessages = useSessionStore((s) => s.setMessages)

  useEffect(() => {
    const unsub = window.buildoto.session.onActiveChanged((payload: SessionActiveChanged) => {
      setSessionId(payload.sessionId)
      setMessages(fromSessionMessages(payload.messages))
    })
    return unsub
  }, [setSessionId, setMessages])
}

export function useSendMessage() {
  const { appendMessage, setRunning } = useSessionStore()
  return useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      appendMessage({ id: genId('u'), role: 'user', text: trimmed })
      setRunning(true)
      try {
        await window.buildoto.agent.runTurn({ userMessage: trimmed })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        appendMessage({ id: genId('err'), role: 'error', text: msg })
        setRunning(false)
      }
    },
    [appendMessage, setRunning],
  )
}

export function useAgentStateBootstrap() {
  const setAgentState = useSessionStore((s) => s.setAgentState)
  useEffect(() => {
    void window.buildoto.agent.getState().then((state) => {
      setAgentState({ mode: state.mode, providerId: state.providerId, model: state.model })
    })
  }, [setAgentState])
}

export function useToggleMode() {
  const setAgentState = useSessionStore((s) => s.setAgentState)
  return useCallback(
    async (mode: AgentMode) => {
      const next = await window.buildoto.agent.setMode({ mode })
      setAgentState({ mode: next.mode })
    },
    [setAgentState],
  )
}

export function useSwitchProvider() {
  const setAgentState = useSessionStore((s) => s.setAgentState)
  return useCallback(
    async (providerId: ProviderId, model?: string) => {
      const next = await window.buildoto.agent.setProvider({ providerId, model })
      setAgentState({ providerId: next.providerId, model: next.model })
    },
    [setAgentState],
  )
}
