#!/bin/zsh
# Drive one planned run to its merge: runloop.sh <checkout under .claude/worktrees> <label> [parallel]   (Node 22.22.3)
# Relaunches the runner when it stops on its budget (at most 6 times); stops at a failed job. Log: artifacts/integrator/logs/<label>.log
B=$1; L=$2; PAR=${3:-1}
ROOT=${MGOGO_ROOT:-${0:A:h:h:h:h:h}}; LOG=$ROOT/artifacts/integrator/logs; mkdir -p $LOG
cd $ROOT/.claude/worktrees/$B || exit 1
O=artifacts/validation/e/runs/$L
for i in 1 2 3 4 5 6; do
  [ -f $O/$L.json ] && break
  pnpm exec tsx scripts/e-run.ts run $O/run.json --budget-min 100 --parallel $PAR >> $LOG/$L.log 2>&1
  echo "RUNNER-EXIT $? $(date +%T)" >> $LOG/$L.log
  grep -q " failed" $LOG/$L.log && break
done
[ -f $O/$L.json ] && echo "$L merged $(date +%T)" || { echo "$L NOT merged $(date +%T):"; tail -5 $LOG/$L.log; }
