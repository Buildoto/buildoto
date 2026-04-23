#!/usr/bin/env tsx
// Headless sidecar health check — boots freecadcmd + runner.py directly,
// waits for the ready handshake, issues a ping, asserts a pong comes back,
// and shuts down. No Electron, no LLM, no renderer.
//
// This catches the "DMG ships without runner.py" class of failures at the
// CI level, before the user ever clicks a button.
//
// Usage: pnpm tsx packages/main/src/__smoke__/sidecar-tool-call.ts

import { freecadSidecar } from '../freecad/sidecar'

const BOOT_TIMEOUT_MS = 20_000
const PING_TIMEOUT_MS = 5_000

async function main(): Promise<void> {
  console.log('[sidecar-smoke] starting FreeCAD sidecar…')

  const bootDeadline = setTimeout(() => {
    console.error(`[sidecar-smoke] boot did not complete within ${BOOT_TIMEOUT_MS}ms`)
    process.exit(1)
  }, BOOT_TIMEOUT_MS)

  let ready
  try {
    ready = await freecadSidecar.start()
  } catch (err) {
    clearTimeout(bootDeadline)
    console.error('[sidecar-smoke] FAIL — sidecar boot failed:', err)
    process.exit(1)
  }
  clearTimeout(bootDeadline)

  if (ready.state !== 'ready') {
    console.error('[sidecar-smoke] FAIL — unexpected state:', ready)
    await freecadSidecar.stop().catch(() => undefined)
    process.exit(1)
  }
  console.log(
    `[sidecar-smoke] ready — FreeCAD v${ready.version}, Python ${ready.pythonVersion}`,
  )

  try {
    const res = await freecadSidecar.request(
      { id: `smoke-ping-${Date.now()}`, type: 'ping' },
      PING_TIMEOUT_MS,
    )
    if (res.type !== 'pong') {
      console.error('[sidecar-smoke] FAIL — ping expected pong, got:', res)
      process.exit(1)
    }
    console.log('[sidecar-smoke] ping → pong OK')
  } catch (err) {
    console.error('[sidecar-smoke] FAIL — ping errored:', err)
    process.exit(1)
  } finally {
    await freecadSidecar.stop().catch(() => undefined)
  }

  console.log('[sidecar-smoke] OK')
}

main().catch((err) => {
  console.error('[sidecar-smoke] uncaught:', err)
  void freecadSidecar.stop().catch(() => undefined)
  process.exit(1)
})
