#!/bin/zsh
# Drive one runner plan for up to ~100 min: m6run.sh <label> [parallel]. Use 1 while the load is above 8 (user rule).
LAB=$1; PAR=${2:-1}
case $LAB in *S39*|WB-S37|WB-S34) B=bench-run;; *) B=bench-run2;; esac
cd /Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/$B || exit 1
pnpm exec tsx scripts/e-run.ts run artifacts/validation/e/runs/$LAB/run.json --budget-min 100 --parallel $PAR
echo "RUNNER-EXIT $? $(date +%T)"
pnpm exec tsx scripts/e-run.ts status artifacts/validation/e/runs/$LAB/run.json 2>&1 | tail -4
