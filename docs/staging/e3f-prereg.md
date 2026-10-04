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

**Amendment 1 (4 October 2026, before any result of the diagnosis was read).** The crown readouts have no reference
spread: the script also runs on S27's three re-draws (`rngSalt` 1, 2, 3, the integrator's S27q1–S27q3 parameters), so
every crown readout is reported as the mean ± SD of four realizations. Frozen checkout 592cfe9 (the first launch at
6d3019e was stopped unread: its summary was quadratic in the number of visits; the fix computes the pooled mean once and
drops the `ate > 0` filter from "visits the crop holds", as §2 defines it).

### 2.1 Results (frozen checkout 592cfe9, clean; S27 and its re-draws by `rngSalt` 1–3; seeds 48 and 7, burn-in 30, 30 days; about 65–90 s per seed; printed by `crowntab.py` from the JSON in the stage's scratch directory, `runs/diag-S27*.json`)

| Readout (truth) | S27 / r1 / r2 / r3 | mean ± SD |
| --- | --- | --- |
| kcal per unit, drupe / fig | 4031 / 4031 / 4031 / 4031 | 4031 ± 0 |
| landscape: fruiting crowns per day (>= 0.06 units) | 2455 / 2456 / 2455 / 2456 | 2455 ± 0 |
| landscape: crop kcal of a fruiting crown, median (all) | 2053 / 2056 / 2056 / 2039 | 2051 ± 8 |
| landscape: crop kcal, median, figs | 3056 / 3056 / 3056 / 3056 | 3056 ± 0 |
| landscape: crop kcal, median, non-figs | 1895 / 1905 / 1906 / 1895 | 1900 ± 6 |
| landscape: crop kcal, p90 (all) | 3366 / 3357 / 3346 / 3366 | 3359 ± 10 |
| visit start: crop kcal, median (>= 5 y) | 1243 / 1168 / 1198 / 1158 | 1192 ± 38 |
| visit start: crop kcal, mean | 1447 / 1371 / 1406 / 1345 | 1392 ± 44 |
| visit start: crop kcal, median, figs | 2093 / 1692 / 1829 / 1646 | 1815 ± 201 |
| visit start: crop kcal, median, non-figs | 1094 / 1068 / 1092 / 1079 | 1083 ± 12 |
| visit start: crop kcal, median, small crowns | 932 / 926 / 922 / 923 | 926 ± 4 |
| visit start: crop kcal, median, large crowns | 1787 / 1471 / 1541 / 1463 | 1566 ± 152 |
| visit start: phenology crop kcal, mean | 2720 / 2646 / 2647 / 2602 | 2654 ± 49 |
| visit start: crop units, mean | 0.347 / 0.331 / 0.339 / 0.325 | 0.336 ± 0.010 |
| visits (>= 5 y) | 23994 / 23978 / 24262 / 23364 | 23900 ± 380 |
| visit length, median min | 19.0 / 19.0 / 19.0 / 19.5 | 19.1 ± 0.250 |
| visit length, mean min | 21.2 / 21.0 / 21.0 / 21.6 | 21.2 ± 0.278 |
| visit length, median min, adults >= 12 y | 18.5 / 18.3 / 18.3 / 19.0 | 18.5 ± 0.354 |
| kcal eaten per visit, mean | 142 / 142 / 141 / 144 | 142 ± 1 |
| kcal eaten per visit, median | 127 / 126 / 126 / 130 | 127 ± 2 |
| share of the starting crop eaten per visit | 0.143 / 0.149 / 0.144 / 0.152 | 0.147 ± 0.004 |
| feeders in the crown at a visit start | 1.699 / 1.676 / 1.723 / 1.624 | 1.680 ± 0.042 |
| bout room at start, kcal (mean) | 317 / 321 / 320 / 326 | 321 ± 3 |
| energy need at start, kcal (mean) | 1294 / 1312 / 1291 / 1263 | 1290 ± 20 |
| crop share below the bout room (crop binds) | 0.158 / 0.171 / 0.171 / 0.166 | 0.166 ± 0.006 |
| visits the starting crop holds, median | 8.729 / 8.210 / 8.505 / 8.015 | 8.365 ± 0.315 |
| feeders per occupied crown (crown-weighted) | 1.416 / 1.390 / 1.403 / 1.367 | 1.394 ± 0.021 |
| feeders per crown (feeder-weighted) | 1.814 / 1.763 / 1.799 / 1.716 | 1.773 ± 0.044 |
| share of occupied crown-minutes with one feeder | 0.692 / 0.708 / 0.704 / 0.721 | 0.706 ± 0.012 |
| feeders (crown-wt), crop tercile 1 | 1.452 / 1.424 / 1.452 / 1.404 | 1.433 ± 0.023 |
| feeders (crown-wt), crop tercile 3 | 1.373 / 1.360 / 1.348 / 1.311 | 1.348 ± 0.027 |
| episodes: minutes, median | 24.2 / 23.8 / 24.2 / 24.2 | 24.1 ± 0.250 |
| episodes: kcal eaten / crop at start | 0.264 / 0.268 / 0.267 / 0.266 | 0.266 ± 0.001 |
| episodes: visits per episode | 1.941 / 1.893 / 1.947 / 1.834 | 1.904 ± 0.052 |
| episodes: ended below 0.06 units | 0.159 / 0.173 / 0.164 / 0.164 | 0.165 ± 0.006 |
| crowns fed in: share fell below 0.06 units | 0.502 / 0.505 / 0.542 / 0.521 | 0.517 ± 0.018 |
| crowns fed in: share fell below 0.02 units | 0.318 / 0.327 / 0.333 / 0.315 | 0.323 ± 0.009 |
| crowns: kcal eaten / first phenology crop (window) | 3.023 / 3.275 / 3.492 / 3.709 | 3.375 ± 0.294 |
| bout end (>= 12 y): sated | 0.549 / 0.548 / 0.520 / 0.561 | 0.544 ± 0.017 |
| bout end: crown empty | 0.046 / 0.051 / 0.046 / 0.042 | 0.046 ± 0.004 |
| bout end: gut full | 0.038 / 0.029 / 0.040 / 0.038 | 0.036 ± 0.005 |
| bout end: party leaving | 0.087 / 0.086 / 0.088 / 0.074 | 0.084 ± 0.007 |
| bout end: care follow | nan / nan / nan / nan | nan ± nan |
| bout end: switch crown | 0.000 / 0.000 / 0.000 / 0.000 | 0.000 ± 0.000 |
| bout end: other decision | 0.280 / 0.285 / 0.306 / 0.286 | 0.289 ± 0.011 |
| kcal from crowns per day, adult male | 1567 / 1560 / 1565 / 1542 | 1559 ± 12 |
| kcal from crowns per day, female lactating | 1455 / 1432 / 1448 / 1465 | 1450 ± 14 |
| crown minutes per day, adult male | 215 / 215 / 216 / 213 | 215 ± 1 |
| crown visits per day, adult male | 10.6 / 10.3 / 10.8 / 10.2 | 10.5 ± 0.255 |

Other decisions that end a bout (29%): the rules reason is an interrupt in 49%, a need changing level 19%, the act's end 16%,
its age 10%, a light phase 6%; the next act is rest 25%, an own trip 20%, a pant-grunt 11%, a caller 7%, grooming 6%.
By class (sated / crown empty / gut full / party leaving): adult males 0.56 / 0.057 / 0.009 / 0.083, other females
0.62 / 0.035 / 0.038 / 0.062, nursing mothers 0.48 / 0.040 / 0.062 / 0.108. Crowns fed in: a median 16 visits and 2,556 kcal
eaten per crown over the 30 days (means of the four runs' medians); median 14–15 visits until a crown first falls below 0.06 units.

**What `fruitIntakePerH` decides (S27).**
1. **The energy of every crown and of every crop threshold.** One fruit unit is 4,031 kcal of drupes or 4,429 of figs
   (7.39 or 8.12 kcal/min × 60 ÷ 0.11). A fruiting crown holds a median 2,051 kcal (figs 3,056, non-figs 1,900; 90th
   percentile 3,359): 4.6 hours of an adult's feeding at the sourced 443 kcal/h. Capacities run from a median 1,572 kcal
   (*Celtis*) to 3,853 (*Ficus mucuso*). A crown below 242 kcal (0.06 units) is not seen as fruiting, below 161 kcal is
   forgotten, a bout ends below 81 kcal, an unseen crown is believed to hold 806 kcal. Every one of these scales as
   1 ÷ `fruitIntakePerH`; nothing else in the model sets a crown's energy.
2. **It does not set intake.** A visit lasts 19 min and takes 142 kcal at the sourced rate whatever the crop; adult
   males take 1,559 and nursing mothers 1,450 kcal a day from crowns.
3. **The crop rarely limits a bout, so crop and feeders stay apart.** Animals reach crowns already half emptied (crop
   at a visit's start 1,392 kcal on average against a phenology crop of 2,654) and a visit takes 15% of what is there; the
   crop share at arrival is below the bout's gut room in 17% of visits; 4.6% of bouts end with the crown empty, 54%
   sated, 3.6% with a full gut, 8.4% as the party leaves, 29% on other decisions. Feeders at once: 1.39 per occupied
   crown (70% of crown-minutes have one feeder), the same in poor and rich crowns (1.43 lowest crop tercile, 1.35
   highest).
4. **Depletion is real but slow, and recovery feeds the crowns.** An occupancy episode (24 min, 1.9 visits) takes 27% of
   the crop; half the crowns fed in fall below the visibility threshold within the 30 days (a third below 0.02 units),
   after a median 14–15 visits; over the window a crown yields 3.4 × its first phenology crop, so about two thirds of what
   crowns give comes from the design recovery (`patchRecoverPerDay` 0.7 of the deficit per day).

Field comparison (potts2011, research.md): patch residency 27 (Ngogo) to 46 (Kanyawara) minutes with feeding parties of
7.3–8.4, i.e. 3.3–6.5 chimp-hours, about 1,460–2,880 kcal at 443 kcal/h, per party visit; the model's occupancy episode
takes a median 203 kcal (1.9 visits). The model's median fruiting crown (2,051 kcal) holds about one such party visit.

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
