import { useEffect } from 'react'
import { useSessionStore } from '@/stores/session-store'

export function useFreecadStatus() {
  const { freecadStatus, setFreecadStatus } = useSessionStore()

  useEffect(() => {
    void window.buildoto.freecad.getStatus().then(setFreecadStatus)
    const unsubscribe = window.buildoto.freecad.onStatusChange(setFreecadStatus)
    return unsubscribe
  }, [setFreecadStatus])

  return freecadStatus
}
