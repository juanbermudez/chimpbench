# E3h pre-registration: trips that find food

Status: skeleton committed at the start of the stage (branch `e3h-trip-beliefs`, from `track-e` 90aa294), before any run
and before any code change. Track E, stage E3h. Rule served: field values of behaviour are targets to benchmark against,
never inputs. No value, bonus or weight is added to hit a travel share, a day range or a feeding-tree count.

## 0. The problem

E3g (docs/staging/e3g-prereg.md §2.2, §7, §8), measured on S27 and S28 in quick mode: trips deliver 13–31% of the meal
they are valued at, and two thirds never feed at their target. Three causes were named (file:line at E3g's head 8a4d1d8):
1. A remembered crown's crop belief is the crop last seen (`x.treeCrop`, else 0.2; src/sim/candidates.ts trip offers),
   with no expectation of what the companions the animal left feeding there eat meanwhile: 62–84% of unfed trips that
   reach their target find it below 0.06 units.
2. An own trip that a departure nobody followed gives up (`departWait`, src/sim/execution.ts) closes 60–90 m from its
   target: two thirds of unfed own trips. On S31, E5f's `departValue` 2 turns such departures into walked trips alone.
3. A trip to a caller stops `joinCallStopM` (25 m) short and is never turned into feeding at the caller's crown (the
   arrival rule, src/sim/rg.ts ~354–366, converts trips to trees only): 3.5% of caller trips feed there.
So the valuation over-promises trips, and `redecideValue` (off the stack since the fallback to S31) multiplies the failed
trips.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S31 in quick mode (seeds 48 and 7, burn-in 30, 30 days),
   simulation truth: trips per adult-day by kind (remembered crown, crown in view, a companion's trip, a caller,
   departure), the share that feed at the target, why the rest do not (crown empty on arrival and what ate it: the
   companions seen there when the animal left, others; departure given up; caller trip stopping short; re-decided en
   route), the believed crop at departure against the crop on arrival, and the km and kcal each failure costs. Name the
   term, with numbers.
2. **Mechanism** behind a new switch (0 = today), from first principles, only for what the diagnosis implicates. Every
   input sourced or tagged design; no weight chosen to hit a rate. After the arms, one extra diagnostic arm (not a
   candidate): the best arm plus `redecideValue` 2.
3. At most three iterations, each logged here and committed before its run; arms = S31 + the switch, quick mode, judged
   against the integrator's four S31 quick realizations (e-noise.md amendment 2; rare rows per amendment 3).

## 2. Diagnosis (step 1)

(To be registered before its runs.)

## 3. Field rows scored here: samples

(To be written before any arm.)

## 4. Reference and judging

- Reference **S31** in quick mode, run by the integrator once plus three re-draws (`rngSalt` 1, 2, 3) at bench-run
  4111971 (simulation code identical to this branch's start for S31), each with energy-diagnose (seeds 48, 7; burn-in
  30, 30 days): `bench-run/artifacts/validation/e/s31q/{S31q,S31q1,S31q2,S31q3}.json` and `…-energy.json`; parameters
  `bench-run/artifacts/validation/e/s31q/S31q-params.json`. Not re-run here.
- Each arm (S31 + this stage's switch, same quick settings) against the S31q mean with the integrator's
  `judge_vs_reps.py quick custom` (REFS = the four S31q JSON): z = (arm − mean) ÷ (SD × √(1 + 1/n)); |z| > 2 is a
  result; with and without T-HUN-4, T-BRD-1 and T-IGE-3. Readouts against the reference's own spread (mean ± SD of its
  four runs). Viability must pass; night safety (adults out of a nest ≤ 3.3% of the night, T-RHY-5 ≤ 0.033) for any arm
  that changes when animals move. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S31 48 on the
  current ledger).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
