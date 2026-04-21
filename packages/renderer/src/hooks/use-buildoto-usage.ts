import { useEffect, useState } from 'react'
import type { BuildotoUsageSnapshot } from '@buildoto/shared'

const EMPTY: BuildotoUsageSnapshot = {
  known: false,
  planTier: 'free',
  limit: 0,
  used: 0,
  remaining: 0,
  updatedAt: null,
}

export function useBuildotoUsage(): BuildotoUsageSnapshot {
  const [snapshot, setSnapshot] = useState<BuildotoUsageSnapshot>(EMPTY)

  useEffect(() => {
    void window.buildoto.buildotoUsage.get().then(setSnapshot)
    return window.buildoto.buildotoUsage.onUpdated(setSnapshot)
  }, [])

  return snapshot
}
