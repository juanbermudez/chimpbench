# E5e pre-registration: social quotas and clocks

Status: skeleton committed in the stage's first 15 minutes (4 October 2026, branch `e5e-social-quotas`, from `track-e`
8cae2c4). Diagnosis readouts, field rows, mechanism, predictions and kill criterion are added and committed before any
run of a switch on. Track E, stage E5, piece e.

Rule served: field values of behaviour are targets, never inputs. No interval, hour or distance scale is chosen to hit a
rate, a travel share or a day range.

## 0. The entries in question (S13, field profile; `src/sim/candidates.ts` at 8cae2c4)

| Entry | Value (field) | Where | What it states |
| --- | --- | --- | --- |
| `pantGruntRepeatH` | 8 h | candidates.ts:584 | a subordinate pant-grunts to the same dominant at most once per 8 h (a quota per dyad) |
| `feedChargeGapH` | 0.75 h | candidates.ts:822 | at most one feeding charge per 45 min after the animal's last aggression (a quota) |
| `immigrantChargeGapH` | 0.75 h | candidates.ts:814 | at most one charge at an immigrant female per 45 min after the last aggression (a quota) |
| `consortLatestHour` | 16 | candidates.ts:951 | a consortship can start only before 16:00 (a clock hour) |
| `joinCallDistScaleM` | 1,500 m (field; 60 m compressed) | candidates.ts:442 | the approach to a heard caller loses 1 score unit per 1,500 m (fitted to T-ACT-2 and T-RNG-4 in C5a) |

Note: the brief names 60 m for `joinCallDistScaleM`; that is the compressed default. The field profile, which every
Track E run uses, overrides it to 1,500 m (data/params.json, `profiles.field`).

Each states how often or when a behaviour happens. From first principles: greeting is given on reunion and where a
relationship is uncertain, so it should follow from memory of the last meeting and the relationship; a charge's
repetition should follow from the aggressor's state and the target's response (E4a's states, E4h's assessment); a
consortship needs daylight left to travel away from rivals, so daylight and sleep pressure can replace the clock; a walk
to a caller costs energy and time in the same currency as foraging (E3c; sockol2007).

## 1. Plan

1. Diagnosis (step 1, simulation truth, S13 quick: seeds 48 and 7, 30-day burn-in + 30 days): for each entry, how
   often it binds (the share of opportunities it blocks), the animals' states and memories when it binds, and each
   behaviour's rate per dyad and per animal-day with the entry removed in a scratch arm (diagnostic only). Name the
   entries that set their behaviour's rate rather than trim it, with numbers. (§2, written before its runs.)
2. Mechanism behind one new switch (0 = today), only for the entries the diagnosis implicates. (§4.)
3. At most three iterations, each logged here and committed before its run.

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**Tool.** `scripts/quota-diagnose.ts` (readouts defined in its header), simulation truth. It reads the five gates as
candidates.ts evaluates them through a hook, `quotaTrace` (candidates.ts; null in every simulation, reads only, draws
nothing: S13 seed 48 after 2 days hashes 5e062689df89591c at 8cae2c4 and with the hook), the contests through
`contestTrace` and the RG decisions through `rgTap`. Smoke test: S13, seed 48, 1 + 1 days (4 s); every block filled except
the immigrant and consort gates, which had no opportunity that day.

**Definitions** (header of the tool, in short):
- *Opportunity*: a decision at which every other condition of the gated option holds for this target (greeting: a
  subordinate ≥ 5 y and a dominant in sight within `pantGruntRangeM`; feeding charge: a subordinate feeding, scarce
  fruit, in range, not kin or ward; immigrant charge: a resident female ≥ 15 y and a female < 2 y after immigration in
  range; consortship: a non-alpha male ≥ 15 y, a swollen female he is bonded to, not guarded). *Blocked*: the quota or
  clock removed it. For `joinCallDistScaleM` (a scale, not a gate): every approach offered, its distance term d ÷ 1,500
  and its choice probability with and without that term (first step, menu held fixed).
- *Association*: two community members ≥ 5 y within `sightDayM` (35 m) at a 5-min scan, any hour; a *reunion* is the
  first such scan (or greeting opportunity) after ≥ 1 h apart, the model's own reunion span (perception.ts newcomers).
- *Memory and state at a blocked opportunity*: hours since the gated event (last greeting of that dominant; last
  aggression), whether the subordinate already greeted that dominant in the current association bout, the bout's age,
  the Elo gap, whether the dominant is the alpha or displaying; for charges, what the last aggression was, whether at the
  same target and the target's last response (contestTrace); hunger, stress, arousal, fast arousal; for consortships the
  daylight left (hours until daylight < 0.1), sleep pressure, energy. Whether the blocked option's would-be score exceeds
  the score of the option the animal chose (RG decisions only, ≥ 8 y).
- *Rates*: pant-grunts per subordinate-day (chimp-days ≥ 5 y), per dyad-day (ordered pairs subordinate ≥ 5 y → eligible
  dominant, counted at each day's midpoint) and per co-present dyad-day (pairs with ≥ 1 opportunity that day); first in
  their association bout or repeats; feeding charges per adult-day (≥ 15 y); charges at immigrants per resident
  female-day; consortships started per adult-male-day and by hour of day, their duration, path and minutes in darkness;
  approaches to callers per chimp-day by class, their path, minutes and locomotion kcal, and km per day walked to callers.

**Runs** (seeds 48 and 7; 30-day burn-in + 30 days; S13 = `bench-run3/artifacts/validation/e/s13q/S13q-params.json`):
- **D0**: S13 and its three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405): the reference spread of every readout.
- **Scratch arms (diagnostic only, never a candidate)**, S13 with one entry removed each: **D1** `pantGruntRepeatH` 0;
  **D2** `feedChargeGapH` 0; **D3** `immigrantChargeGapH` 0; **D4** `consortLatestHour` 24; **D5** `joinCallDistScaleM`
  1,000,000 (its hard maximum: the distance term ≤ 0.008 on the map).

**Decision rule (registered).** An entry *binds* if it blocks ≥ 10% of its opportunities in D0 (mean of the four runs).
It *sets its behaviour's rate* if it binds and removing it multiplies the behaviour's rate per animal-day by ≥ 1.5 or
≤ 1/1.5, beyond 2 SD of D0's four runs (pant-grunts per subordinate-day; feeding charges per adult-day; charges at
immigrants per resident female-day; consortships per adult-male-day; for the distance scale, km walked to callers per
adult-male-day or approaches per chimp-day). It *trims* if it binds and the rate moves less than that; it is *inert* if it
blocks < 10% or has < 30 opportunities pooled over D0. Fewer than 30 events in both D0 and its arm: "too few to name".
For the clock (`consortLatestHour`) the timing is reported as well: the share of D4's consortships started at or after
16:00, and their minutes in darkness. Only entries that set a rate (or a timing) go to step 2.

## 3. Field rows scored and their samples (to be written before any arm)

## 4. Mechanism (to be written before any code of it)

## 5. Reference and judging

Reference: S13 quick (docs/staging/e-stack2-confirm.md "S13 results"), run once plus three re-draws (`rgTemperature`
0.1641, 0.1639, 0.16405) by the integrator at bench-run3 ea92d20 (simulation code identical to 8cae2c4 for S13), each
with energy-diagnose (seeds 48, 7, burn-in 30, days 30): `bench-run3/artifacts/validation/e/s13q/{S13q,S13q1,S13q2,S13q3}.json`.
Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a result; sums with and
without T-HUN-4 and T-BRD-1, and without T-IGE-3. Readouts against the reference's own spread (mean ± SD of its 4 runs).

## 6. Iteration log

## 7. Results
