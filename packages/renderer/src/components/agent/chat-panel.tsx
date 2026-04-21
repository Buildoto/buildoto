import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSessionStore } from '@/stores/session-store'
import { Message } from './message'
import { InputBox } from './input-box'

export function ChatPanel({ apiKeySet }: { apiKeySet: boolean }) {
  const messages = useSessionStore((s) => s.messages)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div ref={viewportRef} className="h-full">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Demande à l'agent de construire quelque chose — un mur, un cube, une pièce. Le modeleur se mettra à
                jour à chaque étape.
              </div>
            ) : (
              <div className="py-2">
                {messages.map((m) => (
                  <Message key={m.id} message={m} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      <InputBox apiKeySet={apiKeySet} />
    </div>
  )
}
