"""Prepare a new R15 training command. --run validates inputs and refuses concurrent R14/model work before importing torch."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import signal
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'resource-targets-v1'
MODEL_LOCK = Path('/Volumes/Drive/chimpbench/MGOGO/artifacts/r14-chain.lock')
MAX_SECONDS = 6 * 3600


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
        rows = [json.loads(line) for line in path.read_text().splitlines() if line]
        phases = {phase: sum(row.get('phase') == phase for row in rows) for phase in ('kind', 'target')}
        if min(phases.values()) < 1 or sum(phases.values()) != len(rows) or manifest.get('phaseCounts', {}).get(kind) != phases:
            raise ValueError('R15 ' + kind + ' requires verified kind and target rows')
    return manifest


def idle(own_lock=False):
    main = Path('/Volumes/Drive/chimpbench/MGOGO')
    state = main / '.claude/worktrees/bench-r14/artifacts/r14/state'
    if (not own_lock and MODEL_LOCK.exists()) or (state.exists() and state.read_text().strip() == 'running'):
        raise ValueError('R14 is active; no R15 model process may start')
    commands = subprocess.check_output(['ps', '-axo', 'pid=,command='], text=True).splitlines()
    pattern = r'(?:^|\s)(?:\S*/)?(?:worker|server|parity|r15_preflight(?:_worker)?|train(?:_[\w]+)?|r14|score_contexts|em_score|eval_offline|eval_ab|distill)\.py(?:\s|$)'
    others = [line.strip().split(maxsplit=1) for line in commands]
    if any(len(parts) == 2 and parts[0] != str(os.getpid()) and re.search(pattern, parts[1]) for parts in others): raise ValueError('another model process is active')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--seed', type=int, choices=(7, 11), default=7)
    parser.add_argument('--run', action='store_true')
    args = parser.parse_args(); root = args.root.resolve(); validate(root)
    name = f'r15-resources-s{args.seed}'
    if (root / 'adapters' / name).exists(): raise ValueError('adapter directory already exists; inspect without overwriting')
    command = [str(ROOT / 'training/decide_ft/r4_py.sh'), 'train_r11.py', '--name', name,
               '--train', 'contexts/train.jsonl', '--dev', 'contexts/dev.jsonl', '--extra', 'contexts/training-manifest.json',
               '--epochs', '3', '--seed', str(args.seed), '--labels', 'soft']
    print('MGOGO_FT_ROOT=' + shlex.quote(str(root)) + ' ' + shlex.join(command), flush=True)
    if not args.run: return
    def prepare():
        from r15_preflight import SCHEMA, sha, validate_preflight, write_new
        validate(root)
        validate_preflight(root)
        manifest = json.loads((root / 'contexts/manifest.json').read_text())
        manifest['preflight'] = {'schema': SCHEMA, 'receipt_sha256': sha(root / 'preflight/result.json'), 'path': 'preflight/result.json'}
        destination = root / 'contexts/training-manifest.json'
        if destination.exists():
            if json.loads(destination.read_text()) != manifest: raise ValueError('stale training manifest; preserve it and inspect')
        else: write_new(destination, manifest)
    run_guarded(command, root, before_launch=prepare)


def stop_group(process):
    os.killpg(process.pid, signal.SIGTERM)
    try: process.wait(timeout=30)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()


def run_guarded(command, root, *, timeout_seconds=MAX_SECONDS, purpose='training', before_launch=None):
    idle()
    MODEL_LOCK.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(MODEL_LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.write(fd, json.dumps({'pid': os.getpid(), 'stage': 'R15', 'root': str(root), 'purpose': purpose}).encode()); os.close(fd)
    process = None
    previous = signal.getsignal(signal.SIGTERM)
    def interrupted(signum, frame): raise KeyboardInterrupt('R15 training interrupted')
    try:
        idle(own_lock=True)
        if before_launch is not None: before_launch()
        signal.signal(signal.SIGTERM, interrupted)
        environment = dict(os.environ, MGOGO_FT_ROOT=str(root), HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
        process = subprocess.Popen(command, cwd=ROOT, env=environment, start_new_session=True)
        try: code = process.wait(timeout=timeout_seconds)
        except subprocess.TimeoutExpired as exc:
            stop_group(process)
            process = None
            raise ValueError(('six-hour R15 training' if purpose == 'training' else 'R15 preflight') + ' budget exhausted; inspect partial outputs before any new run') from exc
        raise SystemExit(code)
    finally:
        if process is not None and process.poll() is None: stop_group(process)
        signal.signal(signal.SIGTERM, previous)
        MODEL_LOCK.unlink()


if __name__ == '__main__':
    try: main()
    except (ValueError, KeyError, OSError) as exc: sys.exit('R15 training refused: ' + str(exc))
