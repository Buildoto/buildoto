/**
 * Generate electron-builder icon assets from brand/icon-source.png.
 *
 * On macOS, uses sips + iconutil (native tools) for .icns + all sizes.
 * On Linux/Windows, copies the source PNG as build/icon-1024.png and lets
 * electron-builder auto-convert to .ico and platform formats.
 *
 * source: brand/icon-source.png
 * Output:
 *   build/icon-1024.png        (shared source, all platforms)
 *   build/icon.icns             (macOS only)
 *   build/icons/{64,128,256,512}.png  (Linux)
 */

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { platform } from 'node:os'

const ROOT = resolve(process.cwd())
const SRC = resolve(ROOT, 'brand/icon-source.png')
const OUT = resolve(ROOT, 'build')

async function main() {
  if (!existsSync(SRC)) {
    console.log('[icons] brand/icon-source.png missing — skipping.')
    return
  }

  mkdirSync(OUT, { recursive: true })
  mkdirSync(resolve(OUT, 'icons'), { recursive: true })

  if (platform() === 'darwin') {
    // macOS: use sips + iconutil
    const ICONSET_DIR = '/tmp/buildoto-icon.iconset'
    rmSync(ICONSET_DIR, { recursive: true, force: true })
    mkdirSync(ICONSET_DIR, { recursive: true })

    const sizes = [16, 32, 48, 64, 128, 256, 512]
    for (const size of sizes) {
      execSync(`sips -z ${size} ${size} "${SRC}" --out "${ICONSET_DIR}/icon_${size}x${size}.png"`, { stdio: 'ignore' })
      const retina = size * 2
      execSync(`sips -z ${retina} ${retina} "${SRC}" --out "${ICONSET_DIR}/icon_${size}x${size}@2x.png"`, { stdio: 'ignore' })
    }

    execSync(`sips -z 1024 1024 "${SRC}" --out "${ICONSET_DIR}/icon_512x512@2x.png"`, { stdio: 'ignore' })
    execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${OUT}/icon.icns"`, { stdio: 'ignore' })
    console.log('[icons] build/icon.icns')

    copyFileSync(`${ICONSET_DIR}/icon_512x512@2x.png`, `${OUT}/icon-1024.png`)

    for (const size of [64, 128, 256, 512]) {
      copyFileSync(`${ICONSET_DIR}/icon_${size}x${size}.png`, `${OUT}/icons/${size}x${size}.png`)
    }

    rmSync(ICONSET_DIR, { recursive: true, force: true })
  } else {
    // Linux / Windows: copy source PNG, electron-builder auto-converts
    copyFileSync(SRC, `${OUT}/icon-1024.png`)
  }

  console.log('[icons] build/icon-1024.png')
  console.log('[icons] done.')
}

main().catch((err) => {
  console.error('[icons] failed:', err.message)
  process.exit(1)
})
