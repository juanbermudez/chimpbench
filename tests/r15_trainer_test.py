"""No-model checks of the command boundary and active-run exclusion."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch, MagicMock

SCRIPT = Path(__file__).resolve().parents[1] / 'training/decide_ft/train_r15.py'
spec = importlib.util.spec_from_file_location('r15_trainer', SCRIPT)
trainer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trainer)

class TrainerBoundary(unittest.TestCase):
    def fixture(self, root):
        folder = root / 'contexts'; folder.mkdir()
        files = [folder / 'train.jsonl', folder / 'dev.jsonl']
        for p in files: p.write_text('{"phase":"kind"}\n{"phase":"target"}\n')
        manifest = {'stage': 'R15', 'packetVersion': trainer.VERSION, 'kindTeacher': 'r11-original-menu-kind-marginal-v1',
                    'targetTeacher': 'counterfactual-resource-valuation-v1', 'labels': 'soft', 'counts': {'train': 2, 'dev': 2}, 'phaseCounts': {s: {'kind': 1, 'target': 1} for s in ('train', 'dev')},
                    'outputs': {str(p): trainer.sha(p) for p in files}}
        (folder / 'manifest.json').write_text(json.dumps(manifest))
    def test_preparation_prints_new_adapter_command_without_loading(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve(); self.fixture(root)
            result = subprocess.run([sys.executable, '-B', str(SCRIPT), '--root', str(root)], text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('r15-resources-s7', result.stdout)
            self.assertIn('train_r11.py', result.stdout)
            self.assertFalse((root / 'adapters').exists())
            (root / 'contexts/train.jsonl').write_text('changed')
            with self.assertRaisesRegex(ValueError, 'changed'): trainer.validate(root)
    def test_active_r14_refuses_before_process_or_model_access(self):
        with patch.object(Path, 'exists', return_value=True), patch.object(subprocess, 'check_output', side_effect=AssertionError('must not reach process scan')):
            with self.assertRaisesRegex(ValueError, 'R14 is active'): trainer.idle()
    def test_wrong_manifest_cannot_prepare(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve(); self.fixture(root)
            path = root / 'contexts/manifest.json'; data = json.loads(path.read_text()); data['stage'] = 'R11'; path.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'incompatible'): trainer.validate(root)

    def test_missing_target_phase_refuses_even_with_correct_file_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve(); self.fixture(root)
            data = root / 'contexts/train.jsonl'; data.write_text('{"phase":"kind"}\n')
            path = root / 'contexts/manifest.json'; manifest = json.loads(path.read_text()); manifest['outputs'][str(data)] = trainer.sha(data)
            path.write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, 'kind and target'): trainer.validate(root)
    def test_other_training_families_refuse_and_self_is_excluded(self):
        for name in ('train_r4', 'train_rw3', 'train_r15', 'r14'):
            with patch.object(Path, 'exists', return_value=False), patch.object(subprocess, 'check_output', return_value=f'999999 python /tmp/{name}.py --run'):
                with self.assertRaisesRegex(ValueError, 'another model'): trainer.idle()
        with patch.object(Path, 'exists', return_value=False), patch.object(subprocess, 'check_output', return_value=f'{trainer.os.getpid()} python train_r15.py --run'):
            trainer.idle()
    def test_idle_rechecked_under_shared_lock_and_refusal_releases_only_owned_lock(self):
        with tempfile.TemporaryDirectory() as temp:
            lock = Path(temp) / 'r14-chain.lock'
            with patch.object(trainer, 'MODEL_LOCK', lock), patch.object(trainer, 'idle', side_effect=[None, ValueError('busy')]) as idle, patch.object(subprocess, 'Popen') as launch:
                with self.assertRaisesRegex(ValueError, 'busy'): trainer.run_guarded(['fixture'], Path(temp))
                self.assertEqual(idle.call_args_list[-1].kwargs, {'own_lock': True})
                launch.assert_not_called(); self.assertFalse(lock.exists())
            lock.write_text('another owner')
            with patch.object(trainer, 'MODEL_LOCK', lock), patch.object(trainer, 'idle'):
                with self.assertRaises(FileExistsError): trainer.run_guarded(['fixture'], Path(temp))
                self.assertEqual(lock.read_text(), 'another owner')
    def test_timeout_stops_entire_process_group(self):
        with tempfile.TemporaryDirectory() as temp:
            process = MagicMock(pid=999999); process.wait.side_effect = [subprocess.TimeoutExpired('fixture', 21600), 0]
            with patch.object(trainer, 'MODEL_LOCK', Path(temp) / 'lock'), patch.object(trainer, 'idle'), patch.object(subprocess, 'Popen', return_value=process) as launch, patch.object(trainer.os, 'killpg') as kill:
                with self.assertRaisesRegex(ValueError, 'six-hour'): trainer.run_guarded(['fixture'], Path(temp))
                self.assertTrue(launch.call_args.kwargs['start_new_session'])
                self.assertEqual(process.wait.call_args_list[0].kwargs, {'timeout': 21600})
                kill.assert_called_once_with(999999, trainer.signal.SIGTERM)
                self.assertFalse((Path(temp) / 'lock').exists())

if __name__ == '__main__': unittest.main()
