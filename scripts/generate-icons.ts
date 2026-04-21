/**
 * Generate electron-builder icon assets from brand/icon.png.
 *
 * Output:
 *   build/icon.icns       (macOS)
 *   build/icon.ico        (Windows)
 *   build/icons/*.png     (Linux — multiple sizes)
 *
 * This script is best-effort for alpha: it requires `electron-icon-builder` to
 * be installed (devDependency added later). Until a source PNG + the generator
 * are available, the script exits cleanly with a warning so `pnpm package:*`
 * doesn't crash on a fresh checkout.
 */

import { existsSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = resolve(process.cwd())
const SOURCE = resolve(ROOT, 'brand/icon.png')
const OUT = resolve(ROOT, 'build')

async function main() {
  if (!existsSync(SOURCE)) {
    console.log(`[icons] brand/icon.png missing — skipping icon generation.`)
    return
  }
  mkdirSync(OUT, { recursive: true })

  const child = spawn(
    'npx',
    ['electron-icon-builder', `--input=${SOURCE}`, `--output=${OUT}`, '--flatten'],
    { stdio: 'inherit' },
  )
  const exitCode: number = await new Promise((done) => child.on('close', done))
  if (exitCode !== 0) {
    console.error(`[icons] generator exited with code ${exitCode}`)
    process.exit(exitCode)
  }
  console.log('[icons] done.')
}

main().catch((err) => {
  console.error('[icons] failed:', err)
  process.exit(1)
})
