# Stage R7b: three no-model things the sceptics asked for before more training nights (pre-registration)

Agent r7b-forks, branch `r7b-forks` from `track-e` a11c45c. Registered 11 October 2026, 03:00 EDT, before any run of
this stage's code. Specification: the review of 10 October 2026 (`attack-closed_loop_validity.md`, stage 0 items 4
and 5, cross-cutting points 3 and 4, decisive experiments 3 and 4; `attack-hidden_hand_coding_and_rules.md`, stage 2;
`attack-feasibility_and_sequencing.md`, decisive experiment 7), `IMPLEMENTATION_PLAN.md` "User decisions (10 October
2026)" (still open there: "whether the simulation's own body outcomes in forked worlds may be a label source
(deferred until Stage R7's repeat test is in)"), and `docs/staging/r7-prereg.md` §13a (amendment A1).

**No model, no training, no tokenizer, no network call by any script.** Simulations on one processor core, one
process at a time. Nothing under `src/` changes in this stage: no new switch, no new parameter, no new world key.

## 0. Why

Three things were promised or asked for before another training night is spent, and none needs the model.

1. The scoring rule was amended on 11 October (`r7-prereg.md` §13a): "closer to the field" is the distance outside
   the band, judged against the best rules-plus-random arm by more than the row's smallest difference. The report
   script still applies the rule as first registered (distance to the middle of the band), under which a noisier
   chooser counts as closer on rows the rules already satisfy.
2. Two of the four designs want labels from forked worlds: copy the world at a decision point once per option, force
   the option, let the rules run on, and score what happened to the animal's own body. The sceptics doubt the score
   repeats: the simulation has one random stream, so forks share no random numbers, and the same animal's day differs
   by 70 to 184 kcal between re-draws. The user has not allowed this label source; this test informs that ruling.
3. Three of the four designs want a learned "will I still be doing this in half an hour" question. The sceptics say
   its only teachers are the rules' own timers.

Standing rules that bind the stage: field numbers are targets, never inputs; nothing is fitted to a field rate or to
the rules' rates; outputs of outside models are never labels; the compressed golden hashes, the field pin and the
protocol hash do not move (nothing under `src/`, `data/targets.json` or `data/params.json` is edited).

## 1. Part one: the amended scoring rule in the report

**What changes in `scripts/r7-report.ts`.** One measure is added and the engine section is re-pointed at it:

- `outside(band, v)`: the distance of a value outside its band, in the row's own units: `lo − v` below the band,
  `v − hi` above it, 0 anywhere inside (the edges count as inside). A band open on one side has no distance on that
  side. For an anchor that is one value (the Taï half-hour shares) the band has no width and the distance outside it
  is the distance to the value, as before.
- Section 6 (the two parts of the short scorecard): beside the value and the registered distance to the middle of the
  band, the distance outside the band of the rules' mean, of random choice and of each mixture; and which control
  arms are closer than the rules by the amended measure (both realizations' distance outside the band smaller than
  the rules' mean's by more than D).
- Section 8 (the rule with this run's numbers): per row and unit, the distance outside the band of the rules' mean,
  of random choice's mean and of each mixture's mean; the best of that family; D; and **whether an engine could be
  shown closer at all**: only where the best of the family lies outside the band by more than D, and then with a
  value whose distance outside the band is below (the best arm's distance − D). Where the rules' mean is inside the
  band the line says so: an engine there can only stay inside ("not worse") or leave. The middle of the band and the
  registered distance to it stay in the table as description.
- Section 12 (engine arms, only with `--engine`): "closer" is read by the amendment: every realization of the engine
  has a distance outside the band smaller than the best family arm's by more than D, with all five guards holding;
  beside it one of "inside the band, as the rules are (not worse)", "left the band", "outside, not closer". The
  value, the middle and the registered distance are still printed.
- Nothing else of `r7-prereg.md` §8 changes: values per row, no sums, no pass counts, the five guards, energy eaten
  not a guard. The spreads, D, "told from the rules" and every other section are untouched.

**Source of the numbers.** The saved per-run JSON of stage R7 under
`/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r7-card/artifacts/r7` (64 arm files and `tai.json`; read only;
nothing is written there). The report reads arm files and never a burn-in file, so the refusal the merge note
describes (saved burn-ins made with the older parameter registry) should not apply. If the report cannot read them,
the registered arms are re-run in this worktree (about an hour of one core) and the results say so.

**Checks that can fail.**

- P1a. Before the edit, the unchanged script regenerates `docs/staging/r7-numbers.md` from the saved runs to the
  committed text but for its dated line (so the saved runs are the ones behind the committed numbers).
- P1b. After the edit, every line of the regenerated file outside sections 6 and 8 and the dated line is unchanged.
- P1c. Unit tests (`tests/r7b-report.test.ts`): the distance outside a band is 0 inside and on the edges and linear
  outside; an arm that moves toward the middle of a band the rules are already inside is never "closer"; on a row
  with the rules inside the band the report says an engine cannot be shown closer; an engine is "closer" only when
  every realization beats the best family arm by more than D and the guards hold; `tests/r7-engine.test.ts` still
  passes with its section-12 assertions moved to the amended wording.

**Written before the run (to be checked, not to be met).** The review of R7 said (`r7-prereg.md` §14.3) that scoring
by the distance outside the band would leave four rows at the population unit on which an engine can be closer than
the rules at all (T-ACT-2, T-FOOD-2, T-SOC-14, T-SOC-6), and that on three of them the 10% mixture already is. The
regenerated tables either show that or the difference is reported.

## 2. Part two: do forked outcomes carry signal?

### 2.1 Worlds and decision points

**Base.** The working base `docs/staging/integrator-kit/params/M6-W50.json` (a swallowed share of 0.5; not a claim
about chimpanzees), field profile, `observeV4` 1 and `menuParity` 1, as `scripts/r7-card.ts` builds it. Seeds 48 and
7 (development seeds). Burn-in 30 simulated days on the rules, made in this worktree and kept under `artifacts/r7b/`;
its hash is printed beside stage R7's (4b5cc61f8ad797e0, d9604068dec350b1), which it should equal while every
default is today's behaviour.

**The parent.** One rules world per seed, continued from the burn-in for five days (days 31 to 35), never salted and
never written by the harness. It is run twice (identical runs): once to list the eligible decision points, once to
stop before each sampled tick.

**Eligible decision point.** A decision of the rules' own policy (`src/sim/rg.ts` `rgTap`) in that window by a living
animal aged 15 or over, in daylight (`environment.daylight` ≥ 0.5), at which the rules drew afresh (the tap's reason
is a draw trigger; not `kept`, `arrived`, `lead`, `phase` or `argmax`) from a menu of at least two options. The
first such decision of an animal in a tick counts. Fresh draws only, because a kept act is not a point at which a
kernel would be asked under the loop's gate, and the review asked that labels come from fresh draws.

**Sample.** Per seed, the 100 eligible points with the smallest sampling hash
`sha256("r7b-fork:" + seed + ":" + tick + ":" + animal)` (never `world.rng`): 200 points, the **main sample**. A point
that cannot be prepared (below) is dropped, counted with its reason, and replaced by the next in hash order.

**The "which food" supplement.** A food option is an option of kind `feed` (feeding here) or `food-trip` (a trip of
the animal's own to a food tree). If fewer than 60 points of the main sample hold two or more food options on the
menu a kernel would see, eligible points whose tapped menu holds two or more food options are added in hash order,
per seed alternately, until 60 are reached or 100 were added or the lists are exhausted. At an added point only the
food options are forked, and it is read for the "which food" question only.

### 2.2 The fork

For a sampled point (tick T, animal A):

1. **Fork base.** The parent, stopped before tick T, is copied (`structuredClone`). In the copy A is marked
   model-controlled with the lockstep policy and tick T is run once. Up to A's decision point the copy is the parent
   bit for bit; at the decision point A is parked instead of deciding (it goes on with its act for that one tick, or
   rests if the act has ended: `src/sim/decide.ts` `decisionPoint`), as every between-tick kernel of the engine tests
   parks its animals. The point cannot be prepared if A is not waiting after that tick.
2. **Menu.** The request a kernel would be sent now (`requestFor`: `buildRequest` under `menuParity` 1, so the rules'
   own bounded menu, at most eight options). Fewer than two options: the point cannot be prepared. Recorded beside
   it: the option the rules took at this decision in the parent (matched by action and target; "not on the menu" if
   absent) and the rules' top-scored option (`rulesIndex`).
3. **Forcing an option.** For each option and each replicate the fork base is copied again; the option is applied by
   `applyDecision` at the request's decision version with source `rules`; the animal's held intention is set to that
   act by the function the rules' own policy calls after a draw (`src/decide/gate.ts` `intentOf` with the option's
   variant); the animal and the policy are set back to the rules. **How long the option is forced:** exactly as long
   as the rules' own gate would hold an act the rules had drawn themselves (until an interrupt, a need passing into
   another word, a change of period, the 30-minute maximum age, the act's end or a poor patch); from the first
   re-opening on, the rules decide everything again. No option is held longer than the rules would hold it. An option
   `applyDecision` refuses is recorded as "not applicable" and takes no part.
4. **Replicates.** Eight per option, salts 1 to 8, each mixed into the copy's random stream after the option is
   applied: `rng = mixSeed(rng XOR salt × 0x9e3779b1)` (`scripts/r7-card.ts` `salted`). Replicates of one option
   differ in nothing else. Every option of a point uses the same eight salts.
5. **Horizon.** Each fork runs 1,440 ticks (6 simulated hours) under the rules; the body is read after 720 ticks (3 h)
   and after 1,440 (6 h), so one fork serves both horizons.

**The parent is never touched**: its hash after the second run equals its hash after the first, and equals a plain
run with no tap and no fork (checked for each seed and printed).

### 2.3 The score (fixed now; nothing in it is chosen after a run)

Five terms, each the distance of one body state from its set point divided by the tolerance range the state's own
mechanism already defines. All five are read from the animal's own state in the fork (`chimp.sim`), by the
mechanisms' own functions where they exist.

| Term | State | Distance from the set point | Divided by (the mechanism's own range) | Constants read (registry) |
| --- | --- | --- | --- | --- |
| reserve | `sim.en.res`, body energy relative to the set point 0 | max(0, −res): a surplus is no distance | the usable store, at whose loss the animal starves: `reserveCap` = `ledgerReserveKcalPerKg` × body mass (`src/sim/energy.ts` `relDeficit`) | `ledgerReserveKcalPerKg` (1,300 kcal/kg, assumed) and the mass function's |
| the day's shortfall | `sim.en`, the energy still to find before the next chance to feed (reserve deficit, less what the gut still yields, plus expected spending over the waking time left and the fast after it) | that need, 0 if negative | what the animal can eat in the waking time left; capped at 1 (`src/sim/energy.ts` `deficitDrive`, the packet's `deficit`) | none new: the drive's own (stage E1e) |
| water | `sim.wat.def`, mL of body water missing | max(0, def) | the deficit at which thirst is full: `waterThirstFullPct` % of body mass | `waterThirstFullPct` (2 % of body mass, [L]) |
| sleep | `sim.slp`, sleep pressure (process S) | S above the waking threshold, floor 0 | the distance from the waking threshold to the sleep-onset threshold, cap 1 (`src/sim/circadian.ts` `thresholds`; the sleep latch is not read, so being asleep is never a cost) | `circHLower` 0.17, `circHUpper` 0.67, `circAmp` 0.12, `sleepDriveShift` (the range is 0.5 at any clock phase) |
| heat | `sim.heat`, stored heat (+) or heat debt (−) | its absolute value | already divided by its mechanism: the heat the body tolerates, `rhythmHeatCapJ` × `rhythmHeatTolC` | `rhythmHeatCapJ` 3,470 J/kg/°C, `rhythmHeatTolC` 1.5 °C (assumed) |

**D** = the Euclidean length of the five terms (the square root of the sum of their squares; every weight is 1).
**The score of a fork at horizon H is D at the fork minus D at H** (the drop in D; larger is better). D at the fork is
the same for every option and replicate of a point, so options are ranked by −D at H. This is the score proposed in
`design-neuroscience_first.md`, principle 1 (reward as the reduction of the distance of the internal state from its
set point: keramatiGutkin2014, `docs/research.md`), with the five scales it names. No social term, no stress, no
field number, and no number chosen by this stage: the list of constants above is complete.

**Beside the score, never in it.** A fork in which the animal dies before H has no score at H: it is counted (per
option) and left out of the means. Injury (the change of `chimp.injury` and of `chimp.health` from the fork to H) is
recorded per fork and reported per option kind.

**Score variants (a sensitivity table, not a tuning step; all read from the same forks).**

- Ten scale variants: each of the five terms in turn multiplied by 2 (its tolerance range halved) or by 0.5 (doubled).
- Two form variants at the registered scales: minus the mean of D over the ticks of the horizon (the time average),
  and minus the mean over those ticks of the sum of the squared terms (the form of `design-learning_first.md`,
  restricted to these five states).

None of the variants replaces the registered score, whatever they show.

### 2.4 Readouts

Two questions, read separately, at each horizon.

- **Kinds ("feed here, rest or go")**, on the main sample. Every option on the menu is forked. An option's kind is
  the family of `scripts/em-sample.ts` `familyOf` (feed, food-trip, rest, nest, drink, affiliative, social-move,
  care, greet, aggression, mating, call, travel-home, other). The winner of a set of replicates is the option with
  the highest mean score in that set (ties to the first on the menu); the winning kind is that option's kind.
- **Which food**, on the points (main sample and supplement) whose menu holds two or more food options: the same
  among the food options only.

For each: 

- **Repeat, R.** The share of points at which the winner of replicates 1 to 4 is the winner of replicates 5 to 8: the
  winning kind for the first question (and, beside it, the winning option), the winning food option for the second.
  Also the mean of the same over all 35 ways of splitting the eight replicates in two sets of four. Beside R, what
  options with identical outcome distributions would give: 1 ÷ (number of options), and for kinds the sum over kinds
  of (the kind's share of the menu)², averaged over the points. A 95% interval from 2,000 bootstrap resamples of the
  animals (a seeded generator; an animal's points stay together).
- **Distinguishable.** A point has a distinguishable winner when the difference between the eight-replicate means of
  the winner and the runner-up (for kinds: the best option of any other kind) exceeds 2.145 standard errors (t at
  0.975 with 14 degrees of freedom; standard error √((s₁² + s₂²) ÷ 8)). Because the winner is picked after the
  fact, the share this test fires on pure noise is measured too: at each point the scores are shuffled among the
  options 200 times and the test repeated; the mean is printed as the noise rate.
- **Horizon.** Everything at 3 h and at 6 h, and the share of points whose eight-replicate winner at 3 h is the
  winner at 6 h.
- **The rules.** The share of points at which the eight-replicate winner is the option the rules took in the parent,
  and their top-scored option; the same by kind; beside 1 ÷ options. Among points with a distinguishable winner, the
  share at which the rules' own option is distinguishably worse than the winner (the same test). The kinds of the
  winners beside the kinds the rules took.
- **Which body state decides.** Per term: the share of its variance at H that lies between options rather than
  between replicates (one-way analysis of variance within a point, averaged over points), and R if the score were
  that term alone.
- **Variants.** Per variant: the share of points whose eight-replicate winning kind differs from the registered
  score's (same forks, same replicates, so no replicate noise is in the comparison), on all points and on the points
  whose registered winner is distinguishable; the shares of winning kinds under each variant.
- **Cost.** Milliseconds per world copy, per fork of 6 h, and per labelled decision point (options × replicates), at
  eight and at four replicates and for a 3 h horizon; forks in which the animal died; options not applicable.

### 2.5 Registered readings (fixed now; each can fail)

- **F1, repeat.** For a question at a horizon, R below 0.70 means labels made from four replicates are noise there
  (the sceptic's line: "below about 70% repeat, labels are noise and a model sampled from them is a random chooser").
- **F2, the narrower claim.** Where F1 fails, labels could still be made on the points where an option stands out,
  if all three hold: R among the points with a distinguishable winner is at least 0.70; those points are at least
  half of the sample; and their share is more than twice the measured noise rate. Otherwise the question is noise at
  this grain.
- **F3, the exchange rate.** The score is called an exchange rate in disguise if any of the ten scale variants
  changes the winning kind at more than 10% of the points whose registered winner is distinguishable (on all points
  of the main sample if fewer than 30 are distinguishable). The 10% line is this test's own assumption, fixed now.
- **F4, worth a ruling.** A question at a horizon is put to the user as a possible label source only if F1 or F2
  holds there; the result names the question and the horizon. If F3 fires for the kinds question, the result says
  that a ruling for it would be a ruling on five hand-set scales.
- No reading is made from a comparison of the winners with a field number, and none of the rules' rates is a target
  for the winners: agreement with the rules is description.

**Written before the run (from the code; to be checked, not to be met).** (a) For kinds, R will be below 0.70 at
both horizons. (b) The reserve term will carry almost nothing: half an hour of feeding moves it by about 200 kcal
in a store of 40,000 to 50,000. (c) The shortfall term will often sit at its cap of 1 in every fork of a point
(under the circadian gate the drive's estimate of the waking time left collapses, as stage E1t found), and then
ranks nothing. (d) Water will decide where a drink is on the menu and heat on hot hours; sleep will rank nothing by
day (every waking option raises it alike). (e) "Which food" will repeat no better than kinds: what a tree gave is
made up within hours by the rules' continuation. (f) A 6 h horizon from an afternoon point ends in the dark, where
the options have converged on a nest.

### 2.6 Limits, said now

Two seeds and one season (days 31 to 35). The continuation policy is the rules, so a fork measures an option's worth
to an animal that goes on behaving as the rules do. The option is held by the rules' gate, at most 30 minutes
without a re-draw. The menu is the rules' bounded menu (one feeding option on almost every ask), so "which food" is
read on few and unusual points. The animal waits one tick before the option starts, as in every engine test. An
animal sampled several times contributes dependent points (the bootstrap resamples animals). The distinguishability
test is a t test on eight values per option. Nothing here says whether a model could learn such labels from a packet.

## 3. Part three: can state predict staying?

### 3.1 Moments and labels

**World.** The base of §2.1 plus `observeV5` 1 (the animal's own experience recorded from the first tick, so that
its record of trips, crowns and grooming is filled; the switch changes nothing the rules read), seeds 48 and 7, 30
days of burn-in on the rules, then days 31 to 35 and half an hour more. Rules only; nothing is forked: the label is
what the animal went on to do under the rules.

**Eligible moment.** The end of a tick in that window at which an animal aged 8 or over (`rgMinAge`: those a kernel
would drive) is alive, awake (not in a finished nest) and in daylight (≥ 0.5). **Sample:** per seed the 1,000
eligible moments with the smallest hash `sha256("r7b-stay:" + seed + ":" + tick + ":" + animal)`: 2,000 moments.

**Label.** "Still in this act without a break 30 simulated minutes later": 1 if at the end of each of the next 120
ticks the animal is alive and its action and target are those of the moment. Beside it, as description only, the
same on the kind of act (the family) in place of action and target.

### 3.2 Features (only what a packet could carry; fixed now)

Read by `observe()` at the moment (pure; the context packet 5 is written from) and from the sampler's own note of
the decision that began the act. Nothing reads the scheduled end of the bout, the age of the held intention, any
score or rate of an option, or the rules' reason sentence.

- **(a) the kind of act**: one indicator per family (a family with fewer than 20 moments is pooled into "other").
- **(b) minutes already in it** (`own.doing.minutes`, the act's own clock): log(1 + minutes), and indicators of the
  bands under 2, 2 to 5, 5 to 10, 10 to 20, 20 to 30 and 30 or more minutes, alone and crossed with each family that
  has at least 100 moments.
- **(c) packet features**, in four groups:
  - *body*: hunger, thirst, fatigue (1 − energy), loneliness (1 − social), stress; from `body`: reserves, deficit,
    need (kcal ÷ 1,000), gut fill, hindgut fill, sleep pressure, sleepiness, water deficit, stored heat and heat debt;
    light level and its trend; rain; air temperature;
  - *companions*: party size, adult males in the party; among the listed individuals (at most eight): how many are
    feeding, resting, moving, grooming, in another act; how many are leaving (`away`); how many act toward the focal
    animal (`toMe`); the distance of the nearest; whether the partner of the focal animal's own act is listed, and
    whether that partner is doing the same act;
  - *the reason the act began*: the packet's `asked` at the decision that began the act, as indicators (a perceived
    event; the previous act's own end; a drive that passed into another word; the light; none of these; or the act
    began before the window);
  - *own foraging returns and timing*: `lately.eating` (and whether it is present), the mean and the last of
    `lately.trips` (and whether present), `lately.crowns`; hours since its last aggression (capped at 24; and whether
    any is on record).

### 3.3 Fit and comparison

A logistic regression per model, written for this stage (`scripts/lib/r7b-stats.ts`) and tested on synthetic data:
features standardised on the training part, a ridge penalty of 1 on every weight but the intercept (no tuning; 0.1
and 10 are printed as description), Newton steps to convergence. **Held-out animals:** five folds by animal (the
animals sorted by a hash of seed and id and dealt in turn), so every moment is predicted by a model that never saw
its animal. Out-of-fold predictions are clipped to [10⁻⁶, 1 − 10⁻⁶].

Reported for the base rate, (a), (b), (c) and (b) plus each group alone: the log-loss (nats per moment) and the AUC
on the out-of-fold predictions, and for each difference a 95% percentile interval from 2,000 bootstrap resamples of
the animals (seeded).

**Registered reading (it can fail either way).** (c) beats (b) when the interval of [log-loss of (b) − log-loss of
(c)] lies wholly above 0. If it does not, a stay question would be a timer in weights and should not be trained. If
it does, the size is given as a share of what (b) gains over the base rate, with the groups that carry it; a gain
that is told from zero but small is said to be small. The same is printed for the description label.

**Written before the run (to be checked, not to be met).** The kind of act and the minutes will carry most of what
can be predicted; the packet features will add little beyond bootstrap noise, except the companions' group (an
animal's act is most often broken by a companion leaving or calling: 73% of interrupts).

### 3.4 Limits, said now

The label is the rules' own continuation in a rules world: it can show that state predicts the rules' staying, not
that it predicts a wild animal's. A linear model on hand-listed features is a floor on what a packet could carry,
not a ceiling; a text model might read more. About 76 animals; moments of one animal overlap in time.

## 4. What is published

`docs/staging/r7b-numbers.md`, generated by `scripts/r7b-report.ts` from the JSON under `artifacts/r7b/` (no number
typed); `docs/staging/r7-numbers.md`, regenerated by the amended `scripts/r7-report.ts` from stage R7's saved runs;
and in §7 below a plain verdict on each of the three questions: is the amended score in the report; are forked
outcomes repeatable enough to be worth a ruling from the user, and for which question; should a stay question ever
be trained.

## 5. Checks and tests

`tests/r7b-report.test.ts` (part one, §1). `tests/r7b-forks.test.ts`, on a small built world of the working base
(seed 48, the field map, a short warm-up): a fork with the same salt gives the same outcome and the same world hash,
another salt another world; the forced option is the animal's act after it is applied and its held intention; making
a fork base and forks leaves the parent's hash unchanged; the score and its variants on hand-made body states; the
repeat, distinguishability and variant readouts on hand-made scores with known answers. `tests/r7b-stay.test.ts`: the
label on a hand-made sequence of acts; the logistic fit recovers known weights on synthetic data and its log-loss
and AUC match hand-computed cases; the folds keep an animal's moments together; the feature reader on a built world
gives finite numbers and leaves the world's hash unchanged. Also run: `tests/r7-engine.test.ts`, `tests/r7-card.test.ts`,
`tests/sim-track-e.test.ts` (the field pin), the golden test, `tsc --noEmit`, `gen-params --check`. Not run, by this
stage's rule: the whole suite and the build.

## 6. Iterations (at most 3; each logged here before its run)

**Iteration 1** (11 October 2026, 03:00 EDT): the design above.

## 7. Results

(To be written after the runs.)

## 8. For the integrator

(To be written after the runs.)
