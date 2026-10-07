#!/bin/sh
# Stage R5 pilot (docs/staging/r5-pilot-prereg.md §5, step 7): the optional arms, one model process at a time, in the
# registered order. Before each model load it writes the load and the swap in use to the log and holds while swap in use
# is above 6 GB (re-checked every minute for up to 30 minutes, then it goes ahead and says so). No-model steps (the
# seed's rules and reference arms, the replays) run between the model steps. It stops at the first failed step.
#   scripts/r5-chain.sh > artifacts/r5/logs/chain.log 2>&1
cd "$(dirname "$0")/.." || exit 1
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}"
export MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}"
export HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}"
export MGOGO_FT_ROOT="${MGOGO_FT_ROOT:-artifacts/decide-ft/r4}" MGOGO_FT_ADAPTERS="${MGOGO_FT_ADAPTERS:-r4-rules-state}"
RUN="fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r5-pilot.ts"
NOMODEL="rules,rules-r1,rules-r2,rules-r3,null,argmax,null-nopick,null-gate,argmax-gate"

swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
before_model() {
  n=0
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "CHAIN hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "CHAIN machine before model load ($1): $(date '+%H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
step() { echo "CHAIN start: $*"; "$@" || { echo "CHAIN failed: $*"; exit 1; }; }

before_model "seed 48 trained-gate, trained-nopick"
step $RUN --seed 48 --arms trained-gate,trained-nopick
step $RUN --seed 48 --arms trained-gate,trained-nopick --replay artifacts/r5/pilot
step $RUN --seed 7 --arms "$NOMODEL"
step $RUN --seed 7 --arms null,argmax,null-nopick,null-gate,argmax-gate --replay artifacts/r5/pilot
before_model "seed 7 trained, untuned"
step $RUN --seed 7 --arms trained,untuned
step $RUN --seed 7 --arms trained,untuned --replay artifacts/r5/pilot
before_model "seed 48 untuned-gate"
step $RUN --seed 48 --arms untuned-gate
step $RUN --seed 48 --arms untuned-gate --replay artifacts/r5/pilot
echo "CHAIN done: $(date '+%H:%M')"
