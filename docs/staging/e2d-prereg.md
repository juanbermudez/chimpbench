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

(to be filled after the runs)
