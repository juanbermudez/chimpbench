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

**Diagnostic arm (registered now; not a candidate, run after the iterations):** the best arm + `redecideValue` 2 (brief:
whether re-deciding's walking cost falls once trips find food), with its comparison on this mode and base, S31 +
`redecideValue` 2; both with e-bench `--quick`, energy-diagnose and trip-diagnose, same settings. Read: adults' ground km,
climbing, trips per adult-day and fed share of (best + redecide) − best against (S31 + redecide) − S31.

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
