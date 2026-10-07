# Stage R4: teach the small engine to choose from the animal's state (pre-registration)

Agent r4-train, branch `r4-train` from `track-e` b6e35dc. Registered 7 October 2026, before any code, data generation or
training. Specification: `IMPLEMENTATION_PLAN.md`, Track R, "Stage R4", the direction amendment of 6 October and the
user decisions of 6 and 7 October 2026.

The user's decisions that bind this stage, verbatim:

- "yes just state in training" (7 October): the engine's input, in training and in use, holds the animal's own state,
  perceptions and beliefs. No score, value or ranking computed by the rules, and no mark of which option the rules pick.
- "no cloud machine run things locally" (7 October): everything runs on this Mac (Apple M4, 10 cores, 16 GB, MPS).
- "field choices are the source of truth, so it should be part of the training data" and "Field labels go into a
  separate, small, named adapter, not the main label source." (6 October)
- Jev outputs are never training labels (TypeSafe MCA §2.3(b)). No outside model's answer (Codex included) is a label.

No benchmark is run here (no `e-bench`, no `e-run`, no `field-metrics`). No network, no paid call. No change under
`src/sim`, no switch default changes, goldens and the field pin do not move.

## 1. The input: the state-only packet

One text packet, built by one function (`scripts/lib/packet-state.ts`, `buildStateOnlyQuestion`), used for training,
for every evaluation here and by the command of §8 that puts an adapter in the loop. It is the v4 packet of stage R2
(`src/providers/packet.ts` for a context with `packet: 4`; `docs/staging/r2-prereg.md` §3) with the parts below removed.
It is built from the real builder's output, never by a second wording.

World switches where a packet is built: the base parameters plus `observeV4` 1 and `menuParity` 1; `activityFirst` 0
(its entry per kind is the rules' best target, a ranking); `kernelNoRulesPick` 0 (1 only for the second number of §6.5).

**In, and why.**

| Part | What it is |
| --- | --- |
| `me` | who the animal is: name, age, sex, community, rank, reproductive status, mood, temperament (state) |
| `feeling`, `urgent` | its drives in the packet's degree words (state) |
| `now` | what it is doing, the light, the weather, the party, fruit in view, strangers (perception) |
| `body` | the v4 body line: reserves, energy shortfall with the kcal still to find and the waking time left, stomach and hindgut, water, heat, sleepiness and sleep pressure, body clock, stress and arousal words (state) |
| `nearby` | each animal in view: relation, rank relative to me, notable act, distance, bond, tension (perception, memory) |
| `memories`, `history`, `events`, `bodies` | what it remembers and perceives (memory, perception) |
| instruction | the two fixed sentences (`ACTION_BASE`, `ACTION_WEIGH`), the same at every decision |
| each option: the act and its target | the simulation's own description of the option ("Feed on ripe figs in the Ficus 40 m away (crop 60%, 2 feeding there)"): which act, on what, where. Written from perception and state, not from a score |
| each option: the purpose | what the act does, a fixed phrase per act (wording 2: "food, eases hunger", "sleep, relieves sleepiness") |
| each option: beliefs about the world | the crop there and when it was seen (`cropKcal`, `seenH`), whether it may have changed (`spreadKcal`), the chance a listed crown is in fruit (`chance`), others going there (`feeders`), the distance (`distM`), the assessed chance of winning against an aggressor (`odds`). Each is a belief about what is there, not the worth of the option |

**Out, and why.**

| Removed | Why |
| --- | --- |
| The net energy rate of an option: "a rich / good / modest / poor feed (about N kcal an hour net)", "no gain after the walk" (`value.kcalH`, `value.share`) | It is the food term of the rules' valuation: one number that already combines crop, feeders, distance, travel cost and the animal's intake rate. The parts stay as beliefs; the sum goes |
| The company words: "much better / better company than here", "a little more company", "no more company than here", "nest-mates beside me" (`value.company`) | The rules' value of the company an option brings, less the company present: a worth, not a perception. Who is near stays in `nearby` |
| The situational rule sentences ("It is night: chimpanzees stay in their nests…", "Dusk: chimpanzees build their night nests now.", "Urgent hunger: meeting it comes first…", and the seven others of `situationRules`) | Hand-written advice on what to do now. The engine must get this from the light, the body and the drives |
| The echo on an option's purpose when a drive is urgent ("eases severe hunger — needed now", "relieves strong sleepiness — needed now") | A mark written by code on the options that answer an urgent drive. The drive itself stays in `feeling` and `urgent` |
| Never in any text, and not here: each option's rules `score`, `swingLow`, `swingHigh`, `body.feedDrive`, `body.fullKcalH`, the position of the rules' pick | The rules' valuation itself |

**What still comes from the rules, stated plainly.** (1) The menu: which eight options are offered is decided by the
loop's `rgMenu`, which ranks by the rules' scores and always keeps the rules' pick (the user's decision of 6 October:
keep it for the main number, report "removed" as a second number). So a menu is not a random sample of the legal
options. (2) The order of options is the fixed action order, then target id; it does not follow the scores, and in
training every context is shown in its own order or in a shuffled one. (3) The option descriptions and the belief
numbers are computed by simulation code from the animal's perception and memory.

**Example packet** (composed by hand from the wording tables before any code exists; it is replaced by a real packet
from the smoke sample in amendment A1, before the full data generation):

```
state:
  me: Kato, adult male, 24 y, West community; rank 4 of 9 males; mood calm; bold
  feeling: moderate hunger
  now: daytime (full daylight); clear, 26 °C; party of 5 with 3 adult males
  body: body reserves a little low (6% below); moderate energy shortfall: about 900 kcal still to find, some hours of waking left; stomach nearly empty; well watered; warm; wide awake; body clock at its daytime high; settled
  nearby:
    - Obi: adult male, outranks me, 12 m, friendly
    - Semwai: adult female, 8 m
  memories:
    - Fed in a Ficus 2 h ago
instructions: You are a field primatologist. Choose what this wild eastern chimpanzee would most plausibly do next, given only what it perceives, feels and remembers. Weigh bodily needs, safety, dominance (subordinates pant-grunt to and avoid dominants), kinship and alliances.
options:
  c0: Rest through the midday heat (26 °C) (a pause: cools the body, digests, favours wounds)
  c1: Feed on ripe figs in the Ficus 40 m away (crop 60%, 2 feeding there) (food, eases hunger; 3,400 kcal of fruit there)
  c2: Travel 350 m north to a Uvariopsis I remember with ripe fruit (food, eases hunger; 5,200 kcal of fruit there when I saw it 9 h ago, may have changed; 1 other going there)
  c3: Groom Obi, rank 2 of 9 males (eases loneliness, strengthens the bond)
```

In the served v4 packet c1 would also read "a good feed (about 210 kcal an hour net)" and the instruction could carry
"Urgent hunger: meeting it comes first…"; neither is here.

A committed test (`tests/r4-packet.test.ts`) asserts on simulated contexts that the state-only packet holds none of the
removed wordings, that every other word of it is the v4 packet's, and that the builder is deterministic. A data check
scans every training and evaluation packet for the removed wordings; its count (which must be 0) goes in the manifest.

## 2. Label sources and adapters

Each adapter is a LoRA adapter for `fastino/GLiNER2.5-Decide` (revision 7ee5da4c) under
`artifacts/decide-ft/r4/adapters/<name>/` with a `manifest.json` that states its label source, the parts and record
hashes it was trained on, the packet's check count, and that no label comes from Jev or any outside model.

**a. `r4-rules-state`.** Labels: the rules kernel's own decision (`rgChoice`, read by `rgTap`) at real decision points
of the Track E stack, for animals aged `rgMinAge` (8) and over. Input: the state-only packet. Half of the contexts
from each base: `docs/staging/integrator-kit/params/M6-W50.json` and `M6-W25.json`. **This engine inherits the rules'
judgment through its labels**: it is taught "do what the rules did, from state alone", so it carries the rules'
prescriptions, and agreement with the rules is not correctness about chimpanzees.

**b. `r4-field-groom`.** Labels: whom a wild adult male groomed, the 977 choices of RW's train part (`src/rw`,
`scripts/lib/rw-load.ts`; Ngogo focal scans, CC0, private raw rows). Input: the benchmark's own wild packet
(`scripts/lib/rw-serialize.ts` `buildWildQuestion`, packet `rw-bench-v1`), unchanged, so its scores compare with the
published untuned ones. **Menus wider than 8 are cut to seeded sub-menus of 8 that contain the groomed male**
(registered choice; built by the fan-out wrapper's own `narrowWildRequest`, so a training sub-menu has the form of a
fan-out sub-request). It is named, small and separate. It marks T-SOC-1, T-SOC-2, T-FIS-1, T-FIS-3 and T-FIS-5 as
compromised for itself: its manifest names the label source "field choices, Ngogo male grooming"
(`data/rw-compromised.json`, `src/rw/manifest.ts` `compromisedFor`), and a test asserts the five marks.

**c. `r4-mixed` (optional).** Only if a and b and every evaluation of §6 are done and time remains: one adapter trained
on both sets, labelled as mixed, compromised like b.

No expert-rubric labels are made in this stage (they are generated judgments; the two sources above are a rule's
decision and a wild animal's choice).

## 3. Contexts, splits and seeds

Sampler: `scripts/r4-contexts.ts`, the tap method of `scripts/em-sample.ts` and `scripts/r2-sample.ts` (the world runs
on the rules; `rulesTap` builds the request before the decision, `rgTap` records the rules' decision; sampling by a
hash of seed, tick and animal, never `world.rng`), with the record shape of `scripts/ft-contexts.ts`. Field profile.

| Split | Seed | Base | Burn-in, then sampled days | Animals |
| --- | --- | --- | --- | --- |
| train, dev | 48 | M6-W50 | 6, then 4 | dev: animals whose hash of (seed, id) is below 0.12; train: the rest |
| train, dev | 48 | M6-W25 | 10, then 4 | the same animals |
| train, dev | 7 | M6-W50 | 6, then 4 | as above |
| train, dev | 7 | M6-W25 | 10, then 4 | as above |
| test (held out) | 21 | M6-W50 | 6, then 4 | all |
| test (held out) | 21 | M6-W25 | 10, then 4 | all |

The two bases of one seed start from the same world, so their windows differ (days 6 to 10 and 10 to 14) to keep their
decision points apart. Seeds 48 and 7 only for training and dev, 21 only for the test; none is reserved or retired.
At most 14 simulated days per world, `--workers 2` at most (the sampler runs one world per process), from this
worktree at a committed head.

Recorded: every sampled decision point with two or more options and a valid context, in natural proportions: the
rules' draws (the gate open) and the acts the gate kept or that arrived (`why`). A record whose rules decision is not on
the menu is kept for the readouts and left out of training. Equal numbers from each base (the sampling rate is set per
world from the smoke run's counts). Target sizes are fixed in amendment A1 from the smoke run: train about 2,400 to
3,600, dev 300, test 1,500.

Wild choices: RW's parts by its own registered rule (`scripts/rw-ngogo-choices.ts` `PART_RULE`): train 977 (of which
the focal males whose hash is below 0.15 are the adapter's validation set), development 448 (evaluation only), held-out
**sealed and never read**.

## 4. Training settings (from `docs/decide-finetune.md` §5 and §6a; no search)

LoRA r 16, alpha 32, dropout 0.05 on the classifier and the top 8 of the 24 encoder layers; bf16 autocast on MPS;
batch 2 with 4 accumulation steps (effective 8); AdamW, lr 2e-4, no weight decay; 10% linear warm-up then linear decay;
gradient clip 1.0; seed 7; softmax cross-entropy over the offered options; each epoch shows a context in its own order
or with its options shuffled (seeded coin). Every example has weight 1. Epochs: 3 for `r4-rules-state`, 4 for
`r4-field-groom` (each epoch of b deals new option orders, names and sub-menus: shuffles 0 to 3); the saved epoch is the
one with the lowest validation loss (dev animals for a, validation males for b). Nothing is tuned on the test split, the
development part or the probes. `training/decide_ft/train_r4.py` reuses `train.py`'s LoRA placement and `common.py`'s
serving-identical inputs. Environment: `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.6`, `PYTORCH_MPS_LOW_WATERMARK_RATIO=0.4`,
the variables of `HANDOFF.md` §3 item 3, `MGOGO_FT_ROOT=artifacts/decide-ft/r4`.

## 5. Sizing for 16 GB

Before each training run `sysctl -n vm.swapusage` and `uptime` are read and logged in §9. One model process at a time.
Iteration 0 is a smoke training (seed 48, M6-W50, 1 day after 1 of burn-in; 200 examples, 1 epoch, 40 dev contexts): it
measures seconds per example and peak memory (MPS driver memory and the process footprint). Amendment A1 writes those
numbers here and fixes the context count so that one adapter trains in at most about 3 hours (training passes plus the
validation passes).

Stop rules. If the smoke run cannot hold the settings of §4 (the process is killed, or its footprint passes 11 GB, or
swap in use grows by more than 3 GB, or it takes more than 4 s per example), then, one change per iteration and at most
3 iterations: (1) top 4 layers instead of 8; (2) batch 1 with 8 accumulation steps; (3) CPU for a 200-example timing
only. If none holds, training stops and the numbers are reported. No cloud run.

## 6. Evaluations and thresholds (all offline; fixed now)

Models compared everywhere: the untuned model, `r4-rules-state`, `r4-field-groom` (and `r4-mixed` if made), served as
the worker serves them (fp16 on MPS, `common.score`). Intervals are 95% bootstraps (2,000 resamples, fixed seed) over
animals (seed and animal id) for simulated contexts and over focal males for wild choices. **A difference is called one
only if its paired interval excludes 0.**

1. **Agreement with the rules on held-out contexts (seed 21).** Top-1 agreement with the rules' decision, on the
   state-only packet: on draws (the main number), on kept or arrived acts, on all; with chance (mean of 1 ÷ menu size);
   by base (W50, W25); **by kind of decision**: feeding (the rules chose to feed, travel to food or drink), travel
   (any other move: joining, following, heading home), rest (rest, shelter, a nest by day), social (grooming, play,
   greeting, aggression, mating, care, calls), each for day and dawn decision points, and night (every decision point at
   dusk or at night). Paired difference of each adapter against the untuned model. Reference row, not a threshold: the
   untuned model on the v4 packet as served (with the rate, company and rule sentences), to show what removing them
   costs the untuned model. Also: agreement with the rules' argmax, the share of picks by kind against the rules', and
   the consistency of the pick when the options are shuffled.
   **T1 (the plan's first criterion):** `r4-rules-state` minus untuned on draws is positive with an interval above 0.
2. **Token parity and size.** `training/decide_ft/parity.py --n 12 --device cpu` on r4 dev contexts prints `PARITY OK`
   (training tokens and probabilities equal the serving path). Real token counts (the worker's count) for every test
   packet: median, 95th percentile, largest. **T2:** parity holds and no packet is over 1,280 tokens.
3. **State probes (M2's design, `scripts/em-probes.ts` `PROBES`, the consistent rendering) on held-out contexts.** Six
   probes, three levels each, up to 100 situations per probe (hash order): deficit, reserves, sleep, light, heat, water.
   Read as M2: Δ = probability on the target options at the high level minus at the low level, mean and interval over
   situations; "right way" when the interval is above 0, "wrong way" when below, "does not respond" when it includes 0.
   **T3 (the plan's third criterion):** for `r4-rules-state` no probe moves the wrong way; the count moving the right
   way is reported beside the untuned model's on the same packets. The probes are never trained on. Stated limit: a
   probe changes the state words only; the option descriptions stay those of the real situation.
4. **Wild-choice benchmark, development part only** (`scripts/rw-score.ts --part development --kernels
   gliner,gliner+fan2 --load-model --adapter <name>`, shuffle 0; 448 records): top-1 plain and with the fan-out
   wrapper, for all records, menus of 8 or fewer and wider menus; each adapter minus untuned, paired
   (`src/rw/score.ts` `pairedDifference`); the rule stack (0.487) beside them. **T4 (the plan's first criterion for b):**
   `r4-field-groom` minus untuned, plain, all records, is positive with an interval above 0. The sealed part is never
   opened. `r4-rules-state` on the same records is reported without a threshold (does teaching the rules move the wild
   score).
5. **The rules' pick removed (the second number).** The test worlds are run again with `kernelNoRulesPick` 1 (a
   rules-only world is unchanged by it; the same decision points). There is no rules' pick to agree with, so the
   readouts are: how often the model picks the best remaining option by the rules' score (with chance), and how often
   its pick is of the same kind as the rules' removed pick; untuned against `r4-rules-state`, paired.
6. **Cross readouts, no threshold:** `r4-field-groom` on the simulated held-out contexts (does field training change
   agreement with the rules, and the share of grooming picks).
7. **Manifests (the plan's second criterion):** every adapter's manifest carries its label source; a check lists the
   training files and confirms none derives from Jev or an outside model, and the removed-wording count is 0.

Not in this stage: stand-ins are not refit (see §8); nothing is run in the loop.

## 7. Order of work, and where it stops

1. This registration, committed. 2. Code and tests (the packet builder, the sampler, the trainer, the reports).
3. Iteration 0, the smoke run; amendment A1 (measured cost, sizes, a real example packet), committed. 4. Contexts for
all splits. 5. Train `r4-rules-state`. 6. Evaluations 1, 2, 3, 5 for it. 7. Train `r4-field-groom`. 8. Evaluation 4
(wild choices; all models) and 6. 9. The in-loop command of §8, tested without a model. 10. Results in §9, the plan's
status line, the full test suite once (no training running).

If time or memory runs out, work stops in this order, and what was not done is said: the mixed adapter first (never
started unless everything else is done); then evaluation 6; then evaluation 5; then the probes are cut to 50 situations
each; then `r4-field-groom` and evaluation 4 are left to a later session with their data ready. `r4-rules-state` with
evaluations 1 and 2 is the minimum. Every iteration is logged in §9 before it runs; at most 3 per problem.

## 8. In the loop: left ready, not run

One command (written in §9 when the code exists) runs M3's focal design (`scripts/em-loop.ts`: a focal set of animals
driven by a provider in lockstep against the same animals on the rules) with the state-only packet and an r4 adapter.
It is the integrator's to register and launch. §9 will say, from the measured seconds per decision, how many simulated
days and animals are feasible on this Mac, and whether a distilled stand-in is needed for an R1b-style run. Known now:
the stand-in's features (`scripts/ft-features.ts`) include each option's rules score and a flag on the rules' pick, so
a stand-in for a state-only engine needs a feature layout without them before it is refit.

## 9. Iteration log and results

Machine before any work (7 October 2026, 11:35): swap 2,580 MB used of 4,096 MB; load averages 1.80, 1.64, 1.57;
another session's simulation (one node process) is running from the main checkout. No model process is running.

- **Iteration 0 (registered above, logged before it runs): the smoke run of §5.**
  Result (7 October 2026, 11:46 to 11:52). Sample: seed 48, M6-W50, 1 day after 1 of burn-in, every decision point with
  probability 0.2: 719 records of 38 animals aged 8 and over (480 draws, 239 kept or arrived; the rules' decision on the
  menu at 706), 3 s of wall time; the tapped world with `observeV4` and `menuParity` on hashes the same as the base alone
  without taps (`--check`). So a world gives about 3,600 decision points a simulated day. Packets by the server's
  estimate: median 517 tokens, largest 719. Smoke training, the settings of §4 unchanged: 197 labelled examples, 1
  epoch, 38 dev contexts: **0.88 s per example** (174 s of training, 207 s with the load and the two dev passes),
  **peak MPS driver memory 6.8 GiB, peak process footprint 7.9 GiB**; swap in use went from 2,580 MB to 5,146 MB at its
  highest (+2.6 GB, under the 3 GB stop rule; the machine was shared: load 3 to 6, another session's simulation
  running) and was 5,074 MB after. Dev agreement 0.32 untuned → 0.42 after one epoch of 197 examples (chance 0.18; a
  smoke number on 38 contexts, not a result). No stop rule fired; the settings of §4 stand.

### Amendment A1 (7 October 2026, after the smoke run, before the full data generation and any adapter training)

**Sizes, from the measured cost.** At 0.88 s per example, 3,200 training contexts shown for 3 epochs are 9,600 example
passes: about 2.4 hours, 2.9 hours if the shared machine slows it to 1.1 s. Fixed: **train 3,200 (800 from each of the
four training worlds), dev 300 (75 per world), test 1,500 (750 from each of the two test worlds)**, taken in hash order
from what each world's sampler recorded. Sampling probability per decision point: 0.09 in the training worlds, 0.2 in
the test worlds (the probes draw their situations from every record of the test worlds, not only the 1,500). If a
world yields fewer dev contexts than 75 (its dev animals are few), dev is what there is. `r4-field-groom`: about 830
records × 4 epochs of short packets, well under an hour.

**The evaluation's scoring cost.** One model load per provider over one file of every evaluation packet
(`scripts/r4-evalset.ts` → `training/decide_ft/em_score.py`): the test packets, a quarter of them again with shuffled
options, the removed-pick packets, the probe packets (6 probes × up to 100 situations × 3 levels).

**Smoke data and the smoke adapter are not used for anything else** (`artifacts/decide-ft/r4/smoke/`).

**A real example packet** (smoke sample, seed 48, M6-W50, an adult male by day; it replaces the hand-composed one of
§1; the rules chose c2 here):

```
state:
  me: Rukaso, adult male, 17 y, West community; rank 7 of 8 males; mood calm; sociable
  feeling: mild loneliness
  now: currently grooming; daytime (full daylight); cloudy, 23 °C; party of 4 with 2 adult males
  nearby:
    - Ilobe: elder male, outranks me, 15 m, friendly
    - Zamiko: infant male, 20 m
    - Kiboro: adult female, 20 m
  memories:
    - Just now: Ilobe gave a travel hoo
    - Groomed Ilobe 2 times, most recently 40 min ago
    - Pant-grunted to Ilobe 42 min ago
    - Pant-grunted to Tavuni 70 min ago
  history:
    - This month: groomed with Ilobe 1.1 h; groomed with Kiboro 22 min
  body: body reserves at my usual store; slight energy shortfall: about 430 kcal still to find, some hours of waking left; stomach mostly full; well watered; comfortable temperature; slightly sleepy; body clock at its daytime high; settled
instructions: You are a field primatologist. Choose what this wild eastern chimpanzee would most plausibly do next, given only what it perceives, feels and remembers. Weigh bodily needs, safety, dominance (subordinates pant-grunt to and avoid dominants), kinship and alliances.
options:
  c0: Sit and digest after feeding (a pause: cools the body, digests, favours wounds)
  c1: Feed on ripe star apples in the Chrysophyllum albidum 3 m away (crop 38%) (food, eases hunger; 1,600 kcal of fruit there)
  c2: Travel 531 m northeast to a Chrysophyllum albidum I remember with ripe star apples (food, eases hunger; 1,000 kcal of fruit expected there, not seen myself)
  c3: Travel 384 m northeast to a Chrysophyllum albidum I remember with ripe star apples (food, eases hunger; 800 kcal of fruit expected there, not seen myself; 1 other going there)
  c4: Play with the young Zamiko (fun and practice for young chimpanzees)
  c5: Charging display with branch-dragging (asserts dominance)
  c6: Charge at Ilobe, to challenge his rank (intimidates a rival)
  c7: Pant-hoot so my allies out of sight know where I am (contacts allies or answers strangers)
```

The served v4 packet of the same moment adds to c1, c2 and c3 "a rich feed (about 410 / 320 / 340 kcal an hour net)"
and to c3 "a little more company"; at a dusk decision of a mother it adds to the instruction "Dusk: chimpanzees build
their night nests now. Urgent sleepiness: meeting it comes first unless danger is immediate. A dependent infant relies
on this mother: she stays close, nurses and protects it." and to the nest option "— needed now". None of that is in the
state-only packet (`tests/r4-packet.test.ts`, 7 tests).

**Code delivered before the full run** (all outside `src/`): `scripts/lib/packet-state.ts`, `scripts/r4-contexts.ts`,
`r4-assemble.ts`, `r4-evalset.ts`, `r4-probes.ts`, `r4-wild.ts`, `r4-report.ts`, `r4-wild-report.ts`;
`training/decide_ft/train_r4.py`, `r4_py.sh`; `training/decide_ft/adapters.py` reads `MGOGO_FT_ADAPTERS` (unset: as
before); `scripts/em-loop.ts --packet state` (unset: as before).

- **Iteration 1 (logged before it runs): the full data generation** (`scripts/r4-contexts.ts` for the six worlds of §3 and
  the two test worlds again with `--no-rules-pick`; two processes at a time), then `r4-assemble.ts`, then `r4-wild.ts`.
- **Iteration 2 (logged before it runs): train `r4-rules-state`** on the assembled train file, 3 epochs, the settings
  of §4; swap and load read just before.

**Result of iteration 1 (7 October 2026, 11:53 to 11:54; head ab77bdc).** Each world took 8 to 16 s. Records sampled:
seed 48 W50 1,303, W25 1,456; seed 7 W50 1,225, W25 1,311; seed 21 W50 2,936, W25 2,630 (38 animals aged 8 and over in
every world). The world of seed 21, W50 with the taps and the packet switches hashes the same as the base alone
(`--check`). Assembled (`artifacts/decide-ft/r4/contexts/`, removed wordings found: 0):

| Split | Records | Labelled (the rules' decision on the menu) | Draws | Kept or arrived | Animals | Per base |
| --- | --- | --- | --- | --- | --- | --- |
| train | 3,200 | 3,122 | 2,091 | 1,109 | 61 | 1,600 and 1,600 |
| dev | 300 | 292 | 212 | 88 | 15 | 150 and 150 |
| test (seed 21) | 1,500 | 1,455 | 954 | 546 | 38 | 750 and 750 |

On the test draws the rules' argmax is the rules' decision at 0.98 (the rest is the belief the rules sample), so an
engine that reads state cannot be asked for more than about that. Evaluation files: 387 test packets also with shuffled
options, 954 draws with the rules' pick removed, 100 situations for each of the six probes (1,800 probe packets).
**A limit seen in the data, stated before any model is scored:** in these windows (days 6 to 14 after 28 September, a
season of plenty) body reserves stay within 2% of the usual store, so the reserves probe (down to 30% below) asks the
engine about states its training data does not hold.

Wild choices (`artifacts/decide-ft/r4/field/`, private): the train part's 977 records of 34 focal males; by the
registered rule 5 males (237 records) are the validation set and **740 records of 29 males are trained on** (300 of
them with a menu wider than 8, cut to sub-menus of 8), 2,960 rows over 4 epochs; no row over the token budget. The
validation males hold more records than their share of males (24% of records for 15% of males); the rule was fixed
before the data was read and is kept.

- Iteration 2 began at 11:55 (swap 5,010 MB used of 6,144 MB; load 6.4, 5.5, 5.0; no other model process).

**Result of iteration 2: failed, out of memory at the allocation cap (12:21, after 26 minutes).** The run died at about
step 245 of 1,173 with "MPS backend out of memory (MPS allocated: 6.54 GiB, other allocations: 539 MiB, max allowed:
7.10 GiB)": the cap is `PYTORCH_MPS_HIGH_WATERMARK_RATIO` 0.6 on this 16 GB machine, and one batch of two long packets
passed it (training packets by the server's estimate: median 522 tokens, 95th percentile 662, largest 750; the smoke
run's 197 examples had not met such a pair). Until then: 0.82 s per example, MPS driver memory 7.0 GiB (at the cap),
process footprint 8.1 GiB, swap 5.1 to 5.3 GB in use. Nothing was saved; no number from it is used. The untuned dev
agreement it printed before training (0.363 of 292, draws and kept acts together; chance 0.20) is a dev number.

- **Iteration 3 (memory, 1 of 3; logged before it runs).** One change, in the trainer and not in the settings of §4:
  when a batch hits the cap, the cache is emptied and that batch is shown one example at a time (the accumulated
  gradient is the same sum); the cache is emptied every 10 batches instead of 50; progress is written after every
  epoch. Batch 2 × 4, the top 8 layers, bf16 and the watermark stay. If it fails again, the ladder of §5 applies
  (batch 1 × 8, then the top 4 layers). Same data, same seed, 3 epochs.

**Result of iteration 3: `r4-rules-state` trained (12:35 to 14:58).** 3,122 labelled contexts, 3 epochs, 9,366 examples
shown: **7,841 s of training (2 h 11 min), 8,593 s of wall time (2 h 23 min) with the load and the four dev passes; 0.84
s per example; peak MPS driver memory 6.1 GiB, peak process footprint 6.8 GiB**; the cap was never hit again (0 retried
batches), so emptying the cache more often was enough. Swap in use 5,085 MB before, 4,548 MB after; load about 2 to 3.
Dev agreement with the rules' decision (292 contexts of 15 animals never trained on, draws and kept acts together,
chance 0.20): untuned 0.363; after epoch 1 0.620, epoch 2 0.630, epoch 3 0.637 (loss 1.77 → 1.02, 0.96, 0.93). The
saved epoch is 3 (lowest dev loss). These are dev numbers; the held-out test is below.

- **Iteration 4 (logged before it runs): score every evaluation packet** (`scripts/r4-eval.sh sim base`, then `sim
  r4-rules-state`), one model process at a time; then `scripts/r4-report.ts`.
  Scoring took 3,690 s for the untuned model's 6,141 packets and 2,680 s for the adapter's 4,641 (0.58 to 0.60 s per
  packet in batches of 8, fp16 on MPS, the machine shared). **A defect found while joining the scores, fixed before any
  result was read:** the sampler's record id (seed, base, tick, animal) is shared by two decision points when an animal
  decides twice in one tick (21 of the 1,500 test rows, 81 of the 3,200 training rows). Training is not affected (the id
  only seeds the option shuffle). For the evaluation the second of such a pair now gets a suffix and the scores are
  joined by position with a check of id and option count; the packets scored are byte for byte the same.
- **Iteration 5 (logged before it runs, 16:45): train `r4-field-groom`** on `field/train.jsonl` (740 records × 4 epochs),
  validation `field/val.jsonl`, the settings of §4; swap 3,978 MB used of 5,120 MB, load 2.1, no other model process.

**Result of iteration 5: `r4-field-groom` trained (16:45 to 17:12).** 2,960 rows (740 records × 4 epochs): 1,207 s of
training (20 min), 1,477 s of wall time; 0.41 s per example (the wild packets are short); peak MPS driver memory 5.4
GiB, footprint 5.4 GiB; no retried batch; swap 3,978 MB before, 3,962 MB after. Validation (237 records of the 5
validation males, wide menus cut to sub-menus of 8; chance 0.18): untuned 0.540, loss 1.40; epochs 1 to 4: 0.561,
0.608, 0.574, 0.561, loss 1.32, 1.26, 1.25, 1.26. The saved epoch is 3 (lowest loss). A validation number on five
males; the development part is below.

- **Iteration 6 (logged before it runs, 17:13): the remaining model runs, one process at a time, in this order:**
  `scripts/r4-eval.sh wild base`, `wild r4-rules-state`, `wild r4-field-groom` (development part only), `sim
  r4-field-groom`, `tokens`, `parity`, `latency r4-rules-state`; then the two report scripts.

**Iteration 6 ran as registered (17:13 to 18:10; one model process at a time; swap 3.9 GB in use throughout, load
about 2).** Then one check that loads no model, logged here as it was made: `scripts/em-loop.ts --packet state
--provider argmax` for 1 simulated day after 1 (seed 48), to see that the in-loop command's packet path runs.

### Results (7 October 2026; offline only; nothing was run in the loop; every table is a script's output)

Tables: `docs/staging/r4-numbers.md` (simulated contexts, `scripts/r4-report.ts`) and `docs/staging/r4-wild-numbers.md`
(wild choices, `scripts/r4-wild-report.ts`). Adapters, data and per-record scores: `artifacts/decide-ft/r4/` in this
worktree (gitignored; the two adapters are 9.8 MB each).

**The answer.** Trained on the animal's state alone, the small model learned to choose much as the rules do: on
held-out decision points (seed 21, 38 animals, never trained on) it picks the rules' decision at **0.61 of the rules'
draws (0.57 to 0.65) against 0.29 (0.26 to 0.32) untuned; chance 0.19**; the difference is +0.32 (0.28 to 0.36). It did
not learn everything: it finds the exact food option the rules chose at 0.37, one state probe still moves the wrong
way, and the wild-choice score moved little.

**Thresholds.**

| | Threshold | Result |
| --- | --- | --- |
| T1 | `r4-rules-state` minus untuned on held-out draws is above 0 | **met**: +0.323 (0.282 to 0.363); 0.609 against 0.286, 954 draws |
| T2 | token parity; no packet over 1,280 tokens | **met**: `PARITY OK` on 12 dev contexts (equal token ids, probability gap 0); state-only packets median 452 real tokens, 95th percentile 583, largest 646 (the served v4 packet: 493, 639, 718) |
| T3 | no state probe the wrong way for `r4-rules-state` | **not met**: heat moves the wrong way (rest −0.021, −0.024 to −0.018; the untuned model −0.024). Four move the right way, reserves does not respond |
| T4 | `r4-field-groom` minus untuned on the wild development part, plain, all records, is above 0 | **not met**: +0.027 (−0.010 to 0.057), 0.400 against 0.373. With the fan-out wrapper it is a difference: +0.045 (0.012 to 0.077), 0.480 against 0.435 |

**1. Agreement with the rules' decision, held-out contexts (state-only packet; 95% intervals over animals).**

| Decision points | n | Chance | Untuned | `r4-rules-state` | Difference |
| --- | --- | --- | --- | --- | --- |
| draws (the main number) | 954 | 0.19 | 0.29 (0.26 to 0.32) | 0.61 (0.57 to 0.65) | +0.32 (0.28 to 0.36), yes |
| kept or arrived acts | 501 | 0.19 | 0.40 (0.35 to 0.45) | 0.66 (0.62 to 0.71) | +0.27 (0.21 to 0.32), yes |
| draws, base W50 / W25 | 484 / 470 | 0.18 / 0.19 | 0.24 / 0.33 | 0.62 / 0.60 | +0.38 / +0.27, yes / yes |
| feeding | 279 | 0.19 | 0.08 (0.04 to 0.11) | 0.37 (0.30 to 0.44) | +0.29 (0.23 to 0.36), yes |
| travel | 88 | 0.18 | 0.10 (0.02 to 0.20) | 0.73 (0.63 to 0.82) | +0.63 (0.47 to 0.76), yes |
| rest | 287 | 0.19 | 0.31 (0.25 to 0.37) | 0.78 (0.72 to 0.83) | +0.47 (0.39 to 0.54), yes |
| social | 203 | 0.15 | 0.42 (0.35 to 0.49) | 0.54 (0.44 to 0.64) | +0.12 (0.00 to 0.24), no |
| night (dusk and night) | 97 | 0.24 | 0.72 (0.63 to 0.82) | 0.84 (0.75 to 0.91) | +0.11 (0.01 to 0.20), yes |

The ceiling for any reader of state is about 0.98 (the rules' argmax against their own decision: they sample a belief).
The untuned model on the v4 packet as served scores 0.30, so removing the rate, the company words and the rule
sentences cost it nothing measurable (−0.015, −0.031 to 0.002).

*Where it still differs.* When the rules feed (279 draws), the adapter picks some feeding option at 0.57 (untuned
0.13) but the same one at 0.37: its commonest miss is to feed where it stands when the rules walk to another crown
(42 of 279), then to rest (50). Share of picks on draws: feeding 0.20 (the rules 0.29, untuned 0.09), travel 0.14 (0.09,
0.04), rest 0.36 (0.30, 0.25), social 0.20 (0.21, 0.52). So it no longer leans social (grooming picked when offered:
0.14, the rules 0.15, untuned 0.51), and **it still feeds less often than the rules**. With its options shuffled it
picks the same option at 0.89 (untuned 0.75).

**2. The rules' pick removed (the second number; 954 draws, `kernelNoRulesPick` 1).** The adapter picks the best
remaining option by the rules' score at 0.46 (0.43 to 0.49) against 0.21 untuned (0.18 to 0.24; chance 0.21):
+0.25 (0.21 to 0.29). So what it learned is not only "find the rules' favourite": it ranks the rest as the rules do
about half the time. Its pick is of the same kind as the removed one at 0.19, as untuned (0.19): the menu keeps one
place per act, so a second option of the same kind is usually not there.

**3. State probes (M2's design; 100 held-out situations each; Δ = probability on the target at the high level minus the
low level).**

| Probe → target | Untuned | `r4-rules-state` | `r4-field-groom` |
| --- | --- | --- | --- |
| energy deficit → feeding | +0.125, right | **+0.165 (0.144 to 0.190), right** | +0.036, right |
| reserves falling → feeding | −0.003, wrong | +0.002 (−0.000 to 0.005), does not respond | −0.005, wrong |
| sleep → rest and nest | +0.152, right | +0.113 (0.094 to 0.134), right | +0.090, right |
| light falling → nest | +0.020, right | **+0.116 (0.088 to 0.146), right** | +0.022, right |
| heat → rest | −0.024, wrong | −0.021 (−0.024 to −0.018), **wrong** | −0.022, wrong |
| water deficit → drink | +0.168, right | **+0.256 (0.228 to 0.286), right** | +0.099, right |

Read plainly: the body state now moves the choice more for hunger, light and water, about as before for sleep, and
the two states the training data hardly holds are not learned. Of 3,200 training contexts 5 say "hot" (491 "warm") and
none has reserves below "a little low" (37): the windows are a few cool days in a season of plenty. That explains the
two failures without excusing them; they need training contexts from the lean season and from hot days.

**4. Wild choices, development part only (448 records of 30 focal males; top-1; the sealed part was not read).**

| Kernel | All | Menus of 8 or fewer (253) | Wider menus (195) |
| --- | --- | --- | --- |
| untuned, plain | 0.373 (0.308 to 0.438) | 0.522 | 0.179 |
| `r4-field-groom`, plain | 0.400 (0.320 to 0.474) | 0.549 | 0.205 |
| `r4-rules-state`, plain | 0.406 (0.331 to 0.470) | 0.553 | 0.215 |
| untuned, fan-out | 0.435 (0.371 to 0.511) | 0.522 | 0.323 |
| `r4-field-groom`, fan-out | 0.480 (0.417 to 0.550) | 0.549 | 0.390 |
| `r4-rules-state`, fan-out | 0.480 (0.414 to 0.542) | 0.553 | 0.385 |
| the simple rule stack | 0.487 (0.418 to 0.545) | 0.542 | 0.415 |

The untuned run reproduces the published figures exactly (0.373, 0.435). Paired with the untuned model: field
adapter plain +0.027 (−0.010 to 0.057), not a difference; with fan-out +0.045 (0.012 to 0.077), a difference, from the
wide menus (+0.067, 0.004 to 0.133). The rules-labelled adapter, which never saw a wild choice: plain +0.033 (−0.011 to
0.070) and fan-out +0.045 (−0.009 to 0.092), neither a difference. With fan-out neither adapter differs from the rule
stack (−0.007, −0.032 to 0.032 for the field adapter); the untuned model did (−0.051). So 740 wild choices bought a
small gain that shows only with the fan-out wrapper, and the two adapters are indistinguishable here.

**5. The field adapter on simulated contexts (no threshold).** Agreement with the rules on draws 0.29 (untuned 0.29;
+0.005, −0.015 to 0.024). It moved toward rest (+0.11, a difference) and away from night decisions (−0.11, a
difference) and feeding (−0.03, a difference). Trained on grooming menus alone it is not an engine for the loop.

**6. Manifests.** Both adapters carry their label source, record counts and hashes, `labels_from_jev_or_an_outside_model:
false` and the trainer's commit; the rules set's check found 0 removed wordings in 5,000 packets; the field adapter's
manifest names "field choices, Ngogo male grooming" and lists T-SOC-1, T-SOC-2, T-FIS-1, T-FIS-3, T-FIS-5 as compromised
for itself (a test asserts the helper marks them).

**Cost on this Mac (M4, 16 GB, shared).** `r4-rules-state`: 2 h 11 min of training (0.84 s per example, 9,366 shown),
6.8 GiB footprint. `r4-field-groom`: 20 min, 5.4 GiB. One failed run before (26 minutes lost at MPS's allocation cap).
Scoring: about 0.6 s per packet in batches of 8, 0.42 s per decision one packet at a time (36 packets in 15 s after
warm-up). Training on MPS within 16 GB works; a second model process at the same time would not fit beside it.

**What the engine still cannot do.** (1) Choose among food options as the rules do (0.37), and it feeds less often
than they do; the packet shows crop, distance and feeders but not the terms the rules add (the cost of a place, the
revisit history, the rate). (2) Answer to heat and to low reserves. (3) Social choices are not better than untuned by
the registered rule. (4) Nothing here shows behaviour: agreement is measured at states the rules visited; in the loop
its own choices change the states it meets (M3 found the untuned model underfed). (5) All of it is one season: days 6
to 14 from 28 September.

**Not done.** The mixed adapter (optional, not started). Stand-ins were not refit, so the plan's fourth criterion
(stand-in agreement with its adapter) is open. No in-loop run.

### The in-loop command (ready, not run with a model)

M3's focal design with the state-only packet and an r4 adapter, from this worktree (the adapters are under its
`artifacts/decide-ft/r4/adapters/`; copy that folder to run elsewhere):

```sh
MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python \
HF_HOME=/Volumes/Drive/chimpbench/hf-cache HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub \
MGOGO_FT_ROOT=artifacts/decide-ft/r4 MGOGO_FT_ADAPTERS=r4-rules-state \
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/em-loop.ts --seed 48 --burn-in 30 --days 5 --provider r4-rules-state \
  --packet state --params-file docs/staging/integrator-kit/params/M6-W50.json --arms rules,model \
  --out artifacts/decide-ft/r4/loop/s48-W50-r4-rules-state        # add --gate rg for the gate on
```

`--packet state` gives the world `observeV4` 1 and `menuParity` 1 and sends the provider the text the adapter was
trained on (a test asserts the kernel's packet is the training packet). Checked without a model (`--provider argmax`, 1
day after 1, seed 48): the path runs, 5 focal animals were asked 650 times in a day with the gate off, every answer
applied. It reads M3's readouts (activity shares, kcal a day, reserves, nights out of a nest, agreement), not R1b's
scorecard rows; `--seed` takes 48 and 7.

**What is feasible here.** At 0.4 to 0.6 s per decision: the focal design (5 animals, 5 days, about 3,250 decisions with
the gate off) is about 25 to 35 minutes of model time per arm and seed, so two seeds, both bases and both gate
settings fit in an afternoon. The whole population aged 8 and over (38 animals) is about 4,900 decisions a simulated day
with the gate off (about 2,400 with it on): 35 to 50 minutes a day, so **R1b's design (60 days, 5 seeds) is 35 to 50
hours per seed-run and is not feasible with the real model on this Mac; a whole-population run of about 5 days on one
seed is (3 to 4 hours per arm)**. An R1b-style run therefore needs a distilled stand-in, and the present stand-in cannot
be refit as it is: its first two features are each option's rules score and a flag on the rules' pick, and it has no
feature for the body state or for an option's beliefs. A stand-in for a state-only engine needs a new feature layout
and its agreement with the adapter measured before any figure uses it.

### Open questions for the user

1. **Is an option's net energy rate ("about 340 kcal an hour net") state or the rules' valuation?** It was removed
   here as the food term of the rules' valuation. If it counts as a belief the animal can hold, the feeding gap may
   narrow; retraining takes 2 h 11 min.
2. **More seasons before the loop?** The reserves and heat failures come from a training window of a few cool days of
   plenty. Sampling the lean season needs longer simulated runs than "a few days per seed" (rules-driven, cheap: a
   world-day takes about a second).
3. **The field adapter's test.** By the registered rule it did not beat the untuned model plain. Opening the sealed
   part for it would spend a one-time read on a marginal result; it was not opened.

### Checks at the end (7 October 2026, 18:13; no model process running)

`tsc --noEmit -p .` clean; `gen-params --check` clean (1,042 entries); `tests/r4-packet.test.ts` 7 of 7; the full
`pnpm test` once: **1,059 tests, 1,059 pass, 0 fail, 0 skipped** (2 min 32 s). The goldens and the field pin are
unchanged; no file under `src/` or `data/` was edited; every switch default is as before.
