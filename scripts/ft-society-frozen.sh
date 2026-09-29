#!/bin/sh
# Stage F6 on a frozen copy of the code. Other agents edit src/sim while realism stages run, and a ~5 h run must not
# see a half-finished edit. Waits until the sim is quiet (no sim/server/decision edits for QUIET_MIN minutes) and a
# world builds and ticks, then copies the code (node_modules and artifacts are linked, so results land in the real
# artifacts/) and runs scripts/ft-society-all.sh there. Every result records the sim code hash it ran on.
#   QUIET_MIN=10 DAYS=3 SEEDS="4001 4002" scripts/ft-society-frozen.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="${SNAP:-$ROOT/artifacts/decide-ft/snapshot}"
QUIET_MIN="${QUIET_MIN:-10}"
cd "$ROOT"
healthy() {
  [ -z "$(find src/sim src/decision.ts src/types.ts server -name '*.ts' -mmin -"$QUIET_MIN" 2>/dev/null)" ] &&
    pnpm exec tsx -e "import('./src/simulation').then(m => { const w = m.createWorld(4001); for (let i = 0; i < 5760; i++) m.tickWorld(w); })" >/dev/null 2>&1
}
until healthy; do echo "$(date +%H:%M) sim busy or broken; waiting"; sleep 300; done
rm -rf "$SNAP"; mkdir -p "$SNAP"
cp -R src server scripts training data package.json tsconfig.json "$SNAP"/
ln -s "$ROOT/node_modules" "$SNAP/node_modules"
ln -s "$ROOT/artifacts" "$SNAP/artifacts"
echo "$(date +%H:%M) frozen at $SNAP; running"
exec "$SNAP/scripts/ft-society-all.sh"
