import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProviderId, ProvidersStatus } from '@buildoto/shared'

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  'buildoto-ai': 'Buildoto AI',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  mistral: 'Mistral',
  google: 'Google (Gemini)',
  ollama: 'Ollama (local)',
  openrouter: 'OpenRouter',
}

const PROVIDER_PLACEHOLDERS: Record<ProviderId, string> = {
  'buildoto-ai': '',
  anthropic: 'sk-ant-…',
  openai: 'sk-…',
  mistral: 'mst-…',
  google: 'AIza…',
  ollama: 'Aucune clé requise — laisser vide',
  openrouter: 'sk-or-…',
}

export function GenericProviderRow({
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
  const [keyValue, setKeyValue] = useState('')
  const [modelValue, setModelValue] = useState(entry.model ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setModelValue(entry.model ?? '')
  }, [entry.model])

  const save = async () => {
    if (!keyValue.trim() && providerId !== 'ollama') {
      setError('Clé vide.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await window.buildoto.settings.setProviderKey({
        providerId,
        apiKey: keyValue,
      })
      setKeyValue('')
      onChange(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      const next = await window.buildoto.settings.clearProviderKey({ providerId })
      onChange(next)
    } finally {
      setBusy(false)
    }
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

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{PROVIDER_LABELS[providerId]}</p>
          <p className="text-xs text-muted-foreground">
            {entry.isSet ? '✓ clé configurée' : 'aucune clé'}
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
          <Input
            type="password"
            placeholder={PROVIDER_PLACEHOLDERS[providerId]}
            value={keyValue}
            onChange={(e) => {
              setKeyValue(e.target.value)
              setError(null)
            }}
          />
          <Button size="sm" onClick={() => void save()} disabled={busy}>
            Enregistrer
          </Button>
          {entry.isSet && (
            <Button size="sm" variant="outline" onClick={() => void clear()} disabled={busy}>
              Supprimer
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="modèle (laisser vide = défaut)"
            value={modelValue}
            onChange={(e) => setModelValue(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={() => void saveModel()} disabled={busy}>
            Modèle
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
