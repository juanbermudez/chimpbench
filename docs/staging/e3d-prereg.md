# E3d pre-registration: when to stop and choose again

Status: skeleton committed at the start of the stage (4 October 2026, 04:2x; branch `e3d-redecide`, from `track-e`
b3d28c7), before any run and before any code change. Track E, stage E3d. Rule served: field values of behaviour are
targets, never inputs. No bonus, penalty or interval is tuned to a bout length, an activity share or a switching rate.

## 0. The problem

On S17 (49 counted prescriptions; docs/staging/e-stack2-confirm.md "S17 results") three counted prescriptions decide when
an animal stops what it is doing:
- `rgMaxAgeH` 0.5 h (src/sim/rg.ts:142): an intention is re-decided after 30 minutes whatever the animal's state (a
  clock). Set in C13c (realism-design.md §5c) because the Jev gate's 90 min "held daytime rest for a median of 36 min
  and cut trips to trees from 5–6 to about 3.8 per adult-day".
- `continueBonus` 0.25 (src/sim/candidates.ts:105): a fixed score bonus for the current act and target while its
  scheduled bout runs (`time < actEnd`): sets bout persistence directly.
- `finishedPenalty` 0.5 (src/sim/candidates.ts:105): a fixed penalty on the act that just finished itself: sets act
  switching directly.
- `rgTemperature` 0.164 (the choice noise; fitted so the rules' top option wins a median 0.77) is out of scope unless the
  diagnosis shows the others cannot move without it.

E3 (e3-prereg.md) tried persistence by drive reduction per hour (`urgencyPersist`) and dropping the bonus and penalty
(`urgencySwitchCost`) and stopped after three iterations: persistence halved crown bouts (22 → 11 min on the current
code, integrator re-test) and moved feeding from fruit to leaves underfoot, because a currency of drive reduction per
hour on a small, fast-filling gut values a crown only for the gut space left; dropping both constants unmasked retry
loops of short acts (more draws ending in a switch, more travel, T-ACT-4 out of band). E3c (e3c-prereg.md) since valued
every feeding option by the net energy rate it promises (`forageRate`, in S17).

From first principles (marginal value theorem, charnov1976, already in research.md through E3c): an animal should leave
what it is doing when the value of continuing falls below the best alternative net of the cost of switching (travel,
setup, lost position), and re-decide when something it perceives or feels changes, not on a timer.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S17 in quick mode (seeds 48 and 7, burn-in 30, 30 days),
   simulation truth: how often each of the three entries decides an act's end or continuation (max-age re-decisions and
   what they change; choices where the bonus or the penalty flips the winner), bout lengths by act and class against what
   the act's own value would give, and what changed in the animal's state and surroundings when it re-decided.
2. **Mechanism** behind a new switch (0 = today), only for the entries the diagnosis implicates; every input sourced or
   tagged design; removing entries lowers the prescription count by as many.
3. At most three iterations, each logged here and committed before its run; arms = S17 + the switch, quick mode,
   judged against the integrator's four S17 quick realizations (e-noise.md amendment 2).

## 2. Diagnosis (to be registered before its runs)

## 3. Field rows scored here: samples

## 4. Reference and judging

## 5. Iteration log

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
