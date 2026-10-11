# Stage R12: the menu by what is possible (a design registration) and the table the user must sign off

Agent r12-menu-design, branch `r12-menu-design` from `track-e` a11c45c. **Design only: no simulation change, no code
under `src/`, no model, no training, no simulation run.** Part A (sections 1 to 3) was registered on 11 October 2026,
03:13 EDT (commit 8e1e8e7), before any condition was classified and before any count by class existed. Part B (the design, sections 4
onward) is written after the table and is a registration of a design, not of a run. A second agent reviewed and
repaired the stage on 11 October 2026 from 03:45 EDT: section 14 says what was re-derived, what was wrong and what is
still open.

Read first: the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/`:
`understand-hand_coded_inventory.md`, `understand-loop_and_packet.md` section 3,
`attack-hidden_hand_coding_and_rules.md` stage 3 and cross-cutting point 2, `design-neuroscience_first.md` principle 2,
`design-primatology_first.md`), `docs/staging/r7-ledger.md` and `r7-ledger-numbers.md`, `docs/staging/r2-prereg.md`
(kinds first), `docs/staging/r9-prereg.md` §10.4 item 2.

## 1. Why

Today the model chooses among at most 8 options that the rules wrote, ranked and cut. It has never chosen a tree
(one feeding option on 99.6% of asks, about 51 trees possible), and an option the rules scored out can never be
picked. The next design step is a menu built from what the animal can physically do with what it sees or remembers,
asked as "what kind of thing next" and then "which one".

Two findings of the review bound that step and are the reason this stage is a design and a table, not a build:

1. The 94 places where the rules offer an option mix physical possibility with behavioural advice: a pant-grunt is
   offered only toward a dominant, a charge at strangers only with at least 3 males and 2 more than theirs, guarding
   a female only from the top two ranks. A sceptic required that the split "possible or advisable" go to the user
   before any of it leaves code.
2. An option that no teacher covers gets no probability from a rules-taught model. Widening the menu removes a hand
   rule only where some teacher exists; elsewhere the rule moves from the code into the labels and nothing is gained.

## 2. Part A: the table (registered before any classification)

### 2.1 What is generated, and from what

`scripts/r12-offer-table.ts` (with `scripts/lib/offer-sites.ts`) reads `src/sim/candidates.ts` as text, on the tokens
of the valuation ledger of stage R7 (`scripts/lib/valuation.ts`). For every call `offer('<action>', …)` it lists:

- the action, the variants the call can pass and its kind of activity (`src/decide/facts.ts` `kindOf`), file and line;
- **the conditions that gate it as written**: each conjunct of every `if` it stands in; the negation of every earlier
  branch it stands behind (`else`); the negation of every `continue` or `return` guard before it in its blocks; the
  loops around it; an operand before a call in a short-circuit chain; and the same for every call of the helper
  function it stands in, followed back to `computeCandidates` (a parameter is shown as the argument that call
  passes). A condition that is a local name is opened to its definition, three levels deep. Where a gate reads a name
  set earlier under conditions (the best dominant to greet, the scratch list of remembered trees), the conditions
  around each place it is set are listed as "where its target comes from";
- the number literals in those conditions and the registry values they read, at their value on the working base.

A negation is written exactly and readably: of `!X`, X; of one comparison, the opposite comparison; of `A || B`, the
negation of each. Nothing else is rewritten. The scan is lexical: it reads no types and follows no value through a
call other than by parameter. Its sites must be the valuation ledger's, same actions and lines, or the script reports
a problem.

**The classes are not computed.** Each condition's class is a reading of the code by this stage's author, kept in
`data/r12-offer-classes.json`, keyed by the condition's text and merged in by the script. Each site's entry holds a
hash of its gating (the action, the variants, the target and the text of every condition, without line numbers). So
when the code moves the table regenerates, and when a site appears, disappears or changes its gating, or a condition
has no class, the script lists it and `--check` exits 1.

### 2.2 The classes, and the rule for each (fixed now)

| Class | A condition is of this class when |
| --- | --- |
| PHYSICAL | the act cannot be done otherwise: the actor or the target does not exist or is dead; the body's state excludes it (a carried infant, an animal in its finished nest, no meat in hand, the same sex for a copulation); the world state the act is about is absent (no rain to shelter from). |
| PERCEPTUAL | the animal does not perceive or remember what the act needs: the loops over the animals in view, the trees in view, its own memories, the calls it heard; a distance that says how near something must be to count as in reach or in earshot (a hand-set radius: counted as a number, not as advice, because the act includes the approach); a memory horizon. The community's list of trees is classed here and flagged: no single animal holds it. |
| SOCIAL FACT | it only says who or what the act is addressed to, and the act has no object without it: a member of its own community, its mother or guardian, the animal that just charged it, the victim of a fight it saw, the animal begging from it, the leader of the patrol under way, the female in oestrus a courtship is about, a stranger for the acts that answer strangers. |
| ADVICE | it says who may do the act, toward whom or when, beyond what identifies it: the actor's sex or age class; the direction of rank; a balance of numbers; a threshold on bond, tension, swelling, hunger, energy, light or the hour; what the partner or the actor is doing at the moment, where the act could still be tried; and the sign or size of the rules' own value of the option used as a gate. Kinship, rank and oestrus read as a fact are social facts; the same fact used to forbid or to permit beyond identifying the object is advice. |
| QUOTA OR TIMER | it compares a time elapsed (since the animal's own last act of a kind, or since an event it perceived) with a number; or it says "once per event"; or it counts repeats. A response window after a perceived event is classed here and marked as a window. |
| DICE | it is true only after a draw from the world's random stream. |
| SWITCH | a registry switch or the diagnostic hook `quotaTrace`: true or false on a whole base, not a state of the animal. Not a behavioural class. |

A condition with parts of several classes takes the class of the part that binds on the working base, in the order
dice, quota, advice, social fact, perceptual, physical, and its note says so.

**Derived by the script, not typed:**

- *Legacy*: every path to the site stands behind a SWITCH condition that is false on the working base
  (`docs/staging/integrator-kit/params/M6-W50.json`, field map). The file names the base fact each switch condition
  equals; the script evaluates the facts from the resolved parameters with the simulation's own switch functions, so a
  legacy claim that stops holding is reported.
- *Young only*: every reachable path holds a condition that cannot be true of an animal aged 8 or over (`rgMinAge` on
  the working base: under it the rules decide and no kernel is asked).
- *What a live site carries*: the classes of its conditions that bind on the base for an animal a kernel decides for.
  Left out: switches, a quota that a switch of the base has taken out, and conditions that hold for every animal aged
  8 or over.

### 2.3 The proposal for each advice, quota and dice condition (the rule, fixed now)

One of three, per condition:

- **rules**: leave the whole act with the rules. For every dice condition, and for an act whose only route is a roll.
  No label source exists for a once-in-a-lifetime act, and an untaught model would set its rate by accident.
- **drop**: remove the gate and let the kernel decide with the fact shown; the packet line that carries the fact is
  named. Proposed only where a teacher other than the rules can cover what the dropped rule opens (a wild choice
  record in hand, one of the three approved downloads once its contents are checked, forked body outcomes if the user
  allows them), or where the rules themselves value every option the rule cut (which tree, which water, which
  partner in view: the rules score each, so a scaffold label exists).
- **keep**: keep as a rule for now, counted as hand-set. Everything else.

And per act, the teacher that could cover it once offered: the rules' own judgment (a scaffold, named as such); the
wild choice records in hand (whom a Ngogo male grooms, stage RW: the only ones); Taï grooming partner choice
(`mielke2018`), Budongo party scans (`ramosFernandez2018`) or Kanyawara female coalition partners (`fox2022`), each
only once downloaded by the user and checked; forked body outcomes, if the user allows them (a ruling deferred on
10 October); or none.

### 2.4 Pass marks (each can fail)

1. The script's offer sites are the valuation ledger's: the same actions at the same lines (94 over 29 actions at
   a11c45c).
2. Every condition of every site has a class, every advice, quota and dice condition a proposal, every dropped one a
   packet line, every site an act in plain words and a teacher; no entry of the file is left without a site.
   `--check` exits 0.
3. Two builds give the same text. `--check` exits 1 on a copy of the source with (a) a new offer site, (b) a changed
   gate of an existing site, and on a base with (c) a switch flipped under a legacy claim.
4. Every number on the first page of `docs/staging/r12-menu-table.md` is computed by the script.

### 2.5 Stated before classifying (expectations, not pass marks)

By reading the code against the resolved switches: 19 sites are legacy (the review read 15), 6 are reached only by
animals under 8, 69 are live. Of the live ones I expect about ten to carry nothing but possibility and more than
fifty to carry advice. The extractor was run on the real file while it was written: it printed conditions and their
count (369 distinct), never a class.

### 2.6 Not done by this part

No simulation is run, so "legacy" is a statement about switches, not a count of offers in a run. A five-minute rules
run with `offerTap` counting offers by action and variant would confirm it; it is left to the integrator
(section "For the integrator").

## 3. Iteration log

At most three iterations of the classification, each logged here before the table is generated from it.

- **Iteration 1** (11 October 2026, 03:13 EDT): the rules of §2.2 and §2.3 as written above. Applied at 03:22 EDT (commit
  c4b9c19): every
  one of the 369 distinct conditions classed in `data/r12-offer-classes.json`, with the ten rulings and the list of what
  stays with the rules written before any count by class was seen. `--check` on it: 0 problems; 69 sites live, 6 young
  only, 19 legacy, as expected in §2.5. Committed before the table was generated. Two things the rules of §2.2 did not
  foresee were settled while classifying, by the rule's own wording and noted in the file: (a) a condition whose
  text is shared by sites where it reads differently gets a reading per site (`over`): the actor's sex on the two sides
  of a mating is physical there and advice elsewhere; the age line of 12 in front of a helper that is called a second
  time for the young is structure at the five sites that both calls reach. (b) Two sites are unreachable on the base
  although no single switch condition in front of them says so (a contradiction between two of their conditions; an
  impulse that is only rolled without a switch); the file names the base fact and the reason (`dead`) and the script
  checks the fact.

## 4. What the table shows

Every figure here is copied from `docs/staging/r12-menu-table.md` (generated; `--check` exits 0 on it).

- **94 offer sites over 29 actions, 369 distinct conditions.** The sites are the valuation ledger's, line for line
  (pass mark 1). Every condition has a class and every site an entry (pass mark 2). The tests of pass mark 3 pass
  (`tests/r12-offer-table.test.ts`, 11 tests): a new site, a changed gate and a site that left the source are each
  reported. For (c): a switch flipped under a claim the file states by a base fact is reported as a problem; a switch
  flipped under a legacy status the script derives changes that status, and `--check` then reports the committed table
  as out of date. Pass mark 4: the first page's numbers are computed; its sentences (the rulings, what stays) are
  the author's and were written before any count by class was seen. *(Review, §14:* as registered, the mark says
  every number. The sentences quote thresholds from the code (3 males and 2 more, the top two ranks, 1.5 hours, the
  ages 8 and 12, eight targets): these are typed, and a test now holds each against the source. One figure is neither
  computed nor checked: "the 25 choices inside execution", the review's own inventory count.*)*
- **19 sites are legacy, 6 are reached only by animals under 8, 69 are live**, as expected in §2.5.
- **Of the 69 live sites, 6 are gated by possibility alone**: staying in its finished nest, resting, feeding in a tree
  in view, feeding on leaves where it stands, alarm-calling at a snake and backing away from one. **Two more add only
  a social fact** (sharing meat or plant food with an animal that is begging from it). **61 carry a hand rule**:
  advice 58, a quota or timer 25, dice 3. I expected about ten and more than fifty.
- Of the 61, five carry no hand rule but the age line of 12 or "not at night" (going along on a companion's trip,
  following a companion, chasing a rival from a guarded female, staying on a consortship, carrying on with a patrol),
  and two carry only a timer: the window of about 2 minutes in which an animal may submit to or flee from the one that
  charged it.
- **123 distinct advice, quota and dice conditions stand in front of live sites** (92 advice, 28 quota or timer, 3
  dice) and hold 117 numbers by the script's count. Proposed: keep 113, drop 6, leave with the rules 4. *(Review,
  §14:* the 117 are 76 number literals, each counted once per condition that carries it, and 41 registry values, five
  of them switches. It is a lexical count, not 117 distinct thresholds.*)*
- **The six conditions proposed for dropping**: a nest only when its own value is above 0.25; shelter only when the
  body is colder than neutral; a drink only when the thirst gauge is above zero; the trip shortlist of the four trees
  the rules value most; grooming only a partner that is settled; one greeting target, the dominant the rules score
  highest. *(Review, §14:* only two of the six can go when the menu is built, the trip shortlist and the one greeting
  target, and for both the teacher is the rules. The three body conditions wait for a ruling the user deferred, and
  "settled" goes only for the pairs a wild record covers. The table now counts this: 2, 3 and 1.*)*

**What this means for the design.** A menu "by what is possible" is honest for the body's kinds of activity (feed
here, go to food, drink, rest, nest) and for the choice of a target (which tree, which water, which partner). For the
52 live sites that stay behind their rules, nothing can be widened without a teacher, and the only teacher is the
rules. So the design below does not claim a possibility menu for the social kinds: they stay gated by the rules that
open them today, every rule counted, and only the choice among what is offered moves to the model.

Not confirmed by a run: that the 19 legacy sites never offer and the 75 others do (§2.6).

## 5. Part B: the menu by what is possible (the design)

Registered 11 October 2026, 03:41 EDT, after the table. **Nothing in sections 5 to 12 is built.** Line numbers are
those of `track-e` at a11c45c.

### 5.1 One switch, three groups

One new switch, `menuPossible` (registry group `decision`, 0 by default in both profiles; its note begins "Stage R12").
At 0 nothing changes. At 1 it changes what a kernel other than the in-simulation rules is asked, for the animals such
a kernel decides for. The rules' own list, valuation, draw and gate are not touched: a world in which every animal is
on the rules must hash the same at 0 and 1.

| Group | Kinds of activity (`src/decide/facts.ts:25-27`) | When the kind is on the first menu | Who picks the target |
| --- | --- | --- | --- |
| A. By possibility | eat_here, go_to_food, rest, nest, drink; groom; escape from a snake | whenever the body and what the animal sees or remembers allow one option of the kind: the conditions the table classes physical, perceptual and social fact. The conditions marked "drop" are gone, under the teacher rule of §10. The few kept conditions of these sites still apply and are counted (no new nest in full daylight; a grooming partner of at least 1 year) | the model, among targets shortlisted by perception (§5.3) |
| B. Behind the rules | keep_with_party, go_home, play, greet_or_appease, make_up, contest, back_ally_or_defend, court, share_food, confront_strangers, avoid_strangers, call, hunt; escape from an animal | exactly when the rules offer at least one option of the kind today, the score threshold included; every rule counted | the model, among the options the rules offer, nearest first, with no cut by the rules' score |
| C. With the rules | emigrate (transfer); the gang attack; the attack on an infant | never on the model's menu | the rules open and decide them |

Every act of an animal under 8 is the rules' (`rgMinAge`, `src/sim/decide.ts:56`), as today.

**How a group C act happens to an animal on the model.** At a decision point, before any kernel is asked
(`src/sim/decide.ts:44-52` for a model-controlled animal, `:56-67` for the in-tick kernels): if the rules' best option
(`list[0]`, the list is sorted by score) is one of the three, the loop starts it with source `rules` and returns. The
dice that open these options set their rate (`src/sim/perception.ts:276-283`, `:329-335`;
`src/sim/reproduction.ts:86-87`), and their scores are fixed and high (1.05 and more, 1.1, 1.2 to 1.3:
`src/sim/candidates.ts:1280`, `:1139`, `:910`), so the argmax takes them as the rules' own draw nearly always does. No
draw is consumed. The ledger credits the act to "the rules directly". If the rules' best is anything else, the three
options are removed and the kernel is asked.

### 5.2 The first call: what kind of thing next

At most 8 entries (`MAX_OPTIONS`, `src/sim/context-check.ts:34`), shown in a fixed order: "Carry on" first when it is
offered (§8), then the kinds in the order of the `Kind` type. An entry is a kind's fixed label and nothing else: no
target, no count, no belief word. The labels (wording, counted as hand-set text, 21 strings):

Feed here; Go to food elsewhere; Go and drink; Rest; Nest; Groom someone; Play; Go along with a companion; Head back
into my range; Greet or appease; Make up; Display or charge; Back an ally or defend; Court or mate; Beg or share food;
Face the strangers; Move away from the strangers; Pant-hoot; Hunt; Get away; Nurse.

While an act of a kind is in progress, that kind's own entry means "a different one" (Feed on something else here;
Go to food somewhere else; Groom someone else; and so on) and is offered only if another target is possible. So the
hand-set text of the first call is more than the 21 strings: "Carry on" and one "a different one" form for each kind
that takes a target are text the model reads too, and none of them is written yet. Each is to be counted.

**More than 8 entries.** Kinds first on the rules' menu gave a median of 6 entries and 8 at the 90th percentile
(`docs/staging/r2-prereg.md`, result 3). When the possibility menu holds more than 8, the entries go through the
existing fan-out wrapper (`src/kernel/fanout.ts`, sub-menus of 8 dealt by a stateless hash, never by score), which
costs extra calls. Build step 1 counts how often. If it is more than one ask in ten, the cap for kind entries is
raised instead (they are two to five words each) and the fan-out is not used.

**What replaces what.** `kindMenu` (`src/sim/menu.ts:72-86`) ranks the options by rules score, makes the rules' best
option of each kind its entry and admits kinds in the order of that score: under the switch a new builder takes its
place (`src/sim/possible.ts`, new) that never reads a score. `boundedCandidates` (`menu.ts:36-52`, the cap of 8 with
one place per action) and the kept picks of `rgMenuParts` (`src/sim/rg.ts:168-180`: the rules' argmax, the disturbance
response, the joined trip, the hunt and patrol leads) are not used on this path: nothing is "kept" because nothing is
cut by score. The request is built by a third branch of `buildRequest` (`src/sim/request.ts:52-54`) beside
`buildRequestR2` (`:77-97`).

### 5.3 The second call: which one

Made when the chosen kind has two or more possible targets; otherwise the kind's one option is the choice. At most 8
options, nearest first (the order packet 5 already uses for the animals nearby), each a target with the animal's
belief words. `targetRequest` (`src/sim/request.ts:104-109`) orders by action and target id today and keeps the
group's order under the switch; `secondRequest` (`src/sim/decide.ts:203-208`) is taken when `menuPossible` is 1 as it
is for `activityFirst` 2.

**The shortlist rule.** No step reads the rules' score, a believed crop, a rate or a bond.

| Kind | What is possible | The shortlist | Hand-set numbers (each to be counted) |
| --- | --- | --- | --- |
| eat_here | every fruit tree in view (`x.trees`, at most 4 seen in the R7 tap); leaves and pith where it stands | the trees in view nearest first, up to 4; then leaves | 4 |
| go_to_food | its own remembered trees out of view, seen within the memory horizon and beyond the minimum trip distance (`candidates.ts:563-567`); the goal trees of companions in view who are on a trip (`:812-818`) | (a) the crown it last fed in, if it is such a tree (the last entry of packet 5's record of crowns fed in, `chimp.sim.own`, stage R8): 1; (b) the goal trees of up to 2 travelling companions, nearest companion first; (c) a stratified random sample of the rest: one tree from each of four distance bands, then one more from each band in turn, nearest band first, until 8 are listed. Inside a band the order is a stateless hash of the animal, the tree and the time its current act began, so the sample is the same at every ask during one act and new for the next | 1; 2; band edges 150 m, 400 m and 1,000 m; 8 |
| drink | every remembered water (7.5 on average) | the nearest; then up to 3 of the others by the same hash | 4 |
| groom, play, greet_or_appease, keep_with_party and the other kinds aimed at an animal | every animal the kind's conditions allow | nearest first, up to 8 | 8 |
| nest | stay in the finished nest, or build | no second call; the tree to build in stays the formula's (`chooseNestTree`, `candidates.ts:255-268`) | – |

Kept, and counted as numbers that already exist: the memory horizon (`memTravelHorizonH`, 240 h), the minimum trip
distance (`memoryTreeMinM`, 35 m) and the reach radius of each social act (45 m to groom, 30 m to play, 20 m to greet,
50 m for the party link; the table lists each).

Three notes on the rule.

- *A companion's goal tree is a target of "go to food"*, labelled with the companion ("With Ugazi: …"). Today
  `kindOf` puts the joined trip under keep_with_party (`facts.ts:33`). Under the switch the new builder puts it under
  go_to_food, because the animal's question is which tree; following a companion that has no tree as its goal, and
  going toward a call, stay under keep_with_party. `kindOf` itself is not changed.
- *No "nearest remembered tree" slot.* A slot that always holds the nearest tree would build the share of trips to the
  nearest tree into the menu (the review's objection to a hand-picked shortlist). The nearest band contributes one
  tree at random like the others.
- *The community's list of trees is not sampled* (ruling 3 of the table). Today an animal of 10 or more is also
  offered trees no animal has itself seen (`candidates.ts:591-606`). Build step 1 counts how often the rules travel to
  such a tree.

**The animals listed in the packet.** `observe()` keeps the 8 perceived animals whose options the rules score highest
(`src/sim/observe.ts:59-64`; `src/sim/rg.ts:73-82`). Under the switch the list is the 8 nearest in view, plus its
mother or its dependent young when perceivable. Membership then no longer follows a ranking by the rules.

### 5.4 What is legal

Today a kernel's answer is applied only if the option is on the animal's legal list, and that list is the rules'
(`applyDecision`, `decide.ts:121-125`); an act that is off the list at the next decision point is set aside
(`decide.ts:49`) and the loop's gate reads the same list (`decide.ts:160-169`, `rg.ts:225-258`). An option the rules
cut (a fifth tree, a second water) would be refused or dropped. So under the switch the legal list of an animal a
kernel decides for is the wide list: `computeCandidates` run with a module flag, false in every rules path, which is
read at exactly these places.

| Where (`src/sim/candidates.ts`) | Today | With the flag |
| --- | --- | --- |
| `offer()`, line 155 | an option at a score of −0.4 or below is dropped | not dropped for forage, an own trip to a tree, drink, rest, nest, shelter and groom; dropped as today for every other action |
| `offer()`, line 156 (the patrol's silence, `patrolSilence`, on in the working base) | an animal on a silent patrol is offered no call and no display | unchanged: a hand rule on every call and display site that the table does not count per site (it sits inside `offer()`); kept and counted |
| `offer()`, lines 168-187 (the slot caps; `slotsForage`, `slotsMulti`) and line 144 (a pool of 48) | 3 targets for feeding, 2 for the multi-target acts, 1 otherwise | no cap; a pool of its own, large enough (160: the R7 tap saw at most 67 trees pass the trip conditions and 16 animals in view; an offer refused because the pool is full must fail a test, since the pool fills in the order of the code) |
| lines 610-630 (route chaining; the four trees with the highest value) | 4 trees reach `offer()` | every remembered tree that passed the trip conditions reaches `offer()`; the community's list (`:591-606`) is skipped |
| lines 833-845 and 852 (the best dominant) | one greeting target | every dominant the conditions allow is offered |
| line 759 (`settled`) | a partner that is resting, grooming, sheltering or nursing | any partner in reach, where a wild record covers the pair (§10); otherwise as today |
| lines 273, 403 and 575 (the nest's value above 0.25; colder than neutral; thirst above zero) | gates | gone only under a second switch, `menuBody` (0 by default), for when a teacher of the body's acts is allowed (§10) |

The rules' fallback for the same animal (`resolveByRules`, `decide.ts:135-143`, through `rulesChoice`,
`candidates.ts:1691-1699`) keeps the rules' own list, so a fallback can never start an act the rules would not offer.
Execution is not changed: an act started from the wide list is a `forage`, `travel`, `drink`, `groom` or `pant-grunt`
with a target, as today. Build step 1 tests that each runs to its end.

## 6. The two short calls: tokens, time, calls a day

Estimates. **No model was run and no real token was counted: the model's interpreter could not be started tonight.**
Tokens are the project's `estimateInputTokens` (`src/providers/packet.ts:379-387`) applied to packet text, scaled by
the one real count the example carries. Seconds are 0.443 × (tokens ÷ 467)^1.5, which gives 0.35 s at 396 tokens
(measured 0.34), 0.36 at 407 (0.339) and 0.55 at 541 (0.54). The table is generated:
`docs/staging/r12-call-cost.md`, by `scripts/r12-offer-table.ts --calls` from `data/r12-call-examples.json`.

**What each call carries.** The first call carries every line of packet 5 in its short variant (`buildOwnQuestion`,
`packet.ts:608-658`) and the kind labels in place of today's options (`:645-646`). The second call says what was
chosen in one line and drops the lines the target does not turn on: for a place it keeps `me`, `doing`,
`asked because`, `body`, `now` and `lately`; for a partner `me`, `doing`, `asked because`, `now`, `nearby` and `last`.
A target label is short: species, distance, direction, then crop and age in brackets ("Ficus natalensis, 120 m north
(2,200 kcal, 3 h ago)"), against R8's full wording ("Go to the Ficus natalensis, 120 m north (2,200 kcal of fruit
there when I saw it 3 h ago)").

One real decision point (the packet printed in `docs/staging/r8-prereg.md` §10.4; 362 real tokens as today's single
call), from the generated table:

| Packet | Options | Real tokens (scaled estimate) | Seconds (the law) |
| --- | --- | --- | --- |
| Today's shape: one call, packet 5 short, the rules' menu | 5 | 362 | 0.30 |
| Call 1: what kind | 6 | 306 | 0.24 |
| Call 2: which place, 8 trees, R8's full labels | 8 | 481 | 0.46 |
| Call 2: which place, 8 trees, short labels | 8 | 334 | 0.27 |
| Call 2: which partner, 3 animals | 3 | 203 | 0.13 |
| One call holding every kind and target (15 options; not sendable: the limit is 8) | 15 | 627 | 0.69 |

So the short target label is part of the design: with R8's full wording the call over places alone costs more than
today's whole decision.

**Calls and seconds a day.** An animal on a kernel is asked 54.3 times a day on the no-model population night and
56.9 in the rules' own gate (`docs/staging/r10-prereg.md` §10; `docs/staging/r7-ledger-numbers.md` §2). A second call
followed 0.39 of first calls with kinds first on the rules' menu (measured, `r2-prereg.md`); on the possibility menu
it will be more, because "go to food" always has several targets. Assumed, not measured: 0.55, and 0.70 as a high
case; 0.6 of second calls over places.

| Share of decisions with a second call | Calls per decision | Seconds per decision | Calls per animal-day | Minutes per simulated day, 38 animals | Simulated days in a 10-hour night |
| --- | --- | --- | --- | --- | --- |
| 0.39 (measured on the rules' menu) | 1.39 | 0.32 | 75.5 to 79.1 | 10.9 to 11.5 | 52 to 55 |
| 0.55 (assumed) | 1.55 | 0.35 | 84.2 to 88.2 | 12.1 to 12.7 | 47 to 50 |
| 0.70 (assumed, high) | 1.70 | 0.38 | 92.3 to 96.7 | 13.2 to 13.8 | 43 to 45 |
| For comparison: one call, today's state-only packet (measured 0.44 s) | 1 | 0.44 | 54.3 to 56.9 | 15.2 to 16.0 | 38 to 39 |
| For comparison: one call, packet 5 short on the rules' menu | 1 | 0.30 | 54.3 to 56.9 | 10.4 to 10.9 | 55 to 58 |

Read: two short calls cost about what one packet 5 call costs plus a tenth to a quarter, less than today's packet,
and about half of one long call. **Three limits.** The law is fitted between 396 and 541 tokens, and three of the
four packets of the design are shorter: a fixed cost per call would make the short calls dearer than shown. The
example is one moment. And the first measured arm of stage R5-gate ran at 0.46 to 0.62 s a decision against 0.44
offline, so a night will be slower than any of these lines by a like margin.

**Two more, added by the review (§14).** (1) The estimator counts words, not tokens: it gives every word of an option
the same rate (2.055 tokens). A short target label drops the plain words of the full label ("of fruit there when I
saw it") and keeps the species names, the numbers and the punctuation, which take several tokens a word. So the gap
between 481 and 334 tokens is probably too wide, and the short-label call probably longer than 334; stage R8 found
real over estimated tokens anywhere from 0.82 to 0.90 by wording alone. The design rests on this line, and it is the
one the estimator is least fit to give. (2) "Less than today's packet" compares with the old state-only packet (0.44 s
at 467 tokens). The like-for-like comparison is packet 5 short in a single call, 0.30 s on this moment: two calls cost
more than that on every line of the table. What two calls buy is a choice among up to eight targets, not speed.

## 7. Draw and hold with two calls (the gap of `docs/staging/r9-prereg.md` §10.4, item 2)

The review of stage R9 found three faults with a kinds-first menu: the key noted for the applied entry stands for a
kind and never equals the animal's act, so every ask opens a new epoch; a kind's noise follows the option that
represents it, which changes between asks; and the two requests of one decision share one draw. Each is closed here
on paper. The decode stays a step of the loop (`src/kernel/decode.ts`, `scripts/lib/decoder.ts`); nothing is fitted.

**Keys** (`decoder.ts:62`, `requestKeys`, replaced under the switch).

- A kind entry: `kind:<kind>`, for example `kind:go_to_food`. The key names the kind, never the option that stands
  for it.
- The "a different one" entry of the kind in progress: `kind:<kind>/other#<n>`, where n counts how often such an entry
  has won in this epoch. It is a new option each time the animal has moved on, and fixed until then.
- "Carry on": the first-call key under which the act in progress was chosen, when it was chosen in this epoch (a
  kind's key, or a "different one" key). At the first ask of an epoch the act in progress comes from before, and
  "Carry on" wears `kind:<its kind>`. So inside an epoch the act in progress always carries the key, and the noise,
  of the entry that won it.
- A target in the second call: `target:<action>:<target id>`, the pair `applyDecision` checks (`decode.ts:33`), with
  a prefix so that no first-call key can equal a second-call key.

**Noise and draws.** `held`: the noise of a key is `heldNoise` as it is (`decode.ts:55`: seed, salt, animal, epoch,
key), for both calls. `draw`: the uniform draw of an ask (`decode.ts:53`: seed, salt, animal, decision version) gains
the call's place for the second call (`…|2`), so the two requests of one decision no longer share a draw; the first
call's string is unchanged, so every saved single-call run replays as before.

**The epoch** is R9's `act` epoch (`decoder.ts:85-97`), with one repair. It opens at an animal's first ask; when the
last ask was settled by the rules; when an interrupt has been recorded since the last applied choice; and when the
act the animal is in is no longer the choice applied last. "The choice applied last" is the concrete option the
decision ended on: the second call's option, or the first call's entry when no second call was made. Today `settle`
(`decoder.ts:109-118`) notes the key of the last request decoded, which under kinds first is the kind's and can never
equal the act. Under the switch it notes `action:target` of the applied option for the epoch test, the first-call
key that won (the key "Carry on" wears next) and the target key that won.

**Why a re-ask cannot re-roll.** Inside an epoch the act the decode applied last is still in progress (otherwise the
epoch would have opened). The first call offers "Carry on" under the key that won that act, with the same noise.
Every other kind keeps its key and noise. So another entry wins only if the model's own odds moved, or it is an entry
that did not exist before (a kind that has just become possible, or a new "different one"). If "Carry on" wins there
is no second call and the act goes on. If another kind wins, its targets are weighed under target keys whose noise is
fixed for the epoch. One thing does change between the ask that chose an act and the next: the model is then asked
about "Carry on" and no longer about the kind by its name, and may put another probability on it. That is the model's
odds moving, not the noise, and the registered readouts of §8 measure it.

*Not closed (review, §14).* The set of keys on the first menu follows the act in progress, so "an entry that did not
exist before" has a third case the list above leaves out. While an animal is in kind K, the plain key `kind:K` is off
the menu (K appears as "Carry on" and as "a different one", under other keys). If it takes "a different one" and later
leaves K for another kind, `kind:K` comes back at the next ask with the noise it had when it first won, though the
entries that stood for K one ask earlier carried other noise. So K can win again at once with nothing changed in the
animal's state, out of K and straight back: a switch the single-call held draw of stage R9 cannot make without a
change in the model's odds. Each "a different one" that wins also brings one fresh draw into the epoch. Neither is a
re-roll by re-asking, and the test below would pass with both. Build step 1 has to count, with the fake kernel, how
often a kind is left and re-entered within three asks under `held` against `draw`; if `held` does it more often than
`draw`, the keys are redesigned before any model arm.

**The held kind is still offered and the held target is gone.** Then the act the animal chose can no longer be the
act it is in: the partner left, the crop is finished, the tree is no longer a legal trip. By the epoch rule the next
ask opens a new epoch, with fresh noise for kinds and for targets. The kind gets no head start: it has to win again
on the model's odds in the new state.

*Considered and not adopted:* keeping the kind's noise when only the target was lost, so that an animal that set out
to groom and lost its partner would more often groom another. It needs a table that says which of the twelve ways
an act can end (`src/sim/own.ts:34`, the record of how an act ended) count as "the target was lost" and which as "the
act did its job": a new hand table. Stage R9's own first-order prediction is that holding is hard to tell from
drawing. It is listed for the user and waits for R9's result.

**The receipt** holds one decode record per call (`dec`, `dec2`): mode, salt, epoch and why it opened, keys,
probabilities, the draw or the noise, the kernel's pick and the option applied. A replay must reproduce both.
`scripts/lib/r10-run.ts:278-280` refuses `activityFirst` 2 and a held draw with kinds first today; with these changes
the refusals go for `menuPossible` 1 and stay for `activityFirst`.

**The test that the gap is closed.** The R9 review measured, with a fake kernel on seed 48 (1,400 ticks, five
animals), that none of 257 asks was a re-ask inside an epoch under kinds first. The same measurement with the new
keys must show re-asks inside an epoch, and no held draw re-rolled (`heldBreaks` 0), in both calls.

## 8. "Carry on"

**What it is.** The first entry of the first call, worded exactly "Carry on". It is offered when the act in progress
is still among the animal's possible options and has not come to its own end (packet 5's record of how an act ended
is empty: `ownPercept`, `src/sim/own.ts:286-288`). In the request it is the concrete option of the act in progress,
so choosing it runs today's path unchanged: `applyDecision` starts the same action and target, `startAction` sees
that nothing changed (`src/sim/execution.ts:237`, `same`), keeps the act's state and time, and sets a new bout end
(`:263`).

**How it meets the current act being shown.** Stage R8 recorded that the current act written next to an option that
names the same act pulled the untuned model onto continuing (0.9 or more on it in 7 of 36 real contexts, against 2
without). So:

- the option never repeats the act or its target. What "carry on" means is read from the `doing` line (the act, its
  target, the minutes in it), which is state. The builder refuses to leave `doing` out of a packet that offers
  "Carry on";
- the kind of the act in progress is not offered a second time under its own name: its entry means "a different one"
  and its second call leaves the current target out. So the menu never holds two entries for one outcome, and the
  model's odds are not split between two ways of saying "stay";
- registered readouts for the first arm with a model: the share of asks at which "Carry on" gets 0.9 or more; the
  share at which it is taken, by minutes in the act and by what opened the ask.

**What it is not.** It is not a stay question and it does not decide when an act ends. The moment of every ask is
still set by the loop: a bout range, a gate threshold, an event (§9). No rule here turns a probability of carrying on
into a length of bout. Beside every result that reads "Carry on" stands a control arm that takes it with probability
one half, as the sceptics required of any stay question.

**Its teacher** is the rules' own fresh draws in which they pick again the act the animal is in (a scaffold, named
rules-taught). An act the gate kept without asking is not a label: stage R8 showed that with the current act in the
packet such a label teaches "copy the `doing` line".

## 9. Which choices become real, and which stay code

Against the inventory of the review (`understand-hand_coded_inventory.md`, "Decisions no kernel can influence today").

| Choice | Today | In this design |
| --- | --- | --- |
| The kind of act | the model's, among the kinds the rules' best options stand for | the model's: by possibility for group A, behind the rules for group B |
| Which tree to feed in, among those in view; fruit or leaves where it stands | the rules' best (one feeding option at 99.7% of decision points) | **the model's** |
| Which tree to travel to | the rules' best of four (50.8 pass the trip conditions; 0.74 on the menu) | **the model's**, among up to 8 by the shortlist rule |
| Which water | the rules' best (7.5 remembered; 0.09 on the menu) | **the model's**, among up to 4 |
| Whom to groom, play with, follow | the model's among the two the rules score highest | **the model's**, among up to 8 nearest |
| Which dominant to greet | the one the rules score highest | **the model's**, among those the direction rule allows |
| To carry on or not, when asked | not a question | **the model's**, as an option (§8) |
| When it is asked; when an act ends; how long a bout lasts | the loop: bout ranges (`execution.ts:53-67`), the gate's thresholds, clock periods and 30-minute limit (`rg.ts:225-258`), events | **stays code**, unchanged |
| The 25 choices inside execution (the nest tree, the patrol's route and retreat, the hunt's roles and captor, the mother's refusal to nurse, calls on arrival, the wait at a departure, the consort's goal) | code | **stays code** |
| The dice-opened acts (gang attack, attack on an infant, transfer) | dice, then a fixed high score on the menu | **stays code**, and leaves the model's menu (group C) |
| Whether a social kind is on offer (61 live sites behind advice, quotas or dice) | the rules | **stays the rules'**, each condition counted |
| Everything for animals under 8 (26.8% of decision points) | the rules | **stays the rules'** |

**The ledger lines each configuration would report** (`scripts/lib/who-decided.ts`; the four lines of stage R7, and a
fifth this design adds). The middle and right columns are expectations to be measured, not results.

| Line | Today, measured (first adapter, gate on: `r7-ledger-numbers.md`) | Step 2: rules-taught model on a possibility menu | Step 3: the same with a wild-taught adapter for grooming partners |
| --- | --- | --- | --- |
| 1. Waking minutes whose kind the model picked from a real choice | 54.4% by a fresh choice and 45.0% held by the gate on a no-model night; 34.8% to 63.0% on the saved arms | the same order: the menu does not change how often the gate asks. An ask answered "Carry on" counts as a fresh choice | as step 2 |
| 2. Acts whose target the model picked | 7.6% of acts; 10.5% of acts with a target (6 of 698 aimed at a tree, 98 of 271 at a partner) | most acts with a target: every trip, every feed with a tree in view, every drink, every social act with two or more animals in reach. On the saved arm's own acts that is between 64% (the 698 aimed at a tree, of 1,085 with a target) and all of them; a different engine makes different acts | as step 2, with the partner part split by teacher |
| 3. Endings that were its own | none; at most 46.4% were a choice to leave an act still on offer, at a moment the loop set | none. The count "left an act it could have carried on, at a moment the loop set" becomes exact, because "Carry on" is offered only while the act can go on | as step 2 |
| 4. Hand-set numbers on its path | 17 named entries, and the rules' valuation behind the menu | gone from its path: the slot caps, the trip shortlist of four, one place per action, the cap of 8 as a cut by score, the hash jitter and the continue and finished terms as rankers of which target is shown. Added: the shortlist's numbers of §5.3 (4; 1; 2; three band edges; 8; 4; 8) and the first call's text (21 kind labels, "Carry on" and the "a different one" forms). Still there: the bout ranges, the gate's numbers, the age of 8, the reach radii, and the 113 kept conditions of the table | as step 2 |
| 5. (new) Possible, not offered: no teacher | not counted | counted by kind at every ask (§10) | fewer for grooming |
| Name it may carry | rules-taught model on a rules menu | rules-taught model on a possibility menu | the same, "with grooming partners taught on wild choices (adapter X)" |

No configuration here may be called "model-driven": no ending is the model's, and the teacher of nearly every choice
is the rules.

## 10. Teachers, and the options that stay off the menu

**The rule.** A newly offered option enters the menu only with a named teacher that can put probability on it. An
option that is possible and has none stays off the menu, and the loop counts how often it arose (ledger line 5).

| Newly real choice | Teacher | Why it can teach it |
| --- | --- | --- |
| Which tree in view; fruit or leaves | the rules (scaffold); forked body outcomes if allowed | the rules value every tree in view and the leaves (`candidates.ts:521-545`) |
| Which tree to travel to | the rules (scaffold); forked body outcomes if allowed | every tree the shortlist can show has passed the rules' trip conditions and has a rules value (`:563-574`, `:812-818`). The label is the rules' spread over the trees shown, from scores with the hash jitter and the persistence terms taken out |
| Which water | the rules (scaffold); forked body outcomes if allowed | the rules value every remembered water by its distance (`:575-579`) |
| Whom to groom | wild choices in hand (Ngogo: an adult male among the males present); Taï grooming once downloaded and checked; the rules (scaffold) for a settled partner | the wild records are of the chosen partner among those present; the rules score every settled partner in reach (`:759-786`) |
| Which dominant to greet; whom to play with or follow | the rules (scaffold) | the rules score each one they allow (`:833-845`, `:788-828`) |
| Carry on | the rules (scaffold) | their fresh draws that pick again the act in progress |
| Joining or leaving a party | Budongo party scans once downloaded and checked; the rules (scaffold) until then | the scans record who is with whom every 15 minutes; whether they can be read as joins and leaves is not known until the files are opened |
| Joining an ally's conflict | Kanyawara coalition partners once checked (adult females only); the rules (scaffold) | the deposit describes the chosen dyad among those available at each coalition |

**Possible and off the menu until a teacher exists** (each counted):

- a nest when its own value is 0.25 or less; shelter when the body is not cold; a drink without thirst. Only forked
  body outcomes could teach them, and the user deferred that ruling on 10 October. Second switch `menuBody`.
- grooming a partner that is not settled, for any pair the wild records do not cover (today: anything but an adult
  male choosing among adult males);
- a pant-grunt toward an animal that does not outrank the greeter;
- a trip to a tree on the community's list that the animal has not itself seen (ruling 3);
- every option of group B that the rules do not open: a charge at strangers without the numbers, guarding from a
  lower rank, mating inside the quota, and the rest of the 113 kept conditions.

Outputs of an outside model are never labels. No field rate enters anything above: no number of the shortlist rule is
taken from, or to be tuned to, a share of trips, a party size or a time budget.

## 11. Switches, state and tests of an implementation

**Switches.** `menuPossible` and `menuBody`, both 0 by default; the shortlist's numbers as registry entries tagged
"design assumption" (`data/params.json`; `src/sim/params.gen.ts` is generated). `activityFirst` is not read when
`menuPossible` is 1. `menuPossible` 1 needs `observeV5` 1: "Carry on" reads the `doing` line and the shortlist reads
packet 5's record of crowns fed in (the list the rules keep, `fedTree`, is not written on the working base).

**State.** None new in the world: the sample is keyed by the time the current act began, which the world already
holds (`chimp.actionTime`), and the epoch stays in the harness as in stage R9.

**The contract** (`src/types.ts`, `src/kernel/types.ts:18-32`): `DecisionContext` gains an optional `ask` (which call
this is, the kind labels of the first call, the kind chosen for the second); `KernelRequest.groups` holds the
shortlists.

**Tests** (a new `tests/r12-menu.test.ts`; none exists yet):

1. With both switches 0: requests and both text packets hash as today (the hashes stage R8 pinned); the compressed
   goldens and the field pin (`tests/sim-track-e.test.ts`) do not move; `gen-params --check` is clean.
2. With `menuPossible` 1 and every animal on the rules, the world's hash equals the hash at 0 after the same ticks,
   on the field map and the small one (the rules never read the flag or the wide list).
3. `observe()` and the request builder are pure and deterministic with the switch on: no draw from `world.rng`, no
   write; the same world gives the same two requests.
4. The shortlist never reads a score or a believed crop: with every believed crop permuted and every score replaced,
   the trees listed are the same. No tree of the community's list is listed. The sample is the same at two asks during
   one act and differs after the act changes.
5. No first call holds a kind twice; no second call holds more than 8 options; "Carry on" is offered exactly when the
   act can go on and has not come to its own end, and then the `doing` line is in the packet.
6. Every entry and every target passes the request validation and `applyDecision`; an act started from the wide list
   (a fifth tree, a second water, a second dominant) runs to its own end in execution; the rules' fallback never
   starts an option the rules' own list does not hold.
7. A group C option is never in a request; when the rules' best is one, the rules start it and the receipt says so.
8. The decode with a fake kernel: a re-ask inside an epoch cannot change the act in either call; the two calls of one
   decision do not share a draw; a replay reproduces both records; the measurement of §7 shows re-asks inside an
   epoch.
9. The packet text of both calls holds none of the rules' wording (stage R8's banned phrases), no score and no
   ranking: with every score changed the text is the same; targets are listed nearest first.
10. Options with no teacher are not offered and are counted.
11. (Added by the review.) No offer is refused because the wide pool is full; and under `held` a kind is not left and
    re-entered within three asks more often than under `draw` (§7, "Not closed").

## 12. Build steps (at most three), what each proves, when to stop

**Step 1. The menu, measured, with no model** (about two days of work; processor minutes). Behind the switch: the
wide list, the two requests, the shortlist, "Carry on", the packet text of both calls, the decode keys, the tests of
§11. Then a shadow tap of a rules world on development seeds 48 and 7 (30 days and 5, as stage R7's tap, one
simulation at a time), and two no-model arms on ten focal animals for five days: the rules' top option as the kernel
(a reference) and a random chooser on the new menu (a control).

- *Proves:* that the menu exists without moving a golden; how wide it really is (kinds per ask, targets per kind
  before and after the shortlist); calls per decision; the estimated tokens of real packets of both calls; how often
  the first menu overflows 8; how often the rules' own tree is among those shown, and how often they travel to a tree
  only the community's list holds; how often an option is possible and off the menu; what a random chooser on this
  menu does to energy, nests and the timing card.
- *Stop if:* a golden or the field pin moves; or the second call follows more than 0.8 of first calls (then two calls
  cost more than today's packet and the design needs a shorter state or a merged call); or the first-call packet's
  estimated median is above today's 388 for packet 5 short; or the first menu overflows 8 at more than one ask in
  three.

**Step 2. A rules-taught model on the possibility menu** (one training night, one loop night; needs the model).
States sampled under the new menu in a rules world asked at the same decision points (seeds 48 and 7); labels as the
rules' spread over what is shown, fresh draws only; one adapter for the first call and one for the second, two
training seeds each. Loop test on fresh seeds (proposal: 4111 and 4222 of `docs/staging/r7-prereg.md` §9, if the user
and the integrator agree that this is the registered test that opens them; that section earmarks the pair for stage
R9's draw-and-hold test, so if R9 opens it first this step takes the reserve pair, 4333 and 4444, and a seed is never
read by two tests), ten animals, five days, the gate on, the
decode stage R9's result names, against the rules, their re-draws, the random chooser of step 1 and a "Carry on" at
one half.

- *Proves:* whether animals whose tree, water and partner are the model's are viable (energy against the rules arm,
  nights in a nest, the lean window), and what ledger lines 2, 3 and 5 become, measured.
- *Stop if:* after three iterations energy is under 90% of the rules arm or an animal starves in the lean window; or
  the two training seeds differ in trips begun by more than the arms do. Then the menu stays behind its switch and
  only the instruments are kept.

**Step 3. Wild choices for the one question that has them** (an evening; needs the model). A separate, named adapter
answers "which partner" for the pairs the Ngogo records cover (and Taï's once the user has downloaded the file and
its contents are checked): offline first, on the development part of stage RW, then in the loop with the grooming
gate on "settled" lifted for those pairs.

- *Proves:* whether a choice taught on wild records beats the three-rule stack offline (0.487 on the development
  part) and what it does to the grooming rows of the scorecard, reported apart as fitted and held-out rows.
- *Stop if:* no gain over the untaught model after three recipes (the first attempt was null: 0.400 against 0.373).
  Then grooming partners stay rules-taught and "settled" stays.

Not in these steps: removing a group B rule; a stay question; any teacher of endings; animals under 8.

## 13. Limits, and what is not done

- **Nothing is built and nothing was run.** No simulation, no model, no tokenizer. Every figure of §6 is an estimate
  by the project's TypeScript estimator and a law fitted on longer packets; the real token counts and the real
  latency of the two calls are the integrator's first measurement.
- **The classes are one reader's judgement.** The line between a social fact and advice is the first ruling asked of
  the user. With the strictest line (every enforced social state is advice, community membership included) advice
  would stand in front of 62 live sites instead of 58: the two sharing acts and the two answers to a threat join the
  column. The 6 sites gated by possibility alone stay, and no proposal changes.
- **The scan is lexical.** It does not see a condition that acts through a value computed elsewhere: who is alerted
  to a conflict (`conflict.ts`), which rival a guard chases (`execution.ts`), the conditions under which the dice are
  rolled (`perception.ts`, `reproduction.ts`). The table names these in the notes of their sites; it does not class
  them condition by condition. The score threshold and the slot caps inside `offer()` apply to every site and are
  treated in §5.4, not per site.
- **"Legacy" is a statement about switches**, checked against the resolved working base by the script and not by a
  run (§2.6).
- **A shared condition has one class**, except where the file gives a site its own reading. The age line of 12 stands
  in front of 39 live sites with one proposal (keep), and "not at night" in front of 18.
- **The teacher column says who could teach, not that it works.** The Ngogo grooming adapter's first attempt was
  null; the three downloads are not in hand; forked body outcomes are not ruled on.
- **The design changes what the model is asked, not when.** The 32.0% of asks that follow a hand-set number (a need
  threshold, the 30-minute limit, a clock period) stay.

## 14. Review by a second agent (11 October 2026, 03:45 to 04:07 EDT)

No simulation, no model and no tokenizer were run; one light process at a time, with the load under 5.
Nothing under `src/` was touched.

**What was re-derived, and how.**

- *The conditions.* `src/sim/candidates.ts` was read in full and held against what the reader extracts for each of
  the 94 sites: no condition is missing and none is negated wrongly.
- *The counts.* A separate script (its own rule for legacy, young and live and for what binds, with the base's facts
  taken from the raw parameters where a plain comparison gives them, and from the simulation's own switch functions
  for 15 of them) gives every figure of §4: 94 sites over 29 actions; 19, 6 and 69; 6, 2 and 61; 58, 25 and 3; 83 as
  written; 123 conditions (92, 28, 3); keep 113, drop 6, rules 4; 8, 6, 52 and 3 by site; 39 and 18; the five sites
  and the two; 62 under the strictest line.
- *Legacy.* Each of the 19 was read against the base's parameter values. Through the command line, a base with
  `callValue` 0 makes `--check` exit 1 on a stale table (two more sites live), and a base with `joinChoice` 0 or
  `endoEscalate` 0 exits 1 on "claimed unreachable".
- *Dice.* `perception.ts` and `reproduction.ts` were read: on the working base only the gang attack, the attack on an
  infant and the transfer are opened by a draw. The patrol and hunt impulses are raised without one, and the rolls
  for escalation and the rain display are switched out.
- *The cost.* The arithmetic of §6 was redone by hand from the generated tokens and comes out the same. The anchor
  packet is the one stage R8 printed, with its 362 real tokens.
- *The design's references.* Every file and line named in §5 to §11 was opened (about 45). All point at what the
  text says. The figures quoted from stages R2, R7, R8, R9, R10 and RW stand in their documents.
- *Order.* The registration was committed at 03:13, the classification of all 369 conditions at 03:22 and the table
  at 03:25. The commit order is as registered. Nine minutes is short for 369 classes, so some of that reading was
  probably drafted before 03:13; the log cannot say. No pass mark depends on it: the marks are about cover and
  regeneration, and the expectations of §2.5 were stated as expectations.

**What was wrong, and is repaired** (commit 374749f and the commits after it).

1. *The page for the user was not a two-minute page.* It held 1,516 words under the heading "In two minutes", and each
   ruling was a paragraph, where the brief asked for one plain sentence with the recommendation. Section 1 of the
   table now holds the counts, the ten rulings in one sentence each and what stays, in 540 words of running text; the
   reasons moved to section 2. A test counts the words.
2. *The page said why rules are dropped, and it was not true.* "Only where something other than the rules could teach
   the wider choice" fails for the trip shortlist and the greeting target, whose teacher is the rules. Three of the six
   drops wait for a ruling the user deferred (body outcomes), and one reaches only the pairs a wild record covers. The
   classification now says what each drop waits for (`needs`) and the script counts it: 2 at once, 1 and 3.
3. *Ruling 6 and the design disagreed.* The page recommended offering every community member as a grooming partner;
   §5.4, §10 and build step 3 lift "settled" only where a wild record can teach. The ruling now says what the design
   does.
4. *"117 hand-set numbers"* read as 117 thresholds. It is a lexical count and is now described as one (above, §4).
5. *Rules inside `offer()` were counted nowhere.* The patrol's silence (no call and no display on a silent patrol) is
   on in the working base and stands in front of seven live sites. It is now in §5.4 and under what stays.
6. *Pass mark 4* was reworded after the fact from "every number" to "the counts". The quoted thresholds are now held
   against the source by a test; one figure stays typed (above, §4).
7. *The cost table leaned on its weakest number* and compared with the slower of two baselines (§6, the two limits
   added).
8. *The keys do not close every way to switch* without a change of state (§7, "Not closed").
9. *The script.* A missing table passed `--check`; a bare `--stub` left a file in the checkout; the age marks of the
   classification ("always from 8") were not held against the base's `rgMinAge`. All three are fixed, the last with a
   test.
10. *Smaller.* Two plain-word lines were written for another site (the age of 3 at the drink, "the body exists" for
    an opponent). The first call's text is more than 21 strings (§5.2). The fresh seeds proposed for build step 2 are
    earmarked for stage R9's test (§12).

**Checked and not a defect.** Importing the token estimator through `server/decide` starts no process (the worker is
spawned only by the dev server's middleware). The lead of a patrol is not dice on the working base. The age line of 12
is rightly read as structure at the five sites both calls of their helper reach. The social-fact readings follow the
examples the registration fixed; the weakest is a female's own swelling of 0.75, classed physical where the registered
wording would also allow advice. No count by site moves either way.

**Still open.**

- The classification is now two readers' judgement and still nobody else's; ruling 1 is the user's.
- Legacy status is read from switches. No run has counted offers.
- No real token count and no latency of the two calls exists. Until the tokenizer has counted the short target
  labels, "two calls cost less than today's packet" is a guess.
- The two tables of §6 are copies of the generated file; nothing ties them to it but a reader.
- How often an animal is asked under the new menu is unknown; every line of §6 assumes today's 54 to 57 asks a day.
- "Carry on" is a stay option taught by the rules, which the sceptic of 10 October asked not to build. It is put to
  the user as a decision, with a control that takes it half the time.
- The whole suite and the build were not run (the night's model chain).

## For the integrator

**What is on the branch** (`r12-menu-design`, from `track-e` a11c45c; new files only, nothing under `src/`):

| File | What it is |
| --- | --- |
| `docs/staging/r12-menu-table.md` | generated: the first page for the user (the counts, the ten rulings, what stays with the rules), then one row and one entry per offer site |
| `docs/staging/r12-prereg.md` | this document: the table's registration and result (§1 to §4), the design (§5 to §13) |
| `docs/staging/r12-call-cost.md` | generated: the estimated tokens and seconds of the two calls |
| `scripts/r12-offer-table.ts`, `scripts/lib/offer-sites.ts` | the one read-only script and its reader of gates (it uses `scripts/lib/valuation.ts` and `scripts/valuation-ledger.ts` unchanged) |
| `data/r12-offer-classes.json` | the classification: 369 conditions, 94 sites, the ten rulings (a reading of the code; edit it, not the table) |
| `data/r12-call-examples.json` | the example packets and the measured law behind the cost table |
| `tests/r12-offer-table.test.ts` | 13 tests (11 as built, 2 added by the review) |

**Checks run on this branch** (one light process at a time; the load stayed under 5): `pnpm exec tsx --test
tests/r12-offer-table.test.ts` (11 of 11); `pnpm exec tsc --noEmit` (clean; it covers `src/` only) and the same strict
options on the new script, library and test (clean); `scripts/r12-offer-table.ts --check` and `--calls --check` (exit
0). **Not run:** the whole suite, the build, any simulation, any model, tokenizer or Python process.
`tests/valuation-ledger.test.ts` was not re-run: no file it covers was edited. *(Review, §14:* run again after the
repairs: 13 of 13, and `tests/valuation-ledger.test.ts` 9 of 9; the type-check and both `--check` runs clean.*)*

**To confirm at the merge, in this order.**

1. `pnpm exec tsx --test tests/r12-offer-table.test.ts tests/valuation-ledger.test.ts`, then the suite.
2. *Legacy by a run* (five minutes, no model): a rules run of the working base on a development seed with
   `offerTap.fn` counting offers by action and variant. No `call` with the variant FOODCALL or CHORUS and no option
   with the variant BODY may be counted: only legacy sites carry them. The other legacy sites share their action and
   variant with a live site, so the tap cannot tell them apart; a counter at each `offer()` line would. The table
   reads legacy from switches only.
3. *The real size and time of the two calls* (needs the model's tokenizer and then the model): count the four design
   packets of `data/r12-call-examples.json` with `training/decide_ft/r4_py.sh r8_tokens.py`, then time them. The law
   is an extrapolation below 396 tokens. Only after the night's model chain has ended: any process of the model's
   Python environment makes that chain refuse its next step. Count the two "which place" packets first: the design
   rests on the gap between full and short labels, and that gap is what the estimator is least fit to give (§6).
4. Read stage R9's result before choosing the decode for any build step; §7 covers `draw` and `held`.

**Likely conflicts.** None in code: the branch adds files and edits none. But the test reads
`src/sim/candidates.ts` as text. If a gate in front of an `offer()` has changed on `track-e` since a11c45c, the test
reports "changed offer site" until the classification is brought up to date: run
`pnpm exec tsx scripts/r12-offer-table.ts --stub /tmp/stub.json`, class what it lists in
`data/r12-offer-classes.json` (new conditions under `atoms`; the site's new `print`), then run the script without
flags to regenerate the table. A change that only moves lines needs the last step alone.

**Lines proposed for `IMPLEMENTATION_PLAN.md`** (a new block after "Stage R10", before "Stages W1 to W5"):

> ## Stage R12: The menu by what is possible (design, and the table for sign-off)
> **Goal**: before any of the 94 places where the rules offer an option leaves code, sort every condition in front of
> them into possible (physical, perceptual), social fact, advice, quota or dice; propose for each hand rule to keep
> it, drop it or leave the act with the rules; name the teacher that could cover each act. Then register the design of
> a menu built from what the animal can do, asked as "what kind of thing next" and then "which one" in two short calls.
> **Success Criteria** (registered in `docs/staging/r12-prereg.md` §2 before any condition was classed): the table's
> sites are the valuation ledger's; every condition has a class and every hand rule a proposal; the table regenerates
> to the same text and its check fails on a new site, a changed gate or a legacy claim that stopped holding; every
> count on its first page is computed and every threshold its sentences quote is held against the source by a test;
> nothing under `src/` changes.
> **Tests**: `tests/r12-offer-table.test.ts`.
> **Status**: Designed and reviewed on branch `r12-menu-design` (11 October 2026; built by one agent, reviewed and
> repaired by a second, awaiting the integrator's merge and the user's rulings; no simulation, no model, nothing under
> `src/`). The table
> (`docs/staging/r12-menu-table.md`, generated by `scripts/r12-offer-table.ts` from the source and
> `data/r12-offer-classes.json`): of the 94 offer sites 19 are unreachable on the working base, 6 are reached only by
> animals under 8 and 69 are live; of the live ones 6 are gated by possibility alone, 2 more by a social fact only,
> and 61 carry a hand rule (advice 58, a quota or timer 25, dice 3), in 123 distinct conditions that hold 117 numbers
> by a lexical count (76 literals, counted per condition, and 41 registry values). Proposed: drop 6 conditions, of
> which 2 can go when the menu is built (the trip shortlist of four by the rules' value; one greeting target by the
> rules' score: the teacher of both is still the rules), 1 only for the pairs a wild record covers (grooming only a
> settled partner) and 3 only once a teacher of the body's acts is allowed (the value gates on nest, shelter and
> drink); keep 113 and count them; leave 3 acts with the rules (gang attack, attack on an infant, transfer). The
> design (`docs/staging/r12-prereg.md` §5 to §12; not built): two switches (the menu; the body's acts, for when a
> teacher of them is allowed), a first call over kinds with
> "Carry on", a second over at most 8 targets shortlisted by perception (trees in view, the crown last fed in,
> companions' goal trees, a random sample of remembered trees by distance band that reads no crop and no score), keys
> that let a held draw hold across the two calls, a rule that an option with no teacher stays off the menu and is
> counted, and three build steps. Estimated and not measured, no model having been run
> (`docs/staging/r12-call-cost.md`): 0.24 s for the first call and 0.13 to 0.27 s for the second on one real decision
> point, 0.32 to 0.38 s a decision against 0.44 for today's packet and 0.30 for packet 5 short in one call, 43 to 55
> simulated days of a population in a 10-hour night. The review found that the estimate rests on short target labels
> whose length a word-counting estimator probably understates, and that the keys leave one way for a held draw to
> switch without a change in the animal's state (§7, "Not closed").
> *Open*: the user's ten rulings (the table's first page); legacy status is read from switches, not from a run; the
> real tokens and latency of the two calls, the short target label first; which decode, after stage R9's result; the
> classification is two readers' judgement and no one else's.

In the Status of **Stage R7**, the open item "the 'possible or advisable' table of the 94 offer sites" can read: "now
`docs/staging/r12-menu-table.md`, awaiting the user's ten rulings".

**Lines proposed for `AGENTS.md`.** Commands, after the `valuation-ledger.ts` line:

```sh
pnpm exec tsx scripts/r12-offer-table.ts [--check] [--stub [out.json]] | --calls [--check]   # stage R12 (docs/staging/r12-prereg.md), read-only: docs/staging/r12-menu-table.md, one row per offer() site of src/sim/candidates.ts with the conditions that gate it as written (scripts/lib/offer-sites.ts, a lexical scan) and each condition's class from data/r12-offer-classes.json (a reading of the code, merged by the condition's text); --check exits 1 on an uncovered or changed site, an unclassified condition, a legacy claim that stopped holding or a missing or stale table; --stub lists what the classification does not cover; --calls writes docs/staging/r12-call-cost.md (the project's token estimator on the example packets of data/r12-call-examples.json and the measured time law; no model)
```

Gotchas, one line:

> A change to a condition in front of an `offer()` in `src/sim/candidates.ts` fails `tests/r12-offer-table.test.ts`
> until `data/r12-offer-classes.json` is brought up to date (`scripts/r12-offer-table.ts --stub` lists what is new):
> the "possible or advisable" table is signed off by the user, so a gate may not change under it unseen.

**`HANDOFF.md`**, next steps: "R12: put the ten rulings on the first page of `docs/staging/r12-menu-table.md` to the
user; build step 1 of `docs/staging/r12-prereg.md` §12 (no model) only after them and after stage R9's result."

**`README.md`, `docs/simulation.md`:** no line. No parameter, switch or behaviour was added. **`docs/research.md`:**
no addendum. The only sources named are already there (`mielke2018`, `ramosFernandez2018`, `fox2022`).

**Decisions that are the user's.** The ten rulings on the table's first page, and five more that this design raises:

1. Is "Carry on" acceptable as an option? The sceptic of 10 October asked for no stay question until one has a
   teacher that is not the rules. "Carry on" is today's "pick the same option again" made explicit, taught by the
   rules, with no unit of time and no hazard; it is shown with a control that takes it at one half. I recommend yes,
   named rules-taught.
2. Should a companion's goal tree be a target of "go to food" (as here) or stay under "go along with a companion"?
3. The wording of the 21 kind labels and the short target label (§5.2, §6): they are text the model reads.
4. Should the kind be held when only its target was lost (§7, not adopted)? I recommend waiting for stage R9.
5. May build step 2 open the fresh seeds 4111 and 4222 as its registered loop test?

**Not done, and not verifiable tonight.** No simulation was run, so legacy status and every "expected" ledger line of
§9 are unmeasured. No model process could be started (the night's chain), so no real token count and no latency of
the two calls exists; §6 is an estimate and says so. The second call's share of decisions (0.55, 0.70) and the share
of second calls over places (0.6) are assumptions. The design's code references were read at a11c45c and not
compiled against any change.
