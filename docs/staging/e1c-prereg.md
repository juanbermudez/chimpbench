# E1c pre-registration: infant energetics (growth from surplus, night nursing, infant intake in kcal)

Registered 1 October 2026, before any run of the changed model (tests included). Track E, stage E1 follow-up (IMPLEMENTATION_PLAN.md; docs/staging/e1-prereg.md, "Stop"). Branch `e1c-infants` from `track-e`. Staging only: every switch below is 0 by default in both profiles, and every one acts only with `energyLedger` 1, so the compressed golden hashes cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. No input below will be moved to hit a target. A miss is diagnosed term by term and reported.

## 1. The problem (E1 iteration 3)

With the energy ledger on and milk limited to the mother's daily yield (23.2 × M^0.75 kcal/day, human-scaled, assumed), infants of 0.5–5 y ran a deficit of 16–30 kcal/day and lost 0.2–0.3% of their reserve per day. E1 named three causes:

1. Growth (4.5 kcal/g × the daily gain of a prescribed linear mass-for-age curve) is charged whatever the infant's balance: about 36 kcal/day, the size of the deficit.
2. Infants do not nurse at night: the nest option outscores nursing after dusk, so a night of milk synthesis is lost unless the gland holds a whole day (E1 set the store to 24 h, a value with no source, to neutralise this).
3. Self-feeding is C8's design ramp (0 at 0.5 y to 1 at weaning, × 0.4 under 5 y) on the old hunger-timer scale, giving 2–3 kcal per feeding minute on fruit; and an infant feeds only while its mother feeds (which the field supports: by 1 y infants forage whenever their mothers do, badescu2022), while ledger mothers feed about 165 min a day instead of about 270.

A fourth fact, found in the source pass: the prescribed curve (linear from 1.8 kg to the adult mass at 10 y for females, 13 y for males) puts a 5-year-old at 16.5 kg; the only wild estimate (Gombe, pusey2005 read through gurvenWalker2006, [L]) is about 10 kg. Captive, well-fed chimpanzees grow at about the curve's rate in their first year (desilva2011: 1.73 kg at birth, about 4.5 kg at 1 y) and faster later (curry2023: 3.4–5.4 kg/y before maturation). Wild infants grow more slowly, "probably owing to a limited nutritional supply from the mother" (hamada1996, unverified snippet). So the curve is closer to a well-fed potential than to wild growth.

## 2. Mechanism (three switches)

### 2.1 `ledgerGrowSurplus`: body mass is state, and lean growth is paid only from a surplus

- `chimp.sim.en.kg`, body mass in kg, opened with the ledger at the stylized curve's value for the animal's age and sex (founders) and at `ledgerMassBirthKg` for a newborn. From then on `massOf` returns it: resting rate, gut capacity, usable reserve and the cost of carrying and moving all follow the animal's own mass.
- Growth potential: the curve's slope, (adult mass − birth mass) ÷ growth-end age, kg per biological year (2.95 F, 2.86 M). The curve's parameters change role: they now describe the growth of a well-fed animal, not the growth every animal gets. Captive references bracket this potential (2.8 kg in the first year at Yerkes; 3.4–5.4 kg/y later).
- Each tick an animal below its adult mass grows at the potential if its reserves are above the set point (`res > 0`), and does not grow otherwise. The cost is unchanged: 4.5 kcal per g gained (robertsYoung1988), charged at the natural daily rate whatever `world.ageRate` is (the E1 convention). Mass stops at the adult mass. There is no age gate: an animal that fell behind keeps growing past the growth-end age until it reaches the adult mass.
- The threshold is the existing set point of the reserves (the level read as condition 0.7), so no new number is introduced. An underfed infant stops growing instead of burning its reserve (growth faltering), and an infant near the margin grows at the fraction of the potential its surplus pays for. The mass-for-age curve becomes an output.

### 2.2 `ledgerNightNurse`: a dependent infant suckles in its mother's nest

- When an infant's act is to sleep in its mother's nest (the nest act with the mother variant) and the mother's act is the nest, the infant drinks from her through the same `nurseTick` as by day (the suckling rate, limited by what her glands hold and what its gut takes; the mother pays milk ÷ 0.8), on every tick its hunger readout is at or above the level at which a day nursing bout ends (0.08, the existing literal).
- Eligibility is the day option's: its own mother, age below its weaning age + 0.3 y. The day act's weaning refusal (a dice roll) is not applied at night: a stylization, noted.
- It is a physiological capacity, not a clock rule: no hour appears, and nothing changes in scoring. Infants share their mother's nest until weaning (khayer2025, [M]); night suckling is documented in captive newborns (mizuno2006, [L]) and assumed by analogy with humans; badescu2022 has no night data.
- The gland store returns to its sourced value. E1 set `ledgerMilkStoreH` to 24 h only because infants could not nurse at night, and said it would return "when E2 lets infants nurse at night and a source gives the capacity". Both now hold: kent1999 gives a storage capacity of about 0.46 of daily production in women, about 11 h (human, assumed). Arm 3 runs with `ledgerMilkStoreH` 11 (an override in the run, decided here, not after seeing a result). The registry default stays 24 so that E1 behaviour with these switches off is unchanged.

### 2.3 `ledgerInfantIntake`: intake capacity in kcal from body size and skill

- An animal's intake rate of fruit and of ground fallback foods = the adult rate (9.9 kcal/min ripe fruit, 12.5 figs, 4.2 fallback × the local yield; uwimbabazi2019, [H]) × (its mass ÷ the adult mass of its sex)^`ledgerIntakeSizeExp` × the existing foraging-skill multiplier (fruit only, `fruitIntakeSkillBase` + `fruitIntakeSkillGain` × skill, unchanged).
- `ledgerIntakeSizeExp` = 0.75, design: intake capacity scales like the resting rate, so a skilled animal of any size covers its resting needs in the same feeding time as an adult. No chimpanzee measurement of ingestion rate against body size was found (bray2018 gives only the direction: infants below adults, juveniles not significantly below).
- This replaces C8's ramp (`selfFeedStartY`, `selfFeed`) and the under-5 factor (`fruitIntakeYoungFactor` 0.4) under the ledger. It applies to every animal below adult mass (juveniles included), and also to ground fallback foods, which in the field profile had no reduction for infants at all under E1 (an infant ate leaves and pith at the adult rate).
- The option valuation (`src/sim/intake.ts`, fruit and fallback rates) uses the same capacity.
- Not changed: the candidate gates (no own feeding while carried, i.e. under 1.2 y; fruit trees only from 1.5 y and while the caretaker forages). They are behaviour rules of C8 and earlier; if they turn out to be the binding term, that is a finding for the next stage.

## 3. Inputs

| Input | Value | Source | Evidence |
| --- | --- | --- | --- |
| Growth potential | curve slope 2.95 (F), 2.86 (M) kg/y; birth 1.8 kg; adult 31.3 / 39 kg at 10 / 13 y | pusey2005 (adult mass, knees); desilva2011 (birth 1.73 kg, captive), curry2023 (captive slopes) as brackets | assumed (stylized), unchanged values |
| Growth cost | 4.5 kcal/g | robertsYoung1988 | assumed, human |
| Growth threshold | reserves above the set point | the existing set point | design (no new number) |
| Night nursing threshold | hunger readout ≥ 0.08 | the existing end of a nursing bout | design (no new number) |
| Gland store with night nursing | 11 h of synthesis | kent1999 | assumed, human |
| Intake size exponent | 0.75 | none (metabolic scaling) | design |
| Intake rates | 9.9 / 12.5 / 4.2 kcal/min | uwimbabazi2019 | [H], unchanged |

New registry entries: the three switches (design, 0) and `ledgerIntakeSizeExp` (design). No new physiological number. Removed from use under the switches: `selfFeedStartY`, `fruitIntakeYoungFactor`, and the prescribed growth charge.

## 4. Benchmark

Field profile, development seeds 48 and 7 only, 30-day burn-in + 60 days (90 days in all), `--workers 2`, rules policy only.

| Arm | Params |
| --- | --- |
| 0 | baseline (no switches), once |
| 1 | stack: `energyLedger` 1, `rhythmSleep` 1, `rhythmHeat` 1 (reference) |
| 2 | not run: night nursing happens inside the nest act, so it does not need `rhythmFreeNight` (the night menus already allow the nest) |
| 3 | stack + `ledgerGrowSurplus` 1, `ledgerNightNurse` 1, `ledgerInfantIntake` 1, `ledgerMilkStoreH` 11 |
| 3a–3d | attribution (energy diagnosis only): arm 3 with each switch off in turn, and arm 3 with the store at 24 h |

Tools: `scripts/energy-diagnose.ts` (budget by class; E1c adds a table of unweaned infants by year of age: milk by day and night, own food, growth, mass, daytime nursing and eating shares, reserve change, mothers' reserves and milk cost) and `scripts/e-bench.ts --quick --days 60` (scorecard and viability; out `artifacts/validation/e1c/`).

Reported: infant reserves by age class, day 30 → 90; milk kcal/day by infant age (day and night); infant mass and growth velocity against the field; mothers' reserves by infant age against other females; starvation; births and deaths; T-ACT-5, T-RNG-5; band distances.

Comparison values (targets, never set): daytime suckling 5.85% of observation time at 0–6 months and about 3% from 6 months to 4 y; foraging 17% at 6–12 months, 25% at 1–2 y, 47% at 4–5 y (badescu2022); adult feeding time reached at 4–6 y (bray2018, lonsdorf2021); milk reliance falling from about 1 y, nutritional weaning by 4–4.5 y (badescu2017, matsumoto2017); about 10 kg at 5 y, about 1.6 kg/y from birth to 5 y (Gombe, [L]); more milk, more growth (emeryThompson2016); mothers' energy balance depressed about 6 months, then recovering (emeryThompson2012, T-ENE-5).

## 5. Predictions (by hand, before any run)

Milk yield at 31.3 kg: 23.2 × 31.3^0.75 ≈ 307 kcal/day; mothers' milk cost at most 384. Infant demand without growth on the curve's masses (resting × 1.125 for the asleep/awake mix): 0.5 y 188, 1 y 253, 1.5 y 310, 2 y 364, 3 y 465, 4 y 557 kcal/day; growth adds 36 when paid. So milk alone covers an infant's maintenance until about 1.45 y; after that own food must supply 57 (2 y), 158 (3 y) and 250 (4 y) kcal/day before any growth. Under 2.3, intake capacity on fruit at 2, 3 and 4 y is about 2.7, 3.4 and 4.1 kcal/min (E1's ramp: 1.1, 1.8, 2.6), and on fallback foods about 35%, 45% and 54% of the adult rate (E1: 100%).

| Quantity | Arm 1 (expected) | Arm 3 (expected) |
| --- | --- | --- |
| Infant reserves 0.5–2 y and 2–5 y, day 30 → 90 | falling steadily (as E1 iteration 3) | stable: within ±0.03 of the set point at day 90, no steady fall; the margin goes into growth |
| Growth velocity, infants 0.5–5 y | 2.9 kg/y (prescribed) | below potential: 0.5–1 y 50–100% of it, 1–5 y 20–80% (about 0.6–2.3 kg/y); field about 1.6 kg/y |
| Milk drunk, infants 0.5–5 y | about 280–307 kcal/day, all by day | about 290–307, of which 40–50% at night |
| Daytime suckling share | 12–20% of daylight | 6–10%; field 3% (5.85% under 6 months). Still high: the suckling rate (2.5 kcal/min, from 2 h of suckling a day, assumed) is the named term |
| Own food, infants 2–5 y | about 150 kcal/day | 100–220 (sign uncertain: fruit rate up about 2×, fallback rate down to about 45%) |
| Juveniles 5–12 y | feed about 0.8 × adult minutes | feed about as long as adults or longer (intake × 0.6–0.85); reserves fall toward the set point, not below −0.02 |
| Mothers' milk cost; reserves | about 370–384; below other females | unchanged within ±0.01 of arm 1 |
| Lactation time course (T-ENE-5) | flat or worsening with infant age | still flat: **expected miss**. Infants older than about 1.4 y need more than the yield, so they drink the whole yield at every age and the mother's cost never falls. The named term is a yield that does not change with the stage of lactation |
| Adults (other classes) | — | unchanged (size factor 1, mass constant) |
| T-ACT-5, T-RNG-5, T-ACT-1..4 | — | within seed noise of arm 1 (infants and juveniles are not the observer's adults; juveniles feeding longer may raise T-ACT-1 by up to 0.02) |
| Viability | 0–2 births and deaths | the same; no starvation death |
| More milk, more growth (emeryThompson2016) | — | across dyads, growth velocity rises with milk drunk (direction only; about 16 dyads) |

## 6. Kill criterion

The switches stay off (null result) if, in arm 3 against arm 1:

- K1: any starvation death, or two or more deaths more than arm 1;
- K2: in either infant class (0.5–2 y, 2–5 y; both seeds pooled), mean reserves ÷ store below −0.05 at day 90, or a fall of more than 0.03 from day 30 to day 90 (E1 iteration 3 fell 0.08–0.16);
- K3: lactating females' mean reserves ÷ store more than 0.02 below arm 1;
- K4: juveniles' mean reserves ÷ store below −0.05 at day 90;
- K5: the held-out band distance on rows scored in both arms above arm 1's by more than 0.8 (the noise floor of E0).

Keep: none of K1–K5. Even then the switches stay off by default until the integrator's year-long run (the Track E rule).

## 7. Iteration

At most three iterations, each logged below before its run, each a change of mechanism justified from first principles, never an input moved toward a target.

## 8. Results

(to be filled in after the runs)
