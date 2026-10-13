# Stage R14: teach the rules on the states the learner reaches

Registered on 13 October 2026 before collection, training or execution of changed code. This stage resumes workflow `wf_198baee7-870`, whose three designs and two attacks completed but whose builder exhausted its quota before writing a registration. The user authorized continuing the training repair on 13 October. The scope is one aggregation round, with staged execution and a second training for replication. No wild record or sealed seed is opened. Every model result is a rules-taught model on a rules menu.

## 1. Question and fixed comparison

Can the same small model, taught the same teacher on additional states, avoid the population failures found in R13? The old adapters are `r11-p5b-s7` and `r11-p5b-s11`. Packet P5b, gate on, one draw per ask at salt 1, field profile, M6-W50, 30 rules-driven burn-in days, and all living animals aged 8 or over on the kernel stay fixed. Younger animals stay on the rules. No temperature, class weight, score hint, menu change, new packet line, or changed simulation parameter is allowed.

The main repair is data aggregation. Finished nests in daylight and being out in darkness are states the learner reaches far more often than the rules. Solitary dusk nests also occur in rules worlds and were sampled too sparsely. Rules twins therefore provide a separate rare-state sample. Any result changes both coverage and optimizer exposure; it cannot isolate those contributions.

The diagnostics on seed 3613 motivated this design. That seed is spent and supplies no new training row, checkpoint selection, or pass/fail gate. Seeds 4333 and 4444 and all repository reserved/retired pools remain untouched.

## 2. Collection and split

Run the old s7 adapter on seed 48 and the old s11 adapter on seed 7 for 10 days each, after the fixed burn-in. Each has a paired rules-only run of the same length. Run old s7 on seed 21 for 10 days for prospective offline evaluation, with a rules twin. Training/development animals on 48 and 7 use R4's existing split. Seed 21 is test only. No row from a test world enters training or development. A run that stops early is retained as incomplete and cannot silently become the full collection.

Every run uses R10's receipts, per-day checkpoints, warm-up, answer validation, stop checks, timeout policy and replay. A collection is usable only if every completed day replays to its saved world hash, all receipt lines agree, and the rebuilt P5b packet agrees with the recorded packet hash for every sampled learner ask. This stage does not treat the learner's choice as a label.

Select before labeling, in deterministic hash order. Per training world, select 780 plain learner asks, up to 260 daylight-nest asks, 130 solitary-dusk-nest asks and 130 dark-out asks. Add up to 130 solitary-dusk-nest and 130 dark-out fresh decisions from its rules twin. A row occurs once. Each rare stratum permits at most two asks per animal per ecological day. New training rows total at most 3,120, alongside the unchanged original 3,120 rows. Empty or small strata stay small; no replacement by desired label.

Development uses the same strata and cap, with one tenth of each training quota, rounded up, on the development animals only. Keep the original 300 development rows. This is a new development mixture and may choose another epoch; report that limitation. Sampling the test set uses 1,500 plain learner asks plus up to 260/130/130 rare learner asks and 130/130 rare rules asks, with the same two-per-animal-day cap on rare strata. R11's existing seed-21 fresh held-out rows are retained as a separate evaluation set.

Strata are functions of the actual P5b packet: `doing` says in my nest; the light words say full daylight, falling/dim light, or darkness; and the nearby line lists no companion. Full daylight follows the packet's 0.97 boundary, never an invented 0.5 cut. No clock time, sleep latch, unseen nest-mate, teacher score, model confidence or disagreement enters selection. The exact word predicates will be tested against the packet builder before collection. Denominators and rejected labels are counted by stratum and split.

## 3. Teacher and immutable data

Use R11's label algorithm unchanged: redraw the whole candidate list/menu with the same jitter and belief mechanism, at least 2,000 and at most 20,000 redraws, targeting 500 matching menus and requiring at least 100. The label is conditional on the exact menu shown. Rebuild and compare menu identity and current candidate scores before accepting a label. Restore decisionVersion in a finally block; replay identity must hold with the labeling hook enabled. Learner asks have no realized teacher draw, so R11's RNG/pick reconstruction flags are not claimed for them. Their label remains a counterfactual teacher distribution.

Preserve the original train/development JSONL bytes as prefixes, record SHA-256 for every input/output and adapter, and fail rather than overwrite a completed collection or adapter with other inputs. P5b is rebuilt by R11's shared packet function. Only packet and soft labels reach the trainer; diagnostic valuations never become packet fields. Save source, selection stratum, seed, animal and packet hashes separately for auditing.

## 4. Training and offline reading

Use `train_r11.py` with the existing LoRA placement, three epochs, soft cross-entropy, weight one, original shuffling/schedule, and training seeds 7 then 11. Each begins from the untuned base. Name adapters `r14-p5b-s7` and `r14-p5b-s11`. A weights file without the final manifest is incomplete and is never evaluated or served. The adapter hash and its data manifest must match the chain's identity receipt.

Score the old s7 and each new adapter on exactly the same prospective learner/rules test packets and R11 held-out packets. Report paired differences in divergence from the teacher, separately for all learner asks and excluding nest states. Report target-state absolute probability error, the probability of carrying on, trip probability, and nest probability for dawn, company dusk, solitary dusk and darkness. Intervals resample animals, 2,000 draws, fixed reporting seed. Fewer than 30 records or fewer than 5 animals is reported as insufficient exposure.

The first training proceeds to a five-day rehearsal on seed 48 only if all finite/identity checks pass; divergence on R11's own held-out set increases by no more than 0.05 nats; the absolute aggregate carrying-on error increases by no more than 0.05; and neither company-dusk nor dawn nest probability declines by more than 0.01 where the teacher assigns at least 0.99 to nesting. These are conservative cost-saving guardrails, declared design assumptions, not claims of viability. Print uncertainty and exposure beside them. A guard with insufficient exposure is not passed and requires review before a population run.

Benefit is graded, never called viability offline: complete evidence means the paired interval for target probability error is below zero in both daylight-nest and solitary-dusk strata; partial means one; not shown means neither. No absolute 0.20 or 0.93 target predicts viability. Report expected extra nest departures per 100 animal-nights for company-dusk from the measured ask exposure, including uncertainty; the probability guard is not a substitute for that readout.

If the first adapter fails a harm guard, finish its report and stop before the second training or fresh world. Do not change quotas, thresholds or recipe in response within this registration. If rehearsal stops or has timeouts/errors, stop the chain and preserve the evidence. A failed result is a completed stage, not a reason to silently retry a different recipe.

## 5. Execution stages and population evidence

The default unattended chain is stage A: collect the three learner worlds and their rules twins, replay/select/label, assemble, tokenize/check parity, train seed 7, score old/new, report the offline reading, and if guards permit run/replay the five-day seed-48 rehearsal. It ends with a machine-readable conclusion and next command. Stage A cannot establish a population repair on a fresh world.

Stage B is an explicit continuation after stage A passes: train seed 11 on the identical file, read its guards, then evaluate both trainings independently on prospective population worlds 3457 and 3823, 20 days each, with paired rules and R7's control arms. These two candidate seeds must receive a completed provenance audit before their first simulation tick. Neither is a repository sealed seed. The previous builder found no occurrences across 183 branch heads but did not complete its artifact inventory, so this registration alone does not certify them unused. If either audit fails, stop and amend before any new world is run.

Population claims retain R13's existing viability readouts and timing controls, and print finished-nest daylight minutes, nights with short nesting, dark minutes out, early rises, reserves, intake, trips, distance and act changes. A model that passes offline but fails in its own population is reported as such. Full repair requires both training/world pairs to meet viability without a new harm; one pair is a level measurement. This round authorizes no automatic second aggregation round and adopts no app adapter or decode default.

## 6. Compute, operation and stopping

Local only; one model process across checkouts. No model step alongside animation verification, a whole test suite, or a heavy build. The parent integrator controls launch. Expected stage A cost is 6.5 hours collection, 3.5 to 4 hours training, 0.5 to 1 hour scoring, and 1 to 1.5 hours rehearsal, approximately 12 to 14 model hours. Stage B is about 12 more hours. Labeling/replay adds CPU time, roughly an hour, outside model loads. These estimates include no cloud rental and are not promises.

Register per-step caps: a ten-day collection has at most 3 hours, the five-day rehearsal 2 hours, each 20-day confirmation 6 hours, each training 6 hours, each scoring pass 2 hours. A wall cap includes resumed attempts using a persisted budget. Stop checks stay enabled. No automatic model retry on a scientifically stopped run; interrupted runs resume from R10 checkpoints and journal. The whole chain keeps a single-owner lock, state/status log, step exit codes, immutable input receipt and completed-step markers. It refuses a changed checkout, missing adapter, hash mismatch, changed source data, another model process, less than 5 GB free, or unfinished outputs masquerading as complete. Model startup must verify the worker actually loaded the requested adapter.

The dry run uses a fake worker, no model weights, known development seed 48 and small synthetic label fixtures for trainer/report validation. It must exercise collection, labeling, assembly, score reading, guard failure, identity failure, completion/restart behavior and receipt replay. Dry outputs are clearly marked and never accepted as scientific results. No full suite is run while model work waits on an answer.

## 7. Independent review

The scientific reviewer reads this registration before collection. Implementation and focused no-model tests are then reviewed separately. Amendments must be dated, committed and made before the affected data or result exists. Unresolved uncertainty, including invisible nest company and the rules' judgment outside their usual states, stays explicit in the report.

### Amendment before implementation verification, 13 October

P5b suppresses light trend in darkness, so the dark-out selection includes all darkness, not a hidden evening clock. Evening and early-morning slices are descriptive only. Add up to 250 test-only guard rows per seed-21 source for each of nest in rising light, nest with a listed nest companion in falling light, and nest in darkness, selected in deterministic hash order before reading labels. These do not alter training quotas. Insufficient guard exposure stops stage A with that conclusion. Animal-resampled intervals are descriptive within-world intervals, not independent-world evidence. Population day-block sensitivity is reported separately.

Stage B pairs are exactly training s7 on world 3457 and training s11 on world 3823, not a four-run cross. Both passing R13 V1–V3 means viable on both evaluated pairs; training and world effects remain confounded. Other timing changes are reported as residual behavioral differences. The stage claims no complete repair or rules-level behavior solely from viability.

The independent seed audit completed before any R14 run: `/Volumes/Drive/chimpbench/shots/r14-seed-audit-2026-10-13/audit.json`, SHA-256 `181ae234b289559a416e5dcbcf48b475f3b48e0b26a8a0107214f0e369f78a1f`. It searched 181 unique current branch/remote heads, 64 extant artifacts roots and seed fields in 233 bounded run/registry/manifest/protocol files; no matches, no read/parse errors. It did not search unreachable historic commits or arbitrary logs. Seeds 3457 and 3823 are now reserved for these two R14 tests.

The two-per-animal-day cap applies to rare-state top-ups. The uniform plain sample remains unbiased and can contain more than two such asks; both counts are printed. Selection provenance records plain versus top-up so all-ask divergence uses only the uniform sample. Rules-twin labels also report structural reconstruction and exact replay, not a claimed reconstruction of a realized teacher RNG draw. The R11 trainer's parity command does load a model and is a guarded model step; tokenizer counts alone do not load weights.

### Final implementation clarification before collection, 13 October

Offline tables separate learner and rules sources. The original pooled 30-row/5-animal guard remains mandatory; every source individually meeting that exposure must also pass its harm bound. Smaller source groups are explicitly insufficient and support no source-specific claim. Company-dusk departure estimates use all selected company-dusk asks, the full unsampled packet-state ask census and the run's counted animal-nights, separately by source. These first-order expected departure differences do not predict later trajectory feedback, and selected-stratum mixture can affect the estimate. Teacher-at-least-.99 harm checks remain separate.

The five-day rehearsal establishes completion, exact replay and passage of R10's catastrophic/futility stop only, not R13 viability. Stage B requires all three receipts and the offline guard. A scientifically stopped world produces an explicit scientific-stop receipt and ends all remaining model work. Interrupted training with a partial adapter stops for inspection: the trainer has no optimizer-resume support, so this chain does not silently restart a fresh training or reset its cumulative budget. Completed training must have both its final exact recipe/seed manifest and the chain's completed output ledger.

The population supplement reports daylight finished-nest minutes at light>=.97, dark-out minutes at light<=.03, morning nest exits while dark, short-night shares, reserves, intake, trips, distance and act changes. Its day-block sensitivity resamples whole simulation-day differences and is descriptive only; correlated days and shared social groups prevent a world-general interval. The two R14 population reports reuse R13's viability formulas with R14 identity and wording. Only pooled and adequately exposed source harm gates control Stage A; new descriptive timing quantities introduce no additional fitted threshold.

## Operator commands

Run from the frozen R14 worktree. `python3 -B scripts/r14.py check` validates the clean checkout, exact old adapters, source data and older queue states without loading a model. `python3 -B scripts/r14.py stage-a` is the single-owner unattended chain; repeat the same command after an execution interruption to resume completed steps and R10 checkpoints with their remaining budgets. `python3 -B scripts/r14.py status` prints charged model hours and recent progress. Outputs, JSON step receipts and per-step logs live under `artifacts/r14/`; set `R14_OUT` to an absolute new root only for a deliberately separate registered run, never to evade a stopped run or reset budgets. `python3 -B scripts/r14.py stage-b` explicitly continues after Stage A's complete offline, futility and replay receipts. `python3 -B scripts/r14.py dry` uses fake-worker worlds only.

For a detached local launch, redirect Stage A's stdout/stderr to a file outside its step logs and retain the PID. A missing/stale lock must be inspected by PID before manual removal. If training is interrupted, inspect the retained partial adapter and training log; no final manifest means no evaluation. A new training attempt requires a documented pre-run amendment and preserves the original charge. A stopped scientific run cannot be resumed or replaced within this round.
