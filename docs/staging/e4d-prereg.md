# E4d pre-registration: a sleep-gated daily rhythm in the slow hormone-like states

Status: written and committed before any run of the changed model (2 October 2026, branch `e4d-rhythm`, from `track-e`
2f9129f, which includes E4c). Track E, stage E4, fourth piece. Builds on E4a (`docs/staging/e4a-prereg.md`), E4b and E4c.
Patrols, hunting, gang attacks, infanticide and the call system are not touched.

Rule served: field values of behaviour are targets, never inputs. A hormone's daily secretion profile is physiology
measured independently of the behaviour it helps produce, so it may be an input; a calling rate may not.

## 1. The problem (E4c §9, to be verified on this branch's reference)

The slow states integrate events while awake and decay at night (target 0 for arousal and the bare tonic level for
stress while asleep), so the testosterone-like arousal state rises through the day (E4c pooled profile 0.013 at 07 h →
0.039 at 17 h on the timer reference, 0.032 → 0.114 on the stack). Field testosterone and cortisol fall through the day
(mullerLipson2003, fedurek2016, girardButtoz2021). Consequences: the within-male hour-of-day association of arousal and
pant-hoots (T-END-8, fedurek2016 form) turned positive on the stack for the wrong reason (both rise in the afternoon),
and adult-male pant-hoots have no daily course (morning ÷ afternoon 1.0, field ≈ 4.3).

## 2. What the sources say (read 2 October 2026; addenda "E4d hormone rhythm" in research.md and e-sources.md)

| Source | Sample | Method | Finding used here | Tag |
| --- | --- | --- | --- | --- |
| fedurek2016 (FT, PMC4864005; Fig. 4 read by eye) | Kanyawara, Oct 2010–Sep 2011, 11 adult males (> 15 y, mean ≈ 31 y); urine "collected opportunistically throughout the day", first-morning samples "regularly" ("chimpanzees predictably urinate upon waking"); 141 samples before 09:00 for the monthly analysis | urinary testosterone, deconjugated, ether extraction; "A focal's hourly T levels were calculated by averaging values from each one-hour interval between 07:00 and 18:00, across the entire study period" | Mean T by hour 07–18 h ≈ 124, 106, 100, 85, 72, 76, 73, 67, 56, 52, 51, 55 × 10³ pg/ml: **07 h ÷ 17 h ≈ 2.43**; shape: an exponential-looking fall from 07 to 11 h, a plateau 11–14 h, a floor from 16 h. "Urinary T levels in chimpanzees show a clear diurnal pattern with the highest levels in the early morning (from 5:00–9:00), followed by a steady decline through the day." | [M] (primary figure read by eye, ≈) |
| mullerLipson2003 (Abs, PubMed 12910467) | Kanyawara, > 500 samples, 11 wild adult males, 1 year | urinary testosterone and cortisol | "For both steroids, urinary concentrations were higher and more variable in the morning than in the afternoon." Creatinine showed no diurnal pattern. No amplitude in the abstract | [H] direction (as registered), no magnitude |
| girardButtoz2021 (FT, PMC8208813; Fig. 1 read by eye; Tables 2 and Appendix 1) | Taï, 4 communities, 2000–2018; immatures (< 12 y): 846 samples, 50 individuals (36 non-orphans); mature males: 2,184 samples, 28 males | urinary cortisol (LC-MS, ng/ml SG), log-transformed; Bayesian LMMs with linear, quadratic and cubic terms of the time of sample collection ("expressed in minutes with 0 being midnight and 720 being noon"; any further scaling not stated) | Non-orphan immatures, model line: log cortisol ≈ 4.00 at 07 h, 3.03 at 17 h: **07 h ÷ 17 h ≈ e^0.97 ≈ 2.64**, a steady fall through the day. Mature males: linear term −0.49 (95% CI −0.67 to −0.33) against −0.38 in immatures in its own model: at least as steep (the two time scalings are not shown to be the same, so no male ratio is derived) | [M] (figure read by eye; immatures, not adult males) |
| axelsson2005 (Abs, PubMed 15914523) | 7 healthy men, 22–32 y; sleep 23–07 h or displaced to 07–15 h; hourly blood for 24 h at bed rest | serum testosterone | "testosterone increased during sleep and fell during waking, whereas circadian effects seemed marginal": log-linear rise across both sleep periods (15.3 → 25.3 nmol/l at night, 17.3 → 26.4 by day), log-linear fall with time awake; a weak circadian component | [M] (human, abstract) |
| luboshitzky2001 (Abs, PubMed 11238497) | 10 men, fragmented sleep (7/13 min cycle) against continuous sleep | serum testosterone every 20 min | The nocturnal rise is sleep-related, linked to the first REM episode; fragmented sleep delayed it (03:24 vs 22:35 h) | [M] (human, abstract) |
| emeryThompson2020 (Abs only: PMC7165472 has no full text in BioC or efetch) | Kanyawara | urinary cortisol | aging blunts the diurnal rhythm (direction only) | not used |

Oxytocin-like state: no source in research.md, e-sources.md or the papers read here reports a daily rhythm of urinary
oxytocin in chimpanzees (not searched further, time box). The affiliation state gets no rhythm.

Waking versus light. The sources distinguish them for testosterone: its daily course follows sleep, not the clock
(axelsson2005, luboshitzky2001, human). For cortisol the human rhythm is circadian (light-entrained clock) with a
waking response (girardButtoz2021's introduction), and the model's clock (process C, E2d) stays off. In the model sleep
and darkness coincide to within the nest exit 27–45 min after sunrise (E2a, E2d), below the readouts' one-hour bins, so
a light-anchored arm would not be distinguishable here and is not run (§6).

## 3. Mechanism (switch `endoRhythm`, 0 = today, bit-identical; needs `endoStates`)

Sleep-gated secretion. While an animal sleeps (needs()'s `sleeping`: in its own finished nest, or riding in its
mother's), each slow state's production is its waking tonic production times a sleep gain k; awake, k = 1. Production
here is the state's target (E4a's integrator, target − state relaxing with the state's own time constant), so the state
rises through the night toward k × the tonic level, peaks at waking and falls through the day toward the waking level
with its own time constant (stress 3.4 h, arousal 6 h, both E4a). Event kicks and every awake term are unchanged.

- **Stress load (cortisol-like), everyone.** Tonic target = `stressFloor` + bereavement + `endoStressDeficitW` × energy
  deficit (as E4a; the stranger term is already 0 asleep). Asleep: k_C × that tonic target (capped at 1).
- **Competitive arousal (testosterone-like), adult males.** Waking target = `endoArousalOestrusW` × oestrus +
  `endoArousalRivalW` × rival (as E4a), stored at every waking slow step (`chimp.sim.ard`). Asleep, the context scan
  does not run (E4a), so the target is k_T × the drive the male last had awake: the axis secretes through the night at
  the set point the day gave it. A male with no rival or swollen female in view at his last waking step has no
  nocturnal rise (E4a's state is the challenge component; it has no basal of its own, and none is added: §4.2).

| Parameter | Value | Basis |
| --- | --- | --- |
| `endoRhythm` | 0 / 1 | switch |
| `endoRhythmGainT` | 4.35 (range 3.04–6.84) | Derived: the gain that gives the state's tonic course a 07 h ÷ 17 h ratio of 2.43 (fedurek2016 Fig. 4 [M]) with E4a's τ 6 h, for a male waking at sunrise (06:50 at Kibale) and asleep from sunset (18:50), bins 07:00–07:59 and 17:00–17:59 (one-hour means of the periodic solution). Range: ratios 2.0–3.0. The same computation reproduces the field shape: 1, 0.89, 0.79, 0.71, 0.65, 0.59, 0.54, 0.50, 0.47, 0.44, 0.41, 0.39 of the 07 h value at 07–18 h against 1, 0.85, 0.81, 0.69, 0.58, 0.61, 0.59, 0.54, 0.45, 0.42, 0.41, 0.44 in the figure. Tag: assumed (derived from a [M] figure) |
| `endoRhythmGainC` | 3.38 (range 2.70–4.83) | Derived the same way from a 07 h ÷ 17 h ratio of 2.64 (girardButtoz2021 Fig. 1, non-orphan immatures [M]) with E4a's τ 3.4 h. Range: ratios 2.2–3.5 (adult males' linear slope is steeper in its own model). The computed shape is front-loaded (0.83, 0.71, 0.62 of the 07 h value at 08–10 h against ≈ 0.95, 0.89, 0.81 in the figure): a known misfit of tying cortisol to sleep instead of a clock. Tag: assumed |

None is a call rate, a time of day or a behavioural frequency. No hour appears in the code. The waking and nesting
hours in the derivation fix only the field's own sampling geometry; in the simulation each animal's own sleep sets the
phase.

### 3.1 What it removes

Nothing: no clock literal or hazard encodes the hormones' daily course or the calls' (the chorus windows went with
`callValue`). Registered with `removesNothing` (scripts/lib/prescriptions.ts). By the track's keep rule a switch that
removes nothing is not kept on the prescription leg; it is judged as a correction of the model's physiology (as E1h's
food-energy correction was), and the decision is the integrator's.

## 4. Rows: encoded by construction and genuine tests (stated before any run)

### 4.1 Encoding

| Row or readout | Under `endoRhythm` | Note |
| --- | --- | --- |
| Daily course of the stress and arousal states (07 h above 17 h) | **encoded** | It is the mechanism, and k is set from the field ratio. Reported as a calibration check, never as evidence. Only its size on the full state (tonic plus events, whose daily course is the model's own) is not set |
| T-END-8, fedurek2016 form (within-male r across hour bins 07–17 of arousal and own pant-hoots) | **genuine with respect to calls** | Under `callValue` no pant-hoot reads arousal or stress (E4c §3, "not wired, on purpose"). The one route: a rain display (score × min(1, fast × (1 + arousal)), E4b) ends with a pant-hoot; rain displays are a few per 60 seed-days. With the arousal decline now encoded, the row tests whether the model's pant-hoots fall through the day for their own reasons |
| Adult-male pant-hoots, morning ÷ afternoon | **genuine** | Same reason: no route from the states to calls except rain displays |
| T-END-8 net of time of day (new readout §5.4: a male's morning arousal against his pant-hoot rate that day, within males across days) | **genuine** | fedurek2016's monthly association uses morning T only ("samples collected prior to 9:00 am"), so it is the association net of time of day. Day-to-day arousal now carries the previous day's context (the held drive); calls do not read it |
| Escalated attacks by time of day | **direction encoded, size genuine** | The escalation score reads arousal (E4a), so more escalation in the morning follows in direction; no field row |
| Redirects, reconciliation, pant-grunts, submissions by time of day | **direction encoded, size genuine** | They read the stress load (E4a); no field row |
| T-END-3 (male stress with a swollen parous female in the party) | genuine, now confounded by hour | The diagnosis pools hourly samples; muller2021 controlled for time of day and the readout does not. Reported with that caveat |
| T-END-2, -6 (rank halves), -12, -1, -9 | genuine, as E4a | unchanged by construction |
| T-END-4, -7, -10, -11, -5 intergroup half, -12 reconciliation half | encoded, as E4a | unchanged |
| T-COM-1, T-COM-4, T-PTY-1, T-SOC rows, conflicts | genuine | only indirect routes (escalation, redirect and reconciliation timing; pant-grunt and submission scores) |

### 4.2 The scale of the testosterone-like state (why no basal is added)

A field-scaled basal cannot be put into E4a's units. In the field the daily swing is large against the event effects
(fedurek2016: × 2.4 over the day; muller2021: parous oestrous females raise glucocorticoids by × 1.19, log estimate
0.176), while E4a's event weights are large in state units (a fully swollen parous female sets the arousal target to
0.6 of the 0..1 range). A basal whose morning-to-evening swing is several times the oestrus effect would need a level
above 1. So the rhythm acts on the production the state already has (§3): the sleep gain multiplies the waking tonic
drive, as the field's log-scale models treat time of day (an additive effect on log hormone is a multiplicative one on
the level). The cost: arousal's daily mean rises about 2.3-fold for the same context (the periodic solution above), so
arousal-scaled acts (escalation, the rain display's gain) become more frequent. That is a consequence, reported, not
tuned away.

## 5. Readouts (each defined before any arm; smoke-tested with the switch on, §7)

1. **Pooled daily profiles** (endocrine-diagnose, existing T-END-8 sampling extended to stress): adult males, hourly
   samples in daylight > 0.3, not asleep in a finished nest; each sample binned by the hour its sampled hour started
   (the state at 08:30 and the pant-hoots of 07:30–08:30 form the "07 h" bin; the measured window starts at 06:30, so
   samples fall at half past each hour, half an hour after fedurek2016's 07:00–07:59 bins). Per male and bin the mean;
   pooled over males. Reported: the 07 h and 17 h values and their ratio, for arousal and stress. Field: testosterone
   2.43 (fedurek2016), cortisol 2.64 (girardButtoz2021, immatures).
2. **Adult-male pant-hoots, morning ÷ afternoon** (calls-diagnose, unchanged): pant-hoots per awake adult-male hour by
   the clock hour of the call tick; mean of the 07 and 08 h rates ÷ mean of the 15–18 h rates. Field ≈ 4.3
   (fedurek2016 Fig. 4: "hourly pant hoot rates were calculated by averaging daily values for each one-hour period
   (i.e., between 7am and 7:59, between 8am and 8:59, etc. up to 6pm)").
3. **T-END-8, fedurek2016 form** (unchanged): per adult male the Pearson r across hour bins 07–17 (bins with ≥ 3
   samples) of mean arousal and mean own pant-hoots per sampled hour; mean r and the number of males with r > 0. Field
   β ± SE = 0.47 ± 0.09, positive.
4. **T-END-8 net of time of day** (new): per adult male and day, the mean arousal of his samples taken before 09:00
   (the 07:30 and 08:30 samples) against his own pant-hoots per sampled hour that day (all bins 07–17, at least 5
   sampled hours); within-male Pearson r across days (at least 5 days), mean r and the number of males with r > 0.
   Source sentence: "For each focal, monthly T levels were calculated by averaging values from all samples collected
   prior to 9:00 am in a given month" (fedurek2016), monthly T positively associated with monthly pant-hoot rates.
   Our window holds one month, so days stand in for months: direction only.
5. **Timing of state-read acts** (new): escalated attacks chosen, redirected charges and decided conflicts per
   community-year in the morning (clock hours 06–11) and the afternoon (12–18); reconciliations per decided conflict
   by the same split. No field row; direction and size reported.
6. Everything else as E4c's readouts (calls-diagnose, endocrine-diagnose) and `e-bench --quick` (fitted and held-out
   on rows scored in both runs, with and without T-HUN-4 and T-BRD-1; prescriptions; viability).

## 6. Arms and predictions (stated before any run of the changed model)

Seeds 48 and 7, field profile, 30-day burn-in + 30 days, rules policy. Every arm runs from a frozen detached checkout
of a committed head.

- **R** (reference): handoff §3's stack + `callValue` 1, at this branch's committed head (with `endoRhythm` 0 the world
  is bit-identical to `track-e`). `endocrine-diagnose`, `calls-diagnose`, `e-bench --quick`. Run once, reused.
- **D1** = R + `endoRhythm` 1 (§3). The same three tools.
- No light-anchored arm (§2). No separate noise arm: the integrator's registered quick-mode threshold is used when it
  arrives; until then differences under about 1.5 on shared rows are noise.

| Quantity (D1 against R) | Prediction | Confidence |
| --- | --- | --- |
| Pooled arousal, 07 h ÷ 17 h | R: below 1 (≈ 0.3, E4c's 0.032 → 0.114). D1: above 1.5 (field 2.43; events still rise through the day) | moderate |
| Pooled arousal at 07 h | 0.2–0.6 (k_T × a held drive of 0.05–0.15) | low |
| Pooled stress, 07 h ÷ 17 h | R: about 1 (0.8–1.3). D1: above 1.5 (field 2.64) | moderate |
| Adult-male pant-hoots, morning ÷ afternoon | unchanged within 0.8–1.3 × R (no route) | high |
| T-END-8, fedurek2016 form | mean r ≤ 0, at most half of the males positive: calls do not fall through the day, and on the stack they rise late (E4c S1b: 0.52 per male-hour at 07–09 h, 0.65 at 15–17 h) | moderate |
| T-END-8 net of time of day | mean within-male r between −0.15 and 0.15 | low |
| Escalated attacks | up (× 2–4 against R), more per hour in the morning than in the afternoon | moderate |
| Redirected charges per decided conflict | up a little in the morning; overall within noise | low |
| Reconciliations per decided conflict | lower in the morning than in the afternoon (`reconcileStressW` × stress) | low |
| Decided conflicts | within noise (a noise arm moved them by a third, E4b) | moderate |
| Injuries per conflict; deaths from fights | below 2 × R; none | moderate |
| T-COM-1, T-PTY-1 | within noise of R | moderate |
| Fitted / held-out on rows scored in both | within noise (± 1.5), with and without T-HUN-4 and T-BRD-1 | moderate |
| Prescriptions | unchanged (removesNothing) | high |
| Viability | passes (no starvation, no night deaths, no seed below 80% of its start) | high |

## 7. Kill criterion

`endoRhythm` stays off, and the null is recorded, if on the development seeds (D1 against R):
- viability fails (a starvation death R does not have, a night death, a seed below 80% of its start);
- deaths from fights above R, or injuries per conflict at least double R's;
- held-out distance on shared rows rises beyond the noise threshold (with or without T-HUN-4 and T-BRD-1);
- the mechanism fails its purpose: pooled arousal or pooled stress not higher at 07 h than at 17 h.

Even if none holds, the switch stays off by default (track rule; it removes nothing): a provisional "physiology
correction" candidate for the integrator.

## 8. Iterations

At most three, each a change of mechanism from first principles, written here before its run. No gain, weight or time
constant is tuned to a call rate, a conflict rate or a band distance. A miss is a finding.

Known defects in the code under test (E4c's, deferred there, not touched here): `src/sim/calls.ts:32` (`unlocatedShare`
counts a heard ally as located, an anti-reply term); `scripts/calls-diagnose.ts` arrival readout (counts the tick the
feeding phase starts, not bouchard2022a's 30-m approach). Readout geometry: endocrine-diagnose samples at half past the
hour (§5.1), kept for comparability with E4a–E4c.

## 9. Results

### Run log (each entry written before its run)

- **R and D1** (2 October 2026; mechanism and readouts at 193ff76, smoke-tested for 2 days with the switch on: the
  profiles, ratios and act-timing counts print; the net-of-time readout needs ≥ 5 days). Both arms from one frozen
  detached checkout of the commit that adds this entry (the code is 193ff76's; this commit changes only the prereg).
  Order: endocrine-diagnose and calls-diagnose for R and D1 (two processes at a time), then `e-bench --quick
  --workers 2` for R, then for D1 with `--compare` R. Outputs copied to `artifacts/validation/e4d/` (gitignored).
- **Iteration 2** (written after D1's diagnoses and before D1's bench finished; one mechanism change, logged before
  its run). *Finding that motivates it* (D1 endocrine-diagnose, seeds 48 and 7, 30 + 30 days): the stress load now
  falls through the day (pooled adult males 0.306 at 07 h, 0.086 at 17 h, ratio 3.56; R 1.52), but arousal is flat
  (0.123 → 0.109, ratio 1.12; R 0.027 → 0.076, 0.36). A scratch check (seed 48, 10-day burn-in, 4 days, 25 male-nights;
  `chk/ard-check.ts` in the session scratch) shows why: the drive an adult male holds at his last waking slow step is 0
  on 88% of nights (in falling light, daylight 0.34 at onset, no close-rank male or swollen parous female in view) and
  large on the rest; its mean (0.071) equals the mean of his waking drive over the day (0.077). The drive is
  intermittent (mostly 0, now and then 0.3–0.6), so a snapshot gives most males no nocturnal rise and a few one capped at
  1. The derivation of `endoRhythmGainT` (§3) assumed the night amplifies the day's drive; the snapshot amplifies the
  dusk instant. *Change:* the held drive is the waking drive integrated with the state's own time constant (`ard` +=
  (drive − `ard`)·(1 − e^(−dt/τ)) at each waking slow step, `endoArousalTauH`; held unchanged through sleep), so the
  axis's nocturnal secretion amplifies the stimulation of the male's recent waking hours, not the view from his nest. No
  parameter changes; stress is unchanged. *Arm D2* = R + `endoRhythm` with iteration 2; endocrine-diagnose,
  calls-diagnose, `e-bench --quick --workers 2 --compare` R, from a frozen checkout of the commit that implements it.
  *Expected (D2 against R; D1 for the stress rows):* pooled arousal 07 h 0.2–0.35, 17 h 0.09–0.14, ratio 1.8–3.0
  (moderate); stress as D1 (high); adult-male pant-hoots morning ÷ afternoon within 0.6–1.0 (R 0.72, D1 0.81; high);
  T-END-8 fedurek2016 form mean r < 0 with at most half of the males positive (moderate); T-END-8 net of time of day
  within −0.15..0.15 (low); escalated attacks at most 10 per 60 seed-days, a larger morning share than R's (low);
  decided conflicts, T-COM-1, T-PTY-1 and the shared-row sums within noise (moderate); prescriptions unchanged (high);
  viability passes (high). Kill criterion and keep rule as §7.
