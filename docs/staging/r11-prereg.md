# Stage R11: re-teach the small model on the honest packet (pre-registration)

Agent r11-honest-retrain, branch `r11-honest-retrain` from `track-e` a11c45c. Registered 11 October 2026, 03:05 EDT,
before any code of this stage and before any run. Specification: the integrator's brief for stage R11;
`IMPLEMENTATION_PLAN.md`, Track R, "User decisions (10 October 2026)" and stages R7 to R10. Read first: the review
reports of 10 October (`attack-closed_loop_validity.md`, `attack-feasibility_and_sequencing.md`,
`attack-hidden_hand_coding_and_rules.md`, `check-verify_training_numbers.md`), `docs/staging/r8-prereg.md`,
`r9-prereg.md`, `r7-prereg.md` (§8, §9, §13a), `r4-prereg.md`, `r4b-prereg.md`.

**The name of every result of this stage is "rules-taught model on a rules menu".** The teacher is the rules. Soft
labels teach the rules' judgment more faithfully than hard ones; that is a scaffold, not a departure from the rules,
and agreement with the rules is not correctness about chimpanzees. The menu is the rules' menu (at most eight options,
one feeding option on 99.6% of asks). Animals under 8 stay on the rules.

**Why.** Every adapter so far was taught to copy the rules' pick from a packet that hid what the animal was doing
(stated in 2.6% of packets), carried the rules' own wording, listed the rules' preferred partner first, and mixed
fresh choices with acts the gate merely kept (35% of labels). The first adapter puts 0.155 on a trip where the rules
take one at 0.23 of fresh draws, which equals the pooled rate of fresh and kept rows: it learned the blend. Packet 5
(stage R8) and the decode (stage R9) now exist. This stage is the first training on honest inputs and honest labels.

**What this agent does and does not do.** It builds everything up to the training command, samples the data, runs the
no-model control arms and a dry run against a fake worker. It never starts a process of the model's Python
environment, never loads the model or its tokenizer, and uses no GPU: a model chain of stages R8 and R9 is running on
this machine tonight. Training, the offline scoring and the model arms are the integrator's. Token counts here are the
project's estimate (`estimateInputTokens`); real counts are the integrator's first check.

No switch default changes. Nothing under `src/sim` or `data/` changes, so the goldens and the field pin cannot move.

## 1. Inputs: two arms, one change apart

Both are packet 5 in its registered short variant (`src/providers/packet.ts` `buildOwnQuestion`), which met the
350-token target (median 330 real tokens on a second simulated day). Packet 5 itself is not changed.

| Arm | Builder options | Holds | Leaves out |
| --- | --- | --- | --- |
| **P5b** (primary) | `{ variant: 'short' }` | the whole approved packet 5: neutral options, `doing`, `asked because`, companions' acts, `lately` (own foraging returns), `last` (social timing) | nothing |
| **P5a** (ablation) | `{ variant: 'short', without: ['lately', 'last'] }` | neutral options and what the animal perceives and feels now: `doing`, `asked because`, companions' acts | the lines `lately` and `last` |

The builder's `without` already exists (stage R8, for exactly this). Stated consequence, not a new choice: with `last`
left out the builder no longer drops the grooming and greeting memory lines that `last` replaces, so P5a's one memory
line can be such a line (as in every earlier packet). The arms are named in `scripts/lib/r11-packets.ts` and a test
asserts that a P5a packet has no `lately` and no `last` line and equals the P5b packet of the same moment in every
other line but `memories`.

The old adapter `r4-rules-state` is run on its own old packet (the state-only packet `r4-state-1`), unchanged.

For the lock-in check (§6) two more renderings of the same moments are scored and never trained on: each arm's packet
without the `doing` line (`without: [..., 'doing']`).

## 2. Labels: the rules' choice with its noise averaged out, on fresh draws only

**Which records.** The sampler (`scripts/r8-contexts.ts`) saves the kind of every label: a fresh draw, an act the gate
kept, a trip that arrived. Only fresh draws are trained on. Kept and arrived records are dropped from training and
scored separately (§6).

**How the rules choose at a fresh draw on the working base** (read from `src/sim/rg.ts` `rgChoice` and
`src/sim/candidates.ts` `offer`; `choiceBelief` 2, no temperature). For option *i* of the menu:

- *v_i*: its value with every term of the rules' valuation and without the candidate jitter (the sampler's `raw`);
- *j_i*: the candidate jitter, a hash of the animal, its decision version, the act and the target, uniform on
  ±`candidateJitterSpan`/2 (span 0.24);
- *b_i*: the belief draw. 0 for everything the animal perceives now. For a trip to a crown out of sight: the trip's
  food worth at a crop drawn from the animal's belief about that crown, less its worth at the believed crop (two
  forms: a normal draw around the remembered crop, or one coin for a listed crown valued as a chance of fruit). These
  draws come from `world.rng`.

The rules take the first maximum of *v_i + j_i + b_i* in menu order.

**The label.** *q_i* = the probability that option *i* is that maximum when every option's jitter is redrawn
(independent, uniform on ±span/2) **and every belief draw is redrawn** from the same belief, the menu held as it was
offered. The brief names the jitter; the belief draw is the rules' second source of noise on this base (it decides
about 2% of fresh draws: the pick is the top published score at 0.98), and neither is something the packet shows, so
both are averaged. A column with the jitter alone redrawn (the belief draws held at their realised values) is saved
beside it for comparison and is not trained on.

**How it is computed** (`scripts/lib/soft-labels.ts`): exactly in the jitter (the integral of one uniform density
times the other options' distribution functions is piecewise polynomial; Gauss-Legendre nodes exact for its degree on
each piece); where an option carries a belief draw, a fixed-seed Monte Carlo of 2,000 redraws of the beliefs (seeded
by the record's id, never `world.rng`), with the exact jitter integral inside each redraw. A record with no belief
draw has no Monte Carlo error at all.

**The proof that it is the rules' own choice, a pass mark that can fail (M1).** For every sampled fresh draw the
sampler replays the rules' belief draws from the random state saved just before the decision (a copy; the world is
not written), and checks: (a) the replay ends on the world's own random state after the decision, so it consumed the
draws the rules consumed; (b) the first maximum of *v + j + b* with the realised jitter and the realised belief draws
is the option the rules took. **Mark: (a) and (b) hold on 100% of sampled fresh draws in all six worlds.** A miss is a
defect; training does not start until it is explained. The Monte Carlo and the exact integral are compared in a test.

**Stated limits.** (1) The menu is held fixed: a redrawn jitter could have brought another option onto the menu of
eight; that is not modelled. (2) The rules' continuation bonus and finished penalty are terms of *v* and stay in the
label; with the `doing` line the packet can now explain them. (3) The label is the rules' valuation made smoother; an
option the rules never take keeps probability 0.

**One-hot variant.** Every row also carries the realised pick, so the same file trains a one-hot adapter with one
flag (`--labels hard`). It is an offline comparison only, run if the integrator has a spare 90 minutes; no rule reads
it.

No class weights, no resampling by label, no matched negatives, no fitted temperature, offset or prior, anywhere.

## 3. Data

The worlds and the split of stage R4, with longer windows that never include a first simulated day (stage R8's
review: the body line reads "about to sleep" all day there).

| Split | Seed | Base | Burn-in, then sampled days | Sampling rate | Animals |
| --- | --- | --- | --- | --- | --- |
| train, dev | 48 | M6-W50 | 6, then 6 (days 6 to 12) | 0.09 | dev: R4's rule (`splitOf`: hash of seed and id below 0.12); train: the rest |
| train, dev | 48 | M6-W25 | 12, then 6 (days 12 to 18) | 0.09 | the same animals |
| train, dev | 7 | M6-W50 | 6, then 6 | 0.09 | as above |
| train, dev | 7 | M6-W25 | 12, then 6 | 0.09 | as above |
| held out | 21 | M6-W50 | 6, then 6 | 0.2 | all |
| held out | 21 | M6-W25 | 12, then 6 | 0.2 | all |

R4 sampled 4 days per world at the same rates (days 6 to 10 and 10 to 14). The two bases of a seed start from one
world, so their windows do not overlap. Sampling is by a hash of (`r11`, seed, tick, animal), never `world.rng`. Field
profile, `observeV5` 1 and `menuParity` 1; one world per process, one process at a time.

**Files** (under `artifacts/decide-ft/r11/`, not committed; `scripts/r11-assemble.ts`):

- train: per training world the first **780** fresh draws with a label, in a fixed hash order, of train animals:
  3,120 in all (R4 had 3,122 labelled records, of which 2,091 were draws). If a world yields fewer, what there is.
- dev: per training world the first 75 fresh draws of dev animals (300).
- held out (seed 21): per world the first **750** fresh draws and the first **250** kept or arrived records.
- Each file exists once per arm with that arm's packet; the records and their order are the same in both arms.

A fresh draw has no label, and is counted and left out, when its menu holds fewer than two options, when any option
lacks its jitter-free value, when the rules' menu and the request's menu differ, or when the pick is not on the menu.

**Committed:** `docs/staging/r11-manifest.json` (per world: records by kind, the world hash, the check that the taps
left the world unchanged; per split and arm: counts, animals, sha256 of the file and of the sorted ids; the label
checks of §2) and `docs/staging/r11-data.md` (tables generated from it: counts, how spread the labels are, estimated
tokens of each arm's packets by block, daytime packets whose body line says "about to sleep").

## 4. Training (the integrator runs it)

`training/decide_ft/train_r11.py` is `train_r4.py` with two changes and nothing else: the target of each example is
the label distribution of §2 (soft cross-entropy, the sum over options of −q·ln p; `--labels hard` gives R4's one-hot
loss on the same rows), and the development loss that picks the saved epoch is the same soft cross-entropy. Everything
else is R4's: LoRA r 16, alpha 32, dropout 0.05 on the classifier and the top 8 encoder layers, bf16 on MPS, batch 2
with 4 accumulated, AdamW at 2e-4, 10% warm-up then linear decay, clip 1.0, 3 epochs, each context shown in its own
option order or a shuffled one, weight 1 per example, the out-of-memory retry. So between `r4-rules-state` and a new
adapter only the inputs and the labels differ.

**Two training seeds per arm** (no round has yet read a spread between trainings; stage R9's second seed is running
tonight): 7 (R4's) and 11 (R9's second). Four adapters: `r11-p5b-s7`, `r11-p5b-s11`, `r11-p5a-s7`, `r11-p5a-s11`.

Because Python of the model environment cannot be run tonight: the script is reviewed line by line against
`train_r4.py` (the diff is in §10), the loss arithmetic and the option shuffle live in a module with no dependency
(`training/decide_ft/soft_loss.py`) tested by a standard-library test, and the script checks itself at start: the
soft loss with a one-hot target must equal the library's cross-entropy on the first batch, and its shuffle must equal
`common.permuted` on every row. Token parity (`parity.py`) and the manifest follow R4's conventions.

**Time**, to be replaced by the measured cost: R4 took 0.85 s per example at a median of about 450 real tokens; time
grows as about tokens to the power 1.5. The estimate for each arm is computed in §10 from its packets' lengths.

## 5. In the loop (the integrator runs the model arms)

**Design.** The focal design of stages R5 to R9 (`scripts/r5-pilot.ts` `runArm`: lockstep, a receipt per ask, replay)
with packet 5 sent to the kernel, **the gate on**, the rules' pick kept on the menu, read by stage R7's timing card and
row readers on the same animal-days as the control arms. `scripts/r11-loop.ts`.

- **Seeds: 4111 and 4222**, test unit A of `docs/staging/r7-prereg.md` §9, never run before. 4333 and 4444 stay
  sealed. Checked again today: none of the four is in a reserved or retired range of `AGENTS.md`
  (`scripts/e-run.ts` `RESERVED_SEEDS`), and none appears as a seed in a file name, a small JSON, log or document under
  `artifacts/` of the main checkout or of any worktree, nor in a tracked script or document other than R7's own.
- Working base M6-W50, field profile, `observeV4` 1, `menuParity` 1 and `observeV5` 1; 30 days of burn-in on the
  rules, then 5 days. `observeV5` is on from the first tick so that the animals' own record (trips, crowns, grooming
  times) is a month old when the window opens; the rules never read it (stage R8: a world with the switch on is the
  world with it off plus that record), and the script checks that on each burn-in.
- **Fresh focal animals by the earlier rule** (`scripts/em-loop.ts` `focalSet` on each burned-in world: the alpha
  male, the median-ranked other adult male, a lactating female, another adult female, an adolescent of 12 to 15):
  five per seed, ten in all. Everyone else, and every animal under 8, stays on the rules.
- **The decode is a flag** (`R11_DECODE`), set to what stage R9's result names:
  - `draw`: each new adapter runs twice, decode salts 1 and 2; the old adapter once (salt 1).
  - `held` (the act epoch): the same with `held`.
  - **R9 names no standard (the flag unset), or names the top pick:** each new adapter runs with the top pick, and a
    draw arm (salt 1) runs beside it; `r11-p5b-s7` also runs draw with salt 2, so one salt spread is on file. The old
    adapter runs with the top pick. Statements S1 to S3 are then read on the top-pick arms and repeated for the draw
    arms as a second line.
- **Beside the engine arms, on the same burned-in worlds, animals and days** (stage R7's sixteen no-model arms, by
  R7's own code): the rules with eight re-draws, random choice twice, the rules with 10, 20 and 30% of choices random
  twice each. Run by this agent once this registration is committed; they are the first run on the unit, as R7 §9
  requires, and no engine arm exists yet.
- Every model arm is replayed from its receipts with no model and must end on its run's world, every day's hash
  equal, with no receipt whose decode the replay does not reproduce.

**Order when model time is short:** P5b before P5a; within an arm training seed 7 before 11; the old adapter last.

## 6. What is read, and the pass marks (fixed now)

### 6.1 Offline, on the held-out fresh draws of seed 21 (1,500), per adapter, on its own arm's packets

Intervals: 95% bootstrap over animals (2,000 resamples, fixed seed), as R4. Two floors are scored on the same records:
the untuned model on the same packets, and a **kind-prior baseline** that needs no model: a predictor that knows only
which kinds of act are on the menu and how much of the label each kind takes on the training file (an option's share
is its kind's mean label mass per option, normalised over the menu). Its numbers are computed by this agent and
printed in §10 before any adapter exists.

1. **Agreement with the rules' distribution**: the mean cross-entropy against *q* and its excess over the labels' own
   entropy (the divergence from the rules' distribution; 0 is the floor); top-1 agreement with the realised pick and
   with the label's top option, beside chance.
2. **The trip probability against the rules' rate**: on day and dawn fresh draws with a trip to food on the menu, the
   mean probability on the trip options, against the mean of *q* there and the realised rate (the first adapter: 0.155
   against 0.23). Also the top-pick trip rate and the area under the curve for "the rules took the trip".
3. **Calibration**: the top probability in bins of 0.2 against accuracy and the expected calibration error (R4: 0.052);
   the trip option in the fact-check's three bins against the realised take rate.
4. **By kind** of the rules' pick (feeding, travel, rest, social, by day and dawn; night).
5. **State probes** (R4's six, three levels, up to 60 situations each, rendered as the arm's packet): right way, wrong
   way, no response.
6. **Lock-in, offline.** On fresh draws where the act in progress is on the menu and had not ended (carrying on is an
   option): the probability on that option with the `doing` line and with it removed, against the rules' own *q* for
   it; the share of those packets with 0.9 or more on it, both ways (stage R8's yardstick for the untuned model: 7 of
   36 with the echo, 2 of 36 without). Removing the line is an input the adapter was not trained on; said in the table.
7. **Kept and arrived records, apart**: how often the top pick is the kept act, with and without `doing`. These are
   not choices and no mark reads them.
8. **Between the two training seeds** of an arm: the difference on each readout above, beside the difference between
   the arms.

**Offline marks** (each for the primary arm P5b; P5a is reported beside it):

- **O1** the divergence from the rules' distribution is lower than the untuned model's and lower than the kind-prior
  baseline's, each paired interval excluding 0, for both training seeds.
- **O2** the mean trip probability is within **0.03** of the rules' rate (the mean of *q*) on those menus, for both
  training seeds. (The first adapter missed by 0.076.)
- **O3** no state probe moves the wrong way, for both training seeds.
- **O4 (lock-in)** with the `doing` line, the mean probability on carrying on exceeds the rules' own by no more than
  **0.05**, and the share of packets at 0.9 or more exceeds the rules' share (of *q* at 0.9 or more) by no more than
  **0.05**, for both training seeds.

### 6.2 In the loop, at ten animals for five days (seeds 4111 and 4222 pooled, a realization as in R7 §6)

**Timing rows** (five, by stage R7's card): act changes per animal-day; trips to food begun; trips completed; time in
a food patch (mean minutes per patch visit); the share of half-hour pairs in the same activity.
**Guards** (R7 §8 as amended): reserve trend not below the rules' mean by more than D; nights in a nest not below it
by more than D; distance, act changes and trips completed inside the rules' mean ± D. **Energy eaten is not a guard.**
**D** is the smallest difference one arm can show against the eight rules re-draws, measured on this test's own
worlds (R7's development values: 8.9 on 46.3 act changes, 1.72 on 8.03 trips begun, 0.44 on 1.85 trips completed, 2.57
min on 20.56, 0.037 on 0.390).
**Lock-in in the loop**: of the fresh choices at which the act in progress was on the menu and had not ended, the
share at which the option applied was that act; for the engine from its receipts, for the rules from a read-only tap
on the eight rules arms (mean and D).
**Spreads**: between the two training seeds of an arm and between two decode salts of an adapter, per row.
**Who decided**: the share of waking minutes whose act a fresh choice of the model set (the rest: held by the gate,
or the rules), per arm.

**Told from the rules** (R7 §6): on a row, every realization lies outside the rules' mean ± D on the same side. A
**realization** is one adapter with one decode salt (one per adapter with the top pick), its two seeds pooled. A
**recipe** (an arm: P5b, P5a) has the realizations of both its training seeds, so a recipe is told from the rules on
a row only when both trainings are, on the same side. A single adapter (one training seed, or the old adapter) is told
when its own realizations are. The definition is strict on purpose: one realization lies outside the rules' mean ± D
on a given row in about one test in twenty by chance, and a statement read on five rows and several realizations
must not fire on that.

**The statements, in the order they are read** (the first that holds names the outcome; the others are printed):

- **S0, training-seed spread swamps everything.** On any of the five timing rows the two training seeds of P5b (each
  the mean of its realizations) differ by more than **2 D**. (Two single runs, five rows: a difference that large
  arises in about one test in twenty if the engine's run-to-run noise is the rules'.) Then no comparison between arms,
  with the old adapter or with the rules is reported as a result; the spread is the result, and every later recipe
  needs at least three training seeds. The same is printed for P5a.
- **S1, the honest packet and labels close the gap to the rules on timing.** The old adapter is told from the rules on
  at least one timing row (there is a gap on these worlds); the recipe P5b is told from the rules on none of the five
  timing rows and fails none of the five guards as a recipe; and on every row where the old adapter is told, both P5b
  trainings lie nearer the rules' mean than the old adapter does. If the old adapter is told on no row, the outcome
  reads "no gap at this unit on these seeds" and S1 is not claimed.
- **S2, the limit is information.** The recipe P5b is told from the rules on at least one timing row, while offline
  both trainings have learned the rules' rates (O2 holds) and stay well short of the rules' distribution decision by
  decision (the divergence of 6.1.1 is more than half the kind-prior baseline's). Then what limits the engine is not
  the labels, the decode or the training run: it is what the packet does not show, or what this model cannot read
  from it. This stage cannot tell those two apart, and says so.
- **S3, otherwise:** reported as it fell. For example: the recipe is told from the rules on a row with O2 failed (the
  adapters did not learn the rules' rates, so the labels or the fit are still at fault); or one training is told and
  the other is not (the trainings disagree; a third seed is needed before the row is read).

**What the ablation says.** P5b against P5a, per timing row and per offline readout: the difference, D and the seed
spread. The lines `lately` and `last` are kept as earning their tokens only if, in both training seeds, P5b is
nearer the rules' mean than P5a on a timing row by more than D, or its divergence from the rules' distribution is
lower by a paired interval excluding 0; otherwise the shorter packet is the one to serve.

**Lock-in mark in the loop (L1).** The recipe P5b is not told from the rules upward on the share of fresh choices
that carry on (both trainings above the rules' mean + D would be lock-in).

**"Closer to wild chimpanzees"** may be claimed on a row only under R7's amended rule (§13a): the engine's distance
outside the field band is smaller than the best rules-plus-random arm's by more than D at this unit, with all five
guards held, in both training seeds. On a row where the rules are inside the band nothing can be claimed. Which rows
leave room is computed from this test's control arms before any engine arm exists and printed in §10; from R7's
development numbers we expect patch residency (the rules 20.6 min against 27.0 and 46.2 at the two Kibale sites) and,
as an anchor without a band and a direction only, the half-hour share (0.390 against Taï's 0.476); few or no rows of
the short scorecard. Field numbers are yardsticks here and enter nothing.

**What no outcome of this stage can show.** That the engine is better than the rules (its teacher is the rules).
Anything about a population (ten animals whose companions are on the rules understate what an engine does to a
population: R7 §13.3). Anything about choosing a tree, a partner among many, or an ending (the menu and the gate are
the rules').

## 7. The run script

`scripts/r11-run.sh`, modelled on `scripts/r9-run.sh`:
`check | sample | controls <seed> | dry | train <arm> <seed> | parity <arm> | offline | loop <seed> | replay <seed> <arms> | report | publish`.
A model step holds while swap in use is above 6 GB (re-checked every minute for up to 30 minutes), refuses a tree that
is not clean, and refuses while another model process of this project is alive. Tables are written under
`artifacts/r11/tables`, so a frozen checkout stays clean; `publish` copies them to `docs/staging`. `dry` runs the
model arms' own path (worker process, guarded scorer, GLiNER kernel, packet 5, receipts, decode, replay) against
`scripts/lib/fake-worker.mjs`, which holds no model, on seed 48; this agent runs it.

## 8. Tests

`tests/r11.test.ts`: the label (sums to one; the realised pick has the highest mass in a clear case; near ties share
mass; the exact integral against a brute-force redraw; a belief draw spreads mass; the realised draws reproduce the
pick); the P5a variant (the banned lines absent, the rest equal); the loop arm with a fake kernel (packet 5 reaches the
kernel; the replay reproduces the run); the manifest (counts and hashes of an assembled sample; no kept or arrived
record in a training file). `training/decide_ft/test_soft_loss.py` (standard library only): the loss arithmetic and
the shuffle. Also run: `tests/r8-packet.test.ts`, `tests/r9-decode.test.ts`, `tests/r5-pilot.test.ts`,
`tests/r7-engine.test.ts`, `tests/r4b.test.ts`, and the type-check. Not run: the whole suite and the build (the
machine is shared with the model chain tonight).

## 9. Iterations (at most 3; each logged here before its run)

- **Iteration 0** (this agent, no model; logged 11 October 2026, 03:05 EDT, before any run): the code and tests; the
  sampling of §3 and its manifest; the control arms of §5 on seeds 4111 and 4222; the dry run of §7 on seed 48.
- **Iteration 1** (the integrator): training, offline scoring, the model arms and their replays; §6 read.
- One more is kept for a failed run or a defect, logged before it runs. The marks and statements of §6 do not change.

## 10. Iteration log and results

(Empty at registration.)
