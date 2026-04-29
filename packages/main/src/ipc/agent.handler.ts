import { ipcMain, type BrowserWindow } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ulid } from 'ulid'
import {
  IpcChannels,
  type AgentEvent,
  type AgentRunTurnRequest,
  type AgentRunTurnResult,
  type AgentSetModeRequest,
  type AgentSetProviderRequest,
  type AgentState,
  type CoreMessageEntry,
  type SessionMessage,
} from '@buildoto/shared'
import { openCodeAdapter } from '../agent/opencode-adapter'
import { GitRepo } from '../git/repo'
import { generateCommitMessage } from '../git/commit-message'
import { safeErrorMessage } from '../lib/safe-error'
import { BUILDOTO_DIR, BUILDOTO_SESSIONS_DIR } from '../lib/constants'
import { readConfig, writeConfig } from '../project/project'
import { projectRegistry } from '../project/registry'
import { getApiKey } from '../store/settings'
import { buildotoAuth } from '../auth/buildoto'
import type { Project, ProviderId, AgentMode } from '@buildoto/shared'

let fallbackHistory: CoreMessageEntry[] = []
let activeController: AbortController | null = null
let turnTimeout: NodeJS.Timeout | null = null

function isAbortError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true
  if (err instanceof Error && err.message.toLowerCase().includes('abort')) return true
  if (err instanceof DOMException && err.name === 'AbortError') return true
  return false
}

async function persistAgentConfig(
  project: Project,
  update: (current: {
    defaultProvider: ProviderId
    mode: AgentMode
    providers: Partial<Record<ProviderId, { model: string; temperature?: number }>>
  }) => void,
): Promise<void> {
  try {
    const config = await readConfig(project.path)
    update(config.agent)
    await writeConfig(project.path, config)
  } catch (err) {
    console.warn('[agent] failed to persist agent config:', err)
  }
}

async function hydrateAdapterFromProject(project: Project): Promise<void> {
  try {
    const config = await readConfig(project.path)
    const providerModel = config.agent.providers[config.agent.defaultProvider]?.model
    openCodeAdapter.setProvider(config.agent.defaultProvider, providerModel)
    openCodeAdapter.setMode(config.agent.mode)
  } catch (err) {
    console.warn('[agent] failed to hydrate adapter from project config:', err)
  }
}

export function registerAgentHandlers(window: BrowserWindow) {
  openCodeAdapter.init()

  const emit = (event: AgentEvent) => {
    if (!window.isDestroyed()) window.webContents.send(IpcChannels.AGENT_EVENT, event)
  }

  projectRegistry.on('active-changed', (project: Project | null) => {
    if (project) void hydrateAdapterFromProject(project)
  })

  ipcMain.handle(
    IpcChannels.AGENT_RUN_TURN,
    async (_e, req: AgentRunTurnRequest): Promise<AgentRunTurnResult> => {
      const { providerId, model } = openCodeAdapter.getState()
      if (!model || model.trim() === '') {
        const msg = providerId === 'ollama'
          ? 'Modèle Ollama non configuré.'
          : `Modèle non configuré pour ${providerId}.`
        emit({ type: 'error', message: msg })
        return { stopReason: 'error' }
      }
      const hasCredential =
        providerId === 'ollama'
          ? true
          : providerId === 'buildoto-ai'
            ? !!(await buildotoAuth.getAccessToken().catch(() => null))
            : !!(await getApiKey(providerId))
      if (!hasCredential) {
        const msg =
          providerId === 'buildoto-ai'
            ? 'Connectez-vous à Buildoto AI dans les réglages.'
            : `Aucune clé API ${providerId} configurée. Ouvrez les réglages.`
        emit({ type: 'error', message: msg })
        return { stopReason: 'error' }
      }

      if (activeController) activeController.abort()
      if (turnTimeout) clearTimeout(turnTimeout)
      activeController = new AbortController()
      // Safety timeout: auto-abort after 10 minutes to prevent runaway turns.
      turnTimeout = setTimeout(() => {
        activeController?.abort()
        activeController = null
        turnTimeout = null
      }, 10 * 60 * 1000)

      const project = projectRegistry.get()
      const activeSession = projectRegistry.getActiveSession()
      const history = activeSession?.history ?? fallbackHistory
      const generationFiles: string[] = []

      const appendSession = async (message: SessionMessage) => {
        if (!project || !activeSession) return
        try {
          await projectRegistry.appendToActiveSession(message)
        } catch (err) {
          console.warn('[agent] failed to append session message:', err)
        }
      }

      await appendSession({
        id: `u-${ulid()}`,
        role: 'user',
        text: req.userMessage,
        ts: new Date().toISOString(),
      })

      const startedAt = new Date().toISOString()
      const turnState = openCodeAdapter.getState()

      try {
        const result = await openCodeAdapter.runTurn({
          userMessage: req.userMessage,
          history,
          abortSignal: activeController.signal,
          onEvent: (event) => {
            emit(event)
            void persistEventToSession(event, appendSession)
          },
          onViewportUpdate: (gltfBase64, bytes) =>
            emit({ type: 'viewport_update', gltfBase64, bytes }),
          onGeneration: project
            ? async (payload) => {
                // Try the active provider's key for commit message generation.
                // buildoto-ai uses JWT auth (no API key) — skip key lookup for it.
                const commitKey = turnState.providerId !== 'buildoto-ai'
                  ? await getApiKey(turnState.providerId).catch(() => null)
                  : null
                const file = await handleGeneration({
                  project,
                  payload,
                  apiKey: commitKey || undefined,
                  emit,
                })
                if (file) generationFiles.push(file)
              }
            : undefined,
        })

        if (project && activeSession) {
          await projectRegistry.updateHistory(result.history)
          await projectRegistry.recordTurn({
            startedAt,
            provider: turnState.providerId,
            model: turnState.model,
            mode: turnState.mode,
            stopReason: result.stopReason,
          })
        } else {
          fallbackHistory = result.history
        }
        return { stopReason: result.stopReason }
      } catch (err) {
        if (isAbortError(err)) {
          emit({ type: 'canceled' })
          return { stopReason: 'canceled' }
        }
        console.error('[agent:run-turn] error:', err)
        const msg = safeErrorMessage(err)
        emit({ type: 'error', message: msg })
        await appendSession({
          id: `e-${ulid()}`,
          role: 'error',
          text: msg,
          ts: new Date().toISOString(),
        })
        return { stopReason: 'error' }
      } finally {
        activeController = null
        if (turnTimeout) { clearTimeout(turnTimeout); turnTimeout = null }
      }
    },
  )

  ipcMain.handle(IpcChannels.AGENT_ABORT, () => {
    activeController?.abort()
    activeController = null
    if (turnTimeout) { clearTimeout(turnTimeout); turnTimeout = null }
  })

  ipcMain.handle(
    IpcChannels.AGENT_SET_PROVIDER,
    async (_e, req: AgentSetProviderRequest): Promise<AgentState> => {
      const state = openCodeAdapter.setProvider(req.providerId, req.model)
      const project = projectRegistry.get()
      if (project) {
        await persistAgentConfig(project, (agent) => {
          agent.defaultProvider = state.providerId
          const existing = agent.providers[state.providerId] ?? { model: state.model }
          agent.providers[state.providerId] = { ...existing, model: state.model }
        })
      }
      emit({
        type: 'provider_changed',
        providerId: state.providerId,
        model: state.model,
      })
      return state
    },
  )

  ipcMain.handle(
    IpcChannels.AGENT_SET_MODE,
    async (_e, req: AgentSetModeRequest): Promise<AgentState> => {
      const state = openCodeAdapter.setMode(req.mode)
      const project = projectRegistry.get()
      if (project) {
        await persistAgentConfig(project, (agent) => {
          agent.mode = state.mode
        })
      }
      emit({ type: 'mode_changed', mode: state.mode })
      return state
    },
  )

  ipcMain.handle(IpcChannels.AGENT_GET_STATE, (): AgentState => openCodeAdapter.getState())
}

async function persistEventToSession(
  event: AgentEvent,
  append: (m: SessionMessage) => Promise<void>,
): Promise<void> {
  const ts = new Date().toISOString()
  if (event.type === 'assistant_text') {
    await append({ id: `a-${ulid()}`, role: 'assistant', text: event.text, ts, provider: event.provider })
  } else if (event.type === 'tool_call') {
    await append({
      id: `tc-${ulid()}`,
      role: 'tool_call',
      toolUseId: event.toolUseId,
      name: event.name,
      input: event.input,
      provenance: event.provenance,
      ts,
    })
  } else if (event.type === 'tool_result') {
    await append({
      id: `tr-${ulid()}`,
      role: 'tool_result',
      toolUseId: event.toolUseId,
      output: event.output,
      isError: event.isError,
      ts,
    })
  }
}

interface HandleGenerationArgs {
  project: { projectId: string; path: string }
  payload: {
    toolCallId: string
    code: string
    stdout: string
    stderr: string
    durationMs: number
  }
  apiKey?: string
  emit: (event: AgentEvent) => void
}

async function handleGeneration(args: HandleGenerationArgs): Promise<string | null> {
  const { project, payload, apiKey, emit } = args
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const slug = slugifyCode(payload.code)
    const rel = `generations/${stamp}_${slug}.py`
    const abs = join(project.path, rel)
    projectRegistry.markSelfWrite(abs)
    await writeFile(abs, payload.code, 'utf8')

    const session = projectRegistry.getActiveSession()
    const sessionRel = session
      ? `${BUILDOTO_DIR}/${BUILDOTO_SESSIONS_DIR}/${session.sessionId}.json`
      : null

    const filesChanged = [rel]
    if (sessionRel) filesChanged.push(sessionRel)
    const documentsChanged = await listDocumentChanges(project.path)
    for (const f of documentsChanged) filesChanged.push(f)

    const message = await generateCommitMessage({
      apiKey,
      code: payload.code,
      stdoutPreview: payload.stdout,
      filesChanged,
    })

    const repo = new GitRepo(project.path)
    const files = [rel]
    if (sessionRel) files.push(sessionRel)
    for (const f of documentsChanged) files.push(f)
    const { sha } = await repo.commit(message, files)
    emit({ type: 'commit_created', sha, message, file: rel })

    if (session) {
      session.generations.push({ file: rel, commit: sha })
    }
    return rel
  } catch (err) {
    console.warn('[agent] auto-commit failed:', err)
    return null
  }
}

async function listDocumentChanges(projectPath: string): Promise<string[]> {
  try {
    const repo = new GitRepo(projectPath)
    const status = await repo.status()
    const all = [...status.unstaged, ...status.untracked, ...status.staged]
    return all.filter((p) => p.startsWith('documents/'))
  } catch {
    return []
  }
}

function slugifyCode(code: string): string {
  const firstComment = code
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('#'))
  const basis = firstComment ? firstComment.replace(/^#+/, '') : code
  return (
    basis
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'generation'
  )
}
