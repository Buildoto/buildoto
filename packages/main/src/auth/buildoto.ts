// Buildoto AI OAuth-lite client (sprint 8).
//
// Flow:
//   1. startAuth() generates PKCE + state, opens the portal consent screen in
//      the user's default browser, and returns a promise that resolves once the
//      deep-link callback (buildoto://auth?code=…&state=…) arrives.
//   2. handleDeepLink() is called by the electron protocol handler wiring in
//      `packages/main/src/index.ts`. It validates state, exchanges the code for
//      `{refresh_token, access_token}` via POST /desktop/token, and stores the
//      refresh token in keytar (never on disk).
//   3. getAccessToken() returns a valid short-lived JWT. It refreshes against
//      /desktop/token/refresh when the cached JWT is within 30 s of expiry.
//   4. signOut() revokes the session server-side (best-effort) and clears the
//      local refresh token.
//
// Status changes are broadcast via `onStateChanged` so the IPC handler can
// forward them to the renderer — that drives the Compte tab + status bar pill.

import { randomBytes, createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { hostname, platform } from 'node:os'
import { shell } from 'electron'
import keytar from 'keytar'
import type { BuildotoAuthState } from '@buildoto/shared'

import {
  BUILDOTO_DEEP_LINK_SCHEME,
  BUILDOTO_PORTAL_API_URL,
  BUILDOTO_PORTAL_URL,
  KEYTAR_ACCOUNT_BUILDOTO_REFRESH,
  KEYTAR_SERVICE,
} from '../lib/constants'

interface PendingAuth {
  state: string
  codeVerifier: string
  startedAt: number
  resolve: (value: BuildotoAuthState) => void
  reject: (reason: Error) => void
  timer: NodeJS.Timeout
}

interface AccessTokenCache {
  jwt: string
  // Seconds since epoch. We refresh when now() > expSec - 30.
  expSec: number
  planTier: string
  userId: string
}

interface SessionInfo {
  sessionId: string
  email: string | null
  planTier: string
}

const AUTH_TIMEOUT_MS = 2 * 60 * 1000
// Access JWT TTL is 300 s. We refresh eagerly at 90 s left so long streaming
// turns (tool loops can exceed 30–60 s) never send a JWT that expires in
// flight. 30 s was too tight and caused "invalid or expired access token"
// after ~4 min turns.
const REFRESH_SKEW_SEC = 90
const REDIRECT_URI = `${BUILDOTO_DEEP_LINK_SCHEME}://auth`

class BuildotoAuthManager extends EventEmitter {
  private pending: PendingAuth | null = null
  private accessCache: AccessTokenCache | null = null
  private session: SessionInfo | null = null
  private currentState: BuildotoAuthState = { kind: 'signed-out' }
  private inflightRefresh: Promise<string> | null = null

  constructor() {
    super()
    // Warm the cache so `getAuthStatus()` at startup knows whether a refresh
    // token exists without forcing the renderer to block on a network round
    // trip first.
    this.setState({ kind: 'signed-out' })
  }

  async initialStatus(): Promise<BuildotoAuthState> {
    const existing = await this.readRefreshToken()
    if (!existing) {
      this.setState({ kind: 'signed-out' })
      return this.currentState
    }
    // We have a refresh token on disk but no session metadata yet — force a
    // refresh so we can decode plan_tier + user_id before telling the UI we're
    // "signed in" with a stale label.
    try {
      await this.refreshAccessToken()
      if (this.session) {
        this.setState({
          kind: 'signed-in',
          email: this.session.email,
          planTier: this.session.planTier,
          sessionId: this.session.sessionId,
        })
      }
    } catch {
      // Refresh failed (revoked, expired). Clear local secret and report out.
      await this.clearRefreshToken()
      this.setState({ kind: 'signed-out' })
    }
    return this.currentState
  }

  getStatus(): BuildotoAuthState {
    return this.currentState
  }

  onStateChanged(listener: (state: BuildotoAuthState) => void): () => void {
    this.on('state', listener)
    return () => this.off('state', listener)
  }

  async startAuth(): Promise<BuildotoAuthState> {
    if (this.pending) this.cancelPending(new Error('Replaced by new auth attempt'))

    const codeVerifier = base64url(randomBytes(32))
    const codeChallenge = base64url(
      createHash('sha256').update(codeVerifier).digest(),
    )
    const state = base64url(randomBytes(16))
    const deviceHint = `${hostname()} (${platform()})`

    const url = new URL(`${BUILDOTO_PORTAL_URL}/authorize`)
    url.searchParams.set('app', 'desktop')
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', codeChallenge)
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    url.searchParams.set('device_hint', deviceHint)

    const promise = new Promise<BuildotoAuthState>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.cancelPending(new Error('Authentication timed out'))
      }, AUTH_TIMEOUT_MS)
      this.pending = {
        state,
        codeVerifier,
        startedAt: Date.now(),
        resolve,
        reject,
        timer,
      }
    })

    this.setState({ kind: 'pending', startedAt: Date.now() })
    void shell.openExternal(url.toString())
    return promise
  }

  cancel(): void {
    this.cancelPending(new Error('Authentication cancelled'))
  }

  async signOut(): Promise<void> {
    // Server-side revocation is driven from the portal (/settings → Sessions
    // desktop). Here we simply drop the refresh token locally — the session
    // stays valid in the database until the user revokes it or the 90-day
    // expiry kicks in.
    await this.clearRefreshToken()
    this.accessCache = null
    this.session = null
    this.setState({ kind: 'signed-out' })
  }

  async getAccessToken(): Promise<string> {
    const cached = this.accessCache
    const nowSec = Math.floor(Date.now() / 1000)
    if (cached && cached.expSec > nowSec + REFRESH_SKEW_SEC) {
      return cached.jwt
    }
    return this.refreshAccessToken()
  }

  // Called by the provider layer when buildoto-ai returns 401. Drops the
  // cached JWT so the next getAccessToken() mints a new one via refresh.
  // Idempotent — safe to call multiple times on the same turn.
  invalidateAccessToken(): void {
    this.accessCache = null
  }

  // Called by the electron protocol handler wiring (open-url on macOS,
  // second-instance on Win/Linux) with the raw `buildoto://auth?…` URL.
  async handleDeepLink(rawUrl: string): Promise<void> {
    if (!this.pending) return
    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      return
    }
    if (`${parsed.protocol}//${parsed.hostname}` !== REDIRECT_URI) return

    const state = parsed.searchParams.get('state')
    if (state !== this.pending.state) {
      this.cancelPending(new Error('State mismatch — ignoring callback'))
      return
    }
    const err = parsed.searchParams.get('error')
    if (err) {
      this.cancelPending(
        new Error(err === 'access_denied' ? 'Access denied' : err),
      )
      return
    }
    const code = parsed.searchParams.get('code')
    if (!code) {
      this.cancelPending(new Error('Missing authorization code'))
      return
    }

    const pending = this.pending
    this.pending = null
    clearTimeout(pending.timer)

    try {
      const tokens = await this.exchangeCode(code, pending.codeVerifier)
      await this.persistRefreshToken(tokens.refreshToken)
      this.applyAccessToken(tokens.accessToken)
      const nextState: BuildotoAuthState = this.session
        ? {
            kind: 'signed-in',
            email: this.session.email,
            planTier: this.session.planTier,
            sessionId: this.session.sessionId,
          }
        : { kind: 'error', message: 'Token exchange returned no session' }
      this.setState(nextState)
      pending.resolve(nextState)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.setState({ kind: 'error', message })
      pending.reject(e instanceof Error ? e : new Error(message))
    }
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.inflightRefresh) return this.inflightRefresh
    this.inflightRefresh = (async () => {
      try {
        const refresh = await this.readRefreshToken()
        if (!refresh) throw new Error('Not signed in to Buildoto AI')
        const res = await fetch(`${BUILDOTO_PORTAL_API_URL}/desktop/token/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        })
        if (!res.ok) {
          if (res.status === 401) {
            await this.clearRefreshToken()
            this.accessCache = null
            this.session = null
            this.setState({ kind: 'signed-out' })
          }
          throw new Error(`Refresh failed (${res.status})`)
        }
        const body = (await res.json()) as {
          access_token: string
          refresh_token?: string
          expires_in: number
        }
        if (body.refresh_token) await this.persistRefreshToken(body.refresh_token)
        this.applyAccessToken(body.access_token)
        return body.access_token
      } finally {
        this.inflightRefresh = null
      }
    })()
    return this.inflightRefresh
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await fetch(`${BUILDOTO_PORTAL_API_URL}/desktop/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Token exchange failed (${res.status}): ${text}`)
    }
    const body = (await res.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    return { accessToken: body.access_token, refreshToken: body.refresh_token }
  }

  private applyAccessToken(jwt: string): void {
    const claims = decodeJwtClaims(jwt)
    if (!claims) throw new Error('Invalid access token')
    const expSec = typeof claims.exp === 'number' ? claims.exp : 0
    const userId = typeof claims.sub === 'string' ? claims.sub : ''
    const planTier =
      typeof claims.plan_tier === 'string' ? claims.plan_tier : 'free'
    const sessionId =
      typeof claims.sid === 'string' ? claims.sid : this.session?.sessionId ?? ''
    const email =
      typeof claims.email === 'string' ? claims.email : this.session?.email ?? null
    this.accessCache = { jwt, expSec, planTier, userId }
    this.session = { sessionId, email, planTier }
  }

  private cancelPending(reason: Error): void {
    if (!this.pending) return
    clearTimeout(this.pending.timer)
    const { reject } = this.pending
    this.pending = null
    reject(reason)
    this.setState({ kind: 'error', message: reason.message })
  }

  private setState(state: BuildotoAuthState): void {
    this.currentState = state
    this.emit('state', state)
  }

  private async readRefreshToken(): Promise<string | null> {
    return keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_BUILDOTO_REFRESH)
  }

  private async persistRefreshToken(token: string): Promise<void> {
    await keytar.setPassword(
      KEYTAR_SERVICE,
      KEYTAR_ACCOUNT_BUILDOTO_REFRESH,
      token,
    )
  }

  private async clearRefreshToken(): Promise<void> {
    try {
      await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_BUILDOTO_REFRESH)
    } catch {
      // keytar throws if the entry doesn't exist on some platforms — ignore.
    }
  }
}

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function decodeJwtClaims(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split('.')
  if (parts.length !== 3) return null
  const [, payload] = parts as [string, string, string]
  try {
    const decoded = Buffer.from(
      payload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8')
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

export const buildotoAuth = new BuildotoAuthManager()
