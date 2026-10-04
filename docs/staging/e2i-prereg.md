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

## 3. Sources

## 4. Mechanism

## 5. Predictions and kill criterion

## 6. Known defects
