"""Stage R16 amendment 25 (docs/staging/r16-prereg.md §25): R15's preflight worker accepts the chain's lock exactly as the
trainer does, and its own supervisor's lock as before; a wrong token is refused. No model, no tokenizer. Standard library."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'training' / 'decide_ft'))


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PreflightLock(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.lock = Path(self.temp.name) / 'r14-chain.lock'
        self.worker = load(ROOT / 'training/decide_ft/r15_preflight_worker.py', 'r15_preflight_worker_under_test')
        import train_r15
        self.train = train_r15
        self.saved = train_r15.MODEL_LOCK
        train_r15.MODEL_LOCK = self.lock
        self.worker.MODEL_LOCK = self.lock
        self.env = os.environ.pop('MGOGO_MODEL_LOCK_TOKEN', None)

    def tearDown(self):
        self.train.MODEL_LOCK = self.saved
        os.environ.pop('MGOGO_MODEL_LOCK_TOKEN', None)
        if self.env is not None: os.environ['MGOGO_MODEL_LOCK_TOKEN'] = self.env
        self.temp.cleanup()

    def write(self, owner): self.lock.write_text(json.dumps(owner))

    def test_own_supervisor_lock_as_before(self):
        root = Path('/x/ft0')
        owner = {'pid': os.getppid(), 'stage': 'R15', 'root': str(root), 'purpose': 'preflight'}
        self.write(owner)
        self.assertTrue(self.worker.supervisor_lock_ok(owner, root))
        self.assertFalse(self.worker.supervisor_lock_ok({**owner, 'purpose': 'training'}, root))
        self.assertFalse(self.worker.supervisor_lock_ok({**owner, 'pid': os.getppid() + 999999}, root))
        self.assertFalse(self.worker.supervisor_lock_ok(owner, Path('/x/other')))

    def test_the_chains_lock_with_its_token(self):
        owner = {'pid': os.getppid(), 'stage': 'R16-chain', 'token': 'tok-1', 'step': 'preflight-zero'}
        self.write(owner)
        os.environ['MGOGO_MODEL_LOCK_TOKEN'] = 'tok-1'
        self.assertTrue(self.worker.supervisor_lock_ok(owner, Path('/x/ft0')))

    def test_a_wrong_token_or_stage_is_refused(self):
        self.write({'pid': os.getppid(), 'stage': 'R16-chain', 'token': 'tok-1'})
        os.environ['MGOGO_MODEL_LOCK_TOKEN'] = 'tok-2'
        with self.assertRaises(ValueError): self.worker.supervisor_lock_ok({}, Path('/x/ft0'))
        self.write({'pid': os.getppid(), 'stage': 'R15-app', 'token': 'tok-2'})
        with self.assertRaises(ValueError): self.worker.supervisor_lock_ok({}, Path('/x/ft0'))

    def test_the_chain_pid_must_be_an_ancestor(self):
        self.write({'pid': 1, 'stage': 'R16-chain', 'token': 'tok-1'})
        os.environ['MGOGO_MODEL_LOCK_TOKEN'] = 'tok-1'
        with self.assertRaises(ValueError): self.worker.supervisor_lock_ok({}, Path('/x/ft0'))


if __name__ == '__main__':
    unittest.main()
