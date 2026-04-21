import { memo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cog,
  ExternalLink,
  GitCommit,
  Terminal,
  User,
  Wand2,
} from 'lucide-react'
import type { BuildotoRagSource } from '@buildoto/shared'
import type { ChatMessage } from '@/stores/session-store'
import { useSessionStore } from '@/stores/session-store'
import { cn } from '@/lib/utils'

function tryParse(json: string): string {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>
    if (typeof parsed === 'object' && parsed !== null) {
      if ('stdout' in parsed && typeof parsed.stdout === 'string' && parsed.stdout) return parsed.stdout
      if ('error' in parsed && typeof parsed.error === 'string') return parsed.error
    }
    return JSON.stringify(parsed, null, 2)
  } catch {
    return json
  }
}

export const Message = memo(function Message({ message }: { message: ChatMessage }) {
  switch (message.role) {
    case 'user':
      return (
        <div className="flex gap-3 px-4 py-3">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</div>
        </div>
      )
    case 'assistant':
      return <AssistantMessage message={message} />

    case 'tool_call': {
      const input = message.input as { code?: string }
      return (
        <div className="mx-4 my-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <Cog className="h-3 w-3" />
            <span>Appel outil : {message.name}</span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-foreground/80">
            {input?.code ?? JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )
    }
    case 'tool_result': {
      const cleaned = tryParse(message.output)
      return (
        <div
          className={cn(
            'mx-4 my-2 rounded-md border px-3 py-2 text-xs',
            message.isError ? 'border-destructive/50 bg-destructive/10' : 'border-border bg-background',
          )}
        >
          <div
            className={cn(
              'mb-1 flex items-center gap-2',
              message.isError ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            <Terminal className="h-3 w-3" />
            <span>{message.isError ? 'Erreur FreeCAD' : 'Résultat FreeCAD'}</span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-foreground/80">
            {cleaned}
          </pre>
        </div>
      )
    }
    case 'error':
      return (
        <div className="mx-4 my-2 flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div>{message.text}</div>
        </div>
      )
    case 'commit_created':
      return (
        <div className="mx-4 my-2 flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs">
          <GitCommit className="mt-0.5 h-3.5 w-3.5 text-emerald-500" />
          <div>
            <div className="font-medium">{message.message}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              <code>{message.sha.slice(0, 7)}</code>
              <span className="mx-1">·</span>
              <span className="font-mono">{message.file}</span>
            </div>
          </div>
        </div>
      )
  }
})

function AssistantMessage({
  message,
}: {
  message: Extract<ChatMessage, { role: 'assistant' }>
}) {
  const sources = useSessionStore((s) => s.sourcesByMessageId[message.id])
  return (
    <div className="flex gap-3 bg-muted/30 px-4 py-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Wand2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.text || '…'}
        </div>
        {sources && sources.length > 0 && <SourcesBlock sources={sources} />}
      </div>
    </div>
  )
}

function SourcesBlock({ sources }: { sources: BuildotoRagSource[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 rounded-md border border-border bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <BookOpen className="h-3.5 w-3.5" />
        <span>
          {sources.length} source{sources.length > 1 ? 's' : ''} consultée
          {sources.length > 1 ? 's' : ''}
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {sources.map((src, idx) => (
            <li key={`${src.url ?? 'src'}-${idx}`} className="px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">
                  {src.title}
                </span>
                {src.url && (
                  <button
                    type="button"
                    onClick={() => window.open(src.url!)}
                    className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir
                  </button>
                )}
              </div>
              {src.license && (
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {src.license}
                </div>
              )}
              {src.excerpt && (
                <p className="mt-1 whitespace-pre-wrap text-[11px] text-foreground/80">
                  {src.excerpt}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
