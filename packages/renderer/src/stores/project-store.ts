import { create } from 'zustand'
import type {
  GitStatus,
  Project,
  ProjectTreeEntry,
  RecentProject,
  SessionSummary,
} from '@buildoto/shared'

interface ProjectState {
  activeProject: Project | null
  recentProjects: RecentProject[]
  tree: ProjectTreeEntry[]
  gitStatus: GitStatus | null
  sessions: SessionSummary[]
  bootstrapped: boolean

  setActiveProject: (project: Project | null) => void
  setRecentProjects: (items: RecentProject[]) => void
  setTree: (tree: ProjectTreeEntry[]) => void
  setGitStatus: (status: GitStatus | null) => void
  setSessions: (items: SessionSummary[]) => void
  setBootstrapped: (value: boolean) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProject: null,
  recentProjects: [],
  tree: [],
  gitStatus: null,
  sessions: [],
  bootstrapped: false,

  setActiveProject: (activeProject) => set({ activeProject }),
  setRecentProjects: (recentProjects) => set({ recentProjects }),
  setTree: (tree) => set({ tree }),
  setGitStatus: (gitStatus) => set({ gitStatus }),
  setSessions: (sessions) => set({ sessions }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
}))
