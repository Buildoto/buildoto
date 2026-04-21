import { EventEmitter } from 'node:events'
import { relative, sep } from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { ProjectTreeDelta } from '@buildoto/shared'
import { WATCHER_DEBOUNCE_MS } from '../lib/constants'

// One watcher per open project. Supports origin-tagging: before Buildoto writes
// a file, call `markSelfWrite(absPath)` — the resulting event will be swallowed.

export class ProjectWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null
  private selfWritePaths = new Set<string>()
  private pending = { added: new Set<string>(), removed: new Set<string>(), changed: new Set<string>() }
  private flushTimer: NodeJS.Timeout | null = null

  constructor(
    private readonly projectId: string,
    private readonly projectPath: string,
  ) {
    super()
  }

  markSelfWrite(absPath: string) {
    this.selfWritePaths.add(absPath)
  }

  start() {
    if (this.watcher) return
    this.watcher = chokidar.watch(this.projectPath, {
      ignored: (p) => {
        const rel = relative(this.projectPath, p).split(sep).join('/')
        if (rel === '' || rel === '.') return false
        if (rel.startsWith('.git/') || rel === '.git') return true
        if (rel.startsWith('exports/') || rel === 'exports') return true
        if (rel.startsWith('.buildoto/cache/')) return true
        if (rel === 'node_modules' || rel.startsWith('node_modules/')) return true
        return false
      },
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 120, pollInterval: 50 },
      persistent: true,
    })
    this.watcher.on('add', (p) => this.enqueue('added', p))
    this.watcher.on('change', (p) => this.enqueue('changed', p))
    this.watcher.on('unlink', (p) => this.enqueue('removed', p))
    this.watcher.on('addDir', (p) => this.enqueue('added', p))
    this.watcher.on('unlinkDir', (p) => this.enqueue('removed', p))
    this.watcher.on('error', (err) => console.error('[watcher] error', err))
  }

  async stop() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }

  private enqueue(kind: 'added' | 'removed' | 'changed', absPath: string) {
    if (this.selfWritePaths.delete(absPath)) return
    const rel = relative(this.projectPath, absPath).split(sep).join('/')
    this.pending[kind].add(rel)
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(), WATCHER_DEBOUNCE_MS)
  }

  private flush() {
    this.flushTimer = null
    const delta: ProjectTreeDelta = {
      projectId: this.projectId,
      added: [...this.pending.added],
      removed: [...this.pending.removed],
      changed: [...this.pending.changed],
    }
    this.pending.added.clear()
    this.pending.removed.clear()
    this.pending.changed.clear()
    if (delta.added.length + delta.removed.length + delta.changed.length > 0) {
      this.emit('tree-changed', delta)
    }
  }
}
