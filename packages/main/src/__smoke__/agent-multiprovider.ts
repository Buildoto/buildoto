#!/usr/bin/env tsx
// Sprint 3 multiprovider smoke. Validates the OpenCode-vendored agent loop end
// to end:
//   1. boot FreeCAD sidecar
//   2. Anthropic / build mode → prompt for cube + wall, expect structured tool
//      calls (`part_create_box` and `arch_create_wall`), not the legacy
//      `execute_python_freecad`
//   3. switch provider mid-session (Mistral or OpenAI), prompt for door,
//      expect `arch_create_door` and history preserved
//   4. switch to plan mode, ask a question, expect no tool calls
//   5. configure mcp-server-fetch (stdio), confirm MCP-provenance tools enumerable
//
// Skips with exit 0 when ANTHROPIC_API_KEY missing. Optional:
// OPENAI_API_KEY or MISTRAL_API_KEY for the provider switch step.
//
// Usage: pnpm smoke:agent

import type { AgentEvent, ProviderId } from '@buildoto/shared'
import { freecadSidecar } from '../freecad/sidecar'
import { openCodeAdapter } from '../agent/opencode-adapter'
import { mcpManager } from '../mcp/manager'
import { setApiKey } from '../store/settings'

interface TurnRecord {
  toolCalls: string[]
  errors: string[]
  text: string
}

async function runTurn(prompt: string, history: unknown[]): Promise<TurnRecord & { history: unknown[] }> {
  const record: TurnRecord = { toolCalls: [], errors: [], text: '' }
  const result = await openCodeAdapter.runTurn({
    userMessage: prompt,
    history: history as never,
    onEvent: (event: AgentEvent) => {
      if (event.type === 'assistant_text') record.text += event.text
      else if (event.type === 'tool_call') record.toolCalls.push(event.name)
      else if (event.type === 'error') record.errors.push(event.message)
    },
  })
  return { ...record, history: result.history }
}

function pickSecondProvider(): ProviderId | null {
  if (process.env.MISTRAL_API_KEY) return 'mistral'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return null
}

async function main() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.log('[smoke:agent] ANTHROPIC_API_KEY not set — skipping.')
    process.exit(0)
  }

  await setApiKey('anthropic', anthropicKey)
  const second = pickSecondProvider()
  if (second === 'mistral') await setApiKey('mistral', process.env.MISTRAL_API_KEY!)
  if (second === 'openai') await setApiKey('openai', process.env.OPENAI_API_KEY!)

  console.log('[smoke:agent] booting FreeCAD sidecar…')
  await freecadSidecar.start()

  openCodeAdapter.init('anthropic', 'build')

  let pass = true
  let history: unknown[] = []

  try {
    console.log('\n[step 1] Anthropic build — cube + wall')
    const t1 = await runTurn(
      "Crée un cube de 2 m de côté à l'origine, puis un mur de 3 m de long, 2,5 m de haut et 20 cm d'épaisseur posé contre le cube. Utilise les outils structurés.",
      history,
    )
    history = t1.history
    console.log(`  → tool_calls: ${t1.toolCalls.join(', ') || '(none)'}`)
    console.log(`  → text length: ${t1.text.length}`)
    const usedBox = t1.toolCalls.includes('part_create_box')
    const usedWall = t1.toolCalls.includes('arch_create_wall')
    if (!usedBox || !usedWall) {
      console.error(
        `  ✗ expected part_create_box and arch_create_wall (got ${t1.toolCalls.join(', ') || 'nothing'})`,
      )
      pass = false
    } else {
      console.log('  ✓ structured tools used')
    }

    if (second) {
      console.log(`\n[step 2] switch to ${second} — add a door`)
      openCodeAdapter.setProvider(second)
      const t2 = await runTurn(
        'Ajoute une porte de 90 cm de large par 210 cm de haut, centrée sur le mur précédemment créé.',
        history,
      )
      history = t2.history
      console.log(`  → tool_calls: ${t2.toolCalls.join(', ') || '(none)'}`)
      const usedDoor = t2.toolCalls.includes('arch_create_door')
      if (!usedDoor) {
        console.error(
          `  ✗ expected arch_create_door from ${second} (got ${t2.toolCalls.join(', ') || 'nothing'})`,
        )
        pass = false
      } else {
        console.log('  ✓ door created via second provider, history preserved')
      }
      openCodeAdapter.setProvider('anthropic')
    } else {
      console.log('\n[step 2] no second-provider key (MISTRAL/OPENAI) — skipping switch')
    }

    console.log('\n[step 3] plan mode — pose a question')
    openCodeAdapter.setMode('plan')
    const t3 = await runTurn(
      "Comment ajouterais-tu un étage supplémentaire à cette construction ? Réponds en quelques phrases.",
      history,
    )
    history = t3.history
    console.log(`  → tool_calls: ${t3.toolCalls.join(', ') || '(none)'}`)
    const planMutated = t3.toolCalls.some(
      (t) => !['list_documents', 'get_objects', 'get_object_properties', 'screenshot'].includes(t),
    )
    if (planMutated) {
      console.error(`  ✗ plan mode invoked mutating tools: ${t3.toolCalls.join(', ')}`)
      pass = false
    } else {
      console.log('  ✓ plan mode kept readonly (or text-only)')
    }
    openCodeAdapter.setMode('build')

    console.log('\n[step 4] register mcp-server-fetch over stdio')
    try {
      await mcpManager.upsert({
        name: 'fetch',
        transport: 'stdio',
        command: 'uvx',
        args: ['mcp-server-fetch'],
        enabled: true,
      })
      // Give it a moment to enumerate tools.
      await new Promise((r) => setTimeout(r, 1500))
      const tools = mcpManager.toToolDefinitions()
      console.log(`  → MCP tools exposed: ${tools.map((t) => t.id).join(', ') || '(none)'}`)
      if (tools.length === 0) {
        console.warn('  ⚠ no MCP tools enumerated (uvx / mcp-server-fetch missing?) — soft-fail')
      } else {
        console.log('  ✓ MCP tools available')
      }
    } catch (err) {
      console.warn('  ⚠ MCP server start failed:', err instanceof Error ? err.message : err)
    }
  } finally {
    await Promise.allSettled([freecadSidecar.stop(), mcpManager.stopAll()])
  }

  if (!pass) {
    console.error('\n[smoke:agent] FAILED')
    process.exit(1)
  }
  console.log('\n[smoke:agent] OK')
}

main().catch((err) => {
  console.error('[smoke:agent] uncaught:', err)
  void Promise.allSettled([freecadSidecar.stop(), mcpManager.stopAll()]).then(() => process.exit(1))
})
