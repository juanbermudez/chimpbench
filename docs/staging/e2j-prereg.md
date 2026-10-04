# E2j pre-registration: climbing, halts and the cost of a faster walk

Status: in progress (4 October 2026). Skeleton committed at the start of the stage (branch `e2j-climbing`, from `track-e`
0d08525), before any run and before any code change. Track E, stage E2j. Rule served: field values of behaviour are
targets, never inputs. No speed, halt length or multiplier is set from a day range or a travel share, or tuned to reach
them.

## 0. The problem

- E2i's `walkGait` (walking speed from measured Mahale speeds by mass; src/sim/gait.ts) passed alone on the stack (S23,
  44 prescriptions), but S22 + `walkGait` (S24, confirm) failed the keep rule: held-out without the rare rows worse
  beyond noise (z +2.4, through T-RNG-5 and T-FOOD-10), and the energy of the longer walks fell on nursing mothers
  (−0.090 %/day against S21's −0.071), juveniles (−0.108 against −0.078) and infants of 0.5–2 y (−0.133 against −0.089)
  (e-stack2-confirm.md, "S24 results").
- E2i's open problems (e2i-prereg.md §8): travel phases still slower than the field's (1.1–1.25 km/h against Sonso's
  1.9–2.2) with more and longer halts; climbing at the stylized `climbMps` 0.22 m/s (0.5 m/s cited for wild chimpanzees,
  secondary) is 16–19% of adults' travel time; walking on fallback food at 0.3 × the walking speed (a design multiplier)
  doubled with the walk.
- Already in hand (S22 and S24 confirm energy-diagnose, 5 seeds, read before this file was written; a pointer, not the
  diagnosis): with the faster walk every class's true day range rose ~65% (males 2.07 → 3.43 km, nursing mothers 1.95 →
  3.24, juveniles 2.04 → 3.42), the walk's energy +33–49 kcal/day for adults and juveniles, climbing +9–15, mothers'
  carrying +10; intake rose +33–81 kcal/day; mothers' milk to infants fell 22 kcal/day.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S22 + `walkGait` 1 against S22, quick mode (seeds 48 and 7, burn-in
   30, 30 days), simulation truth: by class, time and energy in walking, climbing, halts inside travel and walking on
   fallback food; how many more trees, trips and climbs the faster walk produces; the energy each adds against what
   intake gains; why mothers, juveniles and infants pay most (carrying, climbing with an infant, following). Name the
   term that turns a faster walk into an energy loss, with numbers.
2. **Mechanism** behind a new switch (0 = today), from first principles, only for the term the diagnosis implicates;
   every input sourced or tagged design; no constant chosen to hit a rate.
3. At most three iterations, each logged here and committed before its run; arms = S22 + `walkGait` 1 + the switch
   (quick, seeds 48 and 7) judged against the integrator's four S22 quick realizations (S22q, S22q1–3 by `rngSalt`,
   bench-run3 ea794ff) by e-noise.md amendment 2 with amendment 3's rare rows.

## 2. Diagnosis (step 1)

To be registered here, with its tool and readouts, before its run.
