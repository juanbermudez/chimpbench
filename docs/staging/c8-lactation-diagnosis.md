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
