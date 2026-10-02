# Stage E2c pre-registration: darkness by its consequences

Written 1 October 2026, before the first run of the changed model. Track E rule: field values of behaviour are targets,
never inputs. Only physiology or physics measured independently of the behaviour may be a parameter.

Scope: the two causes E2b left for the missing janmaat2014 pattern (`docs/staging/e2b-prereg.md` §8): the darkness
weight of the nest, and fruit that only chimpanzees eat. Branch `e2c-darkness` (from `track-e`; every Track E switch off
by default). Sources: research.md E.18 (this stage) and E.17 (E2b).

## 1. The prescription removed

`rhythmDarkW` (2.2, E2a): the nest's value is `(1 − daylight)·(rhythmSleepW·S + rhythmDarkW)`. It was set a priori so a
nest in the dark beats a starving animal's best meal by three softmax temperatures. Nothing else in the world is
different in the dark: animals see trees and companions over the E2a sight interpolation, eat and walk at daylight
rates. The weight states the outcome "stay in the nest while it is dark", like `nestNightBonus` (which the E0 ledger
counts as an outcome-encoding bonus). The E0 rules classed it *design* (rule 8, a score weight); this stage reclasses it
as outcome-encoding (`scripts/lib/prescriptions.ts`), counted while `rhythmSleep` is 1 and `darkCost` is not. So every
earlier arm with `rhythmSleep` 1 counts one more prescription than reported (E2b's 139 becomes 140).

New switch `darkCost` (0 = E2a/E2b, bit-identical; needs `rhythmSleep`).

## 2. Mechanism (`darkCost` 1)

### 2.1 Light at the animal

Open-sky illuminance on a horizontal surface from the sun's geometric altitude h, the U.S. Naval Observatory sky model
(janiczekDeYoung1987; read as transcribed in the `skylight` R package): `E_sky = skyLuxSun · T(h') + skyLuxNight`, with
h' the refracted altitude and T the direct-plus-scattered transmission of the model's air mass. Cloud removes the share
the E2a heat balance already uses (`1 − 0.75·cloud^3.4`, kastenCzeplak1980). The moon is not modelled.

The light at height y under the canopy is `E_sky × share(y)`, share rising linearly from `rhythmShadeGround` (0.02) on
the floor to `rhythmShadeCrown` (0.5) at `rhythmCanopyM` (25 m): the E2a profile, unchanged.

### 2.2 Vision

Relative visual acuity at retinal illuminance T (trolands): `a = 1 / (1 + (K / T)^n)`, K = 23.4 td, n = 0.48, a
least-squares fit to shlaer1937 Table I column II (24 points from 0.004 to 10⁵ td, free fixation, so the most sensitive
retina is used at each level; rms error 0.055 log units). T = lux × 1.2 (reflectance 0.1 × a dark-adapted pupil of
38 mm² ÷ π; the reflectance is not sourced). Chimpanzee acuity in daylight is close to human (spence1934 and
matsuzawa1990 as cited by adams2017, about 35–60 cycles per degree); how it falls with brightness in chimpanzees was not
verified, so the human curve enters as *assumed*.

Vision v(y) = a(E(y)) ÷ a(E at the same height under the same sky with the sun at `daylightHighDeg`, +12°), capped at 1:
exactly 1 whenever the simulation's daylight is 1, so nothing changes by day.

Computed values (clear sky; minutes from apparent sunrise at 4 min per degree):

| Sun altitude | Min to sunrise | Sky lux | E2a daylight | v floor | v nest (14 m) | Sight on the floor | Pace |
| --- | --- | --- | --- | --- | --- | --- | --- |
| −10° | −37 | 0.04 | 0 | 0.01 | 0.03 | 10.2 m | 0.92 |
| −8° | −29 | 0.35 | 0 | 0.03 | 0.08 | 10.7 m | 0.92 |
| −6° | −21 | 3.0 | 0.03 | 0.07 | 0.20 | 11.9 m | 0.93 |
| −4° | −13 | 24 | 0.10 | 0.19 | 0.41 | 14.6 m | 0.94 |
| −2° | −5 | 170 | 0.22 | 0.38 | 0.65 | 19.6 m | 0.95 |
| 0° | +3 | 980 | 0.35 | 0.64 | 0.84 | 25.9 m | 0.97 |
| +4° | +19 | 3,300 | 0.65 | 0.82 | 0.93 | 30.4 m | 0.99 |
| +12° | +51 | 14,800 | 1 | 1 | 1 | 35 m | 1 |

Vision in the crowns runs well ahead of the E2a daylight scale (0.84 against 0.35 at sunrise), and the floor lags the
crowns by 4–5 minutes of sun.

### 2.3 What vision changes (couplings: design assumptions [L])

- **Feeding.** Fruit intake in a crown and leaf intake on the ground scale with v at the animal's height (fruit is found
  and chosen by sight, ripeness by colour, which needs cones: CIE mesopic range 0.005–5 cd/m², cie2017).
- **Perception.** Sight radius `sightNightM + (sightDayM − sightNightM)·v` at the animal's height: the E2a interpolation
  driven by vision instead of the daylight scale (with its rain, height and age factors unchanged). observe() stays pure
  and local: it reads the perception record as before.
- **Locomotion.** Walking and climbing pace `walkDarkPace + (1 − walkDarkPace)·v`: 0.92 in near darkness (figueiro2011:
  101 against 110 cm/s at 0.015 against 650 lux at the eye, 24 older adults, dark-adapted, indoor path; a lower bound on
  the cost on a forest floor). Climbing safety (falls): no source; not modelled.
- **Valuation.** A trip to a crown d metres away is valued at the pace averaged between now and arrival (floor light) and
  with the vision expected at the crown on arrival (the sun's altitude at arrival at the daylight pace, today's cloud):
  the share of the trip spent feeding becomes `feedH / (walkH + feedH / v_arrival)` with walkH at the light-limited pace
  (the intake-per-hour currency of C13b, with a slower intake rate). Ground foraging is valued × v now. The stake of
  departRace scales with these worths, unchanged otherwise.
- **Risk.** Leopards are absent from Kibale and no leopard predation on chimpanzees is known there (wood2017); lions and
  hyenas enter rarely with no recorded predation. So no predation term. At Taï, where leopards hunt diurnally and
  crepuscularly (jennyZuberbuhler2005; boesch1991: attack risk about 0.3 per chimpanzee-year), such a term would belong.

### 2.4 The nest

`restBase` = the rest score without its fatigue term (0.12 + heat load + sated + injury + caretaker + illness, as now).

- Nest (stay in the own finished nest, or build one): `restBase + rhythmSleepW·S·(1 − daylight)` − the departRace stake.
  A nest is a place to rest that also lets the animal sleep; the darkness weight is gone and safety adds nothing at
  Kibale. No hour and no light threshold appear.
- Rest outside a nest: `restBase`. Under rhythmSleep resting awake does not lower sleep pressure (only sleep in a nest
  does), so the fatigue term (`(1 − energy)·0.9`, the same felt sleepiness) belongs to the nest, not to rest. By day it is
  zero, so daytime rest is unchanged.
- An animal in its own finished nest is not offered rest separately: resting there is staying in the nest.

At night the night menu (unchanged; `rhythmFreeNight` stays 0 in every arm) leaves an animal in its nest only the nest
(and nursing, fleeing, alarm, submission). At dawn every option is open and the nest competes with feeding and travel
whose worth now falls with light.

## 3. Background frugivores: not implemented (no measured rate)

The second piece, removal of ripe fruit by other frugivores as a measured ecological rate, needs a rate measured in the
field independently of chimpanzees: the share of a ripe crop removed per hour, or the residence time of a ripe fruit,
by monkeys, hornbills, barbets, turacos, squirrels and fruit bats, ideally separately for figs. None was found in a
source that could be read (research.md E.18): Kibale papers give ripe fruit as under 0.5% of the fruit standing in a
crown (houle2014) and ripe fruit as the most ephemeral food at monthly resolution (janmaat2016), not a rate; Kakamega
gives visitor counts without fruits per visit or crop sizes (kirika2008, abstract); the papers likely to hold a rate
(Gautier-Hion & Michaloud 1989; Poulsen et al. 2002; Olupot et al. 1998; Korine et al. 2000; the janmaat2014
supplement) were behind paywalls. No rate is invented: `frugivoreLoad` is not added. Consequence, registered here:
nothing in this stage makes figs more contested than other fruit, so **the fig contrast of janmaat2014 is not expected
to emerge**.

## 4. Inputs

| Parameter | Value | Source | Tag |
| --- | --- | --- | --- |
| `skyLuxSun` | 133,775 lux | janiczekDeYoung1987 sky model | assumed (physics) |
| `skyLuxNight` | 0.0005 lux | janiczekDeYoung1987 (starlight and airglow) | assumed (physics) |
| `sightAcuityHalfTd`, `sightAcuityExp` | 23.4 td, 0.48 | fit to shlaer1937 Table I | assumed (human, cross-species) |
| `sightRetinaTdPerLux` | 1.2 td/lux | reflectance 0.1 (not sourced) × 7 mm pupil ÷ π | assumed |
| `walkDarkPace` | 0.92 | figueiro2011 | assumed (human, cross-species) |
| reused | `rhythmShadeGround` 0.02, `rhythmShadeCrown` 0.5, `rhythmCanopyM` 25, `rhythmCloudAtt` 0.75, `rhythmCloudExp` 3.4, `sightDayM` 35, `sightNightM` 10, `daylightHighDeg` 12 | E2a and the field profile | as registered |

None is a departure time, a nesting time or a rate of night activity. The three couplings of §2.3 (intake ∝ v, sight
radius by v, pace linear in v) are design.

## 5. Predictions (registered before any run)

Quick check: field profile, seeds 48 and 7, 30 days after a 30-day burn-in, `--workers 1`. R = `rhythmSleep`,
`rhythmHeat`, `departRace`, `nestLightDecide` 1 (E2b's AL3). T = R + `darkCost`. If time allows, S = R + `energyLedger`,
`ledgerGrowSurplus`, `ledgerNightNurse`, `ledgerInfantIntake`, `ledgerNurseByMilk`, `ledgerDigesta`, `ledgerDrive`, and
ST = S + `darkCost`. Tools: `scripts/rhythm-metrics.ts` (sky lux at departure and the crop left at sunset added for this
stage), `scripts/e-bench.ts --quick`.

Reasoning: at dawn an animal's nest is worth about 0.15 (hungry) to 0.35 (sated) once S has discharged; a breakfast trip
is worth about 0.6 in daylight for a hungry adult (E2b §2). With intake scaled by vision at the crown, a trip passes the
nest when v ≈ 0.25–0.5 for hungry animals, i.e. with the sun at −5° to −3°, 17 to 9 minutes before sunrise. Walking
barely slows (pace ≥ 0.92), and far crowns gain from the better light on arrival.

| Readout | R (expected, ≈ E2b AL3) | T (expected) | Field (never set) |
| --- | --- | --- | --- |
| Departures before sunrise, adult females | 0.03–0.07 | **0.35–0.80: overshoot of T-RHY-3** (0.05–0.35) | 0.18 (Taï) |
| Median departure, min after sunrise | +15 to +20 | −12 to +3 | about 0 (Budongo); +13 to +27 (Taï) |
| Sky lux at departure (median) | 1,000–4,000 | 20–400 | 1–85 lux for great-ape feeding activity (secondary, Erkert as cited by tagg2018) |
| Fig against other crowns | within 3 min | within 3 min (no fig term) | figs earlier |
| Far (≥ 500 m) against near (< 150 m) crowns | within 3 min | far earlier by 0–10 min | far figs earlier; far non-figs later |
| Hungrier classes (lactating) earlier than males | yes | yes | no difference (Budongo) |
| Last nest entry, min after sunset | −5 to 0 | +5 to +25 (no darkness weight at dusk) | males about −25 (Budongo, derived) |
| Active day, all adults | 11 h 35 – 11 h 50 | **12 h 00 – 12 h 30: above T-RHY-1** (10.5–12.0 h) | 11 h 34 males |
| Night out of a nest; m moved per animal-night; night deaths | 0%; ~0; 0 | 0%; ~0; 0 | 1.8% of activity records (tagg2018) |
| Adults out of a nest at solar midnight | 0% | 0% | — |
| Rest share 07:00–19:00 | E2b-like | down 0–3 points (rest lost its dusk sleep term) | — |
| Crop at sunset ÷ sunrise, figs / other | 0.9–1.0 / 0.9–1.0 | unchanged (no frugivores) | — |
| Prescription count | 140 (rhythmDarkW now counted) | 139 | — |
| Fitted / held-out distance | E2b-like | within the noise floor (0.8) on rows scored in both | — |
| Viability | pass | pass | — |

The registered expectation is that darkness by its consequences releases the animals too early in the morning and keeps
them out too late in the evening: at Kibale's light levels vision recovers well before sunrise and fails only after
sunset, and with no predators and nearly undiminished walking nothing else in the dark holds an animal in its nest. If
that is what happens, the darkness weight was standing in for something other than darkness.

## 6. Kill criteria (darkCost stays off, the null is recorded)

1. Viability: a starvation death R does not have; births ÷ deaths below R beyond the seed spread; any death at night.
2. Night safety: night time out of a nest above 5%; adults out of a nest at solar midnight on more than 2% of
   adult-nights; night travel above 10 m per animal-night or above R by more than 5 m.
3. Active day outside 10.5–12 h (T-RHY-1); median start of the last nest more than 90 min from sunset.
4. Held-out distance rises beyond the noise floor (0.8) on rows scored in both runs.
5. With the switch off, any compressed golden hash or the field pin in `tests/sim-track-e.test.ts` moves.

Keep rule (Track E): viability passes, held-out distance does not rise, and the prescription count falls (it does by
construction: 140 → 139). Even then the switch stays off by default until the integrator rules.

## 7. Rule on iteration

At most three iterations. No input is moved to hit a benchmark; no weight is tuned to a rate. Each change of mechanism is
logged below, with its reason, before its run. A miss is a finding.

## 8. Results

Quick check throughout: field profile, seeds 48 and 7, 30 days after a 30-day burn-in, `--workers 1`, simulation truth
(`scripts/rhythm-metrics.ts`) and `scripts/e-bench.ts --quick`; outputs in `artifacts/validation/e2c/` (not tracked).
The reference reproduces E2b's AL3 exactly (fitted 5.965, held-out 2.469; 5% of adult females' departures before
sunrise, median +18 min).

### Iteration 1 (the mechanism of §2 as registered)

| Readout | R | T1 (R + darkCost) | Field |
| --- | --- | --- | --- |
| Departures before sunrise, adult females / all adults | 0.05 / 0.03 | **1.00 / 1.00** | 0.18 (Taï) |
| Median departure, min after sunrise (p10–p90) | +18 (+6 to +29) | **−38 (−121 to −13)** | about 0 (Budongo) |
| Fig crowns < 150 / 150–500 / ≥ 500 m: median | 17 / 18 / 18 | −39 / −17 / −39 | far figs earliest |
| Other crowns, same | 18 / 19 / 19 | −15 / −19 / −44 | far non-figs latest |
| Open-sky lux at departure: median; share below 1 lux | 2,700; 0% | **0; 58%** | 1–85 lux (secondary) |
| Last nest entry, min after sunset (median, p90); nests entered per evening | −4 (+14); 1.15 | **+34 (+334); 2.78** | males about −25 |
| Active day, all; males / lactating | 11 h 43; 11 h 41 / 11 h 48 | **15 h 12; 16 h 01 / 14 h 51** | 11 h 34 / 10 h 57 |
| Night out of a nest; m per animal-night; adults out at solar midnight | 0.0%; 0; 0.1% | **15.4%; 752; 18.7%** | 1.8% of activity records |
| Night deaths; all deaths; viability | 0; 0; pass | 0; 0; pass | — |
| Crop at sunset ÷ sunrise, figs / other (median) | 1.00 / 1.00 | 1.00 / 1.00 | — |

Killed (criteria 2 and 3). A diagnostic of seed 48 (3 nights after the burn-in; `artifacts/e2c-diag/`, not tracked)
shows how: animals left their nests at night to drink and to walk to remembered crowns, choices the night menu does not
contain. With rest no longer offered inside the own nest, the night menu of an animal in its nest holds one option, the
nest, and the rules policy treats a menu of fewer than two options as "rules decide" (rg.ts: argmax over the whole,
unfiltered candidate list). The top of that list at night was a drink (thirst keeps rising at night) or a trip whose
crown will be lit on arrival. So most of the night activity came through a hole in the menu machinery that the
reference never reached (rest was always a second option), not through darkness. The substantive part shows in the
departures from about −25 min on, after the night menu releases: trips are valued by the light on arrival, walking is
barely slower (the floor is above Figueiro's 0.015 lux from about −7°), and far crowns win early.

### Iteration 2 (change of mechanism, logged before its run)

**A night or dusk menu with one option is that option (`darkCost` only; rg.ts).** Reason: iteration 1. The night and
dusk menus (unchanged prescriptions of every arm) exist to keep rules-driven animals to what a nesting animal can do;
falling back to the unfiltered list when the menu holds only the nest defeats them, and only `darkCost` produces that
case. No parameter; no other change.

Predictions (T2 = R + darkCost with the fix): night out of a nest back to about 0% (≤ 1%), night travel ≤ 5 m per
animal-night, adults out at solar midnight ≤ 1%; departures now start when the night menu releases (daylight 0.03, sun
about −6.5°, about 23 min before sunrise), far trips first: share before sunrise 0.6–1.0 (**T-RHY-3 overshoot
persists**), median −22 to −5 min, far crowns earlier than near ones by 5–15 min, figs as other fruit; open-sky lux at
departure median 2–200; last nest entry 0 to +30 min after sunset; active day 12 h 00 – 12 h 40 (**above T-RHY-1: killed
on criterion 3 expected**). If so, the dawn departure is set by the night menu's boundary (a design threshold of the
phase menus), not by darkness: the finding the prereg's §5 anticipated.

### Iteration 2 results

T2 = R + darkCost (with the fix). The full Track E stack was run as the extra arm: S = R + `energyLedger`,
`ledgerGrowSurplus`, `ledgerNightNurse`, `ledgerInfantIntake`, `ledgerNurseByMilk`, `ledgerDigesta`, `ledgerDrive`;
ST2 = S + darkCost (same code as T2).

| Readout | R | T2 | S (full stack) | ST2 | Field |
| --- | --- | --- | --- | --- | --- |
| Departures before sunrise, adult females (all adults) | 0.05 (0.03) | **1.00 (1.00)** | 0.00 (0.00) | **0.73 (0.67)** | 0.18 (Taï; T-RHY-3 0.05–0.35) |
| … males / lactating / other females | 0.01 / 0.07 / 0.03 | 1.00 / 1.00 / 1.00 | 0 / 0 / 0 | 0.59 / 0.99 / 0.50 | — |
| Median departure, min after sunrise (p10–p90) | +18 (+6 to +29) | −13 (−14 to −11) | +27 (+18 to +37) | −10 (−14 to +39) | about 0 (Budongo); +13 to +27 (Taï) |
| Figs < 150 / 150–500 / ≥ 500 m: median (share before sunrise) | 17 / 18 / 18 (0.05 / 0.03 / 0.00) | −13 / −13 / −13 (1.0) | 29 / 26 / 26 (0 / 0 / 0.02) | **+11 / −13 / −13 (0.39 / 0.76 / 0.81)** | far figs earlier |
| Other fruit, same | 18 / 19 / 19 (0.04 / 0.03 / 0.02) | −13 / −13 / −13 (1.0) | 28 / 28 / 28 (0) | **+5 / −13 / −13 (0.44 / 0.78 / 0.93)** | far non-figs later |
| Open-sky lux at departure, median (share 1–85 lux) | 2,700 (0.6%) | 24 (95%) | 4,630 (0.1%) | 60 (53%) | 1–85 lux, great-ape feeding (secondary) |
| Last nest entry, min after sunset (median); nests per evening | −4; 1.15 | +14; 1.13 | −11; 1.31 | +12; 1.65 | males about −25 (derived) |
| Active day: all; males / lactating / other females | 11 h 43; 11 h 41 / 11 h 48 / 11 h 42 | **12 h 31**; 12 h 27 / 12 h 40 / 12 h 29 | 11 h 29; 11 h 30 / 11 h 30 / 11 h 28 | **12 h 15**; 12 h 09 / 12 h 33 / 12 h 07 | 11 h 34 / 10 h 57 (T-RHY-1 10.5–12) |
| Night out of a nest; m per animal-night; adults out at solar midnight | 0.0%; 0; 0.1% | 1.5%; **62**; **3.0%** | 0.0%; 0; 0.0% | 1.0%; **38**; **2.6%** | 1.8% of activity records (tagg2018) |
| Night deaths; deaths; starvation | 0; 0; 0 | 0; 0; 0 | 0; 0; 0 | 0; 0; 0 | — |
| Crop at sunset ÷ sunrise, figs / other | 1.00 / 1.00 | 1.00 / 1.00 | 1.00 / 1.00 | 1.00 / 1.00 | — (no frugivores modelled) |
| Rest / feed / travel, 07:00–19:00 | 18.1 / 40.3 / 18.9% | 18.3 / 41.1 / 18.8% | 27.2 / 27.4 / 15.8% | 27.9 / 28.5 / 15.4% | — |
| Fitted / held-out distance | 5.965 / 2.469 | 2.487 / 24.448 | 3.635 / 3.503 | 3.468 / 6.822 | — |
| … on rows scored in both, against R or S | — | −0.573 / **+22.479** | — | +0.370 / **+3.819** | noise floor 0.8 |
| Prescription count (rhythmDarkW counted) | 140 | **139** | 140 | **139** | — |
| Viability | pass | pass | pass | pass | — |

Held-out rises come from T-FOOD-10 (the field observer's share of departures before sunrise: 0.00 → 1.00 in T2, +3.18;
0.00 → 0.98 in ST2, +2.74) and T-HUN-4 (a male-count ratio of hunting that swings between runs: +18.8 in T2, +1.0 in
ST2).

Diagnostic (seed 48, 5 nights after the burn-in, `artifacts/e2c-diag/night2.ts`): the night activity that remains is
three quarters juveniles of 5–15 years (4,792 of 6,505 animal-ticks out of a finished nest at night), drinking, walking
to a crown that will be lit on arrival, resting and finishing a nest. Animals under 8 are decided by the argmax rules,
which the night menu has never filtered; in every earlier arm the darkness weight kept them in their nests.

Reading:
- **The fix worked**: night activity fell from 15% to 1.0–1.5% of night time. It did not fall to the reference's 0:
  juveniles are not covered by the night menu, and nothing physical holds them. Killed on criterion 2 (adults out at
  solar midnight 2.6–3.0%; 38–62 m moved per animal-night).
- **Dawn**: on the timer-needs reference every adult leaves at the first decision after light arousal cuts the dark nest
  bout (daylight 0.1, 13 minutes before sunrise; E2a's design threshold). The nest is worth the rest score (about 0.15
  after a night's sleep), and a breakfast trip at the vision the crowns have then (0.4) is worth more. On the full stack
  (where adults other than lactating females are less hungry) departures split: hungry animals and far crowns go at
  the arousal, sated animals and near crowns wait until 0–50 min after sunrise. **Far crowns are left for earlier than
  near ones** (figs +11 → −13 min, other fruit +5 → −13 min), the janmaat2014 direction for figs, through the light
  expected on arrival; **far non-figs are not later**, and figs are not earlier than other fruit (nothing makes figs
  more contested; §3).
- **Light at departure** falls to 24–60 lux (median), inside the 1–85 lux range quoted for great-ape feeding activity
  (secondary), against 2,700–4,600 lux in the references.
- **Dusk**: without the darkness weight animals nest after sunset (+12 to +14 min), and the active day is 12 h 15 –
  12 h 31, above T-RHY-1. Killed on criterion 3.
- **The registered expectation held** (§5): the measurable consequences of darkness at Kibale (vision recovers in the
  crowns about 15 minutes before sunrise; walking slows by under 10% down to 0.015 lux; no predators) do not keep a
  chimpanzee in its nest until about sunrise, nor bring it back before sunset. Departure time is then set by the light
  arousal threshold and the night menu boundary, both design values of E2a, not by darkness.

Iteration 3 was not run. The two remaining failures are not of a kind a darkness mechanism with sourced inputs can
address: (1) the juveniles' nights would be fixed by extending the night menu to the argmax rules, i.e. by widening a
prescription, which is the opposite of this track; (2) the timing needs a reason to stay in the nest when it is light
enough to see, and no further physical consequence of darkness with a measured value was found (falls in poor light:
no source; walking below 0.015 lux: no source; predators: absent at Kibale).

## 9. Verdict

| Switch | Result | Decision |
| --- | --- | --- |
| `darkCost` | Removes `rhythmDarkW` (prescriptions 140 → 139). Night safety fails (juveniles out of the night menu wander; adults out at solar midnight 2.6–3.0%), the active day is 12 h 15 – 12 h 31 (T-RHY-1 above), T-RHY-3 overshoots (0.73–1.00), held-out distance rises (T-FOOD-10). Viability passes. Far crowns earlier than near ones on the full stack | **off: null** under the kill criteria (2, 3, 4). Kept in the code as an ablation switch |

What the darkness weight stood for. Not darkness: the physics and physiology of light at Kibale leave a chimpanzee able
to see and walk well enough to feed from about 15 minutes before sunrise until about 15 minutes after sunset. The
field departure at about sunrise (Budongo) and nesting before sunset need another cause. Candidates, none modelled:
an endogenous circadian sleep gate (the two-process model's process C, which E2a replaced with the light-masking of
sleepiness); safety from falls when climbing down or building in poor light; predation risk where leopards live (Taï:
boesch1991, jennyZuberbuhler2005), which would act through the expected cost of moving, not through a weight.

Biggest open problem: the nest's value in light. With rhythmDarkW gone, a nest is worth only the rest score once sleep
pressure has discharged, so any meal beats it at first light; nothing physical in the model makes an animal stay in a
nest in twilight or go to one before dark. Second, there is still no measured rate of fruit removal by other
frugivores, so figs cannot be ephemeral by the forest's clock; the fig contrast of janmaat2014 needs that rate first
(Gautier-Hion & Michaloud 1989, Poulsen et al. 2002, Olupot et al. 1998 and the janmaat2014 supplement are the likely
sources, all behind paywalls).
