import { useEffect, useRef, useState } from 'react'
import { StepWelcome } from './step-welcome'
import { StepChooseAi } from './step-choose-ai'
import { StepGithub } from './step-github'
import { StepFirstProject } from './step-first-project'
import { StepTour } from './step-tour'
import { useGithubAuth } from '@/hooks/use-github-auth'
import { useTelemetry } from '@/hooks/use-telemetry'
import { useSettingsStore } from '@/stores/settings-store'

type Step = 1 | 2 | 3 | 4 | 5

const TOTAL = 5

interface OnboardingWizardProps {
  onDone: () => void
  onOpenSettings: () => void
}

export function OnboardingWizard({ onDone, onOpenSettings }: OnboardingWizardProps) {
  const storedStep = useSettingsStore((s) => s.onboardingStep) as Step
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted)
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep)

  const [step, setStep] = useState<Step>(clampStep(storedStep))
  const { status } = useGithubAuth()
  const { capture } = useTelemetry()
  const startedAtRef = useRef(Date.now())

  const go = (next: Step) => {
    setStep(next)
    void window.buildoto.appSettings.setOnboardingStep({ step: next })
    setOnboardingStep(next)
  }

  const advance = (from: Step, to: Step) => {
    capture('onboarding_step_completed', { step: from })
    go(to)
  }

  const finish = () => {
    capture('onboarding_step_completed', { step: 5 })
    capture('onboarding_completed', { durationMs: Date.now() - startedAtRef.current })
    void window.buildoto.appSettings.completeOnboarding()
    setOnboardingCompleted(true)
    onDone()
  }

  // Only reconcile once on mount: if the stored step was out of range and got
  // clamped by useState initialiser, persist the clamped value so subsequent
  // launches don't keep replaying the clamp.
  const reconciledRef = useRef(false)
  useEffect(() => {
    if (reconciledRef.current) return
    reconciledRef.current = true
    if (storedStep !== step) {
      void window.buildoto.appSettings.setOnboardingStep({ step })
    }
  }, [step, storedStep])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bienvenue dans Buildoto</h1>
            <p className="text-sm text-muted-foreground">
              L&apos;IDE construction pour techniciens.
            </p>
          </div>
          <StepIndicator current={step} />
        </div>

        {step === 1 && <StepWelcome onContinue={() => advance(1, 2)} />}
        {step === 2 && (
          <StepChooseAi
            onContinue={() => advance(2, 3)}
            onSkip={() => advance(2, 3)}
            onOpenSettings={onOpenSettings}
          />
        )}
        {step === 3 && (
          <StepGithub
            onContinue={() => advance(3, 4)}
            onBack={() => go(2)}
            onSkip={() => advance(3, 4)}
          />
        )}
        {step === 4 && (
          <StepFirstProject
            githubAuthed={status.isAuthed}
            onBack={() => go(3)}
            onDone={() => advance(4, 5)}
          />
        )}
        {step === 5 && <StepTour onDone={finish} />}
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={`h-1.5 w-6 rounded-full ${n <= current ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  )
}

function clampStep(s: number): Step {
  if (s < 1) return 1
  if (s > TOTAL) return TOTAL as Step
  return s as Step
}

