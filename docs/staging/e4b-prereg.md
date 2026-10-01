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
