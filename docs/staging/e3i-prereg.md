# E3i pre-registration: trips to crowns others emptied

Status: skeleton committed at the start of the stage (branch `e3i-unseen-eaters`, from `track-e` b6946ac), before any run and
before any code change. Track E, stage E3i. Rule served: field values of behaviour are targets to benchmark against, never
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
