import { useEffect } from 'react'
import type { ProjectTreeDelta } from '@buildoto/shared'
import { useProjectStore } from '@/stores/project-store'

export function useProjectTree() {
  const activeProject = useProjectStore((s) => s.activeProject)
  const tree = useProjectStore((s) => s.tree)
  const setTree = useProjectStore((s) => s.setTree)

  useEffect(() => {
    if (!activeProject) {
      setTree([])
      return
    }
    let cancelled = false
    window.buildoto.project.listTree().then((entries) => {
      if (!cancelled) setTree(entries)
    })
    const unsub = window.buildoto.project.onTreeChanged((_delta: ProjectTreeDelta) => {
      window.buildoto.project.listTree().then((entries) => {
        if (!cancelled) setTree(entries)
      })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [activeProject, setTree])

  return tree
}
