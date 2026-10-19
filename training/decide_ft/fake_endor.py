"""A fake Endor for the Endor training test's tests and dry run (docs/staging/endor-train.md §9). Nothing here talks to
a network: `handler` answers httpx requests in memory (httpx.MockTransport), under the real SDK and the real gate, so
the tests read the exact bytes the SDK would send. It keeps what Endor's documentation says it does: sequence numbers,
the datum and question rules, AdamW settings, a balance billed per GPU second and per token, 402 at no balance, 409 on
a model name used twice, a 422 for a question it refuses (a share of packets chosen by hash, or any rule a test sets),
model files behind presigned storage links. Its "model" is a toy (option texts' mean target, mixed in as steps pass),
so the dry run's development numbers move, but they mean nothing. Every number it gives is fake.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

FAKE_KEY = "edk_fake_key_for_tests_only_000000"  # not a credential: the fake checks it, receipts must never hold it


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _h(text: str) -> int:
    return int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)


class FakeEndor:
    API = "api.endor.thetokencompany.com"
    STORAGE = "storage.fake-endor.invalid"

    def __init__(self, *, key: str = FAKE_KEY, balance: float = 100.0, gpu_seconds_per_call: float = 0.5,
                 refuse=None, refuse_share: float = 1 / 256, decisions_per_minute: int = 600_000, fail_optim_at: int | None = None,
                 lr_echo=None, hang=None, bill: str = "exact", frozen_balance: bool = False, timestamps: bool = True, refuse_datum=None):
        self.key, self.balance_usd, self.balance_start = key, balance, balance
        self.gpu_s, self.dpm = gpu_seconds_per_call, decisions_per_minute
        self.refuse = refuse if refuse is not None else (lambda state, q: _h(json.dumps(state, sort_keys=True)) % round(1 / refuse_share) == 0 if refuse_share else False)
        self.fail_optim_at, self.lr_echo = fail_optim_at, lr_echo
        self.hang = hang  # (op, run step): that call's future stays "running" for ever (a call Endor never finishes)
        self.refuse_datum = refuse_datum  # a datum Endor's renderer refuses in training (422 invalid_datum)
        # billing: "exact" (each call its GPU seconds) or "ceil" (each call rounded up to the second); a frozen balance
        # stands in for one that lags; futures carry Endor's created_at and completed_at on a server clock where each
        # request takes `rtt` and each billed call runs `gpu_seconds_per_call`, one at a time (timestamps=False: none)
        self.bill, self.frozen_balance, self.timestamps = bill, frozen_balance, timestamps
        self.server_t, self.free_at, self._exec, self.rtt = 1_790_000_000.0, 0.0, None, 0.02
        self.requests: list[dict] = []
        self.violations: list[str] = []
        self.projects: dict[str, dict] = {}
        self.runs: dict[str, dict] = {}
        self.futures: dict[str, dict] = {}
        self.models: dict[str, dict] = {}
        self.files: dict[str, bytes] = {}
        self.table: dict[str, list[float]] = {}  # option text -> [mass, count]: the toy model
        self.gpu_seconds = 0.0
        self.tokens = 0
        self.n = 0

    # ------------------------------------------------------------------ across processes (the dry run's fit and train)
    KEPT = ("balance_usd", "projects", "models", "table", "gpu_seconds", "tokens", "n", "audits", "server_t", "free_at")

    @classmethod
    def load(cls, path: Path, **kw) -> "FakeEndor":
        fake = cls(**kw)
        fake.audits = []
        if path.exists():
            for k, v in json.loads(path.read_text()).items():
                setattr(fake, k, v)
        return fake

    def save(self, path: Path, markers: tuple[str, ...] = ()) -> None:
        self.audits = getattr(self, "audits", []) + [self.audit(markers)]
        path.write_text(json.dumps({k: getattr(self, k) for k in self.KEPT}, indent=1) + "\n")

    def audit(self, markers: tuple[str, ...] = ()) -> dict:
        """Everything that reached the fake, read as Endor would see it: the key only in the API's Authorization header,
        no marker anywhere, no credentials to storage, no report, no latency header, no git commit."""
        found = list(self.violations)
        for r in self.requests:
            raw = (r["raw"] or b"").decode("utf-8", "replace")
            texts = [("url", f"{r['host']}{r['path']}?{r['query']}"), ("body", raw)] + [(f"header {k}", v) for k, v in r["headers"].items() if k != "authorization"]
            for where, text in texts:
                if self.key in text:
                    found.append(f"the key in {where} of {r['method']} {r['path']}")
                for m in markers:
                    if m in text:
                        found.append(f"marker {m!r} in {where} of {r['method']} {r['path']}")
            if r["host"] != self.API and "authorization" in r["headers"]:
                found.append("credentials to a host other than the API")
            if "user_reports" in r["path"]:
                found.append("a user report")
            if "x-endor-client-latency" in r["headers"]:
                found.append("a latency report")
            if isinstance(r["body"], dict) and "code_hash" in r["body"]:
                found.append("a git commit")
        by = {}
        for r in self.requests:
            key = f"{r['method']} {re.sub(r'(run|fut|obj)_[0-9]+', '{id}', r['path'])}"
            by[key] = by.get(key, 0) + 1
        return {"requests": len(self.requests), "by_route": by, "violations": found}

    # ------------------------------------------------------------------ plumbing
    def _id(self, prefix: str) -> str:
        self.n += 1
        return f"{prefix}_{self.n:06d}"

    def _json(self, status: int, body=None, headers=None) -> httpx.Response:
        h = {"x-request-id": self._id("req"), **(headers or {})}
        if body is None:
            return httpx.Response(status, headers=h)
        return httpx.Response(status, json=body, headers=h)

    def _err(self, status: int, code: str, message: str) -> httpx.Response:
        return self._json(status, {"error": {"code": code, "message": message, "request_id": "req_x", "report": "ignored"}})

    def _future(self, result=None, error=None) -> str:
        fid = self._id("fut")
        created, (exec_s, self._exec) = self.server_t, (self._exec, None)
        completed = created
        if exec_s is not None:  # a billed call: it runs after the run's previous call
            completed = self.free_at = max(created, self.free_at) + exec_s
        stamp = (lambda t: datetime.fromtimestamp(t, timezone.utc).isoformat()) if self.timestamps else (lambda t: None)
        self.futures[fid] = {"id": fid, "status": "failed" if error else "completed", "result": result, "error": error,
                             "created_at": stamp(created), "completed_at": stamp(completed)}
        return fid

    def _bill_gpu(self) -> bool:
        if self.balance_usd <= 0:
            return False
        secs = math.ceil(self.gpu_s - 1e-9) if self.bill == "ceil" else self.gpu_s
        self.gpu_seconds += secs
        self.balance_usd -= secs * 7.0 / 3600
        self._exec = self.gpu_s
        return True

    # ------------------------------------------------------------------ the toy model
    def _probs(self, q: dict, steps: int) -> dict:
        keys = list(q["criteria"])
        base = [math.exp(((_h(str(q["criteria"][k])) % 1000) / 1000 - 0.5)) for k in keys]
        zb = sum(base)
        learned = [(self.table.get(str(q["criteria"][k]), [0, 0])[0] / max(1, self.table.get(str(q["criteria"][k]), [0, 1])[1])) + 1e-3 for k in keys]
        zl = sum(learned)
        w = min(0.9, steps / 2000)
        return {k: (1 - w) * b / zb + w * l / zl for k, b, l in zip(keys, base, learned)}

    def _answer(self, q: dict, steps: int) -> dict:
        p = self._probs(q, steps)
        top = max(p, key=p.get)
        n = len(p)
        return {"type": "choice", "choice": top, "probabilities": p, "confidence": (p[top] - 1 / n) / (1 - 1 / n)}

    # ------------------------------------------------------------------ validation (Endor's documented rules)
    def _question_ok(self, q) -> str:
        if not isinstance(q, dict) or q.get("type") != "choice" or not isinstance(q.get("criteria"), dict):
            return "a choice question needs criteria"
        if not 1 <= len(q["criteria"]) <= 64 or set(q) - {"type", "instructions", "criteria"}:
            return "64 options at most, no other fields"
        return ""

    def _datum_ok(self, d) -> str:
        if not isinstance(d, dict) or set(d) - {"state", "question", "target", "weight"} or "state" not in d:
            return "datum fields"
        why = self._question_ok(d.get("question"))
        if why:
            return why
        t, keys = d.get("target") or {}, list(d["question"]["criteria"])
        if ("label" in t) == ("probs" in t):
            return "target needs exactly one of label or probs"
        if "probs" in t and (set(t["probs"]) != set(keys) or min(t["probs"].values()) < 0 or abs(sum(t["probs"].values()) - 1) > 0.02):
            return "target.probs must cover the options and sum to 1"
        if not isinstance(d.get("weight", 1.0), (int, float)) or d.get("weight", 1.0) < 0:
            return "weight"
        return ""

    # ------------------------------------------------------------------ the handler
    def handler(self, request: httpx.Request) -> httpx.Response:
        raw = request.content or b""
        if request.headers.get("content-encoding") == "gzip":
            import gzip
            raw = gzip.decompress(raw)
        body = json.loads(raw) if raw else None
        self.server_t, self._exec = self.server_t + self.rtt, None
        self.requests.append({"method": request.method, "host": request.url.host, "path": request.url.path, "query": str(request.url.query, "ascii"),
                              "headers": dict(request.headers), "body": body, "raw": raw})
        if request.url.host == self.STORAGE:
            if "authorization" in request.headers:
                self.violations.append("a storage request carried credentials")
            data = self.files.get(request.url.path)
            return httpx.Response(200, content=data) if data is not None else httpx.Response(403)
        if request.url.host != self.API:
            self.violations.append(f"a request to {request.url.host}")
            return httpx.Response(404)
        if request.headers.get("authorization") != f"Bearer {self.key}":
            return self._err(401, "unauthorized", "missing or unknown API key")
        m, path = request.method, request.url.path
        if m == "GET" and path == "/v1/whoami":
            return self._json(200, {"org_id": "org_fake", "key_id": "key_fake", "user_id": None, "limits": {"decisions_per_minute": self.dpm, "max_active_runs": 25}, "managed_projects": False})
        if m == "GET" and path == "/v1/balance":
            return self._json(200, {"balance_usd": round(self.balance_start if self.frozen_balance else self.balance_usd, 6)})
        if m == "GET" and path == "/v1/base_models":
            return self._json(200, {"base_models": [{"id": "gliner2.5-decide", "provider": "fake", "params": "fake", "max_options": 64, "max_question_tokens": 512,
                                                     "default_rank": 16, "max_rank": 256, "lora_targets": ["fake.attention", "fake.mlp"], "contract": "fake-contract",
                                                     "contract_version": 1, "hf_repo": "fake/repo", "hf_revision": "0" * 40, "trainer_gpu": "fake",
                                                     "price_per_mtok_decide": 0.005, "price_per_gpu_hour": 7.0}]})
        if m == "GET" and path == "/v1/usage":
            return self._json(200, [{"hour": _now(), "kind": "train", "project": "trial-a", "gpu_seconds": self.gpu_seconds, "cost_usd": self.gpu_seconds * 7 / 3600},
                                    {"hour": _now(), "kind": "decide", "project": "trial-a", "input_tokens": self.tokens, "cost_usd": self.tokens * 0.005e-6}])
        if (mm := re.fullmatch(r"/v1/projects/([^/]+)", path)) and m == "GET":
            p = self.projects.get(mm.group(1))
            return self._json(200, p) if p else self._err(404, "not_found", "no such project")
        if path == "/v1/projects" and m == "POST":
            if body["name"] in self.projects:
                return self._err(409, "conflict", "name taken")
            self.projects[body["name"]] = {"name": body["name"], "kind": body["kind"], "base_models": list(body["base_models"]), "created_at": _now()}
            return self._json(201, self.projects[body["name"]])
        if (mm := re.fullmatch(r"/v1/projects/([^/]+)/runs", path)) and m == "POST":
            if self.balance_usd <= 0:
                return self._err(402, "insufficient_balance", "add credit")
            rid = self._id("run")
            parent = self.models.get(f"{mm.group(1)}/{body['from_model']}") if body.get("from_model") else None
            if body.get("from_model") and parent is None:
                return self._err(404, "unknown_model", "no such model")
            self.runs[rid] = {"id": rid, "project": mm.group(1), "name": body.get("name"), "base_model": "gliner2.5-decide", "lora": body["lora"] or (parent or {}).get("lora", {}),
                              "status": "ready", "step": parent["step"] if parent else 0, "next_seq_id": 0, "created_at": _now(), "ready_future_id": self._future({}),
                              "total_steps": body.get("total_steps"), "pending": [], "body": body}
            return self._json(201, {k: v for k, v in self.runs[rid].items() if k not in ("pending", "body")})
        if (mm := re.fullmatch(r"/v1/runs/([^/]+)(/[a-z_]+)?", path)):
            run = self.runs.get(mm.group(1))
            if run is None:
                return self._err(404, "not_found", "no such run")
            op = (mm.group(2) or "")[1:]
            view = {k: v for k, v in run.items() if k not in ("pending", "body")}
            if m == "GET" and not op:
                return self._json(200, view)
            if op == "heartbeat":
                return self._json(204)
            if op == "close":
                run["status"] = "closed"
                view["status"] = "closed"
                return self._json(200, view)
            if run["status"] == "closed":
                return self._err(409, "invalid_state", "the run is closed")
            if body.get("seq_id") != run["next_seq_id"]:
                self.violations.append(f"seq_id {body.get('seq_id')} where {run['next_seq_id']} was next")
                return self._err(409, "seq_conflict", "out of order")
            if op in ("forward_backward", "optim_step", "predict", "save_checkpoint", "forward") and not self._bill_gpu():
                return self._err(402, "insufficient_balance", "add credit")
            if op == "save_checkpoint" and f"{run['project']}/{body['name']}" in self.models:
                return self._err(409, "conflict", "the name is used")
            run["next_seq_id"] += 1
            if self.hang is not None and self.hang == (op, run["step"]):
                self.hang = None
                fid = self._future({})
                self.futures[fid].update(status="running", result=None, completed_at=None)
                return self._json(202, {"future_id": fid})
            if op == "forward_backward":
                for i, d in enumerate(body["data"]):
                    if self.refuse_datum is not None and self.refuse_datum(d):
                        return self._err(422, "invalid_datum", "the datum does not fit the model's 512-token window")
                    why = self._datum_ok(d)
                    if why:
                        self.violations.append(f"datum {i}: {why}")
                        return self._err(422, "invalid_datum", why)
                outs = []
                for d in body["data"]:
                    p = self._probs(d["question"], run["step"])
                    y = d["target"]["probs"]
                    outs.append({"probabilities": p, "loss": -sum(y[k] * math.log(max(1e-9, p[k])) for k in y if y[k] > 0)})
                    run["pending"].append(d)
                w = sum(d["weight"] for d in body["data"])
                loss = sum(o["loss"] * d["weight"] for o, d in zip(outs, body["data"])) / w
                return self._json(202, {"future_id": self._future({"outputs": outs, "metrics": {"loss:sum": loss * w, "weight:sum": w, "loss:mean": loss, "accuracy": 0.5, "n": len(outs)}})})
            if op == "optim_step":
                a = body["adam_params"]
                if set(a) != {"learning_rate", "beta1", "beta2", "eps", "weight_decay", "grad_clip_norm"}:
                    self.violations.append("adam_params fields")
                if not run["pending"]:
                    return self._json(202, {"future_id": self._future(error={"code": "no_gradients", "message": "nothing accumulated"})})
                if self.fail_optim_at is not None and run["step"] == self.fail_optim_at:
                    self.fail_optim_at = None  # one lost trainer, not a broken one
                    return self._json(202, {"future_id": self._future(error={"code": "trainer_lost", "message": "the trainer is gone; start a new run from your last saved model"})})
                for d in run["pending"]:
                    for k, p in d["target"]["probs"].items():
                        cell = self.table.setdefault(str(d["question"]["criteria"][k]), [0.0, 0])
                        cell[0] += p; cell[1] += 1
                run["pending"] = []
                run["step"] += 1
                lr = a["learning_rate"] if self.lr_echo is None else self.lr_echo(a["learning_rate"])
                return self._json(202, {"future_id": self._future({"step": run["step"], "grad_norm": 0.5, "learning_rate": lr})})
            if op == "predict":
                answers = []
                for r in body["rows"]:
                    why = self._question_ok(r["questions"].get("action"))
                    if why or set(r) != {"state", "questions"}:
                        self.violations.append(f"predict row: {why or 'fields'}")
                    answers.append({name: self._answer(q, run["step"]) for name, q in r["questions"].items()})
                return self._json(202, {"future_id": self._future({"answers": answers})})
            if op == "save_checkpoint":
                mid = f"{run['project']}/{body['name']}"
                self.models[mid] = {"id": mid, "step": run["step"], "lora": run["lora"], "has_optimizer": body["include_optimizer"], "run": run["id"]}
                return self._json(202, {"future_id": self._future({"model": mid})})
            return self._err(404, "not_found", f"no route {op}")
        if (mm := re.fullmatch(r"/v1/futures/([^/]+)", path)) and m == "GET":
            f = self.futures.get(mm.group(1))
            if f and f["status"] == "running":
                time.sleep(0.01)  # stands in for the server's long poll (wait_s)
            return self._json(200, f) if f else self._err(404, "not_found", "no such future")
        if path == "/v1/futures/retrieve" and m == "POST":
            if any(self.futures[i]["status"] == "running" for i in body["ids"]):
                time.sleep(0.01)
            return self._json(200, [self.futures[i] for i in body["ids"]])
        if path == "/v1/systemone" and m == "POST":
            if self.balance_usd <= 0:
                return self._err(402, "insufficient_balance", "add credit")
            q = body["questions"]["action"]
            why = self._question_ok(q)
            if why:
                return self._err(422, "invalid_input", why)
            tokens = len(json.dumps(body["state"]) + json.dumps(q)) // 4
            if self.refuse(body["state"], q):
                return self._err(422, "invalid_options", "the question does not fit the model's 512-token window")
            self.tokens += tokens
            self.balance_usd -= tokens * 0.005e-6
            return self._json(200, {"model": body["model"], "answers": {"action": self._answer(q, 0)}, "usage": {"input_tokens": tokens, "output_tokens": 0}})
        if (mm := re.fullmatch(r"/v1/projects/([^/]+)/models/([^/]+)/download", path)) and m == "GET":
            model = self.models.get(f"{mm.group(1)}/{mm.group(2)}")
            if model is None:
                return self._err(404, "not_found", "no such model")
            files = {"adapter_model.safetensors": b"FAKE-SAFETENSORS-" + model["id"].encode() * 64,
                     "adapter_config.json": json.dumps({"r": 16, "lora_alpha": 32, "base_model_name_or_path": "fake/repo", "revision": "0" * 40, "fake": True}).encode(),
                     "endor_manifest.json": json.dumps({"base_model": "gliner2.5-decide", "hf_repo": "fake/repo", "hf_revision": "0" * 40, "contract": "fake-contract",
                                                        "contract_version": 1, "option_ids": None, "lora": model["lora"], "training_run_id": model["run"], "step": model["step"], "fake": True}).encode()}
            out = []
            for name, data in files.items():
                p = f"/{self._id('obj')}/{name}"
                self.files[p] = data
                out.append({"name": name, "url": f"https://{self.STORAGE}{p}?X-Amz-Signature=fake", "size_bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
            return self._json(200, {"files": out})
        self.violations.append(f"unknown route {m} {path}")
        return self._err(404, "not_found", "no route")
