"""Exercise the actual R14 data/report/identity functions without loading a model."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('r14', Path(__file__).resolve().parents[1] / 'scripts/r14.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)

class Pipeline(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = r.OUT
        r.OUT = Path(self.temp.name); (r.OUT / 'ft/scores').mkdir(parents=True)
    def tearDown(self):
        r.OUT = self.old; self.temp.cleanup()
    def fixture(self, harm=False):
        data, old, new = [], [], []
        for group in ('original', 'dayNest', 'aloneDusk', 'dawnGuard', 'companyDuskGuard'):
            for i in range(40):
                nestq = .0 if group == 'dayNest' else 1.0
                p0 = .9 if group != 'dayNest' else .8
                p1 = .95 if group != 'dayNest' else .1
                if harm and group == 'companyDuskGuard': p1 = .8
                state = {'nest': True, 'day': group == 'dayNest', 'dawn': group == 'dawnGuard', 'dusk': group in ('aloneDusk', 'companyDuskGuard'), 'dark': False, 'alone': group == 'aloneDusk', 'companyNest': group == 'companyDuskGuard'}
                ident = f'{group}-{i}'
                packet = {'state': {}, 'questions': {'action': {'criteria': {'c0': 'Stay', 'c1': 'Leave'}}}}
                data.append({'id': ident, 'chimpId': i % 10, 'source': 'original' if group == 'original' else 'learner', 'stratum': group,
                             'state': state, 'selectedVia': 'plain', 'packet': packet, 'soft': {'c0': nestq, 'c1': 1-nestq}, 'carryOn': 0,
                             'options': [{'action': 'nest', 'family': 'nest'}, {'action': 'travel', 'family': 'food-trip'}]})
                old.append({'id': ident, 'probs': [p0, 1-p0]}); new.append({'id': ident, 'probs': [p1, 1-p1]})
        r.write_rows(r.OUT / 'ft/eval.jsonl', data)
        r.write_rows(r.OUT / 'ft/scores/r11-p5b-s7.jsonl', old)
        r.write_rows(r.OUT / 'ft/scores/r14-p5b-s7.jsonl', new)
    def test_harm_is_a_real_stop(self):
        self.fixture(); self.assertTrue(r.reading(7)['proceed'])
        self.fixture(harm=True); result = r.reading(7)
        self.assertFalse(result['proceed']); self.assertFalse(result['guards']['companyDuskGuard'])
    def test_insufficient_exposure_is_not_a_pass(self):
        self.fixture()
        path = r.OUT / 'ft/eval.jsonl'; data = r.rows(path)
        for row in data: row['chimpId'] = 1
        r.write_rows(path, data)
        self.assertFalse(r.reading(7)['proceed'])
    def test_reordered_or_invalid_probabilities_rejected(self):
        self.fixture(); path = r.OUT / 'ft/scores/r14-p5b-s7.jsonl'
        scores = r.rows(path); r.write_rows(path, scores[::-1])
        with self.assertRaises(RuntimeError): r.reading(7)
        scores[0]['probs'] = [2, -1]; r.write_rows(path, scores)
        with self.assertRaises(RuntimeError): r.reading(7)
    def test_weights_without_manifest_or_changed_bytes_refused(self):
        root = r.OUT / 'ft'; folder = root / 'adapters/r14-p5b-s7'; folder.mkdir(parents=True)
        weights = folder / 'adapter_model.safetensors'; weights.write_bytes(b'fake weights, never loaded')
        with self.assertRaises(RuntimeError): r.adapter(root, 'r14-p5b-s7')
        r.atomic(folder / 'manifest.json', {'adapter': 'r14-p5b-s7', 'hyperparameters': {**r.RECIPE, 'seed': 7}, 'base_model': 'fastino/GLiNER2.5-Decide', 'base_revision': '7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6', 'adapter_sha256': r.sha(weights)})
        self.assertEqual(r.adapter(root, 'r14-p5b-s7')['weights'], r.sha(weights))
        manifest = r.read(folder / 'manifest.json'); manifest['hyperparameters']['seed'] = 11
        r.atomic(folder / 'manifest.json', manifest)
        with self.assertRaisesRegex(RuntimeError, 'recipe mismatch'): r.adapter(root, 'r14-p5b-s7')
        manifest['hyperparameters']['seed'] = 7; r.atomic(folder / 'manifest.json', manifest)
        weights.write_bytes(b'changed')
        with self.assertRaises(RuntimeError): r.adapter(root, 'r14-p5b-s7')
    def test_assembly_preserves_prefix_and_rejects_test_leak(self):
        original_source = r.SOURCE; r.SOURCE = r.OUT / 'source'
        try:
            source_row = {'id': 'original-train', 'packet': {}}
            r.write_rows(r.SOURCE / 'p5b/contexts/train.jsonl', [source_row])
            r.write_rows(r.SOURCE / 'p5b/contexts/dev.jsonl', [source_row])
            packet = {'state': {}}
            r.write_rows(r.SOURCE / 'eval/all.jsonl', [{'id': str(i), 'packets': {'p5b': packet}} for i in range(1500)])
            r.write_rows(r.SOURCE / 'eval/test.jsonl', [{'id': str(i), 'label': 'fresh', 'soft': {'c0': 1}} for i in range(1500)])
            for seed in (48, 7, 21):
                for kind in ('learner', 'rules'):
                    path = r.OUT / 'parts' / f'{kind}-s{seed}.jsonl'
                    r.write_rows(path, []); r.atomic(str(path) + '.meta.json', {'dry': True})
            path = r.OUT / 'parts/learner-s21.jsonl'
            r.write_rows(path, [{'id': 'leak', 'seed': 21, 'split': 'train'}])
            with self.assertRaisesRegex(RuntimeError, 'test leak'): r.assemble()
            r.write_rows(path, []); r.assemble()
            self.assertEqual((r.OUT / 'ft/contexts/train.jsonl').read_bytes(), (r.SOURCE / 'p5b/contexts/train.jsonl').read_bytes())
            self.assertEqual(len(r.rows(r.OUT / 'ft/eval.jsonl')), 1500)
            r.atomic(str(path) + '.meta.json', {'changed': True})
            with self.assertRaisesRegex(RuntimeError, 'inputs changed'): r.assemble()
        finally: r.SOURCE = original_source
    def test_completed_step_checks_output_before_skipping(self):
        output = r.OUT / 'small.txt'
        command = [__import__('sys').executable, '-c', f'from pathlib import Path; Path({str(output)!r}).write_text("ok")']
        r.step('small', command, .01, outputs=[output]); r.step('small', command, .01, outputs=[output])
        output.write_text('changed')
        with self.assertRaises(RuntimeError): r.step('small', command, .01, outputs=[output])
    def test_stopped_rules_world_cannot_resume(self):
        args = ['--seed', '48', '--arm', 'rules', '--packet', 'p5b', '--days', '10']
        reg = {'seed': 48, 'arm': 'rules', 'packetName': 'p5b', 'daysAsked': 10, 'burnInDays': 30, 'profile': 'field', 'paramsFile': 'docs/staging/integrator-kit/params/M6-W50.json', 'state': 'stopped'}
        with self.assertRaisesRegex(RuntimeError, 'scientifically stopped'): r.validate_world_resume(reg, args)
        reg['state'] = 'done'; reg['seed'] = 7
        with self.assertRaisesRegex(RuntimeError, 'identity mismatch'): r.validate_world_resume(reg, args)
    def test_resume_rejects_decode_and_switch_drift(self):
        args = ['--seed', '48', '--arm', 'r14-wire-s7-draw-1', '--packet', 'p5b', '--days', '1', '--burn-in', '1']
        reg = {'seed': 48, 'arm': 'r14-wire-s7-draw-1', 'packetName': 'p5b', 'daysAsked': 1, 'burnInDays': 1, 'profile': 'field',
               'paramsFile': 'docs/staging/integrator-kit/params/M6-W50.json', 'paramsSha256': r.sha(r.ROOT / 'docs/staging/integrator-kit/params/M6-W50.json'),
               'state': 'done', 'stopCheckOn': True, 'minAge': 8, 'timeoutS': 120, 'contexts': True,
               'switches': {'observeV4': 1, 'observeV5': 1, 'menuParity': 1, 'kernelGate': 1, 'kernelNoRulesPick': 0},
               'kernel': 'gliner', 'decodeSpec': {'mode': 'draw', 'salt': 1, 'hold': 'act'}, 'adapter': 'fake',
               'engine': {'name': 'r14-wire-s7-draw-1', 'packet': 'p5b', 'adapter': 'fake', 'decodeName': 'draw-1'}}
        r.validate_world_resume(reg, args)
        reg['decodeSpec']['salt'] = 2
        with self.assertRaisesRegex(RuntimeError, 'decode mismatch'): r.validate_world_resume(reg, args)
        reg['decodeSpec']['salt'] = 1; reg['switches']['kernelGate'] = 0
        with self.assertRaisesRegex(RuntimeError, 'switches'): r.validate_world_resume(reg, args)
    def test_resume_budget_cannot_be_reset(self):
        command = ['false']
        r.atomic(r.OUT / 'steps/exhausted.json', {'name': 'exhausted', 'command': command, 'seconds': 3601, 'attempts': []})
        with self.assertRaisesRegex(RuntimeError, 'budget exhausted'): r.step('exhausted', command, 1)

if __name__ == '__main__': unittest.main()
