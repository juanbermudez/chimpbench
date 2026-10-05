# E3i pre-registration: trips to crowns others emptied

Status: skeleton committed at the start of the stage (branch `e3i-unseen-eaters`, from `track-e` b6946ac), before any run and
before any code change. Track E, stage E3i. Rule served: field values of behaviour are targets to benchmark against, never
inputs. No value, bonus or weight is added to hit a travel share, a day range or a feeding-tree count.

## 0. The problem

On S39 (42 prescriptions; S37 + E3h's `tripBeliefs` 3; e-stack2-confirm.md "S39 results") trips fed at their target rose
from 46% to 57% (E3h, measured on S31), but about 40% still fail. E3h's diagnosis (e3h-prereg.md §2.1, D2) found that the
crowns trips find empty were mostly empty before the trip began (99%), and that between the traveller's last sighting and its
arrival the animals it saw feeding there ate 15–17% of the loss while animals it did not see there ate 1.2–1.5 × the loss
(the phenology's fall about as much again; the deficit's recovery absorbs the rest). A remembered crown's belief is the crop
last seen (`x.treeCrop`, perception.ts), decaying only when the animal sees the crown again. Re-deciding (`redecideValue` 2,
off the stack) still adds about 1 km a day per class on top of `tripBeliefs` 3 (E3h's D1), with nursing mothers' and
juveniles' reserves falling faster; the failed trips are what makes it costly.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S39 in quick mode (seeds 48 and 7, burn-in 30, 30 days), simulation
   truth: failed trips by cause; for crowns emptied since the sighting, by whom, how long after the sighting, and whether the
   traveller could have known (calls or food grunts heard from the crown, parties seen heading there, the crown's size, how
   many community members were near it); the believed crop against the crop on arrival by the hours since the sighting; the
   walking and climbing these trips cost. Name what an animal could know and does not use, with numbers.
2. **Mechanism** behind a new switch (0 = today), from first principles, only for what the diagnosis implicates. Every input
   sourced or tagged design; no weight chosen to hit a rate; E3h's A2 (juveniles' reserve cost) checked against.
3. At most three iterations, each logged here and committed before its run; arms = S39 + the switch, quick mode, judged
   against the integrator's four S39 quick realizations (e-noise.md amendment 2; rare rows per amendment 3). Then one
   diagnostic arm (not a candidate): the best arm + `redecideValue` 2.

## 2. Diagnosis (step 1)

(Registered before its runs; see the next commit.)
