// RAG source extraction for Buildoto AI responses (sprint 8).
//
// Two wire formats per the buildoto-ai spec:
//   • Non-streaming → `X-Buildoto-Sources: base64(JSON)` on the response.
//   • Streaming SSE → `event: sources\ndata: [...]` block before `[DONE]`.
//
// We consume a *cloned* response produced by the provider-level fetch tap, so
// our readers never interfere with the AI SDK's own stream consumption of the
// primary body.

import type { BuildotoRagSource } from '@buildoto/shared'

export function parseSourcesHeader(
  headers: Headers,
): BuildotoRagSource[] | null {
  const raw = headers.get('x-buildoto-sources')
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded) as unknown
    return normalizeSources(parsed)
  } catch {
    return null
  }
}

export function isEventStream(headers: Headers): boolean {
  const ct = headers.get('content-type')
  return ct != null && ct.includes('text/event-stream')
}

// Reads the cloned SSE body and returns the `sources` event payload if one is
// emitted before `[DONE]`. Returns null if the stream ends without one. Errors
// are swallowed — sources are best-effort, never fatal for the turn.
export async function readSourcesFromSse(
  body: ReadableStream<Uint8Array>,
): Promise<BuildotoRagSource[] | null> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const found = extractFromBuffer(buffer)
      if (found.sources) return found.sources
      buffer = found.remainder
    }
  } catch {
    // Stream errored — no sources to report.
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // no-op
    }
  }
  return null
}

function extractFromBuffer(buffer: string): {
  sources: BuildotoRagSource[] | null
  remainder: string
} {
  let remainder = buffer
  let sep = remainder.indexOf('\n\n')
  while (sep >= 0) {
    const block = remainder.slice(0, sep)
    remainder = remainder.slice(sep + 2)
    const sources = parseSseBlock(block)
    if (sources) return { sources, remainder }
    sep = remainder.indexOf('\n\n')
  }
  return { sources: null, remainder }
}

function parseSseBlock(block: string): BuildotoRagSource[] | null {
  let eventName: string | null = null
  const dataLines: string[] = []
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }
  if (eventName !== 'sources' || dataLines.length === 0) return null
  try {
    const parsed = JSON.parse(dataLines.join('\n')) as unknown
    return normalizeSources(parsed)
  } catch {
    return null
  }
}

function normalizeSources(raw: unknown): BuildotoRagSource[] | null {
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null && 'sources' in raw
      ? (raw as { sources: unknown }).sources
      : null
  if (!Array.isArray(arr)) return null
  const out: BuildotoRagSource[] = []
  for (const entry of arr) {
    if (typeof entry !== 'object' || entry === null) continue
    const o = entry as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title : null
    if (!title) continue
    out.push({
      title: title.slice(0, 120),
      url: typeof o.url === 'string' ? o.url : null,
      license: typeof o.license === 'string' ? o.license : null,
      excerpt:
        typeof o.excerpt === 'string'
          ? o.excerpt.slice(0, 400)
          : '',
    })
    if (out.length >= 10) break
  }
  return out
}
