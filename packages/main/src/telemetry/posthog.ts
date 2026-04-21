import { getAppSettings, getTelemetryAnonymousId } from '../store/settings'

// PostHog is optional: only loaded when POSTHOG_KEY is present at build time.
// Consent is re-checked on every capture so a live opt-out halts the stream
// without needing a restart.

interface PostHogLike {
  capture: (payload: {
    distinctId: string
    event: string
    properties?: Record<string, unknown>
  }) => void
  shutdown: (timeoutMs?: number) => Promise<void>
}

const POSTHOG_KEY = process.env['POSTHOG_KEY'] ?? ''
const POSTHOG_HOST = process.env['POSTHOG_HOST'] ?? 'https://eu.i.posthog.com'

let client: PostHogLike | null = null
let initialized = false

async function ensureClient(): Promise<PostHogLike | null> {
  if (initialized) return client
  initialized = true
  if (!POSTHOG_KEY) {
    console.log('[posthog] disabled (no key)')
    return null
  }
  try {
    const mod = (await import('posthog-node')) as unknown as {
      PostHog: new (key: string, opts: { host: string; flushAt?: number; flushInterval?: number }) => PostHogLike
    }
    client = new mod.PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10_000,
    })
    return client
  } catch (err) {
    console.warn('[posthog] failed to initialize:', err instanceof Error ? err.message : err)
    return null
  }
}

function scrub(properties: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!properties) return properties
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(properties)) {
    if (typeof v === 'string') out[k] = scrubString(v)
    else out[k] = v
  }
  return out
}

function scrubString(s: string): string {
  // Strip absolute paths + common credential prefixes.
  return s
    .replace(/\/Users\/[^\s/]+/g, '/Users/~')
    .replace(/\/home\/[^\s/]+/g, '/home/~')
    .replace(/C:\\Users\\[^\s\\]+/g, 'C:\\Users\\~')
    .replace(/sk-[A-Za-z0-9-_]{10,}/g, 'sk-***')
    .replace(/ghp_[A-Za-z0-9]{10,}/g, 'ghp_***')
    .replace(/Bearer\s+[A-Za-z0-9._-]{10,}/gi, 'Bearer ***')
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  const settings = getAppSettings()
  if (settings.telemetryConsent !== 'granted') return
  void ensureClient().then((c) => {
    if (!c) return
    try {
      c.capture({
        distinctId: getTelemetryAnonymousId(),
        event,
        properties: scrub(properties),
      })
    } catch (err) {
      console.warn('[posthog] capture failed:', err instanceof Error ? err.message : err)
    }
  })
}

export async function shutdownTelemetry(): Promise<void> {
  if (!client) return
  try {
    await client.shutdown(2000)
  } catch {
    // swallow
  }
}
