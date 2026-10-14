# ChimpBench: handoff (13 October 2026, New York time)

This file is the entry point for whoever opens this repository next, a person or an agent. Read it first. Then read
[AGENTS.md](AGENTS.md) (binding conventions, commands, gotchas), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
(every stage and its status; Track R is the live one) and, for how to work with the user and the older science,
[docs/staging/handoff-2026-10-05.md](docs/staging/handoff-2026-10-05.md).

**Repo: https://github.com/juanbermudez/chimpbench (public).** Its history was rewritten on 5 October 2026 before the
first push: `public/audio/` (sound cut from the owner's Epidemic Sound files, not licensed for redistribution) was
removed from every commit, and the author email was replaced by a GitHub no-reply address. Every commit hash changed:
translate older hashes with [docs/staging/commit-map.tsv](docs/staging/commit-map.tsv) and `commit-map-2026-10-06.tsv`.
A fresh clone has no sound until `node scripts/build-audio.mjs` rebuilds it locally from the owner's own downloads.

## 1. What this project is and where it is going

ChimpBench is a deterministic 3D simulation of wild eastern chimpanzees (Kibale-like, an 8 km field map). It is also a
demo of a small local decision model, GLiNER2.5-Decide, choosing an animal's next act from what that animal perceives
and feels. A virtual field observer scores behaviour against 150 cited field targets (`data/targets.json`).

- **Direction (the user, 6 October 2026):** "we want to correct whe still relly on code, and we want to compare to what
  wild chimps display in the wild, and that the behavior can be driven with a simple desicion engine with the recurrent
  chape we designed". So: less hand-written code in the choice; what wild chimpanzees do as the yardstick; a small
  local engine making the choice inside the loop of the Recurrent Decision Model (the name is never abbreviated;
  [docs/recurrent-decision-model.md](docs/recurrent-decision-model.md)). The loop stays code by design: body and
  mind state, perception, the legal menu, the legality re-check.
- **The user's rulings of 10 October 2026.** Asked five questions after a review of the whole project, the user
  answered "yes to all recomendations. Move forward with the implementation": the packet may show the animal's own
  experience, and the loop may draw from the model's odds and hold the result, with nothing fitted. The Taï activity
  records are a yardstick only, the three approved Dryad files were to be downloaded, and a watching speed and the
  grooming clip go ahead of the held canopy work (plan, "User decisions (10 October 2026)").
- **Track E ("Emergence")**, the mechanisms under the choice: the best stack, S39, has 42 prescriptions left against
  147 in the default model. The working base for engine comparisons is S39 with a swallowed share of pith fibre of
  0.5, and 0.25 as the sensitivity check; no value is adopted as a claim about chimpanzees.
- **Names every result must carry** (plan, 10 October): "rules-taught model on a rules menu" for every adapter the
  rules taught (stages R4 to R5-gate, R9 to R11, R13) and for the app with one; "untuned model on a rules menu" for
  today's app; "copy of adapter X, audited, agreement A" for a stand-in. In every result inside the simulation so far
  the rules taught the model and wrote its menu.

## 2. Where things stand

### 2.0 Current continuation (13 October 2026)

The user asked Codex to take over Claude's interrupted work, finish and verify the animation fixes, and continue the model training repair in parallel. The full-project takeover note is `/Volumes/Drive/chimpbench/CODEX-TAKEOVER-2026-10-13.md`.

- **W13:** inherited changes and the verified continuation were merged from `ed57d8d` at `007a0c6`. Calls have individual sequences; nest construction uses the requested playback rate; ordinary arrival has one heading owner; call bend-plane flips and discontinuous terrain correction are repaired. Fifty focused tests, final nine scene replays (20,110 frames, no browser errors), and seven independent world-hash comparisons passed. The strict 5 cm joint-step target remains unmet near full limb extension, and fast trunk approaches at 10 min/s still exceed the nest heading limit. These are explicit open limits, not passing acceptance claims. Full evidence and failed prior captures are distinguished in `docs/staging/w13-chorus-and-spin.md` §9.7. On the combined `007a0c6` head, all 1,495 tests passed (none skipped), the production build passed, and all 17 ordinary no-model browser checks passed, including SQLite save/reload and exact continued world identity. Logs are under `artifacts/takeover-2026-10-13/`; the private verification server and browser are stopped. Missing generated sound assets remain a warning, not an audio validation result.
- **R14:** registered at `16268cd`, then amended before runs. The pipeline adds labels from the same rules teacher on states reached by the old model, retaining P5b, the menu, draw, gate and simulation parameters. The implementation was independently reviewed through `f8108bc` and merged at `75869c9`. Nine Python tests, twelve focused TypeScript tests, strict script checking and a fake-worker collection with exact replay passed. Stage A is collection, first training, offline harm checks and a bounded rehearsal. Stage B is a separate continuation with the second training and two prospective population tests. Stage A was started at **15:19 EDT on 13 October** from frozen detached `bench-r14` at `8b8f12f` in detached screen `96466.r14-repair`, under `caffeinate -i`. The first step is `learner-s48` (old adapter s7, ten collection days, three-hour cap); the chain then handles rules twins, labels, remaining collection worlds, first retraining, scores and guarded rehearsal. Its simulation/kernel/server/scripts/training/data source matches the earlier integrated verification head `007a0c6`. Estimated 12–14 model hours plus CPU labeling; no outcome is claimed yet. Launch verification at 15:25 EDT confirmed a successful 274-second warm-up, MPS device, the exact s7 adapter hash, and 278 journalled model answers with zero errors or malformed distributions. By 16:12 EDT, four collection days were complete: day four made 2,732 asks, with 79 not-applied fallbacks, zero timeouts and zero deaths. This is collection progress, not a repaired-model result.
- **R15 (new user direction):** the user then asked to move toward the state/perception decision model driving behavior and supporting training. A separate default-off resource-target slice is implemented and focused-verified: explicit activity/target packets, individually perceived or remembered food/water choices, shared legality and intention retention, stage-separated decode and two-call journal/replay, plus a new training export/adapter contract. Registration: `docs/staging/r15-perceived-targets.md`; teacher details: `docs/staging/r15-training-contract.md`. Thirty focused TypeScript tests, seven Python checks, strict script/source checks and the offer audit passed. A fake-kernel field run made 67 applied decisions (12 target calls), then replayed all 79 calls to the exact world hash. Real R15 collection/tokenizer/training/population tests and the full suite/build remain unrun while R14 is active. Evidence and commands are in the R15 registration. R14 stays frozen. Remaining R12 body/social/rare-event rulings and sealed wild records stay outside this slice. No new app adapter/default is adopted and no remote push or deployment occurred.

**Latest continuation, 17:46 EDT on 13 October:** the user authorized continuing through R15 training and seeing the model drive chimps in the app. R14's first ten-day collection finished at 17:37, its rules twin and both label collections finished by 17:43, and the seed7 learner is now running with one actual MPS worker. The first learner made 24,199 requests, with 471 not-applied rules fallbacks, zero timeouts/deaths and 373/380 counted animal-nights meeting the nesting threshold. Its registered day-five stop check did not fire. Both worlds replayed all ten daily hashes exactly during labeling; 1,321 learner rows and 269 rules rows were labeled, with 11 learner rows excluded for too few matching menus. Output hashes for all four completed steps were independently rechecked and matched. This is old-adapter collection, not a repaired-model result; remaining collection worlds, retraining and checks are still queued. Readout: `artifacts/r15/integration/r14-first-collection-20261013.json`.

The explicit R15 server, paused unsaved demo, real preflight gate, per-phase development scoring and real recurrent-run commands are integrated through `41bd4f9`. Final focused checks: 74 TypeScript +17 Python pass, strict app/scripts pass, actual startup refuses live R14. The bounded real-browser verifier is now integrated at `91acf04`, registered in `docs/staging/r15-browser-proof.md`: three pure fixture/syntax rounds and its scoped strict check passed. It records real responses, applied activity/target traces, live state and recurrence, plus screenshots for subsequent visual review. No browser or model was launched for this preparation. No trained R15 adapter or real app demonstration exists yet. Full checks and real runs remain deferred. Follow the exact sequence at the end of `docs/staging/r15-perceived-targets.md`. Thread heartbeat `finish-r14-and-bring-r15-into-chimpbench` is active every 15 minutes to review completion and continue; no additional permission is needed for this authorized local work.

**20:00 EDT update:** the second ten-day learner (seed7, old s11 adapter) and its rules twin finished by 19:59; label collection and replay are running. The learner made 22,389 requests, with 377 not-applied fallbacks, zero timeouts/deaths and 371/380 counted nesting nights. Its day-five stop check did not fire; both completed run output hashes match their step receipts. Evidence: `artifacts/r15/integration/r14-second-collection-20261013.json`. The third collection world, training and evaluation remain queued. No R15 model work has started.

**22:02 EDT incident:** the third collection has six completed days. On day7 one inference timed out after 120 seconds; the replacement then failed its ten-minute warm-up. Both errors are preserved in `runs/learner-s21/journal/d007.jsonl`. The existing runner automatically started another replacement (observed PID40089); the Stage A parent is still active. No manual restart, frozen-source edit or second model was launched. The registered cumulative three-hour step cap remains **23:05:38 EDT**; inspect actual terminal state and processes before any continuation. Evidence: `artifacts/r15/integration/r14-worker-incident-20261013-2202.json`. This is a runtime failure, not a scientific stop; the earlier finish estimate is now uncertain.

**22:30 EDT recovery:** the third replacement warmed successfully at 22:20 (544 seconds) and actual collection resumed on day7. The journal retains one inference timeout and two failed replacement warm-ups. The original 23:05:38 EDT cumulative wall deadline is unchanged; collection completion within that cap is uncertain. A one-second read-only sample during the last replacement showed Python imports spending most sampled time in filesystem reads/open/directory listing (`artifacts/r15/integration/r14-worker-sample-20261013-2216.txt`); this is a diagnostic clue, not a confirmed root cause. No manual restart or frozen-source change occurred.

**23:02 EDT terminal review:** R14 Stage A is `failed`. At 22:47 the third collection ended at 8/10 days because the day-fit estimate said another day would exceed its original three-hour budget. The chain then refused the incomplete/timeout-bearing run. All model/chain processes have exited and the shared lock is absent. There is no new R14 adapter, assembled dataset, offline verdict or rehearsal result. The day-five scientific guard had passed; this is an execution failure, not evidence of repair success or scientific futility. Preserve the frozen run; do not resume it, extend its cap or use the partial seed21 data for R15. Terminal evidence: `artifacts/r15/integration/r14-terminal-review-20261013.json`. Per the user’s authorization, continue independent R15 checks, seed48/7 data and training. The integrated suite is now running serially with concurrency4 and a 30-minute wall cap; no model or other heavy check runs beside it.

**R15 execution started, 23:11 EDT:** frozen detached `.claude/worktrees/bench-r15-live` at `a191de0` has dependency/raw-data links and a clean checkout. First integrated suite: 1,538 pass/3 failures, all in the audit/document integration (ledger threshold source matcher and missing §17 resourceTargets row). Corrected without simulator/golden changes; 27 focused tests and scoped strict passed. Browser readiness race also corrected before a real browser run (live status loop, at most one UI start). Production build passed on the frozen source. Full-suite rerun and both profile benchmarks are running serially (tool session86175), logs/results under that worktree’s `artifacts/r15/integration/`. No R15 data/model has run yet. R15-owned keep-awake PID60113/tool session47775 has a12-hour bound; stop it when overnight work is done. No R14 process/lock remains.

**R15 integrated checks, 23:29 EDT:** frozen `a191de0` passed production build and the full suite with 1,540 passes, zero failures and one absent-validation-fixture skip. Linking the existing C7a validation fixture and running its guide-data file separately passed all11 checks. Default populations met both profile speed limits. A registered baseline/current/current/baseline field check found overlapping 120-animal timings: baseline839/738 and821/725ms; current821/732 and798/714ms. The800ms limit is not consistently met on either source; no clear R15 regression is established. Preserve this performance limit and do not tune from it. Current default metrics differ on17 rows from the old September29 table; the exact same command is now running on pre-R15 `006073b` to establish direct compatibility. All evidence is under `.claude/worktrees/bench-r15-live/artifacts/r15/integration/`. No R15 dataset or model has run yet. Ordinary browser and two registered real UI refusal checks follow serially, then the initial16-selected-decision pilot for each of seeds48/7.

**23:35 EDT direct compatibility result:** the same registered simulation-metrics command on pre-R15 `006073b` and R15 `a191de0` produced byte-identical JSON across all39 metric rows, SHA256 `e128b9dd80675229c58af844d362585d870d70053524f75e0c96cffe67ddf631`. The17 differences from the September29 documentation table therefore predate this R15 slice. No scientific table or parameter changed. Evidence: frozen live `artifacts/r15/integration/default-off-direct-comparison.json`. Browser agent now owns the serial heavy slot for ordinary no-model verification and the two preregistered refusal UI cases.

**23:42 EDT browser continuation:** ordinary browser verification on `a191de0` passed11 early checks then failed SQLite initialization. The shared dependency symlink points outside the frozen worktree, so Vite returned403 HTML for the correct WASM URL. Preserve the failure and HTTP evidence in `bench-r15-live/artifacts/r15/browser-proof-20261014/ordinary/`. The independently registered missing-manifest and invalid-adapter UI checks both passed, with visually reviewed failure messages, paused clock, unchanged tick/hash, zero model calls and no model process/lock. Their servers and browsers are stopped. This tests refusal, not trained inference.

The narrowly registered Vite correction adds only the canonical SQLite `dist` directory to the default workspace allowance. It changes no save format, simulation, packet or model code. New frozen `.claude/worktrees/bench-r15-ready` at `a70720f` is clean with dependency/raw-data links. Its production build passed. Browser agent now owns the heavy slot to recheck HTTP200/WASM bytes, refusal of unrelated external files, and ordinary save/reload flows. If that passes, collect the initial R15 pilot here under `artifacts/r15/pilot-a70720f/`, seeds48/7 serially,16 selected fresh decisions each,1400 ticks plus30day burn-in,30minute cap each. No data/model work has started yet.

**23:45 EDT ready for data:** the corrected frozen `a70720f` passed all17 ordinary browser checks, including real SQLite save/reload, exact2000-tick continuation, older-parameter handling and tab ownership, with no page/console errors. The exact WASM request returns200 with valid bytes; an unrelated external marker still returns403. Screenshots were visually reviewed and owned server/browser are closed. Evidence: `bench-r15-ready/artifacts/r15/browser-sqlite-fix-round1/`. Existing missing generated audio remains a warning outside this acceptance.

The initial R15 collector now runs serial seed48 then7 from this same frozen checkout, tool session16835, under `artifacts/r15/pilot-a70720f/`. Each command has16 selected fresh decisions,1400 sampling ticks after30-day burn-in and an explicit1800-second cap; a failure stops the pair. Next inspect phase/split/animal coverage and exclusions before assembly or any expanded budget. Neither preflight nor training has started. Browser/build checks are complete for the current source; do not repeat them without a new change or unresolved concern.

**23:46 EDT collector failure:** the seed48 pilot exited1 after21.4seconds before writing a dataset; seed7 was not started. The reused R8 sampler calls `packetsOf` before the R15 extension. That constructs an old state-only packet by removing own-state while retaining `resourceChoice`, which correctly fails R15 packet validation. Preserve `bench-r15-ready/artifacts/r15/pilot-a70720f/logs/s48.log` and its result metadata. No lock or model was started. A narrow collector-routing correction is being registered and implemented separately; do not weaken R15 packet validation or retry the frozen source. App/build/save checks remain valid because this is a training-export path. Next freeze the reviewed correction, repeat the same registered16-decision seed48/7 pilot in a new directory, and inspect coverage before preflight/training.

**23:52 EDT pilot passed:** correction `e792b7e` is frozen in `.claude/worktrees/bench-r15-data`, with unchanged app/simulator/model source. Three actual sampler/teacher/purity tests and strict script checks passed. Seeds48/7 each produced32 rows from16 selected fresh decisions, no exclusions, in25/23seconds. Coverage:24 kind+24 target training rows across20 seed/animal pairs;8+8 development rows across6 pairs. Drinking has only1 training target and no development target. Evidence `artifacts/r15/pilot-e792b7e/coverage.json`. A fixed64-selected-decision expansion per seed is now registered in the training contract, same frozen code and time/tick limits, fresh `collection-64-e792b7e` directory. Expanded parts supersede the duplicate pilot prefix; inspect coverage then assemble only expanded parts and run real preflight before training. No model has run yet.

**23:55 EDT real preflight running:** the registered expansion selected21 fresh decisions on48 and22 on7 within1400 ticks, producing86 rows with no exclusions. Assembly passed:62 training rows and24 development rows, evenly split kind/target, across25 train and8 development seed/animal pairs. Target coverage remains narrow: training11 food-trip,19 eat-here,1 drink; development8 food-trip,4 eat-here,0 drink. Use this only as an initial bounded training/app demonstration, not a quality/viability result. Expanded files alone were assembled, excluding duplicated pilot rows. Coverage and hashes are in frozen `bench-r15-data/artifacts/r15/collection-64-e792b7e/`; FT root is its `ft/` subdirectory.

The first preflight invocation under `fnm exec` refused before loading or creating preflight output because the guard sees the wrapper's script-bearing argv as another model process. Evidence includes its log and `preflight-refusal-review.json`, confirming no matching process, lock or preflight directory afterward. No guard changed. The direct launch exports `/Users/zef/.local/share/fnm/node-versions/v22.22.3/installation/bin` at the front of PATH and uses shell `exec /Applications/Xcode.app/Contents/Developer/usr/bin/python3 -B training/decide_ft/r15_preflight.py --root artifacts/r15/collection-64-e792b7e/ft --run`. It is active in tool session98807; supervisorPID73896 owns the shared lock with purpose preflight. Log `logs/preflight-direct-supervisor.log`;45-minute cap enforced by supervisor. Run no model, browser or heavy check beside it. Inspect actual result/token/parity files and release before training. Future Python supervisors should use this direct-exec Node22 PATH pattern rather than a lingering fnm parent. Training has not started.

**23:59 EDT R15 training started:** preflight completed successfully in196.2seconds and its supervisor exited0, releasing the shared lock. It measured172 original/permuted packets, maximum615 real tokens, none over1280. All24 numerical fixtures used identical token IDs; maximum gaps were0 at fp32 API parity,0.00023413 half/API,0.00107551 fp32/half and0.00867224 bf16/half, all within registered bounds. Receipt and hash-bound arrays are in `bench-r15-data/artifacts/r15/collection-64-e792b7e/ft/preflight/`.

Independent read-only review confirmed43 exact phase pairs, no duplicate rows, zero overlap between25 train and8 development seed/animal identities, normalized labels and no teacher scores/diagnostics in model packets. Limits remain: shared worlds/time, one short dawn/daylight window per seed, only1 training drinking target and0 development drinking targets. This adapter is an initial implementation demonstration.

Training `r15-resources-s7` is now active in tool session97007, supervisorPID74796 holds the shared lock with purpose training. Same frozen `e792b7e` and FT root; log `logs/train-s7-supervisor.log`. Direct-exec Node22 PATH launch, three epochs, soft-label recipe, six-hour supervisor cap. No other model/heavy check may run. Review actual epoch history/completion hashes after successful exit; then evaluate development rows, run720-tick recurrent proof+exact replay, and only afterward start the actual app model proof. No trained adapter or real model-driven app result is claimed yet.

**00:04 EDT,14 October: first R15 adapter trained.** `r15-resources-s7` completed three epochs, supervisor exit0, with no OOM retries. Actual weight SHA256 is `c3e06f72468b9ef742f2940f026371036217d96a7a3b80d7297270c1387dd41a`; weight/config/preflight/runtime bindings were independently rehashed and matched, then the lock was confirmed released. Development NLL went2.3502 untuned →1.7195 →1.6001 →1.5936; top-label agreement .25 →.3333 →.375 →.375 on24 examples. Training cost116seconds, full trainer194seconds after loading,186 example exposures, peakMPS5.52GiB. Treat these as tiny development imitation results, not quality or viability.

The separate serving evaluator now runs from frozen `bench-r15-data` at `e792b7e`, tool session41164, output `artifacts/r15/collection-64-e792b7e/evaluation-s7`, log `logs/evaluate-s7.log`. PID76954 holds the shared lock as R15-app for this headless provider. One-hour cap includes startup. Wait for actual result and worker exit; then run the registered720-tick headless recurrent demonstration and exact replay. Training seed11 and real app model proof remain pending. Current default app/save policy remains unchanged.

**00:08 EDT serving evaluation passed:** s7 evaluated all24 development rows through the real verified serving worker in111.5seconds and exited0 with lock released. Kind: CE1.5324 versus uniform1.7719, top-teacher agreement6/12; target: CE1.6548 versus uniform1.7329, agreement3/12. This is a descriptive small-data result, with no drinking development example. Full normalized distributions and hashes are retained in `collection-64-e792b7e/evaluation-s7/`.

The real720-tick model loop now runs in tool session87391, output `collection-64-e792b7e/loop-s7`, log `logs/loop-s7.log`, frozen `e792b7e`, seed48 W50 with five adults and draw decoding. It owns the exclusive model slot; no second model or heavy checks. Require actual two-stage applications, changed body/own inputs and exact replay after worker exit. After reviewing s7's loop, run the separately registered seed11 replication before the final browser demonstration so the verified primary s7 app can be left available afterward. This changes only execution order, not either training recipe, dataset, thresholds or chosen primary adapter. Both training seeds and their limits remain as registered. Browser agent is preparing the existing bounded proof without launching.

**00:11 EDT real recurrent proof passed:** s7 completed720 ticks for five adults on development seed48. All62 decisions applied from74 actual model calls, including12 target calls, with0 fallbacks. Allfive animals showed changed body and own-experience inputs in later requests. The runner's verification and a separate CLI replay both reproduce hash `04fd587810b8b49d`. It finished in137.7seconds; worker exited and lock released. Full requests, probabilities, receipts and checkpoints are in `collection-64-e792b7e/loop-s7/`; replay log is `logs/replay-s7.log`. This is actual trained-model control in the headless loop, not yet the browser demonstration.

The separately named `r15-resources-s11` replication is now training in tool session36541, same FT root/frozen source/data/preflight/three-epoch recipe and six-hour cap. Log `logs/train-s11-supervisor.log`; it exclusively owns the model slot. Review its completed history and hashes before development evaluation/recurrent replay. The primary browser adapter remains s7, chosen in advance. After the replication checks close their worker, give app agent GO for its prepared existing bounded proof on private5182, VITE_DECISION_PROVIDER empty, R15 enabled, no MGOGO_NO_MODEL. Do not pause heartbeat until that real browser proof and visual review are complete.

R14 run root: `/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r14/artifacts/r14`. Read `state`, `status.log`, `steps/*.json` and `logs/learner-s48.log`, or run `python3 -B scripts/r14.py status` from that frozen checkout. The chain retains cumulative caps and stops on execution failure or scientific futility; do not restart blindly, edit its checkout, launch another model, or run heavy verification beside it. Stage B is not queued automatically. The application remains on its existing default adapter.

The older queue description in §2.2 is historical. Read the current R14 state and live process before starting any model work; one model process and no concurrent whole suite, build or animation verification.

### 2.1 What 10 to 12 October 2026 established

Fourteen stage branches were merged into `track-e` on 11 October; the viewer stages W6 to W10 and the stages R13 and
RW3 followed on 12 October. Each line names its document under `docs/staging/`. "The first adapter" is
`r4-rules-state`. Inside the simulation every figure for an adapter is a result of a **rules-taught model on a rules
menu**, and "the untuned model" is the **untuned model on a rules menu**. On the wild Taï record the menu is the
record's own, and each adapter is named by what taught it.

- **The review (10 October).** A read-only review found that no kernel had ever chosen a tree (the menu held exactly
  one feeding option on 99.6% of asks) and that 35% of the first adapter's training labels were acts the gate kept or
  that had arrived. Plan, "What the review changed"; reports in `/Volumes/Drive/chimpbench/shots/review-2026-10-10/`.
- **Who decides today.** With the first adapter and the gate on, the model picked the kind of act from a real choice
  for 34.8% to 63.0% of waking minutes, the target of 7.6% of acts and no ending. A trip could go to 50.8 trees on
  average and the menu shows 0.74. `r7-ledger.md`; the timing card: `r7-prereg.md`.
- **The wording test.** The first adapter picks the rules' decision on 0.609 of 954 held-out fresh draws with the
  packet it was trained on, and on 0.386 with neutral option labels (chance 0.186, the untuned model 0.286). More than
  half of what it learned over chance was read from the rules' own sentences. `r8-wording-numbers.md`; chance and
  the untuned model: `r4-numbers.md` and `r8-prereg.md` §10a.
- **Draw and hold, and the second training seed.** For the first adapter neither decode became the standard: a seeded
  draw brings its switching and trips toward the rules' and fails "does no harm" (nights in a nest, reserves), and a
  held draw is worse. The top pick stays, with a draw arm beside it in every engine test. Trained again, the first
  recipe is the same adapter offline and under the top pick, and differs under a draw. `r9-prereg.md` §10.6,
  `r9-numbers.md`, `r9-seed2-numbers.md`.
- **The first whole population on the real model.** Every animal aged 8 and over on the first adapter for nine
  simulated days, seed 48: viable (no death, 342 of 342 nights in a nest) and sedentary. Beside the same 38 animals on
  the rules it eats 1,487 against 1,597 kcal a day, walks 1.63 against 2.50 km and begins 2.4 trips to food against
  7.6. A level on one training seed, animals under 8 on the rules. `r10-prereg.md` §10.8, `r10-night-s48-paired.md`.
- **The honest retraining (stage R11; ended at 09:06 EDT on 12 October).** The small model was taught the rules' own
  odds on packet 5, neutral option labels, fresh draws only, in two trainings. Offline both learned the rules'
  distribution and trip rate (marks O1, O2 met) and missed O3 (the heat probe moves 0.02 the wrong way) and O4
  (carrying on 0.052 and 0.059 above the rules', limit 0.05). In the loop under the top pick, the registered decode,
  the outcome is S2 with lock-in (36.6 and 33.7 act changes a day against the rules' 53.9 ± 14.3). Under a draw (the
  second line; no outcome is named from it) the recipe is told from the rules on no timing row, fails no guard and
  keeps its nests (N1 met). The two trainings agree. By the ablation's rule the shorter packet is the one to serve,
  though one shorter-packet draw arm had two deaths. Ten animals, five days; nothing in it is about wild
  chimpanzees. `r11-prereg.md` §14, `r11-numbers.md` §4 and §4a, `r11-offline.md` §10.
- **Forked outcomes do not repeat.** Each option was forced on a copy of the world and the animal's body read later.
  The best kind of act of four replicates is the best of four others at 0.39 of decision points after 3 simulated
  hours and 0.34 after 6 (the registered line was 0.70, chance 0.23). `r7b-prereg.md`, `r7b-numbers.md`.
- **The scorecard can hardly show "closer".** Measured as distance outside the field band, the rules already sit
  inside the band on 11 of the 15 short-scorecard rows at the population unit and on 10 of 12 at ten animals. An
  engine could be shown closer than the rules on one row (T-SOC-6) at the population unit and on none at ten animals.
  A claim of "closer to wild chimpanzees" has to come from elsewhere. `r7-prereg.md` §13a, `r7b-prereg.md`.
- **The three downloaded deposits.** Taï grooming is a true wild choice record, and a narrow one: the first adult
  groomed among those in sight (557 records to learn from, 329 to tune on, 420 sealed). The Kanyawara coalitions are
  a small test, never a teacher; the Budongo scans a yardstick for party size only. On the Taï development part no
  kernel reaches the simple rule "the partner it groomed first most often before" (0.353; the untuned model 0.301,
  the Ngogo-taught adapter 0.319), so a small Taï adapter was registered (stage RW3, §2.2). `rw2-prereg.md` §8.4.
- **The viewer (W1 to W10).** W1 to W5 (11 October): adults on the ground are drawn walking at Real time, at the new
  Watch 4× (key 2) and at 1 min/s; no white-out facing a low sun; the young have eyes; a selected animal shows its
  reason; grooming pairs on the ground move. W6 to W10 (on `track-e` since 12 October): a decision shows on the body
  before the act, fruit shows in crowns and on the map, calls draw their reach and listeners turn, the map says what
  each party is doing, the body shows state and idles, pairs sit together in crowns. They became `track-e` after an
  independent check (1,402 tests passing) and a measurement on the graphics card: no cost outside the noise in the
  scenes measured, except about 1 ms in 29 in the widest daytime strategy view of the 160 m map. None of W6 to W10
  was seen with a model. Plan, "Stages W6 to W10"; AGENTS.md, "Open issues".

### 2.2 Historical queue of 12 October 2026 (completed; retained for artifact paths)

**The model queue of 12 October (stage RW3, then stage R13) ended at 15:11 EDT and both stages are read; no model process is running.** What follows in this paragraph is history, kept for the paths. It was started at 09:30 EDT on 12 October in a detached
`screen` session named `modelqueue`; each stage runs from its own frozen checkout, one model process at a time, and a
failure of the first does not stop the second. **Stage RW3 ended at 10:41 and is read** (`rw3-prereg.md` §15: a valid
run; 0.307 and 0.353 against the simple rule's 0.353 and the untuned model's 0.301; every statement "not shown"; the
Taï record stays a test, not a teacher, at this size). **Stage R13 ran from 10:41 to 15:11 and is read** (`r13-prereg.md` §14: 20 simulated days, no timeout, no death; not
viable by the registered readouts, nights in a nest 0.972 against a floor of 0.982 and reserves −0.054% a day against
−0.011; movement at the rules' level on three rows of four, distance above; the draw does not become a decode for
population runs). **The run's records were then read without a model** (`r14-diag-nights.md`,
`r14-diag-energy.md`, `r14-diag-decode.md`; `r13-prereg.md` §14.4): both failures sit in states the rules' own worlds
hardly reach (in a nest by day beside companions in theirs; alone in a finished nest in late dusk), and stage R14
(labels from the rules on the model population's own states) is being designed, registered and built on branch
`r14-own-states`; nothing of it has run. **Read the `state` files first
(third item). If the queue's no longer says `running`, the rest of this paragraph is history: go to §5, task 1.**

- **Stage RW3** (`docs/staging/rw3-prereg.md`): two small adapters taught 557 wild Taï first-grooming-partner
  choices, then scored on the 329 development records; about an hour; frozen checkout `.claude/worktrees/bench-rw3`
  (c6024c7). Its chain started at 09:31. At 10:15 the check and the dry step had ended with exit code 0; the two
  reference scorings had read stage RW2's figures again (0.301 for the untuned model, 0.319 for the Ngogo-taught
  adapter), the check `rw3-prereg.md` §14.4 asks for before the trainings; the first training had run from 09:41 to
  10:03 (exit code 0, its manifest written) and the second, begun at 10:03, was in its first epoch (its model load
  ended at 10:12). No Taï-taught adapter had been scored. Steps: `00-check`, `01-dry`, `10-eval-base`,
  `11-eval-ngogo`, `20-train-7`, `21-train-11`, `30-eval-7`, `31-eval-11`, `40-report`.
- **Stage R13** (`docs/staging/r13-prereg.md`): every animal aged 8 and over on stage R11's first adapter with a draw
  from its odds (the arm `p5b-s7-draw-1`, which the registered rule names because N1 is met), on the fresh seed 3613:
  at most 20 simulated days in 9 hours, then the rules arm, the control arms and the report; frozen checkout
  `.claude/worktrees/bench-r13` (fcbd612). At 10:15 its chain had not begun. Steps: `00-check`, `01-dry`, `10-model`,
  `11-rules`, `12-controls`, `20-report`.
- **To check, only read.** `cat` the `state` and `status.log` of the queue (`bench-r13/artifacts/queue/`), of RW3
  (`bench-rw3/artifacts/rw3-chain/`; a step's output is `<step>.log` beside them) and, once it has begun, of R13
  (`bench-r13/artifacts/r13/chain/`). A state reads `running`, `failed` or `done`; a status log has a START and an
  END line per step, with its exit code. `screen -ls` shows the session.
- **Do not disturb it.** Do not attach to the session. Do not edit, commit or run anything in `bench-rw3`, `bench-r13`
  or `bench-r11` (a model step refuses a tree that is not clean, and R13 reads its decode rule from
  `bench-r11/artifacts/r11/tables/r11-numbers.md`). Start no Python from `/Volumes/Drive/chimpbench/decide-env`, no
  `pnpm dev` without `MGOGO_NO_MODEL=1`, no `scripts/gpu-probe.mjs`. Run no whole test suite and no heavy build while
  a scoring, loop or population step loads its model or asks: a warm-up failed that way on 12 October (AGENTS.md,
  "Gotchas"). The population run of stage R13 is such a step for up to nine hours.
- **Where the output goes** (none of it in git): `bench-rw3/artifacts/decide-ft/rw3/adapters` and
  `bench-rw3/artifacts/rw3` (`tables/rw3-numbers.md`); `bench-r13/artifacts/r13` (`tables/r13-numbers.md`).
- **If a stage failed.** Its `state` reads `failed` and the last line of its `status.log` names the step. RW3: wait
  until the queue has ended (R13 follows it either way); a finished step does nothing when run again, so launch
  `artifacts/rw3-chain/chain.sh` again in a detached `screen` session, and after a training cut short (weights
  without `manifest.json`) delete that adapter's folder first (`rw3-prereg.md` §13, §14.4). R13:
  `scripts/r13-run.sh chain` again with the exports of `…/queue/queue.sh`; it resumes the model arm from its newest
  checkpoint with what is left of its nine hours, and never past a stop check that ended the run (`r13-prereg.md`,
  "For the integrator").

**Stage W11 (viewer polish) is on `track-e` since 10:18 EDT on 12 October** (merge cafc203 of branch `w11-polish`,
head bc513ba: the builder's eight fixes and the second reader's four repairs; its whole suite read 1,412 tests, 1,411
pass, 1 skipped, on the branch): no jump across a crown, a pair picture that agrees with its tag, an eased cut-off
scratch, a lone animal no busier, a steady nest heading, nests under sleepers, the bough as a limb of its tree with
a leafy spray, a hand that meets the mouth. Its document is `docs/staging/w11-polish.md`. Done on the merged head after the
model queue ended (12 October, 15:12 to 15:32 EDT): frame time on the graphics card (no difference in eight scenes), the
whole suite (1,430 tests, all passing, at cfac813) and `pnpm build`.

## 3. Set-up on this computer

**The repo lives at `/Volumes/Drive/chimpbench/MGOGO`** (an external APFS drive; Apple M4, 16 GB), never under
`~/Desktop` or `~/Documents`. On this Mac iCloud Drive syncs those folders with "Optimise Mac Storage": within an hour
of the first clone macOS had evicted 14,230 of 18,704 files (the git pack among them) and every runner stopped.
**Never put the repo, a worktree or run outputs in an iCloud folder** (`ls -lO` shows `dataless` on evicted files).

1. **Node 22.22.3 exactly** (`.node-version`; prefix commands with `fnm exec --using=22.22.3 --`), pnpm 8.15.9, then
   `pnpm install`. Node 22.19.0 passes the tests and breaks every worker-pool script. The whole suite ran once on
   the merged code on 12 October, 10:02 to 10:07 EDT, four files at a time, on `docs-12oct` at a3bbbb6 (`track-e`
   57718b5 plus changes to three documents no test reads): **1,420 tests, 1,419 passing, none failing, 1 skipped**
   (the guide's scorecard check, whose data file is not on this computer). That is the viewer branch's 1,402 with
   the 8 of stage R13 and the 10 of stage RW3; it was the first run with the three merges of 12 October together.
   It ran beside a training of stage RW3 and held the 1-minute load at 8 to 10; the second training's model load,
   which began a minute into it, took nearly nine minutes against about three for the first (AGENTS.md, "Gotchas").
   **The whole suite ran again on the final merged head** (`track-e` at cfac813: stage W11 and the three stages' results
   included) on 12 October, 15:28 to 15:32 EDT, with no model process running: **1,430 tests, all passing**;
   `gen-params --check` valid; `pnpm build` passes.
   Do not run one beside a scoring, loop or population step (§2.2), and never two at once. `tsc --noEmit`,
   `gen-params --check`, `decision-guide --check` and `pnpm build` pass on this branch's head (12 October).
   **To run the app with no model at all** (the way to look at it while the queue of §2.2 runs): `MGOGO_NO_MODEL=1 fnm
   exec --using=22.22.3 -- pnpm exec vite --host 127.0.0.1 --port 5181 --strictPort`, then open
   `http://127.0.0.1:5181/?provider=server` (another free port if that one is taken). `MGOGO_NO_MODEL=1` starts no
   Python worker. `?provider=server` keeps the page from downloading and loading the in-browser model, which is the
   default (about 872 MB, on the GPU when the browser has one); the rules then decide for every animal. Every other
   command is in AGENTS.md, "Commands".
2. **Not in git; copy by hand, never to a public place:** `data/raw/` (12 folders of downloaded field datasets with
   their `PROVENANCE.md`; it holds location-sensitive raw coordinates and animal identities: never commit or publish
   them); `artifacts/validation/c7a-field1y.json` (`tests/guide-data.test.ts` skips its scorecard check without it);
   the adapters and run folders listed in §4. The simulation itself runs without any of them.
3. **The real model.** Everything is under `/Volumes/Drive/chimpbench/`:
   - **GHN:** `/Volumes/Drive/chimpbench/GHN`, a clone of the private repository that holds the model's serving
     code, read-only. The worker (`experiments/active_perception/decide_provider.py`) is on the branch
     `ghn-live/semantic-graph-and-shape-review` (c26b0ec), which is checked out. Keep it checked out.
   - **Environment:** `/Volumes/Drive/chimpbench/decide-env` (uv, CPython 3.12.12), from GHN's pinned
     `decide-requirements.txt`: torch 2.14.0 (MPS), gliner2 2.0.0, transformers 4.57.6, peft 0.21.0. The worker
     refuses anything but torch 2.14.0 and its pinned gliner2 source hash.
   - **Model cache:** `/Volumes/Drive/chimpbench/hf-cache`; `fastino/GLiNER2.5-Decide`, revision `7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6`.
   - **Variables** (set both cache variables, or the model is looked for on the internal disk):
     `MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN`, `MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python`,
     `HF_HOME=/Volumes/Drive/chimpbench/hf-cache`, `HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub`. The offline
     flags are set by the code. Adapters: `MGOGO_FT_ROOT` (the folder that holds `adapters/<name>`) and
     `MGOGO_FT_ADAPTERS`. `training/decide_ft/r4_py.sh <script>` sets the four variables and a default
     `MGOGO_FT_ROOT`; `parity.py` must print `PARITY OK`.
   - **Measured here:** 0.44 s per decision at 467 tokens for the untuned model, and the packet's length is the only
     speed lever (plan, "What the review changed"); 0.52 s a call over the population run; a worker holds 1.97 GB at
     rest and 3.16 GB at peak (6 October) and loads the model on its first batch, in 55 to 220 s (372 s once on
     12 October, on a loaded machine); a training runs at 0.6 s an example and 6.1 GiB (`r11-prereg.md` §12).
   - **Through the app** (this starts a model process: never while the queue of §2.2 or any other model step is
     running): the four variables, then `fnm exec --using=22.22.3 -- pnpm exec vite --host 127.0.0.1 --port
     5183 --strictPort` and `node scripts/verify-browser.mjs http://127.0.0.1:5183` (all 20 checks passed on
     6 October 2026). Everything else runs with `MGOGO_NO_MODEL=1`.
4. **Browser scripts** (`scripts/shot.mjs`, `verify-browser.mjs`, the probes) load Playwright through
   `scripts/lib/playwright.mjs` and launch `/Applications/Google Chrome.app`. Install it once outside the repo:
   `npm install --prefix ~/.cache/chimpbench/playwright playwright-core` (or set `MGOGO_PLAYWRIGHT`).
5. Use `/usr/bin/python3` for the integrator scripts and for `scripts/rw2/rw2_ingest.py` (run as `-I`).
6. **Disk:** `scripts/e-run.ts` and `scripts/r10-night.ts` refuse to start below 5 GB free.
7. **Worktrees:** `git worktree add -b <name> .claude/worktrees/<name> track-e`, then link `node_modules` and
   `data/raw` from the main checkout (AGENTS.md, "Gotchas"). A frozen run checkout is the same with `--detach
   <commit>`; `git status --short` must print nothing. The integrator's kit: `docs/staging/integrator-kit/`.

## 4. Branch map and frozen checkouts

**`main` is never committed to.** Since 6 October every push has moved it together with `track-e`, by fast-forward
to the same commit. The user's instruction of 6 October: "merge and push to main, and make sure these issues get
addresssed and we move faster parelalizing more work to get closer to the real results"
(`docs/staging/handoff-2026-10-05.md` §2.2, which reads it as: the integrator may merge finished, tested work into
`main` and push it). On 12 October the next push waits for the user's ask (§6). Deploys stay held.

| Branch or checkout | Head | State |
| --- | --- | --- |
| `main`, and `track-e` on the remote | 7f9ec5b | Equal. Pushed on 11 October 2026 at 14:59 EDT, at the user's request. Nothing has been pushed since: a push needs the user's ask (§6) |
| `track-e` (local, the integration branch; the main checkout is on it) | 57718b5 when this was written | **191 commits ahead of the remote, not pushed:** stages RW2 and R11 with R11's results, the viewer stages W6 to W10 (`integrate-t2`, fast-forwarded at 9be7d44), the merges of `r13-population` (15798c1) and `rw3-tai-adapter` (e0fd29e). Count again before trusting this: `git rev-list --count origin/track-e..track-e` |
| `docs-12oct` | 65d2494 | The shared documents brought up to date on 12 October; merged into `track-e` |
| `w11-polish` | bc513ba | Stage W11, merged into `track-e` on 12 October (cafc203) |
| Merged into `track-e`: `r7-card` to `r12-menu-design`, `rw2-wild-records`, `w1-travel-walk` to `w5-grooming`, `docs-refresh` (11 October); `integrate-t2` with `w6-decision-beat`, `w7-fruit`, `w10-calls-map`, `w8b-state-on-body` and `w9b-tree-pairs`, then `r13-population` and `rw3-tai-adapter` (12 October) | | Nothing on them is missing from `track-e`. The cut-off first builds `w8-state-on-body` and `w9-tree-pairs` are superseded |
| **Worktrees to keep for their `artifacts/`** (not in git): `r11-honest-retrain`, `r4-train`, `r4b-retrain`, `r5-pilot` | | `r11-honest-retrain`: stage R11's four adapters and its loop arms (`artifacts/decide-ft/r11`, `artifacts/r11/loop`); stage R13 loads `r11-p5b-s7` from there. `r4-train`: the adapters of stage R4, among them the Ngogo-taught `r4-field-groom` that stage RW3 scores. `r4b-retrain`: the adapters of stages R4b and R4c, and the first adapter as the population run loaded it. `r5-pilot`: the pilot's run folders |
| `bench-rw3` (frozen, c6024c7) | | **Running (§2.2). Do not touch.** Keep afterwards: the Taï training file, the adapters `rw3-tai-groom-s7` and `-s11` and their scores exist only there, and its `artifacts/rw2` holds derived wild records (never commit them) |
| `bench-r13` (frozen, fcbd612) | | **Queued (§2.2). Do not touch.** It also holds the queue's own folder, `artifacts/queue`. Keep afterwards: the population run's folders exist only there |
| `bench-r11` (frozen, 5b5a506) | | Its chain is done. Keep, and write nothing there while stage R13 runs: R13 reads `artifacts/r11/tables/r11-numbers.md`. The chain's logs are in `artifacts/r11-chain` |
| `bench-t1` (frozen, a11c45c) | | Keep. Not in git: `artifacts/r8/rerender` (the wording test), `artifacts/r9` (the decode arms and tables), `artifacts/decide-ft/r9` (the adapter `r4-rules-state-s2`), `artifacts/r10/night-s48` and `rules-s48` (the population run: receipts, contexts, checkpoints; kept for relabelling) |
| `bench-rw2` (frozen, 97be5bf) | | Keep. Not in git: `artifacts/rw2`, the derived wild records (no animal code, no date; never commit them) and the per-record model scores, which stage RW3's report was checked against |
| `bench-run`, `bench-y3`, `bench-e1v`, `bench-e1x`, `bench-e1x3`, `bench-wean`, `bench-r1b`, `ab-base` (frozen) | | Older reference runs (Track E, R1b) and a comparison base. Keep |
| `gfx-next` | 2abb1cb | The closed canopy, held by the user's decision; its grooming clip was merged as W5 |
| On the remote only: `site`, `ui-minimap`, `feat-realtime`, `main-wip-2026-10-05`, `c15-foraging`, `jev-free-arms`, `c17-fusion`, `c11-calibration`, `c10-communication`, `c13-rg`, `site-about`, `worktree-agent-*` | | Older or other sessions' work. **Do not touch without the user.** `site` is the hosted build; its deploy is held |

## 5. Next tasks, in order

1. Follow the running R14 Stage A from its frozen checkout (§2.0). W13 integration checks passed; its fast time-lapse trunk approaches and strict joint-step limit remain explicit visual follow-up work. Do not run new graphics verification while a model step is active.
2. Read R14 Stage A's explicit offline and rehearsal outcomes. A completed rehearsal only establishes completion, exact replay and passage of its catastrophic/futility stop; population viability requires Stage B's separate paired tests. Never retune a failed recipe or open a fresh test silently.
3. Keep R12's menu changes behind its existing unresolved design decisions (§6). R14 deliberately repairs training coverage without changing the menu or simulation.
4. Before any push or deployment, follow the user's request and repository privacy rules. All work in this continuation remains local on `track-e` and the stage branches.
5. Other open scientific work remains: the rules-only heat-probe reading (`r11-prereg.md` §14.2), R12's short calls, the broader decision-ownership questions, and the Track E mechanisms/yardsticks. Earlier queue results RW3 and R13 have already been read; do not restart them as unfinished tasks.
6. Older operational repairs still on record: `r9-run.sh` and `r9-seed2.sh` identify model processes only by interpreter path; earlier chain guards may not know newer trainers; `r13-run.sh report` does not require `rules-plain.json`; the population script omits ledger items 3–8. R14's own launch must guard process names and prior chain state files.

## 6. Waiting on the user

Every decision open for the user on 12 October 2026, the most consequential first, each with where it is written
and what is recommended. Where no recommendation is on file it says so, and what is built stands until a ruling.

1. **The ten rulings on the menu** (first page of `docs/staging/r12-menu-table.md`, each with its recommendation;
   four smaller design questions follow in `r12-prereg.md`, whose fifth, on the seeds, is item 11 here): nothing of
   stage R12 is built before them.
2. **A push, deploys and a licence:** `track-e` is 191 commits ahead of the remote, so nothing committed since the
   push of 11 October at 14:59 EDT is on the remote (stage RW2 with its model scores, stage R11 and its result, the
   viewer stages W6 to W10, stages R13 and RW3). A push needs the user's ask (before one: the privacy check of §5;
   the whole suite is on record, §3); deploys stay held; the repository has no LICENSE file and states no terms of
   use. No recommendation on file.
3. **Where may a claim of "closer to wild chimpanzees" come from**, now that the short scorecard can show it on one
   row at most: the timing card's anchors, new held-out rows, wild choice records? No recommendation on file
   (`r7b-prereg.md` §8).
4. **May forked body outcomes ever be a label source?** Recommended: no, as designed (`r7b-prereg.md` §8). Two of
   the ten rulings wait on this answer (a drink when not thirsty; a nest or shelter whenever possible).
5. **Should a stay question ("still in this act later?") be trained?** Recommended: not now (`r7b-prereg.md` §8).
6. **Should the training label keep the rules' continuation bonus and finished penalty?** They are hand rules about
   staying, and the review of 10 October asked for labels without them; stage R11 kept them because stripping them
   changes the teacher. No recommendation on file (`r11-prereg.md`, the end).
7. **The working base:** a swallowed share of 0.5 (declared; 13 starvation deaths in 10 seed-runs over three years)
   or 0.25 (2 deaths)? Both are carried until ruled (`e-years-prereg.md` §7).
8. **Who decides for animals under 8?** The rules today, as every result says; the menu table proposes that it stays.
9. **What counts as "the model picks the kind of act for most of the day":** do minutes the gate holds count (35 to
   63% becomes 99.9%), and is "most" more than half for kind, target and ending each? No recommendation on file
   (`r7-ledger.md`, "Decisions that are the user's").
10. **After stage R13 is read, is one training on one world seed enough to act on**, or do a second training and seed
    come first? No recommendation on file: the stage calls its own result a level (`r13-prereg.md`, the end).
11. **The next fresh seeds:** recommended that stage R12's loop test takes the sealed 4333 and 4444 and that a new
    sealed pair is named now (`r11-prereg.md`, the end).
12. **The Taï record:** are T-HUN-9 and T-END-12 compromised for the Taï adapter (recommended, and applied until
    ruled) or only flagged, and may a packet show the bystander bonds (recommended: no)? `rw2-prereg.md` §10.1. If
    stage RW3 reads "beats the simple rule", one registered opening of the sealed part needs the user's go
    (`rw3-prereg.md` §5).
13. **Budongo:** ask the field station for its sheets, the only route found to wild "join or leave" labels, and make
    its party-size figures a registered yardstick? No recommendation on file (`rw2-prereg.md` §10.1).
14. **Track E:** should the simulation offer a side in a conflict to an unrelated adult female? It never does, and
    about 96% of the Kanyawara partnerships are between unrelated females. No recommendation on file
    (`rw2-prereg.md` §10.1).
15. **Packet 5's wording:** four questions on what counts as the animal's own experience, and whether results on
    earlier packets must say they listed the rules' first partner first. No recommendation on file; as built all four
    are shown (`r8-prereg.md` §9).
16. **The viewer, what opens by default:** the layout, life-size animals, the close view at the watching speed, the
    Food layer. As built: today's layout and sizes, 1 min/s, Food on.
17. **The viewer's stylizations** (the plan's "The user's" lines for stages W6 to W10; the ends of `w2-bloom-sky.md`
    to `w5-grooming.md`): each stands as built; the larger ones are how busy idle life is, whether public stress
    raises the coat, the first mover's look back, which calls draw arcs on the whole map, and the prop bough.
18. **Stage W11's choices** (`docs/staging/w11-polish.md`): recommended to keep
    each as built, and a small registered simulation stage so that no animal grooms a partner that has climbed down.
19. **The Ngogo fission paper and its supplement:** only the user can save them (`docs/datasets.md`, row 24).
20. **Smaller, when convenient** (no recommendation on file): 2 h 45 min of model time for stage R9's gate-off
    contrast; the population script's four stop thresholds; the cap of 20,000 redraws for labels of rare menus.

## 7. Rules in one breath (details: `docs/staging/handoff-2026-10-05.md` §2 and AGENTS.md)

Field numbers are targets, never inputs; wild choice records may train a separate, named adapter, with a sealed part.
Pre-register and commit before any run of changed code; at most 3 iterations per stage. Seeds: 48 and 7 for
development; 48, 7, 21, 5, 11 for confirms; 4111 and 4222 were opened by stage R11, 3613 is stage R13's, 4333 and
4444 are sealed; never the reserved or retired seeds in AGENTS.md. Switches stay 0 by default; goldens and the field
pin test must not move. Benchmarks and model runs only from frozen detached checkouts; one model process at a time,
and no whole test suite or heavy build beside a scoring, loop or population step; no rented compute. At most
3 agents running simulations at once, 1 to 2 workers each, 1 above load 8. Never commit to `main`; never deploy or
push without the user's go. Never send the user's email or personal data to an external service; never use
Unpaywall; stop at any CAPTCHA. Never commit `data/raw`, the derived wild records, the sound files or secrets. Name
every result as §1 says. Reports to the user: short, plain English, the answer first, explicit confidence levels.
