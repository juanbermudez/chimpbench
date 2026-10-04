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

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**What the code does (read at b3d28c7, field profile, S17's 45 switches).** A rules-driven animal reaches a decision
point when its scheduled bout ends (`c.nextDecision` = `actEnd`, a hash draw between the act's `bout*Min` and
`bout*Max`: rest 8–20 min, feeding 20–45, grooming 5–18, travel 12–22; a trip to a remembered tree lasts its walk + 5
min under `travelCommit`), when an interrupt arrives, or in the tick its act finishes itself (`finish()`: arrived,
sated, crop gone, partner gone, drink done, a call or display given). There (src/sim/decide.ts, rg.ts), an animal of
`rgMinAge` (8 y) or more asks the intention gate (rg.ts `gate`, the Jev free arms' gate): it keeps its act and target
unless an interrupt came since the choice, a hunt or patrol impulse is new, a need changed bucket (hunger, thirst,
fatigue, loneliness at 0.4 / 0.55 / 0.7 / 0.88, design), the period changed (night, dawn, morning, midday 11:30–14:30,
afternoon, dusk: light phases plus two clock hours, src/decide/facts.ts:150), **the intention is older than
`rgMaxAgeH`** (rg.ts:142), the act ended or became illegal, or it is feeding at hunger ≥ 0.4 and a known crown offers
twice the rate (the patch test). Otherwise it draws from the bounded menu with a softmax at `rgTemperature` (0.164).
Younger animals take the argmax. Every candidate's score carries a hash jitter (± 0.12, `candidateJitterSpan`) and, on
the current act and target, **`continueBonus` +0.25 while its scheduled bout runs (in practice at interrupts) or
`finishedPenalty` −0.5 once it has finished itself** (candidates.ts:105). Grooming's own offer adds a literal **+0.35
while its bout runs and −0.25 after its scheduled end** on the current partner (candidates.ts:612–613; no registry entry,
not counted by the ledger). A kept act is restarted with a new bout (decision count +1, a new jitter) but the
intention's age runs from the draw that chose it, so an act chosen and never re-drawn is drawn again at the first bout
end after 30 min.

**Tool.** `scripts/redecide-diagnose.ts` (new; its header defines every readout): the taps rg.ts `rgTap` (RG decisions)
and a new read-only `rulesTap` in decide.ts (argmax decisions of animals under 8 y) read every rules decision; rg.ts
`gate` and candidates.ts `CODE` are now exported for it (no behaviour change: the exports and an unset tap). Readouts:
decision points per daylight animal-hour by verdict; draws by trigger (switch share, P(held act), held act raw top);
max-age draws (clock-caused act ends: draws the gate would otherwise have kept that switched; by held act; what changed
since the choice); the continuation terms by static counterfactual (P(continue) with and without each term, the menu
rebuilt with `rgMenu`, softmax at `rgTemperature`; the expected continuations caused or restarts prevented; top flips;
argmax flips for animals under 8 y); runs (act bouts) by activity and class with what ended them and the value
crossing (first decision point at which the run's act is no longer the raw top of the animal's own unjittered
valuation, without the continuation terms); acts (runs started) per daylight animal-hour by class. Identity: the menu
rebuilt from the published list must equal the menu drawn from and its softmax the probabilities; adult males' eating
minutes and ground km must equal energy-diagnose's for the same world.

**Smoke test (seed 48, 1 + 2 days, S17; done before this registration; disclosed):** identity exact (4,212 draws, 0 menu
mismatches, probability error 0). Seen (not representative, not used below): RG animals switch acts 3.3 times per
daylight hour; max-age draws 0.44 per animal-hour, 89% of them on acts the gate would otherwise have kept, the held act
the raw top in 24% (rest: 21%), switch share 78%; clock-caused act ends 9% of switches; the bonus at interrupts raises
P(continue) from 0.25 to 0.48 (continuations caused: 8% of switches); the finished penalty acts mostly on joined trips
that arrive without becoming feeding and are re-chosen (P 0.69 with it, 0.92 without: a futile loop); the grooming
literal 1% of switches. Rest runs: median 30.5 min against a value crossing of 16 min; 29% end by max-age.

**Runs.** redecide-diagnose on S17q's parameters and its three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405; seeds
48 and 7, burn-in 30, 30 days, `--workers` 2, 1 above load 8), from a frozen detached checkout of the commit that adds
this section. Identity: adult males' eating minutes and ground km equal `S17q-energy.json` (same world: 256.149 min,
2.207 km) and the re-draws' energy files.

**Reading rules (registered).**
- *D1, what each entry decides* (daylight, RG animals ≥ 8 y, per animal-hour and as a share of their act switches):
  `rgMaxAgeH` the clock-caused act ends; `continueBonus` the continuations it causes at draws (Σ P with − P without);
  `finishedPenalty` the restarts it prevents; the grooming literal both ways. An entry is **implicated** if what it
  decides is ≥ 5% of all act switches in each of the four realizations; below that it is reported as minor.
- *D2, bout lengths against the act's own value:* per activity (feeding, grooming, rest, travel) and class, the median
  run against the median value crossing (runs that started as the raw top), the share of such runs held past their
  crossing, and what ended the runs (by trigger). An entry **sets** an activity's bouts if ≥ 10% of its runs end by it
  (max-age) or the continuations it causes are ≥ 10% of that activity's runs.
- *D3, what changed when it re-decided* (max-age draws against interrupts and need-bucket draws): the share where
  "nothing changed" (header definition), the share where the raw top changed, the median change of the held act's raw
  value and of the best alternative. Max-age re-decides **without new information** if "nothing changed" ≥ 25% of its
  draws, and **on a change the gate does not detect** if the held act is no longer the raw top in ≥ 50%.
- Young animals (argmax, < 8 y) and night decisions are reported, not read.

**Expected (low confidence; written knowing the smoke test).** D1: `rgMaxAgeH` and `continueBonus` implicated (5–15% of
switches each); `finishedPenalty` minor (≤ 3%) but acting on a defect (joined trips re-chosen after they arrive); the
grooming literal minor. D2: rest and fallback feeding set by max-age (≥ 20% of their runs), crown feeding by its own
end (sated or crop gone) and interrupts; rest held about twice its value crossing. D3: max-age re-decides on value
changes the gate does not detect (held act not the raw top in ≥ 60%), rarely without new information (< 15%).

### 2.1 Diagnosis results (frozen checkout of bd85be7; seeds 48 and 7, 30 + 30 days; simulation truth)

Generated by `diag_table.py` (session scratch `e3d/tools/`) from the tool's JSON of the four S17 realizations (S17q and
the three `rgTemperature` re-draws, the integrator's parameters). **Identity:** for every realization the rebuilt menu
equals the menu drawn from (0 mismatches over 123,000–133,000 draws each), the softmax probabilities match exactly, and
adult males' eating minutes and ground km equal energy-diagnose's for the same world (S17q 256.149 min, 2.207 km;
S17q1 255.001, 2.360; S17q2 254.010, 2.257; S17q3 253.946, 2.355). No deaths in any run (49 living at both ends, both
seeds). **Disclosed:** after the S17q run had finished, two readouts were added to the tool for exploration (the kind of
the raw top when a run starts and at a max-age draw, and the gap to it) and run once on S17q, seed 48 (session scratch
`e3d/diag/explore-S17q-48.json`); they are quoted below as exploration, not as registered readouts.

**D1, what each entry decides (daylight, RG animals ≥ 8 y; per animal-hour, and share of act switches).**

| Quantity | S17q / S17q1 / S17q2 / S17q3 | mean ± SD |
| --- | --- | --- |
| act switches per animal-hour, per animal-hour | 3.428 / 3.237 / 3.482 / 3.482 | 3.407 ± 0.116 |
| `rgMaxAgeH`: clock-caused act ends, per animal-hour | 0.248 / 0.267 / 0.247 / 0.251 | 0.253 ± 0.009 |
| `rgMaxAgeH`: clock-caused act ends, share of switches | 0.072 / 0.082 / 0.071 / 0.072 | 0.074 ± 0.005 |
| `continueBonus`: continuations caused, per animal-hour | 0.288 / 0.257 / 0.293 / 0.293 | 0.283 ± 0.017 |
| `continueBonus`: continuations caused, share of switches | 0.084 / 0.079 / 0.084 / 0.084 | 0.083 ± 0.003 |
| `finishedPenalty`: restarts prevented, per animal-hour | 0.066 / 0.057 / 0.074 / 0.069 | 0.067 ± 0.007 |
| `finishedPenalty`: restarts prevented, share of switches | 0.019 / 0.018 / 0.021 / 0.020 | 0.019 ± 0.001 |
| grooming literal +0.35: continuations caused, per animal-hour | 0.041 / 0.039 / 0.041 / 0.040 | 0.040 ± 0.001 |
| grooming literal +0.35: continuations caused, share of switches | 0.012 / 0.012 / 0.012 / 0.012 | 0.012 ± 0.000 |
| grooming literal −0.25: ends caused, per animal-hour | 0.010 / 0.011 / 0.010 / 0.010 | 0.010 ± 0.000 |
| grooming literal −0.25: ends caused, share of switches | 0.003 / 0.003 / 0.003 / 0.003 | 0.003 ± 0.000 |

S17q: implicated (≥ 5% of switches): maxAgeClockEnds, continueBonusContinuations | minor: finishedPenaltyRestartsPrevented, groomLiteralContinuations, groomLiteralEndsCaused
S17q1: implicated (≥ 5% of switches): maxAgeClockEnds, continueBonusContinuations | minor: finishedPenaltyRestartsPrevented, groomLiteralContinuations, groomLiteralEndsCaused
S17q2: implicated (≥ 5% of switches): maxAgeClockEnds, continueBonusContinuations | minor: finishedPenaltyRestartsPrevented, groomLiteralContinuations, groomLiteralEndsCaused
S17q3: implicated (≥ 5% of switches): maxAgeClockEnds, continueBonusContinuations | minor: finishedPenaltyRestartsPrevented, groomLiteralContinuations, groomLiteralEndsCaused

**Draws by trigger (RG animals, daylight; per animal-hour; switch share; P(held act) in the draw; held act the raw top).**

| Trigger | per animal-hour | switch share | P(held) | held act raw top |
| --- | --- | --- | --- | --- |
| ended | 1.485 ± 0.076 | 0.953 ± 0.009 | 0.047 ± 0.009 | 0.001 ± 0.000 |
| hunt | 0.010 ± 0.001 | 0.758 ± 0.063 | 0.238 ± 0.056 | 0.213 ± 0.060 |
| interrupt | 1.530 ± 0.087 | 0.595 ± 0.003 | 0.406 ± 0.004 | 0.218 ± 0.006 |
| light | 0.164 ± 0.011 | 0.252 ± 0.019 | 0.747 ± 0.013 | 0.841 ± 0.013 |
| max-age | 0.377 ± 0.011 | 0.769 ± 0.009 | 0.230 ± 0.006 | 0.241 ± 0.008 |
| need-bucket | 0.760 ± 0.010 | 0.763 ± 0.004 | 0.236 ± 0.004 | 0.270 ± 0.005 |
| patch-poor | 0.000 ± 0.000 | 0.950 ± 0.100 | 0.051 ± 0.031 | 0.000 ± 0.000 |
| patrol | 0.018 ± 0.001 | 0.936 ± 0.014 | 0.063 ± 0.014 | 0.054 ± 0.014 |
| period | 0.182 ± 0.002 | 0.807 ± 0.008 | 0.194 ± 0.004 | 0.207 ± 0.006 |

**Max-age draws (RG animals, daylight).**

| Quantity | S17q / S17q1 / S17q2 / S17q3 | mean ± SD |
| --- | --- | --- |
| draws per animal-hour | 0.376 / 0.393 / 0.368 / 0.370 | 0.377 ± 0.011 |
| share the gate would otherwise have kept | 0.900 / 0.901 / 0.906 / 0.903 | 0.903 ± 0.003 |
| switch share | 0.759 / 0.778 / 0.763 / 0.775 | 0.769 ± 0.009 |
| P(held act) in the draw | 0.237 / 0.227 / 0.234 / 0.223 | 0.230 ± 0.006 |
| held act the raw top | 0.252 / 0.236 / 0.240 / 0.235 | 0.241 ± 0.008 |
| switch share when the held act was the raw top | 0.295 / 0.320 / 0.286 / 0.320 | 0.305 ± 0.017 |
| switch share when it was not | 0.915 / 0.920 / 0.914 / 0.915 | 0.916 ± 0.003 |
| clock-caused act ends per animal-hour | 0.248 / 0.267 / 0.247 / 0.251 | 0.253 ± 0.009 |
| held feeding: clock ends per animal-hour | 0.073 / 0.078 / 0.075 / 0.072 | 0.074 ± 0.003 |
| held feeding: held act the raw top | 0.010 / 0.009 / 0.020 / 0.013 | 0.013 ± 0.005 |
| held rest: clock ends per animal-hour | 0.127 / 0.138 / 0.129 / 0.132 | 0.132 ± 0.005 |
| held rest: held act the raw top | 0.213 / 0.185 / 0.176 / 0.186 | 0.190 ± 0.016 |
| held grooming: clock ends per animal-hour | 0.011 / 0.010 / 0.009 / 0.010 | 0.010 ± 0.001 |
| held grooming: held act the raw top | 0.102 / 0.092 / 0.116 / 0.088 | 0.100 ± 0.012 |
| held other: clock ends per animal-hour | 0.032 / 0.037 / 0.030 / 0.033 | 0.033 ± 0.003 |
| held other: held act the raw top | 0.379 / 0.395 / 0.412 / 0.392 | 0.394 ± 0.014 |

**What changed since the choice (D3), by trigger (RG animals, daylight; medians unless stated; mean ± SD of the four realizations).**

| Trigger | min since the choice | Δ hunger | Δ social need | m moved | companions changed (share) | Δ raw value, held act | Δ raw value, best alternative | raw top changed (share) | "nothing changed" (share) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| max-age | 35.188 ± 0.125 | 0.059 ± 0.002 | 0.007 ± 0.001 | 0.000 ± 0.000 | 0.178 ± 0.011 | -0.084 ± 0.004 | 0.051 ± 0.004 | 0.648 ± 0.010 | 0.038 ± 0.006 |
| interrupt | 6.688 ± 0.239 | 0.005 ± 0.000 | 0.001 ± 0.000 | 0.156 ± 0.147 | 0.324 ± 0.017 | -0.010 ± 0.000 | 0.056 ± 0.002 | 0.664 ± 0.005 | 0.088 ± 0.002 |
| need-bucket | 19.250 ± 0.354 | 0.034 ± 0.001 | 0.003 ± 0.000 | 1.127 ± 0.059 | 0.242 ± 0.012 | -0.079 ± 0.005 | 0.023 ± 0.001 | 0.649 ± 0.005 | 0.025 ± 0.001 |
| period | 20.438 ± 0.239 | 0.026 ± 0.001 | 0.004 ± 0.000 | 1.725 ± 0.050 | 0.229 ± 0.009 | -0.048 ± 0.003 | 0.060 ± 0.003 | 0.691 ± 0.005 | 0.043 ± 0.001 |
| ended | 1.000 ± 0.000 | 0.002 ± 0.000 | 0.000 ± 0.000 | 0.349 ± 0.036 | 0.182 ± 0.010 | -0.730 ± 0.123 | 0.001 ± 0.001 | 0.667 ± 0.003 | 0.000 ± 0.000 |

**Continuation terms by static counterfactual (RG draws, daylight; P(continue) with / without the term; top flips; mean ± SD).**

| Term | applies per animal-hour | P(continue) with | without | continuations caused per animal-hour | top flips | young (< 8 y, argmax): P with / without |
| --- | --- | --- | --- | --- | --- | --- |
| bonus | 1.310 ± 0.073 | 0.471 ± 0.004 | 0.256 ± 0.005 | 0.283 ± 0.017 | 0.299 ± 0.005 | 0.639 ± 0.007 / 0.421 ± 0.009 |
| penalty | 0.178 ± 0.028 | 0.439 ± 0.027 | 0.815 ± 0.006 | -0.067 ± 0.007 | 0.454 ± 0.027 | 0.212 ± 0.024 / 0.657 ± 0.024 |
| groom+ | 0.132 ± 0.005 | 0.751 ± 0.004 | 0.446 ± 0.003 | 0.040 ± 0.001 | 0.277 ± 0.003 | 0.922 ± 0.012 / 0.696 ± 0.052 |
| groom- | 0.054 ± 0.001 | 0.113 ± 0.006 | 0.304 ± 0.008 | -0.010 ± 0.000 | 0.320 ± 0.010 | 0.119 ± 0.008 / 0.474 ± 0.017 |

bonus by act kind (S17q): rest n 10807 P 0.369/0.158; feed: crown n 8774 P 0.379/0.124; feed: fallback n 4552 P 0.271/0.082; groom n 3738 P 0.769/0.555; travel: own trip n 2884 P 0.764/0.499; play n 2091 P 0.506/0.327
penalty by act kind (S17q): travel: joined trip n 3789 P 0.495/0.868; travel: own trip n 422 P 0.184/0.699; play n 177 P 0.115/0.52; pant-grunt n 175 P 0.091/0.494; groom n 89 P 0.172/0.679; charge n 81 P 0.037/0.392

**Runs (act bouts) by activity, all adult and juvenile classes (daylight starts; minutes; mean ± SD of the four realizations).**

| Activity | median | mean | p90 | started as raw top | value crossing (median) | held past crossing | ended by max-age | by interrupt | by need-bucket | by its own end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| feeding | 21.1 ± 0.6 | 23.4 ± 0.6 | 43.1 ± 0.5 | 0.277 | 20.3 ± 0.6 | 0.960 | 0.097 | 0.268 | 0.203 | 0.296 |
| grooming | 13.4 ± 0.1 | 15.4 ± 0.3 | 32.6 ± 0.5 | 0.463 | 11.3 ± 0.4 | 0.836 | 0.044 | 0.349 | 0.265 | 0.192 |
| rest | 28.2 ± 0.7 | 28.2 ± 0.4 | 47.8 ± 0.6 | 0.638 | 16.9 ± 0.2 | 0.856 | 0.240 | 0.408 | 0.195 | 0.025 |
| travel | 4.5 ± 0.4 | 6.2 ± 0.3 | 14.8 ± 0.7 | 0.497 | 4.8 ± 0.3 | 0.984 | 0.003 | 0.062 | 0.067 | 0.377 |

**Runs by activity and class (median minutes; mean ± SD).**

| Activity | adult male | female, lactating | female, other | juvenile 8–12 y | juvenile 5–8 y |
| --- | --- | --- | --- | --- | --- |
| feeding | 18.9 ± 0.8 | 23.5 ± 0.9 | 20.9 ± 0.8 | 22.6 ± 0.8 | 22.5 ± 1.8 |
| grooming | 13.8 ± 0.2 | 15.4 ± 0.6 | 12.8 ± 0.7 | 13.9 ± 0.6 | 10.1 ± 0.4 |
| rest | 26.9 ± 0.5 | 28.1 ± 1.5 | 31.6 ± 0.5 | 31.3 ± 0.8 | 14.0 ± 0.6 |
| travel | 4.4 ± 0.4 | 4.4 ± 0.4 | 4.7 ± 0.2 | 5.2 ± 0.4 | 4.1 ± 0.3 |

| Run kind | median | started as raw top | value crossing | held past crossing | max-age | interrupt | need-bucket | own end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| feed: crown | 19.3 | 0.296 | 19.8 | 0.957 | 0.064 | 0.233 | 0.212 | 0.353 |
| feed: fallback | 31.9 | 0.207 | 23.4 | 0.977 | 0.222 | 0.396 | 0.165 | 0.086 |
| rest | 28.2 | 0.638 | 16.9 | 0.856 | 0.240 | 0.408 | 0.195 | 0.025 |
| groom | 13.4 | 0.463 | 11.3 | 0.836 | 0.044 | 0.349 | 0.265 | 0.192 |
| travel: own trip | 3.1 | 0.293 | 3.1 | 0.964 | 0.002 | 0.047 | 0.059 | 0.425 |
| travel: joined trip | 4.8 | 0.779 | 4.6 | 0.992 | 0.001 | 0.071 | 0.060 | 0.195 |
| travel: to caller | 12.6 | 0.742 | 12.4 | 0.996 | 0.003 | 0.101 | 0.107 | 0.582 |
| play | 14.2 | 0.282 | 11.2 | 0.858 | 0.113 | 0.304 | 0.139 | 0.115 |

**Acts (runs started) per daylight animal-hour, by class.**

| adult male | female, lactating | female, other | adolescent 12–15 y | juvenile 8–12 y | juvenile 5–8 y | infant < 5 y |
| --- | --- | --- | --- | --- | --- | --- |
| 4.08 ± 0.12 | 3.43 ± 0.18 | 3.29 ± 0.11 | 4.23 ± 0.21 | 3.24 ± 0.08 | 4.54 ± 0.16 | 4.06 ± 0.12 |

**D2 for the bonus: continuations it causes per run of the act (RG draws: Σ(P with − P without) over the decisions where it applied ÷ runs of that kind; mean ± SD).**

| Run kind | continuations caused per run | max-age share of runs |
| --- | --- | --- |
| feed: crown | 0.105 ± 0.005 | 0.064 ± 0.004 |
| feed: fallback | 0.147 ± 0.007 | 0.222 ± 0.013 |
| rest | 0.154 ± 0.007 | 0.240 ± 0.011 |
| groom | 0.108 ± 0.003 | 0.044 ± 0.003 |
| travel: own trip | 0.043 ± 0.001 | 0.002 ± 0.001 |
| play | 0.074 ± 0.004 | 0.113 ± 0.018 |

**Exploration (S17q, seed 48; added after the registered runs):** a crown run that did not start as the raw top started
0.08 score units below it (median), mostly below an own trip (41%) or rest (18%): crowns are chosen near the top, by
the choice noise. At max-age draws on feeding the raw top was rest (45% of crowns, 63% of the fallback) or grooming
(16%), 0.19–0.26 above; on rest it was an own trip (44%) or a crown (22%), 0.29 above.

**Reading by the registered rules.**
- **D1:** `rgMaxAgeH` and `continueBonus` are **implicated** in all four realizations: the clock ends 0.253 ± 0.009 acts
  per animal-hour (7.4% of the 3.41 act switches per animal-hour) and the bonus causes 0.283 ± 0.017 continuations per
  animal-hour (8.3%). `finishedPenalty` is **minor** (it prevents 0.067 restarts per animal-hour, 1.9%), and so is the
  grooming literal (1.2% + 0.3%).
- **D2:** max-age **sets** rest (24% of rest runs end by it), fallback feeding (22%) and play (11%), not crown feeding
  (6%) or grooming (4%). The bonus **sets** rest (0.15 continuations per run), fallback feeding (0.15), grooming (0.11)
  and crown feeding (0.105, at the line). Rest runs last 28 min (median) while the act stops being the animal's best
  option after 17 min (median value crossing of runs that started as the best); crown runs 19 min against a crossing
  of 20.
- **D3:** max-age re-decides **on a change the gate does not detect**: the held act is no longer the raw top in 76% of
  its draws (feeding 99%, rest 81%, grooming 90%); its value fell by 0.08 and the best alternative's rose by 0.05
  (medians) over 35 min, mostly through hunger (+0.06). It re-decides **without new information** in 3.8% (< 25%).
- **What each entry sets, in numbers.** `rgMaxAgeH` sets how long an act outlives its own value: a resting or
  fallback-feeding animal that has become hungry, or a feeding one that is sated, is held by the gate (no need crossed
  a bucket, no period changed) until 30 min after its choice, then re-drawn (77% switch). `continueBonus` sets how
  often an interrupt ends an act: P(continue) 0.47 with it, 0.26 without (top flips in 30%), and in animals under 8 y
  0.64 against 0.42. `finishedPenalty` mostly stops joined trips that arrived without becoming feeding from being
  re-chosen at once (P 0.50 with it, 0.87 without; a futile loop of one-tick restarts, defect §7), and repeated
  play, pant-grunts, grooming and charges (P ≈ 0.1–0.2 with, 0.4–0.7 without).

**Against the expectations of §2.** D1 as expected (`rgMaxAgeH` 7.4% and `continueBonus` 8.3% inside 5–15%;
`finishedPenalty` 1.9% ≤ 3%, acting on the joined-trip loop; the grooming literal minor). D2 as expected (rest 24% and
fallback 22% by max-age; crowns by their own end, 35%, and interrupts, 23%); rest held 1.7 × its value crossing (28
against 17 min; expected about twice). D3 as expected (held act not the raw top in 76%, ≥ 60%; "nothing changed" 3.8%,
< 15%).

## 3. Field rows scored here: samples (written before any arm)

villioth2025 re-opened here (4 October, NCBI BioC PMC12701709); the others as recorded by the stages that read them in
full (E3c §3, E5c, E2b), not re-opened.

| Row | Source | Sample, method (quoted where it decides the readout) | Value, band |
| --- | --- | --- | --- |
| T-ACT-1, T-ACT-2, T-ACT-3 (fitted) | villioth2025 | Budongo Waibira, October 2016 – June 2017: "ten adult males and nine adult females ... Seven of the females were lactating, while two females were not lactating but travelled with a single juvenile offspring"; follows "4.1 ± 2.6 h; range: 1–12 h; median: 4 h; total: 491 h"; "the behavioural state of the focal individual was recorded continuously ... feeding (all behaviours related to food handling; the entire process of picking and ingesting food items), travelling (terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy), grooming (giving or receiving), resting (any period > 1 min in which the individual was sitting or lying and not engaging in another behaviour)"; mass not reported | feeding 0.36 M / 0.37 F (band 0.33–0.5); travel 0.21 / 0.20 (0.12–0.25); grooming 0.15 / 0.12 (0.08–0.18) |
| T-ACT-4 rest + groom (fitted) | potts2011, villioth2025 | Ngogo 2005–06 (1,059 h) and Kanyawara 2006 (961 h), continuous focal follows of adult males, cycling females and pregnant or lactating females, "each ideally one feeding bout and one travel bout"; resting includes grooming; monthly means; mass not reported | 0.340 (Ngogo), 0.448 (Kanyawara); Waibira ≈ 0.43 (derived); band 0.3–0.47 |
| T-RNG-4 male day range (fitted) | batesByrne2009 | Budongo Sonso 2002–03, 8 adult males, GPS every 5 min while travelling, full-day follows; mass not reported | 2.7 ± 1.5 km/day; band 1.5–3.5 |
| T-FOOD-2 fruit share (fitted) | watts2012a, emeryThompson2020 | Ngogo 1995–2010, 125 months, focal + 15-min scans; Kanyawara 1994–2018, 240,601 feeding scans; all age-sex classes; mass not reported | 72.1%, 64.0%; band 0.60–0.78 |
| T-FOOD-4 trees per day (held out, compromised) | janmaat2013b, normand2009 | Taï, 5 adult females with young, 275 full-day follows; two females over 28 days | 7.14; 14.0 and 18.1; band 4–15 |
| Bout lengths (no row; context only, never used to choose) | potts2011; batesByrne2009 | potts2011: patch residency per visit 27.0 min (Ngogo) and 46.2 min (Kanyawara), focal follows of one feeding bout each. batesByrne2009 (Sonso, 8 males, 7 females of whom 6 lactating or gestating): stops of 20 min or more, males 6.5 ± 1.8 a day lasting 60 ± 50 min, lactating females 4.5 ± 1.0 lasting 95 ± 83 min | reported beside the model's runs (feeding, rest), not judged |

**Readouts the predictions need** (each defined in its tool's header; every one smoke-tested on 2 days with the switch
on before any arm, §5.1): T-ACT-1..4, T-RNG-4, T-FOOD-2, T-FOOD-4 and the sums: e-bench's observer rows, through the
frozen observer (src/field/metrics.ts). Bout lengths by act and class, acts per animal-hour, draws by trigger, what the
entries decide: redecide-diagnose (§2). Reserves (% of the store a day, OLS slope, the integrator's judge convention),
eating minutes, ground km, fruit share of eating by class: energy-diagnose. Night (adults out of a nest, share of night
time; the E2f line 3.3%): rhythm-metrics, on a kept arm.

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **S17** (e-stack2-confirm.md "S17 results"; parameters `bench-run2/artifacts/validation/e/s17q/S17q-params.json`),
  run by the integrator in quick mode once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run2
  37f04e8 (simulation code identical to this branch's start for S17), each with energy-diagnose (seeds 48, 7; burn-in
  30, 30 days): `bench-run2/artifacts/validation/e/s17q/{S17q,S17q1,S17q2,S17q3}.json` and `…-energy.json`. Not re-run
  here. Spread on rows counted in all four (integrator): fitted 1.50 / 0.94 / 2.08 / 3.66, held-out 4.03 / 4.51 / 4.61
  / 3.90, held-out without T-HUN-4 and T-BRD-1 3.88 / 4.29 / 4.61 / 3.90.
- Each arm (S17 + this stage's switch, same quick settings) against the reference mean with the integrator's
  `judge_vs_reps.py quick custom` (REFS = the four JSON): z = (arm − mean) ÷ (SD × √(1 + 1/n)), the registered quick SD
  (fitted 0.69, held-out 1.26, without the rare rows 0.48) or the group's own spread if larger; |z| > 2 is a result; on
  rows scored in all runs, with and without T-HUN-4 and T-BRD-1, and without T-IGE-3 as well.
- Behaviour, energy and the redecide readouts against the reference's own spread (mean ± SD of its four runs). Viability
  must pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S17: 49).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

### 5.1 Iteration 1 (registered before its run): an act is kept while it is still the best by the valuation that chose it (`redecideValue` 1)

**Why (§2.1).** The clock (`rgMaxAgeH`) ends acts that have outlived their own value but whose change the gate does not
see: in 76% of its draws the held act is no longer the animal's best option (rest held 28 min against a value crossing
at 17; a sated animal still feeding; a hungry one still resting), and only 3.8% happen with nothing changed. The bonus
(`continueBonus`) sets how often an interrupt ends an act (P(continue) 0.47 against 0.26): it exists because an
interrupt forces a fresh draw, and a fresh draw re-samples the choice noise of every option whatever the interrupt
changed. Both stand in for the same missing rule: compare the act's own value now with the alternatives' values now.

**Principle.** The marginal value theorem (charnov1976, research.md; applied by E3c to where to eat): an animal leaves
what it is doing when continuing is worth less than the best alternative, the alternative's cost of switching (the
walk, the climb, the time to reach it) counted in its own value, as every option's score already counts it (forageRate's
net rate; the distance terms of social options). The rules' choice is noisy (a softmax at `rgTemperature`: a random
utility, each option valued with an error); the error is part of the valuation that made the choice, so it is held
until the values change, not re-sampled by a clock or by any event. The draw is therefore made as a Gumbel-max (argmax
of the score plus the temperature times a Gumbel draw: the same softmax, McFadden's random-utility form), and its noise
is kept in the intention. Re-decision follows from change: an act ends when another option, valued now with its own
noise, out-values it; nothing re-opens a decision on a timer.

**Change (switch `redecideValue`, 0 = today; src/sim/rg.ts `redecide`, `stillBest`, `argmaxKeep`; candidates.ts).**
- The draw: argmax over the menu of value + jitter + T × Gumbel (T = `rgTemperature`), one Gumbel draw per option from
  `world.rng`; the noise of each option (its jitter plus T × its Gumbel draw) is stored in the intention (plain data,
  `rgIntent.noise`, keyed `action:target`).
- At every later decision point of an ongoing act (a scheduled bout end or an interrupt; the candidates are recomputed
  from the animal's perception there, as today): every menu option and the current act are valued at their value now
  (every term, before the jitter: candidateMeta `raw`) plus their held noise; an option new since the draw gets its own
  (the jitter it is scored with now plus T × a fresh Gumbel draw, drawn for every new option in menu order). The act is
  kept if no option out-values it; otherwise a draw. The noise kept afterwards is that of the options in view now.
- No longer read or applied: the gate's need buckets, period, patch test and maximum age (`rgMaxAgeH`), the forced draw
  at an interrupt, the continuation bonus (`continueBonus`) and the grooming bout's own +0.35 / −0.25 literals
  (candidates.ts groom offer; not counted by the ledger; with the keep test now asked at every bout end, its −0.25 would
  otherwise end every grooming bout at its first scheduled end).
- Unchanged: a draw at another stage's salient event (a hunt impulse, E4i's patrol impulse, E2b's rising light in the
  nest), at an act that ended (the finished penalty is not implicated and stays, §2.1), the arrival of a trip at its tree
  (becomes feeding there, with the trip's noise), the menu, the temperature, the bout lengths (when the animal checks).
- Below `rgMinAge` (argmax): no bonus or grooming literals; an ongoing act is kept while it is the best by its values plus
  the jitter of the decision that chose it (`chimp.sim.jv`, the decision count then: the T → 0 limit of the keep test,
  no rng); otherwise the argmax decides.
- Prescriptions: `rgMaxAgeH` and `continueBonus` switched out (ACTIVE_WHEN; TRACK_E_SWITCHES `redecideValue`, E3d):
  49 → 47 on S17 (checked with `prescription-ledger --count`). No new magnitude: the temperature and the jitter are the
  existing choice noise; the bout lengths (design) set only when the animal checks.
- Tests (tests/sim-redecide.test.ts): 0 by default in both profiles; deterministic over a field day and JSON-lossless
  (the intentions' noise finite); `rgMaxAgeH` and `continueBonus` unread, `finishedPenalty` read; count −2; an ongoing
  act still the best by its valuation is kept and an out-valued one drawn again (the new intention holds one noise per
  menu option); an interrupt does not force a draw; below rgMinAge the argmax keeps an act exactly when it is the best
  by the jitter of its choice. Switch off: the field pin (tests/sim-track-e.test.ts) and the compressed goldens hold.

**Expected size of the held advantage (arithmetic, not a fit).** The winner of a Gumbel-max over n options holds a noise
of T × (E[max of n Gumbels] − E[a Gumbel]) ≈ T × ln n above a fresh option on average: 0.164 × ln 6 ≈ 0.29 score units for
a typical menu of six; the bonus it replaces was 0.25 at interrupts only. The held advantage acts at every check
(bout ends too) and shrinks with any loss of the act's own value.

**Smoke tests with the switch on (seed 48, 1 + 2 days; disclosed):** redecide-diagnose (every readout filled; draws by
'outvalued', 'ended', 'light', 'hunt', 'patrol' only), energy-diagnose and rhythm-metrics (filled); prescription count
47. Seen (not representative, not used below): act switches per animal-hour 2.81 (switch off, same smoke: 3.29); rest
runs median 19 min, mean 36 (off: 30.5, 29.5); adults out of a nest 4.8% of the night with 2.0% feeding (off: 2.7%,
0.3%) over two nights after a one-day burn-in.

**Arm A1** = S17 + `redecideValue` 1 (S17q's parameters), from a frozen detached checkout of the commit that adds this
section: energy-diagnose, redecide-diagnose, then `e-bench --quick` (seeds 48 and 7, burn-in 30, 30 days; `--workers`
2, 1 above load 8); rhythm-metrics (seeds 48 and 7, 30 + 30) if the arm is kept.

**Predictions (A1 against the S17q mean ± SD of its four realizations; low confidence unless stated).**

| Quantity | S17q (mean ± SD) | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 49 | 47 | high |
| Viability | pass | pass | moderate |
| Act switches per animal-hour (RG, daylight) | 3.41 ± 0.12 | 2.6–3.2 (fewer forced re-draws) | moderate |
| Acts (runs started) per animal-hour, adult classes | 3.3–4.1 | each lower | low |
| Rest runs, median / mean (min) | 28.2 / 28.2 | median 16–24; mean ≥ 28 (cut at the value crossing; no clock on a rest that stays best) | low |
| Crown feeding runs, median (min) | 19.3 | 16–24 | low |
| Fallback feeding runs, median (min) | 31.9 | lower (22% ended by the clock after the crossing) | low |
| Grooming runs, median (min) | 13.4 | 10–17 | low |
| T-ACT-1 feeding; T-ACT-2 travel; T-ACT-3 grooming; T-ACT-4 rest + groom | reference | each within ± 0.04 of the reference mean | low |
| T-FOOD-2; T-FOOD-4; T-RNG-4 | reference | within ± 0.05; ± 1.5; ± 0.4 | low |
| Reserves %/day, mothers / juveniles 5–12 y | reference | within ± 0.03 of the reference mean | low |
| Night: adults out of a nest (rhythm-metrics, if kept) | S17 confirm 2.57% | ≤ 3.3% | low (smoke 4.8%) |
| Fitted; held-out with and without T-HUN-4 and T-BRD-1 | reference mean | inside noise | low |

**Kill criterion (registered).** Null if (a) viability fails (a starvation death, or a seed below 80% of its start);
(b) any class's reserve slope is more than 0.05% of the store a day below the S17q mean; (c) held-out is worse beyond
noise (z > +2) with or without the rare rows; (d) the mechanism does not run (no 'outvalued' draws, or `rgMaxAgeH` or
`continueBonus` still read); (e) if kept by the rule below, night safety fails on rhythm-metrics (adults out of a nest
more than 3.3% of the night).

**Verdict rule (registered).** `redecideValue` removes two counted prescriptions, so the track's keep rule applies:
viability passes, held-out (with and without T-HUN-4 and T-BRD-1, reported without T-IGE-3) not worse beyond noise,
prescriptions 49 → 47, night safe. If none of (a)–(e) holds and the keep rule passes, it is a **provisional keep
candidate** for the integrator's 5-seed confirm; otherwise it is recorded and stays off. Bout lengths, activity rows,
travel and reserves are reported against the reference, never used to choose.

## 6. Results

## 7. Known defects in the code under test

- Deferred (written before A1's run), with the switch off and on: a joined trip that arrives at its goal tree without
  becoming feeding there (the gate's arrival needs the crown in the animal's view and a legal feeding option; rg.ts
  `gate`/`redecide` arrival branch) is still offered (candidates.ts, the joined trip: travel V.TREE with a leader) and
  is re-chosen at once in 50% of such decisions (87% without the finished penalty, §2.1): a loop of one-tick restarts
  while the animal stands at the tree. Time lost is negligible (≈ 0.2 restarts per animal-hour × 15 s); it inflates
  decision counts. Not this stage's question (the penalty is not implicated); a fix would stop offering a trip to a
  tree the animal stands at.
- Deferred: the period trigger's 11:30 and 14:30 (src/decide/facts.ts:150, periodOf) are clock hours outside src/sim,
  so the ledger's lint does not see them; with `redecideValue` 1 they are not read by rules-driven animals.

## 8. Stage verdict
