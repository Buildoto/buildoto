import { useEffect, useState } from 'react'
import { Check, ExternalLink, KeyRound, Server, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBuildotoAuth } from '@/hooks/use-buildoto-auth'
import { BUILDOTO_PORTAL_URL } from '@/lib/constants'
import { cn } from '@/lib/utils'

type Choice = 'buildoto-ai' | 'byom' | 'ollama'

interface StepChooseAiProps {
  onContinue: () => void
  onSkip: () => void
  onOpenSettings: () => void
}

// Step 2 of onboarding: how the user wants to power the agent. Buildoto AI is
// the recommended default (comes with a free quota + curated RAG). BYOM and
// Ollama are equally valid — we respect user choice and don't nag.
export function StepChooseAi({ onContinue, onSkip, onOpenSettings }: StepChooseAiProps) {
  const auth = useBuildotoAuth()
  const [choice, setChoice] = useState<Choice | null>(null)
  const [busy, setBusy] = useState(false)
  const [anthropicSet, setAnthropicSet] = useState(false)

  useEffect(() => {
    void window.buildoto.settings
      .getProvidersStatus()
      .then((s) => setAnthropicSet(s.anthropic.isSet))
  }, [])

  const connectBuildotoAi = async () => {
    setChoice('buildoto-ai')
    setBusy(true)
    try {
      await window.buildoto.buildotoAuth.start()
    } finally {
      setBusy(false)
    }
  }

  const canContinue =
    (choice === 'buildoto-ai' && auth.kind === 'signed-in') ||
    (choice === 'byom' && anthropicSet) ||
    choice === 'ollama'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Étape 2/5 — Choisir un modèle IA</h2>
        <p className="text-sm text-muted-foreground">
          Buildoto est open source et compatible avec plusieurs fournisseurs. Choisissez
          celui qui vous convient — vous pourrez en changer à tout moment.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ChoiceCard
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          title="Buildoto AI"
          badge="Recommandé"
          description="Modèle AEC spécialisé avec sources vérifiables. 100 requêtes offertes chaque mois."
          selected={choice === 'buildoto-ai'}
          onSelect={() => {
            if (auth.kind === 'signed-in') {
              setChoice('buildoto-ai')
            } else {
              void connectBuildotoAi()
            }
          }}
          footer={
            auth.kind === 'signed-in' ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <Check className="h-3.5 w-3.5" />
                Connecté à {auth.email ?? 'votre compte Buildoto'}
              </span>
            ) : auth.kind === 'pending' ? (
              <span className="text-xs text-muted-foreground">
                Consentement en cours dans le navigateur…
              </span>
            ) : auth.kind === 'error' ? (
              <span className="text-xs text-destructive">{auth.message}</span>
            ) : (
              <Button
                size="sm"
                onClick={() => void connectBuildotoAi()}
                disabled={busy}
              >
                Se connecter
              </Button>
            )
          }
          extra={
            auth.kind === 'signed-out' && (
              <button
                type="button"
                onClick={() => window.open(`${BUILDOTO_PORTAL_URL}/signup`)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Créer un compte
              </button>
            )
          }
        />

        <ChoiceCard
          icon={<KeyRound className="h-5 w-5" />}
          title="Mon propre modèle"
          description="Utilisez votre clé Anthropic, OpenAI, Mistral, Google ou OpenRouter."
          selected={choice === 'byom'}
          onSelect={() => setChoice('byom')}
          footer={
            anthropicSet ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <Check className="h-3.5 w-3.5" />
                Une clé est déjà configurée
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={onOpenSettings}>
                Configurer une clé
              </Button>
            )
          }
        />

        <ChoiceCard
          icon={<Server className="h-5 w-5" />}
          title="Ollama local"
          description="Aucune clé, aucun envoi externe. Nécessite Ollama installé et un modèle tiré."
          selected={choice === 'ollama'}
          onSelect={() => setChoice('ollama')}
          footer={
            <button
              type="button"
              onClick={() => window.open('https://ollama.com/download')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Télécharger Ollama
            </button>
          }
        />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSkip}>
          Passer
        </Button>
        <Button onClick={onContinue} disabled={!canContinue}>
          Continuer
        </Button>
      </div>
    </div>
  )
}

function ChoiceCard({
  icon,
  title,
  badge,
  description,
  selected,
  onSelect,
  footer,
  extra,
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  description: string
  selected: boolean
  onSelect: () => void
  footer: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            {badge && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div
        className="flex items-center justify-between gap-2 pl-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div>{footer}</div>
        {extra && <div>{extra}</div>}
      </div>
    </button>
  )
}
