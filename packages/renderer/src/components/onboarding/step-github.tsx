import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useGithubAuth } from '@/hooks/use-github-auth'

interface StepGithubProps {
  onContinue: () => void
  onBack: () => void
  onSkip: () => void
}

export function StepGithub({ onContinue, onBack, onSkip }: StepGithubProps) {
  const { status, flow, startFlow, cancel } = useGithubAuth()

  useEffect(() => {
    if (flow.phase === 'authorized') {
      const timer = window.setTimeout(onContinue, 800)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [flow.phase, onContinue])

  const openVerification = () => {
    if (!flow.start) return
    window.open(flow.start.verificationUri, '_blank')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Étape 3/5 — GitHub</h2>
        <p className="text-sm text-muted-foreground">
          Connectez votre compte GitHub pour pousser vos projets. Le mode local seul est possible :
          aucune donnée ne sort de votre poste.
        </p>
      </div>

      {status.isAuthed ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm">
            Connecté en tant que <span className="font-mono">{status.login}</span>.
          </p>
        </div>
      ) : flow.phase === 'idle' || flow.phase === 'waiting' ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Le Device Flow ouvre une page GitHub où vous collez un code affiché ici.
          </p>
          <Button className="mt-3" onClick={() => void startFlow()} disabled={flow.phase === 'waiting'}>
            {flow.phase === 'waiting' ? 'Préparation…' : 'Démarrer la connexion GitHub'}
          </Button>
        </div>
      ) : flow.phase === 'pending' ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm">Code à saisir :</p>
          <p className="mt-2 font-mono text-2xl tracking-widest">{flow.start?.userCode}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Cliquez « Ouvrir github.com/login/device »</li>
            <li>Collez le code</li>
            <li>Autorisez Buildoto</li>
            <li>Revenez ici — connexion automatique</li>
          </ol>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openVerification}>
              Ouvrir {flow.start?.verificationUri}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void cancel()}>
              Annuler
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              ◌ En attente d&apos;autorisation…
            </span>
          </div>
        </div>
      ) : flow.phase === 'authorized' ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          Connecté en tant que <span className="font-mono">{flow.login}</span>. Continuation…
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          {flow.phase === 'expired'
            ? 'Le code a expiré. Relancez la connexion.'
            : flow.phase === 'denied'
              ? 'Autorisation refusée.'
              : `Erreur : ${flow.error ?? 'inconnue'}`}
          <div className="mt-3">
            <Button size="sm" onClick={() => void startFlow()}>
              Réessayer
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Précédent
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Mode local seul
          </Button>
          <Button onClick={onContinue} disabled={!status.isAuthed && flow.phase !== 'authorized'}>
            Continuer
          </Button>
        </div>
      </div>
    </div>
  )
}
