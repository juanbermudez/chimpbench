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
