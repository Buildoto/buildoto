import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'

export function AppearanceTab() {
  const theme = useSettingsStore((s) => s.theme)
  const setThemeLocal = useSettingsStore((s) => s.setTheme)

  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string }> = [
    { value: 'light', label: 'Clair' },
    { value: 'dark', label: 'Sombre' },
    { value: 'system', label: 'Système' },
  ]

  return (
    <div className="flex flex-col gap-3 py-4">
      <div>
        <h3 className="text-sm font-medium">Thème</h3>
        <p className="text-xs text-muted-foreground">
          Choisissez un thème clair, sombre ou suivez le réglage système.
        </p>
      </div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
              theme === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-card',
            )}
          >
            <input
              type="radio"
              name="theme"
              checked={theme === opt.value}
              onChange={async () => {
                await window.buildoto.appSettings.setTheme({ theme: opt.value })
                setThemeLocal(opt.value)
              }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}
