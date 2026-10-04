# E0b pre-registration: hidden timers, an honest count

Status: complete (4 October 2026): 13 time literals newly counted on today's model (134 → 147) and 10 on S27 (41 → 51);
results in §6. The rules (§0–§5) were committed (d6bfccc) before any change to the lint, its tables or its tests (branch
`e0b-hidden-timers`, from `track-e` 6980f48). Track E, stage E0b. This stage is about the honesty of the prescription
count, not about behaviour: no simulation benchmark, no behaviour change, no literal moved into `data/params.json`,
goldens unchanged. Rule served: a prescription is counted by what it does, whether it is written as a registry entry or
as a literal.

## 0. The problem

- The headline (`scripts/prescription-ledger.ts`, `scripts/lib/prescriptions.ts`) is the outcome-encoding registry
  entries in use plus the literals in `src/sim` that `lintSource` counts. The lint counts three kinds only: an hour of
  the day, a dice roll against a fixed number, a time-of-day menu.
- A behavioural interval written as a literal is not counted, although the same value as a registry entry would be
  (classify() rule 5e, quota: "at most one act per fixed interval"). Example: `time - x.lastMate > 0.3` (a female's
  mating cooldown, candidates.ts) and mateTick's 0.5-h block after a failed approach (execution.ts), which E4o found
  (e4o-prereg.md §5) next to the registry's own `mateIntervalH` (counted, quota).
- Literal bonuses inside offer scores that a time comparison switches on (e.g. `0.2 + (time - x.victimAt < 1 ? 0.3 : 0)`)
  raise the same question for bonuses: the registry counts a bonus only by judgement (OVERRIDES: `continueBonus`,
  `finishedPenalty`, `nestNightBonus`, `rhythmDarkW`).

Counts before this stage (`pnpm exec tsx scripts/prescription-ledger.ts --count [--params …]` at 6980f48; S27 =
`bench-run3/artifacts/validation/e/s26/S27-params.json`, identical to `STACKS.S27` in scripts/decision-guide.ts):

| Parameter set | Count | Registry entries in use | Literals |
| --- | --- | --- | --- |
| today's model (every switch 0) | 134 | 125 | 9 |
| S27 | 41 | 40 | 1 |
| S27 + `redecideValue` 2 | 39 | 38 | 1 |
| S27 + `departValue` 2 | 39 | 38 | 1 |
| S27 + `bodyRules` 1 | 40 | 39 | 1 |

## 1. What the lint looks for (two new kinds)

A **time literal** is a numeric literal, or a product or quotient of numeric literals and named unit constants
(`10 / 60`, `24 * 30`, `3 * MONTH`, `2 * TICK_HOURS`), that enters the simulation's clock arithmetic in `src/sim`
(generated files excluded, as now). T is the clock: `world.time`, or a local copy of it named `time` or `now`; s is a
stored time (a stamp or a deadline); N the literal.

Kind **`interval`**, one record per line (as the other kinds), values = every N on the line:
1. elapsed time compared with N: `T − s ⋚ N`, `N ⋚ T − s`, `s ⋚ T − N`, `T ⋚ s + N` (also when the elapsed time is
   scaled first, `(T − s) / k ⋚ N`);
2. a deadline or a backdated stamp: `T + N` (`x.until = T + N`), `T − S + N`;
3. a cadence: `tick % N`, `actionTime % N`;
4. the gap of the event log's rate limiter, `gate(world, key, N)` (events.ts), every numeric literal in its third
   argument.

Kind **`bonus`**: a ternary whose condition is a comparison of the clock with a stored time (`T − s ⋚ N`, `T ⋚ s`,
`s ⋚ T`) and whose branches are numeric literals, e.g. `(time >= x.actEnd ? -0.25 : 0.35)`; values = its non-zero
branches. (Such a line also holds an `interval` record when the condition carries N.)

Not time literals: a literal that only converts the units of a registry value (`24 * P.epidemicIllDays`,
`P.departRetryMin / 60`): the registry entry carries the value and its class. Comments and string text are not code
(as now).

Not linted, with the reason (none of these can be a counted prescription under §2, so the lint does not look):
- the duration of the current act, however written (`c.actionTime ⋚ N`, `x.prog ⋚ N`, `x.phase > N`, the walk time plus
  a margin in a trip's scheduled end): bout lengths, fight lengths and give-up times, design by the ledger's own
  convention for `bout*Min`/`Max` and `mateApproachS` (the clock-window exceptions are counted by the hour lint);
- an elapsed time held in a local variable and compared on a later line (life.ts `slimDead`, `dead`: the storage of the
  dead, §2 L1);
- one-tick offsets (`world.tick - 1`): the tick's own resolution, not a chosen interval.
A search outside these patterns (every line of `src/sim` outside the world files that puts the clock in arithmetic or
a comparison and holds a numeric literal: 123 lines at 6980f48, each read) found no other form; the rest hold registry
values, unit conversions, named constants or numerical bounds (patrol.ts `daylightLeftH`'s 14-h search horizon,
circadian.ts's integration step). A later stage that writes a timer in another form must add its pattern.

## 2. When a time literal is a counted prescription (mirroring classify())

A time literal is classed as the registry entry it would be: the same value, its time unit (h, s, ticks), the group of
the code that reads it, evidence `design` (gen-params `--check` keeps evidence-tagged literals out of `src/sim`, and no
comment cites a field value or a fit for any of them). classify() then decides; for a time literal its rules come down
to these questions, in order, the first that applies deciding:

- **L0 World files** (WORLD_FILES: environment, phenology, weather, stream, generation): not counted (rule 3), as now.
- **L1 Not behaviour** (rule 3 for the groups `observer`, `memory`, `scale`; the overrides `encounterGapH`,
  `contactSeenGapH`, "bookkeeping"): not counted when no rule of behaviour reads what the literal sets under the rules
  policy: (a) scheduling of world processes (tick.ts hourly, six-hourly and daily passes); (b) logging: the event log,
  episodes, the monthly digests, `gate()`; (c) display: interactions and calls kept for drawing, observe() text, the
  model's facts; (d) storage: buffers and the pruning of stored keys, when every window that reads them is shorter;
  (e) the instruments: the interventions' stimuli; (f) the model's decision loop (model-driven chimps only; Track E runs
  the rules policy).
- **L2 Fitted** (rules 2 and 6): a comment says the value was fitted or tuned: counted. None expected.
- **L3 Quota** (rule 5e: an id the registry would end in `Gap`, `Repeat` or `Interval`; the override
  `patrolStopEveryMin`): counted when the literal is the interval in a comparison of the clock with a stamp of the same
  animal's (or its pair's or community's) own previous act and it bars an act until the interval has passed (the option
  is not offered, the act not done or its outcome not drawn), whatever the animal's state. The stamp may be of the same
  act or a related one (the animal's last call of any kind, its last aggression of any kind: the registry's
  `contactCallGapH` reads the last call, `feedChargeGapH` and `immigrantChargeGapH` the last aggression). Also a quota,
  by `patrolStopEveryMin`'s judgement (†): a fixed period at which an act, or a part of an act that other animals
  perceive and act on, is repeated.
- **L4 Clock** (the override `rgMaxAgeH`): a fixed time after which an intention is re-decided whatever the state:
  counted. None expected (bout lengths are design, §1).
- **L5 Field copy** (rule 7): a comment gives the value as a field value of the behaviour (evidence H or M): counted.
  None expected.
- **L6 Design** (rule 8; the registry's windows and durations: `redirectWindowH`, `consoleWindowH`, `coalitionWindowH`,
  `reconcileWindowH`, `reunionH`, `strangerCallerWindowH`, `patrolHeardWindowH`, `impulseDurationH`,
  `interruptSpacingMin`, `departCheckMin`, `assocEveryMin`, `bout*`, `memTtl*`): not counted when the literal is
  (a) a window: how long the response to an event that happened to the animal or around it, a percept, an impulse or a
  memory stays open (the stamp is that event's time, not the animal's own act of the gated kind);
  (b) a cadence of a check, a re-target or an interrupt (not an act others perceive);
  (c) a duration of the current act (a bout, a fight) written as a deadline;
  (d) an episode definition: a window that makes one event (an attack, an encounter, an alert) count once, so that a
  counted probability or a log line applies once per event (as `encounterGapH` defines one encounter; †).
- **L7 One prescription, one count**: the same rule written on two lines is counted once, on the line that runs; when
  both run in one world, on the general one (as the nest gate is counted once, tests/prescription-ledger.test.ts).

Every match that is not counted gets a LITERAL_ALLOW entry (file, a piece of the line, the kind, the reason), and every
allow entry must match exactly one line (a test), so an allow never covers new code silently. A match with no entry is
counted: the conservative default, as for hours and dice.

## 3. Bonuses (the second question)

A `bonus` record is counted only as the registry's judgement counts a bonus (OVERRIDES), no stricter and no looser:
- **B1 counted**: the term rewards carrying on with the current act or penalizes repeating the act just done
  (`continueBonus`: "fixed bonus for carrying on with the current act: sets bout persistence directly";
  `finishedPenalty`: "fixed penalty on the act just finished: sets act switching directly");
- **B2 counted**: the term is a clock or phase-of-day term with no state behind it (`nestNightBonus`, `rhythmDarkW`);
- **B3 not counted** (rule 8): a weight on the response to an event or a percept (being attacked, a call heard), or an
  indicator of a state that design weights multiply (the hierarchy unstable), whatever its size.
The window that switches a counted bonus on is part of it: one prescription, counted as the `bonus` record; the
`interval` record on the same expression is then allowed with that reason. A window that switches on an uncounted term
is judged by §2 on its own.

Literal score terms switched on by something other than a clock comparison (fixed scores for continuing an act, terms
switched by darkness) are outside this stage's lint; they are listed in the results, not classed.

## 4. In use under a parameter set

- **U1** A counted literal is in use under a parameter set unless a LITERAL_OFF entry takes it out (as ACTIVE_WHEN
  does for registry entries). LITERAL_OFF entries gain an optional kind; without one they cover every kind on the line
  (the existing entries keep their meaning).
- **U2** A LITERAL_OFF entry is written only when (a) a code read shows that the expression holding the literal is not
  evaluated under those switches (its branch is not taken), and (b) `scripts/param-reads.ts --literals` (new: the
  literal moved ×2 in a scratch copy of `src/`, field profile, development seeds 48 and 7, a few eco-days) finds that
  moving it changes the world without the switch and leaves the world with the switch hash-identical, or a unit test
  shows it. If the window does not reach the branch, the code read decides and the entry's reason says so.
- **U3** "In use on today's model and on S27" in the results = not taken out by LITERAL_OFF there; the same tool reports,
  for every counted literal, whether moving it changes each world in the window (a read that matters). A counted literal
  whose branch the window does not reach is listed with what it waits for; nothing is claimed beyond the code read.
- **U4** A literal in code that only a switch at 1 reaches is off unless that switch is on (as `departRace`'s nest
  gate). The decision guide assumes the stack only removes prescriptions: if a literal counts on S27 and not on today's
  model, stop and report it.

## 5. What this stage delivers and checks

1. This file's rules, committed before step 2.
2. `lintSource` kinds `interval` and `bonus`; LITERAL_ALLOW and LITERAL_OFF with an optional kind; an allow for every
   non-counted match with its reason (§2, §3); LITERAL_OFF entries verified as in §4; tests for each new kind (synthetic
   sources), the exactness of every allow and off entry, a sample of allows, and the count once rule.
3. Counts before and after for today's model, S27 and S27 + each candidate (`redecideValue` 2, `departValue` 2,
   `bodyRules` 1), and a table of every newly counted literal (file:line, text, kind, value, in use on today's model and
   on S27), generated by a script from the ledger, never typed.
4. The decision guide: every newly counted literal in one domain and one box of scripts/lib/decision-guide-content.ts
   with one plain line; `docs/decision-guide.html` regenerated; `scripts/decision-guide.ts --check` passes.
5. Final checks: `gen-params --check`, `tsc --noEmit`, `pnpm test` (0 fail, goldens unchanged) after one merge of
   `track-e`; `git ls-files data/raw node_modules` prints nothing.

Anything the rules above cannot decide is listed in the results and left as it is, not guessed.

## 6. Results (4 October 2026; §0–§5 unchanged since d6bfccc)

Tables generated from the ledger and the JSON of `scripts/param-reads.ts --literals` by
`artifacts/validation/e0b/tables.mts` (local, gitignored, with the runs' JSON and Markdown); none typed.

### 6.1 What the lint finds

At 24c0cef the two new kinds find 68 records in `src/sim` (world files excluded). 13 prescriptions are counted on
today's model and 10 on S27; they are 14 records, because the grooming continuation terms are one prescription written
on two lines, counted on whichever line the switches run (L7; `LITERAL_OFF` `same`). The other 54 records are not
counted, each with the rule of §2 or §3 that excuses it (§6.5). Every allow, off, twin and judgement entry matches exactly
its lines (tests/prescription-ledger.test.ts), so no entry can cover new code silently, and a time literal that no entry
names is counted. No literal counts on S27 that does not count on today's model (U4).

### 6.2 Counts before and after

Counts (`scripts/prescription-ledger.ts --count`; before: §0 at 6980f48; after: 24c0cef):

| Parameter set | Before | After | Registry entries in use | Literals | Time literals counted |
| --- | --- | --- | --- | --- | --- |
| today's model (every switch 0) | 134 | 147 | 125 | 22 | 13 |
| S27 | 41 | 51 | 40 | 11 | 10 |
| S27 + `redecideValue` 2 | 39 | 48 | 38 | 10 | 9 |
| S27 + `departValue` 2 | 39 | 49 | 38 | 11 | 10 |
| S27 + `bodyRules` 1 | 40 | 50 | 39 | 11 | 10 |

The candidates on S27 before → after: `redecideValue` 2 removes 2 → 3 (it also takes out the grooming continuation
terms, which E3d had already stopped applying in code: candidates.ts, "the bout's own continuation terms (+0.35 while it
runs, −0.25 after its scheduled end; literals) are not applied"); `departValue` 2 removes 2 → 2; `bodyRules` 1 removes
1 → 1. No new literal sits on code that `departValue` or `bodyRules` change. Tests that pinned `redecideValue`'s delta
move by one (tests/sim-redecide.test.ts 2 → 3, tests/sim-choice-belief.test.ts 3 → 4).

### 6.3 Every newly counted literal

Every newly counted literal (the `interval` and `bonus` records counted on today's model or on S27). "In use" is the ledger's verdict (U1); "moved" is `scripts/param-reads.ts --literals` (seeds 48, 7, 5 eco-days): in how many seeds moving the literal ×2 changed that world.

| Where | Code | Kind | Value | In use today | In use S27 | Moved today (5 d; 20 d; 1 d + snake-model) | Moved S27 (5 d; 20 d; 1 d + snake-model) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src/sim/candidates.ts:686 | `? (grooming && !(P.redecideValue >= 1) ? (time >= x.actEnd ? -0.25 : 0.35) : 0) + (1 - …` | bonus | -0.25, 0.35 score | no | yes | 0/2; ·; · | 2/2; ·; · |
| src/sim/candidates.ts:687 | `: (grooming && !(P.redecideValue >= 1) ? (time >= x.actEnd ? -0.25 : 0.35) : 0) - femal…` | bonus | -0.25, 0.35 score | yes | no | 2/2; ·; · | 0/2; ·; · |
| src/sim/candidates.ts:775 | `if (male && e > 0.3 && time - x.lastDisplay > 0.75) {` | interval | 0.75 h | yes | yes | 2/2; ·; · | 2/2; ·; · |
| src/sim/candidates.ts:799 | `if (c.age >= 5 && d < P.snakeAlarmRangeM) offer('alarm', -1, 0.2 + 0.32 * Math.min(unaw…` | bonus | 0.4 score | yes | yes | 0/2; ·; 2/2 | 0/2; ·; 1/2 |
| src/sim/candidates.ts:946 | `const cooled = time - x.lastAgg > 1.5;` | interval | 1.5 h | yes | yes | 2/2; 2/2; · | 0/2; 2/2; · |
| src/sim/candidates.ts:1098 | `else if (c.sex === 'male' && own >= 3 && own >= str + 2 && time - x.lastAgg > 0.2) {` | interval | 0.2 h | yes | yes | 0/2; 0/2; · | 0/2; 0/2; · |
| src/sim/candidates.ts:1158 | `if (c.sex === 'female' && c.swelling >= 0.75 && o.age >= 10 && dist < P.mateFemaleRange…` | interval | 0.3 h | yes | yes | 2/2; ·; · | 2/2; ·; · |
| src/sim/candidates.ts:1288 | `const callReady = time - x.lastCall > 0.5;` | interval | 0.5 h | yes | yes | 2/2; ·; · | 2/2; ·; · |
| src/sim/candidates.ts:1294 | `if (!cv && time - x.lastCall > 1.5 && ((hour >= 18 && hour < 19) \|\| (hour >= 6.4 && hou…` | interval | 1.5 h | yes | no | 2/2; ·; · | 0/2; ·; · |
| src/sim/execution.ts:807 | `if ((courting \|\| hd(r, o) < 2.5) && dominates(c, r) && time - x.lastAgg > 0.25) { x.riv…` | interval | 0.25 h | yes | yes | 2/2; ·; · | 2/2; ·; · |
| src/sim/execution.ts:838 | `if (c.actionTime % 60 === 0 && c.actionTime > 0) emitCall(world, c, 'alarm-hoo');` | interval | 60 s | yes | yes | 0/2; ·; 2/2 | 0/2; ·; 1/2 |
| src/sim/execution.ts:1063 | `} else if (crop > 0.55 && c.age >= 12 && time - x.lastCall > 0.75 && (t.common === 'fig…` | interval | 0.75 h | yes | no | 2/2; ·; · | 0/2; ·; · |
| src/sim/execution.ts:1066 | `} else if (time - x.lastFoodCall > 0.3 && crop > 0.3 && (P.foodCallRule !== 1 \|\| random…` | interval | 0.3 h | yes | no | 2/2; ·; · | 0/2; ·; · |
| src/sim/execution.ts:1212 | `if (!moveTo(world, c, o.position[0], o.position[1], o.position[2], WALK * 1.2, 1)) { if…` | interval | 0.5 h | yes | yes | 2/2; 2/2; · | 0/2; 0/2; · |

The five families (all there are):
1. **Call gaps** (4; candidates.ts, execution.ts): the food call and a male's reunion pant-hoot wait 0.5 h after the
   caller's own last call (`callReady`), the chorus 1.5 h, the arrival pant-hoot at figs 0.75 h, the food grunt 0.3 h
   after the last food grunt. `callValue` takes three out; the reunion pant-hoot keeps the 0.5-h gap on S27.
2. **Aggression gaps** (3; candidates.ts): status, grudge and coercive charges, an adolescent male's charges at adult
   females and E4a's escalated attack wait 1.5 h after the animal's own last charge or attack (`cooled`); a charge at
   strangers waits 0.2 h; a display 0.75 h after the last display. E5e took out the two registry gaps beside them
   (`feedChargeGapH`, `immigrantChargeGapH`); these stayed because they were literals.
3. **Mating gaps** (3; candidates.ts, execution.ts): a swollen female solicits at most once per 0.3 h after mating; a male
   is blocked 0.5 h after a failed approach (mateTick, counted once for its two exits, L7); a mate guard chases a rival at
   most once per 0.25 h after his own last aggression. E4o found the first two (e4o-prereg.md §5).
4. **Snake alarms** (2; candidates.ts, execution.ts; both judgement calls, †): an alarm call is worth 0.4 less within
   1.8 min of the animal's own last call (B1, by `finishedPenalty`'s judgement); an alarming animal hoos every 60 s and
   listeners near the snake become aware from the hoos (L3, by `patrolStopEveryMin`'s judgement). Snakes appear only in
   experiments.
5. **Grooming continuation** (1; candidates.ts): +0.35 while a grooming bout runs and −0.25 after its scheduled end, on
   top of `continueBonus` (B1: `continueBonus`'s and `finishedPenalty`'s own judgement, not a judgement call).

### 6.4 In use (§4)

- **LITERAL_OFF entries (U2)**: the code read of each (food grunt: the `else` branch after `callValueOn(P)`; the
  grooming terms: `grooming && !(P.redecideValue >= 1)` and `needDyad`'s branch) and `param-reads --literals` (seeds
  48 and 7, 5 eco-days, eight arms) agree: every literal the ledger switches out under an arm leaves that arm's world
  hash-identical when moved ×2, and moves the world wherever it is counted. No over-claim.

The switch arms (LITERAL_OFF entries, U2): ledger verdict and moves under each arm.

| Where | Kind | off | S27 | callValue | groomDrive | redecideValue | S27+redecideValue=2 | S27+departValue=2 | S27+bodyRules=1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| src/sim/candidates.ts:686 | bonus | off 0/2 | counted 2/2 | off 0/2 | counted 2/2 | off 0/2 | off 0/2 | counted 2/2 | counted 2/2 |
| src/sim/candidates.ts:687 | bonus | counted 2/2 | off 0/2 | counted 2/2 | off 0/2 | off 0/2 | off 0/2 | off 0/2 | off 0/2 |
| src/sim/candidates.ts:775 | interval | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 |
| src/sim/candidates.ts:799 | bonus | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 |
| src/sim/candidates.ts:946 | interval | counted 2/2 | counted 0/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 1/2 | counted 1/2 | counted 0/2 |
| src/sim/candidates.ts:1098 | interval | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 |
| src/sim/candidates.ts:1158 | interval | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 |
| src/sim/candidates.ts:1288 | interval | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 2/2 | counted 0/2 | counted 2/2 |
| src/sim/candidates.ts:1294 | interval | counted 2/2 | off 0/2 | off 0/2 | counted 2/2 | counted 2/2 | off 0/2 | off 0/2 | off 0/2 |
| src/sim/execution.ts:807 | interval | counted 2/2 | counted 2/2 | counted 2/2 | counted 1/2 | counted 0/2 | counted 2/2 | counted 2/2 | counted 2/2 |
| src/sim/execution.ts:838 | interval | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 |
| src/sim/execution.ts:1063 | interval | counted 2/2 | off 0/2 | off 0/2 | counted 2/2 | counted 2/2 | off 0/2 | off 0/2 | off 0/2 |
| src/sim/execution.ts:1066 | interval | counted 2/2 | off 0/2 | off 0/2 | counted 2/2 | counted 2/2 | off 0/2 | off 0/2 | off 0/2 |
| src/sim/execution.ts:1212 | interval | counted 2/2 | counted 0/2 | counted 1/2 | counted 1/2 | counted 0/2 | counted 0/2 | counted 0/2 | counted 0/2 |

- **The twin lines (L7)**: under `groomNeedDyad` 1 (E1k, recorded, off) mother–offspring pairs run the need-weighted
  line while every other pair runs the general one; the prescription is counted once, on the general line, and the tool
  marks the other "twin counted" (seeds 48 and 7, 3 eco-days):

| Literal | Kind | Values | off | groomNeedDyad | groomDrive |
| --- | --- | --- | --- | --- | --- |
| src/sim/candidates.ts:686 | bonus | -0.25, 0.35 | off, moves 0/2 | off, moves 2/2 **twin counted (L7)** | counted, moves 2/2 |
| src/sim/candidates.ts:687 | bonus | -0.25, 0.35 | counted, moves 2/2 | counted, moves 2/2 | off, moves 0/2 |

- **Counted literals in use (U3)**: every counted literal is on a path no switch of S27 or of the three candidates takes
  out, and moving it changes today's model or S27 within the windows above, except two: the charge at strangers
  (candidates.ts:1098; inert in 5 and 20 days on both models and seeds: it waits for a male who sees strangers with at
  least three own males, two more than theirs, within 0.2–0.4 h of his own last aggression) and, on S27 only, the block
  after a failed mating approach (execution.ts:1212; it moves today's model, and waits on S27 for a failed approach). For
  these two nothing is claimed beyond the code read. The two snake-alarm literals change both worlds once a snake model is
  presented (`--intervene snake-model@8`, 1 eco-day): today's model 2/2 seeds, S27 1/2.

### 6.5 Not counted

Not counted (54 records; LITERAL_ALLOW, with the rule that excuses each):

| Where | Kind | Values | Why |
| --- | --- | --- | --- |
| src/sim/candidates.ts:295 | bonus | 1 score | an indicator of a state (the hierarchy unstable for instabilityH after a change at the top) that design weights multiply (e0b §3 B3) |
| src/sim/candidates.ts:543 | interval | 0.3 h | window: a pant-hoot heard from a community member stays a call to join for 0.3 h, on both branches (socialTiming bit 4 or not; the stamp is the call heard; as strangerCallerWindowH) (e0b §2 L6a) |
| src/sim/candidates.ts:559 | interval | 0.3 h | window: a pant-hoot heard from a community member stays a call to join for 0.3 h, on both branches (socialTiming bit 4 or not; the stamp is the call heard; as strangerCallerWindowH) (e0b §2 L6a) |
| src/sim/candidates.ts:734 | interval | 1 h | window: a recent immigrant female follows an adult male more in the hour after she was attacked (the stamp is the attack; as redirectWindowH) (e0b §2 L6a) |
| src/sim/candidates.ts:734 | bonus | 0.3 score | a weight on the response to an event (being attacked), not a persistence or clock term (e0b §3 B3) |
| src/sim/candidates.ts:799 | interval | 0.03 h | the window of the counted alarm penalty on this line: one prescription, counted as the bonus (e0b §3) |
| src/sim/candidates.ts:1022 | interval | 0.05 h | window: a guardian defends its ward for 3 min after the ward was attacked (the stamp is the attack on the ward; as coalitionWindowH) (e0b §2 L6a) |
| src/sim/candidates.ts:1053 | interval | 0.03 h | window: the responses to a charge or an attack (flee, submit, counter) are open for 1.8 min after it (an event that happened to the animal) (e0b §2 L6a) |
| src/sim/candidates.ts:1112 | interval | 0.2 h | window: the response to stranger pant-hoots heard (approach, counter-call, flee) is open for 0.2 h (a percept; as patrolHeardWindowH) (e0b §2 L6a) |
| src/sim/conflict.ts:58 | interval | 0.1 h | episode: a bystander alerted to a conflict between the same two animals in the last 0.1 h is not alerted again (the stamp is the alert, not its own act) (e0b §2 L6d) |
| src/sim/conflict.ts:128 | interval | 1, 0.75, 2 h | logging: rate limit of the event log line for a conflict (events.ts gate) (e0b §2 L1b) |
| src/sim/conflict.ts:225 | interval | 0.025 h | duration of the current act: a contact fight lasts 1.5 min (a bout length, design) (e0b §2 L6c) |
| src/sim/conflict.ts:228 | interval | 0.025 h | duration of the current act: the opponent's side of the same fight (e0b §2 L6c) |
| src/sim/conflict.ts:274 | interval | 0.5 h | episode (judgement call): the lethal outcome of a gang attack is drawn once per attack on a victim (0.5 h), however many attackers' ticks reach it; the killing rate is set by the gangKill* probabilities, which are counted (as encounterGapH defines one encounter) (e0b §2 L6d) |
| src/sim/decide.ts:28 | interval | 0.0166667 h | the model's loop: a model-driven chimp waiting for its decision re-checks every minute (model arms only) (e0b §2 L1f) |
| src/sim/ecology.ts:49 | interval | 0.25 h | window and storage: a hunt its hunters left unresolved stays joinable and is pruned 0.25 h after its resolution time (a resolved hunt is removed at once by resolveHunt) (e0b §2 L6a, L1d) |
| src/sim/events.ts:28 | interval | 0.25 h | logging: an episode repeated within 0.25 h updates the last entry (e0b §2 L1b) |
| src/sim/events.ts:60 | interval | 0.0166667 h | display: a brief interaction is drawn for 1 min (e0b §2 L1c) |
| src/sim/execution.ts:313 | interval | 3 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:412 | interval | 12 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:418 | interval | 24 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:700 | interval | 2 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:774 | interval | 1 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:802 | interval | 4 ticks | cadence of a check: a guarding male scans for rival males every 4 ticks (1 min; as departCheckMin) (e0b §2 L6b) |
| src/sim/execution.ts:1030 | interval | 16 ticks | cadence of a re-target: an animal feeding on the ground picks a new spot every 16 ticks (4 min), staggered by id (e0b §2 L6b) |
| src/sim/execution.ts:1087 | interval | 2 × TICK_HOURS | duration of the current act: a feeding bout in a crown not yet emptied is extended two ticks at a time, up to feedMaxMin (a bout length, design) (e0b §2 L6c) |
| src/sim/execution.ts:1098 | interval | 16 ticks | cadence of a re-target: an animal feeding on the ground picks a new spot every 16 ticks (4 min), staggered by id (e0b §2 L6b) |
| src/sim/execution.ts:1145 | interval | 4 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:1157 | interval | 1 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:1164 | interval | 2 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:1175 | interval | 120 s | display: a laugh every 2 min of play; no animal hears laughs (events.ts emitCall's hearing hook takes pant-hoots, drums, alarm hoos, screams and travel hoos) (e0b §2 L1c) |
| src/sim/execution.ts:1179 | interval | 3 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:1205 | interval | 3 h | logging: rate limits of event log lines (events.ts gate; each call writes addEvent or episode) (e0b §2 L1b) |
| src/sim/execution.ts:1217 | interval | 0.5 h | the same 0.5-h block after a failed approach as mateTick's first exit above: one prescription, counted there (e0b §2 L7) |
| src/sim/interventions.ts:140 | interval | 0.25 h | the instruments: an experiment's stimulus is removed 0.25 h after its end, with the list of animals aware of it (e0b §2 L1e) |
| src/sim/life.ts:287 | interval | 720 h | memory window: the bond to a dead non-kin animal is dropped 30 days after the death (as memTtl*) (e0b §2 L6a) |
| src/sim/life.ts:342 | interval | 48 h | storage: event-gate keys older than 48 h are pruned; the longest gate is 24 h (e0b §2 L1d) |
| src/sim/life.ts:343 | interval | 24 h | storage: encounter keys older than 24 h are pruned; encounterGapH (12 h) and the 0.2-h party key read them (e0b §2 L1d) |
| src/sim/observe.ts:83 | interval | 0.05 h | display: observe() text for model-driven chimps (an interrupt shown 3 min) (e0b §2 L1c) |
| src/sim/observe.ts:114 | interval | 0.25 h | display: observe() text for model-driven chimps (strangers heard in the last 0.25 h) (e0b §2 L1c) |
| src/sim/parties.ts:116 | interval | 0.2 h | cadence of an interrupt: two parties of different communities in sight are processed (members interrupted, the meeting noted) at most every 0.2 h; the encounter count has its own encounterGapH (e0b §2 L6b) |
| src/sim/perception.ts:291 | interval | 24 h | memory window: strangers heard in the last 24 h raise the C6 patrol hazard by patrolHeardBeta (0 in the field profile) (e0b §2 L6a) |
| src/sim/perception.ts:291 | bonus | 1 score | an indicator of a memory (strangers heard), multiplied by a registry weight (e0b §3 B3) |
| src/sim/perception.ts:387 | interval | 0.08 h | cadence of an interrupt: hearing strangers interrupts the animal at most every 0.08 h (as interruptSpacingMin) (e0b §2 L6b) |
| src/sim/relations.ts:115 | interval | 6 h | logging: one intergroup encounter per 6 h in the monthly digest (text and the model's facts) (e0b §2 L1b) |
| src/sim/relations.ts:134 | interval | 3 × MONTH | memory window: an incident (who threatened or attacked whom) is forgotten after 3 months (as memTtl*); grudge charges read it (e0b §2 L6a) |
| src/sim/reproduction.ts:85 | interval | 2 h | window: the impulse to transfer, once the dispersal hazard (counted) has fired, stays open 2 h (as impulseDurationH) (e0b §2 L6a) |
| src/sim/rg.ts:89 | interval | 0.25 h | window: stranger pant-hoots heard in the last 0.25 h keep a response on the rules' menu (a percept) (e0b §2 L6a) |
| src/sim/tick.ts:94 | interval | 3 h | logging: rate limit of the event log line for rain (events.ts gate) (e0b §2 L1b) |
| src/sim/tick.ts:110 | interval | 0.5 h | display: an ended interaction is kept 0.5 h for drawing (e0b §2 L1c) |
| src/sim/tick.ts:114 | interval | 0.166667 h | storage: calls are kept 10 min; the longest window that reads them, strangerCallerWindowH, is 0.05 h (e0b §2 L1d) |
| src/sim/tick.ts:118 | interval | 1 h | scheduling: the hourly pass of world processes (allies, hourly life, shared contacts) (e0b §2 L1a) |
| src/sim/tick.ts:124 | interval | 6 h | scheduling: the six-hourly summary (e0b §2 L1a) |
| src/sim/tick.ts:125 | interval | 24 h | scheduling: the daily pass of world processes (e0b §2 L1a) |

### 6.6 Judgement calls, and what this stage did not decide

- Counted as judgement calls (†, LITERAL_JUDGEMENT): the alarm hoo every 60 s (L3, `patrolStopEveryMin`'s judgement)
  and the alarm penalty (B1, `finishedPenalty`'s). Not counted, a judgement call: the gang attack's kill draw, once per
  0.5 h per victim (conflict.ts:274; L6d, `encounterGapH`'s judgement: it defines one attack for a counted
  probability). Read instead as a quota on the outcome draw, it would add one on both models.
- Outside this stage's lint, listed and not classed (§3): fixed scores for carrying on with an act (`V.CONTINUE`: the
  consortship's 0.9, candidates.ts:1128; the patrol's 1.25, candidates.ts:1267; the transfer's 1.2 and 1.3,
  candidates.ts:803); 9 score terms switched by darkness (`night ? N : 0`, e.g. grooming −1.5, mating −2) and 5 offers
  barred in darkness (`!night`); the 3-male rule for confronting strangers (ENCODED_BY T-IGE-4). By the registry's
  judgement (`continueBonus`, `nestNightBonus`, the night menu) some of these may be prescriptions; a later stage
  decides.
- Durations of the current act (give-up times, a fight's 30 s, a display's 45 s) are design by the ledger's convention
  for bout lengths (§1); the lint does not look at them.

### 6.7 The decision guide

`scripts/lib/decision-guide-content.ts`: `LITERALS` carry a kind (two kinds can share a line: the chorus line holds a
clock window and a gap), the 13 new keys with one plain label each (`judgement` on the two snake-alarm literals), their
domains (grooming 1, calls 6, aggression 3, mating 3) and steps. Boxes: new "Carrying on grooming", "Gaps after
aggression" (edge to the escalated attack, which reads the same 1.5-h gap), "A gap after a call" and "Alarm calls at a
snake" (the calls diagram's lower zone grows to two rows); the chorus, fig, food-grunt and mating boxes take their gaps.
Page prose (outside the generated regions): what counts now names the two new kinds; "What is still prescribed" names the
aggression, mating and call gaps and gets a grooming row; "What this page cannot show" lists what stays outside the lint.
Two stale sentences were removed while there: the wild-cost multiplier "counted by mistake" (design since the counting fix
1d177f8). `scripts/decision-guide.ts --check` passes; screenshots of the four changed figures (local) show no overlap.

### 6.8 Final checks (after `git merge --no-ff track-e` at 4111971, docs only)

`gen-params --check` clean (0 evidence-tagged literals outside the registry); `tsc --noEmit -p .` clean; `pnpm test` 825
tests, 824 pass, 0 fail, 1 skipped; no file under `src/`, `data/` or `tests/fixtures/` changed since 6980f48, so the
goldens cannot move; `scripts/decision-guide.ts --check` passes after the merge. For the integrator: the confirms track-e
registered meanwhile count, on this ledger, S31 (S27 + `departValue` 2 + `bodyRules` 1) 48 and S32 (+ `redecideValue` 2)
45 (`prescription-ledger.ts --count`; 38 and 36 on the old one).
