import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import { applyThemeClass, subscribeSystemTheme } from '@/lib/theme'

export function useSettingsBootstrap() {
  const setAll = useSettingsStore((s) => s.setAll)
  const setMetadata = useSettingsStore((s) => s.setMetadata)
  const setBootstrapped = useSettingsStore((s) => s.setBootstrapped)
  const pref = useSettingsStore((s) => s.theme)
  const bootstrapped = useSettingsStore((s) => s.bootstrapped)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      window.buildoto.appSettings.get(),
      window.buildoto.app.getMetadata(),
    ])
      .then(([settings, metadata]) => {
        if (cancelled) return
        setAll(settings)
        setMetadata(metadata)
      })
      .finally(() => {
        if (!cancelled) setBootstrapped(true)
      })
    return () => {
      cancelled = true
    }
  }, [setAll, setMetadata, setBootstrapped])

  useEffect(() => {
    if (!bootstrapped) return
    applyThemeClass(pref)
  }, [pref, bootstrapped])

  useEffect(() => {
    if (!bootstrapped || pref !== 'system') return
    return subscribeSystemTheme(() => applyThemeClass('system'))
  }, [pref, bootstrapped])
}
