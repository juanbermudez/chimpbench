# Stage R4b: retrain the small engine on the situations its first training never showed it (pre-registration)

Agent r4b-retrain, branch `r4b-retrain` from `track-e` bbd8b3e. Registered 8 October 2026, before any code, sampling,
training or model run. It follows `docs/staging/r4-prereg.md` (the first adapter, `r4-rules-state`) and
`docs/staging/r5-pilot-prereg.md` §7 (that adapter in the loop). Specification: `IMPLEMENTATION_PLAN.md`, Track R.

The user's decisions that bind this stage, verbatim:

- "yes just state in training": the input holds the animal's state, perceptions and beliefs only.
- "no cloud machine run things locally": everything on this Mac (Apple M4, 16 GB, MPS).
- "Field labels go into a separate, small, named adapter, not the main label source."
- "Use 0.5 as the declared working base for the engine comparisons, 0.25 as the sensitivity check."
- Jev's or any outside model's answers are never training labels.

No benchmark over a whole population (no `e-bench`, no `e-run`). No network, no paid call, no outside model. Nothing
under `src/` or `data/` changes; every switch stays 0 by default; goldens and the field pin do not move.

## 1. What changes from R4, and the measured gap behind each change

One change set, decided now. It is not a search: one adapter is trained once.

| Change | The measured gap it answers |
| --- | --- |
| **Coverage of the year.** Training contexts come from a whole simulated year of each training world, not from four days. | R4's contexts were days 6 to 14 after 28 September. Of its 3,200 training packets 5 say "hot" and 37 say reserves are "a little low"; none is lower. Offline, heat moved rest the wrong way (−0.021) and reserves did not move feeding (+0.002). The pilot ran in a rich and a middle stretch only. |
| **Rare states present by rule.** Part of the set is drawn from decision points where the animal is hot, run down, short of water with water on the menu, or has no ripe fruit in sight and a remembered food tree on the menu. | In the loop the first adapter took a trip to a remembered food tree at 0.19 of the times the rules did and a drink at 0.13; its animals ate 7% less (−116 kcal a day, −184 to −48) and fed 29 minutes less. R4's training set held 309 food-trip labels and 41 drink labels of 3,122, 17 of the 41 at night. |
| **An unseen seed in the loop.** | Both pilot seeds (48, 7) were training seeds. |

**Unchanged, on purpose** (so the effect is the coverage's): the input (§3), the label source (§4), the model, every
training setting and the size of the training set (§5), the evaluation scripts (§6), the loop's tools and design (§7).

## 2. Contexts: how the days and the situations are found

Sampler: `scripts/r4b-contexts.ts`, which is R4's tap method (`scripts/r4-contexts.ts` `sampleR4`: the world runs on
the rules, the request is built before the decision, the rules' decision is recorded after it, sampling by a hash of
seed, tick and animal, never `world.rng`) with two additions that read only: a per-day census and a record of each
sampled animal's state. A test asserts the tapped world hashes the same as the base alone.

**Worlds.** Field profile, the bases `M6-W50` and `M6-W25` (half of every split from each), switches `observeV4` 1,
`menuParity` 1, as R4.

| Split | Seed | Bases | Burn-in, then sampled days | Animals |
| --- | --- | --- | --- | --- |
| train, dev | 48 | W50, W25 | 6, then 365 | dev: animals whose hash of (seed, id) is below 0.12 (R4's rule and R4's animals); train: the rest |
| train, dev | 7 | W50, W25 | 6, then 365 | as above |
| held-out test | 21 | W50, W25 | 6, then 365 | all |

Seeds 48 and 7 only for training and dev, 21 only for the held-out test. None is reserved or retired (`AGENTS.md`).
Every decision point of an animal aged `rgMinAge` (8) or over is sampled with probability 0.03 on every day (a pool of
roughly 35,000 to 40,000 records per world). The two bases of a seed start from one world and part within days; each
world's days are classed from its own census.

**The census (the simulation's own state, read before any record is chosen).** For each sampled day of a world:
the highest air temperature (`environment.temperature`), the share of daylight ticks with rain falling
(`environment.rain` above 0), the crop index (the phenology crop of every tree at noon, `cropTarget`, a pure function
of tree and time: R5-pilot's season index, over the whole map), and at the day's end the median body reserves of the
living animals aged 8 and over with the share at 3% or more below their usual store.

**Day classes.** Each of a world's 365 days gets one class, in this order:

1. **hot day**: the 37 days (a tenth) with the highest air temperature;
2. **rainy day**: of the rest, the 37 with the largest share of daylight under rain;
3. **lean-season day**: of the rest, days whose crop index is in the lowest third of the year's 365;
4. **rich day**: of the rest, days whose crop index is in the upper third (the kind R4's seed-48 days were);
5. **middle day**: the rest.

**Situation classes (the animal's own state and menu at the decision point; never the label).** From any day:

- **hot now**: the packet's body line says "hot" (thermal load 0.4 or more);
- **run down**: the body line puts reserves below the usual store (3% or more below: "a little low" or worse);
- **short of water, water offered**: the body line says "short of water" or "badly short of water" and a drink is on
  the menu (any light: the rules also drink at night);
- **food out of sight**: by day or dawn, a trip to a remembered food tree is on the menu and no option to feed on ripe
  fruit is (the only food in reach, if any, is leaves and pith).

These select on what the animal perceives and feels, so within each the labels keep the rules' own proportions. No
record is chosen, dropped or weighted by its label.

**Proportions (fixed now).** Per training world 800 contexts, 3,200 in all (R4's size):

| Part | Share | Per training world | Per test world (750) | Per world, dev (75) |
| --- | --- | --- | --- | --- |
| lean-season days | 20% | 160 | 150 | 15 |
| hot days | 12.5% | 100 | 94 | 9 |
| rainy days | 7.5% | 60 | 56 | 6 |
| rich days | 20% | 160 | 150 | 15 |
| middle days | 10% | 80 | 76 | 8 |
| hot now | 7.5% | 60 | 56 | 5 |
| run down | 7.5% | 60 | 56 | 5 |
| short of water, water offered | 7.5% | 60 | 56 | 6 |
| food out of sight | 7.5% | 60 | 56 | 6 |

Order of drawing in a world and split: the four situation classes first (in the order listed; a record that fits two
goes to the first), each in a fixed hash order of its records with **at most a quarter of the class's places from one
animal**; then the five day classes in hash order from the records not yet taken. If a pool is short, what there is is
taken, the missing places go to the middle days of that world, and the shortfall is reported. A test asserts no animal
is in both train and dev.

**Reported before training** (the assembler's manifest; amendment A1): per split, records by part; by the body's
heat, reserves and water words; rain now; and by the rules' decision: feeding where it stands, **a trip to food out of
sight, a drink** (by light phase), rest, nest, moving with others, social. R4's numbers for comparison: 309 trips and
41 drinks in 3,122 labelled contexts; 5 "hot"; 37 below the usual store.

## 3. Input: unchanged

The state-only packet of R4 (`scripts/lib/packet-state.ts`, version `r4-state-1`), byte for byte: no rules' score,
value or mark of the rules' pick; **the net energy rate stays out.** No line is added, so no second adapter is trained.
Why: each gap has a coverage cause that can be counted, and the packet already carries the animal's side of each. Heat:
the body line's heat word and the air temperature. Reserves: "body reserves … (N% below)". Water: the water word, the
thirst in `feeling` and `urgent` (offline the first adapter already moves toward drinking with the water deficit,
+0.256; what it lacks is drinking at night and from the nest, 17 of its 41 examples). A trip: the crop and distance of
the remembered tree, the crop where it stands, who feeds there, the energy shortfall and the waking time left. If the
retrained adapter still misses a gap whose situations it has now seen in number, that is the evidence that the packet
lacks something the animal has, and it is reported as a decision for the user, not patched here.

## 4. Labels

The rules kernel's own decision at each sampled decision point (`rgChoice`, read by `rgTap`), as R4. **The adapter
inherits the rules' judgment**: it is taught "do what the rules did, from state alone"; agreement with the rules is not
correctness about chimpanzees. A record whose rules' decision is not on the menu is kept for the readouts and left out
of training. Every example has weight 1; nothing is reweighted toward the rules' feeding share or any other rate.

## 5. Training

Adapter `r4b-rules-state` under `artifacts/decide-ft/r4b/adapters/`, by `training/decide_ft/train_r4.py` with R4's
settings unchanged: LoRA r 16, alpha 32, dropout 0.05 on the classifier and the top 8 of 24 encoder layers; bf16 on
MPS; batch 2 × 4 accumulation steps; AdamW 2e-4, no weight decay; 10% warm-up then linear decay; clip 1.0; seed 7;
3 epochs, each context in its own or a shuffled option order; the saved epoch is the one with the lowest dev loss;
`PYTORCH_MPS_HIGH_WATERMARK_RATIO` 0.6, the cache emptied every 10 batches, a batch that hits the cap shown one example
at a time (R4's iteration 3). Expected from R4: about 0.84 s per example, 2 h 15 min, 6.8 GiB. Its manifest carries the
label source, the parts and their hashes, the removed-wording count (0 required) and that no label comes from Jev or an
outside model.

## 6. Offline evaluation, as R4 did it

Models: the untuned model, `r4-rules-state` (sha256 `e09fd6f4…1932`, a copy; the original is not touched),
`r4b-rules-state`. Served as the worker serves them (fp16 on MPS). Intervals: 95% bootstraps over animals (2,000
resamples, a fixed stream), by `scripts/r4-report.ts`. A difference is called one only if its paired interval excludes 0.

**A. R4's own evaluation file, unchanged** (seed 21, days 6 to 14; 1,500 decision points, a quarter shuffled, 954 draws
with the rules' pick removed, 1,800 probe packets). The untuned and first adapter's score files are R4's (copied, hashes
recorded); only `r4b-rules-state` is scored. Every table of `docs/staging/r4-numbers.md` gains a column: agreement
overall and by kind, shares of picks, shuffled options, the rules' pick removed, the six state probes.

**B. The year-round held-out set** (seed 21, both bases, 1,500 decision points, the proportions of §2), scored by all
three: agreement on draws overall, by kind, by part of §2, and where the rules' decision is a trip to food or a drink.

**Token parity and size.** `parity.py --n 12 --device cpu` on r4b dev contexts; real token counts of every B packet.

**Wild choices, development part only** (448 records; `scripts/rw-score.ts --part development`, plain and fan-out) for
`r4b-rules-state`; the untuned and first adapter's per-record outputs are R4's. The sealed part is never opened.

Thresholds, fixed now:

| | Threshold | It would count as no improvement if |
| --- | --- | --- |
| T1 | on B's draws, `r4b` minus `r4` is above 0, interval above 0 | the interval includes 0 or is below it |
| T1a | on A's draws (R4's own days), `r4b` minus `r4` is not below 0 (its interval is not wholly below 0) | the interval is wholly below 0: coverage was bought with the rich days |
| T2 | `PARITY OK`; no packet over 1,280 tokens | either fails |
| T3 | on A's probe packets no probe moves the wrong way for `r4b`; **heat** and **reserves** each move the right way | heat still moves the wrong way, or reserves still does not respond |
| T4 | wild development part: `r4b` minus `r4`, plain and fan-out, not wholly below 0 | either interval is wholly below 0 |
| T5 (reported, no pass mark) | agreement where the rules take a trip to food, and where they drink (A and B), `r4b` against `r4`; the share of picks that are feeding against the rules' | – |

## 7. In the loop, with R5-pilot's tools and design

Runner: `scripts/r4b-loop.ts`, which calls R5-pilot's `runArm` (the same step, receipts, replay, focal rule and
measures) and differs from `scripts/r5-pilot.ts` only in the seeds it accepts and in naming the burn-in day. Report:
`scripts/r5-report.ts` (the pilot's comparison: paired by animal-day against the rules arm, 95% t intervals over
animals, the rules re-draws as the noise, the pilot's three words "differs", "close", "not resolved").

- **Base** W50 with `observeV4` 1 and `menuParity` 1. The gate off, the rules' pick kept (the pilot's main setting).
- **Seed 21**, never trained on by either adapter. Seed 5 as a second only if everything else here is done.
- **Standard window**: 30 days of burn-in on the rules, then 5 days (the pilot's window).
- **Lean window (seed 21)**: the 5 consecutive days with the lowest mean crop index inside the focal community's range
  among start days 40 to 360 (R5-pilot's `season` index, a pure function of the phenology record; the community is the
  focal rule's on the day-30 world). The burn-in runs on the rules to that day and the focal rule is applied there. The
  window must read "lean" by the pilot's rule (below the year's lower third); the census's body reserves on those days
  are reported beside it.
- **Focal animals**: M3's rule (`focalSet`), five per world, the same in every arm.
- **Arms**: `rules`; `rules-r1`, `-r2`, `-r3` (noise); `argmax` (the loop without a model); `trained`
  (`r4-rules-state`); `retrained` (`r4b-rules-state`). Both model arms in one worker process. Each kernel arm is
  replayed from its receipts and must end on its run's hash.
- **Measures per animal-day** (simulation truth): energy eaten, feeding minutes, **trips to food begun** (the animal
  starts travelling to a food tree of its own choice, or changes the tree), **drinks** (arrivals at water to drink),
  distance, nights in a nest, the water deficit at the day's end; and the share of new acts the model's choice settled.
  Trips and drinks are two counters added to the pilot's measurement block; they read only (the pilot's test that
  measuring leaves the world's hash unchanged covers them).
- From the receipts: how often each model took the rules' pick when it was a trip to food and when it was a drink
  (the pilot's 0.19 and 0.13).

Words, fixed now, per measure and window:

- **gap closed**: `retrained` reads "close" to the rules, and `retrained` minus `trained` (same animals and days)
  has an interval that excludes 0 on the side of the rules;
- **improved, not closed**: that interval excludes 0 on the side of the rules, and `retrained` still "differs";
- **no improvement shown**: the interval includes 0, or lies on the far side from the rules.

**What five animals can show, said before the run.** The pilot's half-widths on one seed were about 100 to 125 kcal
and 12 to 15 feeding minutes; on seed 48 alone the first adapter's intake gap (−79 kcal) was not resolved. So "no
improvement shown" is a likely reading for intake even if the engine is better, and the counts of trips and drinks
and the receipts' agreement by kind are the more sensitive readouts.

**Written before any run** (to be checked, not to be met): the retrained adapter agrees more on B (it has seen the
year) and about the same on A; heat stops moving the wrong way but may only reach "does not respond", because the
probe's hottest level (31 °C, load 0.5) may still be rarer than the year provides; reserves moves the right way only if
the year holds run-down animals in number; in the loop it starts more trips and drinks more than the first adapter,
and still fewer than the rules.

## 8. Machine rules and order of work

One model process at a time. Before each training or model run `uptime` and `sysctl -n vm.swapusage` are read and
logged in §9; no run starts while swap in use is above 6 GB (wait and re-check). If a run dies at MPS's memory cap it
is logged and the batch is reduced as R4 registered (batch 1 × 8, then the top 4 layers); at most 3 iterations per
problem, then stop and report. Every iteration is logged in §9 before it runs. Runs only from a committed head.

Order: 1. this file, committed. 2. Code and tests. 3. **Iteration 0**, a smoke check of the sampler (seed 48, W50, 2
days after 6, `--check`), no model. 4. The six world-years (two processes at a time), the assembly, amendment A1 with
the counts of §2. 5. Train. 6. Evaluations A, B, tokens, parity, wild. 7. The loop: seed 21 standard, seed 21 lean,
then seed 5. 8. Results in §9, the plan's status line, the full test suite once with no model running.

If time or memory runs out, work stops in this order and what was not done is said: seed 5; the wild-choice check;
B's token counts; the lean window. The adapter with evaluation A and the standard window on seed 21 is the minimum.

## 9. Iteration log and results

Machine at registration (8 October 2026, 00:13): load averages 2.84, 2.82, 2.79; swap 3,778 MB used of 5,120 MB; no
model process running.

**Code delivered before any run** (all outside `src/`): `scripts/r4b-contexts.ts` (the year sampler and census),
`r4b-assemble.ts` (day and situation classes, the splits, the data manifest), `r4b-evalset.ts`, `r4b-eval.sh`,
`r4b-loop.ts`; `tests/r4b.test.ts` (4 tests). Changed, with their old behaviour kept when the new options are not
given: `scripts/r4-contexts.ts` (three read-only hooks for the year sampler), `r4-report.ts` and `r4-wild-report.ts`
(`--versus`: each adapter also paired with a named one; rows by what the rules decided and by part), `r5-pilot.ts`
(the arm `retrained`; trips to food begun and drinks counted per animal-day; `tripsDone`, trips that ended feeding in
the tree set out for, is an extra counter labelled exploratory: with the gate off a model is asked again on the way
and can "begin" one trip twice), `r5-report.ts` (the new arm and measures, and the table with the words of §7).
`tsc` clean; `tests/r4b.test.ts`, `tests/r4-packet.test.ts`, `tests/r5-pilot.test.ts`: 16 tests, 16 pass.

- **Iteration 0 (logged before it runs): the smoke check of the sampler.** Seed 48, W50, 2 days after 6 of burn-in,
  p 0.03, `--check` (the tapped world against the base alone), output under `artifacts/decide-ft/r4b/smoke/`. It gives
  the seconds per simulated day and the records per day; no number of it is used for anything else. No model.
  Result (8 October 2026, 00:28, head 220776b): 232 records of 38 animals in the 2 days (116 a day at p 0.03; 166
  draws, the rules' decision on the menu at 227); the tapped world hashes the same as the base alone; 19 s for the
  two passes of 8 days (about 1.2 s a simulated day, so a world-year is about 7 to 8 minutes and about 42,000
  records, 190 MB). The two days' census: highest air temperature 24.2 °C on both, no rain, median reserves 0.2%
  below the usual store, 0.02% to 0.06% of the animals' daylight time "hot". No stop rule; nothing changed.

- **Iteration 1 (logged before it runs, 00:30): the six world-years** (`scripts/r4b-contexts.ts`, seeds 48, 7, 21 ×
  W50, W25; burn-in 6, 365 days, p 0.03; two processes at a time; `--check` on seed 21 W50), then
  `scripts/r4b-assemble.ts` and `scripts/r4b-evalset.ts`. No model. Machine: load 8.3, 4.2, 3.2 (this agent's
  tests); swap 3,778 MB in use.
  Result (00:30 to 00:46, head 23b3726 for the last pair; the sampler's code is that of 220776b). Each world-year
  took 258 to 310 s (498 s with the check). Records: seed 48 W50 36,839, W25 36,387; seed 7 W50 39,535, W25 39,552;
  seed 21 W50 38,421, W25 38,065; no decision point skipped. Seed 21 W50's tapped world hashes the same as the base
  alone (63f8d04d2c4d1c02). The year holds a lean season: around days 120 to 160 the crop index falls to a quarter of
  its high and the animals' median reserves to 4% to 10% below the usual store (lowest day: seed 48 −7.6% and −10.0%,
  seed 7 −3.8% and −4.4%, seed 21 −6.2% and −6.1%; W50 and W25).

### Amendment A1 (8 October 2026, 00:50; after the census was read, before any record was chosen and before any model ran)

**Hot days cannot be ranked by the air temperature.** The simulation's air temperature has a daily cycle and cooling
by cloud and rain, and no season: its daily high lies between 22.9 and 24.2 °C in every world, and 90 to 101 of a
world's 365 days share the same high of 24.21 °C. "The 37 days with the highest air temperature" is therefore a draw
among about 95 tied days, and the tie-break in the code (the earlier day) would have filled the class with the first
weeks of the year, the season R4 already used. **Changed:** hot days are the 37 days on which the animals spent the
largest share of their daylight time "hot" (thermal load 0.4 or more, the packet's own word; the census's `hotShare`,
read every 5 minutes over the living animals aged 8 and over), ties by the higher air temperature, then the earlier
day. That share runs from 0 to 4% to 9% of daylight animal-time by world (the 37th day: about 2%). It is the
simulation's own state, read before any label or model result. Nothing else in §2 changes: rainy days, the crop
thirds, the situation classes, the proportions and the order of drawing stand. A consequence said now: with no hot
weather in the simulation, the probe's hot level (31 °C, load 0.5) describes a state the rules' world reaches only
briefly, in the sun and after exertion; "hot" records are found by the situation class, not by the weather.

**The assembled data (00:47, head 7f48797; tables: `docs/staging/r4b-data.md`, by `scripts/r4b-data-report.ts`).**
Every place of §2 was filled from its own pool; no shortfall. Train 3,200 (3,121 labelled; 61 animals; 1,246
world-days of the four training world-years), dev 300 (295; 15 animals), held-out test 1,500 (1,477; 39 animals;
seed 21). Removed wordings found: 0. Against R4's training file, in the packet's own words:

| In the training set | R4 | R4b |
| --- | --- | --- |
| body "hot" | 5 | 261 |
| reserves below the usual store ("a little low", "run down", "badly run down") | 37, 0, 0 | 747, 197, 44 |
| "short of water" or worse with a drink on the menu | 254 | 467 |
| no ripe fruit in reach and a remembered food tree on the menu | 685 | 930 |
| rain falling at the decision | not counted | 78 |
| the rules take a trip to a remembered food tree | 309 | 312 |
| the rules drink (of which at night) | 41 (20) | 78 (40) |
| the rules feed where they stand | 435 | 447 |

Said plainly before training: **the states are now there; the two under-chosen decisions are not much more
numerous.** Trips to food are as many as in R4 (312; 170 of them with no ripe fruit in reach), because nothing is
drawn by its label and the rules set out for food about as often in any season. Drinks doubled to 78, half of them
at night; that is still a small number to learn from. By day the rules rest or shelter at 0.45 of "hot" records,
0.28 of "comfortable" ones and 0.24 of "warm" ones, so the data holds an answer to "hot" but not a steady rise with
heat. Correction to §1 and §3: R4's 41 drink labels hold 20 at night, not 17.

- **Iteration 2 (logged before it runs, 00:49): train `r4b-rules-state`** (`scripts/r4b-eval.sh train`: R4's
  settings, 3 epochs, 3,121 labelled contexts). Machine: load 2.1, 2.9, 3.4; swap 3,778 MB in use of 5,120 MB; no
  model process running. While it trains, the loop's arms that load no model are run (iteration 3).
- **Iteration 3 (logged before it runs; no model): seed 21, the standard window and the lean window**
  (`scripts/r4b-chain.sh nomodel 21 standard`, then `nomodel 21 lean`): the burn-ins, the lean window named by the
  rule of §7 before any arm of it runs, the rules arm, its three re-draws, the loop without a model and its replay.
  Iteration 2 began at 00:48 (detached from the session so no tool limit can end it).
  Result of iteration 3 (00:49 to 00:51, head bb85bd9, clean tree; no model). **Standard window:** burn-in 30 days,
  hash 689d34e12fcd2948; focal animals Tavuni (alpha), Sanaki, Lwazo (lactating), Fumbira, Dembiri; days 30 to 35 are a
  **rich** stretch (crop 1.43 times the year's mean, above 80% of the year's days; the census's median reserves 0.1%
  to 0.4% below the usual store). **Lean window, named before any arm of it ran:** start day 119 (crop 0.38 of the
  year's mean inside the day-30 focal community's range, below 99% of the year's days); burn-in 119 days, hash
  504bb50852012623; focal animals Tavuni, Koruza, Lwazo, Fumbira, Dembiri; by the pilot's season rule on that world
  days 119 to 124 read **lean** (0.37 of the year's mean, above 2% of the year's days), and in the census the
  animals' median reserves are 4.1% to 4.7% below the usual store on those days, with 74% to 82% of the animals 3% or
  more below. Each rules arm took 4 to 6 s; the loop without a model was asked 4,417 times in the standard window
  and 3,623 in the lean one; both replays ended on their run's hash (0805a9c8d92e927b, e712d96ccd7ec649).

- **Iteration 4 (logged before it runs): the offline evaluation's model runs** (`scripts/r4b-offline.sh`, after the
  training ends): A for `r4b-rules-state`; B for the untuned model, `r4-rules-state` and `r4b-rules-state`; token
  counts; parity; the wild-choice development part for `r4b-rules-state`. One model process at a time, the swap check
  before each.
- **Iteration 5 (logged before it runs): the loop's model arms on seed 21** (`scripts/r4b-chain.sh model 21
  standard`, then `model 21 lean`): `trained` and `retrained` in one worker process, then their replays; after
  iteration 4. Seed 5 (iteration 6) only if everything else is done.

**Result of iteration 2: `r4b-rules-state` trained (00:48 to 03:25; no memory failure, first attempt).** 3,121
labelled contexts, 3 epochs, 9,363 examples shown: **8,197 s of training (2 h 17 min), 9,050 s of wall time (2 h 31
min) with the load and the four dev passes; 0.88 s per example; peak MPS driver memory 6.1 GiB, peak process footprint
6.9 GiB**; 0 batches retried at the cap. Swap in use 3,778 MB before, 3,730 MB after; load about 2 (a short
simulation of this agent ran beside it in its first three minutes). Dev agreement with the rules' decision (295
contexts of 15 animals never trained on, the year-round mix; chance 0.19): untuned 0.312; after epoch 1 0.525, epoch
2 0.614, epoch 3 0.607 (loss 1.89 → 1.13, 0.96, 0.96). **The saved epoch is 2** (lowest dev loss; R4's was 3).
Adapter sha256 `82e329e9…8d0a`; the manifest carries the label source, the parts, 0 removed wordings and
`labels_from_jev_or_an_outside_model: false`. These are dev numbers; the held-out sets are below.
Iteration 4 began at 03:25 by itself when the training process ended (swap 3,730 MB in use).

**Result of iteration 4 (03:25 to 05:16; one model process at a time; swap 3.7 GB in use before each, no hold).**
A: 4,641 packets for `r4b-rules-state` in 2,725 s (0.59 s a packet). B: 1,500 packets each for the untuned model,
`r4-rules-state` and `r4b-rules-state` in 1,114, 1,122 and 1,126 s (0.75 s a packet). Token counts of B's packets on the CPU: 91 s.
Parity: `PARITY OK` on 12 r4b dev contexts (equal token ids, probability gap 0). Wild choices, development part,
`r4b-rules-state` plain and fanned out: 7 minutes. Tables: `docs/staging/r4b-numbers-a.md`, `r4b-numbers-b.md`,
`r4b-wild-numbers.md`. Results in the section below, after the loop.

- Iteration 5 began at 05:16 at head e610563 (clean tree; the worker loaded `r4-rules-state` e09fd6f4…1932 and
  `r4b-rules-state` 82e329e9…8d0a on MPS; swap 3,722 MB in use, load 1.9).
- **Iteration 6 (logged before it runs): seed 5, the standard window** (`scripts/r4b-chain.sh nomodel 5 standard`,
  then `model 5 standard`), queued to start when iteration 5 ends. Seed 5 was never trained on; it is a development
  seed (`AGENTS.md`), not reserved or retired. Its window's season is read from its rules arm.

**Result of iterations 5 and 6 (05:16 to 07:25; one worker process per window, both adapters in it; no timeout, no
worker restart, no hold for swap: 3.0 to 3.7 GB in use).** Seed 21 standard: `trained` 2,611 calls in 1,515 s,
`retrained` 2,373 in 1,274 s. Seed 21 lean: 2,378 in 1,429 s and 2,430 in 1,331 s. Seed 5 standard (a **middle**
stretch: crop 1.02 times the year's mean; burn-in hash b109a6e6e1091f07; focal animals by the same rule): 2,222 in
1,178 s and 1,922 in 902 s. Median 0.46 to 0.53 s a decision. All six model arms and the three no-model loop arms
replay from their receipts to the run's hash, every day's hash equal. No death in any arm. Model time in the loop:
2 h 7 min.

## 10. Results (8 October 2026; every number is from a committed script's output)

Tables: `docs/staging/r4b-data.md` (the data), `r4b-numbers-a.md` and `r4b-numbers-b.md` (offline), `r4b-wild-numbers.md`,
`r4b-loop-standard.md` (seeds 21 and 5 pooled, ten animals), `r4b-loop-standard-s21.md`, `r4b-loop-standard-s5.md`,
`r4b-loop-lean-s21.md`. Adapters, data, scores, receipts and replays: `artifacts/decide-ft/r4b/` and `artifacts/r4b/`
in this worktree (gitignored).

### 10.1 The answer

**No. Retraining on a whole year did not close the feeding and drinking gap; in the simulation it made the feeding
gap wider.** On two seeds neither adapter was trained on (ten focal animals, five days, the pilot's window and
setting), per animal and day:

| | the rules | first adapter (`r4-rules-state`) | retrained (`r4b-rules-state`) |
| --- | --- | --- | --- |
| energy eaten, kcal | 1,654 | 1,562 (−92; −131 to −54) | 1,289 (−365; −551 to −178) |
| feeding, daylight minutes | 252 | 211 (−41; −64 to −18) | 177 (−75; −98 to −52) |
| trips to food begun | 8.3 | 4.2 (−4.1; −5.5 to −2.7) | 2.8 (−5.5; −8.2 to −2.8) |
| drinks | 0.7 | 0.5 (−0.2; −0.4 to +0.1) | 0.7 (0.0; −0.2 to +0.2) |
| resting, daylight minutes | 249 | 296 (+47; +17 to +76) | 371 (+122; +70 to +173) |
| distance, km | 2.63 | 2.47 (−0.16; −0.78 to +0.46) | 1.87 (−0.75; −1.53 to +0.02) |
| nights in a nest | 50 of 50 | 50 of 50 | 47 of 50 |
| share of new acts the model's choice settled | – | 99.2% | 99.7% |

(In brackets: the paired difference from the rules on the same animals and days, 95% t interval over ten animals.)
Retrained minus first, same animals and days: energy eaten **−272 kcal (−438 to −106)**, feeding −34 minutes (−57 to
−11), rest +75 minutes (+29 to +122), distance −0.60 km (−1.03 to −0.16), trips −1.4 (−3.3 to +0.5), drinks +0.2
(−0.1 to +0.4). By the words of §7 every one of the registered measures reads **"no improvement shown"**, and intake,
feeding and rest moved away from the rules. Each seed alone points the same way (seed 21: 1,615 / 1,547 / 1,331 kcal;
seed 5: 1,693 / 1,576 / 1,248); on seed 5 alone the difference between the adapters is not resolved (−328, −701 to
+45).

Two things the run does establish:

- **The first adapter's shortfall is real on unseen seeds.** On seeds it never trained on it eats 6% less than the
  rules (−92 kcal, all ten animals below) and feeds 41 minutes less: the pilot's 7% and 29 minutes were not an
  artefact of familiar animals.
- **The first adapter is the better engine.** Nothing here is a reason to replace it.

### 10.2 Thresholds

| | Threshold | Result |
| --- | --- | --- |
| T1 | on B's draws `r4b` minus `r4` above 0 | **not met**: +0.002 (−0.024 to +0.031); 0.591 against 0.589, 1,036 draws (untuned 0.292) |
| T1a | on A's draws `r4b` minus `r4` not below 0 | **not met**: −0.037 (−0.061 to −0.010); 0.572 against 0.609, 954 draws. Coverage was bought with the days R4 knew |
| T2 | parity; no packet over 1,280 tokens | **met**: `PARITY OK`; B's packets median 483 real tokens, 95th percentile 632, largest 701 |
| T3 | no probe the wrong way; heat and reserves the right way | **not met**: heat still moves rest the wrong way (−0.018, −0.022 to −0.013; first adapter −0.021). Reserves reads "right way" by the rule, at a size that is nothing (+0.002, 0.000 to 0.004; first adapter +0.002, −0.000 to 0.005) |
| T4 | wild development part not below the first adapter | **met**: plain 0.417 against 0.406 (+0.011, 0 to +0.023); fan-out 0.480 against 0.480 (0.000, −0.018 to +0.016); the rule stack 0.487 |
| loop (§7) | gap closed, improved, or no improvement shown | **no improvement shown** on energy eaten, feeding minutes, trips to food, drinks, distance and nights in a nest, pooled and on seed 21 alone; in the lean window one measure improved (drinks, below) |

### 10.3 Offline, line by line with R4

**A, R4's own held-out days (954 draws).** Agreement with the rules' decision 0.572 (0.536 to 0.611) against the first
adapter's 0.609 and 0.286 untuned. By kind (first adapter → retrained): feeding 0.37 → 0.32, travel 0.73 → 0.50, rest
0.78 → 0.86, social 0.54 → 0.43, night 0.84 → 0.81. Where the rules take a trip to food: 0.20 → 0.11 (−0.09, −0.15 to
−0.03); where they drink: 0.35 → 0.25 (20 draws, not a difference). Share of picks that are feeding: the rules 0.29,
first adapter 0.20, retrained 0.17; rest: 0.30, 0.36, **0.46**. With the rules' pick removed it takes the best
remaining option at 0.41 against 0.46 (−0.05, −0.08 to −0.02). Shuffled options: the same pick at 0.90 (0.89).

**B, the year-round held-out set (1,036 draws).** 0.591 against 0.589: the first adapter, which never saw a lean,
hot or rainy day, agrees with the rules across the year as well as the one trained on the year. By kind: feeding
0.44 → 0.42, travel 0.60 → 0.61, rest 0.68 → 0.75 (+0.06, a difference), social 0.53 → 0.45 (−0.08, a difference),
night 0.83 → 0.86. Trips to food 0.32 → 0.38 (+0.05, 0.01 to 0.10, a difference); drinks 0.48 → 0.41 (29 draws, not
one). By part: "hot now" 0.39 → 0.52 (+0.13, 0.04 to 0.23), the only part that gained; run down 0.61 → 0.66 and
every other part within its interval.

**State probes (A's packets; Δ of the target's probability, high minus low).**

| Probe → target | Untuned | First adapter | Retrained |
| --- | --- | --- | --- |
| energy deficit → feeding | +0.125 | +0.165 | **+0.251**, right |
| reserves falling → feeding | −0.003 | +0.002, does not respond | +0.002 (0.000 to 0.004), right by the rule, negligible |
| sleep → rest and nest | +0.152 | +0.113 | **+0.014 (−0.005 to 0.035), does not respond** |
| light falling → nest | +0.020 | +0.116 | **+0.013**, right, nine times smaller |
| heat → rest | −0.024 | −0.021, wrong | −0.018, **wrong** |
| water deficit → drink | +0.168 | +0.256 | **+0.319**, right |

So it now answers more strongly to hunger and thirst, and it has largely stopped answering to sleepiness and to the
falling light.

### 10.4 What happened in the loop

- **Standard window (the table of 10.1).** When the rules' pick was a trip to food the retrained adapter took it at
  0.10 (first adapter 0.17), a drink at 0.09 (0.14), rest at 0.72 (0.50), the nest at 0.76 (0.99). What it chose when
  the rules chose the nest: the nest 0.76, **feeding 0.22**. By day the nest was on 29% of its menus (12% for the
  first adapter) and it took it at 0.97; at dusk and by night it took the nest at 0.68 when offered (first adapter
  1.00; 0.55 on seed 21, 0.91 on seed 5). It stays in the nest into the morning and, mostly on seed 21, feeds in
  the dark instead of settling: three nights of 50 out of a nest. This is the lost answer to light and sleepiness, seen in behaviour.
- **Lean window (seed 21, days 119 to 124; five animals).** The rules 1,632 kcal; first adapter **1,712 (+80, +40 to
  +119: it ate more than the rules; all five above)**; retrained 1,508 (−124, −394 to +145: not resolved, two above
  and three below). Feeding 254 / 246 / 223 minutes; trips begun 8.1 / 4.2 / 4.9; distance 4.80 / 3.39 / 4.01 km;
  25 of 25 nights in a nest for all three. **Drinks 0.4 / 0.2 / 0.7 a day: retrained minus first +0.52 (+0.07 to
  +0.97), the one registered measure that moved toward the rules** (it reads "gap closed": from fewer drinks than
  the rules to more, both "close" on five animals). So in the lean stretch the first adapter kept its animals fed, with fewer and
  shorter trips than the rules (1.4 km a day less), and the retrained one did not do better.
- Trips to food are the stable failure of both adapters: half the rules' trips begun, or fewer, in every window.
- A correction to the report script, made after the first tables were read (it changes one registered row): "on the
  side of the rules" is now read as "the adapters differ and the retrained one is nearer the rules". Before, a move
  past the rules counted: on seed 21 the first adapter walked 0.11 km a day more than the rules and the retrained
  one 0.55 km less, and the row read "gap closed". It now reads "no improvement shown (it moved away from the
  rules)".

### 10.5 Why, as far as this stage can say

Measured: the same 3,200 contexts were spread over 1,246 world-days instead of 16; the rare states arrived (hot 5 →
261, below the usual store 37 → 988) but the two under-chosen decisions did not (trips 309 → 312, drinks 41 → 78).
The adapter that came out rests more, reads hunger and thirst more and light and sleepiness less. Not measured, and
so only a reading: with the daily routine thinned out, 3,200 examples were not enough to hold both the routine and
the year. The saved epoch was the second of three (dev loss 0.959 against 0.965); the third was not evaluated.
Nothing was retried: one change set was registered, and it failed.

Heat is a separate matter. The simulation has no hot weather (amendment A1: the daily high is 22.9 to 24.2 °C all
year), so the probe's hot level (31 °C) is a state the rules' world never reaches by weather. By day the rules rest
at 0.45 of "hot" records against 0.28 of "comfortable" ones and 0.24 of "warm" ones: the labels hold no steady rise
with heat to learn.

### 10.6 Cost on this Mac (M4, 16 GB)

Training: 2 h 17 min (2 h 31 min of wall time), 0.88 s per example, 6.9 GiB footprint, no memory failure. Six
world-years of sampling: 16 minutes. Offline scoring: 1 h 51 min. The loop: 2 h 7 min of model time for six model
arms. About 6 h 30 min of model time in all, one model process at a time; swap in use stayed between 3.0 and 3.8 GB.

### 10.7 What is still wrong

1. Both adapters start about half the rules' trips to food; the first eats 6% less, the retrained 22% less.
2. Heat still moves rest the wrong way, and reserves do not move feeding by any amount that matters.
3. The retrained adapter lost most of its answer to sleepiness and to dusk.
4. Half of the rules' own drinks are at night (40 of 78 in the training set). Both adapters go to the nest instead.
   Whether that is the engine's fault or the rules' is not settled here.
5. Limits: five animals a seed, five days, the rest of the world on the rules, the gate off only, one base (0.5); the
   lean window is one seed. The 0.25 base was sampled for training and for B and not run in the loop.

### 10.8 Confidence

- High: the retrained adapter is not better than the first offline (two held-out sets, 39 animals) and is worse in
  the loop on intake, feeding and rest (ten of ten animals below the rules, two unseen seeds, every replay
  reproduced). The first adapter's shortfall holds on unseen seeds.
- Moderate: that it lost the answer to light and sleepiness (two probes and the loop's nest choices agree; one
  training run); the lean window's readings (five animals, one seed).
- Low: the reason (too few examples per kind of situation); anything about heat beyond "the simulation has no hot
  weather"; any forecast past five days.

### 10.9 Decisions for the user

1. **Keep `r4-rules-state` as the engine; do not use `r4b-rules-state`.** (Recommended.)
2. **Whether to try once more with more examples, not different ones:** R4's 3,200 contexts plus these 3,200 in one
   adapter, about 4 h 40 min of training here. It would test the reading of 10.5; it is a second attempt and needs
   your go.
3. **Trips to food.** A year of situations did not teach either adapter to set out. The rules decide a trip from a
   net energy rate, which you ruled out as valuation. Is there something the animal itself knows that may be shown
   (for example how long the walk is in minutes, or how long it has fed in this tree)?
4. **Heat.** With no hot weather in the simulation, should the heat probe stay a pass mark for an engine?
5. **Night drinking.** Should the rules drink at night at all? If not, the "drinking gap" is partly the rules'.

### Checks at the end (8 October 2026, 07:30; no model process running)

`tsc --noEmit -p .` clean; `gen-params --check` clean (1,046 entries); `tests/r4b.test.ts` 4 of 4; with
`tests/r4-packet.test.ts`, `tests/r5-pilot.test.ts`, `tests/ft-*.test.ts`, `tests/em-*.test.ts`,
`tests/kernel.test.ts`, `tests/rw-bench.test.ts`, `tests/sim-track-e.test.ts`, `tests/sim-params.test.ts` (the
goldens) and `tests/r2-packet.test.ts`: 101 tests, 101 pass. The full `pnpm test` once, after the last model run:
**1,096 tests, 1,096 pass, 0 fail, 0 skipped** (2 min 53 s). Against the branch point (bbd8b3e) the branch changes
`AGENTS.md`, `IMPLEMENTATION_PLAN.md`, files under `docs/staging/`, scripts and one test: nothing under `src/` or
`data/`, no switch default, no golden, no fixture. Not done: the third training epoch was not evaluated (the saved
epoch is the registered one); the gate-on and pick-removed settings and the 0.25 base were not run in the loop (not
registered here).

## 11. Stage R4c: the third and last round (registered 8 October 2026, 07:40, before any sampling, training or model run)

The integrator merged R4b (track-e 5532dcb; this branch was brought up to it) and asked for one more round, the last
for this stage: the user's limit is three (R4, R4b, R4c). It aims only at the gap sections 10.1 and 10.4 measured:
both adapters begin half the rules' trips to food, or fewer, and the year-round sample barely added such decisions
(trips 309 → 312, drinks 41 → 78). The packet already shows the distance and the fruit expected at a remembered tree;
what is thin is the number of examples in which the rules set out. The user's decisions of the head of this file bind
it unchanged. No network, no outside model, nothing under `src/` or `data/`, no whole-population benchmark.

### 11.1 The one change against R4

**Training set = R4's own training file, unchanged (3,200 contexts, 3,122 labelled; sha256 checked against R4's
manifest), plus a supplement of real decision points at which a trip to food or a drink was the question.** Nothing
else differs from R4: the state-only packet `r4-state-1`, the labels (the rules' own decision; **the adapter inherits
the rules' judgment**), the dev file (R4's, unchanged: the same 15 animals choose the saved epoch), the model, every
training setting. R4b's year-round sample is left out: it made things worse and the cause is not known.

**The supplement.**

- *Worlds and days, by rule:* the four training worlds of R4 (seeds 48 and 7 × `M6-W50`, `M6-W25`), the **20 days
  that follow R4's last training day: days 14 to 33** of each world (R4 used days 6 to 9 on W50 and 10 to 13 on W25).
  The days are named by their position, before anything is sampled; none is chosen by what it holds. Sampler:
  `scripts/r4b-contexts.ts` (R4's tap method), burn-in 14 days, 20 days, every decision point of an animal aged 8 or
  over with probability 0.25. Only **training animals** (R4's rule: the animals whose hash is 0.12 or above), so no
  dev animal and no held-out seed enters.
- *Positives:* decision points at which the rules' decision is **a trip to a remembered food tree** (the family the
  pilot and section 10 call a trip to food: travel to a food tree the animal is not feeding in, of its own choice) or
  **a drink**. Points where the rules' gate kept such a trip under way are included in their natural share (R4b's
  pools put them at about 8% of trip decisions), because with the gate off a model is asked there too.
- *Negatives, as many:* decision points at which a trip to a remembered food tree, or a drink, **was on the menu and
  the rules chose neither** (they fed where they stood, rested, groomed, moved with others, nested). They keep the
  rules' own mix of what was chosen instead. So the adapter is shown when to go and when not to.
- *Counts, per world:* 300 trip positives, 75 drink positives, 300 negatives with a trip on the menu, 75 negatives with
  a drink on the menu (a point with both goes to the drink negatives); **3,000 in all: 1,500 positives (1,200 trips,
  300 drinks) and 1,500 negatives.** Each class is taken in a fixed hash order from the world's pool. If a world's
  pool is short of a class, what there is is taken and the same world's negatives of that kind are cut to match;
  nothing is refilled from another class. R4b's pools suggest every class is available several times over.
- *Natural examples only:* each decision point is used once; nothing is duplicated; every example has weight 1.

**What this does, said plainly.** It moves the share of trip and drink decisions in training away from their natural
share: trips from 10% of labelled contexts (309 of 3,122) to about 25% (about 1,509 of 6,122), drinks from 1.3% to
about 5.6%. That is a design choice, not a neutral sample. It can make the adapter set out too often. It is to be
judged only by the in-the-loop result on unseen seeds (11.4), not by offline agreement.

### 11.2 Training

`r4c-rules-state` under `artifacts/decide-ft/r4c/adapters/`, `training/decide_ft/train_r4.py`, R4's settings (§5 of
this file lists them), 3 epochs, the saved epoch by the lowest loss on R4's dev file. About 6,122 labelled contexts ×
3 at 0.88 s: about 4 h 30 min of training, 6.9 GiB expected. Machine rules as §8: one model process at a time; `uptime`
and `sysctl -n vm.swapusage` before each model run, no start above 6 GB of swap in use; a death at the memory cap is
logged and the batch reduced (batch 1 × 8, then the top 4 layers), at most 3 iterations.

### 11.3 Offline evaluation, line by line with R4 and R4b

A (R4's own held-out file: agreement overall and by kind, shares of picks, shuffled options, the rules' pick removed,
the six probes) and B (the year-round held-out set) scored for `r4c-rules-state`; the other models' score files are
those already made. Parity (`parity.py --n 12 --device cpu` on the dev contexts); the wild-choice development part,
plain and fanned out (the sealed part is never opened). Tables by `scripts/r4-report.ts` and `r4-wild-report.ts` with
four models, each adapter also paired with `r4-rules-state`.

Thresholds, fixed now. They are reported, and none of them decides the round (11.4 does):

| | Threshold |
| --- | --- |
| C1 | on A's draws `r4c` minus `r4` is not below 0 (its interval is not wholly below 0) |
| C2 | `PARITY OK`; no packet over 1,280 tokens (the packets are R4's and R4b's, counted already) |
| C3 | **the heat probe is no longer a pass mark.** The simulation's daily high is 22.9 to 24.2 °C all year (amendment A1), so the probe's hot level (31 °C) is a state the rules' world never reaches and the rules' decisions hold no steady rise of rest with heat to learn; it is still reported. The other five probes stand: none moves the wrong way; **reserves is kept** and is reported as before (it has not moved feeding in two rounds) |
| C4 | wild development part: `r4c` minus `r4`, plain and fan-out, not wholly below 0 |
| C5 (reported) | where the rules take a trip to food and where they drink (A and B): `r4c` against `r4`; the share of picks that are trips and that are feeding against the rules' |

### 11.4 In the loop: the readout that decides

R4b's test repeated with one new arm: seeds 21 and 5, the standard window (30 days of burn-in, 5 days), the same ten
focal animals; and the lean window of seed 21 (days 119 to 124). The gate off, the rules' pick kept, base W50. The
rules arm, its three re-draws, the no-model loop arm and the first adapter's arm (`trained`) are those of R4b, **not
run again**: the new arm `r4c` continues the same burned-in worlds (the report refuses an arm whose burn-in hash
differs) and is replayed from its receipts. Runner `scripts/r4b-loop.ts`, report `scripts/r5-report.ts`.

Measures, each against the rules on the same animal-days with a 95% t interval over animals: energy eaten, feeding
minutes, trips to food begun, drinks, distance, nights in a nest; and the share of new acts the model's choice settled.

**The rule, fixed before the run. R4c counts as better than R4 only if all three hold on the standard window, the
ten animals of seeds 21 and 5 pooled:**

1. **energy eaten is closer to the rules'**: `r4c`'s mean difference from the rules is smaller in size than the first
   adapter's, and `r4c` minus `trained` (same animals and days) has an interval that excludes 0;
2. **nights in a nest are not worse**: `r4c` has no fewer nights in a nest than the first adapter less one (of 50),
   and the paired interval of the share of nights is not wholly below 0;
3. **it does not overshoot the rules' travel distance**: `r4c`'s mean distance a day minus the rules' (paired) is not
   above the rules' own spread across the ten animals (the standard deviation of the rules arm's per-animal means).

The script prints the three conditions and the verdict. The lean window (five animals) is reported with the same
measures and cannot decide alone; if it contradicts the standard window, that is said. Offline numbers do not decide.

**What ten animals can show:** the pooled half-width for energy eaten was 39 kcal for the first adapter and 187 for
R4b. The first adapter's gap is 92 kcal, so condition 1 needs most of that gap closed consistently across animals.

**Written before the run:** more trips begun than the first adapter and more drinks; whether that feeds the animals
better is open, since the first adapter's trips ended in the tree it set out for less than half as often as the
rules' (0.7 against 1.7 a day) and a trip abandoned on the way costs energy.

### 11.5 If R4c is not better

Stop. No fourth attempt. Section 13 then says what three rounds have shown about training from the rules' decisions
on state alone, and what a different approach would need, without starting it.

### 11.6 Order of work

1. This section, committed. 2. Code: `scripts/r4c-assemble.ts`, `scripts/r4c-run.sh`, the arm `r4c` and the verdict
table in the report; tests. 3. **Iteration C1:** the four supplement samples (a minute each, no model) and the
assembly; the counts are written in §12 before training. 4. **Iteration C2:** train. 5. **Iteration C3:** A, B,
parity, wild. 6. **Iteration C4:** the loop, seed 21 standard, seed 5 standard, seed 21 lean, each with its replay.
7. Results (§12), the conclusion (§13), the plan's status line, the full test suite once with nothing else running.
If time or memory runs out the order of dropping is: B; the wild-choice check; the lean window. The adapter with
evaluation A and the two standard windows is the minimum.

## 12. R4c: iteration log and results

Machine at registration (07:33): load averages 4.35, 9.14, 6.53 (the test suite had just run); swap 3,023 MB used of
4,096 MB; no model process running.

**Code delivered before any run** (outside `src/`): `scripts/r4c-assemble.ts` (the supplement's classes, the training
file, the manifest and the data table), `scripts/r4c-run.sh` (sample, train, offline, loop; the swap check before each
model run); `scripts/r5-pilot.ts` gains the arm `r4c`; `scripts/r5-report.ts` gains the arm, the table "Third round
against trained" and the three-part rule of 11.4 (`r4cVerdict`). `tests/r4b.test.ts` 6 tests (two new). `tsc` clean.

- **Iteration C1 (logged before it runs, 07:50; no model):** `scripts/r4c-run.sh sample` (the four worlds, burn-in 14
  days, 20 days, p 0.25, two processes at a time), then `scripts/r4c-assemble.ts` on R4's contexts
  (`.claude/worktrees/r4-train/artifacts/decide-ft/r4/contexts`, read only).
  Result (07:38 to 07:40, head aaedf7a). Each world took 27 to 30 s: 16,594 to 17,340 records, of which 12,260 to
  14,733 are decision points of training animals. Every class is available several times over in every world (trips
  taken 1,032 to 1,542; drinks taken 188 to 264; a trip offered and not taken 6,927 to 8,064; a drink offered and not
  taken 897 to 1,006), so the registered counts were taken in full: **3,000 supplement records, 1,200 trips taken,
  300 drinks taken, 1,200 and 300 offered and not taken.** The training set (table: `docs/staging/r4c-data.md`):
  6,200 records, 6,122 labelled, the same 61 animals as R4; R4's file is first in it byte for byte (sha256
  aa3fa4b5…, equal to R4's manifest) and the dev file is R4's. The rules take a trip to food at 1,509 of the 6,122
  labelled contexts (24.6%; R4 309, 9.9%), 93 of them trips the gate kept under way; they drink at 341 (5.6%; R4 41),
  159 of those at night. Removed wordings found: 0.

- **Iteration C2 (logged before it runs, 07:42): train `r4c-rules-state`** (`scripts/r4c-run.sh train`; R4's
  settings; 6,122 labelled contexts, 3 epochs, about 4 h 30 min expected), detached from the session; then, each
  starting when the one before ends, **iteration C3** (`scripts/r4c-run.sh offline`: A, B, parity, wild) and
  **iteration C4** (`scripts/r4c-run.sh loop 21 standard`, `loop 5 standard`, `loop 21 lean`). The swap check is
  written to each log before each model run.

**Result of iteration C2: `r4c-rules-state` trained (07:38 to 12:14; no memory failure, first attempt).** 6,122
labelled contexts, 3 epochs, 18,366 examples shown: **15,373 s of training (4 h 16 min), 16,133 s of wall time (4 h
29 min); 0.84 s per example; peak MPS driver memory 6.0 GiB, peak process footprint 6.8 GiB**; 0 batches retried.
Swap in use 3,023 MB before, 4,602 MB after (under the 6 GB line). On R4's dev file (292 contexts of 15 animals,
chance 0.20; untuned 0.363): epoch 1 0.575, epoch 2 0.620, epoch 3 0.586; loss 1.77 → 1.04, 0.92, 0.91. **The saved
epoch is 3** (the lowest dev loss, the registered rule), although epoch 2 agreed more often; R4 itself ended at 0.637
and a loss of 0.93 on the same file. Adapter sha256 `f0827af2…9d1d`; the manifest carries the label source, the
parts and their hashes, 0 removed wordings and `labels_from_jev_or_an_outside_model: false`. The clock times written
in §11's heading and in the lines of iterations C1 and C2 were a few minutes ahead of the machine's; the logs under
`artifacts/decide-ft/r4c/logs/` carry the exact ones. Iteration C3 began at 12:14 by itself.

**Result of iterations C3 and C4 (12:14 to 16:20; one model process at a time; swap 3.9 to 4.6 GB in use before each
run, no hold).** Offline (12:14 to 13:42): A 4,641 packets in 2,980 s, B 1,500 in 1,232 s, `PARITY OK` on 12 dev
contexts, the wild-choice development part in 7 minutes. The loop: seed 21 standard 6,198 calls in 3,772 s; seed 5
standard 4,075 in 3,386 s; seed 21 lean 3,322 in 2,249 s; median 0.53 to 0.60 s a decision. **Ten calls of 13,595
passed the 120 s limit** (nine in the first twenty minutes of seed 5, one in the lean window; each went to the rules
and the worker was replaced; another application was busy on the machine then). All three arms replay from their
receipts to the run's hash. No death in any arm.

### 12.1 The answer

**No. More trip and drink examples did not close the feeding gap; they made the animals walk.** The registered rule
(11.4), standard window, ten animals of seeds 21 and 5, per animal and day:

| | the rules | first adapter (`r4-rules-state`) | third round (`r4c-rules-state`) |
| --- | --- | --- | --- |
| energy eaten, kcal | 1,654 | 1,562 (−92; −131 to −54) | 1,488 (−166; −278 to −55) |
| feeding, daylight minutes | 252 | 211 (−41; −64 to −18) | 207 (−45; −70 to −21) |
| trips to food begun | 8.3 | 4.2 (−4.1; −5.5 to −2.7) | **53.9 (+45.7; +31.4 to +60.0)** |
| drinks | 0.7 | 0.5 (−0.2; −0.4 to +0.1) | 0.9 (+0.2; −0.1 to +0.5) |
| distance, km | 2.63 | 2.47 (−0.16; −0.78 to +0.46) | **8.00 (+5.38; +4.19 to +6.56)** |
| nights in a nest | 50 of 50 | 50 of 50 | 50 of 50 |
| energy spent, kcal | 1,538 | 1,502 | 1,722 (+184; +116 to +252) |
| reserves, % of the usual store a day | +0.01 | −0.02 | −0.63 (−0.85 to −0.43) |
| share of new acts the model's choice settled | – | 99.2% | 95.1% |

| Condition | Numbers | Holds |
| --- | --- | --- |
| 1. energy eaten closer to the rules', the adapters differing | first −92 kcal from the rules, third −166; third minus first −74 (−166 to +19) | **no** |
| 2. nights in a nest not worse | 50 of 50 both | yes |
| 3. no overshoot of the rules' distance beyond the rules' spread across animals (0.84 km) | +5.38 km a day | **no** |

**R4c does not count as better than the first adapter.** Each seed alone reads the same (seed 21: 1,615 / 1,547 /
1,525 kcal and 2.1 / 2.3 / 7.4 km; seed 5: 1,693 / 1,576 / 1,451 kcal). **Lean window** (seed 21, days 119 to 124,
five animals): energy eaten 1,632 / 1,712 / **1,365** (third minus rules −267, −422 to −113); distance 4.80 / 3.39 /
10.74 km; trips begun 8.1 / 4.2 / 25.7; reserves −0.17 / +0.15 / −0.97% a day; 25 of 25 nights in a nest for all.
It agrees with the standard window and is worse.

What it did learn: in the loop it takes the rules' pick at 0.83 when that is a trip to food (first adapter 0.17) and
at 0.36 when it is a drink (0.14), and its trips end feeding in the tree it set out for as often as the rules' (2.1 a
day against 1.7; first adapter 0.7). What it lost: when the rules rest it rests at 0.14 (first adapter 0.50) and
moves instead; when the rules feed where they stand it does so at 0.21 (0.42) and sets out for another tree
instead. Asked at every decision point, it begins six times the rules' trips, walks three times as far, spends 184
kcal a day more and eats no more.

### 12.2 Offline, line by line (thresholds of 11.3; none decides)

| | Threshold | Result |
| --- | --- | --- |
| C1 | on A's draws `r4c` minus `r4` not below 0 | **met**: 0.608 against 0.609 (−0.001, −0.037 to +0.035); R4b 0.572 |
| C2 | parity | **met**: `PARITY OK` |
| C3 | none of the five probes the wrong way (heat only reported) | **met**: deficit +0.218, sleep +0.077, light +0.322, water +0.448, all the right way; reserves +0.002 (−0.001 to 0.005), does not respond, for the third round running. Heat, reported: −0.018, the wrong way, as every model |
| C4 | wild development part not below R4 | **met**: plain 0.424 against 0.406 (+0.018, 0.003 to 0.030); fan-out 0.489 against 0.480 (+0.009, −0.012 to 0.034) |

Agreement with the rules' decision on draws, the three rounds side by side:

| | untuned | R4 | R4b | R4c |
| --- | --- | --- | --- | --- |
| A (R4's days), all draws | 0.286 | 0.609 | 0.572 | 0.608 |
| A: feeding / travel / rest / social / night | 0.08 / 0.10 / 0.31 / 0.42 / 0.72 | 0.37 / 0.73 / 0.78 / 0.54 / 0.84 | 0.32 / 0.50 / 0.86 / 0.43 / 0.81 | 0.44 / 0.43 / 0.77 / 0.59 / 0.84 |
| A: the rules take a trip to food | 0.00 | 0.20 | 0.11 | **0.69** |
| A: the rules feed where they stand | 0.11 | 0.53 | 0.53 | **0.11** |
| A: the rules drink (20 draws) | 0.55 | 0.35 | 0.25 | 0.75 |
| A: acts the gate kept, or arrivals | 0.40 | 0.66 | 0.66 | 0.57 |
| A: the rules' pick removed, best remaining option | 0.21 | 0.46 | 0.41 | 0.51 |
| B (the year), all draws | 0.292 | 0.589 | 0.591 | 0.610 |
| B: the rules take a trip to food | 0.04 | 0.32 | 0.38 | **0.79** |
| B: the rules feed where they stand | 0.07 | 0.52 | 0.48 | **0.25** |
| share of picks that are feeding, A (the rules 0.29) | 0.09 | 0.20 | 0.17 | 0.28 |

Offline R4c looks like the best of the three: the same overall agreement as R4, the rules' feeding share at last,
trips and drinks found. The table also holds the warning: what it gained where the rules set out it lost where they
stay, almost one for one (0.20 + 0.53 for R4, 0.69 + 0.11 for R4c on A).

### 12.3 Cost

Training 4 h 16 min (4 h 29 min of wall time), 6.8 GiB, no memory failure. Offline scoring 1 h 28 min. The loop
2 h 37 min for three arms. About 8 h 35 min of model time for the round; with R4b about 15 hours on this Mac in a day.

## 13. What three rounds have shown, and what a different approach would need

The stage stops here (11.5): three rounds were allowed and none is better than the first adapter, which stays.

| Round | Training set (labels: the rules' decisions; input: state only) | Offline agreement (A, B) | In the loop on unseen seeds: energy eaten against the rules | The failure |
| --- | --- | --- | --- | --- |
| R4 | 3,200 contexts of four rich days | 0.61, 0.59 | −92 kcal a day (6% less) | begins half the rules' trips to food |
| R4b | 3,200 spread over a year by state | 0.57, 0.59 | −365 (22% less) | rests more, loses dusk and sleepiness |
| R4c | R4's 3,200 plus 3,000 trip and drink decisions, half taken and half not | 0.61, 0.61 | −166 (10% less) | begins six times the rules' trips, walks three times as far |

**What is established (high confidence unless said).**

1. **The adapter learns how often, not when.** Shown few trips it under-goes; shown many, with as many refusals
   beside them, it over-goes. Between "feed here" and "go to another tree" its hits moved from one side to the other
   and their sum hardly moved. On the state-only packet this model does not separate the two cases the rules
   separate. The rules separate them by an option's net energy rate, which the user ruled out as valuation; the
   packet shows the parts (crop here and there, distance, who feeds there) and three training sets did not get the
   model to combine them.
2. **Offline agreement does not predict behaviour.** R4 and R4c agree with the rules equally (0.61) and behave in
   opposite ways in the simulation. Any future round must be judged in the loop.
3. **Coverage of states was not the limit.** The first adapter, trained on four rich days, agrees with the rules across
   the whole year as well as the adapter trained on the year (0.59 and 0.59), and kept its animals fed in a lean
   stretch.
4. **The loop multiplies a lean.** With the gate off a model is asked at every decision point and holds no intention,
   so a model a little too ready to set out begins 54 trips a day. The rules keep an act until something changes.
   R4c's agreement held on fresh draws (0.61) and fell on the acts the rules' gate kept or completed (0.66 → 0.57).
5. **Two probes are not about the engine.** Reserves have not moved feeding in any round, though round two's
   training set held 988 run-down contexts; that suggests, and it was not measured, that in the rules' own decisions
   low reserves barely change what is chosen from a menu. Heat is not a state of this simulation (a daily high of
   22.9 to 24.2 °C all year).
6. **This Mac is not the limit either.** Every training run fitted (6.8 to 6.9 GiB, no failure); a round costs 2 to
   4.5 hours of training and as much again to evaluate.

**What a different approach would need (none of it started).**

- **A. Use the gate, before any more training** (cheapest; no training; about half an hour an arm). The rules decide
  only when their intention gate opens; every loop test of rounds two and three asked the model at every decision
  point. The pilot's gate-on arm of the first adapter matched its own no-model reference on every measure. Running
  the first adapter with the gate on, on seeds 21 and 5, would say how much of the 6% is the engine and how much is
  the loop asking too often. It needs only a registration.
- **B. Something in the packet** (needs the user's ruling and a change under `src/`, which this stage could not
  make). If the rules' rate stays out, the animal's own experience could stand in for it: how fast it is taking in
  food where it is now, how long it has been in this tree, how many minutes the walk would take. Each is state or
  perception. Round three says more examples of the same packet will not do it.
- **C. Labels from the states the model itself reaches** (the standard remedy for an imitator that drifts: run the
  model in the loop, have the rules label the states it gets into, add them, retrain, repeat). Each turn costs a loop
  run and a training run, 5 to 9 hours here, and it usually takes several turns: more than a night on this Mac, and
  the labels are still the rules'.
- **D. A different label source**: what an option actually yielded (energy gained over the next hour of the
  simulation) rather than what the rules chose. That stops inheriting the rules' judgment, and it needs a design of
  its own.
- Not recommended: a larger set of the same kind. Doubling the set (R4c) changed the lean, not the skill.

### Checks at the end of R4c (8 October 2026; no model process running)

`tsc --noEmit -p .` clean; `gen-params --check` clean (1,046 entries); the full `pnpm test` once, after the last
model run: **1,098 tests, 1,098 pass, 0 fail, 0 skipped** (3 min 5 s; it holds `tests/r4b.test.ts` 6 of 6 and the
files of the hard rules). Against track-e 5532dcb the round changes `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, files
under `docs/staging/`, three scripts, two new ones and one test: nothing under `src/` or `data/`, no switch default,
no golden, no fixture. The sealed part of the wild-choice benchmark was not read. Not done: the second training
epoch (dev agreement 0.620 against the saved third's 0.586) was not evaluated, since the registered rule saves by
dev loss; the gate-on setting was not run (not registered; it is proposal A above).
