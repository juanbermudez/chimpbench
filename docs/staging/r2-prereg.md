# Stage R2: state in the packet (v4) and one menu for every kernel (pre-registration)

Agent r2-packet, branch `r2-packet` from `track-e` e0cf866. Registered 6 October 2026, before any code. Specification:
`IMPLEMENTATION_PLAN.md`, Track R, "Stage R2: State in the packet (v4)", the direction amendment, "User decisions on the
open questions" (item 2: "fix the night menu in the next stage") and "Fan-out and routing for the small kernel"
(technique 3, kind of activity first, then target). The user's direction, verbatim (6 October 2026): "we want to correct
whe still relly on code, and we want to compare to what wild chimps display in the wild, and that the behavior can be
driven with a simple desicion engine with the recurrent chape we designed".

R2 is judged by tests and by one fixed sample of decision points collected inside the unit-test budget. No benchmark is
run (no e-bench, e-run, field-metrics, sim-metrics), no model is loaded, no GPU, no paid or network call, no golden is
re-recorded. Seeds: 48 and 7 only. `src/decision.ts` and `server/decide.ts` are not edited (another agent is merging the
UI branch through them); what R2 needs there is written in §6 "for the integrator after the UI merge".

## 1. What will be built

Four switches, registry group `decision`, all 0 by default in both profiles; 0 = today bit for bit (world, context and
text packet). Their notes begin "Stage R2", so they are not Track E switches and `TRACK_E_SWITCHES` is unchanged (its test
selects notes that begin "Stage E", as for M1's and R1's switches).

| switch | values | what 1 (or 2) does |
| --- | --- | --- |
| `observeV4` | 0, 1 | A. `observe()` returns the M1 observation (as `observeState` 1: `body`, `light`, option `value`s) plus the v4 fields of §2 and the marker `packet: 4`. Read only by `observe()`; nothing in the simulation reads it |
| `menuParity` | 0, 1 | B. the menu of every kernel other than the rules is built by the function that builds the rules' menu (`rgMenu`, `src/sim/rg.ts`): the same phase rule (the open menu under `rhythmFreeNight` 1, the night and dusk menus otherwise) and the same kept picks (the best option, a response to a disturbance the animal perceives, a joined trip, a hunt or a patrol lead at its impulse) |
| `activityFirst` | 0, 1, 2 | C. the menu offers one entry per kind of activity (`kindOf`, `src/decide/facts.ts`, the Jev design's kinds). 1: the target is settled by a registered rule (§4). 2: by a second kernel call over the options of the chosen kind, when it has two or more |
| `kernelSim` | 0, 1, **2** | D (existing R1 switch, one new value): 2 = the packet-reading rules kernel decides inside the tick for rules-driven chimps aged `rgMinAge` and over, through R1's shared step |

**A. Packet v4 (`src/sim/observe-state.ts`, `src/types.ts`, `src/sim/context-check.ts`, words in
`src/kernel/packet-words.ts`).** M1 already shows reserves against the store, the deficit drive with its need and waking
hours, foregut fill, sleep pressure and felt sleepiness, the circadian level and direction, the water deficit, heat, the
slow states and the fast arousal, the light, and per option the net energy rate, crop, sighting age, feeders, distance and
company. R2 extends it; nothing of M1 is redone. New fields, all optional, all inside `body` and `value` (so the server's
`withoutState` and M1's layout keep working unchanged), each computed by the function the rules' valuation calls:

- `body.hindFill` 0..1: hindgut fibre against its capacity (`en.hind` ÷ `digestaCaps(c, P)[1]`; `ledgerDigesta`). A full
  hindgut holds the foregut full (energy.ts), so it says when eating more cannot help.
- `body.feedDrive`: the drive every feeding option is multiplied by (candidates.ts `fd` = 1.6 × hunger + 0.1), only under
  `forageRate` with open books. `body.fullKcalH`: the animal's own full ripe-fruit rate, kcal per hour (the scale of every
  `kcalH`), rounded to 10.
- `value.share`: an option's net rate as a share of that full rate (`treeRateShare`; `kcalH` = share × full rate), so a
  rate can be worded without a bare number.
- `value.chance` 0..1: for a listed crown valued from the community's list alone (tripBeliefs bit 4, `bel[5]`), the
  chance it is in fruit. `value.spreadKcal`: for a crown out of sight, one standard deviation of the animal's belief about
  its crop, kcal (rg.ts `beliefOffset`: s = crop × (1 − exp(−patchRecoverPerDay × hours unseen ÷ 24)); 0 = just seen).
- `value.swingLow`, `value.swingHigh` (score units; the kernel-facing form of the belief, never rendered as text): what
  the option's rules value changes by if the crown holds less or more than believed. With `chance`: bare (minus the
  trip's food term) and in fruit (the food term of a fruiting crown less the expected one), exactly the two outcomes of
  `beliefOffset`. With a spread: the food term at crop − s (floored at 0) and at crop + s, each less the term at the
  believed crop (`treeFoodWorth`). Only under `choiceBelief` ≥ 1 (the rules then sample this belief).
- `value.odds` 0..1: for a charge, attack or display aimed at a perceived chimp under `contestAssess` 1, the chance of
  winning the rules' valuation assesses (`assessOdds`, hierarchy.ts).
- `value.company` on the animal's own nest under `nestCompany` 1: the company of nest-mates that leaving would lose
  (`nestCompanyValue`, as candidates.ts calls it).
- `packet: 4` on the context (top level, optional): the marker a text builder reads to choose the v4 wording.

Local only: every field reads the focal animal's own body, a tree or animal in its perception snapshot, its memory, or a
belief the rules already hold it to (the crop of a remembered or listed crown; the odds against a perceived rival). Pure:
no `world.rng`, no write; books that are not open give no field; non-finite values are left out.

**B. One menu (`src/sim/request.ts`).** With `menuParity` 1, `buildRequest` takes the option set and order from
`rgMenu(world, chimp, list)` (`list` valued as the rules value it: `byValue` under `choiceBelief` 1) and maps each entry
to the observation's copy of that option (which carries its `value`). `rulesIndex` stays the position of the rules'
argmax. With `kernelNoRulesPick` 1 the argmax is removed from the list before `rgMenu` runs. The rules' own menu is not
touched, so a rules-only world is hash-identical at 0 and 1. Direction of the alignment, registered: the other kernels
follow the rules (the rules' menu is the base's behaviour; aligning the rules to the phase menus would change S39).
Consequence stated now: on a `rhythmFreeNight` stack a model kernel then faces the open menu at night, which M3 measured
as 80% of the night out of a nest for untuned GLiNER under wording 1 (3% under wording 2).

**C. Activity first, then target (`src/sim/request.ts`, `src/sim/decide.ts`, `src/kernel/loop.ts`).** With
`activityFirst` ≥ 1 the phased, perceived option list (B's when `menuParity` is 1, today's otherwise) is grouped by kind.
The entry of a kind is its best option by rules score (ties: the menu's order). The menu is at most 8 entries: the kinds
of the kept picks first, rest, then kinds by the score of their entry; displayed in the menu's fixed action order.
`KernelRequest.groups[i]` holds the options of entry *i*'s kind (at most 8, best first; the entry is `groups[i][0]`).
Step two, the registered rule (`activityFirst` 1): the entry itself, the rules' best target within the kind; one kernel
call per decision. Step two by a second call (`activityFirst` 2): if the chosen kind has two or more options, a second
request (the same context, `candidates` = that kind's options in menu order) goes to the same kernel through the same
validation, and its answer is applied; otherwise the entry. `StepResult.calls` counts kernel calls. The first-step entry
is a concrete legal option, so request validation, the answer check and `applyDecision` are unchanged.

**D. The packet-reading rules kernel (`src/kernel/packet-rules.ts`).** A kernel that reads only the request: each
option's value is its published rules value in the context (`candidates[i].score`, the rules' valuation with its
evaluation noise, in every context since before M1 and never rendered into a model's text) plus, in mode `sample`, a draw
from the belief the v4 packet carries (`chance`: `swingHigh` if the loop's draw is below it, else `swingLow`; a spread: a
standard normal *z* from two of the loop's draws, `z·swingHigh` above 0 and `−z·swingLow` below, floored at the bare
crown), and it picks the highest. Mode `mean` adds no draw (the option of highest expected value). It holds no state and
draws only through `env.random`. **What this kernel is and is not, registered before it is measured:** it does the
rules' *choice step* from the packet; the *valuation* behind each score is still computed by `computeCandidates` in the
loop and carried in. It does not re-derive a score from the body state. §5 lists what a kernel would need for that.

**E. Token budget (`scripts/lib/packet-v4.ts`, `scripts/r2-sample.ts`).** The v4 text packet is composed outside the
server: `buildLocalQuestion` (imported, not edited) gives M1's packet for the context; the composer replaces the `body`
line and each option's value words with §3's wording and re-applies the server's trimming loop against
`TOKEN_BUDGET_STATE`. Sizes by the server's `estimateInputTokens`.

## 2. The fixed sample (`scripts/r2-sample.ts`; not a benchmark)

Field profile, the working base (S39 with `pithFibreSwallowed` 0.5: `docs/staging/integrator-kit/params/M6-W50.json`)
plus `observeV4` 1, seeds 48 and 7, every chimp on the rules. Burn-in 2 days, then 2 days sampled. At each rules decision
of an animal aged `rgMinAge` or over, `rulesTap` builds the requests before the decision (pure) and `rgTap` records the
rules' verdict and pick. Kept: every decision where the rules drew (gate open, two or more options); every 10th kept or
arrived one (by hash of seed, tick and chimp, never `world.rng`). The script checks that the tapped world's hash equals
an untapped run. If one seed takes more than 6 minutes of wall time on the shared machine, the sample shrinks to 1 day
of burn-in and 1 day sampled, and that is stated with the numbers. Output: `artifacts/r2/` (gitignored) and the numbers
of §8.

Readouts, all on this sample:
1. **Agreement of the packet-reading rules with the live rules** at draws: top-1 with a 95% bootstrap interval over
   animals (2,000 resamples, a fixed hash stream), for (a) mode `mean`, (b) mode `sample` with independent draws (a hash
   of seed, chimp and decision version: what a kernel between ticks gets), (c) mode `sample` on a copy of `world.rng` at
   the decision (what `kernelSim` 2 gets inside the tick); each with `menuParity` 0 and 1, by day phase, and split by
   whether the live pick is on the request's menu. **The ceiling reported is (a) with `menuParity` 1**: the best a
   function of the packet can do without knowing the draw. Chance (1 ÷ menu size, averaged) beside it.
2. **Menus**: share of requests whose option set differs between `menuParity` 0 and 1, by phase; with 1, the share equal
   to `rgMenu` (must be 100%).
3. **Activity first**: entries per menu and chimp-target entries per menu at `activityFirst` 0 and 1; kernel calls per
   decision at 2 for the packet-reading rules, for the null kernel (hash draws), and the upper bound (share of menus
   where any kind has two or more options); agreement of the packet-reading rules with the live rules at 1.
4. **Tokens** (the server's estimate): median, 90th percentile and largest for today's packet (`observeState` 0), M1's
   (the server's own rendering of the v4 context), v4 (A on), v4 with `activityFirst` 1 (A and C on).
5. **Ablation** (plan criterion 3) with the kernels R2 may run: for each field group (energy, gut, sleep and phase,
   arousal and slow states, the belief behind an option) the context without it, the tokens it costs, and the share of
   sampled decisions where the packet-reading rules' pick changes. A model's ablation needs a model load and is the
   integrator's (R4's probes); R2 delivers the ablation function and the probe renderings (§3).

## 3. The exact wording (v4; design assumptions, wording only)

Rule: a word first wherever the number has no meaning to a reader; a number stays only with a unit a reader knows (kcal,
kcal an hour, metres, hours, %). The degree words are the packet's own drive words (`intensity`: mild ≥ 0.4, moderate
≥ 0.55, strong ≥ 0.7, severe ≥ 0.88), because M2 found the model follows those and ignores bare numbers.

Body line, parts joined by "; ", each only when its field is present:

| field | words |
| --- | --- |
| `reserves` r | ≤ −0.5 "body reserves nearly gone"; ≤ −0.25 "body reserves badly run down"; ≤ −0.10 "body reserves run down"; ≤ −0.03 "body reserves a little low"; < 0.03 "body reserves at my usual store"; else "body reserves above my usual store". Outside ±0.03: " (N% below)" or " (N% above)" |
| `deficit` d, `needKcal`, `awakeH` | d ≥ 0.4: "{mild, moderate, strong, severe} energy shortfall"; ≥ 0.15 "slight energy shortfall"; else "no energy shortfall". With a need above 0: ": about N kcal still to find" and, by waking hours left, ", most of the waking day left" (≥ 8), ", some hours of waking left" (≥ 3), ", little waking time left" (≥ 0.5), ", about to sleep" (below). A need of 0 or less: "no energy shortfall: enough eaten for today" |
| `gutFill` g, `hindFill` k | g ≥ 0.9 "stomach full"; ≥ 0.6 "stomach mostly full"; ≥ 0.3 "stomach half full"; ≥ 0.1 "stomach nearly empty"; else "stomach empty". k ≥ 0.9 adds ", gut behind it full, so more food cannot pass yet"; k ≥ 0.6 adds ", gut behind it filling" |
| `waterDeficitPct` w | ≥ 2 "badly short of water"; ≥ 1 "short of water"; ≥ 0.3 "a little short of water"; else "well watered" |
| `heat` | ≥ 0.4 "hot"; ≥ 0.05 "warm"; ≤ −0.4 "cold"; ≤ −0.05 "chilled"; else "comfortable temperature" |
| `sleepiness` z, `sleepPressure` S | z ≥ 0.4: "{mild, moderate, strong, severe} sleepiness"; ≥ 0.15 "slightly sleepy"; else "wide awake". S ≥ 0.7 adds ", long awake"; S ≤ 0.3 adds ", well slept" |
| `clock`, `clockRising` | ≥ 0.6 "body clock at its daytime high"; ≤ −0.6 "body clock at its night low"; else "body clock rising toward day" or "body clock falling toward night" |
| `stress`, `arousal`, `affiliation`, `acute` | stress ≥ 0.7 "stress load high", ≥ 0.4 "stress load raised", else nothing; arousal ≥ 0.6 "ready to contest", ≥ 0.3 "competitive arousal raised"; affiliation ≥ 0.6 "strongly drawn to companions", ≥ 0.3 "drawn to companions"; acute ≥ 0.5 "heart racing", ≥ 0.15 "on edge". None present above its floor: "settled" |

Example: "body reserves run down (12% below); strong energy shortfall: about 1,200 kcal still to find, little waking
time left; stomach nearly empty; a little short of water; warm; slightly sleepy; body clock falling toward night; on
edge".

Option words, appended to the purpose as M1 does, joined by "; ":

| field | words |
| --- | --- |
| `share` q with `kcalH` | q ≥ 0.75 "a rich feed"; ≥ 0.45 "a good feed"; ≥ 0.2 "a modest feed"; > 0 "a poor feed"; else "no gain after the walk". Above 0: " (about N kcal an hour net)" |
| `cropKcal`, `seenH`, `chance`, `spreadKcal` | in view: "N kcal of fruit there". Seen before: "N kcal of fruit there when I saw it {T ago}" and, by spread ÷ crop, nothing (< 0.2), ", may have changed" (< 0.6), ", uncertain by now" (else). Never seen: "not seen myself" and, by chance, "probably in fruit" (≥ 0.75), "may be in fruit" (≥ 0.4), "unlikely to be in fruit" (below), then " (about N kcal if so)" |
| `feeders` (out of view) | "N other(s) going there" (M1's) |
| `company` | ≥ 0.6 "much better company than here"; ≥ 0.3 "better company than here"; > 0.05 "a little more company"; else "no more company than here". On the animal's own nest: "nest-mates beside me" above 0.05 |
| `odds` | ≥ 0.75 "I would likely win"; ≥ 0.55 "I would probably win"; ≥ 0.45 "an even contest"; ≥ 0.25 "I would probably lose"; else "I would likely lose" |
| `distM` | M1's "N m away", under M1's rule (not for a partner, not when the reason names a distance) |

`swingLow`, `swingHigh`, `feedDrive`, `fullKcalH` and `score` are never rendered.

**The wording on M2's probe design** (`scripts/em-probes.ts`: six probes, three levels of one state, everything else
unchanged). No model may be loaded here, so R2 tests the rendering, not a model's response: for each probe (deficit,
reserves, sleep, light, heat, water) the v4 body line at the three levels differs from level to level, differs only in
that probe's part, and uses a different degree word at each level (a test). The model's response to these renderings is
R4's state-probe criterion and the integrator's run.

## 4. Success thresholds (all must hold; from the plan's Stage R2 and the integrator's brief)

- T1. No packet over 1,280 tokens by the server's estimate on the fixed sample, with A on and with A and C on; the
  median, 90th percentile and largest reported. (The estimate's largest known under-count is 37, so the margin to 1,243
  is reported too.)
- T2. `observe()` stays pure (no `world.rng` draw, `JSON.stringify(world)` unchanged) and local-only (every valued
  option's target is in view, remembered, believed or a perceived chimp); finite numbers only.
- T3. With every new switch 0, the context and the text packet are byte-identical to today's (`observeState` 0 and 1
  both), and the world is hash-identical; with `observeV4` 1 the context minus the v4 fields and the marker deep-equals
  the `observeState` 1 context, and the world is hash-identical (nothing in the simulation reads the switch).
- T4. `tests/fixtures/golden-world.json` and the field pin (`tests/sim-track-e.test.ts`) pass unchanged; neither file is
  edited. `menuParity`, `activityFirst` at 1 leave a rules-only world hash-identical.
- T5. With `menuParity` 1, at every sampled decision point the request's options equal `rgMenu`'s, in order (100%).
- T6. With `activityFirst` ≥ 1 no menu holds two entries of one kind; every entry and every second-step option is a legal
  option that passes `decisionContextError` and `applyDecision`; kernel calls per decision are counted and reported.
- T7. The packet-reading rules pass R1's shared step (request validation, answer check, `applyDecision`); `kernelSim` 2 is
  deterministic however ticks are batched. Its agreement with the live rules is reported with its interval; no threshold
  on the level (it is a measurement), but in mode `sample` on a copy of `world.rng` with `menuParity` 1 it must equal the
  live pick at every draw whose menu carries no spread-type belief (the chance-type draw is exact): a check of the
  mechanics.
- T8. `gen-params --check` clean; `tsc --noEmit -p .` clean; the test files touched plus `tests/sim-track-e.test.ts`,
  `tests/golden*.test.ts`, `tests/kernel.test.ts`, `tests/em-observe.test.ts`, `tests/decision.test.ts` pass. The full
  `pnpm test` is the integrator's at the merge (memory is tight on the shared machine).

## 5. What the v4 packet will still lack (to be confirmed against the code and corrected in §8)

For the rules' **choice step** (what the packet-reading kernel does): the draw itself (`world.rng`); the exact food term
at a sampled crop for a spread-type belief (two points are carried, the rule is non-linear); the intention and what
closed it (the gate is the loop's, R1 D1); below `rgMinAge` the argmax over the full list rather than the menu.

For the rules' **valuation** (what `computeCandidates` reads and no packet field carries, so a kernel cannot re-derive a
score): the territory cost grid and the neighbours' ranges; a female's core area; the revisit history of each crown; the
community's list of known trees beyond the trips offered; remembered trees beyond those offered; quotas and cooldowns
(greetings, matings, calls, begging, grooming upkeep); patrol, hunt and consort state of the party; the hierarchy's
strengths, Elo values and supporters behind `odds`; instability after an alpha change; illness; the dependent's and the
guardian's state; the exact positions, speeds and light-limited pace behind each rate. The list is completed from a
read of `computeCandidates` and its helpers and reported in §8.

## 6. For the integrator after the UI merge (exact changes, not made here)

- `server/decide.ts`, `buildStateQuestion`: when `ctx.packet === 4`, take the `body` line from `bodyWordsV4(ctx.body)` and
  each option's value words from `valueWordsV4(c.value, c.reason, social, c.action)` (`src/kernel/packet-words.ts`), as
  `scripts/lib/packet-v4.ts` `buildV4Question` does today outside the server; `withoutState` should also drop `packet`.
  The Jev packet gains the named fields `hind_fill`, `chance_in_fruit`, `win_odds` (optional).
- `src/decision.ts`: nothing for A and B (`buildRequest` is re-exported). For `activityFirst` 2 the app's loop needs the
  second call (`request.groups`, as `src/kernel/loop.ts` `answerWaiting` does); until then the app supports
  `activityFirst` 0 and 1 only.
The final text of both changes is written in §8 once the code exists.

## 7. What will not be done

- No benchmark, no model load, no GPU, no paid call, no network; no run on a reserved or retired seed.
- No edit of `src/decision.ts`, `server/decide.ts`, the goldens or the field pin.
- No re-derivation of the rules' scores from body state (§1 D, §5): 600 lines of valuation with dozens of live reads;
  doing it by a second formula would break M1's rule ("never a second formula") and could not be checked without a
  benchmark.
- The fan-out wrapper and confidence-gated routing (techniques 1 and 2 of "Fan-out and routing") are not in this brief.
- No change to what the rules read or choose; no UI; no training file; no change to `scripts/em-*` or `scripts/ft-*`.
- The model-side ablation and the model's response to the probe renderings (they need a model).

## 8. Iteration log and results

Each iteration is logged here before it runs; at most 3 per problem.

- **Iteration 1 (the build as registered in §1–§3).** Registered with this file, before any code.
  **Corrections to §1 and §3 found while building, logged before any test or sample ran:**
  (a) `value.odds`: `contestAssess` values the *answer to an aggressor of the animal's own community* by `assessOdds`
  (candidates.ts `threatResponses`: submit, flee, counter-charge), not every charge, attack or display; `odds` is attached
  to those three answers only. (b) `value.chance` is carried at full precision (the rules compare one draw with it), and
  the words round it. (c) The v4 text is the server's wording 2 packet (M1 iteration 2: purposes that follow Track E's
  mechanics, "sleepiness" for the drive) with the v4 body line and value words; §3 did not say which of M1's two wordings
  it extends. (d) The packet-reading rules carry the kernel id `rules` (they are the rules given a packet), so `KERNELS`
  and R1's test of it are unchanged. (e) `body.feedDrive` reads a one-line export of the valuation's own expression
  (`crownDrive`, used by `treeFoodWorth`); `beliefOffset`'s spread is likewise one export (`beliefSpread`) and `rgMenu` is
  split into `rgMenuParts` and the bounding call; none changes a value. (f) Between ticks a kernel's first draw is
  unchanged (`drawUniform`); a second or later draw in the same decision takes the next value of the same fixed hash
  stream (before R2 every draw of a decision returned the same number, which a kernel drawing once never saw).
- **Iteration 1a (timing only).** `scripts/r2-sample.ts --seeds 48 --burn-in 0.05 --days 0.05 --no-check`: a smoke run
  to read the wall time per simulated day before the registered sample is launched. No number from it is reported.
- **Iteration 1b (T3, the check against the base commit).** A throwaway script hashes, for the same fixed worlds, every
  living chimp's request (`buildRequest`: context, options, rules position) and its two text packets (`buildLocalQuestion`,
  `buildJevQuestion`): compressed seeds 48 and 7 at 12:30 and at about 19:40; field, the working base, seed 48, with
  `observeState` 0 and 1, at 12:30, 19:00 and 23:00. It runs once on an extracted copy of `track-e` e0cf866 and once on
  this branch; with every R2 switch 0 the two outputs must be equal line for line. Not a benchmark (16.5 simulated hours
  of the field map per world). The request hashes it prints for the compressed worlds are then pinned in the test file.
  Result of 1b: equal line for line (10 of 10 worlds; requests and both text packets), so T3 holds against the base
  commit for `observeState` 0 and 1.
- **Iteration 2 (the new test file, first run).** `tests/r2-packet.test.ts` as written against §4; any failure is logged
  here with whether the test or the code was wrong.
  Result of iteration 2: 17 of 17 pass on the first run; no change to the code or the tests.
- **Iteration 3 (the registered sample, §2).** `scripts/r2-sample.ts --seeds 48,7 --burn-in 2 --days 2` with the hash
  check, as registered; output `artifacts/r2/`. Run once; its numbers go to §8 as printed.
- **Iteration 4 (one readout added to the sample, registered before it runs).** Iteration 3's numbers are in §8. The
  packet-reading rules read each option's published value, so their agreement says nothing about how far the *shown
  state* fixes the choice. One readout that needs no model and no second formula is added: among draws whose live pick
  is a feeding option with a shown net rate (`kcalH`) and whose menu holds two or more such options, how often the live
  pick is the one with the highest shown rate (with the chance level, 1 ÷ the number of such options). Everything else
  in the script is unchanged, the run is deterministic, so iteration 3's numbers must come out the same; the sample is
  re-run once.
  Result of iteration 4: every number of iteration 3 came out the same (the two summaries are equal apart from the new
  readout and the wall time).
- **Iteration 5 (one failure in a file outside the brief's list, one fix).** `tests/sim-orphan-blind.test.ts` (run
  because R2 touched `observe-state.ts`) failed 2 of 5: the nest-company belief called `dependentOn(`, which that lint
  allows only at listed sites. The call was not needed (an animal with a carer is offered only its carer's nest, variant
  `MOTHER`); it now reads the option's variant. 5 of 5 after the fix; `tests/r2-packet.test.ts` re-run, 17 of 17, the
  same field counts. `tests/sim-params.test.ts` failed 1 of 11 until the §17 row of `docs/simulation.md` existed (the
  registry test asks for it); 11 of 11 with the row. Neither changed a number below.

### Results (6 October 2026; tests and the fixed sample only; no benchmark, no model, no network)

**Thresholds.**

| | Threshold | Result |
| --- | --- | --- |
| T1 | no packet over 1,280 tokens by the server's estimate | **met**: largest 807 with A on, 853 with A and C on (and with A, B and C on); all under the estimate budget of 1,000, so nothing was trimmed beyond the server's own trimming |
| T2 | `observe()` pure and local-only | **met** (no draw, the world's JSON unchanged, finite numbers; every sampled belief is a trip to a crown out of sight, every `odds` an answer to a perceived aggressor) |
| T3 | every R2 switch 0 = today, byte for byte | **met**: the requests and both text packets of 10 fixed worlds hash the same on `track-e` e0cf866 and on this branch (iteration 1b; compressed seeds 48 and 7, the field working base with `observeState` 0 and 1); the compressed request hashes are pinned in the test file. With `observeV4` 1 the observation minus the v4 fields is the `observeState` 1 observation, and the world is hash-identical |
| T4 | goldens and the field pin unchanged; rules-only worlds unchanged | **met**: `tests/sim-params.test.ts` (the six golden cases) and `tests/sim-track-e.test.ts` pass, neither fixture edited; the working base after 2 simulated days is hash-identical to e0cf866 for seeds 48 and 7 (R2 touched `beliefOffset`, `treeFoodWorth` and `rgMenu` by one-line exports); `observeV4`, `menuParity`, `activityFirst` on leave a rules-only world hash-identical (field 12 h, seeds 48 and 7; compressed) |
| T5 | `menuParity` 1: the request's options are `rgMenu`'s, in order | **met**: 9,265 of 9,265 draws on the sample; every animal of 8 y and over at three moments in the test (day, dusk, night), also on a stack with `rhythmFreeNight` 0 |
| T6 | `activityFirst`: no two entries of one kind; legal options; calls counted | **met**: 0 menus of 9,771 with a repeated kind; every entry and second-step option legal and valid; `StepResult.calls` |
| T7 | packet-reading rules through the shared step; `kernelSim` 2 deterministic; the mechanics check | **met**: deterministic at 1, 4 and 60 ticks per call (compressed seed 7, 4 h, 989 decisions, none refused). Mechanics: on a copy of `world.rng` with `menuParity`, 452 of 452 draws whose menu carries no belief equal the live pick. **The chance-type belief does not occur on this base** (`tripBeliefs` 3 has no bit 4), so its exactness rests on the unit test alone |
| T8 | checks | `gen-params --check` clean (1,035 entries); `tsc --noEmit -p .` clean; `tests/r2-packet.test.ts` 17 of 17; `sim-track-e` 2, `sim-params` 11, `kernel` 15, `em-observe` 8, `decision` 22, `sim-rg` 13, `prescription-ledger` 20, `sim-orphan-blind` 5, `sim-choice-belief` 11, `sim-trip-beliefs` 5, `rw-bench` 16, `ft-field` 3, `ft-contexts` 3, `persist-envelope` 14, `decision-guide` 4, `jev-facts` 5, `sim-circadian` 6, `sim-rhythm` 12, `sim-territory` 10: all pass. The full `pnpm test` and `pnpm build` were not run (the integrator's, at the merge) |

**The fixed sample** (`scripts/r2-sample.ts --seeds 48,7 --burn-in 2 --days 2`; `artifacts/r2/summary.json`). 9,771
decision points of 76 animals aged 8 and over: 9,265 where the rules drew (dawn 981, day 7,439, dusk 572, night 273) and
506 kept or arrived acts (1 in 10). The tapped worlds hash the same as untapped runs. Wall time 47 s and 30 s per seed
(plus the untapped run), so the registered size was kept.

*1. The packet-reading rules against the live rules, at draws* (top-1; 95% interval, bootstrap over animals):

| | today's menu | `menuParity` 1 |
| --- | --- | --- |
| expected value (mode `mean`) | 0.976 (0.972 to 0.980) of the 9,020 requests asked; 245 draws (2.6%) have no request (fewer than two options under the night or dusk menu) | **0.981 (0.978 to 0.985)** of 9,265: **the registered ceiling** |
| belief sampled, independent draws (between ticks) | 0.963 (0.958 to 0.967) | 0.967 (0.962 to 0.971) |
| belief sampled on a copy of `world.rng` (inside the tick, `kernelSim` 2) | 0.983 (0.980 to 0.986) | 0.989 (0.987 to 0.991) |
| chance (1 ÷ menu size) | 0.184 | 0.178 |

By phase, expected value: today's menu dawn 0.979, day 0.980, dusk 0.928 (0.902 to 0.954), night 0.893 (25 of the 28
night requests asked, of 273 night draws); with `menuParity` dawn 0.979, day 0.980, dusk 1.000, night 0.989 (0.976 to
1.000). Menus with no belief (452): 1.000 in every mode with `menuParity`. Menus with a spread-type belief (8,813):
0.980 expected value, 0.988 on the copy of `world.rng`: the 1.2% left there is the two-point approximation of a rule
that is not linear in the crop.

**What the ceiling is, and is not.** It is the agreement of a reader of each option's *published rules value* (`score`,
which the context has always carried and no model's text shows) plus the v4 belief. So 0.98 is what a packet-fed engine
can reach **if it is given the rules' valuation**; the 2% left is the belief draw. It is not a statement about an engine
that reads the state words: for that engine the valuation is the thing to be learned, and R2 did not measure how far the
shown state fixes it (that needs a model, or a second formula of the rules). One readout bears on it (iteration 4): the
live pick is a feeding option with a shown net rate in 32.4% of draws; where the menu holds two or more such options
(2,950 draws), **the live pick is the one with the highest shown rate 55.4% of the time (52.2 to 58.5), against 48.7% by
chance**. So among feeding options the shown rate decides little; the terms the packet does not show (below) decide.

*2. Menus.* The request's option set differs between `menuParity` 0 and 1 at 21.5% of decision points: dawn 2.8%, day
14.7% (the kept picks differ: the joined trip and the impulse picks; a disturbance counted over every animal in view
rather than the eight listed), dusk 100%, night 100%. The live pick is on today's menu at 98.3% of draws and on the
parity menu at 100%.

*3. Activity first* (on the parity menu). Entries per menu: median 6, 90th percentile 8, largest 8, with and without
it. Entries aimed at a chimp per menu: 1.94 without, 1.58 with. Kernel calls per decision at `activityFirst` 2: 1.37
for the packet-reading rules, 1.41 for the null kernel, at most 1.98 (98.4% of menus hold a kind with two or more
options). Agreement of the packet-reading rules with the live rules: 0.981 (0.977 to 0.984) at 1 and at 2, the same
as without it (the rules' pick is the best of its kind unless a belief draw moves it).

*4. Tokens* (the server's estimate; hard limit 1,280):

| packet | n | median | 90th percentile | largest |
| --- | --- | --- | --- | --- |
| today's (`observeState` 0) | 9,519 | 406 | 514 | 612 |
| M1's rendering of the same context (wording 1, numbers) | 9,519 | 558 | 672 | 776 |
| v4 (A on) | 9,519 | 572 | 685 | 807 |
| v4 with `menuParity` (A and B) | 9,771 | 579 | 694 | 852 |
| v4 with `activityFirst` 1 (A and C) | 9,519 | 585 | 716 | 853 |
| v4 with both (A, B and C) | 9,771 | 589 | 718 | 853 |

*5. Ablation, with the kernels R2 may run.* Share of draws where the packet-reading rules' pick (belief sampled, hash
draws) changes without the group, and the v4 tokens the group costs at the median: energy 0% (80 tokens), gut 0% (7),
sleep and phase 0% (30), arousal and slow states 0% (2), water and heat 0% (9), the belief behind an option 2.6% (2.2
to 3.0; 37 tokens). The zeros are by construction (this kernel reads the published value, not the state), so **the
plan's third criterion, which fields change a kernel's choices, is open for a model kernel**: `withoutGroup` and the
probe renderings are delivered, the model run is the integrator's.

**What the v4 packet still lacks** (from a read of `computeCandidates` and its helpers, `src/sim/candidates.ts`).

For the choice step: the draw (`world.rng`); the food term at a sampled crop beyond the two carried points; the
intention and what closed it (the loop's gate, R1 D1; the packet shows only the current act); below `rgMinAge` the
argmax over the full list; under `choiceBelief` 1 the jitter-free value (the request carries the published score).

For the valuation, read live and carried by no packet field:
- *where*: the territory cost of each place (use levels, the grid, neighbours' pressure) and the distance from the
  range centre beyond the boolean "at the territory edge"; a female's core area (`coreX`, `coreZ`); the habitat-wide
  fruit index; the fig-mast tree; the fallback (leaf) stock around the animal; the light on the way and on arrival;
- *food memory*: the crops believed for remembered and listed crowns that are not on the menu, the revisit history
  (`fedTree`, `fedAt`), the community's list of known trees, the trip-yield experience, the stake of a race for a crop;
- *timing of social acts*: last aggression, call, display, mating, greeting, grooming received, consolation and
  reconciliation (the quotas and gaps of `socialTiming`, `aggressionGaps`, `callGaps`), newcomers to greet, the travel
  hoo and the call heard (who, where, when, whether at food), a failed departure and its audience;
- *impulses raised by perception*: hunt, patrol, escalation, gang attack, infanticide, rain display, transfer;
- *power*: own and others' strength, Elo, continuous rank, allies and supporters in view, the rival, stranger males
  counted (the packet shows rank order, bond and tension per individual, and the odds only against an aggressor);
- *valuations of rare acts*: the hunt's rate (prey group, hunters), a patrol's lead and join value, paternity gain,
  the pant-hoot's value, the endocrine scores behind escalation and redirection (the states are shown, the scores not),
  milk on offer for a nursing bout, the weaning state;
- *world state the animal is held to know*: instability after an alpha change, an ongoing patrol or hunt, illness.
The published `score` is the sum of all of it, plus the evaluation jitter.

**For the integrator after the UI merge (final text).** The main checkout's `AGENTS.md` now names
`src/providers/packet.ts` as "the one packet-text builder" (re-exported by `server/decide.ts`); the changes below go
wherever these functions live after the merge.
1. `buildStateQuestion(ctx, opts)`: `const v4 = ctx.packet === 4, w = opts.wording ?? (v4 ? 2 : 1);` then
   `state.body = v4 ? bodyWordsV4(ctx.body) : bodyWords(ctx.body)` (import both v4 functions from
   `src/kernel/packet-words.ts`).
2. `stateOptionParts(ctx, c, wording)`: `values: c.value ? (ctx.packet === 4 ? valueWordsV4(c.value, c.reason, social,
   c.action) : valueWords(c.value, c.reason, social)) : ''`.
3. `withoutState(ctx)`: also drop `packet` (`const { body: _b, light: _l, packet: _p, ...rest } = ctx`).
4. Then `scripts/lib/packet-v4.ts` `buildV4Question` reduces to `buildLocalQuestion(ctx)`; a test should assert the two
   equal on `tests/r2-packet.test.ts`'s worlds before the composer is removed. Until then a harness gets the v4 text
   with `glinerKernel(scorer, adapter, { packet: r => buildV4Question(r.context) })` (`scripts/lib/kernels.ts`, which
   already takes a packet builder).
5. Jev's state packet (optional): `hind_fill`, `chance_in_fruit`, `crop_uncertainty`, `win_odds` as named fields.
6. `src/decision.ts`: nothing for A, B and `activityFirst` 1 (`buildRequest` is re-exported and its entries are concrete
   options). For `activityFirst` 2 the app's loop must, after a valid first answer with index *i*, send
   `targetRequest(request, i)` (`src/sim/request.ts`) when it is not null and apply the second answer, counting two
   calls in the trace (as `src/kernel/loop.ts` `answerWaiting` does). Until then the app supports 0 and 1.
7. `AGENTS.md`'s kernel-contract row was not edited here (it is changing in the UI merge): add `observeV4`,
   `menuParity`, `activityFirst` and `kernelSim` 2 to its list of switches.

**Not done** (beyond §7): the model's response to the v4 wording and the model-side ablation; a run of `kernelSim` 2
or of any kernel on the working base beyond the tests (R1b and R5 are the integrator's); the bench
(`scripts/bench-sim.ts`): `rgMenu` now returns through one more small object per draw, argued negligible, not measured.

## 9. Open questions for the user

1. **Should a learned engine be shown the rules' valuation of each option?** Today no text shows it. Shown, a small
   engine could reach about 98% agreement by reading it, and the code would still be deciding (against "correct where
   we still rely on code"). Hidden, the engine must learn the valuation from the state, and the packet lacks most of
   what decides between two food options (the shown rate picks the rules' one 55% of the time against 49% by chance).
   The middle path is to show more of the listed inputs as state (the cost of a place, the revisit history, the
   company a trip leaves), each as a belief the animal can hold, never the sum.
2. **The direction of the one menu.** With `menuParity` every kernel follows the rules' menu, so on the working base a
   model kernel gets the open menu at night (M3: untuned GLiNER left the nest 80% of the night under wording 1, 3%
   under wording 2). The other direction (the rules take the night and dusk menus) changes the base and was not built.
3. **`activityFirst` 1 or 2 for the comparisons.** 1 costs nothing and the target is the rules' best (code decides the
   partner); 2 lets the engine choose the partner at about 1.4 calls per decision.
