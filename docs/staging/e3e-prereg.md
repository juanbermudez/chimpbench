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

### 2.1 Diagnosis results (frozen checkout of 42c7784; seeds 48 and 7, 30 + 30 days; simulation truth)

Generated by `diag_table.py` (session scratch `e3e/tools/`) from the tool's JSON: the four S19 realizations (S19q and
the three `rgTemperature` re-draws, the integrator's parameters) and S19q + `redecideValue` 2 (S19rv2, one run).
**Identity:** in every run the rebuilt menu equals the menu drawn from (0 mismatches over 129,000–134,000 daylight RG
draws per run) and the softmax probabilities match exactly; adult males' eating minutes and ground km equal
energy-diagnose's for the same world (S19q 253.460 min, 2.157 km; S19q1 253.326, 2.358; S19q2 253.966, 2.319: the
integrator's `S19q*-energy.json`). No deaths in the S19 runs (49 living at both ends, both seeds).

**D1, draws (RG animals, daylight).**

| Quantity | S19q / S19q1 / S19q2 / S19q3 | mean ± SD | S19rv2 |
| --- | --- | --- | --- |
| draws per animal-hour | 4.543 / 4.693 / 4.620 / 4.582 | 4.610 ± 0.064 | 4.565 |
| non-top share of draws | 0.384 / 0.372 / 0.383 / 0.378 | 0.379 ± 0.006 | 0.381 |
| P(top) median | 0.578 / 0.592 / 0.580 / 0.583 | 0.583 ± 0.006 | 0.565 |
| non-top draws per animal-hour | 1.743 / 1.746 / 1.770 / 1.732 | 1.748 ± 0.016 | 1.741 |
| kept acts not the menu top (share of keeps) | 0.533 / 0.520 / 0.529 / 0.531 | 0.528 ± 0.006 | 0.510 |
| choices not the top (draws and keeps) | 0.428 / 0.414 / 0.425 / 0.423 | 0.422 ± 0.006 | 0.424 |
| non-top share: adult male | 0.380 / 0.357 / 0.379 / 0.375 | 0.373 ± 0.011 | 0.356 |
| non-top share: female, lactating | 0.414 / 0.409 / 0.411 / 0.406 | 0.410 ± 0.003 | 0.423 |
| non-top share: female, other | 0.375 / 0.374 / 0.376 / 0.367 | 0.373 ± 0.004 | 0.385 |
| non-top share: adolescent 12–15 y | 0.384 / 0.373 / 0.379 / 0.376 | 0.378 ± 0.005 | 0.400 |
| non-top share: juvenile 8–12 y | 0.346 / 0.354 / 0.359 / 0.358 | 0.354 ± 0.006 | 0.387 |
| non-top share, taken call | 0.817 / 0.802 / 0.781 / 0.810 | 0.802 ± 0.016 | 0.768 |
| non-top share, taken charge | 0.468 / 0.434 / 0.406 / 0.437 | 0.436 ± 0.025 | 0.406 |
| non-top share, taken climb | 0.955 / 0.952 / 0.947 / 0.929 | 0.946 ± 0.012 | 0.939 |
| non-top share, taken display | 0.742 / 0.740 / 0.753 / 0.753 | 0.747 ± 0.007 | 0.710 |
| non-top share, taken drink | 0.459 / 0.492 / 0.526 / 0.466 | 0.486 ± 0.030 | 0.581 |
| non-top share, taken feed: crown | 0.480 / 0.475 / 0.464 / 0.467 | 0.472 ± 0.007 | 0.571 |
| non-top share, taken feed: fallback | 0.696 / 0.695 / 0.702 / 0.691 | 0.696 ± 0.005 | 0.739 |
| non-top share, taken flee | 0.498 / 0.635 / 0.561 / 0.514 | 0.552 ± 0.061 | 0.567 |
| non-top share, taken follow: other | 0.161 / 0.150 / 0.215 / 0.160 | 0.172 ± 0.029 | 0.118 |
| non-top share, taken follow: party | 0.625 / 0.550 / 0.566 / 0.525 | 0.567 ± 0.042 | 0.528 |
| non-top share, taken groom | 0.395 / 0.381 / 0.388 / 0.387 | 0.388 ± 0.006 | 0.445 |
| non-top share, taken guard | 0.204 / 0.221 / 0.210 / 0.197 | 0.208 ± 0.010 | 0.234 |
| non-top share, taken mate | 0.209 / 0.204 / 0.205 / 0.192 | 0.203 ± 0.007 | 0.167 |
| non-top share, taken nest | 0.029 / 0.028 / 0.032 / 0.034 | 0.031 ± 0.003 | 0.028 |
| non-top share, taken pant-grunt | 0.375 / 0.374 / 0.387 / 0.381 | 0.379 ± 0.006 | 0.340 |
| non-top share, taken patrol | 0.069 / 0.054 / 0.074 / 0.069 | 0.067 ± 0.009 | 0.129 |
| non-top share, taken play | 0.489 / 0.518 / 0.518 / 0.520 | 0.511 ± 0.015 | 0.607 |
| non-top share, taken rest | 0.378 / 0.384 / 0.383 / 0.380 | 0.381 ± 0.003 | 0.448 |
| non-top share, taken share | 0.098 / 0.106 / 0.074 / 0.079 | 0.089 ± 0.015 | 0.051 |
| non-top share, taken submit | 0.128 / 0.116 / 0.089 / 0.111 | 0.111 ± 0.016 | 0.094 |
| non-top share, taken travel: joined trip | 0.225 / 0.199 / 0.227 / 0.201 | 0.213 ± 0.015 | 0.137 |
| non-top share, taken travel: own trip | 0.386 / 0.362 / 0.385 / 0.386 | 0.380 ± 0.012 | 0.350 |
| non-top share, taken travel: to caller | 0.212 / 0.196 / 0.206 / 0.204 | 0.204 ± 0.007 | 0.182 |

**D2, knowledge at non-top draws.**

| Quantity | S19q / S19q1 / S19q2 / S19q3 | mean ± SD | S19rv2 |
| --- | --- | --- | --- |
| known pairs (taken and top both known now), share of non-top draws | 0.493 / 0.480 / 0.498 / 0.483 | 0.489 ± 0.008 | 0.476 |
| option taken out of sight | 0.228 / 0.228 / 0.225 / 0.230 | 0.228 ± 0.002 | 0.215 |
| top option out of sight | 0.303 / 0.319 / 0.300 / 0.310 | 0.308 ± 0.008 | 0.339 |
| gap (score), median | 0.149 / 0.150 / 0.150 / 0.147 | 0.149 ± 0.001 | 0.142 |
| gap (score), p90 | 0.404 / 0.408 / 0.408 / 0.404 | 0.406 ± 0.002 | 0.387 |
| here: taken when top | 0.611 / 0.619 / 0.612 / 0.611 | 0.613 ± 0.004 | 0.592 |
| view: taken when top | 0.608 / 0.612 / 0.611 / 0.614 | 0.611 ± 0.003 | 0.579 |
| mem < 1 h: taken when top | 0.643 / 0.632 / 0.614 / 0.635 | 0.631 ± 0.012 | 0.598 |
| mem 1–6 h: taken when top | 0.563 / 0.559 / 0.564 / 0.561 | 0.562 ± 0.002 | 0.546 |
| mem 6–24 h: taken when top | 0.593 / 0.599 / 0.606 / 0.597 | 0.599 ± 0.005 | 0.576 |
| mem ≥ 24 h: taken when top | 0.577 / 0.583 / 0.586 / 0.585 | 0.583 ± 0.004 | 0.583 |
| comm: taken when top | 0.686 / 0.727 / 0.658 / 0.697 | 0.692 ± 0.029 | 0.801 |
| unk: taken when top | 0.713 / 0.754 / 0.719 / 0.742 | 0.732 ± 0.019 | 0.752 |
| heard: taken when top | 0.663 / 0.681 / 0.681 / 0.675 | 0.675 ± 0.008 | 0.687 |
| here: taken when not top | 0.073 / 0.069 / 0.072 / 0.071 | 0.071 ± 0.002 | 0.068 |
| view: taken when not top | 0.077 / 0.075 / 0.076 / 0.077 | 0.076 ± 0.001 | 0.079 |
| mem < 1 h: taken when not top | 0.129 / 0.126 / 0.134 / 0.127 | 0.129 ± 0.004 | 0.138 |
| mem 1–6 h: taken when not top | 0.129 / 0.129 / 0.124 / 0.131 | 0.128 ± 0.003 | 0.126 |
| mem 6–24 h: taken when not top | 0.108 / 0.105 / 0.106 / 0.112 | 0.108 ± 0.003 | 0.107 |
| mem ≥ 24 h: taken when not top | 0.092 / 0.089 / 0.091 / 0.091 | 0.091 ± 0.001 | 0.081 |
| comm: taken when not top | 0.133 / 0.132 / 0.133 / 0.134 | 0.133 ± 0.001 | 0.138 |
| unk: taken when not top | 0.121 / 0.127 / 0.120 / 0.122 | 0.122 ± 0.003 | 0.140 |
| heard: taken when not top | 0.115 / 0.116 / 0.120 / 0.121 | 0.118 ± 0.003 | 0.123 |

**D3, daylight minutes by the origin of the act (RG classes).**

| Quantity | S19q / S19q1 / S19q2 / S19q3 | mean ± SD | S19rv2 |
| --- | --- | --- | --- |
| feeding: min per 12-h day | 274.0 / 272.9 / 274.0 / 271.9 | 273.202 ± 1.029 | 307.8 |
| feeding: from non-top draws, known pairs | 0.187 / 0.184 / 0.185 / 0.184 | 0.185 ± 0.001 | 0.252 |
| feeding: from non-top draws, out of sight | 0.274 / 0.278 / 0.271 / 0.271 | 0.274 ± 0.003 | 0.297 |
| feeding: from top draws | 0.539 / 0.538 / 0.544 / 0.545 | 0.541 ± 0.004 | 0.451 |
| rest: min per 12-h day | 179.9 / 176.1 / 175.4 / 177.7 | 177.261 ± 1.985 | 144.2 |
| rest: from non-top draws, known pairs | 0.222 / 0.217 / 0.222 / 0.217 | 0.220 ± 0.003 | 0.281 |
| rest: from non-top draws, out of sight | 0.137 / 0.143 / 0.135 / 0.144 | 0.140 ± 0.004 | 0.163 |
| rest: from top draws | 0.641 / 0.640 / 0.642 / 0.638 | 0.640 ± 0.002 | 0.556 |
| grooming: min per 12-h day | 49.6 / 47.8 / 48.0 / 48.5 | 48.485 ± 0.793 | 46.2 |
| grooming: from non-top draws, known pairs | 0.297 / 0.306 / 0.301 / 0.300 | 0.301 ± 0.004 | 0.340 |
| grooming: from non-top draws, out of sight | 0.077 / 0.072 / 0.077 / 0.074 | 0.075 ± 0.002 | 0.098 |
| grooming: from top draws | 0.625 / 0.623 / 0.623 / 0.626 | 0.624 ± 0.002 | 0.562 |
| travel: min per 12-h day | 84.1 / 91.4 / 90.3 / 88.8 | 88.648 ± 3.200 | 97.3 |
| travel: from non-top draws, known pairs | 0.008 / 0.006 / 0.008 / 0.006 | 0.007 ± 0.001 | 0.005 |
| travel: from non-top draws, out of sight | 0.286 / 0.274 / 0.285 / 0.286 | 0.283 ± 0.006 | 0.252 |
| travel: from top draws | 0.704 / 0.717 / 0.705 / 0.706 | 0.708 ± 0.006 | 0.741 |

**D4, belief error of trips (|crop valued − crop now|, crop units) by hours since the tree was seen.**

| Quantity | S19q / S19q1 / S19q2 / S19q3 | mean ± SD | S19rv2 |
| --- | --- | --- | --- |
| mem < 1 h: median | 0.003 / 0.003 / 0.003 / 0.003 | 0.003 ± 0.000 | 0.003 |
| mem < 1 h: p90 | 0.031 / 0.035 / 0.039 / 0.036 | 0.035 ± 0.003 | 0.037 |
| mem 1–6 h: median | 0.019 / 0.016 / 0.017 / 0.017 | 0.017 ± 0.001 | 0.017 |
| mem 1–6 h: p90 | 0.109 / 0.113 / 0.121 / 0.118 | 0.115 ± 0.005 | 0.127 |
| mem 6–24 h: median | 0.061 / 0.054 / 0.051 / 0.051 | 0.054 ± 0.005 | 0.049 |
| mem 6–24 h: p90 | 0.188 / 0.181 / 0.176 / 0.177 | 0.180 ± 0.005 | 0.179 |
| mem ≥ 24 h: median | 0.113 / 0.105 / 0.106 / 0.110 | 0.108 ± 0.004 | 0.097 |
| mem ≥ 24 h: p90 | 0.343 / 0.342 / 0.361 / 0.356 | 0.351 ± 0.009 | 0.342 |
| comm: median | 0.238 / 0.238 / 0.238 / 0.233 | 0.237 ± 0.002 | 0.225 |
| comm: p90 | 0.268 / 0.263 / 0.266 / 0.265 | 0.266 ± 0.002 | 0.253 |
| unk: median | 0.159 / 0.162 / 0.158 / 0.169 | 0.162 ± 0.005 | 0.157 |
| unk: p90 | 0.380 / 0.336 / 0.389 / 0.389 | 0.373 ± 0.025 | 0.358 |

**D5, food against food.**

| Quantity | S19q / S19q1 / S19q2 / S19q3 | mean ± SD | S19rv2 |
| --- | --- | --- | --- |
| food-food non-top draws, share of non-top | 0.193 / 0.202 / 0.195 / 0.195 | 0.196 ± 0.004 | 0.199 |
| food-food non-top draws per animal-hour | 0.336 / 0.353 / 0.345 / 0.338 | 0.343 ± 0.008 | 0.347 |
| of those, both known now | 0.032 / 0.027 / 0.035 / 0.028 | 0.030 ± 0.004 | 0.027 |
| gap as a share of own fruit rate, median | 0.152 / 0.149 / 0.151 / 0.146 | 0.149 ± 0.003 | 0.140 |
| gap as a share of own fruit rate, p90 | 0.525 / 0.509 / 0.521 / 0.502 | 0.514 ± 0.011 | 0.447 |
| forage slot decided by the jitter (share of draws with ≥ 2 feeding candidates) | 0.204 / 0.209 / 0.211 / 0.197 | 0.205 ± 0.006 | 0.214 |
| forage slot: raw gap when jitter-decided, median | 0.031 / 0.032 / 0.031 / 0.033 | 0.032 ± 0.001 | 0.030 |

**Runs (bouts), minutes, adult and juvenile classes.**

| Quantity | S19q / S19q1 / S19q2 / S19q3 | mean ± SD | S19rv2 |
| --- | --- | --- | --- |
| feeding: medianMin | 21.0 / 21.0 / 20.5 / 21.0 | 20.875 ± 0.250 | 18.8 |
| feeding: meanMin | 23.3 / 23.4 / 22.9 / 23.3 | 23.226 ± 0.216 | 24.3 |
| feeding: p90Min | 43.0 / 43.2 / 42.8 / 43.2 | 43.062 ± 0.239 | 42.8 |
| rest: medianMin | 28.5 / 28.2 / 27.5 / 28.0 | 28.062 ± 0.427 | 17.0 |
| rest: meanMin | 28.4 / 28.4 / 27.7 / 28.2 | 28.178 ± 0.294 | 23.1 |
| rest: p90Min | 48.2 / 48.5 / 47.2 / 48.5 | 48.125 ± 0.595 | 46.5 |
| grooming: medianMin | 13.5 / 13.2 / 13.0 / 13.2 | 13.250 ± 0.204 | 11.5 |
| grooming: meanMin | 15.6 / 15.5 / 15.2 / 15.3 | 15.405 ± 0.194 | 13.2 |
| grooming: p90Min | 33.2 / 32.8 / 32.2 / 33.0 | 32.812 ± 0.427 | 26.8 |
| travel: medianMin | 4.2 / 4.5 / 4.5 / 4.5 | 4.438 ± 0.125 | 4.0 |
| travel: meanMin | 6.1 / 6.3 / 6.3 / 6.2 | 6.221 ± 0.104 | 6.0 |
| travel: p90Min | 14.5 / 14.8 / 15.0 / 15.0 | 14.812 ± 0.239 | 14.8 |
| feed: crown: medianMin | 19.2 / 19.5 / 18.8 / 19.2 | 19.188 ± 0.315 | 16.8 |
| feed: crown: meanMin | 20.8 / 21.0 / 20.5 / 20.8 | 20.764 ± 0.234 | 18.8 |
| feed: fallback: medianMin | 32.0 / 31.2 / 31.8 / 32.0 | 31.750 ± 0.354 | 28.8 |
| feed: fallback: meanMin | 33.1 / 32.1 / 32.6 / 32.6 | 32.616 ± 0.400 | 43.9 |
| travel: own trip: medianMin | 2.8 / 3.0 / 3.0 / 3.0 | 2.938 ± 0.125 | 2.8 |
| travel: own trip: meanMin | 4.7 / 4.9 / 4.9 / 4.9 | 4.841 ± 0.122 | 4.6 |
| travel: joined trip: medianMin | 4.8 / 5.0 / 4.5 / 4.8 | 4.750 ± 0.204 | 4.2 |
| travel: joined trip: meanMin | 5.8 / 6.0 / 5.8 / 5.8 | 5.862 ± 0.108 | 5.6 |

**Top non-top pairs (top kind → kind taken), S19q (first reference).**

- travel: own trip → feed: crown: 0.059 of non-top draws, gap median 0.072 (÷T 0.44), known pair 0, taken {'view': 1}, top {'mem': 0.814, 'comm': 0.186}
- rest → travel: own trip: 0.044 of non-top draws, gap median 0.136 (÷T 0.83), known pair 0, taken {'mem': 0.828, 'comm': 0.172}, top {'here': 1}
- feed: crown → travel: own trip: 0.040 of non-top draws, gap median 0.061 (÷T 0.37), known pair 0, taken {'mem': 0.791, 'comm': 0.209}, top {'view': 1}
- rest → feed: fallback: 0.040 of non-top draws, gap median 0.182 (÷T 1.11), known pair 1, taken {'here': 1}, top {'here': 1}
- travel: own trip → rest: 0.032 of non-top draws, gap median 0.127 (÷T 0.77), known pair 0, taken {'here': 1}, top {'mem': 0.805, 'comm': 0.195}
- rest → feed: crown: 0.027 of non-top draws, gap median 0.138 (÷T 0.84), known pair 1, taken {'view': 1}, top {'here': 1}
- rest → groom: 0.027 of non-top draws, gap median 0.191 (÷T 1.17), known pair 1, taken {'view': 1}, top {'here': 1}
- travel: own trip → feed: fallback: 0.026 of non-top draws, gap median 0.146 (÷T 0.89), known pair 0, taken {'here': 1}, top {'mem': 0.767, 'comm': 0.233}
- feed: crown → rest: 0.020 of non-top draws, gap median 0.166 (÷T 1.01), known pair 1, taken {'here': 1}, top {'view': 1}
- rest → play: 0.019 of non-top draws, gap median 0.161 (÷T 0.98), known pair 1, taken {'view': 1}, top {'here': 1}
- groom → rest: 0.018 of non-top draws, gap median 0.130 (÷T 0.79), known pair 1, taken {'here': 1}, top {'view': 1}
- travel: joined trip → feed: crown: 0.017 of non-top draws, gap median 0.140 (÷T 0.85), known pair 0.16, taken {'view': 1}, top {'view': 0.16, 'mem': 0.493, 'comm': 0.154, 'unk': 0.192}
- rest → display: 0.016 of non-top draws, gap median 0.127 (÷T 0.77), known pair 1, taken {'here': 1}, top {'here': 1}
- feed: crown → travel: joined trip: 0.016 of non-top draws, gap median 0.133 (÷T 0.81), known pair 0.137, taken {'view': 0.137, 'mem': 0.472, 'comm': 0.128, 'unk': 0.263}, top {'view': 1}

**D2 pooled: taken when top, known now (here, view) against out of sight (mem ≥ 6 h, comm, unk).**

- S19q: known now 0.610, out of sight 0.630, difference -0.020
- S19q1: known now 0.616, out of sight 0.662, difference -0.046
- S19q2: known now 0.611, out of sight 0.626, difference -0.015
- S19q3: known now 0.612, out of sight 0.644, difference -0.031
- S19rv2: known now 0.585, out of sight 0.697, difference -0.112

**Reading by the registered rules.**
- **D1, what the temperature decides.** 38% of draws (0.379 ± 0.006; 1.75 per animal-hour) take an option other than
  the menu's top; the top's probability has a median of 0.58, not the 0.77 the temperature was set for (C13's menus of
  today's model). Counting the gate's keeps, 42% of choices are not the top. By the kind taken: calls 80%, climbing 95%,
  displays 75%, the fallback 70%, play 51%, crowns in view 47%, rest 38%, own trips 38%, grooming 39% are non-top picks.
- **D2, the temperature decides what the animal's knowledge could (implicated).** 49% of non-top draws (0.489 ± 0.008;
  ≥ 25% in every realization) are between two options the animal knows now (rest against the fallback, a crown in view,
  grooming, play, a display; the median gap 0.15 score units, 0.9 T). **The noise ignores knowledge:** pooled, options
  known now are taken when they are the top at 0.61, options out of sight (remembered ≥ 6 h ago, community-known,
  unknown) at 0.63–0.66 (difference −0.02 to −0.05, within 0.1 in every realization).
- **D3, what it costs in time.** Of daylight minutes (RG classes), non-top draws between known options give 18.5% of
  feeding, 22.0% of rest and 30.1% of grooming (rest and grooming **set by the noise**, ≥ 20% in every realization;
  feeding just below the line), and 0.7% of travel; with the non-top draws involving an option out of sight, 46% of
  feeding, 36% of rest, 38% of grooming and 29% of travel minutes come from acts that were not the animal's top option.
- **D4, the uncertainty of out-of-sight options is real.** The belief error of a trip grows with the hours since the tree
  was seen: median 0.003 crop units (< 1 h), 0.017 (1–6 h), 0.054 (6–24 h), 0.108 (≥ 24 h; 36 × the first),
  community-known 0.237, unknown 0.162.
- **D5, food against food.** 20% of non-top draws (0.34 per animal-hour) are between two feeding options, almost never
  between two known now (3%: the menu holds one feeding option); the option taken promised a median 15% less of the
  animal's own fruit rate (p90 51%). The jitter, not the softmax, decides the menu's feeding option in 20.5% of draws
  with two or more feeding candidates, at a median raw gap of 0.03.
- **D6, with re-decision (S19rv2, one run).** The draw's non-top share is unchanged (0.381) but more of the day comes
  from non-top known pairs (feeding 25.2%, rest 28.1%, grooming 34.0%: the held noise keeps them); feeding rises 273 →
  308 min per 12-h day and rest falls 177 → 144; fallback runs average 43.9 min (S19 32.6 ± 0.4); rest runs median 17.0
  (28.1 ± 0.4); out-of-sight options are taken when top more often than known ones (0.70 against 0.59).

**Against the expectations of §2.** D1 as expected (0.38 in 0.35–0.45; P(top) median 0.58 in 0.5–0.65). D2 as expected
(known pairs 49% in 35–50%; ignores knowledge). D3: rest and grooming set by the noise as expected; feeding 18.5% in the
expected 15–20%; travel not. D4 as expected (36 ×). D5: food against food 20% in 15–25%, 3% between two known options,
the jitter deciding the feeding slot in 20.5% (expected 10–20%, just above). D6: non-top share as S19's, as expected;
fewer kept acts that are not the top (0.51 against 0.53; expected more).

**What the temperature decides that the animal's knowledge could, in numbers.** Each animal makes 0.86 choices an hour
between options it knows now (rest, the fallback where it stands, a crown it sees, a partner it sees) that its own
valuation ranks otherwise; they set 22% of its resting, 30% of its grooming and 18% of its feeding time, and 70% of its
fallback picks are such draws. The softmax gives an option the animal knows exactly the same chance as one it last saw
days ago, and its noise is the same in daylight's every choice whatever the animal knows; with re-decision the noise is
held, so these picks last longer (S19rv2).

## 3. Field rows scored here: samples (written before any arm)

As recorded by the stages that read the sources in full (E3d §3, E3c §3, E4c's evidence pass, E2h); not re-opened here
except where stated. The sums are the e-bench rows; the rows named below are the ones the predictions name.

| Row | Source | Sample, method (quoted where it decides the readout) | Value, band |
| --- | --- | --- | --- |
| T-ACT-1, T-ACT-2, T-ACT-3 (fitted) | villioth2025 (FT, read by E3c and E3d) | Budongo Waibira 2016–17: "ten adult males and nine adult females ... Seven of the females were lactating, while two females were not lactating but travelled with a single juvenile offspring"; continuous focal follows (491 h, median 4 h); feeding, travelling (walking and arboreal movement), grooming (giving or receiving), resting (> 1 min sitting or lying); mass not reported | feeding 0.36 M / 0.37 F (band 0.33–0.5); travel 0.21 / 0.20 (0.12–0.25); grooming 0.15 / 0.12 (0.08–0.18) |
| T-ACT-4 rest + groom (fitted) | potts2011, villioth2025 | Ngogo 2005–06 (1,059 h) and Kanyawara 2006 (961 h): continuous focal follows of adult males, cycling females and pregnant or lactating females; "resting includes grooming"; monthly means; mass not reported | 0.340 (Ngogo), 0.448 (Kanyawara); band 0.3–0.47 |
| T-RNG-4 male day range (fitted) | batesByrne2009 | Budongo Sonso 2002–03, 8 adult males, GPS every 5 min while travelling, full-day follows; mass not reported | 2.7 ± 1.5 km/day; band 1.5–3.5 |
| T-FOOD-2 fruit share (fitted) | watts2012a, emeryThompson2020 | Ngogo 1995–2010, 125 months, focal + 15-min scans; Kanyawara 1994–2018, 240,601 feeding scans; all age-sex classes; mass not reported | 72.1%, 64.0%; band 0.60–0.78 |
| T-FOOD-4 trees per day (held out, compromised) | janmaat2013b, normand2009 | Taï, 5 adult females with young, 275 full-day follows; two females over 28 days | 7.14; 14.0 and 18.1; band 4–15 |
| T-COM-1 male pant-hoot rate (fitted, encoded in C6) | wilson2007 (FT, read by E4c), mitaniNishida1993 (record only) | Kanyawara focal males (N = 12): "median 0.76 per hour in the core, 0.19 at the periphery, 0 in crops"; Mahale rates not verified; per focal male-hour, focal continuous | band 0.5–1.5 per male-hour |
| Bout lengths (no row; context only, never used to choose) | potts2011; batesByrne2009 | patch residency per visit 27.0 min (Ngogo), 46.2 min (Kanyawara); stops ≥ 20 min: males 60 ± 50 min, lactating females 95 ± 83 min | reported beside the model's runs |

**Readouts the predictions need** (each defined in its tool's header; every one smoke-tested on 2 days with the switch
on before any arm, §5.1): the sums and the rows above, e-bench (the frozen observer, src/field/metrics.ts); the share of
choices that are not the top option and its parts, draws and switches per animal-hour, bout lengths by activity and kind,
daylight minutes by the origin of the act: choice-diagnose (§2; under the switch the menu's own scores are the values,
so "top" is the option of highest value); reserves (% of the store a day, the integrator's OLS slope convention by
class), eating minutes, ground km, fruit share of eating: energy-diagnose; night (adults out of a nest, share of night
time; the E2f line 3.3%): rhythm-metrics, on a kept arm.

## 4. Reference and judging

- Reference **S19** (docs/staging/e-stack2-confirm.md "S19 results"; parameters
  `bench-run4/artifacts/validation/e/s19q/S19q-params.json`), run by the integrator in quick mode once plus three re-draws
  (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run4 ef13aa8 (simulation code identical to this branch's start for
  S19), each with energy-diagnose (seeds 48, 7; burn-in 30, 30 days): `bench-run4/artifacts/validation/e/s19q/
  {S19q,S19q1,S19q2,S19q3}.json` and `…-energy.json`; viability pass in all four, no deaths. Spread on rows counted in
  all four (integrator): fitted 1.38 / 1.60 / 1.56 / 2.31, held-out 4.89 / 5.34 / 7.02 / 6.94, held-out without T-HUN-4,
  T-BRD-1 and T-IGE-3 4.51 / 3.94 / 4.75 / 4.55. Not re-run here. The choice-diagnose readouts of the same four worlds:
  §2.1.
- Each arm (S19 + this stage's switch, with and without `redecideValue` 2; same quick settings) against the reference
  mean with the integrator's `judge_vs_reps.py quick custom` (REFS = the four JSON): z = (arm − mean) ÷ (SD × √(1 + 1/n)),
  the registered quick SD (fitted 0.69, held-out 1.26, without the rare rows 0.48) or the group's own spread if larger;
  |z| > 2 is a result; sums with all rows and without T-HUN-4, T-BRD-1 and T-IGE-3 (e-noise.md amendment 3). There is no
  quick reference of S19 + `redecideValue` 2 (integrator): the rV2 arm is judged against S19's group, and read beside
  S18's quick reading (e3d-prereg.md §6.2, A2 on S17) and this stage's S19rv2 diagnosis (§2.1).
- Behaviour, energy and the choice readouts against the reference's own spread (mean ± SD of its four runs). Viability
  must pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S19: 46).
- **The re-draw lever** (`rngSalt`, §5.1): if the switch removes `rgTemperature`, the noise protocol's re-draws (small
  changes of `rgTemperature`) do nothing on a stack that carries it. Check, on S19 (quick, e-bench only): S19q's
  parameters + `rngSalt` 1, 2, 3. Registered reading: the lever re-draws like `rgTemperature` if every salted run
  differs from S19q, and the SD of each sum (fitted, held-out, held-out without the rare rows) over {S19q, salt 1–3}
  lies within the 95% range of the ratio of two SDs of four runs each (F(3,3): 0.25–3.9 ×) of the same SD over {S19q,
  S19q1–3}.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

### 5.1 Iteration 1 (registered before its run): a choice varies only through what the animal does not know (`choiceBelief` 1)

**Why (§2.1).** The softmax at `rgTemperature` takes a non-top option in 38% of draws, and 49% of those are between
options the animal knows now (rest, the fallback where it stands, a crown or a partner it sees); they make 22% of rest,
30% of grooming and 18% of feeding time and 70% of the fallback picks. The noise is the same whatever the animal knows:
options known now are taken when they are the top no more often than options last seen days ago. The uncertainty that
does exist, a remembered crop, grows with the hours since the tree was seen (D4).

**Principle.** A forager's choices vary because its estimates vary. Choosing by a value drawn from its belief about each
option and taking the best draw (Thompson sampling) makes the choice vary exactly as much as the animal is uncertain:
an option it knows is taken by its value, an uncertain one is sometimes taken when a draw favours it (gershman2018: a
fixed-temperature softmax ignores the chooser's uncertainty; human choices show uncertainty-scaled randomness; costa2019:
monkeys' choices go to options of unknown value, less when the known alternative is better; research.md "Addendum: E3e
choice noise"). What a chimpanzee does not know about an option in this model is the crop of a tree out of its sight:
it remembers where trees are (normandBoesch2009: nearly straight travel to out-of-sight trees), its crop beliefs can be
wrong and are corrected on arrival (janmaat2013b), and in the model the error of a remembered crop grows with the hours
since it was seen (D4).

**Change (switch `choiceBelief` 1, 0 = today; src/sim/rg.ts `byValue`, `beliefOffset`, `rgChoice`, `redecide`;
src/sim/candidates.ts `treeFoodWorth`, the `bel` of trip options, `nestCompanyValue`).**
- The menu is built from the options' values (every term, the continuation terms included, without the candidate
  jitter), and the option of highest value plus its belief offset is taken: no softmax, no temperature.
- Belief offset 0 for every option the animal perceives now: its own state (rest, nest, shelter, calls, displays), the
  place it stands (the fallback), any target in view (a crown, a partner, prey), a caller located by its call. For a
  trip to a tree out of sight (an own trip to a remembered or community-known tree, a joined trip whose goal it does not
  see, an approach to a caller at a crown it does not see): the crop is drawn from its belief, c = max(0, b + s·z), z a
  standard normal from `world.rng`, b the crop the option is valued at (its memory of the crop, the community list's
  value, or 0.2, as candidates.ts already values it), s = b·(1 − exp(−ρ·Δt/24)), Δt the hours since it last saw the tree
  (unbounded when it never has), ρ = `patchRecoverPerDay` (0.7 a day: the rate at which a fed crown's crop returns to its
  phenology level, the time scale on which a crown changes in this world; design). So a tree just seen carries no spread
  and a tree never seen a spread equal to its believed crop (design). The offset is the trip's food term at c less its
  food term at b (forageRate's drive × net rate share, `treeFoodWorth`): a crop above one bout's gut room changes
  nothing, a crop that may be gone lowers the trip.
- With `redecideValue`: the offsets are the noise held in the intention (E3d); an option new since the draw gets its
  own; the keep test compares value now plus held offset.
- **A consequence of value-based choice, corrected under the switch** (smoke test below; §7): E2e's `nestCompany` adds to
  staying in a nest the company of the best nest-mate "asleep or awake"; with every option known taken by its value,
  nest groups held each other in their nests through the day (seed 48: 57% of adults ≥ 8 y in a nest at 08:00, 36% at
  13:00, against 4% and 3% on S19), because an awake nest-mate's company is counted for staying but not for leaving
  with it, and the softmax's noise had been what broke the lock. Under the switch staying keeps only the company of
  nest-mates asleep (the circadian latch, `asl`; departAudience already treats sleeping nest-mates as unable to join): an
  awake nest-mate can leave with the animal (nestAudience). No magnitude changes.
- Not read: `rgTemperature` (46 → 45 on S19; with `redecideValue` 2 → 43). Unchanged: the candidate jitter in published
  scores (young animals' argmax, the model chimps' menus), the gate (without `redecideValue`), animals under `rgMinAge`.
- **Re-draw lever** (`rngSalt`, design, 0 = none; src/sim/generation.ts): a non-zero integer mixed into `world.rng` once
  the world is built, so later draws are another realization of the same model; it changes no distribution. Checked on
  S19 (§4).
- Tests (tests/sim-choice-belief.test.ts): both 0 by default in both profiles; deterministic over a field day and
  JSON-lossless with and without `redecideValue` 2 (held offsets finite); `rgTemperature` not read, `patchRecoverPerDay`
  read; count −1 (−3 with `redecideValue` 2); the menu ranked by value; only trips to trees out of sight carry a belief;
  a draw among options known now takes the option of highest value and draws no random number; no spread for a tree
  just seen, a crop drawn for one never seen; nest company counts only nest-mates asleep under the switch; `rngSalt` 0
  leaves the world unchanged and a salt changes only the stream. Switch off: the field pin (tests/sim-track-e.test.ts)
  and the compressed goldens hold.

**Smoke tests with the switch on (seed 48, 1 + 2 days; disclosed; not representative, not used below except as
disclosed context).** choice-diagnose (identity exact: 0 menu mismatches over 4,000–6,500 draws; every readout filled),
energy-diagnose, rhythm-metrics and e-bench (`--days 2`: every row filled; prescriptions 45) all ran. Seen, before the
nest-company correction: 40% of daylight in nests (adults ≥ 8 y: 57% in a nest at 08:00, 36% at 13:00; S19 4% and 3%);
with `nestCompany` 0 the daytime nests vanished (0% from 08:00 to 17:00), so the lock was the company term, and the
correction above removed it (0% from 08:00 to 17:00, 55% at 06:00 against S19's 60%). After it, S19 + `choiceBelief`:
non-top share of draws 0.026, switches 3.6 per animal-hour (S19's diagnosis 3.4), daylight minutes per 12 h (RG
classes) feeding 246, rest 237, grooming 42, travel 84 (S19's one-seed smoke: 237, 203, 50, 94), fruit share of eating
0.94 / 0.89 (adult males / nursing mothers), e-bench T-FOOD-2 1.00 and T-COM-1 0.25 (S19q 0.70); departures before
sunrise 0.66, no adult out of a nest at solar midnight. S19 + `choiceBelief` + `redecideValue` 2: switches 6.4 per
animal-hour, feeding runs median 8.3 min, rest 12.5, grooming 8.5 (the keep test now compares values with no held
noise for options known now, so near-ties are re-decided at every bout end and interrupt).

**Arms** (S19q's parameters + the switch; from a frozen detached checkout of the commit that adds this section): **A1** =
S19 + `choiceBelief` 1; **A1r** = S19 + `choiceBelief` 1 + `redecideValue` 2. Each: e-bench `--quick` (seeds 48 and 7,
burn-in 30, 30 days; `--workers` 2, 1 above load 8), energy-diagnose and choice-diagnose (same seeds and window);
rhythm-metrics (seeds 48 and 7, 30 + 30) for an arm that is kept. The re-draw check (§4): e-bench `--quick` of S19q +
`rngSalt` 1, 2, 3.

**Predictions (against the S19q mean ± SD of its four realizations; low confidence unless stated; written knowing the
smoke tests).**

| Quantity | S19q (mean ± SD) | A1 | A1r | Confidence |
| --- | --- | --- | --- | --- |
| Prescriptions | 46 | 45 | 43 | high |
| Viability | pass | pass | pass | moderate |
| Non-top share of draws (the menu's own ranking) | 0.379 ± 0.006 | ≤ 0.08 | ≤ 0.08 | high |
| Switches per animal-hour | 3.42 (S19q diagnosis) | 3.0–4.2 | 5–8 (chatter) | moderate |
| Runs, median min: feeding / rest / grooming | 20.9 / 28.1 / 13.3 | 12–20 / 20–30 / 11–17 | ≤ 12 / ≤ 16 / ≤ 11 | moderate |
| Fallback feeding (non-top share of fallback picks) | 0.70 | ≤ 0.10 | ≤ 0.10 | high |
| T-FOOD-2 fruit share | reference | up by ≥ 0.06, above its band (0.78) | up by ≥ 0.04 | moderate |
| Fruit share of eating, every class (energy-diagnose) | reference | up | up | moderate |
| T-COM-1 male pant-hoot rate | 0.70 (S19q) | below 0.5 (calls were 80% non-top picks) | below 0.5 | moderate |
| T-ACT-1; T-ACT-2; T-ACT-3; T-ACT-4 | reference | ± 0.04; ± 0.04; lower; up 0.00–0.06 | ± 0.04; up 0.00–0.05; lower; ± 0.05 | low |
| T-RNG-4; T-FOOD-4 | reference | ± 0.4; ± 1.5 | up 0–0.6; ± 1.5 | low |
| Reserves %/day: mothers, juveniles 5–12 y, infants 0.5–2 y and 2–5 y | reference | each within ± 0.03 of the mean, or above it | each within ± 0.04 | low |
| Fitted sum | reference mean | worse beyond noise (T-FOOD-2, T-COM-1) | worse beyond noise | low |
| Held-out sums, with and without the rare rows | reference mean | inside noise | inside noise | low |
| Night: adults out of a nest (rhythm-metrics, if kept) | S19 confirm 2.58% | ≤ 3.3% | ≤ 3.3% | moderate |

**Kill criterion (registered), per arm.** Null if (a) viability fails (a starvation death, or a seed below 80% of its
start); (b) any class's reserve slope is more than 0.05% of the store a day below the S19q mean; (c) held-out is worse
beyond noise (z > +2) with or without the rare rows (T-HUN-4, T-BRD-1, T-IGE-3); (d) the mechanism does not run (the
non-top share of draws ≥ 0.2, or `rgTemperature` still read); (e) if kept by the rule below, night safety fails on
rhythm-metrics (adults out of a nest more than 3.3% of the night).

**Verdict rule (registered).** `choiceBelief` removes one counted prescription, so the track's keep rule applies to each
arm: viability passes, held-out (with and without the rare rows) not worse beyond noise, prescriptions down (A1 46 → 45,
A1r 46 → 43), night safe. If none of (a)–(e) holds and the keep rule passes, the arm is a **provisional keep candidate**
for the integrator's 5-seed confirm; otherwise it is recorded and the switch stays off. **Re-decision holds** on this
switch if A1r passes the keep rule with T-ACT-4 inside its band (≥ 0.30) and no class's reserve slope more than 0.03% of
the store a day below the S19q mean (S18's confirm costs were rest at 0.288 and reserves 0.02–0.06 %/day lower). Fitted
rows, bout lengths, travel and reserves are reported against the reference, never used to choose.

## 6. Results

## 7. Known defects in the code under test

- **Corrected under the switch (written before A1's run):** E2e's `nestCompanyValue` (src/sim/candidates.ts, the
  `nestCompany` term of staying in a nest) counts the company of an awake nest-mate, which the animal keeps equally by
  leaving with it; under value-based choice nest groups held each other in their nests through the day (smoke test,
  §5.1). Under `choiceBelief` only nest-mates asleep count (`asleepOnly`); with the switch off E2e is unchanged.
- Deferred: the candidate jitter (`candidateJitterSpan`, design, ± 0.12) still decides the argmax of animals under
  `rgMinAge` and is in every published score (the model chimps' menus); under the switch RG decisions do not read it.
- Deferred (E3d §7): a joined trip that arrives at its goal without becoming feeding there is re-chosen at once (a loop
  of one-tick restarts; src/sim/rg.ts `gate`/`redecide` arrival branch); time lost negligible, decision counts inflated.
- Deferred: value-based keep tests under `redecideValue` 2 have no persistence for options known now (no held noise),
  so near-ties are re-decided at every bout end and interrupt (smoke: 6.4 switches per animal-hour); no switching cost
  exists in the values for acts done in place.

## 8. Stage verdict
