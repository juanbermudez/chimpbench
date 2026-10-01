# E1d pre-registration: nursing is worth the milk it can deliver

Registered 1 October 2026, before any run of the changed model (tests included). Track E, follow-up of E1c (docs/staging/e1c-prereg.md §8.5–8.6, "Biggest open problem"). Branch `e1c-infants`, after merging `track-e` (8cae90f: E1c, E3 urgency and E4a endocrine, all off). Staging only: the new switch is 0 by default in both profiles and acts only with `energyLedger` 1, so the compressed golden hashes cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. No input below is moved to hit a target; a miss is diagnosed and reported.

## 1. The problem (E1c, arm 3)

On the stack (`energyLedger`, `rhythmSleep`, `rhythmHeat`) with the E1c switches, infants of 1 y or more spend 40–67% of daylight ticks drinking milk and 1–7% eating solid food (field: suckling about 3% of observation time, foraging 17–47%; badescu2022). Mothers' milk cost rises with infant age (323 → 384 kcal/day) and their reserves fall (+0.038 → −0.040 of the store), the reverse of the year-2 recovery (emeryThompson2012, T-ENE-5).

Cause, named in E1c: the nurse act continues while the infant is hungry (it ends only at a hunger readout below 0.08), and the nurse option's score, 0.25 + 1.5 × hunger × (1.3 under 0.5 y) × (1 − age/7), ignores how much milk the gland holds. Once the gland is drained, a hungry infant keeps drinking the synthesis trickle (about 0.05 kcal per 15 s tick at 31.3 kg) tick after tick, and the option outscores ground foraging (0.5 × hunger − 0.05) for any hungry infant. So infants never turn to solid food, never need less milk, and their mothers never recover.

## 2. Mechanism (switch `ledgerNurseByMilk`, 0 = today)

With `ledgerNurseByMilk` 1 and the ledger on:

1. **The option is worth what it can deliver.** The nurse option's score (the existing formula, unchanged weights) is multiplied by the share of the infant's deficit the gland can fill now: `a = min(1, milk in the mother's gland store ÷ the infant's gut room)` (kcal over kcal), and `a = 0` when the gut is full. A drained gland makes nursing worth almost nothing; a full gland and an empty gut leave the score as today. No new number. The infant cannot see the store; `a` stands for the feedback of milk flow and let-down that infants learn (design).
2. **A bout ends when the gland is empty.** The nurse act also ends when, after the tick's drinking, the gland holds less than one tick of suckling at the suckling rate (it can no longer sustain the flow). The existing end (hunger readout below 0.08) stays. No new number.
3. Unchanged: the suckling rate (2.5 kcal/min, assumed), the yield (23.2 × M^0.75 kcal/day, assumed), the store that stops synthesis when full (now sourced in direction: synthesis follows removal, daly1993, kent1999), night suckling in the mother's nest (E1c, while hungry: at night drinking has no time cost), the weaning age (`weanAgeMinY`, `weanAgeSpanY`) and the weaning refusals (a dice roll from 3.2 y). Weaning age is therefore still an input; what becomes an output is how the infant's diet shifts from milk to food with age, i.e. nutritional weaning.

**Considered and not implemented: milk synthesis falling with the mother's own reserves.** The evidence says synthesis is buffered: baboons fed 80% of ad libitum intake kept their milk output (with 17–25% higher efficiency) and only at 60% did output fall, "when … severe enough to increase body nutrient mobilization" (roberts1985); supplementing Gambian mothers by about 720 kcal/day did not change milk volume (prentice1983); in well-fed rhesus, milk yield rises with parity and infant weight (hinde2009), with no dose-response to energy balance. No source gives the threshold in units of body reserves, and the model's lactating females sit at −0.01 to −0.04 of the store, which is the protected range. Any curve would be invented and, at these reserves, inert. So weaning conflict cannot emerge from maternal depletion here; the refusals stay scripted (a known prescription, named).

**Comfort suckling.** Field nipple contact includes non-nutritive (comfort) suckling: isotopic weaning precedes the end of nipple contact (badescu2017, matsumoto2017), and suckling time stays about 3% from 6 months to 4 years while foraging rises (badescu2022). It is not modelled: the nurse act is nutritive only. The model's suckling share should therefore fall at or below the field's total nipple-contact share.

## 3. Inputs

None new. One switch (`ledgerNurseByMilk`, design, 0). The weights of the nurse option and the 0.08 end are the existing design values.

## 4. Benchmark

Field profile, seeds 48 and 7 only, 30-day burn-in + 60 days (90 days in all), rules policy, `--workers 1`, one heavy run at a time.

| Arm | Params |
| --- | --- |
| R | E1c arm 3: `energyLedger` 1, `rhythmSleep` 1, `rhythmHeat` 1, `ledgerGrowSurplus` 1, `ledgerNightNurse` 1, `ledgerInfantIntake` 1, `ledgerMilkStoreH` 11. Reused from `artifacts/validation/e1c/arm3-*` (the merge leaves it unchanged: same world hash after 2 days, seed 48) |
| 5 | R + `ledgerNurseByMilk` 1 |

Tools: `scripts/energy-diagnose.ts` (infant table by year of age) and `scripts/e-bench.ts --quick --days 60 --workers 1 --compare` R.

Readouts: daytime suckling share (daylight ticks with milk drunk) and eating share by infant age; milk kcal/day by infant age, by day and night; milk share of the infant's intake by age, and the age at which a straight line through it reaches zero (nutritional weaning, indicative); mothers' reserves and milk cost by infant age; infant reserves day 30 → 90; growth; viability; T-ACT-5, T-RNG-5, band distances.

## 5. Predictions (by hand, before any run)

| Quantity | R (measured) | Arm 5 (expected) | Field |
| --- | --- | --- | --- |
| Daytime suckling share, infants 1–4 y | 40–67% | **5–12%**: daytime milk about half of the yield (150 kcal) at 2.5 kcal/min is about 60 min, 8% of daylight. Still above the field: the suckling rate (assumed from 2 h of suckling a day) is the named term | about 3% (nipple contact, comfort included) |
| Daytime suckling share, 0–1 y | 4.8% | about the same (these infants are not trickle-limited) | 5.85% at 0–6 months |
| Daytime eating share, 1.2–4 y | 0.8–7.4% | rises, to about 5–20% | 17–47% |
| Daytime eating share, under 1.2 y | 0 | 0 (carried: the C8 gate) | 17% at 6–12 months |
| Own food, 2–3 / 3–4 y (kcal/day) | 97 / 224 | higher | — |
| Milk, infants ≥ 1 y (kcal/day) | 304–307 | 250–307: they drink less only if own food covers more of the need; night suckling still drains the overnight synthesis | falling from 1 y (badescu2017) |
| Milk share of intake 1–2 / 2–3 / 3–4 y; zero crossing | 0.95 / 0.76 / 0.58; about 6.6 y | falls faster with age; zero crossing earlier (5–6 y), still later than the field | isotopic weaning by 4–4.5 y |
| Mothers' milk cost by infant age | 323 / 380 / 384 / 384 | flatter at 2–4 y, but probably still not falling: **year-2 recovery expected to remain a miss** unless infants' own food rises by more than about 100 kcal/day | recovery in year 2 (T-ENE-5) |
| Infant reserves, day 30 → 90 | stable | stable or rising; growth at 1–3 y above 0.8–1.1 kg/y | — |
| Adults, juveniles | — | unchanged within noise | — |
| Viability | no deaths | the same | — |

## 6. Kill criterion

The switch stays off (null) if, in arm 5 against R:

- K1: any starvation death, or two or more deaths more than R;
- K2: infants 0.5–2 y or 2–5 y (by age at day 30, both seeds) below −0.05 of the store at day 90, or falling by more than 0.03 from day 30;
- K3: lactating females' reserves more than 0.02 below R;
- K4: held-out band distance on rows scored in both above R's by more than 0.8;
- K5 (this stage's purpose): daytime suckling share of infants 1–4 y not below 20%.

Keep (provisional) if none; the switch stays off by default (Track E sequencing).

## 7. Iteration

At most three, each logged here before its run, each a change of mechanism from first principles; no input is moved toward a target.

None run. The registered mechanism passed every kill criterion on its first run. The miss it leaves (the year-2 recovery) does not trace to a choice rule that could be changed from first principles with a sourced number (§8.4).

## 8. Results

Arm 5 against R (E1c arm 3, reused; the merge leaves it unchanged), seeds 48 and 7, 30-day burn-in + 60 days. Outputs in `artifacts/validation/e1c/arm5-*` (not tracked). Same 8 founder infants (0.58–3.58 y at day 30) in both seeds; no births or deaths in either arm.

### 8.1 Infants by year of age (energy diagnosis; kcal per infant-day)

| | R: 0–1 / 1–2 / 2–3 / 3–4 y | Arm 5: 0–1 / 1–2 / 2–3 / 3–4 y | Field (target) |
| --- | --- | --- | --- |
| Daylight ticks drinking milk | 4.8 / 66.6 / 58.6 / 39.7% | **4.8 / 12.6 / 11.0 / 9.7%** | suckling 5.85% (0–6 mo), about 3% (6 mo–4 y), comfort included (badescu2022) |
| Daylight ticks eating own food | 0 / 0.8 / 4.2 / 7.4% | 0 / 3.3 / 6.4 / 8.7% | foraging 17% (6–12 mo), 25% (1–2 y), 47% (4–5 y) |
| Milk (share drunk at night) | 258 (65%) / 304 (50%) / 307 (48%) / 307 (48%) | 258 (65%) / 304 (57%) / 307 (68%) / 305 (74%) | — |
| Own food | 0 / 15 / 97 / 224 | 0 / 50 / 138 / 240 | — |
| Milk share of intake | 1.00 / 0.95 / 0.76 / 0.58 | 1.00 / 0.86 / 0.69 / 0.56 | falling from about 1 y (badescu2017); about 3 y the major transition (matsumoto2017) |
| Nutritional weaning, straight line through 1–4 y reaching zero (indicative) | about 6.6 y | about 7.2 y | isotopic weaning by 4–4.5 y (badescu2017) |
| Growth paid; velocity | 35 / 15 / 12 / 28 kcal; 2.86 / 0.83 / 1.06 / 2.30 kg/y | 35 / 36 / 36 / 36 kcal; 2.9 kg/y at every age (the potential) | about 1.6 kg/y from birth to 5 y (Gombe, [L]) |
| Reserves ÷ store, infants 0.5–2 y at day 30 → 90 | +0.035 → +0.032 | +0.059 → +0.057 | — |
| Reserves ÷ store, infants 2–5 y at day 30 → 90 | +0.001 → −0.003 | +0.048 → +0.049 | — |

### 8.2 Mothers and the rest of the population

| | R | Arm 5 |
| --- | --- | --- |
| Mothers' reserves by infant age 0–1 / 1–2 / 2–3 / 3–4 y (other females +0.06) | +0.038 / +0.011 / −0.036 / −0.040 | +0.040 / +0.006 / −0.023 / −0.024 |
| Mothers' milk cost by infant age (kcal/day) | 323 / 380 / 384 / 384 | 323 / 380 / 384 / 381 |
| Lactating females: reserves; eating min | −0.009; 167 | −0.002; 172 |
| Juveniles 5–12 y: eating min; reserves | 143; +0.026 | 146; +0.028 |
| Adult males / other females: eating min; reserves | 152 / 147; +0.066 / +0.059 | 151 / 146; +0.065 / +0.060 |
| Births; deaths; starvation | 0; 0; 0 | 0; 0; 0 |

### 8.3 Scorecard (e-bench `--quick --days 60 --workers 1 --compare` R)

Held-out distance on the 12 rows scored in both: −0.35 (headline 3.20 → 4.13 only because six patrol rows were scored in arm 5 and not in R). Fitted: −0.21 on rows scored in both. Prescription count 138 → 138. T-ACT-5 −0.01 (pass, as R); T-RNG-5 0.71 → 0.68 (fail, band 0.3–0.6); T-ACT-4 0.54 → 0.50. Viability passes in both.

### 8.4 Against the predictions (§5)

- **The trickle is gone.** Daytime drinking by infants of 1–4 y fell from 40–67% to 10–13% of daylight ticks, at the top of the predicted 5–12%. It stays above the field's 3% (which includes comfort suckling, not modelled): the named term is the assumed suckling rate (2.5 kcal/min, from 2 h of suckling a day in women); at about 3% of a 12.5 h day the field would transfer only about 55 kcal by day at that rate.
- **Infants turned to food, but only as far as they need to.** Own food rose by 35 (1–2 y) and 41 (2–3 y) kcal/day, and daylight eating to 3–9%, at the bottom of the predicted range and far below the field's 25–47%. They no longer falter: growth is now at the potential at every age (2.9 kg/y), and reserves sit at +0.05. The milk freed by day is drunk at night (night share 57–74%), so total milk is unchanged.
- **Milk and the year-2 recovery: miss, as registered.** Every infant of 1 y or more still drinks the whole yield (304–307 kcal/day), mothers' milk cost still rises with infant age (323 → 384), and their reserves still fall with it (+0.040 → −0.024), slightly less than in R. The indicative weaning line reaches zero at about 7 y, against 4–4.5 y in the field.
- **Why, by the numbers.** An infant's need exceeds the yield from about 1.4 y (maintenance on the curve's masses: 310 kcal at 1.5 y, 465 at 3 y), and it can drink whenever it is hungry, by night in the nest (no time cost) and by day when the gland has filled. Under any rule of this kind the milk drunk equals the yield as long as need exceeds yield plus the food the infant chooses to eat, and the infant eats only what milk does not cover. So the mother's output, and her deficit, can only fall if something limits supply: a synthesis capacity that declines with the stage of lactation, or the mother withholding milk (weaning conflict). Neither has a sourced magnitude: maternal depletion does not lower output at the model's mild deficits (roberts1985: protected at 80% of ad libitum intake; prentice1983), and the model's refusals are a scripted dice roll from 3.2 y, by day only.
- **Growth: now a miss in the other direction.** With infants no longer time-starved, growth runs at the potential (the stylized curve, close to captive growth), so mass for age would follow the curve (16.5 kg at 5 y) rather than the Gombe estimate (about 10 kg, [L]). The wild growth deficit is then unexplained by energy: the human-scaled yield and the size-scaled adult intake rates (both assumed) may be too generous for wild infants, or costs are missing (immune, thermoregulation; named in E1).
- Mothers, juveniles, adults: unchanged within 0.01 of the store; T-ACT and T-RNG rows within noise.

### 8.5 Verdict

K1 no deaths; K2 infants +0.059 → +0.057 and +0.048 → +0.049; K3 lactating females −0.002 against −0.009; K4 held-out −0.35 on shared rows; K5 daytime drinking 10–13% (< 20%). **Keep (provisional)**; the switch stays off by default. It removes a behavioural artefact (an act that went on while it paid nothing) without a new number.

**Open problem.** Nutritional weaning and the mothers' year-2 recovery do not emerge from yield against demand, because demand exceeds a constant yield from about 1.4 y and nothing limits supply. The next mechanism needs a source for either a stage-dependent fall in milk synthesis in apes (or primates) or the rate of maternal rejection by infant age (e.g. Gombe weaning studies, not yet read), so that weaning conflict replaces the scripted refusals.
