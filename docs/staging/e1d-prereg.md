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

## 8. Results

(to be filled in after the runs)
