#!/bin/sh
# Stage R11 (docs/staging/r11-prereg.md): every run of the honest retraining, one process at a time. A model step
# (train, parity, tokens, offline, baseline, loop, arms) first checks its arguments and what it needs on file (a wrong name is
# refused at once, before anything waits), then refuses while another model process of this project is alive and
# refuses a tree that is not clean, then writes the load and the swap in use and holds while swap in use is above 6 GB
# (re-checked every minute, for as long as swap keeps falling and for 30 minutes at most, then it goes ahead and says
# so; after a hold it looks for another model process again). The output of every model step is also written to a log
# under artifacts/r11/logs (R11_LOGS).
# A simulation step waits while the 1-minute load is 8 or more. It stops at the first failed step; a replay that does
# not reproduce its run is a failed step. An arm or a score file on file is never run again. An adapter is on file once
# its training has ended (manifest.json, the trainer's last write): weights without a manifest are a training cut short
# (an early epoch's), which is never scored, never sent into the loop and never trained over.
#
#   no model:
#   scripts/r11-run.sh sample                 the six sampling worlds (seeds 48, 7, 21; both bases), then `assemble`
#   scripts/r11-run.sh assemble [p5a]         the training, development and held-out files of both arms, their manifest, the data tables and the offline floors;
#                                             with an arm named, that arm alone is rebuilt and the other's files are left as they are and checked (prereg §13.1).
#                                             Also renders the like-for-like baseline's packets (§13.2)
#   scripts/r11-run.sh controls <seed>        stage R7's sixteen control arms at ten animals for five days on a test seed (4111 or 4222)
#   scripts/r11-run.sh dry                    seed 48, one day: the control arms, then the model arms' own path (worker process, guarded scorer, GLiNER
#                                             kernel, packet 5, receipts, decode, replay) against a fake worker that holds no model; then every report on it
#   scripts/r11-run.sh replay <seed> <a,b>    replay arms already on file from their receipts
#   scripts/r11-run.sh report                 every table from what is on file -> artifacts/r11/tables (R11_SEEDS=4111: one test seed alone)
#   scripts/r11-run.sh publish                copy the generated tables into docs/staging, once, after the last model step; then commit them
#   scripts/r11-run.sh check                  the pre-flight of a model step, starting nothing: folders, files, adapters, swap, other model processes
#   model (the integrator):
#   scripts/r11-run.sh train <p5b|p5a> <7|11> one adapter (r11-<arm>-s<seed>): soft labels, R4's settings; training seeds 7 and 11 only; refuses to overwrite an adapter
#                                             (after a training cut short: delete its folder under adapters/, then run the step again)
#   scripts/r11-run.sh train-hard <arm> <seed>  the one-hot comparison on the same rows (r11-<arm>-s<seed>-hard); offline only
#   scripts/r11-run.sh parity <p5b|p5a>       training inputs against the serving path on 12 development packets (CPU)
#   scripts/r11-run.sh tokens                 real token counts of every packet a model reads, by the tokenizer alone (CPU; no weights are loaded), and the
#                                             model time they project to (artifacts/r11/tables/r11-costs.md)
#   scripts/r11-run.sh baseline               optional (prereg §13.2): the first adapter on this stage's held-out fresh draws, its own packet with the rules'
#                                             wording and with neutral options; then its table and the offline table (a description beside W1)
#   scripts/r11-run.sh offline                score the held-out packets with the untuned model and every adapter on file, then the offline table
#   scripts/r11-run.sh loop <seed>            the registered model arms (prereg §11.1: stage R9 named no standard, so the top pick with a draw arm beside it),
#                                             in the order of §11.2, for the adapters on file and the arms not yet on file: this stage's adapters first,
#                                             then the first adapter on its own packet; then their replays. Run it again after more adapters are trained.
#   scripts/r11-run.sh arms <seed> <a,b>      named arms of scripts/r11-loop.ts in one worker process (this stage's adapters, or `old-…` alone; the optional
#                                             `old-draw-1`); then their replays. Refuses an unknown name, an untrained adapter and an arm already on file.
#
# Generated tables go under artifacts/r11/tables (R11_TABLES), which git ignores, so the launch order runs end to end
# from a frozen checkout. R11_FT_ROOT: this stage's data and adapters (default artifacts/decide-ft/r11). R11_OLD_FT: the
# folder whose adapters/ holds r4-rules-state (default: this checkout's, else the worktree that made it). R11_WORDING:
# stage R8's generated wording table, the baseline of prereg §11.4 (default docs/staging/r8-wording-numbers.md, which a
# checkout holds once stage R8's result is merged; without it the reading W1 is printed as "not read").
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"; WT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees
first_dir() { for d in "$@"; do [ -d "$d" ] && { echo "$d"; return; }; done; echo "$1"; }
FT="${R11_FT_ROOT:-artifacts/decide-ft/r11}"; LOOP="${R11_OUT:-artifacts/r11/loop}"; DRY="${R11_DRY:-artifacts/r11/dry}"
TABLES="${R11_TABLES:-artifacts/r11/tables}"; DOCS="${R11_DOCS:-docs/staging}"
OLD_FT="${R11_OLD_FT:-$(first_dir artifacts/decide-ft/r4c "$WT/r4b-retrain/artifacts/decide-ft/r4c" "$WT/r4-train/artifacts/decide-ft/r4")}"
case "$FT" in /*) AFT="$FT" ;; *) AFT="$ROOT/$FT" ;; esac   # the same folder as an absolute path, for the Python side
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
TSX="fnm exec --using=22.22.3 -- pnpm exec tsx"
PY="$ROOT/training/decide_ft/r4_py.sh"
KEEP=""; command -v caffeinate >/dev/null 2>&1 && KEEP="caffeinate -i"   # a model step must not be cut short by the machine going to sleep
TEST_SEEDS="4111,4222"; NEW="r11-p5b-s7 r11-p5a-s7 r11-p5b-s11 r11-p5a-s11"   # in the order of prereg §11.2: the first training seed of each arm, then the second
LOGS="${R11_LOGS:-artifacts/r11/logs}"
WORLDS="48:W50:6 48:W25:12 7:W50:6 7:W25:12 21:W50:6 21:W25:12"   # seed:base:burn-in days (prereg §3); six days sampled at 0.09

# prereg §11.1: stage R9 named no standard decode, so the top pick is primary and a draw arm runs beside it; no other decode is launched from here
case "${R11_DECODE:-}" in ''|top|none) ;; *) echo "R11_DECODE=$R11_DECODE: stage R9 named no standard (docs/staging/r11-prereg.md §11.1); leave it unset"; exit 2 ;; esac
swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
# The hold before a model load: while swap in use is above 6 GB, for 30 minutes at most, and only as long as waiting
# helps. When swap has not fallen by 50 MB in five minutes it is other programs' and will not drain: the step goes
# ahead and says so. (11 October: two steps of stage R9 each waited the whole half hour at an unchanged 6,455 MB and
# then went ahead; a night of this stage has nine model steps.) Sets n, the minutes waited, and still.
hold_swap() {
  n=0; still=0; last="$(swap_mb)"
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ] && [ "$still" -lt 5 ]; do
    echo "R11 hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1))
    now="$(swap_mb)"; if [ "$now" -lt "$((last - 50))" ]; then still=0; last="$now"; else still=$((still + 1)); fi
  done
}
load1() { uptime | sed -E 's/.*load averages?: ([0-9]+).*/\1/'; }
hold_load() { n=0; while [ "$(load1)" -ge 8 ] && [ "$n" -lt 60 ]; do echo "R11 hold: 1-minute load $(load1), 8 or more ($n min waited)"; sleep 60; n=$((n + 1)); done; }
# Another model process of this project: anything run by the model runtime's interpreter, and, because that interpreter
# shows in the process list under the framework's own path once it has started (seen on this machine: a running scorer
# is not matched by the interpreter's path), anything running one of this folder's model scripts or the app's resident
# worker. The interpreter's path counts only at the start of a command line: a shell or a monitor whose text merely
# names the path (an `export`, a `ps | grep`) is not a model process and must not make a night's step refuse.
model_procs() {
  { pgrep -fl "^$MGOGO_DECIDE_PYTHON( |\$)"; pgrep -fl -- '-B (worker|server|em_score|score_contexts|eval_offline|eval_ab|parity|r8_tokens|token_audit|train|train_r4|train_r11|distill|bench_batch|bench_train)\.py'
    pgrep -fl -- '-m experiments\.active_perception\.decide_provider'; } 2>/dev/null | grep -v pgrep | grep -v fake-worker.mjs | sort -u
}
refuse_other_model() { # <what>
  others="$(model_procs)"
  if [ -n "$others" ] && [ -z "$R11_ALLOW_OTHER_MODEL" ]; then echo "R11 refused ($1): another model process is running:"; echo "$others"; exit 3; fi
}
# Every refusal comes before the hold, and the caller has checked its arguments before it calls this: nothing waits on a wrong call.
before_model() { # <what>
  refuse_other_model "$1"
  if [ -n "$(git status --porcelain)" ] && [ -z "$R11_ALLOW_DIRTY" ]; then echo "R11 refused ($1): the tree is not clean; commit first"; exit 3; fi
  hold_swap
  [ "$n" -gt 0 ] && refuse_other_model "$1, after a hold of $n min"   # a hold is long enough for another model process to have started
  echo "R11 machine before model load ($1): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min$([ "$still" -ge 5 ] && echo ' (swap above 6 GB and not falling: going ahead)')"
}
step() { echo "R11 start: $* ($(date '+%H:%M'))"; "$@" || { echo "R11 failed: $*"; exit 1; }; }
# A step whose output is also kept: to the terminal and to a log file, the step's own exit status kept (a pipe would hide it).
logged() { # <log name> <command…>
  name="$1"; shift; mkdir -p "$LOGS"; log="$LOGS/$(date '+%Y%m%d-%H%M%S')-$name.log"; st="$log.status"
  echo "R11 start: $* ($(date '+%H:%M')); log: $log"
  { "$@" 2>&1; echo "$?" > "$st"; } | tee "$log"
  rc="$(cat "$st" 2>/dev/null || echo 1)"; rm -f "$st"
  [ "$rc" = 0 ] || { echo "R11 failed (exit $rc): $*; log: $log"; exit 1; }
}
seed_ok() { case "$1" in 4111|4222) ;; *) echo "seed 4111 or 4222 (docs/staging/r11-prereg.md §5); 4333 and 4444 stay sealed"; exit 2 ;; esac; }
arm_ok() { case "$1" in p5a|p5b) ;; *) echo "arm p5b or p5a (docs/staging/r11-prereg.md §1)"; exit 2 ;; esac; }
have() { [ -e "$1/adapters/$2/adapter_model.safetensors" ] && [ -e "$1/adapters/$2/manifest.json" ]; }   # trained to the end: the manifest is the trainer's last write
cut_short() { [ -e "$1/adapters/$2/adapter_model.safetensors" ] && [ ! -e "$1/adapters/$2/manifest.json" ]; }   # weights of an early epoch, the training never ended
assembled() { [ -f "$FT/manifest.json" ] && [ -f "$FT/p5b/contexts/train.jsonl" ] && [ -f "$FT/eval/all.jsonl" ] || { echo "R11: no assembled files under $FT ('$0 sample')"; exit 2; }; }
model_arms() { # <seed> <arms> <adapters root> <adapters>
  export MGOGO_FT_ROOT="$3" MGOGO_FT_ADAPTERS="$4"
  [ -d "$3/adapters" ] || { echo "R11: no adapters under $3"; exit 2; }
  before_model "seed $1: $2"
  logged "loop-s$1-$(echo "$2" | tr ',' '+' | cut -c1-80)" $KEEP $TSX scripts/r11-loop.ts engine --seed "$1" --arms "$2" --out "$LOOP"
  step $TSX scripts/r11-loop.ts engine --seed "$1" --arms "$2" --out "$LOOP" --replay
}
controls_on_file() { [ -f "$LOOP/F/s$1/rules-1.json" ] || { echo "R11: the control arms of seed $1 are not on file ('$0 controls $1'); they run before any engine arm (docs/staging/r11-prereg.md §5)"; exit 2; }; }
tai() { [ -f "$1/tai.json" ] || step $TSX scripts/r7-card.ts tai --out "$1"; }   # the Taï half-hour anchor (aggregates only), which stage R7's report reads
reports() { # <loop dir> <seeds> <prefix> [dry]
  mkdir -p "$TABLES"
  engine="$($TSX scripts/r11-report.ts --dir "$1" --seeds "$2" --engine-arg)" || { echo "R11 failed: the engine arms on file under $1"; exit 1; }
  title="Stage R11: stage R7's timing card on seeds $2, the control arms${engine:+ and the engine arms} (numbers)${4:+ - DRY RUN, a fake worker, not a result}"
  note="Written by stage R7's report script for stage R11 (r11-prereg.md, sections 5 and 6.2). The worlds also carry observeV5 1 from the first tick (the rules never read it) and every arm continues this stage's own burn-in. Every engine arm is a rules-taught model on a rules menu: its teacher is the rules, and soft labels teach the rules' judgment more faithfully, which is a scaffold. The stage's own readings (the registered statements, the spreads, lock-in) are in r11-numbers.md."
  if [ -n "$engine" ]; then step $TSX scripts/r7-report.ts --dir "$1" --units F --seeds "$2" --engine "$engine" --title "$title" --note "$note" --md "$TABLES/$3-card.md"
  else step $TSX scripts/r7-report.ts --dir "$1" --units F --seeds "$2" --title "$title" --note "$note" --md "$TABLES/$3-card.md"; fi
  step $TSX scripts/r11-report.ts --dir "$1" --seeds "$2" --md "$TABLES/$3-numbers.md" ${4:+--dry}
}

case "$1" in
  sample-worlds)
    for w in $WORLDS; do
      seed="${w%%:*}"; rest="${w#*:}"; base="${rest%%:*}"; burn="${rest#*:}"
      hold_load
      step $TSX scripts/r11-contexts.ts --seed "$seed" --base "$base" --burn-in "$burn" --days 6 --p 0.09 --out "$FT/parts" --check
    done ;;
  assemble)
    case "${2:-}" in ''|p5a|p5b) ;; *) echo "usage: $0 assemble [p5a|p5b] (the one arm to rebuild; without it, both)"; exit 2 ;; esac
    step $TSX scripts/r11-assemble.ts --parts "$FT/parts" --out "$FT" ${2:+--arms "$2"}
    step $TSX scripts/r11-baseline.ts render --dir "$FT"   # the like-for-like baseline's two renderings of the held-out fresh draws (no model; prereg §13.2)
    mkdir -p "$TABLES"
    step $TSX scripts/r11-data-report.ts --manifest "$FT/manifest.json" --md "$TABLES/r11-data.md" --json "$TABLES/r11-manifest.json"
    step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ${R11_WORDING:+--wording "$R11_WORDING"} ;;
  sample) "$ROOT/scripts/r11-run.sh" sample-worlds && "$ROOT/scripts/r11-run.sh" assemble || exit 1 ;;
  controls)
    seed_ok "$2"; hold_load
    tai "$LOOP"
    step $TSX scripts/r11-loop.ts controls --seed "$2" --out "$LOOP" ;;
  dry)
    hold_load
    unset MGOGO_DECIDE_SERVER
    MGOGO_DECIDE_PYTHON="$ROOT/scripts/lib/fake-worker.mjs" logged dry $TSX scripts/r11-loop.ts dry --out "$DRY"
    tai "$DRY"
    reports "$DRY" 48 r11-dry dry
    # the offline report's own plumbing, on the fake worker's odds (never a result): only when the held-out packets are on file
    if [ -f "$FT/eval/all.jsonl" ]; then
      # the like-for-like baseline's plumbing (prereg §13.2): its two renderings, a score file by the fake worker's rule, its table; all in the dry folder
      step $TSX scripts/r11-baseline.ts render --dir "$FT" --out "$DRY/baseline"
      step $TSX scripts/r11-baseline.ts report --dir "$FT" --scores "$DRY/baseline" --fake --md "$TABLES/r11-dry-baseline.md"
      step $TSX scripts/r11-offline.ts --dir "$FT" --fake "$DRY/offline" --baseline "$DRY/baseline" --md "$TABLES/r11-dry-offline.md"
    else echo "R11 dry: no held-out packets under $FT yet; the offline report's dry run is skipped ('$0 sample' first)"; fi ;;
  check)
    echo "data and adapters: $FT"; ls "$FT/manifest.json" "$FT"/p5b/contexts/train.jsonl "$FT"/p5a/contexts/train.jsonl "$FT"/eval/all.jsonl 2>&1
    for a in $NEW; do if have "$FT" "$a"; then shasum -a 256 "$FT/adapters/$a/adapter_model.safetensors"; elif cut_short "$FT" "$a"; then echo "CUT SHORT (weights, no manifest.json; it is not used): $a - delete $FT/adapters/$a and train it again"; else echo "not trained yet: $a"; fi; done
    echo "the first adapter: $OLD_FT"; if have "$OLD_FT" r4-rules-state; then shasum -a 256 "$OLD_FT/adapters/r4-rules-state/adapter_model.safetensors"; else echo "MISSING: r4-rules-state under $OLD_FT/adapters"; fi
    echo "like-for-like baseline (optional, prereg §13.2): packets $([ -f "$FT/eval/baseline.jsonl" ] && echo rendered || echo 'not rendered'); $([ -s "$FT/eval/baseline.r4-rules-state.jsonl" ] && echo 'scored, on file' || echo 'not scored')"
    echo "control arms on file: $(ls "$LOOP"/F/s4111/rules-1.json "$LOOP"/F/s4222/rules-1.json 2>/dev/null | wc -l | tr -d ' ') of 2 seeds; decode: the top pick, a draw arm beside it (stage R9 named no standard; prereg §11.1)"
    echo "model runtime: $MGOGO_DECIDE_PYTHON ($([ -x "$MGOGO_DECIDE_PYTHON" ] && echo found || echo MISSING))"
    echo "machine: $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use"
    # every reason a model step would refuse or wait, all of them, starting nothing; exit 3 if it would refuse
    rc=0; others="$(model_procs)"
    if [ -n "$others" ]; then echo "R11 check: another model process is running; a model step would refuse:"; echo "$others"; rc=3; else echo "R11 check: no other model process"; fi
    if [ -n "$(git status --porcelain)" ]; then echo "R11 check: the tree is not clean; a model step would refuse"; rc=3; else echo "R11 check: the tree is clean"; fi
    if [ "$(swap_mb)" -gt 6144 ]; then echo "R11 check: swap in use is above 6 GB; a model step would hold now (while it keeps falling, 30 minutes at most)"; else echo "R11 check: swap is under the hold line (6 GB)"; fi
    [ "$rc" = 0 ] || exit "$rc" ;;
  train|train-hard)
    arm_ok "$2"; assembled
    case "$3" in 7|11) ;; *) echo "usage: $0 $1 <p5b|p5a> <training seed: 7 or 11> (the registered training seeds, docs/staging/r11-prereg.md §4)"; exit 2 ;; esac
    NAME="r11-$2-s$3"; LABELS=soft; [ "$1" = train-hard ] && { NAME="$NAME-hard"; LABELS=hard; }
    have "$FT" "$NAME" && { echo "R11: $FT/adapters/$NAME exists already; it is not overwritten"; exit 2; }
    cut_short "$FT" "$NAME" && { echo "R11: $FT/adapters/$NAME holds a training cut short (weights, no manifest.json); delete the folder, then run this step again"; exit 2; }
    before_model "train $NAME (labels $LABELS, training seed $3)"
    export MGOGO_FT_ROOT="$FT"
    logged "train-$NAME" $KEEP "$PY" train_r11.py --name "$NAME" --train "$2/contexts/train.jsonl" --dev "$2/contexts/dev.jsonl" --extra "$2/contexts/manifest.json" --epochs 3 --seed "$3" --labels "$LABELS" ;;
  parity)
    arm_ok "$2"; assembled
    before_model "token parity, $2"
    export MGOGO_FT_ROOT="$FT/$2"
    step "$PY" parity.py --n 12 --device cpu ;;
  tokens)
    assembled
    before_model "real token counts (the tokenizer alone)"
    export MGOGO_FT_ROOT="$FT"
    step "$PY" r8_tokens.py --in "$AFT/eval/all.jsonl" --packets p5a,p5b --out "$AFT/eval/tokens.jsonl"
    # every packet a model reads (both arms' training, development and held-out packets; the baseline's two renderings when on file)
    step "$PY" r11_tokens.py --root "$AFT" --out "$AFT/eval/token-counts.json" --rows "$AFT/eval/token-rows.jsonl"
    mkdir -p "$TABLES"
    step $TSX scripts/r11-costs.ts --counts "$FT/eval/token-counts.json" --md "$TABLES/r11-costs.md"
    step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ${R11_WORDING:+--wording "$R11_WORDING"} ;;
  baseline)
    # optional (prereg §13.2): the first adapter on this stage's held-out fresh draws, on its own packet with the rules' wording and with neutral options
    assembled
    have "$OLD_FT" r4-rules-state || { echo "R11 baseline: r4-rules-state is not under $OLD_FT/adapters with its manifest (R11_OLD_FT names the folder that holds adapters/)"; exit 2; }
    step $TSX scripts/r11-baseline.ts render --dir "$FT"   # no model: the two renderings, checked draw by draw against the P5b packets; refused if a score file on hand was made from other packets
    if [ -s "$FT/eval/baseline.r4-rules-state.jsonl" ]; then echo "R11 baseline: $FT/eval/baseline.r4-rules-state.jsonl is on file; not scored again"
    else
      before_model "the like-for-like baseline: r4-rules-state on the held-out fresh draws, its own packet with the rules' wording and with neutral options"
      export MGOGO_FT_ROOT="$OLD_FT"
      logged "baseline-r4-rules-state" $KEEP "$PY" em_score.py --in "$AFT/eval/baseline.jsonl" --packets oldState,oldNeutral --provider r4-rules-state --out "$AFT/eval/baseline.r4-rules-state.jsonl.part"
      mv "$FT/eval/baseline.r4-rules-state.jsonl.part" "$FT/eval/baseline.r4-rules-state.jsonl"
    fi
    mkdir -p "$TABLES"
    step $TSX scripts/r11-baseline.ts report --dir "$FT" --md "$TABLES/r11-baseline.md" ${R11_WORDING:+--wording "$R11_WORDING"}
    step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ${R11_WORDING:+--wording "$R11_WORDING"} ;;
  offline)
    assembled
    # the untuned model on every packet; each adapter on its own arm's packets
    for p in base $NEW r11-p5b-s7-hard r11-p5b-s11-hard r11-p5a-s7-hard r11-p5a-s11-hard; do
      case "$p" in base) P=p5b,p5bNoDoing,p5bProbe,p5a,p5aNoDoing,p5aProbe ;; *p5b*) P=p5b,p5bNoDoing,p5bProbe ;; *) P=p5a,p5aNoDoing,p5aProbe ;; esac
      [ "$p" = base ] || ! cut_short "$FT" "$p" || { echo "R11 offline: $p is a training cut short (weights, no manifest.json); NOT scored. Delete $FT/adapters/$p and train it again"; continue; }
      [ "$p" = base ] || have "$FT" "$p" || { echo "R11 offline: no adapter $p; skipped"; continue; }
      [ -s "$FT/eval/all.$p.jsonl" ] && { echo "R11 offline: $FT/eval/all.$p.jsonl is on file; not scored again"; continue; }
      before_model "score the held-out packets with $p"
      export MGOGO_FT_ROOT="$FT"
      logged "offline-$p" $KEEP "$PY" em_score.py --in "$AFT/eval/all.jsonl" --packets "$P" --provider "$p" --out "$AFT/eval/all.$p.jsonl.part"
      mv "$FT/eval/all.$p.jsonl.part" "$FT/eval/all.$p.jsonl"
    done
    mkdir -p "$TABLES"
    step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ${R11_WORDING:+--wording "$R11_WORDING"} ;;
  loop)
    seed_ok "$2"; controls_on_file "$2"
    LIST="$($TSX scripts/r11-loop.ts list --decode none)" || { echo "R11 failed: the registered arms"; exit 1; }
    set -- "$1" "$2" $LIST
    # an arm on file is never run again (a second run of an arm is a second draw of its result); one whose replay is missing is replayed
    FRESH=""; ADAPTERS=""; OLD=""; REPLAY=""
    for a in $(echo "$3" | tr ',' ' '); do key="r11-$(echo "$a" | cut -d- -f1-2)"
      if [ -f "$LOOP/F/s$2/$a.json" ]; then echo "R11 loop: arm $a of seed $2 is on file; it is not run again"; [ -f "$LOOP/F/s$2/$a.replay.json" ] || REPLAY="$REPLAY${REPLAY:+,}$a"
      elif have "$FT" "$key"; then FRESH="$FRESH${FRESH:+,}$a"; case ",$ADAPTERS," in *",$key,"*) ;; *) ADAPTERS="$ADAPTERS${ADAPTERS:+,}$key" ;; esac
      elif cut_short "$FT" "$key"; then echo "R11 loop: $key is a training cut short (weights, no manifest.json); arm $a is left out. Delete $FT/adapters/$key and train it again"
      else echo "R11 loop: no adapter $key yet; arm $a is left out"; fi
    done
    for a in $(echo "$4" | tr ',' ' '); do
      if [ -f "$LOOP/F/s$2/$a.json" ]; then echo "R11 loop: arm $a of seed $2 is on file; it is not run again"; [ -f "$LOOP/F/s$2/$a.replay.json" ] || REPLAY="$REPLAY${REPLAY:+,}$a"; else OLD="$OLD${OLD:+,}$a"; fi
    done
    [ -n "$REPLAY" ] && step $TSX scripts/r11-loop.ts engine --seed "$2" --arms "$REPLAY" --out "$LOOP" --replay
    [ -n "$FRESH" ] && model_arms "$2" "$FRESH" "$FT" "$ADAPTERS"
    if [ -z "$OLD" ]; then :; elif have "$OLD_FT" r4-rules-state; then model_arms "$2" "$OLD" "$OLD_FT" r4-rules-state; else echo "R11 loop: r4-rules-state is not under $OLD_FT/adapters; the old adapter's arm ($OLD) is left out"; fi
    [ -n "$FRESH$OLD$REPLAY" ] || echo "R11 loop: nothing to run for seed $2 (every registered arm with a trained adapter is on file)" ;;
  arms)
    seed_ok "$2"; [ -n "$3" ] || { echo "usage: $0 arms <seed> <a,b,…>"; exit 2; }
    # the names, the control arms, the arms already on file and the adapters: all before anything waits or loads
    NEED="$($TSX scripts/r11-loop.ts names --arms "$3")" || { echo "R11 refused: arms $3 ('$TSX scripts/r11-loop.ts list' prints the registered ones)"; exit 2; }
    controls_on_file "$2"
    for a in $(echo "$3" | tr ',' ' '); do
      if [ -f "$LOOP/F/s$2/$a.json" ] && [ -z "$R11_RERUN" ]; then echo "R11 refused: arm $a of seed $2 is on file; it is not run again (a second run is a second draw of its result: log the reason in the stage document first, then R11_RERUN=1)"; exit 2; fi
    done
    case "$3" in old-*) AROOT="$OLD_FT" ;; *) AROOT="$FT" ;; esac
    for k in $NEED; do
      cut_short "$AROOT" "$k" && { echo "R11 refused: $AROOT/adapters/$k is a training cut short (weights, no manifest.json); delete the folder and train it again"; exit 2; }
      have "$AROOT" "$k" || { echo "R11 refused: no adapter $k under $AROOT/adapters (this stage's arms and the old adapter's go in separate calls)"; exit 2; }
    done
    model_arms "$2" "$3" "$AROOT" "$(echo $NEED | tr ' ' '\n' | sort -u | tr '\n' ',' | sed 's/,$//')" ;;
  replay) seed_ok "$2"; [ -n "$3" ] || { echo "usage: $0 replay <seed> <a,b,…>"; exit 2; }; step $TSX scripts/r11-loop.ts engine --seed "$2" --arms "$3" --out "$LOOP" --replay ;;
  report)
    mkdir -p "$TABLES"
    [ -f "$FT/manifest.json" ] && { step $TSX scripts/r11-data-report.ts --manifest "$FT/manifest.json" --md "$TABLES/r11-data.md" --json "$TABLES/r11-manifest.json"; step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ${R11_WORDING:+--wording "$R11_WORDING"}; }
    [ -f "$FT/eval/token-counts.json" ] && step $TSX scripts/r11-costs.ts --counts "$FT/eval/token-counts.json" --md "$TABLES/r11-costs.md"
    [ -s "$FT/eval/baseline.r4-rules-state.jsonl" ] && step $TSX scripts/r11-baseline.ts report --dir "$FT" --md "$TABLES/r11-baseline.md" ${R11_WORDING:+--wording "$R11_WORDING"}
    S="${R11_SEEDS:-}"   # R11_SEEDS=4111: one seed alone (the engine arms read are those on file for every seed named)
    [ -n "$S" ] || for s in 4111 4222; do [ -f "$LOOP/F/s$s/rules-8.json" ] && S="$S${S:+,}$s"; done
    if [ -n "$S" ]; then tai "$LOOP"; reports "$LOOP" "$S" r11; else echo "R11 report: no control arms on file under $LOOP yet"; fi ;;
  publish)
    n=0
    for f in r11-data.md r11-manifest.json r11-costs.md r11-offline.md r11-baseline.md r11-card.md r11-numbers.md r11-dry-numbers.md; do   # (the dry run's card and offline tables stay under artifacts: a fake worker's numbers)
      [ -f "$TABLES/$f" ] || continue
      if cmp -s "$TABLES/$f" "$DOCS/$f"; then echo "R11 publish: $DOCS/$f is already the generated table"; else cp "$TABLES/$f" "$DOCS/$f" && echo "R11 publish: $TABLES/$f -> $DOCS/$f"; n=$((n + 1)); fi
    done
    echo "R11 publish: $n table(s) copied from $TABLES; commit them before another model step (a model step refuses a tree that is not clean)" ;;
  *) echo "usage: $0 sample | assemble [p5a] | controls <seed> | dry | replay <seed> <a,b,…> | report | publish | check | train <p5b|p5a> <7|11> | train-hard <arm> <7|11> | parity <arm> | tokens | offline | baseline | loop <seed> | arms <seed> <a,b,…>"; exit 2 ;;
esac
echo "R11 done ($*): $(date '+%H:%M')"
