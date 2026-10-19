# The Endor training test: R16's round-zero rows trained on Endor's gliner2.5-decide (registration)

Branch `endor-test` from `track-e` fcc1ae8. Registered 19 October 2026, written from 06:37 EDT (times from `date`),
**before any code of this test and before anything is sent.** The agent that writes this sends nothing to Endor, never
reads the key, and starts no model process: the code is built and tested against a fake Endor; the integrator runs it.

**The name every result of this test carries: "rules-taught model on the R15 menu, trained on Endor (gliner2.5-decide,
LoRA)".** The rows come from simulated rules worlds; the rules wrote the menu and the labels. Nothing here is about
wild chimpanzees, and nothing here says how the model would behave in the app.

## 1. The user's words, and how they are read

On 19 October 2026 the user wrote, verbatim and in this order:

1. "Do the real training run on endor, but i want to make sure the app is at the point where the model training is the
   main driver for behaviour, can you confirm ?"
2. "i dont care about the local, I trust endor works, run the trainging."

Read as: train on Endor now. **No local twin, no local scoring, no local comparison** in this test, and none of the
earlier plan's local gates (its S0, the base checked against our local base, and S2, the adapter checked here after
download). The adapter Endor trains is downloaded and kept, **not loaded** here. The app, the simulation, the packets
and every local model path stay as they are. The cap is **$10** (the account holds the user's $100 prepaid credit).
**Endor's data terms have not been reviewed by the user**: they sit behind sign-in, and the parent company's public
privacy notice allows training on uploaded customer content; whether it covers Endor is not known. This is recorded
here and in the report. The 7 October ruling ("no cloud machine run things locally") is set aside for this one
training, as the plan's entry of 19 October records; serving stays local.

## 2. The data, and what is sent

**Two files, read-only, checked by sha256 against their manifest before anything is read further:**

| file (in `.claude/worktrees/bench-r16/artifacts/r16/ft0/`) | sha256 | rows |
| --- | --- | --- |
| `contexts/train.jsonl` | `4175e6bd4ccd395ec08479bb59fe12c0b88c0fdb39abdd5055dc6c9d04fadb80` | 4,402 (2,504 kind, 1,898 target), seeds 48 and 7, 61 animals |
| `contexts/dev.jsonl` | `1ecd363048aa47ab24f919fe25d054cb12bbcbc1685b10d1d8f9f3715564fa79` | 456 (265 kind, 191 target), seeds 48 and 7, 15 animals |
| `contexts/manifest.json` (read, never sent) | `48344b7665bd3b2e50e384f052c2632f85833c002008c6b16a3f97c38774510e` | names both outputs with the hashes above |
| `preflight-failed-20261018-1141/tokens.json` (read, never sent) | `9cab90002cc7d0a3ac409b1454f31473b4b16a6e3cc68e768218f1019e757d36` | our real token count of every packet, original and permuted |

The token file comes from R16's preflight of 18 October, which failed on a numeric precision check, not on tokens; it
was taken on these two files (its identity names the same two hashes) with the model's own tokenizer and the serving
render. "Our count" below is the larger of a row's original and permuted counts (they are equal on every row).

**Allowlist, not denylist.** Seeds {48, 7} only; those two files only; every row re-checked by stage R16's own reader
(`scripts/lib/r16-assemble.ts` `rowRefusal`, which re-renders the packet from its context byte for byte through stage
R15's check); a row must be in its own split. **Rows over 512 tokens by our count are dropped before anything is
sent**: 517 of the 1,898 training target rows (no kind row) and 48 of the 191 development target rows. That leaves
**3,885 training rows** (seed 48: 1,291 kind, 694 target; seed 7: 1,213 kind, 687 target) and **408 development
rows** (seed 48: 132 kind, 75 target; seed 7: 133 kind, 68 target), before the fit check.

**What leaves the machine, in full** (built by `training/decide_ft/endor_wire.py`; nothing else is ever put in a body):

- a training datum: `{"state": <the packet's state>, "question": {"type": "choice", "instructions": <the fixed
  sentence>, "criteria": {"c0": <option text>, ...}}, "target": {"probs": {"c0": p, ...}}, "weight": w}`;
- a decision (the fit check): `{"model": "<project>/gliner2.5-decide", "state": ..., "questions": {"action": <the
  question>}, "exclude_from_training": true}`;
- a development row for `run.predict`: `{"state": ..., "questions": {"action": <the question>}}`, **without its label**;
- the run's settings (base model, rank 16, alpha 32, LoRA seed 7, a neutral run name, no tags, no config, no metadata,
  Weights & Biases off), the learning rate and Adam settings of each step, neutral checkpoint names, and the account
  calls (who am I, balance, the base model list, usage).

No row id, seed, animal number, context, hash, manifest, path, host name, git commit, label of a development row or
anything of seed 21 is in any body. The state holds the simulation's invented animal names and its own words; nothing
from `data/raw` or any wild record is in a packet. **Never sent:** seed 21 and every held-out set (H-R, H-S, R11's test
files), anything from `data/raw` or derived from a wild record, manifests, paths, host names, the key, receipts and
logs. The SDK's `user_report` is never called, whatever an error message says.

## 3. The key and the endpoint

- The base URL is pinned in code to `https://api.endor.thetokencompany.com`; `ENDOR_BASE_URL` is ignored (and the
  client refuses to start if `ENDOR_API_KEY` is exported, so a key can never reach a child process).
- The key is read only inside the client, from the absolute path `/Volumes/Drive/chimpbench/MGOGO/.env`, and is never
  exported, printed, logged, or put in a receipt, URL, exception or status file.
- `EndorClient(capture=False, report_latency=False)`: no git commit, no dirty flag, no latency report.
- Every request passes one gate in our code (an `httpx` transport under the SDK) that refuses any other host with the
  key, any route we do not use (the report route above all), any body whose fields are not the ones listed in §2, any
  packet that is not one of the exported rows (by its sha256, both option orders of a training row), a body holding the
  key, a local path, the host name or a row id, and any request to the storage host (model downloads) that carries the
  key or comes outside a download.

## 4. The fit check (S1)

Before the training order is drawn, every exported packet (training and development, original option order) is sent
**once** as a decision to the project's untouched `gliner2.5-decide`, with `exclude_from_training` true. A 422 answer
(Endor's refusal of a question that does not fit its 512-token window, or any other refusal of the input) marks the
packet refused; any other failure is an operational failure and the check is resumed, not counted. **If more than 2%
of the exported training packets, or more than 2% of the exported development packets, are refused, the test stops**
and the refusals are recorded. Otherwise the refused rows are removed and only then is the training order drawn from
the remaining rows in file order. The refusal list is a length filter on our input, not an output used as a label.
The answers on the development packets give the untouched base's development numbers (decision path); a step-0
`run.predict` gives them again on the training path.

## 5. The recipe, and what Endor changes

Our recipe is `training/decide_ft/train_r11.py` as `train_r15.py` launches it (sha256 of `train_r11.py`
`36b0c2f18575234b001c8630c81b0d0705c3a7c95c7da35cebdda0114df4841a`):

| ours | on Endor |
| --- | --- |
| soft cross-entropy over the offered options, weight 1 | Endor's `cross_entropy` with a `probs` target (the label renormalised as `soft_loss.target_vector` does) |
| 3 epochs; every row in every epoch (no `epoch` field in round zero) | the same |
| each epoch: a coin per row from `random.Random(7)` (own or option-shuffled copy), then the same generator shuffles the order | the same, drawn here; the shuffled copy is `soft_loss.permuted_soft` seeded by crc32 of the row id |
| micro-batches of 2, 4 accumulated: 8 examples per optimizer step; an epoch's last step may be short | one `forward_backward` of the step's datums, then one `optim_step` |
| loss of a micro-batch divided by its size and by 4 | datum weights 1, and 2 for an example alone in the epoch's last micro-batch (the same ratios) |
| AdamW, lr peak 2e-4, betas 0.9 and 0.999, eps 1e-8, no weight decay | full `AdamParams` on every step: the same numbers (the SDK alone would send beta2 0.95 and eps 1e-12) |
| gradient clipping at norm 1.0 | `grad_clip_norm` 1.0 |
| `LambdaLR`: linear warm-up over int(0.1 × steps) steps, then linear decay toward 0 | the same learning rate computed here for each step and sent with it |
| LoRA rank 16, alpha 32, `torch.manual_seed(7)` | rank 16, alpha 32, `lora.seed` 7 |
| best epoch: lowest development soft cross-entropy | the same, from `run.predict` on the development packets, computed here |

**Gaps (Endor imposes them or does not say):**

1. *Rows.* Endor's gliner reads at most 512 tokens per question: R16 registered 4,402 training rows; this run trains on
   at most 3,885 (all kind rows, 1,381 of the 1,898 target rows), and develops on at most 408 of 456. The long target
   rows are the ones with many options and long descriptions, so the target phase is trained on its shorter half.
2. *Where the adapter sits.* Ours: the top 8 encoder layers (query, key, value, attention output, intermediate,
   output) and the two classifier layers, 50 modules. Endor's: "attention and MLP" switches only; its gliner targets
   (`lora_targets`) are given only by the authenticated base-model list (recorded at the start), probably every layer.
3. *The classifier head.* Ours carries LoRA on `classifier.0` and `classifier.2`; Endor's readout training exists only
   on another base, so the head is probably frozen or handled by its contract.
4. *Dropout* 0.05 in ours; not settable on Endor, not documented.
5. *Precision.* Ours bf16 autocast on MPS; Endor's training precision is not documented (bf16 is mentioned for training
   against serving).
6. *Initialization.* `lora.seed` 7 is sent; what it seeds is not documented, and it cannot equal torch's draw here.
7. *Input rendering.* Ours renders state and question through GHN's provider and `collate_fn_inference`; Endor renders
   them with its own unpublished contract. The weights it loads (`hf_repo`, `hf_revision`) are recorded at the start
   and not compared with ours.
8. *The softmax.* Ours is over the offered options with no temperature; Endor's readout (temperature, option codes) is
   its contract's.
9. *The last step of each epoch.* Same relative weights, but Endor averages by the weights' sum (6 for five examples)
   where ours divides by 8: that one step's gradient is 4/3 of ours before clipping.
10. *Clipping and AdamW internals.* Ours clips the global norm of the adapter's gradients with torch; Endor's
    `grad_clip_norm` and its AdamW are not documented beyond their names.
11. *Batching.* Ours pads micro-batches of 2; Endor receives 8 datums in one call. Numerics differ.
12. *Development scoring.* Ours scores with our model in fp16; here `run.predict` (Endor says it matches a saved model
    within a few hundredths in a probability). The base row comes from Endor's untouched base, not ours.
13. *Permuted copies.* The fit check sends original orders only; a permuted copy has the same texts and, by our count,
    the same length. A refusal of one during training is an operational failure.
14. *Reproducibility.* Endor promises no bit-identical rerun.

## 6. Money and stop rules

- **Cap $10 for the whole test** (fit check and every iteration together), kept in a ledger under `artifacts/endor`.
- The guard books every billed training call (`forward_backward`, `optim_step`, `predict`, `save_checkpoint`) at **at
  least one second** of GPU time, the run's open wall time if that is larger, and a 60-second minimum per run, at the
  larger of $7.00 an hour and the price the base-model list gives; decisions at the larger of $0.005 per million
  tokens and the listed price, on the tokens Endor reports (or 1.5 times our count when it reports none).
- It reads `GET /v1/balance` at the start, after the first, fifth and tenth steps (to measure the rate), every 25 steps,
  at each epoch's end, and after every step once 25 steps would cost a tenth of the cap; spent is the larger of what it
  booked and what the balance shows (if Endor's balance lags, the booking is the floor).
- **A projection after 50 steps** (and every 50 steps after): spent plus the cost per step so far times the steps left,
  plus each remaining epoch's predict and save. If that passes $9.50, the run stops at once.
- **It stops before $10**: before every step, if spent plus the cost of the next 25 steps at the measured rate plus a
  $0.50 reserve reaches $10, it stops. A 402 (balance used up) stops at once. The account must hold at least $11 at the
  start, so Endor's own refusal never cuts a step.
- A kill switch: the environment variable `MGOGO_ENDOR_KILL=1` or the file `artifacts/endor/KILL` stops at the next
  step. A wall limit of 3 hours per iteration.
- The run is closed in a `finally` block, whatever happens. **A checkpoint is saved at the end of every epoch** (with
  its optimizer state, a 7-day lifetime), so a stop keeps what was trained up to the last epoch.
- Expected cost: about 1,458 steps (3 × 486); at one second per call the floor is about $5.7; the fit check is about a
  cent. The projection decides, not this estimate.

## 7. What the run produces

- A saved Endor model per epoch (`<project>/i<iteration>-e1` to `-e3`), with optimizer state, expiring after 7 days.
- Per epoch: development soft cross-entropy and top-1 against the rules' label (the label's top option), overall and
  by phase (kind, target), computed here from `run.predict` on the development packets; the untouched base's numbers
  from the step-0 predict and from the fit-check answers; **the best epoch named** (lowest soft cross-entropy).
- The best epoch's adapter downloaded into `artifacts/endor/adapters/<model>/` (Endor's `adapter_model.safetensors`
  in fp32, `adapter_config.json`, `endor_manifest.json`, with our own `manifest.json` beside them). **Not loaded.**
- A short report (`artifacts/endor/report.md` and `.json`): time, dollars (booked, from the balance, from Endor's usage
  rows), development numbers by phase, refusals, the gaps above, and the name.
- A receipt per HTTP call under `artifacts/endor/receipts/` (request sha256, Endor's request id, status, seconds,
  dollars booked), the status file `artifacts/endor/status.json`, and logs. `artifacts/` is git-ignored.

**Reading.** The only statement this test can make: whether training on Endor lowered the development soft
cross-entropy against the rules' label below Endor's untouched base, by phase, at what time and cost. It says nothing
about our local model, about a twin trained here, or about the app.

## 8. Iterations

At most three. The second and third only for an operational failure (a lost trainer, a timeout, a refused permuted
copy, an Endor outage), never to retune, never after a money stop and never after the fit check's 2% stop. A later
iteration starts a new run from the last saved epoch with its optimizer state (`from_model`, `include_optimizer`) and
continues the same order and learning rates from there, or from scratch if no epoch was saved. Every iteration counts
against the same $10.

## 9. What is built (all tested against a fake Endor; nothing sent while building)

- `scripts/endor-export.ts`: the exporter (the allowlist, the sha256 checks, R16's reader, the token filter, the counts
  and the local list of what would be sent). Dry by default.
- `training/decide_ft/endor_wire.py`: the only builder of what is sent, the order and learning rates (train_r11's),
  and the development scoring.
- `training/decide_ft/endor_client.py`: the client wrapper and the gate.
- `training/decide_ft/endor_guard.py`: the spend guard and ledger.
- `training/decide_ft/endor_train.py`: the fit check, the training loop with per-epoch scoring, checkpoints and the
  download, the report and the status file.
- `training/decide_ft/fake_endor.py`: the fake Endor (an HTTP double under the real SDK), for the tests and the dry run.
- `scripts/endor-run.sh`: `check | export | fit | train | report | status | dry`, for a `screen` session.
- Tests: `training/decide_ft/test_endor.py` (the optimizer body, the order and permutation against train_r11.py itself
  for seed 7 pinned to its sha256, no key or path leaving, the guard stopping before $10) and
  `tests/endor-export.test.ts`.

## 10. For the integrator (written 07:16 EDT, 19 October, after the build)

**Built and tested against a fake Endor. Nothing has been sent to Endor and the key has not been read.**

### What the dry run showed

- **The exporter on the real files** (`scripts/endor-run.sh check`, nothing written): both files, the manifest and the
  token file matched their sha256; every row passed R16's reader. Training: 4,402 read, **3,885 kept** (seed 48:
  1,291 kind and 694 target; seed 7: 1,213 kind and 687 target), 517 target rows dropped as over 512 tokens (255 and
  262). Development: 456 read, **408 kept** (seed 48: 132 kind, 75 target; seed 7: 133 kind, 68 target), 48 target
  rows dropped (22 and 26). The written export (`artifacts/endor/export`, local) has train.jsonl
  `6402dbdbf28ef509d956e76de96545189793bcd48f4d446a636887ecf8faf5c8` and dev.jsonl
  `fe1481626328dbc0772869f52ee61c6ba74b76593a94f908641e48ec8ab7b0b5`.
- **The plan** (`scripts/endor-run.sh plan`, offline): 486 steps an epoch, 1,458 steps, 11,655 datums; each epoch ends
  on a step of five examples weighted 1, 1, 1, 1, 2; the learning rate rises over 145 steps to 2e-4 and falls to
  1.5e-7; the booking floor (a second a call) is $5.67. It prints one datum, one decision, one development row and one
  optimizer step exactly as they would be sent.
- **The whole path against the fake Endor** (`scripts/endor-run.sh dry`, under `artifacts/endor-dry`, about two
  minutes): the fit check sent 4,293 decisions; the fake refused 12 (0.3%, its own rule, not Endor's) and the check
  passed; the training ran 1,455 steps on the 3,873 rows left, in train_r11.py's order for seed 7 (checked against
  that file's own lines), with every learning rate as sent and echoed; three checkpoints, a development score each and
  a step-0 base score; the best epoch named and its files downloaded with our manifest, not loaded; the report written.
  The fake saw 4,298 and 4,455 requests with no violation (no key outside the API's Authorization header, no path,
  host name or row id, no report, no latency header, no git commit, no credentials to storage); the key is in no file
  the run wrote; the guard booked $5.68 against the fake's own $2.84.
- **Tests**: `training/decide_ft/test_endor.py` (26, the Endor SDK's Python) and `tests/endor-export.test.ts` (6) pass.

### The commands

From a frozen checkout of this branch, in a shell where `ENDOR_API_KEY` is **not** exported (the scripts refuse
otherwise; the client reads the key from `/Volumes/Drive/chimpbench/MGOGO/.env` itself):

```sh
cd /Volumes/Drive/chimpbench/MGOGO
git worktree add --detach .claude/worktrees/bench-endor endor-test
ln -s /Volumes/Drive/chimpbench/MGOGO/node_modules .claude/worktrees/bench-endor/node_modules
cd .claude/worktrees/bench-endor
scripts/endor-run.sh check          # sends nothing: the tests and the exporter's dry run (about 15 s)
scripts/endor-run.sh export         # writes artifacts/endor/export (local only)
scripts/endor-run.sh plan | head -40
screen -dmS endor-fit scripts/endor-run.sh fit      # SENDS (the fit check); then: scripts/endor-run.sh status
screen -dmS endor-train scripts/endor-run.sh train  # SENDS (the training); then: scripts/endor-run.sh status
scripts/endor-run.sh report         # artifacts/endor/report.md, from the files
```

- **fit** sends the account calls (who am I, balance, the base-model list), creates the project `trial-a` with
  `gliner2.5-decide` if it is missing, then each of the 4,293 exported packets once as a decision (no label, no id,
  `exclude_from_training` true). About 1.3 million input tokens, about one cent. Time: the organisation's decision rate
  sets it (the client uses 90% of it): about 80 minutes at 60 a minute, about 4 at 1,200 a minute, plus a cold start
  of 1 to 3 minutes. Exit 0 passed; **exit 3 when more than 2% of either file is refused (the test ends there)**;
  75 an operational failure (run `fit` again: it resumes); 130 the kill switch or a signal.
- **train** sends the run (rank 16, alpha 32, LoRA seed 7, name `run-1`, Weights & Biases off), a step-0 predict of the
  development packets, 1,458 `forward_backward` calls (up to 8 datums each) and 1,458 `optim_step` calls (the full
  AdamW settings), at each epoch's end a predict and a checkpoint (`i1-e1` to `i1-e3`, optimizer kept, 7-day
  lifetime), balance reads, the close, the download of the best epoch and Endor's usage rows. Cost: the guard books at
  least $5.7 (a second a call); Endor bills its real GPU time, likely less. Time: Endor publishes no time per step;
  about 15 to 50 minutes plus 1 to 4 minutes of provisioning; a 3-hour wall limit. Exit 0 done; **3 a registered stop**
  (money: spent plus the next 25 steps plus $0.50 reaching $10, or the projection after 50 steps passing $9.50; a
  learning rate Endor changed; the gate); **75 an operational failure**: `scripts/endor-run.sh train --reason "<what
  failed>"` starts the next iteration from the last saved epoch (at most three, the cap shared); 130 the kill switch
  (`scripts/endor-run.sh kill`) or a signal. The run is closed in every case.
- **Where to look**: `artifacts/endor/status.json` (`scripts/endor-run.sh status`), `artifacts/endor/logs/`,
  `artifacts/endor/receipts/` (one line per call), `artifacts/endor/ledger.json` (the money), `fit/summary.json`,
  `run-i1/epochs.jsonl`, `report.md`, `adapters/<best>/`.
- **Left to the user**: Endor's data terms (not reviewed); whether to delete the project and revoke the key afterwards
  (the checkpoints expire after 7 days; Endor keeps request bodies for an unstated time). The fit check records
  Endor's listing of `gliner2.5-decide` (weights repository and revision, contract, adapter targets, window) in
  `fit/account.json`; nothing here compares it with our local model (the user's word: no local comparison).

## 11. The last check before anything is sent (review, written 08:17 EDT, 19 October)

A second reader tried to break the build before real money and data go out: to make the key leak, to make anything
but the allowlisted rows leave, to make the spend pass $10, and to make the run misreport its numbers. **Everything
was done against the fake Endor. Nothing was sent to Endor, the key was not read, and no model process was started.**
Each defect below was shown on the fake first, then repaired in its own commit with a test (40 tests now, all
pass; the exporter's 6 pass). The full dry run on the real export passed again: 4,298 and 4,458 requests reached the
fake with no violation, the key is in no file the run wrote, and every billed call was timed.

### What was found and repaired

**The key.** No way out was found: not in error messages, the SDK's logs (its logger has no output and hides the
header), receipts, the status file, the ledger, the report, object descriptions, child processes (none is started;
the environment never holds the key), URLs, redirects or proxies. Two holes were closed for safety: the connection
no longer reads a certificate store named in the environment, and a storage link that holds the key is refused.

**The data.** One defect. The gate kept one list of the packets that may leave, so a development row could go out as
a training datum, with its label as the target, and pass. The list is now kept by kind of body: the fit check's
decisions, the training datums (training rows only, both option orders), and the development rows for predict (no
label). A real connection without these lists is refused before the key is read. A real run also reads only the
registered export (its two files by sha256, §10).

**The money.** Five defects.
- A call Endor never finished held the run open for ever: the SDK's waits have no limit, the run's heartbeat kept it
  from closing, and neither the kill switch nor the 3-hour limit was read. Every wait is now read in 20-second slices,
  with the kill switch and the wall limit checked between them; a step may take 10 minutes, a predict or a save 30,
  provisioning 20. Past that the iteration ends as an operational failure and the run is closed.
- Rounding per call. If each call runs just over a second and Endor rounds each up, it bills nearly twice what the
  guard counted. With a balance that lags, the fake billed $10.64 while the guard counted $1.06. The guard now reads
  each call's time from Endor's own timestamps on the call (when it was queued, when it ended, one call at a time),
  rounds it up to the second, and counts a call still in flight at the last step's time. A call without timestamps
  is counted by the strict bound (the whole wall time added), which may stop a cheap run early. A billed call after
  Endor parked the run adds a session's 60-second minimum.
- Sleep. A laptop asleep 8 hours in the middle of a run was counted as $56, which stopped the test for good. The
  guard now counts only time in which Endor answered: a gap of more than two minutes counts two minutes, which is
  when Endor parks an idle run and stops billing it. `fit` and `train` now run under `caffeinate -i`.
- A refused datum in training. Section 8 counted it as an operational failure, after which another iteration may
  run. But the next iteration replays the same order and meets the same datum, so all three iterations would fail
  there and pay for the steps before it. **Amendment to §8:** Endor refusing a training call (422, or a call that
  fails as `invalid_datum`, `invalid_options`, `context_too_long` or `invalid_input`) is now a registered stop,
  `stopped-refused` (exit 3). No iteration follows it, and the best saved epoch is still downloaded.
- A second ledger. A second frozen checkout, or `--root`, started a fresh ledger: a second $10 and three more
  iterations. A real run now keeps all its state in the main checkout's `artifacts/endor`, whatever checkout runs
  it. That covers the ledger, the fit check, the iterations, receipts, logs and the adapter. The kill switch is that
  folder's `KILL` and now takes effect within 20 seconds. A kill switch left on before an iteration ends the command
  (exit 130) without using one of the three iterations.

One more fix stopped the guard from ending a cheap run for nothing: a slow step-0 predict was counted as the cost of
the first step, and stopped a run for money at its second step after $0.47.

Checked against the fake across 24 cases (calls of 0.3 to 20 seconds, billed exactly or rounded up, a balance that
moves or stays still): every run either finished under $10 or was stopped before it, and the guard never counted less
than the fake billed.

**The numbers.** Four defects.
- An epoch's development numbers were written after a balance read. When that read failed, the saved epoch kept no
  numbers, and after the resume the best epoch was chosen without it. They are now written as soon as the save
  returns.
- Endor's probabilities were scored as given. Answers that do not sum to 1 gave a number that was not a soft
  cross-entropy. They are now divided by their sum, and the report prints the largest gap (flagged over 0.02).
- Answers returned in another order went unseen when the rows had the same number of options. The report now
  compares the untouched base read two ways, the step-0 predict against the fit check's decisions, row by row. It
  flags a difference over 0.05, since Endor states "a few hundredths".
- A failed download of the best epoch is now in the report, not only in the status file.

### What stays open (known, not defects of the code)

- Endor does not document exactly how it bills. The guard covers both readings, per call rounded up and by wall
  time, and the balance is a second check. A call Endor has accepted still runs, and is billed, after the run is
  closed. Nothing on this side can stop it. At most that is one predict's time.
- Closing the laptop lid still sleeps the computer (`caffeinate -i` prevents only idle sleep). The guard counts this
  correctly. If Endor closed the run after an hour without a heartbeat, the next call fails as an operational
  failure, and `train --reason` resumes from the last saved epoch.
- The fit check counts any 422 on a decision as a refusal, as §4 registers. A refusal for another cause would end
  the test at the fit check, for about a cent.
- Endor's data terms have not been reviewed by the user (§1).

### The commands (these replace §10's)

From a frozen checkout of this branch, in a shell where `ENDOR_API_KEY` is not exported. The client reads the key from
the main checkout's `.env` itself.

```sh
cd /Volumes/Drive/chimpbench/MGOGO
git worktree add --detach .claude/worktrees/bench-endor endor-test
ln -s /Volumes/Drive/chimpbench/MGOGO/node_modules .claude/worktrees/bench-endor/node_modules
cd .claude/worktrees/bench-endor
scripts/endor-run.sh check                          # sends nothing: 40 + 6 tests and the exporter's dry run
scripts/endor-run.sh export                         # writes artifacts/endor/export here (local only)
scripts/endor-run.sh plan | head -40                # offline
screen -dmS endor-fit scripts/endor-run.sh fit      # SENDS the fit check
scripts/endor-run.sh status                         # wait for "phase": "fit", "state": "ended", "outcome": "passed"
screen -dmS endor-train scripts/endor-run.sh train  # SENDS the training
scripts/endor-run.sh status                         # progress; scripts/endor-run.sh kill stops it within 20 s
scripts/endor-run.sh report                         # /Volumes/Drive/chimpbench/MGOGO/artifacts/endor/report.md
```

If `fit` ends with exit 3, the test ends there. If `train` ends with exit 75 (operational), run
`screen -dmS endor-train2 scripts/endor-run.sh train --reason "<what failed>"`, at most three iterations in all.
Exit 3 is a registered stop and nothing follows it. Exit 130 is the kill switch: remove `artifacts/endor/KILL` in the
main checkout first.
