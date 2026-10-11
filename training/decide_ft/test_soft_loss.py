"""Stage R11: the trainer's label arithmetic, tested with the standard library alone (no torch, no model, no tokenizer).

  python3 -I -B training/decide_ft/test_soft_loss.py

What it holds: the soft cross-entropy is the usual cross-entropy when the target is one-hot; it is smallest when the
model's distribution is the label; it never depends on the order of the options when the label moves with them; the
target vector follows the model's label order and refuses a label that does not name the offered options; and the
option shuffle is common.permuted's (a copy of that function stands here as the reference, because importing common.py
would import the model's provider code).
"""
from __future__ import annotations

import math
import os
import random
import sys
import unittest
import zlib

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from soft_loss import argmax, cross_entropy_of_probs, entropy, log_softmax, permuted_soft, soft_cross_entropy, target_vector  # noqa: E402


def permuted_reference(packet: dict, pick: str, rng: random.Random) -> tuple[dict, str]:
    """training/decide_ft/common.py permuted, copied verbatim on 11 October 2026 (track-e a11c45c)."""
    criteria = packet["questions"]["action"]["criteria"]
    aliases = list(criteria)
    order = aliases[:]
    while len(order) > 1 and order == aliases:
        rng.shuffle(order)
    moved = {old: new for new, old in zip(aliases, order)}
    new_criteria = {new: criteria[old] for new, old in zip(aliases, order)}
    question = {**packet["questions"]["action"], "criteria": new_criteria}
    return {"state": packet["state"], "questions": {"action": question}}, moved[pick]


def packet_of(n: int) -> dict:
    return {"state": {"me": "x"}, "questions": {"action": {"type": "choice", "instructions": "Choose.", "criteria": {f"c{i}": f"option text {i}" for i in range(n)}}}}


class SoftLoss(unittest.TestCase):
    def test_one_hot_is_the_usual_cross_entropy(self):
        rng = random.Random(1)
        for _ in range(200):
            n = rng.randint(2, 8)
            logits = [rng.uniform(-4, 4) for _ in range(n)]
            k = rng.randrange(n)
            target = [1.0 if i == k else 0.0 for i in range(n)]
            self.assertAlmostEqual(soft_cross_entropy(logits, target), -log_softmax(logits)[k], places=12)

    def test_log_softmax_sums_to_one_and_survives_large_logits(self):
        for logits in ([0.0, 0.0], [1000.0, 999.0, -1000.0], [-50.0, 3.0, 2.5, 2.5]):
            self.assertAlmostEqual(sum(math.exp(v) for v in log_softmax(logits)), 1.0, places=12)

    def test_the_loss_is_smallest_when_the_model_is_the_label(self):
        rng = random.Random(2)
        for _ in range(100):
            n = rng.randint(2, 8)
            raw = [rng.random() for _ in range(n)]
            q = [v / sum(raw) for v in raw]
            at_label = soft_cross_entropy([math.log(v) for v in q], q)
            self.assertAlmostEqual(at_label, entropy(q), places=12)  # the floor is the label's own entropy
            for _ in range(20):
                other = [math.log(v) + rng.uniform(-1, 1) for v in q]
                self.assertGreaterEqual(soft_cross_entropy(other, q) + 1e-12, at_label)

    def test_a_shared_label_pulls_toward_sharing(self):
        # two near-tied options: the gradient of the loss in the logits is softmax minus the label, so it is zero at the label
        q = [0.5, 0.5, 0.0]
        base = [0.3, -0.2, -1.0]
        eps = 1e-6
        grad = []
        for i in range(3):
            up = base[:]; up[i] += eps
            down = base[:]; down[i] -= eps
            grad.append((soft_cross_entropy(up, q) - soft_cross_entropy(down, q)) / (2 * eps))
        p = [math.exp(v) for v in log_softmax(base)]
        for g, pi, qi in zip(grad, p, q):
            self.assertAlmostEqual(g, pi - qi, places=6)

    def test_probabilities_and_logits_agree(self):
        logits = [0.2, 1.5, -0.7, 0.0]
        q = [0.1, 0.6, 0.0, 0.3]
        probs = [math.exp(v) for v in log_softmax(logits)]
        self.assertAlmostEqual(cross_entropy_of_probs(probs, q), soft_cross_entropy(logits, q), places=12)
        self.assertAlmostEqual(cross_entropy_of_probs([0.0, 1.0], [1.0, 0.0]), -math.log(1e-9), places=9)  # floored, as train_r4.py

    def test_target_vector_follows_the_models_label_order(self):
        soft = {"c0": 0.2, "c1": 0.5, "c2": 0.3}
        self.assertEqual(target_vector(["c2", "c0", "c1"], soft, "c1", "soft"), [0.3, 0.2, 0.5])
        self.assertEqual(target_vector(["c2", "c0", "c1"], soft, "c1", "hard"), [0.0, 0.0, 1.0])
        self.assertEqual(target_vector(["c0", "c1"], None, "c1", "hard"), [0.0, 1.0])
        t = target_vector(["c0", "c1"], {"c0": 2, "c1": 6}, "c1", "soft")  # renormalised
        self.assertAlmostEqual(sum(t), 1.0); self.assertAlmostEqual(t[1], 0.75)

    def test_target_vector_refuses_a_wrong_label(self):
        for soft, pick, kind in (({"c0": 1.0}, "c0", "soft"), ({"c0": 0.5, "c9": 0.5}, "c0", "soft"), ({"c0": 0.0, "c1": 0.0}, "c0", "soft"),
                                 ({"c0": -0.1, "c1": 1.1}, "c0", "soft"), ({"c0": float("nan"), "c1": 1.0}, "c0", "soft"), (None, "c0", "soft"),
                                 ({"c0": 0.5, "c1": 0.5}, "c7", "soft"), ({"c0": 0.5, "c1": 0.5}, "c0", "weighted")):
            with self.assertRaises(ValueError):
                target_vector(["c0", "c1"], soft, pick, kind)

    def test_the_shuffle_is_commons_and_the_label_moves_with_the_text(self):
        rng = random.Random(3)
        for k in range(300):
            n = rng.randint(2, 8)
            packet = packet_of(n)
            raw = [rng.random() for _ in range(n)]
            soft = {f"c{i}": v / sum(raw) for i, v in enumerate(raw)}
            pick = f"c{argmax(raw)}"
            seed = zlib.crc32(f"48-W50-{k}-17".encode())
            ours = permuted_soft(packet, pick, soft, random.Random(seed))
            ref = permuted_reference(packet, pick, random.Random(seed))
            self.assertEqual((ours[0], ours[1]), ref)
            before, after = packet["questions"]["action"]["criteria"], ours[0]["questions"]["action"]["criteria"]
            self.assertEqual(list(after), list(before))  # the aliases keep their order; the texts move
            self.assertNotEqual(list(after.values()), list(before.values()))
            for alias, text in before.items():
                moved_to = next(a for a, t in after.items() if t == text)
                self.assertEqual(ours[2][moved_to], soft[alias])  # the mass of an option stays with its text
            self.assertEqual(after[ours[1]], before[pick])
            self.assertAlmostEqual(sum(ours[2].values()), 1.0, places=12)
            # so the loss of a model that reads the texts is the same before and after the shuffle
            logit_of = {text: rng.uniform(-3, 3) for text in before.values()}
            a = soft_cross_entropy([logit_of[t] for t in before.values()], target_vector(list(before), soft, pick, "soft"))
            b = soft_cross_entropy([logit_of[t] for t in after.values()], target_vector(list(after), ours[2], ours[1], "soft"))
            self.assertAlmostEqual(a, b, places=12)

    def test_a_single_option_and_no_label(self):
        packet = packet_of(1)
        self.assertEqual(permuted_soft(packet, "c0", None, random.Random(0)), (packet, "c0", None))
        self.assertEqual(permuted_soft(packet, "c0", {"c0": 1.0}, random.Random(0))[2], {"c0": 1.0})


if __name__ == "__main__":
    unittest.main(verbosity=1)
