#!/usr/bin/env python3
"""Stage R16's chain (docs/staging/r16-prereg.md §16, §17). Standard library only; one owner, one model process at a time.

  python3 -B scripts/r16.py check | dry | session0 | session1 | between1 | session2 | day2 | session3 | report | status | publish DEST

  R16_OUT=/absolute/run/root   (default: <this checkout>/artifacts/r16)
  R16_CUTS=s11-focal,rollout-8,hs-scoring,s11-population-later   (the registered cuts of §16, taken before a session)

Every session holds the shared model lock (artifacts/r14-chain.lock of the main checkout) from its first step to its last,
under a kernel flock, and releases it on every exit (SIGINT, SIGTERM and SIGHUP included). Every step keeps its command,
attempts, log and output hashes under <R16_OUT>/chain; a finished step is never run again. A step that pauses (exit 75: a
stalled worker past its recovery allowance, failed warm-ups, a machine that would not quiet down) pauses the chain: run
the same session again to resume. A step that stops on a registered mark (exit 3, or a gate whose verdict does not hold)
ends the session's remaining model steps with the state `scientific-stop`. A wall cap of 2.5 times a step's planned time
catches a hang only. Model steps start only on a quiet machine.
"""
from __future__ import annotations
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
MAIN = Path(os.environ.get('R16_MAIN', '/Volumes/Drive/chimpbench/MGOGO'))
LOCK_PATH = MAIN / 'artifacts' / 'r14-chain.lock'
OUT = Path(os.environ.get('R16_OUT', str(ROOT / 'artifacts' / 'r16'))).resolve()
NODE = os.environ.get('R16_NODE', '/Users/zef/.local/share/fnm/node-versions/v22.22.3/installation/bin/node')
TSX = [NODE, str(ROOT / 'node_modules' / 'tsx' / 'dist' / 'cli.mjs')]
PY = os.environ.get('R16_PYTHON', '/usr/bin/python3')
WT = MAIN / '.claude' / 'worktrees'
R14_RUNS = WT / 'bench-r14' / 'artifacts' / 'r14' / 'runs'
R13_RUNS = WT / 'bench-r13' / 'artifacts' / 'r13'
FAKE_SCORER = str(ROOT / 'scripts' / 'lib' / 'r16-fake-scorer.mjs')
OPS = {'cap_factor': 2.5, 'quiet_load': 6.0, 'quiet_wait_s': 1800, 'quiet_poll_s': 60, 'free_gb': 5, 'session_swap_mb': 6144}
CUTS = set(filter(None, os.environ.get('R16_CUTS', '').split(',')))
DRY = False
PAUSED, STOPPED, INTERRUPTED = 75, 3, 130


class Pause(Exception): pass
class ScientificStop(Exception): pass
class Interrupted(Exception): pass
class Refused(Exception): pass


def now(): return time.strftime('%Y-%m-%dT%H:%M:%S%z')
def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''): h.update(block)
    return h.hexdigest()
def read(path): return json.loads(Path(path).read_text())
def atomic(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp'); tmp.write_text(json.dumps(value, indent=1) + '\n'); tmp.replace(path)
def chain_dir(): return OUT / 'chain'
def log(message):
    line = f'{now()} {message}'
    print(line, flush=True)
    chain_dir().mkdir(parents=True, exist_ok=True)
    with (chain_dir() / 'status.log').open('a') as f: f.write(line + '\n')
def set_state(state, note=''):
    chain_dir().mkdir(parents=True, exist_ok=True)
    (chain_dir() / 'state').write_text(state + '\n')
    if note: (chain_dir() / 'state-note').write_text(note + '\n')
def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


# ---------------------------------------------------------------------------------------------------------------------
# The lock (§17.2)
# ---------------------------------------------------------------------------------------------------------------------

def proc_start(pid):
    try: return subprocess.check_output(['ps', '-o', 'lstart=', '-p', str(pid)], text=True).strip()
    except subprocess.CalledProcessError: return ''
def alive(pid):
    try: os.kill(pid, 0); return True
    except ProcessLookupError: return False
    except PermissionError: return True


class ChainLock:
    """The shared model lock, held under a kernel flock for the chain's whole life and released on every exit."""
    def __init__(self, path=LOCK_PATH, out=None):
        self.path, self.out, self.fd, self.token = Path(path), Path(out or OUT), None, ''

    def stale_reason(self):
        """Why an existing lock file is stale ('' when it may be live). A file whose holder keeps a flock is live; a
        legacy tool keeps none, so a file is stale only when its pid is dead or that pid is another process now."""
        try: owner = json.loads(self.path.read_text())
        except (OSError, ValueError): return ''
        pid = owner.get('pid')
        try:
            fd = os.open(self.path, os.O_RDONLY)
            try: fcntl.flock(fd, fcntl.LOCK_SH | fcntl.LOCK_NB); held = False
            except BlockingIOError: held = True
            finally: os.close(fd)
        except OSError: held = False
        if held or not isinstance(pid, int): return ''
        if not alive(pid): return f'its process {pid} is gone'
        if owner.get('start') and owner.get('start') != proc_start(pid): return f'pid {pid} is another process now'
        return ''

    def acquire(self, step=''):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists():
            why = self.stale_reason()
            if not why: raise Refused(f'the shared model lock {self.path} is held: {self.path.read_text().strip()[:300]}')
            dest = self.out / 'locks' / f'stale-{int(time.time())}.json'
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(json.dumps({'moved': now(), 'why': why, 'was': self.path.read_text()}, indent=1) + '\n')
            self.path.unlink()
            log(f'LOCK a stale lock file was moved aside ({why}): {dest}')
        fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_RDWR, 0o600)
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.fd, self.token = fd, uuid.uuid4().hex
        self.write(step)

    def write(self, step):
        body = json.dumps({'pid': os.getpid(), 'start': proc_start(os.getpid()), 'host': socket.gethostname(), 'token': self.token, 'stage': 'R16-chain', 'step': step, 'out': str(self.out)}).encode()
        os.lseek(self.fd, 0, 0); os.ftruncate(self.fd, 0); os.write(self.fd, body); os.fsync(self.fd)

    def release(self):
        if self.fd is None: return
        try:
            if self.path.exists() and json.loads(self.path.read_text()).get('token') == self.token: self.path.unlink()
        except (OSError, ValueError): pass
        finally:
            os.close(self.fd); self.fd = None
        lock_gone = not self.path.exists() or json.loads(self.path.read_text() or '{}').get('token') != self.token
        log(f'LOCK released ({"gone" if lock_gone else "STILL PRESENT"})')


LOCK: ChainLock | None = None


# ---------------------------------------------------------------------------------------------------------------------
# A quiet machine (§17.8), the monitor, the environment
# ---------------------------------------------------------------------------------------------------------------------

MODEL_PATTERN = re.compile(r'(?:^|\s)(?:\S*/)?(?:worker|server|parity|r15-scorer|r15_preflight(?:_worker)?|train(?:_[\w]+)?|r14|score_contexts|em_score|eval_offline|eval_ab|distill|r8_tokens)\.py(?:\s|$)|decide_provider')
HEAVY_PATTERN = re.compile(r'(?:tsx|node)\s+(?:\S+\s+)*--test\b|\bvitest\b|vite\s+build\b|\bpnpm\s+(?:test|build)\b|playwright|Google Chrome.*--headless|\bgit\s+grep\b')
def swap_mb():
    try:
        m = re.search(r'used = ([0-9.]+)M', subprocess.check_output(['sysctl', '-n', 'vm.swapusage'], text=True))
        return float(m.group(1)) if m else None
    except (OSError, subprocess.CalledProcessError): return None
def own_tree():
    rows = [line.split(None, 2) for line in subprocess.check_output(['ps', '-axo', 'pid=,ppid=,command='], text=True).splitlines() if line.strip()]
    children, mine = {}, {os.getpid()}
    for r in rows:
        if len(r) >= 2: children.setdefault(int(r[1]), []).append(int(r[0]))
    stack = [os.getpid()]
    while stack:
        for c in children.get(stack.pop(), []):
            if c not in mine: mine.add(c); stack.append(c)
    p = os.getppid()
    while p > 1: mine.add(p); p = next((int(r[1]) for r in rows if int(r[0]) == p), 1)
    return rows, mine
def quiet_refusal():
    if DRY: return ''
    load = os.getloadavg()[0]
    if load >= OPS['quiet_load']: return f'one-minute load {load:.2f} (the limit is {OPS["quiet_load"]})'
    for where in (OUT, Path('/System/Volumes/Data')):
        if where.exists() and shutil.disk_usage(where).free < OPS['free_gb'] * 1024 ** 3: return f'less than {OPS["free_gb"]} GB free on {where}'
    rows, mine = own_tree()
    for r in rows:
        if len(r) < 3 or int(r[0]) in mine: continue
        if MODEL_PATTERN.search(r[2]): return f'another model process: {r[0]} {r[2][:160]}'
        if HEAVY_PATTERN.search(r[2]): return f'a heavy process: {r[0]} {r[2][:160]}'
    return ''
def wait_quiet():
    t0 = time.time()
    while True:
        why = quiet_refusal()
        if not why: return
        if time.time() - t0 >= OPS['quiet_wait_s']: raise Pause(f'the machine was not quiet for {OPS["quiet_wait_s"] // 60} min: {why}')
        log(f'WAIT for a quiet machine: {why}')
        time.sleep(OPS['quiet_poll_s'])


class Monitor:
    """Once a minute while a model step runs: load, swap, free memory pages, free disk and the drive's reads and writes (§17.8)."""
    def __init__(self, name): self.name, self.stop, self.thread = name, threading.Event(), None
    def sample(self):
        free = ''
        try: free = re.search(r'Pages free:\s+(\d+)', subprocess.check_output(['vm_stat'], text=True)).group(1)
        except (OSError, AttributeError, subprocess.CalledProcessError): pass
        io = ''
        try: io = subprocess.check_output(['iostat', '-d', '-K', '-c', '2', '-w', '1'], text=True, timeout=10).strip().splitlines()[-1]
        except (OSError, subprocess.SubprocessError): pass
        return {'t': now(), 'step': self.name, 'load': os.getloadavg(), 'swapMB': swap_mb(), 'freePages': free, 'freeGB': round(shutil.disk_usage(OUT).free / 1024 ** 3, 1), 'iostat': io}
    def run(self):
        f = chain_dir() / 'monitor.jsonl'
        while not self.stop.wait(60):
            with f.open('a') as out: out.write(json.dumps(self.sample()) + '\n')
    def __enter__(self):
        if not DRY: self.thread = threading.Thread(target=self.run, daemon=True); self.thread.start()
        return self
    def __exit__(self, *_): self.stop.set()


def environment(model):
    e = dict(os.environ)
    e['PATH'] = str(Path(NODE).parent) + os.pathsep + e.get('PATH', '')
    e.update(MGOGO_GHN_ROOT=e.get('MGOGO_GHN_ROOT', '/Volumes/Drive/chimpbench/GHN'), MGOGO_DECIDE_PYTHON=e.get('MGOGO_DECIDE_PYTHON', '/Volumes/Drive/chimpbench/decide-env/bin/python'),
             HF_HOME=e.get('HF_HOME', '/Volumes/Drive/chimpbench/hf-cache'), HF_HUB_CACHE=e.get('HF_HUB_CACHE', '/Volumes/Drive/chimpbench/hf-cache/hub'), HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', R16_OUT=str(OUT))
    e.pop('MGOGO_DECIDE_SERVER', None)
    if LOCK and LOCK.token: e['MGOGO_MODEL_LOCK_TOKEN'] = LOCK.token
    if DRY: e['R16_DRY'] = '1'
    return e


# ---------------------------------------------------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------------------------------------------------

def step(name, command, hours, model=False, outputs=(), ok=(0,), env_extra=None):
    """Runs one step unless it is done. Returns its exit code (a code in `ok`, PAUSED, STOPPED); other codes raise."""
    record = chain_dir() / 'steps' / (name + '.json')
    state = read(record) if record.exists() else {'name': name, 'command': command, 'hours': hours, 'model': model, 'attempts': [], 'seconds': 0, 'done': False}
    if state['command'] != command: raise Refused(f'{name}: the command changed since this step began')
    if state.get('done'):
        if any(not Path(p).exists() or sha(p) != h for p, h in state.get('outputs', {}).items()): raise Refused(f'{name}: a finished output changed')
        log(f'SKIP {name}: done'); return state.get('code', 0)
    if model: wait_quiet()
    if LOCK: LOCK.write(name)
    env = environment(model)
    if env_extra: env.update(env_extra)
    logfile = chain_dir() / 'logs' / (name + '.log'); logfile.parent.mkdir(parents=True, exist_ok=True)
    cap = hours * 3600 * OPS['cap_factor']
    attempt = {'start': now(), 'cap_seconds': round(cap)}
    state['attempts'].append(attempt); atomic(record, state)
    log(f'START {name} (planned {hours:.2f} h, cap {cap / 3600:.2f} h){" [model]" if model else ""}')
    t0, proc, code = time.time(), None, None
    try:
        with logfile.open('a') as f, Monitor(name) if model else _null():
            proc = subprocess.Popen(command, cwd=ROOT, env=env, stdout=f, stderr=subprocess.STDOUT, start_new_session=True)
            try: code = proc.wait(timeout=cap)
            except subprocess.TimeoutExpired:
                stop_group(proc); code = 'cap'
    except Interrupted:
        if proc is not None: stop_group(proc)
        attempt.update(end=now(), code='interrupted'); state['seconds'] += time.time() - t0; atomic(record, state)
        raise
    attempt.update(end=now(), code=code); state['seconds'] += time.time() - t0
    if code == 'cap':
        atomic(record, state); raise Pause(f'{name}: past the wall cap of {cap / 3600:.2f} h (a hang guard); its checkpoint and journal stand')
    if code in ok:
        missing = [str(p) for p in outputs if not Path(p).exists()]
        if missing: atomic(record, state); raise RuntimeError(f'{name}: missing outputs {missing}')
        state.update(done=True, code=code, outputs={str(p): sha(p) for p in outputs if Path(p).is_file()})
        atomic(record, state); log(f'END {name} ({state["seconds"] / 60:.1f} min)')
        return code
    atomic(record, state)
    if code == PAUSED: raise Pause(f'{name} paused (see {logfile})')
    if code == STOPPED: return STOPPED
    if code == INTERRUPTED: raise Interrupted(f'{name} was interrupted')
    raise RuntimeError(f'{name}: exit {code}; see {logfile}')


class _null:
    def __enter__(self): return self
    def __exit__(self, *_): return False


def stop_group(proc):
    try: os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError: return
    try: proc.wait(timeout=30)
    except subprocess.TimeoutExpired:
        try: os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError: pass
        proc.wait()


def gate(name, *extra):
    """A registered mark, written by scripts/r16-report.ts and read here by machine."""
    step(f'report-{name}' + ''.join(f'-{x}' for x in extra), TSX + ['scripts/r16-report.ts', name.split('-')[0], str(OUT), *extra], 0.3, outputs=[OUT / 'marks' / f'{name}.json'])
    verdict = read(OUT / 'marks' / f'{name}.json')
    if not verdict.get('holds', False):
        if DRY: log(f'DRY {name}: the mark does not hold on dry data ({verdict.get("stop")}); the dry chain goes on'); return verdict
        raise ScientificStop(verdict.get('stop') or f'{name} does not hold')
    log(f'GATE {name}: holds')
    return verdict


def tsx(script, *args): return TSX + [f'scripts/{script}', *[str(a) for a in args]]


# ---------------------------------------------------------------------------------------------------------------------
# Identity and checks
# ---------------------------------------------------------------------------------------------------------------------

SOURCES = ['docs/staging/r16-prereg.md', 'scripts/r16.py', 'scripts/r16-collect.ts', 'scripts/r16-population.ts', 'scripts/r16-score.ts', 'scripts/r16-report.ts',
           'scripts/lib/r16-strata.ts', 'scripts/lib/r16-collect.ts', 'scripts/lib/r16-readouts.ts', 'scripts/lib/r16-run.ts', 'scripts/lib/r16-worker.ts', 'scripts/lib/r16-arms.ts',
           'scripts/lib/r16-assemble.ts', 'scripts/lib/r16-marks.ts', 'scripts/lib/r15-training.ts', 'server/r15-worker.ts', 'server/r15-scorer.py', 'training/decide_ft/train_r15.py',
           'training/decide_ft/train_r11.py', 'training/decide_ft/epochs.py', 'training/decide_ft/r15_preflight.py', 'docs/staging/integrator-kit/params/M6-W50.json']
def identity():
    if git('status', '--porcelain'): raise Refused('the checkout is not clean: the chain runs from a committed checkout')
    if not DRY and git('rev-parse', '--abbrev-ref', 'HEAD') != 'HEAD': raise Refused('model sessions run from a frozen detached checkout (git worktree add --detach)')
    if not Path(NODE).exists(): raise Refused(f'Node 22.22.3 is not at {NODE} (set R16_NODE)')
    return {'stage': 'R16', 'dry': DRY, 'commit': git('rev-parse', 'HEAD'), 'files': {p: sha(ROOT / p) for p in SOURCES}}
def pin():
    current, path = identity(), chain_dir() / 'identity.json'
    if path.exists() and read(path) != current: raise Refused('the checkout or a registered file changed since this chain began')
    atomic(path, current)
def older_chains():
    out = {}
    for p in [WT / 'bench-r14/artifacts/r14/state', WT / 'bench-r13/artifacts/queue/state', WT / 'bench-r11/artifacts/r11-chain/state', WT / 'bench-rw3/artifacts/rw3-chain/state']:
        if p.exists():
            s = p.read_text().strip()
            if s.lower() not in ('done', 'failed', 'stopped', 'scientific-stop', 'cancelled', 'complete'): out[str(p)] = s
    return out
def seed_provenance(seed):
    """§17.7: before the first tick of a test seed, no run folder of that seed outside this stage's output."""
    pat = re.compile(rf'(?<![0-9.]){seed}(?![0-9])')
    roots = [MAIN / 'artifacts'] + [p / 'artifacts' for p in WT.iterdir() if (p / 'artifacts').is_dir()] if WT.exists() else [MAIN / 'artifacts']
    for root in roots:
        if not root.exists(): continue
        for dirpath, dirnames, filenames in os.walk(root):
            if str(OUT) in dirpath or Path(dirpath).resolve() == OUT: dirnames[:] = []; continue
            if dirpath.count(os.sep) - str(root).count(os.sep) >= 5: dirnames[:] = []
            for name in dirnames + filenames:
                if pat.search(name) and not str(Path(dirpath, name)).startswith(str(OUT)): raise Refused(f'seed {seed} already has a run folder outside this stage: {Path(dirpath, name)}')
def session_start(model):
    pin()
    others = older_chains()
    if others: raise Refused(f'another chain is not finished: {others}')
    if model and not DRY:
        s = swap_mb()
        if s is not None and s > OPS['session_swap_mb']: raise Refused(f'swap in use is {s:.0f} MB, above {OPS["session_swap_mb"]} MB: restart the Mac before a session (R13\'s launch note)')


# ---------------------------------------------------------------------------------------------------------------------
# Sessions (§16)
# ---------------------------------------------------------------------------------------------------------------------

def burn():  # the dry chain's short burn-in and window
    return ['--burn-in', '2', '--days', '1', '--dry'] if DRY else []


def session0():
    session_start(False)
    if not DRY:
        step('k0-argmax', tsx('r10-night.ts', 'run', '--seed', 48, '--arm', 'argmax-gate', '--days', 2, '--out', OUT / 'k0' / 'argmax'), 0.3, outputs=[OUT / 'k0/argmax/run.json'])
        step('k0-r13card', tsx('r10-night.ts', 'replay', R13_RUNS / 'model-s3613', '--r7', OUT / 'k0' / 'card'), 0.5, outputs=[OUT / 'k0/card/P/s3613/p5b-s7-draw-1-s3613.json'])
        step('k1', tsx('r16-population.ts', 'k1', R13_RUNS / 'model-s3613', R13_RUNS / 'rules-s3613', '--out', OUT / 'marks' / 'k1.json'), 0.5, outputs=[OUT / 'marks/k1.json'])
        gate('k0')
    for seed in (48, 7, 21):
        d = OUT / 'collect' / f's{seed}'
        step(f'census-s{seed}', tsx('r16-collect.ts', 'census', '--seed', seed, '--out', d, *burn()), 0.3, outputs=[d / 'census.json'])
        step(f'select-s{seed}', tsx('r16-collect.ts', 'select', '--dir', d, '--plan', 'heldOut' if seed == 21 else 'zero', *(['--dry'] if DRY else [])), 0.1, outputs=[d / 'selection.jsonl'])
        step(f'labels-s{seed}', tsx('r16-collect.ts', 'labels', '--dir', d, *(['--dry'] if DRY else [])), 1.0, outputs=[d / 'labels' / 'd001.jsonl.meta.json'])
    if not DRY:
        for seed in (48, 7):
            step(f'hs-s{seed}', tsx('r16-population.ts', 'relabel-r14', R14_RUNS / f'learner-s{seed}', '--out', OUT / 'hs' / f's{seed}'), 0.5)
    step('assemble-zero', tsx('r16-collect.ts', 'assemble-zero', '--out', OUT, *(['--dry'] if DRY else [])), 0.2, outputs=[OUT / 'ft0/contexts/manifest.json', OUT / 'eval/hr.jsonl'])
    for seed in (48, 7):
        step(f'card-s{seed}', tsx('r16-population.ts', 'card', '--seed', seed, '--days', 1 if DRY else 20, '--out', OUT / 'card', *(['--burn-in', 2] if DRY else [])), 3.0, outputs=[OUT / 'card' / 'P' / f's{seed}' / 'half-4.json'])
    gate('d0')
    gate('readings')
    gate('cards')
    step('tokens-input-zero', tsx('r16-collect.ts', 'tokens-input', '--out', OUT, *(['--dry'] if DRY else [])), 0.1, outputs=[OUT / 'eval/token-packets.jsonl'])


def train(root, round_, seed):
    """A training; one operational retry from base into a fresh folder after a failure with no manifest (§8)."""
    name = f'r16-{round_}-s{seed}'
    folder = root / 'adapters' / name
    command = [PY, '-B', 'training/decide_ft/train_r15.py', '--root', str(root), '--seed', str(seed), '--run'] if not DRY else [NODE, 'scripts/lib/r16-fake-train.mjs', 'train', '--root', str(root), '--name', name]
    try:
        step(f'train-{round_}-s{seed}', command, 3.4, model=not DRY, outputs=[folder / 'manifest.json'])
    except RuntimeError as error:
        if (folder / 'manifest.json').exists(): raise
        aside = root / 'adapters-failed' / f'{name}-{int(time.time())}'
        if folder.exists(): aside.parent.mkdir(parents=True, exist_ok=True); folder.rename(aside)
        log(f'RETRY {name}: the training ended without its manifest ({error}); its folder is kept at {aside}; one more attempt from base')
        step(f'train-{round_}-s{seed}-retry', command, 3.4, model=not DRY, outputs=[folder / 'manifest.json'])


def score(root, adapter, sets):
    for s in sets:
        if s == 'hs' and ('hs-scoring' in CUTS or not (OUT / 'eval' / 'hs.jsonl').exists()): continue
        extra = ['--fake-python', FAKE_SCORER] if DRY else []
        tokens = ['--tokens', OUT / 'eval' / 'tokens.jsonl'] if (OUT / 'eval' / 'tokens.jsonl').exists() or not DRY else []
        step(f'score-{adapter}-{s}', tsx('r16-score.ts', '--root', root, '--adapter', adapter, '--in', OUT / 'eval' / f'{s}.jsonl', '--out', OUT / 'scores' / f'{adapter}-{s}.jsonl', *tokens, *extra), 0.8, model=not DRY, outputs=[OUT / 'scores' / f'{adapter}-{s}.jsonl.summary.json'])


def preflight(root, label):
    if DRY: step(f'preflight-{label}', [NODE, 'scripts/lib/r16-fake-train.mjs', 'preflight', '--root', str(root)], 0.1, outputs=[root / 'preflight/result.json'])
    else: step(f'preflight-{label}', [PY, '-B', 'training/decide_ft/r15_preflight.py', '--root', str(root), '--run'], 0.5, model=True, outputs=[root / 'preflight/result.json'])


def tokens(label):
    if DRY: return
    step(f'tokens-{label}', [str(ROOT / 'training/decide_ft/r4_py.sh'), 'r8_tokens.py', '--in', str(OUT / 'eval/token-packets.jsonl'), '--packets', 'r15', '--out', str(OUT / 'eval' / 'tokens.jsonl')], 0.3, model=True, outputs=[OUT / 'eval/tokens.jsonl'])


def rollout_days():
    if DRY: return 1
    if 'rollout-8' in CUTS: return 8
    return read(OUT / 'marks' / 'g2.json').get('speedRule', 10)


def run_args(label, seed, days, adapter, root, out, unit='P', certain=None):
    extra = ['--fake-python', FAKE_SCORER, '--burn-in', 2] if DRY else []
    return tsx('r16-population.ts', 'run', '--label', ('dry-' + label) if DRY else label, '--seed', seed, '--days', days, '--adapter', adapter, '--root', root, '--unit', unit, '--out', out,
               *(['--certain', certain] if certain else []), *extra)


def session1():
    session_start(True)
    ft0 = OUT / 'ft0'
    tokens('zero'); preflight(ft0, 'zero')
    train(ft0, 'zero', 7); score(ft0, 'r16-zero-s7', ['hr', 'hs']); gate('g2')
    train(ft0, 'zero', 11); score(ft0, 'r16-zero-s11', ['hr', 'hs']); gate('g3')
    days = rollout_days()
    for seed, adapter in ((48, 'r16-zero-s7'), (7, 'r16-zero-s11')):
        out = OUT / 'rollout' / f's{seed}'
        code = step(f'rollout-s{seed}', run_args(f'rollout-s{seed}', seed, days, adapter, ft0, out), days * 0.35 + 0.3, model=not DRY, outputs=[out / 'run.json'], ok=(0, STOPPED))
        if code == STOPPED: log(f'rollout-s{seed}: ended early by its stop check; its completed days are kept (usable from 5)')


def between1():
    session_start(False)
    for seed in (48, 7):
        out = OUT / 'rollout' / f's{seed}'
        step(f'learner-census-s{seed}', tsx('r16-population.ts', 'learner-census', out), 0.2, outputs=[out / 'census.jsonl'])
        step(f'learner-select-s{seed}', tsx('r16-collect.ts', 'learner-select', '--run', out, '--plan', 'one', *(['--dry'] if DRY else [])), 0.1, outputs=[out / 'selection.jsonl'])
        step(f'learner-labels-s{seed}', tsx('r16-population.ts', 'learner-labels', out, '--selection', out / 'selection.jsonl'), 1.0, outputs=[out / 'labels.jsonl'])
        step(f'learner-select-hl-s{seed}', tsx('r16-collect.ts', 'learner-select', '--run', out, '--plan', 'evalLearner', '--exclude', out / 'selection.jsonl', *(['--dry'] if DRY else [])), 0.1, outputs=[out / 'selection-hl.jsonl'])
        step(f'learner-labels-hl-s{seed}', tsx('r16-population.ts', 'learner-labels', out, '--selection', out / 'selection-hl.jsonl', '--labels-out', out / 'labels-hl.jsonl'), 1.0, outputs=[out / 'labels-hl.jsonl'])
        step(f'replay-rollout-s{seed}', tsx('r16-population.ts', 'replay', out, '--card', OUT / 'card'), 0.5, outputs=[out / 'replay.json'])
    gate('a0')
    step('assemble-one', tsx('r16-collect.ts', 'assemble-one', '--out', OUT, *(['--dry'] if DRY else [])), 0.2, outputs=[OUT / 'ft1/contexts/manifest.json'])
    step('tokens-input-one', tsx('r16-collect.ts', 'tokens-input', '--out', OUT, *(['--dry'] if DRY else [])), 0.1)


def session2():
    session_start(True)
    ft0, ft1 = OUT / 'ft0', OUT / 'ft1'
    tokens('one'); preflight(ft1, 'one')
    train(ft1, 'agg', 7); score(ft1, 'r16-agg-s7', ['hr', 'hs', 'hl']); score(ft0, 'r16-zero-s7', ['hl']); gate('g6')
    train(ft1, 'agg', 11); score(ft1, 'r16-agg-s11', ['hr', 'hs', 'hl']); score(ft0, 'r16-zero-s11', ['hl']); gate('g7')
    if DRY: return
    for seed in (3079, 3517):
        seed_provenance(seed)
        step(f'card-F-s{seed}', tsx('r16-population.ts', 'card', '--seed', seed, '--days', 5, '--unit', 'F', '--out', OUT / 'card', '--arms', ','.join([f'rules-{k}' for k in range(1, 9)] + ['random-a', 'random-b', 'mix10-a', 'mix10-b', 'mix20-a', 'mix20-b', 'mix30-a', 'mix30-b', 'rules-plain'])), 0.5, outputs=[OUT / 'card' / 'F' / f's{seed}' / 'rules-plain.json'])
    for adapter in ('r16-agg-s7', 'r16-agg-s11'):
        if adapter == 'r16-agg-s11' and 's11-focal' in CUTS: continue
        for seed in (3079, 3517):
            label, out = f'focal-{adapter[4:]}-s{seed}', OUT / 'focal' / f'focal-{adapter[4:]}-s{seed}'
            step(label, run_args(label, seed, 5, adapter, ft1, out, unit='F'), 0.4, model=True, outputs=[out / 'run.json'], ok=(0, STOPPED))
            step(f'replay-{label}', tsx('r16-population.ts', 'replay', out, '--card', OUT / 'card'), 0.2, outputs=[out / 'replay.json'])
    gate('g8')


def day2():
    session_start(False)
    for seed in (3701, 3187):
        if seed == 3187 and 's11-population-later' in CUTS: continue
        seed_provenance(seed)
        step(f'card-s{seed}', tsx('r16-population.ts', 'card', '--seed', seed, '--days', 20, '--out', OUT / 'card'), 3.0, outputs=[OUT / 'card' / 'P' / f's{seed}' / 'half-4.json'])
        gate_g9(seed)


def gate_g9(seed):
    step(f'report-g9-s{seed}', TSX + ['scripts/r16-report.ts', 'g9', str(OUT), str(seed)], 0.2, outputs=[OUT / 'marks' / f'g9-s{seed}.json'])
    v = read(OUT / 'marks' / f'g9-s{seed}.json')
    if not v.get('holds') and not DRY: raise ScientificStop(v.get('stop'))
    return v


def session3():
    session_start(True)
    ft1 = OUT / 'ft1'
    for seed, adapter in ((3701, 'r16-agg-s7'), (3187, 'r16-agg-s11')):
        if seed == 3187 and 's11-population-later' in CUTS: log('the s11 population is moved to a later session (a registered cut)'); break
        out = OUT / 'population' / f's{seed}'
        if not DRY: seed_provenance(seed) if not out.exists() else None
        code = step(f'population-s{seed}', run_args(f'population-s{seed}', seed, 20, adapter, ft1, out, certain=OUT / 'marks' / f'certain-s{seed}.json'), 20 * 0.35 + 0.3, model=True, outputs=[out / 'run.json'], ok=(0, STOPPED))
        step(f'replay-population-s{seed}', tsx('r16-population.ts', 'replay', out, '--card', OUT / 'card'), 1.0, outputs=[out / 'replay.json'])
        step(f'report-population-s{seed}', TSX + ['scripts/r16-report.ts', 'population', str(OUT), str(seed)], 0.2, outputs=[OUT / 'marks' / f'population-s{seed}.json'])
        v = read(OUT / 'marks' / f'population-s{seed}.json')
        log(f'POPULATION {seed}: {v.get("outcome")}')
        if not v.get('viable'): log('the s11 population does not run: one training of the recipe on one world is not viable (§12.1)'); break
    report()
    if any(read(p).get('viable') for p in (OUT / 'marks').glob('population-s*.json')):
        log('APP DEMO: one round-one adapter is viable. Run R15\'s registered browser proof with the better adapter (§14; the command is in docs/staging/r16-prereg.md §22).')


def report():
    step('report-numbers', TSX + ['scripts/r16-report.ts', 'numbers', str(OUT)], 0.1, outputs=[OUT / 'tables/r16-numbers.md'])


def status():
    print('state:', (chain_dir() / 'state').read_text().strip() if (chain_dir() / 'state').exists() else 'not started')
    if (chain_dir() / 'state-note').exists(): print('note:', (chain_dir() / 'state-note').read_text().strip())
    steps = [read(p) for p in (chain_dir() / 'steps').glob('*.json')] if (chain_dir() / 'steps').exists() else []
    print('model hours charged:', round(sum(s.get('seconds', 0) for s in steps if s.get('model')) / 3600, 2), '; steps done:', sum(1 for s in steps if s.get('done')), 'of', len(steps))
    if (chain_dir() / 'status.log').exists(): print('\n'.join((chain_dir() / 'status.log').read_text().splitlines()[-15:]))


def dry():
    """The whole path on development seeds against fake workers, no model (§21): collection, fake trainings and scoring
    through the real serving worker with a fake scorer process, roll-outs with an injected stall and failed warm-ups, the
    learner labels, round one, and a kill and resume of a run."""
    global OUT, DRY
    OUT, DRY = OUT / 'dry', True
    OUT.mkdir(parents=True, exist_ok=True)
    session0(); session1(); between1(); session2()
    # a population day through the serving worker with faults: the first two warm-ups never answer (the third holds), and
    # the call numbered 40 hangs, then its retry on a fresh worker (41) hangs too, so the rules settle that ask
    out = OUT / 'population' / 'faults'
    faults = {'state': str(OUT / 'faults-state.json'), 'failWarmups': 2, 'stallCalls': [40, 41]}
    step('dry-faults-run', tsx('r16-population.ts', 'run', '--label', 'dry-faults', '--seed', 48, '--days', 1, '--burn-in', 2, '--adapter', 'r16-agg-s7', '--root', OUT / 'ft1', '--out', out, '--fake-python', FAKE_SCORER,
         '--ops', json.dumps({'callMs': 3000, 'warmMs': 4000, 'coolMs': 500})), 0.2, outputs=[out / 'run.json'], env_extra={'R16_FAKE_FAULTS': json.dumps(faults)})
    step('dry-faults-replay', tsx('r16-population.ts', 'replay', out), 0.1, outputs=[out / 'replay.json'])
    log('DRY done: ' + json.dumps({'faults': read(out / 'run.json').get('supervisor')}))


SESSIONS = {'session0': session0, 'session1': session1, 'between1': between1, 'session2': session2, 'day2': day2, 'session3': session3, 'report': report, 'dry': dry}


def main():
    global LOCK
    if len(sys.argv) < 2 or sys.argv[1] not in [*SESSIONS, 'check', 'status', 'publish']: print(__doc__); return 2
    cmd = sys.argv[1]
    if cmd == 'status': status(); return 0
    if cmd == 'check':
        print(json.dumps(identity(), indent=1)); print('older chains not finished:', older_chains()); print('quiet:', quiet_refusal() or 'yes'); print('swap MB:', swap_mb())
        print('lock:', LOCK_PATH.read_text() if LOCK_PATH.exists() else 'free'); return 0
    if cmd == 'publish':
        dest = Path(sys.argv[2]).resolve(); dest.mkdir(parents=True, exist_ok=True)
        for f in (OUT / 'tables').glob('*.md'): shutil.copy(f, dest / ('r16-' + f.name if not f.name.startswith('r16-') else f.name))
        print('copied the tables to', dest); return 0
    out_now = OUT / 'dry' if cmd == 'dry' else OUT
    LOCK = ChainLock(LOCK_PATH, out_now)
    def on_signal(signum, _frame): raise Interrupted(f'signal {signal.Signals(signum).name}')
    for s in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP): signal.signal(s, on_signal)
    caffeinate = None
    try:
        LOCK.acquire(cmd)
        if cmd != 'dry' and Path('/usr/bin/caffeinate').exists(): caffeinate = subprocess.Popen(['/usr/bin/caffeinate', '-i', '-m', '-w', str(os.getpid())])
        set_state('running'); log(f'{cmd} START (lock token {LOCK.token[:8]})')
        SESSIONS[cmd]()
        set_state('done' if cmd in ('session3', 'report', 'dry') else f'{cmd}-done'); log(f'{cmd} DONE')
        return 0
    except Pause as p:
        set_state('paused', str(p)); log(f'PAUSED: {p}. Run the same session again to resume.'); return PAUSED
    except ScientificStop as s:
        set_state('scientific-stop', str(s)); log(f'SCIENTIFIC STOP: {s}. No further model step of this stage runs.'); return STOPPED
    except Interrupted as i:
        set_state('interrupted', str(i)); log(f'INTERRUPTED: {i}'); return INTERRUPTED
    except Refused as r:
        log(f'REFUSED: {r}'); return 2
    except Exception as e:
        set_state('failed', repr(e)); log(f'FAILED: {e!r}'); raise
    finally:
        for s in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP): signal.signal(s, signal.SIG_DFL)
        if caffeinate: caffeinate.terminate()
        LOCK.release()


if __name__ == '__main__':
    sys.exit(main())
