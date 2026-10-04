# E3e pre-registration: why a chimp does not always take its best option

Status: complete (4 October 2026): diagnosis on four S19 realizations, two iterations; `choiceBelief` 2 alone (A2) a
provisional keep candidate, with `redecideValue` 2 (A2r) passing the keep rule at a fitted cost (§8); `rngSalt` the
re-draw lever. Skeleton committed at the start of the stage (branch `e3e-choice-noise`, from `track-e` aa353fa), before
any run and before any code change. Track E, stage E3e. Rule served: field values of behaviour are
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

- **Iteration 1** (`choiceBelief` 1; arms A1, A1r): registered in §5.1 and committed (a10cdfb) before its run. Results
  §6.1: null in both arms (held-out without the rare rows worse beyond noise; A1r's reserves).
- **Iteration 2** (`choiceBelief` 2; arms A2, A2r): registered in §5.2 and committed (0ec4316) before its run. Results
  §6.2: A2 a provisional keep candidate; A2r passes the keep rule with a fitted cost beyond noise.
- **No iteration 3** (§6.3, recorded before any further run).
- **Final checks** (after merging track-e c793917 once, 9226681): `gen-params --check` clean, `tsc --noEmit` clean,
  `pnpm test` 778 tests: 777 pass, 0 fail, 1 skipped; `git ls-files data/raw node_modules` empty.

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

### 5.2 Iteration 2 (registered before its run): the animal's uncertainty on top of the rules' own evaluation noise, no temperature (`choiceBelief` 2)

**Why (§6.1).** Iteration 1 took every option the animal knows by its exact value. The variability then followed
knowledge, but the model's valuation, compared without any noise, lost persistence (acts dropped at every need-bucket
crossing and, with `redecideValue` 2, at every bout end: 5.7 switches per animal-hour), sent animals to the nearest crown
(T-FOOD-5 0.57) and, with the nest company of sleeping nest-mates only, out of their nests before sunrise (lactating
females 0.98 of departures). Two questions follow. (1) Is the counted temperature needed at all, or does the evaluation
noise the rules already carry suffice? Every rules score carries the candidate jitter (± 0.12, `candidateJitterSpan`,
design, never fitted to a rate, not counted); C13 added the softmax at `rgTemperature` (counted, set to Jev's 0.77) on top
of it. Iteration 2 keeps the jitter in the comparison (an option the animal knows is taken by its value give or take
its evaluation error) and drops only the temperature; under `redecideValue` 2 the jitter of the draw is held with the
belief, as E3d holds it. (2) Whose company does leaving a nest lose? In the dark an awake nest-mate does not walk off with
the animal (it would walk and feed at the dark's cost, darkCost), so leaving loses its company as E2e has it; in daylight
it can come along, so only a sleeping nest-mate's company is lost.

**Change (switch `choiceBelief` 2; rg.ts `rgChoice`, `redecide`; candidates.ts the nest company).** As iteration 1
(§5.1: the belief offset of trips to trees out of sight, no temperature, `rgTemperature` not read, the same `bel`), and:
- the menu is the rules' menu (published scores, the jitter included, as on S19) and the option of highest published
  score plus belief offset is taken; with `redecideValue` the noise held for each option is its jitter at the draw plus
  its belief offset (E3d's held noise with T × Gumbel replaced by the belief), and the keep test compares value now plus
  held noise;
- staying in the nest keeps the company (E2e's `nestCompanyValue`) of nest-mates asleep and, while the light is not yet in
  its day phase (`dayPhase` night, dawn or dusk), of awake ones too; in the day phase only of nest-mates asleep.
- No new magnitude: the jitter's span and the light phases (E3d's) exist. Prescriptions as iteration 1 (S19 46 → 45; with
  `redecideValue` 2 → 43).
- Tests (tests/sim-choice-belief.test.ts): value 2 deterministic and JSON-lossless with and without `redecideValue` 2;
  `rgTemperature` not read; count −1; a draw among options known now takes the option of highest published score; the
  nest company counts an awake nest-mate in the dark phases and not in the day phase.

**Smoke tests with the switch on (seed 48, 1 + 2 days; disclosed; not representative).** Adults ≥ 8 y in a nest by hour:
06:00 0.79, 07:00 0.39, 08:00 0.01, none from 09:00 to 17:00 (S19 0.60, 0.07, 0.04, 0.03–0.04; iteration 1 0.55, 0.03,
0); departures before sunrise 0.14 of adults (lactating females 0.23). S19 + `choiceBelief` 2: non-top share of draws
0.027 by the menu's own ranking, 0.18 by value (the jitter decides near-ties), switches 3.0 per animal-hour, runs median
feeding 18.8, rest 32.8 min, daylight minutes per 12 h feeding 211, rest 233, travel 88, nest 85; e-bench (`--days 2`)
T-ACT-1 0.28, T-FOOD-10 0.29, T-FOOD-5 0.30, T-COM-1 0.23, prescriptions 45. With `redecideValue` 2: switches 3.3 per
animal-hour, runs feeding 17.0, rest 17.8, feeding 212, rest 198, travel 126 min.

**Arms** (from a frozen detached checkout of the commit that adds this section): **A2** = S19 + `choiceBelief` 2; **A2r**
= S19 + `choiceBelief` 2 + `redecideValue` 2; e-bench `--quick`, energy-diagnose and choice-diagnose each (seeds 48 and
7, burn-in 30, 30 days; `--workers` 2, 1 above load 8); rhythm-metrics for an arm that is kept.

**Predictions (against the S19q mean ± SD of its four realizations; low confidence unless stated).**

| Quantity | S19q (mean ± SD) | A2 | A2r | Confidence |
| --- | --- | --- | --- | --- |
| Prescriptions | 46 | 45 | 43 | high |
| Viability | pass | pass | pass | moderate |
| Non-top share of draws, menu's own ranking; by value | 0.379 ± 0.006; — | ≤ 0.08; 0.10–0.25 | ≤ 0.08; 0.10–0.25 | moderate |
| Switches per animal-hour | 3.46 ± 0.04 | 2.6–3.8 | 2.8–4.2 | moderate |
| Runs, median min: feeding / rest | 20.9 / 28.1 | 15–22 / 25–36 | 14–22 / 15–28 | low |
| T-FOOD-10 departures before sunrise | 0.787 ± 0.019 | ≤ 0.70 | ≤ 0.70 | moderate |
| T-FOOD-5 nearest tree | 0.308 ± 0.014 | 0.30–0.50 | 0.30–0.50 | low |
| T-ACT-1 feeding | 0.400 ± 0.005 | 0.33–0.40 | 0.33–0.40 | low |
| T-ACT-4 rest + groom | 0.337 ± 0.025 | up 0.00–0.08 | ± 0.05 | low |
| T-FOOD-2; T-RNG-4; T-RNG-5 | reference | up 0–0.06; ± 0.4; ± 0.3 | up 0–0.08; up 0–0.6; ± 0.3 | low |
| T-COM-1 | 0.731 ± 0.068 | lower, possibly below 0.5 | lower | low |
| Eating minutes, every class | reference | 5–35 min lower | 5–35 min lower | low |
| Reserves %/day, every class | reference | within ± 0.05 of the mean | within ± 0.05 | low |
| Fitted; held-out with and without the rare rows | reference mean | inside noise | inside noise | low |
| Night: adults out of a nest (rhythm-metrics, if kept) | S19 confirm 2.58% | ≤ 3.3% | ≤ 3.3% | moderate |

**Kill criterion and verdict rule:** as iteration 1 (§5.1), unchanged; re-decision holds on this switch if A2r passes the
keep rule with T-ACT-4 ≥ 0.30 and no class's reserves more than 0.03% of the store a day below the S19q mean.

## 6. Results

### 6.0 The re-draw lever (`rngSalt`; e-bench `--quick` of S19q + `rngSalt` 1, 2, 3, frozen checkout of a10cdfb)

Generated by `salt_check.py` (session scratch `e3e/tools/`) from the JSON (07:12–07:17, `git.dirty` 0), against the
integrator's S19q and its three `rgTemperature` re-draws; sums on the rows counted in all seven runs.

```
S19q ef13aa8 dirty 0 prescriptions 46
S19q1 ef13aa8 dirty 0 prescriptions 46
S19q2 ef13aa8 dirty 0 prescriptions 46
S19q3 ef13aa8 dirty 0 prescriptions 46
salt1 a10cdfb dirty 0 prescriptions 46
salt2 a10cdfb dirty 0 prescriptions 46
salt3 a10cdfb dirty 0 prescriptions 46
fitted (15 rows): rgTemperature group 0.80 / 1.35 / 1.31 / 1.06 (SD 0.25); rngSalt group 0.80 / 0.95 / 1.66 / 1.64 (SD 0.45); ratio 1.78 inside 0.25–3.93
   |Δ| from S19q: rgTemperature 0.55 / 0.51 / 0.26; rngSalt 0.15 / 0.86 / 0.84
held-out (11 rows): rgTemperature group 4.18 / 3.61 / 4.42 / 4.22 (SD 0.35); rngSalt group 4.18 / 4.33 / 5.04 / 3.92 (SD 0.48); ratio 1.38 inside 0.25–3.93
   |Δ| from S19q: rgTemperature 0.57 / 0.24 / 0.04; rngSalt 0.15 / 0.86 / 0.26
held-out w/o rare (11 rows): rgTemperature group 4.18 / 3.61 / 4.42 / 4.22 (SD 0.35); rngSalt group 4.18 / 4.33 / 5.04 / 3.92 (SD 0.48); ratio 1.38 inside 0.25–3.93
   |Δ| from S19q: rgTemperature 0.57 / 0.24 / 0.04; rngSalt 0.15 / 0.86 / 0.26
S19q1: rows whose value differs from S19q: 26 of 26
S19q2: rows whose value differs from S19q: 25 of 26
S19q3: rows whose value differs from S19q: 25 of 26
salt1: rows whose value differs from S19q: 25 of 26
salt2: rows whose value differs from S19q: 24 of 26
salt3: rows whose value differs from S19q: 24 of 26
```

**Reading (as registered, §4): the lever re-draws like `rgTemperature`.** Every salted run differs from S19q (24–25 of 26
rows change), and the SD of each sum over S19q and the three salted runs is 1.78 × (fitted) and 1.38 × (held-out, with
and without the rare rows: T-HUN-4 is not scored in every run, T-BRD-1 and T-IGE-3 in none) that over S19q and its three
`rgTemperature` re-draws, inside the 95% range of a ratio of two SDs of four runs (0.25–3.93). A stack carrying
`choiceBelief` reads no temperature, so its replicate references are re-drawn with `rngSalt` 1, 2, 3.

### 6.1 Iteration 1: A1 = S19 + `choiceBelief` 1, A1r = A1 + `redecideValue` 2 (frozen checkout of a10cdfb)

Generated by `e3e_judge.py` (session scratch `e3e/tools/`; the integrator's `judge_vs_reps.py` for the sums, one call per
arm on the rows each arm and the four references score; his OLS slope convention for reserves) from the JSON: e-bench,
energy-diagnose and choice-diagnose of each arm (07:04–07:12, load 7–11, `git.dirty` 0, `--workers` 2) against the four
S19 quick realizations (the integrator's e-bench and energy runs at ef13aa8; this stage's choice-diagnose of the same
worlds, §2.1).

```
reference runs: ['S19q', 'S19q1', 'S19q2', 'S19q3']; arms: ['A1', 'A1r']
  S19q: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  S19q1: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  S19q2: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  S19q3: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  A1: a10cdfb dirty 0 prescriptions 45 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  A1r: a10cdfb dirty 0 prescriptions 43 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]


quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 13
  fitted             (17 rows) ref 1.38, 1.60, 1.56, 2.31 (mean 1.71, sd 0.41; used 0.69) | A1.json: 2.24, Δ +0.53, z +0.7 (inside noise)
  held-out           (13 rows) ref 4.89, 5.34, 7.02, 6.94 (mean 6.05, sd 1.09; used 1.26) | A1.json: 8.71, Δ +2.66, z +1.9 (inside noise)
  held-out w/o rare  (12 rows) ref 4.51, 3.94, 4.75, 4.55 (mean 4.44, sd 0.35; used 0.48) | A1.json: 7.18, Δ +2.74, z +5.1 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.12±0.08 | A1.json 0.60 (fail)
   T-FOOD-10 held-out ref 2.21±0.09 | A1.json 3.03 (fail)
   T-FOOD-5  held-out ref 0.00±0.00 | A1.json 0.41 (fail)
   T-HUN-4   held-out ref 1.61±0.93 | A1.json 1.53 (fail)
   T-RNG-5   held-out ref 0.67±0.24 | A1.json 1.98 (fail)
quick, reference custom (4 runs), rows counted in all runs: fitted 14, held-out 11
  fitted             (14 rows) ref 0.80, 1.16, 1.31, 0.47 (mean 0.93, sd 0.38; used 0.69) | A1r.json: 2.26, Δ +1.33, z +1.7 (inside noise)
  held-out           (11 rows) ref 4.18, 3.61, 4.42, 4.22 (mean 4.11, sd 0.35; used 1.26) | A1r.json: 6.23, Δ +2.12, z +1.5 (inside noise)
  held-out w/o rare  (11 rows) ref 4.18, 3.61, 4.42, 4.22 (mean 4.11, sd 0.35; used 0.48) | A1r.json: 6.23, Δ +2.12, z +4.0 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.12±0.08 | A1r.json 0.68 (fail)
   T-FOOD-10 held-out ref 2.21±0.09 | A1r.json 3.18 (fail)
   T-FOOD-2  fitted   ref 0.00±0.00 | A1r.json 0.23 (fail)
   T-FOOD-5  held-out ref 0.00±0.00 | A1r.json 0.11 (fail)
   T-HUN-1   fitted   ref 0.01±0.03 | A1r.json 0.15 (inconclusive)
   T-RNG-5   held-out ref 0.67±0.24 | A1r.json 1.29 (fail)

| Reserves ÷ store, % per day (OLS) | S19q runs | S19q mean ± SD | A1 | A1r |
| --- | --- | --- | --- | --- |
| adult male | +0.001 / +0.007 / +0.004 / +0.007 | +0.005 ± 0.003 | -0.005 (z -3.0) | -0.001 (z -1.8) |
| female, other | +0.016 / +0.031 / +0.018 / +0.006 | +0.018 ± 0.010 | +0.017 (z -0.0) | -0.083 (z -8.8) |
| female, lactating | +0.018 / -0.008 / -0.012 / -0.004 | -0.001 ± 0.014 | +0.014 (z +1.0) | -0.031 (z -2.0) |
| juvenile 5–12 y | -0.013 / -0.007 / -0.006 / -0.016 | -0.010 ± 0.005 | -0.058 (z -9.0) | -0.066 (z -10.5) |
| infant 2–5 y | +0.017 / +0.003 / -0.008 / +0.008 | +0.005 ± 0.011 | +0.004 (z -0.1) | -0.027 (z -2.7) |
| infant 0.5–2 y | +0.017 / -0.018 / -0.016 / -0.005 | -0.006 ± 0.016 | +0.017 (z +1.2) | -0.035 (z -1.6) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) | +0.000 (z +nan) |

| Ground km / eating min / fruit share / daylight hunger (energy-diagnose) | S19q runs | S19q mean ± SD | A1 | A1r |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 2.157 / 2.358 / 2.319 / 2.348 | 2.295 ± 0.094 | 1.987 (z -2.9) | 2.593 (z +2.8) |
| adult male: eatingMin | 253.460 / 253.326 / 253.966 / 254.641 | 253.848 ± 0.596 | 242.407 (z -17.2) | 238.684 (z -22.8) |
| adult male: fruitShare | 0.780 / 0.783 / 0.792 / 0.788 | 0.786 ± 0.005 | 0.844 (z +10.1) | 0.927 (z +24.4) |
| adult male: hungerDay | 0.211 / 0.231 / 0.222 / 0.218 | 0.220 ± 0.008 | 0.288 (z +7.3) | 0.280 (z +6.5) |
| female, other: groundKm | 1.711 / 1.663 / 1.730 / 1.694 | 1.699 ± 0.029 | 1.569 (z -4.1) | 2.256 (z +17.5) |
| female, other: eatingMin | 275.137 / 270.811 / 267.067 / 267.538 | 270.138 ± 3.725 | 235.897 (z -8.2) | 247.124 (z -5.5) |
| female, other: fruitShare | 0.517 / 0.546 / 0.521 / 0.534 | 0.529 ± 0.013 | 0.621 (z +6.3) | 0.605 (z +5.2) |
| female, other: hungerDay | 0.209 / 0.218 / 0.205 / 0.220 | 0.213 ± 0.007 | 0.256 (z +5.3) | 0.260 (z +5.8) |
| female, lactating: groundKm | 1.913 / 2.088 / 2.097 / 2.003 | 2.025 ± 0.086 | 1.872 (z -1.6) | 2.349 (z +3.4) |
| female, lactating: eatingMin | 322.919 / 320.680 / 319.279 / 321.688 | 321.141 ± 1.543 | 305.607 (z -9.0) | 305.741 (z -8.9) |
| female, lactating: fruitShare | 0.604 / 0.607 / 0.611 / 0.602 | 0.606 ± 0.004 | 0.658 (z +10.9) | 0.664 (z +12.4) |
| female, lactating: hungerDay | 0.275 / 0.282 / 0.281 / 0.276 | 0.278 ± 0.003 | 0.269 (z -2.4) | 0.247 (z -8.0) |
| juvenile 5–12 y: groundKm | 2.176 / 2.216 / 2.264 / 2.180 | 2.209 ± 0.041 | 2.006 (z -4.4) | 2.656 (z +9.8) |
| juvenile 5–12 y: eatingMin | 287.821 / 293.001 / 289.113 / 285.872 | 288.952 ± 3.010 | 274.913 (z -4.2) | 276.224 (z -3.8) |
| juvenile 5–12 y: fruitShare | 0.851 / 0.835 / 0.841 / 0.832 | 0.840 ± 0.009 | 0.845 (z +0.5) | 0.914 (z +7.8) |
| juvenile 5–12 y: hungerDay | 0.303 / 0.304 / 0.308 / 0.292 | 0.302 ± 0.006 | 0.326 (z +3.3) | 0.339 (z +5.2) |

| Row (pooled) | Band | S19q runs | S19q mean ± SD | A1 | A1r |
| --- | --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.401 / 0.400 / 0.406 / 0.394 | 0.400 ± 0.005 | 0.370 (z -5.9) | 0.362 (z -7.5) |
| T-ACT-2 | 0.12–0.25 | 0.190 / 0.195 / 0.192 / 0.190 | 0.192 ± 0.002 | 0.159 (z -13.2) | 0.209 (z +7.0) |
| T-ACT-3 | 0.08–0.18 | 0.095 / 0.096 / 0.085 / 0.098 | 0.093 ± 0.006 | 0.096 (z +0.4) | 0.084 (z -1.4) |
| T-ACT-4 | 0.3–0.47 | 0.347 / 0.321 / 0.367 / 0.311 | 0.337 ± 0.025 | 0.355 (z +0.7) | 0.351 (z +0.5) |
| T-PTY-1 | 3–9 | 4.409 / 4.178 / 3.923 / 3.861 | 4.093 ± 0.251 | 5.004 (z +3.2) | 4.841 (z +2.7) |
| T-RNG-4 | 1.5–3.5 | 1.996 / 2.325 / 2.029 / 2.075 | 2.106 ± 0.149 | 1.396 (z -4.3) | 2.077 (z -0.2) |
| T-RNG-5 | 0.3–0.6 | 0.779 / 0.783 / 0.905 / 0.742 | 0.802 ± 0.071 | 1.194 (z +4.9) | 0.986 (z +2.3) |
| T-HUN-1 | 5–25 | 7.978 / 7.935 / 3.989 / 7.892 | 6.948 ± 1.973 | 3.925 (z -1.4) | 1.962 (z -2.3) |
| T-HUN-2 | 0.5–0.8 | 0.400 / 0.500 / 0.667 / 0.200 | 0.442 ± 0.195 | 0.500 (z +0.3) | — |
| T-HUN-3 | 0.05–0.4 | 0.047 / 0.007 / 0.006 / 0.023 | 0.021 ± 0.019 | 0.009 (z -0.6) | 0.000 (z -1.0) |
| T-FOOD-2 | 0.6–0.78 | 0.706 / 0.679 / 0.696 / 0.716 | 0.699 ± 0.016 | 0.744 (z +2.6) | 0.821 (z +7.0) |
| T-FOOD-4 | 4–15 | 8.773 / 8.816 / 7.836 / 8.859 | 8.571 ± 0.491 | 12.172 (z +6.6) | 16.385 (z +14.2) |
| T-FOOD-5 | 0.15–0.45 | 0.288 / 0.318 / 0.313 / 0.314 | 0.308 ± 0.014 | 0.573 (z +17.3) | 0.484 (z +11.5) |
| T-FOOD-6 | 2–7 | 4.351 / 4.659 / 4.847 / 4.981 | 4.710 ± 0.273 | 4.406 (z -1.0) | 4.818 (z +0.4) |
| T-FOOD-10 | 0.08–0.3 | 0.810 / 0.764 / 0.781 / 0.792 | 0.787 ± 0.019 | 0.967 (z +8.3) | 1.000 (z +9.9) |
| T-IGE-1 | 5–12 | 7.404 / 13.325 / 10.542 / 16.132 | 11.851 ± 3.741 | 3.053 (z -2.1) | 7.317 (z -1.1) |
| T-PAT-1 | 0.1–0.5 | 0.266 / 0.114 / 0.191 / 0.190 | 0.190 ± 0.062 | 0.113 (z -1.1) | 0.151 (z -0.6) |
| T-PAT-6 | 0.4–0.7 | 0.067 / 0.462 / 0.333 / 0.400 | 0.315 ± 0.174 | 0.500 (z +0.9) | 0.500 (z +0.9) |
| T-SOC-5 | 0.2–0.7 | 0.253 / 0.410 / 0.387 / 0.408 | 0.364 ± 0.075 | 0.563 (z +2.4) | 0.691 (z +3.9) |
| T-SOC-9 | 0.08–0.22 | 0.087 / 0.174 / 0.248 / 0.053 | 0.140 ± 0.088 | 0.080 (z -0.6) | 0.062 (z -0.8) |
| T-COM-1 | 0.5–1.5 | 0.700 / 0.832 / 0.682 / 0.712 | 0.731 ± 0.068 | 0.778 (z +0.6) | 0.930 (z +2.6) |
| T-COM-8 | 0.3–0.6 | 0.640 / 0.656 / 0.601 / 0.652 | 0.637 ± 0.025 | 0.781 (z +5.1) | 0.804 (z +5.9) |
| T-COM-11 | 0.25–0.55 | 0.056 / 0.000 / 0.000 / 0.267 | 0.081 ± 0.127 | 0.000 (z -0.6) | 0.000 (z -0.6) |
S19q T-ACT-1 by sex {'male': 0.371, 'female': 0.426}; T-ACT-2 {'male': 0.213, 'female': 0.172}; T-ACT-3 {'male': 0.114, 'female': 0.078}
S19q1 T-ACT-1 by sex {'male': 0.366, 'female': 0.429}; T-ACT-2 {'male': 0.232, 'female': 0.163}; T-ACT-3 {'male': 0.118, 'female': 0.077}
S19q2 T-ACT-1 by sex {'male': 0.369, 'female': 0.437}; T-ACT-2 {'male': 0.217, 'female': 0.171}; T-ACT-3 {'male': 0.114, 'female': 0.061}
S19q3 T-ACT-1 by sex {'male': 0.373, 'female': 0.411}; T-ACT-2 {'male': 0.223, 'female': 0.164}; T-ACT-3 {'male': 0.126, 'female': 0.075}
A1 T-ACT-1 by sex {'male': 0.34, 'female': 0.396}; T-ACT-2 {'male': 0.169, 'female': 0.151}; T-ACT-3 {'male': 0.126, 'female': 0.07}
A1r T-ACT-1 by sex {'male': 0.33, 'female': 0.391}; T-ACT-2 {'male': 0.211, 'female': 0.208}; T-ACT-3 {'male': 0.111, 'female': 0.061}

| Choices (choice-diagnose) | S19q runs | S19q mean ± SD | A1 | A1r |
| --- | --- | --- | --- | --- |
| draws per animal-hour | 4.543 / 4.693 / 4.620 / 4.582 | 4.609 ± 0.064 | 5.584 (z +13.6) | 6.229 (z +22.7) |
| switches per animal-hour (draws that changed the act) | 3.416 / 3.468 / 3.502 / 3.441 | 3.457 ± 0.037 | 3.903 (z +10.9) | 5.712 (z +54.9) |
| non-top share of draws (the menu's own ranking) | 0.384 / 0.372 / 0.383 / 0.378 | 0.379 ± 0.006 | 0.034 (z -56.1) | 0.029 (z -57.0) |
| non-top share of draws, by value | 0.443 / 0.431 / 0.443 / 0.436 | 0.438 ± 0.006 | 0.034 (z -61.8) | 0.029 (z -62.5) |
| kept acts not the menu top | 0.533 / 0.520 / 0.529 / 0.531 | 0.528 ± 0.006 | 0.439 (z -13.9) | 0.024 (z -78.6) |
| choices not the top (draws and keeps) | 0.428 / 0.414 / 0.425 / 0.423 | 0.422 ± 0.006 | 0.137 (z -42.4) | 0.027 (z -58.7) |
| non-top share, taken rest | 0.378 / 0.384 / 0.383 / 0.380 | 0.381 ± 0.003 | 0.015 (z -119.0) | 0.016 (z -118.6) |
| non-top share, taken feed: crown | 0.480 / 0.475 / 0.464 / 0.467 | 0.472 ± 0.007 | 0.068 (z -49.3) | 0.083 (z -47.4) |
| non-top share, taken feed: fallback | 0.696 / 0.695 / 0.702 / 0.691 | 0.696 ± 0.005 | 0.189 (z -99.8) | 0.172 (z -103.1) |
| non-top share, taken groom | 0.395 / 0.381 / 0.388 / 0.387 | 0.388 ± 0.006 | 0.009 (z -59.0) | 0.010 (z -58.9) |
| non-top share, taken travel: own trip | 0.386 / 0.362 / 0.385 / 0.386 | 0.380 ± 0.012 | 0.004 (z -28.4) | 0.003 (z -28.5) |
| non-top share, taken travel: joined trip | 0.225 / 0.199 / 0.227 / 0.201 | 0.213 ± 0.015 | 0.025 (z -11.2) | 0.016 (z -11.7) |
| non-top share, taken call | 0.817 / 0.802 / 0.781 / 0.810 | 0.802 ± 0.016 | 0.083 (z -41.3) | 0.044 (z -43.5) |
| non-top share, taken display | 0.742 / 0.740 / 0.753 / 0.753 | 0.747 ± 0.007 | 0.030 (z -91.9) | 0.021 (z -93.1) |
| non-top share, taken play | 0.489 / 0.518 / 0.518 / 0.520 | 0.511 ± 0.015 | 0.014 (z -29.9) | 0.021 (z -29.5) |
| feeding: min per 12-h daylight day (RG classes) | 274.007 / 272.862 / 274.044 / 271.896 | 273.202 ± 1.029 | 259.382 (z -12.0) | 264.266 (z -7.8) |
| feeding: share from non-top draws | 0.461 / 0.462 / 0.456 / 0.455 | 0.459 ± 0.004 | 0.094 (z -92.8) | 0.077 (z -97.2) |
| rest: min per 12-h daylight day (RG classes) | 179.860 / 176.058 / 175.414 / 177.711 | 177.261 ± 1.985 | 223.404 (z +20.8) | 193.016 (z +7.1) |
| rest: share from non-top draws | 0.359 / 0.360 / 0.357 / 0.361 | 0.359 ± 0.002 | 0.017 (z -179.2) | 0.013 (z -181.3) |
| grooming: min per 12-h daylight day (RG classes) | 49.594 / 47.811 / 48.035 / 48.500 | 48.485 ± 0.793 | 43.891 (z -5.2) | 42.582 (z -6.7) |
| grooming: share from non-top draws | 0.374 / 0.378 / 0.378 / 0.374 | 0.376 ± 0.002 | 0.008 (z -142.5) | 0.008 (z -142.5) |
| travel: min per 12-h daylight day (RG classes) | 84.106 / 91.373 / 90.269 / 88.844 | 88.648 ± 3.200 | 80.854 (z -2.2) | 105.338 (z +4.7) |
| travel: share from non-top draws | 0.294 / 0.280 / 0.293 / 0.292 | 0.290 ± 0.007 | 0.017 (z -37.2) | 0.010 (z -38.2) |
| other: min per 12-h daylight day (RG classes) | 69.310 / 66.370 / 68.297 / 71.388 | 68.841 ± 2.090 | 60.078 (z -3.7) | 61.034 (z -3.3) |
| other: share from non-top draws | 0.459 / 0.473 / 0.450 / 0.456 | 0.459 ± 0.010 | 0.021 (z -40.2) | 0.014 (z -40.9) |

| Runs (act bouts), minutes, adult and juvenile classes | S19q runs | S19q mean ± SD | A1 | A1r |
| --- | --- | --- | --- | --- |
| feeding: medianMin | 21.0 / 21.0 / 20.5 / 21.0 | 20.9 ± 0.2 | 14.0 (z -24.6) | 8.5 (z -44.3) |
| feeding: meanMin | 23.3 / 23.4 / 22.9 / 23.3 | 23.2 ± 0.2 | 18.9 (z -18.0) | 12.9 (z -42.8) |
| feeding: p90Min | 43.0 / 43.2 / 42.8 / 43.2 | 43.1 ± 0.2 | 41.0 (z -7.7) | 30.5 (z -46.9) |
| grooming: medianMin | 13.5 / 13.2 / 13.0 / 13.2 | 13.2 ± 0.2 | 14.2 (z +4.4) | 9.2 (z -17.5) |
| grooming: meanMin | 15.6 / 15.5 / 15.2 / 15.3 | 15.4 ± 0.2 | 16.6 (z +5.7) | 10.6 (z -22.3) |
| grooming: p90Min | 33.2 / 32.8 / 32.2 / 33.0 | 32.8 ± 0.4 | 33.2 (z +0.9) | 20.8 (z -25.3) |
| rest: medianMin | 28.5 / 28.2 / 27.5 / 28.0 | 28.1 ± 0.4 | 21.5 (z -13.7) | 13.2 (z -31.0) |
| rest: meanMin | 28.4 / 28.4 / 27.7 / 28.2 | 28.2 ± 0.3 | 26.3 (z -5.8) | 15.0 (z -40.2) |
| rest: p90Min | 48.2 / 48.5 / 47.2 / 48.5 | 48.1 ± 0.6 | 47.0 (z -1.7) | 26.8 (z -32.1) |
| travel: medianMin | 4.2 / 4.5 / 4.5 / 4.5 | 4.4 ± 0.1 | 3.2 (z -8.5) | 3.0 (z -10.3) |
| travel: meanMin | 6.1 / 6.3 / 6.3 / 6.2 | 6.2 ± 0.1 | 5.0 (z -10.3) | 4.4 (z -15.7) |
| travel: p90Min | 14.5 / 14.8 / 15.0 / 15.0 | 14.8 ± 0.2 | 12.5 (z -8.6) | 10.5 (z -16.1) |
| feed: crown: medianMin | 19.2 / 19.5 / 18.8 / 19.2 | 19.2 ± 0.3 | 12.2 (z -19.7) | 7.8 (z -32.5) |
| feed: crown: meanMin | 20.8 / 21.0 / 20.5 / 20.8 | 20.8 ± 0.2 | 16.5 (z -16.5) | 11.8 (z -34.3) |
| feed: fallback: medianMin | 32.0 / 31.2 / 31.8 / 32.0 | 31.8 ± 0.4 | 32.2 (z +1.3) | 21.0 (z -27.2) |
| feed: fallback: meanMin | 33.1 / 32.1 / 32.6 / 32.6 | 32.6 ± 0.4 | 33.8 (z +2.6) | 20.5 (z -27.1) |
| travel: own trip: medianMin | 2.8 / 3.0 / 3.0 / 3.0 | 2.9 ± 0.1 | 2.5 (z -3.1) | 2.5 (z -3.1) |
| travel: own trip: meanMin | 4.7 / 4.9 / 4.9 / 4.9 | 4.8 ± 0.1 | 3.8 (z -7.4) | 3.6 (z -9.2) |

A1 identity: [{'seed': 48, 'menuMismatch': 0, 'probErr': 0, 'checked': 79588}, {'seed': 7, 'menuMismatch': 0, 'probErr': 0, 'checked': 80178}] male {'eatingMin': 242.40654761904761, 'groundKm': 1.986697069899628} verdicts/h {"arrived": 0.422, "ended": 1.681, "hunt": 0.003, "interrupt": 2.223, "kept": 1.902, "light": 0.076, "max-age": 0.305, "need-bucket": 1.116, "patch-poor": 0, "patrol": 0.02, "period": 0.158}

A1r identity: [{'seed': 48, 'menuMismatch': 0, 'probErr': 0, 'checked': 92145}, {'seed': 7, 'menuMismatch': 0, 'probErr': 0, 'checked': 86085}] male {'eatingMin': 238.68363095238095, 'groundKm': 2.5932449468197336} verdicts/h {"arrived": 0.839, "ended": 2.619, "hunt": 0.008, "kept": 2.17, "light": 0.07, "light-phase": 0.113, "need-bucket": 1.281, "outvalued": 2.106, "patrol": 0.031}
```

Night and departures (rhythm-metrics on A1, seeds 48 and 7, 30 + 30 days, the same frozen checkout; a diagnosis, the
arm is not kept): adults out of a nest 2.6% of the night (nest 97.4%; T-RHY-5 0.03), none at solar midnight;
departures before sunrise 0.75 of adults (lactating females 0.98, other females 0.68, males 0.68), median 13 min before
sunrise.

**What happened.** Options the animal knows were taken when they were the top 99.7–99.9% of the time, and the choices that
still departed from the top were trips to trees out of sight (taken when the top 0.83–0.84 for trees not seen for a day
or never seen): the variability now follows knowledge, as built (non-top share of draws 0.38 → 0.03). But the model's
valuation, compared without noise, behaves differently from the reference in four ways. (i) **No persistence**: at the
gate's need-bucket draws (0.74 → 1.12 per animal-hour) and at interrupts an act is now dropped whenever another option
is a little better, so crown bouts fell from 19 to 12 min (median), animals visited more trees (T-FOOD-4 8.6 → 12.2) and
ate 11–34 min less a day in every class (fruit share up); with `redecideValue` 2 the keep test re-decided near-ties at
every bout end and interrupt (5.7 switches per animal-hour, feeding runs 8.5 min, rest 13), walking rose (males 2.30 →
2.59 km, other females 1.70 → 2.26) and other females' and juveniles' reserves fell. (ii) **The nearest tree**: a crown is
valued for one bout's rate, so the nearest productive tree is the best, and the share of moves to it rose from 0.31 to
0.57 (T-FOOD-5; Taï 30%, normand2009). (iii) **Leaving the nest**: with only sleeping nest-mates holding (the
correction of §5.1), adults left before sunrise more (T-FOOD-10 0.79 → 0.97; lactating females 0.98 of departures).
(iv) **Ranging**: males walked less under the gate (1.99 km; T-RNG-4 1.40, below its band; T-RNG-5 1.19). Food calls at
crowns were given more often (T-COM-8 0.64 → 0.78), male pant-hoots stayed in band (T-COM-1 0.78; calls were taken half
as often, but the focal rate did not fall).

**Against the predictions.** A1: prescriptions 45 held; viability held; non-top share ≤ 0.08 held (0.034); switches
3.0–4.2 held (3.90); runs: feeding 12–20 held (14.0), rest 20–30 held (21.5), grooming 11–17 held (14.2); fallback
non-top ≤ 0.10 missed (0.19: the fallback is taken when a remembered tree's draw falls below it); T-FOOD-2 up ≥ 0.06 and
above band missed (+0.045, in band); fruit share up held for adults (juveniles level); T-COM-1 below 0.5 missed (0.78);
T-ACT-1 and T-ACT-2 within ± 0.04 held (−0.030, −0.033); T-ACT-3 lower missed (+0.003); T-ACT-4 up held (+0.018);
T-RNG-4 within ± 0.4 missed (−0.71); T-FOOD-4 within ± 1.5 missed (+3.6); reserves within ± 0.03 missed for juveniles
(−0.048), held for mothers and infants; fitted worse beyond noise missed (z +0.7); held-out inside noise held with the rare
rows (z +1.9), missed without (z +5.1). A1r: prescriptions 43 held; viability held; non-top ≤ 0.08 held (0.029);
switches 5–8 held (5.71); runs held (feeding 8.5, rest 13.3, grooming 9.3); T-FOOD-2 up held (0.821, above band);
T-COM-1 below 0.5 missed (0.93); T-ACT-1 within ± 0.04 held (−0.038), T-ACT-2 up held (+0.017), T-ACT-3 lower held,
T-ACT-4 held; T-RNG-4 held (−0.03); T-FOOD-4 missed (+7.8); reserves within ± 0.04 missed for juveniles (−0.056) and other
females (−0.101); fitted worse beyond noise missed (z +1.7); held-out inside noise held with the rare rows (z +1.5), missed
without (z +4.0).

**Kill criterion.** A1: (c) met (held-out without the rare rows z +5.1: T-RNG-5 +1.30, T-FOOD-10 +0.82, T-FOOD-5 +0.41);
(a), (b) (largest fall juveniles −0.048, under 0.05) and (d) not. A1r: (b) met (other females −0.101, juveniles −0.056)
and (c) met (z +4.0).

**Verdict: null; `choiceBelief` 1 recorded, off. Re-decision does not hold on it** (A1r fails the keep rule). The
softmax's noise did more than stand for ignorance: it supplied persistence (a re-drawn act stays with some probability),
the non-nearest tree choices of the field (normand2009's 30%), longer meals and an exit from the nest-company lock. Those
are terms the valuation lacks (a cost or delay of switching an act done in place, a crop's value beyond one bout, meal
dynamics), and the animal's uncertainty about what it cannot see does not supply them: in this currency a remembered
crop above one bout's gut room changes nothing, so the belief rarely moves a trip.

### 6.2 Iteration 2: A2 = S19 + `choiceBelief` 2, A2r = A2 + `redecideValue` 2 (frozen checkout of 0ec4316)

Generated by `e3e_judge.py` as §6.1 (07:20–07:27, load 8–11, `git.dirty` 0, `--workers` 2).

```
reference runs: ['S19q', 'S19q1', 'S19q2', 'S19q3']; arms: ['A2', 'A2r']
  S19q: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  S19q1: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  S19q2: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  S19q3: ef13aa8 dirty 0 prescriptions 46 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  A2: 0ec4316 dirty 0 prescriptions 45 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]
  A2r: 0ec4316 dirty 0 prescriptions 43 viability True (seed, start, end, deaths, starvation, causes) [(48, 49, 49, 0, 0, {}), (7, 49, 49, 0, 0, {})]


quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 13
  fitted             (17 rows) ref 1.38, 1.60, 1.56, 2.31 (mean 1.71, sd 0.41; used 0.69) | A2.json: 1.33, Δ -0.38, z -0.5 (inside noise)
  held-out           (13 rows) ref 4.89, 5.34, 7.02, 6.94 (mean 6.05, sd 1.09; used 1.26) | A2.json: 5.28, Δ -0.77, z -0.5 (inside noise)
  held-out w/o rare  (12 rows) ref 4.51, 3.94, 4.75, 4.55 (mean 4.44, sd 0.35; used 0.48) | A2.json: 4.25, Δ -0.19, z -0.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 2.21±0.09 | A2.json 1.32 (fail)
   T-HUN-4   held-out ref 1.61±0.93 | A2.json 1.02 (fail)
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 11
  fitted             (16 rows) ref 1.13, 1.35, 1.31, 2.06 (mean 1.46, sd 0.41; used 0.69) | A2r.json: 6.48, Δ +5.02, z +6.5 RESULT
  held-out           (11 rows) ref 4.18, 3.61, 4.42, 4.22 (mean 4.11, sd 0.35; used 1.26) | A2r.json: 2.90, Δ -1.21, z -0.9 (inside noise)
  held-out w/o rare  (11 rows) ref 4.18, 3.61, 4.42, 4.22 (mean 4.11, sd 0.35; used 0.48) | A2r.json: 2.90, Δ -1.21, z -2.2 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 2.21±0.09 | A2r.json 1.00 (fail)
   T-FOOD-2  fitted   ref 0.00±0.00 | A2r.json 0.20 (fail)
   T-HUN-1   fitted   ref 0.01±0.03 | A2r.json 0.15 (inconclusive)
   T-HUN-2   fitted   ref 0.33±0.47 | A2r.json 1.67 (fail)
   T-IGE-1   fitted   ref 0.19±0.28 | A2r.json 3.21 (fail)

| Reserves ÷ store, % per day (OLS) | S19q runs | S19q mean ± SD | A2 | A2r |
| --- | --- | --- | --- | --- |
| adult male | +0.001 / +0.007 / +0.004 / +0.007 | +0.005 ± 0.003 | +0.011 (z +1.9) | -0.005 (z -3.0) |
| female, other | +0.016 / +0.031 / +0.018 / +0.006 | +0.018 ± 0.010 | +0.011 (z -0.5) | +0.021 (z +0.3) |
| female, lactating | +0.018 / -0.008 / -0.012 / -0.004 | -0.001 ± 0.014 | +0.026 (z +1.8) | +0.005 (z +0.4) |
| juvenile 5–12 y | -0.013 / -0.007 / -0.006 / -0.016 | -0.010 ± 0.005 | -0.001 (z +1.8) | -0.034 (z -4.5) |
| infant 2–5 y | +0.017 / +0.003 / -0.008 / +0.008 | +0.005 ± 0.011 | +0.040 (z +2.9) | +0.008 (z +0.3) |
| infant 0.5–2 y | +0.017 / -0.018 / -0.016 / -0.005 | -0.006 ± 0.016 | +0.013 (z +1.0) | +0.007 (z +0.7) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) | +0.000 (z +nan) |

| Ground km / eating min / fruit share / daylight hunger (energy-diagnose) | S19q runs | S19q mean ± SD | A2 | A2r |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 2.157 / 2.358 / 2.319 / 2.348 | 2.295 ± 0.094 | 1.870 (z -4.1) | 2.555 (z +2.5) |
| adult male: eatingMin | 253.460 / 253.326 / 253.966 / 254.641 | 253.848 ± 0.596 | 229.284 (z -36.9) | 232.396 (z -32.2) |
| adult male: fruitShare | 0.780 / 0.783 / 0.792 / 0.788 | 0.786 ± 0.005 | 0.887 (z +17.5) | 0.939 (z +26.5) |
| adult male: hungerDay | 0.211 / 0.231 / 0.222 / 0.218 | 0.220 ± 0.008 | 0.218 (z -0.2) | 0.213 (z -0.8) |
| female, other: groundKm | 1.711 / 1.663 / 1.730 / 1.694 | 1.699 ± 0.029 | 1.331 (z -11.6) | 1.953 (z +8.0) |
| female, other: eatingMin | 275.137 / 270.811 / 267.067 / 267.538 | 270.138 ± 3.725 | 226.609 (z -10.5) | 232.958 (z -8.9) |
| female, other: fruitShare | 0.517 / 0.546 / 0.521 / 0.534 | 0.529 ± 0.013 | 0.650 (z +8.3) | 0.665 (z +9.3) |
| female, other: hungerDay | 0.209 / 0.218 / 0.205 / 0.220 | 0.213 ± 0.007 | 0.205 (z -1.0) | 0.212 (z -0.1) |
| female, lactating: groundKm | 1.913 / 2.088 / 2.097 / 2.003 | 2.025 ± 0.086 | 1.655 (z -3.8) | 2.274 (z +2.6) |
| female, lactating: eatingMin | 322.919 / 320.680 / 319.279 / 321.688 | 321.141 ± 1.543 | 299.105 (z -12.8) | 306.129 (z -8.7) |
| female, lactating: fruitShare | 0.604 / 0.607 / 0.611 / 0.602 | 0.606 ± 0.004 | 0.668 (z +13.1) | 0.666 (z +12.7) |
| female, lactating: hungerDay | 0.275 / 0.282 / 0.281 / 0.276 | 0.278 ± 0.003 | 0.260 (z -4.5) | 0.262 (z -4.1) |
| juvenile 5–12 y: groundKm | 2.176 / 2.216 / 2.264 / 2.180 | 2.209 ± 0.041 | 1.798 (z -9.0) | 2.462 (z +5.5) |
| juvenile 5–12 y: eatingMin | 287.821 / 293.001 / 289.113 / 285.872 | 288.952 ± 3.010 | 277.695 (z -3.3) | 280.938 (z -2.4) |
| juvenile 5–12 y: fruitShare | 0.851 / 0.835 / 0.841 / 0.832 | 0.840 ± 0.009 | 0.871 (z +3.3) | 0.875 (z +3.7) |
| juvenile 5–12 y: hungerDay | 0.303 / 0.304 / 0.308 / 0.292 | 0.302 ± 0.006 | 0.300 (z -0.3) | 0.333 (z +4.3) |

| Row (pooled) | Band | S19q runs | S19q mean ± SD | A2 | A2r |
| --- | --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.401 / 0.400 / 0.406 / 0.394 | 0.400 ± 0.005 | 0.378 (z -4.4) | 0.383 (z -3.4) |
| T-ACT-2 | 0.12–0.25 | 0.190 / 0.195 / 0.192 / 0.190 | 0.192 ± 0.002 | 0.151 (z -16.5) | 0.210 (z +7.2) |
| T-ACT-3 | 0.08–0.18 | 0.095 / 0.096 / 0.085 / 0.098 | 0.093 ± 0.006 | 0.094 (z +0.1) | 0.090 (z -0.5) |
| T-ACT-4 | 0.3–0.47 | 0.347 / 0.321 / 0.367 / 0.311 | 0.337 ± 0.025 | 0.391 (z +1.9) | 0.348 (z +0.4) |
| T-PTY-1 | 3–9 | 4.409 / 4.178 / 3.923 / 3.861 | 4.093 ± 0.251 | 4.017 (z -0.3) | 4.216 (z +0.4) |
| T-RNG-4 | 1.5–3.5 | 1.996 / 2.325 / 2.029 / 2.075 | 2.106 ± 0.149 | 1.487 (z -3.7) | 2.264 (z +0.9) |
| T-RNG-5 | 0.3–0.6 | 0.779 / 0.783 / 0.905 / 0.742 | 0.802 ± 0.071 | 0.929 (z +1.6) | 0.877 (z +0.9) |
| T-HUN-1 | 5–25 | 7.978 / 7.935 / 3.989 / 7.892 | 6.948 ± 1.973 | 6.016 (z -0.4) | 2.005 (z -2.2) |
| T-HUN-2 | 0.5–0.8 | 0.400 / 0.500 / 0.667 / 0.200 | 0.442 ± 0.195 | 0.500 (z +0.3) | 0.000 (z -2.0) |
| T-HUN-3 | 0.05–0.4 | 0.047 / 0.007 / 0.006 / 0.023 | 0.021 ± 0.019 | 0.007 (z -0.6) | 0.000 (z -1.0) |
| T-FOOD-2 | 0.6–0.78 | 0.706 / 0.679 / 0.696 / 0.716 | 0.699 ± 0.016 | 0.763 (z +3.6) | 0.816 (z +6.7) |
| T-FOOD-4 | 4–15 | 8.773 / 8.816 / 7.836 / 8.859 | 8.571 ± 0.491 | 7.796 (z -1.4) | 11.187 (z +4.8) |
| T-FOOD-5 | 0.15–0.45 | 0.288 / 0.318 / 0.313 / 0.314 | 0.308 ± 0.014 | 0.398 (z +5.8) | 0.296 (z -0.8) |
| T-FOOD-6 | 2–7 | 4.351 / 4.659 / 4.847 / 4.981 | 4.710 ± 0.273 | 4.729 (z +0.1) | 4.157 (z -1.8) |
| T-FOOD-10 | 0.08–0.3 | 0.810 / 0.764 / 0.781 / 0.792 | 0.787 ± 0.019 | 0.590 (z -9.1) | 0.519 (z -12.4) |
| T-IGE-1 | 5–12 | 7.404 / 13.325 / 10.542 / 16.132 | 11.851 ± 3.741 | 8.977 (z -0.7) | 34.473 (z +5.4) |
| T-PAT-1 | 0.1–0.5 | 0.266 / 0.114 / 0.191 / 0.190 | 0.190 ± 0.062 | 0.038 (z -2.2) | 0.269 (z +1.1) |
| T-PAT-6 | 0.4–0.7 | 0.067 / 0.462 / 0.333 / 0.400 | 0.315 ± 0.174 | 0.600 (z +1.5) | 0.833 (z +2.7) |
| T-SOC-5 | 0.2–0.7 | 0.253 / 0.410 / 0.387 / 0.408 | 0.364 ± 0.075 | 0.283 (z -1.0) | 0.539 (z +2.1) |
| T-SOC-9 | 0.08–0.22 | 0.087 / 0.174 / 0.248 / 0.053 | 0.140 ± 0.088 | 0.082 (z -0.6) | 0.180 (z +0.4) |
| T-COM-1 | 0.5–1.5 | 0.700 / 0.832 / 0.682 / 0.712 | 0.731 ± 0.068 | 0.501 (z -3.0) | 0.661 (z -0.9) |
| T-COM-8 | 0.3–0.6 | 0.640 / 0.656 / 0.601 / 0.652 | 0.637 ± 0.025 | 0.611 (z -0.9) | 0.670 (z +1.2) |
| T-COM-11 | 0.25–0.55 | 0.056 / 0.000 / 0.000 / 0.267 | 0.081 ± 0.127 | 0.000 (z -0.6) | 0.000 (z -0.6) |
S19q T-ACT-1 by sex {'male': 0.371, 'female': 0.426}; T-ACT-2 {'male': 0.213, 'female': 0.172}; T-ACT-3 {'male': 0.114, 'female': 0.078}
S19q1 T-ACT-1 by sex {'male': 0.366, 'female': 0.429}; T-ACT-2 {'male': 0.232, 'female': 0.163}; T-ACT-3 {'male': 0.118, 'female': 0.077}
S19q2 T-ACT-1 by sex {'male': 0.369, 'female': 0.437}; T-ACT-2 {'male': 0.217, 'female': 0.171}; T-ACT-3 {'male': 0.114, 'female': 0.061}
S19q3 T-ACT-1 by sex {'male': 0.373, 'female': 0.411}; T-ACT-2 {'male': 0.223, 'female': 0.164}; T-ACT-3 {'male': 0.126, 'female': 0.075}
A2 T-ACT-1 by sex {'male': 0.352, 'female': 0.4}; T-ACT-2 {'male': 0.16, 'female': 0.144}; T-ACT-3 {'male': 0.129, 'female': 0.064}
A2r T-ACT-1 by sex {'male': 0.35, 'female': 0.409}; T-ACT-2 {'male': 0.238, 'female': 0.186}; T-ACT-3 {'male': 0.113, 'female': 0.072}

| Choices (choice-diagnose) | S19q runs | S19q mean ± SD | A2 | A2r |
| --- | --- | --- | --- | --- |
| draws per animal-hour | 4.543 / 4.693 / 4.620 / 4.582 | 4.609 ± 0.064 | 4.307 (z -4.2) | 5.048 (z +6.1) |
| switches per animal-hour (draws that changed the act) | 3.416 / 3.468 / 3.502 / 3.441 | 3.457 ± 0.037 | 2.843 (z -14.9) | 4.225 (z +18.7) |
| non-top share of draws (the menu's own ranking) | 0.384 / 0.372 / 0.383 / 0.378 | 0.379 ± 0.006 | 0.031 (z -56.6) | 0.030 (z -56.8) |
| non-top share of draws, by value | 0.443 / 0.431 / 0.443 / 0.436 | 0.438 ± 0.006 | 0.193 (z -37.5) | 0.221 (z -33.2) |
| kept acts not the menu top | 0.533 / 0.520 / 0.529 / 0.531 | 0.528 ± 0.006 | 0.492 (z -5.7) | 0.254 (z -42.8) |
| choices not the top (draws and keeps) | 0.428 / 0.414 / 0.425 / 0.423 | 0.422 ± 0.006 | 0.175 (z -36.7) | 0.097 (z -48.3) |
| non-top share, taken rest | 0.378 / 0.384 / 0.383 / 0.380 | 0.381 ± 0.003 | 0.019 (z -117.7) | 0.022 (z -116.7) |
| non-top share, taken feed: crown | 0.480 / 0.475 / 0.464 / 0.467 | 0.472 ± 0.007 | 0.085 (z -47.2) | 0.110 (z -44.1) |
| non-top share, taken feed: fallback | 0.696 / 0.695 / 0.702 / 0.691 | 0.696 ± 0.005 | 0.146 (z -108.2) | 0.134 (z -110.6) |
| non-top share, taken groom | 0.395 / 0.381 / 0.388 / 0.387 | 0.388 ± 0.006 | 0.010 (z -58.9) | 0.013 (z -58.4) |
| non-top share, taken travel: own trip | 0.386 / 0.362 / 0.385 / 0.386 | 0.380 ± 0.012 | 0.001 (z -28.6) | 0.001 (z -28.6) |
| non-top share, taken travel: joined trip | 0.225 / 0.199 / 0.227 / 0.201 | 0.213 ± 0.015 | 0.020 (z -11.5) | 0.019 (z -11.5) |
| non-top share, taken call | 0.817 / 0.802 / 0.781 / 0.810 | 0.802 ± 0.016 | 0.086 (z -41.1) | 0.071 (z -42.0) |
| non-top share, taken display | 0.742 / 0.740 / 0.753 / 0.753 | 0.747 ± 0.007 | 0.050 (z -89.4) | 0.032 (z -91.7) |
| non-top share, taken play | 0.489 / 0.518 / 0.518 / 0.520 | 0.511 ± 0.015 | 0.014 (z -29.9) | 0.021 (z -29.5) |
| feeding: min per 12-h daylight day (RG classes) | 274.007 / 272.862 / 274.044 / 271.896 | 273.202 ± 1.029 | 251.048 (z -19.3) | 259.429 (z -12.0) |
| feeding: share from non-top draws | 0.461 / 0.462 / 0.456 / 0.455 | 0.459 ± 0.004 | 0.076 (z -97.4) | 0.067 (z -99.7) |
| rest: min per 12-h daylight day (RG classes) | 179.860 / 176.058 / 175.414 / 177.711 | 177.261 ± 1.985 | 224.720 (z +21.4) | 178.598 (z +0.6) |
| rest: share from non-top draws | 0.359 / 0.360 / 0.357 / 0.361 | 0.359 ± 0.002 | 0.020 (z -177.7) | 0.016 (z -179.8) |
| grooming: min per 12-h daylight day (RG classes) | 49.594 / 47.811 / 48.035 / 48.500 | 48.485 ± 0.793 | 43.719 (z -5.4) | 42.511 (z -6.7) |
| grooming: share from non-top draws | 0.374 / 0.378 / 0.378 / 0.374 | 0.376 ± 0.002 | 0.009 (z -142.1) | 0.010 (z -141.8) |
| travel: min per 12-h daylight day (RG classes) | 84.106 / 91.373 / 90.269 / 88.844 | 88.648 ± 3.200 | 73.339 (z -4.3) | 101.181 (z +3.5) |
| travel: share from non-top draws | 0.294 / 0.280 / 0.293 / 0.292 | 0.290 ± 0.007 | 0.010 (z -38.2) | 0.011 (z -38.1) |
| other: min per 12-h daylight day (RG classes) | 69.310 / 66.370 / 68.297 / 71.388 | 68.841 ± 2.090 | 52.787 (z -6.9) | 62.281 (z -2.8) |
| other: share from non-top draws | 0.459 / 0.473 / 0.450 / 0.456 | 0.459 ± 0.010 | 0.022 (z -40.1) | 0.020 (z -40.3) |

| Runs (act bouts), minutes, adult and juvenile classes | S19q runs | S19q mean ± SD | A2 | A2r |
| --- | --- | --- | --- | --- |
| feeding: medianMin | 21.0 / 21.0 / 20.5 / 21.0 | 20.9 ± 0.2 | 22.8 (z +6.7) | 15.5 (z -19.2) |
| feeding: meanMin | 23.3 / 23.4 / 22.9 / 23.3 | 23.2 ± 0.2 | 25.1 (z +7.6) | 17.7 (z -22.8) |
| feeding: p90Min | 43.0 / 43.2 / 42.8 / 43.2 | 43.1 ± 0.2 | 43.5 (z +1.6) | 34.5 (z -32.0) |
| grooming: medianMin | 13.5 / 13.2 / 13.0 / 13.2 | 13.2 ± 0.2 | 16.0 (z +12.0) | 11.8 (z -6.6) |
| grooming: meanMin | 15.6 / 15.5 / 15.2 / 15.3 | 15.4 ± 0.2 | 19.0 (z +16.6) | 13.3 (z -9.7) |
| grooming: p90Min | 33.2 / 32.8 / 32.2 / 33.0 | 32.8 ± 0.4 | 36.5 (z +7.7) | 26.8 (z -12.7) |
| rest: medianMin | 28.5 / 28.2 / 27.5 / 28.0 | 28.1 ± 0.4 | 33.5 (z +11.4) | 16.5 (z -24.2) |
| rest: meanMin | 28.4 / 28.4 / 27.7 / 28.2 | 28.2 ± 0.3 | 35.2 (z +21.3) | 20.5 (z -23.3) |
| rest: p90Min | 48.2 / 48.5 / 47.2 / 48.5 | 48.1 ± 0.6 | 61.2 (z +19.7) | 40.0 (z -12.2) |
| travel: medianMin | 4.2 / 4.5 / 4.5 / 4.5 | 4.4 ± 0.1 | 4.2 (z -1.3) | 3.8 (z -4.9) |
| travel: meanMin | 6.1 / 6.3 / 6.3 / 6.2 | 6.2 ± 0.1 | 5.9 (z -2.4) | 5.2 (z -9.0) |
| travel: p90Min | 14.5 / 14.8 / 15.0 / 15.0 | 14.8 ± 0.2 | 14.2 (z -2.1) | 12.2 (z -9.6) |
| feed: crown: medianMin | 19.2 / 19.5 / 18.8 / 19.2 | 19.2 ± 0.3 | 21.5 (z +6.6) | 14.5 (z -13.3) |
| feed: crown: meanMin | 20.8 / 21.0 / 20.5 / 20.8 | 20.8 ± 0.2 | 23.0 (z +8.5) | 16.6 (z -15.9) |
| feed: fallback: medianMin | 32.0 / 31.2 / 31.8 / 32.0 | 31.8 ± 0.4 | 34.8 (z +7.6) | 23.0 (z -22.1) |
| feed: fallback: meanMin | 33.1 / 32.1 / 32.6 / 32.6 | 32.6 ± 0.4 | 35.9 (z +7.2) | 23.8 (z -19.7) |
| travel: own trip: medianMin | 2.8 / 3.0 / 3.0 / 3.0 | 2.9 ± 0.1 | 2.8 (z -1.3) | 2.8 (z -1.3) |
| travel: own trip: meanMin | 4.7 / 4.9 / 4.9 / 4.9 | 4.8 ± 0.1 | 4.6 (z -1.6) | 4.2 (z -5.0) |

A2 identity: [{'seed': 48, 'menuMismatch': 0, 'probErr': 0, 'checked': 64517}, {'seed': 7, 'menuMismatch': 0, 'probErr': 0, 'checked': 58720}] male {'eatingMin': 229.28363095238095, 'groundKm': 1.869643116908093} verdicts/h {"arrived": 0.333, "ended": 1.234, "hunt": 0.003, "interrupt": 1.414, "kept": 1.97, "light": 0.345, "max-age": 0.392, "need-bucket": 0.726, "patch-poor": 0.001, "patrol": 0.014, "period": 0.178}

A2r identity: [{'seed': 48, 'menuMismatch': 0, 'probErr': 0, 'checked': 74944}, {'seed': 7, 'menuMismatch': 0, 'probErr': 0, 'checked': 69480}] male {'eatingMin': 232.39613095238096, 'groundKm': 2.555108940435602} verdicts/h {"arrived": 0.667, "ended": 2.017, "hunt": 0.009, "kept": 2.158, "light": 0.337, "light-phase": 0.114, "need-bucket": 0.858, "outvalued": 1.683, "patrol": 0.03}
```

Night and departures (rhythm-metrics, seeds 48 and 7, 30 + 30 days, the same frozen checkout): A2 adults out of a nest
2.0% of the night (T-RHY-5 0.02), none at solar midnight; departures before sunrise 0.46 of adults (males 0.25,
lactating females 0.73, other females 0.55). A2r: adults out of a nest 1.7% of the night (T-RHY-5 0.02), none at solar midnight; departures before sunrise 0.47 of adults (males 0.29, lactating females 0.70, other females 0.54).

**What happened.** *A2.* The menu ranks options by their published score (value ± the rules' jitter) and the option
taken is the menu's top in 97% of draws, the remaining 3% trips whose drawn crop fell; by value alone 19% of draws are
not the top (the jitter decides near-ties). Animals switch less (2.84 per animal-hour against 3.46 ± 0.04), bouts
lengthen (feeding 22.8, rest 33.5, grooming 16.0 min, median), and the day shifts from feeding (−22 min per 12-h day),
travel (−15) and other acts (−16) to rest (+47): every class walks 0.3–0.4 km less (males 2.30 → 1.87) and eats 11–44 min
less, but at a higher fruit share (0.76; T-FOOD-2 in band) and with less walking every class's reserves are at or above
the reference (mothers −0.001 → +0.026, infants 2–5 y +0.005 → +0.040 %/day). Nest-mates awake in the dark hold each
other until the light is up, so departures before sunrise fall (T-FOOD-10 0.79 → 0.59; truth 0.46 of adults) without
the daytime lock of iteration 1. Costs: the males' observed day range just below its band (T-RNG-4 1.49), male pant-hoots
at the band's floor (T-COM-1 0.50), few patrols (T-PAT-1 0.04). *A2r.* With re-decision the held jitter gives an act
some persistence (4.2 switches per animal-hour against A1r's 5.7; feeding runs 15.5, rest 16.5 min), rest is back at the
reference (179 min per 12-h day; T-ACT-4 0.348), every class's reserves are within 0.03% of the store a day of the
reference (juveniles −0.024, males −0.010), and held-out without the rare rows is better beyond noise (z −2.2; T-FOOD-10
0.52): the costs that made S20 fail do not appear in quick mode. But patrols and incursions rose (T-PAT-1 0.27, T-PAT-6
0.83), intergroup encounters tripled (T-IGE-1 34.5 per community-year: seeds 25.6 and 43.0; S19 11.9 ± 3.7, band 5–12),
hunting all but stopped (T-HUN-1 2.0, no capture), the fruit share left its band (0.82) and trees per day rose to 11.2:
fitted worse beyond noise (z +6.5).

**Against the predictions.** A2: prescriptions 45 held; viability held; non-top share ≤ 0.08 held (0.031), by value
0.10–0.25 held (0.193); switches 2.6–3.8 held (2.84); runs: feeding 15–22 missed (22.8), rest 25–36 held (33.5);
T-FOOD-10 ≤ 0.70 held (0.590); T-FOOD-5 0.30–0.50 held (0.398); T-ACT-1 0.33–0.40 held (0.378); T-ACT-4 up 0–0.08 held
(+0.054); T-FOOD-2 up 0–0.06 missed (+0.064); T-RNG-4 within ± 0.4 missed (−0.62); T-RNG-5 within ± 0.3 held (+0.13);
T-COM-1 lower held (0.50); eating 5–35 min lower held for males (−25), mothers (−22) and juveniles (−11), missed for other
females (−44); reserves within ± 0.05 held (all at or above the mean); fitted and held-out inside noise held (z −0.5,
−0.5, −0.3). A2r: prescriptions 43 held; viability held; non-top ≤ 0.08 held (0.030), by value held (0.221); switches
2.8–4.2 missed (4.23); runs: feeding 14–22 held (15.5), rest 15–28 held (16.5); T-FOOD-10 ≤ 0.70 held (0.519); T-FOOD-5
0.30–0.50 missed (0.296); T-ACT-1 held (0.383); T-ACT-4 within ± 0.05 held (+0.011); T-FOOD-2 up 0–0.08 missed (+0.117);
T-RNG-4 up 0–0.6 held (+0.16); T-RNG-5 held (+0.075); T-COM-1 lower held (0.661); eating 5–35 min lower held for males
(−21), mothers (−15) and juveniles (−8), missed for other females (−37); reserves within ± 0.05 held; fitted inside noise
missed (z +6.5); held-out inside noise held with the rare rows (z −0.9), missed without (z −2.2, better).

**Kill criterion.** A2: none of (a)–(e) (no death; the largest fall of a class against the S19q mean is other females
−0.007; held-out z −0.5 and −0.3; non-top share 0.031, `rgTemperature` unread; night 2.0%). A2r: none of (a)–(e) (no
death; largest fall juveniles −0.024; held-out z −0.9 and −2.2; non-top 0.030; night 1.7%).

**Verdict.** **A2 (`choiceBelief` 2) is a provisional keep candidate** for the integrator's 5-seed confirm (S19 +
`choiceBelief` 2): viable, held-out not worse (better by 0.2–0.8, inside noise), prescriptions 46 → 45 (`rgTemperature`
out), night safe. **A2r passes the keep rule and the registered "re-decision holds" test** (T-ACT-4 0.348; no class more
than 0.03% of the store a day below the reference), so on this switch re-decision no longer costs rest or reserves in
quick mode; but its fitted rows are worse beyond noise (intergroup encounters ×3 with more patrols and incursions,
hunting near zero), a cost of the size that held S16 back, to be understood before A2r joins a stack.

### 6.3 After iteration 2: why A2r meets neighbours three times as often, and no iteration 3 (recorded before any further run)

**Disclosed:** after the iteration-2 runs, the S19 choice readouts were re-run with the iteration-2 tool (frozen
checkout of 0ec4316, switch 0; session scratch `e3e/diag2/`): every readout of §2.1 is reproduced exactly (same draws,
runs and adult males' eating minutes and ground km), and the run adds the share of draws that are not the top by value
(S19 0.443 / 0.431 / 0.443 / 0.436), quoted in the tables above.

**Patrol diagnosis** (scripts/patrol-diagnose.ts, seed 48, 30 + 30 days, simulation truth, frozen checkout of 0ec4316;
a diagnosis, no arm): S19q 1.09 patrols and 0.62 encounters per community-week; median 164 min, 2.3 km; 0.49 of the community's males; contact 0.36; turned back 0.21; members leaving early 34; A2r 0.93 patrols and 1.56 encounters per community-week; median 204 min, 3.3 km; 0.69 of the community's males; contact 0.58; turned back 0.08; members leaving early 19. On this seed A2r starts about as many patrols as S19, but they
last longer, walk farther, hold more of the males, turn back less and meet neighbours more. A reading, not tested: members
stay because the keep test, holding only the jitter for options they know, keeps a patrol while it is still their best
option, where the gate's clock and the softmax let some leave (S19), and E3d's held Gumbel noise was larger.

**No iteration 3.** A2 meets the verdict rule. A2r's cost sits in the patrol valuation (E4i's lead and joining terms and
E4j's fusion, design magnitudes set while the choice was noisy), not in the choice rule this stage replaces; a change
there needs its own diagnosis and stage. The third iteration is not used.

Outputs (local, gitignored, copied from the session scratch `e3e/` to `artifacts/validation/e3e/`): `diag/` and `diag2/`
(the S19 choice diagnoses and S19rv2), `arms/` (the four arms' e-bench, energy, choice and rhythm JSON, the salted S19
runs, the judge outputs, the final table), `smoke/`, `patrol/`, `probe/` (the nest-occupancy probe), `tools/`
(`diag_table.py`, `e3e_judge.py`, `salt_check.py`, `final_table.py`).

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
  so near-ties are re-decided at every bout end and interrupt (smoke: 6.4 switches per animal-hour; A1r 5.7); no
  switching cost exists in the values for acts done in place. Iteration 2 holds the jitter instead (A2r 4.2).
- Corrected under `choiceBelief` 2 (registered before A2's run): the nest company of awake nest-mates counts in the dark
  light phases (night, dawn, dusk) and not in the day phase (src/sim/candidates.ts, the `asleepOnly` flag of
  `nestCompanyValue`); `choiceBelief` 1 keeps iteration 1's rule (asleep only) so its runs reproduce.
- Deferred: the candidate jitter now carries all the evaluation noise of options the animal knows under `choiceBelief`
  2; its span (`candidateJitterSpan` 0.24, design, assumed-x2) has never been derived or sourced, and it is a hash, not a
  draw from `world.rng` (src/sim/candidates.ts `offer`).

## 8. Stage verdict

- **Diagnosis (S19, quick, four realizations, simulation truth).** The softmax at `rgTemperature` takes an option other
  than the menu's top in 38% of draws (44% by value, the jitter included; the top's median probability is 0.58, not the
  0.77 it was set for). Half of those picks are between options the animal knows now, so the temperature, not the
  animal's knowledge, sets 22% of resting, 30% of grooming and 18% of feeding time and 70% of fallback picks; it gives an
  option in view about the same chance as a tree last seen days ago, though the error of a remembered crop grows with the hours
  since it was seen (0.003 crop units under an hour, 0.11 after a day).
- **Iteration 1, `choiceBelief` 1** (values compared exactly; only crops out of sight sampled; no temperature): null in
  both arms. Choice now follows knowledge (options known now taken when the top 99.7–99.9%), but the valuation without any
  noise drops acts at every re-decision (crown bouts 19 → 12 min; with `redecideValue` 2, 5.7 switches per animal-hour),
  goes to the nearest crown (T-FOOD-5 0.31 → 0.57) and eats less; held-out without the rare rows worse beyond noise (z
  +5.1, +4.0); juveniles' and, with re-decision, other females' reserves fall.
- **Iteration 2, `choiceBelief` 2** (the rules' own evaluation noise, the candidate jitter, kept; crops out of sight
  sampled; no temperature; nest-mates awake in the dark keep the company of the nest): **A2 a provisional keep
  candidate** (viable, every sum inside noise and lower: fitted z −0.5, held-out −0.5, without the rare rows −0.3;
  prescriptions 46 → 45; night 2.0%; every class's reserves at or above the reference; departures before sunrise 0.79 →
  0.59). Costs: less travel and walking (males' observed day range 1.49, just below its band), male pant-hoots at the
  band's floor (0.50), 11–44 min less eating at a higher fruit share. **A2r passes the keep rule and the registered
  re-decision test** (rest back at the reference, T-ACT-4 0.348; reserves within 0.03; held-out better beyond noise, z
  −2.2) **with a fitted cost beyond noise** (z +6.5): patrols last longer and hold more males, intergroup encounters
  triple (T-IGE-1 34.5), hunting nearly stops (T-HUN-1 2.0).
- **The re-draw lever.** `rngSalt` (design; a salt mixed into `world.rng` after the world is built) re-draws S19 as
  much as `rgTemperature`'s re-draws (SD ratio 1.4–1.8, inside 0.25–3.9); a stack with `choiceBelief` uses it.
- **What it means.** The counted temperature is not needed: with the rules' existing jitter as evaluation noise and the
  animal's uncertainty about crops out of sight, S19 is no worse and its animals are in better condition. But the noise
  was doing work the valuation cannot: with no evaluation noise at all, missing value terms show (a cost of switching an
  act in place, a crop's value beyond one bout, meal dynamics), and with re-decision the patrol valuation runs away.
- **Open.** The jitter's span (design, never derived) now carries the evaluation noise of options the animal knows; a
  sourced estimation error (for instance a Weber fraction for food quantity) or the missing value terms would replace it.
  Patrol persistence under re-decision (A2r) needs its own stage before `redecideValue` 2 joins a stack with this switch.
