import { z } from 'zod'
import { defineTool, type ToolDefinition } from '@buildoto/opencode-core/tool'
import { toolInvoke } from '../freecad/client'

const POINT3 = z
  .tuple([z.number(), z.number(), z.number()])
  .describe('[x, y, z] in millimetres')

const boxSchema = z.object({
  length_mm: z.number().positive(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  position: POINT3.optional(),
  name: z.string().optional(),
})

const cylinderSchema = z.object({
  radius_mm: z.number().positive(),
  height_mm: z.number().positive(),
  position: POINT3.optional(),
  axis: z.enum(['X', 'Y', 'Z']).optional().describe('Cylinder axis (default Z)'),
  name: z.string().optional(),
})

const booleanSchema = z.object({
  operation: z.enum(['union', 'cut', 'common']),
  a_id: z.string().describe('Base object id'),
  b_id: z.string().describe('Tool object id'),
  name: z.string().optional(),
})

const extrudeSchema = z.object({
  sketch_id: z.string(),
  depth_mm: z.number().positive(),
  direction: z
    .union([z.literal('normal'), POINT3])
    .optional()
    .describe('"normal" extrudes along the sketch normal, otherwise a custom vector'),
})

export const partTools: ToolDefinition[] = [
  defineTool({
    id: 'part_create_box',
    description:
      'Create a parametric Part::Box (length × width × height in mm). Optional position and name.',
    provenance: 'freecad',
    inputSchema: boxSchema,
    async handler(input) {
      const data = await toolInvoke('part_create_box', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'part_create_cylinder',
    description:
      'Create a parametric Part::Cylinder (radius, height in mm). Axis defaults to Z.',
    provenance: 'freecad',
    inputSchema: cylinderSchema,
    async handler(input) {
      const data = await toolInvoke('part_create_cylinder', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'part_boolean',
    description:
      'Boolean operation between two existing solids. operation: union | cut | common.',
    provenance: 'freecad',
    inputSchema: booleanSchema,
    async handler(input) {
      const data = await toolInvoke('part_boolean', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'part_extrude',
    description:
      'Extrude a sketch into a solid. Direction "normal" follows the sketch normal; otherwise pass a 3D vector.',
    provenance: 'freecad',
    inputSchema: extrudeSchema,
    async handler(input) {
      const data = await toolInvoke('part_extrude', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
]
