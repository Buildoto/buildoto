import { useCallback, useEffect, useState } from 'react'
import { History, Plus, Trash2 } from 'lucide-react'
import type { SessionSummary } from '@buildoto/shared'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useSessionStore } from '@/stores/session-store'
import { cn } from '@/lib/utils'

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return `il y a ${days} j`
}

export function SessionsToolbar() {
  const activeId = useSessionStore((s) => s.sessionId)
  const [open, setOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.buildoto.session.list()
      setSessions(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  const onNew = useCallback(async () => {
    setBusy(true)
    try {
      await window.buildoto.session.new()
    } finally {
      setBusy(false)
    }
  }, [])

  const onPick = useCallback(async (sessionId: string) => {
    setBusy(true)
    try {
      await window.buildoto.session.setActive({ sessionId })
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-card/40 px-3 py-2">
      <Button size="sm" variant="ghost" onClick={() => void onNew()} disabled={busy}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Nouveau
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" disabled={busy}>
            <History className="mr-1 h-3.5 w-3.5" />
            Historique
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conversations</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">Chargement…</div>
            )}
            {!loading && sessions.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Aucune conversation pour l'instant.
              </div>
            )}
            {sessions.map((s) => (
              <div
                key={s.sessionId}
                className={cn(
                  'flex items-center gap-1 rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-muted/40',
                  s.sessionId === activeId && 'border-primary/40 bg-primary/5',
                )}
              >
                <button
                  type="button"
                  onClick={() => void onPick(s.sessionId)}
                  disabled={busy}
                  className="min-w-0 flex-1 text-left text-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{s.title || 'Sans titre'}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(s.updatedAt)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.messageCount} message{s.messageCount > 1 ? 's' : ''}
                  </div>
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer cette conversation"
                  onClick={async () => {
                    await window.buildoto.session.delete({ sessionId: s.sessionId })
                    void refresh()
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
