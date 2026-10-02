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

## 2. Diagnosis (step 1; registered 2 October 2026, 13:35, before its runs)

**What S5 changes in the paths of §0 (read at c7a4c75, field profile with S5's 32 switches).** The forage value of a
crown in view is `(1.6 h + 0.1)·(0.55 + 0.45·min(1, crop ÷ fruitValueRef))·tripWorth − d ÷ forageDistScaleM −
compete − rain·0.45 − territory·0.6 − core − revisit + fig + jitter (+ continueBonus 0.25 to the act in progress, −0.5
once finished)` (candidates.ts:331–342). Under S5 (`energyLedger`, `ledgerDrive`, `intakeValue` 1) `tripWorth` is the
share of the full intake rate a trip delivers: the bout's energy `E = min(crop ÷ (1 + feeders seen)·kcal, energy need,
the bout's gut room)` over walk + feeding time (intake.ts `treeIntake`), so for an animal in the crown it is 1 whatever
the crop and the feeders while E > 0. `fruitValueRef` is 1 unit in the field. `compete = feeders seen ×
crowdCompeteW 0.1 × (crowdScarcityRef 1.3 − habitat fruit index) × (0.5 for rank > 0.6)` (`crowdByShare` 0 in S5).
Own trips to remembered or known trees: `h·memTravelHungerW·(0.55 + 0.45·min(1, believed crop))·tripWorth(feeders 0)
− d ÷ travelDistScaleM − revisit − rain·0.4 − territory·0.8 − core + sociability·fruit index·0.1` (no feeders: the
share is never read). Joined trips (E5a): the leader's company + the trip valued with the feeders seen there. The gate's
patch test (rg.ts `patchPoorHere`) compares other crowns' `perHourInclWalk` with the full rate here. `revisitW` 0.5
(τ 12 h, C6b design): a crown the individual has just left after feeding is worth 0.5 less, whatever is left in it.
Choice: softmax at `rgTemperature` 0.164 over a bounded menu, each score with a uniform jitter of ±0.12
(`candidateJitterSpan` 0.24). Feeding takes `min(crop, want)` per tick (execution.ts `forageTick`, phenology.ts
`eatFruit`) and a bout ends below 0.02 units, so no feeder's intake per tick can fall because others feed there
until the crown is nearly empty; the depletion deficit recovers with τ ≈ 34 h (`patchRecoverPerDay` 0.7).

**Tool.** `scripts/crown-share-diagnose.ts` (new; its header defines every readout). Simulation truth on e-bench's world
(createWorld + 30-day burn-in + 30 days, seeds 48 and 7, rules policy, S5's params), with e-bench's party-follow team
set for the T-PTY-1 identity check (must equal `S5q.json` per seed) and its focal team set for the observer's feeding
scans. Run from a frozen detached checkout of the commit that adds this section. Smoke test (seed 48, 1 + 2 days, S5):
done before this registration, every readout filled. **Disclosure:** its two-day numbers were seen (crop effect absent,
the crop share rarely binding, revisit and the trips' sociability bonus the largest terms in the crop-selectivity
counterfactual, 95% of the feeders of a party in one crown); the expectations below are written knowing them.

**Readouts** (header of the script): crowns (feeders, crop, crown radius; terciles; R² on crop, ln crop and radius);
feeding scans (truth, the observer's count for every subject ≥ 12 y: party members in the same crown; R² on radius and
crop) and the focal observer's own feeding scans (T-PTY-2's patch part without its 4-month rule); crown choices
(chosen against the best rejected tree option, each score split into base, crop, trip, share, crowd, cont(inuation),
revisit, place (territory and core area), rain, social (the trips' sociability × fruit bonus; a joined trip's company),
jitter, other (residual, a check)); crop and co-feeding selectivity of the softmax over a decision's tree options, with
each term removed in turn; companions feeding in another crown at a crown choice; parties with ≥ 2 feeders; crown
occupancy episodes (crop fall per hour, how they end); intake per feeding tick against the full rate, by feeders.

**Reading rules (registered).**
- *R1, crop effect:* absent if R² of feeders on crop < 0.05 and feeders per occupied crown differ by < 0.2 between the
  top and bottom crop terciles (E5a's rule); the same for crown radius.
- *R2, does the crop share limit anyone:* "the share never binds" if it binds in < 10% of crown options, < 1% of
  feeding ticks are crop-limited and < 10% of occupancy episodes end with the crop below 0.06.
- *R3, the term that keeps the choice blind to the crop:* among the terms, the one whose removal raises the crop
  selectivity over all tree options the most is named if that rise is ≥ 0.01 fruit units and at least twice the next
  term's; if none qualifies, the crop term itself is named as too weak against the choice noise when its
  within-decision SD over crown options is below the jitter's (0.069).
- *R4, why companions feed in another crown:* when a companion's crown was an option and lost, the term with the
  largest mean |difference| (chosen − companion's crown) is named.

**Expected (low confidence unless stated).** R1: absent on crop and radius (moderate). R2: the share never binds (high
for intake per tick, from the code; moderate for the rest). R3: `revisit` or the trips' sociability bonus (low). R4:
`revisit` (low). Feeders per occupied crown 1.2–1.5 (moderate).

**Known defects in the code under test.** None found in the paths read. Noted, not changed (design choices of earlier
stages, part of what is diagnosed): `revisit` is crop-blind (C6b); own trips ignore the feeders at the goal (C7a);
`compete` reads the habitat index (C5a).

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
