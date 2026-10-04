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

## 6. Known defects (file:line at 0d08525)

- `netRateShare` (intake.ts :89–96) charges the walk's time and the climb's energy, not the climb's time
  (execution.ts :139, :173): a valuation–movement mismatch. Fixed only if the diagnosis implicates climbing.
- Walking on fallback food at 0.3 × the walking speed (execution.ts :1081 and :1001; design multiplier, deferred by E2i).
- Climbing at the stylized `climbMps` 0.22 m/s, descent at 1.4 × it (execution.ts :139, design); descent free in the
  ledger (energy.ts :487, stylized); rhythm.ts :104 caps a tick's climb at `climbMps` × 30 s (reads the same speed).
- climb-diagnose's crown-visit locomotion is everything spent between two crown visits (nests and social moves
  included), so it sums to the day's locomotion; not a per-trip cost.
