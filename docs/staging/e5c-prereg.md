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

- **Iteration 1** (`crownShare` as in §3; arm A1): registered and committed before its run (this commit). Disclosure:
  the four unit tests of tests/sim-crown-share.test.ts ran on the iteration-1 code before this commit (scores of one
  constructed scene, determinism and parameter reads only; no behavioural readout was looked at). A first draft valued
  the walk at the full need (the time to eat the whole share) and dropped the fitted walk cost of crowns in view; it was
  replaced before any run because the walk is not the term the diagnosis names (R3: `trip` +0.005) and pricing the walk
  against hours of eating would have made walks nearly free.
