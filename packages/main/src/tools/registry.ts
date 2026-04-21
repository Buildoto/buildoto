import type { ToolDefinition } from '@buildoto/opencode-core/tool'
import { archTools } from './arch'
import { draftTools } from './draft'
import { introspectTools } from './introspect'
import { partTools } from './part'
import { sketcherTools } from './sketcher'
import { spreadsheetTools } from './spreadsheet'

export const READONLY_TOOL_IDS = [
  'list_documents',
  'get_objects',
  'get_object_properties',
  'screenshot',
] as const

export const STRUCTURED_FREECAD_TOOLS: ToolDefinition[] = [
  ...sketcherTools,
  ...partTools,
  ...draftTools,
  ...archTools,
  ...spreadsheetTools,
  ...introspectTools,
]
