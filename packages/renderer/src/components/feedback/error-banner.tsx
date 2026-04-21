import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBannerProps {
  title: string
  detail?: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorBanner({ title, detail, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="font-medium text-destructive">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-destructive/80">{detail}</p>}
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Réessayer
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Ignorer
          </Button>
        )}
      </div>
    </div>
  )
}
