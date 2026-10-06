# Stage R1b: how much does the choice matter (pre-registration)

Agent r1b-choice, branch `r1b-choice` from `track-e` 2137b62. Registered 6 October 2026, 07:21 EDT, before any run.
Specification: `IMPLEMENTATION_PLAN.md`, Track R, the direction amendment of 6 October 2026, the bullet "R1b" and "User
decisions on the open questions", items 1 and 2. The three switches are those of stage R1 (`docs/staging/r1-prereg.md`).
No code under `src/` or `data/` is changed; all three switches stay 0 by default.

The user's decisions, verbatim (6 October 2026):

- "Wadging: no value adopted as a claim about chimpanzees. Use 0.5 as the declared working base for the engine
  comparisons, 0.25 as the sensitivity check."
- "Kernel contract: keep the rules' pick on the menu for the main comparison and report "removed" as a second number;
  judge the random-engine test on daytime rows only and fix the night menu in the next stage; random engine drives
  animals aged 8 and over; run the gate both on and off."

## 1. The question

Today hand-written rules make every choice. The same loop (body and mind state, perception, the legal menu, the
legality re-check) is run twice: with the rules choosing, and with the null kernel choosing (uniform over the legal
menu, drawn from `world.rng`). A target row whose result does not move is set by the loop, that is by code other than
the choice. A row that moves is choice-sensitive. Only choice-sensitive rows can later show that a decision engine
drives behaviour.

Nothing here is judged as a keep. No input is tuned. No value of `pithFibreSwallowed` is a claim about chimpanzees: 0.5
is the declared working base, 0.25 the sensitivity check.

## 2. Design

**Base.** S39 with `pithFibreSwallowed` 0.5: `docs/staging/integrator-kit/params/M6-W50.json`, with its re-draws
`M6-W50-s1`, `-s2`, `-s3` (`rngSalt` 1 to 3). Sensitivity base: `M6-W25.json` (0.25). The null-kernel files add
`kernelSim`, `kernelGate` and `kernelNoRulesPick` to those files and change nothing else (checked when they were made:
the re-draws differ from the base by `rngSalt` only, the 0.25 file by `pithFibreSwallowed` only).

**Horizon.** The stage confirm, `e-bench --confirm`: seeds 48, 7, 21, 5, 11; 60 scored days after a 30-day burn-in.
No longer horizon. Through `scripts/e-run.ts` (plan, then run), one job per seed.

**Arms.**

| Arm | Run label | Parameter file | kernelSim / kernelGate / kernelNoRulesPick | What it is |
| --- | --- | --- | --- | --- |
| (a) | `R1b-rules`, `R1b-rules-s1`, `-s2`, `-s3` | `M6-W50.json`, `M6-W50-s1.json`, `-s2`, `-s3` | 0 / 0 / 0 | the rules: the reference group (4 runs, `rngSalt` 0 to 3) and its noise |
| (b) | `R1b-null` | `R1b-null.json` | 1 / 0 / 0 | null kernel, gate off, the rules' pick kept on the menu: **the main number** |
| (c) | `R1b-null-gate` | `R1b-null-gate.json` | 1 / 1 / 0 | null kernel, gate on, pick kept |
| (d) | `R1b-null-nopick` | `R1b-null-nopick.json` | 1 / 0 / 1 | null kernel, gate off, pick removed: the second number |
| (e) | `R1b-null-gate-nopick` | `R1b-null-gate-nopick.json` | 1 / 1 / 1 | null kernel, gate on, pick removed |
| (f) | `R1b-W25-rules`, `R1b-W25-null` | `M6-W25.json`, `R1b-W25-null.json` | 0 / 0 / 0 and 1 / 0 / 0 | the 0.25 base: the rules (1 run) and the null kernel with the gate setting of (b) |

Ten runs of five seeds: 50 seed jobs of 90 simulated days each.

**Running.** From the frozen detached checkout `.claude/worktrees/bench-r1b` of this branch's committed head, by
`docs/staging/integrator-kit/scripts/r1brun.sh`: one runner at a time, `--parallel 2`, `--budget-min 900`. Order:
`R1b-rules`, `R1b-null`, the three re-draws, (c), (d), (e), then (f). All ten runs are planned at one commit.

## 3. What the two kinds of run share, and where they differ (read from the code, before any run)

These are properties of stage R1's switches as merged. They are stated so the result is read correctly; none is
changed here.

1. **Who the null kernel drives.** Animals aged `rgMinAge` (8 years) and over (`src/sim/decide.ts` `decisionPoint`).
   Younger animals keep the rules in every arm, so rows about infants' and juveniles' own behaviour can move only
   through what the older animals do.
2. **The whole run is driven by the kernel, burn-in included.** `e-bench` builds the world with the parameter file and
   ticks it from day 0 (`scripts/lib/bench-run.ts`), so the null kernel also chooses during the 30-day burn-in. A null
   run is 90 days of random choice, scored on the last 60.
3. **The menu is built the same way but is not the same list.** Both are bounded menus of at most eight options (rest,
   the best target of each action type by rules score, then further partners; `src/sim/menu.ts` `boundedCandidates`).
   The rules' menu (`src/sim/rg.ts` `rgMenu`) also guarantees a noticed joint trip, a hunt the animal may lead at a
   colobus encounter and a patrol lead; the kernel's request (`src/sim/request.ts` `buildRequest`) guarantees only the
   rules' pick (arms b, c, f) and a response to a disturbance. So "uniform" means uniform over at most eight options
   that the rules' scores ranked, not over every legal act, and the three options the rules' menu guarantees reach the
   null kernel's menu only when the ranking puts them there.
4. **Night and dusk.** On this base (`rhythmFreeNight` 1) the rules draw from the open menu at any hour, while the null
   kernel's request applies the night and dusk menus (`src/sim/menu.ts` `phaseMenu`). After dusk the two kinds of run
   differ in the menu as well as in the kernel. This is why only daytime rows are judged (section 5). It does not stop
   night behaviour from reaching the day through the state the loop carries (sleep pressure, reserves, where the animal
   wakes up): that spill-over is part of every null arm and cannot be removed by choosing rows.
5. **The gate.** With `kernelGate` 0 (arms b, d, f) the null kernel draws again at every decision point, while the rules
   hold an intention between salient changes (inside `rgChoice`). With `kernelGate` 1 (arms c, e) the loop holds the
   null kernel's draw with the same gate function the rules use on this base (`redecideValue` 0). Arms b and d therefore
   change two things against the rules (who chooses, and that nothing is held); arms c and e change the choice only.
6. **What goes back to the rules.** A menu with fewer than two options, an invalid request, an invalid answer or an
   answer that is no longer legal is decided by the rules' argmax, without a draw and without an intention
   (`kernelStep`). With the pick removed (arms d, e) more menus are left with fewer than two options (42 of 147 sampled
   in R1's tests, compressed profile).
7. **The prescription count** (`scripts/prescription-ledger.ts`) counts registry entries and literals in use for a
   parameter set. It is 42 for every file here (checked for `R1b-null-gate-nopick.json` without a simulation), because
   the kernel switches are not prescriptions. It does not measure how much of the rules' scoring still acts in a null
   arm (it acts through the menu's ranking, the fallbacks and the young).

## 4. Smoke run (logged here before it runs)

**Purpose.** Confirm that `kernelSim` 1 hands decisions to the null kernel in `e-bench`'s path, and report who decided.

**What runs.** `scripts/r1b-smoke.ts` (new, measurement only: it reads through the two read-only taps of
`src/sim/decide.ts`, `kernelTap` and `rulesTap`, and writes no world), seed 48 only, field profile, 2 simulated days
(1 burn-in day and 1 observed day), for five parameter files: `M6-W50` (rules) and the four null files of arms b to e.
For each file it runs two passes: (A) `e-bench`'s own seed loop (`runBenchSeed` of `scripts/lib/bench-run.ts`, called
with the job `e-bench` builds for a seed) with the taps counting; (B) the same world ticked plainly, with the same
taps and a scan of each animal's decision counter after every tick, which also gives the decision points the loop's
gate held and the split by light phase. From the frozen checkout:

```
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r1b-smoke.ts --seed 48 --burn-in 1 --days 1 \
  --params-files rules=…/M6-W50.json,b=…/R1b-null.json,c=…/R1b-null-gate.json,d=…/R1b-null-nopick.json,e=…/R1b-null-gate-nopick.json \
  --out artifacts/validation/e/r1b/smoke
```

**Reported:** per arm, the share of decisions the null kernel made, the share that went back to the rules for a menu
with fewer than two options, for any other refusal, and the share made by the rules for animals under 8; the same
among animals aged 8 and over only; by light phase; decision points held by the gate; the kernel's menu sizes; how
often the kernel took the rules' pick.

**Stop rule.** The arms do not run, and I stop and report, if any of these fails:
- S1. in every null file the null kernel makes more than 0 decisions, and none for an animal under 8;
- S2. in the rules file no kernel pass happens;
- S3. the tap counts of pass A (the benchmark's loop) equal those of pass B (the plain loop).

Checked and reported, not stop conditions: with the gate on the kernel is asked less often and the gate holds some
decision points; with the pick removed the rules' pick is never on the kernel's menu. No threshold is set on the
shares; if the null kernel makes fewer than half of the decisions for animals aged 8 and over in arm (b), the result
statement says so in its first sentence. No code is changed to make the path work: if the benchmark's path cannot
drive the null kernel, that is the report.

## 5. Rows judged: daytime rows only (fixed before any arm runs)

Rule: a row is a candidate if it is not sealed, can score in a 60-day window, is scored by the benchmark on this base,
is counted by the scorer, and is measured on daytime behaviour: the observer's follows (in daylight, from nest to
nest) or a simulation-truth readout taken in daylight. Excluded as night, dusk or nest rows: rows whose definition
rests on the night nest, on when the active day starts or ends, on the hours between dusk and dawn, or on a 24-hour
total of which the night is a large part. A candidate is judged in an arm only if the scorer counts it (no
"compromised", "contested", "instrument below bar" or "not scorable" flag, no "window too short") and it carries a
value in every rules run and in the arm; otherwise it is listed as not judged, with the reason. A candidate that loses
its value under the null kernel (for example no hunts left to score) is listed as such: that is a result.

Three limits of the list, stated now: the follows include the short dusk period (the daytime rows carry a little of
the dusk menu); T-ENE-2 and T-ENE-3 are 24-hour totals of daytime acts (kept); T-SOC-14 to 16 count contests at any
hour (kept).

Printed by docs/staging/integrator-kit/scripts/judge_r1b.py list from data/targets.json (150 targets) and the classes in the script.

| class | rows |
| --- | --- |
| judged | 66 |
| night or nest | 9 |
| never counted | 5 |
| not scored | 21 |
| needs a year | 37 |
| sealed | 12 |
| all | 150 |

**Rows judged** (daytime rows that can score in 60 days; a row is judged in an arm only if the scorer counts it in every rules run and in the arm):

| row | family | role | scored on | metric | band | note |
| --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | activity budget | fitted | observer | Adult feeding share of daytime | 0.33–0.5 |  |
| T-ACT-2 | activity budget | fitted | observer | Adult travel share of daytime | 0.12–0.25 |  |
| T-ACT-3 | activity budget | fitted | observer | Adult grooming share of daytime | 0.08–0.18 |  |
| T-ACT-4 | activity budget | fitted | observer | Adult resting (including grooming) share of daytime | 0.3–0.47 |  |
| T-ACT-5 | activity budget | held-out | observer | Sex and reproductive-state differences in activity | pattern |  |
| T-PTY-1 | party size | fitted | observer | Mean party size | 4.5–9.2 |  |
| T-PTY-3 | party size | held-out | observer | More males per party in the periphery | pattern |  |
| T-RNG-4 | ranging | fitted | observer | Adult male day range | 1.5–3.5 |  |
| T-RNG-5 | ranging | held-out | observer | Lactating female day range relative to males | 0.3–0.75 |  |
| T-IGE-1 | intergroup encounters | fitted | observer | Intergroup encounters per community-year | 5–12 |  |
| T-IGE-2 | intergroup encounters | held-out | observer | Share of encounters that are auditory only | 0.7–0.9 |  |
| T-IGE-3 | intergroup encounters | held-out | observer | Approach depends on own males | 0.25–0.75 | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-IGE-4 | intergroup encounters | fitted | observer | Playback response by party composition | pattern |  |
| T-PAT-1 | patrols | fitted | observer | Patrol rate in small communities | 0.1–0.5 | counted only when the patrol classifier meets its bar in the run |
| T-PAT-2 | patrols | held-out | observer | Per-male patrol participation | 7–18 | counted only when the patrol classifier meets its bar in the run |
| T-PAT-3 | patrols | held-out | observer | Patrol composition | 0.55–0.85 | counted only when the patrol classifier meets its bar in the run |
| T-PAT-5 | patrols | held-out | observer | Patrol duration and distance | 60–240 | counted only when the patrol classifier meets its bar in the run |
| T-PAT-6 | patrols | fitted | observer | Incursion share | 0.4–0.7 | counted only when the patrol classifier meets its bar in the run |
| T-PAT-7 | patrols | held-out | observer | Patrol contact and violence | 0.15–0.45 | counted only when the patrol classifier meets its bar in the run |
| T-BRD-1 | border stops | held-out | observer | Advance after border stops | 0.037–0.107 | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-FOOD-2 | feeding ecology | fitted | observer | Fruit share of feeding time | 0.6–0.78 |  |
| T-FOOD-5 | feeding ecology | held-out | observer | Nearest-tree choice share | 0.15–0.45 |  |
| T-FOOD-6 | feeding ecology | held-out | observer | Revisit interval | 2–7 |  |
| T-FOOD-7 | feeding ecology | held-out | observer | Out-of-sight approach distance | 300–800 |  |
| T-HUN-1 | hunting | fitted | observer | Hunts per community-year | 4–11 |  |
| T-HUN-2 | hunting | fitted | observer | Hunt success | 0.5–0.8 |  |
| T-HUN-3 | hunting | fitted | observer | Hunting probability per colobus encounter | 0.05–0.4 |  |
| T-HUN-4 | hunting | held-out | observer | More males, more hunting | 1.05–1.8 | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-HUN-7 | hunting | fitted | observer | Kills per successful hunt | 1.2–2.0 |  |
| T-HUN-8 | hunting | held-out | observer | Adult males make most kills | 0.8–0.95 |  |
| T-HUN-9 | hunting | held-out | observer | Meat sharing | pattern |  |
| T-SOC-2 | social | held-out | observer | Bonds are mostly with non-kin | 0.55–0.9 |  |
| T-SOC-3 | social | held-out | observer | Grooming reciprocity | 0.45–0.8 |  |
| T-SOC-5 | social | held-out | observer | Male hierarchy steepness | 0.2–0.7 |  |
| T-SOC-6 | social | held-out | observer | Pant-grunts concentrate on top males | 0.6–0.9 |  |
| T-SOC-8 | social | fitted | observer | Females queue | pattern |  |
| T-SOC-9 | social | fitted | observer | Reconciliation | 0.08–0.22 |  |
| T-SOC-10 | social | held-out | observer | Third-party post-conflict affiliation | 0.1–0.3 |  |
| T-SOC-12 | social | held-out | observer | Relationship-quality components | pattern |  |
| T-COM-1 | communication | fitted | observer | Male pant-hoot rate | 0.5–1.5 |  |
| T-COM-2 | communication | held-out | observer | High-ranking males call more | pattern |  |
| T-COM-3 | communication | held-out | observer | Quiet at the edges | pattern |  |
| T-COM-4 | communication | held-out | observer | Calling context | pattern |  |
| T-COM-5 | communication | fitted | observer | Pant-hoot caller identity is moderately distinctive | 2–4 |  |
| T-COM-6 | communication | fitted | observer | Drumming structure | pattern |  |
| T-COM-7 | communication | held-out | observer | Drumming context | pattern |  |
| T-COM-8 | communication | fitted | observer | Food calls | 0.3–0.6 |  |
| T-COM-9 | communication | held-out | observer | Arrival pant-hoots signal status | pattern |  |
| T-COM-11 | communication | fitted | observer | Alarm calls track audience knowledge | 0.25–0.55 |  |
| T-ENE-2 | energy | fitted | truth | Daily feeding time of multiparous lactating females | 250–370 | 24-hour total of a daytime act (feeding) |
| T-ENE-3 | energy | held-out | truth | Daily dry-matter intake of multiparous lactating females | 650–1100 | 24-hour total of a daytime act (eating) |
| T-ENE-7 | energy | held-out | truth | Males feed less on days with parous oestrous females | pattern |  |
| T-RHY-6 | rhythm and water | held-out | truth | Drinking frequency | 0.3–2.0 |  |
| T-RHY-8 | rhythm and water | held-out | truth | Rest and ground use rise with heat | pattern |  |
| T-END-2 | hormone-like states | held-out | truth | Male stress and rank | pattern |  |
| T-END-3 | hormone-like states | held-out | truth | Male stress with parous oestrous females present | pattern |  |
| T-END-8 | hormone-like states | held-out | truth | Competitive arousal and pant-hoot rate | pattern |  |
| T-END-9 | hormone-like states | held-out | truth | Competitive arousal on patrol days | pattern |  |
| T-INF-1 | infants | held-out | truth | Eating share of observation time by infant age | pattern | infants are under 8: their own choices stay with the rules in every arm; expected without a value in 60 days |
| T-INF-2 | infants | held-out | truth | Suckling share of observation time | 1.0–6.0 | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-3 | infants | held-out | truth | Weaned age | 3.7–5.8 | expected without a value in 60 days (needs weanings in the window) |
| T-INF-5 | infants | held-out | truth | Nursing bout rate and length | 0.5–2.0 | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-6 | infants | held-out | truth | Grooming between mothers and their own unweaned infants | 0.014–0.06 | the infant's side stays with the rules in every arm |
| T-SOC-14 | social | held-out | truth | Contact share of aggression among individuals of 12 y and over | 0.08–0.37 | contests at any hour |
| T-SOC-15 | social | held-out | truth | Contact falls with rank difference | pattern | contests at any hour |
| T-SOC-16 | social | held-out | truth | Coalitionary share of male-initiated aggression | 0.03–0.2 | contests at any hour |

**Rows not judged, with the reason:**

| row | family | metric | class | reason |
| --- | --- | --- | --- | --- |
| T-FOOD-10 | feeding ecology | Breakfast planning | night or nest | the share of nest departures before sunrise: a nest decision taken from the night menu |
| T-ENE-8 | energy | Daily energy expenditure of non-reproducing adults, scaled by mass | night or nest | energy spent over the 24 hours: about half of its ticks are night ticks |
| T-RHY-1 | rhythm and water | Active day (nest to nest) | night or nest | the active day runs from leaving the night nest to entering the next one: both ends are nest decisions |
| T-RHY-2 | rhythm and water | Active day by sex and reproductive state | night or nest | as T-RHY-1, by class |
| T-RHY-3 | rhythm and water | Nest departure relative to sunrise | night or nest | the time of leaving the night nest: a decision taken from the night menu |
| T-RHY-4 | rhythm and water | Start of night-nest building relative to sunset | night or nest | the start of night-nest building: a decision taken from the dusk menu |
| T-RHY-5 | rhythm and water | Activity at night | night or nest | activity between dusk and dawn: the night menu itself |
| T-RHY-9 | rhythm and water | Hourly activity profile | night or nest | shares by hour since nest departure, tested on the first and last three hours of the nest-to-nest day (the last hours include dusk) |
| T-RHY-10 | rhythm and water | Leaf feeding later in the day | night or nest | leaf feeding in the second half of the nest-to-nest day: the halves are set by the nest decisions |
| T-PTY-4 | party size | Female gregariousness | never counted | the scorer reports it and never counts it (compromised) |
| T-IGE-5 | intergroup encounters | Encounters happen in the periphery | never counted | the scorer reports it and never counts it (compromised) |
| T-FOOD-4 | feeding ecology | Feeding trees visited per day | never counted | the scorer reports it and never counts it (compromised) |
| T-SOC-4 | social | Association by sex | never counted | the scorer reports it and never counts it (compromised) |
| T-ENE-1 | energy | Daily metabolisable energy intake of multiparous lactating females | never counted | the scorer reports it and never counts it (contested) |
| T-LET-4 | lethal conflict | Territorial expansion after killings (scenario) | not scored | scenario row, scored by another tool |
| T-FIS-1 | fission | Fission is rare and needs a large community | not scored | scenario row, scored by another tool |
| T-FIS-2 | fission | Fission antecedents | not scored | scenario row, scored by another tool |
| T-FIS-3 | fission | Lethal violence after fission | not scored | scenario row, scored by another tool |
| T-FIS-4 | fission | Former associates become victims | not scored | scenario row, scored by another tool |
| T-FIS-5 | fission | Patrols after a fission | not scored | scenario row, scored by another tool |
| T-FOOD-8 | feeding ecology | Goal-directed inspections | not scored | no mechanism in the simulation (n/a) |
| T-FOOD-9 | feeding ecology | Approach kinematics | not scored | no mechanism in the simulation (n/a) |
| T-HUN-10 | hunting | Prey decline under heavy predation (scenario) | not scored | scenario row, scored by another tool |
| T-SOC-13 | social | Long-term recognition | not scored | structural test, not an observer metric |
| T-COM-10 | communication | Gesture repertoire | not scored | no mechanism in the simulation (n/a) |
| T-ENE-4 | energy | Energy balance rises with fruit | not scored | simulation-truth row without a readout (not scorable) |
| T-ENE-5 | energy | Energy balance through lactation | not scored | simulation-truth row without a readout (not scorable) |
| T-ENE-6 | energy | Females' energy balance falls with males in the party | not scored | simulation-truth row without a readout (not scorable) |
| T-RHY-7 | rhythm and water | Share of drinking at streams | not scored | simulation-truth row without a readout (not scorable) |
| T-END-4 | hormone-like states | Stress after an aggressive interaction | not scored | simulation-truth row without a readout (not scorable) |
| T-END-5 | hormone-like states | Stress is lower with a bond partner | not scored | simulation-truth row without a readout (not scorable) |
| T-END-7 | hormone-like states | Competitive arousal with parous oestrous females | not scored | simulation-truth row without a readout (not scorable) |
| T-END-10 | hormone-like states | Affiliation after grooming with a bond partner | not scored | simulation-truth row without a readout (not scorable) |
| T-END-11 | hormone-like states | Affiliation after food sharing | not scored | simulation-truth row without a readout (not scorable) |
| T-END-12 | hormone-like states | Affiliation before and during intergroup conflict | not scored | simulation-truth row without a readout (not scorable) |
| T-PTY-2 | party size | Party size vs fruit and patch size | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-RNG-1 | ranging | Annual home range of a 22-member community | needs a year | insufficient in 60 days: annual range |
| T-RNG-2 | ranging | Range size scales with community size | needs a year | insufficient in 60 days: annual range |
| T-RNG-3 | ranging | Core concentration | needs a year | insufficient in 60 days: annual range |
| T-RNG-6 | ranging | Range variability over years | needs a year | insufficient in 60 days: annual range |
| T-PAT-4 | patrols | Patrol predictors | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-PAT-8 | patrols | Patrols and fruit | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-PAT-9 | patrols | Patrol sector concentration (check) | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-LET-1 | lethal conflict | Killings per community-year | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-LET-2 | lethal conflict | Victim composition | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-LET-3 | lethal conflict | Numerical odds in lethal attacks | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-LET-6 | lethal conflict | Killings happen on patrols | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-FOOD-1 | feeding ecology | Phenology index | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-FOOD-3 | feeding ecology | Fallback switching | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-FOOD-11 | feeding ecology | Fruiting food trees encountered along travel | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-HUN-5 | hunting | Hunting tracks fruit | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-HUN-6 | hunting | Hunting comes in bursts | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-SOC-1 | social | Male bond persistence | needs a year | insufficient in 60 days: life history over years |
| T-SOC-7 | social | Alpha tenure | needs a year | insufficient in 60 days: life history over years |
| T-SOC-11 | social | Alpha paternity share | needs a year | insufficient in 60 days: life history over years |
| T-DEM-1 | demography | First-year mortality | needs a year | insufficient in 60 days: life history over years |
| T-DEM-2 | demography | Life expectancy at 15 | needs a year | insufficient in 60 days: life history over years |
| T-DEM-3 | demography | Survival to 45 | needs a year | insufficient in 60 days: life history over years |
| T-DEM-4 | demography | Causes of death | needs a year | insufficient in 60 days: life history over years |
| T-DEM-5 | demography | Epidemic frequency | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-DEM-6 | demography | Outbreak attack rate and mortality | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-DEM-7 | demography | Who dies in epidemics | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-DEM-8 | demography | Respiratory death rate | needs a year | insufficient in 60 days: rare events counted per community-year |
| T-DEM-9 | demography | Snare injury prevalence | needs a year | insufficient in 60 days: life history over years |
| T-DEM-10 | demography | Age-specific fertility | needs a year | insufficient in 60 days: life history over years |
| T-DEM-11 | demography | Age at first birth | needs a year | insufficient in 60 days: life history over years |
| T-DEM-12 | demography | Birth interval after a surviving infant | needs a year | insufficient in 60 days: life history over years |
| T-DEM-13 | demography | Birth interval after infant death | needs a year | insufficient in 60 days: life history over years |
| T-ENE-9 | energy | Feeding time and travel against fruit availability | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-END-1 | hormone-like states | Male stress rises when the hierarchy is unstable | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-END-6 | hormone-like states | Female stress, food and rank | needs a year | insufficient in 60 days: a statistic across the months of a year |
| T-INF-4 | infants | Mass for age | needs a year | insufficient in 60 days: life history over years |
| T-LET-5 | lethal conflict | Payoff of expansion (scenario) | sealed | sealed: stays sealed |
| T-DEM-14 | demography | Female rank and fertility | sealed | sealed: stays sealed |
| T-DEM-15 | demography | Maternal loss after weaning | sealed | sealed: stays sealed |
| T-DEM-16 | demography | Survival of daughters orphaned at 5–9.99 y | sealed | sealed: stays sealed |
| T-DEM-17 | demography | Sex difference in the survival cost of maternal loss at 10–14.99 y | sealed | sealed: stays sealed |
| T-DEM-18 | demography | Stress activation after maternal loss fades | sealed | sealed: stays sealed |
| T-DEM-19 | demography | Lean-mass proxy: orphans vs non-orphans | sealed | sealed: stays sealed |
| T-DEM-20 | demography | Lean-mass proxy: alpha mother vs other mothers | sealed | sealed: stays sealed |
| T-DEM-21 | demography | Neighbour pressure during pregnancy and offspring survival | sealed | sealed: stays sealed |
| T-DEM-22 | demography | Neighbour pressure: pregnancy window stronger than lactation windows | sealed | sealed: stays sealed |
| T-DEM-23 | demography | Aggression received by immatures, by sex | sealed | sealed: stays sealed |
| T-DEM-24 | demography | One-year survival after maternal loss, by age at loss | sealed | sealed: stays sealed |

Judged rows by family: social 11, communication 10, hunting 7, patrols 6, activity budget 5, infants 5, intergroup encounters 4, feeding ecology 4, hormone-like states 4, energy 3, party size 2, ranging 2, rhythm and water 2, border stops 1.

## 6. Readouts and the rule (fixed before the runs)

Every number is produced from the run JSON by `docs/staging/integrator-kit/scripts/judge_r1b.py judge` (the row list
above by `judge_r1b.py list`; the smoke tables by `scripts/r1b-smoke.ts`). The judge was dry-run once on existing
merged runs (E1v's 6-month groups in `bench-e1v`, with 0.25 runs standing in for arms) to check that it runs; no
number from that dry run is used.

**Per arm and row:** the pooled value, the band, the verdict and the band distance, beside the rules group's mean and
SD of the pooled values, its verdicts and its mean band distance.

**"Moves" or "does not move", per row and arm, by the one noise rule** (`docs/staging/e-noise.md`, amendments 2 and 4:
z = (arm − mean) ÷ (SD × √(1 + 1/n)), the rules group of n = 4 runs as the reference):
- *Numeric rows.* The quantity is the row's pooled value in band widths (value ÷ (hi − lo); every numeric candidate has
  a two-sided band). SD = the SD of the four rules runs' values, floored at **0.05 band widths** (the per-row floor of
  `judge_vs_reps.py`). |z| > 2: the row **moves**. The smallest move this can call is 0.11 band widths.
- *Pattern rows* (no numeric band; pass or fail). The row **moves** when all four rules runs give one verdict and the
  arm gives the other. If the rules runs disagree among themselves the row cannot be judged and is listed so.
- The primary quantity is the value, not the verdict: a value can cross half a band without changing "pass", and
  "inconclusive" flips between re-draws of one model. The verdict is reported beside it, with the count of moved rows
  whose verdict is one that no rules run gave.
- *The 0.25 base (arm f)* has one rules run: z = (null − rules) ÷ (SD × √2), two single runs (amendment 2), SD = the
  0.5 rules group's SD of the row with the same floor; a pattern row moves when the two verdicts differ.

**How many rows move by chance.** With four reference runs the SD of a row is estimated from three degrees of freedom,
so |z| > 2 is passed by chance more often than 5% of the time (about 14% for a t distribution with 3 degrees of
freedom, less where the floor applies). The judge therefore also prints the chance count measured on the group itself:
each rules run judged against the other three by the same rule. The headline is read against that count.

**Counts:** rows that move, per arm, by target family; with and without the rare rows (T-HUN-4, T-BRD-1, T-IGE-3:
amendment 3); the statement "N of M judged daytime rows move when the choice is random; these are …" for arm (b), and
the second number for arm (d).

**Contrasts:** pick kept against removed (b against d, c against e) and gate off against on (b against c, d against
e), on rows judged in both arms: every row that moves in one and not in the other is listed, and rows that move in
opposite directions.

**The 0.25 check:** the count on the 0.25 base, and the rows that move on one base only.

**Viability and starvation, per run:** births, deaths, the viability verdict, starvation deaths in the 60 days and in
the burn-in by seed, deaths by cause, living at the start and the end per seed; energy by class (intake, expenditure,
eating minutes, reserves). The null kernel may starve animals: that is a result, not a failure. If animals die, rows
are read knowing the population changed.

**The prescription count** per run (see section 3, item 7, for what it does not measure).

**For information, not judged:** the summed band distances over the judged numeric rows with the registered floors
(fitted 0.30, held-out 1.45, held-out without the rare rows 0.21); the values of the night and nest rows and of the
rows the scorer never counts.

## 7. What will not be done

- No change under `src/` or `data/`; no golden re-recorded; the field pin is not touched; no test file is changed, so
  no test is run (the full `pnpm test` is not run: the machine is shared).
- No horizon beyond the confirm. No seed other than 48, 7, 21, 5, 11.
- No tuning, no keep decision, no claim about wild chimpanzees from either base.
- No GPU, no paid call, no network.

## 8. Iteration log (each entry written before it runs; at most 3)

- **Smoke (logged 6 October 2026, 07:21 EDT, before it runs).** Section 4, from `bench-r1b` at the commit that adds
  this file.
  **Result (6 October 2026, 07:30 EDT; `bench-r1b` at a137d6c, clean; load average about 12).** S1, S2 and S3 hold: the
  arms may run. The tables below are the script's output, unedited.

Seed 48, field profile, 1 burn-in day(s) + 1 observed day(s); printed by scripts/r1b-smoke.ts from its JSON.

**Who decided** (pass A, e-bench's seed loop; a decision = one pass of the kernel step or one rules decision):

| arm | kernelSim / kernelGate / kernelNoRulesPick | decisions | null kernel | rules: menu under two options | rules: other refusals | rules: animals under 8 | rules: animals aged 8 and over | kernel pass under age 8 | same counts in the plain loop |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rules | 0 / 0 / 0 | 8696 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 2342 (26.9%) | 6354 (73.1%) | 0 | yes |
| b | 1 / 0 / 0 | 10743 | 7776 (72.4%) | 127 (1.2%) | 0 (0.0%) | 2840 (26.4%) | 0 (0.0%) | 0 | yes |
| c | 1 / 1 / 0 | 6838 | 4228 (61.8%) | 131 (1.9%) | 0 (0.0%) | 2479 (36.3%) | 0 (0.0%) | 0 | yes |
| d | 1 / 0 / 1 | 10311 | 7358 (71.4%) | 282 (2.7%) | 0 (0.0%) | 2671 (25.9%) | 0 (0.0%) | 0 | yes |
| e | 1 / 1 / 1 | 7248 | 4468 (61.6%) | 253 (3.5%) | 0 (0.0%) | 2527 (34.9%) | 0 (0.0%) | 0 | yes |

**Animals aged 8 and over only** (pass A): of the decisions made for them, the share the null kernel made and the share that went back to the rules:

| arm | decisions for animals aged 8 and over | null kernel | back to the rules (menu under two options) | back to the rules (other) | rules argmax calls after a refusal (check) |
| --- | --- | --- | --- | --- | --- |
| rules | 6354 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 |
| b | 7903 | 7776 (98.4%) | 127 (1.6%) | 0 (0.0%) | 127 |
| c | 4359 | 4228 (97.0%) | 131 (3.0%) | 0 (0.0%) | 131 |
| d | 7640 | 7358 (96.3%) | 282 (3.7%) | 0 (0.0%) | 282 |
| e | 4721 | 4468 (94.6%) | 253 (5.4%) | 0 (0.0%) | 253 |

**By light phase, the gate, the menu** (pass B, the plain loop on the same world):

| arm | null kernel decisions: dawn / day / dusk / night | refused to the rules: dawn / day / dusk / night | decision points the loop's gate held (no kernel asked): total; dawn / day / dusk / night | kernel menus by size | rules' pick on the kernel's menu | kernel took the rules' pick | living at start (aged 8 and over / under 8) | deaths | wall s: benchmark loop / plain loop |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rules | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0; 0 / 0 / 0 / 0 | - | 0 (-) | 0 (-) | 49 (38 / 11) | 0 | 9 / 5 |
| b | 564 / 6646 / 422 / 144 | 0 / 0 / 0 / 127 | 0; 0 / 0 / 0 / 0 | 2: 195, 3: 717, 4: 1699, 5: 1912, 6: 1233, 7: 896, 8: 1124 | 7715 (99.2%) | 1620 (20.8%) | 49 (38 / 11) | 0 | 10 / 6 |
| c | 387 / 3432 / 283 / 126 | 0 / 0 / 0 / 131 | 1908; 142 / 1528 / 173 / 65 | 2: 155, 3: 419, 4: 989, 5: 1019, 6: 695, 7: 471, 8: 480 | 4186 (99.0%) | 876 (20.7%) | 49 (38 / 11) | 0 | 7 / 5 |
| d | 591 / 6412 / 353 / 2 | 0 / 1 / 9 / 272 | 0; 0 / 0 / 0 / 0 | 2: 373, 3: 1021, 4: 1823, 5: 1655, 6: 1149, 7: 690, 8: 647 | 0 (0.0%) | 0 (0.0%) | 49 (38 / 11) | 0 | 10 / 7 |
| e | 388 / 3807 / 267 / 6 | 0 / 1 / 4 / 248 | 1806; 144 / 1542 / 115 / 5 | 2: 312, 3: 743, 4: 1007, 5: 994, 6: 623, 7: 369, 8: 420 | 0 (0.0%) | 0 (0.0%) | 49 (38 / 11) | 0 | 8 / 6 |

  Read: in arm (b) the null kernel makes the decision at 98.4% of the decision points of animals aged 8 and over; the
  rest are menus with fewer than two options, all at night, decided by the rules' argmax. Animals under 8 (11 of 49)
  keep the rules and make about a quarter of all decisions. No request and no answer was refused for any other reason.
  With the gate on the kernel is asked about half as often and the gate holds about 1,900 decision points. With the
  pick removed the rules' pick is never on the kernel's menu and more menus fall under two options (3.7% and 5.4% of
  the older animals' decisions). With the pick kept it is on the menu at 99% of the kernel's decisions and the uniform
  draw takes it 21% of the time. At night the kernel decides little (2% of its decisions in arm b; almost none with the
  pick removed, where the night menu is usually left with one option). The benchmark's loop and the plain loop give the
  same counts in every arm. Wall time: 7 to 10 s for the 2 days in the benchmark's loop, so a 90-day seed job is
  expected to take 5 to 8 minutes at this load.
- **Iteration 1 (logged 6 October 2026, 07:31 EDT, before it runs).** The ten runs of section 2 as registered, by
  `r1brun.sh` from `bench-r1b` moved to the commit that adds this entry (the smoke result and this log are the only
  changes since a137d6c: documentation, so the code identity of the runs, the git trees of `src`, `scripts` and `data`,
  is that of the smoke run). Nothing in the design is adjusted after the smoke run.
