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
