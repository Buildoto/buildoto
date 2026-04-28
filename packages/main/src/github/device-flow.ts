import type { DeviceAuthPollState, DeviceAuthStart } from '@buildoto/shared'
import {
  GITHUB_ACCESS_TOKEN_ENDPOINT,
  GITHUB_CLIENT_ID,
  GITHUB_DEVICE_CODE_ENDPOINT,
} from '../lib/constants'
import { setGithubToken } from '../store/settings'
import { getOctokitForToken } from './octokit'

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface TokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: 'authorization_pending' | 'slow_down' | 'expired_token' | 'access_denied' | string
  error_description?: string
  interval?: number
}

interface DeviceFlowState {
  deviceCode: string
  startedAt: number
  expiresAt: number
  interval: number
  lastPollAt: number
}

let active: DeviceFlowState | null = null

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastErr: Error | null = null
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, init)
      return res
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastErr ?? new Error('Échec de la connexion réseau.')
}

export async function startDeviceAuth(): Promise<DeviceAuthStart> {
  if (!GITHUB_CLIENT_ID) {
    throw new Error(
      'ID client GitHub OAuth non configuré (BUILDOTO_GITHUB_CLIENT_ID).',
    )
  }
  const res = await fetchWithRetry(GITHUB_DEVICE_CODE_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: 'repo' }),
  })
  if (!res.ok) throw new Error(`La demande de code GitHub a échoué (${res.status}).`)
  const body = (await res.json()) as DeviceCodeResponse
  const now = Date.now()
  active = {
    deviceCode: body.device_code,
    startedAt: now,
    expiresAt: now + body.expires_in * 1000,
    interval: Math.max(body.interval, 5),
    lastPollAt: 0,
  }
  return {
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    expiresIn: body.expires_in,
    interval: body.interval,
  }
}

export async function pollDeviceAuth(): Promise<DeviceAuthPollState> {
  if (!active) return { state: 'error', message: 'No device flow in progress' }
  if (Date.now() > active.expiresAt) {
    active = null
    return { state: 'expired' }
  }
  if (Date.now() - active.lastPollAt < active.interval * 1000) return { state: 'pending' }
  active.lastPollAt = Date.now()

  const res = await fetch(GITHUB_ACCESS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      device_code: active.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })
  const body = (await res.json()) as TokenResponse

  if (body.error === 'authorization_pending') return { state: 'pending' }
  if (body.error === 'slow_down') {
    active.interval = (body.interval ?? active.interval) + 5
    return { state: 'pending' }
  }
  if (body.error === 'expired_token') {
    active = null
    return { state: 'expired' }
  }
  if (body.error === 'access_denied') {
    active = null
    return { state: 'denied' }
  }
  if (body.error) {
    active = null
    return { state: 'error', message: body.error_description ?? body.error }
  }
  if (body.access_token) {
    await setGithubToken(body.access_token)
    const octokit = getOctokitForToken(body.access_token)
    const { data } = await octokit.rest.users.getAuthenticated()
    active = null
    return { state: 'authorized', login: data.login }
  }
  return { state: 'error', message: 'Unexpected token response' }
}

export function cancelDeviceAuth(): void {
  active = null
}
