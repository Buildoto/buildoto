import { useEffect } from 'react'
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
    window.buildoto.project.listTree()
      .then((entries) => { if (!cancelled) setTree(entries) })
      .catch(() => { if (!cancelled) setTree([]) })
    const unsub = window.buildoto.project.onTreeChanged(() => {
      window.buildoto.project.listTree()
        .then((entries) => { if (!cancelled) setTree(entries) })
        .catch(() => { if (!cancelled) setTree([]) })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [activeProject, setTree])

  return tree
}
