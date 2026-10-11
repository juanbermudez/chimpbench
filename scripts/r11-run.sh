#!/bin/sh
# Stage R11 (docs/staging/r11-prereg.md): every run of the honest retraining, one process at a time. A model step
# (train, parity, tokens, offline, loop, arms) writes the load and the swap in use, holds while swap in use is above
# 6 GB (re-checked every minute for up to 30 minutes, then it goes ahead and says so), refuses a tree that is not clean
# and refuses while another model process of this project is alive. A simulation step waits while the 1-minute load is
# 8 or more. It stops at the first failed step; a replay that does not reproduce its run is a failed step.
#
#   no model:
#   scripts/r11-run.sh sample                 the six sampling worlds (seeds 48, 7, 21; both bases), then `assemble`
#   scripts/r11-run.sh assemble               the training, development and held-out files of both arms, their manifest, the data tables and the offline floors
#   scripts/r11-run.sh controls <seed>        stage R7's sixteen control arms at ten animals for five days on a test seed (4111 or 4222)
#   scripts/r11-run.sh dry                    seed 48, one day: the control arms, then the model arms' own path (worker process, guarded scorer, GLiNER
#                                             kernel, packet 5, receipts, decode, replay) against a fake worker that holds no model; then every report on it
#   scripts/r11-run.sh replay <seed> <a,b>    replay arms already on file from their receipts
#   scripts/r11-run.sh report                 every table from what is on file -> artifacts/r11/tables
#   scripts/r11-run.sh publish                copy the generated tables into docs/staging, once, after the last model step; then commit them
#   scripts/r11-run.sh check                  the pre-flight of a model step, starting nothing: folders, files, adapters, swap, other model processes
#   model (the integrator):
#   scripts/r11-run.sh train <p5b|p5a> <7|11> one adapter (r11-<arm>-s<seed>): soft labels, R4's settings; refuses to overwrite an adapter
#   scripts/r11-run.sh train-hard <arm> <seed>  the one-hot comparison on the same rows (r11-<arm>-s<seed>-hard); offline only
#   scripts/r11-run.sh parity <p5b|p5a>       training inputs against the serving path on 12 development packets (CPU)
#   scripts/r11-run.sh tokens                 real token counts of the held-out packets by the tokenizer alone (CPU; no weights are loaded)
#   scripts/r11-run.sh offline                score the held-out packets with the untuned model and every adapter on file, then the offline table
#   scripts/r11-run.sh loop <seed>            the registered model arms for the decode stage R9 named (R11_DECODE=draw|held|top; unset: no standard named),
#                                             this stage's adapters first, then the first adapter on its own packet; then their replays
#   scripts/r11-run.sh arms <seed> <a,b>      any arms of scripts/r11-loop.ts in one worker process (this stage's adapters, or `old-…` alone); then their replays
#
# Generated tables go under artifacts/r11/tables (R11_TABLES), which git ignores, so the launch order runs end to end
# from a frozen checkout. R11_FT_ROOT: this stage's data and adapters (default artifacts/decide-ft/r11). R11_OLD_FT: the
# folder whose adapters/ holds r4-rules-state (default: this checkout's, else the worktree that made it).
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
TEST_SEEDS="4111,4222"; NEW="r11-p5b-s7 r11-p5b-s11 r11-p5a-s7 r11-p5a-s11"
WORLDS="48:W50:6 48:W25:12 7:W50:6 7:W25:12 21:W50:6 21:W25:12"   # seed:base:burn-in days (prereg §3); six days sampled at 0.09

swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
load1() { uptime | sed -E 's/.*load averages?: ([0-9]+).*/\1/'; }
hold_load() { n=0; while [ "$(load1)" -ge 8 ] && [ "$n" -lt 60 ]; do echo "R11 hold: 1-minute load $(load1), 8 or more ($n min waited)"; sleep 60; n=$((n + 1)); done; }
# Another model process of this project: anything run by the model runtime's interpreter, and, because that interpreter
# shows in the process list under the framework's own path once it has started (seen on this machine: a running scorer
# is not matched by the interpreter's path), anything running one of this folder's model scripts.
model_procs() {
  { pgrep -fl "$MGOGO_DECIDE_PYTHON"; pgrep -fl -- '-B (worker|server|em_score|score_contexts|eval_offline|eval_ab|parity|r8_tokens|token_audit|train|train_r4|train_r11|distill|bench_batch|bench_train)\.py'; } 2>/dev/null | grep -v pgrep | grep -v fake-worker.mjs | sort -u
}
before_model() { # <what> [nowait]
  others="$(model_procs)"
  if [ -n "$others" ] && [ -z "$R11_ALLOW_OTHER_MODEL" ]; then echo "R11 refused ($1): another model process is running:"; echo "$others"; exit 3; fi
  if [ -z "$2" ] && [ -n "$(git status --porcelain)" ] && [ -z "$R11_ALLOW_DIRTY" ]; then echo "R11 refused ($1): the tree is not clean; commit first"; exit 3; fi
  n=0
  while [ -z "$2" ] && [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "R11 hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "R11 machine before model load ($1): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
step() { echo "R11 start: $* ($(date '+%H:%M'))"; "$@" || { echo "R11 failed: $*"; exit 1; }; }
seed_ok() { case "$1" in 4111|4222) ;; *) echo "seed 4111 or 4222 (docs/staging/r11-prereg.md §5); 4333 and 4444 stay sealed"; exit 2 ;; esac; }
arm_ok() { case "$1" in p5a|p5b) ;; *) echo "arm p5b or p5a (docs/staging/r11-prereg.md §1)"; exit 2 ;; esac; }
have() { [ -e "$1/adapters/$2/adapter_model.safetensors" ]; }
assembled() { [ -f "$FT/manifest.json" ] && [ -f "$FT/p5b/contexts/train.jsonl" ] && [ -f "$FT/eval/all.jsonl" ] || { echo "R11: no assembled files under $FT ('$0 sample')"; exit 2; }; }
model_arms() { # <seed> <arms> <adapters root> <adapters>
  export MGOGO_FT_ROOT="$3" MGOGO_FT_ADAPTERS="$4"
  [ -d "$3/adapters" ] || { echo "R11: no adapters under $3"; exit 2; }
  before_model "seed $1: $2"
  step $KEEP $TSX scripts/r11-loop.ts engine --seed "$1" --arms "$2" --out "$LOOP"
  step $TSX scripts/r11-loop.ts engine --seed "$1" --arms "$2" --out "$LOOP" --replay
}
tai() { [ -f "$1/tai.json" ] || step $TSX scripts/r7-card.ts tai --out "$1"; }   # the Taï half-hour anchor (aggregates only), which stage R7's report reads
reports() { # <loop dir> <seeds> <prefix> [dry]
  mkdir -p "$TABLES"
  engine="$($TSX scripts/r11-report.ts --dir "$1" --seeds "$2" --engine-arg)" || { echo "R11 failed: the engine arms on file under $1"; exit 1; }
  if [ -n "$engine" ]; then step $TSX scripts/r7-report.ts --dir "$1" --units F --seeds "$2" --engine "$engine" --md "$TABLES/$3-card.md"
  else step $TSX scripts/r7-report.ts --dir "$1" --units F --seeds "$2" --md "$TABLES/$3-card.md"; fi
  step $TSX scripts/r11-report.ts --dir "$1" --seeds "$2" --md "$TABLES/$3-numbers.md" ${4:+--dry} ${R11_DECODE:+--decode "$R11_DECODE"}
}

case "$1" in
  sample-worlds)
    for w in $WORLDS; do
      seed="${w%%:*}"; rest="${w#*:}"; base="${rest%%:*}"; burn="${rest#*:}"
      hold_load
      step $TSX scripts/r11-contexts.ts --seed "$seed" --base "$base" --burn-in "$burn" --days 6 --p 0.09 --out "$FT/parts" --check
    done ;;
  assemble)
    step $TSX scripts/r11-assemble.ts --parts "$FT/parts" --out "$FT"
    mkdir -p "$TABLES"
    step $TSX scripts/r11-data-report.ts --manifest "$FT/manifest.json" --md "$TABLES/r11-data.md" --json "$TABLES/r11-manifest.json"
    step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ;;
  sample) "$ROOT/scripts/r11-run.sh" sample-worlds && "$ROOT/scripts/r11-run.sh" assemble || exit 1 ;;
  controls)
    seed_ok "$2"; hold_load
    tai "$LOOP"
    step $TSX scripts/r11-loop.ts controls --seed "$2" --out "$LOOP" ;;
  dry)
    hold_load
    unset MGOGO_DECIDE_SERVER
    MGOGO_DECIDE_PYTHON="$ROOT/scripts/lib/fake-worker.mjs" step $TSX scripts/r11-loop.ts dry --out "$DRY"
    tai "$DRY"
    reports "$DRY" 48 r11-dry dry
    # the offline report's own plumbing, on the fake worker's odds (never a result): only when the held-out packets are on file
    if [ -f "$FT/eval/all.jsonl" ]; then
      step $TSX scripts/r11-offline.ts --dir "$FT" --fake "$DRY/offline" --md "$TABLES/r11-dry-offline.md"
    else echo "R11 dry: no held-out packets under $FT yet; the offline report's dry run is skipped ('$0 sample' first)"; fi ;;
  check)
    echo "data and adapters: $FT"; ls "$FT/manifest.json" "$FT"/p5b/contexts/train.jsonl "$FT"/p5a/contexts/train.jsonl "$FT"/eval/all.jsonl 2>&1
    for a in $NEW; do if have "$FT" "$a"; then shasum -a 256 "$FT/adapters/$a/adapter_model.safetensors"; else echo "not trained yet: $a"; fi; done
    echo "the first adapter: $OLD_FT"; if have "$OLD_FT" r4-rules-state; then shasum -a 256 "$OLD_FT/adapters/r4-rules-state/adapter_model.safetensors"; else echo "MISSING: r4-rules-state under $OLD_FT/adapters"; fi
    echo "control arms on file: $(ls "$LOOP"/F/s4111/rules-1.json "$LOOP"/F/s4222/rules-1.json 2>/dev/null | wc -l | tr -d ' ') of 2 seeds; decode named by stage R9: ${R11_DECODE:-none (the top pick, a draw arm beside it)}"
    echo "model runtime: $MGOGO_DECIDE_PYTHON ($([ -x "$MGOGO_DECIDE_PYTHON" ] && echo found || echo MISSING))"
    before_model "pre-flight, nothing is started" nowait
    [ -n "$(git status --porcelain)" ] && echo "R11 note: the tree is not clean; a model step would refuse"
    [ "$(swap_mb)" -gt 6144 ] && echo "R11 note: swap in use is above 6 GB; a model step would hold now (up to 30 minutes)" ;;
  train|train-hard)
    arm_ok "$2"; assembled
    case "$3" in ''|*[!0-9]*) echo "usage: $0 $1 <p5b|p5a> <training seed: 7 or 11>"; exit 2 ;; esac
    NAME="r11-$2-s$3"; LABELS=soft; [ "$1" = train-hard ] && { NAME="$NAME-hard"; LABELS=hard; }
    have "$FT" "$NAME" && { echo "R11: $FT/adapters/$NAME exists already; it is not overwritten"; exit 2; }
    before_model "train $NAME (labels $LABELS, training seed $3)"
    mkdir -p "$FT/logs"
    export MGOGO_FT_ROOT="$FT"
    step $KEEP "$PY" train_r11.py --name "$NAME" --train "$2/contexts/train.jsonl" --dev "$2/contexts/dev.jsonl" --extra "$2/contexts/manifest.json" --epochs 3 --seed "$3" --labels "$LABELS" ;;
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
    step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ;;
  offline)
    assembled
    # the untuned model on every packet; each adapter on its own arm's packets
    for p in base $NEW r11-p5b-s7-hard r11-p5b-s11-hard r11-p5a-s7-hard r11-p5a-s11-hard; do
      case "$p" in base) P=p5b,p5bNoDoing,p5bProbe,p5a,p5aNoDoing,p5aProbe ;; *p5b*) P=p5b,p5bNoDoing,p5bProbe ;; *) P=p5a,p5aNoDoing,p5aProbe ;; esac
      [ "$p" = base ] || have "$FT" "$p" || { echo "R11 offline: no adapter $p; skipped"; continue; }
      [ -s "$FT/eval/all.$p.jsonl" ] && { echo "R11 offline: $FT/eval/all.$p.jsonl is on file; not scored again"; continue; }
      before_model "score the held-out packets with $p"
      export MGOGO_FT_ROOT="$FT"
      step $KEEP "$PY" em_score.py --in "$AFT/eval/all.jsonl" --packets "$P" --provider "$p" --out "$AFT/eval/all.$p.jsonl.part"
      mv "$FT/eval/all.$p.jsonl.part" "$FT/eval/all.$p.jsonl"
    done
    mkdir -p "$TABLES"
    step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md" ;;
  loop)
    seed_ok "$2"
    [ -f "$LOOP/F/s$2/rules-1.json" ] || { echo "R11: the control arms of seed $2 are not on file ('$0 controls $2')"; exit 2; }
    set -- "$1" "$2" $($TSX scripts/r11-loop.ts list --decode "${R11_DECODE:-none}")
    FRESH=""; ADAPTERS=""
    for a in $(echo "$3" | tr ',' ' '); do key="r11-$(echo "$a" | cut -d- -f1-2)"; if have "$FT" "$key"; then FRESH="$FRESH${FRESH:+,}$a"; case ",$ADAPTERS," in *",$key,"*) ;; *) ADAPTERS="$ADAPTERS${ADAPTERS:+,}$key" ;; esac; else echo "R11 loop: no adapter $key yet; arm $a is left out"; fi; done
    [ -n "$FRESH" ] && model_arms "$2" "$FRESH" "$FT" "$ADAPTERS"
    if have "$OLD_FT" r4-rules-state; then model_arms "$2" "$4" "$OLD_FT" r4-rules-state; else echo "R11 loop: r4-rules-state is not under $OLD_FT/adapters; the old adapter's arm ($4) is left out"; fi ;;
  arms)
    seed_ok "$2"; [ -n "$3" ] || { echo "usage: $0 arms <seed> <a,b,…>"; exit 2; }
    case "$3" in old-*) model_arms "$2" "$3" "$OLD_FT" r4-rules-state ;; *) model_arms "$2" "$3" "$FT" "${MGOGO_FT_ADAPTERS:-$(echo $NEW | tr ' ' ',')}" ;; esac ;;
  replay) seed_ok "$2"; [ -n "$3" ] || { echo "usage: $0 replay <seed> <a,b,…>"; exit 2; }; step $TSX scripts/r11-loop.ts engine --seed "$2" --arms "$3" --out "$LOOP" --replay ;;
  report)
    mkdir -p "$TABLES"
    [ -f "$FT/manifest.json" ] && { step $TSX scripts/r11-data-report.ts --manifest "$FT/manifest.json" --md "$TABLES/r11-data.md" --json "$TABLES/r11-manifest.json"; step $TSX scripts/r11-offline.ts --dir "$FT" --md "$TABLES/r11-offline.md"; }
    S=""; for s in 4111 4222; do [ -f "$LOOP/F/s$s/rules-8.json" ] && S="$S${S:+,}$s"; done
    if [ -n "$S" ]; then tai "$LOOP"; reports "$LOOP" "$S" r11; else echo "R11 report: no control arms on file under $LOOP yet"; fi ;;
  publish)
    n=0
    for f in r11-data.md r11-manifest.json r11-offline.md r11-card.md r11-numbers.md r11-dry-numbers.md; do   # (the dry run's card and offline tables stay under artifacts: a fake worker's numbers)
      [ -f "$TABLES/$f" ] || continue
      if cmp -s "$TABLES/$f" "$DOCS/$f"; then echo "R11 publish: $DOCS/$f is already the generated table"; else cp "$TABLES/$f" "$DOCS/$f" && echo "R11 publish: $TABLES/$f -> $DOCS/$f"; n=$((n + 1)); fi
    done
    echo "R11 publish: $n table(s) copied from $TABLES; commit them before another model step (a model step refuses a tree that is not clean)" ;;
  *) echo "usage: $0 sample | assemble | controls <seed> | dry | replay <seed> <a,b,…> | report | publish | check | train <p5b|p5a> <7|11> | train-hard <arm> <seed> | parity <arm> | tokens | offline | loop <seed> | arms <seed> <a,b,…>"; exit 2 ;;
esac
echo "R11 done ($*): $(date '+%H:%M')"
