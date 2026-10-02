# E5c pre-registration: a crown's crop shared by its feeders

Status: skeleton committed at the start of the stage (2 October 2026, 13:25, branch `e5c-crown-share`, from `track-e`
c7a4c75), before any run and before any code change. Track E, stage E5 (emergence of fission–fusion). Rule served:
field values of behaviour are targets, never inputs. No weight is tuned to a party size, a feeding-party size or a
regression slope, and no rule ties party size or the number of feeders to crown size (that would encode the held-out
row T-PTY-2).

## 0. The problem

- **Field.** Feeding-party size rises with patch size (potts2011: R² 0.23 at Kanyawara, 0.80 at Ngogo; feeding parties
  of about 7–8), while monthly party size tracks habitat fruit only weakly (mitaniWatts2005, wakefield2008).
  Ecological-constraints principle: a crown's crop is shared by its feeders, so larger parties get less each
  (chapman1995, newtonFisher2000 [M]).
- **Model (E5a's diagnosis, on R + `followCarer`).** 1.31 feeders per occupied crown, the same in every crop tercile
  (R² 0.000); the median occupied crown holds 4.4 chimp-hours of feeding and 3.8 per feeder, so the crop is not the
  limit; parties (3.4) spread over several crowns within the 50-m chain.
- **The code (party-size-prereg §2, read on `main` before Track E).** The forage value caps a crown's crop at one fruit
  unit (`fruitValueRef`); for an animal already in a crown the trip fraction is 1 whatever the crop and however many
  feed there; the crowding cost reads the habitat-wide fruit index, not the crown; the intention gate's patch test reads
  the full fruit rate, not the animal's share. The party-size stage's `crowdByShare` (a cover multiplier on the forage
  worth) was null: crowns almost never held two feeders. What S5's switches change in these paths is checked in §2.

## 1. Plan

1. **Diagnosis first** (§2), on S5 in quick mode (seeds 48 and 7), simulation truth: feeders per occupied crown by crop
   and crown size; for each choice of a crown, the value of the chosen and of the best rejected crowns split into crop,
   share, trip and crowding terms; why party members within the 50-m chain feed in different crowns; how fast a
   crown's crop falls while it is fed in, and whether any animal's intake per minute ever falls because others feed
   there. Name the term that keeps the crop and the feeders apart, with numbers.
2. **Mechanism** behind a new switch (0 = today), only for the term the diagnosis implicates; every input sourced or
   tagged design; no tuned constant; no per-animal feeding area or crown capacity (no source, c7b).
3. At most three iterations, each logged here and committed before its run; arms = S5 + the switch, quick mode.

## 2. Diagnosis (to be registered before its runs)

(Filled in and committed before any diagnosis run.)

## 3. Field rows scored here: samples

(Filled in before the first run: sex, reproductive state, mass, method of every scored row.)

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **S5** (docs/staging/e-stack2-confirm.md, "S5 results"; 32 switches, parameters in
  `bench-run/artifacts/validation/e/s5/S5-params.json`), run by the integrator in quick mode once plus three re-draws
  (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run 5911b36 (simulation code identical to this branch's start),
  each with `energy-diagnose` (seeds 48, 7; 30 + 30 days): `bench-run/artifacts/validation/e/s5q/{S5q,S5q1,S5q2,S5q3}.json`
  and `…-energy.json`. Not re-run here.
- Each arm (S5 + this stage's switch, same quick settings) against the reference mean:
  z = (arm − mean) ÷ (SD × √(1 + 1/n)); quick per-run SD fitted 0.69, held-out 1.26, held-out without T-HUN-4 and
  T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result; judged on rows scored in all runs, with
  and without T-HUN-4 and T-BRD-1 (the integrator's `judge_vs_reps.py`).
- Energy, travel and party readouts against the reference's own spread (mean ± SD of its four runs). Viability must pass.
- Prescriptions: `scripts/prescription-ledger.ts --count --params` (S5: 77); a switch that removes a named rule must
  lower it.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)
