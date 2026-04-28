import { useCallback, useEffect } from 'react'
import type { GitStatus } from '@buildoto/shared'
import { useProjectStore } from '@/stores/project-store'

export function useGitStatus() {
  const activeProject = useProjectStore((s) => s.activeProject)
  const gitStatus = useProjectStore((s) => s.gitStatus)
  const setGitStatus = useProjectStore((s) => s.setGitStatus)

  useEffect(() => {
    if (!activeProject) {
      setGitStatus(null)
      return
    }
    let cancelled = false
    window.buildoto.git.status().then((s) => {
      if (!cancelled) setGitStatus(s)
    }).catch(() => {
      if (!cancelled) setGitStatus(null)
    })
    const unsub = window.buildoto.git.onStatusChanged((s: GitStatus) => {
      if (!cancelled) setGitStatus(s)
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [activeProject, setGitStatus])

  return gitStatus
}

export function useGitActions() {
  return {
    commit: useCallback(
      async (message: string, files?: string[]) =>
        window.buildoto.git.commit({ message, files }).catch((err) => {
          console.warn('[git] commit failed:', err)
          return null
        }),
      [],
    ),
    push: useCallback(() => window.buildoto.git.push(), []),
    pull: useCallback(() => window.buildoto.git.pull(), []),
    listBranches: useCallback(
      () => window.buildoto.git.listBranches().catch(() => [] as string[]),
      [],
    ),
    checkout: useCallback(
      (branch: string, create = false) =>
        window.buildoto.git.checkout({ branch, create }).catch((err) => {
          console.warn('[git] checkout failed:', err)
          return undefined
        }),
      [],
    ),
    createBranch: useCallback(
      (name: string, checkout = true) =>
        window.buildoto.git.createBranch({ name, checkout }).catch((err) => {
          console.warn('[git] createBranch failed:', err)
          return undefined
        }),
      [],
    ),
    log: useCallback(async (count = 50) => window.buildoto.git.log({ limit: count }), []),
    diff: useCallback(async (path?: string) => window.buildoto.git.diff({ path }), []),
  }
}
