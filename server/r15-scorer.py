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


def main():
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
    from r15_preflight import validate_preflight
    validate_preflight(root)
    if sha(root / 'preflight/result.json') != manifest['preflight']['receipt_sha256']:
        raise ValueError('adapter preflight receipt changed')
    if before != manifest['adapter_sha256']:
        raise ValueError('adapter weights differ from the completed manifest')
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
