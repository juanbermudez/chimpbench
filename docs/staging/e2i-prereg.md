# E2i pre-registration: how fast a chimp walks

Status: skeleton committed at the start of the stage (branch `e2i-walking`, from `track-e` 6871f3d), before any run and
before any code change. Track E, stage E2i. Rule served: field values of behaviour are targets, never inputs. No speed
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
