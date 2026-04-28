import { EventEmitter } from 'node:events'
import type {
  CoreMessageEntry,
  Project,
  SessionFile,
  SessionMessage,
  SessionTurnRecord,
} from '@buildoto/shared'
import { ProjectWatcher } from './watcher'
import { readConfig, writeConfig } from './project'
import {
  appendMessage,
  appendTurn,
  createSession,
  deleteSession,
  loadSession,
  saveSession,
  sessionFileAbsolutePath,
} from './sessions'
import { bumpRecent } from './recent'
import { ERR_NO_ACTIVE_PROJECT, ERR_NO_ACTIVE_SESSION } from '../lib/constants'

// Singleton holding the currently active project. Emits lifecycle events so
// IPC handlers, the watcher, and the git module can react without polling.

interface ActiveProject {
  project: Project
  watcher: ProjectWatcher
  activeSession: SessionFile | null
}

class ProjectRegistry extends EventEmitter {
  private current: ActiveProject | null = null

  get(): Project | null {
    return this.current?.project ?? null
  }

  getActiveSession(): SessionFile | null {
    return this.current?.activeSession ?? null
  }

  getWatcher(): ProjectWatcher | null {
    return this.current?.watcher ?? null
  }

  async activate(project: Project): Promise<Project> {
    await this.close()
    const watcher = new ProjectWatcher(project.projectId, project.path)
    watcher.start()
    watcher.on('tree-changed', (delta) => this.emit('tree-changed', delta))
    this.current = { project, watcher, activeSession: null }
    bumpRecent({ projectId: project.projectId, path: project.path, name: project.name })

    // Resume or create session
    const config = await readConfig(project.path)
    if (config.activeSessionId) {
      try {
        const session = await loadSession(project.path, config.activeSessionId)
        this.current.activeSession = session
        this.current.project = { ...project, activeSessionId: session.sessionId }
      } catch (err) {
        console.warn('[registry] could not load active session, creating a new one:', err)
      }
    }
    if (!this.current.activeSession) {
      const session = await createSession(project.path)
      this.current.activeSession = session
      this.current.project = { ...project, activeSessionId: session.sessionId }
      const nextConfig = { ...config, activeSessionId: session.sessionId }
      watcher.markSelfWrite(sessionFileAbsolutePath(project.path, session.sessionId))
      await writeConfig(project.path, nextConfig)
    }

    this.emit('active-changed', this.current.project)
    this.emit('session-active-changed', {
      sessionId: this.current.activeSession.sessionId,
      messages: this.current.activeSession.messages,
    })
    return this.current.project
  }

  async close(): Promise<void> {
    if (!this.current) return
    try {
      await this.current.watcher.stop()
    } catch (err) {
      console.warn('[registry] watcher stop failed:', err)
    }
    this.current = null
    this.emit('active-changed', null)
  }

  async setActiveSession(sessionId: string): Promise<SessionFile> {
    if (!this.current) throw new Error(ERR_NO_ACTIVE_PROJECT)
    const session = await loadSession(this.current.project.path, sessionId)
    this.current.activeSession = session
    this.current.project = { ...this.current.project, activeSessionId: sessionId }
    const config = await readConfig(this.current.project.path)
    const nextConfig = { ...config, activeSessionId: sessionId }
    this.current.watcher.markSelfWrite(sessionFileAbsolutePath(this.current.project.path, sessionId))
    await writeConfig(this.current.project.path, nextConfig)
    this.emit('session-active-changed', { sessionId, messages: session.messages })
    return session
  }

  async newSession(): Promise<SessionFile> {
    if (!this.current) throw new Error(ERR_NO_ACTIVE_PROJECT)
    const session = await createSession(this.current.project.path)
    this.current.watcher.markSelfWrite(sessionFileAbsolutePath(this.current.project.path, session.sessionId))
    return this.setActiveSession(session.sessionId)
  }

  async appendToActiveSession(message: SessionMessage): Promise<SessionFile> {
    if (!this.current || !this.current.activeSession) throw new Error(ERR_NO_ACTIVE_SESSION)
    const { project, activeSession } = this.current
    this.current.watcher.markSelfWrite(sessionFileAbsolutePath(project.path, activeSession.sessionId))
    const updated = await appendMessage(project.path, activeSession.sessionId, message)
    this.current.activeSession = updated
    return updated
  }

  async updateHistory(history: CoreMessageEntry[]): Promise<void> {
    if (!this.current || !this.current.activeSession) return
    const { project, activeSession } = this.current
    activeSession.history = history
    this.current.watcher.markSelfWrite(
      sessionFileAbsolutePath(project.path, activeSession.sessionId),
    )
    await saveSession(project.path, activeSession)
  }

  async recordTurn(turn: SessionTurnRecord): Promise<void> {
    if (!this.current || !this.current.activeSession) return
    const { project, activeSession } = this.current
    this.current.watcher.markSelfWrite(
      sessionFileAbsolutePath(project.path, activeSession.sessionId),
    )
    const updated = await appendTurn(project.path, activeSession.sessionId, turn)
    this.current.activeSession = updated
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.current) throw new Error(ERR_NO_ACTIVE_PROJECT)
    await deleteSession(this.current.project.path, sessionId)
    // If we deleted the active session, create a new one.
    if (this.current.activeSession?.sessionId === sessionId) {
      await this.newSession()
    }
  }

  markSelfWrite(absPath: string) {
    this.current?.watcher.markSelfWrite(absPath)
  }
}

export const projectRegistry = new ProjectRegistry()
