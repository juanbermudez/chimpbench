#!/bin/sh
# Stage R9 (docs/staging/r9-prereg.md §8): the first recipe retrained with a second training seed, to measure the spread
# between two trainings of one recipe, which no round has measured. Nothing else changes: R4's training and development
# files (checked by their hashes), R4's settings (3 epochs, learning rate 2e-4, batch 2 with 4 accumulated, LoRA r 16,
# alpha 32, dropout 0.05), training seed 11 instead of 7. The adapter is r4-rules-state-s2 under artifacts/decide-ft/r9.
# One model process at a time, with the swap hold and the check of scripts/r9-run.sh.
#
#   scripts/r9-seed2.sh prepare    no model: copy R4's training files and R4's held-out evaluation folder beside this stage's adapter folder, hashes checked
#   scripts/r9-seed2.sh train      the training run (about 2 h 11 min and 6.8 GiB for the first seed; refuses to overwrite an adapter)
#   scripts/r9-seed2.sh offline    score the new adapter on R4's own held-out file (about 11 minutes), then `report`
#   scripts/r9-seed2.sh report     no model: docs/staging/r9-seed2-numbers.md from the score files on hand
# Then, in the loop: scripts/r9-run.sh seed2 21 and scripts/r9-run.sh seed2 5.
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"; FT="${R9_FT_ROOT:-artifacts/decide-ft/r9}"; L="$FT/logs"; NAME=r4-rules-state-s2; SEED=11
case "$FT" in /*) AFT="$FT" ;; *) AFT="$ROOT/$FT" ;; esac   # the same folder as an absolute path, for the Python side
first_dir() { for d in "$@"; do [ -d "$d" ] && { echo "$d"; return; }; done; echo "$1"; }
WT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees
CTX="${R9_R4_CONTEXTS:-$(first_dir artifacts/decide-ft/r4/contexts "$WT/r4-train/artifacts/decide-ft/r4/contexts")}"
EVA="${R9_EVAL_A:-$(first_dir artifacts/decide-ft/r4b/evalA "$WT/r4b-retrain/artifacts/decide-ft/r4b/evalA")}"
TRAIN_SHA=aa3fa4b5312de7efdc08551278b3a082780d6eba1ea1d18a22a881a988a36f3d   # R4's training file (3,200 records, 3,122 labelled): the manifest of r4-rules-state
DEV_SHA=d8a7758f121cbff7515c6ab24c28e10b231b1cb8f6ff49ed42768768c85da459
PY="$ROOT/training/decide_ft/r4_py.sh"
export MGOGO_FT_ROOT="$FT"
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}"
KEEP=""; command -v caffeinate >/dev/null 2>&1 && KEEP="caffeinate -i"
sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
swap_mb() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.]+)M.*/\1/' | cut -d. -f1; }
before_model() {
  others="$(pgrep -fl "$MGOGO_DECIDE_PYTHON" | grep -v pgrep)"
  if [ -n "$others" ] && [ -z "$R9_ALLOW_OTHER_MODEL" ]; then echo "R9 refused ($1): another model process is running:"; echo "$others"; exit 3; fi
  n=0
  while [ "$(swap_mb)" -gt 6144 ] && [ "$n" -lt 30 ]; do echo "R9 hold: swap $(swap_mb) MB in use, above 6 GB ($n min waited)"; sleep 60; n=$((n + 1)); done
  echo "R9 machine before model run ($1): $(date '+%d %b %H:%M') | $(uptime | sed 's/.*load averages: /load /') | swap $(swap_mb) MB in use | waited $n min"
}
step() { echo "R9 start: $* ($(date '+%H:%M'))"; "$@" || { echo "R9 failed: $*"; exit 1; }; }
prepared() { [ "$(sha "$FT/contexts/train.jsonl" 2>/dev/null)" = "$TRAIN_SHA" ] && [ "$(sha "$FT/contexts/dev.jsonl" 2>/dev/null)" = "$DEV_SHA" ] || { echo "R9: run '$0 prepare' first"; exit 2; }; }
report() { step fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r9-seed-spread.ts --dir "$FT/evalA" --providers r4-rules-state,$NAME,r4b-rules-state,r4c-rules-state,base --md docs/staging/r9-seed2-numbers.md; }

case "$1" in
  prepare)
    mkdir -p "$FT/contexts" "$FT/evalA" "$FT/adapters" "$L"
    [ "$(sha "$CTX/train.jsonl")" = "$TRAIN_SHA" ] && [ "$(sha "$CTX/dev.jsonl")" = "$DEV_SHA" ] || { echo "R9: $CTX does not hold R4's training and development files (hashes differ)"; exit 1; }
    cp "$CTX/train.jsonl" "$CTX/dev.jsonl" "$CTX/manifest.json" "$FT/contexts/"
    # R4's own held-out records and packets, and the score files of the adapters already scored on them (read only at the source)
    for f in all.jsonl test.jsonl all.r4-rules-state.jsonl all.r4b-rules-state.jsonl all.r4c-rules-state.jsonl all.base.jsonl; do [ -f "$EVA/$f" ] && cp "$EVA/$f" "$FT/evalA/"; done
    prepared
    echo "R9 prepared $FT: train $(wc -l < "$FT/contexts/train.jsonl" | tr -d ' ') records, dev $(wc -l < "$FT/contexts/dev.jsonl" | tr -d ' '), evaluation packets $(wc -l < "$FT/evalA/all.jsonl" | tr -d ' ') from $EVA" ;;
  train)
    prepared
    [ -e "$FT/adapters/$NAME/adapter_model.safetensors" ] && { echo "R9: $FT/adapters/$NAME exists already; it is not overwritten"; exit 2; }
    before_model "train $NAME, training seed $SEED"
    step $KEEP "$PY" train_r4.py --name "$NAME" --train contexts/train.jsonl --dev contexts/dev.jsonl --extra contexts/manifest.json --epochs 3 --seed "$SEED" ;;
  offline)
    prepared
    [ -e "$FT/adapters/$NAME/adapter_model.safetensors" ] || { echo "R9: no adapter $NAME yet ('$0 train')"; exit 2; }
    before_model "score $NAME on R4's held-out file"
    step $KEEP "$PY" em_score.py --in "$AFT/evalA/all.jsonl" --packets state,statePerm,removed,probe --provider "$NAME" --out "$AFT/evalA/all.$NAME.jsonl"
    report ;;
  report) report ;;
  *) echo "usage: $0 prepare | train | offline | report"; exit 2 ;;
esac
echo "R9 seed2 done ($*): $(date '+%H:%M')"
