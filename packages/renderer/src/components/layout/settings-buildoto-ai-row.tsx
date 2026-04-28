import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BuildotoAuthState, ProviderId, ProvidersStatus } from '@buildoto/shared'
import { PROVIDER_LABELS } from './settings-provider-row'

export function BuildotoAiRow({
  providerId,
  entry,
  isDefault,
  onChange,
  onMakeDefault,
}: {
  providerId: ProviderId
  entry: { isSet: boolean; model: string | null }
  isDefault: boolean
  onChange: (s: ProvidersStatus) => void
  onMakeDefault: () => void
}) {
  const [authState, setAuthState] = useState<BuildotoAuthState>({ kind: 'signed-out' })
  const [modelValue, setModelValue] = useState(entry.model ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => setModelValue(entry.model ?? ''), [entry.model])

  useEffect(() => {
    void window.buildoto.buildotoAuth.getStatus().then(setAuthState)
    return window.buildoto.buildotoAuth.onStatusChanged((s) => {
      setAuthState(s)
      void window.buildoto.settings
        .getProvidersStatus()
        .then(onChange)
    })
  }, [onChange])

  const connect = async () => {
    setBusy(true)
    try {
      await window.buildoto.buildotoAuth.start()
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await window.buildoto.buildotoAuth.signOut()
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    await window.buildoto.buildotoAuth.cancel()
  }

  const saveModel = async () => {
    setBusy(true)
    try {
      const next = await window.buildoto.settings.setProviderModel({
        providerId,
        model: modelValue.trim(),
      })
      onChange(next)
    } finally {
      setBusy(false)
    }
  }

  const signedIn = authState.kind === 'signed-in'
  const statusLine =
    authState.kind === 'signed-in'
      ? `✓ ${authState.email ?? 'connecté'} · plan ${authState.planTier}`
      : authState.kind === 'pending'
        ? '⏳ consentement en cours dans le navigateur…'
        : authState.kind === 'error'
          ? `⚠ ${authState.message}`
          : 'non connecté'

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {PROVIDER_LABELS[providerId]}
            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
              recommandé
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {statusLine}
            {isDefault && ' · défaut'}
          </p>
        </div>
        {!isDefault && entry.isSet && (
          <Button size="sm" variant="ghost" onClick={onMakeDefault} disabled={busy}>
            Définir par défaut
          </Button>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          {signedIn ? (
            <Button size="sm" variant="outline" onClick={() => void disconnect()} disabled={busy}>
              Se déconnecter
            </Button>
          ) : authState.kind === 'pending' ? (
            <Button size="sm" variant="outline" onClick={() => void cancel()}>
              Annuler
            </Button>
          ) : (
            <Button size="sm" onClick={() => void connect()} disabled={busy}>
              Se connecter à Buildoto AI
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="modèle (laisser vide = buildoto-ai-v1)"
            value={modelValue}
            onChange={(e) => setModelValue(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={() => void saveModel()} disabled={busy}>
            Modèle
          </Button>
        </div>
      </div>
    </div>
  )
}
