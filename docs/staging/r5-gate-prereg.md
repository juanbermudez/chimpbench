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
