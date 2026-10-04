# E4q pre-registration: aggression without cooldowns

Status: skeleton committed in the stage's first 15 minutes (4 October 2026, branch `e4q-aggression`, from `track-e`
aa698bd). The diagnosis readouts, field rows and their samples, mechanism, predictions and kill criterion are added and
committed before any run of a switch on. Track E, stage E4, piece q.

Rule served: field values of behaviour are targets, never inputs. No interval, value, bonus or weight is chosen to hit an
aggression or display rate.

## 0. The literals in question (S27, field profile; `src/sim/candidates.ts` at aa698bd)

Counted by E0b's ledger as quotas (rule L3: a time literal that bars an act for a fixed time after the animal's own last
act); S27 counts 51 prescriptions on the current ledger.

| Literal | Where | What it states | Moved S27 (E0b §6.3: 5 d; 20 d) |
| --- | --- | --- | --- |
| `time - x.lastAgg > 1.5` (`cooled`) | candidates.ts:946 | a ranked male's status challenge at his closest-rank rival, the E4a escalated attack, the grudge charge, the coercive charge at a swollen female and an adolescent male's charge at an adult female wait 1.5 h after his own last charge or attack | 0/2; 2/2 |
| `time - x.lastAgg > 0.2` | candidates.ts:1098 | a male's charge at strangers (with ≥ 3 own males, two more than theirs) waits 0.2 h after his own last aggression | 0/2; 0/2 |
| `time - x.lastDisplay > 0.75` (with energy > 0.3) | candidates.ts:775 | a male's display (status, reunion, rival) waits 0.75 h after his own last display | 2/2; · |

Out of scope: the mate guard's 0.25-h chase gap (execution.ts:807) belongs to stage E4p, running now.

## 1. Plan

1. Diagnosis (step 1, simulation truth, S27 quick: seeds 48 and 7, 30-day burn-in + 30 days): how often each literal
   binds (an offer withheld at a decision where it would otherwise have been chosen), challenges, charges and displays
   per male-hour, what is chosen instead, the arousal, stress and fast states and the assessed contest odds (E4h) at those
   moments; and, in scratch arms (diagnostic only, never a candidate), each behaviour's rate with the literal removed.
   Name what sets each rate, with numbers. (§2, written before its runs.)
2. Mechanism behind one new switch (0 = today), only for the literals the diagnosis implicates. (§4.)
3. At most three iterations, each logged here and committed before its run.

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**Tool.** `scripts/aggression-diagnose.ts` (readouts defined in its header), simulation truth. It reads every offer the
three literals gate as candidates.ts evaluates it through the existing read-only hook `quotaTrace` (E5e), extended with
eight kinds: the 1.5-h cooldown at the five offers it gates (`challenge` the status charge at the closest-rank rival in
charge range, `escalate` E4a's attack, `grudge`, `coerce`, `femaleDom`), the 0.2-h gap (`stranger`, and `gang` for the
gang attack inside the same branch) and the 0.75-h display gap (`display`). The literal lines keep their text (the
ledger's pieces still match). The hook draws nothing and writes nothing: S27 seed 48 after 2 days hashes
6005ce06d37e5df1 at aa698bd, at this commit with the hook null, and with a no-op hook installed (10,982 calls).
It also reads the contests (`contestTrace`) and the RG decisions (`rgTap`). Smoke test: S27, seed 48, 1 + 2 days (4 s).

**Definitions** (header of the tool, in short):
- *Opportunity*: a decision at which every other condition of the offer holds for that target and its score is above
  offer()'s floor (−0.4); *blocked*: the literal removed it.
- *Binds*: at a decision where the literal blocked an offered option, the rules chose among options (an RG draw or the
  argmax; not when the gate kept the current act) and the blocked option's score with its candidate jitter (and the
  continuation term, as offer() adds them; clamped 0–3) is above the chosen option's published score (the chosen
  option's belief offset under `choiceBelief` is unknown to the tool; the share of binding comparisons where the chosen
  option carried a belief part is reported).
- *At blocked and binding decisions*: hours since the gated event; competitive arousal, stress, fast arousal,
  affiliation, hunger, fatigue (1 − energy); the assessed odds against the target (`assessOdds`, E4h); whether the target
  was the last aggression's target; what was chosen instead (action:variant).
- *Acts*: a charge or attack starts when `lastAgg` is set, a display when `lastDisplay` is set (execution.ts onStart),
  with the variant and target of the RG decision that started it. Rates per male-hour: awake (not asleep in a finished
  nest), daylight ≥ 0.1; adult males ≥ 15 y, and males ≥ 12 y for the registered behaviours.

**Runs** (seeds 48 and 7; 30-day burn-in + 30 days; S27 = `bench-run3/artifacts/validation/e/s27q/S27q-params.json`),
from a frozen detached checkout of the commit that adds this text:
- **D0**: S27 and its three re-draws (`rngSalt` 1, 2, 3): the reference spread of every readout.
- **Scratch arms (diagnostic only, never a candidate)**, each from its own scratch copy of that checkout with one literal
  set to 0 (uncommitted; the JSON's params record S27): **D1** the 1.5-h cooldown; **D2** the 0.2-h gap at strangers;
  **D3** the 0.75-h display gap.

**Decision rule (registered).** A literal *binds* if, pooled over D0's four runs, its blocked offer would have outranked
the chosen option at ≥ 30 decisions. It *sets its behaviour's rate* if it binds and removing it (its scratch arm)
multiplies the behaviour's rate per male-hour (males ≥ 12 y) by ≥ 1.5 or ≤ 1/1.5, beyond 2 SD of D0's four runs; it
*trims* if it binds and the rate moves less than that; it is *inert* if it does not bind. Behaviours: the cooldown, the
five acts it gates (status charges, escalated attacks, grudge, coercive and female-dominance charges); the stranger gap,
charges at strangers and gang attacks; the display gap, status, reunion and rival displays. Fewer than 30 events of the
behaviour in both D0 (pooled) and its arm: "too few to name". Only literals that set a rate go to a mechanism (step 2);
a literal that trims or is inert is switched out under the stage's switch without replacement (as E5e's bit 8: its
removal is what the scratch arm measured), and the arm confirms it.

### 2.1 Diagnosis results (frozen checkout of fbfeb29, clean for D0; D1–D3 each one literal at 0; S27, seeds 48 and 7, 30 + 30 days; simulation truth)

Printed by `diag_summary.py` and `diag_table.py` (stage scratch `e4q/`) from the aggression-diagnose JSON; D0 = mean ± SD of
S27 and its three re-draws; each scratch arm as its value and its ratio to the D0 mean. D2's world is identical to D0's
(every readout equal to the first D0 run): the stranger literal never changed a decision.

```
| Literal (gate) | offered per run | blocked share | outranked the chosen option (binds), pooled | binds per male-hour | behaviour per male-hour, D0 mean ± SD | scratch arm | ratio | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cooldown 1.5 h (challenge, escalate, grudge, coerce, femaleDom) | 46220 | 0.260 | 123 | 0.0027 | 0.0043 ± 0.0007 (events pooled 198) | D1 0.0053 (events 59) | ×1.22 | trims |
| strangers 0.2 h (stranger, gang) | 2 | 0.000 | 0 | 0.0000 | 0.0000 ± 0.0000 (events pooled 0) | D2 0 (events 0) | ×nan | inert (does not bind) |
| display 0.75 h (display) | 90738 | 0.151 | 4219 | 0.0925 | 0.1813 ± 0.0116 (events pooled 8277) | D3 0.257 (events 2935) | ×1.42 | trims |

Per gate (pooled over D0): offered, blocked, compared, binds; mean score blocked / open; at binding: hours since, arousal, stress, fast, odds, same target
  challenge  offered  31349 blocked   4168 compared  3345 binds    19 | score blocked 0.037 open 0.003 | binding: since 0.17 h, arousal 0.144, stress 0.247, fast 0.300, odds 0.513, same target 0.68
  escalate   offered   8006 blocked   1467 compared  1213 binds     1 | score blocked 0.084 open 0.039 | binding: since 1.07 h, arousal 0.498, stress 0.148, fast 0.000, odds 0.698, same target 1.00
  grudge     offered  12460 blocked   5442 compared  3720 binds    15 | score blocked 0.148 open 0.120 | binding: since 0.36 h, arousal 0.261, stress 0.564, fast 0.323, odds 0.912, same target 0.00
  coerce     offered  83752 blocked  32542 compared 23988 binds    29 | score blocked 0.148 open 0.136 | binding: since 0.25 h, arousal 0.387, stress 0.505, fast 0.278, odds 0.819, same target 0.45
  femaleDom  offered  49314 blocked   4403 compared  2240 binds    59 | score blocked 0.220 open 0.197 | binding: since 0.37 h, arousal 0.000, stress 0.349, fast 0.133, odds 0.537, same target 0.64
  stranger   offered      5 blocked      0 compared     0 binds     0 | score blocked 0.000 open 0.843
  gang       offered      2 blocked      0 compared     0 binds     0 | score blocked 0.000 open 1.186
  display    offered 362954 blocked  54681 compared 39125 binds  4219 | score blocked 0.308 open 0.212 | binding: since 0.28 h, arousal 0.061, stress 0.120, fast 0.024, odds 0.484, same target 0.11
display chosen instead at binding decisions (D0 pooled): rest 1910, a trip to a tree 1007, feeding 527, grooming 177, reunion call 156, pant-grunt 125, …

readout (D0 mean ± SD [runs] | scratch arms)
gatedAggressionPerMale12H     0.0043 ± 0.0007  [0.0048 / 0.0035 / 0.0050 / 0.0041] | D1 0.0053 ×1.22 (z +1.4) | D2 0.0048 | D3 0.0039 ×0.90
challengesPerMale12H          0.0005 ± 0.0003  [0.0009 / 0.0003 / 0.0004 / 0.0004] | D1 0.0003 ×0.60 | D3 0.0004
gatedDisplaysPerMale12H       0.1813 ± 0.0116  [0.1983 / 0.1724 / 0.1781 / 0.1765] | D1 0.1807 ×1.00 | D3 0.2570 ×1.42 (z +6.5)
adult displaysPerH            0.2230 ± 0.0116  [0.2396 / 0.2129 / 0.2203 / 0.2190] | D1 0.2283 | D3 0.3108 ×1.39 (z +7.6)
adult statusChargesPerH       0.0006 ± 0.0003                                       | D1 0.0003 | D3 0.0004
adult communityChargesPerH    0.1283 ± 0.0209                                       | D1 0.0993 ×0.77 | D3 0.1102 ×0.86
adult contactGivenPerH        0.0050 ± 0.0004                                       | D1 0.0036 ×0.72 (z -3.6) | D3 0.0049
field displaysPerH all/R/NR   0.2438 ± 0.0121 / 0.1769 ± 0.0155 / 0.2556 ± 0.0114 | D1 0.2511 / 0.1948 / 0.2591 | D3 0.3577 / 0.2873 / 0.3733
field chasesAttacksPerH all/R/NR 0.0071 ± 0.0014 / 0.0268 ± 0.0017 / 0.0036 ± 0.0013 | D1 0.0055 / 0.0322 / 0.0017 | D3 0.0056 / 0.0258 / 0.0011
field maleMalePerDyadH        0.0974 ± 0.0156  [0.1071 / 0.0880 / 0.1138 / 0.0806] | D1 0.0760 | D3 0.0824
contests: decided 1425 ± 179 | D1 1308 | D3 1247; fights 1 ± 1 | D1 5 (z +3.9) | D3 2; wounds ≥ 0.05 per run 4 ± 1 | D1 10 (z +6.5) | D3 3
adult males' acts per run (D0 mean ± SD | D1 | D3): mate-guard charges 713.8 ± 96.2 | 540 | 687; coalition 229.8 ± 74.0 | 168 | 131; redirect
  180.0 ± 20.1 | 135 | 161; counter 59.8 ± 24.4; status 5.2 ± 2.6 | 3 | 4; grudge 4.8 ± 2.9 | 0 | 1; coercive 5.2 ± 3.1 | 9 | 4;
  displays (status, reunion, rival) 2,039 | 1,985 | 2,867; males 12–15 y: female-dominance charges 33.5 ± 4.8 | 47 | 36
intervals between a male's displays (h; <0.25, <0.5, <0.75, <1, <1.5, <3, ≥3): D0 [0, 1, 0, 283, 450, 525, 990] … D3 [482, 256, 265, 208, 309, 454, 980]
```

**Reading by the registered rule.** No literal sets its behaviour's rate:
- **The 1.5-h cooldown trims.** It blocks 26% of the offers it gates, but they would have been chosen at 123 decisions in
  four runs (0.0027 per male-hour; female-dominance charges 59, coercive 29, status challenges 19, grudges 15, escalated
  attacks 1). Removed (D1), the five acts rise ×1.22 (0.0043 → 0.0053 per male-hour, z +1.4). **What sets the challenge
  rate is the challenge's own score:** a status charge at the closest-rank rival scores 0.003 on average when open and is
  the best option at 0.6% of the decisions where the cooldown blocks it; adult males challenge 0.0006 times an hour
  (5 per run). Removing the cooldown has one cost beyond its rate: fights 1 ± 1 → 5 and wounds ≥ 0.05 4 ± 1 → 10 per run.
- **The 0.2-h gap at strangers is inert.** Its condition (at least three own adult males in view, two more than the
  strangers' males) held at 2 decisions per run, none within 0.2 h of the male's last aggression.
- **The 0.75-h display gap trims, by the registered threshold.** It binds often (4,219 decisions, 0.093 per male-hour;
  the display was then the best option over resting, 45%, a trip to a tree, 24%, feeding, 12%), and the displays pile up
  just after the gap lapses (199–283 per run 0.75–1 h after the last, none before); removed (D3), status, reunion and
  rival displays rise ×1.42 (0.181 → 0.257 per male-hour, z +6.5), just under the registered ×1.5. What sets most of the
  display rate is the display's own score against resting, travel and feeding.
- States at binding are low (display: competitive arousal 0.06, stress 0.12, fast arousal 0.02, 0.28 h after the last
  display); nothing in them carries what the gap does.

**Against the field (D0, adult males):** displays per hour in parties with ≥ 2 adult males 0.244 ± 0.012 (with a
maximally swollen parous female 0.177, without 0.256) against Kanyawara's 0.259 ± 0.075 and 0.212 ± 0.074 (the model's
direction is reversed); chases and attacks 0.0071 (0.027 and 0.0036) against 0.169 ± 0.039 and 0.066 ± 0.017 (10–20 times
fewer); male → male aggression per co-present dyad-hour 0.097 ± 0.016 against 0.015 ± 0.003 (6.5 times more; mate-guard
charges are 714 ± 96 of about 1,200 adult-male charges per run: stage E4p's literal, not this stage's); contact given
0.0050 ± 0.0004 per hour against 0.027. **The cooldowns do not set these rates.**

**Step 2 therefore** (the registered consequence): the three literals are switched out without replacement, one bit each
(§4); the arm confirms it. No mechanism is added for a rate the diagnosis did not tie to a literal.

## 3. Field rows and readouts

**Readouts with a field value (no row in data/targets.json; reported, not scored).** Kibale first, with the Methods
quoted from the saved texts (research.md "Addendum: E4h contests" cites all four; full texts read for this stage):
- **Charging displays and chases and attacks per male-hour, Kanyawara 1998** [mullerWrangham2004b] Table 1: 9 adult males
  ("adulthood after successfully dominating all females"; masses not reported) with ≥ 20 observation hours in each
  condition; mean ± SE across males: charging displays 0.212 ± 0.074 per hour without and 0.259 ± 0.075 with maximally
  tumescent parous females in the party; chases and attacks 0.066 ± 0.017 and 0.169 ± 0.039. Methods: "We used 40-min
  group focal follows to generate rates of aggression for individual chimpanzees. Such all-occurrence sampling (Altmann
  1974) was possible because the boisterous nature of chimpanzee agonism renders it highly conspicuous to observers";
  "Charging displays involved exaggerated locomotion, piloerection and branch shaking. Chases were recorded when an
  individual pursued a fleeing conspecific, who was generally screaming. All incidents of contact aggression were
  recorded as attacks"; "Individual rates of aggression ... were calculated by dividing the number of agonistic acts
  committed by each adult male by his total observation hours ... Observations from parties containing fewer than two
  adult males were excluded from rate calculations." The alpha displayed 4.5 × the male average.
  *Model readout*: an adult male's displays (every variant) per hour awake in daylight in a party (parties.ts) with ≥ 2
  awake adult males, split by a maximally swollen (≥ 0.9) parous female in the party (R) or not (NR); high-level: his
  charges at community members whose target fled (a chase) or that made contact, plus his attack acts; low-level:
  displays plus charges that were neither.
- **Male aggression received by males, per dyad-hour, Kanyawara 1998** [muller2007]: "a mean rate of 0.017 ± 0.004 (all
  are ± s.e.) times per hour" for females receiving "charges, chases or physical attacks from individual males",
  "indistinguishable from that of male aggression received by males (0.015 ± 0.003 times h−1 ... N2 = 11 adult males)";
  categories as above, charging displays "directed at" a specific individual. *Model readout*: adult males' charges,
  attacks and rival-aimed displays at adult males of their community, per ordered co-present (same party, awake,
  daylight) adult-male dyad-hour.
- **Contact aggression given per male-hour** [wranghamWilsonMuller2006]: Kanyawara 1998, "Data are presented for 11 adult
  males ... for whom at least 25 observation hours were recorded (male median: 145 h)"; "Rates ... are means of
  individual male rates"; "rates exclude observations made when individuals were traveling alone or solely with
  dependent offspring. All rates are for attacks given, not received": 2,670 per 100,000 h (0.027/h); Gombe 1970–78
  1,464–3,030. *Model readout*: hits and strikes landed and fights entered by adult males, per adult-male hour.
- **Context only** [mouginot2024]: Gombe, 14 males ≥ 12 y, 7,309 focal hours, dyadic aggression (charge, chase, contact)
  with the focal male as actor or recipient, median 0.085 per hour (0.039–0.13); acts between the same pair within 1 min
  count once.
- No sourced per-male-hour rate of charges at strangers was found; the intergroup rows (T-IGE-1..3) carry that context.

**Rows e-bench scores that this stage can move** (samples as recorded by the stage that last opened each source):
T-SOC-5 steepness (kaburuNewtonFisher2015: Sonso 8 and Mahale M 10 adult males; decided contact aggression, chases and
directed charging displays; masses not reported; e4h-prereg.md §3), T-SOC-9 reconciliation (Mahale M, both sexes, PC–MC;
e4h §3), T-SOC-10 third-party affiliation (Taï, 18 individuals of both sexes, all-occurrence; e4h §3), T-SOC-6
pant-grunts to the top 3 males (Gombe, 16 males, full-day focal follows; e5e §3), T-COM-1 male pant-hoot rate (Mahale M,
7 males, 175 h, focal-initiated bouts; displays end with a pant-hoot), T-ACT-1..4 (villioth2025, potts2011, amsler2010,
uwimbabazi2019; e5e §3), T-IGE-1..3 (Kanyawara party follows, wilson2012; 120 encounters). T-DEM-23 (aggression received
by immatures) is a sealed C8 proof row: e-bench does not compute it, and sealed means never computed
(early-life-prereg.md, the C8 ruling), so it is not computed here either; the brief's statement that it is scored does
not hold for e-bench.

## 4. Mechanism: switch `aggressionGaps` (registered after the diagnosis, before any code of it)

One switch, 0 = today, bit-identical; a sum of bits, one per literal, so that iterations can separate them:

| Bit | Literal switched out (not read) | Replaced by |
| --- | --- | --- |
| 1 | the 1.5-h cooldown after the animal's own last aggression (candidates.ts `cooled`) at the status challenge, E4a's escalated attack, the grudge, coercive and female-dominance charges | nothing new: each offer's own score and the target's answer (E4h) govern repetition (trims ×1.22, §2.1) |
| 2 | the 0.2-h gap after the animal's own last aggression at the charge at strangers (and the gang attack in the same branch) | nothing new (inert, §2.1) |
| 4 | the 0.75-h display gap after the animal's own last display | nothing new: the display's own score against the other options (trims ×1.42, §2.1); the fatigue gate (energy > 0.3) stays |

No magnitude, weight or time constant is added. Code: candidates.ts (`aggrBit`; the three gates read the bit before the
literal, so the literal is not evaluated with the bit set), data/params.json (`aggressionGaps`, design switch, 0–7),
scripts/lib/prescriptions.ts (TRACK_E_SWITCHES; three LITERAL_OFF entries, verified by a code read and
`param-reads.ts --literals`), tests/sim-track-e.test.ts (switch list), tests/sim-aggression-gaps.test.ts (0 by default in
both profiles; switch 0 leaves the world unchanged; each bit opens its offer within the gap; the count on S27 51 → 48). The
literal lines change text; the ledger test's pieces and the decision guide's `has` follow (the count at 0 is unchanged).

### 4.1 Arm A1, predictions and kill criterion

**A1** = S27 + `aggressionGaps` 7, quick (seeds 48, 7; 30 + 30 days), from a frozen detached checkout of the commit that
adds the code: `e-bench --quick` (`--workers` 1 above load 8, else 2), `energy-diagnose`, `aggression-diagnose`,
`rhythm-metrics` (night safety). Judged against the four S27q realizations (e-bench, energy; `judge_vs_reps.py quick
custom`, e-noise.md amendment 2, with and without T-HUN-4, T-BRD-1 and T-IGE-3) and the four D0 diagnoses (readouts).

| Quantity | S27q / D0 (mean ± SD) | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 51 | 48 | high |
| Viability; deaths from fights | pass; 0 | pass; 0 | moderate |
| Fitted, held-out, held-out without the rare rows | group mean | inside noise (\|z\| ≤ 2) | moderate |
| Status, reunion and rival displays per male(≥ 12 y)-hour | 0.181 ± 0.012 | 0.22–0.30 (D3 0.257) | moderate |
| Displays per adult-male hour in parties with ≥ 2 adult males | 0.244 ± 0.012 (field 0.21–0.26) | 0.30–0.42 (D3 0.358) | moderate |
| The five acts the cooldown gated, per male-hour | 0.0043 ± 0.0007 | 0.003–0.007 (D1 0.0053) | moderate |
| Charges at strangers per male-hour | 0 | 0 to a handful of events | high |
| Male → male aggression per co-present dyad-hour | 0.097 ± 0.016 (field 0.015) | 0.06–0.11 | moderate |
| Fights; wounds ≥ 0.05 per run (both seeds) | 1 ± 1; 4 ± 1 | up (D1 5; 10) | low |
| Reserves %/day, every class | S27q mean ± SD | within 0.03 of the mean | moderate |
| T-ACT-1..4, T-SOC-5, T-SOC-9, T-COM-1 | S27q spread | inside their bands as the group | moderate |
| Night safety (adults out of a nest; T-RHY-5) | — | ≤ 3.3%; ≤ 0.033 | high |

**Kill criterion (the switch stays off and the result is recorded as a null)**: (a) viability fails (a starvation death,
or a seed below 80% of its start); (b) a death from a within-community fight; (c) held-out worse beyond noise (z > +2)
with or without the rare rows; (d) wounds ≥ 0.05 above 0.05 per adult male-day (E4h's line); (e) any class's reserve slope
more than 0.05% of the store a day below the S27q mean; (f) night safety fails.

**Keep rule (standard):** viability passes; held-out not worse beyond noise with and without the rare rows; prescriptions
51 → 48. Then a provisional keep candidate for the integrator's 5-seed confirm.

## 5. Reference and judging

Reference: S27 quick (docs/staging/e-stack2-confirm.md, "S26 and S27 results"), run once plus three re-draws (`rngSalt`
1, 2, 3) at bench-run3 28d249e (simulation code identical to aa698bd for S27), each with energy-diagnose (seeds 48 and 7,
burn-in 30, days 30): `bench-run3/artifacts/validation/e/s27q/{S27q,S27q1,S27q2,S27q3}.json` and `…-energy.json`.
Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a result; sums with and
without T-HUN-4, T-BRD-1 and T-IGE-3 (amendment 3). Readouts against the reference's own spread (mean ± SD of its 4 runs).

## 6. Iteration log

(each entry written and committed before its run)
