# Food landscape: evidence, design and pre-registration

Status: design for the integrator, 1 October 2026. Nothing is implemented. The only computations are statistics of the Ngogo phenology record and a probe of the field world at creation (no simulation ticks); scripts in `artifacts/validation/party/` (`phen_stats.py`, `allometry.py`, `landscape-probe.ts`).

The brief: fewer, larger crops at the same total food, so a big crown feeds a party for hours and is worth coming back to.

## 1. What the sources say

Sources are in docs/research.md ("Food landscape: tree size, crop size and patch use").

| Quantity | Field value | Source |
| --- | --- | --- |
| Feeders per patch | 7.3 (Ngogo), 8.4 (Kanyawara); range 1–40 | potts2011 |
| Patch residency per visit | 27–46 min | potts2011 |
| Feeding time per party visit | 3.3–6.5 chimp-hours (derived) | potts2011 |
| Size of the patches used | 63–67 cm DBH | potts2011 |
| DBH of trees in fruit, Ngogo | median 68 cm, 90th percentile 132, 99th 200 | potts2020 (data, derived) |
| Concentration among fruiting tree-months | largest 10% hold 23% of summed DBH, 39% of summed basal area | potts2020 (data, derived) |
| Crop estimator | DBH is the most accurate estimator of a fruit crop; no exponent given | chapman1992 |
| Fruiting crowns | 0.5–0.9 per ha (derived); one every 97 m of transect | janmaat2016, potts2020 |
| Large ripe crops | one per 10–21 km of transect: about 0.5–1% of fruiting trees | janmaat2016 |
| Over-half-full crowns | at least 9 times scarcer than others | janmaat2016 |
| Feeding time per day | 309 ± 85 min (Kanyawara females) | uwimbabazi2019 |

**Wild numbers aimed at.**
- A used crown supplies one party visit: 3.3–6.5 chimp-hours.
- Feeders per crown: 5–17% of the community (7.3 of about 150; 8.4 of about 50). For the model's communities of 13–20 that is about 2–3.
- Bout length: 27–46 min per crown.
- Fruiting crowns: 0.5–0.9 per ha, with large ripe crops about 1 in 100–200.

## 2. Where the model stands (field world, seed 48, at creation; existing 1-year outputs)

- 24,217 trees (10.8 per ha of patch zone); 2,062 in fruit at a time (0.92 per ha): inside the field range. That is 42 fruiting crowns per chimp.
- Standing ripe crop: 1,010 units, or 9,200 chimp-hours of feeding. The 49 chimps eat about 2–3% of it per day.
- Crop per fruiting crown: median 0.47 units, 90th percentile 0.79, 99th 1.14. The largest 10% hold 19%.
- A median crown is 4.3 chimp-hours of feeding. **That is one wild party visit (3.3–6.5 chimp-hours).** It reads as "one to two meals" only because a model meal is 2.3 h of feeding in one crown (hunger 0.55 ÷ 0.24 per hour), against a wild visit of 27–46 min.
- Feeding trees per day 5.3 (T-FOOD-4); feeding is 43% of daylight. *Corrected by measurement (docs/staging/moving-together-prereg.md §1): a crown visit lasts 39 min (median) and removes 13% of a day's need, both inside the field values. The "2.3 h meal" above is the time to sate from hunger 0.55, which animals rarely do in one crown (6–8% of visits end sated).*
- Feeders per occupied crown 1.2; T-FOOD-11 202 m per fruiting tree (band 60–160).

## 3. What that means for the brief

- **The evidence does not show that the model's crowns are too small.** Wild parties of 7–8 feed in ordinary fruiting trees (63–67 cm, the median of trees in fruit), and a median model crown holds one such visit.
- **Concentration is close under the sourced estimator.** With the crop proportional to DBH, the record's largest 10% hold 23%; the model's hold 19%. Only under basal area (a design choice) is the gap large (39%).
- **The model does compress the range between species.** Capacity medians run from 0.39 (*Celtis*) to 0.85 (*Ficus mucuso*), a factor of 2.2. The DBH medians run from 19 to 98 cm, a factor of 5. And it has almost no large class: the 99th percentile is 2.4 times the median, against 3.0 for DBH in the record.
- **So a sourced landscape correction exists, but it is modest**, and the missing piece is more likely how animals use a crown: in the field a party arrives, feeds for half an hour and leaves together. In the model each animal arrives alone and stays about an hour. The cohesion re-fit showed that holding animals back costs food (docs/staging/party-size-prereg.md §6); moving together is the untested alternative.

## 4. The change (as briefed; not implemented)

Field profile only. Two switches; both off is today's model, hash-identical.

### 4.1 `cropAllometry`: crop capacity from tree diameter

- Each tree gets a DBH from its species' distribution in the Ngogo record: lognormal with the species' median and log-spread (docs/research.md; [H] data, potts2020). *Ficus sansibarica* is absent from the record under that name and takes *Ficus natalensis*'s values.
- The DBH is the quantile that matches the tree's existing crown-radius draw, so larger crowns have larger trunks and no new random number is drawn. Tree count and positions do not change (9.8 per ha stays at its sourced prior).
- Capacity = k × DBH. DBH as the estimator is [M] (chapman1992); the exponent 1 is the estimator as published. Basal area (exponent 2) is the alternative: it leaves 30% of trees below the feeding threshold and needs a floor, so it is not proposed.
- k is set per world so that the summed capacity equals today's. **Total food is constant by construction.** It replaces the species crop constants and `cropSkewExp` (both design) when on.
- Result (arithmetic on the model's species mix): capacity median 0.42, 90th percentile 1.06, 99th 2.34, largest about 7 units; the largest 10% hold 29%. Crowns of 2 units or more (18 chimp-hours): 1.7% of trees, none today.
- The value scale keeps its rank: `fruitValueRef` (1 unit, which is the 96th percentile of capacity today) becomes the 96th percentile of the new capacities (about 1.6), so "a full crown" still means the top few percent. Design rule, no new parameter.
- Ripening, fall, depletion and intake rates are unchanged.

### 4.2 `revisitByCrop`: a crown is devalued by what was taken from it

- Today a crown just fed in loses 0.5 for about 12 h whatever its size (`revisitW`, design).
- With the switch: the loss is multiplied by 1 − min(1, believed crop ÷ value scale). A crown believed still full keeps its worth; an emptied one loses the whole 0.5.
- Design form, no new parameter. Direction: large fruit trees are monitored and revisited within days (janmaat2013a; normand2009; ban2014).
- It encodes the direction of T-FOOD-6 (held out), which gets the labels "encoded" and "model revised post-freeze".

## 5. Rows and predictions

Check: 150 days after a 30-day burn-in, seeds 48 and 7, three arms (off; 4.1; 4.1 + 4.2).

| Row | Now | Predicted, both on | Confidence |
| --- | --- | --- | --- |
| Capacity held by the largest 10% (probe) | 0.19 | 0.29 | arithmetic |
| Feeders per occupied crown (truth) | 1.2 | 1.25–1.5 | low |
| T-PTY-1 | 2.6–2.7 | 2.6–3.0 | low |
| T-PTY-2, patch R² | 0.016 | 0.03–0.12 | low |
| T-FOOD-6, revisit interval | 15.6 d | 8–13 d | low |
| T-FOOD-10, breakfast planning | 0.013 | unchanged: no rule plans a pre-dawn departure | high |
| T-FOOD-11 | 202 m | 200–230 m; still outside 60–160 | moderate |
| T-RNG-4 | 2.5 km | 2.4–3.0 km | low |
| T-FOOD-2, fruit share | 0.90 | 0.86–0.90 | low |
| T-RNG-1 | 2.5 km² | not resolvable in 150 days (annual); the 150-day kernel is read as indicative only | — |
| Viability | adult median hunger 0.33–0.36 | within 0.03 of off; no starvation | moderate |

**I expect the party rows to move little.** The landscape is close to the sources already (§3).

## 6. Guard and re-fit (pre-registered)

- G1: both switches off reproduce the field model (hash).
- G2: T-ACT-1 (0.33–0.5), T-ACT-2 (0.12–0.25), T-ACT-3, T-ACT-4 and T-RNG-4 (1.5–3.5 km) stay in band with the change on.
- G3: adult and lactating median hunger at most 0.03 above the off arm; no starvation death the off arm lacks.
- G4: summed capacity equal to the off world's (to rounding); mean feeders per occupied crown higher in the top third of crowns by crop than in the bottom third, each seed.
- **Fitted rows.** C5a tuned `fruitIntakePerH`, `fruitHungerFactor` and `fallbackForageW` to T-ACT-2 and T-RNG-4; C7a set `patchesPerHa` to its sourced prior. Nothing is re-fitted unless G2 fails.
  - If T-ACT-1 or T-ACT-2 leaves its band: one knob, `fallbackForageW`, by bisection between 0.30 and 0.65 (at most 5 steps), reading T-ACT-1 and T-ACT-2 only.
  - `patchesPerHa` is not re-fitted to T-FOOD-11.
  - Held-out rows are reported before and after, untuned.

## 7. The shortest test and what it cannot resolve

- 2 seeds × 3 arms × 180 simulated days, observer rows plus the truth reads of the party check: about 15 minutes at 2 workers.
- It resolves: T-PTY-1, T-PTY-2 (5 monthly means), T-FOOD-2, -6 and -11, the activity guard, hunger.
- It cannot resolve: T-RNG-1 (annual range), T-FOOD-10 (no mechanism), demography, between-year variation.
