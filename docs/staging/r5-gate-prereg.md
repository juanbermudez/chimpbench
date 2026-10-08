# Stage R5-gate: the existing adapters with the loop's intention gate on (pre-registration)

Agent r4b-retrain, branch `r4b-retrain` at `track-e` 6d5fff2. Registered 8 October 2026, 16:30, before any run of
this stage. No training. It follows `docs/staging/r4b-prereg.md` §13, proposal A, and `docs/staging/r5-pilot-prereg.md`.

**Why.** Rounds two and three found that asking a model at every decision point multiplies any lean: the first
adapter begins half the rules' trips to food, the third 54 a day. The rules themselves do not decide afresh at every
point: they hold an intention until something salient changes. Stage R1 built that gate for every kernel
(`kernelGate` 1: after a kernel's choice is applied it becomes the animal's intention; at later decision points the
function the rules use decides whether anything salient has changed; if not, the act is kept, a finished trip at its
tree becomes feeding there, and the kernel is not asked). The user asked for the gate to be run "both on and off". The
pilot's one gate-on arm was on a training seed and five animals, and was not resolved.

The user's decisions that bind it: "yes just state in training" (the state-only packet); "keep the rules' pick on the
menu for the main comparison … run the gate both on and off"; "Use 0.5 as the declared working base"; "no cloud
machine run things locally". No network, no outside model, no whole-population benchmark, nothing under `src/` or
`data/`, no switch default changed (`kernelGate` is set on each arm's copy of the world, as in the pilot).

## 1. Arms

The test of R4b and R4c again: base W50 with `observeV4` 1 and `menuParity` 1; seeds 21 and 5 (neither adapter was
trained on them); the standard window (30 days of burn-in on the rules, then 5 days) with the same ten focal animals;
and the lean window of seed 21 (days 119 to 124, five animals). The rules' pick is kept on the menu in every model arm.

| Arm | Who chooses for the focal animals | Gate | Run |
| --- | --- | --- | --- |
| (a) `rules` | the rules (their own gate) | theirs | **saved** (R4b, iteration 3 and 6), with the three re-draws that give the noise |
| (b) `trained` | `r4-rules-state` | off | **saved** (R4b, iterations 5 and 6): the same burned-in worlds (hashes 689d34e1…, b109a6e6…, 504bb508…), the same adapter (sha256 e09fd6f4…1932), the same base, packet and step; nothing in the arm's configuration has changed since. It is not run again; it is replayed from its receipts at this stage's head, which must end on the run's hash and supplies the new readouts of §2 |
| (c) `trained-gate` | `r4-rules-state` | **on** | new |
| (d) `r4c-gate` | `r4c-rules-state` | **on** | new |

Beside them, so the four can be read: `argmax` (saved) and **`argmax-gate`** (new; no model): the rules' top option
chosen through the same loop, gate off and on. They show what the loop and the gate do with a kernel that always
agrees with the rules. `r4c` gate off (saved, R4c) is shown for the contrast.

Both new model arms run in one worker process (`r4-rules-state` is copied beside `r4c-rules-state`; the worker prints
both hashes). Each new arm is replayed from its receipts and must end on its run's hash. A call that passes 120 s goes
to the rules and is counted.

## 2. Readouts (fixed now)

Per focal animal and day, simulation truth, each arm against the rules on the same animal-days (the pilot's method:
the mean over an animal's days of arm minus rules, a 95% t interval over animals, the three rules re-draws as noise):

- energy eaten; feeding minutes (daylight); **trips to food begun** and **trips completed** (the animal reached the
  tree it set out for and fed there); drinks; distance; nights in a nest;
- **how often the kernel was asked** per animal-day, **how many decisions the gate held** per animal-day (a new act
  kept or begun by the gate without asking), and the share of asked decisions the model's choice settled.

**What the gate does to the comparison itself.** With the gate on, part of an animal's day is not a choice the model
made at that moment. Two counters are added to the measurement block (they read only): every tick is credited to who
set the act the animal is in: **a fresh choice of the kernel**, **an intention held by the gate** (the act the gate
kept or, at the end of a trip, began), or **the rules** (a fallback, or an act begun before the window). The report
gives, per arm, the share of the 24 hours under each, and the share of new acts each began. An act held by the gate
continues the kernel's own earlier choice; it is credited to the gate because the decision to keep it was code's.

## 3. The rule (fixed now)

**An arm "matches the rules on feeding" if, on the standard window with the ten animals of seeds 21 and 5 pooled, all
of these hold:**

1. energy eaten: the paired interval of arm minus rules includes 0, **and** the mean difference is within 5% of the
   rules' mean;
2. nights in a nest not worse: no fewer than the rules' nights in a nest less one (of 50), and the paired interval of
   the share of nights not wholly below 0;
3. distance within the rules' spread across animals: the size of the mean paired difference is no more than the
   standard deviation of the rules arm's per-animal means (0.84 km on these animals).

The script prints the three conditions and the verdict for every kernel arm. The lean window (five animals) is
reported with the same table and cannot decide alone.

**What ten animals can resolve, said before the run.** 5% of the rules' intake is about 83 kcal a day. The paired
half-widths seen so far on these ten animals were 39 kcal (first adapter, gate off), 112 (third) and 187 (second),
and the rules' own re-draws differ from the rules arm by up to 36 kcal. So a shortfall of about 40 to 110 kcal can be
resolved, depending on how alike the animals are; a 5% shortfall is at the edge. If an arm's half-width is wider than
5% of the rules' mean, an interval that includes 0 cannot tell "matches" from "5% short": the verdict is then printed
as **"matches, weakly (the interval is wider than the 5% it is judged against)"**. "Matches" is not "equal", and it is
not "the model decided": §2's shares say how much it decided.

**Written before the run** (to be checked, not to be met): with the gate on both adapters are asked far less often
(the pilot: about a third fewer kernel passes) and held intentions cover much of the day; `trained-gate` begins and
completes more trips than `trained` because a trip, once chosen, is kept to its tree; `r4c-gate` walks far less than
`r4c` and may still overshoot; `argmax-gate` sits close to the rules on every measure.

## 4. Machine rules and order

One model process at a time. Before each model run `uptime` and `sysctl -n vm.swapusage` are written to the log; no
run starts while swap in use is above 6 GB (wait and re-check). Runs only from a committed head with a clean tree.
At most 3 iterations per problem.

1. This file, committed. 2. Code: the arm `r4c-gate`, the two counters and the day's tallies in
`scripts/r5-pilot.ts`, the tables and the rule in `scripts/r5-report.ts`, `scripts/r5-gate.sh`; a test.
3. **Iteration G1** (no model): for seed 21 standard, seed 5 standard, seed 21 lean: `argmax-gate` and its replay,
and the replays of the saved `argmax`, `trained` and `r4c` arms. 4. **Iteration G2**: `trained-gate` and `r4c-gate`
for the three, with their replays. 5. Results in §5, the plan's status line, the full test suite once (code changed).

## 5. Iteration log and results

Machine at registration (16:25): load averages 5.36, 9.65, 6.51 (the test suite of R4c had just run); swap 4,347 MB
used of 5,120 MB; no model process running.

**Code delivered before any run** (outside `src/`): `scripts/r5-pilot.ts` (the arm `r4c-gate`; per animal and day
the minutes credited to the kernel, the gate and the rules, and the day's tallies of asked, settled, held), 
`scripts/r5-report.ts` (the rule `matchesRules`, the table "who set the act the animal is in", the arm), 
`scripts/r5-gate.sh`; `tests/r4b.test.ts` 8 tests (two new: the three shares cover the 24 hours, the counters leave
the world's hash unchanged, only a gate arm holds intentions; the rule's three conditions and "weakly"). `tsc` clean;
with `tests/r5-pilot.test.ts` 13 tests, 13 pass. `r4-rules-state` was copied beside `r4c-rules-state` (sha256
e09fd6f4… and f0827af2…).

- **Iteration G1 (logged before it runs; no model):** `scripts/r5-gate.sh nomodel` for seed 21 standard, seed 5
  standard and seed 21 lean: `argmax-gate` and its replay, and the replays of the saved `argmax`, `trained` and `r4c`
  arms at this head (each must end on its run's hash).
- **Iteration G2 (logged before it runs):** `scripts/r5-gate.sh model` for the same three, one after the other:
  `trained-gate` and `r4c-gate` in one worker process, then their replays. The swap check is written to each log.

**Result of iteration G1 (16:28 to 16:29, head f2b2923; no model).** `argmax-gate` ran in 5 s a window (1,450, 1,380
and 1,763 kernel passes) and its replays ended on its hashes. The saved arms replayed at this head end on the hashes
of their runs: `trained` 48d0f442…, d971a6bc…, 0b17ca64…; `r4c` 16a2bf51…, b061d097…, 41f4afb9…; `argmax`
0805a9c8…, 7970c463…, e712d96c… (seed 21 standard, seed 5 standard, seed 21 lean). So arm (b) is the saved run,
reproduced, and its rows carry the new readouts.

**Result of iteration G2 (16:29 to 18:22; one worker process per window with both adapters, e09fd6f4… and
f0827af2…; swap 4.3 GB in use at the first load; no hold).** Kernel calls and seconds: seed 21 standard
`trained-gate` 1,377 in 1,050 s, `r4c-gate` 1,653 in 848 s; seed 5 standard 1,330 in 739 s and 1,549 in 795 s; seed
21 lean 1,952 in 1,908 s and 2,221 in 1,324 s. Median 0.46 to 0.62 s a decision. **Seven calls of 10,082 passed the
120 s limit** (two in seed 21 standard, five in the lean window, all in `trained-gate`; each went to the rules and
the worker was replaced; the first two fell while this agent generated a report, the rest while another application
was busy). Every new arm replays from its receipts to its run's hash, every day's hash equal. No death in any arm.
Model time 1 h 51 min.

### 5.1 The answer

**With the gate on, neither adapter matches the rules on feeding by the registered rule.** The first adapter is
unchanged by the gate: still 5.6% short of the rules' intake. The third adapter's intake does reach the rules', and
it fails on distance: it still walks half as far again.

Standard window, the ten animals of seeds 21 and 5, per animal and day (tables: `docs/staging/r5-gate-standard.md`;
per seed `-s21`, `-s5`; lean `r5-gate-lean-s21.md`). In brackets the paired difference from the rules on the same
animal-days and its 95% t interval over animals.

| | (a) the rules | (b) `r4-rules-state`, gate off | (c) `r4-rules-state`, gate on | (d) `r4c-rules-state`, gate on | the rules' top option, gate on (no model) |
| --- | --- | --- | --- | --- | --- |
| energy eaten, kcal | 1,654 | 1,562 (−92; −131 to −54) | 1,562 (−92; −130 to −55) | 1,642 (−12; −65 to +41) | 1,644 (−10; −40 to +19) |
| feeding, daylight minutes | 252 | 211 (−41; −64 to −18) | 212 (−40; −60 to −20) | 227 (−25; −53 to +4) | 240 (−12; −29 to +5) |
| trips to food begun | 8.3 | 4.2 (−4.1; −5.5 to −2.7) | 2.3 (−5.9; −7.7 to −4.2) | 13.9 (+5.6; +3.4 to +7.8) | 7.5 (−0.8; −2.4 to +0.8) |
| trips completed (fed in the tree set out for) | 1.7 | 0.7 (−1.0; −1.8 to −0.2) | 0.9 (−0.8; −1.7 to +0.1) | 5.4 (+3.8; +2.3 to +5.2) | 1.8 (+0.2; −0.6 to +1.0) |
| drinks | 0.7 | 0.5 (−0.2; −0.4 to +0.1) | 0.7 (0.0; −0.3 to +0.3) | 1.1 (+0.4; +0.2 to +0.7) | 0.8 (+0.1; −0.2 to +0.4) |
| distance, km | 2.63 | 2.47 (−0.16; −0.78 to +0.46) | 2.05 (−0.58; −1.11 to −0.04) | 3.98 (+1.35; +0.68 to +2.02) | 2.55 (−0.08; −0.56 to +0.40) |
| nights in a nest | 50 of 50 | 50 of 50 | 50 of 50 | 50 of 50 | 50 of 50 |

The registered rule (energy within 5% with an interval over 0; nights not worse; distance within the rules' spread
across animals, 0.84 km):

| Arm | Energy against the rules | 1 | Nights | 2 | Distance against the rules | 3 | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (b) `r4-rules-state`, gate off | −5.6%, interval below 0 | no | 50, 50 | yes | −0.16 km | yes | does not match |
| (c) `r4-rules-state`, gate on | −5.6%, interval below 0 | no | 50, 50 | yes | −0.58 km | yes | **does not match** |
| (d) `r4c-rules-state`, gate on | −0.7%, interval over 0, half-width 3.2% | yes | 50, 50 | yes | +1.35 km | no | **does not match** |
| the rules' top option, gate on | −0.6%, half-width 1.8% | yes | 50, 50 | yes | −0.08 km | yes | matches |
| the rules' top option, gate off | −1.3% | yes | 50, 50 | yes | +2.08 km | no | does not match |
| `r4c-rules-state`, gate off | −10.0% | no | 50, 50 | yes | +5.38 km | no | does not match |

Each seed alone reads the same: (c) is 4.1% short on seed 21 (−66 kcal; −122 to −10) and 7.0% short on seed 5
(−119; −178 to −60), both intervals below 0; (d) is within 5% on both (+1.1% and −2.5%) and over on distance on both
(+1.29 and +1.42 km). **Lean window** (seed 21, five animals; the rules 1,632 kcal and 4.80 km;
spread 0.57 km): (c) 1,685 kcal (+53; −41 to +146) and 3.74 km (−1.05): energy passes, distance does not; (d) 1,535
kcal (−97; −187 to −8; 6.0% short), 8.49 km and 24 of 25 nights in a nest: fails on energy and distance. Neither
matches there.

What the readout could resolve: the half-widths came out at 37 kcal (c) and 53 kcal (d), 2.2% and 3.2% of the rules'
intake, inside the 5% the rule judges against. So (c)'s shortfall is a resolved one, and (d)'s energy result is a
real "within 5%", not a wide interval.

### 5.2 What the gate changed

- **The gate is what makes the loop sound; the engine is what remains.** The rules' top option chosen through the
  loop walks 2.1 km a day too far with the gate off and matches the rules on every measure with it on. So the gate
  removes the loop's own artefact, and the comparison with the gate on is the fair one.
- **It did nothing for the first adapter's feeding.** Intake is the same to the kilocalorie (−92.5 with the gate off
  and on); it begins fewer trips still (2.3 a day; when the rules' pick is a trip to food it takes it at 0.17, a
  drink at 0.11). Its shortfall is its own choice, not the loop asking too often.
- **It tamed the third adapter.** Trips begun fell from 54 to 14 a day, distance from 8.0 to 4.0 km, and intake rose
  from 1,488 to 1,642 kcal, level with the rules. It still sets out more than the rules (13.9 trips begun against
  8.3, and 5.4 completed against 1.7: many short trips that do end in feeding), drinks more (1.1 against 0.7) and
  walks 1.35 km a day further. In the lean stretch that extra walking costs it intake.

### 5.3 How much of the day the model decided

Standard window, per animal and day (mean and 95% interval over the ten animals):

| Arm | Kernel asked, times a day | New acts the gate held without asking | Asked decisions the model's choice settled | New acts that were a fresh model choice | Share of the 24 hours under a fresh model choice | Under an intention held by the gate | Under the rules |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (b) `r4-rules-state`, gate off | 97 (89 to 105) | 0 | 99.3% | 99.3% | 99.7% | 0% | 0.3% |
| (c) `r4-rules-state`, gate on | 54 (51 to 57) | 27 (24 to 30) | 99.7% | 66.5% | 58% (50 to 67) | 42% (33 to 50) | 0.2% |
| (d) `r4c-rules-state`, gate on | 64 (56 to 72) | 30 (28 to 32) | 99.0% | 66.4% | 61% (52 to 69) | 39% (31 to 47) | 0.5% |
| the rules' top option, gate on | 57 (53 to 61) | 28 (26 to 30) | 99.4% | 66.4% | 63% (53 to 72) | 37% (27 to 47) | 0.2% |
| `r4c-rules-state`, gate off | 206 (164 to 247) | 0 | 95.4% | 95.4% | 97.9% | 0% | 2.1% |

So with the gate on the model is asked about 55 to 65 times a day instead of 100 to 200, **two of every three new
acts are its fresh choice, and about 60% of the day is spent in an act it has just chosen; the other 40% is spent in
an act the gate kept**, which continues the model's own earlier choice (or, at the end of a trip, the feeding the
gate begins in the tree it reached) without asking it again. The rules decide almost nothing for these animals
(under 1%). "Matches the rules" with the gate on would therefore mean: the model chose every intention, and code
decided how long each was held.

### 5.4 Limits and confidence

Ten animals in two worlds, five days, the rest of each world on the rules, one base (0.5), the rules' pick kept on
the menu; the lean window is five animals of one seed. Seven calls in 10,082 timed out and went to the rules.

- High: the gate does not change the first adapter's intake shortfall (the same −92 kcal on the same ten animals,
  all ten below the rules both ways); the gate removes the loop's extra walking for a kernel that agrees with the
  rules; the model's fresh choices cover about 60% of the day with the gate on.
- Moderate: the third adapter with the gate on feeds like the rules in a rich or middle stretch and walks about half
  as far again (ten animals, nine above the rules on distance); it does worse in a lean stretch (five animals).
- Low: anything past five days.

### 5.5 Open for the user

1. **Make gate-on the standard for engine comparisons?** With it off, even the rules' own top option fails the
   distance condition.
2. **Which adapter goes forward, if any?** `r4-rules-state` under-feeds by 6% with or without the gate.
   `r4c-rules-state` with the gate feeds like the rules and over-travels by half, and loses intake in a lean stretch.
   Neither meets the registered rule.
3. **Whether the distance condition should stay as strict** (the rules' spread across animals, 0.84 km) is yours;
   it was fixed before the run and (d) fails it clearly (+1.35 km, interval +0.68 to +2.02).

### Checks at the end (8 October 2026; no model process running)

`tsc --noEmit -p .` clean; `gen-params --check` clean (1,046 entries); the full `pnpm test` once (scripts changed):
**1,100 tests, 1,100 pass, 0 fail, 0 skipped** (3 min 17 s; it holds `tests/r4b.test.ts` 8 of 8 and
`tests/r5-pilot.test.ts`). Against track-e 6d5fff2 the stage changes `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, files
under `docs/staging/`, two scripts, one new script and one test: nothing under `src/` or `data/`, no switch default,
no golden, no fixture. Not done: the 0.25 base and the rules' pick removed were not run (not registered here).
