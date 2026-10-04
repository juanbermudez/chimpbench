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

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**What the code does (read at aa353fa, field profile, S19's 46 switches).** At a draw (src/sim/rg.ts `rgChoice`; under
`redecideValue` 2 `redecide`, a Gumbel-max with the same probabilities) an animal of `rgMinAge` (8 y) or more takes an
option of the bounded menu (src/sim/menu.ts `boundedCandidates`: one option per action type, the joined trip, a
stimulus response, a hunt or patrol lead kept, other social partners in spare slots; at most 8) with probability
softmax(score ÷ `rgTemperature`), T = 0.164. Each published score carries every term of the option, the candidate
jitter (a hash, ± 0.12, `candidateJitterSpan`, design, not counted) and, on the current act, the continuation terms. The
menu holds one feeding option: the best of the crowns in view and the fallback where the animal stands by published
score (so the jitter, not the softmax, decides between them). What the animal knows about an option differs: a crown in
view is valued at its crop now (`fruitAt`), the fallback where it stands at its rate here, rest and other own-state acts
from its own state; an own trip to a remembered tree at the crop it last saw there (`x.treeCrop`, C7a), a community-known
tree at the community's list value, a tree it does not know at 0.2 (candidates.ts), a caller from the call. The softmax
treats all of them alike.

**Tool.** `scripts/choice-diagnose.ts` (new; its header defines every readout): the taps rg.ts `rgTap` and decide.ts
`rulesTap` read every rules decision (read only; the simulation is unchanged). Readouts (simulation truth, daylight, RG
animals ≥ 8 y): draws per animal-hour; the share of draws taking an option other than the menu's top-scored one
(non-top), P(top) (median), by class, by the kind taken and by pair (top kind → kind taken); the value gap (published
score) and gap ÷ T; what the animal knows about the option taken and the top (here, view, mem with hours since seen,
comm, unk, heard); every menu option's chance of being taken when it is the top and when it is not, by knowledge bin;
the belief error of trips (|crop valued − crop now|) by hours since seen; food-against-food non-top draws and their gap
as a share of the animal's own fruit rate; the forage slot (draws where the menu's feeding option is not the best
feeding candidate by raw value: the jitter decided); kept acts that are not the top of the menu rebuilt there; daylight
minutes by activity and by the origin of the act (a top draw, a non-top draw between two options known now, a non-top
draw involving an option out of sight, argmax, other); runs (bouts) by activity and kind with redecide-diagnose's
definition. Identity: the rebuilt menu equals the menu drawn from and its softmax the probabilities; adult males' eating
minutes and ground km as energy-diagnose computes them (compare with the integrator's `S19q-energy.json`).

**Smoke test (seed 48, 1 + 2 days, S19; done before this registration; disclosed; not used below):** identity exact
(3,825 draws, 0 menu mismatches, probability error 0). Seen: non-top share of draws 0.40, P(top) median 0.56 (the C13
calibration's 0.77 was for the menus of today's model); 44% of non-top draws between two options known now (rest against
a crown in view, rest against grooming, rest against the fallback); every knowledge bin taken at about the same rate
when top (0.46–0.72) and when not (0.08–0.15); trips' belief error 0.001 (seen < 1 h ago), 0.01 (1–6 h), 0.06 (6–24 h),
0.17 (≥ 24 h), 0.24 (community-known); feeding minutes from non-top draws 45% (17% known pairs), rest 42% (21%),
grooming 43% (26%), travel 32% (0.4%).

**Runs.** choice-diagnose (seeds 48 and 7, burn-in 30, 30 days, `--workers` 2, 1 above load 8) on S19q's parameters
(`bench-run4/artifacts/validation/e/s19q/S19q-params.json`) and its three re-draws (`rgTemperature` 0.1641, 0.1639,
0.16405; the reference group's own spread for every readout), and once on S19q + `redecideValue` 2 (the diagnosis "with
re-decision"; a diagnosis run, not an arm), from a frozen detached checkout of the commit that adds this section.

**Reading rules (registered).**
- *D1, what the temperature decides:* the non-top share of draws (and of all choices, keeps included) and P(top) median,
  by class and by the kind taken. A draw is "decided by the temperature" when it takes a non-top option.
- *D2, could the animal's knowledge decide it:* among non-top draws, the share where the option taken and the top are
  both known now (here or in view: "known pairs"); the median gap. The temperature **decides what the animal's knowledge
  could** if known pairs are ≥ 25% of non-top draws in every realization of S19. The noise **ignores knowledge** if, in
  every realization, options known now are taken when they are the top at a rate within 0.1 of options out of sight
  (remembered ≥ 6 h ago, community-known, unknown).
- *D3, what it costs in time:* the share of daylight feeding, rest, grooming and travel minutes (RG classes) whose act was
  a non-top draw, split known pairs / uncertain. An activity is **set by the noise** if ≥ 20% of its minutes come from
  non-top draws of known pairs in every realization.
- *D4, is the uncertainty of out-of-sight options real:* the belief error of trips by hours since seen; real if it rises
  with the hours since seen (median of ≥ 24 h at least 5 × that of < 1 h).
- *D5, food against food (E3d's open problem):* non-top draws between two feeding options (crown, fallback, own trip,
  joined trip): their share of non-top draws, the gap as a share of the animal's own fruit rate, and of those the share
  with both options known now; the forage slot decided by the jitter.
- *D6, with re-decision (S19 + `redecideValue` 2, one realization):* the same readouts, reported beside the S19 group's
  spread (not judged by a line: one run).

**Expected (low confidence; written knowing the smoke test).** D1: non-top share 0.35–0.45, P(top) median 0.5–0.65 (the
0.77 calibration does not hold on S19's menus). D2: known pairs 35–50% of non-top draws (implicated); the noise ignores
knowledge. D3: rest and grooming set by the noise (≥ 20% of their minutes from known pairs), feeding near the line
(15–20%), travel not (its non-top time is trips out of sight). D4: real (≥ 24 h ≈ 0.15, < 1 h ≈ 0.002). D5: food
against food about 15–25% of non-top draws, almost never between two options known now (the menu holds one feeding
option), the forage slot decided by the jitter in 10–20% of such draws. D6: non-top shares as S19's (the draw is the
same softmax), more kept acts that are not the top.

## 3. Field rows scored here: samples

## 4. Reference and judging

## 5. Iteration log

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
