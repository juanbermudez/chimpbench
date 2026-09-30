# C8c: lactation-cost taper (design; not implemented)

Status: design for the integrator, 30 September 2026. Nothing here is run or coded. Development seeds only (48, 7, 21, 5, 11).

## Problem

- `hungerLactationPerH` adds 0.012 hunger per hour (+0.29 per day, about +20% of the awake rate, also at night) for the whole lactation, which lasts until the youngest offspring is weaned at 4.1–5.2 y.
- The magnitude has no source (design). The constant shape contradicts the evidence (docs/research.md, "Lactation energetics"):
  - emeryThompson2012 [M]: nursing mothers' energy balance (urinary C-peptide) is depressed for about 6 months postpartum, then shows a net gain through the second year; cycling resumes only after sustained gain.
  - badescu2022 [M]: nursing time stays level from 6 months to 5 years, while infants forage more with age.
- In the model, mothers' deficit grows with infant age (lactating hunger 0.56 → 0.63 from under 0.5 y to 0.5–2 y; c8-lactation-diagnosis.md), which is the reverse of emeryThompson2012.
- After C13 no female starves, but lactating lean-day median hunger stays at 0.67–0.71, against 0.45–0.52 for other adult females.

## Rule (fixed now, before any run)

- `hunger += hungerLactationPerH × taper(a)`, where a is the age of the youngest unweaned offspring:
  - taper = 1 for a < `lactTaperStartY`;
  - it falls linearly to `lactTaperFloor` at `lactTaperEndY`;
  - then stays at `lactTaperFloor` until weaning.
- `lactTaperStartY` = 0.5 y and `lactTaperEndY` = 2 y, both [M] emeryThompson2012 (the knots of its C-peptide time course).
- The peak stays at 0.012/h (design, unchanged).
- `lactTaperFloor` = 0.3 is design and not tuned. No source gives the late-lactation cost; the value only keeps a residual cost while nursing continues (badescu2022).
- Switch `lactTaper`: 0 restores today's constant cost exactly (hash-identical, tested).
- The rule reads only the youngest dependent's age and draws no RNG. It is a model-input correction of an existing lactation-specific stylization toward the sourced shape, not a new behavioural rule.
- Time shares with today's weaning ages: about 11% of lactation below 0.5 y, 32% at 0.5–2 y, 57% from 2 y to weaning.

## Rows it touches

- **Infants: no direct path.** Nursing lowers the infant's hunger at a fixed rate and never reads the mother's condition (execution.ts `nurse`). Birth condition comes from pregnancy (`gestCond`), which the taper leaves alone.
- **Held-out rows, direct:** T-RNG-5 and T-ACT-5, lactating females' day range and activity. Mothers of older infants will be less hungry and are expected to range less. Values of both rows have been seen in earlier scorecards (C5a–C7a).
- **Held-out rows, indirect:** T-DEM-3 (female survival through health) and T-DEM-13 (maternal condition at resumption enters conception through `conditionFertility`).
- **Sealed rows:** T-DEM-22 (encoded; lactation-window neighbour pressure), through maternal survival and behaviour. It stays sealed and is never computed. The expected direction (a weaker lactation-window effect) favours its encoded pattern, which is already counted apart. T-DEM-21 (pregnancy window) is untouched, because pregnancy cost is a separate term. T-DEM-19 and -20 are untouched, because offspring condition does not read the mother's lactation cost.
- **Fitted rows:** T-DEM-1, -2, -10 and -12.

## How the pre-registration stays clean

1. Form, knots and floor are fixed here from energetics sources only, before any run. They are never set by looking at a ranging, activity or held-out value.
2. Development reads only the fitted rows (T-DEM-1, -2, -10, -12) and truth energetics (lactating hunger and condition by infant age).
3. T-RNG-5, T-ACT-5, T-DEM-3 and T-DEM-13 are labelled "model revised post-freeze" in protocolLog. They are scored only on the fresh C8 set B, with the caveat that the change is lactation-specific and was made after T-RNG-5 and T-ACT-5 values were seen.
4. Sealed rows stay sealed; the T-DEM-22 direction note goes in the log.

## Predictions (development, 10 field years, seeds 48, 7, 21, paired `lactTaper` 1 vs 0 on the same code)

| Quantity | Now (`lactTaper` 0) | Predicted (`lactTaper` 1) | Confidence |
| --- | --- | --- | --- |
| Lactating lean-day median hunger | 0.67–0.71 | 0.58–0.64 | low–moderate |
| Lactating median condition | ~0.30 | ~0.35–0.42 | low |
| Female e15 (T-DEM-2) | analytic 34.3 y | +0 to +1 y, inside 31–39 | moderate |
| Male e15 | — | unchanged | high |
| T-DEM-1 (q1) | — | unchanged beyond noise (no infant path) | moderate |
| T-DEM-12 (interval after a surviving infant) | — | 0.1–0.3 y shorter (higher `conditionFertility` at resumption) | low |
| T-DEM-10 | — | slightly higher | low |
| Viability | births / deaths 2.0, +2.8 to +4.1% per year | births / deaths up slightly; growth +0.2 to +0.5% per year; the cap is reached sooner | low |

## Related stylization (not changed here)

- Cycling resumes after a fixed amenorrhea (`amenorrheaMinY` 3.5 + up to 1 y), not after energy gain as emeryThompson2012 reports. That is a separate item.
