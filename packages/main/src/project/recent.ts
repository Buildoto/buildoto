import type { RecentProject } from '@buildoto/shared'
import { MAX_RECENT_PROJECTS } from '../lib/constants'
import { store } from '../store/settings'

export function listRecentProjects(): RecentProject[] {
  return store.get('recentProjects', [])
}

export function bumpRecent(entry: Omit<RecentProject, 'lastOpenedAt'>): RecentProject[] {
  const now = new Date().toISOString()
  const current = listRecentProjects().filter((r) => r.projectId !== entry.projectId)
  const next: RecentProject[] = [{ ...entry, lastOpenedAt: now }, ...current].slice(0, MAX_RECENT_PROJECTS)
  store.set('recentProjects', next)
  store.set('lastActiveProjectId', entry.projectId)
  return next
}

export function getLastActiveProjectId(): string | null {
  return store.get('lastActiveProjectId') ?? null
}


