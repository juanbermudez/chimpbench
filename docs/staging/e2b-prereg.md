# Stage E2b pre-registration: nest departure and the active day

Written 1 October 2026, before the first run of the changed model. Track E rule: field values of behaviour are
targets, never inputs. Only physiology or physics measured independently of the behaviour may be a parameter.

Scope: the two misses E2a left (`docs/staging/e2a-prereg.md` §7): nobody leaves the nest before sunrise (T-RHY-3), and
lactating females do not have the shorter active day. Branch `e2b-departure` (from `track-e`, all Track E switches
off by default). Sources: research.md E.16 (janmaat2014 and batesByrne2009 now read in full; pruetz2018,
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
