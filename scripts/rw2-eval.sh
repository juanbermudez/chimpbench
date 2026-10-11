#!/bin/sh
# Stage RW2 (docs/staging/rw2-prereg.md §7): one model process scores one adapter (or the untuned base) on the wild
# records of the deposits of 11 October 2026, plain and fanned out, beside chance and the registered rules.
#   scripts/rw2-eval.sh <adapter|base> [parts] [view]     parts: development (default) | train,development ; view: own (default) | third
# The sealed parts are never passed here: they open only by scripts/rw2-score.ts --part sealed --open-sealed "<reason>".
# Derived records first: /usr/bin/python3 -I scripts/rw2/rw2_ingest.py. The runtime variables are those of HANDOFF.md §3
# item 3; MGOGO_FT_ROOT names the folder that holds the adapter (default artifacts/decide-ft/r4). One model process at a time.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A="${1:?usage: scripts/rw2-eval.sh <adapter|base> [parts] [view]}"
PARTS="${2:-development}"
VIEW="${3:-own}"
case "$PARTS" in *sealed*) echo "the sealed parts are not scored through this wrapper"; exit 2 ;; esac
FT="${MGOGO_FT_ROOT:-artifacts/decide-ft/r4}"
cd "$ROOT"
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
export MGOGO_FT_ROOT="$FT" MGOGO_FT_ADAPTERS="${MGOGO_FT_ADAPTERS:-$A}"
OUT="artifacts/rw2/bench/$A-$VIEW"
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/rw2-score.ts --dataset tai-groom,kanyawara-coalition --part "$PARTS" \
  --kernels null,rules,gliner,gliner+fan2 --load-model --adapter "$A" --view "$VIEW" --out "$OUT" --md "$OUT/numbers.md"
