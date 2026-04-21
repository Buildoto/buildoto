import { z } from 'zod'
import { defineTool, type ToolDefinition } from '@buildoto/opencode-core/tool'
import { toolInvoke } from '../freecad/client'

const emptySchema = z.object({}).describe('No parameters')

const docOnly = z.object({
  document_id: z.string().optional(),
})

const objectProps = z.object({
  object_id: z.string(),
  document_id: z.string().optional(),
})

const exportIfcSchema = z.object({
  document_id: z.string().optional(),
  path: z.string().optional().describe('Optional absolute path to write the IFC file'),
})

const screenshotSchema = z.object({
  document_id: z.string().optional(),
  view: z.enum(['iso', 'front', 'top', 'right']).optional(),
  width_px: z.number().int().positive().optional(),
  height_px: z.number().int().positive().optional(),
})

export const introspectTools: ToolDefinition[] = [
  defineTool({
    id: 'list_documents',
    description: 'List all open FreeCAD documents (id, label, object count).',
    provenance: 'freecad',
    inputSchema: emptySchema,
    async handler(input) {
      const data = await toolInvoke('list_documents', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'get_objects',
    description:
      'List the objects in a document (defaults to the active one). Returns id, label, type, visibility.',
    provenance: 'freecad',
    inputSchema: docOnly,
    async handler(input) {
      const data = await toolInvoke('get_objects', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'get_object_properties',
    description: 'Inspect every property of a single object by id.',
    provenance: 'freecad',
    inputSchema: objectProps,
    async handler(input) {
      const data = await toolInvoke('get_object_properties', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'export_gltf',
    description:
      'Export the active (or named) document to glTF binary. Returns base64; same path the viewport uses.',
    provenance: 'freecad',
    inputSchema: docOnly,
    async handler(input) {
      const data = await toolInvoke('export_gltf', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'export_ifc',
    description:
      'Export the document to IFC for BIM exchange. Optional absolute file path; otherwise a temp path is returned.',
    provenance: 'freecad',
    inputSchema: exportIfcSchema,
    async handler(input) {
      const data = await toolInvoke('export_ifc', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
  defineTool({
    id: 'screenshot',
    description:
      'Capture a viewport screenshot. Requires GUI build of FreeCAD; not supported by freecadcmd in sprint 3.',
    provenance: 'freecad',
    inputSchema: screenshotSchema,
    async handler(input) {
      const data = await toolInvoke('screenshot', input)
      return JSON.stringify(data)
    },
  }) as unknown as ToolDefinition,
]
