#!/usr/bin/env tsx
// Sprint 2 smoke — creates a throwaway Buildoto project in a temp directory,
// runs one agent turn that should trigger auto-commit, and asserts the git log,
// generations folder, and session JSON all reflect the turn.
//
// Usage: ANTHROPIC_API_KEY=… pnpm smoke:project

import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import simpleGit from 'simple-git'

import type { AgentEvent, SessionFile } from '@buildoto/shared'
import { freecadSidecar } from '../freecad/sidecar'
import { openCodeAdapter } from '../agent/opencode-adapter'
import { GitRepo } from '../git/repo'
import { generateCommitMessage } from '../git/commit-message'
import { createProject } from '../project/project'
import { appendMessage, createSession } from '../project/sessions'
import { setApiKey } from '../store/settings'

const PROMPT = "Crée un cube de 2 mètres à l'origine."

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[smoke:project] ANTHROPIC_API_KEY not set')
    process.exit(2)
  }

  await setApiKey('anthropic', apiKey)

  const workDir = await mkdtemp(join(tmpdir(), 'buildoto-smoke-'))
  console.log('[smoke:project] temp dir:', workDir)

  let ok = false
  try {
    console.log('[smoke:project] creating project…')
    const project = await createProject({ name: 'smoke', parentPath: workDir })
    const session = await createSession(project.path)
    console.log('[smoke:project] project + session created:', project.projectId, session.sessionId)

    console.log('[smoke:project] starting FreeCAD sidecar…')
    await freecadSidecar.start()
    openCodeAdapter.init('anthropic', 'build')

    const repo = new GitRepo(project.path)
    const generationRels: string[] = []

    try {
      const result = await openCodeAdapter.runTurn({
        userMessage: PROMPT,
        history: [],
        onEvent: (event: AgentEvent) => {
          if (event.type === 'assistant_text') process.stdout.write(event.text)
          if (event.type === 'tool_call') console.log(`\n[smoke:project] tool_call: ${event.name}`)
          if (event.type === 'commit_created')
            console.log(`[smoke:project] commit ${event.sha.slice(0, 7)} — ${event.message}`)
        },
        onGeneration: async (payload) => {
          const rel = await persistGeneration(project.path, payload.code)
          generationRels.push(rel)
          await appendMessage(project.path, session.sessionId, {
            id: `u-${Date.now()}`,
            role: 'user',
            text: PROMPT,
            ts: new Date().toISOString(),
          })
          const sessionRel = `.buildoto/sessions/${session.sessionId}.json`
          const message = await generateCommitMessage({
            apiKey,
            code: payload.code,
            stdoutPreview: payload.stdout,
            filesChanged: [rel, sessionRel],
          })
          await repo.commit(message, [rel, sessionRel])
        },
      })
      console.log(`\n[smoke:project] stop_reason: ${result.stopReason}`)
    } finally {
      await freecadSidecar.stop()
    }

    const log = await simpleGit(project.path).log()
    const generationsDir = join(project.path, 'generations')
    const files = await readdir(generationsDir)
    const pyFiles = files.filter((f) => f.endsWith('.py'))
    const sessionAfter: SessionFile = JSON.parse(
      await readFile(join(project.path, '.buildoto/sessions', `${session.sessionId}.json`), 'utf8'),
    )

    const initCommit = log.all.some((c) => c.message.startsWith('chore: buildoto project init'))
    const extraCommit = log.total > 1
    const hasPy = pyFiles.length >= 1
    const sessionHasUser = sessionAfter.messages.some((m) => m.role === 'user')

    console.log('\n[smoke:project] assertions:')
    console.log('  commits:', log.total)
    console.log('  generations/*.py:', pyFiles)
    console.log('  session messages:', sessionAfter.messages.length)

    ok = initCommit && extraCommit && hasPy && sessionHasUser && generationRels.length >= 1
    if (!ok) {
      console.error('[smoke:project] FAILED')
    } else {
      console.log('[smoke:project] OK')
    }
  } finally {
    if (process.env.KEEP_SMOKE_DIR) {
      console.log('[smoke:project] keeping', workDir)
    } else {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  process.exit(ok ? 0 : 1)
}

async function persistGeneration(projectPath: string, code: string): Promise<string> {
  const { writeFile } = await import('node:fs/promises')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const rel = `generations/${stamp}_smoke.py`
  await writeFile(join(projectPath, rel), code, 'utf8')
  return rel
}

main().catch((err) => {
  console.error('[smoke:project] uncaught:', err)
  void freecadSidecar.stop().catch(() => undefined)
  process.exit(1)
})
