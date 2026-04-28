import { useEffect, useState } from 'react'
import type { GitCommit } from '@buildoto/shared'
import { useGitActions } from '@/hooks/use-git'
import { useProjectStore } from '@/stores/project-store'

export function CommitList() {
  const activeProject = useProjectStore((s) => s.activeProject)
  const gitStatus = useProjectStore((s) => s.gitStatus)
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [loading, setLoading] = useState(false)
  const { log } = useGitActions()

  useEffect(() => {
    if (!activeProject) {
      setCommits([])
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.resolve(log(40)).then((items) => {
      if (!cancelled) setCommits(items ?? [])
    }).catch(() => {
      if (!cancelled) setCommits([])
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // Refetch when HEAD moves (status changes on staged/ahead/behind).
  }, [activeProject, gitStatus?.ahead, gitStatus?.behind, gitStatus?.staged.length, log])

  if (!activeProject) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Commits</span>
        {gitStatus && (
          <span className="font-mono">
            {gitStatus.branch}
            {gitStatus.ahead > 0 && ` ↑${gitStatus.ahead}`}
            {gitStatus.behind > 0 && ` ↓${gitStatus.behind}`}
          </span>
        )}
      </div>
      <ul className="flex-1 overflow-auto">
        {loading && (
          <li className="px-3 py-4 text-xs text-muted-foreground">Chargement…</li>
        )}
        {!loading && commits.map((c) => (
          <li
            key={c.sha}
            className="flex items-baseline gap-2 border-b border-border/60 px-3 py-1.5 text-xs"
          >
            <code className="shrink-0 text-muted-foreground">{c.shortSha}</code>
            <span className="truncate">{c.message}</span>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {c.author.name}
            </span>
          </li>
        ))}
        {!loading && commits.length === 0 && (
          <li className="px-3 py-4 text-xs text-muted-foreground">Aucun commit</li>
        )}
      </ul>
    </div>
  )
}
