# Stage E2a pre-registration: daily rhythm from sleep pressure, light and heat

Written 1 October 2026, before the first run of the changed model. Track E rule: field values of behaviour are
targets, never inputs. Only physiology or physics measured independently of the behaviour may be a parameter.

Scope: the sleep and heat half of stage E2 (IMPLEMENTATION_PLAN.md, Track E). Water balance is not in this piece.

## 1. Prescriptive rules removed, and their switches

All three switches are 0 by default in both profiles (compressed and field hashes unchanged).

| Switch | Replaces (no effect when the switch is 1) |
| --- | --- |
| `rhythmSleep` | the nest clock ramp (`nestEveningFromH`, `nestEveningStartH`, `nestEveningEndH`, `nestEveningDrive`, `nestMorningDrive`, `nestMorningDaylightLow/High`, `nestNightBonus`), the `hour >= 12` gate on building a nest, the night nest bout capped at `nestWakeHour`, the 05:30–12:00 morning nest bout, the night rest bonus (+0.4), and the `energy` timers (`energy*PerH`) |
| `rhythmHeat` | the midday rest literal (11:30–14:30, +0.3), the temperature bonus (> 23 °C, +0.1), the midday rest bout (`boutRestMidday*`), and the shelter rule (`rain >= 0.3`, daylight only, `0.2 + 1.6·rain − 0.2·hunger`) |
| `rhythmFreeNight` | the night and dusk menus (`menu.ts PHASE_ACTIONS`) for rules-driven chimps only; models keep them |

## 2. Mechanism

### 2.1 Sleep pressure S (per chimp, 0..1)

The homeostatic process of the two-process model of sleep regulation (Borbély 1982; Daan, Beersma & Borbély 1984):

- awake: `S ← 1 − (1 − S)·exp(−dt / τ_rise)`
- asleep (in a finished nest, or riding in the mother's nest): `S ← S·exp(−dt / τ_decay)`

`c.energy` stays in the contract as the readout: `energy = 1 − S`. There is one fatigue notion, not two. Everything
that read energy (speed, rest score, play, the model packet, the intention gate's fatigue bucket) now reads sleep
pressure.

Value of being in a nest (build, or stay): `rhythmSleepW · S + rhythmDarkW · (1 − daylight)`.

- The first term is the need for sleep. Its weight equals the weight rest already gives fatigue (0.9), so sleepiness
  alone never favours a nest over resting on the spot.
- The second is the value of being off the ground and still when a diurnal ape cannot see. Feeding and travel scores
  do not fall in the dark on their own: perception shrinks sight (10 m at night against 35 m by day in the field
  profile), which removes fruit trees in view, but trips to remembered trees and ground feeding keep their scores.
  So a light term is needed. It is placed on the nest (one term, in the block this stage owns) rather than as a
  penalty on every other act. Its weight is set a priori, not fitted: the largest value a food option can take
  (hunger 1: 1.6 + 0.1 = 1.7) plus three softmax temperatures (3 × 0.164 ≈ 0.5), so that in full darkness a nest
  beats the best meal of a starving animal by a clear margin: 2.2.
- A new nest is offered only while light is below full (`daylight < 1`): falling light is the cue to build.
- No hour appears. Morning and evening differ only through S (high at dusk, discharged at dawn).

Bouts in the nest: in the dark 60–100 min (`boutNestMin/Max`, no cap); in changing light (0.1 < daylight < 1) the
short bout (`boutNestMorning*`, 4–9 min); in full light the day bout. Rising light ends a dark bout early (light
arousal: once daylight passes 0.1 a remaining bout longer than the short bout is cut), so the animal re-decides as
light changes. The animal leaves when the nest's value falls below its best alternative (softmax, as for every act).

### 2.2 Thermal load H (per chimp, −1..1; + is stored heat, − is heat debt)

A lumped heat balance per kg of body mass, each tick:

- production `M = RMR(m) · MET + walk cost · metres walked / dt + climb heat · metres climbed / dt`
  - `RMR = 3.39 · m^−0.25` W/kg (Kleiber); MET 1 at rest, in shelter, grooming, nursing or in a nest, else 1.5
  - metres are the animal's real displacement this tick (carried infants do no work)
- solar gain `Q = 1000 · sin(sun altitude) · (1 − 0.75 · cloud^3.4) · coat fraction · projected area per kg · exposure`
  - exposure: 0.02 on the ground under the canopy, rising linearly with height to 0.5 at canopy height; a resting,
    sheltering, grooming or nesting animal is taken to sit in shade (ground value)
- obligatory loss `L_min = C(m) · wet · (T_body − T_air)`, with `C = 0.224 · m^−0.426` W/kg/°C and `wet` rising from 1
  (dry) to 3 (soaked) with rain; a sheltering animal receives 0.3 of the rain
- capacity `L_max = C(m) · wet · vasodilation · (T_body − T_air) + maximum evaporation`
- if `M + Q > L_max` the surplus is stored; if `M + Q < L_min` the deficit is a debt; in between the body balances
  and stored heat or debt is paid back with the spare capacity. `H` is the stored heat ÷ (specific heat × tolerable
  core change).

Scores: rest gains `rhythmThermW · max(0, H)`; shelter is offered while it rains (≥ 0.12, the level at which a shelter
bout ends) to an animal in heat debt, at `rhythmThermW · max(0, −H)`. `rhythmThermW` equals the hunger weight (1.6):
a full thermal load is worth as much as full hunger (design; not fitted).

### 2.3 Night menu

With `rhythmFreeNight` 1, `rgMenu` does not filter by day phase. The remaining darkness terms in the candidate code
(−2 climb, −1.5 groom and play, no party follow, no contests when `daylight < 0.1`) are keyed on light, not on the
hour, and stay.

## 3. Inputs

Sources not yet in `docs/research.md` are being verified by the parallel sources track ("pending e-sources"); until
then every entry is tagged `assumed` in the registry and carries its source key in the notes.

| Parameter | Value | Units | Source key | Tag (intended after verification) |
| --- | --- | --- | --- | --- |
| `rhythmSleepRiseH` | 18.2 | h | borbely1982 (Daan et al. 1984, human) | assumed |
| `rhythmSleepDecayH` | 4.2 | h | borbely1982 (Daan et al. 1984, human) | assumed |
| `rhythmSleepW` | 0.9 | score | equals rest's fatigue weight | design |
| `rhythmDarkW` | 2.2 | score | max food value + 3 temperatures | design |
| `rhythmMassMaleKg` / `rhythmMassFemaleKg` | 39 / 31.3 | kg | pusey2005 (Gombe) | assumed ([H]) |
| `rhythmBirthMassFrac` | 0.05 | fraction | 1.8 kg ÷ adult mass | assumed |
| `rhythmRmrW` | 3.39 | W/kg^0.75 | kleiber1961 (70 kcal/day/kg^0.75) | assumed ([H], mammals) |
| `rhythmActiveMet` | 1.5 | × RMR | ainsworth2011 (human light activity) | assumed |
| `rhythmWalkJ` | 4.0 | J/kg/m | sockol2007 (≈ 0.20 ml O₂/kg/m) | assumed ([H]) |
| `rhythmClimbEff` | 0.25 | fraction | muscle efficiency of vertical work | assumed |
| `rhythmBodyC` | 37 | °C | primate core temperature | assumed |
| `rhythmHeatCapJ` | 3470 | J/kg/°C | specific heat of body tissue | assumed ([H], physics) |
| `rhythmHeatTolC` | 1.5 | °C | tolerable core change | assumed |
| `rhythmCondW` / `rhythmCondExp` | 0.224 / 0.426 | W/kg/°C at 1 kg / exponent | bradleyDeavers1980 (mammal allometry) | assumed |
| `rhythmVaso` | 3 | ratio | peripheral vasodilation, max ÷ min conductance | assumed |
| `rhythmEvapW` | 1.2 | W/kg | kamberov2018 (human maximum ÷ 10, sweat gland density) | assumed |
| `rhythmWetCond` | 3 | ratio | wet pelage conductance | assumed |
| `rhythmSoakRain` | 0.1 | rain intensity | coat soaked at ~3 mm/h | assumed |
| `rhythmShelterRain` | 0.3 | fraction | rain reaching a sheltering animal | assumed |
| `rhythmSolarW` | 1000 | W/m² | clear-sky irradiance, sun overhead | assumed ([H], physics) |
| `rhythmCloudAtt` / `rhythmCloudExp` | 0.75 / 3.4 | — | kastenCzeplak1980 | assumed ([H]) |
| `rhythmCoatHeat` | 0.5 | fraction | walsberg1983 (dark coat) | assumed |
| `rhythmAreaM2` | 0.025 | m²/kg^(2/3) | Meeh surface 0.1·m^(2/3), a quarter projected | assumed |
| `rhythmShadeGround` | 0.02 | fraction | chazdon1984 (forest understory light) | assumed ([H]) |
| `rhythmShadeCrown` | 0.5 | fraction | — | assumed |
| `rhythmCanopyM` | 25 | m | canopy height | assumed |
| `rhythmThermW` | 1.6 | score | equals the hunger weight | design |

None of these is a nesting hour, a resting hour or a rate of sheltering.

## 4. Benchmarks and expected direction

Measured by `scripts/rhythm-metrics.ts` (field profile, simulation truth) and `scripts/field-metrics.ts`, baseline
against switches on, same development seeds (48, 7, 21; then 48, 7, 21, 5, 11).

| Benchmark | Field value (target, never set) | Expectation with the switches on |
| --- | --- | --- |
| Nest-building time relative to sunset | around sunset (no registered row yet) | median within −60..+15 min; set by the light curve, weakly by S |
| Nest-leaving time relative to sunrise | around sunrise | median within 0..+45 min |
| Nest-to-nest active day | males 11 h 34 min, lactating females 10 h 57 min (batesByrne2009) | 10.5–12 h. **Expected miss on the sex contrast**: nothing in the mechanism shortens a lactating female's day; hunger should lengthen it |
| Hourly activity profile | feeding peaks morning and late afternoon, rest at midday | rest at midday **weaker than baseline**: at 15–24 °C under canopy the heat balance is near neutral for most of the day |
| Midday rest, hot clear vs cool vs rainy days | more rest and more ground use when hot in the sun (kosheleffAnderson2009) | hot clear > cool > rainy; the clock rule gives no contrast |
| Sheltering vs rain | more in heavier rain | rises with rain; less than baseline for adults on the move, more for small animals |
| Night acts outside the nest | rare | under 2% of night chimp-hours with the night menu on |
| Night menu off | — | chimps stay in nests (over 95% of night chimp-hours); a few night acts by very hungry animals; no extra deaths |
| T-ACT-1..4, T-RNG-4 | bands in `data/targets.json` | rest share down, feeding and travel slightly up |
| Viability | births ÷ deaths, starvation deaths | unchanged within seed noise |

## 5. Kill criteria

The switches stay off (and the null is recorded) if any of these holds on the development seeds:

1. Viability: starvation deaths rise, or births ÷ deaths falls beyond the spread between seeds.
2. Active day outside 9–13 h, or median nest building more than 90 min from sunset, or median leaving more than
   90 min from sunrise.
3. Night chimp-hours outside a nest above 5% with the night menu on.
4. With the switches off, any golden hash changes or the field bench slows by more than 5%.

A miss on midday rest or on the sex contrast is not a kill: it is reported, with the physiology that is missing.
`rhythmFreeNight` is judged on its own: it stays off if night time outside nests exceeds 10% or night deaths appear.

## 6. Rule on iteration

No input is moved to hit a benchmark. Changes after the first run are changes of mechanism, each logged below with
its reason before its run.

## 7. Results

(filled in after the runs)
