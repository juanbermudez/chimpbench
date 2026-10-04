# E3f pre-registration: what a crown holds

Status: complete (4 October 2026): diagnosis (§2.1), sources (§3), no mechanism (§5: no source gives the crop energy of
the model's crowns; recorded and stopped, no switch), a sensitivity of the fitted scale (§6). Skeleton committed at the
start of the stage (branch `e3f-crop-energy`, from `track-e` eea2d85), before any run and before any code change. Track E, stage E3f. Rule served: field values of behaviour are targets, never inputs; no
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
2. **Sources** (§3; added to docs/research.md and docs/staging/e-sources.md first, as "Addendum: E3f what a crown holds"):
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
   after a median 14–15 visits; over the window a crown yields 3.4 × its first phenology crop, so at least 70% of what
   crowns give comes from the design recovery (`patchRecoverPerDay` 0.7 of the deficit per day).

Field comparison (potts2011, research.md): patch residency 27 (Ngogo) to 46 (Kanyawara) minutes with feeding parties of
7.3–8.4, i.e. 3.3–6.5 chimp-hours, about 1,460–2,880 kcal at 443 kcal/h, per party visit; the model's occupancy episode
takes a median 203 kcal (1.9 visits). The model's median fruiting crown (2,051 kcal) holds about one such party visit.

**Amendment 2 (4 October 2026, after §2.1, before any run it adds; a sensitivity, not an arm and never adopted).** To
name what `fruitIntakePerH` decides in behaviour, not only in kcal: S27 with `fruitIntakePerH` 0.055 (every crown's
energy and every unit threshold ×2) and 0.22 (×0.5), quick e-bench plus crop-energy-diagnose, one realization each
(labels `K2` and `K05`), read against S27's four realizations. Nothing is fitted or chosen from it.

**Amendment 3 (4 October 2026, while K2's bench ran, before any result of K2 or K05 was read).** energy-diagnose is
added to the two sensitivity realizations (same parameters, seeds, burn-in and window), so the stage's table can show
true day ranges and reserve trends by class beside the reference's.

## 3. Sources (docs/research.md and docs/staging/e-sources.md, "Addendum: E3f what a crown holds")

research.md and e-sources.md were searched first. A research subagent of the stage (disjoint candidate list, the source
rules of the brief, about 25 minutes) fetched the open texts; the load-bearing passages were re-read here.

| Quantity a crown's crop energy needs | What exists (evidence) | For which model species |
| --- | --- | --- |
| Crop per crown, by size | Whole-cycle crops of 10 large Kanyawara fig trees, 228–2,052 kg wet weight, reconstructed from fallen figs plus each frugivore's removals; chimpanzees took 0–84.3% (wrangham1993 [M]); one *F. sansibarica* tree 1,146 / 56 / 472 kg in three cycles (chapman1992 [M], one tree). No crop by DBH or crown size; *Uvariopsis* crop on DBH reported as r² only (chapman1992) | *F. natalensis*, *F. sansibarica* (and *F. exasperata*, not modelled). **None of the six non-fig species (84% of the model's trees by species weight), nor *F. mucuso*** |
| Fruit mass | Fresh fig weight by species, *Mimusops* 3.1 g (wrangham1993 Table I [H]); fruit dimensions only for *Uvariopsis* and *Pterygota* (chapman1992) | three figs, *Mimusops* |
| Water content (fresh → dry) | No Kibale value; the registry's `waterFigFrac` / `waterFruitFrac` 0.75 are masi2015's gorilla fruits standing in [L] | — |
| Energy per g dry matter | Fig pulp 242.5 ± 45.7 kcal/100 g (nine species), *Mimusops* 289.6 (wrangham1993 Table II [H]); the ledger's own whole-fig and drupe energies per g eaten (E1h: 1.93 and 2.46 kcal/g) | all |
| Ripe share standing at once (the stock the model depletes) | Ripe fruit < 0.5% and mid-ripe 3–8% of a crown's fruit (houle2014, abstract [M]); no ripening or removal rate | — |
| Crop energy per crown volume | houleWrangham2021 (metabolizable energy per m³ of crown by depth, drupe and fig trees): **not verified** (publisher bot check) | would cover all |

**The fitted scale against the only measured crops** (`figcheck.py` from the diagnosis JSON and the registry; the model's
own dynamics: a crown's ripe stock relaxes to its phenology crop at `patchRecoverPerDay` 0.7 a day, so with no chimpanzee
feeding a fig crown ripens 0.7 × its capacity × 23 days of shape over its 30-day window; whole-fig energy 1.93 kcal per g
dry matter; water 0.75 [L]). A model *F. natalensis* or *F. sansibarica* crown of median capacity (3,455 kcal at
today's conversion; 7.1 kg wet standing at its peak) ripens 55,625 kcal, 115 kg wet, over a cycle (p10–p90 80–156 kg): the
ten measured crops are 2.0–17.8 times that, the single tree's three cycles 0.5–10.0 times; against the standing peak
alone, 32–287 times. Direction only: the measured trees were large, water content is a stand-in, and the model's
turnover (0.7 a day) is design, so the comparison changes with it.

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

## 5. Step 2: no mechanism (decided 4 October 2026, after §3)

**No source gives the crop energy of the model's crowns within the source rules.** A crown's energy needs its crop by
size for every species. The sources give whole-cycle crops of ten large fig trees of two model species (range only, no
central value, no size relation), and nothing for the six non-fig species that are 84% of the model's trees and most of
its drupe diet. Even for figs, the measured quantity is a cycle's total, while the model depletes a standing ripe stock;
turning one into the other needs the ripe share or the ripe-fruit turnover (no rate in any open text; houle2014's
abstract gives only < 0.5% ripe) and a water content (a stand-in [L]). A switch built on these would carry a design scale
for most crowns (the species capacities, 0.45–1.0 units, design) and a design turnover for the rest: it would replace
`fruitIntakePerH` by design numbers and remove nothing. By the brief's rule the stage records this and stops. No switch
is added; the plumbing written while the sources were read (a crown's kcal per unit threaded through every crop-to-kcal
conversion: intake.ts, candidates.ts, rg.ts, calls.ts, departure.ts, huntvalue.ts, execution.ts, foraging.ts, urgency.ts;
switch-off hash-identical on S27 and on the all-off field world) is withdrawn and stays in the branch's history (ed8c724,
b50680e; reverted in 34a28d1) for a later stage.

**What would unblock it.** houleWrangham2021's full text (metabolizable energy per m³ of crown, drupe and fig trees at
Kanyawara; free to read at the publisher, whose page asks a person to prove they are human) with the model's crown
radius would give every crown an energy; Valenta & Nevo 2021's Dryad table (fruit masses of wild Ugandan fruits, CC0)
would add fruit masses; Chapman & Chapman 1996 the share of *Mimusops* and *Uvariopsis* crops removed. All three need a
person's browser (the user's decision).

## 6. Sensitivity of the fitted scale (amendments 2 and 3; frozen checkout 592cfe9, clean; one realization each; printed by `final.py` and `crowntab.py` from the JSON in the stage's scratch directory, `runs/`)

K2: `fruitIntakePerH` 0.055 (every crown's energy and every unit threshold × 2); K05: 0.22 (× 0.5). Not arms: nothing
is adopted from them. A single readout's z is (value − mean) ÷ SD of the four S27 runs, descriptive only; the sums are
judged by e-noise.md amendment 2 (quick floors, amendment 3's rare rows).

Crowns (crop-energy-diagnose, simulation truth):

| Readout (truth) | S27 / r1 / r2 / r3 | mean ± SD | K2 (×2) | K05 (×0.5) |
| --- | --- | --- | --- | --- |
| kcal per unit, drupe / fig | 4031 / 4031 / 4031 / 4031 | 4031 ± 0 | 8062 (z +nan) | 2015 (z +nan) |
| landscape: crop kcal of a fruiting crown, median (all) | 2053 / 2056 / 2056 / 2039 | 2051 ± 8 | 4112 (z +253.7) | 1008 (z -128.4) |
| visit start: crop kcal, median (>= 5 y) | 1243 / 1168 / 1198 / 1158 | 1192 ± 38 | 2985 (z +47.0) | 590 (z -15.8) |
| visit length, median min | 19.0 / 19.0 / 19.0 / 19.5 | 19.1 ± 0.250 | 18.5 (z -2.5) | 18.5 (z -2.5) |
| visit length, median min, adults >= 12 y | 18.5 / 18.3 / 18.3 / 19.0 | 18.5 ± 0.354 | 18.8 (z +0.7) | 17.8 (z -2.1) |
| kcal eaten per visit, mean | 142 / 142 / 141 / 144 | 142 ± 1 | 142 (z -0.3) | 140 (z -1.9) |
| share of the starting crop eaten per visit | 0.143 / 0.149 / 0.144 / 0.152 | 0.147 ± 0.004 | 0.062 (z -19.9) | 0.273 (z +29.8) |
| crop share below the bout room (crop binds) | 0.158 / 0.171 / 0.171 / 0.166 | 0.166 ± 0.006 | 0.042 (z -21.5) | 0.341 (z +30.0) |
| visits the starting crop holds, median | 8.729 / 8.210 / 8.505 / 8.015 | 8.365 ± 0.315 | 21.0 (z +40.1) | 4.223 (z -13.1) |
| feeders per occupied crown (crown-weighted) | 1.416 / 1.390 / 1.403 / 1.367 | 1.394 ± 0.021 | 1.415 (z +1.0) | 1.371 (z -1.1) |
| feeders per crown (feeder-weighted) | 1.814 / 1.763 / 1.799 / 1.716 | 1.773 ± 0.044 | 1.822 (z +1.1) | 1.707 (z -1.5) |
| episodes: kcal eaten / crop at start | 0.264 / 0.268 / 0.267 / 0.266 | 0.266 ± 0.001 | 0.119 (z -109.6) | 0.469 (z +151.3) |
| crowns fed in: share fell below 0.02 units | 0.318 / 0.327 / 0.333 / 0.315 | 0.323 ± 0.009 | 0.048 (z -32.3) | 0.672 (z +41.0) |
| bout end (>= 12 y): sated | 0.549 / 0.548 / 0.520 / 0.561 | 0.544 ± 0.017 | 0.573 (z +1.6) | 0.393 (z -8.7) |
| bout end: crown empty | 0.046 / 0.051 / 0.046 / 0.042 | 0.046 ± 0.004 | 0.005 (z -11.2) | 0.184 (z +37.4) |
| bout end: gut full | 0.038 / 0.029 / 0.040 / 0.038 | 0.036 ± 0.005 | 0.034 (z -0.5) | 0.099 (z +12.7) |
| bout end: party leaving | 0.087 / 0.086 / 0.088 / 0.074 | 0.084 ± 0.007 | 0.087 (z +0.5) | 0.081 (z -0.4) |
| bout end: other decision | 0.280 / 0.285 / 0.306 / 0.286 | 0.289 ± 0.011 | 0.301 (z +1.0) | 0.242 (z -4.1) |
| kcal from crowns per day, adult male | 1567 / 1560 / 1565 / 1542 | 1559 ± 12 | 1565 (z +0.5) | 1509 (z -4.3) |
| kcal from crowns per day, female lactating | 1455 / 1432 / 1448 / 1465 | 1450 ± 14 | 1491 (z +2.9) | 1297 (z -11.0) |
| crown minutes per day, adult male | 215 / 215 / 216 / 213 | 215 ± 1 | 216 (z +0.6) | 207 (z -5.1) |

Field rows, day ranges, reserves and sums (e-bench, energy-diagnose):

<!-- final.py table -->

**Reading.**
- **Half the energy (K05) makes the crop bind.** The crop share at arrival is below the bout's gut room in 34% of visits
  (17%), 18% of bouts end with the crown empty (4.6%) and 10% with a full gut, two thirds of the crowns fed in are
  emptied below 0.02 units (a third). Animals feed and travel more, adult males' observed day range leaves its band,
  parties shrink, the fruit share falls and returns to a crown space out (T-ACT-1, T-ACT-2, T-RNG-4, T-PTY-1, T-FOOD-2,
  T-FOOD-6 in the table); nursing mothers take 153 kcal a day less from crowns. Sums inside noise.
- **Double the energy (K2) takes the crop out of nearly every bout** (crop binding 4%, crown empty 0.5%); adult males'
  observed day range falls to 1.7 km and the travel share to 0.10; held-out without the rare rows is worse beyond noise
  (z +2.1, through T-RNG-5).
- **Neither changes how many feed together or how long a visit lasts**: 1.42 and 1.37 feeders per occupied crown (1.39 ±
  0.02), visits of 18.5 min (19.1), 140–142 kcal per visit. The crown's energy acts through depletion: how far animals
  travel, how parties split, how much mothers eat; co-feeding stays E5c's open problem.

## 7. Verdict

**No switch; the stage records and stops (§5).** Under the ledger `fruitIntakePerH` is the energy scale of every crown
(one unit = 4,031 kcal of drupes, 4,429 of figs; a median fruiting crown 2,051 kcal) and of every crop threshold, not an
intake rate. Through depletion it sets how far animals travel and how parties split (halving it pushes males' day range
out of its band and shrinks parties; doubling it shortens day ranges and worsens held-out through T-RNG-5), not how
many feed together. No open source gives the crop of the model's crowns: whole-cycle crops of ten large Kanyawara fig
trees (2–18 × what a model fig crown ripens per cycle at the design turnover), nothing for the non-fig species that are
84% of the trees. `fruitIntakePerH` stays; prescriptions 42 (unchanged).

## 8. Known defects (file:line at eea2d85)

- candidates.ts:818 (`tripCost`'s feeding time `min(crop, need) ÷ fruitIntakePerH`) is not reached on S27:
  `intakeValue` is 1 by default, so `tripCost` returns before it (candidates.ts:816), and `forageRate` sets the trip cost
  to 0 (candidates.ts:470). Recorded; not a defect of S27's behaviour.
- execution.ts:1033's comment ("0.055 fruit units/h … ×4.4 … about half the day") describes the compressed timers, not the
  field ledger. Stale comment.
- The crop thresholds in fruit units (perception.ts:187–203: 0.06, 0.04, 0.2; execution.ts:1050: 0.02;
  candidates.ts:467/544/583 and `UNKNOWN_CROP`: 0.2; foraging.ts known-tree crops) are design values whose kcal meaning
  `fruitIntakePerH` sets.
- Valuations convert every crown's crop at the drupe values (intake.ts:66 and :91, `fruitKcalPerUnit(P, false)` and the
  drupe rate), while feeding uses the fig values in a fig crown (execution.ts:1036): a fig crown is valued at 4,031 kcal
  per unit and 7.39 kcal/min instead of 4,429 and 8.12. The bout's time (energy ÷ rate) is the same either way; only the
  energy against the walk's cost differs (about 10%). Recorded, not changed (no switch in this stage).

## 9. Open problems

1. **A sourced crown energy.** houleWrangham2021 (metabolizable energy per m³ of crown, drupe and fig trees, Kanyawara)
   with the model's crown radius would give every crown an energy; Valenta & Nevo 2021 (Dryad, fruit masses) and
   Chapman & Chapman 1996 (crop shares removed) would check it. All need a person's browser.
2. **The ripe stock's turnover.** The design recovery (`patchRecoverPerDay` 0.7 of the deficit a day) supplies at least
   70% of what crowns give over a month, and any whole-cycle crop source can only become the standing ripe stock the
   model depletes through it (houle2014: ripe fruit under 0.5% of a crown's fruit at a time). It is the next unsourced
   number on the feeding path, with an effect of the same order as the crop scale.
3. **Co-feeding.** At half and double the crowns' energy, 1.4 animals feed per occupied crown: what makes a party feed
   together is not in the crop (E5c's finding, now at both ends of the scale).

## 10. Merge and final checks

(Pending.)
