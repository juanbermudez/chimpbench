# Stage E2d pre-registration: a circadian sleep gate (process C)

Written 1 October 2026, before the first run of the changed model. Track E rule: field values of behaviour are targets,
never inputs. Only physiology or physics measured independently of the behaviour may be a parameter.

Scope: the open problem E2c left (`docs/staging/e2c-prereg.md` §9): with the darkness weight gone, nothing makes a nest
worth staying in once it is light enough to see, or worth going to before dark. E2a built process S of the two-process
model of sleep regulation and stood in for process C with the light masking of sleepiness, `S × (1 − daylight)`, and the
darkness weight `rhythmDarkW`. This stage adds process C as physiology: an endogenous oscillator entrained by the light
each animal sees, gating sleep through the two-process thresholds. Branch `e2d-circadian` (from `track-e`; every Track E
switch off by default). Sources: research.md E.21 (this stage), E.17 (E2b), E.20 (E2c).

## 1. The prescription removed

`rhythmDarkW` (2.2, E2a; counted as outcome-encoding since E2c): the nest's value `(1 − daylight)·(rhythmSleepW·S +
rhythmDarkW)`. New switch `rhythmCircadian` (0 = E2a/E2b/E2c, bit-identical; needs `rhythmSleep`). With it on:

- `rhythmDarkW` is not read (prescriptions 140 → 139 on the reference stack, as with darkCost);
- E2a's light masking of felt sleepiness (`S × (1 − daylight)`) is not used: process C takes its place;
- E2a's light gate on building a new nest (`daylight < 1`) is not used: the nest is offered at any light and its value
  decides. The gate is not a weight, but with a sleep term that is large before dusk it would set the nesting time, so
  it is taken out to test C alone.

## 2. Mechanism

### 2.1 Process C: an oscillator per animal, entrained by the light it sees

The human circadian pacemaker model of forger1999 (equations and values as in crodelle2023, FT), per individual, in
chimp.sim (`cx`, `cxc`, `cn`):

- dx/dt = (π/12)(x_c + B); dx_c/dt = (π/12)[μ(x_c − 4x_c³/3) − x((24/(0.99669·τ))² + kB)]
- B = G(1 − n)·α(I)·(1 − s·x)(1 − s·x_c); α(I) = α₀(I/I₀)^p; dn/dt = α(1 − n) − βn (per minute)
- x is the core-temperature rhythm (its minimum the temperature minimum), amplitude about 1.

Light at the eye I (lux) = open-sky illuminance from the sun's altitude under the day's cloud (E2c's sky model,
`skyLux`) × the share of open-sky light at the animal's height (E2a's canopy profile, `canopyShare`), and 0 while asleep
(eyes closed; design assumption, as in the human models). The oscillator never reads the hour: only the sun's altitude
and the cloud, through the light at the animal.

Integration each 15-s tick: Euler for x and x_c; n relaxes exactly toward α/(α + β). Initial state at an animal's first
tick with the switch on: a newborn takes its mother's state (the fetal clock is entrained by the mother; design); any
other animal takes the state of a 20-day entrainment run under the sun model before that moment (floor light while
awake, eyes closed while asleep; S and the sleep latch of §2.2 run alongside; clear sky). The run's length and exposure
are design; the 30-day burn-in removes what is left of them.

Per individual, not per community: animals see different light (floor against crown) and close their eyes at different
times. The cost is three numbers and a few operations per animal per tick.

### 2.2 The sleep gate: the two-process thresholds

Sleep pressure S is E2a's process S (rise τ 18.2 h awake, decay τ 4.2 h asleep). Following daan1984 (as given in
skeldonDijk2025), C(t) = x(t) modulates two thresholds:

- H⁺ = H₀⁺ + a·x (sleep onset), H⁻ = H₀⁻ + a·x (waking); H₀⁺ 0.67, H₀⁻ 0.17, a 0.12 (human standard values).
- A sleep latch per animal (`asl`): it turns on when S ≥ H⁺ and off when S ≤ H⁻.
- **Asleep = latch on and in its own finished nest (or riding in its mother's nest).** Only sleep discharges S: an
  animal lying awake in a nest builds sleep pressure (E2a discharged S whenever an animal was in a finished nest).

### 2.3 An asleep animal does not decide

While asleep its nest bout is held: no bout ends, so there is no decision point from the bout. Waking (the latch turning
off while in the nest) is a decision point. Interrupts (alarms, aggression, a storm) still reach a sleeping animal as
they do now; if it leaves its nest it is awake, and with the latch still on its nest is worth the most it can be (§2.4).

### 2.4 Values

- Felt sleepiness q = 1 while the latch is on; otherwise the position of S between the thresholds,
  q = clamp((S − H⁻)/(H⁺ − H⁻), 0, 1): 0 just after waking, 1 at sleep onset (skeldonDijk2025: distance from the upper
  threshold measures sleepiness during wake). The energy readout is 1 − q (speed, play, model packet, intention buckets).
- **Nest** (stay in its own finished nest, or build one): restBase + rhythmSleepW·q, minus E2b's race stake.
  restBase is the rest score without its fatigue term (as in E2c §2.4). rhythmSleepW is E2a's 0.9, unchanged.
- **Rest** outside its own finished nest: restBase (resting awake does not discharge S, so it carries no sleep term).
  An animal in its own finished nest is not offered rest separately: resting there is staying in the nest (as E2c).
- A new nest is offered when its value exceeds 0.25 (the existing threshold of `offerOwnNest`), at any light (§1).
- A night or dusk menu left with one option is that option (E2c iteration 2, extended to this switch): without rest in
  the nest, the night menu of an animal in its nest holds the nest alone, and the rules policy would otherwise fall back
  to the unfiltered argmax.

### 2.5 What does not change (so the result is not misread)

The night and dusk menus for rules-driven animals of 8 y and older (`rhythmFreeNight` stays 0); nest bouts by light for
awake animals (E2a's re-decision cadence: 60–100 min in the dark, 4–9 min in changing light, the day bout in full light);
light arousal of awake animals in nests; `nestLightDecide`; `departRace`; the darkness terms in the candidate code keyed
on daylight < 0.1 (climb −2, groom and play −1.5, no party follow, no contests) and the nest-in-rain-at-night term
(+0.3). Animals under 8 are decided by the argmax rules, which no menu filters.

## 3. Inputs

| Parameter | Value | Units | Source | Tag |
| --- | --- | --- | --- | --- |
| `circTauH` | 24.2 | h | forger1999 via crodelle2023; human mean 24.18 (czeisler1999); rhesus 23.4–25.1 (masudaZhdanova2010) | assumed (human; no chimpanzee value exists) |
| `circMu` | 0.23 | — | forger1999 via crodelle2023 | assumed (human) |
| `circK` | 0.55 | — | same | assumed (human) |
| `circG` | 33.75 | — | same | assumed (human) |
| `circAlpha0` | 0.05 | per min | same | assumed (human) |
| `circP` | 0.5 | — | same | assumed (human) |
| `circI0` | 9,500 | lux | same | assumed (human) |
| `circBeta` | 0.0075 | per min | same | assumed (human) |
| `circSens` | 0.4 | — | same (the sensitivity modulator) | assumed (human) |
| `circHUpper` | 0.67 | S units | daan1984 via skeldonDijk2025 | assumed (human) |
| `circHLower` | 0.17 | S units | same | assumed (human) |
| `circAmp` | 0.12 | S units | same | assumed (human) |
| `circEntrainD` | 20 | days | length of the entrainment run that sets the initial state | design |
| reused | `rhythmSleepRiseH` 18.2, `rhythmSleepDecayH` 4.2, `rhythmSleepW` 0.9, `skyLuxSun`, `skyLuxNight`, `rhythmCloudAtt`, `rhythmCloudExp`, `rhythmShadeGround`, `rhythmShadeCrown`, `rhythmCanopyM` | | E2a, E2c | as registered |

None is a nesting time, a waking time, a departure time or a rate of night activity. Not used, on purpose: a chimpanzee
sleep duration to shift the thresholds (captive chimpanzees sleep 8.8–9.7 h, videan2005, bert1970, against the model's
8.1 h; moving the thresholds to that value would be a fit, and the timing it changes is the readout).

## 4. What process C predicts on its own (computed before any run of the simulation)

An offline integration of the oscillator and the two thresholds alone (the simulation's sun model and sky illuminance,
no behaviour; scratch script, not part of the repository): Kibale light, eyes open while awake (at floor level by day, 2% of open sky; at nest height, 14 m, after sunset), closed
while asleep; steady state after 40 days.

| τ (h) | Sleep onset vs sunset | Waking vs sunrise | Sleep | Temperature minimum (x min) |
| --- | --- | --- | --- | --- |
| 24.2 (registered) | +97 min | −128 min | 8.2 h | 01:00, 5.6 h before sunrise |
| 23.9 (sensitivity) | +45 min | −184 min | 8.2 h | 00:07 |
| 24.5 (sensitivity) | +157 min | −66 min | 8.2 h | 02:02 |

Light at crown height instead of the floor moves these by 2 min or less; a cloudy sky (0.9) by 3–5 min. With τ 24.2,
felt sleepiness q (§2.4) is 0.07 at 07:30, 0.21 at 12:30, 0.45 at 15:30, 0.56 at 16:30, 0.67 at 17:30, 0.79 at 18:30
(sunset 18:47) and 0.90 at 19:30, so the nest is worth about 0.55 at 15:30, 0.75 at 17:30 and 0.86 at sunset. An adult's
best food option at mean hunger (about 0.35) is worth about 0.4–0.6 before its costs.

Compare (targets, never set): captive chimpanzees under natural light retire 15–30 min after sunset and rise 45–60 min
before sunrise, sleeping 8.8 h of 10.3 h retired (videan2005); wild Budongo animals leave the nest at about sunrise
(batesByrne2009); Taï females 18% before sunrise (janmaat2014); humans under natural light have melatonin onset near
sunset (wright2013) and fall asleep 2.5–4.4 h after it (yetish2015).

So process C with human values places sleep inside the night (onset about 1.5 h after dark, waking about 2 h before
dawn), but felt sleepiness rises steadily from noon: the cosine C peaks about 13:00, 6 h before sunset.

## 5. Arms and predictions

Quick check: field profile, seeds 48 and 7, 30 days after a 30-day burn-in, `--workers 1`. Tools: `scripts/rhythm-metrics.ts`
(readouts added for this stage: night time out of a nest, metres per animal-night and out at solar midnight for juveniles
of 5–15 y apart from adults; sleep onset and waking relative to sunset and sunrise, hours asleep, and the time of the
oscillator's minimum) and `scripts/e-bench.ts --quick`.

- R = `rhythmSleep`, `rhythmHeat`, `departRace`, `nestLightDecide` 1 (E2b's AL3, E2c's R).
- T = R + `rhythmCircadian`.
- TD = R + `rhythmCircadian` + `darkCost` (C with darkness's measured consequences, E2c).
- If time allows, S = R + `energyLedger`, `ledgerGrowSurplus`, `ledgerNightNurse`, `ledgerInfantIntake`,
  `ledgerNurseByMilk`, `ledgerDigesta`, `ledgerDrive`, and ST = S + `rhythmCircadian`.

| Readout | R (expected, ≈ E2c R) | T (expected) | TD (expected) | Field or captive (never set) |
| --- | --- | --- | --- | --- |
| Sleep onset vs sunset; waking vs sunrise (adults, median) | — | +60 to +130 min; −160 to −90 min | as T | captive: retire +15–30, rise −45 to −60 |
| Hours asleep per night | — | 7.5–8.5 h | as T | 8.8 h (captive video), 9.7 h of a 14-h EEG night |
| Start of the last nest, min before sunset (median) | about 10 | **60–180 (too early)** | 60–180 | T-RHY-4 −30 to +90; captive retire after sunset |
| Last nest entry vs sunset (median) | about −4 min | −150 to −40 min | −150 to −40 min | males about −25 (Budongo, derived) |
| Nest entries per evening | about 1.15 | 1.3–2 (leaving to feed and returning while awake) | 1.3–2 | — |
| Departure vs sunrise (median); share before sunrise, adult females | +18 min; 0.05 | −20 to −5 min; **0.7–1.0** (light arousal at daylight 0.1, after the night menu) | −15 to +10 min; 0.4–0.9 | about 0 (Budongo); 0.18 (Taï; T-RHY-3 0.05–0.35) |
| Active day, all adults | 11 h 43 | 10 h 00 – 11 h 30 | 10 h 00 – 11 h 30 | T-RHY-1 10.5–12 h |
| Lactating − male active day | +7 min | positive (hungrier animals nest later) | positive | −37 min |
| Night out of a nest, adults | 0.0% | 0–1% (the night menu holds awake adults) | 0–1% | 1.8–3.3% of activity records |
| Night out of a nest, juveniles 5–15 y | about 0% | **2–8%**: awake from about 04:30 in the dark, outside the menu, food at its daylight worth | 0.5–3% (food worthless in the dark; drinking is not) | — |
| Night travel, m per animal-night: adults / juveniles | 0 / 0 | 0–5 / **20–100** | 0–5 / 5–30 | — |
| Out of a nest at solar midnight: adults / juveniles | 0.1% / 0% | 0% / 0% (asleep) | 0% / 0% | — |
| Night deaths; deaths | 0; 0–2 | 0; 0–2 | 0; 0–2 | — |
| Prescription count | 140 | 139 | 139 | — |
| Fitted / held-out distance | E2c-like | held-out up by T-FOOD-10 (departures before sunrise) | same | noise floor 0.8 |
| Viability | pass | pass | pass | — |

Registered expectation: process C with the human pacemaker and thresholds gives sleep a place in the night but not the
nest: sated animals nest hours before sunset because felt sleepiness is high from mid-afternoon, and between waking
(about 2 h before sunrise) and dawn nothing but the night menu holds an animal that is awake. T is expected to be killed
on night safety (juveniles), TD possibly on the active day; both on the nest-building time if nests start more than
90 min before sunset.

## 6. Kill criteria (the switch stays off and the null is recorded)

1. Night safety (night = daylight ≤ 0.03): time out of a nest above 3.3% (the field's upper value: 1.8% of camera-trap
   activity across 22 sites, tagg2018; 3.3% of forest clips at Sebitoli, lacroux2022) for adults or for juveniles of
   5–15 y, each on its own; adults or juveniles out of a nest at solar midnight on more than 2% of animal-nights; night
   travel above 10 m per animal-night (adults or juveniles) or above R by more than 5 m; any death at night.
2. Viability: a starvation death R does not have; births ÷ deaths below R beyond the seed spread.
3. Active day (all adults) outside 10.5–12 h (T-RHY-1); median start of the last nest more than 90 min from sunset.
4. Held-out distance rises beyond the noise floor (0.8) on rows scored in both runs.
5. With the switch off, any compressed golden hash or the field pin in `tests/sim-track-e.test.ts` moves.

Keep rule (Track E): viability passes, held-out distance does not rise, and the prescription count falls (140 → 139 by
construction). Even then the switch stays off by default until the integrator rules.

## 7. Rule on iteration

At most three iterations. No input is moved to hit a benchmark; no weight is tuned to a rate. Each change of mechanism is
logged below, with its reason, before its run. A miss is a finding.

## 8. Results

Quick check throughout: field profile, seeds 48 and 7, 30 days after a 30-day burn-in, `--workers 1`, simulation truth
(`scripts/rhythm-metrics.ts`) and `scripts/e-bench.ts --quick`; outputs in `artifacts/validation/e2d/` (not tracked).
The reference reproduces E2c's R (fitted 5.965, held-out 2.469; 5% of adult females' departures before sunrise, median
+18 min). Prescription counts are the ledger's current ones (R 116; E2c's 140 was counted before later audits).

**Measurement fix (before reading any arm).** `rhythm-metrics.ts` counted the first measured tick (06:30, right after a
whole-day burn-in) as a solar midnight, because it started with "the sun was not rising". Animals already up at 06:30
were then counted as out of a nest at midnight, and that night twice. Under T1 and TD1, where adults leave at 06:27,
this produced "adults out at solar midnight 3.1–3.2%"; with the fix it is 0.0%. **E2c's "adults out at solar midnight
2.6–3.0%" (T2, ST2, departures at −13 and −10 min) was very likely the same artefact**; its other night readouts (night
time out of a nest, metres per night) are not affected. All arms below are the corrected metric (commit dd7b751).

### Iteration 1 (the mechanism of §2 as registered; commit 5c8a410)

| Readout | R | T1 (R + rhythmCircadian) | TD1 (T1 + darkCost) | Field or captive |
| --- | --- | --- | --- | --- |
| Sleep onset vs sunset; last waking vs sunrise (adults, median, p10–p90) | — | +101 (97 to 105); −123 (−128 to −120) min | +102; −122 min | captive: retire +15–30, rise −45 to −60 |
| Hours asleep per night | — | 8.17 | 8.17 | 8.8 h (captive video); 9.7 h of 14 (captive EEG) |
| Temperature minimum (oscillator minimum) vs sunrise | — | −334 min (01:05) | −333 min | — |
| Start of the last nest, min before sunset (median) | 9 | 46 | 45 | T-RHY-4 −30 to +90: R, T1, TD1 inside |
| Last nest entry vs sunset (median) | −4 | −41 | −40 | males about −25 (derived) |
| Nests entered per afternoon and evening | 1.15 | **4.10** | **3.90** | — |
| Nest, rest, groom (07:00–19:00, adults) | 3.7%, 18.1%, 16.4% | **34.7%, 6.1%, 8.2%** | **32.3%, 5.8%, 9.0%** | — |
| Departure vs sunrise, adult females (median); share before sunrise | +15 to +19; 0.05 | −13; **0.71** | −13; **0.78** | about 0 (Budongo); 0.18 (Taï; T-RHY-3 0.05–0.35) |
| Active day, all adults (mean) | 11 h 43 | **9 h 17** | **9 h 40** | T-RHY-1 10.5–12 h |
| Active day, males / lactating (lactating − male) | 11 h 41 / 11 h 48 (+7) | 8 h 36 / 10 h 40 (+124) | 8 h 56 / 10 h 55 (+119) | 11 h 34 / 10 h 57 (−37) |
| Night out of a nest, adults; m per adult-night; out at solar midnight | 0.0%; 0; 0.0% | 0.2%; 1; 0.0% | 0.1%; 0; 0.0% | 1.8–3.3% of activity records |
| Night out of a nest, juveniles 5–15 y; m per juvenile-night; out at solar midnight | 0.0%; 0; 0.0% | **4.6%; 167**; 0.0% | **4.1%; 282**; 0.0% | — |
| Juveniles out of a nest at 04, 05, 06 h | 0, 0, 0% | 10.6, 30.0, 29.9% | 9.4, 26.7, 28.7% | — |
| Open-sky lux at departure (median) | 2,700 | — | 24 | 1–85 lux for great-ape feeding (secondary) |
| Night deaths; deaths; viability | 0; 0; pass | 0; 0; pass | 0; 0; pass | — |
| Fitted / held-out distance | 5.965 / 2.469 | 1.671 / 5.309 | 2.692 / 4.968 | — |
| … on rows scored in both, against R | — | −1.893 / **+2.840** | −3.051 / **+2.499** | noise floor 0.8 |
| Prescription count | 116 | 115 | 115 | — |

Held-out rises come from T-FOOD-10 (the field observer's share of departures before sunrise: 0.00 → 1.00, +3.18 in
both); fitted falls come from rows that swing between runs (T-HUN-2, T-COM-11, T-SOC-9) and are within seed noise.

Reading:
- **Process C behaves as computed in §4**, to the minute: sleep starts 101 min after sunset and ends 122 min before
  sunrise, 8.2 h a night, with the temperature minimum at about 01:00. During the sleep episode no animal acts: from
  21:00 to 04:00 not one tick out of a nest, juveniles included, with no darkness weight and no night menu needed.
- **The night outside the sleep episode is not held.** Adults are held by the night menu (a prescription, unchanged).
  Juveniles under 8, whom no menu filters, wake with everyone at about 04:40 and leave: 10–30% of juvenile time out of
  a nest from 04:00 to sunrise, 167 m a night feeding in crowns (T1) or 282 m walking toward crowns that will be lit
  on arrival (TD1; E2c's walking pace in the dark is a floor taken from humans at 0.015 lux, far brighter than a forest
  floor under starlight). Killed on criterion 1, as predicted.
- **Day nests.** With a sleep term on the nest that is above zero all afternoon (q 0.2–0.7) and none on rest, and the
  nest offered at any light, resting animals build nests by day: a third of adult daytime is spent in day nests, rest
  falls from 18% to 6% and grooming from 16% to 8%. The departure and active-day readouts (last exit from a nest
  before noon, last entry after noon) then measure day nests: the active day falls to 9 h 17 – 9 h 40 and the class
  contrast is meaningless. Killed on criterion 3. This is an artefact of the iteration-1 offer rule (§2.4), not of
  process C: under the two-process model no sleep can start by day (S stays below the upper threshold), so a day nest
  gives nothing a rest on the ground does not.
- **Evening.** The median start of the last nest is 45–46 min before sunset (inside T-RHY-4), from sleepiness alone:
  q reaches 0.7–0.8 in the last hour of daylight.
- **Dawn.** Adults leave at the first decision after the night menu releases them (light arousal at daylight 0.1,
  13 min before sunrise): 71–78% of adult females' departures are before sunrise (T-RHY-3 overshoot, T-FOOD-10 fails).
  They have been awake for two hours, so nothing in the nest holds them once a choice is offered.
- Kill criteria 1 (juvenile nights), 3 (active day) and 4 (held-out +2.5 to +2.8, T-FOOD-10) are met for both arms.

### Iteration 2 (change of mechanism, logged before its run)

**A new nest is offered only in falling or low light again (E2a's gate, `daylight < 1`), with process C still setting
its value.** Reason: iteration 1. The day nests are an artefact of opening the nest at any light (§2.4) while the
sleep term on it is above zero all afternoon; with E2a's gate the nest differs from E2c's only in its value (process
C's felt sleepiness in place of the light masking), so the two stages compare directly. The gate is not a weight and
is not counted as a prescription (it is E2a's design, kept by E2b and E2c); its role is reported. No parameter; nothing
else changes. Staying in a finished nest is offered at any light, as before.

Predictions (T2 = R + rhythmCircadian, TD2 = T2 + darkCost): sleep as in iteration 1; nests entered per evening
1.05–1.3; nest share of 07:00–19:00 back to R's (3–6%), rest and grooming back near R; start of the last nest 35–50 min
before sunset (most adults start within minutes of the gate opening, about 48 min before sunset, because q is already
0.7 there: the gate will set the evening for sated animals, and that will be reported); active day 11 h 20 – 11 h 45;
lactating − male active day positive (hungrier animals nest later); departures still at −13 min (T-RHY-3 0.6–0.8,
T-FOOD-10 fails); juveniles still out before dawn (4–5%): **killed again on criteria 1 and 4**, and no longer on 3.

Extra arms with the same code, to answer the stage's questions (not mechanism changes): S (the full stack of E2c: R +
energyLedger, ledgerGrowSurplus, ledgerNightNurse, ledgerInfantIntake, ledgerNurseByMilk, ledgerDigesta, ledgerDrive)
and ST2 = S + rhythmCircadian; and T2F = T2 + rhythmFreeNight (night menu off), to see what holds awake adults when the
menu does not: predicted adults out of a nest at night 3–6%, almost all between waking and dawn.
