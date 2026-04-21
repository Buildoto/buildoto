// Buildoto AI usage snapshot (sprint 8).
//
// Two input streams:
//   1. `X-Quota-Limit` / `X-Quota-Used` / `X-Quota-Remaining` response headers
//      captured from every `/v1/chat/completions` call. These are the fastest
//      and freshest signal — they reflect the just-incremented counter.
//   2. `GET /v1/usage` polled every 5 min as a fallback, so the status bar has
//      a sane starting value even before the user sends their first prompt
//      (and so stale data is corrected even if the user is idle).
//
// The snapshot is broadcast via an EventEmitter; the IPC handler forwards
// those events to the renderer. Toast thresholds (80 % / 100 %) are computed
// here rather than in the renderer so the state stays consistent even across
// renderer reloads / window reopens.

import { EventEmitter } from 'node:events'
import type { BuildotoUsageSnapshot } from '@buildoto/shared'

import { buildotoAuth } from './buildoto'
import { BUILDOTO_AI_URL } from '../lib/constants'

const POLL_INTERVAL_MS = 5 * 60 * 1000

const EMPTY: BuildotoUsageSnapshot = {
  known: false,
  planTier: 'free',
  limit: 0,
  used: 0,
  remaining: 0,
  updatedAt: null,
}

class BuildotoUsageManager extends EventEmitter {
  private snapshot: BuildotoUsageSnapshot = EMPTY
  private pollTimer: NodeJS.Timeout | null = null

  start(): void {
    if (this.pollTimer) return
    // React to auth transitions so we refresh (or reset) on sign-in/out.
    buildotoAuth.onStateChanged((state) => {
      if (state.kind === 'signed-in') {
        void this.refreshFromServer()
        this.snapshot = { ...this.snapshot, planTier: state.planTier }
      } else if (state.kind === 'signed-out') {
        this.set(EMPTY)
      }
    })
    this.pollTimer = setInterval(() => {
      if (buildotoAuth.getStatus().kind === 'signed-in') {
        void this.refreshFromServer()
      }
    }, POLL_INTERVAL_MS)
    // Initial pull if the user is already signed in at startup.
    if (buildotoAuth.getStatus().kind === 'signed-in') {
      void this.refreshFromServer()
    }
  }

  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = null
  }

  get(): BuildotoUsageSnapshot {
    return this.snapshot
  }

  onUpdated(listener: (snapshot: BuildotoUsageSnapshot) => void): () => void {
    this.on('updated', listener)
    return () => this.off('updated', listener)
  }

  // Called by the buildoto-ai provider hook whenever it observes a set of
  // X-Quota-* headers on a response. Individual headers may be absent (for
  // error responses) — in that case we leave the snapshot unchanged.
  applyQuotaHeaders(headers: Headers): void {
    const limit = readIntHeader(headers, 'x-quota-limit')
    const used = readIntHeader(headers, 'x-quota-used')
    const remaining = readIntHeader(headers, 'x-quota-remaining')
    if (limit === null || used === null) return
    this.set({
      known: true,
      planTier: this.snapshot.planTier,
      limit,
      used,
      remaining: remaining ?? Math.max(0, limit - used),
      updatedAt: new Date().toISOString(),
    })
  }

  private async refreshFromServer(): Promise<void> {
    try {
      const jwt = await buildotoAuth.getAccessToken()
      const res = await fetch(`${BUILDOTO_AI_URL}/v1/usage`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${jwt}` },
      })
      if (!res.ok) return
      const body = (await res.json()) as {
        plan_tier: string
        limit: number
        used: number
        remaining: number
      }
      this.set({
        known: true,
        planTier: body.plan_tier,
        limit: body.limit,
        used: body.used,
        remaining: body.remaining,
        updatedAt: new Date().toISOString(),
      })
    } catch {
      // Silent fail — we'll pick up the next header tick or poll cycle.
    }
  }

  private set(next: BuildotoUsageSnapshot): void {
    this.snapshot = next
    this.emit('updated', next)
  }
}

function readIntHeader(headers: Headers, key: string): number | null {
  const raw = headers.get(key)
  if (raw == null) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export const buildotoUsage = new BuildotoUsageManager()
