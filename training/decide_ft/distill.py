"""Fit a linear stand-in for each adapter from logged decisions (IMPLEMENTATION_PLAN.md Stage P4).

Each logged decision has one feature row per option (scripts/ft-features.ts optionFeatures) and the adapter's
probabilities over those options. The default stand-in is a one-hidden-layer network scored per option, softmax over
the decision's options, fitted by cross-entropy against the adapter's probabilities (soft targets); --model linear
fits w . standardize(x) instead (about 66% held-out top-1 agreement on the first data, too loose for long runs). Decisions are split by world seed so held-out numbers come from
worlds the fit never saw.

  python3 training/decide_ft/distill.py --data artifacts/decide-ft/distill/decisions.jsonl --out artifacts/decide-ft/distill

  input line: {"adapter": "baseline", "seed": 4001, "feats": [[...], ...], "probs": [...]}
  output: <out>/<adapter>.json (weights, feature names, standardization) and <out>/report.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np


def load(path: Path) -> dict[str, list[dict]]:
    by: dict[str, list[dict]] = {}
    for line in path.read_text().splitlines():
        if line.strip():
            d = json.loads(line)
            if len(d["probs"]) >= 2:
                by.setdefault(d["adapter"], []).append(d)
    return by


def fit(rows: list[dict], l2: float, steps: int, lr: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    X = np.concatenate([np.asarray(r["feats"], dtype=np.float64) for r in rows])
    mean, std = X.mean(0), X.std(0)
    std[std < 1e-9] = 0.0  # constant columns carry no signal; the TS side skips them the same way
    Z = np.where(std > 0, (X - mean) / np.where(std > 0, std, 1), 0.0)
    sizes = np.array([len(r["probs"]) for r in rows]); ends = np.cumsum(sizes); starts = ends - sizes
    target = np.concatenate([np.asarray(r["probs"], dtype=np.float64) for r in rows])
    seg = np.repeat(np.arange(len(rows)), sizes)
    w = np.zeros(Z.shape[1]); m = np.zeros_like(w); v = np.zeros_like(w)
    for t in range(1, steps + 1):  # full-batch Adam on the mean decision cross-entropy
        s = Z @ w
        s -= np.maximum.reduceat(s, starts)[seg]
        e = np.exp(s)
        p = e / np.add.reduceat(e, starts)[seg]
        g = Z.T @ (p - target) / len(rows) + l2 * w
        m = 0.9 * m + 0.1 * g; v = 0.999 * v + 0.001 * g * g
        w -= lr * (m / (1 - 0.9 ** t)) / (np.sqrt(v / (1 - 0.999 ** t)) + 1e-8)
    return w, mean, std


def evaluate(rows: list[dict], w, mean, std) -> dict:
    agree, ce, n = 0, 0.0, 0
    for r in rows:
        X = np.asarray(r["feats"], dtype=np.float64)
        s = np.where(std > 0, (X - mean) / np.where(std > 0, std, 1), 0.0) @ w
        p = np.exp(s - s.max()); p /= p.sum()
        q = np.asarray(r["probs"])
        agree += int(np.argmax(p) == np.argmax(q)); ce -= float((q * np.log(p + 1e-12)).sum()); n += 1
    return {"n": n, "top1_agreement": round(agree / max(1, n), 4), "cross_entropy": round(ce / max(1, n), 4)}


def fit_mlp(train: list[dict], test: list[dict], hidden: int, epochs: int, wd: float, seed: int = 7):
    """One hidden layer shared across options, softmax over a decision's options, soft targets. Early stop on held-out CE.

    Exported for raw (unstandardized) features: the standardization is folded into the first layer, so the TS side
    can take sparse dot products over the few nonzero features of each option.
    """
    import torch
    torch.manual_seed(seed)
    X = np.concatenate([np.asarray(r["feats"], dtype=np.float64) for r in train])
    mean, std = X.mean(0), X.std(0)
    keep = std > 1e-9
    scale = np.where(keep, 1 / np.where(keep, std, 1), 0.0)

    def batch(rows):
        k = max(len(r["probs"]) for r in rows)
        x = np.zeros((len(rows), k, X.shape[1]), dtype=np.float32); m = np.zeros((len(rows), k), dtype=bool); t = np.zeros((len(rows), k), dtype=np.float32)
        for i, r in enumerate(rows):
            f = (np.asarray(r["feats"]) - mean) * scale
            x[i, :len(f)] = f; m[i, :len(f)] = True; t[i, :len(f)] = r["probs"]
        return torch.tensor(x), torch.tensor(m), torch.tensor(t)

    net = torch.nn.Sequential(torch.nn.Linear(X.shape[1], hidden), torch.nn.ReLU(), torch.nn.Linear(hidden, 1))
    opt = torch.optim.AdamW(net.parameters(), lr=2e-3, weight_decay=wd)
    xt, mt, tt = batch(test)

    def ce(x, m, t):
        s = net(x).squeeze(-1).masked_fill(~m, -1e9)
        return -(t * torch.log_softmax(s, -1)).sum(-1).mean()

    best, state, rng = float("inf"), None, np.random.default_rng(seed)
    for epoch in range(epochs):
        order = rng.permutation(len(train))
        net.train()
        for i in range(0, len(order), 256):
            x, m, t = batch([train[j] for j in order[i:i + 256]])
            opt.zero_grad(); loss = ce(x, m, t); loss.backward(); opt.step()
        net.eval()
        with torch.no_grad():
            val = float(ce(xt, mt, tt))
        if val < best - 1e-4:
            best, state = val, {k: v.clone() for k, v in net.state_dict().items()}
    net.load_state_dict(state)
    W1 = net[0].weight.detach().double().numpy() * scale  # fold (x - mean) * scale into the first layer
    b1 = net[0].bias.detach().double().numpy() - W1 @ mean
    w2 = net[2].weight.detach().double().numpy()[0]; b2 = float(net[2].bias.detach())
    return {"W1": W1, "b1": b1, "w2": w2, "b2": b2}


def mlp_scores(model: dict, feats) -> np.ndarray:
    h = np.maximum(0, np.asarray(feats, dtype=np.float64) @ model["W1"].T + model["b1"])
    return h @ model["w2"] + model["b2"]


def evaluate_mlp(rows: list[dict], model: dict) -> dict:
    agree, ce, n = 0, 0.0, 0
    for r in rows:
        s = mlp_scores(model, r["feats"]); p = np.exp(s - s.max()); p /= p.sum(); q = np.asarray(r["probs"])
        agree += int(np.argmax(p) == np.argmax(q)); ce -= float((q * np.log(p + 1e-12)).sum()); n += 1
    return {"n": n, "top1_agreement": round(agree / max(1, n), 4), "cross_entropy": round(ce / max(1, n), 4)}


def main_mlp(data: Path, out: Path, hidden: int, epochs: int, wd: float) -> None:
    names = json.loads((out / "features.json").read_text())
    report = {}
    for adapter, rows in sorted(load(data).items()):
        seeds = sorted({r["seed"] for r in rows})
        held = set(seeds[:: 5])
        train = [r for r in rows if r["seed"] not in held]; test = [r for r in rows if r["seed"] in held]
        m = fit_mlp(train, test, hidden, epochs, wd)
        report[adapter] = {"train": evaluate_mlp(train, m), "held_out": evaluate_mlp(test, m), "held_out_seeds": sorted(held),
                           "decisions": {"train": len(train), "held_out": len(test)}}
        model = {"adapter": adapter, "kind": "mlp", "features": names, "hidden": hidden,
                 "W1": np.round(m["W1"], 6).tolist(), "b1": np.round(m["b1"], 6).tolist(), "w2": np.round(m["w2"], 6).tolist(), "b2": round(m["b2"], 6),
                 "fit": {"hidden": hidden, "epochs": epochs, "weight_decay": wd, "data": str(data)}}
        (out / f"{adapter}.json").write_text(json.dumps(model) + "\n")
        print(adapter, json.dumps(report[adapter]), flush=True)
    (out / "report.json").write_text(json.dumps(report, indent=1) + "\n")


def main(data: Path, out: Path, l2: float, steps: int, lr: float) -> None:
    names = json.loads((out / "features.json").read_text()) if (out / "features.json").exists() else None
    report = {}
    for adapter, rows in sorted(load(data).items()):
        seeds = sorted({r["seed"] for r in rows})
        held = set(seeds[:: 5])  # every fifth world is held out
        train = [r for r in rows if r["seed"] not in held]; test = [r for r in rows if r["seed"] in held]
        w, mean, std = fit(train, l2, steps, lr)
        rules = [r for r in test]
        rules_agree = sum(int(np.argmax(np.asarray(r["feats"])[:, 1]) == np.argmax(r["probs"])) for r in rules) / max(1, len(rules))
        report[adapter] = {"train": evaluate(train, w, mean, std), "held_out": evaluate(test, w, mean, std),
                           "held_out_seeds": sorted(held), "rules_pick_agreement_held_out": round(rules_agree, 4)}
        model = {"adapter": adapter, "features": names, "weights": w.round(6).tolist(), "mean": mean.round(6).tolist(),
                 "std": std.round(6).tolist(), "fit": {"l2": l2, "steps": steps, "lr": lr, "decisions": len(train)}}
        (out / f"{adapter}.json").write_text(json.dumps(model) + "\n")
        print(adapter, json.dumps(report[adapter]), flush=True)
    (out / "report.json").write_text(json.dumps(report, indent=1) + "\n")


if __name__ == "__main__":
    arg = lambda flag, default: type(default)(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default
    if arg("--model", "mlp") == "mlp":
        main_mlp(Path(arg("--data", "")), Path(arg("--out", "")), arg("--hidden", 64), arg("--epochs", 40), arg("--wd", 1e-3))
    else:
        main(Path(arg("--data", "")), Path(arg("--out", "")), arg("--l2", 1e-3), arg("--steps", 3000), arg("--lr", 0.05))
