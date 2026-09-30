# C7b: party size, feeding competition and daily routes — diagnosis and pre-registration

Stage C7b, 29 September 2026. Branch off `main` at 63f0fca (C7a built, in review). Written after the measurement-only diagnosis (§1) and before any run of the mechanisms in §3. Field profile only; every mechanism is gated by a parameter that leaves the compressed profile and its golden hashes unchanged.

**Staging only:** the integrator decides what is registered. Nothing here edits `docs/realism-design.md` or `data/targets.json`.

**Held out:** the C12 statistics (30-min step, straightness, turning, ranges, overlap, party size) are not fitted. C7b fits no parameter. Path per hour and same-day displacement were fitted in C7a through `travelDistScaleM`; §3.4 replaces that knob in the field, so their fit is lost and they are reported, not refitted.

---

## 1. Diagnosis (measurement only)

`scripts/party-food-metrics.ts` (new; reads the world between ticks and never writes it). Every independent adult (≥ 15 y) from 07:00 to 18:00, 15-min scans, after a 60-day burn-in, 6 days, seeds 3101 and 3202 (diagnosis seeds, outside every reserved set and the proof seeds). About 370 adult-days per configuration. Party size is counted as the C12 comparison counts it: independents in the focal's 50 m chain party. Raw output: `artifacts/validation/c7b/{ablate,addone,dist}.txt` in the C7b worktree.

"C6b-like" switches off every C7a mechanism: `travelDistScaleM` 2,000, `familiarFullLevel` 0.5, `patchesPerHa` 18, `cropSkewExp` 0, `knownTreesK` 0, `memCropBelief` 0, `fruitValueRef` 0.45, `travelCommit` 0, `partyLeaderFollow` 0. The Ngogo phenology stays on in both.

### 1.1 Why party size fell to 2

| Configuration | Party size, mean (median) | Alone | Trips to trees starting in company | Companions still in the party at the trip's end | Trip length, median |
| --- | --- | --- | --- | --- | --- |
| C6b-like | 3.19 (2) | 0.35 | 0.60 | 0.74 | 84 m |
| C7a | **2.29 (2)** | 0.46 | 0.30 | 0.40 | 286 m |
| C7a, `travelDistScaleM` 2,000 | 2.97 (2) | 0.36 | 0.40 | 0.57 | 130 m |
| C7a, 2,000 m and 18 trees/ha | 4.02 (3) | 0.32 | 0.45 | 0.61 | 102 m |

One C7a mechanism at a time, party size mean:

| Mechanism | Added to C6b-like (3.19) | Removed from C7a (2.29) |
| --- | --- | --- |
| crop-valued goals and known trees (`memCropBelief`, `knownTreesK`, `fruitValueRef`) | 3.53 | 2.12 |
| distance cost off (`travelDistScaleM` 60,000) | 3.27 | 2.97 |
| follow the leader, alerts only on travel (`partyLeaderFollow`) | 3.59 | 2.15 |
| committed trips (`travelCommit`) | 3.30 | 2.24 |
| 9.8 instead of 18 trees/ha | 2.75 | 2.40 |
| crops ∝ crown area (`cropSkewExp`) | 3.85 | 2.48 |
| familiar with the whole range (`familiarFullLevel`) | 3.05 | — |

**Diagnosis.**
1. **Distant, individually chosen goals split parties.** No single mechanism explains the drop; the interaction of value-driven goals with a switched-off distance cost does. Each adult picks its own tree among the community's best-known trees anywhere in the range: trips lengthened 84 → 286 m. Companions never chose the same tree (0.00 in every configuration), and only 22% were following 5 min after a departure, because a party follow is a 4–8 min bout and a 286 m trip takes ~14 min. So 60% of companions are lost on every trip. Restoring a 2,000 m distance cost alone recovers 2.29 → 2.97.
2. **Lower density removes shared crowns.** Fewer crowns in view means companions re-sort among different crowns: −0.44 when added to C6b-like, and 2.97 → 4.02 when 18 trees/ha is restored on top of the distance cost.
3. **The science agent's lead is refuted.** Alerting companions on follows as well as on travel (`partyLeaderFollow` 0) gives 2.15 vs 2.29, and adding leader-following to C6b-like raises party size 3.19 → 3.59. Recruitment cascades were not holding parties together.
4. **Parties have no ecological reason to form or to split.** 90% of fed-in crowns hold a single adult. A crown holds 3.6 h of food for its feeders (median), and visits end for social reasons (a call 25%, a follow 13%, rest 12%, grooming 12%), rarely because the crop is gone. At Kibale, feeding parties of 7–8 occupy a patch for 27–46 min per visit [potts2011].

### 1.2 Why ranges stay small

| Per community-day (C7a) | Value |
| --- | --- |
| Fruit eaten (all members) | 5.5 fruit units |
| Ripe crop standing in the 95% familiarity range | 276 units (uneaten potential 283) |
| Eaten ÷ standing | **0.02 per day** |
| Mean depletion of fruiting crowns in the range | 0.02 |
| Crowns fed in | 37 of ~5,100 trees in the range |

**Diagnosis.**
1. **No feeding competition.** Confirmed. A community eats 2% of the ripe crop standing in its range each day, and fruiting crowns are 2% depleted on average. Density does not matter at this surplus: 18 vs 9.8 trees/ha leaves day path, net displacement and the furthest point of the day unchanged (2,555 vs 2,673 m, 343 vs 313 m, 559 vs 545 m). Nothing depletes the core, so nothing pushes parties apart or outward.
2. **Two causes of the surplus:**
   - every fruiting crown is full at its peak (crop = capacity × phenology shape), whereas crowns more than half filled are at least 9× scarcer than other fruiting crowns [janmaat2016];
   - 9.8 trees/ha counts feeding-size trees of all species, of which 58–62% are food species (C7a review, janmaat2016 full text).
3. **Structural cap (not changed here).** Dense food exists only within 1.1 × each community's nominal radius: West ~9.7 km², North ~5.9 km², East ~6.9 km², with 0.5 trees/ha outside. No community can reach the C12 community range (25.6 km²) in this landscape. Known trees are restricted to the current 95% familiarity isopleth, so the range can grow only by spillover.

### 1.3 Why steps and straightness did not follow the path rate

| C7a | Value |
| --- | --- |
| Half-hours with < 15 m displacement | 0.52 (C7a review: 0.56 on the proof seeds) |
| What fills them | feeding in a crown 0.19, rest 0.19, ground forage 0.06, grooming 0.05 (shares of all half-hours) |
| Day: path, net, furthest from the 07:00 position | 2,673 m, 313 m, 545 m (medians) |
| Turn between consecutive trips to trees | median 1.97 rad (uniform directions: 1.57) |
| Reversals (> 2.5 rad) between consecutive trips | 0.32 (uniform: 0.20) |
| Trips ending within 150 m of the previous trip's start | 0.16 |

**Diagnosis.**
1. **Trips, then sitting.** Confirmed. Movement comes in a few long legs, and crowns outlast their lone feeders, so more than half of all half-hours are stationary. The median step is set by those intervals and cannot respond to longer legs.
2. **Out-and-back trips.** Confirmed. With the distance cost at 60 km, goals are chosen almost blind to distance among the same community-wide best-known trees. Successive trips point anywhere in the range, and more often backwards than chance: 32% reversals vs 20%.
3. **Crop value is what makes trips long.** Without crop-valued goals (C7a with `memCropBelief` and `knownTreesK` off), animals move almost continuously (median step 90 m, 18% stationary) but shuttle among nearby crowns: 70% of trips return near their start, and net displacement is 194 m.

---

## 2. Review item 1: `travelDistScaleM` at 60,000 m

*Superseded by the addendum (§5): the field declares no distance cost (60,000 m, design), and §3.4 is implemented but off by default.*

**Chose (pre-registration):** a pre-stated rule with a source (§3.4) replaces the linear distance cost for trips to trees in the field. `travelDistScaleM` field returns into its range, to 2,000 m (its last in-range value, C5a–C6b), with a note that the field does not read it while `tripRateValue` is 1. The compressed profile keeps its literal, 60 m. The 60,000 m fit and its two fitted statistics are superseded; they are reported, not refitted.

---

## 3. Mechanisms (rules stated before any run)

Evidence tags follow AGENTS.md. Sources are in `docs/research.md` ("Food competition and party size (stage C7b)").

### 3.1 Joint travel: followers stay with a committed traveller (`followCommit`, field 1, compressed 0)

**Rule.** When an animal starts a party follow (V.PARTY) of a companion on a committed trip to a tree (travel V.TREE with `travelCommit`), the follow bout lasts until that companion's trip ends: `actEnd = max(own bout end, companion's actEnd)`. Interrupts still apply. The existing ending still holds: on catching up with a companion who has stopped, the follower decides afresh, usually to feed in the same crown.

**Why.** Diagnosis 1.1(1): follow bouts of 4–8 min drop followers halfway through ~14-min trips. Chimpanzees recruit companions for joint travel, and recruited followers travel with the initiator [gruberZuberbuhler2013] [M]. Following to the destination is a design assumption.

### 3.2 Crown fullness is skewed (`cropFullMin` 0.3, `cropFullExp` 11.9, field; compressed 0 = full crowns)

**Rule.** At each episode's peak, a tree's crop is its capacity × fullness f, with f = `cropFullMin` + (1 − `cropFullMin`) · u^`cropFullExp`. The draw u = hash(tree, calendar year) is fresh each year for non-figs and each cycle for figs. It is a pure function of time, with no rng.
- `cropFullExp` sets P(f > ½) = 0.1 among fruiting crowns: crowns more than half filled are at least 9× scarcer than other fruit-bearing crowns [janmaat2016] [M: abstract, confirmed in full text by the C7a review]. So 1 − ((0.5 − 0.3)/(1 − 0.3))^(1/k) = 0.1, which gives k = ln(2/7) ÷ ln(0.9) = 11.9.
- `cropFullMin` 0.3 keeps the smallest crop capacity (~0.2) at the feeding threshold (0.06) at peak, so every fruiting crown still counts as fruiting (design).
- Mean fullness is 0.3 + 0.7 / 12.9 = 0.354, so the ripe crop falls to about 35%.

The community's expected crop for known trees (`dailyKnownTrees`) is capacity × species share × mean fullness. The ranking is unchanged. An individual learns a tree's actual crop only by seeing it (C7a rule 8).

**Why.** Diagnosis 1.2(2): a full crown on every fruiting tree. Smaller crops also make depletion bite (scramble competition within a crown). A party empties a small crown and must move on, which is the premise of the ecological-constraints model of party size [chapman1995] [M], and of party size tracking patch size [newtonFisher2000] [M]. Grouping has a feeding cost in Kibale chimpanzees [emeryThompson2014] [M]. No rule ties party size to patch size: any such pattern must emerge from depletion.

### 3.3 Food-tree density counts food species only (`patchesPerHa` field 9.8 → 5.9)

**Rule.** 9.81 feeding-size trees (DBH > 67 cm) per ha at Kanyawara × 0.60, the share of mature transect trees that were chimpanzee food species (58–62%) = 5.9 food trees per ha [janmaat2016] [H: full text, per the C7a review, finding 10]. `patchesOutsidePerHa` is unchanged.

**Why.** Diagnosis 1.2(2). The sim's patches are food trees; the C7a value counted every species.

### 3.4 Trips are valued by intake rate, not by a linear distance cost (`tripRateValue`, field 1, compressed 0)

**Rule.** A trip to a remembered or known tree is worth `worth × Tf / (Tw + Tf)` instead of `worth − d / travelDistScaleM`, where:
- Tw = d / `walkMps` is the walking time;
- Tf = min(Q, N) / `fruitIntakePerH` is the feeding the tree offers;
- Q is the believed or expected crop (C7a rule 1 or 8);
- N = hunger / `fruitHungerFactor` is the food the animal still needs.

This is the marginal value theorem's rate: gain over travel plus handling time [charnov1976] [M: theory]. The need cap is a design assumption. It uses only registry values that already exist, so it adds no free parameter. Worked values at hunger 0.5 and a 0.2 crop: 0.96 at 100 m, 0.82 at 500 m, 0.60 at 1.5 km. That is roughly a 5–10 km linear scale in score units: much weaker than 2,000 m, much stronger than 60,000 m. Crowns in sight keep their C7a scoring.

**Why.** Diagnoses 1.3(2) and §2. Choosing blind to distance sends successive trips anywhere in the range. With a rate cost, the next good tree is usually nearer, and trees just emptied are believed empty (C7a crop beliefs), so a day should become a sweep across trees instead of out-and-back trips. This is expected, not encoded: no term refers to heading or straightness.

### 3.5 Considered and not adopted
- **Crowd-aware crown value** (a crown's crop shared by its current feeders). Depletion (§3.2) already makes crowded small crowns unprofitable. It would add a second path to the held-out T-PTY-2 pattern.
- **Slower crop regrowth** (`patchRecoverPerDay` 0.7, design). No source for ripe-fruit residence time, and depletion is 2% at C7a. It is a lever if depletion stays negligible after §3.2–3.3.
- **Party size fitted to its band.** Not declared, so not done: party size is reported, not fitted.
- **Heading persistence.** Would encode straightness (held out).
- **The landscape cap and familiarity-bounded knowledge** (§1.2(3)). Structural: generation layout and the C6/C7a range definition. Flagged for the integrator.

### 3.6 Known risks and held-out exposure
- **T-PTY-2** (party size vs patch size, held out). §3.2 makes the physical premise of that pattern stronger. Nothing encodes it, but a pass should be read with that in mind.
- **T-FOOD-1** (phenology index, encoded). Crowns with small capacity and fullness drop under the 0.06 threshold on their ramps, so the index falls somewhat.
- **T-FOOD-11** (fruiting tree per m, tuned). §3.2 and §3.3 lengthen it.
- **Perception literals.** Crowns are remembered only above 0.2, and food calls need fruit ≥ 0.6 in sight (perception.ts, candidates.ts). They are unchanged, so fewer crowns are remembered and fewer food calls are given. That is realistic (calls at rich sources), but it cuts fusion by calls.
- §3.3 lowers party size by the density effect (§1.1(2)); §3.1 is expected to outweigh it.
- **Cost.** §3.4 adds a few operations per scored tree, and §3.2 one hash per crop evaluation. No new scans.

---

## 4. Direction check (not a proof)

**Seeds 3303 and 3404** (never run before; outside 606–1010, 1111–2525 and the proof seeds 48, 7, 21, 5, 11). Nothing is tuned on them.
- `scripts/party-food-metrics.ts`: 60-day burn-in and 6 days, C7a vs C7b, the same seeds.
- `scripts/field-metrics.ts --profile field --days 120 --burn-in 60 --seeds 3303,3404 --workers 2`: 180 simulated days per seed.
- C12 compare scripts are not run.

**Expected direction** (C7b vs C7a on the same seeds): party size up; trips starting in company and companions kept up; adults per fed-in crown up; eaten ÷ standing up; stationary half-hours down; reversals and returns between trips down; day net displacement and furthest distance up; T-RNG-1 kernel up. Each is reported as moved in the expected direction, not moved, or moved against, with no claim of significance.

---

## 5. Addendum: direction check results and decision (29 September 2026, after the check)

**Brief corrections received during the check (integrator):**
- The 30-min step is dropped as a gap, because it depends on the recording method.
- The robust gaps are straightness (~0.5), turning angle (lower than the sim's), daily path (somewhat short), range area and party size (~6).
- Range size-matched: the gap is 2.5–4× (T-RNG-1 5–16 km² vs 1.9–2.3 km²), not 8–12×. Size-free range shape already matches.

The rows below use C12's definitions on 30-min fixes: full days 07:00–18:00, straightness = net ÷ path, and turns between steps that are both ≥ 15 m. They were added to `scripts/party-food-metrics.ts` after the pre-registration, as a measurement only. On the diagnosis seeds, C6b-like / C7a / C7a with 2,000 m give:

| Configuration | Straightness | Turning (rad) | Path (m/day) | Party size |
| --- | --- | --- | --- | --- |
| C6b-like | 0.22 | 1.59 | 851 | 3.19 |
| C7a | 0.20 | 1.22 | 1,865 | 2.29 |
| C7a, 2,000 m | 0.29 | 1.36 | 986 | 2.97 |

### 5.1 Direction check (seeds 3303, 3404; paired; not a proof)

`party-food-metrics.ts`, 60-day burn-in + 6 days, C7a values vs C7b:

| Measure | C7a | C7b | Direction |
| --- | --- | --- | --- |
| Party size, mean (independents, 50 m chain) | 2.38 | 1.79 | **against** |
| Straightness, full days | 0.19 | 0.28 | expected |
| Turning angle, median | 1.18 rad | 1.37 rad | **against** |
| Path, 30-min fixes | 2,133 m/day | 1,911 m/day | against (slight) |
| Net displacement 07:00 → 18:00 | 385 m | 452 m | expected |
| Furthest from the 07:00 position | 628 m | 640 m | not moved |
| Trips to trees starting in company | 0.33 | 0.26 | against |
| Companions still in the party at a trip's end | 0.46 | 0.64 | expected |
| Adults per fed-in crown | 1.16 | 1.12 | not moved |
| Eaten ÷ ripe crop standing in the range, per day | 0.02 | 0.04 | expected (still a large surplus) |
| Reversals / returns between consecutive trips | 0.28 / 0.15 | 0.45 / 0.49 | **against** |

**Field observer**, C7b only: `field-metrics.ts --days 120 --burn-in 60 --seeds 3303,3404`, in `artifacts/validation/c7b/check-field.*` (worktree). The comparison is unpaired, against C7a fresh (5 seeds × 365 days), and the windows differ:

| Target | C7b check | C7a fresh |
| --- | --- | --- |
| T-RNG-1 West 95% kernel | 5.25 km² | 2.27 km² |
| T-PTY-1 | 2.58 | 3.24 |
| T-FOOD-2 fruit share | **0.42** | 0.77 |
| T-FOOD-4 | 2.52 | 4.75 |
| T-RNG-4 | 4.37 km/day | 3.59 km/day |
| T-FOOD-11 | 501 m | 213 m |

### 5.2 Attribution (each mechanism added to C7a alone; same seeds)

| Configuration | Party size | Straightness | Turning | Path (m/day) | Furthest (m) |
| --- | --- | --- | --- | --- | --- |
| C7a | 2.38 | 0.19 | 1.18 | 2,133 | 628 |
| + joint travel (§3.1) | 2.13 | 0.20 | 1.14 | 2,131 | 678 |
| + intake-rate trip values (§3.4) | 2.70 | 0.25 | 1.24 | 1,389 | 454 |
| + crown fullness and 5.9 trees/ha (§3.2–3.3) | 1.37 | 0.17 | 1.37 | 3,564 | 952 |
| all four (C7b) | 1.79 | 0.28 | 1.37 | 1,911 | 640 |

**Why:**
- **Food (§3.2–3.3).** Depletion now bites: 54% of crown visits end with the crop gone. But fallback foods are unlimited and pay 0.07–0.14 hunger/h anywhere, against 0.24/h for fruit, and are never exhausted (`forageYield`).
  - Animals either sit on ground foods (ground foraging fills 7% → 23% of half-hours in C7b, and fruit eaten falls 5.4 → 3.0 units per community-day) or run alone between small crowns (C7a + food: 74% alone, path 3.6 km/day).
  - So scarcer fruit does not create scramble competition that pushes parties outward together. It creates sitting, or solitary search.
- **Joint travel (§3.1).** Committed followers still lose the traveller. A party follow ends when the traveller is more than 1.6 × sight (~56 m) ahead, and each follower walks at its own speed factor. Companions still with the traveller at the trip's end did not rise (0.46 → 0.44), and a follower that drops out ends alone.
- **Rate values (§3.4).** Nearer goals keep parties together and straighten days, but days get shorter and the furthest point comes in.

### 5.3 Decision (post hoc, labelled)
- **All four switches are off by default** in the field: `cropFullExp` 0, `patchesPerHa` 9.8, `followCommit` 0, `tripRateValue` 0. Code, registry entries (with the pre-registered values in their notes) and tests stay. This decision declines to adopt changes that failed their pre-registered direction; it tunes nothing.
- **Review item 1:** the field declares no distance cost. `travelDistScaleM` stays at 60,000 m, now evidence "design", with its range widened and the out-of-range flag removed. This replaces §2's choice.
- **Held-out exposure:** party size, straightness, turning and ranges were seen on the check seeds only. No value was chosen from them.

### 5.4 Next levers (diagnosed, not implemented)
1. **Limit or deplete fallback foods** (stage C7's "fallback forage field"). §3.2–3.3 can work only once fruit scarcity costs more than sitting on leaves and pith.
2. **Joint travel that holds.** A follow of a committed traveller should not end at 1.6 × sight; followers should match the traveller's speed. §3.1 fails without this.
3. **Shared goals.** Companions almost never choose the same tree (0–2% in every configuration): each re-decides alone with a ±0.12 candidate jitter, which is larger than the value gaps among the community's known trees.
4. **The landscape cap** (§1.2(3)). Dense food exists only within 1.1 × the nominal radius.

---

## 6. C7c: fallback limits, joint trips with shared goals, an energetic distance cost (rules stated before any run)

29 September 2026. The branch is `main` at 7325dbf (C7b merged, performance changes in), merged forward. C7c follows §5.4 and the integrator's C7c brief.

**Metric roles:** the Taï and Ngogo C12 comparisons are development diagnostics (seen), used here for direction only. The held-out movement validation is a separate dataset that this stage never opens. No parameter is fitted. Every switch is a registry parameter: 0 or unchanged in the compressed profile, and switchable for the ablation rule.

### 6.1 Fallback foods are patchy, depletable and slower than fruit (`fallbackCapH`, `fallbackPatchExp`, `fallbackRegrowDays`, `fallbackRateRatio`; field)

**Rules.** Pith, herbs and sapling leaves stay the forage field on 100 m cells (`forageCellM`), with its habitat and season terms (`forageYield`). They change in four ways.
1. **Intake at full stock is slower than fruit:** `fruitIntakePerH` × `fruitHungerFactor` × `fallbackRateRatio` × habitat, with habitat = `forageYield` ÷ its mean.
   - `fallbackRateRatio` = 0.39 [H]. Energy intake is 10.7 kcal/min on ripe fruit, 3.4 on pith and 6.2 on young leaves [uwimbabazi2019]. Weighted by Kanyawara's feeding shares of pith (17.4%) and young leaves (6.9%) [potts2011], fallback gives 4.2 kcal/min, 0.39 of fruit.
   - At mean habitat that is 0.094 hunger/h, against 0.104 today, but it now depletes.
2. **Patchy:** a cell's stock at capacity is `fallbackCapH` × (p + 1) u^p, with u hashed per cell (no rng) and p = `fallbackPatchExp` 2. The mean is 1; half the cells hold 12.5% of the stock and the richest 10% hold 27%. Design, supported qualitatively: herbs are scarcer at Kibale than at Lomako, and party size is restricted while feeding on them [malenky1994] [M].
3. **Depletable:** stock is measured in feeding-hours at the full rate. A feeder's intake and its removal both scale with the stock left (a linear functional response), so a patch fades while it is eaten.
   - `fallbackCapH` 1.0: a mean hectare holds about one animal-hour of fallback feeding when full (design).
   - Consistency, not the setting: at `fallbackRegrowDays` 30, a 20-member community eating ~1.2 h of fallback per animal per day (0.24 of 309 min [potts2011] [uwimbabazi2019]) needs ~7 km² of fallback area at steady state. That sits inside T-RNG-1's band. It is a risk to that row: see §6.6.
4. **Regrowth:** a deficit decays with `fallbackRegrowDays` 30 (design; herb and sapling regrowth, no source).

**Behaviour.**
- The ground-forage candidate is weighted by the best relative rate the animal can see: its own cell, and neighbouring cells whose edge lies within `sightDayM`.
- While feeding on the ground, an animal walks at the existing forage pace (0.3 × `walkMps`) toward a visible better cell. If its own cell is below half stock and no better cell is visible, it keeps walking on its heading. Otherwise it stays.
- Only the dependants' own ground-forage offer is unchanged.

**Expected direction** (vs the C7a baseline on the same seeds): time stationary ↓, fruit share of feeding ↑ (T-FOOD-2), range kernel ↑ (T-RNG-1). **Keep only if all three hold.**

### 6.2 Joint trips with a shared goal and a waiting initiator (`partyJoinTrip`, `partyWaitMaxMin`; field)

**Rules.**
1. **Shared goal.** A companion whose party-follow candidate would follow an animal on a committed trip to tree T (travel V.TREE, `travelCommit`) instead gets "travel to T" with the same score, the same follow motive, and a note of whom it travels with. It adopts T as its own committed goal.
   - It cannot drop out, because it walks to T itself; the 1.6 × sight follow abandonment never applies.
   - A joiner's own departure alerts its companions ("is moving off", C7a), so recruitment spreads through the party toward the same tree.
2. **Waiting.** The initiator (a trip with no one it travels with) stands still while any joiner of its trip, or party follower of it, is more than `sightDayM` behind and farther from T than it is.
   - Total waiting is capped at `partyWaitMaxMin` 5 min per trip (design), and the trip's bout end is extended by the time waited.
   - Evidence [H]: initiators waited (motionless ≥ 5 s) in 54–58% of initiations and checked back in 26–39% [gruberZuberbuhler2013].
3. **Calling.** Represented by its effect, the recruitment interrupt, not by a sound. A "travel hoo" call kind would need a `CallKind` contract field, which this stage does not add.

`followCommit` (C7b, off) stays off.

**Expected direction:** party size ↑, and companions still in the party at a trip's end ↑ (mechanism check); straightness does not fall by more than 0.02. **Keep only if party size ↑ and companions kept ↑.**

### 6.3 Distance cost from travel energetics (`travelDistScaleM` field 60,000 → 62,900 m, derived)

**Rule.** A trip's value is its food energy net of the walk. The linear score cost per metre is worth × c ÷ E.
- c is the cost of walking a metre.
- E = min(crop × `fruitHungerFactor`, hunger) × E_day is the food energy the trip yields, up to need.
- One hunger unit is about one day's intake: E_day ≈ 2,500 kcal [uwimbabazi2019]. The sim's hunger rises ≈ 1.0 per day.

For a crown that meets the need, worth ≈ hunger × `memTravelHungerW` × (0.55 + 0.45 q), so the cost per metre is `memTravelHungerW` (0.55 + 0.45 q) c ÷ E_day, and hunger cancels. The largest cost is at a full crown (q = 1):

L = E_day ÷ (`memTravelHungerW` × c).

- c = 10.7 · M^0.684 J/m [taylor1982]. At M = 40 kg (design; 33–45 kg) that is 133 J/m = 0.032 kcal/m, which lies within the measured chimpanzee range [sockol2007].
- So L = 2,500 ÷ (1.25 × 0.0318) ≈ **62,900 m** (58–72 km over 45–33 kg).

**What it implies.** Walking 1 km costs ~32 kcal (~1% of a day's energy). Crossing a 3 km range costs 0.05 score, 4–8% of a full crown's value at hunger 1–0.5. A male's 2.4 km day [pontzerWrangham2004] costs ~3% of daily energy. Energetics justify an almost flat distance cost. The C7a value (60 km, a fit) sits on this derivation by coincidence. The real costs of distance are time (§3.4, failed its C7b check) and risk, not energy. This is not 2,000 m, and it was not chosen for party size.

**Expected direction:** no material change vs 60 km (|Δ party size| < 0.15 and |Δ straightness| < 0.02). **Keep unless it moves beyond these tolerances.**

### 6.4 Conditional re-test of the C7b food package (§3.2–3.3) with §6.1 on
With fallback limited, re-test crown fullness (`cropFullExp` 11.9, `cropFullMin` 0.3) and 5.9 food trees/ha together, on top of §6.1–6.3.

**Expected:** range kernel ↑, party size not ↓ (Δ ≥ −0.10), fruit share ≥ 0.60. **Keep only if all three hold**; otherwise they stay off.

### 6.5 Direction check protocol (development diagnostic, not a proof)

**Seeds 3505 and 3606**, never run before and outside 606–1010, 1111–2525 and 48, 7, 21, 5, 11. Paired variants:

| Variant | Settings |
| --- | --- |
| A, C7a | every C7c switch off, 60 km |
| B | A + §6.1 |
| C | A + §6.2 |
| D | A + §6.3 |
| E, C7c | §6.1–6.3 |
| F | E + §6.4 |

Tools:
- `scripts/party-food-metrics.ts`, 60-day burn-in + 6 days: party size, straightness, turning, time stationary, companions kept, fruit eaten.
- `scripts/field-metrics.ts --profile field --days 120 --burn-in 60 --seeds 3505,3606 --workers 2` per variant: T-RNG-1 West 95% kernel, T-FOOD-2 fruit share.
- `scripts/bench-sim.ts --profile field`: A vs E, interleaved.

A direction "holds" when the paired change has the expected sign. No significance is claimed.

### 6.6 Risks
- §6.1's capacity is design. Its consistency check uses a range size inside T-RNG-1's band, so a T-RNG-1 pass after C7c is partly encoded.
- Fallback cells are seen up to `sightDayM` beyond their edge. Knowledge stays local.
- §6.2 changes `candidates.ts` (the party-follow offer) and `execution.ts` (travel tick), both shared files.

---

## 7. C7c direction check and keep/drop decisions (29 September 2026, after the check)

**Run setup:**
- Seeds 3505 and 3606, paired, as in §6.5.
- `main` was merged at 78356ee first. With every C7c switch off, a field world is hash-identical to that `main` after 3 days (seeds 48 and 3303).
- Development diagnostics only: C12 definitions on 30-min fixes; not a proof.
- Raw output in `artifacts/validation/c7c/` (C7b worktree): `diag*.txt`, `field-*.md`.

**`party-food-metrics.ts`** (60-day burn-in + 6 days, ~370 adult-days each):

| Variant | Party size | Straightness | Turning (rad) | Path (m/day) | Stationary half-hours | Companions kept | Fruit eaten |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A, C7a | 2.34 | 0.19 | 1.19 | 1,948 | 0.50 | 0.46 | 5.7 |
| B, + fallback limits | 2.27 | 0.18 | 1.14 | 2,112 | 0.47 | 0.39 | 6.3 |
| C, + joint trips | 2.82 | 0.19 | 1.00 | 2,038 | 0.53 | 0.96 | 5.8 |
| D, + energetic distance | 2.40 | 0.18 | 1.14 | 1,917 | 0.52 | 0.48 | 5.7 |
| E, all three | 2.35 | 0.18 | 1.09 | 2,148 | 0.47 | 0.99 | 6.1 |
| F, E + C7b food package | 1.34 | 0.15 | 1.33 | 4,065 | 0.26 | 0.88 | 3.9 |
| **G, kept (C + D)** | **2.66** | **0.19** | **1.01** | **2,180** | **0.50** | **0.97** | **5.7** |

**Field observer** (`field-metrics.ts`, 60-day burn-in + 120 days):

| Variant | T-RNG-1 West 95% kernel (km²) | T-FOOD-2 fruit share | T-PTY-1 |
| --- | --- | --- | --- |
| A | 2.13 | 0.84 | 2.73 |
| B | 1.83 | 0.95 | 2.71 |
| C | 2.50 | 0.83 | 3.07 |
| D | 2.00 | 0.82 | 2.96 |
| E | 2.72 | 0.96 | 2.90 |
| F | 7.33 | 0.93 | 2.05 (travel share 0.55, feeding 0.25) |
| **G** | **2.23** | **0.82** | **3.16** |

**Bench** (`scripts/bench-ab.ts`, seed 48, days 31–33 after a 30-day burn-in, 3 interleaved rounds, load 12–25): A 251 vs G 257 ms CPU per eco-day, **1.02×**.

**Decisions** (each mechanism against A, by the rule stated in §6):

| Mechanism | Rule | Result | Decision |
| --- | --- | --- | --- |
| §6.1 fallback limits | stationary ↓, fruit share ↑, range ↑ | 0.50 → 0.47; 0.84 → 0.95; **2.13 → 1.83** | **Dropped** (`fallbackCapH` 0) |
| §6.2 joint trips | party ↑, companions kept ↑, straightness not down > 0.02 | 2.34 → 2.82; 0.46 → 0.96; 0.19 → 0.19 | **Kept** (`partyJoinTrip` 1) |
| §6.3 energetic distance | no material change | Δ party +0.06, Δ straightness −0.01 | **Kept** (62,900 m, derived) |
| §6.4 C7b food package | range ↑, party not ↓, fruit share ≥ 0.60 | 2.72 → 7.33; **2.35 → 1.34**; 0.93 | **Dropped** |

**Reading:**
- **Fallback limits.** At the design capacity (one animal-hour per hectare), fallback nearly disappears: ground foraging falls from 6% of half-hours to ~0, and fruit share rises above its band. So the limit removes a food rather than forcing animals to range for it.
  - Combined with joint trips, walk-on ground foragers leave their parties, and party size falls back (E 2.35 vs C 2.82).
  - A workable fallback needs a larger capacity and a tie between party travel and fallback walking. That is a C8 input, not settled here.
- **Food package.** It again makes animals range (T-RNG-1 7.33, inside its band) but as lone searchers: 76% alone, 55% of the day travelling. Scarce fruit with no shared-goal pull toward rich crops breaks parties apart.
- **Kept model (G) vs C7a:**
  - Movers: party size 2.34 → 2.66 (observer 2.73 → 3.16), turning 1.19 → 1.01 rad, 30-min path +12%.
  - Unchanged: straightness 0.19, range kernel 2.13 → 2.23 km², stationary 0.50.
  - Fruit share 0.84 → 0.82.
  - Straightness and range area remain the main open gaps.

---

## 8. C7d: the food package with joint trips; straightness (pre-registration, 29 September 2026)

The branch is `main` at 762a259 (C7c merged: joint trips and the energetic distance cost on; fallback limits and the food package off). Metric roles are as in §6: development diagnostics only, no Gombe files, nothing fitted. New development seeds: **3707 and 3808**, never run before.

### 8.1 The missing combination: food package + joint trips (stated before any run)

**Variants** (paired, seeds 3707 and 3808):
- K: `main` as merged.
- K + food: `cropFullExp` 11.9, `cropFullMin` 0.3, `patchesPerHa` 5.9, as pre-registered in §3.2–3.3.

**Tools:**
- `party-food-metrics.ts`, 60-day burn-in + 6 days.
- `field-metrics.ts --days 120 --burn-in 60`.

**Expected direction:** T-RNG-1 West kernel ↑ vs K, while party size holds. **Keep the food package only if all three hold:**
- T-PTY-1 (observer) ≥ 2.8;
- diagnostic party size (independents, 50 m chain) ≥ K − 0.10;
- T-FOOD-2 ≥ 0.60.

**If party size collapses anyway,** these measures, already in the script, diagnose why:
- adults per fed-in crown, and the hours a crown's crop lasts its feeders;
- visit endings (crop gone vs social);
- trips starting in company and companions kept.

Any crown-sharing mechanism that follows is pre-registered separately (§8.3) before it is run.

### 8.2 Straightness diagnosis (measurement only; seeds 3707 and 3808, K, 372 adult-days)

These measures were added to `party-food-metrics.ts` before any C7d mechanism existed: tick path by activity, day-end → nest distance, nest → last crown distance, distance from the community centre over the day, and goal order. Output: `artifacts/validation/c7d/diag-food.txt` (worktree).

| Measure (K) | Value |
| --- | --- |
| Straightness / turning (30-min fixes, full days) | 0.21 / 0.87 rad |
| Tick path between patches | 0.99. Trips to trees 0.62, **trips toward callers 0.20**, drinking 0.10, party follows 0.04. Within-patch wandering is negligible. |
| 18:00 position → night nest | 5 m median (p90 349 m) |
| Night nest → last crown fed | 39 m median |
| Distance from the community centre at 07:00 / 12:00 / 18:00 | 384 / 395 / 385 m |
| Furthest point of the day / net 07:00 → 18:00 | 683 m / 365 m (37% of the excursion given back) |
| Goal order (initiators) | chosen tree 318 m away vs the nearest remembered or known tree believed at least 0.8 as good 122 m; ratio median **1.88**; within 1.2× only 35% |
| Consecutive trips | median turn 1.93 rad (uniform 1.57), 34% reversals (uniform 20%) |

**Diagnosis:**
1. **Not a nightly return.** Nests are where the day ends and next to the last crown, and there is no central place: distance from the centre is flat through the day. Nest-site choice is not the lever.
2. **Not within-patch wandering.** Almost all path is travel between patches.
3. **Goal order is effectively random among comparable trees.** The candidate jitter (±0.12) is much larger than the energetic distance cost (~0.005 score per 300 m), so an initiator picks among comparable known trees almost blind to distance. Successive trips then point anywhere, with a backward bias.
4. **A fifth of the path is travel toward callers,** in directions unrelated to the day's route; a tenth is trips to water.

### 8.3 Route chaining (`routeChain`, field; stated before any run of it)

**Rule.** Among out-of-sight goals (remembered and community-known trees), the animal ranks trees by believed value per metre, worth ÷ max(d, `memoryTreeMinM`). Only the best-ranked tree is offered, at its usual score (worth − the energetic distance cost − revisit), instead of the four best by score.
- This is the nearest-unused-known-resource rule, weighted by value. It is the simplest rule consistent with the efficient paths of primates choosing among many remembered goals [janson2014] [M].
- Trees believed empty stay out through the C7a crop beliefs; trees just fed in stay out through the C6b revisit penalty. So a day chains nearby trees without going back.
- No free parameter.
- Crowns in sight keep their scoring.

**Expected direction** vs K, same seeds:
- primary: straightness ↑ and turning ↓;
- mechanism check: goal-order ratio falls and the share within 1.2× rises;
- guards: T-RNG-1 not down by more than 10%, diagnostic party size not down by more than 0.10.

**Keep only if the primary directions and both guards hold.**

**Not built:**
- **Crown-sharing capacity from crown area.** No source gives a feeding area per animal, and a party-size rule tied to crown size would encode the held-out T-PTY-2 (party size vs patch size).
- **Changes to caller or water trips.** No source-grounded rule is in hand. They are reported as open.

### 8.4 C7d results and decisions (after the check)

Seeds 3707 and 3808, paired. `party-food-metrics.ts` ran 60-day burn-in + 6 days; `field-metrics.ts` ran 60-day burn-in + 120 days. Every variant passes `routeChain` explicitly. A first field run was stopped and discarded because it would have loaded the route-chaining code mid-run. Output: `artifacts/validation/c7d/` (worktree). Development diagnostics only.

| Variant | T-RNG-1 (km²) | T-PTY-1 | Party size (diagnostic) | T-FOOD-2 | Straightness | Turning (rad) | Path (m/day) | Goal-order ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K (`main`) | 2.71 | 2.90 | 2.14 | 0.79 | 0.21 | 0.87 | 2,014 | 1.88 |
| K + food package | 7.53 | **2.26** | **1.59** | 0.66 | 0.18 | 1.30 | 3,629 | 1.30 |
| K + route chaining | 2.58 | 4.27 | 4.43 | **0.53** | 0.26 | **1.59** | **795** | 1.00 |

Other effects:
- The food package's travel share is 0.52.
- Route chaining shrinks trips to a median 59 m and cuts fruit eaten from 5.8 to 4.3 units per community-day.

**Decisions:**
- **§8.1 food package with joint trips: dropped.** Range rose into the band, but T-PTY-1 is 2.26 (< 2.8) and the diagnostic party size fell 0.55.
  - **Why party size still collapses.** Joint trips still bring companions to the same tree: 97% are still together at arrival. Then they cannot feed together.
    - Crowd: adults per fed-in crown 1.06 (1.13 in K).
    - Crop life: a crown's crop lasts its feeders 1.1 h (3.8 h in K).
    - Endings: 58% of visits end with the crop gone.
  - **Against the field.** In K a median crown holds ~4 feeding-hours, which would feed a party of 7 for ~35 min, in line with Kibale patch residency of 27–46 min per visit for feeding parties of 7–8 [potts2011]. With the package, it would feed them for ~10 min.
  - So the package makes crowns too small for a party's visit. Crowns in K are already about the right size for real parties; what K lacks is parties feeding together, not food.
  - A crown-sharing capacity was not built: no source gives a feeding area per animal, and it would encode T-PTY-2.
- **§8.3 route chaining: dropped.** Straightness rose (0.21 → 0.26) and both guards held (T-RNG-1 −5%; party size +2.3), but turning rose (0.87 → 1.59 rad). The mechanism worked as intended (goal-order ratio 1.88 → 1.00); strict value-per-metre ranking just makes trips so short (59 m) that the day collapses (795 m/day) and animals fall back on ground food (fruit share 0.53).

**Straightness, where it stands:**
- The diagnosis stands: goals are chosen almost blind to distance, and a fifth of the path is travel toward callers (§8.2).
- Neither extreme works. A near-flat distance cost (energetic) leaves goal order random; ranking by value per metre over-chains.
- An intermediate rule would need a distance-value trade-off with a free scale, which this stage does not fit. The time-rate rule (§3.4) is the only scale-free candidate so far, and it shortened days in C7b. Open for the integrator.

---

## 9. C7e: a declared calibration of the goal-distance scale (declared before fitting, 29 September 2026)

The branch is `main` at cf7a493 (C10 and travel hoos merged; field hashes changed), merged forward. Validation roles: Taï and Ngogo are the development (fitting) set; the Gombe paths are held out and never opened here. The fitted value is labelled **"fitted (C7e) against Taï"** in the registry notes and here.

### 9.1 The parameter
**`goalDistScaleM` = D (metres; field; 0 = off, the C7c/C7d behaviour, where the four best out-of-sight trees by score are offered).**

**Functional form.** With D > 0, every out-of-sight goal (remembered or community-known tree) is ranked by

> (worth − revisit) × D ÷ (D + max(d, `memoryTreeMinM`)),

a hyperbolic distance discount. Only the top-ranked tree is offered, at its usual score (worth − the energetic distance cost − revisit − the usual terms). So D sets goal order only, not how attractive travel is.

- As D → 0 the rank tends to value per metre: route chaining (§8.3).
- As D → ∞ the rank is believed value alone: no distance preference.
- Crowns in sight keep their scoring.

**Prior range: 50–3,200 m.**
- The lower end sits near the spacing of goal trees (the nearest comparable tree is a median 122 m away, §8.2; `memoryTreeMinM` is 35 m). Below it D reproduces route chaining, already tested.
- The upper end is about a range diameter (~3 km for a 7 km² range). Beyond it the discount barely reorders goals within a range.
- Grid: **50, 100, 200, 400, 800, 1,600, 3,200 m** (log-spaced), plus off.

### 9.2 Fitting targets, loss and instrument
**Targets** (development diagnostics, Taï; C12 definitions):

| Statistic | Target |
| --- | --- |
| Straightness of full-day follows | S* = 0.50 |
| Turning angle between 30-min steps (both ≥ 15 m) | T* = 0.76 rad |
| Path per hour | R* = 314 m/h |

**Loss:** L = ⅓ ((S − S*)/S*)² + ⅓ ((T − T*)/T*)² + ⅓ ((R − R*)/R*)².
- Relative squared errors with equal weights: all three are robust path-shape gaps.
- Path rate guards against the over-chaining collapse seen in §8.4.

**Instrument:** `scripts/compare-movement.ts --seeds 3909,4010 --years 0.25 --burn-in 60 --workers 2 --params {…}`, run with `--out` and `--guide` redirected to `artifacts/validation/c7e/`. The sim statistic is the scorecard's sim value for each row.
- **Seeds 3909 and 4010:** development seeds, never run before, outside 606–1010, 1111–2525 and 48, 7, 21, 5, 11.

**Decision rule:**
- D* = the grid value with the least L.
- It stays **on by default only if L(D*) < L(off)**; otherwise off, and said so.

### 9.3 Second declared candidate: the food package (discrete)
- At D*, the food package (`cropFullExp` 11.9, `cropFullMin` 0.3, `patchesPerHa` 5.9) is scored by the same L, on vs off.
- **Constraint (not a target):** T-PTY-1 ≥ 2.8, from `field-metrics.ts --days 120 --burn-in 60 --seeds 3909,4010 --workers 2`.
- The package is chosen only if it is feasible and lowers L.

### 9.4 Report at the chosen setting
The loss surface; every C12 development row from `compare-movement.ts`; the field observer's T-* rows; `party-food-metrics.ts` (party size, stationary share, goal order); and the bench (`scripts/bench-ab.ts`, off vs chosen).
