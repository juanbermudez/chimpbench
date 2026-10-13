"""One locked base model, existing tokenizer and parity paths; never run directly."""
import argparse
import json
import os
from pathlib import Path
import random
import subprocess
import time
import zlib

from r15_preflight import (ROOT, SCHEMA, LIMITS, dataset_identity, implementation_identity, runtime_identity,
                           fixture_rows, probability_gap, read, sha, write_new, assert_execution_runtime)
from train_r15 import MODEL_LOCK, validate


def main(root):
    lock = read(MODEL_LOCK)
    if lock.get('pid') != os.getppid() or lock.get('purpose') != 'preflight' or lock.get('root') != str(root):
        raise ValueError('preflight worker requires its exclusive supervisor lock')
    assert_execution_runtime()
    manifest = validate(root)
    rows = {s: [json.loads(line) for line in (root / f'contexts/{s}.jsonl').read_text().splitlines() if line] for s in ('train', 'dev')}
    if sum(map(len, rows.values())) > LIMITS['rows']: raise ValueError('preflight dataset exceeds registered row cap')
    out = root / 'preflight'; out.mkdir()
    began = time.monotonic()
    identity = {'dataset': dataset_identity(root), 'implementations': implementation_identity(), 'runtime': runtime_identity()}
    coverage = {s: {phase: {'rows': sum(r['phase'] == phase for r in group),
                           'animals': sorted({(r['seed'], r['chimpId']) for r in group if r['phase'] == phase})}
                    for phase in ('kind', 'target')} for s, group in rows.items()}
    result = {'schema': SCHEMA, 'passed': False, 'identity': identity, 'limits': LIMITS, 'coverage': coverage,
              'counts': manifest['counts'], 'quality_claim': 'coverage and implementation preflight only; no training-quality or viability claim'}
    try:
        subprocess.run(['pnpm', 'exec', 'tsx', 'scripts/r15-preflight.ts', '--root', str(root)], cwd=ROOT, check=True, timeout=120)
        from common import collate, example, action_logits, load_base, serving_input, permuted
        from r8_tokens import processor, count
        proc, schema = processor()
        def variants(row):
            shuffled, _ = permuted(row['packet'], row['pick'], random.Random(zlib.crc32(row['id'].encode())))
            return [('original', row['packet']), ('permuted', shuffled)]
        token_rows = []
        for split, group in rows.items():
            for row in group:
                for variant, packet in variants(row):
                    token_rows.append({'id': row['id'], 'split': split, 'phase': row['phase'], 'variant': variant, 'tokens': count(proc, schema, packet)})
        counts = [r['tokens'] for r in token_rows]
        tokens = {'count': len(counts), 'max': max(counts), 'over_limit': sum(n > LIMITS['tokens'] for n in counts), 'rows': token_rows}
        write_new(out / 'tokens.json', tokens)
        if tokens['over_limit']: raise ValueError('real tokenizer found packets over 1280 tokens; no truncation allowed')
        del proc, schema
        import torch
        if os.environ.get('MGOGO_FLASHDEBERTA') == '1': raise ValueError('unregistered FlashDeBERTa runtime')
        if not torch.backends.mps.is_available(): raise ValueError('registered MPS runtime unavailable')
        model = load_base('mps')
        fixture = [(row, variant, packet) for row in fixture_rows(rows['dev']) for variant, packet in variants(row)]
        parity = []
        def compare(packet):
            captured = []
            original = model.processor.collate_fn_inference
            def spy(*args, **kwargs):
                batch = original(*args, **kwargs); captured.append(batch.input_ids.clone()); return batch
            text, tasks = serving_input(packet)
            try:
                model.processor.collate_fn_inference = spy
                served = model.classify_text(text, tasks, include_confidence=True, max_len=None)['action']
            finally: model.processor.collate_fn_inference = original
            batch = collate(model, [example(model, packet, None)])
            (logits,), _ = action_logits(model, batch)
            probabilities = torch.softmax(logits, -1).tolist()
            served_probs = [next(item['confidence'] for item in served if item['label'] == label) for label in packet['questions']['action']['criteria']]
            return probabilities, probability_gap(probabilities, served_probs, LIMITS['half_api_sum_error'] if next(model.parameters()).dtype == torch.float16 else None), bool(torch.equal(captured[-1].cpu(), batch.input_ids.cpu())), int(batch.attention_mask.sum())
        with torch.inference_mode():
            for row, variant, packet in fixture:
                fp32, gap, same, n = compare(packet)
                expected = next(r['tokens'] for r in token_rows if r['id'] == row['id'] and r['variant'] == variant and r['split'] == 'dev')
                if n != expected: raise ValueError('tokenizer-only count differs from model processor')
                with torch.autocast(device_type='mps', dtype=torch.bfloat16):
                    (logits,), _ = action_logits(model, collate(model, [example(model, packet, row['pick'] if variant == 'original' else None)]))
                    bf16 = torch.softmax(logits, -1).tolist()
                parity.append({'id': row['id'], 'phase': row['phase'], 'variant': variant, 'fp32': fp32, 'bf16': bf16,
                               'fp32_gap': gap, 'same_ids': same, 'tokens': n})
            model.half()
            for item, (_, _, packet) in zip(parity, fixture):
                half, gap, same, _ = compare(packet)
                item.update(half=half, half_gap=gap, same_ids=item['same_ids'] and same,
                            fp32_half_gap=probability_gap(item['fp32'], half), bf16_half_gap=probability_gap(item['bf16'], half))
        write_new(out / 'parity.json', {'rows': parity, 'base_only': True, 'weight_update': False})
        if any(not r['same_ids'] or r['fp32_gap'] > LIMITS['same_precision_gap'] or r['half_gap'] > LIMITS['half_api_gap']
               or r['fp32_half_gap'] > LIMITS['fp32_half_gap'] or r['bf16_half_gap'] > LIMITS['bf16_half_gap'] for r in parity):
            raise ValueError('numerical parity tolerance exceeded')
        if identity != {'dataset': dataset_identity(root), 'implementations': implementation_identity(), 'runtime': runtime_identity()}:
            raise ValueError('preflight inputs changed during execution')
        result['outputs'] = {name: sha(out / name) for name in ('packets.json', 'tokens.json', 'parity.json')}
        result['passed'] = True
    except Exception as exc:
        result['error'] = str(exc)
        raise
    finally:
        result['seconds'] = time.monotonic() - began
        write_new(out / 'result.json', result)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--root', type=Path, required=True)
    main(parser.parse_args().root.resolve())
