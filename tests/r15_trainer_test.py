"""No-model checks of the command boundary and active-run exclusion."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'training/decide_ft/train_r15.py'
spec = importlib.util.spec_from_file_location('r15_trainer', SCRIPT)
trainer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trainer)

class TrainerBoundary(unittest.TestCase):
    def fixture(self, root):
        folder = root / 'contexts'; folder.mkdir()
        files = [folder / 'train.jsonl', folder / 'dev.jsonl']
        for p in files: p.write_text('{"fixture":"no model loaded"}\n')
        manifest = {'stage': 'R15', 'packetVersion': trainer.VERSION, 'kindTeacher': 'r11-original-menu-kind-marginal-v1',
                    'targetTeacher': 'counterfactual-resource-valuation-v1', 'labels': 'soft', 'counts': {'train': 1, 'dev': 1},
                    'outputs': {str(p): trainer.sha(p) for p in files}}
        (folder / 'manifest.json').write_text(json.dumps(manifest))
    def test_preparation_prints_new_adapter_command_without_loading(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); self.fixture(root)
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
            root = Path(temp); self.fixture(root)
            path = root / 'contexts/manifest.json'; data = json.loads(path.read_text()); data['stage'] = 'R11'; path.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'incompatible'): trainer.validate(root)

if __name__ == '__main__': unittest.main()
