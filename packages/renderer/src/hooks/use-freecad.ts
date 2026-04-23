import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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

export function useFreecadRestart() {
  const [isRestarting, setRestarting] = useState(false)
  const restart = useCallback(async () => {
    if (isRestarting) return
    setRestarting(true)
    const pending = toast.loading('Relance de FreeCAD…')
    try {
      const next = await window.buildoto.freecad.restart()
      if (next.state === 'ready') {
        toast.success('FreeCAD redémarré', { id: pending })
      } else if (next.state === 'error') {
        toast.error(`FreeCAD n'a pas pu démarrer : ${next.message}`, { id: pending })
      } else {
        // `booting` (still loading) — the live status badge will reflect the
        // final state, no need to hold the toast open indefinitely.
        toast.dismiss(pending)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Relance impossible : ${msg}`, { id: pending })
    } finally {
      setRestarting(false)
    }
  }, [isRestarting])
  return { restart, isRestarting }
}
