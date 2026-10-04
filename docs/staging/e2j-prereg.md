# E2j pre-registration: climbing, halts and the cost of a faster walk

Status: in progress (4 October 2026). Skeleton committed at the start of the stage (branch `e2j-climbing`, from `track-e`
0d08525), before any run and before any code change. Track E, stage E2j. Rule served: field values of behaviour are
targets, never inputs. No speed, halt length or multiplier is set from a day range or a travel share, or tuned to reach
them.

## 0. The problem

- E2i's `walkGait` (walking speed from measured Mahale speeds by mass; src/sim/gait.ts) passed alone on the stack (S23,
  44 prescriptions), but S22 + `walkGait` (S24, confirm) failed the keep rule: held-out without the rare rows worse
  beyond noise (z +2.4, through T-RNG-5 and T-FOOD-10), and the energy of the longer walks fell on nursing mothers
  (−0.090 %/day against S21's −0.071), juveniles (−0.108 against −0.078) and infants of 0.5–2 y (−0.133 against −0.089)
  (e-stack2-confirm.md, "S24 results").
- E2i's open problems (e2i-prereg.md §8): travel phases still slower than the field's (1.1–1.25 km/h against Sonso's
  1.9–2.2) with more and longer halts; climbing at the stylized `climbMps` 0.22 m/s (0.5 m/s cited for wild chimpanzees,
  secondary) is 16–19% of adults' travel time; walking on fallback food at 0.3 × the walking speed (a design multiplier)
  doubled with the walk.
- Already in hand (S22 and S24 confirm energy-diagnose, 5 seeds, read before this file was written; a pointer, not the
  diagnosis): with the faster walk every class's true day range rose ~65% (males 2.07 → 3.43 km, nursing mothers 1.95 →
  3.24, juveniles 2.04 → 3.42), the walk's energy +33–49 kcal/day for adults and juveniles, climbing +9–15, mothers'
  carrying +10; intake rose +33–81 kcal/day; mothers' milk to infants fell 22 kcal/day.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S22 + `walkGait` 1 against S22, quick mode (seeds 48 and 7, burn-in
   30, 30 days), simulation truth: by class, time and energy in walking, climbing, halts inside travel and walking on
   fallback food; how many more trees, trips and climbs the faster walk produces; the energy each adds against what
   intake gains; why mothers, juveniles and infants pay most (carrying, climbing with an infant, following). Name the
   term that turns a faster walk into an energy loss, with numbers.
2. **Mechanism** behind a new switch (0 = today), from first principles, only for the term the diagnosis implicates;
   every input sourced or tagged design; no constant chosen to hit a rate.
3. At most three iterations, each logged here and committed before its run; arms = S22 + `walkGait` 1 + the switch
   (quick, seeds 48 and 7) judged against the integrator's four S22 quick realizations (S22q, S22q1–3 by `rngSalt`,
   bench-run3 ea794ff) by e-noise.md amendment 2 with amendment 3's rare rows.

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**What the code does (read at 0d08525, field profile, S22's switches + `walkGait`).**
- *Walking.* With `walkGait` every walk moves at the body's speed (gait.ts: 0.88 / 0.78 m/s by sex, × (mass ÷ adult
  mass)^⅙ below adult mass, × 0.75 ÷ 0.78 while carrying), the act multipliers unchanged (follow 1.15, play 1.4–1.6,
  pair approach 1.1, …). Feeding on fallback food walks at 0.3 × it (execution.ts `fallbackTick` :1081 and the timers'
  forage walk :1001; design multiplier).
- *Climbing.* `moveTo` (execution.ts :105–177) descends to the ground before any goal more than 3 m away horizontally
  (at `climbMps` × 1.4, :139) and climbs only within 3 m of the goal (at `climbMps`, :173): every crown, nest, groomed or
  guarded animal above the ground is a full climb from the ground. `climbMps` is 0.22 m/s (stylized, no source); the
  factor keeps the life stage below 10 y (gait.ts `youngStage`). Crowns are fed at 45–73% of the tree's height (forageTick
  :1018), trees 8–26 m (generation.ts SPECIES), nests at 60–80% (generation.ts :212).
- *Energy (energy.ts energyTick :483–491, rideTick :526–536).* Every horizontal metre moved costs sockol2007's net
  3.8 J/kg/m (ground or canopy), every metre climbed mass × g ÷ `ledgerClimbEff` (0.2: 49 J/kg/m; descent free,
  stylized); a carried infant's metres are charged to its carrier at the infant's mass; time costs the resting rate × 1.25
  (any awake act but feeding, standing in travel included) or × 1.38 (forage, the climb into a crown included). So halts
  inside travel cost what rest costs; only metres cost more.
- *Valuation.* A crown, own trip, joined trip or caller's crown is worth its net energy rate (intake.ts `netRateShare`,
  E3c): (E − C) ÷ (walk time + eating time), C = the walk's and the climb's energy; the climb's *time* is not in it (a
  valuation–movement mismatch, listed in §6). With `walkGait` the walk time falls by ~2.3×, the energy per metre does not.

**Tool.** `scripts/climb-diagnose.ts` (new; its header defines every readout; reads only: `energyTap` and the world after
each tick). Smoke-tested on 2 days of S22 + `walkGait` (seed 48) before this registration: every readout fills, and its
own walk, climb and carry kcal equal the ledger's books (energyTap) to 0.1 kcal/day in every class. Readouts by class
(energy-diagnose's classes) per animal-day: minutes walking, climbing up and down, in the canopy, still and carried, by
act and by raw action; metres walked and climbed and their kcal (the ledger's formula), carrying split into walking and
climbing; trips, trip distance, crown visits, ascents (by act) and their height, descents; per crown visit the kcal
eaten there and the locomotion spent since the previous visit; kcal eaten by food and milk drunk; observer-travel bouts
and the halts inside them (per bout, minutes, reasons); speed while walking in trips; batesByrne2009's movement phases
and halts of ≥ 20 min. Reserves %/day (OLS on the daily mean of reserves ÷ store, the integrator's judge), absorbed
energy (kcal in − passed out), foregut-full share of daylight and eating minutes: energy-diagnose. Rows: e-bench.

**Runs** (quick: seeds 48 and 7, burn-in 30, 30 days, field profile; from a frozen detached checkout of the commit that
registers this section):
- W = S22 + `walkGait` 1 (S22q-params.json + `"walkGait":1`; the quick counterpart of S24): e-bench, energy-diagnose,
  climb-diagnose.
- Reference: the integrator's four S22 quick realizations (S22q, S22q1–3 by `rngSalt`; e-bench and energy-diagnose,
  bench-run3 ea794ff, code identical to this stage's start for S22) and climb-diagnose on the same four parameter sets
  (this stage's runs, same frozen checkout).

**Decomposition and what names the term (registered now).** For each class, Δ = W − the S22 mean, in kcal/day: own
walking by action (trips, follows, play, fallback, drinking, other), own climbing by action (crowns, nests, approaches to
animals in trees, follows, play), carrying (its walking and its climbing), the time terms (activity), digestion, milk
and growth; against Δ absorbed energy (and, for infants, Δ milk drunk). The net loss of a class is Δ(expenditure) −
Δ(absorbed). Over the classes that pay (nursing mothers, juveniles 5–12 y, infants 0.5–2 y), the term named is the one
that carries the largest share of the added locomotion energy, read with the counts that make it:
- own walking in trips (longer trips, more trips) → the trip's valuation and the time a faster walk saves in it; the
  mechanism then concerns how a trip's time and energy are weighed, not a speed;
- climbing (more crowns × the climb per crown, or climbs that are not to food) → climbing: its energy per metre, its
  number (every crown a full climb from the ground), its speed;
- carrying (an infant's metres on its mother, climbing with an infant) or infants' own climbing behind their mothers →
  the load and the rule that sets it;
- walking on fallback food ≥ 25% of the added walking → the 0.3 multiplier;
- halts inside travel cost the resting rate by construction (above): they are implicated only through time (a halt that
  takes time from feeding), which the minutes by act show.
Why these classes pay more than adult males is read from the same decomposition: what intake each class gains per added
kcal of locomotion, how often its foregut is full in daylight, and where the time a faster walk frees goes (eating, rest,
grooming, play). The diagnosis names one term with its numbers; step 2 builds for that term only.

**Expected (from the confirm energy logs of S22 and S24, a pointer; low confidence):** own walking in trips carries most of
the added energy (+33–49 kcal/day for adults), climbing second (+9–15), mothers' carrying third (+10), walking on fallback
food under 5%; intake rises less than the expenditure in mothers and juveniles; infants lose milk (−6 to −35 kcal/day)
more than they spend walking or climbing.

**Samples of the field rows the arms are scored on** (as opened for E2i, e2i-prereg.md §3; plus T-FOOD-10):
T-RNG-4 and T-RNG-5 (batesByrne2009, Budongo Sonso, 15 adults, unweighed, 5-min GPS or trail-grid fixes while
travelling, focal follows ≥ 8 h; males 2.7 ± 1.5 km, lactating 1.2 ± 0.8 km); T-ACT-1–3 (villioth2025, Budongo
Waibira, 10 adult males and 9 adult females, 7 lactating, unweighed, continuous focal follows from the night nest;
travel includes arboreal climbing and movement within the canopy); T-ACT-4 (potts2011, Ngogo and Kanyawara monthly means,
continuous focal, resting includes grooming; and villioth2025); T-FOOD-4 (janmaat2013b, Taï, 5 adult females with
offspring, 275 full days; normand2009, 2 females, 28 days); T-FOOD-10 (janmaat2014, Taï, 5 adult females with
offspring followed from nest to nest in fruit-scarce periods, 179 days, unweighed; 18% of departures before sunrise).

### 2.1 Amendment 1 (registered 4 October 2026 after reading the first realizations, before the readouts it adds were run)

Read so far (climb-diagnose of W and S22q, one realization each; energy-diagnose of W against S22q, S22q1, S22q2): with
the faster walk adults and juveniles start 34–49% more trips a day at an unchanged start distance (males 15.3 → 21.2,
nursing mothers 12.6 → 16.9, juveniles 14.0 → 20.8; median 92–110 m in both), reach 12–17% more crowns and eat 11–17%
less per crown visit; walking in trips is the largest added term (+20–27 kcal/day of walking in the travel act for males,
mothers and juveniles), climbing into crowns next (+5–10), mothers' carrying +8. Trips outnumber crown visits 1.6 to 1 on
S22 and 1.9 to 1 on W, so many trips do not end at their tree. To read why before naming the term, two readouts are added
to climb-diagnose (header, "travel episodes"): each travel episode's kind, its foregut room and hunger at the start, its
metres and minutes, and its outcome (fed at the target, fed at another tree, retargeted, fallback, follow, nest, other);
and each crown visit's foregut room at arrival and why it ended (sated, emptied, the next act). Smoke-tested on 2 days of
W (every readout fills; walk kcal still equal to the ledger's). Run on W and the four S22 parameter sets from a frozen
checkout of the commit that registers this amendment; the earlier climb-diagnose outputs are kept beside them.

### 2.2 Amendment 2 (registered 4 October 2026 after amendment 1's readouts were read, before this one ran)

Amendment 1's readouts (S22's four runs against W) show the faster walk scales trips of every outcome: travel episodes
+27–36% a day for adults and juveniles, the share of travel km in episodes that end feeding at their target unchanged
(39% → 36% for nursing mothers, 40% → 39% for males, 25% → 22% for juveniles), mothers setting off with less foregut room
(0.44 → 0.39 of capacity) and leaving crowns for another trip before they are sated more often (1.42 → 2.09 a day).
Before a mechanism is chosen for the trip's valuation, one counterfactual readout sizes the two omissions of §6 in it
(climb-diagnose `--cf`, header): each tree option re-valued (b) with the climb's and the descent's time added at the
body's climbing speed, and (c) also with a carried infant's mass in the trip's energy; reported as the share of rules
decisions whose top option changes and whose top trip loses the top (E2i's walking speed changed the top option in 7.1%
of decisions at a body speed, e2i-prereg.md §2.1). Smoke-tested on 2 days of W. Run on W and S22q from a frozen checkout
of the commit that registers this amendment. Reading registered now: if the omissions change the top option in under a
third of the decisions the walking speed changes (under ~2.4%), correcting them cannot by itself undo the trip increase.

### 2.3 Diagnosis results (frozen checkouts 7017f22, b1fbacd and 268a72f, clean; quick, seeds 48 and 7, 30 + 30 days; every number printed by the stage's scripts `table.py`, `compact.py`, `episodes.py` from the JSON in the stage's scratch directory, `runs/`)

W = S22 + `walkGait` 1 (bench, energy-diagnose, climb-diagnose) against the integrator's four S22 quick realizations
(bench and energy-diagnose, bench-run3 ea794ff) and this stage's climb-diagnose runs of the same four parameter sets.

```
  S22q: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  S22q1: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  S22q2: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  S22q3: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  W: 7017f22 dirty 0 prescriptions 42 viability pass deaths 0 starvation 0
quick, reference custom (4 runs), rows counted in all runs: fitted 14, held-out 10
  fitted             (14 rows) ref 1.59, 1.20, 1.69, 1.59 (mean 1.52, sd 0.22; used 0.69) | W.json: 1.24, Δ -0.28, z -0.4 (inside noise)
  held-out           (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 1.26) | W.json: 3.13, Δ -0.29, z -0.2 (inside noise)
  held-out w/o rare  (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 0.51) | W.json: 3.13, Δ -0.29, z -0.5 (inside noise)
   T-FOOD-2  fitted   ref 0.08±0.08 | W.json 0.31 (fail)
```

| Readout | S22 runs | S22 mean ± SD | W |
| --- | --- | --- | --- |
| T-RNG-4 | 1.607 / 1.719 / 1.324 / 1.502 | 1.538 ± 0.168 | 2.188 (z +3.5) |
| T-RNG-5 | 0.947 / 0.940 / 1.254 / 1.140 | 1.070 ± 0.153 | 1.033 (z -0.2) |
| T-ACT-1 | 0.374 / 0.369 / 0.372 / 0.378 | 0.373 ± 0.004 | 0.384 (z +2.6) |
| T-ACT-2 | 0.152 / 0.166 / 0.153 / 0.163 | 0.158 ± 0.007 | 0.118 (z -5.4) |
| T-ACT-3 | 0.094 / 0.094 / 0.107 / 0.093 | 0.097 ± 0.007 | 0.104 (z +0.9) |
| T-ACT-4 | 0.409 / 0.334 / 0.389 / 0.322 | 0.363 ± 0.042 | 0.416 (z +1.1) |
| T-FOOD-10 | 0.497 / 0.530 / 0.436 / 0.464 | 0.482 ± 0.041 | 0.517 (z +0.8) |
| T-FOOD-4 | 7.783 / 8.543 / 7.922 / 8.217 | 8.116 ± 0.337 | 9.366 (z +3.3) |
| T-FOOD-2 | 0.776 / 0.814 / 0.791 / 0.791 | 0.793 ± 0.016 | 0.835 (z +2.4) |
| T-PTY-1 | 3.661 / 4.088 / 4.532 / 3.995 | 4.069 ± 0.359 | 4.736 (z +1.7) |
| T-HUN-1 | 0.000 / 4.033 / 0.000 / 0.000 | 1.008 ± 2.017 | 0.000 (z -0.4) |
| reserves %/day, adult male | 0.009 / -0.000 / 0.010 / 0.004 | 0.006 ± 0.005 | 0.001 (z -1.0) |
| reserves %/day, female, other | 0.003 / 0.019 / 0.007 / -0.010 | 0.005 ± 0.012 | 0.010 (z +0.4) |
| reserves %/day, female, lactating | 0.006 / -0.003 / -0.013 / 0.014 | 0.001 ± 0.012 | -0.049 (z -3.9) |
| reserves %/day, juvenile 5–12 y | 0.004 / -0.009 / 0.009 / 0.015 | 0.005 ± 0.010 | -0.000 (z -0.4) |
| reserves %/day, infant 2–5 y | 0.016 / -0.002 / -0.033 / 0.007 | -0.003 ± 0.021 | -0.038 (z -1.5) |
| reserves %/day, infant 0.5–2 y | -0.006 / 0.010 / 0.014 / 0.022 | 0.010 ± 0.012 | -0.047 (z -4.3) |
| true day range km, adult male | 1.65 / 2.03 / 1.76 / 1.83 | 1.82 ± 0.16 | 2.71 (z +5.0) |
| true day range km, female, other | 1.07 / 1.48 / 1.37 / 1.45 | 1.34 ± 0.19 | 2.08 (z +3.5) |
| true day range km, female, lactating | 1.63 / 1.68 / 1.70 / 1.63 | 1.66 ± 0.03 | 2.72 (z +27.5) |
| true day range km, juvenile 5–12 y | 1.73 / 1.98 / 1.76 / 1.82 | 1.82 ± 0.11 | 2.99 (z +9.3) |
| true day range km, infant 2–5 y | 0.27 / 0.27 / 0.30 / 0.28 | 0.28 ± 0.01 | 0.44 (z +9.9) |
| true day range km, infant 0.5–2 y | 0.14 / 0.18 / 0.18 / 0.16 | 0.16 ± 0.02 | 0.28 (z +6.2) |
| climbing kcal/d, adult male | 49.7 / 61.9 / 56.2 / 55.5 | 55.8 ± 5.0 | 66.2 (z +1.9) |
| walking kcal/d, adult male | 59.6 / 73.5 / 63.9 / 66.2 | 65.8 ± 5.8 | 98.2 (z +5.0) |
| climbing kcal/d, female, lactating | 33.2 / 34.8 / 35.5 / 35.3 | 34.7 ± 1.0 | 41.3 (z +5.6) |
| walking kcal/d, female, lactating | 51.0 / 52.6 / 52.5 / 51.4 | 51.9 ± 0.8 | 82.0 (z +32.7) |
| climbing kcal/d, juvenile 5–12 y | 41.4 / 45.5 / 46.5 / 43.6 | 44.3 ± 2.2 | 50.4 (z +2.4) |
| walking kcal/d, juvenile 5–12 y | 55.5 / 61.0 / 57.3 / 57.8 | 57.9 ± 2.3 | 87.3 (z +11.5) |
| climbing kcal/d, infant 2–5 y | 11.8 / 12.1 / 13.1 / 12.8 | 12.5 ± 0.6 | 14.6 (z +3.2) |
| walking kcal/d, infant 2–5 y | 3.6 / 3.7 / 4.0 / 4.0 | 3.8 ± 0.2 | 5.8 (z +8.6) |
| climbing min/d (up + down), adult male | 19.1 / 23.8 / 21.6 / 21.4 | 21.5 ± 2.0 | 25.4 (z +1.8) |
| climbing min/d (up + down), female, lactating | 16.0 / 16.8 / 17.2 / 17.1 | 16.8 ± 0.5 | 19.8 (z +5.0) |
| climbing min/d (up + down), juvenile 5–12 y | 25.4 / 28.3 / 28.6 / 27.1 | 27.3 ± 1.5 | 31.3 (z +2.4) |
| climbing min/d (up + down), infant 2–5 y | 19.8 / 20.0 / 22.3 / 21.8 | 21.0 ± 1.3 | 24.0 (z +2.1) |
| halts per travel bout, adult male | 0.62 / 0.64 / 0.65 / 0.63 | 0.63 ± 0.01 | 0.69 (z +4.7) |
| halts per travel bout, female, lactating | 0.50 / 0.43 / 0.50 / 0.46 | 0.48 ± 0.03 | 0.47 (z -0.2) |
| halts per travel bout, juvenile 5–12 y | 0.71 / 0.75 / 0.75 / 0.79 | 0.75 ± 0.03 | 0.92 (z +4.5) |
| phase speed km/h, adult male | 0.83 / 0.80 / 0.81 / 0.83 | 0.82 ± 0.02 | 1.21 (z +20.3) |
| halts ≥ 20 min per day, adult male | 6.2 / 7.2 / 6.6 / 6.7 | 6.7 ± 0.4 | 8.3 (z +3.3) |
| phase speed km/h, female, lactating | 0.83 / 0.83 / 0.82 / 0.82 | 0.82 ± 0.01 | 1.15 (z +50.0) |
| halts ≥ 20 min per day, female, lactating | 5.2 / 5.6 / 5.2 / 5.4 | 5.4 ± 0.2 | 6.5 (z +5.4) |
| prescriptions | 43 / 43 / 43 / 43 | 43 ± 0 | 42 |

The registered decomposition (§2), Δ = W − the S22 mean, with the counts that make it (climb-diagnose amendment 1 for the
episode rows; activity, digestion, milk given, expenditure and absorbed from energy-diagnose):

| term (kcal/day unless stated): S22 mean of 4 → W (Δ; z) | nursing mothers | infants 0.5–2 y | infants 2–5 y | juveniles 5–12 y | adult males |
| --- | --- | --- | --- | --- | --- |
| own walking in trips (travel act) | 38.9 → 65.3 (+26.4; z +29.8) | 0 | 0 | 34.7 → 54.7 (+20.0; z +6.5) | 54.1 → 77.3 (+23.2; z +6.1) |
| own walking, all other acts | 13.0 → 16.7 (+3.7; z +7.3) | 1.9 → 2.9 (+1.0; z +4.8) | 3.8 → 5.8 (+1.9; z +8.6) | 23.1 → 32.6 (+9.4; z +4.5) | 11.7 → 20.9 (+9.2; z +3.1) |
| own climbing into crowns (forage act) | 26.0 → 31.1 (+5.1; z +5.3) | 0.19 → 0.18 (-0.02; z -1.1) | 1.02 → 1.04 (+0.01; z +0.1) | 27.9 → 31.5 (+3.7; z +2.4) | 40.1 → 47.5 (+7.4; z +2.5) |
| own climbing behind a carer (follow act) | 0 | 4.1 → 6.2 (+2.1; z +4.4) | 9.0 → 10.7 (+1.7; z +6.8) | 1.9 → 3.6 (+1.8; z +3.9) | 0.00 → 0.00 (+0.0) |
| own climbing, all other acts | 8.7 → 10.2 (+1.5; z +2.7) | 1.5 → 2.2 (+0.7; z +5.6) | 2.4 → 2.9 (+0.4; z +1.3) | 14.5 → 15.2 (+0.7; z +0.9) | 15.7 → 18.7 (+3.0; z +1.1) |
| carrying a dependent (walking + climbing) | 13.6 → 21.7 (+8.1; z +16.2) | 0 | 0 | 0 | 0 |
| activity (time at 1.25 / 1.38 × resting) | 141.1 → 145.3 (+4.3; z +4.9) | 31.3 → 31.9 (+0.6; z +1.8) | 58.9 → 60.0 (+1.2; z +3.8) | 125.8 → 127.4 (+1.6; z +2.8) | 151.8 → 153.2 (+1.4; z +4.4) |
| digestion | 168.9 → 170.5 (+1.6; z +1.9) | 36.0 → 36.3 (+0.4; z +1.5) | 61.1 → 61.2 (+0.1; z +0.3) | 123.1 → 127.1 (+4.0; z +7.7) | 152.2 → 156.7 (+4.5; z +4.5) |
| milk given | 351.6 → 331.7 (-19.9; z -2.7) | 0 | 0 | 0 | 0 |
| expenditure, all terms | 1688.4 → 1718.8 (+30.3; z +5.0) | 360.0 → 364.4 (+4.5; z +5.9) | 611.0 → 615.6 (+4.6; z +7.2) | 1227.5 → 1268.4 (+40.9; z +8.7) | 1518.1 → 1566.7 (+48.6; z +3.7) |
| absorbed (kcal in − passed out) | 1689.5 → 1706.1 (+16.6; z +2.1) | 360.0 → 362.7 (+2.7; z +1.4) | 610.4 → 613.3 (+2.9; z +0.9) | 1230.5 → 1270.8 (+40.4; z +8.9) | 1521.6 → 1566.1 (+44.4; z +4.5) |
| net (absorbed − expenditure) | 1.0 → -12.7 (-13.7; z -4.3) | 0.04 → -1.71 (-1.75; z -1.2) | -0.5 → -2.2 (-1.7; z -0.5) | 3.0 → 2.4 (-0.5; z -0.1) | 3.5 → -0.6 (-4.1; z -1.0) |
| milk drunk | 0 | 283.0 → 283.3 (+0.3; z +0.1) | 279.6 → 247.5 (-32.1; z -3.5) | 0 | 0 |
| travel episodes per day (count) | 11.5 → 15.3 (+3.9; z +8.1) | 0 | 0 | 14.0 → 19.0 (+5.0; z +4.3) | 14.9 → 18.9 (+4.1; z +2.7) |
| … ending fed at their target (count) | 4.4 → 6.0 (+1.6; z +4.7) | 0 | 0 | 2.9 → 3.2 (+0.3; z +1.4) | 5.2 → 7.0 (+1.8; z +2.7) |
| km/day in travel episodes | 1.4 → 2.3 (+0.9; z +28.8) | 0 | 0 | 1.4 → 2.3 (+0.9; z +7.1) | 1.5 → 2.2 (+0.7; z +6.0) |
| … of it in episodes not ending fed at the target | 0.83 → 1.46 (+0.63; z +12.0) | 0 | 0 | 1.05 → 1.76 (+0.71; z +8.1) | 0.92 → 1.32 (+0.40; z +7.0) |
| foregut room at a trip's start (share) | 0.44 → 0.39 (-0.04; z -4.3) | — | — | 0.44 → 0.41 (-0.03; z -5.5) | 0.46 → 0.44 (-0.02; z -1.7) |
| crown visits per day (count) | 8.1 → 9.0 (+0.8; z +4.6) | 1.10 → 1.14 (+0.04; z +1.7) | 5.0 → 5.2 (+0.2; z +1.8) | 10.3 → 11.0 (+0.7; z +1.7) | 9.7 → 10.9 (+1.2; z +2.7) |
| kcal eaten per crown visit | 176.6 → 156.9 (-19.7; z -6.9) | 37.1 → 38.0 (+0.9; z +0.5) | 53.4 → 52.8 (-0.6; z -0.5) | 115.8 → 115.0 (-0.8; z -0.3) | 155.4 → 143.9 (-11.4; z -1.9) |
| visits left for another trip before sated, per day | 1.4 → 2.1 (+0.7; z +4.8) | 0 | 0 | 1.36 → 1.54 (+0.18; z +2.2) | 1.51 → 1.99 (+0.48; z +1.8) |
| metres climbed per day | 94.6 → 112.5 (+17.9; z +5.6) | 69.4 → 103.5 (+34.1; z +4.8) | 92.7 → 107.3 (+14.6; z +2.9) | 139.6 → 160.1 (+20.5; z +2.5) | 122.1 → 144.7 (+22.6; z +1.9) |
| eating min per day | 298.3 → 320.7 (+22.5; z +4.4) | 35.5 → 37.3 (+1.8; z +2.5) | 126.5 → 138.7 (+12.2; z +7.0) | 278.2 → 285.6 (+7.4; z +2.1) | 228.1 → 233.6 (+5.5; z +3.5) |
| fallback food eaten (formula kcal) | 370.0 → 435.4 (+65.4; z +1.8) | 12.4 → 12.4 (+0.0; z +0.0) | 36.3 → 45.1 (+8.8; z +3.7) | 92.4 → 65.3 (-27.1; z -2.2) | 78.8 → 63.2 (-15.6; z -1.7) |

Walking ÷ climbing energy per day (energy-diagnose; pontzerWrangham2004's wild Kanyawara chimpanzees: about 10, from
measured distances and published equations): S22 1.18 (males), 1.51 (nursing mothers), 1.30 (juveniles); W 1.48, 1.99,
1.73. Amendment 2's counterfactual: adding the climb's and the descent's time to every tree option's rate changes the
top option in 2.66% of W's 115,631 daylight rules decisions (2.79% with a riding infant's metres; nursing mothers 3.04%
and 3.73%), and a trip loses the top in 1.49% (1.60%); in S22q 2.45% (2.53%) and 1.08% (1.15%). E2i's walking speed
changed the top option in 7.1%.

**The term (registered rule, §2).** Over the classes that pay (in quick mode nursing mothers, reserves 0.001 ± 0.012 →
−0.049 %/day, z −3.9, net −13.7 kcal/day; infants 0.5–2 y, 0.010 ± 0.012 → −0.047, z −4.3; juveniles do not pay here,
net −0.5), the added locomotion is walking in trips: mothers +26.4 kcal/day of own walking in the travel act and +8.1 of
carrying (mostly on the walk), against +5.1 climbing into crowns; juveniles +20.0 against +3.7. It comes from more trips,
not longer ones: travel episodes +34–36% a day (mothers 11.5 → 15.3, juveniles 14.0 → 19.0, males 14.9 → 18.9) at the
same start distance (median 98 → 110 m mothers, 106 → 106 males), the share of travel km in episodes that end feeding at
their target unchanged (mothers 39% → 36%, males 40% → 39%, juveniles 25% → 22%): every kind of trip scales. Mothers set
off with less room in the foregut (0.44 → 0.39 of capacity), leave crowns for another trip before they are sated more
often (1.4 → 2.1 a day) and eat 11% less per crown visit (177 → 157 kcal), while their absorbed energy rises 1% (+16.6
kcal/day: the extra 22 min of eating is mostly fibrous fallback, +65 kcal eaten, foregut full in 11.6% of daylight
against 8.6%). Each added trip costs a mother ~11.5 kcal (walk, carry, one climb). The infants' added cost is their own
climbing behind their mothers (+2.1 of +3.8 kcal/day: 34 m more a day, ascents 8.1 → 11.7); infants of 2–5 y pay in
milk (−32 kcal/day: mothers refuse more, E1o's weanDeficit). Halts inside travel cost the resting rate; they change
little (mothers 0.48 → 0.47 per bout; males 6.7 → 8.3 halts ≥ 20 min a day).

**Named:** the trip's valuation. A faster walk shortens every trip's time in the forager's rate (E3c: (E − C) ÷ (walk +
eating)), so trips win against staying, resting or socializing at lower hunger, and every trip's walk, carry and climb
is paid in energy that the gut-limited intake of nursing mothers cannot return. Amendment 2 shows the trip's rate also
omits two parts of what a trip costs the body: the climb's and descent's time and a riding infant's metres (§4).

## 3. Sources (read 4 October 2026; addenda "Addendum: E2j climbing" in research.md and e-sources.md)

- **pontzerWrangham2004** (abstract, PubMed PMID 14984786, read in full; the e-sources dead-end note "no abstract on
  PubMed" is wrong for this paper; the full text stays closed) [M]: Kanyawara, wild chimpanzees, "we measured the
  distance climbed and walked per day ... and used published equations to calculate the relative daily energy costs.
  ... chimpanzees spend approximately ten-times more energy per day on terrestrial travel than on vertical climbing".
  Distances, sample and equations are not in the abstract (not verified: two routes, PubMed and Europe PMC's open citing
  papers). Use: a target relation (walking ÷ climbing energy), never an input; the model's 1.2–2.0 is a reported miss.
- **charnov1976, stephensKrebs1986** (already cited, E3c): the rate's time is all the time an option takes besides
  eating (travel or search). Use: the climb's and the descent's time belong in a trip's rate.
- **sockol2007** and the ledger's climbing work (already cited): the costs per metre the ledger charges, also for a
  riding infant (energy.ts rideTick); Use: a trip's energy includes the rider's metres.
- **neufuss2018** (FT; cited by name in research.md before, key added; read for a climbing speed): cycle durations and duty factors of semi-free-ranging
  chimpanzees, no speed. The only chimpanzee climbing speed on record is 0.5 m/s (nguessan2009 citing pontzerWrangham2004,
  secondary [L]); `climbMps` (0.22, stylized) is left as it is (the stage's term is not a speed).

## 4. Mechanism (iteration 1, B1; registered 4 October 2026 before its run)

`tripBodyCost` 1 (src/sim/gait.ts `tripClimbH`, `riderKcal`; src/sim/intake.ts `netRateShare`; src/sim/candidates.ts
`rateWorth`, `treeFoodWorth`; read only under `forageRate`; 0 = today, bit for bit): the net energy rate of a crown or
a trip charges the time and the energy the body spends on it, as the movement and the ledger already do.
- *Time:* the descent from where the animal stands when the goal is more than 3 m away (moveTo descends first, at 1.4 ×
  the climbing speed) and the climb to the crown (at `climbMps` × bodySpeed, the factor moveTo's climb applies before
  rain and light) join the walk's time in the rate's denominator.
- *Energy:* the metres of a dependent riding on the animal join the trip's energy at the rider's mass (energy.ts
  rideTick): on a trip's walk every dependent under 4 y, on a feeding approach and up the crown only one under 1.2 y
  (candidates.ts isCarried).
- No new magnitude; no pause added; no speed changed. Removes no counted prescription (42 with `walkGait`).

## 5. Predictions and kill criterion (iteration 1; registered before its run)

Arm **B1** = S22 + `walkGait` 1 + `tripBodyCost` 1, quick (seeds 48 and 7, burn-in 30, 30 days): e-bench, energy-diagnose
and climb-diagnose from a frozen checkout of the commit that registers this section; judged against the four S22 quick
realizations by e-noise.md amendment 2 with amendment 3's rare rows; W reported beside it.

Predictions (moderate confidence on direction, low on size; amendment 2 sized the omissions at about a third of the
walking speed's effect on choices):
1. Prescriptions 42 (high); viability passes; sums inside noise.
2. Travel episodes a day between S22's and W's: mothers 13.5–15.0 (W 15.3), males 16.5–18.6 (W 18.9); crown visits and
   metres climbed a day between them as well.
3. Mothers' own walking in trips 55–64 kcal/day (W 65.3, S22 38.9); carrying 17–21 (W 21.7, S22 13.6).
4. Mothers' reserves −0.045 to −0.020 %/day (W −0.049, S22 0.001 ± 0.012): still beyond 2 SD below S22's mean (z < −2):
   the omissions are real but small, so iteration 1 does not by itself let walkGait join (moderate).
5. Infants 0.5–2 y: reserves between W's −0.047 and S22's 0.010; their climbing behind their mothers falls (low).
6. T-RNG-4 between S22's 1.54 and W's 2.19; T-ACT-2 within ±0.01 of W's 0.118; T-FOOD-10 inside the reference spread
   (low).

**Kill criterion (B1 recorded, not a keep candidate, if any holds):** viability fails; held-out without the rare rows worse
beyond noise (z > +2); night safety fails (> 3.3% of the night, rhythm-metrics, run only on a kept arm); the count is not
42; nursing mothers' or infants' 0.5–2 y reserve trend more than 2 SD below S22's mean (the stage's goal: walkGait joins
without their energy loss). An iteration 2 is registered only for a term B1's diagnosis names.

## 7. Results, iteration 1 (B1 = S22 + `walkGait` 1 + `tripBodyCost` 1; frozen checkout 8978d18, clean; quick, seeds 48 and 7; printed by `table.py`, `compact.py`, `episodes.py` from the JSON in the stage's scratch directory)

```
  S22q: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  S22q1: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  S22q2: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  S22q3: ea794ff dirty 0 prescriptions 43 viability pass deaths 0 starvation 0
  W: 7017f22 dirty 0 prescriptions 42 viability pass deaths 0 starvation 0
  B1: 8978d18 dirty 0 prescriptions 42 viability pass deaths 0 starvation 0
quick, reference custom (4 runs), rows counted in all runs: fitted 14, held-out 10
  fitted             (14 rows) ref 1.59, 1.20, 1.69, 1.59 (mean 1.52, sd 0.22; used 0.69) | W.json: 1.24, Δ -0.28, z -0.4 (inside noise) | B1.json: 1.45, Δ -0.07, z -0.1 (inside noise)
  held-out           (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 1.26) | W.json: 3.13, Δ -0.29, z -0.2 (inside noise) | B1.json: 3.46, Δ +0.05, z +0.0 (inside noise)
  held-out w/o rare  (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 0.51) | W.json: 3.13, Δ -0.29, z -0.5 (inside noise) | B1.json: 3.46, Δ +0.05, z +0.1 (inside noise)
   T-FOOD-10 held-out ref 0.83±0.18 | W.json 0.98 (fail) | B1.json 1.47 (fail)
   T-FOOD-2  fitted   ref 0.08±0.08 | W.json 0.31 (fail) | B1.json 0.03 (fail)
```

| Readout | S22 runs | S22 mean ± SD | W | B1 |
| --- | --- | --- | --- | --- |
| T-RNG-4 | 1.607 / 1.719 / 1.324 / 1.502 | 1.538 ± 0.168 | 2.188 (z +3.5) | 2.173 (z +3.4) |
| T-RNG-5 | 0.947 / 0.940 / 1.254 / 1.140 | 1.070 ± 0.153 | 1.033 (z -0.2) | 0.980 (z -0.5) |
| T-ACT-1 | 0.374 / 0.369 / 0.372 / 0.378 | 0.373 ± 0.004 | 0.384 (z +2.6) | 0.392 (z +4.2) |
| T-ACT-2 | 0.152 / 0.166 / 0.153 / 0.163 | 0.158 ± 0.007 | 0.118 (z -5.4) | 0.111 (z -6.4) |
| T-ACT-3 | 0.094 / 0.094 / 0.107 / 0.093 | 0.097 ± 0.007 | 0.104 (z +0.9) | 0.096 (z -0.1) |
| T-ACT-4 | 0.409 / 0.334 / 0.389 / 0.322 | 0.363 ± 0.042 | 0.416 (z +1.1) | 0.407 (z +0.9) |
| T-FOOD-10 | 0.497 / 0.530 / 0.436 / 0.464 | 0.482 ± 0.041 | 0.517 (z +0.8) | 0.624 (z +3.1) |
| T-FOOD-4 | 7.783 / 8.543 / 7.922 / 8.217 | 8.116 ± 0.337 | 9.366 (z +3.3) | 8.084 (z -0.1) |
| T-FOOD-2 | 0.776 / 0.814 / 0.791 / 0.791 | 0.793 ± 0.016 | 0.835 (z +2.4) | 0.786 (z -0.4) |
| T-PTY-1 | 3.661 / 4.088 / 4.532 / 3.995 | 4.069 ± 0.359 | 4.736 (z +1.7) | 4.041 (z -0.1) |
| T-HUN-1 | 0.000 / 4.033 / 0.000 / 0.000 | 1.008 ± 2.017 | 0.000 (z -0.4) | 0.000 (z -0.4) |
| reserves %/day, adult male | 0.009 / -0.000 / 0.010 / 0.004 | 0.006 ± 0.005 | 0.001 (z -1.0) | -0.003 (z -1.8) |
| reserves %/day, female, other | 0.003 / 0.019 / 0.007 / -0.010 | 0.005 ± 0.012 | 0.010 (z +0.4) | -0.003 (z -0.6) |
| reserves %/day, female, lactating | 0.006 / -0.003 / -0.013 / 0.014 | 0.001 ± 0.012 | -0.049 (z -3.9) | 0.004 (z +0.2) |
| reserves %/day, juvenile 5–12 y | 0.004 / -0.009 / 0.009 / 0.015 | 0.005 ± 0.010 | -0.000 (z -0.4) | -0.033 (z -3.2) |
| reserves %/day, infant 2–5 y | 0.016 / -0.002 / -0.033 / 0.007 | -0.003 ± 0.021 | -0.038 (z -1.5) | 0.029 (z +1.3) |
| reserves %/day, infant 0.5–2 y | -0.006 / 0.010 / 0.014 / 0.022 | 0.010 ± 0.012 | -0.047 (z -4.3) | -0.024 (z -2.5) |
| true day range km, adult male | 1.65 / 2.03 / 1.76 / 1.83 | 1.82 ± 0.16 | 2.71 (z +5.0) | 2.91 (z +6.1) |
| true day range km, female, other | 1.07 / 1.48 / 1.37 / 1.45 | 1.34 ± 0.19 | 2.08 (z +3.5) | 1.99 (z +3.1) |
| true day range km, female, lactating | 1.63 / 1.68 / 1.70 / 1.63 | 1.66 ± 0.03 | 2.72 (z +27.5) | 2.43 (z +19.9) |
| true day range km, juvenile 5–12 y | 1.73 / 1.98 / 1.76 / 1.82 | 1.82 ± 0.11 | 2.99 (z +9.3) | 2.93 (z +8.9) |
| true day range km, infant 2–5 y | 0.27 / 0.27 / 0.30 / 0.28 | 0.28 ± 0.01 | 0.44 (z +9.9) | 0.41 (z +7.6) |
| true day range km, infant 0.5–2 y | 0.14 / 0.18 / 0.18 / 0.16 | 0.16 ± 0.02 | 0.28 (z +6.2) | 0.28 (z +6.4) |
| climbing kcal/d, adult male | 49.7 / 61.9 / 56.2 / 55.5 | 55.8 ± 5.0 | 66.2 (z +1.9) | 59.5 (z +0.7) |
| walking kcal/d, adult male | 59.6 / 73.5 / 63.9 / 66.2 | 65.8 ± 5.8 | 98.2 (z +5.0) | 104.9 (z +6.0) |
| climbing kcal/d, female, lactating | 33.2 / 34.8 / 35.5 / 35.3 | 34.7 ± 1.0 | 41.3 (z +5.6) | 36.6 (z +1.6) |
| walking kcal/d, female, lactating | 51.0 / 52.6 / 52.5 / 51.4 | 51.9 ± 0.8 | 82.0 (z +32.7) | 73.9 (z +24.0) |
| climbing kcal/d, juvenile 5–12 y | 41.4 / 45.5 / 46.5 / 43.6 | 44.3 ± 2.2 | 50.4 (z +2.4) | 46.6 (z +0.9) |
| walking kcal/d, juvenile 5–12 y | 55.5 / 61.0 / 57.3 / 57.8 | 57.9 ± 2.3 | 87.3 (z +11.5) | 86.8 (z +11.3) |
| climbing kcal/d, infant 2–5 y | 11.8 / 12.1 / 13.1 / 12.8 | 12.5 ± 0.6 | 14.6 (z +3.2) | 13.5 (z +1.6) |
| walking kcal/d, infant 2–5 y | 3.6 / 3.7 / 4.0 / 4.0 | 3.8 ± 0.2 | 5.8 (z +8.6) | 5.4 (z +6.8) |
| held-out sum (all rows) | 5.13 / 4.09 / 6.10 / 3.83 | 4.79 ± 1.04 | 3.63 (z -1.0) | 3.96 (z -0.7) |
| prescriptions | 43 / 43 / 43 / 43 | 43 ± 0 | 42 | 42 |

| term (kcal/day unless stated): S22 mean of 4 → B1 (Δ; z) | nursing mothers | infants 0.5–2 y | infants 2–5 y | juveniles 5–12 y | adult males |
| --- | --- | --- | --- | --- | --- |
| own walking in trips (travel act) | 38.9 → 56.8 (+17.9; z +20.2) | 0 | 0 | 34.7 → 54.1 (+19.4; z +6.4) | 54.1 → 84.0 (+29.9; z +7.8) |
| own walking, all other acts | 13.0 → 17.1 (+4.1; z +8.3) | 1.9 → 2.8 (+0.9; z +4.2) | 3.8 → 5.4 (+1.5; z +6.8) | 23.1 → 32.7 (+9.5; z +4.5) | 11.7 → 20.9 (+9.2; z +3.1) |
| own climbing into crowns (forage act) | 26.0 → 27.2 (+1.2; z +1.3) | 0.19 → 0.16 (-0.04; z -2.5) | 1.02 → 0.84 (-0.19; z -1.5) | 27.9 → 28.3 (+0.4; z +0.3) | 40.1 → 43.0 (+2.9; z +1.0) |
| own climbing behind a carer (follow act) | 0 | 4.1 → 5.0 (+0.9; z +2.0) | 9.0 → 10.1 (+1.1; z +4.5) | 1.9 → 2.7 (+0.9; z +1.9) | 0 |
| own climbing, all other acts | 8.7 → 9.3 (+0.6; z +1.2) | 1.53 → 1.83 (+0.30; z +2.4) | 2.4 → 2.5 (+0.1; z +0.4) | 14.5 → 15.6 (+1.1; z +1.5) | 15.7 → 16.5 (+0.8; z +0.3) |
| carrying a dependent (walking + climbing) | 13.6 → 18.8 (+5.2; z +10.4) | 0 | 0 | 0 | 0 |
| activity (time at 1.25 / 1.38 × resting) | 141.1 → 145.7 (+4.7; z +5.4) | 31.3 → 31.9 (+0.6; z +1.9) | 58.9 → 59.7 (+0.9; z +2.9) | 125.8 → 126.2 (+0.4; z +0.7) | 151.8 → 153.7 (+1.9; z +6.2) |
| digestion | 168.9 → 171.7 (+2.8; z +3.4) | 36.0 → 36.2 (+0.3; z +1.1) | 61.1 → 61.8 (+0.7; z +2.6) | 123.1 → 125.3 (+2.3; z +4.4) | 152.2 → 156.8 (+4.5; z +4.6) |
| milk given | 351.6 → 346.0 (-5.6; z -0.8) | 0 | 0 | 0 | 0 |
| expenditure, all terms | 1688.4 → 1719.1 (+30.6; z +5.0) | 360.0 → 362.4 (+2.4; z +3.2) | 611.0 → 614.8 (+3.8; z +5.9) | 1227.5 → 1261.3 (+33.8; z +7.2) | 1518.1 → 1567.4 (+49.3; z +3.7) |
| absorbed (kcal in − passed out) | 1689.5 → 1717.1 (+27.6; z +3.6) | 360.0 → 362.4 (+2.4; z +1.2) | 610.4 → 618.5 (+8.1; z +2.6) | 1230.5 → 1253.8 (+23.3; z +5.2) | 1521.6 → 1568.2 (+46.6; z +4.7) |
| net (absorbed − expenditure) | 1.04 → -1.96 (-3.00; z -0.9) | 0.04 → 0.01 (-0.04; z -0.0) | -0.5 → 3.7 (+4.3; z +1.3) | 3.0 → -7.5 (-10.4; z -1.9) | 3.5 → 0.9 (-2.7; z -0.6) |
| milk drunk | 0 | 283.0 → 281.6 (-1.4; z -0.3) | 279.6 → 272.0 (-7.6; z -0.8) | 0 | 0 |
| travel episodes per day (count) | 11.5 → 12.7 (+1.2; z +2.6) | 0 | 0 | 14.0 → 17.3 (+3.3; z +2.9) | 14.9 → 17.4 (+2.5; z +1.7) |
| … ending fed at their target (count) | 4.4 → 5.2 (+0.8; z +2.4) | 0 | 0 | 2.9 → 3.0 (+0.1; z +0.5) | 5.2 → 6.3 (+1.1; z +1.6) |
| km/day in travel episodes | 1.36 → 2.00 (+0.63; z +19.7) | 0 | 0 | 1.4 → 2.2 (+0.8; z +6.8) | 1.5 → 2.4 (+0.8; z +7.8) |
| … of it in episodes not ending fed at the target | 0.83 → 1.16 (+0.33; z +6.3) | 0 | 0 | 1.05 → 1.69 (+0.64; z +7.2) | 0.92 → 1.41 (+0.50; z +8.6) |
| foregut room at a trip's start (share) | 0.44 → 0.40 (-0.04; z -4.1) | — | — | 0.44 → 0.42 (-0.02; z -4.4) | 0.46 → 0.45 (-0.01; z -0.6) |
| crown visits per day (count) | 8.1 → 8.3 (+0.1; z +0.6) | 1.10 → 1.09 (-0.01; z -0.3) | 5.0 → 4.9 (-0.1; z -1.4) | 10.3 → 10.3 (-0.0; z -0.1) | 9.7 → 10.2 (+0.5; z +1.0) |
| kcal eaten per crown visit | 176.6 → 169.8 (-6.8; z -2.4) | 37.1 → 37.3 (+0.2; z +0.1) | 53.4 → 54.5 (+1.2; z +1.0) | 115.8 → 119.0 (+3.1; z +1.0) | 155.4 → 153.4 (-2.0; z -0.3) |
| visits left for another trip before sated, per day | 1.42 → 1.57 (+0.15; z +1.1) | 0 | 0 | 1.36 → 1.45 (+0.10; z +1.1) | 1.51 → 1.65 (+0.14; z +0.5) |
| metres climbed per day | 94.6 → 99.6 (+5.1; z +1.6) | 69.4 → 84.4 (+15.0; z +2.1) | 92.7 → 100.7 (+8.1; z +1.6) | 139.6 → 147.5 (+7.9; z +0.9) | 122.1 → 130.2 (+8.1; z +0.7) |
| eating min per day | 298.3 → 323.3 (+25.0; z +4.9) | 35.5 → 38.4 (+2.9; z +4.0) | 126.5 → 132.3 (+5.9; z +3.3) | 278.2 → 280.6 (+2.4; z +0.7) | 228.1 → 234.5 (+6.4; z +4.1) |
| fallback food eaten (formula kcal) | 370.0 → 445.1 (+75.1; z +2.1) | 12.4 → 14.6 (+2.3; z +1.7) | 36.3 → 45.0 (+8.7; z +3.7) | 92.4 → 87.7 (-4.8; z -0.4) | 78.8 → 72.9 (-5.9; z -0.6) |

Walking ÷ climbing energy per day (pontzerWrangham2004: about 10): S22 1.18 / 1.50 / 1.31 (males, mothers, juveniles), W
1.48 / 1.99 / 1.73, B1 1.76 / 2.02 / 1.86.

**Against the predictions (§5).**
1. Prescriptions 42, viable (no death), sums inside noise (fitted z −0.1, held-out z +0.0 and +0.1 without the rare
   rows): held.
2. Travel episodes between S22's and W's: mothers 12.7 (13.5–15.0): missed low, the climb's time removed more of the
   increase than predicted (S22 11.5, W 15.3); males 17.4 (16.5–18.6): held; crown visits back at S22's (mothers 8.3,
   males 10.2) and metres climbed between S22's and W's: held.
3. Mothers' walking in trips 56.8 kcal/day (55–64): held; carrying 18.8 (17–21): held.
4. Mothers' reserves still beyond 2 SD below S22's mean: **missed** — +0.004 %/day (z +0.2), net −3.0 kcal/day (z −0.9),
   milk given back near S22's (−5.6 against W's −19.9), infants of 2–5 y drink theirs (−7.6 against −32.1).
5. Infants 0.5–2 y between W's and S22's: held (−0.024 %/day against W's −0.047; climbing behind their mothers +0.9
   kcal/day against W's +2.1; net 0.0 kcal/day, z 0.0) — but still beyond 2 SD below S22's mean (z −2.5).
6. T-RNG-4 2.17 (between 1.54 and 2.19): held; T-ACT-2 0.111 (within ±0.01 of 0.118): held; T-FOOD-10 inside the
   reference spread: **missed** (0.624, z +3.1: more departures before sunrise).

Not predicted: juveniles' reserves fall (−0.033 %/day, z −3.2; net −10.4 kcal/day, z −1.9): their walking in trips stays
at W's (+19.4 kcal/day; 17.3 travel episodes a day against 14.0 on S22 and 19.0 on W) while their absorbed gain is half
W's (+23 against +40 kcal/day).

**Kill criterion (§5): holds** — infants 0.5–2 y 2.5 SD below S22's mean (registered line: more than 2 SD). B1 is recorded,
not a keep candidate. The climb's time in a trip's rate removes most of the faster walk's added trips for nursing mothers
(+3.9 → +1.2 a day) and with them their energy loss; infants of 0.5–2 y still pay (half W's loss), juveniles pay in this
draw.

### 7.1 Replicates B1r and Wr (registered 4 October 2026 before their runs; not iterations)

B1 and W re-drawn with `rngSalt` 1 (the behaviour-free re-draw lever), same settings and frozen code (8978d18; W's code is
identical at its switch values), e-bench and energy-diagnose for both, climb-diagnose for B1r: do the infants' and the
juveniles' costs and the mothers' recovery replicate before an iteration 2 is chosen? Expected (low confidence): mothers
within 2 SD of S22's mean in B1r; infants 0.5–2 y between W and S22 again; juveniles inside S22's spread if B1's fall was
a draw (E2i's G1r: juveniles −0.057 in one of two W-like draws).

## 6. Known defects (file:line at 0d08525)

- `netRateShare` (intake.ts :89–96) charges the walk's time and the climb's energy, not the climb's time
  (execution.ts :139, :173): a valuation–movement mismatch. Fixed only if the diagnosis implicates climbing.
- Walking on fallback food at 0.3 × the walking speed (execution.ts :1081 and :1001; design multiplier, deferred by E2i).
- Climbing at the stylized `climbMps` 0.22 m/s, descent at 1.4 × it (execution.ts :139, design); descent free in the
  ledger (energy.ts :487, stylized); rhythm.ts :104 caps a tick's climb at `climbMps` × 30 s (reads the same speed).
- climb-diagnose's crown-visit locomotion is everything spent between two crown visits (nests and social moves
  included), so it sums to the day's locomotion; not a per-trip cost.
