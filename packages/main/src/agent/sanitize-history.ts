// Repair any conversation history where an assistant message contains
// `tool-call` parts that are not followed by matching `tool-result` parts.
//
// Why this exists: OpenAI-compatible chat-completions APIs (Mistral, the
// buildoto-ai backend) reject any follow-up turn whose history has
// unterminated tool calls — the wire format demands every assistant tool
// call be paired with a tool-role result carrying the same toolCallId.
// If a previous turn crashed mid-stream (FreeCAD sidecar died, network
// cut, process killed) the persisted session file ends up in that
// invalid shape and every further turn fails with an opaque stream error.
//
// This guard scans the history on every turn and injects synthetic
// `isError: true` tool-result parts for any orphan tool calls so the
// conversation is always well-formed before it hits the provider.

import type { CoreMessage, ToolCallPart, ToolResultPart } from 'ai'

const SYNTHETIC_RESULT_TEXT =
  'Tool call was not completed (previous turn interrupted).'

export interface SanitizeHistoryReport {
  injected: number
  orphanToolCallIds: string[]
}

export function sanitizeHistory(
  history: CoreMessage[],
  report?: SanitizeHistoryReport,
): CoreMessage[] {
  const out: CoreMessage[] = []
  for (let i = 0; i < history.length; i++) {
    const msg = history[i]
    if (!msg) continue
    if (msg.role !== 'assistant' || typeof msg.content === 'string') {
      out.push(msg)
      continue
    }
    const toolCalls = msg.content.filter(
      (p): p is ToolCallPart =>
        (p as { type?: string }).type === 'tool-call',
    )
    if (toolCalls.length === 0) {
      out.push(msg)
      continue
    }

    out.push(msg)

    const next: CoreMessage | undefined = history[i + 1]
    const existingResults: ToolResultPart[] =
      next?.role === 'tool' && Array.isArray(next.content)
        ? next.content
        : []
    const covered = new Set(existingResults.map((p) => p.toolCallId))
    const missing = toolCalls.filter((tc) => !covered.has(tc.toolCallId))

    if (missing.length === 0) continue

    if (report) {
      report.injected += missing.length
      for (const tc of missing) report.orphanToolCallIds.push(tc.toolCallId)
    }

    const syntheticParts: ToolResultPart[] = missing.map((tc) => ({
      type: 'tool-result',
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      result: SYNTHETIC_RESULT_TEXT,
      isError: true,
    }))

    if (next?.role === 'tool' && Array.isArray(next.content)) {
      // Merge into the existing tool message and skip its default push
      // on the next iteration.
      out.push({ ...next, content: [...next.content, ...syntheticParts] })
      i++
    } else {
      // No tool message follows — synthesize one.
      out.push({ role: 'tool', content: syntheticParts })
    }
  }
  return out
}
