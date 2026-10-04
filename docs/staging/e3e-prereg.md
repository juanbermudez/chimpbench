# E3e pre-registration: why a chimp does not always take its best option

Status: skeleton committed at the start of the stage (4 October 2026, branch `e3e-choice-noise`, from `track-e`
aa353fa), before any run and before any code change. Track E, stage E3e. Rule served: field values of behaviour are
targets, never inputs. No temperature, noise scale or bonus is tuned to a choice rate, a bout length or an activity
share.

## 0. The problem

- On S19 (46 counted prescriptions; docs/staging/e-stack2-confirm.md "S19 results") the rules choose among the bounded
  menu (src/sim/menu.ts, at most 8 options) by a softmax at `rgTemperature` 0.164 (src/sim/rg.ts), a counted
  prescription "set so the rules' top option wins a median 0.77" (docs/realism-design.md "C13 pre-registration" §2: Jev's
  median top-option probability on its own menus; "No source gives the stochasticity of a wild chimpanzee's choice; the
  value is labelled a design assumption").
- E3d (docs/staging/e3d-prereg.md §6.2, §8) found that this noise, not the animal's knowledge, decides between feeding
  options the animal could rank by rate: every feeding option carries one drive (forageRate: (1.6 h + 0.1) × net-rate
  share), so a draw that chose the fallback over a better fruit trip stays chosen until a need, the light or its value
  moves (fallback runs 46 min against 33). E3d's re-decision switch (`redecideValue` 2) passed alone on S17 (S18) but its
  costs (rest below band, more feeding on less fruit, females' and infants' reserves lower) made S18 + S19 (S20) fail;
  the choice noise is the likely common cause.
- E3c (e3c-prereg.md §6.1, §8): valued by rate, only 58% of chosen feeding options promised a higher net rate than the
  best rejected one (rate differences 0.1–0.3 score units against T 0.164, the ± 0.12 jitter and the +0.25
  continuation).
- From first principles: a forager's choices vary because its estimates vary (crops not seen for a while, distances,
  what a companion or a rival will do); options it knows well and can see should be ranked by value nearly every time,
  uncertain ones sampled.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S19 in quick mode (seeds 48 and 7, burn-in 30, 30 days),
   simulation truth: how often the draw takes an option other than the top one, by act and class; the value gap and the
   animal's actual uncertainty about each option (time since its crop was seen, out of sight, distance) at those picks;
   how much feeding, resting, grooming and travel time comes from non-top picks; the same with `redecideValue` 2 added.
2. **Mechanism** behind a new switch (0 = today), only for what the diagnosis implicates: choice variability from the
   animal's own uncertainty about each option's value; every input sourced or tagged design; no noise scale chosen to
   hit a rate. If `rgTemperature` is removed, a behaviour-free re-draw lever for the noise protocol (§4).
3. At most three iterations, each logged here and committed before its run; two arms each (S19 + switch; S19 +
   switch + `redecideValue` 2), quick mode, against the integrator's four S19 quick realizations.

## 2. Diagnosis (to be registered before its runs)

## 3. Field rows scored here: samples

## 4. Reference and judging

## 5. Iteration log

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
