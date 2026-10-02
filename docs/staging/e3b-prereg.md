# E3b pre-registration: what stops a chimp going back to a tree it just fed in

Status: skeleton committed at the start of the stage (2 October 2026, branch `e3b-revisit`, from `track-e` 29202da),
before any run and before any code change. Track E, stage E3b. Rule served: field values of behaviour are targets,
never inputs. No weight is tuned to a revisit interval, a number of trees a day, a day range or a travel share.

## 0. The problem

- **The term.** A crown an animal has just fed in is devalued by `revisitW` 0.5 × exp(−Δt ÷ `revisitTauH` 12 h) for
  forage and travel (C6b, design, no source: "the fruit within reach has been taken"; candidates.ts `revisit`, the
  fed-tree list in execution.ts `cleanupPrevious`). It ignores how much fruit is left.
- **E5c's iteration 3** (S5 + `crownShare` as committed: this devaluation off, a crown it fed in worth the crop it
  believes left there (C7a's belief), the habitat-index crowding cost off, co-feeders costing their share of the bout)
  was viable and changed a lot at once: nursing mothers −0.114 → +0.015% of the store a day, juveniles −0.007 →
  +0.007; crown choices 11,436 → 15,940; own trips −22%, joined trips −53%; males' true path 2.54 → 1.77 km (T-RNG-4
  1.48, band 1.5–3.5); T-ACT-2 males 0.234 → 0.145; fitted better beyond noise (z −2.9, mostly hunting rows); held-out
  inside noise; feeders fell with crop (depletion). Two crop-blind terms changed together, so which one did what is
  unknown, and whether animals now return to the same crowns too soon (T-FOOD-6, revisit interval, held out: Taï 2–7
  days) was not measured.

## 1. Plan

1. **Diagnosis** (§2) on S5 in quick mode (seeds 48 and 7, 30 + 30 days), simulation truth, with diagnostic-only
   overrides that separate the two terms: D0 = S5; D1 = S5 with the revisit devaluation off alone; D2 = S5 with the
   habitat-index crowding off alone; D3 = both off (E5c's A3). Readouts registered in §2 before the runs.
2. **Mechanism** behind a new switch (0 = today), only for what the diagnosis implicates; inputs sourced or tagged
   design; no time-decay weight fitted to anything. The crowding question stays separate (a second switch only if
   the diagnosis gives it its own effect).
3. At most three iterations, each logged here and committed before its run; arms = S5 + the switch, quick mode,
   judged against the S5 quick reference (four realizations, e-noise.md amendment 2).

## 2. Diagnosis (to be registered before its runs)

(pending)

## 3. Field rows scored here: samples (sources opened; written before any arm)

(pending)

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **S5** (e-stack2-confirm.md, "S5 results"; 32 switches, `bench-run/artifacts/validation/e/s5/S5-params.json`),
  quick mode once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run 5911b36 (simulation code
  identical to this branch's start), each with `energy-diagnose` (seeds 48, 7; 30 + 30 days):
  `bench-run/artifacts/validation/e/s5q/{S5q,S5q1,S5q2,S5q3}.json` and `…-energy.json`. Not re-run here.
- Each arm against the reference mean: z = (arm − mean) ÷ (SD × √(1 + 1/n)); quick per-run SD fitted 0.69, held-out
  1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result;
  judged on rows scored in all runs, with and without T-HUN-4 and T-BRD-1 (the integrator's `judge_vs_reps.py`).
- Energy, travel and party readouts against the reference's own spread (mean ± SD of its four runs). Viability must
  pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S5: 77); a switch that removes a named rule
  must lower it.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

## 6. Results

(pending)

## 7. Known defects in the code under test

(pending; file:line)
