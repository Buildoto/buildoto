import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settings-store'

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void | Promise<void>
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => void onChange(e.target.checked)}
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

export function PrivacyTab() {
  const telemetryConsent = useSettingsStore((s) => s.telemetryConsent)
  const crashReportingEnabled = useSettingsStore((s) => s.crashReportingEnabled)
  const autoUpdateEnabled = useSettingsStore((s) => s.autoUpdateEnabled)
  const setTelemetryConsent = useSettingsStore((s) => s.setTelemetryConsent)
  const setCrashReporting = useSettingsStore((s) => s.setCrashReporting)
  const setAutoUpdate = useSettingsStore((s) => s.setAutoUpdate)

  return (
    <div className="flex flex-col gap-4 py-4">
      <Toggle
        label="Télémétrie anonyme"
        description="Événements d'usage agrégés, identifiant anonyme, aucun contenu de projet."
        checked={telemetryConsent === 'granted'}
        onChange={async (checked) => {
          const next = checked ? 'granted' : 'denied'
          await window.buildoto.appSettings.setTelemetryConsent({ consent: next })
          setTelemetryConsent(next)
        }}
      />
      <Toggle
        label="Rapports d'incident"
        description="Envoie les traces de crash (chemins et clés scrubés) pour corriger les bugs."
        checked={crashReportingEnabled}
        onChange={async (checked) => {
          await window.buildoto.appSettings.setCrashReporting({ enabled: checked })
          setCrashReporting(checked)
        }}
      />
      <Toggle
        label="Mises à jour automatiques"
        description="Télécharge et installe les nouvelles versions alpha."
        checked={autoUpdateEnabled}
        onChange={async (checked) => {
          await window.buildoto.appSettings.setAutoUpdate({ enabled: checked })
          setAutoUpdate(checked)
        }}
      />
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-sm font-medium">Identifiant anonyme</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Un UUID local, régénéré à la demande. Jamais lié à votre compte GitHub ou votre email.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={async () => {
            await window.buildoto.appSettings.resetAnonymousId()
          }}
        >
          Réinitialiser l&apos;ID
        </Button>
      </div>
    </div>
  )
}
