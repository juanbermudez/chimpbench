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
- **Iteration 1, result (6 October 2026, 10:01 EDT).** All ten runs merged: 50 seed jobs and 10 merges, one attempt
  each, no failed or interrupted job, every run at 7658cd7 with a clean checkout, protocol `5d4fa5a2a500bce6`. The
  driver ran from 07:30:47 to 10:00:55 (seed jobs 2.5 to 10.4 minutes, mean 5.0; the load average was 9 to 50, with one
  spike to 160 from other sessions). No further iteration was run: 1 of 3 used.
- **Correction to the judge, made after the results were seen (disclosed).** On the 0.25 base the judge first judged two
  numeric rows (T-IGE-1, T-IGE-3) that the 0.5 rules group does not count in every run, so that group gives them no SD
  and the script fell back to the floor alone (z of +37 and −49). Section 6 takes the SD from the 0.5 rules group, so
  such a row cannot be judged by the registered rule; the judge now lists them as not judged. Effect: the 0.25 count
  went from 30 of 57 to 28 of 55. Nothing on the 0.5 base changed, and nothing else in the judge was changed after the
  runs.

## 9. Results (6 October 2026; one iteration; every table below is the judge's output, unedited)

### 9.1 The answer

**On the main arm (b: null kernel, gate off, the rules' pick kept), 26 of 49 judged daytime rows move when the choice
is random; these are T-ACT-1, T-ACT-2, T-ACT-4, T-RNG-4, T-RNG-5, T-BRD-1, T-FOOD-2, T-FOOD-6, T-HUN-1, T-HUN-2,
T-HUN-8, T-SOC-2, T-SOC-5, T-SOC-6, T-SOC-10, T-COM-1, T-COM-5, T-COM-8, T-COM-11, T-ENE-3, T-RHY-6, T-INF-2, T-INF-5,
T-INF-6, T-SOC-14 and T-SOC-16.** The other 23 do not move. By chance alone the same rule moves 1 to 5 rows (each
rules run judged against the other three: 4, 3, 1 and 5 rows; mean 3.2), so the 26 are far beyond chance. Without the
rare rows: 25 of 47.

- **The second number (d: pick removed, gate off): 28 of 46.**
- **Gate on:** 26 of 48 with the pick kept (c), 33 of 46 with it removed (e).
- **The 0.25 base (f):** 28 of 55; on the 49 rows judged on both bases, 23 move on both, 19 on neither, 3 on the 0.5
  base only (T-RNG-5, T-BRD-1, T-INF-6) and 4 on the 0.25 base only (T-SOC-9, T-END-3, T-END-8, T-SOC-15). The wadging
  share does not change the picture.
- **Across the four null arms on the 0.5 base** (46 rows judged in all four): 16 rows move in every arm, each in one
  direction (T-ACT-1, T-ACT-4, T-RNG-4, T-FOOD-2, T-HUN-1, T-HUN-2, T-SOC-2, T-SOC-5, T-SOC-6, T-COM-1, T-COM-8,
  T-ENE-3, T-INF-2, T-INF-5, T-SOC-14, T-SOC-16); 8 move in no arm (T-PTY-3, T-IGE-2, T-SOC-8, T-SOC-12, T-COM-4,
  T-COM-6, T-COM-7, T-COM-9); 22 move in some arms only.

**Which families (arm b, moved of judged):** activity budget 3 of 4, ranging 2 of 2, border stops 1 of 1, feeding
ecology 2 of 4, hunting 3 of 7, social 6 of 11, communication 4 of 9, energy 1 of 2, rhythm and water 1 of 1, infants
3 of 3; none in party size (0 of 2), intergroup encounters (0 of 1) or the hormone-like states (0 of 2); no patrol row
could be judged.

**What random choice does to the animals (arm b against the rules group's mean; values from the tables).** Adults
feed for more of the day (T-ACT-1 0.368 → 0.449) and rest less (T-ACT-4 0.446 → 0.332); the fruit share of feeding
falls (T-FOOD-2 0.812 → 0.506); males walk further (T-RNG-4 2.35 → 3.14 km a day); hunts are fewer and mostly fail
(T-HUN-1 7.7 → 5.6 a year, T-HUN-2 0.53 → 0.19); males pant-hoot four to five times as often (T-COM-1 0.56 → 2.51 an
hour); aggression becomes contact aggression (T-SOC-14 0.061 → 0.561); infants suckle for a third of the time
(T-INF-2 12.05% → 3.6%).

**Toward or away from the field.** Of the 26 rows that move in arm (b), 12 end farther from their band, 4 nearer and
10 at an unchanged distance (inside the band before and after). The summed distance over the fitted rows judged rises from 1.07 ± 0.14 to 4.07
(z +8.9), and over the held-out rows without the rare rows from 3.85 to 5.10 (z +4.2); with the rare rows the held-out
sum is inside noise in arm (b) (z −0.8). T-INF-2 moves into its band under random choice (the rules give 12%, the band
is 1 to 6%): nearer the band is not evidence of a better engine.

**Viability under random choice.** No animal starved in arms (b), (d) or (f) in the 90 days, and those runs pass
viability. With the gate on, lactating females starved: 1 in arm (c) (seed 7) and 3 in arm (e) (seeds 7, 5 and 11),
and 2 orphaned infants died in (e); both runs fail viability. In every null arm the animals are losing
their stores: the lactating females' mean reserve trajectory reaches −0.32 to −0.34 of the store (rules: −0.04 to
−0.05) and that of infants of 0.5 to 2 years −0.40 to −0.46 (rules: −0.05 to −0.11). Lactating females take in
1,930 to 1,980 kcal a day (rules: 2,255 to 2,285) in about the same eating time, with less of it on fruit; adult
males eat for 355 to 413 minutes a day instead of 228, with a fruit share of 0.43 to 0.53 instead of 0.93, for about
the same intake. So random choice is on a losing trajectory; in 60 days it shows as deaths only where the choice is
also held.
The population itself hardly changed in any run (at most 7 deaths among 245 animals; the rules group lost 7 in one
run to a respiratory outbreak), so the rows are not moved by a changed population.

**The smoke run** (section 8): in arm (b) the null kernel made the decision at 98.4% of the decision points of animals
aged 8 and over (1.6% went back to the rules: menus with fewer than two options, all at night); animals under 8 kept
the rules and made 26.4% of all decisions. With the pick removed 3.7% (d) and 5.4% (e) of the older animals'
decisions went back to the rules.

### 9.2 What the result shows, and what it does not

**Shows (confidence high).** The choice matters for at least 16 of the judged daytime rows: they move in all four
null arms, in one direction, with |z| from 2.5 to 35. They cover the activity budget, diet, day range, hunting, the male
bond and rank rows, calling, the form of aggression, the mothers' intake and infant nursing. These are rows on which a
decision engine can be shown to drive behaviour.

**Shows (confidence moderate).** About half of the judged daytime rows are choice-sensitive (26 of 49, 26 of 48, 28
of 46, 33 of 46, 27 of 49 on the rows both bases share), against about 3 expected by chance. The count is stable
across the gate, the pick and the wadging share; the exact membership is not: each arm is one run, and 22 rows move in
some arms and not in others, so the lists of section "Pick kept against removed, gate off against on" below should be
read by their size, not row by row.

**Does not show that the other rows are set by the loop (confidence low).** "Does not move" is a weak statement here,
for four reasons.
1. Twelve of the 23 rows that do not move in arm (b) are pattern rows, which can move only by flipping between pass
   and fail. Their values often change without a flip (T-SOC-12 8.08 → 4.00; T-PTY-3 1.13 → 0.67). Seven of the 8 rows
   that move in no arm are pattern rows. Among numeric rows only T-IGE-2 (judged in four arms) and T-HUN-7 (judged in
   two; its value is 1.000 in every run) never move.
2. The null kernel is uniform over a menu the rules' scores ranked (at most eight options, the best target of each
   action type), not over every legal act. Whom to groom or which tree to go to is still the rules' best candidate.
   The test understates how much of a row the rules decide.
3. Animals under 8 keep the rules, and so do the fallbacks.
4. The noise floor: a row must move by 0.11 band widths or 2.2 SD of four runs to be called.

**Does not isolate the choice in arm (b).** Against the rules, arm (b) also differs in holding nothing between
decision points (arm c holds), in the menu (the rules' menu guarantees a hunt the animal may lead, a patrol lead and a
noticed joint trip; the kernel's does not), in the night and dusk menus, and in running the 30-day burn-in on random
choice too. The night reaches the day: under the null kernel adults leave the nest about 11 minutes earlier (55 in
arm e) and start the night nest 31 to 38 minutes after sunset instead of 41 before it, the active day is 13.3 to 13.5
hours instead of 11.7, and adults are out of a nest for 5.5 to 7.5% of the night instead of 2.3 to 2.4% (rows not
judged, table below). Shares of the day in the judged rows are shares of a longer day.

**Does not say an engine would do better or worse than the rules.** The null kernel is the floor, not a candidate.

**Could not be judged.** Of the 66 candidate rows, 17 in every arm: the six patrol rows and T-IGE-1 (the scorer does
not count them in the rules runs: their classifiers are below the bar), T-IGE-3, T-IGE-4, T-INF-1 and T-INF-3 (no value in
60 days in at least one rules run) and six pattern rows on which the rules' own four runs disagree (T-ACT-5, T-COM-3,
T-ENE-7, T-RHY-8, T-END-2, T-END-9). Under the null kernel T-HUN-9 (arms c, d, e) and T-HUN-7 and T-HUN-8 (arms d, e)
lose their value because few or no hunts succeed: that is itself an effect of the choice. For information only, patrols
all but vanish under random choice (T-PAT-1 0.060 a week under the rules, 0.008 in arm b, 0 in the others). The 84
rows outside the candidate list are in section 5 (9 night or nest rows, 5 the scorer never counts, 21 not scored, 37
that need a year, 12 sealed).

**The prescription count** is 42 in every run and says nothing about the null arms (section 3, item 7).

### 9.3 Open points for the integrator and the user

1. Which reading of "set by the loop" goes forward: the 23 rows that do not move in the main arm, or the 8 that move
   in no arm. Either way the pattern rows need a numeric readout before they are called loop-set.
2. Menu parity beyond the night (for R2): the rules' menu guarantees the hunt, the patrol lead and the joint trip and
   the kernel's menu does not, so part of the fall in hunting and patrols under the null kernel is the menu, not the
   draw.
3. The gate setting for later engine comparisons: gate on is the cleaner contrast (only the choice changes) and is
   the arm in which animals starved within 60 days.
4. Whether to re-draw the null arms (three more runs each, 10 to 20 minutes a run at today's load) so that the
   row-by-row contrasts between arms can be read; the headline does not need it.

### 9.4 Generated tables

Printed by docs/staging/integrator-kit/scripts/judge_r1b.py judge from the run JSON in `bench-r1b/artifacts/validation/e/runs` (rules group: R1b-rules, R1b-rules-s1, R1b-rules-s2, R1b-rules-s3; 4 runs). Per-row SD floor 0.05 band widths; a numeric row moves at |z| > 2 with z = (arm − mean) ÷ (SD × √(1 + 1/4)).

### Runs: identity, prescriptions, viability and starvation

| run | commit | protocol | mode: burn-in + days, seeds | kernelSim / kernelGate / kernelNoRulesPick | pithFibreSwallowed, rngSalt | prescriptions | viability | births / deaths | starvation deaths in the 60 days (by seed) | starvation deaths in the burn-in (by seed) | deaths by cause | living, start → end, per seed | night: adults out of a nest, T-RHY-5 (not judged) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1b-rules | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 0 / 0 / 0 | 0.5, 0 | 42 | pass | 0 / 2 | 0 (-) | 0 (-) | respiratory illness (outbreak) 2 | 49 → 49, 49 → 49, 49 → 49, 49 → 47, 49 → 49 | adults out of a nest 2.39% of night; T-RHY-5 0.0194; night deaths 0; deaths 2 |
| R1b-rules-s1 | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 0 / 0 / 0 | 0.5, 1 | 42 | pass | 0 / 0 | 0 (-) | 0 (-) | - | 49 → 49, 49 → 49, 49 → 49, 49 → 49, 49 → 49 | adults out of a nest 2.30% of night; T-RHY-5 0.0185; night deaths 0; deaths 0 |
| R1b-rules-s2 | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 0 / 0 / 0 | 0.5, 2 | 42 | pass | 0 / 0 | 0 (-) | 0 (-) | - | 49 → 49, 49 → 49, 49 → 49, 49 → 49, 49 → 49 | adults out of a nest 2.36% of night; T-RHY-5 0.0192; night deaths 0; deaths 0 |
| R1b-rules-s3 | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 0 / 0 / 0 | 0.5, 3 | 42 | pass | 0 / 7 | 0 (-) | 0 (-) | respiratory illness (outbreak) 7 | 49 → 49, 49 → 49, 49 → 42, 49 → 49, 49 → 49 | adults out of a nest 2.41% of night; T-RHY-5 0.0196; night deaths 3; deaths 7 |
| R1b-null | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 1 / 0 / 0 | 0.5, 0 | 42 | pass | 0 / 1 | 0 (-) | 0 (-) | illness 1 | 49 → 49, 49 → 49, 49 → 48, 49 → 49, 49 → 49 | adults out of a nest 5.71% of night; T-RHY-5 0.0398; night deaths 1; deaths 1 |
| R1b-null-gate | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 1 / 1 / 0 | 0.5, 0 | 42 | FAIL: 1 starvation death | 0 / 6 | 1 (7: 1) | 0 (-) | illness 2, respiratory illness (outbreak) 1, starvation 1, wounds from a fight with Gomezi 1, wounds from a fight with Lembai 1 | 49 → 49, 49 → 47, 49 → 49, 49 → 49, 49 → 45 | adults out of a nest 7.49% of night; T-RHY-5 0.0467; night deaths 3; deaths 6 |
| R1b-null-nopick | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 1 / 0 / 1 | 0.5, 0 | 42 | pass | 0 / 1 | 0 (-) | 0 (-) | illness 1 | 49 → 48, 49 → 49, 49 → 49, 49 → 49, 49 → 49 | adults out of a nest 5.50% of night; T-RHY-5 0.0499; night deaths 1; deaths 1 |
| R1b-null-gate-nopick | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 1 / 1 / 1 | 0.5, 0 | 42 | FAIL: 3 starvation deaths | 0 / 6 | 3 (7: 1, 5: 1, 11: 1) | 0 (-) | illness 1, orphaned infant, did not survive without its mother 2, starvation 3 | 49 → 48, 49 → 47, 49 → 49, 49 → 48, 49 → 47 | adults out of a nest 6.46% of night; T-RHY-5 0.0587; night deaths 1; deaths 6 |
| R1b-W25-rules | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 0 / 0 / 0 | 0.25, 0 | 42 | pass | 0 / 0 | 0 (-) | 0 (-) | - | 49 → 49, 49 → 49, 49 → 49, 48 → 48, 49 → 49 | adults out of a nest 2.24% of night; T-RHY-5 0.0175; night deaths 0; deaths 0 |
| R1b-W25-null | 7658cd7 | 5d4fa5a2a500bce6 | confirm: 30 + 60, 48/7/21/5/11 | 1 / 0 / 0 | 0.25, 0 | 42 | pass | 0 / 1 | 0 (-) | 0 (-) | wounds from a fight with Gomezi 1 | 49 → 49, 49 → 49, 49 → 49, 49 → 49, 49 → 48 | adults out of a nest 5.57% of night; T-RHY-5 0.0391; night deaths 0; deaths 1 |

### Energy by class (the energy readout of each run; per animal-day of the 60 days)

| run | class | kcal in | kcal out | eating min | fruit share of eating | ground km | mean reserve (relative to the store) | lowest point of the class's mean reserve trajectory | median hunger by day |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1b-rules | adult male | 2042 | 1560 | 228.1 | 0.9267 | 2.794 | -0.0026 | -0.0099 | 0.2214 |
| R1b-rules | female, other | 1694 | 1281 | 227.6 | 0.674 | 2.044 | -0.0074 | -0.0187 | 0.2275 |
| R1b-rules | female, pregnant | 1803 | 1382 | 253.8 | 0.6763 | 2.240 | -0.0214 | - | 0.2344 |
| R1b-rules | female, lactating | 2285 | 1734 | 307.8 | 0.6732 | 2.592 | -0.0242 | -0.0439 | 0.2665 |
| R1b-rules | juvenile 5–12 y | 1646 | 1263 | 262.5 | 0.8914 | 3.068 | -0.0404 | -0.0615 | 0.2884 |
| R1b-rules | infant 2–5 y | 716.1 | 612.6 | 131.5 | 0.7957 | 0.4044 | -0.0239 | -0.0363 | 0.2626 |
| R1b-rules | infant 0.5–2 y | 372.1 | 354.7 | 29.18 | 0.6362 | 0.2033 | -0.0274 | -0.0564 | 0.3055 |
| R1b-rules | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-rules-s1 | adult male | 2039 | 1559 | 227.4 | 0.9262 | 2.756 | -0.0021 | -0.0111 | 0.2203 |
| R1b-rules-s1 | female, other | 1701 | 1284 | 229.9 | 0.6628 | 2.102 | -0.0083 | -0.021 | 0.2271 |
| R1b-rules-s1 | female, pregnant | 1818 | 1396 | 257.3 | 0.6725 | 2.351 | -0.0253 | - | 0.2419 |
| R1b-rules-s1 | female, lactating | 2282 | 1733 | 310.3 | 0.6642 | 2.595 | -0.0243 | -0.0456 | 0.2681 |
| R1b-rules-s1 | juvenile 5–12 y | 1641 | 1262 | 267.4 | 0.9017 | 3.030 | -0.0426 | -0.0676 | 0.295 |
| R1b-rules-s1 | infant 2–5 y | 715.1 | 612.7 | 129.1 | 0.8096 | 0.4006 | -0.0248 | -0.04 | 0.2673 |
| R1b-rules-s1 | infant 0.5–2 y | 375.4 | 357.1 | 30.34 | 0.607 | 0.2229 | -0.0268 | -0.0534 | 0.3057 |
| R1b-rules-s1 | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-rules-s2 | adult male | 2035 | 1557 | 227.2 | 0.9244 | 2.752 | -0.0024 | -0.0111 | 0.2209 |
| R1b-rules-s2 | female, other | 1692 | 1281 | 225.0 | 0.6852 | 2.087 | -0.0076 | -0.0212 | 0.2235 |
| R1b-rules-s2 | female, pregnant | 1804 | 1387 | 257.8 | 0.6617 | 2.221 | -0.0237 | - | 0.24 |
| R1b-rules-s2 | female, lactating | 2280 | 1733 | 307.5 | 0.676 | 2.620 | -0.0256 | -0.0483 | 0.2679 |
| R1b-rules-s2 | juvenile 5–12 y | 1639 | 1263 | 265.4 | 0.8922 | 3.049 | -0.0422 | -0.0687 | 0.2941 |
| R1b-rules-s2 | infant 2–5 y | 716.0 | 613.3 | 129.7 | 0.8134 | 0.3977 | -0.0257 | -0.0418 | 0.2661 |
| R1b-rules-s2 | infant 0.5–2 y | 373.6 | 356.6 | 30.23 | 0.6121 | 0.2271 | -0.0291 | -0.06 | 0.3166 |
| R1b-rules-s2 | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-rules-s3 | adult male | 2038 | 1554 | 227.4 | 0.927 | 2.673 | -0.0028 | -0.0095 | 0.2231 |
| R1b-rules-s3 | female, other | 1694 | 1280 | 223.0 | 0.6941 | 2.025 | -0.0066 | -0.0185 | 0.2309 |
| R1b-rules-s3 | female, pregnant | 1816 | 1381 | 270.7 | 0.6157 | 2.211 | -0.0284 | - | 0.2458 |
| R1b-rules-s3 | female, lactating | 2278 | 1732 | 309.4 | 0.6682 | 2.606 | -0.026 | -0.0485 | 0.2721 |
| R1b-rules-s3 | juvenile 5–12 y | 1636 | 1258 | 272.6 | 0.8858 | 3.020 | -0.0474 | -0.0689 | 0.2921 |
| R1b-rules-s3 | infant 2–5 y | 714.7 | 611.4 | 129.2 | 0.8086 | 0.3993 | -0.0239 | -0.0376 | 0.2676 |
| R1b-rules-s3 | infant 0.5–2 y | 372.7 | 358.5 | 50.41 | 0.473 | 0.4939 | -0.0422 | -0.114 | 0.3225 |
| R1b-rules-s3 | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-null | adult male | 2135 | 1644 | 369.9 | 0.5059 | 3.637 | -0.0557 | -0.0996 | 0.4167 |
| R1b-null | female, other | 1741 | 1351 | 363.0 | 0.364 | 3.039 | -0.083 | -0.1342 | 0.4053 |
| R1b-null | female, pregnant | 1798 | 1454 | 372.9 | 0.4047 | 3.346 | -0.1333 | - | 0.4275 |
| R1b-null | female, lactating | 1979 | 1634 | 316.6 | 0.5809 | 3.846 | -0.2009 | -0.3361 | 0.6395 |
| R1b-null | juvenile 5–12 y | 1641 | 1294 | 333.5 | 0.7105 | 3.959 | -0.1076 | -0.163 | 0.4179 |
| R1b-null | infant 2–5 y | 735.3 | 616.0 | 290.2 | 0.4288 | 0.7155 | -0.1356 | -0.2294 | 0.4226 |
| R1b-null | infant 0.5–2 y | 368.2 | 351.6 | 136.5 | 0.192 | 0.4316 | -0.2191 | -0.4149 | 0.5935 |
| R1b-null | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-null-gate | adult male | 2100 | 1614 | 355.1 | 0.5322 | 3.363 | -0.05 | -0.0872 | 0.4094 |
| R1b-null-gate | female, other | 1725 | 1329 | 349.3 | 0.4076 | 2.714 | -0.0602 | -0.1151 | 0.363 |
| R1b-null-gate | female, pregnant | 1798 | 1436 | 375.2 | 0.454 | 3.288 | -0.1203 | - | 0.4191 |
| R1b-null-gate | female, lactating | 1945 | 1611 | 300.2 | 0.6436 | 3.659 | -0.2162 | -0.3275 | 0.6415 |
| R1b-null-gate | juvenile 5–12 y | 1614 | 1273 | 320.0 | 0.7665 | 3.764 | -0.1086 | -0.155 | 0.4325 |
| R1b-null-gate | infant 2–5 y | 749.0 | 615.2 | 308.3 | 0.4733 | 0.5777 | -0.1302 | -0.1973 | 0.3909 |
| R1b-null-gate | infant 0.5–2 y | 366.1 | 349.6 | 154.5 | 0.1915 | 0.4082 | -0.2209 | -0.395 | 0.5608 |
| R1b-null-gate | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-null-nopick | adult male | 2185 | 1669 | 412.8 | 0.4304 | 4.389 | -0.0556 | -0.0966 | 0.3906 |
| R1b-null-nopick | female, other | 1799 | 1365 | 406.2 | 0.3206 | 3.531 | -0.0696 | -0.1123 | 0.3359 |
| R1b-null-nopick | female, pregnant | 1808 | 1471 | 423.6 | 0.3798 | 3.977 | -0.1678 | - | 0.4586 |
| R1b-null-nopick | female, lactating | 1982 | 1628 | 341.3 | 0.5249 | 4.426 | -0.2221 | -0.3447 | 0.6446 |
| R1b-null-nopick | juvenile 5–12 y | 1664 | 1312 | 354.1 | 0.7046 | 4.725 | -0.1167 | -0.1701 | 0.42 |
| R1b-null-nopick | infant 2–5 y | 735.6 | 612.8 | 318.0 | 0.4319 | 0.7409 | -0.1771 | -0.2739 | 0.4509 |
| R1b-null-nopick | infant 0.5–2 y | 360.8 | 348.3 | 161.4 | 0.1792 | 0.4428 | -0.265 | -0.4571 | 0.5914 |
| R1b-null-nopick | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-null-gate-nopick | adult male | 2147 | 1655 | 400.6 | 0.4742 | 4.300 | -0.0557 | -0.1006 | 0.3937 |
| R1b-null-gate-nopick | female, other | 1780 | 1359 | 395.8 | 0.3605 | 3.544 | -0.0608 | -0.111 | 0.3347 |
| R1b-null-gate-nopick | female, pregnant | 1821 | 1464 | 425.3 | 0.4332 | 4.347 | -0.1312 | - | 0.4119 |
| R1b-null-gate-nopick | female, lactating | 1931 | 1616 | 316.9 | 0.6061 | 4.357 | -0.2255 | -0.32 | 0.6429 |
| R1b-null-gate-nopick | juvenile 5–12 y | 1641 | 1295 | 334.6 | 0.7514 | 4.537 | -0.1047 | -0.1523 | 0.4186 |
| R1b-null-gate-nopick | infant 2–5 y | 737.8 | 611.6 | 317.2 | 0.4896 | 0.5991 | -0.1616 | -0.2465 | 0.42 |
| R1b-null-gate-nopick | infant 0.5–2 y | 348.4 | 343.4 | 175.1 | 0.1738 | 0.4037 | -0.2888 | -0.4384 | 0.5924 |
| R1b-null-gate-nopick | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-W25-rules | adult male | 2036 | 1560 | 227.5 | 0.9254 | 2.769 | -0.003 | -0.0119 | 0.2237 |
| R1b-W25-rules | female, other | 1678 | 1282 | 234.9 | 0.6478 | 2.058 | -0.0089 | -0.0181 | 0.2291 |
| R1b-W25-rules | female, pregnant | 1801 | 1394 | 261.8 | 0.6628 | 2.297 | -0.025 | - | 0.2433 |
| R1b-W25-rules | female, lactating | 2255 | 1730 | 320.5 | 0.6492 | 2.664 | -0.0274 | -0.0484 | 0.2812 |
| R1b-W25-rules | juvenile 5–12 y | 1632 | 1262 | 271.1 | 0.8752 | 3.074 | -0.0458 | -0.071 | 0.2967 |
| R1b-W25-rules | infant 2–5 y | 714.7 | 612.5 | 131.1 | 0.8028 | 0.3941 | -0.0259 | -0.0399 | 0.2703 |
| R1b-W25-rules | infant 0.5–2 y | 379.8 | 361.2 | 32.59 | 0.5917 | 0.2368 | -0.0312 | -0.061 | 0.324 |
| R1b-W25-rules | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |
| R1b-W25-null | adult male | 2088 | 1644 | 368.9 | 0.5217 | 3.610 | -0.0593 | -0.1066 | 0.4367 |
| R1b-W25-null | female, other | 1703 | 1355 | 362.6 | 0.3749 | 3.091 | -0.0746 | -0.139 | 0.4029 |
| R1b-W25-null | female, pregnant | 1759 | 1453 | 379.0 | 0.4107 | 3.202 | -0.1216 | - | 0.4396 |
| R1b-W25-null | female, lactating | 1930 | 1623 | 315.9 | 0.5879 | 3.805 | -0.2063 | -0.3431 | 0.6586 |
| R1b-W25-null | juvenile 5–12 y | 1629 | 1298 | 332.0 | 0.7183 | 4.041 | -0.1016 | -0.1574 | 0.4142 |
| R1b-W25-null | infant 2–5 y | 719.5 | 616.0 | 309.7 | 0.418 | 0.7199 | -0.1499 | -0.2492 | 0.4465 |
| R1b-W25-null | infant 0.5–2 y | 354.1 | 349.0 | 140.3 | 0.1843 | 0.4181 | -0.2275 | -0.4125 | 0.611 |
| R1b-W25-null | infant < 0.5 y | - | - | - | 0 | - | - | 0 | 0 |

Deaths by class and cause (energy readout): R1b-rules: {"female, other: respiratory illness (outbreak)": 1, "infant 0.5–2 y: respiratory illness (outbreak)": 1}; R1b-rules-s1: {}; R1b-rules-s2: {}; R1b-rules-s3: {"adult male: respiratory illness (outbreak)": 3, "female, lactating: respiratory illness (outbreak)": 1, "female, pregnant: respiratory illness (outbreak)": 1, "juvenile 5–12 y: respiratory illness (outbreak)": 1, "infant 2–5 y: respiratory illness (outbreak)": 1}; R1b-null: {"infant 0.5–2 y: illness": 1}; R1b-null-gate: {"female, lactating: starvation": 1, "female, pregnant: wounds from a fight with Gomezi": 1, "juvenile 5–12 y: illness": 1, "female, pregnant: wounds from a fight with Lembai": 1, "female, pregnant: respiratory illness (outbreak)": 1, "infant 0.5–2 y: illness": 1}; R1b-null-nopick: {"infant 0.5–2 y: illness": 1}; R1b-null-gate-nopick: {"adult male: illness": 1, "female, lactating: starvation": 3, "infant 0.5–2 y: orphaned infant, did not survive without its mother": 2}; R1b-W25-rules: {}; R1b-W25-null: {"female, other: wounds from a fight with Gomezi": 1}.

### Headline: rows that move when the choice is random

| arm | run | judged rows (numeric / pattern) | rows that MOVE (numeric / pattern) | without the rare rows: move of judged | moved rows whose verdict is one no rules run gave | distance to the band: moved rows farther / nearer / unchanged | candidates without a value under the arm | candidates the rules group cannot judge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (b) null kernel, gate off, rules' pick kept (the main number) | R1b-null | 49 (37 / 12) | **26** (26 / 0) | 25 of 47 | 9 | 12 / 4 / 10 (numeric rows) | 0 | 17: T-ACT-5, T-IGE-1, T-IGE-3, T-IGE-4, T-PAT-1, T-PAT-2, T-PAT-3, T-PAT-5, T-PAT-6, T-PAT-7, T-COM-3, T-ENE-7, T-RHY-8, T-END-2, T-END-9, T-INF-1, T-INF-3 |
| (c) null kernel, gate on, pick kept | R1b-null-gate | 48 (37 / 11) | **26** (26 / 0) | 24 of 46 | 8 | 17 / 2 / 7 (numeric rows) | 1: T-HUN-9 | 17: T-ACT-5, T-IGE-1, T-IGE-3, T-IGE-4, T-PAT-1, T-PAT-2, T-PAT-3, T-PAT-5, T-PAT-6, T-PAT-7, T-COM-3, T-ENE-7, T-RHY-8, T-END-2, T-END-9, T-INF-1, T-INF-3 |
| (d) null kernel, gate off, pick removed | R1b-null-nopick | 46 (35 / 11) | **28** (28 / 0) | 27 of 44 | 9 | 16 / 4 / 8 (numeric rows) | 3: T-HUN-7, T-HUN-8, T-HUN-9 | 17: T-ACT-5, T-IGE-1, T-IGE-3, T-IGE-4, T-PAT-1, T-PAT-2, T-PAT-3, T-PAT-5, T-PAT-6, T-PAT-7, T-COM-3, T-ENE-7, T-RHY-8, T-END-2, T-END-9, T-INF-1, T-INF-3 |
| (e) null kernel, gate on, pick removed | R1b-null-gate-nopick | 46 (35 / 11) | **33** (29 / 4) | 31 of 44 | 10 | 18 / 4 / 7 (numeric rows) | 3: T-HUN-7, T-HUN-8, T-HUN-9 | 17: T-ACT-5, T-IGE-1, T-IGE-3, T-IGE-4, T-PAT-1, T-PAT-2, T-PAT-3, T-PAT-5, T-PAT-6, T-PAT-7, T-COM-3, T-ENE-7, T-RHY-8, T-END-2, T-END-9, T-INF-1, T-INF-3 |

Chance alone, by the same rule: each rules run judged against the other 3 (z with n = 3): R1b-rules: 4 of 51 move (T-ACT-5, T-RNG-4, T-BRD-1, T-RHY-8); R1b-rules-s1: 3 of 49 move (T-IGE-2, T-HUN-8, T-SOC-10); R1b-rules-s2: 1 of 49 move (T-HUN-4); R1b-rules-s3: 5 of 52 move (T-HUN-1, T-SOC-3, T-COM-3, T-ENE-7, T-END-2). Mean 3.2 rows.

(b) R1b-null: **26 of 49 judged daytime rows move** when the choice is random; these are T-ACT-1, T-ACT-2, T-ACT-4, T-RNG-4, T-RNG-5, T-BRD-1, T-FOOD-2, T-FOOD-6, T-HUN-1, T-HUN-2, T-HUN-8, T-SOC-2, T-SOC-5, T-SOC-6, T-SOC-10, T-COM-1, T-COM-5, T-COM-8, T-COM-11, T-ENE-3, T-RHY-6, T-INF-2, T-INF-5, T-INF-6, T-SOC-14, T-SOC-16. The 23 that do not move: T-ACT-3, T-PTY-1, T-PTY-3, T-IGE-2, T-FOOD-5, T-FOOD-7, T-HUN-3, T-HUN-4, T-HUN-7, T-HUN-9, T-SOC-3, T-SOC-8, T-SOC-9, T-SOC-12, T-COM-2, T-COM-4, T-COM-6, T-COM-7, T-COM-9, T-ENE-2, T-END-3, T-END-8, T-SOC-15.

(c) R1b-null-gate: **26 of 48 judged daytime rows move** when the choice is random; these are T-ACT-1, T-ACT-3, T-ACT-4, T-PTY-1, T-RNG-4, T-RNG-5, T-BRD-1, T-FOOD-2, T-FOOD-6, T-HUN-1, T-HUN-2, T-HUN-4, T-HUN-8, T-SOC-2, T-SOC-3, T-SOC-5, T-SOC-6, T-SOC-9, T-SOC-10, T-COM-1, T-COM-8, T-ENE-3, T-INF-2, T-INF-5, T-SOC-14, T-SOC-16. The 22 that do not move: T-ACT-2, T-PTY-3, T-IGE-2, T-FOOD-5, T-FOOD-7, T-HUN-3, T-HUN-7, T-SOC-8, T-SOC-12, T-COM-2, T-COM-4, T-COM-5, T-COM-6, T-COM-7, T-COM-9, T-COM-11, T-ENE-2, T-RHY-6, T-END-3, T-END-8, T-INF-6, T-SOC-15.

(d) R1b-null-nopick: **28 of 46 judged daytime rows move** when the choice is random; these are T-ACT-1, T-ACT-2, T-ACT-3, T-ACT-4, T-PTY-1, T-RNG-4, T-FOOD-2, T-FOOD-7, T-HUN-1, T-HUN-2, T-HUN-3, T-HUN-4, T-SOC-2, T-SOC-3, T-SOC-5, T-SOC-6, T-SOC-9, T-SOC-10, T-COM-1, T-COM-5, T-COM-8, T-COM-11, T-ENE-2, T-ENE-3, T-INF-2, T-INF-5, T-SOC-14, T-SOC-16. The 18 that do not move: T-PTY-3, T-RNG-5, T-IGE-2, T-BRD-1, T-FOOD-5, T-FOOD-6, T-SOC-8, T-SOC-12, T-COM-2, T-COM-4, T-COM-6, T-COM-7, T-COM-9, T-RHY-6, T-END-3, T-END-8, T-INF-6, T-SOC-15.

(e) R1b-null-gate-nopick: **33 of 46 judged daytime rows move** when the choice is random; these are T-ACT-1, T-ACT-2, T-ACT-3, T-ACT-4, T-PTY-1, T-RNG-4, T-BRD-1, T-FOOD-2, T-FOOD-5, T-FOOD-7, T-HUN-1, T-HUN-2, T-HUN-3, T-HUN-4, T-SOC-2, T-SOC-3, T-SOC-5, T-SOC-6, T-SOC-9, T-COM-1, T-COM-2, T-COM-5, T-COM-8, T-COM-11, T-ENE-3, T-END-3, T-END-8, T-INF-2, T-INF-5, T-INF-6, T-SOC-14, T-SOC-15, T-SOC-16. The 13 that do not move: T-PTY-3, T-RNG-5, T-IGE-2, T-FOOD-6, T-SOC-8, T-SOC-10, T-SOC-12, T-COM-4, T-COM-6, T-COM-7, T-COM-9, T-ENE-2, T-RHY-6.

### Rows that move, by target family

| family | candidate rows | (b) move of judged | (c) move of judged | (d) move of judged | (e) move of judged |
| --- | --- | --- | --- | --- | --- |
| activity budget (T-ACT) | 5 | 3 of 4 | 3 of 4 | 4 of 4 | 4 of 4 |
| party size (T-PTY) | 2 | 0 of 2 | 1 of 2 | 1 of 2 | 1 of 2 |
| ranging (T-RNG) | 2 | 2 of 2 | 2 of 2 | 1 of 2 | 1 of 2 |
| intergroup encounters (T-IGE) | 4 | 0 of 1 | 0 of 1 | 0 of 1 | 0 of 1 |
| patrols (T-PAT) | 6 | 0 of 0 | 0 of 0 | 0 of 0 | 0 of 0 |
| border stops (T-BRD) | 1 | 1 of 1 | 1 of 1 | 0 of 1 | 1 of 1 |
| feeding ecology (T-FOOD) | 4 | 2 of 4 | 2 of 4 | 2 of 4 | 3 of 4 |
| hunting (T-HUN) | 7 | 3 of 7 | 4 of 6 | 4 of 4 | 4 of 4 |
| social (T-SOC) | 11 | 6 of 11 | 8 of 11 | 8 of 11 | 8 of 11 |
| communication (T-COM) | 10 | 4 of 9 | 2 of 9 | 4 of 9 | 5 of 9 |
| energy (T-ENE) | 3 | 1 of 2 | 1 of 2 | 2 of 2 | 1 of 2 |
| rhythm and water (T-RHY) | 2 | 1 of 1 | 0 of 1 | 0 of 1 | 0 of 1 |
| hormone-like states (T-END) | 4 | 0 of 2 | 0 of 2 | 0 of 2 | 2 of 2 |
| infants (T-INF) | 5 | 3 of 3 | 2 of 3 | 2 of 3 | 3 of 3 |
| all | 66 | 26 of 49 | 26 of 48 | 28 of 46 | 33 of 46 |

### Pick kept against removed, gate off against on (rows judged in both arms)

| contrast | rows judged in both | move in the first | move in the second | move in both | move in the first only | move in the second only | move in both, opposite directions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pick kept against removed, gate off: (b) against (d) | 46 | 25 | 28 | 20 | T-RNG-5, T-BRD-1, T-FOOD-6, T-RHY-6, T-INF-6 | T-ACT-3, T-PTY-1, T-FOOD-7, T-HUN-3, T-HUN-4, T-SOC-3, T-SOC-9, T-ENE-2 | - |
| pick kept against removed, gate on: (c) against (e) | 46 | 25 | 33 | 22 | T-RNG-5, T-FOOD-6, T-SOC-10 | T-ACT-2, T-FOOD-5, T-FOOD-7, T-HUN-3, T-COM-2, T-COM-5, T-COM-11, T-END-3, T-END-8, T-INF-6, T-SOC-15 | T-BRD-1 |
| gate off against on, pick kept: (b) against (c) | 48 | 26 | 26 | 21 | T-ACT-2, T-COM-5, T-COM-11, T-RHY-6, T-INF-6 | T-ACT-3, T-PTY-1, T-HUN-4, T-SOC-3, T-SOC-9 | - |
| gate off against on, pick removed: (d) against (e) | 46 | 28 | 33 | 26 | T-SOC-10, T-ENE-2 | T-BRD-1, T-FOOD-5, T-COM-2, T-END-3, T-END-8, T-INF-6, T-SOC-15 | - |

Rows judged in all 4 null arms: 46. Move in every arm: 16 (T-ACT-1, T-ACT-4, T-RNG-4, T-FOOD-2, T-HUN-1, T-HUN-2, T-SOC-2, T-SOC-5, T-SOC-6, T-COM-1, T-COM-8, T-ENE-3, T-INF-2, T-INF-5, T-SOC-14, T-SOC-16); of these in one direction in every arm: 16. Move in no arm: 8 (T-PTY-3, T-IGE-2, T-SOC-8, T-SOC-12, T-COM-4, T-COM-6, T-COM-7, T-COM-9). Move in some arms only: 22 (T-ACT-2, T-ACT-3, T-PTY-1, T-RNG-5, T-BRD-1, T-FOOD-5, T-FOOD-6, T-FOOD-7, T-HUN-3, T-HUN-4, T-SOC-3, T-SOC-9, T-SOC-10, T-COM-2, T-COM-5, T-COM-11, T-ENE-2, T-RHY-6, T-END-3, T-END-8, T-INF-6, T-SOC-15).

### Arm (b) R1b-null: null kernel, gate off, rules' pick kept (the main number), against the rules group

| row | family | role | band | rules: mean of the pooled values ± SD over runs (SD used) | rules: verdicts | rules: mean band distance | arm: pooled value | arm: verdict | arm: band distance | z | result | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | activity budget | fitted | 0.33–0.5 | 0.3684 ± 0.0039 (0.0085) | pass ×4 | 0 | 0.449 | pass | 0 | +8.5 | **MOVES** |  |
| T-ACT-2 | activity budget | fitted | 0.12–0.25 | 0.1132 ± 0.0023 (0.0065) | fail ×4 | 0.0524 | 0.1427 | pass | 0 | +4.1 | **MOVES** |  |
| T-ACT-3 | activity budget | fitted | 0.08–0.18 | 0.0923 ± 0.0013 (0.005) | fail ×4 | 0.0787 | 0.0901 | pass | 0 | -0.4 | does not move |  |
| T-ACT-4 | activity budget | fitted | 0.3–0.47 | 0.4455 ± 0.0107 (0.0107) | pass ×2, inconclusive ×2 | 0 | 0.332 | pass | 0 | -9.5 | **MOVES** |  |
| T-ACT-5 | activity budget | held-out | male–female feeding difference ≤ 0.05; lactating females … | -0.0456 ± 0.0054 | fail ×3, pass ×1 | - | 0.03 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-PTY-1 | party size | fitted | 4.5–9.2 | 4.038 ± 0.143 (0.235) | fail ×3, inconclusive ×1 | 0.0984 | 4.445 | inconclusive | 0.0116 | +1.6 | does not move |  |
| T-PTY-3 | party size | held-out | periphery parties have ≥ 1.5× the males of core-only parties | 1.131 ± 0.0755 | fail ×4 | - | 0.668 | fail | - | - | does not move |  |
| T-RNG-4 | ranging | fitted | 1.5–3.5 | 2.354 ± 0.1541 (0.1541) | fail ×4 | 0 | 3.139 | fail | 0 | +4.6 | **MOVES** |  |
| T-RNG-5 | ranging | held-out | 0.3–0.75 | 0.9492 ± 0.0548 (0.0548) | fail ×3, inconclusive ×1 | 0.4427 | 1.147 | fail | 0.8819 | +3.2 | **MOVES** |  |
| T-IGE-1 | intergroup encounters | fitted | 5–12 | 7.072 ± 2.996 | inconclusive ×4 | 0.0483 | 14.29 | inconclusive | 0.3273 | - | not judged: rules group without a value (not counted: instrument below bar) |  |
| T-IGE-2 | intergroup encounters | held-out | 0.7–0.9 | 0.9317 ± 0.0608 (0.0608) | inconclusive ×3, fail ×1 | 0.2123 | 0.9839 | fail | 0.4194 | +0.8 | does not move |  |
| T-IGE-3 | intergroup encounters | held-out | 0.25–0.75 | 2.017 ± 0.8146 | fail ×3, insufficient ×1 | 2.534 | 0.82 | fail | 0.1399 | - | not judged: rules group without a value (insufficient) | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-IGE-4 | intergroup encounters | fitted | as reported | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) |  |
| T-PAT-1 | patrols | fitted | 0.1–0.5 | 0.0599 ± 0.033 | inconclusive ×3, fail ×1 | 0.1006 | 0.0077 | fail | 0.2307 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-2 | patrols | held-out | 7–18 | 1.944 ± 1.327 | fail ×4 | 0.4596 | 0.171 | fail | 0.6208 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-3 | patrols | held-out | 0.55–0.85 | 0.6744 ± 0.1012 | inconclusive ×3, pass ×1 | 0.0139 | 0.5 | fail | 0.1667 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-5 | patrols | held-out | 60–240 | 97.19 ± 12.52 | pass ×3, inconclusive ×1 | 0 | 25.00 | fail | 0.1944 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-6 | patrols | fitted | 0.4–0.7 | 0.7414 ± 0.2379 | inconclusive ×3, fail ×1 | 0.4065 | 0 | fail | 1.333 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-7 | patrols | held-out | 0.15–0.45 | 0.0609 ± 0.0793 | inconclusive ×2, fail ×2 | 0.3109 | 0 | fail | 0.5 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-BRD-1 | border stops | held-out | 0.037–0.107 | -0.082 ± 0.0786 (0.0786) | fail ×4 | 1.700 | 0.1039 | inconclusive | 0 | +2.1 | **MOVES** | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-FOOD-2 | feeding ecology | fitted | 0.6–0.78 | 0.8123 ± 0.0107 (0.0107) | inconclusive ×4 | 0.1794 | 0.5062 | fail | 0.5209 | -25.7 | **MOVES** |  |
| T-FOOD-5 | feeding ecology | held-out | 0.15–0.45 | 0.093 ± 0.0066 (0.015) | fail ×4 | 0.1899 | 0.1109 | fail | 0.1303 | +1.1 | does not move |  |
| T-FOOD-6 | feeding ecology | held-out | 2–7 | 12.13 ± 0.3015 (0.3015) | fail ×4 | 1.025 | 12.99 | fail | 1.197 | +2.6 | **MOVES** |  |
| T-FOOD-7 | feeding ecology | held-out | 300–800 | 168.8 ± 8.587 (25.00) | fail ×4 | 0.2623 | 184.3 | fail | 0.2314 | +0.6 | does not move |  |
| T-HUN-1 | hunting | fitted | 4–11 | 7.749 ± 0.5038 (0.5038) | pass ×2, inconclusive ×2 | 0 | 5.628 | inconclusive | 0 | -3.8 | **MOVES** |  |
| T-HUN-2 | hunting | fitted | 0.5–0.8 | 0.5307 ± 0.1003 (0.1003) | inconclusive ×3, fail ×1 | 0.0911 | 0.1905 | fail | 1.032 | -3.0 | **MOVES** |  |
| T-HUN-3 | hunting | fitted | 0.05–0.4 | 0.046 ± 0.0032 (0.0175) | inconclusive ×4 | 0.0115 | 0.0272 | fail | 0.0652 | -1.0 | does not move |  |
| T-HUN-4 | hunting | held-out | 1.05–1.8 | 2.450 ± 0.4418 (0.4418) | inconclusive ×3, fail ×1 | 0.8667 | 1.672 | inconclusive | 0 | -1.6 | does not move | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-HUN-7 | hunting | fitted | 1.2–2 | 1.000 ± 0 (0.04) | fail ×4 | 0.25 | 1.000 | fail | 0.25 | +0.0 | does not move |  |
| T-HUN-8 | hunting | held-out | 0.8–0.95 | 0.9516 ± 0.0383 (0.0383) | inconclusive ×3, fail ×1 | 0.0833 | 0.75 | inconclusive | 0.3333 | -4.7 | **MOVES** |  |
| T-HUN-9 | hunting | held-out | about half of those present eat; bond partners favoured ~… | 0.2174 ± 0.0505 | fail ×4 | - | 0.2429 | fail | - | - | does not move |  |
| T-SOC-2 | social | held-out | 0.55–0.9 | 0.7775 ± 0.0162 (0.0175) | pass ×3, inconclusive ×1 | 0 | 0.9412 | inconclusive | 0.1176 | +8.4 | **MOVES** |  |
| T-SOC-3 | social | held-out | 0.45–0.8 | 0.7335 ± 0.0827 (0.0827) | inconclusive ×4 | 0 | 0.7622 | inconclusive | 0 | +0.3 | does not move |  |
| T-SOC-5 | social | held-out | 0.2–0.7 | 0.6376 ± 0.0404 (0.0404) | inconclusive ×4 | 0 | 0.4344 | pass | 0 | -4.5 | **MOVES** |  |
| T-SOC-6 | social | held-out | 0.6–0.9 | 0.4669 ± 0.0148 (0.015) | fail ×4 | 0.4436 | 0.4102 | fail | 0.6327 | -3.4 | **MOVES** |  |
| T-SOC-8 | social | fitted | as reported | 0.003 ± 0.000891 | fail ×4 | - | 0.0331 | fail | - | - | does not move |  |
| T-SOC-9 | social | fitted | 0.08–0.22 | 0.1791 ± 0.0576 (0.0576) | inconclusive ×3, pass ×1 | 0.0448 | 0.2795 | inconclusive | 0.4251 | +1.6 | does not move |  |
| T-SOC-10 | social | held-out | 0.1–0.3 | 0.1853 ± 0.015 (0.015) | pass ×4 | 0 | 0.464 | fail | 0.8199 | +16.6 | **MOVES** |  |
| T-SOC-12 | social | held-out | captive; qualitative | 8.080 ± 0.4696 | pass ×4 | - | 3.999 | pass | - | - | does not move |  |
| T-COM-1 | communication | fitted | 0.5–1.5 | 0.5578 ± 0.0079 (0.05) | inconclusive ×3, pass ×1 | 0 | 2.508 | fail | 1.008 | +34.9 | **MOVES** |  |
| T-COM-2 | communication | held-out | rate falls with rank number | 0.1215 ± 0.0648 | fail ×4 | - | 0.2399 | fail | - | - | does not move |  |
| T-COM-3 | communication | held-out | periphery rate below core rate | -0.0934 ± 0.0821 | pass ×3, fail ×1 | - | -0.7222 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-COM-4 | communication | held-out | travel most common; fruit > herbs | 0.4833 ± 0.0058 | pass ×4 | - | 0.3391 | pass | - | - | does not move |  |
| T-COM-5 | communication | fitted | 2–4 | 2.932 ± 0.0451 (0.1) | pass ×4 | 0 | 3.229 | pass | 0 | +2.7 | **MOVES** |  |
| T-COM-6 | communication | fitted | as reported | 4.000 ± 0 | pass ×4 | - | 4.000 | pass | - | - | does not move |  |
| T-COM-7 | communication | held-out | less drumming in large parties | 0.092 ± 0.0183 | fail ×4 | - | 0.0766 | fail | - | - | does not move |  |
| T-COM-8 | communication | fitted | 0.3–0.6 | 0.6085 ± 0.0111 (0.015) | inconclusive ×4 | 0.0325 | 0.8372 | fail | 0.7908 | +13.6 | **MOVES** |  |
| T-COM-9 | communication | held-out | status, not food amount | 0.5529 ± 0.0129 | fail ×4 | - | 0.5081 | fail | - | - | does not move |  |
| T-COM-11 | communication | fitted | 0.25–0.55 | 0.1066 ± 0.0204 (0.0204) | fail ×2, inconclusive ×2 | 0.4779 | 0.186 | inconclusive | 0.2132 | +3.5 | **MOVES** |  |
| T-ENE-2 | energy | fitted | 250–370 | 315.6 ± 1.325 (6.000) | pass ×4 | 0 | 324.8 | pass | 0 | +1.4 | does not move | 24-hour total of a daytime act (feeding) |
| T-ENE-3 | energy | held-out | 650–1100 | 828.3 ± 0.5546 (22.50) | pass ×4 | 0 | 722.9 | pass | 0 | -4.2 | **MOVES** | 24-hour total of a daytime act (eating) |
| T-ENE-7 | energy | held-out | feeding time lower on days with a swollen parous female p… | 0.6 ± 0.1633 | pass ×3, fail ×1 | - | 1.000 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-RHY-6 | rhythm and water | held-out | 0.3–2 | 0.3486 ± 0.0162 (0.085) | inconclusive ×3, pass ×1 | 0 | 0.633 | pass | 0 | +3.0 | **MOVES** |  |
| T-RHY-8 | rhythm and water | held-out | positive association of resting with temperature; midday … | 0.45 ± 0.2517 | fail ×3, pass ×1 | - | 0 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-END-2 | hormone-like states | held-out | not negative: high-ranking males are not less stressed th… | 0.55 ± 0.1 | pass ×3, fail ×1 | - | 0 | fail | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-END-3 | hormone-like states | held-out | higher with a swollen parous female in the party | 1.000 ± 0 | pass ×4 | - | 0.6 | pass | - | - | does not move |  |
| T-END-8 | hormone-like states | held-out | positive association | 0.25 ± 0.1915 | fail ×4 | - | 0 | fail | - | - | does not move |  |
| T-END-9 | hormone-like states | held-out | higher on patrol days | 0.55 ± 0.1915 | fail ×2, pass ×2 | - | 0.6 | pass | - | - | not judged: the rules runs disagree (fail ×2, pass ×2) |  |
| T-INF-1 | infants | held-out | rises with age; within a factor 1.5 of the Gombe value in… | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | infants are under 8: their own choices stay with the rules in every arm; expected without a value in 60 days |
| T-INF-2 | infants | held-out | 1–6 | 12.05 ± 0.1151 (0.25) | fail ×4 | 1.210 | 3.625 | pass | 0 | -30.1 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-3 | infants | held-out | 3.7–5.8 | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | expected without a value in 60 days (needs weanings in the window) |
| T-INF-5 | infants | held-out | 0.5–2 | 1.223 ± 0.0192 (0.075) | pass ×4 | 0 | 0.4775 | inconclusive | 0.015 | -8.9 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-6 | infants | held-out | 0.014–0.06 | 0.0343 ± 0.0015 (0.0023) | pass ×4 | 0 | 0.044 | pass | 0 | +3.8 | **MOVES** | the infant's side stays with the rules in every arm |
| T-SOC-14 | social | held-out | 0.08–0.37 | 0.0607 ± 0.0056 (0.0145) | fail ×3, inconclusive ×1 | 0.0666 | 0.5609 | fail | 0.6582 | +30.9 | **MOVES** | contests at any hour |
| T-SOC-15 | social | held-out | contact share at a large rank difference below the share … | 0.75 ± 0.1 | pass ×4 | - | 0.6 | pass | - | - | does not move | contests at any hour |
| T-SOC-16 | social | held-out | 0.03–0.2 | 0.1858 ± 0.0096 (0.0096) | inconclusive ×3, pass ×1 | 0 | 0.1491 | pass | 0 | -3.4 | **MOVES** | contests at any hour |

### Arm (c) R1b-null-gate: null kernel, gate on, pick kept, against the rules group

| row | family | role | band | rules: mean of the pooled values ± SD over runs (SD used) | rules: verdicts | rules: mean band distance | arm: pooled value | arm: verdict | arm: band distance | z | result | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | activity budget | fitted | 0.33–0.5 | 0.3684 ± 0.0039 (0.0085) | pass ×4 | 0 | 0.4337 | pass | 0 | +6.9 | **MOVES** |  |
| T-ACT-2 | activity budget | fitted | 0.12–0.25 | 0.1132 ± 0.0023 (0.0065) | fail ×4 | 0.0524 | 0.1246 | fail | 0.0273 | +1.6 | does not move |  |
| T-ACT-3 | activity budget | fitted | 0.08–0.18 | 0.0923 ± 0.0013 (0.005) | fail ×4 | 0.0787 | 0.0668 | fail | 0.1286 | -4.6 | **MOVES** |  |
| T-ACT-4 | activity budget | fitted | 0.3–0.47 | 0.4455 ± 0.0107 (0.0107) | pass ×2, inconclusive ×2 | 0 | 0.3428 | pass | 0 | -8.6 | **MOVES** |  |
| T-ACT-5 | activity budget | held-out | male–female feeding difference ≤ 0.05; lactating females … | -0.0456 ± 0.0054 | fail ×3, pass ×1 | - | 0.0433 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-PTY-1 | party size | fitted | 4.5–9.2 | 4.038 ± 0.143 (0.235) | fail ×3, inconclusive ×1 | 0.0984 | 3.239 | fail | 0.2684 | -3.0 | **MOVES** |  |
| T-PTY-3 | party size | held-out | periphery parties have ≥ 1.5× the males of core-only parties | 1.131 ± 0.0755 | fail ×4 | - | 0.7805 | fail | - | - | does not move |  |
| T-RNG-4 | ranging | fitted | 1.5–3.5 | 2.354 ± 0.1541 (0.1541) | fail ×4 | 0 | 2.807 | fail | 0 | +2.6 | **MOVES** |  |
| T-RNG-5 | ranging | held-out | 0.3–0.75 | 0.9492 ± 0.0548 (0.0548) | fail ×3, inconclusive ×1 | 0.4427 | 1.164 | fail | 0.9197 | +3.5 | **MOVES** |  |
| T-IGE-1 | intergroup encounters | fitted | 5–12 | 7.072 ± 2.996 | inconclusive ×4 | 0.0483 | 37.65 | fail | 3.664 | - | not judged: rules group without a value (not counted: instrument below bar) |  |
| T-IGE-2 | intergroup encounters | held-out | 0.7–0.9 | 0.9317 ± 0.0608 (0.0608) | inconclusive ×3, fail ×1 | 0.2123 | 0.9765 | fail | 0.3826 | +0.7 | does not move |  |
| T-IGE-3 | intergroup encounters | held-out | 0.25–0.75 | 2.017 ± 0.8146 | fail ×3, insufficient ×1 | 2.534 | 0.2598 | inconclusive | 0 | - | not judged: rules group without a value (insufficient) | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-IGE-4 | intergroup encounters | fitted | as reported | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) |  |
| T-PAT-1 | patrols | fitted | 0.1–0.5 | 0.0599 ± 0.033 | inconclusive ×3, fail ×1 | 0.1006 | 0 | fail | 0.25 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-2 | patrols | held-out | 7–18 | 1.944 ± 1.327 | fail ×4 | 0.4596 | 0 | fail | 0.6364 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-3 | patrols | held-out | 0.55–0.85 | 0.6744 ± 0.1012 | inconclusive ×3, pass ×1 | 0.0139 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-5 | patrols | held-out | 60–240 | 97.19 ± 12.52 | pass ×3, inconclusive ×1 | 0 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-6 | patrols | fitted | 0.4–0.7 | 0.7414 ± 0.2379 | inconclusive ×3, fail ×1 | 0.4065 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-7 | patrols | held-out | 0.15–0.45 | 0.0609 ± 0.0793 | inconclusive ×2, fail ×2 | 0.3109 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-BRD-1 | border stops | held-out | 0.037–0.107 | -0.082 ± 0.0786 (0.0786) | fail ×4 | 1.700 | 0.0955 | pass | 0 | +2.0 | **MOVES** | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-FOOD-2 | feeding ecology | fitted | 0.6–0.78 | 0.8123 ± 0.0107 (0.0107) | inconclusive ×4 | 0.1794 | 0.5463 | fail | 0.2986 | -22.3 | **MOVES** |  |
| T-FOOD-5 | feeding ecology | held-out | 0.15–0.45 | 0.093 ± 0.0066 (0.015) | fail ×4 | 0.1899 | 0.098 | fail | 0.1733 | +0.3 | does not move |  |
| T-FOOD-6 | feeding ecology | held-out | 2–7 | 12.13 ± 0.3015 (0.3015) | fail ×4 | 1.025 | 12.85 | fail | 1.170 | +2.1 | **MOVES** |  |
| T-FOOD-7 | feeding ecology | held-out | 300–800 | 168.8 ± 8.587 (25.00) | fail ×4 | 0.2623 | 220.1 | fail | 0.1599 | +1.8 | does not move |  |
| T-HUN-1 | hunting | fitted | 4–11 | 7.749 ± 0.5038 (0.5038) | pass ×2, inconclusive ×2 | 0 | 1.611 | inconclusive | 0.3412 | -10.9 | **MOVES** |  |
| T-HUN-2 | hunting | fitted | 0.5–0.8 | 0.5307 ± 0.1003 (0.1003) | inconclusive ×3, fail ×1 | 0.0911 | 0.125 | inconclusive | 1.250 | -3.6 | **MOVES** |  |
| T-HUN-3 | hunting | fitted | 0.05–0.4 | 0.046 ± 0.0032 (0.0175) | inconclusive ×4 | 0.0115 | 0.0085 | fail | 0.1185 | -1.9 | does not move |  |
| T-HUN-4 | hunting | held-out | 1.05–1.8 | 2.450 ± 0.4418 (0.4418) | inconclusive ×3, fail ×1 | 0.8667 | 3.892 | fail | 2.789 | +2.9 | **MOVES** | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-HUN-7 | hunting | fitted | 1.2–2 | 1.000 ± 0 (0.04) | fail ×4 | 0.25 | 1.000 | fail | 0.25 | +0.0 | does not move |  |
| T-HUN-8 | hunting | held-out | 0.8–0.95 | 0.9516 ± 0.0383 (0.0383) | inconclusive ×3, fail ×1 | 0.0833 | 0 | fail | 5.333 | -22.2 | **MOVES** |  |
| T-HUN-9 | hunting | held-out | about half of those present eat; bond partners favoured ~… | 0.2174 ± 0.0505 | fail ×4 | - | - | insufficient | - | - | not judged: no value under the arm (insufficient) |  |
| T-SOC-2 | social | held-out | 0.55–0.9 | 0.7775 ± 0.0162 (0.0175) | pass ×3, inconclusive ×1 | 0 | 0.8679 | inconclusive | 0 | +4.6 | **MOVES** |  |
| T-SOC-3 | social | held-out | 0.45–0.8 | 0.7335 ± 0.0827 (0.0827) | inconclusive ×4 | 0 | 0.4418 | inconclusive | 0.0233 | -3.2 | **MOVES** |  |
| T-SOC-5 | social | held-out | 0.2–0.7 | 0.6376 ± 0.0404 (0.0404) | inconclusive ×4 | 0 | 0.2548 | inconclusive | 0 | -8.5 | **MOVES** |  |
| T-SOC-6 | social | held-out | 0.6–0.9 | 0.4669 ± 0.0148 (0.015) | fail ×4 | 0.4436 | 0.3998 | fail | 0.6673 | -4.0 | **MOVES** |  |
| T-SOC-8 | social | fitted | as reported | 0.003 ± 0.000891 | fail ×4 | - | 0.0296 | fail | - | - | does not move |  |
| T-SOC-9 | social | fitted | 0.08–0.22 | 0.1791 ± 0.0576 (0.0576) | inconclusive ×3, pass ×1 | 0.0448 | 0.4413 | fail | 1.581 | +4.1 | **MOVES** |  |
| T-SOC-10 | social | held-out | 0.1–0.3 | 0.1853 ± 0.015 (0.015) | pass ×4 | 0 | 0.3503 | fail | 0.2514 | +9.8 | **MOVES** |  |
| T-SOC-12 | social | held-out | captive; qualitative | 8.080 ± 0.4696 | pass ×4 | - | 3.929 | pass | - | - | does not move |  |
| T-COM-1 | communication | fitted | 0.5–1.5 | 0.5578 ± 0.0079 (0.05) | inconclusive ×3, pass ×1 | 0 | 1.712 | fail | 0.2122 | +20.6 | **MOVES** |  |
| T-COM-2 | communication | held-out | rate falls with rank number | 0.1215 ± 0.0648 | fail ×4 | - | 0.1469 | fail | - | - | does not move |  |
| T-COM-3 | communication | held-out | periphery rate below core rate | -0.0934 ± 0.0821 | pass ×3, fail ×1 | - | -0.2813 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-COM-4 | communication | held-out | travel most common; fruit > herbs | 0.4833 ± 0.0058 | pass ×4 | - | 0.3434 | pass | - | - | does not move |  |
| T-COM-5 | communication | fitted | 2–4 | 2.932 ± 0.0451 (0.1) | pass ×4 | 0 | 3.032 | pass | 0 | +0.9 | does not move |  |
| T-COM-6 | communication | fitted | as reported | 4.000 ± 0 | pass ×4 | - | 4.000 | pass | - | - | does not move |  |
| T-COM-7 | communication | held-out | less drumming in large parties | 0.092 ± 0.0183 | fail ×4 | - | 0.1004 | fail | - | - | does not move |  |
| T-COM-8 | communication | fitted | 0.3–0.6 | 0.6085 ± 0.0111 (0.015) | inconclusive ×4 | 0.0325 | 0.7437 | fail | 0.4791 | +8.1 | **MOVES** |  |
| T-COM-9 | communication | held-out | status, not food amount | 0.5529 ± 0.0129 | fail ×4 | - | 0.4035 | fail | - | - | does not move |  |
| T-COM-11 | communication | fitted | 0.25–0.55 | 0.1066 ± 0.0204 (0.0204) | fail ×2, inconclusive ×2 | 0.4779 | 0.12 | inconclusive | 0.4333 | +0.6 | does not move |  |
| T-ENE-2 | energy | fitted | 250–370 | 315.6 ± 1.325 (6.000) | pass ×4 | 0 | 308.0 | pass | 0 | -1.1 | does not move | 24-hour total of a daytime act (feeding) |
| T-ENE-3 | energy | held-out | 650–1100 | 828.3 ± 0.5546 (22.50) | pass ×4 | 0 | 701.6 | pass | 0 | -5.0 | **MOVES** | 24-hour total of a daytime act (eating) |
| T-ENE-7 | energy | held-out | feeding time lower on days with a swollen parous female p… | 0.6 ± 0.1633 | pass ×3, fail ×1 | - | 1.000 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-RHY-6 | rhythm and water | held-out | 0.3–2 | 0.3486 ± 0.0162 (0.085) | inconclusive ×3, pass ×1 | 0 | 0.452 | pass | 0 | +1.1 | does not move |  |
| T-RHY-8 | rhythm and water | held-out | positive association of resting with temperature; midday … | 0.45 ± 0.2517 | fail ×3, pass ×1 | - | 0 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-END-2 | hormone-like states | held-out | not negative: high-ranking males are not less stressed th… | 0.55 ± 0.1 | pass ×3, fail ×1 | - | 0 | fail | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-END-3 | hormone-like states | held-out | higher with a swollen parous female in the party | 1.000 ± 0 | pass ×4 | - | 0.6 | pass | - | - | does not move |  |
| T-END-8 | hormone-like states | held-out | positive association | 0.25 ± 0.1915 | fail ×4 | - | 0.2 | fail | - | - | does not move |  |
| T-END-9 | hormone-like states | held-out | higher on patrol days | 0.55 ± 0.1915 | fail ×2, pass ×2 | - | 0.6 | pass | - | - | not judged: the rules runs disagree (fail ×2, pass ×2) |  |
| T-INF-1 | infants | held-out | rises with age; within a factor 1.5 of the Gombe value in… | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | infants are under 8: their own choices stay with the rules in every arm; expected without a value in 60 days |
| T-INF-2 | infants | held-out | 1–6 | 12.05 ± 0.1151 (0.25) | fail ×4 | 1.210 | 3.478 | pass | 0 | -30.7 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-3 | infants | held-out | 3.7–5.8 | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | expected without a value in 60 days (needs weanings in the window) |
| T-INF-5 | infants | held-out | 0.5–2 | 1.223 ± 0.0192 (0.075) | pass ×4 | 0 | 0.4069 | fail | 0.062 | -9.7 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-6 | infants | held-out | 0.014–0.06 | 0.0343 ± 0.0015 (0.0023) | pass ×4 | 0 | 0.0331 | pass | 0 | -0.4 | does not move | the infant's side stays with the rules in every arm |
| T-SOC-14 | social | held-out | 0.08–0.37 | 0.0607 ± 0.0056 (0.0145) | fail ×3, inconclusive ×1 | 0.0666 | 0.5733 | fail | 0.7011 | +31.6 | **MOVES** | contests at any hour |
| T-SOC-15 | social | held-out | contact share at a large rank difference below the share … | 0.75 ± 0.1 | pass ×4 | - | 0.6 | pass | - | - | does not move | contests at any hour |
| T-SOC-16 | social | held-out | 0.03–0.2 | 0.1858 ± 0.0096 (0.0096) | inconclusive ×3, pass ×1 | 0 | 0.0755 | pass | 0 | -10.3 | **MOVES** | contests at any hour |

### Arm (d) R1b-null-nopick: null kernel, gate off, pick removed, against the rules group

| row | family | role | band | rules: mean of the pooled values ± SD over runs (SD used) | rules: verdicts | rules: mean band distance | arm: pooled value | arm: verdict | arm: band distance | z | result | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | activity budget | fitted | 0.33–0.5 | 0.3684 ± 0.0039 (0.0085) | pass ×4 | 0 | 0.492 | fail | 0.0378 | +13.0 | **MOVES** |  |
| T-ACT-2 | activity budget | fitted | 0.12–0.25 | 0.1132 ± 0.0023 (0.0065) | fail ×4 | 0.0524 | 0.157 | pass | 0 | +6.0 | **MOVES** |  |
| T-ACT-3 | activity budget | fitted | 0.08–0.18 | 0.0923 ± 0.0013 (0.005) | fail ×4 | 0.0787 | 0.0495 | fail | 0.3076 | -7.7 | **MOVES** |  |
| T-ACT-4 | activity budget | fitted | 0.3–0.47 | 0.4455 ± 0.0107 (0.0107) | pass ×2, inconclusive ×2 | 0 | 0.3007 | inconclusive | 0 | -12.1 | **MOVES** |  |
| T-ACT-5 | activity budget | held-out | male–female feeding difference ≤ 0.05; lactating females … | -0.0456 ± 0.0054 | fail ×3, pass ×1 | - | 0.038 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-PTY-1 | party size | fitted | 4.5–9.2 | 4.038 ± 0.143 (0.235) | fail ×3, inconclusive ×1 | 0.0984 | 3.267 | fail | 0.2624 | -2.9 | **MOVES** |  |
| T-PTY-3 | party size | held-out | periphery parties have ≥ 1.5× the males of core-only parties | 1.131 ± 0.0755 | fail ×4 | - | 0.6962 | fail | - | - | does not move |  |
| T-RNG-4 | ranging | fitted | 1.5–3.5 | 2.354 ± 0.1541 (0.1541) | fail ×4 | 0 | 3.772 | fail | 0.1359 | +8.2 | **MOVES** |  |
| T-RNG-5 | ranging | held-out | 0.3–0.75 | 0.9492 ± 0.0548 (0.0548) | fail ×3, inconclusive ×1 | 0.4427 | 1.017 | fail | 0.5924 | +1.1 | does not move |  |
| T-IGE-1 | intergroup encounters | fitted | 5–12 | 7.072 ± 2.996 | inconclusive ×4 | 0.0483 | 42.80 | fail | 4.400 | - | not judged: rules group without a value (not counted: instrument below bar) |  |
| T-IGE-2 | intergroup encounters | held-out | 0.7–0.9 | 0.9317 ± 0.0608 (0.0608) | inconclusive ×3, fail ×1 | 0.2123 | 0.9894 | fail | 0.4468 | +0.8 | does not move |  |
| T-IGE-3 | intergroup encounters | held-out | 0.25–0.75 | 2.017 ± 0.8146 | fail ×3, insufficient ×1 | 2.534 | 0.3201 | inconclusive | 0 | - | not judged: rules group without a value (insufficient) | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-IGE-4 | intergroup encounters | fitted | as reported | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) |  |
| T-PAT-1 | patrols | fitted | 0.1–0.5 | 0.0599 ± 0.033 | inconclusive ×3, fail ×1 | 0.1006 | 0 | fail | 0.25 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-2 | patrols | held-out | 7–18 | 1.944 ± 1.327 | fail ×4 | 0.4596 | 0 | fail | 0.6364 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-3 | patrols | held-out | 0.55–0.85 | 0.6744 ± 0.1012 | inconclusive ×3, pass ×1 | 0.0139 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-5 | patrols | held-out | 60–240 | 97.19 ± 12.52 | pass ×3, inconclusive ×1 | 0 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-6 | patrols | fitted | 0.4–0.7 | 0.7414 ± 0.2379 | inconclusive ×3, fail ×1 | 0.4065 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-7 | patrols | held-out | 0.15–0.45 | 0.0609 ± 0.0793 | inconclusive ×2, fail ×2 | 0.3109 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-BRD-1 | border stops | held-out | 0.037–0.107 | -0.082 ± 0.0786 (0.0786) | fail ×4 | 1.700 | -0.17 | inconclusive | 2.957 | -1.0 | does not move | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-FOOD-2 | feeding ecology | fitted | 0.6–0.78 | 0.8123 ± 0.0107 (0.0107) | inconclusive ×4 | 0.1794 | 0.442 | fail | 0.8781 | -31.1 | **MOVES** |  |
| T-FOOD-5 | feeding ecology | held-out | 0.15–0.45 | 0.093 ± 0.0066 (0.015) | fail ×4 | 0.1899 | 0.0748 | fail | 0.2507 | -1.1 | does not move |  |
| T-FOOD-6 | feeding ecology | held-out | 2–7 | 12.13 ± 0.3015 (0.3015) | fail ×4 | 1.025 | 12.58 | fail | 1.115 | +1.3 | does not move |  |
| T-FOOD-7 | feeding ecology | held-out | 300–800 | 168.8 ± 8.587 (25.00) | fail ×4 | 0.2623 | 225.9 | fail | 0.1481 | +2.0 | **MOVES** |  |
| T-HUN-1 | hunting | fitted | 4–11 | 7.749 ± 0.5038 (0.5038) | pass ×2, inconclusive ×2 | 0 | 1.205 | fail | 0.3993 | -11.6 | **MOVES** |  |
| T-HUN-2 | hunting | fitted | 0.5–0.8 | 0.5307 ± 0.1003 (0.1003) | inconclusive ×3, fail ×1 | 0.0911 | 0 | fail | 1.667 | -4.7 | **MOVES** |  |
| T-HUN-3 | hunting | fitted | 0.05–0.4 | 0.046 ± 0.0032 (0.0175) | inconclusive ×4 | 0.0115 | 0.0059 | fail | 0.1259 | -2.0 | **MOVES** |  |
| T-HUN-4 | hunting | held-out | 1.05–1.8 | 2.450 ± 0.4418 (0.4418) | inconclusive ×3, fail ×1 | 0.8667 | 3.659 | fail | 2.479 | +2.4 | **MOVES** | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-HUN-7 | hunting | fitted | 1.2–2 | 1.000 ± 0 | fail ×4 | 0.25 | - | insufficient | - | - | not judged: no value under the arm (insufficient) |  |
| T-HUN-8 | hunting | held-out | 0.8–0.95 | 0.9516 ± 0.0383 | inconclusive ×3, fail ×1 | 0.0833 | - | insufficient | - | - | not judged: no value under the arm (insufficient) |  |
| T-HUN-9 | hunting | held-out | about half of those present eat; bond partners favoured ~… | 0.2174 ± 0.0505 | fail ×4 | - | - | insufficient | - | - | not judged: no value under the arm (insufficient) |  |
| T-SOC-2 | social | held-out | 0.55–0.9 | 0.7775 ± 0.0162 (0.0175) | pass ×3, inconclusive ×1 | 0 | 0.9024 | inconclusive | 0.007 | +6.4 | **MOVES** |  |
| T-SOC-3 | social | held-out | 0.45–0.8 | 0.7335 ± 0.0827 (0.0827) | inconclusive ×4 | 0 | 0.5394 | inconclusive | 0 | -2.1 | **MOVES** |  |
| T-SOC-5 | social | held-out | 0.2–0.7 | 0.6376 ± 0.0404 (0.0404) | inconclusive ×4 | 0 | 0.2339 | inconclusive | 0 | -8.9 | **MOVES** |  |
| T-SOC-6 | social | held-out | 0.6–0.9 | 0.4669 ± 0.0148 (0.015) | fail ×4 | 0.4436 | 0.3877 | fail | 0.7077 | -4.7 | **MOVES** |  |
| T-SOC-8 | social | fitted | as reported | 0.003 ± 0.000891 | fail ×4 | - | 0.0472 | fail | - | - | does not move |  |
| T-SOC-9 | social | fitted | 0.08–0.22 | 0.1791 ± 0.0576 (0.0576) | inconclusive ×3, pass ×1 | 0.0448 | 0.4162 | inconclusive | 1.401 | +3.7 | **MOVES** |  |
| T-SOC-10 | social | held-out | 0.1–0.3 | 0.1853 ± 0.015 (0.015) | pass ×4 | 0 | 0.3896 | fail | 0.4479 | +12.2 | **MOVES** |  |
| T-SOC-12 | social | held-out | captive; qualitative | 8.080 ± 0.4696 | pass ×4 | - | 3.736 | pass | - | - | does not move |  |
| T-COM-1 | communication | fitted | 0.5–1.5 | 0.5578 ± 0.0079 (0.05) | inconclusive ×3, pass ×1 | 0 | 2.380 | fail | 0.8799 | +32.6 | **MOVES** |  |
| T-COM-2 | communication | held-out | rate falls with rank number | 0.1215 ± 0.0648 | fail ×4 | - | 0.0396 | fail | - | - | does not move |  |
| T-COM-3 | communication | held-out | periphery rate below core rate | -0.0934 ± 0.0821 | pass ×3, fail ×1 | - | -0.6566 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-COM-4 | communication | held-out | travel most common; fruit > herbs | 0.4833 ± 0.0058 | pass ×4 | - | 0.3695 | pass | - | - | does not move |  |
| T-COM-5 | communication | fitted | 2–4 | 2.932 ± 0.0451 (0.1) | pass ×4 | 0 | 3.286 | pass | 0 | +3.2 | **MOVES** |  |
| T-COM-6 | communication | fitted | as reported | 4.000 ± 0 | pass ×4 | - | 4.000 | pass | - | - | does not move |  |
| T-COM-7 | communication | held-out | less drumming in large parties | 0.092 ± 0.0183 | fail ×4 | - | 0.0865 | fail | - | - | does not move |  |
| T-COM-8 | communication | fitted | 0.3–0.6 | 0.6085 ± 0.0111 (0.015) | inconclusive ×4 | 0.0325 | 0.7652 | fail | 0.5506 | +9.3 | **MOVES** |  |
| T-COM-9 | communication | held-out | status, not food amount | 0.5529 ± 0.0129 | fail ×4 | - | 0.4035 | fail | - | - | does not move |  |
| T-COM-11 | communication | fitted | 0.25–0.55 | 0.1066 ± 0.0204 (0.0204) | fail ×2, inconclusive ×2 | 0.4779 | 0.3243 | inconclusive | 0 | +9.5 | **MOVES** |  |
| T-ENE-2 | energy | fitted | 250–370 | 315.6 ± 1.325 (6.000) | pass ×4 | 0 | 349.5 | pass | 0 | +5.1 | **MOVES** | 24-hour total of a daytime act (feeding) |
| T-ENE-3 | energy | held-out | 650–1100 | 828.3 ± 0.5546 (22.50) | pass ×4 | 0 | 728.8 | pass | 0 | -4.0 | **MOVES** | 24-hour total of a daytime act (eating) |
| T-ENE-7 | energy | held-out | feeding time lower on days with a swollen parous female p… | 0.6 ± 0.1633 | pass ×3, fail ×1 | - | 1.000 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-RHY-6 | rhythm and water | held-out | 0.3–2 | 0.3486 ± 0.0162 (0.085) | inconclusive ×3, pass ×1 | 0 | 0.5194 | pass | 0 | +1.8 | does not move |  |
| T-RHY-8 | rhythm and water | held-out | positive association of resting with temperature; midday … | 0.45 ± 0.2517 | fail ×3, pass ×1 | - | 0 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-END-2 | hormone-like states | held-out | not negative: high-ranking males are not less stressed th… | 0.55 ± 0.1 | pass ×3, fail ×1 | - | 0 | fail | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-END-3 | hormone-like states | held-out | higher with a swollen parous female in the party | 1.000 ± 0 | pass ×4 | - | 0.6 | pass | - | - | does not move |  |
| T-END-8 | hormone-like states | held-out | positive association | 0.25 ± 0.1915 | fail ×4 | - | 0.2 | fail | - | - | does not move |  |
| T-END-9 | hormone-like states | held-out | higher on patrol days | 0.55 ± 0.1915 | fail ×2, pass ×2 | - | 1.000 | pass | - | - | not judged: the rules runs disagree (fail ×2, pass ×2) |  |
| T-INF-1 | infants | held-out | rises with age; within a factor 1.5 of the Gombe value in… | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | infants are under 8: their own choices stay with the rules in every arm; expected without a value in 60 days |
| T-INF-2 | infants | held-out | 1–6 | 12.05 ± 0.1151 (0.25) | fail ×4 | 1.210 | 5.309 | pass | 0 | -24.1 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-3 | infants | held-out | 3.7–5.8 | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | expected without a value in 60 days (needs weanings in the window) |
| T-INF-5 | infants | held-out | 0.5–2 | 1.223 ± 0.0192 (0.075) | pass ×4 | 0 | 0.627 | pass | 0 | -7.1 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-6 | infants | held-out | 0.014–0.06 | 0.0343 ± 0.0015 (0.0023) | pass ×4 | 0 | 0.0324 | pass | 0 | -0.7 | does not move | the infant's side stays with the rules in every arm |
| T-SOC-14 | social | held-out | 0.08–0.37 | 0.0607 ± 0.0056 (0.0145) | fail ×3, inconclusive ×1 | 0.0666 | 0.6129 | fail | 0.8375 | +34.1 | **MOVES** | contests at any hour |
| T-SOC-15 | social | held-out | contact share at a large rank difference below the share … | 0.75 ± 0.1 | pass ×4 | - | 0.6 | pass | - | - | does not move | contests at any hour |
| T-SOC-16 | social | held-out | 0.03–0.2 | 0.1858 ± 0.0096 (0.0096) | inconclusive ×3, pass ×1 | 0 | 0.0722 | pass | 0 | -10.6 | **MOVES** | contests at any hour |

### Arm (e) R1b-null-gate-nopick: null kernel, gate on, pick removed, against the rules group

| row | family | role | band | rules: mean of the pooled values ± SD over runs (SD used) | rules: verdicts | rules: mean band distance | arm: pooled value | arm: verdict | arm: band distance | z | result | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | activity budget | fitted | 0.33–0.5 | 0.3684 ± 0.0039 (0.0085) | pass ×4 | 0 | 0.4626 | pass | 0 | +9.9 | **MOVES** |  |
| T-ACT-2 | activity budget | fitted | 0.12–0.25 | 0.1132 ± 0.0023 (0.0065) | fail ×4 | 0.0524 | 0.1572 | pass | 0 | +6.1 | **MOVES** |  |
| T-ACT-3 | activity budget | fitted | 0.08–0.18 | 0.0923 ± 0.0013 (0.005) | fail ×4 | 0.0787 | 0.0365 | fail | 0.4353 | -10.0 | **MOVES** |  |
| T-ACT-4 | activity budget | fitted | 0.3–0.47 | 0.4455 ± 0.0107 (0.0107) | pass ×2, inconclusive ×2 | 0 | 0.3102 | inconclusive | 0 | -11.3 | **MOVES** |  |
| T-ACT-5 | activity budget | held-out | male–female feeding difference ≤ 0.05; lactating females … | -0.0456 ± 0.0054 | fail ×3, pass ×1 | - | 0.0364 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-PTY-1 | party size | fitted | 4.5–9.2 | 4.038 ± 0.143 (0.235) | fail ×3, inconclusive ×1 | 0.0984 | 2.426 | fail | 0.4412 | -6.1 | **MOVES** |  |
| T-PTY-3 | party size | held-out | periphery parties have ≥ 1.5× the males of core-only parties | 1.131 ± 0.0755 | fail ×4 | - | 0.6089 | fail | - | - | does not move |  |
| T-RNG-4 | ranging | fitted | 1.5–3.5 | 2.354 ± 0.1541 (0.1541) | fail ×4 | 0 | 4.078 | fail | 0.2889 | +10.0 | **MOVES** |  |
| T-RNG-5 | ranging | held-out | 0.3–0.75 | 0.9492 ± 0.0548 (0.0548) | fail ×3, inconclusive ×1 | 0.4427 | 1.005 | fail | 0.5674 | +0.9 | does not move |  |
| T-IGE-1 | intergroup encounters | fitted | 5–12 | 7.072 ± 2.996 | inconclusive ×4 | 0.0483 | 103.2 | fail | 13.03 | - | not judged: rules group without a value (not counted: instrument below bar) |  |
| T-IGE-2 | intergroup encounters | held-out | 0.7–0.9 | 0.9317 ± 0.0608 (0.0608) | inconclusive ×3, fail ×1 | 0.2123 | 0.9816 | fail | 0.408 | +0.7 | does not move |  |
| T-IGE-3 | intergroup encounters | held-out | 0.25–0.75 | 2.017 ± 0.8146 | fail ×3, insufficient ×1 | 2.534 | 0.1326 | inconclusive | 0.2348 | - | not judged: rules group without a value (insufficient) | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-IGE-4 | intergroup encounters | fitted | as reported | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) |  |
| T-PAT-1 | patrols | fitted | 0.1–0.5 | 0.0599 ± 0.033 | inconclusive ×3, fail ×1 | 0.1006 | 0 | fail | 0.25 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-2 | patrols | held-out | 7–18 | 1.944 ± 1.327 | fail ×4 | 0.4596 | 0 | fail | 0.6364 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-3 | patrols | held-out | 0.55–0.85 | 0.6744 ± 0.1012 | inconclusive ×3, pass ×1 | 0.0139 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-5 | patrols | held-out | 60–240 | 97.19 ± 12.52 | pass ×3, inconclusive ×1 | 0 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-6 | patrols | fitted | 0.4–0.7 | 0.7414 ± 0.2379 | inconclusive ×3, fail ×1 | 0.4065 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-7 | patrols | held-out | 0.15–0.45 | 0.0609 ± 0.0793 | inconclusive ×2, fail ×2 | 0.3109 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-BRD-1 | border stops | held-out | 0.037–0.107 | -0.082 ± 0.0786 (0.0786) | fail ×4 | 1.700 | -0.2802 | fail | 4.531 | -2.3 | **MOVES** | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-FOOD-2 | feeding ecology | fitted | 0.6–0.78 | 0.8123 ± 0.0107 (0.0107) | inconclusive ×4 | 0.1794 | 0.4874 | fail | 0.6253 | -27.3 | **MOVES** |  |
| T-FOOD-5 | feeding ecology | held-out | 0.15–0.45 | 0.093 ± 0.0066 (0.015) | fail ×4 | 0.1899 | 0.0493 | fail | 0.3358 | -2.6 | **MOVES** |  |
| T-FOOD-6 | feeding ecology | held-out | 2–7 | 12.13 ± 0.3015 (0.3015) | fail ×4 | 1.025 | 12.52 | fail | 1.104 | +1.2 | does not move |  |
| T-FOOD-7 | feeding ecology | held-out | 300–800 | 168.8 ± 8.587 (25.00) | fail ×4 | 0.2623 | 273.4 | inconclusive | 0.0533 | +3.7 | **MOVES** |  |
| T-HUN-1 | hunting | fitted | 4–11 | 7.749 ± 0.5038 (0.5038) | pass ×2, inconclusive ×2 | 0 | 0.4002 | fail | 0.5143 | -13.0 | **MOVES** |  |
| T-HUN-2 | hunting | fitted | 0.5–0.8 | 0.5307 ± 0.1003 (0.1003) | inconclusive ×3, fail ×1 | 0.0911 | 0 | fail | 1.667 | -4.7 | **MOVES** |  |
| T-HUN-3 | hunting | fitted | 0.05–0.4 | 0.046 ± 0.0032 (0.0175) | inconclusive ×4 | 0.0115 | 0.0019 | fail | 0.1374 | -2.3 | **MOVES** |  |
| T-HUN-4 | hunting | held-out | 1.05–1.8 | 2.450 ± 0.4418 (0.4418) | inconclusive ×3, fail ×1 | 0.8667 | 8.338 | fail | 8.717 | +11.9 | **MOVES** | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-HUN-7 | hunting | fitted | 1.2–2 | 1.000 ± 0 | fail ×4 | 0.25 | - | insufficient | - | - | not judged: no value under the arm (insufficient) |  |
| T-HUN-8 | hunting | held-out | 0.8–0.95 | 0.9516 ± 0.0383 | inconclusive ×3, fail ×1 | 0.0833 | - | insufficient | - | - | not judged: no value under the arm (insufficient) |  |
| T-HUN-9 | hunting | held-out | about half of those present eat; bond partners favoured ~… | 0.2174 ± 0.0505 | fail ×4 | - | - | insufficient | - | - | not judged: no value under the arm (insufficient) |  |
| T-SOC-2 | social | held-out | 0.55–0.9 | 0.7775 ± 0.0162 (0.0175) | pass ×3, inconclusive ×1 | 0 | 0.9245 | inconclusive | 0.0701 | +7.5 | **MOVES** |  |
| T-SOC-3 | social | held-out | 0.45–0.8 | 0.7335 ± 0.0827 (0.0827) | inconclusive ×4 | 0 | 0.3761 | inconclusive | 0.2111 | -3.9 | **MOVES** |  |
| T-SOC-5 | social | held-out | 0.2–0.7 | 0.6376 ± 0.0404 (0.0404) | inconclusive ×4 | 0 | 0.1204 | inconclusive | 0.1593 | -11.4 | **MOVES** |  |
| T-SOC-6 | social | held-out | 0.6–0.9 | 0.4669 ± 0.0148 (0.015) | fail ×4 | 0.4436 | 0.4153 | fail | 0.6158 | -3.1 | **MOVES** |  |
| T-SOC-8 | social | fitted | as reported | 0.003 ± 0.000891 | fail ×4 | - | 0.0185 | fail | - | - | does not move |  |
| T-SOC-9 | social | fitted | 0.08–0.22 | 0.1791 ± 0.0576 (0.0576) | inconclusive ×3, pass ×1 | 0.0448 | 0.3194 | inconclusive | 0.7103 | +2.2 | **MOVES** |  |
| T-SOC-10 | social | held-out | 0.1–0.3 | 0.1853 ± 0.015 (0.015) | pass ×4 | 0 | 0.1963 | pass | 0 | +0.7 | does not move |  |
| T-SOC-12 | social | held-out | captive; qualitative | 8.080 ± 0.4696 | pass ×4 | - | 3.369 | pass | - | - | does not move |  |
| T-COM-1 | communication | fitted | 0.5–1.5 | 0.5578 ± 0.0079 (0.05) | inconclusive ×3, pass ×1 | 0 | 1.582 | inconclusive | 0.0822 | +18.3 | **MOVES** |  |
| T-COM-2 | communication | held-out | rate falls with rank number | 0.1215 ± 0.0648 | fail ×4 | - | -0.0223 | pass | - | - | **MOVES** |  |
| T-COM-3 | communication | held-out | periphery rate below core rate | -0.0934 ± 0.0821 | pass ×3, fail ×1 | - | -0.2588 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-COM-4 | communication | held-out | travel most common; fruit > herbs | 0.4833 ± 0.0058 | pass ×4 | - | 0.3887 | pass | - | - | does not move |  |
| T-COM-5 | communication | fitted | 2–4 | 2.932 ± 0.0451 (0.1) | pass ×4 | 0 | 3.241 | pass | 0 | +2.8 | **MOVES** |  |
| T-COM-6 | communication | fitted | as reported | 4.000 ± 0 | pass ×4 | - | 4.000 | pass | - | - | does not move |  |
| T-COM-7 | communication | held-out | less drumming in large parties | 0.092 ± 0.0183 | fail ×4 | - | 0.1427 | fail | - | - | does not move |  |
| T-COM-8 | communication | fitted | 0.3–0.6 | 0.6085 ± 0.0111 (0.015) | inconclusive ×4 | 0.0325 | 0.6512 | inconclusive | 0.1708 | +2.5 | **MOVES** |  |
| T-COM-9 | communication | held-out | status, not food amount | 0.5529 ± 0.0129 | fail ×4 | - | 0.3479 | fail | - | - | does not move |  |
| T-COM-11 | communication | fitted | 0.25–0.55 | 0.1066 ± 0.0204 (0.0204) | fail ×2, inconclusive ×2 | 0.4779 | 0.2857 | inconclusive | 0 | +7.8 | **MOVES** |  |
| T-ENE-2 | energy | fitted | 250–370 | 315.6 ± 1.325 (6.000) | pass ×4 | 0 | 324.5 | pass | 0 | +1.3 | does not move | 24-hour total of a daytime act (feeding) |
| T-ENE-3 | energy | held-out | 650–1100 | 828.3 ± 0.5546 (22.50) | pass ×4 | 0 | 697.3 | pass | 0 | -5.2 | **MOVES** | 24-hour total of a daytime act (eating) |
| T-ENE-7 | energy | held-out | feeding time lower on days with a swollen parous female p… | 0.6 ± 0.1633 | pass ×3, fail ×1 | - | 0.8 | pass | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-RHY-6 | rhythm and water | held-out | 0.3–2 | 0.3486 ± 0.0162 (0.085) | inconclusive ×3, pass ×1 | 0 | 0.3675 | pass | 0 | +0.2 | does not move |  |
| T-RHY-8 | rhythm and water | held-out | positive association of resting with temperature; midday … | 0.45 ± 0.2517 | fail ×3, pass ×1 | - | 0 | fail | - | - | not judged: the rules runs disagree (fail ×3, pass ×1) |  |
| T-END-2 | hormone-like states | held-out | not negative: high-ranking males are not less stressed th… | 0.55 ± 0.1 | pass ×3, fail ×1 | - | 0.2 | fail | - | - | not judged: the rules runs disagree (pass ×3, fail ×1) |  |
| T-END-3 | hormone-like states | held-out | higher with a swollen parous female in the party | 1.000 ± 0 | pass ×4 | - | 0.2 | fail | - | - | **MOVES** |  |
| T-END-8 | hormone-like states | held-out | positive association | 0.25 ± 0.1915 | fail ×4 | - | 0.6 | pass | - | - | **MOVES** |  |
| T-END-9 | hormone-like states | held-out | higher on patrol days | 0.55 ± 0.1915 | fail ×2, pass ×2 | - | 0.4 | fail | - | - | not judged: the rules runs disagree (fail ×2, pass ×2) |  |
| T-INF-1 | infants | held-out | rises with age; within a factor 1.5 of the Gombe value in… | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | infants are under 8: their own choices stay with the rules in every arm; expected without a value in 60 days |
| T-INF-2 | infants | held-out | 1–6 | 12.05 ± 0.1151 (0.25) | fail ×4 | 1.210 | 5.726 | inconclusive | 0 | -22.6 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-3 | infants | held-out | 3.7–5.8 | - | insufficient ×4 | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | expected without a value in 60 days (needs weanings in the window) |
| T-INF-5 | infants | held-out | 0.5–2 | 1.223 ± 0.0192 (0.075) | pass ×4 | 0 | 0.6214 | pass | 0 | -7.2 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-6 | infants | held-out | 0.014–0.06 | 0.0343 ± 0.0015 (0.0023) | pass ×4 | 0 | 0.0248 | pass | 0 | -3.7 | **MOVES** | the infant's side stays with the rules in every arm |
| T-SOC-14 | social | held-out | 0.08–0.37 | 0.0607 ± 0.0056 (0.0145) | fail ×3, inconclusive ×1 | 0.0666 | 0.6186 | fail | 0.8573 | +34.4 | **MOVES** | contests at any hour |
| T-SOC-15 | social | held-out | contact share at a large rank difference below the share … | 0.75 ± 0.1 | pass ×4 | - | 0.5 | fail | - | - | **MOVES** | contests at any hour |
| T-SOC-16 | social | held-out | 0.03–0.2 | 0.1858 ± 0.0096 (0.0096) | inconclusive ×3, pass ×1 | 0 | 0.0305 | inconclusive | 0 | -14.5 | **MOVES** | contests at any hour |

### Summed band distance over the judged numeric rows (for information; rows with a value in every run of the table)

| sum | rules: runs | mean ± SD (SD used) | (b) sum, z | (c) sum, z | (d) sum, z | (e) sum, z |
| --- | --- | --- | --- | --- | --- | --- |
| fitted (16 rows) | 1.27 / 0.98 / 0.97 / 1.05 | 1.07 ± 0.14 (0.30) | 4.07, z +8.9 | 5.14, z +12.1 | 6.65, z +16.6 | 5.07, z +11.9 |
| held-out (19 rows) | 7.55 / 5.14 / 6.94 / 6.04 | 6.42 ± 1.05 (1.45) | 5.10, z -0.8 | 7.30, z +0.5 | 9.99, z +2.2 | 17.63, z +6.9 |
| held-out w/o rare (17 rows) | 3.76 / 3.72 / 3.68 / 4.25 | 3.85 ± 0.27 (0.27) | 5.10, z +4.2 | 4.51, z +2.2 | 4.55, z +2.3 | 4.38, z +1.8 |

### Rows not judged, for information (night and nest rows; rows the scorer never counts)

| row | metric | why not judged | rules: mean of the pooled values (verdicts) | (b) pooled (verdict) | (c) pooled (verdict) | (d) pooled (verdict) | (e) pooled (verdict) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-PTY-4 | Female gregariousness | never counted: the scorer reports it and never counts it (compromised) | 0.2759 (pass ×4) | 0.3635 (pass) | 0.4706 (inconclusive) | 0.5074 (inconclusive) | 0.6037 (fail) |
| T-IGE-5 | Encounters happen in the periphery | never counted: the scorer reports it and never counts it (compromised) | 0.7377 (scale ×3, inconclusive ×1) | 0.7416 (scale) | 0.7656 (pass) | 0.6652 (inconclusive) | 0.6717 (inconclusive) |
| T-FOOD-4 | Feeding trees visited per day | never counted: the scorer reports it and never counts it (compromised) | 4.672 (inconclusive ×3, pass ×1) | 4.567 (inconclusive) | 4.014 (inconclusive) | 4.493 (inconclusive) | 4.533 (inconclusive) |
| T-FOOD-10 | Breakfast planning | night or nest: the share of nest departures before sunrise: a nest decision taken from the night menu | 0.832 (inconclusive ×4) | 0.9895 (fail) | 0.9806 (fail) | 0.9651 (fail) | 0.9881 (fail) |
| T-SOC-4 | Association by sex | never counted: the scorer reports it and never counts it (compromised) | 0.2266 (pass ×4) | 0.2955 (pass) | 0.1794 (pass) | 0.1871 (pass) | 0.1073 (pass) |
| T-ENE-1 | Daily metabolisable energy intake of multiparous lactating females | never counted: the scorer reports it and never counts it (contested) | 2622 (pass ×4) | 2265 (pass) | 2208 (pass) | 2266 (pass) | 2187 (pass) |
| T-ENE-8 | Daily energy expenditure of non-reproducing adults, scaled by mass | night or nest: energy spent over the 24 hours: about half of its ticks are night ticks | 98.90 (pass ×4) | 104.4 (pass) | 102.6 (pass) | 105.8 (pass) | 105.0 (pass) |
| T-RHY-1 | Active day (nest to nest) | night or nest: the active day runs from leaving the night nest to entering the next one: both ends are nest decisions | 11.67 (pass ×4) | 13.33 (fail) | 13.45 (fail) | 13.29 (fail) | 13.38 (fail) |
| T-RHY-2 | Active day by sex and reproductive state | night or nest: as T-RHY-1, by class | 0 (fail ×4) | 0 (fail) | 0 (fail) | 0 (fail) | 0 (fail) |
| T-RHY-3 | Nest departure relative to sunrise | night or nest: the time of leaving the night nest: a decision taken from the night menu | -2.275 (pass ×4) | -13.75 (pass) | -13.85 (pass) | -13.95 (pass) | -57.75 (fail) |
| T-RHY-4 | Start of night-nest building relative to sunset | night or nest: the start of night-nest building: a decision taken from the dusk menu | 40.61 (pass ×4) | -38.05 (fail) | -33.70 (fail) | -31.40 (fail) | -30.90 (fail) |
| T-RHY-5 | Activity at night | night or nest: activity between dusk and dawn: the night menu itself | 0.0192 (pass ×4) | 0.0398 (pass) | 0.0467 (pass) | 0.0499 (inconclusive) | 0.0587 (fail) |
| T-RHY-9 | Hourly activity profile | night or nest: shares by hour since nest departure, tested on the first and last three hours of the nest-to-nest day (the last hours include dusk) | 1.000 (pass ×4) | 1.000 (pass) | 0.8 (pass) | 0 (fail) | 0 (fail) |
| T-RHY-10 | Leaf feeding later in the day | night or nest: leaf feeding in the second half of the nest-to-nest day: the halves are set by the nest decisions | 1.000 (pass ×4) | 1.000 (pass) | 1.000 (pass) | 1.000 (pass) | 1.000 (pass) |

### Sensitivity check on the 0.25 base: R1b-W25-null against R1b-W25-rules (one run each)

A numeric row moves at |z| > 2 with z = (null − rules) ÷ (SD × √2): two single runs (e-noise.md amendment 2), SD = the 0.5 rules group's SD of the row, floored at 0.05 band widths. A pattern row moves when the two verdicts differ.

**28 of 55 judged daytime rows move** on the 0.25 base; these are T-ACT-1, T-ACT-2, T-ACT-4, T-RNG-4, T-FOOD-2, T-FOOD-6, T-HUN-1, T-HUN-2, T-HUN-8, T-SOC-2, T-SOC-5, T-SOC-6, T-SOC-9, T-SOC-10, T-COM-1, T-COM-5, T-COM-8, T-COM-11, T-ENE-3, T-RHY-6, T-END-2, T-END-3, T-END-8, T-INF-2, T-INF-5, T-SOC-14, T-SOC-15, T-SOC-16.

Against the main arm (b) on the 0.5 base, rows judged in both: 49. Move on both bases: 23; on neither: 19; on the 0.5 base only: T-RNG-5, T-BRD-1, T-INF-6; on the 0.25 base only: T-SOC-9, T-END-3, T-END-8, T-SOC-15.

### Arm (f) R1b-W25-null against R1b-W25-rules (0.25 base, single runs)

| row | family | role | band | rules: mean of the pooled values ± SD over runs (SD used) | rules: verdicts | rules: mean band distance | arm: pooled value | arm: verdict | arm: band distance | z (single against single) | result | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | activity budget | fitted | 0.33–0.5 | 0.3739 (SD used 0.0085) | pass | 0 | 0.444 | pass | 0 | +5.8 | **MOVES** |  |
| T-ACT-2 | activity budget | fitted | 0.12–0.25 | 0.1184 (SD used 0.0065) | fail | 0.0274 | 0.1449 | pass | 0 | +2.9 | **MOVES** |  |
| T-ACT-3 | activity budget | fitted | 0.08–0.18 | 0.0933 (SD used 0.005) | fail | 0.0733 | 0.09 | pass | 0 | -0.5 | does not move |  |
| T-ACT-4 | activity budget | fitted | 0.3–0.47 | 0.4393 (SD used 0.0107) | inconclusive | 0 | 0.3476 | pass | 0 | -6.1 | **MOVES** |  |
| T-ACT-5 | activity budget | held-out | male–female feeding difference ≤ 0.05; lactating females … | -0.0557 | fail | - | 0.0483 | fail | - | - | does not move |  |
| T-PTY-1 | party size | fitted | 4.5–9.2 | 4.096 (SD used 0.235) | fail | 0.086 | 4.206 | fail | 0.0626 | +0.3 | does not move |  |
| T-PTY-3 | party size | held-out | periphery parties have ≥ 1.5× the males of core-only parties | 0.9273 | fail | - | 0.7926 | fail | - | - | does not move |  |
| T-RNG-4 | ranging | fitted | 1.5–3.5 | 2.517 (SD used 0.1541) | fail | 0 | 3.079 | fail | 0 | +2.6 | **MOVES** |  |
| T-RNG-5 | ranging | held-out | 0.3–0.75 | 0.9514 (SD used 0.0548) | fail | 0.4476 | 1.105 | fail | 0.7884 | +2.0 | does not move |  |
| T-IGE-1 | intergroup encounters | fitted | 5–12 | 9.094 | inconclusive | 0 | 27.60 | inconclusive | 2.228 | - | not judged: the 0.5 rules group gives no SD for the row (it is not counted there) |  |
| T-IGE-2 | intergroup encounters | held-out | 0.7–0.9 | 0.9167 (SD used 0.0608) | inconclusive | 0.0833 | 1.000 | fail | 0.5 | +1.0 | does not move |  |
| T-IGE-3 | intergroup encounters | held-out | 0.25–0.75 | 2.101 | fail | 2.703 | 0.3829 | pass | 0 | - | not judged: the 0.5 rules group gives no SD for the row (it is not counted there) | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-IGE-4 | intergroup encounters | fitted | as reported | - | insufficient | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) |  |
| T-PAT-1 | patrols | fitted | 0.1–0.5 | 0.0924 | inconclusive | 0.019 | 0 | fail | 0.25 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-2 | patrols | held-out | 7–18 | 3.268 | fail | 0.3393 | 0 | fail | 0.6364 | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-3 | patrols | held-out | 0.55–0.85 | 0.9143 | inconclusive | 0.2143 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-5 | patrols | held-out | 60–240 | 86.00 | pass | 0 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-6 | patrols | fitted | 0.4–0.7 | 0.7917 | inconclusive | 0.3056 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-PAT-7 | patrols | held-out | 0.15–0.45 | 0 | fail | 0.5 | - | insufficient | - | - | not judged: rules group without a value (not counted: instrument below bar) | counted only when the patrol classifier meets its bar in the run |
| T-BRD-1 | border stops | held-out | 0.037–0.107 | -0.063 (SD used 0.0786) | fail | 1.428 | 0.0224 | inconclusive | 0.2093 | +0.8 | does not move | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-FOOD-2 | feeding ecology | fitted | 0.6–0.78 | 0.8188 (SD used 0.0107) | inconclusive | 0.2156 | 0.514 | fail | 0.4775 | -20.2 | **MOVES** |  |
| T-FOOD-5 | feeding ecology | held-out | 0.15–0.45 | 0.0848 (SD used 0.015) | fail | 0.2173 | 0.108 | fail | 0.14 | +1.1 | does not move |  |
| T-FOOD-6 | feeding ecology | held-out | 2–7 | 11.95 (SD used 0.3015) | fail | 0.9905 | 13.70 | fail | 1.340 | +4.1 | **MOVES** |  |
| T-FOOD-7 | feeding ecology | held-out | 300–800 | 168.6 (SD used 25.00) | fail | 0.2628 | 178.1 | fail | 0.2437 | +0.3 | does not move |  |
| T-HUN-1 | hunting | fitted | 4–11 | 7.236 (SD used 0.5038) | inconclusive | 0 | 2.019 | inconclusive | 0.283 | -7.3 | **MOVES** |  |
| T-HUN-2 | hunting | fitted | 0.5–0.8 | 0.75 (SD used 0.1003) | inconclusive | 0 | 0.1333 | fail | 1.222 | -4.3 | **MOVES** |  |
| T-HUN-3 | hunting | fitted | 0.05–0.4 | 0.0368 (SD used 0.0175) | inconclusive | 0.0377 | 0.0098 | fail | 0.1148 | -1.1 | does not move |  |
| T-HUN-4 | hunting | held-out | 1.05–1.8 | 2.619 (SD used 0.4418) | inconclusive | 1.091 | 2.301 | inconclusive | 0.6684 | -0.5 | does not move | rare-event row (e-noise.md amendment 3): one 60-day run judges it poorly |
| T-HUN-7 | hunting | fitted | 1.2–2 | 1.000 (SD used 0.04) | fail | 0.25 | 1.000 | fail | 0.25 | +0.0 | does not move |  |
| T-HUN-8 | hunting | held-out | 0.8–0.95 | 0.9722 (SD used 0.0383) | inconclusive | 0.1481 | 0.5 | fail | 2.000 | -8.7 | **MOVES** |  |
| T-HUN-9 | hunting | held-out | about half of those present eat; bond partners favoured ~… | 0.1652 | fail | - | 0.1389 | fail | - | - | does not move |  |
| T-SOC-2 | social | held-out | 0.55–0.9 | 0.7692 (SD used 0.0175) | pass | 0 | 0.9167 | inconclusive | 0.0476 | +6.0 | **MOVES** |  |
| T-SOC-3 | social | held-out | 0.45–0.8 | 0.6871 (SD used 0.0827) | inconclusive | 0 | 0.7745 | inconclusive | 0 | +0.7 | does not move |  |
| T-SOC-5 | social | held-out | 0.2–0.7 | 0.6753 (SD used 0.0404) | inconclusive | 0 | 0.4343 | pass | 0 | -4.2 | **MOVES** |  |
| T-SOC-6 | social | held-out | 0.6–0.9 | 0.4701 (SD used 0.015) | fail | 0.4329 | 0.4028 | fail | 0.6573 | -3.2 | **MOVES** |  |
| T-SOC-8 | social | fitted | as reported | 0.0098 | fail | - | 0.0413 | fail | - | - | does not move |  |
| T-SOC-9 | social | fitted | 0.08–0.22 | 0.1372 (SD used 0.0576) | inconclusive | 0 | 0.3377 | fail | 0.8405 | +2.5 | **MOVES** |  |
| T-SOC-10 | social | held-out | 0.1–0.3 | 0.1806 (SD used 0.015) | inconclusive | 0 | 0.4614 | fail | 0.8072 | +13.2 | **MOVES** |  |
| T-SOC-12 | social | held-out | captive; qualitative | 8.181 | pass | - | 4.106 | pass | - | - | does not move |  |
| T-COM-1 | communication | fitted | 0.5–1.5 | 0.5548 (SD used 0.05) | inconclusive | 0 | 2.529 | fail | 1.029 | +27.9 | **MOVES** |  |
| T-COM-2 | communication | held-out | rate falls with rank number | 0.0582 | fail | - | 0.3191 | fail | - | - | does not move |  |
| T-COM-3 | communication | held-out | periphery rate below core rate | -0.1695 | pass | - | -0.6162 | pass | - | - | does not move |  |
| T-COM-4 | communication | held-out | travel most common; fruit > herbs | 0.5143 | pass | - | 0.341 | pass | - | - | does not move |  |
| T-COM-5 | communication | fitted | 2–4 | 2.818 (SD used 0.1) | pass | 0 | 3.234 | pass | 0 | +2.9 | **MOVES** |  |
| T-COM-6 | communication | fitted | as reported | 4.000 | pass | - | 4.000 | pass | - | - | does not move |  |
| T-COM-7 | communication | held-out | less drumming in large parties | 0.0979 | fail | - | 0.0878 | fail | - | - | does not move |  |
| T-COM-8 | communication | fitted | 0.3–0.6 | 0.6049 (SD used 0.015) | inconclusive | 0.0163 | 0.8441 | fail | 0.8136 | +11.3 | **MOVES** |  |
| T-COM-9 | communication | held-out | status, not food amount | 0.6104 | fail | - | 0.498 | fail | - | - | does not move |  |
| T-COM-11 | communication | fitted | 0.25–0.55 | 0.0645 (SD used 0.0204) | fail | 0.6183 | 0.3846 | inconclusive | 0 | +11.1 | **MOVES** |  |
| T-ENE-2 | energy | fitted | 250–370 | 327.2 (SD used 6.000) | pass | 0 | 323.7 | pass | 0 | -0.4 | does not move | 24-hour total of a daytime act (feeding) |
| T-ENE-3 | energy | held-out | 650–1100 | 826.1 (SD used 22.50) | pass | 0 | 708.5 | pass | 0 | -3.7 | **MOVES** | 24-hour total of a daytime act (eating) |
| T-ENE-7 | energy | held-out | feeding time lower on days with a swollen parous female p… | 0.6 | pass | - | 1.000 | pass | - | - | does not move |  |
| T-RHY-6 | rhythm and water | held-out | 0.3–2 | 0.3729 (SD used 0.085) | pass | 0 | 0.6385 | pass | 0 | +2.2 | **MOVES** |  |
| T-RHY-8 | rhythm and water | held-out | positive association of resting with temperature; midday … | 0.4 | fail | - | 0 | fail | - | - | does not move |  |
| T-END-2 | hormone-like states | held-out | not negative: high-ranking males are not less stressed th… | 0.6 | pass | - | 0 | fail | - | - | **MOVES** |  |
| T-END-3 | hormone-like states | held-out | higher with a swollen parous female in the party | 1.000 | pass | - | 0.4 | fail | - | - | **MOVES** |  |
| T-END-8 | hormone-like states | held-out | positive association | 0.6 | pass | - | 0.2 | fail | - | - | **MOVES** |  |
| T-END-9 | hormone-like states | held-out | higher on patrol days | 0.2 | fail | - | 0.4 | fail | - | - | does not move |  |
| T-INF-1 | infants | held-out | rises with age; within a factor 1.5 of the Gombe value in… | - | insufficient | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | infants are under 8: their own choices stay with the rules in every arm; expected without a value in 60 days |
| T-INF-2 | infants | held-out | 1–6 | 11.70 (SD used 0.25) | fail | 1.141 | 3.647 | pass | 0 | -22.8 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-3 | infants | held-out | 3.7–5.8 | - | insufficient | - | - | insufficient | - | - | not judged: rules group without a value (insufficient) | expected without a value in 60 days (needs weanings in the window) |
| T-INF-5 | infants | held-out | 0.5–2 | 1.189 (SD used 0.075) | pass | 0 | 0.4929 | inconclusive | 0.0047 | -6.6 | **MOVES** | infants are under 8: their own choices stay with the rules in every arm |
| T-INF-6 | infants | held-out | 0.014–0.06 | 0.0351 (SD used 0.0023) | pass | 0 | 0.0403 | pass | 0 | +1.6 | does not move | the infant's side stays with the rules in every arm |
| T-SOC-14 | social | held-out | 0.08–0.37 | 0.0563 (SD used 0.0145) | fail | 0.0816 | 0.5558 | fail | 0.6407 | +24.4 | **MOVES** | contests at any hour |
| T-SOC-15 | social | held-out | contact share at a large rank difference below the share … | 0.4 | fail | - | 0.8 | pass | - | - | **MOVES** | contests at any hour |
| T-SOC-16 | social | held-out | 0.03–0.2 | 0.1901 (SD used 0.0096) | inconclusive | 0 | 0.1278 | pass | 0 | -4.6 | **MOVES** | contests at any hour |
