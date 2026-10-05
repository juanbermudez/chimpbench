# E3h pre-registration: trips that find food

Status: complete (4 October 2026): diagnosis on four realizations of S31 (§2.1), two iterations; `tripBeliefs` 3 a
provisional keep candidate as a correction (§6.1, §8), 7 recorded (§6.2), a diagnostic arm with `redecideValue` 2 (§6.3).
Skeleton committed at the start of the stage (branch `e3h-trip-beliefs`, from `track-e` 90aa294), before any run and before
any code change. Track E, stage E3h. Rule served: field values of behaviour are targets to benchmark against,
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

### 2.1 Diagnosis results (frozen checkout eef9cdc, clean; S31q and its re-draws S31q1–S31q3 by `rngSalt` 1, 2, 3; seeds 48 and 7, 30 + 30 days; simulation truth; printed by the stage's `diag_table.py` and `known_split.py` from the tool's JSON, session scratch `e3h/diag/`)

**Identity:** in all four worlds the tool's adult males' eating minutes and ground km equal energy-diagnose's of the same
world (the integrator's `S31q*-energy.json`), to the last digit printed.

```
Identity (adult males: eating min, ground km), trip-diagnose vs energy-diagnose of the same world:
  S31q: 232.277 / 2.971 vs 232.277 / 2.971; living [(49, 49, {}), (49, 49, {})]
  S31q1: 228.908 / 2.694 vs 228.908 / 2.694; living [(49, 49, {}), (49, 49, {})]
  S31q2: 228.076 / 2.627 vs 228.076 / 2.627; living [(49, 49, {}), (49, 49, {})]
  S31q3: 227.879 / 2.432 vs 227.879 / 2.432; living [(49, 49, {}), (49, 49, {})]

| Trips (adults, daylight starts) | per adult-day | fed at target | km per trip | kcal per trip | E0 kcal | delivered ÷ valued |
| --- | --- | --- | --- | --- | --- | --- |
| remembered crown | 2.566 ± 0.077 | 0.580 ± 0.015 | 0.195 ± 0.001 | 9.252 ± 0.117 | 429.5 ± 9.5 | 0.266 ± 0.008 |
| departure | 5.800 ± 0.209 | 0.279 ± 0.008 | 0.063 ± 0.003 | 3.489 ± 0.100 | 358.1 ± 4.6 | 0.120 ± 0.002 |
| crown in view | 1.555 ± 0.043 | 0.979 ± 0.002 | 0.017 ± 0.002 | 5.090 ± 0.069 | 317.3 ± 6.4 | 0.468 ± 0.008 |
| a companion's trip | 4.333 ± 0.340 | 0.603 ± 0.013 | 0.123 ± 0.006 | 6.963 ± 0.199 | 252.9 ± 7.5 | 0.306 ± 0.011 |
| a caller | 1.509 ± 0.225 | 0.032 ± 0.004 | 0.284 ± 0.013 | 9.685 ± 0.381 | 286.2 ± 5.0 | 0.019 ± 0.002 |
| all | 15.8 ± 0.7 | 0.463 ± 0.004 | 0.117 ± 0.003 | 6.129 ± 0.108 | 330.6 ± 7.5 | 0.218 ± 0.003 |

| Unfed trips by cause (all kinds) | per adult-day | share of unfed | km per adult-day | kcal per adult-day | climbing kcal per adult-day |
| --- | --- | --- | --- | --- | --- |
| arrived, crop left | 0.607 ± 0.053 | 0.072 ± 0.002 | 0.096 ± 0.005 | 3.646 ± 0.230 | 0.353 ± 0.065 |
| arrived, empty | 2.796 ± 0.179 | 0.330 ± 0.016 | 0.447 ± 0.026 | 15.3 ± 0.9 | 0.028 ± 0.011 |
| caller stopped short | 0.908 ± 0.146 | 0.107 ± 0.012 | 0.218 ± 0.027 | 7.392 ± 0.968 | 0.004 ± 0.001 |
| caller, no crown | 0.180 ± 0.015 | 0.021 ± 0.001 | 0.055 ± 0.005 | 1.811 ± 0.158 | 0.000 ± 0.000 |
| departure given up | 3.026 ± 0.079 | 0.358 ± 0.016 | 0.002 ± 0.000 | 0.150 ± 0.011 | 0.043 ± 0.005 |
| re-decided en route | 0.956 ± 0.084 | 0.113 ± 0.004 | 0.198 ± 0.016 | 6.646 ± 0.550 | 0.013 ± 0.001 |
| all trips / unfed trips (km; kcal per adult-day) | | | 1.852 ± 0.091 / 1.016 ± 0.066 | 96.6 ± 4.7 / 35.0 ± 2.4 | |

Unfed causes by kind (share of the kind's closed trips; mean of the realizations):
  remembered crown: arrived, crop left 0.047; arrived, empty 0.363; re-decided en route: ended 0.001; re-decided en route: interrupt 0.009; re-decided en route: max-age 0.000; re-decided en route: need-bucket 0.000
  departure: arrived, crop left 0.029; arrived, empty 0.126; departure given up 0.522; re-decided en route: ended 0.001; re-decided en route: interrupt 0.043; re-decided en route: need-bucket 0.000; re-decided en route: patrol 0.000; re-decided en route: period 0.000
  crown in view: arrived, crop left 0.011; re-decided en route: interrupt 0.010
  a companion's trip: arrived, crop left 0.070; arrived, empty 0.262; re-decided en route: ended 0.002; re-decided en route: interrupt 0.064; re-decided en route: max-age 0.000; re-decided en route: need-bucket 0.000; re-decided en route: period 0.000
  a caller: arrived, crop left 0.001; caller stopped short 0.601; caller, no crown 0.120; re-decided en route: ended 0.074; re-decided en route: hunt 0.000; re-decided en route: interrupt 0.143; re-decided en route: max-age 0.002; re-decided en route: need-bucket 0.019; re-decided en route: patrol 0.001; re-decided en route: period 0.007

| Own trips by belief source | per adult-day | fed at target | arrived empty (share) | departure given up (share) |
| --- | --- | --- | --- | --- |
| left | 0.772 ± 0.056 | 0.446 ± 0.012 | 0.097 ± 0.012 | 0.388 ± 0.019 |
| seen | 5.196 ± 0.260 | 0.506 ± 0.010 | 0.049 ± 0.008 | 0.371 ± 0.010 |
| known | 2.397 ± 0.210 | 0.056 ± 0.003 | 0.556 ± 0.010 | 0.333 ± 0.011 |

| Crop of trips that reached their crown (units) | believed b (median) | at start c0 (median) | on arrival c1 (median) | c0 < 0.06 | c1 < 0.06 | hours since sighting (median) |
| --- | --- | --- | --- | --- | --- | --- |
| remembered crown | 0.248 ± 0.003 | 0.230 ± 0.008 | 0.176 ± 0.008 | 0.366 ± 0.016 | 0.403 ± 0.013 | 6.606 ± 0.407 |
| departure | 0.243 ± 0.003 | 0.212 ± 0.011 | 0.137 ± 0.010 | 0.291 ± 0.021 | 0.392 ± 0.018 | 3.526 ± 0.337 |
| crown in view | 0.269 ± 0.008 | 0.269 ± 0.008 | 0.218 ± 0.007 | 0.000 ± 0.000 | 0.159 ± 0.004 | 0.000 ± 0.000 |
| a companion's trip | 0.200 ± 0.000 | 0.209 ± 0.009 | 0.137 ± 0.009 | 0.280 ± 0.012 | 0.390 ± 0.012 | 2.796 ± 0.318 |
| a caller | 0.200 ± 0.000 | 0.302 ± 0.007 | 0.220 ± 0.014 | 0.023 ± 0.009 | 0.224 ± 0.014 | 10.5 ± 8.5 |
| own, left | 0.246 ± 0.010 | 0.276 ± 0.016 | 0.214 ± 0.017 | 0.166 ± 0.016 | 0.283 ± 0.023 | 6.155 ± 0.643 |
| own, seen | 0.302 ± 0.011 | 0.321 ± 0.011 | 0.259 ± 0.009 | 0.082 ± 0.013 | 0.169 ± 0.016 | 3.992 ± 0.213 |
| own, known | 0.233 ± 0.003 | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.902 ± 0.004 | 0.914 ± 0.004 | 67.1 ± 24.9 |

What ate it (arrived, empty; trips with a sighting of the crown before the start): units per trip, mean ± SD over realizations
| set | arrived empty (n, mean) | with a sighting | already < 0.06 at start | hours sighting→start | feeders seen (any) | crop at sighting | crop at close | eaten | by the feeders seen | by the traveller | by others | Δ phenology | recovery (residual) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all | 5200.0 ± 332.3 | 1611.8 ± 230.2 | 0.991 ± 0.001 | 4.022 ± 0.813 | 0.468 ± 0.008 | 0.135 ± 0.007 | 0.036 ± 0.001 | 0.202 ± 0.027 | 0.021 ± 0.002 | 0.000 ± 0.000 | 0.182 ± 0.027 | -0.135 ± 0.023 | 0.239 ± 0.045 |
| emptied during the trip | 45.8 ± 5.5 | 44.5 ± 6.4 | — | 1.876 ± 0.345 | 0.562 ± 0.087 | 0.135 ± 0.025 | 0.056 ± 0.001 | 0.172 ± 0.062 | 0.023 ± 0.006 | 0.000 ± 0.000 | 0.149 ± 0.057 | -0.004 ± 0.004 | 0.097 ± 0.037 |
| remembered crown | 1732.8 ± 110.7 | 290.5 ± 35.7 | — | 53.2 ± 8.2 | 0.317 ± 0.023 | 0.177 ± 0.014 | 0.026 ± 0.001 | 0.199 ± 0.024 | 0.019 ± 0.003 | 0.000 ± 0.000 | 0.179 ± 0.025 | -0.248 ± 0.014 | 0.295 ± 0.019 |
| departure | 1359.8 ± 142.0 | 469.5 ± 85.2 | — | 4.276 ± 0.937 | 0.445 ± 0.008 | 0.148 ± 0.008 | 0.037 ± 0.001 | 0.203 ± 0.038 | 0.021 ± 0.003 | 0.000 ± 0.000 | 0.183 ± 0.038 | -0.129 ± 0.030 | 0.222 ± 0.063 |
| a companion's trip | 2107.5 ± 179.1 | 851.8 ± 115.5 | — | 2.563 ± 0.480 | 0.533 ± 0.012 | 0.114 ± 0.007 | 0.040 ± 0.002 | 0.203 ± 0.025 | 0.021 ± 0.001 | 0.000 ± 0.000 | 0.181 ± 0.024 | -0.101 ± 0.027 | 0.230 ± 0.047 |
| own, left | 138.2 ± 15.8 | 138.2 ± 15.8 | — | 3.396 ± 0.805 | 0.417 ± 0.022 | 0.121 ± 0.007 | 0.040 ± 0.001 | 0.138 ± 0.029 | 0.014 ± 0.004 | 0.000 ± 0.000 | 0.124 ± 0.026 | -0.106 ± 0.020 | 0.163 ± 0.054 |
| own, seen | 475.8 ± 94.8 | 475.8 ± 94.8 | — | 5.585 ± 0.585 | 0.397 ± 0.016 | 0.182 ± 0.005 | 0.037 ± 0.001 | 0.209 ± 0.024 | 0.023 ± 0.001 | 0.000 ± 0.000 | 0.187 ± 0.024 | -0.133 ± 0.019 | 0.197 ± 0.019 |
| own, known | 2478.5 ± 194.2 | 146.0 ± 38.4 | — | 210.4 ± 60.1 | 0.371 ± 0.048 | 0.123 ± 0.032 | 0.015 ± 0.001 | 0.237 ± 0.052 | 0.018 ± 0.010 | 0.000 ± 0.000 | 0.219 ± 0.056 | -0.371 ± 0.071 | 0.501 ± 0.092 |

D2 reading (own trips on a sighting, seen + left, arrived empty): share of the crop lost between sighting and close eaten by the feeders seen at the sighting; by others; the phenology's fall
  S31q: n 750, loss 100.0 units; feeders seen 0.165, others 1.351, phenology 0.999
  S31q1: n 638, loss 84.8 units; feeders seen 0.160, others 1.526, phenology 0.906
  S31q2: n 576, loss 75.6 units; feeders seen 0.153, others 1.221, phenology 1.102
  S31q3: n 492, loss 62.3 units; feeders seen 0.161, others 1.165, phenology 0.865

Seen feeders at arrived-empty crowns (units each ate after the sighting; its bout room then; its rate × hours to the close):
  S31q: {'n': 1346, 'ateMean': 0.031, 'roomMean': 0.066, 'rateHoursMean': 3.177, 'ateOverRoomMedian': 0.325, 'ateOverRateHoursMedian': 0.036}
  S31q1: {'n': 1317, 'ateMean': 0.027, 'roomMean': 0.064, 'rateHoursMean': 5.402, 'ateOverRoomMedian': 0.29, 'ateOverRateHoursMedian': 0.032}
  S31q2: {'n': 1182, 'ateMean': 0.024, 'roomMean': 0.063, 'rateHoursMean': 2.347, 'ateOverRoomMedian': 0.316, 'ateOverRateHoursMedian': 0.048}
  S31q3: {'n': 1046, 'ateMean': 0.025, 'roomMean': 0.068, 'rateHoursMean': 3.661, 'ateOverRoomMedian': 0.278, 'ateOverRateHoursMedian': 0.046}

D3 beliefs below 0.06:
  S31q: {'share': 0.061, 'perAdultDay': 0.918, 'fedAtTarget': 0.28, 'byKind': {'departure': 0.489, "a companion's trip": 0.325, 'a caller': 0.098, 'remembered crown': 0.088}, 'bySource': {'belief': 0.388, 'seen': 0.364, 'left': 0.211, 'unseen': 0.035, 'known': 0.003}, 'kmPerAdultDay': 0.075, 'kcalPerAdultDay': 3.781}
  S31q1: {'share': 0.059, 'perAdultDay': 0.819, 'fedAtTarget': 0.272, 'byKind': {'departure': 0.464, "a companion's trip": 0.36, 'remembered crown': 0.094, 'a caller': 0.083}, 'bySource': {'belief': 0.389, 'seen': 0.342, 'left': 0.206, 'unseen': 0.053, 'known': 0.01}, 'kmPerAdultDay': 0.064, 'kcalPerAdultDay': 3.226}
  S31q2: {'share': 0.059, 'perAdultDay': 0.796, 'fedAtTarget': 0.27, 'byKind': {'departure': 0.46, "a companion's trip": 0.338, 'remembered crown': 0.103, 'a caller': 0.099}, 'bySource': {'belief': 0.4, 'seen': 0.329, 'left': 0.229, 'unseen': 0.036, 'known': 0.005}, 'kmPerAdultDay': 0.067, 'kcalPerAdultDay': 3.226}
  S31q3: {'share': 0.057, 'perAdultDay': 0.769, 'fedAtTarget': 0.301, 'byKind': {'departure': 0.468, "a companion's trip": 0.345, 'remembered crown': 0.109, 'a caller': 0.078}, 'bySource': {'belief': 0.392, 'seen': 0.34, 'left': 0.232, 'unseen': 0.031, 'known': 0.005}, 'kmPerAdultDay': 0.056, 'kcalPerAdultDay': 3.017}

D4 the community list:
  S31q: {'trips': 4176, 'perAdultDay': 2.245, 'shareOfOwn': 0.261, 'pairs': 1081, 'tripsPerPair': 3.863, 'fedAtTarget': 0.053, 'cropBelowSeenAtStart': 0.917, 'afterFoundEmpty': {'trips': 2591, 'share': 0.62, 'hoursMedian': 18.35}}
  S31q1: {'trips': 4737, 'perAdultDay': 2.547, 'shareOfOwn': 0.305, 'pairs': 1137, 'tripsPerPair': 4.166, 'fedAtTarget': 0.058, 'cropBelowSeenAtStart': 0.907, 'afterFoundEmpty': {'trips': 3094, 'share': 0.653, 'hoursMedian': 17.646}}
  S31q2: {'trips': 4074, 'perAdultDay': 2.19, 'shareOfOwn': 0.268, 'pairs': 1042, 'tripsPerPair': 3.91, 'fedAtTarget': 0.059, 'cropBelowSeenAtStart': 0.905, 'afterFoundEmpty': {'trips': 2583, 'share': 0.634, 'hoursMedian': 18.004}}
  S31q3: {'trips': 4845, 'perAdultDay': 2.605, 'shareOfOwn': 0.313, 'pairs': 1105, 'tripsPerPair': 4.385, 'fedAtTarget': 0.053, 'cropBelowSeenAtStart': 0.907, 'afterFoundEmpty': {'trips': 3204, 'share': 0.661, 'hoursMedian': 20.025}}

D5 departures (events per adult-day; attempts after):
  S31q: {'attempt': 6.304, 'given-up': 3.645, 'recruited': 2.525, 'free': 2.288, 'alone': 0.359} {'n': 11365, 'recruited': 0.413, 'gaveUp': 0.566, 'continuedAlone': 0.055} alone trips fed 0.587 (0.322 per adult-day)
  S31q1: {'attempt': 5.841, 'given-up': 3.391, 'alone': 0.322, 'free': 2.476, 'recruited': 2.313} {'n': 10597, 'recruited': 0.406, 'gaveUp': 0.57, 'continuedAlone': 0.056} alone trips fed 0.572 (0.299 per adult-day)
  S31q2: {'attempt': 5.819, 'free': 2.291, 'recruited': 2.217, 'given-up': 3.468, 'alone': 0.356} {'n': 10530, 'recruited': 0.392, 'gaveUp': 0.586, 'continuedAlone': 0.052} alone trips fed 0.585 (0.322 per adult-day)
  S31q3: {'free': 2.365, 'attempt': 5.901, 'given-up': 3.544, 'recruited': 2.225, 'alone': 0.369} {'n': 10645, 'recruited': 0.389, 'gaveUp': 0.589, 'continuedAlone': 0.056} alone trips fed 0.577 (0.335 per adult-day)

D6 callers:
  S31q: {'n': 3414, 'withCrown': 0.859, 'fedAtCrown': 0.038, 'finished': 0.729, 'dEndToCrownMedian': 25.626, 'crownInViewAtEnd': 0.682, 'feedOptionAtEnd': 0.663, 'cropAtEndMedian': 0.171, 'nextWhenStoppedShort': {'trip-own': 0.461, 'rest': 0.139, 'feed-crown': 0.059, 'feed-fallback': 0.052, 'display': 0.051, 'pant-grunt': 0.049, 'trip-joined': 0.046, 'drink': 0.035, 'mate': 0.024, 'nest': 0.018, 'guard': 0.015, 'play': 0.011, 'call': 0.011, 'follow-party': 0.009, 'groom': 0.009, 'charge': 0.004, 'patrol': 0.002, 'shelter': 0.002, 'reconcile': 0.001, 'flee': 0.001, 'hunt': 0}}
  S31q1: {'n': 2682, 'withCrown': 0.828, 'fedAtCrown': 0.033, 'finished': 0.728, 'dEndToCrownMedian': 25.341, 'crownInViewAtEnd': 0.706, 'feedOptionAtEnd': 0.688, 'cropAtEndMedian': 0.184, 'nextWhenStoppedShort': {'trip-own': 0.42, 'rest': 0.16, 'trip-joined': 0.068, 'feed-fallback': 0.06, 'pant-grunt': 0.056, 'feed-crown': 0.049, 'drink': 0.044, 'display': 0.042, 'mate': 0.025, 'nest': 0.022, 'play': 0.013, 'call': 0.011, 'guard': 0.009, 'follow-party': 0.009, 'groom': 0.006, 'charge': 0.003, 'flee': 0.002, 'patrol': 0.001, 'hunt': 0.001}}
  S31q2: {'n': 2686, 'withCrown': 0.84, 'fedAtCrown': 0.04, 'finished': 0.731, 'dEndToCrownMedian': 25.481, 'crownInViewAtEnd': 0.677, 'feedOptionAtEnd': 0.667, 'cropAtEndMedian': 0.187, 'nextWhenStoppedShort': {'trip-own': 0.476, 'rest': 0.138, 'feed-fallback': 0.059, 'trip-joined': 0.054, 'feed-crown': 0.046, 'display': 0.045, 'drink': 0.04, 'pant-grunt': 0.038, 'nest': 0.029, 'call': 0.019, 'mate': 0.018, 'play': 0.011, 'groom': 0.011, 'guard': 0.008, 'follow-party': 0.003, 'charge': 0.002, 'patrol': 0.001, 'beg': 0.001, 'flee': 0.001, 'shelter': 0.001, 'hunt': 0.001}}
  S31q3: {'n': 2447, 'withCrown': 0.836, 'fedAtCrown': 0.042, 'finished': 0.742, 'dEndToCrownMedian': 25.538, 'crownInViewAtEnd': 0.684, 'feedOptionAtEnd': 0.664, 'cropAtEndMedian': 0.18, 'nextWhenStoppedShort': {'trip-own': 0.456, 'rest': 0.131, 'feed-fallback': 0.066, 'feed-crown': 0.061, 'display': 0.049, 'pant-grunt': 0.047, 'trip-joined': 0.044, 'drink': 0.031, 'nest': 0.026, 'mate': 0.026, 'call': 0.015, 'play': 0.013, 'follow-party': 0.011, 'guard': 0.009, 'groom': 0.008, 'hunt': 0.002, 'charge': 0.002, 'patrol': 0.001, 'flee': 0.001}}

Trips per class-day and fed share, by class (mean of realizations):
  adult male: remembered crown 2.22 (0.56); departure 8.53 (0.27); crown in view 1.87 (0.98); a companion's trip 4.79 (0.60); a caller 1.56 (0.03)
  female, lactating: remembered crown 3.56 (0.57); departure 3.43 (0.27); crown in view 1.22 (0.98); a companion's trip 4.23 (0.59); a caller 1.53 (0.04)
  female, other: remembered crown 2.22 (0.63); departure 3.67 (0.30); crown in view 1.36 (0.98); a companion's trip 3.72 (0.62); a caller 1.41 (0.04)

Known-tree trips split by whether the same animal had reached that tree empty before (known_split.py):
diag/S31q: known first visits 0.85/adult-day fed 0.119; back to one found empty 1.39/adult-day fed 0.013; in fruit at start 0.083 (median crop 0.66); joined trips to a goal the follower never saw 2.07/adult-day fed 0.388, arrived empty 0.462
diag/S31q1: known first visits 0.88/adult-day fed 0.141; back to one found empty 1.66/adult-day fed 0.014; in fruit at start 0.093 (median crop 0.59); joined trips to a goal the follower never saw 1.98/adult-day fed 0.356, arrived empty 0.492
diag/S31q2: known first visits 0.80/adult-day fed 0.138; back to one found empty 1.39/adult-day fed 0.014; in fruit at start 0.095 (median crop 0.65); joined trips to a goal the follower never saw 1.73/adult-day fed 0.400, arrived empty 0.465
diag/S31q3: known first visits 0.88/adult-day fed 0.129; back to one found empty 1.72/adult-day fed 0.014; in fruit at start 0.093 (median crop 0.64); joined trips to a goal the follower never saw 1.73/adult-day fed 0.368, arrived empty 0.490
mean ± SD: first visits 0.855 ± 0.038/adult-day fed 0.132 ± 0.010; back to one found empty 1.542 ± 0.176/adult-day fed 0.014 ± 0.001; in fruit at start 0.091 ± 0.006 (median crop 0.635 ± 0.031); joined, goal never seen 1.876 ± 0.173/adult-day fed 0.378 ± 0.020, arrived empty 0.477 ± 0.016
```

**Reading by the registered rules.**
- **D1, the term: arrivals at empty crowns.** They carry the largest share of the walking and energy spent on unfed trips:
  0.447 ± 0.026 of 1.016 ± 0.066 km and 15.3 ± 0.9 of 35.0 ± 2.4 kcal per adult-day (44%), 2.80 ± 0.18 trips per
  adult-day (33% of unfed trips). The most numerous unfed trips are departures given up (3.03 ± 0.08 per adult-day, 36%),
  which cost almost nothing (0.002 km, 0.15 kcal per adult-day: the initiator stands for a minute). **99.1% of the crowns
  found empty were already below 0.06 units when the trip began** (only 46 ± 6 of 5,200 ± 332 per realization were
  emptied during the trip): the belief was wrong before departure.
- **D2, the brief's cause 1: not supported.** For own trips on a belief from a sighting ('seen', 'left') that arrive at an
  empty crown (492–750 per realization), the animals seen feeding there at the last sighting ate 15–17% of the crop lost
  between that sighting and the close (a median 3.4–5.6 h); others, not feeding there when the animal looked, ate
  1.17–1.53 × the loss, and the phenology's own fall was 0.87–1.10 × the loss (the deficit's recovery and the clamp at 0
  absorb the rest). Each feeder seen ate 0.024–0.031 units after the sighting, about a third of the bout room it had then
  and 3–5% of its rate × the hours elapsed: they leave sated, and what empties the crown is later visitors and the end
  of its ripening. A belief that expects the seen companions' eating would move these trips' crop by ~0.02 units.
- **D3, beliefs below 0.06:** 5.7–6.1% of trips (0.77–0.92 per adult-day; 0.06–0.08 km), fed 27–30% (the crop recovers
  or the sampled belief was right): not a defect of consequence.
- **D4, the community list: implicated.** Own trips to the community's known trees are 2.40 ± 0.21 per adult-day (26–31%
  of own trips), feed 5.6 ± 0.3%, 90% start at a crown below 0.06, and carry 2,479 ± 194 of the own trips' ~3,090 empty
  arrivals per realization (76–80%; registered line 1/3). **64 ± 2% of them go back to a known tree the same animal
  reached empty** (median 18–20 h later; 1.54 ± 0.18 per adult-day, fed 1.4%): perception deletes a belief below 0.04 and
  never remembers a crown below 0.2, so the list's expectation (capacity × the species' share in fruit × the mean
  fullness, 0.23 units) returns at the next decision. First visits (0.86 ± 0.04 per adult-day) feed 13 ± 1%: the listed
  crown is in fruit at the start in 9% of trips, then with a large crop (median 0.64 units), so the list values a crown
  that is either empty or full at its mean. Followers inherit it: joined trips to a goal the follower never saw (valued
  at the default 0.2) are 1.88 ± 0.17 per adult-day, feed 38%, and 48% arrive at an empty crown.
- **D5, departures (the brief's cause 2): not a cost on S31.** Given-up attempts are 3.03 per adult-day but move ~1 m;
  departValue's walked-alone trips are 0.30–0.34 per adult-day and feed at their target 57–59% (more than other own trips).
- **D6, callers (the brief's cause 3): implicated.** Caller trips with a crown feed there 3.8 ± 0.4%; 73% end at the stop
  25 m from the call point, where the crown is in view 68–71% and its forage option on the list 66–69%, and the next act
  is an own trip 42–48%, rest 13–16%, the crown 5–6%. 0.91 ± 0.15 such trips per adult-day cost 0.22 km and 7.4 kcal.

**What this says.** Trips fail mostly because the crown is empty before the trip starts, and the main source is the
community's known-tree list: the animal's own finding that a listed crown is empty is thrown away, so it is sent back to
the same empty crowns, and companions follow. The companions it saw feeding at a crown eat little of it. Callers' trips
are valued as trips to the caller's crown and then re-decided 25 m short. Departures given up cost nothing.

## 3. Field rows scored here: samples (written before any arm)

Every e-bench row is scored (fitted and held-out sums, with and without T-HUN-4, T-BRD-1 and T-IGE-3). The rows this
stage's readouts lean on are travel, ranging, feeding trees, party size and fruit share; none was fitted by this stage.
Samples as recorded today by the stages that read each source in full (E3g §3, E5f §1, E3b §3 and research.md "Revisiting
the same trees, Taï"); the method sentences are theirs, quoted from the sources.

| Row | Source | Sample, method | Value, band |
| --- | --- | --- | --- |
| T-ACT-2 travel share (fitted) | villioth2025 (FT, PMC12701709) | Budongo Waibira, Oct 2016 – Jun 2017: "ten adult males and nine adult females ... Seven of the females were lactating"; state "recorded continuously"; travelling = "terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy"; 491 h; mass not reported. amsler2010 (Abs): Ngogo 0.14 on non-patrol days | males 0.21, females 0.20; band 0.12–0.25 |
| T-RNG-4 day range (fitted) | batesByrne2009 (FT, accepted manuscript) | Budongo Sonso 2002–03, 8 adult males, GPS fixes every 5 min while travelling, full-day follows (≥ 8 h); mass not reported | 2.7 ± 1.5 km/day; band 1.5–3.5 |
| T-PTY-1 party size (fitted) | wilson2012 (FT) | Kanyawara 1992–2006, community median 47 (11 adult males, 15 adult females), 5,527 party follows, 15-min scans of "the identity of all individuals present"; party = all within about 50 m; every age and sex; mass not reported | 9.2 ± 7.0 per follow; band 3–9 (E5a staged 4.5–9.2, not applied) |
| T-FOOD-2 fruit share (fitted) | watts2012a, emeryThompson2020 | Ngogo 1995–2010 (125 months, focal + 15-min scans); Kanyawara 1994–2018 (240,601 feeding scans); all age-sex classes | 72.1%, 64.0%; band 0.60–0.78 |
| T-FOOD-4 feeding trees (held-out; flagged compromised) | janmaat2013b, normand2009 (FT, PMC2762532) | Taï, 5 adult females with young, 275 full-day follows; normand2009: "two females were followed for 28 consecutive days", who "ate in 391 and 506 trees, 13.96 and 18.07 a day"; mass and reproductive state not reported | 7.14; 13.96 and 18.07; band 4–15 |
| T-FOOD-5, T-FOOD-6 (held-out) | normand2009, ban2014 | as T-FOOD-4; "The trees located less than 30 m from each other were considered to be the same resource"; revisits "within 5.37 days" | nearest productive tree 30%; 2–7 days |
| T-HUN-1, T-HUN-3 (fitted) | gilby2015 | Kanyawara 1996–2014, 224 months, party follows; "every 15 min, the field assistants record party composition"; an encounter is colobus "within 100 m" | 5–25 per community-year; 0.05–0.40 |
| Reserves %/day by class; trips fed at their target | no field row (T-ENE rows staged, e-targets.patch.json) | — | read against the S31q group only |

Known observer defects that bear on these rows (frozen observer; not changed here): T-FOOD-4 counts a return to the same
crown after ≥ 10 min as another tree, against its definition "Distinct feeding trees per full-day follow" (E3b §7;
src/field/metrics.ts); T-FOOD-5 counts a return to the crown just left as a nearest-tree choice (E3b §7).

**Readouts the predictions need** (each defined in its tool's header): e-bench's observer rows (src/field/metrics.ts) and
sums; energy-diagnose's ground km, climbing kcal, eating minutes and reserves (%/day: the OLS slope of reserves ÷ store
over the window, the integrator's convention); trip-diagnose's trips per adult-day by kind, fed share, causes and costs
(§2); rhythm-metrics' night share (adults out of a nest, T-RHY-5) for any arm that changes when animals move. The
trip-diagnose readouts were smoke-tested on S31 (§2); each arm's switch is smoke-tested with them on 1–2 days before its
run (§5).

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
- *Integrator's note (4 October, 22:3x):* the four S31q runs are clean at 4111971, no deaths; their JSON prints 38
  prescriptions (the ledger at 4111971), 48 on the current ledger. S34 (S31 + `aggressionGaps` 7) is now the best
  integrated candidate; the arms stay on S31 as briefed (a kept switch is confirmed on S34 afterwards).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

### 5.1 Iteration 1 (registered before its run): a seen crown is what was seen; a caller's crown is the trip's goal (`tripBeliefs` 3)

**Why (§2.1).** The term is arrivals at crowns already empty when the trip began (D1), carried mostly by the community's
known-tree list (D4): the animal's own finding that a listed crown is empty is deleted, so 64% of known-tree trips go
back to a crown the same animal reached empty; and caller trips are re-decided 25 m short of the crown they were valued
for (D6). The companions seen at a crown eat little of it (D2: not supported), so no belief about their eating is built;
departures given up cost nothing (D5) and beliefs below 0.06 are not a defect of consequence (D3): no mechanism for either.

**Principle.** A forager values a remembered place by what it last saw there; a community's knowledge stands in only for
places the individual has not seen (C7a's own design: "an individual's own sighting overrides the expectation"); an empty
tree is learned on arrival [M: janmaat2013b]. A trip is executed as it was valued: a trip to a caller valued as a trip to
the caller's crown goes to that crown and, on arrival, feeds there by the same rule as a trip to a tree.

**Change (switch `tripBeliefs`, 0 = today; a sum of bits; src/sim/tripbelief.ts, perception.ts, candidates.ts, rg.ts,
execution.ts).**
- *Bit 1.* A crown on the community's known list (foraging.ts `dailyKnownTrees`) that the animal perceives is given the
  crop seen as its belief, an empty crown included (perception.ts no longer deletes it below 0.04 for a listed crown), and
  the hour in `chimp.sim.ls`. The known-tree offers (candidates.ts) value a listed crown seen within `memTravelHorizonH`
  (240 h, the horizon of every remembered crown as a travel goal) at that sighting, with E3e's belief spread from its age;
  after that, or for a listed crown not seen, the list's expectation as today. The daily belief clean-up keeps a live
  sighting and drops an expired one (perception.ts `dailyBeliefs`).
- *Bit 2.* A trip to a caller heard feeding in a crown (`socialTiming` bit 4's x.jt; valued as a trip to that crown,
  candidates.ts) walks to that crown and stops where a trip to a tree stops (3 m, execution.ts), and the gate's arrival
  rule (rg.ts `gate`; `redecide` under `redecideValue`) turns it into feeding there when the crown is in view within
  GATE.arriveM and feeding is legal. Calls not given in a crown keep the walk to `joinCallStopM` from the call point.
- No new magnitude; no counted entry is read less (corrections): prescriptions 48 with and without the switch (checked
  with `prescription-ledger --count` on S31's parameters). One lazy key (`ls`, OPTIONAL_X). Tests
  (tests/sim-trip-beliefs.test.ts): 0 by default in both profiles; bit 1 keeps an empty listed crown as seen with its
  hour, the trip to it is worth less than at the list's expectation, the daily step keeps a live sighting and drops an
  expired one; bit 2 walks a caller trip to the caller's crown (today: 25 m from the call point) and the gate turns its
  arrival into feeding there (today: 'ended'); value 3 on S31 deterministic and JSON-lossless over 12 h, the count
  unchanged. Switch off: the field pin and the compressed goldens hold (tests/sim-track-e.test.ts).

**Smoke test with the switch on (seed 48, 3 + 3 days, against the same days with it off; disclosed; not
representative):** trips fed at their target 0.41 → 0.60; known-tree trips 3.0 → 0.9 per adult-day, none back to a crown
found empty (46% before); caller trips fed at the caller's crown 4% → 39%; joined trips 8.0 → 4.0 per adult-day, fed
0.48 → 0.79; arrivals at empty crowns 5.0 → 1.0 per adult-day; unfed trips' walking 1.04 → 0.84 km per adult-day; adult
males' ground km 2.69 → 2.60.

**Arm A1** = S31 (S31q-params.json) + `tripBeliefs` 3, from a frozen detached checkout of the commit that adds this
section: e-bench `--quick`, energy-diagnose, trip-diagnose and rhythm-metrics (seeds 48 and 7, burn-in 30, 30 days;
`--workers` 2, 1 above load 8; no run above load 30).

**Predictions (against the S31q group, mean ± SD of its four runs; low confidence unless stated).**

| Quantity | S31q (mean ± SD) | A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 48 | 48 | high |
| Viability; night (adults out of a nest ≤ 3.3%, T-RHY-5 ≤ 0.033) | pass | pass | moderate |
| Trips fed at their target (truth, adults) | 0.463 ± 0.004 | 0.55–0.68 | moderate |
| Known-tree trips per adult-day; back to one found empty | 2.40 ± 0.21; 0.64 ± 0.02 | 0.5–1.3; ≤ 0.05 | moderate; high |
| Caller trips fed at the caller's crown | 0.038 ± 0.004 | 0.20–0.50 | moderate |
| Arrivals at empty crowns per adult-day | 2.80 ± 0.18 | 0.8–1.8 | moderate |
| Unfed trips' km per adult-day | 1.016 ± 0.066 | 0.70–0.95 | moderate |
| Ground km: adult males; nursing mothers; juveniles 5–12 y | 2.68 ± 0.22; 2.58 ± 0.07; 2.95 ± 0.10 | each within ± 0.4 km of the mean | low |
| Climbing kcal a day, adults | 43.7 ± 2.4 | 38–50 | low |
| T-FOOD-4; T-ACT-2; T-RNG-4; T-PTY-1 | 9.09 ± 0.30; 0.112 ± 0.011; 2.06 ± 0.19; 4.03 ± 0.24 | 8.0–10.0; 0.09–0.13; 1.7–2.4; 3.7–4.7 | low |
| Reserves %/day, every class | S31q group | at or above the mean − 0.03 | low |
| Fitted; held-out with and without the rare rows | reference mean | inside noise | moderate |

**Kill criterion (registered).** Null if (a) viability fails (a starvation death, or a seed below 80% of its start); (b)
any class's reserve slope (adult males, other females, nursing mothers, juveniles 5–12 y, infants 2–5 y and 0.5–2 y) is
more than 0.05% of the store a day below the S31q mean; (c) held-out is worse beyond noise (z > +2) with or without the
rare rows; (d) night safety fails; (e) the mechanism does not run (known-tree trips back to a crown found empty not below
0.10 of known-tree trips, or caller trips fed at the caller's crown not above 0.10).

**Verdict rule (registered).** `tripBeliefs` removes no counted prescription, so A1 is judged as a correction (the track's
rule for corrections, as S35): a **provisional keep candidate** if none of (a)–(e) holds and trips fed at their target
rise beyond the group's spread (z > +2, the readout this stage targets); otherwise recorded and off. Walking, climbing,
rows and reserves are reported against the group, never used to choose.

### 5.2 Iteration 2 (registered before its run): a listed crown not seen is a chance of fruit (`tripBeliefs` 7)

**Why (§6.1).** After iteration 1 the community list still sends adults to crowns that are empty: 0.88 known-tree trips
per adult-day, all first visits (or visits after the sighting lapsed), fed 12.6%; they are 692 of the own trips' 1,172
empty arrivals (59%), and companions follow them. In the diagnosis 91% of trips to listed crowns started at a crown
below 0.06 units and the 9% in fruit held a median 0.64 units (§2.1, D4): the list values a crown that is either empty or
full at its mean, as if certain, and at most crowns the mean already fills a bout (E = min(crop × kcal, bout room)), so
the trip is valued at a full meal it delivers about one time in eight.

**Principle.** A forager values an uncertain patch by the long-run rate it yields: the expected gain over the expected time,
not the gain of the expected patch [charnov1976; stephensKrebs1986, already cited]. The community knows which species are
in fruit and the share of their trees in fruit (C7a: janmaat2013a; the list is built from it), not whether this tree is
(janmaat2013b: chimpanzees inspect trees of synchronously fruiting species and find some empty). So a listed crown the
animal has not seen holds a fruiting crown's crop with that share's chance, and nothing otherwise.

**Change (bit 4 of the same switch; `tripBeliefs` 7 = bits 1, 2 and 4; tripbelief.ts, candidates.ts, rg.ts).** A listed
crown valued from the list alone (no own sighting within `memTravelHorizonH`, no belief) is valued with the crop a fruiting
crown of its capacity holds (capacity × the mean fullness, as `dailyKnownTrees` computes it) and the chance the list holds
for it (its expected crop ÷ that crop: the species' share in fruit): its bout energy and eating time are that share of a
fruiting crown's (intake.ts `netRateShare`'s yield factor, which E3g added), so the trip's value is (share × E − C) ÷ (walk +
share × E ÷ R). Under `choiceBelief` the choice samples the crown as in fruit (a fruiting crown's food term) or not (none),
one draw from world.rng, in place of the normal spread around the mean crop (rg.ts `beliefOffset`). No new magnitude; no
counted entry read less (48 with and without, checked). Tests: a listed crown carries the share in its belief and is worth
less than at its mean crop; the draw gives a fruiting crown's food term or nothing; value 7 deterministic and
JSON-lossless on S31 over 12 h, the count unchanged.

**Smoke test with the switch on (seed 48, 3 + 3 days; disclosed; not representative):** with 7 known-tree trips fall to
0.02 per adult-day (3 with bits 1 + 2: 0.90), trips fed at their target 0.61 (0.60), arrivals at empty crowns 0.18 per
adult-day (0.97), unfed trips' walking 0.71 km per adult-day (0.84), adult males' ground km 2.32 (2.60), joined trips 2.5
per adult-day (4.0). An earlier draft of bit 4 (the rate itself times the share, not the expected bout's rate) was smoked
the same way and discarded before registration: it was not the long-run rate of the uncertain crown.

**Arm A2** = S31 + `tripBeliefs` 7, from a frozen detached checkout of the commit that adds this section: e-bench `--quick`,
energy-diagnose, trip-diagnose and rhythm-metrics (seeds 48 and 7, burn-in 30, 30 days; `--workers` 2, 1 above load 8).

**Predictions (against the S31q group, and A1 where stated; low confidence unless stated).**

| Quantity | S31q (mean ± SD) | A1 | A2 | Confidence |
| --- | --- | --- | --- | --- |
| Prescriptions | 48 | 48 | 48 | high |
| Viability; night | pass | pass; 2.31% | pass; ≤ 3.3%, T-RHY-5 ≤ 0.033 | moderate |
| Known-tree trips per adult-day | 2.40 ± 0.21 | 0.88 | below 0.25 | moderate |
| Trips fed at their target | 0.463 ± 0.004 | 0.569 | 0.58–0.70 | moderate |
| Arrivals at empty crowns per adult-day | 2.80 ± 0.18 | 1.02 | below 0.7 | moderate |
| Unfed trips' km per adult-day | 1.016 ± 0.066 | 0.707 | 0.45–0.70 | moderate |
| Ground km: adult males; nursing mothers; juveniles 5–12 y | 2.68 ± 0.22; 2.58 ± 0.07; 2.95 ± 0.10 | 2.50; 2.38; 2.80 | each within ± 0.5 km of the group mean | low |
| Fruit share of eating, adults (energy-diagnose) | males 0.932 ± 0.006, mothers 0.678 ± 0.016 | 0.931, 0.689 | within ± 0.05 of the group mean | low |
| T-FOOD-4; T-ACT-2; T-RNG-4; T-PTY-1 | 9.09; 0.112; 2.06; 4.03 | 9.27; 0.103; 2.29; 3.90 | 7.5–10.5; 0.08–0.13; 1.5–2.5; 3.5–4.7 | low |
| Reserves %/day, every class | S31q group | within the group's spread | at or above the group mean − 0.03 | low |
| Fitted; held-out with and without the rare rows | reference mean | inside noise | inside noise | moderate |

**Kill criterion (registered):** as §5.1 (a)–(d); (e) the mechanism does not run: known-tree trips per adult-day not below
0.5.

**Verdict rule (registered).** A correction, judged as A1: a **provisional keep candidate** if none of the kill criteria holds
and trips fed at their target rise beyond the S31q group's spread (z > +2). **The best arm** (for the diagnostic arm and the
recommendation) is A2 if both qualify, its share of trips fed at its target is higher than A1's, no class's reserve slope
is below A1's by more than 0.03% of the store a day, and its held-out z against the S31q group (with and without the rare
rows) is not higher than A1's by more than 1; otherwise A1.

**Diagnostic arm (registered now; not a candidate, run after the iterations):** the best arm + `redecideValue` 2 (brief:
whether re-deciding's walking cost falls once trips find food), with its comparison on this mode and base, S31 +
`redecideValue` 2; both with e-bench `--quick`, energy-diagnose and trip-diagnose, same settings. Read: adults' ground km,
climbing, trips per adult-day and fed share of (best + redecide) − best against (S31 + redecide) − S31.

## 6. Results

### 6.1 Iteration 1: A1 = S31 + `tripBeliefs` 3 (frozen checkout d8f8f6e, clean)

Printed by the stage's `final_table.py` (the integrator's `judge_vs_reps.py` for the sums, his slope convention for
reserves), `night.py` and the trip readouts, from the JSON (session scratch `e3h/arms/`). The S31q group's prescription count
(38) is the ledger at 4111971; A1's 48 is the current ledger, the same as S31's on it.

```
S31q: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q1: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q2: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q3: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  A1: d8f8f6e dirty 0 prescriptions 48 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]

quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 12
  fitted             (17 rows) ref 1.77, 2.69, 1.84, 1.32 (mean 1.90, sd 0.57; used 0.69) | A1.json: 1.88, Δ -0.02, z -0.0 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | A1.json: 4.71, Δ -1.93, z -0.8 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | A1.json: 3.98, Δ -0.30, z -0.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-4   held-out ref 2.36±2.86 | A1.json 0.74 (fail)

| Readout | S31q runs | S31q mean ± SD | A1 |
| --- | --- | --- | --- |
| trips fed at their target (share, adults) | 0.461 / 0.458 / 0.467 / 0.465 | 0.463 ± 0.004 | 0.569 (z +23.6) |
| trips per adult-day | 16.83 / 15.68 / 15.17 / 15.37 | 15.76 ± 0.74 | 12.09 (z -4.4) |
|   remembered crown: per adult-day | 2.50 / 2.66 / 2.51 / 2.59 | 2.57 ± 0.08 | 1.95 (z -7.2) |
|   remembered crown: fed at target | 0.592 / 0.588 / 0.583 / 0.558 | 0.580 ± 0.015 | 0.729 (z +8.7) |
|   departure: per adult-day | 6.11 / 5.70 / 5.66 / 5.72 | 5.80 ± 0.21 | 4.53 (z -5.4) |
|   departure: fed at target | 0.290 / 0.272 / 0.282 / 0.274 | 0.279 ± 0.008 | 0.329 (z +5.4) |
|   crown in view: per adult-day | 1.58 / 1.51 / 1.53 / 1.60 | 1.55 ± 0.04 | 1.23 (z -6.7) |
|   crown in view: fed at target | 0.978 / 0.977 / 0.980 / 0.982 | 0.979 ± 0.002 | 0.982 (z +1.1) |
|   a companion's trip: per adult-day | 4.80 / 4.37 / 4.03 / 4.14 | 4.33 ± 0.34 | 3.18 (z -3.0) |
|   a companion's trip: fed at target | 0.604 / 0.584 / 0.615 / 0.607 | 0.603 ± 0.013 | 0.740 (z +9.3) |
|   a caller: per adult-day | 1.83 / 1.44 / 1.44 / 1.32 | 1.51 ± 0.23 | 1.20 (z -1.2) |
|   a caller: fed at target | 0.033 / 0.027 / 0.034 / 0.035 | 0.032 ± 0.004 | 0.339 (z +76.3) |
| unfed trips: km per adult-day | 1.097 / 1.041 / 0.978 / 0.948 | 1.016 ± 0.066 | 0.707 (z -4.2) |
| unfed trips: kcal per adult-day | 37.9 / 35.8 / 33.6 / 32.6 | 35.0 ± 2.4 | 24.6 (z -4.0) |
| trips: km per adult-day | 1.962 / 1.872 / 1.830 / 1.744 | 1.852 ± 0.091 | 1.655 (z -1.9) |
| delivered ÷ valued (fruit at target ÷ E0) | 0.215 / 0.217 / 0.221 / 0.218 | 0.218 ± 0.003 | 0.262 (z +15.8) |
|   unfed, arrived, empty: per adult-day | 2.881 / 2.991 / 2.582 / 2.728 | 2.796 ± 0.179 | 1.022 (z -8.9) |
|   unfed, departure given up: per adult-day | 3.116 / 2.926 / 3.017 / 3.047 | 3.026 ± 0.079 | 2.494 (z -6.0) |
|   unfed, caller stopped short: per adult-day | 1.123 / 0.851 / 0.857 / 0.801 | 0.908 ± 0.146 | 0.294 (z -3.8) |
|   unfed, re-decided en route: per adult-day | 1.073 / 0.959 / 0.886 / 0.905 | 0.956 ± 0.084 | 0.644 (z -3.3) |
|   unfed, arrived, crop left: per adult-day | 0.684 / 0.593 / 0.565 / 0.584 | 0.607 ± 0.053 | 0.616 (z +0.2) |
| known-tree trips per adult-day; fed | 2.245 / 2.547 / 2.190 / 2.605 | 2.397 ± 0.210 | 0.883 (z -6.5) |
|   known-tree trips fed at target | 0.053 / 0.058 / 0.059 / 0.053 | 0.056 ± 0.003 | 0.126 (z +19.6) |
|   known-tree trips back to one found empty (share) | 0.620 / 0.653 / 0.634 / 0.661 | 0.642 ± 0.019 | 0.100 (z -26.2) |
| caller trips fed at the caller's crown | 0.038 / 0.033 / 0.040 / 0.042 | 0.038 ± 0.004 | 0.409 (z +85.9) |
| ground km, adult male | 2.97 / 2.69 / 2.63 / 2.43 | 2.68 ± 0.22 | 2.50 (z -0.7) |
| ground km, female lactating | 2.65 / 2.53 / 2.62 / 2.52 | 2.58 ± 0.07 | 2.38 (z -2.8) |
| ground km, female other | 2.12 / 2.12 / 1.95 / 1.91 | 2.02 ± 0.11 | 1.97 (z -0.4) |
| ground km, juvenile 5–12 y | 3.02 / 2.99 / 2.80 / 2.99 | 2.95 ± 0.10 | 2.80 (z -1.3) |
| climbing kcal/day, adults (day-weighted) | 47.2 / 43.5 / 41.6 / 42.6 | 43.7 ± 2.4 | 42.9 (z -0.3) |
| climbing kcal/day, adult male | 60.7 / 55.1 / 52.8 / 53.6 | 55.6 ± 3.5 | 54.2 (z -0.4) |
| climbing kcal/day, female lactating | 38.0 / 35.1 / 34.2 / 34.4 | 35.4 ± 1.8 | 35.4 (z -0.0) |
| T-FOOD-4 | 9.422 / 9.210 / 9.024 / 8.709 | 9.091 ± 0.302 | 9.271 (z +0.5) |
| T-ACT-2 | 0.126 / 0.116 / 0.107 / 0.100 | 0.112 ± 0.011 | 0.103 (z -0.7) |
| T-RNG-4 | 2.214 / 2.222 / 1.963 / 1.850 | 2.063 ± 0.186 | 2.293 (z +1.1) |
| T-PTY-1 | 4.293 / 3.892 / 3.779 / 4.153 | 4.029 ± 0.236 | 3.898 (z -0.5) |
| T-FOOD-2 | 0.849 / 0.848 / 0.849 / 0.806 | 0.838 ± 0.021 | 0.840 (z +0.1) |
| T-ACT-1 | 0.369 / 0.370 / 0.374 / 0.360 | 0.368 ± 0.006 | 0.368 (z -0.1) |
| T-ACT-3 | 0.096 / 0.098 / 0.096 / 0.104 | 0.098 ± 0.004 | 0.095 (z -0.9) |
| T-ACT-4 | 0.470 / 0.486 / 0.455 / 0.455 | 0.466 ± 0.015 | 0.397 (z -4.2) |
| T-HUN-1 | 28.077 / 9.973 / 15.956 / 22.060 | 19.017 ± 7.800 | 9.973 (z -1.0) |
| T-FOOD-5 | 0.297 / 0.324 / 0.312 / 0.338 | 0.318 ± 0.017 | 0.301 (z -0.9) |
| T-FOOD-6 | 4.288 / 4.582 / 4.958 / 4.420 | 4.562 ± 0.290 | 4.769 (z +0.6) |
| T-FOOD-10 | 0.552 / 0.643 / 0.544 / 0.563 | 0.575 ± 0.046 | 0.645 (z +1.4) |
| T-IGE-1 | 5.995 / 3.103 / 7.499 / 10.377 | 6.744 ± 3.033 | 13.383 (z +2.0) |
| reserves %/day, adult male | -0.003 / 0.002 / -0.005 / 0.006 | -0.000 ± 0.005 | -0.003 (z -0.5) |
| reserves %/day, female, other | 0.015 / -0.004 / -0.014 / 0.002 | -0.000 ± 0.012 | -0.009 (z -0.7) |
| reserves %/day, female, lactating | 0.002 / -0.005 / -0.007 / -0.020 | -0.008 ± 0.009 | -0.009 (z -0.1) |
| reserves %/day, juvenile 5–12 y | -0.052 / 0.001 / -0.027 / 0.009 | -0.017 ± 0.028 | 0.001 (z +0.6) |
| reserves %/day, infant 2–5 y | 0.003 / -0.019 / 0.010 / -0.028 | -0.009 ± 0.018 | -0.020 (z -0.6) |
| reserves %/day, infant 0.5–2 y | 0.003 / 0.004 / -0.024 / -0.013 | -0.007 ± 0.013 | -0.001 (z +0.4) |
| eating min, adult male | 232.3 / 228.9 / 228.1 / 227.9 | 229.3 ± 2.0 | 226.8 (z -1.1) |
| fruit share (eating), adult male | 0.929 / 0.933 / 0.939 / 0.926 | 0.932 ± 0.006 | 0.931 (z -0.1) |
| eating min, female, other | 224.9 / 233.4 / 228.3 / 214.4 | 225.2 ± 8.0 | 223.2 (z -0.2) |
| fruit share (eating), female, other | 0.718 / 0.678 / 0.715 / 0.740 | 0.713 ± 0.026 | 0.690 (z -0.8) |
| eating min, female, lactating | 307.8 / 299.9 / 302.3 / 304.6 | 303.7 ± 3.4 | 300.1 (z -0.9) |
| fruit share (eating), female, lactating | 0.678 / 0.699 / 0.677 / 0.660 | 0.678 ± 0.016 | 0.689 (z +0.6) |
| eating min, juvenile 5–12 y | 294.8 / 283.2 / 295.6 / 285.3 | 289.7 ± 6.4 | 269.9 (z -2.8) |
| fruit share (eating), juvenile 5–12 y | 0.832 / 0.895 / 0.843 / 0.897 | 0.867 ± 0.034 | 0.912 (z +1.2) |

Sums on rows scored in every run listed (fitted / held-out; with rare rows, then without T-HUN-4, T-BRD-1, T-IGE-3):
  S31q: 1.77 / 9.81; 1.77 / 3.75
  S31q1: 2.69 / 4.90; 2.69 / 4.90
  S31q2: 1.84 / 6.68; 1.84 / 3.48
  S31q3: 1.32 / 5.18; 1.32 / 4.98
  A1: 1.88 / 4.71; 1.88 / 3.98
/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/ad60f0c7-2554-45f8-b237-a926b537fae7/scratchpad/e3h/arms/A1-rhythm.json: adults out of a nest 2.31% of night; T-RHY-5 0.0185; night deaths 0; deaths 0
A1: identity (adult males' eating min, ground km) 226.819 / 2.499; energy-diagnose 226.81875 / 2.4987125233707657; living [(49, 49, {}), (49, 49, {})]
A1 known-tree trips back to one the same animal reached empty: 164 of 1642 (0.0999); hours since that arrival: min 240.3, 10th percentile 260.8, median 338.8 (memTravelHorizonH 240)
A1 arrivals at empty crowns (both seeds): all 1900, already below 0.06 at the start 1872; by kind remembered crown 707, departure 465, crown in view 0, a companion's trip 723, a caller 5; own trips by source left 108, seen 371, nobelief 0, known 692
```

**What happened.** The share of trips that feed at their target rose from 0.463 ± 0.004 to 0.569 (z +23.6), and adults
make fewer trips (12.1 against 15.8 ± 0.7 per adult-day): trips to the community's known trees fell from 2.40 to 0.88 per
adult-day (they feed 12.6% instead of 5.6%; the returns to a crown the animal found empty fell from 64% to 10%, all of
them more than 240 h after it, when the sighting has lapsed by design), companions follow fewer leaders to empty crowns
(joined trips 4.3 → 3.2 per adult-day, fed 0.60 → 0.74), and caller trips feed at the caller's crown 41% instead of 4%.
Arrivals at empty crowns fell from 2.80 to 1.02 per adult-day, the walking and energy spent on unfed trips from 1.016 km
and 35 kcal to 0.707 km and 25 kcal per adult-day; trips deliver 26% of the meal they are valued at (22%). Walking fell a
little (adult males 2.50 km, nursing mothers 2.38 against 2.58 ± 0.07, z −2.8; juveniles 2.80), climbing is unchanged,
every class's reserves are within the group's spread (the lowest, infants 2–5 y, −0.020 against −0.009 ± 0.018), juveniles
eat 20 min less (270 against 290 ± 6) with their reserves level (+0.001 against −0.017 ± 0.028). The rest share T-ACT-4
fell to 0.397 (0.466 ± 0.015, z −4.2; band 0.30–0.47), T-IGE-1 rose to 13.4 (6.7 ± 3.0, z +2.0; band 5–12); every sum is
inside noise. The remaining empty arrivals of own trips are still mostly the list's crowns (692 of 1,172: first visits,
fed 13%). Night safe (adults out of a nest 2.31% of the night, T-RHY-5 0.0185).

**Against the predictions.** Prescriptions 48: held. Viability and night: held. Fed at target 0.55–0.68: held (0.569).
Known-tree trips 0.5–1.3 per adult-day: held (0.88); returns to one found empty ≤ 0.05: **missed** (0.0999: every return is
more than 240 h after the empty finding, the horizon after which the list's expectation stands in again by design; the
readout counted returns at any delay). Callers fed at the crown 0.20–0.50: held (0.41). Arrivals at empty crowns 0.8–1.8:
held (1.02). Unfed trips' km 0.70–0.95: held (0.707). Ground km within ± 0.4 km of the means: held (−0.18, −0.20, −0.15).
Adults' climbing 38–50: held (42.9). T-FOOD-4 8–10, T-ACT-2 0.09–0.13, T-RNG-4 1.7–2.4, T-PTY-1 3.7–4.7: held (9.27, 0.103,
2.29, 3.90). Reserves at or above the mean − 0.03: held. Sums inside noise: held (fitted z −0.0; held-out −0.8; without
the rare rows −0.3).

**Kill criterion: not met.** (a) no death, no starvation; (b) the largest fall against the S31q mean is infants 2–5 y,
0.011% of the store a day; (c) held-out inside noise with and without the rare rows; (d) night safe; (e) the mechanism runs
(returns to a crown found empty 0.0999 of known-tree trips, below 0.10, all after the sighting's horizon; callers fed at
the crown 0.41, above 0.10).

**Verdict: `tripBeliefs` 3 is a provisional keep candidate as a correction** (no counted prescription removed; trips fed at
their target z +23.6): an animal's own sighting of a listed crown, an empty one included, stands for 240 h, and a caller's
crown is the trip's goal. Reported, not used to choose: rest share down (in band), intergroup encounters up (above band).

### 6.2 Iteration 2: A2 = S31 + `tripBeliefs` 7 (frozen checkout 973df1f, clean; A1 shown beside it)

Printed by `final_table.py`, `night.py` and the trip readouts from the JSON (session scratch `e3h/arms/`). A1's code is
unchanged at 973df1f (bit 4 is off in it; the belief stride and the share factor of 1 leave its numbers bit for bit).

```
S31q: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q1: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q2: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q3: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  A1: d8f8f6e dirty 0 prescriptions 48 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  A2: 973df1f dirty 0 prescriptions 48 viability {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 1, 0, {'illness': 1}), (7, 0, 0, {})]

quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 12
  fitted             (17 rows) ref 1.77, 2.69, 1.84, 1.32 (mean 1.90, sd 0.57; used 0.69) | A1.json: 1.88, Δ -0.02, z -0.0 (inside noise) | A2.json: 2.38, Δ +0.47, z +0.6 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | A1.json: 4.71, Δ -1.93, z -0.8 (inside noise) | A2.json: 5.22, Δ -1.42, z -0.6 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | A1.json: 3.98, Δ -0.30, z -0.3 (inside noise) | A2.json: 4.28, Δ -0.00, z -0.0 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.00±0.00 | A1.json 0.00 (pass) | A2.json 0.15 (fail)
   T-HUN-4   held-out ref 2.36±2.86 | A1.json 0.74 (fail) | A2.json 0.95 (fail)
   T-IGE-1   fitted   ref 0.07±0.14 | A1.json 0.20 (inconclusive) | A2.json 0.51 (inconclusive)

| Readout | S31q runs | S31q mean ± SD | A1 | A2 |
| --- | --- | --- | --- | --- |
| trips fed at their target (share, adults) | 0.461 / 0.458 / 0.467 / 0.465 | 0.463 ± 0.004 | 0.569 (z +23.6) | 0.549 (z +19.1) |
| trips per adult-day | 16.83 / 15.68 / 15.17 / 15.37 | 15.76 ± 0.74 | 12.09 (z -4.4) | 12.89 (z -3.5) |
|   remembered crown: per adult-day | 2.50 / 2.66 / 2.51 / 2.59 | 2.57 ± 0.08 | 1.95 (z -7.2) | 1.49 (z -12.5) |
|   remembered crown: fed at target | 0.592 / 0.588 / 0.583 / 0.558 | 0.580 ± 0.015 | 0.729 (z +8.7) | 0.807 (z +13.3) |
|   departure: per adult-day | 6.11 / 5.70 / 5.66 / 5.72 | 5.80 ± 0.21 | 4.53 (z -5.4) | 5.11 (z -3.0) |
|   departure: fed at target | 0.290 / 0.272 / 0.282 / 0.274 | 0.279 ± 0.008 | 0.329 (z +5.4) | 0.316 (z +4.0) |
|   crown in view: per adult-day | 1.58 / 1.51 / 1.53 / 1.60 | 1.55 ± 0.04 | 1.23 (z -6.7) | 1.39 (z -3.4) |
|   crown in view: fed at target | 0.978 / 0.977 / 0.980 / 0.982 | 0.979 ± 0.002 | 0.982 (z +1.1) | 0.990 (z +4.3) |
|   a companion's trip: per adult-day | 4.80 / 4.37 / 4.03 / 4.14 | 4.33 ± 0.34 | 3.18 (z -3.0) | 3.57 (z -2.0) |
|   a companion's trip: fed at target | 0.604 / 0.584 / 0.615 / 0.607 | 0.603 ± 0.013 | 0.740 (z +9.3) | 0.701 (z +6.7) |
|   a caller: per adult-day | 1.83 / 1.44 / 1.44 / 1.32 | 1.51 ± 0.23 | 1.20 (z -1.2) | 1.34 (z -0.7) |
|   a caller: fed at target | 0.033 / 0.027 / 0.034 / 0.035 | 0.032 ± 0.004 | 0.339 (z +76.3) | 0.292 (z +64.6) |
| unfed trips: km per adult-day | 1.097 / 1.041 / 0.978 / 0.948 | 1.016 ± 0.066 | 0.707 (z -4.2) | 0.640 (z -5.1) |
| unfed trips: kcal per adult-day | 37.9 / 35.8 / 33.6 / 32.6 | 35.0 ± 2.4 | 24.6 (z -4.0) | 22.6 (z -4.7) |
| trips: km per adult-day | 1.962 / 1.872 / 1.830 / 1.744 | 1.852 ± 0.091 | 1.655 (z -1.9) | 1.664 (z -1.9) |
| delivered ÷ valued (fruit at target ÷ E0) | 0.215 / 0.217 / 0.221 / 0.218 | 0.218 ± 0.003 | 0.262 (z +15.8) | 0.265 (z +16.9) |
|   unfed, arrived, empty: per adult-day | 2.881 / 2.991 / 2.582 / 2.728 | 2.796 ± 0.179 | 1.022 (z -8.9) | 1.070 (z -8.6) |
|   unfed, departure given up: per adult-day | 3.116 / 2.926 / 3.017 / 3.047 | 3.026 ± 0.079 | 2.494 (z -6.0) | 2.768 (z -2.9) |
|   unfed, caller stopped short: per adult-day | 1.123 / 0.851 / 0.857 / 0.801 | 0.908 ± 0.146 | 0.294 (z -3.8) | 0.454 (z -2.8) |
|   unfed, re-decided en route: per adult-day | 1.073 / 0.959 / 0.886 / 0.905 | 0.956 ± 0.084 | 0.644 (z -3.3) | 0.744 (z -2.3) |
|   unfed, arrived, crop left: per adult-day | 0.684 / 0.593 / 0.565 / 0.584 | 0.607 ± 0.053 | 0.616 (z +0.2) | 0.639 (z +0.5) |
| known-tree trips per adult-day; fed | 2.245 / 2.547 / 2.190 / 2.605 | 2.397 ± 0.210 | 0.883 (z -6.5) | 0.076 (z -9.9) |
|   known-tree trips fed at target | 0.053 / 0.058 / 0.059 / 0.053 | 0.056 ± 0.003 | 0.126 (z +19.6) | 0.115 (z +16.6) |
|   known-tree trips back to one found empty (share) | 0.620 / 0.653 / 0.634 / 0.661 | 0.642 ± 0.019 | 0.100 (z -26.2) | 0.022 (z -29.9) |
| caller trips fed at the caller's crown | 0.038 / 0.033 / 0.040 / 0.042 | 0.038 ± 0.004 | 0.409 (z +85.9) | 0.340 (z +69.9) |
| ground km, adult male | 2.97 / 2.69 / 2.63 / 2.43 | 2.68 ± 0.22 | 2.50 (z -0.7) | 2.37 (z -1.3) |
| ground km, female lactating | 2.65 / 2.53 / 2.62 / 2.52 | 2.58 ± 0.07 | 2.38 (z -2.8) | 2.19 (z -5.4) |
| ground km, female other | 2.12 / 2.12 / 1.95 / 1.91 | 2.02 ± 0.11 | 1.97 (z -0.4) | 1.88 (z -1.2) |
| ground km, juvenile 5–12 y | 3.02 / 2.99 / 2.80 / 2.99 | 2.95 ± 0.10 | 2.80 (z -1.3) | 2.81 (z -1.2) |
| climbing kcal/day, adults (day-weighted) | 47.2 / 43.5 / 41.6 / 42.6 | 43.7 ± 2.4 | 42.9 (z -0.3) | 44.4 (z +0.2) |
| climbing kcal/day, adult male | 60.7 / 55.1 / 52.8 / 53.6 | 55.6 ± 3.5 | 54.2 (z -0.4) | 56.4 (z +0.2) |
| climbing kcal/day, female lactating | 38.0 / 35.1 / 34.2 / 34.4 | 35.4 ± 1.8 | 35.4 (z -0.0) | 35.5 (z +0.1) |
| T-FOOD-4 | 9.422 / 9.210 / 9.024 / 8.709 | 9.091 ± 0.302 | 9.271 (z +0.5) | 8.812 (z -0.8) |
| T-ACT-2 | 0.126 / 0.116 / 0.107 / 0.100 | 0.112 ± 0.011 | 0.103 (z -0.7) | 0.094 (z -1.4) |
| T-RNG-4 | 2.214 / 2.222 / 1.963 / 1.850 | 2.063 ± 0.186 | 2.293 (z +1.1) | 1.619 (z -2.1) |
| T-PTY-1 | 4.293 / 3.892 / 3.779 / 4.153 | 4.029 ± 0.236 | 3.898 (z -0.5) | 4.669 (z +2.4) |
| T-FOOD-2 | 0.849 / 0.848 / 0.849 / 0.806 | 0.838 ± 0.021 | 0.840 (z +0.1) | 0.814 (z -1.0) |
| T-ACT-1 | 0.369 / 0.370 / 0.374 / 0.360 | 0.368 ± 0.006 | 0.368 (z -0.1) | 0.374 (z +0.9) |
| T-ACT-3 | 0.096 / 0.098 / 0.096 / 0.104 | 0.098 ± 0.004 | 0.095 (z -0.9) | 0.098 (z -0.1) |
| T-ACT-4 | 0.470 / 0.486 / 0.455 / 0.455 | 0.466 ± 0.015 | 0.397 (z -4.2) | 0.451 (z -1.0) |
| T-HUN-1 | 28.077 / 9.973 / 15.956 / 22.060 | 19.017 ± 7.800 | 9.973 (z -1.0) | 21.940 (z +0.3) |
| T-FOOD-5 | 0.297 / 0.324 / 0.312 / 0.338 | 0.318 ± 0.017 | 0.301 (z -0.9) | 0.307 (z -0.5) |
| T-FOOD-6 | 4.288 / 4.582 / 4.958 / 4.420 | 4.562 ± 0.290 | 4.769 (z +0.6) | 4.358 (z -0.6) |
| T-FOOD-10 | 0.552 / 0.643 / 0.544 / 0.563 | 0.575 ± 0.046 | 0.645 (z +1.4) | 0.654 (z +1.5) |
| T-IGE-1 | 5.995 / 3.103 / 7.499 / 10.377 | 6.744 ± 3.033 | 13.383 (z +2.0) | 1.459 (z -1.6) |
| reserves %/day, adult male | -0.003 / 0.002 / -0.005 / 0.006 | -0.000 ± 0.005 | -0.003 (z -0.5) | 0.006 (z +1.1) |
| reserves %/day, female, other | 0.015 / -0.004 / -0.014 / 0.002 | -0.000 ± 0.012 | -0.009 (z -0.7) | 0.001 (z +0.1) |
| reserves %/day, female, lactating | 0.002 / -0.005 / -0.007 / -0.020 | -0.008 ± 0.009 | -0.009 (z -0.1) | -0.010 (z -0.3) |
| reserves %/day, juvenile 5–12 y | -0.052 / 0.001 / -0.027 / 0.009 | -0.017 ± 0.028 | 0.001 (z +0.6) | -0.040 (z -0.7) |
| reserves %/day, infant 2–5 y | 0.003 / -0.019 / 0.010 / -0.028 | -0.009 ± 0.018 | -0.020 (z -0.6) | -0.001 (z +0.4) |
| reserves %/day, infant 0.5–2 y | 0.003 / 0.004 / -0.024 / -0.013 | -0.007 ± 0.013 | -0.001 (z +0.4) | -0.023 (z -1.0) |
| eating min, adult male | 232.3 / 228.9 / 228.1 / 227.9 | 229.3 ± 2.0 | 226.8 (z -1.1) | 228.5 (z -0.4) |
| fruit share (eating), adult male | 0.929 / 0.933 / 0.939 / 0.926 | 0.932 ± 0.006 | 0.931 (z -0.1) | 0.924 (z -1.2) |
| eating min, female, other | 224.9 / 233.4 / 228.3 / 214.4 | 225.2 ± 8.0 | 223.2 (z -0.2) | 231.4 (z +0.7) |
| fruit share (eating), female, other | 0.718 / 0.678 / 0.715 / 0.740 | 0.713 ± 0.026 | 0.690 (z -0.8) | 0.664 (z -1.7) |
| eating min, female, lactating | 307.8 / 299.9 / 302.3 / 304.6 | 303.7 ± 3.4 | 300.1 (z -0.9) | 306.1 (z +0.6) |
| fruit share (eating), female, lactating | 0.678 / 0.699 / 0.677 / 0.660 | 0.678 ± 0.016 | 0.689 (z +0.6) | 0.661 (z -1.0) |
| eating min, juvenile 5–12 y | 294.8 / 283.2 / 295.6 / 285.3 | 289.7 ± 6.4 | 269.9 (z -2.8) | 283.5 (z -0.9) |
| fruit share (eating), juvenile 5–12 y | 0.832 / 0.895 / 0.843 / 0.897 | 0.867 ± 0.034 | 0.912 (z +1.2) | 0.823 (z -1.1) |

Sums on rows scored in every run listed (fitted / held-out; with rare rows, then without T-HUN-4, T-BRD-1, T-IGE-3):
  S31q: 1.77 / 9.81; 1.77 / 3.75
  S31q1: 2.69 / 4.90; 2.69 / 4.90
  S31q2: 1.84 / 6.68; 1.84 / 3.48
  S31q3: 1.32 / 5.18; 1.32 / 4.98
  A1: 1.88 / 4.71; 1.88 / 3.98
  A2: 2.38 / 5.22; 2.38 / 4.28
/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/ad60f0c7-2554-45f8-b237-a926b537fae7/scratchpad/e3h/arms/A1-rhythm.json: adults out of a nest 2.31% of night; T-RHY-5 0.0185; night deaths 0; deaths 0
/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/ad60f0c7-2554-45f8-b237-a926b537fae7/scratchpad/e3h/arms/A2-rhythm.json: adults out of a nest 2.51% of night; T-RHY-5 0.0178; night deaths 1; deaths 1
A1: identity (adult males' eating min, ground km) 226.819 / 2.499; energy-diagnose 226.81875 / 2.4987125233707657; living [(49, 49, {}), (49, 49, {})]
A2: identity (adult males' eating min, ground km) 228.475 / 2.369; energy-diagnose 228.47458622540924 / 2.3690557746821512; living [(49, 48, {'illness': 1}), (49, 49, {})]
A2-rhythm.json: adults out of a nest 2.51% of night; T-RHY-5 0.0178; night deaths 1 (the illness death, seed 48); deaths 1
A2 arrivals at empty crowns (both seeds): all 1964, already below 0.06 at the start 1896; by kind remembered crown 293, departure 633, crown in view 0, a companion's trip 1031, a caller 7; own trips by source left 220, seen 658, nobelief 0, known 48
A2 own trips by belief source (per adult-day, fed at target): left 0.98 (0.381), seen 5.534 (0.439), belief 0.003 (0.4), known 0.076 (0.115)
A1 own trips by belief source (per adult-day, fed at target): left 0.719 (0.438), seen 4.878 (0.509), belief 0.003 (0.6), known 0.883 (0.126)
```

**What happened.** Valued at the expected bout of a crown in fruit with the list's own chance, the community's known trees
are almost never chosen (0.076 trips per adult-day; A1 0.88), but the trips they gave were replaced by trips to crowns the
animal had seen (own trips on a sighting 6.5 per adult-day against A1's 5.6) that feed less often (seen 0.44, left 0.38;
A1 0.51, 0.44), and by more companions' trips that arrive empty (1,031 empty arrivals against 723): arrivals at empty crowns
stay at A1's level (1.07 per adult-day) and the share of trips fed at their target is a little lower than A1's (0.549,
z +19.1 against the group). Nursing mothers walk less (2.19 km, z −5.4), parties are larger (T-PTY-1 4.67, z +2.4, in band),
day ranges shorter (T-RNG-4 1.62, z −2.1, in band); juveniles' and young infants' reserves are lower than A1's (−0.040 and
−0.023 against +0.001 and −0.001 %/day; within the group's spread); every sum inside noise; one death, of illness.

**Against the predictions.** Prescriptions 48: held. Viability and night (2.51%, 0.0178): held. Known-tree trips below 0.25:
held (0.076). Fed at target 0.58–0.70: **missed** (0.549). Arrivals at empty crowns below 0.7: **missed** (1.07). Unfed trips'
km 0.45–0.70: held (0.640). Ground km within ± 0.5 km: held (−0.31, −0.39, −0.14). Fruit share of eating within ± 0.05:
held (males 0.924, mothers 0.661). T-FOOD-4, T-ACT-2, T-RNG-4, T-PTY-1 in the registered ranges: held (8.81, 0.094, 1.62,
4.67). Reserves at or above the group mean − 0.03: held (lowest: juveniles −0.040 against −0.017). Sums inside noise: held
(fitted z +0.6, held-out −0.6, without the rare rows 0.0).

**Kill criterion: not met.** (a) one death, of illness, no starvation; (b) the largest fall against the S31q mean is
juveniles, 0.023% of the store a day; (c) held-out inside noise; (d) night safe; (e) known-tree trips 0.076 per adult-day,
below 0.5.

**Verdict.** By the registered rule A2 is also a provisional keep candidate as a correction (trips fed at their target
z +19.1), but **A1 stays the best arm**: A2's share of trips fed at the target is lower than A1's (0.549 against 0.569) and
its juveniles' reserve slope is 0.041% of the store a day below A1's (registered limit 0.03). Bit 4 is recorded, off: the
expected-bout valuation is the right long-run rate for an uncertain crown, but on this stack the trips it removes are
replaced by trips on beliefs that others' eating has made stale, so trips do not find more food. No third iteration: what
remains (crowns emptied by animals the traveller did not see there, D2) needs an expectation of others' visits that the
animal would have to learn, which E3g showed collapses travel when applied to every trip.

### 6.3 Diagnostic arm (not a candidate): the best arm A1 + `redecideValue` 2 (D1), and S31 + `redecideValue` 2 (D0) beside it (frozen checkout 973df1f, clean)

Brief: whether re-deciding's walking cost falls once trips find food. Printed by `redecide_cost.py`, `final_table.py` and
`report_table.py` from the JSON (session scratch `e3h/arms/`). D0 and D1 are single runs; the cost on S31 is D0 less the
S31q group's mean, the cost on A1 is D1 less A1 (both single runs, so each difference carries one run's draw: read
differences smaller than the group's SD, e.g. 0.22 km for males, as noise).

```
| Readout | S31q mean | S31 + redecide (D0) | Δ re-deciding on S31 | A1 | A1 + redecide (D1) | Δ re-deciding on A1 |
| --- | --- | --- | --- | --- | --- | --- |
| ground km, adult male | 2.681 | 4.118 | +1.438 | 2.499 | 3.492 | +0.993 |
| ground km, female lactating | 2.581 | 3.733 | +1.153 | 2.377 | 3.506 | +1.129 |
| ground km, female other | 2.023 | 3.350 | +1.326 | 1.971 | 2.752 | +0.781 |
| ground km, juvenile 5–12 y | 2.947 | 4.105 | +1.158 | 2.801 | 3.756 | +0.955 |
| climbing kcal/day, adults | 43.730 | 72.807 | +29.077 | 42.903 | 70.415 | +27.512 |
| trips per adult-day | 15.763 | 28.573 | +12.810 | 12.090 | 21.462 | +9.372 |
| trips fed at target | 0.463 | 0.441 | -0.022 | 0.569 | 0.551 | -0.018 |
| unfed trips km per adult-day | 1.016 | 1.608 | +0.592 | 0.707 | 1.017 | +0.310 |
| T-FOOD-4 | 9.091 | 14.355 | +5.264 | 9.271 | 14.398 | +5.126 |
| T-RNG-4 | 2.063 | 2.925 | +0.862 | 2.293 | 2.559 | +0.266 |
| T-HUN-1 | 19.017 | 40.110 | +21.093 | 9.973 | 34.282 | +24.309 |
| reserves %/day, adult male | -0.000 | 0.008 | +0.008 | -0.003 | 0.000 | +0.003 |
| reserves %/day, female, other | -0.000 | 0.013 | +0.014 | -0.009 | -0.009 | +0.001 |
| reserves %/day, female, lactating | -0.008 | -0.061 | -0.053 | -0.009 | -0.034 | -0.025 |
| reserves %/day, juvenile 5–12 y | -0.017 | -0.051 | -0.034 | 0.001 | -0.060 | -0.061 |
| reserves %/day, infant 0.5–2 y | -0.007 | -0.124 | -0.117 | -0.001 | -0.047 | -0.046 |

S31q: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q1: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q2: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S31q3: 4111971 dirty 0 prescriptions 38 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  D0: 973df1f dirty 0 prescriptions 45 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  D1: 973df1f dirty 0 prescriptions 45 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]

quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.77, 2.42, 1.84, 1.32 (mean 1.84, sd 0.45; used 0.69) | D0.json: 1.55, Δ -0.29, z -0.4 (inside noise) | D1.json: 2.33, Δ +0.49, z +0.6 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | D0.json: 7.61, Δ +0.97, z +0.4 (inside noise) | D1.json: 4.96, Δ -1.69, z -0.7 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | D0.json: 4.24, Δ -0.04, z -0.0 (inside noise) | D1.json: 4.52, Δ +0.24, z +0.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.00±0.00 | D0.json 0.05 (fail) | D1.json 0.16 (fail)
   T-HUN-1   fitted   ref 0.04±0.08 | D0.json 0.76 (inconclusive) | D1.json 0.46 (inconclusive)
   T-HUN-4   held-out ref 2.36±2.86 | D0.json 3.37 (fail) | D1.json 0.44 (fail)
   T-SOC-2   held-out ref 0.00±0.00 | D0.json 0.29 (fail) | D1.json 0.00 (pass)

| Readout | S31q runs | S31q mean ± SD | D0 | D1 |
| --- | --- | --- | --- | --- |
| trips fed at their target (share, adults) | 0.461 / 0.458 / 0.467 / 0.465 | 0.463 ± 0.004 | 0.441 (z -4.8) | 0.551 (z +19.6) |
| trips per adult-day | 16.83 / 15.68 / 15.17 / 15.37 | 15.76 ± 0.74 | 28.57 (z +15.4) | 21.46 (z +6.9) |
|   remembered crown: per adult-day | 2.50 / 2.66 / 2.51 / 2.59 | 2.57 ± 0.08 | 2.62 (z +0.7) | 1.96 (z -7.0) |
|   remembered crown: fed at target | 0.592 / 0.588 / 0.583 / 0.558 | 0.580 ± 0.015 | 0.574 (z -0.4) | 0.716 (z +7.9) |
|   departure: per adult-day | 6.11 / 5.70 / 5.66 / 5.72 | 5.80 ± 0.21 | 9.93 (z +17.6) | 7.67 (z +8.0) |
|   departure: fed at target | 0.290 / 0.272 / 0.282 / 0.274 | 0.279 ± 0.008 | 0.315 (z +3.9) | 0.380 (z +10.9) |
|   crown in view: per adult-day | 1.58 / 1.51 / 1.53 / 1.60 | 1.55 ± 0.04 | 1.91 (z +7.3) | 1.38 (z -3.7) |
|   crown in view: fed at target | 0.978 / 0.977 / 0.980 / 0.982 | 0.979 ± 0.002 | 0.918 (z -24.7) | 0.941 (z -15.4) |
|   a companion's trip: per adult-day | 4.80 / 4.37 / 4.03 / 4.14 | 4.33 ± 0.34 | 10.88 (z +17.2) | 8.11 (z +9.9) |
|   a companion's trip: fed at target | 0.604 / 0.584 / 0.615 / 0.607 | 0.603 ± 0.013 | 0.561 (z -2.8) | 0.673 (z +4.8) |
|   a caller: per adult-day | 1.83 / 1.44 / 1.44 / 1.32 | 1.51 ± 0.23 | 3.24 (z +6.9) | 2.35 (z +3.3) |
|   a caller: fed at target | 0.033 / 0.027 / 0.034 / 0.035 | 0.032 ± 0.004 | 0.030 (z -0.6) | 0.323 (z +72.4) |
| unfed trips: km per adult-day | 1.097 / 1.041 / 0.978 / 0.948 | 1.016 ± 0.066 | 1.608 (z +8.0) | 1.017 (z +0.0) |
| unfed trips: kcal per adult-day | 37.9 / 35.8 / 33.6 / 32.6 | 35.0 ± 2.4 | 56.5 (z +8.2) | 37.0 (z +0.8) |
| trips: km per adult-day | 1.962 / 1.872 / 1.830 / 1.744 | 1.852 ± 0.091 | 2.825 (z +9.6) | 2.460 (z +6.0) |
| delivered ÷ valued (fruit at target ÷ E0) | 0.215 / 0.217 / 0.221 / 0.218 | 0.218 ± 0.003 | 0.164 (z -19.2) | 0.211 (z -2.4) |
|   unfed, arrived, empty: per adult-day | 2.881 / 2.991 / 2.582 / 2.728 | 2.796 ± 0.179 | 4.846 (z +10.3) | 1.891 (z -4.5) |
|   unfed, departure given up: per adult-day | 3.116 / 2.926 / 3.017 / 3.047 | 3.026 ± 0.079 | 3.533 (z +5.8) | 2.798 (z -2.6) |
|   unfed, caller stopped short: per adult-day | 1.123 / 0.851 / 0.857 / 0.801 | 0.908 ± 0.146 | 1.831 (z +5.7) | 0.571 (z -2.1) |
|   unfed, re-decided en route: per adult-day | 1.073 / 0.959 / 0.886 / 0.905 | 0.956 ± 0.084 | 3.912 (z +31.5) | 2.677 (z +18.3) |
|   unfed, arrived, crop left: per adult-day | 0.684 / 0.593 / 0.565 / 0.584 | 0.607 ± 0.053 | 1.609 (z +16.9) | 1.507 (z +15.2) |
| known-tree trips per adult-day; fed | 2.245 / 2.547 / 2.190 / 2.605 | 2.397 ± 0.210 | 3.211 (z +3.5) | 0.747 (z -7.0) |
|   known-tree trips fed at target | 0.053 / 0.058 / 0.059 / 0.053 | 0.056 ± 0.003 | 0.041 (z -4.1) | 0.153 (z +27.2) |
|   known-tree trips back to one found empty (share) | 0.620 / 0.653 / 0.634 / 0.661 | 0.642 ± 0.019 | 0.702 (z +2.9) | 0.096 (z -26.4) |
| caller trips fed at the caller's crown | 0.038 / 0.033 / 0.040 / 0.042 | 0.038 ± 0.004 | 0.034 (z -1.0) | 0.369 (z +76.6) |
| ground km, adult male | 2.97 / 2.69 / 2.63 / 2.43 | 2.68 ± 0.22 | 4.12 (z +5.8) | 3.49 (z +3.3) |
| ground km, female lactating | 2.65 / 2.53 / 2.62 / 2.52 | 2.58 ± 0.07 | 3.73 (z +15.7) | 3.51 (z +12.6) |
| ground km, female other | 2.12 / 2.12 / 1.95 / 1.91 | 2.02 ± 0.11 | 3.35 (z +10.9) | 2.75 (z +6.0) |
| ground km, juvenile 5–12 y | 3.02 / 2.99 / 2.80 / 2.99 | 2.95 ± 0.10 | 4.11 (z +10.4) | 3.76 (z +7.2) |
| climbing kcal/day, adults (day-weighted) | 47.2 / 43.5 / 41.6 / 42.6 | 43.7 ± 2.4 | 72.8 (z +10.6) | 70.4 (z +9.7) |
| climbing kcal/day, adult male | 60.7 / 55.1 / 52.8 / 53.6 | 55.6 ± 3.5 | 97.9 (z +10.7) | 89.9 (z +8.6) |
| climbing kcal/day, female lactating | 38.0 / 35.1 / 34.2 / 34.4 | 35.4 ± 1.8 | 50.9 (z +7.9) | 55.9 (z +10.5) |
| T-FOOD-4 | 9.422 / 9.210 / 9.024 / 8.709 | 9.091 ± 0.302 | 14.355 (z +15.6) | 14.398 (z +15.7) |
| T-ACT-2 | 0.126 / 0.116 / 0.107 / 0.100 | 0.112 ± 0.011 | 0.170 (z +4.7) | 0.151 (z +3.2) |
| T-RNG-4 | 2.214 / 2.222 / 1.963 / 1.850 | 2.063 ± 0.186 | 2.925 (z +4.1) | 2.559 (z +2.4) |
| T-PTY-1 | 4.293 / 3.892 / 3.779 / 4.153 | 4.029 ± 0.236 | 4.568 (z +2.0) | 4.423 (z +1.5) |
| T-FOOD-2 | 0.849 / 0.848 / 0.849 / 0.806 | 0.838 ± 0.021 | 0.817 (z -0.9) | 0.839 (z +0.1) |
| T-ACT-1 | 0.369 / 0.370 / 0.374 / 0.360 | 0.368 ± 0.006 | 0.393 (z +3.6) | 0.392 (z +3.5) |
| T-ACT-3 | 0.096 / 0.098 / 0.096 / 0.104 | 0.098 ± 0.004 | 0.105 (z +1.6) | 0.092 (z -1.4) |
| T-ACT-4 | 0.470 / 0.486 / 0.455 / 0.455 | 0.466 ± 0.015 | 0.383 (z -5.0) | 0.393 (z -4.4) |
| T-HUN-1 | 28.077 / 9.973 / 15.956 / 22.060 | 19.017 ± 7.800 | 40.110 (z +2.4) | 34.282 (z +1.8) |
| T-FOOD-5 | 0.297 / 0.324 / 0.312 / 0.338 | 0.318 ± 0.017 | 0.263 (z -2.8) | 0.213 (z -5.4) |
| T-FOOD-6 | 4.288 / 4.582 / 4.958 / 4.420 | 4.562 ± 0.290 | 4.013 (z -1.7) | 3.897 (z -2.1) |
| T-FOOD-10 | 0.552 / 0.643 / 0.544 / 0.563 | 0.575 ± 0.046 | 0.619 (z +0.9) | 0.580 (z +0.1) |
| T-IGE-1 | 5.995 / 3.103 / 7.499 / 10.377 | 6.744 ± 3.033 | 7.575 (z +0.2) | 7.478 (z +0.2) |
| reserves %/day, adult male | -0.003 / 0.002 / -0.005 / 0.006 | -0.000 ± 0.005 | 0.008 (z +1.3) | 0.000 (z +0.0) |
| reserves %/day, female, other | 0.015 / -0.004 / -0.014 / 0.002 | -0.000 ± 0.012 | 0.013 (z +1.0) | -0.009 (z -0.6) |
| reserves %/day, female, lactating | 0.002 / -0.005 / -0.007 / -0.020 | -0.008 ± 0.009 | -0.061 (z -5.2) | -0.034 (z -2.6) |
| reserves %/day, juvenile 5–12 y | -0.052 / 0.001 / -0.027 / 0.009 | -0.017 ± 0.028 | -0.051 (z -1.1) | -0.060 (z -1.4) |
| reserves %/day, infant 2–5 y | 0.003 / -0.019 / 0.010 / -0.028 | -0.009 ± 0.018 | 0.006 (z +0.7) | -0.030 (z -1.1) |
| reserves %/day, infant 0.5–2 y | 0.003 / 0.004 / -0.024 / -0.013 | -0.007 ± 0.013 | -0.124 (z -7.8) | -0.047 (z -2.7) |
| eating min, adult male | 232.3 / 228.9 / 228.1 / 227.9 | 229.3 ± 2.0 | 240.7 (z +5.0) | 235.6 (z +2.8) |
| fruit share (eating), adult male | 0.929 / 0.933 / 0.939 / 0.926 | 0.932 ± 0.006 | 0.946 (z +2.4) | 0.956 (z +3.9) |
| eating min, female, other | 224.9 / 233.4 / 228.3 / 214.4 | 225.2 ± 8.0 | 235.9 (z +1.2) | 237.9 (z +1.4) |
| fruit share (eating), female, other | 0.718 / 0.678 / 0.715 / 0.740 | 0.713 ± 0.026 | 0.715 (z +0.1) | 0.682 (z -1.1) |
| eating min, female, lactating | 307.8 / 299.9 / 302.3 / 304.6 | 303.7 ± 3.4 | 330.8 (z +7.2) | 318.6 (z +4.0) |
| fruit share (eating), female, lactating | 0.678 / 0.699 / 0.677 / 0.660 | 0.678 ± 0.016 | 0.617 (z -3.5) | 0.652 (z -1.5) |
| eating min, juvenile 5–12 y | 294.8 / 283.2 / 295.6 / 285.3 | 289.7 ± 6.4 | 296.2 (z +0.9) | 286.6 (z -0.4) |
| fruit share (eating), juvenile 5–12 y | 0.832 / 0.895 / 0.843 / 0.897 | 0.867 ± 0.034 | 0.913 (z +1.2) | 0.932 (z +1.7) |

Sums on rows scored in every run listed (fitted / held-out; with rare rows, then without T-HUN-4, T-BRD-1, T-IGE-3):
  S31q: 1.77 / 9.81; 1.77 / 3.75
  S31q1: 2.42 / 4.90; 2.42 / 4.90
  S31q2: 1.84 / 6.68; 1.84 / 3.48
  S31q3: 1.32 / 5.18; 1.32 / 4.98
  D0: 1.55 / 7.61; 1.55 / 4.24
  D1: 2.33 / 4.96; 2.33 / 4.52
D0: identity (adult males' eating min, ground km) 240.726 / 4.118; energy-diagnose 240.72589285714287 / 4.118380507728296; living [(49, 49, {}), (49, 49, {})]
D1: identity (adult males' eating min, ground km) 235.606 / 3.492; energy-diagnose 235.60625 / 3.4922113803494184; living [(49, 49, {}), (49, 49, {})]
```

**Reading.** Re-deciding still adds most of its walking once trips find food: +0.99 km a day for adult males (on S31
+1.44), +1.13 for nursing mothers (+1.15), +0.78 for other females (+1.33), +0.96 for juveniles (+1.16), +27.5 kcal of
adults' climbing (+29.1), +9.4 trips per adult-day (+12.8), and hunting rises as much (T-HUN-1 +24; E3g's re-sighting
correction is not in either). The extra trips fail a little less (unfed trips' walking +0.31 km per adult-day against
+0.59; known-tree trips 0.75 against 3.2 per adult-day; callers fed at the crown 0.37 against 0.03), and the energy cost
falls for nursing mothers (−0.025 against −0.053 %/day) and infants 0.5–2 y (−0.046 against −0.117), not for juveniles
(−0.061 against −0.034). So the corrections remove the part of re-deciding's cost that came from futile trips (about a
third of the males' and other females' extra walking), not the cost itself: the keep test still takes trips that the
valuation prefers to staying, and those trips are what the valuation says (E3g). Every sum inside noise for both.

### 6.4 The brief's table (S31q group mean ± SD against each arm; z in brackets; sums judged one arm at a time below)

```
| | S31q mean ± SD | A1 | A2 | D1 |
| --- | --- | --- | --- | --- |
| trips fed at target | 0.463 ± 0.004 | 0.569 (+23.6) | 0.549 (+19.1) | 0.551 (+19.6) |
| ground km, males | 2.68 ± 0.22 | 2.50 (-0.7) | 2.37 (-1.3) | 3.49 (+3.3) |
| ground km, nursing mothers | 2.58 ± 0.07 | 2.38 (-2.8) | 2.19 (-5.4) | 3.51 (+12.6) |
| ground km, juveniles 5–12 y | 2.95 ± 0.10 | 2.80 (-1.3) | 2.81 (-1.2) | 3.76 (+7.2) |
| climbing kcal/day, adults | 43.7 ± 2.4 | 42.9 (-0.3) | 44.4 (+0.2) | 70.4 (+9.7) |
| T-FOOD-4 | 9.09 ± 0.30 | 9.27 (+0.5) | 8.81 (-0.8) | 14.40 (+15.7) |
| T-ACT-2 | 0.112 ± 0.011 | 0.103 (-0.7) | 0.094 (-1.4) | 0.151 (+3.2) |
| T-RNG-4 | 2.06 ± 0.19 | 2.29 (+1.1) | 1.62 (-2.1) | 2.56 (+2.4) |
| reserves %/day, males | -0.000 ± 0.005 | -0.003 (-0.5) | 0.006 (+1.1) | 0.000 (+0.0) |
| reserves %/day, nursing mothers | -0.008 ± 0.009 | -0.009 (-0.1) | -0.010 (-0.3) | -0.034 (-2.6) |
| reserves %/day, juveniles | -0.017 ± 0.028 | 0.001 (+0.6) | -0.040 (-0.7) | -0.060 (-1.4) |
| reserves %/day, infants 0.5–2 y | -0.007 ± 0.013 | -0.001 (+0.4) | -0.023 (-1.0) | -0.047 (-2.7) |
| fitted (16 rows; z) | 1.84 | 1.68 (-0.2) | 1.87 (+0.0) | 2.33 (+0.6) |
| held-out (12 rows; z) | 6.64 | 4.71 (-0.8) | 5.22 (-0.6) | 4.96 (-0.7) |
| held-out w/o rare (11 rows; z) | 4.28 | 3.98 (-0.3) | 4.28 (-0.0) | 4.52 (+0.3) |
| prescriptions (JSON; current ledger S31 48) | 38 | 48 | 48 | 45 |
| viability (deaths; starvation) | 0, 0, 0, 0 | pass (0; 0) | pass (1; 0) | pass (0; 0) |

Each arm judged alone against the S31q group (judge_vs_reps.py; rows scored in the arm and all four group runs):
quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 12
  fitted             (17 rows) ref 1.77, 2.69, 1.84, 1.32 (mean 1.90, sd 0.57; used 0.69) | A1.json: 1.88, Δ -0.02, z -0.0 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | A1.json: 4.71, Δ -1.93, z -0.8 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | A1.json: 3.98, Δ -0.30, z -0.3 (inside noise)
   T-HUN-4   held-out ref 2.36±2.86 | A1.json 0.74 (fail)
quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 12
  fitted             (17 rows) ref 1.77, 2.69, 1.84, 1.32 (mean 1.90, sd 0.57; used 0.69) | A2.json: 2.38, Δ +0.47, z +0.6 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | A2.json: 5.22, Δ -1.42, z -0.6 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | A2.json: 4.28, Δ -0.00, z -0.0 (inside noise)
   T-COM-8   fitted   ref 0.00±0.00 | A2.json 0.15 (fail)
   T-HUN-4   held-out ref 2.36±2.86 | A2.json 0.95 (fail)
   T-IGE-1   fitted   ref 0.07±0.14 | A2.json 0.51 (inconclusive)
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.77, 2.42, 1.84, 1.32 (mean 1.84, sd 0.45; used 0.69) | D1.json: 2.33, Δ +0.49, z +0.6 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | D1.json: 4.96, Δ -1.69, z -0.7 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | D1.json: 4.52, Δ +0.24, z +0.3 (inside noise)
   T-COM-8   fitted   ref 0.00±0.00 | D1.json 0.16 (fail)
   T-HUN-1   fitted   ref 0.04±0.08 | D1.json 0.46 (inconclusive)
   T-HUN-4   held-out ref 2.36±2.86 | D1.json 0.44 (fail)
quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 12
  fitted             (17 rows) ref 1.77, 2.69, 1.84, 1.32 (mean 1.90, sd 0.57; used 0.69) | D0.json: 1.55, Δ -0.36, z -0.5 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | D0.json: 7.61, Δ +0.97, z +0.4 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | D0.json: 4.24, Δ -0.04, z -0.0 (inside noise)
   T-HUN-1   fitted   ref 0.04±0.08 | D0.json 0.76 (inconclusive)
   T-HUN-4   held-out ref 2.36±2.86 | D0.json 3.37 (fail)
   T-SOC-2   held-out ref 0.00±0.00 | D0.json 0.29 (fail)
```

## 7. Known defects in the code under test

Deferred (found by the diagnosis or the arms, not this stage's question; file:line at 973df1f):
- A caller option lasts 0.3 h after the call (src/sim/candidates.ts:578 and :594, `time - x.joinAt < 0.3`, a window after an
  event, not a counted quota): a caller trip still walking then is no longer on the list and ends at its next decision
  point ('ended', re-decided en route; A1: 11% of caller trips). With bit 2 the walk is longer (to the crown, not 25 m short
  of the call point), so more of them end this way.
- Crowns found empty because animals not feeding there at the animal's last sighting ate them (D2: others ate 1.2–1.5 × the
  crop lost, the seen feeders 15–17%) have no mechanism: a belief that expects later visitors would need each animal's own
  estimate of how often others come, a learned rate that E3g's iteration 1 showed collapses travel when it is applied to
  every trip. Recorded, not built.
- A joined trip or a caller's crown the follower never saw is valued at the unknown crop 0.2 (candidates.ts:606 and :645),
  not at the community list's expectation or chance for a listed crown: followers of a leader going to a listed crown
  inherit its emptiness (D4: 48% of joined trips to a goal the follower never saw arrive at an empty crown).
- Given-up departure attempts (2.5–3 per adult-day) are counted as trips by this stage's readout although they move ~1 m:
  they inflate trip counts and the unfed share, not the walking or the energy.
- trip-diagnose's sightings are the crowns in x.trees (the five best in view, at least 0.06 units) and the crown fed in;
  a crown in view outside that list whose belief perception updates (0.04–0.06 units) is not a sighting in the readout.

## 8. Stage verdict

- **Diagnosis (S31, quick, four realizations, simulation truth).** 46% of adults' trips feed at their target crown. Trips
  that arrive at an empty crown carry the largest share of the walking and energy spent on unfed trips (0.45 of 1.02 km and
  15 of 35 kcal per adult-day), and 99% of those crowns were empty when the trip began. The source is mostly the
  community's known-tree list: an animal's own finding that a listed crown is empty was deleted (a belief below 0.04 is
  dropped, a crown below 0.2 never remembered), so 64% of trips to listed crowns returned to one the same animal had reached
  empty; listed crowns feed 5.6% of their trips, and companions who follow leaders there inherit it. The brief's cause 1 is
  not supported: the companions seen feeding at a crown eat 15–17% of what it loses before the animal comes back (later
  visitors and the end of ripening take the rest). Cause 2 costs nothing on S31: departures nobody follows move about a
  metre, and departValue's trips alone feed better than other own trips. Cause 3 holds: caller trips stop 25 m short and
  are re-decided; 3.8% feed at the caller's crown.
- **Iteration 1, `tripBeliefs` 3** (bit 1: a listed crown the animal has seen is valued by what it saw, an empty one
  included, for `memTravelHorizonH`; bit 2: a caller trip heard in a crown goes to that crown and feeds there on arrival):
  **a provisional keep candidate as a correction.** Trips fed at their target 0.46 → 0.57 (z +23.6), known-tree trips 2.4 →
  0.9 per adult-day, callers fed at the crown 4% → 41%, unfed trips' walking 1.02 → 0.71 km per adult-day; viable, night
  safe (2.31%), every sum inside noise (fitted z −0.0, held-out −0.8, without the rare rows −0.3), every class's reserves
  within the group's spread, prescriptions 48 (no counted entry removed). Reported: nursing mothers walk 0.2 km less (z
  −2.8), the rest share falls to 0.40 (in band), intergroup encounters rise to 13.4 a community-year (z +2.0).
- **Iteration 2, `tripBeliefs` 7** (adds bit 4: a listed crown not seen is valued at the expected bout of a crown in fruit
  with the list's own chance, expected gain over expected time): qualifies by the registered rule but is not the best arm
  (fed share 0.549 against A1's 0.569; juveniles' reserves 0.041 %/day below A1's): trips to listed crowns vanish and are
  replaced by trips on stale sightings that fail as often. Bit 4 recorded, off.
- **Diagnostic (A1 + `redecideValue` 2):** re-deciding still adds about 1 km a day to every class (on S31 1.2–1.4) and the
  same climbing; the corrections remove the futile part of its cost (about a third of the males' and other females' extra
  walking; mothers' and young infants' energy cost halves), not the cost itself.
- **What it means.** Trips failed mostly because the animals were sent back to crowns they had already found empty, a
  defect of the community list's design, not a missing expectation of companions' eating. With it corrected trips feed
  more often and walk less. What still empties the crowns trips aim for is animals the traveller did not see there, and
  the end of ripening.
- **Open (the biggest problem).** Re-deciding's cost stays: the keep test turns the valuation's preference for trips over
  staying into a trip at every bout end, and about 40% of trips still fail (mostly crowns emptied since the sighting by
  animals not seen there). A belief that expects others' visits would need each animal's own estimate of how often crowns
  are visited, a learned rate, which E3g showed collapses travel when applied to every trip; whether the crown's value
  should carry a cost of the time it takes others to find it is the next question.

## 9. Merge and final checks

`track-e` merged once (9af23ec: E5g's `callGaps`, S34–S37 notes) before the final test run; `src/sim/params.gen.ts` taken
from this branch and regenerated. `gen-params --check` clean, `tsc --noEmit` clean, `pnpm test` 853 tests: 852 pass, 0 fail,
1 skipped; `git ls-files data/raw node_modules` empty. Prescriptions on the merged ledger (`prescription-ledger --count`):
S31 48, S31 + `tripBeliefs` 3 48, S31 + `tripBeliefs` 7 48 (no counted entry removed, as registered). Outputs (local,
gitignored, copied from the session scratch `e3h/`): `artifacts/validation/e3h/` holds `diag/` (the four diagnosis runs, raw
trips gzipped, `diag_table.md`, `known_split.md`), `arms/` (A1, A2, D0, D1: e-bench, energy, trip and rhythm JSON, logs and
tables), `tools/` (`diag_table.py`, `known_split.py`, `final_table.py`, `redecide_cost.py`, `report_table.py`), `params/`,
`smoke/`.

