"""Stage M1–M2 scorer (docs/staging/em-prereg.md): decision packets scored by one provider, chosen by one setting.

Providers (the model only chooses; probabilities come back in the packet's criteria order, whichever answers):
  base       GLiNER2.5-Decide untuned, as served (the resident worker's model and revision; fp16 on MPS)
  <adapter>  a fine-tuned LoRA adapter (e.g. baseline) from MGOGO_FT_ROOT/adapters (read only), loaded on the same base
  jev        Jev (TypeSafe System One) through the run-wide spend guard (jev.py, spend_guard.py): a ledger, a run id and its
             cap are required; --dry-run sends nothing and books nothing (token estimates go to the receipts)

Input: JSONL rows with an `id` and `packets` {name: packet}; --packets names which to score. Output: JSONL rows
{id, packet, provider, probs[, tokens]}. --tokens only counts GLiNER input tokens (the attention-mask length after
collate_fn_inference, as token_audit.py; the worker's hard limit is 1,280) and scores nothing.

  PYTHONDONTWRITEBYTECODE=1 ~/Desktop/GHN/data/raw/decide-env/bin/python -B training/decide_ft/em_score.py \
      --in artifacts/em/m2/s48.jsonl --packets glinerOld,glinerNew --provider base --out artifacts/em/m2/s48.base.jsonl [--device mps]
  ... --tokens --out artifacts/em/m1/tokens.jsonl
  ... --provider jev --packets jevOld,jevNew --ledger artifacts/em/jev-ledger.sqlite --run eM-model --cap 5 [--dry-run] [--limit 300]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path


def rows_of(path: str, names: list[str], limit: int, only: set[str] | None) -> list[tuple[str, str, dict]]:
    out = []
    for line in Path(path).read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if only is not None and row["id"] not in only:
            continue
        for name in names:
            packet = row["packets"].get(name)
            if packet is not None:
                out.append((row["id"], name, packet))
        if limit and len({r[0] for r in out}) >= limit:
            break
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--packets", required=True)
    ap.add_argument("--provider", default="base")
    ap.add_argument("--out", required=True)
    ap.add_argument("--device", default="mps")
    ap.add_argument("--batch", type=int, default=8)
    ap.add_argument("--tokens", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="at most this many input rows")
    ap.add_argument("--ids", default="", help="a file with one id per line: score only these rows")
    ap.add_argument("--ledger"); ap.add_argument("--run"); ap.add_argument("--cap", type=float)
    ap.add_argument("--receipts", default=""); ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    only = set(Path(a.ids).read_text().split()) if a.ids else None
    items = rows_of(a.inp, a.packets.split(","), a.limit, only)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    began = time.monotonic()
    with out.open("w") as f:
        if a.tokens or a.provider != "jev":
            import torch
            from common import collate, example, load_base, score
            if a.tokens:
                model = load_base("cpu")
                for k, (rid, name, packet) in enumerate(items):
                    n = int(collate(model, [example(model, packet, None)]).attention_mask.sum())
                    f.write(json.dumps({"id": rid, "packet": name, "tokens": n}) + "\n")
                    if k % 500 == 0:
                        print(f"tokens {k}/{len(items)}", flush=True)
            else:
                if a.provider == "base":
                    model = load_base(a.device, half=a.device in ("mps", "cuda"))
                    fn = lambda packets: score(model, packets, a.batch)
                    ident = {"provider": "base"}
                else:
                    from adapters import AdapterModel
                    am = AdapterModel(a.device, names=(a.provider,))
                    if a.provider not in am.names:
                        sys.exit(f"adapter {a.provider} not found under MGOGO_FT_ROOT/adapters")
                    fn = lambda packets: am.score(a.provider, packets, a.batch)
                    ident = {"provider": a.provider, "adapter_sha256": am.hashes[a.provider]}
                print(json.dumps({"ready": True, **ident, "items": len(items)}), flush=True)
                step = 64
                for k in range(0, len(items), step):
                    chunk = items[k:k + step]
                    probs = fn([p for _, _, p in chunk])
                    for (rid, name, _), pr in zip(chunk, probs):
                        f.write(json.dumps({"id": rid, "packet": name, "provider": a.provider, "probs": [round(x, 6) for x in pr]}) + "\n")
                    f.flush()
                    if a.device == "mps":
                        torch.mps.empty_cache()
                    print(f"{a.provider} {min(k + step, len(items))}/{len(items)} {time.monotonic() - began:.0f} s", flush=True)
        else:
            from concurrent.futures import ThreadPoolExecutor
            from jev import JevBudgetError, JevClient
            if not (a.ledger and a.run and a.cap):
                sys.exit("jev needs --ledger, --run and --cap (no default cap)")
            receipts = Path(a.receipts) if a.receipts else out.parent / "jev-receipts.jsonl"
            client = JevClient(ledger=a.ledger, run_id=a.run, cap_dollars=a.cap, receipts=receipts, dry_run=a.dry_run,
                               kill_file=out.parent / "JEV_KILL")
            pool = ThreadPoolExecutor(max_workers=8)

            def one(item):
                rid, name, packet = item
                try:
                    return rid, name, client.choose(packet, tag=f"em:{name}"), None
                except JevBudgetError as exc:  # dry run: no answer
                    return rid, name, None, str(exc)

            done = 0
            for rid, name, probs, err in pool.map(one, items):
                if probs is not None:
                    f.write(json.dumps({"id": rid, "packet": name, "provider": "jev", "probs": [round(x, 6) for x in probs]}) + "\n")
                done += 1
                if done % 100 == 0:
                    print(f"jev {done}/{len(items)} spent ${client.spent:.4f}", flush=True)
            print(json.dumps({"jev_calls": client.calls, "jev_spent": round(client.spent, 6), "dry_run": a.dry_run}), flush=True)
    print(json.dumps({"done": len(items), "seconds": round(time.monotonic() - began, 1), "out": str(out)}), flush=True)


if __name__ == "__main__":
    main()
