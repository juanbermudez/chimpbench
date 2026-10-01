# E4a pre-registration: three slow internal states replace the first dice

Status: written and committed before the first run of the changed model (1 October 2026, branch `worktree-agent-a167d633d1a24ba31`, from `main` f24c9ae). Track E, stage E4, first piece. Patrols, hunting, gang attacks and infanticide are not touched.

Rule served: field values of behaviour are targets, never inputs. A probability that exists to make a behaviour happen at some rate is removed. Only physiology measured independently of the behaviour may be a parameter.

## 1. What is removed

| Dice today | Where | Switch that removes it |
| --- | --- | --- |
| Escalation impulse, `escalateImpulseBase + escalateImpulseAggr × aggression` per attended close-rank adult male per perception (0.2–0.8%); the attack it opens scores a constant 1.25 | `perception.ts rollImpulses`, `candidates.ts aggression` | `endoEscalate` |
| Redirect priming, `redirectBaseP + redirectAggrP × aggression` per loss (8–23%), then a 6-minute window | `conflict.ts decided`, `candidates.ts aggression` | `endoRedirect` |
| Rain display, `rainDisplayP` (12% of adult males at storm onset); the display it opens scores a constant 1.5 | `tick.ts rainOnset`, `candidates.ts` | `endoRainDisplay` |

`endoStates` runs the three states. All four switches default to 0 in both profiles; at 0 the world is bit-identical to today. With a switch on, its probability parameters are not read and draw nothing from `world.rng`.

## 2. Mechanism

Three states per chimp, each in 0..1, each a leaky integrator `S += (target − S) × (1 − exp(−dt/τ))`, stepped every slow step (5 eco-min) from the animal's last perception, plus bounded kicks `S += k × (1 − S)` at events. No randomness.

**Stress load (cortisol-like).** The existing `chimp.stress` is the state itself; no second stress notion is added. Reason: every existing event kick (loss +0.2 or +0.35, win +0.05, grooming, reconciliation, consolation, gang attack, infanticide) and every score term that reads stress (pant-grunt, submit, reconcile, redirect) already uses it, and its existing relaxation (0.25 per hour, τ = 4 h) is already of the hormone's time scale. With `endoStates` on, the fixed relaxation toward a constant floor is replaced by:
- target = `stressFloor` + bereavement (existing) + `endoStressDeficitW` × energy deficit + `endoStressStrangerW` × strangers in view. Energy deficit = ½ hunger + ½ (1 − cond).
- kicks: `endoStressAggrKick` when the animal starts a charge or attack, or is the target of one; `endoStressStrangerW` when a stranger chorus is heard.
- recovery rate = (1/τ) × (1 + `endoAffilBufferK` × affiliation): the affiliation state speeds recovery.

**Competitive arousal (testosterone-like), adult males (15 y and over) only.**
- target = `endoArousalOestrusW` × (largest swelling among parous, unrelated females of the community in view) + `endoArousalRivalW` × (rank closeness of the closest-rank adult male in view, 1 − |ΔElo| ÷ `escalateEloGap`).
- kick: `endoArousalWinKick` on a decided conflict won.

**Affiliation (oxytocin-like), everyone.**
- target = bond with the partner while in grooming contact (giving or receiving), else 0.
- kicks: `endoAffilShareKick` on food sharing (giver and receiver); `endoAffilRepairKick` on reconciliation (both) and consolation (both).

**Not wired, on purpose** (they stay tests of the mechanism): rank (sites disagree), hierarchy instability, parous oestrous females → stress, time of day, patrols, intergroup conflict → affiliation, pant-hooting. The brief listed instability as a driver of stress and arousal; it is left out so that T-END-1 stays a genuine test (instability can still reach the states through the aggression it causes).

**The one scoring rule.** The constant score a dice-opened option had becomes the ceiling; state and trait levels in 0..1 multiply it. No new score constant is introduced.
- Escalated attack on a close-rank adult male: `endoEscalateScore` (1.25, the old literal) × arousal × ½(own aggression + tension toward him) × (1 − stress) × (1 − affiliation × bond with him). Offered whenever the old preconditions hold (adult male, rival adult male of the community within `escalateEloGap` Elo and within `escalateDistM` and `escalateAttackRangeM`), plus the existing refractory gate of status aggression (no own aggression in the last 1.5 h) and a score above 0.
- Redirected charge at a dominated, unrelated bystander: stress × (`redirectBase` + `redirectAggrW` × aggression + `redirectTensionW` × tension toward the bystander + `redirectStressW`), minus the guardian deterrent as today. Offered after every lost conflict until the animal next aggresses, for one stress time constant (`endoStressTauH`) instead of the 6-minute window.
- Rain display: `rainDisplayScore` (1.5) × arousal × boldness, offered to every adult male for `impulseDurationH` after a daytime storm onset, once.

Whether the animal then does it is its choice among its options (the menu draw of the RG policy), not a roll that opens the option. The scores are not fitted to the old probabilities or to any behavioural rate.

## 3. Drivers and time constants

Source keys are those of `docs/staging/e-sources.md` (track-e worktree, E4 section, read 1 October 2026). They are not yet in `docs/research.md`, so the registry tags every entry `assumed` and names the key in its note. "Direction" = the sign is verified; the magnitude in state units is a design assumption in every row.

| Parameter | Value | Basis |
| --- | --- | --- |
| `endoStressTauH` | 3.4 h | Urinary glucocorticoid peak 135–270 min after an event (wittig2015, full text) [M]; midpoint. That is the lag of the field readout; using it as the state's time constant is assumed |
| `endoArousalTauH` | 6 h | assumed, pending e-sources (no verified constant; labelled steroid peaks in urine within 5.5 h, bahr2000 [M], one captive male) |
| `endoAffilTauH` | 1 h | assumed, pending e-sources (listed there as a gap) |
| `endoStressAggrKick` | 0.1 | Direction [H] wittig2015: stress rises after a single aggressive interaction, in aggressor and victim (112% against 85% after rest; 9 males) |
| `endoStressDeficitW` | 0.3 | Direction [M] emeryThompson2010 (abstract only, n not given): lactating females higher in months of low fruit consumption. For males the evidence conflicts (mullerWrangham2004a against muller2021), so for them it is assumed |
| `endoStressStrangerW` | 0.2 | Direction [H] wittig2016: 22% higher after intergroup encounters than after grooming |
| `endoAffilBufferK` | 1 | Direction [H] wittig2016: 23% lower with a bond partner in every context. The route (affiliation speeds recovery) and the size are assumed |
| `endoArousalOestrusW` | 0.6 | Direction [M] sobolewski2013 (abstract): testosterone above baseline with parous oestrous females, not with nulliparous ones |
| `endoArousalRivalW` | 0.4 | assumed, pending e-sources (challenge hypothesis; mullerWrangham2004b seen only as cited) |
| `endoArousalWinKick` | 0.15 | assumed, pending e-sources (winner effect; no wild chimpanzee source) |
| grooming → affiliation target = bond | — | Direction [M] crockford2013 (abstract only, n not given): higher after grooming with a bond partner than with a non-bond partner or none |
| `endoAffilShareKick` | 0.5 | Direction [M] wittig2014 (abstract only, n not given): higher after food sharing than after grooming, whatever the bond |
| `endoAffilRepairKick` | 0.3 | Direction [M] preis2018 (abstract): higher after reconciliation and bystander affiliation than after aggression alone |
| `endoEscalateScore` | 1.25 | design: the constant score of the old impulse-opened attack, now the ceiling |
| parity proxy | — | A female counts as parous at 15 y or over, or once she has had an amenorrhoea set by a birth (first births at about 14–15.5 y in Kibale; design) |

**T-END rows (staged, `docs/staging/e-targets.patch.json`).** Encoded by construction: T-END-4 (stress after aggression), T-END-10 (affiliation after grooming a bond partner), T-END-11 (after food sharing), T-END-7 (arousal with parous against nulliparous oestrous females), the reconciliation half of T-END-12, and the intergroup-above-grooming half of T-END-5. Partly encoded: T-END-5 bond-partner half (through affiliation, not through the partner's presence), T-END-6 food half (through hunger and condition). Genuine tests: T-END-1 (instability), T-END-2 (rank), T-END-3 (male stress with parous oestrous females), the rank half of T-END-6, T-END-8 (pant-hoots), T-END-9 (patrols; not to be used for design), the intergroup half of T-END-12.

## 4. Expected direction (stated before any run)

Baseline (dice, quick check below): 5.7 decided conflicts per day in the observed community (truth), contact share 0.07, reconciled 0.07 (uncorrected), consoled 0.04.

| Quantity | Expectation with all four switches on | Confidence |
| --- | --- | --- |
| Escalated attacks per community-year | Unknown in size. The option is on offer far more often than the dice opened it, at a low score (about 0.05–0.2 without an oestrous female in view, up to about 0.5 with one and with tension). Guess: more than with dice | low |
| Decided conflicts per community-year | Up a little (more redirects on offer, more escalations) | low |
| Share escalating to contact fights (0.07) | Up | moderate |
| Redirected aggression share of losses | Offered after every loss for hours, at a score of about 0.15–0.35 instead of 0.5–0.9 for 6 minutes after 8–23% of losses. Guess: similar or higher | low |
| Rain displays | Down sharply, near zero (score mostly under 0.5 against shelter at about 1.5) | high |
| Reconciliation, T-SOC-9 | Down: resting stress is higher (energy deficit) and reconciliation is scored `− stress × reconcileStressW` | moderate |
| Third-party affiliation, T-SOC-10 | No clear change | low |
| Hierarchy steepness, T-SOC-5 | Up slightly if close-rank males settle more contests by contact | low |
| Alpha tenure, T-SOC-7 | Not measurable in 60 days | — |
| Injuries from fights | Up with escalations | moderate |
| Deaths from fights | None expected in 60 days (baseline none) | moderate |
| Stress by context (diagnosis) | Higher after losses and aggression (encoded); higher in unstable periods and with oestrous females only if aggression carries it (genuine) | — |

## 5. Kill criterion

The switches stay off, and the result is recorded as a null, if any of these holds on the development seeds:
- the population is not viable (C13 guard: births ÷ deaths, any starvation death that the baseline does not have);
- deaths from fights are clearly above the baseline, or injuries per conflict at least double;
- held-out rows are clearly worse (summed band distance up, integrator's 365-day run).

## 6. Protocol

- Quick check only (machine under load; coordinator limit: burn-in + days ≤ 90): `pnpm exec tsx scripts/field-metrics.ts --profile field --days 30 --burn-in 30 --seeds 48,7 --workers 2`, with and without `--params '{"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoRainDisplay":1}'`.
- `scripts/endocrine-diagnose.ts` (simulation truth, same seeds and window): escalations, redirects and rain displays per community-year with and without the switches; the three states by sex and rank; their course around events.
- Development seeds 48 and 7 only. The 365-day, 5-seed benchmark is the integrator's.
- Iterations change the mechanism from first principles and are logged below. No weight is tuned to a behavioural rate.

## 7. Results

### Run log (each entry written before its run)

- **R1** (1 October 2026, after merging `track-e` at 5ef6265): baseline and all four switches, `e-bench --quick` and `endocrine-diagnose.ts` (seeds 48, 7; 30 + 30 days). Outputs in `artifacts/validation/e4a/` (gitignored).
- **R2** (written after R1, before running; no mechanism change): (a) a noise-floor arm: the baseline with `rgTemperature` 0.1641 instead of 0.164, a behaviourally negligible change that only re-draws the trajectory, to show how far rows move by chance in a 30-day window on two seeds; (b) the physiological stack (`energyLedger`, `rhythmSleep`, `rhythmHeat` = 1) without and with the four E4a switches, because the energy deficit is meant to drive stress and the timer hunger of the baseline is not an energy balance. `endocrine-diagnose.ts` gained three genuine readouts (T-END-6 rank half, T-END-8, T-END-12 intergroup half); R1's diagnosis is re-run with them.
