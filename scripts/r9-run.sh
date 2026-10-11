#!/bin/sh
# Stage R9 (docs/staging/r9-prereg.md §4 and §9): every run of the decode test, one model process at a time. Before a
# model load it writes the load and the swap in use, holds while swap in use is above 6 GB (re-checked every minute for
# up to 30 minutes, then it goes ahead and says so) and refuses to start while another model process of this project
# (anything run by the model runtime's interpreter: a worker, a trainer, a scorer) is alive. It stops at the first
# failed step; a replay that does not reproduce its run is a failed step.
#
#   no model:
#   scripts/r9-run.sh dry                   the plumbing check: seed 48, one day on the rules, one day per arm, every arm replayed
#   scripts/r9-run.sh wire                  the wiring check: the model arms' own path (worker process, guarded scorer, GLiNER kernel, receipts, replay) against a fake worker that holds no model
#   scripts/r9-run.sh reference <seed>      step 0: the rules and three re-draws re-run, the saved top-pick arms replayed with the decode's counters; each must end on its saved hash
#   scripts/r9-run.sh predict               the offline replay over the saved probabilities -> r9-offline.md (needs `reference 21` and `reference 5`)
#   scripts/r9-run.sh report                r9-numbers.md from the arms on file
#   scripts/r9-run.sh publish               copy the generated tables into docs/staging, once, after the last model step; then commit them
#   scripts/r9-run.sh check                 the pre-flight of a model step, starting nothing: the folders and adapters it would use, the swap, other model processes
#   model (the integrator; <seed> is 21 or 5):
#   scripts/r9-run.sh core <seed>           step 1: draw (salt 1), held for the act, held for the half hour, for both adapters, and draw (salt 2) for the first; then their replays
#   scripts/r9-run.sh gateoff <seed>        step 2: held for the act with the gate off, both adapters; then their replays
#   scripts/r9-run.sh seed2 <seed>          step 3: the first recipe's second training seed (scripts/r9-seed2.sh), top pick and draw; then their replays
#   scripts/r9-run.sh arms <seed> <a,b,…>   any arms of scripts/r9-loop.ts in one worker process; then their replays
#   scripts/r9-run.sh replay <seed> <a,b,…> no model: replay arms already on file from their receipts (for a model step that was cut short before its replays)
#
# Generated tables (r9-dry.md, r9-offline.md, r9-numbers.md, and scripts/r9-seed2.sh's r9-seed2-numbers.md) are written
# under artifacts/r9/tables (R9_TABLES), which git ignores, not over the committed copies in docs/staging: a model step
# refuses a tree that is not clean, so the registered launch order (check, core, report, seed2, …) runs end to end from
# a frozen checkout with no commit in between. What is measured and what a table holds are unchanged; `publish` copies
# the tables to docs/staging when the runs are over.
#
# R9_SAVED: the folder of R4b's loop test (burn-in worlds, saved arms and receipts; read only). MGOGO_FT_ROOT: the folder
# whose adapters/ holds r4-rules-state and r4c-rules-state. Both default to this checkout's artifacts/ and, failing
# that, to the worktree that made them.
cd "$(dirname "$0")/.." || exit 1
MADE=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r4b-retrain/artifacts
first_dir() { for d in "$@"; do [ -d "$d" ] && { echo "$d"; return; }; done; echo "$1"; }
SAVED="${R9_SAVED:-$(first_dir artifacts/r4b/loop "$MADE/r4b/loop")}"
OUT="${R9_OUT:-artifacts/r9/loop}"
TABLES="${R9_TABLES:-artifacts/r9/tables}"; DOCS="${R9_DOCS:-docs/staging}"
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
RUN="fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r9-loop.ts --out $OUT --saved $SAVED"
TSX="fnm exec --using=22.22.3 -- pnpm exec tsx"
KEEP=""; command -v caffeinate >/dev/null 2>&1 && KEEP="caffeinate -i"   # a model step must not be cut short by the machine going to sleep
CORE="r4-draw-1,r4-held,r4c-draw-1,r4c-held,r4-draw-2,r4-block,r4c-block"   # in order of need: if the night is short, the first four answer rules 1 to 3, the fifth gives the salt spread
REF="rules,rules-r1,rules-r2,rules-r3,r4-top,r4c-top,r4-top-free,r4c-top-free"

swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
before_model() { # <what> [nowait]
  # one model process at a time: nothing else may be running under the model runtime's interpreter
  others="$(pgrep -fl "$MGOGO_DECIDE_PYTHON" | grep -v pgrep)"
  if [ -n "$others" ] && [ -z "$R9_ALLOW_OTHER_MODEL" ]; then echo "R9 refused ($1): another model process is running:"; echo "$others"; exit 3; fi
  n=0
  while [ -z "$2" ] && [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "R9 hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "R9 machine before model load ($1): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
step() { echo "R9 start: $* ($(date '+%H:%M'))"; "$@" || { echo "R9 failed: $*"; exit 1; }; }
seed_ok() { case "$1" in 21|5) ;; *) echo "seed 21 or 5 (docs/staging/r9-prereg.md §4)"; exit 2 ;; esac; }
model_arms() { # <seed> <arms> <adapters root> <adapters>
  export MGOGO_FT_ROOT="$3" MGOGO_FT_ADAPTERS="$4"
  [ -d "$3/adapters" ] || { echo "R9: no adapters under $3"; exit 2; }
  before_model "seed $1: $2"
  step $KEEP $RUN --seed "$1" --arms "$2"
  step $RUN --seed "$1" --arms "$2" --replay "$OUT"
}
FT="${MGOGO_FT_ROOT:-$(first_dir artifacts/decide-ft/r4c "$MADE/decide-ft/r4c")}"

case "$1" in
  dry)
    step $RUN --dry
    mkdir -p "$TABLES"
    step $TSX scripts/r9-report.ts --dir "$OUT" --window dry --seeds 48 --md "$TABLES/r9-dry.md" ;;
  check)
    echo "saved arms (read only): $SAVED"; ls "$SAVED"/burnin-M6-W50-s21-d30.json "$SAVED"/burnin-M6-W50-s5-d30.json "$SAVED"/standard/s21/trained-gate.receipts.jsonl "$SAVED"/standard/s5/r4c-gate.receipts.jsonl
    echo "adapters root: $FT"; for a in r4-rules-state r4c-rules-state; do shasum -a 256 "$FT/adapters/$a/adapter_model.safetensors"; done
    echo "model runtime: $MGOGO_DECIDE_PYTHON ($([ -x "$MGOGO_DECIDE_PYTHON" ] && echo found || echo MISSING))"
    before_model "pre-flight, nothing is started" nowait
    [ "$(swap_mb)" -gt 6144 ] && echo "R9 note: swap in use is above 6 GB; a model step would hold now (up to 30 minutes)" ;;
  wire) unset MGOGO_DECIDE_SERVER; MGOGO_DECIDE_PYTHON="$(pwd)/scripts/lib/fake-worker.mjs" step fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r9-loop.ts --out artifacts/r9/wire --dry --arms rules,wire-draw-1,wire-held ;;
  reference) seed_ok "$2"; step $RUN --seed "$2" --arms "$REF" ;;
  predict) mkdir -p "$TABLES"; step $TSX scripts/r9-held-replay.ts --saved "$SAVED" --dir "$OUT" --md "$TABLES/r9-offline.md" --json artifacts/r9/offline.json ;;
  report) mkdir -p "$TABLES"; step $TSX scripts/r9-report.ts --dir "$OUT" --seeds 21,5 --md "$TABLES/r9-numbers.md" ;;
  publish)
    n=0
    for f in r9-dry.md r9-offline.md r9-numbers.md r9-seed2-numbers.md; do
      [ -f "$TABLES/$f" ] || continue
      if cmp -s "$TABLES/$f" "$DOCS/$f"; then echo "R9 publish: $DOCS/$f is already the generated table"; else cp "$TABLES/$f" "$DOCS/$f" && echo "R9 publish: $TABLES/$f -> $DOCS/$f"; n=$((n + 1)); fi
    done
    echo "R9 publish: $n table(s) copied from $TABLES; commit them before another model step (a model step refuses a tree that is not clean)" ;;
  core) seed_ok "$2"; model_arms "$2" "$CORE" "$FT" r4-rules-state,r4c-rules-state ;;
  gateoff) seed_ok "$2"; model_arms "$2" r4-held-free,r4c-held-free "$FT" r4-rules-state,r4c-rules-state ;;
  seed2) seed_ok "$2"; model_arms "$2" r4s2-top,r4s2-draw-1 "${R9_FT_ROOT:-artifacts/decide-ft/r9}" r4-rules-state-s2 ;;
  replay) seed_ok "$2"; [ -n "$3" ] || { echo "usage: $0 replay <seed> <a,b,…>"; exit 2; }; step $RUN --seed "$2" --arms "$3" --replay "$OUT" ;;
  arms) seed_ok "$2"; [ -n "$3" ] || { echo "usage: $0 arms <seed> <a,b,…>"; exit 2; }; model_arms "$2" "$3" "$FT" "${MGOGO_FT_ADAPTERS:-r4-rules-state,r4c-rules-state}" ;;
  *) echo "usage: $0 dry | wire | reference <seed> | predict | report | publish | check | core <seed> | gateoff <seed> | seed2 <seed> | arms <seed> <a,b,…> | replay <seed> <a,b,…>"; exit 2 ;;
esac
echo "R9 done ($*): $(date '+%H:%M')"
