import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeviceAuthPollState, DeviceAuthStart, GithubAuthStatus } from '@buildoto/shared'

export interface GithubDeviceFlowState {
  phase: 'idle' | 'waiting' | 'pending' | 'authorized' | 'expired' | 'denied' | 'error'
  start: DeviceAuthStart | null
  login: string | null
  error: string | null
}

export function useGithubAuth() {
  const [status, setStatus] = useState<GithubAuthStatus>({ isAuthed: false })
  const [flow, setFlow] = useState<GithubDeviceFlowState>({
    phase: 'idle',
    start: null,
    login: null,
    error: null,
  })
  const pollTimer = useRef<number | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    window.buildoto.github.getAuthStatus().then((s) => {
      if (mounted.current) setStatus(s)
    })
    return () => {
      mounted.current = false
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])

  const startFlow = useCallback(async () => {
    setFlow({ phase: 'waiting', start: null, login: null, error: null })
    try {
      const start = await window.buildoto.github.startDeviceAuth()
      setFlow({ phase: 'pending', start, login: null, error: null })
      schedulePoll(start.interval)
    } catch (err) {
      setFlow({
        phase: 'error',
        start: null,
        login: null,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }, [])

  function schedulePoll(intervalSec: number) {
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = window.setTimeout(async () => {
      try {
        const result: DeviceAuthPollState = await window.buildoto.github.pollDeviceAuth()
        if (!mounted.current) return
        if (result.state === 'pending') {
          schedulePoll(intervalSec)
          return
        }
        if (result.state === 'authorized') {
          setFlow((f) => ({ ...f, phase: 'authorized', login: result.login, error: null }))
          setStatus({ isAuthed: true, login: result.login })
          return
        }
        if (result.state === 'expired') {
          setFlow((f) => ({ ...f, phase: 'expired' }))
          return
        }
        if (result.state === 'denied') {
          setFlow((f) => ({ ...f, phase: 'denied' }))
          return
        }
        setFlow((f) => ({ ...f, phase: 'error', error: result.message }))
      } catch (err) {
        if (mounted.current)
          setFlow((f) => ({
            ...f,
            phase: 'error',
            error: err instanceof Error ? err.message : String(err),
          }))
      }
    }, Math.max(intervalSec, 5) * 1000)
  }

  const cancel = useCallback(async () => {
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = null
    await window.buildoto.github.cancelDeviceAuth()
    setFlow({ phase: 'idle', start: null, login: null, error: null })
  }, [])

  const signOut = useCallback(async () => {
    await window.buildoto.github.signOut()
    setStatus({ isAuthed: false })
    setFlow({ phase: 'idle', start: null, login: null, error: null })
  }, [])

  return { status, flow, startFlow, cancel, signOut }
}
