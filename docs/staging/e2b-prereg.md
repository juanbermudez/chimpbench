# Stage E2b pre-registration: nest departure and the active day

Written 1 October 2026, before the first run of the changed model. Track E rule: field values of behaviour are
targets, never inputs. Only physiology or physics measured independently of the behaviour may be a parameter.

Scope: the two misses E2a left (`docs/staging/e2a-prereg.md` §7): nobody leaves the nest before sunrise (T-RHY-3), and
lactating females do not have the shorter active day. Branch `e2b-departure` (from `track-e`, all Track E switches
off by default). Sources: research.md E.17 (janmaat2014 and batesByrne2009 now read in full; pruetz2018,
montgomeryDowns2010 added).

## 1. What the field says (targets; never set)

| Quantity | Field value | Source |
| --- | --- | --- |
| Departures before sunrise | 18% of adult-female departures (Taï; 5 mothers, fruit-scarce periods) | janmaat2014 |
| Departure relative to sunrise | Taï model intercept +13 min at mean covariates (fig breakfast); non-fig +14 min later. Budongo: males 06:56 ± 32 min, lactating 06:46 ± 13, receptive 06:37 ± 12 (no difference), i.e. about at sunrise (derived) | janmaat2014, batesByrne2009 |
| Breakfast pattern | figs earlier than other fruit; far figs earlier than near figs; far non-fig sites later than near | janmaat2014 |
| Intragroup contest | more adult males at the nest → earlier (with small crops) | janmaat2014 |
| Active day | males 11 h 34 min, lactating females 10 h 57 min (P = 0.049); departures do not differ, so lactating females nest earlier in the evening (about an hour before sunset, derived) | batesByrne2009 |

## 2. Diagnosis of the reference (E2a: `rhythmSleep` 1, `rhythmHeat` 1), unchanged code

From a read-only diagnostic of seed 48 (30-day burn-in, 5 days; `scripts/rhythm-metrics.ts` gives the full reference
in §6):

- The nest's value at dawn is `(1 − L)(0.9·S + 2.2)` with S ≈ 0.03 after the night: 2.0 at daylight L = 0.1, 1.43 at
  sunrise (L ≈ 0.35), 0.66 at L = 0.7. The best alternative is 0.57–0.61 at every dawn light level (hunger 0.52).
  Animals leave when the two cross, at L ≈ 0.6–0.9 (17–52 min after sunrise).
- The darkness weight 2.2 was set in E2a to beat the best meal of a starving animal (1.7) by three temperatures. Before
  sunrise it holds every animal: to leave at L = 0.1 a trip must be worth about 3.3 times a typical breakfast.
- The intention gate (`rgMaxAgeH` 30 min, period changes at L = 0.03 and 0.97) gives one draw before sunrise per
  animal, when light arousal cuts the dark bout at L ≈ 0.1 (about 18 min before sunrise), then about one per 30 min.
- Breakfast crowns (seed 48, 10 days): crop median 0.67 fruit units for figs and 0.50 for other fruit; others feeding
  there when breakfast started p50 0, p90 2; the crop could not feed all of them ((1 + n) × need > crop) on 14% (figs)
  and 29% (other) of breakfasts. Remembered crops at departure: median 0.35. Sim figs carry larger crops (maxFruit
  median 0.9 against 0.7) and have no hetero-specific competitors: the model has no reason to treat figs as
  ephemeral within a day.

## 3. Mechanisms (new switches, 0 = today's behaviour; no other new parameter)

### 3.1 `departRace`: the price of waiting for a contested crop

Leaving the nest is valued like any act: the nest's value against the best alternative. The alternative's value
today ignores that others are eating the same crop while the animal waits. For each feeding option j (a crown in
view, a remembered crown, a community-known crown), the stake of delay is

`G_j = W_j × n_j × lim_j × a_j`

- `W_j`: the option's food worth exactly as the rules compute it now (hunger, believed crop, intake per hour with the
  walk). Nothing in it changes.
- `n_j`: competitors. In view: the others feeding in the crown now. Remembered: the others the animal saw feeding in
  the crown when it last saw it, minus those it sees now (they are here, not there). A new belief record (`treeFeed`,
  ids, chimp.sim) is written where the crop belief (`treeCrop`) is written: on seeing a crown and on leaving one.
- `lim_j = 1 − cover`, with `cover = min(1, C / ((1 + n) · need)) ÷ min(1, C / need)` (C the believed crop, need the
  fruit that would sate the animal): the part of its meal the others take if they eat with it rather than after it.
  This is the share rule of the party-size stage (`crowdByShare`; chapman1995, newtonFisher2000) [M]; 0 when the crop
  feeds everyone.
- `a_j`: whether the competitors will be eating by the time it arrives. 1 for those seen eating now. For remembered
  ones, the daylight expected at its arrival, `L + (d / walkMps) · dL/dt`, where dL/dt is the brightening it perceives
  now (the change of daylight over the last tick, from the sun model); competitors are diurnal (design assumption).
  At night and before the sky starts to brighten dL/dt = 0, so `a_j = L ≈ 0`: no race in the dark.

The nest's value (staying in it or building one) becomes the E2a value minus `max_j G_j`. Nothing else changes.

Why this form (design reading, stated so it can be checked): the rules weigh staying against the whole value of the
meal, so the price of delay is the meal's value. When n others eat the same limited crop at the animal's own rate
while it waits, the meal is lost (1 + n·lim) times as fast as without them, so the stake grows by `n·lim` times the
meal. Design assumptions: competitors eat at the animal's own rate; their feeding follows daylight; the stake acts on
the nest only (the act in question at dawn and dusk). It contains no clock hour, no departure time, no fig rule and
no bonus for leaving early: figs, distance and sunrise appear only through crops, competitors and light.

### 3.2 `nurseWake`: suckling at night wakes the mother

With E1c's night nursing (`ledgerNightNurse`), an infant drinks milk in its mother's nest at night. With `nurseWake` 1
each tick in which it drinks is a waking tick for the mother's sleep pressure (S rises instead of falling; applied on
her next tick). Evidence: postpartum women's sleep is fragmented by night feeding (efficiency 80–90%,
montgomeryDowns2010; cross-species, *assumed*); no chimpanzee measurement. Needs `energyLedger`, `ledgerNightNurse`
and `rhythmSleep`; no effect otherwise. No parameter.

Not added, on purpose: a "lactating females rest longer" term. The other physiology the stage names is already in the
full stack: carrying costs the carrier (E1 `rideTick`), milk costs the mother (E1c/E1d). Both raise her hunger, which
in this model lengthens the day.

## 4. Predictions (registered before any run)

Arms (field profile, seeds 48 and 7, 30-day burn-in + 30 days, `--workers 1`):
R = `rhythmSleep` 1 + `rhythmHeat` 1; A = R + `departRace`; S = R + `energyLedger`, `ledgerGrowSurplus`,
`ledgerNightNurse`, `ledgerInfantIntake`, `ledgerNurseByMilk` (all 1); SN = S + `nurseWake`; SAN = S + `departRace` +
`nurseWake`. Tools: `scripts/rhythm-metrics.ts` (departure and breakfast tables added for E2b; bins < 150 m,
150–500 m, ≥ 500 m), `scripts/e-bench.ts --quick` (R, A, S, SAN).

| Readout | R (expected) | A or SAN against R or S | Field |
| --- | --- | --- | --- |
| Departures before sunrise, adult females | 0.00 | rises, **stays below 0.05 (miss expected)**: leaving at L ≤ 0.35 needs `n·lim·a` ≥ 1.4–2.3, i.e. ≥ 2–3 remembered competitors absent from view at a crop that cannot feed them all, which §2 says is rare | 0.18 (band 0.05–0.35) |
| Median departure, all adults | about +45 min | earlier by 0–10 min | about 0 (Budongo), +13 to +27 (Taï) |
| Contested crowns (others feeding at the start) | — | earlier than uncontested | — |
| Fig against other crown | — | **no fig advantage** (sim figs hold larger crops; no other species competes) | figs earlier |
| Far against near crown | — | far contested crowns earlier than near ones (a rises with distance) | far figs earlier; far non-figs later |
| Evening: last nest entry | about −5 min | 0 to +10 min later (crowds feeding in view at dusk raise the stake) | males about −25 min |
| Active day, all adults | about 11 h 20 min | +0 to +15 min; stays in T-RHY-1 (10.5–12 h) | 11 h 34 min males |
| Night out of a nest, night travel, night deaths | 0%, ~0 m, 0 | unchanged (night menu on; dL/dt = 0 before dawn) | 1.8–3.3% of activity records |
| Lactating − male active day | R: +7 min (wrong sign) | S: more positive (milk and carrying raise hunger); SN: 0 to −10 min against S; **sign stays wrong** | −37 min |
| Mothers' sleep pressure at departure | ≈ 0.03 | SN: 0.05–0.12 | — |
| Viability, deaths | 0–1 deaths | unchanged | — |
| Fitted / held-out band distance | E0-like | within the seed noise floor (rows move up to 0.8) | — |

## 5. Kill criteria (switch stays off and the null is recorded)

1. Viability: a starvation death that R does not have, births ÷ deaths below R beyond the seed spread, or any death at
   night.
2. Active day outside 10.5–12 h; median nest building more than 90 min from sunset; night time out of a nest above 5%.
3. Held-out distance rises beyond the noise floor (0.8) on rows scored in both runs.
4. With the switches off, any golden hash or the field pin in `tests/sim-track-e.test.ts` moves.

Success for the stage: T-RHY-3 inside 0.05–0.35 with the early departures concentrated on contested, distant crowns;
and the lactating contrast with the field's sign, both without (1)–(3). Neither switch removes a prescription, so
neither can pass the Track E keep rule (the count must fall); the result is reported for the integrator.

## 6. Rule on iteration

At most three iterations. No input is moved to hit a benchmark; no weight is tuned to a rate. Each change of mechanism
is logged below with its reason before its run. A miss is a finding.

## 7. Results

Quick check throughout: field profile, seeds 48 and 7, 30 days after a 30-day burn-in, `--workers 1`, simulation truth
(`scripts/rhythm-metrics.ts`) and `scripts/e-bench.ts --quick`; outputs in `artifacts/validation/e2b/` (not tracked).

### Iteration 1 (the mechanisms of §3 as registered)

| Readout | R | A1 (R + departRace) | S (full stack) | SN1 (S + nurseWake) | SAN1 (S + both) | Field |
| --- | --- | --- | --- | --- | --- | --- |
| Departures before sunrise, adults / adult females | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.18 (Taï females) |
| Median departure, min after sunrise (p10–p90) | 45 (19 to 51) | 24 (18 to 49) | 47 (21 to 52) | 47 (22 to 52) | 47 (22 to 52) | about 0 (Budongo); +13 to +27 (Taï) |
| Fig crowns < 150 / 150–500 / ≥ 500 m | 40 / 46 / 46 | 23 / 24 / 21 | 45 / 47 / 47 | 47 / 47 / 47 | 47 / 47 / 48 | figs earlier when far |
| Other crowns < 150 / 150–500 / ≥ 500 m | 41 / 46 / 46 | 23 / 24 / 24 | 47 / 47 / 47 | 47 / 47 / 48 | 47 / 47 / 48 | far non-fig later |
| Last nest entry, min after sunset (median) | −4 | −3 | 0 | −4 | −4 | males about −25 |
| Active day, all adults | 11 h 23 min | 11 h 31 min | 11 h 20 min | 11 h 17 min | 11 h 16 min | T-RHY-1 10.5–12 h |
| Active day, males / lactating (lactating − male) | 11 h 23 / 11 h 29 (+6) | 11 h 30 / 11 h 35 (+5) | 11 h 20 / 11 h 23 (+3) | 11 h 19 / 11 h 13 (−6) | 11 h 19 / 11 h 10 (−9) | 11 h 34 / 10 h 57 (−37) |
| Sleep pressure leaving the nest, lactating / others | 0.02 / 0.02 | 0.03 / 0.03 | 0.02 / 0.02 | **0.72** / 0.02 | **0.72** / 0.02 | — |
| Night out of a nest; m moved per animal-night; night deaths | 0.0%; 0; 0 | 0.0%; 0; 0 | 0.0%; 1; 0 | 0.0%; 0; 0 | 0.0%; 0; 0 | — |
| Deaths (all respiratory outbreak) | 2 | 1 | 0 | 0 | 0 | — |
| e-bench fitted / held-out distance | 5.486 / 3.347 | 3.443 / 4.377 | 3.492 / 2.889 | — | 4.693 / 3.425 | — |
| … on rows scored in both, against R (A1) or S (SAN1) | — | −0.883 / −0.369 | — | — | +0.229 / −0.363 | noise floor 0.8 |
| Prescription count; viability | 139; pass | 139; pass | 139; pass | — | 139; pass | — |

Reading:
- **T-RHY-3 stays at 0.00, as predicted.** The race stake exists (diagnostic, seed 48, adults in nests at dawn: mean
  G 0.07 at L 0.03–0.1, 0.24–0.25 at L 0.35–0.7, above 0.5 in 0–17% of samples) but before sunrise the nest is worth
  1.7–2.3 against a best alternative of 0.6: no stake comes close. The darkness weight, not the food side, holds the
  animals.
- **The median moved from +45 to +24 min with departRace, more than predicted (0–10 min), and the reason is the
  intention gate, not value.** In R and A1 the earliest departures (p10 +18–20 min) and the clusters sit on the gate's
  re-draws: light arousal cuts the dark bout at L ≈ 0.1 (about 18 min before sunrise) and the period changes from night
  to dawn, so the animal draws once; it then keeps its nest intention for `rgMaxAgeH` (30 min) through the short dawn
  bouts, and draws again about 12 min after sunrise and at the dawn-to-morning period change (L = 0.97, about +45 min).
  R's median of +45 min (E2a's "leave when daylight reaches about 0.9") is that period change. The stake turns the
  +12 min re-draw into departures; it cannot act at the −18 min one.
- **No fig or distance effect** (predicted): sim figs carry larger crops and nothing but chimpanzees eats them.
- **On the full stack departRace does nothing** (S 47 against SAN1 47 min): adults are less hungry there (mean hunger
  0.20 against 0.35), so the meal worth W and the stake are small, and 8–10% of mornings have no breakfast before noon.
- **nurseWake: right sign, wrong mechanism.** The lactating − male contrast goes from +3 (S) to −6 and −9 min, but
  mothers leave the nest with a sleep pressure of 0.72 (predicted 0.05–0.12): they are awake most of the night. A
  diagnostic (seed 48, 2 nights after the burn-in) shows why: an infant drinks something in 76% of its mother's night
  ticks, but at half the suckling rate or more in only 3.6%. E1c's night suckling has no bouts: the infant drains the
  milk the gland makes, tick by tick, all night. Counting every such tick as waking makes the mother 4–8 times as
  wakeful as postpartum women (efficiency 80–90%, montgomeryDowns2010).
- Night: no animal leaves its nest at night in any arm; no night deaths; viability passes everywhere. No kill
  criterion is met. e-bench changes are inside the noise floor on rows scored in both runs.

### Iteration 2 (changes of mechanism, logged before their runs)

1. **`nestLightDecide` (new switch; T-RHY-3, second attempt).** In changing light (0 < daylight < 1) an animal in its
   own finished nest re-decides at the end of every nest bout: the intention gate does not keep a nest intention
   across bouts while the light changes (rg.ts). Reason: iteration 1 shows the dawn departure is set by the gate's
   re-draws (the 30-min maximum intention age and the period boundaries at daylight 0.03 and 0.97), which defeats
   E2a's own design (short bouts in changing light "so the animal re-decides as light changes"). Changing light is the
   salient change for a diurnal animal waking in a nest. No parameter; dusk is covered by the same rule.
   Predictions: R + `nestLightDecide` (RL): median departure +15 to +25 min (the value crossing at L ≈ 0.65–0.7),
   p10 earlier than +18; before sunrise 0.00–0.01; last nest entry 0 to +10 min later and more nests per evening (the
   value of staying at dusk is close to the alternatives at L ≈ 0.9). R + departRace + `nestLightDecide` (AL): median
   +5 to +20 min; before sunrise 0.01–0.05, still below the band (the darkness weight holds); no fig effect; far
   contested crowns no earlier than near ones by more than 5 min.
2. **`nurseWake`, second definition (lactating contrast, second attempt).** A waking tick is one in which the infant
   drinks from a gland that can sustain the suckling rate (not empty by E1d's own end-of-bout test, `glandEmpty`, before
   the drink): a feed. Draining the synthesis of an empty gland, which E1d ends by day, does not count. Predictions
   (S + `nurseWake`, SN2): mothers' sleep pressure leaving the nest 0.03–0.08; the lactating − male contrast within
   ±5 min of S (+3); the field's −37 min not reached. Full stack with all three (SALN2): as SN2 for the contrast and
   as AL, smaller, for departures (lower hunger).

Arms: RL, AL, SN2, SALN2 with `scripts/rhythm-metrics.ts`; AL and SALN2 also with `scripts/e-bench.ts --quick`.

### Iteration 2 results

| Readout | RL2 (R + nestLightDecide) | AL2 (R + departRace + nestLightDecide) | SN2 (S + nurseWake, feeds) | SALN2 (S + all three) | Field |
| --- | --- | --- | --- | --- | --- |
| Departures before sunrise, adult females (seed 48 / 7) | 0.011 (0.014 / 0.008) | **0.055 (0.051 / 0.059)** | 0.000 | 0.002 | 0.18 (band 0.05–0.35) |
| … males / lactating / other females | 0.00 / 0.02 / 0.00 | 0.01 / 0.07 / 0.04 | 0 / 0 / 0 | 0 / 0 / 0 | — |
| Earliest departure, min after sunrise | −9 | −15 | — | — | Taï: twilight |
| Median departure (p10–p90) | 25 (14 to 34) | 19 (6 to 30) | 47 (21 to 51) | 28 (19 to 38) | about 0 (Budongo); +13 to +27 (Taï) |
| Fig crowns < 150 / 150–500 / ≥ 500 m | 23 / 26 / 26 | 16 / 18 / 19 | 47 / 47 / 46 | 27 / 29 / 29 | far figs earliest |
| Other crowns < 150 / 150–500 / ≥ 500 m | 24 / 27 / 25 | 19 / 20 / 21 | 47 / 47 / 47 | 27 / 29 / 29 | far non-figs latest |
| Before sunrise: figs by distance; others by distance | 0.02 / 0 / 0; 0.01 / 0 / 0 | 0.06 / 0.04 / 0.04; 0.04 / 0.02 / 0.02 | 0 | 0.00; 0.01 / 0 / 0 | — |
| Last nest entry, min after sunset; nests entered per evening | −4; 1.27 | −3; 1.24 | −3; 1.13 | −1; 1.35 | — |
| Active day, all; males / lactating (difference) | 11 h 37; 11 h 37 / 11 h 40 (+3) | 11 h 45; 11 h 43 / 11 h 51 (+8) | 11 h 18; 11 h 19 / 11 h 20 (+2) | 11 h 35; 11 h 35 / 11 h 37 (+1) | 11 h 34 / 10 h 57 (−37) |
| Sleep pressure leaving the nest, lactating | 0.03 | 0.03 | **0.03** | 0.04 | — |
| Night out of a nest; night deaths; deaths | 0.0%; 0; 0 | 0.0%; 0; 0 | 0.0%; 0; 0 | 0.0%; 0; 0 | — |
| e-bench fitted / held-out (rows scored in both, against R or S) | — | 4.812 / 3.931 (−0.730 / −0.315) | — | 5.459 / 2.172 (+0.560 / −0.216) | noise floor 0.8 |
| Prescriptions; viability | — | 139; pass | — | 139; pass | — |

Reading:
- **Re-deciding in changing light moves departures to the value crossing**, as predicted (RL2: median +45 → +25 min,
  p10 +19 → +14). With the race on as well (AL2), departures come earlier still (median +19, p10 +6) and **5.5% of
  adult females' departures are before sunrise** (both seeds 5–6%): inside T-RHY-3's band at its lower edge, a third of
  Taï's 18%, and none earlier than 15 min before sunrise. They are mostly lactating females (7%), the hungriest
  animals: their meal worth, and so their stake, is largest.
- **The janmaat2014 pattern does not emerge.** Early departures are as common or commoner for near crowns than for far
  ones, and figs differ from other fruit by at most 3 min. Nothing in the model makes a far crown more urgent than a
  near one except the light at arrival, while the meal's worth per hour, which the stake scales with, falls with the
  walk; and nothing makes figs more contested: their crops are larger and no other species eats them.
- **On the full stack the race stays ineffective** (SALN2: 0.2% before sunrise, median +28): adults are sated (mean
  hunger about 0.2) and the stake scales with the meal's worth.
- **Side effect**: nests entered per evening rose from 1.08 to 1.24–1.35. Read at the time as re-nesting at dusk; the
  iteration-3 diagnostic below shows that this readout also counts re-entries at dawn (entries after the previous solar
  noon), so part of the rise was dawn dithering. The last entry does not move.
- **nurseWake with feeds only**: mothers' sleep pressure on leaving the nest is 0.03 (predicted 0.03–0.08); the
  lactating − male contrast is +2 min against +3 on the stack without it. Night feeding, at the rate the model's
  infants feed, costs a mother too little sleep to shorten her day: a null, as predicted. Second attempt on the
  lactating contrast; see the reading in §8.
- No kill criterion is met: no night activity or night deaths, active day 11 h 18 – 11 h 45 (T-RHY-1), nest building
  6–11 min before sunset (T-RHY-4), viability passes, no held-out rise beyond the noise floor on rows scored in both.

### Iteration 3 (change of mechanism, logged before its run)

**`nestLightDecide` reacts to brightening only (T-RHY-3, third and last attempt).** The re-decision at a nest bout's
end applies while the light is rising (the brightening the animal perceives, departure.ts `brightening` > 0), not
while it falls. Reason: the side effect above, and the physiology E2a already uses: returning light is an arousal cue
for a sleeping animal (light arousal); falling light only makes staying in the nest more attractive and is no reason
to get up and weigh leaving. No parameter.

Predictions: dawn as in iteration 2 (AL3 before sunrise 0.04–0.07 for adult females, median +15 to +22 min; SALN3
about 0.00–0.01 and +25 to +30); nests per evening back to the values without the switch (1.06–1.14); active day
5–10 min shorter than in AL2 / SALN2 (the evening as in A1 / S); the fig and distance pattern unchanged (absent). The
lactating contrast is not attempted again (§8).

Arms: AL3 (R + departRace + nestLightDecide) and SALN3 (S + departRace + nestLightDecide + nurseWake), rhythm-metrics
and e-bench --quick.

### Iteration 3 results

| Readout | AL3 (R + departRace + nestLightDecide) | SALN3 (S + all three) | Field |
| --- | --- | --- | --- |
| Departures before sunrise, adult females (seed 48 / 7) | **0.049 (0.035 / 0.063)** | 0.003 (0.006 / 0.000) | 0.18 (band 0.05–0.35) |
| … males / lactating / other females | 0.01 / 0.07 / 0.03 | 0.00 / 0.01 / 0.00 | — |
| T-FOOD-10 (held-out, field observer: share of departures before sunrise, band 0.08–0.30) | **0.09, pass** (R 0.00, fail) | 0.00, fail (S 0.00) | 0.18 |
| Earliest departure, min after sunrise | −13.5 | −6.7 | Taï: twilight |
| Median departure (p10–p90) | 18 (6 to 29) | 28 (19 to 38) | about 0 (Budongo); +13 to +27 (Taï) |
| Fig crowns < 150 / 150–500 / ≥ 500 m: median; share before sunrise | 17 / 18 / 18; 0.05 / 0.03 / 0.00 | 29 / 29 / 30; 0 | far figs earliest |
| Other crowns, same | 18 / 19 / 19; 0.04 / 0.03 / 0.02 | 27 / 28 / 29; 0 | far non-figs latest |
| Last nest entry, min after sunset; nest entries counted per evening | −4; 1.15 | −2; 1.33 | — |
| Active day, all; males / lactating (difference) | 11 h 43; 11 h 41 / 11 h 48 (+7) | 11 h 33; 11 h 33 / 11 h 37 (+4) | 11 h 34 / 10 h 57 (−37) |
| Night out of a nest; night deaths; deaths | 0.0%; 0; 0 | 0.0%; 0; 0 | — |
| e-bench fitted / held-out (rows scored in both, against R or S) | 5.965 / 2.469 (+0.479 / −0.878) | 8.434 / 3.132 (**+3.538** / +0.243) | noise floor 0.8 |
| Prescriptions; viability | 139; pass | 139; pass | — |

Nest entries by time of day (diagnostic, seed 48, 5 days after the 30-day burn-in): R 0.06 in the morning and 1.01 in
the afternoon and evening per adult-day; AL3 0.19 and 1.01. With re-decisions on rising light only, the evening is
unchanged; the extra entries are animals that leave the nest at dawn and come back (dithering while the nest and the
best alternative are close).

Reading:
- Restricting the re-decision to rising light leaves the dawn as in iteration 2 (5% of adult females' departures
  before sunrise, median +18 min) and removes the evening side effect. The field observer's own row, T-FOOD-10
  (held-out), moves from 0.00 (fail) to 0.09 (inside 0.08–0.30); simulation truth for adult females is 0.049, at the
  lower edge of the staged T-RHY-3 band. Both are a half to a quarter of Taï's 18%, and no departure is earlier than
  14 min before sunrise.
- Who leaves early is set by hunger, not by the crop's ephemerality or distance: lactating females 7%, males 1%; near
  crowns as often as far ones; figs as other fruit.
- On the full stack nothing leaves before sunrise (sated adults, small stakes). Its fitted distance rises by 3.5 on
  rows scored in both: T-SOC-9 (+1.84) and T-HUN-1 (+1.12) swing both ways between iterations (SALN2: −0.57 and +0.41)
  and are noise; T-ACT-3 (+0.45; +0.56 in SALN2), T-RNG-5 (+0.58; +0.30) and T-ACT-4 (+0.30; +0.13) move the same way
  in both: the longer active day on the stack (11 h 20 → 11 h 33) goes to grooming and rest, and lactating females
  range relatively more.

## 8. Verdict

| Switch | What it does | Result | Decision |
| --- | --- | --- | --- |
| `departRace` | the nest's value falls by the stake of delay at a contested, limited crop | alone: median +45 → +24 min, no departure before sunrise; with `nestLightDecide`: 5% of adult females' departures before sunrise (T-FOOD-10 passes), driven by hunger; on the full stack: no effect | off; removes no prescription, so it cannot pass the Track E keep rule. Re-test after the appetite rework (E1e): the stake scales with the meal's worth |
| `nestLightDecide` | while the light rises, an animal in its nest re-decides at every bout's end | removes a gate artefact: E2a's "leave when daylight reaches 0.9" was the intention gate's period change at daylight 0.97; median +45 → +25 min alone; dawn re-entries 0.06 → 0.19 per adult-day | off; candidate for the integrator (no prescription removed; rgMaxAgeH stays in use elsewhere) |
| `nurseWake` | a feed at night wakes the mother | iteration 1 (every suckling tick): mothers awake about three quarters of the night, contrast −6 to −9 min; iteration 2 (feeds only): sleep pressure 0.03, contrast +2 | off: null |

**T-RHY-3: partial.** Departures before sunrise now emerge from value, light and competitors, with no clock and no
departure rule, at the lower edge of the band on the timer-needs reference and not at all on the full stack. The
janmaat2014 conditions (ephemeral fruit, far away) do not produce them. Two things in the model stand between it and
the field:
1. **The darkness weight.** The nest's darkness term (`rhythmDarkW` 2.2 × (1 − daylight), set a priori in E2a to beat
   any meal) is a design value with no physical consequence in the simulated world: nothing is risky or slower in the
   dark (no predators, no falls, no light-limited travel or vision beyond the sight radius). It holds every animal
   until about 15 min before sunrise and sets departure timing more than any food or competitor term. A first-principles
   replacement needs the physical costs of moving in poor light (travel speed and footing by light under the canopy;
   crepuscular predation, janmaat2014's reading of late departures to far non-fig sites), with sources not yet found
   for chimpanzees.
2. **Ephemeral fruit.** In the model only chimpanzees eat fruit, and fig crops are larger than others. Taï's figs are
   ephemeral because birds, monkeys and squirrels strip them (janmaat2014: hetero-specific foragers in 45% against 35%
   of feeding trees). Without that guild the fig × distance pattern cannot emerge.

**Lactating active day: null after two attempts, and out of reach of this architecture.** batesByrne2009's contrast is
in the evening: lactating females leave the nest when males do (06:46 against 06:56, no difference) and nest about an
hour before sunset, in full daylight (derived). E2a values a nest only in falling light (`(1 − daylight)` terms, a new
nest only while daylight < 1) and light masks felt sleepiness entirely, so no physiology of sleep can put an animal in a
nest more than about 50 min before sunset. Energy points the wrong way: milk and carrying raise a mother's hunger, which
lengthens her day (S: lactating +3 min against males; R: +5). Night feeding at the rate the model's infants feed costs
a mother about 3% of her night. Not modelled and plausible: risk to an infant at dusk, and the infant's own sleep.

Side finding for E1c/E1d: at night infants drink in 76% of their mothers' night ticks but at half the suckling rate or
more in only 3.6%: night suckling has no bouts and drains the gland's synthesis tick by tick.
