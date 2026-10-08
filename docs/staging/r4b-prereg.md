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
