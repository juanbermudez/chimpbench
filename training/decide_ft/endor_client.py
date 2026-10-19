"""The Endor training test's client wrapper and gate (docs/staging/endor-train.md §3). Runs under the Endor SDK's own
environment (/Volumes/Drive/chimpbench/endor-env, endor 0.8.0, Python 3.12).

- The base URL is pinned here; ENDOR_BASE_URL is ignored (the client is given the URL, and the gate refuses any other
  host that would carry the key). The client refuses to start when ENDOR_API_KEY is exported, so the key can never
  reach a child process.
- The key is read only by `open_client`, from the absolute path of the main checkout's .env, and lives only inside the
  SDK client and the gate. It is never printed, logged, put in a receipt, a URL, an exception or the status file.
- EndorClient(capture=False, report_latency=False): no git commit, no dirty flag, no latency header.
- `user_report` is never called: the SDK's error strings invite it, and the report route is closed at the gate.
- The gate is an httpx transport under the SDK, so it sees every byte that would leave. It allows only the routes this
  test uses, checks each body's fields against what endor_wire builds (an allowlist), refuses a body or a header that
  holds the key, a local path, the host name or a row id, refuses the key on any host but Endor's API and any request
  to the storage host outside a model download, books every call with the spend guard and writes a receipt per call
  (request sha256, Endor's request id, status, seconds, dollars booked).
"""
from __future__ import annotations

import contextlib
import gzip
import hashlib
import json
import os
import re
import socket
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import endor  # noqa: E402
from endor import _user_report  # noqa: E402

import endor_wire as W  # noqa: E402
from endor_guard import BILLED, SpendGuard  # noqa: E402

BASE_URL = "https://api.endor.thetokencompany.com"
API_HOST = "api.endor.thetokencompany.com"
KEY_FILE = Path("/Volumes/Drive/chimpbench/MGOGO/.env")
SDK_VERSION = "0.8.0"
P = re.escape(W.PROJECT)
ID = r"[A-Za-z0-9_.:-]{1,80}"
M = r"i[1-3]-e[1-3]"
# (method, path pattern, body check, kind): kind "train" is a billed training call, "decision" a billed decision
ROUTES: list[tuple[str, re.Pattern, str, str]] = [(m, re.compile(p), c, k) for m, p, c, k in [
    ("GET", r"/v1/whoami", "none", ""), ("GET", r"/v1/balance", "none", ""), ("GET", r"/v1/base_models", "none", ""),
    ("GET", r"/v1/models", "none", ""),  # the SDK's fallback for the base-model list on an older API
    ("GET", r"/v1/usage", "none", ""), ("GET", rf"/v1/projects/{P}", "none", ""), ("POST", r"/v1/projects", "project", ""),
    ("POST", rf"/v1/projects/{P}/base_models", "base", ""), ("POST", rf"/v1/projects/{P}/runs", "run", "run"),
    ("GET", rf"/v1/runs/{ID}", "none", ""), ("POST", rf"/v1/runs/{ID}/forward_backward", "fb", "train"),
    ("POST", rf"/v1/runs/{ID}/optim_step", "optim", "train"), ("POST", rf"/v1/runs/{ID}/predict", "predict", "train"),
    ("POST", rf"/v1/runs/{ID}/save_checkpoint", "save", "train"), ("POST", rf"/v1/runs/{ID}/close", "none", "close"),
    ("POST", rf"/v1/runs/{ID}/heartbeat", "none", ""), ("GET", rf"/v1/futures/{ID}", "none", ""),
    ("POST", r"/v1/futures/retrieve", "retrieve", ""), ("POST", rf"/v1/futures/{ID}/cancel", "none", ""),
    ("POST", r"/v1/systemone", "decision", "decision"), ("GET", rf"/v1/projects/{P}/models/{M}/download", "none", ""),
]]
HEADERS = frozenset({"host", "accept", "accept-encoding", "connection", "content-length", "content-type", "content-encoding",
                     "user-agent", "authorization", "x-endor-sdk", "x-endor-sdk-version", "x-endor-runtime",
                     "x-endor-sdk-interface", "x-endor-sdk-method", "x-endor-client-request-id", "x-endor-retry-count",
                     "idempotency-key"})
STORAGE_HEADERS = frozenset({"host", "accept", "accept-encoding", "connection", "user-agent"})


class GateRefused(RuntimeError):
    """A request the gate would not let leave. Not an httpx error, so the SDK never retries it."""


class EndorCallError(RuntimeError):
    """An Endor failure with the SDK's report line cut off and the key scrubbed."""

    def __init__(self, kind: str, message: str, status: int | None = None, code: str | None = None, request_id: str | None = None):
        super().__init__(message)
        self.kind, self.status, self.code, self.request_id = kind, status, code, request_id


def _no_report(*_a, **_k):
    raise GateRefused("user_report is never called in this test (docs/staging/endor-train.md §2)")


# The SDK's report functions are replaced on import: an error string that invites a report is never followed.
endor.user_report = endor.user_report_async = _no_report  # type: ignore[assignment]
_user_report.send = _user_report.send_async = _no_report  # type: ignore[assignment]
endor.EndorClient.user_report = endor.EndorClient.user_report_async = _no_report  # type: ignore[assignment]


def read_key(path: Path = KEY_FILE) -> str:
    """The one place the key is read: one ENDOR_API_KEY line of the main checkout's .env. Messages never hold it."""
    if os.environ.get("ENDOR_API_KEY"):
        raise GateRefused("ENDOR_API_KEY is exported in this shell; unset it (the key is read only from the .env file, so no child process can inherit it)")
    lines = [ln.strip() for ln in path.read_text().splitlines()]
    found = [ln.split("=", 1)[1] for ln in (l.removeprefix("export ").strip() for l in lines) if ln.startswith("ENDOR_API_KEY=")]
    if len(found) != 1:
        raise GateRefused("the main checkout's .env must hold exactly one ENDOR_API_KEY line")
    key = found[0].strip().strip('"').strip("'")
    if not key.startswith("edk_") or not key.isascii() or not key.isprintable() or " " in key:
        raise GateRefused("ENDOR_API_KEY in the .env is not an Endor key (edk_...)")
    return key


def scrub(text: str, secrets: tuple[str, ...]) -> str:
    """An error's text without the SDK's report line and without any secret, cut to 400 characters."""
    text = str(text).split("If Endor did something you didn't expect")[0].strip()
    for s in secrets:
        if s:
            text = text.replace(s, "[redacted]")
    return text[:400]


def call_error(exc: BaseException, secrets: tuple[str, ...]) -> EndorCallError:
    if isinstance(exc, endor.APIError):
        return EndorCallError(type(exc).__name__, scrub(f"{exc.endpoint}: {exc.status} {exc.code}: {exc.message}", secrets), exc.status, exc.code, exc.request_id)
    if isinstance(exc, endor.OperationFailedError):
        return EndorCallError(type(exc).__name__, scrub(f"{exc.code}: {exc.message}", secrets), None, exc.code)
    if isinstance(exc, endor.EndorError):
        return EndorCallError(type(exc).__name__, scrub(exc._text(), secrets))
    return EndorCallError(type(exc).__name__, scrub(str(exc), secrets))


class Receipts:
    """One JSON line per HTTP call, never the key, never a storage link."""

    def __init__(self, path: Path):
        self.path, self.lock = path, threading.Lock()
        path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, rec: dict) -> None:
        with self.lock, self.path.open("a") as f:
            f.write(json.dumps(rec, sort_keys=True) + "\n")


def forbidden_markers(extra: tuple[str, ...] = ()) -> tuple[str, ...]:
    """Text that must never be in a body, a URL or a header: local paths, this machine's name, row ids and our files."""
    host = socket.gethostname()
    marks = ["/Volumes/", "/Users/", "/private/", "/tmp/", "/home/", "file://", ".claude", "artifacts/", "data/raw",
             "r16:", "decisionId", "contextHash", "packetHash", "diagnostics", ".jsonl", "chimpbench", "MGOGO", host]
    if "." in host:
        marks.append(host.split(".")[0])
    # a marker made only of hex digits would be found in request ids and hashes by chance
    return tuple(m for m in marks + list(extra) if m and len(m) >= 4 and not re.fullmatch(r"[0-9a-fA-F-]+", m))


class Gate(httpx.BaseTransport):
    def __init__(self, inner: httpx.BaseTransport, key: str, receipts: Receipts, guard: SpendGuard, *, storage_hosts: tuple[str, ...] = (),
                 allowed: frozenset[str] | None = None):
        self._inner, self._key, self.receipts, self.guard = inner, key, receipts, guard
        self.allowed = allowed  # the sha256 of every packet that may leave (endor_wire.allowed_packets); None: shape checks only
        self.markers = forbidden_markers()
        self._downloads = 0
        self._storage = storage_hosts  # empty: any https host, only during a download
        self.lock = threading.Lock()
        self.refusals = 0

    @contextlib.contextmanager
    def downloads(self):
        """The only window in which a request may go to the storage host (presigned model files, no key)."""
        with self.lock:
            self._downloads += 1
        try:
            yield
        finally:
            with self.lock:
                self._downloads -= 1

    # ------------------------------------------------------------------ checks
    def _refuse(self, why: str) -> None:
        self.refusals += 1
        raise GateRefused(f"gate: {why}")

    def _scan(self, what: str, text: str) -> None:
        if self._key in text:
            self._refuse(f"the key in {what}")
        for m in self.markers:
            if m in text:
                self._refuse(f"{what} holds a forbidden marker ({'host name' if m in socket.gethostname() else m})")

    def _packet(self, state, question) -> None:
        W.check_state(state)
        W.check_question(question)
        if self.allowed is not None and W.packet_hash(state, question) not in self.allowed:
            self._refuse("a packet that is not one of the exported rows")

    def _route(self, method: str, path: str) -> tuple[str, str]:
        for m, pat, check, kind in ROUTES:
            if m == method and pat.fullmatch(path):
                return check, kind
        self._refuse(f"{method} {_template(path)} is not a route of this test")
        raise AssertionError

    def _body(self, request: httpx.Request) -> tuple[bytes, object]:
        raw = request.content or b""
        if request.headers.get("content-encoding") == "gzip":
            raw = gzip.decompress(raw)
        return raw, (json.loads(raw) if raw else None)

    def _check_body(self, check: str, body) -> None:
        def keys(d, want, optional=()):
            if not isinstance(d, dict) or not set(want) <= set(d) <= set(want) | set(optional):
                self._refuse(f"a {check} body with other fields")
        try:
            if check == "none":
                if body is not None:
                    self._refuse("a body where none belongs")
            elif check == "decision":
                keys(body, ["model", "state", "questions", "exclude_from_training"])
                if body["exclude_from_training"] is not True or body["model"] != f"{W.PROJECT}/{W.BASE_MODEL}" or list(body["questions"]) != [W.QUESTION]:
                    self._refuse("a decision that is not the fit check's (untouched base, excluded from training)")
                self._packet(body["state"], body["questions"][W.QUESTION])
            elif check == "fb":
                keys(body, ["data", "loss_fn", "seq_id"])
                if body["loss_fn"] != "cross_entropy" or not 1 <= len(body["data"]) <= W.RECIPE["batch"] * W.RECIPE["accum"]:
                    self._refuse("a training call that is not one step of soft cross-entropy")
                for d in body["data"]:
                    keys(d, ["state", "question", "target", "weight"])
                    keys(d["target"], ["probs"])
                    self._packet(d["state"], d["question"])
                    if list(d["target"]["probs"]) != list(d["question"]["criteria"]) or d["weight"] not in (1.0, 2.0):
                        self._refuse("a datum whose target or weight is not train_r11's")
            elif check == "optim":
                keys(body, ["adam_params", "seq_id"])
                a = body["adam_params"]
                want = W.adam_params(a.get("learning_rate", -1.0) if isinstance(a, dict) else -1.0)
                if a != want or not 0 < a["learning_rate"] <= W.RECIPE["lr"]:
                    self._refuse("an optimizer step without the full registered AdamW settings")
            elif check == "predict":
                keys(body, ["rows", "seq_id"])
                for r in body["rows"]:
                    keys(r, ["state", "questions"])
                    if list(r["questions"]) != [W.QUESTION]:
                        self._refuse("a predict row with another question")
                    self._packet(r["state"], r["questions"][W.QUESTION])
            elif check == "save":
                keys(body, ["name", "include_optimizer", "ttl_seconds", "user_metadata", "seq_id"])
                if not W.CHECKPOINT.match(str(body["name"])) or body["include_optimizer"] is not True or body["ttl_seconds"] != W.TTL_SECONDS or body["user_metadata"] != {}:
                    self._refuse("a checkpoint that is not i<n>-e<n> with its optimizer, a 7-day lifetime and no metadata")
            elif check == "run":
                keys(body, ["base_model", "from_model", "include_optimizer", "lora", "name", "tags", "config", "user_metadata"], ["total_steps", "wandb"])
                if body["tags"] != [] or body["config"] != {} or body["user_metadata"] != {} or body.get("wandb") is not False or not W.RUN_NAME.match(str(body["name"])):
                    self._refuse("a run with tags, config, metadata, Weights & Biases or a name that is not neutral")
                fresh = {"rank": W.RECIPE["rank"], "alpha": W.RECIPE["alpha"], "seed": W.RECIPE["seed"], "train_attn": True, "train_mlp": True, "train_readout": False}
                ok_fresh = body["base_model"] == W.BASE_MODEL and body["from_model"] is None and body["include_optimizer"] is False and body["lora"] == fresh
                ok_resume = body["base_model"] is None and W.CHECKPOINT.match(str(body["from_model"])) and body["include_optimizer"] is True and body["lora"] == {}
                if not (ok_fresh or ok_resume):
                    self._refuse("a run that is not the registered LoRA (rank 16, alpha 32, seed 7) or its resume")
            elif check == "project":
                if body != {"name": W.PROJECT, "description": None, "kind": "custom", "base_models": [W.BASE_MODEL]}:
                    self._refuse("a project that is not the neutral custom project on gliner2.5-decide")
            elif check == "base":
                if body != {"base_model": W.BASE_MODEL}:
                    self._refuse("another base model")
            elif check == "retrieve":
                keys(body, ["ids"])
            else:
                self._refuse(f"no check for {check}")
        except W.WireError as e:
            self._refuse(f"a {check} body that endor_wire would not build ({e})")
        except (KeyError, TypeError, AttributeError):
            self._refuse(f"a malformed {check} body")

    # ------------------------------------------------------------------ the transport
    def handle_request(self, request: httpx.Request) -> httpx.Response:
        t0, url = time.monotonic(), request.url
        if url.scheme != "https":
            self._refuse("a request that is not HTTPS")
        auth = request.headers.get("authorization")
        if url.host != API_HOST:
            # model files: presigned storage links, fetched by the SDK with a client of its own and no Endor header
            if self._downloads <= 0 or request.method != "GET" or auth is not None or (self._storage and url.host not in self._storage) \
                    or not set(k.lower() for k in request.headers) <= STORAGE_HEADERS or request.content:
                self._refuse("a request to a host other than Endor's API outside a model download, or with credentials")
            response = self._inner.handle_request(request)
            self.receipts.write({"at": _now(), "method": "GET", "route": "storage (model file)", "status": response.status_code,
                                 "seconds": round(time.monotonic() - t0, 3), "usd": 0.0})
            return response
        if auth != f"Bearer {self._key}":
            self._refuse("a request to Endor's API without this test's key")
        for name, value in request.headers.items():
            if name.lower() not in HEADERS:
                self._refuse(f"a header this test never sends: {name}")
            if name.lower() != "authorization":
                self._scan(f"the header {name}", value)
        self._scan("the URL", str(url))
        check, kind = self._route(request.method, url.path)
        raw, body = self._body(request)
        self._scan("the body", raw.decode("utf-8", "replace"))
        self._check_body(check, body)
        if kind in ("train", "decision", "run") and not self.guard.billed_allowed():
            self._refuse("the spend guard allows no further billed call (the cap or the kill switch)")
        sha = hashlib.sha256(raw).hexdigest() if raw else None
        status, rid, usd, note = None, None, 0.0, None
        try:
            response = self._inner.handle_request(request)
            response.read()
            status, rid = response.status_code, response.headers.get("x-request-id")
            usd, note = self._book(kind, url.path, raw, response)
            self.guard.touch()  # an answer from Endor: the runs this process holds are still held
            return response
        except BaseException as e:
            note = type(e).__name__
            raise
        finally:
            self.receipts.write({"at": _now(), "method": request.method, "route": _template(url.path), "sha256": sha,
                                 "bytes": len(raw), "status": status, "request_id": rid,
                                 "seconds": round(time.monotonic() - t0, 3), "usd": round(usd, 8), **({"note": note} if note else {})})

    def _book(self, kind: str, path: str, raw: bytes, response: httpx.Response) -> tuple[float, str | None]:
        ok = 200 <= response.status_code < 300
        data = None
        if ok and response.content:
            with contextlib.suppress(ValueError):
                data = response.json()
        if kind == "train" and ok:
            return self.guard.book_call(path.split("/")[3]), None
        if kind == "run" and ok and isinstance(data, dict) and data.get("id"):
            self.guard.run_opened(str(data["id"]))
            return 0.0, None
        if kind == "close" and ok:
            self.guard.run_closed(path.split("/")[3])
            return 0.0, None
        if kind == "decision" and response.status_code not in (400, 401, 403, 404, 409, 413, 422):
            tokens = (data or {}).get("usage", {}).get("input_tokens") if isinstance(data, dict) else None
            return self.guard.book_decision(int(tokens) if isinstance(tokens, int) and tokens > 0 else len(raw)), None
        if path == "/v1/balance" and ok and isinstance(data, dict):
            self.guard.balance(data.get("balance_usd"))
        return 0.0, None

    def close(self) -> None:
        """Every httpx client over the gate closes it when it is done, the SDK's short-lived download client too; the
        connections underneath must outlive that, so only `shutdown` closes them."""

    def shutdown(self) -> None:
        self._inner.close()


def _template(path: str) -> str:
    parts = path.split("/")
    if len(parts) > 3 and parts[2] in ("runs", "futures") and parts[3] not in ("retrieve",):
        parts[3] = "{id}"
    return "/".join(parts)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def make_client(key: str, gate: Gate) -> endor.EndorClient:
    if endor.__version__ != SDK_VERSION:
        raise GateRefused(f"this test is written against endor {SDK_VERSION}; found {endor.__version__}")
    # base_url given here, so ENDOR_BASE_URL is never read; capture and latency off; the SDK's default retries
    return endor.EndorClient(api_key=key, base_url=BASE_URL, capture=False, report_latency=False, transport=gate, gzip=True)


class Connection:
    """The client, its gate and its guard. Real: the key from the main checkout's .env and the network. Fake: a fake key
    and the fake Endor's handler (nothing can leave: httpx.MockTransport never opens a socket)."""

    def __init__(self, root: Path, guard: SpendGuard, fake=None, allowed: frozenset[str] | None = None):
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        self.receipts = Receipts(root / "receipts" / f"{stamp}-{os.getpid()}.jsonl")
        self.guard = guard
        if fake is not None:
            key, inner, storage = fake.key, httpx.MockTransport(fake.handler), (fake.STORAGE,)
        else:
            key, inner, storage = read_key(), httpx.HTTPTransport(retries=0), ()
        self.gate = Gate(inner, key, self.receipts, guard, storage_hosts=storage, allowed=allowed)
        self.client = make_client(key, self.gate)
        self._secrets = (key,)
        del key

    def error(self, exc: BaseException) -> EndorCallError:
        return call_error(exc, self._secrets)

    def close(self) -> None:
        with contextlib.suppress(Exception):
            self.client.close()
        with contextlib.suppress(Exception):
            self.gate.shutdown()
