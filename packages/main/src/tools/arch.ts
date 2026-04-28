import { z } from 'zod'
import type { ToolDefinition } from '@buildoto/opencode-core/tool'
import { defineFreecadTool } from './registry'
import { toolInvoke } from '../freecad/client'

const POINT3 = z.tuple([z.number(), z.number(), z.number()])

const wallSchema = z.object({
  length_mm: z.number().positive(),
  height_mm: z.number().positive(),
  thickness_mm: z.number().positive(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  position: POINT3.optional(),
})

const floorSchema = z.object({
  polygon: z.array(POINT3).min(3),
  thickness_mm: z.number().positive(),
})

const windowSchema = z.object({
  host_wall_id: z.string(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  sill_height_mm: z.number().nonnegative(),
  offset_along_wall_mm: z.number(),
})

const doorSchema = z.object({
  host_wall_id: z.string(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  offset_along_wall_mm: z.number(),
})

const roofSchema = z.object({
  base_object_id: z.string(),
  angle_deg: z.number(),
  thickness_mm: z.number().positive(),
})

export const archTools: ToolDefinition[] = [
  defineFreecadTool({
    id: 'arch_create_wall',
    description:
      'Create a parametric BIM wall (length, height, thickness in mm). Alignment: left | center | right (centerline relative to base line).',
    provenance: 'freecad',
    inputSchema: wallSchema,
    async handler(input) {
      const data = await toolInvoke('arch_create_wall', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'arch_create_floor',
    description:
      'Create a BIM floor / slab from a closed polygon footprint and a thickness in mm.',
    provenance: 'freecad',
    inputSchema: floorSchema,
    async handler(input) {
      const data = await toolInvoke('arch_create_floor', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'arch_create_window',
    description:
      'Cut a window into a host wall. Offsets are in millimetres along and up the wall.',
    provenance: 'freecad',
    inputSchema: windowSchema,
    async handler(input) {
      const data = await toolInvoke('arch_create_window', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'arch_create_door',
    description:
      'Cut a door into a host wall. Offset is along the wall in millimetres; door sits at the wall base.',
    provenance: 'freecad',
    inputSchema: doorSchema,
    async handler(input) {
      const data = await toolInvoke('arch_create_door', input)
      return JSON.stringify(data)
    },
  }),
  defineFreecadTool({
    id: 'arch_create_roof',
    description:
      'Create a BIM roof from a base wire / face object id, with slope angle (degrees) and thickness (mm).',
    provenance: 'freecad',
    inputSchema: roofSchema,
    async handler(input) {
      const data = await toolInvoke('arch_create_roof', input)
      return JSON.stringify(data)
    },
  }),
]
