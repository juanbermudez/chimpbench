#!/bin/sh
# Stage R4b in the loop (docs/staging/r4b-prereg.md §7, §8): the arms of one seed and window, one model process at a
# time. Before the model load it writes the load and the swap in use and holds while swap in use is above 6 GB
# (re-checked every minute for up to 30 minutes, then it goes ahead and says so). It stops at the first failed step.
#   scripts/r4b-chain.sh nomodel <seed> <standard|lean>   the rules, its three re-draws, the loop without a model, and that arm's replay
#   scripts/r4b-chain.sh model <seed> <standard|lean>     trained (r4-rules-state) and retrained (r4b-rules-state) in one worker process, then their replays
cd "$(dirname "$0")/.." || exit 1
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}"
export MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}"
export HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}"
export MGOGO_FT_ROOT=artifacts/decide-ft/r4b MGOGO_FT_ADAPTERS=r4-rules-state,r4b-rules-state
RUN="fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r4b-loop.ts"
swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
before_model() {
  n=0
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "CHAIN hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "CHAIN machine before model load ($1): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
step() { echo "CHAIN start: $*"; "$@" || { echo "CHAIN failed: $*"; exit 1; }; }
SEED="$2"; WIN="$3"
case "$1" in
  nomodel)
    [ "$WIN" = lean ] && step $RUN --seed "$SEED" --find-lean
    step $RUN --seed "$SEED" --window "$WIN" --arms rules,rules-r1,rules-r2,rules-r3,argmax
    step $RUN --seed "$SEED" --window "$WIN" --arms argmax --replay "artifacts/r4b/loop/$WIN" ;;
  model)
    before_model "seed $SEED, $WIN window: trained, retrained"
    step $RUN --seed "$SEED" --window "$WIN" --arms trained,retrained
    step $RUN --seed "$SEED" --window "$WIN" --arms trained,retrained --replay "artifacts/r4b/loop/$WIN" ;;
  *) echo "usage: $0 nomodel|model <seed> <standard|lean>"; exit 2 ;;
esac
echo "CHAIN done ($*): $(date '+%H:%M')"
