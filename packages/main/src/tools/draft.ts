import { z } from 'zod'
import type { ToolDefinition } from '@buildoto/opencode-core/tool'
import { defineFreecadTool } from './registry'
import { toolInvoke } from '../freecad/client'

const POINT3 = z.tuple([z.number(), z.number(), z.number()])

const lineSchema = z.object({
  start: POINT3,
  end: POINT3,
})

const polygonSchema = z.object({
  vertices: z.array(POINT3).min(3),
  closed: z.boolean().optional(),
})

const dimensionSchema = z.object({
  from: POINT3,
  to: POINT3,
  label: z.string().optional(),
})

export const draftTools: ToolDefinition[] = [
  defineFreecadTool({
    id: 'draft_line',
    description: 'Create a 2D Draft line between two 3D points (millimetres).',
    provenance: 'freecad',
    inputSchema: lineSchema,
    async handler(input) {
      const data = await toolInvoke('draft_line', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'draft_polygon',
    description:
      'Create a Draft polyline / polygon from a list of vertices. Pass closed=true (default) to close the loop.',
    provenance: 'freecad',
    inputSchema: polygonSchema,
    async handler(input) {
      const data = await toolInvoke('draft_polygon', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'draft_dimension',
    description: 'Create a linear Draft dimension between two points with an optional label.',
    provenance: 'freecad',
    inputSchema: dimensionSchema,
    async handler(input) {
      const data = await toolInvoke('draft_dimension', input)
      return JSON.stringify(data)
    },
  }),
]
