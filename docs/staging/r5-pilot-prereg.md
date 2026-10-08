# Stage R5 pilot: the trained decision model chooses for chimpanzees inside the simulation (pre-registration)

Agent r5-pilot, branch `r5-pilot` from `track-e` a7ed356. Registered 7 October 2026, before any run. Specification:
`IMPLEMENTATION_PLAN.md`, Track R, "Stage R5", the direction amendment of 6 October and the user decisions of 6 and
7 October 2026; `docs/staging/r4-prereg.md` §9 (the adapter and the in-loop command it left, not run with a model).

This is a focal-group pilot, not the kernel swap of stage R5: no scorecard, no whole population, nothing longer than
five simulated days after a burn-in. It asks one thing. Offline, `r4-rules-state` picks the rules' decision at 0.61 of
held-out draws. Offline agreement is not behaviour: **when that model chooses, what do the animals do?**

The user's decisions that bind it, verbatim:

- "yes just state in training": the model's input holds state, perceptions and beliefs only; no rules' score, value
  or mark of the rules' pick.
- "keep the rules' pick on the menu for the main comparison and report "removed" as a second number; judge the
  random-engine test on daytime rows only and fix the night menu in the next stage; random engine drives animals aged
  8 and over; run the gate both on and off."
- "Use 0.5 as the declared working base for the engine comparisons, 0.25 as the sensitivity check."
- "no cloud machine run things locally".

No network, no paid call, no outside model. No change under `src/` or `data/`; no switch default changes; the goldens
and the field pin do not move.

## 1. World, animals, days

**Base.** The working base, `docs/staging/integrator-kit/params/M6-W50.json` (S39 with a swallowed share of 0.5), field
profile, plus `observeV4` 1 and `menuParity` 1: the packet fields the adapter was trained on, and every kernel's menu
built by the function that builds the rules' menu, at night too (stage R2; the user's "fix the night menu in the next
stage"). A rules-only world does not read either switch. The 0.25 base is not run here (stated limit).

**Seeds.** 48. Seed 7 only if time allows (§4). No other seed.

**Burn-in and window.** 30 simulated days on the rules, the same for every arm (one burn-in per seed, kept as a file;
every arm continues an exact copy of it and every output records its hash). Then **5 days**, each from 06:30 to 06:30,
so each holds one whole night. The world starts on 28 September, so the window is 28 October to 2 November.

**Season.** Named from the phenology record before any arm runs, without a simulation: the crop the record gives each
tree inside the focal community's range (before depletion; `cropTarget`, a pure function of tree and time) summed at
each of the 365 days from the start. The window's mean is ranked in that year: **lean** if below the year's lower
third, **rich** if above the upper third, **middle** otherwise. The same is reported for the adapter's training windows
(days 6 to 10 and 10 to 14). The adapter saw no lean day and almost no hot one (`r4-prereg.md` §9).

**Focal animals.** M3's rule (`scripts/em-loop.ts` `focalSet`), applied to the burned-in world, the same five in every
arm: in the community with the most adults, its alpha male, the median-ranked other adult male, the lactating
female with the lowest id, the adult female not lactating with the lowest id, the adolescent of 12 to 15 years with the lowest id. All are aged 8
and over (the population the user's decision gives a non-rules engine). **Stated limit:** seeds 48 and 7 are the seeds
the adapter was trained on (days 6 to 14), so these are animals it met in training, 16 days later; the held-out seed
21 is not a pilot seed.

**Everything else stays on the rules:** every animal outside the focal five, in every arm.

## 2. Arms

One step for every kernel other than the rules: stage R1's `answerWaiting` (`src/kernel/loop.ts`): the request
(`buildRequest`), the request validation, the kernel, the answer check, `applyDecision`'s legality re-check; anything
refused is decided by the rules and counted by reason. A focal animal is model-controlled in lockstep: at a decision
point it waits, and it is answered before the next tick.

| Arm | Who chooses for the five | Gate | Rules' pick on the menu | Model |
| --- | --- | --- | --- | --- |
| `rules` | the rules (`rgChoice`: their own intention gate, then a draw) | their own | n/a | no |
| `null` | random: uniform over the menu (`nullKernel`; the draw fixed by seed, animal and decision version, never `world.rng`) | off | kept | no |
| `untuned` | GLiNER2.5-Decide as published, on the state-only packet | off | kept | yes |
| `trained` | the same with the adapter `r4-rules-state` (sha256 `e09fd6f4…1932`), on the state-only packet | off | kept | yes |

These four are the comparison. The packet is `scripts/lib/packet-state.ts` `buildStateOnlyQuestion`, through
`glinerKernel` (a test in `tests/r4-packet.test.ts` asserts it is the training text). The model's choice is the first
maximum of its probabilities; nothing is sampled.

**Reference arms that load no model** (seconds each; they exist so the four can be read):

- `rules-r1`, `rules-r2`, `rules-r3`: the rules on the same burned-in world with the random stream advanced by 1, 2
  and 3 draws. They show how far the same five animals drift from the `rules` arm in five days by chance alone: the
  **noise** every other difference is held against.
- `argmax`: the same loop choosing the rules' top-scored option on the menu. M3 found that the loop alone, which asks
  at every decision point and holds no intention, makes animals walk 1.7 times as far. This arm shows what the loop
  does without a model.
- `null-gate`, `argmax-gate`, `null-nopick`: the same for the two optional settings below.

**If time allows after the four** (§4): `trained-gate` (`kernelGate` 1: the loop's intention gate, the function the
rules use; the model is asked only after a salient change), `trained-nopick` (`kernelNoRulesPick` 1: the rules' pick
removed from the menu; the user's second number), `untuned-gate`.

`kernelGate` and `kernelNoRulesPick` are set on the arm's copy of the burned-in world; they are read only when a
kernel other than the rules decides (`tests/kernel.test.ts`; asserted again in `tests/r5-pilot.test.ts`).

## 3. Readouts (fixed now; measurement only, no gate, no keep rule)

Per focal animal and day (`scripts/r5-pilot.ts`), simulation truth:

- **Energy:** energy eaten by the field's formula (kcal, `en.fin`; M3's intake number), usable energy in (`en.in`),
  energy out (`en.out`), change in reserves (kcal and % of the usual store, `en.res` over `reserveCap`).
- **Activity:** minutes in daylight (daylight ≥ 0.5) feeding, travelling, resting, grooming, other social, agonistic,
  by the one field mapping (`src/field/categories.ts`).
- **Distance:** the ground path (per tick, a placement jump bounded as in M3) and the path between 5-minute fixes.
- **Night:** the share of the dark minutes (daylight ≤ 0.03) spent in a nest; a **night in a nest** is a night with at
  least 90% of them in one.
- **Who decided:** decision points sent to the kernel; those its choice settled; those the rules settled, by reason
  (fewer than two options, invalid request, invalid answer, kernel error, timeout, answer no longer legal); acts the
  gate kept without asking (gate arms). The share the kernel made is its settled choices over all new acts of the
  focal animals. Also how often its choice was the rules' pick, and the kinds it chose against the rules' pick on the
  same menus, by light phase.
- **Time:** wall seconds per arm, seconds per kernel call (median, mean, 95th percentile), timeouts.
- **Deaths** in the window, whole world.

**Timeout.** A kernel call is abandoned after 120 s: the decision goes to the rules, counted as a timeout, and the
worker is replaced before the next call.

**Receipts.** Every kernel pass is one line of `artifacts/r5/pilot/s<seed>/<arm>.receipts.jsonl`: tick, time, animal,
decision version, light phase, the menu (act and target per option), the rules' pick's position, the kernel's raw
answer (position and every probability), who settled it and why, a hash of the packet, its token estimate, the
milliseconds. **Replay:** each model arm is run again from its log with no kernel (`--replay`): the same loop, the
logged answers. The report says whether every day's world hash and the end hash are equal. A test asserts that a
replay reproduces a run and that one changed answer does not.

## 4. Comparison, and what five animals can show

`scripts/r5-report.ts` writes every number (`docs/staging/r5-pilot-numbers.md`); none is typed.

- The unit is the animal. Each arm is compared with `rules` **on the same animals and days**: per animal, the mean
  over its days of (arm − rules); then the mean over animals with a 95% t interval over animals (4 degrees of freedom
  with five animals, multiplier 2.776; with both seeds, ten animals pooled, 2.262).
- **Noise:** the largest absolute mean difference of the three rules re-draws against `rules`, per measure.
- Words, fixed now. **"differs"**: the interval excludes 0 and the size is above the noise. **"close"**: not
  "differs", and the size is within the larger of the noise and 15% of the rules arm's mean. **"not resolved"**:
  anything else. "Like the rules-driven animals" is said of a measure only when it is "close".
- **What this size can show, said plainly.** With five animals a difference is detectable only if it is larger than
  about 1.24 times the spread between animals (2.776 ÷ √5); the half-width of each interval is printed as the size the
  pilot can show for that measure. A sign test cannot reach 5% with five animals (all five one way is 6%). So the
  pilot can show large effects (the kind M3 found: two thirds of the intake, 80% of nights out of a nest) and cannot
  show small ones, a rare event, a community-level row, a season, or a difference between worlds (one or two seeds).
  "close" is not proof of equality.
- The second number (pick removed) and the gate arm are reported the same way, each also against its own no-model
  reference.

**Written before any run, from R4's offline numbers** (to be checked, not to be met): the trained model feeds less
than the rules (it picked feeding at 0.20 of draws against 0.29) and so takes in less energy; with the gate off every
kernel arm walks more than the rules (M3's loop effect), the `argmax` arm included; trained animals nest at night
(night agreement 0.84); the untuned model underfeeds and over-chooses social acts (M3); random choice feeds for more
minutes on less fruit and rests less (R1b).

## 5. Order, machine rules, where it stops

1. This file, committed. 2. `scripts/r5-pilot.ts`, `scripts/r5-report.ts`, `tests/r5-pilot.test.ts`, committed
(`tsc`, the tests of the hard rules). 3. **Iteration 0, a smoke check with no model** (seed 48, burn-in 1 day, window
1 day, arms `rules`, `null`, `argmax`, then the replay of `null`): the path runs, receipts are written, the replay's
hashes are equal. Not a result. 4. Seed 48: the burn-in and every no-model arm. 5. Seed 48: `trained`, then
`untuned`, one worker process for both. 6. Their replays; the report. 7. If time allows, in this order:
`trained-gate`, `trained-nopick`, then seed 7 (no-model arms, `trained`, `untuned`), then `untuned-gate`. An optional
arm is started only if the model time used so far is under 3.5 hours. What was not run is said.

**Machine.** A three-year simulation is running here. Before each model load: `uptime` and `sysctl -n vm.swapusage`
are read and written in §6. One model process at a time. No model run starts while swap in use is above 6 GB: wait
and re-check for up to 30 minutes, then go ahead and note the conditions. No process this agent did not start is
signalled.

**Runs** only from a committed head of `r5-pilot` with a clean tree (the runner refuses otherwise). Every iteration is
logged in §6 before it runs. At most 3 iterations per problem, then stop and report.

**Code delivered** (all outside `src/`): `scripts/r5-pilot.ts` (the runner: arms, receipts, replay, the season
readout; it reuses M3's `focalSet`, R1's `answerWaiting`, R4's packet and `glinerKernel`, the decide-ft `Worker`),
`scripts/r5-report.ts`, `tests/r5-pilot.test.ts`. `scripts/em-loop.ts` is not changed: R4's command would run the two
model arms, but it has no random arm, no per-day rows, no energy out, no receipt log and no replay.

## 6. Iteration log and results

Machine at registration (7 October 2026, 18:23): load averages 3.27, 8.25, 7.25; swap 3,906 MB used of 5,120 MB; no
model process of this agent running.

- **Iteration 0 (logged before it runs, 7 October 2026): the smoke check of §5, no model.** Seed 48, burn-in 1 day,
  window 1 day, arms `rules`, `rules-r1`, `null`, `argmax`, `argmax-gate`, `null-nopick`, then `--replay` of `null`
  and `argmax-gate`; outputs under `artifacts/r5/smoke/` (not a result; never read by the report of the pilot).
  Checked: the runner refuses a dirty tree, receipts are written, the replays' hashes equal the runs', the report
  script reads the outputs.
  Result (18:31, head 889d421): the runner refused the dirty tree before the commit and ran after it; six arms of one
  day in 11 s in all (a world-day on the rules takes about a second; 514 to 703 kernel passes a day for the five
  animals with the gate off, 273 with it on); both replays ended on the run's hash (`null` 907ba13e54ac5377,
  `argmax-gate` 5edc71db6c87dbe0); the report script printed every table. Two defects were found by the test before
  this run and fixed in the first code commit (the end hash of a part-day run, and kernel errors missing from the call
  count). No number of the smoke check is used.

**Amendment A1 (before any arm of the pilot runs).** §1 says the season is named "before any arm runs". The runner
writes the season readout with each arm's output, from the burned-in world's range, so it is read from the `rules`
arm's file, before any kernel arm (model or not) is run. The rule for the words is unchanged.

- **Iteration 1 (logged before it runs): seed 48, the 30-day burn-in, then `rules` alone; the season is read and
  written here; then the no-model arms** `rules-r1`, `rules-r2`, `rules-r3`, `null`, `argmax`, `null-nopick`,
  `null-gate`, `argmax-gate`, and the replay of `null`. Outputs `artifacts/r5/pilot/s48/`.
  Result (18:32 to 18:33, head 15c2193, clean tree). Burn-in 30 days, hash 4b5cc61f8ad797e0. Focal animals (West
  community): Tavuni (alpha male), Koruza (adult male), Lwazo (lactating female), Fumbira (adult female), Dembiri
  (adolescent). **Season: a rich stretch.** The window's crop inside the community's range is 1.39 times the year's
  mean, above 87% of the year's days; the training windows were the same kind (1.41 and 1.36 times; above 90% and 78%).
  So the pilot does not test lean days. Each no-model arm took 4 to 6 s; 2,750 kernel passes in five days for random
  choice with the gate off, 3,091 for the rules' top option, 1,517 and 1,699 with the gate on. The replay of `null`
  ended on the run's hash (f8e6f47a3103781b). Numbers: the report, after the model arms.

- **Iteration 2 (logged before it runs, 18:33): seed 48, the model arms `trained` then `untuned`**, one worker
  process, MPS, the state-only packet, timeout 120 s; then their replays (no model) and the report. Machine just
  before: load averages 4.67, 5.23, 5.85; swap 3,898 MB used of 5,120 MB (under the 6 GB line); the three-year
  simulation's two jobs at about 1.3 GB each; no other model process.
  Started 18:33 at head 1a593c1 (worker ready with `r4-rules-state`, sha256 e09fd6f4…1932, on MPS).

**Amendment A2 (18:36, while iteration 2 runs; a counter and a label, not the world).** The first no-model arms showed
two things about the counts. (1) With the gate off the runner counted 38 to 63 "acts kept by the gate". They are not
acts: an interrupt that reaches an animal while it waits advances its decision version to invalidate the pending
request (`src/sim/events.ts` `interrupt`). The runner now counts them apart (`interrupts`) and counts a gate keep only
when the animal is no longer waiting after the tick. (2) With the rules' pick removed, 118 requests of the lactating
female were refused as invalid ("body") and decided by the rules; the runner now names the field in the receipt.
Neither change touches the world: the no-model arms are run again at the new head and must end on the same hashes
(logged below). The two model arms in progress were started before the change; with the gate off their gate count is
0 by definition, and the report shows their in-tick count as stale requests.

- **Iteration 1b (logged before it runs): the no-model arms of iteration 1 again at the new head**, to confirm the
  hashes and to get the split counts and the name of the refused body field.
  Result (18:36, head 875f370): every arm ended on the hash it had before the change (`rules` 10d4ef4232f7486d,
  `null` f8e6f47a3103781b, `argmax` 10fcc0bfa1a876ec, `null-nopick` 24a28bf7ca67168e, `null-gate` 78e443c347239686,
  `argmax-gate` e5fccf2997ba48e8, the three re-draws likewise), and the replay of each of the five kernel arms ended
  on its run's hash. The refused body field is `awakeH` (hours awake): under random choice with the pick removed the
  lactating female stayed awake 60 to 80 hours, past the range the request validation accepts, so her requests went
  to the rules.

**Result of iteration 2 (18:33 to 19:35; started at head 1a593c1, clean tree; one worker process, no timeout, no
restart).** `trained`: 2,362 kernel calls in 1,285 s (21 min). `untuned`: 4,766 calls in 2,424 s (40 min): its animals
reach twice as many decision points. Median 0.49 and 0.50 s per call. Both replays (no model, 6 and 7 s) ended on the
run's hash, every day's hash equal (`trained` f81fef0affca7741, `untuned` 7690253de73a465c). Numbers: §7, from the
report. One infant died in each model world (baseline mortality, labelled illness; neither a focal animal nor a focal
animal's infant); none in the nine no-model worlds.

- **Iteration 3 (logged before it runs, 19:37): the optional arms, by `scripts/r5-chain.sh`, in the registered order,**
  one model process at a time, the swap check written to its log before each model load: (a) seed 48 `trained-gate`,
  `trained-nopick` and their replays; (b) seed 7: the 30-day burn-in, `rules`, the re-draws and the no-model arms and
  their replays; (c) seed 7 `trained`, `untuned` and their replays; (d) seed 48 `untuned-gate` and its replay. Model
  time used so far: 61 minutes (the line for starting an optional arm is 3.5 hours). Expected from iteration 2: about
  15, 25, 21, 40 and 20 minutes of model time. Machine at 19:37: load averages about 3 to 4; swap 3.9 GB in use.
  Seed 7's season and focal animals are read from its `rules` file afterwards (the chain does not stop between steps;
  the rule for the words is fixed in §1).

**Result of iteration 3 (19:37 to 22:35; head aea37ce for the model steps; one model process at a time; swap 3.8 to
3.9 GB in use and load 2.5 to 3.8 before each load, no hold).** Everything registered ran. Model time: `trained-gate`
1,172 s (1,692 calls; one call passed the 120 s limit, went to the rules and the worker was replaced: it fell while
this agent was type-checking the report script, so the machine was busier), `trained-nopick` 2,023 s (3,999 calls),
seed 7 `trained` 1,540 s (2,645 calls) and `untuned` 2,431 s (5,228 calls), `untuned-gate` 3,412 s (6,637 calls: the
untuned model's animals keep reaching decision points). Model time in all, both seeds: 4 h 3 min (the last arm was
started at 3 h 6 min, under the 3.5 h line). Every replay ended on its run's hash. Seed 7: burn-in hash
d9604068dec350b1; the window is a **middle** stretch (crop 1.05 times the year's mean, above 65% of the year's days);
focal animals Tavuni (alpha), Sanaki, Lwazo (lactating), Fumbira, Dembiri of that world's West community.

**Amendment A3 (22:37, after every model run; exploratory additions, each labelled where it is shown).**
1. *Water.* The receipts showed that when the rules' pick is to drink, the trained model usually goes to (or stays in)
   the nest instead. Water was not a registered readout, so one is added after the fact: the body water deficit at
   the end of each day (the water ledger's `def`, mL). It is read by replaying each model arm from its receipts (the
   replay is the same world: hashes checked), not by a new model run. Exploratory: chosen after seeing the choices.
2. *Was the option there?* A table of how often the nest and water were on the menu and taken, because with the
   rules' pick removed the nest all but disappears from the dusk and night menus (the pick is the nest, and the menu
   holds one nest), so the "removed" arm cannot say whether an engine would nest.
3. *Deaths.* Three seed-48 worlds had one death each on the fourth morning, one of them a focal male. A diagnostic
   (`scripts/r5-deaths.ts`) walks the random sequence every arm shares and replays each arm to see where its very
   small values fall.

- **Iteration 4 (logged before it runs; no model): at the new head, both seeds, the rules and no-model arms again and
  the replay of every kernel arm** (the water readout; the hashes must equal those of iteration 3), then
  `scripts/r5-deaths.ts` and the three reports (seed 48, seed 7, both pooled).
