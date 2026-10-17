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


# Stage R16 (docs/staging/r16-prereg.md §8) trains the same contract on its own files, under its own adapter names.
STAGES = {'R15': ('r15-resources',), 'R16': ('r16-zero', 'r16-agg')}
CHAIN_TOKEN = 'MGOGO_MODEL_LOCK_TOKEN'


def adapter_name(manifest, seed):
    """The adapter a dataset may train: stage R15's name, or stage R16's for the round its manifest names."""
    prefix = 'r15-resources' if manifest.get('stage') == 'R15' else 'r16-' + str(manifest.get('round'))
    if prefix not in STAGES.get(manifest.get('stage'), ()): raise ValueError('incompatible R15 dataset manifest')
    return f'{prefix}-s{seed}'


def stage_of(name):
    """The stage whose manifest an adapter of this name must carry (None: not a registered name)."""
    for stage, prefixes in STAGES.items():
        if any(re.fullmatch(prefix + r'-s(7|11)', name or '') for prefix in prefixes): return stage
    return None


def validate(root):
    manifest = json.loads((root / 'contexts/manifest.json').read_text())
    required = {'packetVersion': VERSION, 'kindTeacher': 'r11-original-menu-kind-marginal-v1',
                'targetTeacher': 'counterfactual-resource-valuation-v1', 'labels': 'soft'}
    if manifest.get('stage') not in STAGES or any(manifest.get(k) != v for k, v in required.items()): raise ValueError('incompatible R15 dataset manifest')
    adapter_name(manifest, 7)
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
    args = parser.parse_args(); root = args.root.resolve(); manifest = validate(root)
    name = adapter_name(manifest, args.seed)
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
    run_guarded(command, root, before_launch=prepare, after_success=lambda: complete_adapter(root, name))


def complete_adapter(root, name):
    from r15_preflight import validate_preflight, runtime_digest
    receipt = validate_preflight(root)
    folder = root / 'adapters' / name
    path = folder / 'manifest.json'
    manifest = json.loads(path.read_text())
    history = manifest.get('history', [])
    if manifest.get('stage') != stage_of(name) or manifest.get('adapter') != name or manifest.get('labels') != 'soft' or manifest.get('hyperparameters', {}).get('epochs') != 3:
        raise ValueError('training did not produce the registered R15 adapter')
    if len(history) != 3 or [row.get('epoch') for row in history] != [1, 2, 3]: raise ValueError('incomplete R15 training history')
    if manifest.get('adapter_sha256') != sha(folder / 'adapter_model.safetensors') or manifest.get('preflight', {}).get('receipt_sha256') != sha(root / 'preflight/result.json'):
        raise ValueError('completed adapter weights or preflight identity changed')
    for split in ('train', 'dev'):
        if manifest.get(split + '_sha256') != sha(root / f'contexts/{split}.jsonl'): raise ValueError('completed adapter dataset changed')
    manifest['adapter_config_sha256'] = sha(folder / 'adapter_config.json')
    manifest['preflight_runtime_sha256'] = runtime_digest(receipt['identity']['runtime'])
    temporary = folder / 'manifest-completed.json.tmp'
    with temporary.open('x') as output: json.dump(manifest, output, indent=2); output.write('\n')
    os.replace(temporary, path)


def stop_group(process):
    os.killpg(process.pid, signal.SIGTERM)
    try: process.wait(timeout=30)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()


def ancestors(pid):
    """This process's ancestors from the process list (pid, ppid), nearest first."""
    parent = {}
    for line in subprocess.check_output(['ps', '-axo', 'pid=,ppid='], text=True).splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit(): parent[int(parts[0])] = int(parts[1])
    out, p = [], parent.get(pid)
    while p is not None and p > 1 and p not in out:
        out.append(p); p = parent.get(p)
    return out


def chain_owned():
    """Stage R16 (docs/staging/r16-prereg.md §17.2): True when a chain that started this process holds the shared lock and
    passed its token down; then the lock is neither taken nor released here. Without the token: False, as before."""
    token = os.environ.get(CHAIN_TOKEN)
    if not token: return False
    owner = json.loads(MODEL_LOCK.read_text()) if MODEL_LOCK.exists() else {}
    if owner.get('stage') != 'R16-chain' or owner.get('token') != token or owner.get('pid') not in ancestors(os.getpid()):
        raise ValueError('the shared model lock is not held by the chain that started this process')
    return True


def run_guarded(command, root, *, timeout_seconds=MAX_SECONDS, purpose='training', before_launch=None, after_success=None):
    owned = chain_owned()
    if not owned:
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
        from r15_preflight import execution_python
        environment = dict(os.environ, MGOGO_FT_ROOT=str(root), MGOGO_DECIDE_PYTHON=str(execution_python()), MGOGO_DECIDE_DEVICE='mps', MGOGO_FLASHDEBERTA='0', HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
        process = subprocess.Popen(command, cwd=ROOT, env=environment, start_new_session=True)
        try: code = process.wait(timeout=timeout_seconds)
        except subprocess.TimeoutExpired as exc:
            stop_group(process)
            process = None
            raise ValueError(('six-hour R15 training' if purpose == 'training' else 'R15 preflight') + ' budget exhausted; inspect partial outputs before any new run') from exc
        if code == 0 and after_success is not None: after_success()
        raise SystemExit(code)
    finally:
        if process is not None and process.poll() is None: stop_group(process)
        signal.signal(signal.SIGTERM, previous)
        if not owned: MODEL_LOCK.unlink()


if __name__ == '__main__':
    try: main()
    except (ValueError, KeyError, OSError) as exc: sys.exit('R15 training refused: ' + str(exc))
