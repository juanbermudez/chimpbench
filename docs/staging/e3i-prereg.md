# E3i pre-registration: trips to crowns others emptied

Status: complete (5 October 2026): diagnosis on four realizations of S39 (§2.2, amendment §2.3); one iteration, `callTrip` 1
recorded, off (§6.1); diagnostic arms with `redecideValue` 2 (§6.2). Skeleton committed at the start of the stage (branch
`e3i-unseen-eaters`, from `track-e` b6946ac), before any run and before any code change. Track E, stage E3i. Rule served: field values of behaviour are targets to benchmark against, never
inputs. No value, bonus or weight is added to hit a travel share, a day range or a feeding-tree count.

## 0. The problem

On S39 (42 prescriptions; S37 + E3h's `tripBeliefs` 3; e-stack2-confirm.md "S39 results") trips fed at their target rose
from 46% to 57% (E3h, measured on S31), but about 40% still fail. E3h's diagnosis (e3h-prereg.md §2.1, D2) found that the
crowns trips find empty were mostly empty before the trip began (99%), and that between the traveller's last sighting and its
arrival the animals it saw feeding there ate 15–17% of the loss while animals it did not see there ate 1.2–1.5 × the loss
(the phenology's fall about as much again; the deficit's recovery absorbs the rest). A remembered crown's belief is the crop
last seen (`x.treeCrop`, perception.ts), decaying only when the animal sees the crown again. Re-deciding (`redecideValue` 2,
off the stack) still adds about 1 km a day per class on top of `tripBeliefs` 3 (E3h's D1), with nursing mothers' and
juveniles' reserves falling faster; the failed trips are what makes it costly.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S39 in quick mode (seeds 48 and 7, burn-in 30, 30 days), simulation
   truth: failed trips by cause; for crowns emptied since the sighting, by whom, how long after the sighting, and whether the
   traveller could have known (calls or food grunts heard from the crown, parties seen heading there, the crown's size, how
   many community members were near it); the believed crop against the crop on arrival by the hours since the sighting; the
   walking and climbing these trips cost. Name what an animal could know and does not use, with numbers.
2. **Mechanism** behind a new switch (0 = today), from first principles, only for what the diagnosis implicates. Every input
   sourced or tagged design; no weight chosen to hit a rate; E3h's A2 (juveniles' reserve cost) checked against.
3. At most three iterations, each logged here and committed before its run; arms = S39 + the switch, quick mode, judged
   against the integrator's four S39 quick realizations (e-noise.md amendment 2; rare rows per amendment 3). Then one
   diagnostic arm (not a candidate): the best arm + `redecideValue` 2.

## 2. Diagnosis (step 1; registered 5 October 2026 before its runs)

**What the code does (read at b6946ac, field profile, S39's switches).** Perception runs only at an animal's decision points
(decide.ts). A remembered crown's crop belief `x.treeCrop` is written when the animal sees the crown (perception.ts: crowns
within 35 m, the crop seen, rounded) or leaves it after feeding (execution.ts), and with E3h bit 1 also for a crown on the
community's list it sees, an empty one included (`x.ls`, kept 240 h). Nothing else moves a belief: the crop of a crown out
of sight is the crop last seen until the animal sees it again. What an animal perceives of others' feeding elsewhere:
- *Sight* (35 m by day, at its decision points): the animals in view (`x.seen`, the nearest `attentionN`), with their act
  and target (who is feeding in a crown in view, who is walking to a crown).
- *Pant-hoots* (heard to 1,000 m; events.ts pushes them to listeners): an own-community call sets `x.joinCall`, the caller,
  its position and, under `socialTiming` bit 4, the crown the caller feeds in (`x.jt`); one slot, overwritten by the next
  call. Used only for the caller trip offer (candidates.ts), never for the belief about that crown.
- *Travel hoos* (`hearTravelHooM`): a companion setting off (the destination is not conveyed).
- *Food grunts* are given (`hearFoodGruntM` 50 m) but events.ts pushes no food grunt to any listener: nobody hears them.

**Tool.** `scripts/trip-diagnose.ts` (E3h's; reads only), with "Stage E3i readouts" added to its header, where each is
defined; every E3h readout is unchanged (a smoke run with and without the additions gives the same E3h summary). In short:
eating bouts per crown and the eating event that took a crown below 0.06 units; for each trip with a sighting of its crown
before the start, the crop at the start had nobody eaten there after the sighting (the lazy crop model's own identity:
`cropTarget(t) − (cropTarget(ts) − crop(ts)) · exp(−k (t − ts) / 24)`), so an empty arrival splits into *emptied by eating
since the sighting* and *ripening ended since the sighting*; the fruit eaten there in (ts, t0] by each eater, classed by
what the traveller could have known of that eater at its own decision points in (ts, t0] (saw it feeding there, saw it
heading there, heard its pant-hoot from that crown, heard its travel hoo toward it; a food grunt given there within 50 m,
which the model gives but no one hears; E3h's feeders seen at the sighting; a companion in view at the sighting; own
community, none; other community); own-community animals near the crown at the sighting; the crown's capacity; the belief
against the crop at the start and on arrival by hours since the sighting; a joined trip's leader's sighting; whether a
trip's own option was still on the list when it closed, and a caller trip's hours since the call; per community and day
the fruit its members ate and the ripe crop in its range (the inputs of a prior on others' eating).

**Smoke test (disclosed; seed 48, S39q's parameters, burn-in 2 + 2 days; sightings before the tracking start count as none;
not representative, not used below).** Every readout fills. Trips fed at their target 0.62. Unfed trips by count:
departures given up 50% (no walking), re-decided en route 16% (38% of unfed trips' walking), arrived with crop left 13%
(19%), list crowns not seen 7% (17%), caller stopped short 6% (16%); **trips arriving at a crown emptied by eating since
the traveller's sighting: 5 trips, 1.5% of unfed trips and 1.1% of their walking.** Caller trips re-decided en route mostly
'ended' with their option off the list before the call's 0.3 h ran out (another call overwrote `x.joinCall`); arrivals with
crop left mostly chose another own trip with the crown in view and its forage option on the list.

**Runs.** The tool on S39q's parameters (`bench-run2/…/e/s39q/S39q-params.json`) and on its three re-draws (the same plus
`rngSalt` 1, 2, 3, the integrator's convention), seeds 48 and 7, burn-in 30, 30 days, field profile, `--workers` 2 (1
above load 8; none above 30), from a frozen detached checkout of the commit that registers this section. **Identity:**
adult males' eating minutes and ground km against the integrator's `S39q*-energy.json` of the same world, when they exist.

**Reading rules (registered).** Adults, daylight starts, simulation truth; means over the four realizations (SD beside).
- *D1, the brief's premise* ("about 40% of trips fail, at crowns emptied since the sighting by animals the traveller never
  saw there"). **Supported** if trips arriving at a crown emptied by eating since the traveller's sighting are ≥ 1/2 of
  unfed trips or carry ≥ 1/2 of unfed trips' walking (km per adult-day); otherwise **not supported**, and the unfed class
  with the largest share of unfed walking is named (its trips, km and climbing kcal per adult-day, its share), with the
  class with the most unfed trips beside it.
- *D2, what the traveller could know* (trips arriving at crowns emptied by eating since its sighting): the share of the
  fruit eaten there in (ts, t0] by eaters it had evidence of that the model delivers (saw feeding, saw heading, heard
  pant-hoot, heard travel hoo). **Evidence implicated** if ≥ 1/2; otherwise **a prior implicated** (the eaters were
  animals it had no percept of). The food-grunt share (given, not heard) is reported separately.
- *D3, the belief's age.* By hours since the sighting: fed share, the share arriving at a crown emptied by eating, the
  median belief error b − c0. Named: the youngest bin whose emptied-by-eating share exceeds 1/4 (or none).
- *D4, a prior's inputs.* Per community: λ = fruit units its members eat a day ÷ the ripe crop in its range (truth).
  Reported beside the realized mean loss (cs − c0) ÷ cs of trips with a sighting by hours bin (the form of a
  proportional-consumption prior, checked, not fitted).
- *D5, the term if D1 is not supported.* For the named class (and any class with ≥ 1/4 of unfed walking): its kinds and
  why it fails (re-decided en route: the trigger and whether the trip's own option was still on the list, a caller trip's
  hours since its call; arrived with crop left: crown in view, forage option on the list, the next act; list crowns: first
  visits), with its trips, km and climbing per adult-day.
- The mechanism (step 2) addresses only a term these name with ≥ 1/4 of unfed trips' walking; a class below that gets no
  mechanism. If D1 holds, D2 decides between an evidence-based belief and a prior.

### 2.2 Diagnosis results (frozen checkout acd7d4f, clean; S39q and its re-draws S39q1–S39q3 by `rngSalt` 1, 2, 3; seeds 48 and 7, 30 + 30 days; simulation truth; printed by the stage's `diag_table.py` from the tool's JSON and raw trips, session scratch `e3i/diag/`)

**Identity:** in all four worlds the tool's adult males' eating minutes and ground km equal the integrator's energy-diagnose
of the same world to the last digit printed. S39q2's one death is an infanticide by an East community male (none from
starvation in any run).

```
Identity (adult males: eating min, ground km), trip-diagnose vs energy-diagnose of the same world:
  S39q: 228.032 / 2.437 vs 228.032 / 2.437; living [(49, 49, {}), (49, 49, {})]
  S39q1: 229.33 / 2.802 vs 229.330 / 2.802; living [(49, 49, {}), (49, 49, {})]
  S39q2: 226.669 / 2.492 vs 226.669 / 2.492; living [(49, 48, {'infanticide by Chiriku (East community)': 1}), (49, 49, {})]
  S39q3: 227.419 / 2.544 vs 227.419 / 2.544; living [(49, 49, {}), (49, 49, {})]

| Trips (adults, daylight starts) | per adult-day | fed at target | km per trip |
| --- | --- | --- | --- |
| remembered crown | 1.922 ± 0.027 | 0.738 ± 0.012 | 0.226 ± 0.005 |
| departure | 4.998 ± 0.058 | 0.321 ± 0.009 | 0.069 ± 0.003 |
| crown in view | 1.373 ± 0.067 | 0.982 ± 0.003 | 0.017 ± 0.001 |
| a companion's trip | 3.596 ± 0.120 | 0.714 ± 0.016 | 0.139 ± 0.005 |
| a caller | 1.409 ± 0.111 | 0.322 ± 0.004 | 0.327 ± 0.011 |
| all | 13.30 ± 0.32 | 0.556 ± 0.009 | 0.132 ± 0.004 |
trips: km per adult-day 1.760 ± 0.094; unfed 0.737 ± 0.055; kcal unfed 25.8 ± 2.0

| Unfed trips by E3i class | per adult-day | share of unfed | km per adult-day | share of unfed km | walk kcal per adult-day | climb kcal per adult-day |
| --- | --- | --- | --- | --- | --- | --- |
| re-decided en route | 0.776 ± 0.065 | 0.131 ± 0.007 | 0.216 ± 0.026 | 0.293 ± 0.023 | 6.76 ± 0.81 | 0.21 ± 0.04 |
| caller stopped short | 0.390 ± 0.038 | 0.066 ± 0.004 | 0.121 ± 0.012 | 0.164 ± 0.007 | 3.89 ± 0.38 | 0.07 ± 0.03 |
| arrived, crop left | 0.645 ± 0.021 | 0.109 ± 0.002 | 0.119 ± 0.008 | 0.161 ± 0.003 | 3.83 ± 0.24 | 0.38 ± 0.04 |
| arrived empty: no sighting, the list | 0.337 ± 0.028 | 0.057 ± 0.004 | 0.113 ± 0.011 | 0.154 ± 0.013 | 3.66 ± 0.34 | 0.00 ± 0.00 |
| caller, no crown | 0.166 ± 0.006 | 0.028 ± 0.001 | 0.052 ± 0.003 | 0.071 ± 0.008 | 1.70 ± 0.07 | 0.03 ± 0.01 |
| arrived empty: emptied by eating since the sighting | 0.484 ± 0.048 | 0.082 ± 0.005 | 0.050 ± 0.006 | 0.067 ± 0.005 | 1.60 ± 0.20 | 0.01 ± 0.00 |
| arrived empty: no sighting, a companion's goal | 0.133 ± 0.025 | 0.022 ± 0.003 | 0.033 ± 0.006 | 0.045 ± 0.006 | 1.07 ± 0.19 | 0.00 ± 0.00 |
| arrived empty: ripening ended since the sighting | 0.202 ± 0.024 | 0.034 ± 0.003 | 0.028 ± 0.004 | 0.038 ± 0.004 | 0.89 ± 0.12 | 0.00 ± 0.00 |
| arrived empty: emptied during the trip | 0.024 ± 0.007 | 0.004 ± 0.001 | 0.003 ± 0.001 | 0.004 ± 0.002 | 0.10 ± 0.04 | 0.01 ± 0.00 |
| departure given up | 2.748 ± 0.025 | 0.466 ± 0.015 | 0.002 ± 0.001 | 0.003 ± 0.000 | 0.08 ± 0.01 | 0.05 ± 0.01 |
| arrived empty: no sighting, other | 0.001 ± 0.001 | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.00 ± 0.00 | 0.00 ± 0.00 |

D1: emptied by eating since the sighting: share of unfed trips 0.082 ± 0.005, share of unfed km 0.067 ± 0.005 -> NOT SUPPORTED
  largest share of unfed walking: re-decided en route; most unfed trips: departure given up

emptiedByEating: n [832, 1030, 862, 880]; per adult-day 0.484 ± 0.048
  cropAtSightingMedian: 0.100 ± 0.007
  maxFruitMedian: 0.607 ± 0.021
  cNone0Median: 0.149 ± 0.018
  near100Mean: 6.329 ± 0.810
  near300Mean: 10.114 ± 0.542
  near1000Mean: 13.828 ± 0.297
  eatenOthersPerTrip: 0.253 ± 0.034
  eatersMean: 5.087 ± 0.211
  ownEatersMean: 5.087 ± 0.211
  evidenceAny: 0.952 ± 0.007
  evidencePantHoot: 0.565 ± 0.042
  evidenceSawHeading: 0.842 ± 0.017
  evidenceSawFeeding: 0.285 ± 0.024
  evidenceTravelHoo: 0.595 ± 0.039
  evidenceFoodGrunt50m: 0.279 ± 0.027
  withEmptier: 0.974 ± 0.012
  hSightToEmptied: 2.188 ± 0.344
  hEmptiedToStart: 0.816 ± 0.070
  kmPerAdultDay: 0.050 ± 0.006
  walkKcalPerAdultDay: 1.604 ± 0.205
  climbKcalPerAdultDay: 0.008 ± 0.003
  kmPerAdultDayWithEvidence: 0.046 ± 0.006
  kmPerAdultDayNoEvidence: 0.004 ± 0.001
  hours sighting->start (q25, median, q75): [[1.271, 2.8, 8.583], [1.317, 3.021, 15.721], [1.629, 4.063, 24.737], [1.421, 3.471, 17.829]]
  by kind: [{'joined': 0.555, 'own, seen': 0.368, 'own, left': 0.071, 'caller': 0.006}, {'joined': 0.531, 'own, seen': 0.383, 'own, left': 0.083, 'caller': 0.003}, {'joined': 0.541, 'own, seen': 0.401, 'own, left': 0.057, 'caller': 0.001}, {'joined': 0.564, 'own, seen': 0.353, 'own, left': 0.081, 'caller': 0.002}]
  share of fruit eaten in (ts, t0] by evidence class: companion at the sighting 0.095 ± 0.007; food grunt <= 50 m 0.025 ± 0.004; heard pant-hoot 0.178 ± 0.010; heard travel hoo 0.003 ± 0.002; other community 0.000 ± 0.000; own community, none 0.288 ± 0.015; saw feeding 0.059 ± 0.005; saw heading 0.299 ± 0.025; seen feeding at the sighting 0.051 ± 0.005
  the emptier (eater that took it below 0.06) by class: companion at the sighting 0.108 ± 0.019; food grunt <= 50 m 0.055 ± 0.014; heard pant-hoot 0.155 ± 0.017; heard travel hoo 0.004 ± 0.005; own community, none 0.213 ± 0.022; saw feeding 0.151 ± 0.036; saw heading 0.239 ± 0.033; seen feeding at the sighting 0.074 ± 0.007

fedWithSighting: n [10103, 9962, 9988, 10457]; per adult-day 5.445 ± 0.123
  cropAtSightingMedian: 0.298 ± 0.017
  maxFruitMedian: 0.657 ± 0.010
  cNone0Median: 0.411 ± 0.013
  near100Mean: 3.508 ± 0.163
  near300Mean: 6.572 ± 0.317
  near1000Mean: 11.014 ± 0.402
  eatenOthersPerTrip: 0.163 ± 0.005
  eatersMean: 2.513 ± 0.061
  ownEatersMean: 2.513 ± 0.061
  evidenceAny: 0.629 ± 0.011
  evidencePantHoot: 0.233 ± 0.009
  evidenceSawHeading: 0.552 ± 0.012
  evidenceSawFeeding: 0.072 ± 0.003
  evidenceTravelHoo: 0.320 ± 0.009
  evidenceFoodGrunt50m: 0.092 ± 0.004
  withEmptier: 0.168 ± 0.013
  hSightToEmptied: 5.636 ± 0.825
  hEmptiedToStart: 23.227 ± 1.352
  kmPerAdultDay: 0.860 ± 0.028
  walkKcalPerAdultDay: 28.064 ± 0.845
  climbKcalPerAdultDay: 24.395 ± 0.574
  kmPerAdultDayWithEvidence: 0.537 ± 0.020
  kmPerAdultDayNoEvidence: 0.323 ± 0.012
  hours sighting->start (q25, median, q75): [[0.954, 4.417, 31.275], [0.938, 4.821, 38.325], [1.067, 5.171, 31.188], [0.954, 4.442, 29.533]]
  by kind: [{'own, seen': 0.468, 'joined': 0.402, 'own, left': 0.065, 'caller': 0.064, 'own, known': 0.001}, {'own, seen': 0.475, 'joined': 0.388, 'caller': 0.07, 'own, left': 0.067, 'own, known': 0.001}, {'own, seen': 0.484, 'joined': 0.398, 'own, left': 0.06, 'caller': 0.058, 'own, known': 0}, {'own, seen': 0.468, 'joined': 0.405, 'caller': 0.065, 'own, left': 0.061, 'own, known': 0.001}]
  share of fruit eaten in (ts, t0] by evidence class: companion at the sighting 0.103 ± 0.003; food grunt <= 50 m 0.018 ± 0.002; heard pant-hoot 0.146 ± 0.008; heard travel hoo 0.004 ± 0.001; other community 0.000 ± 0.000; own community, none 0.376 ± 0.012; saw feeding 0.033 ± 0.001; saw heading 0.279 ± 0.011; seen feeding at the sighting 0.041 ± 0.002
  the emptier (eater that took it below 0.06) by class: companion at the sighting 0.112 ± 0.004; food grunt <= 50 m 0.028 ± 0.004; heard pant-hoot 0.184 ± 0.016; heard travel hoo 0.003 ± 0.001; own community, none 0.288 ± 0.025; saw feeding 0.108 ± 0.007; saw heading 0.217 ± 0.022; seen feeding at the sighting 0.059 ± 0.008

D2: share of the fruit eaten by eaters with delivered evidence (saw feeding/heading, heard pant-hoot/travel hoo): 0.541 ± 0.019 -> EVIDENCE implicated; food grunt <= 50 m 0.025 ± 0.004

| hours since the sighting | trips per adult-day | fed at target | emptied by eating | ripening ended (no-eat crop < 0.06) | median b | median c0 | median b - c0 (trips) | others ate (units) | evidence any |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0-1 | 2.218 ± 0.144 | 0.625 ± 0.012 | 0.065 ± 0.008 | 0.037 ± 0.006 | 0.270 ± 0.019 | 0.262 ± 0.019 | -0.000 ± 0.000 | 0.014 ± 0.001 | 0.484 ± 0.019 |
| 1-3 | 1.909 ± 0.052 | 0.531 ± 0.013 | 0.132 ± 0.019 | 0.013 ± 0.002 | 0.271 ± 0.015 | 0.243 ± 0.016 | -0.000 ± 0.000 | 0.046 ± 0.001 | 0.598 ± 0.007 |
| 3-6 | 0.972 ± 0.035 | 0.477 ± 0.006 | 0.171 ± 0.008 | 0.007 ± 0.001 | 0.274 ± 0.018 | 0.222 ± 0.017 | 0.007 ± 0.006 | 0.089 ± 0.006 | 0.692 ± 0.003 |
| 6-12 | 0.477 ± 0.012 | 0.454 ± 0.016 | 0.161 ± 0.014 | 0.006 ± 0.003 | 0.282 ± 0.026 | 0.220 ± 0.035 | 0.015 ± 0.011 | 0.135 ± 0.009 | 0.709 ± 0.030 |
| 12-24 | 1.261 ± 0.043 | 0.588 ± 0.018 | 0.041 ± 0.007 | 0.005 ± 0.003 | 0.277 ± 0.014 | 0.333 ± 0.016 | -0.050 ± 0.004 | 0.113 ± 0.007 | 0.678 ± 0.016 |
| 24-48 | 1.048 ± 0.045 | 0.537 ± 0.013 | 0.065 ± 0.020 | 0.014 ± 0.005 | 0.271 ± 0.025 | 0.335 ± 0.026 | -0.041 ± 0.009 | 0.223 ± 0.009 | 0.736 ± 0.021 |
| 48-96 | 0.956 ± 0.036 | 0.524 ± 0.011 | 0.065 ± 0.008 | 0.039 ± 0.008 | 0.247 ± 0.015 | 0.365 ± 0.016 | -0.067 ± 0.008 | 0.366 ± 0.010 | 0.769 ± 0.009 |
| 96-241 | 0.992 ± 0.037 | 0.481 ± 0.011 | 0.068 ± 0.009 | 0.116 ± 0.018 | 0.231 ± 0.008 | 0.357 ± 0.029 | -0.049 ± 0.014 | 0.624 ± 0.031 | 0.790 ± 0.019 |
D3: youngest bin with emptied-by-eating share > 1/4 per realization: [None, None, None, None]

D4: community stock (mean over days): members, fruit units eaten a day, ripe crowns in range, ripe crop in range, list expectation, lambda = eaten / stock per day
  community 1: members 22.0 ± 0.1; F 6.56 ± 0.06; crowns 636 ± 17; S 328.6 ± 9.0; list 378.3 ± 11.2; lambda/day 0.0200 ± 0.0008
  community 2: members 15.2 ± 0.2; F 4.46 ± 0.07; crowns 689 ± 15; S 358.5 ± 7.8; list 407.1 ± 10.0; lambda/day 0.0123 ± 0.0005
  community 3: members 11.8 ± 0.3; F 3.51 ± 0.09; crowns 610 ± 46; S 314.0 ± 24.1; list 362.4 ± 26.2; lambda/day 0.0112 ± 0.0010
  realized mean loss (cs - c0)/cs of trips with a sighting by hours bin, against 1 - exp(-lambda * days) at the mean lambda:
    0-1 h: realized 0.046 ± 0.005; prior 1 - exp(-lambda d) at the bin's middle 0.000 (lambda 0.0145/day)
    1-3 h: realized 0.099 ± 0.007; prior 1 - exp(-lambda d) at the bin's middle 0.001 (lambda 0.0145/day)
    3-6 h: realized 0.128 ± 0.027; prior 1 - exp(-lambda d) at the bin's middle 0.003 (lambda 0.0145/day)
    6-12 h: realized 0.138 ± 0.025; prior 1 - exp(-lambda d) at the bin's middle 0.005 (lambda 0.0145/day)
    12-24 h: realized -0.623 ± 0.061; prior 1 - exp(-lambda d) at the bin's middle 0.011 (lambda 0.0145/day)
    24-48 h: realized -0.807 ± 0.029; prior 1 - exp(-lambda d) at the bin's middle 0.022 (lambda 0.0145/day)
    48-96 h: realized -1.416 ± 0.237; prior 1 - exp(-lambda d) at the bin's middle 0.043 (lambda 0.0145/day)
    96-241 h: realized -1.863 ± 0.295; prior 1 - exp(-lambda d) at the bin's middle 0.097 (lambda 0.0145/day)

D5 details (per adult-day; mean over realizations):
  re-decided en route by (kind, trigger, own option still on the list): trips | km
    ('caller', 'interrupt', 0): 0.172 | 0.048
    ('joined', 'interrupt', 0): 0.137 | 0.020
    ('own', 'interrupt', 1): 0.131 | 0.003
    ('caller', 'ended', 0): 0.125 | 0.082
    ('own', 'interrupt', 0): 0.071 | 0.012
    ('joined', 'interrupt', 1): 0.042 | 0.005
    ('caller', 'need-bucket', 0): 0.038 | 0.024
    ('caller', 'period', 0): 0.013 | 0.008
    ('caller', 'interrupt', 1): 0.013 | 0.001
    ('view', 'interrupt', 1): 0.011 | 0.000
    ('joined', 'ended', 0): 0.005 | 0.000
    ('caller', 'max-age', 0): 0.005 | 0.002
    ('own', 'ended', 0): 0.003 | 0.001
    ('caller', 'patrol', 0): 0.003 | 0.002
  caller trips re-decided en route: hours since the call at the close, quartiles 0.04 / 0.12 / 0.27; share past 0.3 h 0.219; own option off the list 0.963
  arrived, crop left by (kind, trigger, crown in view, forage option on the list, next act): trips
    ('own', 'need-bucket', 1, 1, 'trip-own'): 0.086
    ('joined', 'interrupt', 1, 1, 'trip-joined'): 0.054
    ('joined', 'need-bucket', 1, 1, 'trip-own'): 0.053
    ('own', 'period', 1, 1, 'trip-own'): 0.022
    ('own', 'interrupt', 1, 1, 'trip-joined'): 0.019
    ('joined', 'interrupt', 1, 1, 'pant-grunt'): 0.015
    ('own', 'need-bucket', 1, 1, 'feed-crown'): 0.014
    ('own', 'patrol', 1, 1, 'pant-grunt'): 0.013
    ('own', 'need-bucket', 1, 1, 'trip-caller'): 0.012
    ('joined', 'need-bucket', 1, 1, 'trip-caller'): 0.012
    ('own', 'patrol', 1, 1, 'display'): 0.010
    ('caller', 'interrupt', 1, 1, 'pant-grunt'): 0.010
  caller stopped short / no crown by (cause, next act, crown in view, c1 >= 0.06): trips | km
    ('caller, no crown', 'rest', -1, False): 0.064 | 0.024
    ('caller stopped short', 'pant-grunt', 0, False): 0.048 | 0.012
    ('caller stopped short', 'pant-grunt', 1, True): 0.048 | 0.014
    ('caller stopped short', 'trip-own', 0, False): 0.045 | 0.012
    ('caller stopped short', 'trip-own', 1, True): 0.044 | 0.015
    ('caller, no crown', 'trip-own', -1, False): 0.030 | 0.008
    ('caller stopped short', 'trip-own', 0, True): 0.020 | 0.007
    ('caller, no crown', 'display', -1, False): 0.020 | 0.005
    ('caller stopped short', 'rest', 0, False): 0.017 | 0.006
    ('caller stopped short', 'rest', 1, True): 0.015 | 0.007
  arrived empty with no sighting by (kind, src): trips | km
    ('own', 'known'): 0.337 | 0.113
    ('joined', 'unseen'): 0.131 | 0.033
    ('joined', 'belief'): 0.003 | 0.001
    ('caller', 'unseen'): 0.001 | 0.000
    ('own', 'belief'): 0.000 | 0.000
  joined trips arriving empty: n [928, 1085, 862, 922]; with the leader's sighting 0.712 ± 0.008; emptied by eating since it 0.769 ± 0.029; with own sighting 0.740 ± 0.030

Unfed walking by kind (km per adult-day; share of unfed km) and its classes:
  caller: 0.346 ± 0.026 (0.470 ± 0.004)
      re-decided en route: 0.167 ± 0.018
      caller stopped short: 0.121 ± 0.012
      caller, no crown: 0.052 ± 0.003
      arrived, crop left: 0.006 ± 0.002
      arrived empty: emptied by eating since the sighting: 0.000 ± 0.000
      arrived empty: emptied during the trip: 0.000 ± 0.000
      arrived empty: no sighting: 0.000 ± 0.000
      arrived empty: ripening ended since the sighting: 0.000 ± 0.000
  joined: 0.147 ± 0.014 (0.199 ± 0.004)
      arrived, crop left: 0.052 ± 0.004
      arrived empty: no sighting: 0.033 ± 0.006
      re-decided en route: 0.027 ± 0.006
      arrived empty: emptied by eating since the sighting: 0.023 ± 0.003
      arrived empty: ripening ended since the sighting: 0.010 ± 0.002
      arrived empty: emptied during the trip: 0.001 ± 0.001
  remembered crown: 0.145 ± 0.009 (0.197 ± 0.009)
      arrived empty: no sighting: 0.089 ± 0.008
      arrived, crop left: 0.030 ± 0.002
      arrived empty: ripening ended since the sighting: 0.011 ± 0.002
      arrived empty: emptied by eating since the sighting: 0.009 ± 0.002
      re-decided en route: 0.005 ± 0.003
      arrived empty: emptied during the trip: 0.000 ± 0.000
  departure: 0.098 ± 0.010 (0.133 ± 0.006)
      arrived, crop left: 0.030 ± 0.004
      arrived empty: no sighting: 0.025 ± 0.003
      arrived empty: emptied by eating since the sighting: 0.017 ± 0.002
      re-decided en route: 0.016 ± 0.004
      arrived empty: ripening ended since the sighting: 0.007 ± 0.001
      departure given up: 0.002 ± 0.000
      arrived empty: emptied during the trip: 0.001 ± 0.001
  view: 0.000 ± 0.000 (0.000 ± 0.000)
      arrived, crop left: 0.000 ± 0.000
      re-decided en route: 0.000 ± 0.000
```

**Reading by the registered rules.**
- **D1, the brief's premise: not supported.** Trips that arrive at a crown emptied by eating since the traveller's
  sighting are 0.48 ± 0.05 per adult-day, 8.2 ± 0.5% of unfed trips and 6.7 ± 0.5% of unfed trips' walking (0.050 of
  0.737 km per adult-day). Trips fed at their target are 0.556 ± 0.009; of the 44% that do not, nearly half are
  departures nobody followed (2.75 per adult-day, 47% of unfed trips) that move about 2 m each. **The class with the largest
  share of unfed walking is re-decided en route** (0.78 ± 0.07 trips and 0.216 ± 0.026 km per adult-day, 29 ± 2% of unfed
  walking, 6.8 kcal of walking and 0.2 kcal of climbing per adult-day); the most numerous is departures given up.
- **D2 (reported, D1 not supported):** for the trips that do arrive at a crown emptied by eating since the sighting, 54 ±
  2% of the fruit eaten there between the sighting and the start was eaten by animals the traveller saw heading there
  (30%), heard pant-hoot from it (18%) or saw feeding there (6%); 95% of these trips had some such percept; food grunts
  given there within 50 m (which nobody hears) 2.5%. By the rule, evidence would be implicated; the class is small.
- **D3: no age.** The emptied-by-eating share peaks at 3–12 h after the sighting (16–17% of those trips) and is never above
  1/4; the belief is unbiased for sightings under 12 h (median b − c0 0.000–0.015 units) and too low after (−0.04 to −0.07:
  crowns keep ripening).
- **D4: a proportional prior predicts almost nothing.** A community eats 1.1–2.0% of its range's ripe crop a day (λ 0.011–
  0.020), so a proportional-consumption prior predicts a 0.3–0.5% loss within 6 h, while the crowns trips go to lose
  5–14% of their crop within 12 h: consumption concentrates where animals are (the crowns trips go to are the ones others
  go to), and after 12 h ripening outweighs it. A prior from community size, known crowns and intake rates would not have
  the right magnitude without a fitted concentration.
- **D5, the named class.** Caller trips carry 0.167 ± 0.018 of re-decided en route's 0.216 km (77%); 96% of the caller
  trips re-decided en route had their own option off the list when they closed (the hours since the latest call at the
  close: quartiles 0.04 / 0.12 / 0.27 h; 22% past 0.3 h). Own trips re-decided en route mostly kept their option (an
  interrupt and a draw; 0.003 km); joined trips lost theirs (the leader's departure no longer offered; 0.020 km). Caller
  trips altogether carry **47% of unfed walking** (0.346 ± 0.026 km per adult-day: re-decided en route 0.167, stopped short
  at the caller's crown 0.121 (the crown below 0.06 on arrival in ~40%, already at the start in ~26%; otherwise a greeting
  or another trip chosen), calls not given in a crown 0.052). Other classes: arrived with crop left 16% of unfed walking
  (closed by a need-bucket, interrupt or period trigger at the crown's foot, then another trip drawn), list crowns not
  seen 15%, crowns whose ripening ended since the sighting 4%, a companion's goal never seen 5%.

**What this says.** The ~44% of trips that do not feed at their target are not mostly trips to crowns others emptied.
Half are departures nobody answered, which cost nothing. Of the walking they cost, the largest share is trips to callers
that end on the way (amendment 1, §2.3, names why).

### 2.1 Amendment 1 (registered after reading the four realizations' registered readouts, §2.2, before the readouts it adds ran)

By D1 the named term is *re-decided en route* (29% of unfed walking), and 77% of its walking is caller trips whose own
option was off the list when they closed (96% of them). Three code paths take a caller trip's option off the list while it
walks: the listener's one call slot (`x.joinCall`, `x.jt`) is overwritten by any later own-community pant-hoot heard (the
walk then follows the new crown, perception.ts `hear`, execution.ts); the call is offered only for 0.3 h after it
(candidates.ts); and only beyond `joinCallMinM` (50 m) of the call point. To name which, four readouts are added to the
tool (header, "amendment 1"; the registered readouts are unchanged, checked on a 2-day smoke): at a caller trip's close,
whether its call is still the one in the slot, the hours since its own call, the metres to its call point, whether the
slot's crown is still its crown. **Reading (registered):** the caller trips re-decided en route are split into *overwritten
by a later call* (slot changed), *0.3 h passed* (same call, ≥ 0.3 h), *within 50 m of the call point* (same call), *other*;
the split with the largest share of their walking names the code path. **Runs:** the amended tool on the four
realizations (same settings), from a frozen checkout of the commit that registers this amendment.

### 2.3 Amendment 1 results (frozen checkout a6648b6, clean; the same four worlds; printed by the stage's `amend_table.py` from the raw trips, session scratch `e3i/diag2/`)

```
Caller trips re-decided en route (4 realizations; per adult-day, mean ± SD): trips | km | share of their km
  overwritten by a later call: 0.228 ± 0.027 | 0.113 ± 0.014 | 0.672 ± 0.021
  0.3 h passed: 0.075 ± 0.008 | 0.045 ± 0.004 | 0.267 ± 0.022
  within 50 m of the call point: 0.053 ± 0.011 | 0.009 ± 0.002 | 0.052 ± 0.005
  other: 0.015 ± 0.004 | 0.001 ± 0.000 | 0.009 ± 0.003
  all: 0.371 ± 0.040 | 0.167 ± 0.018 | 1.000 ± 0.000
  overwritten trips whose slot crown is no longer their crown (the walk redirected): 0.862 ± 0.028
```

**Reading (registered rule): the call slot.** Two thirds (67 ± 2%) of the walking of caller trips re-decided en route is
trips whose call had been overwritten in the listener's one call slot by a later pant-hoot heard (0.23 trips and 0.11 km
per adult-day); in 86% of them the walk had already turned to the new caller's crown, a trip that was never chosen. The
0.3-h offer passing carries 27% (0.08 trips, 0.045 km), the last 50 m 5%. Every path is the same defect: the trip's goal
lives in a slot that its own valuation does not own.

## 3. Field rows scored here: samples (written before any arm)

Every e-bench row is scored (fitted and held-out sums, with and without T-HUN-4, T-BRD-1 and T-IGE-3). The rows this stage's
readouts lean on are travel, ranging, party size, feeding trees and fruit share; none is fitted by this stage. Samples as
recorded by E3h §3 (which quotes each source's methods; villioth2025, batesByrne2009, wilson2012 and normand2009 read in
full there); not re-opened here. The definitions are data/targets.json's.

| Row | Source | Sample, method | Value, band |
| --- | --- | --- | --- |
| T-ACT-2 travel share (fitted) | villioth2025 (FT), amsler2010 (Abs) | Budongo Waibira, Oct 2016 – Jun 2017: "ten adult males and nine adult females ... Seven of the females were lactating"; state "recorded continuously"; travelling = "terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy"; 491 h; mass not reported. Ngogo 0.14 on non-patrol days. Definition: "Share of focal samples scored travel (walking or climbing between locations, including travel to a tree before feeding)." | males 0.21, females 0.20; band 0.12–0.25 |
| T-RNG-4 day range (fitted) | batesByrne2009 (FT, accepted manuscript) | Budongo Sonso 2002–03, 8 adult males, GPS fixes every 5 min while travelling, full-day follows (≥ 8 h); mass not reported. Definition: "Sum of straight-line distances between successive 5-min fixes while travelling on full-day follows (≥ 8 h)." | 2.7 ± 1.5 km/day; band 1.5–3.5 |
| T-PTY-1 party size (fitted) | wilson2012 (FT), potts2011 | Kanyawara 1992–2006, community median 47 (11 adult males, 15 adult females), 5,527 party follows, 15-min scans of "the identity of all individuals present"; party = all within about 50 m; every age and sex; mass not reported | 9.2 ± 7.0 per follow; band 3–9 |
| T-FOOD-2 fruit share (fitted) | watts2012a, emeryThompson2020 | Ngogo 1995–2010 (125 months, focal + 15-min scans); Kanyawara 1994–2018 (240,601 feeding scans); all age-sex classes | 72.1%, 64.0%; band 0.60–0.78 |
| T-FOOD-4 feeding trees (held-out; flagged compromised) | janmaat2013b, normand2009 (FT, PMC2762532) | Taï, 5 adult females with young, 275 full-day follows; two females "ate in 391 and 506 trees, 13.96 and 18.07 a day" over 28 days; mass and reproductive state not reported. Definition: "Distinct feeding trees per full-day follow." | 7.14; 14.0 and 18.1; band 4–15 |
| Reserves %/day by class; trips fed at their target | no field row (T-ENE rows staged, e-targets.patch.json) | — | read against the S39q group only |

Known observer defects bearing on these rows (frozen observer; not changed here; E3b §7): T-FOOD-4 counts a return to the
same crown after ≥ 10 min as another tree (src/field/metrics.ts); T-FOOD-5 counts a return to the crown just left as a
nearest-tree choice.

**Readouts the predictions need** (each defined in its tool's header): e-bench's observer rows (src/field/metrics.ts) and
sums; energy-diagnose's ground km, climbing kcal, eating minutes and reserves (%/day: the OLS slope of reserves ÷ store
over the window, the integrator's convention); trip-diagnose's E3h and E3i readouts (§2); rhythm-metrics' night share
(adults out of a nest, T-RHY-5) for any arm that changes when animals move. Each arm's switch is smoke-tested with them on
1–2 days before its run.

## 4. Reference and judging

- Reference **S39** in quick mode, run by the integrator once plus three re-draws (`rngSalt` 1, 2, 3) at bench-run2 c16d3d2
  (simulation code identical to this branch's start for S39), each with energy-diagnose (seeds 48, 7; burn-in 30, 30 days):
  `bench-run2/artifacts/validation/e/s39q/{S39q,S39q1,S39q2,S39q3}.json` and `…-energy.json`; parameters
  `…/s39q/S39q-params.json`. Not re-run here. The group's trip readouts are this stage's diagnosis runs (§2) of the same
  four worlds (identity checked).
- Each arm (S39 + this stage's switch, same quick settings) against the S39q mean with the integrator's
  `judge_vs_reps.py quick custom` (REFS = the four S39q JSON): z = (arm − mean) ÷ (SD × √(1 + 1/n)), the registered quick
  SD or the group's own spread if larger; |z| > 2 is a result; with and without T-HUN-4, T-BRD-1 and T-IGE-3. Readouts
  against the group's own spread (mean ± SD of its four runs). Viability must pass; night safety (adults out of a nest
  ≤ 3.3% of the night, T-RHY-5 ≤ 0.033) for any arm that changes when animals move. Prescriptions:
  `scripts/prescription-ledger.ts --count --params` (S39 42 on the current ledger).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

### 5.1 Iteration 1 (registered before its run): a trip to a caller keeps the call it was chosen for (`callTrip` 1)

**Why (§2.2, §2.3).** The registered rule names *re-decided en route* (29% of unfed trips' walking); 77% of its walking is
caller trips whose own option had left the list, and two thirds of that is the listener's single call slot overwritten by
a later pant-hoot (the walk turning to the new caller's crown in 86% of those trips), a quarter the 0.3-h offer passing,
5% the last 50 m. Caller trips altogether carry 47% of unfed walking. No other class reaches 1/4 of unfed walking, so no
other mechanism is built (D1: crowns emptied by eating since the sighting are 7% of it; a belief about others' eating would
act on that 7%).

**Principle.** A trip is executed as it was valued (E3h): a destination chosen from memory, a remembered tree or the place a
call came from, is held while the animal travels to it, and a new percept is a new option weighed at the next decision
point (the gate, or under `redecideValue` the keep test), not a silent change of destination. Listeners do travel to
callers: inquiring pant-hoots at Loango were followed by fusion in 67% of cases, about 5 min later [M: southern2025]; the
calls a listener hears after setting out are information about other places. Design: the record and its use; no
magnitude.

**Change (switch `callTrip`, 0 = today; a sum of bits; src/sim/calltrip.ts, candidates.ts, execution.ts, rg.ts).**
- *Bit 1.* When a caller trip starts, the call it was chosen for (the call, the caller, when and where it was heard, the
  crown the caller fed in) is kept with the trip (`chimp.sim.cg`, a lazy key in OPTIONAL_X). The walk goes to that crown
  (E3h bit 2) or the call's place (execution.ts), the gate's arrival rule reads that crown (rg.ts `tripTree`), and while
  the trip runs its option stays on the list, valued from the record exactly as the slot's call is valued (the caller's
  company margin plus the crown's drive × the trip's net rate, candidates.ts), beside the slot's latest call when that is
  another. The 0.3-h window and `joinCallMinM` still decide whether a heard call is a reason to set out; a trip already
  under way ends by arriving or by a choice at a decision point (with the travel slots, `slotsMulti` 2, two better trips
  can still crowd it off the list). The record goes when the animal starts any other act.
- No new magnitude; no counted entry is read less (a correction: the 0.3-h window is an E0b "L6 design" window, not
  counted): prescriptions 42 with and without the switch (checked with `prescription-ledger --count`). Tests
  (tests/sim-call-trip.test.ts): 0 by default in both profiles; with bit 1 a later call heard leaves the trip's walk, its
  option and the gate's keep on its own call (today: the walk turns, the option leaves the list, the gate says 'ended');
  the trip's option stays past the 0.3-h offer and within `joinCallMinM` (today it leaves); value 1 on S39 deterministic
  and JSON-lossless over 12 h, the count unchanged. Switch off: the field pin and the compressed goldens hold.

**Smoke test with the switch on (seed 48, 3 + 3 days, against the same days with it off; disclosed; not
representative):** trips fed at their target 0.58 → 0.61; trips 15.7 → 12.8 per adult-day; unfed trips' walking 0.58 →
0.44 km per adult-day; caller trips 1.28 → 1.19 per adult-day, fed at their target 0.35 → 0.56, re-decided en route 0.30
→ 0.09 per adult-day; adult males' ground km 1.98 → 1.84.

**Arm A1** = S39 (S39q-params.json) + `callTrip` 1, from a frozen detached checkout of the commit that adds this section:
e-bench `--quick`, energy-diagnose, trip-diagnose and rhythm-metrics (seeds 48 and 7, burn-in 30, 30 days; `--workers` 2,
1 above load 8; no run above load 30).

**Predictions (against the S39q group, mean ± SD of its four runs; low confidence unless stated).**

| Quantity | S39q (mean ± SD) | A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 42 | 42 | high |
| Viability; night (adults out of a nest ≤ 3.3%, T-RHY-5 ≤ 0.033) | pass | pass | moderate |
| Trips fed at their target (truth, adults) | 0.556 ± 0.009 | 0.58–0.66 | moderate |
| Caller trips re-decided en route, per adult-day | 0.370 ± 0.040 | ≤ 0.12 | moderate |
| Caller trips fed at their target | 0.322 ± 0.004 | 0.42–0.60 | moderate |
| Unfed trips' km per adult-day | 0.737 ± 0.055 | 0.50–0.70 | moderate |
| Trips per adult-day | 13.30 ± 0.32 | 10.5–13.0 | low |
| Ground km: adult males; nursing mothers; juveniles 5–12 y | 2.57 ± 0.16; 2.37 ± 0.13; 2.82 ± 0.18 | each within ± 0.4 km of the mean | low |
| Climbing kcal a day, adults | 46.1 ± 1.1 | 41–51 | low |
| T-FOOD-4; T-ACT-2; T-RNG-4; T-PTY-1 | 9.21 ± 0.30; 0.107 ± 0.008; 2.11 ± 0.24; 4.01 ± 0.05 | 8.0–10.0; 0.09–0.12; 1.6–2.6; 3.7–4.5 | low |
| Reserves %/day, every class | S39q group | at or above the mean − 0.03 | low |
| Fitted; held-out with and without the rare rows | reference mean | inside noise | moderate |

**Kill criterion (registered).** Null if (a) viability fails (a starvation death, or a seed below 80% of its start); (b)
any class's reserve slope (adult males, other females, nursing mothers, juveniles 5–12 y, infants 2–5 y and 0.5–2 y) is
more than 0.05% of the store a day below the S39q mean; (c) held-out is worse beyond noise (z > +2) with or without the
rare rows; (d) night safety fails; (e) the mechanism does not run (caller trips re-decided en route not below half the
group's mean, 0.185 per adult-day).

**Verdict rule (registered).** `callTrip` removes no counted prescription, so A1 is judged as a correction (the track's rule
for corrections): a **provisional keep candidate** if none of (a)–(e) holds, trips fed at their target rise beyond the
group's spread (z > +2) and unfed trips' walking does not rise beyond it (z ≤ +2); otherwise recorded and off. Walking,
climbing, rows and reserves are reported against the group, never used to choose.

**Diagnostic arms (registered now, before any of them runs; not candidates, run after the iterations).** D1 = the best arm
(the qualifying arm with the highest share of trips fed at their target; A1 if it is the only one) + `redecideValue` 2,
and its comparison on this mode and base, D0 = S39 + `redecideValue` 2 (no S39 + re-deciding run exists); each with
e-bench `--quick`, energy-diagnose and trip-diagnose, same settings. Read (single runs; a difference smaller than the
group's SD is noise): re-deciding's cost on the best arm, (D1 − best), against its cost on S39, (D0 − the S39q mean), for
adults' ground km by class, adults' climbing kcal, trips per adult-day, the share fed at their target, unfed trips' km,
T-FOOD-4, T-RNG-4, T-HUN-1 and reserves by class.

### 5.2 No iteration 2 (decided after A1, by the registered rule)

The registered rule (§2) builds a mechanism only for a class with at least 1/4 of unfed trips' walking. On S39 only
re-decided en route qualified, and A1 addressed it. In A1's readouts (§6.1) no class reaches 1/4 either: caller trips
that arrive and do not feed 22%, list crowns and companions' goals not seen 25% together (two classes, 19% and 6%),
arrivals with crop left 18%, crowns emptied by eating since the sighting 8.5%. So no second mechanism; the diagnostic arms
follow, with A1 as the best arm (the only arm; it does not qualify by its verdict rule). Disclosed: D0 ran alongside A1 (it
depends on no arm), and D1 was started at 01:02, after A1's readouts were read and before this section was committed; it
follows §5.1's registration of the diagnostic arms (committed before any of them ran: the best arm, A1 if it is the only
one).

## 6. Results

### 6.1 Iteration 1: A1 = S39 + `callTrip` 1 (frozen checkout c90d7bf, clean)

Printed by the stage's `final_table.py` (the integrator's `judge_vs_reps.py` for the sums, his slope convention for
reserves), `arm_classes.py` and `night.py`, from the JSON (session scratch `e3i/arms/`).

```
  S39q: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S39q1: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S39q2: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 1, 0, {'infanticide by Chiriku (East community)': 1}), (7, 0, 0, {})]
  S39q3: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  A1: c90d7bf dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]

quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.98, 2.24, 1.56, 1.41 (mean 1.80, sd 0.38; used 0.69) | A1.json: 1.76, Δ -0.04, z -0.1 (inside noise)
  held-out           (13 rows) ref 4.49, 11.03, 3.72, 5.91 (mean 6.28, sd 3.29; used 3.29) | A1.json: 4.78, Δ -1.50, z -0.4 (inside noise)
  held-out w/o rare  (12 rows) ref 4.49, 4.41, 3.66, 3.21 (mean 3.94, sd 0.61; used 0.61) | A1.json: 4.06, Δ +0.12, z +0.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-4   held-out ref 2.34±3.12 | A1.json 0.72 (fail)

| Readout | S39q runs | S39q mean ± SD | A1 |
| --- | --- | --- | --- |
| trips fed at their target (share, adults) | 0.554 / 0.544 / 0.560 / 0.565 | 0.556 ± 0.009 | 0.555 (z -0.1) |
| trips per adult-day | 13.23 / 13.66 / 12.90 / 13.40 | 13.30 ± 0.32 | 12.93 (z -1.0) |
|   remembered crown: per adult-day | 1.91 / 1.96 / 1.91 / 1.90 | 1.92 ± 0.03 | 1.77 (z -5.2) |
|   remembered crown: fed at target | 0.742 / 0.722 / 0.738 / 0.750 | 0.738 ± 0.012 | 0.711 (z -2.1) |
|   departure: per adult-day | 4.98 / 5.08 / 4.95 / 4.98 | 5.00 ± 0.06 | 5.14 (z +2.2) |
|   departure: fed at target | 0.315 / 0.313 / 0.325 / 0.332 | 0.321 ± 0.009 | 0.307 (z -1.4) |
|   crown in view: per adult-day | 1.31 / 1.47 / 1.35 / 1.36 | 1.37 ± 0.07 | 1.36 (z -0.1) |
|   crown in view: fed at target | 0.984 / 0.979 / 0.985 / 0.981 | 0.982 ± 0.003 | 0.986 (z +1.2) |
|   a companion's trip: per adult-day | 3.61 / 3.63 / 3.43 / 3.71 | 3.60 ± 0.12 | 3.41 (z -1.4) |
|   a companion's trip: fed at target | 0.716 / 0.691 / 0.723 / 0.726 | 0.714 ± 0.016 | 0.706 (z -0.5) |
|   a caller: per adult-day | 1.42 / 1.51 / 1.25 / 1.46 | 1.41 ± 0.11 | 1.25 (z -1.3) |
|   a caller: fed at target | 0.325 / 0.317 / 0.319 / 0.325 | 0.322 ± 0.004 | 0.467 (z +31.6) |
| unfed trips: km per adult-day | 0.708 / 0.811 / 0.684 / 0.744 | 0.737 ± 0.055 | 0.636 (z -1.6) |
| unfed trips: kcal per adult-day | 24.8 / 28.5 / 23.8 / 26.1 | 25.8 ± 2.0 | 22.2 (z -1.6) |
| trips: km per adult-day | 1.702 / 1.885 / 1.676 / 1.775 | 1.760 ± 0.094 | 1.652 (z -1.0) |
| delivered ÷ valued (fruit at target ÷ E0) | 0.256 / 0.256 / 0.262 / 0.256 | 0.258 ± 0.003 | 0.259 (z +0.4) |
|   unfed, arrived, empty: per adult-day | 1.149 / 1.347 / 1.116 / 1.113 | 1.181 ± 0.112 | 1.230 (z +0.4) |
|   unfed, departure given up: per adult-day | 2.769 / 2.770 / 2.735 / 2.719 | 2.748 ± 0.025 | 2.908 (z +5.6) |
|   unfed, caller stopped short: per adult-day | 0.399 / 0.435 / 0.344 / 0.381 | 0.390 ± 0.038 | 0.402 (z +0.3) |
|   unfed, re-decided en route: per adult-day | 0.759 / 0.849 / 0.696 / 0.800 | 0.776 ± 0.065 | 0.431 (z -4.8) |
|   unfed, arrived, crop left: per adult-day | 0.655 / 0.663 / 0.615 / 0.649 | 0.645 ± 0.021 | 0.624 (z -0.9) |
| known-tree trips per adult-day; fed | 0.832 / 0.870 / 0.777 / 0.731 | 0.802 ± 0.061 | 0.888 (z +1.3) |
|   known-tree trips fed at target | 0.114 / 0.117 / 0.128 / 0.143 | 0.126 ± 0.013 | 0.113 (z -0.9) |
|   known-tree trips back to one found empty (share) | 0.093 / 0.106 / 0.110 / 0.081 | 0.098 ± 0.013 | 0.108 (z +0.7) |
| caller trips fed at the caller's crown | 0.392 / 0.377 / 0.395 / 0.387 | 0.388 ± 0.008 | 0.548 (z +18.2) |
| caller trips: unfed km per adult-day | 0.330 / 0.378 / 0.320 / 0.354 | 0.346 ± 0.026 | 0.243 (z -3.5) |
| caller trips re-decided en route per adult-day | 0.347 / 0.409 / 0.326 / 0.399 | 0.370 ± 0.040 | 0.068 (z -6.7) |
|   their km per adult-day | 0.150 / 0.189 / 0.154 / 0.174 | 0.167 ± 0.018 | 0.027 (z -6.9) |
|   E3i class km per adult-day: re-decided en route | 0.191 / 0.235 / 0.196 / 0.241 | 0.216 ± 0.026 | 0.069 (z -5.1) |
|   E3i class km per adult-day: caller stopped short | 0.121 / 0.137 / 0.108 / 0.117 | 0.121 ± 0.012 | 0.142 (z +1.6) |
|   E3i class km per adult-day: arrived, crop left | 0.115 / 0.128 / 0.109 / 0.123 | 0.119 ± 0.008 | 0.117 (z -0.2) |
|   E3i class km per adult-day: arrived empty: no sighting, the list | 0.118 / 0.126 / 0.108 / 0.101 | 0.113 ± 0.011 | 0.121 (z +0.6) |
|   E3i class km per adult-day: arrived empty: emptied by eating since the sighting | 0.044 / 0.058 / 0.049 / 0.047 | 0.050 ± 0.006 | 0.054 (z +0.7) |
|   E3i class km per adult-day: caller, no crown | 0.052 / 0.048 / 0.054 / 0.053 | 0.052 ± 0.003 | 0.064 (z +4.2) |
|   E3i class km per adult-day: departure given up | 0.002 / 0.003 / 0.002 / 0.002 | 0.002 ± 0.001 | 0.002 (z -0.4) |
| ground km, adult male | 2.44 / 2.80 / 2.49 / 2.54 | 2.57 ± 0.16 | 2.41 (z -0.9) |
| ground km, female lactating | 2.35 / 2.52 / 2.21 / 2.42 | 2.37 ± 0.13 | 2.33 (z -0.3) |
| ground km, female other | 1.85 / 2.06 / 1.82 / 1.95 | 1.92 ± 0.11 | 1.78 (z -1.2) |
| ground km, juvenile 5–12 y | 2.71 / 3.09 / 2.71 / 2.79 | 2.82 ± 0.18 | 2.85 (z +0.1) |
| climbing kcal/day, adults (day-weighted) | 46.3 / 47.0 / 44.6 / 46.6 | 46.1 ± 1.1 | 44.3 (z -1.6) |
| climbing kcal/day, adult male | 59.7 / 60.6 / 56.6 / 59.5 | 59.1 ± 1.7 | 55.5 (z -1.9) |
| climbing kcal/day, female lactating | 38.2 / 37.3 / 35.8 / 39.0 | 37.6 ± 1.4 | 36.5 (z -0.7) |
| T-FOOD-4 | 9.261 / 9.470 / 8.777 / 9.344 | 9.213 ± 0.303 | 9.714 (z +1.5) |
| T-ACT-2 | 0.105 / 0.117 / 0.098 / 0.107 | 0.107 ± 0.008 | 0.103 (z -0.4) |
| T-RNG-4 | 1.848 / 2.236 / 1.978 / 2.383 | 2.111 ± 0.243 | 2.054 (z -0.2) |
| T-PTY-1 | 4.075 / 4.016 / 4.014 / 3.950 | 4.014 ± 0.051 | 4.340 (z +5.7) |
| T-FOOD-2 | 0.839 / 0.836 / 0.801 / 0.866 | 0.836 ± 0.027 | 0.834 (z -0.0) |
| T-ACT-1 | 0.373 / 0.371 / 0.370 / 0.358 | 0.368 ± 0.007 | 0.371 (z +0.3) |
| T-ACT-3 | 0.104 / 0.101 / 0.105 / 0.106 | 0.104 ± 0.002 | 0.099 (z -2.6) |
| T-ACT-4 | 0.437 / 0.426 / 0.427 / 0.457 | 0.437 ± 0.014 | 0.449 (z +0.8) |
| T-HUN-1 | 21.940 / 25.788 / 17.853 / 20.166 | 21.437 ± 3.349 | 12.033 (z -2.5) |
| T-FOOD-5 | 0.317 / 0.300 / 0.294 / 0.279 | 0.298 ± 0.016 | 0.332 (z +1.9) |
| T-FOOD-6 | 4.731 / 4.580 / 4.350 / 4.626 | 4.572 ± 0.160 | 4.290 (z -1.6) |
| T-FOOD-10 | 0.552 / 0.593 / 0.579 / 0.533 | 0.565 ± 0.027 | 0.569 (z +0.2) |
| T-IGE-1 | 3.100 / 4.552 / 4.603 / 7.583 | 4.960 ± 1.882 | 6.003 (z +0.5) |
| reserves %/day, adult male | 0.005 / 0.007 / -0.004 / -0.004 | 0.001 ± 0.006 | -0.004 (z -0.8) |
| reserves %/day, female, other | 0.013 / 0.023 / -0.008 / 0.024 | 0.013 ± 0.015 | 0.006 (z -0.4) |
| reserves %/day, female, lactating | 0.013 / -0.001 / -0.001 / -0.013 | -0.000 ± 0.011 | 0.000 (z +0.1) |
| reserves %/day, juvenile 5–12 y | -0.015 / 0.002 / -0.029 / -0.009 | -0.013 ± 0.013 | -0.026 (z -0.9) |
| reserves %/day, infant 2–5 y | 0.020 / -0.001 / -0.001 / -0.024 | -0.002 ± 0.018 | 0.019 (z +1.0) |
| reserves %/day, infant 0.5–2 y | 0.010 / -0.000 / 0.004 / 0.010 | 0.006 ± 0.005 | -0.010 (z -2.7) |
| eating min, adult male | 228.0 / 229.3 / 226.7 / 227.4 | 227.9 ± 1.1 | 225.2 (z -2.2) |
| fruit share (eating), adult male | 0.944 / 0.945 / 0.944 / 0.947 | 0.945 ± 0.001 | 0.942 (z -1.7) |
| eating min, female, other | 223.9 / 234.8 / 220.8 / 223.8 | 225.8 ± 6.2 | 227.6 (z +0.3) |
| fruit share (eating), female, other | 0.710 / 0.680 / 0.713 / 0.733 | 0.709 ± 0.022 | 0.690 (z -0.8) |
| eating min, female, lactating | 302.6 / 300.9 / 292.2 / 291.5 | 296.8 ± 5.8 | 302.1 (z +0.8) |
| fruit share (eating), female, lactating | 0.685 / 0.683 / 0.719 / 0.720 | 0.702 ± 0.020 | 0.678 (z -1.1) |
| eating min, juvenile 5–12 y | 274.8 / 277.2 / 282.6 / 277.8 | 278.1 ± 3.3 | 277.8 (z -0.1) |
| fruit share (eating), juvenile 5–12 y | 0.920 / 0.910 / 0.839 / 0.835 | 0.876 ± 0.045 | 0.904 (z +0.5) |

Sums on rows scored in every run listed (fitted / held-out; with rare rows, then without T-HUN-4, T-BRD-1, T-IGE-3):
  S39q: 1.98 / 4.49; 1.98 / 4.49
  S39q1: 2.24 / 11.03; 2.24 / 4.41
  S39q2: 1.56 / 3.72; 1.56 / 3.66
  S39q3: 1.41 / 5.91; 1.41 / 3.21
  A1: 1.76 / 4.78; 1.76 / 4.06
/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/ad60f0c7-2554-45f8-b237-a926b537fae7/scratchpad/e3i/arms/A1-rhythm.json: adults out of a nest 2.21% of night; T-RHY-5 0.0181; night deaths 0; deaths 0
A1: identity (adult males' eating min, ground km) 225.151 / 2.409; energy-diagnose 225.1514880952381 / 2.4089261780270426; living [(49, 49, {}), (49, 49, {})]

| Unfed trips, km per adult-day (trips per adult-day) | S39q mean ± SD | A1 |
| --- | --- | --- |
| all unfed trips: km | 0.737 ± 0.055 | 0.636 (z -1.6) |
| re-decided en route: km | 0.216 ± 0.026 | 0.069 (z -5.0) |
| re-decided en route: trips | 0.776 ± 0.065 | 0.431 (z -4.8) |
| re-decided en route: share of unfed km | 0.292 ± 0.023 | 0.109 (z -7.1) |
| arrived empty: no sighting: km | 0.147 ± 0.016 | 0.159 (z +0.7) |
| arrived empty: no sighting: trips | 0.471 ± 0.054 | 0.501 (z +0.5) |
| arrived empty: no sighting: share of unfed km | 0.199 ± 0.017 | 0.250 (z +2.6) |
| caller stopped short: km | 0.121 ± 0.012 | 0.142 (z +1.5) |
| caller stopped short: trips | 0.390 ± 0.038 | 0.402 (z +0.3) |
| caller stopped short: share of unfed km | 0.164 ± 0.007 | 0.223 (z +7.1) |
| arrived, crop left: km | 0.119 ± 0.008 | 0.117 (z -0.3) |
| arrived, crop left: trips | 0.646 ± 0.021 | 0.624 (z -0.9) |
| arrived, crop left: share of unfed km | 0.162 ± 0.003 | 0.183 (z +6.0) |
| caller, no crown: km | 0.052 ± 0.003 | 0.064 (z +4.1) |
| caller, no crown: trips | 0.166 ± 0.006 | 0.162 (z -0.6) |
| caller, no crown: share of unfed km | 0.071 ± 0.008 | 0.100 (z +3.2) |
| arrived empty: emptied by eating since the sighting: km | 0.050 ± 0.006 | 0.054 (z +0.6) |
| arrived empty: emptied by eating since the sighting: trips | 0.484 ± 0.047 | 0.523 (z +0.7) |
| arrived empty: emptied by eating since the sighting: share of unfed km | 0.067 ± 0.006 | 0.085 (z +2.8) |
| arrived empty: ripening ended since the sighting: km | 0.028 ± 0.004 | 0.026 (z -0.6) |
| arrived empty: ripening ended since the sighting: trips | 0.202 ± 0.024 | 0.185 (z -0.6) |
| arrived empty: ripening ended since the sighting: share of unfed km | 0.038 ± 0.004 | 0.040 (z +0.5) |
| arrived empty: emptied during the trip: km | 0.003 ± 0.001 | 0.004 (z +0.4) |
| arrived empty: emptied during the trip: trips | 0.024 ± 0.007 | 0.022 (z -0.2) |
| arrived empty: emptied during the trip: share of unfed km | 0.004 ± 0.002 | 0.006 (z +0.8) |
| departure given up: km | 0.002 ± 0.000 | 0.002 (z +0.1) |
| departure given up: trips | 2.748 ± 0.025 | 2.908 (z +5.6) |
| departure given up: share of unfed km | 0.003 ± 0.000 | 0.003 (z +1.3) |
| by kind, caller: km | 0.346 ± 0.026 | 0.243 (z -3.6) |
| by kind, caller: share of unfed km | 0.470 ± 0.004 | 0.382 (z -19.8) |
| by kind, joined: km | 0.147 ± 0.014 | 0.142 (z -0.3) |
| by kind, joined: share of unfed km | 0.199 ± 0.004 | 0.223 (z +6.0) |
| by kind, remembered crown: km | 0.145 ± 0.009 | 0.149 (z +0.4) |
| by kind, remembered crown: share of unfed km | 0.197 ± 0.009 | 0.234 (z +3.7) |
| by kind, departure: km | 0.098 ± 0.010 | 0.101 (z +0.3) |
| by kind, departure: share of unfed km | 0.133 ± 0.006 | 0.160 (z +3.9) |

Sensitivity (not the registered test): trips fed at their target with departures given up left out: S39q 0.700 / 0.683 / 0.711 / 0.709 (mean 0.701 ± 0.013); A1 0.716 (z +1.0)
/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/ad60f0c7-2554-45f8-b237-a926b537fae7/scratchpad/e3i/arms/A1-rhythm.json: adults out of a nest 2.21% of night; T-RHY-5 0.0181; night deaths 0; deaths 0
```

**What happened.** The mechanism runs: caller trips re-decided en route fell from 0.37 to 0.07 per adult-day (z −6.7) and
their walking from 0.167 to 0.027 km per adult-day; caller trips feed at their target 47% instead of 32% (z +31.6); the
walking spent on unfed caller trips fell from 0.346 to 0.243 km per adult-day (z −3.5). But the share of all trips fed at
their target is unchanged (0.555 against 0.556 ± 0.009): departures nobody answered rose (2.91 against 2.75 ± 0.03 per
adult-day, z +5.6: parties are larger, T-PTY-1 4.34 against 4.01 ± 0.05, z +5.7, as listeners now reach the callers they
set out for), remembered-crown trips fed a little less (0.711 against 0.738 ± 0.012), and arrivals at callers' crowns
that do not feed rose with the arrivals (0.142 against 0.121 ± 0.012 km). Unfed trips' walking fell 14% (0.636 against
0.737 ± 0.055 km per adult-day, z −1.6, inside the group's spread); adult males walk 2.41 km (z −0.9), adults climb 44.3
kcal a day (z −1.6); hunting fell (T-HUN-1 12.0 against 21.4 ± 3.3, z −2.5, in band); every reserve slope within the
group's spread except infants 0.5–2 y (−0.010 against +0.006 ± 0.005 %/day, z −2.7; 0.016 %/day, under the 0.05 line);
juveniles −0.026 against −0.013 ± 0.013 (z −0.9: not E3h A2's juvenile cost); every sum inside noise; night safe (2.21%,
T-RHY-5 0.0181); no deaths. Sensitivity (not the registered test): with departures given up left out, the fed share is
0.716 against 0.701 ± 0.013 (z +1.0).

**Against the predictions.** Prescriptions 42: held. Viability and night: held. Trips fed at their target 0.58–0.66:
**missed** (0.555). Caller trips re-decided en route ≤ 0.12: held (0.068). Caller trips fed at their target 0.42–0.60:
held (0.467). Unfed trips' km 0.50–0.70: held (0.636). Trips per adult-day 10.5–13.0: held (12.93). Ground km within
± 0.4 km: held (2.41, 2.33, 2.85). Adults' climbing 41–51: held (44.3). T-FOOD-4 8–10, T-ACT-2 0.09–0.12, T-RNG-4 1.6–2.6,
T-PTY-1 3.7–4.5: held (9.71, 0.103, 2.05, 4.34). Reserves at or above the mean − 0.03: held (lowest margin: infants
0.5–2 y, −0.016). Sums inside noise: held (fitted z −0.1, held-out −0.4, without the rare rows +0.2).

**Kill criterion: not met.** (a) no death; (b) the largest fall against the S39q mean is infants 0.5–2 y, 0.016% of the
store a day; (c) held-out inside noise with and without the rare rows; (d) night safe; (e) caller trips re-decided en
route 0.068 per adult-day, below 0.185.

**Verdict: recorded, off** (the registered rule for a correction needs trips fed at their target beyond the group's
spread, z > +2; A1 gives z −0.1). `callTrip` 1 does what it was built for: a trip to a caller now goes where the call
came from, feeds there half the time, and the walking wasted on caller trips falls by a third; the share of all trips
that feed does not move, because the trips it saves are replaced by departures nobody answers (costing no walking) and
slightly worse remembered-crown trips.

### 6.2 Diagnostic arms (not candidates): D0 = S39 + `redecideValue` 2, D1 = A1 + `redecideValue` 2 (frozen checkout c90d7bf, clean)

Brief: whether re-deciding's walking cost falls once caller trips keep their call. Printed by the stage's
`redecide_cost.py`, `final_table.py` and `report_table.py` from the JSON (session scratch `e3i/arms/`). D0 and D1 are
single runs; re-deciding's cost on S39 is D0 less the S39q group's mean, on A1 it is D1 less A1 (each difference carries
one run's draw: read differences smaller than the group's SD, 0.13–0.18 km for walking, as noise). D0's one death is an
illness (seed 48); none from starvation in either.

```
| Readout | S39q mean | S39 + redecide (D0) | Δ re-deciding on S39 | A1 | A1 + redecide (D1) | Δ re-deciding on A1 |
| --- | --- | --- | --- | --- | --- | --- |
| ground km, adult male | 2.569 | 3.276 | +0.707 | 2.409 | 3.472 | +1.063 |
| ground km, female lactating | 2.373 | 3.227 | +0.853 | 2.334 | 3.241 | +0.908 |
| ground km, female other | 1.920 | 2.526 | +0.606 | 1.779 | 2.653 | +0.874 |
| ground km, juvenile 5–12 y | 2.825 | 3.671 | +0.846 | 2.846 | 3.625 | +0.779 |
| climbing kcal/day, adults | 46.106 | 65.447 | +19.341 | 44.253 | 70.959 | +26.706 |
| trips per adult-day | 13.300 | 19.481 | +6.181 | 12.928 | 21.380 | +8.452 |
| trips fed at target | 0.556 | 0.567 | +0.011 | 0.555 | 0.565 | +0.010 |
| unfed trips km per adult-day | 0.737 | 0.901 | +0.164 | 0.636 | 0.866 | +0.230 |
| T-FOOD-4 | 9.213 | 13.402 | +4.189 | 9.714 | 13.381 | +3.667 |
| T-RNG-4 | 2.111 | 2.813 | +0.702 | 2.054 | 3.063 | +1.009 |
| T-HUN-1 | 21.437 | 17.951 | -3.486 | 12.033 | 35.707 | +23.674 |
| reserves %/day, adult male | 0.001 | 0.003 | +0.002 | -0.004 | 0.012 | +0.015 |
| reserves %/day, female, other | 0.013 | 0.001 | -0.012 | 0.006 | -0.014 | -0.021 |
| reserves %/day, female, lactating | -0.000 | -0.012 | -0.012 | 0.000 | -0.000 | -0.001 |
| reserves %/day, juvenile 5–12 y | -0.013 | -0.020 | -0.007 | -0.026 | -0.028 | -0.001 |
| reserves %/day, infant 0.5–2 y | 0.006 | -0.038 | -0.043 | -0.010 | -0.009 | +0.000 |

  S39q: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S39q1: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  S39q2: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 1, 0, {'infanticide by Chiriku (East community)': 1}), (7, 0, 0, {})]
  S39q3: c16d3d2 dirty 0 prescriptions 42 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]
  D0: c90d7bf dirty 0 prescriptions 39 viability {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 1, 0, {'illness': 1}), (7, 0, 0, {})]
  D1: c90d7bf dirty 0 prescriptions 39 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}; deaths by seed [(48, 0, 0, {}), (7, 0, 0, {})]

quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.98, 2.24, 1.56, 1.41 (mean 1.80, sd 0.38; used 0.69) | D0.json: 1.02, Δ -0.77, z -1.0 (inside noise) | D1.json: 2.28, Δ +0.48, z +0.6 (inside noise)
  held-out           (13 rows) ref 4.49, 11.03, 3.72, 5.91 (mean 6.28, sd 3.29; used 3.29) | D0.json: 3.59, Δ -2.69, z -0.7 (inside noise) | D1.json: 3.23, Δ -3.06, z -0.8 (inside noise)
  held-out w/o rare  (12 rows) ref 4.49, 4.41, 3.66, 3.21 (mean 3.94, sd 0.61; used 0.61) | D0.json: 3.55, Δ -0.40, z -0.6 (inside noise) | D1.json: 3.14, Δ -0.80, z -1.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-11  fitted   ref 0.76±0.15 | D0.json 0.25 (fail) | D1.json 0.83 (fail)
   T-HUN-1   fitted   ref 0.01±0.02 | D0.json 0.00 (pass) | D1.json 0.54 (inconclusive)
   T-HUN-4   held-out ref 2.34±3.12 | D0.json 0.04 (fail) | D1.json 0.08 (fail)
   T-IGE-2   held-out ref 0.50±0.00 | D0.json 0.05 (fail) | D1.json 0.00 (pass)
   T-SOC-6   held-out ref 0.31±0.05 | D0.json 0.38 (fail) | D1.json 0.49 (fail)

| Readout | S39q runs | S39q mean ± SD | D0 | D1 |
| --- | --- | --- | --- | --- |
| trips fed at their target (share, adults) | 0.554 / 0.544 / 0.560 / 0.565 | 0.556 ± 0.009 | 0.567 (z +1.1) | 0.565 (z +0.9) |
| trips per adult-day | 13.23 / 13.66 / 12.90 / 13.40 | 13.30 ± 0.32 | 19.48 (z +17.3) | 21.38 (z +22.7) |
|   remembered crown: per adult-day | 1.91 / 1.96 / 1.91 / 1.90 | 1.92 ± 0.03 | 2.06 (z +4.5) | 2.05 (z +4.1) |
|   remembered crown: fed at target | 0.742 / 0.722 / 0.738 / 0.750 | 0.738 ± 0.012 | 0.739 (z +0.1) | 0.738 (z +0.0) |
|   departure: per adult-day | 4.98 / 5.08 / 4.95 / 4.98 | 5.00 ± 0.06 | 7.25 (z +35.1) | 7.95 (z +45.8) |
|   departure: fed at target | 0.315 / 0.313 / 0.325 / 0.332 | 0.321 ± 0.009 | 0.384 (z +6.3) | 0.369 (z +4.8) |
|   crown in view: per adult-day | 1.31 / 1.47 / 1.35 / 1.36 | 1.37 ± 0.07 | 1.59 (z +2.9) | 1.68 (z +4.1) |
|   crown in view: fed at target | 0.984 / 0.979 / 0.985 / 0.981 | 0.982 ± 0.003 | 0.945 (z -12.1) | 0.932 (z -16.3) |
|   a companion's trip: per adult-day | 3.61 / 3.63 / 3.43 / 3.71 | 3.60 ± 0.12 | 6.68 (z +23.0) | 7.59 (z +29.8) |
|   a companion's trip: fed at target | 0.716 / 0.691 / 0.723 / 0.726 | 0.714 ± 0.016 | 0.693 (z -1.2) | 0.673 (z -2.3) |
|   a caller: per adult-day | 1.42 / 1.51 / 1.25 / 1.46 | 1.41 ± 0.11 | 1.90 (z +4.0) | 2.12 (z +5.7) |
|   a caller: fed at target | 0.325 / 0.317 / 0.319 / 0.325 | 0.322 ± 0.004 | 0.322 (z +0.1) | 0.459 (z +29.8) |
| unfed trips: km per adult-day | 0.708 / 0.811 / 0.684 / 0.744 | 0.737 ± 0.055 | 0.901 (z +2.7) | 0.866 (z +2.1) |
| unfed trips: kcal per adult-day | 24.8 / 28.5 / 23.8 / 26.1 | 25.8 ± 2.0 | 32.2 (z +2.8) | 31.1 (z +2.3) |
| trips: km per adult-day | 1.702 / 1.885 / 1.676 / 1.775 | 1.760 ± 0.094 | 2.293 (z +5.1) | 2.383 (z +6.0) |
| delivered ÷ valued (fruit at target ÷ E0) | 0.256 / 0.256 / 0.262 / 0.256 | 0.258 ± 0.003 | 0.227 (z -9.1) | 0.218 (z -11.8) |
|   unfed, arrived, empty: per adult-day | 1.149 / 1.347 / 1.116 / 1.113 | 1.181 ± 0.112 | 1.586 (z +3.2) | 1.815 (z +5.1) |
|   unfed, departure given up: per adult-day | 2.769 / 2.770 / 2.735 / 2.719 | 2.748 ± 0.025 | 2.753 (z +0.2) | 3.005 (z +9.0) |
|   unfed, caller stopped short: per adult-day | 0.399 / 0.435 / 0.344 / 0.381 | 0.390 ± 0.038 | 0.441 (z +1.2) | 0.469 (z +1.9) |
|   unfed, re-decided en route: per adult-day | 0.759 / 0.849 / 0.696 / 0.800 | 0.776 ± 0.065 | 2.184 (z +19.4) | 2.211 (z +19.8) |
|   unfed, arrived, crop left: per adult-day | 0.655 / 0.663 / 0.615 / 0.649 | 0.645 ± 0.021 | 1.234 (z +24.9) | 1.510 (z +36.6) |
| known-tree trips per adult-day; fed | 0.832 / 0.870 / 0.777 / 0.731 | 0.802 ± 0.061 | 0.794 (z -0.1) | 0.702 (z -1.5) |
|   known-tree trips fed at target | 0.114 / 0.117 / 0.128 / 0.143 | 0.126 ± 0.013 | 0.121 (z -0.3) | 0.133 (z +0.5) |
|   known-tree trips back to one found empty (share) | 0.093 / 0.106 / 0.110 / 0.081 | 0.098 ± 0.013 | 0.075 (z -1.5) | 0.100 (z +0.2) |
| caller trips fed at the caller's crown | 0.392 / 0.377 / 0.395 / 0.387 | 0.388 ± 0.008 | 0.389 (z +0.1) | 0.550 (z +18.4) |
| caller trips: unfed km per adult-day | 0.330 / 0.378 / 0.320 / 0.354 | 0.346 ± 0.026 | 0.395 (z +1.7) | 0.323 (z -0.8) |
| caller trips re-decided en route per adult-day | 0.347 / 0.409 / 0.326 / 0.399 | 0.370 ± 0.040 | 0.535 (z +3.7) | 0.290 (z -1.8) |
|   their km per adult-day | 0.150 / 0.189 / 0.154 / 0.174 | 0.167 ± 0.018 | 0.198 (z +1.5) | 0.073 (z -4.6) |
|   E3i class km per adult-day: re-decided en route | 0.191 / 0.235 / 0.196 / 0.241 | 0.216 ± 0.026 | 0.261 (z +1.6) | 0.141 (z -2.6) |
|   E3i class km per adult-day: caller stopped short | 0.121 / 0.137 / 0.108 / 0.117 | 0.121 ± 0.012 | 0.122 (z +0.1) | 0.146 (z +1.9) |
|   E3i class km per adult-day: arrived, crop left | 0.115 / 0.128 / 0.109 / 0.123 | 0.119 ± 0.008 | 0.172 (z +5.7) | 0.213 (z +10.0) |
|   E3i class km per adult-day: arrived empty: no sighting, the list | 0.118 / 0.126 / 0.108 / 0.101 | 0.113 ± 0.011 | 0.113 (z -0.0) | 0.099 (z -1.2) |
|   E3i class km per adult-day: arrived empty: emptied by eating since the sighting | 0.044 / 0.058 / 0.049 / 0.047 | 0.050 ± 0.006 | 0.066 (z +2.4) | 0.086 (z +5.4) |
|   E3i class km per adult-day: caller, no crown | 0.052 / 0.048 / 0.054 / 0.053 | 0.052 ± 0.003 | 0.060 (z +2.8) | 0.079 (z +9.3) |
|   E3i class km per adult-day: departure given up | 0.002 / 0.003 / 0.002 / 0.002 | 0.002 ± 0.001 | 0.020 (z +31.8) | 0.024 (z +38.9) |
| ground km, adult male | 2.44 / 2.80 / 2.49 / 2.54 | 2.57 ± 0.16 | 3.28 (z +3.9) | 3.47 (z +5.0) |
| ground km, female lactating | 2.35 / 2.52 / 2.21 / 2.42 | 2.37 ± 0.13 | 3.23 (z +5.8) | 3.24 (z +5.9) |
| ground km, female other | 1.85 / 2.06 / 1.82 / 1.95 | 1.92 ± 0.11 | 2.53 (z +5.0) | 2.65 (z +6.0) |
| ground km, juvenile 5–12 y | 2.71 / 3.09 / 2.71 / 2.79 | 2.82 ± 0.18 | 3.67 (z +4.2) | 3.62 (z +4.0) |
| climbing kcal/day, adults (day-weighted) | 46.3 / 47.0 / 44.6 / 46.6 | 46.1 ± 1.1 | 65.4 (z +16.3) | 71.0 (z +21.0) |
| climbing kcal/day, adult male | 59.7 / 60.6 / 56.6 / 59.5 | 59.1 ± 1.7 | 84.7 (z +13.4) | 90.8 (z +16.7) |
| climbing kcal/day, female lactating | 38.2 / 37.3 / 35.8 / 39.0 | 37.6 ± 1.4 | 51.6 (z +9.0) | 56.0 (z +11.8) |
| T-FOOD-4 | 9.261 / 9.470 / 8.777 / 9.344 | 9.213 ± 0.303 | 13.402 (z +12.4) | 13.381 (z +12.3) |
| T-ACT-2 | 0.105 / 0.117 / 0.098 / 0.107 | 0.107 ± 0.008 | 0.142 (z +3.9) | 0.149 (z +4.7) |
| T-RNG-4 | 1.848 / 2.236 / 1.978 / 2.383 | 2.111 ± 0.243 | 2.813 (z +2.6) | 3.063 (z +3.5) |
| T-PTY-1 | 4.075 / 4.016 / 4.014 / 3.950 | 4.014 ± 0.051 | 4.219 (z +3.6) | 4.346 (z +5.9) |
| T-FOOD-2 | 0.839 / 0.836 / 0.801 / 0.866 | 0.836 ± 0.027 | 0.869 (z +1.1) | 0.866 (z +1.0) |
| T-ACT-1 | 0.373 / 0.371 / 0.370 / 0.358 | 0.368 ± 0.007 | 0.385 (z +2.3) | 0.382 (z +1.9) |
| T-ACT-3 | 0.104 / 0.101 / 0.105 / 0.106 | 0.104 ± 0.002 | 0.097 (z -3.3) | 0.094 (z -5.0) |
| T-ACT-4 | 0.437 / 0.426 / 0.427 / 0.457 | 0.437 ± 0.014 | 0.370 (z -4.2) | 0.403 (z -2.2) |
| T-HUN-1 | 21.940 / 25.788 / 17.853 / 20.166 | 21.437 ± 3.349 | 17.951 (z -0.9) | 35.707 (z +3.8) |
| T-FOOD-5 | 0.317 / 0.300 / 0.294 / 0.279 | 0.298 ± 0.016 | 0.258 (z -2.3) | 0.228 (z -4.0) |
| T-FOOD-6 | 4.731 / 4.580 / 4.350 / 4.626 | 4.572 ± 0.160 | 4.229 (z -1.9) | 3.966 (z -3.4) |
| T-FOOD-10 | 0.552 / 0.593 / 0.579 / 0.533 | 0.565 ± 0.027 | 0.547 (z -0.6) | 0.541 (z -0.8) |
| T-IGE-1 | 3.100 / 4.552 / 4.603 / 7.583 | 4.960 ± 1.882 | 10.471 (z +2.6) | 17.535 (z +6.0) |
| reserves %/day, adult male | 0.005 / 0.007 / -0.004 / -0.004 | 0.001 ± 0.006 | 0.003 (z +0.2) | 0.012 (z +1.6) |
| reserves %/day, female, other | 0.013 / 0.023 / -0.008 / 0.024 | 0.013 ± 0.015 | 0.001 (z -0.7) | -0.014 (z -1.6) |
| reserves %/day, female, lactating | 0.013 / -0.001 / -0.001 / -0.013 | -0.000 ± 0.011 | -0.012 (z -1.0) | -0.000 (z -0.0) |
| reserves %/day, juvenile 5–12 y | -0.015 / 0.002 / -0.029 / -0.009 | -0.013 ± 0.013 | -0.020 (z -0.5) | -0.028 (z -1.0) |
| reserves %/day, infant 2–5 y | 0.020 / -0.001 / -0.001 / -0.024 | -0.002 ± 0.018 | 0.012 (z +0.7) | -0.003 (z -0.1) |
| reserves %/day, infant 0.5–2 y | 0.010 / -0.000 / 0.004 / 0.010 | 0.006 ± 0.005 | -0.038 (z -7.7) | -0.009 (z -2.7) |
| eating min, adult male | 228.0 / 229.3 / 226.7 / 227.4 | 227.9 ± 1.1 | 233.6 (z +4.6) | 235.2 (z +5.8) |
| fruit share (eating), adult male | 0.944 / 0.945 / 0.944 / 0.947 | 0.945 ± 0.001 | 0.959 (z +8.2) | 0.956 (z +6.5) |
| eating min, female, other | 223.9 / 234.8 / 220.8 / 223.8 | 225.8 ± 6.2 | 230.8 (z +0.7) | 230.5 (z +0.7) |
| fruit share (eating), female, other | 0.710 / 0.680 / 0.713 / 0.733 | 0.709 ± 0.022 | 0.721 (z +0.5) | 0.736 (z +1.1) |
| eating min, female, lactating | 302.6 / 300.9 / 292.2 / 291.5 | 296.8 ± 5.8 | 313.9 (z +2.7) | 305.3 (z +1.3) |
| fruit share (eating), female, lactating | 0.685 / 0.683 / 0.719 / 0.720 | 0.702 ± 0.020 | 0.684 (z -0.8) | 0.703 (z +0.1) |
| eating min, juvenile 5–12 y | 274.8 / 277.2 / 282.6 / 277.8 | 278.1 ± 3.3 | 290.6 (z +3.4) | 285.5 (z +2.0) |
| fruit share (eating), juvenile 5–12 y | 0.920 / 0.910 / 0.839 / 0.835 | 0.876 ± 0.045 | 0.929 (z +1.1) | 0.926 (z +1.0) |

Sums on rows scored in every run listed (fitted / held-out; with rare rows, then without T-HUN-4, T-BRD-1, T-IGE-3):
  S39q: 1.98 / 4.49; 1.98 / 4.49
  S39q1: 2.24 / 11.03; 2.24 / 4.41
  S39q2: 1.56 / 3.72; 1.56 / 3.66
  S39q3: 1.41 / 5.91; 1.41 / 3.21
  D0: 1.02 / 3.59; 1.02 / 3.55
  D1: 2.28 / 3.23; 2.28 / 3.14
D0: identity (adult males' eating min, ground km) 233.624 / 3.276; energy-diagnose 233.6244332563291 / 3.275962432995234; living [(49, 48, {'illness': 1}), (49, 49, {})]
D1: identity (adult males' eating min, ground km) 235.183 / 3.472; energy-diagnose 235.18303571428572 / 3.472404084594729; living [(49, 49, {}), (49, 49, {})]
```

**Reading.** Re-deciding's walking cost does not fall with `callTrip` 1: on S39 it adds 0.71 km a day for adult males,
0.85 for nursing mothers, 0.61 for other females and 0.85 for juveniles, 19 kcal of adults' climbing and 6.2 trips per
adult-day; on A1 1.06, 0.91, 0.87 and 0.78 km, 27 kcal and 8.5 trips (the males' and other females' differences are about
2 SD of the group's walking, the others within it). The keep test re-decides caller trips again (0.29 per adult-day
re-decided en route in D1 against 0.07 in A1), and hunting rises with it on A1 (T-HUN-1 35.7 against 12.0; E3g's
re-sighting correction is not on the stack). The energy cost moves the other way for nursing mothers and young infants
(−0.001 and +0.000 %/day on A1 against −0.012 and −0.043 on S39), for other females it is larger (−0.021 against −0.012):
single runs, inside a draw's reach. So failed caller trips are not what makes re-deciding costly on S39; its cost is the
keep test's extra trips, as E3g found, and S39's trip corrections (E3h) already halved it from S31's (+1.44 km for males).

### 6.3 The brief's table (S39q group mean ± SD against each arm; z in brackets; sums judged one arm at a time, §6.1, §6.2)

```
| | S39q mean ± SD | A1 | D0 | D1 |
| --- | --- | --- | --- | --- |
| trips fed at target | 0.556 ± 0.009 | 0.555 (-0.1) | 0.567 (+1.1) | 0.565 (+0.9) |
| ground km, males | 2.57 ± 0.16 | 2.41 (-0.9) | 3.28 (+3.9) | 3.47 (+5.0) |
| ground km, nursing mothers | 2.37 ± 0.13 | 2.33 (-0.3) | 3.23 (+5.8) | 3.24 (+5.9) |
| ground km, juveniles 5–12 y | 2.82 ± 0.18 | 2.85 (+0.1) | 3.67 (+4.2) | 3.62 (+4.0) |
| climbing kcal/day, adults | 46.1 ± 1.1 | 44.3 (-1.6) | 65.4 (+16.3) | 71.0 (+21.0) |
| T-FOOD-4 | 9.21 ± 0.30 | 9.71 (+1.5) | 13.40 (+12.4) | 13.38 (+12.3) |
| T-ACT-2 | 0.107 ± 0.008 | 0.103 (-0.4) | 0.142 (+3.9) | 0.149 (+4.7) |
| T-RNG-4 | 2.11 ± 0.24 | 2.05 (-0.2) | 2.81 (+2.6) | 3.06 (+3.5) |
| reserves %/day, males | 0.001 ± 0.006 | -0.004 (-0.8) | 0.003 (+0.2) | 0.012 (+1.6) |
| reserves %/day, nursing mothers | -0.000 ± 0.011 | 0.000 (+0.1) | -0.012 (-1.0) | -0.000 (-0.0) |
| reserves %/day, juveniles | -0.013 ± 0.013 | -0.026 (-0.9) | -0.020 (-0.5) | -0.028 (-1.0) |
| reserves %/day, infants 0.5–2 y | 0.006 ± 0.005 | -0.010 (-2.7) | -0.038 (-7.7) | -0.009 (-2.7) |
| fitted (16 rows; z) | 1.80 | 1.76 (-0.1) | 1.02 (-1.0) | 2.28 (+0.6) |
| held-out (13 rows; z) | 6.28 | 4.78 (-0.4) | 3.59 (-0.7) | 3.23 (-0.8) |
| held-out w/o rare (12 rows; z) | 3.94 | 4.06 (+0.2) | 3.55 (-0.6) | 3.14 (-1.2) |
| prescriptions (JSON; current ledger S39 42) | 42 | 42 | 39 | 39 |
| viability (deaths; starvation) | 0, 0, 1, 0 | pass (0; 0) | pass (1; 0) | pass (0; 0) |
```

## 8. Stage verdict

- **Diagnosis (S39, quick, four realizations, simulation truth).** 56% of adults' trips feed at their target crown. Of the
  44% that do not, half are departures nobody answered, which move about 2 m. **Trips that arrive at a crown emptied by
  eating since the traveller's sighting are 8% of unfed trips and 7% of their walking: the brief's premise is not
  supported.** For those trips the animal could have known: 95% had seen or heard the eaters in between (saw them heading
  there 84%, heard a pant-hoot from the crown 57%, saw them feeding there 29%), and 54% of the fruit taken was eaten by
  animals it saw heading there, heard calling from there or saw feeding there; food grunts, which no animal hears in the
  model, 2.5%. A prior from community size and intake rates would predict almost nothing (a community eats 1–2% of its
  range's ripe crop a day; the crowns trips go to lose 5–14% within 12 h because consumption concentrates where the animals
  are). The largest share of unfed walking is trips to callers (47%), mostly ended on the way with their option off the
  list: the listener holds one call, overwritten by every later pant-hoot heard (two thirds of that walking; the walk then
  follows the new caller's crown, a trip never chosen) or offered for only 0.3 h (a quarter).
- **Iteration 1, `callTrip` 1** (a caller trip keeps the call it was chosen for: walk, arrival and option from that call;
  a later call is a new option): **recorded, off** by the registered rule (trips fed at their target 0.555, z −0.1). It
  works on its target: caller trips feed at their target 47% instead of 32%, re-decided en route 0.07 instead of 0.37 per
  adult-day, the walking wasted on caller trips −30% (z −3.5), all unfed walking −14% (inside the spread). The share of all
  trips that feed does not move: departures nobody answers rise as listeners reach their callers and parties grow (T-PTY-1
  4.34, z +5.7), and remembered-crown trips feed a little less. Viable, night safe (2.21%), every sum inside noise,
  prescriptions 42; infants 0.5–2 y −0.016 %/day against the group (z −2.7, under the kill line); no juvenile cost of the
  kind E3h's A2 had.
- **No iteration 2:** no class of unfed walking reaches the registered 1/4 on S39 or A1.
- **Diagnostic (A1 + `redecideValue` 2):** re-deciding still adds 0.8–1.1 km a day per class (0.6–0.9 on S39) and more
  climbing; its cost is the keep test's extra trips, not the failed trips it multiplies.
- **What it means.** The trips that fail are not mostly trips to crowns others emptied, so a belief about others' eating
  would act on 7% of the wasted walking. The walking that failed trips cost is spread over several small classes, and the
  largest one was a memory defect (a call held in one slot), which a correction fixes without changing how often trips
  feed. Re-deciding's cost is not failed trips.
- **Open (the biggest problem).** Re-deciding's cost (0.6–1.1 km a day per class) is the keep test acting on a valuation
  that promises more from a trip than trips deliver: on S39 trips deliver 26% of the bout energy they are valued at
  (delivered ÷ valued 0.258; 44% do not feed at their target, and a fed trip eats about half the promised bout), so at each
  keep test a trip beats staying more often than it pays, and under `redecideValue` 2 trips rise from 13 to 19–21 per
  adult-day at the same fed share. Failed trips are not the lever; E3g's open question (what meal a trip should promise,
  against a bout in view that ends sated as early) is.

## 7. Known defects in the code under test

Deferred (found by the diagnosis, not this stage's question; file:line at c90d7bf):
- Food grunts are given (execution.ts, `gruntWorth`, `hearFoodGruntM` 50 m) but never heard: events.ts:91 pushes only
  pant-hoots, drums, alarm hoos, screams and travel hoos to listeners. A food grunt given in a crown carries the place and
  the act; 2.5% of the fruit eaten from crowns that trips later found emptied was eaten by animals that gave one within 50 m
  of the traveller (§2.2).
- A caller's crown the listener has not seen is valued at the unknown crop 0.2 (candidates.ts:615, `UNKNOWN_CROP`'s value),
  and under `callValue` a pant-hoot at a crown costs the caller nothing when the crown is empty (calls.ts:72, `cropLoss`
  returns 0 for a crop ≤ 0): 12–14% of caller trips to a crown set out toward a crown already below 0.06 units and almost
  none of them feed (0.0–1.0%).
- 'caller, no crown' trips (calls not given in a crown; 0.17 per adult-day, 0.052 km) are approaches to a companion with no
  food target, but E3h's readout counts them among unfed trips.
- Departures given up (2.7–2.8 per adult-day) are counted as trips by E3h's readout although they move ~2 m (E3h §7).
- With `callTrip` 1 the amendment-1 readouts (`cSame`, `jtSame`) compare a caller trip with the listener's slot, not with
  its own record; they diagnose today's code only.
- A joined trip's option is offered only while the leader's departure is (candidates.ts, `joinValue` offers): when the
  leader is out of view or arrives, a follower still walking loses the option and the next decision point ends its trip
  (0.14 joined trips per adult-day re-decided en route with their option off the list, 0.020 km; §2.2 D5).

## 9. Merge and final checks

`track-e` merged once (6a1bfe4, at the integrator's word: the protocol freeze has not landed and the switch does not depend
on it) before the final test run; no conflicts. `docs/decision-guide.html` regenerated (only its file:line references
moved with the code). `gen-params --check` clean, `tsc --noEmit` clean, `decision-guide --check` up to date, `pnpm test`
857 tests: 856 pass, 0 fail, 1 skipped; `git ls-files data/raw node_modules` empty. Prescriptions on the merged ledger
(`prescription-ledger --count`): S39 42, S39 + `callTrip` 1 42 (no counted entry removed, as registered). Outputs (local,
gitignored, copied from the session scratch `e3i/`): `artifacts/validation/e3i/` holds `diag/` (the four diagnosis runs,
raw trips gzipped, `diag_table.md`), `diag2/` (amendment 1's runs, `amend_table.md`), `arms/` (A1, D0, D1: e-bench,
energy, trip and rhythm JSON, logs and tables), `tools/` (`diag_table.py`, `amend_table.py`, `final_table.py`,
`arm_classes.py`, `report_table.py`, `redecide_cost.py`, the run scripts), `params/`, `smoke/`.
