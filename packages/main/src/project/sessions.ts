import { readFile, readdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type {
  AnySessionFile,
  CoreMessageEntry,
  SessionFile,
  SessionFileV1,
  SessionFileV2,
  SessionMessage,
  SessionSummary,
  SessionTurnRecord,
} from '@buildoto/shared'
import {
  anthropicToCoreMessages,
  type AnthropicMessageParam,
} from '@buildoto/opencode-core/session'
import { BUILDOTO_DIR, BUILDOTO_SESSIONS_DIR } from '../lib/constants'
import { newSessionId, writeJsonAtomic } from './project'

function sessionsDir(projectPath: string): string {
  return join(projectPath, BUILDOTO_DIR, BUILDOTO_SESSIONS_DIR)
}

function sessionPath(projectPath: string, sessionId: string): string {
  return join(sessionsDir(projectPath), `${sessionId}.json`)
}

function migrateSessionV1toV2(v1: SessionFileV1): SessionFileV2 {
  const history = anthropicToCoreMessages(
    v1.anthropicHistory as AnthropicMessageParam[],
  )
  return {
    schemaVersion: 2,
    sessionId: v1.sessionId,
    createdAt: v1.createdAt,
    updatedAt: new Date().toISOString(),
    title: v1.title,
    messages: v1.messages,
    history: history as CoreMessageEntry[],
    turns: [],
    generations: v1.generations,
  }
}

export async function listSessions(projectPath: string): Promise<SessionSummary[]> {
  const dir = sessionsDir(projectPath)
  if (!existsSync(dir)) return []
  const files = await readdir(dir)
  const summaries: SessionSummary[] = []
  for (const f of files) {
    if (!f.endsWith('.json')) continue
    try {
      const full = await readFile(join(dir, f), 'utf8')
      const parsed = JSON.parse(full) as AnySessionFile
      summaries.push({
        sessionId: parsed.sessionId,
        title: parsed.title,
        updatedAt: parsed.updatedAt,
        messageCount: parsed.messages.length,
      })
    } catch (err) {
      console.warn('[sessions] skip invalid session file:', f, err)
    }
  }
  summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return summaries
}

export async function loadSession(projectPath: string, sessionId: string): Promise<SessionFile> {
  let raw: string
  try {
    raw = await readFile(sessionPath(projectPath, sessionId), 'utf8')
  } catch {
    // File not found or unreadable — returns a fresh session.
    return createSession(projectPath)
  }
  let parsed: AnySessionFile
  try {
    parsed = JSON.parse(raw) as AnySessionFile
  } catch {
    // Corrupt JSON — create a fresh session instead of crashing.
    console.warn('[sessions] corrupt session file, creating new:', sessionId)
    return createSession(projectPath)
  }
  if (parsed.schemaVersion === 2) return parsed
  if (parsed.schemaVersion === 1) {
    const migrated = migrateSessionV1toV2(parsed)
    await writeJsonAtomic(sessionPath(projectPath, sessionId), migrated)
    return migrated
  }
  throw new Error(
    `Version du schéma de session non supportée : ${(parsed as { schemaVersion?: unknown }).schemaVersion}`,
  )
}

export async function createSession(projectPath: string): Promise<SessionFile> {
  const now = new Date().toISOString()
  const file: SessionFileV2 = {
    schemaVersion: 2,
    sessionId: newSessionId(),
    createdAt: now,
    updatedAt: now,
    title: 'Nouvelle session',
    messages: [],
    history: [],
    turns: [],
    generations: [],
  }
  await writeJsonAtomic(sessionPath(projectPath, file.sessionId), file)
  return file
}

export async function saveSession(projectPath: string, session: SessionFile): Promise<void> {
  session.updatedAt = new Date().toISOString()
  await writeJsonAtomic(sessionPath(projectPath, session.sessionId), session)
}

export async function appendMessage(
  projectPath: string,
  sessionId: string,
  message: SessionMessage,
): Promise<SessionFile> {
  const file = await loadSession(projectPath, sessionId)
  file.messages.push(message)
  if (file.title === 'Nouvelle session' && message.role === 'user') {
    file.title = message.text.slice(0, 60)
  }
  await saveSession(projectPath, file)
  return file
}

export async function appendTurn(
  projectPath: string,
  sessionId: string,
  turn: SessionTurnRecord,
): Promise<SessionFile> {
  const file = await loadSession(projectPath, sessionId)
  file.turns.push(turn)
  await saveSession(projectPath, file)
  return file
}

export function sessionFileAbsolutePath(projectPath: string, sessionId: string): string {
  return sessionPath(projectPath, sessionId)
}

export async function deleteSession(projectPath: string, sessionId: string): Promise<void> {
  const filePath = sessionPath(projectPath, sessionId)
  if (existsSync(filePath)) {
    await unlink(filePath)
  }
}
