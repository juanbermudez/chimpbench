# E5g pre-registration: calls and alarms without gaps

Status: complete (4 October 2026). `callGaps` 7 is a provisional keep candidate (S31 48 → 45; §7.2): the reunion gap
trims and the alarm penalty is inert (both out, nothing in their place); the 60-s alarm cadence set the hoo rate and is
replaced by a hoo while an own-community animal in sight has not learnt of the snake (§2.1, §4). Skeleton committed in
the stage's first 15 minutes (branch `e5g-call-gaps`, from `track-e` 90aa294, 4a8a2d3); the diagnosis (8571531), its
results and the mechanism with A1's predictions and kill criterion (a4c149c), and A1's registration (ee283f2) were each
committed before the runs they govern. Track E, stage E5, piece g.

Rule served: field values of behaviour are targets, never inputs. No interval, value, bonus or weight is chosen to hit a
call or alarm rate.

## 0. The literals in question (S31, field profile; file:line at 90aa294)

Counted by E0b's ledger (S31 counts 48 prescriptions on the current ledger; `prescription-ledger.ts --count`).

| Literal | Where | Kind (E0b) | What it states |
| --- | --- | --- | --- |
| `const callReady = time - x.lastCall > 0.5` | candidates.ts:1361 | interval, quota (L3) | an offer waits 0.5 h after the caller's own last call of any kind (pant-hoot or alarm); with `callValue` 1 it gates only the male's reunion pant-hoot (`V.REUNION`, candidates.ts:1368): the food-call variant (1366) is `!cv` and the contact, chorus and food-call variants are replaced by `pantHootValue` |
| `- (time - x.lastCall < 0.03 ? 0.4 : 0)` | candidates.ts:821 | bonus, judgement (B1, `finishedPenalty`'s) | a snake alarm is worth 0.4 less within 1.8 min of the animal's own last call (the alarm included) |
| `c.actionTime % 60 === 0 && c.actionTime > 0` | execution.ts:867 | interval, judgement (L3, `patrolStopEveryMin`'s) | an alarming animal hoos every 60 s of its alarm bout (1–2 min, `boutAlarmMin`/`Max`), and listeners within `hearAlarmHooM` of a caller within `alarmSnakeLinkM` of the snake become aware of it |

Snakes appear only in experiments (`applyIntervention` 'snake-model'); the field observer runs snake trials on cloned
worlds (src/field/experiments.ts; T-COM-11), so the two snake literals can move T-COM-11 and nothing else the observer
scores in the observed world.

## 1. Plan

1. Diagnosis (§2, written before its runs).
2. Mechanism behind one new switch (0 = today; one bit per literal), only for literals the diagnosis implicates (§4).
3. At most three iterations, each logged here and committed before its run (§6).

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**What the code does on S31 (code read, 90aa294).**
- `callReady` gates one offer with `callValue` 1: the male reunion pant-hoot (`V.REUNION`, score 0.3 + 0.1 × boldness −
  hush, design), offered when the decision's perception finds newcomers (a community member of 10 y or more not seen for
  more than `reunionH`, perception.ts). The food-call, chorus and timer contact variants read `!cv`. Every 'call' variant
  shares one candidate slot (target −1), so an open reunion offer replaces the valued pant-hoot (`pantHootValue`,
  `V.CONTACT`) only when it scores higher. `x.lastCall` is set by a 'call' act's start, an alarm act's start and the
  arrival pant-hoot at a crown (execution.ts); the display's closing pant-hoot and the status charge's do not set it.
- The alarm penalty reads the same `x.lastCall`. An alarm act sets it at its start (onStart) only: an alarm re-chosen at a
  later decision is the same act (`startAction` runs no onStart for the same action and target), so it neither hoos at
  the start nor moves the stamp, and its `actionTime` keeps counting. The penalty therefore applies within 1.8 min of an
  act's start, or of the animal's last pant-hoot.
- The cadence hoos at `actionTime` 60, 120, … s of an alarm act for as long as the act is re-chosen. In a 2-day smoke
  test of the tool (S31, seed 48, 30 trials) one act ran 30 min (21 decisions) and gave 31 hoos.

**Tool.** `scripts/call-gaps-diagnose.ts` (definitions in its header), simulation truth. It reads the reunion and alarm
offers as candidates.ts evaluates them through the read-only hook `quotaTrace`, extended with two kinds: 'reunion' (`a`
the hours since the caller's own last call, `b` the score without the jitter; `blocked` = the gap removed it) and 'alarm'
(`a` the hours since its own last call, `b` the score before the penalty). The counted literal lines keep their text
(the ledger's pieces still match; S31 48, today's model 147). The hook draws nothing and writes nothing: S31 seed 48
after 1 + 2 days with a snake model at 10:00 of day 2 hashes be61f1627f767373 at 90aa294, at this commit with the hook
null, and with a no-op hook installed (24,284 trace calls). It reads the rules decisions (`rulesTap`, `rgTap`) and the
world after each tick, and runs snake trials on deep copies of the world (the field observer's method,
src/field/experiments.ts), so the observed world is untouched.

**Definitions** (header of the tool, in short):
- *Opportunity*: a rules decision (candidates computed and decided at the same decision version) at which every other
  condition of the offer holds. Reunion: a male of 12 y or more (not a silent patrol member) with newcomers in view;
  *blocked* = the gap removed it. Alarm: an aware animal of 5 y or more within `snakeAlarmRangeM` of an active snake
  model; *penalized* = its own last call within 0.03 h.
- *Binds*: at such a decision the rules chose among options (an RG draw or the argmax; not when the gate kept the current
  act or a trip arrived), and the offer's score without the gap or penalty (with its candidate jitter and continuation
  term, as offer() adds them; clamped 0–3) is above the chosen option's published score, the chosen option being another
  act (a reunion bind against a chosen 'call' only changes the variant: counted apart). The chosen option's belief offset
  (`choiceBelief`) is unknown to the tool; binds against an option with a belief part are counted.
- *Cadence*: a hoo is a start hoo when the caller's `lastCall` is the current time (its alarm act's onStart ran this
  tick), else a cadence hoo. *Emitted because of the cadence* = the cadence hoos; *informative* = cadence hoos that made
  an own-community animal aware that no start hoo reached in the same tick (a hoo informs listeners within
  `hearAlarmHooM` of a caller within `alarmSnakeLinkM` of the snake, perception.ts `hear`; a newly aware animal is
  credited to a start hoo that reached it that tick, else to a cadence hoo, else to sight).
- *Audience*: at a reunion opportunity, newcomers and own-community animals in view, the unlocated share of the
  caller's ally bond weight (calls.ts `unlocatedShare`), the valued pant-hoot's net value (`pantHootValue`) and the
  community members likely within earshot (`listenersInEarshot`). At an alarm opportunity, at each hoo and at each act's
  start: own-community animals (1 y or more) unaware of the snake in view (the alarm score's input) and within
  `hearAlarmHooM` (whom a hoo would inform).
- *Calls per caller-hour* (observed world): calls by kind and pant-hoots by source (the act that produced them, as
  scripts/calls-diagnose.ts classifies them), per awake daylight hour (not asleep in a finished nest, daylight > 0.3) of
  adult males (15 y or more), males of 12 y or more, adult females and adolescents. Reunion pant-hoots: 'call' acts
  started with `V.REUNION`. Reunion decisions: decisions of males of 12 y or more with newcomers in view, and the share at
  which a pant-hoot (any 'call' variant) was chosen.
- *Snake trials* (cloned worlds): at 08, 10, 12, 14 and 16 h of every scored day, for each community, a party drawn with a
  trial RNG of the seed (the observer's draw), a snake model placed with the party centre as the focus (4 m from it), the
  copy run 30 min. *Encounters* and *callers* exactly as T-COM-11 counts them (community members within 12 m of the model
  at the minute samples; callers = those of them that gave an alarm-hoo); T-COM-11's statistic = callers ÷ encounters,
  pooled and at 10 h only (the observer's hour). *Exposure-hours*: own-community animals of 5 y or more, aware of the
  model and within `snakeAlarmRangeM` of it while it is active (the hours an alarm could be offered). *Alarm acts*: acts
  started (onStart); hoos per exposure-hour, by start and cadence; act duration, hoos and decisions per act; the stopping
  rule at each act's end (every own-community animal the caller sees safe: aware of the model, > 10 m from it, or up a
  tree, y ≥ 2 m; schel2013's definition, §3) against the share of the exposed animals' ticks outside an act with all safe
  (chance).

**Runs** (seeds 48 and 7; 30-day burn-in + 30 days; S31 = `bench-run/artifacts/validation/e/s31q/S31q-params.json`),
from a frozen detached checkout of the commit that adds this text:
- **D0**: S31 and its three re-draws (`rngSalt` 1, 2, 3): the reference spread of every readout.
- **Scratch arms** (diagnostic only, never a candidate), each from its own scratch copy of that checkout with one literal
  changed (uncommitted; the JSON's params record S31): **D1** `callReady`'s 0.5 → 0; **D2** the penalty 0.4 → 0; **D3** the
  cadence removed (`c.actionTime % 60 === 0 && c.actionTime > 0` → `false`: one hoo per alarm act, at its start).
- D2 and D3 change nothing outside the trials, so their observed worlds must equal D0's first run exactly (an identity
  check on every observed-world readout) and their trials start from the same states: they are compared trial by trial.

**Decision rule (registered).** A literal *binds* if, pooled over D0's four runs, it withheld or emitted a call at ≥ 30
decisions or events: the reunion gap and the penalty by the binding test above; the cadence by its hoos. It *sets its
behaviour's rate* if it binds and removing it (its scratch arm) multiplies the behaviour's rate by ≥ 1.5 or ≤ 1/1.5,
beyond 2 SD of D0's four runs; it *trims* if it binds and the rate moves less than that; it is *inert* if it does not bind.
Behaviours: the reunion gap, reunion pant-hoots per male(≥ 12 y)-hour (all pant-hoots per adult-male hour, T-COM-1 in
truth, beside it); the penalty and the cadence, alarm-hoos per exposure-hour (alarm acts per exposure-hour and T-COM-11's
statistic beside it). Fewer than 30 events of the behaviour in both D0 (pooled) and its arm: "too few to name". Only
literals that set a rate go to a mechanism (step 2, §4); a literal that trims or is inert is switched out under the stage's
switch without replacement (as E4q's `aggressionGaps`), and the arm confirms it.

**Rows each literal can move.** The reunion gap acts in the observed world: the call rows (T-COM-1, -2, -4, -9) and,
through what listeners do with a pant-hoot, party size and contacts (T-PTY-1, T-IGE-1, -2). The two snake literals act
only in the trials, which run on copies: they can move T-COM-11 and no other scored row.

### 2.1 Diagnosis results (frozen checkout of 8571531, clean, for D0; D1–D3 each one literal changed; S31, seeds 48 and 7, 30 + 30 days; trials at 08–16 h, 900 per run; simulation truth)

Printed by `diag_table.py` (stage scratch `e5g/`, copied to `artifacts/validation/e5g/`) from the call-gaps-diagnose
JSON; D0 = mean ± SD of S31 and its three re-draws; each scratch arm as its value, its ratio to the D0 mean and z. D2's
and D3's observed worlds are identical to D0's first run (every observed-world readout equal), and their 900 trials are
paired with D0's (callers or encounters differ in 1 and 12 of them).

```
## Binding (pooled over D0)
reunion gap: decisions 36973, offered 36973, blocked 6589 (share 0.178), compared 5550, held 1039, binds 167 (belief-chosen 51), variant-only 5; open offers chosen as a reunion call 797 of 30384
  chosen instead at binding: {'rest:NONE': 72, 'travel:TREE': 51, 'display:REUNION': 15, 'forage:NONE': 9, 'pant-grunt:NONE': 6, 'groom:NONE': 3, 'patrol:LEAD': 3, 'play:NONE': 1}
  blocked: hours since the own last call, bins [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 2] [521, 693, 1404, 1575, 1393, 959, 44, 0, 0, 0]
alarm penalty: opportunities 18540, penalized 542, compared 182, held 359, binds 19; alarm chosen 4704 (penalized and still chosen 355)
  chosen instead at binding: {'rest:NONE': 8, 'travel:TREE': 6, 'forage:NONE': 4, 'groom:NONE': 1}
cadence: start hoos 519, cadence hoos 7057 (share 0.931), informative cadence hoos 81; informed by start hoos 2113, by cadence hoos 136, by sight 582
  own-community animals within earshot and unaware per hoo: start 3.603, cadence 0.021
alarm acts 519, continuation decisions 4185; mean act length (min) by run [12.277, 13.178, 13.954, 15.784]; hoos per act [13.022, 13.912, 14.706, 16.596]
  stopping rule (all safe at an act's end vs chance): [(1, 0.993, 75), (1, 0.996, 64), (1, 0.993, 59), (1, 0.997, 61)]
  unaware in view / within earshot at an act's start: [(2.978, 4.159), (2.921, 3.912), (2.325, 2.976), (2.411, 3.369)]
  alarm chosen share by unaware in view (0..5+): ['4206/16897', '149/1005', '141/313', '68/133', '70/99', '71/93']

| Readout | D0 runs | D0 mean ± SD | arms |
| --- | --- | --- | --- |
| reunion pant-hoots per male(≥ 12 y)-hour | 0.0186 / 0.0169 / 0.0177 / 0.0171 | 0.0176 ± 0.0008 | D1 0.0186 (×1.06, z +1.2) | D2 0.0186 (×1.06, z +1.2) | D3 0.0186 (×1.06, z +1.2) |
| pant-hoots per adult-male hour (T-COM-1 truth) | 0.5086 / 0.4696 / 0.5161 / 0.4997 | 0.4985 ± 0.0204 | D1 0.4879 (×0.98, z -0.5) | D2 0.5086 (×1.02, z +0.4) | D3 0.5086 (×1.02, z +0.4) |
| share of male reunion decisions with a pant-hoot | 0.022 / 0.023 / 0.029 / 0.027 | 0.025 ± 0.003 | D1 0.028 (×1.11, z +0.7) | D2 0.022 (×0.87, z -0.9) | D3 0.022 (×0.87, z -0.9) |
| adult males: pant-hoot source call/CONTACT per hour | 0.0693 / 0.0740 / 0.0906 / 0.0855 | 0.0799 ± 0.0099 | D1 0.0743 (×0.93, z -0.5) | D2 0.0693 (×0.87, z -1.0) | D3 0.0693 (×0.87, z -1.0) |
| adult males: pant-hoot source call/REUNION per hour | 0.0209 / 0.0188 / 0.0186 / 0.0181 | 0.0191 ± 0.0012 | D1 0.0202 (×1.06, z +0.8) | D2 0.0209 (×1.09, z +1.3) | D3 0.0209 (×1.09, z +1.3) |
| adult males: pant-hoot source arrival in a crown per hour | 0.2314 / 0.1900 / 0.2129 / 0.1972 | 0.2079 ± 0.0184 | D1 0.2073 (×1.00, z -0.0) | D2 0.2314 (×1.11, z +1.1) | D3 0.2314 (×1.11, z +1.1) |
| adult males: food-grunt per hour | 0.5111 / 0.4889 / 0.4618 / 0.5053 | 0.4918 ± 0.0221 | D1 0.4684 (×0.95, z -0.9) | D2 0.5111 (×1.04, z +0.8) | D3 0.5111 (×1.04, z +0.8) |
| alarm-hoos per exposure-hour | 4.6511 / 4.2322 / 4.9177 / 5.6086 | 4.8524 ± 0.5777 | D1 4.6112 (×0.95, z -0.4) | D2 4.7595 (×0.98, z -0.1) | D3 0.3662 (×0.08, z -6.9) |
|   start hoos per exposure-hour | 0.3572 / 0.3042 / 0.3344 / 0.3380 | 0.3335 ± 0.0219 | D1 0.3520 (×1.06, z +0.8) | D2 0.3623 (×1.09, z +1.2) | D3 0.3662 (×1.10, z +1.3) |
|   cadence hoos per exposure-hour | 4.2939 / 3.9280 / 4.5833 / 5.2706 | 4.5190 ± 0.5683 | D1 4.2593 (×0.94, z -0.4) | D2 4.3971 (×0.97, z -0.2) | D3 0.0000 (×0.00, z -7.1) |
| alarm acts per exposure-hour | 0.3572 / 0.3042 / 0.3344 / 0.3380 | 0.3335 ± 0.0219 | D1 0.3520 (×1.06, z +0.8) | D2 0.3623 (×1.09, z +1.2) | D3 0.3662 (×1.10, z +1.3) |
| T-COM-11 statistic, all trial hours | 0.089 / 0.080 / 0.087 / 0.097 | 0.088 ± 0.007 | D1 0.095 (×1.07, z +0.8) | D2 0.090 (×1.01, z +0.2) | D3 0.091 (×1.03, z +0.3) |
| T-COM-11 statistic, 10 h trials | 0.116 / 0.069 / 0.122 / 0.089 | 0.099 ± 0.025 | D1 0.106 (×1.07, z +0.3) | D2 0.116 (×1.17, z +0.6) | D3 0.121 (×1.22, z +0.8) |
| alarm act length, min | 12.28 / 13.18 / 13.95 / 15.78 | 13.80 ± 1.49 | D1 12.32 (×0.89, z -0.9) | D2 12.38 (×0.90, z -0.8) | D3 12.08 (×0.88, z -1.0) |
| hoos per alarm act | 13.02 / 13.91 / 14.71 / 16.60 | 14.56 ± 1.52 | D1 13.10 (×0.90, z -0.9) | D2 13.14 (×0.90, z -0.8) | D3 1.00 (×0.07, z -8.0) |
```

**Reading by the registered rule.**
- **The reunion gap trims.** With `callValue` it gates one offer, the male reunion pant-hoot, at 6,589 of 36,973 reunion
  decisions (17.8%, 0.05–0.5 h after the male's own last call); the blocked offer would have won 167 of them (51 against a
  trip with a belief part). Removed (D1), reunion pant-hoots rise ×1.06 (0.0176 → 0.0186 per male-hour, z +1.2) and all
  adult-male pant-hoots do not move (×0.98). **What sets the rate is the offer's own score** (0.3 + 0.1 × boldness, design,
  reading nothing of the audience) against resting, trips and the reunion display: open, it is chosen at 2.6% of reunion
  decisions (797 of 30,384). At blocked decisions the audience is in reach (1.5 newcomers and 5.3 community members in view,
  10 likely within earshot; 58% of the caller's ally bond weight unlocated; the valued pant-hoot positive in 40% of them).
- **The alarm penalty is inert.** It applies at 542 of 18,540 alarm opportunities (2.9%) and would have changed 19
  decisions in four runs (< 30). It cannot do more: an alarm act sets the stamp only at its start (a re-chosen alarm
  continues the same act), so the penalty reaches only the first 1.8 min of an act or a fresh act after a pant-hoot, and
  355 of the 542 penalized opportunities ended with the act kept by the gate anyway. Removed (D2), nothing moves (alarm-hoos
  ×0.98, T-COM-11 0.090 against 0.088 ± 0.007).
- **The cadence sets the hoo rate.** It emits 93.1% of alarm-hoos (7,057 of 7,576); 81 of them (1.1%) informed an own-
  community animal that no start hoo reached; a cadence hoo finds 0.021 unaware community members within earshot against
  3.6 for a start hoo; hoos informed 2,249 animals, 136 of them (6%) through the cadence (582 learnt by sight). An alarm act
  lasts 13.8 ± 1.5 min (9 decisions re-choosing it) and gives 14.6 ± 1.5 hoos. Removed (D3: one hoo per act, at its start),
  alarm-hoos per exposure-hour fall ×0.08 (4.85 → 0.37, z −6.9), and T-COM-11's statistic does not move (0.091). So the
  cadence, a fixed interval, sets how often an alarming chimpanzee calls, and nearly every hoo it adds goes to an audience
  that already knows (field: callers stop when all recipients are safe, schel2013b; calling tracks receivers' ignorance,
  crockford2012).
- **What sets T-COM-11** (0.088 in truth at all trial hours, 0.099 at 10 h; band 0.25–0.55; S31q scored 0.00 on 5
  encounters) is none of the three: it is the alarm's own value against the alternatives (chosen at 25% of opportunities
  with nobody unaware in view, 45–76% with two or more unaware) and the audience the protocol gives it: 91% of alarm
  opportunities have nobody unaware in view, because everyone within 8 m sees the model at once (`snakeAwareM`, design) and
  one start hoo informs everyone within 100 m. Not this stage's literals; reported, not changed.
- **The stopping rule cannot discriminate in the model**: the audience is safe at 100% of act ends and at 99.3–99.7% of
  the exposed ticks outside acts (field: 100% against 40.42%), because the audience learns at once.

**Step 2 therefore** (the registered consequence): the reunion gap and the penalty are switched out without replacement
(bits 1 and 2); the cadence, which sets the hoo rate, is replaced by a mechanism (bit 4, §4).

## 3. Field rows and readouts

Samples of the rows this stage can move, from the sources' texts (E4c read T-COM-1, -4, -8, -9's sources and recorded
them in e4c-prereg.md §2; repeated here in short). Sex and method matter for these rows; reproductive state and body
mass enter none of them.
- **T-COM-1** (fitted; band 0.5–1.5 pant-hoots per male-hour): adult males, focal continuous. Kanyawara 1997–98, 12
  males, about 200 h, core median 0.76 per hour (wilson2007); Mahale M 1990, 7 males, 175 h, focal-initiated bouts only,
  1.40 per hour (mitaniNishida1993, second hand). Truth readout: pant-hoots per awake daylight adult-male hour.
- **T-COM-4** (held-out pattern): activity before the call; Mahale (245 calls, second hand) and Kanyawara (0.42 per hour
  feeding on fruit against 0 on herbs; wilson2007); fedurek2014 (Kanyawara, 9 adult males, 1,320 pant hoots): travel 50%,
  feeding 25%, rest 17%, display 8%.
- **T-COM-8** (fitted; 0.3–0.6): Taï (*P. t. verus*), 5 males and 4 females, 754.5 h of focal follows, 557 feeding events;
  food calls in 41% of events at any time, 19% in the first minute (kalanBoesch2015). The observer counts the arrival
  minute.
- **T-COM-9** (held-out pattern): Kanyawara, 272 party arrivals at food over 16 months: arrival pant-hoots at unoccupied
  trees only from parties with ≥ 1 high-ranking male (clarkWrangham1994, abstract).
- **T-COM-2, -3, -7** (held-out patterns): rank (wilson2007, 12 males; mitaniNishida1993, 7), range zone (wilson2007),
  drumming and party size (eleuteri2022, Waibira, 141 bouts).
- **Arrival pant-hoots (readout, no row)**: Sonso, 10 adult males, 692 h of focal follows, 233 arrival events: pant hoots
  in 0.35 ± 0.14 of a male's arrivals when joining others, 0.08 ± 0.04 when being joined (bouchard2022a; Methods quoted in
  e4c-prereg.md §2: an arrival event runs from the male "approaching in visual range of the food tree (i.e.
  approximately 30 m)" to the moment he starts feeding). The model's reunion decisions (a male perceiving newcomers,
  joining or joined) are comparable in kind, not in definition.
- **T-COM-11** (fitted; 0.25–0.55, encoded): Budongo Sonso 2008–2010, viper model, 33 individuals, alert hoos in 46 of 111
  individual encounters (41.4%); receiver knowledge lowers calling (−0.96, p = 0.030) (crockford2012, as recorded in
  data/targets.json and docs/realism-design.md). **Not verified this stage:** the full text is behind a bot check at
  cell.com (stopped there) and the St Andrews repository copy (hdl 10023/4314) returned 503; the sex, age and
  reproductive composition of the 33 and how an encounter was bounded are not available to this stage. The observer's
  protocol (src/field/experiments.ts): per individual that comes within the model's detection distance (12 m) during
  30 min, whether it gives alert hoos.
- **Alarm bouts and their end (readouts, no row)** (schel2013, read in full, PMC3797826): Sonso, January 2010 – December
  2011 (community of 73: 11 adult males, 23 adult females, 3 sub-adult males, 11 sub-adult females, 25 juveniles and
  infants; "Adults were defined as individuals above 15 years of age"), a moving python model revealed to 13 focal
  individuals in 27 trials (sexes of the focal individuals not in the main text; File S1 not read), 1,273 focal alarm
  calls (876 soft huus, 229 alarm huus, 168 waa barks). Methods: "Within calling bouts, chimpanzee alarm calls are
  commonly repeated in sequences, with our data revealing a mean duration of 2.49 s (SD = 3.4 s) between individual
  calls"; "The end of a calling bout was defined by the last call before a period of at least 30 sec silence"; the test
  compared others' safety "in the 10 s after the last call in a bout" with "the rest of the trial (defined as period
  from snake exposure to when the focal individual moved more than 10 m from the snake)", safe meaning "sufficient
  physical distance [>10 m away, up a tree] or aware of this ambush predator". Result: "when callers stopped calling, it
  was significantly more likely that all recipients were safe ... compared to chance (median = 100.00% vs. 40.42%; z =
  2.54, N = 11, p = .011)"; the callers' own risk did not explain stopping. Soft huus at discovery came "irrespective of
  the presence of an audience"; alarm huus and waa barks rose after friends arrived (9 of 87 caller–arrival dyads).
- **Alert hoos come in bouts** (crockford2018, read in full in the Track E session scratch, PMC5990785): alert hoos were
  emitted in bouts of more than one call in 38 of 40 cases, at longer inter-call intervals than travel hoos (271 hoos of
  29 individuals in three contexts).

**Readouts this stage reports against those values** (smoke-tested on S31, seed 48, 1 + 2 days, before any arm; the
switch's own smoke test follows in §4): pant-hoots per adult-male hour (T-COM-1 truth); reunion decisions with a pant-hoot
(arrival calls); T-COM-11's statistic in the trials; hoos per alarm act and the act's length against bouts of > 1 call at
~2.5-s intervals ending after ≥ 30 s of silence; the stopping rule (all safe at an act's end against chance).

## 4. Mechanism: switch `callGaps` (registered after the diagnosis, before any code of it)

One switch, 0 = today, bit-identical; a sum of bits, one per literal (as E4q's `aggressionGaps`):

| Bit | Literal switched out (not read) | Replaced by |
| --- | --- | --- |
| 1 | the 0.5-h gap after the caller's own last call (`callReady`), which with `callValue` gates only the male reunion pant-hoot | nothing new (it trims ×1.06, §2.1): the reunion offer's own score and its event (newcomers in view at the decision) govern repetition. Read only with `callValue` 1: without it the same gap also gates the timer world's food-call variant, which this stage did not diagnose |
| 2 | the alarm's repeat penalty (−0.4 within 1.8 min of the animal's own last call) | nothing new (inert, §2.1): the alarm's own value, which already falls as its audience learns (0.2 + 0.32 × the unaware in view), governs repetition |
| 4 | the alarm-hoo every 60 s of an alarm act | an alarming animal hoos in a tick of its alarm act when an own-community animal of 1 y or more within its sight radius (the radius its last look used) is unaware of the snake: it calls to those it sees who have not learnt, and stops when everyone it sees has heard (schel2013b's stopping rule; crockford2012's receivers' knowledge). The hoo at the act's start stays: choosing to alarm is calling (soft huus at discovery come with or without an audience, schel2013b) |

No magnitude, weight or interval is added. The tick (15 s) is the only time step: one hoo event in a tick stands for a
bout of calls (repeated every ~2.5 s in the field, schel2013b), and a hoo informs every listener in earshot at once, so a
second hoo in the same tick would carry nothing. The audience is the alarm's own (own community, 1 y or more, not aware),
read from the caller's sight radius each tick of the act instead of the attention list of its last decision, so that an
animal coming into view during the act is seen; nothing else reads it.

Code: calls.ts (`callGapOn`, `unawareInSight`), candidates.ts (`callReady` reads bit 1 under `callValue`; the penalty
reads bit 2), execution.ts (the alarm act reads bit 4), data/params.json (`callGaps`, design switch, 0–7),
scripts/lib/prescriptions.ts (TRACK_E_SWITCHES with `needs` `callValue` 1; three LITERAL_OFF entries, verified by a code
read and `param-reads.ts --literals`), tests/sim-track-e.test.ts (switch list), tests/sim-call-gaps.test.ts (0 by
default in both profiles; switch 0 leaves the S31 world unchanged; each bit does what its row says; the count on S31
48 → 45); the `callReady` line changes text, so the ledger test's pieces and the decision guide's `has` follow.

### 4.1 Arm A1, predictions and kill criterion

**A1** = S31 + `callGaps` 7, quick (seeds 48, 7; 30 + 30 days), from a frozen detached checkout of the commit that adds
the code: `e-bench --quick` (`--workers` 1 above load 8, else 2), `energy-diagnose`, `rhythm-metrics` (night safety: the
reunion bit changes calls, and listeners walk to calls) and `call-gaps-diagnose` (trials at 08–16 h). Judged against the
four S31q realizations (e-bench, energy; `judge_vs_reps.py quick custom`, e-noise.md amendment 2, with and without T-HUN-4,
T-BRD-1 and T-IGE-3) and the four D0 diagnoses (readouts).

| Quantity | S31q / D0 (mean ± SD) | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions (current ledger) | 48 | 45 | high |
| Viability; night safety | pass | pass; ≤ 3.3% of the night, T-RHY-5 ≤ 0.033 | high |
| Fitted, held-out, held-out without the rare rows | group mean | inside noise (\|z\| ≤ 2) | moderate |
| Reunion pant-hoots per male(≥ 12 y)-hour | 0.0176 ± 0.0008 | ×1.0–1.25 (D1 ×1.06) | moderate |
| Pant-hoots per adult-male hour (truth) | 0.499 ± 0.020 | within 2 SD | moderate |
| Alarm-hoos per exposure-hour | 4.85 ± 0.58 | 0.3–0.8 (D3 0.37, plus hoos for animals coming into view) | moderate |
| Hoos per alarm act | 14.6 ± 1.5 | 1.0–1.6 | moderate |
| Alarm acts per exposure-hour | 0.33 ± 0.02 | ×0.8–1.25 | moderate |
| T-COM-11 statistic in the trials (all hours) | 0.088 ± 0.007 | within ±0.02 of D0's mean; still below its band | moderate |
| Animals informed by hoos (share of those that became aware) | D0 2,249 of 2,831 | not below half of D0's share | moderate |
| Stopping rule: all safe at an act's end | 1.0 | 1.0 | high |
| T-COM-11 in e-bench (one trial day per seed) | S31q runs | inside the group's range (few encounters) | low |
| Reserves %/day, every class | S31q mean ± SD | within 0.03 of the mean | moderate |
| T-ACT-1..4, T-COM-1, T-COM-8 | S31q spread | as the group | moderate |

**Kill criterion (the switch stays off and the result is recorded as a null)**: (a) viability fails (a starvation death,
or a seed below 80% of its start); (b) held-out worse beyond noise (z > +2) with or without the rare rows; (c) any class's
reserve slope more than 0.05% of the store a day below the S31q mean; (d) night safety fails; (e) the alarm stops
informing: T-COM-11's statistic in the trials below half of D0's mean, or the share of newly aware own-community animals
informed by hoos below half of D0's.

**Keep rule (standard):** viability passes; held-out not worse beyond noise with and without the rare rows; prescriptions
48 → 45. Then a provisional keep candidate for the integrator's 5-seed confirm (on S34, as the integrator asked).

### 4.2 Code checks before any arm (e2c8ff6, 5a55582)

- Switch 0 leaves the S31 world unchanged (seed 48, 1 day) and bit 1 changes it; bits 2 and 4 change nothing without a
  snake model (snakes appear only in experiments); bit 1 opens the reunion pant-hoot 0.2 h after the own last call under
  `callValue` only; bit 2 removes the penalty (the alarm's value 0.2 instead of −0.2 one 0.01 h after a call); bit 4: no
  hoo on the act's minute with nobody unaware in sight, a hoo when an unaware own-community juvenile comes within sight
  (which tells it), none after, none for an unaware animal out of sight; the count falls one per bit (S31 48 → 45; today's
  model 147 → 145, bit 1 needing `callValue`): tests/sim-call-gaps.test.ts (6 pass); tests/prescription-ledger.test.ts and
  tests/sim-track-e.test.ts pass; `tsc` and `gen-params --check` clean; `decision-guide.ts --check` up to date.
- `param-reads.ts --literals` (seeds 48 and 7; arms S31 and S31 + `callGaps`): `callReady` moves S31's world 1/2 in 8
  days and 0/2 with bit 1; the penalty is inert in 1 day with a snake model at 8 h on S31 (0/2) and 0/2 with the bits; the
  cadence moves S31 1/2 in that day and 0/2 with bit 4. No over-claim.
- Readouts smoke-tested with the switch on (S31 + `callGaps` 7, seed 48, 1 + 2 days, 30 trials): no reunion offer
  blocked; one hoo per alarm act (no animal came into sight unaware during an act); trials and exposure read as before.

## 5. Reference and judging

Reference: S31 quick, run once plus three re-draws (`rngSalt` 1, 2, 3) at bench-run 4111971 (simulation code identical
to 90aa294 for S31), each with energy-diagnose (seeds 48 and 7, burn-in 30, days 30):
`bench-run/artifacts/validation/e/s31q/{S31q,S31q1,S31q2,S31q3}.json` and `…-energy.json`; parameters in
`…/S31q-params.json`. Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a
result; sums with and without T-HUN-4, T-BRD-1 and T-IGE-3 (amendment 3). Readouts against the reference's own spread
(mean ± SD of its 4 runs).

## 6. Iteration log

(each entry written and committed before its run)

- **A1** (§4.1; `callGaps` 7 on S31): registered 4 October 2026 at the commit that adds this line; run from a frozen
  detached checkout of it: `e-bench --quick` (`--workers` 1 above load 8, else 2), `energy-diagnose`, `rhythm-metrics` and
  `call-gaps-diagnose` (seeds 48, 7; 30 + 30 days; trials at 08–16 h), the four in parallel (`run-arm.sh`).
  Run 22:54–23:01 from a frozen detached checkout of ee283f2 (clean), `--workers` 2 (load 3.8). Result in §7.1: keep rule
  passed, no kill criterion met.
- No further iteration (§7.2).

## 7. Results

### 7.1 A1 (S31 + `callGaps` 7; ee283f2, clean): printed by `e5g_judge.py` (which runs the integrator's `judge_vs_reps.py` and `night.py`) from the e-bench, energy, rhythm and call-gaps-diagnose JSON

```
bench reference runs: ['S31q', 'S31q1', 'S31q2', 'S31q3']; arms: ['A1']
  S31q: 4111971 dirty 0 prescriptions (JSON, ledger at its commit) 38; viability pass (births 0, deaths 0, starvation 0, min living share 1)
  S31q1: 4111971 dirty 0 prescriptions (JSON, ledger at its commit) 38; viability pass (births 0, deaths 0, starvation 0, min living share 1)
  S31q2: 4111971 dirty 0 prescriptions (JSON, ledger at its commit) 38; viability pass (births 0, deaths 0, starvation 0, min living share 1)
  S31q3: 4111971 dirty 0 prescriptions (JSON, ledger at its commit) 38; viability pass (births 0, deaths 0, starvation 0, min living share 1)
  A1: ee283f2 dirty 0 prescriptions (JSON, ledger at its commit) 45; viability pass (births 0, deaths 0, starvation 0, min living share 1)

quick, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 12
  fitted             (17 rows) ref 1.77, 2.69, 1.84, 1.32 (mean 1.90, sd 0.57; used 0.69) | A1.json: 1.62, Δ -0.29, z -0.4 (inside noise)
  held-out           (12 rows) ref 9.81, 4.90, 6.68, 5.18 (mean 6.64, sd 2.25; used 2.25) | A1.json: 3.94, Δ -2.71, z -1.1 (inside noise)
  held-out w/o rare  (11 rows) ref 3.75, 4.90, 3.48, 4.98 (mean 4.28, sd 0.77; used 0.77) | A1.json: 3.36, Δ -0.91, z -1.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-4   held-out ref 2.36±2.86 | A1.json 0.57 (fail)


| Reserves ÷ store, % per day (OLS) | S31q runs | S31q mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male | -0.003 / +0.002 / -0.005 / +0.006 | -0.000 ± 0.005 | -0.006 (z -1.0) |
| female, other | +0.015 / -0.004 / -0.014 / +0.002 | -0.000 ± 0.012 | -0.008 (z -0.6) |
| female, lactating | +0.002 / -0.005 / -0.007 / -0.020 | -0.008 ± 0.009 | -0.019 (z -1.1) |
| juvenile 5–12 y | -0.052 / +0.001 / -0.027 / +0.009 | -0.017 ± 0.028 | -0.005 (z +0.4) |
| infant 2–5 y | +0.003 / -0.019 / +0.010 / -0.028 | -0.009 ± 0.018 | -0.010 (z -0.1) |
| infant 0.5–2 y | +0.003 / +0.004 / -0.024 / -0.013 | -0.007 ± 0.013 | -0.006 (z +0.1) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Ground km / eating min | S31q runs | S31q mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.97 / 2.69 / 2.63 / 2.43 | 2.68 ± 0.22 | 2.96 (z +1.1) |
| adult male: eatingMin | 232.28 / 228.91 / 228.08 / 227.88 | 229.29 ± 2.04 | 231.05 (z +0.8) |
| female, other: groundKm | 2.12 / 2.12 / 1.95 / 1.91 | 2.02 ± 0.11 | 1.94 (z -0.7) |
| female, other: eatingMin | 224.87 / 233.39 / 228.30 / 214.41 | 225.24 ± 8.03 | 230.46 (z +0.6) |
| female, lactating: groundKm | 2.65 / 2.53 / 2.62 / 2.52 | 2.58 ± 0.07 | 2.50 (z -1.1) |
| female, lactating: eatingMin | 307.80 / 299.90 / 302.29 / 304.64 | 303.66 ± 3.37 | 300.85 (z -0.7) |
| juvenile 5–12 y: groundKm | 3.02 / 2.99 / 2.80 / 2.99 | 2.95 ± 0.10 | 3.03 (z +0.8) |
| juvenile 5–12 y: eatingMin | 294.82 / 283.19 / 295.56 / 285.33 | 289.72 ± 6.38 | 273.74 (z -2.2) |

| Row (pooled; verdict) | Band | S31q runs | S31q mean ± SD | A1 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.369 pass / 0.370 pass / 0.374 pass / 0.360 fail | 0.368 ± 0.006 | 0.361 pass |
| T-ACT-2 | 0.12–0.25 | 0.126 fail / 0.116 fail / 0.107 fail / 0.100 fail | 0.112 ± 0.011 | 0.118 fail |
| T-ACT-3 | 0.08–0.18 | 0.096 fail / 0.098 fail / 0.096 fail / 0.104 fail | 0.098 ± 0.004 | 0.098 fail |
| T-ACT-4 | 0.3–0.47 | 0.470 fail / 0.486 fail / 0.455 pass / 0.455 pass | 0.466 ± 0.015 | 0.427 pass |
| T-COM-1 | 0.5–1.5 | 0.411 fail / 0.474 fail / 0.490 fail / 0.468 fail | 0.461 ± 0.034 | 0.544 pass |
| T-COM-8 | 0.3–0.6 | 0.596 pass / 0.556 pass / 0.524 pass / 0.588 pass | 0.566 ± 0.033 | 0.571 pass |
| T-COM-11 | 0.25–0.55 | 0.000 fail / 0.091 fail / 0.000 fail / 0.125 fail | 0.054 ± 0.064 | 0.000 fail |
| T-COM-2 | rate falls with rank number | -0.027 fail / 0.105 fail / -0.074 fail / -0.108 pass | -0.026 ± 0.093 | 0.356 fail |
| T-COM-3 | periphery rate below core rate | -0.150 fail / 0.051 fail / 0.027 fail / -0.143 pass | -0.054 ± 0.108 | -0.097 fail |
| T-COM-4 | travel most common; fruit > herbs | 0.540 pass / 0.481 pass / 0.446 pass / 0.473 pass | 0.485 ± 0.040 | 0.526 pass |
| T-COM-7 | less drumming in large parties | 0.185 fail / 0.088 fail / 0.092 fail / 0.129 fail | 0.123 ± 0.045 | 0.102 fail |
| T-COM-9 | status, not food amount | 0.643 fail / 0.660 fail / 0.703 fail / 0.635 fail | 0.660 ± 0.031 | 0.553 fail |
| T-PTY-1 | 3–9 | 4.293 pass / 3.892 pass / 3.779 pass / 4.153 pass | 4.029 ± 0.236 | 3.838 pass |
| T-RNG-4 | 1.5–3.5 | 2.214 fail / 2.222 fail / 1.963 fail / 1.850 fail | 2.063 ± 0.186 | 2.375 fail |
| T-IGE-1 | 5–12 | 5.995 pass / 3.103 inconclusive / 7.499 pass / 10.377 pass | 6.744 ± 3.033 | 9.137 pass |
| T-IGE-2 | 0.7–0.9 | 0.500 fail / 1.000 fail / 0.750 pass / 1.000 fail | 0.812 ± 0.239 | 1.000 fail |
| T-HUN-1 | 5–25 | 28.077 inconclusive / 9.973 pass / 15.956 pass / 22.060 pass | 19.017 ± 7.800 | 15.870 pass |
| T-FOOD-2 | 0.6–0.78 | 0.849 fail / 0.848 fail / 0.849 fail / 0.806 fail | 0.838 ± 0.021 | 0.832 fail |
| T-FOOD-10 | 0.08–0.3 | 0.552 fail / 0.643 fail / 0.544 fail / 0.563 fail | 0.575 ± 0.046 | 0.554 fail |
| T-SOC-5 | 0.2–0.7 | 0.563 pass / 0.338 pass / 0.280 pass / 0.434 pass | 0.403 ± 0.124 | 0.462 pass |
| T-SOC-9 | 0.08–0.22 | 0.174 pass / 0.226 fail / 0.116 pass / 0.256 fail | 0.193 ± 0.062 | 0.071 fail |

T-COM-11 per seed (quick e-bench, 10:00 on day 40): {'S31q': [None, 0], 'S31q1': [0.2, 0], 'S31q2': [0, 0], 'S31q3': [0.16666666666666666, 0], 'A1': [0, 0]}

| Calls per caller-hour (truth) | D0 runs | D0 mean ± SD | A1 |
| --- | --- | --- | --- |
| adult males: pant-hoots | 0.5086 / 0.4696 / 0.5161 / 0.4997 | 0.4985 ± 0.0204 | 0.4879 (×0.98, z -0.5) |
| adult males: reunion pant-hoots (call/REUNION) | 0.0209 / 0.0188 / 0.0186 / 0.0181 | 0.0191 ± 0.0012 | 0.0202 (×1.06, z +0.8) |
| males ≥ 12 y: reunion pant-hoots | 0.0186 / 0.0169 / 0.0177 / 0.0171 | 0.0176 ± 0.0008 | 0.0186 (×1.06, z +1.2) |
| adult males: valued pant-hoots (call/CONTACT) | 0.0693 / 0.0740 / 0.0906 / 0.0855 | 0.0799 ± 0.0099 | 0.0743 (×0.93, z -0.5) |
| adult males: arrival pant-hoots at a crown | 0.2314 / 0.1900 / 0.2129 / 0.1972 | 0.2079 ± 0.0184 | 0.2073 (×1.00, z -0.0) |
| adult males: food grunts | 0.5111 / 0.4889 / 0.4618 / 0.5053 | 0.4918 ± 0.0221 | 0.4684 (×0.95, z -0.9) |
| adult females: food grunts | 0.3537 / 0.3187 / 0.3327 / 0.3446 | 0.3374 ± 0.0152 | 0.3072 (×0.91, z -1.8) |
| adult males: travel hoos | 0.3605 / 0.3374 / 0.3305 / 0.3485 | 0.3442 ± 0.0131 | 0.3447 (×1.00, z +0.0) |
| reunion decisions with a pant-hoot (share) | 0.022 / 0.023 / 0.029 / 0.027 | 0.025 ± 0.003 | 0.028 (×1.11, z +0.7) |
| snake alarm acts per exposure-hour | 0.3572 / 0.3042 / 0.3344 / 0.3380 | 0.3335 ± 0.0219 | 0.3496 (×1.05, z +0.7) |
| alarm-hoos per exposure-hour | 4.6511 / 4.2322 / 4.9177 / 5.6086 | 4.8524 ± 0.5777 | 0.3803 (×0.08, z -6.9) |
|   of which by the cadence | 4.2939 / 3.9280 / 4.5833 / 5.2706 | 4.5190 ± 0.5683 | 0.0307 (×0.01, z -7.1) |
| hoos per alarm act | 13.02 / 13.91 / 14.71 / 16.60 | 14.56 ± 1.52 | 1.09 (×0.07, z -7.9) |
| alarm act length, min | 12.28 / 13.18 / 13.95 / 15.78 | 13.80 ± 1.49 | 12.86 (×0.93, z -0.6) |
| T-COM-11 statistic (trials, all hours) | 0.089 / 0.080 / 0.087 / 0.097 | 0.088 ± 0.007 | 0.094 (×1.07, z +0.7) |
| T-COM-11 statistic (trials, 10 h) | 0.116 / 0.069 / 0.122 / 0.089 | 0.099 ± 0.025 | 0.106 (×1.07, z +0.3) |
| stopping rule: all safe at an act end | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 (×1.00, z +nan) |
| unaware in view at an act start | 2.978 / 2.921 / 2.325 / 2.411 | 2.659 ± 0.338 | 2.473 (×0.93, z -0.5) |
arms/A1-rhythm.json: adults out of a nest 2.42% of night; T-RHY-5 0.0203; night deaths 0; deaths 0
```

Beside the table, from the same JSON (`call-gaps-diagnose`, pooled): A1 gave 148 start hoos and 13 hoos for animals that
came into sight unaware (all 13 informed someone; 1.6 unaware community members within earshot per such hoo), against
D0's 519 and 7,057 (81 informative; 0.021 per cadence hoo); 80.1% of the animals that learnt of a snake learnt it from a
hoo (D0 79.4%, D1 81.0%); hoos per act: 1 in 137 acts, 2 in 9, 3 in 2. A1's observed world equals D1's (every observed-
world readout identical: bits 2 and 4 act only in the trials, and bit 1 equals D1's literal change), so A1's observed rows
also stand for the reunion gap removed alone.

**Against the predictions (§4.1).** Prescriptions 45: held. Viability and night safety (2.42%, T-RHY-5 0.0203): held.
Sums inside noise: held (fitted z −0.4, held-out −1.1, without T-HUN-4, T-BRD-1 and T-IGE-3 −1.1). Reunion pant-hoots
×1.0–1.25: held (×1.06). Adult-male pant-hoots within 2 SD: held (0.488, z −0.5). Alarm-hoos per exposure-hour 0.3–0.8:
held (0.380). Hoos per act 1.0–1.6: held (1.09). Alarm acts ×0.8–1.25: held (×1.05). T-COM-11's statistic in the trials
within ±0.02: held (0.094 against 0.088 ± 0.007). Informed by hoos not below half of D0's share: held (80.1% against
79.4%). Stopping rule 1.0: held. T-COM-11 in e-bench inside the group's range: held (0.00; group 0.00–0.125, 5–6
encounters a seed). Reserves within 0.03 %/day of the S31q mean: held for every class (nursing mothers −0.019 against
−0.008 ± 0.009, the furthest). T-ACT-1..4, T-COM-1, T-COM-8 as the group: held for T-ACT-1..3 and T-COM-8; T-ACT-4 0.427
(group 0.466 ± 0.015, inside its band); **T-COM-1 0.544 passes where the four group runs fail (0.41–0.49)**, while the
truth rate does not move (0.488 against 0.499 ± 0.020): the observer's focal sample, not calling.

**Kill criterion (§4.1): none met** (viable; held-out z −1.1 and −1.1; no class's reserves 0.05 %/day below the mean;
night safe; T-COM-11's statistic 0.094 and 80% informed by hoos).

**Readings beyond the predictions (one quick realization each; for the confirm to watch).** T-COM-9 0.553 against the
group's 0.635–0.703 and T-COM-2 τ +0.36 against −0.11 to +0.11 (both pattern rows, failing in the group too) move with the
observed world's re-draw, while arrival pant-hoots in truth do not (0.207 against 0.208 ± 0.018 per adult-male hour);
juveniles eat 274 min a day against 290 ± 6 (z −2.2) with their reserves better (−0.005 against −0.017 %/day); T-SOC-9
0.071, below its band (group 0.116–0.256).

### 7.2 Stage verdict

**`callGaps` 7: a provisional keep candidate (S31 48 → 45), by the keep rule in quick mode**: viable, every sum inside
noise against S31's four realizations, night safe, three counted prescriptions out. A 5-seed confirm on the stack (S34,
as the integrator asked) should decide, watching T-COM-9, T-COM-2, juveniles' eating time and T-SOC-9.

**The brief's premise held for one literal of three.** The reunion gap only trims (×1.06; the reunion offer's own fixed
score sets that rate) and the alarm penalty is inert (19 decisions in four runs): both go with nothing in their place.
The 60-s cadence set how often an alarming chimpanzee hoos (93% of hoos), and almost none of its hoos reached anyone who
did not know; in its place an animal hoos while it sees a community member that has not learnt of the snake, which keeps
the information (80% of animals learn by a hoo) with 13 hoos instead of 1,791 in the same world.

**No further iteration was run.** A1 meets the keep rule and no kill criterion.

**Open problems (the biggest first):**
- T-COM-11 sits at 0.09 in truth (0.00–0.13 in quick e-bench) against 0.25–0.55, and no gap sets it: the alarm's own value
  (0.2 + 0.32 × the unaware in view, literal weights the ledger lists as encoding T-COM-11) meets an audience that almost
  always knows, because everyone within 8 m sees the model at once (`snakeAwareM`, design) and one hoo informs everyone
  within 100 m (91% of alarm opportunities have nobody unaware in view). The field's trials met the model one animal at a
  time on a travel path (schel2013b revealed it within 2 m of the focal). A protocol or perception question, not a call
  rule; building toward the band would be tuning.
- The reunion pant-hoot is still a fixed design score that reads nothing of its audience (0.3 + 0.1 × boldness), beside
  the valued pant-hoot (`pantHootValue`) that does; a male answers about 2.5% of reunions with it (field: 35% of joinings
  at Sonso, by any pant-hoot).
- T-COM-1 in truth (0.50 per adult-male hour) is at the bottom of its band; the observer's quick value moves 0.41–0.54
  between realizations.

## 8. Files and final checks

- Outputs (local, gitignored): `artifacts/validation/e5g/` (copied from the stage scratch `e5g/`): `diag/` (the four D0
  diagnoses and the three scratch arms D1–D3, with logs), `arms/` (A1: e-bench, energy, rhythm and call-gaps-diagnose JSON
  and logs), the tables printed for §2.1 and §7.1 (`diag-table.txt`, `A1-judge.txt`), the table scripts (`diag_table.py`,
  `e5g_judge.py`), the run scripts (`run-diag.sh`, `run-arm.sh`) and the `param-reads --literals` tables (`lit-*.md`).
- Code: `src/sim/calls.ts` (`callGapOn`, `unawareInSight`), `src/sim/candidates.ts` (`callReady` and the alarm penalty read
  the bits; the read-only `quotaTrace` kinds 'reunion' and 'alarm'), `src/sim/execution.ts` (the alarm act's hoo),
  `data/params.json` (`callGaps`), `scripts/call-gaps-diagnose.ts`, `scripts/lib/prescriptions.ts` (TRACK_E_SWITCHES, three
  LITERAL_OFF entries), `tests/sim-call-gaps.test.ts`; the `callReady` piece in `tests/prescription-ledger.test.ts` and
  `scripts/lib/decision-guide-content.ts`; `docs/decision-guide.html` regenerated; docs/simulation.md (§17 row and a note);
  research.md and e-sources.md "Addendum: E5g calls and alarms" (schel2013b, crockford2012).
