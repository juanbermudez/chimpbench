"""Prepare a new R15 training command. --run validates inputs and refuses concurrent R14/model work before importing torch."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'resource-targets-v1'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def validate(root):
    manifest = json.loads((root / 'contexts/manifest.json').read_text())
    required = {'stage': 'R15', 'packetVersion': VERSION, 'kindTeacher': 'r11-original-menu-kind-marginal-v1',
                'targetTeacher': 'counterfactual-resource-valuation-v1', 'labels': 'soft'}
    if any(manifest.get(k) != v for k, v in required.items()): raise ValueError('incompatible R15 dataset manifest')
    for path, digest in manifest['outputs'].items():
        if sha(path) != digest: raise ValueError('R15 dataset output changed: ' + path)
    for kind in ('train', 'dev'):
        path = root / 'contexts' / (kind + '.jsonl')
        if manifest['outputs'].get(str(path)) != sha(path) or manifest['counts'].get(kind, 0) < 1: raise ValueError('missing/empty R15 ' + kind)
    return manifest


def idle():
    main = Path('/Volumes/Drive/chimpbench/MGOGO')
    state = main / '.claude/worktrees/bench-r14/artifacts/r14/state'
    if (main / 'artifacts/r14-chain.lock').exists() or (state.exists() and state.read_text().strip() == 'running'):
        raise ValueError('R14 is active; no R15 model process may start')
    commands = subprocess.check_output(['ps', '-axo', 'command='], text=True).splitlines()
    pattern = r'(?:^|\s)(?:\S*/)?(?:worker|server|parity|train_r11|score_contexts|em_score)\.py(?:\s|$)'
    if any(re.search(pattern, c) for c in commands): raise ValueError('another model process is active')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--seed', type=int, choices=(7, 11), default=7)
    parser.add_argument('--run', action='store_true')
    args = parser.parse_args(); root = args.root.resolve(); validate(root)
    name = f'r15-resources-s{args.seed}'
    if (root / 'adapters' / name).exists(): raise ValueError('adapter directory already exists; inspect without overwriting')
    command = [str(ROOT / 'training/decide_ft/r4_py.sh'), 'train_r11.py', '--name', name,
               '--train', 'contexts/train.jsonl', '--dev', 'contexts/dev.jsonl', '--extra', 'contexts/manifest.json',
               '--epochs', '3', '--seed', str(args.seed), '--labels', 'soft']
    print('MGOGO_FT_ROOT=' + shlex.quote(str(root)) + ' ' + shlex.join(command), flush=True)
    if not args.run: return
    idle()
    lock = Path('/Volumes/Drive/chimpbench/MGOGO/artifacts/r15-model.lock')
    lock.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(fd, str(os.getpid()).encode()); os.close(fd)
    try:
        environment = dict(os.environ, MGOGO_FT_ROOT=str(root), HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
        result = subprocess.run(command, cwd=ROOT, env=environment)
        raise SystemExit(result.returncode)
    finally:
        lock.unlink()


if __name__ == '__main__':
    try: main()
    except (ValueError, KeyError, OSError) as exc: sys.exit('R15 training refused: ' + str(exc))
