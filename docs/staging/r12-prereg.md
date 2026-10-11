# Stage R12: the menu by what is possible (a design registration) and the table the user must sign off

Agent r12-menu-design, branch `r12-menu-design` from `track-e` a11c45c. **Design only: no simulation change, no code
under `src/`, no model, no training, no simulation run.** Part A (sections 1 to 3) was registered on 11 October 2026,
03:13 EDT (commit 8e1e8e7), before any condition was classified and before any count by class existed. Part B (the design, sections 4
onward) is written after the table and is a registration of a design, not of a run.

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

## For the integrator

(Completed at the end of the stage.)
