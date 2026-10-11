# Stage R10 replay: trained-gate-s48

`scripts/r10-night.ts replay`, 2026-10-11T18:14:39.928Z. **rules-taught model on a rules menu.** Arm `trained-gate` (adapter `r4-rules-state`), decode: top (the kernel's own pick), gate on, the rules' pick kept on the menu, packet `r4-state-1`.
Seed 48 (a training seed of the rules-taught adapters (48 and 7)), field map, 30 days of burn-in on the rules, then **9 simulated days**. Every animal aged 8 and over in every community is on the kernel; **animals under 8 years stay on the rules**. Run at commit a11c45cc0e.

**Replay check: the receipts reproduce the run.** 9 of 9 day hashes equal (end 37dc331aa4ff3a35); 0 asks without a receipt; 0 menus differ; 0 of 28167 receipt lines differ when regenerated (each carries its context's hash); 0 row files differ. No model; 22 s.

This is a **level measurement on one seed**. No comparison is counted as a result until a fresh unseen seed has been run.

## Is the population viable, and how often is it asked

| Measure | Value | Over |
| --- | --- | --- |
| deaths since the burn-in, by cause | none | 9 days, every animal |
| reserves, % of the usual store a day | on the kernel -0.074; under 8 (rules) -0.109 | 38 and 11 animals, 342 and 99 animal-days |
| energy eaten, kcal a day (the field's intake measure) | on the kernel 1,487; under 8 (rules) 671 | 38 and 11 animals, 342 and 99 animal-days |
| energy out, kcal a day | on the kernel 1,452; under 8 (rules) 655 | 38 and 11 animals, 342 and 99 animal-days |
| distance, km a day (ground path) | on the kernel 1.63; under 8 (rules) 2.67 | 38 and 11 animals, 342 and 99 animal-days |
| trips to food begun, a day | on the kernel 2.4; under 8 (rules) 4.7 | 38 and 11 animals, 342 and 99 animal-days |
| trips to food completed, a day | on the kernel 0.7; under 8 (rules) 0.4 | 38 and 11 animals, 342 and 99 animal-days |
| act changes, a day | on the kernel 31.1; under 8 (rules) 47.2 | 38 and 11 animals, 342 and 99 animal-days |
| nights in a nest (at least 0.9 of the dark hours) | 342 of 342 | animals on the kernel |
| asks per animal and day | 55.2 | 38 animals on the kernel, 342 animal-days |
| acts the gate held without asking, per animal and day | 27.2 | the same |
| asks in all; settled by the kernel's choice; by the rules | 18,869; 18,501 (98.0%); 368 | 9 days |
| the rules settled, by reason | not-applied 368 | |
| the kernel's applied choice was the rules' pick | 51.7% | 18,501 kernel choices with the pick on the menu |

## Party size, grooming and greeting, by value

| Level | Row | Value | n | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- |
| party size | T-PTY-1 | 4.691 | 27 | field observer | 4.5 to 9.2 individuals (22-member community) |
| grooming share of daytime | T-ACT-3 | 0.101 | 21 | field observer | 0.08 to 0.18 fraction |
| greeting direction (pant-grunts received by the top three males) | T-SOC-6 | 0.486 | 1 | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows held out

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ENE-3 | Daily dry-matter intake of multiparous lactating females | 746.113 | 72 |  | simulation truth | 650 to 1100 g dry matter/d |
| T-RHY-1 | Active day (nest to nest) | 10.814 | 248 | males 10.79, lactating 10.93 | simulation truth | 10.5 to 12 h |
| T-RHY-4 | Start of night-nest building relative to sunset | 40.750 | 369 |  | simulation truth | -30 to 90 min before sunset |
| T-RHY-5 | Activity at night | 0.000 | 362156 |  | simulation truth | 0 to 0.05 fraction of activity records |
| T-RHY-6 | Drinking frequency | 0.882 | 141 | shareMinutesDrinking 0.01 | simulation truth | 0.3 to 2 events per individual per 12 h |
| T-SOC-14 | Contact share of aggression among individuals of 12 y and over | 0.115 | 156 |  | simulation truth | 0.08 to 0.37 fraction of aggressive interactions |
| T-SOC-10 | Third-party post-conflict affiliation | 0.115 | 61 | toAggressor 0.00, toVictim 7.00 | field observer | 0.1 to 0.3 fraction |
| T-SOC-6 | Pant-grunts concentrate on top males | 0.486 | 1 |  | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows fitted to the rules or tuned

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | Adult feeding share of daytime | 0.335 | 21 | male 0.33, female 0.34 | field observer | 0.33 to 0.5 fraction of daytime |
| T-ACT-4 | Adult resting (including grooming) share of daytime | 0.499 | 2 |  | field observer | 0.3 to 0.47 fraction |
| T-ACT-2 (tuned) | Adult travel share of daytime | 0.076 | 21 | male 0.06, female 0.09 | field observer | 0.12 to 0.25 fraction |
| T-ACT-3 | Adult grooming share of daytime | 0.101 | 21 | male 0.14, female 0.06 | field observer | 0.08 to 0.18 fraction |
| T-RNG-4 (tuned) | Adult male day range | 0.893 | 9 | path30Km 0.64, netKm 0.20, straightness30 0.32 | field observer | 1.5 to 3.5 km/day |
| T-FOOD-2 | Fruit share of feeding time | 0.992 | 25 |  | field observer | 0.6 to 0.78 fraction |
| T-COM-1 (encoded) | Male pant-hoot rate | 0.171 | 11 |  | field observer | 0.5 to 1.5 per male-hour |

Observer: 27 follows, 13451 point samples, 897 scans; records hash `71c4b834273ab345/2474927c1a3a9498/c3a8ce1339902ddc`. Rows read over 9 days on one seed are noisy; several need 30 days of a whole population.

## Per class, per animal and day

| Class | Decided by | Animals | Energy eaten, kcal | Energy out, kcal | Reserves, % a day | km | Trips begun | Trips completed | Act changes | Nights in a nest | Asks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adolescent 12-15 y | kernel | 4 | 1,519 | 1,435 | -0.020 | 1.70 | 2.8 | 0.8 | 34.7 | 36 of 36 | 59.5 |
| adult male | kernel | 14 | 1,497 | 1,479 | -0.095 | 1.56 | 2.7 | 0.8 | 31.2 | 126 of 126 | 57.0 |
| female, lactating | kernel | 8 | 1,720 | 1,669 | -0.072 | 1.91 | 2.5 | 0.7 | 34.1 | 72 of 72 | 57.8 |
| female, other | kernel | 9 | 1,286 | 1,269 | -0.096 | 1.61 | 2.0 | 0.8 | 29.8 | 81 of 81 | 51.6 |
| juvenile 8-12 y | kernel | 3 | 1,377 | 1,317 | 0.007 | 1.12 | 1.0 | 0.3 | 21.8 | 27 of 27 | 44.7 |
| under 8 y (infant) | rules (under 8 years) | 8 | 497 | 483 | -0.103 | 2.11 | 0.0 | 0.0 | 41.4 | 72 of 72 | 0.0 |
| under 8 y (juvenile) | rules (under 8 years) | 3 | 1,135 | 1,111 | -0.127 | 4.16 | 17.2 | 1.3 | 62.9 | 27 of 27 | 0.0 |

## The timing card (stage R7), by value

Read on the 38 animals aged 8 and over at the start of the window: 342 animal-days, 7,177 half-hour pairs, 3,074 patch visits. One arm's values; whether they differ from the rules', and in which direction, is read against the control arms of stage R7 at the same unit (`scripts/r7-report.ts --engine`).

| Readout | Value |
| --- | --- |
| C1 act changes per animal-day | 33.7 |
| C2 switches of activity per waking hour | 3.73 |
| C3 feeding bout, median min | 20.25 |
| C3 rest bout, median min | 26.25 |
| C3 travel bout, median min | 2.00 |
| C3 grooming bout, median min | 12.75 |
| C5 trips to food begun per animal-day | 2.36 |
| C5 trips to food completed per animal-day | 0.74 |
| C6 patch residency, mean feeding min per visit | 22.50 |
| C7 continuous feeding at one tree, median min | 21.50 |
| C8 feeding trees per animal-day | 4.85 |
| C9 half-hour pairs in the same activity, share | 0.445 |
| C9 half-hour pairs in the same activity, first mark resting | 0.616 |
| C9 half-hour pairs in the same activity, first mark feeding | 0.238 |
| guard: reserve change, % of the reserve cap per day | -0.074 |
| guard: distance by 5-min fixes, km per day | 1.43 |
| guard: nights in a nest, share of nights | 1.000 |
| energy eaten, kcal per day (the field's formula measure; not a guard) | 1,487 |
