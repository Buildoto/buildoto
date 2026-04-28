import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useBuildotoAuth } from '@/hooks/use-buildoto-auth'
import { useBuildotoUsage } from '@/hooks/use-buildoto-usage'
import { BUILDOTO_API_KEYS_URL, BUILDOTO_BILLING_URL } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function AccountTab() {
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
            className={cn('h-full', barColor)}
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
