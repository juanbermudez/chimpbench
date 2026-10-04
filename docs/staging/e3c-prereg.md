# E3c pre-registration: where to eat, valued as an energy rate

Status: skeleton committed at the start of the stage (3 October 2026, 22:55, branch `e3c-forage-rate`, from `track-e`
37a2042), before any run and before any code change. Track E, stage E3c. Rule served: field values of behaviour are
targets, never inputs. No weight or scale is tuned to a travel share, a day range, a number of trees or a fruit share.

## 0. The problem

- **The weights under test (field profile, which e-bench runs; the brief quoted the compressed defaults).** Where to eat
  is chosen among a crown in view, the fallback food where the animal stands, an own trip to a remembered or
  community-known tree and a joined trip to a leader's goal, each in score units:
  - a crown in view: `(1.6 h + 0.1) × (0.55 + 0.45 × min(1, crop ÷ fruitValueRef)) × tripWorth − d ÷ forageDistScaleM`
    (candidates.ts:347–348; `forageDistScaleM` field 400 m, compressed 55: "tuned to T-ACT-2 and T-RNG-4 in stage C5a");
  - the fallback: `h × fallbackForageW × bestFallbackNear × leafWorth + 0.03` (candidates.ts:355; `fallbackForageW`
    field 0.45, compressed 0.65: "tuned in C5a against T-ACT-2 and T-RNG-4");
  - a trip: `h × memTravelHungerW × (0.55 + 0.45 × min(1, crop ÷ fruitValueRef)) × tripWorth − tripCost`
    (candidates.ts:373, 393, 456; `memTravelHungerW` field 1.25, compressed 0.95: "tuned to T-ACT-2 and T-RNG-4");
  - the crop shape 0.55 + 0.45 × min(1, crop ÷ `fruitValueRef`) (field 1 unit; design) on crowns and trips;
  - a hunt under `huntValue` (off in S9) also pays `dist ÷ forageDistScaleM` (candidates.ts:967).
- **Two more fitted or copied numbers, read before deciding their scope.** `fruitIntakePerH` (field 0.11 fruit units/h,
  compressed 0.055; "tuned in C5a") converts the ledger's kcal per feeding minute into crop units
  (energy.ts:593: one unit = 60 × kcal/min ÷ `fruitIntakePerH`), so it sets how many feeding hours a crown holds;
  `walkMps` (field 0.35 m/s, compressed 0.04; "from 2.7 km/day over ~21% of an 11.5 h day") is a copy of the day range
  over the travel share, used both for moving and for the walk time of every trip valuation (intake.ts:60,
  departure.ts:35, candidates.ts:670).
- **The currency the ledger already offers.** The energy an option can deliver per unit of time, net of the walk (the
  net cost of transport, sockol2007, already charged by the ledger per metre moved): the long-term average rate of net
  energy gain of optimal foraging theory (charnov1976; stephensKrebs1986).
- **E5c's lesson (e5c-prereg.md §6.1–6.2, §7).** Valuing a crown by the share of the day's need it covers, or by the
  rate at which it meets the need, cost nursing mothers 0.3–1.2% of the store a day, because dividing by the need makes
  the neediest value the same crop least. Here the two questions stay apart: how hungry the animal is decides whether
  to forage at all (the drive, E1e); where to forage is decided by the expected net rate, the same for every animal of
  a size and skill.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S9 in quick mode (seeds 48 and 7, 30 + 30 days), simulation
   truth: for foraging decisions, the terms of the chosen and the best rejected options (crop shape, distance penalty,
   fallback worth, memory worth, rain, territory, crowding), what each fitted weight contributes to the choice and to
   travel, and the realized net energy rate (kcal absorbed per minute of walking plus feeding, net of the walking cost)
   of chosen against rejected options. Reuse crown-share-diagnose (E5c) and revisit-diagnose (E3b) where they already
   read these terms. Name the terms that would change under a net-rate valuation, with numbers.
2. **Mechanism** behind a new switch (`forageRate`, 0 = today), from first principles (rate maximization: charnov1976,
   stephensKrebs1986; the walking cost sockol2007), only for the terms the diagnosis implicates. Every input sourced or
   tagged design; no fitted scale. If it removes `forageDistScaleM`, `fallbackForageW` or `memTravelHungerW`, the
   prescription count must fall accordingly.
3. At most three iterations, each logged here and committed before its run; arms = S9 + the switch, quick mode.

## 2. Diagnosis (step 1)

(Registered before its runs; to follow.)

## 3. Field rows scored here: samples

(To follow, before any arm.)

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **S9** (docs/staging/e-stack2-confirm.md, "S9 results"; parameters
  `bench-run/artifacts/validation/e/s9q/S9q-params.json`), run by the integrator in quick mode once plus three re-draws
  (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run 2bcbd33 (simulation code identical to this branch's start),
  each with `energy-diagnose` (seeds 48, 7; burn-in 30, 30 days): `bench-run/artifacts/validation/e/s9q/{S9q,S9q1,S9q2,
  S9q3}.json` and `…-energy.json`. Not re-run here.
- Each arm (S9 + this stage's switch, same quick settings) against the reference mean with the integrator's
  `judge_vs_reps.py`: z = (arm − mean) ÷ (SD × √(1 + 1/n)), quick per-run SD fitted 0.69, held-out 1.26, held-out without
  T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result; on rows scored in all runs,
  with and without T-HUN-4 and T-BRD-1, and without T-IGE-3 as well (unstable on few events).
- Energy, travel and party readouts against the reference's own spread (mean ± SD of its four runs). Viability must
  pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S9: 74); a switch that removes a named rule
  must lower it.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
