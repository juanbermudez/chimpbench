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

## 4. Mechanism

(after the diagnosis)

## 5. Reference and judging

Reference: S27 quick (docs/staging/e-stack2-confirm.md, "S26 and S27 results"), run once plus three re-draws (`rngSalt`
1, 2, 3) at bench-run3 28d249e (simulation code identical to aa698bd for S27), each with energy-diagnose (seeds 48 and 7,
burn-in 30, days 30): `bench-run3/artifacts/validation/e/s27q/{S27q,S27q1,S27q2,S27q3}.json` and `…-energy.json`.
Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a result; sums with and
without T-HUN-4, T-BRD-1 and T-IGE-3 (amendment 3). Readouts against the reference's own spread (mean ± SD of its 4 runs).

## 6. Iteration log

(each entry written and committed before its run)
