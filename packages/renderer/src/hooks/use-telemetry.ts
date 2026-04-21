import { useCallback } from 'react'
import { useSettingsStore } from '@/stores/settings-store'

export function useTelemetry() {
  const consent = useSettingsStore((s) => s.telemetryConsent)

  const capture = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      if (consent !== 'granted') return
      void window.buildoto.telemetry.capture({ event, properties }).catch(() => {
        // swallow — telemetry must never break UI
      })
    },
    [consent],
  )

  return { capture, consent }
}
