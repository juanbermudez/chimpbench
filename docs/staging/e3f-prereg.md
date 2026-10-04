# E3f pre-registration: what a crown holds

Status: skeleton committed at the start of the stage (branch `e3f-crop-energy`, from `track-e` eea2d85), before any run
and before any code change. Track E, stage E3f. Rule served: field values of behaviour are targets, never inputs; no
value, bonus or weight is added or set to reach a feeding time, a travel share, a day range or a party size.

## 0. The problem

- `fruitIntakePerH` (field 0.11 fruit units per hour; class fitted, `calibrate: true`; its notes: tuned in C5a against
  T-ACT-2 and T-RNG-4; the prescription ledger counts it against T-ACT-1) is the last fitted constant on S27's feeding
  path. Under the energy ledger a feeding minute's energy comes from sourced rates (`plantKcalPerMin`; with
  `ledgerFoodEnergyFix` 7.39 kcal/min for drupes, 8.12 for figs, uwimbabazi2019 + simmen2017), so the intake rate in kcal
  does not depend on it: in execution.ts forageTick the units wanted per tick (`fruitIntakePerH` × tick × skill × size)
  times `fruitKcalPerUnit` (= kcal/min × 60 ÷ `fruitIntakePerH`, energy.ts:618) is kcal/min × 60 × tick × skill × size.
- What it still decides is **how much energy a crown holds**: a crop of q fruit units is worth q × kcal/min × 60 ÷
  `fruitIntakePerH` kcal (about 4,030 kcal per unit for drupes and 4,430 for figs on S27), and the crown loses q units
  only when that many kcal are eaten (`eatFruit`, phenology.ts:238; execution.ts:1036–1050). A crown's capacity in units
  (`maxFruit`: a species constant 0.45–1.0 × U(0.75, 1) × (crown radius ÷ species mean)², generation.ts:162–167, all
  design) times the phenology shape (0–1, phenology.ts:204–226) is converted to kcal by this fitted number.
- Every other reader on S27 converts between kcal and crop units with the same number: intake.ts `treeIntake`,
  `netRateShare` (E3c's net rate: a bout's energy E = min(crop ÷ (1 + feeders) × kcal per unit, the gut's room)),
  `needFruit`; departure.ts:18; huntvalue.ts:31; energy.ts `feedRate`. So the crop thresholds written in units have a
  kcal meaning set by it: a crown below 0.06 units (242 kcal) is no longer seen as fruiting and is forgotten below 0.04
  (perception.ts:187–203), a bout ends below 0.02 (81 kcal, execution.ts:1050), an unseen crown is believed to hold 0.2
  (806 kcal, candidates.ts:467, 544, 583; `UNKNOWN_CROP`).
- Earlier findings: E5c (a crown is valued for one gut-full, ~245 kcal against a ~2,000 kcal need; a crown holds 8–12
  feeder-bouts while 1.3 party members feed at once); E3b (a visit eats 11% of a crown). So the crop rarely binds a
  bout, and how long parties stay, how many feed together, how far they travel and how big parties get may rest on this
  number.

## 1. Plan

1. **Diagnosis** (§2, registered before its run), S27 in quick mode (seeds 48 and 7, burn-in 30, 30 days), simulation
   truth: each crown's crop in kcal at the start of each visit (by species group and crown size), kcal eaten per visit and
   per feeder, feeders per crown at once, visits to empty a crown, why bouts end, what the crop units are; name what
   `fruitIntakePerH` decides, with numbers.
2. **Sources** (§3; added to docs/research.md and docs/staging/e-sources.md first, as "Addendum: E3f crop energy"):
   crop sizes of Kibale fruit trees (fruit counts by DBH or crown size, fruit mass and energy by species), how long
   parties feed in one crown and how many feed together, how often crowns are left before they are empty.
3. **Mechanism** behind a new switch (0 = today), from first principles: a crown's crop expressed in energy from sourced
   inputs (fruit count × fruit mass × energy density by species and size, or a sourced crop-energy allometry), depleted
   by the kcal actually eaten, so no fitted depletion rate remains. Every input sourced or tagged design. **If no source
   gives crop energy within the source rules, the stage records that and stops: a design-tagged crop scale would only
   replace one fitted number by another and remove nothing.**
4. Arms: S27 + the switch, quick mode, against the integrator's four S27 quick realizations (bench-run3 28d249e:
   `S27q`, `S27q1`–`S27q3` by `rngSalt` 1–3, each with energy-diagnose), judged by e-noise.md amendment 2 with amendment
   3's rare rows (`judge_vs_reps.py quick custom`). At most three iterations, each logged here and committed before its run.

## 2. Step 1: diagnosis (registered 4 October 2026 before its run)

Script `scripts/crop-energy-diagnose.ts` (reads only; the world is e-bench's and energy-diagnose's for the same seed and
params: createWorld + burn-in + tickWorld, no observer; taps read only). S27's parameters (`S27q-params.json`), seeds 48
and 7, burn-in 30, 30 days. Definitions:

- **Feeding in a crown**: forage at a tree, phase 2 (in the crown), animals ≥ 5 y (revisit-diagnose's definition).
- **Visit**: an animal's consecutive ticks feeding in one crown; a return to the same crown after < 10 min joins the
  visit, after ≥ 10 min it is a new visit (the observer's T-FOOD-4 rule, janmaat2013b; as revisit-diagnose).
- **Crop units and kcal**: `fruitAt` (fruit units) and the phenology crop `cropTarget`; kcal = units × `fruitKcalPerUnit`
  for the tree's food (fig or drupe), today's conversion. Capacity = `maxFruit` (units, and kcal by the same factor).
  Species group: fig (`common === 'fig'`) or non-fig. Crown size: `tree.canopy` (crown radius, m), terciles over the crowns
  visited (pooled cut points), and by species.
- **Per visit**: minutes (last − first feeding tick + one tick); crop (units, kcal) and phenology crop at its first and last
  feeding tick; kcal the animal ate in that crown (energyTap 'eaten', drupe or fig, during the visit's feeding ticks);
  share of the starting crop eaten.
- **Per feeder**: the visit's kcal; also kcal from crowns per animal-day by class (energy-diagnose's four classes).
- **Feeders per crown at once**: at every 1-min sample in daylight (> 0.1), for each crown with ≥ 1 feeder: the number of
  feeders; crown-weighted mean (over occupied crown-samples) and feeder-weighted mean (the number a feeder feeds with,
  itself included), overall and by crop-kcal tercile of the crown at the sample.
- **Crown occupancy episodes**: a crown's continuous occupancy by ≥ 1 feeder at 1-min samples (a gap ≥ 10 min ends it):
  minutes, crop kcal at start and end, kcal eaten by all its feeders, distinct feeder-visits, mean and maximum feeders,
  ended with the crop below 0.06 units (no longer seen as fruiting) or 0.02 (empty).
- **Visits to empty a crown**: (a) crop kcal at a visit's start ÷ the pooled mean kcal per visit (how many such visits
  the crop holds); (b) per episode, its kcal eaten ÷ crop kcal at its start; (c) per crown over the window: the share
  of crowns fed in whose crop fell below 0.06 or 0.02 units while being fed, and visits until then.
- **Why a bout ends** (visits of animals ≥ 12 y closed inside the window; state at the last feeding tick, transition on
  the next tick): crown empty (crop < 0.02 units, execution.ts:1050); sated (hunger < 0.06, execution.ts:1049); gut full
  (foregut dry matter ≥ 0.95 of capacity); party leaving (none of these, next act a party follow or a joined trip);
  care follow (next act a care follow); other (with the rules decision reason, rgTap, and the next act).
- **Does the crop bind a bout**: at each visit's start, the crop kcal ÷ (1 + other feeders in the crown) against the
  animal's bout room (energy.ts `boutRoom` at its full fruit rate): share of visits where the crop share is smaller.
- **What `fruitIntakePerH` decides**: printed from the parameters: kcal per unit for drupes and figs, the unit thresholds
  in kcal, and every distribution above in units and kcal.

Smoke test: the script on S27 for 2 days (seed 48, burn-in 1) before the run.

## 3. Sources

(Pending: docs/research.md and docs/staging/e-sources.md, "Addendum: E3f crop energy".)

## 4. Samples of the field rows the arms are scored on

As opened for E1q, E2i and E2j (e1q-prereg.md §4; e2i-prereg.md §3; e2j-prereg.md §2): T-RNG-4 and T-RNG-5
(batesByrne2009, Budongo Sonso, 15 adults, unweighed, 5-min GPS or trail-grid fixes while travelling, focal follows ≥ 8 h;
males 2.7 ± 1.5 km, lactating 1.2 ± 0.8 km; T-RNG-4 also jang2019); T-ACT-1–3 (villioth2025, Budongo Waibira, 10 adult
males and 9 adult females, 7 lactating, unweighed, continuous focal follows from the night nest; travel includes arboreal
climbing and movement within the canopy; T-ACT-1 also uwimbabazi2019, 14 Kanyawara nursing mothers; T-ACT-2 also
amsler2010); T-ACT-4 (potts2011, Ngogo and Kanyawara monthly means, continuous focal, resting includes grooming; and
villioth2025); T-FOOD-4 (janmaat2013b, Taï, 5 adult females with offspring, 275 full days; normand2009, 2 females, 28 days);
T-FOOD-10 (janmaat2014, Taï, 5 adult females with offspring followed from nest to nest in fruit-scarce periods, 179 days,
unweighed). T-PTY-1 (e5a-prereg.md §1.1: wilson2012, Kanyawara 1992–2006, a community of a median 47 with 11 adult males
and 15 adult females, 5,527 party follows at 15-min scans, observers staying with the larger subgroup: 9.2 ± 7.0 per
follow; potts2011, Kanyawara and Ngogo 2005–2006 focal follows, feeding parties 8.39 and 7.29; band 3–9 scaled to the
model's communities, derivation undocumented). T-FOOD-2 (watts2012a, Ngogo diet 72% fruit; emeryThompson2020, Kanyawara
64%; feeding-time shares from focal and scan records, both sexes).

## 5. Known defects (file:line at eea2d85)

- candidates.ts:818 (`tripCost`'s feeding time `min(crop, need) ÷ fruitIntakePerH`) is not reached on S27:
  `intakeValue` is 1 by default, so `tripCost` returns before it (candidates.ts:816), and `forageRate` sets the trip cost
  to 0 (candidates.ts:470). Recorded; not a defect of S27's behaviour.
- execution.ts:1033's comment ("0.055 fruit units/h … ×4.4 … about half the day") describes the compressed timers, not the
  field ledger. Stale comment.
- The crop thresholds in fruit units (perception.ts:187–203: 0.06, 0.04, 0.2; execution.ts:1050: 0.02;
  candidates.ts:467/544/583 and `UNKNOWN_CROP`: 0.2; foraging.ts known-tree crops) are design values whose kcal meaning
  `fruitIntakePerH` sets.
