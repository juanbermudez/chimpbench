# E3g pre-registration: why re-deciding adds trips

Status: skeleton committed at the start of the stage (4 October 2026; branch `e3g-redecide-trips`, from `track-e`
d8417b5), before any run and before any code change. Track E, stage E3g. Rule served: field values of behaviour are
targets to benchmark against, never inputs. No value, bonus or weight is added to hit a travel share, a day range, a
hunting rate or a feeding-tree count.

## 0. The problem

S28 = S27 + E3d's `redecideValue` 2 (a fresh choice when a need changes level or the light changes phase; `rgMaxAgeH`
and `continueBonus` out) passes the keep rule on 5 seeds (39 prescriptions on the corrected ledger), but against S27's
four confirm runs (e-stack2-confirm.md, "S28 results"):
- adult males walk 4.34 km a day (S27 3.34 ± 0.11); every class walks +0.8–1.0 km;
- adults' climbing cost +35–54%;
- feeding trees per day rise (T-FOOD-4 13.4 against 9.4 ± 0.1);
- hunts rise to 57 per community-year (T-HUN-1; S27 30.6 ± 8.3; band 5–25);
- T-RNG-4 3.58 (band top 3.5);
- other females', juveniles' and young infants' reserves fall faster (−0.082, −0.128, −0.167 %/day against −0.039,
  −0.086, −0.102);
- the fitted sum is worse beyond noise (z +2.4, through hunting).
Quick mode shows the same (S28q against the four S27q runs: males 2.81 → 4.02 km, climbing +25–67%, T-FOOD-4 9.3 →
14.0, T-HUN-1 26 → 50, T-RNG-4 2.26 → 3.56).

**Reading to test, not assume:** fresh choices at need-level and light-phase changes break off bouts and start trips
and hunts the animal would not have taken at the bout's natural end.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs): S28 against S27, quick mode (seeds 48 and 7, burn-in 30, 30 days),
   simulation truth. Re-decisions per adult-day by trigger (which need crossed which level; light phase); what was
   interrupted (feeding with crop and gut room left, rest, grooming, travel); what was chosen (the same act, another
   crown in view, a trip to a remembered tree, a hunt, other); the interrupted act's remaining value against the chosen
   option's at that moment; the outcome of trips and hunts started at re-decisions (fed at the target or not; kcal
   gained against kcal spent walking and climbing). Attribute S28's extra km, climbing, trees and hunts to triggers;
   name the term, with numbers.
2. **Mechanism** behind a new switch (0 = today; read with `redecideValue` 2), from first principles, only for what the
   diagnosis implicates. Every input sourced or tagged design; no weight chosen to hit a rate. If the diagnosis shows the
   extra trips are what the valuation says an animal should do, say so and stage nothing.
3. At most three iterations, each logged here and committed before its run; arms = S28 + the switch, quick mode,
   judged against the integrator's four S28 quick realizations (e-noise.md amendment 2) and read against the S27q group
   for the share of S28's cost recovered.

## 2. Diagnosis (step 1)

(Registered here, with the tool's readouts, before its runs.)

## 3. Field rows scored here: samples

(Written before any arm.)

## 4. Reference and judging (docs/staging/e-noise.md amendment 2, amendment 3's rare rows)

- Reference **S28** in quick mode (parameters `bench-run3/artifacts/validation/e/s27q/S28q-params.json`), run by the
  integrator once plus three re-draws (`rngSalt` 1, 2, 3) at bench-run3 28d249e (simulation code identical to this
  branch's start for S28), each with energy-diagnose (seeds 48, 7; burn-in 30, 30 days):
  `bench-run3/artifacts/validation/e/s27q/{S28q,S28q1,S28q2,S28q3}.json` and `…-energy.json`. Not re-run here.
- The **S27q group** (the costs to recover): `bench-run3/artifacts/validation/e/s27q/{S27q,S27q1,S27q2,S27q3}.json`
  and `…-energy.json`.
- Each arm (S28 + this stage's switch, same quick settings) against the S28q mean with the integrator's
  `judge_vs_reps.py quick custom` (REFS = the four S28q JSON): z = (arm − mean) ÷ (SD × √(1 + 1/n)), the registered quick
  SD or the group's own spread if larger; |z| > 2 is a result; with and without T-HUN-4, T-BRD-1 and T-IGE-3.
- Behaviour and energy against the S28q group's own spread (mean ± SD of its four runs) and against the S27q mean.
  Viability and night safety (adults out of a nest ≤ 3.3% of the night, T-RHY-5 ≤ 0.033) must pass. Prescriptions:
  `scripts/prescription-ledger.ts --count --params` (S27 41, S28 39 on the corrected ledger).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
