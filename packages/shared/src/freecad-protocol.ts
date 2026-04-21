// FreeCAD sidecar WebSocket protocol.
// Every request carries an `id`. Every response has the matching `id`, except the
// boot-ready frame which uses `_boot`.

export type FreecadRequest =
  | { id: string; type: 'ping' }
  | { id: string; type: 'exec_python'; code: string; timeout_ms?: number }
  | { id: string; type: 'export_gltf'; doc_name?: string }
  | { id: string; type: 'tool_invoke'; tool_id: string; payload: unknown }
  | { id: string; type: 'reset_document' }
  | { id: string; type: 'shutdown' }

export type FreecadResponse =
  | { id: '_boot'; type: 'ready'; version: string; python_version: string }
  | { id: string; type: 'pong' }
  | { id: string; type: 'result'; stdout: string; stderr: string; duration_ms: number }
  | { id: string; type: 'gltf'; data: string; bytes: number; mime: 'model/gltf-binary' }
  | { id: string; type: 'tool_result'; data: unknown }
  | { id: string; type: 'error'; message: string; traceback?: string; code: FreecadErrorCode }

export type FreecadErrorCode =
  | 'PYTHON_EXCEPTION'
  | 'EXPORT_FAILED'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'DOCUMENT_NOT_FOUND'
  | 'OBJECT_NOT_FOUND'
  | 'TOOL_NOT_FOUND'
  | 'TOOL_NOT_IMPLEMENTED'
  | 'SIDECAR_CRASHED'
  | 'NOT_READY'

export type FreecadSidecarStatus =
  | { state: 'booting' }
  | { state: 'ready'; version: string; pythonVersion: string }
  | { state: 'error'; message: string }
  | { state: 'stopped' }

export const DEFAULT_EXEC_TIMEOUT_MS = 30_000
export const DEFAULT_BOOT_TIMEOUT_MS = 15_000
