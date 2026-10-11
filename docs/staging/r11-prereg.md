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
| assembly and data tables | c8d4cfb, clean | 03:53 to 03:56 | `scripts/r11-run.sh assemble` (first run at 63d1aaf to read the tables; one row was added to the data table and it was run again; the files on hand are the second run's) |
| dry run, seed 48 | c8d4cfb, clean | 03:56 to 03:57 | `scripts/r11-run.sh dry` |
| control arms, seeds 4111 and 4222 | 8d91c8b, clean | 03:57 to 04:01 | `scripts/r11-run.sh controls <seed>`: the first run ever made on these seeds |
| tables | 8d91c8b | 04:02 | `scripts/r11-run.sh report`, then `publish` |

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

`tests/r11.test.ts` 9 tests (the label arithmetic; the sampler on two worlds with `--check`; rows and calibration; the
P5a variant; the files and their manifest; the registered arms and seeds; an engine arm with a stand-in kernel:
packet 5 reaches it, the card reads it, the replay reproduces it). Results of it and of the neighbouring files are in
§10.12. Nothing under `src/` or `data/` was changed by this stage (`scripts/r5-pilot.ts` gained three optional
arguments and `scripts/r8-contexts.ts` one optional hook; absent, both run as before), so the goldens and the field
pin cannot have moved; `tests/sim-track-e.test.ts`, the whole suite and the build were not run.

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
| `tests/r11.test.ts` | 9 | 9 |
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

## For the integrator

**Read first.** (1) The label is not the one registered at 03:05: §10.1 says why, and the two marks that now guard
it (M1, M2) are met. (2) Nothing here is a result about an engine: the stage delivers data, a trainer, a loop arm and
the control arms. (3) Seeds 4111 and 4222 are now open (their control arms ran); 4333 and 4444 are still sealed. The
parallel stages (`r12-menu-design`, `r7b-forks`) must not take 4111 or 4222 for a test.

**One defect outside this stage, seen tonight and not repaired.** The guard of `scripts/r9-run.sh` and
`scripts/r9-seed2.sh` (and any script that copies it) looks for another model process by the interpreter's path. On
this machine a started interpreter is listed under the framework's own path: at 02:55, while the chain's scorer
(`em_score.py`) was running, no process line held the interpreter's path. So that guard would not have refused a
second model process. `scripts/r11-run.sh` also looks for the model scripts by name; the same two lines belong in the
R9 and R10 scripts.

**Where the files are.** Data and (later) adapters: `artifacts/decide-ft/r11` of this worktree. Control arms and
burn-ins: `artifacts/r11/loop`. Both are git-ignored. From another checkout either point `R11_FT_ROOT` and `R11_OUT` at
them (absolute paths work), or make them again: `scripts/r11-run.sh sample` (about 30 minutes; the manifest must come
out with the hashes of [r11-manifest.json](r11-manifest.json)) and `scripts/r11-run.sh controls 4111`, `controls 4222`
(about 2 minutes each). A burn-in made with another parameter registry is refused: after a merge that adds a
parameter, delete the two burn-in files and run the controls again.

**What to launch, in order** (one model process at a time; every model step holds while swap in use is above 6 GB,
refuses a tree that is not clean and refuses while another model process is alive; logs under `artifacts/r11/logs`):

```sh
scripts/r11-run.sh check                                   # starts nothing: files, adapters, swap, other model processes
scripts/r11-run.sh parity p5b && scripts/r11-run.sh parity p5a   # CPU, a few minutes each: must print PARITY OK
scripts/r11-run.sh tokens                                  # CPU, the tokenizer alone: real lengths into r11-offline.md §9
scripts/r11-run.sh train p5b 7                             # about 1 h 42 min (projected; R4's settings; soft labels)
scripts/r11-run.sh train p5b 11                            # about 1 h 42 min
scripts/r11-run.sh offline                                 # the untuned model (about 51 min) and each adapter on file (about 29 min for P5b, 21 for P5a); marks O1 to O4
scripts/r11-run.sh train p5a 7                             # about 1 h 15 min
scripts/r11-run.sh train p5a 11                            # about 1 h 15 min
scripts/r11-run.sh offline                                 # scores only what is new
R11_DECODE=<draw|held|top> scripts/r11-run.sh loop 4111    # about 1 h 10 min: this stage's adapters, then r4-rules-state on its own packet, then the replays
R11_DECODE=<draw|held|top> scripts/r11-run.sh loop 4222    # about 1 h 10 min
R11_DECODE=<draw|held|top> scripts/r11-run.sh report       # r11-card.md (R7's card with the engine arms) and r11-numbers.md (S0 to S3, L1, the ablation, the spreads)
scripts/r11-run.sh publish                                 # copies the tables to docs/staging; then commit them
```

- **The decode flag.** Set `R11_DECODE` to what stage R9's result names. Leave it unset if R9 names no standard: each
  new adapter then runs with the top pick and a draw arm beside it (about 1 h 15 min a seed).
- **If time is short:** P5b before P5a (as ordered above), and `scripts/r11-run.sh arms <seed> <a,b>` runs any subset
  (`scripts/r11-loop.ts list --decode draw` prints the registered names). A loop step cut short before its replays:
  `scripts/r11-run.sh replay <seed> <a,b>`. `loop` leaves out, and names, any arm whose adapter is not trained yet.
- **Optional, offline only:** `scripts/r11-run.sh train-hard p5b 7` (about 1 h 42 min) trains the one-hot comparison
  on the same rows; `offline` then scores it. No rule reads it.
- **Time in all:** training about 5 h 54 min, offline scoring about 2 h 30 min, the loop about 2 h 20 min: near eleven
  hours of model time, so two nights, or one if P5a waits. Per-ask and per-example times are projections: the first
  training log's "s/example" line and the first loop arm's seconds replace them.
- **How the estimates were made** (arithmetic, not measurements). Training: [r11-data.md](r11-data.md) §6, from R4's
  0.85 s per example at about 450 real tokens and time growing as tokens to the power 1.5, on projected real lengths
  (0.85 of the estimate). Offline: R4 scored at 0.58 to 0.60 s a packet at a median of 452 real tokens, which scales
  to about 0.40 s for P5b and 0.29 s for P5a; an arm has 4,420 packets to score (2,000 records, 1,340 without `doing`,
  1,080 probe packets), the untuned model both arms'. Loop: about 1,500 asks per arm and seed (five animals, five
  days, about 60 asks an animal-day: the dry run gave 50 to 69, stage R5-gate 54 to 64) at 0.28 s for P5b and 0.21 s
  for P5a (the review's 0.44 s at 467 tokens, scaled), so about 7.5 and 5.5 minutes an arm and seed; the first
  adapter's arm as stage R9 costed it, about 15 minutes a seed; eight or nine new arms and one old arm a seed.

**How to read the result.** `r11-offline.md` §10 prints O1 to O4 per adapter; a mark holds only if both P5b trainings
meet it. `r11-numbers.md` §4 prints S0, S1, S2, S3 in their registered order with the outcome, then the ablation and
L1; §5 prints which rows could show "closer to wild chimpanzees" (two) and whether a recipe does. S2 reads the offline
summary (`artifacts/r11/tables/r11-offline.json`), so run `offline` before `report`.

**Proposed lines for the shared files.**

`IMPLEMENTATION_PLAN.md`, a new block after Stage R10:

> ## Stage R11: Re-teach the small model on the honest packet
> **Goal**: the first training on honest inputs and honest labels. Inputs: packet 5 in its short variant, in two arms
> one change apart (P5b the whole packet; P5a without the lines `lately` and `last`). Labels: on fresh draws only, the
> probability that the rules take each option given the state and the menu shown (the candidate jitter and the belief
> draw redrawn through the simulation's own menu code); kept and arrived acts are scored apart. Two training seeds per
> arm, R4's settings, soft cross-entropy. In the loop: packet 5 to the kernel, the gate on, the decode stage R9 names,
> ten fresh focal animals for five days on the fresh seeds 4111 and 4222, beside R7's sixteen control arms and the
> first adapter on its own packet.
> **Success Criteria** (registered in `docs/staging/r11-prereg.md` before any run): the label reproduces the rules'
> realised pick on every fresh draw and is calibrated against the rules' picks (M1, M2); offline marks O1 to O4
> (divergence below two floors, the trip probability within 0.03 of the rules' rate, no probe the wrong way, no
> lock-in); in the loop the statements S0 to S3 read in order (training-seed spread swamps; the gap to the rules on
> timing is closed; the limit is information; otherwise as it fell); "closer to wild chimpanzees" only by R7's amended
> rule. Every result is named "rules-taught model on a rules menu".
> **Tests**: `tests/r11.test.ts`; `training/decide_ft/test_soft_loss.py` (standard library).
> **Status**: Built on branch `r11-honest-retrain` (11 October 2026; no model loaded, nothing trained; awaiting the
> integrator's training and model arms). The label first registered (the offered options' jitter redrawn, the menu
> held fixed) was found wrong before any file was made: the rules' menu is itself cut by the jittered scores, and
> that label put 0.151 on trips where the rules take 0.230. The label as built redraws every candidate's jitter
> through the simulation's own code and counts the redraws that offer the same menu; it reproduces the rules' pick on
> 7,431 of 7,431 fresh draws and is calibrated on every group (trips 0.229 against 0.230). Given the state and the
> menu the rules' pick is the label's top option at 0.84: that, not 0.98, is the most any state reader can agree.
> Data: 3,120 labelled fresh draws for training (seeds 48 and 7, both bases, never a first day), 300 for development,
> 1,500 held out on seed 21 with 500 kept or arrived acts apart; 36.2% of sampled records were not fresh choices.
> Estimated tokens: P5b median 409 (about 348 real, at the target), P5a 330 (about 281). No-model floors: a
> kind-prior baseline diverges from the rules' distribution by 1.117 nats. Control arms on seeds 4111 and 4222: the
> smallest difference is 14.3 on 53.9 act changes and 1.72 on 7.49 trips begun; random choice is told from the rules
> on three of the five registered timing rows; two rows leave room for "closer to wild" (time in a patch, the
> half-hour share). A dry run against a fake worker passes (packet 5 reaches the kernel; 6 of 6 replays reproduce).
> *Open*: four trainings (about 5 h 54 min), offline scoring (about 2 h 30 min), the loop arms (about 2 h 20 min);
> real token counts; the trainer has never been executed.

`AGENTS.md`, Commands, after the `r10-night.ts` line:

```sh
scripts/r11-run.sh sample | assemble | controls <seed> | dry | report | publish | check | train <p5b|p5a> <7|11> | parity <arm> | tokens | offline | loop <seed> | arms <seed> <a,b> | replay <seed> <a,b>   # stage R11 (docs/staging/r11-prereg.md): the honest retraining. sample: fresh draws of rules worlds (scripts/r11-contexts.ts; seeds 48, 7, 21; both bases; never a first day) with the label of each computed at the decision (every candidate's jitter redrawn through computeCandidates and rgMenu, the redraws that offer the same menu counted), then scripts/r11-assemble.ts (two input arms of packet 5 short: p5b whole, p5a without `lately` and `last`; manifest, calibration and reproduction checks) and the data and offline-floor tables; train: training/decide_ft/train_r11.py (train_r4.py with soft cross-entropy; adapters r11-<arm>-s<seed> under artifacts/decide-ft/r11); offline: training/decide_ft/em_score.py on the held-out packets, then scripts/r11-offline.ts (marks O1 to O4); controls, loop: scripts/r11-loop.ts on the fresh seeds 4111 and 4222 (stage R7's sixteen control arms; engine arms through scripts/r5-pilot.ts runArm with packet 5, the gate on, the decode named by R11_DECODE, each with its own stream), then scripts/r7-report.ts --engine and scripts/r11-report.ts (statements S0 to S3); dry: the model arms' path against scripts/lib/fake-worker.mjs on seed 48; model steps run one process at a time with the swap hold; tables under artifacts/r11/tables
```

`AGENTS.md`, Gotchas, one line:

> - A label "with the jitter averaged out" must redraw the menu too (stage R11): each kind of act reaches the rules' menu by its best jittered target, so redrawing the offered options' jitter alone understates whatever was selected (trips: 0.15 against the rules' 0.23). `scripts/r11-contexts.ts` redraws by decision version through `computeCandidates` and `rgMenu`. A guard that looks for a model process by the interpreter's path does not see a started one on this machine (it is listed under the framework's path): look for the script names as well (`scripts/r11-run.sh` `model_procs`).

`HANDOFF.md`, next steps: "R11: after the R9 chain, `scripts/r11-run.sh check`, then the launch order at the end of
`docs/staging/r11-prereg.md` (train p5b 7 and 11, offline, train p5a, loop 4111 and 4222 with `R11_DECODE` set to R9's
decode, report, publish)."

`docs/simulation.md`: **no rows.** The stage adds no parameter and no switch.

**Decisions that are the user's or the integrator's.**

1. Which decode the loop arms run with: stage R9's result is not in yet. Unset means the top pick with a draw beside it.
2. Whether P5b's length is acceptable if its real median comes out above 350 tokens (projected 348); P5a is the
   shorter packet and the ablation says whether the two lines earn the difference.
3. Whether the label should keep the rules' continuation bonus and finished penalty (§2, limit 2). They are hand rules
   about staying; the reviewer of 10 October asked for labels "with persistence bonuses stripped". Not done here: the
   brief asked for the rules' judgment, and stripping them changes the teacher.
4. Whether the rare-menu draws (64 of 7,431, no label) matter enough to raise the cap of 20,000 redraws.
