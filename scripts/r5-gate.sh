#!/bin/sh
# Stage R5-gate (docs/staging/r5-gate-prereg.md): the existing adapters with the loop's intention gate on, on the
# burned-in worlds of stage R4b's loop test. One model process at a time; before the model load it writes the load and
# the swap in use and holds while swap in use is above 6 GB (re-checked every minute for up to 30 minutes).
#   scripts/r5-gate.sh nomodel <seed> <standard|lean>   the rules' top option with the gate on and its replay; the saved gate-off arms replayed at this head
#   scripts/r5-gate.sh model <seed> <standard|lean>     trained-gate (r4-rules-state) and r4c-gate (r4c-rules-state) in one worker process, then their replays
cd "$(dirname "$0")/.." || exit 1
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}"
export MGOGO_FT_ROOT=artifacts/decide-ft/r4c MGOGO_FT_ADAPTERS=r4-rules-state,r4c-rules-state
RUN="fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r4b-loop.ts"
swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
before_model() {
  n=0
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "GATE hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "GATE machine before model load ($1): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
step() { echo "GATE start: $* ($(date '+%H:%M'))"; "$@" || { echo "GATE failed: $*"; exit 1; }; }
SEED="$2"; WIN="$3"
case "$1" in
  nomodel)
    step $RUN --seed "$SEED" --window "$WIN" --arms argmax-gate
    step $RUN --seed "$SEED" --window "$WIN" --arms argmax-gate,argmax,trained,r4c --replay "artifacts/r4b/loop/$WIN" ;;
  model)
    before_model "seed $SEED, $WIN window: trained-gate, r4c-gate"
    step $RUN --seed "$SEED" --window "$WIN" --arms trained-gate,r4c-gate
    step $RUN --seed "$SEED" --window "$WIN" --arms trained-gate,r4c-gate --replay "artifacts/r4b/loop/$WIN" ;;
  *) echo "usage: $0 nomodel|model <seed> <standard|lean>"; exit 2 ;;
esac
echo "GATE done ($*): $(date '+%H:%M')"
