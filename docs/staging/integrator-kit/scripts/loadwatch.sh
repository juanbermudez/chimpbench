#!/bin/zsh
# Wait (in the background) until the 1-minute load is below $1 (default 30) for 3 checks in a row, or 105 minutes pass.
LIM=${1:-30}; ok=0; t0=$(date +%s)
while true; do
  L=$(uptime | sed 's/.*averages: //' | cut -d' ' -f1 | cut -d. -f1)
  if [ "$L" -lt "$LIM" ]; then ok=$((ok+1)); else ok=0; fi
  [ $ok -ge 3 ] && { echo "LOAD-OK $L $(date +%T)"; break; }
  [ $(( $(date +%s) - t0 )) -gt 6300 ] && { echo "LOAD-TIMEOUT $L $(date +%T)"; break; }
  sleep 120
done
for s in S39 S39-s1 S39-s2 S39-s3 T0 T0-s1 T0-s2 T0-s3; do case $s in S39*) b=bench-run;; *) b=bench-run2;; esac; ls /Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/$b/artifacts/validation/e/runs/M12-$s/run/*.exit 2>/dev/null | wc -l | tr -d ' ' | sed "s/^/M12-$s exits: /"; done
