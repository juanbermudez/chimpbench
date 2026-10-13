"""Import-safe R15 preflight contract. Real tokenizer/model execution is explicit and exclusively locked."""
import argparse
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = 'r15-preflight-v1'
REVISION = '7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6'
LIMITS = {'tokens': 1280, 'rows': 20000, 'dev_per_phase': 6, 'seconds': 2700,
          'same_precision_gap': 1e-4, 'half_api_gap': .001, 'half_api_sum_error': .001, 'fp32_half_gap': .005, 'bf16_half_gap': .02, 'sum_error': 1e-5}
SOURCES = ('src/providers/packet.ts', 'src/kernel/resource-contract.ts', 'src/sim/context-check.ts',
           'scripts/lib/r15-training.ts', 'scripts/r15-preflight.ts', 'training/decide_ft/common.py',
           'training/decide_ft/soft_loss.py', 'training/decide_ft/train.py', 'training/decide_ft/train_r11.py',
           'training/decide_ft/train_r15.py', 'training/decide_ft/adapters.py', 'training/decide_ft/r8_tokens.py',
           'training/decide_ft/r15_preflight.py', 'training/decide_ft/r15_preflight_worker.py')


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def read(path): return json.loads(Path(path).read_text())
def write_new(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x') as f: json.dump(value, f, indent=2); f.write('\n')


def dataset_identity(root):
    return {'manifest': sha(root / 'contexts/manifest.json'),
            'splits': {s: sha(root / f'contexts/{s}.jsonl') for s in ('train', 'dev')}}


def implementation_identity(): return {p: sha(ROOT / p) for p in SOURCES}


def execution_python():
    return Path(os.environ.get('MGOGO_DECIDE_PYTHON', '/Volumes/Drive/chimpbench/decide-env/bin/python')).absolute()


def runtime_digest(runtime):
    return hashlib.sha256(json.dumps(runtime, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()


def assert_execution_runtime():
    selected = execution_python()
    if Path(sys.prefix).resolve() != selected.parent.parent.resolve() or sha(sys.executable) != sha(selected):
        raise ValueError('actual interpreter/environment differs from selected preflight runtime')


def runtime_identity():
    # Package metadata and source files only: importing this validator never loads a model.
    if os.environ.get('MGOGO_DECIDE_DEVICE', 'mps') != 'mps' or os.environ.get('MGOGO_FLASHDEBERTA', '0') != '0':
        raise ValueError('R15 is qualified only for MPS with FlashDeBERTa disabled')
    python = execution_python()
    sites = list((python.parent.parent / 'lib').glob('python*/site-packages'))
    installed = {dist.metadata['Name'].lower(): dist for dist in importlib.metadata.distributions(path=[str(p) for p in sites])}
    packages = {}
    for name in ('torch', 'gliner2', 'transformers', 'tokenizers', 'peft'):
        dist = installed[name]
        files = {str(p): sha(dist.locate_file(p)) for p in dist.files or [] if str(p).endswith('.py') and name in ('gliner2', 'peft')}
        packages[name] = {'version': dist.version, 'sources': files}
    ghn = Path(os.environ.get('MGOGO_GHN_ROOT', '/Volumes/Drive/chimpbench/GHN'))
    hub = Path(os.environ.get('HF_HUB_CACHE', '/Volumes/Drive/chimpbench/hf-cache/hub'))
    snap = hub / 'models--fastino--GLiNER2.5-Decide' / 'snapshots' / REVISION
    assets = {p.name: sha(p) for p in sorted(snap.iterdir()) if p.is_file() and p.suffix in ('.json', '.txt', '.model')}
    if not assets or 'config.json' not in assets: raise ValueError('missing pinned tokenizer/config assets')
    return {'python': sha(python), 'packages': packages, 'provider': sha(ghn / 'experiments/active_perception/decide_provider.py'), 'assets': assets,
            'base_revision': REVISION, 'device': 'mps', 'flash': False, 'training_amp': 'bf16', 'serving_precision': 'fp16'}


def fixture_rows(rows):
    chosen = []
    for phase in ('kind', 'target'):
        group = sorted((r for r in rows if r['phase'] == phase), key=lambda r: hashlib.sha256(r['id'].encode()).hexdigest())
        if not group: raise ValueError('preflight requires both development phases')
        chosen.extend(group[:LIMITS['dev_per_phase']])
    return chosen


def probability_gap(left, right, sum_error=None):
    if not left or len(left) != len(right): raise ValueError('probability menu mismatch')
    for probabilities in (left, right):
        if any(not math.isfinite(p) or p < 0 or p > 1 for p in probabilities) or abs(sum(probabilities) - 1) > (LIMITS['sum_error'] if sum_error is None else sum_error):
            raise ValueError('invalid or unnormalized probabilities')
    return max(abs(a - b) for a, b in zip(left, right))


def validate_preflight(root):
    root = Path(root).resolve()
    result = read(root / 'preflight/result.json')
    if result.get('schema') != SCHEMA or result.get('passed') is not True or result.get('limits') != LIMITS:
        raise ValueError('missing/failing or incompatible R15 preflight')
    expected = {'dataset': dataset_identity(root), 'implementations': implementation_identity(), 'runtime': runtime_identity()}
    if result.get('identity') != expected: raise ValueError('stale R15 preflight identity')
    outputs = result.get('outputs', {})
    for name in ('packets.json', 'tokens.json', 'parity.json'):
        if outputs.get(name) != sha(root / 'preflight' / name): raise ValueError('changed preflight output: ' + name)
    tokens, parity = read(root / 'preflight/tokens.json'), read(root / 'preflight/parity.json')
    manifest = read(root / 'contexts/manifest.json')
    expected_count = 2 * sum(manifest['counts'][s] for s in ('train', 'dev'))
    if tokens.get('count') != expected_count or tokens.get('over_limit') != 0 or not 0 < tokens.get('max', 0) <= LIMITS['tokens']:
        raise ValueError('incomplete/failing token coverage')
    dev = [json.loads(line) for line in (root / 'contexts/dev.jsonl').read_text().splitlines() if line]
    expected_keys = {(r['id'], variant) for r in fixture_rows(dev) for variant in ('original', 'permuted')}
    packets = read(root / 'preflight/packets.json')
    if packets.get('passed') is not True or len(packets.get('rows', [])) * 2 != expected_count: raise ValueError('incomplete exact packet coverage')
    if len(tokens.get('rows', [])) != expected_count or any(not isinstance(r.get('tokens'), int) or not 0 < r['tokens'] <= LIMITS['tokens'] for r in tokens['rows']):
        raise ValueError('invalid token row evidence')
    rows = parity.get('rows', [])
    if len(rows) != len(expected_keys) or {(r.get('id'), r.get('variant')) for r in rows} != expected_keys:
        raise ValueError('incomplete parity fixture')
    for row in rows:
        for key, a, b in (('fp32_half_gap', 'fp32', 'half'), ('bf16_half_gap', 'bf16', 'half')):
            if abs(probability_gap(row[a], row[b]) - row[key]) > 1e-10: raise ValueError('inconsistent probability evidence')
        if row.get('same_ids') is not True: raise ValueError('training/serving token mismatch')
        for key, limit in (('fp32_gap', 'same_precision_gap'), ('half_gap', 'half_api_gap'), ('fp32_half_gap', 'fp32_half_gap'), ('bf16_half_gap', 'bf16_half_gap')):
            value = row.get(key)
            if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 or value > LIMITS[limit]: raise ValueError('failed numerical parity')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True); parser.add_argument('--run', action='store_true')
    args = parser.parse_args(); root = args.root.resolve()
    from train_r15 import ROOT, run_guarded, validate
    validate(root)
    command = [str(ROOT / 'training/decide_ft/r4_py.sh'), 'r15_preflight_worker.py', '--root', str(root)]
    print(shlex.join([sys.executable, '-B', str(Path(__file__).resolve()), '--root', str(root), '--run']), flush=True)
    if args.run:
        if (root / 'preflight').exists(): raise ValueError('preflight directory exists; preserve it and use a fresh dataset root for a new attempt')
        run_guarded(command, root, timeout_seconds=LIMITS['seconds'], purpose='preflight')


if __name__ == '__main__':
    try: main()
    except (ValueError, KeyError, OSError) as exc: sys.exit('R15 preflight refused: ' + str(exc))
