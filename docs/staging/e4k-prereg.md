# E4k pre-registration: why a hunt succeeds (capture from the pursuit, not a die)

Branch `e4k-hunt-success` from `track-e` b3d28c7. Track E, stage E4k. Rules policy only; development seeds 48 and 7;
no run longer than 90 days in all (this stage uses 30 + 60-day runs, as the cap allows). Started 4 October 2026, 04:15.

This file is written in steps, each committed before the step it governs: §1–§2 (problem, target audit) and the
diagnosis plan (§3) before the diagnosis runs on unchanged code; §4–§8 (mechanism, readouts, arms, predictions, kill
criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 1. The problem (from the brief and the S17 record; verified in §3)

- On S17 (the best integrated candidate, 49 prescriptions; `docs/staging/e-stack2-confirm.md` "S17 results") whether a
  hunt succeeds is one draw in `resolveHunt` (`src/sim/ecology.ts:73`): with n ≥ 2 hunters still hunting within
  `huntCaptureRangeM` (field 30 m) of the colobus group's point when the hunt resolves (5–11 min after it starts),
  success has probability `huntSuccessMax` 0.8 × (1 − exp(−`huntSuccessRate` 0.3 × (n − 1))). Both parameters are
  counted prescriptions encoding T-HUN-2 (`scripts/lib/prescriptions.ts`).
- Extra captures are a second die: each other hunter captures with probability `huntExtraKillP` (field 0.17; counted,
  encoding T-HUN-7) while the group has more than 4 members.
- The captor is drawn by skill × 0.6 plus a hash; nothing about where the hunters are, the canopy, the colobus group's
  size or its adult males, or the hunters' state enters the outcome.
- `src/sim/huntvalue.ts` (`huntValue`, on in S17) values a hunt with the same curve (the hunter's expectation).
- Success is below its band on the stack: T-HUN-2 0.219 ± 0.079 on S16's four confirm runs, 0.347 on S17 (band
  0.5–0.8; gilby2015, mitaniWatts1999, wattsMitani2002).
- Field picture to model from first principles (sources opened in §2): red colobus escape through the canopy; capture
  depends on how many hunters there are and where they are (blocking escape routes, climbing), the canopy's
  continuity, the monkeys' group size and adult males' defence, and the hunters' own condition and skill.

## 2. Target audit and sources (step 0; written 04:40, before the diagnosis runs)

Rows scored: T-HUN-1..8 (`data/targets.json`; T-HUN-5 and T-HUN-6 need a year and are insufficient under the cap).
Sources grepped first in `docs/research.md` and `docs/staging/e-sources.md`: gilby2015 (FT, read in full by E4f through
the PMC article page), mitaniWatts1999 (FT, author PDF, research.md "Ngogo hunting"), mitaniWattsMuller2002 (FT,
review, E.29), wattsMitani2002 and mitaniWatts2001 (closed; values as recorded in the registry; E4e could not open
them), stanford1994 (abstract). A search helper is re-opening the success sources now (§2.3, added before §4 is
written); new sources go into research.md and e-sources.md first, as "Addendum: E4k hunt success".

### 2.1 Samples of the rows

| Row | Population, years | Sample and method (as recorded unless marked) |
| --- | --- | --- |
| T-HUN-1 hunts per community-year | Kanyawara 1996–2014; Ngogo 1995–99 | 194 red colobus hunt attempts in 224 months at 11.4 adult males (gilby2015, FT via E4f: party follows by field assistants; a hunt attempt = a chimpanzee climbs to the height of the lowest monkey); Ngogo 45.1 successful hunts a year at ~24 adult males (wattsMitani2002, not verified). Community-level counts: no sex, reproductive-state or mass restriction. Band 5–25 never scaled to the model's 3–7 males (E4e §2.3; staged 4–11, not applied). |
| T-HUN-2 success | Kanyawara; Kasekela; Mitumba; Ngogo | Share of hunts with ≥ 1 capture: 0.613 (119 of 194), 0.623 (1,498 hunts), 0.532 (gilby2015, FT via E4f for Kanyawara); Ngogo 0.73 (36/49 all prey), red colobus 0.78 (32/41) (mitaniWatts1999, FT), 0.82 (67/82) (wattsMitani2002). Community level; hunters are mostly adult and adolescent males. |
| T-HUN-3 hunted share of encounters | as T-HUN-1 | 0.079 of 2,461 encounters (Kanyawara, 100 m, 15-min party scans); Gombe 0.647, 0.480 (50 m, focal); Ngogo 0.37 (61/164, mitaniWatts2001, definition not recorded). The model's observer counts it on focal follows with a change-of-group rule (E4f §2.2; staged scorer fixes not applied). |
| T-HUN-4 odds per male | the three gilby2015 communities | Logistic regression of hunting per encounter on adult males in the scan (+48%, +8%, +72%). Rare-event row. |
| T-HUN-7 kills per success | Kanyawara; Kasekela; Mitumba; Ngogo 1995–98 | 1.28 (152 prey in 119 successes, gilby2015 Table 1 via E4f), 1.90, 1.30; Ngogo 3.41 ± 1.79 (n = 32, mitaniWatts1999) with 15.2 adult males present (wattsMitani2002). Band 1.2–2.0 ("3–7 males"). |
| T-HUN-8 adult males' share of kills | Ngogo 1995–98, 1995–99; Gombe 1982–91 | 0.86 of 90 kills (mitaniWatts1999), 0.90 of 261 (wattsMitani2002), 0.893 (stanford1994, abstract). |

**What success depends on in the field (as recorded; §2.3 re-reads):** party size and the number of male hunters
predict success (mitaniWatts1999; mitaniWattsMuller2002: "Male chimpanzees appear to swamp red colobus prey defenses
with strength in numbers"); hunts where the canopy is broken succeed more (Ngogo, success 92% against 55% in tall
primary forest, wattsMitani2002 via P-HUN-3 in realism-design.md; mitaniWattsMuller2002 states the direction); red
colobus males mob hunters (mitaniWattsMuller2002 citing Busse 1977 and Stanford 1995). Small communities still succeed
about half the time (Mitumba 0.532).

### 2.2 What the model's resolution contains (code at b3d28c7)

- Hunters move to a point 2 m from the colobus group's point at a bearing set by a hash of the hunter's and the group's
  ids, at 0.85 × its height (17 m), running at 2 m/s and climbing at 0.22 m/s (`execution.ts` 'hunt'; `climbMps`
  stylized). The hunt resolves 5–11 min after it starts (a hash; `huntResolveMinMin`, `huntResolveSpanMin`, design).
- Counted at the resolution: alive, still in the hunt action on this group, within `huntCaptureRangeM` (30 m field).
- Success = one draw against the curve (§1); the captor = argmax of 0.6 × skill + a hash; extra captures one draw each
  at `huntExtraKillP` while the group has more than 4 members.
- The colobus group is a point with a size (14–37, literal) and an alert level; no sex or age composition, so no males
  to defend it. The model's trees are food patches (9.8 per ha inside the community zones, 0.5 outside; crown radius
  2.5–9 m), not the forest canopy: nothing in the model represents canopy continuity.

## 3. Diagnosis plan (step 1; unchanged code; committed before it runs)

### 3.1 Hunt reference (unchanged code; registered before its runs)

The quick reference (S17q and its three re-draws, the integrator's, bench-run2 37f04e8) judges the sums. Hunting rows
rest on a handful of hunts in 30 days, so this stage also runs S17 at 30 + 60 days on seeds 48 and 7, once plus one
re-draw, as its hunt reference:

- **H0** = S17 (`artifacts/validation/e/s17q/S17q-params.json` in bench-run2), `e-bench --seeds 48,7 --burn-in 30
  --days 60` (custom), and **H0r** = the same plus `rgTemperature` 0.1641. Frozen detached checkout of b6630b9 in the
  stage scratch directory (`…/scratchpad/e4k/ref`; simulation code identical to b3d28c7 and to bench-run2 37f04e8),
  `--workers 2` while the load is below 8 (else 1), one run at a time. Outputs `artifacts/validation/e4k/{H0,H0r}.json`
  in that checkout (copied to this worktree's gitignored `artifacts/validation/e4k/`).
- Every hunt row of every arm is reported against H0 and H0r (mean of two), beside the quick judgement.

H0 and H0r ran at 04:20–04:27 (b6630b9, `git.dirty` 0). Their seed values equal the integrator's S17 confirm on
seeds 48 and 7 (T-HUN-1 34.47 / 18.15, T-HUN-2 0.727 / 0.200): the same world.

### 3.2 Diagnosis tool (registered before it runs)

`scripts/e4k-hunt-diagnose.ts` (read-only, sim truth; header lists every readout) on S17, seeds 48 and 7, 30-day
burn-in + 60 days (the hunt reference's world: createWorld + tickWorld as `src/field/run.ts`), one seed at a time.
It reads the scene each outcome is decided on through `huntTap` (`src/sim/ecology.ts`), a hook that is null in the
simulation and draws nothing: `resolveHunt` now computes the success probability and the draw into locals before the
branch, with the same `random` calls in the same order. **Identity:** S17 after 2 days (seeds 48 and 7) and 25 days
(seeds 7 and 48, including a successful hunt on seed 7) gives the same world hash with and without the hook
(8cf9a253bfee1100, 5505c10ab3b8baff; bda608df593f3ab2, 92dbdddf67512f30). **Tool check:** truth hunts and captures per
seed must equal e-bench's (H0's scorecard counts).

Per hunt: the hunters listed and counted (n), why listed hunters were not counted, each hunter's class, skill, hunger,
reserves ÷ usable store, foregut fill, energy need, arousal, injury, minutes to join, distance and height below the
group at the resolution; the largest angular gap between counted hunters around the group; the alerted community
members ≥ 12 y within `huntAlertM` of the leader at the start and what those who never joined were doing; the model's
trees around the group (nearest crown edge, crowns within 25 and 50 m, crown cover within 25 m, crowns within 2 and 5 m
of the group's crown); the success probability, the draw, the outcome, captors and extra-capture draws; group size.
Table by `artifacts/validation/e4k/diag_table.py` (pooled seeds) from `artifacts/validation/e4k/diag/S17-{48,7}.json`.

**Reading rules, fixed now.** "What the dice decide": among hunts with n ≥ 2 the outcome is the draw against P_s(n);
reported as the share of hunts decided by the draw, the share failed by n < 2 (and why the listed hunters dropped
out), and the spread of each scene variable across hunts and by outcome (the scene enters nothing by construction, so
any association is the draw's chance). A scene variable is "implicated" for §4 only if (a) it varies across hunts
enough to change a pursuit's outcome in the field picture (§2.1) and (b) the model carries it with a sourced or
physical meaning. Expected (moderate confidence): n is small (2–3), the curve gives 0.21–0.36 there, and the model
has no canopy continuity and no colobus composition to carry.

### 3.3 Diagnosis result (45c6df1 frozen; S17, seeds 48 and 7, 30 + 60 days; `diag_table.py` from `diag/S17-{48,7}.json`)

Tool check: 28 and 18 hunts, 10 and 3 captures-successes on seeds 48 and 7: truth T-HUN-1 46.6 and truth T-HUN-2 0.262
(mean of seeds), exactly H0's. The diagnosis watched e-bench's hunts.

| readout (truth, both seeds) | S17 |
| --- | --- |
| hunts resolved; per community-year | 46; 46.6 |
| success | 13 of 46 = 0.283 (mean success probability of the draws 0.227) |
| hunts with 1 hunter counted at the resolution (fail by the n ≥ 2 rule, no draw) | 11 (0.239); in 10 of them nobody else ever joined |
| hunts decided by the draw (n ≥ 2) | 35 (0.761): 20 with n = 2 (6 successes, P_s 0.207), 8 with 3 (4, 0.361), 6 with 4 (2, 0.475), 1 with 5 (1, 0.559); expected 10.4 successes, observed 13 |
| hunters per hunt: listed / counted / adult males counted | 2.33 / 2.26 / 2.11; listed hunters dropped at the resolution: 3 of 107 |
| alerted at the start (community ≥ 12 y within 100 m of the leader) | 3.4 per hunt, 1.8 adult males; about 61% of alerted adult males joined; those who never joined were mostly foraging or resting |
| captures; per success; extra-capture draws (0.17) | 18; 1.385; 24 draws, 5 extra captures |
| captures per counted hunter (meat units per hunter-participation) | 0.173 |
| captors | 16 adult males, 1 adolescent male, 1 female; the most skilled counted hunter in 8 of 18 |

What the scene holds at the resolution (10% / median / 90% over hunts):
- **Positions:** counted hunters 2.3 m (90%: 3.4 m) from the group's point; their bearings are set by a hash of the
  hunter's and the group's ids (the approach target), so the arrangement is arbitrary: the group lies inside the
  hunters' convex hull in 2 of 46 hunts. **Climbing:** 100 of 103 counted hunters sit exactly 2.55 m below the group
  (0.85 × 17 m, the approach target). **Skill:** 0.54–0.65 (adult males start at 0.63, design, +0.01 per hunt).
  **Condition:** hunger 0.13–0.37, reserves ÷ store −0.027 to 0.000, injury 0–0.006.
- **Colobus group:** size 17–34 (literal 14–37, unsourced); no sex or age composition (no males to defend).
- **Canopy (the model's trees):** crown cover within 25 m of the group 0.025 / 0.085 / 0.151; the group's point lies
  inside a crown in 5 of 46 hunts (nearest crown edge −1.3 / 10.0 / 19.9 m); in 27 of 46 no other crown lies within 5 m
  of the edge of the group's nearest crown. These trees are the food patches (feeding-size fruit trees, 9.8 per ha in
  the community zones, janmaat2016), not the forest canopy: the colobus move freely between them at 17 m, so in the
  model the canopy is implicitly continuous everywhere and the trees play no part in their movement.
- Minutes from start to resolution: 5.5 / 8.1 / 10.6 (a hash).

**What the dice decide that the scene could (finding).** The outcome of 35 of 46 hunts (76%) is the draw against
P_s(n): given n, nothing in the scene enters it, although the scene varies (group size 17–34, hunters' hunger
0.13–0.37). The other 11 (24%) fail by rule (one hunter left; a solo capture is impossible by construction). Extra
captures are 24 draws at 0.17. Of the field picture's determinants, the model carries the number of hunters (emergent
from joining), the colobus group's size and the hunters' condition with a physical meaning; it carries the hunters'
positions, climbing and skill only as degenerate stand-ins (hash bearings, a fixed height, a near-constant design
skill), and it does not carry the canopy's continuity (no structure the colobus move in) or the colobus' composition
and defence. The low success is the design curve at small n (0.21 at 2 hunters against 0.53–0.61 for Kanyawara and
Mitumba hunts) plus the n ≥ 2 rule on solo hunts.

### 2.3 What the sources re-read this stage add (research.md "Addendum: E4k hunt success"; written before §4)

- Kibale's forest has a high, continuous canopy (Ngogo 25–30 m, mitaniWatts1999 FT); there "mostly noncooperative
  chimpanzees" succeed by "massing large numbers of hunters, whose largely opportunistic pursuit tactics make their
  hunts highly successful"; colobus mobbing is "largely ineffective"; cooperation "is generally lacking during hunts at
  all East African study sites". Success rises with party size and male hunters (mitaniWatts1999 Table 4 and its
  review of Taï and Gombe). In tall continuous canopy lone hunters rarely succeed (Taï 16% against 61% for group hunts,
  3.08 hunters per hunt; one monkey in 84% of successes; samuni2018cb FT); broken canopy makes capture easier (Ngogo,
  Gombe; abstracts). A community of 2.9 adult males (Mitumba) succeeds 53.2% with 1.30 prey per success (gilby2015).
- So for the model (Kibale, continuous canopy): the colobus escape through the canopy in any direction; what cuts the
  escape off is the hunters around them, each pursuing on his own; males' defence is not decisive. The canopy's
  structure (gaps) is the field's second determinant and the model has none: not built (§4.4).

## 4. Mechanism (switch `huntPursuit`, 0 = today; registered before any run of changed code)

### 4.1 Capture from the pursuit (`src/sim/huntpursuit.ts`, read by `resolveHunt`)

At the resolution (the existing moment, 5–11 min after the start, design) with `huntPursuit` 1:

1. **Who is in the pursuit:** the listed hunters still hunting this group within `huntCaptureRangeM` (today's filter)
   **and at canopy height**, i.e. no more than 0.5 m below the approach height (0.85 × the group's height, today's
   approach target): hunters are those "chasing prey at canopy height" (samuni2018cb's definition). A hunter still on
   the ground or on the trunk cuts nothing off (climbing).
2. **What each cuts off:** a fleeing monkey moving straight away at speed v_e from a pursuer at speed v_p = k·v_e is
   intercepted only if it flees within asin(k) of that pursuer's bearing (the Apollonius circle; for k ≥ 1 every
   direction, a faster pursuer catches it). k_i = `huntPursuitSpeedRatio` × the hunter's own movement factor (the
   model's `speedFactor` terms for age, injury and alertness, without rain and light, which slow the colobus too):
   `huntPursuitSpeedRatio` 1 (design: a prime, rested, uninjured adult chimpanzee pursues as fast as a red colobus
   flees through the canopy; no measurement of either speed was found, so neither is assumed faster). Condition enters
   here: a tired, injured or old hunter covers a narrower cone.
3. **Capture:** the group is trapped when the hunters' cones leave no escape direction (with a 0.001-rad margin, so two
   hunters exactly opposite do not close it). At k = 1 this is the classic result that an evader is caught exactly when
   it lies inside the convex hull of equally fast pursuers: it needs at least three hunters around the group; one or
   two never trap it in continuous canopy.
4. **Kills from the same scene:** one monkey per disjoint set of hunters that closes the circle, found greedily (the
   smallest closing set first, ties by join order; each later set from the hunters left). Each set's captor is its
   member with the highest 0.6 × skill + hash (today's rule: skill decides who seizes the monkey). Extra captures only
   while the group holds more than 4 (today's guard). No draw from `world.rng`.

### 4.2 Where the hunters go (`execution.ts` 'hunt', under the switch)

Each hunter heads for the widest escape gap left by the other hunters still hunting this group (the middle of the widest
angular gap between their bearings, seen from the group), or straight at the group when alone: the monkeys flee where no
one is, so a hunter after a monkey of his own goes there (individually opportunistic, not a coordinated role:
mitaniWatts1999). Standoff 2 m and height 0.85 × the group's (today's approach target, design). In the canopy he moves
around the group by at most a 2.5 m chord per tick, because the movement engine makes an animal climb down for any goal
more than 3 m away (a movement constraint, not a behavioural value). This replaces the approach bearing drawn from a
hash of the hunter's and the group's ids (a stylization).

### 4.3 The valuation expects the same (`huntvalue.ts`, same function, no second curve)

`huntRate` under the switch: expected meat E = min(energy need, `meatKcalPerUnit` × captures(n) ÷ n), where captures(n)
is `pursuitCaptures` (§4.1) on n hunters evenly spread around the group (where §4.2 leads them), each with the leader's
own k (his expectation); n = adult males in view, himself included (E4e's design: they join). Offered only if
captures(n) > 0. Time T and the crown currency unchanged.

### 4.4 Not built, with the reason

Canopy structure (gaps, broken canopy): the model has none; its trees are food patches covering 2.5–15% of the ground
around hunts (§3.3), so reading them as a canopy would make every hunt a broken-canopy hunt. Colobus composition and
males' defence: no composition in the model; mobbing ineffective at Ngogo. Colobus individuals spread over many trees:
the group stays a point. Joining (`huntJoinSkillW`, the hand-set join value, `candidates.ts:1088`): unchanged; deferred.
The hunter's expectation that every male in view joins (`huntvalue.ts`): unchanged; deferred. The colobus drift speed
(0.025 + 0.1 × alert m/s, `ecology.ts:30`, a literal): not the escape speed; unchanged.

### 4.5 Registry and ledger

New: `huntPursuit` (switch, 0/1, design) and `huntPursuitSpeedRatio` (1, ratio, design). Removed under the switch
(`ACTIVE_WHEN` in `scripts/lib/prescriptions.ts`): `huntSuccessMax`, `huntSuccessRate` (T-HUN-2) and `huntExtraKillP`
(T-HUN-7): S17's count 49 → 46. If the count does not fall by three, `scripts/param-reads.ts` checks the tool.

## 5. Readouts (defined before any arm; smoke-tested with the switch on, §9)

- e-bench rows T-HUN-1..8 (definitions in `src/field/metrics.ts`: T-HUN-2 "share of observed hunts with at least one
  capture (gilby2015)", T-HUN-7 "captures per successful observed hunt (gilby2015)", T-HUN-8 share of captures by adult
  males); sums with and without T-HUN-4 and T-BRD-1, and without T-IGE-3; prescriptions; viability; deaths by cause.
- Truth (`scripts/e4k-hunt-diagnose.ts`, §3.2 definitions, extended for the switch: hunters in the pursuit, their cone
  half-angles, closing sets): hunts per community-year, success, success by hunters in the pursuit, kills per success,
  captures per hunter in the pursuit (meat per hunter), solo and pair resolutions, captors by class.
- `scripts/energy-diagnose.ts` (seeds 48 and 7, 30 + 30 days, as the integrator's S17q energy runs): reserves ÷ store
  %/day of nursing mothers and juveniles.

## 6. Arms and predictions (stated before any run of changed code)

**P1** (iteration 1) = S17 + `huntPursuit` 1, from a frozen checkout of the switch commit, rules policy:
(a) `e-bench --quick` (seeds 48, 7; 30 + 30 days) judged with `judge_vs_reps.py quick custom` against S17q, S17q1–3;
(b) `e-bench --seeds 48,7 --burn-in 30 --days 60` (hunt rows against H0 and H0r); (c) the diagnosis tool on seeds 48
and 7, 30 + 60 days; (d) energy-diagnose as above.

Predictions against S17 (moderate confidence unless stated):
- Truth: no hunt resolves with a capture by one or two hunters in the pursuit (high: geometry). Leaders no longer start
  hunts with two adult males in view (their value is 0; high); hunts per community-year fall from 46.6 but stay above 5
  (the value of a hunt with three or more males roughly doubles). Success (truth) 0.5–0.8, set by how many alerted males
  join. Kills per success 1.0–1.3 (parties of three to five close one circle).
- Rows: T-HUN-2 up, into its band 0.5–0.8; T-HUN-1 down, inside 5–25; T-HUN-3 down, further below its band (high);
  T-HUN-4 up (rare row; likely above 1.8); T-HUN-7 1.0–1.3 (may fall below 1.2); T-HUN-8 ≥ 0.8.
- Sums (quick, against the four S17q runs): fitted inside noise (T-HUN-2's gain against T-HUN-3's and T-HUN-7's
  losses), held-out inside noise with and without the rare rows and without T-IGE-3. Prescriptions 46 (high). Viability
  passes; mothers' and juveniles' reserve trends inside S17q's spread (hunting is about 0.1% of males' daylight).

## 7. Kill criterion

`huntPursuit` stays off (null, recorded) if viability fails, if held-out without T-HUN-4 and T-BRD-1 rises beyond noise
(z > +2 against the S17q mean), or if the prescription count is not 46. If hunting nearly vanishes (truth below 5 hunts
per community-year, pooled), the result is a finding (the pursuit at the model's party sizes cannot pay), not a keep
candidate. Otherwise a provisional keep candidate for a 5-seed confirm on the stack.

## 8. Iterations and known defects

At most 3 iterations, each logged in §9 and committed before its run; a further iteration only for what P1's readouts
implicate (for example, joining, if too few alerted males join for three to surround). Deferred defects (file:line at
793d3da): the hand-set join value (`src/sim/candidates.ts:1088`); the leader's expectation that every male in view joins
(`src/sim/huntvalue.ts:21`); the colobus drift literal (`src/sim/ecology.ts:30`); the group-size literal 14–37
(`src/sim/generation.ts`, `spawnPrey`); the resolution time drawn by hash (`src/sim/execution.ts:347`, design).

## 9. Results

### Run log (each entry written before its run)

- **I1 identity (switch commit; run before this entry was written, unchanged code paths at 0).** S17 with `huntPursuit`
  0 gives the §3.2 hashes again: 8cf9a253bfee1100 and 5505c10ab3b8baff (2 days, seeds 48 and 7), bda608df593f3ab2 and
  92dbdddf67512f30 (25 days, seeds 7 and 48; one successful hunt on seed 7). Prescription count: S17 49, S17 +
  `huntPursuit` 46 (`--count`). Unit tests: `tests/sim-hunt-pursuit.test.ts` (10 pass).
- **S1 smoke (before any arm).** Frozen checkout of the switch commit: S17 + `huntPursuit` 1 through
  `scripts/e4k-hunt-diagnose.ts`, seed 7, no burn-in, 25 days: every §5 truth readout is produced (hunters in the
  pursuit, cone half-angles, closing sets), no capture resolves with fewer than three hunters in the pursuit, and the
  success probability and draw are empty.
- **P1 (iteration 1).** Same frozen checkout; S17 + `huntPursuit` 1 (`P1-params.json` = S17q-params + `"huntPursuit":1`):
  (a) `e-bench --quick --workers 2 --out artifacts/validation/e4k/P1q`; (b) `e-bench --seeds 48,7 --burn-in 30 --days 60
  --workers 2 --out artifacts/validation/e4k/P1h`; (c) the diagnosis tool, seeds 48 and 7, 30 + 60 days
  (`artifacts/validation/e4k/diag/P1-{48,7}.json`); (d) `scripts/energy-diagnose.ts` seeds 48 and 7, burn-in 30, 30 days
  (`P1q-energy.json`). One at a time, `--workers 1` above load 8. Judged by §6–§7.

#### S1 result (9b3f213 frozen; seed 7, 25 days, no burn-in)

Every §5 truth readout is produced. Two hunts resolved (S17 on the same window: six), each with three hunters in the
pursuit at cone half-angles 74–80° (alertness 0.75–0.85), largest angular gap 144° and 147° (below the 148–160° the
cones need), one closing set and one capture each; success probability 0 and no draw. P1 launched next (04:57).

#### P1 result: quick (9b3f213 frozen, `git.dirty` 0; against S17q, S17q1–3 at bench-run2 37f04e8; printed by `artifacts/validation/e4k/report.py P1` from the JSON)

```
P1q.json: 9b3f213 dirty 0 prescriptions 46

quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 13
  fitted             (17 rows) ref 1.50, 0.94, 2.08, 3.66 (mean 2.04, sd 1.17; used 1.17) | P1q.json: 1.97, Δ -0.08, z -0.1 (inside noise)
  held-out           (13 rows) ref 4.03, 4.51, 4.61, 3.90 (mean 4.26, sd 0.35; used 1.26) | P1q.json: 5.56, Δ +1.29, z +0.9 (inside noise)
  held-out w/o rare  (12 rows) ref 3.88, 4.29, 4.61, 3.90 (mean 4.17, sd 0.35; used 0.48) | P1q.json: 4.14, Δ -0.03, z -0.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-4   held-out ref 0.09±0.11 | P1q.json 1.42 (fail)
   T-HUN-7   fitted   ref 0.00±0.00 | P1q.json 0.25 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S17q 3.88 / 4.29 / 4.61 / 3.90 (mean 4.17, sd 0.35; used 0.48); P1q.json 4.14 (z -0.1)

| hunt rows, quick (30 + 30 d) | S17q / S17q1 / S17q2 / S17q3 | P1q |
| --- | --- | --- |
| T-HUN-1 (n) | 15.9 (8) / 23.7 (12) / 24.1 (12) / 13.9 (7) | 11.8 (6) |
| T-HUN-2 (n) | 0.5 (4) / 0.286 (7) / 0.214 (14) / 0.333 (9) | 0.333 (6) |
| T-HUN-3 (n) | 0.0275 (109) / 0.0439 (114) / 0.024 (125) / 0.0278 (144) | 0.0197 (152) |
| T-HUN-4 (n) | 1.91 (109) / 1.97 (114) / 1.15 (125) / 1.73 (144) | 2.87 (152) |
| T-HUN-7 (n) | 2 (2) / 1.5 (2) / 1.33 (3) / 1.33 (3) | 1 (2) |
| T-HUN-8 (n) | 0.75 (4) / 1 (3) / 1 (4) / 1 (4) | 1 (2) |
| truth hunts per community-year | 30.4 / 36.5 / 46.6 / 42.6 | 14.2 |
| truth success | 0.111 / 0.133 / 0.227 / 0.286 | 0.417 |

```

#### P1 result: hunt rows at 30 + 60 days (9b3f213 frozen, `git.dirty` 0; against H0 and H0r; same script)


| hunt rows, 30 + 60 d, seeds 48 and 7 | H0 / H0r | P1h |
| --- | --- | --- |
| T-HUN-1 (n) | 26.3 (26) / 31.2 (31) | 9.07 (9) |
| T-HUN-2 (n) | 0.562 (16) / 0.346 (26) | 0.273 (11) |
| T-HUN-3 (n) | 0.0431 (209) / 0.0566 (265) | 0.019 (315) |
| T-HUN-4 (n) | 2.19 (209) / 1.74 (265) | 2.58 (315) |
| T-HUN-7 (n) | 1.44 (9) / 1.11 (9) | 1 (3) |
| T-HUN-8 (n) | 0.923 (13) / 0.9 (10) | 1 (3) |
| truth hunts per community-year | 46.6 / 50.7 | 13.2 |
| truth success | 0.262 / 0.296 | 0.287 |

#### P1 result: truth (diagnosis tool, 30 + 60 days, seeds 48 and 7; `report.py P1` and `fail_table.py` from `diag/P1-{48,7}.json`)

| truth (diagnosis, 30 + 60 d, seeds 48 and 7) | S17 | P1 |
| --- | --- | --- |
| hunts resolved | 46 | 13 |
| hunts per community-year | 46.639 | 13.181 |
| success | 0.283 | 0.308 |
| kills per successful hunt | 1.385 | 1.000 |
| captures per hunter in the pursuit (meat units) | 0.173 | 0.133 |
| hunters per hunt (in the pursuit / counted) | 2.261 | 2.308 |
| hunters listed per hunt | 2.326 | 2.615 |
| hunts with fewer than 3 hunters at the resolution | 31 | 6 |
| success by hunters (n: hunts, successes) | 1: 11, 0; 2: 20, 6; 3: 8, 4; 4: 6, 2; 5: 1, 1 | 1: 4, 0; 2: 2, 0; 3: 6, 3; 4: 1, 1 |
| captors by class | {'adultMale': 16, 'female': 1, 'adolescentMale': 1} | {'adultMale': 4} |
| leader's adult males in view at hunt start | {2: 30, 3: 13, 4: 2, 5: 1} | {3: 9, 4: 2, 5: 1, 6: 1} |

```
## P1: 13 hunts, 4 successes
failures by reason: {'three or more in the pursuit, circle not closed': 3, 'fewer than three ever joined': 6}
listed hunters' fate at the resolution (all hunts): {'counted': 30, 'out of range': 2, 'below canopy': 2}
leader's adult males in view -> hunters in the pursuit (all hunts): {(3, 1): 3, (3, 2): 1, (3, 3): 5, (4, 2): 1, (4, 3): 1, (5, 4): 1, (6, 1): 1}
hunters listed -> in the pursuit: {(1, 1): 4, (2, 2): 2, (3, 3): 4, (4, 3): 1, (5, 3): 1, (5, 4): 1}
  n 3 gap 131 halves [71.3104, 71.5441, 71.3018] sets [3] success True minutes 10.2
  n 3 gap 181 halves [61.946, 61.8, 62.1025] sets [] success False minutes 8.8
  n 3 gap 146 halves [63.0083, 62.8651, 47.0208] sets [] success False minutes 7.4
  n 3 gap 142 halves [78.6308, 78.5717, 78.4909] sets [3] success True minutes 8.1
  n 3 gap 146 halves [78.5318, 78.4573, 78.4842] sets [3] success True minutes 9.4
  n 3 gap 146 halves [69.3372, 69.7774, 69.8918] sets [] success False minutes 6.4
  n 4 gap 119 halves [70.4584, 69.8891, 70.1108, 70.3251] sets [3] success True minutes 10.6
alerted at the start who never joined, at the resolution: {'female:forage': 9, 'adultMale:forage': 8, 'female:rest': 5, 'female:travel': 4, 'adultMale:guard': 4, 'female:play': 4, 'adultMale:travel': 3, 'adultMale:rest': 2, 'adultMale:groom': 2, 'adolescentMale:forage': 2, 'adolescentMale:rest': 1, 'female:flee': 1}
```

| Reserves ÷ store, % per day (OLS; quick energy runs) | S17q runs | mean ± SD | P1 |
| --- | --- | --- | --- |
| adult male | -0.004 / +0.011 / +0.001 / +0.002 | +0.002 ± 0.006 | +0.005 (z +0.4) |
| female, other | +0.008 / +0.024 / -0.007 / -0.017 | +0.002 ± 0.018 | +0.016 (z +0.7) |
| female, lactating | +0.007 / -0.003 / -0.006 / +0.010 | +0.002 ± 0.008 | +0.024 (z +2.6) |
| juvenile 5–12 y | +0.001 / +0.006 / +0.006 / +0.008 | +0.005 ± 0.003 | -0.014 (z -5.2) |
| infant 2–5 y | -0.008 / -0.000 / -0.016 / +0.022 | -0.000 ± 0.016 | +0.047 (z +2.6) |
| infant 0.5–2 y | +0.013 / +0.001 / -0.003 / -0.001 | +0.002 ± 0.007 | -0.010 (z -1.5) |

P1q.json viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}: seed 48 deaths 0 {} starvation 0; seed 7 deaths 0 {} starvation 0
P1h.json viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}: seed 48 deaths 0 {} starvation 0; seed 7 deaths 0 {} starvation 0

#### P1 against its registration

Prescriptions 46 (as predicted); viability passes, no deaths; no capture with fewer than three hunters in the pursuit
(as predicted); every hunt now starts with three or more adult males in the leader's view (as predicted); hunts fall
from 46.6 to 13.2 per community-year in truth, above 5 (as predicted); kills per success 1.0 (as predicted); T-HUN-1
9.1 (60 d) and 11.8 (quick), inside 5–25 (as predicted); T-HUN-3 0.019 and 0.020, further below its band (as
predicted); T-HUN-4 2.58 and 2.87 (rare row, above its band, as predicted); T-HUN-7 1.0 (below 1.2, as anticipated);
T-HUN-8 1.0; sums inside noise (fitted z −0.1, held-out +0.9, without the rare rows −0.1, also without T-IGE-3 −0.1).
**Missed:** success did not rise: 0.308 in truth at 60 days (S17 0.283; H0/H0r 0.262/0.296) and 0.417 in the quick run
(7 hunts); T-HUN-2 0.273 (60 d, 11 observed hunts) and 0.333 (quick), not into its band. **Missed:** reserves —
nursing mothers better (+0.024 %/day, z +2.6), juveniles worse (−0.014, z −5.2 against a reference spread of 0.003).
Kill criterion (§7) not met: by the registered rule a provisional keep candidate, but the reading below says the
success it produces is set by two defects of P1's own implementation and by joining.

**Why P1's hunts fail (diagnosis; table above):** 6 of 9 failures had fewer than three hunters ever joining (four
leaders alone) although every leader saw three or more adult males: about half the males in view join (the hand-set
join value, `candidates.ts:1088`, outside this mechanism). The other 3 had three hunters in the pursuit whose cones
(62–70°; alertness 0.61–0.80) could close only if they stood within a few degrees of 120° apart, but their largest
gaps were 146–181°. Two artefacts of the implementation explain the spread: (a) the outcome is read inside the first
hunter's action at the resolution tick, after the group has drifted 1.1–1.9 m that tick (alert 0.5–1) but before the
hunters later in the update order have moved, so against a 2 m standoff their bearings are read up to ~30° from where
they are heading (the counted hunters stood 1.5–3.5 m from the group's point); (b) the circle is read only at the one
hashed moment (5–11 min after the start), not whenever the hunters close it during the pursuit, while the field
picture is a capture when the monkeys are cut off.
