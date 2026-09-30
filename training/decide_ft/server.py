"""Shared batching server: one resident Decide model (base + LoRA adapters) per GPU, fed by many runs at once.

Each run process used to spawn its own worker.py and send the few decisions of one tick at a time, so the GPU saw
batches of 1-5 and sat mostly idle between them. Here every run connects over TCP with the worker.py line protocol,
and one GPU loop merges the pending items of all connections into large per-adapter batches.

  PYTHONDONTWRITEBYTECODE=1 python -B server.py --device cuda [--port 7788] [--max-batch 64] [--wait-ms 5]

  client -> {"batch": [{"adapter": name, "packet": {...}}, ...]}
  server -> {"results": [[p...], ...], "seconds": s}   or   {"error": "..."}
  The first line on each connection is {"ready": true, "adapters": {name: sha256}, "device": d, "server": true}.

Jev items are refused: the TypeSafe key stays on the Mac (use worker.py there).
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import sys
import threading
import time
from concurrent.futures import Future

out = sys.__stdout__


class Batcher:
    """Collects items from all connections; one thread scores them in per-adapter batches."""

    def __init__(self, device: str, max_batch: int, wait_ms: float):
        from adapters import AdapterModel
        with contextlib.redirect_stdout(sys.stderr):
            self.am = AdapterModel(device)
        self.device, self.max_batch, self.wait = device, max_batch, wait_ms / 1000
        self.pending: list[tuple[str, dict, Future]] = []
        self.cv = threading.Condition()
        self.stats = {"items": 0, "batches": 0, "gpu_seconds": 0.0}
        threading.Thread(target=self.loop, daemon=True).start()

    def submit(self, adapter: str, packet: dict) -> Future:
        fut: Future = Future()
        with self.cv:
            self.pending.append((adapter, packet, fut))
            self.cv.notify()
        return fut

    def take(self) -> list[tuple[str, dict, Future]]:
        with self.cv:
            while not self.pending:
                self.cv.wait()
            # Wait briefly for other runs to add their items, unless a full batch is already waiting.
            deadline = time.monotonic() + self.wait
            while len(self.pending) < self.max_batch and (left := deadline - time.monotonic()) > 0:
                self.cv.wait(left)
            # Serve the adapter with the most waiting items, up to one batch.
            counts: dict[str, int] = {}
            for a, _, _ in self.pending:
                counts[a] = counts.get(a, 0) + 1
            name = max(counts, key=counts.get)
            take, keep = [], []
            for item in self.pending:
                (take if item[0] == name and len(take) < self.max_batch else keep).append(item)
            self.pending = keep
            return take

    def loop(self) -> None:
        while True:
            items = self.take()
            began = time.monotonic()
            try:
                with contextlib.redirect_stdout(sys.stderr):
                    # Similar lengths in one forward pass waste less padding.
                    order = sorted(range(len(items)), key=lambda i: len(json.dumps(items[i][1])))
                    probs = self.am.score(items[0][0], [items[i][1] for i in order], batch_size=self.max_batch)
                for i, p in zip(order, probs):
                    items[i][2].set_result(p)
            except Exception as exc:  # fail these items; the run decides by rules for them
                for _, _, fut in items:
                    if not fut.done():
                        fut.set_exception(exc)
            self.stats["items"] += len(items)
            self.stats["batches"] += 1
            self.stats["gpu_seconds"] += time.monotonic() - began


async def handle(batcher: Batcher, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    def emit(obj) -> None:
        writer.write((json.dumps(obj, separators=(",", ":")) + "\n").encode())

    emit({"ready": True, "adapters": batcher.am.hashes, "device": batcher.device, "server": True})
    await writer.drain()
    while line := await reader.readline():
        if not line.strip():
            continue
        began = time.monotonic()
        try:
            batch = json.loads(line)["batch"]
            if any(item["adapter"] == "jev" for item in batch):
                raise ValueError("the server does not call Jev; the key stays on the Mac")
            futs = [asyncio.wrap_future(batcher.submit(item["adapter"], item["packet"])) for item in batch]
            emit({"results": await asyncio.gather(*futs), "seconds": round(time.monotonic() - began, 4)})
        except Exception as exc:
            emit({"error": f"{type(exc).__name__}: {exc}"})
        await writer.drain()
    writer.close()


async def main(device: str, port: int, max_batch: int, wait_ms: float) -> None:
    batcher = Batcher(device, max_batch, wait_ms)
    server = await asyncio.start_server(lambda r, w: handle(batcher, r, w), "127.0.0.1", port, limit=2**24)

    async def report() -> None:  # throughput line every 60 s, for tuning max-batch and the number of runs
        last = dict(batcher.stats)
        while True:
            await asyncio.sleep(60)
            s = batcher.stats
            n, b = s["items"] - last["items"], s["batches"] - last["batches"]
            busy = s["gpu_seconds"] - last["gpu_seconds"]
            print(json.dumps({"items_per_s": round(n / 60, 1), "mean_batch": round(n / max(1, b), 1), "gpu_busy": round(busy / 60, 3)}),
                  file=sys.stderr, flush=True)
            last = dict(s)

    asyncio.get_running_loop().create_task(report())
    out.write(json.dumps({"listening": port, "adapters": batcher.am.hashes, "device": device}) + "\n")
    out.flush()
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    arg = lambda flag, default: type(default)(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default
    asyncio.run(main(arg("--device", "cuda"), arg("--port", 7788), arg("--max-batch", 64), arg("--wait-ms", 5.0)))
