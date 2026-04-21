import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PROVIDER_IDS,
  type BuildotoAuthState,
  type McpServerConfig,
  type McpServerStatus,
  type ProviderId,
  type ProvidersStatus,
} from '@buildoto/shared'
import { useSettingsStore } from '@/stores/settings-store'
import { useBuildotoAuth } from '@/hooks/use-buildoto-auth'
import { useBuildotoUsage } from '@/hooks/use-buildoto-usage'
import {
  BUILDOTO_API_KEYS_URL,
  BUILDOTO_BILLING_URL,
} from '@/lib/constants'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKeySet: boolean
  onStatusChange: (isSet: boolean) => void
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
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

export function SettingsDialog({ open, onOpenChange, onStatusChange }: SettingsDialogProps) {
  const [status, setStatus] = useState<ProvidersStatus | null>(null)
  const [defaultProvider, setDefaultProviderState] = useState<ProviderId>('anthropic')

  useEffect(() => {
    if (!open) return
    void window.buildoto.settings.getProvidersStatus().then((s) => {
      setStatus(s)
      onStatusChange(s.anthropic.isSet)
    })
  }, [open, onStatusChange])

  const refresh = (s: ProvidersStatus) => {
    setStatus(s)
    onStatusChange(s.anthropic.isSet)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Paramètres</DialogTitle>
          <DialogDescription>
            Clés API stockées localement (keytar). Configuration MCP persistée dans electron-store.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="providers">Fournisseurs</TabsTrigger>
            <TabsTrigger value="account">Compte</TabsTrigger>
            <TabsTrigger value="mcp">Serveurs MCP</TabsTrigger>
            <TabsTrigger value="appearance">Apparence</TabsTrigger>
            <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
          </TabsList>

          <TabsContent value="providers">
            <ScrollArea className="h-[400px] pr-3">
              <div className="flex flex-col gap-3">
                {PROVIDER_IDS.map((id) => (
                  <ProviderRow
                    key={id}
                    providerId={id}
                    entry={status?.[id] ?? { isSet: false, model: null }}
                    isDefault={defaultProvider === id}
                    onChange={refresh}
                    onMakeDefault={async () => {
                      const next = await window.buildoto.settings.setDefaultProvider({
                        providerId: id,
                      })
                      setDefaultProviderState(id)
                      refresh(next)
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="account">
            <AccountTab />
          </TabsContent>

          <TabsContent value="mcp">
            <McpPanel />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceTab />
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacyTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ProviderRow(props: {
  providerId: ProviderId
  entry: { isSet: boolean; model: string | null }
  isDefault: boolean
  onChange: (s: ProvidersStatus) => void
  onMakeDefault: () => void
}) {
  if (props.providerId === 'buildoto-ai') return <BuildotoAiRow {...props} />
  return <GenericProviderRow {...props} />
}

function GenericProviderRow({
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

// Buildoto AI uses OAuth-lite (PKCE deep-link); there's no API key to paste.
// Sign-in pushes the user through the portal consent screen; sign-out drops
// the refresh token locally but leaves the server session in place (revoke
// from the portal /settings → Sessions desktop).
function BuildotoAiRow({
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

function AccountTab() {
  const auth = useBuildotoAuth()
  const usage = useBuildotoUsage()
  const [busy, setBusy] = useState(false)

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

  if (auth.kind !== 'signed-in') {
    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium">Buildoto AI</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Connectez-vous pour bénéficier du modèle AEC de Buildoto, avec sources
            vérifiables et quota mensuel inclus.
          </p>
          <div className="mt-3 flex gap-2">
            {auth.kind === 'pending' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void window.buildoto.buildotoAuth.cancel()}
              >
                Annuler la connexion
              </Button>
            ) : (
              <Button size="sm" onClick={() => void connect()} disabled={busy}>
                Se connecter à Buildoto AI
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(BUILDOTO_BILLING_URL)}
            >
              Créer un compte
            </Button>
          </div>
          {auth.kind === 'error' && (
            <p className="mt-2 text-xs text-destructive">{auth.message}</p>
          )}
        </div>
      </div>
    )
  }

  const planLabel =
    auth.planTier.charAt(0).toUpperCase() + auth.planTier.slice(1).toLowerCase()
  const ratio = usage.limit > 0 ? usage.used / usage.limit : 0
  const barColor =
    ratio >= 1
      ? 'bg-destructive'
      : ratio >= 0.8
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium">{auth.email ?? 'Compte Buildoto'}</h3>
            <p className="text-xs text-muted-foreground">Plan {planLabel}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void disconnect()}
            disabled={busy}
          >
            Se déconnecter
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Usage ce mois-ci</h3>
          {usage.known && (
            <span className="font-mono text-xs text-muted-foreground">
              {usage.used.toLocaleString('fr-FR')} /{' '}
              {usage.limit.toLocaleString('fr-FR')} requêtes
            </span>
          )}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${barColor}`}
            style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {usage.known
            ? usage.remaining > 0
              ? `${usage.remaining.toLocaleString('fr-FR')} requêtes restantes avant le renouvellement mensuel.`
              : 'Quota atteint — upgradez pour continuer à générer.'
            : 'Chargement du quota…'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(BUILDOTO_BILLING_URL)}
        >
          Gérer l&apos;abonnement
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(BUILDOTO_API_KEYS_URL)}
        >
          Voir mes clés API
        </Button>
      </div>
    </div>
  )
}

function McpPanel() {
  const [configs, setConfigs] = useState<McpServerConfig[]>([])
  const [statuses, setStatuses] = useState<Record<string, McpServerStatus>>({})
  const [editing, setEditing] = useState<McpServerConfig | null>(null)

  const refresh = async () => {
    const data = await window.buildoto.mcp.listServers()
    setConfigs(data.configs)
    const map: Record<string, McpServerStatus> = {}
    for (const s of data.statuses) map[s.name] = s
    setStatuses(map)
  }

  useEffect(() => {
    void refresh()
    const unsub = window.buildoto.mcp.onStatusChanged((s) => {
      setStatuses((prev) => ({ ...prev, [s.name]: s }))
    })
    return unsub
  }, [])

  const blank = useMemo<McpServerConfig>(
    () => ({ name: '', transport: 'stdio', command: '', args: [], env: {}, enabled: true }),
    [],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Les serveurs MCP exposent leurs outils à l'agent.
        </p>
        <Button size="sm" onClick={() => setEditing(blank)}>
          + Ajouter
        </Button>
      </div>

      <ScrollArea className="h-[340px] pr-3">
        <div className="flex flex-col gap-2">
          {configs.length === 0 && !editing && (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Aucun serveur MCP configuré.
            </p>
          )}
          {configs.map((c) => {
            const status = statuses[c.name]
            return (
              <div key={c.name} className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.transport} · {c.transport === 'stdio' ? c.command : c.url} · {status?.state ?? 'stopped'}
                      {status?.toolCount ? ` · ${status.toolCount} outils` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                      Éditer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await window.buildoto.mcp.restartServer({ name: c.name })
                      }}
                    >
                      Redémarrer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await window.buildoto.mcp.deleteServer({ name: c.name })
                        void refresh()
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
                {status?.error && <p className="mt-1 text-xs text-destructive">{status.error}</p>}
              </div>
            )
          })}
          {editing && (
            <McpEditor
              initial={editing}
              onCancel={() => setEditing(null)}
              onSave={async (config) => {
                await window.buildoto.mcp.upsertServer({ config })
                setEditing(null)
                void refresh()
              }}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function McpEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: McpServerConfig
  onCancel: () => void
  onSave: (c: McpServerConfig) => Promise<void>
}) {
  const [draft, setDraft] = useState<McpServerConfig>(initial)
  const [argsRaw, setArgsRaw] = useState((initial.args ?? []).join(' '))
  const [envRaw, setEnvRaw] = useState(
    Object.entries(initial.env ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  )

  const submit = async () => {
    const env: Record<string, string> = {}
    for (const line of envRaw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    }
    await onSave({
      ...draft,
      args: argsRaw.split(/\s+/).filter(Boolean),
      env,
    })
  }

  return (
    <div className="rounded-md border border-primary p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="nom (unique)"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <select
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          value={draft.transport}
          onChange={(e) => setDraft({ ...draft, transport: e.target.value as 'stdio' | 'sse' })}
        >
          <option value="stdio">stdio</option>
          <option value="sse">sse</option>
        </select>
      </div>
      {draft.transport === 'stdio' ? (
        <div className="mt-2 grid grid-cols-1 gap-2">
          <Input
            placeholder="command (ex: uvx)"
            value={draft.command ?? ''}
            onChange={(e) => setDraft({ ...draft, command: e.target.value })}
          />
          <Input
            placeholder="args (séparés par des espaces)"
            value={argsRaw}
            onChange={(e) => setArgsRaw(e.target.value)}
          />
          <textarea
            className="min-h-[60px] rounded-md border border-input bg-transparent p-2 text-xs font-mono"
            placeholder="VAR=valeur (une par ligne)"
            value={envRaw}
            onChange={(e) => setEnvRaw(e.target.value)}
          />
        </div>
      ) : (
        <div className="mt-2">
          <Input
            placeholder="URL SSE (https://…)"
            value={draft.url ?? ''}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
        </div>
      )}
      <label className="mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
        />
        Activé au démarrage
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" onClick={() => void submit()} disabled={!draft.name.trim()}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}

function AppearanceTab() {
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
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              theme === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}
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

function PrivacyTab() {
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
