# E1q pre-registration: what climbing costs

Status: complete (4 October 2026): audit (§2.4: the target's climbing equation; the model's re-climbs), iteration 1 `crownMove` (§4–§7: C a provisional keep candidate as a correction, CW recommended for a confirm). Skeleton committed at the start of the stage (branch `e1q-climbing-energy`, from `track-e` c39488f),
before any run and before any code change. Track E, stage E1q, an input audit. Rule served: field values of behaviour are
targets, never inputs; a physiological input (a cost, an efficiency) may be corrected from sources, never set to reach a
day range, a travel share, a reserve trend or the walking-to-climbing ratio itself.

## 0. The problem

- E2j (e2j-prereg.md §2.3, §8): in the model a chimpanzee spends 1/1.2–1/2.2 as much energy climbing as walking (walking
  ÷ climbing energy per day: S22 1.18 / 1.51 / 1.30 for males, nursing mothers, juveniles; S22 + `walkGait` 1.48 / 1.99 /
  1.73), against about 1/10 in wild Kanyawara chimpanzees ("chimpanzees spend approximately ten-times more energy per day
  on terrestrial travel than on vertical climbing", pontzerWrangham2004, abstract, [M]).
- With E2i's body-set walk (`walkGait`) more trips mean more climbs: S24 (S22 + `walkGait`) failed its confirm (held-out
  worse beyond noise; nursing mothers −0.090, juveniles −0.108, infants 0.5–2 y −0.133 %/day), and E2j's two corrections
  (`tripBodyCost`, `youngArrival`) did not settle it within two draws.
- The gap can come from (a) metres climbed per day (too many climbs, too high, climbs per crown visit), (b) the cost per
  metre (`ledgerClimbEff` 0.2 → 49 J/kg/m in the ledger; `rhythmClimbJ` 107.4 × M^−`rhythmClimbExp` in the heat balance;
  research.md's table: 49–70 J/kg/m resting on primates under 1.5 kg or on m·g·h at 20% efficiency), or (c) descent
  charged like ascent.

## 1. Plan

1. **Audit and diagnosis** (§2, registered before its runs), S25 in quick mode (seeds 48 and 7, burn-in 30, 30 days),
   simulation truth, and the same with `walkGait` 1: per class, climbs per day, metres climbed and descended, energy per
   climb and per metre, walking ÷ climbing energy; then the sources' value for each term, each with its evidence level.
   Name the term that makes climbing expensive, with numbers, and whether it is an input the sources correct (as E1h's
   food energy) or a behaviour the model produces.
2. **Correction or mechanism** behind a new switch (0 = today), only for the term implicated: a sourced input correction
   (tagged by evidence level) or a mechanism; no value chosen to hit a ratio or a rate. Arms: S25 + switch, S25 +
   `walkGait` 1 + switch (quick), judged against the integrator's four S25 quick realizations (S25q, S25q1–3 by
   `rngSalt`, bench-run2 7cd6bb1) by e-noise.md amendment 2 with amendment 3's rare rows.
3. At most three iterations, each logged here and committed before its run.

## 2. Step 1: audit and diagnosis (registered 4 October 2026 before its runs)

**What the code does (read at c39488f, field profile).**
- *Movement* (execution.ts `moveTo` :107–181): an animal above 0.05 m whose goal is more than 3 m away horizontally
  descends to the ground first (at `climbMps` × 1.4 × the movement factor, :139), walks, and climbs only within 3 m of the
  goal (at `climbMps` × the factor, :173). So every crown, nest, groomed, followed or played-with animal above the ground
  is a full climb from the ground, and any move of more than 3 m between two perches is a descent and a new ascent.
  Crowns are fed at 45–73% of the tree's height (forageTick :1011), trees 8–26 m (generation.ts SPECIES); an infant
  feeding with its mother goes to her position (:1012–1013).
- *Ledger* (energy.ts energyTick :497–505, rideTick :543–551): each tick, the horizontal metres moved cost sockol2007's
  net 3.8 J/kg/m (`ledgerWalkJPerKgM`), the metres gained in height cost mass × g ÷ `ledgerClimbEff` (0.2: 49 J/kg/m);
  descent is free (dy ≤ 0 charges nothing; stylized); a carried infant's metres are charged to its carrier at the
  infant's mass. Time costs the resting rate × 1.25 or × 1.38 (forage), climbing time included, under "activity".
- *Heat balance* (rhythm.ts :97–102): climbing a metre adds `rhythmClimbJ` × M^−`rhythmClimbExp` − 9.8 J/kg of heat
  (107.4 × M^−0.119: about 70 J/kg/m at 35 kg, hannaSchmitt2011's small-primate regression extrapolated), i.e. a cost
  per metre about 1.4 × the ledger's: the two modules disagree (a known defect, §6).
- *Valuation* (intake.ts `netRateShare`, candidates.ts): a crown or trip charges the climb to the crown at the ledger's
  cost per metre (`locomotionKcal`), the descent's energy never.

**Tool.** `scripts/climb-diagnose.ts` (E2j; reads only: `energyTap` and the world after each tick; its walk, climb and
carry kcal equal the ledger's books to 0.1 kcal/day). Readouts used here, per class (energy-diagnose's classes) per
animal-day, simulation truth:
- ascents (a run of up ticks of an animal not carried, `ascentsPerDay`), by act (crown approach, nest, care follow,
  other); metres climbed (`total.upM`) and descended (`total.downM`) by act; mean ascent height (`meanAscentM`); descents;
- own walking and climbing kcal (the ledger's formula on the ledger's move filter, `total.walkK`, `total.climbK`), by
  act; carrying (walking and climbing parts) for carriers;
- derived: energy per ascent (climbK ÷ ascents), per metre climbed (climbK ÷ upM ÷ mean mass: must equal 49 J/kg/m),
  walking ÷ climbing energy (own; and own + carrying);
- crown visits per day (`crownsPerDay`) and crown-approach ascents per crown visit.

**Readouts added before the runs (amendment of the tool, measurement only; defined now, smoke-tested on 2 days before
any run):**
- *ground gap of an ascent*: for each ascent, the horizontal distance and the time on the ground since the end of the
  animal's previous descent, and whether the previous perch and the new one are in the same tree (nearest tree within
  its crown radius of the perch; trees by `index(world).treeById` and positions); binned: re-climb in place (gap < 3 m),
  3–10 m, 10–30 m, ≥ 30 m, no previous descent in the window. A move of under ~10 m between two perches is one a
  climbing animal could make in the canopy (adjacent crowns), a move of under 3 m is a re-climb at the same spot.
- *ascent height by act* (metres per ascent, crown approach, nest, care follow, pair approach, other).
- *perch height* at the end of each ascent (mean and p10/p50/p90), against the trees' heights.
- Smoke test (2 days of S25, seed 48, burn-in 1 day; before any run): every readout fills; the ascents by key sum to
  `ascentsPerDay` (14.79 against 14.8 for adult males); the cost per kg and metre climbed reads 49.05 J/kg/m in every
  class (the ledger's own number). Not a result (one seed, 2 days, no burn-in).

**Runs** (quick: seeds 48 and 7, burn-in 30, 30 days, field profile; from a frozen detached checkout of the commit that
registers the tool amendment): climb-diagnose on S25 (S25q-params.json) and on S25 + `walkGait` 1; energy-diagnose on S25
+ `walkGait` 1 (S25's is the integrator's S25q-energy.json and its three re-draws). The integrator's S25 e-bench and
energy JSON are the reference; not re-run.

**What names the term (registered now).** For each class, climbing energy per day = ascents × metres per ascent × the
cost per metre × mass. The sources' value of each factor (wild chimpanzees where it exists, else primates or physics,
each with its evidence level) is set beside the model's. The term named is the factor whose model ÷ source ratio carries
most of the model's ÷ wild ratio of climbing energy (log share), read with the counts that make it. It is an *input*
if the factor is a cost the model takes from a parameter (cost per metre, descent cost) and the sources give another
value; a *behaviour* if it is a count or a height the model produces (ascents, metres per ascent, re-climbs). If the
sources cannot give a wild value for a factor, the factor is reported as unaudited, not named. A factor implicated as
a behaviour leads to a mechanism (step 2), not to a cost change; a factor implicated as an input leads to a sourced
correction tagged by its evidence level, never to a value chosen for the ratio.

### 2.1 Diagnosis results, the model's side (frozen checkout 398a5c3, clean; quick, seeds 48 and 7, 30 + 30 days; every number printed by the stage's scripts `tables.py`, `climbtable.py`, `equations.py` from the JSON in the stage's scratch directory, `runs/`)

S25 = the integrator's S25q parameters (climb-diagnose run here: its walk and climb kcal equal S25q-energy.json's books,
69.5 / 57.0 kcal/day for males); W = S25 + `walkGait` 1 (climb-diagnose, e-bench, energy-diagnose).

```
| readout (per animal-day) | males: S25 → W | other females: S25 → W | nursing mothers: S25 → W | juveniles 5–12 y: S25 → W | infants 2–5 y: S25 → W | infants 0.5–2 y: S25 → W |
| ascents/day | 13.1 → 15.1 | 10.3 → 11.4 | 9.8 → 11.9 | 15.1 → 17.6 | 9.3 → 12.6 | 8.5 → 10.6 |
| metres per ascent | 9.5 → 9.5 | 9.7 → 9.4 | 9.5 → 9.7 | 9.0 → 9.4 | 9.2 → 9.3 | 8.4 → 8.6 |
| metres climbed/day | 125 → 144 | 99 → 108 | 94 → 115 | 136 → 166 | 86 → 117 | 71 → 91 |
| metres descended/day | 125 → 144 | 99 → 108 | 93 → 115 | 136 → 166 | 58 → 83 | 57 → 71 |
| climb kcal/day (own) | 57.0 → 65.7 | 36.4 → 39.7 | 34.3 → 42.1 | 43.4 → 52.5 | 11.5 → 15.8 | 6.0 → 7.6 |
| kcal per ascent | 4.36 → 4.34 | 3.55 → 3.47 | 3.50 → 3.55 | 2.86 → 2.98 | 1.24 → 1.26 | 0.70 → 0.72 |
| J per kg per metre climbed | 49.05 → 49.05 | 49.05 → 49.05 | 49.05 → 49.05 | 49.05 → 49.05 | 49.05 → 49.05 | 49.05 → 49.05 |
| walk kcal/day (own) | 69.5 → 97.9 | 43.9 → 58.8 | 56.9 → 76.5 | 63.5 → 84.7 | 7.4 → 6.2 | 3.1 → 2.8 |
| walk ÷ climb, own | 1.22 → 1.49 | 1.21 → 1.48 | 1.66 → 1.82 | 1.47 → 1.61 | 0.64 → 0.39 | 0.52 → 0.37 |
| walk ÷ climb, with carrying | 1.22 → 1.49 | 1.21 → 1.48 | 1.87 → 2.07 | 1.47 → 1.61 | 0.64 → 0.39 | 0.52 → 0.37 |
| crown visits/day | 9.7 → 11.0 | 7.7 → 8.7 | 8.1 → 9.2 | 10.2 → 11.1 | 5.1 → 5.0 | 1.5 → 1.2 |
| crown-approach ascents per crown visit | 0.87 → 0.90 | 0.84 → 0.85 | 0.84 → 0.87 | 0.82 → 0.86 | 0.23 → 0.15 | 0.36 → 0.17 |
| metres/day: to crowns | 89 → 104 | 68 → 76 | 70 → 86 | 84 → 101 | 11 → 6 | 5 → 2 |
| metres/day: to nests | 10 → 10 | 11 → 11 | 10 → 9 | 10 → 11 | 1 → 0 | 0 → 0 |
| metres/day: behind a carer | 0 → 0 | 0 → 0 | 0 → 0 | 5 → 12 | 61 → 89 | 48 → 66 |
| metres/day: to a partner or other social | 24 → 28 | 20 → 20 | 12 → 18 | 33 → 37 | 11 → 19 | 16 → 21 |
| metres/day: other acts | 2 → 2 | 1 → 1 | 1 → 2 | 5 → 5 | 3 → 3 | 1 → 2 |
| share of metres climbed after a ground gap < 10 m | 0.36 → 0.28 | 0.38 → 0.31 | 0.33 → 0.30 | 0.44 → 0.41 | 0.75 → 0.70 | 0.78 → 0.75 |
| climbing min/day (up + down) | 21.9 → 25.2 | 18.3 → 20.0 | 16.6 → 20.2 | 26.8 → 32.5 | 19.4 → 25.9 | 20.1 → 24.9 |
```

Walking ÷ climbing energy per day (energy-diagnose, the ledger's books), S25's four runs against W: males 1.22 / 1.24 /
1.24 / 1.12 (1.21 ± 0.05) → 1.49; other females 1.17 ± 0.07 → 1.48; nursing mothers 1.52 ± 0.12 → 1.82; juveniles 1.35
± 0.09 → 1.61; infants 0.4 (they climb behind their mothers and walk little). W's bench: fitted z −0.6, held-out z +0.1,
without the rare rows z +0.5 (inside noise); T-RNG-4 2.24 (S25 1.52 ± 0.10), T-ACT-2 0.108 (below its band; 0.163 ±
0.005), T-FOOD-10 0.613 (0.499 ± 0.032); reserves inside S25's spread in this draw.

The same metres costed by other published equations (`equations.py`; mass derived from the ledger's own climb kcal):
walking ÷ climbing for males / other females / nursing mothers / juveniles on S25 = 1.22 / 1.21 / 1.66 / 1.47 (the
model: sockol2007's net 3.8 J/kg/m; 49.05 J/kg/m up, descent free); 1.52 / 1.51 / 2.07 / 1.83 with climbing at m·g·h ÷
0.25 (39.2 J/kg/m); 1.35 / 1.43 / 1.97 / 1.81 with taylor1982's net walking cost and m·g·h ÷ 0.25; 0.92 / 0.98 / 1.35 /
1.24 with descent charged as negative work (m·g·h ÷ 1.2); 4.1 / 4.4 / 6.0 / 5.5 with taylor1982's gross walking cost at
0.83 m/s and nguessan2009's human rock-climbing climb (≈ 22 J/kg/m net). No combination of sourced costs reaches 10 on
the model's metres.

### 2.2 Amendment 1 (registered 4 October 2026 after §2.1 was read, before the readout it adds was run on S25 and W)

A third of adults' metres climbed (and three quarters of infants') follow a ground gap of under 10 m. Whether those
re-climbs return into the crown the animal just left is what a movement rule (moveTo descends for any goal more than 3 m
away) would decide, so one readout is added to climb-diagnose (header, "Crown of a perch"): each ascent that starts on
the ground after a descent is classed by the crown it ends in against the crown that descent began in (same crown,
touching crown, other crown, no crown), with its metres. Smoke-tested on 2 days of S25 (seed 48, burn-in 1 day): fills;
the classes sum to the ascents from the ground after a descent (12.93 a day for adult males). Run on S25 and W from a
frozen checkout of the commit that registers it; the earlier outputs are kept beside them.

### 2.3 Amendment 1 results (frozen 95786a8, clean; `crowntable.py` from the JSON)

Ascents that start on the ground after a descent, by the crown they end in against the crown the descent left (metres a
day; share of the class's metres climbed), S25 → W:

```
| class | metres climbed/day | same crown | touching crown | other crown | no crown | same crown, by act (m/day) |
| adult male | 125 → 144 | 39 (32%) → 39 (27%) | 4 (3%) → 3 (2%) | 71 (57%) → 91 (63%) | 3 (2%) → 4 (3%) | S25: crown approach 19, social other 10, pair approach 6, nest 5 |
| female, other | 99 → 108 | 33 (33%) → 30 (28%) | 5 (5%) → 2 (2%) | 57 (57%) → 72 (66%) | 1 (1%) → 1 (1%) | S25: crown approach 13, social other 10, nest 5, pair approach 3 |
| female, lactating | 94 → 115 | 29 (31%) → 32 (28%) | 2 (3%) → 2 (2%) | 58 (62%) → 75 (65%) | 1 (1%) → 2 (2%) | S25: crown approach 13, social other 7, nest 5, pair approach 3 |
| juvenile 5–12 y | 136 → 166 | 46 (34%) → 56 (34%) | 7 (5%) → 4 (2%) | 65 (48%) → 84 (50%) | 12 (9%) → 16 (10%) | S25: crown approach 19, pair approach 13, social other 7, nest 4 |
| infant 2–5 y | 86 → 117 | 41 (47%) → 47 (40%) | 4 (4%) → 5 (4%) | 12 (13%) → 11 (9%) | 25 (29%) → 48 (41%) | S25: care follow 27, pair approach 7, crown approach 3 |
| infant 0.5–2 y | 71 → 91 | 35 (49%) → 41 (46%) | 4 (5%) → 3 (3%) | 9 (12%) → 9 (10%) | 19 (27%) → 32 (35%) | S25: care follow 22, pair approach 11 |
```

A third of adults' and juveniles' metres climbed, and about half of infants', are climbs back into the crown the animal
has just come down from: moveTo sends any animal whose goal is more than 3 m away horizontally to the ground first, so a
move across its own crown (to another feeding place, a partner, a nest site, a mother) is a descent and a full new climb.
Infants' "no crown" re-climbs mostly start beside a crown's edge (a throwaway check on 3 days of S25, not committed: 125
of 273 infants' re-climb descents begin inside a crown, 71 within 3 m outside it).

### 2.4 Sources per term (read 4 October 2026; e-sources.md and research.md "Addendum: E1q climbing")

**What the target is made of.** pontzerWrangham2004's ratio ("approximately ten-times more energy per day on terrestrial
travel than on vertical climbing", abstract, [M] as a measurement of distances) was computed with published equations.
couturier2022 (FT, PMC8996920; Sebitoli, Kibale) transmits them [L]: climbing O₂ = walking O₂ at 1.9 m/s (mermier1997's
human rock climbing), "tested on wild chimpanzees by Pontzer and Wrangham", per vertical metre at an ascent speed of 0.5
m/s "estimated by Pontzer and Wrangham"; walking O₂ = 0.523 M^−0.298 v + 0.345 M^−0.157 mL kg⁻¹ s⁻¹ (eqs 4–7), 4.8 kcal
per L O₂. With wilson2021's day ranges for Kanyawara (males 2.4, females 2.0 km, [L]) and Hunt's walking speeds
(nguessan2009, [L]) (`target_audit.py`, derived):

```
| sex | mass kg | day range km | walking speed m/s | basis | walking J/kg/m | climbing J/kg/m | climbing efficiency (9.81 ÷ cost) | vertical m/day implied by a ratio of 10 | ratio with the model's costs (3.8, 49.05) on those metres |
| male | 39.0 | 2.4 | 0.88 | gross | 7.95 | 21.19 | 46% | 90 | 2.06 |
| male | 39.0 | 2.4 | 0.88 | net | 3.53 | 13.40 | 73% | 63 | 2.94 |
| female | 31.3 | 2.0 | 0.78 | gross | 8.94 | 22.37 | 44% | 80 | 1.94 |
| female | 31.3 | 2.0 | 0.78 | net | 3.76 | 14.30 | 69% | 53 | 2.94 |
```

The target's equation charges a vertical metre 2.5–3.8 walking metres; the model charges 12.9. Its climbing cost (13–22
J/kg/m) implies a muscular efficiency of 44–73%, beyond the ~25% muscle reaches for positive work (kozmaPontzer2021, Hill
1922 as cited there).

**Each term, source against model** (evidence levels as research.md):
- *Cost per vertical metre.* Measured vertical climbing: humans 40.1 ± 3.1 J/kg/m incremental (efficiency 24%, CI 21–29%)
  plus a holding cost of 5.98 J kg⁻¹ s⁻¹ above standing, 61.5 J/kg/m at 0.28 m/s, "essentially identical to those of
  arboreally adapted primates when accounting for velocity" (kozmaPontzer2021, FT accepted manuscript, 12 adults; [M] for a
  hominoid, [L] for chimpanzees); five small primates 104.6–135.0 J/kg/m on a vertical rope-mill (hannaSchmitt2011, [L]);
  cross-species climbing efficiency about 10% (Pontzer 2016 as cited by kozmaPontzer2021, [L]). Incline running: a 17.5 kg
  captive chimpanzee about 15.5 J/kg per metre lifted while running uphill (taylor1972, abstract; [M] for running on an
  incline, not vertical climbing). The model: 49.05 (m·g ÷ 0.20), inside the measured vertical-climbing range (40 to
  52–67 with the holding cost at 0.5–0.22 m/s, derived); the target's 13–22 lies below all of it.
- *Metres climbed per day.* No wild distance is open (pontzerWrangham2004's are closed; couturier2022 gives only "4.2%" of
  the day moving in trees at Sebitoli). Implied by the target's ratio, equation and day ranges: 53–63 m (net basis) to
  80–90 m (gross) a day for adults (derived [L]). The model: males 125, other females 99, nursing mothers 94 (S25).
- *Climbs per day.* Feeding trees per adult-day 4–15 (T-FOOD-4, janmaat2013b/normand2009, [M]); the model's crown visits
  7.7–9.7 a day (observer 7.7–8.3): in band. One night nest a day. No wild count of ascents.
- *Metres per climb.* Night nests at Kanyawara 9.1 m (n = 74) and Kanyanchu 8.1 m (n = 30), 3–17 m (krief2012, FT, [H]);
  the model's nest climbs 9.2–10.0 m. No Kibale feeding height found (feeding trees at Issa, a savanna site, 12.8–17.3 m
  tall, drummondClarke2025 [M], context); the model's crown climbs 10.1–10.5 m.
- *Moving within trees.* Mahale and Gombe chimpanzees spend 34–52% of their time in trees but only 8–12% of their
  locomotion is arboreal; climbing is about half of it (49–52%), the rest suspension, scrambling and walking on boughs
  (Doran & Hunt via carlson2008 and sarringhaus2022 Table 1, FT; [H]). No open text splits within-crown from between-crown
  movement.
- *Descent.* The model charges none; running downhill, chimpanzees and mice "recover about 90 percent of the energy stored
  running uphill" (taylor1972, abstract, [M]); walking down steep slopes costs about 0.2 of walking up them (minetti2002,
  abstract, derived, [L]). Descent is not charged like ascent: hypothesis (c) of §0 is false; if anything the ledger
  under-charges it.

**The term (registered rule, §2).** Decomposition of the model's miss on the net basis (`target_audit.py`; model ÷ target):

```
| class (target: sex, km) | model walk ÷ climb | log share: cost per metre (model ÷ target) | metres climbed (model ÷ target-implied) | walking (model ÷ target) | same-crown metres (share) | metres without them ÷ target-implied |
| adult male (2.4 km) | 1.22 | 3.66 (62%) | 1.97 (32%) | 0.88 (+6%) | 39 (32%) | 1.35 |
| female, other (2.0 km) | 1.21 | 3.43 (58%) | 1.88 (30%) | 0.78 (+12%) | 33 (33%) | 1.26 |
| female, lactating (2.0 km) | 1.66 | 3.43 (69%) | 1.78 (32%) | 1.01 (-1%) | 29 (31%) | 1.23 |
```

**Named: the cost per vertical metre** (58–69% of the log gap): an input, but one the sources do not correct. The target
prices a vertical metre at 13–22 J/kg/m through a human rock-climbing equation that implies 44–73% muscular efficiency;
every measured vertical climb (humans 40–62, small primates 105–135 J/kg/m) is at or above the model's 49. Like E1h's
food energy, the miss is the field number's formula, here in the other direction: with the model's sourced costs the
target's own distances read 1.9–2.9, not 10. No input moves (moving `ledgerClimbEff` toward the target would need an
efficiency of 0.44–0.73). The staged reading of the target: a walking ÷ climbing energy ratio of about 1.9–2.9 for
Kanyawara adults (derived [L]), or better the implied distance, 53–90 vertical metres a day.

**Second term: metres climbed per day** (30–32% of the log gap; model 1.8–2.0 × the target's implied distance): a
behaviour the model produces. A third of adults' metres (half of infants') are climbs back into the crown just left,
because moveTo descends before any move of more than 3 m; chimpanzees move within trees (half of their arboreal
locomotion is not climbing). Without them adults climb 1.2–1.4 × the net-basis distance, inside the gross-basis one.

### 2.5 Amendment 2: what step 2 builds (registered 4 October 2026 after §2.4, before any code for it)

The named term admits no model correction (§2.4), so step 2 builds for the second term, the one the model produces:
a mechanism, behind a new switch, that keeps an animal in the crown it is in when its goal lies in that crown (§4). No
cost, efficiency or speed changes; nothing is chosen to reach a ratio, a distance or a reserve trend.

## 3. Sources

Read for this stage: couturier2022 (FT), kozmaPontzer2021 (FT, accepted manuscript), taylor1972 (abstract, Europe PMC),
minetti2002 (abstract), krief2012 (FT), carlson2008 and sarringhaus2022 (FT), drummondClarke2025 (FT), kilgas2017
(abstract); hannaSchmitt2011, nguessan2009, wilson2021 and pontzerWrangham2004 as already cited. Not verified (2 routes
each or a bot check): pontzerWrangham2004's distances, venkataraman2013 and crompton2010 (not in the open BioC set), the
pontzer2016 climbing scaling (no body), mermier1997 (scanned, abstract only), abbott1952 (scanned), nguessan2009's full
text (Springer bot check). Research by a subagent of this stage (routes and raw texts in the stage's scratch
directory); the load-bearing passages above were re-read here (couturier2022's equations from the efetch XML,
kozmaPontzer2021, taylor1972's abstract, krief2012, sarringhaus2022 Table 1).

## 4. Mechanism, iteration 1 (registered 4 October 2026 before its runs; code at the commit that registers it)

`crownMove` 1 (src/sim/gait.ts `crownAt`, `sameCrown`; execution.ts `moveTo` and the follow act; candidates.ts `rateWorth`
and `treeFoodWorth`; 0 = today, bit for bit):
- *Movement.* An animal above the ground whose goal above the ground lies in the crown it is in moves to it through that
  crown (the horizontal step at the act's speed at its height, then the height change within 3 m, as moveTo already does
  near a goal) instead of descending to the ground first. A crown is the tree's canopy radius around its trunk, above
  0.3 m and up to the tree's height (+0.5 m); a point in two crowns belongs to the nearer trunk. Goals on the ground and
  goals in another crown are reached as today (down, walk, up).
- *Following.* A follower in the same crown as the animal it follows goes to that animal's height (today: to the ground
  once it is 3 m or more away, then back up).
- *Valuation.* A crown the animal is in is valued with the climb from its height (today only when that crown is its
  current target), as the movement now reaches it.
- No new magnitude: speeds, climbing speed, costs per metre unchanged (a horizontal metre in a crown costs what the
  ledger charges any horizontal metre, sockol2007's 3.8 J/kg/m: no arboreal locomotion cost exists for chimpanzees).
  Removes no counted prescription (43 on S25, 42 with `walkGait`: `prescription-ledger --count`). Not handled: crossings
  between touching crowns (2–5% of adults' metres climbed, §2.3); with `tripBodyCost` 1, tripClimbH would still charge a
  descent for a goal in the same crown (gait.ts tripClimbH; not in this stage's arms).
- Smoke test (2 days of S25 + `crownMove` 1, seed 48, burn-in 1 day; climb-diagnose): readouts fill; climbs back into the
  crown just left fall for every adult class and juveniles (males 5.5 → 3.2 a day, nursing mothers 2.9 → 1.3, juveniles
  4.0 → 0.8), metres climbed fall (males 140 → 117, mothers 95 → 83, juveniles 137 → 99); infants of 2–5 y climb more in
  this draw (94 → 105 m/day; their re-climbs from points at the crown's edge or after a dismount at 0.55 m rise), so their
  direction is not predicted with confidence. Not a result (one seed, 2 days, diverging trajectories).

## 5. Predictions and kill criterion (iteration 1; registered before its runs)

Arms (quick: seeds 48 and 7, burn-in 30, 30 days; e-bench, energy-diagnose, climb-diagnose; from a frozen checkout of the
commit that registers this section): **C** = S25 + `crownMove` 1; **CW** = S25 + `walkGait` 1 + `crownMove` 1. Judged
each against the integrator's four S25 quick realizations (S25q, S25q1–3; e-noise.md amendment 2, with and without
amendment 3's rare rows); W (S25 + `walkGait`, §2.1) reported beside CW.

Predictions (moderate confidence on direction, low on size, unless stated):
1. Prescriptions 43 (C) and 42 (CW) (high); viability passes; every sum inside noise.
2. Climbs back into the crown just left (§2.3's readout) at most half of S25's (W's for CW) for adults and juveniles
   (high for the direction).
3. Metres climbed per day −15 to −35% for adults and juveniles (S25: males 125, nursing mothers 94, juveniles 136; CW
   against W), and climbing kcal/day by the same share; walking ÷ climbing energy for adults 1.4–2.3 on C (S25 1.2–1.7),
   higher on CW. Reported against the restated target (1.9–2.9, derived [L], §2.4), not a test.
4. Reserve trends of every class within S25's spread or above it (C); on CW, nursing mothers', juveniles' and infants'
   (0.5–2 y, 2–5 y) within 2 SD of S25's mean (low: the question whether walkGait combines).
5. T-RNG-4, T-ACT-1, T-ACT-3, T-ACT-4 within S25's spread (C); T-ACT-2 at most 0.02 lower (climbing time is travel in the
   observer's category) (low).

**Kill criterion (an arm is recorded, not a keep candidate, if any holds):** viability fails; held-out (with or without
the rare rows) worse beyond noise (z > +2); the count is not 43 (C) or 42 (CW); a reserve trend of nursing mothers,
juveniles 5–12 y, infants 0.5–2 y or infants 2–5 y more than 2 SD below S25's mean; night safety (rhythm-metrics, run on
a kept arm) above 3.3% of the night. Keep rule for a correction (removes no prescription): viable, held-out not up beyond
noise, prescriptions not up, night safe. An iteration 2 is registered only for a term this one's diagnosis names.

### 5.1 Replicates (registered 4 October 2026 while C's first run was running, before any arm's result was read; not iterations)

E2j found single quick draws of the per-class energy lines straying beyond S22's spread in both directions under
`walkGait` (e2j-prereg.md §7.1). So each arm is re-drawn once with `rngSalt` 1 (Cr, CWr; e-bench and energy-diagnose,
same frozen code), each draw's sums are judged by e-noise.md amendment 2 as registered, and the kill criterion's energy
line is judged on the two-draw mean: z = (mean − S25 mean) ÷ (SD × √(1/2 + 1/4)), SD of S25's four runs.

## 6. Results, iteration 1, first draws (C, CW; frozen dd0e1a3, clean; quick, seeds 48 and 7; printed by `final.py`, `climbtable.py`, `crowntable.py`, `target_audit.py` from the JSON in the stage's scratch directory, `runs/`)

S25's climbing readouts are this stage's climb-diagnose runs of the integrator's four S25 parameter sets (S25q at
95786a8, S25q1–3 at dd0e1a3, switch 0: the same simulation as the integrator's runs, whose books they reproduce).

```
| readout | S25 mean ± SD (4 runs) | W | C | CW |
| ascents/day, males | 12.8 ± 0.9 (n 4) | 15.1 (+2.2) | 12.7 (-0.2) | 14.8 (+2.0) |
| ascents/day, nursing mothers | 9.9 ± 0.4 (n 4) | 11.9 (+4.3) | 9.8 (-0.3) | 11.3 (+3.1) |
| metres climbed/day, males | 121 ± 8 (n 4) | 144 (+2.5) | 114 (-0.8) | 131 (+1.1) |
| metres climbed/day, nursing mothers | 95 ± 4 (n 4) | 115 (+4.4) | 89 (-1.4) | 102 (+1.4) |
| metres climbed/day, infants 0.5–2 y | 72 ± 6 (n 4) | 91 (+2.9) | 47 (-4.0) | 64 (-1.3) |
| climbs back into the crown just left, males /day | 3.82 ± 0.33 (n 4) | 4.02 (+0.6) | 2.56 (-3.4) | 2.77 (-2.8) |
| climb kcal/day, males | 55.5 ± 3.7 (n 4) | 65.7 (+2.5) | 52.2 (-0.8) | 60.1 (+1.1) |
| climb kcal/day, nursing mothers | 34.9 ± 1.5 (n 4) | 42.1 (+4.4) | 32.6 (-1.4) | 37.3 (+1.4) |
| walk ÷ climb energy, males | 1.21 ± 0.05 (n 4) | 1.49 (+4.7) | 1.37 (+2.7) | 1.73 (+8.6) |
| walk ÷ climb energy, nursing mothers | 1.52 ± 0.12 (n 4) | 1.82 (+2.3) | 1.67 (+1.1) | 1.99 (+3.6) |
| true day range km, males | 1.84 ± 0.07 (n 4) | 2.70 (+11.1) | 1.97 (+1.7) | 2.87 (+13.3) |
| true day range km, nursing mothers | 1.71 ± 0.10 (n 4) | 2.54 (+7.3) | 1.76 (+0.4) | 2.44 (+6.4) |
| T-RNG-4 | 1.52 ± 0.10 (n 4) | 2.23 (+6.3) | 1.69 (+1.5) | 2.42 (+8.0) |
| T-RNG-5 | 1.11 ± 0.17 (n 4) | 1.01 (-0.5) | 0.86 (-1.4) | 0.90 (-1.1) |
| T-ACT-1 | 0.371 ± 0.007 (n 4) | 0.387 (+2.0) | 0.377 (+0.8) | 0.378 (+0.9) |
| T-ACT-2 | 0.163 ± 0.005 (n 4) | 0.108 (-10.4) | 0.157 (-1.1) | 0.116 (-8.9) |
| T-ACT-3 | 0.100 ± 0.005 (n 4) | 0.105 (+1.0) | 0.094 (-1.2) | 0.099 (-0.1) |
| T-ACT-4 | 0.395 ± 0.013 (n 4) | 0.397 (+0.2) | 0.395 (-0.0) | 0.418 (+1.6) |
| T-FOOD-10 | 0.499 ± 0.032 (n 4) | 0.613 (+3.2) | 0.538 (+1.1) | 0.599 (+2.8) |
| reserves %/day, nursing mothers | -0.010 ± 0.009 (n 4) | +0.004 (+1.4) | -0.005 (+0.5) | +0.005 (+1.5) |
| reserves %/day, juveniles 5–12 y | -0.000 ± 0.019 (n 4) | +0.016 (+0.8) | -0.021 (-1.0) | -0.015 (-0.7) |
| reserves %/day, infants 2–5 y | -0.051 ± 0.068 (n 4) | +0.002 (+0.7) | -0.002 (+0.7) | +0.007 (+0.8) |
| reserves %/day, infants 0.5–2 y | -0.068 ± 0.120 (n 4) | +0.008 (+0.6) | -0.010 (+0.4) | +0.012 (+0.6) |
| reserves %/day, adult males | +0.008 ± 0.004 (n 4) | +0.002 (-1.2) | +0.004 (-0.7) | -0.002 (-2.1) |
| prescriptions | 43 ± 0 (n 4) | 42 | 43 | 42 |

W: 398a5c3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
C: dd0e1a3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
CW: dd0e1a3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.53, 3.49, 1.48, 1.10 (mean 1.90, sd 1.08; used 1.08) | W.json: 1.12, Δ -0.78, z -0.6 (inside noise) | C.json: 1.32, Δ -0.58, z -0.5 (inside noise) | CW.json: 1.50, Δ -0.40, z -0.3 (inside noise)
  held-out           (12 rows) ref 4.19, 6.38, 2.89, 5.92 (mean 4.84, sd 1.61; used 1.61) | W.json: 5.07, Δ +0.23, z +0.1 (inside noise) | C.json: 3.25, Δ -1.60, z -0.9 (inside noise) | CW.json: 4.27, Δ -0.57, z -0.3 (inside noise)
  held-out w/o rare  (11 rows) ref 4.19, 3.71, 2.89, 3.85 (mean 3.66, sd 0.55; used 0.55) | W.json: 3.99, Δ +0.34, z +0.5 (inside noise) | C.json: 3.25, Δ -0.41, z -0.7 (inside noise) | CW.json: 3.45, Δ -0.21, z -0.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 0.90±0.14 | W.json 1.42 (fail) | C.json 1.08 (fail) | CW.json 1.36 (fail)
   T-HUN-4   held-out ref 1.19±1.39 | W.json 1.07 (fail) | C.json 0.00 (pass) | CW.json 0.83 (fail)
   T-SOC-3   held-out ref 0.01±0.02 | W.json 0.06 (fail) | C.json 0.24 (fail) | CW.json 0.00 (pass)
```

Climbs by the crown they end in against the crown the descent left (S25 and W: §2.3's runs; C and CW: this iteration):

```
| class | run | metres climbed/day | from a perch | same crown: per day (m/day) | touching crown: per day (m/day) | other crown: per day (m/day) | no crown: per day (m/day) | same crown, by act (m/day) |
| adult male | S25 | 125 | 6 | 3.95 (39; 32%) | 0.40 (4; 3%) | 6.74 (71; 57%) | 0.37 (3; 2%) | crown approach 19, social other 10, pair approach 6, nest 5, still acts 0 |
| adult male | C | 114 | 9 | 2.56 (24; 21%) | 0.26 (3; 3%) | 6.87 (74; 65%) | 0.53 (4; 4%) | crown approach 16, social other 6, pair approach 2, nest 1, still acts 0 |
| adult male | W | 144 | 7 | 4.02 (39; 27%) | 0.24 (3; 2%) | 8.57 (91; 63%) | 0.48 (4; 3%) | crown approach 17, social other 12, pair approach 6, nest 4, still acts 0 |
| adult male | CW | 131 | 9 | 2.77 (25; 19%) | 0.32 (4; 3%) | 8.46 (89; 68%) | 0.58 (4; 3%) | crown approach 15, social other 8, pair approach 2, nest 1, still acts 0 |
| female, other | S25 | 99 | 3 | 3.22 (33; 33%) | 0.48 (5; 5%) | 5.34 (57; 57%) | 0.11 (1; 1%) | crown approach 13, social other 10, nest 5, pair approach 3, party follow 2 |
| female, other | C | 85 | 5 | 1.94 (19; 22%) | 0.26 (3; 3%) | 5.34 (57; 68%) | 0.10 (1; 1%) | crown approach 9, social other 5, nest 2, party follow 2, pair approach 1 |
| female, other | W | 108 | 3 | 3.07 (30; 28%) | 0.15 (2; 2%) | 6.80 (72; 66%) | 0.08 (1; 1%) | social other 11, crown approach 10, nest 5, pair approach 2, party follow 1 |
| female, other | CW | 88 | 6 | 1.69 (16; 18%) | 0.20 (2; 3%) | 6.08 (63; 72%) | 0.06 (0; 1%) | crown approach 8, social other 4, nest 2, party follow 2, pair approach 1 |
| female, lactating | S25 | 94 | 3 | 2.88 (29; 31%) | 0.20 (2; 3%) | 5.48 (58; 62%) | 0.20 (1; 1%) | crown approach 13, social other 7, nest 5, pair approach 3, still acts 0 |
| female, lactating | C | 89 | 5 | 2.20 (22; 25%) | 0.19 (2; 2%) | 5.36 (58; 66%) | 0.24 (2; 2%) | crown approach 13, social other 4, pair approach 3, nest 2, still acts 0 |
| female, lactating | W | 115 | 3 | 3.23 (32; 28%) | 0.17 (2; 2%) | 6.91 (75; 65%) | 0.30 (2; 2%) | crown approach 12, social other 11, nest 5, pair approach 3, still acts 1 |
| female, lactating | CW | 102 | 5 | 1.85 (18; 18%) | 0.18 (2; 2%) | 6.84 (74; 72%) | 0.34 (2; 2%) | crown approach 10, social other 4, nest 2, pair approach 2, still acts 0 |
| juvenile 5–12 y | S25 | 136 | 6 | 4.56 (46; 34%) | 0.66 (7; 5%) | 6.35 (65; 48%) | 1.28 (12; 9%) | crown approach 19, pair approach 13, social other 7, nest 4, still acts 2 |
| juvenile 5–12 y | C | 117 | 11 | 2.04 (20; 17%) | 0.33 (4; 3%) | 6.62 (71; 61%) | 1.13 (11; 10%) | crown approach 12, pair approach 3, social other 2, nest 1, care follow 1 |
| juvenile 5–12 y | W | 166 | 6 | 5.46 (56; 34%) | 0.33 (4; 2%) | 7.88 (84; 50%) | 1.70 (16; 10%) | crown approach 24, pair approach 14, social other 9, nest 5, still acts 2 |
| juvenile 5–12 y | CW | 131 | 11 | 2.06 (20; 15%) | 0.41 (4; 3%) | 7.64 (78; 60%) | 1.88 (18; 14%) | crown approach 11, pair approach 3, social other 3, care follow 2, nest 1 |
| infant 2–5 y | S25 | 86 | 5 | 4.08 (41; 47%) | 0.37 (4; 4%) | 1.17 (12; 13%) | 2.69 (25; 29%) | care follow 27, pair approach 7, crown approach 3, social other 1, still acts 1 |
| infant 2–5 y | C | 82 | 14 | 2.78 (28; 35%) | 0.40 (4; 5%) | 1.05 (10; 13%) | 2.62 (25; 31%) | care follow 21, pair approach 4, crown approach 1, social other 1, still acts 1 |
| infant 2–5 y | W | 117 | 7 | 4.70 (47; 40%) | 0.43 (5; 4%) | 1.12 (11; 9%) | 4.87 (48; 41%) | care follow 30, pair approach 13, still acts 1, crown approach 1, social other 1 |
| infant 2–5 y | CW | 101 | 14 | 2.05 (20; 20%) | 0.42 (4; 4%) | 1.07 (10; 9%) | 5.60 (53; 52%) | care follow 13, pair approach 5, crown approach 1, social other 1, still acts 0 |
| infant 0.5–2 y | S25 | 71 | 4 | 3.74 (35; 49%) | 0.41 (4; 5%) | 0.87 (9; 12%) | 2.39 (19; 27%) | care follow 22, pair approach 11, crown approach 1, social other 1, still acts 0 |
| infant 0.5–2 y | C | 47 | 8 | 1.85 (17; 36%) | 0.20 (2; 4%) | 0.64 (6; 13%) | 1.55 (14; 30%) | care follow 12, pair approach 4, social other 1, still acts 0, crown approach 0 |
| infant 0.5–2 y | W | 91 | 6 | 4.27 (41; 46%) | 0.28 (3; 3%) | 1.00 (9; 10%) | 3.63 (32; 35%) | care follow 26, pair approach 15, social other 0, crown approach 0, still acts 0 |
| infant 0.5–2 y | CW | 64 | 9 | 1.66 (15; 23%) | 0.23 (2; 4%) | 0.52 (5; 7%) | 3.59 (33; 52%) | care follow 8, pair approach 6, social other 0, still acts 0, crown approach 0 |
```

```
| readout (per animal-day) | males: S25 → C → W → CW | other females: S25 → C → W → CW | nursing mothers: S25 → C → W → CW | juveniles 5–12 y: S25 → C → W → CW | infants 2–5 y: S25 → C → W → CW | infants 0.5–2 y: S25 → C → W → CW |
| ascents/day | 13.1 → 12.7 → 15.1 → 14.8 | 10.3 → 9.6 → 11.4 → 10.2 | 9.8 → 9.8 → 11.9 → 11.3 | 15.1 → 14.1 → 17.6 → 16.1 | 9.3 → 9.5 → 12.6 → 12.2 | 8.5 → 6.2 → 10.6 → 8.5 |
| metres per ascent | 9.5 → 9.0 → 9.5 → 8.9 | 9.7 → 8.9 → 9.4 → 8.6 | 9.5 → 9.1 → 9.7 → 9.0 | 9.0 → 8.3 → 9.4 → 8.1 | 9.2 → 8.6 → 9.3 → 8.3 | 8.4 → 7.6 → 8.6 → 7.5 |
| metres climbed/day | 125 → 114 → 144 → 131 | 99 → 85 → 108 → 88 | 94 → 89 → 115 → 102 | 136 → 117 → 166 → 131 | 86 → 82 → 117 → 101 | 71 → 47 → 91 → 64 |
| metres descended/day | 125 → 114 → 144 → 131 | 99 → 85 → 108 → 88 | 93 → 89 → 115 → 102 | 136 → 117 → 166 → 131 | 58 → 54 → 83 → 65 | 57 → 32 → 71 → 46 |
| climb kcal/day (own) | 57.0 → 52.2 → 65.7 → 60.1 | 36.4 → 31.1 → 39.7 → 32.3 | 34.3 → 32.6 → 42.1 → 37.3 | 43.4 → 37.3 → 52.5 → 41.6 | 11.5 → 10.9 → 15.8 → 13.6 | 6.0 → 3.8 → 7.6 → 5.4 |
| kcal per ascent | 4.36 → 4.12 → 4.34 → 4.05 | 3.55 → 3.25 → 3.47 → 3.16 | 3.50 → 3.33 → 3.55 → 3.30 | 2.86 → 2.65 → 2.98 → 2.58 | 1.24 → 1.16 → 1.26 → 1.11 | 0.70 → 0.61 → 0.72 → 0.64 |
| J per kg per metre climbed | 49.05 → 49.05 → 49.05 → 49.05 | 49.05 → 49.05 → 49.05 → 49.05 | 49.05 → 49.05 → 49.05 → 49.05 | 49.05 → 49.05 → 49.05 → 49.05 | 49.05 → 49.05 → 49.05 → 49.05 | 49.05 → 49.05 → 49.05 → 49.05 |
| walk kcal/day (own) | 69.5 → 71.4 → 97.9 → 104.0 | 43.9 → 39.5 → 58.8 → 58.5 | 56.9 → 54.5 → 76.5 → 74.2 | 63.5 → 62.3 → 84.7 → 84.7 | 7.4 → 3.5 → 6.2 → 5.9 | 3.1 → 1.4 → 2.8 → 2.9 |
| walk ÷ climb, own | 1.22 → 1.37 → 1.49 → 1.73 | 1.21 → 1.27 → 1.48 → 1.81 | 1.66 → 1.67 → 1.82 → 1.99 | 1.47 → 1.67 → 1.61 → 2.04 | 0.64 → 0.32 → 0.39 → 0.44 | 0.52 → 0.37 → 0.37 → 0.54 |
| walk ÷ climb, with carrying | 1.22 → 1.37 → 1.49 → 1.73 | 1.21 → 1.27 → 1.48 → 1.81 | 1.87 → 1.88 → 2.07 → 2.27 | 1.47 → 1.67 → 1.61 → 2.04 | 0.64 → 0.32 → 0.39 → 0.44 | 0.52 → 0.37 → 0.37 → 0.54 |
| crown visits/day | 9.7 → 9.8 → 11.0 → 11.0 | 7.7 → 7.4 → 8.7 → 8.4 | 8.1 → 8.2 → 9.2 → 9.2 | 10.2 → 10.6 → 11.1 → 11.4 | 5.1 → 4.9 → 5.0 → 5.2 | 1.5 → 1.0 → 1.2 → 1.1 |
| crown-approach ascents per crown visit | 0.87 → 0.86 → 0.90 → 0.89 | 0.84 → 0.80 → 0.85 → 0.80 | 0.84 → 0.81 → 0.87 → 0.85 | 0.82 → 0.74 → 0.86 → 0.74 | 0.23 → 0.14 → 0.15 → 0.13 | 0.36 → 0.14 → 0.17 → 0.16 |
| metres/day: to crowns | 89 → 88 → 104 → 101 | 68 → 62 → 76 → 68 | 70 → 70 → 86 → 83 | 84 → 79 → 101 → 85 | 11 → 5 → 6 → 5 | 5 → 1 → 2 → 1 |
| metres/day: to nests | 10 → 6 → 10 → 6 | 11 → 8 → 11 → 8 | 10 → 8 → 9 → 7 | 10 → 7 → 11 → 7 | 1 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| metres/day: behind a carer | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 | 5 → 6 → 12 → 12 | 61 → 64 → 89 → 82 | 48 → 36 → 66 → 49 |
| metres/day: to a partner or other social | 24 → 17 → 28 → 22 | 20 → 14 → 20 → 11 | 12 → 9 → 18 → 9 | 33 → 21 → 37 → 23 | 11 → 9 → 19 → 11 | 16 → 9 → 21 → 12 |
| metres/day: other acts | 2 → 3 → 2 → 2 | 1 → 1 → 1 → 1 | 1 → 1 → 2 → 2 | 5 → 3 → 5 → 3 | 3 → 2 → 3 → 2 | 1 → 1 → 2 → 1 |
| share of metres climbed after a ground gap < 10 m | 0.36 → 0.25 → 0.28 → 0.21 | 0.38 → 0.25 → 0.31 → 0.20 | 0.33 → 0.27 → 0.30 → 0.20 | 0.44 → 0.28 → 0.41 → 0.25 | 0.75 → 0.65 → 0.70 → 0.59 | 0.78 → 0.65 → 0.75 → 0.65 |
| climbing min/day (up + down) | 21.9 → 20.1 → 25.2 → 23.3 | 18.3 → 16.0 → 20.0 → 16.6 | 16.6 → 16.0 → 20.2 → 18.2 | 26.8 → 23.1 → 32.5 → 26.0 | 19.4 → 18.1 → 25.9 → 22.4 | 20.1 → 12.8 → 24.9 → 17.9 |
```

The target decomposition (§2.4) on C, then CW:

```
| class (target: sex, km) | model walk ÷ climb | log share: cost per metre (model ÷ target) | metres climbed (model ÷ target-implied) | walking (model ÷ target) | same-crown metres (share) | metres without them ÷ target-implied |
| adult male (2.4 km) | 1.37 | 3.66 (65%) | 1.81 (30%) | 0.91 (+5%) | 24 (21%) | 1.42 |
| female, other (2.0 km) | 1.27 | 3.43 (60%) | 1.61 (23%) | 0.70 (+17%) | 19 (22%) | 1.25 |
| female, lactating (2.0 km) | 1.67 | 3.43 (69%) | 1.69 (29%) | 0.97 (+2%) | 22 (25%) | 1.28 |
| class (target: sex, km) | model walk ÷ climb | log share: cost per metre (model ÷ target) | metres climbed (model ÷ target-implied) | walking (model ÷ target) | same-crown metres (share) | metres without them ÷ target-implied |
| adult male (2.4 km) | 1.73 | 3.66 (74%) | 2.08 (42%) | 1.32 (-16%) | 25 (19%) | 1.68 |
| female, other (2.0 km) | 1.81 | 3.43 (72%) | 1.67 (30%) | 1.04 (-2%) | 16 (18%) | 1.37 |
| female, lactating (2.0 km) | 1.99 | 3.43 (76%) | 1.93 (41%) | 1.32 (-17%) | 18 (18%) | 1.58 |
```

**Against the predictions (§5), first draws.**
1. Prescriptions 43 (C) and 42 (CW), viable (no death), every sum inside noise (fitted z −0.5 and −0.3; held-out −0.9 and
   −0.3; without the rare rows −0.7 and −0.3): held.
2. Climbs back into the crown just left at most half of S25's (W's) for adults and juveniles: held for juveniles (4.56 →
   2.04 a day; W 5.46 → CW 2.06); **missed** for adults (C against S25: males 3.95 → 2.56, other females 3.22 → 1.94,
   nursing mothers 2.88 → 2.20; CW against W: 4.02 → 2.77, 3.07 → 1.69, 3.23 → 1.85, i.e. 0.55–0.76 of the reference). What remains follows time on the ground (mean 12–43 min between the
   descent and the climb back for adults' crown approaches): the animal came down for a goal on the ground (a trip,
   fallback food, a companion below) and decided to return: decisions, not the movement rule.
3. Metres climbed −15 to −35% for adults and juveniles: **missed** on C (males −9%, other females −14%, nursing mothers −5%,
   juveniles −14%), held on CW against W (−9%, −19%, −11%, −21%); climbing kcal (energy-diagnose) males 55.5 ± 3.7 → 52.2,
   nursing mothers 34.9 ± 1.5 → 32.6. Walking ÷ climbing for adults 1.4–2.3 on C: males 1.37 (missed by 0.03), nursing
   mothers 1.67 (held); CW 1.73 and 1.99. Infants 0.5–2 y climb a third less (72 ± 6 → 47 m/day; CW 64).
4. Reserves within or above S25's spread on C: held for every class (z −1.0 to +0.7). CW's nursing mothers', juveniles' and
   infants' trends within 2 SD of S25's mean: held in this draw (z +1.5, −0.7, +0.8, +0.6); adult males −2.1 (not in the
   kill line).
5. T-RNG-4, T-ACT-1, T-ACT-3, T-ACT-4 within S25's spread and T-ACT-2 at most 0.02 lower on C: held (1.69 at the spread's
   top, 0.377, 0.094, 0.395; T-ACT-2 0.157).

Not predicted: infants' climbs from and to points outside every crown ("no crown") stay (C) or grow (CW: 52% of infants'
metres climbed): an infant that stops 1 m from a mother at a small crown's edge, or that climbs while still up to 3 m
from her (moveTo climbs once within 3 m of the goal), perches outside the crown's radius, so the crown rule does not apply
to its next move (§4: the crown is the canopy radius, no reach added).

### 6.1 Replicates and night safety (Cr, CWr by `rngSalt` 1; frozen dd0e1a3, clean; `final.py`, `twodraw.py`, the integrator's `night.py`)

```
| readout | S25 mean ± SD (4 runs) | W | C | Cr | CW | CWr |
| ascents/day, males | 12.8 ± 0.9 (n 4) | 15.1 (+2.2) | 12.7 (-0.2) | — | 14.8 (+2.0) | — |
| ascents/day, nursing mothers | 9.9 ± 0.4 (n 4) | 11.9 (+4.3) | 9.8 (-0.3) | — | 11.3 (+3.1) | — |
| metres climbed/day, males | 121 ± 8 (n 4) | 144 (+2.5) | 114 (-0.8) | — | 131 (+1.1) | — |
| metres climbed/day, nursing mothers | 95 ± 4 (n 4) | 115 (+4.4) | 89 (-1.4) | — | 102 (+1.4) | — |
| metres climbed/day, infants 0.5–2 y | 72 ± 6 (n 4) | 91 (+2.9) | 47 (-4.0) | — | 64 (-1.3) | — |
| climbs back into the crown just left, males /day | 3.82 ± 0.33 (n 4) | 4.02 (+0.6) | 2.56 (-3.4) | — | 2.77 (-2.8) | — |
| climb kcal/day, males | 55.5 ± 3.7 (n 4) | 65.7 (+2.5) | 52.2 (-0.8) | 51.5 (-1.0) | 60.1 (+1.1) | 61.1 (+1.4) |
| climb kcal/day, nursing mothers | 34.9 ± 1.5 (n 4) | 42.1 (+4.4) | 32.6 (-1.4) | 30.4 (-2.8) | 37.3 (+1.4) | 38.2 (+2.0) |
| walk ÷ climb energy, males | 1.21 ± 0.05 (n 4) | 1.49 (+4.7) | 1.37 (+2.7) | 1.31 (+1.7) | 1.73 (+8.6) | 1.77 (+9.2) |
| walk ÷ climb energy, nursing mothers | 1.52 ± 0.12 (n 4) | 1.82 (+2.3) | 1.67 (+1.1) | 1.72 (+1.5) | 1.99 (+3.6) | 1.95 (+3.3) |
| true day range km, males | 1.84 ± 0.07 (n 4) | 2.70 (+11.1) | 1.97 (+1.7) | 1.86 (+0.2) | 2.87 (+13.3) | 2.98 (+14.7) |
| true day range km, nursing mothers | 1.71 ± 0.10 (n 4) | 2.54 (+7.3) | 1.76 (+0.4) | 1.68 (-0.3) | 2.44 (+6.4) | 2.45 (+6.5) |
| T-RNG-4 | 1.52 ± 0.10 (n 4) | 2.23 (+6.3) | 1.69 (+1.5) | 1.69 (+1.5) | 2.42 (+8.0) | 2.18 (+5.8) |
| T-RNG-5 | 1.11 ± 0.17 (n 4) | 1.01 (-0.5) | 0.86 (-1.4) | 0.87 (-1.3) | 0.90 (-1.1) | 1.06 (-0.3) |
| T-ACT-1 | 0.371 ± 0.007 (n 4) | 0.387 (+2.0) | 0.377 (+0.8) | 0.371 (-0.1) | 0.378 (+0.9) | 0.377 (+0.7) |
| T-ACT-2 | 0.163 ± 0.005 (n 4) | 0.108 (-10.4) | 0.157 (-1.1) | 0.155 (-1.6) | 0.116 (-8.9) | 0.121 (-7.9) |
| T-ACT-3 | 0.100 ± 0.005 (n 4) | 0.105 (+1.0) | 0.094 (-1.2) | 0.087 (-2.4) | 0.099 (-0.1) | 0.088 (-2.2) |
| T-ACT-4 | 0.395 ± 0.013 (n 4) | 0.397 (+0.2) | 0.395 (-0.0) | 0.367 (-1.9) | 0.418 (+1.6) | 0.406 (+0.8) |
| T-FOOD-10 | 0.499 ± 0.032 (n 4) | 0.613 (+3.2) | 0.538 (+1.1) | 0.462 (-1.0) | 0.599 (+2.8) | 0.643 (+4.1) |
| reserves %/day, nursing mothers | -0.010 ± 0.009 (n 4) | +0.004 (+1.4) | -0.005 (+0.5) | +0.008 (+1.8) | +0.005 (+1.5) | -0.008 (+0.2) |
| reserves %/day, juveniles 5–12 y | -0.000 ± 0.019 (n 4) | +0.016 (+0.8) | -0.021 (-1.0) | +0.024 (+1.1) | -0.015 (-0.7) | -0.016 (-0.8) |
| reserves %/day, infants 2–5 y | -0.051 ± 0.068 (n 4) | +0.002 (+0.7) | -0.002 (+0.7) | +0.015 (+0.9) | +0.007 (+0.8) | -0.036 (+0.2) |
| reserves %/day, infants 0.5–2 y | -0.068 ± 0.120 (n 4) | +0.008 (+0.6) | -0.010 (+0.4) | +0.004 (+0.5) | +0.012 (+0.6) | +0.011 (+0.6) |
| reserves %/day, adult males | +0.008 ± 0.004 (n 4) | +0.002 (-1.2) | +0.004 (-0.7) | +0.006 (-0.3) | -0.002 (-2.1) | +0.007 (-0.0) |
| prescriptions | 43 ± 0 (n 4) | 42 | 43 | 43 | 42 | 42 |

W: 398a5c3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
C: dd0e1a3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
Cr: dd0e1a3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
CW: dd0e1a3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
CWr: dd0e1a3 dirty 0 viability pass deaths 0 starvation 0 causes [{}, {}]
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.53, 3.49, 1.48, 1.10 (mean 1.90, sd 1.08; used 1.08) | W.json: 1.12, Δ -0.78, z -0.6 (inside noise) | C.json: 1.32, Δ -0.58, z -0.5 (inside noise) | Cr.json: 2.70, Δ +0.80, z +0.7 (inside noise) | CW.json: 1.50, Δ -0.40, z -0.3 (inside noise) | CWr.json: 2.68, Δ +0.78, z +0.6 (inside noise)
  held-out           (12 rows) ref 4.19, 6.38, 2.89, 5.92 (mean 4.84, sd 1.61; used 1.61) | W.json: 5.07, Δ +0.23, z +0.1 (inside noise) | C.json: 3.25, Δ -1.60, z -0.9 (inside noise) | Cr.json: 2.77, Δ -2.07, z -1.1 (inside noise) | CW.json: 4.27, Δ -0.57, z -0.3 (inside noise) | CWr.json: 4.04, Δ -0.80, z -0.4 (inside noise)
  held-out w/o rare  (11 rows) ref 4.19, 3.71, 2.89, 3.85 (mean 3.66, sd 0.55; used 0.55) | W.json: 3.99, Δ +0.34, z +0.5 (inside noise) | C.json: 3.25, Δ -0.41, z -0.7 (inside noise) | Cr.json: 2.77, Δ -0.88, z -1.4 (inside noise) | CW.json: 3.45, Δ -0.21, z -0.3 (inside noise) | CWr.json: 4.04, Δ +0.38, z +0.6 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 0.90±0.14 | W.json 1.42 (fail) | C.json 1.08 (fail) | Cr.json 0.73 (fail) | CW.json 1.36 (fail) | CWr.json 1.56 (fail)
   T-HUN-1   fitted   ref 0.00±0.00 | W.json 0.00 (pass) | C.json 0.00 (pass) | Cr.json 0.00 (pass) | CW.json 0.00 (pass) | CWr.json 1.03 (fail)
   T-HUN-2   fitted   ref 0.13±0.16 | W.json 0.00 (pass) | C.json 0.00 (pass) | Cr.json 1.11 (fail) | CW.json 0.00 (pass) | CWr.json 0.00 (pass)
   T-HUN-4   held-out ref 1.19±1.39 | W.json 1.07 (fail) | C.json 0.00 (pass) | Cr.json 0.00 (pass) | CW.json 0.83 (fail) | CWr.json 0.00 (pass)
   T-SOC-3   held-out ref 0.01±0.02 | W.json 0.06 (fail) | C.json 0.24 (fail) | Cr.json 0.00 (pass) | CW.json 0.00 (pass) | CWr.json 0.00 (pass)
```

Two-draw energy line (§5.1; reserves %/day; z = (mean − S25 mean) ÷ (SD × √(1/2 + 1/4))):

```
adult male         S25 +0.008 ± 0.004 | C: +0.004, +0.006, mean +0.005 (z -0.7) | CW: -0.002, +0.007, mean +0.003 (z -1.4)
female, other      S25 +0.001 ± 0.021 | C: -0.006, +0.020, mean +0.007 (z +0.4) | CW: -0.017, +0.008, mean -0.004 (z -0.3)
female, lactating  S25 -0.010 ± 0.009 | C: -0.005, +0.008, mean +0.001 (z +1.4) | CW: +0.005, -0.008, mean -0.001 (z +1.1)
juvenile 5–12 y    S25 -0.000 ± 0.019 | C: -0.021, +0.024, mean +0.002 (z +0.1) | CW: -0.015, -0.016, mean -0.015 (z -0.9)
infant 2–5 y       S25 -0.051 ± 0.068 | C: -0.002, +0.015, mean +0.007 (z +1.0) | CW: +0.007, -0.036, mean -0.014 (z +0.6)
infant 0.5–2 y     S25 -0.068 ± 0.120 | C: -0.010, +0.004, mean -0.003 (z +0.6) | CW: +0.012, +0.011, mean +0.012 (z +0.8)
```

S25's infant spread is wide because S25q's seed 48 had a respiratory outbreak (infants −0.152 and −0.247 %/day there);
against S25's other three runs (infants 2–5 y −0.018 ± 0.013, 0.5–2 y −0.008 ± 0.013, nursing mothers −0.010 ± 0.011,
juveniles −0.006 ± 0.018, derived) the two-draw means of C and CW are still inside 2 SD. Night (rhythm-metrics, quick):
C adults out of a nest 1.98% of the night, T-RHY-5 0.0167; CW 2.47%, 0.0189; no night deaths (line 3.3%).

Other rows, not predicted: grooming lower in both re-draws (T-ACT-3 0.087 and 0.088 against 0.100 ± 0.005, z −2.4 and
−2.2; in band); departures before sunrise up with `walkGait` (T-FOOD-10 0.599 and 0.643 on CW, as on W, 0.613); CWr's
hunting 45.6 per community-year (one draw; CW 13.9, S25's runs 8–18); travel share below its band on CW (0.116; W
0.108), back at its floor on CWr (0.121).

## 7. Verdict (iteration 1; the stage's last: no further term is implicated that a quick run could judge)

**The audit.** Climbing is not too expensive per metre: the target's "about ten times" was priced with a human
rock-climbing equation (couturier2022 transmitting pontzerWrangham2004) at 13–22 J per kg per vertical metre, a muscular
efficiency of 44–73%; measured vertical climbing (kozmaPontzer2021: 40.1 J/kg/m incrementally, 24% efficiency, plus a
holding cost; small primates 105–135) sits at or above the ledger's 49. With the ledger's costs the target's own
distances read 1.9–2.9. No input moves. What the model adds is metres: 1.8–2.0 × the target's implied daily climb, a
third of it (half of infants') climbs back into the crown just left.

**C (S25 + `crownMove` 1)**: kill criterion not met in either draw; viable, every sum inside noise (held-out without the
rare rows z −0.7 and −1.4), 43 prescriptions, energy lines inside 2 SD (two-draw), night safe. Climbs back into the
crown just left −35 to −55% for males and juveniles (−24% nursing mothers), metres climbed −5 to −14% for adults and
juveniles, −34% for infants 0.5–2 y; walking ÷ climbing 1.21 → 1.31–1.37 (males), 1.52 → 1.67–1.72 (nursing mothers).
**A provisional keep candidate as a correction** (removes no prescription; like `huntDrive`).

**CW (S25 + `walkGait` 1 + `crownMove` 1)**: kill criterion not met in either draw; viable, every sum inside noise, 42
prescriptions, energy lines inside 2 SD, night safe; climbing kcal below W's (males 65.7 → 60.1–61.1, nursing mothers
42.1 → 37.3–38.2; juveniles 52.5 → 41.6), walking ÷ climbing 1.73–1.77 (males) and 1.95–1.99 (nursing mothers). In quick
mode `walkGait` combines with `crownMove`; but W itself showed no reserve cost in its quick draw either (S24's cost
appeared in confirm mode), so quick mode cannot settle it: **recommended for a confirm** (S26 = S25 + `crownMove`, S27 =
S25 + `walkGait` + `crownMove`). Costs carried from `walkGait`: travel share at or below its band's floor, departures
before sunrise up.

**Against the registered predictions:** held 1, 4, 5; missed 2 (the cut of climbs back into the crown is half or less
only for juveniles) and 3 for C (metres −5 to −14% against −15 to −35%), because what remains of them follows time on the
ground (the animal came down for a goal on the ground and decided to return), which no movement rule should remove.

## 8. Open problems

- **Infants' climbs from the crown's edge.** Infants' climbs from or to points outside every crown are 30–52% of their
  metres climbed (C, CW): an infant that climbs while still up to 3 m from its mother (moveTo climbs once within 3 m of
  the goal) or stops 1 m beyond her at a small crown's edge perches outside the canopy radius, so the crown rule does not
  apply to its next move. A next step: membership by the tree an animal climbed into (state) instead of geometry; or the
  climb started only under the crown. Not built (no quick readout of infants' reserves can judge it: S25's infant lines
  carry an outbreak).
- **The target.** "Walking ÷ climbing about 10" is no row of data/targets.json (E2j used it as a reference relation). If a
  row is ever made of it, it should be the implied vertical distance (53–90 m a day for Kanyawara adults, derived [L]) or
  the ratio with sourced costs (1.9–2.9), not 10. Nothing staged.
- **Two climbing costs.** The heat balance charges a metre at 107.4 × M^−0.119 (≈ 70 J/kg/m, small primates
  extrapolated) and the ledger at 49; measured hominoid climbing (40 incremental, 52–67 with the holding cost at the
  model's speeds) lies between: align them in one place (a known defect, §6).
- Descent is free in the ledger; downhill running recovers about 90% (taylor1972), steep downhill walking costs about 0.2
  of uphill (minetti2002): an under-charge of at most ~10–20% of climbing energy, left as it is.

## 4. Samples of the field rows the arms are scored on

As opened for E2i and E2j (e2i-prereg.md §3; e2j-prereg.md §2; the source lists in data/targets.json checked on 4 October
2026): T-RNG-4 and T-RNG-5 (batesByrne2009, Budongo Sonso, 15 adults, unweighed, 5-min GPS or trail-grid fixes while
travelling, focal follows ≥ 8 h; males 2.7 ± 1.5 km, lactating 1.2 ± 0.8 km; T-RNG-4 also jang2019); T-ACT-1–3
(villioth2025, Budongo Waibira, 10 adult males and 9 adult females, 7 lactating, unweighed, continuous focal follows from
the night nest; travel includes arboreal climbing and movement within the canopy; T-ACT-1 also uwimbabazi2019, 14
Kanyawara nursing mothers; T-ACT-2 also amsler2010); T-ACT-4 (potts2011, Ngogo and Kanyawara monthly means, continuous
focal, resting includes grooming; and villioth2025); T-FOOD-4 (janmaat2013b, Taï, 5 adult females with offspring, 275 full
days; normand2009, 2 females, 28 days); T-FOOD-10 (janmaat2014, Taï, 5 adult females with offspring followed from nest to
nest in fruit-scarce periods, 179 days, unweighed; 18% of departures before sunrise).

## 6. Known defects (file:line at c39488f)

- The heat balance charges climbing at `rhythmClimbJ` × M^−0.119 (≈ 70 J/kg/m at 35 kg) while the ledger charges mass ×
  g ÷ `ledgerClimbEff` (49 J/kg/m): the same metre costs two different amounts (rhythm.ts :101, energy.ts :119). Recorded;
  touched only if the audit implicates the cost per metre.
- Descent is free in the ledger (energy.ts :499, :502; stylized) and in the valuation.
- `climbMps` 0.22 m/s is stylized; descent at 1.4 × it (execution.ts :139).
- E2j's: climb-diagnose's crown-visit locomotion is everything spent between two crown visits, not a per-trip cost.
