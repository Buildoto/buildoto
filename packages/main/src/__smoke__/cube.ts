#!/usr/bin/env tsx
// Sprint 1 smoke test — runs the agent with a hardcoded prompt against a real
// FreeCAD sidecar and asserts a non-empty glTF comes back. Requires
// ANTHROPIC_API_KEY in the environment.
//
// Usage: pnpm smoke

import type { AgentEvent } from '@buildoto/shared'
import { freecadSidecar } from '../freecad/sidecar'
import { openCodeAdapter } from '../agent/opencode-adapter'
import { setApiKey } from '../store/settings'

const PROMPT = "Crée un cube de 2 mètres à l'origine dans le document Buildoto."

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[smoke] ANTHROPIC_API_KEY not set')
    process.exit(2)
  }

  await setApiKey('anthropic', apiKey)

  console.log('[smoke] starting FreeCAD sidecar…')
  const status = await freecadSidecar.start()
  console.log('[smoke] sidecar ready:', status)

  openCodeAdapter.init('anthropic', 'build')

  let gltfBytes = 0
  let toolCalls = 0
  let assistantText = ''

  try {
    const result = await openCodeAdapter.runTurn({
      userMessage: PROMPT,
      history: [],
      onViewportUpdate: (_gltf, bytes) => {
        gltfBytes = Math.max(gltfBytes, bytes)
        console.log(`[smoke] viewport_update: ${bytes} bytes of glTF`)
      },
      onEvent: (event: AgentEvent) => {
        if (event.type === 'assistant_text') {
          assistantText += event.text
          process.stdout.write(event.text)
        } else if (event.type === 'tool_call') {
          toolCalls += 1
          const input = event.input as { code?: string }
          console.log(`\n[smoke] tool_call #${toolCalls}: ${event.name}`)
          if (input.code) console.log(`  code: ${input.code.slice(0, 200).replace(/\n/g, ' ↵ ')}`)
        } else if (event.type === 'tool_result') {
          console.log(`[smoke] tool_result (isError=${event.isError}): ${event.output.slice(0, 200)}`)
        } else if (event.type === 'error') {
          console.error('[smoke] agent error:', event.message)
        }
      },
    })
    console.log(`\n[smoke] stop_reason: ${result.stopReason}`)
  } finally {
    await freecadSidecar.stop()
  }

  const ok = toolCalls > 0 && gltfBytes > 0 && assistantText.trim().length > 0
  if (!ok) {
    console.error(
      `[smoke] FAILED — toolCalls=${toolCalls}, gltfBytes=${gltfBytes}, assistantText=${assistantText.length} chars`,
    )
    process.exit(1)
  }
  console.log(`[smoke] OK — ${toolCalls} tool call(s), ${gltfBytes} bytes glTF, assistant replied.`)
}

main().catch((err) => {
  console.error('[smoke] uncaught:', err)
  void freecadSidecar.stop().catch(() => undefined)
  process.exit(1)
})
