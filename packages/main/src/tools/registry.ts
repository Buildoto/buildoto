import type { ToolDefinition } from '@buildoto/opencode-core/tool'
import { defineTool as vendorDefineTool } from '@buildoto/opencode-core/tool'
import type { z } from 'zod'
import { archTools } from './arch'
import { draftTools } from './draft'
import { introspectTools } from './introspect'
import { partTools } from './part'
import { sketcherTools } from './sketcher'
import { spreadsheetTools } from './spreadsheet'

// Wraps the vendored defineTool() to avoid repeating `as unknown as ToolDefinition`
// in every tool file. The vendored generic returns a narrower type that
// TypeScript can't widen to ToolDefinition[] automatically.
export function defineFreecadTool<TSchema extends z.ZodTypeAny, TResult>(
  def: ToolDefinition<TSchema, TResult>,
): ToolDefinition {
  return vendorDefineTool(def) as unknown as ToolDefinition
}

export const STRUCTURED_FREECAD_TOOLS: ToolDefinition[] = [
  ...sketcherTools,
  ...partTools,
  ...draftTools,
  ...archTools,
  ...spreadsheetTools,
  ...introspectTools,
]
