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

### 2.1 Diagnosis results (run-b31e853, clean; seeds 48 and 7, 30 + 30 days; simulation truth; 14:21–14:46, load 9–36, one worker)

Generated by `diag_table.py` and `q1.py` (session scratch, `e3b/`) from the tool's JSON.

- **Identity.** D0's energy readouts equal energy-diagnose's `S5q-energy.json` to the last digit for all four classes
  (eating minutes, ground km, reserves, the daily trajectories). D0's choice counts equal E5c's `S5q-crown.json` for crowns
  in view (11,521) and differ by 1 own trip and 61 joined trips: crown-share-diagnose labels a choice whose target tree
  also carried a trip option as a trip or join whatever its act (a nest in a fruit tree, for instance); this tool reads
  the chosen candidate's own kind. D3 equals E5c's A3 (adult males' ground path 1.77449 km in both; 15,940 crowns in view).
- The chain's script was edited while it ran (R1–R3 cases added): bash re-read a fragment after the loop and exited 2
  after D3 had finished ("D3 exit" printed twice). All four arms exited 0 before it; no result is affected.

| Readout | D0 | D1 | D2 | D3 |
| --- | --- | --- | --- | --- |
| revisit (a) other days, adult F, per tree | 3.278 | 3.081 | 3.221 | 3.157 |
| revisit (a) other days, adult F, 30-m resource | 3.215 | 2.989 | 3.176 | 3.044 |
| revisit (a) other days, all ≥ 12 y, per tree | 3.316 | 3.246 | 3.322 | 3.158 |
| revisit (b) same day = 0, adult F, tree | 2.750 | 1.143 | 2.643 | 1.127 |
| revisit (c) start-to-start days, adult F, tree | 2.753 | 1.154 | 2.643 | 1.138 |
| returns, adult F (n) | 5368 | 6993 | 5094 | 6583 |
| returns: < 1 h (all ≥ 12 y) | 0.032 | 0.328 | 0.035 | 0.336 |
| returns: 1–3 h | 0.062 | 0.211 | 0.074 | 0.222 |
| returns: ≥ 3 h, same day | 0.057 | 0.072 | 0.061 | 0.071 |
| returns: next day | 0.242 | 0.168 | 0.232 | 0.158 |
| returns: 2–7 days | 0.536 | 0.177 | 0.528 | 0.176 |
| returns: > 7 days | 0.072 | 0.044 | 0.070 | 0.036 |
| returns: same day (all) | 0.151 | 0.611 | 0.170 | 0.630 |
| gap leaving → return, median h | 46.858 | 2.167 | 46.087 | 1.875 |
| crop when it left (returns) | 0.471 | 0.437 | 0.490 | 0.409 |
| crop when it returns | 0.512 | 0.464 | 0.533 | 0.438 |
| phenology crop when it left | 0.710 | 0.762 | 0.723 | 0.725 |
| phenology crop when it returns | 0.695 | 0.755 | 0.709 | 0.719 |
| deficit when it left | 0.239 | 0.325 | 0.233 | 0.316 |
| deficit when it returns | 0.183 | 0.292 | 0.176 | 0.281 |
| same-day returns: crop left / back | 0.543 / 0.518 | 0.461 / 0.444 | 0.556 / 0.537 | 0.436 / 0.421 |
| visits ≥ 12 y (n) | 16420 | 17301 | 15236 | 16685 |
| visit minutes, median | 23.500 | 21.750 | 24.250 | 22.500 |
| crop at visit start / end | 0.508 / 0.435 | 0.471 / 0.409 | 0.524 / 0.450 | 0.446 / 0.381 |
| fruit eaten per visit (units) | 0.044 | 0.042 | 0.046 | 0.044 |
| share of the crop eaten per visit | 0.100 | 0.111 | 0.102 | 0.127 |
| intake at the last tick ÷ full rate | 0.953 | 0.987 | 0.948 | 0.982 |
| foregut fill at visit end | 0.863 | 0.877 | 0.874 | 0.872 |
| hunger at visit end | 0.184 | 0.136 | 0.170 | 0.130 |
| bout end: a companion leaving (next act party follow or joined trip) | 0.099 | 0.060 | 0.078 | 0.049 |
| bout end: intake < half the full rate | 0.066 | 0.014 | 0.075 | 0.020 |
| crown choices per animal-day ≥ 8 y (all kinds) | 15.776 | 14.361 | 14.900 | 13.971 |
| chosen: crown in view (count) | 11521 | 15616 | 11727 | 15940 |
| chosen: own trip (count) | 13614 | 10301 | 13558 | 10592 |
| chosen: joined trip (count) | 10835 | 6438 | 8315 | 5322 |
| crown in view chosen: return share | 0.675 | 0.841 | 0.679 | 0.829 |
| … return within 3 h | 0.070 | 0.540 | 0.086 | 0.538 |
| … return within 24 h | 0.199 | 0.691 | 0.218 | 0.680 |
| … hours since leaving (median) | 46.263 | 1.312 | 44.296 | 1.321 |
| … crop now / when it left (returns) | 0.510 / 0.491 | 0.446 / 0.440 | 0.532 / 0.512 | 0.428 / 0.419 |
| own trip chosen: return share | 0.705 | 0.726 | 0.688 | 0.686 |
| … within 24 h | 0.084 | 0.353 | 0.069 | 0.329 |
| … belief − truth (mean) | 0.011 | 0.001 | 0.011 | 0.008 |
| … |belief − truth| | 0.120 | 0.111 | 0.121 | 0.115 |
| joined trip chosen: return share | 0.653 | 0.626 | 0.598 | 0.570 |
| S5 devaluation at chosen crowns in view (mean) | 0.057 | 0.278 | 0.065 | 0.275 |
| … at chosen own trips | 0.017 | 0.101 | 0.015 | 0.093 |
| colobus encounters per community-day (truth) | 2.672 | 2.483 | 2.650 | 2.150 |
| hunts per community-year (truth) | 75.028 | 62.861 | 62.861 | 50.694 |

| What ended a feeding visit (≥ 12 y; share) | D0 | D1 | D2 | D3 |
| --- | --- | --- | --- | --- |
| gut full | 0.424 | 0.442 | 0.443 | 0.412 |
| interrupt | 0.216 | 0.152 | 0.169 | 0.132 |
| need-bucket | 0.207 | 0.176 | 0.211 | 0.178 |
| ended | 0.093 | 0.145 | 0.106 | 0.170 |
| max-age | 0.042 | 0.055 | 0.051 | 0.073 |
| period | 0.017 | 0.026 | 0.018 | 0.030 |
| crop gone | 0.001 | 0.002 | 0.001 | 0.004 |
| hunt | 0.001 | 0.001 | 0.001 | 0.001 |
| lead | 0.000 | 0.000 | 0.000 | 0.000 |
| switch | 0.000 | 0.000 | 0.000 | 0.000 |

| Next act after a feeding visit (share) | D0 | D1 | D2 | D3 |
| --- | --- | --- | --- | --- |
| rest | 0.243 | 0.307 | 0.267 | 0.312 |
| groom | 0.133 | 0.161 | 0.145 | 0.170 |
| joined trip | 0.093 | 0.054 | 0.073 | 0.045 |
| own trip | 0.084 | 0.078 | 0.091 | 0.080 |
| caller | 0.069 | 0.051 | 0.061 | 0.050 |
| other: display | 0.059 | 0.053 | 0.065 | 0.055 |
| other: pant-grunt | 0.063 | 0.042 | 0.061 | 0.042 |
| nest | 0.051 | 0.047 | 0.048 | 0.054 |
| play | 0.042 | 0.048 | 0.043 | 0.052 |
| fallback | 0.041 | 0.043 | 0.041 | 0.044 |
| other: mate | 0.022 | 0.018 | 0.016 | 0.014 |
| other: call | 0.018 | 0.013 | 0.021 | 0.015 |
| other: guard | 0.017 | 0.016 | 0.010 | 0.012 |
| crown in view | 0.014 | 0.015 | 0.015 | 0.014 |
| other: charge | 0.012 | 0.012 | 0.009 | 0.009 |
| other: climb | 0.009 | 0.012 | 0.010 | 0.011 |

| Walking km/day, adult male | D0 | D1 | D2 | D3 |
| --- | --- | --- | --- | --- |
| crown approach | 0.05 | 0.04 | 0.05 | 0.04 |
| own trip | 0.82 | 0.64 | 0.94 | 0.69 |
| joined trip | 0.77 | 0.47 | 0.69 | 0.41 |
| party follow | 0.03 | 0.02 | 0.02 | 0.01 |
| caller | 0.49 | 0.34 | 0.45 | 0.35 |
| drink | 0.14 | 0.14 | 0.14 | 0.13 |
| patrol | 0.14 | 0.12 | 0.09 | 0.06 |
| other | 0.09 | 0.08 | 0.06 | 0.06 |
| total (ground km) | 2.56 | 1.86 | 2.45 | 1.77 |
| eating min | 252.6 | 233.9 | 252.3 | 234.8 |
| reserves ÷ store (mean) | -0.015 | -0.010 | -0.014 | -0.009 |
| reserve slope, % of store per day | -0.001 | 0.005 | 0.008 | -0.014 |

| Walking km/day, female, lactating | D0 | D1 | D2 | D3 |
| --- | --- | --- | --- | --- |
| crown approach | 0.04 | 0.03 | 0.04 | 0.03 |
| own trip | 1.51 | 0.85 | 1.32 | 0.85 |
| joined trip | 0.36 | 0.21 | 0.38 | 0.20 |
| caller | 0.27 | 0.16 | 0.20 | 0.18 |
| drink | 0.14 | 0.21 | 0.13 | 0.19 |
| other | 0.04 | 0.03 | 0.04 | 0.03 |
| total (ground km) | 2.39 | 1.52 | 2.14 | 1.50 |
| eating min | 288.0 | 271.5 | 291.9 | 270.7 |
| reserves ÷ store (mean) | -0.108 | -0.042 | -0.108 | -0.043 |
| reserve slope, % of store per day | -0.111 | -0.008 | -0.103 | 0.015 |

| Walking km/day, female, other | D0 | D1 | D2 | D3 |
| --- | --- | --- | --- | --- |
| crown approach | 0.04 | 0.04 | 0.04 | 0.03 |
| own trip | 0.51 | 0.40 | 0.53 | 0.33 |
| joined trip | 0.77 | 0.47 | 0.63 | 0.49 |
| party follow | 0.03 | 0.02 | 0.02 | 0.01 |
| caller | 0.44 | 0.31 | 0.40 | 0.31 |
| fallback | 0.02 | 0.02 | 0.02 | 0.02 |
| drink | 0.17 | 0.20 | 0.15 | 0.17 |
| other | 0.06 | 0.06 | 0.05 | 0.05 |
| total (ground km) | 2.05 | 1.52 | 1.86 | 1.43 |
| eating min | 243.0 | 223.6 | 244.8 | 219.3 |
| reserves ÷ store (mean) | -0.034 | -0.022 | -0.037 | -0.020 |
| reserve slope, % of store per day | 0.011 | 0.016 | -0.009 | -0.005 |

| Walking km/day, juvenile 5–12 y | D0 | D1 | D2 | D3 |
| --- | --- | --- | --- | --- |
| crown approach | 0.05 | 0.04 | 0.05 | 0.04 |
| own trip | 0.98 | 0.54 | 1.16 | 0.68 |
| joined trip | 0.50 | 0.28 | 0.51 | 0.24 |
| care follow | 0.15 | 0.13 | 0.10 | 0.09 |
| caller | 0.49 | 0.45 | 0.54 | 0.39 |
| drink | 0.11 | 0.12 | 0.09 | 0.14 |
| other | 0.10 | 0.12 | 0.10 | 0.11 |
| total (ground km) | 2.40 | 1.69 | 2.57 | 1.71 |
| eating min | 274.1 | 249.9 | 273.8 | 255.0 |
| reserves ÷ store (mean) | -0.056 | -0.041 | -0.065 | -0.034 |
| reserve slope, % of store per day | 0.013 | -0.018 | 0.009 | 0.007 |

Identity D0 vs S5q-energy.json (energy-diagnose, same params and seeds):
  adult male: eatingMin 252.638393 vs 252.638393; groundKm 2.557271 vs 2.557271; reserves -0.015480 vs -0.015480; traj max |Δ| 0.00e+00
  female, lactating: eatingMin 287.993750 vs 287.993750; groundKm 2.392336 vs 2.392336; reserves -0.107565 vs -0.107565; traj max |Δ| 0.00e+00
  female, other: eatingMin 242.984798 vs 242.984798; groundKm 2.051747 vs 2.051747; reserves -0.034254 vs -0.034254; traj max |Δ| 0.00e+00
  juvenile 5–12 y: eatingMin 274.054167 vs 274.054167; groundKm 2.400556 vs 2.400556; reserves -0.056362 vs -0.056362; traj max |Δ| 0.00e+00
Identity D0 choice counts vs E5c S5q-crown.json: crown 11521 vs 11521; trip 13614 vs 13615; join 10835 vs 10896

**Attribution** (Q1, Q2; z = (x − S5 mean) ÷ (SD × √(1 + 1/4)) against the four S5 realizations, the e-noise
convention; S5 energy from `S5q*-energy.json`, choice counts from E5c's `S5q*-crown.json`):

| Readout | S5 (mean ± SD of 4) | D0 | D1 (z) | D2 (z) | D3 (z) | D1 share of D3 − D0 | D2 share of D3 − D0 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| crown in view chosen | 11436 ± 222 | 11521 | 15616 (+16.9) | 11727 (+1.2) | 15940 (+18.2) | 93% | 5% |
| own trips chosen | 13606 ± 91.075 | 13614 | 10301 (-32.5) | 13558 (-0.5) | 10592 (-29.6) | 110% | 2% |
| joined trips chosen | 11382 ± 603 | 10835 | 6438 (-7.3) | 8315 (-4.5) | 5322 (-9.0) | 80% | 46% |
| true path, adult males (km/day) | 2.544 ± 0.049 | 2.557 | 1.855 (-12.6) | 2.447 (-1.8) | 1.774 (-14.1) | 90% | 14% |
| true path, lactating (km/day) | 2.347 ± 0.102 | 2.392 | 1.515 (-7.3) | 2.142 (-1.8) | 1.503 (-7.4) | 99% | 28% |
| true path, other females (km/day) | 2.137 ± 0.087 | 2.052 | 1.517 (-6.4) | 1.860 (-2.8) | 1.429 (-7.3) | 86% | 31% |
| true path, juveniles (km/day) | 2.490 ± 0.079 | 2.401 | 1.694 (-9.0) | 2.569 (+0.9) | 1.706 (-8.9) | 102% | -24% |
| reserves, lactating (%/day) | -0.114 ± 0.026 | -0.111 | -0.008 (+3.7) | -0.103 (+0.4) | 0.015 (+4.5) | 82% | 6% |
| reserves, juveniles (%/day) | -0.007 ± 0.014 | 0.013 | -0.018 (-0.7) | 0.009 (+1.1) | 0.007 (+0.9) | 495% | 63% |
| reserves, adult males (%/day) | 0.005 ± 0.007 | -0.001 | 0.005 (-0.0) | 0.008 (+0.4) | -0.014 (-2.4) | -43% | -69% |
| reserves, other females (%/day) | 0.020 ± 0.014 | 0.011 | 0.016 (-0.3) | -0.009 (-1.9) | -0.005 (-1.6) | -31% | 126% |
| eating min, lactating | 288 ± 0.956 | 288 | 272 (-15.0) | 292 (+4.0) | 271 (-15.8) | 95% | -23% |

**Reading by the registered rules.**
- **Q1, the revisit devaluation:** switched off alone (D1) it reproduces 80–110% of A3's change on every registered
  readout: crowns in view chosen +4,095 (of +4,419), own trips −3,313 (of −3,022), joined trips −4,397 (of −5,513),
  adult males' ground path 2.56 → 1.86 km (90%), nursing mothers' reserve slope −0.111 → −0.008% of the store a day
  (82%). **The revisit devaluation is named as the cause of A3's changes.** What it does: an animal that stops feeding
  (a full foregut 42%, an interrupt 22%, a need-bucket redraw 21%) next feeds elsewhere instead of in the crown it left:
  same-day returns 61% → 15% of returns (median gap 2.2 h → 47 h), and the extra trips cost males 0.7 km and nursing
  mothers 0.9 km a day.
- **Q2, the habitat-index crowding:** switched off alone (D2) it moves joined trips (−2,520, z −4.5) and other females'
  path (−0.19 km, z −2.8) beyond the S5 spread, both also moved, further, by D1; no readout moves beyond the spread under
  D2 alone (lactating eating minutes move +4 min, z +4.0 against an SD of 1 min, but D1 moves them too, the other way).
  **The crowding term gets no switch of its own** (registered rule). It accounts for about half of A3's fall in joined
  trips (the two terms overlap: D1 + D2 −6,917 against D3 −5,513).
- **Q3, returning too soon:** without the devaluation 61% of returns are on the same day (more than half), but they find
  what the animal left: crop at the return 0.464 against 0.437 when it left (× 1.06; same-day returns 0.444 against
  0.461, × 0.96; D3 × 1.07). **So by the rule, a return's worth is lost in the crown's physics, not in its valuation:** a
  visit (median 22 min) eats 0.042 units, 11% of the crop, and usually ends with a full foregut; the crown the animal
  left still holds 89% of its crop and the belief it carries (C7a) says so (|belief − truth| on own trips 0.11 units,
  mean error +0.001). The revisit interval as the observer and normand2009 count it, between visits on different days,
  does not move (adult females per 30-m resource 3.2 → 3.0 days; band 2–7); what moves are the same-day returns (the
  interval with same-day returns as 0 days: 2.27 → 1.01 days).
- **Q4, what ends a feeding visit:** a full foregut (41–44% in all arms); then interrupts (13–22%), need-bucket redraws
  (18–21%), the bout's end (9–17%), the 30-min intention age (4–7%); the crop running out 0.1–0.4%. Intake at the last
  tick below half the full rate in 1.4–7.5% of visits (< 10%): "intake rate falling" is not named. A companion leaving
  (the next act a party follow or a joined trip) ends 5–10%.
- Colobus encounters (truth, an adult male within 100 m) fall with walking: 2.67 per community-day (D0), 2.48 (D1), 2.65
  (D2), 2.15 (D3); hunts per community-year 75, 63, 63, 51 (single runs).

**What physically stops a wild chimpanzee going back to a crown it just fed in (sources, §3):** the fruit it expects
there. Taï chimpanzees return to trees where they ate longer and expect more fruit (normand2009) and anticipate the amount
they will find (ban2014, abstract); ripe fruit is a small standing stock (< 0.5% of a tree's fruit, houle2014) that
ripening replaces; and a wild feeding party of 7–8 eats about a whole crown per visit (potts2011: 3.3–6.5 chimp-hours,
against the model's median occupied crown of 4.45 chimp-hours, E5c). So a crown a wild chimpanzee has just fed in has
usually been emptied by its party, and its return waits for ripening (revisit intervals of 2.5–5.4 days). No source
describes avoiding a tree for a time whatever is left in it. In the model a visit leaves 89% of the crop, because 1.3
animals feed at once (E5c), so the C6b term devalues a crown that is in fact still full. The model already holds the
physics the field implies (each visit's depletion, `eatFruit`; recovery toward the phenology crop, `patchRecoverPerDay`
0.7 a day, design) and the belief (C7a); the time-decay term overrides both.

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

### 5.1 Iteration 1 (registered 2 October 2026, 14:55, before its run): a return valued by the crop believed left (`revisitByCrop`)

**Why (§2.1).** The revisit devaluation is the term behind A3's changes (80–110% of each), and a return finds what the
animal left (× 0.96–1.07): in the model's own physics nothing makes a crown just fed in worth less, while the C6b term
takes 0.5 × exp(−h ÷ 12 h) off it whatever is left. In the field what makes a return worth less is the fruit gone (a
party eats about a crown per visit, ripe fruit is replaced by ripening) and chimpanzees return where they expect fruit
(normand2009, ban2014). The model already carries both halves: what a visit removes and how fast it comes back (the
depletion of `fruitAt` by `eatFruit` and its recovery at `patchRecoverPerDay` 0.7 a day, design), and what the animal
believes is left (C7a's `treeCrop`, the truth when it leaves and while the crown is in view). The time-decay weight
overrides both.

**Change (switch `revisitByCrop`, 0 = today).** A crown the animal has fed in is valued like any other crown, by the crop
it believes is there, through the existing crop shape (0.55 + 0.45·min(1, crop ÷ `fruitValueRef`)) and trip valuation
(`tripWorth`: the bout's energy over walking and feeding time). The devaluation `revisitW` × exp(−h ÷ `revisitTauH`) is
not applied and no fed-tree list is kept. No new magnitude; the habitat-index crowding is untouched (Q2). Prescriptions:
none switched out (`revisitW`, `revisitTauH` are design): 77 → 77 (`TRACK_E_SWITCHES` note; `prescription-ledger
--count` gives 77 for S5 and for S5 + the switch). Code (committed at 31c02a4 as work in progress, unrun until this
registration): candidates.ts `revisit`, execution.ts `cleanupPrevious`; data/params.json `revisitByCrop` (design, refs
normand2009, ban2014, houle2014); tests/sim-revisit-crop.test.ts (0 by default; deterministic over a field day; the two
entries unread and no fed-tree list kept, kept when off; a crown just fed in keeps its worth on and loses `revisitW` off;
a depleted crown is worth less on).

**Identity and what is already known (disclosed).** S5 + `revisitByCrop` 1 is bit-identical to D1 (S5 + `revisitW` 0)
over 2 field days, seed 48 (world hash without the parameter record), as the code says (`revisitW` is read only at the
two places the switch closes). A1's simulation is therefore D1's: its truth readouts are §2.1's D1 column, read before
this registration (and re-run with the two added readouts at 48304d4, `diag2/D1`). From them, kill criteria (a), (b)
and (d) below already pass. The predictions concern the observer's rows and the sums, which no run has produced. Smoke
test with the switch on (seed 48, 1 + 2 days): every readout filled (seen: 4.1 distinct crowns and 7.9 crown visits
per animal-day; 304 returns).

**Arm A1** = S5 + `revisitByCrop` 1: `e-bench --quick` (seeds 48 and 7, 30 + 30 days; `--workers` 1 above load 8) from a
frozen detached checkout of the commit that adds this section; truth readouts from `diag2/D1` (identical simulation).

**Predictions (A1 against the S5 mean ± SD of its four realizations; low confidence unless stated).**

| Quantity | S5 | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 77 | 77 | high |
| Viability | pass | pass | high |
| T-FOOD-6, observer (days between visits on different days) | 4.84 ± 0.12 | 5.3–6.5 (A3 6.05) | moderate |
| T-FOOD-4, observer (visits per follow; returns after ≥ 10 min count) | 7.52 ± 0.44 | 6.5–8.0 | low |
| T-FOOD-5, observer | 0.065 ± 0.006 | 0.30–0.45 (a return is scored as the nearest tree, §7) | moderate |
| T-RNG-4 | 2.45 ± 0.12 | 1.4–1.8 | moderate |
| T-ACT-2 males / females | 0.234 / 0.197 (± 0.012) | 0.13–0.18 / 0.13–0.17 | moderate |
| T-ACT-1 males / females | 0.383 / 0.395 | 0.34–0.38 / 0.35–0.39 | low |
| T-PTY-1 | 3.31 ± 0.17 | 2.9–3.6 | low |
| T-HUN-1 | 43.9 ± 2.2 | 25–40 | low |
| T-HUN-3 | 0.071 ± 0.018 | inside its band (0.05–0.4) | low |
| Fitted | reference mean | level or better (z ≤ +1) | low |
| Held-out, all shared rows; without T-HUN-4 and T-BRD-1 | reference mean | inside noise (|z| ≤ 2) | low |

**Kill criterion (registered).** Null if: (a) viability fails (a starvation death; a seed below 80% of its start); (b) any
class's reserve slope is more than 0.05% of the store a day below the S5 mean; (c) held-out without the rare rows is
worse beyond noise (z > +2); or (d) the revisit interval by the source's definition (truth (a): adult females, 30-m
resources, visits on different days) leaves the band 2–7 days.

**Verdict rule (registered).** The switch removes no counted prescription, so it cannot pass the track's keep rule. It is
a *provisional keep candidate as a correction* (E5b's and E4g's precedent: a crop-blind design term replaced by the
model's own crop and belief) only if none of (a)–(d) holds and held-out on all shared rows is not worse beyond noise
(z ≤ +2). Otherwise it is recorded and stays off. Walking, travel share and day ranges are reported against the
reference, never used to choose. Because T-FOOD-5 counts a return as a choice of the nearest tree (§7), the held-out
sums are also reported without T-FOOD-5 (a disclosed sensitivity, not the registered judgement).

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
