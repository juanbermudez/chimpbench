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

(empty at pre-registration)
