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

Sections 1 to 9 stand as registered at 03:05 (commit 456640f). What changed afterwards is said here, each change
logged before the run it concerns.

### 10.1 Corrections to the label, logged 11 October 2026, 03:19 EDT, before any label file, sampling run or control arm

Disclosed first: while the sampler was being written it was run three times on a dirty tree into a scratch folder
(seed 48, base W50, one day of burn-in, half a day sampled; nothing kept, no number of it reported below). Its own
check, mark M1, and one comparison printed beside it showed two errors in §2 as registered. No label file existed, no
adapter exists, and no mark or statement of §6 changes.

**C1. The rules compare published scores.** §2 says the rules take the first maximum of *v + j + b*. The code takes
the first maximum of *published(v + j) + b*, where published(x) is the score as `candidates.ts` writes it on an
option: clamped to 0 … 3 and rounded to a thousandth. Found because check M1 failed on every one of 1,126 fresh draws
as first written (the value and the jitter did not sum to the option's score); with the published score it holds on
all of them. The label uses the rules' own rule.

**C2. The menu cannot be held fixed while the jitter is redrawn.** §2 registered the label as the chance that each
offered option wins when the offered options' jitter is redrawn, "the menu held as it was offered", and listed that as
a stated limit. It is more than a limit. The rules' menu is itself cut by the jittered scores: each kind of act is
represented by its best-scored target (one trip out of about 51 possible trees), so an option is often on the menu
because its own jitter was high. Redrawing that option's jitter alone then takes away what put it there, and the
label understates it. On the scratch half-day the label so computed put 0.113 on trips to food where the rules took
one at 0.172 of the same 279 menus: the same shortfall, in the labels, that stage R4's adapter showed (0.155 against
0.23). Training on it would have taught the under-tripping this stage exists to remove.

The label as corrected, and as built: **the probability that the rules take each option given the animal's state and
the menu the model is shown.** The candidate jitter is a hash of the animal, its decision version, the act and the
target, so another decision version is another draw of every candidate's jitter, on the menu or not. For each fresh
draw the sampler sets the animal's decision version to other values (a fixed sequence), builds the candidate list and
the rules' menu again with the simulation's own functions (`computeCandidates`, `rgMenu`), draws a belief for each
option that carries one from a stream seeded by the record's id, and applies the rules' rule. Among the redraws that
offer the same menu, the share of each option is its label. The decision version is put back at once; nothing else is
written and `world.rng` is not drawn from.

- **How many redraws.** At least 2,000 per fresh draw, then on in the same sequence until 500 of them offered the same
  menu or 20,000 were made. A fresh draw whose menu came up in fewer than 100 redraws has no label, is counted and is
  left out (its menu is too rare to estimate; leaving it out does not bias the label of any other record).
- **So the label is a Monte Carlo estimate, not exact**: its standard error is at most 0.022 with 500 same-menu
  redraws and 0.05 with 100. The exact arithmetic of §2 (now for published scores, `scripts/lib/soft-labels.ts`) is kept
  for the comparison column `fixed`, the registered reading, which is saved in every row and never trained on.
- **Mark M1, widened.** On 100% of labelled fresh draws: (a) and (b) as registered (with the published score), and
  (c) the candidate list and the menu built again at the animal's true decision version are the ones the rules drew
  from, option for option and score for score. So the redraws go through the code that made the realised choice.
- **Mark M2, new: the label is calibrated.** Over every labelled fresh draw of the six worlds, for each of six groups
  of options (feeding, travel, rest and social options; trips to food on day and dawn menus; the option that carries
  on the act in progress): the mean label mass on the group against the share of draws at which the rules took an
  option of the group. **Mark: every difference is within 3 standard errors** (the standard error from the labels'
  own variance, the square root of the sum of q(1 − q), over the count). If it fails, training does not start. The
  same table is printed for the `fixed` column, where the mark is expected to fail on trips.
- **What the label still is not.** It conditions on the menu shown. It says nothing about options the rules would
  have offered under another jitter (another tree, another partner): the model cannot choose those either.

**One change to §3, for cost.** Every fresh draw now costs some thousands of redraws (about 50 microseconds each), so
the held-out worlds of seed 21 are sampled at 0.09 like the training worlds, not 0.2. The held-out file still takes
750 fresh draws and 250 kept or arrived records per world, if the world yields them; the state probes draw from every
fresh draw of the two worlds.

### 10.2 Three details fixed while building, logged before any engine arm exists

None changes a mark or a statement of §6.

- **A1. Every engine arm has its own salt in the world's random stream** (21 onward; the control arms hold 1 to 18), as
  every control arm does (R7 §1). §5 did not say. Without it two trainings of one recipe would share a stream and
  their difference would understate the spread statement S0 reads.
- **A2. "Who decided" is read over the whole day.** §6.2 says waking minutes. The loop's counter (stage R5-gate's)
  credits every minute of the day, the night in the nest included, to who set the act in progress; the table says so.
- **A3. The kind-prior baseline uses the option families** of `scripts/em-sample.ts` (feed, food-trip, drink, rest,
  nest, affiliative, greet, aggression, mating, care, call, social-move, travel-home, other), which is finer than the
  four kinds of §6.1.4 and so a harder floor.

### 10.3 Iteration 0 as run (11 October 2026, 03:05 to 04:07 EDT; this agent; no model, no GPU)

No process of the model's Python environment was started at any point; the R9 chain ran beside this work throughout
(its status log shows step `03-arms-21` starting at 03:18 after its own check). One simulation at a time; the
1-minute load stayed between 2.5 and 4.9.

| Step | Head, tree | When | What |
| --- | --- | --- | --- |
| sampling, six worlds | 7774a25, clean | 03:22 to 03:46 | `scripts/r11-contexts.ts` per world with `--check` (179 to 270 s each) |
| assembly and data tables | 1fd98ee, clean | 04:14 to 04:17 | `scripts/r11-run.sh assemble`. Run three times (63d1aaf at 03:49, c8d4cfb at 03:53, 1fd98ee), each time after a row or a table was added to the data report and never after a change to a label or a packet; the training, development and held-out files of the last two runs have the same hashes |
| dry run, seed 48 | c8d4cfb, clean; again at 388740e, clean | 03:56 to 03:57; 04:18 | `scripts/r11-run.sh dry` (the second run after the tables' wording changed: the same end hashes, the same ten verdicts) |
| control arms, seeds 4111 and 4222 | 8d91c8b, clean | 03:57 to 04:01 | `scripts/r11-run.sh controls <seed>`: the first run ever made on these seeds |
| tables | 388740e | 04:19 | `scripts/r11-run.sh report`, then `publish` (first at 8d91c8b, 04:02; again when the card's heading was made to say whose test it is, and after the last assembly) |

Tables, each generated from JSON by a script: [r11-data.md](r11-data.md) and [r11-manifest.json](r11-manifest.json)
(the data), [r11-offline.md](r11-offline.md) (the offline floors; no adapter yet), [r11-card.md](r11-card.md) (stage
R7's card on the control arms of the test seeds), [r11-numbers.md](r11-numbers.md) (this stage's loop readings; control
arms only so far), [r11-dry-numbers.md](r11-dry-numbers.md) (the dry run; a fake worker, not a result).

### 10.4 The label: both marks met, and what the correction was worth

Every number in §10.4 to §10.8 is copied from the generated tables named above.

- **M1 met on 7,431 of 7,431 fresh draws** of the six worlds, on all three checks: the replayed belief draws end on
  the world's random state; the published score plus the belief draw has its first maximum at the option the rules
  took; the list and menu rebuilt at the true decision version are the rules' own. Every world also passed `--check`
  (with the taps, and the decision versions set and put back, it is the untapped world).
- **M2 met**: the label is calibrated against the rules' picks on every group (7,367 labelled fresh draws; 64 menus
  were too rare for a label):

| Options | Draws | The rules took one | Label mass | z | The fixed-menu column's mass | its z |
| --- | --- | --- | --- | --- | --- | --- |
| feeding | 7,355 | 0.293 | 0.290 | 1.28 | 0.256 | 14.00 |
| travel | 3,645 | 0.227 | 0.231 | −1.00 | 0.237 | −2.61 |
| rest | 7,365 | 0.366 | 0.366 | −0.09 | 0.385 | −6.55 |
| social | 6,408 | 0.263 | 0.265 | −0.54 | 0.279 | −5.47 |
| trips to food, day and dawn menus | 4,372 | 0.230 | 0.229 | 0.45 | 0.151 | 20.15 |
| carrying on the act in progress | 4,510 | 0.552 | 0.549 | 1.08 | 0.564 | −3.26 |

- **The reading first registered would have failed its own purpose.** Redrawing the offered options' jitter with the
  menu held fixed puts 0.151 on trips where the rules take 0.230: twenty standard errors off, and the same two numbers
  as the first adapter's shortfall (0.155 against 0.23). This stage cannot say whether that match is more than
  coincidence (that adapter was trained on realised picks, which are calibrated; the review explained its 0.155 by
  the kept rows). What it does show: a rules-taught model that judged a trip by the state alone, with no knowledge
  that the trip on the menu is the best of about fifty by a jittered score, would under-trip by a third. The menu
  tells the model something about the jitter, and an honest label has to carry that.
- **The mechanism, measured** ([r11-data.md](r11-data.md) §2): the jitter is uniform on ±0.12 before the menu is cut,
  but the trip that reached the menu was scored with a mean jitter of +0.065 and a positive one on 0.904 of menus
  (5,056 trip options); a drink +0.037 (0.733), a feeding option +0.017 (0.599); rest, a nest, a greeting or a call
  within 0.001 of zero (0.50 to 0.51). The more targets a kind of act is chosen from, the more its place on the menu
  says.
- **How noisy the rules' choice really is, given what the model is shown.** The label's top option is the one the
  rules took at 0.838 of training draws; the mean of the label's top mass is 0.834 (held out 0.837). So no reader of
  the state and the menu, however good, can agree with the rules' realised pick more than about 0.84 of the time, and
  0.396 of labels are clear (top mass 0.99 or more). Stage R4 took 0.98 as the ceiling (the pick is the top published
  score at 0.974 to 0.982 here too), but the published score already holds the jitter. Mean label entropy 0.381 nats.
- The label is a Monte Carlo estimate: 4,139 redraws per training draw on average; the median label rests on 500
  same-menu redraws (standard error at most 0.022) and 125 of 3,120 on 100 to 499. A redraw offers the same menu at a
  median of 0.22 to 0.26 of tries, which is itself a measure of how much the jitter shapes the menu.

### 10.5 The data

11,647 records in six worlds: 7,431 fresh draws (63.8%), 3,361 kept acts, 855 arrivals. 36.2% are not fresh choices
(the review found 35% in R4's files) and none of them is in a training file.

| File | Records | Animals | From |
| --- | --- | --- | --- |
| train (each arm) | 3,120 labelled fresh draws (R4: 3,122 labelled records, 2,091 of them draws) | 61 | 780 per world, seeds 48 and 7, both bases |
| dev (each arm) | 300 labelled fresh draws | 15 | 75 per world |
| held out | 1,500 labelled fresh draws, 427 kept acts, 73 arrivals | 38 | seed 21, 750 and 250 per world |

Hashes, per-world counts and the label statistics are in [r11-manifest.json](r11-manifest.json) (train: P5b
`38bddc0d…a1cd`, P5a `a96521c2…4c96`). No removed wording and no line an arm leaves out was found in any packet. No
record is of a first simulated day; on these days the body line still says "about to sleep" in 365 of 2,470 daytime
training packets (14.8%), an older mechanism output (R8 §9, question 1), not a first-day artefact.

**Length of each arm's packets (the project's estimate; training file).** P5b: median 409, 95th percentile 540,
largest 643. P5a: median 330, 440, 542. By block, mean tokens per packet: options 88.8, `nearby` 64.7, `lately` 56.4
(P5b only), `body` 53.8, `last` 33.3 (P5b only), `now` 30.7, `me` 29.7, `doing` 17.8, `asked because` 11.8,
instruction 8.5, `memories` 7.7 in P5b and 18.8 in P5a (the memory lines `last` replaces come back), `feeling` 6.9. So
the two lines of the ablation cost about 79 estimated tokens a packet. Projected real tokens at R8's measured ratio
(0.85): P5b median 348 (95th percentile 459), P5a 281 (374). **P5b sits at the 350-token target, not under it**; the
real count is the integrator's first check (`scripts/r11-run.sh tokens`).

### 10.6 The offline floors (no model), which mark O1 is read against

On the 1,500 held-out fresh draws ([r11-offline.md](r11-offline.md)): the kind-prior baseline's divergence from the
rules' distribution is 1.117 nats (1.059 to 1.173), a uniform chooser's 1.368; the labels' own entropy is 0.376. The
baseline's top option is the rules' pick at 0.381 (chance 0.183). On the 913 day and dawn menus with a trip, the rules
took it at 0.220 and the label puts 0.221 on it: mark O2 asks an adapter for 0.191 to 0.251. On the 913 menus where
the act in progress could go on, the rules carried on at 0.522 (label 0.523; 0.9 or more on 0.427 of them): the
reference of mark O4. Statement S2 reads an adapter's divergence against half the baseline's, 0.559.

### 10.7 The control arms on the test seeds (no model; the first run on seeds 4111 and 4222)

Burn-ins: seed 4111 `d785cc27356a6eae`, seed 4222 `cdb89a21a76b6184`; with the animals' own record removed each is
the plain burn-in built beside it (`37f7c89ddbed37fc`, `cdcccbc353a2d34e`). Focal animals by the earlier rule, five per
seed. One death in the window, in `mix30-b` on seed 4111.

| Row (ten animals, five days, both seeds) | The rules: mean ± SD | D | Random choice | 10% random | Told: random / 10% |
| --- | --- | --- | --- | --- | --- |
| act changes per animal-day | 53.9 ± 5.7 | 14.3 | 101.0 / 101.4 | 65.5 / 63.1 | yes / no |
| trips to food begun | 7.49 ± 0.68 | 1.72 | 12.52 / 12.40 | 9.84 / 9.92 | yes / yes |
| trips to food completed | 1.63 ± 0.23 | 0.56 | 0.38 / 0.54 | 1.50 / 1.70 | yes / no |
| time in a food patch, mean minutes per visit | 17.98 ± 0.94 | 2.36 | 19.75 / 19.25 | 17.24 / 17.18 | no / no |
| half-hour pairs in the same activity | 0.397 ± 0.010 | 0.025 | 0.399 / 0.378 | 0.402 / 0.371 | no / no |
| fresh choices that carry on the act in progress | 0.564 ± 0.013 | 0.031 | not read | not read | |
| reserve change, % of the cap per day (guard) | −0.050 ± 0.046 | 0.117 | −0.454 / −0.499 | −0.040 / −0.066 | yes / no |
| distance, km per day (guard) | 2.41 ± 0.24 | 0.59 | 3.87 / 4.15 | 3.08 / 3.17 | yes / yes |
| nights in a nest (guard) | 0.995 ± 0.009 | 0.023 | 0.500 / 0.400 | 0.980 / 0.980 | yes / no |

- **Said before any engine arm:** of the five registered timing rows, even random choice is told from the rules on
  three only (act changes, trips begun, trips completed). Time in a patch and the half-hour share do not tell random
  choice from the rules at this unit, so they can hardly tell an adapter; S1 and S2 will in practice be decided on the
  first three. Stage R7's whole card tells random choice from the rules on 9 of its 14 rows here, as on seeds 48 and 7.
- D is wider here than on the development seeds for act changes (14.3 against 8.9) and the same for trips begun
  (1.72 against 1.72). An adapter must move act changes by about a quarter to be seen.
- **Rows that leave room for "closer to wild chimpanzees" at this unit, under R7's amended rule: two, as expected.**
  Time in a patch (the rules 18.0 minutes, 9.0 below the band of 27.0 to 46.2; the best of the family, random choice,
  7.5 below; D 2.4) and the half-hour share (0.397 against Taï's 0.476; an anchor of another subspecies, a direction
  only). On all twelve short-scorecard rows that have a value at this unit, some arm of the rules-plus-random family
  is already inside the band: no claim can be made there whatever an engine does.

### 10.8 The dry run (seed 48, one day after one; a fake worker that holds no model)

All ten registered properties hold ([r11-dry-numbers.md](r11-dry-numbers.md); `artifacts/r11/dry/dry-checks.json`):
6 of 6 arms replay from their receipts to their run's world with no receipt whose decode differs and no held draw
re-rolled; the P5b arms were sent packet 5 (the lines `me`, `feeling`, `doing`, `asked because`, `body`, `now`,
`nearby`, `lately`, `last`, `memories`, the one-sentence instruction, no `urgent` line); the P5a arm was sent neither
`lately` nor `last`; the old arm was sent the state-only packet (with its `urgent` line and two-sentence instruction);
two decode salts give two worlds; every arm ran on its own stream from one burn-in; the card read every arm; every
receipt notes where the act in progress stands on the menu. The asks ran through the model arms' own path (worker
process, guarded scorer, GLiNER kernel, receipts, decode, replay): 250 to 345 asks an arm, 50 to 69 per animal-day.
Stage R7's report took the engine arms beside the control arms (`--engine`), and the offline report read score files
written by the fake worker's rule. Nothing in those tables is a result.

### 10.9 The trainer, reviewed without running it

`training/decide_ft/train_r11.py` was made from `train_r4.py` by a patch, and the diff of the two files was read line
by line. Besides the header text it has these changes and no other: (1) a row's `soft` label is carried beside its
pick through the shuffle (`soft_loss.permuted_soft`, asserted equal to `common.permuted` on every row at start);
(2) the loss line `F.cross_entropy(lg[None], target)` became minus the sum of the target vector times
`F.log_softmax(lg)`, the target from `soft_loss.target_vector` in the order of the logits (the existing assertion on
that order is kept); (3) a self-check on the first batch: with a one-hot target the new line must equal the old one,
and it must equal the dependency-free reference; (4) the development loss is the same soft cross-entropy (the pick's
own loss and accuracy are still reported); (5) `--labels soft|hard`; (6) the manifest names the stage, the label kind
and the loss. The seeded shuffle, the epoch order, the schedule, the LoRA placement, the out-of-memory retry and the
random draws consumed are R4's. `training/decide_ft/test_soft_loss.py` (the system's python3 3.9, standard library
only): 9 tests, 9 pass.

### 10.10 Checks at the end of this agent's work

`tests/r11.test.ts` 10 tests (the label arithmetic; the sampler on two worlds with `--check`; rows and calibration;
the P5a variant; the files and their manifest; the reports' helpers; the registered arms and seeds; an engine arm with
a stand-in kernel: packet 5 reaches it, the card reads it, the replay reproduces it). Two sampling runs of one world
give byte-identical records (checked once, on a short window). Results of it and of the neighbouring files are in
§10.12. Nothing under `src/` or `data/` was changed by this stage (`scripts/r5-pilot.ts` gained three optional
arguments, `scripts/r8-contexts.ts` one optional hook and `scripts/r7-report.ts` an optional title and note; absent,
all three run as before), so the goldens and the field pin cannot have moved; `tests/sim-track-e.test.ts`, the whole suite and the build were not run.

### 10.11 Not done, and what could not be verified tonight

- **Nothing was trained and no model was loaded.** No adapter of this stage exists. Marks O1 to O4, statements S0 to
  S3, L1 and the ablation are all unread.
- `train_r11.py` has never been executed: it parses, its arithmetic is tested in `soft_loss.py`, and its two self-checks
  run at its first start. `parity.py`, `em_score.py` and the worker have never met this stage's files or adapters.
- **Real token counts were not taken.** Every length here is the project's estimate; the projection to real tokens
  rests on a ratio R8 measured on other days.
- **Every time estimate is a projection** from R4's and the review's measurements through the power law.
- The label conditions on the menu shown and is a Monte Carlo estimate (§10.1, §10.4). 64 fresh draws had no label.
- The rules' continuation bonus and finished penalty are in the label (§2). So is everything else the rules value.
- The lock-in check of the loop reads fresh choices only; with the gate on, kept acts never reach the model.
- One recipe, two training seeds: S0 can flag a spread, it cannot estimate one.
- The stage's scripts were type-checked with a temporary configuration (`tsconfig.json` covers `src/` only).

### 10.12 Test results (11 October 2026, 04:02 to 04:07 EDT; head 8d91c8b; one file at a time)

| File | Tests | Pass |
| --- | --- | --- |
| `tests/r11.test.ts` (10 since 04:12: one more for the reports' helpers) | 10 | 10 |
| `tests/r5-pilot.test.ts` | 5 | 5 |
| `tests/r9-decode.test.ts` | 11 | 11 |
| `tests/r4b.test.ts` | 8 | 8 |
| `tests/r8-packet.test.ts` | 21 | 21 |
| `tests/r7-engine.test.ts` | 2 | 2 |
| `tests/r7-card.test.ts` | 15 | 15 |
| `tests/r10-night.test.ts` | 13 | 13 |
| `tests/r10-wiring.test.ts` | 6 | 6 |
| `tests/r4-packet.test.ts` | 7 | 7 |
| `training/decide_ft/test_soft_loss.py` (python3 3.9.6, standard library) | 9 | 9 |

`tsc --noEmit` clean; the stage's scripts and tests also pass the same strict check run on them directly;
`gen-params --check` valid (1,050 entries, no parameter added). `git diff a11c45c -- src data` is empty. One test of
this stage failed once while it was being written and found a real defect, repaired before the tables above were
made: the comparison column's arithmetic counted a tie twice when two belief offsets differed by a whole number of
thousandths (it cannot happen with the simulation's own offsets, and the training label does not use that code).
Not run: the whole suite, the build, `tests/sim-track-e.test.ts`.

## 11. Review and amendments (the reviewer, 11 October 2026; logged at 12:01 EDT, before any model run)

The builder stalled at 04:19 inside its last check and wrote no report. A second agent reviewed the branch on 11
October from 11:30 EDT and finishes the stage here. When this section was written: no process of the model's Python
environment had ever been started by this stage, no adapter existed, the control arms of seeds 4111 and 4222 were on
file and had been read (§10.7), and stages R8, R9 and R7b had reported (frozen checkout `bench-t1` at a11c45c; tables
`r8-wording-numbers.md`, `r9-numbers.md`, `r9-seed2-numbers.md`, `r7b-numbers.md`). So §11.1 to §11.4 are written with
the control arms and those three results in view and with no engine arm of this stage in existence. None of them
makes a registered mark or statement easier to meet: two add a mark that can fail (N1, W1), one adds a table, one
fixes an order and says what one training seed may carry, one withdraws a claim. Marks O1 to O4, statements S0 to S3,
L1, the ablation rule, D and the guards stand as registered in §6.

### 11.1 The decode: the top pick, a draw arm beside it, and nights in a nest under a draw (amends §5)

**What stage R9 found** (ten focal animals, five days, seeds 21 and 5, the gate on; r9-numbers.md). A draw does what it
is for: the first adapter begins 5.0 trips a day against 2.3 with the top pick (the rules 8.3) and changes act 46.4
times against 33.6 (the rules 47.6). It fails "does no harm": nights in a nest 49 and 48 of 50 against 50, and
reserves lower in one salt. A held draw is worse for the first adapter (42 of 50 nights, 145 kcal less a day). By the
registered statements and R9's amendment A1 neither decode becomes the standard. R9's reading: a hedged model plus a
draw makes the occasional other choice exactly where the rules are near-certain (nesting at dusk).

**So, for this stage:**

- **The registered primary decode is the top pick.** S0 to S3, L1 and the ablation are read on the top-pick arms.
- **One draw arm (decode salt 1) runs beside the top pick for every new adapter**; `p5b-s7` also runs salt 2, so one
  salt spread is on file. This is the branch §5 registered for "R9 names no standard". The branches `draw` and `held`
  of §5 are closed: `scripts/r11-run.sh` refuses `R11_DECODE` set to anything but the top pick.
- The statements are repeated for the draw arms as a second line, as §5 registered; no outcome is named from it.
- **The reading, fixed now.** This stage's adapters are taught the rules' own odds, not one-hot picks. Where the rules
  are near-certain (0.396 of training labels put 0.99 or more on one option, §10.4) such an adapter should be
  near-certain too, so a draw from its odds should stop costing nests while still spreading choices where the rules
  themselves are spread.
- **Mark N1, nights in a nest under a draw** (it can fail). Read for each draw arm of an adapter, its two seeds pooled
  (50 animal-nights when nobody dies; a night counts from 0.9 of its dark ticks in a nest, the card's rule):
  1. no more than one night out of a nest beyond the same adapter's top-pick arm, and the paired 95% interval over
     animals of the difference in the share of nights (draw less top pick) not wholly below 0. This is R9's rule H1;
  2. the arm's share of nights in a nest not below the rules' mean by more than D on this test's own control arms.
     This is the registered guard of §6.2, read for the arm alone (the guard of §6.2 fails for a recipe only when
     every realization is below the line). On the control arms on file the rules spent 398 of 400 nights in a nest
     (two re-draws lost one night each), mean 0.995, D 0.023: the line is 0.972, so **49 of 50 nights keep it and 48
     do not**.
  An adapter meets N1 when every draw arm of it on file meets both parts. **The recipe P5b meets N1 only when both its
  trainings do.** If it does, the result reads: for a model taught the rules' own odds the draw no longer costs nests
  on these worlds. If it does not: the draw still costs nests even then, and it stays an arm beside the top pick,
  whatever it does to timing. N1 replaces no guard and enters no statement of §6.2. What it cannot show: one night is
  a fiftieth of an arm, so N1 tells a draw that loses two or more nights from one that loses none, and cannot tell one
  lost night from none (two of the rules' own eight re-draws lose one).
- **Offline, beside N1 (a table, no mark):** on the held-out fresh draws where the label puts 0.99 or more on one
  option, and on those of them at dusk or night whose option is a nest, the adapter's mean probability on that option,
  the share at 0.9 or more, and 1 less the mean: how often one draw would leave the rules' option at such an ask
  (`r11-offline.md` §11).
- **One optional arm, last in the order:** the old adapter under a draw (`old-draw-1`) on the same worlds, as a
  reference for N1 (its draw arms on seeds 21 and 5 kept 49 and 50 of 50 nights). No statement or mark needs it;
  `scripts/r11-run.sh arms <seed> old-draw-1` runs it if time allows.

### 11.2 Training seeds: the order when model time is short, and what one seed per arm may carry (amends §4 and §5)

**What stage R9's second training seed found** (r9-seed2-numbers.md, r9-numbers.md). The first recipe trained again
with seed 11 equals its first training offline (0.597 against 0.609 on the rules' decision; trip probability 0.148
against 0.155) and is the same animal in the loop under the top pick (trips begun 2.4 against 2.3 a day; act changes
33.2 against 33.6). Under a draw the two trainings differ more (trips begun 7.4 against 5.0: a difference of 2.4,
above the 1.72 that one arm can show at this unit).

**So:**

- Two training seeds per arm stay registered, and S0 with its consequence (three seeds) stays as it is.
- **The order when model time is short** (replaces "P5b before P5a; within an arm training seed 7 before 11"): train
  `p5b` seed 7, then `p5a` seed 7, then `p5b` seed 11, then `p5a` seed 11. The loop arms follow the same order, the
  top pick before the draw: `p5b-s7-top`, `p5a-s7-top`, `p5b-s7-draw-1`, `p5a-s7-draw-1`, then the same four for seed
  11, then `p5b-s7-draw-2`; the old adapter's top-pick arm last. An arm's world stream is fixed by its name (§10.2,
  A1), so the order changes no arm.
- **What may be claimed from one training seed per arm.** Nothing registered for a recipe: S0 to S3, L1 as a recipe's
  mark, N1 for the recipe, the ablation's rule and the offline marks O1 to O4 all need both trainings, and the reports
  print "not read" until both are on file. What may be said is this, in these words: "one training of the recipe":
  per adapter, on which timing rows its top-pick arm is told from the rules, which guards it holds, its offline
  readouts and its lock-in share; and, because the first recipe's two trainings agreed under the top pick, that a
  second training is expected to agree under the top pick, which is an expectation and not a result. A difference
  between P5b and P5a from one training each is a description. Anything read on a draw arm from one training is a
  description only: under a draw the first recipe's trainings differed by more than D.

### 11.3 Scoring: this stage claims nothing about wild chimpanzees (amends §6.2, "Closer to wild chimpanzees")

**What stage R7b found** (no model; r7b-numbers.md). With "closer to the field" measured as the distance outside the
band (R7's amendment, §13a), the rules already sit inside the band on 11 of the 15 scorecard rows at the population
unit and on 10 of 12 at ten animals; an engine can be shown closer on one row at the population unit and on none at
ten animals. This stage's own control arms say the same (§10.7: on all twelve scorecard rows that have a value at
this unit some arm of the rules-plus-random family is already inside the band). Forked body outcomes do not repeat
(0.39 against a registered line of 0.70), so no outcome labels are added to this recipe.

**So:**

- **The paragraph "Closer to wild chimpanzees" of §6.2 is withdrawn for this stage.** No row, and no engine, is
  reported as closer to wild chimpanzees, whatever the numbers are. The registered rule is not loosened; the claim is
  removed.
- **The stage's claims are about timing against the rules and the control arms**, on the test's own worlds: the five
  timing rows against the rules' mean ± D, with random choice and the mixtures beside them; the five guards; lock-in
  (L1); nights in a nest under a draw (N1).
- **The timing card's field anchors are printed as description:** patch residency beside the two Kibale site means
  (27.0 and 46.2 minutes) and the half-hour share beside the Taï value (0.476; another subspecies, a direction only).
  The report's §5 keeps the arithmetic of R7's amended rule so that a reader sees where each arm stands; its cells say
  "nearer (description)", never "closer", and its heading says that nothing there is a result.

### 11.4 The wording test as this stage's baseline (adds to §6.1)

**What stage R8's wording test found** (r8-wording-numbers.md). The existing adapter `r4-rules-state` picks the rules'
decision on 0.609 of its 954 held-out fresh draws with today's packet and on 0.386 with neutral option labels (paired
difference −0.223, −0.262 to −0.184 over animals; chance 0.186; the untuned model 0.286). By kind: feeding 0.357 to
0.213, rest 0.822 to 0.530, social 0.541 to 0.195, travel 0.707 to 0.783. More than half of what it had learned over
chance was read from the rules' own sentences. That adapter was trained with the wording, so 0.386 is a floor for
what the state alone can teach, not a ceiling.

**So, for this stage:**

- **The baseline is 0.386**: the first adapter's top-1 agreement with the rules' decision once the wording is gone.
  Beside it, on this stage's own 1,500 held-out fresh draws (§10.6): chance 0.183; the kind-prior baseline, which
  holds no model and knows only which kinds of act are on the menu, 0.381; and the ceiling 0.839 (the label's top
  option is the option the rules took on that share of these draws, so no reader of the state and the menu can agree
  more). The old adapter without the wording thus read about as much as a table of how often each kind of act is
  taken.
- **W1** (it can fail), per adapter, on the 1,500 held-out fresh draws on its own arm's packets: its top-1 agreement
  with the rules' pick lies above 0.386 with the whole of its 95% interval over animals, **and** above the kind-prior
  baseline on the same draws with a paired interval above 0. For the recipe P5b both trainings must meet it. If they
  do, the result reads: the honest packet teaches more from the state than the first adapter had without the rules'
  wording. If an adapter is at or under either number: this recipe taught no more from the state than a table of
  kinds, whatever it learned about rates. The table also prints how far each model is from chance to the ceiling.
- **A yardstick, not a pair.** 0.386 comes from other draws of the same seed and bases (stage R4's held-out days; this
  stage's held-out days are later and longer). The like-for-like figure, the first adapter scored on this stage's
  held-out draws on its own packet with neutral options, is not built (§11.8).
- **Agreement with the rules is not the goal of this stage.** The teacher is the rules, so the ceiling of agreement is
  the rules themselves, and a model at the ceiling would be no better than its teacher and no nearer to a chimpanzee.
  The stage asks whether honest inputs and labels give the rules' timing in the loop (S1), whether the limit is what
  the packet shows (S2), whether showing the act in progress locks the model in (O4, L1), and whether a draw then stops
  costing nests (N1). W1 is a reading beside the marks O1 to O4, not one of them.

### 11.5 What the review re-derived (no model; plain python3 and one short simulation on seed 48)

- **The registration came first.** Commit 456640f (03:06:19) holds §1 to §9 and nothing else; the sampler's parts are
  dated 03:26 to 03:46 and the 32 control-arm files of seeds 4111 and 4222 03:58 to 04:02, every one at head 8d91c8b
  on a clean tree. The three scratch runs disclosed in §10.1 came after the registration and before any label file.
- **The label, from the jitter-free scores.** On 2,460 labelled fresh draws of three worlds, the rules' rule applied to
  the saved values, jitter and belief draws gives the realised pick 2,460 times, and the published score saved on
  every option is the value plus the jitter, clamped and rounded. On a dozen records (four clear, four near ties,
  four with a belief draw) a brute-force redraw written for the review (200,000 redraws each) reproduces the files'
  fixed-menu column within 0.003; every label sums to one; the 53 cases whose values are further apart than the
  jitter span carry all the mass on the realised pick in both columns; near ties share it (mean top mass 0.48 in the
  fixed-menu column, 0.50 in the trained label).
- **The trained label, by a second route.** A separate script (another sequence of decision versions, a fresh
  candidate list per redraw, the simulation's own `beliefOffset` on a private random state, 4,000 redraws a decision)
  was run beside the builder's `labelData` on 215 fresh draws of a short world (seed 48, two days of burn-in, one day
  sampled). The two estimates agree within Monte Carlo error (mean squared z 1.18 over 415 options; top option the
  same on 214 of 215; mass on the realised pick 0.789 and 0.790; by family within 0.002), the tapped world equals
  the untapped one and `world.rng` is where it was. The rules' rule in `src/sim/rg.ts` (`rgChoice`, `choiceBelief` 2)
  was read against the label code: the first maximum, in menu order, of the published score plus the belief offset.
- **Nothing of the rules' valuation in a training row or packet.** A training row holds, per option, the alias, the
  act, the target and the family; no score. The options stand in one fixed order of acts on every menu (238 pairs of
  acts, none ever in the other order) and, within an act, in order of the target's id (928 of 928); the first of two
  such options carries 0.118 of the label and the second 0.114. The `nearby` line is in order of distance on 2,845 of
  2,845 packets; the partner of the rules' social pick stands first on it at 0.533 against 0.412 if its place were
  random (the rules prefer near partners, which the distances show), where every earlier packet listed the rules'
  first partner first (162 of 162, stage R8). A predictor that knows only the position of an option agrees with the
  rules at 0.240 (chance 0.180; the kind-prior baseline, which knows the kinds, 0.381). No removed wording, no word
  such as "score", "urgent" or "should" and no decimal fraction in any training packet.
- **Splits.** Training and development: seeds 48 and 7, 61 and 15 animals, none in both; held out: seed 21 only, 38
  animals; no id in two files; the earliest record is at simulated hour 144 (day 6); 780 and 75 rows per world, taken
  in a hash order of the record's id and never by label; training and development rows are fresh draws only; the two
  arms hold the same records, order and labels.
- **P5a against P5b.** Over 3,420 rows the two packets differ in the lines `lately` (3,420), `last` (3,300) and
  `memories` (2,528) and in nothing else; the instruction and the options are the same. **The `memories` difference
  matters for how the ablation is read:** without `last`, P5a carries one memory line in every row (P5b in 1,272 of
  3,120), often the animal's latest grooming or greeting ("Groomed Aroko 2 times, most recently 15 h ago"). So the
  ablation compares "the lines `lately` and `last`" with "one memory line as in every earlier packet", not with "no
  social timing at all". §1 registered this; the report must say it when the ablation is read.
- **Seeds.** 4111, 4222, 4333 and 4444 lie in no reserved or retired range of `AGENTS.md`. Files named for 4111 or
  4222 exist only under this worktree's `artifacts/r11/loop` (the control arms and their burn-ins); nothing is named
  for 4333 or 4444 anywhere under the main checkout or a worktree. Stage R12's design proposes the same pair for the
  loop test of its second build step (r12-prereg.md): since this stage has opened it, R12 takes 4333 and 4444, and a
  new sealed pair must be named for whatever comes after (the user's decision, below).
- **The trainer.** `train_r11.py` was read line by line against `train_r4.py` (the diff is the six changes of §10.9;
  no class weight, no resampling, no temperature, the same seeds, schedule and LoRA placement). The loss was checked
  by hand in plain python3: for logits 2, 1, 0 and a label 0.7, 0.2, 0.1 the loss is 0.807606 by hand and by
  `soft_loss.py`; it equals the label's entropy plus the divergence; with a one-hot label it is the usual
  cross-entropy; its gradient is the softmax less the label; the shuffle keeps every option's mass with its text.

### 11.6 Defects found by the review and repaired (none changes a label, a packet, a training file or a mark)

1. **A wrong arm name could wait half an hour before it was refused.** `scripts/r11-run.sh arms <seed> <names>` checked
   the names only inside the loop script, after the swap hold (up to 30 minutes) and after the burn-in was read. Now
   the names, the control arms on file, the arms already on file and the adapters needed are all checked first.
   (The builder's last check could not have blocked: its seven calls all refuse on their arguments at once. But it
   proved nothing: the tool's shell does not split an unquoted variable, so every call reached the script as one
   word and printed the usage line. Run properly, 15 wrong calls are refused in under a second each.)
2. **An arm could be answered by the untuned model.** The worker loads only the adapters it is told to and finds, and
   answers every name with the untuned model when it loaded none. `arms` did not check that the adapter exists. Now
   the run script refuses an arm whose adapter is not trained, and `scripts/r11-loop.ts` checks the worker's ready
   line before the first ask and stops if the arm's adapter is not there.
3. **A second `loop` call ran every arm again.** With the trainings spread over two nights the first night's arms
   would have been run twice, a second draw of a result. Now `loop` skips an arm that is on file (and replays one
   whose replay is missing), and `arms` refuses one unless `R11_RERUN=1` is set after the reason is logged here.
4. **Any number was taken as a training seed.** `train p5b 1` would have trained an adapter no arm reads. Now 7 and 11.
5. **No log was written**, though the launch notes said logs were kept. Every model step now writes its output to
   `artifacts/r11/logs` as well as to the terminal, and keeps the step's own exit status.
6. After a swap hold the script did not look again for another model process. It does now. `check` now prints every
   reason a model step would refuse or wait, not only the first.
7. `R11_DECODE` set to an unknown word reached the swap hold before failing; with §11.1 it is refused at once unless
   it names the top pick.

### 11.7 Real token counts (the tokenizer alone, CPU, no weights; 11:56 EDT)

Taken by the review with `training/decide_ft/r8_tokens.py` on every training packet and every held-out packet.
Training file, P5b: median 340, 95th percentile 468, largest 548 (the estimate's median was 409; real over estimate
0.83); 1,399 of 3,120 packets are over 350. P5a: median 295, 95th percentile 408, largest 488 (0.90). Held-out fresh
draws: P5b 337 (462, 562), P5a 292 (406, 484). **P5b is under the 350-token target at the median, by ten tokens**; the
two lines of the ablation cost 45 real tokens at the median. By the stage's own time law (0.85 s an example at 450
real tokens, time as tokens to the power 1.5) the projected training cost is 0.58 s an example for P5b and 0.48 s
for P5a: about 1 h 31 min and 1 h 14 min for three epochs of 3,120 rows, before the development passes.

### 11.8 Not done by the review, and what stays unverified

- Nothing was trained and no model was loaded: a whole-population run on the real model held the GPU from 11:27.
- The like-for-like wording baseline (the first adapter on this stage's held-out draws, its own packet with neutral
  options) is not built: about 30 minutes of model time and a second packet rendering in the held-out file.
- P5a was left as registered (one memory line comes back). A stricter ablation, P5b with the two lines deleted and
  nothing else changed, would need the files assembled again and is the user's choice.
- The whole test suite and the build were not run; the merge with `track-e` (which moved to 241bceb at 11:32, with
  stage R7b's changes to `scripts/r7-report.ts`) was tested for conflicts in memory only (`git merge-tree`: none; the
  merged report script keeps this stage's `--title` and `--note` and every export this stage imports; nothing under
  `src/` or `data/` moved on `track-e`, so the burn-ins stay valid). The merged tree was not run: the dry run is the
  first step of the launch order for that reason.
- `train_r11.py`, `parity.py`, `em_score.py` and the worker have still never met this stage's files: the trainer
  parses, its arithmetic is tested and was checked by hand, and its two self-checks run at its first start.
- Every time estimate is arithmetic on other stages' measurements.

### 11.9 The review's runs (11 October 2026, 11:30 to 12:10 EDT; no model, no GPU)

One simulation at a time; the 1-minute load stayed between 2.0 and 3.5; the population run under `bench-t1` was not
touched. The amendments (commit a9e17bf, 12:03:12) came before the script repairs and before the dry run below.

| What | Head, tree | When | Result |
| --- | --- | --- | --- |
| the builder's unfinished check: 15 wrong calls of `scripts/r11-run.sh`, the interpreter replaced by `/usr/bin/false` | e61d0b4, clean | 11:42 | every call refused on its arguments in under a second; `check` saw the population run's worker and refused |
| the label by a second route (seed 48, two days of burn-in, one day sampled, `--check`) | e61d0b4, clean | 11:46 to 11:52 | §11.5 |
| real token counts (CPU, the tokenizer alone) | e61d0b4 | 11:56 | §11.7 |
| the repaired script: 26 wrong calls, the loop's listing with no adapter anywhere, `check`, the log wrapper | ff21849, clean | 12:03 | every wrong call refused at once (a wrong arm name in under two seconds, with or without another model process alive); nothing can start |
| `scripts/r11-run.sh dry` (seed 48, the fake worker) | 1f9711e, clean; again at ff21849, clean | 12:03 to 12:04; 12:05 to 12:06 | all ten verdicts hold, 6 of 6 replays; the same end hashes as the builder's two runs |
| `scripts/r11-run.sh report`, `publish` | ff21849 | 12:06 | the tables of this commit; the data manifest unchanged |
| `tests/r11.test.ts` | ff21849 | 12:07 to 12:10 | 11 of 11 (one added: N1 and the wording baseline) |
| `tests/r7-engine.test.ts`, `r5-pilot`, `r9-decode`, `r8-packet`, `r7-card` | ff21849 | 12:07 to 12:10 | 2, 5, 11, 21 and 15: all pass |
| `training/decide_ft/test_soft_loss.py`, the loss by hand | ff21849 | 12:00; 12:10 | 9 of 9; §11.5 |
| `tsc --noEmit`, the stage's scripts under the same strict check, `gen-params --check` | ff21849 | 12:10 | clean; 1,050 entries, none added; `git diff a11c45c -- src data` is empty |

## 12. The last check before the training nights (a second agent, 11 October 2026, from 12:12 EDT)

The trainer and the soft labels had never met the model runtime. This section looks for anything that would waste a
night: what was read again, what was repaired, a smoke run (logged in §12.3 before it runs) and the measured costs. It
changes no label, packet, training file, setting, mark or statement. A whole-population run on the real model held the
GPU until about 14:40; §12.1 and §12.2 were done while it ran, with no model (the tokenizer alone, on the CPU).

### 12.1 What was read again (no model)

`training/decide_ft/train_r11.py` against `train_r4.py`, `common.py`, `parity.py`, `em_score.py`, `adapters.py`,
`worker.py`, `r4_py.sh` and `scripts/r11-run.sh`, for faults that only show at run time.

- **Paths.** Every Python path is `MGOGO_FT_ROOT` joined to the checkout's root, and an absolute `MGOGO_FT_ROOT`
  replaces the root, so the launch order's absolute `R11_FT_ROOT` reaches the same files from a frozen checkout.
  `train` writes to `<root>/adapters/r11-<arm>-s<seed>`, `offline` reads `<root>/eval/all.jsonl` and writes
  `all.<adapter>.jsonl` beside it, `parity` reads `<root>/<arm>/contexts/dev.jsonl`. The first adapter is found under
  the worktree `r4b-retrain` and has its manifest.
- **Runtime variables** (HANDOFF.md §3 item 3). The run script exports `MGOGO_GHN_ROOT`, `MGOGO_DECIDE_PYTHON`,
  `HF_HOME`, `HF_HUB_CACHE` and the two offline flags; `r4_py.sh` adds the MPS memory lines (0.6 and 0.4) and
  unbuffered output; the loop's worker gets the same from `scripts/ft-society.ts`. Nothing is read from the internal disk.
- **Names.** The run script, the loop (`ADAPTERS` in `scripts/r11-loop.ts`) and the offline step agree on
  `r11-p5b-s7`, `r11-p5a-s7`, `r11-p5b-s11`, `r11-p5a-s11`; an adapter is read on its own arm's packets by its name.
- **Overwrite and resume.** The trainer has no resume: a training cut short starts again from the first step. The
  trainer alone would write over a folder; the run script refuses to. One fault was here (§12.2, repair 1).
- **Out of memory on MPS.** As stage R4: the batch is shown again one example at a time after the cache is emptied.
  If one example alone still does not fit, the run stops. The cap on this machine is 7.1 GiB; stage R4 trained under
  it with longer packets (its table T2: a median of 452 real tokens, the largest 646); this stage's longest training
  packet has 548.
- **The saved epoch** is chosen as stage R4 chose it: the epoch with the lowest development loss, the first on a tie;
  the loss is the one trained on (the soft cross-entropy, as registered in §4).
- **The training seed** reaches the adapter's starting weights and the dropout (the library's generators, CPU and
  MPS), the order of the examples and which of the two option orders each is shown in. As in stage R4, the shuffled
  order of a row is fixed by the row's id, not by the training seed, so both trainings see the same two orders.
- **The files once more** (plain `python3`): in all 6,840 training and development rows the label names exactly the
  options offered, no mass is negative, the realised pick has mass, and no row carries an `epoch` field (which would
  hide it from two of three epochs); the sums differ from 1 by at most 0.000002 (the trainer renormalises). Both
  arms hold the same rows, order, options and labels. On all 6,240 training rows the shuffle keeps each option's
  mass with its text.

**Real token counts of every packet a model will read** (the tokenizer alone, `r8_tokens.py`'s counter; 12:14 EDT;
95th percentile as `token_audit.py` takes it). 15,680 packets; the largest has 562 tokens; none is over 1,280. A
shuffled training packet has the same count as its own order on 6,240 of 6,240.

| Packets | Median | 95th percentile | Largest | Over 1,280 |
| --- | --- | --- | --- | --- |
| P5b, training (3,120) | 340 | 467 | 548 | 0 |
| P5b, development (300) | 321 | 461 | 529 | 0 |
| P5b, held-out fresh draws (1,500) | 337 | 462 | 562 | 0 |
| P5b, every held-out row (2,000) | 328 | 458 | 562 | 0 |
| P5b without `doing` (1,340) | 315 | 443 | 541 | 0 |
| P5b probes (1,080) | 338 | 476 | 561 | 0 |
| P5a, training (3,120) | 295 | 408 | 488 | 0 |
| P5a, development (300) | 285 | 404 | 466 | 0 |
| P5a, held-out fresh draws (1,500) | 292 | 405 | 484 | 0 |
| P5a, every held-out row (2,000) | 285 | 400 | 484 | 0 |
| P5a without `doing` (1,340) | 275 | 388 | 472 | 0 |
| P5a probes (1,080) | 297 | 413 | 491 | 0 |

### 12.2 Four repairs, made before the smoke run

1. **A training cut short could have been read as a trained adapter** (major). The trainer saves the weights of the
   best epoch so far and writes `manifest.json` last. The run script took the weights alone as "trained". Had a
   training died in its second or third epoch, `offline` and `loop` would have scored the first epoch's weights and
   run its arms as if they were the result, and with the launch order pasted line by line nothing would have stopped
   them. Now an adapter is on file only with its manifest; weights without one are named a training cut short by
   `check`, never scored, never sent into the loop, and `train` refuses until the folder is deleted. Tried on a
   scratch folder with one such adapter: `train`, `offline`, `loop`, `arms` and `check` each say so and start nothing.
2. **The model-process guard could refuse a night's step for a shell that only names the interpreter** (minor). It
   matched the interpreter's path anywhere in a command line. A started interpreter is listed under the framework's
   path (the script names catch it), so in practice the path matched only shells and monitors whose text holds it
   (an `export`, a `ps | grep`): seen at 12:22, when the old line listed this agent's own shell. The path now counts
   only at the start of a command line, and the app's resident worker (`-m …decide_provider`) is looked for as well.
   The new line still lists the population run's worker.
3. **The trainer** (two additions; the loss, the settings and the random draws are untouched). A missing `--extra`
   file now stops it before the model loads, not after the last epoch, where it would have cost the manifest. The
   self-check runs on the first example and again on the first example whose label is spread over options, and each
   prints its logits, target and pick, so the loss can be redone by hand from any training's log.
4. **The swap hold could cost hours of a night for nothing** (major for the time, harmless for the results). Every
   model step held for up to 30 minutes while swap in use was above 6 GB, then went ahead whatever swap did. On the
   night of 11 October two steps of stage R9 each waited the whole half hour at an unchanged 6,455 MB
   (`bench-t1/artifacts/t1-chain`, the lines "machine before model load": 03:48 and 05:34, "waited 30 min"): swap
   held by other programs does not drain. Night one of this stage has nine model steps and swap stood at 5,333 MB at
   12:20, before any training. The hold now lasts only while swap keeps falling (50 MB in five minutes), 30 minutes
   at most, and the step's first line says when it went ahead above the line. Tried with scripted readings: no wait
   under the line; 5 minutes at an unchanged 6,455 MB; the whole fall when swap drains; 30 minutes at most.

### 12.3 The smoke run, logged before it runs (12:25 EDT)

After the population run has ended and no model process is alive; one model process at a time; about 12 minutes of
model time in all. It is a check of the machinery, never a result: no number from it enters a table.

- **Parity** (CPU): `scripts/r11-run.sh parity p5b`, then `parity p5a`: training inputs against the serving path on
  12 development packets each. Each must print `PARITY OK`.
- **Smoke training** (MPS): the run script's own `train` line with another root, name and number of epochs:
  `MGOGO_FT_ROOT=<worktree>/artifacts/r11/smoke training/decide_ft/r4_py.sh train_r11.py --name smoke-p5b-s7 --train
  p5b/contexts/train.jsonl --dev p5b/contexts/dev.jsonl --extra p5b/contexts/manifest.json --epochs 2 --seed 7
  --labels soft`. The scratch root holds 164 rows of the real P5b training file (every 20th row and the 8 longest:
  mean 355 real tokens against the file's 347, so the longest batch a night can meet is in it), 34 rows of the real
  development file (every 9th) and a copy of the arm's manifest. 42 optimiser steps. Read from its log and files:
  the two self-checks; the loss of the logged examples redone by hand; every loss finite; the running loss and the
  development loss against the untuned model's; peak memory against stage R4's 6.8 GiB; seconds per example; the
  manifest and its fields; no out-of-memory retry.
- **The saved adapter loaded again** (MPS): `em_score.py` on the 34 development packets (the development loss
  redone from the loaded adapter's answers must be the saved epoch's, within the difference between serving
  precision and training precision) and on 125 held-out fresh draws of seed 21 (every 12th), read for shape and
  for seconds per packet only: one probability per option, summing to 1. No agreement is read from held-out draws.
- **The loop's ask path** (MPS): `worker.py` started as the loop starts it, with the smoke adapter named: its ready
  line must carry the adapter with the file's hash; 25 held-out packets asked one at a time (shape, seconds per
  ask), 8 of them also of the untuned model (the answers must differ: the adapter is in use). A copy of the smoke
  adapter under a second name is loaded beside it, as a night's worker holds two adapters: asked of the copy, the
  same 8 packets must give the same answers, and the first adapter the same again after the switch (added at 13:21,
  before the run).
- Afterwards `artifacts/r11/smoke` is deleted. Nothing is written under `artifacts/decide-ft/r11`.

## For the integrator

*(Rewritten by the reviewer on 11 October 2026 after §11; the builder's notes are kept where they still hold.)*

**Read first.** (1) Nothing here is a result about an engine: the stage delivers data, a trainer, a loop arm, the
control arms and the reports. No model was loaded and the trainer has never been executed. (2) The label is not the
one registered at 03:05: §10.1 says why, the two marks that guard it (M1, M2) are met, and the review re-derived it by
a second route (§11.5). (3) Four amendments were logged before any model run (§11.1 to §11.4): the top pick is the
primary decode with a draw arm beside it and a mark for nights in a nest under a draw (N1); the order of the trainings
is p5b 7, p5a 7, p5b 11, p5a 11; the stage claims nothing about wild chimpanzees; the wording test's 0.386 is the
baseline of a new reading (W1). (4) Seeds 4111 and 4222 are open (their control arms ran); 4333 and 4444 are sealed.

**One defect outside this stage, seen by the builder and not repaired.** The guard of `scripts/r9-run.sh` and
`scripts/r9-seed2.sh` looks for another model process by the interpreter's path. On this machine a started
interpreter is listed under the framework's own path, so that guard does not see it. `scripts/r11-run.sh` also looks
for the model scripts by name (`model_procs`): at 11:42 on 11 October it listed the population run's worker
(`… Python -B worker.py --device mps`) and refused. The same two lines belong in the R9 scripts.

**Where the files are.** Data and (later) adapters: `artifacts/decide-ft/r11` of the worktree `r11-honest-retrain`.
Control arms and burn-ins: `artifacts/r11/loop` there. Real token counts: `artifacts/decide-ft/r11/eval/tokens.jsonl`
(taken by the review). All are git-ignored, so a frozen checkout reaches them by two variables (below). To make them
again instead: `scripts/r11-run.sh sample` (about 30 minutes; the manifest must come out with the hashes of
[r11-manifest.json](r11-manifest.json): train P5b `38bddc0d…`, P5a `a96521c2…`) and `scripts/r11-run.sh controls 4111`,
`controls 4222` (about 2 minutes each; the same end hashes). A burn-in made with another parameter registry is
refused: after a merge that adds a parameter, delete the two burn-in files and run the controls again.

**What to launch, in order.** From a frozen detached checkout of the head that holds this branch (after the merge
into `track-e`, or the branch head itself), one model process at a time, in a terminal that stays open. Every model
step checks its arguments first, refuses while another model process is alive or the tree is not clean, holds while
swap in use is above 6 GB, and writes a log under `artifacts/r11/logs` of the checkout it runs from.

```sh
# 0. the frozen checkout and the files on hand (a minute)
git -C /Volumes/Drive/chimpbench/MGOGO worktree add --detach .claude/worktrees/bench-r11 <the head>
cd /Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r11 && ln -s /Volumes/Drive/chimpbench/MGOGO/node_modules node_modules
export R11_FT_ROOT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r11-honest-retrain/artifacts/decide-ft/r11
export R11_OUT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r11-honest-retrain/artifacts/r11/loop

# 1. before any load (starts nothing; a minute): must end with "no other model process" and "the tree is clean"
scripts/r11-run.sh check
scripts/r11-run.sh dry              # no model, about a minute: the whole path on this checkout against a fake worker; must end "R11 done (dry)" with 6 of 6 replays

# 2. the trainer's inputs against the serving path (CPU, a few minutes each): each must print PARITY OK
scripts/r11-run.sh parity p5b && scripts/r11-run.sh parity p5a

# 3. night one: the first training seed of each arm (§11.2)
scripts/r11-run.sh train p5b 7      # about 1 h 40 min. Its first lines must show "loss self-check passed"; its "s/example" line replaces every estimate here
scripts/r11-run.sh train p5a 7      # about 1 h 20 min
scripts/r11-run.sh offline          # about 1 h 40 min: the untuned model on both arms' packets (about 50 min), then each adapter on file (about 28 min P5b, 23 min P5a); decides O1 to O4 and W1 for one training
scripts/r11-run.sh loop 4111        # about 1 h: p5b-s7-top, p5a-s7-top, p5b-s7-draw-1, p5a-s7-draw-1, p5b-s7-draw-2, then old-top, then their replays
scripts/r11-run.sh loop 4222        # about 1 h
scripts/r11-run.sh report           # no model, a minute: what one training of each arm shows (§11.2 says what may be said)

# 4. night two: the second training seeds
scripts/r11-run.sh train p5b 11     # about 1 h 40 min
scripts/r11-run.sh train p5a 11     # about 1 h 20 min
scripts/r11-run.sh offline          # about 50 min: scores only the two new adapters; the marks O1 to O4 and W1 can now be read
scripts/r11-run.sh loop 4111        # about 40 min: only the arms not on file (the four of training seed 11)
scripts/r11-run.sh loop 4222        # about 40 min
scripts/r11-run.sh arms 4111 old-draw-1 && scripts/r11-run.sh arms 4222 old-draw-1   # optional, about 15 min each: the reference for N1

# 5. the result (no model)
scripts/r11-run.sh report           # r11-offline.md, r11-card.md, r11-numbers.md under artifacts/r11/tables: S0 to S3, L1, N1, the ablation
scripts/r11-run.sh publish          # copies the tables to docs/staging; then commit them on a branch (never from the frozen checkout's detached head onto track-e)
```

- **Time in all:** training about 6 h, offline scoring about 2 h 30 min, the loop about 3 h 20 min (30 minutes more
  with the optional arm): about twelve hours of model time, so two nights. Night one alone is about 6 h 50 min.
- **How the estimates were made** (arithmetic, not measurements). Training: the stage's time law (stage R4's 0.85 s an
  example at 450 real tokens, time as tokens to the power 1.5) on the real token counts of §11.7, plus four passes
  over the 300 development rows. Offline: stage R4's 0.59 s a packet at 452 real tokens, scaled the same way; an arm
  has 4,420 packets to score, the untuned model both arms'. Loop: stage R9's arms took 0.57 to 0.66 s an ask at 467
  tokens and 1,350 to 1,830 asks an arm and seed, which scales to about 10 minutes an arm and seed for P5b, 8 for P5a
  and 15 for the old adapter. The builder's loop figure (1 h 10 min a seed) used 0.28 s an ask and is too low.
- **A step cut short.** Training: delete the half-made folder under `adapters/` and run the step again (the script
  refuses to overwrite). Offline: run `offline` again (a `.part` file is not read). Loop: run `loop <seed>` again; it
  skips the arms on file and replays any arm whose replay is missing.
- **One seed first:** `R11_SEEDS=4111 scripts/r11-run.sh report` reads seed 4111 alone.
- **The wording baseline (W1)** is read from `docs/staging/r8-wording-numbers.md`, which a checkout holds once the
  results of 11 October are merged (`track-e` from 241bceb). From the unmerged branch head, name the table:
  `R11_WORDING=<path to r8-wording-numbers.md>`; without it W1 prints "not read" and nothing else changes.
- **Optional, offline only:** `scripts/r11-run.sh train-hard p5b 7` (about 1 h 40 min) trains the one-hot comparison
  on the same rows; `offline` then scores it. No rule reads it.
- **Never:** `R11_RERUN=1` without a logged reason; an arm on file is a result. `R11_ALLOW_OTHER_MODEL=1` only for the
  CPU step `tokens`, which is done.

**How to read the result.** `r11-offline.md` §10 prints O1 to O4 and W1 per adapter; a mark holds for the recipe only
if both P5b trainings meet it; §11 there is the near-certainty table, §12 the wording baseline. `r11-numbers.md` §4
prints S0, S1, S2, S3 in their registered order with the outcome for the top pick first, then the draw arms as a
second line, then the ablation and L1; §4a prints N1; §5 prints the field anchors as description. S2 reads the
offline summary (`artifacts/r11/tables/r11-offline.json`), so run `offline` before `report`. When the ablation is
read, say that P5a still carries one memory line (§11.5).

**Proposed lines for the shared files.**

`IMPLEMENTATION_PLAN.md`, the Status of "Stage R11":

> **Status**: Built and reviewed on branch `r11-honest-retrain` (11 October 2026; `docs/staging/r11-prereg.md`; no
> model loaded, nothing trained; awaiting the integrator's training and model arms). *Label.* The label first
> registered (the offered options' jitter redrawn, the menu held fixed) was found wrong before any file was made: the
> rules' menu is itself cut by the jittered scores, and that label put 0.151 on trips where the rules take 0.230. The
> label as built redraws every candidate's jitter through the simulation's own code and counts the redraws that offer
> the same menu; it reproduces the rules' pick on 7,431 of 7,431 fresh draws and is calibrated on every group (trips
> 0.229 against 0.230), and the review re-derived it by a second route on 215 decisions. Given the state and the menu
> the rules' pick is the label's top option at 0.84: that, not 0.98, is the most any state reader can agree. *Data.*
> 3,120 labelled fresh draws for training (seeds 48 and 7, both bases, never a first day), 300 for development, 1,500
> held out on seed 21 with 500 kept or arrived acts apart; 36.2% of sampled records were not fresh choices. Real
> tokens at the median: P5b 340, P5a 295 (the target was 350). Nothing of the rules' valuation is in a training row;
> options stand in a fixed order of acts and the `nearby` line in order of distance. *Floors and controls.* A
> kind-prior baseline with no model agrees with the rules at 0.381, which is where the first adapter fell without the
> rules' wording (0.386). Control arms on the fresh seeds 4111 and 4222: the smallest difference is 14.3 on 53.9 act
> changes and 1.72 on 7.49 trips begun; random choice is told from the rules on three of the five timing rows.
> *Amended before any model run* (§11): the top pick is the primary decode, a draw arm runs beside it and "nights in
> a nest under a draw" is a mark (49 of 50 keeps it); the trainings run p5b 7, p5a 7, p5b 11, p5a 11, and one
> training per arm carries no registered statement; the stage claims nothing about wild chimpanzees; W1 reads the
> honest packet against the wording test's 0.386. The review repaired seven defects of the run script, the largest
> that an arm whose adapter was missing would have been answered by the untuned model. *Open*: four trainings (about
> 6 h), offline scoring (about 2 h 30 min), the loop arms (about 3 h 20 min); the trainer has never been executed;
> P5a still carries one memory line; the like-for-like wording baseline is not built.

`AGENTS.md`, Commands, after the `r10-night.ts` line:

```sh
scripts/r11-run.sh sample | assemble | controls <seed> | dry | report | publish | check | train <p5b|p5a> <7|11> | parity <arm> | tokens | offline | loop <seed> | arms <seed> <a,b> | replay <seed> <a,b>   # stage R11 (docs/staging/r11-prereg.md): the honest retraining. sample: fresh draws of rules worlds (scripts/r11-contexts.ts; seeds 48, 7, 21; both bases; never a first day) with the label of each computed at the decision (every candidate's jitter redrawn through computeCandidates and rgMenu, the redraws that offer the same menu counted), then scripts/r11-assemble.ts (two input arms of packet 5 short: p5b whole, p5a without `lately` and `last`; manifest, calibration and reproduction checks) and the data and offline-floor tables; train: training/decide_ft/train_r11.py (train_r4.py with soft cross-entropy; adapters r11-<arm>-s<seed> under artifacts/decide-ft/r11); offline: training/decide_ft/em_score.py on the held-out packets, then scripts/r11-offline.ts (marks O1 to O4, W1); controls, loop: scripts/r11-loop.ts on the fresh seeds 4111 and 4222 (stage R7's sixteen control arms; engine arms through scripts/r5-pilot.ts runArm with packet 5, the gate on, the top pick and a draw arm beside it, each with its own stream; an arm on file is never run again), then scripts/r7-report.ts --engine and scripts/r11-report.ts (statements S0 to S3, N1); dry: the model arms' path against scripts/lib/fake-worker.mjs on seed 48; model steps check their arguments first, run one process at a time with the swap hold and log under artifacts/r11/logs; tables under artifacts/r11/tables
```

`AGENTS.md`, Gotchas, two lines:

> - A label "with the jitter averaged out" must redraw the menu too (stage R11): each kind of act reaches the rules' menu by its best jittered target, so redrawing the offered options' jitter alone understates whatever was selected (trips: 0.15 against the rules' 0.23). `scripts/r11-contexts.ts` redraws by decision version through `computeCandidates` and `rgMenu`. A guard that looks for a model process by the interpreter's path does not see a started one on this machine (it is listed under the framework's path): look for the script names as well (`scripts/r11-run.sh` `model_procs`).
> - The scoring worker answers with the untuned model when none of the adapters it was told to load is found (`training/decide_ft/adapters.py`): a harness must check the worker's ready line for the arm's adapter before the first ask (`scripts/r11-loop.ts`, `scripts/r10-night.ts`). The tool shell (zsh) does not split an unquoted variable into words: a loop that passes `$a` to a script hands it one argument.

`HANDOFF.md`, next steps: "R11: after the population run, the launch order at the end of
`docs/staging/r11-prereg.md` from a frozen detached checkout (night one: check, parity, train p5b 7, train p5a 7,
offline, loop 4111, loop 4222, report; night two: the trainings with seed 11, offline, both loops again, report,
publish). The decode is the top pick with a draw arm beside it; leave `R11_DECODE` unset."

`docs/simulation.md`: **no rows.** The stage adds no parameter and no switch.

**Decisions that are the user's.**

1. **The fresh seeds.** This stage opened 4111 and 4222. Stage R12's second build step proposed the same pair; it
   should take 4333 and 4444, and a new sealed pair should be named now for the test after that.
2. **One night or two.** Night one ends with one training per arm, the offline table and the loop arms of those two
   adapters. By §11.2 nothing registered can be claimed from it. Whether to read night one before night two runs, or
   to wait, is yours; the arms of night two are fixed either way.
3. **The ablation's other side.** P5a, as registered, still carries one memory line where P5b carries `last` (often
   the latest grooming or greeting). If you want "P5b with the two lines deleted and nothing else changed", say so
   before night one: it needs the files assembled again (three minutes, no model) and a line in §11.
4. **Whether to spend about an hour more of model time** on two references: the first adapter under a draw on the
   test seeds (30 minutes; the reference for N1), and the first adapter on this stage's held-out draws with neutral
   options (30 minutes and a small build; the like-for-like baseline for W1).
5. **The line of N1.** 49 of 50 nights keeps it, because the rules' own arms lose a night in two of eight re-draws.
   If one lost night should already count against a draw, the mark must be made stricter before the arms run.
6. Whether the label should keep the rules' continuation bonus and finished penalty (§2, limit 2). They are hand
   rules about staying; the review of 10 October asked for labels "with persistence bonuses stripped". Not done: the
   brief asked for the rules' judgment, and stripping them changes the teacher.
7. Whether the 64 fresh draws with a menu too rare for a label (of 7,431) matter enough to raise the cap of 20,000
   redraws.
