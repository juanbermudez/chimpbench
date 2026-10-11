# Stage R10: the script for a whole population on the real model for a night (pre-registration)

Agent r10-night, branch `r10-night` at `track-e` dea2643. Registered 10 October 2026, 19:40 (EDT), before any code of
this stage. It follows `IMPLEMENTATION_PLAN.md`, "Stage R10: First whole population on the real model", and the user's
answer of 10 October 2026: "yes to all recomendations. Move forward with the implementation".

**This stage builds and proves the script without a model. It does not run the night.** No model process, no
training and no GPU timing happen here. The night itself is registered in §8 and launched later by the integrator.

**Why.** No model has ever driven a whole population in this project. Every loop test so far put five or ten focal
animals on a kernel inside a community that stayed on the rules, and 73% of interrupts come from companions
(review of 10 October, `attack-closed_loop_validity.md`, cross-cutting point 6), so those tests understate what a
model-driven population does. The existing harness cannot run a night: `scripts/r5-pilot.ts` refuses more than 5
days, drives five focal animals, keeps receipts in memory until the arm ends and has no observer, so a crash at hour
9 loses everything (`attack-feasibility_and_sequencing.md`, cross-cutting point 4).

The user's decisions that bind it: "yes just state in training" (the state-only packet); "keep the rules' pick on the
menu for the main comparison … random engine drives animals aged 8 and over; run the gate both on and off"; "Use 0.5
as the declared working base"; "no cloud machine run things locally". Names: results with an adapter taught on the
rules' decisions are called **"rules-taught model on a rules menu"**. "Model-driven" without a qualifier is not used.

Two sizing runs of six simulated hours each (one per map; the rules' top option through the loop for every animal
aged 8 and over) were made before this file was written, to choose file formats. They are not results. Field map:
49 animals, 38 aged 8 and over; a decision context is about 2.3 kB as JSON (about 0.25 kB gzipped); a whole world
is 4.3 MB as JSON and survives the round trip with the same hash; the loop without a model costs a few seconds a
simulated day.

## 1. What is built

1. `scripts/r10-night.ts`, a new script. `scripts/r5-pilot.ts` keeps its registered behaviour and is not edited;
   shared pieces are imported from it (`ARMS`, `armWorld`, `GuardedScorer`) and new shared code lives in
   `scripts/lib/r10-run.ts`, `scripts/lib/r10-read.ts` and `scripts/lib/r10-decode.ts`.
2. `tests/r10-night.test.ts`.
3. Two read-only taps in `src/sim/decide.ts` (`loopTap.point`, `loopTap.gate`), null unless a script sets them, in
   the pattern of `rulesTap` and `kernelTap`. They report why a decision point was raised and what the loop's gate
   decided. Without them a receipt cannot say what opened the ask or which acts the gate held. They read only; with
   the taps unset the code path is today's. No parameter, no switch, nothing in `data/`.

## 2. The run (fixed settings)

- **World.** Field map; base `docs/staging/integrator-kit/params/M6-W50.json` (the declared working base, swallowed
  share 0.5) with `observeV4` 1 and `menuParity` 1 at creation, as in stages R5 and R5-gate. Burn-in: 30 simulated
  days on the rules. Then the arm's two loop switches are set on the world exactly as R5-gate did
  (`scripts/r5-pilot.ts` `armWorld`): `kernelGate` 1 for a gate arm, `kernelNoRulesPick` 0 (the rules' pick stays on
  the menu). So the burned-in world of seed 48 is the pilot's world, and its hash is checked against the pilot's.
- **Who is driven.** After every tick, every living animal aged 8 years or over, in every community, is put on the
  arm's kernel (`controller` 'model', lockstep). Membership is taken again at every tick, so an animal that turns 8
  joins and a dead one leaves. **Animals under 8 stay on the rules, and every output says so** (the registry, each
  day's progress line, each per-animal row, the replay report).
- **The step.** `src/kernel/loop.ts` `answerWaiting`, unchanged: the request, the request validation, the kernel
  (one call at a time), the answer check, the legality re-check, the rules for anything refused. The model kernel is
  `scripts/lib/kernels.ts` `glinerKernel` with the state-only packet (`scripts/lib/packet-state.ts`, version
  `r4-state-1`). A call that passes the time limit (120 s by default) goes to the rules, is counted, and the worker
  is replaced; only one worker process exists at a time.
- **Arms** (the names of `scripts/r5-pilot.ts`): `rules`; `argmax-gate` (the rules' top option through the loop with
  the gate on: the no-model reference of R5-gate); `null-gate`; `trained-gate` (`r4-rules-state`, gate on). Any other
  arm of that table is accepted; a re-draw arm is refused (not needed here).
- **Decode.** `--decode top|draw|held`. The mode is routed through one function (`scripts/lib/r10-decode.ts`
  `decode`). This stage implements `top` only: the first maximum of the model's probabilities, which is what
  `glinerKernel` does today, so `top` changes nothing. `draw` and `held` belong to stage R9 (`r9-draw-hold`); until
  its module is swapped in at the merge the script refuses them by name rather than guess their definition. The
  decode applies to model arms only (the no-model kernels give no probabilities to decode).
- **A day** is 5,760 ticks, from 06:30 to 06:30. Days are numbered from 1 after the burn-in.

## 3. What a run writes

Everything goes under `--out` (default `artifacts/r10/<label>`; `artifacts/` is not in git).

| File | What | When |
| --- | --- | --- |
| `run.json` | the registry: commit, branch, command, seed and its role, map, burn-in, parameter file with its sha256 and values, the loop switches, arm, kernel, adapter, decode mode, packet version, minimum age, who decides under 8, the worker's first line (device, adapter hashes), the runtime variables' values, machine state at the start (load, swap, free disk), every day's summary and hash, the stop check, events, state | rewritten atomically at the start and after every day |
| `ckpt/start.json.gz` | the burned-in world with the arm's switches (day 0) | once; kept |
| `ckpt/dNNN.json.gz` | the world and the meter's state at the end of day N | every day; atomic write (temporary name, fsync, rename); the last two are kept |
| `journal/dNNN.jsonl` | every kernel answer the moment it arrives: the key (time, animal, decision version), the packet hash, the raw answer or the error, the time it took | one line per answer, written and flushed before the next call |
| `receipts/dNNN.jsonl` | the record: one line per decision point of a driven animal (schema below) | appended and flushed after each tick's answers are applied |
| `contexts/dNNN.jsonl.gz` | the decision context of every ask (what the packet is built from), keyed like its receipt | appended as plain lines with the receipts; gzipped at the day's end |
| `rows/dNNN.jsonl` | one row per living animal for the day | at the day's end |

**Why two files for the answers.** The applied option is known only after the step has applied every answer of the
tick (the legality re-check runs then), so a complete receipt cannot be written the instant an answer arrives. The
journal is written at arrival and exists only so that no answer is ever asked twice after a crash; the receipts file
is the record everything else reads.

**The receipt** (schema `r10-receipt-1`; a line of kind `ask` or `held`).

`ask`: one kernel pass, or a decision point the rules settled because no pass was possible.

| Field | Meaning |
| --- | --- |
| `k` | `"ask"` |
| `tick`, `t`, `day` | the world's tick and time (hours, 6 decimals) at the step; the run's day (from 1) |
| `id`, `v` | the animal and the decision version of the request (with `t`, the receipt's key) |
| `phase` | the part of the day in the request (`context.environment.phase`) |
| `n`, `opts`, `fam` | the menu: its length; per option `[action, targetId, variant, aux]`; per option its kind (`scripts/em-sample.ts` `familyOf`). **The stable key of an option is `action:targetId`**, unique within a menu (the simulation's own key: `findCandidate`) |
| `rulesIndex` | the position of the rules' pick on the menu (−1: not on it) |
| `trig` | why the animal was asked: `why` (`interrupt`, `bout-end`: the act's scheduled end, `finished`: the act ended while it ran), `intr` (the interrupt's words, else empty), `gate` (the loop's gate: `no-intent` when no intention was held, else the reason the held intention was opened, in the words of `src/sim/rg.ts` `gate`; empty with the gate off) |
| `index`, `p` | the answer the loop received: the option position (after the decode) and the model's probability per option; `null` when the kernel gave none |
| `dec` | only when the decode adds something to log (stage R9's draw: its mode and its draw) |
| `by`, `refusal`, `detail` | who settled it (`kernel` or `rules`) and, for the rules, why (`fewer-than-two-options`, `invalid-context`, `kernel-error`, `invalid-answer`, `not-applied`) |
| `picked` | the option position applied (−1: the rules decided) |
| `act` | `[action, targetId]` of the act the animal is in after the step, whoever set it |
| `sha`, `ctx`, `tokens`, `ms` | sha256 (16 hex) of the state-only packet and of the context; the estimated input tokens; the kernel's time for this pass |
| `re` | 1 when the answer was taken from the journal of an interrupted segment instead of a new call |

`held`: an act the loop's gate kept, or the feeding it began at the end of a trip, without asking the kernel.

| Field | Meaning |
| --- | --- |
| `k` | `"held"` |
| `tick`, `t`, `day`, `id`, `v` | as above; `v` is the decision version after the act was set |
| `how` | `kept` (the same act goes on) or `arrived` (the trip reached its tree and feeding there began) |
| `act`, `fam` | the act set and its kind |

Together the two kinds list every new act of a driven animal and who set it: a fresh choice of the kernel (`ask`,
`by` kernel), an intention held by the gate (`held`), or the rules (`ask`, `by` rules). The context of an ask is in
the contexts file under the same key, and the replay rebuilds it and checks its hash, so a receipt can be relabelled
or re-rendered in another packet later.

**A row per animal and day** (every living animal; `driven` false means under 8 and on the rules): energy eaten
(the field's intake measure) and usable energy in, energy spent, the change of reserves in kcal and in % of the usual
store, distance (path and 5-minute fixes), trips to food begun and completed, drinks, **act changes** (changes of the
kind of act between consecutive ticks over the 24 hours), daylight minutes by field category, the share of the dark
hours in a nest, and for driven animals how often the kernel was asked, how many asks its choice settled, how many
acts the gate held, how many the rules settled, and the minutes under each. The definitions are those of
`scripts/r5-pilot.ts` `runArm`; act changes is new.

## 4. Surviving a night

- **Resume.** `run --resume <out>` continues from the newest checkpoint that reads back with the hash its header
  states (if the newest is damaged, the one before it: that is why two are kept). Files of the day that was in
  progress are moved aside into `orphans/`, never deleted; the answers already in that day's journal are reused
  (matched by time, animal, decision version and packet hash), so the kernel is asked only for what is missing. A
  resumed run must end on the same world hash as an uninterrupted one; the tests prove it with deterministic kernels.
  A resume is refused when the checkout is not at the registry's commit or is dirty.
- **Refusals at the start** (as `scripts/e-run.ts`): a dirty tree (`--allow-dirty` exists for smoke checks of a
  script under edit and is written into the registry); a reserved or retired seed (`RESERVED_SEEDS`); less than 5 GB
  free on the run's volume or on the system volume; an `--out` that already holds a run (unless `--resume`).
  **A model arm also refuses to start while another model process is running** (any process of the Decide Python
  environment, the Decide worker, the batching server or a training script), names what it found, and waits while
  swap in use is above 6 GB for up to 30 minutes (as `scripts/r5-chain.sh`), writing what it saw.
- **During the run.** Free disk is checked at every day's end (below 5 GB: a clean stop). Three worker restarts within
  one simulated day, or 50 kernel errors in a row, end the run cleanly at once (the last checkpoint stands). SIGINT
  and SIGTERM stop the worker, mark the registry `interrupted` and exit; nothing else is left running.
- **Awake.** The run is launched under `caffeinate -i`; a model arm also holds its own `caffeinate -i -w <its pid>`,
  which ends with the run.
- **Progress.** One line per simulated day: asks, seconds per ask (mean, median, 95th percentile), fallbacks to the
  rules by reason, acts the gate held, deaths, memory, the day's wall time, and the projected finish.
- **Budget.** `--hours H` ends the run cleanly at the first day's end after which another day would not fit (the mean
  of the last three days' wall time, plus 10%); `--days N` is the cap.

## 5. The stop check after five simulated days (fixed now)

Read once, at the end of day 5, from the rows and the day summaries of days 1 to 5. The run ends cleanly (state
`stopped`, the checkpoint of day 5 kept, exit code 3) if **any** of these holds. With `--no-stop-check` the verdict is
still computed and written, and the run goes on.

| # | Condition | Threshold | Where the threshold comes from (all four are harness thresholds: design assumptions, not behavioural constants) |
| --- | --- | --- | --- |
| S1 | deaths by starvation since the burn-in, any age | 2 or more | none in five days in any arm of R5 or R5-gate; none in 90 days under random choice with the gate off (R1b) |
| S2 | mean over driven animals of the daily change of reserves | below −1.0% of the usual store a day | pilot (ten animals, five days): the rules +0.01, `r4-rules-state` −0.10 and −0.05 with the gate on, random choice −0.35, untuned −1.61 |
| S3 | nights in a nest: driven animal-nights with at least 0.9 of the dark hours in a nest | below 0.80 of them | pilot: the rules and `r4-rules-state` 1.00, untuned 0.78, random choice 0.48 |
| S4 | the kernel is not the one deciding | fallbacks to the rules above 10% of asks, or timeouts above 2% of asks | R5-gate: under 1% and 7 in 10,082 |

The check exists to end a night that can no longer answer its question (a population collapsing faster than the
untuned model's focal animals did, or a kernel that is mostly not answering). It is not a test the arm passes: a run
that goes on after it is not thereby "viable".

## 6. Afterwards, with no model: the replay

`r10-night.ts replay <out>` starts from `ckpt/start.json.gz`, answers every ask from the receipts and steps the same
loop. It must reproduce every day's world hash and the end hash, with no receipt missing and no menu that differs;
it rebuilds each context and checks its hash against the receipt. Alongside it reads the run through the instruments
the project already has, composed as `scripts/lib/bench-run.ts` composes them (the three observer team sets of
`src/field`, the energy, rhythm and truth-row readouts), with answers applied before the observers step, as
`scripts/ft-field.ts` does. No field experiment is run. It writes:

- the 15 daily rows of the short scorecard **by value** with their sample size and parts, in two groups (held-out
  rows; rows fitted to the rules or tuned), never as pass counts or sums: T-ACT-1, T-ACT-4, T-ACT-2, T-ACT-3,
  T-RNG-4, T-FOOD-2, T-ENE-3, T-RHY-1, T-RHY-4, T-RHY-5, T-RHY-6, T-COM-1, T-SOC-14, T-SOC-10, T-SOC-6;
- beside them party size (T-PTY-1), grooming share (T-ACT-3) and greeting direction (T-SOC-6: the share of
  pant-grunts received by the top three males), by value;
- the per-animal-day rows again (they must equal the run's), the ask rate per animal-day, deaths by cause;
- `replay.json` and `replay.md`.

**The hook for the timing card (stage R7, branch `r7-card`).** The replay steps a list of taps
(`scripts/lib/r10-run.ts` `Tap`: `start(world)`, `tick(world, i, lines)` after each tick's answers with that tick's
receipt lines, `end(world)` whose return value is written into `replay.json` under the tap's name).
`--taps a.ts,b.ts` loads modules whose default export makes a tap. The card plugs in there without editing this
script. A tap reads only: the replay's hashes would show a write.

## 7. Proof without a model (run in this stage)

Tests (`tests/r10-night.test.ts`, compressed map with the working base, seed 48):

1. **Rules equivalence.** A rules arm run through the script's engine with a checkpoint written and read back every
   day ends on the hash of a plain rules run of the same world and days (plain `tickWorld` calls), every day's hash
   equal.
2. **Resume.** With `argmax-gate` and with `null-gate`: a run stopped after day 1 and resumed from its checkpoint
   ends on the hash of the uninterrupted run, with the same receipts (but for the time taken) and the same rows. A
   run that dies inside day 2 (the kernel throws a fatal error after some answers) and is resumed ends on the same
   hash, and the kernel is asked only for the answers the journal does not hold.
3. **Receipts.** Every line has the fields of §3 with the right types; only animals aged 8 and over are asked; the
   held lines equal the count of acts the gate set inside the tick; the replay from the receipts reproduces every
   day's hash and every context hash; one changed answer gives another world.
4. The decode (`top` is the first maximum; other modes refuse), the stop check's four conditions, the refusals
   (reserved seed, low disk, another model process found in a process list).

Field smoke (seed 48, the working base, 30 days of burn-in; no model; one process at a time):

5. `rules` for 2 days through the script against plain `tickWorld` calls on the same burned-in world: equal hashes.
6. `argmax-gate` for 2 days: per day the asks, held acts, wall time, memory and bytes written; **the projection of
   the real night** from the asks per day at 0.44 to 0.6 s an ask (review of 10 October: 0.44 s offline at 467
   tokens; 0.46 to 0.62 s median in the loop).
7. The same run killed with SIGKILL inside day 2 and resumed: the same end hash.
8. The replay of 6 through the observer: every day's hash equal. Its behaviour values are a check that the readouts
   run; they are from a no-model kernel on two days and are **not a result**.

**Written before the runs** (to be checked, not to be met): the burned-in world of seed 48 hashes to the pilot's
4b5cc61f8ad797e0 if nothing in the simulation has moved since 7 October (if it differs, the report says so and why);
`argmax-gate` is asked about 55 to 60 times per driven animal and day (R5-gate measured 57 on ten focal animals),
so about 2,100 to 2,400 asks a day for 38 animals, and a night of 10 hours covers about 25 simulated days.

At most 3 iterations per problem.

## 8. The night (registered here, **not run in this stage**)

- **Arm.** `trained-gate`: the existing adapter `r4-rules-state` (sha256 e09fd6f4…1932, taught on the rules'
  decisions of seeds 48 and 7), the gate on, the rules' pick on the menu, the state-only packet, decode `top` unless
  stage R9 has registered another before the launch (then that mode, named in the registry). Animals under 8 on the
  rules.
- **Seed 48**, a training seed of the adapter, chosen on purpose: the states the population reaches may become
  training data, and no unseen seed is spent. 30 days of burn-in, then as many days as fit 10 hours (`--hours 10
  --days 40`).
- **What it is.** A **level measurement** under the name **"rules-taught model on a rules menu"**: is such a
  population viable (deaths by cause, the reserves trend, nights in a nest), how often is it asked per animal and day,
  and party size, grooming share and greeting direction by value, with the 15 rows beside them. **No comparison is
  counted as a result until a fresh unseen seed has been run.** Seeds 21 and 5 have been read in three rounds and are
  not fresh.
- **The second product.** The receipts and contexts: the first large set of states a model-driven population itself
  reaches, with the model's probabilities, kept so they can be relabelled.
- **The command** (from a clean checkout of the merged commit; the adapter folder is the one R5-gate used):

  ```sh
  cd /Volumes/Drive/chimpbench/MGOGO
  export MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN
  export MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python
  export HF_HOME=/Volumes/Drive/chimpbench/hf-cache HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub
  export MGOGO_FT_ROOT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r4b-retrain/artifacts/decide-ft/r4c
  export MGOGO_FT_ADAPTERS=r4-rules-state
  mkdir -p artifacts/r10
  caffeinate -i fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r10-night.ts run --seed 48 --arm trained-gate \
    --decode top --days 40 --hours 10 --out artifacts/r10/night-s48 > artifacts/r10/night-s48.log 2>&1
  ```

  The first four variables are those of `HANDOFF.md` §3 item 3 (`UV_CACHE_DIR` is for uv only and is not needed); the
  last two name the adapter. Restart the Mac first if swap in use is above 6 GB.
- **If it stops:** `… scripts/r10-night.ts run --resume artifacts/r10/night-s48 --hours <what is left>`.
- **The next morning:** (1) `… scripts/r10-night.ts status artifacts/r10/night-s48`: the state (`done`, `stopped`,
  `interrupted`), the days done, the stop check's four numbers; (2) the last lines of the log; (3) in `run.json`:
  timeouts, worker restarts, fallbacks by reason, seconds per ask; (4) no model process left (`ps`), swap; (5) `…
  scripts/r10-night.ts replay artifacts/r10/night-s48` (no model, a few minutes): every day's hash equal, nothing
  missing, then `replay.md`.

## 9. Machine rules and order

One simulation at a time, one process, no worker pool. `uptime` before anything heavy; wait if the load is above 12.
Runs only from a committed head with a clean tree. No model process in this stage.

1. This file, committed. 2. The taps, the libraries, the script, the test. 3. The tests, `tsc`, the test files that
cover `src/sim/decide.ts`. 4. The field smoke (§7, 5 to 8). 5. Results in §10; "For the integrator".

## 10. Iteration log and results

### 10.1 Amendments (written 10 October 2026, 20:05, after the code and its unit tests, before the field smoke)

- **A1. One rule of §4 is withdrawn before it was ever used:** "three worker restarts within one simulated day end the
  run". A busy spell of a few minutes would end a night that could have gone on, and a stop cannot give those hours
  back. Timeouts are counted per day, each costs at most the time limit, and they are part of S4 at day 5. The other
  rule stands: 50 kernel errors in a row end the run at once (a worker that has died answers nothing, and a night of
  rules fallbacks is not a model night).
- **A2. One more file per day:** `summary/dNNN.json`, the day's summary, written before the checkpoint, so that a
  resume rebuilds the registry's list of days from files and not from a registry that may be one day behind.
- **A3. The journal is reused for answers only.** A journalled error (a timeout, a dead worker) is asked again on a
  resume. The journal also receives the reused answers again, so a second crash in the same day loses nothing.
- **A4. Two commands beside the registered three:** `plain` (createWorld and tickWorld only: the hashes a rules arm
  must end each day on, for proof 5) and the switch `--crash-at-tick N` (the process kills itself with SIGKILL after
  N ticks: the crash of proof 7).
- **A5. The replay has no error limit** (it must run to the end and report missing receipts, not stop on them).
- **A6 (20:22, after two timed field runs, before the runs reported in §10.3). When the files are forced to the
  disk.** §3 said the journal is "written and flushed before the next call" and the receipts "appended and flushed
  after each tick". As first built, every answer and every tick ended with an fsync. Measured on the project's volume
  (`/Volumes/Drive`, shared with the other agents): about 8 ms per fsync at load 7 (65 s of waiting a simulated day)
  and about 115 ms at load 10 (about 270 s a day, a quarter as much again as the model's own time). So: every line is
  still handed to the operating system at once with a write call (nothing is held in the process, and a process that
  dies or is killed loses nothing: proof 7), and the journal, receipts and contexts are fsynced when two seconds have
  passed since the last time and when the day closes. A power cut or a kernel panic can therefore lose at most the
  answers of the last two seconds, which a resume asks again. Each day's line prints the fsync calls and their
  seconds. One more step after the third timed run (load 10 to 13: a round of three fsyncs took 0.7 s): the wait
  grows to twenty times what the last fsync took, so forcing files to disk stays under about 5% of a run's time
  whatever else is writing to the volume; the window at risk grows with it.
- **A7 (20:26, before the runs reported in §10.3). A worker that dies is replaced.** The worker of the decide-ft
  harnesses (`scripts/ft-society.ts` `Worker`) is replaced by the guard only after a timeout. If its process dies, every
  later call fails at once and the broken pipe is an uncaught error that would end the run. Now: after five kernel
  errors in a row that are neither timeouts nor packets over the token budget the worker is stopped, so the guard
  starts a new one for the next call (still one worker process at a time); a broken pipe is logged and survived; any
  other uncaught error ends the run with the registry saying so. The limit of 50 errors in a row still ends the run.
  A resume that finds the checkpoint of day 5 but no stop check (the run died between the two) reads the check then.
- **A8 (20:34, before the runs reported in §10.3). The model's start.** Reading `training/decide_ft/worker.py` and
  `adapters.py` showed two things the night would have tripped on. (1) The worker says "ready" at once and loads the
  model on its first batch (55 to 145 s measured on this machine), so the first ask after every start, and after every
  replacement during the night, would race the 120 s limit and fall to the rules, again and again on a busy machine.
  Now every worker answers one real packet, outside any time limit, before it serves; the answer is thrown away (it
  comes from a request no one applies). A worker that cannot answer it stops the start. (2) The worker loads only the
  adapters named in `MGOGO_FT_ADAPTERS`, and without it three older ones. Now a model arm refuses to start unless the
  adapter's weights file exists under `MGOGO_FT_ROOT`, `MGOGO_FT_ADAPTERS` names it, and the run is launched from the
  repo root; the file's sha256 goes into the registry and must be the one the worker reports. Also: another model
  process is recognised by the program a process runs (a Python that is the Decide environment's or runs a Decide
  script), not by a name anywhere in a command line, because the shell that launches the night carries the
  interpreter's path in its own command line; a model day prints a line every simulated hour once two minutes have
  passed, so a day of 15 to 25 minutes is not silent.
- **A9 (20:44, commit 8276757, after the runs of §10.3; the field runs were repeated after it and landed on the same hashes).** The
  file that keeps the burned-in world between runs was named by parameter file, map, seed and days only, so a world
  burned in by older code could have been picked up by a later commit. Its name now carries the commit and the
  parameters' hash, and a run from a tree that is not clean keeps none. The warm-up packet of A8 is built on a copy of
  the world (building it leaves the world's hash unchanged, checked on the start world of seed 48: all 38 animals on
  the kernel have a real choice there, the first with 6 options).
- **A10 (21:16, commit e7c746f; written by the second agent that reviewed the stage, §10.6). Which processes count as
  a model process.** §4 registered "any process of the Decide Python environment". As built, a process was recognised
  by the path of the program it runs, and on this Mac that path never names the environment: `decide-env/bin/python`
  is a link to a Homebrew framework build, which starts again as `…/Python.framework/…/MacOS/Python`. With
  `MGOGO_DECIDE_PYTHON` set as in §8, a process of the environment was seen only if its script had one of six names.
  Now the path a Python was started as is read from its environment (`ps -E`: the launcher leaves it in
  `__PYVENV_LAUNCHER__`) and counts like the program's. Shown on the real process list with a stand-in that loads
  nothing: not seen by the first rule, seen by the new one, and the script refuses and names it. The process list is
  read with a 256 MB buffer (past the default of 1 MB the call fails, and a failed call was read as "nothing is
  running"; the list was 0.2 MB, and 0.6 MB with the environments, during the review), and a list that cannot be read
  refuses the start.
- **A11 (same commit). Signals.** §4 says SIGINT and SIGTERM mark the registry `interrupted`. As built that held only
  while a call was waiting on a worker: a kernel that answers at once (the rules arm, `argmax-gate`, `null-gate`) never
  lets the event loop turn, so the signal was never seen and the registry stayed at `running` (shown on the small map).
  The day now gives the loop one turn per tick before it reads the stop request (108 ms for the 5,760 turns of a day,
  measured). What holds now, measured with real signals on the small map: a signal sent to the script's own process
  ends the run cleanly (exit code 130, `interrupted`, "the checkpoint of day 2 stands"). A signal sent to the whole
  launch (Ctrl-C in its terminal, a kill of the launching command) also reaches the `tsx` launcher, which kills its
  child with SIGKILL when the child has not acknowledged a relayed signal within 30 ms; the script's close-down (files
  forced to disk) takes longer than that, so such a stop can end as a kill. Nothing is lost: the registry stays at
  `running` and `--resume` continues (SIGTERM and SIGINT to the whole launch: both runs resumed onto the uninterrupted
  run's hash). A hang-up (the terminal or session that launched the run goes away) kills it in the same way, and
  `nohup` does not prevent it: Node restores the default handling of a signal its parent had set to "ignore".
- **A12 (same commit). The warm-up has a time limit.** A8 put the warm-up answer "outside any time limit", so a worker
  that hangs while it loads held the run for ever with no line in the log, and a replacement in the night has no one
  watching it. Now a worker that has not answered its warm-up packet in ten minutes (a design assumption: about four
  times the slowest load measured on this machine, 145 s) is stopped, the failure is written to the log, and the start
  fails as for any other warm-up failure: at the first start the run is refused; in the night that ask goes to the
  rules and the next ask starts another worker. The limit of 50 errors in a row still ends such a run; if every start
  hangs that is about eight hours later (50 starts of ten minutes), which the review left as it is.
- **A13 (21:22, commit ebf3c86).** A resume checks `--days` and `--hours` as the first start does (a mistyped `--days`
  closed the run as `done` without a tick). While the registry says `running`, `status` prints the pid of the script's
  own process and that `kill -TERM` to it is the clean stop.

### 10.2 Iterations (10 October 2026; no model process at any point)

Three iterations on one problem, how often to force the files to disk, each a two-day field run of `argmax-gate`
on seed 48 (every run landed on the same two day hashes):

| Iteration | Head | When | What forced the files to disk | Wall per simulated day, s (day 1, day 2) | Load |
| --- | --- | --- | --- | --- | --- |
| 1 | 554d3e7 | 20:06 to 20:09 | an fsync after every answer and every tick | 69.6, 81.1 | about 7 |
| 2 | 4cf490e | 20:11 to 20:20 | an fsync after every answer; receipts on a two-second timer | 290.6, 254.9 | about 10 |
| 3 | e84915e | 20:22 to 20:23 | everything on a two-second timer (amendment A6) | 13.5, 13.6 (6 and 5 fsync rounds: 4.0 and 4.2 s) | 10 to 13 |
| final | a886f30 | 20:34 to 20:36 | the same, with the wait growing on a slow disk | 4.2, 3.6 (2 fsync rounds a day: 0.9 and 1.0 s) | about 8 |

The same simulated day cost 4 s to 290 s of wall time depending only on fsync and on what else was writing to the
volume. Iteration 2 was slower than iteration 1 with fewer fsync calls: the volume was busier.

### 10.3 Results of the proofs (§7), at head a886f30 unless said

(Proofs 5, 6 and 8 were run once more at the stage's last code commit, 8276757, after amendment A9: the same day
hashes, 2,060 and 2,069 asks, and a replay that regenerates all 6,423 lines.)

**Tests.** `tests/r10-night.test.ts`: 12 tests, 12 pass (compressed map, the working base, seed 48). With the
eleven test files that cover what the stage touches or imports (`kernel`, `sim-params` with the goldens,
`sim-track-e` with the field pin, `sim-rg`, `decision`, `sim-model`, `simulation`, `persist-envelope`, `r5-pilot`,
`r4b`, `r2-packet`): 131 tests, 131 pass at head 2e8c26b. `tsc --noEmit` clean; `gen-params --check` clean (1,046
entries); the script and its test type-check under the project's strict settings (the two errors that command
prints are in `scripts/lib/prescriptions.ts`, which this stage does not touch).

| # | Proof | Result |
| --- | --- | --- |
| 1 | Rules equivalence (test) | A rules arm through the engine, checkpointed and read back after each of two whole days, ends each day on the hash of plain `tickWorld` calls |
| 2 | Resume (tests) | `argmax-gate` stopped after day 1 and resumed from its checkpoint: the uninterrupted run's hash, receipts and rows. A run that dies with answers journalled but their receipts unwritten, resumed: the same hash, every journalled answer reused, the kernel asked only for the rest. The null kernel cut after day 1 or day 2 of three: the same hashes and receipts |
| 3 | Receipts (tests) | Every `ask` and `held` line has the registered fields; only animals aged 8 and over are asked; the journal holds every answer under its receipt's key; answered from the receipts the engine lands on the same world, and one changed answer gives another; the replay of a run folder reproduces the day and catches a damaged receipt file |
| 4 | Decode, stop check, refusals (tests) | `top` is the first maximum and changes no answer; `draw` and `held` refuse by name; each of the four stop conditions alone ends a run and a rules-like run goes on; reserved seeds, low disk and another model process are refused |
| 5 | Field: rules arm against the plain world | **Equal.** `plain`: after 30 days 4b5cc61f8ad797e0, then c0c0192822501ddf and 1aa2a8d748255642. The rules arm through the script: the same three (heads 554d3e7 and a886f30) |
| 6 | Field: `argmax-gate`, 2 days | Day hashes 95bfc1fd4e6ddfda and 07ec9b9f26b64f60. Per day: **2,060 and 2,069 asks** (54.3 per animal on the kernel and day), the kernel's choice settled 2,013 and 2,041, the rules 47 and 28 (every one `not-applied`), **1,145 and 1,149 acts held by the gate** (30.2 per animal and day), no death, no timeout. No-model wall time 4.2 and 3.6 s a day; the whole process 12.3 s; largest memory 410 MB |
| 7 | Field: killed and resumed | The run killed with SIGKILL after 8,000 ticks (inside day 2; exit code 137) and resumed: 3 files of the day set aside, **1,408 journalled answers reused**, end hash **07ec9b9f26b64f60**, the uninterrupted run's |
| 8 | Field: replay through the observer | The receipts reproduce the run: 2 of 2 day hashes equal, 0 asks without a receipt, 0 menus differ, 0 of 6,423 receipt lines differ when regenerated (each with its context's hash), 0 row files differ; 13 s with the observer and the truth readouts (394 MB at its largest, measured on the same replay at head 9530214). The resumed run replays the same way. 13 of the 15 rows had a value after two days (no contest and no detected conflict fell in the window for T-SOC-14 and T-SOC-10) |

**What a day of a whole population writes** (proof 6, bytes per simulated day): receipts 1.21 MB; journal 0.24 MB;
contexts 6.2 MB as written, 0.68 MB once gzipped at the day's end; rows 27 kB; summary under 1 kB; a checkpoint
0.9 MB (three are on disk: the start and the last two). About 2.2 MB a day kept, so 30 days are under 70 MB.

**What opened the asks** (proof 6, the 4,129 asks of the two days; the receipts' `trig`): an interrupt 1,628, the
act's scheduled end 1,530, an act that finished 971. The gate's own word: `interrupt` 1,599, `need-bucket` 940,
`ended` 661, `max-age` 414, `light` 259, `period` 157, `no-intent` 75, `patrol` 21, `hunt` 3. Of the 2,294 held acts
1,827 were the same act kept and 467 the feeding begun at the end of a trip.

**The projection of the real night** (printed by `status` from proof 6: this run's asks per day at a model's seconds
per ask, plus this run's own seconds per day):

| Seconds per ask | Where the figure is from | Minutes per simulated day | Simulated days in 10 hours |
| --- | --- | --- | --- |
| 0.44 | offline, one packet per pass at 467 tokens (review of 10 October) | 15.2 | 39 |
| 0.5 | | 17.3 | 34 |
| 0.6 | the loop's medians were 0.46 to 0.62 (R5-gate) | 20.7 | 28 |
| 0.76 | the slowest mean per call of R5-gate's windows (1,377 calls in 1,050 s, two timeouts in it) | 26.2 | 22 |

So **a 10-hour night covers about 22 to 39 simulated days**, 28 to 34 at the speeds seen most often. Three things can
move it and are not in the table: a model population is asked at its own rate, not the reference kernel's (on ten
focal animals R5-gate measured 54 asks per animal and day for `r4-rules-state` against 57 for this reference); the
first start loads the model once (55 to 145 s measured on this machine); and forcing the files to disk takes at most
about 5% (amendment A6). `--days 40` is therefore above anything a night can reach, and `--hours 10` is what ends it.

**Written before the runs, checked.** The burned-in world of seed 48 is the pilot's (4b5cc61f8ad797e0): yes.
"Asked about 55 to 60 times per driven animal and day": 54.3, just under. "About 2,100 to 2,400 asks a day": 2,060
and 2,069, just under. "A night of 10 hours covers about 25 simulated days": 22 to 39 by the table.

**Shown from the command line** (each exits with code 2 and writes no file): a reserved seed (5303); an `--out` that
holds a run; a tree with one untracked file; `--decode draw`; a model arm without its variables; a model arm whose
adapter folder is missing, and one whose adapter is not named in `MGOGO_FT_ADAPTERS`; a re-draw arm and an unknown
arm; and **another model process running**, shown with a stand-in (a Python process with `decide_provider` in its
arguments that loads nothing, started and killed by its own pid): the script named that pid and refused, and did not
mistake the launching shell, whose command line held the interpreter's path, for one. `--caffeinate` on a no-model
run: the holder `caffeinate -i -w <pid>` was alive during the run and gone after it.

**The stop check, end to end** (compressed map, six days asked, a check of the harness and not a result): random
choice (`null-gate`) was stopped after day 5 with exit code 3, "S3: 86 of 190 driven animal-nights in a nest (0.45,
below 0.80)", reserves −0.488% a day; a `--resume` then went on past it and said so. `argmax-gate` read 190 of 190
nights, reserves −0.181% a day, the rules settling 2.23% of asks, and went on. A budget of `--hours 0.004` ended a run
cleanly after 2 days.

### 10.4 What is not done, and limits

- **The night was not run, and no model process was started in this stage.** So nothing on the model's path has run
  for real: the worker's start, the warm-up answer, the adapter hash check, the decode on real probabilities, a
  timeout and a replacement of a real worker, the hold while swap is above 6 GB (swap in use was about 6.9 GB during
  this stage, so the launch will hold unless the Mac is restarted first). These paths are covered by tests with
  stand-in scorers only.
- `draw` and `held` are not implemented here (stage R9 owns them).
- The timing card's hook was exercised with a counting tap, not with the card (stage R7 has not delivered it yet).
- The stop check's thresholds come from ten focal animals; they have never been read on a model-driven population.
- After a power cut, up to the last two seconds of answers (more on a slow disk) are asked again; after a crash or a
  kill, none.
- A replay reproduces a run only at code whose simulation is the run's (it checks hashes and says so when it is
  not). The contexts are kept on disk for that reason: they need no replay.
- Animals under 8 are on the rules. `activityFirst` 2 (a second request per decision) is refused.
- The full `pnpm test` and `pnpm build` were not run (left to the integrator at the merge, by the brief).

### 10.5 Machine at the end

No process of this stage is running; no model process was started. The worktree is clean at the stage's last
commit. Outputs of the smoke are under `artifacts/r10/smoke/` in the worktree (not in git).

### 10.6 Review by a second agent (10 October 2026, 20:48 to 21:30; no model process at any point)

Another agent read the whole diff and tried to break the stage, then repaired what it confirmed (amendments A10 to
A13; commits e7c746f, ebf3c86, 0d2ec45). Everything below was run by that agent: the field checks at the builder's
head 9d3508f and again at the review's last code commit 0d2ec45, the rest at the commit named. Outputs are under
`artifacts/r10/review/` in the worktree (not in git).

| Check | Result |
| --- | --- |
| `tests/r10-night.test.ts` | 12 of 12 at 9d3508f; 13 of 13 at 0d2ec45 (one test added, assertions added to two) |
| Goldens, field pin, kernel, persistence (`tests/sim-params`, `sim-track-e`, `kernel`, `persist-envelope`) | 11, 2, 15 and 14 pass at 9d3508f; the review changed nothing under `src/` |
| `tsc --noEmit`; `gen-params --check`; the script and its test under the strict settings | clean; clean (1,046 entries); only the two errors of `scripts/lib/prescriptions.ts` |
| Field, seed 48: the plain rules world | 4b5cc61f8ad797e0 after the burn-in, then c0c0192822501ddf and 1aa2a8d748255642 |
| Field: the rules arm through the script | the same three hashes |
| Field: `argmax-gate`, 2 days | 2,060 and 2,069 asks; 1,145 and 1,149 acts held; the rules settled 47 and 28; day hashes 95bfc1fd4e6ddfda and 07ec9b9f26b64f60 |
| Field: killed with SIGKILL after 8,000 ticks, resumed | exit code 137; 1,408 journalled answers reused; end hash 07ec9b9f26b64f60 |
| Field: replay through the observer | 2 of 2 day hashes equal, 0 of 6,423 lines differ, 0 row files differ; the resumed run replays the same way |
| §10.3's counts of what opened the asks, the bytes per day, the projection | recounted from the review's own receipts and registry: equal (at 0.6 s an ask the projection reads 28 or 29 days, depending on the run's own seconds per day) |

**The script's own resume wiring** was exercised from the command line on the small map at 9d3508f (seven days of
`argmax-gate` after one day of burn-in; the uninterrupted run ends on 62a787fab86a357b): killed inside day 1; killed
twice inside day 2 and once inside day 6; the newest checkpoint cut short after the run (the one before it is taken
and day 7 is redone from its journal with no new call). Each ended on the uninterrupted run's hash, and each replay
regenerated all 28,910 receipt lines. Random choice was stopped after day 5 by S3 (76 of 190 nights in a nest) with
exit code 3, and a resume went on past it and said so; a budget of 0.004 hours ended a run after one day. At e7c746f
the refusals of §10.3 were repeated from the command line (each exit code 2, nothing written), real signals and
hang-ups were sent (A11), and a counting tap was loaded with `--taps`. One of these paths is now a test (killed inside
day 2 and resumed, against an uninterrupted run made in the test).

**Found and repaired:** the model-process check that did not see the Decide environment's own interpreter (A10);
signals that were never seen in the arms without a model (A11); a warm-up with no time limit (A12); a resume that
took any `--days` (A13).

**Found and left as they are** (none changes a result; each matters for the launch):

- A stop sent to the whole launch, or a hang-up, can end the run as a kill (A11). The run is then continued with
  `--resume` and loses nothing but the hours until someone notices. The night should be launched from a terminal
  window that stays open or inside a detached `screen` session (tried on the small map: the run outlived the shell
  that launched it), not from a session that will end, and stopped with `kill -TERM` to the script's own pid.
- Nothing stops two processes from resuming the same folder at once. A model arm is protected by the model-process
  check once the first has started its worker; an arm without a model is not.
- A worker that fails its warm-up again and again is retried until 50 asks in a row have failed (A12).
- A row keeps a rounded `-0` in memory that is `0` once written (`waterDefMl`); the replay compares rows as written.
- The builder's amendment A6 (files forced to disk on a timer, not after every answer) stands: a kill or a crash
  loses nothing (re-measured: 1,408 of 1,408 answers reused), a power cut can lose the last seconds of answers.

**Still not exercised by anyone:** everything with a real worker (§10.4, first item). The first minutes of the night
are where a surprise would show.

### 10.7 Changes at the merge (11 October 2026; the integrator, branch `integrate-t1`; no model process)

The stage was merged with stages R7, R8 and R9 and wired to them. What this document registered is unchanged except
where said here.

- **Decode (amends §2 and the item "The decode" below).** `scripts/lib/r10-decode.ts` no longer decodes. The night's
  decode is stage R9's step of the loop (`src/kernel/decode.ts` through `scripts/lib/decoder.ts`): `--decode top`,
  `draw` or `held`, with `--decode-salt N` (0 for top, 1 otherwise) and `--hold act|block|whole`. The engine passes the
  decoder's step to `answerWaiting`, writes the record it returns on the receipt as `dec` (mode, salt, hold, epoch, why
  it opened, the option applied last, the kernel's pick, the position applied, the draw or the noise: the fields R9's
  arms log), saves the decoder's notes in every day's checkpoint and hands them back on a resume; the replay makes a
  new decoder from the registry's setting (`decodeSpec`). A model arm always has the step (top unless another is named);
  a no-model kernel arm has it only when `--decode` is given (the plumbing check). The registered night command
  (`--decode top`) applies the same options as before and now logs the record. `held` is refused together with the
  kinds-first menu (`activityFirst`), where R9's review found a held draw does not hold: by the script before anything
  is written, and by the engine.
- **Receipts are `r10-receipt-2` (amends §3).** An ask's `index` is the kernel's own pick and `picked` the option
  applied (they differ under `draw` and `held`); `dec` is R9's record. A held line's `v` is the decision version the
  gate ran at, the convention of an ask's `v`, not the version after the act was set (the finding of R7's review). Each
  death in a day's summary carries its time `t`. No night had been run on `r10-receipt-1`; a replay refuses a run folder
  of another schema and names the commit to replay it from.
- **For `r7-ledger`.** `scripts/lib/who-decided.ts` `nightReceipts` and `nightInfo` read a run folder's lines;
  `pnpm exec tsx scripts/r7-ledger.ts night <out>` prints the lines and writes `<out>/ledger.json`.
- **For `r7-card`.** The replay reads the timing card through the tap hook by default
  (`scripts/lib/r10-card-tap.ts`; `--no-card` leaves it out); `replay.md` has a section for it and `replay.json` holds
  the card under `taps.card`.
- **Tests.** `tests/r10-wiring.test.ts` (a short no-model night on the small map: the three modes, each replayed; stop
  and resume with and without the decoder's notes; the refusals; the ledger against the run's own tally; the card
  through the hook; the script from the command line); `tests/r10-night.test.ts` updated for the setting.
- **Run again on the merged tree, field map, seed 48, no model.** The burned-in world is the pilot's
  (4b5cc61f8ad797e0); `argmax-gate` for 2 days: 2,060 and 2,069 asks, day hashes 95bfc1fd4e6ddfda and 07ec9b9f26b64f60,
  as in §10.3; its replay regenerates all 6,423 lines and reads the card and the observer. `null-gate --decode held`
  for 1 day replays exactly (3,304 lines).

### 10.8 The first run on the real model (the integrator, 11 October 2026, 11:27 to 14:13 EDT; frozen checkout `bench-t1` at a11c45c)

The registered night (§8), started as a first segment of three hours while the processor was free: arm
`trained-gate` (`r4-rules-state`), decode `top` (stage R9 named no other, `docs/staging/r9-prereg.md` §10.6), seed 48,
the gate on. Tables: `docs/staging/r10-night-s48-replay.md` (the script's own replay report),
`docs/staging/r10-rules-s48-replay.md` (a rules arm of the same nine days through the same script, run afterwards for
reading) and `docs/staging/r10-night-s48-paired.md` (the 38 animals on the kernel beside the same animals on the
rules; `docs/staging/integrator-kit/scripts/pair_r10.py`). **Rules-taught model on a rules menu; animals under 8 years
stay on the rules; a level measurement on one training seed; no comparison here is a registered result.**

- **The run.** Nine simulated days in 2.73 hours: 18,869 asks (2,097 a day, 55.2 per animal on the kernel), 0.52 s a
  call (median 0.44 to 0.53 by day), no timeout, no worker restart; the kernel's choice settled 98.0% of asks, the rules
  368 (answers that had gone stale); the gate held 27.2 acts per animal and day without asking. The burned-in world is
  the pilot's (4b5cc61f8ad797e0). The replay reproduces all 9 day hashes and all 28,167 receipt lines.
- **Viable.** No death; 342 of 342 nights in a nest; reserves −0.07% of the usual store a day (the same animals on
  the rules −0.04; difference −0.03, −0.08 to +0.01). The stop check after day 5 passed on all four numbers.
- **Level, the same 38 animals on the kernel and on the rules, per animal and day:** energy eaten 1,487 against 1,597
  kcal (−110, −137 to −84); distance 1.63 against 2.50 km (−0.88, −1.16 to −0.59); trips to food begun 2.4 against
  7.6 and completed 0.74 against 2.10; act changes 31.1 against 40.2. Through the field observer, by value (kernel run /
  rules run / field band): adult male day range 0.89 / 2.28 / 1.5 to 3.5 km; travel share of daytime 0.076 / 0.103 /
  0.12 to 0.25; feeding share 0.335 / 0.374 / 0.33 to 0.5; rest 0.499 / 0.453 / 0.3 to 0.47; fruit share of feeding
  0.992 / 0.848 / 0.6 to 0.78; male pant-hoots 0.17 / 0.60 / 0.5 to 1.5 per male-hour; party size 4.69 / 4.23 / 4.5
  to 9.2; grooming share 0.101 / 0.073 / 0.08 to 0.18; pant-grunts to the top three males 0.49 / 0.62 / 0.6 to 0.9
  (one community-window each).
- **Reading.** A population on this adapter lives, nests and keeps its reserves, and it is sedentary: it sets out for
  food a third as often as the rules, walks a third less (the focal tests inside a rules-driven community showed a
  fifth less: 2.05 against 2.63 km), calls less and eats 7% less. The under-travel of the focal tests is larger when
  every adult is on the kernel, as the sceptic of 10 October expected.
- **Decision of the integrator (11 October, 14:20).** The remaining seven hours of this night are not run on this
  adapter. The run served its purposes (the script and the model's path proven on a real worker, viability, the level,
  18,501 states a model-driven population reached, with probabilities), and the wording test of the same morning
  (`docs/staging/r8-prereg.md` §10a) showed that this adapter read more than half of what it knows from the rules' own
  sentences. The processor goes to stage R11's adapters; the next population run is registered with the first of them.
  The folder `artifacts/r10/night-s48` in `bench-t1` is kept for relabelling.

## For the integrator

**1. Status line for `IMPLEMENTATION_PLAN.md`, Stage R10** (replacing "In progress (10 October 2026; branch
`r10-night`). The night itself is launched by the integrator."):

> **Status**: Script built and proved without a model (10 October 2026; branch `r10-night`, agent-reported and
> reviewed by a second agent, which repaired four defects (§10.6); awaiting the integrator's review;
> `docs/staging/r10-prereg.md` §10). `scripts/r10-night.ts` puts every animal aged 8 and over
> on one kernel (animals under 8 on the rules), journals each answer as it arrives, writes a receipt per decision
> point and a lossless checkpoint per simulated day, resumes, reads a stop check after five days and replays through
> the field observer. On seed 48 a rules arm through it equals the plain rules world (hashes c0c0192822501ddf,
> 1aa2a8d748255642); the no-model reference `argmax-gate` is asked 2,060 and 2,069 times a day (54.3 per animal on the
> kernel) with 1,145 and 1,149 acts held by the gate; a run killed inside day 2 and resumed ends on the uninterrupted
> run's hash (07ec9b9f26b64f60) with 1,408 journalled answers reused; the replay regenerates all 6,423 receipt lines.
> Projection: 22 to 39 simulated days in a 10-hour night at 0.76 to 0.44 s an ask. Two read-only taps were added to
> `src/sim/decide.ts` (null by default; goldens and the field pin unmoved). **Not run: the night, and anything with a
> model process.** The night is registered in §8 and is launched by the integrator.

**2. Command line for `AGENTS.md`** (after the `scripts/r5-pilot.ts` line):

```
pnpm exec tsx scripts/r10-night.ts run --seed 48 --arm trained-gate [--decode top] [--days 40] [--hours 10] [--out artifacts/r10/<label>] | run --resume <out> | replay <out> [--taps a.ts] | status <out> | plain --seed 48 --days 2   # stage R10 (docs/staging/r10-prereg.md): one kernel for every animal aged 8 and over in every community (animals under 8 stay on the rules), on the working base with the switches of the gate test, after 30 days of burn-in; arms are those of scripts/r5-pilot.ts (rules, argmax-gate = no model, trained-gate = r4-rules-state); every answer is journalled as it arrives, a receipt per decision point (schema r10-receipt-1: the menu with stable keys, the probabilities, the applied option, what opened the ask, acts the gate held), a lossless checkpoint per simulated day (the last two kept), --resume continues from the newest whole checkpoint and reuses journalled answers; a stop check after day 5 (starvation, reserves, nights in a nest, fallbacks) ends a hopeless run with exit code 3; replay answers from the receipts with no model, must land on every day's hash, and prints the short scorecard by value through the field observer; a model arm needs the runtime variables of HANDOFF.md, MGOGO_FT_ROOT and MGOGO_FT_ADAPTERS, refuses to start while another model process runs (any Python started from the Decide environment), and is launched from the repo root under caffeinate -i in a terminal that stays open; kill -TERM to the script's own pid (status prints it) stops it cleanly, any other end is continued with --resume; refuses a dirty tree, reserved seeds and less than 5 GB free
```

**3. Parameter rows for `docs/simulation.md` §17:** none. The stage adds no entry to `data/params.json` and changes
no default. If §17 or the section on diagnostics lists taps, one line: "`loopTap` (`src/sim/decide.ts`; stage R10):
`point` at every decision point with the interrupt that raised it, `gate` with the loop gate's verdict; null unless a
script sets them; read only."

**4. Merge notes.**

- New files only, except `src/sim/decide.ts` (14 lines added, 2 changed: the `loopTap` export, one call in
  `decisionPoint`, three in `loopGate`). A conflict is likely there if `r7-ledger` adds its shadow tap or another stage edits `loopGate`; the
  calls are independent of any other change and can be kept beside it.
- `scripts/r5-pilot.ts`, `scripts/lib/kernels.ts` and `src/kernel/*` are untouched. The script imports `ARMS`,
  `armWorld` and `GuardedScorer` from `scripts/r5-pilot.ts`; an arm added there by another stage is accepted by
  `--arm` without a change here.
- **The decode (for `r9-draw-hold`).** Everything goes through `scripts/lib/r10-decode.ts`: `decode(mode,
  probabilities, request, env)` returns `{ index, note? }`. To add R9's modes: call R9's module inside `decode`, add
  the modes to `DECODE_HERE`, and return what should be logged as `note` (it is written on the receipt and the journal
  as `dec`, and the replay hands it back). `env.random` is the loop's draw, fixed by seed, animal and decision
  version. If R9 puts the decode inside the kernel instead, run with `--decode top`, which changes no answer.
- **The timing card (for `r7-card`).** A module whose default export is a function `(registry) => Tap`
  (`scripts/lib/r10-run.ts`): `start(world)` once on the burned-in world, `before(world, i)`, `tick(world, i, lines)`
  after each tick's answers with that tick's receipt lines, `dayEnd(world, day)`, `end(world)` whose value is written
  to `replay/replay.json` under `taps[name]` and printed in `replay.md`. Run it with `replay <out> --taps
  path/to/card.ts`. The same interface works on a live run through `runDay`'s `taps`.
- **The receipt schema (for `r7-ledger`)**, `r10-receipt-1`, one JSON line per decision point of an animal on the
  kernel, in time order, in `receipts/dNNN.jsonl`:
  - `ask`: `k, tick, t, day, id, v, phase, n, rulesIndex, opts [[action, targetId, variant, aux]], fam [kind per
    option], trig {why: interrupt | bout-end | finished | waiting, intr, gate}, index, p, dec?, by: kernel | rules,
    refusal, detail, picked, act [action, targetId], sha, ctx, tokens, ms, re?`
  - `held`: `k, tick, t, day, id, v, how: kept | arrived, act, fam`
  - Who set an act's **kind and target**: an `ask` with `by` kernel is a fresh choice of the model (`picked`); a
    `held` line is an intention the gate kept or the feeding it began on arrival; an `ask` with `by` rules is the
    rules (with the reason). Who set an act's **ending**: the `trig` of the same animal's next line says what ended
    it (the gate's word: `interrupt`, `ended`, `need-bucket`, `period`, `max-age`, `light`, `patrol`, `hunt`, or a
    pay-test word of `src/sim/rg.ts`), so body, world and hand-set timers can be told apart there.
  - Not in the receipts: the rules' own decisions for animals under 8, and the options cut from the menu before the
    kernel sees it (the ledger's shadow tap). The full decision context of each ask is in `contexts/dNNN.jsonl.gz`
    under the same key (`t`, `id`, `v`) with the hash `ctx`. If the ledger needs another field, `runDay` in
    `scripts/lib/r10-run.ts` builds the line in one place.
- Tests to run at the merge: `tests/r10-night.test.ts` (13 tests; 30 to 60 s on a busy machine; one of them starts the
  script three times as a child process and needs 5 GB free on the temporary folder's volume), then the whole suite.
- The burned-in world is kept under `artifacts/r10/burnin/` in a file named by commit, so the first run after the
  merge burns in again (about 35 s) and should print "the burned-in world is the pilot's (hash 4b5cc61f8ad797e0)"; if
  it prints another hash, something merged has moved the simulation on the working base and the night is a different
  world from R5's.

**5. Launching the night** (the user's or the integrator's call; §8 has the full text):

- Before: restart the Mac if swap in use is above 6 GB (the script holds up to 30 minutes otherwise); no other
  model process, no browser frame checks, no training during the night; a clean checkout of the merged commit; the
  adapter folder present (`…/r4b-retrain/artifacts/decide-ft/r4c/adapters/r4-rules-state`, sha256 e09fd6f4…1932).
- The command of §8, from the repo root. It prints a line per simulated day and one per simulated hour inside a day.
- In the morning: `status`, the log's tail, then `replay` (no model). If the state is `interrupted` or the process is
  gone: `run --resume <out> --hours <what is left>`.
- Launch it from a terminal window that stays open all night (review, A11): if the terminal or the session that
  launched it goes away, the run is killed, also under `nohup`. An agent whose session ends must not be the launcher,
  unless it starts the command of §8 inside a detached `screen` session (`screen -dmS r10 bash -c '<the exports and
  the command>'`; `/usr/bin/screen` is on this Mac): tried in the review on the small map with a no-model arm, the run
  went on after the launching shell had gone and the session closed when the run ended.
- To stop it on purpose: `kill -TERM <pid>` to the script's own process (the pid is in the log line "awake: caffeinate
  -i -w <pid>", in `run.json` under `segments`, and printed by `status` while the run is live). Ctrl-C in its terminal
  can end as a kill instead; then the registry stays at `running` and `--resume` continues with nothing lost.
- The model-process check counts every Python started from the Decide environment (review, A10), whatever script it
  runs, so another agent's tokeniser or scoring script in that environment refuses the launch and is named.
- If the first start fails after the burn-in (the worker cannot warm up within ten minutes, the adapter's hash does
  not match), `run.json` already exists: start again with `run --resume <out>`, not with the first command.
- Report it as a level, under the name "rules-taught model on a rules menu", with "animals under 8 years stay on the
  rules" beside every number. No comparison is a result until a fresh unseen seed has been run.

**6. Decisions that are not mine.** Which decode the night uses (`top` as registered, or R9's once it is merged);
whether the first night stays on training seed 48 as registered; whether a rules arm of the same days is run beside it
for reading (seconds of machine time; not registered here as a comparison); whether the four stop thresholds of §5
stand.
