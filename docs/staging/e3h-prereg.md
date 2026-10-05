# E3h pre-registration: trips that find food

Status: skeleton committed at the start of the stage (branch `e3h-trip-beliefs`, from `track-e` 90aa294), before any run
and before any code change. Track E, stage E3h. Rule served: field values of behaviour are targets to benchmark against,
never inputs. No value, bonus or weight is added to hit a travel share, a day range or a feeding-tree count.

## 0. The problem

E3g (docs/staging/e3g-prereg.md §2.2, §7, §8), measured on S27 and S28 in quick mode: trips deliver 13–31% of the meal
they are valued at, and two thirds never feed at their target. Three causes were named (file:line at E3g's head 8a4d1d8):
1. A remembered crown's crop belief is the crop last seen (`x.treeCrop`, else 0.2; src/sim/candidates.ts trip offers),
   with no expectation of what the companions the animal left feeding there eat meanwhile: 62–84% of unfed trips that
   reach their target find it below 0.06 units.
2. An own trip that a departure nobody followed gives up (`departWait`, src/sim/execution.ts) closes 60–90 m from its
   target: two thirds of unfed own trips. On S31, E5f's `departValue` 2 turns such departures into walked trips alone.
3. A trip to a caller stops `joinCallStopM` (25 m) short and is never turned into feeding at the caller's crown (the
   arrival rule, src/sim/rg.ts ~354–366, converts trips to trees only): 3.5% of caller trips feed there.
So the valuation over-promises trips, and `redecideValue` (off the stack since the fallback to S31) multiplies the failed
trips.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S31 in quick mode (seeds 48 and 7, burn-in 30, 30 days),
   simulation truth: trips per adult-day by kind (remembered crown, crown in view, a companion's trip, a caller,
   departure), the share that feed at the target, why the rest do not (crown empty on arrival and what ate it: the
   companions seen there when the animal left, others; departure given up; caller trip stopping short; re-decided en
   route), the believed crop at departure against the crop on arrival, and the km and kcal each failure costs. Name the
   term, with numbers.
2. **Mechanism** behind a new switch (0 = today), from first principles, only for what the diagnosis implicates. Every
   input sourced or tagged design; no weight chosen to hit a rate. After the arms, one extra diagnostic arm (not a
   candidate): the best arm plus `redecideValue` 2.
3. At most three iterations, each logged here and committed before its run; arms = S31 + the switch, quick mode, judged
   against the integrator's four S31 quick realizations (e-noise.md amendment 2; rare rows per amendment 3).

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**What the code does (read at 90aa294, field profile, S31's switches).** S31 has no `redecideValue`: an adult's act is
kept by the C13 gate (rg.ts `gate`) unless an interrupt arrived, a hunt or patrol impulse is new, a need changed bucket,
the period changed, the intention is older than `rgMaxAgeH`, the act ended, or a crown is patch-poor; then a draw takes
the menu option with the highest value plus its jitter and, for a crown out of sight, a crop drawn from the animal's
belief (`choiceBelief` 2). Perception runs only at decision points (decide.ts).
- *Trips and their crops* (candidates.ts, `forageRate` 1). An own trip (travel V.TREE, no leader) goes to a crown out of
  sight (≥ `memoryTreeMinM` 35 m; trees are seen to 35 m): a remembered tree, valued at the crop belief `x.treeCrop`
  (C7a: written when the animal sees the crown, perception.ts:186–203, or leaves it after feeding, execution.ts:203–206;
  else 0.2), or one of the community's 40 known trees (foraging.ts `dailyKnownTrees`: the day's trees in the familiar
  range with the highest capacity × the share of the species' trees in fruit × the mean fullness; the animal's own belief
  overrides it, candidates.ts:534; trees in its memory are not offered, :530). A joined trip goes to a leader's goal tree
  and a caller trip toward a pant-hoot (its crown x.jt when the caller was heard feeding in one; `socialTiming` bit 4), each
  valued at the crop seen or believed. A crown in view is a forage option valued at the crop seen; the walk is inside the
  forage act.
- *Beliefs.* A belief is updated when the crown is in view at a decision point (rounded to 0.001), deleted (and the tree
  forgotten) when the crop seen is below 0.04 units; a crown is seen as fruiting (in x.trees, so a forage option exists)
  only from 0.06 units (perception.ts:186–189). The trip's value uses the belief through intake.ts `netRateShare` (E =
  min(crop ÷ (1 + feeders counted) × kcal per unit, the bout room)).
- *Arrival.* A trip to a tree stops 3 m from its trunk; at the next decision the gate turns it into feeding there if the
  tree is in view (≥ 0.06) within 6 m (GATE.arriveM) and feeding there is legal (rg.ts:199–204); otherwise 'ended' and a
  draw. A caller trip stops `joinCallStopM` (25 m) from the call point and always ends in a draw.
- *Departures* (`departPersist` 1, `departValue` 2). An own trip with companions of 12 y or more within 50 m is an
  attempt: the animal stands for `departCheckMin` (1 min); nobody joined or followed → it records its settled audience
  and decides at once (execution.ts `departWait`); while that audience is unchanged an own trip goes alone, worth its value
  less the best companion's company (candidates.ts `lost`).

**Tool.** `scripts/trip-diagnose.ts` (new; reads only: rgTap, energyTap, departTap; the world is e-bench's and
energy-diagnose's for the same seed and params). Its header defines every readout. In short: a *trip* is an act an adult
starts at a rules decision that walks to a crown (own, joined, caller, or a forage option at a crown in view whose crown
it stands outside), and the feeding at that crown that follows it (the arrival conversion and an 'ended' draw that picks
feeding there continue it); the brief's five kinds are *remembered crown* (own trips not started as an attempt),
*departure* (own trips started as an attempt), *crown in view*, *a companion's trip* (joined) and *a caller*. *Fed at the
target* = fruit eaten at the trip's crown in the episode. An unfed trip's *cause* at its close: departure given up;
caller stopped short; arrived, empty (within 6 m, crop < 0.06); arrived, crop left; re-decided en route (by trigger);
other. *Sightings*: at every rules decision, each crown the animal perceives and the one it feeds in, with the true crop,
the animals it sees feeding there and the fruit eaten there so far (tracked from 10 days before the window, the belief's
horizon being 240 h). *What ate it*: fruit eaten at the crown between the trip's last sighting of it and the close, by the
feeders seen at that sighting, by the traveller, by others; the phenology's change; the recovery (residual). Costs:
ground km (energy-diagnose's step), the ledger's walk, climb and carry kcal. Also: the believed crop b, the true crop at
the start c0 and at the close c1; beliefs below 0.06; the community list's trips and the same animal's return to a known
tree it reached empty; departTap events; caller trips' ends. **Identity:** adult males' eating minutes and ground km
against energy-diagnose's JSON of the same world (the integrator's `S31q*-energy.json`).

**Smoke tests (done before this registration; disclosed; seed 48 on S31q's parameters, burn-in 1 + 2 days and 3 + 4
days; not representative, not used below).** Every readout fills. In the 3 + 4-day smoke: 49% of trips feed at their
target; own trips to the community's known trees feed 8% (84% of them start at a crown below 0.06; the same animal goes
back to a known tree it reached empty in half of these trips, a median 7 h later); own trips on a belief from a sighting
feed 42–45%; departures given up are a third of unfed trips but move ~1 m each; 9.5% of trips are valued at a believed
crop below 0.06 (the crown cannot be fed in on arrival); among arrivals at empty crowns with a sighting, the feeders seen
there ate little (others and the phenology more); 10% of caller trips feed at the caller's crown.

**Runs.** trip-diagnose on S31q's parameters and on the three re-draws' (`rngSalt` 1, 2, 3; the integrator's
`S31q1..3-params.json`), seeds 48 and 7, burn-in 30, 30 days, field profile, `--workers` 2 (1 above load 8; none above
30), from a frozen detached checkout of the commit that registers this section.

**Reading rules (registered).** Adults, daylight starts, simulation truth; means over the four realizations (SD beside).
- *D1, the term.* The unfed-trip cause with the largest share of the km and kcal spent on unfed trips per adult-day is
  named, with its trips per adult-day and its share of unfed trips; the cause with the most unfed trips is named beside it.
- *D2, the brief's cause 1 (what the companions left there eat).* Own trips on a belief from a sighting ('seen', 'left')
  that arrive at an empty crown: "the companions seen feeding there emptied it" is **supported** if the fruit the feeders
  seen at the last sighting ate after it is ≥ 1/2 of the crop lost between the sighting and the close (crop at sighting −
  c1); otherwise the larger of others' eating and the phenology's fall is named. Reported beside it: the share of those
  trips already below 0.06 at their start (c0), and the same split for all arrivals at empty crowns.
- *D3, beliefs the animal cannot act on.* Trips valued at a believed crop below 0.06 (the crown cannot be fed in on
  arrival): trips and km per adult-day, fed share.
- *D4, the community list.* Own trips to known trees: share of own trips, fed share, share starting at a crown below 0.06,
  and the share that go back to a known tree the same animal reached empty. **Implicated** if known-tree trips are ≥ 1/3
  of own trips (remembered crown + departure) that arrive at empty crowns.
- *D5, departures (the brief's cause 2).* Given-up departures: share of unfed trips, km and kcal per adult-day; the fed
  share of own trips that go alone.
- *D6, callers (the brief's cause 3).* Caller trips with a crown: fed share at it; at the stop, the distance to the
  crown, whether it is in view and its forage option is on the list; the next act.
- The mechanism (step 2) addresses the term(s) these name, with their numbers; a cause the diagnosis does not implicate
  gets no mechanism.

## 3. Field rows scored here: samples

(To be written before any arm.)

## 4. Reference and judging

- Reference **S31** in quick mode, run by the integrator once plus three re-draws (`rngSalt` 1, 2, 3) at bench-run
  4111971 (simulation code identical to this branch's start for S31), each with energy-diagnose (seeds 48, 7; burn-in
  30, 30 days): `bench-run/artifacts/validation/e/s31q/{S31q,S31q1,S31q2,S31q3}.json` and `…-energy.json`; parameters
  `bench-run/artifacts/validation/e/s31q/S31q-params.json`. Not re-run here.
- Each arm (S31 + this stage's switch, same quick settings) against the S31q mean with the integrator's
  `judge_vs_reps.py quick custom` (REFS = the four S31q JSON): z = (arm − mean) ÷ (SD × √(1 + 1/n)); |z| > 2 is a
  result; with and without T-HUN-4, T-BRD-1 and T-IGE-3. Readouts against the reference's own spread (mean ± SD of its
  four runs). Viability must pass; night safety (adults out of a nest ≤ 3.3% of the night, T-RHY-5 ≤ 0.033) for any arm
  that changes when animals move. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S31 48 on the
  current ledger).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
