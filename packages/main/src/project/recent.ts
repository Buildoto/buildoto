import type { RecentProject } from '@buildoto/shared'
import { store } from '../store/settings'

const MAX_RECENT = 20

export function listRecentProjects(): RecentProject[] {
  return store.get('recentProjects', [])
}

export function bumpRecent(entry: Omit<RecentProject, 'lastOpenedAt'>): RecentProject[] {
  const now = new Date().toISOString()
  const current = listRecentProjects().filter((r) => r.projectId !== entry.projectId)
  const next: RecentProject[] = [{ ...entry, lastOpenedAt: now }, ...current].slice(0, MAX_RECENT)
  store.set('recentProjects', next)
  store.set('lastActiveProjectId', entry.projectId)
  return next
}

export function forgetRecent(projectId: string): RecentProject[] {
  const next = listRecentProjects().filter((r) => r.projectId !== projectId)
  store.set('recentProjects', next)
  if (store.get('lastActiveProjectId') === projectId) {
    store.set('lastActiveProjectId', null)
  }
  return next
}

export function getLastActiveProjectId(): string | null {
  return store.get('lastActiveProjectId') ?? null
}

export function findRecentByProjectId(projectId: string): RecentProject | null {
  return listRecentProjects().find((r) => r.projectId === projectId) ?? null
}
