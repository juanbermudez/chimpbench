#!/bin/sh
# Stage R4c (docs/staging/r4b-prereg.md §11): every run of the third round, one model process at a time. Before each
# model run it writes the load and the swap in use and holds while swap in use is above 6 GB (re-checked every minute
# for up to 30 minutes, then it goes ahead and says so). It stops at the first failed step.
#   scripts/r4c-run.sh sample             the four supplement pools (days 14 to 33 of the training worlds; no model)
#   scripts/r4c-run.sh train              train r4c-rules-state (R4's settings) on R4's file plus the supplement
#   scripts/r4c-run.sh offline            A, B, parity and the wild-choice development part for r4c-rules-state
#   scripts/r4c-run.sh loop <seed> <standard|lean>   the arm r4c on the burned-in world of R4b's test, then its replay
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"; FT=artifacts/decide-ft/r4c; B=artifacts/decide-ft/r4b; L="$FT/logs"
PY="$ROOT/training/decide_ft/r4_py.sh"
export MGOGO_FT_ROOT="$FT"
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}"
mkdir -p "$L"
swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
before_model() {
  n=0
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "R4C hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "R4C machine before model run ($*): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
step() { echo "R4C start: $* ($(date '+%H:%M'))"; "$@" || { echo "R4C failed: $*"; exit 1; }; }
case "$1" in
  sample)
    one() { fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r4b-contexts.ts --seed "$1" --base "$2" --burn-in 14 --days 20 --p 0.25 --out "$FT/contexts/parts" > "$L/ctx-$1-$2.log" 2>&1; tail -1 "$L/ctx-$1-$2.log"; }
    one 48 W50 & one 48 W25 & wait; one 7 W50 & one 7 W25 & wait ;;
  train) before_model train; "$PY" train_r4.py --name r4c-rules-state --train contexts/train.jsonl --dev contexts/dev.jsonl --extra contexts/manifest.json --epochs 3 ;;
  offline)
    before_model "A r4c-rules-state"; step "$PY" em_score.py --in "$ROOT/$B/evalA/all.jsonl" --packets state,statePerm,removed,probe --provider r4c-rules-state --out "$ROOT/$B/evalA/all.r4c-rules-state.jsonl"
    before_model "B r4c-rules-state"; step "$PY" em_score.py --in "$ROOT/$B/evalB/all.jsonl" --packets state --provider r4c-rules-state --out "$ROOT/$B/evalB/all.r4c-rules-state.jsonl"
    step "$PY" parity.py --n 12 --device cpu
    before_model "wild r4c-rules-state"
    export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 MGOGO_FT_ADAPTERS=r4c-rules-state
    step fnm exec --using=22.22.3 -- pnpm exec tsx scripts/rw-score.ts --part development --kernels gliner,gliner+fan2 --load-model --adapter r4c-rules-state --out "$B/rw/r4c-rules-state" ;;
  loop)
    export MGOGO_FT_ADAPTERS=r4c-rules-state
    before_model "seed $2, $3 window: r4c"
    step fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r4b-loop.ts --seed "$2" --window "$3" --arms r4c
    step fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r4b-loop.ts --seed "$2" --window "$3" --arms r4c --replay "artifacts/r4b/loop/$3" ;;
  *) echo "usage: $0 sample | train | offline | loop <seed> <standard|lean>"; exit 2 ;;
esac
echo "R4C done ($*): $(date '+%H:%M')"
