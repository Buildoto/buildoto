import { z } from 'zod'
import type { ToolDefinition } from '@buildoto/opencode-core/tool'
import { defineFreecadTool } from './registry'
import { toolInvoke } from '../freecad/client'

const writeSchema = z.object({
  sheet_name: z.string().optional(),
  cells: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .describe('Cell map keyed by reference, e.g. { "A1": "= 2 * B2", "B1": 1500 }'),
})

export const spreadsheetTools: ToolDefinition[] = [
  defineFreecadTool({
    id: 'spreadsheet_write',
    description:
      'Create or update a Spreadsheet sheet (default name "Spreadsheet") with a map of cell references to values or formulas.',
    provenance: 'freecad',
    inputSchema: writeSchema,
    async handler(input) {
      const data = await toolInvoke('spreadsheet_write', input)
      return JSON.stringify(data)
    },
  }),
]
