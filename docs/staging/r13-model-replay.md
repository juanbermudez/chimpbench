# Stage R13 replay: p5b-s7-draw-1-s3613

`scripts/r10-night.ts replay`, 2026-10-12T19:09:42.071Z. **rules-taught model on a rules menu (taught the rules' own odds on fresh draws; packet 5; one training of the recipe).** Arm `p5b-s7-draw-1` (adapter `r11-p5b-s7`), decode: draw (one seeded draw per ask, salt 1), gate on, the rules' pick kept on the menu, packet `r11-p5b`.
Seed 3613 (the fresh seed registered for stage R13 (docs/staging/r13-prereg.md §4)), field map, 30 days of burn-in on the rules, then **20 simulated days**. Every animal aged 8 and over in every community is on the kernel; **animals under 8 years stay on the rules**. Run at commit fcbd612800.

**Replay check: the receipts reproduce the run.** 20 of 20 day hashes equal (end ab56e6428cefa643); 0 asks without a receipt; 0 menus differ; 0 of 68656 receipt lines differ when regenerated (each carries its context's hash); 0 row files differ. No model; 42 s.

This is a **level measurement on one world seed and one training of the recipe**. The registered reading is `scripts/r13-report.ts` (docs/staging/r13-prereg.md §8): the rules on the same world, animals and days are the yardstick, and nothing here is a claim about wild chimpanzees.

## Is the population viable, and how often is it asked

| Measure | Value | Over |
| --- | --- | --- |
| deaths since the burn-in, by cause | none | 20 days, every animal |
| reserves, % of the usual store a day | on the kernel -0.054; under 8 (rules) -0.059 | 38 and 11 animals, 760 and 220 animal-days |
| energy eaten, kcal a day (the field's intake measure) | on the kernel 1,591; under 8 (rules) 686 | 38 and 11 animals, 760 and 220 animal-days |
| energy out, kcal a day | on the kernel 1,500; under 8 (rules) 661 | 38 and 11 animals, 760 and 220 animal-days |
| distance, km a day (ground path) | on the kernel 2.63; under 8 (rules) 3.30 | 38 and 11 animals, 760 and 220 animal-days |
| trips to food begun, a day | on the kernel 7.3; under 8 (rules) 4.9 | 38 and 11 animals, 760 and 220 animal-days |
| trips to food completed, a day | on the kernel 2.1; under 8 (rules) 0.1 | 38 and 11 animals, 760 and 220 animal-days |
| act changes, a day | on the kernel 42.9; under 8 (rules) 49.1 | 38 and 11 animals, 760 and 220 animal-days |
| nights in a nest (at least 0.9 of the dark hours) | 739 of 760 | animals on the kernel |
| asks per animal and day | 63.2 | 38 animals on the kernel, 760 animal-days |
| acts the gate held without asking, per animal and day | 27.1 | the same |
| asks in all; settled by the kernel's choice; by the rules | 48,034; 47,007 (97.9%); 1,027 | 20 days |
| the rules settled, by reason | not-applied 1027 | |
| the kernel's applied choice was the rules' pick | 44.6% | 47,005 kernel choices with the pick on the menu |

## Party size, grooming and greeting, by value

| Level | Row | Value | n | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- |
| party size | T-PTY-1 | 4.608 | 59 | field observer | 4.5 to 9.2 individuals (22-member community) |
| grooming share of daytime | T-ACT-3 | 0.096 | 25 | field observer | 0.08 to 0.18 fraction |
| greeting direction (pant-grunts received by the top three males) | T-SOC-6 | 0.497 | 1 | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows held out

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ENE-3 | Daily dry-matter intake of multiparous lactating females | 779.607 | 160 |  | simulation truth | 650 to 1100 g dry matter/d |
| T-RHY-1 | Active day (nest to nest) | 11.175 | 558 | males 10.98, lactating 11.47 | simulation truth | 10.5 to 12 h |
| T-RHY-4 | Start of night-nest building relative to sunset | 36.500 | 806 |  | simulation truth | -30 to 90 min before sunset |
| T-RHY-5 | Activity at night | 0.024 | 1009678 |  | simulation truth | 0 to 0.05 fraction of activity records |
| T-RHY-6 | Drinking frequency | 0.661 | 235 | shareMinutesDrinking 0.01 | simulation truth | 0.3 to 2 events per individual per 12 h |
| T-SOC-14 | Contact share of aggression among individuals of 12 y and over | 0.097 | 124 |  | simulation truth | 0.08 to 0.37 fraction of aggressive interactions |
| T-SOC-10 | Third-party post-conflict affiliation | 0.147 | 34 | toAggressor 2.00, toVictim 3.00 | field observer | 0.1 to 0.3 fraction |
| T-SOC-6 | Pant-grunts concentrate on top males | 0.497 | 1 |  | field observer | 0.6 to 0.9 fraction |

## The short scorecard by value: rows fitted to the rules or tuned

| Row | Metric | Value | n | Parts | Read by | Field band (a yardstick, not a verdict) |
| --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | Adult feeding share of daytime | 0.411 | 25 | male 0.39, female 0.43 | field observer | 0.33 to 0.5 fraction of daytime |
| T-ACT-4 | Adult resting (including grooming) share of daytime | 0.377 | 2 |  | field observer | 0.3 to 0.47 fraction |
| T-ACT-2 (tuned) | Adult travel share of daytime | 0.111 | 25 | male 0.12, female 0.11 | field observer | 0.12 to 0.25 fraction |
| T-ACT-3 | Adult grooming share of daytime | 0.096 | 25 | male 0.10, female 0.09 | field observer | 0.08 to 0.18 fraction |
| T-RNG-4 (tuned) | Adult male day range | 2.629 | 17 | path30Km 1.92, netKm 0.43, straightness30 0.24 | field observer | 1.5 to 3.5 km/day |
| T-FOOD-2 | Fruit share of feeding time | 0.746 | 31 |  | field observer | 0.6 to 0.78 fraction |
| T-COM-1 (encoded) | Male pant-hoot rate | 0.643 | 11 |  | field observer | 0.5 to 1.5 per male-hour |

Observer: 60 follows, 29573 point samples, 1967 scans; records hash `9500fcc569537436/ba51b230758b979a/a5e1f705f893fabe`. Rows read over 20 days on one seed are noisy; several need 30 days of a whole population.

## Per class, per animal and day

| Class | Decided by | Animals | Energy eaten, kcal | Energy out, kcal | Reserves, % a day | km | Trips begun | Trips completed | Act changes | Nights in a nest | Asks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adolescent 12-15 y | kernel | 4 | 1,581 | 1,495 | -0.052 | 2.88 | 7.8 | 1.9 | 48.6 | 76 of 80 | 70.5 |
| adult male | kernel | 14 | 1,629 | 1,541 | -0.035 | 2.67 | 8.0 | 2.0 | 43.5 | 274 of 280 | 65.0 |
| female, lactating | kernel | 8 | 1,819 | 1,695 | -0.058 | 2.67 | 6.5 | 2.2 | 41.4 | 159 of 160 | 61.0 |
| female, other | kernel | 9 | 1,396 | 1,314 | -0.073 | 2.47 | 7.2 | 2.0 | 43.0 | 173 of 180 | 61.9 |
| juvenile 8-12 y | kernel | 3 | 1,408 | 1,358 | -0.073 | 2.46 | 6.3 | 2.2 | 35.8 | 57 of 60 | 55.0 |
| under 8 y (infant) | rules (under 8 years) | 8 | 502 | 486 | -0.055 | 2.80 | 0.0 | 0.0 | 42.1 | 159 of 160 | 0.0 |
| under 8 y (juvenile) | rules (under 8 years) | 3 | 1,176 | 1,129 | -0.071 | 4.64 | 18.1 | 0.5 | 67.8 | 58 of 60 | 0.0 |

## The timing card (stage R7), by value

Read on the 38 animals aged 8 and over at the start of the window: 760 animal-days, 15,190 half-hour pairs, 7,169 patch visits. One arm's values; whether they differ from the rules', and in which direction, is read against the control arms of stage R7 at the same unit (`scripts/r7-report.ts --engine`).

| Readout | Value |
| --- | --- |
| C1 act changes per animal-day | 44.4 |
| C2 switches of activity per waking hour | 4.35 |
| C3 feeding bout, median min | 17.50 |
| C3 rest bout, median min | 19.75 |
| C3 travel bout, median min | 2.75 |
| C3 grooming bout, median min | 12.50 |
| C5 trips to food begun per animal-day | 7.33 |
| C5 trips to food completed per animal-day | 2.07 |
| C6 patch residency, mean feeding min per visit | 20.58 |
| C7 continuous feeding at one tree, median min | 17.50 |
| C8 feeding trees per animal-day | 5.94 |
| C9 half-hour pairs in the same activity, share | 0.398 |
| C9 half-hour pairs in the same activity, first mark resting | 0.491 |
| C9 half-hour pairs in the same activity, first mark feeding | 0.375 |
| guard: reserve change, % of the reserve cap per day | -0.054 |
| guard: distance by 5-min fixes, km per day | 2.37 |
| guard: nights in a nest, share of nights | 0.972 |
| energy eaten, kcal per day (the field's formula measure; not a guard) | 1,591 |
