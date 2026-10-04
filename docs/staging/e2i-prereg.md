# E2i pre-registration: how fast a chimp walks

Status: complete (4 October 2026): diagnosis on S21 (quick), one iteration (G1) and a replicate (G1r); `walkGait` 1 a
provisional keep candidate (§8). Skeleton committed at the start of the stage (branch `e2i-walking`, from `track-e`
6871f3d), before any run and before any code change. Track E, stage E2i. Rule served: field values of behaviour are targets, never inputs. No speed
is set from a day range or a travel share, or tuned to reach them.

## 0. The problem

- `walkMps` (data/params.json; field profile 0.35 m/s, compressed 0.04) is a counted prescription
  (scripts/lib/prescriptions.ts: `field-copy`, "derived from the day range (2.7 km) and the travel share (21% of the
  day), the two outcomes it produces", encoding T-RNG-4 and T-ACT-2). Its registry note: "field profile from 2.7 km/day
  over ~21% of an 11.5 h day (effective speed including pauses)". It is an effective speed with pauses folded in.
- Every walk reads it (src/sim/execution.ts: travel, follow, approach to a caller, drink, climb to a crown, nest,
  patrol, avoidance and silent flight as multiples of it), and so do the trip times of every valuation that charges
  walking time: the net energy rate of a crown (src/sim/intake.ts `netRateShare`, `treeIntake`), the hunt's rate
  (src/sim/huntvalue.ts), the race for a crop at dawn (src/sim/departure.ts `arrivalLight`), the water trip
  (src/sim/water.ts), patrol and incursion daylight checks (src/sim/patrol.ts, src/sim/parties.ts), the light on the way
  (src/sim/light.ts) and the urgency rates (src/sim/urgency.ts).
- From first principles: a walking animal moves at the speed its body sets (the speed that minimises its cost per metre,
  or a measured preferred speed, by mass and age), and the pauses on the way are decisions the model already makes
  (stopping to feed, rest, wait for companions), not part of the speed.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S21 in quick mode (seeds 48 and 7, burn-in 30, 30 days), simulation
   truth: the speeds animals actually move at by act and class, the share of an act's time spent moving and pausing, how
   walking time and speed enter each valuation, and what a body-set speed would change in trip times and in the
   net-rate ranking of options.
2. **Mechanism** behind a new switch (0 = today), only for what the diagnosis implicates: a walking speed from the body
   (mass, age, load, terrain or climbing where the model has them), sourced; pauses left to the decisions that make them;
   every valuation reading the same speed. If the switch removes `walkMps`, the prescription count falls by one.
3. At most three iterations, each logged here and committed before its run; arms = S21 + switch (quick, seeds 48 and 7)
   judged against the integrator's four S21 quick realizations (S21q, S21q1–3 by `rngSalt`) by e-noise.md amendment 2
   with amendment 3's rare rows.

## 2. Diagnosis (step 1; registered 4 October 2026 before its run)

**What the code does (read at 6871f3d, field profile, S21's 47 switches).** `walkMps` (0.35 m/s) is read:
- by every walking act (src/sim/execution.ts `executeAction` and the tick functions): travel to a tree, a caller or home
  (`WALK`, :608), drink (:605), climb (:642), crown approach (:1011), nest (:955), care in the nest (:929), share and beg
  (`WALK`), party, care and other follows (`WALK × 1.15`, :634), pair approaches (`× 1.1`, play `× 1.6`/`1.4`), pant-grunt,
  mate and guard (`× 1.2`), consort (`× 0.9`/`1.1`), transfer (`× 1.1`), patrol (`× 0.95–1.05` × edge/return pace, :875–881),
  the approach to strangers (`× 1.1`, :862), silent flight (`× 1.8`) and avoidance (`× 1.2`, :718), feeding walks on the
  ground (`× 0.3`, :990, :1063). `moveTo` multiplies every speed by `speedFactor` (:63: `bodySpeed` = life stage 0.55 /
  0.7 / 0.88 below 2 / 5 / 10 y, 0.82 from 40 y, × (1 − 0.6 injury) × (0.7 + 0.3 alertness); × (1 − 0.3 rain); × E2c's
  pace in poor light). All design factors except the light pace (figueiro2011).
- by every valuation that charges walking time: the net energy rate of a crown, own trip, joined trip or caller's crown
  (src/sim/intake.ts:95 `netRateShare`, the walk `distM ÷ (walkMps × pace)` against the eating time `E ÷ (R × see)`;
  :60 `treeIntake` when `forageRate` is off), the hunt's rate (src/sim/huntvalue.ts:32, approach at walkMps although the
  hunt moves at `RUN × 0.8`: a mismatch, §6), the race for a crop at dawn (src/sim/departure.ts:35), the light on the way
  (src/sim/light.ts:88 `tripLight`), the water trip (src/sim/water.ts:125), the patrol lead's daylight check
  (src/sim/patrol.ts:101), the incursion's (src/sim/parties.ts:209), the bout of a committed trip (walk time + 5 min,
  src/sim/execution.ts:242), the urgency rates (src/sim/urgency.ts:115–129; off in S21) and the timers' trip cost
  (src/sim/candidates.ts:800; not reached while `intakeValue` is 1). No valuation applies `speedFactor`, so a juvenile's
  or a tired animal's trip is valued at a speed it does not walk.

**Tool.** `scripts/walk-diagnose.ts` (new; its header defines every readout; reads only: the rules tap `rgTap` and the
world after each tick). Smoke-tested on 1–2 days of S21 before this registration (every readout fills).
Readouts: (1) speeds by act and class: time and path per day by act, the in-act moving / climbing / still split, the
speed while moving (mean, p10, p50, p90) and the movement factor applied; (2) observer travel in truth (the field
category of T-ACT-2, src/field/categories.ts): share of daylight, moving / climbing / still, still ticks by reason
(departure wait, party wait, at the goal, beside the followed animal, listening stop, other), effective speed = path ÷
travel time (the quantity `walkMps` copies); (3) true day ranges by class (energy-diagnose's definition); (4) movement
phases between 20-min halts, batesByrne2009's Methods in truth: phase distance and speed, halts per day and their length
(the field's Table 1 and text: males 357 m at 1.94 km/h, lactating females 277 m at 1.91 km/h, receptive females 319 m at
2.21 km/h; 6.5 and 4.5 halts a day of 60 and 95 min); (5) valuations at full-daylight rules decisions with a tree option:
each tree option re-valued by `netRateShare` at a body speed vB, its score moved by fd × Δrate; the share of decisions
whose top option or best tree option changes, the best tree option's distance, and per kind the walk and feeding times
and the walk's share of the trip at both speeds; chosen drinks and hunts: distance and walk time.

**vB for the diagnosis** (a counterfactual, not a model input; the mechanism's inputs are registered in §4 after the
sources): adults 0.88 m/s (males), 0.78 m/s (females), 0.75 m/s (a female carrying an infant), the Mahale walking speeds
(Hunt 1989 as cited by nguessan2009, secondary, [L]); younger animals the adult value of their sex × (mass ÷ adult
mass)^(1/6) (equal Froude number at a leg length growing as mass^(1/3); design).

**Run.** S21's parameters (the integrator's `S21q-params.json`), seeds 48 and 7, burn-in 30, 30 days, from a frozen
detached checkout of this commit; `--json` into the stage's scratch directory.

**What decides the mechanism's scope (registered now).**
- If at least 75% of adults' observer-travel time is moving at the act's nominal speed (`walkMps` × multiplier × factor),
  the copy sets the travel share by making each metre slow, not through pauses: the mechanism replaces the speed and
  leaves the pauses to the acts that make them. If more than a quarter of travel time is standing inside travel acts,
  those stops are named and checked first (a pause that duplicates the copy's pauses is a defect).
- If the best tree option changes in at least 5% of decisions at vB, walking time decides between options and every
  valuation must read the speed the animal walks at; below 1%, the valuations are not implicated and only movement
  changes.
- The model's movement-phase speed against batesByrne2009's Table 1 (a target, never an input) says how much of the gap
  between a gait speed and the field's phase speed the model's own stops would have to supply.

### 2.1 Results (frozen checkout 93c4379, clean; `diag-S21.json` in the stage's scratch directory; printed by `walktab.py` from the JSON; S21's parameters, seeds 48 and 7, burn-in 30, 30 days; 89 s per seed)

```
## speeds by act (all classes): in-act ticks, moving/climb/still shares, speed while moving mean/p10/p50/p90, movement factor
own trip         n= 282135 mov 0.92 clb 0.02 still 0.06 | v 0.314 p10 0.288 p50 0.312 p90 0.338 f 0.898 | why departure wait 0.98, party wait 0.02
joined trip      n= 258775 mov 0.96 clb 0.04 still 0.00 | v 0.311 p10 0.263 p50 0.312 p90 0.338 f 0.889 | why departure wait 1.00
caller           n= 149524 mov 0.98 clb 0.02 still 0.00 | v 0.308 p10 0.263 p50 0.312 p90 0.338 f 0.884 | why at goal 1.00
home             n=    822 mov 1.00 clb 0.00 still 0.00 | v 0.283 p10 0.238 p50 0.288 p90 0.312 f 0.808 | why 
party follow     n=   4152 mov 0.87 clb 0.03 still 0.10 | v 0.315 p10 0.263 p50 0.312 p90 0.338 f 0.880 | why beside leader (≤ 5 m) 0.98, other 0.02
care follow      n=  77714 mov 0.25 clb 0.18 still 0.57 | v 0.246 p10 0.088 p50 0.263 p90 0.338 f 0.702 | why beside leader (≤ 5 m) 1.00, other 0.00
crown approach   n=  70094 mov 0.21 clb 0.79 still 0.00 | v 0.302 p10 0.263 p50 0.312 p90 0.338 f 0.864 | why 
in crown         n=1823162 mov 0.00 clb 0.01 still 0.99 | v 0.144 p10 0.038 p50 0.138 p90 0.213 f 0.622 | why other 1.00
fallback         n= 575039 mov 0.08 clb 0.01 still 0.91 | v 0.051 p10 0.038 p50 0.038 p90 0.088 f 0.861 | why other 1.00
drink            n=  72410 mov 0.59 clb 0.04 still 0.37 | v 0.314 p10 0.288 p50 0.312 p90 0.338 f 0.912 | why other 1.00
nest             n=6607783 mov 0.00 clb 0.00 still 1.00 | v 0.225 p10 0.213 p50 0.238 p90 0.263 f 0.658 | why other 1.00
patrol           n=  32294 mov 0.85 clb 0.00 still 0.15 | v 0.266 p10 0.188 p50 0.288 p90 0.388 f 0.910 | why listening stop 0.95, other 0.05
hunt             n=    286 mov 0.07 clb 0.37 still 0.56 | v 1.782 p10 1.488 p50 1.763 p90 1.913 f 0.891 | why other 1.00
flee             n=   2228 mov 0.85 clb 0.15 still 0.00 | v 0.517 p10 0.363 p50 0.513 p90 0.613 f 0.894 | why 
pair approach    n=  16705 mov 0.16 clb 0.78 still 0.06 | v 0.294 p10 0.113 p50 0.312 p90 0.388 f 0.816 | why other 1.00
run              n=   3005 mov 0.01 clb 0.98 still 0.01 | v 0.652 p10 0.013 p50 0.288 p90 1.838 f 0.877 | why other 1.00
social other     n=  70352 mov 0.08 clb 0.18 still 0.73 | v 0.236 p10 0.062 p50 0.288 p90 0.388 f 0.880 | why other 1.00
still acts       n=3152941 mov 0.02 clb 0.00 still 0.97 | v 0.061 p10 0.038 p50 0.038 p90 0.138 f 0.833 | why other 1.00

## observer travel (adults, daylight)
adult male         share 0.148 (111 min/day; moving 92) moving 0.83 climb 0.11 still 0.06 | eff speed 0.257 moving speed 0.310 | path in travel 0.97 (1.72 km/day) | still why departure wait 0.60, party wait 0.01, at goal 0.03, beside leader (≤ 5 m) 0.00, listening stop 0.18, other 0.17
female, other      share 0.104 (78 min/day; moving 68) moving 0.87 climb 0.11 still 0.03 | eff speed 0.251 moving speed 0.291 | path in travel 0.97 (1.18 km/day) | still why departure wait 0.67, party wait 0.01, at goal 0.01, beside leader (≤ 5 m) 0.00, listening stop 0.11, other 0.21
female, lactating  share 0.110 (83 min/day; moving 70) moving 0.85 climb 0.11 still 0.04 | eff speed 0.273 moving speed 0.320 | path in travel 0.94 (1.35 km/day) | still why departure wait 0.68, party wait 0.01, at goal 0.02, beside leader (≤ 5 m) 0.00, listening stop 0.07, other 0.22
female, pregnant   share 0.092 (69 min/day; moving 59) moving 0.85 climb 0.11 still 0.04 | eff speed 0.274 moving speed 0.322 | path in travel 0.95 (1.14 km/day) | still why departure wait 0.68, party wait 0.00, at goal 0.01, beside leader (≤ 5 m) 0.14, other 0.17

## valuations: decisions 96309 top changed 0.071 best tree changed 0.110 best tree d median 72 -> 89 mean 111 -> 123
crown        n 97397 chosen 13658 d med 4 chosen d med 3 p90 26 | walk min 0.1 -> 0.1 feed min 32.5 | walk share 0.00 -> 0.00 | rate 0.978 -> 0.982 zero-rate 0.01
own trip     n 159010 chosen 14777 d med 140 chosen d med 104 p90 234 | walk min 5.0 -> 2.1 feed min 41.5 | walk share 0.11 -> 0.05 | rate 0.866 -> 0.924 zero-rate 0.03
joined trip  n 32720 chosen 11220 d med 74 chosen d med 61 p90 181 | walk min 2.9 -> 1.3 feed min 30.7 | walk share 0.09 -> 0.04 | rate 0.878 -> 0.927 zero-rate 0.03
caller trip  n 7181 chosen 2089 d med 237 chosen d med 220 p90 705 | walk min 10.5 -> 4.4 feed min 34.2 | walk share 0.24 -> 0.12 | rate 0.722 -> 0.837 zero-rate 0.09
drinks {'n': 193, 'dMedian': 60.2805567577447, 'walkMin0': 2.870502702749748, 'walkMinB': 1.2649242330947068}
hunts {'n': 19, 'dMedian': 62.01237721250557, 'walkMin0': 2.9529703434526464, 'walkMinB': 1.1744768411459388}

## movement phases (batesByrne2009 Table 1: males 357 m 1.94 km/h; lactating 277 m 1.91; receptive 319 m 2.21; halts/day males 6.5, lactating 4.5; halt min 60 / 95)
adult male         phases 4317 dist 257 m speed mean 0.80 km/h (pooled 0.83, median 0.82) halts/day 6.5 halt min 98 days 840
female, lactating  phases 1964 dist 200 m speed mean 0.79 km/h (pooled 0.82, median 0.80) halts/day 5.4 halt min 123 days 480
female, other      phases 1136 dist 206 m speed mean 0.77 km/h (pooled 0.79, median 0.79) halts/day 5.2 halt min 128 days 285
female, pregnant   phases 882 dist 200 m speed mean 0.81 km/h (pooled 0.85, median 0.83) halts/day 4.7 halt min 144 days 255
```

True day ranges (energy-diagnose's definition, the same world as the integrator's S21q): adult males 1.87, other females
1.33, lactating females 1.65, juveniles 5–12 y 1.80, infants 2–5 y walking 0.61 km a day.

**Reading (what the effective-speed copy sets).**
1. *Speed.* Every walk moves at `walkMps` × the movement factor: in trips 0.29–0.33 m/s (p50 0.31; factor 0.83–0.93),
   follows the same, patrols 0.27. 83–87% of adults' observer-travel time is moving at that speed, 11% climbing, 3–6%
   standing (two thirds of it the departure wait). So the travel share (males 0.148 of daylight in truth, 111 min a day
   for 1.72 km) is the path ÷ a slow speed, not path plus pauses: the copy's pauses (it is 2.7 km ÷ 21% of the day) are
   walked, and the model's own stops come on top.
2. *Movement phases.* Between halts of 20 min the model moves at 0.77–0.81 km/h; batesByrne2009 (the source of the copy's
   2.7 km) measured 1.91–2.21 km/h in the same unit: the model's phases are 2.4–2.8 times slower. Its halts are the
   field's already (males 6.5 a day, the field's 6.5; lactating 5.4 against 4.5), but 40–60% longer (98 against 60 min,
   123 against 95). The pauses the copy folds into the speed are decisions the model already makes.
3. *Valuations.* Walking is 9–11% of a chosen trip's time (own trips 104 m: 5.0 min against 41.5 min of eating; joined
   trips 61 m; callers' crowns 220 m: 24%); at a walking speed of the body (vB) it halves, and the best tree option
   changes in 11.0% of decisions (the top option in 7.1%); its median distance goes from 72 to 89 m. Drinks and hunts
   are short (60–62 m, 3 min at walkMps). The hunt's approach is valued at walkMps (3.0 min for 62 m) while hunters move
   at `RUN × 0.8` (1.8 m/s while moving): a valuation–movement mismatch (§6).

**Against the registered criteria (§2).** At least 75% of travel time moves at the act's nominal speed (83–87%): the
mechanism replaces the speed and adds no pause. The best tree option changes in 11% ≥ 5% of decisions: every valuation
reads the same walking speed. The model's phases are 2.4–2.8 times slower than the field's with the field's number of
halts. Moving at 0.31 m/s, the model spends at most 72% of a phase moving (0.80 km/h = 0.22 m/s); at a gait speed of
about 0.79 m/s (0.88 × the factor 0.9) and the same stops, a male's phases would run at about 1.4 km/h (0.22 ÷ (0.72 ÷
2.55 + 0.28)), still below the field's 1.94: the model's own stops inside phases would then be longer than the field's,
not shorter. The field's phase speed is the stage's check on the pauses (a target, never an input).

## 3. Sources

Read 4 October 2026 (research.md and e-sources.md "Addendum: E2i walking speed"; helper report in the stage's scratch
directory). Inputs:
- **Walking speed while walking** [nguessan2009] (FT, the publisher's open PDF) citing Hunt 1989 (dissertation, not
  read) [L]: Mahale, 0.88 m/s males, 0.78 m/s females, 0.75 m/s "for females carrying an infant and for young
  individuals"; used there as the speed in Taylor's walking-cost equation, so a speed while walking. Hunt's method and
  sample unknown (secondary). Young individuals = juveniles and adolescents, put at 20 kg.
- **Size scaling** [alexanderJayes1983] (Abs) and [raichlen2013] (FT): equal Froude numbers across sizes; with geometric
  similarity (design) speed ∝ mass^⅙. Check (not a fit): 0.72–0.79 m/s at 20 kg against the source's 0.75.
- **No cost-minimising speed to derive**: chimpanzees' cost per metre is about constant across walking speeds
  ([luciano2024], FT, re-analysing pontzer2014jhe's five captive chimpanzees, bipedal, 0.45–1.67 m/s); the ledger's net
  cost (sockol2007) was measured at one speed. So the measured walking speed is the input, not an optimum.
Targets (never inputs): batesByrne2009's movement phases (1.91–2.21 km/h; 6.5 and 4.5 halts of ≥ 20 min a day) and
jang2019's travel speeds with rests (Taï females, 0.42–0.44 m/s).

**Samples of the field rows the arms are scored on** (opened 4 October 2026):
- T-RNG-4 (fitted), T-RNG-5 (held-out): batesByrne2009 (FT, authors' manuscript): Budongo Sonso, September 2002 –
  September 2003; 15 adults followed (8 males of four ranks; 7 females: 4 lactating throughout, 1 gestating then
  lactating, 1 receptive who conceived, pooled as "lactating" (6), and 1 receptive); no masses (wild, unweighed);
  location every 5 min "when it was travelling" by GPS (error ≤ 14 m) or on the trail grid; day range from focal samples
  followed ≥ 8 h without loss (27 male, 13 lactating, 3 receptive days): males 2.7 ± 1.5 km, lactating 1.2 ± 0.8 km. The
  observer (src/field/metrics.ts) sums 5-min fixes on complete follows. jang2019 (Taï females, continuous GPS, 274 days,
  median 4.03 km) is the row's second population.
- T-ACT-1, T-ACT-2, T-ACT-3 (fitted): villioth2025 (FT, PMC12701709): Budongo Waibira, October 2016 – June 2017; 10
  adult males (≥ 16 y), 9 adult females (≥ 14 y; 7 lactating, 2 with a juvenile); no masses; continuous focal follows
  from the night nest (4.1 ± 2.6 h, 491 h). Definitions quoted: "travelling (terrestrial quadrupedal walking as well as
  arboreal climbing and movement within the canopy)", "resting (any period > 1 min in which the individual was sitting or
  lying and not engaging in another behaviour)". Travel 21% (males) and 20% (females). T-ACT-2's second population is
  Ngogo's 0.14 on non-patrol days (amsler2010, abstract only). The model scores walking, climbing to a crown and
  approaches as travel (src/field/categories.ts); it has no movement within a crown (an observer mapping difference,
  §6). T-ACT-1 also uwimbabazi2019 (Kanyawara nursing females, full-day follows).
- T-ACT-4 (fitted): potts2011 (Ngogo and Kanyawara monthly means, continuous focal, resting includes grooming) and
  villioth2025.
- T-FOOD-4 (held-out): janmaat2013b (Taï, 5 adult females with offspring, 275 full days) and normand2009 (Taï, 2
  females, 28 days).
- T-PTY-1 (fitted): wilson2012 (Kanyawara party follows 1992–2006) and potts2011 (feeding parties).

**Readouts of the predictions and their definitions.** Bench rows as e-bench scores them (observer). True day range:
energy-diagnose's ground path per animal-day. Speeds, observer-travel composition, movement phases and valuations:
`scripts/walk-diagnose.ts` (header; phases follow batesByrne2009's Methods as quoted in research.md: "continuous movement
ending at a 20+ minute halt", speed "by dividing the distance travelled by travel time"). Reserves: energy-diagnose's
daily trajectory, OLS slope in % of the store a day. Night safety: rhythm-metrics, adults out of a nest (% of night) and
T-RHY-5 (the integrator's night.py). All smoke-tested on 2 days with the switch on (walk-diagnose and rhythm-metrics;
every readout filled; adults out of a nest 1.51% of the smoke night) before any arm.

## 4. Mechanism (iteration 1, A1; registered 4 October 2026 before its run; code at 4d38777)

`walkGait` 1 (src/sim/gait.ts; field profile only, `patchEcology` 1; 0 = today, bit for bit: the field pin and the
goldens hold):
- **The speed.** gaitSpeed = the adult walking speed of the sex (`walkGaitMaleMps` 0.88, `walkGaitFemaleMps` 0.78, [L])
  × (mass ÷ the adult mass of the sex)^`walkGaitSizeExp` (1/6, assumed) below adult mass (ledger mass, `massOf`) ×
  `walkGaitCarryMps` ÷ `walkGaitFemaleMps` (0.75 / 0.78 [L]) while a dependent rides on the animal (candidates.ts
  `isCarried`). It replaces `walkMps` in every walking act; today's act multipliers stay (follow 1.15, pair approach 1.1,
  silent flight 1.8, …). moveTo's factor keeps old age, injury, alertness, rain and light (design; E2c's pace) and drops
  bodySpeed's life stage below 10 y for walking (the mass carries it); running (`runSpeedOf`) and climbing keep it, so
  they are unchanged.
- **The valuations.** Every valuation that charged walking time at walkMps reads `tripSpeed` = gaitSpeed × the body
  state (old age, injury, alertness): netRateShare and treeIntake (crowns, own, joined and caller trips, the gate's patch
  test, rg.ts belief draws), tripLight, arrivalLight (dawn race), drinkWorth, the patrol lead's and the incursion's
  daylight checks, the committed trip's bout, the urgency rates, tripCost. Rain and light keep their own terms.
- **Defect fixed under the switch:** the hunt's approach is valued at the speed the hunt moves at (`runSpeedOf` × 0.8 ×
  the body state), not at walkMps.
- **Pauses:** none added; none removed. The departure wait, the initiator's wait for joiners, listening stops, a
  follower's stop beside its target and every halt are the decisions that make them.
- **Prescriptions:** `walkMps` is not read (traced in tests/sim-gait.test.ts): 45 → 44 on S21. The new speeds are
  classed input (rule 4, locomotion; borderline like `runMps`), the exponent design.

## 5. Predictions and kill criterion (iteration 1; registered before its run)

Arm **G1** = S21 + `walkGait` 1, quick (seeds 48 and 7, burn-in 30, 30 days): e-bench, energy-diagnose, walk-diagnose
and rhythm-metrics, from a frozen checkout of the commit that registers this section. Judged against the integrator's
four S21 quick realizations (S21q, S21q1–3; bench-run2 e7d8d8e) by e-noise.md amendment 2 with amendment 3's rare rows.
Reference values: mean ± SD of the four runs (§2.1 tables and `e2i_table.py`).

Predictions (confidence high for the mechanics, moderate or low for behaviour as marked):
1. Prescriptions 44 (high).
2. Moving speed in trips (walk-diagnose): adult males 0.74–0.84 m/s, other and lactating females 0.62–0.74, juveniles
   0.55–0.72 (high; against 0.29–0.33).
3. Movement phases 1.2–1.7 km/h for adults (moderate), still below batesByrne2009's 1.91–2.21 (moderate): the model's
   halts and short stops do not supply the field's pauses.
4. Adults' observer-travel time in truth falls (males 0.148 → 0.07–0.11 of daylight); T-ACT-2 0.160 ± 0.009 → 0.08–0.12,
   at or below its band's floor (moderate).
5. T-RNG-4 1.59 ± 0.10 → 1.7–2.4 km (low): walking time weighs less in every trip's rate, so farther crowns win (the best
   tree option changed in 11% of decisions at a body speed, §2.1); true day ranges of every adult class up 5–40% (low).
6. T-RNG-5 inside the reference spread (low); T-ACT-4 up 0.00–0.05 (moderate: the freed travel time goes to rest and
   grooming); T-ACT-1 within ±0.02, T-ACT-3 0.08–0.12, T-PTY-1 inside the reference spread (low); T-FOOD-4 up 0–25%
   (low).
7. Reserves of every class within ±2 SD of the reference (low): a minute of walking costs the activity rate as a minute
   of rest does, and the added metres cost 3.8 J/kg/m.
8. Night safety holds: adults out of a nest ≤ 3.3% of the night (moderate). Viability passes (moderate).
9. Fitted sum up by T-ACT-2's distance (low); held-out sums inside noise (low).

**Kill criterion (G1 is recorded, not a keep candidate, if any holds):** viability fails (a starvation death or the
bench's viability verdict false); held-out without the rare rows worse beyond noise (z > +2); night safety fails
(> 3.3%); the count is not 44. T-ACT-2 below its band is a reported cost on a fitted row (the keep rule does not test
fitted rows), never a reason to change a speed or add a pause. A second iteration is registered only for a defect the
G1 diagnosis names (for example a wait or a catch-up that was sized for the old speed), never for a speed.

## 6. Known defects

- Fixed under the switch: the hunt's approach valued at walkMps while hunters move at `RUN × 0.8`
  (src/sim/huntvalue.ts:32 at 6871f3d); valuations ignoring the movement factor (intake.ts:60, :95; departure.ts:35;
  light.ts:88; water.ts:125; patrol.ts:101; parties.ts:209; execution.ts:242; urgency.ts:115–129; rg.ts:158, :163).
- Deferred: walking on fallback food runs at 0.3 × the walking speed (execution.ts `fallbackTick` and the forage walk on
  the ground; design multiplier), so under the switch it doubles (0.105 → ~0.23 m/s); fallback walking is 8% of fallback
  ticks and 0.01–0.04 km a day (§2.1).
- Deferred: `climbMps` (0.22 m/s, stylized) sets climbing, 11% of adults' travel time; nguessan2009 uses 0.5 m/s from
  pontzerWrangham2004 (secondary, [L]). Out of this stage's scope; listed for a climbing stage.
- Observer mapping: villioth2025 scores movement within the canopy as travel; the model has no within-crown movement
  (feeding is scored feed), so the model's travel share omits that part (no correction made).

## 7. Results, iteration 1 (G1 = S21 + `walkGait` 1; frozen checkout 0d97ab3, clean; quick, seeds 48 and 7; printed by `report.sh` and `walktab.py` from the JSON in the stage's scratch directory, `runs/`)

The reference group is the integrator's four S21 quick realizations (S21q, S21q1–3 by `rngSalt`; bench-run2 e7d8d8e,
clean); the walk-diagnose rows of the reference are this stage's runs of the same four parameter sets (frozen 93c4379,
the S21 code). The rare rows (T-HUN-4, T-BRD-1, T-IGE-3) were not scored in these quick runs, so "without" equals "with".

```
== judge (e-noise amendment 2; rare rows per amendment 3)
quick, reference custom (4 runs), rows counted in all runs: fitted 15, held-out 15
  fitted             (15 rows) ref 1.23, 2.15, 0.84, 1.36 (mean 1.39, sd 0.55; used 0.69) | G1.json: 1.74, Δ +0.35, z +0.4 (inside noise)
  held-out           (15 rows) ref 5.77, 3.47, 4.78, 4.47 (mean 4.63, sd 0.95; used 1.26) | G1.json: 4.20, Δ -0.43, z -0.3 (inside noise)
  held-out w/o rare  (15 rows) ref 5.77, 3.47, 4.78, 4.47 (mean 4.63, sd 0.95; used 0.95) | G1.json: 4.20, Δ -0.43, z -0.4 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 1.06±0.21 | G1.json 1.70 (fail)
   T-SOC-3   held-out ref 0.01±0.02 | G1.json 0.41 (fail)

== fixed table
| Readout | ref runs | ref mean ± SD | G1.json |
| --- | --- | --- | --- |
| T-RNG-4 | 1.487 / 1.722 / 1.572 / 1.569 | 1.587 ± 0.098 | 2.435 (z +8.7) |
| T-RNG-5 | 0.929 / 0.806 / 1.188 / 1.089 | 1.003 ± 0.169 | 0.692 (z -1.8) |
| T-ACT-1 | 0.378 / 0.369 / 0.374 / 0.371 | 0.373 ± 0.004 | 0.387 (z +3.7) |
| T-ACT-2 | 0.151 / 0.156 / 0.162 / 0.172 | 0.160 ± 0.009 | 0.111 (z -5.7) |
| T-ACT-3 | 0.094 / 0.092 / 0.094 / 0.090 | 0.092 ± 0.002 | 0.087 (z -2.4) |
| T-ACT-4 | 0.391 / 0.358 / 0.372 / 0.368 | 0.372 ± 0.014 | 0.392 (z +1.5) |
| T-FOOD-4 | 7.796 / 7.909 / 8.039 / 8.533 | 8.069 ± 0.325 | 9.397 (z +4.1) |
| T-PTY-1 | 4.017 / 4.123 / 4.385 / 4.318 | 4.211 ± 0.170 | 4.339 (z +0.8) |
| T-ACT-2 male | 0.160 / 0.175 / 0.190 / 0.183 | 0.177 ± 0.013 | 0.130 (z -3.6) |
| T-ACT-2 female | 0.144 / 0.142 / 0.139 / 0.163 | 0.147 ± 0.011 | 0.096 (z -4.8) |
| true day range km, adult male | 1.87 / 1.83 / 1.89 / 2.02 | 1.90 ± 0.08 | 2.68 (z +9.8) |
| true day range km, female, other | 1.33 / 1.41 / 1.29 / 1.57 | 1.40 ± 0.12 | 1.91 (z +4.1) |
| true day range km, female, lactating | 1.66 / 1.70 / 1.75 / 1.71 | 1.70 ± 0.04 | 2.41 (z +19.0) |
| true day range km, juvenile 5–12 y | 1.80 / 1.96 / 1.87 / 2.03 | 1.92 ± 0.10 | 2.86 (z +9.1) |
| true day range km, infant 2–5 y | 0.27 / 0.28 / 0.30 / 0.30 | 0.29 ± 0.01 | 0.42 (z +9.9) |
| reserves %/day, adult male | 0.011 / -0.005 / -0.007 / 0.013 | 0.003 ± 0.010 | 0.010 (z +0.7) |
| reserves %/day, female, other | 0.011 / 0.011 / -0.020 / 0.007 | 0.002 ± 0.015 | 0.005 (z +0.2) |
| reserves %/day, female, lactating | 0.026 / 0.014 / -0.030 / 0.021 | 0.008 ± 0.025 | 0.010 (z +0.1) |
| reserves %/day, juvenile 5–12 y | -0.001 / 0.020 / -0.040 / -0.008 | -0.007 ± 0.025 | 0.005 (z +0.5) |
| reserves %/day, infant 2–5 y | 0.040 / 0.010 / -0.012 / 0.014 | 0.013 ± 0.021 | 0.011 (z -0.1) |
| reserves %/day, infant 0.5–2 y | 0.013 / 0.004 / -0.034 / 0.037 | 0.005 ± 0.029 | 0.005 (z -0.0) |
| eating min, adult male | 229 / 228 / 229 / 233 | 230 ± 2 | 235 (z +2.3) |
| eating min, female, lactating | 299 / 302 / 306 / 300 | 302 ± 3 | 322 (z +6.7) |
| fitted sum | 1.48 / 2.87 / 0.84 / 1.61 | 1.70 ± 0.85 | 1.99 (z +0.3) |
| held-out sum | 7.13 / 3.47 / 4.78 / 4.92 | 5.08 ± 1.52 | 5.41 (z +0.2) |
| prescriptions | 45 / 45 / 45 / 45 | 45 ± 0 | 44 |
| viability | True / True / True / True | | True (deaths 0, starvation 0) |
| git | e7d8d8e d0 / e7d8d8e d0 / e7d8d8e d0 / e7d8d8e d0 | | 0d97ab3 d0 |

| walk-diagnose readout | ref runs | ref mean ± SD | G1-walk.json |
| --- | --- | --- | --- |
| moving speed in trips m/s, adult male | 0.316 / 0.314 / 0.313 / 0.312 | 0.314 ± 0.002 | 0.787 (z +298.1) |
| moving speed in trips m/s, female, other | 0.291 / 0.300 / 0.295 / 0.299 | 0.296 ± 0.004 | 0.667 (z +97.4) |
| moving speed in trips m/s, female, lactating | 0.325 / 0.324 / 0.325 / 0.324 | 0.324 ± 0.000 | 0.692 (z +1022.4) |
| moving speed in trips m/s, juvenile 5–12 y | 0.290 / 0.291 / 0.290 / 0.290 | 0.290 ± 0.000 | 0.707 (z +1178.9) |
| phase speed km/h, adult male | 0.80 / 0.78 / 0.78 / 0.79 | 0.79 ± 0.01 | 1.25 (z +36.8) |
| halts ≥ 20 min per day, adult male | 6.5 / 6.8 / 6.8 / 6.9 | 6.7 ± 0.2 | 8.0 (z +7.8) |
| phase speed km/h, female, lactating | 0.79 / 0.79 / 0.79 / 0.79 | 0.79 ± 0.00 | 1.13 (z +98.7) |
| halts ≥ 20 min per day, female, lactating | 5.4 / 5.5 / 5.5 / 5.4 | 5.5 ± 0.1 | 6.4 (z +14.1) |
| phase speed km/h, female, other | 0.77 / 0.76 / 0.75 / 0.76 | 0.76 ± 0.01 | 1.16 (z +55.3) |
| halts ≥ 20 min per day, female, other | 5.2 / 5.6 / 5.5 / 5.8 | 5.5 ± 0.2 | 6.2 (z +3.1) |
| travel share in truth, adult male | 0.148 / 0.146 / 0.151 / 0.156 | 0.150 ± 0.004 | 0.098 (z -12.4) |
| moving share of travel, adult male | 0.83 / 0.82 / 0.82 / 0.83 | 0.82 ± 0.00 | 0.71 (z -24.8) |
| travel share in truth, female, other | 0.104 / 0.109 / 0.102 / 0.116 | 0.108 ± 0.006 | 0.077 (z -4.9) |
| moving share of travel, female, other | 0.87 / 0.85 / 0.84 / 0.84 | 0.85 ± 0.01 | 0.75 (z -8.4) |
| travel share in truth, female, lactating | 0.110 / 0.114 / 0.115 / 0.112 | 0.113 ± 0.002 | 0.083 (z -12.6) |
| moving share of travel, female, lactating | 0.85 / 0.85 / 0.86 / 0.86 | 0.86 ± 0.01 | 0.79 (z -12.0) |
| walk-diagnose day range km, adult male | 1.87 / 1.83 / 1.89 / 2.02 | 1.90 ± 0.08 | 2.68 (z +9.8) |
| walk-diagnose day range km, female, other | 1.33 / 1.41 / 1.29 / 1.57 | 1.40 ± 0.12 | 1.91 (z +4.1) |
| walk-diagnose day range km, female, lactating | 1.65 / 1.70 / 1.75 / 1.71 | 1.70 ± 0.04 | 2.41 (z +19.0) |
| walk-diagnose day range km, juvenile 5–12 y | 1.80 / 1.96 / 1.87 / 2.03 | 1.92 ± 0.10 | 2.85 (z +9.1) |

== night
G1-rhythm.json: adults out of a nest 2.42% of night; T-RHY-5 0.0182; night deaths 0; deaths 0

== prescriptions
G1.json 44 git 0d97ab3 dirty 0

## speeds by act (all classes): in-act ticks, moving/climb/still shares, speed while moving mean/p10/p50/p90, movement factor
own trip         n= 179285 mov 0.84 clb 0.04 still 0.12 | v 0.733 p10 0.638 p50 0.713 p90 0.838 f 0.917 | why departure wait 0.94, party wait 0.06
joined trip      n= 172825 mov 0.92 clb 0.08 still 0.00 | v 0.732 p10 0.613 p50 0.738 p90 0.863 f 0.903 | why departure wait 1.00
caller           n=  89617 mov 0.96 clb 0.04 still 0.00 | v 0.714 p10 0.588 p50 0.738 p90 0.863 f 0.904 | why at goal 1.00
home             n=     61 mov 1.00 clb 0.00 still 0.00 | v 0.832 p10 0.838 p50 0.838 p90 0.838 f 0.946 | why 
party follow     n=   3182 mov 0.60 clb 0.07 still 0.34 | v 0.722 p10 0.537 p50 0.763 p90 0.863 f 0.901 | why beside leader (≤ 5 m) 1.00, other 0.00
care follow      n= 107907 mov 0.16 clb 0.15 still 0.69 | v 0.503 p10 0.013 p50 0.663 p90 0.812 f 0.908 | why beside leader (≤ 5 m) 1.00
crown approach   n=  69642 mov 0.09 clb 0.91 still 0.00 | v 0.716 p10 0.613 p50 0.713 p90 0.838 f 0.885 | why 
in crown         n=1893601 mov 0.00 clb 0.01 still 0.99 | v 0.000 p10 — p50 — p90 — f 0.000 | why other 1.00
fallback         n= 588858 mov 0.09 clb 0.01 still 0.90 | v 0.083 p10 0.038 p50 0.038 p90 0.213 f 0.886 | why other 1.00
drink            n=  78294 mov 0.47 clb 0.05 still 0.48 | v 0.729 p10 0.613 p50 0.713 p90 0.863 f 0.923 | why other 1.00
nest             n=6526782 mov 0.00 clb 0.00 still 1.00 | v 0.598 p10 0.488 p50 0.613 p90 0.663 f 0.867 | why other 1.00
patrol           n=  15298 mov 0.84 clb 0.00 still 0.16 | v 0.689 p10 0.463 p50 0.663 p90 1.038 f 0.915 | why listening stop 0.93, other 0.07
hunt             n=    204 mov 0.11 clb 0.35 still 0.54 | v 1.790 p10 1.613 p50 1.913 p90 1.963 f 0.895 | why other 1.00
flee             n=   2476 mov 0.66 clb 0.34 still 0.00 | v 1.013 p10 0.812 p50 0.913 p90 1.388 f 0.904 | why 
pair approach    n=  14985 mov 0.09 clb 0.86 still 0.05 | v 0.609 p10 0.088 p50 0.738 p90 1.012 f 0.917 | why other 1.00
run              n=   3244 mov 0.03 clb 0.96 still 0.01 | v 0.746 p10 0.013 p50 0.388 p90 1.938 f 0.909 | why other 1.00
social other     n= 145505 mov 0.06 clb 0.14 still 0.80 | v 0.453 p10 0.088 p50 0.562 p90 0.888 f 0.917 | why other 1.00
still acts       n=3320021 mov 0.03 clb 0.00 still 0.97 | v 0.075 p10 0.038 p50 0.038 p90 0.138 f 0.908 | why other 1.00

## movement phases (batesByrne2009 Table 1: males 357 m 1.94 km/h; lactating 277 m 1.91; receptive 319 m 2.21; halts/day males 6.5, lactating 4.5; halt min 60 / 95)
adult male         phases 5728 dist 273 m speed mean 1.25 km/h (pooled 1.27, median 1.18) halts/day 8.0 halt min 81 days 840
female, lactating  phases 2474 dist 231 m speed mean 1.13 km/h (pooled 1.16, median 1.04) halts/day 6.4 halt min 105 days 480
female, other      phases 1908 dist 234 m speed mean 1.16 km/h (pooled 1.19, median 1.11) halts/day 6.2 halt min 108 days 379
female, pregnant   phases 643 dist 250 m speed mean 1.20 km/h (pooled 1.28, median 1.13) halts/day 5.2 halt min 130 days 161
```

S21q's own rhythm run (one realization, frozen 93c4379, same settings) for the departure readouts: adults out of a nest
2.01% of the night; departures before sunrise 0.46 of adult departures (males 0.25, lactating 0.73, other females 0.55;
median +8 min after sunrise), against G1's 0.53 (0.31, 0.85, 0.60; median −5 min).

**Against the predictions (§5).**
1. Prescriptions 44: held.
2. Moving speed in trips: males 0.787 m/s (0.74–0.84), other females 0.667 and lactating 0.692 (0.62–0.74), juveniles
   0.707 (0.55–0.72): held.
3. Movement phases: males 1.25 km/h, other females 1.16, lactating 1.13 (predicted 1.2–1.7: held for males, missed narrowly
   for females); below batesByrne2009's 1.91–2.21: held. Halts of 20 min or more rose (males 6.7 → 8.0 a day, the field's
   6.5; lactating 5.5 → 6.4, the field's 4.5): the faster the walk, the more of a phase the model's fixed stops take
   (climbing at the stylized `climbMps` 0.22 m/s is now 16–19% of adults' travel time; the departure wait two thirds of
   the standing).
4. Travel share in truth: males 0.150 → 0.098 (0.07–0.11): held; T-ACT-2 0.160 → 0.111 (0.08–0.12, below the band's
   floor): held.
5. T-RNG-4 1.59 → 2.43 km (1.7–2.4): missed by 0.03 (into the band's middle; the reference sat at its floor); true day
   ranges +36–49% for every adult class (5–40%): missed high (males 1.90 → 2.68 km, lactating 1.70 → 2.41, other females
   1.40 → 1.91, juveniles 1.92 → 2.86).
6. T-RNG-5 1.00 → 0.69 (inside the spread: z −1.8; distance 1.16 → 0.31, toward its band 0.3–0.6): held. T-ACT-4 +0.020
   (0.00–0.05): held. T-ACT-1 +0.014 (±0.02): held. T-ACT-3 0.087 (0.08–0.12): held. T-PTY-1 inside the spread: held.
   T-FOOD-4 +16% (0–25%): held.
7. Reserves of every class within ±1 SD of the reference: held. Nursing mothers eat 20 min more (302 → 322 min).
8. Night safety 2.42% (≤ 3.3%) and viability (no death): held.
9. Fitted sum +0.35 (z +0.4, inside noise; T-ACT-2's distance 0.09 included) and held-out −0.43 (z −0.4, inside noise):
   held.

Rows beyond 2 SD of the reference: T-FOOD-10 (departures before sunrise 0.67 against 0.50–0.59; distance 1.06 → 1.70):
every trip's rate rises when its walk takes less time, so at dawn the first trip beats the nest earlier (males leave 16
min earlier); and T-SOC-3 (grooming reciprocity among adult males 0.31 against 0.58–0.82, both seeds low: 0.29 and
0.32), a cost the stage did not predict and does not explain (more trips a day, +16% trees, may cut bouts before they are
returned; not diagnosed). Fruit share 0.80 (the reference's 0.76–0.80).

**Kill criterion (§5): none holds** (viable, held-out inside noise and lower, night safe, 44 prescriptions). G1 passes the
keep rule in quick mode: a provisional keep candidate. The diagnosis of G1 names no defect sized for the old speed (the
stops that grew are the fixed stops: climbing at a stylized speed, the departure wait, listening stops), so no
mechanism iteration is registered (§5: never a speed).

### 7.1 Replicate G1r (registered 4 October 2026 before its run; not an iteration)

G1 re-drawn with `rngSalt` 1 (the behaviour-free re-draw lever), bench and energy-diagnose only, same settings and frozen
code (0d97ab3), to see whether the two unpredicted single-row changes (T-SOC-3, T-FOOD-10) replicate before the
integrator's confirm. Expected (low confidence): T-FOOD-10 stays above the reference's range (a mechanism, above);
T-SOC-3 inside the reference's range if it was a draw, below it again if it is the walk.

**G1r results** (frozen 0d97ab3, clean; printed by the judge and `e2i_table.py` from the JSON):

```
quick, reference custom (4 runs), rows counted in all runs: fitted 15, held-out 15
  fitted             (15 rows) ref 1.23, 2.15, 0.84, 1.36 (mean 1.39, sd 0.55; used 0.69) | G1.json: 1.74, Δ +0.35, z +0.4 (inside noise) | G1r.json: 1.02, Δ -0.37, z -0.5 (inside noise)
  held-out           (15 rows) ref 5.77, 3.47, 4.78, 4.47 (mean 4.63, sd 0.95; used 1.26) | G1.json: 4.20, Δ -0.43, z -0.3 (inside noise) | G1r.json: 5.50, Δ +0.88, z +0.6 (inside noise)
  held-out w/o rare  (15 rows) ref 5.77, 3.47, 4.78, 4.47 (mean 4.63, sd 0.95; used 0.95) | G1.json: 4.20, Δ -0.43, z -0.4 (inside noise) | G1r.json: 5.50, Δ +0.88, z +0.8 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 1.06±0.21 | G1.json 1.70 (fail) | G1r.json 1.27 (fail)
   T-SOC-3   held-out ref 0.01±0.02 | G1.json 0.41 (fail) | G1r.json 0.00 (pass)

| Readout | ref runs | ref mean ± SD | G1.json | G1r.json |
| --- | --- | --- | --- | --- |
| T-RNG-4 | 1.487 / 1.722 / 1.572 / 1.569 | 1.587 ± 0.098 | 2.435 (z +8.7) | 2.026 (z +4.5) |
| T-RNG-5 | 0.929 / 0.806 / 1.188 / 1.089 | 1.003 ± 0.169 | 0.692 (z -1.8) | 1.222 (z +1.3) |
| T-ACT-1 | 0.378 / 0.369 / 0.374 / 0.371 | 0.373 ± 0.004 | 0.387 (z +3.7) | 0.383 (z +2.7) |
| T-ACT-2 | 0.151 / 0.156 / 0.162 / 0.172 | 0.160 ± 0.009 | 0.111 (z -5.7) | 0.112 (z -5.6) |
| T-ACT-3 | 0.094 / 0.092 / 0.094 / 0.090 | 0.092 ± 0.002 | 0.087 (z -2.4) | 0.097 (z +2.1) |
| T-ACT-4 | 0.391 / 0.358 / 0.372 / 0.368 | 0.372 ± 0.014 | 0.392 (z +1.5) | 0.434 (z +4.5) |
| T-FOOD-4 | 7.796 / 7.909 / 8.039 / 8.533 | 8.069 ± 0.325 | 9.397 (z +4.1) | 8.787 (z +2.2) |
| T-PTY-1 | 4.017 / 4.123 / 4.385 / 4.318 | 4.211 ± 0.170 | 4.339 (z +0.8) | 4.511 (z +1.8) |
| T-ACT-2 male | 0.160 / 0.175 / 0.190 / 0.183 | 0.177 ± 0.013 | 0.130 (z -3.6) | 0.115 (z -4.7) |
| T-ACT-2 female | 0.144 / 0.142 / 0.139 / 0.163 | 0.147 ± 0.011 | 0.096 (z -4.8) | 0.109 (z -3.6) |
| true day range km, adult male | 1.87 / 1.83 / 1.89 / 2.02 | 1.90 ± 0.08 | 2.68 (z +9.8) | 2.82 (z +11.7) |
| true day range km, female, other | 1.33 / 1.41 / 1.29 / 1.57 | 1.40 ± 0.12 | 1.91 (z +4.1) | 1.98 (z +4.7) |
| true day range km, female, lactating | 1.66 / 1.70 / 1.75 / 1.71 | 1.70 ± 0.04 | 2.41 (z +19.0) | 2.56 (z +23.0) |
| true day range km, juvenile 5–12 y | 1.80 / 1.96 / 1.87 / 2.03 | 1.92 ± 0.10 | 2.86 (z +9.1) | 3.15 (z +12.0) |
| true day range km, infant 2–5 y | 0.27 / 0.28 / 0.30 / 0.30 | 0.29 ± 0.01 | 0.42 (z +9.9) | 0.43 (z +10.4) |
| reserves %/day, adult male | 0.011 / -0.005 / -0.007 / 0.013 | 0.003 ± 0.010 | 0.010 (z +0.7) | 0.003 (z -0.0) |
| reserves %/day, female, other | 0.011 / 0.011 / -0.020 / 0.007 | 0.002 ± 0.015 | 0.005 (z +0.2) | 0.025 (z +1.5) |
| reserves %/day, female, lactating | 0.026 / 0.014 / -0.030 / 0.021 | 0.008 ± 0.025 | 0.010 (z +0.1) | 0.002 (z -0.2) |
| reserves %/day, juvenile 5–12 y | -0.001 / 0.020 / -0.040 / -0.008 | -0.007 ± 0.025 | 0.005 (z +0.5) | -0.057 (z -2.0) |
| reserves %/day, infant 2–5 y | 0.040 / 0.010 / -0.012 / 0.014 | 0.013 ± 0.021 | 0.011 (z -0.1) | 0.006 (z -0.3) |
| reserves %/day, infant 0.5–2 y | 0.013 / 0.004 / -0.034 / 0.037 | 0.005 ± 0.029 | 0.005 (z -0.0) | -0.019 (z -0.8) |
| eating min, adult male | 229 / 228 / 229 / 233 | 230 ± 2 | 235 (z +2.3) | 236 (z +3.1) |
| eating min, female, lactating | 299 / 302 / 306 / 300 | 302 ± 3 | 322 (z +6.7) | 317 (z +5.0) |
| fitted sum | 1.48 / 2.87 / 0.84 / 1.61 | 1.70 ± 0.85 | 1.99 (z +0.3) | 2.61 (z +1.1) |
| held-out sum | 7.13 / 3.47 / 4.78 / 4.92 | 5.08 ± 1.52 | 5.41 (z +0.2) | 6.15 (z +0.7) |
| prescriptions | 45 / 45 / 45 / 45 | 45 ± 0 | 44 | 44 |
| viability | True / True / True / True | | True (deaths 0, starvation 0) | True (deaths 0, starvation 0) |
| git | e7d8d8e d0 / e7d8d8e d0 / e7d8d8e d0 / e7d8d8e d0 | | 0d97ab3 d0 | 0d97ab3 d0 |
```

Against the registered expectation: T-SOC-3 is back in its band (0.63; per seed 0.76 and 0.50): G1's 0.31 was a draw.
T-FOOD-10 0.58, the top of the reference's range (0.50–0.59): G1's 0.67 was partly a draw; the direction (earlier first
departures) is not established. Also a draw: G1's T-RNG-5 0.69 (G1r 1.22). Replicated in both: T-ACT-2 0.111–0.112
(below its band; males 0.115–0.130, females 0.096–0.109), T-RNG-4 up (2.03–2.43 km, inside its band), true day ranges
+36–64% for every class (males 2.68–2.82 km), T-ACT-4 up (0.392–0.434), T-FOOD-4 up (8.8–9.4), eating up (mothers +15–20
min), every sum inside noise, viable, 44 prescriptions. Reserves: every class inside ±2 SD in both runs except juveniles
in G1r (−0.057 %/day, z −2.0; G1 +0.005).

## 8. Stage verdict

**`walkGait` 1 is a provisional keep candidate** (quick, two realizations against S21's four): it passes the keep rule in
both (viable, held-out inside noise, night safe in G1, 45 → 44 prescriptions) and removes the field copy that set every
walk and every trip's time. Recommended: a 5-seed confirm on the stack. What it changes, replicated: animals walk at the
speed their body sets (0.67–0.79 m/s while moving instead of 0.29–0.32), so the same decisions take less time; trips cost
less of a crown's rate, animals walk 40–60% farther a day (T-RNG-4 1.6 → 2.0–2.4 km, inside its band) and visit more
trees, and the time freed goes to feeding and rest. Costs: the travel share falls below its band (T-ACT-2 0.16 → 0.11);
juveniles' reserves fell in one of the two runs.

**What the speed copy set** (diagnosis, §2.1): every walk at 0.29–0.33 m/s, so 83–87% of adults' travel time was moving
slowly (the field's pauses walked); movement phases 2.4–2.8 times slower than in the source of the copy itself
(batesByrne2009) with the field's number of halts; walking 9–24% of a chosen trip's time, deciding the best tree option
in 11% of decisions.

**Open problems.** (1) The travel share below its band: the model's phases still run at 1.1–1.25 km/h against Sonso's
1.9–2.2 with more and longer halts (males 8.0 a day of 81 min against 6.5 of 60), and the field's travel share counts
movement within the canopy (villioth2025), which the model does not have; neither is a reason to slow walking. (2)
Climbing at the stylized `climbMps` 0.22 m/s (0.5 m/s cited for wild chimpanzees, secondary) is now 16–19% of adults'
travel time: the next speed to derive from the body. (3) Walking on fallback food at 0.3 × the walking speed (a design
multiplier) doubled with it (deferred, §6).

**Files.** Every run's JSON and log (G1, G1r, the four S21 walk-diagnose runs, S21q's rhythm run) and the table scripts (`walktab.py`, `e2i_table.py`, `report.sh`, `run-arm.sh`) are in `artifacts/validation/e2i/` of the e2i-walking worktree (gitignored), copied from the stage's scratch directory.
