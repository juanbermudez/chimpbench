#!/bin/sh
# Stage RW3 (docs/staging/rw3-prereg.md): every run of the small Taï adapters, one process at a time.
#
#   no model:
#   scripts/rw3-run.sh check                  the pre-flight of a model step, starting nothing: files, adapters, scores, swap, other model processes
#   scripts/rw3-run.sh dry                    the whole path up to the model load: the derived records (made again when data/raw is linked), the
#                                             history check, the training file with its leak checks and counts, the packet sizes and projected
#                                             times, and the trainer's own entry point for both seeds with --stop-before-load 1. Counts only.
#   scripts/rw3-run.sh report                 the registered statements from the scores on file -> artifacts/rw3/tables/rw3-numbers.md
#   scripts/rw3-run.sh publish                copy the generated table into docs/staging, once, after the last model step; then commit it
#   model (the integrator; never while another model process or a registered chain is running):
#   scripts/rw3-run.sh train <7|11>           one adapter, rw3-tai-groom-s<seed>: the registered recipe, hard labels, the last epoch saved;
#                                             an adapter trained to the end is never trained again (the step says so and ends with 0);
#                                             after a training cut short: delete its folder, then run the step again
#   scripts/rw3-run.sh eval <7|11|base|ngogo> [train]
#                                             score one kernel on the Taï DEVELOPMENT part, one call a record and fanned out, beside chance and
#                                             the simple rules: an adapter of this stage, the untuned model (base) or the Ngogo-taught adapter
#                                             r4-field-groom (ngogo). `train` as a second word scores the train part instead: a description of
#                                             fit, never a result. Scores on file are not made again (the step says so and ends with 0).
#
# THE SEALED PART: no step takes it. Any argument that names it is refused, and so is a run beside an opened sealed file.
# A model step first checks its arguments and what it needs on file (a wrong name is refused at once, before anything
# waits), then refuses when the process list cannot be read, while another model process of this project is alive or a
# registered chain of model steps says it is running, refuses a tree that is not clean, then writes the load and the
# swap in use and holds while swap in use is above 6 GB (as scripts/r11-run.sh). Every step writes a START and an END
# line with its exit code to artifacts/rw3/status.log, and a refusal a REFUSED line; a model step's output is also kept
# under artifacts/rw3/logs.
#
# THE ORDER OF THE MODEL STEPS (prereg section 11 and amendments 6 and 11): both adapters are trained before either is
# scored, and nothing is trained once a score of a Tai-taught adapter is on file (the recipe is then closed). `eval 7`
# and `eval 11` refuse until both adapters are trained to the end; `train` refuses once such a score is on file. The
# scoring step writes the sha256 of the weights it scores beside the scores (adapter.sha256), which the report holds
# against the adapter's manifest.
#
# Overrides (all unset by default; each writes an OVERRIDE line to the status log when it takes effect):
#   RW3_ALLOW_OTHER_MODEL  a model step starts beside another model process (as R11_ALLOW_OTHER_MODEL)
#   RW3_ALLOW_DIRTY        a model step starts from a tree that is not clean (as R11_ALLOW_DIRTY)
#   RW3_RERUN              scores on file are made again
# There is no override for the sealed part, for a registered chain that says it is running, for a training file built
# without the history check, or for the order of the model steps.
# Tests only: RW3_NO_MODEL (a model step stops after its refusals, before the hold and the model), RW3_PGREP.
#
# Where things are (all git-ignored; each must lie under a folder named artifacts):
#   RW3_FT_ROOT   the training file and the adapters   (default artifacts/decide-ft/rw3)
#   RW3_RECORDS   stage RW2's derived records          (default artifacts/rw2)
#   RW3_OUT       status, logs, scores and tables      (default artifacts/rw3)
#   RW3_RAW       the raw deposits, for `dry`          (default data/raw; without it the records on hand are used)
#   RW3_NGOGO_FT  the folder whose adapters/ holds r4-field-groom (default: the worktree that made it)
#   RW3_WAIT_STATES  state files of registered chains; a model step refuses while one reads "running"
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"; WT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees
FT="${RW3_FT_ROOT:-artifacts/decide-ft/rw3}"; REC="${RW3_RECORDS:-artifacts/rw2}"; OUT="${RW3_OUT:-artifacts/rw3}"; RAW="${RW3_RAW:-data/raw}"
NGOGO_FT="${RW3_NGOGO_FT:-$WT/r4-train/artifacts/decide-ft/r4}"; NGOGO=r4-field-groom
STATES="${RW3_WAIT_STATES-$WT/bench-r11/artifacts/r11-chain/state $WT/bench-rw2/artifacts/rw2/state}"
DOCS="${RW3_DOCS:-docs/staging}"; TABLES="$OUT/tables"; BENCH="$OUT/bench"; LOGS="$OUT/logs"
abs() { case "$1" in /*) echo "$1" ;; *) echo "$ROOT/$1" ;; esac; }
AFT="$(abs "$FT")"; AREC="$(abs "$REC")"; AOUT="$(abs "$OUT")"
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
unset MGOGO_DECIDE_SERVER   # with it set the scorer joins a shared scoring server, which does not hold this stage's adapters
TSX="fnm exec --using=22.22.3 -- pnpm exec tsx"
PY="$ROOT/training/decide_ft/r4_py.sh"; SYSPY=/usr/bin/python3
PGREP="${RW3_PGREP:-pgrep}"   # a test of this script's refusals names a stand-in here; nothing else does
KEEP=""; command -v caffeinate >/dev/null 2>&1 && KEEP="caffeinate -i"   # a model step must not be cut short by the machine going to sleep
USAGE="usage: $0 check | dry | train <7|11> | eval <7|11|base|ngogo> [train] | report | publish"

# ---- refusals that need nothing on file -------------------------------------------------------------------------------
for d in "$AFT" "$AREC" "$AOUT"; do case "$d/" in */artifacts/*) ;; *) echo "RW3 refused: $d does not lie under a folder named artifacts (the records, the training file, the adapters and the scores are never held in a tracked place)"; exit 2 ;; esac; done
mkdir -p "$OUT"
STEP="$*"
say() { echo "$(date '+%d %b %H:%M:%S') $*" | tee -a "$OUT/status.log"; }
refuse() { say "REFUSED [$STEP] $1"; exit "${2:-2}"; }
for a in "$@"; do case "$a" in *[Ss][Ee][Aa][Ll][Ee][Dd]*) STEP="(a sealed part was named)"; refuse "no step of this stage takes the sealed part (docs/staging/rw3-prereg.md section 1)" ;; esac; done
case "$1" in check|dry|train|eval|report|publish) ;; *) echo "$USAGE"; exit 2 ;; esac

swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
# The hold before a model load, as scripts/r11-run.sh: while swap in use is above 6 GB, for 30 minutes at most, and only
# as long as waiting helps (swap that has not fallen by 50 MB in five minutes is other programs' and will not drain).
hold_swap() {
  n=0; still=0; last="$(swap_mb)"
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ] && [ "$still" -lt 5 ]; do
    echo "RW3 hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1))
    now="$(swap_mb)"; if [ "$now" -lt "$((last - 50))" ]; then still=0; last="$now"; else still=$((still + 1)); fi
  done
}
# Another model process of this project (scripts/r11-run.sh model_procs, with this stage's trainer added): anything run
# by the model runtime's interpreter, and, because a started interpreter shows in the process list under the
# framework's own path on this machine, anything running one of the model scripts by name, or the app's resident worker.
model_procs() {
  { $PGREP -fl "^$MGOGO_DECIDE_PYTHON( |\$)"; $PGREP -fl -- '-B (worker|server|em_score|score_contexts|eval_offline|eval_ab|parity|r8_tokens|r11_tokens|token_audit|train|train_r4|train_r11|train_rw3|distill|bench_batch|bench_train)\.py'
    $PGREP -fl -- '-m experiments\.active_perception\.decide_provider'; } 2>/dev/null | grep -v pgrep | grep -v fake-worker.mjs | sort -u
}
# The process list is trusted only if it can be read: it must at least hold this script (`-a`: this script is an
# ancestor of the question, which the tool leaves out by default). Otherwise "nothing found" would read as "nothing runs".
procs_readable() { [ -n "$($PGREP -a -f 'rw3-run\.sh' 2>/dev/null)" ]; }
# A score of a Tai-taught adapter on file, on either part: from then on the recipe is closed (prereg section 11).
tai_scores_on_file() { for f in "$BENCH"/rw3-tai-groom-s*-own/*-records.jsonl "$OUT"/bench-train/rw3-tai-groom-s*-own/*-records.jsonl; do [ -e "$f" ] && return 0; done; return 1; }
# A registered chain of model steps (stage R11's nights, stage RW2's scoring) between two of its steps has no model
# process alive, and its own guard does not know this stage's trainer by name: its state file is read instead.
chains_running() { for f in $STATES; do [ "$(cat "$f" 2>/dev/null)" = running ] && echo "$f"; done; }
sealed_on_hand() { [ -e "$REC/tai-groom/records-sealed.jsonl" ]; }
have() { [ -e "$1/adapters/$2/adapter_model.safetensors" ] && [ -e "$1/adapters/$2/manifest.json" ]; }   # trained to the end: the manifest is the trainer's last write
cut_short() { [ -e "$1/adapters/$2/adapter_model.safetensors" ] && [ ! -e "$1/adapters/$2/manifest.json" ]; }
assembled() { [ -f "$FT/tai/train.jsonl" ] && [ -f "$FT/tai/data-manifest.json" ]; }
records_on_hand() { [ -f "$REC/tai-groom/records-train.jsonl" ] && [ -f "$REC/tai-groom/records-development.jsonl" ]; }
scored() { [ -s "$1/$2-own/tai-groom-$3-gliner-records.jsonl" ] && [ -s "$1/$2-own/tai-groom-$3-gliner+fan2-records.jsonl" ]; }   # <bench> <adapter> <part>
# Every refusal comes before the hold, and the caller has checked its arguments before it calls this: nothing waits on a wrong call.
before_model() { # <what>
  procs_readable || refuse "the process list cannot be read (not even this script is found in it), so it cannot be told whether another model process is running ($1)" 3
  others="$(model_procs)"
  if [ -n "$others" ]; then
    echo "$others"
    [ -z "$RW3_ALLOW_OTHER_MODEL" ] && refuse "another model process is running ($1)" 3
    say "OVERRIDE [$STEP] RW3_ALLOW_OTHER_MODEL is set: going on beside another model process ($1)"
  fi
  chains="$(chains_running)"
  [ -n "$chains" ] && { echo "$chains"; refuse "a registered chain of model steps says it is running ($1)" 3; }
  if [ -n "$(git status --porcelain)" ]; then
    [ -z "$RW3_ALLOW_DIRTY" ] && refuse "the tree is not clean; commit first ($1)" 3
    say "OVERRIDE [$STEP] RW3_ALLOW_DIRTY is set: going on from a tree that is not clean ($1)"
  fi
  [ -x "$MGOGO_DECIDE_PYTHON" ] || refuse "the model runtime is not at $MGOGO_DECIDE_PYTHON ($1)" 3
  # RW3_NO_MODEL: a test of this script's own refusals stops here, before the hold and the model step, whatever came before
  [ -n "$RW3_NO_MODEL" ] && { say "STOPPED [$STEP] RW3_NO_MODEL is set: no refusal applies and nothing was started"; exit 0; }
  hold_swap
  if [ "$n" -gt 0 ]; then
    procs_readable || refuse "the process list cannot be read after a hold of $n min ($1)" 3
    others="$(model_procs)"; [ -n "$others" ] && [ -z "$RW3_ALLOW_OTHER_MODEL" ] && { echo "$others"; refuse "another model process started during a hold of $n min ($1)" 3; }
  fi
  say "MACHINE [$STEP] before the model load: $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min$([ "$still" -ge 5 ] && echo ' (swap above 6 GB and not falling: going ahead)')"
  return 0
}
step() { echo "RW3 start: $* ($(date '+%H:%M'))"; "$@" || { echo "RW3 failed: $*"; exit 1; }; }
# A step whose output is also kept: to the terminal and to a log file, the step's own exit status kept (a pipe would hide it).
logged() { # <log name> <command…>
  name="$1"; shift; mkdir -p "$LOGS"; log="$LOGS/$(date '+%Y%m%d-%H%M%S')-$name.log"; st="$log.status"
  echo "RW3 start: $* ($(date '+%H:%M')); log: $log"
  { "$@" 2>&1; echo "$?" > "$st"; } | tee "$log"
  rc="$(cat "$st" 2>/dev/null || echo 1)"; rm -f "$st"
  [ "$rc" = 0 ] || { echo "RW3 failed (exit $rc): $*; log: $log"; exit 1; }
}

run_step() {
  sealed_on_hand && refuse "an opened sealed file lies under $REC/tai-groom: this stage does not run beside it"
  case "$1" in
  check)
    if records_on_hand; then echo "records: $REC (train and development on hand)"; else echo "records: $REC (NOT on hand: run the dry step with data/raw linked, or copy the artifacts/rw2 of a frozen checkout)"; fi
    if [ -f "$RAW/dryad-t8c88vh/Data+Model2.csv" ]; then echo "raw deposits: $RAW (linked: the dry step makes the records again and runs the history check)"; else echo "raw deposits: $RAW (not linked: the dry step uses the records on hand and says the history check was not run)"; fi
    if assembled; then echo "training file: $FT/tai (on file)"; else echo "training file: $FT/tai (not built yet: the dry step builds it)"; fi
    for s in 7 11; do a="rw3-tai-groom-s$s"
      if have "$FT" "$a"; then echo "trained: $a  $(shasum -a 256 "$FT/adapters/$a/adapter_model.safetensors" | cut -c1-16)"; elif cut_short "$FT" "$a"; then echo "CUT SHORT (weights, no manifest.json; it is not used): $a - delete $FT/adapters/$a and train it again"; else echo "not trained yet: $a"; fi; done
    echo "the Ngogo-taught adapter: $NGOGO_FT ($(have "$NGOGO_FT" "$NGOGO" && echo found || echo "MISSING: $NGOGO under $NGOGO_FT/adapters"))"
    for a in base "$NGOGO" rw3-tai-groom-s7 rw3-tai-groom-s11; do echo "development scores of $a: $(scored "$BENCH" "$a" development && echo 'on file' || echo 'not yet')"; done
    echo "model runtime: $MGOGO_DECIDE_PYTHON ($([ -x "$MGOGO_DECIDE_PYTHON" ] && echo found || echo MISSING))"
    echo "machine: $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use"
    # every reason a model step would refuse or wait, all of them, starting nothing; exit 3 if it would refuse
    if tai_scores_on_file; then echo "RW3 check: a score of a Tai-taught adapter is on file: the recipe is closed, and train would refuse for an adapter that is not trained to the end"; else echo "RW3 check: no score of a Tai-taught adapter is on file"; fi
    rc=0; others="$(model_procs)"; chains="$(chains_running)"
    if procs_readable; then echo "RW3 check: the process list can be read"; else echo "RW3 check: the process list cannot be read; a model step would refuse"; rc=3; fi
    if [ -n "$others" ]; then echo "RW3 check: another model process is running; a model step would refuse:"; echo "$others"; rc=3; else echo "RW3 check: no other model process"; fi
    if [ -n "$chains" ]; then echo "RW3 check: a registered chain of model steps says it is running; a model step would refuse:"; echo "$chains"; rc=3; else echo "RW3 check: no registered chain is running"; fi
    if [ -n "$(git status --porcelain)" ]; then echo "RW3 check: the tree is not clean; a model step would refuse"; rc=3; else echo "RW3 check: the tree is clean"; fi
    if [ "$(swap_mb)" -gt 6144 ]; then echo "RW3 check: swap in use is above 6 GB; a model step would hold now (while it keeps falling, 30 minutes at most)"; else echo "RW3 check: swap is under the hold line (6 GB)"; fi
    return "$rc" ;;
  dry)
    HIST="$OUT/history-check.json"
    if [ -f "$RAW/dryad-t8c88vh/Data+Model2.csv" ]; then
      # the derived records, made again by the only reader of the raw files; its manifest goes beside the status log and must be the committed one
      step "$SYSPY" -I scripts/rw2/rw2_ingest.py --raw "$RAW" --out "$REC" --manifest "$OUT/rw2-manifest.again.json"
      cmp -s "$OUT/rw2-manifest.again.json" data/rw2-manifest.json || { echo "RW3 failed: the reader's manifest is not the committed data/rw2-manifest.json"; exit 1; }
      echo "RW3 dry: the reader's manifest is the committed one"
      step "$SYSPY" -I scripts/rw3/rw3_history_check.py --raw "$RAW" --json "$HIST"
    else
      echo "RW3 dry: $RAW is not linked; the derived records on hand are used and the history check (prereg section 7, check 5) is NOT run"
      rm -f "$HIST"
    fi
    records_on_hand || { echo "RW3 failed: no derived records under $REC/tai-groom"; exit 1; }
    step $TSX scripts/rw3-assemble.ts --dir "$REC" --out "$FT" --history-check "$HIST" --json "$OUT/dry-counts.json"
    step $TSX scripts/rw3-report.ts sizes --dir "$REC" --json "$OUT/dry-sizes.json"
    # the training entry point, up to the model load and no further: the standard library alone, the system's interpreter
    export MGOGO_FT_ROOT="$AFT"
    for s in 7 11; do a="rw3-tai-groom-s$s"
      if [ -e "$FT/adapters/$a/adapter_model.safetensors" ]; then echo "RW3 dry: $a holds weights already; its pre-load check is not repeated (the trainer refuses to train over it)"
      else step "$SYSPY" -I training/decide_ft/train_rw3.py --name "$a" --train tai/train.jsonl --extra tai/data-manifest.json --seed "$s" --stop-before-load 1; fi
    done
    echo "RW3 dry: done; no model was loaded" ;;
  train)
    case "$2" in 7|11) ;; *) refuse "training seed 7 or 11 (the registered seeds, docs/staging/rw3-prereg.md section 3)" ;; esac
    [ -z "$3" ] || refuse "train takes one word, the training seed"
    NAME="rw3-tai-groom-s$2"
    assembled || refuse "no training file under $FT/tai: run the dry step first"
    # a finished step does nothing when it is run again, so a chain can be launched again after a failure
    have "$FT" "$NAME" && { say "ON FILE [$STEP] $FT/adapters/$NAME is trained to the end; it is not trained again"; exit 0; }
    # once a score of a Tai-taught adapter is on file the recipe is closed (prereg section 11): nothing is trained after it
    tai_scores_on_file && refuse "a score of a Tai-taught adapter is on file: the recipe is closed and nothing is trained after it (docs/staging/rw3-prereg.md section 11). After an S0 that failed for a fault only a new training repairs: log the iteration in the registration first, then move the invalid scores away"
    cut_short "$FT" "$NAME" && refuse "$FT/adapters/$NAME holds a training cut short (weights, no manifest.json); delete the folder, then run this step again"
    # the chooser's own future (prereg section 7, check 5) is checked where the dates are: a file built without it does not teach
    grep -q '"historyCheck": "not run' "$FT/tai/data-manifest.json" && refuse "the training file was built without the history check: link data/raw and run the dry step again"
    before_model "train $NAME"
    export MGOGO_FT_ROOT="$AFT"
    logged "train-$NAME" $KEEP "$PY" train_rw3.py --name "$NAME" --train tai/train.jsonl --extra tai/data-manifest.json --seed "$2"
    have "$FT" "$NAME" || { echo "RW3 failed: the trainer ended without a manifest for $NAME"; exit 1; } ;;
  eval)
    case "$2" in 7|11) A="rw3-tai-groom-s$2"; AROOT="$AFT" ;; base) A=base; AROOT="$AFT" ;; ngogo) A="$NGOGO"; AROOT="$NGOGO_FT" ;; *) refuse "eval takes 7, 11, base (the untuned model) or ngogo (the Ngogo-taught adapter)" ;; esac
    case "${3:-development}" in development) PART=development; B="$BENCH" ;; train) PART=train; B="$OUT/bench-train" ;; *) refuse "eval scores the development part, or the train part as a description of fit; nothing else" ;; esac
    records_on_hand || refuse "no derived records under $REC/tai-groom: run the dry step with data/raw linked, or copy the artifacts/rw2 of a frozen checkout"
    if [ "$A" != base ]; then
      cut_short "$AROOT" "$A" && refuse "$AROOT/adapters/$A is a training cut short (weights, no manifest.json); it is never scored"
      have "$AROOT" "$A" || refuse "no adapter $A under $AROOT/adapters (the scoring worker would answer with the untuned model)"
    fi
    # both trainings come before any Tai-taught adapter is scored (amendments 6 and 11): no score of one exists while a training is still to run
    case "$2" in 7|11) { have "$AFT" rw3-tai-groom-s7 && have "$AFT" rw3-tai-groom-s11; } || refuse "both adapters are trained before either is scored (docs/staging/rw3-prereg.md section 12.1, amendment 6): rw3-tai-groom-s7 and rw3-tai-groom-s11 must both be trained to the end" ;; esac
    if scored "$B" "$A" "$PART"; then
      [ -z "$RW3_RERUN" ] && { say "ON FILE [$STEP] the $PART scores of $A are under $B/$A-own; they are not made again"; exit 0; }
      say "OVERRIDE [$STEP] RW3_RERUN is set: the $PART scores of $A on file are made again"
    fi
    mkdir -p "$B/$A-own"
    # the weights about to be scored, named beside the scores: the report holds them against the adapter's manifest (amendment 10)
    if [ "$A" != base ]; then shasum -a 256 "$AROOT/adapters/$A/adapter_model.safetensors" | cut -d' ' -f1 > "$B/$A-own/adapter.sha256"; fi
    before_model "score $A on the $PART part"
    export MGOGO_FT_ROOT="$AROOT" MGOGO_FT_ADAPTERS="$A"
    logged "eval-$A-$PART" $KEEP $TSX scripts/rw2-score.ts --dataset tai-groom --part "$PART" --kernels null,rules,gliner,gliner+fan2 --load-model --adapter "$A" --view own \
      --dir "$REC" --out "$B/$A-own" --md "$B/$A-own/numbers.md"
    scored "$B" "$A" "$PART" || { echo "RW3 failed: the scorer ended without the per-record files of $A"; exit 1; }
    if [ "$A" != base ]; then [ "$(shasum -a 256 "$AROOT/adapters/$A/adapter_model.safetensors" | cut -d' ' -f1)" = "$(cat "$B/$A-own/adapter.sha256")" ] || { echo "RW3 failed: the weights of $A changed while they were scored"; exit 1; }; fi ;;
  report)
    records_on_hand || refuse "no derived records under $REC/tai-groom"
    mkdir -p "$TABLES"
    step $TSX scripts/rw3-report.ts --bench "$BENCH" --dir "$REC" --ft "$FT" --md "$TABLES/rw3-numbers.md" --json "$TABLES/rw3-numbers.json"
    if [ -d "$OUT/bench-train" ]; then step $TSX scripts/rw3-report.ts --part train --bench "$OUT/bench-train" --dir "$REC" --ft "$FT" --md "$TABLES/rw3-fit.md"; fi ;;
  publish)
    n=0
    for f in rw3-numbers.md rw3-fit.md; do
      [ -f "$TABLES/$f" ] || continue
      if cmp -s "$TABLES/$f" "$DOCS/$f"; then echo "RW3 publish: $DOCS/$f is already the generated table"; else cp "$TABLES/$f" "$DOCS/$f" && echo "RW3 publish: $TABLES/$f -> $DOCS/$f"; n=$((n + 1)); fi
    done
    echo "RW3 publish: $n table(s) copied from $TABLES; commit them before another model step (a model step refuses a tree that is not clean)" ;;
  esac
}

say "START [$STEP]"
( run_step "$@" ); rc=$?
say "END   [$STEP] rc=$rc"
exit "$rc"
