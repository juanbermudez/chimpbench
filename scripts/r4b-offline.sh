#!/bin/sh
# Stage R4b (docs/staging/r4b-prereg.md §6): the offline evaluation's model runs in the registered order, one model
# process at a time (scripts/r4b-eval.sh holds each while swap in use is above 6 GB). It stops at the first failed step.
#   scripts/r4b-offline.sh > artifacts/decide-ft/r4b/logs/offline.log 2>&1
cd "$(dirname "$0")/.." || exit 1
L=artifacts/decide-ft/r4b/logs
step() { echo "OFFLINE start: $* ($(date '+%H:%M'))"; "$@" || { echo "OFFLINE failed: $*"; exit 1; }; }
step sh -c "scripts/r4b-eval.sh a > $L/eval-a-r4b-rules-state.log 2>&1"
for p in base r4-rules-state r4b-rules-state; do step sh -c "scripts/r4b-eval.sh b $p > $L/eval-b-$p.log 2>&1"; done
step sh -c "scripts/r4b-eval.sh tokens > $L/eval-tokens.log 2>&1"
step sh -c "scripts/r4b-eval.sh parity > $L/eval-parity.log 2>&1"
step sh -c "scripts/r4b-eval.sh wild > $L/eval-wild-r4b-rules-state.log 2> $L/eval-wild-r4b-rules-state.err"
echo "OFFLINE done: $(date '+%H:%M')"
