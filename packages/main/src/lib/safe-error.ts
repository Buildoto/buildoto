// Centralised coercion of arbitrary error values into a human-readable string.
// Exists because `String(obj)` yields the infamous "[object Object]" when the
// thrown value is a bare object (as happens on some AI-SDK stream errors and
// fetch/Response rejections), which then renders into the chat transcript and
// tells the user nothing.
//
// Priority order:
//   1. Error instance → use `.message` (fall back to JSON of own props).
//   2. Plain string → pass through.
//   3. Object with a string `message` field → use that.
//   4. Any other object → JSON.stringify with own-property enumeration so
//      non-enumerable props like `cause` on native errors show up.
//   5. Fallback → provided default ("erreur inconnue").
export function safeErrorMessage(
  err: unknown,
  fallback = 'erreur inconnue',
): string {
  if (err instanceof Error) {
    if (err.message) return err.message
    try {
      const j = JSON.stringify(err, Object.getOwnPropertyNames(err))
      return j && j !== '{}' ? j : fallback
    } catch {
      return fallback
    }
  }
  if (typeof err === 'string') return err.length > 0 ? err : fallback
  if (err && typeof err === 'object') {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.length > 0) return msg
    try {
      const j = JSON.stringify(err, Object.getOwnPropertyNames(err as object))
      return j && j !== '{}' ? j : fallback
    } catch {
      return fallback
    }
  }
  const s = String(err)
  return s && s !== '[object Object]' ? s : fallback
}
