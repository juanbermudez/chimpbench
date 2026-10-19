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

## 12. Amendment of 19 October 2026: the fit check's 2% stop, after it fired (the integrator; written 08:27 EDT)

**What happened.** The fit check ran from 08:21 to 08:26 EDT and cost $0.0065. Endor answered 4,020 of 4,293 packets and
refused 273, every one with the code `context_too_long` and every one a target-phase packet: 249 of 3,885 training
rows (6.4%) and 24 of 408 development rows (5.9%). Our token count had put them at or under 512; Endor's own rendering
of the packet is longer, as the review of 19 October expected (§11). The registered rule (more than 2% refused stops the
test) fired and no training ran. The fit check also scored Endor's untouched gliner2.5-decide on the 384 development
packets it answered: top-1 0.4375 against the rules' label (kind 0.494, target 0.311), chance 0.275 (kind 0.224, target
0.389: the base's target top-1 is under chance), mean cross-entropy 1.460.

**Why the rule was there, and why it is set aside.** It protected two things: the fairness of a comparison with a local
twin trained on the same rows (the user dropped the local twin and comparison: "i dont care about the local, I trust
endor works, run the trainging."), and a guard against an exporter fault (a fault would refuse rows of any kind and
code). Every refusal here is a length refusal of a long target packet, which is the limit the plan named. So the test
goes on with the rows Endor accepts: 3,636 training rows (2,504 kind and 1,132 target) and 384 development rows,
already written by the fit check as `fit/train-final.jsonl` and `fit/dev-final.jsonl` and pinned by sha256 in its
summary. The target phase is therefore taught on 82% of its rows and is short of its longest packets; the report says so.

**The rule from this amendment.** `train --accept-fit-refusals "<reason>"` lets the training start after a fit check
that did not pass only when every refused packet has the code `context_too_long`; any other refusal still stops the
test. The reason is written into the iteration record. Every other rule of §0 to §11 stands: the $10 cap, the gate, the
key, the recipe, at most three iterations. This is not a new iteration of training (none has run).

## 13. Results (the integrator; written 09:27 EDT, 19 October 2026; corrected 10:08 EDT after its second reading)

**What ran.** The fit check ran from 08:21 to 08:26 EDT (§12; its 2% stop fired and was set aside under §12). The
training ran from 08:28:39 to 08:44:12 EDT, 15½ minutes, from the frozen checkout `bench-endor` at e1547f5a: one
iteration, 1,365 steps (455 per epoch, 3,636 rows an epoch), three epochs, a checkpoint saved after each (08:34, 08:39,
08:44), outcome *done*. No stop rule fired during the training. The learning rate Endor echoed matched the one sent on
every step.

**Development numbers** against the rules' label, on the 384 development packets Endor answered (265 kind, 119 target;
lower soft cross-entropy is better; the label's own entropy, the floor, is 0.294 overall, 0.265 kind, 0.359 target;
chance top-1 is 0.275 overall, 0.224 kind, 0.389 target):

- Endor's untouched base: soft cross-entropy 1.460, top-1 0.438 (kind 1.508 and 0.494; target 1.354 and 0.311, under
  chance). The step-0 predict and the fit check's decisions read the base alike (largest difference of an option's
  probability 0.000002).
- Epoch 1: 0.701 and 0.763. Epoch 2: 0.672 and 0.773.
- **Epoch 3, the best: 0.634 and 0.797** (kind 0.681 and 0.777; target 0.531 and 0.840).

**Money.** The test cost **$0.62**: Endor's balance fell from $100.00 to $99.38 by the bill's reading at 10:07 EDT
(§14), equal to its usage rows (313 GPU seconds of training, $0.609, and $0.0065 for the fit check's 4,020 decisions).
At 08:44 the balance had shown $0.43: it lagged the run's last four minutes. The guard booked $5.38 against the $10 cap,
every one of the 2,737 billed calls at no less than one GPU second, its registered floor (§6): 2,766 GPU seconds, about
nine times what Endor billed (about 0.11 GPU second a call). That is what a floor is for.

**A second reading** (an independent recount from the files and two skeptics on each finding, 19 October): every number
that can be recomputed from files matches the report: both readings of the base, the fit check's counts, the 1,365
steps and their losses, the 2,737 billed calls and the balance. Two figures rest on totals only. The three epochs'
development numbers: the run kept each epoch's totals and not its rows (repaired for any later run, §14); the totals
agree with each other (293, 297 and 306 right of 384). The booked dollars: the receipts book each call at its
one-second floor ($5.33 with the fit check), and the 29 seconds more that Endor's own timestamps gave are only in the
ledger's total (`runs.*.timed_s`, 2,766). The development rows share no id, decision point, packet, state or animal
with the training rows (15 development animals, 61 training animals), but they come from the same two simulated worlds
(seeds 48 and 7) and the same days: the numbers measure other animals' decisions in those worlds, not a held-out world.

**The reading §7 allows.** Training on Endor lowered the development soft cross-entropy against the rules' label far
below Endor's untouched base, in both phases (kind 1.508 to 0.681, target 1.354 to 0.531; top-1 0.438 to 0.797), in
15½ minutes, for $0.62. It says nothing about our local model, about a twin trained here, or about the app.

**What the adapter is, and why it cannot drive the app as it is** (the second reading; each point checked against the
files by two skeptics):

1. *Its weights fit our model by name and shape.* 288 float32 tensors: LoRA rank 16, alpha 32, on query, key, value,
   attention output, intermediate and output of all 24 encoder layers; nothing on the classifier (Endor's
   `train_readout` false). The names and shapes map one to one onto the modules of our local GLiNER2.5-Decide; a PEFT
   load would find no missing or unexpected key. Whether PEFT then computes what Endor's trainer computed (the scale
   alpha/r = 2, served in half precision) is not documented: only a local score can show it.
2. *It was trained on another revision of the base.* Endor's gliner2.5-decide is fastino/GLiNER2.5-Decide at
   5a7adf72; our local stack pins 7ee5da4c and holds only that snapshot. Whether their weights differ cannot be told
   offline. The local worker refuses an adapter whose manifest names another revision; 7ee5da4c must never be written
   into this adapter's manifest (the repo's training scripts write the local pin by themselves).
3. *Endor read the packets in another text than ours.* The state: Endor writes it as a JSON-style object, our stack as
   YAML with sorted keys. The token counts show it exactly: on all 4,020 packets Endor answered, its count minus ours
   (24 to 57) equals the difference of the two renderings' word counts, with no residual; the same rule puts every
   refused packet over 512 and every answered one at or under it, which is why the 512 filter of §2 let through packets
   Endor refused. The question part (the name `action`, the instructions, the option ids c0 to cN and the option texts)
   has the same count as ours on every decision Endor answered, so it is very likely the same text there; but a
   training datum carries no question name, and what Endor puts before the instructions in training is not documented
   (ours reads `action: <instructions>`), so the question Endor trained on may differ from ours by that name. Already
   before training, Endor's base and our local base give different odds on the ten development packets both have
   scored: the largest gap of an option's probability is 0.47 and the top choice differs on two, while on two others
   they agree within 0.01. These ten cannot tell which cause it: the rendering, the revision (point 2) or Endor's
   readout (§5, gap 8). Whether the skill survives our rendering is not measured.
4. *It was hardly trained on, and not measured on, one whole target menu.* The target menu after "go to food
   elsewhere" (trees the animal sees or remembers; 4 to 8 options) is 794 of the 1,898 training target rows: 29 were
   trained on, and 3 of its 75 development rows were scored. Its eight-option form: 19 of 760 trained, 1 of 70 scored.
   Of all target rows, 766 training and 72 development were left out, before the upload (517 and 48, over 512 by our
   count) or refused by Endor (249 and 24); 765 and 72 of them are from this menu. The other two target menus ("feed here", "go and drink") were trained on whole. The
   target figure of 0.840 is therefore on short menus of mostly two to four options, whose labels are peaked (the
   label's top option holds 0.84 of it on average, against 0.45 on the rows left out). The app sends the long menus.
5. *The app's checks refuse it, as they should.* Its name (`i1-e3`) is not a registered adapter name; its manifest is
   this run's, not R15's; no training root has a preflight that passes under the current code (R16's `ft0` failed on
   18 October and has not been run again since amendment 26; R15's passing one predates amendment 26). These are the
   fail-closed rules of the app mode (`docs/staging/app-model-drives.md`) and are not to be loosened.
6. *And the mode's own precondition is not met:* the trained model counts as driving the app only through an adapter
   that reads viable in R16's population test. None has.

So the test shows that Endor can teach gliner2.5-decide the rules' choices quickly and cheaply on packets that fit its
512 tokens. It does not give the app a model.

**What could follow** (none started; each is the user's call):

- *A local check of this adapter* (minutes of model time on a quiet machine, under the model lock): score the same 384
  development packets with the serving code the app's scorer uses (`training/decide_ft/score_contexts.py` through
  `AdapterModel`: half precision, our rendering, base 7ee5da4c), outside the app's route, which refuses this adapter
  (point 5), from a copy of it, with the local base beside it and Endor's numbers beside both. Pass rule, fixed before
  it runs, against the rules' soft label on the 384 packets: the skill is kept if the local adapter's soft
  cross-entropy is at most 0.70, its top-1 at least 0.76, and its soft cross-entropy in each phase at most 0.10 above
  Endor's epoch 3 (kind at most 0.781, target at most 0.631); it does not transfer if its soft cross-entropy is above
  1.047 (less than half of Endor's drop from 1.460 to 0.634) or its top-1 under 0.62 (less than half of Endor's rise
  from 0.438 to 0.797); anything else is partial and leads to no decision. Reported apart and outside the pass rule
  (Endor has no number for them): the 72 development target rows Endor never scored (473 to 659 of our tokens, within
  the serving path's 1,280; 69 of them the eight-option fruit-tree menus of point 4). It reverses the user's "no local
  comparison" for this adapter and does not settle point 2.
- *A second Endor run that sends our own text of the state.* Endor's SDK takes a state as text
  (`JSONContent = str | dict | list`), so Endor can be given the very string the app feeds the model; it needs a
  registered change (`endor_wire`'s state check accepts only an object, and the text must be GHN's own rendering), and
  a fit check of decisions only (under a cent: the first one's 4,293 cost $0.0065) would first show whether Endor's
  count then equals ours. If it does, it reaches only part of the long fruit-tree menus: the rows Endor refused (249
  training and 24 development target rows, 459 to 512 by our count; 248 and 24 of them fruit-tree rows) would fit,
  taking that menu from 29 to 277 of its 794 training rows and from 3 to 27 of its 75 development rows (six of these
  rows are exactly 512, so one token more would put them out again). The other 517 training and 48 development rows
  are over 512 by our own count: they need a shorter packet (a design change) or local training.
- *The revision:* compare the files of 5a7adf72 with 7ee5da4c on Hugging Face (a read over the network: the weights,
  and the config and tokenizer files), or keep a second base for adapters trained on Endor. That is more than a
  registration: a download of up to about 1.9 GB, a revision of their own (in place of GHN's) in the loader
  (`common.py`, `adapters.py`), the preflight and the worker's check, and a new preflight; the preflight pins
  `common.py`, `adapters.py` and itself, so every preflight taken before the change goes stale. GHN's own pin stays.
- *Serving, if a local check passes* (none of it built): a registered name family for adapters trained on Endor
  (`ADAPTER_NAME` and `adapterStage` in `scripts/lib/r15-training.ts`, and `src/providers/http.ts`), an R15-format
  manifest written from the run's files with the true base revision, a training root whose contexts are the 3,636 and
  384 rows actually trained, a passing preflight on it, and then R16's population test. None of it loosens a check.
  Endor keeps the three checkpoints, with their optimizer state, until 26 October unless their lifetime is extended.
  The app draws from the model's odds, so each phase's soft cross-entropy, more than top-1, is what behaviour follows.

## 14. After the run (the integrator; written 09:27 EDT, 19 October 2026)

Three repairs to the code, none touching what was sent or how the run was judged (commit 71906bb2, 42 tests):

- Each epoch's development answers are now kept row by row (`run-i<n>/dev-e<k>.json`, as the step-0 predict keeps its
  own), so a later run's epoch numbers can be recomputed from files.
- `status.json`'s top-level `spent` is written when the run ends; it had stopped at the last step send ($5.3654 against
  the ledger's $5.3848).
- The report names Endor's base revision beside ours.

**One more reading, registered here before it is made:** `scripts/endor-run.sh bill`, run from a checkout at 658977ed
or later (not from `bench-endor`, which predates it), reads Endor's balance and its usage rows once. The gate lets out
those two GETs and nothing else (no packet, no billed route); the usage window starts at the hour of the test's first
call. The reading is made once, at least an hour after the last run closed, under the run's lock, and is kept in its own
files (`bill.json`, `usage-bill.json`): the run's own `usage.json`, read at 08:44:26, stays as it is. The report and
`status.json` are rewritten from it. A failure writes nothing and can be retried. Its second reading (19 October) also
repaired the code before it was made: commit 658977ed, 44 tests and the dry run.

**The bill, read at 10:07:28 EDT** (`artifacts/endor/bill.json`; 83 minutes after the run closed): balance $99.3849, so
$0.6151 since the first read; usage rows $0.6151 (decisions $0.0065; training 313 GPU seconds, $0.6086). The report
and `status.json` were rewritten from it; the run's own `usage.json` of 08:44:26 ($0.4304) is kept.

