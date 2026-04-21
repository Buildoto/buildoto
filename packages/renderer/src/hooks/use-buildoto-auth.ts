import { useEffect, useState } from 'react'
import type { BuildotoAuthState } from '@buildoto/shared'

export function useBuildotoAuth(): BuildotoAuthState {
  const [state, setState] = useState<BuildotoAuthState>({ kind: 'signed-out' })

  useEffect(() => {
    void window.buildoto.buildotoAuth.getStatus().then(setState)
    return window.buildoto.buildotoAuth.onStatusChanged(setState)
  }, [])

  return state
}
