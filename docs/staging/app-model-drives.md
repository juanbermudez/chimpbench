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
