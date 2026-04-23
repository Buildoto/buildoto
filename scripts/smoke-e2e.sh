#!/usr/bin/env bash
# End-to-end smoke test — runs the full "can Buildoto onboard + call the
# agent" chain without user intervention. The only externally-supplied input
# is the BUILDOTO_AI_JWT env var for the LLM step; everything else runs
# against local code.
#
# What it checks, in order:
#   1. ESLint clean
#   2. TypeScript strict check
#   3. sanitize-history guard unit asserts (orphan tool_call repair)
#   4. FreeCAD sidecar boots + responds to ping (catches missing runner.py /
#      broken Python env)
#   5. (optional) Full LLM round-trip against buildoto-ai when
#      BUILDOTO_AI_JWT is set
#   6. Unsigned production build + install into /Applications/Buildoto.app
#   7. App launches and the process stays alive
#
# Exit 0 means everything needed to ship an iteration is green. Any failed
# step aborts with a non-zero exit and a clear tag.
#
# Usage:
#   ./scripts/smoke-e2e.sh              # skips LLM step
#   BUILDOTO_AI_JWT=eyJ… ./scripts/smoke-e2e.sh

set -euo pipefail

cd "$(dirname "$0")/.."

step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

step "1/7 pnpm lint"
pnpm lint

step "2/7 pnpm type-check"
pnpm type-check

step "3/7 sanitize-history unit asserts"
pnpm tsx packages/main/src/__smoke__/sanitize-history-check.ts

step "4/7 FreeCAD sidecar ping"
pnpm tsx packages/main/src/__smoke__/sidecar-tool-call.ts

if [[ -n "${BUILDOTO_AI_JWT:-}" ]]; then
  step "5/7 Buildoto AI round-trip (LLM)"
  pnpm tsx packages/main/src/__smoke__/buildoto-ai-turn.ts
else
  step "5/7 Buildoto AI round-trip — SKIPPED (BUILDOTO_AI_JWT not set)"
fi

step "6/7 build + install unsigned .app"
./scripts/install-local.sh

step "7/7 launch + liveness check"
open /Applications/Buildoto.app
# Give Electron a moment to fully start the main process. 5s is ample on
# warm cache; we loop-probe `pgrep` so a slower boot still passes.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if pgrep -x Buildoto >/dev/null; then
    echo "Buildoto is running (pid: $(pgrep -x Buildoto))"
    break
  fi
  sleep 1
  if [[ $i == 10 ]]; then
    echo "Buildoto did not appear in pgrep within 10s" >&2
    exit 1
  fi
done

echo ""
echo "✓ all green — iteration ready for manual validation"
