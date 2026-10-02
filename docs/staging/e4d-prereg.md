# E4d pre-registration: a sleep-gated daily rhythm in the slow hormone-like states

Status: written and committed before any run of the changed model (2 October 2026, branch `e4d-rhythm`, from `track-e`
2f9129f, which includes E4c). Track E, stage E4, fourth piece. Builds on E4a (`docs/staging/e4a-prereg.md`), E4b and E4c.
Patrols, hunting, gang attacks, infanticide and the call system are not touched.

Outcome (2 October 2026, §9): two iterations run; iteration 2 (`endoRhythm`) gives both slow states the field's daily
direction and turns T-END-8 into an honest failure; every band-distance sum is inside noise against the mean of four
reference runs (amendment); it removes no prescription, so it stays off (`removesNothing`).

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

Samples of the bench rows this stage may move (T-COM-1, T-COM-4, T-COM-8, T-PTY-1, T-IGE-1): as listed in e4c-prereg.md
§2 ("Samples of the rows scored"), unchanged; the T-END rows' samples are in docs/staging/e-targets.patch.json (T-END-8:
fedurek2016, above).

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
  *Iteration 2 (§9, logged before its run) replaced the held drive: it is the waking drive integrated over the waking
  slow steps with `endoArousalTauH`, held through sleep. The text above is the registered iteration 1.*

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

## 5. Readouts (each defined before any arm; smoke-tested with the switch on, §9 run log)

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

Run provenance (written after the runs): R and D1 from a frozen detached checkout of 0e92ab2 (simulation code 193ff76),
D2 from one of cbdc5a4 (iteration 2); load 9–13 on 12 cores, so the D2 bench ran with `--workers 1`. Every bench reports
0 uncommitted files. Outputs and the table helper in `artifacts/validation/e4d/` (gitignored).

### Results (seeds 48, 7; 30-day burn-in + 30 days; field profile; rules policy)

R = handoff §3's stack + `callValue`; D1 = R + `endoRhythm`, iteration 1 (the drive held at the last waking slow step);
D2 = R + `endoRhythm`, iteration 2 (the waking drive integrated with `endoArousalTauH`). Simulation truth from
endocrine-diagnose and calls-diagnose (all communities; AM = adult males), observer from `e-bench --quick`. Every number
in the table is printed by `artifacts/validation/e4d/e4d-table.ts` from the arms' JSON; none is typed. The registered
noise threshold (docs/staging/e-noise.md) was not recorded when these runs were judged; per the stage prompt,
differences on shared rows under about 1.5 are noise.

| Quantity | R | D1 | D2 |
| --- | --- | --- | --- |
| Testosterone-like arousal, pooled AM: 07 h / 17 h (07 ÷ 17; field 2.43) | 0.027 / 0.076 (0.36) | 0.123 / 0.109 (1.12) | 0.214 / 0.118 (1.82) |
| Cortisol-like stress, pooled AM: 07 h / 17 h (07 ÷ 17; field 2.64) | 0.117 / 0.077 (1.52) | 0.306 / 0.086 (3.56) | 0.304 / 0.085 (3.58) |
| AM pant-hoots per male-hour: 07–08 h / 15–18 h (ratio; field ≈ 4.3) | 0.58 / 0.68 (0.85) | 0.58 / 0.62 (0.94) | 0.6 / 0.65 (0.92) |
| Pant-hoots per awake hour: AM / adult females | 0.59 / 0.26 | 0.58 / 0.28 | 0.6 / 0.29 |
| T-END-8, fedurek2016 form: mean within-male r (males r > 0) | 0.36 (25/28) | -0.09 (13/28) | -0.29 (4/28) |
| T-END-8 net of time of day: mean within-male r across days (males r > 0) | -0.01 (11/28) | -0.01 (11/28) | -0.01 (15/28) |
| T-END-8, E4a readout: arousal with ≥ 1 own pant-hoot in the hour / none | 0.047 / 0.058 | 0.109 / 0.13 | 0.153 / 0.175 |
| Escalated attacks (60 seed-days): morning 06–11 / afternoon 12–18 | 3: 0 / 3 | 2: 1 / 1 | 8: 2 / 6 |
| Redirected charges: morning / afternoon | 34: 13 / 21 | 44: 21 / 23 | 36: 25 / 11 |
| Decided conflicts: all (morning / afternoon) | 1090 (448 / 642) | 1174 (491 / 683) | 1055 (476 / 579) |
| Reconciled per decided conflict: morning / afternoon | 0.183 / 0.167 | 0.165 / 0.163 | 0.141 / 0.162 |
| Contact fights and hits; injuries; deaths (truth) | 67; 3; 0 {} | 61; 1; 0 {} | 55; 3; 0 {} |
| Rain displays (per daytime storm onset) | 38 (8) | 12 (5) | 16 (6) |
| Stress, adult males, top / bottom third (T-END-2 weak form) | 0.085 / 0.083 | 0.164 / 0.146 | 0.156 / 0.148 |
| Male stress, swollen parous female in view / none (T-END-3) | 0.182 / 0.075 | 0.229 / 0.144 | 0.233 / 0.141 |
| T-COM-1 (observer) | 0.55 pass (d 0) | 0.52 pass (d 0) | 0.59 pass (d 0) |
| T-COM-4 (observer) | 0.4 pass | 0.43 pass | 0.36 pass |
| T-COM-8 (observer) | 0.64 fail (d 0.13) | 0.65 fail (d 0.16) | 0.63 fail (d 0.11) |
| T-PTY-1 (observer) | 4.24 pass (d 0) | 4.38 pass (d 0) | 4.13 pass (d 0) |
| T-IGE-1 (observer) | 0 inconclusive (d 0.71) | 3.06 inconclusive (d 0.28) | 3.18 inconclusive (d 0.26) |
| T-SOC-9 (observer) | 0.3 fail (d 0.6) | 0.11 pass (d 0) | 0.05 fail (d 0.19) |
| T-HUN-4 (observer) | 1.86 fail (d 0.08) | 1.58 pass (d 0) | 1.62 pass (d 0) |
| T-BRD-1 (observer) | — insufficient | — insufficient | — insufficient |
| Fitted / held-out distance (rows) | 6.03 (18) / 2.57 (15) | 6.28 (19) / 3.63 (17) | 4.77 (19) / 3.82 (17) |
| Against R on rows scored in both: fitted / held-out Δ (rows) | — | -0.02 (18) / +0.06 (15) | -1.52 (18) / +0.24 (15) |
| … without T-HUN-4 and T-BRD-1 | — | -0.02 (18) / +0.14 (14) | -1.52 (18) / +0.32 (14) |
| Prescriptions | 92 | 92 | 92 |
| Viability (per seed: living start → end, births, deaths, starvation) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) |
| Bench commit; uncommitted files | 0e92ab2; 0 | 0e92ab2; 0 | cbdc5a4; 0 |

D1 vs R: rows moving ≥ 0.2: T-SOC-9 -0.60 (fail → pass), T-COM-11 +0.56 (fail → fail), T-HUN-2 +0.54 (fail → fail), T-HUN-1 -0.41 (fail → fail), T-PAT-6 -0.33 (fail → fail), T-RNG-5 +0.30 (fail → fail), T-HUN-7 +0.25 (pass → fail); only in R: none; only in D1: T-IGE-1, T-IGE-2, T-PAT-7

D2 vs R: rows moving ≥ 0.2: T-PAT-6 -0.74 (fail → fail), T-HUN-1 -0.61 (fail → fail), T-SOC-9 -0.41 (fail → fail), T-HUN-8 +0.33 (pass → fail), T-COM-11 +0.30 (fail → fail), T-SOC-10 +0.26 (fail → fail); only in R: none; only in D2: T-IGE-1, T-IGE-2, T-PAT-7

Hourly pooled profiles (07–17 h; the state at half past the next hour, §5.1), normalized to 07 h, against the field
figures (fedurek2016 Fig. 4; girardButtoz2021 Fig. 1), and the shape distance (RMS of the normalized
profiles against the figure):

- field testosterone: 1, 0.85, 0.81, 0.69, 0.58, 0.61, 0.59, 0.54, 0.45, 0.42, 0.41
- field cortisol (immatures): 1, 0.95, 0.89, 0.81, 0.74, 0.67, 0.59, 0.53, 0.47, 0.43, 0.38
- R arousal: 1, 1.34, 1.64, 1.77, 2.04, 2.25, 2.35, 2.5, 2.72, 2.98, 2.81; stress: 1, 0.86, 0.74, 0.64, 0.63, 0.62, 0.61, 0.64, 0.68, 0.72, 0.66; pant-hoots per male-hour: 1, 1.11, 1.04, 1.12, 1.13, 0.94, 0.98, 1.31, 1.44, 1.59, 1.39
- D1 arousal: 1, 0.98, 0.97, 0.97, 0.98, 0.98, 0.98, 0.98, 0.98, 0.99, 0.89; stress: 1, 0.74, 0.54, 0.42, 0.37, 0.34, 0.31, 0.31, 0.3, 0.29, 0.28; pant-hoots per male-hour: 1, 1.06, 1.13, 1.05, 1.24, 1.08, 1.14, 1.45, 1.26, 1.46, 1.24
- D2 arousal: 1, 0.92, 0.85, 0.8, 0.74, 0.7, 0.66, 0.63, 0.59, 0.58, 0.55; stress: 1, 0.74, 0.54, 0.43, 0.36, 0.31, 0.29, 0.28, 0.28, 0.29, 0.28; pant-hoots per male-hour: 1, 1.12, 1.12, 1.06, 1.24, 1.04, 1.1, 1.37, 1.32, 1.54, 1.38
- R shape distance to the field (RMS of the normalized profiles): arousal 1.686, stress 0.163
- D1 shape distance to the field (RMS of the normalized profiles): arousal 0.381, stress 0.262
- D2 shape distance to the field (RMS of the normalized profiles): arousal 0.107, stress 0.27

Encoding check (registered §4.1): rain-display pant-hoots are 37 of 5,505 (0.0067) of AM pant-hoots in R, the only route from the
states to a pant-hoot; all displays together are 0.288 (status, reunion and rival displays read no state).

**§6 predictions, iteration 1 (D1 against R).**
- Arousal 07 ÷ 17: R below 1 confirmed (0.36); D1 above 1.5 **missed** (1.12); arousal at 07 h 0.2–0.6 **missed** (0.12).
  Cause (iteration 2 entry): the held drive is the dusk snapshot, 0 on most nights.
- Stress 07 ÷ 17: R about 1 (0.8–1.3) **missed** (1.52: the energy-deficit term already peaks after the night); D1 above
  1.5 confirmed (3.56).
- Pant-hoots morning ÷ afternoon unchanged within 0.8–1.3 × R: confirmed (0.85 → 0.94).
- T-END-8 fedurek2016 form: mean r ≤ 0, at most half of the males positive: confirmed (−0.09, 13 of 28).
- T-END-8 net of time of day within −0.15..0.15: confirmed (−0.01).
- Escalated attacks up × 2–4, more in the morning: **missed** (3 → 2; a handful of events).
- Redirected charges up a little in the morning: confirmed in direction (13 → 21 in the morning; 34 → 44 in all).
- Reconciliation lower in the morning than in the afternoon: **missed** in D1 (0.165 vs 0.163), confirmed in D2.
- Decided conflicts, injuries, deaths, T-COM-1, T-PTY-1, shared-row sums, prescriptions, viability: as predicted (table).

**Iteration 2 predictions (D2 against R).** Arousal 07 h 0.2–0.35, 17 h 0.09–0.14, ratio 1.8–3.0: confirmed (0.214,
0.118, 1.82, at the lower edge). Stress as D1: confirmed (3.58). Pant-hoots morning ÷ afternoon within 0.6–1.0: confirmed
(0.92 by calls-diagnose, 07–08 h ÷ 15–18 h; 0.73 by endocrine-diagnose's pant-hoot profile, 07 h ÷ 17 h, the readout
whose R and D1 values, 0.72 and 0.81, the entry quoted). T-END-8 mean r < 0, at most half positive: confirmed (−0.29, 4 of 28). Net of time of day within −0.15..0.15:
confirmed (−0.006). Escalated attacks at most 10, a larger morning share than R's: confirmed, on a handful of events
(8, 2 in the morning, against 3, none). Decided conflicts within noise: confirmed (1,055 against 1,090).
T-COM-1 and T-PTY-1 within noise: confirmed (0.59 and 4.13, both in band). Shared-row sums within noise: held-out
confirmed (+0.24 on 15 rows; +0.32 on 14 without T-HUN-4 and T-BRD-1); fitted −1.52 on 18 rows, at the edge of the
provisional ±1.5, carried by T-PAT-6 (−0.74) and T-HUN-1 (−0.61), the patrol and hunting rows the noise arms move most:
inside noise, not a result. Prescriptions unchanged: confirmed (92). Viability: confirmed (49 → 49 on each seed, no
births, deaths or starvation).

**Kill criterion (§7), D2 against R: not met.** Viability passes (no death of any kind in the window, no seed below
80%). No death from fights; injuries 3 in 1,055 decided conflicts against 3 in 1,090. Held-out distance inside noise
(+0.24; +0.32 without the rare-event rows). The mechanism does its job: pooled arousal and stress are both higher at
07 h than at 17 h. (D1 was not killed by the letter either, its arousal being 0.123 against 0.109, but it missed its
registered ratio, which iteration 2 addressed.)

**Reading.**
- *The states.* With iteration 2 both slow states peak at waking and fall through the day, tied to each animal's own
  sleep and to no hour. The stress load's fall (3.58) overshoots the immature field ratio (2.64) because its tonic target
  already peaks after the night (R 1.52: hunger rises overnight and the deficit term reads it); the sleep gain multiplies
  that peak. This is in the direction girardButtoz2021 discuss (nutritional stress raises early-morning cortisol), and
  adult males' slope is steeper than immatures' in that study; it is reported, not tuned. The arousal fall (1.82)
  undershoots the field's 2.43 and is more even through the day than the figure's (fast fall to 11 h, plateau, floor
  from 16 h): the waking drive keeps recharging the state as parties form, which the derivation's constant waking target
  did not include. The cortisol-like course is front-loaded against the figure's steady fall, as registered (§3).
- *Calls.* Adult-male pant-hoots have no daily course in any arm: a burst in the first hour after the nest (06 h), flat
  around 0.5 per male-hour through midday, rising to about 0.8 at 17 h, against the field's steady fall from 1.46 at 07 h
  to 0.13 at 18 h. No call reads the states (rain-display pant-hoots are under 1% of adult-male pant-hoots), so the
  rhythm cannot move them, as registered.
- *T-END-8.* The reference passed the fedurek2016 form for the wrong reason (both arousal and calls rising through the
  afternoon). With the field-shaped rhythm the row fails (mean r −0.29, 4 of 28 males positive): it is now an honest
  test, and it says the call system lacks a daily course. Net of time of day (a male's arousal before 09:00 against his
  call rate that day) the association is zero in every arm (field: positive at the monthly scale).
- *Acts that read the states.* Redirected charges move to the morning (stress-scaled: 25 of 36 in the morning in D2
  against 13 of 34 in R), reconciliation per decided conflict is lower in the morning (0.141 against 0.162 in the
  afternoon; R 0.183 and 0.167), escalated attacks rise from 3 to 8 (a handful). No field row registers these timings. (Against four reference runs, amendment below: the escalation rise and the redirects' morning share are beyond noise; the reconciliation difference is not.)
- *The bench.* Nothing moves beyond noise: the fitted change (−1.52 on 18 shared rows) sits at the provisional edge and
  comes from T-PAT-6 and T-HUN-1 (inside noise against four reference runs: amendment below); held-out +0.24 (+0.32 without T-HUN-4 and T-BRD-1). T-COM-1, T-PTY-1, T-COM-4 stay in
  band; T-END-2 (weak form) and T-END-3 still pass (stress 0.156 vs 0.148 by rank thirds; 0.233 with a swollen parous
  female in view against 0.141).

**Decision: no iteration 3.** Iteration 2 did what it was for. The remaining misses are outside the mechanism (calls,
which read no state, by E4c's design) or registered misfits of tying the rhythm to sleep (the cortisol-like course is
front-loaded; the arousal course is more even than the figure's). A third change would either tune the gains to the
model's own totals or wire calls to the states, which is another stage.

### Verdict

| Switch | Result | Decision |
| --- | --- | --- |
| `endoRhythm` (iteration 2) | Both slow states peak at waking and fall through the day from each animal's own sleep, with no hour: arousal 07 h ÷ 17 h 0.36 → 1.82 (field 2.43), stress 1.52 → 3.58 (field 2.64, immatures). Calls keep no daily course (0.85 → 0.92; field ≈ 4.3), so T-END-8 in fedurek2016's form turns from a pass for the wrong reason (+0.36, 25 of 28 males) into an honest failure (−0.29, 4 of 28). Viability passes. Against the mean of four reference runs (amendment) every band-distance sum is inside noise (D2: fitted −0.81 (z −1.0, 16 rows), held-out +0.31 (z +0.2, 12 rows), held-out without T-HUN-4 and T-BRD-1 +0.47 (z +0.9, 11 rows)); beyond noise only the encoded hormone profiles, T-END-8, escalated attacks (8 against 1 ± 1) and the morning share of redirects (0.69 against 0.38 ± 0.05). Removes no prescription (92 → 92) | **off** (`removesNothing`): not a keep under the track's rule. A physiology correction for the integrator to stack under any later call–hormone or patrol stage: it makes the hormone rows and T-END-8 honest tests. The escalation and redirect timing changes have no field row; a 5-seed confirm would be needed before any behavioural claim |

**Biggest open problem.** The call system has no daily course of its own: a burst in the first hour after the nest,
flat through midday, rising toward 17 h, against the field's steady fall from 1.46 per male-hour at 07 h to 0.13 at
18 h. With the hormone now field-shaped and read by no call, the morning peak and T-END-8 hinge on the calls. Two routes,
each a stage of its own: (a) a testosterone-mediated call motivation (fedurek2016's reading), which would encode
T-END-8's hourly form and leave the association net of time of day, patrols and displays as tests; (b) a contact dynamic
that peaks after the night's fission (allies scattered over their nests and found again in the morning), which would
leave T-END-8 genuine.

### Amendment: the integrator's noise rule (2 October 2026; written after R, D1 and D2 ran and were read; disclosed)

The integrator recorded the noise threshold after these runs (docs/staging/e-noise.md, Amendment 2, merged here from
`track-e`) and asked every stage to judge arms against the mean of replicated references. Added now, before any further
run, with no other change to the registration:
- **Rn1, Rn2, Rn3**: R with `rgTemperature` 0.1641, 0.1639 and 0.16405 added to its overrides (re-draws of the same
  model), each with endocrine-diagnose, calls-diagnose and `e-bench --quick`, from a frozen detached checkout of the
  commit that adds this entry (its simulation code is identical to the R run's with `endoRhythm` 0: the commits since
  0e92ab2 touch the switch-on path, tests, scripts and docs only).
- On rows counted in all runs compared, z = (arm − mean of the four R runs) ÷ (SD × √(1 + 1/4)), SD the per-run SD of
  the integrator's quick mode (fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48) or the four R
  runs' own SD if larger; |z| > 2 is a result, anything less is "inside noise". T-HUN-4 and T-BRD-1 cannot be judged
  on one 60-day run.
- For the diagnosis readouts (hourly profiles, ratios, T-END-8, call ratios, act counts) the four R runs' mean and SD
  are reported beside each arm's value, and the same z is given.
- Prediction (before the re-draws ran): D1 and D2 are inside noise on every sum; the hormone profiles of D2 lie many
  SDs from the R runs' (the rhythm is a construction, §4.1); the call ratio and T-END-8 net of time of day of D1 and D2
  lie within 2 SD of the R runs'; T-END-8 in fedurek2016's form of D2 lies beyond 2 SD below the R runs' (moderate).

#### Amendment results (Rn1–Rn3 at cfc7842; every number printed by `artifacts/validation/e4d/e4d-z.ts` from the runs' JSON)

| Sum (rows counted in all 4 R runs and the arm) | R runs: mean ± SD (each) | SD used | D1: value, Δ, z | D2: value, Δ, z |
| --- | --- | --- | --- | --- |
| Fitted | 4.73 ± 0.67 (4.69, 3.81, 5.05, 5.37; 16 rows) | 0.69 | 5.01, +0.28, z +0.4 (16 rows) | 3.92, -0.81, z -1.0 (16 rows) |
| Held-out | 2.38 ± 0.23 (2.45, 2.67, 2.26, 2.15; 12 rows) | 1.26 | 2.63, +0.24, z +0.2 (12 rows) | 2.69, +0.31, z +0.2 (12 rows) |
| Held-out without T-HUN-4 and T-BRD-1 | 2.22 ± 0.14 (2.37, 2.22, 2.26, 2.04; 11 rows) | 0.48 | 2.63, +0.40, z +0.7 (11 rows) | 2.69, +0.47, z +0.9 (11 rows) |

Prescriptions: r 92, rn1 92, rn2 92, rn3 92, d1 92, d2 92

| Readout | R runs: mean ± SD (R, Rn1, Rn2, Rn3) | D1 (z) | D2 (z) |
| --- | --- | --- | --- |
| Arousal, pooled AM, 07 h | 0.027 ± 0.003 (0.027, 0.029, 0.029, 0.023) | 0.123 (+27.2) | 0.214 (+53.4) |
| Arousal, 17 h | 0.086 ± 0.013 (0.076, 0.101, 0.094, 0.074) | 0.109 (+1.6) | 0.118 (+2.2) |
| Arousal 07 ÷ 17 (field 2.43) | 0.32 ± 0.03 (0.36, 0.29, 0.31, 0.31) | 1.12 (+26.4) | 1.82 (+49.2) |
| Stress, pooled AM, 07 h | 0.117 ± 0.003 (0.117, 0.119, 0.120, 0.114) | 0.306 (+61.1) | 0.304 (+60.3) |
| Stress, 17 h | 0.080 ± 0.003 (0.077, 0.081, 0.083, 0.080) | 0.086 (+1.9) | 0.085 (+1.5) |
| Stress 07 ÷ 17 (field 2.64) | 1.46 ± 0.05 (1.52, 1.46, 1.44, 1.41) | 3.56 (+40.2) | 3.58 (+40.5) |
| AM pant-hoots 07–08 h ÷ 15–18 h (field ≈ 4.3) | 0.94 ± 0.06 (0.85, 0.97, 0.99, 0.97) | 0.94 (-0.1) | 0.92 (-0.3) |
| AM pant-hoots per awake hour | 0.59 ± 0.03 (0.59, 0.59, 0.56, 0.63) | 0.58 (-0.3) | 0.60 (+0.5) |
| T-END-8, fedurek2016 form, mean r | 0.25 ± 0.08 (0.36, 0.21, 0.16, 0.26) | -0.09 (-3.6) | -0.29 (-5.7) |
| T-END-8, males with r > 0 (of 28) | 21 ± 3 (25, 18, 20, 21) | 13 (-2.4) | 4 (-5.2) |
| T-END-8 net of time of day, mean r | -0.026 ± 0.033 (-0.007, 0.009, -0.062, -0.045) | -0.011 (+0.4) | -0.006 (+0.6) |
| Escalated attacks | 1 ± 1 (3, 1, 0, 0) | 2 (+0.6) | 8 (+4.4) |
| Redirected charges, morning share | 0.38 ± 0.05 (0.38, 0.34, 0.45, 0.33) | 0.48 (+1.7) | 0.69 (+5.3) |
| Decided conflicts | 1084 ± 67 (1090, 1165, 1081, 1000) | 1174 (+1.2) | 1055 (-0.4) |
| Reconciled per conflict, morning − afternoon | 0.010 ± 0.029 (0.016, 0.007, -0.027, 0.044) | 0.002 (-0.2) | -0.022 (-1.0) |
| T-COM-1 (observer) | 0.55 ± 0.04 (0.55, 0.51, 0.53, 0.59) | 0.52 (-0.6) | 0.59 (+1.0) |
| T-PTY-1 (observer) | 4.34 ± 0.14 (4.24, 4.39, 4.51, 4.21) | 4.38 (+0.3) | 4.13 (-1.3) |

**Reading of the amendment.**
- *Band distances.* On the rows counted in all four reference runs and the arm (16 fitted, 12 held-out, 11 held-out
  without T-HUN-4 and T-BRD-1), every sum is inside noise: D1 +0.28 (z +0.4), +0.24 (z +0.2), +0.40 (z +0.7); D2 −0.81
  (z −1.0), +0.31 (z +0.2), +0.47 (z +0.9). D2's fitted −1.52 against the single R run (18 rows) shrinks to −0.81 against
  the reference mean. T-COM-1 (z −0.6, +1.0) and T-PTY-1 (z +0.3, −1.3) stay inside the reference spread. Viability
  passes in all six runs (49 → 49 on each seed, no birth, death or starvation).
- *The states* lie 27–61 SDs from the four reference runs at 07 h and 1.5–2.2 at 17 h: the rhythm is the construction
  (§4.1), so these z values say only that the mechanism works, not that anything emerged.
- *Calls.* The adult-male 07–08 h ÷ 15–18 h ratio of the reference runs is 0.94 ± 0.06 (0.85 in the run R happened to
  be); D1 and D2 sit inside it (z −0.1, −0.3). The calls' missing daily course is the model's, not a draw.
- *T-END-8.* The reference's positive within-male association is reproducible (mean r +0.25 ± 0.08; positive in all
  four runs, 18–25 of 28 males), i.e. a stable property of a model whose arousal and calls both rise into the
  afternoon. With the rhythm it reverses: D1 −0.09 (z −3.6), D2 −0.29 (z −5.7; 4 of 28 males, z −5.2). Net of time of
  day the association is zero in every run (−0.026 ± 0.033; D1 and D2 inside).
- *Acts that read the states* (no field row; direction partly encoded, size genuine). Escalated attacks rise beyond
  noise in D2 (8 against 1 ± 1, z +4.4), but 6 of the 8 fall in the afternoon, so the encoded direction (more in the
  morning) does not appear; plausibly because escalation also needs a close-rank rival in view and is damped by
  stress, which peaks in the morning with arousal (not measured). The morning share of redirected charges rises beyond noise (0.69 against 0.38 ± 0.05, z +5.3; D1
  0.48, z +1.7), as the stress-scaled redirect follows the stress peak. Decided conflicts (z −0.4) and the morning
  against afternoon reconciliation difference (z −1.0) stay inside noise.
- *Predictions of the amendment*: band sums inside noise: confirmed (|z| ≤ 1.0); hormone profiles many SDs from the reference:
  confirmed; call ratio and net-of-time association within 2 SD: confirmed; T-END-8 (fedurek2016 form) of D2 beyond 2 SD
  below: confirmed (z −5.7).

### Appendix: the gain computation behind §3 (added after the runs; it documents the computation that gave §3's values, unchanged)

A state with time constant τ relaxes toward target 1 while awake (06:50–18:50) and toward k while asleep; the periodic
solution is found by integrating 30 days in steps of 30 s from any start. The ratio is the mean over 07:00–07:59 ÷ the
mean over 17:00–17:59; k is found by bisection so that the ratio equals the field's.

```python
import math
def periodic(k, tau, wake=6 + 50/60, sleep=18 + 50/60, dt=1/120):
    A = 1.0
    for _ in range(30):
        prof, t = [], 0.0
        while t < 24 - 1e-9:
            A += ((k if not (wake <= t < sleep) else 1.0) - A) * (1 - math.exp(-dt / tau)); prof.append((t, A)); t += dt
    return prof
def ratio(k, tau):
    p = periodic(k, tau); m = lambda h: sum(a for t, a in p if h <= t < h + 1) / sum(1 for t, a in p if h <= t < h + 1)
    return m(7) / m(17)
def solve(R, tau, lo=1.0, hi=80.0):
    for _ in range(50):
        k = (lo + hi) / 2
        lo, hi = (k, hi) if ratio(k, tau) < R else (lo, k)
    return k
# testosterone: solve(124/51, 6.0) = 4.35 (ratios 2.0 and 3.0: 3.04, 6.84)
# cortisol:     solve(math.exp(0.97), 3.4) = 3.38 (ratios 2.2 and 3.5: 2.70, 4.83)
```
