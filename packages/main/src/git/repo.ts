import simpleGit, { type SimpleGit } from 'simple-git'
import type {
  GitCommit,
  GitPullResult,
  GitPushResult,
  GitStatus,
} from '@buildoto/shared'
import { ERR_NO_STAGED_CHANGES } from '../lib/constants'
import { safeErrorMessage } from '../lib/safe-error'

export class GitRepo {
  private git: SimpleGit
  private statusCache: { value: GitStatus; at: number } | null = null

  constructor(private readonly projectPath: string) {
    this.git = simpleGit(projectPath)
  }

  invalidateStatus() {
    this.statusCache = null
  }

  async status(): Promise<GitStatus> {
    const now = Date.now()
    if (this.statusCache && now - this.statusCache.at < 500) return this.statusCache.value
    const s = await this.git.status()
    const branch = s.current ?? 'HEAD'
    const value: GitStatus = {
      branch,
      ahead: s.ahead,
      behind: s.behind,
      staged: s.staged,
      unstaged: s.modified.filter((f) => !s.staged.includes(f)),
      untracked: s.not_added,
      conflicted: s.conflicted,
    }
    this.statusCache = { value, at: now }
    return value
  }

  async log(limit = 100): Promise<GitCommit[]> {
    const result = await this.git.log({ maxCount: limit })
    return result.all.map((c) => ({
      sha: c.hash,
      shortSha: c.hash.slice(0, 7),
      message: c.message,
      author: { name: c.author_name, email: c.author_email },
      date: c.date,
    }))
  }

  async commit(message: string, files?: string[]): Promise<{ sha: string }> {
    if (files && files.length > 0) {
      await this.git.add(files)
    } else {
      await this.git.add(['-A'])
    }
    const status = await this.git.status()
    if (status.staged.length === 0) {
      throw new Error(ERR_NO_STAGED_CHANGES)
    }
    const result = await this.git
      .env({ GIT_AUTHOR_NAME: 'Buildoto', GIT_AUTHOR_EMAIL: 'bot@buildoto.app' })
      .env({ GIT_COMMITTER_NAME: 'Buildoto', GIT_COMMITTER_EMAIL: 'bot@buildoto.app' })
      .commit(message)
    this.invalidateStatus()
    return { sha: result.commit }
  }

  async push(): Promise<GitPushResult> {
    try {
      const remotes = await this.git.getRemotes(true)
      const origin = remotes.find((r) => r.name === 'origin')
      if (!origin) return { ok: false, remote: '', branch: '', error: 'Aucun dépôt distant configuré.' }
      const status = await this.git.status()
      const branch = status.current ?? 'main'
      await this.git.push('origin', branch, ['--set-upstream'])
      this.invalidateStatus()
      return { ok: true, remote: origin.refs.push, branch }
    } catch (err) {
      return { ok: false, remote: '', branch: '', error: safeErrorMessage(err) }
    }
  }

  async pull(): Promise<GitPullResult> {
    try {
      const res = await this.git.pull()
      this.invalidateStatus()
      return { ok: true, summary: `${res.summary.changes} change(s), ${res.summary.insertions} insertion(s)` }
    } catch (err) {
      return { ok: false, summary: '', error: safeErrorMessage(err) }
    }
  }

  async checkout(branch: string, create = false): Promise<void> {
    if (create) await this.git.checkoutLocalBranch(branch)
    else await this.git.checkout(branch)
    this.invalidateStatus()
  }

  async createBranch(name: string, checkout = true): Promise<void> {
    if (checkout) await this.git.checkoutLocalBranch(name)
    else await this.git.branch([name])
    this.invalidateStatus()
  }

  async listBranches(): Promise<string[]> {
    const res = await this.git.branchLocal()
    return res.all
  }

  async diff(path?: string): Promise<string> {
    const args: string[] = []
    if (path) args.push('--', path)
    return this.git.diff(args)
  }

  async addRemote(name: string, url: string): Promise<void> {
    const remotes = await this.git.getRemotes(true)
    if (remotes.find((r) => r.name === name)) {
      await this.git.remote(['set-url', name, url])
    } else {
      await this.git.addRemote(name, url)
    }
  }

  async fetch(): Promise<void> {
    await this.git.fetch()
    this.invalidateStatus()
  }

  async abortMerge(): Promise<void> {
    await this.git.raw(['merge', '--abort'])
    this.invalidateStatus()
  }

  raw(): SimpleGit {
    return this.git
  }

  get path(): string {
    return this.projectPath
  }
}
