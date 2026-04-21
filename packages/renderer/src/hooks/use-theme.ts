import { useCallback, useEffect } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import { applyThemeClass, subscribeSystemTheme, type ThemePreference } from '@/lib/theme'

export function useTheme() {
  const pref = useSettingsStore((s) => s.theme)
  const setPref = useSettingsStore((s) => s.setTheme)

  useEffect(() => {
    applyThemeClass(pref)
  }, [pref])

  useEffect(() => {
    if (pref !== 'system') return
    return subscribeSystemTheme(() => applyThemeClass('system'))
  }, [pref])

  const update = useCallback(
    async (next: ThemePreference) => {
      await window.buildoto.appSettings.setTheme({ theme: next })
      setPref(next)
    },
    [setPref],
  )

  return { theme: pref, setTheme: update }
}
