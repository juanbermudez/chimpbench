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

(to be filled)
