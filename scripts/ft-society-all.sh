#!/bin/sh
# Stage F6: rules controls, then the three adapter rotations per seed (a Latin square over the communities), then the
# untuned model. ~17 min of inference per simulated day at 38 model-driven chimps, so runs go one at a time.
#   DAYS=3 SEEDS="4001 4002" scripts/ft-society-all.sh
set -e
cd "$(dirname "$0")/.."
DAYS="${DAYS:-3}"
SEEDS="${SEEDS:-4001 4002}"
OUT=artifacts/decide-ft/society
LOGS=artifacts/decide-ft/logs
mkdir -p "$OUT" "$LOGS"
for seed in $SEEDS; do
  pnpm exec tsx scripts/ft-society.ts --cond rules --seed "$seed" --days "$DAYS" > "$LOGS/society-rules-$seed.log" 2>&1
done
for seed in $SEEDS; do
  for cond in rot0 rot1 rot2; do
    pnpm exec tsx scripts/ft-society.ts --cond "$cond" --seed "$seed" --days "$DAYS" > "$LOGS/society-$cond-$seed.log" 2>&1
  done
done
pnpm exec tsx scripts/ft-society-report.ts > "$LOGS/society-report.log" 2>&1
for seed in $SEEDS; do
  pnpm exec tsx scripts/ft-society.ts --cond base --seed "$seed" --days "$DAYS" > "$LOGS/society-base-$seed.log" 2>&1
done
pnpm exec tsx scripts/ft-society-report.ts > "$LOGS/society-report.log" 2>&1
