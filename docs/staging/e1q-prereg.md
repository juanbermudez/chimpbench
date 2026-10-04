# E1q pre-registration: what climbing costs

Status: in progress. Skeleton committed at the start of the stage (branch `e1q-climbing-energy`, from `track-e` c39488f),
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

## 3. Sources (to be read; addenda "Addendum: E1q climbing" in research.md and e-sources.md)

Per term: metres climbed per day by wild chimpanzees (pontzerWrangham2004's distances: primary closed and a listed dead
end, so only through open citing papers); climbs per day and their heights (positional-behaviour studies, feeding and
nest heights at Kibale); the cost of a vertical metre for a chimpanzee-sized primate (hanna2008, hannaSchmitt2011, any
ape or human vertical-climbing measurement); the cost of descent (eccentric work). At most 2 routes or 10 minutes per
source.

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
