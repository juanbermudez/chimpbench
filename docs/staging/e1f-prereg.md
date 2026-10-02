# E1f pre-registration: one nursing rule, growth potential from captive data, infant targets

Registered 1 October 2026, before any run of the changed code (tests included). Track E, stage E1f. Branch `e1f-growth` from `track-e` (ee33c68). Staging only: both new switches are 0 by default in both profiles and act only with `energyLedger` 1, so the compressed golden hashes and the field pin in `tests/sim-track-e.test.ts` cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. Only physiology measured independently of the behaviour enters as a parameter. No input below will be moved to hit a target; a miss is diagnosed term by term.

## 0. Starting point (reference arm R, measured on unchanged code)

R is the full stack: `{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseByMilk":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1}`. Energy diagnosis, seeds 48 and 7, 30-day burn-in + 60 days (`artifacts/validation/e1f/ref-diag.txt`, not tracked):

| Infants by year of age | 0–1 y | 1–2 y | 2–3 y | 3–4 y |
| --- | --- | --- | --- | --- |
| Milk, day + night (kcal/day) | 208 + 62 | 175 + 132 | 160 + 147 | 140 + 167 |
| Own food (kcal/day) | 0 | 82 | 191 | 327 |
| Daylight ticks with milk drunk | 11.1% | 14.5% | 14.8% | 13.5% |
| Daylight ticks eating own food | 0.0% | 3.4% | 7.3% | 10.1% |
| Growth velocity (kg/y) | 2.20 | 1.45 | 1.26 | 0.96 |
| Reserves ÷ store | +0.006 | +0.001 | −0.002 | −0.002 |
| Mothers' reserves ÷ store; milk cost (kcal/day) | −0.043; 338 | −0.046; 383 | −0.066; 384 | −0.065; 384 |

Milk share of intake 0.79 / 0.62 / 0.48 at 1–2 / 2–3 / 3–4 y: a straight line reaches zero at about 6.6 y (the "weaning readout"; the weaning age itself is an input, `weanAgeMinY` 4.1 + `weanAgeSpanY` 1.1, uniform). Lactating females eat 207 min a day against 176 for other females and sit at −0.056 of the store, falling to −0.076 in the last fortnight. No births in the window (the 8 founder infants per seed are 0.58–3.58 y at day 30), so no mother is in the first 6 months of lactation. No deaths.

Probe on R (seed 48, 10 days, scratch script): infants' reserves cycle daily by about ±0.005 of the store, highest at night (they nurse in the nest) and lowest in the afternoon, around a mean of about 0. The fraction of ticks with reserves above the set point is 0.83, 0.50, 0.66 and 0.38 at 0, 1, 2 and 3 y, close to growth velocity ÷ potential (0.76, 0.50, 0.43, 0.33). E1c's growth gate ("grow at the potential while reserves are above the set point") sits at the operating point of E1e's drive, which regulates reserves just in time around the set point and does not ask for growth: under the drive, growth velocity is set by how often the regulator happens to be above zero, not by food.

## 1. The two nursing routes, and what is wrong with each

| | E1d `ledgerNurseByMilk` (`milkWorth`, `glandEmpty`) | E1e `ledgerDrive` (`milkShare`) |
| --- | --- | --- |
| Value | whole nurse score × min(1, gland store ÷ the infant's gut room) | hunger term only × min(1, (store + one tick of synthesis) ÷ one tick of full flow) |
| End of a bout | gland holds less than one tick of flow, or hunger readout < 0.08 | hunger readout < 0.08 only |
| Flaw | currency is "share of the gut room", so a larger infant values a full gland less; with `ledgerDigesta` the room mixes units (capacity in kcal of drupes minus the foregut's non-fibre energy, against milk's own dry matter per kcal) | no fixed cost, so a gland holding one tick of milk is worth a full bout; the 0.25 base is not scaled, so a dry gland still scores 0.25; the act runs on at the synthesis trickle (E1e measured 25–27% of daylight at 1–4 y) |

E1d takes precedence when both are on (candidates.ts).

## 2. Mechanism

### 2.1 `ledgerNurseBout` (one nursing rule; 0 = today)

With 1 (and `energyLedger` 1), the day nurse option and the nurse act follow one rule. A nursing bout is a feeding bout like a tree visit (E1e): it is worth the energy it delivers per unit of time committed to it, as a share of the animal's full intake rate while doing it; the fixed time of the bout is the milk-ejection latency, as the walk is for a tree.

1. **What a bout can deliver.** E = min(S × F ÷ (F − y), room), where S is the milk the mother's glands hold (kcal), F the suckling rate (`ledgerMilkKcalPerMin` × 60, kcal/h), y the mother's synthesis rate (`ledgerMilkYieldCoef` × mass^0.75 ÷ 24, kcal/h; the store plus what is made while it drains), and room what the infant's foregut can take of milk (with `ledgerDigesta`, its free dry-matter capacity ÷ milk's dry matter per kcal; without, gut capacity minus gut energy).
2. **Value.** The whole nurse score (the existing 0.25 + 1.5 × hunger × age terms, unchanged weights) × b, with b = E ÷ (E + F × t0), t0 = `ledgerLetDownS` (54 s). The distance term is unchanged. b is the share of a full flow over the bout, latency included: a dry gland or a full gut gives 0; a gland holding one tick of milk (0.6 kcal) gives 0.22; 10 kcal gives 0.82. No other number.
3. **Execution.** Once at the nipple, the infant drinks nothing for the first t0 of contact (milk ejection), then at the suckling rate (a partial tick at the boundary). After ejection, the bout ends when a tick delivers less than the full flow (the gland or the gut can no longer sustain it), or at the existing hunger end (0.08).
4. **Superseded.** With `ledgerNurseBout` 1, `ledgerNurseByMilk` (E1d) and the nursing term of `ledgerDrive` (E1e's `milkShare`) are not read; with it 0 each keeps its documented meaning. The night rule (E1c `ledgerNightNurse`: drink in the mother's nest while hungry) is unchanged: at night drinking has no time cost, so a fixed time cost has nothing to trade against; it is a separate path, not one of the two routes. The weaning refusals (a dice roll from 3.2 y) are unchanged.
5. **Purity.** The option reads existing ledgers only (b = 1 while either ledger is not yet open, as `milkWorth`).

### 2.2 `ledgerGrowPotential` (growth potential from captive data, paid from the day's surplus; 0 = today)

With 1 (and `energyLedger` 1, `ledgerGrowSurplus` 1):

1. **Potential (input).** An animal below its adult mass can grow at `ledgerGrowFirstYearKg` 2.8 kg per year in its first year (desilva2011: 1.73 kg at birth, about 4.5 kg at 1 y, captive), then `ledgerGrowFemaleKgPerY` 3.4 and `ledgerGrowMaleKgPerY` 3.8 kg per year (curry2023, sanctuary chimpanzees: forest enclosures, mostly natural food), up to the adult mass (`ledgerMassFemaleKg` 31.3, `ledgerMassMaleKg` 39: Gombe medians, kept as the cap and labelled a stylisation, since adult mass is itself partly an outcome of food, pusey2005). The sexes differ in rate, not end age (leighShea1996, curry2023). `ledgerMassMatureFemaleY` and `ledgerMassMatureMaleY` (the stylized knees at 10 and 13 y) are not read. Derived: females reach 31.3 kg at 8.9 y, males 39 kg at 10.1 y; 18.2 (F) and 19.8 kg (M) at 5 y.
2. **Founders.** A founder's ledger opens at the potential curve's mass for its age (well fed, as E1c opened it on the stylized curve); a newborn at birth mass (unchanged).
3. **Growth is paid from the day's surplus.** Two day-long averages per animal (time constant `driveAvgH`, 24 h, existing): energy absorbed (aAvg) and energy spent on everything but growth (mAvg, kcal/h; milk and carrying included, read from the books). Each tick the animal grows at f × the potential, f = clamp((aAvg − mAvg) ÷ G, 0, 1), G the cost rate of growing at the potential (`ledgerGrowthKcalPerG` × kg/y). Growth comes from what remains after maintenance (west2001's allocation), over a day rather than at the instant. This replaces E1c's gate (reserves above the set point). An animal whose day's intake does not cover maintenance stops growing and draws on its reserve; one between maintenance and maintenance + growth grows at the fraction its surplus pays. A reserve deficit does not stop growth while the day's balance covers it (the drive below already asks for the deficit). Opening values: mAvg at the awake resting rate (as E1e's eAvg), aAvg = mAvg + G (a founder or newborn is assumed in balance at its potential; design).
4. **Appetite anticipates growth** (only with `ledgerDrive` 1). The drive's expected spending (E1e: eAvg × the waking time left and the fast) becomes mAvg + G while the animal is below adult mass. A growing animal's requirement is its expenditure plus the energy deposited in growth (fao2004 §4.4: "The sum of energy deposition and TEE is the mean daily energy requirement"). Without this, under the drive any growth rate is a fixed point (the drive asks only for what is being spent), and the opening value (no growth) would hold growth near zero.

Not changed: the growth cost (4.5 kcal/g), the adult mass, mass as state (E1c), the intake rates by size (E1c), everything for adults at adult mass.

## 3. Inputs

| Input | Value | Source | Evidence |
| --- | --- | --- | --- |
| Milk-ejection latency `ledgerLetDownS` | 54 s | gardner2015 (women breastfeeding: first increase in duct diameter 53.6 ± 30.2 s after the start of the feed, 12 mothers, ultrasound) | assumed (human, cross-species) |
| First-year growth potential `ledgerGrowFirstYearKg` | 2.8 kg/y | desilva2011 (Yerkes: 1,733 g at birth; 8.6% of maternal mass at 1 y, n = 9 dyads; about 4.5 kg) | [M] captive |
| Growth potential after the first year | F 3.4, M 3.8 kg/y | curry2023 (sanctuary, piecewise regression: F 3.4 (95% CI 2.8–4.1), M 3.8 (3.4–4.3)) | [M] captive |
| Adult mass (cap) | F 31.3, M 39 kg | pusey2005 (Gombe medians), unchanged | as registered (stylized cap) |
| Growth requirement includes deposition | — | fao2004 §4.3–4.4 (human) | mechanism citation |
| Surplus window | 24 h (`driveAvgH`, existing) | — | design, unchanged value |

Sources added before this registration: gardner2015 (new; docs/research.md E.18 and e-sources §18); fao2004 §4 (an extension of the existing entry). curry2023, desilva2011, leighShea1996, west2001, pusey2005 are listed (§14).

New registry entries: `ledgerNurseBout`, `ledgerGrowPotential` (switches, design, 0); `ledgerLetDownS` (assumed); `ledgerGrowFirstYearKg`, `ledgerGrowFemaleKgPerY`, `ledgerGrowMaleKgPerY` (group needs, [M] captive).

## 4. Targets registered (never set; staging patch `docs/staging/e-targets.patch.json`)

| Row | Field value | Source | Note |
| --- | --- | --- | --- |
| T-INF-1 eating share of observation time by infant age | 0.23% (0–0.5 y), 5.3% (0.5–1), 6.7% (1–1.5), 22% (1.5–2), 32% (3–3.5), 49% (4.5–5 y) | lonsdorf2014 [H] (Gombe, 40 infants); badescu2022 [M] (Ngogo foraging 17% at 6–12 mo, 25% at 1–2 y, 47% at 4–5 y) | held-out |
| T-INF-2 suckling share | 2–3.7% of observation time, no age trend 0–5 y | lonsdorf2014 [H]; badescu2022 (about 3%, 6 mo–4 y) [M] | held-out. Nipple contact, comfort suckling included (badescu2017): a model of nutritive suckling should meet or undershoot it. Measured on daytime follows outside the night nest |
| T-INF-3 weaned age | 4.71 ± 1.04 y (range 2.82–8.01), females 88.5 days earlier | lonsdorf2020 [H] | **encoded** while `weanAgeMinY`/`weanAgeSpanY` set the age (from bray2018's 4.8 y). The milk-share line (above) is reported beside it as an output |
| T-INF-4 mass for age | about 10 kg at 5 y (both sexes); 21 (F) and 24 kg (M) at 10 y; growth slowing at 10 (F) and 13 y (M) | gurvenWalker2006 reading pusey2005 [L]; pusey2005 | held-out, low confidence (a "very rough estimation"); needs years: insufficient in a 90-day window, where only velocities are read (Gombe-derived: about 1.6 kg/y from 0 to 5 y; 2.2 F and 2.8 M kg/y from 5 to 10 y) |
| T-INF-5 nursing bouts | 1.1 ± 0.48 bouts per hour; bouts about 2 min at every age | badescu2016 [H], badescu2022 [M] | held-out; nipple contact (comfort included) |
| T-ENE-5 (existing) | C-peptide depressed for about 6 months, then a net rise through year 2 | emeryThompson2012 [M] | note added: no chimpanzee source shows milk output falling in year 2 (badescu2022: steady from 1 to 4 y), so a recovery must come from the mother's own intake |

## 5. Benchmark

Field profile, development seeds 48 and 7 only, 30-day burn-in + 60 days, `--workers 1`, rules policy, one heavy run at a time.

| Arm | Params |
| --- | --- |
| R | the full stack above |
| T | R + `{"ledgerNurseBout":1,"ledgerGrowPotential":1}` |
| T-N, T-G (attribution, energy diagnosis only) | R + `ledgerNurseBout` 1 alone; R + `ledgerGrowPotential` 1 alone |

- `scripts/energy-diagnose.ts --seeds 48,7 --burn-in 30 --days 60 --term-births`: every female pregnant at day 30 gives birth at once (a scenario for diagnosis, the same in every arm), so newborns and mothers in their first two months are in the window. Without it no mother is in the first 6 months of lactation and T-ENE-5's early phase cannot be read. Added readouts (E1f): a 0–0.5 y bin; daylight ticks in the nurse act; nursing bouts per daylight hour and their length; milk share of intake and its zero crossing; own-food kcal per eating minute; mothers' daily balance (Δ reserves) by infant age; juveniles' velocity by sex.
- `scripts/e-bench.ts --quick --days 60 --workers 1` (no term births): scorecard, band distances, prescription count, viability.

## 6. Predictions (by hand, before any run; against R, measured on the same command)

Arithmetic: growth at the potential costs 34.5 kcal/day in the first year, 41.9 (F) and 46.8 (M) after; R pays 12–27. The infant's foregut holds about 30 kcal of milk per kg of body mass (8 kg: 242 kcal); the gland at most 24 h of synthesis in R (307 kcal); one tick of full flow is 0.63 kcal; F × t0 = 2.25 kcal.

| Quantity | R | T (expected) | Field |
| --- | --- | --- | --- |
| Growth velocity, 0–1 y | 2.2 kg/y | 2.1–2.8 (≥ 0.75 of the potential) | captive 2.8; Gombe about 1.6 (0–5 y) |
| Growth velocity, 1–4 y | 0.96–1.45 | 2.6–3.8 (≥ 0.75 of the potential, F 3.4, M 3.8): **miss, too fast**. Named term if so: the model's infants are not food limited (they need 3–12% of daylight to eat what milk does not cover) | about 1.6 (Gombe, [L]) |
| Indicative mass at 5 y (velocities integrated from 1.8 kg) | about 8.6 kg | 14–19 kg | about 10 kg |
| Juveniles 5–12 y below adult mass: velocity | — | ≥ 0.75 of the potential; adult mass reached by about 9 (F) and 10–11 y (M): knees 1–3 y early | 2.2 F, 2.8 M kg/y (5–10 y); knees 10 and 13 y |
| Own food, infants 1–2 / 2–3 / 3–4 y (kcal/day) | 82 / 191 / 327 | +15 to +35 each | — |
| Daylight eating share, 1–2 / 2–3 / 3–4 y | 3.4 / 7.3 / 10.1% | +0.5 to +2 points each: **miss** | 6.7–22 / 22–32 / 32–49% |
| Own-food kcal per eating minute, 2–4 y | (measure) | about 3–4.5 | implied by the field's eating time, the model's need and milk: about 0.8–1.2. Named term for the eating miss: intake per minute (size-scaled adult rates, design exponent 0.75) is 3–4 × what the field's eating time implies, or the milk yield (human-scaled, assumed) is too generous |
| Milk, infants ≥ 1 y | 300–307 kcal/day | 300–307 (the yield) | — |
| Daylight ticks in the nurse act, 1–4 y | (measure) | 6–14%; bouts 1–3 per daylight hour, 2–5 min each, latency included | suckling 2–3.7%; 1.1 bouts/h of about 2 min |
| Daylight ticks with milk drunk, 1–4 y (nest included) | 13.5–14.8% | within ±4 points of R (the twilight nest trickle of E1c is unchanged) | — |
| Milk share of intake, zero crossing (weaning readout) | about 6.6 y | 5.5–7 y (own food a little higher) | weaned 4.71 ± 1.04 y; isotopic end 4–4.5 y |
| Mothers' milk cost by infant age | 338 / 383 / 384 / 384 | unchanged within 20 kcal | — |
| Mothers' reserves and daily balance, infant 0–0.5 y (term births) against 1–2 y | (measure) | balance at 0–0.5 y **not** below that at 1–2 y, reserves higher: a newborn drinks about 150–200 kcal/day, below the yield, so its mother pays less early. **T-ENE-5's early depression: miss in direction**, in R and T alike | depressed for 6 months |
| Year-2 recovery: mothers' balance at 1–2 y against 0.5–1 y | (measure) | no rise: milk stays at the yield from about 1 y and the mother's access to food does not change with infant age. **Miss**, in R and T alike | net rise through year 2 |
| Infant reserves 0.5–2 y, 2–5 y | about 0 | about 0 (±0.02) | — |
| Juveniles' eating minutes | 165 | +5 to +15% | — |
| Adults (T-ACT, T-RNG), lactating females' reserves | — | within noise of R | — |
| Viability | no deaths | the same | — |

Attribution: T-N should carry the nursing columns and leave growth as in R; T-G should carry growth and own food and leave nursing as in R.

## 7. Kill criterion

Each switch stays a candidate (provisional keep, off by default) unless, in T (or its own attribution arm) against R:

- K1: any starvation death, or two or more deaths more than R;
- K2: infants 0.5–2 y or 2–5 y (by age at day 30, both seeds) below −0.05 of the store at day 90, or falling by more than 0.03 over the window; or newborns below −0.05;
- K3: lactating females' reserves more than 0.02 below R;
- K4: juveniles 5–12 y below −0.05 of the store at day 90;
- K5 (`ledgerNurseBout`): daylight ticks in the nurse act at 1–4 y at or above 20% (a trickle);
- K6 (`ledgerGrowPotential`): any infant or juvenile class whose growth velocity is negative or whose reserves fall steadily (more than 0.03 over the window) while R's do not;
- K7: held-out band distance on rows scored in both arms above R's by more than 0.8 (E0's noise floor).

The expected target misses (growth too fast against Gombe, eating share, suckling share, T-ENE-5) are findings, not kill grounds, and no input is moved for them.

## 8. Iterations

At most three, each a change of mechanism from first principles, logged here before its run. No input is moved toward a target.

### Iteration 1 (the registered mechanism): result

Runs: seeds 48 and 7, 30-day burn-in + 60 days, `--term-births` for the energy diagnosis (6 births at day 30 in R and T), e-bench without. Outputs in `artifacts/validation/e1f/` (`ref-tb-diag.txt`, `it1-tb-diag.txt`, `tn-tb-diag.txt`, `tg-tb-diag.txt`, `ref.md`, `it1.md`; not tracked).

| Infants, by age | R: 0–0.5 / 0.5–1 / 1–2 / 2–3 / 3–4 y | T: same ages | Field |
| --- | --- | --- | --- |
| Growth velocity (kg/y) | 0.15 / 2.14 / 1.53 / 0.97 / 0.84 | 1.15 / 1.45 / 1.69 / 1.70 / 1.71 | captive 2.8 (year 1), 3.4–3.8; Gombe about 1.6 |
| Growth paid (kcal/day; potential 34.5 / 34.5 / 42–47) | 2 / 26 / 22 / 11 / 10 | 14 / 17 / 21 / 21 / 21 | — |
| Milk, day + night (kcal/day) | 132 + 5 / 204 + 65 / 178 + 129 / 157 + 151 / 113 + 160 | 136 + 20 / 199 + 54 / 177 + 128 / 160 + 147 / 158 + 149 | — |
| Own food (kcal/day) | 0 / 0 / 84 / 183 / 369 | 0 / 0 / 95 / 245 / 412 | — |
| Daylight eating | 0 / 0 / 3.4 / 7.0 / 11.6% | 0 / 0 / 3.8 / 8.6 / 11.6% | 0.2 / 5.3 / 6.7–22 / 22–30 / 32–36% (T-INF-1) |
| Nurse act, % of daylight | 6.2 / 9.3 / 8.1 / 6.8 / 4.2 | 8.0 / 10.9 / 10.0 / 9.5 / 9.0 | 2–3.7% (T-INF-2) |
| Daylight ticks with milk drunk (nest twilight included) | 7.1 / 10.8 / 14.7 / 15.0 / 12.5 | 7.5 / 10.8 / 15.1 / 17.1 / 16.7 | — |
| Bouts per daylight hour; mean bout (min) | 0.76 / 0.86 / 0.64 / 0.60 / 0.34; 4.9–7.7 | 0.96 / 0.98 / 1.06 / 1.38 / 1.18; 4.1–6.7 | 1.1 ± 0.48; about 2 min (T-INF-5) |
| Own food per eating minute (kcal) | 3.3–4.2 | 3.3–4.7 | about 0.8–1.2 implied (§6) |
| Reserves ÷ store (newborns: Δ over the window) | −0.021 (Δ −0.009) / +0.005 / +0.002 / −0.002 / −0.005 | −0.004 (Δ +0.002) / +0.008 / +0.001 / −0.008 / −0.007 | — |
| Milk share of intake; zero crossing | 0.78 / 0.63 / 0.43 (1–4 y); 5.9 y | 0.76 / 0.56 / 0.43; 6.0 y | weaned 4.71 ± 1.04 y (T-INF-3, encoded) |

| Mothers, by youngest infant's age | R | T | Field (T-ENE-5) |
| --- | --- | --- | --- |
| Milk cost (kcal/day) | 172 / 336 / 383 / 384 / 341 | 195 / 317 / 381 / 384 / 384 | — |
| Reserves ÷ store | −0.021 / −0.044 / −0.044 / −0.074 / −0.059 | −0.013 / −0.036 / −0.044 / −0.071 / −0.066 | — |
| Daily balance (kcal/day) | −13 / −17 / −30 / −51 / −2 | −20 / −12 / −16 / −54 / −20 | depressed 0–6 months, then a net rise through year 2 |

Others (T against R): lactating females −0.044 against −0.046 of the store, 208 against 210 eating minutes; juveniles 5–12 y eat 167 min (168), reserves −0.010 (−0.012), growth 17 kcal/day (3), velocity 1.62 kg/y for females of 4–8 y (0.08) and 1.78 for males of 8–12 y (0.55), against Gombe-derived 2.2 and 2.8. Adults unchanged. Births 6 in both; deaths 0 (R: 1 adult male, illness); no starvation.

e-bench (`--quick --days 60`, no term births; `it1.md` against `ref.md`): fitted 4.914 → 4.654 (on the 18 rows scored in both +0.407, carried by the hunting rows T-HUN-2 +0.55 and T-HUN-7 +0.13 and T-SOC-9 +0.37: rare events, inside E0's noise floor); held-out 4.152 → 4.329 (+0.177 on the 17 rows in both); prescription count 139 → 139; viability pass (0 births, 0 deaths).

Attribution (energy diagnosis): T-G (growth switch alone) reproduces T's growth columns (1.18 / 1.43 / 1.70 / 1.84 / 1.77 kg/y) and R's nursing columns (nurse act 4.7–8.7%, 0.4–0.8 bouts/h); T-N (nursing switch alone) reproduces T's nursing columns (7.1–11.6%, 0.9–1.2 bouts/h) and R's growth (0.2–2.1 kg/y). T-N had a respiratory outbreak in one seed (5 deaths, two of them lactating females; two newborns orphaned fell to −0.17 and −0.26): outbreaks are stochastic and T-N differs from R in its whole trajectory, so this is not attributed to the switch.

**Kill criterion.** K1 no deaths; K2 infants and newborns within ±0.02 of the store, no fall; K3 lactating −0.044 against −0.046; K4 juveniles −0.010; K5 nurse act 9.0–10.0% at 1–4 y (< 20%); K6 every velocity positive, no steady fall; K7 held-out +0.18 on shared rows (< 0.8). Both switches pass.

**Against the predictions (§6).**
- Nursing: more and shorter bouts (0.9–1.4 per daylight hour, inside T-INF-5's band, against 0.3–0.9 in R; 4–7 min against the field's 2), as predicted. The nurse act takes 8–11% of daylight (predicted 6–14%; R 4–9%; field 2–3.7%): the bout rule ends a bout when the gland runs short and the next one starts as soon as a few minutes of synthesis are worth the latency, so the infant sits at the nipple more often. Milk ticks within ±4 points of R except 3–4 y (+4.2). Named term for the suckling-time miss, unchanged: the suckling rate (2.5 kcal/min, assumed): at 2–3% of daylight the model's 160–180 kcal of daytime milk would need about 6–8 kcal/min.
- **Growth: miss of the prediction.** Registered ≥ 0.75 of the potential (2.6–3.8 kg/y at 1–4 y); measured 0.41–0.50 of it (1.15–1.71 kg/y). The number happens to sit at the Gombe-derived 1.6 kg/y, which is not evidence for the mechanism: the cause is a flaw of the rule. Growth takes the whole day's surplus, so any shortfall of intake below maintenance + growth is absorbed by growth and never reaches the reserves; the drive's need reads the reserves, so the infant is never hungrier for having grown less. Infants stay at the hunger at which their options (the ground forage option, 0.5 × hunger − 0.05; trees only beside a foraging mother; the follow option at 0.6 while carried) produce about maintenance + 0.45 × growth, and growth velocity reports those design weights, not food. Infants of 1–4 y spend 4–12% of daylight eating; they are not short of time or food.
- Own food rose by 11–62 kcal/day (predicted +15 to +35), eating share by 0–1.6 points (predicted +0.5 to +2), own food per eating minute 3.3–4.7 kcal (predicted 3–4.5).
- Juveniles: 0.45–0.5 of the potential (predicted ≥ 0.75), the same cause; eating minutes unchanged (predicted +5–15%).
- Milk at the yield from 1 y; weaning readout 6.0 y (predicted 5.5–7): as predicted.
- **T-ENE-5: miss, as registered, in R and T alike.** Mothers of newborns pay about half the later milk cost (172–195 against 381–384 kcal/day: a newborn drinks 137–156 kcal/day, half the yield). Their daily balance (−13 to −20 kcal/day) is no lower than at 1–2 y (−16 to −30) and there is no rise through year 2 (−12 to −17 at 0.5–1 y, −16 to −30 at 1–2 y). Every lactating class runs a small negative balance, reserves fall with infant age (−0.013 → −0.07), and the lactating trajectory steepens in the last fortnight in both arms (−0.038 → −0.064). The drive raises intake with expenditure, but nothing in the mother's access to food changes with her infant's age, so no recovery appears.

### Iteration 2 (logged before its run): growth is an obligatory expense, limited by condition

**Flaw (iteration 1).** Growth absorbed the whole intake shortfall, so it never reached the reserves or the appetite, and growth velocity reported the dependents' option weights.

**Change** (`ledgerGrowPotential`, nothing else):
- An animal below its adult mass grows at f × the captive potential, f = min(1, condition ÷ `condGood`): C8's existing rule for when growth becomes limited (the growth record already follows it). Under the ledger condition is 0.7 × (1 + reserves ÷ store), so growth runs at the potential until the reserves fall to −29% of the store, then slows in proportion to condition.
- Growth is charged as spending whatever the day's intake: a shortfall now draws on the reserves, and the drive's need (which reads the reserves and, with this switch, expects other spending plus growth at the potential) answers it with hunger.
- The day-long mean of absorbed energy is dropped (aAvg); the mean of other spending (mAvg) stays for the drive.
- Physiology: growth proceeds at the cost of fat stores under a mild deficit and slows only when condition falls (stunting under sustained deficit; catch-up when food returns, hamadaUdono2002). No new number: `condGood` (0.5, C8 design) is reused.

**Expected (against iteration 1):**
- growth velocity ≥ 0.85 of the potential at every immature age (newborns 2.4–2.8, infants F 2.9–3.4 and M 3.2–3.8, juveniles likewise): **too fast against Gombe** (about 1.6 kg/y), unless infants cannot hold condition;
- infants' and juveniles' reserves lower than in iteration 1, by 0.01–0.05 of the store (the drive needs a deficit to raise intake by 20–30 kcal/day);
- own food +15 to +35 kcal/day at 1–4 y, eating share +0.5 to +2 points; juveniles' eating minutes +3–10%;
- newborns drink 165–185 kcal/day; their mothers' milk cost rises to 210–235; later ages unchanged; T-ENE-5 still a miss;
- nursing columns unchanged (the nursing switch is not touched).

**Kill criterion:** §7 unchanged. A K2 or K4 failure (infants or juveniles below −0.05) would mean the model's dependents cannot pay for growth at the potential through their options: a finding about the dependents' choice weights, and iteration 2 would be null.

## 9. Results

(to be filled)
