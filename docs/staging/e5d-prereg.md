# E5d pre-registration: why a chimpanzee grooms

Status: skeleton committed at the start of the stage (2 October 2026, 22:05, branch `e5d-grooming`, from `track-e`
9503ed4), before any run and before any code change. Track E, stage E5d. Rule served: field values of behaviour are
targets, never inputs. No rate or weight is tuned to a grooming share, a rest share or a partner distribution; a miss
is a finding.

## 0. The problem

- The social need (`1 − social`, "lonely") rises on two fixed timers, `socialAwakePerH` 0.035 and `socialSleepPerH`
  0.01 per hour (`src/sim/life.ts` `needs()`; design, no source). The prescription ledger counts both as rule 5d "need
  timer" and lists them as encoding T-ACT-3, the grooming share (`bench-run/artifacts/validation/e/e0-ledger.md`).
  Grooming (actor +0.18/h, recipient +0.3/h), play (+0.15/h) and nursing (+0.2/h, the infant) restore it; since E5a it
  also scales what a companion's company is worth (`companyValue`), the contact call and the approach pull.
- On S8 (S6 + E1p's `growYield` + E3b's `revisitByCrop`, the best integrated candidate; e-stack2-confirm.md "S8
  results") the time freed by less walking and eating goes to grooming and rest: T-ACT-3 0.164 → 0.208 (band 0.08–0.18;
  males 0.185, females 0.227 in the confirm run; quick S8q 0.184 / 0.230), T-ACT-4 0.361 → 0.430 (band 0.3–0.47).
- Working hypothesis to test (integrator's reading): while time was short grooming was limited by time; with time free
  it is limited only by the need, so the timers' rate sets the grooming share. A back-of-envelope balance says the
  same: an adult awake ~12.5 h and asleep ~11.5 h gains 0.035 × 12.5 + 0.01 × 11.5 ≈ 0.55 of need a day; an hour of
  grooming involvement (giving or receiving, half each) restores (0.18 + 0.3) ÷ 2 = 0.24, so a need kept full costs
  ≈ 2.3 h of grooming a day ≈ 0.19 of a 12-h day. The diagnosis measures this rather than assuming it.

## 1. Field rows scored and their samples

(Filled before any arm; the source of every row scored is opened and its sample written here.)

## 2. Step 1, diagnosis (readouts defined before any run; smoke-tested on 2 days)

Tool: `scripts/groom-diagnose.ts` (new, simulation truth, read-only; reuses intake-diagnose's decision tap and classes).
World: e-bench's (createWorld field profile + 30-day burn-in + 30 days, seeds 48 and 7, rules policy). Arms: **S8**
(`bench-run/artifacts/validation/e/s8q/S8q-params.json`) and **S6** (the same without `growYield` and `revisitByCrop`),
one run each; both from a frozen checkout of the commit that registers the readouts. Readouts (definitions in the
script header):
- grooming minutes per adult-day by class (adult males, other adult females, lactating females by the youngest infant's
  age, juveniles 5–12 y), given and received, mutual, and by partner type (own unweaned infant, other maternal kin,
  non-kin; bond tercile; rank relation);
- grooming bouts: what started each (the rules decision: gate reason, interrupt kind, the option's score and margin over
  the best non-grooming option), the groomer's social need, hunger, fatigue, stress and affiliation at the start and
  the end, partners in reach (settled community members within the groom range), the bond, kin, rank, the act the bout
  displaced (the groomer's previous act: rest, travel, feeding, other) and what came next, why each ended;
- the social need's daily budget per adult: rise from the timers (awake, asleep), restoration by grooming given,
  received, play and nursing, and need lost to the clamp at 1 (restoration while full);
- free time: daylight minutes not eating, travelling or nesting, by class, against grooming and rest minutes, S6 and S8.

**Reading rules (registered).** "Grooming is limited by the need" if, on S8, (a) the daily restoration by grooming
equals the timers' rise within 10% and (b) bouts start at a median social need below the level adults hold outside
grooming; "limited by time" if grooming minutes per adult-day rise with free time between S6 and S8 at the need's
level held fixed. The diagnosis names what sets grooming time on S8 with numbers before any mechanism is written.

## 3. Reference and judging

Reference (integrator, not re-run): S8 in quick mode, run once plus three re-draws (`rgTemperature` 0.1641, 0.1639,
0.16405) at bench-run cf22cde, each with energy-diagnose (seeds 48, 7; 30 + 30 days):
`bench-run/artifacts/validation/e/s8q/{S8q,S8q1,S8q2,S8q3}.json` and `…-energy.json`. Judged by docs/staging/e-noise.md
amendment 2 (`integrator/judge_vs_reps.py quick custom`): z = (arm − reference mean) ÷ (SD × √(1 + 1/4)), SD = the
registered quick per-run SD (fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48) or the reference's
own spread if larger; |z| > 2 is a result. Activity, social and energy readouts against the reference's own spread.
Viability must pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S8: 76).

## 4. Mechanism

(Registered after the diagnosis, before any run of changed code.)

## 5. Known defects in the code under test

(Listed before the first arm, with file:line.)

## 6. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)
