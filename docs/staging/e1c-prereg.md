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

None run. The registered mechanism passed the kill criterion on its first run, and the misses it left (daytime suckling time, infants' own feeding time, the lactation time course) trace to a choice rule (the nurse act and option) that belongs to stage E3, not to infant energetics (§8.5).

## 8. Results

Runs: field profile, seeds 48 and 7, 30-day burn-in + 60 days, rules policy. Outputs in `artifacts/validation/e1c/` (not tracked): `arm*-diag.{txt,json}` (energy diagnosis, sim truth), `arm*-*.{md,json}` (e-bench). The two seeds start from the same founders (8 unweaned infants aged 0.58–3.58 y at day 30; none older than 4 y, none born in the window), so each infant age bin holds 2 infants × 2 seeds. No iteration was needed (§7): the registered mechanism is the only one run.

**Check before the runs.** With the three switches off, field and compressed worlds (ledger on and off) are hash-identical to the commit before the change (seed 48; 3 days field, 2 days compressed), and the compressed golden hashes are untouched (`pnpm test`).

### 8.1 Infants (energy diagnosis, kcal per infant-day)

| | Arm 0 (no ledger) | Arm 1 (stack) | Arm 3 (stack + E1c) | Field (target, never set) |
| --- | --- | --- | --- | --- |
| Reserves ÷ store, infants 0.5–2 y at day 30 → day 90 | — | −0.062 → −0.195 | **+0.035 → +0.032** | — |
| Reserves ÷ store, infants 2–5 y at day 30 → day 90 | — | −0.107 → −0.255 | **+0.001 → −0.003** | — |
| Milk, by age 0–1 / 1–2 / 2–3 / 3–4 y | — | 259 / 305 / 306 / 307 (all by day) | 258 / 304 / 307 / 307; **65 / 50 / 48 / 48% at night** | milk reliance falls from about 1 y (badescu2017, matsumoto2017) |
| Own food, same ages | — | 0 / 11 / 78 / 233 | 0 / 15 / 97 / 224 | foraging 17% (6–12 mo), 25% (1–2 y), 47% (4–5 y) of daytime (badescu2022) |
| Growth paid, same ages (kcal/day) | (timers) | 35 / 36 / 36 / 36 | 35 / 15 / 12 / 28 | — |
| Growth velocity, same ages (kg/y) | 2.9 (curve) | 2.9 (curve) | **2.86 / 0.83 / 1.06 / 2.30** | about 1.6 kg/y from birth to 5 y (Gombe, [L]); slower than captive at 0–4 y (hamada1996, unverified) |
| Mass at day 90, infants of 1.45 / 2.05 / 2.75 / 3.25 y | — | 6.07 / 7.66 / 9.66 / 11.09 (the curve) | 5.72 / 7.03 / 9.14 / 10.73 | rough Gombe line 4.2 / 5.2 / 6.3 / 7.1 |
| Daylight ticks with milk drunk (arm 0: nurse act), same ages | 11 / 14 / 18 / 23% | 14 / 65 / 68 / 40% | **4.8** / 67 / 59 / 40% | suckling 5.85% (0–6 mo), about 3% (6 mo–4 y) (badescu2022) |
| Daylight ticks with own food swallowed, same ages | 0 / 0.3 / 1.6 / 8.4% (forage act) | 0 / 1.2 / 6.3 / 12.3% | 0 / 0.8 / 4.2 / 7.4% | see foraging above |

Indicative only: integrating arm 3's velocities from 1.8 kg at birth gives about 4.7 kg at 1 y, 5.5 at 2 y, 6.6 at 3 y, 8.9 at 4 y and 11–12 kg at 5 y, against about 10 kg at Gombe ([L]) and 16.5 kg on the old curve. The velocities were measured on infants that started on the heavier curve (higher maintenance), so this is not a measured mass-for-age curve; the level needs newborns, i.e. a run longer than the 90-day cap.

### 8.2 Mothers, juveniles, adults

| | Arm 1 | Arm 3 |
| --- | --- | --- |
| Lactating females: reserves ÷ store; milk cost (kcal/day) | −0.008; 370 | −0.009; 370 |
| Mothers' reserves by infant age 0–1 / 1–2 / 2–3 / 3–4 y (other females +0.06) | +0.034 / −0.004 / −0.022 / −0.031 | +0.038 / +0.011 / −0.036 / −0.040 |
| Mothers' milk cost by infant age | 323 / 381 / 383 / 384 | 323 / 380 / 384 / 384 |
| Juveniles 5–12 y: eating min; reserves; growth kcal | 117; +0.032; 30 | **143**; +0.026; 24 |
| Adult males / other females: eating min; reserves | 151 / 145; +0.063 / +0.060 | 152 / 147; +0.066 / +0.059 |
| Daylight act shares, adult males rest + groom (sim truth, 30 days) | 48.1% | 49.4% |
| Births; deaths; starvation | 0; 0; 0 | 0; 0; 0 |

### 8.3 Attribution (energy diagnosis only, registered in §4)

| Arm | Change from arm 3 | Infants 0.5–2 y, day 30 → 90 | Infants 2–5 y, day 30 → 90 | Growth 0.5–2 / 2–5 y (kg/y) | Milk ≥ 1 y | Reading |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | — | +0.035 → +0.032 | +0.001 → −0.003 | 1.85 / 1.68 | 304–307 | stable |
| 3a | growth gate off | −0.009 → −0.067 | −0.025 → −0.035 | 2.89 / 2.91 | 305–307 | infants fall again (K2 fails for 0.5–2 y): the gate is the main stabiliser |
| 3b | night nursing off (store 11 h) | −0.020 → −0.034 | −0.036 → −0.043 | 1.48 / 0.68 | 278–287 | about 20–30 kcal/day less milk; growth falters more; mothers' cost 342–358 |
| 3c | intake by size off | +0.022 → +0.022 | −0.035 → −0.060 | 1.76 / 0.50 | 304–307 | own food at 2–4 y 20–25 kcal/day lower; 2–5 y below −0.05 at day 90 (K2 fails) |
| 3d | store 24 h instead of 11 h | identical to arm 3 (same hash-level numbers) | | | | with night nursing the gland never holds more than 11 h of synthesis, so its capacity stops mattering |

Arm 3a also had a respiratory outbreak in one seed (13 deaths of all classes, none by starvation); outbreaks are stochastic and the arm differs from arm 3 in its whole trajectory, so this is not attributed to the switch.

### 8.4 Scorecard (e-bench, `--quick --days 60`)

| | Arm 0 | Arm 1 | Arm 3 | Arm 3b (noise probe) |
| --- | --- | --- | --- | --- |
| Fitted distance | 2.547 (17 rows) | 3.486 (18) | 5.934 (18) | 6.293 (19) |
| Held-out distance | 4.358 (12) | 5.439 (13) | **3.202 (12)**; −1.737 on the 12 rows scored in both | 3.194 (17); −3.144 on rows in both |
| Prescription count | 138 | 138 | 138 | 138 |
| T-ACT-5 (held out) | −0.05 fail | −0.00 pass | −0.02 pass | −0.01 pass |
| T-RNG-5 (held out, band 0.3–0.6) | 0.61 | 0.78 | 0.71 | 0.66 |
| Viability | pass | pass | pass | pass |

The fitted rise against arm 1 (+2.45) comes from three rows: T-PAT-6 incursion share (+1.33; 0 incursions in the window), T-HUN-1 hunts per community-year (+0.46) and T-ACT-4 adult rest (+0.40; 0.45 → 0.54 in the observer). Sim truth does not support a mechanism: adult males' daylight rest + groom 48.1% → 49.4%, adult females unchanged, adult eating minutes unchanged, hunts per seed 23 / 33 (arm 1) against 39 / 30 (arm 3), intergroup encounters 29 / 13 against 4 / 14. The infant switches touch adults only through carrying and milk timing; these rows are rare events and focal samples on two seeds, i.e. below the noise floor E0 measured (rows moved by up to 0.8). The prescription count does not fall: the removed ramp (`selfFeedStartY`, `fruitIntakeYoungFactor`) is classed design, not outcome-encoding, and the removed clock dependency (night milk lost to the nest rule) had no registry entry.

### 8.5 Against the predictions (§5)

- Infant reserves: stable, as predicted (arm 1 fell as E1 iteration 3).
- Growth: below potential at 1–3 y (0.8–1.1 kg/y), at potential in year 1 (milk covers maintenance), recovering at 3–4 y (2.3 kg/y): inside the predicted ranges; the pattern (a growth check in the weaning years) agrees in direction with hamada1996 (unverified).
- Milk: 304–307 kcal/day at ≥ 1 y, 48–65% at night: as predicted.
- **Daytime suckling: miss.** Predicted 6–10% of daylight; measured 4.8% in year 1 (field 5.85% at 0–6 months) but 40–67% at 1–4 y in both ledger arms. Cause: the nurse act continues while the infant is hungry, and once the gland is empty an infant ≥ 1 y drinks the synthesis trickle (0.05 kcal per tick) tick after tick; the nursing option's score (0.25 + 1.5 × hunger × (1 − age/7)) ignores how much milk the gland holds and outscores ground foraging (0.5 × hunger − 0.05) for any hungry infant. My prediction used minutes of full flow, not this. Named term: an act that continues while it pays nothing, and an option valued without what it delivers (E3's mechanism: "an act continues while it pays at least what the best known alternative would").
- Own food at 2–5 y: 97–224 kcal/day, inside 100–220 except 1–2 y (15). Daylight eating 0.8–7.4% against field foraging 17–47%: **miss**, from the trickle nursing above, the C8 gates (no own feeding while carried, i.e. under 1.2 y; trees only from 1.5 y while the caretaker forages) and mothers who feed 157–178 min a day (the E1 T-ENE-2 miss passed on to their infants).
- Juveniles: feed 143 min against adults' 147–152 (field: adult levels from 4–6 y); reserves +0.026. As predicted.
- Mothers: unchanged within 0.01 (K3), as predicted.
- **Lactation time course (T-ENE-5): miss, as registered.** Mothers' milk cost rises with infant age (323 → 384 kcal/day) and their reserves fall (+0.038 → −0.040); the field has the deficit in the first 6 months and recovery in year 2. Named term: from about 1 y every infant drinks the whole yield, because its own food (15–224 kcal/day) is far below what field foraging time would give; the yield itself does not change with the stage of lactation. Infants that foraged as much as in the field would need less milk, and supply would follow demand (kent1999: production followed infant demand).
- More milk, more growth (emeryThompson2016): not testable here (every infant ≥ 1 y drinks the same yield).
- T-ACT-5, T-RNG-5: within noise of arm 1 (T-RNG-5 0.78 → 0.71 and 0.66, still above the band).

### 8.6 Verdict

Kill criterion (§6): K1 no deaths; K2 infants 0.5–2 y +0.035 → +0.032 and 2–5 y +0.001 → −0.003 (no fall, above −0.05); K3 lactating females −0.009 against −0.008; K4 juveniles +0.026; K5 held-out −1.74 on rows scored in both. **Keep** (provisional, under the 90-day cap): infants are viable on the E1 ledger with milk limited to the human-scaled yield, without moving an input. The switches stay off by default (Track E sequencing). Attribution: the growth gate is necessary (3a fails K2), intake by size is necessary at 2–5 y (3c fails K2), night nursing adds 20–30 kcal/day of milk and makes the unsourced 24 h store irrelevant (3d identical to arm 3); `ledgerMilkStoreH` can take its sourced 11 h whenever `ledgerNightNurse` is on.

**Biggest open problem.** Infants' time budget: in every ledger arm infants ≥ 1 y spend 40–67% of daylight at an empty nipple and 1–7% eating, against about 3% and 17–47% in the field. It holds the lactation time course wrong (they never need less milk) and caps growth in the weaning years. The fix is a choice mechanism (nursing valued by the milk it delivers; an act ending when it stops paying), which is stage E3's, plus the C8 feeding gates; not an energy input.
