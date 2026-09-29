"""One resident Decide model with the three LoRA adapters, switched per request (peft set_adapter).

gliner2's own load_adapter/unload_adapter do not actually switch adapters (see docs/decide-finetune.md),
so this uses peft directly. Switching flips flags on each LoRA layer; no weights move. "base" runs with
adapters disabled. Serving precision matches the live worker: fp16 on MPS (and CUDA), fp32 on CPU.
"""
from __future__ import annotations

import contextlib

from common import ADAPTERS, FT, load_base, score, sha256_file

NAMES = ("base", *ADAPTERS)


class AdapterModel:
    def __init__(self, device: str = "mps", names=tuple(ADAPTERS)):
        from peft import PeftModel
        half = device in ("mps", "cuda")  # serving precision; CPU stays fp32
        self.base = load_base(device, half=half)
        self.names = [n for n in names if (FT / "adapters" / n / "adapter_model.safetensors").exists()]
        self.model = None
        for i, name in enumerate(self.names):
            path = str(FT / "adapters" / name)
            if i == 0:
                self.model = PeftModel.from_pretrained(self.base, path, adapter_name=name)
            else:
                self.model.load_adapter(path, adapter_name=name)
        if self.model is not None:
            if half:
                self.model.half()
            self.model.to(self.base.device if hasattr(self.base, "device") else device).eval()
        self.hashes = {n: sha256_file(FT / "adapters" / n / "adapter_model.safetensors") for n in self.names}

    @contextlib.contextmanager
    def use(self, name: str):
        if name == "base" or self.model is None:
            ctx = self.model.disable_adapter() if self.model is not None else contextlib.nullcontext()
            with ctx:
                yield self.model or self.base
            return
        if name not in self.names:
            raise ValueError(f"unknown adapter {name!r}; loaded {self.names}")
        self.model.set_adapter(name)
        yield self.model

    def score(self, name: str, packets: list[dict], batch_size: int = 8) -> list[list[float]]:
        with self.use(name) as m:
            return score(m, packets, batch_size)
