"""Pure fixture checks; no tokenizer, torch import or model load."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

FOLDER = Path(__file__).resolve().parents[1] / 'training/decide_ft'
sys.path.insert(0, str(FOLDER))
import r15_preflight as preflight
import train_r15 as trainer


class Preflight(unittest.TestCase):
    def fixture(self, root):
        (root / 'contexts').mkdir(); (root / 'preflight').mkdir()
        rows = [{'id': 'k', 'phase': 'kind'}, {'id': 't', 'phase': 'target'}]
        for split in ('train', 'dev'):
            (root / f'contexts/{split}.jsonl').write_text('\n'.join(json.dumps(r) for r in rows))
        (root / 'contexts/manifest.json').write_text(json.dumps({'counts': {'train': 2, 'dev': 2}}))
        parity = [{'id': row['id'], 'variant': variant, 'same_ids': True, 'fp32': [.4, .6], 'bf16': [.4, .6], 'half': [.4, .6],
                   'fp32_gap': 0, 'half_gap': 0, 'fp32_half_gap': 0, 'bf16_half_gap': 0}
                  for row in rows for variant in ('original', 'permuted')]
        preflight.write_new(root / 'preflight/packets.json', {'passed': True, 'rows': rows * 2})
        preflight.write_new(root / 'preflight/tokens.json', {'count': 8, 'max': 1280, 'over_limit': 0, 'rows': [{'tokens': 1280}] * 8})
        preflight.write_new(root / 'preflight/parity.json', {'rows': parity})
        self.receipt(root)
    def receipt(self, root):
        result = {'schema': preflight.SCHEMA, 'passed': True, 'limits': preflight.LIMITS,
                  'identity': {'dataset': preflight.dataset_identity(root), 'implementations': {'fixture': 'hash'}, 'runtime': {'fixture': 'runtime'}},
                  'outputs': {name: preflight.sha(root / 'preflight' / name) for name in ('packets.json', 'tokens.json', 'parity.json')}}
        (root / 'preflight/result.json').write_text(json.dumps(result))
    def test_complete_receipt_and_missing_stale_failed_or_changed_evidence(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(preflight, 'implementation_identity', return_value={'fixture': 'hash'}), patch.object(preflight, 'runtime_identity', return_value={'fixture': 'runtime'}):
            root = Path(temp); self.fixture(root)
            self.assertTrue(preflight.validate_preflight(root)['passed'])
            result = root / 'preflight/result.json'; saved = result.read_text(); result.unlink()
            with self.assertRaises(FileNotFoundError): preflight.validate_preflight(root)
            data = json.loads(saved); data['passed'] = False; result.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'failing'): preflight.validate_preflight(root)
            result.write_text(saved)
            with patch.object(preflight, 'implementation_identity', return_value={'changed': 'source'}):
                with self.assertRaisesRegex(ValueError, 'stale'): preflight.validate_preflight(root)
            (root / 'contexts/train.jsonl').write_text('changed')
            with self.assertRaisesRegex(ValueError, 'stale'): preflight.validate_preflight(root)
    def test_token_overflow_and_numerical_failure_refuse_even_rehashed(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(preflight, 'implementation_identity', return_value={'fixture': 'hash'}), patch.object(preflight, 'runtime_identity', return_value={'fixture': 'runtime'}):
            root = Path(temp); self.fixture(root)
            path = root / 'preflight/tokens.json'; data = preflight.read(path); data['max'] = 1281; path.write_text(json.dumps(data)); self.receipt(root)
            with self.assertRaisesRegex(ValueError, 'token coverage'): preflight.validate_preflight(root)
            data['max'] = 1280; path.write_text(json.dumps(data))
            path = root / 'preflight/parity.json'; data = preflight.read(path); data['rows'][0]['half_gap'] = .01; path.write_text(json.dumps(data)); self.receipt(root)
            with self.assertRaisesRegex(ValueError, 'numerical'): preflight.validate_preflight(root)
    def test_probability_guards_and_balanced_fixture(self):
        self.assertEqual(preflight.probability_gap([.4, .6], [.41, .59]), .010000000000000009)
        for values in ([float('nan'), 1], [.2, .3], [-.1, 1.1]):
            with self.assertRaises(ValueError): preflight.probability_gap(values, [.4, .6])
        rows = [{'id': str(i), 'phase': phase} for phase in ('kind', 'target') for i in range(8)]
        chosen = preflight.fixture_rows(rows)
        self.assertEqual(len(chosen), 12); self.assertEqual(chosen, preflight.fixture_rows(list(reversed(rows))))
        with self.assertRaisesRegex(ValueError, 'both'): preflight.fixture_rows([{'id': 'x', 'phase': 'kind'}])
    def test_training_checks_preflight_inside_lock_before_launch(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with patch.object(trainer, 'MODEL_LOCK', root / 'lock'), patch.object(trainer, 'idle'), patch.object(trainer.subprocess, 'Popen') as launch:
                def check():
                    self.assertTrue((root / 'lock').exists())
                    raise ValueError('missing preflight')
                with self.assertRaisesRegex(ValueError, 'preflight'): trainer.run_guarded(['fixture'], root, before_launch=check)
                launch.assert_not_called(); self.assertFalse((root / 'lock').exists())


if __name__ == '__main__': unittest.main()
