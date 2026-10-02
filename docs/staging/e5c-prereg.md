# E5c pre-registration: a crown's crop shared by its feeders

Status: complete (2 October 2026, 14:15): three iterations, no switch kept (§7). Skeleton committed at the start of the
stage (13:25, branch `e5c-crown-share`, from `track-e` c7a4c75), before any run and before any code change. Track E, stage E5 (emergence of fission–fusion). Rule served:
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

### 2.1 Diagnosis results (run-dd2ecc5, clean; seeds 48 and 7, 30 + 30 days; simulation truth)

Generated by `artifacts/validation/e5c/diag_table.py` from the tool's JSON (local, gitignored).

- **Identity:** T-PTY-1 per seed 3.584, 3.099 (e-bench 3.584, 3.099).
- **R1, crop effect:** 25891 occupied-crown scans; feeders per occupied crown 1.308 (0.780 hold one); by crop tercile 1.312 / 1.336 / 1.277 (cuts [0.39, 0.567]), by radius tercile 1.278 / 1.314 / 1.334 (cuts [5.04, 5.87] m); R² on crop 0.000, ln crop 0.000, radius 0.002. Median occupied crop 0.479 units = 4.45 chimp-hours (3.82 per feeder); crops above fruitValueRef 0.023.
- Feeding scans (truth, the observer's count for every subject ≥ 12 y): 27988 scans, mean 1.791; by radius tercile 1.739 / 1.769 / 1.866; R² on radius 0.003, on crop 0.001. Focal observer's own feeding scans: 1766, mean 1.777, R² on radius 0.010.
- **R2, does the share limit anyone:** the share binds in 0.029 of crown options (the crop alone 0.008); crop-limited feeding ticks 0.000 / 0.000 / 0.000 (1 / 2 / 3+ feeders); intake per tick ÷ full rate 0.946 / 0.974 / 0.983; 12423 occupancies, median 28 min, crop 0.490 → 0.427 (0.110 eaten), falling 0.103 units/h (by mean feeders: 1-1.5: 0.096; 1.5-2.5: 0.178; 2.5-99: 0.325); ended below 0.06: 0.015, below 0.02: 0.004.
- **R3, crop selectivity** (E[crop of the pick] − mean crop, softmax over the tree options of a decision; 110210 decisions): actual 0.008 units; with each term removed: −crop -0.014, −trip 0.013, −share 0.008, −crowd 0.009, −cont 0.011, −revisit 0.015, −place 0.009, −rain 0.008, −social 0.012, −jitter 0.010, −other 0.006. Crowns in view only (35790): actual 0.006; −crop -0.013, −trip 0.005, −share 0.006, −crowd 0.006, −cont 0.006, −revisit 0.019, −place 0.006, −rain 0.006, −social 0.006, −jitter 0.006, −other 0.005. Within-decision SD over crown options: base 0.000, crop 0.038, trip 0.042, share 0.000, crowd 0.014, cont 0.037, revisit 0.129, place 0.001, rain 0.000, social 0.000, jitter 0.057, other 0.060.
- Co-feeding selectivity (E[feeders seen at the pick] − mean): all tree options 0.119 (−crowd 0.148, −social 0.015); crowns in view 0.000 (−crowd 0.042).
- Choices, a crown in view chosen (11122): chosen − best rejected, mean base 0.122, crop 0.065, trip 0.033, share 0.000, crowd -0.015, cont 0.056, revisit -0.028, place -0.009, rain -0.001, social -0.071, jitter -0.023, other -0.001; chosen has the larger crop 0.559; crop 0.501 vs 0.458; distance 10 vs 156 m; rejected kinds {'crown': 1858, 'trip': 7661, 'join': 1603}.
- Choices, crown against crown (1858): chosen − best rejected, mean base 0.000, crop 0.048, trip 0.020, share 0.000, crowd -0.003, cont 0.033, revisit 0.055, place 0.000, rain 0.000, social 0.000, jitter 0.022, other -0.006; chosen has the larger crop 0.676; crop 0.543 vs 0.443; distance 12 vs 18 m; rejected kinds {'crown': 1858, 'trip': 0, 'join': 0}.
- Choices, an own trip chosen (13536): chosen − best rejected, mean base -0.034, crop -0.004, trip -0.003, share 0.000, crowd 0.004, cont 0.004, revisit 0.012, place 0.003, rain 0.000, social 0.010, jitter 0.043, other -0.002; chosen has the larger crop 0.547; crop 0.484 vs 0.455; distance 200 vs 168 m; rejected kinds {'crown': 3257, 'trip': 10155, 'join': 124}.
- **R4, companions:** 6923 crown choices while a party member fed in a crown: the companion's crown taken 0.372; otherwise (4347) it was an option 0.727, in view 0.795; mean |chosen − companion's crown|: base 0.102, crop 0.060, trip 0.051, share 0.001, crowd 0.067, cont 0.040, revisit 0.195, place 0.008, rain 0.000, social 0.036, jitter 0.090, other 0.065; signed: base -0.102, crop -0.018, trip -0.025, share 0.001, crowd 0.067, cont 0.031, revisit 0.192, place 0.002, rain 0.000, social 0.036, jitter 0.067, other -0.064.
- Parties with ≥ 2 feeders: 6481 scans; crowns per party 1.224; share in the party's largest crown group 0.908; crowns 30 m apart (median); a feeder outside that crown had it in view 0.662.
- Deaths [{}, {}]; living [[49, 49], [49, 49]].

**Energy at the options** (the readout added at 94e4926, measurement only, on the four S5 realizations: S5q and its
re-draws, same simulation code; mean of the four runs' medians and shares; `crown_ref.py`):

| Option | energy need (kcal, median) | bout's gut room (kcal, median) | crop share (kcal, median) | feeders seen | gut room < need | crop alone < need | share < need |
| --- | --- | --- | --- | --- | --- | --- | --- |
| crown | 2014 | 245 | 1486 | 0.37 | 0.998 | 0.584 | 0.678 |
| trip | 1813 | 207 | 1758 | 0.00 | 0.997 | 0.526 | 0.526 |
| join | 1823 | 191 | 524 | 1.78 | 0.999 | 0.639 | 0.940 |

**Reading by the registered rules.**
- **R1:** the crop effect is **absent** on crop and on crown radius (R² 0.000 and 0.002; terciles 1.31 / 1.34 / 1.28).
- **R2:** **the share never binds**: 2.9% of crown options, no crop-limited feeding tick at any number of feeders (intake
  per tick 0.95–0.98 of the full rate whether alone or with three or more), and 1.5% of occupancies end with the crop
  below 0.06. An occupancy (median 28 min, 1.3 feeders) eats 11% of the crop; a crown loses 0.10 units an hour with one
  feeder and 0.33 with three, and recovers with τ ≈ 34 h.
- **R3:** no single term's removal raises the crop selectivity over all tree options by 0.01 units (largest: `revisit`
  +0.007, `trip` +0.005, `social` +0.004), so by the rule **the crop term itself is named as too weak against the choice
  noise**: its within-decision SD over crown options is 0.038 against the jitter's 0.057 (0.069 nominal) and the
  crop-blind `revisit`'s 0.129. (Over crowns in view alone, `revisit` +0.013 would qualify; not the registered statistic.)
- **R4:** when a companion fed in another crown, the animal took that crown 37% of the time; otherwise that crown was an
  option 73% of the time and lost mostly on **`revisit`** (mean |difference| 0.195; the animal had just fed there), then the
  drive base (0.102: the chosen option was usually an own trip), the jitter (0.090) and the habitat-index crowding (0.067).

**The term that keeps the crop and the feeders apart.** The energy a crown is valued for is one gut-full: in
`treeIntake` E = min(share, need, the bout's gut room), and the gut room (median 245 kcal) is below the energy need
(median ~2,000 kcal) at 99.8% of crown options, while the crop alone is below the need at 58% and the share at 68%
(94% at a leader's goal, where 1.8 others are seen). So E is the gut room and neither the crop nor the feeders enter it;
what is left of the crop enters only through the design shape 0.55 + 0.45·min(1, crop) (spread 0.038 within a decision,
below the choice noise), and the habitat-index crowding cost prices a co-feeder the same in every crown (it is the only
term that lowers co-feeding among crowns in view: removed, co-feeding selectivity 0 → +0.042). Physically nothing ties
feeders to the crop either: an occupancy eats a tenth of it. Party members do co-feed when several feed at once (91% of
the feeders of a party in one crown), so the 1.3 feeders per crown are the party members that happen to be feeding, and
the crop decides neither how many arrive nor how long they stay.

**Reference spread of the crown readouts** (the four S5 realizations; `crown_ref.py`):

| Readout (truth unless stated) | S5 (mean ± SD of 4) |  |
| --- | --- |
| feeders per occupied crown | 1.310 ± 0.008 |  |
| … crop tercile 1 | 1.315 ± 0.011 |  |
| … crop tercile 2 | 1.331 ± 0.014 |  |
| … crop tercile 3 | 1.284 ± 0.005 |  |
| top − bottom crop tercile | -0.031 ± 0.011 |  |
| R² feeders on crop | 0.000 ± 0.001 |  |
| R² feeders on crown radius | 0.002 ± 0.001 |  |
| FPS per bout (potts2011) | 2.197 ± 0.060 |  |
| R² ln FPS on ln crop | 0.001 ± 0.001 |  |
| R² ln FPS on ln radius | 0.005 ± 0.002 |  |
| observer feeding scans: R² on radius | 0.010 ± 0.011 |  |
| crop selectivity (units) | 0.007 ± 0.001 |  |
| share binds (crown options) | 0.026 ± 0.004 |  |
| chosen kind: join | 11382.250 ± 603.289 |  |
| chosen kind: trip | 13606.000 ± 91.075 |  |
| chosen kind: crown | 11435.750 ± 221.750 |  |
| parties ≥2 feeders: share in one crown | 0.909 ± 0.006 |  |
| occupancy minutes (median) | 28.000 ± 0.000 |  |
| crop eaten per occupancy | 0.110 ± 0.003 |  |

**Reference spread of the e-bench rows and energy readouts** (`S5q*.json`, `S5q*-energy.json`; `bench_ref.py`;
reserve slopes are the OLS change of the daily mean reserves ÷ store, % per day):

| Readout | S5 (mean ± SD of 4) |  |
| --- | --- |
| T-PTY-1 | 3.310 ± 0.168 |  |
| T-ACT-1 feeding, males | 0.383 ± 0.005 |  |
| T-ACT-1 feeding, females | 0.395 ± 0.011 |  |
| T-ACT-2 travel, males | 0.234 ± 0.012 |  |
| T-ACT-2 travel, females | 0.197 ± 0.012 |  |
| T-FOOD-2 fruit share | 0.780 ± 0.015 |  |
| T-FOOD-4 trees per day | 7.517 ± 0.437 |  |
| T-RNG-4 male day range (observer, km) | 2.448 ± 0.123 |  |
| true path, adult males (km/day) | 2.544 ± 0.049 |  |
| true path, lactating (km/day) | 2.347 ± 0.102 |  |
| true path, other females (km/day) | 2.137 ± 0.087 |  |
| true path, juveniles 5–12 y (km/day) | 2.490 ± 0.079 |  |
| reserves ÷ store, lactating (mean level) | -0.100 ± 0.007 |  |
| reserves ÷ store, juveniles 5–12 y (mean level) | -0.059 ± 0.003 |  |
| eating min, lactating | 287.620 ± 0.956 |  |
| reserves, lactating (% of store per day, OLS) | -0.114 ± 0.026 |  |
| reserves, juveniles 5–12 y (% per day) | -0.007 ± 0.014 |  |
| reserves, adult males (% per day) | 0.005 ± 0.007 |  |
| reserves, other females (% per day) | 0.020 ± 0.014 |  |
| prescriptions | 77, 77, 77, 77 |  |
| viability | pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation) |  |

### 2.2 Field rows scored here: samples (sources opened; written before any arm)

| Row | Source (read) | Sample, method (quoted where it decides the readout) | Value |
| --- | --- | --- | --- |
| T-PTY-2 (patch part; held out, needs ≥ 4 months: "insufficient" in quick mode) | potts2011, author copy (Harvard DASH deposit read through its Wayback `id_` capture; the live host shows a WAF challenge and was not used) [H] | Kanyawara 2006 (961 h) and Ngogo 2005–06 (1,059 h); continuous focal follows of adult males, cycling females and pregnant or lactating females, each "one full feeding bout and one full travel bout", focal effort rotated; mass not reported. FPS = "the maximum number of independently-feeding chimpanzees, including the focal individual, co-feeding in a given patch during a particular feeding bout"; a patch = "an aggregation of food items that allowed uninterrupted feeding or foraging movements by individuals or parties ... Generally, this was a single tree"; size = "its diameter at breast height (DBH)"; "simple linear regression with ln-transformed data"; Figure 4's axis reads "ln average feeding party size" | R² 0.801 Ngogo, 0.227 Kanyawara; FPS 7.29 (1–40) Ngogo, 8.39 (1–32) Kanyawara; CV 1.01 / 0.836 |
| T-PTY-2 (habitat part) | mitaniWatts2005 (FT, as research.md); wakefield2008 | Ngogo 1999–2003, 24 months, daily maximum male party; monthly mean party size | R² 0.05; not correlated |
| T-PTY-1 | wilson2012 (FT), potts2011 | as E5a §1.1: Kanyawara party follows (5,527, 35,083 h), all individuals at 15-min scans; mass not reported | 9.2 ± 7.0 per follow |
| T-ACT-1, T-ACT-2 | villioth2025 (FT, e-field-audit §2.3) | Budongo Waibira 2016–17, 10 males and 9 females (7 lactating), continuous focal, 491 h; feeding = all food handling, picking and ingesting; movement within the canopy scored as travel; mass not reported | feeding 0.36 / 0.37, travel 0.21 / 0.20 (M / F) |
| T-FOOD-2 | watts2012a, emeryThompson2020 | Ngogo 1995–2010, 125 months, focal + 15-min scans; Kanyawara 1994–2018, 240,601 feeding scans | fruit 72.1%, 64.0% of feeding |
| T-FOOD-4 (held out, compromised) | janmaat2013b, normand2009 | Taï: 5 adult females, 275 full-day follows; two females over 28 days | 7.14 trees/day; 14.0 and 18.1 |
| day ranges (truth) | batesByrne2009 (T-RNG-4) | Budongo Sonso 2002–03, 8 males, GPS every 5 min while travelling | 2.7 ± 1.5 km/day |
| reserves (truth) | none scored by e-bench | staged T-ENE rows (e-targets.patch.json); judged against the reference's own spread | — |

**Readouts the predictions need** (each defined in the header of its tool; smoke-tested before any arm):
- *FPS per bout* (crown-share-diagnose `boutsFPS`): potts2011's definition applied in simulation truth to every feeding
  bout of every animal ≥ 12 y (the focal's consecutive minutes in one crown; feeders ≥ 5 y as "independently-feeding";
  the maximum over the bout, itself included); patch size = crown radius (the model has no DBH) and the crop at the
  bout's start; R² of ln FPS on ln radius and on ln crop, per bout and with ln FPS averaged per crown. Smoke-tested at
  d23cd90 (switch off).
- *Feeders per occupied crown, terciles and R²* (crowns), *crop selectivity*, *chosen kinds*, *parties with ≥ 2 feeders*
  (crown-share-diagnose; registered in §2).
- *The observer's feeding scans* (src/field/protocols.ts scan: focal feeding in a crown, party members feeding in the
  same crown, crown radius): T-PTY-2's patch part without its 4-month rule. **It differs from potts2011** in three ways:
  15-min scans instead of the maximum per focal feeding bout, crown radius instead of DBH, and a linear R² instead of
  ln–ln. Staged scorer fix (not applied; a held-out row, so a protocolLog entry and a new freeze are the user's
  decision): score T-PTY-2's patch part per focal feeding bout as potts2011 defines FPS, ln–ln. Under the 90-day cap the
  row stays "insufficient"; the truth readout above is reported instead.
- *T-PTY-1, T-ACT-1, T-ACT-2, T-FOOD-2, T-FOOD-4* (e-bench rows), *true day ranges and reserve slopes* (energy-diagnose
  ground km and the OLS slope of daily reserves ÷ store, as the integrator's tables).

**Known defects deferred** (file:line): none in the paths changed. Noted: crown-share-diagnose counts crop-limited ticks
from the crop left after the tick (an upper bound); `revisit` is crop-blind (candidates.ts `revisit`, C6b design) and is
left unchanged in iteration 1.

## 3. Mechanism (step 2): `crownShare`, iteration 1 (registered 2 October 2026, 14:00, before any run of it)

**Principle.** Ecological constraints: a crown's crop is shared by its feeders, so larger parties get less each
(chapman1995, newtonFisher2000 [M]); a forager values a patch by what it gains there over the time it costs
(charnov1976 [M as applied]). The diagnosis (§2.1) names the term that keeps the crop and the feeders apart: the energy
a crown is valued for is one gut-full (the bout's gut room, ~245 kcal, below the ~2,000 kcal need at 99.8% of crown
options), so neither the crop nor the feeders enter it, and the crop is left to a design shape whose spread is below the
choice noise; the habitat-index crowding cost prices a co-feeder the same in every crown.

**Change (switch `crownShare`, 0 = today; acts only with `energyLedger`, `ledgerDrive` and `intakeValue` 1, as in S5).**
Every crown valuation (a crown in view; an own trip to a remembered or known tree; a leader's goal on a joined trip, E5a's
`destWorth`) weighs the food the animal expects to eat there:
- cover = min(believed crop × the ledger's kcal per fruit unit (figs or drupes) ÷ (1 + the feeders it sees there),
  its energy need) ÷ its energy need, with the need of E1e (`energyNeed`: the energy needed before its next chance to feed;
  0 when it needs none). The believed crop is what it already uses: the crop in view, else its memory of the crown, else
  the community's expectation, else 0.2 (C7a). Feeders seen: in the crown (in view), feeding or going there (a leader's
  goal, as E5a), none for a tree out of view.
- worth = drive × cover × tripWorth, where drive is unchanged (1.6 h + 0.1 in view, h × `memTravelHungerW` on trips)
  and tripWorth is unchanged (the C13b rate of the next bout, walk included): cover replaces the design shape
  0.55 + 0.45·min(1, crop ÷ `fruitValueRef`). No cap at one fruit unit and none at one gut-full: the gut empties while
  the animal stays.
- The habitat-index crowding cost (`crowdCompeteW`·(`crowdScarcityRef` − fruit index)) is off: co-feeders cost what they
  take from the share. Everything else is unchanged (the walk cost of a crown in view, `revisit`, territory and core
  costs, rain, the trips' sociability bonus, the gate's patch test).
- Inputs: kcal per fruit unit, intake rate and energy need are the ledger's (E1, E1e, E1h); equal shares among the feeders
  and the product form are design assumptions. No new magnitude, no tuned constant. Nothing ties the number of feeders to
  crown size: each animal values only its own expected food.
- Prescriptions: none switched out (the shape and the crowding weights are design entries): 77 → 77
  (`TRACK_E_SWITCHES` note). Code: src/sim/candidates.ts (`cover`, `crownShareOn`); tests/sim-crown-share.test.ts (switch
  default 0, determinism over a field day, the replaced weights unread, a co-feeder costs nothing while the half share
  meets the need and costs once the share falls below it, a depleted crown is worth less).

**Arm A1** = S5 + `crownShare` 1, from a frozen detached checkout of the commit that adds this section: `e-bench --quick`
(seeds 48 and 7, 30 + 30 days, `--workers 2`), `energy-diagnose` (same seeds and window) and `crown-share-diagnose`
(same). Smoke test first (seed 48, 1 + 2 days, A1): every readout filled; nothing else read from it.

**Predictions (A1 against the S5 mean ± SD of its four realizations; low confidence unless stated).**

| Quantity | S5 | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 77 | 77 | high |
| Crop selectivity (units) | 0.007 ± 0.001 | ≥ 0.02 | moderate |
| Feeders per occupied crown, top − bottom crop tercile | −0.031 ± 0.011 | ≥ +0.05 | low |
| R² feeders on crop | 0.000 ± 0.001 | 0.005–0.05 | low |
| FPS per bout (potts2011) | 2.20 ± 0.06 | 1.7–2.2 | low |
| R² ln FPS on ln crop | 0.001 ± 0.001 | ≥ 0.01 | low |
| Joined trips chosen | 11,382 ± 603 | ≥ 20% fewer (a leader's goal shared with 1.8 others covers ~0.3 of the need) | moderate |
| T-PTY-1 | 3.31 ± 0.17 | 2.6–3.4 | low |
| T-ACT-2, males / females | 0.234 / 0.197 (± 0.012) | within ±0.03 of the reference | low |
| True path, adult males (km/day) | 2.54 ± 0.05 | within ±0.3 km | low |
| Reserves, lactating / juveniles (% of store per day) | −0.114 ± 0.026 / −0.007 ± 0.014 | within 0.05 of the reference | low |
| Fitted; held-out without T-HUN-4 and T-BRD-1 | reference mean | inside noise | low |
| Viability | pass | pass | moderate |

**Kill criterion (registered).** Null if: (a) viability fails (a starvation death; a seed below 80% of its start); (b) any
class's reserve slope is more than 0.05% of the store a day below the S5 mean; (c) held-out without the rare rows is
worse beyond noise (z > +2); or (d) the mechanism does not run (crop selectivity within 2 SD of the S5 mean).

**Verdict rule (registered).** The switch removes no counted prescription, so it cannot pass the track's keep rule on its
own. It is a *provisional keep candidate as a correction* (E5b's precedent) only if none of (a)–(d) holds and the crop
relation emerges in simulation truth: R² of feeders on crop and R² of ln FPS on ln crop each above the S5 mean + 2 SD,
and the top crop tercile holding more feeders than the bottom. Otherwise it is recorded and stays off. Party size,
travel and day ranges are reported against the reference, never used to choose between iterations.

### 3.1 Iteration 2 (registered 2 October 2026, 14:10, before its run): the rate at which a crown lets the animal meet its need

**Why (A1, §6.1).** Iteration 1 valued a crown by the share of the day's need it covers, a level that falls to 0 for a
small or shared crown while every other option (the fallback above all) is valued as a rate: crowns lost to leaves,
needier animals valued crowns least, and every female class and the juveniles lost 0.4–1.1% of the store a day.

**Change (same switch).** The amount part of a crown's value is the share of the full fruit rate at which the crown
lets the animal meet its energy need, counting what the crown cannot supply at the fallback's rate where it stands (the
animal's guaranteed alternative; leafRate, the ledger's fallback kcal × the forage field there × its intake size):
g = (need ÷ R_fruit) ÷ (E ÷ R_fruit + (need − E) ÷ R_fallback), E = min(believed crop × kcal per unit ÷ (1 + feeders
seen), need) as in iteration 1; g = 1 when the crown meets the need, R_fallback ÷ R_fruit (≈ 0.3–0.4) when it supplies
nothing (`needFillRate`, candidates.ts). worth = drive × g × tripWorth (tripWorth unchanged). Everything else is
iteration 1's: the habitat-index crowding cost off; `revisit`, the walk cost of a crown in view and the other terms
unchanged. It is the marginal value theorem's rate over the need [charnov1976] with the fallback as the alternative
(design assumption), in the ledger's kcal; no new magnitude. The co-feeding cost keeps iteration 1's thresholds (free
while the crop ≥ (1 + n) × the need) but is bounded by the fallback. Count unchanged (77).

**Arm A2** = S5 + `crownShare` 1 at the commit that adds this section: e-bench quick, energy-diagnose and
crown-share-diagnose (seeds 48 and 7, 30 + 30 days), from a frozen checkout; smoke test first (readouts filled only).

**Predictions (A2 against the S5 mean ± SD; low confidence unless stated).**

| Quantity | S5 | Predicted A2 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 77 | 77 | high |
| Reserves, lactating / juveniles (% of store per day) | −0.114 ± 0.026 / −0.007 ± 0.014 | within 0.05 of the reference | moderate |
| T-FOOD-2 fruit share | 0.780 ± 0.015 | 0.75–0.83 | moderate |
| Crop selectivity (units) | 0.007 ± 0.001 | ≥ 0.010 | low |
| Feeders per occupied crown, top − bottom crop tercile | −0.031 ± 0.011 | −0.03 to +0.05 (no clear relation) | low |
| R² feeders on crop; R² ln FPS on ln crop | 0.000; 0.001 | ≤ 0.01; ≤ 0.01 | low |
| FPS per bout | 2.20 ± 0.06 | 1.9–2.3 | low |
| T-PTY-1 | 3.31 ± 0.17 | 3.1–3.8 | low |
| T-ACT-2, males | 0.234 ± 0.012 | within ±0.03 | low |
| Fitted; held-out without the rare rows | reference mean | inside noise | low |
| Viability | pass | pass | moderate |

**Kill criterion and verdict rule:** as iteration 1 (§3). Disclosure: A1's results were read before this registration;
the five unit tests of tests/sim-crown-share.test.ts ran on the iteration-2 code before this commit (no behavioural
readout).

### 3.2 Iteration 3 (registered 2 October 2026, 14:20, before its run): the crop-blind separators off

**Why (A1, A2, §6.1–6.2, and the diagnosis R4).** Valued at the scale of the day's need, the share binds for one animal
in most crowns: it separated feeders everywhere (FPS 2.20 → 1.97) and cost the neediest (mothers −0.33 to −1.23% a
day), with no crop relation. At the scale of a bout (today's `tripWorth`: E = min(share, need, gut room)) the share is
already in the value; it binds only when the crop cannot give each feeder a bout, which at 1.3 feeders per crown never
happens. What keeps companions out of each other's crowns are two terms that ignore the crop (§2.1): the revisit
devaluation of a crown just used (R4: the main reason a companion's crown lost, 0.195; within-decision SD 0.129, the
largest of all terms) and the habitat-index crowding cost (the only term that lowers co-feeding among crowns in view).

**Change (same switch; iterations 1 and 2 are dropped).** Under `crownShare`:
- the crown valuation is today's (0.55 + 0.45·min(1, crop ÷ `fruitValueRef`) × `tripWorth`): co-feeders cost what they
  take from this animal's share of the bout (the crop it believes ÷ (1 + the feeders it sees), against its need and its
  gut), the ecological constraint at the scale of a feeding bout (potts2011's FPS is per bout);
- a crown the animal has fed in is worth the crop it believes is left there (C7a's belief, written when it leaves the
  crown): the crop-blind devaluation `revisitW` × exp(−Δt ÷ `revisitTauH`) (C6b, design; "the fruit within reach has been
  taken", no source) is not applied and the fed-tree list is not kept;
- the habitat-index crowding cost is off (as in iterations 1 and 2).
No new magnitude; the switched-out entries are design, so the count stays 77. Code: candidates.ts (`revisit`, the forage
offer), execution.ts (the fed-tree list); tests/sim-crown-share.test.ts (a co-feeder costs nothing while the bout share is
whole and the off model charges the crowding; six co-feeders cost a small crown; a crown just fed in keeps its worth on
and loses `revisitW` off; the four switched-out entries unread over a field day).

**Arm A3** = S5 + `crownShare` 1 at the commit that adds this section: e-bench quick, energy-diagnose, crown-share-diagnose
(seeds 48 and 7, 30 + 30 days), from a frozen checkout; smoke test first (readouts filled only).

**Predictions (A3 against the S5 mean ± SD; low confidence unless stated).**

| Quantity | S5 | Predicted A3 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 77 | 77 | high |
| A companion's crown taken (when one feeds in another crown) | 0.37 (diagnosis) | ≥ 0.45 | moderate |
| FPS per bout | 2.20 ± 0.06 | 2.3–2.8 | low |
| Feeders per occupied crown | 1.31 ± 0.01 | 1.35–1.6 | low |
| Top − bottom crop tercile; R² feeders on crop; R² ln FPS on ln crop | −0.031; 0.000; 0.001 | −0.03 to +0.10; ≤ 0.02; ≤ 0.02 | low |
| T-FOOD-4 trees per day | 7.5 ± 0.4 | 5–7 (crowns are re-used) | moderate |
| T-ACT-2 males; true path, adult males | 0.234; 2.54 km | 0.19–0.24; 2.1–2.5 km | low |
| Reserves, lactating / juveniles | −0.114 / −0.007 % a day | within 0.05 of the reference | moderate |
| T-PTY-1 | 3.31 ± 0.17 | 3.2–4.0 | low |
| Fitted; held-out without the rare rows | reference mean | inside noise | low |
| Viability | pass | pass | moderate |

**Kill criterion and verdict rule:** as iteration 1 (§3); this is the last iteration. Disclosure: A1 and A2 were read
before this registration; the six unit tests ran on the iteration-3 code before this commit (no behavioural readout).

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

- **Iteration 1** (`crownShare` as in §3; arm A1): registered and committed before its run (a6ea386). Results §6.1. Disclosure:
  the four unit tests of tests/sim-crown-share.test.ts ran on the iteration-1 code before this commit (scores of one
  constructed scene, determinism and parameter reads only; no behavioural readout was looked at). A first draft valued
  the walk at the full need (the time to eat the whole share) and dropped the fitted walk cost of crowns in view; it was
  replaced before any run because the walk is not the term the diagnosis names (R3: `trip` +0.005) and pricing the walk
  against hours of eating would have made walks nearly free.
- **Iteration 2** (§3.1; arm A2): registered and committed before its run (494425c). Results §6.2.
- **Iteration 3** (§3.2; arm A3): registered and committed before its run (e076dbe). Results §6.3. Last iteration.
- **Final checks** (after merging track-e f24032d once): `gen-params --check` clean, `tsc --noEmit` clean, `pnpm test`
  694 tests: 693 pass, 0 fail, 1 skipped. Arms A1–A3 all ran S5 + `crownShare` 1 (the same parameters) at the commit of
  their iteration. Outputs (gitignored, local): `artifacts/validation/e5c/` (arm e-bench, energy and crown JSON, the four
  S5 realizations' crown diagnoses in `diag/`, and the table scripts `arm_report.sh`, `bench_ref.py`, `crown_ref.py`,
  `diag_table.py`).

## 6. Results

### 6.1 Iteration 1: A1 = S5 + `crownShare` (run-a6ea386, clean; 13:43–13:50, load 3–9, bench `--workers 2`)

Generated by `artifacts/validation/e5c/arm_report.sh` (the integrator's `judge_vs_reps.py`, `bench_ref.py`,
`crown_ref.py`) from the JSON. e-bench: {'commit': 'a6ea3868369aff34590bc190df107c3e8ca66882', 'branch': 'HEAD', 'dirty': 0} {'fittedDistance': 2.665284602226868, 'heldOutDistance': 5.284659939555868, 'prescriptionCount': 77, 'viability': 'pass'}.

Judge (rows counted in all five runs; z against the mean of S5's four realizations):

```
quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 13
  fitted             (17 rows) ref 3.00, 2.71, 3.75, 3.71 (mean 3.29, sd 0.52; used 0.69) | A1.json: 2.67, Δ -0.63, z -0.8 (inside noise)
  held-out           (13 rows) ref 7.30, 8.55, 5.46, 5.29 (mean 6.65, sd 1.56; used 1.56) | A1.json: 4.41, Δ -2.24, z -1.3 (inside noise)
  held-out w/o rare  (12 rows) ref 5.24, 5.19, 5.46, 5.29 (mean 5.30, sd 0.12; used 0.48) | A1.json: 4.41, Δ -0.89, z -1.7 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-4   held-out ref 1.35±1.65 | A1.json 0.00 (pass)
   T-SOC-9   fitted   ref 0.00±0.01 | A1.json 0.21 (fail)
```

| Readout | S5 (mean ± SD of 4) | A1 |
| --- | --- | --- |
| T-PTY-1 | 3.310 ± 0.168 | 3.677 (+2.2 SD) |
| T-ACT-1 feeding, males | 0.383 ± 0.005 | 0.395 (+2.8 SD) |
| T-ACT-1 feeding, females | 0.395 ± 0.011 | 0.377 (-1.6 SD) |
| T-ACT-2 travel, males | 0.234 ± 0.012 | 0.227 (-0.6 SD) |
| T-ACT-2 travel, females | 0.197 ± 0.012 | 0.197 (+0.0 SD) |
| T-FOOD-2 fruit share | 0.780 ± 0.015 | 0.614 (-11.4 SD) |
| T-FOOD-4 trees per day | 7.517 ± 0.437 | 6.537 (-2.2 SD) |
| T-RNG-4 male day range (observer, km) | 2.448 ± 0.123 | 2.516 (+0.6 SD) |
| true path, adult males (km/day) | 2.544 ± 0.049 | 2.543 (-0.0 SD) |
| true path, lactating (km/day) | 2.347 ± 0.102 | 2.299 (-0.5 SD) |
| true path, other females (km/day) | 2.137 ± 0.087 | 2.456 (+3.7 SD) |
| true path, juveniles 5–12 y (km/day) | 2.490 ± 0.079 | 3.199 (+9.0 SD) |
| reserves ÷ store, lactating (mean level) | -0.100 ± 0.007 | -0.359 (-39.3 SD) |
| reserves ÷ store, juveniles 5–12 y (mean level) | -0.059 ± 0.003 | -0.128 (-23.9 SD) |
| eating min, lactating | 287.620 ± 0.956 | 263.952 (-24.8 SD) |
| reserves, lactating (% of store per day, OLS) | -0.114 ± 0.026 | -1.234 (-43.5 SD) |
| reserves, juveniles 5–12 y (% per day) | -0.007 ± 0.014 | -0.542 (-37.9 SD) |
| reserves, adult males (% per day) | 0.005 ± 0.007 | -0.051 (-8.1 SD) |
| reserves, other females (% per day) | 0.020 ± 0.014 | -0.502 (-38.1 SD) |
| prescriptions | 77, 77, 77, 77 | 77 |
| viability | pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation) | pass (1 deaths, 0 starvation) |

| Readout (truth unless stated) | S5 (mean ± SD of 4) | A1 |
| --- | --- | --- |
| feeders per occupied crown | 1.310 ± 0.008 | 1.251 (-7.7 SD) |
| … crop tercile 1 | 1.315 ± 0.011 | 1.254 (-5.5 SD) |
| … crop tercile 2 | 1.331 ± 0.014 | 1.266 (-4.5 SD) |
| … crop tercile 3 | 1.284 ± 0.005 | 1.232 (-9.9 SD) |
| top − bottom crop tercile | -0.031 ± 0.011 | -0.022 (+0.8 SD) |
| R² feeders on crop | 0.000 ± 0.001 | 0.000 (-0.5 SD) |
| R² feeders on crown radius | 0.002 ± 0.001 | 0.001 (-1.2 SD) |
| FPS per bout (potts2011) | 2.197 ± 0.060 | 1.973 (-3.7 SD) |
| R² ln FPS on ln crop | 0.001 ± 0.001 | 0.006 (+9.5 SD) |
| R² ln FPS on ln radius | 0.005 ± 0.002 | 0.005 (+0.3 SD) |
| observer feeding scans: R² on radius | 0.010 ± 0.011 | 0.000 (-0.9 SD) |
| crop selectivity (units) | 0.007 ± 0.001 | 0.010 (+3.7 SD) |
| share binds (crown options) | 0.026 ± 0.004 | 0.008 (-5.1 SD) |
| chosen kind: join | 11382.250 ± 603.289 | 9658.000 (-2.9 SD) |
| chosen kind: trip | 13606.000 ± 91.075 | 13398.000 (-2.3 SD) |
| chosen kind: crown | 11435.750 ± 221.750 | 8673.000 (-12.5 SD) |
| parties ≥2 feeders: share in one crown | 0.909 ± 0.006 | 0.892 (-2.8 SD) |
| occupancy minutes (median) | 28.000 ± 0.000 | 27.000 |
| crop eaten per occupancy | 0.110 ± 0.003 | 0.096 (-5.5 SD) |

**Against the predictions.** Prescriptions 77: held. Crop selectivity ≥ 0.02: missed (0.010, up 3.7 SD from 0.007).
Top − bottom crop tercile ≥ +0.05: missed (−0.022). R² feeders on crop 0.005–0.05: missed (0.000). FPS 1.7–2.2: held
(1.97). R² ln FPS on ln crop ≥ 0.01: missed (0.006). Joined trips ≥ 20% fewer: missed narrowly (−15%). T-PTY-1 2.6–3.4:
missed (3.68, +2.2 SD). T-ACT-2 within ±0.03: held. Males' true path within ±0.3 km: held (2.54). Reserves within 0.05%
a day: **missed by far** (lactating −1.23 against −0.11 ± 0.03; juveniles −0.54; other females −0.50). Sums inside
noise: held (fitted z −0.8; held-out without the rare rows z −1.7). Viability: passed (one death in 30 days, no
starvation), but see the reserves.

**Kill criterion: met by (b)** (every adult female class and the juveniles lose 0.4–1.1% of the store a day more than
S5). **Iteration 1 is a null.** Reading: valuing a crown by the share of the day's need it covers (cover ≤ 1) is a level,
not a rate: it devalues every crown that cannot meet the whole need (58% of options; more for nursing mothers, whose
need is largest) against options whose values carry no such factor, the fallback above all. Mothers' fruit share fell
from 0.81 to 0.38 and their intake from 2,262 to 1,667 kcal a day (energy-diagnose); the fruit share of all adults
(T-FOOD-2) from 0.78 to 0.61. The needier the animal, the less a crown was worth to it: backwards. The crop relation did
not emerge either: feeders per crown fell in every tercile (1.31 → 1.25) and FPS fell (2.20 → 1.97), because the share
binds at the need scale for one or two feeders in all but the largest crowns, so co-feeding fell everywhere.

### 6.2 Iteration 2: A2 = S5 + `crownShare` (the need-filling rate; run-494425c, clean; 13:50–13:57, load 4–8)

Generated by `arm_report.sh` from the JSON. e-bench: {'commit': '494425c6ec0d84d4a0b446cdf0b65de287a797c4', 'branch': 'HEAD', 'dirty': 0} {'fittedDistance': 1.3684601378393682, 'heldOutDistance': 6.773271055706188, 'prescriptionCount': 77, 'viability': 'pass'}.

```
quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 13
  fitted             (17 rows) ref 3.00, 2.71, 3.75, 3.71 (mean 3.29, sd 0.52; used 0.69) | A2.json: 1.37, Δ -1.92, z -2.5 RESULT
  held-out           (13 rows) ref 7.30, 8.55, 5.46, 5.29 (mean 6.65, sd 1.56; used 1.56) | A2.json: 6.77, Δ +0.12, z +0.1 (inside noise)
  held-out w/o rare  (12 rows) ref 5.24, 5.19, 5.46, 5.29 (mean 5.30, sd 0.12; used 0.48) | A2.json: 5.25, Δ -0.04, z -0.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-1   fitted   ref 0.94±0.11 | A2.json 0.67 (inconclusive)
   T-HUN-2   fitted   ref 1.14±0.39 | A2.json 0.19 (fail)
   T-HUN-4   held-out ref 1.35±1.65 | A2.json 1.52 (fail)
```

| Readout | S5 (mean ± SD of 4) | A2 |
| --- | --- | --- |
| T-PTY-1 | 3.310 ± 0.168 | 3.608 (+1.8 SD) |
| T-ACT-1 feeding, males | 0.383 ± 0.005 | 0.370 (-2.8 SD) |
| T-ACT-1 feeding, females | 0.395 ± 0.011 | 0.370 (-2.2 SD) |
| T-ACT-2 travel, males | 0.234 ± 0.012 | 0.199 (-3.0 SD) |
| T-ACT-2 travel, females | 0.197 ± 0.012 | 0.202 (+0.4 SD) |
| T-FOOD-2 fruit share | 0.780 ± 0.015 | 0.755 (-1.7 SD) |
| T-FOOD-4 trees per day | 7.517 ± 0.437 | 7.119 (-0.9 SD) |
| T-RNG-4 male day range (observer, km) | 2.448 ± 0.123 | 2.145 (-2.5 SD) |
| true path, adult males (km/day) | 2.544 ± 0.049 | 2.245 (-6.1 SD) |
| true path, lactating (km/day) | 2.347 ± 0.102 | 2.374 (+0.3 SD) |
| true path, other females (km/day) | 2.137 ± 0.087 | 2.099 (-0.4 SD) |
| true path, juveniles 5–12 y (km/day) | 2.490 ± 0.079 | 2.589 (+1.3 SD) |
| reserves ÷ store, lactating (mean level) | -0.100 ± 0.007 | -0.144 (-6.6 SD) |
| reserves ÷ store, juveniles 5–12 y (mean level) | -0.059 ± 0.003 | -0.044 (+5.4 SD) |
| eating min, lactating | 287.620 ± 0.956 | 279.464 (-8.5 SD) |
| reserves, lactating (% of store per day, OLS) | -0.114 ± 0.026 | -0.334 (-8.6 SD) |
| reserves, juveniles 5–12 y (% per day) | -0.007 ± 0.014 | -0.022 (-1.0 SD) |
| reserves, adult males (% per day) | 0.005 ± 0.007 | 0.003 (-0.3 SD) |
| reserves, other females (% per day) | 0.020 ± 0.014 | 0.003 (-1.2 SD) |
| prescriptions | 77, 77, 77, 77 | 77 |
| viability | pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation) | pass (0 deaths, 0 starvation) |

| Readout (truth unless stated) | S5 (mean ± SD of 4) | A2 |
| --- | --- | --- |
| feeders per occupied crown | 1.310 ± 0.008 | 1.251 (-7.7 SD) |
| … crop tercile 1 | 1.315 ± 0.011 | 1.263 (-4.7 SD) |
| … crop tercile 2 | 1.331 ± 0.014 | 1.268 (-4.4 SD) |
| … crop tercile 3 | 1.284 ± 0.005 | 1.222 (-11.9 SD) |
| top − bottom crop tercile | -0.031 ± 0.011 | -0.041 (-1.0 SD) |
| R² feeders on crop | 0.000 ± 0.001 | 0.001 (+1.5 SD) |
| R² feeders on crown radius | 0.002 ± 0.001 | 0.002 (+0.0 SD) |
| FPS per bout (potts2011) | 2.197 ± 0.060 | 1.972 (-3.7 SD) |
| R² ln FPS on ln crop | 0.001 ± 0.001 | 0.001 (+0.9 SD) |
| R² ln FPS on ln radius | 0.005 ± 0.002 | 0.007 (+1.4 SD) |
| observer feeding scans: R² on radius | 0.010 ± 0.011 | 0.010 (+0.0 SD) |
| crop selectivity (units) | 0.007 ± 0.001 | 0.007 (+0.0 SD) |
| share binds (crown options) | 0.026 ± 0.004 | 0.031 (+1.4 SD) |
| chosen kind: join | 11382.250 ± 603.289 | 8978.000 (-4.0 SD) |
| chosen kind: trip | 13606.000 ± 91.075 | 14590.000 (+10.8 SD) |
| chosen kind: crown | 11435.750 ± 221.750 | 11631.000 (+0.9 SD) |
| parties ≥2 feeders: share in one crown | 0.909 ± 0.006 | 0.872 (-6.0 SD) |
| occupancy minutes (median) | 28.000 ± 0.000 | 28.000 |
| crop eaten per occupancy | 0.110 ± 0.003 | 0.116 (+2.5 SD) |

**Against the predictions.** Prescriptions 77: held. Reserves within 0.05% a day: **missed for nursing mothers**
(−0.33 against −0.11 ± 0.03; juveniles −0.02, other females and males inside). T-FOOD-2 0.75–0.83: held (0.755).
Crop selectivity ≥ 0.010: missed (0.007, the reference's). No clear crop relation (top − bottom −0.03 to +0.05;
R² ≤ 0.01): held (−0.041; 0.001; ln FPS on ln crop 0.001). FPS 1.9–2.3: held (1.97). T-PTY-1 3.1–3.8: held (3.61).
T-ACT-2 males within ±0.03: missed narrowly (0.199, −0.035). Sums inside noise: held for held-out (z +0.1, −0.1);
**fitted better beyond noise (z −2.5)**, carried by the hunting rows (T-HUN-2 1.14 → 0.19, T-HUN-1 0.94 → 0.67), which
the mechanism does not touch: a chance or indirect effect, not read as a result of the mechanism. Viability passed.

**Kill criterion: met by (b)** (nursing mothers 0.22% of the store a day below S5). **Iteration 2 is a null.** Reading:
the rate at which a crown meets the need, the rest at the fallback's rate, still divides by the need: for the same crop
a needier animal values the crown less (a mother needing 3,000 kcal values a 1,500-kcal share at 0.57 of the full rate,
a male needing 1,500 at 1.0), so mothers eat less (279 against 288 min) and lose more. Males gain (walk 0.3 km less,
travel share 0.199). The crop relation is still absent: valued at the need scale, the share costs co-feeding in all but
the largest crowns (FPS 2.20 → 1.97, feeders per crown 1.31 → 1.25) and creates no preference of feeders for large
crowns. Iterations 1 and 2 together: at the scale of the need the share binds for one animal in most crowns, so it
separates feeders everywhere and costs the neediest; at the scale of a bout (today's E) it never binds.

### 6.3 Iteration 3: A3 = S5 + `crownShare` (the crop-blind separators off; run-e076dbe, clean; 13:58–14:05, load 4–8)

Generated by `arm_report.sh` from the JSON; e-bench: {'commit': 'e076dbe70ac866b0849faa7225ed0ead1411e599', 'branch': 'HEAD', 'dirty': 0} {'fittedDistance': 2.5547452590103976, 'heldOutDistance': 9.71825230371691, 'prescriptionCount': 77, 'viability': 'pass'}.

```
quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 13
  fitted             (17 rows) ref 3.00, 2.71, 3.75, 3.71 (mean 3.29, sd 0.52; used 0.69) | A3.json: 1.07, Δ -2.22, z -2.9 RESULT
  held-out           (13 rows) ref 7.30, 8.55, 5.46, 5.29 (mean 6.65, sd 1.56; used 1.56) | A3.json: 8.74, Δ +2.09, z +1.2 (inside noise)
  held-out w/o rare  (12 rows) ref 5.24, 5.19, 5.46, 5.29 (mean 5.30, sd 0.12; used 0.48) | A3.json: 4.65, Δ -0.64, z -1.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 1.97±0.12 | A3.json 1.48 (fail)
   T-FOOD-5  held-out ref 0.28±0.02 | A3.json 0.00 (pass)
   T-HUN-1   fitted   ref 0.94±0.11 | A3.json 0.26 (inconclusive)
   T-HUN-4   held-out ref 1.35±1.65 | A3.json 4.09 (fail)
```

| Readout | S5 (mean ± SD of 4) | A3 |
| --- | --- | --- |
| T-PTY-1 | 3.310 ± 0.168 | 3.170 (-0.8 SD) |
| T-ACT-1 feeding, males | 0.383 ± 0.005 | 0.356 (-5.7 SD) |
| T-ACT-1 feeding, females | 0.395 ± 0.011 | 0.368 (-2.3 SD) |
| T-ACT-2 travel, males | 0.234 ± 0.012 | 0.145 (-7.6 SD) |
| T-ACT-2 travel, females | 0.197 ± 0.012 | 0.147 (-4.2 SD) |
| T-FOOD-2 fruit share | 0.780 ± 0.015 | 0.803 (+1.5 SD) |
| T-FOOD-4 trees per day | 7.517 ± 0.437 | 7.192 (-0.7 SD) |
| T-RNG-4 male day range (observer, km) | 2.448 ± 0.123 | 1.484 (-7.8 SD) |
| true path, adult males (km/day) | 2.544 ± 0.049 | 1.774 (-15.7 SD) |
| true path, lactating (km/day) | 2.347 ± 0.102 | 1.503 (-8.3 SD) |
| true path, other females (km/day) | 2.137 ± 0.087 | 1.429 (-8.1 SD) |
| true path, juveniles 5–12 y (km/day) | 2.490 ± 0.079 | 1.706 (-9.9 SD) |
| reserves ÷ store, lactating (mean level) | -0.100 ± 0.007 | -0.043 (+8.7 SD) |
| reserves ÷ store, juveniles 5–12 y (mean level) | -0.059 ± 0.003 | -0.034 (+8.9 SD) |
| eating min, lactating | 287.620 ± 0.956 | 270.702 (-17.7 SD) |
| reserves, lactating (% of store per day, OLS) | -0.114 ± 0.026 | 0.015 (+5.0 SD) |
| reserves, juveniles 5–12 y (% per day) | -0.007 ± 0.014 | 0.007 (+1.0 SD) |
| reserves, adult males (% per day) | 0.005 ± 0.007 | -0.014 (-2.7 SD) |
| reserves, other females (% per day) | 0.020 ± 0.014 | -0.005 (-1.8 SD) |
| prescriptions | 77, 77, 77, 77 | 77 |
| viability | pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation), pass (0 deaths, 0 starvation) | pass (0 deaths, 0 starvation) |

| Readout (truth unless stated) | S5 (mean ± SD of 4) | A3 |
| --- | --- | --- |
| feeders per occupied crown | 1.310 ± 0.008 | 1.262 (-6.2 SD) |
| … crop tercile 1 | 1.315 ± 0.011 | 1.315 (+0.0 SD) |
| … crop tercile 2 | 1.331 ± 0.014 | 1.267 (-4.5 SD) |
| … crop tercile 3 | 1.284 ± 0.005 | 1.205 (-15.1 SD) |
| top − bottom crop tercile | -0.031 ± 0.011 | -0.110 (-7.4 SD) |
| R² feeders on crop | 0.000 ± 0.001 | 0.008 (+15.5 SD) |
| R² feeders on crown radius | 0.002 ± 0.001 | 0.000 (-2.4 SD) |
| FPS per bout (potts2011) | 2.197 ± 0.060 | 1.864 (-5.5 SD) |
| R² ln FPS on ln crop | 0.001 ± 0.001 | 0.007 (+11.3 SD) |
| R² ln FPS on ln radius | 0.005 ± 0.002 | 0.000 (-2.6 SD) |
| observer feeding scans: R² on radius | 0.010 ± 0.011 | 0.002 (-0.7 SD) |
| crop selectivity (units) | 0.007 ± 0.001 | 0.009 (+2.4 SD) |
| share binds (crown options) | 0.026 ± 0.004 | 0.058 (+9.0 SD) |
| chosen kind: join | 11382.250 ± 603.289 | 5352.000 (-10.0 SD) |
| chosen kind: trip | 13606.000 ± 91.075 | 10592.000 (-33.1 SD) |
| chosen kind: crown | 11435.750 ± 221.750 | 15940.000 (+20.3 SD) |
| parties ≥2 feeders: share in one crown | 0.909 ± 0.006 | 0.915 (+0.9 SD) |
| occupancy minutes (median) | 28.000 ± 0.000 | 24.000 |
| crop eaten per occupancy | 0.110 ± 0.003 | 0.102 (-3.1 SD) |

Rows whose distance moved by 0.05 or more in any arm (distance, S5 mean of four and each arm; generated):

| Row | role | S5 distance (mean of 4) | A1 | A2 | A3 | S5 value | A3 value |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-3 | fitted | 0.05 | 0.15 | 0.02 | 0.12 | 0.166 | 0.188 |
| T-COM-11 | fitted | 0.65 | 0.00 | 0.00 | 0.00 | 0.056 | 0.286 |
| T-COM-8 | fitted | 0.01 | 0.07 | 0.00 | 0.00 | 0.569 | 0.515 |
| T-FOOD-10 | held-out | 1.97 | 1.92 | 1.74 | 1.48 | 0.733 | 0.626 |
| T-FOOD-2 | fitted | 0.03 | 0.00 | 0.00 | 0.13 | 0.78 | 0.803 |
| T-FOOD-5 | held-out | 0.28 | 0.32 | 0.27 | 0.00 | 0.065 | 0.442 |
| T-HUN-1 | fitted | 0.94 | 1.03 | 0.67 | 0.26 | 43.875 | 30.249 |
| T-HUN-2 | fitted | 1.14 | 0.93 | 0.19 | 0.56 | 0.157 | 0.333 |
| T-HUN-4 | held-out | 1.35 | 0.00 | 1.52 | 4.09 | 2.676 | 4.864 |
| T-HUN-7 | fitted | 0.14 | 0.00 | 0.00 | 0.00 | 1.161 | 1.25 |
| T-HUN-8 | held-out | 0.47 | 0.00 | 0.00 | 0.33 | 0.917 | 1 |
| T-IGE-1 | fitted | 0.32 | 0.28 | 0.50 | 0.00 | 3.394 | 7.565 |
| T-RNG-5 | held-out | 1.06 | 0.79 | 1.45 | 1.18 | 0.917 | 0.954 |
| T-SOC-3 | held-out | 0.43 | 0.33 | 0.46 | 0.43 | 0.952 | 0.95 |
| T-SOC-6 | held-out | 0.36 | 0.34 | 0.60 | 0.50 | 0.493 | 0.451 |
| T-SOC-9 | fitted | 0.00 | 0.21 | 0.00 | 0.00 | 0.187 | 0.185 |

**Against the predictions.** Prescriptions 77: held. A companion's crown taken ≥ 0.45: held (0.53, from 0.37). FPS
2.3–2.8: **missed, in reverse** (1.86). Feeders per crown 1.35–1.6: missed (1.26). Top − bottom crop tercile −0.03 to
+0.10: **missed, in reverse** (−0.110: feeders fall with crop; R² 0.008 and ln FPS on ln crop 0.007, both from a negative
slope). T-FOOD-4 5–7: missed narrowly (7.19). T-ACT-2 males 0.19–0.24: missed (0.145, inside its band); males' true path
2.1–2.5 km: missed (1.77; T-RNG-4 1.48, just below its band). Reserves within 0.05% a day: held (mothers +0.015, better
than S5 by 0.13; juveniles +0.007; males −0.014). T-PTY-1 3.2–4.0: missed narrowly (3.17). Sums: fitted better beyond
noise (z −2.9), mostly the hunting rows (T-HUN-1 0.94 → 0.26: 30 hunts per community-year instead of 44, fewer colobus
met on shorter paths; T-HUN-2), T-COM-11 and T-IGE-1; held-out inside noise (z +1.2 with the rare rows, T-HUN-4 4.09;
z −1.2 without them: T-FOOD-10 1.97 → 1.48 and T-FOOD-5 0.28 → 0). Viability passed.

**Kill criterion: not met** ((a)–(c) pass; (d) crop selectivity +2.4 SD). **Verdict rule: not met** (the top crop
tercile holds fewer feeders than the bottom), so iteration 3 is **recorded and stays off**. Reading: without the
revisit devaluation animals re-use the crowns they have just fed in (crown choices 11,436 → 15,940; own trips −22%,
joined trips −53%), so they walk a third less and mothers' balance improves; companions share a crown more often (0.53),
but the feeders that stay together deplete the crown they share, so at a 15-min scan the crowns with more feeders hold
less crop: the crop measured at the scan is the effect of the feeders, not their cause. On crown radius (a size measure
depletion does not touch) feeders and FPS stay flat (R² 0.000).

## 7. Stage verdict

- **Readout (audit).** potts2011 (re-read in full) defines feeding party size per focal feeding bout as the maximum
  number of independent feeders co-feeding in the patch, and regresses its log on the log of the patch's DBH (R² 0.80
  Ngogo, 0.23 Kanyawara; "ln average feeding party size" in its Figure 4). The observer scores T-PTY-2's patch part on
  15-min scans against crown radius with a linear R²: a staged scorer fix (§2.2), not applied. Under the 90-day cap
  T-PTY-2 stays "insufficient"; the truth readouts (feeders per occupied crown, FPS per bout) are reported instead.
- **Diagnosis.** The energy a crown is valued for is one gut-full (`treeIntake`: E = min(share, need, gut room); the gut
  room, ~245 kcal, is below the ~2,000-kcal need at 99.8% of crown options), so neither the crop nor the feeders enter the
  value (the share binds at 2.6%); the crop enters only through a design shape whose spread within a decision is below
  the choice noise, and two crop-blind terms keep feeders apart (the revisit devaluation, the main term on which a
  companion's crown lost: mean difference 0.195; the habitat-index crowding). Physically nothing ties feeders to the crop: a crown holds 8–12 feeder-bouts while
  1.3 party members feed at once, an occupancy eats 11% of the crop, and no feeder's intake per minute ever falls with
  others present. Party members that feed at the same time do share a crown (91%).
- **Iterations.** (1) A crown valued by the share of the day's need its crop covers: null (nursing mothers −1.23% of the
  store a day; fruit share 0.78 → 0.61). (2) The rate at which the crown meets the need, the rest at the fallback's rate:
  null (mothers −0.33%/day: dividing by the need makes the needier value the same crop less). (3) The crop-blind
  separators off, the share of the bout and the believed crop left in place: viable, mothers better (+0.13%/day against
  S5), walking −30%, fitted better beyond noise (hunting rows), held-out inside noise, but feeding parties smaller (FPS
  1.86) and the crop relation reversed by depletion; recorded.
- **Verdict: no switch is kept; `crownShare` (iteration 3 as committed) stays off and is recorded.** It removes no counted
  prescription (77). None of the three valuations produced feeders that follow the crop.
- **What it means.** The field's FPS of 7–8 is about the bout capacity of an ordinary crown, so the field's relation needs
  parties that arrive and feed together in numbers that fill a crown; the model's parties (3.3) feed one or two at a time,
  so the crop never limits them and no value placed on the crop can make it limit them without separating feeders
  everywhere (iterations 1–2). The binding problem is how many party members feed together (synchrony and party size),
  not how a crown is valued. A sourced food landscape with a wider crop range (food-landscape-prereg, on `main`, not
  built) would add small crowns that one or two feeders fill, but cannot make parties feed together.
- **Open.** (i) Feeding together: what makes party members feed at the same time in the field (arrival together after
  joint travel; moving-together-prereg on `main`) is not in the model. (ii) The readout's depletion confound: the crop at
  a scan is partly the feeders' effect (iteration 3); potts2011 used DBH, a size the feeders do not change. (iii) A3's
  side effects (walking −30%, T-RNG-4 just below its band) would need their own stage before the revisit term is touched.
