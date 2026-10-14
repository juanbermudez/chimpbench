# R15: decisions over perceived resource targets

Registered 13 October 2026, before implementation or changed-code runs.

## Authorization and scope

The user asked to move toward the recurrent state-biased decision model with perception driving chimp behavior and supporting training. This stage implements a narrow, default-off part of R12: choose food and water destinations from individual perception and memory. It does not resolve the remaining R12 social, aggression, reproductive, body-teacher or sealed-data rulings. R14's active frozen experiment and inputs remain unchanged.

The neural scorer is memoryless. Recurrence is explicit in the simulation: body state, ongoing activity, perceptions, individual memory and experienced outcomes become the next decision input. This stage changes target agency, not that architecture. Existing activity offerings, body/phase restrictions, bout endings and the intention gate remain scaffold assumptions.

## Implementation contract

- `resourceTargets=0` by default. Off-path packets, decode draws and simulation behavior remain unchanged. Rules controllers and fallbacks keep the existing policy under either setting. New-mode operation requires own-state observations and two-stage requests.
- Reuse the kind-then-target loop. Kinds remain bounded by the existing eight-kind scaffold; only resource groups expand. Other activities keep their existing selected target. No explicit carry-on/alternative-kind design in this slice.
- Food options come from current perception or individual remembered trees within the existing horizon and trip distance. Water comes from individually known sources. No communal unseen-tree list, unseen current crop, unseen crowd, score-ranked target shortlist or world-RNG consumption.
- Deterministically bound food groups to eight and water to four (design assumptions), keeping the valid current target. Reuse actual resource valuation/metadata for legality and gate persistence, but never show scores/reasons or use them to rank target membership.
- Request construction, application recheck and intention retention share the model-only legal resource pool. Keep the full legal pool separate from its bounded menu. Stale versions/invalid answers fall back through existing rules behavior.
- Mark kind and target stages explicitly. Kind keys do not depend on representative targets; two calls have separate random namespaces. Held epochs remember the concrete applied action/target. Record both calls and replay them deterministically. Flat existing receipts stay compatible.
- Use a new named packet/training identity. Both stages retain the animal's body, own experience and ongoing activity. First-stage labels are activity kinds; second-stage labels describe targets from the animal's knowledge. Do not silently run R11/R14 adapters on this contract.
- Training exports the exact live packets with soft labels over the presented menu. Kind teacher and resource-target teacher are identified separately; any target utility imitation is explicitly rules/scaffold taught, not a learned ecological reward. No claim of wild preference learning or viability follows from unit checks.

## Verification and limits

At most three implementation/verification rounds before recording unresolved findings. Focused CPU checks while R14 runs; no second model, long simulation, full suite, production build or browser graphics load. Full integrated checks and real tokenizer/model runs wait until R14 is idle. Do not autoqueue a new paid/external workload or interfere with R14.

Required focused evidence: default-off compatibility; rules-path parity; observation purity; deterministic shortlist; unseen-fruit mutation invariance; targets excluded from the old cap can be applied and retained; arrival progresses into feeding; stale answers/invalid responses fail safely; stage-separated draws; held-noise stability and checkpoint/resume; exact export/live packet parity; normalized labels with no teacher-score text leakage; adapter/manifest identity rejection.

A bounded fake-kernel integration exercise may use development seed 48 and at most 1,400 ticks/5 controlled adults, with both calls saved and replayed. It is a wiring check, not a behavior result. Training/dev collection is restricted to 48/7. Seed 21 remains evaluation only; R14's reserved 3457/3823 and sealed 4333/4444 are untouched. Real model training is prepared but not launched beside R14.

## Outcome

Implemented and integrated on `track-e`; default off. The frozen wiring checkout is `.claude/worktrees/bench-r15-wire` at `304fd67`. The source is unchanged by the later test/document commits. Resources, packet/training and decode were implemented in separate worktrees and reviewed together.

Focused verification completed 13 October 2026:

- 30 TypeScript tests passed, no failures/skips, on `f379d49`; seven Python lifecycle/data fixture tests passed. Strict checking of the scripts/tests and their source dependencies passed. Source offer audit: 94 sites, 370 conditions, zero problems. Original live/young/legacy offer classifications remain unchanged.
- A field world on development seed48 ran 720 ticks (three simulated hours), five controlled adults: 67 applied decisions, 79 calls, 12 target calls, zero fallbacks. Exact replay reproduced all receipts and final world hash `48d11f173fbc7394`. This was a fake scorer with no model load.
- Crash recovery after the first call, two waiting animals, immutable checkpoint callbacks, checkpoint/resume, packet mismatch and missing-answer refusal passed. Flat decode hashes remain unchanged. The older R10 runner still refuses unsupported two-call receipts.
- The actual two scaffold labelers produced kind and target rows from a synthetic W50 fixture: 2,979 original-menu redraws with 500 matching menus, then 2,000 target draws; exact packet parity, normalized labels and unchanged serialized world. This is not a production dataset.
- The collector was invoked with a one-tick bound and correctly refused because R14 is active, before burn-in or labeling. Python fixtures verify shared-lock exclusion, activity checks, output hashes, timeout cleanup and partial-output protection.

Logs and machine-readable verification: `artifacts/r15/integration/`. Wiring initial world, journal, receipts, checkpoint and manifest: `.claude/worktrees/bench-r15-wire/artifacts/r15/wiring/`. The first parent test run had two fixture failures because the synthetic noon clock had a zero tick; aligning its tick fixed both. Strict checking also caught an invalid fake-kernel identifier, corrected before the frozen run. Failed logs remain distinguishable from the final passing log.

Limits: full suite, production build, browser checks and performance measurements were deferred to avoid interfering with R14. No R15 production collection, real token count/parity, neural training or population evaluation ran. Existing activity kinds, body/social gates, bout endings and perception filtering remain scaffold assumptions. If a joined trip and independent trip share one destination, the existing joined variant retains the action/target identity; this slice does not add a second indistinguishable execution choice. Model quality, cost, wild realism and viability remain unmeasured.

## Using the implemented path

`resourceTargets=1`, `activityFirst=2`, `observeV5=1` enable the experimental simulation path. The ordinary browser/server model routes refuse its packets until an explicit compatible adapter route is available. The default app stays unchanged.

- Wiring: `pnpm exec tsx scripts/r15-loop.ts dry --ticks 720 --decode draw --out <new-directory>`; `replay --out <same-directory>` verifies the frozen source and exact journal/world result.
- Data after R14 is idle: `pnpm exec tsx scripts/r15-contexts.ts sample --seed 48 --ticks 1400 --limit 16`, and seed7 separately. These include a **30-day rules burn-in** in addition to the requested sampling ticks, and stop at 30 minutes. Inspect exclusions and phase/split coverage before enlarging a dataset.
- Assemble: `pnpm exec tsx scripts/r15-contexts.ts assemble --parts <part48>,<part7> --out <new-training-root>`. It checks provenance and writes exact packets, soft labels, hashes and a preparation command.
- Prepare: `python3 -B training/decide_ft/train_r15.py --root <training-root> --seed 7` prints the command. The explicit `--run` mode requires valid data and exclusive model access, trains from base with the existing soft-label trainer, and has a six-hour cap. Do real tokenizer/serving parity checks before that stage; none are claimed here.
- Connect completed weights: `scripts/lib/r15-model.ts` exports `r15ModelKernel(scorer, manifest, workerReady)`, which checks the new schema and exact loaded adapter hash. Pass that kernel to `runR15` for a bounded headless loop. The runner accepts a journal and decoder checkpoint for exact replay/resume; it is not yet a long population runner or app adapter selector.

The recurrent path is body/experience → perception → activity choice → target choice → validated action → changed body/experience. The state persists in the simulation; this work does not add neural hidden-state recurrence.

## App and training continuation (13 October 2026)

The user explicitly authorized finishing R14 review/checks, training R15, and showing the trained decision model driving chimps in the app. Prepare these changes while R14 runs, using only lightweight checks; launch data/model/graphics work after its chain is idle and its outcome has been reviewed. A thread follow-up checks progress every 15 minutes and reports only meaningful changes.

Add an explicit experimental R15 server provider, selected separately from the ordinary browser/server providers. It must require a completed compatible manifest, verify the actual loaded weight hash, build the same packet used in training, and refuse incompatible or missing weights. Model startup must hold the shared local-model lock and respect active chains, including gaps between their steps. R15 configuration must suppress the ordinary resident worker; no client-supplied model path or arbitrary worker arguments. Keep ordinary worlds/saves and defaults unchanged. Enable the required simulation parameters only for an explicitly requested new R15 scratch/demo world; expose adapter identity and applied kind/target decisions through the existing model/inspector UI. Use five adults and development seed48 for the first bounded real demonstration, with draw decoding and journal/replay evidence; this is not population viability.

Before training, validate exact rendered packets and real tokenizer lengths (maximum 1,280 tokens), then compare training and serving scoring on a bounded development fixture with the base model in one exclusive worker. Persist dataset/packet/implementation hashes, numerical tolerances and measured results; training must refuse absent, stale or failing preflight evidence. Retain the registered three-epoch soft-label recipe and six-hour training cap. First train seed7; seed11 is a separately named replication after reviewing seed7. Review per-phase loss/accuracy and probability normalization, and verify the completed adapter identity before the bounded recurrent run and app demonstration. No quality claim follows from a tiny smoke dataset; inspect phase, animal and split coverage before choosing a larger collection budget, and register changes before collecting it.

Remaining acceptance checks: integrated unit suite/build and strict script checks; required sim bench/metrics and no-model browser flows; trained worker readiness, missing/wrong adapter refusal, both decision stages, legal application, recurring changed-state inputs, visible model ownership/identity and target choices, and explicit fallback/error traces. Preserve failures and distinguish wiring evidence, training results and behavior evidence in the handoff.

The real headless demonstration uses `scripts/r15-loop.ts model` from a clean detached checkout, 720 ticks by default (maximum 1,400), seed48 and five adults. Its one-hour wall budget includes worker startup. Save the exact requests, both stage answers, between-pass checkpoints and final receipts; replay must reproduce the world and receipts. Require an applied two-call decision and repeated body/own-state inputs for at least one controlled animal. Abort on model errors after preserving the failed call; missing target coverage is an incomplete demonstration, not a reason to silently force the model's choice. This bound is separate from training and preflight budgets.

Review `scripts/r15-evaluate.ts` before the recurrent demonstration: development rows only (48/7), at most 10,000 rows and one hour including startup, one verified worker, no overwrite. Report activity/target cross-entropy, teacher entropy, KL, Brier error, top-teacher agreement and uniform cross-entropy separately. These are descriptive scaffold-imitation readouts, not a newly invented quality threshold or held-out test. Preserve per-row probabilities and failed partial output. Training and this report must finish before starting the app worker.

## Continuation implementation and next execution

Integrated through `41bd4f9` on 13 October. The explicit `/api/providers/r15` worker requires completed weights, LoRA configuration and qualified runtime hashes; it loads and warms the named adapter before reporting ready, holds the shared lock until exit, checks actual live token counts, and has a 600-second startup/20-second inference limit. The Python entry point also verifies its parent owns that lock. `?r15=1` creates a paused, unsaved W50 field world with five animals aged8+, lockstep and stage-separated draw salt1; Play waits for verified readiness. Both activity and target calls appear in the Mind trace; adapter identity appears in the model panel. Existing defaults remain unchanged.

Final focused evidence: **74 TypeScript tests and 17 Python fixture checks passed**, plus strict checking of the app and new scripts/tests. An actual startup attempt correctly refused the live R14 chain before artifact loading or model startup. Logs: `artifacts/r15/integration/app-final-*` and `app-live-r14-refusal-final.log`. Independent review fixed missing startup-failure records, signal cleanup, estimated-versus-measured token divergence, unbound LoRA configuration, mismatched runtime qualification and direct scorer lock bypass. An initial parent strict check caught a widened phase type, fixed before the final pass; the first live-refusal probe expected older error wording and was corrected without changing the guard. Failed logs are retained.

No R15 dataset, actual tokenizer/model parity, training, real-worker inference, browser demonstration or new full-suite/build/benchmark run has occurred. The earlier fake replay remains wiring evidence only. The inspector's per-animal controller checkbox cannot alter the fixed demo roster; the model panel states the roster explicitly.

After reviewing R14's final outcome and checking its process/lock are idle:

1. Run the deferred integrated suite/build, sim benchmark/metrics and no-model browser checks, one heavy task at a time. Freeze the accepted source in a detached worktree, with the usual dependency/raw-data links.
2. Collect seeds48/7 with the registered bounds and assemble a new training root. Inspect phase/animal/split coverage and exclusions. A smoke dataset is insufficient evidence of behavior quality; register a larger budget before any enlarged collection.
3. `python3 -B training/decide_ft/r15_preflight.py --root <FT> --run`, then inspect `preflight/result.json`, numerical arrays and coverage. Do not relax a failed tolerance after observing results.
4. `python3 -B training/decide_ft/train_r15.py --root <FT> --seed 7 --run`. Review all three epochs and the completion manifest; preserve partial failures.
5. `pnpm exec tsx scripts/r15-evaluate.ts --training-root <FT> --adapter r15-resources-s7 --out <new-evaluation-directory>`. Review separate activity/target readouts, then `pnpm exec tsx scripts/r15-loop.ts model --training-root <FT> --adapter r15-resources-s7 --ticks 720 --decode draw --out <new-loop-directory>`. Replay from the same frozen checkout with `scripts/r15-loop.ts replay --out <loop-directory>`.
6. Only after the headless worker closes, start the frozen app with `MGOGO_R15_ENABLED=1 MGOGO_R15_ROOT=<FT> MGOGO_R15_ADAPTER=r15-resources-s7 pnpm dev --port 5182 --strictPort`. Run `node scripts/verify-r15-browser.mjs http://127.0.0.1:5182 --out <new-browser-evidence-directory>` under the bounds in `docs/staging/r15-browser-proof.md`. It opens a fresh `?r15=1&test=1` world and starts the provider and playback through the existing UI. Do not set `MGOGO_NO_MODEL` for this real run. Review its real response/trace evidence and screenshots for rendered actions, both calls, identity, legal targets, changed recurrent inputs and error/fallback handling. Screenshot capture alone is not visual acceptance. Stop the private worker before any next training or model run.

Use Node22.22.3 for every pnpm command. The thread heartbeat `finish-r14-and-bring-r15-into-chimpbench` checks every15minutes and continues this sequence; it reports meaningful changes and pauses once the requested trained app demonstration is verified. R14 StageB remains a separately reviewed scientific continuation; completing StageA is not proof of population viability.

Browser preparation was integrated at `91acf04`: three syntax/pure fixture rounds and the scoped strict app check passed, including exclusion of active R14, lock ownership, valid distributions, selected-target consistency and distinct body/own-state recurrence. No browser, model or simulation ran. At 17:29 EDT R14 was still collecting its first world, day 10/10; all real R15 steps above remain pending.

## Execution continuation after R14 runtime failure (13 October, 23:02 EDT)

R14 Stage A stopped with an incomplete third collection and a recorded inference timeout, before assembly or training. Its processes have exited and its lock is released. Preserve that failed experiment without extending its cap. Proceed with the independently registered R15 route and fresh development-seed data; do not consume partial R14 evaluation data or imply that R14 succeeded. Complete the deferred integrated checks serially before model work. The small initial 16-decision-per-seed collection is a coverage/cost pilot; review phase and split coverage before deciding and registering any larger collection. No R15 model quality or app result is claimed.

## Bounded integrated-check correction (13 October 2026)

The first deferred full suite on `410ed6d` passed 1,538 tests and failed three: two ledger checks still matched the old whole threshold guard, and the parameter-documentation check found `resourceTargets` missing from simulation section 17. Correct only the ledger's source extraction to read the existing `score > -0.4` comparison inside its resource-aware guard, and document the switch's default, prerequisites and bounded target scope. Preserve simulator code, thresholds and golden data. Verify with `tests/r7-ledger.test.ts`, `tests/sim-params.test.ts` and scoped strict TypeScript, serially with the integrator's heavier checks. This is an integration correction, not a change to the scientific design or R15 behavior.

Correction verified with Node 22.22.3: all 27 tests in the two focused files passed in 18.0 seconds, including registry documentation coverage and the original golden-world hashes. Strict TypeScript checking of the ledger and those tests passed. No simulator source or golden data changed.

### Default-path performance check continuation (23:17 EDT)

The integrated suite passed (1,540 pass, one absent-fixture skip; after linking the existing validation fixture, all11 guide-data checks passed). Build passed. Default populations met compressed/field speed limits, but the120-living field check exceeded800ms/day in both initial and quiet measurements. Before attributing this to R15, compare the same field benchmark once on frozen pre-R15 source006073b on this host, without models or other heavy work. Preserve every timing; do not tune parameters or claim the120-animal limit passed. Seeds48/7/21 here are existing default-path compatibility/performance evaluation only and never enter R15 training.

The first baseline timing passed at120 animals while current timings varied (including one identical710ms second-day sample); default-population CPU difference was1.5–2.3%. A read-only hot-path review found no default-off resource enumeration. Register one final fixed baseline/current/current/baseline field-benchmark sequence after metrics, same Node22 and no concurrent heavy work, each run capped5minutes. Compare corresponding days and CPU as well as wall time; no parameter/code optimization or threshold relaxation is authorized by these timings alone. If inconsistent, retain120-animal performance uncertainty as a limit while proceeding with the default-population R15 demonstration.

The completed default metrics contain17 differences from the old September29 C6 documentation table, which cannot attribute changes to R15. Before claiming default-path preservation, run the same existing metrics command once on frozen pre-R15 source006073b (365 days,40 life-years,4 weather-years, seeds48/7/21;30-minute cap), serially without model/browser load. Compare the saved JSON exactly, preserving mismatches rather than changing parameters or updating the old scientific table. This is compatibility evaluation only.
