import { app } from 'electron'
import { getAppSettings } from '../store/settings'

// Sentry is optional: only initialized when SENTRY_DSN is set AT BUILD TIME and
// the user has opted in via settings.crashReportingEnabled. Loaded lazily via
// dynamic import so the dep is absent from the bundle when the DSN is empty.

const DSN = process.env['SENTRY_DSN'] ?? ''

let initialized = false

export async function initSentry(): Promise<void> {
  if (initialized) return
  initialized = true

  if (!DSN) {
    console.log('[sentry] disabled (no DSN)')
    return
  }

  const settings = getAppSettings()
  if (!settings.crashReportingEnabled) {
    console.log('[sentry] disabled (user opt-out)')
    return
  }

  try {
    const Sentry = (await import('@sentry/electron/main')) as unknown as {
      init: (opts: {
        dsn: string
        release: string
        environment: string
        beforeSend: (event: SentryEvent) => SentryEvent | null
      }) => void
    }

    Sentry.init({
      dsn: DSN,
      release: app.getVersion(),
      environment: app.isPackaged ? 'production' : 'development',
      beforeSend(event) {
        return scrubEvent(event)
      },
    })
    console.log('[sentry] initialized')
  } catch (err) {
    console.warn('[sentry] failed to initialize:', err instanceof Error ? err.message : err)
  }
}

interface SentryEvent {
  user?: unknown
  server_name?: string
  request?: { headers?: Record<string, string> }
  breadcrumbs?: Array<{ message?: string }>
  exception?: { values?: Array<{ stacktrace?: { frames?: Array<{ filename?: string }> } }> }
  extra?: Record<string, unknown>
}

function scrubEvent(event: SentryEvent): SentryEvent {
  // Drop anything that could identify the user.
  event.user = undefined
  event.server_name = undefined
  if (event.request?.headers) {
    delete event.request.headers['authorization']
    delete event.request.headers['cookie']
  }
  if (event.breadcrumbs) {
    for (const b of event.breadcrumbs) {
      if (b.message) b.message = scrubPath(b.message)
    }
  }
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      const frames = ex.stacktrace?.frames
      if (frames) {
        for (const f of frames) {
          if (f.filename) f.filename = scrubPath(f.filename)
        }
      }
    }
  }
  return event
}

function scrubPath(s: string): string {
  return s
    .replace(/\/Users\/[^\s/]+/g, '/Users/~')
    .replace(/\/home\/[^\s/]+/g, '/home/~')
    .replace(/C:\\Users\\[^\s\\]+/g, 'C:\\Users\\~')
}
