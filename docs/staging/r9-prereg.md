# Stage R9: draw and hold (pre-registration)

Agent r9-draw-hold, branch `r9-draw-hold` from `track-e` dea2643. Registered 10 October 2026, 19:40 EDT, before any
code of this stage and before any arm. Specification: `IMPLEMENTATION_PLAN.md`, Track R, "User decisions (10 October
2026)" and "Stage R9". Read first: the review reports of 10 October (`check-verify_training_numbers.md` claims 2 to 4,
`attack-closed_loop_validity.md`, `attack-feasibility_and_sequencing.md`, `design-neuroscience_first.md` principles 3
and 8), `docs/staging/r5-gate-prereg.md`, and the precedent in the rules (stage E3d, `docs/staging/e3d-prereg.md` §8;
`src/sim/rg.ts`).

Every result of this stage carries the name **"rules-taught model on a rules menu"**. It makes no claim about wild
chimpanzees and no claim that one engine is better than another: it tests a decode.

**Why.** The loop applies the option the model rates highest. A hedged lean then becomes "never" or "always": the
first adapter puts 0.155 on a trip to food where the rules take one at 0.23 of draws, and the top pick takes it at
0.08. The user approved on 10 October, verbatim: "May the loop draw from the model's odds and hold the result, with
nothing fitted? I recommend yes." / "yes to all recomendations. Move forward with the implementation". The plan reads
it as: "a seeded draw from the kernel's probabilities at their own scale, held while the act lasts; no fitted
temperature, offset or class weight, ever."

**What is already known and limits what this stage can show** (fact-check and sceptics, 10 October):

- Drawing moves the first adapter's trip rate toward the rules and not all the way (first order, on the states the
  top-pick runs visited: 0.10 to about 0.17 of trip menus against the rules' 0.35 on seed 21).
- The first adapter learned a blend of fresh choices and kept acts (its trip probability is 0.155 on fresh draws and
  0.149 on kept rows; the pooled label rate is 0.155 to 0.159). With the gate on it is asked only where the rules
  draw, so **it must under-trip whatever the decode**. Intake is therefore a guard here and never a pass mark.
- A sceptic's offline replay found that a held draw is still overturned at 21 to 34% of re-asks with today's menus,
  and that the option chosen last is missing from the next menu at 24 to 28% of asks. So holding can fail, and this
  stage counts both.
- The same ten animals of seeds 21 and 5 have been read in three earlier rounds. Nothing is tuned on them here; the
  pass marks below compare decodes of one adapter with each other on the same animal-days.

No network, no outside model, no training and no model process by this agent: the model arms and the retraining are
launched later by the integrator, one model process at a time. No switch default changes; nothing in
`data/params.json` changes; the goldens and the field pin do not move.

## 1. The decode

A kernel returns a probability per option. Which option is applied is a step of the loop, not of the kernel
(`src/kernel/decode.ts`, pure; applied in `src/kernel/loop.ts` `answerWaiting` when the caller passes a decode step,
absent by default).

| Mode | What is applied |
| --- | --- |
| `top` | Today, and the default: the kernel's own pick, untouched (for a scoring kernel the first maximum of its probabilities, `scripts/lib/kernels.ts`). An arm with no decode step and an arm with `top` end on the same world. |
| `draw` | One seeded draw per ask from the probabilities at their own scale: `u = unit("draw", seed, salt, animal, decision version)`; the option where the running sum of `p / sum(p)` first passes `u`. |
| `held` | The option with the largest `ln p + g`, where `g = -ln(-ln(unit("held", seed, salt, animal, epoch, option key)))` is a standard Gumbel value. For one ask this is a draw from the same probabilities (the identity the rules' stage E3d used, `src/sim/rg.ts`). Inside one epoch the noise of an option never changes, so asking again cannot re-roll: another option wins only if the model's own odds move by more than the lead the winner had, or if a new option arrives with a larger sum. An option the model gives probability 0 can never win. |

- `unit(...)` is a stateless hash of its arguments to a number strictly inside (0, 1). It reads the world's seed and
  nothing else of the world: **it never touches `world.rng`**, so the simulation's own random stream does not depend
  on the decode.
- **Nothing is fitted.** The scale is the model's own (temperature 1). A decode setting is a mode and a salt, plus for
  `held` which of the two epoch definitions of §2 is used. There is no temperature, offset, prior, class weight or
  threshold anywhere in the decode, and a test asserts that the code has no such setting.
- **Option key.** `action:targetId`, the pair `applyDecision` re-checks legality by, so a held option keeps its noise
  when the menu's order changes. (Under `activityFirst`, not used in this stage, an entry of the first request stands
  for a kind and is keyed `kind/action:targetId`.)
- **The salt** separates repeats of one arm: two salts give two independent sets of draws on the same world.
- The decode acts between ticks on model-controlled animals. The two kernels that decide inside the tick (`kernelSim`)
  are not touched.

## 2. The epoch (defined in the harness for this first test; no simulation state)

The harness keeps, per animal and outside the world, the option the decode applied last and when. Two definitions:

**`act` (the main held arm).** A new epoch opens at an animal's first ask and afterwards at an ask where either

1. the choice applied last has been replaced: the animal's ongoing act (action and target) is no longer that option
   (it finished or stopped being legal, and the loop set the animal to rest while it waits; or the loop's gate turned
   an arrived trip into feeding at its tree), or the last ask was settled by the rules (a fallback); or
2. an interrupt has been recorded for the animal since that choice was applied (`sim.lastIntrAt`, written by
   `interrupt()` in `src/sim/events.ts`: an event the animal perceived).

It does **not** open at a scheduled bout end, at the gate's 30-minute maximum age, at a change of the gate's clock
period, when a need crosses into another bucket, or at the gate's patch test. Those re-asks meet the same noise, and
the animal's changed state can act only through the model's odds. The epoch's name is the decision version at which
it opened. Stated limits: (a) a trip and the meal at its tree are two epochs here (the rules' E3d passed the trip's
noise to the meal); (b) rest never ends by itself, so a held rest is re-opened only by an interrupt; (c) stage E3d
found that the rules' held noise froze feeding choices until a felt change re-opened the choice. Here the model is
still asked at those changes, so freezing would show as long epochs and as lost intake (the guard).

**`block` (the crude second arm the sceptic proposed).** The epoch is the half-hour block of the world's clock
(`floor(world.time / 0.5 h)`; design assumption, not a field number). All noise is re-rolled when the block changes,
whatever the animal is doing. It needs no knowledge of the act. If it does as well as `act`, an epoch defined by the
animal's own events has added nothing.

**Counted at every ask of an arm that has a decode setting** (the same tracker runs for `top` and `draw`, where it
changes nothing and only counts): whether the ask opened an epoch and why; whether the option applied last is on the
menu and where; and for a re-ask inside an epoch whether the applied option changed.

## 3. Determinism, receipts, replay

- The same world, kernel answers, mode and salt give the same choices: the decode is a pure function of what the
  receipt holds.
- Every receipt of an arm with a decode setting logs: the mode, the salt, the hold, the option keys (the menu), the
  kernel's probabilities and its own pick (as today), the draw `u` (`draw`) or the noise per option `g` (`held`), the
  epoch and why it opened, the position of the option applied last, and the option applied.
- A replay answers from the receipts with no model: the logged probabilities go through the same decode, which must
  give the logged option and the logged noise; the replay must end on the run's world hash, every day's hash equal.
  Differences are counted, not hidden.
- An arm without a decode setting writes the receipts it writes today, byte for byte.

## 4. Arms

World, animals and days are those of the R4b, R4c and R5-gate tests: base W50 (`M6-W50.json`) with `observeV4` 1 and
`menuParity` 1, seeds 21 and 5 (neither adapter was trained on them), 30 days of burn-in on the rules, then 5 days,
five focal animals per seed, the rest of each world on the rules, the state-only packet, the rules' pick kept on the
menu, **the gate on**. Adapters as saved: `r4-rules-state` (sha256 e09fd6f4…1932) and `r4c-rules-state` (f0827af2…9d1d).

| Step | Arms (per seed) | Model | Who runs it |
| --- | --- | --- | --- |
| 0. Reference | the rules and three re-draws, re-run; the saved top-pick arms of both adapters, gate on and off, replayed from their receipts through the new code with mode `top`. Each must end on its saved hash. They carry the new readouts and give the epochs of the saved runs to the offline replay of §7. | no | this agent |
| 1. Core | each adapter: `draw` (salt 1), `held` with the `act` epoch, `held` with the `block` epoch; the first adapter also `draw` with salt 2. Seven arms, then their replays. | yes | integrator |
| 2. Gate off (contrast; only if the night allows) | each adapter: `held` (`act`) with the gate off. It is the only arm that can say whether holding does the gate's work. | yes | integrator |
| 3. Second training seed in the loop | the retrained first recipe (§8), gate on, `top` and `draw` (salt 1) | yes | integrator, after §8 |

The saved top-pick arms are the reference for `top`; they are not run again with a model.

## 5. What is read (fixed now)

Per focal animal and day, simulation truth. A measure is averaged over an animal's days; two arms are compared on the
same animal-days (the mean over an animal's days of arm minus reference) with a 95% t interval over the ten animals
(the method of `scripts/r5-report.ts`).

1. **Act changes per animal-day**: ticks of the day at whose end the animal's act (action and target) differs from
   the act one tick before; whole day, measured after the loop's step, the same way in every arm. Changes of the kind
   of act are reported beside it.
2. **Trips to food begun and completed** (as in R5-gate).
3. **The share of held draws overturned**: of the re-asks inside an epoch with the held option on the menu, the share
   at which another option was applied. Beside it: the share of re-asks at which the held option was missing from
   the menu; re-asks and epochs per animal-day; why epochs opened. The same counts for `top` and `draw`.
4. **Asks per animal-day**, and **the ratio of asks with the gate off and on** (saved for `top`; for `held` only if
   step 2 runs).
5. **The spread between the two decode salts**: the paired difference between the two `draw` arms of the first
   adapter, per measure.
6. **Nights in a nest** (at least 90% of the dark minutes in a nest).
7. Guards: **energy eaten** (guard only, never a pass mark), reserves (% of the usual store a day), distance. Deaths
   are listed.

**Noise.** For a measure, the noise is the larger of (a) the size of the mean paired difference between the two
decode salts and (b) the largest mean paired difference of a rules re-draw from the rules arm. Two arms **differ** on
a measure only if their paired interval excludes 0 **and** the size of the mean difference is above that noise. One
pair of salts is a single draw of the salt spread, so (a) is a floor, not an estimate with an interval.

## 6. The rules (fixed now; none may change after an arm has run)

Per adapter, with `top` the saved top-pick arm of the same adapter, gate on.

**A decode does no harm** if all of these hold against `top`:

- H1 nests kept: nights in a nest no fewer than `top`'s less one (of 50), and the paired interval of the share of
  nights not wholly below 0;
- H2 switching not doubled: act changes per animal-day below twice `top`'s;
- H3 guards: energy eaten not lower than `top` by more than 5% of the rules arm's mean with a paired interval wholly
  below 0; reserves not differing downward from `top`; the mean distance not above `top`'s by more than the rules'
  spread across animals (the standard deviation of the rules arm's animal means).

**A decode does what it is for** if the first adapter, which under-chooses trips at `top` (2.3 begun a day against the
rules' 8.3), begins more trips with it than with `top` and the two differ (§5); and the third adapter, which
over-chooses them (13.9), does not begin more than at `top` beyond noise.

Then:

1. **Drawing becomes the standard decode** if `draw` does no harm for both adapters and does what it is for.
2. **Held noise is needed** if (i) `draw` fails H1 or H2 for either adapter and `held` (`act`) passes both for both
   adapters; or (ii) both do no harm, and `held` (`act`) makes fewer act changes than `draw` for both adapters, the
   two differing (§5), with its trips begun no further from the rules arm's than `draw`'s. In either case the
   mechanism must show: the share of re-asks at which the applied option changed is lower under `held` than under
   `draw` by the same count. If `held` wins without that, it is reported as unexplained and not as needed. If
   `held` with the `block` epoch does as well as `act` by the same tests, the result reads "a timer does as well":
   no epoch state is added to the simulation on this evidence.
3. **Neither helps** if `draw` and `held` both fail "does no harm" for either adapter (the top pick stays for the kind
   of act), or if neither moves the first adapter's trips begun beyond noise (no measurable effect at ten animals and
   five days: the top pick stays the default and the decode stays available as an option).
4. Otherwise (for example `draw` does no harm but does not do what it is for, while `held` does): reported as it
   fell, with no standard named.

**The gate-off contrast (step 2, if run), by the designer's own stop line:** holding does the gate's work for the
third adapter if with the gate off and `held` it begins at most 25 trips a day (53.9 with the top pick, 13.9 with the
gate on); above 25, holding alone does not remove the effect of being asked often with today's adapters and menus.
The asks ratio gate off to gate on is reported beside the saved one for `top` (1.8 and 3.2).

**What no outcome of this stage can show.** That a decode makes the animals more like wild chimpanzees (a noisier
chooser can move rows toward field values; stage R7's mixture arms are the control for that, and none is run here).
That intake is repaired (the first adapter must under-trip with the gate on). Anything past five days or outside ten
animals whose companions are on the rules.

## 7. The offline replay (predictions, not results)

`scripts/r9-held-replay.ts` applies `draw` and `held` to the probabilities saved in the receipts of the R4 and R4c
arms (seeds 21 and 5, gate off and on; read-only), with the decode module of §1, and reports first-order act changes,
trips begun and the share of re-asks that overturn a held draw. "First order" means: on the states the top-pick runs
visited; a different choice would have led to different states. It runs two epoch rules: the sceptic's (a new epoch
when the held option is missing from the menu or more than 60 minutes passed since the last ask), to reproduce or
correct his figures, and this stage's `act` and `block` epochs, with the epochs of the saved runs taken from step 0's
replays. Its table is added below as **predictions** before any model arm runs.

## 8. A second training seed (the spread no round has measured)

`scripts/r9-seed2.sh` retrains the first recipe unchanged (R4's training file, sha256 aa3fa4b5…6f3d, 3,122 labelled
rows; R4's settings: 3 epochs, learning rate 2e-4, batch 2 with 4 accumulated, LoRA r 16, alpha 32, dropout 0.05)
with training seed 11 instead of 7, as adapter `r4-rules-state-s2`, and scores it on R4's own held-out file. The seed
changes the adapter's initial weights, the dropout, the order of the examples and which of a row's two option orders
is shown in an epoch; the data are the same file.

Read offline, on the same held-out draws for both seeds (seed 21, 38 animals; intervals by bootstrap over animals):
agreement with the rules on draws (0.609 for seed 7); on day and dawn draws with a trip on the menu the mean
probability on the trip (0.155), the top-pick trip rate (0.084) against the rules' (0.231) and the trip AUC (0.770).

**What the spread means, said before the run.** Earlier rounds read these differences between recipes as results:
R4b against R4 on agreement, −0.037; R4c against R4 on the mean trip probability, +0.134. If the two seeds of one
recipe differ on a readout by as much as two recipes did, that comparison between recipes was not resolved by a
single run, and every later recipe needs at least two training seeds. If they differ by less than half of it, single
runs were adequate for differences of that size. In the loop (step 3) the two seeds' adapters are compared on trips
begun, act changes and the guards against the noise of §5.

## 9. Machine rules, iterations

One model process at a time; before each model load the run script writes the load and the swap in use, holds while
swap in use is above 6 GB (re-checked every minute for up to 30 minutes) and refuses to start while another model
worker or trainer of this project is running. Runs only from a committed head with a clean tree. A call that passes
120 s goes to the rules and is counted. At most 3 iterations: iteration 0 is step 0 and the offline replay (no
model); iteration 1 is step 1; one more is kept for a failed run or a defect, logged before it runs. The pass marks
of §6 do not change in any of them.

## 10. Iteration log and results

**Code delivered before any run** (commits 8deccbd, 99afb41, 4783e4f): `src/kernel/decode.ts` (the decode, pure),
the optional decode step of `src/kernel/loop.ts` `answerWaiting`, `scripts/lib/decoder.ts` (the epochs, the record of
every ask), `scripts/r5-pilot.ts` (an arm's decode, the receipt's `dec`, act changes and the decode's tallies per
animal-day), `scripts/r9-loop.ts` (the arms, step 0, the plumbing check), `scripts/r9-held-replay.ts` (§7),
`scripts/r9-report.ts` (§5 and §6 as functions with tests), `scripts/r9-run.sh`, `scripts/r9-seed2.sh`,
`scripts/r9-seed-spread.ts` (§8), `tests/r9-decode.test.ts`.

- **Iteration 0 (logged 10 October 2026, 20:06 EDT, before it runs; no model, this agent).**
  (a) `scripts/r9-run.sh dry`: the plumbing check on seed 48 (one day on the rules, then one day per arm, five focal
  animals): a kernel that is certain (the rules' top option, probability 1) and one with even odds (the null kernel),
  under `top`, `draw` (two salts), `held` with both epochs, gate on and off; every arm replayed from its receipts.
  It proves plumbing only; a kernel with even odds is a random chooser, so its rows say nothing about a model.
  (b) `scripts/r9-run.sh reference 21` and `reference 5`: step 0 of §4. (c) `scripts/r9-run.sh predict`: §7.
  Said before it runs, from a development run of (a) on an uncommitted tree: with even odds the `block` arm asked the
  kernel about three times as often as the others, because a brief act that the block's noise favours (a display) is
  chosen again as soon as it ends, until the half hour is over. That is a property of a hold that does not know the
  act has ended, and it is why `block` is the crude arm; it is not changed here.

- **Amendments, logged 10 October 2026, 20:20 EDT, before any model arm.** None changes a rule of §6.
  - **A1, a readout added: "re-rolled".** For a held arm, the re-asks inside an epoch at which the applied option
    changed to an option that was on the animal's previous menu while the model's odds had not moved its way (ln p of
    the new option less ln p of the old one no larger than at the previous ask). By §1 this cannot happen; the count
    is printed for every held arm and every replay, and anything but 0 is a defect.
  - **A2, a third epoch offered as exploratory: `whole`.** The first pass of the offline replay (iteration 0, below)
    showed that under the `act` epoch most asks open a new epoch, about half of them at an interrupt, so a held draw
    rarely meets a re-ask. The plan's words are "held while the act lasts"; an epoch that opens at every interrupt is
    shorter than the act. `whole` is the act through interrupts: an event the animal perceived asks again under the
    same noise, and the epoch opens only when the act was replaced, at an arrival or after a fallback. It is an
    option of the harness and a column of the offline replay; the receipt of an ask that an interrupt opened now also
    says whether the act had been replaced, and step 0 is re-run to record it (the worlds cannot change). It has no
    rule: if an arm is run with it, it is reported as exploratory. This amendment was written after seeing the first
    offline numbers, which is why it adds a column and not a pass mark.
  - **A3, a wiring check added** (`scripts/r9-run.sh wire`): the model arms' own code path (worker process, guarded
    scorer, GLiNER kernel with the state-only packet, receipts, decode, replay) against a fake worker that holds no
    model (`scripts/lib/fake-worker.mjs`), on the plumbing check's world.

