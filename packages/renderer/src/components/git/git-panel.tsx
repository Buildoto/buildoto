import { useState } from 'react'
import { ArrowDown, ArrowUp, FileText, GitCommit as GitCommitIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BranchSwitcher } from './branch-switcher'
import { CommitDialog } from './commit-dialog'
import { CommitList } from './commit-list'
import { useGitActions, useGitStatus } from '@/hooks/use-git'
import { useProjectStore } from '@/stores/project-store'

export function GitPanel() {
  const status = useGitStatus()
  const activeProject = useProjectStore((s) => s.activeProject)
  const [commitOpen, setCommitOpen] = useState(false)
  const [busy, setBusy] = useState<null | 'push' | 'pull'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [diffContent, setDiffContent] = useState<string | null>(null)
  const { push, pull } = useGitActions()

  const inConflict = !!status && status.conflicted.length > 0

  if (!activeProject) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Ouvrez un projet pour voir son état Git.
      </div>
    )
  }

  const hasRemote = activeProject.github != null
  const dirty = !!status && (status.staged.length + status.unstaged.length + status.untracked.length > 0)

  const doPush = async () => {
    setBusy('push')
    setToast(null)
    try {
      const r = await push()
      setToast(r.ok ? `Push → ${r.branch}` : `Push échoué : ${r.error ?? ''}`)
    } finally {
      setBusy(null)
    }
  }

  const doPull = async () => {
    setBusy('pull')
    setToast(null)
    try {
      const r = await pull()
      setToast(r.ok ? `Pull ok (${r.summary})` : `Pull échoué : ${r.error ?? ''}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <BranchSwitcher />
        {status && (
          <span className="text-xs text-muted-foreground">
            {status.staged.length > 0 && `● ${status.staged.length} staged `}
            {status.unstaged.length > 0 && `○ ${status.unstaged.length} modifiés `}
            {status.untracked.length > 0 && `? ${status.untracked.length} non suivis`}
            {!dirty && 'Propre'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {status && status.unstaged.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const d = await window.buildoto.git.diff({ path: undefined })
                setDiffContent(d || '(aucune modification)')
              }}
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Diff
            </Button>
          )}
          <Button size="sm" onClick={() => setCommitOpen(true)} disabled={!dirty}>
            <GitCommitIcon className="mr-1 h-3.5 w-3.5" />
            Commit
          </Button>
          {hasRemote && (
            <>
              <Button size="sm" variant="ghost" onClick={async () => {
                await window.buildoto.git.fetch()
              }} disabled={busy !== null}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Fetch
              </Button>
              <Button size="sm" variant="outline" onClick={() => void doPull()} disabled={busy !== null}>
                <ArrowDown className="mr-1 h-3.5 w-3.5" />
                Pull
              </Button>
              <Button size="sm" variant="outline" onClick={() => void doPush()} disabled={busy !== null}>
                <ArrowUp className="mr-1 h-3.5 w-3.5" />
                Push
              </Button>
            </>
          )}
        </div>
      </div>
      {toast && (
        <div className="border-b border-border bg-muted/30 px-3 py-1 text-xs">{toast}</div>
      )}
      {diffContent && (
        <Dialog open={!!diffContent} onOpenChange={() => setDiffContent(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Diff</DialogTitle>
            </DialogHeader>
            <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-4 text-xs font-mono text-foreground">
              {diffContent}
            </pre>
          </DialogContent>
        </Dialog>
      )}
      {inConflict && (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="font-medium">{status!.conflicted.length} fichier(s) en conflit</span>
          <span className="text-destructive/70">Résolvez les conflits, puis commitez.</span>
          <button
            className="ml-auto rounded px-2 py-0.5 text-destructive underline hover:no-underline"
            onClick={async () => {
              await window.buildoto.git.abortMerge()
            }}
          >
            Annuler le merge
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CommitList />
      </div>
      <CommitDialog open={commitOpen} onOpenChange={setCommitOpen} />
    </div>
  )
}
