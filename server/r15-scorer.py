"""Exclusive R15 scorer. Readiness means the named adapter was loaded and warmed."""
import contextlib
import hashlib
import json
import os
from pathlib import Path
import sys

out = sys.stdout


def emit(value):
    out.write(json.dumps(value) + '\n')
    out.flush()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_score(model, name, packets):
    from common import example
    counts = []
    with model.use(name) as loaded:
        for packet in packets:
            text, schema, _ = example(loaded, packet, None)
            batch = loaded.processor.collate_fn_inference([(text, schema)], max_len=None, error_policy='raise')
            count = int(batch.attention_mask.sum())
            if not 0 < count <= 1280:
                raise ValueError(f'R15 live packet has {count} tokens; maximum 1280, no truncation')
            counts.append(count)
    return model.score(name, packets), counts


def require_runtime():
    if os.environ.get('MGOGO_DECIDE_DEVICE') != 'mps' or os.environ.get('MGOGO_FLASHDEBERTA') != '0':
        raise ValueError('R15 preflight only qualifies MPS with FlashDeBERTa disabled')
    if os.path.abspath(sys.executable) != os.path.abspath(os.environ['MGOGO_DECIDE_PYTHON']):
        raise ValueError('R15 running interpreter differs from the selected runtime')
    # Keep the venv path: resolving its symlink would incorrectly identify only the shared base binary.
    os.environ['MGOGO_DECIDE_PYTHON'] = sys.executable


def ancestors(pid):
    """This process's ancestors from the process list (pid, ppid), nearest first."""
    import subprocess
    parent = {}
    for line in subprocess.check_output(['ps', '-axo', 'pid=,ppid='], text=True).splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit(): parent[int(parts[0])] = int(parts[1])
    out, p = [], parent.get(pid)
    while p is not None and p > 1 and p not in out:
        out.append(p); p = parent.get(p)
    return out


def require_lock():
    owner = json.loads(Path(os.environ['MGOGO_R15_LOCK_PATH']).read_text())
    parent = int(os.environ['MGOGO_R15_PARENT_PID'])
    if parent != os.getppid() or owner.get('token') != os.environ['MGOGO_R15_LOCK_TOKEN']:
        raise ValueError('R15 scorer requires its launching process to hold the exclusive model lock')
    if os.environ.get('MGOGO_R15_CHAIN_OWNED') == '1':
        # Stage R16 (docs/staging/r16-prereg.md §17.2): the lock is held by the chain that started the launching process.
        if owner.get('stage') != 'R16-chain' or owner.get('pid') not in ancestors(os.getpid()):
            raise ValueError('R15 scorer requires the R16 chain that started it to hold the exclusive model lock')
        return
    if owner.get('stage') != 'R15-app' or owner.get('pid') != parent:
        raise ValueError('R15 scorer requires its launching process to hold the exclusive model lock')


def main():
    require_lock()
    require_runtime()
    repo = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(repo / 'training/decide_ft'))
    root = Path(os.environ['MGOGO_FT_ROOT'])
    name = os.environ['MGOGO_FT_ADAPTERS']
    device = os.environ['MGOGO_DECIDE_DEVICE']
    folder = root / 'adapters' / name
    manifest = json.loads((folder / 'manifest.json').read_text())
    weights = folder / 'adapter_model.safetensors'
    before = sha(weights)
    config = sha(folder / 'adapter_config.json')
    from r15_preflight import runtime_digest, validate_preflight
    preflight = validate_preflight(root)
    if sha(root / 'preflight/result.json') != manifest['preflight']['receipt_sha256']:
        raise ValueError('adapter preflight receipt changed')
    if before != manifest['adapter_sha256']:
        raise ValueError('adapter weights differ from the completed manifest')
    if config != manifest['adapter_config_sha256']:
        raise ValueError('adapter configuration differs from the completed manifest')
    runtime_hash = runtime_digest(preflight['identity']['runtime'])
    if runtime_hash != manifest['preflight_runtime_sha256']:
        raise ValueError('adapter runtime differs from the completed manifest')
    warmup = json.loads(sys.stdin.readline())['warmup']
    with contextlib.redirect_stdout(sys.stderr):
        from adapters import AdapterModel
        model = AdapterModel(device, names=[name])
        if model.names != [name] or model.hashes.get(name) != before:
            raise ValueError('requested adapter was not loaded')
        _, warmup_tokens = checked_score(model, name, [warmup])
    if sha(weights) != before or sha(folder / 'adapter_config.json') != config:
        raise ValueError('adapter files changed while loading')
    emit({'ready': True, 'adapters': {name: before}, 'config_sha256': config, 'device': device, 'warmup_tokens': warmup_tokens[0]})
    for line in sys.stdin:
        request = json.loads(line)
        batch = request['batch']
        if not 1 <= len(batch) <= 8 or any(item['adapter'] != name for item in batch):
            raise ValueError('only the verified R15 adapter may be scored')
        with contextlib.redirect_stdout(sys.stderr):
            results, counts = checked_score(model, name, [item['packet'] for item in batch])
        emit({'results': results, 'input_tokens': counts})


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        emit({'error': str(exc)})
        sys.exit(1)
