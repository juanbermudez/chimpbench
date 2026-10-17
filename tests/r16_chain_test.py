"""Stage R16's chain without a model: the lock under a flock, stale locks, release on every exit, steps that resume,
pause and stop, and the trainer's epoch rule (off by default). Standard library only."""
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Lock(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        os.environ['R16_MAIN'] = str(self.root)
        os.environ['R16_OUT'] = str(self.root / 'out')
        self.chain = load(ROOT / 'scripts/r16.py', 'r16_chain_lock')

    def tearDown(self):
        os.environ.pop('R16_MAIN', None); os.environ.pop('R16_OUT', None)
        self.temp.cleanup()

    def test_acquire_names_the_chain_and_release_removes_only_its_own(self):
        lock = self.chain.ChainLock(self.root / 'artifacts/r14-chain.lock', self.root / 'out')
        lock.acquire('step-a')
        owner = json.loads((self.root / 'artifacts/r14-chain.lock').read_text())
        self.assertEqual(owner['stage'], 'R16-chain'); self.assertEqual(owner['pid'], os.getpid()); self.assertEqual(owner['token'], lock.token); self.assertEqual(owner['step'], 'step-a')
        second = self.chain.ChainLock(self.root / 'artifacts/r14-chain.lock', self.root / 'out')
        with self.assertRaises(self.chain.Refused): second.acquire()
        lock.release()
        self.assertFalse((self.root / 'artifacts/r14-chain.lock').exists())

    def test_a_legacy_lock_of_a_live_process_is_refused_and_a_dead_one_is_moved_aside(self):
        path = self.root / 'artifacts/r14-chain.lock'; path.parent.mkdir(parents=True)
        path.write_text(json.dumps({'pid': os.getpid(), 'stage': 'R15-app', 'token': 'x'}))
        with self.assertRaises(self.chain.Refused): self.chain.ChainLock(path, self.root / 'out').acquire()
        dead = subprocess.Popen([sys.executable, '-c', 'pass']); dead.wait()
        path.write_text(json.dumps({'pid': dead.pid, 'stage': 'R14', 'token': 'y'}))
        lock = self.chain.ChainLock(path, self.root / 'out'); lock.acquire()
        self.assertEqual(json.loads(path.read_text())['token'], lock.token)
        self.assertEqual(len(list((self.root / 'out/locks').glob('stale-*.json'))), 1)
        lock.release()

    def test_the_lock_goes_on_sigterm_sighup_and_sigint_and_the_flock_dies_with_the_process(self):
        script = textwrap.dedent(f'''
            import os, sys, time
            os.environ['R16_MAIN'] = {str(self.root)!r}; os.environ['R16_OUT'] = {str(self.root / 'out')!r}
            import importlib.util
            spec = importlib.util.spec_from_file_location('c', {str(ROOT / 'scripts/r16.py')!r}); c = importlib.util.module_from_spec(spec); spec.loader.exec_module(c)
            def session(): print('ready', flush=True); time.sleep(60)
            c.SESSIONS['report'] = session
            sys.argv = ['r16.py', 'report']
            sys.exit(c.main())
        ''')
        path = self.root / 'artifacts/r14-chain.lock'
        def ready(p):
            for line in p.stdout:
                if line.strip() == 'ready': return True
            return False
        for sig in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
            p = subprocess.Popen([sys.executable, '-c', script], stdout=subprocess.PIPE, text=True)
            self.assertTrue(ready(p)); self.assertTrue(path.exists())
            p.send_signal(sig); p.stdout.read(); code = p.wait(timeout=30); p.stdout.close()
            self.assertEqual(code, 130, sig); self.assertFalse(path.exists(), f'the lock stayed after {sig}')
        p = subprocess.Popen([sys.executable, '-c', script], stdout=subprocess.PIPE, text=True)
        self.assertTrue(ready(p)); p.kill(); p.wait(); p.stdout.close()
        self.assertTrue(path.exists(), 'SIGKILL leaves the file')
        lock = self.chain.ChainLock(path, self.root / 'out'); lock.acquire()  # its flock died with it: stale, moved aside
        lock.release()


class Steps(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
        os.environ['R16_MAIN'] = str(self.root); os.environ['R16_OUT'] = str(self.root / 'out')
        self.chain = load(ROOT / 'scripts/r16.py', 'r16_chain_steps')
        self.chain.DRY = True

    def tearDown(self):
        os.environ.pop('R16_MAIN', None); os.environ.pop('R16_OUT', None); self.temp.cleanup()

    def test_a_finished_step_is_not_run_again_and_a_changed_output_is_refused(self):
        out = self.root / 'o.txt'
        code = self.chain.step('w', [sys.executable, '-c', f'open({str(out)!r}, "w").write("1")'], 0.01, outputs=[out])
        self.assertEqual(code, 0)
        self.assertEqual(self.chain.step('w', [sys.executable, '-c', f'open({str(out)!r}, "w").write("1")'], 0.01, outputs=[out]), 0)
        out.write_text('2')
        with self.assertRaises(self.chain.Refused): self.chain.step('w', [sys.executable, '-c', 'pass'], 0.01, outputs=[out])

    def test_pause_stop_failure_and_the_hang_guard(self):
        with self.assertRaises(self.chain.Pause): self.chain.step('p', [sys.executable, '-c', 'raise SystemExit(75)'], 0.01)
        self.assertEqual(self.chain.step('s', [sys.executable, '-c', 'raise SystemExit(3)'], 0.01, ok=(0, 3)), 3)
        with self.assertRaises(RuntimeError): self.chain.step('f', [sys.executable, '-c', 'raise SystemExit(1)'], 0.01)
        t0 = time.time()
        with self.assertRaises(self.chain.Pause): self.chain.step('h', [sys.executable, '-c', 'import time; time.sleep(30)'], 0.5 / 3600)
        self.assertLess(time.time() - t0, 20)

    def test_only_the_sessions_first_serving_step_holds_its_warm_up_to_one_attempt(self):
        self.chain.wait_quiet = lambda: None
        seen = self.root / 'seen.txt'
        probe = f'import os; open({str(seen)!r}, "a").write(os.environ.get("R16_SESSION_FIRST", "-") + "\\n")'
        self.chain.step('t', [sys.executable, '-c', probe, 'training/decide_ft/train_r15.py'], 0.01, model=True)  # a training warms no serving worker
        self.chain.step('a', [sys.executable, '-c', probe, 'scripts/r16-score.ts'], 0.01, model=True)
        self.chain.step('b', [sys.executable, '-c', probe, 'scripts/r16-population.ts'], 0.01, model=True)
        self.assertEqual(seen.read_text().split(), ['-', '1', '-'])

    def test_a_gate_that_does_not_hold_is_a_scientific_stop_outside_a_dry_run(self):
        marks = self.root / 'out' / 'marks'; marks.mkdir(parents=True)
        (marks / 'g2.json').write_text(json.dumps({'holds': False, 'stop': 'g2: Z2'}))
        self.chain.TSX = [sys.executable, '-c', 'pass', '--']
        self.chain.DRY = False
        with self.assertRaises(self.chain.ScientificStop): self.chain.gate('g2')


class Epochs(unittest.TestCase):
    def test_without_the_field_every_row_is_shown_every_epoch_as_before(self):
        epochs = load(ROOT / 'training/decide_ft/epochs.py', 'epochs')
        for e in range(3): self.assertTrue(epochs.shown_in(None, e))
        self.assertTrue(epochs.shown_in(1, 1)); self.assertFalse(epochs.shown_in(1, 2))
        self.assertTrue(epochs.shown_in([0, 2], 2)); self.assertFalse(epochs.shown_in([0, 2], 1))
        self.assertEqual(epochs.rows_seen([None, [1], [2], 0], 0), 2)
        self.assertEqual(epochs.rows_seen([None, [1], [2], 0], 2), 4)

    def test_the_trainer_uses_the_rule_for_its_schedule_and_its_epochs(self):
        text = (ROOT / 'training/decide_ft/train_r11.py').read_text()
        self.assertIn('per_epoch = [sum(1 for d in data if shown_in(d[6], e))', text)
        self.assertIn('shown = [d for d in data if shown_in(d[6], epoch)]', text)
        self.assertNotIn('d[6] is None or d[6] == ', text)


if __name__ == '__main__':
    unittest.main()
