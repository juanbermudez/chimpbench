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

## 2. Diagnosis (to be registered before its runs)

## 3. Sources

## 4. Mechanism

## 5. Predictions and kill criterion

## 6. Known defects
