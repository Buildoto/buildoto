import { useState, type KeyboardEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/stores/session-store'
import { useAgentStateBootstrap, useSendMessage, useToggleMode } from '@/hooks/use-agent'
import { cn } from '@/lib/utils'

export function InputBox({ apiKeySet }: { apiKeySet: boolean }) {
  const [value, setValue] = useState('')
  const isRunning = useSessionStore((s) => s.isRunning)
  const mode = useSessionStore((s) => s.mode)
  const providerId = useSessionStore((s) => s.providerId)
  const send = useSendMessage()
  const toggleMode = useToggleMode()

  useAgentStateBootstrap()

  const disabled = !apiKeySet || isRunning

  const submit = async () => {
    if (disabled || !value.trim()) return
    const text = value
    setValue('')
    await send(text)
  }

  const flipMode = () => {
    void toggleMode(mode === 'build' ? 'plan' : 'build')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      flipMode()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-background p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => void toggleMode('build')}
            className={cn(
              'px-2 py-1 text-xs',
              mode === 'build'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            Build
          </button>
          <button
            type="button"
            onClick={() => void toggleMode('plan')}
            className={cn(
              'px-2 py-1 text-xs',
              mode === 'plan'
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            Plan
          </button>
        </div>
        <span>
          {providerId} · Tab pour changer de mode
        </span>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={
            apiKeySet
              ? mode === 'plan'
                ? 'Mode Plan : pose une question, l\'agent ne modifiera rien.'
                : 'Décris ce que tu veux construire…'
              : 'Configure une clé API pour commencer.'
          }
          rows={2}
          className={cn(
            'min-h-[56px] w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <Button size="icon" onClick={() => void submit()} disabled={disabled || !value.trim()}>
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
