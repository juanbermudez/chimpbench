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

- Quick check (integrator's rule of 1 October, the machine is shared): same command and seeds for both arms, `scripts/field-metrics.ts --profile field --days 30 --burn-in 30 --seeds 48,7 --workers 2`, without and with `--params '{"energyLedger":1}'`. It finds direction and catches breakage; it cannot score demography rows (T-DEM), which need years. One 120-day, 3-seed run (48, 7, 21) at the end if the load permits. The 365-day, 5-seed benchmark is run once by the integrator on the integrated branch. Development seeds only.
- `scripts/energy-diagnose.ts`: by sex and reproductive class, daily kcal in, kcal out by term, feeding minutes, gut fill, reserves, deaths by cause.

## 7. Results

(filled in after the runs; iterations logged in order)
