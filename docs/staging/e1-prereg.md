# E1 pre-registration: the energy ledger (calories in, calories out)

Registered 1 October 2026, before any run of the model with `energyLedger` 1 (tests included). Track E, stage E1 (IMPLEMENTATION_PLAN.md). Staging only: the switch is 0 by default in both profiles, so nothing on `main` changes.

**Rule served.** Field values of behaviour are targets, never inputs. Only physiology or physics measured independently of the behaviour may be a parameter. No input below will be moved to hit a target. A miss is diagnosed term by term and reported.

## 1. What is removed (switch on)

- The hunger timers: `hungerAwakePerH`, `hungerRunPerH`, `hungerSleepPerH`, `hungerLactationPerH`, `hungerPregnancyPerH`, the child body factor (`bodyChild*`) and the lactation taper (`lactTaper*`).
- The hunger-unit conversions: `fruitHungerFactor`, `fallbackHungerPerH`, `fallbackRateRatio` (as a hunger rate), `meatHungerFactor`, the nursing rate (0.5 hunger/h × (1 − age/6)) and the plant-share step (−0.08).
- The hunger terms of condition and death: `cond` as an average of 1 − hunger, the −0.3 health term at hunger > 0.9, and "starvation" as hunger > 0.95.

`fruitIntakePerH` stays: it is how fast a crop is depleted (fruit units per feeding hour), not a hunger rate.

## 2. Mechanism (`src/sim/energy.ts`)

State per individual, in kcal, created on its first tick (`chimp.sim.en`): gut contents, reserves relative to a set point, lifetime energy in and out, last position.

Each 15 s tick:

1. **Absorption.** gut × (1 − exp(−dt / `ledgerGutEmptyH`)) moves from the gut to the body.
2. **Expenditure.**
   - resting rate `ledgerRmrCoef` × mass^`ledgerRmrExp` × an activity multiple (asleep, awake, feeding);
   - metres moved since the last tick × `ledgerWalkJPerKgM` × mass, and metres climbed × mass × g ÷ `ledgerClimbEff` (descent free); a carried infant's share is charged to its carrier (`rideTick`, from `carryInfants`);
   - gestation: `ledgerPregnancyCoef` × mass^0.75 × 2 × progress;
   - growth: `ledgerGrowthKcalPerG` × the daily gain of the mass curve, at its natural rate whatever `world.ageRate` is.
3. reserves += absorbed − expenditure.

Feeding puts energy into the gut, never more than its capacity (`ledgerGutCapKcalPerKg` × mass): tree fruit and figs by kcal per minute (the crop is depleted in proportion to what is swallowed), fallback foods, meat, a shared plant piece, milk. Milk an infant drinks costs its mother milk ÷ `ledgerMilkEff` from her reserves. There is no prescribed lactation cost and no taper: the cost is whatever the infant drinks.

Body mass: linear from `ledgerMassBirthKg` to the adult mass at `ledgerMassMatureFemaleY` / `ledgerMassMatureMaleY`.

Readouts (design, not physiology; they map the balance onto the 0..1 scales that scoring and the model packet read):

- hunger = gut emptiness × appetite; appetite = clamp(`ledgerAppetiteSet` − `ledgerAppetiteGain` × reserves ÷ usable reserve). With gain 5, appetite is full at a 10% reserve deficit and nil at a 10% surplus: a tight regulator, so condition leaves the set point only when food or time limits intake.
- `cond` = `ledgerCondSet` × (1 + reserves ÷ usable reserve). C8's health term, growth record and fertility read it unchanged.
- Death by starvation: reserves ≤ −usable reserve (`ledgerReserveKcalPerKg` × mass), or through C8's health term below `condLow`.

Conservation, per individual: energy in − energy out = Δgut + Δreserves.

**Structure decisions taken from first principles, before any run.**

- *One fast gut pool, not the 38–48 h transit time.* The transit time of Milton & Demment 1988 is the passage of indigestible residue. Energy from fruit is absorbed in the stomach and small intestine within hours. A single first-order pool with a 40 h constant and an anatomically sized gut could pass about 1,200 kcal a day at most, less than any estimate of expenditure. Bulk limitation by residue (which would penalise pith and leaves) is not modelled; it is the first candidate if fallback periods turn out too easy.
- *Lactation cost emerges from infant demand.* No chimpanzee magnitude exists. The infant's own balance (resting rate, growth, its partial self-feeding) decides what it drinks.
- *Thermoregulation, immune costs and the mass change of a thin or fat animal are not modelled.* Named as candidate missing terms.

## 3. Inputs

| Input | Value | Source | Evidence |
| --- | --- | --- | --- |
| Adult mass | F 31.3 kg, M 39 kg | Pusey et al. 2005 (Gombe medians) | assumed, pending e-sources |
| Birth mass; growth ends | 1.8 kg; 10 y (F), 13 y (M), linear | Pusey et al. 2005 (growth slows at 10 / 13 y); birth mass untraced | assumed; curve stylized |
| Resting rate | 70 × M^0.75 kcal/day | Kleiber 1947 (captive Pan estimated at 0.96 of it, Pontzer et al. 2016) | assumed, pending |
| Activity multiples | asleep 1.0, awake 1.25, feeding 1.38 | Leonard & Robertson 1997 (as used by N'guessan et al. 2009) | assumed, cross-species |
| Walking | 3.8 J/kg/m | sockol2007 Table 1 (0.19 ml O₂/kg/m, 5 chimpanzees) | [M] |
| Climbing | m g h ÷ 0.2 (49 J/kg/m) | muscle efficiency; Hanna et al. 2008 extrapolates to 70 | assumed, cross-species |
| Ripe fruit; figs | 9.9; 12.5 kcal/min | uwimbabazi2019 (drupes; figs; all ripe fruit 10.7 ± 1.3) | [H] |
| Fallback foods | 4.2 kcal/min × forage field | uwimbabazi2019 (pith 3.4, young leaves 6.2), potts2011 shares 17.4 : 6.9 | [H] |
| Meat | 6.7 kcal/min | 348 g/h × 1.15 kcal/g, via Hardus et al. 2012 | assumed, secondary |
| Milk transfer; synthesis efficiency | 2.5 kcal per nursing minute; 0.8 | Butte & King 2005 (human 501 kcal/day), mass-scaled; 2 h of suckling assumed | assumed, human |
| Gestation | mean 7 kcal/day per kg^0.75, 0 → 2× at term | Butte & King 2005 less maternal fat (split unverified) | assumed, human |
| Growth | 4.5 kcal/g | Roberts & Young 1988 | assumed, human |
| Gut capacity | 25 kcal per kg | 4% of body mass fresh × 0.63 kcal/g (20% dry matter assumed) | assumed |
| Gut emptying | 3 h (first order) | human gastric emptying; Ardente et al. 2011 (chimpanzee stomach empty after > 3 h, < 16 h) | assumed |
| Usable reserve | 1,300 kcal per kg | 30% of mass × 4,300 kcal/kg | assumed |
| Plant piece shared | 50 kcal | none | design |
| Appetite set, gain; condition at set point | 0.5, 5; 0.7 | readouts | design |

Corrections from the source check (e-sources, received before this registration): growth knees 10 / 13 y instead of 15; walking 3.8 J/kg/m measured instead of the all-mammal equation; meat 6.7 instead of 10 kcal/min; growth 4.5 instead of 5 kcal/g; Kleiber 1947.

## 4. Predictions (made by hand from the inputs, before any run)

Adult female, 31.3 kg: resting 926 kcal/day. With about 11.5 h awake, a third of it feeding, 2 km walked and 100 m climbed: about 1,150 kcal/day (1.24 × resting). Male, 39 kg: about 1,400. A nursing mother: + 200 to 450 for milk.

| Row | Band or field value | Expected direction with the ledger on |
| --- | --- | --- |
| Daily intake (new target, uwimbabazi2019) | 2,479 ± 858 kcal, adult females | **Miss, low**: about 1,100–1,600. The ledger conserves energy, so intake equals expenditure, and no physiological estimate for a 31 kg animal reaches 2,479 (captive Pan by doubly labelled water: 1.4–1.5 × basal). |
| Feeding minutes (new target) | 309 ± 85 min, adult females | **Miss, low**: about 110–180 min, because 1,150–1,600 kcal at 10–12 kcal/min takes that long. |
| T-ACT-1 feeding share | 0.33–0.50 | falls, probably below the band |
| T-ACT-4 rest share | — | rises |
| T-ACT-2 travel share, T-RNG-4 male day range | — | fall or unchanged (fewer feeding trips needed) |
| T-ACT-3 grooming | — | rises (freed time) |
| T-ACT-5, T-RNG-5 (held out) | lactating vs males | lactating females feed and range more than now relative to males (their demand is 20–40% higher); direction right, size unknown |
| T-FOOD-2 fruit share | 72% | rises (less fallback feeding needed) |
| T-FOOD-3 fallback switching (held out) | — | weaker |
| T-FOOD-4 trees per day (held out) | 7.14 | falls |
| T-DEM-10 fertility, T-DEM-12 birth interval | — | fertility up, intervals shorter: mothers hold condition near the set point, so the condition brake on conception is released |
| T-DEM-13, T-DEM-14 (held out) | — | no prediction (rank effect on fertility may weaken with everyone well fed) |
| T-DEM-19, T-DEM-20 (held out) | orphans leaner; alpha's offspring heavier | weaker contrasts, for the same reason |
| Lactation pattern (emeryThompson2012) | energy balance depressed about 6 months, then recovering | reserves of nursing mothers below those of other females; **the time course may be wrong**: milk demand in the model grows with infant mass and falls only as self-feeding ramps up (from 0.5 y), so the dip may come later than 6 months |
| Lactating females starving (C8 finding) | — | gone. Named term to be checked: under the timers, lactation added 0.012 hunger/h day and night (+29% of the daily budget) and hunger above 0.9 cut health directly; under the ledger a mother pays only for milk drunk and can refill at 10 kcal/min. |

Viability guard (C13): births ÷ deaths not below the baseline's, no adult starvation deaths, infants not starving.

## 5. Kill criterion

The switch stays off, and the result is recorded as null, if with the ledger on: the population is not viable (pooled births ÷ deaths < 1 with starvation deaths), or the held-out rows are clearly worse than the baseline. The expected misses of the two new intake rows and of T-ACT-1 are **not** grounds to change an input: they are the finding (field intake and field feeding time cannot both hold with a conserved budget at any sourced expenditure).

## 6. Benchmark

- Quick check (integrator's rule of 1 October, the machine is shared): same command and seeds for both arms, `scripts/field-metrics.ts --profile field --days 30 --burn-in 30 --seeds 48,7 --workers 2`, without and with `--params '{"energyLedger":1}'`. It finds direction and catches breakage; it cannot score demography rows (T-DEM), which need years. No run longer than 90 days in total (user's limit, 1 October; the largest allowed is a 30-day burn-in + 60 days). The 365-day, 5-seed benchmark is run once by the integrator on the integrated branch. Development seeds only.
- `scripts/energy-diagnose.ts`: by sex and reproductive class, daily kcal in, kcal out by term, feeding minutes, gut fill, reserves, deaths by cause.

## 7. Results

### Iteration 1 (the registered model; quick check, seeds 48 and 7, days 30–60; `artifacts/validation/e1/base-30.*`, `it1-30.*`)

Energy budget, sim truth (`scripts/energy-diagnose.ts`), kcal per day:

| Class | In | Out | Resting | Activity | Walk | Climb | Carry | Gestation | Growth | Milk | Eating min | Ground km | Reserves ÷ store |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Adult male | 1,338 | 1,338 | 1,092 | 147 | 73 | 25 | 0 | 0 | 0 | 0 | 147 | 2.04 | +0.060 |
| Female, not pregnant or lactating | 1,116 | 1,115 | 926 | 124 | 48 | 16 | 0 | 0 | 0 | 0 | 135 | 1.67 | +0.053 |
| Female, pregnant | 1,189 | 1,194 | 926 | 124 | 56 | 19 | 0 | 69 | 0 | 0 | 143 | 1.94 | +0.054 |
| Female, lactating | 1,595 | 1,583 | 926 | 127 | 44 | 21 | 9 | 0 | 0 | 455 | 175 | 1.49 | −0.020 |
| … youngest infant 0.5–2 y | 1,520 | 1,516 | 926 | 128 | 49 | 20 | 8 | 0 | 0 | 386 | 178 | 1.64 | +0.015 |
| … youngest infant ≥ 2 y | 1,671 | 1,649 | 926 | 127 | 40 | 21 | 10 | 0 | 0 | 524 | 173 | 1.35 | −0.056 |
| Juvenile 5–12 y | 969 | 965 | 762 | 101 | 53 | 19 | 0 | 0 | 30 | 0 | 112 | 2.18 | +0.037 |
| Infant 2–5 y | 494 (419 milk) | 493 | 397 | 50 | 4 | 6 | 0 | 0 | 36 | 0 | 34 | 0.35 | +0.019 |
| Infant 0.5–2 y | 311 (308 milk) | 311 | 241 | 30 | 2 | 3 | 0 | 0 | 36 | 0 | 2 | 0.24 | +0.022 |

No infant under 0.5 y was alive in the window. One death (an adult male, illness); none by starvation. Baseline, same window: adults in the `forage` act 263–321 min a day; lactating females' condition 0.49 and daylight hunger 0.51 (0.46 and 0.56 with an infant of 2 y or more), other adult females 0.63 and 0.34.

What matched the predictions:
- Expenditure: 1,115 (female), 1,338 (male), 1,583 kcal/day (lactating), within the hand estimates.
- Daily intake of adult females 1,116–1,595 kcal against 2,479 ± 858: **miss, low**, as registered. Eating time 135–178 min against 309 ± 85: **miss, low**, as registered.
- T-ACT-1 feeding share 0.42 → 0.25 (band 0.33–0.50, pass → fail); T-ACT-4 rest 0.32 → 0.57 (band 0.30–0.47, pass → fail); T-ACT-3 grooming 0.13 → 0.25 (band 0.08–0.18, pass → fail); T-ACT-2 travel 0.19 → 0.14 (in band); T-RNG-4 male day range 2.75 → 1.74 km (band 1.5–3.5); T-FOOD-4 trees per day 5.3 → 3.1 (band 4–15, pass → fail).
- Lactating females no longer starve: reserves −2% of the store against +5% for other females; condition 0.69.
- T-ACT-5 fail → pass (male − female feeding difference −0.06 → −0.04).

What did not:
- T-FOOD-2 fruit share was predicted to rise; it fell, 0.91 → 0.75 (band 0.60–0.78, fail → pass). Cause: at low hunger the distance cost of a tree outweighs its worth more often, so more of the little feeding is done on the ground where the animal stands.
- T-RNG-5 lactating ÷ male day range 0.64 → 1.00 (band 0.3–0.6): worse. Males now walk less (they are sated early), and mothers, who need 40% more energy, walk as far as males.
- Lactation time course: the registered doubt holds. A mother's milk cost **rises** with her infant's age (386 kcal/day with an infant of 0.5–2 y, 524 with one of 2 y or more), and her reserves fall with it (+1.5% → −5.6%). emeryThompson2012 has the deficit in the first 6 months and recovery in year 2.

Quick check, all rows (30 days, 2 seeds; noisy): fitted pass 8 → 6, fail 8 → 11; held-out pass 5 → 11, fail 17 → 11. The held-out gains are mostly social rows (T-SOC-2, T-SOC-5, T-PTY-4, T-HUN-4, T-HUN-8, T-COM-7): animals with time to spare groom, sit together and hunt more. 30 days cannot establish them.

**Diagnosis from first principles.**
1. *Intake and feeding time.* The balance closes at 1.2 × resting. Captive Pan by doubly labelled water spend 97–102 × M^0.75 kcal/day (pontzer2016), which is 1,283–1,350 for 31.3 kg and 1,510–1,590 for 39 kg: the ledger is 13–16% below that. The shortfall sits in the non-locomotor activity term (the multiples 1.25 and 1.38). Even at the labelled-water value a female would feed about 130–170 min at 10 kcal/min. The field pair (2,479 kcal in 309 min) needs an expenditure of 2.7 × resting, which no source supports; e-sources notes that the fibre credit in the field intake formula is likely too high. No input is changed.
2. *Milk.* Infants of 2–5 y take 419 kcal/day of milk, 85% of their energy, and mothers deliver 364–419 kcal/day. The human yield the transfer rate was derived from is 501 kcal/day at 60 kg, which is about 307 kcal/day at 31.3 kg by M^0.75. The model has a suckling rate but no limit on synthesis, so a larger infant simply drinks more. That is missing physiology, named in the input's own source.

### Iteration 2 (registered before its run): milk synthesis is limited

- **Change.** A mother makes milk at `ledgerMilkYieldCoef` × mass^0.75 kcal/day (23.2: the human 501 kcal/day at 60 kg, butteKing2005; assumed, cross-species) into a store that holds `ledgerMilkStoreH` hours of synthesis (6 h, assumed; milk left in the gland stops synthesis). An infant drinks at the suckling rate from what the store holds. The mother still pays milk ÷ 0.8 when it is drunk. No other input changes.
- **Expected.** Milk to infants under about 1 y unchanged (their demand is below 307 kcal/day). Older infants get at most 307 kcal/day and must feed themselves for the rest; their hunger rises and their own feeding time with it. A mother's milk cost is capped at 384 kcal/day, so her deficit with an older infant shrinks. The time course becomes a rise over the first year and a plateau, still not the recovery in year 2 of emeryThompson2012: that depends on how fast infants take solid food, which is C8's self-feeding ramp (design), not an E1 input.
- **Watch.** Reserves of infants of 1–5 y. If they fall steadily, the self-feeding ramp (0 at 0.5 y to 1 at weaning, × 0.4 under 5 y) cannot cover what milk no longer does; that is a finding about the ramp, and it is not to be retuned here.

**Iteration 2 result** (quick check, seeds 48 and 7, days 30–60; `it2-30.*`): not viable for infants.

| Class | In (milk) | Out | Eating min | Daylight hunger | Reserves ÷ store, day 30 → 60 |
| --- | --- | --- | --- | --- | --- |
| Infant 0.5–2 y | 241 (229) | 309 | 10 | 0.58 | −0.25 → −0.46 |
| Infant 2–5 y | 404 (228) | 492 | 83 | 0.69 | −0.26 → −0.44 |
| Female, lactating | 1,402 | 1,405 (milk 285) | 160 | 0.30 | +0.013, flat |

- Mothers' milk cost fell to 285 kcal/day at every infant age, and their reserves no longer fall with infant age (+1.9% with an infant of 0.5–2 y, +0.1% with one of 2 y or more). T-RNG-5 0.75 (baseline 0.64, iteration 1 1.00).
- Infants got 229 kcal/day of milk, not the 307 the yield allows, and lost 0.7–0.9% of their reserve a day. No deaths yet in 30 days; at that rate they starve within about 4 months.
- **Cause, by the numbers:** 229 ÷ 307 = 18 ÷ 24. The sim's infants do not nurse at night (the nest rule outscores nursing after dusk), so with a 6 h gland store the synthesis of 6 night hours is lost. The store size has no source, and the night rule is a clock prescription that belongs to E2. An unsourced number met a prescribed clock and became decisive.
- The 2–5-year-olds did respond as expected (eating 34 → 83 min, 176 kcal/day of their own).

### Iteration 3 (registered before its run): only the daily yield limits milk

- **Change.** `ledgerMilkStoreH` 6 → 24: the store holds a day of synthesis, so the timing of nursing no longer matters and only the daily yield (307 kcal at 31.3 kg) binds. This removes a constraint that has no source; it is not fitted to anything (24 h is the neutral value: "a day's yield, whenever it is drunk"). The gland-capacity term returns when E2 lets infants nurse at night and a source gives the capacity.
- **Expected.** Infants of 0.5–2 y: milk up to 307 against a demand of 309, so about in balance. Infants of 2–5 y: 307 of milk + about 180 of their own against 492, so close to balance with a high appetite. Both are **at the margin**: whether weanlings hold their reserves then depends on the assumed yield (human, scaled by mass^0.75) and on C8's self-feeding ramp. Mothers: milk cost up to 384 kcal/day, reserves a little below other females at every infant age.
- **Run.** 30-day burn-in + 60 days (the largest allowed), seeds 48 and 7, both arms, to see the infants' reserve trend.
- **If infants still lose reserves steadily:** the limit stays in the code, the result is reported as not viable under the kill criterion, and the open question is handed to E2 and to the self-feeding ramp. No input is moved to rescue them.

**Iteration 3 result** (seeds 48 and 7, days 30–90, both arms; `base-60.*`, `it3-60.*`).

Energy budget, kcal per day (sim truth):

| Class | In | Out | Resting | Activity | Walk | Climb | Carry | Gestation | Growth | Milk | Eating min | Ground km | Daylight hunger | Reserves ÷ store | Condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Adult male | 1,328 | 1,334 | 1,092 | 146 | 71 | 25 | 0 | 0 | 0 | 0 | 145 | 1.98 | 0.15 | +0.060 | 0.74 |
| Female, not pregnant or lactating | 1,108 | 1,112 | 926 | 124 | 45 | 17 | 0 | 0 | 0 | 0 | 138 | 1.56 | 0.18 | +0.052 | 0.74 |
| Female, pregnant | 1,205 | 1,207 | 926 | 124 | 53 | 19 | 0 | 85 | 0 | 0 | 148 | 1.84 | 0.17 | +0.054 | 0.74 |
| Female, lactating | 1,472 | 1,497 | 926 | 126 | 44 | 22 | 9 | 0 | 0 | 370 | 165 | 1.46 | 0.36 | −0.012 | 0.69 |
| … youngest infant 0.5–2 y | 1,461 | 1,488 | 926 | 126 | 48 | 24 | 9 | 0 | 0 | 354 | 174 | 1.60 | 0.30 | +0.007 | 0.70 |
| … youngest infant ≥ 2 y | 1,482 | 1,504 | 926 | 125 | 40 | 20 | 10 | 0 | 0 | 383 | 158 | 1.34 | 0.41 | −0.029 | 0.68 |
| Juvenile 5–12 y | 958 | 965 | 764 | 100 | 52 | 18 | 0 | 0 | 30 | 0 | 109 | 2.12 | 0.23 | +0.034 | 0.72 |
| Infant 2–5 y | 460 (306 milk) | 490 | 395 | 51 | 4 | 4 | 0 | 0 | 36 | 0 | 71 | 0.38 | 0.56 | −0.10 → −0.26 | 0.58 |
| Infant 0.5–2 y | 292 (283 milk) | 308 | 240 | 30 | 1 | 1 | 0 | 0 | 36 | 0 | 7 | 0.18 | 0.38 | −0.04 → −0.12 (40 days) | 0.64 |

Births 0, deaths 1 (an adult male, illness), 98 → 97 living; no starvation death in 60 days. Baseline: births 0, deaths 0.

Scorecard rows registered in §4 (mean of 2 seeds, 60 days; before → after):

| Row | Band | Before | After | Verdict |
| --- | --- | --- | --- | --- |
| T-ACT-1 feeding share | 0.33–0.50 | 0.425 | 0.248 | pass → fail |
| T-ACT-2 travel share | 0.12–0.25 | 0.188 | 0.141 | pass → pass |
| T-ACT-3 grooming share | 0.08–0.18 | 0.126 | 0.211 | pass → fail |
| T-ACT-4 rest share | 0.30–0.47 | 0.330 | 0.568 | pass → fail |
| T-ACT-5 sex and reproductive-state differences (held out) | male − female feeding ≤ 0.05; lactating travel less | −0.051 | −0.014 | fail → pass |
| T-RNG-4 male day range | 1.5–3.5 km | 2.68 | 1.80 | fail → fail (interval) |
| T-RNG-5 lactating ÷ male day range (held out) | 0.3–0.6 | 0.63 | 0.81 | fail → fail, worse |
| T-FOOD-2 fruit share of feeding | 0.60–0.78 | 0.90 | 0.75 | fail → pass |
| T-FOOD-4 trees per day (held out) | 4–15 | 5.4 | 3.0 | pass → fail |
| T-PTY-1 party size | 3–9 | 2.6 | 3.3 | fail → pass |
| T-FOOD-3, T-DEM-10, 12, 13, 14, 19, 20 | — | — | — | not scorable in 60 days |
| Daily intake, adult females (T-ENE-1, e-sources band 1,900–3,100) | 2,479 ± 858 kcal | — | 1,108–1,472 | miss, low |
| Feeding minutes, adult females (T-ENE-2, band 250–370) | 309 ± 85 min | 267–313 (in band; the timers were tuned to it) | 138–174 | miss, low |

All rows: fitted pass 7 → 6, fail 9 → 8; held-out pass 7 → 5, fail 15 → 13. The held-out gain of the 30-day check did not hold at 60 days; neither run can establish a held-out change.

Baseline, same window (`base-60-diag.txt`): lactating females' condition 0.47 and daylight hunger 0.53 (0.43 and 0.58 with an infant of 2 y or more) against 0.63 and 0.35 for other adult females; they eat 291 min a day and walk 1.7 km against 267 min and 2.5 km.

**The lactating-female problem, named.** It was the food conversion, not the lactation term.
- Under the timers a day costs an adult female about 0.97 hunger units (0.06/h awake, 0.022/h asleep). The ledger puts the same day at 1,112 kcal. Ripe fruit removes 0.242 hunger per feeding hour (`fruitIntakePerH` × `fruitHungerFactor`), which is therefore worth about 280 kcal/h, or **4.6 kcal per feeding minute, against 9.9–12.5 measured**. Fallback foods come out at 2.5 against 4.2.
- That conversion was set so that chimpanzees feed for about half the day. It leaves no slack: a female without an infant must eat 4 h at the full rate, and in practice eats 4.5 h.
- The lactation term adds 9% (infant of 2 y or more, with the C8c taper) to 30% (infant under 0.5 y). Mothers of the *older* infants are the hungriest in the baseline, where the term is smallest. What they lack is time at food: the core-area cost keeps them within 1.4 km a day, on poorer crowns, and they already feed 4.6–5.2 h.
- With food at its measured energy, a nursing mother's 1,500 kcal take 165 min. The time squeeze is gone, so the same core-area cost no longer starves her.
- The caveat is the finding of this stage: if wild females really eat 2,479 kcal in 309 min, they are as short of time as the timer model's mothers were.

**Reading.**
- *Adults.* The balance closes within 0.5% for every adult class. Reserves sit 5–6% above the set point for animals without dependants and 1–3% below it for nursing mothers, whose milk cost is now 354–383 kcal/day at every infant age (the yield limit ÷ 0.8) instead of rising to 524.
- *Lactation time course.* A deficit relative to other females through the whole of lactation, slightly larger with an older infant. Direction right (mothers below other females), time course not (no recovery in year 2). The recovery needs infants to take solid food earlier and faster than C8's ramp lets them.
- *Infants.* With milk limited to the daily yield, infants of 0.5–5 y run a deficit of 16–30 kcal/day and lose 0.2–0.3% of their reserve a day. No death in 60 days, but the trend is steady, so under the registered rule this variant is **not shown viable**; a run of a year or more (the integrator's) would show whether weanlings starve. Three facts produce it: (1) an infant under 1.2 y cannot feed itself at all while its demand reaches the yield (308 against 307 kcal/day) near 1 y; (2) under 5 y the self-feeding ramp × 0.4 gives 2–3 kcal per feeding minute; (3) an infant feeds only while its mother does, and she now feeds 165 min a day instead of about 270.
- *Not done, on purpose:* the yield, the ramp, the under-5 factor and the nest rule were left alone. Without the yield limit (`ledgerMilkYieldCoef` ≥ 1,000, iteration 1) infants hold their reserves and mothers supply up to 419 kcal/day of milk, more than the human-scaled yield.

**Stop.** Three iterations on the milk question; by the working rule the next step is a different angle, not a fourth variant. Candidates, in order:
1. Body mass as state: growth is paid only out of a surplus, so an underfed infant grows more slowly instead of burning its reserve (growth faltering). The 36 kcal/day of growth is the size of the infants' deficit. It would also give T-DEM-19 and T-DEM-20 a physical lean-mass variable.
2. E2: infants nurse at night (then the gland store, about 11 h in humans, can return).
3. The self-feeding ramp and the under-5 intake factor (C8 design values on the timer scale) re-derived in kcal.

**Kill criterion.** Viability is not established (infant reserves), fitted rows are worse where predicted (T-ACT-1, 3, 4), held-out rows are not better. The switch stays off.
