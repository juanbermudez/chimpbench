# E4o pre-registration: three small rules (meat, guarding, mating)

Branch `e4o-small-rules` from `track-e` eea2d85. Track E, stage E4o. Rules policy only; development seeds 48 and 7; no
run longer than 90 days in all. Started 4 October 2026, 13:22.

Rule served: field values of behaviour are targets to benchmark against, never inputs. No value, bonus or weight is
added or tuned to reach a rate.

This file is written in steps, each committed before the step it governs: §0–§3 (problem, plan, rows and samples,
diagnosis plan) before the diagnosis runs on unchanged code; §5–§8 (mechanism, readouts, arms, predictions, kill
criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 0. The problem (from the brief; verified in §4)

Three counted prescriptions are still active on S27 (the best integrated candidate, 42 prescriptions;
`docs/staging/e-stack2-confirm.md` "S26 and S27 results"; `scripts/prescription-ledger.ts --count --params <S27>` and the
ledger's rows list all three):

| Entry (value; ledger class) | Where (eea2d85) | What it decides (as read from the code) |
| --- | --- | --- |
| `meatEatPerH` 0.35 units per eco-hour (design; "need timer", encodes T-ACT-1 by the ledger's rule) | `src/sim/life.ts:163–168` (needs), `src/sim/energy.ts:620` (`meatKcalPerUnit`), `src/sim/huntvalue.ts` (the hunt's expected meat) | a holder eats 0.35 of a carcass an hour while awake, as the gut takes it; one unit (one capture) is worth 60 × `ledgerMeatKcalPerMin` ÷ 0.35 = 1,149 kcal whatever the prey, takes 2.9 h to eat alone, and a share (0.2 units, `execution.ts:736`) is worth 230 kcal |
| `guardMaxAgeY` 12 y ([M] crockford2020, hobaiter2014, stanton2020; field copy) | `src/sim/candidates.ts:151–166` (`guardianOf`, `guarded`), `src/sim/conflict.ts:43` (`coalitionKin`) | the oldest ward whose seen guardian deters charges at it (−`guardDeterW` 0.3, −`guardFeedDeterW` on feeding supplants), the end of an adoptive caretaker's guardianship (defence, plant sharing, the follow) and of caretaker kinship in coalitions; a living mother is the guardian at any age |
| `mateIntervalH` 1.5 h (design; quota) | `src/sim/candidates.ts:1108, 1124`, `src/sim/execution.ts:589, 775, 787, 1174–1182` | a male may copulate again only 1.5 h after his last copulation (his mate offer, a female's offer to him, copulation in guarding, consorting and the mate act); a failed approach blocks him for 0.5 h; set so a maximally swollen female gets about one copulation an hour with ~7 males (its note: between Taï 0.14/h and Ngogo 3.5/h, sources not checked) |

Candidates from the brief (first principles, tested by the diagnosis before anything is built): a carcass's energy from
the prey's mass, its edible fraction and meat's energy density, shared by the existing holding, begging and sharing
code, the eating time following from mass ÷ eating rate; a guardian that defends while the ward cannot hold its own
against the threat (E4h's strength model and assessment), so the age limit follows from growth; copulation from the
male's state (E4a's testosterone-like state, a sourced post-copulatory refractory physiology) and the female's swelling
and proceptivity, without a quota. A rule that cannot be replaced on sources stays, recorded with why.

## 1. Plan

1. Sources and samples (§2): every row the stage is scored on, and the inputs each candidate needs (red colobus masses
   by age class and the edible share; chimpanzee male post-ejaculatory refractory physiology; copulation rates per
   swollen female-hour with their methods). BioC first, 2 routes or 10 minutes per source.
2. Diagnosis (§3, registered before its runs) on S27 with unchanged code, simulation truth, seeds 48 and 7, 30-day
   burn-in + 60 days: meat kcal per capture and per eater, eating time, sharing; guarding and defence by ward age and by
   the ward's strength against the threat; copulations per swollen female-hour and which constraint binds (the quota,
   the female's choice, distance, night).
3. One switch, `smallRules` (a bit per rule; 0 = today), only for what the diagnosis and the sources support.
4. Arms on S27 in quick mode against the integrator's S27q and its three `rngSalt` re-draws (bench-run3 28d249e); at most
   three iterations, each logged in §9 and committed before its run.

## 2. Rows scored, and their samples

(Filled in before the diagnosis runs.)

## 3. Diagnosis plan

(Filled in before the diagnosis runs.)
