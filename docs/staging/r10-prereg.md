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
- **A6 (20:24, after two timed field runs, before the runs reported in §10.3). When the files are forced to the
  disk.** §3 said the journal is "written and flushed before the next call" and the receipts "appended and flushed
  after each tick". As first built, every answer and every tick ended with an fsync. Measured on the project's volume
  (`/Volumes/Drive`, shared with the other agents): about 8 ms per fsync at load 7 (65 s of waiting a simulated day)
  and about 115 ms at load 10 (about 270 s a day, a quarter as much again as the model's own time). So: every line is
  still handed to the operating system at once with a write call (nothing is held in the process, and a process that
  dies or is killed loses nothing: proof 7), and the journal, receipts and contexts are fsynced when two seconds have
  passed since the last time and when the day closes. A power cut or a kernel panic can therefore lose at most the
  answers of the last two seconds, which a resume asks again. Each day's line prints the fsync calls and their
  seconds.
