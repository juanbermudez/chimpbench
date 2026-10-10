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

Results, limits and the lines for the shared documents follow below once the runs are in.
