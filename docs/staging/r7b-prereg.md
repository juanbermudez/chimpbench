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

*Before the launch of part two* (03:11 to 03:16 EDT): one smoke check of `scripts/r7b-forks.ts` with a dirty tree and
scratch output (seed 48, three points of one day, `artifacts/r7b/smoke`), used only to debug the script; no number of
it is reported. It made the 30-day burn-in of seed 48, whose hash is stage R7's (4b5cc61f8ad797e0). Seen in it and
said now, since it bears on reading the result: replicates of one option held the forced act for the same number of
ticks in almost every case (the rules' bout lengths and their evaluation jitter are hashes, not draws from the random
stream), so a salt changes little in the first minutes of a fork and replicates part later, through companions and the
world. Nothing in the design was changed after it. One assumption of the registration was wrong and is corrected
here before any result: with more than two options the distinguishability test fires on shuffled scores less often
than its nominal level, not more (the runner-up is the closest of the rest); the measured noise rate stays the
reference, as registered.

**Iteration 2 of part two** (11 October 2026, 03:26 EDT; logged while iteration 1 was running and before any of its
numbers was read; what is known is the smoke check above and the code). *Why.* The rules' own evaluation noise is
not in the random stream: the candidate jitter (`src/sim/candidates.ts`, span 0.24) and the bout lengths
(`src/sim/execution.ts` `boutHours`) are hashes of the animal's id and its decision count. A salt mixed into the
stream therefore re-draws the world around the animal and nothing the animal itself adds, and every replicate of an
option carries the same jitter while their decision counts keep step. Two options, though, start different acts, so
their decision counts and with them their jitter part ways: a difference between options can then be repeated by all
eight replicates and still be an accident of the hash, which no reader of a packet could learn. Iteration 1 cannot
tell that from signal. *What.* The first 60 points of each seed's main sample in hash order (120 of the 200; chosen
by the sampling hash, not by any result), every option, eight replicates, on the same parents. A replicate's salt s
is mixed into the random stream exactly as in iteration 1 **and** moves the forked animal's decision count by
1,000,003 × s before the option is applied, so its jitter and bout lengths are drawn again in every replicate
(`scripts/r7b-forks.ts --own-noise`; with the flag off the script is iteration 1's, and a test pins both). The
score, the horizons, the readouts and the readings F1 to F3 are unchanged and are read on these forks as well,
beside iteration 1 restricted to the same 120 points. *The rule, made stricter now:* a question at a horizon is put
to the user as worth a ruling (F4) only if F1 or F2 holds for it in iteration 1 **and** in iteration 2. *Written
before the run:* where iteration 1 repeats above chance, iteration 2 will repeat less; and the eight-replicate
winner will differ between the two sets of forks at a share of points well above what replicate noise explains.
*Limit:* moving the decision count also changes one comparison an unweaned infant makes with its mother's count
(`src/sim/execution.ts`, the infant asks to suckle again once), a perturbation of the size of the salt's own.

## 7. Results (11 October 2026, 03:00 to 05:01 EDT)

Every number below is copied from [r7b-numbers.md](r7b-numbers.md), which `scripts/r7b-report.ts` generates from the
JSON under `artifacts/r7b/` and from stage R7's saved arm files, or from [r7-numbers.md](r7-numbers.md), regenerated by
the amended `scripts/r7-report.ts`. No model, tokenizer or training process was started; nothing under `src/`, `data/`
or the shared documents was edited. Simulations ran one process at a time on one core.

**What ran.** Part one: the report on the 64 saved arm files of stage R7 (no simulation). Part two, iteration 1:
9,672 forks on 200 decision points, 03:16 to 04:22 EDT at head 2993759 (1.05 hours of one core); iteration 2: 4,908
forks on the first 60 points of each seed, 04:25 to 04:53 EDT at head f447df8. Part three: 2,000 moments, 04:22 to
04:24 EDT at head f447df8 (73 s). In part two each parent world was run four times per seed and iteration (plain,
with the tap, with the fork bases prepared, with the forks made) and ended on one hash every time; in part three the
world read by the taps and by `observe()` ended on the plain run's hash, and after the burn-in the rules had read the
same of a world with the animal's own record as of one without. The two burn-ins of part two have stage R7's hashes
(4b5cc61f8ad797e0, d9604068dec350b1): the parents are the worlds of the first engine test.

### 7.1 Is the amended score in the report? Yes

`scripts/r7-report.ts` now measures "closer to the field" as the distance outside the band (0 anywhere inside) in
sections 6, 8 and 12, with the value, the middle of the band and the first registered distance kept beside it as
description, and `docs/staging/r7-numbers.md` is regenerated from the saved runs. No arm was re-run: the report reads
arm files and never a burn-in, so the refusal named in the merge note did not apply.

- P1a held: before the edit, the unchanged script regenerated the committed numbers but for the dated line. P1b held:
  after it, every line outside sections 6 and 8 and the dated line is unchanged. P1c: `tests/r7b-report.test.ts`
  (4 tests) and `tests/r7-engine.test.ts` (2; its section-12 assertions moved to the amended wording) pass.
- **At the population unit the rules' mean is inside the field band on 11 of the 15 rows** (T-ACT-1, T-ACT-4, T-ACT-3,
  T-RNG-4, T-ENE-3, T-RHY-1, T-RHY-4, T-RHY-5, T-RHY-6, T-COM-1, T-SOC-10): there no engine can count as closer, it
  can only stay inside or leave. The rules are outside it on four, as the review of R7 said: T-ACT-2, T-FOOD-2,
  T-SOC-14 and T-SOC-6.
- On three of those four the rules with 10% of choices random are already inside the band and closer than the rules
  by more than D (T-ACT-2, T-FOOD-2, T-SOC-14). An engine cannot be shown closer there either: nothing lies outside
  a band by less than an arm that is inside it.
- **That leaves one row of the fifteen on which an engine could be shown closer at the population unit: T-SOC-6**
  (pant-grunts to the top males: the rules 0.470, the best arm 0.478, the band 0.6 to 0.9, D 0.118), and only with a
  value less than 0.004 outside the band, which in practice means inside it. **At ten animals for five days there is
  no such row**: of the 12 rows read there the rules are inside the band on 10, and a mixture or random choice is
  inside it on the other two.
- On the card's own anchors the rule leaves room: patch residency at both units (a mean visit above 21.34 minutes at
  the population unit and above 23.17 at ten animals, against the rules' 20.79 and 20.56), and three of the four Taï
  half-hour shares at the population unit.
- Reading for later stages: on the short scorecard, "closer to wild chimpanzees than the rules" is now a claim
  almost no engine can make. What the scorecard can say of an engine is "not worse" (it stayed inside the bands the
  rules are inside) or "it left the band". The timing rows, the guards and "told from the rules" are unchanged and
  remain the instruments.

### 7.2 Are forked outcomes repeatable enough to be worth a ruling? No, for neither question

**The registered reading fails everywhere** (`r7b-numbers.md` §2.3; the line was a repeat of 0.70):

| Question | Horizon | Points | Repeat: the winner of replicates 1 to 4 is the winner of 5 to 8 | If the options did not differ | A winner told from the runner-up | Repeat there |
| --- | --- | --- | --- | --- | --- | --- |
| kinds of act | 3 h | 200 | 0.39 (0.32 to 0.46) | 0.23 | at 0.18 of points | 0.95 |
| kinds of act | 6 h | 200 | 0.34 (0.26 to 0.41) | 0.23 | at 0.10 | 0.90 |
| which food | 3 h | 130 | 0.66 (0.57 to 0.74) | 0.50 | at 0.24 | 1.00 |
| which food | 6 h | 130 | 0.58 (0.49 to 0.66) | 0.50 | at 0.13 | 1.00 |

- **F1 fails** for both questions at both horizons. For kinds of act, the option that looks best for the animal's
  body in one set of four replicates is of another kind in the other set at six points in ten.
- **F2 fails** too. Where one option does stand out it repeats (0.90 to 1.00), and the test fires on shuffled scores
  at only 0.012 (kinds) and 0.03 (food), so those points are real. They are a tenth to a quarter of the sample, not
  the half that was registered.
- **Iteration 2: most of what repeated was the animal's own frozen noise** (`r7b-numbers.md` §2.9; the animal's
  hashed evaluation jitter and bout lengths drawn again in every replicate; 120 of the points, both iterations read
  on the same points and options). For kinds of act after 3 h, repeat falls from 0.46 to 0.27 (0.19 to 0.35), which
  is what options that do not differ would give (0.26), and the share of points with a distinguishable winner from
  0.15 to 0.06. After 6 h repeat is 0.36 and 0.35. The eight-replicate winner of one set of forks is the winner of
  the other at 0.38 of points after 3 h and 0.33 after 6 h. F1 and F2 fail here as well. For "which food" only 15
  points are left (0.67 and 0.60), because a re-drawn jitter takes options off the list of legal ones: of the 79
  points whose menu held two food options, 15 keep both in all eight replicates. So which trip is offered at all
  hangs on the same hash.
- **F4:** by the rule fixed before iteration 2 (the line met in both iterations), and already by iteration 1 alone,
  no question at either horizon is worth a ruling as a label source at this grain.
- **"Which food" turned out to be "feed here or go".** All 130 points hold feeding here beside one trip to a food
  tree; no menu holds two trips of the animal's own (*review:* three of the 200 hold its own trip beside a joint trip
  to another tree, the kind `social-move`). Which of several trees cannot be read on the rules' menu at all, so the
  sceptic's advice to start with "which tree" cannot be followed without a wider menu. *Review (§7a.4, numbers
  §2.8b):* and "go" was seldom carried out. A forced trip to food ended in an arrival at its tree in 39 of 131 forks;
  in 88 the rules' gate re-opened the choice first, mostly on an interrupt, and the rules drew another act. The
  question read here is "feed here" against "set out, then do what the rules draw next".
- **Three hours against six.** The winning kind after 3 h is the winning kind after 6 h at 0.34 of points (0.58 for
  food): the label changes with the horizon about as much as with the replicate set.

**Is the winner just the rules' pick? No, and it is not anything else recognisable either.** The eight-replicate
winner is the option the rules took at 0.20 of points after 3 h and 0.16 after 6 h; picking at random gives 0.18.
The winners' kinds follow what the menus offer, not what the rules take: affiliative options are 23% of the menus
and 17% of the winners (the rules take them at 9% of points), aggression 12% and 11% (6%), rest 16% and 16% (31%), a
nest 1% and 1% (6%). A display or a charge "wins" one point in nine because the body score cannot see what it costs:
an injury was added in 76 of 1,136 forks that began with an aggressive act, against 57 of 1,520 that began with rest
(injury and death are beside the score, as registered; no animal died in any of the 14,456 forks read: *review:* 124
of the 14,580 made belong to options iteration 2 left out, and their outcomes were not kept). Where the winner
is distinguishable and is not the rules' option, the rules' option is told worse at 22 of 29 points after 3 h.

**Which body state decides** (§2.6, §2.7). The energy reserve never does: counted double or half, it changes no
winner at any of the 200 points (the term differs between options, 0.40 of its variance at 3 h, but half an hour of
feeding moves a store of tens of thousands of kcal by thousandths of its range). Each of the other four scales,
doubled or halved, changes the winning kind at 0.06 to 0.13 of all points after 3 h and 0.06 to 0.17 after 6 h, but
at 0.00 to 0.05 (3 h) and 0.00 to 0.10 (6 h) of the points whose winner is distinguishable: the scales turn over
near-ties.

- **F3, as registered.** After 3 h (read on the 37 distinguishable points) the largest change is 0.05: the score is
  not called an exchange rate. After 6 h only 20 points are distinguishable, so the reading falls on all 200 as
  registered, and there the largest change is 0.17 (water counted double), above the line of 0.10: **by the
  registered reading the score is an exchange rate in disguise at 6 h.** Said plainly: where there is a clear winner
  the five scales hardly matter; everywhere else they decide, because everywhere else there is nothing to decide.
  Had a ruling been in order for kinds of act after 6 h, it would have been a ruling on five hand-set scales.
- **The form of the score matters far more than its scales** (registered for the table, not for F3). Reading the
  body as its average over the horizon instead of its state at the end changes the winning kind at 0.60 of points
  after 3 h and 0.55 after 6 h, and at 19 of the 37 points whose winner is distinguishable. A label that turns over
  at half its clearest points on a choice nobody has ruled on is not yet a quantity.

**Cost** (§2.2). A world copy with the option applied takes 39 ms and six simulated hours of a fork 352 ms: 0.39 s a
fork on a shared machine. A labelled decision point (6.0 options) costs 9.5 s of one core with four replicates and
19.0 s with eight; about 5.3 s with four replicates and a 3 h horizon (an estimate: half the ticks). Forks are as
cheap as the feasibility sceptic measured; cost is not what rules them out.

**What this means for the ruling.** Recommended answer to the question left open on 10 October: **no** to body
outcomes in forked worlds as a label source, as designed in the review (a few replicates, 3 to 6 hours, this score).
For the kind of act the labels are noise: once the animal's own evaluation noise is drawn again they repeat at
chance after three hours. They do not agree with the rules and do not replace them with anything recognisable (a
body score that favours a charge as often as the menu offers one), and half of the few clear winners turn over with
the form of the score. Not shown by this test, and so not claimed: that no outcome label could work. A narrower
proposal would have to bring (1) labels only where an option stands out, with replicates that also re-draw the
animal's own noise (iteration 2 found such a winner at 7 of 120 points); (2) a ruling on end state against time
average before any run, with a reason; (3) injury in the label or as a veto; (4) a menu that offers more than one
tree before "which tree" is asked; and (5) a score for the question asked: read on the energy reserve alone, "feed
here or go" repeated at 0.82 after 3 h and 0.72 after 6 h on the 90 and 87 points where that term varies (the
generous replicates of iteration 1; a description, not a registered score, and no reason yet to trust it).

### 7.3 Should a stay question ever be trained? It would not be a timer in weights; what it could learn is small, narrow and rules-taught

2,000 moments of 76 animals; 0.22 were still in the same act 30 simulated minutes later (rest 0.29, feeding 0.16,
grooming and other affiliative acts 0.25, a trip to food or a move with others 0.00). On held-out animals
(`r7b-numbers.md` §3.3):

| Model | Log-loss, nats per moment | AUC |
| --- | --- | --- |
| the base rate alone | 0.5213 | 0.486 |
| (a) the kind of act | 0.4976 | 0.608 |
| (b) the kind and the minutes already in it | 0.5008 | 0.611 |
| (c) those and the packet features | 0.4751 | 0.731 |

- **The registered reading: (c) beats (b) beyond bootstrap noise.** A gain of 0.0257 nats, 95% interval over
  animals 0.0064 to 0.0446; the AUC rises by 0.121 (0.091 to 0.148). By the rule fixed before the run, a stay
  question would **not** be a timer in weights.
- **The minutes in the act carry nothing.** (b) is no better than (a): −0.0032 nats (−0.0112 to 0.0057). The share
  still in the act half an hour later is 0.27 in an act's first two minutes and 0.21 after thirty. The rules' bout
  lengths are hashed and their gate re-draws on events, so the act's own clock says almost nothing about when it
  ends. The sceptics were right about the teacher (the rules) and wrong about the timer.
- **The gain is small.** 0.0257 nats is 4.9% of the base rate's log-loss, about as much again as the kind of act
  gains over the base rate (0.0237). A reader of these features ranks a staying moment above a leaving one 73 times
  in 100.
- **Which features carry it** (each group added to (b) alone): the animal's own foraging returns and timing 0.0189
  (0.0079 to 0.0296) and what companions are doing 0.0118 (0.0021 to 0.0225), both beyond noise; body words 0.0104
  (−0.0049 to 0.0246), not beyond noise in log-loss though they lift the AUC by 0.081; the reason the act began
  −0.0018 (−0.0062 to 0.0027), nothing. The largest weights are sleep pressure (less staying as it rises), party
  size (less), whether the animal has been eating in this crown for two five-minute steps (less), companions moving,
  resting or feeding, and air temperature (more). *Review (§7a.4, numbers §3.6b):* inside "own foraging returns and
  timing" the gain is not the returns. The count of crowns fed in since the last nest carries 0.0139 (0.0057 to
  0.0224) alone and the flag "has eaten here for two five-minute steps" 0.0065 (0.0009 to 0.0127); the rate eaten
  adds nothing to the flag, and what the last trips delivered adds nothing (−0.0010). The flag is a clock of the
  feeding bout (19 minutes in the act at the median with it, 7 without).
- **Held-out world** (§3.5b; a check added after the result, so description). Animals of one world share its days
  (*review, numbers §3.5c:* it is not the shared days: with a whole day held out and the other days of its world seen,
  the packet still gains 0.0250, 0.0024 to 0.0462. What it does not carry to is the other world).
  With each seed's moments predicted by models fitted on the other seed's world alone, the packet as a whole gains
  0.0016 nats over (b) (−0.0279 to 0.0263): **not beyond noise**. Two groups still gain beyond noise: what
  companions are doing 0.0170 (0.0061 to 0.0288) and own foraging returns and timing 0.0208 (0.0094 to 0.0323). Body
  words lose 0.0261 (−0.0553 to −0.0013): sleep pressure and air temperature follow the hour, their weights fitted
  one world's days, and they do not carry over. The AUC of (c) is still 0.699 against 0.582 for (b): the ranking
  carries over, the probabilities do not.
- The description label (still in an act of the same kind) reads as the first: (c) over (b) 0.0247 (0.0067 to
  0.0430). Ridge penalties of 0.1 and 10 give gains of 0.0223 and 0.0306.

**Verdict.** A stay question would not be a timer in weights: the minutes carry nothing, and on held-out animals
state predicts the rules' staying beyond them, so the registered objection fails. That does not make it worth
training now. What survives a change of world is narrow (what the companions are doing, 0.0170, and how many crowns
the animal has fed in since its nest, 0.0142; *corrected by the review:* this read "how far the animal's own feeding
bout has got, about 0.02 nats each", and that flag is 0.0050 and not beyond noise there), the body words did not
carry over, and the label's only teacher is the
rules' own continuation among rules-driven companions; nothing here says wild chimpanzees stay as the rules do. So:
a stay question **may** be trained, as a small question named "rules-taught", shown the companions' acts and the
animal's own feeding history (the crowns since its nest; *review:* not its returns, which add nothing; it need not be
told why the act began), and only beside a fixed 0.5 answer and a
kind-of-act-only answer, both of which it must beat on a world it was not fitted on. It is not a route to wild-like
bout lengths, and it should wait until the teacher question is settled.

### 7.4 What was written before the runs, checked

| Said before | Found |
| --- | --- |
| §1: by the distance outside the band four rows are left at the population unit (T-ACT-2, T-FOOD-2, T-SOC-14, T-SOC-6), and on three the 10% mixture is already closer | yes on both counts; by the rule itself (beat the best family arm) only T-SOC-6 is left |
| §2.5 (a): for kinds, repeat below 0.70 at both horizons | yes: 0.39 and 0.34 |
| (b): the reserve term carries almost nothing | yes for the choice (doubling or halving it changes no winner); the term itself does differ between options, it is only too small to matter |
| (c): the shortfall term often sits at its cap in every fork of a point | partly: it does not vary at all at 63 of 200 points after 3 h and 53 after 6 h |
| (d): water decides where a drink is on the menu, heat on hot hours, sleep ranks nothing by day | not as said: a drink is 1% of the options and 2% of the winners, and no term decides alone; taken alone where it varies, the reserve repeats at 0.55 and each other term at 0.41 to 0.45 (kinds, 3 h) |
| (e): "which food" repeats no better than kinds | above what identical options give, the same (0.16 in both); in level higher (0.66 against 0.39), being a choice between two |
| (f): six hours from an afternoon point end in the dark, where options have converged | repeat and the share of distinguishable points both fall from 3 h to 6 h (0.39 to 0.34; 0.18 to 0.10) |
| §3.3: the kind and the minutes carry most of what can be predicted; the packet adds little beyond noise, except the companions | wrong on the minutes (nothing) and on held-out animals wrong on the size (the packet adds as much as the kind of act); right on a held-out world, where the whole packet adds nothing beyond noise and the companions do; the animal's own foraging returns were not foreseen |
| §6: the distinguishability test fires on noise more often than its level | wrong, corrected before any result: 0.012 with six options, 0.03 with two |
| §6, iteration 2: repeat falls where it was above chance, and the winner often differs between the two sets of forks | yes after 3 h (0.46 to 0.27, chance 0.26; the same winner at 0.38 of points); after 6 h repeat does not fall (0.36 and 0.35) and the winner is the same at 0.33 |

### 7.5 Limits found

- **Replicates as the brief defines them share the animal's own noise.** In 1,000 of 1,209 forced options of
  iteration 1 all eight replicates held the forced act for exactly the same number of ticks (261 of 598 in iteration
  2). "A salt applied after the fork" re-draws the world around the animal and not the rules' evaluation jitter or
  bout lengths, which are hashes of its decision count. Iteration 1's repeat is therefore the generous figure, and
  any later fork test should re-draw both. *Review:* iteration 2 is generous too. It re-draws the forked animal's
  hashed noise; its companions' jitter and bout lengths are hashes of their own decision counts and stay shared by
  all eight replicates. A later test should move every animal's count.
- **Iteration 2 drops options.** 100 of 698 options could not be applied in at least one replicate and were left
  out of both iterations' columns; "which food" is read on 15 points there and says little.
- **The menu is the rules'.** At most eight options, 6.0 on average, 5.1 kinds; one trip to food at most. The option
  the rules took is on the menu a kernel would see one tick later at 194 of 200 points.
- **How long an option was forced** is the rules' own hold: a median of 21 minutes for rest, 17 for feeding, 9 for
  an affiliative act, 1 for a trip to food, under a minute for a display, a call or a greeting. *Corrected by the
  review:* the trip's minute was explained here as "the act changes when the walk ends". Measured (§7a.4): the walk
  ended in an arrival in 39 of 131 forced trips; in 88 the rules' gate re-opened the choice and the rules drew
  another act. Over all 1,209 forced options the forced act ended in a fresh draw of the rules after an interrupt in
  415, after a need passed into another word in 153, and because the act was over in 431. The rules do not hold an
  act they would not have chosen, so the forcing is weak by design, and an outcome three hours later is mostly the
  rules' continuation, as the sceptic said.
- **F3 at 6 h is read on near-ties** (§7.2): the registered fallback to all points, where few are distinguishable,
  measures how easily a coin flip is turned over.
- **Part three's features are hand-listed and its model linear**: the gain is a floor on what a packet could carry.
  The registered split (held-out animals of the same worlds) keeps both worlds in every fit (*corrected by the
  review:* this read "let shared days through"; a held-out day does not remove the gain, §7a.4); the held-out-world
  check was added after the result. Two seeds, five days, one season, the working base at a swallowed share of 0.5.
- **The stay label is the rules' continuation in a rules world.** A model-driven population breaks acts differently
  (companions raise 73% of interrupts), so the predictability measured here is of the rules among the rules.
- **A slip of procedure.** Three short test files were once started in one command and ran side by side for a few
  seconds (the test runner's default); every simulation and every later test ran one at a time.

### 7.6 Not done, and not verified because the model could not be touched

- Nothing was run with the model, its tokenizer or its Python environment. No result here says whether a text model
  could learn either label from a packet; part three's linear reader of hand-listed features stands in for it.
- The report's engine section (section 12, the amended verdict) has met only the stand-in arms of
  `tests/r7-engine.test.ts`: no real engine arm exists yet to put through it.
- The "teacher alone in the loop" test of the review (the fork winner applied at every decision of ten animals for
  five days and read on the card) was not run: it was not in this stage's brief, and after §7.2 it would test a
  random chooser.
- "Which tree" could not be read (no menu with two trips); the wider menu is another stage's.
- The fresh seeds of `r7-prereg.md` §9 stay sealed; only 48 and 7 were run.
- Not run, by the stage's rule: the whole test suite and the build. Run, all passing: `tests/r7b-report.test.ts`,
  `tests/r7b-forks.test.ts`, `tests/r7b-stay.test.ts` (13 tests), `tests/r7-engine.test.ts` (2),
  `tests/r7-card.test.ts`, `tests/sim-track-e.test.ts` (the field pin) and `tests/sim-params.test.ts` (which holds
  the golden hashes) (28), the type-check, a type-check of this stage's scripts and tests (the project's does not
  cover `scripts/` or `tests/`), and `gen-params --check`.

## 7a. Review by a second pair of eyes (11 October 2026, 05:02 EDT onward)

A second agent read the whole diff, the log and this document, re-ran the stage's checks and re-derived its headline
numbers with code of its own. §0 to §6 stand as registered. What the review changed in §7 and §8 is listed in §7a.5;
everything else there is the builder's.

### 7a.1 Re-run and re-derived: holding

- **Registration before the runs.** The registration (commit baa7b91, 03:01:51) is older than every file under
  `artifacts/r7b/` (the first is the smoke check's burn-in, 03:11), and §0 to §5 have not changed since that commit.
  The fork script was committed (2993759, 03:16:35) before iteration 1 started (03:16:40 by its log), the iteration 2
  entry (03:25:54) while it ran, and the code of iteration 2 and of part three (f447df8, 04:22:59) before their runs.
  Every saved file of a reported run names its head and a clean tree (the smoke check's names a dirty one, as §6
  says).
- **Part one.** The amended `scripts/r7-report.ts` on stage R7's saved arm files writes the committed `r7-numbers.md`
  but for the dated line; against `track-e`'s file only the dated line and sections 6 and 8 differ (P1b).
- **Part two.** A script of the review's own (plain Node on the points files, none of the stage's code) gives the
  figures of §7.2: the winning kind repeats at 78 and 67 of 200 points, chance 0.23, a distinguishable winner at 37
  and 20; "which food" at 86 and 75 of 130; the winner is the rules' option at 39 and 31 of 194; with the animal's own
  noise re-drawn 32 and 42 of 120. At one of the 200 points the winner and the runner-up tie exactly (after 3 h), so
  the rule "ties to the first on the menu" decides next to nothing.
- **Part three.** A fit of the review's own (Newton steps solved by elimination, its own folds, log-loss and
  bootstrap) on the stage's design matrices gives the log-losses of §7.3 to the fourth decimal and the same gains.
  No animal is in two folds. With the labels shuffled within each seed the packet "gains" a negative amount, as a
  pipeline without a leak should.
- **Tests and checks**, one at a time: the stage's three test files, `tests/r7-engine.test.ts`,
  `tests/r7-card.test.ts`, the field pin, the golden test, `tsc --noEmit`, a strict type-check of the stage's scripts
  and tests, `gen-params --check`; `scripts/r7b-report.ts` writes the committed numbers but for the dated line.
  Nothing under `src/`, `data/`, `server/` or `training/` is in the diff. Only seeds 48 and 7 are in `artifacts/r7b/`.

### 7a.2 What the review found

1. **Why a forced trip lasts a minute is not what §7.5 said.** "The act changes when the walk ends" was a guess. A
   scratch look on one day of seed 48 says most forced trips never reach their tree: the rules' gate re-opens the
   choice on an interrupt and the rules draw another act. That bears on how "feed here or go" is read, so it is
   measured below (probe R1) and §7.5 is corrected from the result.
2. **The line of 0.70 is worded two ways in the sceptic's review.** "Below about 70% repeat, labels are noise" (F1
   here), and, as its fix-or-kill line, "go on only if the best option repeats in at least 70% of states that have a
   distinguishable option". By the second wording taken alone the few states with a distinguishable winner pass
   (0.90 to 1.00, in both iterations). F2 is this stage's stricter form of it (those states must be half the
   sample), registered before the run, and it fails. Two things belong beside it. The repeat among distinguishable
   states is read on the same eight replicates that picked them, so it is high by construction and proves nothing
   alone. What is evidence is that such states are more frequent than shuffled scores give: 0.18 against 0.012 in
   iteration 1, and 0.06 (7 of 120) with the animal's own noise re-drawn. So "the labels are noise" is true of about
   nine decision points in ten; at the rest an option does stand out.
3. **Iteration 2 is still generous.** It re-draws the forked animal's hashed noise. Its companions' evaluation
   jitter and bout lengths are hashes of their own decision counts and stay shared by all eight replicates. A fuller
   re-draw can only lower the repeat, so the reading (below the line) is safe; the advice in §8 is widened to say so.
4. **"Kinds" were the fourteen families; the brief's words were "feed here, rest or go".** The families include
   social acts a body score cannot see. Read in three classes (feed here, rest, go) the question is easier; the
   report now prints it (section 2.3 and 2.9 of the numbers; description).
5. **Which part of "own foraging returns" carries its gain was not looked at**, and §7.3 names it "how far the
   animal's own feeding bout has got". Measured below (R2).
6. **§7.5 says the held-out-animal split "let shared days through".** Whether it is the shared days or the other
   world can be read from the same moments (R3).
7. **Small things.** In iteration 2, 124 of the 4,908 forks made belong to options that a later salt could not apply;
   they were run and dropped, so "no animal died in any of the 14,580 forks" is known only for the 14,456 read. Three
   of the 200 menus hold the animal's own trip beside a joint trip to another tree (the kind `social-move`), so "no
   menu holds two trips" is true of the animal's own trips only. The readout "repeat on one term alone" was narrowed
   after iteration 1's numbers were seen to the points where the term varies; as registered (all points, ties to the
   first option) it would have read higher, so the change went against the labels. The summary line "0.27, which is
   chance" is the 3-hour figure; after 6 hours it is 0.35 (0.26 to 0.44): at or near chance, and far below the line.

### 7a.3 Three readings of the review, logged before their run (11 October 2026, 05:25 EDT)

None of them is a registered reading and none can change F1 to F4 or the reading of §3.3: they are description, and
are marked "added by the review" wherever the numbers file prints them.

*Seen before this entry, in scratch runs of the review whose numbers are not reported:* on the first 60 points of day
31 of seed 48, 10 of 43 forced trips to food arrived; and on the saved moments, the count of crowns and the eating
flag carried the gain of "own foraging returns" while the rates carried none, and a held-out day kept the packet's
gain. The readings below repeat those looks with committed code on all the points.

- **R1, how a forced option ended, and whether the saved forks are the forks this code makes**
  (`scripts/r7b-ends.ts`; one simulation process, about five minutes of one core). For each seed the parent of
  iteration 1 is walked again from the saved burn-in; every point of the main sample is prepared and each option
  forked once with salt 1, exactly as the fork run made its first replicate, and run for 720 ticks (3 h) with the
  rules' tap on the forced animal. Read: the tick at which its act first changes and what the rules' policy did in
  that tick (an arrival; a fresh draw and the gate's reason; no decision); for a trip to a tree, whether the animal
  fed at that tree within the three hours. **A check that can fail:** the parent ends on the saved hash, each menu is
  the saved menu, and each re-made fork holds the forced act for the saved number of ticks and reads exactly the
  saved five body terms after 3 h. If any of these fails the saved points are not reproducible from this code and
  the stage's part two is not ready.
- **R2, inside "own foraging returns and timing"** (`scripts/lib/r7b-stay-fit.ts` `partGains`; no simulation): each
  part of the group added to model (b) alone, on held-out animals and on a held-out world: the count of crowns fed in
  since the last nest; the flag that it has eaten in this crown for two five-minute steps; that flag with the rate
  eaten; what its last trips delivered; the hours since its last aggression.
- **R3, a held-out day** (`evaluate` with one fold per simulated day of a seed; no simulation): every day predicted
  by models fitted on the other nine seed-days.

### 7a.4 Results of the three readings (11 October 2026, 05:25 to 05:34 EDT)

Every number is from [r7b-numbers.md](r7b-numbers.md), regenerated at head d0e7b47.

- **R1, the check that could fail: it held** (numbers §2.8b; `scripts/r7b-ends.ts` at head a5bcb12 on a clean
  tree, four minutes of one core). Both parents ended on their saved hashes, all 200 menus were the saved menus, and
  all 1,209 re-made forks held the forced act for the saved number of ticks and read exactly the saved five body
  terms after 3 h. The points of iteration 1 are the points this code makes.
- **R1, how a forced option ended.** Of the 1,209 forced options the forced act ended in a fresh draw of the rules
  after an interrupt in 415, after a need passed into another word in 153, because the act was over or no longer
  possible in 431, for another of the gate's reasons in 115; 82 trips arrived; 6 nests were still held after three
  hours. **A forced trip to food ended in an arrival at its tree in 39 of 131 forks.** In 88 the rules' gate
  re-opened the choice first and the rules drew another act (74 after an interrupt); the animal fed at that tree at
  some time in the three hours in 56. A joint trip to a companion's tree arrived in 41 of 60. So the option that the
  fork "forces" is held only until the rules next look, and they let go of what they would not have chosen. The test
  measured what the brief described (force the option, let the rules run on); it did not measure what an option is
  worth when it is carried through.
- **R2, inside "own foraging returns and timing"** (numbers §3.6b). Added to (b) alone: the count of crowns fed in
  since the last nest 0.0139 (0.0057 to 0.0224) on held-out animals and 0.0142 (0.0048 to 0.0241) on a held-out
  world; the flag "has eaten in this crown for two five-minute steps" 0.0065 (0.0009 to 0.0127) and 0.0050 (−0.0007
  to 0.0110); the rate eaten adds nothing to the flag; what the last trips delivered −0.0010 and −0.0001; hours since
  the last aggression 0.0010 (not beyond noise) and 0.0058 (0.0028 to 0.0090). The group's name promised returns;
  what predicts staying is a count of the day's feeding and a clock of the bout.
- **R3, a held-out day** (numbers §3.5c). (c) over (b) 0.0250 (0.0024 to 0.0462), against 0.0257 on held-out
  animals and 0.0016 on a held-out world. The packet's gain survives a day it has not seen; it does not survive the
  other world, and that is the body words (§3.5b). With two worlds this is one comparison each way.
- **The first question in three classes** (numbers §2.3, §2.9; printed by the report, description). Feeding here,
  resting or going, every other option left out: repeat 0.53 (0.46 to 0.60) after 3 h and 0.40 (0.32 to 0.48) after
  6 h, chance 0.35; with the animal's own noise re-drawn, on 115 points, 0.45 and 0.53, chance 0.43. Below the line
  of 0.70 in every reading, so the verdict of §7.2 does not hang on the fourteen families.

### 7a.5 What the review changed

- **Code.** New: `scripts/r7b-ends.ts` (R1). `scripts/lib/r7b-stay-fit.ts`: `foldsOf` (the folds of `evaluate`,
  taken out; a fold per simulated day added), `partGains`, and `design` takes single features; the numbers of §3.1 to
  §3.6 did not move. `scripts/r7b-report.ts`: sections 2.8b, 3.5c and 3.6b, the three-class tables, the count of
  menus with two trees, forks made beside forks read in §2.9, and one more sentence in each of the two summary lines
  of section 4. `scripts/r7b-forks.ts`: a comment that said an option is refused "the same for every salt", which is
  false with `--own-noise`. Tests for the probe, the folds and the parts in the stage's two test files.
- **§7.** Corrections marked "review" or "corrected by the review" in §7.2 (what "go" was; the forks read), §7.3
  (what carries the gain of the foraging group; shared days against the other world; the verdict's wording) and §7.5
  (why a forced trip lasts a minute; iteration 2 still shares the companions' noise; the split). No number of the
  builder's was changed.
- **§8.** The proposed lines carry the corrections, the new script and the review's status.
- **Not changed, and said here instead.** The registered readings F1 to F4 and §3.3 are as the builder computed
  them. The readout "repeat on one term alone" stays narrowed to the points where the term varies (§7a.2 item 7).
  The 6-hour reading of F3 stays as registered (on all points).

### 7a.6 The review's reading of the three verdicts

1. **The amended score is in the report: yes.** Confirmed by regeneration and by reading the rule against §13a.
2. **Forked outcomes, as designed: not repeatable enough for a ruling.** Confirmed on the builder's numbers, on the
   review's own count, in three classes, and with the saved forks re-made. Two limits belong in the ruling's first
   line and not in a footnote: the forcing was weak (a forced trip reached its tree in three forks in ten), and
   "which tree", the question the sceptic said to start with, could not be asked on the rules' menu. What the test
   rules out is this design: a few replicates, 3 to 6 hours, five body terms, an option held as the rules' gate holds
   it. At about one decision point in ten an option does stand out, and the energy reserve alone repeated "feed here
   or go" at 0.82 in the generous replicates: neither is a reason to allow the labels, both are reasons not to write
   "outcome labels cannot work".
3. **A stay question: not a timer in weights by the registered reading; not worth a night.** Confirmed with the
   review's own fit. Sharper than §7.3 had it: beyond the kind of act, what predicts the rules' staying and carries
   to another world is what the companions are doing and how many crowns the animal has fed in since its nest, about
   0.015 nats each. Its returns add nothing, the minutes in the act add nothing, and the body words fit one world.

## 8. For the integrator

**Decisions that are the user's.**

1. **Outcome labels from forked worlds** (open since 10 October: "deferred until Stage R7's repeat test is in").
   The repeat test is in. Recommended ruling: **no**, as designed. With four replicates the best option's kind
   repeats at 0.39 after 3 h and 0.34 after 6 h (0.70 was the line); with the animal's own evaluation noise drawn
   again it repeats at 0.27 after 3 h and 0.35 after 6 h, at or near chance (0.26); the winner is the rules' option
   no more often than a random pick; and the form of the score (end state or time average) turns over half of the
   few clear winners. §7.2 lists what a narrower proposal would have to bring. *Review (§7a.6):* the ruling should
   name what was ruled out: this design, in which a forced option is held only as the rules' gate holds it (a forced
   trip to food reached its tree in 39 of 131 forks) and "which tree" could not be asked. The review re-made all
   1,209 saved first replicates exactly and counted the repeat with its own code; the recommendation stands.
2. **A stay question.** This test does not forbid it (it would not be a timer in weights) and does not recommend it
   now (§7.3). If it is trained: rules-taught by name, the companions' acts and the animal's own feeding history in
   the packet (*review:* the crowns fed in since its nest; its returns add nothing, §7a.4), a fixed 0.5 arm and a
   kind-of-act-only arm beside it, judged on a world it was not fitted on.
3. **What the amended scoring rule leaves.** With "closer" measured outside the band, the short scorecard can show
   an engine closer than the rules on one row at the population unit (T-SOC-6) and on none at ten animals. That is
   the rule doing its work, and it means a claim of "closer to wild chimpanzees" has to come from somewhere else:
   the card's anchors (patch residency, the half-hour shares), new held-out rows, or wild choice records. Whether
   that is acceptable is the user's.
4. **Before any future outcome label:** a ruling on whether a body score reads the end of the horizon or its
   average, and on injury (in the score, or a veto). Neither was asked in this stage; both decide winners.

**Merge notes.**

- Nothing under `src/`, `data/`, `server/` or `training/` changed; no switch, parameter or world key was added. The
  compressed goldens, the field pin and the protocol hash cannot have moved (`tests/sim-track-e.test.ts` and
  `tests/sim-params.test.ts` pass; `gen-params --check` is clean).
- Changed: `scripts/r7-report.ts` (amendment A1 in sections 6, 8 and 12; exports `outside`, `familyRoom`,
  `verdictA1`), `tests/r7-engine.test.ts` (its section-12 assertions: the heading is now "read by the amended rule"
  and a line has eleven columns), `docs/staging/r7-numbers.md` (regenerated: sections 6 and 8 and the dated line
  differ, nothing else). Likely conflict: any branch that edits the report's section 12 or regenerates
  `r7-numbers.md` (stage R9's or R10's use of `--engine`). The sentence of `r7-prereg.md` §13a "The report's engine
  section … still applies the rule as first registered" is now out of date.
- New: `scripts/r7b-forks.ts`, `scripts/r7b-stay.ts`, `scripts/r7b-report.ts`, `scripts/lib/r7b-score.ts`,
  `scripts/lib/r7b-stats.ts`, `scripts/lib/r7b-fork-readout.ts`, `scripts/lib/r7b-stay-fit.ts`,
  `tests/r7b-report.test.ts`, `tests/r7b-forks.test.ts`, `tests/r7b-stay.test.ts`, `docs/staging/r7b-prereg.md`,
  `docs/staging/r7b-numbers.md`; added by the review: `scripts/r7b-ends.ts`.
- `docs/research.md` is unchanged: the one source cited for the score (keramatiGutkin2014) is already there.
- `artifacts/r7b/` (25 MB) is not committed: four burn-in worlds, the points of both iterations
  (`forks/`, `forks-own/`), the moments (`stay/`), the review's probe (`ends/`) and a smoke folder. To regenerate
  everything (about 1 h 45 min of one core, no model): the commands of the `AGENTS.md` lines below (the fork script
  twice, without and with `--own-noise`), then `scripts/r7b-report.ts`.
- Reviewed on 11 October by a second agent (§7a): the numbers re-derived with its own code, the saved forks re-made
  exactly, three wrong or loose statements of §7 corrected in place and marked, four descriptive readings added to
  the numbers file (how a forced option ended; three classes; a held-out day; the parts of the foraging group). The
  whole suite and the build were not run by the review either (the stage's rule).
- The project's `tsc --noEmit` does not cover `scripts/` or `tests/` (`tsconfig.json` includes `src/` only). This
  stage's files were checked with `tsc --ignoreConfig --noEmit --strict …` on the files named; one error in a test
  was found that way. Worth a line in the checklist.
- A finding for whoever touches the menu: a forced option is refused by `applyDecision` once the animal's
  decision count is moved, at 100 of 698 options, because the legal list is cut by a score that contains the hashed
  jitter. Which trip to food is on a menu at all is decided by that hash.

**Proposed block for `IMPLEMENTATION_PLAN.md`** (after "Stage R7: Instruments and controls (no model)"):

> ## Stage R7b: Three no-model checks the sceptics asked for
> **Goal**: before another training night: (a) the scoring rule as amended on 11 October (distance outside the band,
> against the best rules-plus-random arm) in the report script; (b) whether body outcomes in forked worlds repeat
> well enough to be a label source (the ruling deferred on 10 October); (c) whether state predicts "still in this
> act 30 minutes later" beyond the kind of act and the minutes in it.
> **Success Criteria** (registered in `docs/staging/r7b-prereg.md` before any run): the regenerated numbers change
> only in the sections the amendment touches; for forks, the best option of four replicates is the best of four
> others at 0.70 of decision points or more, or the labels are noise; one scale of the score doubled or halved
> changes the winning kind at no more than 10% of points, or the score is an exchange rate; for staying, the packet
> features beat the kind of act and the minutes beyond a bootstrap interval over held-out animals, or a stay
> question would be a timer in weights. Nothing under `src/` changes.
> **Tests**: `tests/r7b-report.test.ts`, `tests/r7b-forks.test.ts` (a fork is deterministic in its salt and leaves
> its parent), `tests/r7b-stay.test.ts`; `tests/r7-engine.test.ts`.
> **Status**: Built, run and reviewed on branch `r7b-forks` (11 October 2026; a second agent re-derived the numbers
> with its own code and re-made the saved forks exactly, `docs/staging/r7b-prereg.md` §7a; no model was run;
> results in §7 and §8, numbers in `docs/staging/r7b-numbers.md`; seeds 48 and 7).
> *The amended score is in the report*: by the distance outside the band the rules are inside the field band on 11
> of the 15 short-scorecard rows at the population unit and on 10 of 12 at ten animals; the rules with 10% of
> choices random are inside it on three of the other four (T-ACT-2, T-FOOD-2, T-SOC-14); an engine could be shown
> closer on T-SOC-6 alone at the population unit and on no row at ten animals. *Forked outcomes are not repeatable
> enough*: on 200 fresh draws of adults, every option forced on a copy and the animal's body read after 3 and 6
> hours (14,580 forks made, none of the 14,456 read fatal; 0.39 s a fork), the winning kind of four replicates is
> the winning kind of four others at 0.39 and 0.34 of points (chance 0.23; in three classes, feed here, rest or go,
> 0.53 and 0.40, chance 0.35), "feed here or go" at 0.66 and 0.58 (chance 0.50); a winner is told from the runner-up
> at 18% and 10% of points; with the animal's own hashed evaluation noise drawn again in each replicate the figures
> are 0.27 and 0.35, at or near chance (0.26); the winner is the option the rules took at 0.20 of points (chance
> 0.18); reading the time average instead of the end state changes the winning kind at 0.60 of points. The forcing
> is weak by design: an option is held only as the rules' gate holds it, and a forced trip to food reached its tree
> in 39 of 131 forks. No menu held two trips of the animal's own, so "which tree" could not be asked. *Staying*: 22%
> of 2,000 moments were still in the same act 30 minutes later; on held-out animals the minutes in the act add
> nothing to the kind of act (−0.0032 nats) and the packet features add 0.0257 (0.0064 to 0.0446; AUC 0.61 to 0.73),
> so a stay question would not be a timer in weights; fitted on one world and read on the other, only what
> companions are doing (0.0170) and how many crowns the animal has fed in since its nest (0.0142) still add; what its
> feeding returned adds nothing, and the body words do not carry over. *Open*: the user's ruling on outcome labels
> (recommended: no, as designed) and on a stay question (allowed by this test, small, rules-taught); a later fork
> test should hold the forced option through, re-draw every animal's hashed noise as well as the random stream, and
> offer more than one tree; end state against time average and the place of injury in any body score.

**Proposed edits to the block "User decisions (10 October 2026)", the line "Still open":** replace "whether the
simulation's own body outcomes in forked worlds may be a label source (deferred until Stage R7's repeat test is in)"
with "whether the simulation's own body outcomes in forked worlds may be a label source (the repeat test is in,
Stage R7b: the winning kind repeats at 0.39 of decision points after 3 h, 0.27 once the animal's own evaluation
noise is drawn again, chance 0.23 to 0.26, with the forced option held only as the rules' gate holds it;
recommended: no, as designed)".

**Proposed edit to "Stage R7", Status, the sentence beginning "*Open*: the user's ruling on the scoring rule":**
replace its first clause with "the scoring rule was amended on 11 October (`r7-prereg.md` §13a) and the report
applies it since Stage R7b: on the short scorecard an engine can now be shown closer than the rules on one row
(T-SOC-6) at the population unit and on none at ten animals;".

**Proposed lines for `AGENTS.md`, Commands** (after the `r7-ledger.ts` line):

```sh
pnpm exec tsx scripts/r7b-forks.ts run [--seeds 48,7] [--n 100] [--days 5] [--out artifacts/r7b/forks] [--own-noise]   # stage R7b (docs/staging/r7b-prereg.md §2), no model: the fork-label repeat test. Fresh draws of adults in daylight in a rules world of the working base; every option of the menu forced on a copy (applied, and held as the rules hold their own draw), eight replicates that differ in a salt applied after the fork, the rules run on, the animal's own body read after 3 and 6 simulated hours (scripts/lib/r7b-score.ts: five terms on their mechanisms' own ranges); --own-noise also re-draws the forked animal's hashed evaluation jitter and bout lengths (use it: without it replicates share that noise); resumes from <out>/s<seed>.points.jsonl; about 19 s of one core per decision point; refuses a dirty tree and any seed but 48 and 7
pnpm exec tsx scripts/r7b-stay.ts sample [--seeds 48,7] [--n 1000] [--days 5] [--out artifacts/r7b/stay]   # stage R7b §3, no model: moments inside an act in a rules world with observeV5 1, the label "still in this act without a break 30 simulated minutes later", the packet features of observe() and why the act began (about a minute)
pnpm exec tsx scripts/r7b-ends.ts run [--seeds 48,7] [--from artifacts/r7b/forks] [--out artifacts/r7b/ends]   # stage R7b review (r7b-prereg.md §7a), no model: re-makes the first replicate of every forced option of the fork run and says how the forced act ended (an arrival, a fresh draw of the rules and why their gate re-opened the choice, still held after 3 h) and whether a forced trip fed at its tree; its log and the numbers file say so if a re-made fork is not the saved one (about four minutes of one core)
pnpm exec tsx scripts/r7b-report.ts --r7 <stage R7's artifacts/r7> [--dir artifacts/r7b] [--md docs/staging/r7b-numbers.md]   # stage R7b: the numbers file (the amended scoring rule on R7's saved runs; repeat, the rules, the body terms, the score variants and the cost of forked outcomes, both iterations, how a forced option ended; the kind of act, the minutes in it and the packet features as predictors of staying on held-out animals, a held-out day and a held-out world)
```

**Proposed change to the existing `r7-card.ts` line of `AGENTS.md`:** after "(an engine arm stands beside the
control arms and is scored in its section 12)" add "by the distance outside the field band (amendment A1,
r7-prereg.md §13a)".

**Nothing proposed for** `HANDOFF.md`, `README.md` or `docs/simulation.md`: no parameter, switch or mechanism changed.

**Commands the integrator may want next.** After the merge: `pnpm test` and `pnpm build` (not run here, by the
stage's rule). To see the numbers again without a run: `pnpm exec tsx scripts/r7-report.ts --dir <R7's artifacts/r7>
--bridge <the R5 pilot's folder> --same-as <R7's artifacts/r7>/launch1-F` and `pnpm exec tsx scripts/r7b-report.ts
--r7 <R7's artifacts/r7>` (the second needs `artifacts/r7b/`, which lives in this worktree).
