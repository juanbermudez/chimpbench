# Realism roadmap

Objectives for bringing MGOGO's chimpanzee behavior close to field reality, and how each one will be proven. The design details and quantitative targets live in `docs/realism-design.md` (written by the research phase). Evidence tags follow `docs/research.md`: [H] high, [M] moderate, [L] low or assumed.

## Principle

Most behaviors already exist. The biggest problems are **scale** and **calibration method**. Behavior rates are tuned by hand against scattered field numbers, on a map about 50–100× too small in area. The fix is methodological:

- measure the simulation the way field researchers measure chimpanzees
- calibrate against many field patterns at once
- validate on patterns that were never used for tuning

## Objectives

| # | Objective | Why | Proof of success |
| --- | --- | --- | --- |
| O1 | **Virtual field observer.** Focal follows and 15-minute party scans, computed the way field studies sample (Altmann 1974 [H]). | Field numbers come from sampled observation. Today we compare them with perfect-knowledge counts. | Every metric in `docs/simulation.md` §18 is also produced by the observer, with its sampling protocol stated. |
| O2 | **Parameter registry.** A machine-readable file listing every behavioral constant with its value, plausible range, source population and evidence level. | We can't calibrate what isn't enumerated with an uncertainty range. | Registry covers all constants in the §17 parameter table. The sim reads from it; tests prove defaults are unchanged. |
| O3 | **Logical vs visual scale.** Simulate ranging, sight and hearing in real metres (ranges of km², pant-hoots audible ~1 km [M]) and render a compressed view. | The compressed map inflates encounters (35 vs ~8 per community-year) and daily travel (~2 vs ~0.4 range diameters). | Encounter rate, day range and party metrics move into their field ranges. Rendering stays legible at 60 fps. |
| O4 | **Living territories.** Range maps built from where each community actually spends time, with cores, peripheries and contested overlaps. Range size responds to the number of males [M]. Territory expands after lethal wins (Ngogo +22% after 18 killings in 10 years; Mitani, Watts & Amsler 2010 [H]). | Territories are static circles today. | Range size and core/periphery use match targets. An Ngogo-like expansion scenario reproduces qualitatively, as a held-out test. |
| O5 | **Grounded patrols.** Patrol probability driven by the number of adult males, food abundance and recent boundary history (Mitani & Watts 2005 [M]). Patrols can make incursions into neighboring ranges. | The sim applies Ngogo's rate (a ~25-male community) to communities of 3–7 males; small communities patrol about 0.3×/week. | Patrol rate correlates with male count and food as in the source studies. Incursions occur. |
| O6 | **Community fission.** Communities can split when their social networks and ranging diverge. Splits can end in lethal conflict (Gombe Kahama [H]; Ngogo split, Sandel & Watts 2021 [M]). | A dramatic, documented phenomenon that is missing. | In long runs, fission emerges from mechanisms, not scripts, at plausible rates. Post-fission aggression is documented in the run output. |
| O7 | **Long-term spatial memory of food.** Chimps remember tree locations and fruiting schedules and plan travel to them (Janmaat and colleagues, Taï [M]). | Chimps currently forget trees after ~1.5 h. Travel is too low (5% of daylight vs 12–25%) and grooming too high (26% vs 8–18%); feeding (37%) is within the verified 36–43%. | Activity budget, travel share and route straightness reach their targets (`data/targets.json`). |
| O8 | **Real ecology.** Phenology curves from Kibale monitoring, fallback foods, and red colobus population dynamics with depletion under predation [M]. Hunting comes in bursts in food-rich periods [M]. | The forest and prey are synthetic. | Party size tracks fruit as in the field. Hunt seasonality appears. The prey population responds to predation. |
| O9 | **Demography and health.** Respiratory epidemics of human origin (Negrey et al. 2019 [M]) and snare injuries at Kibale [M]. Age-specific fertility (Emery Thompson et al. 2007 [M]). Rank effects on infant survival (Pusey, Williams & Goodall 1997 [H]). Post-weaning maternal care effects (Crockford et al. 2020 [M]). | Flat hazards miss the main causes of death and the fitness consequences of rank. | Life table, causes of death and fertility curve match targets within uncertainty. |
| O10 | **Communication.** Individually distinctive pant-hoots and drumming. Food calls that vary with food value. A core gesture repertoire (Hobaiter & Byrne 2011 [H]). | Calls are event triggers only. This ties into the new spatial audio. | Call rates by context match targets. Each chimp's signature is stable across calls. |
| O11 | **Relationships with memory** (in progress). Per-pair tension and compatibility (Fraser, Schino & Aureli 2008 [M]). Monthly memory digests compressed into yearly ones. Long-term recognition (Lewis et al. 2023 [M]). | Fights currently leave no lasting mark on a relationship. | Tension dynamics and reconciliation effects are covered by tests. Digests stay bounded over a lifetime. |
| O12 | **Calibration and validation.** Match many patterns at once (pattern-oriented modeling; Grimm et al. 2005 [H]). Sensitivity analysis. Approximate Bayesian Computation on uncertain parameters. Held-out validation patterns. Document the model with the ODD protocol (Grimm et al. 2006/2020 [H]). | This turns "plausible" into "shown". | A validation report: fitted vs held-out patterns, parameter posteriors, and what remains off target. |

## Proof standard

- **Measurement:** every objective is measured by the virtual observer (O1) and `scripts/sim-metrics.ts`.
- **Uncertainty:** runs use at least 5 seeds; report the spread, not just a mean.
- **Two target groups:** targets are marked either *fitted* (used to tune) or *held out* (validation only). A held-out pattern that matches without tuning is the strongest evidence.
- **Regressions:** each stage re-runs the full target table.
- **Never inflated:** behavior rates are not inflated for the demo. Demo visibility comes from the speed presets and the field experiments.

## Delivery order

Revised after the research phase (`docs/realism-design.md` §0):

1. **C3:** O1 observer, target harness and parallel run pool
2. **C4:** O2 registry. It must land before scale changes, because distance terms in scoring break silently at real scale.
3. **C5a:** O3 scale split, headless, behind a profile switch, plus real phenology ingest
4. **C5b:** O3 renderer field view (renderer owner)
5. **C6:** O4 and O5 territories and patrols
6. **C7:** O7 and O8 memory and ecology
7. **C8:** O9 demography
8. **C10:** O10 communication
9. **C11:** O12 calibration and validation report
10. **C9:** O6 fission, run as a scenario after calibration. It needs large communities.

O11 is complete.

## Corrections from the research phase

- **Adult male feeding:** the earlier "45–55% feeding" target was unsupported; verified values are 36–43%.
- **Killings:** zero in 9 community-years is not evidence of too few. At the median field rate it happens about half the time.
- **Hunting:** the "62 hunts in 471 days" comment was misread. Field hunt success is 53–82%.
- **Encounters:** inflation comes mostly from sight (21×) and party-link distance (9×), not hearing (1.8×).
