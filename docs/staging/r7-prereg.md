# Stage R7, first half: the timing card, the noise floor and the control arms (pre-registration)

Agent r7-card, branch `r7-card` from `track-e` dea2643. Registered 10 October 2026, 19:43 EDT, before any run of this
stage. Specification: `IMPLEMENTATION_PLAN.md`, "Stage R7: Instruments and controls (no model)", parts (a) to (d), and
the user decisions of 10 October 2026. Part (e), the "who decided" ledger, is the other half (branch `r7-ledger`).

**No model, no training, no network call by any script.** Simulations on CPU only, one at a time.

## 0. Why

Three rounds of training were judged by "matches the rules on feeding" and by counts of rows inside their bands. The
failure that mattered (an adapter that began 54 trips to food a day against the rules' 8) is invisible to all 150
field targets. The review of 10 October also showed, on published values, that a rules-plus-random mixture moves 9 to
10 of the 15 daily rows closer to the field numbers: a noisier chooser drifts toward them. So before any engine is
judged again this stage builds three things: an instrument for timing; the noise of every row at the unit the engine
tests use; and control arms an engine must beat.

Standing rules that bind it: field numbers are targets and yardsticks, never inputs; nothing is tuned to a behavioural
rate, and nothing is fitted to the rules' rates either; every new switch defaults to today's behaviour; the compressed
golden hashes and the field pin do not move; the protocol hash (`src/field`, `src/compare`, `data/targets.json`) does
not move, so this stage edits none of those files.

## 1. World, units, animals

**Base.** The working base `docs/staging/integrator-kit/params/M6-W50.json` (a swallowed share of 0.5; not a claim
about chimpanzees), field profile, plus `observeV4` 1 and `menuParity` 1, exactly as `scripts/r5-pilot.ts` and
`scripts/r4b-loop.ts` build it. A rules-only world reads neither switch; the null kernel's menu is then the rules'
menu, at night too.

**Seeds for building.** 48 and 7 (development seeds). No other seed is run in this stage.

**Burn-in.** 30 simulated days on the rules, one per seed, kept as a file under `artifacts/r7/`; every arm continues an
exact copy (`structuredClone`) and every output records the burn-in's hash. The burn-in ends at 06:30, so a day of the
window runs 06:30 to 06:30 and holds one whole night.

**Unit F, "ten animals for five days"** (the unit the engine tests of R5, R4b, R4c and R5-gate used). Five days after
the burn-in; the focal animals are `scripts/em-loop.ts` `focalSet` on each burned-in world (in the community with the
most adults: its alpha male, the median-ranked other adult male, the lactating female and the other adult female with
the lowest ids, the adolescent of 12 to 15 years with the lowest id), five per seed, ten in all. **A control arm drives
the focal animals only; every other animal stays on the rules**, as in the engine tests.

**Unit P, "a population for about 30 days".** Thirty days after the same burn-in. A control arm drives every animal
aged `rgMinAge` (8) and over, as the random-choice test R1b did; animals under 8 stay on the rules (the user has not
ruled on who decides for them; stated in every result). Readouts cover the whole population.

**Re-draws.** A re-draw is the same burned-in world with a salt mixed into its random stream at the fork:
`world.rng = mixSeed(world.rng XOR salt × 0x9e3779b1)`, the formula `rngSalt` applies at world creation
(`src/sim/generation.ts`), applied by the harness to the copy. The earlier loop tests re-drew by advancing the stream
1 to 3 draws; a salt gives an unrelated stream. Every arm of this stage carries its own salt, so no two arms share a
stream.

## 2. Arms

| Arm | Who chooses for the driven animals | Salts | Runs per seed and unit |
| --- | --- | --- | --- |
| `rules-1` … `rules-8` | the rules (their own gate and draw) | 1 to 8 | 8 |
| `random-a`, `random-b` | uniform over the menu (`kernelSim` 1, the null kernel) | 11, 12 | 2 |
| `mix10-a`, `mix10-b` | the rules with 10% of choices random | 13, 14 | 2 |
| `mix20-a`, `mix20-b` | the rules with 20% of choices random | 15, 16 | 2 |
| `mix30-a`, `mix30-b` | the rules with 30% of choices random | 17, 18 | 2 |

Sixteen arms, two seeds, two units: 64 runs, 160 world-days at unit F and 960 at unit P.

**The mixture, as built (a design assumption; a comparison layout, not a model of behaviour).** New parameter
`kernelNullShare`, default 1. It is read only under `kernelSim` 1. At every decision point of an animal the in-tick
kernel drives: with a share of 1 the null kernel decides, as today, and no coin is drawn (every existing `kernelSim` 1
run stays hash-identical); with a share of 0 the rules decide, and no coin is drawn (the world is the rules world, bit
for bit); with a share strictly between, one coin is drawn from `world.rng`; below the share the null kernel decides
through the step every kernel shares, otherwise the rules decide by their own policy (`decideByRules`, the gate and
the draw). After a random choice is applied the rules' held intention is dropped (with `kernelGate` 0), so the rules'
gate does not later act on an intention the animal is no longer carrying out; with `kernelGate` 1 the random choice
becomes the intention, as for any kernel (not run here). The share is a share of decision points, not of fresh draws:
a point at which the rules would have kept their act can also go to the coin.

**Driving the focal animals only, inside the tick.** New switch `kernelFocal`, default 0. With 1 the in-tick kernel of
`kernelSim` decides only for animals whose `controller` is `'model'`, with `world.modelPolicy.mode` `'off'` so that
nobody waits for an answer; the harness marks the focal animals. With 0 (today) it decides for every rules-driven
animal aged `rgMinAge` and over. This is what lets unit F keep the rules' true policy for the non-random share: the
between-tick loop of the engine tests parks an animal for a tick and can only offer the rules' top-scored option.

**Stated differences from an engine arm at unit F.** An engine arm is answered between ticks (the animal waits up to
one tick) and its draw is a hash of (seed, animal, decision version); a control arm of this stage decides inside the
tick and draws from `world.rng`. The saved `null` arm of R5 (between ticks) is the bridge: its published values are
quoted beside this stage's `random` arm in the results; no engine arm is run here.

## 3. The timing card: readouts and their sources

Read from the world after every tick by `scripts/lib/timing-card.ts`; nothing writes the world (a test checks the
hash). Three shared definitions:

- **awake**: alive and not in a finished nest (`action` nest with phase 2, or riding in the mother's): `inNest` of
  `scripts/r5-pilot.ts` and `scripts/lib/truth-rows.ts`.
- **the six activities**: the observer's category of a point sample, by the same function with the same flags
  (`src/field/categories.ts` `activityCategory`; being groomed, eating meat, at the water as
  `src/field/protocols.ts` `categoryOf`): feed, rest, travel, groom, social, agonistic.
- **the three activities**: the project's Taï mapping (`scripts/compare-movement.ts` `actOf`): feed stays feed; travel
  and agonistic are travel; rest, grooming and other social time are rest (a design assumption of that comparison:
  the Taï file has only three states).

| # | Readout | Definition | Source of the definition |
| --- | --- | --- | --- |
| C1 | act changes per animal-day | ticks at which the animal's (action, target) pair differs from the tick before, over the 24 hours | none in the field; the loop's own unit (R5-gate's "new acts") |
| C2 | switches per waking hour | changes of the six-activity category between consecutive awake ticks, per awake hour | potts2011 scored a state after one minute: feeding "uninterrupted by other behaviors for at least one minute", travel as "sustained movements" over a minute; the card counts every change and reports C2b beside it: changes that last at least one minute (4 ticks) on both sides |
| C3 | bout length by kind (median, quartiles, mean) | a bout is a maximal run of awake ticks in one of the six activities; bouts cut by the window's start or end or by a death are dropped; minutes; for feed, rest, travel, groom | potts2011, Methods, Data collection: "We defined "feeding bout length" as the total amount of time that the focal individual fed in a given patch." (their feeding bout is a patch visit: C6) |
| C4 | bout length in the three activities (mean, median) | the same on the three activities | lemoine2023, Statistical analysis: "We chose 30 min intervals as it corresponds to twice the average lengths of activity bouts" (so a mean near 15 min, by implication only) |
| C5 | trips to food begun and completed per animal-day | begun: the animal starts travelling to a food tree of its own choice, or changes the tree; completed: the trip ended with the animal feeding in the tree it set out for | `scripts/r5-pilot.ts` (stage R4b, `docs/staging/r4b-prereg.md` §7), the same code path (`familyOf` 'food-trip') |
| C6 | patch residency (mean, median, quartiles) | feeding minutes per patch visit; a visit is the feeding ticks in one tree crown with no gap over 10 minutes (the observer's own tree-visit rule, `src/field/protocols.ts` `pointSample`); tree crowns only | potts2011: "We defined a "patch" as an aggregation of food items that allowed uninterrupted feeding or foraging movements"; "Generally, this was a single tree or large sapling"; result in "minutes/patch/visit" |
| C7 | continuous feeding at one tree (median, quartiles) | a maximal run of consecutive ticks feeding in one crown (no gap at all) | the brief's reading of "time in one food patch"; reported beside C6 |
| C8 | feeding trees per animal-day | distinct crowns with at least one feeding tick in the day | T-FOOD-4's definition ("Distinct feeding trees per full-day follow"); normand2009 as quoted in `docs/research.md` |
| C9 | half-hour persistence, all and from rest, travel, feed | marks on the clock half hours from 06:30 to 18:30 while the animal is awake; a pair is two marks 30 minutes apart, both recorded; the share of pairs in the same one of the three activities | lemoine2023: "We computed the recorded activities of the focal individual for each minute of observation."; "We obtained a reduced dataset of 42,385 minute-points."; the file's own range of clock hours (6.5 to 18.5) |

Guards read beside them, per animal-day (definitions of `scripts/r5-pilot.ts` and `scripts/r5-report.ts`): reserve
change as a share of the animal's reserve cap, distance by 5-minute fixes, a night in a nest (at least 0.9 of the dark
ticks in a nest), act changes (C1) and trips completed (C5); energy eaten is read and is **not** a guard (random
choice ate 1,682 kcal against the rules' 1,660 in the R5 pilot).

**Registered timing rows** (the list the stage's pass mark counts over; fixed now, 14 rows): C1; C2; C3 median for
feed, rest, travel and groom (4 rows); C5 begun; C5 completed; C6 mean; C7 median; C8; C9 all; C9 from rest; C9 from
feed. The others are printed and not counted (C2b, C3 quartiles, C4, C6 median, C9 from travel: the fewest pairs).

## 4. Field anchors: yardsticks only, never inputs

| Anchor | Value | Source | Limits |
| --- | --- | --- | --- |
| patch residency | 27.0 minutes per patch per visit at Ngogo, 46.2 at Kanyawara (means; CV 1.32 and 0.94; 348 and 317 patch visits) | potts2011 (`docs/research.md`, "Patch residency and feeding parties, Kibale"; re-read today from the author copy, see the R7 addendum there) | continuous follows "ideally" of one feeding bout and one travel bout; a patch can also be a stand of ground plants, which the card does not read |
| feeding trees per day | T-FOOD-4's band 4 to 15 (Taï; `data/targets.json`); 13.96 and 18.07 a day for two females followed 28 days each | janmaat2013b, normand2009 (`docs/research.md` E.41) | western subspecies; T-FOOD-4 is marked compromised in the registry (its quantity was used to withdraw a rule in C7a) |
| half-hour persistence | computed in this stage from `data/raw/plos-pbio-3002350` through `src/compare/tai.ts`, one record per follow and half-hour slot | lemoine2023 (CC BY 4.0) | western subspecies (P. t. verus); three activities; hunts, intergroup encounters and out-of-sight time removed by the authors; half an hour spans about two bouts by the authors' own sentence, so the share is a **direction, not a switch rate** |
| mean activity bout | about 15 minutes, by implication of the same sentence | lemoine2023 | an implication, not a reported value; three activities |

The Taï half-hour share, as computed here (aggregates only; no row, coordinate, name or code leaves `artifacts/`):
`taiPoints` (follows of class "O" excluded, as the project's comparison does); records grouped by follow; each record
assigned to its nearest half-hour slot; where a slot holds more than one record the one nearest the half hour is kept
(the first in file order on a tie); a pair is two consecutive slots of one follow; the share of pairs in the same
activity, overall, by first activity and by group. The fact-check found 30,341 follow-slots and, on pairs 27 to 33
minutes apart without collapsing, 47.7% in the same activity (stay 0.539 from rest, 0.252 from travel, 0.521 from
feed); this stage's script must land near those or say why not.

There is no field anchor for act changes, switches per hour or trips begun. The card reads them against the rules'
own spread and the control arms.

## 5. The short scorecard: 15 rows by value

T-ACT-1, T-ACT-2, T-ACT-3, T-ACT-4, T-RNG-4, T-FOOD-2, T-ENE-3, T-RHY-1, T-RHY-4, T-RHY-5, T-RHY-6, T-COM-1,
T-SOC-14, T-SOC-10, T-SOC-6. Each is reported by its value, in two parts: **rows held out**, and **rows fitted to the
rules or tuned** (the split and every flag are read from `data/targets.json` by the report script: `role`, `tuned`,
`encoded`, `compromised`, `heldAsFail`, `protocolRevisedPostHoc`, `scoredOn`). No pass count and no sum over rows is
printed anywhere.

**Unit P: the existing code, unchanged.** The loop of `scripts/lib/bench-run.ts` composed from the same exported
pieces on the forked world: the virtual observer (`createObserver`, `observerStep`, `finishObserver`, `derive`,
`METRICS`) for T-ACT-1 to 4, T-RNG-4, T-FOOD-2, T-COM-1, T-SOC-10 and T-SOC-6; the truth readouts
(`scripts/lib/truth-rows.ts` with the rhythm and energy probes) for T-ENE-3, T-RHY-1, T-RHY-4, T-RHY-5, T-RHY-6 and
T-SOC-14. Only the focal-follow team set is attached (none of the 15 rows is read from the party-follow sets) and no
field experiment is run (none of the 15 reads one). Two seeds are pooled as the row pools seeds: Σ numerator ÷
Σ denominator where the readout gives them, the mean of the two seeds' values otherwise.

**Unit F: the same code, pointed at the focal animals.** The observer and the probes are frozen and take no list of
animals, so each is handed a read-only view of the world:

- the observer rows: one observer per focal adult (the observer follows adults of 15 and over, so the adolescent has
  none), on a view of the world that lists only the focal community, with its rotation set to that one animal. Its
  records hold one individual; the row's own metric gives that animal's value. A row's unit value is the mean over
  the focal animals it applies to (males and females averaged as the metric averages them).
- the truth rows T-RHY-1, T-RHY-4, T-RHY-5, T-RHY-6: the same probes stepped on a view whose animal list is the focal
  animals.
- T-ENE-3: the ledger's dry matter eaten per day by the lactating focal female (the counter the energy probe sums).
- T-SOC-14, T-SOC-10 and T-SOC-6 are community rows and are read at unit P only.

**Stated before the run:** at unit F the observer keeps its own protocol (it loses a follow at random; T-RNG-4 needs
a complete follow of at least eight hours), so some rows will be thin or without a value in five days; a row without
a value in a re-draw is printed as such and gets no spread. The card's own every-tick shares of the six activities
are printed beside the four activity rows. If the views fail (a crash, or a value that cannot be the row's), the
fallback is the card's own reader for that row, logged as an iteration before its run.

## 6. Statistics (fixed now)

For each readout or row and each unit, a **realization** of an arm is its two seeds pooled: at unit F the mean over
the ten animals of each animal's mean over its days (an animal that dies is read up to its death; bout and visit
statistics pool the bouts of the ten animals); at unit P as §5 for the rows and the same pooling over all animals
aged 8 and over for the card.

- **Spread.** The eight rules realizations give mean m, standard deviation s (n − 1), minimum and maximum.
- **Smallest difference the unit can show.** One arm run once against the eight: D = t(0.975, 7 df) × s × √(1 + 1/8)
  = 2.365 × 1.0607 × s = 2.51 s. A sampled arm can be noisier than the rules, so every control arm is run with two
  salts and both values are printed.
- **"Told from the rules".** A control arm is told from the rules on a row when both of its realizations lie outside
  m ± D, on the same side.
- **The stage's pass mark.** At unit F, random choice is told from the rules on at least three of the 14 registered
  timing rows. If not, the card is redesigned (a logged iteration) and the report says so.
- **Against the field.** Where a row has a numeric band, the field's central value is the middle of the band and a
  distance is |value − centre| in half-widths of the band; for an anchor without a band the distance is in the
  anchor's own units. Printed per row for the rules' mean, random and each mixture; never summed.
- Seeds are also printed one by one. Nothing is tested across the two units.

**Written before the run (to be checked, not to be met).** From R1b and the R5 pilot: random choice should raise act
changes, switches and trips begun, shorten bouts and patch visits, lower half-hour persistence, lose nights in a nest
and reserve, and add distance; the mixtures should lie between in order; energy eaten should barely move. At unit F
the 10% mixture may sit inside the rules' spread on most rows. A prediction that fails is reported.

## 7. What is published

`docs/staging/r7-numbers.md`, generated by `scripts/r7-report.ts` from the JSON under `artifacts/r7/` (no number is
typed): the spread and D of every row and readout at both units; where random and each mixture sit against the rules
and against the field value; which timing rows tell the rules from random and from each mixture; the Taï aggregates;
the two parts of the scorecard; and the scoring rule below with this run's numbers in it.

## 8. The scoring rule for later stages (fixed now; the numbers come from the run)

1. An engine arm is read at a registered unit beside, on the same burned-in worlds, animals and days and by this
   stage's script: eight rules re-draws, random choice twice, and the rules with 10, 20 and 30% of choices random,
   twice each.
2. **An engine counts as closer to wild chimpanzees on a row only if it beats the best rules-plus-random arm there:**
   its distance to the field's central value is smaller than the smallest distance in the family (the rules' mean,
   the three mixtures' means and random choice's mean), by more than the row's smallest difference D at that unit. A
   sampled engine arm is run with two decode salts; if its own spread is wider than the rules', D is recomputed from
   it.
3. Rows are reported one by one, by value: the engine, the rules' mean and spread, the family's best arm, the field
   band. No sum over rows and no count of rows inside a band.
4. **Guards**, all of which must hold before any "closer" counts: reserve trend not below the rules' mean by more than
   D; nights in a nest not below it by more than D; distance, act changes and trips completed inside the rules' mean
   ± D. **Energy eaten is not a guard.** The published table says which guards random choice and each mixture fail: a
   guard that a mixture passes cannot by itself tell a better engine from a noisier one, which is why step 2 exists.
5. A result is named as the plan requires ("rules-taught model on a rules menu", and so on), and states that animals
   under 8 stayed on the rules.

## 9. Seeds for later engine tests (proposal to the integrator and the user)

- **Development, readable freely:** 48 and 7 (the adapters' training seeds), and from now on 21 and 5: they have been
  read in three rounds and the distance limit of R5-gate (0.84 km) was derived on them, so they can no longer test.
- **Test unit A, for the next registered engine test (R9's draw and hold):** seeds **4111** and **4222**, field
  profile, the working base, 30 days of burn-in, five days, `focalSet` on each burned-in world (ten animals).
- **Test unit B, held in reserve for the test after it:** seeds **4333** and **4444**, the same construction.
- **Whole-population comparison (R10's scored run):** seed **11** of the confirm list. No loop test, sampler or
  adapter has touched it; its rules-only scorecards are known, which is what a reference needs.
- None of the four new seeds appears in a file name, a `"seed"` field or a document under the main checkout or any
  worktree (searched today), and none lies in a reserved or retired range of `AGENTS.md` (4111 to 4444 sit between
  the used 4001 to 4010 and 5001).
- **What stays sealed:** the four new seeds are not run at all in this stage, not even for a burn-in or to name the
  focal animals; the first run on a unit is the registered test itself, which runs this stage's sixteen no-model arms
  on it before the engine arm's results are opened, so the noise is always measured on the test's own worlds. Also
  still sealed: the held-out part of the Ngogo grooming choices (never opened) and the Gombe 15-minute paths (never
  tuned against).
- The spreads published by this stage come from seeds 48 and 7 and are a development estimate of what a unit can
  show; the binding D of a test is the one measured on its own unit.

## 10. Checks and tests

`tests/r7-card.test.ts`: `kernelNullShare` is 1 and `kernelFocal` 0 by default in both profiles; `kernelSim` 1 with the
defaults is today's `kernelSim` 1 world; a share of 0 is the rules world bit for bit; a mixture is deterministic
however ticks are batched, differs from both ends and stays plain data; `kernelFocal` 1 with nobody marked is the
rules world, and with animals marked only they are decided by the kernel; the card's readouts on a built world (act
changes, bouts, trips, patch visits, half-hour pairs sum as they must); attaching the card and the views leaves the
world's hash unchanged; the Taï collapse on a synthetic follow. Also run: `tests/kernel.test.ts`,
`tests/sim-track-e.test.ts` (the field pin), `tests/sim-params.test.ts`, the golden test, `tsc --noEmit`,
`gen-params --check`, and the protocol hash against the freeze.

## 11. Limits, said now

- Two seeds; ten animals; the spreads are estimates from eight re-draws (7 degrees of freedom).
- The control arms draw from a menu the rules ranked and bounded (at most eight options, one feeding option on almost
  every ask), so "random" is random among the rules' candidates.
- Unit F's control arms decide inside the tick; engine arms are answered between ticks (§2).
- The Taï anchor is another subspecies in another forest, with three activities.
- Not in this half: the "who decided" ledger; replays of the saved adapter arms through the card (they live on seeds
  21 and 5 in another worktree's artifacts); the fork-label and stay-label tests of the review.

## 12. Iterations (at most 3; each logged here before its run)

**Iteration 1** (10 October 2026, 19:43 EDT): the design above.

*As run* (19:59 to 20:07 EDT, head 731ef3b, clean tree): the Taï aggregates; unit F on both seeds (32 runs); unit P
was stopped by the agent after three arms of seed 48. Reason: the card recorded the ledger's usable energy in (`in`),
while what the earlier loop tests call "energy eaten", and what §3's sentence on energy rests on, is the formula
measure (`fin`). **Seen before it was stopped:** every unit-F value of this launch (a first reading of all rows, and a
dry run of the report on them). Before the launch, smoke checks with a dirty tree and scratch output (seed 48: one
day at unit F with three arms, two days at unit P with two arms), used only to debug the scripts; no number of them
is reported.

**Iteration 2** (10 October 2026, 20:08 EDT, logged before its run; written knowing unit F's values of iteration 1).
The same design, arms, salts, units, rows, statistics and pass mark. One readout is added to the card's day rows:
energy eaten by the field's formula measure (`fin`), printed beside usable energy in; neither is a guard. Nothing
under `src/` changes, so every world is iteration 1's: the report compares each unit-F arm's end hash with the first
launch's and prints the count. All 64 runs are made again at one head, so every table comes from one launch.

## 13. Results (iteration 2; 10 October 2026, 20:08 to 21:00 EDT)

Every number below is copied from [r7-numbers.md](r7-numbers.md), which `scripts/r7-report.ts` generates from the runs'
JSON. 64 runs, all from a clean tree: unit F (both seeds) and unit P of seed 48 at head b19bc8f, unit P of seed 7 at
7ca84d2 (the commit between them changes only the report script). The burn-in hashes (4b5cc61f8ad797e0 for seed 48,
d9604068dec350b1 for seed 7) are those of the R5 pilot, so these are the worlds and the ten animals the first engine
test used. All 32 unit-F runs end on the world hash they ended on in iteration 1's stopped launch. Processor time:
301 s for unit F, 2,773 s for unit P. No model was loaded.

### 13.1 The card passes its mark

At ten animals for five days, **random choice is told from the rules on 9 of the 14 registered timing rows** (the mark
was three); at a population for 30 days, on all 14. The card is kept as registered.

| At unit F | The rules (mean ± SD of eight re-draws) | Random choice (two salts) |
| --- | --- | --- |
| act changes per animal-day | 46.3 ± 3.6 | 92.7 / 93.9 |
| switches of activity per waking hour | 3.99 ± 0.21 | 6.58 / 6.65 |
| trips to food begun per animal-day | 8.03 ± 0.69 | 12.90 / 13.06 |
| trips to food completed per animal-day | 1.85 ± 0.17 | 0.54 / 0.58 |
| rest bout, median minutes | 21.09 ± 1.35 | 11.00 / 11.25 |
| grooming bout, median minutes | 15.53 ± 0.85 | 5.75 / 5.50 |

Not told at unit F: the median feeding bout, mean patch residency, feeding trees per day, and the half-hour share
overall and from resting.

### 13.2 What each unit can show

D is the smallest difference one arm, run once, can show against the eight re-draws.

| Readout | Unit F: D (share of the rules' mean) | Unit P: D (share of the rules' mean) |
| --- | --- | --- |
| act changes per animal-day | 8.9 (19%) | 2.0 (5%) |
| switches per waking hour | 0.54 (13%) | 0.12 (3%) |
| trips to food begun | 1.72 (21%) | 0.37 (5%) |
| trips to food completed | 0.44 (24%) | 0.14 (7%) |
| patch residency, mean minutes | 2.57 (13%) | 0.55 (3%) |
| half-hour pairs in the same activity | 0.037 (10%) | 0.007 (2%) |
| distance, km per day | 0.40 (17%) | 0.13 (6%) |
| T-ACT-1 feeding share | 0.027 (7%) | 0.017 (5%) |
| T-RNG-4 male day range, km | 1.21 (48%) | 0.45 (22%) |
| T-COM-1 pant-hoots per male-hour | 0.19 (35%) | 0.14 (26%) |

So ten animals for five days resolve a change of about a fifth in the timing rows. The adapter failure that started
this (54 trips begun a day against 8) is more than six times the rules' value: the card sees it many times over. A 10% or 20%
change is below what that unit can show.

### 13.3 A slightly noisy chooser hides at ten animals and not in a population

- **Unit F.** The 10% mixture is told from the rules on 2 of the 14 timing rows (the median rest and travel bouts), the
  20% mixture on 6, the 30% mixture on 7.
- **Unit P.** The 10% mixture is told on 13 of 14, the 20% and 30% mixtures on all 14. Act changes: the rules 43.2 ±
  0.8, 10% random 54.9 / 57.3.
- The same 10% of random choices moves act changes by about a fifth when only the ten focal animals carry it (46.3 to
  58.3 / 52.6) and by about three tenths when the whole population does (43.2 to 54.9 / 57.3): companions' noise
  compounds, as the review expected. A ten-animal test understates what an engine does to a population.

### 13.4 The guards, and why they are not enough alone

No realization of any control arm passes all five guards, at either unit. At unit F random choice fails all five in
both realizations; the 10% mixture fails one guard in each realization (act changes in one, distance in the other) and
passes reserve, nights in a nest and trips completed. **Energy eaten cannot be a guard, and not because it does not
move: every control arm eats more than the rules.** Unit F: the rules 1,646 ± 13 kcal a day, random choice 1,686 /
1,719, the mixtures 1,700 to 1,748. Unit P: 1,624 ± 3 against 1,693 / 1,694 and 1,668 to 1,730.

### 13.5 Where the noisy arms sit against the field: the reason for the rule

Measured, not interpolated. At unit P the **10% mixture sits nearer the middle of the field band than the rules,
beyond noise, on T-ACT-2, T-RNG-4, T-FOOD-2, T-ENE-3, T-RHY-5, T-COM-1 and T-SOC-14**, and farther on T-RHY-1 and
T-RHY-4. The 20% mixture is nearer on T-ACT-2, T-FOOD-2, T-ENE-3, T-COM-1 and T-SOC-14; the 30% mixture on those and
T-ACT-1. Random choice itself is nearer only on T-ACT-1, T-ACT-2 and T-RHY-6 and farther on ten rows. So "closer to
the field numbers than the rules" is reached by adding a little noise to the rules, on about half the short
scorecard. Both parts of the scorecard show it: of the rows named, T-ENE-3, T-RHY-5 and T-SOC-14 are held out.

Under the registered rule (an engine must beat the best rules-plus-random arm by more than D):

- **Unit F leaves room on few rows.** An engine could be shown closer on T-ENE-3 (a value between 861 and 889 g),
  T-RHY-4 (25 to 35 min), T-RHY-6 (0.68 to 1.62), patch residency (23.17 to 50.03 min), feeding trees per day (6.03
  to 12.97) and the half-hour share overall (0.450 to 0.502). On the four activity rows, T-RNG-4, T-FOOD-2, T-RHY-1,
  T-RHY-5 and T-COM-1 some arm of the family is already within D of the middle of the band: ten animals for five days
  cannot show an engine to be closer there.
- **Unit P leaves room on more:** T-ACT-2, T-ACT-3, T-FOOD-2 (only 0.685 to 0.695), T-ENE-3, T-RHY-1, T-RHY-4,
  T-RHY-5, T-RHY-6, T-SOC-6, patch residency, feeding trees and three of the four half-hour shares; not on T-ACT-1,
  T-ACT-4, T-RNG-4, T-COM-1, T-SOC-14 and T-SOC-10.
- Reading: the ten-animal unit is the place to check the guards and the timing rows (is the engine told from the
  rules, and in which direction). "Closer to wild chimpanzees" is a population question on most rows.

### 13.6 The card beside its field anchors (yardsticks only)

| Readout | Field | The rules, unit F | The rules, unit P |
| --- | --- | --- | --- |
| patch residency, mean minutes per visit | 27.0 (Ngogo) and 46.2 (Kanyawara), potts2011 | 20.56 ± 1.02 | 20.79 ± 0.22 |
| feeding trees per day | 4 to 15 (T-FOOD-4's band; Taï) | 5.28 ± 0.22 | 5.01 ± 0.13 |
| half-hour pairs in the same activity | 0.476 (Taï) | 0.390 ± 0.015 | 0.413 ± 0.003 |
| the same, first mark resting | 0.539 | 0.515 ± 0.027 | 0.542 ± 0.003 |
| the same, first mark travelling | 0.255 | 0.093 ± 0.028 | 0.115 ± 0.008 |
| the same, first mark feeding | 0.518 | 0.299 ± 0.018 | 0.301 ± 0.004 |
| mean bout in the three activities, minutes | about 15, by implication only | 17.38 ± 0.94 | 18.48 ± 0.25 |

The Taï value comes from 22,211 pairs of consecutive half-hour slots (29,855 slots after one record is kept per
follow and slot; 11,798 slots held more than one record); not collapsed, on records 27 to 33 minutes apart, it is
0.477. The two groups give 0.473 and 0.479.

What the yardsticks say, as directions: the rules' animals stay in a patch for less time than either Kibale site
reports, and an animal that is feeding at a half-hour mark is feeding at the next one 30% of the time, against 52%
at Taï (resting persists as at Taï). **Random choice is nearer Taï on that row** (0.496 / 0.455 at unit F, 0.463 /
0.457 at unit P), because it feeds more of the day: once more a noisier chooser looks more like the field number,
which is what the scoring rule is for.

### 13.7 The bridge to the engine tests

The R5 pilot's saved between-tick `null` arm, on the same worlds, animals and days, beside this stage's in-tick
random arm: energy eaten 1,686 against 1,723 / 1,759 (seed 48) and 1,679 against 1,648 / 1,679 (seed 7); distance
3.50 km against 4.05 / 4.59 and 3.83 against 4.10 / 3.74; nights in a nest 0.320 against 0.600 / 0.440 and 0.640
against 0.480 / 0.320. The rules agree across the two harnesses (seed 48: 1,620 against 1,630 ± 17 kcal; 2.24 against
2.27 ± 0.28 km). The two ways of running random choice give the same picture; their differences are of the size of
the two salts' own spread. An engine arm answered between ticks can be read against this stage's in-tick control
arms.

### 13.8 What was written before the run, checked

| Said in §6 | Found |
| --- | --- |
| random choice raises act changes, switches and trips begun | yes, at both units |
| it shortens bouts | rest, travel and grooming bouts: yes; feeding bouts: no (median 21.00 / 21.00 against 18.53 at unit F; longer and told at unit P) |
| it shortens patch visits | not told at unit F (19.62 / 19.22 against 20.56 ± 1.02); a little shorter and told at unit P |
| it lowers half-hour persistence | from resting: yes at unit P; overall: not told at unit F; from feeding it **raises** it |
| it loses nights in a nest and reserve and adds distance | yes |
| the mixtures lie between, in order | yes on act changes, switches, trips begun, distance and nights in a nest; reserve falls only from the 30% mixture on |
| energy eaten barely moves | it rises by 2 to 7% in every control arm, and is told from the rules |
| at unit F the 10% mixture sits inside the rules' spread on most rows | yes: on 12 of the 14 timing rows |

### 13.9 Limits found

- **The middle of a band is a poor "central value" where the band is a limit.** T-RHY-5's band is "up to 0.05", so
  the rules' 0.017 counts as farther from its middle than the 10% mixture's 0.027. The registered rule is reported as
  registered; whether such rows should be scored by distance outside the band is put to the integrator (§14).
- **T-RNG-4 is too noisy at unit F** (D 1.21 km, 48% of the mean: it needs complete follows of adult males). The
  card's own distance over all ten animals has D 0.40 km and is the guard to use.
- **The unit-F observers lose more than half their follows** by the observer's own loss hazard (708 follows over the
  16 arms, 247 complete, 391 lost; 5,177 follow hours). That is the frozen protocol; the card's every-tick shares are
  printed beside the observer's activity rows.
- Unit F's control arms decide inside the tick, an engine between ticks (§13.7 is the check). Unit P's control arms
  drive everyone aged 8 and over; the engine's counterpart is stage R10's population run.
- Two seeds, eight re-draws: D is an estimate with 7 degrees of freedom, on development seeds.
- Random choice draws from the rules' menu: one feeding option on almost every ask.

### 13.10 Not done in this half

The "who decided" ledger (branch `r7-ledger`). Replays of the saved adapter arms (R4, R4c) through the card: their
receipts live on seeds 21 and 5 in another worktree; the card's trips begun is the readout that already showed 53.9
against 8.3 there. The review's fork-label and stay-label tests. No engine arm and no model run. The four proposed
test seeds were not run (§9). `docs/simulation.md` §17 has no row for the two new parameters yet, so
`tests/sim-params.test.ts` fails on this branch until the row of §14 is merged (checked: it passes with it).

## 14. For the integrator

**Decisions that are the user's or the integrator's.**

1. Adopt the scoring rule of §8 for every later engine comparison (R9, R10): per row by value, against the best
   rules-plus-random arm, with the five guards; no sums, no pass counts; energy eaten never a guard.
2. Seeds (§9): 21 and 5 retired to development; test unit A = 4111 and 4222, reserve unit B = 4333 and 4444, seed 11
   for R10's scored population run; none of them run before its registered test.
3. Rows whose band is a limit and not an estimate (T-RHY-5; arguably T-RHY-4 and T-RHY-6, whose bands were widened
   several-fold): score by distance outside the band, 0 inside? Not changed here.
4. Where a result is claimed. This stage's reading: the ten-animal unit for guards and timing; "closer to wild
   chimpanzees" only at the population unit, on the rows where §13.5 leaves room.

**Merge notes.**

- New parameters in `data/params.json` (`src/sim/params.gen.ts` regenerated): `kernelNullShare` (default 1) and
  `kernelFocal` (default 0), both read in `src/sim/decide.ts` `decisionPoint` only. Likely conflict: `data/params.json`
  and `params.gen.ts` with any branch that adds a parameter (regenerate with `scripts/gen-params.ts` after merging the
  JSON); `src/sim/decide.ts` `decisionPoint` with `r9-draw-hold` or `r10-night` if they touch the same lines.
- Nothing under `src/field`, `src/compare` or `data/targets.json` changed: the protocol hash is still
  215ed6ab282a57de. The compressed goldens and the field pin did not move; the worlds of `kernelSim` 1, of `kernelSim`
  1 with `kernelGate` 1, of `kernelSim` 2 and of the rules are hash-identical to track-e dea2643 (pinned in
  `tests/r7-card.test.ts`).
- `docs/research.md` gains "Addendum: R7 timing card" (Methods sentences of lemoine2023 and potts2011; no new source).
- `artifacts/r7/` is not committed: the two burn-in worlds, 64 arm files, `tai.json` (aggregates only) and the first
  launch (`launch1-F`, `launch1-P`). To regenerate the numbers: the three commands in the AGENTS.md line below.

**Proposed line for `IMPLEMENTATION_PLAN.md`, Stage R7, Status:**

> **Status**: In progress (10 October 2026). **First half (a) to (d) built and run** (branch `r7-card`, agent-reported,
> awaiting the integrator's review; `docs/staging/r7-prereg.md` §13 and §14, `docs/staging/r7-numbers.md`; two
> iterations, 64 no-model runs on seeds 48 and 7 at heads b19bc8f and 7ca84d2). The timing card
> (`scripts/lib/timing-card.ts`) tells the rules from random choice on 9 of 14 registered timing rows at ten animals
> for five days (mark: three) and on all 14 at a population for 30 days. The smallest difference ten animals for five
> days can show is about a fifth of the rules' value on the timing rows (act changes 8.9 of 46.3; trips begun 1.72 of
> 8.03) and 2 to 7% at the population unit. The rules with 10% of choices random are told from the rules on 2 of 14
> timing rows at ten animals and on 13 at the population, and sit nearer the middle of the field band than the rules,
> beyond noise, on T-ACT-2, T-RNG-4, T-FOOD-2, T-ENE-3, T-RHY-5, T-COM-1 and T-SOC-14: the scoring rule (an engine
> counts as closer only where it beats the best rules-plus-random arm by more than the row's noise, with guards on
> reserve trend, distance, nights in a nest, act changes and trips completed; energy eaten is not a guard, every
> control arm eats more than the rules) is fixed in §8. Under it ten animals for five days can show an engine closer
> on few rows (T-ENE-3, T-RHY-4, T-RHY-6, patch residency, feeding trees, the half-hour share); the rest is a
> population question. Field yardsticks beside the card: patch residency 20.6 to 20.8 min against 27.0 and 46.2 (potts2011);
> half-hour pairs in the same activity 0.39 to 0.41 against Taï's 0.476 (from feeding 0.30 against 0.52). New
> parameters `kernelNullShare` (default 1) and `kernelFocal` (default 0); goldens, field pin and protocol hash unmoved.
> Proposed to the user: seeds 21 and 5 retired to development, fresh test seeds 4111 and 4222 (reserve 4333, 4444),
> seed 11 for R10's scored run. Part (e), the ledger: branch `r7-ledger`.

**Proposed line for `AGENTS.md`, Commands:**

```sh
pnpm exec tsx scripts/r7-card.ts run --seed 48 --unit F|P [--arms rules-1,…,random-a,mix10-a,…] [--days N] | tai   # stage R7 (docs/staging/r7-prereg.md), no model: the timing card (scripts/lib/timing-card.ts: act changes, switches, bouts, trips begun and completed, patch visits, half-hour persistence, the guards) and the short scorecard's 15 rows by the existing observer code (scripts/lib/r7-readers.ts) on copies of one burned-in world of the working base: eight rules re-draws (a salt each), random choice twice and the rules with 10, 20 and 30% of choices random twice each (`kernelNullShare`), at unit F (the five focal animals of a seed for five days; `kernelFocal` 1 drives them only) and unit P (the population for 30 days; about 1 to 3.5 min an arm); refuses a dirty tree and any seed but 48 and 7 unless a registered test names its seed twice (--test-seed); `tai` writes the Taï half-hour anchor (aggregates only); then scripts/r7-report.ts [--bridge <r5 pilot dir>] writes docs/staging/r7-numbers.md (spreads, the smallest difference each row can show, the control arms against the rules and the field, the scoring rule of prereg §8)
```

**Proposed addition to `AGENTS.md`, Architecture, the row "Kernel contract (stage R1)":** append "Stage R7
(`docs/staging/r7-prereg.md`; the defaults are today's behaviour): `kernelNullShare` (under `kernelSim` 1, the share of
decision points the null kernel takes, the rest going to the rules' own policy; default 1) and `kernelFocal` (1: the
in-tick kernel decides only for animals marked `controller: 'model'` with the model policy off; default 0)."

**Proposed row for `docs/simulation.md` §17** (after the row "What a kernel sees and the menu it faces (R2; off by
default)"; with it `tests/sim-params.test.ts` passes, 11 of 11):

```
| The control arms an engine must beat (R7; the defaults are today's behaviour) | `kernelNullShare` below 1 (default 1; read only under `kernelSim` 1): the rules with a share of choices random. At each decision point of a chimp the in-tick kernel drives, one coin from `world.rng`: below the share the null kernel decides, otherwise the rules' own policy; at 1 the null kernel always decides and at 0 the rules always do, with no coin drawn (bit for bit today's `kernelSim` 1 world and the rules world). After a random choice the rules' held intention is dropped. `kernelFocal` 1 (default 0): the in-tick kernel decides only for chimps whose `controller` is `'model'` while `world.modelPolicy.mode` is `'off'` (a harness marks a focal group; nobody waits), everyone else keeps the rules. Comparison layouts, never fitted (docs/staging/r7-prereg.md §2) | share (0–1); switch (0–1) | `kernelNullShare`, `kernelFocal` |
```

**Proposed bullet for `docs/simulation.md`, the list of kernel switches (after `kernelNoRulesPick`):**

```
- `kernelNullShare` below 1 (stage R7; default 1): under `kernelSim` 1 only that share of decision points goes to the
  null kernel (one coin from `world.rng`), the rest to the rules' own policy; `kernelFocal` 1 (default 0) restricts the
  in-tick kernel to chimps marked `controller: 'model'` with the model policy off. Control arms for engine
  comparisons ([staging/r7-prereg.md](staging/r7-prereg.md)).
```

**Commands the integrator may want next.** After the merge: `pnpm test` and `pnpm build` (not run here by the
tranche's rule). To put an engine arm beside the control arms, attach `cardStart` / `cardStep` / `cardFinish` and
`focalStart` / `focalAfter` / `focalFinish` to the arm's loop after each tick (they read only), write its file in the
shape of `ArmFile`, and add its name to the report. For a registered test on fresh seeds:
`pnpm exec tsx scripts/r7-card.ts run --seed 4111 --test-seed 4111 --unit F` (and 4222), then the report with
`--seeds 4111,4222 --dir <its own folder>`.
