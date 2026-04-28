import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { McpServerConfig, McpServerStatus } from '@buildoto/shared'

export function McpPanel() {
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
