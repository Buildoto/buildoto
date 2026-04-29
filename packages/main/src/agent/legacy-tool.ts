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
  'Exécute du code Python dans FreeCAD. Un fichier .py est automatiquement créé dans ' +
  'le dossier generations/ du projet. Namespace : App (= FreeCAD), FreeCAD, doc, Part, ' +
  'Draft, Arch, Sketcher, Spreadsheet. doc.recompute() et export 3D automatiques. ' +
  'Unités : millimètres. Retour JSON : { stdout, stderr, duration_ms, object_id }. ' +
  'Utilise cet outil pour TOUTE demande de l\'utilisateur — il est l\'outil principal ' +
  'et universel. Ne passe pas par les outils spécialisés (part_*, arch_*, etc.) car ' +
  'ils ne créent pas de fichier .py visible dans l\'arborescence du projet.'

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
