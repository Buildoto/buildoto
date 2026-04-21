import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_BOOT_TIMEOUT_MS,
  type FreecadRequest,
  type FreecadResponse,
  type FreecadSidecarStatus,
} from '@buildoto/shared'

// `electron` is only available under the Electron runtime. When the sidecar is
// used from a plain Node script (e.g. smoke test via tsx), fall back to
// unpackaged paths relative to cwd.
function electronApp(): { isPackaged: boolean; resourcesPath?: string } | null {
  try {
    const req = createRequire(import.meta.url)
    const mod = req('electron') as typeof import('electron')
    if (mod && typeof mod === 'object' && 'app' in mod && mod.app) return mod.app
    return null
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

function currentTarget(): TargetKey {
  const p = process.platform
  const a = process.arch
  if (p === 'darwin' && a === 'arm64') return 'darwin-arm64'
  if (p === 'darwin' && a === 'x64') return 'darwin-x64'
  if (p === 'linux' && a === 'x64') return 'linux-x64'
  if (p === 'win32' && a === 'x64') return 'win32-x64'
  throw new Error(`Unsupported platform: ${p}-${a}`)
}

function resolveFreecadBinary(): string {
  const target = currentTarget()
  const exe = target.startsWith('win32') ? 'freecadcmd.exe' : 'freecadcmd'
  const app = electronApp()

  const candidates = app?.isPackaged
    ? [join(app.resourcesPath!, 'freecad', 'bin', exe)]
    : [
        resolve(__dirname, '../../../../resources/freecad', target, 'bin', exe),
        resolve(process.cwd(), 'resources/freecad', target, 'bin', exe),
      ]
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`freecadcmd not found. Looked at:\n  - ${candidates.join('\n  - ')}`)
  return found
}

function resolveRunnerScript(): string {
  const app = electronApp()
  const candidates = app?.isPackaged
    ? [join(app.resourcesPath!, 'freecad', 'runner.py')]
    : [
        resolve(__dirname, '../../../../resources/freecad/runner.py'),
        resolve(process.cwd(), 'resources/freecad/runner.py'),
      ]
  const found = candidates.find(existsSync)
  if (!found) throw new Error(`runner.py not found. Looked at:\n  - ${candidates.join('\n  - ')}`)
  return found
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

  getStatus(): FreecadSidecarStatus {
    return this.status
  }

  private setStatus(next: FreecadSidecarStatus) {
    this.status = next
    this.emit('status', next)
  }

  async start(): Promise<FreecadSidecarStatus> {
    if (this.readyPromise) return this.readyPromise
    this.setStatus({ state: 'booting' })
    this.readyPromise = this.bootstrap().catch((err: Error) => {
      const msg = err instanceof Error ? err.message : String(err)
      this.setStatus({ state: 'error', message: msg })
      this.readyPromise = null
      throw err
    })
    return this.readyPromise
  }

  private async bootstrap(): Promise<FreecadSidecarStatus> {
    const binary = resolveFreecadBinary()
    const runner = resolveRunnerScript()

    const port = await this.startServer()

    return new Promise<FreecadSidecarStatus>((resolvePromise, rejectPromise) => {
      const bootTimer = setTimeout(() => {
        rejectPromise(new Error(`FreeCAD sidecar did not boot within ${DEFAULT_BOOT_TIMEOUT_MS}ms`))
        this.shutdownInternal()
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
      this.child.stdout?.on('data', (b: Buffer) => console.log('[freecad stdout]', b.toString().trimEnd()))
      this.child.stderr?.on('data', (b: Buffer) => console.error('[freecad stderr]', b.toString().trimEnd()))
      this.child.on('exit', (code, signal) => {
        this.child = null
        const reason = `freecadcmd exited (code=${code}, signal=${signal})`
        for (const p of this.pending.values()) {
          clearTimeout(p.timer)
          p.reject(new Error(reason))
        }
        this.pending.clear()
        if (this.status.state !== 'stopped') {
          this.setStatus({ state: 'error', message: reason })
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

  async request(req: FreecadRequest, timeoutMs = 60_000): Promise<FreecadResponse> {
    if (this.status.state !== 'ready') {
      throw new Error(`FreeCAD sidecar not ready (state=${this.status.state})`)
    }
    if (!this.socket) throw new Error('FreeCAD sidecar socket not connected')
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

  async stop(): Promise<void> {
    if (this.status.state === 'stopped') return
    try {
      if (this.socket && this.status.state === 'ready') {
        await this.request({ id: `shutdown-${Date.now()}`, type: 'shutdown' }, 2_000).catch(() => undefined)
      }
    } finally {
      this.shutdownInternal()
    }
  }

  private shutdownInternal() {
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
    this.setStatus({ state: 'stopped' })
    this.readyPromise = null
  }
}

export const freecadSidecar = new FreecadSidecar()
