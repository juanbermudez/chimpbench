# The app mode "Model decides for every adult"

Branch `app-model-drives`, cut from `track-e` at fcc1ae86 on 19 October 2026 (06:24 EDT). Written 06:40 EDT, before any
code of this stage. No model process is started by this stage: every test and every picture runs against R16's fake
scorer (`scripts/lib/r16-fake-scorer.mjs`) or an in-process stand-in.

The user's question (19 October 2026), verbatim: "Do the real training run on endor, but i want to make sure the app is
at the point where the model training is the main driver for behaviour, can you confirm ?". The integrator's answer
was "not yet": in the app today the rules drive every animal, and only the R15 demo route (`?r15=1`) lets a trained
adapter decide, for five adults. This stage builds what the app needs so that, once an adapter passes stage R16's
population test, the trained model is the main driver of behaviour in the app. It does not make that happen today:
no adapter has passed that test.

## 0. Registration (committed before any code of this stage)

### 0.1 What is built

1. **The mode.** A world in this mode is stage R16's population-test unit, built in the app: the field map, the
   working base `docs/staging/integrator-kit/params/M6-W50.json`, R15's path from the first tick (`observeV4` 1,
   `observeV5` 1, `menuParity` 1, `resourceTargets` 1, `activityFirst` 2), a burn-in under the rules (30 simulated days
   by default, as R16; fewer only when asked by URL, and then said on screen), then R16's kernel-arm settings (the
   intention gate on, the rules' pick kept on the menu, lockstep). Every living animal aged 8 or over is on the trained
   two-stage path (an activity call, then a target call when the activity has more than one target), membership taken
   again before every tick, as R16's day runner does. Animals under 8 stay on the rules, and the interface says so for
   each of them. The decode is R16's: one seeded draw per call at salt 1.
2. **Served as the R15 demo is served.** The calls go to the local R15 route (`/api/providers/r15/*`,
   `server/r15.ts`), its worker (`server/r15-worker.ts`) and its scorer (`server/r15-scorer.py`), with the adapter
   named on the server and its manifest, weights hash, preflight and data hashes checked before it is ready. The same
   refusals hold: no adapter, an incomplete manifest, other weights, a busy or stopped worker. The mode refuses to play
   until the server reports a verified adapter, and binds the world to that adapter (name, weights hash, packet
   version) the first time it plays.
3. **Shared, not copied.** The per-tick loop is the one R16's day runner (`scripts/lib/r16-run.ts runDay16`) runs, on
   the same shared pieces: membership before each tick, the tick, then every waiting adult answered in one pass by
   `src/kernel/loop.ts answerWaiting` (requests built from one world, asked one call at a time, applied in animal
   order), decoded by the harness decoder of stage R9 (moved from `scripts/lib/decoder.ts` into `src/kernel/decoder.ts`,
   the old file re-exporting it unchanged). R16's own files are pinned by its chain (`scripts/r16.py` SOURCES), so this
   stage does not edit them; where the app needs a number or a world they hold (the switch set, the kernel-arm world,
   the age of 8, the call limit of 30 s), it keeps one copy in `src` and a test holds it equal to R16's.
4. **Lockstep, held to what the model can serve.** The clock waits while any adult on the model waits for an answer or
   a pass is under way; the rules never fill in because the model is slow or still loading. The interface shows the
   speed actually achieved (simulated time per real second, the waits included) and the model's queue (adults waiting,
   the call under way, calls in this pass, time per call). A call that times out (30 s) or an answer that is refused
   (no answer, wrong length, another adapter, no longer legal) goes to the rules for that one decision, and is counted
   by its reason and shown. If the worker stops, playback pauses and says why; the rules do not take over.
5. **"Who decides" in the interface.** A quiet line in the top bar and a section of the Mind tab: the share of the last
   simulated hour's animal-minutes whose act was set by a fresh model choice, by an intention the gate held, and by the
   rules (stage R7's ledger categories, computed exactly as R16's meter computes them), the rules' share split into
   animals under 8 and adults; the number of adults on the model; the adapter's name and weights hash; the result name
   "rules-taught model on the R15 menu". For the selected animal: whether it is on the model or on the rules (under 8),
   and its own last hour by the same three categories.
6. **Saves.** A world in this mode saves and reopens in this mode. It plays again only when the server serves the same
   adapter (name, weights hash and packet version); otherwise it opens paused and says which adapter it was saved with
   and what the server has. The default app and every default world are unchanged: the mode's record is an optional
   field (`World.modelPolicy.drive`) that a default world never carries.
7. **Off by default.** Chosen in Settings ("Who decides") or by URL (`?drive=adults`, with `&seed=` and `&burnin=` for
   checks). Seeds a registered stage holds (R16's refused and test seeds) are refused in this mode.
8. **For checks without a model.** A probe server configuration that serves the R15 route against R16's fake scorer
   and a dry adapter folder in a scratch directory, with its lock in that directory (never
   `artifacts/r14-chain.lock`), and marks every answer "dry: fake scorer, not a model" on screen.

### 0.2 What will count as done

- Tests with a fake scorer: the mode puts every living animal aged 8 or over on the path and none under 8, before every
  tick; the clock runs no tick while an answer is owed or the adapter is not verified; timeouts and refused answers are
  counted by reason, and the counts equal the decisions the rules took for adults; the readout's shares equal R16's
  meter on the same run (the same world, the same stand-in kernel, the app's loop beside `runDay16`: equal world hashes
  and equal minutes by owner, in total and per animal); a mode world saves and reopens and plays only with the same
  adapter.
- The default path byte for byte: the golden fixture and the field pin unmoved, R15's and R16's pins equal
  (`scripts/r12-pin.ts check`), every existing test green, and a default world carrying no new field.
- The whole suite once and `pnpm build`.
- Pictures of the mode running against the fake scorer, looked at by eye: the top-bar readout, the queue, an adult's
  Mind tab and an animal under 8, under `/Volumes/Drive/chimpbench/shots/watch-2026-10-19/app-model-drives/`.

### 0.3 Where this departs from the brief, and why

- **The menu.** The brief names R12's ruled menu (`menuPossible` 1). No adapter R15 or R16 can produce can serve it:
  their manifests carry R15's contract (`resource-targets-v1`), and R15's route, R15's model kernel and R16's day
  runner refuse a context of the ruled menu (`menu-targets-v1`) by design (AGENTS.md, "R12 build"). A mode on the ruled
  menu would refuse every adapter that can pass R16's test. So the mode's menu is the adapter's contract: R15's menu
  for an R15 or R16 adapter (`menuPossible` 0, which is what the result name "rules-taught model on the R15 menu"
  says). The ruled menu waits for an adapter trained on it (a later stage), and this stage does not build it. Put to the
  integrator.
- **The decode epoch.** The decode is a draw, so the decoder's notes (its epochs) change no choice; they are not saved.

### 0.4 What is left to R16's result

Whether the trained model should drive the app at all. Until an adapter reads "viable" in R16's population test
(`docs/staging/r16-prereg.md` §12.5), the mode stays off by default, every result it shows carries the result name
"rules-taught model on the R15 menu", and nothing here says the model's behaviour is good, near the rules, or near
wild chimpanzees. Even with a passing adapter the rules still decide when an animal is asked (the gate), build the
menu, end acts, run the body and perception, and drive every animal under 8; and the model is a rules-taught model on a
rules menu. The readout exists so that this is visible in numbers.

## 1. What was built (written after the build, 19 October 2026, 07:30 EDT)

- `src/drive/world.ts`: the mode's world and numbers. `createDriveWorld(seed, days)` (the app runs the same burn-in in
  slices: `burnIn`, `armDriveWorld`), membership before every tick (`setMembership`, every living animal aged 8 or over
  `controller: 'model'`, everyone else `'rules'`), the seeds the mode refuses, and `driveArmProblem`: why a world may not
  play now (no verified adapter, no identity, another contract, or another adapter than the one it is bound to).
- `src/drive/loop.ts`: the per-tick protocol of R16's day runner on the shared pieces (`answerWaiting`, the decoder,
  `loopTap.gate` set around each tick only and cleared in a `finally`), the counts of a pass, and `fallbackReason`.
- `src/drive/ledger.ts`: who set each animal's act, exactly as R16's meter counts it, kept as a rolling simulated hour
  for the interface and as totals; its owners are saved with the world.
- `src/drive/kernel.ts`: the browser's kernel on the R15 route, with R16's 30 s call limit and a refusal of any answer
  from another adapter than the bound one.
- `src/drive/app.ts`: the burn-in in slices, each pass written where the interface reads decisions (counts, traces for
  the Mind tab, with both calls, their odds and draws), and the readout.
- `src/kernel/decoder.ts`: stage R9's harness decoder, moved unchanged from `scripts/lib/decoder.ts` (which re-exports
  it) so the app decodes with the very step R16 uses.
- Small changes on the default path, each absent or inert on a default world: `World.modelPolicy.drive` (optional),
  `advance(…, tick)` (defaults to `tickWorld`), `rosterIds` (a world in the mode puts every adult on the roster),
  `ProviderStatus.dry` and `DecisionController.dry` (absent unless a dry stand-in says so), `PersistedDecider.drive`
  (only for a world in the mode).
- `src/main.ts`: the mode's state, its pump (instead of `pumpDecisions`), the clock's gate and tick, play refused
  without a verified adapter, the adapter bound on first play, a pause with a notice if the worker stops, a notice
  (at most every 10 s) when the rules decide an adult's act, provider handling, `?drive=adults`, Settings, saves.
- Interface: `src/ui/who-decides.ts` (the words and numbers), the top bar's line (`hud.ts`), the time panel and the
  model panel blocks (`timebar.ts`, `model-panel.ts`), the Mind tab's section (`mind.ts`), the Settings row
  (`settings.ts`), styles.
- For checks without a model: `scripts/vite.fake-r15.config.ts` (the probe server plus the R15 route on the real worker
  over R16's fake scorer, everything in a scratch directory; `MGOGO_FAKE_R15_ADAPTER` serves another dry adapter) and
  `scripts/lib/fake-r15-root.ts` (the dry adapter folder).
- `tests/app-model-drives.test.ts`: 12 tests (section 4).

## 2. The numbers (no model; R16's fake odds, a hash of each option's text, stand in for the adapter)

- **The app's loop is R16's.** From one world (seed 48, one day of burn-in), one simulated hour through `runDay16` and
  through the app's loop: equal world hashes, equal asks, kernel answers, calls and fallbacks, and every animal's
  minutes by owner equal (the test of section 4). The mode's world equals R16's `kernelArmWorld(burnIn(seed, true,
  days), 0)` byte for byte, plus the mode's record.
- **A whole simulated day** (seed 48, 30 days of burn-in, headless): 1,606 passes, 2,301 asks of adults, 2,273 settled
  by the stand-in and 28 by the rules (all "choice no longer legal": in a pass every request is built from one world and
  the answers are applied in animal order, as R16 does, so an earlier animal's act can make a later one's choice
  illegal), 3,144 calls of which 843 target calls. Animal-minutes of the day: a fresh choice 56.3%, an intention the gate
  held 20.4%, the rules 23.3%, nearly all of the last the 11 animals under 8 (of 49). These shares are the stand-in's,
  not a model's; what they show is the frame: with every adult on the path, about a fifth of the time is the gate's
  hold and a little under a quarter is the young animals' rules.
- **Speed.** The 30-day burn-in takes about 15 s in the page and 20 s headless. With the fake scorer the app keeps 1
  min/s (53 to 64 s/s measured over a minute, 229 ticks). With a real adapter it would be held to the model: about
  3,100 calls a simulated day at about 0.3 s each is about 15 minutes of model time a day (R16's plan budgets 5.1 hours
  for 20 days), so about 1.5 simulated hours a real minute on average, slower at dawn when most adults are asked at
  once. An estimate, not measured: no model was run.
- **The browser run** (pictures 01 to 07; seed 48, 30 days of burn-in, 1 min/s, a minute of play): 49 living, 38 adults
  all on the model, 11 under 8 all on the rules, no animal on the wrong side; 170 asks, 169 settled by the stand-in, 1 by
  the rules (choice no longer legal), 227 calls (57 target calls); the last hour (59.25 min): a fresh choice 1,201.25,
  the gate's hold 791.25, the rules 910.75 animal-minutes (651.75 of them animals under 8). No page error.
- **Saves in the page** (pictures 08 to 11): Settings › Who decides › "Model, every adult" made "Seed 49 · model, every
  adult" (30 days of burn-in, 15 s), it refused to play before the adapter was started, bound itself to the dry adapter
  `r16-agg-s7` on its first play, saved, and reopened in the mode, paused, bound to the same adapter, and played. With the
  server restarted on another dry adapter (`r16-agg-s11`) the same save reopened in the mode and refused to play:
  "This world was saved with the adapter r16-agg-s7 (weights 45e20e07782b); the server now serves r16-agg-s11 (weights
  3d676db40390). It plays only with the adapter it was saved with." No tick ran.

## 3. Looked at by eye

Pictures in `/Volumes/Drive/chimpbench/shots/watch-2026-10-19/app-model-drives/` (`cap.mjs` and `save.mjs` beside them
made them; `first-pass/` and `second-pass/` hold the earlier rounds the fixes below came from).

- The top bar (03, 03b): "Who decides · last hour · dry run, no model" over "Model 41% · held 27% · rules 32%", beside
  the clock control, whose second line is the achieved rate. Quiet; the dry warning is in the warning colour.
- The queue (04): the time panel's "Model decides for every adult" block: the hour in exact minutes, adults on the
  model and the young on the rules, the queue and the achieved speed, the fallbacks by reason, the adapter and the
  result name.
- An adult's Mind tab (05): "On the model" with its own hour (a fresh choice 20 min, the gate's hold 36.75 min, the
  rules 2.5 min), then the latest decision with its two calls. An animal under 8 (06): "On the rules · aged 6: animals
  under 8 stay on the rules in this mode", its hour all the rules', the switch shown off and disabled.
- Fixed on the way, from the first rounds: the achieved line was cut ("1.1 min/s · locks…"; now the rate alone, with a
  tooltip); a world in the mode opened playing and at once said "Paused" (it now opens paused); after a reopen the hour
  read "rules 88%" because every act was booked to the rules again (the ledger's owners are now saved with the world, as
  R16 saves its meter); the fallback notice said "not-applied" (now "choice no longer legal"); "Agreement 0%" carried in
  from the world before (the counts now start with a world in the mode, and agreement is not shown there).
- Seen and not fixed (they belong to the model's choices, not to this stage): with the stand-in's arbitrary odds an
  adult male "plays with the young Chombe" while Chombe nurses, and the two bodies are drawn overlapping (03); an adult
  sent to build a nest at 07:13 carries the rules' sentence "dusk is falling (07:06)" (first pass). A trained adapter
  may make such choices more rarely, but the reason sentences are the rules' templates, written for the rules' own
  moments.
- The camera following an animal selected while paused showed only the forest floor in one picture (06): it had not
  reached the animal in the second the script waited. Not a defect of this stage.

## 4. Tests and checks

- `tests/app-model-drives.test.ts`, 12 tests: R16's numbers (switches, kernel-arm settings, age 8, 30 days, 30 s, the
  decode, the refused seeds, the result name) equal R16's own constants; the mode's world equals R16's unit; one hour
  of the app's loop equals `runDay16` (hashes, counts, minutes per animal and in total); membership before every tick,
  nobody under 8 ever asked; lockstep (no tick while an answer is owed, a pass runs or the adapter is not verified, and
  the waiting animals untouched meanwhile); timeouts, refused answers and answers from another adapter counted by
  reason, booked to the rules and shown; the browser kernel's refusals; the readout's shares equal the ledger's and the
  chip's percentages add up to 100; saves (the record round-trips, the arm refusals in words); the default path (no
  record on a default world, the clock's own tick, the roster as before); end to end over HTTP against the real R15
  route and worker with R16's fake scorer (a pass with no model error, the odds equal to the fake's); a reopened world
  with its saved owners books exactly as one that never stopped.
- `scripts/r12-pin.ts check`: "pin equal: sections A, B, C, D reproduce byte for byte" (after the decoder moved).
- The whole suite once (07:16 to 07:22 EDT, four files at a time): 1,644 tests, 1,643 passed, 0 failed, 1 skipped (the
  validation fixture `artifacts/validation/c7a-field1y.json` is not in this worktree, as before). The golden fixture
  (`tests/sim-params.test.ts`) and the field pin (`tests/sim-track-e.test.ts`) are in it, unmoved.
- `pnpm build` passed (07:22 EDT). `tsc` strict by hand on the new tests and scripts.
- One probe server (port 5197, `MGOGO_NO_MODEL=1`, the probe configuration) and one headless browser at a time, each
  stopped by its process id; no model process. One thing to say: in the save check the page first opened the default
  world for a few seconds, and the default app's browser GLiNER (its own in-page model, the app's default provider)
  loaded and answered once for the selected animal before the switch to the mode. Next time open such a page with
  `?provider=server` (absent on a probe server) so nothing loads.

## 5. Not done, and limits

- No model was run: everything above is the fake scorer or a stand-in. Whether a trained adapter keeps the app viable,
  near the rules on nights and mornings, is R16's question (section 0.4).
- The ruled menu (`menuPossible` 1) is not in the mode (section 0.3).
- The hour of the readout is not saved: after a reopen it fills again from empty (the owners of the acts in progress
  are saved). The decoder's notes are not saved (a draw does not read them).
- Only one browser tab may drive the R15 worker at a time: the route has no queue, so a second tab's calls are refused
  ("busy"), counted as model errors in that tab.
- The mode's world is new: an existing default world cannot be switched into it (its parameters are fixed at creation).

## For the integrator

- Branch `app-model-drives` (registration acff0eb, then four commits to 48a7146), from `track-e` at fcc1ae8. Not pushed,
  not merged.
- To see it with no model: `MGOGO_NO_MODEL=1 MGOGO_PROBE_PORT=5197 pnpm exec vite --config
  scripts/vite.fake-r15.config.ts`, then `http://127.0.0.1:5197/?drive=adults&burnin=2`, the model panel (M), Start, Play.
  With a real adapter (after R16): the normal R15 serving (`MGOGO_R15_ENABLED=1 MGOGO_R15_ROOT=… MGOGO_R15_ADAPTER=…`, one
  model process, nothing heavy beside it), then Settings › Who decides › "Model, every adult".
- Decision for the user: whether, once an adapter reads viable in R16, the app should open in this mode by default or
  keep it a choice in Settings (recommended: a choice, with the readout always on screen in it).

Proposed lines (not edited by this stage):

- **HANDOFF.md** §2.0: "App mode 'Model decides for every adult' (19 October, branch `app-model-drives`,
  `docs/staging/app-model-drives.md`): R16's population-test unit in the app, every adult on the trained two-stage path
  through the R15 route, lockstep, the who-decides readout in the top bar and the Mind tab, saves bound to their adapter;
  off by default, built and checked with R16's fake scorer only. It waits for an adapter that passes R16's population
  test."
- **AGENTS.md**, Commands: `MGOGO_NO_MODEL=1 MGOGO_PROBE_PORT=5197 pnpm exec vite --config scripts/vite.fake-r15.config.ts
  # the app's R15 route against R16's fake scorer and a dry adapter in a scratch directory (no model; MGOGO_FAKE_R15_DIR,
  MGOGO_FAKE_R15_ADAPTER); open ?drive=adults&burnin=2`. Gotchas: "The mode 'Model decides for every adult' (`src/drive`,
  `World.modelPolicy.drive`): its clock runs `DriveLoop.tick` (membership from age before every tick, the gate's tap
  around the tick) and waits for each pass (`answerWaiting` and the decoder, now `src/kernel/decoder.ts`); R16's numbers
  are mirrored in `src/drive/world.ts` and held equal by `tests/app-model-drives.test.ts`, so a change to R16's switch set,
  age, burn-in or call limit must change both. The mode serves R15's contract only; a world in it plays only with the
  adapter it is bound to."
- **IMPLEMENTATION_PLAN.md**, after the user's decisions of 19 October: "Built the same day (branch `app-model-drives`):
  the mode, off by default, checked with no model; the trained model becomes the main driver of the app only when an
  adapter passes R16's population test and the user chooses the mode."
