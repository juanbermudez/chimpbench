# E1g pre-registration: sensitivity of the energy ledger to unmeasured wild expenditure

Registered 1 October 2026, before any run of the changed code (tests included). Track E, stage E1g, branch `e1g-expenditure` (from `track-e` at ee33c68). New parameter `ledgerWildCostMult`, default 1 (hash-identical), read only with `energyLedger` 1.

**What this stage is.** A sensitivity analysis of one physiological quantity that has never been measured: the total energy expenditure of wild chimpanzees. It is **not a fit**. The parameter's default stays 1 whatever the result. The output is a quantified, testable claim for field energetics: "the model reproduces the field time budget only if wild expenditure is about k × the sourced (captive-based) estimate". Whether to adopt any k ≠ 1 is the user's decision.

**Rule served.** Field values of behaviour are targets, never inputs. Nothing is moved to hit a target; the sweep values are fixed here, before any run.

## 0. The open problem

With food at its measured energy and expenditure from sourced physiology, the full E stack (E1, E1b–E1e, E2a, E4a, E4b) balances at about 1.36 × resting for an adult female:
- spending about 1,260 kcal/day (31.3 kg female, not pregnant or lactating; 1,680 lactating);
- eating 171–206 min/day against 309 ± 85 (T-ENE-2);
- eating 1,310–1,720 formula kcal/day against 2,479 ± 858 (T-ENE-1).

Swallowed seeds are ruled out (uwimbabazi2019 removed them before weighing; E1e). Fibre digestibility explains 3–6% (E1b). The 5-seed confirm run of the stack (`artifacts/validation/e/stack1-confirm.md`) shows what the freed time does: grooming out of band high (T-ACT-3 0.22 male, 0.25 female), feeding share low (T-ACT-1 0.31), hunts 41 per community-year against 5–25 (T-HUN-1), lactating hunger 0.51–0.58 against 0.19 for other adults.

## 1. Sources (docs/research.md §E.18; docs/staging/e-sources.md §18)

- **No wild great ape has a measured total expenditure** (doubly labelled water, accelerometry or heart rate): none found. All ape values are captive (pontzer2010, pontzer2016).
- **Wild haplorhine primates measured by doubly labelled water** (simmen2021 Table 1, FT): mantled howlers PAL 1.89, yellow baboons PAL 1.38. Captive *Pan* 1.4–1.5 (pontzer2016) or 1.58 (simmen2021's resting rate); captive olive baboons 1.66. Howlers about 2 × basal (nagyMilton1979, Abs).
- **Captive and wild primates spend alike** (pontzer2014; simmen2021: "no notable DEE differences ... between captive and wild animals from the same species"). Captive orangutans with wild-like activity spend less than nearly any eutherian (pontzer2010).
- **Free-living humans:** Hadza PAL 1.78 (women) and 2.26 (men), against Western 1.68 and 1.81; total expenditure no different after controlling for body size (pontzer2012, FT). Expenditure plateaus at high activity (pontzer2016cb).
- **Mammals in general:** field ÷ basal "2–3" commonly (simmen2010, secondary); wild-mammal expenditure depends mostly on mass and temperature (westerterpSpeakman2008). Primates spend about half of what a placental mammal of their mass spends (pontzer2014), so the mammal ratio does not transfer.
- **Named wild costs with a size:** immune activation +8% of resting during a mild infection, more than 14% in a subset (muehlenbein2010, human); thermoregulation rises with temperature in wild lemurs (simmen2024) but is small at Kibale temperatures (E2a: dissipation exceeds production below about 33 °C in shade).

The brief's premise that wild mammals often spend 2–4 × basal is true for mammals in general and **not for the primates that have been measured**. That is the strongest argument against a large k, and it is registered here before the runs.

## 2. The parameter and its bounded range

`ledgerWildCostMult` (k) multiplies the non-locomotor maintenance term of every individual's expenditure: resting rate × activity multiple (asleep 1, awake 1.25, feeding 1.38). It stands for wild costs no term models: thermoregulation, immune function, tissue repair, vigilance. Locomotion, gestation, growth, milk and diet-induced thermogenesis are unchanged in form. Diet-induced thermogenesis is 0.10 of absorbed energy, so it rises with intake. The E1e drive's expected spending (`eAvg`) reads the books and so includes the extra cost. Registry: group `needs`, evidence *assumed*, range 1.0–1.4, hard range 0.5–4, `calibrate` false with a calibration exclusion.

Equivalent k of measured PALs (derived; 31.3 kg female; ledger at k = 1: resting + activity 1,049, locomotion 82, total (1,049 k + 82) ÷ 0.9 with DIT; PAL 1.36 at k = 1):

| Measured PAL | Source | Equivalent k |
| --- | --- | --- |
| 1.38, wild yellow baboons | simmen2021 | 1.02 |
| 1.40, captive *Pan* females | pontzer2016 | 1.03 |
| 1.58, captive *Pan* (other resting rate) | simmen2021 | 1.18 |
| 1.78, Hadza women | pontzer2012 | 1.34 |
| 1.89, wild mantled howlers | simmen2021, nagyMilton1979 | 1.42 |
| 2.26, Hadza men | pontzer2012 | 1.72 |
| 2–3, mammals in general (not primates) | simmen2010 (secondary) | 1.51–2.31 |

PALs from different studies use different resting rates (measured, estimated from equations, or from a regression across species); the equivalence carries ±10–20%. **Sourced bounded range: k 1.0–1.4 for non-human haplorhines; 1.7 at the upper end of free-living humans.** The sweep is 1.0, 1.3, 1.6 and 1.9: 1.3 inside the primate range, 1.6 inside the human range only, 1.9 outside every measured primate (the value field intake implies, below).

## 3. Code (one term)

- `src/sim/energy.ts` `energyTick`: `out += base * act * P.ledgerWildCostMult`; the diagnostic tap reports the extra as a new term `wild`. `openDrive`'s first estimate of spending carries the same factor. At k = 1 the product is exact (× 1), so worlds are hash-identical.
- `scripts/energy-diagnose.ts`: a `wild` column.
- Nothing else changes: no score weight, no intake rate, no milk yield, no gut size.

## 4. Predictions (by hand, from the inputs, before any run)

Reference (k = 1) values are from the E1e arm D2 diagnosis and the stack's confirm run; the k = 1 arm of this sweep is measured first and replaces them as the reference.

### 4.1 Expenditure and intake (simulation truth, `energy-diagnose`)

Expenditure (kcal/day) = (maintenance × k + locomotion + milk) ÷ 0.9; formula intake = expenditure ÷ absorbed share (0.96; 0.978 for lactating females). Locomotion held at the k = 1 value (it will rise somewhat with more trips).

| k | Female, other: spend / formula eaten / eating min | Male: spend / eaten / min | Lactating: spend / eaten / min | Adult females pooled (11 : 9 : 16 other, pregnant, lactating): eaten / min |
| --- | --- | --- | --- | --- |
| 1.0 | 1,257 / 1,310 / 171 | 1,506 / 1,564 / 182 | 1,686 / 1,721 / 206 | 1,567 / 193 |
| 1.3 | 1,606 / 1,673 / 219 | 1,919 / 1,998 / 232 | 2,037 / 2,082 / 250 | 1,885 / 240 |
| 1.6 | 1,956 / 2,038 / 266 | 2,332 / 2,429 / 283 | 2,388 / 2,441 / 292 | 2,252 / 284 |
| 1.9 | 2,306 / 2,402 / 313 | 2,745 / 2,859 / 333 | 2,739 / 2,800 / 335 | 2,615 / 327 |

Eating minutes are scaled at each class's k = 1 rate (7.7–8.6 formula kcal per eating minute).

**The gut ceiling (registered now, from E1b's assumed capacity).** The foregut holds 5.6 g dry matter per kg (175 g at 31.3 kg) and empties first-order over 3 h, so it can pass at most capacity ÷ 3 h ≈ 58 g/h. Over an 11.3-hour active day plus one gutful carried into the night, that is about 835 g/day: about 2,390 formula kcal for a non-reproducing female's diet (0.349 g/kcal), 2,515 for a lactating female's (0.332 g/kcal), 3,100 for a male. The field's own dry-matter intake is 872 ± 289 g/day (T-ENE-3). Capacity scales with mass and need with mass^0.75, so smaller animals hit the ceiling first. A gut cannot be full all day (satiation is 1 − fill²), so the practical ceiling is lower, perhaps 85–90%.
- k = 1.3: no class above 85% of the ceiling.
- k = 1.6: lactating females at about 97%, juveniles (about 24 kg) at about 87%: intake will fall short of need for them.
- k = 1.9: every adult class at 92–111% of the ceiling. Feeding minutes plateau below the table above, and reserves fall.

### 4.2 Rows (observer scorecard, `e-bench`; 2 seeds, 60 days)

Point predictions. Slopes come from the baseline → stack contrast (T-ACT-1 0.42 → 0.31 for about 78 fewer eating minutes; grooming took 0.5–1.0 of the freed share; rest + groom about 1.0–1.3 × the change in feeding).

| Row | Band | k = 1.0 (stack confirm) | 1.3 | 1.6 | 1.9 | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-ENE-1 formula intake, adult females pooled (truth) | 1,900–3,100 | ~1,570 | ~1,890 (edge) | ~2,250 (in) | ~2,450–2,600, or less where the gut binds (in) | moderate |
| T-ENE-2 eating min, adult females pooled (truth) | 250–370 | ~193 | ~240 (just below) | ~284 (in) | 300–327 (in) | moderate |
| T-ACT-1 feeding | 0.33–0.50 | 0.31 | 0.37 | 0.43 | 0.47–0.50 (top edge) | moderate |
| T-ACT-2 travel | 0.12–0.25 | 0.16 | 0.17 | 0.18 | 0.19 | low |
| T-ACT-3 grooming | 0.08–0.18 | 0.24 | 0.19 (above) | 0.15 (in) | 0.11 (in) | moderate |
| T-ACT-4 rest + groom | 0.30–0.47 | 0.49 | 0.42 | 0.35 | 0.28–0.32 (may leave at the bottom) | low |
| T-HUN-1 hunts per community-year | 5–25 | 41 | no direction registered: hunts are taken at colobus encounters of male parties (no hunger term); more ranging raises encounters, more feeding and smaller parties lower them. Within ±30% of the k = 1 value | | | low |
| T-FOOD-2 fruit share | 0.60–0.78 | 0.66 | 0.70 | 0.74 | 0.76–0.80 (may leave at the top) | low; fruit gives more energy per gram of gut, which favours it when the gut binds |
| T-FOOD-4 trees per day (held out) | 4–15 | 5.0 | 5.5 | 6.5 | 7.5 | low |
| T-PTY-1 party size | 3–9 | 3.5 | 3.3 | 3.1 | 2.9 (may leave at the bottom) | low; E1 raised it by freeing time |
| T-RNG-4 male day range | 1.5–3.5 km | 1.90 | 2.1 | 2.3 | 2.5 | moderate |
| T-RNG-5 lactating ÷ male day range (held out) | 0.3–0.6 | 0.77 | 0.74 | 0.70 | 0.65 (still above) | low; males' need rises more in proportion, mothers are gut- and infant-limited |

### 4.3 Reserves, weaning and viability (truth)

- **Infants under about 1.2 y** cannot feed themselves, and milk is capped by the mother's yield (23.2 × mass^0.75 = 307 kcal/day at 31.3 kg, not scaled by k). Their maintenance is about 213 kcal/day at k = 1, so their spend is about 311 (k 1.3, growth stopped), 382 (1.6) and 453 (1.9) kcal/day against at most 307 of milk:
  - k = 1.3: balance at the margin, growth stalls;
  - k = 1.6: deficit about 75 kcal/day, −1.4% of the store a day; starvation possible near the end of the window (0–2 deaths);
  - k = 1.9: deficit about 145 kcal/day, −2.8% a day; **starvation within about 35 days for infants under about 1 y at the window's start (2–4 deaths expected, high confidence).**
- **Infants 1.2–5 y:** own food rises, daytime eating share rises, daytime nursing share rises (hungrier). Growth (paid only from surplus, `ledgerGrowSurplus`) falls at 1.3 and about stops at ≥ 1.6. Reserves fall at ≥ 1.6.
- **Juveniles 5–12 y:** hold at 1.3; fall at 1.6 (gut-limited, about −0.5%/day); fall fast at 1.9 (risk of starvation late in the window).
- **Lactating females:** fall faster than at k = 1 from 1.6 (gut ceiling); at 1.9 about −0.7%/day until an infant dies and lactation stops. Other adults hold at 1.3 and 1.6 and fall at 1.9.
- **Hunger:** daylight hunger of other adults rises with k (0.19 → about 0.3 at 1.6, about 0.4 at 1.9); lactating females' rises toward saturation (0.55 → 0.7–0.9); the gap narrows.
- **Viability rule** (as in E1b and E1e): pass if no starvation death and no class's reserves fall faster than 0.05% of the store a day. Expected: **k = 1.0 pass, 1.3 pass or marginal (infants under 1.2 y), 1.6 fail (infants, juveniles, mothers), 1.9 fail with starvation deaths.**

### 4.4 Band distance (e-bench)

On rows scored at both k = 1 and the other k: fitted distance falls by 0.4–0.9 at k = 1.6 (T-ACT-1, T-ACT-3, T-ACT-4 into their bands), less at 1.9 if T-ACT-4, T-PTY-1 or T-FOOD-2 leave at the other edge. Held-out: no direction (within ±0.5, the noise floor).

### 4.5 The registered answer

- **k_t (time budget):** the smallest swept k at which T-ACT-1, T-ACT-2, T-ACT-3 and T-ACT-4 all pass on the 2-seed pooled values; also the k at which T-ACT-1 reaches 0.33 and T-ACT-3 reaches 0.18, by linear interpolation between swept values. Predicted: T-ACT-1 enters at about 1.1, T-ACT-3 at about 1.4; all four in band for k of about 1.4–1.75 (point 1.55); swept answer 1.6.
- **k_i (intake):** the k at which pooled adult-female formula intake reaches 1,900 (band entry) and 2,479 (field mean), interpolated. Predicted: entry about 1.3, mean about 1.8, if the gut does not bind first; non-reproducing females alone reach the mean only at about 1.97.
- **Consistency:** k_t and k_i are consistent if T-ENE-1 is in band at the k that puts the time budget in band. Predicted: **consistent at about 1.5–1.7** (both targets follow eating time at about 8 kcal per minute).
- **Viability at that k:** predicted to **fail** under the present milk yield and gut capacity: infants under 1.2 y and juveniles cannot take in k × their spending. So "wild expenditure about 1.6 ×" would also imply that milk output and gut throughput are above their present assumed values (human-scaled yield; E1b's foregut). That is part of the claim, not a defect to fix here.
- **Against the sources:** the k that fits the field (about 1.6) lies above every wild non-human primate measured (≤ 1.42) and within free-living humans only at the men's end.

## 5. What would refute what

- If T-ACT-3 is still above 0.18 at k = 1.9, freed time is not the cause of high grooming, and the cause lies in the grooming scores, not in energy.
- If eating minutes do not rise roughly in proportion to expenditure (less than +50% from k 1.0 to 1.6), something other than energy demand limits feeding (gut ceiling earlier than computed, or time).
- If infants under 1.2 y do not lose reserves at k = 1.9, the milk yield is not binding as registered.
- No result here moves the default or any other input.

## 6. Benchmark

Field profile, seeds 48 and 7 only, 30-day burn-in + 60 days (90 days in all), `--workers 2`, one run at a time, rules policy (no model API). Stack S = `{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseByMilk":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1}`.

For k in 1.0, 1.3, 1.6, 1.9 (S + `{"ledgerWildCostMult":k}`; at 1.0 the key is passed too):
- `pnpm exec tsx scripts/e-bench.ts --quick --days 60 --workers 2 --params '<S + k>' --out artifacts/validation/e1g/k<k>`
- `pnpm exec tsx scripts/energy-diagnose.ts --seeds 48,7 --burn-in 30 --days 60 --params '<S + k>' --json artifacts/validation/e1g/k<k>-energy.json`

Pooled adult-female intake and eating minutes are the individual-day-weighted mean of the three adult-female classes in `energy-diagnose`.

## 7. Results

Runs: field profile, seeds 48 and 7, 30-day burn-in + 60 days, `--workers 2`, one at a time, rules policy, on commit 7cfc8bb (code as registered in e7419f6). Outputs in `artifacts/validation/e1g/` (not tracked): `k<k>.{json,md,scorecard.*}`, `k<k>-energy.{json,txt}`, `a1*`, `analysis.md`. Unit tests: `tests/sim-wild-cost.test.ts` (default 1 in both profiles; k scales the resting × activity cost and the tap reports the extra as `wild`; energy conserved at k 1.6); `pnpm test` 591 pass, 1 skipped, 0 fail; the field pin in `tests/sim-track-e.test.ts` did not move.

### 7.0 Attribution run, registered after the sweep and before it ran (not a candidate)

The sweep showed adult females' formula intake stopping at about 1,950–1,980 kcal/day (650–670 g dry matter) at k 1.6 and 1.9, whatever their need, with eating minutes stopping at about 250, mean foregut fill 0.46–0.49 and daylight hunger 0.38–0.39 although reserves were deep in deficit (so the drive φ is saturated and hunger = 1 − fill²). The reading to test: the ceiling is the foregut's throughput (capacity ÷ the 3-hour emptying constant, held below capacity by the satiation curve), not time or choice.
- **A1:** k 1.6 + `digestaGutMlPerKg` 111 (the top of its assumed range, 1.34 × the central 83; foregut 7.5 g/kg). Same seeds, window and tools (`e-bench --quick --days 60`, `energy-diagnose`).
- **Expected if the gut binds:** female dry matter and intake rise about in proportion (toward 850–880 g and 2,500–2,650 formula kcal), non-reproducing females and mothers stop losing reserves, starvation deaths fall to 0–2, eating minutes rise above 250. **If time or choice binds instead:** intake stays near 1,950 and deaths persist.
- Whatever it shows, the gut volume stays an assumption (E1b); A1 is attribution, not a proposal.

### 7.1 Energy (simulation truth, `energy-diagnose`), kcal per day

| k | Female, other: spend / formula eaten / dry matter g / eating min | Lactating: spend / eaten / min | Male: spend / eaten / g / min | Adult females pooled: eaten / g / min (T-ENE-1, T-ENE-3, T-ENE-2) | Foregut fill (all day), females | Daylight hunger, other / lactating / male |
| --- | --- | --- | --- | --- | --- | --- |
| 1.0 | 1,258 / 1,308 / 459 / 178 | 1,684 / 1,719 / 206 | 1,511 / 1,568 / 525 / 182 | 1,520 / 518 / 193 | 0.33 | 0.21 / 0.41 / 0.21 |
| 1.3 | 1,628 / 1,680 / 578 / 223 | 2,046 / 1,896 / 226 | 1,945 / 2,010 / 661 / 225 | 1,805 / 605 / 225 | 0.41 | 0.29 / 0.45 / 0.25 |
| 1.6 | 1,996 / 1,962 / 658 / 251 | 2,369 / 1,928 / 230 | 2,394 / 2,451 / 797 / 270 | 1,952 / 648 / 242 | 0.48 | 0.38 / 0.45 / 0.36 |
| 1.9 | 2,316 / 1,982 / 661 / 251 | 2,690 / 1,961 / 232 | 2,779 / 2,552 / 827 / 282 | 1,983 / 659 / 247 | 0.48 | 0.39 / 0.44 / 0.39 |
| field | — | — | — | 2,479 ± 858 / 872 ± 289 / 309 ± 85 | — | — |

- Spending followed the registered arithmetic within 2% (non-reproducing females 1,628 / 1,996 / 2,316 against 1,606 / 1,956 / 2,306 predicted).
- **Intake did not follow spending.** Adult females' intake stopped at about 1,950–1,980 formula kcal (650–660 g dry matter, about 250 eating minutes) whatever their need: at k 1.6 and 1.9 non-reproducing females ate 1,962 and 1,982 against 1,996 and 2,316 spent, lactating females 1,928 and 1,961 against 2,369 and 2,690. Mothers hit it first, at k 1.3 (1,896 eaten, 2,046 spent). Males (39 kg, a larger gut) stopped at about 2,450–2,550.
- At the ceiling the gut was not physically full (full 12% of daylight; mean fill 0.48 over the day), but hunger was held at 0.38–0.45 although reserves were 20–80% into the store: the drive φ was saturated, so hunger = 1 − fill², which puts the daytime foregut at about 0.75–0.8 full. Throughput = fill × capacity ÷ 3 h: about 650 g/day for a 31 kg female (75–80% of the hard ceiling of 835 g computed in §4.1, not the 85–90% guessed).

### 7.2 Rows (observer scorecard, `e-bench`; 2 seeds pooled)

| Row | Band | k 1.0 | 1.3 | 1.6 | 1.9 | Registered (1.3 / 1.6 / 1.9) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 feeding (M, F) | 0.33–0.50 | 0.30 (0.29, 0.31) fail | 0.35 (0.35, 0.36) pass | 0.40 (0.42, 0.39) pass | 0.40 (0.43, 0.38) pass | 0.37 / 0.43 / 0.47–0.50: rose less, stopped at 1.6 |
| T-ACT-2 travel | 0.12–0.25 | 0.16 pass | 0.18 pass | 0.21 pass | 0.19 pass | 0.17 / 0.18 / 0.19: as registered |
| T-ACT-3 grooming (M, F) | 0.08–0.18 | 0.24 (0.23, 0.24) fail | 0.20 (0.18, 0.21) fail | 0.15 (0.11, 0.18) pass | 0.16 (0.14, 0.18) fail by 0.002 | 0.19 / 0.15 / 0.11: as registered to 1.6, then stopped |
| T-ACT-4 rest + groom | 0.30–0.47 | 0.48 fail | 0.39 pass | 0.33 pass | 0.33 pass | 0.42 / 0.35 / 0.28–0.32: as registered to 1.6 |
| T-ACT-5 (held out) | pattern | pass | pass | pass | pass | — |
| T-HUN-1 hunts per community-year | 5–25 | 40.6 | 38.5 | 50.7 | 53.7 | within ±30%: as registered to 1.6, +32% at 1.9 |
| T-HUN-2 hunt success | 0.5–0.8 | 0.26 | 0.35 | 0.24 | 0.25 | — (noisy) |
| T-FOOD-2 fruit share | 0.60–0.78 | 0.67 | 0.74 | 0.77 | 0.78 | 0.70 / 0.74 / 0.76–0.80: as registered |
| T-FOOD-4 trees per day (held out) | 4–15 | 5.1 | 6.3 | 8.4 | 8.7 | 5.5 / 6.5 / 7.5: same direction, larger |
| T-PTY-1 party size | 3–9 | 3.59 | 3.65 | 3.41 | 3.13 | 3.3 / 3.1 / 2.9: flat at 1.3, then falling, less than registered |
| T-RNG-4 male day range, km (scorer holds the verdict as fail, a tuned row; distance 0) | 1.5–3.5 | 1.85 | 2.23 | 2.52 | 2.23 | 2.1 / 2.3 / 2.5: as registered to 1.6 |
| T-RNG-5 lactating ÷ male day range (held out) | 0.3–0.6 | 0.74 | 0.71 | 0.76 | 0.78 | falling to 0.65: **no trend** |

| Band distance (e-bench) | k 1.0 | 1.3 | 1.6 | 1.9 |
| --- | --- | --- | --- | --- |
| Fitted, all scored rows | 3.618 (19 rows, 9 out) | 1.500 (19, 5) | 3.215 (17, 4) | 2.878 (18, 6) |
| Held-out, all scored rows | 3.005 (18, 10) | 5.291 (18, 12) | 4.045 (13, 9) | 4.196 (18, 11) |
| Fitted, 17 rows scored in all four | 3.340 | 1.347 | 3.215 | 2.823 |
| Held-out, 13 rows scored in all four | 2.665 | 3.595 | 4.045 | 3.209 |
| Prescription count | 134 | 134 | 134 | 134 |

The activity rows account for −0.79 of fitted distance from k 1.3 on. The rest is rare-event noise of the size E0 measured (up to 0.8 between seed sets): T-COM-11 (alarm calls) 0.83 / 0 / 0.83 / 0.17, T-HUN-1 and T-HUN-2, and on the held-out side T-HUN-4 (more males, more hunting) 0.09 / 0.90 / 1.31 / 0.69, T-IGE-2 0.08 → 0.50. No held-out row moved toward its band beyond noise.

### 7.3 Reserves, deaths and weaning (truth)

| k | Deaths in the window (living 98 at day 30) | Reserves ÷ store, change per day: males / other females / lactating / juveniles / infants 2–5 y / infants 0.5–2 y | Median hunger, adults / lactating (e-bench) |
| --- | --- | --- | --- |
| 1.0 | 0 | −0.003% / −0.007% / **−0.071%** / −0.007% / −0.003% / +0.001% | 0.19 / 0.52–0.54 |
| 1.3 | 0 | −0.016% / −0.036% / **−0.535%** / −0.027% / −0.005% / **−0.115%** | 0.28–0.31 / 0.77–0.80 |
| 1.6 | **17**: 15 starvation (13 lactating females, 2 infants 0.5–2 y), 2 orphaned infants | −0.058% / −0.405% / survivors only / −0.542% / −0.353% / −0.255% | 0.59–0.65 / 0.77 |
| 1.9 | **49**: 35 starvation (14 lactating, 5 other and 3 pregnant females, 10 juveniles, 1 adolescent, 2 infants), 14 orphaned infants | −0.623% / −0.981% / all died / −0.708% / — / — | 0.74–0.75 / 0.77 |

Weaning readouts, unweaned infants (milk kcal/day; own food kcal/day; daytime nursing %; daytime eating %; growth kg/y):

| k | 0–1 y | 1–2 y | 2–3 y | 3–4 y |
| --- | --- | --- | --- | --- |
| 1.0 | 268; 0; 10.6; 0; 2.06 | 307; 81; 14.4; 3.3; 1.48 | 307; 187; 14.9; 7.2; 1.05 | 306; 333; 13.4; 10.2; 0.93 |
| 1.3 | 307; 0; 16.0; 0; 0.62 | 307; 160; 15.3; 6.6; 0 | 307; 323; 14.6; 12.3; 0 | 307; 513; 13.7; 15.9; 0 |
| 1.6 | 307; 0; 16.2; 0; — | 307; 315; 15.0; 11.4; 0 | 307; 478; 14.5; 18.7; 0 | 307; 719; 13.2; 21.9; 0 |
| 1.9 | 306; 1; 16.0; 0.1; — | 307; 356; 14.6; 15.6; — | 306; 522; 14.1; 20.8; — | 306; 734; 13.4; 22.7; — |

- Milk is pinned at the mother's yield (307 kcal/day) from k 1.3; growth (paid only from surplus) stops at k ≥ 1.3 from age 1; infants of 1–4 y eat 2–2.5 × more of their own food and their daytime eating share rises toward the field's 25–47% (E1d). Daytime nursing stays at 13–16% (field about 3%).
- Viability, by the registered rule (no starvation death and no class falling faster than 0.05% of its store a day): **k 1.0 fails it narrowly** (lactating females −0.071%/day; this is the stack's own state, not caused by k); **k 1.3 fails** (mothers −0.54%/day: −0.16 → −0.48 of the store over the window, on course to exhaust it about 3 months later; infants 0.5–2 y −0.12%/day), with no death inside 60 days; **k 1.6 and 1.9 fail with deaths**.

### 7.4 Attribution run A1 (k 1.6, gut volume 111 mL/kg)

| | k 1.6 (gut 83) | A1 (gut 111) |
| --- | --- | --- |
| Females, other: spend / eaten / g / min | 1,996 / 1,962 / 658 / 251 | 1,988 / 2,069 / 699 / 246 |
| Lactating: spend / eaten / min | 2,369 / 1,928 / 230 | 2,420 / 2,459 / 272 |
| Adult females pooled: eaten / g / min | 1,952 / 648 / 242 | **2,261 / 751 / 259** |
| Males: eaten / g | 2,451 / 797 | 2,450 / 800 |
| Reserves per day: other females / lactating / juveniles / infants 0.5–2 y | −0.405% / — / −0.542% / −0.255% | **−0.010% / −0.134% / −0.028% / −0.205%** |
| Starvation deaths | 15 | **2** (both infants 0.5–2 y) |
| T-ACT-1 / 2 / 3 / 4 | 0.40 / 0.21 / 0.15 / 0.33 | 0.40 / 0.18 / 0.175 (F 0.187, fail by 0.03) / 0.34 |
| T-FOOD-2; T-HUN-1; T-PTY-1 | 0.77; 50.7; 3.41 | 0.79 (above by 0.01); 47.7; 3.15 |
| Fitted / held-out distance | 3.215 / 4.045 | 3.322 / 3.979 |

As registered for "the gut binds": with 1.34 × the foregut, females' dry matter rose to 700–800 g, adults balanced, deaths fell from 15 to 2 and both remaining deaths are infants under 2 y, held by the milk yield (−0.2%/day). Males, who were not at their ceiling, did not change. **The ceiling of §7.1 is the foregut's throughput** (E1b's assumed capacity and 3-hour emptying, held below capacity by E1e's design satiation curve 1 − fill²), not time or choice.

### 7.5 Predictions against results

Held:
- spending (within 2%);
- the direction and size of T-ACT-2, T-ACT-3 and T-ACT-4 up to k 1.6;
- T-FOOD-2, T-FOOD-4 and T-RNG-4 directions;
- T-HUN-1 within ±30% up to 1.6;
- the milk yield binding for infants under 2 y;
- starvation at 1.9.

Missed:
- intake and eating minutes beyond 1.3. Registered 2,252 and 2,615 kcal and 284 and 327 min (pooled females); measured 1,952 and 1,983 kcal and 242 and 247 min. The gut ceiling binds at about 78% of the hard ceiling and for every adult female, not only mothers;
- T-ACT-1, which stopped at 0.40 instead of reaching 0.47–0.50;
- viability at 1.3, registered as pass or marginal for infants: mothers fail first (−0.54%/day), and at 1.6 13 of the 15 starved are lactating females, not infants;
- T-RNG-5, flat instead of falling;
- other adults' median hunger, higher than registered (0.59–0.75 against 0.3–0.4 at 1.6–1.9).

Refutation tests (§5):
- T-ACT-3 is in band at k 1.6, so within the model the high grooming is freed time;
- females' eating minutes rose +25% from k 1.0 to 1.6 (under +50%), so something other than demand limits feeding, and A1 names it: the foregut;
- infants under 1.2 y lose reserves from k 1.3 (milk yield binding).

### 7.6 The answer

- **k_t, time budget.** T-ACT-1 enters its band at k ≈ 1.2 (interpolated: males 1.19, females 1.14). T-ACT-4 enters at ≈ 1.03. T-ACT-3 enters at ≈ 1.58 (females 0.240 → 0.213 → 0.177; males already at 1.3). T-ACT-2 is in band throughout. **All four are in band at k ≈ 1.6** (swept: 1.6). Beyond that the rows stop moving, because intake stops.
- **k_i, intake.** Pooled adult-female formula intake enters T-ENE-1's band (1,900) at k ≈ 1.5 (interpolated between 1,805 at 1.3 and 1,952 at 1.6) and never reaches the field mean (2,479): it stops at about 1,980. T-ENE-2 eating minutes never enter their band (250–370): they stop at 247. With the gut at the top of its assumed range (A1) both are in band at 1.6 (2,261 kcal, 259 min), still 9% and 16% below the field means.
- **Consistency.** At the level of bands, the k that fits the time budget (≈ 1.6) is consistent with intake (T-ENE-1 in band from ≈ 1.5). At the level of means, no k fits: the field's 2,479 kcal in 309 min needs k ≈ 1.8–2.0 (pooled females; §4.1) and a foregut that passes the field's 872 g of dry matter, which the assumed gut cannot pass at any k.
- **Viability.** No k above 1.0 is viable on the present inputs: k 1.3 starves mothers slowly, 1.6 kills 15 of 98 animals in 60 days, 1.9 half the population. With the larger gut (A1) k 1.6 is viable for adults and juveniles; infants under 2 y still starve on the human-scaled milk yield.
- **The quantified claim.** The model reproduces the field activity budget only if wild maintenance expenditure is about **1.6 × the captive-based estimate**: a total of about 2,000 kcal/day for a 31 kg non-reproducing female, PAL ≈ 2.15 on Kleiber's resting rate. It can sustain that only if, in addition, the foregut passes about 1.3 × the assumed dry matter (≥ 700 g/day for a 31 kg female) and infants under 2 y get more than the human-scaled milk yield. The default stays 1.

### 7.7 Reading

The k that the field time budget needs (≈ 1.6, PAL ≈ 2.15) lies above every wild non-human primate measured by doubly labelled water (PAL ≤ 1.89, k ≤ 1.42) and matches free-living humans only at the Hadza men's end. And it cannot be carried by the rest of the model's physiology.

So "unmodelled wild costs" is not a sufficient explanation of the field paradox on present evidence. It needs chimpanzees to be metabolically exceptional among measured primates and, at the same time, to process food faster than the assumed gut allows.

What the sweep does show is that the activity rows are energy-limited in the model: grooming, rest and feeding all move into their bands together when demand rises by about 60%. The field's feeding time is therefore a measure of how much the animals must eat. Either wild chimpanzees spend about 2,000 kcal/day, or the field's 309 minutes contain time that is not ingestion at the measured 8 kcal/min (searching and handling inside a crown, feeding interruptions, low-yield fallback minutes; a hypothesis, not checked against uwimbabazi2019's protocol). Then the field's intake (rate × minutes) would overstate true intake, true intake could match a captive-like expenditure, and the long feeding time would be time the model does not represent: its eating minutes are all ingestion (forage act 184 min, eating 178 min for non-reproducing females at k 1).

The same arithmetic shows that the field's 872 g/day of dry matter exceeds what the E1b foregut (5.6 g/kg, 3 h) can pass; that input, an assumption, is under-sized if the field figure is right.

The testable prediction for field energetics:
- doubly labelled water (or calibrated accelerometry) on wild Kibale adult females should give about 1,900–2,100 kcal/day (PAL ≈ 2.0–2.2) if energy demand explains their time budget;
- a value near the captive 1,300–1,450 kcal/day (PAL 1.4–1.6) would refute it and put the cause in how feeding minutes are counted or in non-energetic time costs.
