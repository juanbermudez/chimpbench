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

### 10.1 Iteration 0, what ran (10 October 2026, 20:06 to 20:27 EDT; no model, no training, one process at a time)

Disclosed first: before this file's iteration-0 entry was written, one saved arm (`trained-gate`, seed 21) was replayed
once through the unchanged `scripts/r4b-loop.ts` at 19:36 (9 s) to learn whether saved runs still reproduce at
`track-e` dea2643. It ended on its saved hash. And the plumbing check was first run on an uncommitted tree while the
code was written. Neither is counted below.

- **(a) The plumbing check, seed 48** (`scripts/r9-run.sh dry`; last run at head 027ec29, clean tree; table in
  `docs/staging/r9-dry.md`). All registered properties hold: 12 of 12 kernel arms replay from their receipts to their
  run's world, with 0 receipts whose decode the replay did not reproduce; mode `top` ends on the world of the same arm
  with no decode step, pick for pick; a certain kernel is the same world under `top`, `draw` and `held`; two decode
  salts give two worlds; no held draw was re-rolled by a re-ask (0 in every held arm). What the even-odds kernel
  showed about the mechanics, and only that (it is a random chooser, not a model): at a re-ask inside an epoch the
  applied option changed at 76 to 82% of asks under `draw` and `top` and at 6.4% under `held` for the act, every one
  of those by an option new to the menu; the `block` arm asked the kernel 215 times a day against 57 to 75 in the
  other gate-on arms (a brief act chosen again as soon as it ends, as said before the run); and with odds that never
  move a held animal ate 906 kcal against 1,612 with the top pick: nothing can overtake a held draw when the kernel
  does not answer to state, which is the freezing stage E3d met.
- **(b) The wiring check** (`scripts/r9-run.sh wire`, head 638341e): the model arms' own path against a fake worker
  that holds no model: the worker's handshake, 298 and 380 scored calls, receipts with packet hash and token count,
  2 of 2 replays reproducing run and decode.
- **(c) Step 0, seeds 21 and 5** (`scripts/r9-run.sh reference`; first at head f021124, again at 99d2186 after
  amendment A2; clean tree). **16 of 16 arms end on their saved hashes**: the rules and three re-draws on each seed,
  and the saved top-pick arms of both adapters, gate on and off, replayed from the model's own receipts through the new
  loop code in mode `top` (for example `trained-gate` 852664c2… and 35e2405a…, `r4c` gate off 16a2bf51… and
  b061d097…). So `top` is today, byte for byte, on real receipts. The reference values of the new readouts
  (`docs/staging/r9-numbers.md`; saved runs, not new results): act changes per animal-day 47.6 for the rules (re-draws
  44.1, 49.0, 45.6), 33.6 for the first adapter and 51.5 for the third with the gate on, 48.7 and 128.0 with it off;
  asks gate off to gate on 1.79 and 3.21; noise from the rules' re-draws alone: act changes 3.6, trips begun 0.64,
  energy eaten 36 kcal, distance 0.77 km.
- **(d) The offline replay** (`scripts/r9-run.sh predict`; `docs/staging/r9-offline.md`), §10.2.

Machine: 1-minute load between 2.4 and 8.7 at every check; **swap in use 6.9 to 7.2 GB of 8.2 GB** (20:05 and 20:29).
The run scripts hold a model step while swap in use is above 6 GB, so a model night started in this state would wait
up to 30 minutes and then load anyway: a restart before it is advisable.

### 10.2 Predictions registered before any model arm (first order; from `docs/staging/r9-offline.md`)

"First order" as in §7: on the asks, menus and probabilities of the saved top-pick runs. None of this is a result.

**The sceptic's figures are reproduced, with one correction.** By his rule a held draw is overturned at 20 to 24% of
re-asks for the first adapter and 26 to 34% for the third (his 21 to 25% and 27 to 34%). His script gave new noise to
an option that left the menu and came back inside an epoch; with that one line changed it gives these figures (checked
on his script). His trip counts reproduce (third adapter, gate off: 42.9 and 31.8 trips begun a day under the held
draw against 63.2 and 44.0 with the top pick; gate on 9.8 and 9.5). The option picked last is missing from the next
menu at 24 to 30% of asks for the first adapter and 40 to 46% for the third; but **inside an epoch of this stage it is
missing at 2.5 to 3.1% of re-asks**: it is mostly gone because the act ended or an event came, and those asks open a
new epoch here. Stable option names are not what limits holding.

**What limits holding is how often the animal is asked in an unchanged act, and how far the model's own odds move.**
With the gate on, 41% of the first adapter's asks and 27% of the third's are re-asks inside an `act` epoch (22.3 and
16.8 a day); the rest follow an act that was replaced (14.6 and 16.8 a day) or an interrupt (16.3 and 28.4). At those
re-asks, with the option applied last still on the menu, the applied option changes at:

| | top pick (as run) | `draw` | `held`, `act` |
| --- | --- | --- | --- |
| first adapter, gate on | 29.2% | 32.7% | 23.3% |
| third adapter, gate on | 41.8% | 44.3% | 33.7% |
| first adapter, gate off | 22.7% | 33.2% | 19.8% |
| third adapter, gate off | 22.9% | 31.5% | 20.8% |

The model's top pick itself changes at a quarter to four tenths of asks in an unchanged act, so a held draw is
overturned almost as often as a fresh one changes.

**Predicted for the arms** (per animal and day, both seeds pooled; draws and held draws are means over 30 decode
salts, the range across salts in brackets; "act changes" here are changes of the applied option between asks, a count
on receipts and not the loop's own count of §5.1):

| Saved arm | | top pick | `draw` | `held`, `act` | `held`, `block` | `held`, `whole` (exploratory) |
| --- | --- | --- | --- | --- | --- | --- |
| first adapter, gate on | trips begun | 2.3 | 4.7 (4.2 to 5.1) | 4.4 (3.9 to 5.2) | 4.4 (3.8 to 4.8) | 4.4 (3.9 to 5.1) |
| | act changes | 29.8 | 34.4 (33.4 to 35.4) | 32.5 (31.8 to 33.4) | 30.6 (29.6 to 31.6) | 30.4 (29.4 to 31.2) |
| third adapter, gate on | trips begun | 13.8 | 11.8 (11.3 to 12.2) | 11.6 (11.0 to 12.1) | 11.3 (10.7 to 11.7) | 11.2 (10.6 to 11.9) |
| | act changes | 42.7 | 47.4 (46.7 to 48.2) | 46.0 (45.1 to 46.9) | 42.9 (41.7 to 43.6) | 43.0 (42.3 to 43.7) |
| first adapter, gate off | trips begun | 4.0 | 8.6 (7.7 to 9.3) | 8.1 (7.3 to 8.7) | 7.7 (6.7 to 8.6) | 7.9 (7.0 to 8.5) |
| third adapter, gate off | trips begun | 53.6 | 42.7 (41.7 to 43.5) | 42.3 (41.4 to 43.3) | 41.5 (40.2 to 42.6) | 41.3 (40.1 to 42.3) |

Read against §6, before the run:

1. **Drawing is predicted to do what it is for and not all the way**: the first adapter's trips begun about double
   (2.3 to 4.7) and stay well short of the rules' 8.3, as the fact-check said they must; the third adapter's fall
   toward the rules (13.8 to 11.8). The predicted change for the first adapter (+2.4) is several times the noise
   from the rules' re-draws (0.64) and the range across salts.
2. **Switching is predicted to rise by 11 to 15% under `draw`** (34.4 against 29.8; 47.4 against 42.7), far from the
   doubling of H2. Nests, intake, reserves and distance cannot be predicted from receipts.
3. **Holding for the act is predicted to be hard to tell from drawing with the gate on**: about two act changes a day
   fewer (32.5 against 34.4, salt ranges touching) with the same trips. So statement 2 of §6 ("held noise is needed")
   is predicted **not** to be met, and the likely outcome is "drawing becomes the standard decode" if it does no harm.
4. **With the gate off, holding is predicted not to do the gate's work**: the third adapter would still begin about
   42 trips a day (stop line 25). Only 14% of that run's asks are re-asks inside an epoch; 73 a day follow a replaced
   act and 94 an interrupt. Holding through interrupts (`whole`) does not change the prediction (41.3).
5. **The `block` arm** is predicted to overturn about as often as `act` (26% and 32% with the gate on) and may ask far
   more often than the estimate below (the plumbing check).

These can be wrong in the loop for one stated reason: a different choice changes the states that follow.

**Estimated model time** (the saved arms' own model seconds, `docs/staging/r9-offline.md` §3; first order, so an arm
that changes acts more often may take longer): one new arm on both seeds takes about 30 minutes for the first adapter
and 27 for the third with the gate on, 45 and 119 with it off. Step 1, seven arms: about 3 h 20 min (the first four
arms of the script's order, both adapters' `draw` and `held`: 1 h 54 min; with the second salt 2 h 24 min). Step 2:
about 2 h 44 min. Step 3: about 1 h, after the retraining (the first seed's manifest: 2 h 11 min of training inside
2 h 23 min of wall time) and its scoring (about 11 minutes by the review's estimate; not timed here). Replays take
seconds.

### 10.3 Checks at the end of this agent's work (no model process was started at any point)

`tests/r9-decode.test.ts` 10 tests, 10 pass (the decode's draws match the probabilities; `top` passes the kernel's
pick through; nothing to fit, by the setting's shape and a scan of the code; a held draw survives a re-ask, a new
menu order and a wider menu, and is overturned exactly when a rival's ln p + g passes it; the loop's step; the three
epochs and a saved and restored decoder; determinism, salts, receipts and replay in the loop; the day's readouts;
the offline walk; the rules of §6; the fake worker). `tests/kernel.test.ts` 15 of 15 (unchanged file; it holds the
goldens through the kernel interface), `tests/r5-pilot.test.ts` 5 of 5, `tests/r4b.test.ts` 8 of 8,
`tests/r2-packet.test.ts` 19 of 19. `tsc --noEmit` clean; the stage's scripts and test also pass a strict type check
run on them directly (`tsconfig.json` covers `src/` only); `gen-params --check` clean (1,046 entries; no parameter
was added). Under `src/` the stage adds `src/kernel/decode.ts` and an optional argument to `answerWaiting`; nothing
under `src/sim` or `data/` changed, so the goldens and the field pin cannot have moved (`tests/sim-track-e.test.ts`
was not run for that reason; the whole suite and the build are the integrator's at the merge).

**Not done, exactly:** no model arm (steps 1 to 3); no retraining; no result on any registered rule; the `whole`
epoch has no rule and no arm was run with it; the decode is not wired into the app or into the two kernels that
decide inside the tick; `activityFirst` with a decode step is keyed apart in code and has no test in the loop.

### 10.4 Review by a second agent (10 October 2026, 20:35 to 21:05 EDT; before any model arm; no model process)

A second agent read the whole diff, re-ran the no-model checks and tried to break the decode. **No rule of §6 was
changed.** Its commits on this branch are the ones titled "R9 review".

**Re-run and reproduced** (head 01cf588, clean tree, outputs in a scratch folder, one process at a time):

- The plumbing check on seed 48: the same end hashes and the same table as `docs/staging/r9-dry.md` (only the head
  and the wall-clock seconds columns differ). The wiring check: 298 and 380 calls, 2 of 2 replays.
- Step 0 on seeds 21 and 5: 16 of 16 arms on their saved hashes. Beyond the hashes, all 21,015 receipts of the eight
  saved model arms are equal to the replayed ones field by field, apart from the new `dec` record and the timing.
- `docs/staging/r9-offline.md`, `r9-numbers.md` and `r9-seed2-numbers.md` regenerate to the same figures. A second
  first-order replay written from scratch (another language, another random generator) agrees with every cell it
  recomputed (trips begun, act changes and the share changed at a re-ask, four saved arms) to within 0.2.
- The sceptic's own script, run on the saved receipts, gives his figures; with the two changes named in
  `r9-offline.md` §1 it gives this stage's.
- The hash behind the noise: even and uncorrelated across decision versions, salts, animals, seeds and neighbouring
  option keys (200,000 values each), and a held draw's first ask matches the probabilities on an eight-option menu.
- The training file `r9-seed2.sh` would use: 3,200 records, 3,122 labelled, the registered hash.

**Corrected.**

- The offline table called the last column of its first table "the held option is missing"; it is the option the
  **top pick** applied last, in the saved run. The table now says so and prints the share by epoch rule and decode.
  So the sentence of §10.2, "inside an epoch of this stage it is missing at 2.5 to 3.1% of re-asks", holds for the
  `act` epoch on the top-pick runs. Inside a **half-hour block** the option applied last is off the menu at 26 to
  47% of re-asks (the act ends before the half hour does), so for the `block` arm "overturned" is read on the
  remaining re-asks only, and "stable option names are not what limits holding" is a statement about the `act`
  epoch. No registered figure changed.
- The offline note named one difference from the sceptic's script; there are two (the second: he counted an act
  change at every epoch opening). His overturned shares and trip counts needed only the first.
- `scripts/r9-run.sh wire` now unsets `MGOGO_DECIDE_SERVER`, and the wire arms refuse to run with it set: with that
  variable the worker class joins a shared model server instead of starting the fake worker.
- Tests added: a run stopped and resumed in the loop (the world and the decoder's notes through JSON) is the
  uninterrupted run, and is not when the notes are lost; the no-knob scan also reads the loop's step and the arms'
  file; the two cases below. `tests/r9-decode.test.ts` is now 11 tests.
- Checks at the end of the review: `tests/r9-decode.test.ts` 11 of 11, `tests/kernel.test.ts` 15 of 15,
  `tests/r5-pilot.test.ts` 5 of 5, `tests/r4b.test.ts` 8 of 8, `tests/r2-packet.test.ts` 19 of 19; `tsc --noEmit`
  clean, and a strict type check of the stage's scripts, its test and the scripts that import `scripts/r5-pilot.ts`;
  `gen-params --check` clean (1,046 entries). The whole suite and the build stay the integrator's.

**Found and left open** (each needs a decision or more than a repair):

1. **The statements of §6 can contradict each other, and the registration does not order them.** (a) Statements 1
   and 2 can both read yes (drawing qualifies as the standard and holding also switches less by rule 2 ii): which
   decode is then adopted is not said. (b) Statements 2 and 3 can both read yes: rule 2 i reads only nests and
   switching, so holding can be "needed" while it fails a guard and drawing fails too; or holding switches less than
   drawing while neither moves the first adapter's trips. The report now prints a line naming either case and, for
   (b), names no standard. Settle the order before step 1 runs, as an amendment logged here. The reviewer's suggestion,
   which is not a registered rule: "does no harm" comes first (3 overrides 2), and 2 refines 1.
2. **A held draw does not hold under `activityFirst`.** Measured with a fake kernel on seed 48 (1,400 ticks, five
   animals): with `activityFirst` 1 none of 257 asks was a re-ask inside an epoch,
   because the key noted for the applied entry stands for a kind and never equals the animal's act; with 2, the two
   requests of one decision share one draw. No arm of this stage uses it. Stage R10 must keep `activityFirst` 0 with
   `draw` or `held` until a kind has a key of its own (`scripts/lib/decoder.ts` says so).
3. `scripts/r9-run.sh dry` and `report`, and `scripts/r9-seed2.sh offline` and `report`, rewrite committed tables.
   A model step refuses a tree that is not clean, so commit the regenerated tables before the next model step.
   *Changed at the merge of 11 October 2026:* the run scripts now write the generated tables under
   `artifacts/r9/tables` (git ignores it; `R9_TABLES` moves it), so the tree stays clean and the launch order below runs
   from a frozen checkout with no commit in between. `scripts/r9-run.sh publish` copies the tables into `docs/staging`
   once the runs are over. What is measured, and what each table holds, is unchanged.

### 10.5 Amendment A1 (the integrator, 11 October 2026, 02:46 EDT; logged before any model arm)

The review (§10.4, item 1) found that the statements of §6 can read yes together and that no order was registered.
No rule of §6 changes. This amendment only fixes which statement names the outcome when two read yes, and which arms
run first. The report prints each statement as it falls; the order below is applied when the result is read.

1. **Statement 3 by its first route wins over everything.** If `draw` and `held` (`act`) both fail "does no harm"
   (H1 to H3) for either adapter, the top pick stays. A decode that fails a guard is never named the standard or
   "needed", also when it passes nests and switching; that it passed them is reported.
2. **Statement 3 by its second route wins over statement 2.** If neither decode moves the first adapter's trips begun
   beyond noise, the top pick stays the default, and a difference in act changes between `held` and `draw` is reported
   as an observation only: no epoch state is added to the simulation on it.
3. **Statements 1 and 2 together:** the user's approved design is a draw that is held (10 October). So where `draw`
   qualifies as the standard and `held` is also "needed" with its mechanism shown, the held draw is the standard if it
   also does what it is for by the same test as `draw`; if it does not, the plain draw is the standard and holding is
   reported as an option that lowers switching.
4. Statement 1 alone, statement 2 alone and statement 4 read as registered. Under statement 2 alone the held draw is
   named the standard only if it does no harm in full (H1 to H3) and does what it is for; otherwise the result is
   reported as it fell.

**Arms and order.** First the five arms that answer statements 1 to 3 and give the spread between two decode salts,
on seeds 21 and 5: `r4-draw-1`, `r4-held`, `r4c-draw-1`, `r4c-held`, `r4-draw-2`. The two half-hour arms (`r4-block`,
`r4c-block`) are deferred: they may take about three and a half times their estimate (§10.4), and they decide only
the clause "a timer does as well". Until they run, that clause is reported as not tested and no epoch state is added
to the simulation either way. The gate-off contrast (step 2) is not run in this first pass. Then the second training
seed (§8). These arms are the fourth read of the same ten animals on seeds 21 and 5: nothing from them is reported as
more than a decode comparison under the name "rules-taught model on a rules menu".

## For the integrator

**What to launch, in order** (one model process at a time; each step holds while swap in use is above 6 GB and
refuses while another process runs under the model runtime's interpreter; a model step needs a clean tree):

```sh
scripts/r9-run.sh check                         # pre-flight, starts nothing: folders, adapter hashes, swap, other model processes
scripts/r9-run.sh reference 21 && scripts/r9-run.sh reference 5 && scripts/r9-run.sh predict   # 4 minutes, no model; only if artifacts/r9/loop is not in the checkout the arms run from (it is gitignored and sits in this worktree)
mkdir -p artifacts/r9/logs
scripts/r9-run.sh core 21 > artifacts/r9/logs/core-21.log 2>&1    # about 1 h 40 min: r4-draw-1, r4-held, r4c-draw-1, r4c-held, r4-draw-2, r4-block, r4c-block, then their replays
scripts/r9-run.sh core 5  > artifacts/r9/logs/core-5.log 2>&1
scripts/r9-run.sh report                        # artifacts/r9/tables/r9-numbers.md: the tables and the statements of §6 (the tree stays clean: nothing to commit before the next model step)
scripts/r9-seed2.sh prepare && scripts/r9-seed2.sh train > artifacts/r9/logs/seed2-train.log 2>&1 && scripts/r9-seed2.sh offline   # about 2 h 35 min; artifacts/r9/tables/r9-seed2-numbers.md
scripts/r9-run.sh seed2 21 && scripts/r9-run.sh seed2 5 && scripts/r9-run.sh report            # about 1 h
scripts/r9-run.sh gateoff 21 && scripts/r9-run.sh gateoff 5 && scripts/r9-run.sh report        # optional contrast, about 2 h 45 min
scripts/r9-run.sh publish                       # once, at the end: the generated tables copied into docs/staging, to be committed
```

A shorter night: `scripts/r9-run.sh arms <seed> r4-draw-1,r4-held,r4c-draw-1,r4c-held,r4-draw-2` (about 1 h 12 min a
seed) answers statements 1 to 3; the `block` arms can follow. A model step cut short before its replays:
`scripts/r9-run.sh replay <seed> <arms>`. Exploratory arms with no rule: `r4-whole`, `r4c-whole`, `r4c-whole-free`.
`R9_SAVED` and `MGOGO_FT_ROOT` default to this checkout's `artifacts/` and, failing that, to the `r4b-retrain`
worktree's (read only). **Swap in use was 7.2 GB of 8.2 GB at 20:29: restart the machine before the model night.**

**The decode for `r10-night` (one small module, one interface).** `src/kernel/decode.ts` is the pure decode:
`decode({ mode: 'top' | 'draw' | 'held', salt }, { seed, chimpId, version, epoch }, keys, probabilities, kernelIndex)`
returns `{ index, u? , g? }`; `optionKey(option)` is the stable key. A harness does not call it directly; it uses
`scripts/lib/decoder.ts`:

```ts
const dec = newDecoder({ mode: 'draw', salt: 1, hold: 'act' });          // hold: 'act' | 'block' | 'whole'; one decoder per run
tickWorld(world);
const results = await answerWaiting(world, kernelOf, { decode: dec.step(world) });
for (const r of results) { const record = dec.settle(world, r); /* write it into the receipt as `dec`; null when the kernel was not asked */ }
// checkpoint between passes: save dec.snapshot() (plain JSON) beside the world; resume: newDecoder(spec, saved)
```

`settle` must be called for every result of a pass, in order. The decoder keeps its notes outside the world, so a
resumed run needs the snapshot or its held draws and its counts will differ from an uninterrupted run (`draw` picks do
not depend on the notes; `held` picks do). A replay passes the same setting and a kernel that answers the logged
probabilities; `decodeDiffers(run, replay)` and `heldBreaks(receipts)` (both must be 0) are in `scripts/r5-pilot.ts`
and `scripts/r9-loop.ts`. For the night on seed 48 the decode this stage's rules will have named is not known yet;
until step 1 is read, `top` (no decode step) is the only setting with a saved reference.

**Likely conflicts at the merge.** `scripts/r5-pilot.ts` (this stage adds `ArmSpec.decode`, `Receipt.dec`,
`decodeDiffers`, `DayRow.changes`, `kindChanges` and `dec`, and six lines in `runArm`): textual conflicts with any
branch that adds readouts there (`r7-card`, `r7-ledger`, `r10-night`); both sides should be kept. `src/kernel/loop.ts`
(the `DecodeStep` type, `opts.decode`). No fixture, golden, parameter or shared document was touched.

**Proposed lines for the shared files.**

`IMPLEMENTATION_PLAN.md`, Stage R9, **Status**:

> Built on branch `r9-draw-hold` (10 October 2026; agent-reported, awaiting the integrator's review and merge; no
> model arm run; `docs/staging/r9-prereg.md`, tables in `docs/staging/r9-offline.md`, `r9-numbers.md`, `r9-dry.md`,
> `r9-seed2-numbers.md`). The decode is a step of the loop, absent by default (`src/kernel/decode.ts`, applied by
> `answerWaiting` when a caller passes one): `top` (today), `draw` (a seeded draw from the kernel's probabilities as
> they are) and `held` (the largest ln p + Gumbel noise fixed by seed, salt, animal, epoch and option key). It has no
> temperature, offset, prior or weight, and a test asserts that; its noise is a stateless hash and never reads
> `world.rng`. The epoch of a held draw is defined in the harness (`scripts/lib/decoder.ts`): the animal's act
> (opening when the act was replaced, at an interrupt or after a fallback), the half-hour block, or, exploratory, the
> whole act through interrupts. Without a model: the saved top-pick arms of both adapters, gate on and off, and the
> rules arms replay through the new code to their saved hashes on seeds 21 and 5 (16 of 16); the plumbing check on
> seed 48 and a wiring check against a fake worker pass (every replay reproduces its run and its decode; no held draw
> re-rolled). **Predictions registered before any model arm (first order, from the saved probabilities; not
> results):** with the gate on, drawing lifts the first adapter's trips begun from 2.3 to about 4.7 a day (the rules
> 8.3) and lowers the third's from 13.8 to about 11.8, with act changes up 11 to 15%; 41% and 27% of asks are re-asks
> inside an epoch, where a held draw is overturned at 23% and 34% (a fresh draw changes at 33% and 44%, the top pick
> itself at 29% and 42%), so holding is predicted to be hard to tell from drawing; with the gate off the third adapter
> is predicted to begin about 42 trips a day under a held draw (stop line 25). The sceptic's figures reproduce with
> one correction (20 to 24% and 26 to 34% overturned; inside an act epoch the option applied last is missing from the
> menu at 3% of re-asks on the top-pick runs, not 24 to 28%; inside a half-hour block at 26 to 47%). Reviewed by a
> second agent before any model arm (prereg §10.4): the no-model checks, the saved hashes and every table reproduce;
> open for a decision before step 1: the registered statements can contradict each other (1 with 2, 2 with 3) and
> the registration does not order them; a held draw does not hold under `activityFirst`. Not done: the model arms (about 3 h 20 min for the core, 2 h 45 min for the gate-off
> contrast), the retraining with a second training seed (about 2 h 35 min with scoring) and its loop test (about 1 h);
> `scripts/r9-run.sh` and `scripts/r9-seed2.sh` run them one model process at a time.

`AGENTS.md`, Commands (two lines):

```sh
scripts/r9-run.sh dry | wire | check | reference <seed> | predict | report | core <seed> | gateoff <seed> | seed2 <seed> | arms <seed> <a,b,…> | replay <seed> <a,b,…>   # stage R9 (docs/staging/r9-prereg.md): the loop's decode step (src/kernel/decode.ts: the top pick, a seeded draw from the kernel's probabilities, a draw whose noise is held for an epoch; nothing fitted; scripts/lib/decoder.ts holds the epoch and writes each ask into the receipt) on the burned-in worlds of R4b's loop test; dry and wire are no-model checks on seed 48 (wire: the model path against scripts/lib/fake-worker.mjs); reference replays the saved top-pick arms through the new code (each must end on its saved hash); predict is the offline replay over saved probabilities (scripts/r9-held-replay.ts, predictions only); the model steps run one worker process at a time with the swap hold and refuse while another model process is alive; report writes docs/staging/r9-numbers.md with the registered statements (scripts/r9-report.ts)
scripts/r9-seed2.sh prepare | train | offline | report   # stage R9 §8: the first recipe (R4's training file, checked by hash) retrained with training seed 11 as r4-rules-state-s2 under artifacts/decide-ft/r9, scored on R4's held-out file; scripts/r9-seed-spread.ts prints the seeds and the earlier recipes side by side (joined by position: the R4 score files name a tick's second decision by the first one's id)
```

`AGENTS.md`, Architecture, the row "Kernel contract (stage R1)", appended to its rule:

> Stage R9 (`docs/staging/r9-prereg.md`): which option is applied is a decode step of the loop, not of the kernel
> (`src/kernel/decode.ts`: `top`, `draw`, `held`; pure, nothing to fit, never `world.rng`), passed to `answerWaiting`
> as `decode` and absent by default; the epoch of a held draw is the harness's (`scripts/lib/decoder.ts`).

`docs/simulation.md` §17: **no rows.** The stage adds no entry to `data/params.json` and no switch: the decode is an
option of a harness, and the block epoch's half hour is a constant of `scripts/lib/decoder.ts` (design assumption).

`HANDOFF.md`, next steps: "R9: run `scripts/r9-run.sh core 21`, `core 5`, `report`; then `scripts/r9-seed2.sh`;
read `docs/staging/r9-numbers.md` against `docs/staging/r9-prereg.md` §6 and §10.2."

**Decisions that are the user's or the integrator's.**

1. After step 1 is read: adopt the decode the registered statements name (the prediction is plain `draw`), and only
   then decide whether an epoch belongs in the simulation's state; on the predictions it does not.
2. Whether to spend 2 h 45 min on the gate-off contrast, predicted to say that holding does not do the gate's work.
3. These arms are the fourth read of the same ten animals of seeds 21 and 5; the sceptic asked that the seeds be
   retired to development and fresh ones named for anything that follows.
4. The act epoch opens at an interrupt (the brief's example); the plan's words are "held while the act lasts". The
   `whole` epoch is the other reading, offered without a rule; the offline replay predicts little difference.
5. Before step 1 runs: the order of the statements of §6 where two read yes together (§10.4, item 1). It is a rule
   about the pass marks, so it is logged as an amendment before any arm, or left as "no standard is named".

