#!/usr/bin/env tsx
// Ad-hoc unit test for sanitizeHistory — no vitest configured in packages/main,
// so we run it manually via `pnpm tsx`.

import { sanitizeHistory } from '../agent/sanitize-history'
import type { CoreMessage } from 'ai'

let failures = 0
function expect(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ok  ${label}`)
  } else {
    failures++
    console.error(`  FAIL ${label}`, extra ?? '')
  }
}

// Case 1: empty history is a noop.
{
  const out = sanitizeHistory([])
  expect('empty → empty', out.length === 0)
}

// Case 2: well-formed history is a passthrough.
{
  const input: CoreMessage[] = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
  ]
  const report = { injected: 0, orphanToolCallIds: [] as string[] }
  const out = sanitizeHistory(input, report)
  expect('well-formed: length unchanged', out.length === 2)
  expect('well-formed: nothing injected', report.injected === 0)
}

// Case 3: assistant with a paired tool-call+tool-result → passthrough.
{
  const input: CoreMessage[] = [
    { role: 'user', content: 'do X' },
    {
      role: 'assistant',
      content: [
        { type: 'tool-call', toolCallId: 'c1', toolName: 'x', args: {} },
      ],
    },
    {
      role: 'tool',
      content: [
        { type: 'tool-result', toolCallId: 'c1', toolName: 'x', result: 'ok' },
      ],
    },
  ]
  const report = { injected: 0, orphanToolCallIds: [] as string[] }
  const out = sanitizeHistory(input, report)
  expect('paired: length unchanged', out.length === 3)
  expect('paired: nothing injected', report.injected === 0)
}

// Case 4: assistant with an orphan tool-call at end of history.
{
  const input: CoreMessage[] = [
    { role: 'user', content: 'do X' },
    {
      role: 'assistant',
      content: [
        { type: 'tool-call', toolCallId: 'c1', toolName: 'x', args: {} },
      ],
    },
  ]
  const report = { injected: 0, orphanToolCallIds: [] as string[] }
  const out = sanitizeHistory(input, report)
  expect('orphan-at-end: synthetic tool msg added', out.length === 3)
  expect('orphan-at-end: 1 injection', report.injected === 1)
  const last = out[2] as { role: string; content: unknown[] }
  expect('orphan-at-end: role=tool', last.role === 'tool')
  const parts = last.content as Array<{ toolCallId: string; isError: boolean }>
  expect('orphan-at-end: toolCallId preserved', parts[0]?.toolCallId === 'c1')
  expect('orphan-at-end: isError=true', parts[0]?.isError === true)
}

// Case 5: assistant with 10 tool-calls, NO tool message follows (the exact
// case reproduced by the session.json corruption).
{
  const calls = Array.from({ length: 10 }, (_, i) => ({
    type: 'tool-call' as const,
    toolCallId: `c${i}`,
    toolName: 'arch_create_floor',
    args: {},
  }))
  const input: CoreMessage[] = [
    { role: 'user', content: 'maison' },
    { role: 'assistant', content: calls },
    // Bug shape: next message is an assistant text response directly, not a
    // tool message. This is what Mistral chokes on.
    { role: 'assistant', content: 'voici une maison…' },
  ]
  const report = { injected: 0, orphanToolCallIds: [] as string[] }
  const out = sanitizeHistory(input, report)
  expect('10-orphans: 10 injections', report.injected === 10)
  expect('10-orphans: length grew by 1', out.length === input.length + 1)
  const injected = out[2] as { role: string; content: unknown[] }
  expect('10-orphans: injected is a tool msg', injected.role === 'tool')
  expect(
    '10-orphans: covers all ids',
    (injected.content as Array<{ toolCallId: string }>).length === 10 &&
      (injected.content as Array<{ toolCallId: string }>).every((p, i) =>
        p.toolCallId === `c${i}`,
      ),
  )
}

// Case 6: partial tool message — some results present, others missing.
{
  const input: CoreMessage[] = [
    {
      role: 'assistant',
      content: [
        { type: 'tool-call', toolCallId: 'c1', toolName: 'x', args: {} },
        { type: 'tool-call', toolCallId: 'c2', toolName: 'x', args: {} },
        { type: 'tool-call', toolCallId: 'c3', toolName: 'x', args: {} },
      ],
    },
    {
      role: 'tool',
      content: [
        { type: 'tool-result', toolCallId: 'c1', toolName: 'x', result: 'a' },
      ],
    },
  ]
  const report = { injected: 0, orphanToolCallIds: [] as string[] }
  const out = sanitizeHistory(input, report)
  expect('partial: 2 injections', report.injected === 2)
  expect('partial: length unchanged (merged into existing tool msg)', out.length === 2)
  const toolMsg = out[1] as { role: string; content: Array<{ toolCallId: string }> }
  expect('partial: tool msg now has 3 results', toolMsg.content.length === 3)
  expect(
    'partial: all ids present',
    new Set(toolMsg.content.map((p) => p.toolCallId)).size === 3,
  )
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`)
  process.exit(1)
}
console.log('\nall tests passed')
