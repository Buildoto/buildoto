#!/usr/bin/env tsx
// Headless reproduction of a buildoto-ai agent turn — bypasses the Electron
// app entirely so we can iterate on stream-level bugs without the UI.
//
// Bypasses:
//   - portal OAuth  (inject JWT via `getKey`)
//   - buildSystemPrompt  (inline a trivial prompt to dodge Vite `?raw`)
//   - FreeCAD sidecar   (tools are declared but nothing executes them at this
//                        layer; the stream-error repro doesn't need exec)
//
// Usage:
//   BUILDOTO_AI_JWT=<eyJ…>  BUILDOTO_AI_PROMPT="maison sur 2 étages" \
//   pnpm tsx packages/main/src/__smoke__/buildoto-ai-turn.ts

import { inspect } from 'node:util'
import {
  runAgentTurn,
  type AgentEvent as VendorAgentEvent,
} from '@buildoto/opencode-core/agent'
import {
  createProviderRegistry,
} from '@buildoto/opencode-core/provider'
import {
  createToolRegistry,
  type ToolDefinition,
} from '@buildoto/opencode-core/tool'
import { STRUCTURED_FREECAD_TOOLS } from '../tools/registry'

const JWT_RAW = process.env.BUILDOTO_AI_JWT
if (!JWT_RAW) {
  console.error('BUILDOTO_AI_JWT env var is required')
  process.exit(2)
}
const JWT: string = JWT_RAW

const PROMPT = process.env.BUILDOTO_AI_PROMPT ?? 'maison sur 2 étages'
const BUILDOTO_AI_URL =
  process.env.BUILDOTO_AI_URL ?? 'https://api.buildoto.com'

const SYSTEM_PROMPT = `Tu es Buildoto. Tu réponds en français. Tu peux appeler les outils
disponibles pour créer de la géométrie FreeCAD. Si l'utilisateur ne demande
pas explicitement une création, réponds simplement par du texte.`

async function main() {
  const providers = createProviderRegistry({
    getKey: async (providerId) => (providerId === 'buildoto-ai' ? JWT : null),
    buildotoAiBaseUrl: `${BUILDOTO_AI_URL}/v1`,
  })

  const tools = createToolRegistry()
  tools.registerMany(STRUCTURED_FREECAD_TOOLS as unknown as ToolDefinition[])

  const events: VendorAgentEvent[] = []
  let tokens = ''

  console.log(`[harness] prompt=${JSON.stringify(PROMPT)}`)
  console.log(`[harness] tool count=${tools.list().length}`)

  try {
    const result = await runAgentTurn({
      agentConfig: {
        name: 'buildoto',
        preset: 'build',
        description: '',
        systemPrompt: SYSTEM_PROMPT,
        allowedTools: 'all',
      },
      providerId: 'buildoto-ai',
      modelId: 'buildoto-ai-v1',
      providers,
      tools,
      history: [],
      userMessage: PROMPT,
      onEvent: (event) => {
        events.push(event)
        if (event.type === 'token_delta') {
          tokens += typeof event.delta === 'string' ? event.delta : ''
          return // don't spam the terminal with every token
        }
        console.log(
          `[event] ${event.type} ${inspect(event, { depth: 6, colors: false })}`,
        )
      },
    })

    console.log('\n---summary---')
    console.log('finishReason:', result.finishReason)
    console.log('event types:', events.map((e) => e.type).join(', '))
    console.log(
      'first 400 chars of tokens:',
      JSON.stringify(tokens.slice(0, 400)),
    )
    console.log('result.text length:', result.text.length)
  } catch (err) {
    console.error('[harness] runAgentTurn threw:')
    console.error(inspect(err, { depth: 8, colors: false, getters: true }))
    process.exit(1)
  }
}

main()
