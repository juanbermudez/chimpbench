# Stage R7, second half: the "who decided" ledger

Branch `r7-ledger`, cut from `track-e` at dea2643. Written on 10 October 2026, before any run. No model, no training,
no new simulation mechanism, no new parameter.

## 1. Why

The user wants behaviour to leave hand-written code. Today nobody can say what share of a chimpanzee's day the model
actually set. The review of 10 October found that the kernel picks the kind of act from a menu the rules built, never a
tree and never a duration (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/attack-hidden_hand_coding_and_rules.md`,
sections "The who decided ledger" and "Truthful names"). Its figures were estimates from existing tables. This stage
measures them, with a script, so every later claim has a baseline and a denominator.

Four things are built:

1. **Part A, the receipt ledger** (`scripts/r7-ledger.ts receipts`): from the saved receipts of the model arms, with
   no simulation, three credits for every act: who set its kind, its target and its ending.
2. **Part B, the shadow tap** (`scripts/r7-ledger.ts tap`): a short rules run of the working base in which every
   decision point is read with the simulation's own pure functions: the options before and after each cut of the menu,
   the targets that were possible against those that reached the menu, and why the animal was asked.
3. **The valuation ledger** (`scripts/valuation-ledger.ts`): a count, from the source text, of the hand-set numbers and
   conditions that value behaviour, beside the prescription ledger (which leaves score literals out by its own text).
4. **The numbers** (`docs/staging/r7-ledger-numbers.md`), written by `scripts/r7-ledger.ts report` from the three JSON
   files. Nothing in it is typed.

## 2. The five deciders

Each credit goes to exactly one of these.

| Decider | Credited only when |
|---|---|
| **The model, from a real choice** | the kernel was a model, its answer was applied, and the menu held at least two options at that level. The adapter and its teacher are named. Every saved adapter was taught on the rules' own decisions, so the name is "rules-taught"; the untuned model has no teacher. |
| **A held intention** | the loop's gate kept the act, or began feeding at the end of a trip, without asking. |
| **The body or the world** | the act stopped being possible or was over: the crop was gone, the animal arrived, the partner left, it fell asleep or woke. |
| **A hand-set number**, named | a constant in code decided: a gate threshold, a clock period, the 30 minute limit, a bout range, a slot cap. |
| **The rules directly** | a fallback (fewer than two options, an invalid request, a kernel error or timeout, a stale answer), an animal under 8, or an act begun before the window. |

A control arm (the rules' top option sent through the loop, or a random draw) is never "the model": its credits are
reported in a separate table under its own name.

## 3. Part A: what the receipts say

**Inputs.** The receipt logs (`<arm>.receipts.jsonl`) and arm files (`<arm>.json`) under
`.claude/worktrees/r5-pilot/artifacts/r5/pilot/s48` and `s7` (training seeds, five focal animals each, five days) and
`.claude/worktrees/r4b-retrain/artifacts/r4b/loop/standard/s21`, `s5` and `lean/s21` (seeds no adapter saw). They are
read only. Replays and the smoke directory are not used. A receipt is one pass of the loop for one focal animal: the
time, the animal, its decision version, the menu (act and target of each option, and each option's family), who chose
(`kernel` or `rules`, with the reason), and the position applied.

**Units.**
- *Interval*: from one receipt of an animal to its next receipt, or to the end of the window. The time before an
  animal's first receipt is an interval of its own, credited to the rules (the act was begun before the window).
- *Applied option*: the option the kernel picked, or, when the rules decided, the rules' own pick on the menu
  (`rulesIndex`); unknown when that pick is not on the menu.
- *Kind*: the option's family, as the receipt holds it (`fam`: feed, food-trip, drink, rest, nest, social-move,
  travel-home, affiliative, greet, aggression, mating, care, call, other; `scripts/em-sample.ts` `familyOf`).
- *Act*: a run of an animal's consecutive receipts with the same applied act and target. A receipt that picks the same
  option again continues the act.
- *Waking minutes*: minutes in intervals whose applied act is not `nest`. The receipts do not record sleep, so
  building a nest and lying awake in it count as nest time. This is stated beside the number.

**Kind credit, by minutes.** An interval opened by a receipt is credited:
- to the model from a real choice, if the kernel's answer was applied and the menu held at least two families;
- to the rules directly, if the menu held one family (no choice of kind), if the rules decided (the reason is kept),
  or if it is the time before the first receipt.

With the gate off every decision point is a receipt, so this is exact. With the gate on, the gate keeps acts between
receipts without logging when. The decision version tells how many hidden events an interval holds (the version rises
by one for the applied answer and by one for each act the gate kept or began, and for each interrupt that reached a
waiting animal). So for a gate arm the minutes under a fresh choice are **bracketed**: at least the intervals with no
hidden event, at most all intervals the model opened. The exact split over the whole 24 hours is taken from the arm
file's own counters (`own.model`, `own.held`, `own.rules`, stage R5-gate) and shown beside the bracket. The receipts
cannot place the boundary inside an interval; no bout length is reconstructed from the code to guess it.

**Target credit, by act.** Judged at the receipt that starts the act:
- *no target*: the act has none (rest, feeding where it stands, a display, a call);
- the model from a real choice, if the kernel's answer was applied and the menu held at least two options of the
  picked family with different targets;
- a hand-set number, the slot cap, if the picked option was the only one of its family with a target: the target was
  fixed before the model saw the menu, by the rules' score under "one place per action" and the slot caps upstream.
  The receipts do not hold the options before the cut, so they cannot say whether a second legal target existed;
  Part B measures that in a rules world;
- the rules directly, if the rules decided.

Reported over all acts, over acts that have a target, and by class of target (tree, water, partner).

**Ending credit, by act.** Judged at the receipt that starts the next, different act:
- *left by its own choice, at a moment the loop set*: the kernel's answer was applied, the act's own option was still
  on that menu, and the kernel picked another;
- *not on offer when it was asked*: the act's option was not on that menu. The body or the world ended it, or a cut
  of the menu dropped it; the receipts cannot tell which;
- the rules directly, if the rules decided;
- acts still running at the end of the window are not counted.

No ending is credited to the model outright. The kernel is never asked how long to act or whether to stop: the request
holds no such question (`src/kernel/types.ts`) and a receipt holds no duration. The moment of every ask is set by the
loop: a bout range, a gate trigger or a perceived event. The receipts do not say which, so the first line above is an
upper bound on "its own" and is reported as one.

**The four lines** (per arm, the model arms first):
1. share of waking minutes whose kind the model picked from a real choice;
2. share of acts whose target it picked;
3. share of endings that were its own (an upper bound, with the moment set by the loop in every case);
4. the hand-set numbers still read on its path, each with its name and value, read from the resolved parameters of the
   run and from the source (the gate's thresholds and clock hours, the 30 minute limit, the bout ranges, the slot caps
   and the menu's cap).

Intervals are over focal animals pooled; the per-animal spread is in the JSON. No interval or test of significance is
attached: these are accounts of what happened in saved runs, not comparisons.

**What the receipts lack** is listed in the result, with the fields the population night must log (section 8).

## 4. Part B: the shadow tap

**The run.** The working base (`docs/staging/integrator-kit/params/M6-W50.json`) with `observeV4` 1 and `menuParity` 1,
as the saved arms had (neither is read while the rules decide), field map, development seeds 48 and 7, one simulation
at a time. Thirty days of burn-in, then five tapped days: the window of the R5 pilot on the same seeds. Every animal is
on the rules. Each world is run a second time with no tap and the end hashes are compared (`--check`).

**What is read at each decision point**, through `rulesTap` (the animal's state is still the one its options were
scored with), `rgTap` (the gate's verdict) and one new tap, `offerTap` (section 6):

- *The trigger at the level of the tick*: the act finished early (the body or the world); an interrupt was registered
  within the last tick (a perceived event); the scheduled end of the bout was reached (a hand-set bout range, or the
  walk of a committed trip); or the bout was cut short by waking or returning light.
- *The gate's verdict* for animals aged 8 and over: kept, arrived, or the reason for asking again: an interrupt, a
  hunt or patrol impulse, returning light in the nest (perceived events); a need crossing a threshold (need bucket);
  a change of clock period; the 30 minute limit; the patch ratio; the act ended; no intention yet. This is the trigger
  of the ask a model with the gate on would get, measured on the rules' own acts.
- *The options before and after each cut*, in order:
  1. hand-written conditions: what reaches `offer()` at all;
  2. the score threshold (an offer at −0.4 or below is dropped);
  3. the slot caps (three targets for feeding, two for the multi-target acts, one otherwise; one of its own for a
     joined trip), the pool of 48, and for trips the shortlist of four remembered or listed trees taken before
     `offer()`;
  4. the 8-animal perceived list;
  5. the night and dusk menus (not applied on the working base; counted to show it);
  6. the cap of 8 with one place per action.
  For each cut: how many options it removed and of which kind.
- *Targets by possibility against targets on the menu*: trees in view, trees remembered, trees on the community's
  list, waters remembered and animals in view, against the distinct trees, waters and partners that are offered, pass
  the threshold, survive the slot caps, survive the perceived list and reach the menu.

**"By possibility" is the ledger's own definition**, a design assumption of this script and not of the simulation:
what the body could act on with what is in view or remembered. One entry for each tree in view, each remembered or
listed tree out of view, each remembered water and each animal in view, plus the acts without a target that were
offered. It is deliberately counted by target, not by act and target: a partner is one entry, though a dozen social
acts may name it. The width of the menu "by possibility" is this count. It decides whether choosing a tree needs
sub-menus: a kernel built for 8 options needs fan-out above 8.

**Who is read.** Every living animal; tables are given for animals aged 8 and over (those a kernel would decide for)
and the share of decision points made by animals under 8 is reported.

## 5. The valuation ledger

`scripts/valuation-ledger.ts` reads `src/sim/candidates.ts` and `src/decide/*.ts` as text (TypeScript 7 ships no
parser a script can call, so the scan is lexical: comments, strings and template text are removed first). It writes
JSON and a section of the numbers file. Every item is listed with file and line.

- **Offer sites by action**: every call `offer('<action>', …)`; calls with a computed action are listed apart.
- **Inline score literals**: every number written in the code of `candidates.ts`, after leaving out the two id tables
  (`V`, `CODE`), bare 0, 1, 2 and −1, array positions, loop headers and hash salts. Each is placed in one context: inside
  an `offer()` call; on a line that assigns a name used in an `offer()` call (followed through names assigned from
  it); or elsewhere. The first two together are the "inline score literals".
- **Terms that state a field conclusion directly**: a conditional score term or a condition in front of an offer that
  is switched by who the animal or its partner is: sex, rank or dominance, kinship, alliance, reproductive state,
  community membership, age class. The rule is lexical and its word list is in `scripts/lib/valuation.ts`. It is a
  different, reproducible quantity from the review's reading of "about 40"; both are stated.
- **Clock and bucket constants**: comparisons with the hour of day and with elapsed time in `candidates.ts`; the need
  thresholds, the clock periods and the gate's constants in `src/decide`.
- **Registry parameters read** by `candidates.ts` (`P.<id>`), classed by the prescription ledger's own rules.

The review's hand count (about 254 literals, 94 offer sites, about 40 conclusion terms) is not copied. Where this
count differs, the difference and its reason are stated.

## 6. One change under `src/sim`: a read-only tap

The score threshold, the slot caps and the trip shortlist act inside `computeCandidates`, before the legal list
exists, so no script can see them from outside. `src/sim/candidates.ts` gains `offerTap`, beside the existing
`quotaTrace`: an object whose two functions are null in every simulation. When a script sets them, `offer()` reports
each call and what became of it, and the trip code reports the size of its pool before the shortlist. It reads only:
no draw, no write. It is a flag that is off by default; it is not a world parameter, so no registry entry, no saved
state and no hash input changes.

Proof that nothing moves: the compressed goldens and the field pin pass unchanged; a test runs the same world with
the tap set and unset and compares the hashes; the run script's `--check` does the same on the field worlds.

## 7. Tests (`tests/r7-ledger.test.ts`, `tests/valuation-ledger.test.ts`)

One test per ledger rule on a small hand-built receipt log: kind credit (a real choice, one family, a fallback, the
time before the first receipt), the gate bracket from decision versions, target credit (no target, a real choice, the
slot cap, the rules), ending credit (left by choice, not on offer, the rules, still running), waking minutes, the four
lines. On a built world: the tap changes no hash; every option removed is assigned to exactly one cut and the options
left after the cuts are the legal list and then the menu; the possible targets contain the offered ones; triggers
are exhaustive. For the valuation ledger: each counting rule on a small source text, and the real files give stable,
non-empty counts.

## 8. Hard rules

Field numbers are targets, never inputs; nothing here is tuned, and nothing is fitted to the rules' rates. Seeds 48
and 7 only for the tap. No model process. One simulation at a time. Runs start from a committed head. Raw receipts and
JSON stay under `artifacts/` (not committed); the numbers file is generated from them.

## 9. Amendments (10 October 2026, each made after the output named and before the next run)

1. **The gate bracket is closed with the run's own counters** (after the first receipts output; no simulation had run).
   The receipts alone bracket the fresh choice of a gate arm very widely, because the nest holds many kept acts. The
   run's counters give the minutes under a fresh choice over the whole 24 hours; taking away the nest minutes the
   receipts bracket leaves the waking ones. Both brackets are printed. The two accounts of minutes agree to within one
   tick per animal with the gate off. With the gate on the counters hold 1 to 44 minutes more over a whole arm, minutes
   this ledger counts as "before the first receipt": consistent with the gate keeping an intention the rules left before
   the window (not checked by a run).
2. **An act without a target is "no target" whoever chose it** (it was "the rules" when the rules decided), so the
   share "of acts that have a target" has a clean denominator.
3. **An ended act the receipts cannot name** (the rules decided and their pick was not on the menu: the arms with the
   rules' pick removed) is counted apart, not as ended by the rules.
4. **The ledger reads two things the saved logs do not hold**, so that a later run's log is usable at once: a line for
   each act the gate kept or began (`by: 'gate'`), and the trigger of each ask (`why`). With them the bracket closes,
   a trip that became feeding is credited to the held intention and its ending to arrival, and the endings the model
   chose are split by the trigger of the ask. A test states each on a hand-built log.
5. **Three readouts were added to the tap after its first run**: the menu's width without the community's list of
   trees, how many options of each family the menu holds, and the kernel calls one question over the trees of a trip
   would take with the fan-out wrapper that exists (`src/kernel/fanout.ts` `fanCalls`). An option that is both a trip
   of its own and a joined trip to one tree is now labelled by the offer that won its slot. Both worlds were run again
   after each change: the same end hashes and the same counts of decision points every time.
6. **"Most of the day"** in the plan's rule for the unqualified name "model-driven" is read by the report as more than
   half on each line. The reading is this script's, not the user's.
7. **The valuation ledger's classing rules were adjusted while reading its own output on the real file**, for items it
   had misclassed (a community id used as a table index, a conditional that returns an animal, numbers that test a
   registry switch). These are judgement calls about classing; nothing was adjusted toward a count.

## 10. What was run

- **Part A**, no simulation: 24 arm-and-set combinations found (15 with a model, 9 controls), 103,965 receipts.
- **Part B**: seeds 48 and 7, 30 days of burn-in and 5 tapped days each, one simulation at a time, from a clean tree.
  The numbers are those of the run at commit 65e0a5c; two earlier runs (at 2d98cb1 and 65efc15, before the readouts of
  amendment 5) ended on the same hashes with the same counts. About 65 to 95 s a seed, the untapped check run
  included. End hashes `10d4ef4232f7486d` (seed 48) and `50678685a0fdba6c` (seed 7), each equal to its untapped world's.
- **Valuation ledger**: source text only.
- **Checks**: `tests/r7-ledger.test.ts` (13 tests), `tests/valuation-ledger.test.ts` (7), and unchanged
  `tests/sim-params.test.ts` (the goldens), `tests/kernel.test.ts` (the goldens again), `tests/sim-track-e.test.ts` (the
  field pin), `tests/sim-rg.test.ts`, `tests/prescription-ledger.test.ts`, `tests/r5-pilot.test.ts`; `tsc --noEmit`;
  `gen-params --check` (no parameter was added). The whole suite and the build were not run (the integrator's).

## 11. Results in plain words (every figure is copied from `docs/staging/r7-ledger-numbers.md`)

**The four lines today**, for the first adapter with the gate on, on the two seeds no adapter saw (ten animals, five
days). Its name: rules-taught model on a rules menu.

1. *Kind.* The model picked the kind of act, from a real choice, for 34.8% to 63.0% of waking minutes. Counting the
   minutes the gate then held without asking, 99.9% of waking minutes were in a kind the model had picked. Over the
   whole 24 hours: 58.3% under a fresh choice, 41.5% held by the gate, 0.2% the rules. With the gate off the same
   adapter is asked at every decision point and the figure is 99.6%.
2. *Target.* It picked the target of 7.6% of acts (114 of 1,494), or 10.5% of the acts that have a target. By class:
   6 of 698 acts aimed at a tree, 98 of 271 aimed at a partner. Every other target was fixed before it saw the menu.
3. *Ending.* None was its own: no question about stopping exists. At most 46.4% of endings were its choice to leave an
   act that was still on offer at a moment the loop chose; 53.2% ended with the act no longer on offer.
4. *Hand-set numbers on its path:* seventeen named entries, from the bout ranges and the gate's thresholds to the
   slot caps and the cap of 8, each with its value and place in the numbers file.

So the review's estimate ("kind about 60% of the day, target near 0 for trees, endings 0") holds in outline and is now
measured. Two things to add to it: the 60% is the gate's doing, not the menu's (with the gate off it is 99.6%); and
its 15.5% counted menus with two grooming partners, while by family (grooming, play, making up) two different
partners stand on the menu at 31.1% of decision points in the rules world.

**Why an animal is asked** (the rules world, 46,118 decision points). Animals under 8 make 26.8% of all decision
points; no kernel would be asked for them. For the others: 88.8 decision points per animal and day, and the gate asks
again at 64.0% of them (56.9 asks a day). Of those asks, 44.9% follow something perceived, 32.0% a hand-set number
(a need threshold, the 30 minute limit, the clock period) and 23.1% the end of the act. With the gate off, half of all
asks (51.1%) come at the scheduled end of a bout, which is a hashed length inside a hand-set range.

**The cuts.** On average 11.59 options reach `offer()`, 8.26 are left on the legal list and 5.79 on the menu. The slot
caps remove the most (3.144 options per decision point, two thirds of them trips to food trees and a fifth waters),
then "one place per action" (2.231, half feeding trees and half trips). The cap of 8 itself removes 0.239 and the
8-animal list next to nothing. So the menu is narrow because of the slot caps and the one-place rule, not because of
its cap of 8.

**Targets.** A tree to feed in: 1.18 in view, 0.59 on the menu, never two. A tree to travel to: 36.2 remembered and
36.7 on the community's list, 50.8 pass the trip conditions, 3.92 reach `offer()` (the shortlist of four), 1.82 survive
the slot cap and 0.74 reach the menu, never two. Waters: 7.53 remembered, 0.09 on the menu. Partners: 3.00 in view,
1.37 on the menu. The menu holds exactly one option to feed at 99.7% of decision points.

**How wide "by possibility".** 87.3 entries on average, or 50.5 without the community's list of trees. The trees a
trip could go to number 50.8 on average and exceed 24 at 95.1% of decision points. **Choosing a tree to travel to
needs sub-menus or a sample**: one question over those trees would take 7.8 kernel calls with the existing fan-out
wrapper (9.7 keeping two per group). Choosing among trees in view does not: there are at most four.

**How much is still hand-coded** (the valuation ledger): 94 offer sites over 29 actions; 457 inline score literals on
179 lines (372 weights, 45 thresholds on a state, 40 on age); 78 more thresholds in the conditions in front of
offers; 123 terms switched by who the animal is (85 when age alone is set aside); 30 clock constants; 59 numbers in
`src/decide`; 252 registry parameters read by the valuation, 238 of them not zero on the working base. Against the
review's hand count (about 254 literals, 94 offer sites, about 40 conclusion terms): the offer sites agree exactly. The
literal count is larger because this rule follows every name that reaches an offer (263 of the 457), counts whole
numbers above 1 and counts age thresholds; inside the offer calls alone there are 194. The conclusion terms are a
different quantity: the review read for sentences that state a field finding; this counts every score term or offer
condition switched by sex, rank, kinship, alliance, reproductive state, community or age, which over-counts (an age
test is often about the body) and is reproducible.

**Names.** Every saved model arm may be called "rules-taught model on a rules menu" (the three adapters' manifests
name the rules' decisions as their label source) or "untuned model on a rules menu". None may be called
"model-driven": the target and ending lines fail for all of them and the teacher is the rules.

## 12. Limits, and what is not done

- **Ten animals, five days, three windows.** The receipt ledger describes those runs. No interval is attached and
  none is implied; the spread across animals is in the JSON.
- **The fresh-choice figure for a gate arm is a bracket**, 28 points wide for the reference. It cannot be closed
  without a log of the gate's own acts. The training-seed gate arms have no counters at all (they were run before the
  counters existed), so their bracket is the receipts' own.
- **Waking minutes are minutes outside the nest act.** The receipts do not record sleep.
- **"Left with the act still on offer" is an upper bound.** A finished act can stay on the menu with a penalty, and the
  receipts do not say whether it had finished or why the animal was asked.
- **Part B describes the rules' own acts.** A model's acts differ, so its trigger mix will differ; the function that
  asks is the same.
- **The hand-written conditions are seen only through targets**, not as options: an option a condition refuses never
  exists. Counting them as options needs a list of what is possible per act, which is the "possible or advisable"
  table the review asks the user to sign off; it is not attempted here.
- **Two more selections act before `offer()` and are not separated**: the single best dominant to greet, and the one
  nest tree. The nest is reported (11.7 trees in reach, one offered); the greeting is inside "partners in view against
  partners offered".
- **The valuation ledger is lexical.** It follows names, not scopes, so a handful of numbers that only shape geometry
  or rounding are counted as reaching a score; the lines are listed so each can be checked.
- **Not done:** no model was run; no receipt of a population night exists yet, so the fields of section 13 are a
  request, not a result; the swap check the review proposes (a scorecard row a random chooser does not move is not
  credited to the model) is `r7-card`'s; the label shares "wild, outcome, rules" are 100% rules for every saved
  adapter by their manifests and are not tabulated further.

## 13. For the integrator

**Status line for `IMPLEMENTATION_PLAN.md`, Stage R7** (the ledger half; the card half is `r7-card`'s):

> Ledger built on branch `r7-ledger` (10 October 2026; agent-reported, awaiting the integrator's review and merge;
> `docs/staging/r7-ledger.md`, numbers in `docs/staging/r7-ledger-numbers.md`; no model, no parameter, one read-only
> tap). From the saved receipts, for the first adapter with the gate on, on unseen seeds 21 and 5: the model picked
> the kind of act from a real choice for 34.8% to 63.0% of waking minutes (99.9% counting the minutes the gate then
> held; 99.6% with the gate off), the target of 7.6% of acts (6 of 698 aimed at a tree, 98 of 271 at a partner) and no
> ending (at most 46.4% were its choice to leave an act still on offer, at a moment the loop set). In a rules world of
> the working base (seeds 48 and 7, 46,118 decision points, hashes equal to untapped runs): animals under 8 make 26.8%
> of decision points; the gate asks at 64.0% of the others', 44.9% of asks after something perceived, 32.0% after a
> hand-set number, 23.1% at the end of an act; 11.59 options reach `offer()`, 8.26 are legal, 5.79 reach the menu, the
> slot caps and "one place per action" doing the cutting; a trip could go to 50.8 trees on average and the menu shows
> 0.74, so choosing a tree needs sub-menus or a sample (7.8 kernel calls by the existing fan-out). Valuation ledger:
> 94 offer sites, 457 inline score literals, 123 terms switched by who the animal is, 252 registry parameters read.
> Every saved arm is "rules-taught model on a rules menu" or "untuned model on a rules menu"; none is "model-driven".
> Goldens and the field pin unchanged; `tests/r7-ledger.test.ts` 13 tests, `tests/valuation-ledger.test.ts` 7.

**Command lines for `AGENTS.md`** (after the `r5-pilot.ts` line):

```sh
pnpm exec tsx scripts/r7-ledger.ts receipts | tap --seed 48|7 [--check] | report --md docs/staging/r7-ledger-numbers.md   # stage R7 (docs/staging/r7-ledger.md): the "who decided" ledger. receipts: the kind, target and ending credit of every act of the saved model arms, from their receipt logs alone (--sets "name=dir:seeds;…", --adapters for the manifests that name each adapter's teacher); tap: a rules run of the working base read at every decision point (options before and after each cut, targets possible against targets on the menu, the trigger of the ask; seeds 48 and 7 only, refuses a dirty tree, --check compares the end hash with an untapped run; about 90 s a seed); report: the numbers file from the JSON under artifacts/r7/ledger
pnpm exec tsx scripts/valuation-ledger.ts [--count] [--out artifacts/r7/ledger/valuation]   # valuation ledger (stage R7), beside the prescription ledger: offer sites by action, inline score literals, terms switched by who the animal is, clock and bucket constants in src/sim/candidates.ts and src/decide, each with file and line (rules: scripts/lib/valuation.ts; a lexical scan, nothing is run)
```

**A gotcha line for `AGENTS.md`:** `offerTap` (`src/sim/candidates.ts`) is a diagnostic tap like `quotaTrace`, `rgTap`
and `rulesTap`: null in every simulation, set only by scripts, which must clear it in a `finally`.
`scripts/lib/shadow-tap.ts` `cutsAt` is the reader.

**`docs/simulation.md` §17:** no parameter row (none was added). One sentence where the diagnostic taps are listed:
"`offerTap` (stage R7): called at every `offer()` with the option and what became of it, and once per decision with
the size of the trip pool before the shortlist; reads only."

**What the population night must log** (`scripts/r10-night.ts`, branch `r10-night`). The ledger already reads the
first two; the rest need a few lines in `scripts/lib/who-decided.ts` once the names are agreed.

1. `why` on every receipt: the trigger of the ask. With the gate on, the gate's own verdict (`gate()` in
   `src/sim/rg.ts` returns it and `loopGate` in `src/sim/decide.ts` drops it today: `no-intent`, `interrupt`, `hunt`,
   `patrol`, `light`, `need-bucket`, `period`, `max-age`, `ended`, `patch-poor`). With the gate off, the trigger of
   the decision point: `finished`, an interrupt, or the bout's scheduled end (`scripts/lib/shadow-tap.ts` `tickTrigger`
   is the rule).
2. A line for every act the gate keeps or begins without asking: `by: 'gate'`, `refusal: 'kept' | 'arrived'`, the
   time, the animal, its decision version, and the one act as `opts` and `fam`, `picked: 0`. A small tap on `loopGate`
   is the natural place.
3. `cur`: the act in progress when asked (`[action, target]`, its family, minutes in it, and whether it had
   finished), so an ending is credited without inference.
4. `applied`: the act the rules began when they decided (today it is inferred from `rulesIndex` and is unknown when
   the rules' pick is not on the menu).
5. The legal list before the menu's cuts, as `[action, target]` pairs (at most 48), or at least how many legal
   targets of the picked act there were. It separates "only one tree was legal" from "the cap chose".
6. Whether the animal was asleep (`chimp.sim.asl`, and the nest's phase), so waking minutes are exact.
7. The animal's age, or a daily count of the decisions the rules made for animals under 8.
8. In the run's header: the adapter, its hash and its manifest's `label_source`; the decode rule (top pick, draw, held
   draw, and its salt); the gate setting; whether the rules' pick was withheld.

**Likely conflicts.** `src/sim/candidates.ts`: the tap's declaration after `aggrBit`, five edits inside `offer()` and
one line before the trip shortlist. Any branch that edits `offer()` will conflict there; the tap's calls are the only
additions and can be re-applied by hand. `scripts/lib/` gains three files with new names. No shared document was
edited.

**To run at the merge:** `pnpm exec tsx --test tests/r7-ledger.test.ts tests/valuation-ledger.test.ts`, then the suite.
`tsc --noEmit` covers `src/` only; the new scripts were type-checked with the same options by hand.

**To regenerate the numbers:** `scripts/r7-ledger.ts receipts` (seconds; it reads the receipt logs under
`.claude/worktrees/r5-pilot/artifacts` and `.claude/worktrees/r4b-retrain/artifacts` of the main checkout, so those
worktrees, or a copy of their `artifacts`, must still exist), `tap --seed 48 --check` and `tap --seed 7 --check` one
after the other, `scripts/valuation-ledger.ts`, then `report --md docs/staging/r7-ledger-numbers.md`. The JSON is under
`artifacts/r7/ledger` of this worktree and is not committed. The line numbers in the valuation section are those of
`src/sim/candidates.ts` at 65e0a5c and will move with the next edit of that file.

**Decisions that are the user's.**
- Do the minutes the gate holds count toward "the model picks the kind of act for most of the day"? The answer moves
  that line from 35 to 63% to 99.9% for the reference.
- Is "most of the day" more than half on each of the three lines?
- Should a menu "by possibility" include the community's list of trees, which no single animal remembers (36.7 trees
  on average)? It is the same question as the review's open one about what counts as the animal's own knowledge.
- The "possible or advisable" table of the 94 offer sites, which this ledger does not attempt.
