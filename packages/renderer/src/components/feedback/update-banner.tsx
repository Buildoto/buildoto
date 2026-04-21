import { useEffect, useState } from 'react'
import { Download, RotateCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UpdaterStatus } from '@buildoto/shared'
import { useTelemetry } from '@/hooks/use-telemetry'

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdaterStatus>({ kind: 'idle' })
  const [dismissed, setDismissed] = useState(false)
  const { capture } = useTelemetry()

  useEffect(() => {
    const unsub = window.buildoto.updater.onStatusChanged((next) => {
      setStatus(next)
      if (next.kind === 'downloaded') {
        capture('update_downloaded', { version: next.version })
      }
    })
    return unsub
  }, [capture])

  if (dismissed) return null

  if (status.kind === 'available') {
    return (
      <Banner>
        <Download className="h-4 w-4" />
        <span>Nouvelle version {status.version} disponible.</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void window.buildoto.updater.download()}
        >
          Télécharger
        </Button>
        <DismissButton onClick={() => setDismissed(true)} />
      </Banner>
    )
  }

  if (status.kind === 'downloading') {
    return (
      <Banner>
        <RotateCw className="h-4 w-4 animate-spin" />
        <span>Téléchargement : {Math.round(status.percent)}%</span>
      </Banner>
    )
  }

  if (status.kind === 'downloaded') {
    return (
      <Banner highlight>
        <Download className="h-4 w-4" />
        <span>Version {status.version} prête.</span>
        <Button
          size="sm"
          onClick={() => void window.buildoto.updater.quitAndInstall()}
        >
          Redémarrer pour installer
        </Button>
        <DismissButton onClick={() => setDismissed(true)} />
      </Banner>
    )
  }

  return null
}

function Banner({
  children,
  highlight,
}: {
  children: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-border px-4 py-2 text-xs ${
        highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      }`}
    >
      {children}
    </div>
  )
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted-foreground/10"
      onClick={onClick}
      aria-label="Fermer la bannière"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )
}
