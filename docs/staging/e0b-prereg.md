# E0b pre-registration: hidden timers, an honest count

Status: rules (§0–§5) committed before any change to the lint, its tables or its tests (branch `e0b-hidden-timers`,
from `track-e` 6980f48; 4 October 2026). Track E, stage E0b. This stage is about the honesty of the prescription
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

## 6. Results

(Written after step 2, below this line; §0–§5 are not edited after their commit. Amendments, if any, are added here
and disclosed.)
