// Session message conversion — port of
// packages/opencode/src/session/message-v2.ts @ v1.14.19. We treat the AI
// SDK's `CoreMessage` as the canonical, provider-agnostic shape (Buildoto
// SessionFileV2 stores `history: CoreMessage[]`). This module owns the
// Anthropic-SDK-shape → CoreMessage converter used by the v1→v2 migrator.
//
// Anthropic v1 history (sprint-1 sessions) is `MessageParam[]` from the
// `@anthropic-ai/sdk`: `{ role: 'user' | 'assistant', content: string |
// Array<TextBlock | ToolUseBlock | ToolResultBlock> }`. Mapping rules:
//
//   v1 user (string)                  → CoreUserMessage(string)
//   v1 user (text-only blocks)        → CoreUserMessage(TextPart[])
//   v1 user (containing tool_results) → CoreToolMessage(ToolResultPart[]),
//                                       optionally preceded by CoreUserMessage
//   v1 assistant (string)             → CoreAssistantMessage(string)
//   v1 assistant (text + tool_use)    → CoreAssistantMessage([TextPart |
//                                       ToolCallPart][])

import type { CoreMessage } from 'ai'

export type { CoreMessage }

// --- v1 source shapes (subset of @anthropic-ai/sdk MessageParam) -----------
// We type these structurally to avoid pulling the Anthropic SDK as a vendor
// dependency. Buildoto's main process passes its real `MessageParam[]` in.

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

interface AnthropicToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | Array<{ type: 'text'; text: string }>
  is_error?: boolean
}

type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock

export interface AnthropicMessageParam {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

function flattenToolResultContent(
  content: AnthropicToolResultBlock['content'],
): string {
  if (typeof content === 'string') return content
  return content.map((b) => b.text).join('')
}

export function anthropicToCoreMessages(
  history: readonly AnthropicMessageParam[],
): CoreMessage[] {
  const out: CoreMessage[] = []

  for (const msg of history) {
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        out.push({ role: 'user', content: msg.content })
        continue
      }

      // Split tool_result blocks (which become a CoreToolMessage) from any
      // accompanying text blocks (which become a CoreUserMessage).
      const toolResults = msg.content.filter(
        (b): b is AnthropicToolResultBlock => b.type === 'tool_result',
      )
      const textBlocks = msg.content.filter(
        (b): b is AnthropicTextBlock => b.type === 'text',
      )

      if (textBlocks.length > 0) {
        out.push({
          role: 'user',
          content: textBlocks.map((b) => ({ type: 'text', text: b.text })),
        })
      }

      if (toolResults.length > 0) {
        out.push({
          role: 'tool',
          content: toolResults.map((b) => ({
            type: 'tool-result',
            toolCallId: b.tool_use_id,
            // v1 sessions don't preserve the tool name on results; the AI
            // SDK requires a string here. Empty is acceptable for replay
            // purposes — the model already saw the original name in the
            // assistant turn.
            toolName: '',
            result: flattenToolResultContent(b.content),
            isError: b.is_error ?? false,
          })),
        })
      }
      continue
    }

    // role: 'assistant'
    if (typeof msg.content === 'string') {
      out.push({ role: 'assistant', content: msg.content })
      continue
    }

    const parts = msg.content
      .map((b) => {
        if (b.type === 'text') return { type: 'text' as const, text: b.text }
        if (b.type === 'tool_use') {
          return {
            type: 'tool-call' as const,
            toolCallId: b.id,
            toolName: b.name,
            args: b.input,
          }
        }
        return null
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    if (parts.length > 0) {
      out.push({ role: 'assistant', content: parts })
    }
  }

  return out
}
