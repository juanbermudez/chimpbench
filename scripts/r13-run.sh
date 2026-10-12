#!/bin/sh
# Stage R13 (docs/staging/r13-prereg.md): the registered population run, step by step, one process at a time, from a
# frozen detached checkout. Only `model` starts a model process; every other step needs none. The model arm is run by
# scripts/r10-night.ts, which refuses a tree that is not clean, a seed other than 3613, an adapter whose weights are
# not the registered ones, and a start beside another model process.
#
#   scripts/r13-run.sh check        starts nothing: the adapter, the decode rule as read from stage R11's table, other model processes, the tree, swap, disk
#   scripts/r13-run.sh decode       the decode rule alone (prereg §3): the line of stage R11's table it read, and the arm it names
#   scripts/r13-run.sh dry          no model, about four minutes, seed 48, two days: the model path against a fake worker, the rules arm, the control arms,
#                                   the replays and both reports, into $R13_OUT/dry (never a result, never published)
#   scripts/r13-run.sh model        THE MODEL ARM (seed 3613, at most 20 days in 9 hours). Needs R13_ARM set to the arm `decode` names. Run again after an
#                                   interruption: it resumes (R13_HOURS: the hours left)
#   scripts/r13-run.sh rules        the paired rules arm, the same seed, the days the model arm completed
#   scripts/r13-run.sh controls     stage R7's sixteen control arms at the population unit on the same burned-in world, the same days
#   scripts/r13-run.sh replay       both runs replayed from their receipts (the field observer and the card; then stage R7's readers), and the packet check
#   scripts/r13-run.sh report       stage R7's card with both runs beside the control arms, and the registered statements -> $R13_OUT/tables
#   scripts/r13-run.sh chain        check, dry, model, rules, controls, replay, report, with a status file ($R13_OUT/chain/status.log and state)
#   scripts/r13-run.sh status       the chain's state, its last lines, and the model run's own status
#   scripts/r13-run.sh publish      copies the generated tables into docs/staging (then commit them on a branch, never from the frozen checkout)
#
# R13_FT_ROOT: the folder whose adapters/ holds r11-p5b-s7 (default: stage R11's). R13_R11_NUMBERS: stage R11's generated
# r11-numbers.md AFTER its second night (no default: an older copy would silently read "N1 not read"). R13_ARM: the arm the
# integrator launches, which must be the one the rule names. R13_OUT: where runs and tables go (default artifacts/r13).
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"; SELF="$ROOT/scripts/r13-run.sh"; WT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees
FT="${R13_FT_ROOT:-$WT/r11-honest-retrain/artifacts/decide-ft/r11}"; OUT="${R13_OUT:-artifacts/r13}"; TABLES="$OUT/tables"; DOCS="${R13_DOCS:-docs/staging}"
SEED=3613; ADAPTER=r11-p5b-s7; DAYS=20; HOURS="${R13_HOURS:-9}"
MODEL="$OUT/model-s$SEED"; RULES="$OUT/rules-s$SEED"; CARD="$OUT/card"; C="$OUT/chain"
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
TSX="fnm exec --using=22.22.3 -- pnpm exec tsx"; NIGHT="$TSX scripts/r10-night.ts"
KEEP=""; command -v caffeinate >/dev/null 2>&1 && KEEP="caffeinate -i"
swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
# another model process of this project (as scripts/r11-run.sh model_procs; the night script makes its own, stricter check before it loads anything)
model_procs() {
  { pgrep -fl "^$MGOGO_DECIDE_PYTHON( |\$)"; pgrep -fl -- '-B (worker|server|em_score|score_contexts|eval_offline|eval_ab|parity|r8_tokens|token_audit|train|train_r4|train_r11|distill|bench_batch|bench_train)\.py'
    pgrep -fl -- '-m experiments\.active_perception\.decide_provider'; } 2>/dev/null | grep -v pgrep | grep -v fake-worker.mjs | sort -u
}
step() { echo "R13 start: $* ($(date '+%H:%M'))"; "$@" || { echo "R13 failed: $*"; exit 1; }; }
have() { [ -e "$FT/adapters/$ADAPTER/adapter_model.safetensors" ] && [ -e "$FT/adapters/$ADAPTER/manifest.json" ]; }
# the decode rule (prereg §3), by the one function the report and the tests use: prints "<decode> <arm> <N1> <S0>" and the reason
rule() { $NIGHT rule "${R13_R11_NUMBERS:-}"; }
arm_named() { rule | head -1 | cut -d' ' -f2; }
days_done() { /usr/bin/python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))['days']))" "$1/run.json"; }
state_of() { /usr/bin/python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['state'])" "$1/run.json"; }
label_of() { /usr/bin/python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['label'])" "$1/run.json"; }
need_model_run() { [ -f "$MODEL/run.json" ] || { echo "R13: no model run under $MODEL yet ('$0 model')"; exit 2; }; N="$(days_done "$MODEL")"; [ "$N" -ge 1 ] || { echo "R13: the model run has no whole day yet"; exit 2; }; }
# both runs replayed, read by stage R7's readers beside the control arms, and both reports; <card dir> <model run> <rules run> <tables dir> <prefix> <seed> [dry]
reading() {
  mkdir -p "$4"
  step $NIGHT replay "$2"; step $NIGHT replay "$3"
  step $NIGHT replay "$2" --r7 "$1"; step $NIGHT replay "$3" --r7 "$1"
  step $NIGHT packets "$2" --hours "$HOURS"
  [ -f "$1/tai.json" ] || step $TSX scripts/r7-card.ts tai --out "$1"   # the Taï half-hour anchor (aggregates only), which stage R7's report reads
  ML="$(label_of "$2")"; RL="$(label_of "$3")"
  title="Stage R13: stage R7's card at the population unit on seed $6, the control arms and both runs (numbers)${7:+ - DRY RUN, a fake worker, not a result}"
  note="Written by stage R7's report script for stage R13 (r13-prereg.md, section 8). The worlds also carry observeV5 1 from the first tick (the rules never read it) and every arm continues one burned-in world. The model arm is a rules-taught model on a rules menu: a model taught the rules' own odds, one training of the recipe, the loop's gate on; animals under 8 years stay on the rules. One world seed and one run: a level measurement. A cell reading 'closer' in section 12 is not a claim of this stage (r13-prereg.md, section 8.3); the registered statements are in r13-numbers.md."
  step $TSX scripts/r7-report.ts --dir "$1" --units P --seeds "$6" --engine "the model arm=$ML;the rules through the night script=$RL" --title "$title" --note "$note" --md "$4/$5-card.md"
  step $TSX scripts/r13-report.ts --dir "$1" --seed "$6" --model "$ML" --rules "$RL" --model-run "$2" --rules-run "$3" ${R13_R11_NUMBERS:+--r11 "$R13_R11_NUMBERS"} --md "$4/$5-numbers.md"
  cp "$2/replay/replay.md" "$4/$5-model-replay.md"; cp "$3/replay/replay.md" "$4/$5-rules-replay.md"
}

case "$1" in
  decode)
    [ -n "${R13_R11_NUMBERS:-}" ] || { echo "R13: set R13_R11_NUMBERS to stage R11's generated r11-numbers.md, written after its second night (for example $WT/bench-r11/artifacts/r11/tables/r11-numbers.md once the chain's state is done)"; exit 2; }
    [ -f "$R13_R11_NUMBERS" ] || { echo "R13: no file $R13_R11_NUMBERS"; exit 2; }
    echo "stage R11's table: $R13_R11_NUMBERS"; sed -n '3p' "$R13_R11_NUMBERS" | cut -c1-160
    grep -m1 'Engine arms on file' "$R13_R11_NUMBERS" | sed 's/.*Engine arms on file/engine arms on file/' | cut -c1-300
    grep -m1 '^- \*\*N1 for the recipe P5b' "$R13_R11_NUMBERS" || echo "(the table has no line 'N1 for the recipe P5b': not read)"
    rule ;;
  check)
    rc=0
    echo "adapter root: $FT"; if have; then shasum -a 256 "$FT/adapters/$ADAPTER/adapter_model.safetensors"; echo "registered:   582e409abd2e91a8016b41bcc5ffbbf59616080313e3ebb67b8c92a2aa04c74c"; else echo "MISSING or cut short: $FT/adapters/$ADAPTER (weights and manifest.json)"; rc=3; fi
    if [ -n "${R13_R11_NUMBERS:-}" ] && [ -f "$R13_R11_NUMBERS" ]; then echo "the decode rule: $(rule | tr '\n' ' ')"; else echo "the decode rule: R13_R11_NUMBERS is not set to stage R11's final table; '$0 model' refuses without it"; rc=3; fi
    echo "R13_ARM: ${R13_ARM:-not set}"
    for f in "$WT/bench-r11/artifacts/r11-chain/state"; do [ -f "$f" ] && echo "stage R11's chain: $(cat "$f")"; done
    echo "model runtime: $MGOGO_DECIDE_PYTHON ($([ -x "$MGOGO_DECIDE_PYTHON" ] && echo found || echo MISSING))"
    echo "machine: $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | $(df -g "$ROOT" | tail -1 | awk '{print $4}') GB free here"
    others="$(model_procs)"
    if [ -n "$others" ]; then echo "R13 check: another model process is running; the model arm would refuse:"; echo "$others"; rc=3; else echo "R13 check: no other model process"; fi
    if [ -n "$(git status --porcelain)" ]; then echo "R13 check: the tree is not clean; every run would refuse"; rc=3; else echo "R13 check: the tree is clean at $(git rev-parse --short HEAD)"; fi
    [ -e data/raw ] || echo "R13 check: no data/raw link (the report's Taï anchor needs it: ln -s /Volumes/Drive/chimpbench/MGOGO/data/raw data/raw)"
    [ -f "$MODEL/run.json" ] && echo "the model run on file: $(state_of "$MODEL"), $(days_done "$MODEL") days"
    [ "$rc" = 0 ] || exit "$rc" ;;
  dry)
    # the whole path on seed 48 against a fake worker that holds no model: never a result
    D="$OUT/dry"; A="wire-$(echo "${R13_ARM:-p5b-s7-draw-1}" | sed 's/^p5b-s7/p5b/')"
    [ -e "$D" ] && { echo "R13 dry: $D exists; delete it to run the dry run again"; exit 2; }
    unset MGOGO_DECIDE_SERVER; export MGOGO_DECIDE_PYTHON="$ROOT/scripts/lib/fake-worker.mjs"   # nothing in this step may reach a model
    step $NIGHT run --seed 48 --arm "$A" --days 2 --out "$D/model-s48"
    step $NIGHT run --seed 48 --arm rules --packet p5b --days 2 --out "$D/rules-s48"
    step $NIGHT controls --seed 48 --packet p5b --days 2 --out "$D/card"
    reading "$D/card" "$D/model-s48" "$D/rules-s48" "$D/tables" r13-dry 48 dry ;;
  model)
    [ -n "${R13_R11_NUMBERS:-}" ] && [ -f "$R13_R11_NUMBERS" ] || { echo "R13: set R13_R11_NUMBERS to stage R11's final r11-numbers.md ('$0 decode' prints what it says)"; exit 2; }
    ARM="$(arm_named)"; [ -n "$ARM" ] || { echo "R13: the decode rule could not be read"; exit 1; }
    [ "${R13_ARM:-}" = "$ARM" ] || { echo "R13 refused: the rule names arm $ARM ($(rule | tail -1)); R13_ARM is '${R13_ARM:-not set}'. Read '$0 decode', then set R13_ARM=$ARM"; exit 2; }
    have || { echo "R13: $FT/adapters/$ADAPTER is missing or a training cut short"; exit 2; }
    export MGOGO_FT_ROOT="$FT" MGOGO_FT_ADAPTERS="$ADAPTER"
    mkdir -p "$OUT"
    if [ -f "$MODEL/run.json" ]; then
      [ "$(state_of "$MODEL")" = done ] && { echo "R13: the model arm is on file ($(days_done "$MODEL") days, done); it is not run again"; exit 0; }
      echo "R13: resuming the model arm after day $(days_done "$MODEL") (state $(state_of "$MODEL")), $HOURS more hours at most"
      $KEEP $NIGHT run --resume "$MODEL" --hours "$HOURS"; rc=$?
    else
      $KEEP $NIGHT run --seed "$SEED" --arm "$ARM" --days "$DAYS" --hours "$HOURS" --out "$MODEL"; rc=$?
    fi
    # 0: every day asked or the hours used; 3: the stop check, the error limit or low disk ended it (read for viability alone); anything else: not finished
    case "$rc" in 0|3) echo "R13 model arm ended (exit $rc): $(state_of "$MODEL"), $(days_done "$MODEL") days" ;; *) echo "R13 model arm did not finish (exit $rc); '$0 model' resumes it"; exit "$rc" ;; esac ;;
  rules)
    need_model_run
    [ -f "$RULES/run.json" ] && { echo "R13: the paired rules arm is on file; it is not run again"; exit 0; }
    step $NIGHT run --seed "$SEED" --arm rules --packet p5b --days "$N" --out "$RULES" ;;
  controls) need_model_run; step $NIGHT controls --seed "$SEED" --packet p5b --days "$N" --out "$CARD" ;;
  replay|report)
    # one step under two names: the replays, the arm files beside the control arms, the packet check and both reports (no model)
    need_model_run; [ -f "$RULES/run.json" ] || { echo "R13: no paired rules arm yet ('$0 rules')"; exit 2; }
    [ -f "$CARD/P/s$SEED/mix30-b.json" ] || { echo "R13: the control arms are not all on file ('$0 controls')"; exit 2; }
    reading "$CARD" "$MODEL" "$RULES" "$TABLES" r13 "$SEED" ;;
  chain)
    mkdir -p "$C"
    say() { echo "$(date '+%d %b %H:%M:%S') $*" | tee -a "$C/status.log"; }
    run() { say "START [$STEP] $*"; "$@" >> "$C/$STEP.log" 2>&1; rc=$?; say "END   [$STEP] rc=$rc"; if [ $rc -ne 0 ]; then say "CHAIN FAILED at $STEP"; echo failed > "$C/state"; exit 1; fi; }
    echo running > "$C/state"; say "chain starts at $(git rev-parse --short HEAD); arm ${R13_ARM:-not set}; stage R11's table ${R13_R11_NUMBERS:-not set}"
    STEP=00-check;    run "$SELF" check
    STEP=01-dry;      [ -e "$OUT/dry" ] || run "$SELF" dry
    STEP=10-model;    run "$SELF" model
    STEP=11-rules;    run "$SELF" rules
    STEP=12-controls; run "$SELF" controls
    STEP=20-report;   run "$SELF" report
    echo done > "$C/state"; say "CHAIN DONE: $TABLES/r13-numbers.md" ;;
  status)
    echo "chain: $(cat "$C/state" 2>/dev/null || echo 'not started')"; tail -6 "$C/status.log" 2>/dev/null
    [ -f "$MODEL/run.json" ] && $NIGHT status "$MODEL" ;;
  publish)
    n=0
    for f in r13-numbers.md r13-card.md r13-model-replay.md r13-rules-replay.md; do
      [ -f "$TABLES/$f" ] || continue
      if cmp -s "$TABLES/$f" "$DOCS/$f"; then echo "R13 publish: $DOCS/$f is already the generated table"; else cp "$TABLES/$f" "$DOCS/$f" && echo "R13 publish: $TABLES/$f -> $DOCS/$f"; n=$((n + 1)); fi
    done
    echo "R13 publish: $n table(s) copied from $TABLES; commit them on a branch" ;;
  *) echo "usage: $0 check | decode | dry | model | rules | controls | replay | report | chain | status | publish"; exit 2 ;;
esac
echo "R13 done ($*): $(date '+%H:%M')"
