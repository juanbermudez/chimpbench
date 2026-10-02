# E3 pre-registration: urgency replaces fixed choice constants

Written 1 October 2026, before any run of the changed model (unit tests with a switch on included). Track E rule: field
values of behaviour are targets, never inputs. No constant below was or will be set from a behavioural rate.

## 1. What is removed

| Prescription today | Value | Replaced by | Switch |
| --- | --- | --- | --- |
| `rgTemperature` | 0.164 field, 0.152 compressed (set so the top option wins a median 0.77) | temperature from urgency (§3) | `urgencyChoice` |
| `rgMaxAgeH` | 0.5 h | the pay test (§4) | `urgencyPersist` |
| need buckets (0.4 / 0.55 / 0.7 / 0.88) as a re-decision trigger | 4 thresholds | the pay test (§4) | `urgencyPersist` |
| the feeding patch test's ratio and hunger floor (`GATE.patchRatio` 2, hunger ≥ 0.4) | 2 constants | the pay test with ratio 1 and no floor (§4) | `urgencyPersist` |
| `continueBonus` | +0.25 | nothing (§5) | `urgencySwitchCost` |
| `finishedPenalty` | −0.5 | nothing (§5) | `urgencySwitchCost` |

All three switches default to 0 in both profiles. At 0 every choice is bit-identical to today (tested), so compressed
goldens and field hashes do not move. With a switch on, the constants it replaces have no effect (tested).

Not removed here: the period trigger of the gate (night, dawn, morning, midday 11:30–14:30, afternoon, dusk). It is a
clock rule and belongs to stage E2 (daily rhythm). Interrupts, the hunt-encounter rule, the C14 patrol rule, the
"ended" test and the arrival conversion are unchanged.

## 2. Frame and urgency

Homeostatic reinforcement learning (Keramati & Gutkin 2014, eLife 3:e04811; **pending e-sources**, not yet in
`docs/research.md`): reward is the reduction of the distance of the internal state from its set points. Marginal value
theorem [charnov1976]: leave a patch when it pays less than the best alternative, travel included.

- **Deficits** d_i in [0, 1], the contract's readouts: hunger, thirst, fatigue (1 − energy), loneliness (1 − social), stress.
- **Drive** D = Σ d_i². This is Keramati & Gutkin's drive with exponents n = 2, m = 1: the smallest integer choice in
  which a deprived animal values relief more than a sated one (n > 1). It is the form design A's U policy already used
  (`U_WEIGHTS.needSlope`: "each need costs n², so relieving it is worth 2n per unit"). Structural choice, design.
- **Marginal drive** of deficit i: ∂D/∂d_i = 2 d_i. The common factor 2 cancels everywhere below.
- **Urgency** U = max_i d_i. An error leaves some deficit unserved; the worst case is the largest marginal drive.
  No constant.

## 3. Choice sharpness (`urgencyChoice`)

**Principle.** The cost of a wrong choice scales with the deficit it leaves unaddressed. A softmax is the choice that
maximises expected value plus T × entropy (value of keeping options open). Write the value of a rules score s to an
animal at urgency U as U × s (stake = marginal drive of the most pressing deficit). Then p_i ∝ exp(U s_i / T₁), i.e.

    T(U) = T₁ / U

Decreasing in U. U → 1: T → T₁. U → 0: uniform over the legal menu (nothing is at stake). Bounded below by T₁.

**T₁ without a new constant.** A softmax at temperature T is an argmax over scores with Gumbel noise of standard
deviation πT/√6. The rules' scores already carry evaluation noise: the per-decision jitter, uniform with span
`candidateJitterSpan` (J = 0.24), standard deviation J/√12. Rule: at full urgency the decision adds no more noise than
the scores already have. πT₁/√6 = J/√12 gives

    T₁ = J / (π√2) = 0.0540 score        T(U) = J / (π√2 · U)

Equivalently: decision noise SD = jitter SD ÷ U. No new constant; `candidateJitterSpan` is an existing design value
that was never calibrated to a rate. J = 0 means argmax.

Disclosed before any run:
- Arithmetic only: T(U) equals today's 0.164 at U = 0.33. I have not measured the distribution of U at decision points.
  Median adult hunger is 0.46–0.51 in the C13 direction check, so I expect U above 0.33 at most decisions, hence
  sharper choices than today on average.
- Alternatives considered and rejected before any run: T₁ = J (span instead of SD, 0.24: no noise-matching meaning);
  T₁ = J/√12 (SD equated to T itself, 0.069: ignores that T is a Gumbel scale, not an SD); a slack form T₁(1 − U)/U
  (adds the claim that harm diverges at the bound); temperature proportional to the top score (scores are not a ratio scale).
- Known property, not a principle: the rules' need terms are already linear in the deficits, so score gaps between
  need-serving options already grow with deprivation at a fixed T. With T ∝ 1/U sharpness grows faster than linearly.

## 4. Persistence (`urgencyPersist`)

**Principle.** Keep the act while it is still paying: while it reduces drive at least as fast as the best alternative
on the menu would, time to switch included. This is the feeding patch test generalised from food to every deficit.

**Pay** of an option a, in drive reduced per hour (factor 2 dropped): pay(a) = Σ_i d_i × ρ_i(a) × serve / (switch + serve).
- ρ_i(a): the sim's own relief rate of deficit i under a, relative to idling awake. All are mechanics already in the
  sim (inputs, not targets): ripe-fruit and fallback intake (`src/sim/intake.ts`), `drinkThirstPerH`, resting and
  sleeping energy rates, grooming and play social rates and grooming's stress relief (`execution.ts` pairTick literals,
  mirrored as `src/decide/facts.ts` already does), walking energy cost while switching.
- switch: walking time to the place or partner at `walkMps`. serve: time until the served deficit is cleared at that
  rate (for a crown: or until the animal's share of the believed crop is eaten, whichever is first).
- Need-serving acts: feeding (crown or fallback), an own trip to a tree, drinking, resting, sheltering, nesting,
  grooming, play.

**Rule** (asked at every decision point that is not an interrupt, a period change or an ended act):
1. Current act serves a deficit. Keep iff pay(current) > 0 and pay(current) ≥ pay(best alternative on the phased menu).
   - "Stops paying": its deficit is cleared, its crop is gone, or its rate is 0.
   - Same deficit elsewhere: the marginal value theorem at ratio 1 (today: 2, and only above hunger 0.4).
   - "Another deficit overtakes": d_j ρ_j > d_i ρ_i after the alternative is charged its switch time.
2. Current act serves no deficit (following, patrol, joint trips, courtship, contests). Drive reduction cannot value
   it. Keep iff it is still the rules' top-scored candidate; otherwise re-decide. No constant.
3. Re-deciding is a new softmax draw, not a forced switch.

**Margin rule.** The margin is the switch time and nothing else: an alternative's rate is averaged over the walk to it
plus the time it would serve. An alternative in place has zero margin. Chatter between two in-place acts of equal pay
is limited by bout length (the gate is only asked at bout ends). No margin constant is introduced.

**Consequence I expect and accept.** The sim's rates differ by an order of magnitude (drinking 1.4/h, fruit about
0.2/h, grooming 0.18/h, resting about 0.07/h). Resting will rarely out-pay feeding, so a resting animal is re-drawn at
every rest bout end instead of being held 30 min; whether it rests on is then decided by the rules' scores.

## 5. Continuation (`urgencySwitchCost`)

`continueBonus` applies only at decision points before the bout's scheduled end, i.e. at interrupts.
`finishedPenalty` applies when the act ended itself. With the switch on both are 0. Reasons:
- The real cost of switching is the time and travel to the alternative. Every alternative's score already carries it
  (distance terms, trip intake fraction). A bonus on the current act counts it twice.
- Staying is covered by §4 when `urgencyPersist` is on.
- A finished act is worth what the rules compute for it now (hunger gone, crop gone, partner gone). Nothing principled
  replaces the penalty; the risk is retry loops of failed approaches and repeated brief acts (displays, calls). I will
  look for them and report.

Dropped, not replaced. No constant.

## 6. Constants left

| Constant | Value | Tag | Why |
| --- | --- | --- | --- |
| `urgencyChoice`, `urgencyPersist`, `urgencySwitchCost` | 0 (switches) | design | ablation switches |
| drive exponents n = 2, m = 1 | structural | design | smallest integer with n > 1; design A's convention |
| U = largest deficit | structural | design | worst-case unserved marginal drive |
| T₁ = `candidateJitterSpan` / (π√2) | 0.054 (derived) | design | noise matching, no new registry entry |

No new free numeric constant. No new ChimpX field (the stored intent keeps its shape).

## 7. Expected directions (predictions only; nothing is tuned to them)

Reference for "toward argmax": docs/realism-design.md C13 §5b, columns "C13b only" (argmax) vs "Both on" (today).

| Row | `urgencyChoice` | `urgencyPersist` | `urgencySwitchCost` | All three |
| --- | --- | --- | --- | --- |
| Share of draws taking the top option | up (sharper when U > 0.33) | ≈ | slightly down | up |
| Feeding bout length in a crown | ≈ | up (held until sated, emptied or out-paid) | down (interrupts derail more) | up |
| Patch residence | ≈ | up | down | up |
| Trees visited per day (T-FOOD-4) | up | up (fallback is left for fruit at ratio 1) | no prediction | up |
| Male day range (T-RNG-4) | up (toward argmax: 1.6 → 2.5 km) | up | no prediction | up |
| Party size (T-PTY-1) | up (toward argmax: 2.6 → 3.4) | no prediction | no prediction | no prediction |
| Feeding (T-ACT-1) | ≈ | up | ≈ | up or ≈ |
| Travel (T-ACT-2) | up | up | no prediction | up |
| Grooming (T-ACT-3) | ≈ | down (re-drawn at each bout end) | ≈ | down |
| Rest incl. grooming (T-ACT-4) | down | down | ≈ | down |
| Re-decisions | ≈ | bucket and max-age triggers vanish; "out-paid" and "not top" appear; kept share up for feeding, down for resting | more draws end in a switch | — |

## 8. Kill criterion

A switch stays off, and the null result is recorded, if with it on:
- the population is not viable: median adult hunger rises by more than 0.10 against the baseline on the same seeds, or
  the lactating-female median reaches 0.95, or starvation deaths appear, or births ÷ deaths collapses (C13 guard); or
- held-out rows are clearly worse (integrator's 365-day, 5-seed benchmark; the held-out Gombe movement statistics stay
  unseen here: `movement-metrics.ts` is always run with `--fitted-only`).

Quick check only (machine under load; user limit: burn-in + days ≤ 90): development seeds 48 and 7, field profile,
30-day burn-in + 30 days (`field-metrics.ts`), 30-day burn-in + 8 days (`movement-metrics.ts --fitted-only`), arms:
baseline, each switch alone, all three. Reserved and retired seeds are never run.

## 9. Results

### Iteration 1 (the form above), 1 October 2026

Quick check as §8, development seeds 48 and 7, field, 30-day burn-in + 30 days. Numbers in the table of iteration 2 below.
Finding that led to iteration 2 (baseline world, seed 48, daytime samples of animals aged 8+): loneliness (1 − social)
has a median of 0.68 and a 90th percentile of 1.0, and is the largest deficit in 72% of samples; fatigue has a median of
0.04 (90th percentile 0.10); stress 0.05. So U = the largest of all five readouts is mostly the loneliness of animals
with nobody to groom, and 28–31% of draws happen at U ≥ 0.9. A lone, lonely animal then chooses among food options at
the sharpest temperature although no option on its menu can act on its loneliness.

### Amendment before iteration 2 (written and committed before any run of the amended form)

**Change, `urgencyChoice` only.** U = the largest deficit the menu can act on. Principle, unchanged: the cost of a wrong
choice is the drive reduction forgone; a deficit that no option serves is not at stake in this choice. Hunger counts
when the menu holds a feeding option or an own trip to a tree; thirst with water or a fruit crown; fatigue with rest,
shelter or a nest; loneliness with a grooming or play partner. Stress always counts (it has no consummatory act of its
own; escape, appeasement and reassurance all bear on it). No constant added, none changed; T₁ is unchanged.
`urgencyPersist` and `urgencySwitchCost` are unchanged.

**Expected against iteration 1:** mean U at draws lower, temperature higher, share of draws taking the top option
between the baseline and iteration 1; every row closer to the baseline than in iteration 1.

**Not changed, though seen:** under `urgencyPersist` the gate keeps only 10–11% of decisions (34% today), because
fatigue is almost never above 0.1, so resting and nesting almost never "pay" and are re-drawn at every bout end. That
is the rule working on today's readouts (no sleep pressure or heat load exists yet; stage E2), not something to patch.

### Iteration 2 results (menu-addressable urgency), 1 October 2026

Same quick check: field, seeds 48 and 7, 30-day burn-in + 30 days; `scripts/e3-urgency-check.ts` (decision log) and
`field-metrics.ts` (observer, scored rows), `movement-metrics.ts --fitted-only` (30-day burn-in + 8 days). Seed means.
`urgencyPersist` and `urgencySwitchCost` alone are unchanged since iteration 1 and were not re-run. Artifacts:
`artifacts/validation/e3/check-{1,2}.*`, `fm-*.{md,json}`, `mv-*.txt` (suffix 2 = iteration 2).

| Row | baseline | choice (it 1) | **choice (it 2)** | persist | switchCost | all (it 1) | **all (it 2)** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| adult hunger, median | 0.381 | 0.378 | 0.399 | 0.284 | 0.380 | 0.297 | 0.280 |
| lactating hunger, median | 0.568 | 0.557 | 0.575 | 0.366 | 0.538 | 0.367 | 0.362 |
| deaths (all illness), births | 0, 0 | 1, 0 | 0, 0 | 0, 0 | 2, 0 | 0, 0 | 1, 0 |
| mean U / mean T at draws | 0.69 / 0.164 | 0.67 / 0.097 | 0.39 / 0.413 | 0.53 / 0.164 | 0.73 / 0.164 | 0.57 / 0.127 | 0.32 / 0.443 |
| draws at U < 0.1 | 0% | 0% | 23% | 0% | 0% | 0% | 25% |
| top option taken | 0.710 | 0.809 | 0.728 | 0.738 | 0.708 | 0.805 | 0.714 |
| decisions per chimp-day | 74.2 | 73.3 | 74.4 | 75.5 | 75.0 | 80.2 | 76.5 |
| kept by the gate | 0.342 | 0.346 | 0.350 | 0.109 | 0.336 | 0.100 | 0.111 |
| crown bout median / mean (min) | 37.8 / 43.7 | 38.9 / 45.8 | 38.8 / 47.0 | 36.3 / 47.5 | 37.4 / 42.9 | 34.5 / 45.0 | 35.1 / 45.5 |
| feeding bout median, movement (min) | 38 | 40 | 38 | 33 | 37 | 32 | 34 |
| crowns per adult-day | 5.24 | 5.22 | 5.15 | 4.82 | 5.37 | 5.19 | 5.09 |
| male km per day (decision log) | 2.43 | 2.55 | 2.53 | 2.57 | 2.85 | 2.65 | 2.87 |
| T-ACT-1 feeding (0.33–0.5) | 0.429 | 0.421 | 0.427 | 0.429 | 0.424 | 0.419 | 0.428 |
| T-ACT-2 travel (0.12–0.25) | 0.179 | 0.170 | 0.176 | 0.187 | 0.202 | 0.195 | 0.176 |
| T-ACT-3 grooming (0.08–0.18) | 0.134 | 0.140 | 0.115 | 0.148 | 0.109 | 0.124 | 0.107 |
| T-ACT-4 rest incl. grooming (0.30–0.47) | 0.389 | 0.344 | 0.337 | 0.349 | **0.299 fail** | 0.319 | 0.347 |
| T-PTY-1 party size (3–9) | 2.88 fail | 2.82 fail | 2.64 fail | 2.95 fail | 2.72 fail | **3.08 pass** | 2.76 fail |
| T-RNG-4 male day range (1.5–3.5, held as fail) | 2.18 | 2.43 | 2.56 | 2.46 | 2.81 | 2.76 | 2.68 |
| T-FOOD-4 trees per day (held-out, 4–15) | 5.43 | 5.35 | 5.37 | 4.85 | 5.47 | 5.14 | 5.13 |
| T-FOOD-5 nearest-tree share (held-out, 0.15–0.45) | 0.107 fail | 0.107 | 0.103 | 0.084 | 0.094 | 0.067 | 0.094 |
| T-FOOD-6 revisit interval (held-out, 2–7 d) | 5.12 | 5.39 | 5.69 | 4.95 | 4.85 | 5.55 | 5.65 |
| scored rows pass / fail, fitted | 7 / 8 | 8 / 7 | 8 / 7 | 8 / 5 | 6 / 10 | 9 / 6 | 7 / 8 |
| scored rows pass / fail, held-out | 3 / 15 | 5 / 13 | 7 / 15 | 8 / 14 | 6 / 16 | 5 / 13 | 6 / 16 |

The pass/fail counts move on rows with a handful of events in 2 × 30 days (patrol, hunting and social rows flip in
both directions in every arm); E0 found rows moving by up to 0.8 band distance between seed sets. Only the decision-log
rows (thousands of draws and bouts) and the activity shares carry signal at this length.

**Against the amendment's predictions** (`urgencyChoice`): mean U at draws fell (0.67 → 0.39) and the temperature
rose (0.097 → 0.413), as predicted. The mean temperature is now *above* the fixed 0.164 because a quarter of draws
happen at U < 0.1, where T > 0.54 and the choice is close to uniform over the legal menu (draws were not broken down by context;
the likely sources are sated animals with nobody to groom and night draws, where fatigue, the only deficit nesting can
act on, is almost always below 0.1). The share
taking the top option fell between baseline and iteration 1 (0.728), as predicted. "Every row closer to the baseline
than iteration 1" failed: T-ACT-1 and T-ACT-2 came closer; T-ACT-3, T-ACT-4, T-PTY-1, T-RNG-4 and the crown-bout mean
moved further away.

**Against §7** (`urgencyChoice`, iteration 2): top share up (yes, +0.02); bout length ≈ (yes); trees per day up (no, ≈);
male day range up (yes, T-RNG-4 2.18 → 2.56); party size up (no: 2.88 → 2.64, away from its band); feeding ≈ (yes);
travel up (no, ≈); grooming ≈ (no, 0.134 → 0.115); rest down (yes, 0.389 → 0.337).
(`urgencyPersist`): bout length up (median no, 37.8 → 36.3; mean yes, 43.7 → 47.5); trees per day up (no, 5.43 → 4.85);
male range up (yes); feeding up (no, ≈); travel up (yes, small); grooming down (no, 0.134 → 0.148); rest down (yes); kept
share down for resting (yes, overall 0.34 → 0.11). Not predicted: hunger falls by 0.10 (lactating by 0.20) at the same
feeding share, because poor crowns are left at ratio 1 instead of 2 and without the 0.4 hunger floor.
(`urgencySwitchCost`): bout length down (yes, slightly); more draws ending in a switch (yes); travel and male range up,
grooming and rest down, and T-ACT-4 leaves its band.

**Verdicts (iteration 2, provisional under the 3-month cap).**
- `urgencyChoice`: **stays off.** Viable (adult hunger +0.02, lactating +0.01, no starvation). No row enters a band;
  T-PTY-1, the row §7 expected it to raise, falls. The form does what it says (nothing at stake → near-uniform choice),
  but on today's readouts "nothing at stake" covers a quarter of all draws, because fatigue is a timer near zero.
- `urgencyPersist`: **stays off, retest.** Viable and better fed; bout lengths and activity shares inside their bands,
  T-FOOD-4 down but in band. The rule is inert for resting (rest never out-pays food while fatigue ≈ 0), so 2 of 3
  decisions are re-draws. Not judged until fatigue is a real state.
- `urgencySwitchCost`: **stays off.** Viable, but a fitted row (T-ACT-4) leaves its band and grooming falls; nothing
  improves. Removing the two constants unmasks retry loops of short acts (more draws end in a switch, more travel).
- All three: **stays off.** Viable; the one pass it had in iteration 1 (T-PTY-1 3.08) is gone with the amended U.

**What iteration 2 says.** The urgency forms are only as good as the deficits they read. With timer readouts, fatigue
is almost never above 0.1 and loneliness is the largest deficit in 72% of samples, so "urgency" is mostly a social
reading and resting can never pay. Stage E1 (energy-balance hunger) and E2a (sleep pressure, heat load) now exist on
`track-e`; iteration 3 tests the same switches on that stack.

### Amendment before iteration 3: the physiological stack (written and committed before any run of it)

**Why.** Iterations 1–2 showed that the urgency forms are only as good as the readouts they read. Two Track E stages
now replace the timers behind two of them, both off by default and merged into this branch from `track-e`:
- E1 `energyLedger`: hunger = gut emptiness × appetite, from an energy balance in kcal (`src/sim/energy.ts`). Ripe
  fruit fills 0.74 (adult female) and 0.59 (adult male) of the gut per feeding hour, against 0.24 hunger units under
  the timers; E1 measured adult daylight hunger 0.15–0.18 and lactating 0.36.
- E2a `rhythmSleep`: fatigue is felt sleepiness, 1 − energy = S × (1 − daylight), where S is sleep pressure (rises
  awake with τ 18.2 h, falls asleep with τ 4.2 h). In full daylight fatigue is exactly 0. `rhythmHeat`: a thermal
  load from a heat balance values rest and shelter; E2a measured it near 0 at Kibale temperatures (mean 0.01 at
  midday, 4.9% of samples above 0.1).

**Arms.** Field, development seeds 48 and 7, 30-day burn-in + 30 days, switches on from world creation, `--workers 2`.
- **R** (reference): `energyLedger` 1, `rhythmSleep` 1, `rhythmHeat` 1.
- **R + C**: R + `urgencyChoice` 1.
- **R + A**: R + `urgencyChoice`, `urgencyPersist`, `urgencySwitchCost` 1.
No persist-only or switch-cost-only arm (run cap, shared machine). Tools: `scripts/e3-urgency-check.ts` (decision log,
bouts, hunger), `scripts/e-bench.ts --quick` (band distance fitted and held-out, prescription count, viability),
`scripts/movement-metrics.ts --fitted-only` (30-day burn-in + 8 days).

**Code change, consistency only (no constant added or changed).** §4 defines pay with "the sim's own relief rate" of
each deficit. Under `rhythmSleep` those rates are no longer the energy timers, so the pay test and the urgency read
the mechanics that run:
- Under `rhythmSleep` 1 only sleep (a finished nest) lowers sleep pressure; resting, sheltering and grooming do not,
  and walking does not raise it. So ρ_F(rest) = ρ_F(shelter) = ρ_F(groom) = 0, the walking and play costs on F are 0,
  and ρ_F(nest) = (1 − daylight) × (S / `rhythmSleepDecayH` + (1 − S) / `rhythmSleepRiseH`) per hour: the fall of felt
  sleepiness asleep relative to its rise awake, serve time F / ρ_F. Urgency counts fatigue only when a nest is on the
  menu (the iteration 2 rule: a deficit counts when the menu can act on it).
- Under `energyLedger` 1 the feeding rates of `src/sim/intake.ts` are already shares of the animal's own gut capacity
  per hour, so feeding pay and serve time need no change; the fallback rate is now read for the animal (it used the
  adult-female default gut).
- `rhythmSleep` 0: the iteration 1–2 code path, unchanged (tested).
- Diagnostic only: draws are also tallied by day phase (day, dusk, night) with their urgency, to check where the low-U
  draws of iteration 2 came from.
- `scripts/lib/prescriptions.ts`: the four E3 prescriptions (`rgTemperature`, `rgMaxAgeH`, `continueBonus`,
  `finishedPenalty`) are counted out while the switch that replaces them is on, so e-bench's prescription count sees
  the removal. (E1 and E2a have not registered their own removals there; the reference's absolute count therefore
  overstates, and only differences between arms are read.)

**Not added: thermal load as a deficit.** At its measured size it cannot move U or the pay test. Consequence accepted:
under `urgencyPersist`, heat-driven rest and rain shelter are re-drawn at every bout end and decided by the scores.

**Predicted from first principles (before any run, including R's).**

*In R itself* (context, no test): by day fatigue is 0 and hunger about 0.15–0.2, so urgency at draws is mostly
loneliness where a partner is on the menu, otherwise hunger or stress. Mean U at draws below iteration 2's 0.39 and the
share of draws at U < 0.1 above iteration 2's 25%, most of them by day. From E1 and E2a: feeding share low (E1 alone
0.25, out of band), rest and grooming high (E1 alone 0.57) but lowered by the loss of the midday literal (E2a).

| Row (direction against R) | R + C | R + A |
| --- | --- | --- |
| mean U / mean T at draws | U as R; T above iteration 2's 0.41 | U as R or lower; T above 0.41 |
| top option taken | down (flatter food choices dominate; social draws stay sharp) | down |
| kept by the gate | ≈ | down to about 0.1 (rest by day pays exactly 0: "not-paying" at every rest-bout end) |
| decisions per chimp-day | ≈ | up |
| crown bout median | ≈ | down (a crown stops paying when the gut is full: H ÷ 0.6–0.74 per h is 15–20 min at H 0.2) |
| crowns per adult-day, T-FOOD-4 | up | no prediction |
| T-ACT-1 feeding | up (sated animals draw near-uniformly, so the high-scoring rest of a sated animal loses share) | up |
| T-ACT-2 travel, T-RNG-4 male range | up | up |
| T-ACT-3 grooming | ≈ | down (switch cost off, as in iteration 1) |
| T-ACT-4 rest incl. grooming | down | down |
| T-PTY-1 party size | down (as iteration 2) | no prediction |
| adult hunger | ≈ (within 0.05) | ≈ or lower (iteration 1: −0.10; less room under appetite) |
| night | — | nests kept at night (the night menu's alternatives pay 0 for fatigue under rhythmSleep) |

**Keep rule and kill criterion, against R.** §8 with R as the baseline: not viable if median adult hunger rises by
more than 0.10, the lactating-female median reaches 0.95, a starvation death appears, or e-bench's viability verdict
fails; held-out band distance clearly worse (beyond the seed noise E0 reported, up to 0.8 on one row). A switch can go
on by default only under Track E's keep rule: viability passes, held-out distance does not rise, and the prescription
count falls; the decision is provisional under the 3-month cap and needs `e-bench --confirm` (5 seeds) before any
default changes. No constant is tuned to any row; if R + C or R + A misses, the miss is reported, not fixed.

### Iteration 2, band distance (re-scored after the merge, no new simulation)

`scripts/e-bench.ts --rescore` of the iteration 1–2 scorecards (`artifacts/validation/e3/rescore/`), change against the
baseline on rows scored in both runs. T-HUN-4 ("more males, more hunting", an odds ratio from a handful of hunts in
2 × 30 days) swings from 1.0 to 14 between arms, so the held-out change is also given without it.

| Arm | fitted (common rows) | held-out (common rows) | held-out without T-HUN-4 | prescriptions |
| --- | --- | --- | --- | --- |
| baseline | 2.98 | 4.76 | — | 138 |
| choice (it 1) | −0.67 | −2.05 | −1.51 | 137 |
| choice (it 2) | −0.09 | +8.00 | −1.43 | 137 |
| persist | +0.55 | −2.51 | −0.89 | 137 |
| switchCost | −0.79 | −2.11 | −1.51 | 136 |
| all (it 1) | −0.26 | +0.95 | −0.34 | 134 |
| all (it 2) | −0.16 | +1.31 | +2.87 | 134 |

Inside E0's seed noise (up to 0.8 on a single row) except T-HUN-4 itself. The iteration 2 verdicts stand.

### Iteration 3 results (the physiological stack), 1 October 2026

Run as registered (`artifacts/validation/e3/run3.sh`): field, seeds 48 and 7, 30-day burn-in + 30 days, `--workers 2`.
Decision log `check-3.*`; e-bench `eb-{ref,refChoice,refAll}.*` and comparisons `eb-cmp-*`; movement `mv-ref*.txt`; energy
budget `en-*.txt` (`scripts/energy-diagnose.ts`, sim truth, added to read the feeding result). Seed means.

| Row | timer baseline (it 2) | **R** | **R + C** | **R + A** |
| --- | --- | --- | --- | --- |
| e-bench fitted distance | 2.98 | 4.06 | 4.87 (+0.82) | 7.44 (+3.38) |
| e-bench held-out distance (common rows) | 4.76 | 6.23 | 3.07 (−3.87) | 4.71 (−1.51) |
| held-out change without T-HUN-4 | — | — | −1.09 | +0.14 |
| prescription count (E3 entries only counted out) | 138 | 138 | 137 | 134 |
| viability (e-bench): births, deaths, starvation | — | pass: 0, 0, 0 | pass: 0, 0, 0 | pass: 0, 0, 0 |
| adult / lactating hunger, median | 0.38 / 0.57 | 0.165 / 0.369 | 0.132 / 0.336 | 0.072 / 0.128 |
| infant 2–5 y reserves ÷ store, day 35 → 60 | — | −0.098 → −0.163 | −0.113 → −0.172 | −0.139 → −0.243 |
| mean U / mean T at draws | 0.69 / 0.164 | 0.30 / 0.164 | 0.30 / 0.283 | 0.28 / 0.340 |
| draws at U < 0.1 (share of night draws) | 0% | 10.5% (48%) | 11.8% (47%) | 10.1% (0%) |
| top option taken | 0.710 | 0.694 | 0.654 | 0.601 |
| decisions per chimp-day | 74.2 | 87.0 | 88.1 | 100.6 |
| kept by the gate | 0.342 | 0.408 | 0.410 | 0.158 |
| crown bout median / mean (min) | 37.8 / 43.7 | 32.5 / 31.9 | 30.5 / 29.5 | 13.6 / 18.7 |
| feeding bout median, movement (min) | 38 | 33 | 30 | 14 |
| crowns per adult-day | 5.24 | 3.03 | 2.94 | 2.99 |
| eating minutes, adult male / female (no dependants) | — | 151 / 143 | 169 / 162 | 198 / 209 |
| fruit share of eating, adult male / female | — | 70% / 50% | 54% / 36% | 36% / 10% |
| male km per day (decision log) | 2.43 | 2.08 | 1.95 | 2.99 |
| path per hour, movement (m/h; fitted C12) | 165 | 128 | 127 | 170 |
| party follows per adult-day | 0.83 | 1.16 | 1.40 | 3.63 |
| daylight shares, sim truth: feed / travel / groom / rest (m; f) | .37/.19/.11/.31; .42/.15/.16/.25 | .22/.17/.22/.34; .23/.13/.27/.33 | .24/.16/.18/.37; .25/.14/.25/.32 | .28/.24/.15/.28; .31/.18/.20/.27 |
| T-ACT-1 feeding (0.33–0.5) | 0.429 | 0.270 fail | 0.253 fail | 0.317 fail (d 0.08) |
| T-ACT-2 travel (0.12–0.25) | 0.179 | 0.154 | 0.140 | 0.208 |
| T-ACT-3 grooming (0.08–0.18) | 0.134 | 0.252 fail | 0.220 fail | 0.203 fail |
| T-ACT-4 rest incl. grooming (0.30–0.47) | 0.389 | 0.413 | **0.602 fail** | 0.461 |
| T-PTY-1 party size (3–9) | 2.88 fail | 3.38 | 3.60 | 3.68 |
| T-RNG-4 male day range (held as fail) | 2.18 | 1.86 | 2.16 | 2.98 |
| T-FOOD-2 fruit share of feeding (0.60–0.78) | 0.877 fail | 0.655 | 0.606 | **0.325 fail** |
| T-FOOD-4 trees per day (held-out, 4–15) | 5.43 | 3.13 fail | 3.25 fail | 2.87 fail |
| T-FOOD-5 nearest-tree share (held-out) | 0.107 fail | 0.087 fail | 0.074 fail | 0.036 fail |
| T-FOOD-6 revisit interval (held-out) | 5.12 | 4.90 | 5.00 | 5.20 |
| T-HUN-1 hunts per community-year (5–25) | 18.2 | 44.6 fail | 35.7 | 66.9 fail |

Observer T-ACT-4 is a mean over focal individual-months of at least 1 h; in 2 × 30 days it rests on few of them (R + C:
0.65 and 0.55 by seed while the sim-truth rest + groom share fell from 0.56–0.59 to 0.55–0.57). The sim-truth shares,
from every adult every minute of daylight, are the steadier reading of the activity rows here.

**Against the predictions.**
- *R:* mean U below iteration 2 (yes, 0.30); share of draws at U < 0.1 above 25% (no, 10.5%); "most of them by day"
  (no: 48% of night draws are at U < 0.1 against 3% of day draws, which bears out iteration 2's guess about where
  its low-U draws came from). Feeding low and grooming high, as E1 found (yes); rest in band (the midday literal's
  loss offsets E1's sated rest).
- *R + C:* U as R (yes); T above 0.41 (no, 0.28: fewer near-zero draws by day than in iteration 2, because hunger is
  low but rarely nil and loneliness counts with a partner); top share down (yes, 0.694 → 0.654); kept, decisions and
  bout length ≈ (yes); crowns per day up (no, ≈); feeding up (sim truth yes, +0.02 and eating +18–19 min; observer no);
  travel and male range up (no: sim truth ≈ or down, the observer's T-RNG-4 up); grooming ≈ (no: down, −0.04 males and −0.02
  females in sim truth, −0.03 observed, toward its band); rest down (sim truth slightly, observer up and out of band); party size down (no, 3.38 → 3.60);
  hunger ≈ (yes, −0.03).
- *R + A:* U lower (yes, slightly); T above 0.41 (no, 0.34); top down (yes, 0.601); kept about 0.1 (yes, 0.158;
  "not-paying" while resting is 11–13% of draws); decisions up (yes, +16%); crown bout median down (yes, 32.5 → 13.6
  min, as the gut fills); feeding up (yes, 0.22 → 0.30 sim truth, 0.317 observer); travel and male range up (yes,
  2.08 → 2.99 km); grooming down (yes, toward band); rest down (yes, sim truth 0.56–0.59 → 0.43–0.47); hunger lower
  (yes, 0.165 → 0.072); nests kept at night (yes: night draws fell from 16% to 1% of all draws).
- *Not predicted (R + A):* the feeding gained is fallback, not fruit. Fruit share of eating falls from 70% / 50% to 36% /
  10% (T-FOOD-2 0.655 → 0.325, both seeds, out of band) at the same daily kcal (males 1,346 → 1,401, the rise being
  walking and climbing). Weaned infants of 2–5 y, who eat only fruit and only where their mother feeds, lose reserves 60% faster
  (−0.0026 → −0.0042 of the store per day; daylight hunger 0.55 → 0.64). Hunts per community-year rise to 67 and party
  follows triple.

**Why the fruit share falls (first principles).** Under the ledger, hunger is gut space × appetite, and fruit fills
0.59–0.74 of the gut per hour, so at a typical daylight hunger of 0.1–0.2 a crown serves 8–20 min. The pay test at
ratio 1 averages that over the walk (field `walkMps` 0.35 m/s): a crown 200 m away pays 0.31–0.47 × H per hour (by sex and H)
against 0.30 × H for leaves where the animal stands (fallback yield varies ×0.6–1.3 between cells); at H 0.1 a crown
beyond 200–250 m, about the median trip in R (245 m), or a shared crop pays less than the leaves. Each decision values only the deficit of the moment; nothing in the
currency values fruit's energy beyond the current gut space (reserves enter only through appetite). Two things follow.
`urgencyChoice` draws near-uniformly when sated, so the in-place ground option, always on the menu, is taken more
often (R + C already: fruit share 70% / 50% → 54% / 36%). `urgencyPersist` then keeps food in place (no walk to
charge) and ends crown bouts as soon as the gut is full (crown bout 30 → 14 min), after which a crown elsewhere rarely
out-pays the leaves underfoot.

**Verdicts (iteration 3, provisional under the 3-month cap; nothing goes on by default).**
- `urgencyChoice` on the stack: **stays off; a candidate for `e-bench --confirm`, conditional on the stack.** Viable;
  prescription count −1; held-out distance −3.9 on common rows, but −1.1 without T-HUN-4, inside the seed noise E0
  measured; fitted +0.8 (observer T-ACT-4, T-SOC-9, both on few samples). By Track E's keep rule it passes on the quick
  check. Its only clear effects are a flatter choice (top share −0.04) and less grooming. The stack itself is off
  (E1 is a null result), so no default can change on this evidence. Development seeds other than 48 and 7 were not
  run here (instruction); the 5-seed confirmation is the integrator's.
- `urgencyPersist` + `urgencySwitchCost` (arm R + A): **stay off.** E-bench's viability passes and held-out distance
  is flat without T-HUN-4 (+0.14), but a fitted row is lost beyond noise (T-FOOD-2, both seeds), fitted distance rises
  by 3.4, and the weanlings' energy deficit, already E1's open viability problem, grows by 60%. The persistence rule
  does exactly what §4 says; on a gut-space currency that is the wrong thing for a frugivore.
- Iteration 3 changed one thing in code, the stack's relief rates in the pay test and the urgency (no constant); that
  stays, since with `rhythmSleep` 0 it is inert and with it on it is the only reading consistent with §4.

**Stop.** Three iterations on E3 (rule: at most three per issue). What it shows: urgency-scaled choice is harmless and
removes one prescription; persistence by drive reduction per hour is only as good as the currency's horizon. Next angle,
not run here: value food by energy that the animal can still use over the day (gut space plus the reserve deficit,
i.e. E1b's bulk-limited gut and digestive pause), then retest `urgencyPersist`; and give the nest's darkness value a
deficit form (safety), which the pay test cannot see today.

## Integrator note (2 October 2026): the iteration-3 explanation is confounded

A reviewer doubt (handoff §8 item 14) is confirmed by reading the code. E3's runs were merged at 17:02 on 1 October,
before E1e's bug fix B2 (merged 19:18). With `energyLedger` 1 and `ledgerDrive` 0, `treeIntake` (src/sim/intake.ts)
then capped a bout at hunger ÷ rate, and the ledger's hunger includes appetite (about 0.5 at the set point), so a crown
bout's value came out about half. `payOf` (src/sim/urgency.ts) calls `treeIntake` with that cap on. The finding "a walk
to a crown rarely pays" (§9) may therefore be the bug, not the mechanism. Re-test `urgencyPersist` on the current code
(B2 fixed; with `ledgerDrive` 1 the cap does not apply) before acting on E3's recommendation.

## Integrator re-test of iteration 3 on the current stack (registered 2 October 2026 before its run)

Arms (field, seeds 48 and 7, rules policy, from the frozen checkout `bench-run` at the commit that adds this section):
**R**, the reference stack of the handoff (§3), which includes `ledgerDrive`, so `treeIntake` values a bout by the
energy it can deliver and E3's hunger cap is not in play; **R + A**, R + `urgencyChoice`, `urgencyPersist` and
`urgencySwitchCost` 1 (E3's arm A). Readouts: `movement-metrics --fitted-only --burn-in 30 --days 8` (crown bout median
and mean) for both arms; `e-bench --quick` for R + A, judged against R's four quick realizations (e-noise.md,
amendment 2).

Registered reading: if the pre-E1e hunger cap explains iteration 3, R + A's crown bout median stays within ±20% of R's
and T-FOOD-2 (fruit share of feeding) stays inside its band (0.60–0.78); if the crown bout median falls by 30% or more
and the fruit share falls below the band, iteration 3's explanation stands on the current code. Anything in between is
reported as unresolved. No switch goes on from this re-test; it decides only whether E3's recommendation (value food
against reserves) is still needed.

### Re-test result (integrator, 2 October 2026; bench-run at 4c86404, clean; numbers from the JSON and the metrics log)

- Identity first: R in quick mode at 4c86404 equals `R-quick` (612bf15) on every row, so R's four quick realizations
  (e-noise.md) are the reference.
- Crown feeding bout median (`movement-metrics --fitted-only`, seeds 48 and 7, 30 + 8 days): **R 22 min, R + A 11 min**
  (−50%).
- Fruit share of feeding (T-FOOD-2, band 0.60–0.78): R inside the band in all four realizations; **R + A 0.54**.
- Against R's four-run mean: fitted −1.41 (z −1.5), held-out +0.27 (z +0.2), held-out without T-HUN-4 and T-BRD-1
  +0.51 (z +1.0): inside noise. Rows beyond R's spread: T-ACT-1 and T-ACT-3 better; T-FOOD-2, T-COM-11 and T-SOC-10
  worse. Prescriptions 103 → 99. Viability passes.

**Reading (as registered): iteration 3's effect stands on the current code.** With `ledgerDrive` on, the pre-E1e hunger
cap is not in play, and persistence still halves crown bouts and moves feeding to leaves underfoot. The reviewers'
doubt is resolved: the finding is not that bug. E3's recommendation stands (value food against reserves as well as gut
space); E1i's `ledgerSatiationReserve` now supplies part of it, so the next re-test of `urgencyPersist` belongs on R +
E1i's pair once that pair is confirmed.
