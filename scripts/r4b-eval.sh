#!/bin/sh
# Stage R4b (docs/staging/r4b-prereg.md §5, §6, §8): the training run and the offline evaluation's model runs, one model
# process at a time. Before each it writes the load and the swap in use and holds while swap in use is above 6 GB
# (re-checked every minute for up to 30 minutes, then it goes ahead and says so).
#   scripts/r4b-eval.sh train             train r4b-rules-state (R4's settings)
#   scripts/r4b-eval.sh a                 score r4b-rules-state on R4's own evaluation file (evalA/all.jsonl)
#   scripts/r4b-eval.sh b <provider>      score the year-round held-out set (evalB/all.jsonl) with base | r4-rules-state | r4b-rules-state
#   scripts/r4b-eval.sh tokens            real token counts of the year-round held-out packets (CPU)
#   scripts/r4b-eval.sh parity            training/decide_ft/parity.py on 12 r4b dev contexts (CPU)
#   scripts/r4b-eval.sh wild              the wild-choice benchmark, DEVELOPMENT part only, plain and fanned out, r4b-rules-state
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FT="artifacts/decide-ft/r4b"
PY="$ROOT/training/decide_ft/r4_py.sh"
export MGOGO_FT_ROOT="$FT"
swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
before_model() {
  n=0
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "R4B hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "R4B machine before model run ($*): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
case "$1" in
  train) before_model train; "$PY" train_r4.py --name r4b-rules-state --train contexts/train.jsonl --dev contexts/dev.jsonl --extra contexts/manifest.json --epochs 3 ;;
  a) before_model "A r4b-rules-state"; "$PY" em_score.py --in "$ROOT/$FT/evalA/all.jsonl" --packets state,statePerm,removed,probe --provider r4b-rules-state --out "$ROOT/$FT/evalA/all.r4b-rules-state.jsonl" ;;
  b) before_model "B $2"; "$PY" em_score.py --in "$ROOT/$FT/evalB/all.jsonl" --packets state --provider "$2" --out "$ROOT/$FT/evalB/all.$2.jsonl" ;;
  tokens) "$PY" em_score.py --in "$ROOT/$FT/evalB/all.jsonl" --packets state --tokens --out "$ROOT/$FT/evalB/tokens.jsonl" ;;
  parity) "$PY" parity.py --n 12 --device cpu ;;
  wild)
    before_model "wild r4b-rules-state"
    cd "$ROOT"
    export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
    export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
    export MGOGO_FT_ADAPTERS=r4b-rules-state
    fnm exec --using=22.22.3 -- pnpm exec tsx scripts/rw-score.ts --part development --kernels gliner,gliner+fan2 --load-model --adapter r4b-rules-state --out "$FT/rw/r4b-rules-state" ;;
  *) echo "usage: $0 train | a | b <provider> | tokens | parity | wild"; exit 2 ;;
esac
