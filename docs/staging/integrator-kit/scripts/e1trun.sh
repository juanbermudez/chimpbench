#!/bin/zsh
# Drive one E1t confirm runner for up to ~100 min: e1trun.sh <label> [parallel]. Use 1 while the load is above 8 (user rule).
LAB=$1; PAR=${2:-1}
cd ${MGOGO_ROOT:-${0:A:h:h:h:h:h}}/.claude/worktrees/bench-e1t || exit 1
pnpm exec tsx scripts/e-run.ts run artifacts/validation/e/runs/$LAB/run.json --budget-min 100 --parallel $PAR
echo "RUNNER-EXIT $? $(date +%T)"
pnpm exec tsx scripts/e-run.ts status artifacts/validation/e/runs/$LAB/run.json 2>&1 | tail -4
