import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settings-store'

interface StepWelcomeProps {
  onContinue: () => void
}

export function StepWelcome({ onContinue }: StepWelcomeProps) {
  const setTelemetryConsent = useSettingsStore((s) => s.setTelemetryConsent)
  const setCrashReporting = useSettingsStore((s) => s.setCrashReporting)
  const initialConsent = useSettingsStore((s) => s.telemetryConsent)
  const initialCrash = useSettingsStore((s) => s.crashReportingEnabled)

  const [telemetry, setTelemetry] = useState(initialConsent === 'granted')
  const [crash, setCrash] = useState(initialCrash)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await window.buildoto.appSettings.setTelemetryConsent({
        consent: telemetry ? 'granted' : 'denied',
      })
      setTelemetryConsent(telemetry ? 'granted' : 'denied')
      await window.buildoto.appSettings.setCrashReporting({ enabled: crash })
      setCrashReporting(crash)
      onContinue()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Étape 1/5 — Bienvenue</h2>
        <p className="text-sm text-muted-foreground">
          Buildoto est un IDE pour la construction : un agent IA, FreeCAD comme moteur 3D,
          et Git pour versionner vos projets. Tout tourne en local sur votre machine.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium">Améliorer Buildoto (optionnel)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Ces options sont désactivées par défaut. Aucune donnée personnelle, aucun contenu
          de projet, aucune clé API ne sont transmis. Vous pouvez changer ces choix à tout
          moment dans les réglages.
        </p>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={telemetry}
            onChange={(e) => setTelemetry(e.target.checked)}
          />
          <span>
            <span className="font-medium">Télémétrie anonyme</span>
            <span className="block text-xs text-muted-foreground">
              Événements d&apos;usage agrégés (étapes d&apos;onboarding, tours d&apos;agent,
              plateforme). Identifiant anonyme, pas de contenu.
            </span>
          </span>
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={crash}
            onChange={(e) => setCrash(e.target.checked)}
          />
          <span>
            <span className="font-medium">Rapports d&apos;incident</span>
            <span className="block text-xs text-muted-foreground">
              Envoie les traces de crash (sans chemins locaux ni clés) pour nous aider à
              corriger les bugs rapidement.
            </span>
          </span>
        </label>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void submit()} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Commencer'}
        </Button>
      </div>
    </div>
  )
}
