import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/project-store'

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.default })),
)

interface CodeEditorProps {
  relativePath: string | null
}

export function CodeEditor({ relativePath }: CodeEditorProps) {
  const activeProject = useProjectStore((s) => s.activeProject)
  const [content, setContent] = useState<string>('')
  const [dirty, setDirty] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [encoding, setEncoding] = useState<'utf-8' | 'base64'>('utf-8')

  useEffect(() => {
    if (!activeProject || !relativePath) {
      setContent('')
      setDirty(false)
      setEditing(false)
      return
    }
    let cancelled = false
    window.buildoto.project.readFile({ relativePath }).then((res) => {
      if (cancelled) return
      setContent(res.encoding === 'base64' ? '' : res.content)
      setEncoding(res.encoding)
      setDirty(false)
      setEditing(false)
    })
    return () => {
      cancelled = true
    }
  }, [activeProject, relativePath])

  const save = async () => {
    if (!relativePath) return
    setSaving(true)
    try {
      await window.buildoto.project.writeFile({ relativePath, content, encoding: 'utf-8' })
      setDirty(false)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!relativePath) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Sélectionnez un fichier dans l&apos;explorateur.
      </div>
    )
  }

  if (encoding === 'base64') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Fichier binaire — aperçu indisponible ({relativePath}).
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-xs">
        <span className="font-mono">{relativePath}</span>
        {dirty && <span className="text-amber-500">● modifié</span>}
        <div className="ml-auto flex items-center gap-2">
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Modifier
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Annuler
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving || !dirty}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Chargement de l&apos;éditeur…
            </div>
          }
        >
          <MonacoEditor
            height="100%"
            theme="vs-dark"
            language={guessLanguage(relativePath)}
            value={content}
            options={{
              readOnly: !editing,
              minimap: { enabled: false },
              fontSize: 12,
              scrollBeyondLastLine: false,
            }}
            onChange={(v) => {
              setContent(v ?? '')
              setDirty(true)
            }}
          />
        </Suspense>
      </div>
    </div>
  )
}

function guessLanguage(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.py')) return 'python'
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript'
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'javascript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.md')) return 'markdown'
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'yaml'
  return 'plaintext'
}
