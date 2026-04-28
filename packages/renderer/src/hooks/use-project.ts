import { useCallback, useEffect } from 'react'
import type { Project, ProjectCreateRequest } from '@buildoto/shared'
import { useProjectStore } from '@/stores/project-store'

export function useProjectBootstrap() {
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const setRecentProjects = useProjectStore((s) => s.setRecentProjects)
  const setBootstrapped = useProjectStore((s) => s.setBootstrapped)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      window.buildoto.project.getActive().catch(() => null),
      window.buildoto.project.listRecent().catch(() => []),
    ]).then(([active, recent]) => {
      if (cancelled) return
      setActiveProject(active)
      setRecentProjects(recent)
    }).catch(() => {
      // Both fallbacks already handle errors — this catch is a safety net.
    }).finally(() => {
      if (!cancelled) setBootstrapped(true)
    })
    return () => {
      cancelled = true
    }
  }, [setActiveProject, setRecentProjects, setBootstrapped])

  useEffect(() => {
    const unsub = window.buildoto.project.onActiveChanged(async (project: Project | null) => {
      setActiveProject(project)
      const recent = await window.buildoto.project.listRecent()
      setRecentProjects(recent)
    })
    return unsub
  }, [setActiveProject, setRecentProjects])
}

export function useCreateProject() {
  return useCallback(async (req: ProjectCreateRequest) => {
    return window.buildoto.project.create(req)
  }, [])
}

export function useOpenProject() {
  return useCallback(async (path: string) => {
    return window.buildoto.project.open({ path })
  }, [])
}

export function usePickDirectory() {
  return useCallback(async (title?: string) => {
    return window.buildoto.project.pickDirectory({ title })
  }, [])
}

export function useCloneProject() {
  return useCallback(async (url: string, destPath: string) => {
    return window.buildoto.project.clone({ url, destPath })
  }, [])
}
