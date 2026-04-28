/**
 * Generate electron-builder icon assets from brand/icon-source.png.
 *
 * Pipeline:
 *   1. Resize source PNG to all required sizes using sips (macOS built-in)
 *   2. Create .iconset → .icns (macOS) via iconutil
 *   3. Copy Linux PNGs to build/icons/
 *   4. electron-builder auto-converts build/icon-1024.png → .ico (Windows)
 *
 * source: brand/icon-source.png
 * Output:
 *   build/icon-1024.png        (shared source for all platforms)
 *   build/icon.icns             (macOS)
 *   build/icons/{64,128,256,512}.png  (Linux)
 */

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = resolve(process.cwd())
const SRC = resolve(ROOT, 'brand/icon-source.png')
const OUT = resolve(ROOT, 'build')
const ICONSET_DIR = '/tmp/buildoto-icon.iconset'

async function main() {
  if (!existsSync(SRC)) {
    console.log(`[icons] brand/icon-source.png missing — skipping.`)
    return
  }

  mkdirSync(OUT, { recursive: true })
  mkdirSync(resolve(OUT, 'icons'), { recursive: true })
  rmSync(ICONSET_DIR, { recursive: true, force: true })
  mkdirSync(ICONSET_DIR, { recursive: true })

  // macOS: generate .iconset
  const sizes = [16, 32, 48, 64, 128, 256, 512]
  for (const size of sizes) {
    execSync(`sips -z ${size} ${size} "${SRC}" --out "${ICONSET_DIR}/icon_${size}x${size}.png"`, { stdio: 'ignore' })
    const retina = size * 2
    execSync(`sips -z ${retina} ${retina} "${SRC}" --out "${ICONSET_DIR}/icon_${size}x${size}@2x.png"`, { stdio: 'ignore' })
  }

  // 1024×1024 for .ico auto-convert + retina 512
  execSync(`sips -z 1024 1024 "${SRC}" --out "${ICONSET_DIR}/icon_512x512@2x.png"`, { stdio: 'ignore' })

  // macOS: .icns via iconutil
  execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${OUT}/icon.icns"`, { stdio: 'ignore' })
  console.log('[icons] build/icon.icns')

  // Shared 1024×1024 PNG for macOS + Windows (electron-builder auto-converts to .ico)
  copyFileSync(`${ICONSET_DIR}/icon_512x512@2x.png`, `${OUT}/icon-1024.png`)
  console.log('[icons] build/icon-1024.png')

  // Linux: PNGs in build/icons/
  for (const size of [64, 128, 256, 512]) {
    copyFileSync(`${ICONSET_DIR}/icon_${size}x${size}.png`, `${OUT}/icons/${size}x${size}.png`)
  }
  console.log('[icons] build/icons/*.png')

  // Cleanup
  rmSync(ICONSET_DIR, { recursive: true, force: true })
}

main().catch((err) => {
  console.error('[icons] failed:', err.message)
  process.exit(1)
})
