#!/bin/sh
# Stage R4: run one of this folder's Python scripts with the local model runtime of HANDOFF.md §3 item 3 (second
# computer: everything under /Volumes/Drive/chimpbench; offline). MGOGO_FT_ROOT defaults to the R4 folder.
#   training/decide_ft/r4_py.sh train_r4.py --name r4-rules-state --train contexts/train.jsonl --dev contexts/dev.jsonl
cd "$(dirname "$0")"
export MGOGO_GHN_ROOT="${MGOGO_GHN_ROOT:-/Volumes/Drive/chimpbench/GHN}"
export MGOGO_DECIDE_PYTHON="${MGOGO_DECIDE_PYTHON:-/Volumes/Drive/chimpbench/decide-env/bin/python}"
export HF_HOME="${HF_HOME:-/Volumes/Drive/chimpbench/hf-cache}"
export HF_HUB_CACHE="${HF_HUB_CACHE:-/Volumes/Drive/chimpbench/hf-cache/hub}"
export MGOGO_FT_ROOT="${MGOGO_FT_ROOT:-artifacts/decide-ft/r4}"
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
export PYTORCH_MPS_HIGH_WATERMARK_RATIO="${PYTORCH_MPS_HIGH_WATERMARK_RATIO:-0.6}" PYTORCH_MPS_LOW_WATERMARK_RATIO="${PYTORCH_MPS_LOW_WATERMARK_RATIO:-0.4}"
exec "$MGOGO_DECIDE_PYTHON" -B "$@"
