# E4h pre-registration: how far a fight goes (contest assessment in place of the escalation, hit, injury and support dice)

Status: skeleton committed in the stage's first 15 minutes (3 October 2026, branch `e4h-contests`, from `track-e` 37a2042),
before any diagnosis or run of changed code. Sections marked *pending* are filled and committed before the run they
govern. Track E, stage E4, piece h. Patrols, hunting, gang attacks on strangers and infanticide are not touched.

Rule served: field values of behaviour are targets, never inputs. No escalation, hit, injury or support probability is
set from a field value or tuned to hit a rate.

## 1. The dice in question (S9, `src/sim/conflict.ts` at 37a2042)

| Die | Where | Registry entry (class) | Decides |
| --- | --- | --- | --- |
| Escalation of a counter-charge to contact | `resolveCharge`, conflict.ts:133 | `escalationBaseP` 0.08, `escalationEvenP` 0.3 (outcome-encoding, probability), `escalationEvenExp` 4 (design) | whether two animals that charge each other fight |
| A hit when a target gives way within `hitRangeM` | `resolveCharge`, conflict.ts:124 | `hitP` 0.12 (outcome-encoding, probability) | whether a charge makes contact |
| A serious wound in a fight | `resolveFight`, conflict.ts:164 | `seriousInjuryP` 0.05 (outcome-encoding, probability) | whether a fight wounds badly |
| Support for the aggressor (bonded member or kin; against a stranger) | `notifyAllies`, conflict.ts:41 | `coalitionBondP` 0.5 × bond, `coalitionStrangerP` 0.8 (outcome-encoding, probability) | whether an ally joins |
| Support for the victim | `notifyAllies`, conflict.ts:44 | `coalitionBondP` 0.5 × bond | whether an ally joins |

Unregistered literals in the same paths (not counted by the ledger today): the hit's injury `0.01 + U·0.04`
(conflict.ts:126), the winner's light wound `random < 0.2` (conflict.ts:165), death at injury ≥ 0.98 `random < 0.1`
(conflict.ts:171). Who wins (`contest`, conflict.ts:103, a draw on relative power) is a contest-outcome draw, not one
of the six; it is diagnosed but not a target of this stage unless the diagnosis implicates it.

## 2. Plan

1. Diagnosis on S9 (quick: seeds 48 and 7, 30-day burn-in + 30 days, simulation truth): per conflict, the opponents'
   rank and mass difference, evenness, contested resource, allies in reach, the E4a states, and each die's outcome;
   rates per adult male-day and per dyad; how much of rank change and injury runs through each die. *pending*
2. Sources (contest theory and its primate tests; measured rates of contact, injury and coalitions) into
   `docs/research.md` (addendum titled "Addendum: E4h contests") before any mechanism. *pending*
3. Field rows scored, with their samples (sex, reproductive state, mass, method). *pending*
4. Mechanism behind a new switch (0 = today), only for the dice the diagnosis implicates. *pending*
5. Readouts defined from the sources' Methods and smoke-tested on 1–2 days with the switch on. *pending*
6. Arms and predictions; at most 3 iterations, each logged here before its run. *pending*

## 3. Reference and judging

Reference group (integrator, shared, not re-run): S9 in quick mode, run once plus three re-draws (`rgTemperature`
0.1641, 0.1639, 0.16405) at bench-run 2bcbd33 (code identical to this branch's start for S9), each with
energy-diagnose: `bench-run/artifacts/validation/e/s9q/{S9q,S9q1,S9q2,S9q3}.json` and `…-energy.json`; parameters in
`s9q/S9q-params.json`. Arms add this stage's switch to S9 at the same quick settings.

Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): z = (arm − reference mean) ÷ (SD ×
√(1 + 1/n)), SD the registered quick SD (fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48) or the
group's own spread if larger; |z| > 2 is a result. Sums reported with and without T-HUN-4 and T-BRD-1, and without
T-IGE-3. Prescriptions from `scripts/prescription-ledger.ts --count --params` (S9: 74). Viability must pass.

Keep rule (standard): viability passes; held-out not up beyond noise (with and without the rare rows); prescriptions
fall.
