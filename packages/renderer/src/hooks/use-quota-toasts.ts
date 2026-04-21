import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { BuildotoUsageSnapshot } from '@buildoto/shared'
import { BUILDOTO_BILLING_URL } from '@/lib/constants'

// Two thresholds, each fires at most once per calendar month. We persist the
// last-fired month in localStorage so reopening the window doesn't re-trigger.
// Keys are scoped with a schema prefix to avoid collisions with future stores.
const KEY_80 = 'buildoto:quota-toast-80'
const KEY_100 = 'buildoto:quota-toast-100'

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function shouldFire(storageKey: string): boolean {
  const current = currentMonthKey()
  const last = localStorage.getItem(storageKey)
  if (last === current) return false
  localStorage.setItem(storageKey, current)
  return true
}

export function useQuotaToasts(usage: BuildotoUsageSnapshot): void {
  // Deduplicate within the same session even across renders that don't change
  // the snapshot — the localStorage guard covers cross-reload cases, this
  // covers multiple re-renders in the same tick.
  const firedThisSession = useRef<{ p80: boolean; p100: boolean }>({
    p80: false,
    p100: false,
  })

  useEffect(() => {
    if (!usage.known || usage.limit <= 0) return
    const ratio = usage.used / usage.limit

    if (ratio >= 1 && !firedThisSession.current.p100) {
      if (shouldFire(KEY_100)) {
        firedThisSession.current.p100 = true
        toast.error('Quota Buildoto AI atteint', {
          description: `${usage.used.toLocaleString('fr-FR')} / ${usage.limit.toLocaleString('fr-FR')} ce mois-ci. Passez en Pro pour continuer à générer.`,
          duration: 10_000,
          action: {
            label: 'Upgrader',
            onClick: () => window.open(BUILDOTO_BILLING_URL),
          },
        })
      }
      return
    }

    if (ratio >= 0.8 && !firedThisSession.current.p80) {
      if (shouldFire(KEY_80)) {
        firedThisSession.current.p80 = true
        toast.warning('80 % de ton quota consommé', {
          description: `${usage.used.toLocaleString('fr-FR')} / ${usage.limit.toLocaleString('fr-FR')} ce mois-ci.`,
          duration: 8_000,
        })
      }
    }
  }, [usage])
}
