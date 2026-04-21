import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BUILDOTO_BILLING_URL } from '@/lib/constants'
import type { BuildotoUsageSnapshot } from '@buildoto/shared'

export function QuotaBanner({
  usage,
  onOpenSettings,
}: {
  usage: BuildotoUsageSnapshot
  onOpenSettings: () => void
}) {
  if (!usage.known || usage.limit <= 0) return null
  if (usage.used < usage.limit) return null

  return (
    <div className="flex items-center gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Quota Buildoto AI atteint ({usage.used.toLocaleString('fr-FR')} /{' '}
        {usage.limit.toLocaleString('fr-FR')}). Les prochaines requêtes sont bloquées
        jusqu'au renouvellement mensuel.
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => window.open(BUILDOTO_BILLING_URL)}
      >
        Upgrader
      </Button>
      <Button size="sm" variant="ghost" onClick={onOpenSettings}>
        Voir le compte
      </Button>
    </div>
  )
}
