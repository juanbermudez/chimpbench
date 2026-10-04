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
