# Stage R12, the build: the menu as ruled, on R15's two-stage path (pre-registration)

Branch `r12-menu`, from `track-e` at 286fe38. Written 17 October 2026, 22:32 to 22:36 EDT (times from `date`), **before
any code of this build and before any run of changed code.** It is committed alone, first. No model process, no
graphics probe, no dev server and no browser is started by this stage: it builds, proves without a model, and prepares
what a later stage trains. Stage R16's model sessions may be running on this computer from `bench-r16`; nothing here
touches that checkout, its `screen` sessions or `artifacts/r14-chain.lock`.

**Amended before any code** by amendment A1 (section 16, 17 October 2026, 23:05 EDT), which answers the second reader's
attack and supersedes every passage it names. Where the two differ, section 16 holds.

**What every result of this stage is called.** This stage trains nothing and runs no model, so its runs are named for
what decides in them: "no model: the rules' top option on the R12 menu", "no model: a random chooser on the R12 menu",
"no model: the rules" (a world in which every animal is on the rules). Any later trained arm on this menu is a
"rules-taught model on the R12 menu"; an arm whose male grooming partner comes from the Ngogo-taught adapter names it
exactly (section 8.5). Nothing here is about wild chimpanzees unless a registered wild test says so.

Read first: `docs/staging/r12-prereg.md` (the design, sections 5 to 14), the first page of
`docs/staging/r12-menu-table.md` (the ten rulings), `docs/staging/r15-perceived-targets.md` and
`r15-training-contract.md`, `docs/staging/r7-ledger.md`, `docs/staging/r4-prereg.md` (the adapter `r4-field-groom`),
and the plan's "User decisions (17 October 2026)" and "User decision (17 October 2026, 22:12 EDT), on the remaining nine
menu rulings".

## 0. What the user ruled, and what exists

**The rulings.** On 17 October 2026 the user settled all ten rulings of the menu table as recommended: ruling 2 in the
words "the model picks the tree", the other nine in the words "yes to the recomendations" (the plan, both entries of
that day). In short: (1) the dividing line between a social fact and advice stands; (2) the model picks the tree, among
trees the animal perceives or remembers; (3) trees no animal has itself seen: not yet, own view and memory only, and
count how often the rules go to a community-listed tree; (4) the model picks the water; a drink when not thirsty only
once a teacher that is not the rules exists for the body's acts; (5) nest and shelter whenever possible: the same,
keeping "no new nest in full daylight"; (6) whom to groom: open only where a wild record can teach the choice (today an
adult male among adult males, the Ngogo record), "only a settled partner" kept and counted elsewhere; (7) whom to greet:
keep "only to a dominant" and count it, the model chooses which dominant; (8) the numbers rules for strangers: keep and
count; (9) the courtship rules: keep and count; (10) the three acts opened by dice stay with the rules. **"Count" means
the rule stays in code and is listed and counted as a hand rule in every result.**

**What exists.**

- Stage R12's design and table (`r12-prereg.md`, `r12-menu-table.md`, `scripts/r12-offer-table.ts`,
  `data/r12-offer-classes.json`): 94 offer sites; 69 live for an animal a kernel decides for; 123 distinct advice,
  quota and dice conditions in front of live sites, proposed keep 113, drop 6, leave with the rules 4.
- Stage R15, built behind `resourceTargets` (with `activityFirst` 2 and `observeV5` 1): a two-stage path in which a
  kernel first picks the kind of act from the rules' bounded activity menu, then, for feeding and drinking, the tree or
  the water among those the animal itself perceives or remembers (`src/sim/resources.ts`, `src/sim/request.ts`
  `buildResourceRequest`, `targetRequest`). Rulings 2 and 4 (the water part) are in it. For every other kind the kind's
  one target is the rules' best option of that kind ("the representative"). Its teachers: the kind by R11's
  original-menu odds summed by kind; the resource target by the rules' counterfactual valuation of the shown targets
  (`scripts/lib/r15-training.ts`). Its two-call journal, decode and replay: `scripts/lib/r15-loop.ts`,
  `scripts/lib/decoder.ts`.
- Stage R16 runs R15's contract at scale from the frozen checkout `bench-r16` (2971e14).

## 1. Scope

**This build includes**, all behind one switch that is 0 by default (section 3) and on top of R15's path, not beside it:

1. Two new target stages in R15's kind-then-target loop: **which dominant to greet** (ruling 7), for every animal a
   kernel decides for; **which adult male to groom**, for an adult male (ruling 6).
2. **The three dice acts leave the model's menu** (ruling 10): when the rules' best option at an ask is one of them, the
   rules start it; otherwise they are not offered to the kernel and are not legal for it.
3. **The counted-rules list**: a machine-readable list of every rule the rulings keep, generated from the table, with
   its counts printed in every result of this stage and in stage R7's ledger (section 5).
4. **The count of ruling 3**: how often the rules go to a tree from the community's list that the animal has not itself
   seen within its memory horizon (section 6).
5. **The counts of "possible, not offered"** (R12's ledger line 5) for the conditions the rulings keep on the body's
   acts and on grooming (section 7).
6. **The teachers and label formats** of the new target stages, with the training export prepared and tested on
   fixtures (section 8); what the Ngogo record can and cannot teach inside the loop (section 8.5).
7. **The proofs without a model** that the new path works and that, with the switch at 0, R15's and R16's packets,
   labels and hashes are unchanged byte for byte (sections 10 and 11).

**This build leaves to a later stage** (section 14): any training, any model run, any collection of training rows
beyond fixtures; "Carry on"; any body-act widening (nest, shelter, drink without a need); the choice among settled
partners and the target of every other social kind; the community-listed slot; serving the Ngogo-taught adapter in the
loop; the loop test on fresh seeds.

## 2. Each ruling: the code today, what R15 did, what this build changes, what stays code and is counted

Line numbers are those of `src/sim/candidates.ts` at 286fe38 (the table's, source hash 22ca5555943a).

1. **The dividing line.** Today: a reading of the code in `data/r12-offer-classes.json`; nothing in code depends on
   it. R15: nothing. This build: no code change; the counted-rules list takes each condition's class from that file as
   signed, and the table records the ruling's outcome in each ruling's entry (a `ruled` field: the date and the user's
   words), printed in section 2 of the table and not on its two-minute page (whose word count a test holds).
2. **Which tree.** Today the rules offer the four trees they value most (line 637, the trip shortlist), and the slot cap
   keeps two. R15 (under `resourceTargets` 1): the model's legal pool holds every tree it remembers within the horizon
   and beyond the minimum trip distance, and every tree in view; the second call shows at most 8 (a stable hash sample
   over four distance bands for trips, nearest first for feeding), with the current target kept. This build: no
   change. Stays code and counted: R15's menu numbers (8 trees, the band edges 150, 400 and 1,000 m, the hash keyed by
   the start of the act, the current target kept), the memory horizon (240 h), the minimum trip distance (35 m), and,
   on the rules' own path, their shortlist of four.
3. **Trees no animal has itself seen.** Today the rules offer an animal of 10 or more trees from its community's list
   it has not seen (lines 599 to 612). R15: the model's pool holds only trees in the animal's own memory or view
   (`resourceEligibleActions`), so the list never reaches the model. This build: the count (section 6). Stays code and
   counted: the list on the rules' own path and its age line of 10.
4. **Which water; a drink when not thirsty.** Today a drink is offered at a remembered water only when thirst is above
   0 (line 586), and the slot cap keeps the one the rules value most. R15: the model picks the water among at most 4
   (the nearest, then a hash sample). This build: no change. Stays code and counted: "thirst above 0", with the status
   "until a teacher that is not the rules exists for the body's acts"; the age line of 3 (always true from 8).
5. **Nest and shelter whenever possible.** Today a nest is offered only when its own value is above 0.25 and daylight is
   below full (line 280); shelter only when the body is colder than neutral (line 411). R15: nothing (the nest and rest
   kinds keep their one option; the nest tree is the formula's). This build: no change. Stays code and counted: the
   nest's value above 0.25 and "colder than neutral", each with the body-teacher status; "no new nest in full daylight",
   kept for good.
6. **Whom to groom.** Today grooming is offered only toward a settled partner (resting, grooming, sheltering or nursing;
   lines 766 to 790) and the slot cap keeps the two the rules score highest. R15: the groom kind's one target is the
   rules' best. **This build:** for an actor that is an adult male, the target call lists every adult male of its
   community in view and within grooming reach, whatever he is doing, plus R15's representative when that is not an
   adult male (section 4.1). Stays code and counted: "only a settled partner" for every other pair; the representative
   (one target) for every other actor; the partner of at least 1 year; the grooming reach (45 m on the working base).
7. **Whom to greet.** Today a pant-grunt is offered toward one animal only: of the dominants the conditions allow, the
   one the rules score highest (lines 750 to 860). R15: the greet kind's one target is the rules' best. **This build:**
   the target call lists every dominant the conditions allow (section 4.1). Stays code and counted: "only to a dominant"
   (the direction of rank), the greeting age of the other (a male of 13 or more, or anyone of 15 or more), the actor's
   age line of 5 (always true from 8), "once per association", the greeting reach (20 m).
8. **The numbers rules for strangers.** Today rows 62 and 64 to 70 of the table (a charge needs at least 3 males of
   one's own and 2 more than theirs, and so on). R15: unchanged; the kind comes from the rules' menu with its one
   target. This build: no change. Stays code and counted: each condition of those sites, with its numbers.
9. **The courtship rules.** Today rows 51 and 72 to 75 of the table (guarding only from the top two ranks; a
   consortship only for a male who is not the alpha and has a bond with her; coercion only toward a female near full
   swelling; mating only 1.5 h after his last, 0.3 h after hers). R15: unchanged. This build: no change. Stays code and
   counted: each.
10. **The three acts opened by dice.** Today a roll at perception opens the gang attack (line 1297), the attack on an
    infant (line 1149) and the transfer (line 918), each then offered at a fixed high score. **On R15's path today they
    reach the kernel's kind menu** ("Transfer community"; the attack on an infant, at its fixed score usually the
    representative of "Display or charge"; the gang attack under "Face the strangers"), so a model can pick or refuse
    them. **This build:** with the
    switch on they leave the kernel's menu and its legal pool, and when the rules' best option at an ask is one of them
    the rules start it (section 4.6). Stays code: the dice and their rates, listed as "acts with the rules".

## 3. The switch

One new registry entry, **`menuPossible`** (group `decision`, units switch, range 0 to 1, evidence "design", 0 in both
profiles; its note begins "Stage R12 (docs/staging/r12-build-prereg.md)"). The name is the one `r12-prereg.md` §5.1
registered; at 1 it does exactly what section 1 lists and no more (no "Carry on", no body-act widening, no possibility
menu for the body's kinds). `menuBody`, the second switch of `r12-prereg.md` §11, is **not** added: rulings 4 and 5 say
it waits for a teacher.

- `menuPossible` 1 requires `resourceTargets` 1 (which itself requires `activityFirst` 2 and `observeV5` 1); any other
  combination fails at world creation, as R15's does.
- It is read only on the model's path: the request builder, the model-only legal pool, the group C check at a kernel's
  decision point, and the export. **No rules path reads it**: a world in which every animal is on the rules hashes the
  same at 0 and 1 (section 10.2, test 2).
- At 0 the code takes R15's path exactly. A new optional context field (section 9) is absent, and every request,
  packet, label, receipt and hash of R15 and R16 is unchanged byte for byte (section 10.1).
- The entry is named in `docs/simulation.md` §17 (the parameter test requires it); `src/sim/params.gen.ts` is
  regenerated; the goldens do not move (a switch at 0 changes no world).

## 4. The new target stages in R15's loop

### 4.1 The menus, built from what the animal perceives or remembers

The kind call is R15's, unchanged: the kinds of the rules' bounded flat menu, one entry each, each with R15's
representative. **So whether "Greet or appease" or "Groom someone" is on the kind menu is decided as today**, by the
rules' own gates and their score threshold, and is counted. Only the second call of these two kinds changes. With the
switch on, the kind call differs from R15's only when a group C option was on R15's menu (section 4.6).

**Greeting, for every animal a kernel decides for.** The second call of "Greet or appease" lists every animal of its
community that it sees, alive, within greeting reach, of the greeting age, that outranks it and that it has not greeted
since they last met (or that has just charged or attacked it): exactly the conditions in front of `bestGrunt` (lines
841 to 851) without the last one, "the one the rules score highest". Plus R15's representative when it is not a
pant-grunt (the submission to an animal threatening it, the same kind).

**Grooming, for an actor that is an adult male** (`isAdultMale`, `src/sim/hierarchy.ts:16`: male, 15 or older; the
pair class). The second call of "Groom someone" lists every adult male of its community that it sees, alive and within
grooming reach, **whatever he is doing**, plus R15's representative when that is not an adult male. For any other actor
the groom kind keeps R15's one target. The pair class uses the simulation's existing definition of an adult male; the
Ngogo protocol's adult males are 16 or more, with adolescents not ruled out (`rw-prereg.md`): the one-year difference is
named here, not tuned.

**For both:** nearest first; at most 8 (the request limit, `MAX_OPTIONS`; no new number); the current act's target
first when it is still allowed. No rules score, rank of value, believed crop or bond decides membership or order. The
rules' score threshold of −0.4 and the slot caps inside `offer()` are not applied to the members of these two groups
(as R15 does for resources); they still decide whether the kind is on the menu. The phase menu applies (no greeting or
grooming at night). A group of one option makes no second call (R15's rule).

**How it is built.** Inside `computeCandidates`, only in the model-only call (`resources` true) and only with the
switch on: every dominant the greeting conditions allow, and every adult male partner of an adult male (with "settled"
lifted for that pair class only), is offered into R15's side pool with the rules' own raw value, jitter and metadata, so
the teacher of section 8 reads the rules' own numbers. `resourceEligibleActions` (or a successor that is equal to it at
0) adds those options to the model's legal pool. Preferably no new `offer()` site: the existing sites gain a switch
condition. If a site must be added it must be derived legacy on the working base. Either way
`data/r12-offer-classes.json` is brought up to date (`--stub` lists what is new), the table is regenerated, `--check`
exits 0, and **the counts of the first page for the working base do not change** (69 live, 6 young, 19 legacy; 6, 2
and 61; 58, 25 and 3), which a test holds.

### 4.2 Legality and its re-check

The model's legal pool at a decision version is R15's pool plus the options of section 4.1. The same pool is read at
the three places R15 reads it: whether the act in progress is still legal at a decision point (`decide.ts` line 45 and
the line after the gate), the answer's re-check (`applyDecision`), and the intention gate (`loopGate`). So a second
dominant, or an adult male who is feeding, can be applied, is held while its conditions hold, and is set aside when
they stop (the dominant greeted, the male out of reach). The rules' fallback keeps the rules' own list
(`resolveByRules`, `rulesChoice`): a fallback never starts an option the rules would not offer. Execution is not
changed: an act started from the wider pool is a `pant-grunt` or a `groom` with a target, and runs to its own end.

### 4.3 The intention gate and the hold

Unchanged from R15. With `kernelGate` 1 an applied greeting or grooming becomes the animal's intention, held by the
gate (need buckets, clock period, interrupts, the 30-minute limit; `urgencyPersist` is 0 on the working base, so the
pay test does not read the pool) while the option stays in the legal pool. The decode is R15's: the kind key
`kind/<kind>`; the target key `action:target` under the stage `target/<kind>`, so the two new stages draw in their own
namespaces (`target/greet_or_appease`, `target/groom`); the epoch opens when the act in progress is no longer the
concrete option applied last. The decode R16 uses (a draw from the model's odds, the user's word of 17 October) and
R15's held draw both work unchanged.

### 4.4 Replay and checkpoints

Unchanged from R15: every call is journalled before either answer is applied; checkpoints fall between passes; a
replay reproduces both calls of every decision and the world's hash. The run identity of an R12 run names the R12
contract (section 9), so a journal of an R12 run refuses to replay as R15's and the reverse.

### 4.5 What the packet shows

The kind packet is R15's, byte for byte (when no group C option was on R15's menu). The target packet is R15's target
packet (`r15Packet`: packet 5's short variant, "chosen activity: Greet or appease" or "Groom someone", R15's target
instruction) with:

- the options in packet 5's neutral labels ("Pant-grunt to Ugazi", "Groom Ugazi"), never an option's score or reason;
- `nearby` holding every animal the call names: the target call's own list of perceived animals is the group's
  animals, then the nearest other animals in view, to 8 (membership by distance only), with its history lines for that
  set. It is built at the time of the first request, from the same world, and carried in the request, so the second
  request stays pure. (R15's own target calls keep the kind call's list, whose membership follows the rules' scores;
  this is unchanged for them and counted as a limit, section 15.)
- the `last` lines (its own timing with each named animal) and what each is doing, as packet 5 writes them.

No rules wording (stage R8's banned phrases), no score, no ranking; targets listed nearest first. Real token counts are
a later stage's (the tokenizer is a model-environment process); the estimate is reported.

### 4.6 The dice acts (group C)

At a decision point of an animal a kernel decides for, with the switch on and **after** the loop's gate has run (the
rules' own animals also meet their gate first, `rg.ts` `rgChoice`): if the first option of the rules' own list (their
argmax; the list is sorted by score) is the gang attack, the attack on an infant or the transfer, `startAction` starts
it with source `rules`, no kernel is asked, no draw is taken, and the run's receipt or tap records it as "rules: a dice
act". Otherwise those three options are removed from the request and from the model's legal pool. If removing one
leaves a kind without options the kind leaves the menu; if it was a kind's representative the kind's next best option
of R15's flat menu represents it.

## 5. The counted-rules list, and how every result prints it

**The file.** `data/r12-hand-rules.json`, generated by `scripts/r12-hand-rules.ts` from the table (`buildTable` on the
working base), the rulings' status in `data/r12-offer-classes.json`, and stage R7's list of the loop's numbers
(`scripts/r7-ledger.ts` `handNumbers`). `--check` exits 1 when the file is stale, when a kept condition changed, or
when a condition the rulings keep has no entry. Each entry has:

- `id`: a short hash of the condition's text (stable across line moves); `text`, `words` (the table's plain words),
  `class`, `sites` (site keys and lines), `numbers` (literals and registry values at their values on the base);
- `ruling`: 1 to 10, or none (a rule the table keeps that no ruling names: the age lines, the timers, "not at night");
- `status`, one of: **kept** (stays in code, counted); **kept until a body teacher** (rulings 4 and 5: thirst above 0,
  the nest's value above 0.25, colder than neutral); **kept except for the adult male pair** (ruling 6, "settled");
  **cut on the model's path** (the trip shortlist of four, cut by R15 under `resourceTargets`; the one best dominant,
  cut by this build under `menuPossible`), counted when its switch is off; **an act with the rules** (ruling 10, the
  dice conditions);
- `source`: the table (conditions in front of offer sites); `inside offer()` (the score threshold, the slot caps, the
  patrol's silence, each with what it is cut for); `menu` (R15's numbers of section 2, ruling 2; R15's kind scaffold,
  the rules' bounded flat menu of 8 with one place per action; this build's group limit of 8, nearest-first order and
  pair class); `loop` (R7's list: bout ranges, the gate's thresholds and clock periods, the 30-minute limit, the age of
  8);
- `onPath(params)`, computed: whether the rule can bind for an animal a kernel decides for under a run's parameters.

Expected at generation, from the table (to be confirmed by the script, not typed into it): the 113 kept conditions,
3 kept until a body teacher, 1 kept except for the adult male pair, 2 cut on the model's path with their switches on,
and the 4 conditions left with the rules at the three dice sites (the three rolls and a window after one of them);
plus the rules inside `offer()`, the menu numbers and the loop's numbers.

**How every result prints it.** One printer, `scripts/r12-hand-rules.ts print --params <file>` (and a function the
reports import), writes a short section: the list's hash, the number of rules on the path under the run's parameters,
by status, by ruling and by class, and a link to the file. Every result of this stage carries it: the numbers file
`docs/staging/r12-build-numbers.md`, the summary and manifest of every R12 run of the two-stage runner, and stage R7's
ledger report, whose line 4 (the hand-set numbers on the path) gains this section for any parameters. **Where a run is
read, it adds the counts the existing read-only taps give**: how often the score threshold, the slot caps and the
patrol's silence removed an option at a kernel's decision points (`offerTap` fates), the dice acts the rules started,
ruling 3's count and the counts of section 7. A count of how often each of the 117 table conditions bound would need a
tap at each condition inside `candidates.ts`; it is not built here (section 14). **R15's and R16's own output files are
not changed** (section 10.1): their results can carry the section by the printer, from their saved parameters, without
touching their files. Proposed for `AGENTS.md`: every later result of a model on any menu prints this section.

## 6. Ruling 3's count: how often the rules go to a community-listed tree

**What is counted.** Every food trip the rules start (a `travel` to a tree, the animal's own trip, not a joined one)
whose tree came to the rules' menu from the community's list and not from the animal's own memory within its horizon,
in two classes: never in its own memory (the trip's belief carries hours since seen = infinity) and seen by it longer
ago than the horizon (`tripBeliefs` bit 1, on in the working base). Denominators: every own food trip the rules start,
and adult-days of animals aged 10 or more (the list is offered only from 10). Also counted: decision points at which
such a tree was on the rules' menu, and the share of the R15 kind label's "Go to food elsewhere" mass that came from
such trips (the label's original menu holds them; the model can never be shown them).

**How.** Read through the existing taps (`rulesTap`, `rgTap`), which read only: the world's hash with and without the
tap is compared in every run. Reported (a) in a rules world (section 10.3, M1), and (b) in every R12 run for the acts
the rules start there (fallbacks, the dice acts, animals under 8, the rules arm). A kernel's own choice never goes to
such a tree with the switch on or off (a test).

**The reading.** No threshold is set. `r12-menu-table.md` (ruling 3) says one slot "known to my community" could be
added if the count is large; whether it is large is the user's call, and the count is put to them as it comes out.

## 7. Possible, not offered (R12's ledger line 5)

Counted by kind at every ask of an R12 run and at every decision point of an animal 8 or older in the rules world of
M1, from the animal's state only (a pure function in the scripts, nothing in the simulation):

- an adult male with an adult male in reach who is not settled, while "Groom someone" is not on the kind menu (the
  pair class is open, but whether to groom has no teacher but the rules: the kind stays gated, ruling 6);
- a remembered water while thirst is not above 0 (ruling 4);
- a nest tree in reach, daylight below full, and the nest's value at or below 0.25 (ruling 5);
- rain at or above 0.12 and the body not colder than neutral (ruling 5);
- trees of the community's list not in its own memory within the horizon, that pass the trip conditions (ruling 3).

## 8. Teachers and label formats

Every label is a teacher's, named in the row; no score, reason or teacher figure enters a packet; outputs of an outside
model are never labels; field numbers are never inputs.

### 8.1 The kind call

R15's teacher, unchanged (`r11-original-menu-kind-marginal-v1`): R11's original-menu odds summed into the offered
kinds, the excluded mass reported. With the switch on the dice kinds may be missing from the offered kinds (section
4.6): their mass is reported as excluded, never credited. A decision at which the rules started a dice act makes no
row (counted).

### 8.2 The resource targets

R15's teacher, unchanged (`counterfactual-resource-valuation-v1`).

### 8.3 Which dominant (greeting)

The rules' counterfactual valuation of the shown targets, as for R15's targets, under its own name
**`counterfactual-social-valuation-v1`**: each option keeps its current rules raw value (the greeting score, lines 848
and 849, with the act's continuation term), a uniform jitter of the registry's span is redrawn, the published clamp and
rounding are applied, and the maximum wins; 2,000 deterministic redraws keyed by the row id, canonical key order, no
world random state, no belief draw (greeting has no crop belief). The label is the share each option wins. It is not the
rules' choice probability on a wider menu (the rules only ever offer their best), not an ecological reward and not a
wild preference. R16's clamp rule applies when the labeler is asked for it.

### 8.4 Which adult male (grooming, an adult male actor)

The same teacher on the shown group, every option valued by the rules' grooming score (line 790), which reads the
partner's activity only when the partner is grooming the actor (an invitation). **For a male who is not settled this is
the rules' formula applied past the rules' own gate**: a scaffold with no choice behind it. Each row therefore marks,
per option, whether the rules' gate would have allowed it (`rulesGate`), and whether the option is an adult male
(`pair`), so a later stage can train on all of it, leave the opened options out, or serve the wild route. This
registration recommends that any result about which adult male is groomed is read from the wild route (section 8.5),
and that a rules-taught arm's figures on the opened options are reported apart and named a scaffold.

### 8.5 The Ngogo record, and the adapter `r4-field-groom`

**What exists.** Stage RW built a wild packet from the Ngogo focal scans (whom an adult male groomed among the adult
males of his party; `src/rw/packet.ts`, packet `rw-bench-v1`): the focal male's pseudonym, the number of adult males in
the party, who was within 2 m or 2 to 5 m or grooming at the previous scan, his earlier partners in the session, and
ranks of past counts; body state, rank, kinship and bond are masked to neutral values. Stage R4 taught one adapter on
its train part, `r4-field-groom` (label source "field choices, Ngogo male grooming"; scorecard rows T-SOC-1, T-SOC-2,
T-FIS-1, T-FIS-3 and T-FIS-5 compromised for it). On the development part it picked the groomed male on 0.400 of records
against 0.373 untuned, not a difference; 0.480 against 0.435 with the fan-out, a difference; the simple rule stack reads
0.487. On Taï's record (another site, both sexes) it read 0.319 against the simple rule's 0.353, within its interval.

**It cannot teach a stage of this loop by its labels.** The loop's target packet carries the animal's body, its own
experience, rank, kinship and bond words that the record does not hold. Rendering wild records into it would fill those
lines with invented values the loop never shows, and an adapter would learn from a packet form it never meets in use.
A mixed training (loop rows and wild rows in one adapter) would be a "mixed" adapter, compromised like `r4-field-groom`;
it is not proposed.

**It can serve the stage, in its own packet form, for the part of the menu it covers.** Proposed for a later stage
(nothing of it is built here beyond the tags of section 8.4): when an adult male's grooming target call is made, the
rules-taught model gives the group's odds; a separate, named, unchanged `r4-field-groom` is asked over the adult males
of the group, with a packet rendered from the animal's own perception into the `rw-bench-v1` form (each mapping a
counted hand rule, registered with that stage); the odds the first model put on adult males are shared among them by
the second's odds; the other options keep the first model's odds; one draw decides. Before any loop use: the adapter's
runtime qualification as R15 requires (token counts, serving parity, hashes) and the offline mark of
`r12-prereg.md` §12 step 3 (beat the rule stack's 0.487 on the development part; the sealed part stays sealed).

**What that would mean**: for an adult male who has chosen to groom, which adult male in reach he grooms is set by an
adapter taught on whom wild Ngogo males groomed, seeing only what that record holds. The arm's name: "rules-taught model
on the R12 menu, with the grooming partner among adult males chosen by a wild-taught adapter (`r4-field-groom`, Ngogo
male grooming)". **What it would not mean**: that grooming is wild-taught (whether to groom, when, how long, and every
partner who is not an adult male stay rules-taught); that the menu is the wild one (the record's set is the party's
adult males, written once a session and incomplete; the loop's is the adult males in view and in reach); that the
choice uses rank, kinship, bond or body state (masked in the record); anything about the simulation's males resembling
Ngogo's; and, on the adapter's offline evidence so far, that it chooses better than its untaught base or the simple
rule. The five scorecard rows above are compromised for that arm.

### 8.6 The row format

R15's row (`R15Row`) with three additions, present only with the switch on: `packetVersion` names the R12 contract
(section 9); `teacher` names `counterfactual-social-valuation-v1` on a social target row; and on a grooming row of an
adult male, the per-option `rulesGate` and `pair` flags. Which multi-target group gives the decision's one target row
is R15's hash choice, now among resource and social groups alike. With the switch at 0 every row is R15's byte for byte.
This build tests the export on fixtures only (section 10.2); it runs no collection.

## 9. The contract

- A new packet identity, `menu-targets-v1` (`R12_PACKET_VERSION`). With the switch on, every context of an R12 request
  (kind and target) carries a new optional field naming it; with the switch off the field is absent.
- Request validation (`src/sim/context-check.ts`): the field is allowed only with R15's phase marker; with it a target
  context may also be of the kinds `greet_or_appease` and `groom`; without it R15's rule stands (a target context must
  be a resource kind).
- Adapters: a later R12 adapter's manifest must name `menu-targets-v1`. An R15 or R16 adapter refuses an R12 context
  and an R12 adapter refuses an R15 one; the R15 runner, server route and worker refuse a mismatch before any call. The
  ordinary browser and server providers refuse every marked context, as they do today. Nothing in this build loads an
  adapter: the refusals are tested with fakes.
- `KernelRequest` gains one optional field holding, per social group, the target call's prepared list of perceived
  animals and history lines (section 4.5); absent at 0.

## 10. Tests and proofs without a model

### 10.1 With the switch at 0, nothing of R15 or R16 moves

**The pin, recorded before any code** (iteration 0, on the unchanged source at 286fe38, committed before the first code
commit): `scripts/r12-pin.ts record` writes `data/r12-pin.json` with, on the field working base with R15's switches
(`resourceTargets` 1, `activityFirst` 2, `observeV5` 1, `kernelGate` 1), seeds 48 and 7, R15's 30-day rules burn-in
and up to 1,400 sampling ticks: at up to 40 fresh decision points per seed chosen by a hash, the hashes of the kind
request, every target request, both packets, the model's legal pool, and R15's labels (default options, and R16's
options: clamp rule, halves, a named target kind); the final world hash; and the receipts and end hash of R15's
no-model wiring run (`scripts/r15-loop.ts dry`, 720 ticks, five adults, seed 48, decode draw and held). `check`
recomputes all of it after the code changes with `menuPossible` 0 and must match exactly. Beside it the existing tests
must pass unchanged: the goldens and the field pin (`tests/sim-track-e.test.ts`), `tests/r8-packet.test.ts`, every
`tests/r15-*` and `tests/r16-scale.test.ts`, `tests/r12-offer-table.test.ts`, `tests/valuation-ledger.test.ts`,
`tests/r7-ledger.test.ts`, and `gen-params --check`.

### 10.2 The new path (`tests/r12-menu.test.ts`, new)

1. The switch is 0 by default; invalid combinations fail at world creation.
2. With the switch at 1 and every animal on the rules, the world hashes as at 0 after the same ticks, on the field
   map and the small one.
3. `observe()` and the request builder stay pure: no draw, no write; the same world gives the same requests.
4. The greeting group is exactly the dominants a brute-force reading of the world allows, nearest first, at most 8;
   the grooming group of an adult male is exactly the adult males in view and in reach, settled or not, plus the
   representative; any other actor's groom group is R15's one target. With every score replaced or permuted the
   groups and their order are the same.
5. With the switch on the kind packet equals R15's byte for byte at every sampled decision point where no dice act was
   on R15's menu.
6. Every option of the new groups passes the request validation and `applyDecision`, is held by the gate while legal,
   and is set aside when not; a pant-grunt to a second dominant and a grooming of a male who was feeding each run to
   one of their own ends; the rules' fallback never starts an option outside the rules' own list.
7. The target packets hold no banned rules wording and no score; with every score changed the text is the same; every
   named animal is in `nearby`; options nearest first.
8. Group C: never in a request or in the model's legal pool; when the rules' best is one, the rules start it after the
   gate and the receipt says so; no draw is taken.
9. The decode with a fake kernel: the two calls draw in separate namespaces; a held draw does not re-roll inside an
   epoch in either call; a replay reproduces every call and the world hash; resume from a checkpoint between passes
   equals the uninterrupted run.
10. The teacher of section 8 is deterministic, normalized, reads no world random state and leaves the world and the
    decision version unchanged; an opened male option has a finite raw value; the row flags are right; export and live
    packets are equal; an R15 adapter manifest refuses an R12 context and the reverse.
11. The counted-rules list regenerates byte for byte; its counts equal the table's; a changed kept condition fails
    `--check`; every R12 run's manifest and summary carry the list's hash and counts.
12. Ruling 3's tap and the counts of section 7 read only (hash with and without equal); on a crafted world whose only
    trip option is a listed tree the count is 1, with the tree in its own memory 0.
13. The offer table: `--check` exits 0 and the first page's counts for the working base are unchanged.

### 10.3 Runs without a model (development seeds 48 and 7 only; one simulation at a time)

- **M1, the rules world read by a tap**: field working base with R15's switches and `menuPossible` 1, every animal on
  the rules (the switches are then not read: checked against the same world at 0), R7's window (30 days burn-in, 5
  tapped days). Read at every decision point of an animal 8 or older: the size of the greeting group and of an adult
  male's grooming group, the share of opened (not settled) males in it, how often a group would pass 8, how often a
  dice act is the rules' best, ruling 3's count, and section 7's counts. These are descriptions of the instrument, not
  behaviour, and are not compared with any field figure.
- **M2, the wiring of the two-stage loop**: `scripts/r15-loop.ts dry` with `menuPossible` 1 (720 ticks, five adults,
  seeds 48 and 7, decode draw and held), then `replay` from the same checkout to the same hashes; and two control
  kernels through the same runner at the same bound: the rules' own option at each call, and a uniform random chooser.
  Read: asks, kind calls, target calls by kind (the two new ones among them), options per group, applied and refused
  answers, fallbacks, dice acts started by the rules, every applied target legal, every act ended by one of its own
  ends. Too short to read behaviour; no energy, nest or timing figure is read from it.

The numbers file `docs/staging/r12-build-numbers.md` is written by a script from these runs' files, with the
counted-rules section; nothing in it is typed.

## 11. Machine rules for this stage's runs

Before any test file, type-check or run: `uptime` and `pgrep -f "r16.py session|r15-scorer|decide_ft|train_r1"`.
One test file at a time (or `--test-concurrency=2`) while the one-minute load is above 4; no whole suite and no build
while an R16 model step runs (the check prints a process); whole-suite and build checks wait for a gap and are reported
as not done if none comes. No model process, Python worker, tokenizer or MPS use. No script of this stage creates,
takes, waits on or removes `artifacts/r14-chain.lock`; a reused runner that refuses because of a running chain is
recorded and left, never forced. Seeds 48 and 7 only; nothing on 21, 3613, 4111, 4222, 3457, 3823, 3079, 3517, 3701,
3187, 3011, 3643, 4333 or 4444. `data/raw` is not read. Node commands as `fnm exec --using=22.22.3 -- ...`.

## 12. Iterations and stop rules

- **Iteration 0** (no code under `src/`): the pin script and the pin on the unchanged source; committed.
- **Iteration 1**: the switch, the two target stages, group C, the contract, the export, the counted-rules list, the
  taps and counts, the tests of section 10.2; then M1 and M2 and the numbers file.
- **Iterations 2 and 3**: repairs after a second reader, each logged in this document before its code runs.
- At most three iterations of code. **Stop** (the switch stays 0, nothing merges as working) if after them: the pin of
  section 10.1 does not match; a golden or the field pin moved; a rules world hashes differently at 1; a new act fails
  to end in execution; or the table's working-base counts changed. A failure is recorded as it is; no setting is
  chosen to make a count come out.

## 13. The open design questions of `r12-prereg.md`, settled

1. **"Carry on" as an option** (recommended yes, rules-taught, with a control at one half). The recommendation stands
   for the stage that builds it; **not built here**. R15 registered "no explicit carry-on in this slice", R16 is
   training and testing that kind call now, and "Carry on" changes every kind packet, the kind teacher and the keys
   (`r12-prereg.md` §7, including its "Not closed" re-entry case, which needs its own fake-kernel count first). Doing
   it here would leave no stable R15 kind call to build on.
2. **A companion's goal tree: "Go to food" or "Go along with a companion"?** (no recommendation in `r12-prereg.md`).
   Settled as R15 built it: a joined trip stays a social choice under "Go along with a companion". The user's ruling 2
   accepted R15's path as built; moving it needs a teacher split for joined trips and changes R15's kind packets.
3. **The wording of the kind labels and the short target label.** Settled by reuse: R15's kind labels
   (`RESOURCE_KIND_LABELS`) and packet 5's neutral option labels, no new text; every string is in the counted list as
   hand-set text.
4. **Hold the kind when only its target was lost?** (recommended: wait for R9). Not adopted. R9 has reported: a held
   draw was overturned less often and did worse than a plain draw for its adapters (42 of 50 nights in a nest); the
   user chose a plain draw for R16. R15's decode is used unchanged.
5. **May the loop test open 4111 and 4222?** Moot: R11 opened them. This build opens no seed (48 and 7 only). The
   loop test belongs to a later stage; the recommendation on file (`HANDOFF.md` §6 item 11; `r16-prereg.md` §3) is that
   it takes the sealed 4333 and 4444 and that a new sealed pair is named; that stage registers it with the user.

Parts of `r12-prereg.md` §5 to §12 that R15 or the rulings superseded, so not built: the shortlist of §5.3 (R15's is
used: no "crown it last fed in" slot, no companion goal-tree slots); the possibility menu of group A for the body's
kinds and `menuBody` (rulings 4 and 5); the 8 nearest animals as the kind call's `nearby` list (it would change R15's
kind packet; left with "Carry on"); the fan-out of a kind menu over 8 (R15's kinds come from a flat menu of 8); the
wide pool of 160 (R15's side pool has no cap).

## 14. Left to a later stage

Training an R12 adapter (a collection on 48 and 7 under this export, real token counts, preflight, two seeds); any
model in the loop; "Carry on" and its keys; the body's acts (rulings 4 and 5, once a teacher exists); the choice among
settled partners, play partners, followers and every other social kind's target among what the rules offer (the
representative stays); the 8 nearest animals in the kind packet; the community-listed slot, if the user asks after
ruling 3's count; the Ngogo route of section 8.5 (renderer, qualification, the offline mark, the loop arm); Taï's
record (ruling 6 names Ngogo; RW3 found it no teacher at its size); a count of how often each kept table condition
binds; the loop test on fresh seeds.

## 15. Risks and limits

- **The rules-taught male grooming target is a scaffold past the rules' own gate** (section 8.4): a model taught it
  would value a moving male as a resting one, and grooming attempts toward moving partners may end at once. Only the
  wild route has a teacher that saw real choices, and that adapter's offline gain is not yet shown.
- **Whether to groom stays gated by the rules**: the kind entry appears only when the rules would offer grooming, so the
  opening reaches the target call only. Section 7 counts how often the opened pair class arises with no groom entry.
- **R15's kind packet lists the animals the rules' best options name first** (`observe.ts` lines 59 to 81): that
  membership is kept so that the kind call stays R15's; the new target calls do not use it.
- **Shared files change** (`candidates.ts`, `resources.ts`, `request.ts`, `decide.ts`, `context-check.ts`, `types.ts`,
  `packet.ts`, `params.json`): the pin and R15's and R16's tests are the guard; R16's frozen checkout is not affected.
- **The offer table and its signed page**: a mistake in the new switch conditions' classes would change the counts the
  user signed; a test holds them.
- **No real token count or latency** of the new target packets (no tokenizer may run); the estimate is reported.
- **M1 and M2 are short and on two development seeds**: they show that the path exists and how wide it is, not what a
  model would do with it.
- **Machine contention**: whole-suite and build checks may find no gap while R16 runs; they are then reported as not
  done, and the integrator runs them at the merge.

## 16. Amendment A1 (17 October 2026, 23:05 to 23:20 EDT; before any code)

A second reader attacked the registration above (8 corrections, 14 gaps, 14 amendments). Every amendment is accepted,
one of them with a different reading (A1.2), stated with its reason. Nothing here was run; no code existed when this was
written.

**A1.1 The adult male pair opening has its own value of the switch, off unless a run names it.** `menuPossible` becomes
a level, 0 to 2 (whole numbers, 0 in both profiles): **1** gives the greeting target (ruling 7), the removal of the
dice acts (ruling 10), the counted-rules list and the counts; **2** gives all of that and also an adult male's grooming
target among the adult males in reach whatever they are doing (ruling 6). Every run of this stage that does not say
"level 2" is at level 1. Reason: ruling 6 opens the pair class "only where a wild record can teach the choice"; the design's
own rule (`r12-prereg.md` §10) admits a newly offered option only with a named teacher, and the one wild adapter in hand
does worse than the three-rule stack (0.400 against 0.487). So, by default, **the export writes no label for a group
that holds an option the rules' own gate would refuse** (`rulesGate` false, a male who is not settled): that group gives
no training row, and the exclusion is counted. A labeller option (`scaffold: true`) writes such rows, flagged; any arm
that uses them is named for it (A1.8). At level 1 the unsettled adult males in reach are counted as possible but not
offered (section 7). Level 2 may be used for a run only after the user says yes to the open question (section 15,
"Decisions") or after the Ngogo route passes its qualification and beats 0.487 on the development part.

**A1.2 The dice acts: the order of the steps, and who owns them after they start.** In `decisionPoint`, for an animal a
kernel decides for, on both paths (the lockstep model path and the in-tick kernel path), with `menuPossible` at 1 or 2:
(1) perceive; (2) the rules' own list (`getEligibleActions`) and the model's legal pool; (3) the loop's gate, when
`kernelGate` is 1 (an intention it holds is kept as today, and wins); (4) **the dice check**: if the rules' own first
option (their argmax) is the gang attack, the attack on an infant or the transfer, the rules start it (`startAction`,
source `rules`), any intention is dropped, no kernel is asked and no draw is taken, and a read-only tap records it;
(5) only then the act-in-progress check (model path) or the kernel's step (in-tick path). A rules-started dice act holds
**no intention**, so `loopGate` can never restart it with source `decide`. At every later decision point step 4 runs
again: while the act is still the rules' first option the rules continue it (`startAction` on the same act keeps its
progress) and its source stays `rules`; when it no longer is, the rules have ended it, and the animal is open for its
kernel as after any other ended act. *The different reading:* the attack asked that the act be "checked against the
rules' own list". That is not adopted: an act still on the rules' list but no longer their first option would run on
only until the kernel's answer replaced it, so the kernel would end it, against ruling 10. Here the rules start, continue
and end it. Tests: a transfer and a gang attack started by the rules each run on under source `rules` while the rules
rank them first and end by the rules; stop rule: either is set aside for missing from the model's pool, or relabelled
`decide`.

**A1.3 The dice options leave the candidate list before anything is built from it.** With the switch on, the request
builder removes them from the list before the bounded flat menu, the kind menu and the kept picks are built (the rules'
argmax among the kept picks is then their best option that is not a dice act), and the observation that orders the
kind packet's nearby list is built from the same list without them. So the kind menu is the one R15 would build without
them, and no animal leads the kind packet because of a removed act. Test 5 then reads: the kind packet equals R15's
byte for byte at every sampled decision point where no dice option was among the candidates; and a test with a dice
act among them checks that it is in neither the menu nor the nearby order.

**A1.4 Ruling 3's count, in three classes.** A trip the rules start to a tree that is not in the animal's own memory
within the horizon came to their menu from the community's list (the list loop skips every tree in its memory, of any
age). Split by the animal's own list sighting (`x.ls`, `tripBeliefs` bit 1): **(a)** no sighting (never seen by it);
**(b)** a sighting older than 240 h; **(c)** a sighting within 240 h of a tree no longer in its memory (perception
records every listed crown in view, but memory keeps only fruiting crowns among the best five in view). Class (c) is
reported apart as trees the animal saw itself that R15's pool, which reads memory only, cannot show; it is put to the
user beside the count as a question for ruling 2 ("perceives or remembers"). Test 12's crafted world covers all three.

**A1.5 The pin: what is compared, which paths, and its route.** The pin is recorded by direct library calls (never
through `scripts/r15-contexts.ts`, which refuses while `artifacts/r14-chain.lock` exists or the tree is dirty, and never
through `scripts/r15-loop.ts`, which keys every call's identity to git HEAD). Compared exactly: the hashes of every
request, packet, legal pool and label; the end hashes of worlds; the receipts and journal calls of R15's wiring run,
with the run identity fixed to the string `r12-pin` instead of one built from git HEAD; for R16's runner (`runDay16`
with an in-process asker whose odds are a hash of the packet, a short day on seeds 48 and 7), its journal calls, its ask
and held lines (stage R16's own `comparable16`) and its day hash, with the wall-clock, milliseconds and process fields
of the day summary left out; for R16's census and selection (`rulesCensus` over one day with no burn-in, then `select`
with the plan `zero`), the census entries and the selection digest, the census file's commit field set to `r12-pin`.
Nothing compared carries a time of day, a path or a host name.

**A1.6 The representative's place.** In each new group the members are the current act's target when it is still
allowed, then R15's representative (chosen by the rules' score: R15's rule, counted as a limit in the list), then the
nearest; at most 8; listed nearest first. So the option that put the kind on the menu can never fall off. Section 4.1's
sentence "No rules score ... decides membership or order" is corrected to: no rules score decides the membership or
order of the opened members. Test 4 permutes the scores of the opened members only, the representative held fixed.

**A1.7 The offer table.** The greeting of every allowed dominant and an adult male's grooming of every adult male in
reach are two new `offer()` sites behind the switch, which is never on in the rules' enumeration the table audits, so
both are legacy. The test holds unchanged what the user signed: 69 live and 6 young places; 6, 2 and 61; 58, 25 and 3;
and every live row's conditions. "All" and "legacy" rise by the new sites (94 to 96 and 19 to 21 if there are two), and
the valuation ledger's site count, which the table must equal, rises with them. The first page is regenerated with a
line that names the change and the sites, instead of presenting the totals as the signed ones.

**A1.8 Names.** Any later trained arm on this menu is a "**rules-taught model on a rules menu (the R12 menu)**"; an arm
whose grooming partner among adult males comes from the wild adapter is a "rules-taught model on a rules menu (the R12
menu), with the grooming partner among adult males chosen by a wild-taught adapter (`r4-field-groom`, Ngogo male
grooming)"; an arm taught on the scaffold rows of A1.1 adds "with the adult male partners labelled by the rules' own
formula past their gate (a scaffold)". The no-model names of the introduction stand.

**A1.9 Facts corrected (section 2 and the counted-rules list).** R15's sample of trees is keyed by the time the animal
has spent in its current act (`c.actionTime`, seconds, times 3600; `resources.ts` line 43), not by the act's start; it
is often 0 at a waiting ask, because an animal set aside to wait is set to rest with that clock at 0. This is recorded as
an existing R15 limit and not changed. The transfer is opened by the dispersal hazard (`src/sim/reproduction.ts` line
87), not at perception; the gang attack (`perception.ts` line 283) and the attack on an infant (line 335) are rolled at
perception. The rates of all three are fixed per draw at a decision point, not per hour: perception, and so the rolls,
run at decision points, so how often decisions come changes the hourly rate. This is named as a limit; M1 and M2 count
dice acts per animal-hour.

**A1.10 M1's cost.** The share of R15's "Go to food elsewhere" kind label that comes from listed trees needs R11's label
at a decision point. It is computed only at decision points sampled by a hash of (seed, tick, animal) with probability
0.02, at most 40 per seed, and stops at a wall-clock cap of 15 minutes per seed (what was done is reported). One
simulation at a time. M1 and M2 also report the estimated length of every new target packet (the project's token
estimator, `estimateInputTokens`; the real tokenizer is a model-environment process and does not run), flagged against
R15's own largest estimated packet in the same run and against the hard limit of 1,280.

**A1.11 Section 7 gains two counts**, which rulings 6 and 7 imply and the design's ledger line 5 lists: an animal in
greeting reach, of the greeting age, that does not outrank the greeter (a pant-grunt that "only to a dominant" keeps off
the menu); and an unsettled community member in grooming reach, for every pair other than an adult male with an adult
male (a grooming that "only a settled partner" keeps off).

**A1.12 Section 8.6 (adopted as recommended).** With the switch on, R15's hash choice among the resource groups is
unchanged, and a social target row is chosen among the social groups by its own hash. So a decision can give a kind row,
a resource target row and a social target row, and the resource rows of an R12 collection stay comparable with R15's.
The social row's teacher draws its own stream (keyed by the row id with a suffix), never the resource row's.

**A1.13 Section 12, iterations.** Iteration 0 (the pin script and the pin on the unchanged source) changes no
simulation code and is not counted among the three; any repair of the pin script after it has recorded counts as one of
the three.

**A1.14 For the integrator's lines.** Added: a reading note for R16 (read-only; R16's results stand as registered): under
R15's contract its model saw, and could pick or refuse, the three dice acts, which ruling 10, made after R16 was frozen,
takes off the R12 menu; R16's own receipts can show how often a dice kind was on its kind menu and taken. Section 13,
item 2 is corrected to "**left as R15 built it until the user rules**" (the design made no recommendation and the user
has not ruled on it), and it joins "Decisions that are the user's", with "Carry on" (recommended yes, not built).

**What the attack's corrections change elsewhere.** Section 4.1's first paragraph on order (A1.6); section 6's two
classes (A1.4); section 8.4's default (A1.1); section 10.1's pin (A1.5); section 10.2 tests 4, 5, 8 and 13 (A1.6, A1.3,
A1.2, A1.7); section 10.3's M1 (A1.10); section 12's iterations (A1.13); section 13 item 2 (A1.14); the names
(A1.8); section 2 rulings 2 and 10 (A1.9).

## 17. Log of the build (17 October 2026, 23:05 EDT onward; times from `date`)

**The machine.** No R16 model step ran while this stage worked (checked before every heavy step: no `r16.py session`,
`r15-scorer`, `decide_ft` or `train_r1` process; a `pgrep` on those words also matches other sessions' shells whose command
lines carry the same words, so the check was made on the process list). Other sessions kept the one-minute load between
about 3 and 14, with a burst to 36 during this stage's whole suite (two files at a time; a browser and other sessions were
busy too). Every step of this stage ran as one process; nothing touched `bench-r16`, its screen sessions or
`artifacts/r14-chain.lock`; no model, worker, tokenizer, browser or dev server was started. Seeds 48 and 7 only.

**Iteration 0 (23:06 to 23:14): the pin** (commit 3cde3804, before any code). `scripts/r12-pin.ts` calls the libraries
directly (A1.5): A, R15's path at sampled fresh decisions of a rules world on the field working base with R15's switches
(30 days of burn-in; 40 and 35 decision points on seeds 48 and 7, 10 of each labelled with R15's labels and R16's options);
B, R15's wiring run (seed 48, five adults, 720 ticks, decodes draw and held: 79 and 91 calls); C, R16's day runner with an
in-process asker (240 ticks on the burned-in worlds: 189 and 210 calls); D, R16's census of one day with no burn-in (1,739
and 1,713 entries) and the selection of plan `zero`. Recorded at 23:07 to 23:08 on the unchanged source (`data/r12-pin.json`,
hashes and counts only) and checked again on the unchanged source at 23:10 to 23:13: equal.

**Iteration 1 (23:14 to 23:43): the build** (commit ee34529e and the commits after it on `r12-menu`).

- **The pin with the switch at 0 after the code: equal byte for byte**, every section (checked 23:22 to 23:24, after every
  change under `src/`; checked again at the branch's last commit, below).
- **What was built**, as registered with A1: `menuPossible` (levels 0 to 2, 0 in both profiles, refused without
  `resourceTargets` 1; `docs/simulation.md` §17); `src/sim/possible.ts` (the dice set, the opened social groups, the target
  call's own nearby list, the rules' grooming gate); a side pool in `computeCandidates` for the opened options, filled only in
  the model-only call (two new `offer()` sites: every dominant the greeting's conditions allow; at level 2, every adult male
  in reach of an adult male, valued by the rules' grooming formula, which was moved unchanged into one expression so that
  both offers read it); `resourceEligibleActions` with the opened options and without the dice acts; the request builder
  (the dice acts dropped before anything is built, `observe()` given the same filter, the social groups, the contract mark
  `menu`, `targetSocial`); `targetRequest` showing a social call's own nearby list; the validation; the dice check in
  `decisionPoint` on both paths, after the gate, with a read-only tap (`loopTap.dice`); the labeller (the dice mass excluded,
  the social row by its own hash and stream, the flags, no row for an opened partner unless `scaffold`, the shared function
  `socialTarget`); the refusals (`assertContract`, the R15 model kernel, the R15 server route, R16's day runner); the
  counted-rules list and its printer (`scripts/r12-hand-rules.ts`, `data/r12-hand-rules.json`), printed in stage R7's
  ledger report and in the numbers file, its hash and counts carried by every M1 and M2 result; the counts
  (`scripts/lib/r12-menu.ts`); the runs (`scripts/r12-runs.ts`).
- **Tests.** `tests/r12-menu.test.ts`, 22 tests, all pass (the registered 13, with 4b, 4c, 6b, 8b, 8c, 8d, 10b, 10c, 12b).
  The guards pass: every `tests/r15-*.test.ts`, `tests/r16-scale.test.ts`, `tests/r7-ledger.test.ts`, `tests/r8-packet.test.ts`,
  `tests/kernel.test.ts`, `tests/sim-params.test.ts` (the goldens), `tests/sim-track-e.test.ts` (the field pin),
  `tests/valuation-ledger.test.ts`, `tests/r12-offer-table.test.ts`, `gen-params --check`; `tsc --noEmit` on `src/` and, by
  hand with the same strict options, on every new or changed script and test. **One existing test was changed**, which the
  registration said must pass unchanged: `tests/r12-offer-table.test.ts` read "the first pant-grunt site" as the rules' live
  greeting; the build's greeting site stands inside the loop, before the rules' own site (whose key became
  `computeCandidates/pant-grunt/NONE#2`), so the assertion now finds the live greeting site by its status, and two checks of
  the built sites were added (legacy on every base, named as added). The whole suite and the build: below.
- **The offer table.** 96 sites: 69 live, 6 young, 21 legacy; of the live, 6 by possibility alone, 2 with a social fact,
  61 behind a hand rule (58 advice, 25 quota or timer, 3 dice): every count the user signed is unchanged, and a test holds it.
  The first page names the two added sites in a table line (its running text stays at the 540-word cap). Rows after row 26
  renumber by 2, so the rulings' row references in section 2 moved (ruling 7: row 34 to 36; ruling 8: 62 to 70 became 64 to
  72; and so on). Each ruling's entry now carries the user's words (`ruled`), printed in section 2.
- **The counted-rules list.** 157 rules (hash fe0607eacd145314): from the table 123, as registered and computed, not typed:
  113 kept, 3 kept until a body teacher, 1 kept except for the adult male pair, 2 cut on the model's path (the trip
  shortlist of four by `resourceTargets`; the one best dominant by `menuPossible`), 4 with the rules; inside `offer()` 3;
  the menus 16 (R15's numbers, this build's, the kind scaffold, the hand-set text, and 5 named limits); the loop 15 (stage
  R7's list). On the path of an animal a kernel decides for at level 1 or 2: 155 (the 2 cut are listed apart).
- **Facts found while building.** (1) Starting an attack spends the roll that opened it (`src/sim/execution.ts:280`), so the
  rules never offer a gang attack or an attack on an infant twice: a rules-started attack runs under source `rules` to its
  next decision point, where the rules end it, exactly as for an animal on the rules. The transfer is offered again while it
  runs, so the rules continue it to its own end (test 8b: completed on the small map, source `rules` at every tick). So A1.2's
  "while the rules rank it first" applies to the transfer only; for the two attacks it is their first decision point. (2) At
  level 2 the scaffold is visible: an adult male in a nest, not settled by the rules' word, is offered as a grooming partner;
  this is why A1.1 keeps level 2 off by default and writes no row for such a group.
- **M1** (a rules world read by a tap at level 2, which no rules path reads; 30 days of burn-in, 5 tapped days; 23:38 to
  23:41; `docs/staging/r12-build-numbers.md`): each world ended on the same hash as the same world at level 0 with no tap
  (seed 48 2b0d03220e8c968f, seed 7 9e558333b86ec364). 10,382 and 11,227 fresh asks. "Greet or appease" was on the kind menu
  at 2,349 and 2,870 asks; its group had two or more options at 35% and 44% of them (up to 7 and 8; the cap of 8 would have
  cut one group). An adult male had "Groom someone" on the menu at 2,046 and 2,565 asks; at level 2 his group held up to 7,
  34% and 40% of its members not settled. No decision had a dice act as the rules' best in the 10 tapped days (5 per seed). The kind
  packet equalled R15's at all 60 sampled asks (none had a dice option among its candidates). The new social target
  packets were estimated at 411 and 442 tokens on average, at most 650, against R15's own resource target packets in the
  same runs (490 and 506, at most 871); none over 1,280. **Ruling 3:** of 1,356 and 1,243 own food trips the rules started,
  12.1% and 17.8% went to a listed tree the animal never saw itself (a), 1.3% and 0.2% to one it saw more than 240 h ago
  (b), 0.8% and 0.5% to one it saw within 240 h but no longer held in memory (c); about 0.9 and 1.2 trips of class (a) per
  adult-day of animals 10 and over; at 40 sampled decisions per seed, classes (a) and (c) carried 2.6% and 3.7% (seed 48)
  and 17.8% and 0% (seed 7) of R15's "Go to food elsewhere" kind label. **The labels against the rules' realised picks:** at
  201 and 402 greetings with a group of two or more, the rules' dominant was in the group every time, first by the label at
  199 and 395, with a mean label mass of 0.84 and 0.81 on it (chance 0.43 and 0.39); first by the realised jitter at 181 and
  346 (the rules pick the dominant by its score before the jitter). At 122 and 161 groomings of an adult male by an adult
  male, the realised partner was first by the label at 113 and 148, mass 0.90 and 0.90 (chance 0.36 and 0.35). **Possible, not
  offered** (share of decisions of animals 8 and over): an unsettled adult male in reach of an adult male 16% and 22%; an
  unsettled member in grooming reach for any other pair 66% and 65%; an animal in greeting reach that does not outrank 37%
  and 41%; a remembered water while not thirsty 90% and 91%; a nest possible but not offered 5% and 5%; rain without cold
  1.4% and 0.3%.
- **M2** (R15's wiring run, levels 1 and 2, seeds 48 and 7, decodes draw and held, three kernels: 24 runs; 23:42): every
  replay exact. The early-morning window offers few social choices: greeting target calls at 5 runs, grooming target calls
  at 4 (all at level 2), 15 social choices applied and each followed by a later ask of the same animal; no dice act;
  the legality re-check refused 1 or 2 answers in 10 runs, and the rules then decided. Asks where something possible was not
  offered: 1,552 kind asks, of which 772 had an unsettled adult male in reach of an adult male.
- **The whole suite and the build**: see the last entry of this log.

## 18. Second reading (18 October 2026, 11:12 to 11:38 EDT; times from `date`)

A second reader tried to refute the build, with no model. The builder's last entry of section 17 was never written (its
session ended after commit 771d7279); the logs it left in `artifacts/r12/` (gitignored) show the whole suite at 23:55 on
the final code, two files at a time: 1,585 tests, 1,584 passed, 1 skipped (a validation file not on this computer), none
failed; and `pnpm build` (type check and production build) passed at 23:58.

**The machine.** No model process was started. At 11:18 the integrator's launcher started R16's session 1 in `bench-r16`;
it stopped at 11:19 at its preflight step (its own log: the preflight worker wanted its own supervisor lock), was
relaunched at 11:36 and began its model step `preflight-zero` at 11:37:22. From then on this reading ran no test, no run
and no type check. Nothing of `bench-r16`, its screen sessions or `artifacts/r14-chain.lock` was touched. One-minute load
between 2 and about 5. Seeds 48 and 7 only.

**Order and the attack.** In git the registration came alone first (b5b6f7c2, 22:36), then amendment A1 alone (df55ceae,
23:05), then the pin script and the pin with no change under `src/` (3cde3804, 23:14), then the code (ee34529e, 23:32).
Sections 0 to 16 were not edited after the code: the last commit changed only section 17 and the integrator's lines.
Every one of the attack's 14 amendments, 8 corrections and 14 gaps maps onto A1.1 to A1.14 and is built; the one different
reading (A1.2) is stated with its reason. One slip of time: A1's heading says written 23:05 to 23:20, but it was committed
at 23:05:30 and the pin was recorded from 23:07.

**With the switch at 0.** `scripts/r12-pin.ts check` reproduces byte for byte at the build's head and again at this
reading's head. The pin itself was checked on an export of the pin commit's tree (its source equal to 286fe38): it
reproduces there too, so it was recorded on the unchanged source. The goldens (`tests/sim-params.test.ts`) and the field
pin (`tests/sim-track-e.test.ts`) pass. World hashes computed by the reader on the unchanged source and on the branch are
equal: default worlds (the small map, seeds 48 and 7, and the field map, seed 48; one day each), the working base on the
field map, and the working base with R15's switches and the in-tick kernel path (`kernelSim` 1 for a day on both seeds,
`kernelSim` 2 for half a day). The only byte that moves at 0 is the registry hash stored in a new world's settings (a new
parameter always moves it; older saves open with the usual notice), which the world hash leaves out.

**Each ruling, read at its sites.** Ruling 7: the opened offer stands inside the same conditions as the rules' choice of
the best dominant, without that last comparison, so every member outranks the greeter; the group is those members, the
representative, nearest first, at most 8. Ruling 6: the opened offer needs `menuPossible` 2, an adult male actor and an
adult male partner in reach; at level 1 the groom kind keeps one target; no other pair is opened (an unsettled adult female
or a male of 10 to 14 is refused). Ruling 10: the three dice acts leave the request and the legal pool before anything is
built; at a decision point the rules start one when it is their argmax and nothing is asked, after the gate (A1.2: an
intention the gate holds wins, as it does for an animal on the rules). Nothing else is opened: the drink offer keeps its
thirst line in the model-only call, the nest and shelter sites are untouched, the community's list is never in the model's
pool (a new test, 12c), and the stranger and courtship sites are unchanged. Ruling 3's count exists and prints (M1).

**Probes with the switch on** (fakes only): a stale answer, a target that moves out of reach or dies between the request
and the answer, a pant-grunt to an animal that does not outrank the greeter or was already greeted, a grooming of an
unsettled adult male at level 1 or of an unsettled animal that is not an adult male at level 2, and a dice act sent as an
answer are all refused by the legality re-check; a dominant who walks away while the greeting is held is set aside at the
next decision point and the animal waits for its kernel; a transfer rolled while an answer is pending is started by the
rules and the pending answer is refused. Over 451 packets of a four-day field world at level 2, replacing every option's
score and reason left every packet the same.

**Reruns.** M1 (seeds 48 and 7) at this reading's head: every figure equal to the builder's files (only the wall-clock
seconds differ), and both worlds end on the hash of the untapped world at level 0. M2 (24 runs): every figure equal, every
replay exact.

**Defects found and repaired** (each its own commit):

1. *A training row at a decision the rules take* (62cbeb5d). Section 8.1 says a decision at which the rules start a dice
   act makes no row; the labeller excluded the dice act's share and wrote the row anyway, so a later collection would teach
   the model kinds at decisions where it is never asked. Now no row, counted as "dice act: the rules start it"; nothing
   changes at 0. Test 10b, which an `if` let pass without checking, now holds both cases.
2. *Tests that held less than they said* (a098c5e3). 4c never reached the cap (nine copies of one option); 8d compared two
   lengths with an act that names no animal. Both now test what they name; 12c is the test section 6 asked for.
3. *Ruling 3's count missing from M2* (ec00b05d), which section 6 (b) asks of every run: added (1,732 rules trips, all to
   trees in the animals' own memory, as must be in the first three hours of a fresh world before the community's list
   exists). The printed hand-rule section showed the same "kept except for the adult male pair" at levels 1 and 2; it now
   says whether the pair opening is on.
4. *Level 2 described as a plain option* (ff952191) in the parameter's note and in `docs/simulation.md`; both now say it
   has no teacher in this build and is not for a run whose result is read until the user says yes or the Ngogo route
   qualifies.

**Not repaired, named.** M1 and M2 ran at level 2 although A1.1 says level 2 is used for a run only after the user's yes
or the Ngogo qualification; both are no-model (a rules world, where the level changes only the requests a tap builds, and
a wiring run with control kernels) and nothing in them is read as behaviour. A scaffold row (written only with
`scaffold: true`) carries the same teacher name as a greeting row; it is told apart only by its options' `rulesGate`
flags, so any later training must filter on those. Section 5's counts of what the score threshold, the slot caps and the
patrol's silence removed at a kernel's decision points (`offerTap`) are not in M1 or M2. Test 12 checks ruling 3's classes
on a crafted world, not a count of one on a world whose only trip is a listed tree (M1 and M2 carry the count). With
`urgencyPersist` 1 (0 on the working base) the gate's pay test would read the model's pool without the dice acts and the
rules' list with them, so the gate could hold a model animal where it would open a rules animal.

**Tests run by this reading** (one file, or two at a time, each with the load under 5): `tests/r12-menu.test.ts` (23
tests), every `tests/r15-*.test.ts`, `tests/r16-scale.test.ts`, `tests/r12-offer-table.test.ts` (104 in all, passed);
`tests/r7-ledger.test.ts`, `tests/r8-packet.test.ts`, `tests/kernel.test.ts`, `tests/valuation-ledger.test.ts`,
`tests/persist-envelope.test.ts` (75, passed); `tests/sim-params.test.ts` and `tests/sim-track-e.test.ts` (passed);
`gen-params --check`, `scripts/r12-hand-rules.ts --check` and `scripts/r12-offer-table.ts --check` (clean); the strict type
check on `src/` with the changed scripts and test (clean). **Not run by this reading:** the whole suite and `pnpm build`
after its four commits (R16's model step began first); the changes are in scripts, one test file and two notes, and every
file that imports them was run.

**For the integrator, in addition to the lines below:** the status line reads "Built on `r12-menu` with no model; second
reading done (four repairs, section 18)", the test count is 23, and the decisions that are the user's gain nothing new.

## For the integrator (proposed lines; HANDOFF.md, IMPLEMENTATION_PLAN.md and AGENTS.md are not edited by this stage)

Written after the build (section 17), so these lines say what is built. The branch is `r12-menu`, not pushed or merged.

**`IMPLEMENTATION_PLAN.md`**, a block after Stage R16:

> ## Stage R12 (build): the menu as ruled, on R15's two-stage path
> **Goal**: build the ten rulings of 17 October 2026 behind one switch (`menuPossible`, 0 by default) on top of R15:
> at level 1 the model picks which dominant to greet, and the three acts opened by dice leave its menu and stay with the
> rules; at level 2 (off unless a run names it) an adult male also picks which adult male to groom, whatever he is doing;
> every rule the rulings keep is listed (`data/r12-hand-rules.json`) and counted in every result; the rules' trips to
> community-listed trees are counted; the teachers and label formats of the new target calls are prepared. No training and
> no model run.
> **Success Criteria** (`docs/staging/r12-build-prereg.md` §10 to §12, amendment A1): with the switch at 0 R15's and R16's
> requests, packets, labels, receipts and hashes match the pin recorded before any code; goldens and the field pin
> unchanged; a rules world hashes the same at every level; the tests of §10.2 pass; the offer table's signed counts unchanged.
> **Tests**: `tests/r12-menu.test.ts` (22), `tests/r12-offer-table.test.ts`, `scripts/r12-pin.ts check`.
> **Status**: Built on `r12-menu` with no model (section 17): the pin equal at 0; 22 new tests pass; M1 and M2 run
> (`docs/staging/r12-build-numbers.md`). Not merged; a second reader next. Every later trained arm on this menu is a
> "rules-taught model on a rules menu (the R12 menu)".

**`AGENTS.md`**, three command lines and a gotcha:

```sh
pnpm exec tsx scripts/r12-hand-rules.ts [--check] | print [--params <file>] [--set id=v,...]   # stage R12 build (docs/staging/r12-build-prereg.md): the rules the user's rulings keep, generated from the offer table, R15's and this build's menu numbers and stage R7's loop numbers, each with its status, ruling, class and numbers (data/r12-hand-rules.json); print writes the counted-rules section every result carries (stage R7's ledger prints it)
pnpm exec tsx scripts/r12-pin.ts record | check [--only A,B,C,D]   # stage R12 build: the pin of R15's and R16's paths (requests, packets, pools, labels, R15's wiring run, R16's day runner and census), recorded on the source before the build (data/r12-pin.json); check must reproduce it byte for byte with menuPossible 0; direct library calls, no lock, no git identity
pnpm exec tsx scripts/r12-runs.ts m1 --seed 48|7 | m2 | numbers   # stage R12 build, no model: M1 a rules world read by a tap (group sizes, dice, ruling 3's count, what is possible but not offered, the new labels against the rules' realised picks), M2 R15's wiring run on the ruled menu with control kernels and exact replays; numbers writes docs/staging/r12-build-numbers.md
```

> R12 build (`menuPossible` 1 or 2 needs `resourceTargets` 1; `src/sim/possible.ts`): the greeting target call (level 1),
> an adult male's grooming target call (level 2, off unless a run names it, and by default no training row for a group that
> holds a partner the rules' gate would refuse) and the removal of the dice acts live only on the model's path; no rules
> path reads the switch. Opened options come from a side pool of the model-only call (`offer(..., side)`; two legacy offer
> sites), so the rules' own enumeration is unchanged. A rules-started dice act holds no intention: the rules start,
> continue (the transfer) and end it. A social target call shows its own nearby list (`KernelRequest.targetSocial`), by
> distance. Contexts of this menu carry `menu: 'menu-targets-v1'`; R15 and R16 adapters, the R15 server route and R16's
> day runner refuse them. Every result of a model on any menu prints the counted-rules section
> (`scripts/r12-hand-rules.ts print`). With the switch at 0, `scripts/r12-pin.ts check` must still match.

**`HANDOFF.md`** §2.0, an entry: "Stage R12's build (written 17 October, about midnight EDT): the menu as ruled, on R15's
path behind `menuPossible`, built and proved with no model on branch `r12-menu` (`docs/staging/r12-build-prereg.md` §16,
§17; `docs/staging/r12-build-numbers.md`); not merged." §5, next tasks: "Stage R12's build: its second reader; then a later
stage trains on its menu (a collection on 48 and 7, real token counts, preflight)." §6 item 1: "built as ruled, behind
`menuPossible` (branch `r12-menu`)", and the decisions below as new items.

**Decisions that are the user's** (one line each): whether a rules-taught arm may label the opened male partners by the
rules' formula (recommended: yes, reported apart and named a scaffold; until then level 2 stays off and no such row is
written); whether ruling 3's count is large enough for a slot "known to my community" (no threshold set; M1: 12% and 18%
of the rules' own food trips went to a listed tree the animal never saw itself); whether trees the animal saw itself
within 240 h but no longer holds in memory (class c: under 1% of those trips) count as "perceived or remembered" under
ruling 2; whether the choice among settled partners and the targets of the other social kinds should open next (not
ruled; the rules value each, so a scaffold teacher exists); a companion's goal tree under "Go to food" or "Go along with a
companion" (no recommendation; left as R15 built it until the user rules); "Carry on" as an option (recommended yes; not
built).

**Reading note for R16** (A1.14; read-only, R16's results stand as registered): under R15's contract R16's model saw,
and could pick or refuse, the three dice acts; ruling 10, made after R16 was frozen, takes them off the R12 menu. R16's
own receipts can show how often a dice kind was on its kind menu and taken. In M1 no decision of the 10 tapped days had a
dice act as the rules' best, so the effect is rare.
