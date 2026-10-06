#!/bin/zsh
# Stage R1b (docs/staging/r1b-prereg.md): plan (where not planned yet) and run the arms, in the frozen checkout this
# script is in (bench-r1b, a detached checkout of the registered commit). One runner at a time, two jobs at a time
# (--parallel 2: the machine is shared), budget 900 minutes; a runner that stops without its merged result and without
# a failed job is relaunched, at most 3 times per arm. Launch in the background under Node 22.22.3:
#   fnm exec --using=22.22.3 -- zsh docs/staging/integrator-kit/scripts/r1brun.sh [label ...]
# With no label every arm runs, in the order below. Logs: artifacts/integrator/logs/ (gitignored). Seeds: the confirm
# mode's (48, 7, 21, 5, 11); horizon: e-bench --confirm (30-day burn-in + 60 days).
ROOT=${0:A:h:h:h:h:h}; KIT=$ROOT/docs/staging/integrator-kit; LOG=$ROOT/artifacts/integrator/logs
typeset -A FILE
FILE=(R1b-rules M6-W50 R1b-null R1b-null R1b-rules-s1 M6-W50-s1 R1b-rules-s2 M6-W50-s2 R1b-rules-s3 M6-W50-s3
      R1b-null-gate R1b-null-gate R1b-null-nopick R1b-null-nopick R1b-null-gate-nopick R1b-null-gate-nopick
      R1b-W25-rules M6-W25 R1b-W25-null R1b-W25-null)
ORDER=(R1b-rules R1b-null R1b-rules-s1 R1b-rules-s2 R1b-rules-s3 R1b-null-gate R1b-null-nopick R1b-null-gate-nopick R1b-W25-rules R1b-W25-null)
[ $# -gt 0 ] && ORDER=($@)
mkdir -p $LOG; cd $ROOT || exit 1
[ -z "$(git status --short)" ] || { echo "$ROOT is dirty"; exit 1; }
git symbolic-ref -q HEAD > /dev/null && { echo "$ROOT is not a detached checkout"; exit 1; }
echo "R1B-START $(date '+%F %T') commit $(git rev-parse --short HEAD) load $(uptime | sed 's/.*averages: //')"
for L in $ORDER; do
  F=$FILE[$L]; [ -n "$F" ] || { echo "$L: unknown label"; exit 1; }
  O=artifacts/validation/e/runs/$L
  if [ ! -f $O/run.json ]; then
    pnpm exec tsx scripts/e-run.ts plan --label $L --confirm --params-file $KIT/params/$F.json --out $O 2>&1 | tail -1
  fi
  for i in 1 2 3; do
    [ -f $O/$L.json ] && break
    pnpm exec tsx scripts/e-run.ts run $O/run.json --budget-min 900 --parallel 2 >> $LOG/$L.log 2>&1
    X=$?; echo "RUNNER-EXIT $X $(date +%T)" >> $LOG/$L.log
    [ $X -eq 1 ] && break   # the runner exits 0 when every job is done, 1 when a job failed, 2 when it stopped on its budget
  done
  if [ -f $O/$L.json ]; then echo "$L merged $(date +%T) load $(uptime | sed 's/.*averages: //')"
  else echo "$L NOT merged:"; pnpm exec tsx scripts/e-run.ts status $O/run.json 2>&1 | tail -6; tail -4 $LOG/$L.log; fi
done
echo "R1B-DONE $(date '+%F %T') free $(df -h $ROOT | tail -1 | awk '{print $4}')"
