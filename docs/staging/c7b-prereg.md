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
