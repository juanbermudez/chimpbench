#!/bin/sh
# Train the three adapters one after another (they don't fit in memory together), then run the offline eval.
# Logs: artifacts/decide-ft/logs/<adapter>.log
set -e
cd "$(dirname "$0")"
PY="${MGOGO_DECIDE_PYTHON:-$HOME/Desktop/GHN/data/raw/decide-env/bin/python}"
LOGS=../../artifacts/decide-ft/logs
mkdir -p "$LOGS"
export PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.6 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.4
for adapter in ${ADAPTERS:-baseline aggressive collaborative}; do
  "$PY" -B train.py --adapter "$adapter" "$@" > "$LOGS/$adapter.log" 2>&1
done
"$PY" -B eval_offline.py --split test > "$LOGS/eval-offline.log" 2>&1
