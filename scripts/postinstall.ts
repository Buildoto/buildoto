#!/usr/bin/env tsx
// Downloads + extracts the FreeCAD portable binary for the current OS/arch (or a
// specific target when invoked with --target=<key> in CI). Idempotent: skips if
// `resources/freecad/<target>/bin/freecadcmd[.exe]` already exists.

import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { chmod, cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, platform as osPlatform } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const VERSION_FILE = join(ROOT, 'scripts/freecad-version.json')
const RESOURCES_DIR = join(ROOT, 'resources/freecad')
const CACHE_DIR = join(homedir(), '.buildoto-cache/freecad')

type TargetKey = 'darwin-arm64' | 'darwin-x64' | 'linux-x64' | 'win32-x64'
const ALL_TARGETS: TargetKey[] = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64']

interface VersionManifest {
  version: string
  releaseTag: string
  assetPatterns: Record<TargetKey, string>
  sha256: Partial<Record<TargetKey, string>>
}

interface GithubAsset {
  name: string
  browser_download_url: string
  size: number
}

function detectTarget(): TargetKey {
  const p = osPlatform()
  const a = process.arch
  if (p === 'darwin' && a === 'arm64') return 'darwin-arm64'
  if (p === 'darwin' && a === 'x64') return 'darwin-x64'
  if (p === 'linux' && a === 'x64') return 'linux-x64'
  if (p === 'win32' && a === 'x64') return 'win32-x64'
  throw new Error(`Unsupported platform: ${p}-${a}`)
}

function parseTargetArg(): TargetKey | null {
  const arg = process.argv.find((a) => a.startsWith('--target='))
  if (!arg) return null
  const value = arg.slice('--target='.length) as TargetKey
  if (!ALL_TARGETS.includes(value)) throw new Error(`Invalid --target: ${value}`)
  return value
}

async function loadManifest(): Promise<VersionManifest> {
  const raw = await readFile(VERSION_FILE, 'utf8')
  return JSON.parse(raw) as VersionManifest
}

async function saveManifest(m: VersionManifest): Promise<void> {
  await writeFile(VERSION_FILE, JSON.stringify(m, null, 2) + '\n')
}

function binaryPath(target: TargetKey): string {
  const name = target.startsWith('win32') ? 'freecadcmd.exe' : 'freecadcmd'
  return join(RESOURCES_DIR, target, 'bin', name)
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function sha256File(p: string): Promise<string> {
  const hash = createHash('sha256')
  await pipeline(createReadStream(p), hash)
  return hash.digest('hex')
}

async function fetchRelease(tag: string): Promise<GithubAsset[]> {
  const url = `https://api.github.com/repos/FreeCAD/FreeCAD/releases/tags/${tag}`
  // Anonymous API is capped at 60 req/hour per shared runner IP — easily hit in
  // CI when multiple targets fetch back-to-back. Authenticate when GH_TOKEN or
  // GITHUB_TOKEN is present to bump the limit to 5000/hour.
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  const headers: Record<string, string> = {
    'User-Agent': 'buildoto-postinstall',
    Accept: 'application/vnd.github+json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GitHub release ${tag} fetch failed: ${res.status} ${res.statusText}`)
  const json = (await res.json()) as { assets?: GithubAsset[] }
  if (!json.assets?.length) throw new Error(`No assets found for release ${tag}`)
  return json.assets
}

async function downloadAsset(asset: GithubAsset, destPath: string): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true })
  console.log(`[postinstall] downloading ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)`)
  const res = await fetch(asset.browser_download_url, {
    headers: { 'User-Agent': 'buildoto-postinstall' },
  })
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status} ${res.statusText}`)
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(destPath))
}

function sh(cmd: string, args: string[], opts?: { cwd?: string }): void {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: opts?.cwd })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed with code ${r.status}`)
}

async function extractDmg(dmgPath: string, target: TargetKey): Promise<void> {
  const mountPoint = join(CACHE_DIR, `mnt-${target}-${Date.now()}`)
  await mkdir(mountPoint, { recursive: true })
  sh('hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mountPoint, dmgPath])
  try {
    const appPath = join(mountPoint, 'FreeCAD.app')
    if (!(await exists(appPath))) throw new Error(`FreeCAD.app not found inside ${dmgPath}`)
    const destApp = join(RESOURCES_DIR, target, 'FreeCAD.app')
    await rm(join(RESOURCES_DIR, target), { recursive: true, force: true })
    await mkdir(join(RESOURCES_DIR, target), { recursive: true })
    await cp(appPath, destApp, { recursive: true, dereference: false, verbatimSymlinks: true })
    await mkdir(join(RESOURCES_DIR, target, 'bin'), { recursive: true })
    const binSrc = join(destApp, 'Contents/Resources/bin/freecadcmd')
    if (!(await exists(binSrc))) throw new Error(`freecadcmd not found at ${binSrc}`)
    // Symlink bin/freecadcmd → .app/Contents/Resources/bin/freecadcmd (relative)
    await writeFile(
      join(RESOURCES_DIR, target, 'bin', 'freecadcmd.sh'),
      `#!/bin/sh\nexec "$(dirname "$0")/../FreeCAD.app/Contents/Resources/bin/freecadcmd" "$@"\n`,
    )
    await chmod(join(RESOURCES_DIR, target, 'bin', 'freecadcmd.sh'), 0o755)
    // Provide `freecadcmd` (no extension) pointing at the shim so callers can use the same name on mac/linux.
    await rename(join(RESOURCES_DIR, target, 'bin', 'freecadcmd.sh'), join(RESOURCES_DIR, target, 'bin', 'freecadcmd'))
  } finally {
    sh('hdiutil', ['detach', mountPoint, '-force'])
    await rm(mountPoint, { recursive: true, force: true })
  }
}

async function extractAppImage(appImagePath: string, target: TargetKey): Promise<void> {
  const workDir = join(CACHE_DIR, `extract-${target}-${Date.now()}`)
  await mkdir(workDir, { recursive: true })
  await chmod(appImagePath, 0o755)
  sh(appImagePath, ['--appimage-extract'], { cwd: workDir })
  const squashfsRoot = join(workDir, 'squashfs-root')
  const destDir = join(RESOURCES_DIR, target)
  await rm(destDir, { recursive: true, force: true })
  await mkdir(destDir, { recursive: true })
  await cp(join(squashfsRoot, 'usr'), destDir, { recursive: true })
  await rm(workDir, { recursive: true, force: true })
  // After copy, freecadcmd is at resources/freecad/linux-x64/bin/freecadcmd
}

async function extractSevenZip(sevenZPath: string, target: TargetKey): Promise<void> {
  const { default: seven } = await import('7zip-min')
  const destDir = join(RESOURCES_DIR, target)
  await rm(destDir, { recursive: true, force: true })
  await mkdir(destDir, { recursive: true })
  await new Promise<void>((res, rej) => {
    seven.unpack(sevenZPath, destDir, (err: Error | null) => (err ? rej(err) : res()))
  })
  // The 7z archive contains a single top-level folder like `FreeCAD_1.1.0-Windows-x86_64-py311/`.
  // Flatten it so binaries sit directly under `resources/freecad/win32-x64/bin/`.
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(destDir)
  if (entries.length === 1) {
    const inner = join(destDir, entries[0]!)
    const innerEntries = await readdir(inner)
    for (const name of innerEntries) await rename(join(inner, name), join(destDir, name))
    await rm(inner, { recursive: true, force: true })
  }
}

async function processTarget(target: TargetKey, manifest: VersionManifest): Promise<void> {
  if (await exists(binaryPath(target))) {
    console.log(`[postinstall] ${target}: already installed, skipping`)
    return
  }

  const pattern = new RegExp(manifest.assetPatterns[target])
  const assets = await fetchRelease(manifest.releaseTag)
  const asset = assets.find((a) => pattern.test(a.name))
  if (!asset) {
    throw new Error(
      `[postinstall] ${target}: no asset matching ${pattern} in release ${manifest.releaseTag}. ` +
        `Available: ${assets.map((a) => a.name).join(', ')}`,
    )
  }

  await mkdir(CACHE_DIR, { recursive: true })
  const cachePath = join(CACHE_DIR, `${manifest.version}-${asset.name}`)

  if (!(await exists(cachePath))) {
    await downloadAsset(asset, cachePath)
  } else {
    console.log(`[postinstall] ${target}: using cached ${cachePath}`)
  }

  const actualHash = await sha256File(cachePath)
  const expectedHash = manifest.sha256[target]
  if (expectedHash && expectedHash !== actualHash) {
    await rm(cachePath, { force: true })
    throw new Error(
      `[postinstall] ${target}: SHA256 mismatch (expected ${expectedHash}, got ${actualHash}). Cache cleared, re-run install.`,
    )
  }
  if (!expectedHash) {
    manifest.sha256[target] = actualHash
    await saveManifest(manifest)
    console.log(`[postinstall] ${target}: recorded SHA256 ${actualHash}`)
  } else {
    console.log(`[postinstall] ${target}: SHA256 verified`)
  }

  console.log(`[postinstall] ${target}: extracting…`)
  if (target.startsWith('darwin')) await extractDmg(cachePath, target)
  else if (target === 'linux-x64') await extractAppImage(cachePath, target)
  else if (target === 'win32-x64') await extractSevenZip(cachePath, target)

  if (!(await exists(binaryPath(target)))) {
    throw new Error(`[postinstall] ${target}: extraction produced no freecadcmd binary at ${binaryPath(target)}`)
  }
  console.log(`[postinstall] ${target}: ready at ${binaryPath(target)}`)
}

async function main() {
  if (process.env.BUILDOTO_SKIP_FREECAD === '1') {
    console.log('[postinstall] BUILDOTO_SKIP_FREECAD=1 — skipping FreeCAD download')
    return
  }
  const manifest = await loadManifest()
  const targets: TargetKey[] = parseTargetArg() ? [parseTargetArg()!] : [detectTarget()]
  for (const target of targets) {
    try {
      await processTarget(target, manifest)
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
      process.exitCode = 1
    }
  }
}

void main()
