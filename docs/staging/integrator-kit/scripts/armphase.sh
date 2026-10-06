#!/bin/zsh
# One phase of one E1v arm: armphase.sh <M6|M12> <TAG> [parallel]   (TAG: W25, W50 or S39; run under Node 22.22.3)
# Plans (where not planned yet) and runs the arm's four runs (rngSalt 0-3) in the frozen checkout bench-e1v, one runner
# each, and waits for all four. M12 extends M6 from its checkpoints (--from). A runner that stops on its budget is
# relaunched (at most 3 times); a failed job is left for a look at its log. Logs: artifacts/integrator/logs/ (gitignored).
H=$1; TAG=$2; PAR=${3:-1}
ROOT=${MGOGO_ROOT:-${0:A:h:h:h:h:h}}; KIT=$ROOT/docs/staging/integrator-kit; LOG=$ROOT/artifacts/integrator/logs
mkdir -p $LOG; cd $ROOT/.claude/worktrees/bench-e1v || exit 1
[ -z "$(git status --short)" ] || { echo "bench-e1v is dirty"; exit 1; }
for S in "" -s1 -s2 -s3; do
  L=$H-$TAG$S; O=artifacts/validation/e/runs/$L
  [ -f $O/run.json ] && continue
  if [ $H = M12 ]; then FROM=(--from artifacts/validation/e/runs/M6-$TAG$S/run.json); else FROM=(); fi
  pnpm exec tsx scripts/e-run.ts plan --label $L --${H:l} --params-file $KIT/params/M6-$TAG$S.json $FROM --out $O | tail -1
done
for S in "" -s1 -s2 -s3; do
  L=$H-$TAG$S; O=artifacts/validation/e/runs/$L
  ( for i in 1 2 3; do
      [ -f $O/$L.json ] && break
      zsh $KIT/scripts/e1vrun.sh $L $PAR >> $LOG/$L.log 2>&1
      grep -q " failed " $LOG/$L.log && break
    done ) &
done
wait
for S in "" -s1 -s2 -s3; do
  L=$H-$TAG$S; [ -f artifacts/validation/e/runs/$L/$L.json ] && echo "$L merged" || { echo "$L NOT merged:"; tail -4 $LOG/$L.log; }
done
echo "PHASE-DONE $H-$TAG $(date +%T) load $(uptime | sed 's/.*averages: //') free $(df -h / | tail -1 | awk '{print $4}')"
