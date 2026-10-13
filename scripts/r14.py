#!/usr/bin/env python3
"""R14's resumable local chain. Standard library only; model work runs in the existing worker/trainer.

  python3 scripts/r14.py check | stage-a | stage-b | status | dry
  R14_OUT=/absolute/run/root R14_SOURCE=/absolute/R11/root

Every step retains its command, budget, log, and result identity. A failed scientific guard ends stage A normally,
with an explicit not-passed outcome; execution failures exit nonzero and require inspection before resuming.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import random
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
WT = Path('/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees')
SOURCE = Path(os.environ.get('R14_SOURCE', str(WT / 'r11-honest-retrain/artifacts/decide-ft/r11'))).resolve()
OUT = Path(os.environ.get('R14_OUT', str(ROOT / 'artifacts/r14'))).resolve()
TSX = ['fnm', 'exec', '--using=22.22.3', '--', 'pnpm', 'exec', 'tsx']
NIGHT = TSX + ['scripts/r10-night.ts']
DRY = False


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''): h.update(block)
    return h.hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def atomic(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, indent=1) + '\n')
    tmp.replace(path)


def rows(path):
    with Path(path).open() as f:
        return [json.loads(line) for line in f if line.strip()]


def write_rows(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(''.join(json.dumps(x, separators=(',', ':')) + '\n' for x in data))


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def log(message):
    line = time.strftime('%Y-%m-%dT%H:%M:%S%z') + ' ' + message
    print(line, flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / 'status.log').open('a') as f: f.write(line + '\n')


def env():
    result = dict(os.environ)
    result.update(MGOGO_GHN_ROOT='/Volumes/Drive/chimpbench/GHN',
                  MGOGO_DECIDE_PYTHON='/Volumes/Drive/chimpbench/decide-env/bin/python',
                  HF_HOME='/Volumes/Drive/chimpbench/hf-cache', HF_HUB_CACHE='/Volumes/Drive/chimpbench/hf-cache/hub',
                  HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
    result.pop('MGOGO_DECIDE_SERVER', None)
    return result


def other_models():
    listing = subprocess.check_output(['ps', '-axo', 'pid=,command='], text=True)
    import re
    pattern = re.compile(r'(?:^|\s)(?:\S*/)?(?:worker|server|parity|train(?:_r\w+)?|em_score|score_contexts|eval_offline|eval_ab|distill)\.py(?:\s|$)|-m experiments\.active_perception\.decide_provider')
    return [line.strip() for line in listing.splitlines() if pattern.search(line)]


def adapter(root, name, trained=False):
    folder = Path(root) / 'adapters' / name
    manifest, weights = folder / 'manifest.json', folder / 'adapter_model.safetensors'
    if not manifest.is_file() or not weights.is_file(): raise RuntimeError(f'incomplete or missing adapter {folder}')
    m = read(manifest)
    if m.get('adapter_sha256') != sha(weights): raise RuntimeError(f'adapter identity mismatch {name}')
    if trained:
        for kind in ('train', 'dev'):
            if m.get(f'{kind}_sha256') != sha(OUT / 'ft/contexts' / f'{kind}.jsonl'):
                raise RuntimeError(f'{name}: {kind} data identity mismatch')
        if m.get('stage') != 'R14' or m.get('labels') != 'soft': raise RuntimeError(f'{name}: wrong training manifest')
    return {'name': name, 'weights': sha(weights), 'manifest': sha(manifest)}


def identity():
    files = ['p5b/contexts/train.jsonl', 'p5b/contexts/dev.jsonl', 'eval/all.jsonl', 'eval/test.jsonl']
    result = {'stage': 'R14', 'dry': DRY, 'commit': git('rev-parse', 'HEAD'), 'source': str(SOURCE),
              'files': {p: sha(SOURCE / p) for p in files},
              'adapters': [adapter(SOURCE, f'r11-p5b-s{s}') for s in (7, 11)],
              'protocol': sha(ROOT / 'docs/staging/r14-prereg.md')}
    if git('status', '--porcelain'): raise RuntimeError('R14 requires a committed, clean checkout')
    return result


def pin():
    current = identity()
    path = OUT / 'identity.json'
    if path.exists() and read(path) != current: raise RuntimeError('checkout, source data, or adapter changed since this chain began')
    atomic(path, current)


def model_preflight():
    processes = other_models()
    if processes: raise RuntimeError('another model process: ' + ' | '.join(processes))
    if os.getloadavg()[0] >= 8: raise RuntimeError('one-minute load >=8; no model step started')
    import shutil
    if shutil.disk_usage(OUT).free < 5 * 1024**3: raise RuntimeError('less than 5 GB free')


def step(name, command, hours=1, environment=None, model=False, outputs=()):
    record = OUT / 'steps' / (name + '.json')
    state = read(record) if record.exists() else {'name': name, 'command': command, 'seconds': 0, 'attempts': []}
    if state['command'] != command: raise RuntimeError(f'{name}: command changed')
    if state.get('done'):
        if any(not Path(p).is_file() or sha(p) != h for p, h in state['outputs'].items()): raise RuntimeError(f'{name}: completed output changed')
        log(f'SKIP {name}: complete')
        return
    # A process killed before its finally block charges all wall time since launch, conservatively including downtime.
    if state.get('activeAt'):
        state['seconds'] += max(0, time.time() - state.pop('activeAt'))
        atomic(record, state)
    remaining = hours * 3600 - state['seconds']
    if remaining <= 0: raise RuntimeError(f'{name}: registered cumulative wall budget exhausted')
    if model: model_preflight()
    state['activeAt'] = time.time()
    state['attempts'].append({'start': state['activeAt'], 'budgetSeconds': remaining})
    atomic(record, state)
    log(f'START {name}, {remaining / 3600:.2f} h left')
    start = time.monotonic()
    logfile = OUT / 'logs' / (name + '.log')
    logfile.parent.mkdir(parents=True, exist_ok=True)
    proc = None
    try:
        with logfile.open('a') as f:
            proc = subprocess.Popen(command, cwd=ROOT, env=environment or env(), stdout=f, stderr=subprocess.STDOUT, start_new_session=True)
            try: code = proc.wait(timeout=remaining)
            except (subprocess.TimeoutExpired, KeyboardInterrupt):
                os.killpg(proc.pid, signal.SIGTERM)
                try: proc.wait(timeout=30)
                except subprocess.TimeoutExpired: os.killpg(proc.pid, signal.SIGKILL); proc.wait()
                raise RuntimeError(f'{name}: interrupted or wall cap; run/checkpoint retained')
        if code: raise RuntimeError(f'{name}: exit {code}; see {logfile}')
        missing = [str(p) for p in outputs if not Path(p).is_file()]
        if missing: raise RuntimeError(f'{name}: missing outputs {missing}')
        state['outputs'] = {str(p): sha(p) for p in outputs}
        state['done'] = True
    finally:
        state['seconds'] += time.monotonic() - start
        state.pop('activeAt', None)
        atomic(record, state)
    log(f'END {name}, {state["seconds"] / 60:.1f} min')


def run_world(label, seed, arm, days, hours, root=SOURCE):
    folder = OUT / 'runs' / label
    registry = folder / 'run.json'
    e = env()
    if arm != 'rules':
        name = f'r11-p5b-s{11 if seed == 7 else 7}' if '-source-' in arm else f'r14-p5b-s{11 if "s11" in arm else 7}'
        adapter(root, name, trained='-trained-' in arm)
        e.update(MGOGO_FT_ROOT=str(root), MGOGO_FT_ADAPTERS=name)
    args = ['run', '--seed', str(seed), '--arm', arm, '--packet', 'p5b', '--days', str(days), '--hours', str(hours), '--out', str(folder)]
    # Command identity is stable across a resume. The tiny launcher chooses start/resume without changing the step record.
    command = [sys.executable, str(Path(__file__).resolve()), '_world', *args]
    step(label, command, hours, e, model=arm != 'rules', outputs=[registry])
    r = read(registry)
    if r['state'] != 'done' or len(r['days']) != days or any(x['timeouts'] for x in r['days']):
        raise RuntimeError(f'{label}: incomplete/stopped/timeout run; no collection or scientific success')
    return folder


def collect(label, folder):
    file = OUT / 'parts' / f'{label}.jsonl'
    step('label-' + label, TSX + ['scripts/r14-collect.ts', str(folder), str(file)], 2, outputs=[file, Path(str(file) + '.meta.json')])


def packet_state(packet):
    state = packet['state']; doing = state.get('doing', ''); now = state.get('now', ''); near = state.get('nearby', [])
    return {'nest': doing.startswith('in my nest,'), 'day': now.startswith('full daylight;'), 'dark': now.startswith('dark;'),
            'dawn': 'getting lighter' in now, 'dusk': 'getting darker' in now, 'alone': not near,
            'companyNest': any('in a nest' in s for s in near)}


def assemble():
    ft = OUT / 'ft'; manifest_path = ft / 'contexts/manifest.json'
    parts = [OUT / 'parts' / f'{kind}-s{seed}.jsonl' for seed in (48, 7, 21) for kind in ('learner', 'rules')]
    inputs = {str(p): sha(p) for p in parts}
    if manifest_path.exists():
        if read(manifest_path).get('parts') != inputs: raise RuntimeError('assembled inputs changed')
        for p, h in read(manifest_path)['outputs'].items():
            if sha(p) != h: raise RuntimeError('assembled output changed')
        return
    allrows = [r for p in parts for r in rows(p)]
    ids = [r['id'] for r in allrows]
    if len(ids) != len(set(ids)): raise RuntimeError('duplicate selected id')
    for r in allrows:
        if r['seed'] == 21 and r['split'] != 'test': raise RuntimeError('test leak')
        if r['seed'] in (48, 7) and r['split'] == 'test': raise RuntimeError('wrong split')
    outputs = []
    for kind in ('train', 'dev'):
        selected = [r for r in allrows if r['split'] == kind]
        if kind == 'train' and len(selected) > 3120: raise RuntimeError('new training file exceeds registered quota')
        original = SOURCE / f'p5b/contexts/{kind}.jsonl'
        target = ft / f'contexts/{kind}.jsonl'; target.parent.mkdir(parents=True, exist_ok=True)
        prefix = original.read_bytes()
        if not prefix.endswith(b'\n'): raise RuntimeError('original JSONL has no final newline')
        target.write_bytes(prefix + ''.join(json.dumps(r) + '\n' for r in selected).encode())
        outputs.append(target)
    packets = {r['id']: r['packets']['p5b'] for r in rows(SOURCE / 'eval/all.jsonl')}
    original_test = []
    for r in rows(SOURCE / 'eval/test.jsonl'):
        if r.get('label') != 'fresh' or not r.get('soft'): continue
        p = packets[r['id']]
        original_test.append({**r, 'id': 'original:' + r['id'], 'source': 'original', 'stratum': 'original', 'packet': p, 'state': packet_state(p)})
    evaluation = original_test + [r for r in allrows if r['split'] == 'test']
    target = ft / 'eval.jsonl'; write_rows(target, evaluation); outputs.append(target)
    if len(original_test) != 1500: raise RuntimeError(f'expected 1500 original held-out fresh rows, got {len(original_test)}')
    manifest = {'stage': 'R14', 'name_of_results': 'rules-taught model on a rules menu', 'input': 'unchanged P5b',
                'label_source': 'R11 teacher conditional distribution on learner asks and fresh rules-twin decisions',
                'labels_from_jev_or_an_outside_model': False, 'parts': inputs, 'data_commit': git('rev-parse', 'HEAD'),
                'old_train': sha(SOURCE / 'p5b/contexts/train.jsonl'), 'old_dev': sha(SOURCE / 'p5b/contexts/dev.jsonl'),
                'counts': {s: sum(r['split'] == s for r in allrows) for s in ('train', 'dev', 'test')},
                'outputs': {str(p): sha(p) for p in outputs}, 'limits': 'animal intervals describe one world; teacher is rules'}
    atomic(manifest_path, manifest)
    log('ASSEMBLED ' + json.dumps(manifest['counts']))


def train(seed):
    name = f'r14-p5b-s{seed}'; ft = OUT / 'ft'; directory = ft / 'adapters' / name
    if directory.exists():
        adapter(ft, name, True)
        return
    e = env(); e['MGOGO_FT_ROOT'] = str(ft)
    step('train-s' + str(seed), ['training/decide_ft/r4_py.sh', 'train_r11.py', '--name', name,
         '--train', 'contexts/train.jsonl', '--dev', 'contexts/dev.jsonl', '--extra', 'contexts/manifest.json', '--epochs', '3', '--seed', str(seed), '--labels', 'soft'],
         6, e, True, [directory / 'adapter_model.safetensors', directory / 'manifest.json'])
    adapter(ft, name, True)


def score(name, root):
    ft = OUT / 'ft'; destination = ft / 'scores' / (name + '.jsonl'); destination.parent.mkdir(parents=True, exist_ok=True)
    identity = adapter(root, name, name.startswith('r14-'))
    receipt = destination.with_suffix('.identity.json')
    expected = {**identity, 'input': sha(ft / 'eval.jsonl')}
    if receipt.exists():
        got = read(receipt)
        if {k: got[k] for k in expected} != expected or sha(destination) != got['output']: raise RuntimeError('score identity changed')
        return destination
    e = env(); e.update(MGOGO_FT_ROOT=str(root), MGOGO_FT_ADAPTERS=name)
    partial = destination.with_suffix('.partial')
    step('score-' + name, ['training/decide_ft/r4_py.sh', 'score_contexts.py', '--device', 'mps', '--in', str(ft / 'eval.jsonl'),
         '--out', str(partial), '--models', name], 2, e, True, [partial])
    predictions = rows(partial); evaluation = rows(ft / 'eval.jsonl')
    if len(predictions) != len(evaluation) or [r['id'] for r in predictions] != [r['id'] for r in evaluation]: raise RuntimeError('partial or reordered scoring')
    if any(r['adapter'] != name for r in predictions): raise RuntimeError('wrong scoring adapter')
    destination.write_bytes(partial.read_bytes()); atomic(receipt, {**expected, 'output': sha(destination)})
    return destination


def mean(values):
    return sum(values) / len(values) if values else None


def interval(values, keys):
    groups = {}
    for v, k in zip(values, keys): groups.setdefault(str(k), []).append(v)
    if len(groups) < 2: return None
    units = list(groups.values()); rng = random.Random(1414); samples = []
    for _ in range(2000):
        selected = [units[rng.randrange(len(units))] for _ in units]
        samples.append(sum(sum(a) for a in selected) / sum(len(a) for a in selected))
    samples.sort()
    return [samples[49], samples[1949]]


def reading(seed):
    ft = OUT / 'ft'; data = rows(ft / 'eval.jsonl')
    old = rows(ft / 'scores/r11-p5b-s7.jsonl'); new = rows(ft / f'scores/r14-p5b-s{seed}.jsonl')
    if [r['id'] for r in old] != [r['id'] for r in data] or [r['id'] for r in new] != [r['id'] for r in data]: raise RuntimeError('score rows do not align')
    prepared = []
    for r, a, b in zip(data, old, new):
        q = [r['soft'][k] for k in r['packet']['questions']['action']['criteria']]
        p0, p1 = a['probs'], b['probs']
        if len(q) != len(p0) or len(q) != len(p1) or any(not math.isfinite(v) or v < 0 for v in q + p0 + p1) or any(abs(sum(p) - 1) > .002 for p in (q, p0, p1)): raise RuntimeError('invalid probabilities')
        nest = [i for i, k in enumerate(r['options']) if k['action'] == 'nest']
        carry = r['carryOn']
        take = lambda p: sum(p[i] for i in nest)
        kl = lambda p: sum(t * math.log(t / max(1e-9, v)) for t, v in zip(q, p) if t > 0)
        trip = [i for i, o in enumerate(r['options']) if o['family'] in ('travel-food', 'trip', 'food-trip')]
        prepared.append({'row': r, 'kl0': kl(p0), 'kl1': kl(p1), 'nestQ': take(q), 'nest0': take(p0), 'nest1': take(p1),
                         'carryQ': q[carry] if carry >= 0 else None, 'carry0': p0[carry] if carry >= 0 else None, 'carry1': p1[carry] if carry >= 0 else None,
                         'tripQ': sum(q[i] for i in trip), 'trip0': sum(p0[i] for i in trip), 'trip1': sum(p1[i] for i in trip)})
    groups = {'original': [x for x in prepared if x['row']['source'] == 'original'],
              'learner': [x for x in prepared if x['row']['source'] == 'learner' and x['row'].get('selectedVia') == 'plain'],
              'learnerWithoutNest': [x for x in prepared if x['row']['source'] == 'learner' and x['row'].get('selectedVia') == 'plain' and not x['row']['state']['nest']]}
    for s in ('dayNest', 'aloneDusk', 'darkOut'): groups[s] = [x for x in prepared if x['row']['source'] != 'original' and x['row']['stratum'] == s]
    for name, predicate in [('dawnGuard', lambda s: s['nest'] and s['dawn']), ('companyDuskGuard', lambda s: s['nest'] and s['dusk'] and s['companyNest'])]:
        groups[name] = [x for x in prepared if x['row']['source'] != 'original' and predicate(x['row']['state']) and x['nestQ'] >= .99]
    summary = {}
    for name, group in groups.items():
        animals = [x['row']['chimpId'] for x in group]
        def metric(oldkey, newkey, error=False):
            delta = [(abs(x[newkey] - x['nestQ']) - abs(x[oldkey] - x['nestQ'])) if error else x[newkey] - x[oldkey] for x in group]
            return {'old': mean([x[oldkey] for x in group]), 'new': mean([x[newkey] for x in group]), 'difference': mean(delta), 'animalInterval': interval(delta, animals)}
        summary[name] = {'n': len(group), 'animals': len(set(animals)), 'divergence': metric('kl0', 'kl1'), 'nest': metric('nest0', 'nest1'), 'nestError': metric('nest0', 'nest1', True)}
    guards = {}
    guards['originalDivergence'] = bool(summary['original']['divergence']['difference'] is not None and summary['original']['divergence']['difference'] <= .05)
    carrying = [x for x in groups['original'] if x['carryQ'] is not None]
    cq, c0, c1 = (mean([x[k] for x in carrying]) for k in ('carryQ', 'carry0', 'carry1'))
    guards['carryingOn'] = all(v is not None for v in (cq, c0, c1)) and abs(c1 - cq) - abs(c0 - cq) <= .05
    for name in ('dawnGuard', 'companyDuskGuard'):
        g = summary[name]
        guards[name] = g['n'] >= 30 and g['animals'] >= 5 and g['nest']['difference'] is not None and g['nest']['difference'] >= -.01
    benefits = {name: summary[name]['n'] >= 30 and summary[name]['animals'] >= 5 and summary[name]['nestError']['animalInterval'] is not None and summary[name]['nestError']['animalInterval'][1] < 0 for name in ('dayNest', 'aloneDusk')}
    verdict = {'stage': 'R14', 'trainingSeed': seed, 'guards': guards, 'proceed': all(guards.values()),
               'benefit': 'complete evidence' if all(benefits.values()) else 'partial evidence' if any(benefits.values()) else 'not shown',
               'benefits': benefits, 'groups': summary, 'carryingOn': {'teacher': cq, 'old': c0, 'new': c1},
               'limits': 'offline teacher agreement; animal intervals are descriptive within-world intervals; no population viability or wild-behavior claim'}
    atomic(OUT / f'offline-s{seed}.json', verdict)
    text = [f'# R14 offline, training seed {seed}', '', 'Rules-taught model on a rules menu. Within-world intervals; no population claim.', '',
            f'Proceed to rehearsal: {verdict["proceed"]}. Benefits: {verdict["benefit"]}.', '', '| Guard | Met |', '| --- | --- |']
    text += [f'| {k} | {v} |' for k, v in guards.items()]
    text += ['', '| Set | Rows | Animals | Divergence change | Nest error change |', '| --- | --- | --- | --- | --- |']
    text += [f'| {k} | {g["n"]} | {g["animals"]} | {g["divergence"]["difference"]} | {g["nestError"]["difference"]} |' for k, g in summary.items()]
    (OUT / f'offline-s{seed}.md').write_text('\n'.join(text) + '\n')
    log(f'READING s{seed}: proceed={verdict["proceed"]}; {verdict["benefit"]}; {guards}')
    return verdict


def rehearsal(seed):
    folder = run_world(f'rehearsal-s{seed}', 48, f'r14-trained-s{seed}-draw-1', 5, 2, OUT / 'ft')
    step(f'replay-rehearsal-s{seed}', NIGHT + ['replay', str(folder)], 1, outputs=[folder / 'replay/replay.json'])
    if not read(folder / 'replay/replay.json')['ok']: raise RuntimeError('rehearsal replay failed')


def stage_a():
    pin()
    for seed in (48, 7, 21):
        folder = run_world(f'learner-s{seed}', seed, f'r14-source-s{11 if seed == 7 else 7}-draw-1', 10, 3)
        twin = run_world(f'rules-s{seed}', seed, 'rules', 10, 1)
        collect(f'learner-s{seed}', folder); collect(f'rules-s{seed}', twin)
    assemble()
    ft = OUT / 'ft'; e = env(); e['MGOGO_FT_ROOT'] = str(ft)
    token_packets = ft / 'token-packets.jsonl'
    if not token_packets.exists():
        all_packets = rows(ft / 'contexts/train.jsonl') + rows(ft / 'contexts/dev.jsonl') + rows(ft / 'eval.jsonl')
        write_rows(token_packets, [{'id': r['id'], 'packets': {'p5b': r['packet']}} for r in all_packets])
    tokens = ft / 'tokens.jsonl'
    step('tokens', ['training/decide_ft/r4_py.sh', 'r8_tokens.py', '--in', str(token_packets), '--packets', 'p5b', '--out', str(tokens)], 1, e, outputs=[tokens])
    counted = rows(tokens)
    if len(counted) != len(rows(token_packets)) or any(r['tokens'] > 1280 for r in counted): raise RuntimeError('token count incomplete or over 1280')
    # This check loads the real model and compares training/serving logits. Run only under the model guard.
    step('parity', ['training/decide_ft/r4_py.sh', 'parity.py', '--n', '12', '--device', 'mps'], 1, e, model=True)
    train(7); score('r11-p5b-s7', SOURCE); score('r14-p5b-s7', ft)
    result = reading(7)
    if result['proceed']: rehearsal(7)
    atomic(OUT / 'stage-a.json', {'done': True, 'offlinePassed': result['proceed'], 'rehearsalPassed': result['proceed'],
                                 'next': 'stage-b' if result['proceed'] else 'stop: offline harm or insufficient exposure; inspect offline-s7.json'})


def stage_b():
    pin()
    a = read(OUT / 'stage-a.json')
    if not a['offlinePassed'] or not a['rehearsalPassed']: raise RuntimeError('stage A did not pass')
    train(11); score('r14-p5b-s11', OUT / 'ft')
    if not reading(11)['proceed']:
        atomic(OUT / 'stage-b.json', {'done': True, 'outcome': 'second training failed offline guard; no fresh test opened'}); return
    audit = Path('/Volumes/Drive/chimpbench/shots/r14-seed-audit-2026-10-13/audit.json')
    if sha(audit) != '181ae234b289559a416e5dcbcf48b475f3b48e0b26a8a0107214f0e369f78a1f': raise RuntimeError('fresh-seed provenance audit absent or changed')
    for training_seed, world_seed in ((7, 3457), (11, 3823)):
        card = OUT / f'card-s{world_seed}'
        # Controls and rules first, then the kernel; no raw or sealed field data is needed.
        rules = run_world(f'test-rules-s{world_seed}', world_seed, 'rules', 20, 2)
        step(f'controls-s{world_seed}', NIGHT + ['controls', '--seed', str(world_seed), '--packet', 'p5b', '--days', '20', '--out', str(card)], 2,
             outputs=[card / f'P/s{world_seed}/rules-plain.json', card / f'P/s{world_seed}/mix30-b.json'])
        model = run_world(f'test-model-s{world_seed}', world_seed, f'r14-trained-s{training_seed}-draw-1', 20, 6, OUT / 'ft')
        for kind, folder in [('rules', rules), ('model', model)]:
            step(f'card-{kind}-s{world_seed}', NIGHT + ['replay', str(folder), '--r7', str(card)], 1,
                 outputs=[card / f'P/s{world_seed}' / (read(folder / 'run.json')['label'] + '.json')])
        destination = OUT / f'population-s{world_seed}.md'
        step(f'report-s{world_seed}', TSX + ['scripts/r13-report.ts', '--dir', str(card), '--seed', str(world_seed),
             '--model', read(model / 'run.json')['label'], '--rules', read(rules / 'run.json')['label'], '--model-run', str(model), '--rules-run', str(rules), '--md', str(destination)], 1, outputs=[destination])
    atomic(OUT / 'stage-b.json', {'done': True, 'outcome': 'two population readings on file; inspect V1-V3 separately for each world/training pair'})


def dry_run():
    global OUT, DRY
    OUT = OUT / 'dry'; DRY = True
    if (OUT / 'dry-done.json').exists():
        print('dry already complete:', OUT); return
    OUT.mkdir(parents=True, exist_ok=True)
    e = env(); e['MGOGO_DECIDE_PYTHON'] = str(ROOT / 'scripts/lib/fake-worker.mjs')
    for kind, arm in [('learner', 'r14-wire-s7-draw-1'), ('rules', 'rules')]:
        folder = OUT / kind
        command = [sys.executable, str(Path(__file__).resolve()), '_world', 'run', '--seed', '48', '--arm', arm,
                   '--packet', 'p5b', '--days', '1', '--burn-in', '1', '--hours', '0.3', '--out', str(folder)]
        step('wire-' + kind, command, .3, e, outputs=[folder / 'run.json'])
        target = OUT / 'parts' / (kind + '.jsonl')
        step('label-' + kind, TSX + ['scripts/r14-collect.ts', str(folder), str(target), '--dry'], .3,
             outputs=[target, Path(str(target) + '.meta.json')])
        # Force a no-op resume through the same command; complete days must remain byte-identical in world hashes.
        before = [d['hash'] for d in read(folder / 'run.json')['days']]
        step('resume-' + kind, command, .3, e)
        if before != [d['hash'] for d in read(folder / 'run.json')['days']]: raise RuntimeError('resume changed completed world')
    step('python-pipeline-tests', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'r14_pipeline_test.py'], .1)
    atomic(OUT / 'dry-done.json', {'dry': True, 'fakeWorker': True, 'realTeacherSmallRedraws': True,
          'trainerBoundary': 'no weights loaded; trainer itself is existing R11 and is not run by this dry check',
          'models': 0, 'tests': 'selection, real fake-worker receipts, exact labeling replays, assembly/guard/adapter identity fixture tests'})


def main():
    global OUT, DRY
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['check', 'stage-a', 'stage-b', 'status', 'dry', '_world'])
    args, rest = parser.parse_known_args()
    if args.command == '_world':
        pos = rest.index('--out'); folder = Path(rest[pos + 1])
        command = NIGHT + (['run', '--resume', str(folder), '--hours', rest[rest.index('--hours') + 1]] if (folder / 'run.json').exists() else rest)
        raise SystemExit(subprocess.call(command, cwd=ROOT))
    if rest: parser.error('unrecognized arguments: ' + ' '.join(rest))
    if args.command == 'status':
        print((OUT / 'state').read_text() if (OUT / 'state').exists() else 'not started')
        if (OUT / 'status.log').exists(): print('\n'.join((OUT / 'status.log').read_text().splitlines()[-12:]))
        return
    if args.command == 'check':
        print(json.dumps(identity(), indent=1)); print('other model processes:', other_models()); return
    if args.command == 'dry':
        dry_run(); return
    OUT.mkdir(parents=True, exist_ok=True)
    lock = Path('/Volumes/Drive/chimpbench/MGOGO/artifacts/r14-chain.lock')
    lock.parent.mkdir(parents=True, exist_ok=True)
    try: fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError: raise RuntimeError(f'chain lock exists: {lock}; inspect its PID before removing a stale lock')
    os.write(fd, json.dumps({'pid': os.getpid(), 'out': str(OUT)}).encode()); os.close(fd)
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try:
        (OUT / 'state').write_text('running\n')
        (stage_a if args.command == 'stage-a' else stage_b)()
        (OUT / 'state').write_text('done\n'); log(args.command + ' DONE')
    except BaseException:
        (OUT / 'state').write_text('failed\n'); raise
    finally: lock.unlink()


if __name__ == '__main__':
    try: main()
    except (RuntimeError, FileNotFoundError, KeyError, ValueError) as exc:
        print(f'R14 refused: {exc}', file=sys.stderr); raise SystemExit(2)
