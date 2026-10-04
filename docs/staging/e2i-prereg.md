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

## 4. Mechanism

## 5. Predictions and kill criterion

## 6. Known defects
