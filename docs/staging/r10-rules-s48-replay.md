# Stage R10 replay: rules-s48

`scripts/r10-night.ts replay`, 2026-10-11T18:15:16.298Z. **the rules.** Arm `rules`, decode: none (no decode step: the kernel's own pick is applied), gate off, the rules' pick kept on the menu, packet `r4-state-1`.
Seed 48 (a training seed of the rules-taught adapters (48 and 7)), field map, 30 days of burn-in on the rules, then **9 simulated days**. Every animal aged 8 and over in every community is on the kernel; **animals under 8 years stay on the rules**. Run at commit a11c45cc0e.

**Replay check: the receipts reproduce the run.** 9 of 9 day hashes equal (end 77ecf4a1929afdb4); 0 asks without a receipt; 0 menus differ; 0 of 0 receipt lines differ when regenerated (each carries its context's hash); 0 row files differ. No model; 12 s.

This is a **level measurement on one seed**. No comparison is counted as a result until a fresh unseen seed has been run.

## Is the population viable, and how often is it asked

| Measure | Value | Over |
| --- | --- | --- |
| deaths since the burn-in, by cause | none | 9 days, every animal |
| reserves, % of the usual store a day | on the kernel no value; under 8 (rules) -0.052 | 0 and 49 animals, 0 and 441 animal-days |
| energy eaten, kcal a day (the field's intake measure) | on the kernel no value; under 8 (rules) 1,389 | 0 and 49 animals, 0 and 441 animal-days |
| energy out, kcal a day | on the kernel no value; under 8 (rules) 1,316 | 0 and 49 animals, 0 and 441 animal-days |
| distance, km a day (ground path) | on the kernel no value; under 8 (rules) 2.59 | 0 and 49 animals, 0 and 441 animal-days |
| trips to food begun, a day | on the kernel no value; under 8 (rules) 6.9 | 0 and 49 animals, 0 and 441 animal-days |
| trips to food completed, a day | on the kernel no value; under 8 (rules) 1.7 | 0 and 49 animals, 0 and 441 animal-days |
| act changes, a day | on the kernel no value; under 8 (rules) 41.9 | 0 and 49 animals, 0 and 441 animal-days |
| nights in a nest (at least 0.9 of the dark hours) | 0 of 0 | animals on the kernel |
| asks per animal and day | no value | 0 animals on the kernel, 0 animal-days |
| acts the gate held without asking, per animal and day | no value | the same |
| asks in all; settled by the kernel's choice; by the rules | 0; 0 (no value%); 0 | 9 days |
| the kernel's applied choice was the rules' pick | no value% | 0 kernel choices with the pick on the menu |

## Party size, grooming and greeting, by value

| Level | Row | Value | n | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- |
| party size | T-PTY-1 | 4.228 | 29 | field observer | 4.5 to 9.2 individuals (22-member community) |
| grooming share of daytime | T-ACT-3 | 0.073 | 23 | field observer | 0.08 to 0.18 fraction |
| greeting direction (pant-grunts received by the top three males) | T-SOC-6 | 0.620 | 1 | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows held out

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ENE-3 | Daily dry-matter intake of multiparous lactating females | 807.497 | 72 |  | simulation truth | 650 to 1100 g dry matter/d |
| T-RHY-1 | Active day (nest to nest) | 11.544 | 248 | males 11.32, lactating 11.94 | simulation truth | 10.5 to 12 h |
| T-RHY-4 | Start of night-nest building relative to sunset | 37.250 | 369 |  | simulation truth | -30 to 90 min before sunset |
| T-RHY-5 | Activity at night | 0.015 | 432951 |  | simulation truth | 0 to 0.05 fraction of activity records |
| T-RHY-6 | Drinking frequency | 0.500 | 80 | shareMinutesDrinking 0.00 | simulation truth | 0.3 to 2 events per individual per 12 h |
| T-SOC-14 | Contact share of aggression among individuals of 12 y and over | 0.100 | 160 |  | simulation truth | 0.08 to 0.37 fraction of aggressive interactions |
| T-SOC-10 | Third-party post-conflict affiliation | 0.172 | 64 | toAggressor 1.00, toVictim 11.00 | field observer | 0.1 to 0.3 fraction |
| T-SOC-6 | Pant-grunts concentrate on top males | 0.620 | 1 |  | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows fitted to the rules or tuned

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | Adult feeding share of daytime | 0.374 | 23 | male 0.36, female 0.39 | field observer | 0.33 to 0.5 fraction of daytime |
| T-ACT-4 | Adult resting (including grooming) share of daytime | 0.453 | 2 |  | field observer | 0.3 to 0.47 fraction |
| T-ACT-2 (tuned) | Adult travel share of daytime | 0.103 | 23 | male 0.11, female 0.10 | field observer | 0.12 to 0.25 fraction |
| T-ACT-3 | Adult grooming share of daytime | 0.073 | 23 | male 0.12, female 0.04 | field observer | 0.08 to 0.18 fraction |
| T-RNG-4 (tuned) | Adult male day range | 2.281 | 7 | path30Km 1.56, netKm 0.47, straightness30 0.30 | field observer | 1.5 to 3.5 km/day |
| T-FOOD-2 | Fruit share of feeding time | 0.848 | 26 |  | field observer | 0.6 to 0.78 fraction |
| T-COM-1 (encoded) | Male pant-hoot rate | 0.599 | 10 |  | field observer | 0.5 to 1.5 per male-hour |

Observer: 30 follows, 15724 point samples, 1051 scans; records hash `2d8549996615eb41/af342f0be4db9a95/490806d6214d85c7`. Rows read over 9 days on one seed are noisy; several need 30 days of a whole population.

## Per class, per animal and day

| Class | Decided by | Animals | Energy eaten, kcal | Energy out, kcal | Reserves, % a day | km | Trips begun | Trips completed | Act changes | Nights in a nest | Asks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adolescent 12-15 y | rules | 4 | 1,620 | 1,494 | -0.024 | 2.87 | 7.3 | 1.5 | 39.2 | 36 of 36 | 0.0 |
| adult male | rules | 14 | 1,617 | 1,548 | -0.024 | 2.71 | 9.3 | 2.3 | 44.4 | 126 of 126 | 0.0 |
| female, lactating | rules | 8 | 1,860 | 1,716 | -0.037 | 2.30 | 6.3 | 2.4 | 36.0 | 72 of 72 | 0.0 |
| female, other | rules | 9 | 1,373 | 1,299 | -0.065 | 1.86 | 6.1 | 1.9 | 39.0 | 81 of 81 | 0.0 |
| juvenile 8-12 y | rules | 3 | 1,444 | 1,412 | -0.085 | 3.53 | 7.8 | 1.8 | 36.7 | 27 of 27 | 0.0 |
| under 8 y (infant) | rules | 8 | 492 | 484 | -0.087 | 2.39 | 0.0 | 0.0 | 42.5 | 71 of 72 | 0.0 |
| under 8 y (juvenile) | rules | 3 | 1,150 | 1,110 | -0.099 | 4.17 | 15.9 | 0.6 | 61.1 | 27 of 27 | 0.0 |

## The timing card (stage R7), by value

Read on the 38 animals aged 8 and over at the start of the window: 342 animal-days, 7,550 half-hour pairs, 3,139 patch visits. One arm's values; whether they differ from the rules', and in which direction, is read against the control arms of stage R7 at the same unit (`scripts/r7-report.ts --engine`).

| Readout | Value |
| --- | --- |
| C1 act changes per animal-day | 41.8 |
| C2 switches of activity per waking hour | 3.54 |
| C3 feeding bout, median min | 19.25 |
| C3 rest bout, median min | 28.25 |
| C3 travel bout, median min | 3.25 |
| C3 grooming bout, median min | 15.50 |
| C5 trips to food begun per animal-day | 7.58 |
| C5 trips to food completed per animal-day | 2.10 |
| C6 patch residency, mean feeding min per visit | 21.40 |
| C7 continuous feeding at one tree, median min | 19.25 |
| C8 feeding trees per animal-day | 4.96 |
| C9 half-hour pairs in the same activity, share | 0.428 |
| C9 half-hour pairs in the same activity, first mark resting | 0.560 |
| C9 half-hour pairs in the same activity, first mark feeding | 0.309 |
| guard: reserve change, % of the reserve cap per day | -0.041 |
| guard: distance by 5-min fixes, km per day | 2.15 |
| guard: nights in a nest, share of nights | 1.000 |
| energy eaten, kcal per day (the field's formula measure; not a guard) | 1,597 |
