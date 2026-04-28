import { z } from 'zod'
import type { ToolDefinition } from '@buildoto/opencode-core/tool'
import { defineFreecadTool } from './registry'
import { toolInvoke } from '../freecad/client'

const PLANE = z.enum(['XY', 'XZ', 'YZ']).describe('Sketch plane')
const POINT3 = z
  .tuple([z.number(), z.number(), z.number()])
  .describe('[x, y, z] in millimetres')

const rectangleSchema = z.object({
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  plane: PLANE,
  origin: POINT3.optional(),
})

const circleSchema = z.object({
  radius_mm: z.number().positive(),
  plane: PLANE,
  center: POINT3.optional(),
})

const closeSchema = z.object({
  sketch_id: z.string(),
})

export const sketcherTools: ToolDefinition[] = [
  defineFreecadTool({
    id: 'sketcher_create_rectangle',
    description:
      'Create a closed rectangular sketch on the requested plane (XY, XZ, YZ). Returns sketch object_id usable by part_extrude.',
    provenance: 'freecad',
    inputSchema: rectangleSchema,
    async handler(input) {
      const data = await toolInvoke('sketcher_create_rectangle', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'sketcher_create_circle',
    description:
      'Create a circular sketch on the requested plane. Returns sketch object_id usable by part_extrude.',
    provenance: 'freecad',
    inputSchema: circleSchema,
    async handler(input) {
      const data = await toolInvoke('sketcher_create_circle', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'sketcher_close_sketch',
    description: 'Close a sketch (commit pending edits) so it can be consumed by other tools.',
    provenance: 'freecad',
    inputSchema: closeSchema,
    async handler(input) {
      const data = await toolInvoke('sketcher_close_sketch', input)
      return JSON.stringify(data)
    },
  }),
]
