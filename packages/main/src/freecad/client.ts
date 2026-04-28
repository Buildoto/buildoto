import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { DEFAULT_EXEC_TIMEOUT_MS, type FreecadResponse } from '@buildoto/shared'
import { freecadSidecar } from './sidecar'

let _viewportCb: ((base64: string, bytes: number) => void) | null = null

export function setViewportUpdateCallback(cb: ((base64: string, bytes: number) => void) | null): void {
  _viewportCb = cb
}

export function getViewportUpdateCallback(): ((base64: string, bytes: number) => void) | null {
  return _viewportCb
}

function nextId(): string {
  return randomUUID()
}

function expect<T extends FreecadResponse['type']>(
  res: FreecadResponse,
  type: T,
): Extract<FreecadResponse, { type: T }> {
  if (res.type === 'error') {
    const err = new Error(res.message)
    ;(err as Error & { code?: string; traceback?: string }).code = res.code
    ;(err as Error & { code?: string; traceback?: string }).traceback = res.traceback
    throw err
  }
  if (res.type !== type) throw new Error(`Type de réponse FreeCAD inattendu : attendu ${type}, reçu ${res.type}`)
  return res as Extract<FreecadResponse, { type: T }>
}

export interface ExecResult {
  stdout: string
  stderr: string
  durationMs: number
}

export async function execPython(code: string, timeoutMs = DEFAULT_EXEC_TIMEOUT_MS): Promise<ExecResult> {
  const res = await freecadSidecar.request({ id: nextId(), type: 'exec_python', code, timeout_ms: timeoutMs })
  const ok = expect(res, 'result')
  return { stdout: ok.stdout, stderr: ok.stderr, durationMs: ok.duration_ms }
}

export async function exportGltf(docName?: string): Promise<string> {
  const res = await freecadSidecar.request({ id: nextId(), type: 'export_gltf', doc_name: docName })
  const ok = expect(res, 'gltf')
  return ok.data
}

export async function resetDocument(): Promise<void> {
  const res = await freecadSidecar.request({ id: nextId(), type: 'reset_document' })
  expect(res, 'result')
}

const READONLY_TOOL_IDS = new Set([
  'list_documents',
  'get_objects',
  'get_object_properties',
  'export_gltf',
  'export_ifc',
  'screenshot',
])

export async function toolInvoke<T = unknown>(
  toolId: string,
  payload: unknown,
  timeoutMs = DEFAULT_EXEC_TIMEOUT_MS,
): Promise<T> {
  const res = await freecadSidecar.request(
    { id: nextId(), type: 'tool_invoke', tool_id: toolId, payload },
    timeoutMs,
  )
  const ok = expect(res, 'tool_result')
  // Fire-and-forget viewport refresh after modification tools complete.
  if (_viewportCb && !READONLY_TOOL_IDS.has(toolId)) {
    exportGltf()
      .then((base64) => {
        const bytes = Buffer.byteLength(base64, 'base64')
        _viewportCb!(base64, bytes)
      })
      .catch(() => { /* best-effort — viewport stays stale */ })
  }
  return ok.data as T
}
