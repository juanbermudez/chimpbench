# Track E handoff (integrator; refreshed 2 October 2026, 03:30)

Read this before anything else. It replaces `docs/staging/track-e-resume.md`. The canonical copy is on branch
`track-e`; a copy sits in `~/Desktop/mgogo-session/` for the next session to find.

## 0. In one minute

- **What Track E is.** ChimpBench's behaviour is being rebuilt so it emerges from physiology (an energy ledger, a gut,
  sleep pressure, heat, hormone-like states) instead of clock hours, dice and bonuses. Field numbers are targets to
  benchmark against, never inputs. Every stage ships behind switches that are **0 by default**.
- **State (2 October, 03:30).** `track-e` holds every finished stage, switches off: E4c (calls), E2e (pre-dawn) and
  the gut-sources pass were merged this session (`pnpm test` 639 pass, 0 fail, 1 skipped; tsc and gen-params clean).
  `main` has not been touched.
- **Decided this session.** E1h's 5-seed confirm: *keep conditional on the gut* (as registered); but nursing mothers
  stop eating with room in the gut, so the limit is the appetite and their day (e1h-prereg.md §9). E2e: recorded, not
  kept. E4c: provisional keep candidate, confirm queued. e-bench reports every sum with and without T-HUN-4 and T-BRD-1.
- **Running now (09:40).** Agents E2h (departure timing: audit first; `e2h-departure`) and E5a (party cohesion from
  first principles: removes the party weights tuned in C5a; `e5a-cohesion`; brief `integrator/e5a-prompt.txt`).
  Integrator: E2g's 5-seed confirm (registered in e2g-prereg.md; `bench-run` at 10c8ded).
- **E4g merged** (`followCarer`, off: a defect at candidates.ts:487 — adults follow a dependent keeping up with its
  mother — accounts for part of the walking calls add; fixing it shrinks parties because the party weights were tuned
  to T-PTY-1 with the defect in place).
- **S3 confirm done** (e-stack2-confirm.md): S2 + `waterLedger`: 83 prescriptions, viable, fitted level with today's
  model, travel share at its band's edge (0.26 / 0.24), males walk 2.93 km (S2 3.79), mothers −0.25%/day, juveniles
  −0.12%/day, night safe; held-out without the rare rows still +3.0 against today's model (T-FOOD-10 1.75).
- **Integrated confirm S2 done** (e-stack2-confirm.md): 89 prescriptions (B 135), viable, fitted equal to today's
  model, held-out without the rare rows worse (+2.9, z 11.6: T-FOOD-10's early departures and the travel share);
  night safe; mothers −0.29%/day, juveniles −0.17%/day; every class walks 3.2–3.9 km a day.
- **E1k merged** (`groomNeedDyad`, off: null by a marginal infant criterion, but it removes the mother–infant grooming
  loop and brings female grooming into its band; the field gives only the direction of mothers' balance; staged
  T-ENE-5 direction band and T-INF-6). **E2g merged** (`waterLedger`, off: provisional keep candidate; drinking 2.24 →
  0.84 bouts a day, walks to water 22% → 10% of movement, prescriptions −6; inputs mostly [L]).
- **E1j merged** (no mechanism: T-RNG-5's band is Budongo alone and the observer's ratio is mostly follow-day sampling;
  a multi-site band is staged in e1j-targets.patch.json, not applied; the thirst timers drive males' walks).
- **Decided since the morning refresh:** E4f merged (`preyKanyawara`, off: the colobus encounter excess is mostly the
  observer's scoring; three scorer fixes staged in `docs/staging/e4f-protocol.patch.json`, not applied, user decision);
  E2f's night safety confirmed on 5 seeds (adults 2.99% of the night); E2f merged (`sleepChimp`: chimpanzee EEG sleep 9.7 h moves waking from
  −128 to −65 min; with `rhythmFreeNight`, `darkCost`, `nestCompany`, `nestAudience` the night holds without the menu,
  narrowly: adults out 3.0% of the night against 3.3%; prescriptions 115 → 113; departures still 83% before sunrise);
  E4c confirmed on 5 seeds (provisional keep candidate; e4c-prereg.md §10.1);
  E3 re-test: the persistence effect stands without the old bug; E4e merged (`huntValue`, off: passes the keep rule but
  its T-HUN-1 gain is two errors cancelling; T-HUN-1's band was never scaled, a corrected band 4–11 is staged in
  e4e-targets.patch.json, not applied).
- **Merged since the morning refresh:** E1i (`ledgerSatiationReserve`, `ledgerLactGut`, off; quick: the pair keeps
  mothers in balance, sums inside noise; `ledgerLactGut`'s size rule matches the gut to its load by construction and
  is flagged "never a default without a source"); E4d (`endoRhythm`, off; recorded: the hormones' daily fall is by construction,
  T-END-8 now fails honestly, sums inside noise; side effect beyond noise: morning escalated attacks 8 vs 1 ± 1).
- **Noise threshold recorded (04:10)**: judge every arm against the mean of replicated references (the reference plus
  three `rgTemperature` re-draws); per-run SD quick 0.69 / 1.26 / 0.48, confirm 0.30 / 1.45 / 0.21 (fitted / held-out /
  held-out without T-HUN-4 and T-BRD-1). The single-reference rule was biased (e-noise.md). E1i and E4d were told.
- **Next decisions.** Judge the E4c confirm (e4c-prereg.md §10) against R's four confirm realizations; merge E1i and
  E4d when they report.

## 1. The user's directives and the hard rules

User, verbatim (1 October 2026):
- "field numbers should be targets for us to benchmark against, not hardcode, as much as possible, we want the
  behavior to emerge, rather than being prescriptive so piece by piece I want you to plan on iterations of doing this,
  bencharmking against how close does the behavior get to the field data."
- "delegate to sub agents and parelalize work, be as fast as possible, think from first principle when you encounter
  issues, and work relentlessly towards creating science grounded analogs to drive desicion making. And run your own
  quick test to validate, iterate and progress."
- When measured physiology could not produce the field time budget, the user chose **"Audit field numbers"**
  (question their measurement before adding unmeasured costs).
- No simulation longer than **3 months in total** (burn-in included). Track E uses the **rules policy only**: no paid
  model API (Jev).

Hard rules (AGENTS.md plus this track):
- Determinism: all sim randomness from `world.rng`; `observe()` and `rulesChoice()` pure; `const P = paramsOf(world)`;
  lazily added `ChimpX` keys go in `OPTIONAL_X` (`src/sim/state.ts`). Params live in `data/params.json` with evidence
  tags; regenerate with `pnpm exec tsx scripts/gen-params.ts` (and `--check`).
- Seeds: development 48 and 7; confirm 48, 7, 21, 5, 11; the second noise set 3, 13, 17, 19, 23. **Never** the reserved
  or retired seeds listed in AGENTS.md (C8, patrol, C9, C11 pools; 606, 1010, 1616, 5101, 5202, 7001–7003, 9101).
- Protocol per piece (IMPLEMENTATION_PLAN.md "Track E"): name the rule removed and its switch; pre-register in
  `docs/staging/e<N>-prereg.md` **and commit it before any run of changed code**; benchmark before/after with the same
  command and seeds; keep rule = viable, held-out distance not up, prescription count down; otherwise off and the null
  recorded. At most 3 iterations, each logged in the prereg before its run. Never tune an input to a behavioural target.
- Privacy: **never send the user's email address or any personal data to an external service.** Unpaywall requires
  an email, so never use it (an agent did once, see §8). Use Crossref, Europe PMC, PMC or publisher pages.
- Git: never commit to `main` from a worktree; never `git stash` bare (shared stack); never touch other sessions'
  worktrees or their `pnpm dev` on 5173; `~/Desktop/GHN` is read-only; raw coordinates in `data/raw` are never
  published.

## 2. Repository state

| Where | What |
| --- | --- |
| `.claude/worktrees/track-e` (branch `track-e`) | Integration branch. All finished stages merged, switches off (E4c, gut sources and E2e merged 2 October). `main` has not moved since f24c9ae, so there is no drift yet. |
| `.claude/worktrees/e4c-calls`, `e2e-predawn`, `e-gut-sources` | Merged into track-e on 2 October (heads 329e25c, 3132bc1, 5265666). |
| `.claude/worktrees/e1i-intake` | Merged 2 October (head 4b744de). |
| `.claude/worktrees/e2f-sleep` | **Running agent** E2f, branched from track-e 49d8a3b. |
| `.claude/worktrees/e4d-rhythm` | Merged 2 October (head da916df). |
| `.claude/worktrees/e4e-hunting` | Merged 2 October (head dcca0dc). |
| `.claude/worktrees/e4f-encounters` | Merged 2 October (head e7dacde). |
| `.claude/worktrees/e1j-ranging` | Merged 2 October (head c898395). |
| `.claude/worktrees/e2g-water` | Merged 2 October (head 1fe91ff). |
| `.claude/worktrees/e4g-calltravel` | Merged 2 October (head 9a4005b). |
| `.claude/worktrees/e5a-cohesion` | **Running agent** E5a, branched from track-e 10c8ded. |
| `.claude/worktrees/e2h-departure` | **Running agent** E2h, branched from track-e 702027e. |
| `.claude/worktrees/e1k-deficit` | Merged 2 October (head 5d2a01e). |
| `.claude/worktrees/e2f-sleep` | Merged 2 October (head b5157a0). |
| `.claude/worktrees/bench-run-2` | Removed; its E2f night-check results are in `bench-run/artifacts/validation/e/e2f/`. |
| `.claude/worktrees/bench-run` | Frozen detached checkout for the integrator's benchmarks (612bf15 for the noise arms, then d8c1875 for the E4c confirm; the queued script moves it). `artifacts/validation/e/`: `base-head` (all off, 9392b67), `e1h-{R,T,G}` and their energy JSON, `rescored-*`, `noise/`. Move it only when nothing runs from it. |
| `worktree-agent-a954b443db4b6f22a` | **Not Track E**: a colobus encounter fix (`preySightFactor` 1.39, fitted to Kanyawara encounters) from the earlier session, 7 commits, merged nowhere. Ask the user before touching it. |
| Other `e*` and `worktree-agent-*` worktrees | Fully merged into `track-e` (0 commits ahead). Safe to remove **only if the user agrees**. |
| `/Users/juanbermudez/Desktop/MGOGO` (`main`) | Other sessions' uncommitted work (UI, Jev, providers). Never commit, stash or reset there. |

Worktree setup for a new agent (node_modules, data/raw and the c7a artifact are untracked; the common
`.git/info/exclude` now ignores the two symlinks so `git add -A` no longer picks them up):

```bash
cd /Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/track-e
git worktree add -q -b <name> ../<name> track-e
ln -s /Users/juanbermudez/Desktop/MGOGO/node_modules ../<name>/node_modules
ln -s /Users/juanbermudez/Desktop/MGOGO/data/raw ../<name>/data/raw
mkdir -p ../<name>/artifacts/validation && ln -s /Users/juanbermudez/Desktop/MGOGO/artifacts/validation/c7a-field1y.json ../<name>/artifacts/validation/c7a-field1y.json
```

## 3. Stage ledger (all switches 0 by default)

| Stage | Switches | Verdict | One-line finding | Doc |
| --- | --- | --- | --- | --- |
| E0 | — | complete | `e-bench`, prescription ledger, baselines. | e0-baseline.md, e0-ledger.md |
| E1 energy ledger | `energyLedger` | null (3 it.), base of the stack | Adults balance at ~1.2 × resting and feed 140–175 min/day vs 309; the C8 starvation was the timer's 4.6 kcal per feeding minute. | e1-prereg.md |
| E1b gut | `ledgerDigesta` | null | Digestibility does not close the ~1.9 × intake gap; the failing term was the hunger readout (gut fill capped the drive). | e1b-prereg.md |
| E1c infants | `ledgerGrowSurplus`, `ledgerNightNurse`, `ledgerInfantIntake` | keep (provisional) | Infants viable on the ledger. | e1c-prereg.md |
| E1d nursing | `ledgerNurseByMilk` | keep (provisional), **superseded by E1f** | Empty-gland suckling fixed. | e1d-prereg.md |
| E1e appetite | `ledgerDrive` | keep (provisional, marginal) | Two-signal appetite (deficit drive, gut-fill satiation); iteration 1 starved 8 mothers, iteration 2 viable (mothers −0.049%/day against a 0.05% line); a late-afternoon feeding rise without a clock. | e1e-prereg.md |
| E1f growth | `ledgerNurseBout`, `ledgerGrowPotential` | keep (provisional) | Nursing bouts in band; growth ~2 × Gombe; weaning ~6 y vs 4.7; mothers' year-2 recovery absent. | e1f-prereg.md |
| E1g wild cost | `ledgerWildCostMult` (default 1) | finding, **headline invalid** | Said the field time budget needs k ≈ 1.6 (PAL ~2.15), beyond any measured wild primate. It compared the field's nursing mothers with pooled females; the audit replaced it. Keep the switch as a sensitivity tool only. | e1g-prereg.md |
| Field audit | — (docs) | finding | T-ENE-1 (2,479 kcal) is inflated by the energy formula (TNC by difference 34%, fibre credit 26%) and its sample was 14 nursing mothers; sugar-based band 1,810–2,070. | e-field-audit.md |
| E1h food energy | `ledgerFoodEnergyFix` | **keep conditional on the gut** (5-seed confirm, 2 Oct) | T (83 mL/kg): 4 starved mothers, −0.92%/day; G (111 mL/kg): fitted −1.58, held-out +0.33 vs R. But mothers' foregut is ≥ 95% full only 4–7% of daylight and starving mothers eat less than other adults: the appetite and their day bind, not the gut wall. | e1h-prereg.md §9 |
| Gut sources | — (docs, §E.25) | finding | Captive capacity 3,322 cm³ (nakamura2017 full text), mass unknown: 57–76 mL/kg at captive female masses; 111 mL/kg implies 30 kg. Stomach 29% of the gut (foregut share 0.45 in question). | research.md §E.25 |
| E2a rhythm | `rhythmSleep`, `rhythmHeat`, `rhythmFreeNight` | keep (provisional) | Nesting at dusk and active day 11 h 22 min emerge with no clock; no pre-sunrise departures; midday rest does not emerge. | e2a-prereg.md |
| E2b departure | `departRace`, `nestLightDecide`, `nurseWake` | partial; all off | Pre-sunrise departures emerge on the timer reference, not on the full stack; `rhythmDarkW` (2.2, a prescription) sets departure timing. | e2b-prereg.md |
| E2c darkness | `darkCost` | null | Light-limited vision and pace do not hold animals pre-dawn. | e2c-prereg.md |
| E2d circadian | `rhythmCircadian` | null | Process C sets the sleep episode (onset ~100 min after sunset, waking ~125 min before sunrise) but nothing holds an awake chimp in the nest before dawn. Fixed a rhythm-metrics midnight bug. | e2d-prereg.md |
| E2e pre-dawn | `nestCompany`, `nestAudience` | recorded, not kept | Social arm: juvenile pre-dawn wandering 96% → 55%, departures still 84% before sunrise (field 18%); removes no prescription; fails night safety without the night menu. Thermal arm inert (offline heat balance), not built. | e2e-prereg.md |
| E3 urgency | `urgencyChoice`, `urgencyPersist`, `urgencySwitchCost` | stopped after 3 it.; off | `urgencyChoice` viable, inside noise; persistence halves crown bouts and moves feeding to leaves. | e3-prereg.md |
| E4a slow states | `endoStates`, `endoEscalate`, `endoRedirect`, `endoRainDisplay` | keep (provisional) for the first three | Leaky cortisol-, testosterone-, oxytocin-like states replace escalation and redirect dice; slow states cannot carry acute reactions. | e4a-prereg.md |
| E4b fast arousal | `endoFast`, `endoFastRedirect` | `endoFast` + `endoRainDisplay` keep (provisional); `endoFastRedirect` off | Storm displays without a roll (2–5 × the old rate, no field row). T-END-8 fails because pant-hoots come from isolation and a fitted travel hazard. | e4b-prereg.md |
| E4c calls | `callValue` | provisional keep candidate; **5-seed confirm queued** | Iteration 1: arrival pant-hoots 0.28 (field 0.04–0.35), party size near the reference, prescriptions −11, held-out inside quick noise. Calls have no daily course (the arousal state rises through the day). | e4c-prereg.md §9–10 |
| E1i intake | `ledgerSatiationReserve`, `ledgerLactGut` | **null on 5 seeds** (strict viability line), large partial result | Mothers' drive was saturated and satiation ignored their deficit, so they fed no more than other classes. Satiation weighted by the relative store (leptin-like, [M]) plus a lactating gut grown to its load (×1.30; design, no primate source) balance mothers (−0.04%/day, 796 g, 278 min) in quick mode; sums inside noise; T-RNG-5 worse (0.84). Mothers of infants ≥ 2 y groom 34% of daylight (infant-initiated). | e1i-prereg.md |
| E4d rhythm | `endoRhythm` | recorded, off (removes nothing) | Sleep-entrained secretion (gains from fedurek2016 and girardButtoz2021 ratios): both states fall through the day by construction; T-END-8 fails honestly (r −0.29); calls still have no daily course; morning escalation up beyond noise (no field row). | e4d-prereg.md |
| E4e hunting | `huntValue` | passes the keep rule on 5 seeds; **held off** | A hunt valued as food (expected meat from the model's success curve; no gap, no lead value): T-HUN-1 into band (9.7 confirm), fitted z −2.8, but T-HUN-3 fails low: the model meets colobus 2.7 × Kanyawara's rate and now hunts 0.28 × the field's share. T-HUN-1's band was never scaled (staged 4–11). | e4e-prereg.md |
| E4f encounters | `preyKanyawara` | recorded, off ([L] site-matched input) | The 2.55 × encounter excess: observer scoring ×1.42 (focal vs party follows) and ×1.07 (a new encounter per change of nearest group), density ×1.12 (Ngogo pre-decline vs Kanyawara 2.22 groups/km²), residual ×1.5 unsourced. Scorer fixes staged, not applied. | e4f-prereg.md |
| E1k deficit | `groomNeedDyad` | null (marginal K1), off | Removes the mother–infant grooming loop (33% → 11% of daylight; female T-ACT-3 0.18 → 0.11); mothers gain little (extra minutes on fallback food). Line audit: no wild rate exists, only the direction. | e1k-prereg.md |
| E2g water | `waterLedger` | provisional keep candidate, **confirmed on 5 seeds** (fitted cost on R: grooming fills the freed time; none on S3), off | Water ledger in place of the thirst timers: drinking 2.24 → 0.84 per adult-day, walks to water halved, males' path −0.38 km, prescriptions −6, sums inside noise. | e2g-prereg.md |
| Integrated S2 | 28 switches | measured | 89 prescriptions; fitted = today's model; held-out without rare rows +2.9 (T-FOOD-10, travel). | e-stack2-confirm.md |
| E1j ranging | — | done: no mechanism | Interim: in simulation truth mothers ÷ males is 0.69–0.77 (B, R, E1i pair); the observer's T-RNG-5 rests on 13–24 follow-days, so E1i's 0.84 was sampling; the band is Budongo only (Gombe 0.67–0.74, Kanyawara 0.83). R's real change vs B: males' food trips halve. | e1j-prereg.md |
| E3 re-test | — | done (integrator) | The effect stands without the old hunger cap: persistence halves crown bouts (22 → 11 min) and the fruit share falls to 0.54. | e3-prereg.md, last section |
| Prescription audit | — (tooling) | merged | The count now sees what E1 and E2a switch out: full stack 134 → 102. | scripts/lib/prescriptions.ts |
| Full-stack confirm | 14 switches (E1–E1e, E2a, E4a, E4b) | not kept as a whole | Fitted 3.28 → 4.01; held-out 5.90 → 3.49, but T-BRD-1 alone is −2.10 (+0.70 worse without it). One cause: spare time (intake ends early, grooming and hunting fill the day). | IMPLEMENTATION_PLAN.md |

**The current reference stack ("R", as E1h used it; `ledgerNurseByMilk` superseded and left out):**

```json
{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1}
```

## 4. What we have learned

### 4.1 Energy (the main thread)
1. Physiology with sourced expenditure balanced at about half the field's reported intake, so chimps finished eating
   early and spare time went to grooming and hunting (T-ACT-3, T-HUN-1 out of band).
2. E1g concluded that closing the gap by expenditure needs a wild cost no primate has been measured at. That headline
   is invalid (wrong comparison class, see 3), but the direction stands: expenditure is not where the gap is.
3. The field audit showed the gap was largely the field's own number: the formula overstates energy, and the sample was
   lactating females only. T-ENE rows are now re-scoped to lactating females in `docs/staging/e-targets.patch.json`.
4. E1h corrected the model's food energy the same way. Now the **foregut binds**: at E1b's central 83 mL/kg it passes
   ~620 g dry matter/day for a 31 kg female, while a mother needs ~790 g. At 111 mL/kg (top of the assumed range)
   the field budget returns without extra cost.
5. The only chimpanzee gut-volume value is one captive figure reached through an abstract (nakamura2017 → probably
   Chivers & Hladik 1980; ~3,329 mL). Finding the primary number is now the highest-value source task.
6. **2 October.** The gut-sources pass read nakamura2017 in full: 3,322 cm³ (stomach 965) in one captive female of
   unknown mass, so 57–76 mL/kg at captive adult female masses and 111 mL/kg only for a 30 kg animal (§E.25). E1h's
   5-seed confirm kept the fix conditional on the gut, but its daylight readouts show that nursing mothers stop eating
   with room in the gut (foregut ≥ 95% full in 7.4% of daylight in T; 222 eating min against 238–248 for other adults
   at higher hunger). Stage E1i asks why before any input moves.

### 4.2 Daily rhythm
Nesting at dusk and the active-day length emerge (E2a). Process C sets the sleep episode (E2d). What still holds an
awake chimp in its nest for the two hours before dawn is only `rhythmDarkW`, a prescription. E2c (vision and pace in
the dark) and E2d (circadian gate) are nulls. E2e tests insulation and social coordination next.

### 4.3 Hormone-like states and calls
Slow states replace escalation and redirect dice (E4a); a fast state carries storm displays (E4b). T-END-8 (the
testosterone–calling association) cannot pass while pant-hoots come from isolation and a fitted travel hazard, so
calls must become value comparisons (E4c). E4c found the slow arousal state rises through the day while field
testosterone falls (mullerLipson2003): a real model problem, not a call problem.

### 4.4 Infants
Infants are viable (E1c), stop suckling an empty gland (E1d), and nurse in band (E1f). Misses: weaning ~6 y vs 4.7;
growth ~2 × Gombe; mothers' year-2 recovery absent. Infant intake per minute is not the cause (bray2018: 0.57 of
adult). Sources suggest milk output does not fall in year 2, so recovery must come from the mother eating more.

### 4.5 The benchmark itself
- Under the 90-day cap there are **0–2 births and deaths per run**, so viability is judged by reserve trends
  (%/day by class) and starvation deaths, not births ÷ deaths.
- **Two rare-event rows dominate held-out:** T-HUN-4 and T-BRD-1 were two thirds of the baseline's held-out sum. Judge
  every arm with and without them.
- **Noise is larger than registered.** Rows move up to 0.8 between quick and confirm (`e0-baseline.md`), and noise arms
  (a tiny perturbation of one parameter) moved the summed distances by 1.1 (E4a) and by −1.37 / −3.13 (E4c), mostly through
  hunting, patrol and intergroup rows. Stages registered thresholds of 0.3/0.5, 0.8, ~1 and 1.1. Until one threshold is
  set (§5.5), treat any quick-mode difference under ~1.5 on shared rows as noise and decide on confirm.
- Track E's own rows (T-ENE, T-RHY, T-END, T-INF) are **staged** in `docs/staging/e-targets.patch.json`, not in
  `data/targets.json`. `e-bench` does not score them; the stage diagnosis scripts read them. Applying them needs the
  integrator, a protocolLog entry and a new freeze.
- **2 October.** e-bench prints every sum and comparison with and without `RARE_EVENT_ROWS` (T-HUN-4, T-BRD-1;
  d77f2cf). The noise threshold is being measured (docs/staging/e-noise.md): three quick arms gave a held-out threshold
  of 0.4 on all shared rows, contradicted by the two earlier noise arms (E4a +1.1 raw, E4c −3.13 shared), so both
  modes were extended to six arms before any stage used a threshold (amendment disclosed in the file). Result: the
  single-reference rule is biased (all twelve confirm-mode changes negative: the references were unlucky draws);
  amendment 2 judges arms against the mean of replicated references. With it, E1h's T has a real fitted gain (z −2.9,
  the activity rows) and every held-out change of T and G is inside noise; the stack R is worse than B on held-out rows
  without the rare ones (+0.79, mostly T-RNG-5).

## 5. Next steps, in priority order

### 5.1 E1h 5-seed confirm (decides whether corrected food energy is kept)
**Done 2 October** (e1h-prereg.md §9): keep conditional on the gut; the reading points to the appetite (E1i).
The old resume note said "two arms". That was wrong: E1h judged T and G **against R**, and no 5-seed R exists
(`stack1-confirm` used a different stack). Also, `baseline-confirm.json` was made by the earlier session at
e42ec915c8 on another branch with 5 uncommitted `src` files (19 + 19 rows, count 132), while `te-baseline-confirm` is
from track-e 97fe2cb (17 + 14 rows, count 134). Neither matches the current head. Re-run the all-off baseline.

```bash
cd /Users/juanbermudez/Desktop/MGOGO/.claude/worktrees
git -C bench-run checkout --detach <track-e head>
cd bench-run && mkdir -p artifacts/validation/e
R='{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1}'
pnpm exec tsx scripts/e-bench.ts --confirm --workers 3 --out artifacts/validation/e/base-head
pnpm exec tsx scripts/e-bench.ts --confirm --workers 3 --params "$R" --out artifacts/validation/e/e1h-R --compare artifacts/validation/e/base-head.json
```

Then T = R + `"ledgerFoodEnergyFix":1`, and G = T + `"digestaGutMlPerKg":111`, each with `--compare` against
`e1h-R.json`. One run at a time; check `uptime` first and drop to `--workers 1–2` if load is above ~8. Judge per
e1h-prereg.md §6 on rows scored in both runs, with and without T-HUN-4 and T-BRD-1, plus the reserve trends from
`scripts/energy-diagnose.ts` on the same params. Record the result in e1h-prereg.md and the plan. Do not change the
gut default from this run: G is a registered sensitivity arm, not a fit.

### 5.2 Resume E4c (calls)
**Done 2 October**: merged; 5-seed confirm registered (e4c-prereg.md §10) and queued in `bench-run`.
State: worktree `.claude/worktrees/e4c-calls` clean at 2b81df8, 8 commits ahead of track-e. `callValue` (src/sim/calls.ts)
switches out 11 prescriptions. Pre-registration `docs/staging/e4c-prereg.md` (c1be203, 10bafa5) holds the reference,
predictions, kill criterion, first-pass table and the iteration-1 entry. Two iterations remain.
- **First pass (T):** adult males call 0.76/h; T-COM-1 and T-COM-4 pass; prescriptions 129 → 118; viability passes;
  held-out falls. But 73% of adult-male arrivals at a crown get a pant-hoot (field 4–35%), so parties grow (T-PTY-1
  2.7 → 4.6), intergroup contacts rise (T-IGE-1 7.7 → 28.9), conflicts double, T-COM-8 fails, fitted rises 3.6. The
  kill criterion was not met.
- **T-END-8** fails for an endocrine reason: the slow arousal state rises through the day; field testosterone falls
  (mullerLipson2003). Calls cannot fix that.
- **Iteration 1:** the cost of calling at a crown counts every unseen community member aged ≥ 5 ×
  (hearPantHootM / troop.radius)². Its run (`artifacts/validation/e4c/run-it1.sh`: T1 then S1b) was killed by the
  restart. Only `t1-calls.json` finished and nobody has read it: adult males 0.49/h, arrival share 0.28 against the
  predicted ≤ 0.25.
- **Protocol breach (disclosed in 10bafa5):** iteration-1 code was written into the worktree while S0/S1 were queued, so
  the first S1 diagnosis and bench ran it. All three were re-run; the published table is clean. The disclosure names
  only the endocrine diagnosis and bench; the S1 calls diagnosis was also affected (re-run too). Add that sentence.
- **Next:** check load; re-run `run-it1.sh` in full with no edits to src/ meanwhile; score the iteration-1 predictions
  and S1b against S0/S1; decide; simulation.md note; `pnpm test`, `tsc`; commit; report. The table helpers
  `e4c-table.mjs` and `shared.mjs` were copied from the session scratchpad into `artifacts/validation/e4c/`.
- Gotchas: count calls per tick (world.calls is a rolling buffer); calls-diagnose infers call sources from act
  transitions, so its labels are approximate; the noise arm Rn moved shared-row sums by −1.37 / −3.13, more than the
  registered ±1.1.

### 5.3 Restart E2e (pre-dawn nest holding)
**Done 2 October**: merged, recorded and not kept (e2e-prereg.md).
The agent ran 15 minutes; nothing is committed and there is no pre-registration. What it learned (from its transcript,
not yet verified in the repo):
- **Reference** (rhythmSleep, rhythmHeat, departRace, nestLightDecide, rhythmCircadian): every adult leaves at about
  −13 min (99% before sunrise, so T-FOOD-10 fails); independent 5–8-year-olds are out of the nest 96% of the two hours
  before sunrise, about 576 m per morning (a night-safety problem of the reference itself).
- **Thermal arm is probably inert:** an offline heat balance puts a dry adult's lower critical temperature asleep near
  8 °C against ~15 °C pre-dawn air (Kibale daily minimum 16.2 °C, secondary source); rain falls in 0.8% of pre-dawn
  time and no departure was wet. Without a soaked coat there is no heat debt to hold anyone.
- **Social arm is the live one:** 43% of adult departures already have another adult leaving within 5 min and 50 m.
  `departAudience` skips animals in a finished nest (`action === 'nest' && phase >= 2`), so `departPersist` cannot
  coordinate departures from nests today. That is the mechanism gap.
- **What holds adults at night is the night menu** (PHASE_ACTIONS); with `rhythmFreeNight` they leave ~−124 min and are
  out 15% of the night. Animals under rgMinAge (8 y) use argmax rules and no menu. Any switch that removes the nest
  option must join the `menu.length === 1 && (darkOn || circadianOn)` guard in rg.ts (E2c lost an iteration to this).
- **Sources found:** stewart2018 (nest insulation, max difference 7.32 ± 3.29 °C; its text contradicts itself on the
  3-hour loss, check the figure); samsonHunt2012 (tree nests ~0.5 °C warmer than ground); alRazi2026 (abstract only);
  Riss & Goodall via anderson2019 (captive group settles and leaves within 5 min). None added to research.md yet.
- **Uncommitted `scripts/rhythm-metrics.ts` edit** in the e2e worktree: measurement only (rain, thermal load, time and
  position at each exit; the pre-dawn window; co-departures within 5 min and 50 m, hard-coded; the 5–8 y pre-dawn
  out-of-nest share). Run on the reference, never typechecked. Typecheck it and commit it as "E2e readouts" first.
- **Restart with:** the E2e prompt (saved as `artifacts/track-e-session-scratch-2026-10-01/e2e-prompt.txt` in the
  track-e worktree) plus the §7 pre-flight block, amended to lead with the social
  arm, keep the thermal arm as a cheap registered check, commit sources and the prereg within 15 minutes, and smoke-test
  the test arm for 2 days (~3 s) before any benchmark.

### 5.4 Gut capacity sources (research only)
**Done 2 October**: merged as research.md §E.25 / e-sources.md §25. Chivers & Hladik 1980 is deposited on HAL (hal-00561758) behind a bot check: a person can open it in an ordinary browser.
Find the primary chimpanzee gut volume (Chivers & Hladik 1980, J Morphol 166:337–386; nakamura2017's reference list),
any other hominoid gut volumes by mass, and foregut throughput or passage-rate numbers (Milton & Demment 1988, Lambert
1998). Add to `docs/research.md` and `docs/staging/e-sources.md` with numbers and evidence tags. This decides whether
83 or ~111 mL/kg is the input. Chivers & Hladik 1980 and Milton & Demment 1988 were unreachable by every open route
tried this session (publisher walls, Cloudflare): do not spend more than 10 minutes on them; ask the user whether they
can supply the PDFs through institutional access.

### 5.5 Benchmark hygiene (small, do before more stages)
**2 October**: sums without the rare-event rows done (d77f2cf); the switch-count test already existed (tests/prescription-ledger.test.ts, "a Track E switch lowers the count from its base exactly when it has no removesNothing note"); a duplicate `rhythmDarkW` override removed; noise threshold in progress (e-noise.md).
- Report every e-bench sum with and without T-HUN-4 and T-BRD-1 (or cap rare-event rows), registered once, so stages
  stop setting them aside by hand.
- Set one noise threshold for quick and one for confirm, from 2–3 noise arms each, on rows scored in both; write it in
  the plan and use it in every prereg.
- Re-run the all-off baseline whenever the scorer, targets or prescription tooling change, from a clean committed head.
- Add a test that turning on a switch known to remove a rule lowers the prescription count (it silently did not until
  the audit).

### 5.6 Infants and weaning
Weaning and the year-2 recovery need a source for maternal rejection by infant age or a stage-dependent fall in milk
synthesis (Gombe weaning studies not yet read). Likely after the gut question, since mothers' intake is the lever.

### 5.6b Candidate next stages (not started)
- E2f: E2d wakes animals ~128 min before sunrise (captive chimpanzees 45–60 min, videan2005); a sourced chimpanzee
  sleep need or phase, not a departure time, would be the input.
- Parties are small on the reference (T-PTY-1 2.8, band 3–9): what holds a party together (E2e's open problem).
- Hunting on the stack is ~2 × the band (T-HUN-1 35–40 against 5–25): `huntGapH` is next in the E4 order.
- E3's units doubt (§8 item 14) before acting on its recommendation.

### 5.7 Later, with the user
- Lifting the 90-day cap (every keep is provisional until a 365-day run).
- Applying the staged target rows (protocolLog + new freeze).
- Turning any switch on by default and merging `track-e` into `main`: needs the C11 calibration and combined proof
  frozen first (plan, "Sequencing"), and care with other sessions' work on `main`.

## 6. How to run things

Times measured by agents this session; load swung between ~8 and ~20 on 12 cores, and runs slow 2–3 × at the top.

| Command | Use | Time |
| --- | --- | --- |
| `pnpm test` | full suite, 624 tests | 76–140 s |
| (gotcha) a queued background chain | its time limit (max 2 h) counts from queueing, not from its first run: queue long chains only behind short ones, or start them when the queue clears; `e-bench --reuse` resumes an interrupted run from its saved scorecard |
| `pnpm exec tsc --noEmit -p .` | types of `src/` and vite.config.ts **only**: it does not check `scripts/` or `tests/` | < 1 min |
| `pnpm exec tsx scripts/gen-params.ts [--check]` | after any `data/params.json` edit; after a merge, `git checkout --ours src/sim/params.gen.ts` then regenerate | seconds |
| `pnpm exec tsx scripts/e-bench.ts --quick --params '{…}' --workers 2 --out artifacts/validation/e/<label> [--compare x.json]` | 2 seeds, 30 + 30 days, direction check | 40–150 s on 2 workers; 3.6–8 min on 1 worker under load; 374 s at load ~20 |
| `… --confirm …` | 5 seeds, 30 + 60 days, decides | ~4–5 min at `--workers 3`, low load |
| `… --rescore <file.json> [--compare …]` | re-derive from a saved run, no simulation | seconds |
| `scripts/energy-diagnose.ts` | per-class energy: eaten, absorbed, spent, eating minutes, dry matter, reserve %/day | 2.5–3.5 min |
| `scripts/rhythm-metrics.ts` | departures vs sunrise, nest entry, active day, night out-of-nest, juvenile night; 2-day smoke test ~3 s | 62–90 s |
| `scripts/endocrine-diagnose.ts`; `scripts/calls-diagnose.ts` (only on `e4c-calls` so far) | hormone-like daily profiles; call contexts | ~43 s (2 seeds × 60 d) |
| `scripts/prescription-ledger.ts --count --params '{…}'`, `scripts/param-reads.ts` | prescription count; which params a switch set actually reads | seconds |

Never run a sim script to read its options: `e-bench.ts --help` runs a full benchmark. Read the header
(`sed -n 1,30p`). Use `/usr/bin/python3` (Homebrew python3.14's pyexpat is broken; numpy and openpyxl missing). Insert
`data/params.json` entries as text: a JSON round trip rewrites ~265 lines (1000000.0 → 1000000); the file is sorted by
id in plain code-point order. Every new parameter id needs a row in `docs/simulation.md` §17 or a test fails. New
switches go in `TRACK_E_SWITCHES` in both `tests/sim-track-e.test.ts` and `scripts/lib/prescriptions.ts`. In the field
profile, compare `stepWorld` batches with each other: a raw `tickWorld` loop does not equal `stepWorld` batches even
with every switch off (moderate confidence; noted by E1h, not investigated). Respiratory outbreaks randomly kill 5–13
animals in a run: check causes of death before blaming a switch. Session scratch files (E4c's table helpers, every
downloaded source, the E2e prompt as `e2e-prompt.txt`) were copied to `artifacts/track-e-session-scratch-2026-10-01/`
in the track-e worktree: gitignored, local only; the PDFs there are copyrighted and must never be committed or
published.

Merging a stage into `track-e` (the recipe that worked):
1. Only from the `track-e` worktree, and never while a benchmark runs from it.
2. `git merge --no-ff <branch>`. Expected conflicts: `src/sim/candidates.ts` (import lines, nurse and travel offers:
   keep both sides), `tests/sim-track-e.test.ts` (switch list: union), `scripts/lib/prescriptions.ts` (union),
   `src/sim/params.gen.ts` (take ours, regenerate), `docs/research.md` and `docs/staging/e-sources.md` (both sides
   append "the next section number": renumber the incoming one and fix its references in the prereg, `data/params.json`
   notes and code comments). Sections now run to E.23 / §23.
3. `gen-params --check`, `tsc`, `pnpm test` (0 fail), then commit, then `git ls-files data/raw node_modules` must print
   nothing.

## 7. Orchestration playbook

A stage-agent prompt that worked (see the E2e one in this session's transcript) has: what Track E is and the rule;
what to read first; the worktree path and the git rules; the privacy rule naming Unpaywall; the open problem with
numbers; two or more first-principles hypotheses as separate arms; the steps (sources → prereg committed → switch
implemented with 0 = today → tests → benchmark with exact params, seeds and `--workers` → ≤ 3 iterations → results in
the prereg and a simulation.md note → `pnpm test` + `tsc` → commit); the hard rules; and a final report **under 250
words** with a fixed table. Add the checklist below to every stage prompt; it would have prevented most of §8.

**Paste into every stage-agent prompt:**

```text
Pre-flight (before the first run):
- Commit sources and the pre-registration within your first 15 minutes; commit WIP before every long run. An app restart can kill you at any time.
- Open the source of every field row you will be scored on and write its sample (sex, reproductive state, mass, method) into the prereg.
- List every readout your predictions need, define each from the source's Methods (quote the sentence), and smoke-test it on 1–2 days with your switch ON before any arm.
- Fix known defects in the code under test before measuring; any you defer go in the prereg with file:line.
- If a switch removes a named rule but the prescription count does not fall, the tool is wrong: run scripts/param-reads.ts on it.
- Worktree: symlinks for node_modules, data/raw, artifacts/validation/c7a-field1y.json. Stage explicit paths, never `git add -A data`.
- Title new research.md / e-sources.md addenda by stage name ("Addendum: E2e pre-dawn"), not by number; the integrator numbers them.
Runs:
- Run from a frozen checkout: `git worktree add --detach <scratch> <your committed head>`, or never edit src/, scripts/ or data/ while a run is queued. Check `git.dirty` in the e-bench JSON (a clean worktree shows 1: the data/raw symlink).
- Cheapest decisive check first: a 2-day smoke test, then the diagnosis script (energy, rhythm), then e-bench.
- One simulation per arm where possible. Reuse the reference JSON the integrator gives you; do not re-run it.
- Launch runs with run_in_background and wait for the notification, or one Monitor until-loop per wait. Never `sleep N`, never `tail -f`. Work on docs while you wait. Stop every monitor before your report.
- Check `uptime` first; --workers 1 if load > 8.
Judging:
- Judge only the --compare figure "on N rows scored in both", with and without T-HUN-4 and T-BRD-1, against the registered noise threshold (§4.5). A difference inside it is not a result: say "inside noise" and recommend a confirm.
- Generate every number in your tables from the JSON with a script; never type one in.
Sources:
- grep docs/research.md and docs/staging/e-sources.md before fetching anything; the full text may already be cited.
- NCBI BioC first (https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/PMC<id>/unicode), then efetch db=pmc, OpenAlex locations, Wayback `id_` URLs.
- At most 2 routes or 10 minutes per source, then mark it "not verified" and move on. Never guess file names. A Europe PMC fullTextXML 500 means not open access: do not retry.
- If a host shows a CAPTCHA, WAF or "verify you are human" page, stop using that host. Do not route around it.
- NEVER send the user's email or any personal data to any external service. Never use Unpaywall.
- Use your own scratch subdirectory (the session scratchpad is shared between agents and disappears with the session).
Report: under 250 words, the fixed table, branch head. Details go in the prereg, not the report.
```

## 8. Retrospective: where this session lost time or correctness, and the rule that prevents it

Session 16:29–22:44 local: one integrator and 23 agents, about 16 agent-hours. Five read-only reviewers went through
every transcript afterwards; their evidence (timestamps, commands) is in this session's transcript. Ranked by cost.

**1. Building toward a field number nobody had audited (largest; > 1 h of agent time plus an invalid headline).**
E1 missed intake by ~1.9 ×. E1b, E1e and E1g were built and run against T-ENE-1 (2,479 kcal) and 309 min without anyone
opening the source: its 14 females were nursing mothers, and its formula overstates energy. E1g's headline (k ≈ 1.6)
compared that sample with pooled females, and the integrator reported it to the user as "a strong result"; the audit
overturned it 1.5 h later. A wrong premise ("swallowed seeds ruled out", reconstructed from search snippets) went into
two prompts. The full text was reachable in 2 s through NCBI BioC, and research.md already cited it.
→ **Before any mechanism is built to reach a field number that is far off, audit that number: sample, method, formula.
An audit costs ~30 minutes; this cost hours.**

**2. Unbounded source hunts (~1.5 h across agents).** E1e spent 60 min rebuilding one methods sentence by phrase search;
the verifier made 14 attempts at one paper, 10 of them guessed file names; three research agents fetched the same
papers and hit the same paywalls; the audit parent re-researched what it had delegated.
→ **BioC first; 2 routes or 10 minutes per source; a shared list of known dead ends (miltonDemment1988,
chiversHladik1980, simmen2017 main text, Potts 2015, Speakman 2000, Google Books); disjoint source lists per
subagent with a shared fetch manifest; the parent does not redo delegated research.**

**3. The integrator idled the pipeline on a user question (46–54 min).** At 20:20 the integrator asked the user how to
treat the time-budget rows and waited. E1f and E2c finished at 20:20 and 20:28 and sat unmerged; no agent ran until
21:14, although E2d and E4c did not depend on the answer.
→ **Before asking the user anything, merge what is finished and launch every piece that does not depend on the
answer.**

**4. Foreground waiting (~100 agent-minutes).** E3/E4a/E4b ~35 min, E4c ~36 min of 82 (600 s until-loop timeouts,
orphaned waiters), E2b ~20 min, E2d 25 Monitor re-arms plus two `tail -f` monitors that outlived its report and sent it
three times. `sleep N` is blocked by the harness.
→ **Background runs plus notifications; one until-loop Monitor per wait; no `tail -f`; docs work while waiting.**

**5. Code edited under a queued run (~19 min plus a lost prediction; one near miss).** E4c rewrote src/sim/calls.ts
while S0/S1 were queued, so S1 ran the next iteration (a disclosed protocol breach). E1b and E1c benches ran from dirty
trees. The integrator started merging into `track-e` while a confirm ran from it (19:19), caught it, killed the run and
moved benchmarks to the frozen `bench-run` worktree.
→ **Every run from a frozen detached checkout of a committed head.**

**6. Measurement defects found after the runs.** The prescription count undercounted from E0 on (opt-in ACTIVE_WHEN,
no per-switch test, ledger built with all switches off), so the "prescriptions fall" leg of the keep rule was
unreliable for E1–E2b until the audit fixed it (134 → 102 on the stack). Counts also drifted for unrelated reasons (a
duplicate literal, a parameter renamed from …GapH). E4a's T-END-8 readout used the wrong statistic and its "fails in
reverse" claim reached the plan. rhythm-metrics counted the first tick as a midnight, so one of E2c's kill
criteria rested on an artefact. calls-diagnose missed same-tick arrivals. Readouts added after first runs forced
re-diagnosis (~22 min in E4c; 5 extra runs in E4a/E4b; 2.5–3.5 min each in E1c, E1f, E1h).
→ **Define and smoke-test every readout before the first arm; a zero count delta for a switch that removes a named rule
is a tool failure; compare counts only after `--rescore` of both runs on one commit.**

**7. Comparisons that were not like for like, and five different noise thresholds.** Headline sums were quoted with
different row sets (E2c "2.47 → 24.45" held-out was T-HUN-4 dividing by near zero; E4a/E4b quoted raw totals). References
ran at other commits or with uncommitted files (E4b; the earlier session's `baseline-confirm`, which the integrator used
for the full-stack compare without checking its header). Thresholds of 0.3/0.5, 0.8, ~1 and 1.1 were each registered
somewhere, while noise arms moved sums by 1.1–3.1. E1h's null (+0.68 vs 0.5, almost all T-HUN-4) and E1e's keep (mothers
−0.049%/day vs a 0.05% line) both sit inside plausible noise.
→ **One threshold set by the integrator, from 2–3 noise arms, on rows scored in both, with and without the rare-event
rows; read the "Generated … at commit … (N uncommitted)" line of every baseline before using it.**

**8. Duplicate and mis-ordered runs (~30–40 min).** E1b and E1c ran the same references; E1g simulated every arm twice
(e-bench, then energy-diagnose: ~13 min); E1e's first iteration ran the bench before the 3-minute energy diagnosis that
would have shown 8 starved mothers; E2c and E2d each lost an iteration that a 3-second 2-day smoke test would have
caught (a menu loophole; day nests).
→ **One reference per base commit, shared; cheapest decisive check first.**

**9. Known defects left in code under test.** E4a knew of two defects, mentioned them only in its report, and measured
with them; E3 saw the menu-construction change in its own merge diff and missed the matching fix (the review caught
it). The review itself missed E4a's self-reported defects because nobody gave it the list.
→ **Fix before measuring, or write file:line into the prereg; hand reviewers the known-issues list.**

**10. Merge churn (roughly 45 integrator-minutes over 10 merges).** Every agent appended "the next" research.md section, so 8
merges needed renumbering (E.14 → E.23) and reference fixes in preregs, params.json notes and comments. The `data/raw`
symlink was committed four times (twice by the integrator with `git add -A data`, once by E1b, once by E4b, which amended at once) because
`.gitignore` matches the directories with a trailing slash, not the symlinks; the common `.git/info/exclude` now lists
both. Agents merged track-e twice each; a missing c7a symlink cost full test re-runs.
→ **Addenda titled by stage; explicit staging; fully provisioned worktrees; agents merge track-e once, just before
their final test run.**

**11. Work lost to interruptions.** The earlier session's agents left results uncommitted (recovered by hand at the
start of this one). When the user asked to pause for an app restart, the integrator committed its own state but did not
tell the two running agents to commit; E2e lost its 15 minutes.
→ **On any pause or restart request, message every running agent "commit WIP now" and wait for the replies.**

**12. A privacy breach.** E2b put the user's email address in an Unpaywall URL (18:14). Its prompt had no personal-data
rule, so the agent improvised a "polite" API call. The rule went into every prompt from 19:23 on; all five
reviewers confirmed no further leaks. Some agents also routed around bot checks (an alternative API path after a WAF
challenge, re-requests of CAPTCHA pages).
→ **The privacy rule and the stop-at-a-challenge rule go in every prompt from the first one.**

**13. The integrator's context ran out after ~6 h.** Agent reports ran 348–500 words against limits of 250–300, and
several were sent twice; long user updates added to it. The resume note written at the pause also carried an error
(it planned two arms where the comparison needs three, against a baseline of unknown provenance; corrected in §5.1).
→ **Enforce the report limit; details live in the prereg; write or refresh this handoff after every two merges, and
check that every planned comparison has its reference arm at the same mode and commit.**

**14. Open doubts the reviewers raised (not yet checked).** E3's iteration-3 explanation (persistence fails because a
walk to a crown rarely pays) may be a units artefact: `payOf` calls `treeIntake` with the hunger cap on. Re-tested on 2 October
(e3-prereg.md, last section): the effect stands on the current code (crown bouts 22 → 11 min, fruit share 0.54), so
the doubt is resolved; E3's recommendation stands and the next persistence re-test belongs on R + E1i's pair. E1f staged T-INF-1..5 after seeing model values
(disclosed; bands from field values only): the integrator should stage target rows before agents run references.

### The rules, short
Integrator: audit a target before chasing it · never idle the pipeline on a question · freeze code under every run ·
one reference per commit, shared · one noise threshold, common rows, with and without rare-event rows · addenda by stage
name · on pause, tell agents to commit · refresh this handoff every two merges · privacy rule in every prompt.
Agents: the pre-flight block in §7.

## 9. Open questions for the user
1. Lift the 90-day cap for a 365-day confirm of the kept stack?
2. Gut input: the confirm kept the fix conditional on a 111 mL/kg gut, but the sources now lean to ~83 mL/kg or less
   (low confidence) and the daylight readouts point at the appetite instead. Proposal: no change until E1i reports.
3. May the staged target rows be applied to `data/targets.json` (new freeze)?
4. May the merged worktrees be removed, and what should happen to the unmerged encounter-fix branch
   (`worktree-agent-a954b443db4b6f22a`)?
6. May the three staged scorer fixes for colobus encounters and hunting (docs/staging/e4f-protocol.patch.json: gilby2015's
   run rule, T-HUN-3/4 on party follows, T-HUN-1 counting only encounter-matched hunts) be applied? They change the
   frozen observer, so they need a protocolLog entry and a new freeze, like the staged target rows (question 3).
5. Can you open Chivers & Hladik 1980 on HAL (hal-00561758) in your browser, or supply it and Milton & Demment 1988
   (J Nutr) through institutional access? The captive female's body mass decides the gut input (§E.25).
