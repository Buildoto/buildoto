import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCloneProject, useCreateProject, useOpenProject, usePickDirectory } from '@/hooks/use-project'

type Mode = 'new' | 'clone' | 'open'

interface StepFirstProjectProps {
  githubAuthed: boolean
  onBack: () => void
  onDone: () => void
}

export function StepFirstProject({ githubAuthed, onBack, onDone }: StepFirstProjectProps) {
  const [mode, setMode] = useState<Mode>('new')
  const [name, setName] = useState('Mon premier bâtiment')
  const [parentPath, setParentPath] = useState('')
  const [withGithub, setWithGithub] = useState(githubAuthed)
  const [cloneUrl, setCloneUrl] = useState('')
  const [openPath, setOpenPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProject = useCreateProject()
  const openProject = useOpenProject()
  const cloneProject = useCloneProject()
  const pickDirectory = usePickDirectory()

  const pickParent = async () => {
    const picked = await pickDirectory('Choisir le dossier parent du projet')
    if (picked) setParentPath(picked)
  }

  const pickOpen = async () => {
    const picked = await pickDirectory('Choisir un projet Buildoto existant')
    if (picked) setOpenPath(picked)
  }

  const pickCloneDest = async () => {
    const picked = await pickDirectory('Choisir où cloner le projet')
    if (picked) setParentPath(picked)
  }

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      if (mode === 'new') {
        if (!name.trim()) throw new Error('Nom requis')
        if (!parentPath) throw new Error('Emplacement requis')
        await createProject({
          name: name.trim(),
          parentPath,
          createGithubRepo: withGithub ? { private: true } : undefined,
        })
      } else if (mode === 'clone') {
        if (!cloneUrl.trim()) throw new Error('URL requise')
        if (!parentPath) throw new Error('Emplacement requis')
        const dest = `${parentPath}/${extractCloneName(cloneUrl)}`
        await cloneProject(cloneUrl.trim(), dest)
      } else {
        if (!openPath) throw new Error('Dossier requis')
        await openProject(openPath)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Étape 4/5 — Votre premier projet</h2>
        <p className="text-sm text-muted-foreground">
          Un projet Buildoto est un dossier Git avec un espace de travail dédié.
        </p>
      </div>

      <ModePicker mode={mode} onChange={setMode} />

      {mode === 'new' && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <label className="text-xs font-medium text-muted-foreground">Nom</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <label className="mt-2 text-xs font-medium text-muted-foreground">Emplacement</label>
          <div className="flex gap-2">
            <Input
              value={parentPath}
              readOnly
              placeholder="/Users/…/Documents/Buildoto"
              className="flex-1"
            />
            <Button variant="outline" onClick={() => void pickParent()}>
              Changer
            </Button>
          </div>
          {githubAuthed && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withGithub}
                onChange={(e) => setWithGithub(e.target.checked)}
              />
              Créer aussi un repo GitHub privé
            </label>
          )}
        </div>
      )}

      {mode === 'clone' && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <label className="text-xs font-medium text-muted-foreground">URL GitHub</label>
          <Input
            value={cloneUrl}
            onChange={(e) => setCloneUrl(e.target.value)}
            placeholder="https://github.com/…"
          />
          <label className="mt-2 text-xs font-medium text-muted-foreground">Dossier local</label>
          <div className="flex gap-2">
            <Input value={parentPath} readOnly className="flex-1" />
            <Button variant="outline" onClick={() => void pickCloneDest()}>
              Parcourir
            </Button>
          </div>
        </div>
      )}

      {mode === 'open' && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <label className="text-xs font-medium text-muted-foreground">Dossier projet</label>
          <div className="flex gap-2">
            <Input value={openPath} readOnly className="flex-1" />
            <Button variant="outline" onClick={() => void pickOpen()}>
              Parcourir
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Précédent
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? 'Création…' : 'Terminer'}
        </Button>
      </div>
    </div>
  )
}

function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const items: { value: Mode; label: string; desc: string }[] = [
    { value: 'new', label: 'Créer un nouveau projet', desc: 'Initialise un dossier Git + Buildoto.' },
    { value: 'clone', label: 'Cloner depuis GitHub', desc: "Clone un projet Buildoto existant." },
    { value: 'open', label: 'Ouvrir un dossier local existant', desc: 'Choisir un dossier déjà Buildoto.' },
  ]
  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => (
        <label
          key={it.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${
            mode === it.value ? 'border-primary bg-primary/5' : 'border-border bg-card'
          }`}
        >
          <input
            type="radio"
            className="mt-1"
            checked={mode === it.value}
            onChange={() => onChange(it.value)}
          />
          <div>
            <div className="text-sm font-medium">{it.label}</div>
            <div className="text-xs text-muted-foreground">{it.desc}</div>
          </div>
        </label>
      ))}
    </div>
  )
}

function extractCloneName(url: string): string {
  const stripped = url.replace(/\.git$/i, '').replace(/\/+$/, '')
  const parts = stripped.split('/')
  return parts[parts.length - 1] || 'buildoto-clone'
}
