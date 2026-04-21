import { z } from 'zod'
import { defineTool, type ToolDefinition } from '@buildoto/opencode-core/tool'
import { execPython, exportGltf } from '../freecad/client'

export interface LegacyToolContext {
  onViewportUpdate?: (gltfBase64: string, bytes: number) => void
  onGeneration?: (payload: {
    toolCallId: string
    code: string
    stdout: string
    stderr: string
    durationMs: number
  }) => Promise<void>
}

export const EXECUTE_PYTHON_FREECAD_ID = 'execute_python_freecad'

const DESCRIPTION =
  'Execute Python code inside the bundled FreeCAD interpreter. A document named "Buildoto" ' +
  'is auto-created and active. Namespace provides App (= FreeCAD), FreeCAD, doc, Part, Draft, ' +
  'Arch, Sketcher, and Spreadsheet when available. doc.recompute() runs automatically after. ' +
  'Return value JSON: { stdout, stderr, duration_ms, viewport_updated }. Units are millimetres. ' +
  'Prefer the structured workbench tools (sketcher_*, part_*, draft_*, arch_*) when they fit; ' +
  'use this as a fallback for list comprehensions, loops, unusual property access.'

const inputSchema = z.object({
  code: z
    .string()
    .describe('Python source code. Multi-line allowed. Runs at module level — do not wrap in def.'),
})

export function createLegacyFreecadTool(
  ctxRef: { current: LegacyToolContext },
): ToolDefinition<typeof inputSchema, string> {
  return defineTool({
    id: EXECUTE_PYTHON_FREECAD_ID,
    description: DESCRIPTION,
    provenance: 'freecad',
    inputSchema,
    async handler({ code }, opts) {
      const exec = await execPython(code)
      const ctx = ctxRef.current
      if (ctx.onGeneration) {
        try {
          await ctx.onGeneration({
            toolCallId: opts.toolCallId,
            code,
            stdout: exec.stdout,
            stderr: exec.stderr,
            durationMs: exec.durationMs,
          })
        } catch (err) {
          console.warn('[legacy-tool] onGeneration hook failed:', err)
        }
      }
      let viewportUpdated = false
      if (ctx.onViewportUpdate) {
        try {
          const gltfBase64 = await exportGltf()
          const bytes = Math.floor((gltfBase64.length * 3) / 4)
          ctx.onViewportUpdate(gltfBase64, bytes)
          viewportUpdated = true
        } catch (err) {
          console.warn('[legacy-tool] glTF export failed:', err)
        }
      }
      return JSON.stringify({
        stdout: exec.stdout,
        stderr: exec.stderr,
        duration_ms: exec.durationMs,
        viewport_updated: viewportUpdated,
      })
    },
  })
}
