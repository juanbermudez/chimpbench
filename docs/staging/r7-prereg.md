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
