# E3b pre-registration: what stops a chimp going back to a tree it just fed in

Status: skeleton committed at the start of the stage (2 October 2026, branch `e3b-revisit`, from `track-e` 29202da),
before any run and before any code change. Track E, stage E3b. Rule served: field values of behaviour are targets,
never inputs. No weight is tuned to a revisit interval, a number of trees a day, a day range or a travel share.

## 0. The problem

- **The term.** A crown an animal has just fed in is devalued by `revisitW` 0.5 × exp(−Δt ÷ `revisitTauH` 12 h) for
  forage and travel (C6b, design, no source: "the fruit within reach has been taken"; candidates.ts `revisit`, the
  fed-tree list in execution.ts `cleanupPrevious`). It ignores how much fruit is left.
- **E5c's iteration 3** (S5 + `crownShare` as committed: this devaluation off, a crown it fed in worth the crop it
  believes left there (C7a's belief), the habitat-index crowding cost off, co-feeders costing their share of the bout)
  was viable and changed a lot at once: nursing mothers −0.114 → +0.015% of the store a day, juveniles −0.007 →
  +0.007; crown choices 11,436 → 15,940; own trips −22%, joined trips −53%; males' true path 2.54 → 1.77 km (T-RNG-4
  1.48, band 1.5–3.5); T-ACT-2 males 0.234 → 0.145; fitted better beyond noise (z −2.9, mostly hunting rows); held-out
  inside noise; feeders fell with crop (depletion). Two crop-blind terms changed together, so which one did what is
  unknown, and whether animals now return to the same crowns too soon (T-FOOD-6, revisit interval, held out: Taï 2–7
  days) was not measured.

## 1. Plan

1. **Diagnosis** (§2) on S5 in quick mode (seeds 48 and 7, 30 + 30 days), simulation truth, with diagnostic-only
   overrides that separate the two terms: D0 = S5; D1 = S5 with the revisit devaluation off alone; D2 = S5 with the
   habitat-index crowding off alone; D3 = both off (E5c's A3). Readouts registered in §2 before the runs.
2. **Mechanism** behind a new switch (0 = today), only for what the diagnosis implicates; inputs sourced or tagged
   design; no time-decay weight fitted to anything. The crowding question stays separate (a second switch only if
   the diagnosis gives it its own effect).
3. At most three iterations, each logged here and committed before its run; arms = S5 + the switch, quick mode,
   judged against the S5 quick reference (four realizations, e-noise.md amendment 2).

## 2. Diagnosis (step 1; registered 2 October 2026, 14:25, before its runs)

**What the code does (read at 29202da, field profile with S5's 32 switches).** A crown's crop is one scalar per tree
(`fruitAt`: the phenology crop minus a deficit that recovers toward it at `patchRecoverPerDay` 0.7 a day, τ ≈ 34 h;
design). Feeding takes the same amount per tick (`fruitIntakePerH` × skill × body size, capped by the gut's room) until
the crop is below 0.02 units (execution.ts `forageTick`): intake per minute never falls as the crown is used, and nothing
in the model is "within reach" of a feeder. When an animal leaves a crown it fed in, two things are written
(execution.ts `cleanupPrevious`): its belief about the crop left (C7a, `treeCrop`, the truth at that moment) and, under
`revisitW` > 0, the tree in its fed-tree list (the last 6 crowns), so that for forage and trips the crown scores
`revisitW` 0.5 × exp(−h ÷ `revisitTauH` 12 h) less (candidates.ts `revisit`; C6b design, no source). The habitat-index
crowding cost (`crowdCompeteW` 0.1 × (`crowdScarcityRef` 1.3 − fruit index) per co-feeder seen) applies only to crowns
in view. E5c's diagnosis: an occupancy (median 28 min, 1.3 feeders) eats 11% of the crop.

**Diagnostic arms (overrides on S5; diagnostic only, never candidates):**
- **D0** = S5 (identity: its energy readouts must equal `S5q-energy.json`, its choice counts E5c's `diag/S5q-crown.json`);
- **D1** = S5 + `revisitW` 0 (the revisit devaluation off alone: no fed-tree list, no devaluation);
- **D2** = S5 + `crowdCompeteW` 0 (the habitat-index crowding off alone);
- **D3** = S5 + `crownShare` 1 (both off, E5c's A3 as committed; its e-bench and energy JSON from E5c are at e076dbe,
  whose simulation code equals this branch's start, and are read as D3's bench rows).

**Tool.** `scripts/revisit-diagnose.ts` (new; its header defines every readout). Seeds 48 and 7, 30 + 30 days, rules
policy, from a frozen detached checkout of the commit that adds this section. Smoke test (seed 48, 1 + 2 days, S5): done
before this registration, every readout filled. **Disclosure:** its two-day numbers were seen (bout ends: 82% a rules
decision, 18% a full foregut, none by crop or satiation; 30% of the deciding draws followed an interrupt; returns to a
crown found 0.56 units against 0.57 left; same-day returns 60% of returns in a 2-day window).

**Readouts** (simulation truth; header of the tool): feeding visits (a return after ≥ 10 min is a new visit, the
observer's T-FOOD-4 rule); revisits per animal and crown and per 30-m resource (normand2009's merge), with the gap from
leaving to returning, the shares returning within 1 h, 1–3 h, later the same day, the next day, 2–7 days and later, the
crop and the phenology crop when it left and when it returns; the revisit interval three ways ((a) mean calendar-day
difference over returns on another day, the observer's T-FOOD-6 convention and the registered primary, (b) the same
with same-day returns as 0, (c) the mean start-to-start interval), by class; what ends a visit (crop gone, sated, gut
full, else the rules decision's reason and the next act; "a companion leaving" = the next act is a party follow or a
joined trip; intake at the last tick ÷ the full rate); crown choices (E5c's filter and kinds) per animal-day ≥ 8 y, the
share that are returns, hours since leaving, crop then and now, belief against truth, and the devaluation S5 would apply;
walking by purpose per class (energy-diagnose's ground step split by the act); eating minutes, ground km, reserves and
their daily slope per class (energy-diagnose's definitions); colobus encounters per community-day (an adult male within
100 m of a group after ≥ 60 min without one, at 15-min daylight scans) and hunts per community-year (truth).

**Reading rules (registered).**
- *Q1, what the revisit term does:* the D1 − D0 change of crown choices per animal-day, own and joined trips, males'
  true path and mothers' reserve slope, against the S5 spread (four realizations) where it exists; the term is named
  as the cause of an A3 change if D1 reproduces at least two thirds of D3 − D0 on that readout.
- *Q2, what the crowding term does:* the same with D2; the crowding question gets its own switch only if D2 moves a
  readout beyond the S5 spread that D1 does not.
- *Q3, returning too soon:* with the term off (D1), animals return too soon if the primary revisit interval (a) falls
  below the band's 2 days or more than half of all returns happen on the same day *and* the crop at the return is
  below the crop when they left (they return to what they emptied). If returns find what they left (crop at return
  ≥ 0.9 × crop when they left), the model's crown physics, not the valuation, is where a return's worth is lost.
- *Q4, what ends a feeding visit:* the category with the largest share is named; "intake rate falling" is named only
  if ≥ 10% of visits end with intake at the last tick below half the full rate.

**Expected (low confidence unless stated).** Q1: D1 reproduces most of A3's walking and choice changes (moderate).
Q2: D2 changes little beyond the S5 spread (low). Q3: returns find what they left (crop removed per visit ~10%;
moderate), so physics, not valuation. Q4: rules decisions (need-bucket, maximum age, interrupts), not crop or intake
rate (high, from the code).

## 3. Field rows scored here: samples (sources opened; written before any arm)

| Row | Source (read) | Sample, method (quoted where it decides the readout) | Value |
| --- | --- | --- | --- |
| T-FOOD-6 revisit interval (held out) | normand2009 (FT, PMC2762532 via NCBI BioC, read 2 October 2026) [M] | Taï South group (*P. t. verus*), 16 adults (11 F, 5 M); "two females were followed for 28 consecutive days (from 5 January to 1 February 2007, and from 19 February to 18 March 2007) to study how chimpanzees revisit the same trees"; nest-to-nest follows of one target a day; "We determined the revisit rate for each resource during these two periods (i.e., how frequently the resource was visited after the first known visit). The trees located less than 30 m from each other were considered to be the same resource. We only considered trees that were revisited by the same individual during the study period as being revisited." Result: "On average, chimpanzees revisit a tree within 5.37 days", the longest interval 24 days (truncated by the 28-day window). Mass not reported; reproductive state not given. Whether same-day returns count is not stated. | 5.37 days |
| T-FOOD-6 (second value) | ban2014 (abstract via Europe PMC; the full text is not in PMC and the MPG PuRe copy sits behind a bot check: Methods **not verified** this stage) | five adult females, Taï, "followed for many consecutive days"; 180 approaches (targets.json) | 2.5 days (max 26) |
| T-FOOD-4 trees per day (held out, compromised) | janmaat2013b, normand2009 (as e5c-prereg §2.2) | Taï: 5 adult females, 275 full-day follows; two females over 28 days (normand2009: 391 and 506 trees, 13.96 and 18.07 a day) | 7.14; 14.0 and 18.1 |
| T-RNG-4 male day range (fitted) | batesByrne2009 (as e5c-prereg §2.2) | Budongo Sonso 2002–03, 8 males, GPS every 5 min while travelling | 2.7 ± 1.5 km/day |
| T-ACT-2 travel share (fitted) | villioth2025, amsler2010 (as e5c-prereg §2.2) | Waibira, 10 M and 9 F (7 lactating), continuous focal, 491 h; Ngogo non-patrol control days | 0.21 / 0.20 (M / F); 0.14 |
| T-HUN-1 hunts per community-year (fitted) | gilby2015 (FT), wattsMitani2002 (as e4e-prereg §2) | Kanyawara 1996–2014: 194 hunts in 224 months, mean 11.4 adult males, all-occurrence hunts by the followed party; Ngogo ~24 males | ≈ 10.4 per year; ~55 |
| T-HUN-3 hunted share of encounters (fitted) | gilby2015, mitaniWatts2001 | encounter = red colobus within 100 m (Kanyawara) of the party at a 15-min scan; 2,461 encounters | 0.079 (Kanyawara); 0.37 (Ngogo) |
| reserves, day ranges (truth) | none scored by e-bench | staged T-ENE rows (e-targets.patch.json); judged against the reference's own spread | — |

**What physically stops a return, from the sources read (before any run).** normand2009: revisits are made by memory
and favour trees "where they ate for longer periods of time" (B = 0.506) and "where they expect to find more fruit";
its mean is 5.37 days. ban2014 (abstract): chimpanzees travel further to trees where they "had previously made food
grunts and had rejected fewer fruits" and "were able to anticipate the amount of fruit that they would find". houle2014
(Kibale, abstract; research.md §E.20): ripe fruits are "usually rare in the tree (<0.5% of all fruit available)",
mid-ripe 3–8%: what a feeder eats is a small standing stock of ripe fruit that ripening replaces, not the crown's whole
crop. potts2011: patch residency 27 (Ngogo) and 46 min (Kanyawara) with feeding parties of 7–8, i.e. 3.3–6.5
chimp-hours per visit; the authors discuss giving-up densities. So in the field a return is worth what has ripened
since the last harvest; no source gives a chimpanzee-specific ripening rate or a within-crown reach.

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **S5** (e-stack2-confirm.md, "S5 results"; 32 switches, `bench-run/artifacts/validation/e/s5/S5-params.json`),
  quick mode once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run 5911b36 (simulation code
  identical to this branch's start), each with `energy-diagnose` (seeds 48, 7; 30 + 30 days):
  `bench-run/artifacts/validation/e/s5q/{S5q,S5q1,S5q2,S5q3}.json` and `…-energy.json`. Not re-run here.
- Each arm against the reference mean: z = (arm − mean) ÷ (SD × √(1 + 1/n)); quick per-run SD fitted 0.69, held-out
  1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result;
  judged on rows scored in all runs, with and without T-HUN-4 and T-BRD-1 (the integrator's `judge_vs_reps.py`).
- Energy, travel and party readouts against the reference's own spread (mean ± SD of its four runs). Viability must
  pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S5: 77); a switch that removes a named rule
  must lower it.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

## 6. Results

(pending)

## 7. Known defects in the code under test

- The observer's T-FOOD-6 (src/field/metrics.ts:698–708) pools the followed focals of a community ("by followed focals
  of one community") and counts only visits on different days; the target's definition and normand2009 are per
  individual. Not changed (frozen observer); the truth readout (§2) is per individual.
- The observer's T-FOOD-5 (src/field/protocols.ts:494–501) counts a return to the crown just left as a choice of "the
  nearest productive tree" (the tree itself is excluded from the nearer-tree test and the departure point lies in its
  crown). It inflates T-FOOD-5 whenever animals return to the crown they left (E5c's A3: 0.06 → 0.44). Not changed
  (frozen observer); reported.
- Feeding intake per tick does not fall as a crown is used (execution.ts:979–992): no diminishing returns inside a crown.
  A design property of the C7a crown model, part of what is diagnosed; not changed before the diagnosis.
