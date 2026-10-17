# Stage R16: the perceived-target model at a real scale, taught on its own states, and tested as a population (pre-registration)

Branch `r16-scale-and-own-states` from `track-e` b5c28eb. Registered 17 October 2026, read and written 14:38 to 14:58 EDT (times
from `date`), **before any code of this stage and before any run.** It follows the user's words of 6, 10, 13 and 17
October (HANDOFF.md §1 and §2.0): move toward the state and perception decision model driving behaviour, with the
training that supports it; train it and show the model driving chimps in the app; "Continue driving this forward."

**This stage registers the work and builds what it needs. It runs no model.** No Python worker, no tokenizer, no
training, no scoring, no browser and no dev server is started by the agent that writes this. Every model step runs
later, from a frozen detached checkout in a `screen` session, started by the integrator (§16, §22).

**The name every result of this stage carries: "rules-taught model on the R15 menu".** In full: a small model
(GLiNER2.5-Decide with a LoRA adapter) that first chooses the kind of act from the rules' bounded activity menu, then,
for feeding and drinking, the tree or the water source among those the animal itself perceives or remembers (food at
most eight, water at most four; no scores shown). The kind is taught by the rules' own activity odds (stage R11's
teacher summed by kind); the target by the rules' counterfactual valuation of those targets (stage R15's teacher).
The rules taught it and wrote its menu. **Nothing here is about wild chimpanzees**, and no result can show that the
model is better than its teacher. Animals under 8 years stay on the rules. "Recurrent Decision Model" is never
abbreviated.

---

## 0. What is known, and what is not (each with its document)

- **Stage R11** (`r11-prereg.md` §14, `r11-numbers.md`): a model taught the rules' own odds on the honest packet
  (P5b) matches the rules' timing at ten animals under a draw; its top pick is sticky (carrying on above the rules',
  outcome S2 under the top pick).
- **Stage R13** (`r13-prereg.md` §14, `r13-numbers.md`): every adult of seed 3613 on that adapter under a draw for 20
  days: no death, movement at the rules' level on three rows of four, **not viable** by its registered readouts:
  nights in a nest 0.972 against a floor of 0.982 (the eight rules re-draws 0.997 ± 0.006, D 0.015), reserves
  −0.054% of the usual store a day against a floor of −0.011 (re-draws +0.005 ± 0.006, D 0.015).
- **The diagnosis** (`r13-prereg.md` §14.4; `r14-diag-nights.md`, `r14-diag-energy.md`, `r14-diag-decode.md`,
  `r14-second-reader.md`): all 21 short nights begin at a finished nest left in late dusk by an animal with nobody in
  sight (the adapter 0.77 on the nest, the rules 0.99 or more), and once out in the dark the adapter puts 0.65 and
  0.47 on a nest where the rules put 0.95 and 1.00; the reserves are lost on late mornings in a nest beside companions
  in theirs (0.94 on staying where the rules' odds are 0.000; "with every adult on the model the cue feeds itself");
  the training file held 9 draws of the late-dusk state, 1 of the evening dark out of a nest and 24 of 3,120 in a nest
  by day. No decode between the top pick and a plain draw eases both. At night the rules count nest-mates the packet
  does not list (`candidates.ts` `nestCompanyValue`: "known without being seen").
- **Stage R14** (`r14-prereg.md`; HANDOFF.md §2.0; frozen run `.claude/worktrees/bench-r14/artifacts/r14`, read
  only): its two training collections (seeds 48 and 7, ten days each, with their rules twins and labels) completed;
  the held-out collection on seed 21 stopped at day 8 of 10 after one 120 s timeout and two failed ten-minute
  warm-ups, which spent the day-fit budget. No adapter was trained. Codex's ruling: preserve it, do not resume it, do
  not use the partial seed-21 data. **This stage reads none of the seed-21 run, for any number.**
- **Stage R15** (`r15-perceived-targets.md`, `r15-training-contract.md`, `r15-development-results.md`,
  `r15-browser-proof.md`): the default-off two-stage path (switches `resourceTargets` 1, `activityFirst` 2,
  `observeV5` 1), packet identity `resource-targets-v1`, two adapters trained on 62 rows (86 rows from 43 fresh
  decisions in one short morning window, one drinking row) and checked in a serving worker, a 720-tick loop with five
  adults and the app. Development agreement 5 or 6 of 12 for the kind and 3 or 4 of 12 for the target: a wiring proof.
- **The operational lesson of R14** (AGENTS.md "Gotchas"; HANDOFF.md §2.0, 22:02 to 23:02 EDT on 13 October): a
  worker that ran for hours stalled once at 120 s; two replacements then failed their ten-minute warm-ups (the third
  warmed in 544 s) while swap grew from 4.8 to 6.2 GB; a cumulative wall cap then refused the remaining days and the
  chain refused the whole run. Warm-ups also failed on 12 October under test-suite load.

**Not known when this is written:** whether the R15 contract can be learned from more than a smoke file; whether its
target stage strands animals; how an R15 population behaves at all; R15's speed per call at the population unit (its
loops journal no per-call milliseconds).

## 1. What R16 changes against R13 and R15 (printed in every report of this stage)

Against R13: (1) the menu (two stages: kind, then a perceived or remembered tree or water source); (2) the packet
(`resource-targets-v1`: the kind packet has no option words and no social-timing lines, `src/providers/packet.ts`
`r15Packet`); (3) the data window (whole days 30 to 40 on two worlds, not six days at a 9% rate); (4) aggregation (one
round of labels on the states the round-zero model population reaches); (5) the decode (one draw per stage, two
streams). Against R15: (2) is the same; the data are about fifty times larger and whole-day; (4) is new. **So no result
of R16 can be read as "R13's failure repaired by aggregation".** It can only be read as what this recipe, on this
menu, does.

## 2. The three memos and the two attacks: what this registration takes, and where it departs

Taken (the attacks' "keep" lists, checked against the code where they cite it): memo 1's census-then-select-then-label
collection by packet words and hash only, with every row tagged by how it was chosen and exclusions counted; its seed
roles and the assembler that enforces them; its unchanged teachers; its floors, state-blind baselines and coverage
table before any adapter; its "an early-ended collection keeps its completed days"; memo 2's reading of the code
(kind packet without option words; `drinkWorth` and `tripSpeed` have no light term; unseen nest-mates counted; food
distance bands 150, 400, 1,000 m) and its P0, P1, P2, P3, P6, P7, P8 and "not added" list; memo 3's harm marks in the
units of the readout they would move, its population reading (R13's V0 to V3 word for word, stops only for failures
already certain, no futility stop on mornings, s11's population only if s7's is viable), its operations section, and
its K0, K3, K4, K5; the decode of all three memos; attack 2's perfect-imitator arms, its clamp-tie validity rule, its
split of the dark into an evening half and a before-first-light half, its round-one stratum for target asks in failing
light, its fault-injection dry run and its rule that recycling follows measured degradation only; attack 1's early
falsifier at G2, its teacher-half check, its absolute marks before any population run, its fixed list of differences
(§1), and its corrections of the records (each cited figure below uses the corrected one).

Where this registration departs, and why:

1. **The packet stays `resource-targets-v1` (memo 2 proposed `v2`, the distance to the nearest known water on "Go and
   drink").** Both attacks made `v2` conditional on the user's word before any collection; the stage must not stall on
   a question, and a packet change is a second change on top of scale and aggregation. Memo 2's P2 reading measures,
   with no model, how much the drink label turns on that hidden distance; `v2` is put to the user (§20) for a later
   stage. Nothing is built for it here.
2. **R16 does not take seeds 3457 and 3823** (memo 3 and both attacks would, by a dated amendment to R14's
   registration). They are reserved by another stage's registration, that stage is preserved and not closed by its
   owner, and taking them needs edits to R14's record and tools. Fresh seeds found by search cost nothing (§3).
3. **No seed-21 learner roll-out** (memo 1 had one, 5 days). Attack 1 cut it to fit the budget; held-out learner
   states are read instead on development animals of the training worlds (in-sample, said so) and, after the test,
   on the population test's own states (§13).
4. **The imitator stops the stage on viability only** (attack 2 also stopped on any night or morning readout). One
   arm read on a dozen readouts at about a 5% false-alarm rate each would stop a perfect imitator about four times in
   ten. The night and morning readouts of the imitator arms are printed as the ceiling line beside every population
   result (§12.5).
5. **Round-one targets of a learner's own states are labelled with the clamp-tie rule** (§4.4), which also applies
   to round zero; memo 1's "counterfactual target rows are harmless for the loop" is withdrawn (attack 2 showed the
   clamp, not the valuation, decides those labels).
6. **No word-swap probes** (memo 2's P5). They are description only, need their own code and model time, and attack 1
   noted that the memo's claim that they "settle" a question contradicts their status. Left for a later stage.
7. **Outcome names use readouts only** (memo 3's S12 traced failing units to cells to name "moved to a new state" and
   similar). Attack 1 struck the causal sentences; the trace stays as a description (§13) and names nothing. Whether a
   second round is indicated is a question for a new registration.
8. **Planted and imitator arms: 8, 8 and 4 per world** (memo 3 had 16 extra re-draws, 16 planted, 8 half-fault). The
   world is never swapped by them (attack 1), so they only print power and false-alarm rates and set the K5 rule; a
   smaller count halves their CPU time and changes no decision.
9. **The dark-out top-up is split** (attack 2): evening and before first light, by packet words (§4.3). Memo 1's
   single 130-row stratum would have filled with early risers.

## 3. Seeds

- **48 and 7**: the only worlds that give training and development rows, in both rounds (R4, R11, R15 roles).
- **21**: the held-out rules set only, sampled fresh under R15. R14's partial seed-21 data are never read.
- **3613**: spent; only its R13 run folders are read by the code checks K0 and K1, never as an allowance, a row or a
  gate on an adapter.
- **4111, 4222** (opened by R11) and **3457, 3823** (reserved by R14): untouched. **4333, 4444**: sealed for R12,
  untouched. Every reserved or retired seed of AGENTS.md (`scripts/e-run.ts` `RESERVED_SEEDS`): refused.
- **New seeds, found by search on 17 October 2026 at 14:48 to 14:52 EDT** in the main checkout: `git grep` with a
  pattern that excludes digits and decimal points before the number and digits after it, over all 193 local and remote
  branch heads (a hit in a commit hash in `commit-map.tsv` excluded 3389); file and folder names, to six levels, under
  the `artifacts/` folders of the main checkout and of all 71 worktrees and under `/Volumes/Drive/chimpbench/shots`;
  and the contents of the 2,024 run registries, manifests, `.meta.json`, `state`, step receipts, logs, `.md` and
  `.txt` files under 2 MB there, for the number after "seed", a flag or a folder tag. The test logs' durations
  (for example `duration_ms: 3643.32`) were read and are not seeds. **No use of any of the six below was found
  anywhere**, and none is in the reserved or retired lists:
  - **3701** and **3187**: the two population tests, **3701 for r16-agg-s7, 3187 for r16-agg-s11**.
  - **3079** and **3517**: the ten-animal tests (five focal adults on each).
  - **3011** and **3643**: **sealed** for an iteration-2 population test, never run in iteration 1.
  The chain checks before the first tick of each that no run folder of that seed exists outside this stage's own
  output (§17.7). Nothing runs on them before this file is committed.

## 4. What the model is shown, what it chooses, and what teaches it

### 4.1 Fixed

The R15 path exactly as built: `resourceTargets` 1, `activityFirst` 2, `observeV5` 1, `observeV4` 1, `menuParity` 1;
the loop's gate on (`kernelGate` 1) and the rules' pick kept on the menu (`kernelNoRulesPick` 0) on kernel arms; the
packet `r15Packet` (`resource-targets-v1`); food menus bounded to eight targets in four distance bands, water to
four (`src/sim/resources.ts`); every other kind keeps the rules' representative target; endings and bout lengths are
the rules'. Field profile, the working base `docs/staging/integrator-kit/params/M6-W50.json`, 30 rules days of
burn-in. Nothing under `src/sim` changes; `tests/fixtures/golden-world.json` and `tests/sim-track-e.test.ts` do not
move; no switch's default changes.

### 4.2 The teachers, unchanged

- **Kind teacher** `r11-original-menu-kind-marginal-v1` (`scripts/lib/r15-training.ts`): stage R11's label (the
  rules' choice with every candidate's jitter and every belief draw redrawn through the simulation's own menu code: at
  least 2,000 redraws, on until 500 offer the same menu, at most 20,000, no label from fewer than 100 matching
  redraws; `r11-prereg.md` §10.1), summed by kind over the R15 kind menu and renormalized. The kind mass that falls
  outside the R15 menu is reported ("excluded kind mass"), never credited.
- **Target teacher** `counterfactual-resource-valuation-v1`: each target's current raw value with redrawn uniform
  jitter and the rules' belief draw, the published clamp and rounding, the maximum; 2,000 seeded draws keyed by the
  row's id, ties by canonical key order, no world random number.
- Both teachers read the world and write nothing: `world.rng` and the animal's decision version are checked
  unchanged after every label (D0).

### 4.3 The strata library: packet words only

One library (`scripts/lib/r16-strata.ts`) cuts every stratum of sampling, reading, planting and search from the words
of the kind packet's shared lines (`doing`, `now`, `nearby`, `body`), so it classifies a P5b packet and an R15 kind
packet alike. Never by clock, sleep latch, unseen company, teacher score, model odds, a label or agreement.

- *Where:* "in my nest" (`doing` begins "in my nest,"); out (any other).
- *Light:* the light word and its trend as `src/providers/packet.ts` `lightWords` writes them (full daylight from
  0.97, bright from 0.6, dim from 0.2, very dim above 0.03, dark at or below 0.03; "getting lighter" or "getting
  darker" beyond a change of ±0.05; none at full daylight or dark). The packet and the rules' day phases switch at the
  same 0.97 and 0.03.
- *Company:* nobody listed (`nearby` absent); an adult listed "in a nest"; someone listed, none in a nest.
- *The half of the dark* (`body` words of `src/kernel/packet-words.ts` `bodyPartsV4`, short variant): **evening** when
  the body line says "long awake" or "body clock falling toward night"; **before first light** when it says "well
  slept" or "body clock rising toward day"; otherwise **unsplit**. A dark row with no such word is counted as unsplit
  and printed; it joins no half.

Named kind strata (every one also printed by source and split):

| Stratum | Words |
| --- | --- |
| NEST-DAY-CO | in my nest; full daylight; an adult listed in a nest |
| NEST-RISE-ALONE / NEST-RISE-CO | in my nest; any light, getting lighter; nobody listed / an adult listed in a nest |
| DUSK-EARLY-ALONE | in my nest; bright light, getting darker; nobody listed |
| DUSK-LATE-ALONE | in my nest; dim or very dim light, getting darker; nobody listed |
| DUSK-CO | in my nest; any light, getting darker; an adult listed in a nest |
| NEST-DARK | in my nest; dark |
| DARK-OUT-EVENING / DARK-OUT-MORNING | not in my nest; dark; evening half / before first light |

Named target strata: **FOOD-FALL** (a food group with two or more targets, light getting darker or dark; the target
row is the go-to-food group if it has two or more targets, else feed here); **WATER** ("Go and drink" offered and its
group holds two or more known sources; the target row is the drink group).

Two facts recorded before any collection (attack 1, from R11's samples and R14's rules twins): rules worlds hold
NEST-DAY-CO decisions (6 to 8 per world in R11's 9% six-day samples, almost all at 07:26 to 07:37 as the light passes
0.97, where the rules leave; "full daylight" has no trend word, so evening nest entries near 18:05 fall in the same
stratum), and they hold almost no DARK-OUT-EVENING decisions (3 to 5 per world in ten days in R14's rules twins, where
140 and 138 of 143 dark-out asks fell between 05:00 and 06:59). So **DARK-OUT-EVENING is "learner-only": not read on
rules states**, and DARK-OUT-MORNING is the rules' own leave state (their nest odds there are low).

### 4.4 A validity rule for the target teacher, registered before any label is read (attack 2)

`targetDistribution` scores `published(raw + jitter) + belief`, and `published` clamps at 0 (`scripts/lib/soft-labels.ts`);
resource options in the model's pool are exempt from the rules' −0.4 offer cut (`src/sim/candidates.ts`). Where every
option's raw value plus half the jitter span is at or below 0, the clamp decides the label (the first key in string
order, or the largest upward belief swing), not the valuation. **Such a target row is "clamp-tied": it gives no
training row and is left out of every target mark.** Its decision's kind row is kept. Clamp-tied rows are counted by
light word, kind, stratum, split and source; the coverage table prints their share in falling light. Rows where some
but not all options are always 0 are counted and kept.

### 4.5 Rows, ids, splits

Each selected decision yields one kind row and at most one target row (R15's exporter): a hash-chosen multi-target
resource group for a plain decision; the stratum's own group for FOOD-FALL and WATER; none for the other top-ups.
The split is R4's animal rule (`scripts/r4-contexts.ts` `splitOf`; development below 0.12) on 48 and 7, the same in
both rounds, so no animal is in training in one round and development in the other; seed 21 is `test`. Every row
carries its source (`rules`, `learner`, `sibling`), seed, animal, day, how it was selected, its stratum and cell, and
its packet and context hashes. The packet is `r15Packet` of the saved context, the same function the serving path
calls (`scripts/lib/r15-model.ts`); the assembler re-renders and compares every packet byte for byte.

## 5. Round zero: rules worlds (no model)

### 5.1 Worlds and collection

Seeds 48 and 7 (training and development) and 21 (held-out rules set): field, M6-W50 with the switches of §4.1 from the
first tick, 30 rules days of burn-in, then **simulated days 30 to 40** sampled. Each world runs in two passes, each a
deterministic rules run that lands on the same day hashes:

1. **Census** (no label). At every fresh decision of every animal aged 8 or over (`rgMinAge`), the R15 kind request is
   built as the R15 sampler builds it, and the census writes its id, tick, day, animal, split, the strata predicates of
   §4.3 from its packet, its kind menu, its resource groups with their sizes, and a selection hash of
   `(r16, seed, tick, animal)`. A checkpoint of the world is written at the end of every simulated day.
2. **Selection** (pure, on the census alone, before any label exists; §5.2).
3. **Labels**, in one-day segments: each day is started from the census checkpoint of the day before, run to its end
   with the teachers at the selected decisions, and must land on the census's hash of that day. A segment that stops
   is run again from its checkpoint; a finished segment's output is never rewritten.

### 5.2 Quotas (per world, in hash order; top-ups exclude decisions already chosen and take at most 2 per animal per ecological day; the plain sample is uncapped)

| | Training animals (48, 7) | Development animals (48, 7) | Held-out rules set (21, all animals) |
| --- | --- | --- | --- |
| plain fresh decisions (kind row + one hash-chosen target row) | 780 | 78 | 1,000 |
| NEST-DAY-CO (kind row) | ≤ 130 | ≤ 13 | ≤ 200 |
| DUSK-EARLY-ALONE and DUSK-LATE-ALONE together (kind row) | ≤ 130 | ≤ 13 | ≤ 200 each |
| DARK-OUT-EVENING (kind row) | ≤ 130 | ≤ 13 | ≤ 200 (learner-only: printed, not read) |
| DARK-OUT-MORNING (kind row) | ≤ 65 | ≤ 7 | ≤ 200 |
| FOOD-FALL (kind row + its target row) | ≤ 130 | ≤ 13 | ≤ 200 |
| WATER (kind row + the drink row) | ≤ 130 | ≤ 13 | ≤ 200 |
| NEST-RISE-ALONE, NEST-RISE-CO, DUSK-CO, NEST-DARK (kind row) | — | — | ≤ 200 each |

Sources of the numbers: the plain 780 and the ceilings 130 and 260 are R14's (§2), the per-animal-day cap R14's
amendment, the development tenth R14's, the held-out 1,000 plain is memo 1's cut of R11's 1,500 and the guard ceilings
200 are R14's 250 cut by the same fifth; 65 for the morning half of the dark is attack 2's. They bound file sizes and
model time; none is chosen to hit a behavioural rate. Expected (not a target): about 2,400 training rows and 240
development rows per world, 4,800 and 480 in all; the held-out set about 3,800 packets.

### 5.3 D0, the instruments (no model; read before anything is trained)

- The census and the label pass land on the same ten day hashes on each world.
- **The world is the one R14's rules twins ran** (attack 1's K3 and memo 3's K4 at once): on 48 and 7 the census
  world, with the R15 switches' own keys removed from its parameters, lands on the ten day hashes of R14's completed
  rules twins (`bench-r14/artifacts/r14/runs/rules-s48`, `rules-s7`, read only). This also shows that the R15 switches
  change nothing in a rules world. If R16's source no longer replays R14's frozen commit (an earlier stage's default-off
  change moved a path), this sub-check is reported as "not comparable" and replaced by K3 on the plain burn-in (§7.1).
- Every teacher call leaves `world.rng` and the decision version unchanged; every exported packet equals `r15Packet`
  of its saved context; every kind label's R11 marks hold at rules decisions (the replay of the rules' own belief
  draws ends on the world's random state, the first maximum with the realised draws is the rules' pick, and the menu
  rebuilt at the true version is the rules' own; `r11-contexts.ts` marks M1 a to c).
- **Labels against the teachers' realised picks on rules worlds** (the proof the brief asks for, run on the selected
  decisions of all three worlds): (a) kind: over all kind rows, the mean label mass on the rules' realised kind lies
  within three standard errors of the mean of the sum of squared label masses, which is what it equals when the realised
  kind is a draw from the label; and the same by stratum where 100 rows or more; (b) target: wherever the rules took a
  target of the row's kind and that target is on the row's bounded menu and no option carries a belief draw, the target
  teacher's arithmetic with the realised jitter (no redraw) gives the rules' target, up to ties at the same published
  score.
- Exclusions by reason, stratum, split and source; the share of kind labels at the 20,000 cap; excluded kind mass.

If any of these fails, nothing is trained: a registered amendment (iteration 2) or the stage ends with "the collection
could not be made exact".

### 5.4 Readings before any adapter exists (no model; printed, gating nothing unless said)

- **D1, coverage**: rows by stratum, light word and trend, half of the dark, split and source, with the census
  denominators; exclusions; clamp-tied share; excluded kind mass. A stratum under 30 rows or 5 animals is printed
  "thin" and never topped up by label.
- **Floors**: the teacher's own entropy per stage and stratum, the floor no reader of the packet can pass.
- **Baselines** on the held-out rules set: uniform odds; the **kind prior** (each kind's mean training label mass among
  training kind rows that offer it, renormalized over a row's menu); the **target position prior** (the mean training
  label at each menu position for the same kind and menu size; targets are listed nearest first; with fewer than 30
  training rows of that kind and size, the kind's pooled position means truncated to the menu and renormalized).
- **P1, facts the teacher uses that the packet does not show**: for every kind row in a finished nest, whether the rules
  counted a nest-mate the packet does not list (same community, 12 years or older, in a nest, within the party link of
  50 m; in the dark phases awake or asleep, by day asleep only: `nestCompanyValue`'s own conditions), and the teacher's
  mean nest mass with and without one. **A named nest stratum where half or more of the rows have such a nest-mate is
  "partly beyond the packet"**: its marks are read on the rows without one and printed on all rows as description.
  This is decided here, before any adapter exists.
- **P2, what the kind stage does not see**: the drink kind's teacher mass by thirst word, light word and the distance
  band of the nearest known water (the fact `v2` would show); kind menus without "Go to food elsewhere" while the animal
  remembers a crown it could go to; the teacher's mass on "Feed here" by fruit in view or not. Description.
- **The teacher-half check (attack 1)**: on the held-out rules set the kind label of the odd-numbered redraws is scored
  as if it were a model against the label of the even-numbered ones, through every absolute mark of §9 that uses the
  kind teacher (the night forecast, the dawn and stay forecasts, carrying on). **Each such mark must pass on it.** A mark
  that fails on the teacher's own halves is miscalibrated: it becomes description for the whole stage, registered here,
  never re-tuned. (Its target counterpart: the target label from draws 1 to 1,000 against draws 1,001 to 2,000 through
  P4.)

## 6. R14's completed learner collections, relabelled (no model; weighed as the brief asks)

**What it would show.** R14's two completed learner runs (seed 48 driven by `r11-p5b-s7`, seed 7 by `r11-p5b-s11`, ten
days each from the same day-30 worlds) hold the states where the P5b line failed, reached by a model population, at no
model cost: replaying them costs CPU minutes (R14's four label steps took 675 s; its two learner replays landed on all
ten day hashes). Relabelling them under the R15 contract is the earliest test that the R15 teachers can label states a
model population reaches, and a free "before" reading: do the round-zero adapters repeat the P5b failure odds in those
states?

**What it would not show.** The R15 learner's own states: a model that picks concrete trees and waters changes where
animals are at dusk, which menus arise and where it fails (crown switching, far trips, empty arrivals, water at dusk).
The states are in-sample (the same worlds, days and day-30 world as round zero; 33 of 38 animals in R14's seed-48 plain
selection were training animals). And the packets must be rebuilt by replaying each world to the ask, on a copy with
the R15 switches on: R14's saved P5b contexts lack the animal's memory, which the groups need.

**So, H-S ("sibling-learner states"), evaluation only, never a training row and never a gate:** each run is replayed
read-only through R16's source (R14's `traceRun`) and must land on every one of its ten day hashes, or this step is
dropped with no effect on the rest. At the asks of **development animals only**, selected from the replay's own census
by the library of §4.3 (400 plain asks per world in hash order, and every ask in NEST-DAY-CO, DUSK-LATE-ALONE,
DUSK-CO, NEST-RISE-CO and DARK-OUT-EVENING up to 100 each), the R15 kind request is built on a copy of the world with
the R15 switches set and labelled by both teachers. Printed: reconstruction, exclusions and excluded kind mass by
stratum (**D2**, description; attack 1 struck it as a gate: R14's label and the R15 kind label come from the same rules
machine, so agreement tests the plumbing). The partial seed-21 run is refused by the tool.

## 7. The yardstick worlds (no model; on 48 and 7 before night 1, on 3701 and 3187 before night 3)

On each world, one 30-day burn-in, built twice: **plain** (M6-W50, `observeV4` 1, `observeV5` 1, `menuParity` 1) and
**switched** (the same with `resourceTargets` 1 and `activityFirst` 2 from the first tick).

### 7.1 Arms (20 simulated days each, days 30 to 50)

- **K3**: the switched burn-in, with the two switches' keys removed from its parameters, hashes as the plain burn-in;
  two further rules days agree the same way.
- **The paired rules arm**: the plain world continued with no salt (R13's design).
- **Stage R7's sixteen control arms** at the population unit and `rules-plain` on the plain world, by stage R7's own
  code (R13's `controls`): eight rules re-draws (D: 2.51 standard deviations of the eight, R7 §6), random choice twice,
  the rules with 10, 20 and 30% random choices twice each.
- **Imitator arms ×8** on the switched world: every animal aged 8 or over on the R15 path through the loop, the gate on,
  each ask answered by the **perfect imitator**: at the kind stage the rules' own pick at this decision (the first
  maximum of the published score plus a belief draw from a stream seeded by the arm, the animal and the decision
  version, never `world.rng`: one draw from the kind teacher), at the target stage the target teacher's distribution,
  drawn by the loop's decode. World salts 21 to 28 (mixed into the world's stream as R7 mixes its salts), decode salts
  21 to 28. Nothing is fitted: the target choice is the teacher's own distribution.
- **Planted arms ×8** (salts 31 to 38): the imitator, except in three strata cut by §4.3's words, where the kind stage
  puts R13's measured odds on the Nest entry: **0.94** in NEST-DAY-CO (staying; `r13-prereg.md` §14.4), **0.77** in
  DUSK-LATE-ALONE (`r14-diag-nights.md`, 0.772), **0.59** in DARK-OUT-EVENING (the same table's evening-dark rows pooled:
  67 asks at 0.653 and 38 at 0.472). The rest of the mass goes to the rules' realised kind, or, when that is the Nest,
  to the highest-scored other kind. Every adult is planted, so the morning cue can feed itself as in R13. A model of a
  known failure for calibration, never a target.
- **Half-fault arms ×4** (salts 41 to 44): the same with the odds half way back to the teacher's (0.47, 0.89, 0.80).

Every arm writes stage R7's card and rows and the new readouts of §12.4. Expected CPU: about 35 s for a rules arm and a
few minutes for a kernel-path arm; about two hours per world, run three at a time with no model process alive.

### 7.2 What is read from them

- **K0 (no model)**: old paths unchanged. R13's proof 0 (the old arm `argmax-gate`, two days on seed 48, lands on stage
  R10's hashes 4b5cc61f8ad797e0, 95bfc1fd4e6ddfda, 07ec9b9f26b64f60 and 6,423 receipt lines); R13's model arm
  replayed through R16's source with the new readouts attached lands on its twenty day hashes and its regenerated R7 arm
  file equals the one on file (`bench-r13/artifacts/r13/card/P/s3613`), byte for byte; the earlier stages' tests pass
  unedited. Fails: nothing is read until it is repaired.
- **K1 (no model; a code check, not a test of power)**: the new readouts on R13's finished model and rules arms give the
  diagnosis's figures where they overlap: 21 short nights in the model arm and none in the rules arm; 13 short by the
  evening alone and 8 by an evening plus the early rise; early rises in the dark on 224 of 760 rules animal-nights and
  172 model; pant-hoots given 4.19 against 2.51 per animal-day; energy eaten before 09:00 84 kcal lower in the model
  arm; a nest minute after 07:45 on 26.4% of model animal-days and none after 08:00 in the rules arm. Attack 1: the
  midnight and 13:00 cuts and the search were read off that very run, so passing shows the code runs and nothing more.
- **I0, the cheapest falsifier (no model; on 48 and 7)**: if, on either world, **five or more of the eight imitator
  arms fail any of R13's V1 to V3** (§12.3) against that world's rules re-draws, the stage ends before any model hour:
  "the R15 menu and its teachers, imitated exactly through the loop, are not viable on the rules' own worlds." Otherwise
  the imitator arms' readouts are the ceiling line of §12.5. A readout told on the harmful side in five or more of eight
  imitator arms on both worlds is printed "moved by the R15 menu itself" beside every later reading of it.
- **K5, the instrument's real check (no model; on 48 and 7)**: a readout **sees R13's failure** when the planted arms are
  told on the failure side in at least 6 of 8 on both worlds. A readout that does not is struck from every later
  statement and kept as description. **If no morning readout and no night readout sees it, the stage stops before any
  model hour** ("the instrument cannot see the failure the stage exists to test"). The half-fault arms print what a
  half-cure would look like; the imitator arms print each readout's false-alarm rate.

## 8. Trainings

- **Recipe, unchanged**: `training/decide_ft/train_r11.py` from the untuned base (the R15 wrapper), three epochs, soft
  cross-entropy, weight 1, learning rate 2e-4, batch 2 with accumulation 4, R11's warm-up, decay and option shuffle,
  LoRA r 16, alpha 32, dropout 0.05 on the top 8 layers, bf16; the best development epoch saved; training seeds 7 then
  11. Packet identity `resource-targets-v1`.
- **Names**: round zero `r16-zero-s7`, `r16-zero-s11` (training root `ft0`); round one `r16-agg-s7`, `r16-agg-s11`
  (root `ft1`). The R15 manifest check, the worker and the app accept these names only with a manifest of stage R16 and
  the matching root; `r15-resources-s7` and `-s11` keep their stage R15 manifests.
- **Round one at equal exposure** (memo 1; kept by both attacks): round one shows the trainer as many examples as round
  zero did (three times round zero's training rows), so the optimizer steps and the learning-rate schedule match. Each
  round-one row is shown in one or two of the three epochs (in three if the file were smaller than round zero's), chosen
  before training by a hash of its id: rows shown once go to epoch `h mod 3`, rows shown twice to the other two. The
  trainer's per-row epoch field is **off by default** and a test shows that a file without it trains exactly as before.
  Every report prints which epoch was kept and what share of the file's rows it had seen (an epoch-1 checkpoint has
  seen under half the file). Full epochs on the round-one file are not a fallback: they need their own dated
  registration as iteration 2.
- **A training that ends without its manifest** (an operational failure: a crash, a timeout, a lost lock, no result
  read) may be run once more from base with the same seed into a fresh folder, the partial folder moved aside to
  `adapters-failed/` with its log; a second failure pauses the chain for a person. Nothing from a failed attempt is read.
- Six-hour cap per training (R15's). A preflight (real tokenizer counts of every train, development and held-out packet
  and its permuted variant against the 1,280 limit; R15's numerical parity on fixtures) runs before each round's first
  training; a failed tolerance stops the stage and is never widened.

## 9. Offline marks

All intervals: 95% bootstrap over animals, 2,000 resamples, fixed seed 16. **A stratum with fewer than 30 rows or 5
animals reads "not read", and for every mark that can stop the stage "not read" counts as not passed.** Divergence is
KL(teacher ‖ model) with the model floored at 1e-9, read for the kind stage and the target stage apart, never pooled.
Plain rows only for all-ask statistics. Clamp-tied target rows are out of every target mark. A nest stratum "partly
beyond the packet" (§5.4) is read on its rows without an unseen nest-mate.

### 9.1 G2 after `r16-zero-s7`, G3 after `r16-zero-s11` (held-out rules set, seed 21)

- **Z1, learned at all**: the kind stage's divergence is below the kind prior's and below uniform's, and the target
  stage's below the position prior's and below uniform's; each paired over animals with the interval below 0.
  (Near-certain; kept because a failure would be decisive.)
- **Z2, the early falsifier (attack 1)**: the **night forecast**, in extra nest departures per 100 animal-nights, over
  the strata the rules supply densely (DUSK-EARLY-ALONE, DUSK-LATE-ALONE, DUSK-CO): for each, the upper end of the
  interval of (teacher's Nest mass − model's Nest mass), times that stratum's asks per animal-night in the seed-21
  census, times 100; summed. **It must not exceed the allowance: 100 × the larger of D and 0.01 for the nights readout
  (V2), the mean of its two values on 48 and 7 from §7** (attack 1's correction: the allowance is D, from the training
  worlds' controls, never from seed 3613). Fails: "taught dense rules examples of these states, the model still leaves
  at a rate that would cost nights; at this size more rows of the same kind are not expected to cure it."
- Either training failing Z1 or Z2: **the stage stops**, "the round-zero recipe is not established" (before any
  roll-out; attack 1 struck memo 1's "s7 drives both worlds").
- Printed beside them, as readings: R11's O2 (trip mass within 0.03 of the teacher) and O4 (carrying on within 0.05);
  the mean probability on the teacher's option where the teacher puts 0.99 or more on one, by stratum; carrying on at
  three levels (the kind of the act in progress; the current target given its kind; both together); per-phase
  development curves; round zero's Nest mass in NEST-DAY-CO, DUSK-LATE-ALONE and DARK-OUT-EVENING on H-S beside the
  P5b line's 0.94, 0.77 and 0.59 (the prediction "round zero repeats the P5b failure odds" is logged before any
  population runs); **seconds per call by stage** (the speed rule of §10).

### 9.2 G6 after `r16-agg-s7`, G7 after `r16-agg-s11` (before any loop)

- **A1, harm on the rules' own states** (R14's guards, unchanged; against the same training seed's round-zero adapter,
  on the held-out rules set): divergence not above by more than 0.05 nats (each stage); carrying-on error (kind level)
  not above by more than 0.05; in NEST-RISE-CO and DUSK-CO, where the teacher puts 0.99 or more on the Nest, the mean
  Nest probability not lower by more than 0.01. Point estimates; intervals printed.
- **CARRY**: carrying on at the kind level within 0.05 of the teacher, in both directions (R11's O4), on the held-out
  rules set. Carrying on is the mass on the kind of the act in progress, at kind rows where that act has not finished
  and its kind is on the menu.
- **Absolute harm forecasts against the teacher** (memo 3, allowances from 48 and 7): the night forecast of Z2; the
  **dawn forecast** (NEST-RISE-ALONE, NEST-RISE-CO, NEST-DARK: extra departures per 100 animal-nights, the same
  allowance); the **stay forecast** (NEST-DAY-CO and NEST-RISE-ALONE wherever the teacher puts under 0.5 on the Nest:
  the upper end of (model's Nest mass − teacher's) × asks per animal-day × 30 minutes, the gate's daytime re-ask
  interval; against 1 × the larger of D and 1 minute for daylight minutes in a nest on 48 and 7). Upper ends; strata
  summed per readout.
- **P4, strands** (memo 2): (a) the target stage's divergence is below uniform's over the same menu, interval below 0,
  on the plain target rows and on FOOD-FALL; (b) on FOOD-FALL go-to-food rows, the model's mass on targets 400 m or more
  away is not above the teacher's with an interval entirely above 0.
- **Any failure for either training: no ten-animal test, no population test**, and the night's remaining model steps
  are cancelled; the result names the mark. If `r16-agg-s7` fails, `r16-agg-s11` is not trained.
- **TAKE and A2 (description, never a stop; attack 1)**: round one against round zero on held-out learner states: the
  development animals' asks in round one's own roll-outs that are not in the development file (H-L), and H-S (§6), each
  "in-sample, development animals"; less stay mass in NEST-DAY-CO, more Nest mass in DUSK-LATE-ALONE and
  DARK-OUT-EVENING, paired over animals, graded per stratum as shown, partly shown or not shown. A failed TAKE logs
  "mornings (or nights) not expected repaired" before any population runs.
- **A3, the words of attribution**: at equal exposure, round one and round zero differ by the file and by passes per row
  and by what the kept epoch saw. A difference may be called "the round-one file at the same number of optimizer
  steps", never "the learner's own states" alone and never a repair of R13.

## 10. Round one: the round-zero adapters drive their training worlds (model), then labels (no model)

- **Who drives**: `r16-zero-s7` drives seed 48 and `r16-zero-s11` drives seed 7 (each new adapter is then taught states
  of both trainings), every living adult on the R15 path, younger animals on the rules, the gate on, one draw per stage
  at salt 1, from the same day-30 switched world as round zero. **10 simulated days**, or **7** if G2's measured mean
  seconds per kind call exceeds 0.40 s (memo 3's speed rule, fixed now; decided by machine speed alone).
- **Usable**: a roll-out that ends early, by the stop check or an operational failure, keeps its completed days; at
  least 5 completed days make a world usable; fewer, and that world is "not collected" and round one is not trained.
  The day-5 stop check (R10 §5) applies; a world it stops is kept, labelled and described ("round zero collapses a
  population on its own training world").
- **Saved**: both calls of every ask (packets' hashes, probabilities, the applied position, milliseconds, worker),
  every kind context, a checkpoint per simulated day.
- **A0, the label instruments (no model)**: the replay of each roll-out with the read-only label hook lands on every day
  hash; every rebuilt kind packet hashes to the journal's; where the hash picks the group the learner was asked about,
  the rebuilt target packet hashes to the journal's target packet; D0's purity; exclusions and excluded kind mass by
  stratum and by source. On the rules twins (round zero's census worlds), D0 already holds. Fails: no round-one
  training; "the label machine cannot be trusted at learner states".
- **Rows per training world, among training animals' kind asks** (selected from the saved contexts by §4.3 and hash,
  before any label): plain 780; NEST-DAY-CO ≤ 260; DUSK-LATE-ALONE ≤ 130; DARK-OUT-EVENING ≤ 130; DARK-OUT-MORNING ≤ 65;
  FOOD-FALL ≤ 130 (with its target row); WATER ≤ 130 (with the drink row); at most 2 per animal per day in every top-up
  (R14's ceilings, attack 2's split). Asks the rules settled stay in as states; acts the gate kept or that arrived are
  not asks. Development: one tenth of each quota from development animals. **Round one's file = round zero's file + these
  rows** (rules and learner rows tagged); round zero's development file + round one's development rows.
- **Description, gating nothing**: each roll-out read as a population against its rules twin and §7's controls (V0 to
  V3 and §12.4 over its days): the "before" for round one (in-sample worlds; ten days cannot read reserves).

## 11. Ten animals (model; G8; a gross-harm screen only)

Seeds **3079** and **3517**: after the 30-day switched burn-in, five focal adults (`em-loop.ts` `focalSet`) on the R15
path, five days, companions on the rules; `r16-agg-s7` first, then `r16-agg-s11` (s11's arms are the first cut).
Stage R7's sixteen control arms at the focal unit (F) on each seed give D. **Stop** ("gross harm at ten animals") on a
starvation death of a focal animal, R10's stop-check items on the focal animals, or trips completed told downward by
more than 2 D. Otherwise description only: R11's timing rows and §12.4's readouts. **No statement about nights at this
unit** (at 50 animal-nights R13's failing rate passes R11's nest mark with chance about 0.6).

## 12. The population tests (model; G9 and the registered reading)

### 12.1 The unit

R13's unit with the R15 path: field, M6-W50 with §4.1's switches from the first tick, 30 rules days of burn-in, every
animal aged 8 or over on the kernel (membership taken again every tick), younger on the rules, the gate on, one draw per
stage at salt 1, **20 simulated days** (R13 §5). `r16-agg-s7` on **3701**; `r16-agg-s11` on **3187 only if s7's run is
viable** (memo 3; a failing recipe is then described by one training on one world, "one training of the recipe on one
world: not viable").

### 12.2 Before the model arm (no model, by day): G9

§7's arms on this world (K3, paired rules, the sixteen, rules-plain, imitator ×8, planted ×8, half ×4). R13's exact check
(the paired rules arm equals `rules-plain` on every readout and is not told from the re-draws on any level row; if not,
nothing is read). **The world is never swapped** (attack 1). Printed: power (how often the planted arms are told, per
readout), false alarms (how often the imitator arms are told), what a half-cure looks like. If the planted arms are told
on V2 in fewer than 6 of 8, every result on this world carries the heading "under-powered: a pass cannot be read as
repaired". Every "not told" prints the smallest effect the readout can detect (D).

### 12.3 Viability (S7; R13 §8.1 word for word)

V0 the stop check after day 5 did not end the run; V1 no more deaths by starvation than the largest count among the
eight rules re-draws; V2 nights in a nest (animal-nights with at least 0.9 of the dark hours in a nest) not below the
rules' mean by more than D, or by more than 0.01 when D is smaller; V3 reserves (mean daily change, % of the usual
store) not below the rules' mean by more than D. "Viable" is all four.

**Stops inside the run**: R10's stop check at day 5 (V0); from day 6 only for a failure already certain: the short
nights so far exceed what V2 allows over the whole run (computed on the largest possible denominator, every adult alive
at the start × 20 nights), or the starvation deaths so far exceed the re-draws' largest count. These cannot fire
falsely. V3 then reads "not read: stopped when V2 (or V1) had failed for certain". No futility stop on mornings.

### 12.4 The new readouts (S8, S9), every arm, the control arms included

Per animal and day (the card's day, 06:30 to 06:30; animals aged 8 or over at the start):

- **daylight minutes in a nest**: minutes in a finished nest at daylight 0.97 or more, before 13:00 (the readout) and
  after (printed);
- **hour of rising**: the clock hour of the last exit from a finished nest before 13:00 (mean and 90th percentile; a
  morning with no nest counted apart);
- **evening dark minutes out** and **morning dark minutes out**: dark minutes (daylight 0.03 or less) not in a finished
  nest, before and after midnight;
- **early rises**: exits from a finished nest in the dark after midnight; **late leaves**: exits while the light falls
  or in the dark before midnight;
- **days with a short night** (a day counts once however many animals are short; floor one day) and each short night
  classed **evening**, **morning** or **both** (whichever part has under 0.9 of its dark ticks in a nest);
- **pant-hoots given** (new pant-hoot entries of `World.calls` by caller, each call once); **grooming minutes**;
  **energy eaten by 09:00**; **trips completed**; **dark minutes on a food trip**; **drinks**;
- **the target stage** (memo 2's P6): food trips begun while the light falls or in the dark, by the sampler's distance
  bands (under 150, 150 to 400, 400 to 1,000, 1,000 m and more, straight distance at the start), and how each ended:
  arrived in light, arrived in the dark, abandoned; drink trips begun then, by band; crowns per feeding stretch;
- **who decided** (the ledger, on kernel arms): a fresh kind call, a target call, the rules' representative target, the
  gate's hold, a rules fallback, the rules for animals under 8; endings always by the rules.

Each is told or not by D on this world (2.51 SD of the eight re-draws); where D is smaller a floor stands in, a design
assumption that only keeps a readout from firing on a single event: 0.01 for a share (R13's), one day for days with a
short night, 1 minute per animal-day for minutes, 0.05 h for the hour of rising, 0.05 per animal-day for counts. Harm
is upward for daylight minutes in a nest, the hour of rising, evening dark minutes out, days with a short night and late
leaves; morning dark minutes out and early rises are read on both sides (above: nests lost before first light; below:
the model stays where the rules rise). Pant-hoots, trips and the target-stage counts are printed told or not, with no
side named harm. The diagnosis's definitions (nest after 07:45, kcal before 09:00, light 0.5) are printed beside for
the eye.

### 12.5 The outcome for one training on one world (the first line that applies)

(a) **STOPPED**: offline (§9), at ten animals (§11), at day 5, or by a certain failure, in its own words.
(b) **NOT VIABLE**: V1, V2 or V3 fails (named).
(c) **VIABLE, AT THE RULES' LEVEL ON MORNINGS AND NIGHTS**: viable, and no morning or night readout of §12.4 told on the
harmful side.
(d) **VIABLE, NOT AT THE RULES' LEVEL ON** <the readouts told, with their side>.

Beside every line: the imitator arms' range on that readout (the R15 menu's own level, "the ceiling line"), "moved by
the R15 menu itself" where I0 found it, the planted arms' power, the under-powered heading where it applies, and §1's
list. Words for (c): "on this world, under the draw, a population on the R16 recipe on the R15 menu kept nights and
mornings at the rules' level"; it does not mean the model is better than the rules, nearer to wild chimpanzees, or
that aggregation repaired R13. **The recipe** reads a name only when both trainings, each on its own world, read it;
if they differ: "the trainings or the worlds disagree".

## 13. After the tests (no model; description only)

- **T-after, drift**: the population test's own kind asks, labelled in a replay of the run with the read-only hook (one
  in ten in hash order, plus up to 300 in each named stratum): the tested adapter's divergence on its own test states
  (from the odds already in its journal: no model call) beside its divergence on the held-out rules set. Never rows,
  never a gate.
- **The search for where a failure sits**: each short night is traced to the ask that set the act at the first dark
  tick of the animal's longest stretch out of a nest, each long morning (longer than the largest in any rules re-draw)
  to the first ask in a finished nest at full daylight where staying was applied, each dark food trip to the target ask
  that chose its tree; the cells (light word and trend × in a nest or out × company listed × the act in progress) of
  those asks are listed with the rows the training files hold of each. A cell with fewer than 20 rows is "a state the
  files hardly hold". Description; it names no outcome.

## 14. The app demo (model; S14)

Only if at least one round-one adapter reads viable on its world. The better adapter: fewer morning and night readouts
told; then the smaller summed distance in D over those readouts; then s7. R15's registered browser proof unchanged
(`docs/staging/r15-browser-proof.md`, `scripts/verify-r15-browser.mjs`) with that adapter and its root, plus a
whole-scene look at the film: lockstep or mechanical movement is a defect even when the checks pass. The demo world is
R15's (`?r15=1`: an unsaved day-0 world with five adults and empty own records), **which lies outside every training
state** (every file is days 30 to 40); the page and the report say so. A burned-in demo world is left for later. If no
adapter is viable, the R15 demo stays as it is.

## 15. What no outcome of this stage can show

That the model is better than its teacher; anything about wild chimpanzees; anything about a third world, another
decode salt or the top pick at the population unit; which ingredient of the round did the work (more rows of rare
states, the learner's own states, or the changed passes per row) without a step-matched control, which is outside this
budget; whether the target choices are good ecology (the target teacher is the rules' own valuation, and it approves far
water at dusk because `drinkWorth` has no light term: a strand the teacher shares is named the rules' own); anything
about animals under 8; anything about choosing a nest tree, a grooming partner or an ending (the rules'); anything that
the packet does not show (§5.4 P1).

## 16. The model steps in order, with their time, and the budget

Measured rates (the attack-corrected records): training 0.6 s an example shown (R11 0.580 to 0.607, `r11-costs.md`; R15
s7 0.62); a development pass 0.77 s a row; scoring 0.324 to 0.5 s a packet in batches of 8 (`r11-costs.md`); a model load
3 to 9 minutes (186 s for R13's warm-up, 274 to 544 s for R14's, two failures at 600 s); a population day on P5b 634 to
1,070 s of wall time for about 2,150 to 2,970 asks (R14's 20 completed days on 48 and 7, 0.28 to 0.34 s mean per call);
R15 1.12 to 1.19 calls per applied decision; R15's kind packets are about two thirds of P5b's length (median 221 real
tokens against 340), target packets 388. Planning figure: **15 minutes a population day** (21 at the worst speed).

| Session | Step | Model hours (planned; worst) |
| --- | --- | --- |
| 0, by day, no model | build checks, K0, K1, census and labels of 48, 7, 21, readings, the teacher-half check, H-S, §7 on 48 and 7 (I0, K5) | 0 (about 6 CPU hours, three at a time) |
| 1, night | tokens and preflight of round zero | 0.3 (0.5) |
| | train `r16-zero-s7` (about 4,800 rows × 3 × 0.6 s, four development passes of about 480 rows, the load) | 2.9 (3.4) |
| | score it on the held-out rules set and H-S (about 4,800 packets) → **G2** | 0.65 (0.8) |
| | train `r16-zero-s11` → score → **G3** | 3.55 (4.2) |
| | roll-out: `r16-zero-s7` drives 48, 10 days | 2.6 (3.7) |
| | roll-out: `r16-zero-s11` drives 7, 10 days | 2.6 (3.7) |
| | *session 1* | *12.6 (16.3)* |
| between, no model | A0: replays, labels, assembly of round one; the roll-outs read as populations | 0 (about 1 CPU hour) |
| 2, night | tokens and preflight of round one | 0.3 (0.5) |
| | train `r16-agg-s7` (equal exposure: the same examples shown) → score on the held-out rules set, H-S and H-L, and `r16-zero-s7` on H-L → **G6** | 3.85 (4.6) |
| | train `r16-agg-s11` → score → **G7** | 3.85 (4.6) |
| | ten animals: `r16-agg-s7` on 3079 and 3517 → **G8**; then `r16-agg-s11` | 0.9 (1.2) |
| | *session 2* | *8.9 (10.9)* |
| by day, no model | §7 on 3701 and 3187 (G9) | 0 (about 4 CPU hours) |
| 3, night | population: `r16-agg-s7` on 3701, 20 days → viability | 5.1 (7.2) |
| | population: `r16-agg-s11` on 3187, only if s7's is viable | 5.1 (7.2) |
| | app demo, only if one is viable | 0.3 |
| | *session 3* | *10.5 (14.7); 5.4 if s7's is not viable* |

**About 32 model hours if everything runs, 27 if s7's population is not viable (the likelier case on the record), 42 at
the worst measured speeds.** That is more than two nights: the stage is planned as **three sessions**, a person reading
the state between them (attack 2: R14 lost a collection to one stall and two failed warm-ups in about 7.5 model hours,
so a 30-hour chain should expect pauses). **Cuts, in this order** (registered now; the integrator may take them before a
session, never after its results): (1) s11's ten-animal arms (−0.45 h); (2) roll-outs of 8 days (−1.0 h); (3) H-S
scoring (−0.4 h); (4) s11's population moved to a fourth session, the recipe statement waiting (−5.1 h). The earliest
stops: D0, I0 and K5 with no model hour; **the earliest model-time stop is G2 at about 3.9 model hours**.

## 17. Operation

1. **One chain, one owner.** `scripts/r16.py` (standard library only, like `scripts/r14.py`) runs one session's steps
   from a frozen detached checkout in a `screen` session, under `caffeinate -i -m -w <pid>` (`-m`: the model lives on an
   external drive with a ten-minute disk sleep, and R14's slow warm-ups were spent in file reads). It holds the shared
   lock `artifacts/r14-chain.lock` (main checkout) from the session's first step to its last, model or not, so no other
   model can start in a gap.
2. **The lock.** The file keeps its path and gains fields: pid, the process's start time, host, a random token, stage
   `R16-chain`, the current step. The owner holds `fcntl.flock` on it for its whole life, so the kernel drops it on any
   exit. Handlers for SIGINT, SIGTERM and SIGHUP (a closed `screen` sends SIGHUP; R14 handled only SIGTERM) stop the
   step at its next safe point, write the state and unlink the file in a `finally`. A lock file with no flock held whose
   pid is dead or whose start time differs is stale: an R16 chain moves it to `artifacts/r16/locks/` with a note and takes
   over; older tools still refuse any lock file, which fails safe. Children receive the token
   (`MGOGO_MODEL_LOCK_TOKEN`); the R15 worker, scorer, preflight and trainer accept the chain as owner only when the
   token matches and the lock's pid is one of their ancestors, and otherwise behave as today.
3. **The population runner** (new): R13's unit on the R15 path, a day at a time; a journal line per call (stage, packet
   and context hashes, the menu's keys, probabilities, milliseconds, the worker's id, retries); receipts per decision with
   both calls and the decode records; every kind context; one checkpoint per simulated day, all kept; resume from the
   newest whole checkpoint reusing the journal (nothing is asked twice); a replay that lands on every day hash.
4. **A stall.** Each call has a 30 s watchdog (the 95th percentile measured 0.38 to 0.49 s on P5b; R14 used 120 s and
   R15's worker 20 s). The worker is killed (SIGTERM, then SIGKILL after 2 s), a fresh one warmed, and the same call
   asked once more; the keyed draw makes the applied option the one an uninterrupted run would draw, up to floating-point
   noise, and the journal records what was applied. A failed retry lets the rules settle that ask (counted). Three
   stalls in one simulated day pause the run at its next checkpoint.
5. **A failed warm-up.** Ten minutes per warm-up (R10's `WARM_UP_LIMIT_MS`), then a five-minute cool-down and the
   quiet-machine check, at most three attempts per recovery; then the run pauses at its last checkpoint. The session
   pauses if its first warm-up takes more than ten minutes.
6. **Recycling on measured degradation only** (attack 2): at a day checkpoint the worker is replaced when the 95th
   percentile of its last 500 calls exceeds three times that of its first 500, or its resident memory passes 3.5 GB
   (measured peak 3.16 GB), or swap has grown by 1 GB since it started. No scheduled recycling.
7. **Budgets.** A run's science budget is its registered days; no day is refused because it would not fit a cumulative
   wall cap (what ended R14). Recovery time (warm-ups after the first, retries, cool-downs, waits for a quiet machine) is
   booked apart, with an allowance of 45 minutes per step; past it the step pauses. A wall cap of 2.5 times a step's
   planned time catches a hang only. A paused step is resumed by the integrator from its checkpoint and journal; a
   resume is not an iteration and never resets or extends anything registered. An operational failure is never read as
   a result. A scientific stop ends the session's remaining model steps, releases the lock and writes the state
   `scientific-stop` with the statement that fired; nothing is retried, re-tuned or replaced. Before the first tick of a
   test seed the chain checks that no run folder of that seed exists outside this stage's output.
8. **A quiet machine**, checked before every model step and every resume: one-minute load under 6; at least 5 GB free on
   the run's volume and the system volume; no other model process, test suite, build, Playwright or Chrome probe or
   `git grep` across many heads; at a session's start swap in use at most 6 GB (R13's launch note: restart the Mac first
   above it). The chain waits up to 30 minutes, outside the science budget, then pauses. During a step a monitor logs
   load, swap, free memory and the drive's reads and writes once a minute.
9. **CPU steps** (labels, assembly, control arms, replays) run between model steps with no model process alive, at most
   three at a time with the one-minute load under 8, never beside a training, scoring, roll-out or warm-up, and never
   across a model step's start (attack 1 over memo 1).

## 18. Machine rules for this agent, and iterations

No model process of any kind, no graphics probe, no dev server, no browser. Writes only in this worktree; reads frozen
checkouts. The whole test suite at most twice, never beside another agent's model step; `uptime` before anything heavy.
**Iteration 1** is this registration, its build and its chain. A failed or paused operational step is resumed, not
iterated. **Iteration 2**, only by a new dated registration: full-epoch round-one training, or a second aggregation
round, with 3011 and 3643 as its population tests. At most three iterations. The statements of §5 to §13 do not change
after any result.

## 19. Every fixed number and its source

| Number | Source |
| --- | --- |
| seeds 48, 7 train and develop; 21 held-out rules set; 3701, 3187 population; 3079, 3517 ten animals; 3011, 3643 sealed | R4, R11, R15 roles; §3's search |
| field, M6-W50, switches of §4.1, 30-day burn-in | R13 §2, R15 |
| days 30 to 40 sampled; roll-outs 10 days (7 by the speed rule), usable from 5 | R14 §2; memo 3; memo 1 |
| plain 780 (48, 7); held-out 1,000; ceilings 130, 260, 65, 200; 2 per animal-day; development a tenth | R14 §2 and amendment; memo 1; attack 2 |
| kind teacher 2,000 / 500 / 20,000 / 100 redraws; target teacher 2,000 draws; menus 8 and 4 | R11 §10.1; R15 |
| clamp-tie rule; dark halves by body words | attack 2; `packet-words.ts` |
| light words at 0.97, 0.6, 0.2, 0.03; trend ±0.05 | `packet.ts` `lightWords` |
| recipe; six-hour cap; preflight tolerances; 1,280 tokens | R11 §4, R15 contract |
| exposure floor 30 rows, 5 animals; bootstrap 2,000 over animals | R14 §4; R11 §6.1 |
| A1: 0.05 nats, 0.05 carrying-on error, 0.01 nest where teacher ≥ 0.99 | R14 §4 |
| CARRY 0.05; O2 0.03 | R11 O4, O2 |
| D = 2.51 SD of eight re-draws; V0 to V3; V2 floor 0.01; 20 days; stop check at day 5 | R7 §6; R13 §8.1, §5; R10 §5 |
| allowances = D on 48 and 7; stay forecast 30 min per held daytime ask | attack 1; the gate's daytime re-ask |
| new readouts' floors (1 day, 1 min, 0.05 h, 0.05 a day); 13:00 and midnight cuts | design assumptions (memo 3); readout boundaries only |
| planted odds 0.94, 0.77, 0.59; half 0.47, 0.89, 0.80 | R13 §14.4; `r14-diag-nights.md` |
| arms: 8 imitator, 8 planted, 4 half; I0 five of eight; K5 six of eight on both worlds; under-powered below six of eight | this registration (design assumptions about the instrument, fixed before any arm runs) |
| 30 s watchdog; 10 min warm-up; 5 min cool-down; 3 attempts; 3 stalls a day; 45 min recovery; 2.5× wall; load 6; 5 GB; swap 6 GB; recycle at 3× p95, 3.5 GB, +1 GB swap | memo 3 §8 with attack 2; R10; R13's launch note |
| speed rule 0.40 s a kind call | memo 3 |
| T-after one in ten and 300 a stratum; "hardly holds" under 20 rows | memo 3 §7 |

## 20. Decisions that are the user's (the stage proceeds as registered unless the user rules otherwise before session 1)

1. **The decode**: every R16 collection and test draws once per stage from the model's odds (salt 1, two streams, held
   for the act by the gate), as the user allowed on 10 October ("the loop may draw from the model's odds and hold the
   result"). This sets aside, in so many words, R13's registered sentence "the next population run is on the top pick"
   (`r13-prereg.md` §8.1 and §14.3 item 4), which was written for R11's adapters; the diagnosis found the top pick holds
   the daytime nest wherever companions are listed in theirs. If the user wants the top pick, the roll-outs and tests
   change with it, by amendment before session 1.
2. **Packet `v2`** (memo 2): may the kind stage's "Go and drink" say how far the nearest water the animal knows is
   (about 8 tokens; its own memory)? Not in R16; P2 prints what it would change.
3. **Water choice**: R15 built it under the same contract as trees, but the user ruled only on trees; R16 tests water
   choice at population scale unless the user keeps the drink target with the rules.
4. **Nest-mates the animal never saw**: the rules count them; R16 reads the morning part of nights with that limit
   named (P1). Later: show the animal's memory of who it saw settle, or change the teacher?
5. **Seeds 3457 and 3823** stay R14's; R16 takes none of them.
6. **The order of cuts** of §16 if the speed or the results push past three sessions; whether s11's population should
   run even if s7's fails.
7. **The app demo's world**: R15's day-0 world, said to lie outside every training state, or a burned-in world later.
8. Remaining R12 rulings stay open; R16 takes none of them (no menu, gate, bound, band, sampler or teacher change).

## 21. Iteration log and results

The build (17 October 2026, 14:58 to 17:20 EDT, branch `r16-scale-and-own-states`). No model process of any kind was
started: no Python worker, no tokenizer, no training, no scoring, no browser and no dev server. This is not one of the
three iterations of §18: no adapter exists.

### 21.1 What was built

| File | What it does |
| --- | --- |
| `scripts/lib/r16-strata.ts` | the strata and search cells from the kind packet's shared words and the kind menu only (§4.3) |
| `scripts/lib/r16-collect.ts`, `scripts/r16-collect.ts` | the census of every fresh rules decision with a checkpoint a day, the registered selections (§5.2, §10), the label pass in one-day segments that land on the census hash, the learner selections, the assembly of both rounds, the token inputs |
| `scripts/lib/r16-assemble.ts` | the leak checks (R15's own row check, then R16's roles), equal exposure by hash (§8) |
| `scripts/lib/r16-readouts.ts` | the new readouts of §12.4 as a read-only tap, for every arm |
| `scripts/lib/r16-run.ts` | whole days on the R15 path: a two-call journal, receipts with both calls and the decode records, kind contexts, a checkpoint a day, resume, exact replay, the certain-failure stop |
| `scripts/lib/r16-worker.ts` | the supervisor of §17.4 to §17.6, the quiet-machine check, the chain watch, a fake worker with faults |
| `scripts/lib/r16-arms.ts` | the imitator, planted and half-fault kernels; R7's controls with the readouts attached |
| `scripts/r16-population.ts` | registered runs only (roll-outs, ten animals, populations; dry runs on 48 and 7; one process per run folder), replay into R7 arm files, the arms of a world, the learner census and labels, H-S, K1, the drift and the search after a test (§13) |
| `scripts/r16-score.ts` | an adapter's odds on the reading sets through the supervised serving worker, resumable |
| `scripts/lib/r16-marks.ts`, `scripts/r16-report.ts` | every registered mark and statement, read from files (K0, D0, readings and the teacher-half check, I0 and K5, G2/G3, G6/G7, A0, G8, G9, the population outcome), and the numbers file |
| `scripts/r16.py` | the chain: sessions, the flock-held lock with stale detection and release on SIGINT, SIGTERM, SIGHUP, the quiet machine, budgets and hang guards, gates read by machine, the orphan guard, the dry path |
| `scripts/lib/r16-fake-scorer.mjs`, `scripts/lib/r16-fake-train.mjs` | the dry chain's stand-ins for the scorer process and for the preflight and trainer |
| `scripts/r16-proofs.ts` | the serving path's bytes; kill and resume |
| `tests/r16-scale.test.ts`, `tests/r16_chain_test.py` | the unit tests |

Shared code changed, each default-off (the earlier stages' tests pass unedited): `scripts/r8-contexts.ts` (the rules
taps as one helper), `scripts/r11-contexts.ts` (the label's redraws split by parity, on request), `scripts/r15-contexts.ts`
(its row check exported), `scripts/lib/r15-training.ts` (the labeler's options and detail, the R16 adapter names),
`server/r15-worker.ts` and `server/r15-scorer.py` (a lock held by the chain; the worker's pid), `training/decide_ft/train_r15.py`
and `r15_preflight.py` (R16 datasets and names; the chain's lock), `training/decide_ft/train_r11.py` and the new
`epochs.py` (rows that carry their epochs), `scripts/lib/r10-run.ts` (the meter exported), `scripts/r7-card.ts` (an
optional read-only tap), `src/providers/http.ts` and `scripts/verify-r15-browser.mjs` (the R16 adapter names).
Nothing under `src/sim` changed; no parameter, switch or default.

### 21.2 Clarifications made while building (before any run; none moves a statement of §5 to §15)

1. **The census dates a decision by its day segment**, not by its clock time: a decision in a day's last tick carries the
   next day's clock time, and the label pass that runs that segment must meet it (found by the full-scale proof below:
   one segment met 138 of 137 selected decisions before the fix). The census keeps an animal's first decision at one tick
   and decision version (none repeated in ten days of seed 48).
2. **The recovery allowance of §17.7 (45 minutes) is per process**: each start or resume of a step has its own; a
   resume follows a person's look, and the time already booked is in the run's registry.
3. **The rules' stop check ending a roll-out does not end the session** (§10: its days are kept and labelled); the
   session goes on to the other world. A focal run that paused is not "gross harm" (G8 names operational states apart).
4. **Token counts are taken per round**: round zero's reading sets before session 1, round one's H-L before session 2
   (the tokenizer alone, `r8_tokens.py`); the preflight counts the training files as R15 registered.
5. **Two short-night classes are printed**: the registered one (which half of the dark is under 0.9 in a nest) and the
   diagnosis's (which half alone would make the night short), so that K1 can be read against `r14-diag-nights.md`.
6. **The app's identity check and R15's browser verifier accept the R16 adapter names** (`src/providers/http.ts`,
   `scripts/verify-r15-browser.mjs`): §14 needs it; nothing else in the proof changes.
7. **A step stops when the chain that started it is gone** (the lock no longer names it, or its process is dead), and
   a new session refuses while a step of its run root is still alive without its chain: a chain killed outright cannot
   stop its own steps.
8. **The budget, from the measured file sizes** (seed 48's full collection below gave 2,240 training and 229
   development rows): round one's development file will hold about 960 rows, so each round-one training is about 3.2
   hours rather than 2.9, and session 2 about 9.5 model hours rather than 8.9; the stage about 33 hours if everything
   runs.
9. **The search (§13) cuts its cells by the packet's words alone** (light word and trend, the half of the dark, in a
   nest or out, company), without the act in progress, so that the cells of traced units and of training rows are read
   alike.
10. **The search's long morning** is one longer than the longest morning in a finished nest at full daylight on any day of
   the eight rules re-draws of that same world (§7's arms, read from the card); each unit is traced to the last kind ask
   of that animal at or before the unit's first tick. The drift's labels lift R15's seed check for test worlds only
   (they never become rows; the assembler still refuses any row outside 48 and 7).
11. **The session's first warm-up has one attempt** (§17.5): the chain marks the first step of a session that warms a
   serving worker (`R16_SESSION_FIRST=1`), and a worker not warm within ten minutes there pauses the session. Every later
   start has the three attempts of a recovery, and its attempts after the first, with their cool-downs, are booked to
   recovery (§17.7). Before this, every start had three attempts and none of a start's were booked; the dry chain's
   third run showed it.
12. **One process per run folder**: a run refuses to start or resume while the process that last wrote its folder still
   lives (the kill proof below found that killing `tsx` alone leaves the script running in its child).

### 21.3 The proofs without a model (17 October 2026; CPU only, on this branch; the registered readings are the frozen checkout's)

**Labels of a sample against the teachers' realised picks on a rules world; the collection at full scale (seed 48,
15:51 to 15:57 EDT).** `r16-collect.ts census`, `select --plan zero`, `labels` on seed 48, as session 0 runs them:

- The census world (the R15 switches from the first tick, 30 rules days of burn-in) is R14's rules twin: the burn-in
  `b35818060f2fe16b` and all ten day hashes (`1dc33e48…` to `0ac76e10…`) equal `bench-r14/artifacts/r14/runs/rules-s48`.
  So the R15 switches change nothing in a rules world, and this source replays R14's frozen commit (D0, K3 and K4 at once).
- 21,905 fresh decisions in ten days (1,913 to 2,771 a day; 38 adults); no decision counted twice.
- The selection, from the census alone: training animals 780 plain, NEST-DAY-CO 80 (the rules supply the state, rarely:
  the ceiling of 130 was not reached), DUSK-ALONE 112, DARK-OUT-EVENING 5 (attack 1 expected 3 to 5), DARK-OUT-MORNING 65
  (its ceiling), FOOD-FALL 130, WATER 130; development animals 78, 12, 10, 0, 7, 13, 13.
- The labels: 2,469 rows (1,423 kind, 1,046 target): 2,240 training and 229 development rows from this one world; each
  day segment 21 to 34 s and on the census's day hash.
- Exclusions: 12 kind labels from fewer than 100 matching menus; 12 clamp-tied target rows (7 at full daylight, 5 at
  failing light). Kind labels at the 20,000-redraw cap: 49 of 1,423 (3.4%); 4,298 redraws on average.
- **R11's marks M1 a, b, c held at all 1,423 labelled decisions** (the replay of the rules' belief draws ends on the
  world's random state, the first maximum with the realised draws is the rules' pick, the menu rebuilt at the true
  version is the rules' own).
- **The kind label against the rules' realised kind**: the mean label mass on the kind the rules took is 0.8288, against
  0.8293 expected if the realised kind is a draw from the label (difference −0.0004; three standard errors 0.0112).
- **The target teacher against the rules' realised target**: wherever the rules took a target of the row's kind that is
  on its bounded menu and no option carries a belief draw, the teacher's arithmetic with the realised jitter gives the
  rules' target: 97 of 97.
- The floors: the teacher's entropy 0.289 nats on kind rows (uniform 1.581) and 0.799 on target rows (uniform 1.466).
- P1: 536 kind rows in a finished nest, 120 of them with a nest-mate the rules count that the packet does not list.
- Packets: the longest about 608 tokens by the characters-over-four estimate (median 287); R15 measured 615 real tokens.

**R14's completed learner run relabelled (H-S; seed 48, 15:44 to 15:48 EDT).** `r16-population.ts relabel-r14` on
`bench-r14/artifacts/r14/runs/learner-s48` (read only): the replay under this source landed on all ten of R14's day
hashes, twice (the census pass and the label pass); 24,199 asks in the census (R14's own count); 582 asks of development
animals selected by packet words and relabelled on copies with the R15 switches; 947 rows; 7 exclusions (5 too few
matching menus, 2 clamp-tied); no kind mass outside the R15 menu at any row. The R15 kind teacher's Nest mass at these
P5b-learner states: 0.021 in NEST-DAY-CO (47 rows: the rules leave), 1.000 in DUSK-LATE-ALONE (16), 0.936 in DUSK-CO (78),
0.528 in NEST-RISE-CO (107), 1.000 in DARK-OUT-EVENING (4). Few development-animal rows reach the rare strata: most H-S
readings will be "not read" by the exposure floor, as §6 expected.

**Old arms and old tables unchanged (K0; 15:57 to 16:01 EDT).** The commands session 0 runs, into a scratch folder:
stage R10's arm `argmax-gate` for two days on seed 48 (`r10-night.ts run`) landed on the burn-in `4b5cc61f8ad797e0` and the
day hashes `95bfc1fd4e6ddfda` and `07ec9b9f26b64f60` with 6,423 receipt lines, R10's record; stage R13's model arm
(`bench-r13/artifacts/r13/model-s3613`, read only) replayed through this source landed on all 20 day hashes with none of
its 68,656 receipt lines different, and its stage R7 arm file came out byte for byte the file on record
(`bench-r13/artifacts/r13/card/P/s3613/p5b-s7-draw-1-s3613.json`), but for the commit, the time and the run path.

**The new readouts on stage R13's run reproduce the diagnosis (K1; 16:01 to 16:02 EDT).** `r16-population.ts k1` on
`bench-r13/artifacts/r13/model-s3613` and `rules-s3613` (read only; both replays exact): of 760 animal-nights, 21 short
nights on the model arm and none on the rules; of the 21, 13 short by the evening alone and 8 only together (the
registered classes: 13 evening, 3 morning, 5 both); nights with a rise in the dark 172 on the model arm against 224 on the
rules; pant-hoots 4.19 against 2.51 a day; the energy eaten from 06:30 to 09:00 about 85 kcal lower on the model arm; a
finished nest at 07:45 or later on 26.4% of the model arm's mornings and on none of the rules' after 08:00. Each of the
eleven checks holds (`r14-diag-nights.md`, `r14-diag-energy.md`). A code check only: the cuts were read off this run.
The command's first attempt died at its last write (the output's folder did not exist); the command now makes it.

**The serving path's bytes (packet parity; 16:16 EDT).** `r16-proofs.ts packets` on the dry chain's round-zero files:
R15's own worker (`server/r15-worker.ts`) was started on the fake scorer process in place of Python, holding the shared
lock as R15's app does, and asked for the first 60 rows of the held-out rules set (35 kind and 25 target rows). Every
one of the 60 packets the scorer received is byte for byte the row's own packet and the packet the R15 path renders
from the row's saved context; the warm-up packet is the first development row's, as R15's worker sends it.

**Kill and resume (16:18 EDT).** `r16-proofs.ts kill-resume`: a dry run of two days on seed 48 (one-day burn-in) was
killed with SIGKILL to its whole process group inside its second day, after 774 calls of that day were journalled.
While it lived, a second process on the same folder was refused. The resume started from day 1's checkpoint, set the
three day-2 files aside, reused all 774 journalled calls, and ended on the uninterrupted run's two day hashes
(`000e73a1081abd58`, `d5b45379946ecb44`) with the same receipts line for line; its replay was exact.

**The dry chain (16:19 to 16:43 EDT, on the build's commit before this record; 24 minutes beside a card run).**
`python3 -B scripts/r16.py dry` ran sessions 0, 1, between 1 and 2 on 48, 7 and 21 with a 2-day burn-in and one-day
windows. It used fake trainers and the fake scorer process behind R15's real serving worker. Then it ran a population
day with faults and the two readings after a test. Every step ran under the chain's lock, and the chain released the
lock at the end.
- D0, the readings and the cards held on dry data.
- G2, G3, G6 and G7 did not hold on the fake odds, as expected, and the dry chain went on.
- A0 did not hold only because a one-day roll-out is under the five days that make a world usable. Its label machine
  held: both replays were exact; every rebuilt kind packet equalled the journal's (1,054 and 1,027); and every rebuilt
  target packet did too (255 and 198).
- Round zero's dry file has 3,440 training and 406 development rows; round one's has 6,914 and 815.
- The day with faults ran 3,132 calls. The session's first warm-up held. Call 40 hung. The fresh worker's warm-up never
  answered (the dry run's limit is 4 s), and after a cool-down the next one held. The retry (call 41) hung too, so the
  rules settled that ask and a fourth worker was warmed. 8.6 s were booked to recovery, under the allowance, and the
  day's replay was exact.
- The drift labelled 383 of that run's own kind asks in an exact replay, and the search traced 80 units into 20 cells.

The earlier runs of the dry chain found two faults, and both are fixed. Run 1: assembly hashed a folder it was writing
into. Run 2: the census and the label pass disagreed at a day's last tick (found at full scale, above); it was stopped
with SIGTERM, and the lock was released as registered. Run 3 completed and showed the warm-up booking of clarification 11.

**I0 and K5 as a development reading (16:03 to 17:18 EDT).** These are the arms of §7 that session 0 runs:
`r16-population.ts card --seed 48|7 --days 20` into a scratch folder, read by `r16-report.ts cards`. Each world took
37 to 38 minutes beside other jobs. They are no-model gates on the training worlds, read early so that a stop would
show before the integrator's night. Session 0 reads them again on the frozen checkout, and the card's code is unchanged
since.
- **I0 holds.** The perfect imitator of the R15 menu is not viable in 0 of 8 arms on 48 and in 3 of 8 on 7 (the stage
  stops at 5). Seed 7 is closer to the line than 48.
- **K5 holds.** Five readouts see R13's planted failure on both worlds: nights in a nest, daylight minutes in a nest
  before 13:00, the 90th percentile of the hour of rising, evening dark minutes out of a nest, and days with a short
  night. Five do not, and are struck from every later statement and kept as description: reserves, the mean hour of
  rising, morning dark minutes out of a nest, early rises, and late leaves.
- No readout is moved by the R15 menu itself (none is told in 5 of 8 imitator arms on both worlds).

### 21.4 Tests and checks (on the build's last code commit)

- `tests/r16-scale.test.ts`: 19 tests. They cover the strata, the selection, equal exposure, the assembler's refusals,
  the supervisor (stalls, retries, the session's first warm-up, a failed recovery warm-up, booking, recycling), the
  two-call day runner (exact replay, a crash resumed), the certain-failure stop, the arms, the marks, the readouts and
  their trace fields, the chain's lock check in the worker, the registered runs, the census line, a census and label
  pass that land on the census hash, and the drift's plan and seed rule.
- `tests/r16_chain_test.py`: 9 tests. They cover the lock under a flock, stale locks, release on SIGINT, SIGTERM and
  SIGHUP, the flock dying with a killed process, steps that resume, pause, stop and hit the hang guard, gates, the
  session's first warm-up flag, and the trainer's epoch rule.
- The R16 scripts and tests were type-checked by hand with the project's strict options: clean. `tsc --noEmit`: clean.
  `scripts/gen-params.ts --check`: valid, up to date, lint clean.
- The whole suite once (16:45 to 16:51 EDT, beside a no-model card run): 1,563 tests, 1,562 pass, 1 skipped (a
  validation file not on this computer), none failed. The earlier stages' tests pass unedited. The Python tests of
  R14, R15 and R16 pass on the system interpreter (35 tests). `pnpm build`: passes.

### 21.5 Not done

- **No model step**, by the rules of this build. Not run: token counts, preflights, trainings, scorings, roll-outs,
  ten animals, populations and the app demo. Every mark after D0, I0 and K5 is unread, and no statement of §9 to §14
  has a value.
- **Session 0 was not run as a session.** Its pieces were run on this branch as proofs: K0, K1, the collection and
  H-S of seed 48, and the arms of §7 on 48 and 7. The collection of 7 and 21 at full scale and H-S on 7 run first in
  session 0, on the frozen checkout.
- **Packet lengths are estimates only** (characters over four). The real counts are taken by the tokenizer in
  sessions 1 and 2.
- **`IMPLEMENTATION_PLAN.md`, `AGENTS.md` and `HANDOFF.md` are unedited.** The proposed lines are in §22.
- **Nothing was pushed or merged.**

## 22. For the integrator

**Read first.** (1) Nothing in this file is a result about the model: the builder started no model process. (2) The
stage runs in six pieces, and a person reads the state between each one: session 0 (no model, by day), session 1 (model,
a night), between 1 (no model), session 2 (model, a night), day 2 (no model), session 3 (model, a night). (3) The decode
stands as registered (§20 item 1) unless the user rules otherwise before session 1. The other questions of §20 block
nothing. (4) Seeds 3701 and 3187 (populations) and 3079 and 3517 (ten animals) are fresh. Seeds 3011 and 3643 are
sealed. Seeds 3457 and 3823 stay R14's.

**The environment** (every shell that starts a session):

```sh
export MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN
export MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python
export HF_HOME=/Volumes/Drive/chimpbench/hf-cache
export HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub
export R16_OUT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r16/artifacts/r16
```

The chain finds Node 22.22.3 at fnm's path (set `R16_NODE` if it moved) and runs itself on the system `python3` (standard
library only). The trainer and the serving worker start `MGOGO_DECIDE_PYTHON` themselves.

**The chain, in order.** Each step shows its planned time; the worst case is in brackets. One model process runs at a
time. Every session runs from the frozen checkout in a detached `screen` session. The chain holds the shared lock, keeps
the Mac awake with `caffeinate -i -m`, and releases the lock on every exit. "Stops" names the marks that end a session.

```sh
# 0. The frozen checkout (a minute): this branch's last commit, or its merge into track-e.
cd /Volumes/Drive/chimpbench/MGOGO
git worktree add --detach .claude/worktrees/bench-r16 <the commit>
cd .claude/worktrees/bench-r16
ln -s /Volumes/Drive/chimpbench/MGOGO/node_modules node_modules
git status --short          # must print nothing

# 1. Check (seconds; starts nothing): identity, older chains, a quiet machine, swap, the lock.
python3 -B scripts/r16.py check

# 2. The dry chain (no model; 21 to 24 minutes measured): the whole path against a fake scorer on 48, 7 and 21 with a
#    2-day burn-in and 1-day runs, plus a day with a stall, a failed warm-up and a failed retry. Its gates are printed
#    and never stop it; A0, G2, G3, G6 and G7 do not hold on dry data, as expected.
python3 -B scripts/r16.py dry      # writes $R16_OUT/dry; the last line of $R16_OUT/dry/chain/status.log is "dry DONE"

# 3. Session 0 (no model, by day; about 2 hours, from the pieces measured). Steps: K0 and K1 (5 minutes); the census,
#    selection and labels of 48, 7 and 21 (about 6 minutes each); H-S from R14's two completed runs (4 minutes each);
#    round zero's files (a minute); the 38 arms of §7 on 48 and 7 for 20 days (30 to 40 minutes a world); then D0,
#    the readings, I0 and K5. Stops on K0, D0, I0 or K5 (state scientific-stop).
screen -dmS r16-s0 sh -c 'cd /Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r16 && export MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python HF_HOME=/Volumes/Drive/chimpbench/hf-cache HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub R16_OUT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r16/artifacts/r16 && python3 -B scripts/r16.py session0 > artifacts/r16-session0.out 2>&1'

# 4. Session 1 (model, a night; 12.6 hours planned [16.3]). Restart the Mac first if swap is above 6 GB.
#    Token counts and round zero's preflight (0.3 h [0.5]); train r16-zero-s7 (2.9 [3.4]); score it on H-R and H-S
#    (0.65 [0.8]); G2 stops here at about 3.9 model hours. Then train r16-zero-s11 and score it (3.55 [4.2]); G3 stops
#    here. Then the roll-out of r16-zero-s7 on 48 for 10 days (2.6 [3.7]; 7 days if G2 measured more than 0.40 s a kind
#    call), and the roll-out of r16-zero-s11 on 7 (2.6 [3.7]).
screen -dmS r16-s1 sh -c '<the same cd and exports> && python3 -B scripts/r16.py session1 > artifacts/r16-session1.out 2>&1'

# 5. Between 1 (no model; about 30 minutes). The learner census, selections and labels of both roll-outs, their replays
#    read as populations, and round one's file at equal exposure. Stops on A0.
screen -dmS r16-b1 sh -c '<the same cd and exports> && python3 -B scripts/r16.py between1 > artifacts/r16-between1.out 2>&1'

# 6. Session 2 (model, a night; 9.5 hours planned [11.7]). Token counts of H-L and round one's preflight (0.3 [0.5]);
#    train r16-agg-s7 (3.2 [3.8]); score it on H-R, H-S and H-L, and r16-zero-s7 on H-L (0.95 [1.2]); G6 stops here.
#    Then train r16-agg-s11 and score (4.15 [5.0]); G7 stops here. R7's focal controls on 3079 and 3517 (no model,
#    minutes). Ten animals: r16-agg-s7 on 3079 and 3517 (0.45 [0.6]), then r16-agg-s11 (0.45 [0.6]). G8 stops here.
screen -dmS r16-s2 sh -c '<the same cd and exports> && python3 -B scripts/r16.py session2 > artifacts/r16-session2.out 2>&1'

# 7. Day 2 (no model; about 30 minutes). The arms of §7 on 3701 and 3187 for 20 days. G9 stops on either world.
screen -dmS r16-d2 sh -c '<the same cd and exports> && python3 -B scripts/r16.py day2 > artifacts/r16-day2.out 2>&1'

# 8. Session 3 (model, a night; 10.5 hours planned [14.7]; 5.4 if s7's population is not viable). The population of
#    r16-agg-s7 on 3701 for 20 days (5.1 [7.2]), its replay, its reading, the drift (no model, about 20 minutes) and
#    the search (no model, a minute).
#    Only if that population is viable: r16-agg-s11 on 3187 (5.1 [7.2]) and the same readings. Then the numbers file.
#    A certain failure (V2 or V1 can no longer hold) ends a population early with exit 3.
screen -dmS r16-s3 sh -c '<the same cd and exports> && python3 -B scripts/r16.py session3 > artifacts/r16-session3.out 2>&1'

# 9. The tables, copied for a commit on a branch. Never publish a run folder: run folders carry this machine's host name and paths.
python3 -B scripts/r16.py publish docs/staging
```

Model hours in total: about 33 if everything runs (12.6 + 9.5 + 10.5), and 27 if s7's population is not viable. The
registered cuts of §16 are taken before a session with `R16_CUTS=s11-focal,rollout-8,hs-scoring,s11-population-later`
(any subset), never after its results.

**Watching (read only).** `python3 -B scripts/r16.py status` prints the state, the model hours charged and the last
lines of the status log. `cat $R16_OUT/chain/state` reads `running`, `<session>-done`, `paused`, `scientific-stop`,
`failed` or `interrupted`, and `$R16_OUT/chain/state-note` says why. Every step's log is
`$R16_OUT/chain/logs/<step>.log`. A run's own `run.json` lists its days and its supervisor's warm-ups, stalls and
recovery time. `$R16_OUT/chain/monitor.jsonl` logs load, swap, free memory and the drive's I/O once a minute during
model steps.

**If it stops.**
- `paused` means one of these happened: a stalled worker went past its recovery allowance; three warm-ups failed; three
  stalls came in one simulated day; the machine did not quiet down in 30 minutes; or a step went past its hang guard.
  Nothing is lost, because each day's checkpoint and journal stand. Read the reason, quiet the machine (restart it if
  swap is high), then run the same session again. It resumes.
- `interrupted` means a signal ended it. Run the same session again.
- `scientific-stop` means a registered mark did not hold, and the note names it. No further model step of this stage
  runs, and the result is that mark's sentence.
- `failed` means a step failed. Read the step's log. A training that ended without its manifest is retried once from
  base automatically, and its folder is kept under `adapters-failed/`. A second failure is `failed` and needs a person.
  A preflight that failed leaves its folder, and the next attempt refuses. A person moves that folder aside after reading it.
- A session refuses to start while a step of the run is still alive without its chain: `kill` that step, or let it end.
  A session moves a stale lock aside by itself.

**The app demo.** Run it only if `$R16_OUT/marks/population-s3701.json` or `-s3187.json` reads `"viable": true`. Use
the better adapter by §14's rule, and start only after the chain has ended and released the lock.

```sh
cd /Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r16
MGOGO_R15_ENABLED=1 MGOGO_R15_ROOT=$R16_OUT/ft1 MGOGO_R15_ADAPTER=<r16-agg-s7 or r16-agg-s11> fnm exec --using=22.22.3 -- pnpm dev --port 5182 --strictPort
node scripts/verify-r15-browser.mjs http://127.0.0.1:5182 --out $R16_OUT/browser-proof   # R15's registered proof; only the adapter names it accepts changed
```

Then look at the whole scene in the film. Lockstep or mechanical movement is a defect even when the checks pass. The
world is R15's day-0 world, which lies outside every training state. Say so beside the demo.

### The lines proposed for the shared files (not edited by this build)

**Proposed block for `IMPLEMENTATION_PLAN.md`** (after "Stage R15"):

> ## Stage R16: The perceived-target model at a real scale, taught on its own states, tested as a population
> **Goal**: stage R15's two-stage model (the kind of act, then a tree or water source the animal perceives or
> remembers) taught at a real scale on whole-day rules states (round zero), then one round on the states its own
> population reaches (round one, equal exposure), and tested where it has never been: offline on held-out rules states,
> at ten animals, and as a whole population for 20 days with R13's viability readouts and the readouts the diagnosis
> found missing. A rules-taught model on the R15 menu; nothing about wild chimpanzees.
> **Success Criteria** (registered in `docs/staging/r16-prereg.md` before any code or run): no-model gates first (D0:
> the collection lands on R14's rules twins' day hashes and reproduces the rules' own picks; I0: the perfect imitator of
> the R15 menu is viable on 48 and 7; K5: the readouts see R13's planted failure); G2/G3 (each round-zero training below
> the state-blind baselines and within the night forecast's allowance, D from the training worlds' controls); A0 (the
> learner labels land on every day hash); G6/G7 (R14's harm guards against round zero, carrying on within 0.05,
> absolute harm forecasts, strand marks); G8 (no gross harm at ten animals); G9 (the test world reads alike; power and
> false alarms printed); the population read by R13 §8.1 word for word, then mornings, nights and the target stage; the
> recipe named only when both trainings agree; the app demo only on a viable adapter.
> **Tests**: `tests/r16-scale.test.ts` (19), `tests/r16_chain_test.py` (9); the earlier stages' tests unedited.
> **Status**: Registered and built on branch `r16-scale-and-own-states` (17 October 2026); **not run: no model process
> was started**. The integrator runs it in three model sessions (about 33 model hours; 27 if s7's population is not
> viable) from a frozen checkout, `docs/staging/r16-prereg.md` §22.

**Proposed line for `AGENTS.md`, Commands** (after the R15 lines):

```
python3 -B scripts/r16.py check | dry | session0 | session1 | between1 | session2 | day2 | session3 | report | status | publish DEST   # stage R16 (docs/staging/r16-prereg.md; launch order §22): R15's two-stage model at a real scale (round zero: census of every fresh rules decision on 48, 7, 21, selection by packet words and hash, labels in day segments), one round on its own population's states at equal exposure, ten animals on 3079/3517, populations on 3701/3187 (3011/3643 sealed). One chain holds artifacts/r14-chain.lock under a flock for a whole session and releases it on every exit; steps resume; exit 75 pauses (resume by running the session again), 3 or a gate is a scientific stop. Pieces: scripts/r16-collect.ts (census, select, labels, assemble), scripts/r16-population.ts (registered runs only, one process per run folder, replay, card arms, learner labels, relabel-r14, k1, drift, trace), scripts/r16-score.ts, scripts/r16-report.ts (every mark from files), scripts/r16-proofs.ts. Model steps only from a frozen detached checkout in screen; dry: the whole path against a fake scorer process (scripts/lib/r16-fake-scorer.mjs), no model
```

**Proposed lines for `HANDOFF.md`**: §2.0: "**Stage R16** registered and built on `r16-scale-and-own-states`
(17 October 2026; no model process was started). It needs the integrator: the dry chain, session 0 by day, then three
model sessions (§22 of `docs/staging/r16-prereg.md`), each read by a person before the next. Open for the user before
session 1: the decode (a draw, as ruled on 10 October; it sets aside R13's 'next population run is on the top pick'),
packet v2, water choice, the unseen nest-mates, the order of cuts." §4 (branch map): "`r16-scale-and-own-states`: stage
R16 registered and built, not run." §5 (next tasks): "R16: merge, freeze, `check`, `dry`, `session0`; then `session1`
in screen on a quiet machine." AGENTS.md "Gotchas": "R16's seeds: 3701 and 3187 (population tests), 3079 and 3517 (ten
animals) are R16's; 3011 and 3643 are sealed for an R16 iteration 2; 3457 and 3823 stay R14's."

## 23. Amendment of 17 October 2026, before any run of the stage (the second reader; written 17:58 to 18:12 EDT)

Written by the second reader before any session of the chain and before any model step, after reading the build and
running it without a model. It changes no threshold, quota, seed, recipe or teacher. Seed 21 was not opened: every
figure below comes from the training worlds 48 and 7 (the builder's full-scale collection of 48 and the second reader's
of 7, both CPU only) or from R13's finished runs. It is not an iteration (§18): no adapter exists.

**A1. D0's kind check is read as §5.3 (a) words it.** §5.3 (a) is run "on the selected decisions of all three worlds":
"over all kind rows", and "the same by stratum where 100 rows or more". The build read it per world and had no stratum
check at all. From this amendment the gate is the worded one: all kind rows of 48, 7 and 21 together, then each named
kind stratum that holds 100 rows or more over the three worlds together; each world's own value and each world's stratum
values are printed beside it as description. Said plainly, because the reading was settled with figures in view: on seed
48 alone the stratum NEST-RISE-CO (in my nest, light rising, an adult listed in a nest; 134 rows) has a difference of
+0.0124 against three standard errors of 0.0095 (outside); seed 7's (124 rows) is −0.0036 against 0.0254; the two
together (258 rows) are +0.0047 against 0.0132 (within). The words of §5.3 decide the reading; the per-world departure
is printed in D0's table and in every report beside the dawn readings ("on seed 48 alone, the kind label at dawn in a
nest with companions listed is flatter than the rules' realised choice by about one percentage point").

**A2. A forecast is read on the strata that are not thin.** In Z2 and in the night, dawn and stay forecasts of §9.2 (and
in their teacher-half readings), a stratum whose rows on the held-out rules set, after P1's restriction and the
forecast's own filter, number under 30 or come from under 5 animals is "thin": it is named in the table and left out of
the sum, on the model and on the teacher's halves alike. Thinness is read from the rows, never from any odds. The
forecast is "not read" (not passed) only when no stratum is read, or when a stratum that is not thin has no interval.
Why: as built, one thin stratum made the whole forecast unread; on the teacher's halves that made the mark a description
for the whole stage (§5.4), so the early falsifier of §9.1 would have vanished without a word (under the other reading of
§9, it would have stopped the stage with the sentence "the model still leaves at a rate that would cost nights" for a
reason that is not about the model). It is likely, not remote: under the held-out plan's own quotas, DUSK-EARLY-ALONE
holds 30 rows from 20 animals on seed 48 and only 18 asks from 10 animals in seed 7's whole census, and NEST-RISE-ALONE,
which P1 reads on rows without an unseen nest-mate, keeps 36 of 89 rows on seed 48. On a seed-48 stand-in for the
held-out set (the held-out plan's quotas applied to seed 48's census, labelled; no model), every forecast reads and the
teacher's own halves pass with room: night 0.25 against an allowance of 1.16 extra departures per 100 animal-nights, dawn
0.62 against 1.16, stay 0.001 against 1 minute.

**A3. The certain-failure stop counts the animals V2 counts.** §12.3's stop "cannot fire falsely" only if it counts the
animals the card reads (alive and aged 8 or over when the window opens). As built it counted every driven animal's short
nights, so an animal that turned 8 during the run added short nights against the start set's denominator. G9 now writes
the card's animals into the stop's file and the stop counts only them.

**A4. A population run the rules settled is not read.** Stage R10's stop check limits the rules' fallbacks (10% of asks)
and timeouts (2%) in the first five days only; after day 5 nothing did, and a population the model drove less would look
more like the rules. Over the whole run, above either limit, the outcome of §12.5 reads "NOT READ: the rules settled …%
of asks over the run" (or the timeouts), and no viability word is given; it is never a pass. V0 to V3 keep R13's words.

**Clarifications (operational or descriptive; no statement of §5 to §15 moves).**

13. **K5 never strikes V0 to V3.** §21.3 lists "reserves" among the readouts K5 strikes. V2 and V3 are R13's words (§12.3)
    and are read in every viability statement whatever K5 finds; K5 strikes only the readouts of §12.4 from the outcome
    lines of §12.5 (as the code always did). K5's finding that the planted arms are told on reserves in 5 of 8 arms on seed
    48 is a power figure for V3, printed as such.
14. **The card's worlds.** The arms of §7 run only on the registered worlds of their unit (P: 48, 7, 3701, 3187; F: 3079,
    3517), and no flag lifts it. As built, `card` refused a sealed seed only without `--dry` and no reserved seed of
    AGENTS.md at all, although §3 says they are refused.
15. **A model run checks the chain's lock before its world exists.** A registered run started by hand in a frozen
    checkout would have burned in its test world before refusing for the missing lock token; the token and the lock are
    now read first.
16. **Recovery time is booked once.** A stall whose fresh worker needed a second warm-up booked the cool-down and the
    later warm-up twice, so a run paused before its 45 minutes of recovery were spent (a measured case: 290 ms booked
    for 209 ms).
17. **Crowns per feeding stretch** counted one crown in every stretch (the climb into the next crown ended the stretch;
    the rules read 1.000 on every arm). The climb now belongs to the stretch. A description readout; no mark reads it.
18. §21.3's sentence that the card's code was "unchanged since" the early I0 and K5 reading is not exact: build 7
    (16:16) changed the readouts' trace fields while those arms ran (from 16:03). No readout value read by I0 or K5
    changed; session 0 reads both again on the frozen checkout.
19. **Development animals.** R4's split leaves 5 development animals on seed 48 and 10 on seed 7, so every in-sample
    reading on development animals (H-S, H-L, TAKE, A2) rests on about 15 animals, 5 of them on seed 48 (attack 1).
