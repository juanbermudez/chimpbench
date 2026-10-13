"""Live token guard without importing torch, a tokenizer, or a model."""
import contextlib
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('r15_scorer', Path(__file__).resolve().parents[1] / 'server/r15-scorer.py')
scorer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scorer)


class TokenGuard(unittest.TestCase):
    def test_exact_boundary_without_truncation_or_forward_on_rejection(self):
        calls = []
        class Model:
            @contextlib.contextmanager
            def use(self, name):
                yield self
            def collate_fn_inference(self, batch, *, max_len, error_policy):
                self.assertions = (max_len, error_policy)
                return types.SimpleNamespace(attention_mask=types.SimpleNamespace(sum=lambda: batch[0][0]))
            def score(self, name, packets):
                calls.append(packets)
                return [[1.0] for _ in packets]
        model = Model()
        model.processor = model
        common = types.SimpleNamespace(example=lambda model, packet, pick: (packet['tokens'], {}, ['c0']))
        with patch.dict(sys.modules, {'common': common}):
            self.assertEqual(scorer.checked_score(model, 'r15-resources-s7', [{'tokens': 1280}]), ([[1.0]], [1280]))
            self.assertEqual(model.assertions, (None, 'raise'))
            with self.assertRaisesRegex(ValueError, '1281 tokens'):
                scorer.checked_score(model, 'r15-resources-s7', [{'tokens': 1281}])
        self.assertEqual(len(calls), 1)


if __name__ == '__main__':
    unittest.main()
