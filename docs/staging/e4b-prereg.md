# E4b pre-registration: a fast arousal state for acute reactions

Status: written and committed before the first run of the changed model (1 October 2026, branch `e4b-acute`, from `track-e` d855d1a, with `track-e` b861bee merged). Track E, stage E4, second piece. Builds on E4a (`docs/staging/e4a-prereg.md`). Patrols, hunting, gang attacks, infanticide and the call system are not touched.

Rule served: field values of behaviour are targets, never inputs. No dice may open an option.

## 1. Defects fixed first (bugs, not design; no run was needed to find them)

| Defect | Fix | Commit |
| --- | --- | --- |
| A stranger-call stress kick repeated every slow step (5 min) while calls went on | Only the start of a hearing episode kicks: a call heard after `endoHeardEpisodeH` (0.25 h, the window in which `observe()` still reports a heard chorus; design) without one (`endocrine.ts endoHeard`, called by `perception.ts hear` and the playback intervention before `heardAt` moves on) | 0530a7b, 27220f5 |
| A victim could get the aggression kick twice: charged in one slow step and re-stamped as the loser by the decision in the next, or charged and counter-charging in the same step | One kick per aggressive interaction, given or received: aggression stamps less than one slow step after the last kicked one belong to the same interaction (`x.aggKick`) | 0530a7b |
| Review 1: `endoEscalate`, `endoRedirect` or `endoRainDisplay` without `endoStates` removed the dice and left a state that never ran (score 0, the act absent) | A dependent switch counts as off unless `endoStates` is 1 (`endoOn`); the prescription ledger follows | 2fb334b |
| Review 2: the sharing test compared a value with itself | It checks the bounded kick on a receiver that already carries affiliation | 2fb334b |
| Review 3: the `endoRedirect` registry note described the old window | Describes the once-per-defeat rule | 2fb334b |

These change the E4a world whenever `endoStates` is 1 (fewer stress kicks), so the E4a reference is re-run (R0 below). Compressed goldens and the field switches-off pin are unchanged.

## 2. What the sources say (read 1 October 2026; details and tags in `docs/staging/e-sources.md` §13 and `docs/research.md` E.13)

**Two time scales.** Glucocorticoids permit, stimulate or suppress an ongoing stress response (sapolsky2000, abstract): the slow states act on a faster response, they are not it. Plasma catecholamines clear in minutes (half-lives of about 1 to 2.5 min in human pharmacology references; seen only in secondary sources, not verified). In captive chimpanzees, victims' self-scratching and self-grooming stayed above matched controls for the entire 10-min post-conflict window (fraser2008, Chester Zoo, 22 recipients, 234 PC–MC pairs) [M, captive]. In free-moving rhesus macaques, heart rate rose after the approach of a dominant, not of kin or a subordinate (aureli1999, 2 females) [L, cross-species]. In birds, agonistic heart-rate rises last seconds (wascher2021, review).

**Rain displays.** No wild rate was found. At the start of heavy rain adult males perform rhythmic displays (wild reports as summarised by hattoriTomonaga2020); in captivity an auditory beat induced rhythmic swaying, larger in males (7 chimpanzees, 3 males) [M, captive]. The old 12% roll (`rainDisplayP`) has no source.

**T-END-8, as the field defines it.** fedurek2016 (author copy, Methods): a male's "hourly" testosterone is the mean of each one-hour interval between 07:00 and 18:00 across the whole study, and his hourly pant-hoot rate the same; the association is across hours of the day within males (β = 0.47 ± 0.09; stronger in high-ranking males), plus a weaker monthly association. 11 males, 168 focal days of 6 h or more, 141 urine samples before 09:00 for the monthly analysis. Testosterone falls steadily through the day (mullerLipson2003). So the field row is about the daily profile. E4a's readout (arousal in hours with against without own pant-hoots) is a different statistic. The model's arousal has no time-of-day input (E4a, not wired on purpose).

**T-END-12.** samuni2017 (full text): urinary oxytocin higher before border patrols (6 subjects, 14 samples, 10 events, against 9 individuals, 38 samples, 34 control events) and during intergroup conflict (patrols and encounters alike), against three controls: 90-min periods without affiliation, at least 10 min of multipartner grooming, and group hunting (hunting intermediate). In the authors' words, "neither the presence of affiliation during intergroup conflict nor multipartner affiliation without intergroup conflict led to urinary oxytocin levels that differed from nonaffiliative intergroup conflict". Cohesion: fewer departures from the party during conflict. preis2018: oxytocin after aggression alone is not above periods without interaction. brooks2021 (captive, 29 chimpanzees): stranger pant-hoot playbacks brought animals closer, raised grooming in early trials and self-directed behaviour, and lowered later aggression. samuni2020b (Taï, 2 groups, 2 years): months with more patrols and encounters had less modular association, larger parties and less male aggression.

**Answer to the question put to this stage.** Can affiliation around intergroup contact emerge from behaviour (stressed animals seeking contact with bond partners) instead of a kick written for intergroup contact? The behaviour exists (brooks2021), but samuni2017's own controls rule it out as the cause of the oxytocin rise: affiliation during conflict did not change the level. A generic route (any acute arousal releases oxytocin) is ruled out by preis2018 (aggression alone does not). What is left is an out-group-specific driver, which encodes the row. E4b therefore does not wire affiliation; T-END-12 stays a genuine test and is expected to keep failing. Adding contact-seeking under threat would make the row pass by a route its source rules out, and would push male grooming further above its band (already 23% against 8–18%); it is not done.

## 3. Mechanism

**Fast arousal (catecholamine-like; sympathetic-adrenomedullary), `endoFast`, every individual.** One state in 0..1 per chimp, `x.fast`, stored with the eco-hour it was last set (`x.fastAt`) and read with exact decay, fast(t) = fast × exp(−(t − fastAt) / τ), so it costs nothing between events and reading it is pure. Kicks S += k × (1 − S), applied where the event happens:
- a daytime storm onset, every awake individual: `endoFastStormKick`;
- aggression received (charged or attacked, a decided loss, a gang attack): `endoFastThreatKick`.

**Acts that read it, with the slow states as gain.** The E4a rule holds: the constant score the dice-opened option had is the ceiling, levels in 0..1 scale it, no new score constant.
- **Rain display** (`endoRainDisplay` with `endoFast`): rainDisplayScore × min(1, fast × (1 + arousal)) × boldness. Testosterone-like arousal can at most double the acute drive and is not needed for it (at arousal 0 the drive is the fast state itself). Offered to adult males after a daytime storm onset until they have displayed once since it, for three fast time constants (`FAST_SPAN`, the state then below 5% of a kick) instead of `impulseDurationH`. No roll.
- **Redirected charge** (`endoFastRedirect`, needs `endoRedirect` and `endoFast`): fast × (redirectBase + redirectAggrW × aggression + redirectTensionW × tension + redirectStressW × stress) − guardian deterrent. This is the dice model's own score, opened by no roll and scaled by the acute state; the stress load is the gain through its existing term. E4a iteration 1's rule (the defeat considered once, at the first choice) is dropped under this switch: the option stays open after a loss until the loser next aggresses, for `FAST_SPAN` time constants, and the decay of the fast state does what the rule did.

All switches 0 by default; each needs `endoStates` (and `endoFastRedirect` needs `endoRedirect` and `endoFast`), and counts as off otherwise. At 0 the world is bit-identical to E4a's.

| Parameter | Value | Basis |
| --- | --- | --- |
| `endoFastTauMin` | 5 min | assumed. Bounded below by catecholamine clearance (half-lives about 1–2.5 min, secondary, unverified) and above by post-conflict anxiety in captive chimpanzees, still raised over the whole 10-min window (fraser2008 [M]): at τ = 5 min a kick is still 14% at 10 min and 0.8% at 25 min |
| `endoFastStormKick` | 0.8 | design. Direction: sudden loud noise and heavy rain are acute arousers (hattoriTomonaga2020, captive, males respond more [M]); size assumed: one of the strongest acute stimuli an animal meets, short of saturating the state |
| `endoFastThreatKick` | 0.8 | design. Direction: aureli1999 (heart rate up at a dominant's approach) [L], fraser2008 (post-conflict anxiety in victims) [M]; size assumed, equal to the storm |
| gain min(1, fast × (1 + arousal)) | — | design [L]: direction from the challenge hypothesis (testosterone and male competitive display; sobolewski2013, fedurek2016); form assumed |
| `FAST_SPAN` | 3 τ | design: the state is below 5% of a kick, so the option is not left on the menu at a score of nearly 0 |

**Not wired, on purpose.** Stranger calls or sight, attacks seen, food finds and reunions do not kick the fast state, because no act in E4b reads it in those contexts. Counter-calls and displays at strangers are deterministic context scores; travel pant-hoots (`travelCallPerH`, a fitted hazard that encodes T-COM-1) and the arrival pant-hoot coin (`random(world) < 0.5` at fig arrival) belong with the call-rate prescriptions, a later piece with T-COM rows at stake. Pant-hoots are therefore not gated by the fast state here; displays already end with a pant-hoot. Affiliation and the three slow states are unchanged.

## 4. T-END rows

| Row | Status under E4b | Note |
| --- | --- | --- |
| T-END-8 | genuine | No arousal or fast term in pant-hoot production. Only route by construction: rain displays (T-scaled) end with a pant-hoot, a handful of calls. Scored as fedurek2016 does (within-male correlation across hour-of-day bins 07–18), E4a's readout kept beside it |
| T-END-12 | genuine | Not touched (§2). Expected to fail as in E4a |
| T-END-4, -7, -10, -11, -12 reconciliation half, -5 intergroup half | encoded, as in E4a | unchanged |
| T-END-1, -2, -3, -6, -9 | genuine, as in E4a | unchanged by E4b except through behaviour |
| post-conflict anxiety (fraser2008) | would be encoded (a defeat kicks the fast state) | not registered as a row |

The T-END-8 definition in `e-targets.patch.json` ("a male's hourly competitive-arousal reading and his pant-hoots per hour") is ambiguous; the source's statistic is the daily profile. Recommended to the integrator: say so in the row's notes.

## 5. Arms and predictions (stated before any run of the changed model)

Seeds 48 and 7, field profile, 30-day burn-in + 30 days, rules policy, `--workers 1`. Timer world unless noted.
- **R0** reference: `endoStates`, `endoEscalate`, `endoRedirect` (E4a's keep candidate, with the §1 fixes).
- **R1** R0 + `endoFast` + `endoRainDisplay`.
- **R2** R1 + `endoFastRedirect`.
- **R3** if time allows: the physiological stack (`energyLedger`, `rhythmSleep`, `rhythmHeat` = 1) with R0's switches (R3a) and with R2's (R3b).
Each arm: `scripts/endocrine-diagnose.ts` and `scripts/e-bench.ts --quick`.

| Quantity | Prediction | Confidence |
| --- | --- | --- |
| Rain displays per community-year | R1, R2: above E4a's slow-state 0–2 and below the dice's 12–16. Boldness of adult males is uniform 0.3–0.9, so the score at an onset (≤ 1.5 × 0.83 × boldness) is under the shelter option (about 1.5 in a storm) for most males; the boldest display now and then | moderate |
| Rain displays come right after the onset | ≥ 80% within 10 min of the onset | high |
| Redirected charges | R2 above R0 (fast ≈ 0.8–0.96 after a defeat, against a stress load ≈ 0.4 as E4a's multiplier, and the option stays open for minutes): 1.5–3 × R0's per-conflict share | low |
| Redirect latency | R2: median under 2 min, ≥ 80% within 10 min of the loss | moderate |
| Decided conflicts, contact fights, injuries | R1 = R0 within noise; R2 at most +10% conflicts, injuries per conflict below 2 × R0 | moderate |
| Deaths from fights | none | moderate |
| T-END-8, E4a readout | still reversed in every arm | moderate |
| T-END-8, fedurek2016 form | mean within-male r near 0 in every arm (no diurnal input to arousal); no arm differs from R0 by more than seed noise | low |
| T-END-12 | still fails (affiliation lower with strangers about) in every arm; bond-partner grooming not higher with strangers about | high |
| Band distances | R1 and R2 within E4a's noise floor (±1.1 on each sum) of R0 | high |
| Prescription count | R1 = R0 − 1 (`rainDisplayP` no longer read: 133 → 132); R2 = R1 | high |
| Viability | passes | high |

## 6. Kill criterion

A switch stays off, and the result is recorded as a null, if on the development seeds:
- viability fails (births ÷ deaths, any starvation death the reference does not have, a seed below 80% of its start);
- deaths from fights rise above R0, or injuries per conflict at least double;
- held-out distance rises beyond the noise floor (+1.1) against R0;
- `endoFast` + `endoRainDisplay`: no rain display at all in R1 (the state does not carry the act);
- `endoFastRedirect`: redirect latency median over 2 min, or under 80% within 10 min of the loss (the state fails its purpose).

## 7. Iterations

At most three, each changing the mechanism from first principles, written here before its run. No weight or kick is tuned to a behavioural rate. A miss is a finding.

## 8. Results

### Run log (each entry written before its run)

- **R0–R2** (1 October 2026, code at ad17eea): R0 was first run (diagnosis and bench) at 2fb334b, after the §1 fixes and before any E4b code existed; its diagnosis is re-run at ad17eea because the diagnosis gained the E4b readouts (pant-hoots by act, T-END-8 in fedurek2016's form, bond-partner grooming around intergroup contact). R1 and R2 as in §5. Outputs in `artifacts/validation/e4b/` (gitignored), one heavy run at a time, `--workers 1`.
- **R0n, R2 again, R3a, R3b** (written after R0–R2, before running; no mechanism change). R2 raised decided conflicts by a third, beyond the +10% predicted. Two readouts and one control decide whether that is the redirect: the diagnosis gains redirect chains (redirects by an animal whose own loss was to a redirect, and decided conflicts won by a redirect) and R2 is re-diagnosed; **R0n** is R0 with `rgTemperature` 0.1641 instead of 0.164 (E4a's noise arm: one draw in thousands changes, the trajectory re-draws) to show how far decided conflicts move by chance. **R3a/R3b**: the physiological stack (`energyLedger`, `rhythmSleep`, `rhythmHeat` = 1) with R0's switches and with R2's, diagnosis and bench.

### Results (seeds 48, 7; 30-day burn-in + 30 days; field profile; rules policy)

Timer world: R0 = E4a's keep candidate with the §1 fixes; R0n = R0 with `rgTemperature` 0.1641 (noise); R1 = R0 + `endoFast` + `endoRainDisplay`; R2 = R1 + `endoFastRedirect` (re-diagnosed as R2b with the chain readout: identical world, identical counts). Stack: R3a = `energyLedger` + `rhythmSleep` + `rhythmHeat` + R0's switches; R3b = the stack + R2's. Simulation truth from `endocrine-diagnose.ts` (all communities, 0.49 community-years per arm); raw counts.

| Raw counts in 30 days, both seeds | R0 | R0n (noise) | R1 | R2 | R3a | R3b |
| --- | --- | --- | --- | --- | --- | --- |
| Daytime storm onsets | 10 | 6 | 8 | 7 | 7 | 5 |
| Rain displays (per onset) | 8 (0.8), dice | 3 (0.5), dice | 13 (1.6) | 21 (3.0) | 3 (0.4), dice | 16 (3.2) |
| Rain displays at the onset itself | 8 | 3 | 13 | 21 | 3 | 16 |
| Decided conflicts | 279 | 373 | 290 | 373 | 671 | 640 |
| Redirected charges | 13 | 12 | 8 | 34 | 16 | 60 |
| per decided conflict | 0.047 | 0.032 | 0.028 | 0.091 | 0.024 | 0.094 |
| within 10 min of the loss | 13 | 11 | 7 | 34 | 15 | 59 |
| latency, median (p90) | 0.25 (0.5) min | 0.25 (0.75) | 0.25 (14) | 0.25 (0.75) | 0.25 (0.75) | 0.25 (1.5) |
| by an animal whose loss was to a redirect | — | — | — | 1 | — | 5 |
| Escalated attacks | 3 | 1 | 0 | 1 | 3 | 1 |
| Contact fights and hits | 18 | 26 | 11 | 16 | 39 | 26 |
| Injuries | 1 | 0 | 0 | 0 | 2 | 0 |
| Deaths | 0 | 0 | 0 | 0 | 0 | 0 |
| Reconciled per decided conflict (truth) | 0.082 | 0.091 | 0.090 | 0.080 | 0.149 | 0.142 |

`e-bench --quick` (observer scorecard; distances summed over the rows scored in each run):

| Arm | Fitted | Held-out | Held-out without hunting, patrol and intergroup rows | Prescriptions | Viability | T-SOC-5 | T-SOC-9 | T-SOC-10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | 4.79 | 6.74 | 1.70 | 133 (the bench printed 134: it counted `endoHeardGapH` before its rename) | pass | 0.19 fail | insufficient | pass |
| R1 | 3.29 | 5.77 | 1.88 | 132 | pass | 0.19 fail | insufficient | pass |
| R2 | 4.57 | 2.95 | 1.34 | 132 | pass | 0.08 fail | insufficient | pass |
| R3a | 4.68 | 3.59 | 1.65 | 133 | pass | pass | pass (0.14) | pass |
| R3b | 4.26 | 4.65 | 2.41 | 132 | pass | pass | **1.09 fail** (−0.07) | pass |

Viability: every arm 0 births, 0 deaths, no starvation, 49 living at the end on each seed. The large held-out moves (R0 → R2 −3.8) sit in the patrol and hunting rows (T-PAT-2, T-PAT-3, T-HUN-4), which E4b does not touch and which E4a's noise arm moved by up to 2.7; on the other rows every move is inside E4a's noise floor (±1.1), except R3b's T-SOC-9 (below).

**Noise.** R0n changes one draw in thousands and moves decided conflicts from 279 to 373 (+34%). R2's 373 is therefore not an effect of the redirect: decided conflicts are not measurable to better than about a third in this window. The redirect's own rate is: 0.091–0.094 per decided conflict with the fast state against 0.024–0.047 in the four arms with E4a's rule.

**§5 predictions:**

| Quantity | Predicted | Observed | Verdict |
| --- | --- | --- | --- |
| Rain displays | above E4a's 0–2, below the dice's 12–16 per community-year (moderate) | 26–43 per community-year (1.6–3.2 per onset) against the dice's 0.4–0.8 per onset | **miss**: above the dice. My estimate of the shelter score at an onset (≈ 1.5, from a rain level of 0.9) was too high for natural storms; the bold males' display score (≤ 1.5 × 0.83 × boldness) competes with it |
| Rain displays right after the onset | ≥ 80% within 10 min (high) | all at the onset itself | confirmed |
| Redirected charges | R2 1.5–3 × R0's per-conflict share (low) | × 2.0 (× 2–4 against all E4a-rule arms) | confirmed |
| Redirect latency | median < 2 min, ≥ 80% within 10 min (moderate) | median 0.25 min; 100% (timer) and 98% (stack) within 10 min | confirmed |
| Conflicts, contact fights, injuries | R1 ≈ R0; R2 ≤ +10% conflicts; injuries per conflict < 2 × R0 (moderate) | R2 +34% conflicts, but the noise arm moves +34% too; contact fights and injuries not up | conflicts not measurable; injuries confirmed |
| Deaths from fights | none (moderate) | none | confirmed |
| T-END-8, E4a readout | still reversed (moderate) | reversed in every arm (0.021–0.031 with own pant-hoots against 0.031–0.051 without) | confirmed |
| T-END-8, fedurek2016 form | mean within-male r near 0, no arm off R0 beyond noise (low) | negative in every arm: r −0.14 to −0.33, positive in 3–9 of 27–28 males; R0n alone spans −0.18 to −0.30 | **miss** in sign (negative, not 0); no arm differs beyond noise |
| T-END-12 | still fails (high) | fails in every arm: affiliation 0.016–0.144 with strangers seen or heard in the hour against 0.099–0.215 without; bond-partner grooming lower too (0–0.08 against 0.10–0.21) | confirmed |
| Band distances | inside the noise floor of R0 (high) | timer: yes. Stack: held-out +1.07 (at the floor), T-SOC-9 (fitted) 0.14 pass → −0.07 fail | timer confirmed; stack borderline |
| Prescriptions | R1 = R2 = R0 − 1 (high) | 133 → 132 | confirmed |
| Viability | passes (high) | passes | confirmed |

**Kill criterion (§6): not met by any switch in any arm.** Viability passes; no fight deaths; injuries per conflict 0 with the fast switches; held-out does not rise beyond +1.1 (timer −1.0 R1, −3.8 R2 in the noisy rows; stack +1.07); rain displays occur (R1: 13); redirect latency median 0.25 min with ≥ 98% within 10 min.

**Other T-END rows** (hourly samples; R0 / R2 / R3b): T-END-3 passes in every arm (male stress 0.146–0.182 with a swollen parous female against 0.064–0.121 without); T-END-6 rank half passes weakly in every arm; T-END-2 weak form flickers with noise (top-third against bottom-third males 0.124 vs 0.131 in R0, 0.121 vs 0.117 in R2, 0.073 vs 0.071 in R3b); T-END-5 (partly encoded) passes; T-END-1 not testable (no unstable period); T-END-9 not scored.

**Context for the redirect rate, not a registered row.** At Taï the first post-conflict interaction of a conflict partner was redirected aggression after 88 of 876 conflicts, 10% (wittig2003; either partner, no time limit, the first interaction that day). The fast redirect gives 9% of decided conflicts (losers only, within minutes); E4a's rule gives 2–5%.

**Iterations.** None run. No kill criterion was met, and the misses are not mechanism failures that a first-principles change could address without tuning: the rain-display rate follows from the kick, boldness and the shelter score, none of which may be set to a behavioural rate (and no field rate exists); T-END-8 and T-END-12 have no route that E4b's mechanism can supply without encoding them (§2 and below).

### Verdict

- **`endoFast` + `endoRainDisplay`: provisional keep candidate.** Viability passes, held-out does not rise beyond the noise floor (timer or stack), the prescription count falls (133 → 132: `rainDisplayP` is no longer read), and E4a's null is resolved: the fast state carries the display at the storm onset without a roll. Caveat: the display is now 2–5 times as common as the old 12% roll gave (1.6–3.2 adult males per daytime storm onset across two communities), and no wild rate exists to judge it. A field row (share of daytime storms with a rain display, or of adult males displaying) should be registered before the switch goes on. Defaults stay off (track rule).
- **`endoFastRedirect`: null for keeping, informative.** It shows that the fast state can replace E4a's event gate (latency stays at 15 s median without the once-per-defeat rule; redirect chains are rare, 1 in 34 and 5 in 60), but it removes no counted prescription (the gate it replaces was a design rule), it doubles the redirect rate with no registered row to judge it against (wittig2003 is context), and on the stack the fitted reconciliation row T-SOC-9 fails (0.14 → −0.07, distance 1.09, at the noise floor), plausibly because a loser now redirects more often at the moment it would otherwise reconcile. Stays off.
- **T-END-8.** E4a's reverse failure was partly a readout problem: fedurek2016's "hourly" association is across the hours of the day (07–18) within males, carried by testosterone's morning peak and decline (mullerLipson2003). In that form the model still fails (r negative in every arm): its adult-male pant-hoots are mostly contact calls given with fewer than two community members in sight (35%) and calls while travelling or following at a fitted hazard (44%), displays 11–18%, while its arousal rises in company (rivals, swollen females). A circadian input to arousal (physiology measured independently of calling, mullerLipson2003) would make the row a test of the model's daily pant-hoot profile; its amplitude has no anchor in state units, so it was not added.
- **T-END-12.** Stays a genuine failing test by design (§2): the route the brief proposed (contact-seeking under threat) exists in captivity (brooks2021) but the field source's own controls rule it out as the cause (samuni2017), and a generic arousal → oxytocin route contradicts preis2018. The model also shows no contact-seeking: bond-partner grooming is lower, not higher, around intergroup contact.
- **Biggest open problem.** The model's call system, not its hormones, decides T-END-8: pant-hoots come from isolation and a fitted travel hazard, so no endocrine mechanism can produce the field's testosterone–calling association without either encoding it or first replacing the call-rate prescriptions (`travelCallPerH`, the arrival coin) with calls that follow from state and context.
