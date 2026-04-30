import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createWriteStream, existsSync, mkdirSync, renameSync, type WriteStream } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_BOOT_TIMEOUT_MS,
  type FreecadRequest,
  type FreecadResponse,
  type FreecadSidecarStatus,
} from '@buildoto/shared'
import {
  FREECAD_RESOURCES_DIR,
  FREECAD_RUNNER_SCRIPT,
  SIDECAR_AUTO_RESTART_MAX_ATTEMPTS,
  SIDECAR_BOOT_RETRY_ATTEMPTS,
  SIDECAR_BOOT_RETRY_BACKOFF_MS,
  SIDECAR_LOG_DIR,
  SIDECAR_LOG_FILE,
  SIDECAR_LOG_MAX_BYTES,
  SIDECAR_PING_INTERVAL_MS,
  SIDECAR_PING_TIMEOUT_MS,
  SIDECAR_REQUEST_DEFAULT_TIMEOUT_MS,
  SIDECAR_SHUTDOWN_TIMEOUT_MS,
} from '../lib/constants'

// `electron` is only available under the Electron runtime. When the sidecar is
// used from a plain Node script (e.g. smoke test via tsx), fall back to
// unpackaged paths relative to cwd.
// Narrowed facade over Electron's `app` — we only consume a handful of
// properties, and `resourcesPath` actually lives on `process.resourcesPath`
// (not `app`) under the Electron runtime. Keeping a minimal local type also
// means this file stays usable from a plain Node tsx harness where
// `@types/electron` may not resolve.
interface ElectronAppFacade {
  isPackaged: boolean
  resourcesPath: string
  getPath(name: string): string
}

function electronApp(): ElectronAppFacade | null {
  try {
    const req = createRequire(import.meta.url)
    const mod = req('electron') as typeof import('electron')
    if (!mod || typeof mod !== 'object' || !('app' in mod) || !mod.app) return null
    const app = mod.app
    // `resourcesPath` is exposed on the global `process` object in the
    // Electron runtime; fall back to an empty string when running under plain
    // Node (the caller never uses it in that case — `app.isPackaged` is
    // false and the unpacked candidates win).
    const resourcesPath =
      (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? ''
    return {
      isPackaged: app.isPackaged,
      resourcesPath,
      getPath: (name: string) => app.getPath(name as Parameters<typeof app.getPath>[0]),
    }
  } catch {
    return null
  }
}

type Pending = {
  resolve: (res: FreecadResponse) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

type TargetKey = 'darwin-arm64' | 'darwin-x64' | 'linux-x64' | 'win32-x64'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Boot retry: one extra attempt if the first fails. Under a slow-disk boot the
// Python import of FreeCAD can exceed DEFAULT_BOOT_TIMEOUT_MS on the cold path;
// a second try with a fresh server/socket almost always wins.

function currentTarget(): TargetKey {
  const p = process.platform
  const a = process.arch
  if (p === 'darwin' && a === 'arm64') return 'darwin-arm64'
  if (p === 'darwin' && a === 'x64') return 'darwin-x64'
  if (p === 'linux' && a === 'x64') return 'linux-x64'
  if (p === 'win32' && a === 'x64') return 'win32-x64'
  throw new Error(`Plateforme non supportée : ${p}-${a}`)
}

function resolveFreecadBinary(): string {
  const target = currentTarget()
  const exe = target.startsWith('win32') ? 'freecadcmd.exe' : 'freecadcmd'
  const app = electronApp()

  const resourceDir = app?.isPackaged ? 'freecad' : FREECAD_RESOURCES_DIR
  const candidates = app?.isPackaged
    ? [join(app.resourcesPath, 'freecad', 'bin', exe)]
    : [
        resolve(__dirname, '../../../../', resourceDir, target, 'bin', exe),
        resolve(process.cwd(), resourceDir, target, 'bin', exe),
      ]
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`freecadcmd introuvable. Chemins cherchés :\n  - ${candidates.join('\n  - ')}`)
  return found
}

function resolveRunnerScript(): string {
  const app = electronApp()
  const candidates = app?.isPackaged
    ? [join(app.resourcesPath, 'freecad', FREECAD_RUNNER_SCRIPT)]
    : [
        resolve(__dirname, '../../../../', FREECAD_RESOURCES_DIR, FREECAD_RUNNER_SCRIPT),
        resolve(process.cwd(), FREECAD_RESOURCES_DIR, FREECAD_RUNNER_SCRIPT),
      ]
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`runner.py introuvable. Chemins cherchés :\n  - ${candidates.join('\n  - ')}`)
  return found
}

function resolveLogFile(): string | null {
  try {
    const app = electronApp()
    // In Electron we pick the OS-standard userData logs directory; in plain
    // Node (smoke tests) we fall back to cwd so developers see the file.
    const base = app ? app.getPath('logs') : resolve(process.cwd(), SIDECAR_LOG_DIR)
    mkdirSync(base, { recursive: true })
    return join(base, SIDECAR_LOG_FILE)
  } catch {
    return null
  }
}

export interface SidecarEvents {
  status: (status: FreecadSidecarStatus) => void
}

export class FreecadSidecar extends EventEmitter {
  private server: Server | null = null
  private socket: Socket | null = null
  private child: ChildProcess | null = null
  private pending = new Map<string, Pending>()
  private buffer = Buffer.alloc(0)
  private status: FreecadSidecarStatus = { state: 'stopped' }
  private token = randomBytes(16).toString('hex')
  private readyPromise: Promise<FreecadSidecarStatus> | null = null
  private logStream: WriteStream | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private crashCount = 0

  getStatus(): FreecadSidecarStatus {
    return this.status
  }

  private setStatus(next: FreecadSidecarStatus) {
    this.status = next
    this.emit('status', next)
  }

  private log(line: string) {
    const stamped = `[${new Date().toISOString()}] ${line}\n`
    try {
      const path = this.logStream ? null : resolveLogFile()
      if (path) this.logStream = createWriteStream(path, { flags: 'a' })
      // Rotate if file exceeds 10 MB (checked every 64 writes to avoid stat overhead).
      if (this.logStream && this.logStream.bytesWritten > SIDECAR_LOG_MAX_BYTES) {
        const logPath = resolveLogFile()
        if (logPath) {
          this.logStream.end()
          this.logStream = null
          try { renameSync(logPath, `${logPath}.1`) } catch { /* best-effort */ }
          this.logStream = createWriteStream(logPath, { flags: 'a' })
        }
      }
      this.logStream?.write(stamped)
    } catch {
      /* logging must never throw */
    }
  }

  async start(): Promise<FreecadSidecarStatus> {
    if (this.readyPromise) return this.readyPromise
    this.setStatus({ state: 'booting' })
    this.log('start() requested')
    this.readyPromise = this.bootstrapWithRetries().catch((err: Error) => {
      const msg = err instanceof Error ? err.message : String(err)
      this.log(`bootstrap failed: ${msg}`)
      this.setStatus({ state: 'error', message: msg })
      this.readyPromise = null
      throw err
    })
    return this.readyPromise
  }

  /**
   * Hard-reset the sidecar and boot again. Safe to call from any state — if
   * the child is running it's torn down first. Unlike `start()`, this bypasses
   * the `readyPromise` memo so callers can force a fresh boot attempt after
   * an error has landed us in `state: error`.
   */
  async restart(): Promise<FreecadSidecarStatus> {
    this.log('restart() requested')
    this.shutdownInternal()
    return this.start()
  }

  private async bootstrapWithRetries(): Promise<FreecadSidecarStatus> {
    let lastErr: Error | null = null
    for (let attempt = 1; attempt <= SIDECAR_BOOT_RETRY_ATTEMPTS; attempt++) {
      // Re-assert booting before each attempt: a previous attempt's child-exit
      // handler may have flipped status to `error`, and we want the UI to
      // reflect that we're still trying.
      this.setStatus({ state: 'booting' })
      try {
        this.log(`bootstrap attempt ${attempt}/${SIDECAR_BOOT_RETRY_ATTEMPTS}`)
        const ready = await this.bootstrap()
        this.log(`sidecar ready (attempt ${attempt}): v${ready.state === 'ready' ? ready.version : '?'}`)
        return ready
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
        this.log(`attempt ${attempt} failed: ${lastErr.message}`)
        // Clean up anything partial before the next try so the server port /
        // child handles are released.
        this.shutdownInternal(/*preserveStatus*/ true)
        if (attempt < SIDECAR_BOOT_RETRY_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, SIDECAR_BOOT_RETRY_BACKOFF_MS))
        }
      }
    }
    throw lastErr ?? new Error('bootstrap failed')
  }

  private async bootstrap(): Promise<FreecadSidecarStatus> {
    const binary = resolveFreecadBinary()
    const runner = resolveRunnerScript()

    const port = await this.startServer()

    return new Promise<FreecadSidecarStatus>((resolvePromise, rejectPromise) => {
      const bootTimer = setTimeout(() => {
        rejectPromise(new Error(`FreeCAD sidecar did not boot within ${DEFAULT_BOOT_TIMEOUT_MS}ms`))
        this.shutdownInternal(/*preserveStatus*/ true)
      }, DEFAULT_BOOT_TIMEOUT_MS)

      const bootHandler = (response: FreecadResponse) => {
        if (response.id === '_boot' && response.type === 'ready') {
          clearTimeout(bootTimer)
          this.off('__raw', bootHandler)
          const ready: FreecadSidecarStatus = {
            state: 'ready',
            version: response.version,
            pythonVersion: response.python_version,
          }
          this.setStatus(ready)
          this.crashCount = 0
          this.startPingLoop()
          resolvePromise(ready)
        }
      }
      this.on('__raw', bootHandler)

      this.child = spawn(binary, ['--console', runner], {
        env: {
          ...process.env,
          BUILDOTO_SIDECAR_HOST: '127.0.0.1',
          BUILDOTO_SIDECAR_PORT: String(port),
          BUILDOTO_SIDECAR_TOKEN: this.token,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      this.child.stdout?.on('data', (b: Buffer) => {
        const line = b.toString().trimEnd()
        this.log(`stdout: ${line}`)
      })
      this.child.stderr?.on('data', (b: Buffer) => {
        const line = b.toString().trimEnd()
        console.error('[freecad stderr]', line)
        this.log(`stderr: ${line}`)
      })
      this.child.on('exit', (code, signal) => {
        this.child = null
        this.stopPingLoop()
        const reason = `freecadcmd exited (code=${code}, signal=${signal})`
        this.log(reason)
        for (const p of this.pending.values()) {
          clearTimeout(p.timer)
          p.reject(new Error(reason))
        }
        this.pending.clear()
        if (this.status.state !== 'stopped') {
          this.crashCount++
          if (this.crashCount <= SIDECAR_AUTO_RESTART_MAX_ATTEMPTS) {
            this.log(`auto-restart (attempt ${this.crashCount}/${SIDECAR_AUTO_RESTART_MAX_ATTEMPTS})`)
            this.setStatus({ state: 'booting' })
            this.bootstrap().catch((err: Error) => {
              const msg = err instanceof Error ? err.message : String(err)
              this.setStatus({ state: 'error', message: msg })
            })
          } else {
            this.setStatus({ state: 'error', message: reason })
          }
        }
      })
    })
  }

  private startServer(): Promise<number> {
    return new Promise((resolvePromise, rejectPromise) => {
      this.server = createServer((sock) => this.onConnection(sock))
      this.server.on('error', rejectPromise)
      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server!.address()
        if (!address || typeof address === 'string') return rejectPromise(new Error('sidecar: no TCP address'))
        resolvePromise(address.port)
      })
    })
  }

  private onConnection(sock: Socket) {
    this.socket = sock
    sock.setNoDelay(true)
    sock.on('data', (chunk) => this.consume(chunk))
    sock.on('close', () => {
      this.socket = null
    })
    sock.on('error', (err) => {
      console.error('[sidecar] socket error', err)
      this.log(`socket error: ${err.message}`)
    })
  }

  private consume(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    let idx: number
    while ((idx = this.buffer.indexOf(0x0a)) !== -1) {
      const line = this.buffer.subarray(0, idx).toString('utf8').trim()
      this.buffer = this.buffer.subarray(idx + 1)
      if (!line) continue
      try {
        const msg = JSON.parse(line) as FreecadResponse | { id: string; type: 'handshake'; token: string }
        if ('type' in msg && msg.type === 'handshake') {
          if ((msg as { token: string }).token !== this.token) {
            console.error('[sidecar] handshake token mismatch — dropping socket')
            this.socket?.destroy()
          }
          continue
        }
        const response = msg as FreecadResponse
        this.emit('__raw', response)
        const pending = this.pending.get(response.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pending.delete(response.id)
          pending.resolve(response)
        }
      } catch (err) {
        console.error('[sidecar] invalid JSON line', err, line)
      }
    }
  }

  async request(req: FreecadRequest, timeoutMs = SIDECAR_REQUEST_DEFAULT_TIMEOUT_MS): Promise<FreecadResponse> {
    if (this.status.state !== 'ready') {
      throw new Error(`FreeCAD pas prêt (état=${this.status.state})`)
    }
    if (!this.socket) throw new Error('FreeCAD : socket non connectée')
    return new Promise<FreecadResponse>((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending.delete(req.id)
        rejectPromise(new Error(`FreeCAD request ${req.type} (${req.id}) timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      this.pending.set(req.id, { resolve: resolvePromise, reject: rejectPromise, timer })
      this.socket!.write(JSON.stringify(req) + '\n', (err) => {
        if (err) {
          clearTimeout(timer)
          this.pending.delete(req.id)
          rejectPromise(err)
        }
      })
    })
  }

  private startPingLoop() {
    this.stopPingLoop()
    this.pingTimer = setInterval(() => {
      if (this.socket && this.status.state === 'ready') {
        this.request({ id: `ping-${Date.now()}`, type: 'ping' }, SIDECAR_PING_TIMEOUT_MS)
          .then((res) => {
            if (res.type !== 'pong') this.onPingFail()
          })
          .catch(() => this.onPingFail())
      }
    }, SIDECAR_PING_INTERVAL_MS)
  }

  private stopPingLoop() {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private onPingFail() {
    if (this.status.state !== 'ready') return
    this.crashCount++
    this.log(`ping failed (crash #${this.crashCount})`)
    if (this.crashCount <= SIDECAR_AUTO_RESTART_MAX_ATTEMPTS) {
      this.shutdownInternal(true)
      this.setStatus({ state: 'booting' })
      this.bootstrap().catch((err: Error) => {
        const msg = err instanceof Error ? err.message : String(err)
        this.setStatus({ state: 'error', message: msg })
      })
    } else {
      this.setStatus({ state: 'error', message: 'freecadcmd ping failed' })
    }
  }

  async stop(): Promise<void> {
    if (this.status.state === 'stopped') return
    try {
      this.stopPingLoop()
      if (this.socket && this.status.state === 'ready') {
        await this.request({ id: `shutdown-${Date.now()}`, type: 'shutdown' }, SIDECAR_SHUTDOWN_TIMEOUT_MS).catch(() => undefined)
      }
    } finally {
      this.shutdownInternal()
    }
  }

  // `preserveStatus` keeps the current `status` intact so retry attempts
  // don't flap the renderer between `stopped` and `booting` between tries.
  private shutdownInternal(preserveStatus = false) {
    if (this.child) {
      try {
        this.child.kill('SIGTERM')
      } catch {
        /* ignore */
      }
      this.child = null
    }
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    if (this.server) {
      this.server.close()
      this.server = null
    }
    this.buffer = Buffer.alloc(0)
    this.pending.clear()
    if (!preserveStatus) this.setStatus({ state: 'stopped' })
    this.readyPromise = null
  }
}

export const freecadSidecar = new FreecadSidecar()
