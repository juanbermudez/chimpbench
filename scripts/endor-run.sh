#!/usr/bin/env bash
# The Endor training test (docs/staging/endor-train.md), one step per command, for a detached screen session.
#   scripts/endor-run.sh check    tests against the fake Endor, the exporter's tests and its dry run (nothing sent)
#   scripts/endor-run.sh export   writes artifacts/endor/export (local only, refuses to overwrite other bytes)
#   scripts/endor-run.sh plan     offline: counts, steps, learning rates, a sample of every body that would be sent
#   scripts/endor-run.sh dry      the fit check and the whole run against the fake Endor, under artifacts/endor-dry
#   scripts/endor-run.sh fit      SENDS: the account check and every exported packet once (exit 3 when over 2% refused)
#   scripts/endor-run.sh train [--reason "..."]   SENDS: the training run (exit 0 done, 3 a stop, 75 operational, 130 kill)
#   scripts/endor-run.sh bill     SENDS two GETs, once, an hour or more after the run: the balance and the usage rows (the settled cost)
#   scripts/endor-run.sh status | report | kill
# A real run's state is in the main checkout's artifacts/endor whatever checkout runs it (one ledger, one cap):
# progress in its status.json (`status`), logs in its logs/; the cap is $10 for the whole test.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY=/Volumes/Drive/chimpbench/endor-env/bin/python
TRAIN="$ROOT/training/decide_ft/endor_train.py"
CAP=10
REAL=/Volumes/Drive/chimpbench/MGOGO/artifacts/endor   # endor_train.py REAL_ROOT
cd "$ROOT"
if [[ -n "${ENDOR_API_KEY:-}" ]]; then echo "refused: ENDOR_API_KEY is exported in this shell; unset it (the client reads the key from the main checkout's .env itself)" >&2; exit 2; fi
unset ENDOR_BASE_URL ENDOR_DEFAULT_MODEL ENDOR_LOG_LEVEL ENDOR_REPORT_LATENCY 2>/dev/null || true
logged() {  # name, command...: the command's output also to $REAL/logs/<name>-<time>.log
  local name=$1; shift
  mkdir -p "$REAL/logs"
  local f="$REAL/logs/$name-$(date +%Y%m%dT%H%M%S).log"
  echo "$(date): $name (log $f)"
  "$@" 2>&1 | tee "$f"
}
case "${1:-}" in
  check) "$PY" -I -B training/decide_ft/test_endor.py
         fnm exec --using=22.22.3 -- pnpm exec tsx --test tests/endor-export.test.ts
         fnm exec --using=22.22.3 -- pnpm exec tsx scripts/endor-export.ts ;;
  export) fnm exec --using=22.22.3 -- pnpm exec tsx scripts/endor-export.ts --write ;;
  plan) "$PY" -I -B "$TRAIN" plan ;;
  dry) if [[ -e artifacts/endor-dry ]]; then mv artifacts/endor-dry "artifacts/endor-dry.$(date +%Y%m%dT%H%M%S)"; fi
       "$PY" -I -B "$TRAIN" fit --cap "$CAP" --fake
       "$PY" -I -B "$TRAIN" train --cap "$CAP" --fake
       "$PY" -I -B "$TRAIN" bill --fake > /dev/null
       cat artifacts/endor-dry/report.md ;;
  # caffeinate -i: an idle Mac does not sleep while a step sends (a sleeping client leaves the run to park and the
  # guard's own clock to run on: AGENTS.md's rule for long runs)
  fit) logged fit caffeinate -i "$PY" -I -B "$TRAIN" fit --cap "$CAP" ;;
  train) shift; logged train caffeinate -i "$PY" -I -B "$TRAIN" train --cap "$CAP" "$@" ;;
  bill) logged bill "$PY" -I -B "$TRAIN" bill ;;
  status) "$PY" -I -B "$TRAIN" status ;;
  report) "$PY" -I -B "$TRAIN" report ;;
  kill) mkdir -p "$REAL" && touch "$REAL/KILL" && echo "the run stops within 20 seconds (remove $REAL/KILL to allow another)" ;;
  *) sed -n '2,12p' "$0"; exit 2 ;;
esac
