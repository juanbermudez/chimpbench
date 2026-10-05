# E5g pre-registration: calls and alarms without gaps

Status: skeleton committed in the stage's first 15 minutes (branch `e5g-call-gaps`, from `track-e` 90aa294). Track E,
stage E5, piece g. The diagnosis, readouts, field rows, mechanism (if any), predictions and kill criterion are committed
here before any run of a switch on.

Rule served: field values of behaviour are targets, never inputs. No interval, value, bonus or weight is chosen to hit a
call or alarm rate.

## 0. The literals in question (S31, field profile; file:line at 90aa294)

Counted by E0b's ledger (S31 counts 48 prescriptions on the current ledger; `prescription-ledger.ts --count`).

| Literal | Where | Kind (E0b) | What it states |
| --- | --- | --- | --- |
| `const callReady = time - x.lastCall > 0.5` | candidates.ts:1361 | interval, quota (L3) | an offer waits 0.5 h after the caller's own last call of any kind (pant-hoot or alarm); with `callValue` 1 it gates only the male's reunion pant-hoot (`V.REUNION`, candidates.ts:1368): the food-call variant (1366) is `!cv` and the contact, chorus and food-call variants are replaced by `pantHootValue` |
| `- (time - x.lastCall < 0.03 ? 0.4 : 0)` | candidates.ts:821 | bonus, judgement (B1, `finishedPenalty`'s) | a snake alarm is worth 0.4 less within 1.8 min of the animal's own last call (the alarm included) |
| `c.actionTime % 60 === 0 && c.actionTime > 0` | execution.ts:867 | interval, judgement (L3, `patrolStopEveryMin`'s) | an alarming animal hoos every 60 s of its alarm bout (1–2 min, `boutAlarmMin`/`Max`), and listeners within `hearAlarmHooM` of a caller within `alarmSnakeLinkM` of the snake become aware of it |

Snakes appear only in experiments (`applyIntervention` 'snake-model'); the field observer runs snake trials on cloned
worlds (src/field/experiments.ts; T-COM-11), so the two snake literals can move T-COM-11 and nothing else the observer
scores in the observed world.

## 1. Plan

1. Diagnosis (§2, written before its runs).
2. Mechanism behind one new switch (0 = today; one bit per literal), only for literals the diagnosis implicates (§4).
3. At most three iterations, each logged here and committed before its run (§6).

## 2. Diagnosis

(to be written before its runs)

## 3. Field rows and readouts

(to be written before any arm)

## 4. Mechanism

(after the diagnosis)

## 5. Reference and judging

Reference: S31 quick, run once plus three re-draws (`rngSalt` 1, 2, 3) at bench-run 4111971 (simulation code identical
to 90aa294 for S31), each with energy-diagnose (seeds 48 and 7, burn-in 30, days 30):
`bench-run/artifacts/validation/e/s31q/{S31q,S31q1,S31q2,S31q3}.json` and `…-energy.json`; parameters in
`…/S31q-params.json`. Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a
result; sums with and without T-HUN-4, T-BRD-1 and T-IGE-3 (amendment 3). Readouts against the reference's own spread
(mean ± SD of its 4 runs).

## 6. Iteration log

(each entry written and committed before its run)

## 7. Results

## 8. Files and final checks
