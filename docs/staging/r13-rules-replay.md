# Stage R13 replay: rules-s3613

`scripts/r10-night.ts replay`, 2026-10-12T19:10:03.327Z. **the rules.** Arm `rules`, decode: none (no decode step: the kernel's own pick is applied), gate off, the rules' pick kept on the menu, packet `r11-p5b`.
Seed 3613 (the fresh seed registered for stage R13 (docs/staging/r13-prereg.md §4)), field map, 30 days of burn-in on the rules, then **20 simulated days**. Every animal aged 8 and over in every community is on the kernel; **animals under 8 years stay on the rules**. Run at commit fcbd612800.

**Replay check: the receipts reproduce the run.** 20 of 20 day hashes equal (end 9305141da162ca7a); 0 asks without a receipt; 0 menus differ; 0 of 0 receipt lines differ when regenerated (each carries its context's hash); 0 row files differ. No model; 21 s.

This is a **level measurement on one world seed and one training of the recipe**. The registered reading is `scripts/r13-report.ts` (docs/staging/r13-prereg.md §8): the rules on the same world, animals and days are the yardstick, and nothing here is a claim about wild chimpanzees.

## Is the population viable, and how often is it asked

| Measure | Value | Over |
| --- | --- | --- |
| deaths since the burn-in, by cause | none | 20 days, every animal |
| reserves, % of the usual store a day | on the kernel no value; under 8 (rules) 0.009 | 0 and 49 animals, 0 and 980 animal-days |
| energy eaten, kcal a day (the field's intake measure) | on the kernel no value; under 8 (rules) 1,408 | 0 and 49 animals, 0 and 980 animal-days |
| energy out, kcal a day | on the kernel no value; under 8 (rules) 1,313 | 0 and 49 animals, 0 and 980 animal-days |
| distance, km a day (ground path) | on the kernel no value; under 8 (rules) 2.32 | 0 and 49 animals, 0 and 980 animal-days |
| trips to food begun, a day | on the kernel no value; under 8 (rules) 6.4 | 0 and 49 animals, 0 and 980 animal-days |
| trips to food completed, a day | on the kernel no value; under 8 (rules) 1.6 | 0 and 49 animals, 0 and 980 animal-days |
| act changes, a day | on the kernel no value; under 8 (rules) 41.9 | 0 and 49 animals, 0 and 980 animal-days |
| nights in a nest (at least 0.9 of the dark hours) | 0 of 0 | animals on the kernel |
| asks per animal and day | no value | 0 animals on the kernel, 0 animal-days |
| acts the gate held without asking, per animal and day | no value | the same |
| asks in all; settled by the kernel's choice; by the rules | 0; 0 (no value%); 0 | 20 days |
| the kernel's applied choice was the rules' pick | no value% | 0 kernel choices with the pick on the menu |

## Party size, grooming and greeting, by value

| Level | Row | Value | n | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- |
| party size | T-PTY-1 | 4.197 | 60 | field observer | 4.5 to 9.2 individuals (22-member community) |
| grooming share of daytime | T-ACT-3 | 0.107 | 27 | field observer | 0.08 to 0.18 fraction |
| greeting direction (pant-grunts received by the top three males) | T-SOC-6 | 0.435 | 1 | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows held out

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ENE-3 | Daily dry-matter intake of multiparous lactating females | 819.736 | 160 |  | simulation truth | 650 to 1100 g dry matter/d |
| T-RHY-1 | Active day (nest to nest) | 11.546 | 589 | males 11.29, lactating 12.12 | simulation truth | 10.5 to 12 h |
| T-RHY-4 | Start of night-nest building relative to sunset | 38.750 | 820 |  | simulation truth | -30 to 90 min before sunset |
| T-RHY-5 | Activity at night | 0.015 | 988499 |  | simulation truth | 0 to 0.05 fraction of activity records |
| T-RHY-6 | Drinking frequency | 0.461 | 164 | shareMinutesDrinking 0.00 | simulation truth | 0.3 to 2 events per individual per 12 h |
| T-SOC-14 | Contact share of aggression among individuals of 12 y and over | 0.037 | 325 |  | simulation truth | 0.08 to 0.37 fraction of aggressive interactions |
| T-SOC-10 | Third-party post-conflict affiliation | 0.094 | 96 | toAggressor 4.00, toVictim 7.00 | field observer | 0.1 to 0.3 fraction |
| T-SOC-6 | Pant-grunts concentrate on top males | 0.435 | 1 |  | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows fitted to the rules or tuned

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | Adult feeding share of daytime | 0.364 | 27 | male 0.33, female 0.39 | field observer | 0.33 to 0.5 fraction of daytime |
| T-ACT-4 | Adult resting (including grooming) share of daytime | 0.457 | 2 |  | field observer | 0.3 to 0.47 fraction |
| T-ACT-2 (tuned) | Adult travel share of daytime | 0.096 | 27 | male 0.10, female 0.09 | field observer | 0.12 to 0.25 fraction |
| T-ACT-3 | Adult grooming share of daytime | 0.107 | 27 | male 0.15, female 0.07 | field observer | 0.08 to 0.18 fraction |
| T-RNG-4 (tuned) | Adult male day range | 2.296 | 18 | path30Km 1.66, netKm 0.43, straightness30 0.25 | field observer | 1.5 to 3.5 km/day |
| T-FOOD-2 | Fruit share of feeding time | 0.817 | 32 |  | field observer | 0.6 to 0.78 fraction |
| T-COM-1 (encoded) | Male pant-hoot rate | 0.439 | 12 |  | field observer | 0.5 to 1.5 per male-hour |

Observer: 61 follows, 29820 point samples, 1987 scans; records hash `b2957bbb0fbe61ae/0d87726e1a67caed/36f8ab98b07db29e`. Rows read over 20 days on one seed are noisy; several need 30 days of a whole population.

## Per class, per animal and day

| Class | Decided by | Animals | Energy eaten, kcal | Energy out, kcal | Reserves, % a day | km | Trips begun | Trips completed | Act changes | Nights in a nest | Asks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adolescent 12-15 y | rules | 4 | 1,586 | 1,488 | 0.008 | 2.54 | 7.6 | 1.6 | 44.2 | 80 of 80 | 0.0 |
| adult male | rules | 14 | 1,625 | 1,537 | 0.013 | 2.22 | 9.0 | 2.3 | 44.6 | 280 of 280 | 0.0 |
| female, lactating | rules | 8 | 1,897 | 1,728 | -0.008 | 2.28 | 5.1 | 2.0 | 36.0 | 160 of 160 | 0.0 |
| female, other | rules | 9 | 1,410 | 1,294 | 0.001 | 1.72 | 4.8 | 1.5 | 36.1 | 180 of 180 | 0.0 |
| juvenile 8-12 y | rules | 3 | 1,491 | 1,390 | 0.043 | 2.50 | 7.6 | 1.9 | 37.4 | 60 of 60 | 0.0 |
| under 8 y (infant) | rules | 8 | 499 | 487 | 0.009 | 2.35 | 0.0 | 0.0 | 41.7 | 160 of 160 | 0.0 |
| under 8 y (juvenile) | rules | 3 | 1,185 | 1,115 | 0.032 | 4.13 | 16.5 | 1.0 | 65.3 | 60 of 60 | 0.0 |

## The timing card (stage R7), by value

Read on the 38 animals aged 8 and over at the start of the window: 760 animal-days, 16,670 half-hour pairs, 6,995 patch visits. One arm's values; whether they differ from the rules', and in which direction, is read against the control arms of stage R7 at the same unit (`scripts/r7-report.ts --engine`).

| Readout | Value |
| --- | --- |
| C1 act changes per animal-day | 41.5 |
| C2 switches of activity per waking hour | 3.59 |
| C3 feeding bout, median min | 19.75 |
| C3 rest bout, median min | 26.25 |
| C3 travel bout, median min | 3.25 |
| C3 grooming bout, median min | 16.00 |
| C5 trips to food begun per animal-day | 6.91 |
| C5 trips to food completed per animal-day | 1.92 |
| C6 patch residency, mean feeding min per visit | 21.50 |
| C7 continuous feeding at one tree, median min | 19.75 |
| C8 feeding trees per animal-day | 5.29 |
| C9 half-hour pairs in the same activity, share | 0.412 |
| C9 half-hour pairs in the same activity, first mark resting | 0.542 |
| C9 half-hour pairs in the same activity, first mark feeding | 0.296 |
| guard: reserve change, % of the reserve cap per day | 0.008 |
| guard: distance by 5-min fixes, km per day | 1.90 |
| guard: nights in a nest, share of nights | 1.000 |
| energy eaten, kcal per day (the field's formula measure; not a guard) | 1,617 |
