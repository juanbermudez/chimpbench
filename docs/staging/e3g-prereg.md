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

## 3. Field rows scored here: samples

(Written before any arm.)

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
