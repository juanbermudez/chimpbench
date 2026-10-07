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
