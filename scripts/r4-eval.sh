#!/bin/sh
# Stage R4 (docs/staging/r4-prereg.md §6): the offline evaluation's model runs, one model process at a time.
#   scripts/r4-eval.sh sim <provider>     score every evaluation packet (eval/all.jsonl) with base | r4-rules-state | r4-field-groom
#   scripts/r4-eval.sh tokens             real token counts of the evaluation packets (CPU)
#   scripts/r4-eval.sh parity             training/decide_ft/parity.py on 12 dev contexts (CPU)
#   scripts/r4-eval.sh wild <adapter>     the wild-choice benchmark, DEVELOPMENT part only, plain and fanned out
#   scripts/r4-eval.sh latency <provider> seconds per decision one packet at a time (100 test packets)
# The runtime variables are those of HANDOFF.md §3 item 3 (training/decide_ft/r4_py.sh sets them for Python).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FT="${MGOGO_FT_ROOT:-artifacts/decide-ft/r4}"
EVAL="$ROOT/$FT/eval"
PY="$ROOT/training/decide_ft/r4_py.sh"
case "$1" in
  sim)
    case "$2" in base) P=state,v4,statePerm,removed,probe ;; r4-field-groom) P=state,probe ;; *) P=state,statePerm,removed,probe ;; esac
    MGOGO_FT_ROOT="$FT" "$PY" em_score.py --in "$EVAL/all.jsonl" --packets "$P" --provider "$2" --out "$EVAL/all.$2.jsonl" ;;
  tokens) MGOGO_FT_ROOT="$FT" "$PY" em_score.py --in "$EVAL/all.jsonl" --packets state,v4,removed,probe --tokens --out "$EVAL/tokens.jsonl" ;;
  parity) MGOGO_FT_ROOT="$FT" "$PY" parity.py --n 12 --device cpu ;;
  latency) MGOGO_FT_ROOT="$FT" "$PY" em_score.py --in "$EVAL/all.jsonl" --packets state --provider "$2" --batch 1 --limit 100 --out "$EVAL/latency.$2.jsonl" ;;
  wild)
    cd "$ROOT"
    export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}" MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
    export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}" HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}" HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
    export MGOGO_FT_ROOT="$FT" MGOGO_FT_ADAPTERS="${MGOGO_FT_ADAPTERS:-$2}"
    K=gliner,gliner+fan2; [ "$2" = base ] && K=null,stack,gliner,gliner+fan2
    fnm exec --using=22.22.3 -- pnpm exec tsx scripts/rw-score.ts --part development --kernels "$K" --load-model --adapter "$2" --out "$FT/eval/rw/$2" ;;
  *) echo "usage: $0 sim <provider> | tokens | parity | wild <adapter> | latency <provider>"; exit 2 ;;
esac
