# E3g pre-registration: why re-deciding adds trips

Status: skeleton committed at the start of the stage (4 October 2026; branch `e3g-redecide-trips`, from `track-e`
d8417b5), before any run and before any code change. Track E, stage E3g. Rule served: field values of behaviour are
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

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
