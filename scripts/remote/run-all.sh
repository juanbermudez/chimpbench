#!/usr/bin/env bash
# Runs, in order and resumably: the determinism check, the combined proof (simulation steps only), the C9 proof and C11.
#   scripts/remote/run-all.sh [--out DIR] [--workers N] [--from verify|proof|c9|c11] [--smoke]
# --smoke: a few minutes of plumbing (verify, proof --dry-run, C9 for 3 days on direction-check seed 31) into DIR/smoke;
# marks nothing done. Run it first on a new machine.
# Every artifact goes under DIR (default ./remote-run), with manifest.json (commit, protocol hash, machine) and
# stages.done (finished stages). Re-running skips finished stages; --from restarts at a stage.
set -euo pipefail
cd "$(dirname "$0")/../.."
# V8 caps each heap (one per worker thread) near 4 GB by default; the flag also sets the worker-thread limit.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192"
OUT=./remote-run; WORKERS=$(nproc 2>/dev/null || sysctl -n hw.ncpu); FROM=""; SMOKE=0
while [ $# -gt 0 ]; do case "$1" in --out) OUT=$2; shift 2;; --workers) WORKERS=$2; shift 2;; --from) FROM=$2; shift 2;; --smoke) SMOKE=1; shift;; *) echo "unknown option $1" >&2; exit 2;; esac; done
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
if [ $SMOKE -eq 1 ]; then
  S="$OUT/smoke"; rm -rf "$S"; mkdir -p "$S"
  pnpm exec tsx scripts/remote/verify.ts
  pnpm exec tsx scripts/proof.ts --dry-run --remote --parallel --workers "$WORKERS" --out "$S/proof"
  pnpm exec tsx scripts/c9-scenario.ts --kinds baseline,large --seeds 31 --days 3 --workers 2 --out "$S/c9" >/dev/null
  echo "smoke ok: $S"; exit 0
fi
commit=$(git rev-parse HEAD 2>/dev/null || cat BUNDLE_COMMIT)
protocol=$(pnpm exec tsx scripts/field-metrics.ts --protocol-hash 2>/dev/null | awk '{print $1}')
if [ -f "$OUT/manifest.json" ]; then
  # Never mix outputs of two builds in one folder.
  grep -q "\"commit\": \"$commit\"" "$OUT/manifest.json" && grep -q "\"protocol\": \"$protocol\"" "$OUT/manifest.json" \
    || { echo "$OUT holds a run of another commit or protocol: use a new --out" >&2; exit 2; }
else printf '{\n "commit": "%s",\n "protocol": "%s",\n "node": "%s",\n "cpus": %s,\n "workers": %s,\n "started": "%s"\n}\n' "$commit" "$protocol" "$(node -v)" "$(nproc 2>/dev/null || echo 0)" "$WORKERS" "$(date -u +%FT%TZ)" > "$OUT/manifest.json"
fi
touch "$OUT/stages.done"
stages=(verify proof c9 c11); started=0; [ -z "$FROM" ] && started=1
run_stage() {
  local s=$1
  if [ $started -eq 0 ]; then [ "$s" = "$FROM" ] && started=1 || return 0; fi
  if [ -z "$FROM" ] && grep -qx "$s" "$OUT/stages.done"; then echo "== $s: done earlier, skipped"; return 0; fi
  echo "== $s ($(date -u +%FT%TZ))"
  case $s in
    verify) pnpm exec tsx scripts/remote/verify.ts | tee "$OUT/verify.log" ;;
    proof)  pnpm exec tsx scripts/proof.ts --run --remote --parallel --resume --workers "$WORKERS" --out "$OUT/proof" ;;
    c9)     pnpm exec tsx scripts/c9-scenario.ts --years 40 --workers "$WORKERS" --out "$OUT/c9" ;;
    c11)    # Contract for the C11 build: scripts/c11-run.ts runs screening, calibration and validation, honouring --workers, --out and --resume.
            if [ -f scripts/c11-run.ts ]; then pnpm exec tsx scripts/c11-run.ts --workers "$WORKERS" --out "$OUT/c11" --resume
            else echo "C11 is not built yet (scripts/c11-run.ts missing): stage left open"; return 0; fi ;;
  esac
  echo "$s" >> "$OUT/stages.done"
}
for s in "${stages[@]}"; do run_stage "$s"; done
echo "finished: $OUT (copy it back; run the local steps there: pnpm exec tsx scripts/proof.ts --run --out <copy>/proof --only compare-ranging,compare-movement,compare-gombe-paths,compare-patrols,guide-data)"
