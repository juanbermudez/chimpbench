# E3g pre-registration: why re-deciding adds trips

Status: complete (4 October 2026): diagnosis on four realizations of S27 and S28 (§2.2), two iterations;
`experienceValue` 2 a provisional keep candidate as a correction (§6.2, §8), 1 and 3 recorded null (§6.1). Skeleton
committed at the start of the stage (branch `e3g-redecide-trips`, from `track-e` d8417b5), before any run and before any
code change. Track E, stage E3g. Rule served: field values of behaviour are
targets to benchmark against, never inputs. No value, bonus or weight is added to hit a travel share, a day range, a
hunting rate or a feeding-tree count.

## 0. The problem

S28 = S27 + E3d's `redecideValue` 2 (a fresh choice when a need changes level or the light changes phase; `rgMaxAgeH`
and `continueBonus` out) passes the keep rule on 5 seeds (39 prescriptions on the corrected ledger), but against S27's
four confirm runs (e-stack2-confirm.md, "S28 results"):
- adult males walk 4.34 km a day (S27 3.34 ± 0.11); every class walks +0.8–1.0 km;
- adults' climbing cost +35–54%;
- feeding trees per day rise (T-FOOD-4 13.4 against 9.4 ± 0.1);
- hunts rise to 57 per community-year (T-HUN-1; S27 30.6 ± 8.3; band 5–25);
- T-RNG-4 3.58 (band top 3.5);
- other females', juveniles' and young infants' reserves fall faster (−0.082, −0.128, −0.167 %/day against −0.039,
  −0.086, −0.102);
- the fitted sum is worse beyond noise (z +2.4, through hunting).
Quick mode shows the same (S28q against the four S27q runs: males 2.81 → 4.02 km, climbing +25–67%, T-FOOD-4 9.3 →
14.0, T-HUN-1 26 → 50, T-RNG-4 2.26 → 3.56).

**Reading to test, not assume:** fresh choices at need-level and light-phase changes break off bouts and start trips
and hunts the animal would not have taken at the bout's natural end.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs): S28 against S27, quick mode (seeds 48 and 7, burn-in 30, 30 days),
   simulation truth. Re-decisions per adult-day by trigger (which need crossed which level; light phase); what was
   interrupted (feeding with crop and gut room left, rest, grooming, travel); what was chosen (the same act, another
   crown in view, a trip to a remembered tree, a hunt, other); the interrupted act's remaining value against the chosen
   option's at that moment; the outcome of trips and hunts started at re-decisions (fed at the target or not; kcal
   gained against kcal spent walking and climbing). Attribute S28's extra km, climbing, trees and hunts to triggers;
   name the term, with numbers.
2. **Mechanism** behind a new switch (0 = today; read with `redecideValue` 2), from first principles, only for what the
   diagnosis implicates. Every input sourced or tagged design; no weight chosen to hit a rate. If the diagnosis shows the
   extra trips are what the valuation says an animal should do, say so and stage nothing.
3. At most three iterations, each logged here and committed before its run; arms = S28 + the switch, quick mode,
   judged against the integrator's four S28 quick realizations (e-noise.md amendment 2) and read against the S27q group
   for the share of S28's cost recovered.

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**What the code does (read at d8417b5, field profile; S27's and S28's switches).** A rules-driven animal reaches a
decision point at its scheduled bout end, at an interrupt, or in the tick its act finishes itself; only then does it
perceive (src/sim/decide.ts, perception.ts: crowns in view, a colobus group "met" when it differs from the one perceived
at the previous decision point). Under `choiceBelief` 2 (both stacks) a draw takes the menu option with the highest
value + candidate jitter (± 0.06) + belief offset (a crop drawn from the animal's belief, trips to trees out of sight
only); no temperature.
- **S27 (`redecideValue` 0; rg.ts `gate`).** The act is kept unless, since the choice: an interrupt arrived, a hunt or
  patrol impulse is new, a need changed bucket (0.4 / 0.55 / 0.7 / 0.88), the period changed (light phases plus the
  11:30 and 14:30 clock hours), the intention is older than `rgMaxAgeH` (30 min), the act ended, or a crown is
  patch-poor. A draw gives the held act `continueBonus` (+0.25) while its scheduled bout runs (in practice at
  interrupts) or `finishedPenalty` (−0.5) once it has finished. Bout ends with no trigger are kept without a draw.
- **S28 (`redecideValue` 2; rg.ts `redecide`).** A draw follows a hunt or patrol impulse, a need bucket or light phase
  (night, dawn, day, dusk) different from the choice's, or an act that ended; otherwise, at every decision point (bout
  end or interrupt), the keep test (`stillBest`): the held act's value now plus the noise it was drawn with against
  every menu option's value now plus its held noise, an option new since the draw with a fresh noise (its jitter now
  plus a fresh belief draw); out-valued → a fresh draw of every option ('outvalued'). No bonus; the finished penalty
  stays.
- So S27 and S28 both re-draw at need-bucket changes; what differs is the clock and interrupt draws with their bonus
  (S27), and the keep test at every bout end and interrupt with fresh noise for new options (S28).

**Tool.** `scripts/redecide-diagnose.ts` (E3d's tool) with new readouts, "Stage E3g readouts" in its header (where each
is defined); taps read only (rgTap, rulesTap, energyTap), so the simulation is unchanged. Smoke-tested before this
registration (seed 48, burn-in 1 day, 2 days; disclosed below): every readout fills, and the adult males' ground km
attributed to chains equals the tool's energy-diagnose identity (S27 2.202, S28 3.683 km).
- *Decisions* (daylight, RG animals ≥ 8 y; read for adults ≥ 15 y): draws, switches and switches to trips, hunts and
  crowns in view per adult-day by trigger, with the trigger's detail (which need crossed into a higher or lower bucket;
  the light phases; the period; for 'outvalued' the option that out-valued the act, whether its noise was held, drawn
  fresh for an option new since the draw, or drawn fresh for an option that left the menu and came back, and whether its
  value alone beats the held act with its noise); what was held (feed-crown with its crop and foregut fill, fallback,
  rest, grooming, trips, …); what was chosen (the same act, a crown in view, an own, joined or caller trip, a hunt, …);
  the held act's raw value now against the chosen option's (the share of switches to an option worth less, by raw value,
  than the act held: chosen by noise).
- *Counterfactuals (S28 only).* At need-bucket and light-phase draws: would the keep test (the held noise; the draw's own
  fresh noise for options new since) have kept the act? A switch it would have kept is caused by the trigger alone.
  At every switching draw before the bout's scheduled end: would S27's `continueBonus` (+0.25 on the held act, added to
  the draw's own values) have kept the act?
- *Chains (attribution).* Each animal's acts from one switching decision to the next ('arrived' continues the chain),
  tagged with the trigger and the category of the decision that opened it. Ground km (energy-diagnose's definition),
  walk, climb and carry kcal (the ledger's books, energyTap), kcal eaten by food, and crown visits (the observer's
  T-FOOD-4 rule: a new crown, or the same after ≥ 10 min) are attributed to the chain that executed; per animal-day by
  class and trigger.
- *Trips and hunts* opened at decisions (adults, daylight starts): per adult-day by trigger; outcome (fed at the target;
  at another crown; fallback only; not fed; hunts: meat or none); distance at start, foregut fill and hunger; km, walk +
  climb + carry kcal, kcal eaten, minutes; the trigger that closed the chain; the kcal per minute eaten in the 10 min
  before the switch against the chain's realized net kcal per minute (charnov1976: leave when the rate here falls below
  what leaving yields).
- *Hunting.* Truth hunts per community-year; lead hunts and joins by trigger; at hunt-impulse draws of adult males the
  held act, interrupt or bout end, the share choosing the lead; (S28) the bonus counterfactual.
- *Feeding trees* per animal-day by class (distinct trees eaten in per 24 h; truth analog of T-FOOD-4).

**Runs.** redecide-diagnose (seeds 48 and 7, burn-in 30, 30 days, field profile; `--workers` 2, 1 above load 8) on
the parameters of S27q and S28q (required), then of the re-draws S27q1–S27q3 and S28q1–S28q3 (`rngSalt` 1, 2, 3) as
the load allows, from a frozen detached checkout of the commit that registers this section. **Identity:** the tool's
adult males' eating minutes and ground km equal the integrator's energy-diagnose JSON of the same world (`S27q-energy.json`
and `S28q-energy.json`, …).

**Reading rules (registered).** Δ = S28 − S27 (mean of the realizations run), adults (adult males, nursing mothers,
other females) per adult-day, and by class.
- *R1, attribution.* Δ ground km, Δ climbing kcal, Δ crown visits and Δ hunts, each split by the trigger of the chain
  that carried them (a trigger present in one stack only counts whole: S28's 'outvalued' and 'light-phase', S27's
  'interrupt', 'max-age', 'period', 'patch-poor'). The trigger **carries** S28's extra if its Δ is ≥ 1/3 of the net Δ
  km and of the net Δ climbing; the term named is the trigger (and detail) with the largest share.
- *R2, the reading to test.* "Fresh choices at need-level and light-phase changes break off bouts and start trips and
  hunts the animal would not have taken": **supported** if S28's need-bucket and light-phase chains carry ≥ 1/3 of the
  net Δ km, and the switches there that the keep test would have kept (trigger-caused) carry most of those chains'
  trips; **not supported** otherwise.
- *R3, do the extra trips pay?* For trips opened by the carrying trigger: fed-at-target share, net kcal (eaten −
  walk, climb, carry) per trip and per minute, against the 10-min intake rate the animal left. "What the valuation says
  an animal should do" if the trips were chosen at a value above the act held (by raw value, not by noise) **and** their
  realized net rate is at least the rate left; a valuation error otherwise (the trips are worth less than they were
  valued at).
- *R4, hunts.* Δ T-HUN-1 decomposed into Δ hunt-impulse draws per male-day (encounters in company, which more walking
  raises) × Δ lead share at those draws; at S28's lead choices before the bout's scheduled end, the share S27's bonus
  would have prevented.
- Young animals (< 8 y, argmax) and night decisions: reported, not read.

**Expected (low confidence; written after the 2-day smoke tests of S27 and S28, seed 48, disclosed: not
representative, not used below).** In the smokes adults switched 39.8 (S27) and 64.4 (S28) times per adult-day and
started 11.9 and 26.7 trips; S28's trips came from 'outvalued' (13.6 per adult-day, mostly an option new since the
draw whose value alone beat the held act: a companion's departure (joined trip), an own trip to a tree that entered the
shortlist) and from 'ended' (8.7, against 3.0 on S27: trips that end unfed are followed by more trips), need-bucket 3.8
(S27 2.8), light-phase 0.3 (S27's 'period' 0.6); half the need-bucket draws would have been kept by the keep test. In
both stacks ~58% of trips did not end feeding at the target. Expected in the full windows: R1 names 'outvalued' (and the
'ended' cascade), not need-bucket or light-phase; R2 not supported; R3 open (the trips are chosen above the act held by
value, but most do not feed at the target).

### 2.1 Amendment 1 (registered 4 October 2026 after reading the first realizations, before the readouts it adds ran)

Read so far (frozen checkout a465f38; S27q and S28q, the registered readouts; S27q1 also finished, not read; identity exact:
the tool's adult males' eating minutes and ground km equal energy-diagnose's, 233.496 / 2.873 and 242.403 / 4.018):
by R1 S28's 'outvalued' chains carry +1.38 km and +31 kcal climbing per adult-day against a net +1.13 km and +28 kcal
(counted whole), 'ended' +0.46 km (≥ 1/3, a cascade), need-bucket +0.23 and light-phase +0.16; most outvalued switches
are an option new since the draw whose value alone beats the act held (a joined trip after a companion's departure, an
own trip, grooming, a pant-grunt); the switches the keep test would have kept at need-bucket and light-phase draws carry
0.04 km per adult-day. In both stacks 62–63% of trips do not feed at their target, trips that leave a crown realize a
lower net rate than the rate left, and S28's hunt-impulse draws per male-day are ×5 S27's. To read why trips do not feed
at their target, whether a trip delivers the bout energy it is valued at, and where the hunt impulses come from before
any mechanism is chosen, four readouts are added to the tool (header, "amendment 1"): (a) outvalued draws by held act and
out-valuer; (b) trips by kind (own, joined, caller), fed at the target counting the next act when it feeds at the target,
and for unfed trips the state at the close (trigger, distance to the target, the target's crop, in view, its forage option
on the list, the next act); (c) the bout energy E0 a trip was valued at (intake.ts netRateShare's E) against the fruit
eaten at the target; (d) decisions with a hunt impulse open (any trigger), the lead share, and re-sightings of a colobus
group the same male perceived at a decision in the hour before. Smoke-tested on 2 days of S28 (seed 48; every readout
fills; identity unchanged).

**Reading rules for the added readouts (registered).**
- *A1-a:* the largest held > out-valuer flows per adult-day name what the keep test ends and for what.
- *A1-b:* "trips are abandoned on the way" if ≥ 50% of unfed own trips close more than 6 m (GATE.arriveM) from their
  target; "targets are empty" if ≥ 50% of unfed trips that close at their target find a crop below 0.06 units.
- *A1-c:* "a trip delivers the bout energy it is valued at" if the fruit eaten at the target when fed is ≥ 2/3 of E0;
  otherwise the bout energy is overvalued.
- *A1-d:* "S28's extra hunts come from re-sightings" if re-sighting impulses carry ≥ 1/2 of Δ impulses per male-day.

**Runs.** The amended tool (it reproduces every registered readout of the same world) on S27q and S28q, then on S27q2,
S28q2, S27q3, S28q3, from a frozen checkout of the commit that registers this amendment; no run starts above load 30.
S27q1 and S28q1 keep the original tool's outputs (registered readouts only).

### 2.2 Diagnosis results (frozen checkouts a465f38 and af17d05, clean; quick, seeds 48 and 7, 30 + 30 days; simulation truth; every number printed by the stage's scripts `diag_table.py` and `amend_table.py` from the tools' JSON, session scratch `e3g/`)

Four realizations of each stack (S27q, S27q1–S27q3; S28q, S28q1–S28q3 by `rngSalt` 1, 2, 3; the parameters of the
integrator's runs). The amendment-1 readouts come from the amended tool on three realizations of each (q, q2, q3; S27q1
and S28q1 ran on the registered tool only). **Identity:** in all eight worlds the tool's adult males' eating minutes and
ground km equal energy-diagnose's of the same world, and the km attributed to chains add up to them; the amended tool
reproduces the registered tool's readouts of the same world exactly.

```
R1 attribution (chainsByTrigger), adults pooled, per adult-day: S27 mean | S28 mean | Δ (share of net Δ)
| trigger | km S27 / S28 / Δ (share) | climbK S27 / S28 / Δ (share) | visits S27 / S28 / Δ (share) | chains S27 / S28 / Δ (share) |
| outvalued | 0.000 / 1.332 / +1.332 (+130%) | 0.000 / 31.277 / +31.277 (+111%) | 0.000 / 6.880 / +6.880 (+132%) | 0.000 / 26.148 / +26.148 (+105%) |
| interrupt | 0.746 / 0.000 / -0.746 (-73%) | 14.261 / 0.000 / -14.261 (-51%) | 2.916 / 0.000 / -2.916 (-56%) | 11.212 / 0.000 / -11.212 (-45%) |
| ended | 0.767 / 1.193 / +0.425 (+41%) | 18.573 / 30.812 / +12.239 (+43%) | 3.437 / 5.524 / +2.088 (+40%) | 19.473 / 32.528 / +13.056 (+52%) |
| max-age | 0.212 / 0.000 / -0.212 (-21%) | 3.659 / 0.000 / -3.659 (-13%) | 1.139 / 0.000 / -1.139 (-22%) | 3.904 / 0.000 / -3.904 (-16%) |
| need-bucket | 0.491 / 0.680 / +0.188 (+18%) | 6.318 / 8.859 / +2.541 (+9%) | 1.550 / 1.865 / +0.315 (+6%) | 6.883 / 8.267 / +1.384 (+6%) |
| light-phase | 0.000 / 0.150 / +0.150 (+15%) | 0.000 / 1.983 / +1.983 (+7%) | 0.000 / 0.225 / +0.225 (+4%) | 0.000 / 1.045 / +1.045 (+4%) |
| period | 0.135 / 0.000 / -0.135 (-13%) | 2.417 / 0.000 / -2.417 (-9%) | 0.321 / 0.000 / -0.321 (-6%) | 1.835 / 0.000 / -1.835 (-7%) |
| patrol | 0.032 / 0.045 / +0.013 (+1%) | 0.440 / 0.690 / +0.250 (+1%) | 0.043 / 0.082 / +0.039 (+1%) | 0.328 / 0.554 / +0.226 (+1%) |
| light | 0.123 / 0.130 / +0.008 (+1%) | 0.258 / 0.349 / +0.091 (+0%) | 0.062 / 0.078 / +0.016 (+0%) | 0.555 / 0.542 / -0.013 (-0%) |
| hunt | 0.001 / 0.005 / +0.004 (+0%) | 0.083 / 0.264 / +0.181 (+1%) | 0.003 / 0.014 / +0.011 (+0%) | 0.029 / 0.090 / +0.061 (+0%) |
| start | 0.005 / 0.006 / +0.001 (+0%) | 0.012 / 0.011 / -0.001 (-0%) | 0.003 / 0.002 / -0.001 (-0%) | 0.033 / 0.033 / +0.000 (+0%) |
| patch-poor | 0.001 / 0.000 / -0.001 (-0%) | 0.008 / 0.000 / -0.008 (-0%) | 0.002 / 0.000 / -0.002 (-0%) | 0.007 / 0.000 / -0.007 (-0%) |
| other | 0.000 / 0.000 / +0.000 (+0%) | 0.000 / 0.000 / +0.000 (+0%) | 0.000 / 0.000 / +0.000 (+0%) | 0.107 / 0.108 / +0.001 (+0%) |
| net | 2.513 / 3.541 / +1.027 | 46.030 / 74.245 / +28.215 | 9.475 / 14.671 / +5.196 | 44.366 / 69.316 / +24.950 |
D1 decisions (adults, per adult-day): trigger | S27 draws / switches / to trip / to hunt / to crown | S28 the same
| ended | 19.87 / 19.17 / 5.35 / 0.01 / 1.84 | 33.32 / 32.16 / 10.61 / 0.02 / 2.39 |
| hunt | 0.04 / 0.03 / 0.01 / 0.01 / 0.00 | 0.11 / 0.09 / 0.03 / 0.02 / 0.00 |
| interrupt | 23.38 / 11.11 / 5.17 / 0.02 / 0.47 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 |
| light | 3.59 / 0.56 / 0.17 / 0.00 / 0.02 | 3.35 / 0.54 / 0.22 / 0.00 / 0.02 |
| light-phase | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | 1.49 / 0.94 / 0.43 / 0.00 / 0.04 |
| max-age | 4.65 / 3.89 / 1.64 / 0.00 / 0.64 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 |
| need-bucket | 8.34 / 6.12 / 2.38 / 0.00 / 0.88 | 10.49 / 7.53 / 3.52 / 0.00 / 0.67 |
| outvalued | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | 27.86 / 25.96 / 11.88 / 0.02 / 1.94 |
| patch-poor | 0.01 / 0.01 / 0.01 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 |
| patrol | 0.34 / 0.33 / 0.08 / 0.00 / 0.02 | 0.59 / 0.55 / 0.16 / 0.00 / 0.02 |
| period | 2.15 / 1.74 / 0.56 / 0.00 / 0.14 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 |
  all S27: draws 62.37 / switches 42.94 / toTrip 15.37 / toHunt 0.03 / toCrownInView 4.00; chosen worth less (by raw value) 0.098
R2 keep-test counterfactual (S28, adults): trigger | would keep share | switches it would have kept / trips / hunts per adult-day
  need-bucket: 0.444 | 0.653 / 0.307 / 0.000
  light-phase: 0.497 | 0.038 / 0.020 / 0.000
  trips opened at switches the keep test would have kept: 0.327 per adult-day, 0.036 km per adult-day
  bonus counterfactual (S28 switches before the scheduled bout end that +0.25 on the held act would have kept): outvalued 0.421 of 30981, need-bucket 0.430 of 3851, light-phase 0.264 of 374, hunt 0.320 of 61, ended — of 0
R3 trips (adults, daylight starts) by trigger: per adult-day | outcome | km/trip | spent kcal | fruit kcal | net kcal | net kcal/min | rate left kcal/min | chosen worth less | end trigger of unfed
  S27 interrupt: 5.17 | not fed 0.52, fed at target 0.48 | 0.122 | 6.41 | 64.61 | 58.24 | 4.61 | 1.57 | 0.004 | ended 0.70, interrupt 0.17, need-bucket 0.08, patrol 0.03
  S27 ALL: 15.38 | not fed 0.63, fed at target 0.37 | 0.124 | 5.98 | 55.97 | 50.02 | 4.37 | 1.38 | 0.141 | ended 0.75, interrupt 0.13, need-bucket 0.07, patrol 0.02
  S27 trips that left a crown: n 3746, rate left 5.76 kcal/min, trip net 4.06 kcal/min, fed at target 0.405
  S28 outvalued: 11.88 | not fed 0.57, fed at target 0.43 | 0.093 | 5.26 | 40.09 | 34.88 | 4.01 | 1.34 | 0.097 | ended 0.76, outvalued 0.16, need-bucket 0.06, patrol 0.02
  S28 ALL: 26.87 | not fed 0.62, fed at target 0.38 | 0.101 | 5.34 | 38.31 | 33.03 | 3.88 | 1.51 | 0.157 | ended 0.75, outvalued 0.15, need-bucket 0.06, patrol 0.02
  S28 trips that left a crown: n 9143, rate left 4.36 kcal/min, trip net 3.93 kcal/min, fed at target 0.415
R4 hunting (truth): hunts per community-year | hunt draws per male-day | lead share | at interrupt / bout end | interrupt share | S28 bonus would stay
  S27: 43.60 (26.36, 73.00, 36.50, 38.53) | 0.084 | 0.229 | 0.000 / 0.231 | 0.012 | —
    joins per community-year by trigger: ended 24.8, hunt 1.0, interrupt 67.9, max-age 0.5, need-bucket 1.0, period 1.0
  S28: 83.14 (81.11, 85.17, 81.11, 85.17) | 0.242 | 0.205 | 0.151 / 0.257 | 0.482 | 0.320
    joins per community-year by trigger: ended 75.5, hunt 7.1, need-bucket 16.2, outvalued 100.9, patrol 0.5

Feeding trees per animal-day (distinct, truth): S27 → S28
Feeding trees per animal-day (distinct, truth): S27 → S28
  adult male: 5.85 → 8.15
  female, lactating: 4.93 → 6.41
  female, other: 4.50 → 5.92
  juvenile 8–12 y: 5.01 → 6.39
```

Amendment-1 readouts (means ± SD over three realizations of each stack):

runs: S27 ['S27q', 'S27q2', 'S27q3']; S28 ['S28q', 'S28q2', 'S28q3']

| A1-a outvalued, held > out-valuer (per adult-day; S28) | S27 | S28 |
| --- | --- | --- |
| rest>trip-own | 0.00 ± 0.00 | 3.39 ± 0.24 |
| rest>trip-joined | 0.00 ± 0.00 | 2.20 ± 0.07 |
| feed-crown>trip-joined | 0.00 ± 0.00 | 2.19 ± 0.16 |
| rest>crown-in-view | 0.00 ± 0.00 | 1.68 ± 0.12 |
| feed-crown>rest | 0.00 ± 0.00 | 1.65 ± 0.07 |
| rest>groom | 0.00 ± 0.00 | 1.31 ± 0.03 |
| rest>feed-fallback | 0.00 ± 0.00 | 0.92 ± 0.07 |
| feed-crown>trip-own | 0.00 ± 0.00 | 0.85 ± 0.04 |
| rest>other:pant-grunt | 0.00 ± 0.00 | 0.84 ± 0.05 |
| feed-fallback>rest | 0.00 ± 0.00 | 0.77 ± 0.04 |
| feed-crown>other:pant-grunt | 0.00 ± 0.00 | 0.75 ± 0.07 |
| rest>trip-caller | 0.00 ± 0.00 | 0.71 ± 0.01 |
| feed-fallback>trip-joined | 0.00 ± 0.00 | 0.53 ± 0.04 |
| groom>trip-own | 0.00 ± 0.00 | 0.42 ± 0.01 |
| other:guard>other:charge | 0.00 ± 0.00 | 0.42 ± 0.09 |
| rest>other:call | 0.00 ± 0.00 | 0.30 ± 0.02 |

| A1-b/c trips by kind | S27 mean ± SD | S28 mean ± SD |
| --- | --- | --- |
| trip-own: per adult-day | 8.36 ± 0.16 | 12.28 ± 0.17 |
| trip-own: fed at target (incl. next act) | 0.343 ± 0.002 | 0.345 ± 0.010 |
| trip-own: E0 kcal (valued bout energy) | 371 ± 2 | 321 ± 6 |
| trip-own: fruit kcal eaten at target, per trip | 58.5 ± 0.7 | 41.2 ± 1.8 |
| trip-own: fruit kcal at target when fed | 169.1 ± 2.5 | 117.8 ± 4.0 |
| trip-own: delivered ÷ valued (fruit at target per trip ÷ E0) | 0.158 ± 0.002 | 0.128 ± 0.004 |
| trip-own: when fed, eaten ÷ E0 | 0.440 ± 0.003 | 0.356 ± 0.004 |
| trip-own: km per trip | 0.092 ± 0.003 | 0.079 ± 0.001 |
| trip-own: climb kcal per trip | 1.51 ± 0.01 | 1.61 ± 0.05 |
| trip-own: unfed closing > 6 m from target | 0.680 ± 0.016 | 0.703 ± 0.010 |
| trip-own: unfed at target, crop below 0.06 | 0.840 ± 0.011 | 0.771 ± 0.012 |
| trip-own: unfed closed by "ended" | 0.841 ± 0.008 | 0.794 ± 0.009 |
| trip-own: unfed closed by "outvalued" | 0.000 ± 0.000 | 0.136 ± 0.006 |
| trip-joined: per adult-day | 5.11 ± 0.45 | 11.24 ± 0.91 |
| trip-joined: fed at target (incl. next act) | 0.590 ± 0.009 | 0.551 ± 0.019 |
| trip-joined: E0 kcal (valued bout energy) | 252 ± 7 | 216 ± 7 |
| trip-joined: fruit kcal eaten at target, per trip | 77.2 ± 4.1 | 47.8 ± 3.6 |
| trip-joined: fruit kcal at target when fed | 128.2 ± 5.4 | 83.0 ± 3.7 |
| trip-joined: delivered ÷ valued (fruit at target per trip ÷ E0) | 0.306 ± 0.009 | 0.221 ± 0.009 |
| trip-joined: when fed, eaten ÷ E0 | 0.484 ± 0.011 | 0.366 ± 0.005 |
| trip-joined: km per trip | 0.127 ± 0.005 | 0.094 ± 0.003 |
| trip-joined: climb kcal per trip | 2.65 ± 0.04 | 2.70 ± 0.08 |
| trip-joined: unfed closing > 6 m from target | 0.163 ± 0.008 | 0.213 ± 0.007 |
| trip-joined: unfed at target, crop below 0.06 | 0.761 ± 0.012 | 0.619 ± 0.013 |
| trip-joined: unfed closed by "ended" | 0.606 ± 0.017 | 0.648 ± 0.018 |
| trip-joined: unfed closed by "outvalued" | 0.000 ± 0.000 | 0.247 ± 0.014 |
| trip-caller: per adult-day | 1.74 ± 0.16 | 3.54 ± 0.29 |
| trip-caller: fed at target (incl. next act) | 0.036 ± 0.002 | 0.034 ± 0.001 |
| trip-caller: E0 kcal (valued bout energy) | 278 ± 2 | 249 ± 7 |
| trip-caller: fruit kcal eaten at target, per trip | 4.3 ± 0.3 | 2.3 ± 0.2 |
| trip-caller: fruit kcal at target when fed | 121.9 ± 3.5 | 65.7 ± 5.2 |
| trip-caller: delivered ÷ valued (fruit at target per trip ÷ E0) | 0.016 ± 0.001 | 0.009 ± 0.001 |
| trip-caller: when fed, eaten ÷ E0 | 0.436 ± 0.057 | 0.230 ± 0.011 |
| trip-caller: km per trip | 0.264 ± 0.008 | 0.201 ± 0.004 |
| trip-caller: climb kcal per trip | 0.00 ± 0.00 | 0.00 ± 0.00 |
| trip-caller: unfed closing > 6 m from target | 0.999 ± 0.000 | 1.000 ± 0.001 |
| trip-caller: unfed at target, crop below 0.06 | 0.333 ± 0.289 | 0.389 ± 0.347 |
| trip-caller: unfed closed by "ended" | 0.656 ± 0.013 | 0.828 ± 0.004 |
| trip-caller: unfed closed by "outvalued" | 0.000 ± 0.000 | 0.046 ± 0.006 |

| A1-d hunt impulses (adult males) | S27 | S28 |
| --- | --- | --- |
| impulse decisions per male-day | 0.139 ± 0.025 | 0.239 ± 0.017 |
| re-sighting share | 0.334 ± 0.091 | 0.437 ± 0.051 |
| re-sighting impulses per male-day | 0.047 ± 0.017 | 0.104 ± 0.008 |
| lead share | 0.142 ± 0.002 | 0.204 ± 0.021 |
| leads per male-day | 0.020 ± 0.004 | 0.049 ± 0.001 |
| re-sighting leads per male-day | 0.008 ± 0.003 | 0.019 ± 0.002 |
| truth hunts per community-year | 33.8 ± 6.5 | 82.5 ± 2.3 |
Δ impulses +0.099 per male-day, of which re-sightings +0.057 (57%); Δ leads +0.029, of which re-sighting leads +0.011 (38%)

**Reading by the registered rules.**
- **R1, attribution:** the keep test ('outvalued', S28 only) carries S28's extra: +1.33 km, +31.3 kcal of climbing and
  +6.9 crown visits per adult-day, counted whole, against net changes of +1.03 km, +28.2 kcal and +5.2 visits (130%,
  111%, 132%); the acts that end ('ended') carry +0.43 km and +12.2 kcal (41%, 43%: a cascade, trips that end unfed
  followed by more trips); need-bucket +0.19 km (18%), light-phase +0.15 km (15%); S27's interrupt, clock and period draws
  carried 0.75, 0.21 and 0.14 km. **The term named: the keep test** (rg.ts `redecide` → `stillBest`) at every bout end
  and interrupt: 26 switches per adult-day (S27's interrupt draws switched 11), 12 of them into trips. 63% of its draws
  fall before the bout's scheduled end, and S27's `continueBonus` (+0.25 on the held act) would have kept 42% of those
  switches.
- **R2, the reading to test: not supported.** Need-bucket and light-phase chains carry +0.34 km (33% of the net, under
  the 1/3 line), and the switches there that the keep test would have kept carry 0.33 trips and 0.04 km per adult-day of
  their 4.0 trips: a fresh choice at a need or light change rarely breaks off a bout the valuation would keep.
- **R3, do the extra trips pay: a valuation error.** The keep test's trips are chosen at a value above the act held (by
  raw value in 90%), yet trips that leave a crown yield a lower net rate than the rate left (S28 3.93 against 4.36
  kcal/min; S27 4.06 against 5.76), and 62–63% of all trips do not feed at their target in either stack.
- **A1-a:** the keep test ends rest for own trips (3.4 per adult-day), joined trips (2.2), crowns in view (1.7),
  grooming (1.3), the fallback (0.9) and callers (0.7), and ends crown feeding for joined trips (2.2), rest (1.65) and own
  trips (0.85).
- **A1-b: both readings hold, in both stacks.** "Trips are abandoned on the way": 68–70% of unfed own trips close more
  than 6 m from their target (mostly closed by the act ending: a departure nobody followed, or the trip's option gone from
  the list). "Targets are empty": 77–84% of unfed own trips and 62–76% of unfed joined trips that reach their target find
  a crop below 0.06 units.
- **A1-c: the bout energy is overvalued.** When a trip does feed at its target the animal eats 36% (S28) to 44% (S27) of
  the bout energy the trip was valued at (E0, 320–370 kcal for own trips); counting the trips that do not, own trips
  deliver 13% (S28) and 16% (S27) of E0, joined trips 22% and 31%, callers 1–2%.
- **A1-d: S28's extra hunt impulses come mostly from re-sightings:** 57% of the +0.099 impulses per male-day are a
  colobus group the same male perceived at a decision in the hour before (perception.ts counts a group as met whenever it
  differs from the group perceived at the previous decision point); of the extra leads (+0.029 per male-day) 38% are
  re-sightings, the rest more new groups met on longer walks and a higher lead share (0.14 → 0.20; S27's bonus would have
  kept the held act at 32% of S28's hunt draws before the bout's scheduled end). Truth hunts 33.8 ± 6.5 (S27, three
  runs) against 82.5 ± 2.3 per community-year.

**A term `departValue` would amplify (noted at the integrator's request, 4 October, after S32 = S27 + `departValue` 2
+ `bodyRules` 1 + `redecideValue` 2 showed re-deciding's cost larger than S28's).** On S28 the keep test's largest flow
ends rest for an own trip (3.4 per adult-day), and two thirds of own trips never feed at their target, 68–70% of those
closing more than 6 m from it, mostly departures nobody followed that `departPersist` gives up after its check (the
animal has barely moved: km per own trip 0.08). Under `departValue` 2 such an attempt ends in the initiator's own decision
and, while its audience is unchanged, its next own trip goes alone with no give-up, so the same keep-test switches become
walked trips (more km per trip, more crowns reached and climbed, more empty crowns found) instead of aborted attempts.
That is the direction S32 shows (nursing mothers 4.46 km a day against S28's 3.98). The valuation error this stage
targets (trips valued at a full meal they rarely deliver) is the same on both stacks; the reading for S32 is a
prediction, not tested here.

**What this says.** Re-deciding adds trips because the keep test lets the valuation decide at every bout end and
interrupt, and the valuation promises far more from a trip than trips deliver: a remembered or unknown crown is valued
as a full gut-room meal, while two thirds of trips end at an empty crown or never reach theirs and a fed trip eats about
a third of that meal. S27's gate, clock and continuation bonus held acts and so hid the same error (S27's trips deliver
16–31% of E0 too). The need-level and light-phase re-draws the brief suspected are a minor part. Separately, hunting rises
because more walking and more decision points make the same colobus group count as a new encounter again and again.

## 3. Field rows scored here: samples (written before any arm)

As recorded by the stages that read each source in full on 4 October (E3d §3, E4n §2, E2j §2, E2i §3); not re-opened here.
The rows this stage's readouts lean on are travel, ranging, feeding trees and hunting; none was fitted by this stage.

| Row | Source | Sample, method | Value, band |
| --- | --- | --- | --- |
| T-ACT-1, T-ACT-2, T-ACT-3 (fitted) | villioth2025 | Budongo Waibira, Oct 2016 – Jun 2017: "ten adult males and nine adult females ... Seven of the females were lactating"; continuous focal follows of 1–12 h (491 h); travelling = "terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy"; mass not reported (E3d §3) | feeding 0.36 M / 0.37 F (0.33–0.5); travel 0.21 / 0.20 (0.12–0.25); grooming 0.15 / 0.12 (0.08–0.18) |
| T-ACT-4 (fitted) | potts2011, villioth2025 | Ngogo 2005–06 (1,059 h), Kanyawara 2006 (961 h), continuous focal follows of adult males, cycling and pregnant or lactating females; resting includes grooming; monthly means (E3d §3) | 0.340, 0.448; band 0.3–0.47 |
| T-RNG-4 (fitted) | batesByrne2009 | Budongo Sonso 2002–03, 8 adult males, GPS every 5 min while travelling, full-day follows; mass not reported (E3d §3, E2j §2) | 2.7 ± 1.5 km/day; band 1.5–3.5 |
| T-FOOD-2 (fitted) | watts2012a, emeryThompson2020 | Ngogo 1995–2010 (125 months, focal + 15-min scans); Kanyawara 1994–2018 (240,601 feeding scans); all age-sex classes (E3d §3) | 72.1%, 64.0%; band 0.60–0.78 |
| T-FOOD-4 (held-out, flagged compromised) | janmaat2013b, normand2009 | Taï, 5 adult females with young, 275 full-day follows; two females over 28 days (E3d §3) | 7.14; 14.0 and 18.1; band 4–15 |
| T-HUN-1 (fitted; band 5–25, a band 4–11 staged by E4e) | gilby2015, wattsMitani2002 | Kanyawara 1996–2014, 224 months, 11.4 adult males: "every 15 min, the field assistants record party composition"; an encounter is colobus "within 100 m"; "hunt attempts are defined as instances when a chimpanzee climbs to the height of the lowest monkey"; 194 attempts (≈ 10.4 per year, derived); party follows, community-level counts, no sex, reproductive-state or mass restriction. Ngogo 1995–99, ~24 adult males, 45.1 successful hunts a year (E4n §2) | band 5–25 per community-year |
| T-HUN-3 (fitted) | gilby2015, mitaniWatts2001 | as T-HUN-1: 0.079 of 2,461 encounters hunted (E4n §2) | band 0.05–0.40 |
| Reserves %/day by class | no field row (T-ENE rows staged, e-targets.patch.json) | — | read against the S28q and S27q groups only |

**Readouts the predictions need** (each defined in its tool's header; smoke-tested on 2 days with the stage's switch on
before any arm): e-bench's observer rows (src/field/metrics.ts) and sums; energy-diagnose's ground km, climbing kcal,
eating minutes and reserves (%/day, OLS slope; the integrator's judge convention); redecide-diagnose's E3g readouts (§2);
rhythm-metrics' night share (adults out of a nest, T-RHY-5) for a kept arm.

## 4. Reference and judging (docs/staging/e-noise.md amendment 2, amendment 3's rare rows)

- Reference **S28** in quick mode (parameters `bench-run3/artifacts/validation/e/s27q/S28q-params.json`), run by the
  integrator once plus three re-draws (`rngSalt` 1, 2, 3) at bench-run3 28d249e (simulation code identical to this
  branch's start for S28), each with energy-diagnose (seeds 48, 7; burn-in 30, 30 days):
  `bench-run3/artifacts/validation/e/s27q/{S28q,S28q1,S28q2,S28q3}.json` and `…-energy.json`. Not re-run here.
- The **S27q group** (the costs to recover): `bench-run3/artifacts/validation/e/s27q/{S27q,S27q1,S27q2,S27q3}.json`
  and `…-energy.json`.
- Each arm (S28 + this stage's switch, same quick settings) against the S28q mean with the integrator's
  `judge_vs_reps.py quick custom` (REFS = the four S28q JSON): z = (arm − mean) ÷ (SD × √(1 + 1/n)), the registered quick
  SD or the group's own spread if larger; |z| > 2 is a result; with and without T-HUN-4, T-BRD-1 and T-IGE-3.
- Behaviour and energy against the S28q group's own spread (mean ± SD of its four runs) and against the S27q mean.
  Viability and night safety (adults out of a nest ≤ 3.3% of the night, T-RHY-5 ≤ 0.033) must pass. Prescriptions:
  `scripts/prescription-ledger.ts --count --params` (S27 41, S28 39 on the corrected ledger).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

### 5.1 Iteration 1 (registered before its run): values that follow experience (`experienceValue` 1 and 3)

**Why (§2.2).** The keep test lets the valuation decide at every bout end and interrupt, and the valuation promises far
more from a trip than trips deliver: a trip to a crown out of sight is valued (intake.ts `netRateShare`, E3c) as a full
bout there, E = the believed crop's share or the gut room, but trips deliver 13–31% of that energy at their target (two
thirds never feed there: crowns found empty, departures nobody followed; fed trips eat about a third of it), and leaving a
crown for a trip lowers the intake rate. S27's gate, clock and bonus hid the error by holding acts; the keep test exposes
it. Separately, 57% of S28's extra hunt impulses re-sight a group the male perceived within the hour.

**Principle.** A forager judges leaving against what leaving yields, a rate it knows from its own returns (the marginal
value theorem's average rate, charnov1976); an animal that keeps valuing trips at what its beliefs promise while its
trips deliver a fraction of it is miscalibrated, and the miscalibration is what the keep test turns into trips. The
fix is not a weight on trips but the animal's own record: each trip's outcome (the energy eaten at its target ÷ the
energy it was valued at) moves its expectation, and trips are valued at that expected meal. For hunting, a colobus group
seen again within the hour is not a new encounter: the meeting that opened the hunt decision has already been weighed,
and the same group in view brings no new information (the brief's "a trigger that cannot change which option is best not
causing a fresh choice"; E4j's correction of patrol fusion uses the same span, `reunionH`).

**Change (switch `experienceValue`, 0 = today; a sum of bits; src/sim/experience.ts, intake.ts, candidates.ts,
execution.ts, perception.ts).**
- *Bit 1.* An episode opens when a trip to a crown starts (an own or known tree, a joined trip's goal, a caller's crown;
  chimp.sim.tt: the target crown, the bout energy E0 it was valued at, kcal eaten there) and closes at the first act that
  is neither that trip nor feeding at that crown; its outcome y = min(1, kcal eaten at the target ÷ E0) moves the animal's
  expectation `ty` (absent = 1: it trusts its beliefs until a trip ends) by `tripYieldRate` (0.1, design: an exponential
  average over about its last ten trips): ty ← ty + 0.1 (y − ty). Every trip's food term is valued at the expected meal:
  netRateShare's E × ty (energy and eating time); crowns in view (the act being done, or a crown it sees) are valued as
  today. E0 = netRateShare's E at the start (the believed crop's share from the trip's belief, the crop seen for a crown
  in view, else the gut room).
- *Bit 2.* perception.ts: a colobus group the animal perceived at one of its decision points within `reunionH` (1 h,
  E5e's convention) is not met anew, so it raises no hunt impulse; everything else is unchanged.
- No counted entry is read less (a correction; prescriptions unchanged, 39 on the corrected ledger, 48 on E0b's).
  One new design magnitude (`tripYieldRate`), not fitted. Tests (tests/sim-experience.test.ts): 0 by default in both
  profiles; a trip's value falls with ty and a crown in view's does not; an episode's outcome moves ty by the rate (a
  trip that never fed at its target counts 0); a group seen half an hour ago raises no impulse with bit 2 and does
  without; deterministic and JSON-lossless over a field day with value 3, ty in [0, 1]; the count unchanged. Switch off:
  the field pin and the compressed goldens hold (tests/sim-track-e.test.ts).

**Smoke test with the switch on (seed 48, 1 + 2 days; disclosed; not representative):** with bit 1 adult males walk
1.82 km a day (S28 smoke 3.68), adults start 12.7 trips a day (26.7) and switch 52 times (64); ty after three days 0.22
(median 0.18); bits 1 + 2 identical over these days (no re-sighting impulse in them).

**Arms** (from a frozen detached checkout of the commit that adds this section): **X1** = S28 + `experienceValue` 1,
**X3** = S28 + `experienceValue` 3 (S28q's parameters plus the switch); e-bench `--quick`, energy-diagnose,
redecide-diagnose and rhythm-metrics each (seeds 48 and 7, burn-in 30, 30 days; `--workers` 1 above load 8; no run starts
above load 30).

**Predictions (against the S28q group, mean ± SD of its four runs; S27q's mean for the costs to recover; low confidence
unless stated).**

| Quantity | S28q (mean ± SD) | S27q mean | X1 | X3 | Confidence |
| --- | --- | --- | --- | --- | --- |
| Prescriptions | 39 | 41 | 39 | 39 | high |
| Viability; night safety (≤ 3.3%, T-RHY-5 ≤ 0.033) | pass | pass | pass | pass | moderate |
| Trips per adult-day (truth) | 26.9 ± 1.2 | 15.4 | 13–21 | 13–21 | moderate |
| Ground km a day: adult males; nursing mothers; juveniles 5–12 y | 3.92 ± 0.14; 3.61 ± 0.07; 3.84 ± 0.05 | 2.81; 2.48; 2.83 | 2.3–3.3; 2.2–3.1; 2.6–3.4 | as X1 | moderate |
| Climbing kcal a day, adults | 74.2 ± 3.8 | 46.0 | 45–62 | 45–62 | moderate |
| T-FOOD-4 | 13.68 ± 0.30 | 9.31 | 9–12 | 9–12 | moderate |
| T-RNG-4 | 3.18 ± 0.32 | 2.26 | 2.0–2.9 | 2.0–2.9 | low |
| T-HUN-1 | 47.8 ± 6.2 | 26.0 | 25–45 | 12–30 | low |
| T-ACT-2 | 0.158 ± 0.006 | 0.116 | 0.11–0.15 | 0.11–0.15 | low |
| Reserves %/day: other females; juveniles; infants 0.5–2 y | −0.033 ± 0.014; −0.078 ± 0.007; −0.046 ± 0.014 | +0.006; −0.027; +0.009 | each at or above the S28q mean | as X1 | low |
| ty, adults' mean at the window's end | — | — | 0.2–0.5 | 0.2–0.5 | low |
| Fitted; held-out with and without the rare rows | reference mean | — | inside noise | fitted at or below the mean, held-out inside noise | low |

**Kill criterion (registered).** An arm is null if (a) viability fails (a starvation death, or a seed below 80% of its
start); (b) any class's reserve slope is more than 0.05% of the store a day below the S28q mean; (c) held-out is worse
beyond noise (z > +2) with or without the rare rows; (d) the mechanism does not run (no `ty` learned, or trips per
adult-day inside the S28q group's mean ± 2 SD); (e) night safety fails (adults out of a nest more than 3.3% of the night,
or T-RHY-5 above 0.033).

**Verdict rule (registered).** `experienceValue` removes no counted prescription, so an arm is judged as a correction:
a **provisional keep candidate** if none of (a)–(e) holds and it recovers at least half of S28's cost on each of adult
males' ground km, adults' climbing kcal and T-FOOD-4 (its value at least half-way from the S28q mean to the S27q mean);
otherwise recorded and off. Between two arms that both qualify, X3 is preferred if its T-HUN-1 is lower than X1's and its
fitted sum is not higher; hunting, rest, travel share and reserves are reported against both groups, never used to choose.

### 5.2 Iteration 2 (registered before its run): an encounter is a group not seen within the hour (`experienceValue` 2)

**Why (§6.1).** Bit 1 is null: valuing trips at what they deliver collapses travel, because trips fail for reasons upstream
of the valuation (departures nobody follows, crowns found empty) that do not improve when trips become rare; the trips the
keep test adds are what the valuation says, and on this stack that over-valuation carries foraging (§6.1, verdict). No
trip mechanism is staged. Bit 2 is a separate correction the diagnosis implicates (A1-d: 57% of S28's extra hunt impulses
re-sight a colobus group the male perceived at a decision point within the hour; perception.ts counts a group as met when
it differs from the group perceived at the previous decision point, so more decision points and more walking re-open the
same hunt decision), and hunting is S28's fitted cost (T-HUN-1 57 on 5 seeds, fitted z +2.4). In X3 it lowered the
observer's hunts from X1's 55 to 32; X3 cannot separate it from bit 1's collapse, so it is tested alone.

**Change.** `experienceValue` 2 alone (bit 2 of §5.1, unchanged code): a colobus group the animal perceived at one of its
decision points within `reunionH` is not met anew and raises no hunt impulse. Bit 1 off. No counted entry is read less (a
correction); no new magnitude (`reunionH`, E5e's convention, also E4j's span for patrol fusion).

**Arm Y2** = S28 + `experienceValue` 2, from a frozen detached checkout of the commit that adds this section: e-bench
`--quick`, energy-diagnose, redecide-diagnose and rhythm-metrics (seeds 48 and 7, burn-in 30, 30 days; `--workers` 1 above
load 8; no run starts above load 30).

**Predictions (against the S28q group; low confidence unless stated).**

| Quantity | S28q (mean ± SD) | S27q mean | Y2 | Confidence |
| --- | --- | --- | --- | --- |
| Prescriptions | 39 | 41 | 39 | high |
| Viability; night safety | pass | pass | pass | moderate |
| Hunt-impulse decisions per male-day; re-sighting share (truth) | 0.239 ± 0.017; 0.44 ± 0.05 | 0.139; 0.33 | 0.12–0.17; ≤ 0.10 | moderate |
| T-HUN-1 | 47.8 ± 6.2 | 26.0 | 22–38 | low |
| Truth hunts per community-year | 83.1 ± 2.3 | 43.6 | 40–65 | low |
| Ground km (males), adults' climbing, T-FOOD-4, trips per adult-day | 3.92; 74.2; 13.68; 26.9 | 2.81; 46.0; 9.31; 15.4 | each within ± 2 SD of the S28q mean | moderate |
| Reserves %/day, every class | S28q group | — | within ± 2 SD of the S28q mean | low |
| Fitted | 2.85 ± 0.61 | — | below the S28q mean (z ≤ 0) | low |
| Held-out with and without the rare rows | reference mean | — | inside noise | moderate |

**Kill criterion:** as §5.1 (a)–(c) and (e); (d) the mechanism does not run: re-sighting impulses per male-day not below
the S28q group's mean − 2 SD.

**Verdict rule (registered).** A correction: a **provisional keep candidate** if none of the kill criteria holds and the
observer's T-HUN-1 is at least half-way from the S28q mean to the S27q mean (≤ 36.9); otherwise recorded and off. Its
walking, climbing and trees are reported (no change predicted).

## 6. Results

### 6.1 Iteration 1: X1 = S28 + `experienceValue` 1, X3 = S28 + `experienceValue` 3 (frozen checkout a25a19b, clean)

Printed by `final_table.py` (the integrator's `judge_vs_reps.py` for the sums, his slope convention for reserves), `night.py` and the redecide readouts, from the JSON (session scratch `e3g/arms/`). The S28q group's prescription count (40) is the old ledger's; the arms' 39 is the corrected one, the same rules.

```
  S28q: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S28q1: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S28q2: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S28q3: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True}
  S27q: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S27q1: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S27q2: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S27q3: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  X1: a25a19b dirty 0 prescriptions 39 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  X3: a25a19b dirty 0 prescriptions 39 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}

quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 12
  fitted             (17 rows) ref 3.65, 2.16, 2.74, 2.85 (mean 2.85, sd 0.61; used 0.69) | X1.json: 3.85, Δ +1.00, z +1.3 (inside noise) | X3.json: 3.63, Δ +0.78, z +1.0 (inside noise)
  held-out           (12 rows) ref 3.21, 5.32, 4.48, 2.93 (mean 3.98, sd 1.12; used 1.26) | X1.json: 4.01, Δ +0.03, z +0.0 (inside noise) | X3.json: 4.91, Δ +0.93, z +0.7 (inside noise)
  held-out w/o rare  (11 rows) ref 2.91, 3.48, 3.71, 2.89 (mean 3.25, sd 0.41; used 0.48) | X1.json: 3.70, Δ +0.45, z +0.8 (inside noise) | X3.json: 4.40, Δ +1.15, z +2.2 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-1   fitted   ref 0.00±0.00 | X1.json 0.15 (fail) | X3.json 0.10 (fail)
   T-ACT-2   fitted   ref 0.00±0.00 | X1.json 0.53 (fail) | X3.json 0.48 (fail)
   T-FOOD-2  fitted   ref 0.19±0.10 | X1.json 0.99 (fail) | X3.json 0.74 (fail)
   T-FOOD-5  held-out ref 0.00±0.00 | X1.json 0.64 (fail) | X3.json 0.30 (fail)
   T-HUN-1   fitted   ref 1.14±0.31 | X1.json 1.50 (fail) | X3.json 0.35 (inconclusive)
   T-HUN-2   fitted   ref 0.00±0.00 | X1.json 0.13 (fail) | X3.json 0.22 (fail)
   T-HUN-4   held-out ref 0.73±0.79 | X1.json 0.32 (fail) | X3.json 0.51 (fail)
   T-RNG-5   held-out ref 0.87±0.38 | X1.json 0.00 (pass) | X3.json 0.94 (fail)
   T-SOC-10  held-out ref 0.00±0.00 | X1.json 0.39 (fail) | X3.json 0.63 (fail)
   T-SOC-6   held-out ref 0.39±0.05 | X1.json 0.40 (fail) | X3.json 0.52 (fail)

Against the S27q group (S28q itself shown first):
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.50, 2.68, 1.04, 2.26 (mean 1.87, sd 0.74; used 0.74) | S28q.json: 2.61, Δ +0.74, z +0.9 (inside noise) | X1.json: 3.85, Δ +1.98, z +2.4 RESULT | X3.json: 3.57, Δ +1.70, z +2.1 RESULT
  held-out           (12 rows) ref 4.27, 4.04, 3.73, 3.22 (mean 3.82, sd 0.46; used 1.26) | S28q.json: 3.21, Δ -0.60, z -0.4 (inside noise) | X1.json: 4.01, Δ +0.20, z +0.1 (inside noise) | X3.json: 4.91, Δ +1.09, z +0.8 (inside noise)
  held-out w/o rare  (11 rows) ref 3.45, 4.04, 3.73, 3.22 (mean 3.61, sd 0.36; used 0.48) | S28q.json: 2.91, Δ -0.69, z -1.3 (inside noise) | X1.json: 3.70, Δ +0.09, z +0.2 (inside noise) | X3.json: 4.40, Δ +0.80, z +1.5 (inside noise)
| Readout | S28q runs | S28q mean ± SD | S27q mean | X1 | X3 |
| --- | --- | --- | --- | --- | --- |
| ground km, adult male | 4.02 / 3.87 / 3.74 / 4.04 | 3.92 ± 0.14 | 2.81 | 1.32 (z -16.2) | 1.42 (z -15.6) |
| ground km, female lactating | 3.66 / 3.62 / 3.51 / 3.65 | 3.61 ± 0.07 | 2.48 | 1.04 (z -33.0) | 1.20 (z -30.9) |
| ground km, female other | 3.09 / 2.68 / 2.68 / 3.01 | 2.87 ± 0.22 | 2.08 | 0.92 (z -8.1) | 1.09 (z -7.4) |
| ground km, juvenile 5–12 y | 3.87 / 3.81 / 3.79 / 3.88 | 3.84 ± 0.05 | 2.83 | 1.42 (z -47.3) | 1.43 (z -47.1) |
| climbing kcal/day, adults (day-weighted) | 73.8 / 73.2 / 70.5 / 79.5 | 74.2 ± 3.8 | 46.0 | 28.0 (z -10.9) | 28.9 (z -10.7) |
| climbing kcal/day, adult male | 96.2 / 97.4 / 92.2 / 106.4 | 98.1 ± 6.0 | 59.0 | 38.0 (z -9.0) | 38.1 (z -9.0) |
| climbing kcal/day, female lactating | 56.8 / 56.6 / 55.1 / 60.0 | 57.1 ± 2.1 | 37.5 | 20.3 (z -16.0) | 21.8 (z -15.3) |
| climbing kcal/day, female other | 56.9 / 51.4 / 50.8 / 59.9 | 54.7 ± 4.4 | 34.2 | 21.1 (z -6.8) | 22.1 (z -6.6) |
| T-FOOD-4 | 13.965 / 13.652 / 13.271 / 13.833 | 13.680 ± 0.301 | 9.312 | 5.552 (z -24.1) | 5.685 (z -23.7) |
| T-HUN-1 | 49.863 / 41.658 / 44.121 / 55.543 | 47.796 ± 6.204 | 25.969 | 54.946 (z +1.0) | 32.088 (z -2.3) |
| T-HUN-3 | 0.069 / 0.138 / 0.064 / 0.074 | 0.086 ± 0.035 | 0.068 | 0.222 (z +3.5) | 0.041 (z -1.2) |
| T-RNG-4 | 3.558 / 3.319 / 2.860 / 2.985 | 3.181 ± 0.318 | 2.264 | 1.416 (z -5.0) | 1.344 (z -5.2) |
| T-ACT-1 | 0.406 / 0.404 / 0.394 / 0.402 | 0.402 ± 0.005 | 0.375 | 0.516 (z +19.6) | 0.489 (z +15.0) |
| T-ACT-2 | 0.158 / 0.155 / 0.154 / 0.167 | 0.158 ± 0.006 | 0.116 | 0.050 (z -16.7) | 0.056 (z -15.8) |
| T-ACT-3 | 0.090 / 0.093 / 0.087 / 0.091 | 0.090 ± 0.003 | 0.098 | 0.095 (z +1.6) | 0.101 (z +3.7) |
| T-ACT-4 | 0.412 / 0.391 / 0.385 / 0.373 | 0.390 ± 0.016 | 0.421 | 0.337 (z -2.9) | 0.370 (z -1.1) |
| T-FOOD-2 | 0.820 / 0.796 / 0.837 / 0.806 | 0.815 ± 0.018 | 0.808 | 0.422 (z -19.7) | 0.467 (z -17.4) |
| T-PTY-1 | 4.944 / 4.631 / 4.489 / 4.776 | 4.710 ± 0.195 | 4.586 | 6.320 (z +7.4) | 5.619 (z +4.2) |
| T-IGE-1 | 19.279 / 3.066 / 10.451 / 9.297 | 10.523 ± 6.678 | 5.644 | 5.874 (z -0.6) | 4.608 (z -0.8) |
| T-FOOD-10 | 0.599 / 0.562 / 0.633 / 0.576 | 0.593 ± 0.031 | 0.588 | 0.650 (z +1.7) | 0.591 (z -0.0) |
| reserves %/day, adult male | 0.003 / 0.005 / -0.001 / 0.011 | 0.004 ± 0.005 | 0.002 | 0.005 (z +0.1) | -0.021 (z -4.6) |
| reserves %/day, female, other | -0.054 / -0.025 / -0.026 / -0.026 | -0.033 ± 0.014 | 0.006 | -0.107 (z -4.8) | -0.088 (z -3.6) |
| reserves %/day, female, lactating | -0.036 / -0.003 / -0.030 / -0.028 | -0.024 ± 0.014 | -0.000 | -0.105 (z -5.0) | -0.087 (z -3.9) |
| reserves %/day, juvenile 5–12 y | -0.086 / -0.069 / -0.076 / -0.082 | -0.078 ± 0.007 | -0.027 | -0.217 (z -16.8) | -0.135 (z -6.9) |
| reserves %/day, infant 2–5 y | -0.016 / 0.035 / -0.017 / -0.040 | -0.010 ± 0.032 | -0.011 | -0.075 (z -1.9) | -0.020 (z -0.3) |
| reserves %/day, infant 0.5–2 y | -0.051 / -0.054 / -0.054 / -0.025 | -0.046 ± 0.014 | 0.009 | -0.134 (z -5.7) | -0.154 (z -6.9) |
| eating min, adult male | 242.4 / 242.1 / 238.4 / 245.4 | 242.1 ± 2.9 | 233.2 | 300.5 (z +18.1) | 280.6 (z +11.9) |
| eating min, female, other | 244.4 / 245.0 / 251.7 / 234.0 | 243.8 ± 7.3 | 230.7 | 339.7 (z +11.8) | 326.1 (z +10.1) |
| eating min, female, lactating | 331.0 / 331.9 / 318.2 / 324.6 | 326.4 ± 6.4 | 313.2 | 415.2 (z +12.5) | 381.6 (z +7.7) |
| eating min, juvenile 5–12 y | 294.2 / 294.3 / 286.5 / 298.0 | 293.2 ± 4.8 | 285.8 | 356.1 (z +11.6) | 340.9 (z +8.8) |
| trips per adult-day (truth) | 27.52 / 26.33 / 25.52 / 28.12 | 26.87 ± 1.17 | 15.38 | 4.40 (z -17.2) | 4.92 (z -16.8) |
| switches per adult-day (truth) | 68.52 / 66.96 / 64.53 / 71.10 | 67.78 ± 2.76 | 42.94 | 42.96 (z -8.0) | 43.01 (z -8.0) |
| truth hunts per community-year | 81.1 / 85.2 / 81.1 / 85.2 | 83.1 ± 2.3 | 43.6 | 95.3 (z +4.6) | 54.8 (z -10.8) |
| trip yield expectation (mean) | — / — / — / — | — ± — | — | 0.128 (z +nan) | 0.172 (z +nan) |

Sums on rows scored in every run listed (fitted / held-out; with rare rows, then without T-HUN-4, T-BRD-1, T-IGE-3):
  S28q: 2.61 / 3.21; 2.61 / 2.91
  S28q1: 1.88 / 5.32; 1.88 / 3.48
  S28q2: 2.74 / 4.48; 2.74 / 3.71
  S28q3: 2.85 / 2.93; 2.85 / 2.89
  S27q: 1.50 / 4.27; 1.50 / 3.45
  S27q1: 2.68 / 4.04; 2.68 / 4.04
  S27q2: 1.04 / 3.73; 1.04 / 3.73
  S27q3: 2.26 / 3.22; 2.26 / 3.22
  X1: 3.85 / 4.01; 3.85 / 3.70
  X3: 3.57 / 4.91; 3.57 / 4.40
X1-rhythm.json: adults out of a nest 2.57% of night; T-RHY-5 0.0178; night deaths 0; deaths 0
X3-rhythm.json: adults out of a nest 2.43% of night; T-RHY-5 0.0178; night deaths 0; deaths 0
X1: identity (adult males' eating min, ground km) 300.489 / 1.318; ty mean 0.128 (median 0.097, n 62); trips 4.398 and switches 42.964 per adult-day; truth hunts 95.306 per community-year
   trip-own: 2.404 a day, fed at target 0.257; trip-joined: 1.039 a day, fed at target 0.503; trip-caller: 0.956 a day, fed at target 0.063
   hunt impulses 0.106 per male-day, re-sightings 0.236, lead share 0.528
X3: identity (adult males' eating min, ground km) 280.597 / 1.418; ty mean 0.172 (median 0.159, n 62); trips 4.925 and switches 43.012 per adult-day; truth hunts 54.75 per community-year
   trip-own: 2.829 a day, fed at target 0.287; trip-joined: 1.148 a day, fed at target 0.513; trip-caller: 0.948 a day, fed at target 0.06
   hunt impulses 0.083 per male-day, re-sightings 0.057, lead share 0.386
```

**What happened.** The animals learned that their trips deliver about a tenth of the meal they are valued at (ty: mean
0.13, median 0.10 in X1), and with trips valued at that, they almost stopped making them: 4.4 trips per adult-day (S28
26.9, S27 15.4), adult males walk 1.32 km a day (S28 3.92, S27 2.81), the travel share falls to 0.05 (band 0.12–0.25),
the fruit share to 0.42 (band 0.60–0.78), eating time rises by 60–90 min a day on fallback food, and every class but
adult males loses reserves faster (juveniles −0.217 %/day against −0.078 ± 0.007). Fewer trips did not make the remaining
ones succeed: own trips still fed at their target in 26–29% (S28 34%), so the expectation never recovered (no selection
by the animal can raise it). The measure conflated two shortfalls: a trip that does feed at its target eats about a third
of the gut-room meal, but so does a bout at a crown in view (bouts end sated, 54%, E3f), which kept its full value: trips
were put on a worse footing than staying, not the same one. Bit 2 halves the observer's hunts with it (T-HUN-1 32 against
55 for X1; re-sightings 0.24 → 0.06 of impulses).

**Against the predictions.** Prescriptions 39: held. Viability (no death) and night (2.57%, 2.43%; T-RHY-5 0.018): held.
Trips 13–21 a day: missed (4.4, 4.9). Males' km 2.3–3.3: missed (1.32, 1.42); mothers' and juveniles' km missed (1.0–1.4).
Adults' climbing 45–62: missed (28.0, 28.9). T-FOOD-4 9–12: missed (5.6, 5.7). T-RNG-4 2.0–2.9: missed (1.42, 1.34).
T-HUN-1: X1 25–45 missed (54.9), X3 12–30 missed narrowly (32.1). T-ACT-2 0.11–0.15: missed (0.050, 0.056). Reserves at or
above the S28q mean: missed for every class but adult males in X1. ty 0.2–0.5: missed (0.13, 0.17). Sums: X1 inside noise
(fitted z +1.3, held-out 0.0, without the rare rows +0.8); X3 fitted +1.0, held-out +0.7, without the rare rows **+2.2**.

**Kill criterion: met by both arms**, (b) (juveniles −0.217 and −0.135, other females −0.107 and −0.088, nursing mothers
−0.105 and −0.087, infants 0.5–2 y −0.134 and −0.154 %/day, against S28q means of −0.078, −0.033, −0.024 and −0.046), and
(c) for X3 (held-out without the rare rows z +2.2). (a), (d) and (e) do not hold.

**Verdict: null; `experienceValue` 1 and 3 recorded, off.** Valuing trips at what they deliver collapses travel, because
what makes trips fail (departures nobody follows, crowns found empty) is upstream of the valuation and does not improve
when trips become rare: on this stack the over-valuation of trips is what carries foraging, and the keep test only lets
it act more often. Bit 2 (an encounter is a group not seen within the hour) acted as intended on hunting and is tested
alone next.


### 6.2 Iteration 2: Y2 = S28 + `experienceValue` 2 (frozen checkout 8a4d1d8, clean)

Printed by `final_table.py`, `night.py` and the redecide readouts from the JSON (session scratch `e3g/arms/`).

```
  S28q: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S28q1: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S28q2: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S28q3: 28d249e dirty 0 prescriptions 40 viability {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True}
  S27q: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S27q1: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S27q2: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S27q3: 28d249e dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  Y2: 8a4d1d8 dirty 0 prescriptions 39 viability {'pass': True, 'births': 0, 'deaths': 2, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True}

quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 13
  fitted             (17 rows) ref 3.65, 2.16, 2.74, 2.85 (mean 2.85, sd 0.61; used 0.69) | Y2.json: 2.01, Δ -0.84, z -1.1 (inside noise)
  held-out           (13 rows) ref 3.44, 5.32, 4.64, 3.43 (mean 4.21, sd 0.94; used 1.26) | Y2.json: 5.23, Δ +1.02, z +0.7 (inside noise)
  held-out w/o rare  (12 rows) ref 3.14, 3.48, 3.88, 3.39 (mean 3.47, sd 0.31; used 0.48) | Y2.json: 3.49, Δ +0.02, z +0.0 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-1   fitted   ref 1.14±0.31 | Y2.json 0.25 (inconclusive)
   T-HUN-4   held-out ref 0.73±0.79 | Y2.json 1.73 (fail)

  fitted             (16 rows) ref 1.50, 2.68, 1.04, 2.26 (mean 1.87, sd 0.74; used 0.74) | S28q.json: 2.61, Δ +0.74, z +0.9 (inside noise) | Y2.json: 2.01, Δ +0.14, z +0.2 (inside noise)
  held-out           (12 rows) ref 4.27, 4.04, 3.73, 3.22 (mean 3.82, sd 0.46; used 1.26) | S28q.json: 3.21, Δ -0.60, z -0.4 (inside noise) | Y2.json: 4.73, Δ +0.91, z +0.6 (inside noise)
  held-out w/o rare  (11 rows) ref 3.45, 4.04, 3.73, 3.22 (mean 3.61, sd 0.36; used 0.48) | S28q.json: 2.91, Δ -0.69, z -1.3 (inside noise) | Y2.json: 2.99, Δ -0.62, z -1.1 (inside noise)
| Readout | S28q runs | S28q mean ± SD | S27q mean | Y2 |
| --- | --- | --- | --- | --- |
| ground km, adult male | 4.02 / 3.87 / 3.74 / 4.04 | 3.92 ± 0.14 | 2.81 | 3.89 (z -0.2) |
| ground km, female lactating | 3.66 / 3.62 / 3.51 / 3.65 | 3.61 ± 0.07 | 2.48 | 3.64 (z +0.3) |
| ground km, female other | 3.09 / 2.68 / 2.68 / 3.01 | 2.87 ± 0.22 | 2.08 | 2.73 (z -0.6) |
| ground km, juvenile 5–12 y | 3.87 / 3.81 / 3.79 / 3.88 | 3.84 ± 0.05 | 2.83 | 3.69 (z -2.9) |
| climbing kcal/day, adults (day-weighted) | 73.8 / 73.2 / 70.5 / 79.5 | 74.2 ± 3.8 | 46.0 | 71.4 (z -0.7) |
| climbing kcal/day, adult male | 96.2 / 97.4 / 92.2 / 106.4 | 98.1 ± 6.0 | 59.0 | 95.4 (z -0.4) |
| climbing kcal/day, female lactating | 56.8 / 56.6 / 55.1 / 60.0 | 57.1 ± 2.1 | 37.5 | 54.5 (z -1.1) |
| climbing kcal/day, female other | 56.9 / 51.4 / 50.8 / 59.9 | 54.7 ± 4.4 | 34.2 | 52.4 (z -0.5) |
| T-FOOD-4 | 13.965 / 13.652 / 13.271 / 13.833 | 13.680 ± 0.301 | 9.312 | 13.623 (z -0.2) |
| T-HUN-1 | 49.863 / 41.658 / 44.121 / 55.543 | 47.796 ± 6.204 | 25.969 | 29.918 (z -2.6) |
| T-HUN-3 | 0.069 / 0.138 / 0.064 / 0.074 | 0.086 ± 0.035 | 0.068 | 0.080 (z -0.2) |
| T-RNG-4 | 3.558 / 3.319 / 2.860 / 2.985 | 3.181 ± 0.318 | 2.264 | 3.116 (z -0.2) |
| T-ACT-1 | 0.406 / 0.404 / 0.394 / 0.402 | 0.402 ± 0.005 | 0.375 | 0.418 (z +2.8) |
| T-ACT-2 | 0.158 / 0.155 / 0.154 / 0.167 | 0.158 ± 0.006 | 0.116 | 0.160 (z +0.3) |
| T-ACT-3 | 0.090 / 0.093 / 0.087 / 0.091 | 0.090 ± 0.003 | 0.098 | 0.090 (z -0.0) |
| T-ACT-4 | 0.412 / 0.391 / 0.385 / 0.373 | 0.390 ± 0.016 | 0.421 | 0.354 (z -2.0) |
| T-FOOD-2 | 0.820 / 0.796 / 0.837 / 0.806 | 0.815 ± 0.018 | 0.808 | 0.803 (z -0.6) |
| T-PTY-1 | 4.944 / 4.631 / 4.489 / 4.776 | 4.710 ± 0.195 | 4.586 | 4.730 (z +0.1) |
| T-IGE-1 | 19.279 / 3.066 / 10.451 / 9.297 | 10.523 ± 6.678 | 5.644 | 7.648 (z -0.4) |
| T-FOOD-10 | 0.599 / 0.562 / 0.633 / 0.576 | 0.593 ± 0.031 | 0.588 | 0.599 (z +0.2) |
| reserves %/day, adult male | 0.003 / 0.005 / -0.001 / 0.011 | 0.004 ± 0.005 | 0.002 | -0.001 (z -1.0) |
| reserves %/day, female, other | -0.054 / -0.025 / -0.026 / -0.026 | -0.033 ± 0.014 | 0.006 | -0.028 (z +0.3) |
| reserves %/day, female, lactating | -0.036 / -0.003 / -0.030 / -0.028 | -0.024 ± 0.014 | -0.000 | -0.027 (z -0.2) |
| reserves %/day, juvenile 5–12 y | -0.086 / -0.069 / -0.076 / -0.082 | -0.078 ± 0.007 | -0.027 | -0.051 (z +3.3) |
| reserves %/day, infant 2–5 y | -0.016 / 0.035 / -0.017 / -0.040 | -0.010 ± 0.032 | -0.011 | -0.025 (z -0.4) |
| reserves %/day, infant 0.5–2 y | -0.051 / -0.054 / -0.054 / -0.025 | -0.046 ± 0.014 | 0.009 | -0.025 (z +1.3) |
| eating min, adult male | 242.4 / 242.1 / 238.4 / 245.4 | 242.1 ± 2.9 | 233.2 | 240.5 (z -0.5) |
| eating min, female, other | 244.4 / 245.0 / 251.7 / 234.0 | 243.8 ± 7.3 | 230.7 | 230.6 (z -1.6) |
| eating min, female, lactating | 331.0 / 331.9 / 318.2 / 324.6 | 326.4 ± 6.4 | 313.2 | 328.8 (z +0.3) |
| eating min, juvenile 5–12 y | 294.2 / 294.3 / 286.5 / 298.0 | 293.2 ± 4.8 | 285.8 | 294.6 (z +0.3) |
| trips per adult-day (truth) | 27.52 / 26.33 / 25.52 / 28.12 | 26.87 ± 1.17 | 15.38 | 25.63 (z -1.0) |
| switches per adult-day (truth) | 68.52 / 66.96 / 64.53 / 71.10 | 67.78 ± 2.76 | 42.94 | 64.94 (z -0.9) |
| truth hunts per community-year | 81.1 / 85.2 / 81.1 / 85.2 | 83.1 ± 2.3 | 43.6 | 71.0 (z -4.6) |
| trip yield expectation (mean) | — / — / — / — | — ± — | — | 1.000 (z +nan) |

Sums on rows scored in every run listed (fitted / held-out; with rare rows, then without T-HUN-4, T-BRD-1, T-IGE-3):
  S28q: 2.61 / 3.21; 2.61 / 2.91
  S28q1: 1.88 / 5.32; 1.88 / 3.48
  S28q2: 2.74 / 4.48; 2.74 / 3.71
  S28q3: 2.85 / 2.93; 2.85 / 2.89
  S27q: 1.50 / 4.27; 1.50 / 3.45
  S27q1: 2.68 / 4.04; 2.68 / 4.04
  S27q2: 1.04 / 3.73; 1.04 / 3.73
  S27q3: 2.26 / 3.22; 2.26 / 3.22
  Y2: 2.01 / 4.73; 2.01 / 2.99
Y2-rhythm.json: adults out of a nest 2.06% of night; T-RHY-5 0.0173; night deaths 0; deaths 2
Y2: identity (adult males' eating min, ground km) 240.466 / 3.886 (energy-diagnose 240.466 / 3.886); trips 25.629 and switches 64.939 per adult-day; truth hunts 70.972 per community-year; deaths {'illness': 1, 'infanticide by Koruza (West community)': 1}
   hunt impulses 0.173 per male-day, re-sightings 0.136, lead share 0.25, leads 0.043 per male-day
   trip-own: 11.888 a day, fed at target 0.353; trip-joined: 10.446 a day, fed at target 0.566; trip-caller: 3.296 a day, fed at target 0.035
```

**What happened.** With a colobus group seen within the hour no longer met anew, adult males' hunt-impulse decisions fall
from 0.239 ± 0.017 to 0.173 per male-day, re-sightings from 44% of them to 14% (sightings more than an hour apart still
count), the lead share stays near S28's (0.25 against 0.20), and the observer's hunts fall to T-HUN-1 29.9 (S28q 47.8 ±
6.2, S27q 26.0; band 5–25): 82% of S28's excess over S27 removed. Truth hunts 71.0 per community-year (83.1 ± 2.3).
Walking, climbing, crown visits, trips and switching stay at S28's level (males 3.89 km, adults' climbing 71.4 kcal,
T-FOOD-4 13.6, 25.6 trips per adult-day), as registered; juveniles walk a little less (3.69 against 3.84 ± 0.05) and their
reserves fall more slowly (−0.051 against −0.078 ± 0.007). The run's two deaths are an illness and an infanticide by a
West community male, none from starvation.

**Against the predictions.** Prescriptions 39: held. Viability and night safety (2.06%, T-RHY-5 0.0173): held. Hunt
impulses 0.12–0.17 per male-day: missed narrowly (0.173); re-sighting share ≤ 0.10: missed (0.136). T-HUN-1 22–38: held
(29.9). Truth hunts 40–65: missed (71.0). Males' km, adults' climbing, T-FOOD-4 and trips within ± 2 SD of S28q: held
(z −0.2, −0.7, −0.2, −1.0). Reserves within ± 2 SD: held, except juveniles, better (z +3.3). Fitted below the S28q mean:
held (2.01, z −1.1, inside noise). Held-out inside noise: held (z +0.7; without the rare rows 0.0).

**Kill criterion: not met.** (a) no starvation, no seed below 80% of its start; (b) the largest fall against the S28q mean
is infants 2–5 y, 0.015% of the store a day; (c) held-out inside noise with and without the rare rows; (d) re-sighting
impulses 0.024 per male-day, below the S28q group's 0.104 − 2 × 0.008; (e) night safe.

**Verdict: `experienceValue` 2 is a provisional keep candidate as a correction** (no counted prescription removed; T-HUN-1
29.9 ≤ 36.9, more than half-way from S28q's mean to S27q's): a colobus group the animal saw at one of its decision points
within the hour does not re-open the hunt decision. It recovers S28's hunting cost, which carried S28's fitted sum on 5
seeds (z +2.4), and leaves its walking, climbing and trees where they are.

## 7. Known defects in the code under test

Deferred (found by the diagnosis, not this stage's question; file:line at 8a4d1d8):
- A trip to a caller stops `joinCallStopM` (25 m) short of the caller and is never turned into feeding at the caller's
  crown (the arrival rule, src/sim/rg.ts:354–366, converts trips to trees only): 3.5% of caller trips feed at that crown,
  the rest end in a fresh draw 25–27 m away (amendment-1 readouts, §2.2).
- Own trips that a departure nobody followed gives up (src/sim/execution.ts:551–580, `departWait` with `departPersist` 1
  and `departValue` 0) close 60–90 m from their target having barely moved; they are two thirds of unfed own trips and
  count as trips in every readout (§2.2 A1-b); `departValue` (E5f) changes this, and §2.2 notes how it amplifies the
  keep test's trips.
- A remembered crown's crop belief (src/sim/candidates.ts:498, 520, 575, 614: `x.treeCrop`, else 0.2) is the crop last
  seen, with no expectation of what the companions it left feeding there eat meanwhile: 62–84% of unfed trips that reach
  their target find it below 0.06 units (§2.2 A1-b). Not changed here (the next lever, §8).
- E3d §7's joined-trip arrival loop is unchanged.

## 8. Stage verdict

- **Diagnosis (S28 against S27, quick, four realizations each, simulation truth).** Re-deciding adds trips through the
  keep test, not through fresh choices at need or light changes: S28's 'outvalued' switches (rg.ts `stillBest` at every
  bout end and interrupt, 26 per adult-day, 12 of them into trips) carry +1.33 km, +31 kcal of climbing and +6.9 crown
  visits per adult-day against net changes of +1.03 km, +28 kcal and +5.2 visits; acts that end (a cascade of unfed
  trips) +0.43 km; need-bucket and light-phase chains +0.34 km, and the switches there that the keep test would have kept
  only 0.04 km. Most keep-test switches are an option new since the draw whose value alone beats the act held (rest ends
  for an own trip, 3.4 a day; rest and crown feeding end for a companion's departure, 4.4). The valuation promises far
  more than trips deliver, in both stacks: 13–31% of the bout energy a trip is valued at is eaten at its target (two
  thirds of trips never feed there: departures nobody followed, crowns found empty; a fed trip eats about a third), and
  trips that leave a crown yield less than the rate left. S27's gate, clock and bonus held acts and hid the same error.
  57% of S28's extra hunt impulses re-sight a colobus group the male perceived within the hour.
- **Iteration 1, `experienceValue` 1 and 3** (trips valued at the share of that meal the animal's own trips delivered,
  learned per trip; 3 adds bit 2): null by the kill criterion. The animals learned about a tenth and nearly stopped
  travelling (4.4 trips a day, males 1.3 km, travel share 0.05, fruit share 0.42), and reserves fell (juveniles −0.22
  %/day): what makes trips fail is upstream and does not improve when trips are rare, and the measure also charged trips
  for the satiation shortfall every bout has. On this stack the over-valuation of trips carries foraging.
- **Iteration 2, `experienceValue` 2** (a colobus group seen at a decision point within `reunionH` is not met anew): a
  **provisional keep candidate as a correction**: viable, night safe (2.06%), every sum inside noise (fitted z −1.1,
  held-out +0.7, without the rare rows 0.0), T-HUN-1 47.8 → 29.9 (82% of S28's excess over S27 removed), walking,
  climbing and trees unchanged, juveniles' reserves better. Prescriptions unchanged (39 on the corrected ledger).
- **What it means.** The trips re-deciding adds are what the valuation says; the valuation is wrong about trips, but the
  error is the belief and the departure that make trips fail, not the trip's value term: correcting the value alone
  starves the animals. The hunts re-deciding adds were mostly the same colobus group counted again.
- **Open (the biggest problem).** Two thirds of trips never feed at their target. A remembered crown's crop belief takes
  no account of the companions the animal left feeding there (62–84% of unfed arrivals find it empty), and an unanswered
  departure ends as a failed trip (`departValue` turns it into a walked one, which is why S32's walking cost is larger).
  A belief that expects others' eating, from what the animal saw, is the next lever; the keep test should then add fewer
  and better trips.
