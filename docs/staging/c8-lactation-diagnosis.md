# C8 lactation starvation: diagnosis plan and fix rules

Pre-registered 29 September 2026, before any diagnostic run, following the integrator's ruling (option c). Staging only.

## Problem (seen before this plan)

- On `main` before C8 (field profile, seed 48, 1 year, truth): lactating females had median hunger 1.00 (p10 0.84), non-lactating adult females 0.72–0.78. Nothing died of it, because health bottomed out near 0.7 through the old −0.3 hunger term.
- C8 adds the pre-registered health term −max(0, condLow − cond) / condLow (early-life-prereg §2.6). Lactating females then sit at condition 0.24 and health 0.64 (p10 0.19). The field population collapses (40-year development runs, seeds 48 and 7: 34 births, 126 deaths). The compressed profile stays stable.
- The pre-run condition check pooled juveniles only (median 0.60), as pre-registered, so it could not see this.

## Diagnosis (development seeds 48, 7, 21 only; field profile; truth reads)

Runs: 30-day burn-in, then 30 days measured. Adult females (15 y or more) are split into lactating and not lactating.

**Energy decomposition, per class:**
- daylight time shares: feeding on fruit, feeding on fallback, travel and follow, rest and nest, social, other;
- hunger reduction per feeding hour, on fruit and on fallback;
- daily ground distance;
- the share of daylight in joint trips (a travel to a tree with a leader, C7c) and in patrols;
- hunger gain per hour as coded (awake rate × body factor, plus the lactation or pregnancy term);
- mean daylight hunger and condition.

**Configurations:**
- all on (merged `main` plus C8);
- each ablation set of `data/proof-ablations.json` alone: C7a (the C6b knob values; stands in for the pre-C7a behaviour), C7c, patrols, C10;
- C8's own mechanisms off (epidemics, snares, guardian levers), to confirm that C8 turns hunger into deaths but does not cause the hunger.

**Attribution rule (design thresholds):**
- A stage is implicated if its ablation alone lowers lactating females' mean daylight hunger by 0.1 or more, or raises their median condition above condLow (0.3).
- If several stages are implicated, the largest effect is addressed first.
- If none is, the cause lies in the older energy budget.

**Lactation cost:**
- As coded: +0.012 hunger/h on top of the awake rate of 0.06/h × body factor 1 (+20%). Nursing drains the mother's energy (0.02/h), not her hunger.
- It is compared with published energy costs of lactation in chimpanzees or other great apes, and with Kibale energy-balance data (read in full, or marked as abstract-only). The sources are added to `docs/research.md`.

## Fix rules (fixed now)

**If a stage is implicated:**
- Its mechanism gets a general, state-dependent amendment, never a lactation-specific rule, which would encode T-RNG-5 (lactating vs male day range). For example: the value of joining or continuing a trip or party follow includes the individual's own hunger and its feeding opportunity.
- The amendment has its own switch and is labelled "<stage> amendment (C8)".
- Its form is fixed from the diagnosis before its effect is checked. Its values are design: never tuned to population size or to a demography target.

**Lactation cost:** if the coded cost is above what the literature supports, it is corrected to the sourced value. That is a logged model-input correction, not tuning.

**Unchanged:** condLow, condGood, the pre-registered health term, and the lactation term unless the literature check says otherwise.

**Checks after the fix (development, labelled as such):**
- the decomposition again;
- population over 10 years (field, seeds 48, 7, 21);
- the fitted demography rows from 40-year runs on the development seeds.

**The pre-run condition check** (`scripts/c8-condition-check.ts`) is extended to adult females by reproductive state (lactating, pregnant, other). The original check pooled juveniles only.

## Diagnosis results (development; seeds 48, 7, 21; days 30–60; daylight means)

| Configuration | Lactating hunger | Lactating condition | Other adult females' hunger |
| --- | --- | --- | --- |
| All on | 0.67 | 0.39 | 0.48 |
| C7a off | 0.52 | 0.49 | 0.40 |
| C7c off | 0.64 | 0.41 | 0.45 |
| Patrols off | 0.66 | 0.39 | 0.46 |
| C10 off | 0.66 | 0.39 | 0.47 |
| C8's mechanisms off | 0.63 | 0.40 | 0.45 |

**Energy decomposition (all on).** Lactating vs other adult females vs males:
- Feeding share of daylight: 47.7% vs 37.4% vs 32.8%. Lactating females feed the most, but 16.4% of their daylight goes to fallback foods, against 10.2% for other females and 0.2% for males.
- Intake per feeding hour is identical across classes: fruit 0.236 hunger/h, fallback 0.129.
- Travel: 9.5% vs 20% of daylight. Ground distance: 1.7 vs 3.1 km per 12 daylight hours.
- Joint trips: 3.1% vs 6.2% of daylight. Patrols: 0.
- Coded hunger gain: 0.072 vs 0.060 per awake hour. The lactation term (+0.012/h) also runs through the night, where it adds 55% to the sleep rate.
- Mothers do not travel more and are not dragged on trips: C7c is not the cause.

**Attribution.** By the rule, C7a is implicated (−0.15 hunger); the other stages move hunger by 0.03 or less. C7a's knobs one at a time:
- fruitValueRef back to 0.45: −0.10;
- patchesPerHa back to 18: −0.06;
- memCropBelief 0: +0.12;
- the rest: within ±0.05.

The pre-C7a female core-area cost amplifies the effect. With it removed (not a C7a knob; a diagnostic only), lactating hunger falls to 0.46: fallback use drops from 16.4% to 0.2% and travel rises to 18.6%. So under C7a's sparser, lower-valued crowns, the state-independent core cost (`coreCostLactating` 0.6, `coreCostFemale`) holds hungry females on fallback foods inside their cores, at half the fruit intake rate.

**Lactation cost vs literature.**
- emeryThompson2012 (Kanyawara, 17 mothers, urinary C-peptide; abstract): energy balance is depressed for 6 months postpartum, then shows a net increase through the second year, and is lower in poorer foraging habitats.
- badescu2022 (Ngogo, 72 immatures; abstract): nursing is highest at 6 months or younger, with no significant change from 6 months to 5 years.
- Neither gives a magnitude. So the coded +20% (of the awake rate) cannot be shown to exceed what the literature supports, and it stays unchanged. The time course (highest early, recovery after 6 months) is noted as a stylization of the constant term.

## Amendment (fixed before its effect is checked)

**C7a amendment (C8): the female core-area cost relaxes with hunger.**
- In `candidates.ts`, the core-cost weight of an adult female is multiplied by (1 − `coreHungerRelief` × hunger).
- `coreHungerRelief` = 1 (design: full relief at hunger 1, none when sated). 0 restores C7a exactly.
- The rule is general: every adult female with a core cost, whatever her reproductive state. It reads only hunger. The larger lactating weight is the pre-existing [H] design ("adult females, especially mothers, forage mostly within individual core areas").
- It is labelled a C7a amendment because C7a's food landscape is what makes the core cost bind. The cost itself predates C7a.
- It will move T-RNG-5 (held out, lactating vs male day range), because hungry mothers range farther. The rule was designed from the energy diagnosis, not from T-RNG-5, and T-RNG-5 is reported with that caveat.
- The value is not tuned.
- Checks: the decomposition again; population over 10 years (field, seeds 48, 7, 21); fitted demography rows over 40 years (development seeds).
- Logged as a C7a amendment (protocolLog class "C7a amendment") in `docs/staging/c8-targets.patch.json`. Its switch is in the C7a set of `data/proof-ablations.json`, so the combined proof attributes it to the stage it amends.

## Checks after the amendment (development)

**Days 30–60, seeds 48, 7, 21.**
- Lactating hunger 0.67 → 0.55, condition 0.39 → 0.47.
- Fallback use 16.4% → 3.2%; travel 9.5% → 14.5% of daylight; 1.7 → 2.3 km per 12 daylight hours.
- With `coreHungerRelief` 0, the numbers are identical to those before the amendment.

**Days 180–545, seeds 48, 7, 21 (amended).** Lactating hunger and condition by the youngest infant's age:

| Youngest infant | Hunger | Condition |
| --- | --- | --- |
| Under 0.5 y | 0.56 | 0.40 |
| 0.5–2 y | 0.63 | 0.33 |
| 2 y or more | 0.61 | 0.34 |

- Other adult females: hunger 0.46, condition 0.50.
- On top of the amendment, the stage ablations now move lactating hunger by 0.05 or less: C7a off 0.55–0.58, C7c off 0.57–0.61, C8's mechanisms off 0.59–0.65. No stage is implicated.
- The residual deficit comes from the older energy budget. The lactation term runs through the night and adds about 29% to the daily hunger budget, and mothers' deficit grows with infant age. That is the reverse of emeryThompson2012's recovery during the second year.
- No source gives a magnitude, so the term stays unchanged (not tuned, per the ruling).

**10-year truth runs (seeds 48, 7, 21):**
- living 49 → 41, 67 and 49; births 25 / 41 / 35; deaths 33 / 23 / 35.
- Before the amendment the field population collapsed (seed 48: 37 living by year 2).
- Lactating females still reach median hunger 0.95–1.00 and condition 0.26–0.30 in lean periods, and seed 48 still loses 11 females to starvation over 10 years.

**40-year run with the amendment (development; pre-C13 code, branch 24dc7b2; field, natural aging, `--demography`, seeds 48, 7, 21, 5, 11; `artifacts/validation/c8/dev-40y-amended.json`):**
- Living after 40 years, from 49: 13, 19, 29, 5, 10. Births 66 / 79 / 79 / 58 / 52, deaths 102 / 109 / 99 / 100 / 91. The populations decline in every seed.
- Fitted rows: T-DEM-1 0.25 (inconclusive, would fail); T-DEM-2 fail on females (e15 12.2 y; males 20.2 y, in band); T-DEM-5 0.107 pass; T-DEM-6 attack 0.76 pass; T-DEM-9 0.148 inconclusive (would pass); T-DEM-10 0.215 inconclusive (would pass); T-DEM-11 14.8 pass; T-DEM-12 5.5 pass.
- Compared with the run before the amendment (seeds 48 and 7: q1 0.61, female e15 2.3 y), the amendment helps. Adult-female mortality still drives the decline, consistent with the residual lactation deficit above.
- The C13 rules policy and intake valuation (merged after this run) change the food choices this deficit depends on. The post-C13 check follows.

**Post-C13 check (development; C8 merged with main b4cca94, branch a395708; field, natural aging, 10 years, seeds 48, 7, 21; truth reads).**
- Paired arms on the same code. "On" is the merged default. "Off" is `rgOn` 0 and `intakeValue` 0, which is hash-identical to the pre-C13 C8 model (tests/sim-rg.test.ts).
- Script: `artifacts/validation/c8/sanity/c8-sanity.ts`.
  - Adult females (15 y or older) are sampled hourly in daylight.
  - Lean days are the lowest quartile of the daily fruit index.
  - Adult-female mortality is deaths at 15 y or older per female-year.
  - The script that produced the earlier "0.95–1.00 in lean periods" figure was lost with /tmp at a reboot, so only the paired arms compare like with like.

| Seed | Arm | Living, year 0 → 10 | Births / deaths | Growth per year | Adult-female mortality per year (starvation deaths) | Lactating median hunger (lean days) | Other adult females (lean days) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | off | 49 → 36 | 35 / 48 = 0.73 | −3.1% | 0.096 (10) | 0.67 (0.74) | 0.61 (0.69) |
| 48 | on | 49 → 65 | 37 / 21 = 1.76 | +2.8% | 0.025 (0) | 0.63 (0.71) | 0.42 (0.52) |
| 7 | off | 49 → 42 | 31 / 38 = 0.82 | −1.5% | 0.047 (2) | 0.64 (0.67) | 0.51 (0.50) |
| 7 | on | 49 → 68 | 41 / 22 = 1.86 | +3.3% | 0.006 (0) | 0.64 (0.67) | 0.44 (0.45) |
| 21 | off | 49 → 53 | 36 / 32 = 1.12 | +0.8% | 0.045 (1) | 0.63 (0.68) | 0.52 (0.56) |
| 21 | on | 49 → 74 | 42 / 17 = 2.47 | +4.1% | 0.000 (0) | 0.65 (0.70) | 0.45 (0.52) |

- **Pooled, on:** births / deaths 120 / 60. Adult-female mortality 5 in 522 female-years (0.010 per year), no starvation deaths.
- **Pooled, off:** births / deaths 102 / 118. Adult-female mortality 26 in 440 female-years (0.059 per year), 13 starvation deaths.
- **What C13 changes:** the starvation tail disappears and non-lactating females are fed better.
- **What it does not change:** the lactating median hunger. That median is still set by the energy budget (the lactation term, about +0.29 hunger per day), as diagnosed above.
- **New issue:** with starvation gone, adult-female mortality in these windows is below the life-table level (about 0.03 per year for e15 ≈ 35).
  - Two reasons: epidemic deaths are lumpy, and the non-epidemic adult-female baseline is small because the floor binds at 30–45 y.
  - Populations grow 3–4% per year and would reach the cap of 120 in about 25 years.
  - A 40-year check is needed before T-DEM-2 or T-DEM-10 can be read on the merged model.
- *Correction:* the "life-table level about 0.03 per year" above is 1/e15, which holds only for a stationary age structure. The age-standardized check below replaces it.

**Adult-female deaths by age band against expectation (C13 on, same runs re-counted; `artifacts/validation/c8/sanity/c8-sanity2.ts`, `x*-on.json`).**
- 522 adult-female-years; 5 deaths, 4 of them in epidemics.
- Expected deaths:
  - 7.2 from wood2017's all-cause hazards at the observed ages (0.014 per year), P(≤ 5) = 0.28;
  - 8.0 from the model's own expectation (baseline 2.6 + epidemics 5.4), P(≤ 5) = 0.19.
- The observed rate matches expectation within Poisson noise.
- By band (female-years, deaths, all-cause expectation):
  - 15–30: 261, 3, 2.9;
  - 30–45: 213, 1, 3.1;
  - 45+: 48, 1, 1.2.
- **Why the floor binds at 30–47 y.** The expected epidemic hazard there is 0.0154 per year (0.1 arrivals × 0.62 attack × about 0.25 fatality at odds ratio 3.86). That exceeds wood2017's all-cause 0.011–0.017, so the baseline sits at the 20% floor.
  - As a result, the model's expected mortality at those ages is about 11% above the life table.
  - The analytic e15 is 34.3 y, inside the band.
  - The likely source mismatch: wood2017 (Ngogo 1995–2016) largely predates Ngogo's 2016–17 outbreak, while the arrival rate and fatality come from Kanyawara, Gombe and Ngogo 2017.

## The food-valuation clue (Jev free-arms test; integrator's note)

- On `main` without the amendment (seeds 6501–6905, field, 5 days after a 180-day burn-in), median hunger was:
  - rules: lactating 0.89, all adults 0.64;
  - U, a utility valuing remembered fruit trips at intake rate minus walking cost: lactating 0.70, all adults 0.39.
- So part of the starvation comes from how the rules value food: animals eat fallback foods in place instead of walking to remembered fruit.
- The core-cost amendment is a valuation fix of that kind, and it is state-dependent: after it, lactating females spend 3–8% of daylight on fallback (was 16%).
- Converting all of that time to fruit would recover at most ~0.07 hunger/day (5% × 12.5 h × (0.237 − 0.129)). The lactation term adds 0.29/day.
- Even under U, lactating females stayed 0.31 above all adults. That also points to the energy budget for the residual.
- Two more candidates were considered and not adopted in C8:
  - a rate-consistent fallback value, which would re-tune C5a's fitted activity budget (`fallbackForageW` is labelled tuned);
  - C7b's `tripRateValue`, which failed its own direction check: it shortened days and moved animals onto ground foods.
- Open for the integrator.
