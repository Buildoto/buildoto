import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface StepTourProps {
  onDone: () => void
}

interface Slide {
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    title: 'Panneau Agent',
    body:
      "C'est votre conversation avec Buildoto. Décrivez ce que vous voulez construire ; l'agent appelle FreeCAD, édite vos fichiers, propose des commits.",
  },
  {
    title: 'Modeleur 3D',
    body:
      'La vue 3D s\'actualise à chaque export FreeCAD. Elle est en lecture seule : pour modifier, demandez à l\'agent ou éditez un fichier .FCMacro.',
  },
  {
    title: 'Historique Git',
    body:
      'Chaque modification peut devenir un commit. Push GitHub en un clic si vous avez connecté votre compte.',
  },
  {
    title: 'Réglages',
    body:
      "⌘+, ouvre les réglages à tout moment : clés API, serveurs MCP, apparence, télémétrie, mises à jour.",
  },
]

export function StepTour({ onDone }: StepTourProps) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index] ?? SLIDES[0]!
  const isLast = index === SLIDES.length - 1

  const next = () => {
    if (isLast) onDone()
    else setIndex((i) => i + 1)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Étape 5/5 — Tour rapide</h2>
        <p className="text-sm text-muted-foreground">
          Quatre zones à connaître avant de commencer.
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
        <div className="text-xs font-medium text-primary">
          {index + 1} / {SLIDES.length}
        </div>
        <h3 className="mt-1 text-base font-semibold">{slide.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{slide.body}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i <= index ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="ghost" onClick={() => setIndex((i) => i - 1)}>
              Précédent
            </Button>
          )}
          <Button onClick={next}>{isLast ? 'Terminer' : 'Suivant'}</Button>
        </div>
      </div>
    </div>
  )
}
