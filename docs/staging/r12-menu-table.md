# The menu: what is possible and what is advice (for sign-off)

## 1. In two minutes

The rules decide what the model may choose from in 96 places in the code, each offering one act (rest, feed in this tree, groom this animal, charge that one) behind conditions. To build a menu from what an animal can do, each condition must be called a fact about what is possible or a piece of advice. This is that sorting, for your sign-off: a reading of the code, counted by a script; nothing was run.

| | Places |
|---|---|
| All | 96 |
| Unreachable with today's settings (old branches) | 21 |
| … of them added after the sign-off by stage R12's build, behind its switch and for the model's own pool only (an adult male grooming any adult male in reach; greeting any dominant the conditions allow) | 2 |
| Reached only by animals under 8, for whom the rules decide | 6 |
| **Live for an animal the model decides for** | **69** |
| … open whenever the act is physically possible and the animal perceives what it needs | 6 |
| … those plus who the act is addressed to, and nothing else | 2 |
| … behind a hand rule: advice (58), a timer or quota (25), a dice roll (3); a place can have several | 61 |

What I propose for the 69: 8 need no ruling; 6 would be offered more widely (2 at once, 1 only for the pairs a wild record covers, 3 only if body outcomes are allowed as a teacher); 52 stay on the menu behind their rules, each rule counted as hand-set; 3 stay with the rules.

### The ten rulings I ask for

1. **The dividing line itself.** Is a condition a "social fact" when it only says whom an act is addressed to, and "advice" once it says who may act, toward whom or when? I recommend yes; every count here follows from it.
2. **Which tree.** May the model choose which tree to travel to, among up to eight the animal sees or remembers, instead of the one the rules' ranking leaves? I recommend yes.
3. **Trees no animal has itself seen.** Should it also be offered trees from its community's list that it has never seen? I recommend not yet, counting how often the rules go to one.
4. **Which water, and drinking when not thirsty.** May it choose which water to drink at, and be offered a drink when not thirsty? I recommend yes to the first; the second only once the body's acts have a teacher other than the rules.
5. **Nesting and sheltering whenever possible.** May nesting and sheltering from rain be offered whenever possible? I recommend the same condition as for drinking, and keeping "no new nest in full daylight".
6. **Whom to groom.** May any community member in reach be offered as a grooming partner, whatever it is doing? I recommend yes where wild records can teach the choice (today an adult male among adult males); elsewhere "only a settled partner" stays.
7. **Whom to greet.** Should "pant-grunt only to a dominant" stay a rule? I recommend keeping and counting it, and letting the model choose which dominant.
8. **Strangers: the rules on numbers.** Should the numbers rules for strangers stay (charge only with 3 males and 2 more than theirs)? I recommend keeping and counting them.
9. **Courtship rules.** Should the courtship rules stay (guarding only from the top two ranks; mating only 1.5 hours after his last)? I recommend keeping and counting them.
10. **Dice.** Should the three acts opened by a random roll (gang attack, attack on an infant, transfer) stay with the rules? I recommend yes.

### What stays with the rules

Everything for animals under 8; the three acts opened by a roll; the age line of 12 for aggression, courtship, hunting, patrols, calls and displays; the rules that open every social act (the model chooses among what they offer); the timers after events and "not at night"; and, outside this table, when an act ends, how long a bout lasts and the 25 choices inside execution.

Reasons and method: the sections below.

## 2. The rulings in full, and what stays with the rules

Every condition went into one of six classes: **physical** (the body or the world does not allow the act otherwise), **perceptual** (the animal does not see or remember what the act needs), **social fact** (who the act is addressed to: a community member, its mother, the animal that just charged it), **advice** (a conclusion about who does this, toward whom or when, written as a gate), **quota or timer** (an hours-since rule) and **dice** (opened by a random roll).

Of the 69 live places, 6 are a matter of possibility alone and 61 carry a hand rule. Counting the code as written, old branches and the young included, 85 of the 96 carry advice, a quota or dice. The hand rules of the live places hold 117 numbers by the script's count: 76 number literals and 41 registry values. That count is lexical: a literal is counted once in each condition that carries it, so a threshold written in two conditions counts twice; it includes a few numbers that are not thresholds (a unit conversion, a phase index, the terms of the greeting score, registry switches); and a number inside a function the condition calls is not seen.

A rule is proposed for dropping in two cases only. Either the rules already value every option the rule cut (which tree to travel to, which dominant to greet), so a model taught by the rules can be taught the wider choice: that removes the cut, and the model is still rules-taught. Or a teacher other than the rules exists or may be allowed (wild grooming records for some pairs; the body's own outcomes, a ruling deferred on 10 October), and the rule goes only where that teacher reaches. Everywhere else a model taught by the rules would learn the same rule back from its teacher, so the rule stays in code and is counted.

### The ten rulings

1. **The dividing line itself.** Is it right to call a condition a "social fact" when it only says who the act is addressed to (a community member, its mother, the animal that just charged it, a female in oestrus), and "advice" as soon as it says who may act, toward whom or when (the direction of rank, an age, a sex, a balance of numbers, a threshold)? *Recommended:* yes. Every count on this page follows from that line; a different line moves conditions between the two columns without changing a single rule. *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
2. **Which tree.** May the model choose which tree to travel to among trees shortlisted by what the animal sees and remembers, instead of being shown the one tree left of the four the rules value most? *Recommended:* yes. It is the largest choice no model has ever made (about 51 trees possible, one shown), and the rules value every tree, so a scaffold teacher exists. The shortlist's own numbers are counted as hand-set. (rows 15, 21 of the table) *Ruled:* 17 October 2026: "the model picks the tree" (the user's words; IMPLEMENTATION_PLAN.md, User decisions (17 October 2026)). Built by stage R15 behind resourceTargets.
3. **Trees no animal has itself seen.** Should the model also be offered trees from its community's list, which no single animal remembers? *Recommended:* not in the first build: its own view and memory only, with a count of how often the rules themselves travel to a listed tree. If that count is large, add one slot labelled "known to my community". (row 21 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
4. **Which water, and drinking when not thirsty.** May a drink be offered at any remembered water whenever one is remembered, instead of only when the thirst gauge is above zero and only at the one water the rules value most? *Recommended:* the choice of water: yes. Offering a drink without thirst: only once a teacher that is not the rules exists for the body's acts (forked body outcomes, the ruling deferred on 10 October); until then that rule stays and is counted. (row 19 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
5. **Nesting and sheltering whenever possible.** May "build a nest" and "shelter from the rain" be offered whenever physically possible, instead of only when the rules' own value says so (the nest's value above 0.25, the body colder than neutral)? *Recommended:* as for water: yes once a body-outcome teacher is allowed, counted until then. Keep the light condition on starting a nest (none in full daylight): an earlier stage offered nests at any light and day nests took a third of the daytime. (rows 2, 7 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
6. **Whom to groom.** May any community member in reach be offered as a grooming partner, whatever it is doing, instead of only those resting, grooming, sheltering or nursing? *Recommended:* yes, where a teacher that is not the rules can teach the choice, and only there. Wild records of whom a male grooms are in hand (Ngogo: an adult male among the adult males present); Taï's are approved for download and count once checked. For every other pair "only a settled partner" stays a rule and is counted: a model taught by the rules would learn it back. (row 26 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
7. **Whom to greet.** A pant-grunt is offered only toward an animal that outranks the greeter, and only toward the one such animal the rules score highest. Should the direction rule stay? *Recommended:* keep "only to a dominant" for now and count it: no wild record of greetings is in hand, so a model taught by the rules would learn the same rule from its labels. Let the model choose which dominant. The direction of greetings then stays true by construction and may not be credited to the model. (row 36 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
8. **Strangers: the rules on numbers.** A charge at strangers needs at least 3 males of one's own and 2 more than theirs; with fewer, the only options are to display, call back or retreat, each by its own count. Should these stay rules? *Recommended:* keep and count them. The acts are rare and dangerous, no teacher exists, and the counts are already shown to the model as facts. (rows 64, 66, 67, 68, 69, 70, 71, 72 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
9. **Courtship rules.** Guarding a female is offered only to the top two ranks, a consortship only to a male who is not the alpha and has a bond with her, coercion only toward a female near full swelling, and mating only 1.5 hours after the male's last copulation. Should these stay rules? *Recommended:* keep and count them. The quota has a built replacement (the paternity mechanism, off on the working base); adopting it is a decision about the base, not about the menu. (rows 53, 74, 75, 76, 77 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).
10. **Dice.** A gang attack, an attack on an infant and a female's transfer to another community are opened by a random roll and then offered at a fixed high score. Should they stay with the rules? *Recommended:* yes. They stay hazards, decided by the rules and reported as the rules' acts. No record can teach a once-in-a-lifetime act, and an untaught model would set its rate by accident. (rows 43, 49, 65 of the table) *Ruled:* 17 October 2026, 22:12 EDT: "yes to the recomendations" (the user's words, to the recommendation above; IMPLEMENTATION_PLAN.md, User decision (17 October 2026, 22:12 EDT)).

### What stays with the rules, and why

- Every act of an animal under 8. The rules decide for them (about a quarter of all decision points), and every result says so.
- The acts opened by a roll (gang attack, infanticide, transfer): the rules open them and the rules decide them.
- The age line of 12. Aggression, courtship, hunting, patrols, calls and displays are offered only from 12: an animal of 8 to 11 on the model is never shown them. Kept and counted.
- Every contest, coalition, courtship, hunting, patrol, sharing and repair act: it stays on the model's menu behind the rules that open it today, each rule counted as hand-set. The model chooses among what is offered; no teacher but the rules exists for offering more.
- Timers. The windows after an event (about 2 minutes to answer a threat, 0.3 h to answer a call or to reconcile) and the "once per event" marks stay as numbers and are counted. The cooldowns after aggression and display are already out on the working base.
- "Not at night": the light conditions on party following, displays, aggression and avoidance stay.
- Inside `offer()` itself, so in front of every place and not counted per place: an option the rules score at −0.4 or below is not offered; each act keeps one to three targets by the rules' score; and an animal on a silent patrol is offered no call and no display (the patrol's silence, on in the working base). The design says which of these go for which acts (`docs/staging/r12-prereg.md` §5.4).
- Outside this table, in other files: when an act ends, how long a bout lasts, the 25 choices made inside execution (the nest tree, the patrol's route, who captures, the mother's refusal to nurse, calls on arrival), contest outcomes, and who is alerted to a conflict.

## 3. How this was made, and how to read the table

Generated by `scripts/r12-offer-table.ts` from `src/sim/candidates.ts` (sha256 066d4a0fbe52…) and the classification in `data/r12-offer-classes.json`, on the working base `docs/staging/integrator-kit/params/M6-W50.json` (field map). The script reads the source as text; it runs no simulation and no model. **Every count is computed. Every class is a reading of the code by the stage's author, kept in the classification file: that reading is what is put up for sign-off.** A place where the rules offer an option is called an offer site below. The sites cover 29 actions and 22 kinds of activity. Design: `docs/staging/r12-prereg.md`.

- **A condition** is one conjunct of an `if` in front of an offer, the negation of an earlier branch or of a `continue`/`return` guard, a loop the offer stands in, or the same for every call of the helper function it stands in. A local name is opened to its definition (`name := …`).
- **Classes.** PHY = PHYSICAL; PER = PERCEPTUAL; SOC = SOCIAL FACT; ADV = ADVICE; QUO = QUOTA OR TIMER; DIC = DICE; SWI = SWITCH. A SWITCH is a registry switch or a diagnostic hook: on a given base it is simply true or false. A site whose every path stands behind a switch that is false on the working base is **legacy**.
- **The rule for SOCIAL FACT against ADVICE** (the judgement the user signs): a condition is a social fact when it only says who or what the act is addressed to and the act has no object without it (a member of its community, its mother, the animal that charged it, the female in oestrus a courtship is about). It is advice as soon as it says who may do the act, in which direction of rank, at which age, with which numbers on its side, above which bond, hunger or swelling, or at which time of day, or when it is the sign of the rules' own value. Kinship, rank and oestrus are shown to the model as beliefs either way; the class says whether the code also enforces them.
- **"Always from 8"**: the condition holds for every animal aged 8 or over, so it gates nothing for an animal a kernel decides for. **"Not read on the base"**: a switch of the working base has taken the condition out.
- **Proposal** for each advice, quota and dice condition: *keep* = keep as a rule for now, counted as hand-set; *drop* = drop; the kernel decides with the fact shown; *rules* = leave the whole act with the rules. A site's line in the summary follows from its conditions: one "rules" leaves the act with the rules; else one "drop" widens it; else it stays behind its rules.
- **Teacher**: who could teach a model the choice once it is offered. *rules* = the rules' own judgment (scaffold); *wild-groom* = wild choice records in hand (whom a Ngogo male grooms); *tai-groom* = Taï grooming partner choice, once downloaded and checked; *budongo* = Budongo party scans, once downloaded and checked; *kanyawara* = Kanyawara female coalition partners, once downloaded and checked; *body* = forked body outcomes, if the user allows them; *none* = none.

## 4. The table: one row per offer site

| # | Line | The act, in plain words | Action (variants) | Kind | Status | Classes it carries | Proposal | Teacher |
|---|---|---|---|---|---|---|---|---|
| 1 | 286 | Stay in its own finished nest | nest (NONE) | nest | live | PHY | nothing to rule: possible is offered | rules, body |
| 2 | 287 | Build a night nest, or go on building one | nest (NONE) | nest | live | PHY ADV | offered more widely: a rule is dropped (only once body outcomes are allowed as a teacher) | rules, body |
| 3 | 416 | Sleep in its mother's nest (a dependent) | nest (MOTHER) | nest | young | (PHY PER) | the rules (under 8) | rules |
| 4 | 419 | Rest where it is | rest (NONE) | rest | live | PHY | nothing to rule: possible is offered | rules, body |
| 5 | 420 | Rest (without the body clock) | rest (NONE) | rest | legacy | (PHY) | – | rules |
| 6 | 421 | Rest outside a nest in the dark (without the body clock) | rest (NONE) | rest | legacy | (PHY) | – | rules |
| 7 | 422 | Sit hunched out of the rain | shelter (NONE) | rest | live | PHY ADV | offered more widely: a rule is dropped (only once body outcomes are allowed as a teacher) | rules, body |
| 8 | 423 | Shelter from the rain (without the heat mechanism) | shelter (NONE) | rest | legacy | (PHY ADV) | – | rules |
| 9 | 429 | Ride on its mother (a carried infant) | follow (MOTHER) | keep_with_party | young | (PHY) | the rules (under 8) | rules |
| 10 | 430 | Keep up with its mother (a dependent on the ground) | follow (MOTHER) | keep_with_party | young | (PHY) | the rules (under 8) | rules |
| 11 | 442 | Ask its mother to nurse | nurse (NONE) | nurse | young | (PHY SOC QUO) | the rules (under 8) | rules |
| 12 | 447 | Beg plant food from its feeding mother (a dependent) | beg (PLANT) | share_food | young | (PHY PER ADV) | the rules (under 8) | rules |
| 13 | 448 | Pick at food where it is (a dependent off its mother) | forage (NONE) | eat_here | young | (PHY ADV) | the rules (under 8) | rules |
| 14 | 453 | Keep up with its guardian (a weaned juvenile) | follow (JUVENILE) | keep_with_party | live | PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 15 | 552 | Feed in a fruit tree in view | forage (NONE) | eat_here | live | PER | nothing to rule: possible is offered | rules, body |
| 16 | 563 | Feed on leaves and pith where it stands (valued through the gut) | forage (NONE) | eat_here | legacy | (PHY) | – | rules |
| 17 | 564 | Feed on leaves and pith where it stands | forage (NONE) | eat_here | live | – | nothing to rule: possible is offered | rules, body |
| 18 | 593 | Go to a remembered fruit tree (every one offered: the small map's route) | travel (TREE) | go_to_food | legacy | (PHY PER QUO) | – | rules |
| 19 | 597 | Go and drink at a remembered water | drink (NONE) | drink | live | PER ADV | offered more widely: a rule is dropped (only once body outcomes are allowed as a teacher) | rules, body |
| 20 | 640 | Go to the remembered tree with the most believed value per metre (route chaining) | travel (TREE) | go_to_food | legacy | (PHY PER ADV QUO) | – | rules |
| 21 | 648 | Go to a fruit tree out of view, remembered or on the community's list | travel (TREE) | go_to_food | live | PHY PER ADV | offered more widely: a rule is dropped | rules, body |
| 22 | 665 | Go toward a pant-hoot heard (the older valuation) | travel (CALLER) | keep_with_party | legacy | (PHY PER ADV QUO) | – | rules |
| 23 | 691 | Go toward a community member's pant-hoot | travel (CALLER) | keep_with_party | live | PER ADV QUO | stays on the menu behind its rules, counted | rules, budongo |
| 24 | 701 | Go back toward the middle of its range | travel (HOME) | go_home | live | ADV | stays on the menu behind its rules, counted | rules |
| 25 | 704 | Climb in a tree in view (play) | climb (NONE) | play | live | PER ADV | stays on the menu behind its rules, counted | rules |
| 26 | 810 | Groom an animal in view | groom (ACCEPT, COALITION, NONE) | groom | live | PHY PER SOC ADV | offered more widely: a rule is dropped (only for the pairs a wild choice record covers) | wild-groom, tai-groom, rules |
| 27 | 813 | Groom an adult male in reach, whatever he is doing (an adult male's own pool on the model's path) | groom (ACCEPT, COALITION, NONE) | groom | legacy | (PHY PER SOC ADV) | – | wild-groom, rules |
| 28 | 822 | Play with a young peer in view | play (ACCEPT, NONE) | play | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 29 | 825 | Play with a youngster (an adult) | play (ACCEPT, NONE) | play | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 30 | 833 | Move away from a tense dominant who comes close | flee (AVOID) | escape | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 31 | 845 | Go along on a companion's trip to a food tree | travel (TREE) | keep_with_party | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules, budongo |
| 32 | 852 | Go to a companion's goal tree (before joining was a choice) | travel (TREE) | keep_with_party | legacy | (PHY PER SOC ADV) | – | rules |
| 33 | 853 | Follow a companion who is walking off | follow (PARTY) | keep_with_party | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules, budongo |
| 34 | 858 | Stay near an adult male (a recently immigrated female) | follow (PARTY) | keep_with_party | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 35 | 872 | Pant-grunt to any dominant in reach the conditions allow (the model's own pool) | pant-grunt (NONE) | greet_or_appease | legacy | (PHY PER SOC ADV QUO) | – | rules |
| 36 | 881 | Pant-grunt to a dominant in reach | pant-grunt (NONE) | greet_or_appease | live | PHY PER SOC ADV QUO | offered more widely: a rule is dropped | rules |
| 37 | 888 | Join the trip of a companion heard giving a travel hoo, out of view | travel (TREE) | keep_with_party | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules, budongo |
| 38 | 898 | Rain display at the onset of a storm | display (RAIN) | contest | live | ADV QUO | stays on the menu behind its rules, counted | rules |
| 39 | 900 | Rain display (opened by a roll) | display (RAIN) | contest | legacy | (PHY ADV QUO DIC) | – | none |
| 40 | 908 | Charging display: at a rival, at a reunion, or undirected | display (RIVAL, REUNION, NONE) | contest | live | ADV | stays on the menu behind its rules, counted | rules |
| 41 | 933 | Give alarm calls at a snake | alarm (SNAKE) | escape | live | PHY PER | nothing to rule: possible is offered | rules |
| 42 | 934 | Back away from a snake | flee (SNAKE) | escape | live | PHY PER | nothing to rule: possible is offered | rules |
| 43 | 939 | Leave for a neighbouring community | transfer (NONE) | emigrate | live | DIC | stays with the rules | none |
| 44 | 997 | Go to her dead infant and take it up | follow (BODY) | keep_with_party | legacy | (PHY PER SOC ADV) | – | none |
| 45 | 998 | Groom a dead infant's body | groom (BODY) | groom | legacy | (PHY PER SOC ADV) | – | none |
| 46 | 1001 | Walk up to a dead infant's body and look | follow (BODY) | keep_with_party | legacy | (PHY PER SOC ADV QUO) | – | none |
| 47 | 1156 | Charge a rival male over status | charge (STATUS) | contest | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 48 | 1161 | Attack a close rival (opened by a roll) | attack (ESCALATE) | contest | legacy | (PHY PER ADV QUO DIC) | – | none |
| 49 | 1172 | Attack an infant (opened by a roll) | attack (INFANTICIDE) | contest | live | PHY PER ADV QUO DIC | stays with the rules | none |
| 50 | 1188 | Charge a lower-ranked bystander after losing a contest | charge (REDIRECT) | contest | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 51 | 1191 | Attack a male close to it in rank | attack (ESCALATE) | contest | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 52 | 1197 | Charge a subordinate it holds a grudge against | charge (TENSION) | contest | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 53 | 1203 | Charge a swollen female (coercion) | charge (COERCE) | contest | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 54 | 1213 | Charge a recently immigrated female (a resident female) | charge (IMMIGRANT) | contest | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 55 | 1225 | Supplant a subordinate that is feeding when fruit is scarce | charge (FEED) | contest | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 56 | 1232 | Charge an adult female (an adolescent male) | charge (FEMALE_DOM) | contest | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 57 | 1240 | Charge the animal attacking its ward | charge (DEFEND) | back_ally_or_defend | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 58 | 1255 | Join an ally's conflict: charge its opponent | charge (COALITION) | back_ally_or_defend | live | PHY PER ADV QUO | stays on the menu behind its rules, counted | kanyawara, rules |
| 59 | 1260 | Chase a rival away from the female it guards | charge (GUARD) | contest | live | PHY PER ADV | stays on the menu behind its rules, counted | rules |
| 60 | 1283 | Crouch and submit to the animal threatening it | submit (AGGRESSOR) | greet_or_appease | live | PHY PER SOC QUO | stays on the menu behind its rules, counted | rules |
| 61 | 1284 | Flee from the animal threatening it | flee (AGGRESSOR) | escape | live | PHY PER SOC QUO | stays on the menu behind its rules, counted | rules |
| 62 | 1287 | Charge back at the animal threatening it | charge (COUNTER) | back_ally_or_defend | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 63 | 1288 | Fight back against an attacker at arm's length | attack (FIGHTBACK) | back_ally_or_defend | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 64 | 1319 | Charge at strangers in view | charge (STRANGER) | confront_strangers | live | PHY PER ADV | stays on the menu behind its rules, counted | rules |
| 65 | 1320 | Gang attack on a lone stranger (opened by a roll) | attack (GANG) | confront_strangers | live | PHY PER ADV DIC | stays with the rules | none |
| 66 | 1322 | Retreat from strangers in view (outnumbered or fearful) | flee (STRANGERS) | avoid_strangers | live | PHY PER ADV | stays on the menu behind its rules, counted | rules |
| 67 | 1324 | Display at strangers in view (even numbers) | display (STRANGER) | confront_strangers | live | PHY PER ADV | stays on the menu behind its rules, counted | rules |
| 68 | 1324 | Pant-hoot back at strangers in view (even numbers) | call (COUNTERCALL) | confront_strangers | live | PHY PER ADV | stays on the menu behind its rules, counted | rules |
| 69 | 1325 | Retreat from strangers in view (a female, even numbers) | flee (STRANGERS) | avoid_strangers | live | PHY PER ADV | stays on the menu behind its rules, counted | rules |
| 70 | 1340 | Approach stranger calls heard | patrol (APPROACH) | confront_strangers | live | PER ADV QUO | stays on the menu behind its rules, counted | rules |
| 71 | 1341 | Pant-hoot back at stranger calls heard | call (COUNTERCALL) | confront_strangers | live | PER ADV QUO | stays on the menu behind its rules, counted | rules |
| 72 | 1342 | Move away from stranger calls heard | flee (HEARD) | avoid_strangers | live | PER ADV QUO | stays on the menu behind its rules, counted | rules |
| 73 | 1355 | Stay on its consortship | consort (CONTINUE) | court | live | PHY ADV | stays on the menu behind its rules, counted | rules |
| 74 | 1370 | Court and mate with a female in oestrus (a male) | mate (ACCEPT, NONE) | court | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 75 | 1374 | Mate-guard a swollen female | guard (NONE) | court | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 76 | 1384 | Lead a female on a consortship | consort (NONE) | court | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 77 | 1398 | Present to and mate with a male (a female in oestrus) | mate (ACCEPT, NONE) | court | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 78 | 1399 | Go along on a male's consortship | consort (ACCEPT) | court | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 79 | 1429 | Beg meat from an animal holding some | beg (MEAT) | share_food | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 80 | 1433 | Share meat with an animal begging from it | share (MEAT) | share_food | live | PHY PER SOC | nothing to rule: possible is offered | rules |
| 81 | 1435 | Share plant food with its begging ward | share (PLANT) | share_food | live | PHY PER SOC | nothing to rule: possible is offered | rules |
| 82 | 1445 | Join a hunt of red colobus under way | hunt (JOIN) | hunt | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 83 | 1458 | Start a hunt of red colobus | hunt (LEAD) | hunt | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 84 | 1465 | Start a hunt (the older, quota-gated valuation) | hunt (LEAD) | hunt | legacy | (PHY PER SOC ADV QUO) | – | rules |
| 85 | 1481 | Reconcile with its last opponent | reconcile (NONE) | make_up | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 86 | 1493 | Console the victim of a recent attack | console (NONE) | make_up | live | PHY PER SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 87 | 1511 | Carry on with the border patrol | patrol (CONTINUE) | confront_strangers | live | PHY SOC ADV | stays on the menu behind its rules, counted | rules |
| 88 | 1514 | Join the border patrol under way | patrol (JOIN) | confront_strangers | live | PHY PER SOC ADV | stays on the menu behind its rules, counted | rules |
| 89 | 1515 | Join the patrol (the older valuation by sex) | patrol (JOIN) | confront_strangers | legacy | (PHY PER SOC ADV) | – | rules |
| 90 | 1523 | Lead a border patrol | patrol (LEAD) | confront_strangers | live | SOC ADV QUO | stays on the menu behind its rules, counted | rules |
| 91 | 1528 | Lead a patrol (opened by the patrol hazard's roll) | patrol (LEAD) | confront_strangers | legacy | (PHY SOC ADV QUO DIC) | – | none |
| 92 | 1538 | Pant-hoot | call (CONTACT) | call | live | ADV | stays on the menu behind its rules, counted | rules |
| 93 | 1539 | Food call at a rich tree (older) | call (FOODCALL) | call | legacy | (PHY ADV QUO) | – | rules |
| 94 | 1540 | Join the dawn or dusk chorus (older) | call (CHORUS) | call | legacy | (PHY ADV QUO) | – | rules |
| 95 | 1541 | Pant-hoot at a reunion (a male) | call (REUNION) | call | live | PER ADV | stays on the menu behind its rules, counted | rules |
| 96 | 1547 | Contact pant-hoot when alone (older) | call (CONTACT) | call | legacy | (PHY ADV QUO) | – | rules |

Classes in brackets are those of a site that is not live (as written). Line numbers are those of `src/sim/candidates.ts` at the hash above.

### By kind of activity (live sites)

| Kind | Sites | Possible only | With a social fact only | Advice, quota or dice | Stays with the rules |
|---|---|---|---|---|---|
| avoid_strangers | 3 | 0 | 0 | 3 | 0 |
| back_ally_or_defend | 4 | 0 | 0 | 4 | 0 |
| call | 2 | 0 | 0 | 2 | 0 |
| confront_strangers | 9 | 0 | 0 | 9 | 1 |
| contest | 12 | 0 | 0 | 12 | 1 |
| court | 6 | 0 | 0 | 6 | 0 |
| drink | 1 | 0 | 0 | 1 | 0 |
| eat_here | 2 | 2 | 0 | 0 | 0 |
| emigrate | 1 | 0 | 0 | 1 | 1 |
| escape | 4 | 2 | 0 | 2 | 0 |
| go_home | 1 | 0 | 0 | 1 | 0 |
| go_to_food | 1 | 0 | 0 | 1 | 0 |
| greet_or_appease | 2 | 0 | 0 | 2 | 0 |
| groom | 1 | 0 | 0 | 1 | 0 |
| hunt | 2 | 0 | 0 | 2 | 0 |
| keep_with_party | 6 | 0 | 0 | 6 | 0 |
| make_up | 2 | 0 | 0 | 2 | 0 |
| nest | 2 | 1 | 0 | 1 | 0 |
| play | 3 | 0 | 0 | 3 | 0 |
| rest | 2 | 1 | 0 | 1 | 0 |
| share_food | 3 | 0 | 2 | 1 | 0 |

## 5. Every site, with its conditions as written

### 1. Stay in its own finished nest (`src/sim/candidates.ts:286`)

`offer('nest', c.nest.treeId, …)` in `offerOwnNest`; kind: nest; key `offerOwnNest/nest/NONE#1`, print `7b279120`. **live**; carries physical; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

Reached through offerOwnNest() called at line 417 (this way is closed on the working base):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `c.age >= 3`: it is 3 or older (a hand-set age: from then it builds its own nest) *(always from 8; proposal: keep)*
- **SWI** `!race | race := P.departRace === 1`: the dawn race for food is off [departRace = 1] *(**false on the base**)*
- **PHY** `c.action === 'nest'` (through `inNest`): it is nesting
- **PHY** `x.phase >= 2` (through `inNest`): its nest is finished and it lies in it
- **PHY** `c.nest !== null` (through `inNest`): it has a nest
- **PHY** `c.nest`: it has a nest

Reached through offerOwnNest() called at line 707:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `P.departRace === 1` (through `race`): the dawn race for food is on [departRace = 1] *(true on the base)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `c.age >= 3`: it is 3 or older (a hand-set age: from then it builds its own nest) *(always from 8; proposal: keep)*
- **PHY** `c.action === 'nest'` (through `inNest`): it is nesting
- **PHY** `x.phase >= 2` (through `inNest`): its nest is finished and it lies in it
- **PHY** `c.nest !== null` (through `inNest`): it has a nest
- **PHY** `c.nest`: it has a nest

Number literals in its conditions: 3, 2. Hand-set numbers in its advice, quota and dice conditions: 0.

### 2. Build a night nest, or go on building one (`src/sim/candidates.ts:287`)

`offer('nest', t.id, …)` in `offerOwnNest`; kind: nest; key `offerOwnNest/nest/NONE#2`, print `c39535b7`. **live**; carries physical, advice; offered more widely: a rule is dropped (only once body outcomes are allowed as a teacher). Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

*Chosen by code before the offer:* The tree: one of the trees tall enough within reach, by a formula of distance, height and a hash that avoids last night's tree (`chooseNestTree`); 11.7 stand in reach on average (R7 ledger).

Reached through offerOwnNest() called at line 417 (this way is closed on the working base):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `c.age >= 3`: it is 3 or older (a hand-set age: from then it builds its own nest) *(always from 8; proposal: keep)*
- **SWI** `!race | race := P.departRace === 1`: the dawn race for food is off [departRace = 1] *(**false on the base**)*
- **PHY** `NOT inNest && c.nest | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null`: it is not lying in a finished nest
- **ADV** `drive > 0.25 | drive := company ? nestDrive + company : nestDrive | company := P.nestCompany === 1 && inNest && !caretaker && c.age >= 5 ? nestCompanyValue(world, c, P, asleepOnly) : 0 | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null | caretaker := dependentOn(world, c) | asleepOnly := P.choiceBelief === 1 || (P.choiceBelief === 2 && dayPhase(world) === 'day')`: the nest's own value (rest, sleepiness and the company of nest-mates) is above 0.25: the rules' value used as a gate [nestCompany = 1, choiceBelief = 2] *(proposal: drop, shown in `body (sleepiness and body clock) and now (the light)`, only once body outcomes are allowed as a teacher)*
- **ADV** `open | open := rS ? env.daylight < 1 : hour >= 12 || night | rS := P.rhythmSleep === 1 | night := env.daylight < 0.1`: a new nest may be started only when daylight is below full (with the sleep mechanism, as on the base; otherwise from 12:00 or at night) [rhythmSleep = 1] *(proposal: keep)*
- **PHY** `t | t := c.action === 'nest' && isTreeId(c.targetId) ? index(world).treeById.get(c.targetId) : chooseNestTree(world, c)`: a tree to nest in exists: the one it is building in, or one tall enough within reach (which one is chosen by a formula)

Reached through offerOwnNest() called at line 707:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `P.departRace === 1` (through `race`): the dawn race for food is on [departRace = 1] *(true on the base)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `c.age >= 3`: it is 3 or older (a hand-set age: from then it builds its own nest) *(always from 8; proposal: keep)*
- **PHY** `NOT inNest && c.nest | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null`: it is not lying in a finished nest
- **ADV** `drive > 0.25 | drive := (company ? nestDrive + company : nestDrive) - raceG | company := P.nestCompany === 1 && inNest && !caretaker && c.age >= 5 ? nestCompanyValue(world, c, P, asleepOnly) : 0 | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null | caretaker := dependentOn(world, c) | asleepOnly := P.choiceBelief === 1 || (P.choiceBelief === 2 && dayPhase(world) === 'day')`: the nest's own value, less what waiting would lose of a contested crop, is above 0.25: the rules' value used as a gate [nestCompany = 1, choiceBelief = 2] *(proposal: drop, shown in `body (sleepiness and body clock) and now (the light)`, only once body outcomes are allowed as a teacher)*
- **ADV** `open | open := rS ? env.daylight < 1 : hour >= 12 || night | rS := P.rhythmSleep === 1 | night := env.daylight < 0.1`: a new nest may be started only when daylight is below full (with the sleep mechanism, as on the base; otherwise from 12:00 or at night) [rhythmSleep = 1] *(proposal: keep)*
- **PHY** `t | t := c.action === 'nest' && isTreeId(c.targetId) ? index(world).treeById.get(c.targetId) : chooseNestTree(world, c)`: a tree to nest in exists: the one it is building in, or one tall enough within reach (which one is chosen by a formula)

Number literals in its conditions: 3, 2, 0.25, 5, 12, 0.1. Hand-set numbers in its advice, quota and dice conditions: 8.

### 3. Sleep in its mother's nest (a dependent) (`src/sim/candidates.ts:416`)

`offer('nest', caretaker.targetId, …, V.MOTHER)` in `computeCandidates`; kind: nest; key `computeCandidates/nest/MOTHER#1`, print `0abbc22b`. **young only: no animal aged 8 or over reaches it**. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `dependentOn(world, c)` (through `caretaker`): it is a dependent: unweaned, under 6, with a living caretaker *(never from 8)*
- **PER** `caretaker.action === 'nest' | caretaker := dependentOn(world, c)`: its caretaker is nesting
- **PHY** `isTreeId(caretaker.targetId) | caretaker := dependentOn(world, c)`: the caretaker's nest is in a tree

### 4. Rest where it is (`src/sim/candidates.ts:419`)

`offer('rest', -1, …)` in `computeCandidates`; kind: rest; key `computeCandidates/rest/NONE#1`, print `d4548d05`. **live**; carries physical; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `circadianOn(P)` (through `circ`): the body clock mechanism is on *(true on the base)*
- **PHY** `!inNest | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null`: it is not lying in its finished nest (there it rests by staying)

Number literals in its conditions: 2. Hand-set numbers in its advice, quota and dice conditions: 0.

### 5. Rest (without the body clock) (`src/sim/candidates.ts:420`)

`offer('rest', -1, …)` in `computeCandidates`; kind: rest; key `computeCandidates/rest/NONE#2`, print `4c0a0b92`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!circ | circ := circadianOn(P)`; `!dark | dark := darkOn(P)`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `!circ | circ := circadianOn(P)`: the body clock mechanism is off *(**false on the base**)*
- **SWI** `!dark | dark := darkOn(P)`: the cost of darkness is off *(**false on the base**)*

### 6. Rest outside a nest in the dark (without the body clock) (`src/sim/candidates.ts:421`)

`offer('rest', -1, …)` in `computeCandidates`; kind: rest; key `computeCandidates/rest/NONE#3`, print `214bba69`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!circ | circ := circadianOn(P)`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `!circ | circ := circadianOn(P)`: the body clock mechanism is off *(**false on the base**)*
- **SWI** `darkOn(P)` (through `dark`): the cost of darkness is on *(true on the base)*
- **PHY** `!inNest | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null`: it is not lying in its finished nest (there it rests by staying)

Number literals in its conditions: 2.

### 7. Sit hunched out of the rain (`src/sim/candidates.ts:422`)

`offer('shelter', -1, …)` in `computeCandidates`; kind: rest; key `computeCandidates/shelter/NONE#1`, print `27282d55`. **live**; carries physical, advice; offered more widely: a rule is dropped (only once body outcomes are allowed as a teacher). Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `P.rhythmHeat === 1` (through `rH`): the heat mechanism is on [rhythmHeat = 1] *(true on the base)*
- **PHY** `rain >= 0.12 | rain := env.rain`: it is raining (rain at 0.12 or more; a hand-set number)
- **PHY** `!inNest | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null`: it is not lying in its finished nest (there it rests by staying)
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `cold > 0`: its body is colder than neutral (thermal load below zero): sheltering is offered only then *(proposal: drop, shown in `body (temperature) and now (the weather)`, only once body outcomes are allowed as a teacher)*

Number literals in its conditions: 0.12, 2. Hand-set numbers in its advice, quota and dice conditions: 0.

### 8. Shelter from the rain (without the heat mechanism) (`src/sim/candidates.ts:423`)

`offer('shelter', -1, …)` in `computeCandidates`; kind: rest; key `computeCandidates/shelter/NONE#2`, print `bfc277bf`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!rH | rH := P.rhythmHeat === 1`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `!rH | rH := P.rhythmHeat === 1`: the heat mechanism is off [rhythmHeat = 1] *(**false on the base**)*
- **PHY** `rain >= 0.3 | rain := env.rain`: it is raining (rain at 0.3 or more)
- **PHY** `!inNest | inNest := c.action === 'nest' && x.phase >= 2 && c.nest !== null`: it is not lying in its finished nest (there it rests by staying)
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*

Number literals in its conditions: 0.3, 2, 0.1.

### 9. Ride on its mother (a carried infant) (`src/sim/candidates.ts:429`)

`offer('follow', caretaker.id, …, V.MOTHER)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/follow/MOTHER#1`, print `21af5fdb`. **young only: no animal aged 8 or over reaches it**. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `dependentOn(world, c)` (through `caretaker`): it is a dependent: unweaned, under 6, with a living caretaker *(never from 8)*
- **PHY** `carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is being carried *(never from 8)*

### 10. Keep up with its mother (a dependent on the ground) (`src/sim/candidates.ts:430`)

`offer('follow', caretaker.id, …, V.MOTHER)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/follow/MOTHER#2`, print `04cf8e6c`. **young only: no animal aged 8 or over reaches it**. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `dependentOn(world, c)` (through `caretaker`): it is a dependent: unweaned, under 6, with a living caretaker *(never from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*

### 11. Ask its mother to nurse (`src/sim/candidates.ts:442`)

`offer('nurse', caretaker.id, …)` in `computeCandidates`; kind: nurse; key `computeCandidates/nurse/NONE#1`, print `6acc63b5`. **young only: no animal aged 8 or over reaches it**. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `dependentOn(world, c)` (through `caretaker`): it is a dependent: unweaned, under 6, with a living caretaker *(never from 8)*
- **SOC** `caretaker.id === c.motherId | caretaker := dependentOn(world, c)` (through `isMother`): its caretaker is its mother
- **QUO** `weanOutcomeOn(P) || c.age < x.weanAge + 0.3`: it is younger than its weaning age (an age drawn at birth) plus 0.3 years *(proposal: keep)*
- **QUO** `!asked | asked := P.weanDecide === 1 && driveOn(P) && x.wr !== undefined && caretaker.decisionVersion === x.wr | caretaker := dependentOn(world, c)`: after a refusal it asks again only once its mother has begun another act [weanDecide = 1] *(proposal: keep)*

Number literals in its conditions: 0.3.

### 12. Beg plant food from its feeding mother (a dependent) (`src/sim/candidates.ts:447`)

`offer('beg', caretaker.id, …, V.PLANT)` in `computeCandidates`; kind: share_food; key `computeCandidates/beg/PLANT#1`, print `3c47116f`. **young only: no animal aged 8 or over reaches it**. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `dependentOn(world, c)` (through `caretaker`): it is a dependent: unweaned, under 6, with a living caretaker *(never from 8)*
- **ADV** `c.age >= 1`: it is 1 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `caretaker.action === 'forage' | caretaker := dependentOn(world, c)`: its caretaker is feeding
- **PER** `d < P.begPlantRangeM`: its caretaker is within reach [begPlantRangeM = 5]
- **ADV** `h > 0.35 | h := c.hunger`: its hunger is above 0.35 *(proposal: keep)*

Number literals in its conditions: 1, 0.35.

### 13. Pick at food where it is (a dependent off its mother) (`src/sim/candidates.ts:448`)

`offer('forage', -1, …)` in `computeCandidates`; kind: eat_here; key `computeCandidates/forage/NONE#1`, print `c288afc7`. **young only: no animal aged 8 or over reaches it**. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `dependentOn(world, c)` (through `caretaker`): it is a dependent: unweaned, under 6, with a living caretaker *(never from 8)*
- **ADV** `c.age >= 1.2`: it is 1.2 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*

Number literals in its conditions: 1.2.

### 14. Keep up with its guardian (a weaned juvenile) (`src/sim/candidates.ts:453`)

`offer('follow', m.id, …, V.JUVENILE)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/follow/JUVENILE#1`, print `527690d4`. **live**; carries perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `c.age < P.juvenileFollowMaxAgeY`: it is younger than the age up to which a juvenile keeps up with its guardian [juvenileFollowMaxAgeY = 10] *(proposal: keep)*
- **SOC** `guardianOf(world, c)` (through `m`): it has a living guardian in its community (its mother, or an adoptive caretaker)
- **PER** `x.seen.includes(m.id) || remembersChimp(c, m.id) | m := guardianOf(world, c)` (through `known`): it sees or remembers its guardian

### 15. Feed in a fruit tree in view (`src/sim/candidates.ts:552`)

`offer('forage', t.id, …)` in `computeCandidates`; kind: eat_here; key `computeCandidates/forage/NONE#2`, print `7655d0b4`. **live**; carries perceptual; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

*Chosen by code before the offer:* Nothing at the offer: every tree in view is offered. Afterwards the slot cap keeps the three the rules score highest and the menu shows one (`offer`, `boundedCandidates`).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker || (c.age >= 1.5 && !carried && caretaker.action === 'forage') | caretaker := dependentOn(world, c) | carried := caretaker ? isCarried(c, caretaker) : false`: it is not a dependent (or it is a dependent of 1.5 or more, on the ground, whose caretaker is feeding) *(always from 8)*
- **PER** `EACH of x.trees`: each fruit tree in view
- **ADV** `NOT caretaker && caretaker.targetId !== t.id | caretaker := dependentOn(world, c)`: a dependent feeds only in its caretaker's tree *(always from 8; proposal: keep)*

Number literals in its conditions: 1.5. Hand-set numbers in its advice, quota and dice conditions: 0.

### 16. Feed on leaves and pith where it stands (valued through the gut) (`src/sim/candidates.ts:563`)

`offer('forage', -1, …)` in `computeCandidates`; kind: eat_here; key `computeCandidates/forage/NONE#3`, print `8d9ed181`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `gutValueOn(P)`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `forageRateOn(P)` (through `gv > fr`): feeding is valued by net energy rate *(true on the base)*
- **SWI** `gutValueOn(P)` (through `gv`): feeding is valued through the gut *(**false on the base**)*

### 17. Feed on leaves and pith where it stands (`src/sim/candidates.ts:564`)

`offer('forage', -1, …)` in `computeCandidates`; kind: eat_here; key `computeCandidates/forage/NONE#4`, print `2295f276`. **live**; carries nothing but possibility; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `!gv | gv := fr && gutValueOn(P) | fr := forageRateOn(P)`: feeding is not valued through the gut *(true on the base)*

### 18. Go to a remembered fruit tree (every one offered: the small map's route) (`src/sim/candidates.ts:593`)

`offer('travel', t.id, …, V.TREE)` in `computeCandidates`; kind: go_to_food; key `computeCandidates/travel/TREE#1`, print `d9d88793`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!shortlist | shortlist := P.patchEcology === 1 && !resources`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of c.memory`: each place it remembers
- **PER** `m.kind === 'tree' | m := c.memory[_i3]`: the memory is of a fruit tree
- **PER** `time - m.seenAt < P.memTravelHorizonH | m := c.memory[_i3]`: it saw the tree within the memory horizon (a hand-set span) [memTravelHorizonH = 240]
- **PER** `!stamped(_sight, m.entityId, st) | m := c.memory[_i3]`: the tree is not in view now (a tree in view is a feeding option)
- **PHY** `t`: the tree exists
- **PER** `d >= P.memoryTreeMinM`: the tree is at least the minimum trip distance away (nearer, it would be in view if it bore fruit) [memoryTreeMinM = 35]
- **SWI** `!shortlist | shortlist := P.patchEcology === 1 && !resources`: the field shortlist is off, or R15 enumerates individual resource targets without that shortlist [patchEcology = 1] *(**false on the base**)*
- **QUO** `!held | held := P.departPersist === 1 && !dv && x.tryAt !== undefined && time < x.tryAt && departAudience(world, c) > 0 | dv := P.departPersist === 1 && P.departValue >= 1`: after a departure nobody followed, its own trips wait for the re-launch time [departPersist = 1, departValue = 2] *(not read on the base; proposal: keep)*

### 19. Go and drink at a remembered water (`src/sim/candidates.ts:597`)

`offer('drink', m.entityId, …)` in `computeCandidates`; kind: drink; key `computeCandidates/drink/NONE#1`, print `485f26ec`. **live**; carries perceptual, advice; offered more widely: a rule is dropped (only once body outcomes are allowed as a teacher). Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

*Chosen by code before the offer:* Nothing at the offer: every remembered water is offered (7.5 on average). Afterwards the slot cap keeps the one the rules score highest.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of c.memory`: each place it remembers
- **PER** `NOT m.kind === 'tree' && time - m.seenAt < P.memTravelHorizonH && !stamped(_sight, m.entityId, st) | m := c.memory[_i3]`: the memory is not a fresh tree out of view (the branch for other memories) [memTravelHorizonH = 240]
- **PER** `m.kind === 'water' | m := c.memory[_i3]`: the memory is of a water
- **ADV** `c.age >= 3`: it is 3 or older (a hand-set age) *(always from 8; proposal: keep)*
- **ADV** `water ? c.thirst > 0 : c.thirst > 0.25 | water := waterOn(P)`: it is thirsty at all: the water ledger's thirst is above zero (above 0.25 without the ledger) *(proposal: drop, shown in `body (water)`, only once body outcomes are allowed as a teacher)*

Number literals in its conditions: 3, 0.25. Hand-set numbers in its advice, quota and dice conditions: 1.

### 20. Go to the remembered tree with the most believed value per metre (route chaining) (`src/sim/candidates.ts:640`)

`offer('travel', t.id, …, V.TREE)` in `computeCandidates`; kind: go_to_food; key `computeCandidates/travel/TREE#2`, print `6c2cc333`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `D > 0 || P.routeChain === 1 | D := P.goalDistScaleM`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `P.patchEcology === 1` (through `shortlist`): the field map's shortlist is on [patchEcology = 1] *(true on the base)*
- **SWI** `!resources` (through `shortlist`): the R15 model-only resource enumeration is off; ordinary rules use their existing shortlist *(true on the base)*
- **SWI** `D > 0 || P.routeChain === 1 | D := P.goalDistScaleM`: route chaining is on [routeChain = 0, goalDistScaleM = 0] *(**false on the base**)*
- **PER** `_rk.length`: at least one remembered or listed tree passed the trip conditions
- **QUO** `!held | held := P.departPersist === 1 && !dv && x.tryAt !== undefined && time < x.tryAt && departAudience(world, c) > 0 | dv := P.departPersist === 1 && P.departValue >= 1`: after a departure nobody followed, its own trips wait for the re-launch time [departPersist = 1, departValue = 2] *(not read on the base; proposal: keep)*

Where its target comes from (`_rk filled at line 592`):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of c.memory`: each place it remembers
- **PER** `m.kind === 'tree' | m := c.memory[_i3]`: the memory is of a fruit tree
- **PER** `time - m.seenAt < P.memTravelHorizonH | m := c.memory[_i3]`: it saw the tree within the memory horizon (a hand-set span) [memTravelHorizonH = 240]
- **PER** `!stamped(_sight, m.entityId, st) | m := c.memory[_i3]`: the tree is not in view now (a tree in view is a feeding option)
- **PHY** `t`: the tree exists
- **PER** `d >= P.memoryTreeMinM`: the tree is at least the minimum trip distance away (nearer, it would be in view if it bore fruit) [memoryTreeMinM = 35]
- **SWI** `P.patchEcology === 1` (through `shortlist`): the field map's shortlist is on [patchEcology = 1] *(true on the base)*
- **SWI** `!resources` (through `shortlist`): the R15 model-only resource enumeration is off; ordinary rules use their existing shortlist *(true on the base)*

Where its target comes from (`_rk filled at line 623`):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `s.knownTrees?.[c.troopId]` (through `known`): its community has a list of productive trees (community knowledge: no single animal holds it)
- **PHY** `kt`: the list is resolved to trees
- **SWI** `P.patchEcology === 1` (through `shortlist`): the field map's shortlist is on [patchEcology = 1] *(true on the base)*
- **SWI** `!resources` (through `shortlist`): the R15 model-only resource enumeration is off; ordinary rules use their existing shortlist *(true on the base)*
- **ADV** `c.age >= 10`: it is 10 or older (a hand-set age) *(proposal: keep)*
- **PER** `EACH of known | known := s.knownTrees?.[c.troopId]`: each tree on its community's list (community knowledge: no single animal holds it)
- **PER** `NOT stamped(_sight, id, st) | id := known[i] | known := s.knownTrees?.[c.troopId]`: the listed tree is not in view now
- **PER** `NOT stamped(_mem2, id, st) | id := known[i] | known := s.knownTrees?.[c.troopId]`: the listed tree is not in its own memory (those are handled above)
- **PHY** `t`: the tree exists
- **PER** `d >= P.memoryTreeMinM`: the tree is at least the minimum trip distance away (nearer, it would be in view if it bore fruit) [memoryTreeMinM = 35]

Number literals in its conditions: 10.

### 21. Go to a fruit tree out of view, remembered or on the community's list (`src/sim/candidates.ts:648`)

`offer('travel', t.id, …, V.TREE)` in `computeCandidates`; kind: go_to_food; key `computeCandidates/travel/TREE#3`, print `876f2e8e`. **live**; carries physical, perceptual, advice; offered more widely: a rule is dropped. Teacher: the rules' own judgment (scaffold); forked body outcomes, if the user allows them.

*Chosen by code before the offer:* The four trees the rules value most (worth less the cost of the trip) among those that pass the trip conditions (50.8 on average); afterwards the slot cap keeps two and the menu shows one.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `P.patchEcology === 1` (through `shortlist`): the field map's shortlist is on [patchEcology = 1] *(true on the base)*
- **SWI** `!resources` (through `shortlist`): the R15 model-only resource enumeration is off; ordinary rules use their existing shortlist *(true on the base)*
- **ADV** `EACH k < 4 && _mem.length`: only the four trees the rules value most are offered (the trip shortlist: a ranking by the rules' own value) *(proposal: drop, shown in `each target's belief words (crop when seen, hours since, distance and direction)`)*
- **QUO** `!held | held := P.departPersist === 1 && !dv && x.tryAt !== undefined && time < x.tryAt && departAudience(world, c) > 0 | dv := P.departPersist === 1 && P.departValue >= 1`: after a departure nobody followed, its own trips wait for the re-launch time [departPersist = 1, departValue = 2] *(not read on the base; proposal: keep)*

Where its target comes from (`_mem filled at line 592`):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of c.memory`: each place it remembers
- **PER** `m.kind === 'tree' | m := c.memory[_i3]`: the memory is of a fruit tree
- **PER** `time - m.seenAt < P.memTravelHorizonH | m := c.memory[_i3]`: it saw the tree within the memory horizon (a hand-set span) [memTravelHorizonH = 240]
- **PER** `!stamped(_sight, m.entityId, st) | m := c.memory[_i3]`: the tree is not in view now (a tree in view is a feeding option)
- **PHY** `t`: the tree exists
- **PER** `d >= P.memoryTreeMinM`: the tree is at least the minimum trip distance away (nearer, it would be in view if it bore fruit) [memoryTreeMinM = 35]
- **SWI** `P.patchEcology === 1` (through `shortlist`): the field map's shortlist is on [patchEcology = 1] *(true on the base)*
- **SWI** `!resources` (through `shortlist`): the R15 model-only resource enumeration is off; ordinary rules use their existing shortlist *(true on the base)*

Where its target comes from (`_mem filled at line 623`):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `s.knownTrees?.[c.troopId]` (through `known`): its community has a list of productive trees (community knowledge: no single animal holds it)
- **PHY** `kt`: the list is resolved to trees
- **SWI** `P.patchEcology === 1` (through `shortlist`): the field map's shortlist is on [patchEcology = 1] *(true on the base)*
- **SWI** `!resources` (through `shortlist`): the R15 model-only resource enumeration is off; ordinary rules use their existing shortlist *(true on the base)*
- **ADV** `c.age >= 10`: it is 10 or older (a hand-set age) *(proposal: keep)*
- **PER** `EACH of known | known := s.knownTrees?.[c.troopId]`: each tree on its community's list (community knowledge: no single animal holds it)
- **PER** `NOT stamped(_sight, id, st) | id := known[i] | known := s.knownTrees?.[c.troopId]`: the listed tree is not in view now
- **PER** `NOT stamped(_mem2, id, st) | id := known[i] | known := s.knownTrees?.[c.troopId]`: the listed tree is not in its own memory (those are handled above)
- **PHY** `t`: the tree exists
- **PER** `d >= P.memoryTreeMinM`: the tree is at least the minimum trip distance away (nearer, it would be in view if it bore fruit) [memoryTreeMinM = 35]

Number literals in its conditions: 4, 10. Hand-set numbers in its advice, quota and dice conditions: 2.

### 22. Go toward a pant-hoot heard (the older valuation) (`src/sim/candidates.ts:665`)

`offer('travel', x.joinCall, …, V.CALLER)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/travel/CALLER#1`, print `2406fe80`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!callerRate | callerRate := socialBit(P, 4) && cohesion && fr | cohesion := cohesionOn(P) | fr := forageRateOn(P)`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `!callerRate | callerRate := socialBit(P, 4) && cohesion && fr | cohesion := cohesionOn(P) | fr := forageRateOn(P)`: the approach to a caller is not valued as a trip *(**false on the base**)*
- **PER** `x.joinCall > 0`: it heard a community member's pant-hoot
- **QUO** `time - x.joinAt < 0.3`: it heard the call within the last 0.3 h (a window after the event) *(proposal: keep)*
- **ADV** `c.action !== 'patrol'`: it is not on patrol *(proposal: keep)*
- **PER** `d > P.joinCallMinM`: the call's place is farther than the minimum (nearer, it is already there) [joinCallMinM = 50]

Number literals in its conditions: 0.3.

### 23. Go toward a community member's pant-hoot (`src/sim/candidates.ts:691`)

`offer('travel', callId, …, V.CALLER)` in `callerTrip`; kind: keep_with_party; key `callerTrip/travel/CALLER#1`, print `b8903195`. **live**; carries perceptual, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold); Budongo party scans, once downloaded and checked.

*Note:* Party scans could teach joining and leaving a party, not the answer to a call as such.

Reached through callerTrip() called at line 694:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `socialBit(P, 4)` (through `callerRate`): the approach to a caller is valued in the forager's currency *(true on the base)*
- **SWI** `cohesionOn(P)` (through `callerRate > cohesion`): company is valued from association *(true on the base)*
- **SWI** `forageRateOn(P)` (through `callerRate > fr`): feeding is valued by net energy rate *(true on the base)*
- **PER** `x.joinCall > 0`: it heard a community member's pant-hoot
- **QUO** `time - x.joinAt < 0.3`: it heard the call within the last 0.3 h (a window after the event) *(proposal: keep)*
- **ADV** `c.action !== 'patrol'`: it is not on patrol *(proposal: keep)*
- **PER** `d > minD | minD := P.joinCallMinM`: the call's place is farther than the minimum (nearer, it is already there) [joinCallMinM = 50]

Reached through callerTrip() called at line 698 (this way is closed on the working base):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `own | own := callerRate ? ownCall(P, x, c.action === 'travel' && x.v === V.CALLER, c.targetId) : undefined | callerRate := socialBit(P, 4) && cohesion && fr | cohesion := cohesionOn(P) | fr := forageRateOn(P)`: a caller trip in progress keeps the call it was chosen for (and it is on such a trip) *(**false on the base**)*
- **PHY** `!(slotCall && x.joinCall === own[0]) | slotCall := callerRate && x.joinCall > 0 && time - x.joinAt < 0.3 && c.action !== 'patrol' && callerTrip(x.joinCall, x.joinCaller, x.joinX, x.joinZ, x.jt, P.joinCallMinM) | callerRate := socialBit(P, 4) && cohesion && fr | cohesion := cohesionOn(P) | fr := forageRateOn(P) | own := callerRate ? ownCall(P, x, c.action === 'travel' && x.v === V.CALLER, c.targetId) : undefined`: the call of its trip in progress is not the latest call heard (which is an option of its own) [joinCallMinM = 50]
- **PHY** `d > minD | minD := -1`: no minimum distance for a trip already under way *(always from 8)*

Number literals in its conditions: 0.3. Hand-set numbers in its advice, quota and dice conditions: 1.

### 24. Go back toward the middle of its range (`src/sim/candidates.ts:701`)

`offer('travel', -1, …, V.HOME)` in `computeCandidates`; kind: go_home; key `computeCandidates/travel/HOME#1`, print `c8c8064f`. **live**; carries advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PHY** `troop`: it belongs to a community *(always from 8)*
- **ADV** `here > P.homeLevel`: it stands outside its community's range (use level above the home level) [homeLevel = 0.97] *(proposal: keep)*
- **ADV** `c.action !== 'patrol'`: it is not on patrol *(proposal: keep)*
- **ADV** `c.action !== 'consort'`: it is not on a consortship *(proposal: keep)*
- **ADV** `c.action !== 'transfer'`: it is not transferring *(proposal: keep)*

### 25. Climb in a tree in view (play) (`src/sim/candidates.ts:704`)

`offer('climb', t.id, …)` in `computeCandidates`; kind: play; key `computeCandidates/climb/NONE#1`, print `469b1b2f`. **live**; carries perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

*Chosen by code before the offer:* The tree: the first fruit tree of its view list.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)`: it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `c.age >= 1.5`: it is 1.5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **ADV** `c.age < 16`: it is younger than 16 (play-climbing is for the young) *(proposal: keep)*
- **PER** `x.trees.length`: a fruit tree is in view

Number literals in its conditions: 1.5, 16. Hand-set numbers in its advice, quota and dice conditions: 1.

### 26. Groom an animal in view (`src/sim/candidates.ts:810`)

`offer('groom', o.id, …, V.ACCEPT | V.COALITION | V.NONE)` in `computeCandidates`; kind: groom; key `computeCandidates/groom/ACCEPT+COALITION+NONE#1`, print `30c808da`. **live**; carries physical, perceptual, social fact, advice; offered more widely: a rule is dropped (only for the pairs a wild choice record covers). Teacher: wild choice records in hand (whom a Ngogo male grooms); Taï grooming partner choice, once downloaded and checked; the rules' own judgment (scaffold).

*Chosen by code before the offer:* Nothing at the offer: every eligible animal in view is offered. Afterwards the slot cap keeps the two the rules score highest.

*Note:* The wild records in hand are of adult males choosing among the males present (Ngogo). Taï's are of adults of both sexes, western subspecies, and count only once downloaded and checked.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **ADV** `c.age >= 2`: it is 2 or older (a hand-set age) *(always from 8; proposal: keep)*
- **ADV** `o.age >= 1`: the other is at least 1 year old *(proposal: keep)*
- **PER** `d < P.groomRangeM`: the other is within grooming reach (a hand-set radius) [groomRangeM = 45]
- **ADV** `o.action === 'rest' || o.action === 'groom' || o.action === 'shelter' || o.action === 'nurse'` (through `settled`): the other is settled: resting, grooming, sheltering or nursing *(proposal: drop, shown in `nearby (each animal's act)`, only for the pairs a wild choice record covers)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*

Number literals in its conditions: 2, 1. Hand-set numbers in its advice, quota and dice conditions: 1.

### 27. Groom an adult male in reach, whatever he is doing (an adult male's own pool on the model's path) (`src/sim/candidates.ts:813`)

`offer('groom', o.id, …, V.ACCEPT | V.COALITION | V.NONE)` in `computeCandidates`; kind: groom; key `computeCandidates/groom/ACCEPT+COALITION+NONE#2`, print `24c10e00`. **legacy: unreachable on the working base**. Teacher: wild choice records in hand (whom a Ngogo male grooms); the rules' own judgment (scaffold).

*Chosen by code before the offer:* Every adult male in view and in grooming reach, valued by the rules' grooming formula, outside the score threshold and the slot caps; offered only in the model-only call at menuPossible 2, never to the rules.

*Note:* Stage R12's build (docs/staging/r12-build-prereg.md section 4.1, A1.1): ruling 6 opens the pair class where the Ngogo record can teach. By default the export writes no rules label for a partner the rules' own gate would refuse (one who is not settled).

Unreachable because: `resources`; `P.menuPossible >= 1`; `P.menuPossible >= 2`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **SWI** `resources` (through `maleOpen > opened`): the model-only call of R15 (the model's own legal pool); the rules' own enumeration, which this table audits, never has it *(**false on the base**)*
- **SWI** `P.menuPossible >= 1` (through `maleOpen > opened`): stage R12's build: the menu as ruled is on (menuPossible 1 or 2; 0 on the working base) [menuPossible = 0] *(**false on the base**)*
- **SWI** `P.menuPossible >= 2` (through `maleOpen`): stage R12's build: the adult male pair opening is on as well (menuPossible 2; off unless a run names it) [menuPossible = 0] *(**false on the base**)*
- **ADV** `isAdultMale(c)` (through `maleOpen`): it is an adult male *(proposal: keep)*
- **ADV** `isAdultMale(o)`: the partner is an adult male (15 or older): the pair class ruling 6 opens, where the Ngogo record can teach *(proposal: keep)*
- **PER** `d < P.groomRangeM`: the other is within grooming reach (a hand-set radius) [groomRangeM = 45]

### 28. Play with a young peer in view (`src/sim/candidates.ts:822`)

`offer('play', o.id, …, V.ACCEPT | V.NONE)` in `computeCandidates`; kind: play; key `computeCandidates/play/ACCEPT+NONE#1`, print `641b91c7`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `d < P.playRangeM`: the other is within play reach (a hand-set radius) [playRangeM = 30]
- **ADV** `o.age >= 1`: the other is at least 1 year old *(proposal: keep)*
- **ADV** `!busy | busy := o.action === 'flee' || o.action === 'charge' || o.action === 'attack' || o.action === 'display' || o.action === 'transfer'`: the other is not fleeing, charging, attacking, displaying or transferring *(proposal: keep)*
- **ADV** `c.age >= 1`: it is 1 or older (a hand-set age) *(always from 8; proposal: keep)*
- **ADV** `c.age < 15`: it is younger than 15 *(proposal: keep)*
- **ADV** `o.age < 15`: the other is younger than 15 *(proposal: keep)*
- **ADV** `Math.abs(o.age - c.age) < 7`: the two are within 7 years of age *(proposal: keep)*
- **PHY** `!(dependentOn(world, o) && isCarried(o, dependentOn(world, o)))`: the other is not being carried

Number literals in its conditions: 1, 15, 7. Hand-set numbers in its advice, quota and dice conditions: 3.

### 29. Play with a youngster (an adult) (`src/sim/candidates.ts:825`)

`offer('play', o.id, …, V.ACCEPT | V.NONE)` in `computeCandidates`; kind: play; key `computeCandidates/play/ACCEPT+NONE#2`, print `cc14438b`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `d < P.playRangeM`: the other is within play reach (a hand-set radius) [playRangeM = 30]
- **ADV** `o.age >= 1`: the other is at least 1 year old *(proposal: keep)*
- **ADV** `!busy | busy := o.action === 'flee' || o.action === 'charge' || o.action === 'attack' || o.action === 'display' || o.action === 'transfer'`: the other is not fleeing, charging, attacking, displaying or transferring *(proposal: keep)*
- **ADV** `NOT c.age >= 1 && c.age < 15 && o.age < 15 && Math.abs(o.age - c.age) < 7 && !(dependentOn(world, o) && isCarried(o, dependentOn(world, o)))`: the two are not a pair of young peers (the first play rule did not apply) *(proposal: keep)*
- **ADV** `c.age >= 15`: it is 15 or older *(proposal: keep)*
- **ADV** `o.age < 8`: the other is under 8 *(proposal: keep)*

Number literals in its conditions: 1, 15, 7, 8. Hand-set numbers in its advice, quota and dice conditions: 4.

### 30. Move away from a tense dominant who comes close (`src/sim/candidates.ts:833`)

`offer('flee', o.id, …, V.AVOID)` in `computeCandidates`; kind: escape; key `computeCandidates/flee/AVOID#1`, print `b58c2710`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **ADV** `tn >= P.rivalTension`: its tension with the other is at the rival level or above [rivalTension = 0.35] *(proposal: keep)*
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `d < P.avoidRangeM`: the other is within the avoidance radius [avoidRangeM = 8]
- **ADV** `!AFFILIATIVE[o.action]`: the other is not reconciling, grooming, consoling, playing or sharing *(proposal: keep)*
- **ADV** `!repairing | repairing := c.lastConflict?.opponentId === o.id && time - c.lastConflict.time < P.reconcileWindowH && b >= P.avoidRepairBondMin`: it has no fresh conflict with a valued partner to repair with that animal [reconcileWindowH = 0.3, avoidRepairBondMin = 0.35] *(proposal: keep)*
- **ADV** `d < P.avoidCloseM || o.targetId === c.id || o.action === 'display' || o.action === 'charge'`: the other is very close, is aiming at it, or is displaying or charging [avoidCloseM = 2.5] *(proposal: keep)*
- **ADV** `dominates(o, c)`: the other outranks it (the direction of rank) *(proposal: keep)*

Number literals in its conditions: 5, 0.1. Hand-set numbers in its advice, quota and dice conditions: 5.

### 31. Go along on a companion's trip to a food tree (`src/sim/candidates.ts:845`)

`offer('travel', L.targetId, …, V.TREE)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/travel/TREE#4`, print `16395c19`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold); Budongo party scans, once downloaded and checked.

*Note:* The follower reads the leader's goal tree from the leader's state; it cannot see it.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **SWI** `partyOn(P)`: party following is on *(true on the base)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PER** `d < P.partyLinkM`: the other is within the party link distance [partyLinkM = 50]
- **PER** `o.action === 'travel' || o.action === 'follow'`: the other is walking off (travelling or following)
- **PER** `o.targetId !== c.id`: the other is not walking toward it
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `!(careSkip && careFollow(o)) | careSkip := P.followCarer === 1`: the other is not a youngster keeping up with its carer (that is not a departure) [followCarer = 1]
- **SWI** `P.joinChoice === 1`: joining a trip is a choice [joinChoice = 1] *(true on the base)*
- **SWI** `P.partyJoinTrip === 1` (through `trip`): a companion's trip can be joined [partyJoinTrip = 1] *(true on the base)*
- **PHY** `!!L` (through `trip`): the animal that leads the walk exists
- **PER** `L.action === 'travel'` (through `trip`): the leader is travelling
- **PER** `ix(L).v === V.TREE` (through `trip`): the leader is on a trip to a food tree (its goal is read from its state, not seen)
- **PER** `isTreeId(L.targetId)` (through `trip`): the leader's goal is a tree (read from its state, not seen)

Number literals in its conditions: 5, 0.1. Hand-set numbers in its advice, quota and dice conditions: 1.

### 32. Go to a companion's goal tree (before joining was a choice) (`src/sim/candidates.ts:852`)

`offer('travel', L.targetId, …, V.TREE)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/travel/TREE#5`, print `7ec2d3de`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: with joining a trip as a choice the joined trip is offered by the branch above, so this one needs a leader both on and not on a trip to a tree.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **SWI** `partyOn(P)`: party following is on *(true on the base)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PER** `d < P.partyLinkM`: the other is within the party link distance [partyLinkM = 50]
- **PER** `o.action === 'travel' || o.action === 'follow'`: the other is walking off (travelling or following)
- **PER** `o.targetId !== c.id`: the other is not walking toward it
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `!(careSkip && careFollow(o)) | careSkip := P.followCarer === 1`: the other is not a youngster keeping up with its carer (that is not a departure) [followCarer = 1]
- **PER** `NOT P.joinChoice === 1 && trip | trip := P.partyJoinTrip === 1 && !!L && L.action === 'travel' && ix(L).v === V.TREE && isTreeId(L.targetId)`: the leader is not on a trip to a food tree (with joining a trip as a choice, as on the base) [joinChoice = 1, partyJoinTrip = 1]
- **PER** `d > P.partyFollowMinM`: the other is beyond the minimum following distance (already moving off) [partyFollowMinM = 5]
- **SWI** `P.partyJoinTrip === 1` (through `trip`): a companion's trip can be joined [partyJoinTrip = 1] *(true on the base)*
- **PHY** `!!L` (through `trip`): the animal that leads the walk exists
- **PER** `L.action === 'travel'` (through `trip`): the leader is travelling
- **PER** `ix(L).v === V.TREE` (through `trip`): the leader is on a trip to a food tree (its goal is read from its state, not seen)
- **PER** `isTreeId(L.targetId)` (through `trip`): the leader's goal is a tree (read from its state, not seen)

Number literals in its conditions: 5, 0.1.

### 33. Follow a companion who is walking off (`src/sim/candidates.ts:853`)

`offer('follow', lead, …, V.PARTY)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/follow/PARTY#1`, print `82882c06`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold); Budongo party scans, once downloaded and checked.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **SWI** `partyOn(P)`: party following is on *(true on the base)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PER** `d < P.partyLinkM`: the other is within the party link distance [partyLinkM = 50]
- **PER** `o.action === 'travel' || o.action === 'follow'`: the other is walking off (travelling or following)
- **PER** `o.targetId !== c.id`: the other is not walking toward it
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `!(careSkip && careFollow(o)) | careSkip := P.followCarer === 1`: the other is not a youngster keeping up with its carer (that is not a departure) [followCarer = 1]
- **PER** `NOT P.joinChoice === 1 && trip | trip := P.partyJoinTrip === 1 && !!L && L.action === 'travel' && ix(L).v === V.TREE && isTreeId(L.targetId)`: the leader is not on a trip to a food tree (with joining a trip as a choice, as on the base) [joinChoice = 1, partyJoinTrip = 1]
- **PER** `d > P.partyFollowMinM`: the other is beyond the minimum following distance (already moving off) [partyFollowMinM = 5]
- **PER** `!trip | trip := P.partyJoinTrip === 1 && !!L && L.action === 'travel' && ix(L).v === V.TREE && isTreeId(L.targetId)`: the leader is not on a trip to a food tree [partyJoinTrip = 1]

Number literals in its conditions: 5, 0.1. Hand-set numbers in its advice, quota and dice conditions: 1.

### 34. Stay near an adult male (a recently immigrated female) (`src/sim/candidates.ts:858`)

`offer('follow', o.id, …, V.PARTY)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/follow/PARTY#2`, print `df4cd8d8`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **ADV** `c.sex === 'female'`: the actor is female *(proposal: keep)*
- **ADV** `c.age >= 12`: it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **SOC** `x.immigrantAge >= 0`: it immigrated into this community
- **QUO** `c.age - x.immigrantAge < 2`: it immigrated less than 2 years ago (a window) *(proposal: keep)*
- **ADV** `o.sex === 'male'`: the other is male *(proposal: keep)*
- **ADV** `o.age >= 15`: the other is 15 or older *(proposal: keep)*
- **PER** `d > P.immigrantFollowMinM`: the male is beyond the minimum distance [immigrantFollowMinM = 3]
- **PER** `d < P.immigrantFollowMaxM`: the male is within the maximum distance [immigrantFollowMaxM = 35]

Number literals in its conditions: 12, 2, 15. Hand-set numbers in its advice, quota and dice conditions: 3.

### 35. Pant-grunt to any dominant in reach the conditions allow (the model's own pool) (`src/sim/candidates.ts:872`)

`offer('pant-grunt', o.id, …)` in `computeCandidates`; kind: greet_or_appease; key `computeCandidates/pant-grunt/NONE#1`, print `1364c070`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

*Chosen by code before the offer:* Every dominant the greeting's conditions allow, not only the one the rules score highest; offered only in the model-only call at menuPossible 1 or 2, never to the rules.

*Note:* Stage R12's build (docs/staging/r12-build-prereg.md section 4.1): ruling 7 keeps "only to a dominant" and lets the model choose which dominant. The rules value every dominant they allow, so a rules teacher exists (a scaffold).

Unreachable because: `resources`; `P.menuPossible >= 1`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `d < P.pantGruntRangeM`: the other is within greeting reach (a hand-set radius) [pantGruntRangeM = 20]
- **ADV** `(o.sex === 'male' && o.age >= P.pantGruntMaleAgeY) || o.age >= 15`: the other is a male of the greeting age or more, or anyone of 15 or more [pantGruntMaleAgeY = 13] *(proposal: keep)*
- **ADV** `dominates(o, c)`: the other outranks it (the direction of rank) *(proposal: keep)*
- **QUO** `open || quotaTrace.on | open := greetMem ? x.greet[o.id] === undefined || ((o.action === 'charge' || o.action === 'attack') && o.targetId === c.id) : time - last > P.pantGruntRepeatH | greetMem := socialBit(P, 1)`: once per association: it has not greeted this animal since they last met, or that animal has just charged or attacked it (without the switch: 8 h since the last greeting) [pantGruntRepeatH = 8] *(proposal: keep)*
- **QUO** `open | open := greetMem ? x.greet[o.id] === undefined || ((o.action === 'charge' || o.action === 'attack') && o.targetId === c.id) : time - last > P.pantGruntRepeatH | greetMem := socialBit(P, 1)`: once per association: it has not greeted this animal since they last met, or that animal has just charged or attacked it (without the switch: 8 h since the last greeting) [pantGruntRepeatH = 8] *(proposal: keep)*
- **SWI** `resources` (through `opened`): the model-only call of R15 (the model's own legal pool); the rules' own enumeration, which this table audits, never has it *(**false on the base**)*
- **SWI** `P.menuPossible >= 1` (through `opened`): stage R12's build: the menu as ruled is on (menuPossible 1 or 2; 0 on the working base) [menuPossible = 0] *(**false on the base**)*

Number literals in its conditions: 5, 15.

### 36. Pant-grunt to a dominant in reach (`src/sim/candidates.ts:881`)

`offer('pant-grunt', bestGrunt, …)` in `computeCandidates`; kind: greet_or_appease; key `computeCandidates/pant-grunt/NONE#2`, print `afe2c15d`. **live**; carries physical, perceptual, social fact, advice, quota or timer; offered more widely: a rule is dropped. Teacher: the rules' own judgment (scaffold).

*Chosen by code before the offer:* The one dominant the rules score highest (the alpha, a displaying male and a nearer one score more): one greeting target reaches `offer()`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `bestGrunt > 0`: a dominant to greet was found (see where its target comes from)

Where its target comes from (`bestGrunt set at line 870`):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `d < P.pantGruntRangeM`: the other is within greeting reach (a hand-set radius) [pantGruntRangeM = 20]
- **ADV** `(o.sex === 'male' && o.age >= P.pantGruntMaleAgeY) || o.age >= 15`: the other is a male of the greeting age or more, or anyone of 15 or more [pantGruntMaleAgeY = 13] *(proposal: keep)*
- **ADV** `dominates(o, c)`: the other outranks it (the direction of rank) *(proposal: keep)*
- **QUO** `open || quotaTrace.on | open := greetMem ? x.greet[o.id] === undefined || ((o.action === 'charge' || o.action === 'attack') && o.targetId === c.id) : time - last > P.pantGruntRepeatH | greetMem := socialBit(P, 1)`: once per association: it has not greeted this animal since they last met, or that animal has just charged or attacked it (without the switch: 8 h since the last greeting) [pantGruntRepeatH = 8] *(proposal: keep)*
- **QUO** `open | open := greetMem ? x.greet[o.id] === undefined || ((o.action === 'charge' || o.action === 'attack') && o.targetId === c.id) : time - last > P.pantGruntRepeatH | greetMem := socialBit(P, 1)`: once per association: it has not greeted this animal since they last met, or that animal has just charged or attacked it (without the switch: 8 h since the last greeting) [pantGruntRepeatH = 8] *(proposal: keep)*
- **ADV** `sc > bestGruntScore | sc := 0.3 + (troop?.alphaId === o.id ? 0.4 : 0.05) + (displaying ? 0.8 : 0) + c.stress * 0.3 + (x.newcomers > 0 ? 0.15 : 0) + (o.sex === 'male' && c.sex === 'female' ? 0.1 : 0) - d / P.pantGruntDistScaleM - h * 0.2 - (night ?  … | displaying := (o.action === 'display' || o.action === 'charge') && d < P.displayNearM | h := c.hunger | night := env.daylight < 0.1`: of the dominants in reach, only the one the rules score highest is offered (alpha, displaying, nearer score more) [pantGruntDistScaleM = 90, displayNearM = 35] *(proposal: drop, shown in `nearby (rank, distance, what it is doing) and last (greeted when)`)*

Number literals in its conditions: 5, 15, 0.3, 0.4, 0.05, 0.8, 0.15, 0.1, 0.2, 2. Hand-set numbers in its advice, quota and dice conditions: 13.

### 37. Join the trip of a companion heard giving a travel hoo, out of view (`src/sim/candidates.ts:888`)

`offer('travel', L.targetId, …, V.TREE)` in `computeCandidates`; kind: keep_with_party; key `computeCandidates/travel/TREE#6`, print `c104d98c`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold); Budongo party scans, once downloaded and checked.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `P.joinChoice === 1`: joining a trip is a choice [joinChoice = 1] *(true on the base)*
- **SWI** `partyOn(P)`: party following is on *(true on the base)*
- **SWI** `P.partyJoinTrip === 1`: a companion's trip can be joined [partyJoinTrip = 1] *(true on the base)*
- **SWI** `P.travelHoo === 1`: the travel hoo is on [travelHoo = 1] *(true on the base)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `x.hooFrom !== undefined`: it heard a travel hoo
- **QUO** `time - (x.hooAt ?? NEVER) <= P.travelHooWindowMin / 60`: it heard the hoo within the last few minutes (a window after the event) [travelHooWindowMin = 5] *(proposal: keep)*
- **PER** `!x.seen.includes(x.hooFrom)`: the caller is not in view (in view, the join is offered by the rule above)
- **PHY** `L`: the caller exists
- **PHY** `L.alive`: the caller is alive
- **SOC** `L.troopId === c.troopId`: the caller is a member of its own community
- **PER** `L.action === 'travel'`: the leader is travelling
- **PER** `ix(L).v === V.TREE`: the leader is on a trip to a food tree (its goal is read from its state, not seen)
- **PER** `isTreeId(L.targetId)`: the leader's goal is a tree (read from its state, not seen)
- **PER** `dxz(L, px, pz) < P.hearTravelHooM`: the caller is still within earshot of a travel hoo [hearTravelHooM = 50]

Number literals in its conditions: 5, 0.1, 60. Hand-set numbers in its advice, quota and dice conditions: 3.

### 38. Rain display at the onset of a storm (`src/sim/candidates.ts:898`)

`offer('display', -1, …, V.RAIN)` in `computeCandidates`; kind: contest; key `computeCandidates/display/RAIN#1`, print `f2d699b7`. **live**; carries advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **SWI** `endoOn(P, 'endoRainDisplay')`: the rain display comes from the arousal state *(true on the base)*
- **ADV** `c.sex === 'male'` (through `male`): the actor is male *(proposal: keep)*
- **ADV** `c.age >= 15`: it is 15 or older *(proposal: keep)*
- **QUO** `time - at < (fast ? fastSpanH(P) : P.impulseDurationH) | fast := endoOn(P, 'endoFast')`: a storm began within the span of the fast arousal state (a window after the event) [impulseDurationH = 0.1] *(proposal: keep)*
- **QUO** `x.lastDisplay < at`: it has not displayed since the storm began (once per storm) *(proposal: keep)*
- **ADV** `sc > 0 | sc := fast ? rainFastScore(c, x, time, P) : rainScore(c, x, P) | fast := endoOn(P, 'endoFast')`: its arousal gives the display a positive value: the rules' value used as a gate *(proposal: keep)*

Number literals in its conditions: 12, 0.1, 15. Hand-set numbers in its advice, quota and dice conditions: 4.

### 39. Rain display (opened by a roll) (`src/sim/candidates.ts:900`)

`offer('display', -1, …, V.RAIN)` in `computeCandidates`; kind: contest; key `computeCandidates/display/RAIN#2`, print `61d92bd0`. **legacy: unreachable on the working base**. Teacher: none.

Unreachable because: `NOT endoOn(P, 'endoRainDisplay')`.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **SWI** `NOT endoOn(P, 'endoRainDisplay')`: the rain display does not come from the arousal state *(**false on the base**)*
- **DIC** `x.impulse === IMPULSE_RAIN`: a rain-display impulse was rolled at the storm's onset *(proposal: rules)*
- **QUO** `x.impulseUntil > time`: the impulse is still open (a window of 0.1 h after it was raised) *(proposal: rules)*
- **ADV** `c.sex === 'male'` (through `male`): the actor is male *(proposal: keep)*

Number literals in its conditions: 12, 0.1.

### 40. Charging display: at a rival, at a reunion, or undirected (`src/sim/candidates.ts:908`)

`offer('display', rv, …, V.RIVAL | V.REUNION | V.NONE)` in `computeCandidates`; kind: contest; key `computeCandidates/display/RIVAL+REUNION+NONE#1`, print `691d98a5`. **live**; carries advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

*Chosen by code before the offer:* The target: the ranked male closest to it in rank score when close enough, else none.

*Note:* The rival is found in the loop over animals in view (`computeCandidates`, the lines that set `rival`): ranked males of 12 or more, the closest in rank score.

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **ADV** `dispOpen || (quotaTrace.on && male && e > 0.3) | dispOpen := male && e > 0.3 && (aggrBit(P, 4) || time - x.lastDisplay > 0.75) | male := c.sex === 'male' | e := c.energy`: the display's gate as the diagnostic hook sees it: a male with energy above 0.3 and, without the switch, 0.75 h since his last display (its parts are listed after it) *(proposal: keep)*
- **ADV** `c.sex === 'male'` (through `dispOpen > male`): the actor is male *(proposal: keep)*
- **ADV** `e > 0.3 | e := c.energy` (through `dispOpen`): its energy is above 0.3 *(proposal: keep)*
- **QUO** `aggrBit(P, 4) || time - x.lastDisplay > 0.75` (through `dispOpen`): 0.75 h since its last display *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.1, 0.3, 0.75. Hand-set numbers in its advice, quota and dice conditions: 4.

### 41. Give alarm calls at a snake (`src/sim/candidates.ts:933`)

`offer('alarm', -1, …, V.SNAKE)` in `computeCandidates`; kind: escape; key `computeCandidates/alarm/SNAKE#1`, print `ed5367d8`. **live**; carries physical, perceptual; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.stims`: each stimulus it perceives
- **PHY** `st`: the thing exists
- **PER** `st.kind === 'snake-model'`: the stimulus is a snake
- **PER** `aware.includes(c.id)`: it has noticed the snake
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PER** `d < P.snakeAlarmRangeM`: the snake is within alarm distance [snakeAlarmRangeM = 20]

Number literals in its conditions: 5. Hand-set numbers in its advice, quota and dice conditions: 0.

### 42. Back away from a snake (`src/sim/candidates.ts:934`)

`offer('flee', -1, …, V.SNAKE)` in `computeCandidates`; kind: escape; key `computeCandidates/flee/SNAKE#1`, print `f767d785`. **live**; carries physical, perceptual; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.stims`: each stimulus it perceives
- **PHY** `st`: the thing exists
- **PER** `st.kind === 'snake-model'`: the stimulus is a snake
- **PER** `aware.includes(c.id)`: it has noticed the snake
- **PER** `d < P.snakeFleeM`: the snake is within fleeing distance [snakeFleeM = 6]

### 43. Leave for a neighbouring community (`src/sim/candidates.ts:939`)

`offer('transfer', -1, …)` in `computeCandidates`; kind: emigrate; key `computeCandidates/transfer/NONE#1`, print `5f29a47a`. **live**; carries dice; stays with the rules. Teacher: none.

*Chosen by code before the offer:* The destination: the nearest neighbouring community (`execution.ts`).

Conditions:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **DIC** `(x.impulse === IMPULSE_TRANSFER && x.impulseUntil > time) || c.action === 'transfer' || intent | intent := x.transferTo > 0 && c.troopId === c.natalTroopId`: a dispersal impulse was rolled (a yearly hazard for a natal female of dispersal age while swollen), or the transfer it began is still under way *(proposal: rules)*

### 44. Go to her dead infant and take it up (`src/sim/candidates.ts:997`)

`offer('follow', b.id, …, V.BODY)` in `bodyOptions`; kind: keep_with_party; key `bodyOptions/follow/BODY#1`, print `0a6168c8`. **legacy: unreachable on the working base**. Teacher: none.

Unreachable because: `bodyOn(P)`; `carryOn(P) || respondOn(P)`; `carryOn(P)`.

Reached through bodyOptions() called at line 937:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `bodyOn(P)`: responses to the dead are on *(**false on the base**)*
- **PER** `x.bd !== undefined`: it has bodies in view
- **PER** `x.bd.length > 0`: it has bodies in view
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **SWI** `carryOn(P) || respondOn(P)`: carrying or responding to the dead is on *(**false on the base**)*
- **PER** `EACH of x.bd`: each body in view
- **PHY** `b`: the body exists
- **PHY** `st`: the thing exists
- **PHY** `b.remains === 'body'`: the remains are still a body
- **ADV** `b.stage === 'infant'`: only an infant's body *(proposal: keep)*
- **SOC** `carer || sibling | carer := st.carer === c.id | sibling := b.motherId > 0 && c.motherId === b.motherId`: it is the body's carer or a maternal sibling
- **SOC** `st.carer === c.id` (through `carer`): it is the body's carer
- **SWI** `carryOn(P)` (through `carry`): carrying the dead is on *(**false on the base**)*
- **PHY** `st.by < 0`: the body lies on the ground
- **PHY** `ridesInLife(b)`: the body is small enough to carry
- **PHY** `(c.carryingDeadId ?? -1) < 0`: it is not already carrying a body

### 45. Groom a dead infant's body (`src/sim/candidates.ts:998`)

`offer('groom', b.id, …, V.BODY)` in `bodyOptions`; kind: groom; key `bodyOptions/groom/BODY#1`, print `99ea559d`. **legacy: unreachable on the working base**. Teacher: none.

Unreachable because: `bodyOn(P)`; `carryOn(P) || respondOn(P)`; `respondOn(P)`.

Reached through bodyOptions() called at line 937:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `bodyOn(P)`: responses to the dead are on *(**false on the base**)*
- **PER** `x.bd !== undefined`: it has bodies in view
- **PER** `x.bd.length > 0`: it has bodies in view
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **SWI** `carryOn(P) || respondOn(P)`: carrying or responding to the dead is on *(**false on the base**)*
- **PER** `EACH of x.bd`: each body in view
- **PHY** `b`: the body exists
- **PHY** `st`: the thing exists
- **PHY** `b.remains === 'body'`: the remains are still a body
- **ADV** `b.stage === 'infant'`: only an infant's body *(proposal: keep)*
- **SOC** `carer || sibling | carer := st.carer === c.id | sibling := b.motherId > 0 && c.motherId === b.motherId`: it is the body's carer or a maternal sibling
- **SWI** `respondOn(P)` (through `respond`): responding to the dead is on *(**false on the base**)*
- **ADV** `c.age >= 2`: it is 2 or older (a hand-set age) *(always from 8; proposal: keep)*
- **PER** `d < P.groomRangeM`: the other is within grooming reach (a hand-set radius) [groomRangeM = 45]
- **PHY** `st.by < 0 || st.by === st.carer` (through `withCarer`): the body lies, or is in its carer's hands

Number literals in its conditions: 2.

### 46. Walk up to a dead infant's body and look (`src/sim/candidates.ts:1001`)

`offer('follow', b.id, …, V.BODY)` in `bodyOptions`; kind: keep_with_party; key `bodyOptions/follow/BODY#2`, print `9d131aff`. **legacy: unreachable on the working base**. Teacher: none.

Unreachable because: `bodyOn(P)`; `carryOn(P) || respondOn(P)`; `respondOn(P)`.

Reached through bodyOptions() called at line 937:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **SWI** `bodyOn(P)`: responses to the dead are on *(**false on the base**)*
- **PER** `x.bd !== undefined`: it has bodies in view
- **PER** `x.bd.length > 0`: it has bodies in view
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **SWI** `carryOn(P) || respondOn(P)`: carrying or responding to the dead is on *(**false on the base**)*
- **PER** `EACH of x.bd`: each body in view
- **PHY** `b`: the body exists
- **PHY** `st`: the thing exists
- **PHY** `b.remains === 'body'`: the remains are still a body
- **ADV** `b.stage === 'infant'`: only an infant's body *(proposal: keep)*
- **SWI** `respondOn(P)` (through `respond`): responding to the dead is on *(**false on the base**)*
- **SOC** `!carer | carer := st.carer === c.id`: it is not the body's carer
- **ADV** `c.age >= 2`: it is 2 or older (a hand-set age) *(always from 8; proposal: keep)*
- **ADV** `sibling || c.age < 10 || isAdultMale(c) | sibling := b.motherId > 0 && c.motherId === b.motherId`: a maternal sibling, an immature under 10 or an adult male (the classes the sources name) *(proposal: keep)*
- **PHY** `st.by < 0 || st.by === st.carer` (through `withCarer`): the body lies, or is in its carer's hands
- **QUO** `!st.insp.includes(c.id)`: it has not yet looked at this body (once per body) *(proposal: keep)*

Number literals in its conditions: 2, 10.

### 47. Charge a rival male over status (`src/sim/candidates.ts:1156`)

`offer('charge', o.id, …, V.STATUS)` in `aggression`; kind: contest; key `aggression/charge/STATUS#1`, print `48c2e8b1`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

*Chosen by code before the offer:* The rival: of the ranked males of 12 or more in view, the one closest to it in rank score.

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PHY** `rival > 0`: a rival was found (see where its target comes from)
- **ADV** `rankedMale(c)`: it is a ranked male *(proposal: keep)*
- **QUO** `cooled || tr | cooled := aggrBit(P, 1) || time - x.lastAgg > 1.5 | tr := quotaTrace.on`: 1.5 h since its last aggression (the diagnostic hook aside) *(not read on the base; proposal: keep)*
- **PER** `dcc(c, o) < P.chargeRangeM`: the rival is within charging reach [chargeRangeM = 45]
- **QUO** `aggrBit(P, 1) || time - x.lastAgg > 1.5` (through `cooled`): 1.5 h since its last aggression *(not read on the base; proposal: keep)*

Where its target comes from (`rival set at line 878`):
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId` (through `same`): the other is a member of its own community
- **ADV** `rankedMale(c)`: it is a ranked male *(proposal: keep)*
- **ADV** `rankedMale(o)`: the other is a ranked male *(proposal: keep)*
- **ADV** `c.age >= 12`: it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **ADV** `o.age >= 12`: the other is 12 or older *(proposal: keep)*
- **ADV** `cl > rivalCloseness`: of the ranked males in view, only the one closest to it in rank score is its rival *(proposal: keep)*

Number literals in its conditions: 12, 0.1, 1.5. Hand-set numbers in its advice, quota and dice conditions: 2.

### 48. Attack a close rival (opened by a roll) (`src/sim/candidates.ts:1161`)

`offer('attack', o.id, …, V.ESCALATE)` in `aggression`; kind: contest; key `aggression/attack/ESCALATE#1`, print `2ec15626`. **legacy: unreachable on the working base**. Teacher: none.

Unreachable because: the escalation impulse is rolled in perception.ts only while escalation does not come from the slow states.

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **DIC** `x.impulse === IMPULSE_ESCALATE`: an escalation impulse was rolled at perception *(proposal: rules)*
- **QUO** `x.impulseUntil > time`: the impulse is still open (a window of 0.1 h after it was raised) *(proposal: rules)*
- **PHY** `o`: the other exists
- **PHY** `o.alive`: the other is alive
- **PER** `dcc(c, o) < P.escalateAttackRangeM`: the other is within attack reach [escalateAttackRangeM = 35]

Number literals in its conditions: 12, 0.1.

### 49. Attack an infant (opened by a roll) (`src/sim/candidates.ts:1172`)

`offer('attack', o.id, …, V.INFANTICIDE)` in `aggression`; kind: contest; key `aggression/attack/INFANTICIDE#1`, print `f1ecfc24`. **live**; carries physical, perceptual, advice, quota or timer, dice; stays with the rules. Teacher: none.

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **DIC** `x.impulse === IMPULSE_INFANTICIDE`: an infanticide impulse was rolled at perception (per look at a stranger's infant when its males outnumber theirs by the margin, or for a new alpha and an infant he did not sire) *(proposal: rules)*
- **QUO** `x.impulseUntil > time`: the impulse is still open (a window of 0.1 h after it was raised) *(proposal: rules)*
- **PHY** `o`: the other exists
- **PHY** `o.alive`: the other is alive
- **PER** `dcc(c, o) < P.infanticideAttackRangeM`: the infant is within attack reach [infanticideAttackRangeM = 45]

Number literals in its conditions: 12, 0.1. Hand-set numbers in its advice, quota and dice conditions: 2.

### 50. Charge a lower-ranked bystander after losing a contest (`src/sim/candidates.ts:1188`)

`offer('charge', o.id, …, V.REDIRECT)` in `aggression`; kind: contest; key `aggression/charge/REDIRECT#1`, print `e9156cf3`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **QUO** `time - x.lostAt < (fastRed ? fastSpanH(P) : endoRed ? P.endoStressTauH : P.redirectWindowH) | fastRed := endoOn(P, 'endoFastRedirect') | endoRed := endoOn(P, 'endoRedirect')` (through `redirectOpen`): it lost a contest within the last stress time constant (a window after the event) [endoStressTauH = 3.4, redirectWindowH = 0.1] *(proposal: keep)*
- **QUO** `x.lastAgg < x.lostAt` (through `redirectOpen`): it has not aggressed since that loss (once per loss) *(proposal: keep)*
- **PER** `dist < P.redirectRangeM`: the other is within redirect reach [redirectRangeM = 25]
- **ADV** `o.age >= 5`: the other is 5 or older *(proposal: keep)*
- **ADV** `!kin | kin := maternalKin(c, o)`: the other is not its maternal kin (kin are never charged) *(proposal: keep)*
- **ADV** `dominates(c, o)`: it outranks the other (the direction of rank) *(proposal: keep)*

Number literals in its conditions: 12, 0.1, 5. Hand-set numbers in its advice, quota and dice conditions: 5.

### 51. Attack a male close to it in rank (`src/sim/candidates.ts:1191`)

`offer('attack', o.id, …, V.ESCALATE)` in `aggression`; kind: contest; key `aggression/attack/ESCALATE#2`, print `f620ba10`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **ADV** `endoEsc || (tr && escOn) | endoEsc := escOn && cooled | escOn := endoOn(P, 'endoEscalate') && isAdultMale(c) | cooled := aggrBit(P, 1) || time - x.lastAgg > 1.5 | tr := quotaTrace.on`: an adult male past the aggression cooldown (the gate as the diagnostic hook sees it; its parts are listed after it) *(proposal: keep)*
- **ADV** `o.sex === 'male'`: the other is male *(proposal: keep)*
- **ADV** `o.age >= 15`: the other is 15 or older *(proposal: keep)*
- **ADV** `Math.abs(o.elo - c.elo) < P.escalateEloGap`: the other is close to it in rank score [escalateEloGap = 90] *(proposal: keep)*
- **PER** `dist < escR`: the other is within escalation reach
- **ADV** `sc > 0`: the slow states give the attack a positive value: the rules' value used as a gate *(proposal: keep)*
- **SWI** `endoOn(P, 'endoEscalate')` (through `endoEsc > escOn`): escalation comes from the slow states *(true on the base)*
- **ADV** `isAdultMale(c)` (through `endoEsc > escOn`): it is an adult male *(proposal: keep)*
- **QUO** `aggrBit(P, 1) || time - x.lastAgg > 1.5` (through `endoEsc > cooled`): 1.5 h since its last aggression *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.1, 1.5, 15. Hand-set numbers in its advice, quota and dice conditions: 5.

### 52. Charge a subordinate it holds a grudge against (`src/sim/candidates.ts:1197`)

`offer('charge', o.id, …, V.TENSION)` in `aggression`; kind: contest; key `aggression/charge/TENSION#1`, print `3052a355`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **ADV** `tn >= P.rivalTension`: its tension with the other is at the rival level or above [rivalTension = 0.35] *(proposal: keep)*
- **QUO** `cooled || tr | cooled := aggrBit(P, 1) || time - x.lastAgg > 1.5 | tr := quotaTrace.on`: 1.5 h since its last aggression (the diagnostic hook aside) *(not read on the base; proposal: keep)*
- **PER** `dist < P.grudgeRangeM`: the other is within grudge reach [grudgeRangeM = 25]
- **ADV** `o.age >= 5`: the other is 5 or older *(proposal: keep)*
- **ADV** `!kin | kin := maternalKin(c, o)`: the other is not its maternal kin (kin are never charged) *(proposal: keep)*
- **ADV** `dominates(c, o)`: it outranks the other (the direction of rank) *(proposal: keep)*
- **SOC** `(x.incident[o.id]?.[1] ?? 0) % 2 === 1`: the last incident between the two was the other's aggression toward it
- **QUO** `aggrBit(P, 1) || time - x.lastAgg > 1.5` (through `cooled`): 1.5 h since its last aggression *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.1, 1.5, 5, 2. Hand-set numbers in its advice, quota and dice conditions: 4.

### 53. Charge a swollen female (coercion) (`src/sim/candidates.ts:1203`)

`offer('charge', o.id, …, V.COERCE)` in `aggression`; kind: contest; key `aggression/charge/COERCE#1`, print `c4c893f0`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **ADV** `c.sex === 'male'` (through `male`): the actor is male *(proposal: keep)*
- **ADV** `c.age >= 15`: it is 15 or older *(proposal: keep)*
- **ADV** `o.sex === 'female'`: the other is female *(proposal: keep)*
- **ADV** `o.swelling >= P.coerceSwellingMin`: her swelling is at the coercion level or above [coerceSwellingMin = 0.85] *(proposal: keep)*
- **PER** `dist < P.coerceRangeM`: she is within coercion reach [coerceRangeM = 30]
- **ADV** `!kin | kin := maternalKin(c, o)`: the other is not its maternal kin (kin are never charged) *(proposal: keep)*
- **QUO** `cooled || tr | cooled := aggrBit(P, 1) || time - x.lastAgg > 1.5 | tr := quotaTrace.on`: 1.5 h since its last aggression (the diagnostic hook aside) *(not read on the base; proposal: keep)*
- **QUO** `(ix(o).coerce[c.id] ?? 0) < P.coerceMaxRepeats`: it has charged her fewer times than the repeat limit [coerceMaxRepeats = 3] *(proposal: keep)*
- **QUO** `aggrBit(P, 1) || time - x.lastAgg > 1.5` (through `cooled`): 1.5 h since its last aggression *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.1, 15, 1.5. Hand-set numbers in its advice, quota and dice conditions: 5.

### 54. Charge a recently immigrated female (a resident female) (`src/sim/candidates.ts:1213`)

`offer('charge', o.id, …, V.IMMIGRANT)` in `aggression`; kind: contest; key `aggression/charge/IMMIGRANT#1`, print `fada2f5e`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **ADV** `!male | male := c.sex === 'male'`: the actor is female *(proposal: keep)*
- **ADV** `c.age >= 15`: it is 15 or older *(proposal: keep)*
- **ADV** `o.sex === 'female'`: the other is female *(proposal: keep)*
- **PER** `dist < P.immigrantChargeRangeM`: she is within reach [immigrantChargeRangeM = 25]
- **QUO** `immOpen || quotaTrace.on | immOpen := gapsOff || time - x.lastAgg > P.immigrantChargeGapH | gapsOff := socialBit(P, 8)`: the charge gap since its last aggression has passed (the diagnostic hook aside) [immigrantChargeGapH = 0.75] *(not read on the base; proposal: keep)*
- **SOC** `ox.immigrantAge >= 0`: the other is an immigrant
- **QUO** `o.age - ox.immigrantAge < 2`: she immigrated less than 2 years ago (a window) *(proposal: keep)*
- **ADV** `tenureC >= 3 | tenureC := ix(c).immigrantAge < 0 ? c.age - 10 : c.age - ix(c).immigrantAge`: the actor has 3 or more years of tenure (a resident) *(proposal: keep)*
- **QUO** `gapsOff || time - x.lastAgg > P.immigrantChargeGapH | gapsOff := socialBit(P, 8)` (through `immOpen`): the charge gap since its last aggression has passed [immigrantChargeGapH = 0.75] *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.1, 15, 2, 3, 10. Hand-set numbers in its advice, quota and dice conditions: 6.

### 55. Supplant a subordinate that is feeding when fruit is scarce (`src/sim/candidates.ts:1225`)

`offer('charge', o.id, …, V.FEED)` in `aggression`; kind: contest; key `aggression/charge/FEED#1`, print `d6383098`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **PER** `o.action === 'forage'`: the other is feeding
- **PER** `o.targetId > 0`: the other is feeding in a tree
- **ADV** `o.targetId === forageTree || (h > P.feedChargeHungerMin && x.trees.includes(o.targetId)) | forageTree := c.action === 'forage' ? c.targetId : -1 | h := c.hunger`: the other feeds in the tree it feeds in itself, or, when its own hunger is above the threshold, in a tree in view [feedChargeHungerMin = 0.55] *(proposal: keep)*
- **PER** `dist < P.feedChargeRangeM`: the other is within reach [feedChargeRangeM = 30]
- **QUO** `feedOpen || quotaTrace.on | feedOpen := gapsOff || time - x.lastAgg > P.feedChargeGapH | gapsOff := socialBit(P, 8)`: the charge gap since its last aggression has passed (the diagnostic hook aside) [feedChargeGapH = 0.75] *(not read on the base; proposal: keep)*
- **ADV** `o.age >= 5`: the other is 5 or older *(proposal: keep)*
- **ADV** `!kin | kin := maternalKin(c, o)`: the other is not its maternal kin (kin are never charged) *(proposal: keep)*
- **ADV** `dominates(c, o)`: it outranks the other (the direction of rank) *(proposal: keep)*
- **ADV** `guardianOf(world, o) !== c`: it is not the other's guardian (a guardian never supplants its ward) *(proposal: keep)*
- **PHY** `t`: the tree exists
- **ADV** `world.environment.fruitIndex < 0.4 || (t !== undefined && (P.patchEcology === 1 ? fruitAt(world, t) : t.fruit) < 0.3)` (through `scarce`): fruit is scarce: in the habitat (index under 0.4, a figure no animal perceives) or in that tree (crop under 0.3) [patchEcology = 1] *(proposal: keep)*
- **QUO** `gapsOff || time - x.lastAgg > P.feedChargeGapH | gapsOff := socialBit(P, 8)` (through `feedOpen`): the charge gap since its last aggression has passed [feedChargeGapH = 0.75] *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.1, 5, 0.4, 0.3. Hand-set numbers in its advice, quota and dice conditions: 7.

### 56. Charge an adult female (an adolescent male) (`src/sim/candidates.ts:1232`)

`offer('charge', o.id, …, V.FEMALE_DOM)` in `aggression`; kind: contest; key `aggression/charge/FEMALE_DOM#1`, print `85d2efc4`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **ADV** `c.sex === 'male'` (through `male`): the actor is male *(proposal: keep)*
- **ADV** `c.age < P.femaleDomMaxAgeY`: the actor is younger than the age limit (an adolescent male) [femaleDomMaxAgeY = 16] *(proposal: keep)*
- **ADV** `o.sex === 'female'`: the other is female *(proposal: keep)*
- **ADV** `o.age >= 15`: the other is 15 or older *(proposal: keep)*
- **PER** `dist < P.femaleDomRangeM`: she is within reach [femaleDomRangeM = 25]
- **QUO** `cooled || tr | cooled := aggrBit(P, 1) || time - x.lastAgg > 1.5 | tr := quotaTrace.on`: 1.5 h since its last aggression (the diagnostic hook aside) *(not read on the base; proposal: keep)*
- **ADV** `!kin | kin := maternalKin(c, o)`: the other is not its maternal kin (kin are never charged) *(proposal: keep)*
- **QUO** `aggrBit(P, 1) || time - x.lastAgg > 1.5` (through `cooled`): 1.5 h since its last aggression *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.1, 15, 1.5. Hand-set numbers in its advice, quota and dice conditions: 4.

### 57. Charge the animal attacking its ward (`src/sim/candidates.ts:1240`)

`offer('charge', ag.id, …, V.DEFEND)` in `aggression`; kind: back_ally_or_defend; key `aggression/charge/DEFEND#1`, print `e297cadc`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PER** `EACH of x.seen`: each animal in view
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.alive`: the other is alive
- **QUO** `time - ox.victimAt < 0.05`: the other was attacked within the last 0.05 h (a window after the event) *(proposal: keep)*
- **SOC** `guardianOf(world, o) === c`: it is the other's guardian (its mother or caretaker)
- **PHY** `ag`: the aggressor exists
- **PHY** `ag.alive`: the aggressor is alive
- **PHY** `ag.id !== c.id`: the aggressor is another animal
- **PER** `dcc(c, ag) < P.defendRangeM`: the aggressor is within defending reach [defendRangeM = 45]
- **SOC** `ag.troopId === c.troopId`: the aggressor is a member of its own community
- **PER** `hd2(ag, o) < P.defendAggressorNearM * P.defendAggressorNearM`: the aggressor is still next to the victim [defendAggressorNearM = 8]
- **ADV** `!guardBySize(P) || !wardHoldsOwn(world, o, ag, P)`: its ward cannot hold its own against the aggressor (assessed odds under even) *(proposal: keep)*

Number literals in its conditions: 12, 0.1, 0.05. Hand-set numbers in its advice, quota and dice conditions: 3.

### 58. Join an ally's conflict: charge its opponent (`src/sim/candidates.ts:1255`)

`offer('charge', b.id, …, V.COALITION)` in `aggression`; kind: back_ally_or_defend; key `aggression/charge/COALITION#1`, print `75c525c8`. **live**; carries physical, perceptual, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: Kanyawara female coalition partners, once downloaded and checked; the rules' own judgment (scaffold).

*Note:* Who is alerted to a conflict, and on whose side, is decided in `conflict.ts`, outside this file. Kanyawara's records are of coalition partners among adult females only.

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **QUO** `time - x.coalAt < P.coalitionWindowH`: it was alerted to a conflict within the last 0.05 h (a window; who is alerted is decided in conflict.ts) [coalitionWindowH = 0.05] *(proposal: keep)*
- **PHY** `a`: the ally exists
- **PHY** `b`: the opponent exists
- **PHY** `a.alive`: the ally is alive
- **PHY** `b.alive`: the opponent is alive
- **PHY** `b.id !== c.id`: it is not itself the opponent
- **PER** `dcc(c, b) < P.coalitionChargeRangeM`: the opponent is within reach [coalitionChargeRangeM = 60]

Number literals in its conditions: 12, 0.1. Hand-set numbers in its advice, quota and dice conditions: 3.

### 59. Chase a rival away from the female it guards (`src/sim/candidates.ts:1260`)

`offer('charge', r.id, …, V.GUARD)` in `aggression`; kind: contest; key `aggression/charge/GUARD#1`, print `8761977d`. **live**; carries physical, perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through aggression() called at line 910:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **ADV** `!night | night := env.daylight < 0.1`: it is not night (daylight at 0.1 or more) *(proposal: keep)*
- **PHY** `c.action === 'guard'`: it is guarding a female (the chase is part of guarding)
- **PER** `x.rivalId > 0`: a rival came near her (named while guarding: a male courting her or within 2.5 m whom it outranks)
- **PHY** `r`: the rival exists
- **PHY** `r.alive`: the rival is alive
- **PER** `dcc(c, r) < P.guardChaseRangeM`: the rival is within chasing reach [guardChaseRangeM = 35]

Number literals in its conditions: 12, 0.1. Hand-set numbers in its advice, quota and dice conditions: 2.

### 60. Crouch and submit to the animal threatening it (`src/sim/candidates.ts:1283`)

`offer('submit', ag.id, …, V.AGGRESSOR)` in `threatResponses`; kind: greet_or_appease; key `threatResponses/submit/AGGRESSOR#1`, print `bd6866f5`. **live**; carries physical, perceptual, social fact, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through threatResponses() called at line 912:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **QUO** `world.time - x.victimAt <= 0.03`: it was threatened within the last 0.03 h, about 2 minutes (a window after the event) *(proposal: keep)*
- **PHY** `ag`: the aggressor exists
- **PHY** `ag.alive`: the aggressor is alive
- **SOC** `NOT !aggressive && ag.action !== 'display' | aggressive := (ag.action === 'charge' || ag.action === 'attack') && ag.targetId === c.id`: the aggressor is still charging or attacking it, or displaying
- **PER** `d <= P.threatResponseRangeM`: the aggressor is within response reach [threatResponseRangeM = 45]
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*

Number literals in its conditions: 0.03. Hand-set numbers in its advice, quota and dice conditions: 1.

### 61. Flee from the animal threatening it (`src/sim/candidates.ts:1284`)

`offer('flee', ag.id, …, V.AGGRESSOR)` in `threatResponses`; kind: escape; key `threatResponses/flee/AGGRESSOR#1`, print `abd9baa5`. **live**; carries physical, perceptual, social fact, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through threatResponses() called at line 912:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **QUO** `world.time - x.victimAt <= 0.03`: it was threatened within the last 0.03 h, about 2 minutes (a window after the event) *(proposal: keep)*
- **PHY** `ag`: the aggressor exists
- **PHY** `ag.alive`: the aggressor is alive
- **SOC** `NOT !aggressive && ag.action !== 'display' | aggressive := (ag.action === 'charge' || ag.action === 'attack') && ag.targetId === c.id`: the aggressor is still charging or attacking it, or displaying
- **PER** `d <= P.threatResponseRangeM`: the aggressor is within response reach [threatResponseRangeM = 45]
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*

Number literals in its conditions: 0.03. Hand-set numbers in its advice, quota and dice conditions: 1.

### 62. Charge back at the animal threatening it (`src/sim/candidates.ts:1287`)

`offer('charge', ag.id, …, V.COUNTER)` in `threatResponses`; kind: back_ally_or_defend; key `threatResponses/charge/COUNTER#1`, print `d0b7e125`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through threatResponses() called at line 912:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **QUO** `world.time - x.victimAt <= 0.03`: it was threatened within the last 0.03 h, about 2 minutes (a window after the event) *(proposal: keep)*
- **PHY** `ag`: the aggressor exists
- **PHY** `ag.alive`: the aggressor is alive
- **SOC** `NOT !aggressive && ag.action !== 'display' | aggressive := (ag.action === 'charge' || ag.action === 'attack') && ag.targetId === c.id`: the aggressor is still charging or attacking it, or displaying
- **PER** `d <= P.threatResponseRangeM`: the aggressor is within response reach [threatResponseRangeM = 45]
- **ADV** `c.age >= 12`: it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `c.sex === ag.sex || stranger | stranger := ag.troopId !== c.troopId`: the aggressor is of its own sex, or a stranger (no charging back across the sexes inside the community) *(proposal: keep)*

Number literals in its conditions: 0.03, 12. Hand-set numbers in its advice, quota and dice conditions: 2.

### 63. Fight back against an attacker at arm's length (`src/sim/candidates.ts:1288`)

`offer('attack', ag.id, …, V.FIGHTBACK)` in `threatResponses`; kind: back_ally_or_defend; key `threatResponses/attack/FIGHTBACK#1`, print `76be5c6a`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through threatResponses() called at line 912:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **QUO** `world.time - x.victimAt <= 0.03`: it was threatened within the last 0.03 h, about 2 minutes (a window after the event) *(proposal: keep)*
- **PHY** `ag`: the aggressor exists
- **PHY** `ag.alive`: the aggressor is alive
- **SOC** `NOT !aggressive && ag.action !== 'display' | aggressive := (ag.action === 'charge' || ag.action === 'attack') && ag.targetId === c.id`: the aggressor is still charging or attacking it, or displaying
- **PER** `d <= P.threatResponseRangeM`: the aggressor is within response reach [threatResponseRangeM = 45]
- **ADV** `c.age >= 12`: it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **ADV** `c.sex === ag.sex || stranger | stranger := ag.troopId !== c.troopId`: the aggressor is of its own sex, or a stranger (no charging back across the sexes inside the community) *(proposal: keep)*
- **SOC** `ag.action === 'attack'`: the aggressor is attacking (fighting back answers an attack)
- **PER** `d < P.fightBackRangeM`: the aggressor is at arm's length [fightBackRangeM = 4]

Number literals in its conditions: 0.03, 12. Hand-set numbers in its advice, quota and dice conditions: 2.

### 64. Charge at strangers in view (`src/sim/candidates.ts:1319`)

`offer('charge', s.id, …, V.STRANGER)` in `intergroup`; kind: confront_strangers; key `intergroup/charge/STRANGER#1`, print `fa4b209e`. **live**; carries physical, perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

*Chosen by code before the offer:* The target: the nearest stranger.

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.strangers > 0`: strangers are in view
- **PER** `x.nearestStranger > 0`: a nearest stranger is known
- **PHY** `s`: the stranger exists
- **PHY** `s.alive`: the stranger is alive
- **ADV** `!transferring | transferring := c.action === 'transfer' || (x.transferTo > 0 && c.troopId === c.natalTroopId)`: it is not transferring to another community (a transferring female keeps going) *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && immigrantLike | immigrantLike := s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating`: not a male facing a swollen, childless stranger female (males tolerate a likely immigrant) [immigrantLikeSwelling = 0.5] *(proposal: keep)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*
- **ADV** `own >= 3 | own := x.ownMales`: at least 3 males of its own in view *(proposal: keep)*
- **ADV** `own >= str + 2 | own := x.ownMales | str := x.strangerMales`: at least 2 more males than the strangers have *(proposal: keep)*
- **QUO** `aggrBit(P, 2) || time - x.lastAgg > 0.2`: 0.2 h since its last aggression *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 3, 2, 0.2. Hand-set numbers in its advice, quota and dice conditions: 4.

### 65. Gang attack on a lone stranger (opened by a roll) (`src/sim/candidates.ts:1320`)

`offer('attack', gangT.id, …, V.GANG)` in `intergroup`; kind: confront_strangers; key `intergroup/attack/GANG#1`, print `c418f7bc`. **live**; carries physical, perceptual, advice, dice; stays with the rules. Teacher: none.

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.strangers > 0`: strangers are in view
- **PER** `x.nearestStranger > 0`: a nearest stranger is known
- **PHY** `s`: the stranger exists
- **PHY** `s.alive`: the stranger is alive
- **ADV** `!transferring | transferring := c.action === 'transfer' || (x.transferTo > 0 && c.troopId === c.natalTroopId)`: it is not transferring to another community (a transferring female keeps going) *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && immigrantLike | immigrantLike := s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating`: not a male facing a swollen, childless stranger female (males tolerate a likely immigrant) [immigrantLikeSwelling = 0.5] *(proposal: keep)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*
- **ADV** `own >= 3 | own := x.ownMales`: at least 3 males of its own in view *(proposal: keep)*
- **ADV** `own >= str + 2 | own := x.ownMales | str := x.strangerMales`: at least 2 more males than the strangers have *(proposal: keep)*
- **QUO** `aggrBit(P, 2) || time - x.lastAgg > 0.2`: 0.2 h since its last aggression *(not read on the base; proposal: keep)*
- **DIC** `gangT | gangT := x.impulse === IMPULSE_GANG && x.impulseUntil > time ? byId.get(x.impulseTarget) : undefined`: a gang-attack impulse was rolled at perception (probability 0.5, one roll per 6 h at most, with 3 or more own males against a lone stranger of 10 or more, on patrol or near the range's edge) *(proposal: rules)*
- **PHY** `gangT.alive | gangT := x.impulse === IMPULSE_GANG && x.impulseUntil > time ? byId.get(x.impulseTarget) : undefined`: the target of that impulse is alive

Number literals in its conditions: 12, 3, 2, 0.2. Hand-set numbers in its advice, quota and dice conditions: 4.

### 66. Retreat from strangers in view (outnumbered or fearful) (`src/sim/candidates.ts:1322`)

`offer('flee', s.id, …, V.STRANGERS)` in `intergroup`; kind: avoid_strangers; key `intergroup/flee/STRANGERS#1`, print `51d95e5e`. **live**; carries physical, perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.strangers > 0`: strangers are in view
- **PER** `x.nearestStranger > 0`: a nearest stranger is known
- **PHY** `s`: the stranger exists
- **PHY** `s.alive`: the stranger is alive
- **ADV** `!transferring | transferring := c.action === 'transfer' || (x.transferTo > 0 && c.troopId === c.natalTroopId)`: it is not transferring to another community (a transferring female keeps going) *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && immigrantLike | immigrantLike := s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating`: not a male facing a swollen, childless stranger female (males tolerate a likely immigrant) [immigrantLikeSwelling = 0.5] *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && own >= 3 && own >= str + 2 && (aggrBit(P, 2) || time - x.lastAgg > 0.2) | own := x.ownMales | str := x.strangerMales`: the charge rule did not apply: not a male with 3 or more own males and 2 more than theirs *(proposal: keep)*
- **ADV** `own < str + 1 || own < 2 || fear > 0.3 | own := x.ownMales | str := x.strangerMales | fear := withInfant ? 0.6 : c.sex === 'female' ? 0.25 : 0 | withInfant := c.sex === 'female' && c.lactating`: outnumbered, alone among males, or fearful (a female with an infant) *(proposal: keep)*

Number literals in its conditions: 12, 3, 2, 0.2, 0.3, 0.6, 0.25. Hand-set numbers in its advice, quota and dice conditions: 8.

### 67. Display at strangers in view (even numbers) (`src/sim/candidates.ts:1324`)

`offer('display', s.id, …, V.STRANGER)` in `intergroup`; kind: confront_strangers; key `intergroup/display/STRANGER#1`, print `38183810`. **live**; carries physical, perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.strangers > 0`: strangers are in view
- **PER** `x.nearestStranger > 0`: a nearest stranger is known
- **PHY** `s`: the stranger exists
- **PHY** `s.alive`: the stranger is alive
- **ADV** `!transferring | transferring := c.action === 'transfer' || (x.transferTo > 0 && c.troopId === c.natalTroopId)`: it is not transferring to another community (a transferring female keeps going) *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && immigrantLike | immigrantLike := s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating`: not a male facing a swollen, childless stranger female (males tolerate a likely immigrant) [immigrantLikeSwelling = 0.5] *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && own >= 3 && own >= str + 2 && (aggrBit(P, 2) || time - x.lastAgg > 0.2) | own := x.ownMales | str := x.strangerMales`: the charge rule did not apply: not a male with 3 or more own males and 2 more than theirs *(proposal: keep)*
- **ADV** `own >= str + 1 | own := x.ownMales | str := x.strangerMales`: at least one more male of its own than the strangers have *(proposal: keep)*
- **ADV** `own >= 2 | own := x.ownMales`: at least 2 males of its own in view *(proposal: keep)*
- **ADV** `fear <= 0.3 | fear := withInfant ? 0.6 : c.sex === 'female' ? 0.25 : 0 | withInfant := c.sex === 'female' && c.lactating`: not fearful (a female with an infant is) *(proposal: keep)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*

Number literals in its conditions: 12, 3, 2, 0.2, 0.3, 0.6, 0.25. Hand-set numbers in its advice, quota and dice conditions: 8.

### 68. Pant-hoot back at strangers in view (even numbers) (`src/sim/candidates.ts:1324`)

`offer('call', -1, …, V.COUNTERCALL)` in `intergroup`; kind: confront_strangers; key `intergroup/call/COUNTERCALL#1`, print `b50e5774`. **live**; carries physical, perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.strangers > 0`: strangers are in view
- **PER** `x.nearestStranger > 0`: a nearest stranger is known
- **PHY** `s`: the stranger exists
- **PHY** `s.alive`: the stranger is alive
- **ADV** `!transferring | transferring := c.action === 'transfer' || (x.transferTo > 0 && c.troopId === c.natalTroopId)`: it is not transferring to another community (a transferring female keeps going) *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && immigrantLike | immigrantLike := s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating`: not a male facing a swollen, childless stranger female (males tolerate a likely immigrant) [immigrantLikeSwelling = 0.5] *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && own >= 3 && own >= str + 2 && (aggrBit(P, 2) || time - x.lastAgg > 0.2) | own := x.ownMales | str := x.strangerMales`: the charge rule did not apply: not a male with 3 or more own males and 2 more than theirs *(proposal: keep)*
- **ADV** `own >= str + 1 | own := x.ownMales | str := x.strangerMales`: at least one more male of its own than the strangers have *(proposal: keep)*
- **ADV** `own >= 2 | own := x.ownMales`: at least 2 males of its own in view *(proposal: keep)*
- **ADV** `fear <= 0.3 | fear := withInfant ? 0.6 : c.sex === 'female' ? 0.25 : 0 | withInfant := c.sex === 'female' && c.lactating`: not fearful (a female with an infant is) *(proposal: keep)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*

Number literals in its conditions: 12, 3, 2, 0.2, 0.3, 0.6, 0.25. Hand-set numbers in its advice, quota and dice conditions: 8.

### 69. Retreat from strangers in view (a female, even numbers) (`src/sim/candidates.ts:1325`)

`offer('flee', s.id, …, V.STRANGERS)` in `intergroup`; kind: avoid_strangers; key `intergroup/flee/STRANGERS#2`, print `01d1d96d`. **live**; carries physical, perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.strangers > 0`: strangers are in view
- **PER** `x.nearestStranger > 0`: a nearest stranger is known
- **PHY** `s`: the stranger exists
- **PHY** `s.alive`: the stranger is alive
- **ADV** `!transferring | transferring := c.action === 'transfer' || (x.transferTo > 0 && c.troopId === c.natalTroopId)`: it is not transferring to another community (a transferring female keeps going) *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && immigrantLike | immigrantLike := s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating`: not a male facing a swollen, childless stranger female (males tolerate a likely immigrant) [immigrantLikeSwelling = 0.5] *(proposal: keep)*
- **ADV** `NOT c.sex === 'male' && own >= 3 && own >= str + 2 && (aggrBit(P, 2) || time - x.lastAgg > 0.2) | own := x.ownMales | str := x.strangerMales`: the charge rule did not apply: not a male with 3 or more own males and 2 more than theirs *(proposal: keep)*
- **ADV** `own >= str + 1 | own := x.ownMales | str := x.strangerMales`: at least one more male of its own than the strangers have *(proposal: keep)*
- **ADV** `own >= 2 | own := x.ownMales`: at least 2 males of its own in view *(proposal: keep)*
- **ADV** `fear <= 0.3 | fear := withInfant ? 0.6 : c.sex === 'female' ? 0.25 : 0 | withInfant := c.sex === 'female' && c.lactating`: not fearful (a female with an infant is) *(proposal: keep)*
- **ADV** `c.sex !== 'male'`: the actor is female *(proposal: keep)*

Number literals in its conditions: 12, 3, 2, 0.2, 0.3, 0.6, 0.25. Hand-set numbers in its advice, quota and dice conditions: 8.

### 70. Approach stranger calls heard (`src/sim/candidates.ts:1340`)

`offer('patrol', -1, …, V.APPROACH)` in `intergroup`; kind: confront_strangers; key `intergroup/patrol/APPROACH#1`, print `fd4b8943`. **live**; carries perceptual, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.heardN > 0`: it heard strangers call
- **QUO** `time - x.heardAt < 0.2`: it heard them within the last 0.2 h (a window after the event) *(proposal: keep)*
- **PER** `x.strangers === 0`: no stranger is in view (in view, the rules above apply)
- **PER** `hdist < P.heardResponseRangeM`: the calls came from within the response distance [heardResponseRangeM = 1000]
- **ADV** `NOT own >= 3 && c.sex === 'female' && !inRange | own := x.ownMales | inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false`: not a female with 3 or more males around hearing calls from outside the range (she stays quiet with the males) *(proposal: keep)*
- **ADV** `own >= 3 | own := x.ownMales`: at least 3 males of its own in view *(proposal: keep)*
- **ADV** `c.sex === 'male' || inRange | inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false`: a male, or the calls came from inside its own range *(proposal: keep)*

Number literals in its conditions: 12, 0.2, 3, 2, 1.05. Hand-set numbers in its advice, quota and dice conditions: 5.

### 71. Pant-hoot back at stranger calls heard (`src/sim/candidates.ts:1341`)

`offer('call', -1, …, V.COUNTERCALL)` in `intergroup`; kind: confront_strangers; key `intergroup/call/COUNTERCALL#2`, print `6280ae6b`. **live**; carries perceptual, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.heardN > 0`: it heard strangers call
- **QUO** `time - x.heardAt < 0.2`: it heard them within the last 0.2 h (a window after the event) *(proposal: keep)*
- **PER** `x.strangers === 0`: no stranger is in view (in view, the rules above apply)
- **PER** `hdist < P.heardResponseRangeM`: the calls came from within the response distance [heardResponseRangeM = 1000]
- **ADV** `NOT own >= 3 && c.sex === 'female' && !inRange | own := x.ownMales | inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false`: not a female with 3 or more males around hearing calls from outside the range (she stays quiet with the males) *(proposal: keep)*
- **ADV** `own >= 3 | own := x.ownMales`: at least 3 males of its own in view *(proposal: keep)*
- **ADV** `c.sex === 'male' || inRange | inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false`: a male, or the calls came from inside its own range *(proposal: keep)*

Number literals in its conditions: 12, 0.2, 3, 2, 1.05. Hand-set numbers in its advice, quota and dice conditions: 5.

### 72. Move away from stranger calls heard (`src/sim/candidates.ts:1342`)

`offer('flee', -1, …, V.HEARD)` in `intergroup`; kind: avoid_strangers; key `intergroup/flee/HEARD#1`, print `4e0bad8f`. **live**; carries perceptual, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through intergroup() called at line 914:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.heardN > 0`: it heard strangers call
- **QUO** `time - x.heardAt < 0.2`: it heard them within the last 0.2 h (a window after the event) *(proposal: keep)*
- **PER** `x.strangers === 0`: no stranger is in view (in view, the rules above apply)
- **PER** `hdist < P.heardResponseRangeM`: the calls came from within the response distance [heardResponseRangeM = 1000]
- **ADV** `NOT own >= 3 && c.sex === 'female' && !inRange | own := x.ownMales | inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false`: not a female with 3 or more males around hearing calls from outside the range (she stays quiet with the males) *(proposal: keep)*
- **ADV** `NOT own >= 3 && (c.sex === 'male' || inRange) | own := x.ownMales | inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false`: fewer than 3 own males in view (or a female hearing calls from outside the range) *(proposal: keep)*

Number literals in its conditions: 12, 0.2, 3, 2, 1.05. Hand-set numbers in its advice, quota and dice conditions: 5.

### 73. Stay on its consortship (`src/sim/candidates.ts:1355`)

`offer('consort', p.id, …, V.CONTINUE)` in `reproduction`; kind: court; key `reproduction/consort/CONTINUE#1`, print `6bc58095`. **live**; carries physical, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through reproduction() called at line 915:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PHY** `c.action === 'consort'`: it is on a consortship (carrying on)
- **PHY** `p`: the partner or prey exists
- **PHY** `p.alive`: the partner is alive

Number literals in its conditions: 12. Hand-set numbers in its advice, quota and dice conditions: 1.

### 74. Court and mate with a female in oestrus (a male) (`src/sim/candidates.ts:1370`)

`offer('mate', o.id, …, V.ACCEPT | V.NONE)` in `reproduction`; kind: court; key `reproduction/mate/ACCEPT+NONE#1`, print `00d88926`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through reproduction() called at line 915:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **ADV** `NOT maternalKin(c, o)`: the other is not its maternal kin (no mating between maternal kin) *(proposal: keep)*
- **PHY** `o.sex !== c.sex`: the other is of the other sex
- **PHY** `c.sex === 'male'`: the actor is male: the male's side of a mating
- **ADV** `c.age >= 10`: it is 10 or older (a hand-set age) *(proposal: keep)*
- **ADV** `o.age >= 10`: the other is 10 or older *(proposal: keep)*
- **SOC** `o.swelling >= 0.75`: she is in oestrus: swelling at 0.75 or more (whom a courtship is about; the number is hand-set)
- **PER** `dist < P.mateRangeM`: she is within courting reach [mateRangeM = 50]
- **QUO** `(mateOpen && pg > 0) || quotaTrace.on | mateOpen := mv || time - x.lastMate > P.mateIntervalH | mv := matingValueOn(P) | pg := mv ? paternityGain(o, c, P, world) : 1`: the mating quota: 1.5 h since his last copulation (the diagnostic hook aside) [mateIntervalH = 1.5] *(proposal: keep)*
- **QUO** `mv || time - x.lastMate > P.mateIntervalH | mv := matingValueOn(P)` (through `mateOpen`): the mating quota: 1.5 h since his last copulation [mateIntervalH = 1.5] *(proposal: keep)*
- **ADV** `pg > 0 | pg := mv ? paternityGain(o, c, P, world) : 1 | mv := matingValueOn(P)`: the copulation would add paternity (read only with the paternity mechanism) *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 10, 0.75. Hand-set numbers in its advice, quota and dice conditions: 3.

### 75. Mate-guard a swollen female (`src/sim/candidates.ts:1374`)

`offer('guard', o.id, …)` in `reproduction`; kind: court; key `reproduction/guard/NONE#1`, print `e5b4223b`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through reproduction() called at line 915:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **ADV** `NOT maternalKin(c, o)`: the other is not its maternal kin (no mating between maternal kin) *(proposal: keep)*
- **PHY** `o.sex !== c.sex`: the other is of the other sex
- **PHY** `c.sex === 'male'`: the actor is male: the male's side of a mating
- **ADV** `c.age >= 10`: it is 10 or older (a hand-set age) *(proposal: keep)*
- **ADV** `o.age >= 10`: the other is 10 or older *(proposal: keep)*
- **SOC** `o.swelling >= 0.75`: she is in oestrus: swelling at 0.75 or more (whom a courtship is about; the number is hand-set)
- **PER** `dist < P.mateRangeM`: she is within courting reach [mateRangeM = 50]
- **ADV** `c.age >= 15`: it is 15 or older *(proposal: keep)*
- **ADV** `c.rankOrder <= 2 || isAlpha | isAlpha := troop?.alphaId === c.id`: it holds one of the top two ranks (or is the alpha) *(proposal: keep)*
- **ADV** `o.swelling >= P.guardSwellingMin`: her swelling is at the guarding level or above [guardSwellingMin = 0.9] *(proposal: keep)*
- **ADV** `!guarded | guarded := !!g && g.alive && g !== c && dcc(c, g) < P.guardedRangeM && dominates(g, c)`: she is not guarded by a male who outranks it [guardedRangeM = 30] *(proposal: keep)*
- **ADV** `!(g && g !== c && g.alive && dcc(c, g) < P.guardRivalRangeM)`: no other male is guarding her nearby [guardRivalRangeM = 30] *(proposal: keep)*

Number literals in its conditions: 12, 10, 0.75, 15, 2. Hand-set numbers in its advice, quota and dice conditions: 7.

### 76. Lead a female on a consortship (`src/sim/candidates.ts:1384`)

`offer('consort', o.id, …)` in `reproduction`; kind: court; key `reproduction/consort/NONE#1`, print `e8d80e27`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

*Chosen by code before the offer:* Where he leads: a point at 0.85 of the range radius, by a hash of the pair and the day (`consortGoal`).

Reached through reproduction() called at line 915:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **ADV** `NOT maternalKin(c, o)`: the other is not its maternal kin (no mating between maternal kin) *(proposal: keep)*
- **PHY** `o.sex !== c.sex`: the other is of the other sex
- **PHY** `c.sex === 'male'`: the actor is male: the male's side of a mating
- **ADV** `c.age >= 10`: it is 10 or older (a hand-set age) *(proposal: keep)*
- **ADV** `o.age >= 10`: the other is 10 or older *(proposal: keep)*
- **SOC** `o.swelling >= 0.75`: she is in oestrus: swelling at 0.75 or more (whom a courtship is about; the number is hand-set)
- **PER** `dist < P.mateRangeM`: she is within courting reach [mateRangeM = 50]
- **ADV** `c.age >= 15`: it is 15 or older *(proposal: keep)*
- **ADV** `!isAlpha | isAlpha := troop?.alphaId === c.id`: it is not the alpha (the alpha guards instead) *(proposal: keep)*
- **ADV** `o.swelling >= P.consortSwellingMin`: her swelling is at the consortship level or above [consortSwellingMin = 0.6] *(proposal: keep)*
- **ADV** `bond(c, o) >= P.consortBondMin`: its bond with her is at the consortship minimum or above [consortBondMin = 0.35] *(proposal: keep)*
- **ADV** `!guarded | guarded := !!g && g.alive && g !== c && dcc(c, g) < P.guardedRangeM && dominates(g, c)`: she is not guarded by a male who outranks it [guardedRangeM = 30] *(proposal: keep)*
- **ADV** `c.action !== 'consort'`: it is not on a consortship *(proposal: keep)*
- **ADV** `light || world.hour < P.consortLatestHour | light := socialBit(P, 2)` (through `open`): before the latest clock hour for a consortship [consortLatestHour = 16] *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 10, 0.75, 15. Hand-set numbers in its advice, quota and dice conditions: 6.

### 77. Present to and mate with a male (a female in oestrus) (`src/sim/candidates.ts:1398`)

`offer('mate', o.id, …, V.ACCEPT | V.NONE)` in `reproduction`; kind: court; key `reproduction/mate/ACCEPT+NONE#2`, print `d0caf64f`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through reproduction() called at line 915:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **ADV** `NOT maternalKin(c, o)`: the other is not its maternal kin (no mating between maternal kin) *(proposal: keep)*
- **PHY** `o.sex !== c.sex`: the other is of the other sex
- **PHY** `c.sex === 'female'`: the actor is female: the female's side of a mating
- **PHY** `c.swelling >= 0.75`: she herself is in oestrus: swelling at 0.75 or more
- **ADV** `o.age >= 10`: the other is 10 or older *(proposal: keep)*
- **PER** `dist < P.mateFemaleRangeM`: the male is within her presenting reach [mateFemaleRangeM = 30]
- **QUO** `mv || time - x.lastMate > 0.3 | mv := matingValueOn(P)`: 0.3 h since her last copulation *(proposal: keep)*
- **QUO** `(maleOpen && pg > 0) || quotaTrace.on | maleOpen := mv || time - ix(o).lastMate > P.mateIntervalH | mv := matingValueOn(P) | pg := mv ? paternityGain(c, o, P, world) : 1`: the male's mating quota gates her offer too: 1.5 h since his last copulation (the diagnostic hook aside) [mateIntervalH = 1.5] *(proposal: keep)*
- **QUO** `mv || time - ix(o).lastMate > P.mateIntervalH | mv := matingValueOn(P)` (through `maleOpen`): the male's mating quota gates her offer too: 1.5 h since his last copulation [mateIntervalH = 1.5] *(proposal: keep)*
- **ADV** `pg > 0 | pg := mv ? paternityGain(c, o, P, world) : 1 | mv := matingValueOn(P)`: the copulation would add paternity (read only with the paternity mechanism) *(not read on the base; proposal: keep)*

Number literals in its conditions: 12, 0.75, 10, 0.3. Hand-set numbers in its advice, quota and dice conditions: 4.

### 78. Go along on a male's consortship (`src/sim/candidates.ts:1399`)

`offer('consort', o.id, …, V.ACCEPT)` in `reproduction`; kind: court; key `reproduction/consort/ACCEPT#1`, print `5770d7b2`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through reproduction() called at line 915:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **ADV** `NOT maternalKin(c, o)`: the other is not its maternal kin (no mating between maternal kin) *(proposal: keep)*
- **PHY** `o.sex !== c.sex`: the other is of the other sex
- **PHY** `c.sex === 'female'`: the actor is female: the female's side of a mating
- **PHY** `c.swelling >= 0.75`: she herself is in oestrus: swelling at 0.75 or more
- **ADV** `o.age >= 10`: the other is 10 or older *(proposal: keep)*
- **PER** `dist < P.mateFemaleRangeM`: the male is within her presenting reach [mateFemaleRangeM = 30]
- **QUO** `mv || time - x.lastMate > 0.3 | mv := matingValueOn(P)`: 0.3 h since her last copulation *(proposal: keep)*
- **QUO** `(maleOpen && pg > 0) || quotaTrace.on | maleOpen := mv || time - ix(o).lastMate > P.mateIntervalH | mv := matingValueOn(P) | pg := mv ? paternityGain(c, o, P, world) : 1`: the male's mating quota gates her offer too: 1.5 h since his last copulation (the diagnostic hook aside) [mateIntervalH = 1.5] *(proposal: keep)*
- **QUO** `mv || time - ix(o).lastMate > P.mateIntervalH | mv := matingValueOn(P)` (through `maleOpen`): the male's mating quota gates her offer too: 1.5 h since his last copulation [mateIntervalH = 1.5] *(proposal: keep)*
- **ADV** `pg > 0 | pg := mv ? paternityGain(c, o, P, world) : 1 | mv := matingValueOn(P)`: the copulation would add paternity (read only with the paternity mechanism) *(not read on the base; proposal: keep)*
- **SOC** `o.action === 'consort'`: the male is leading a consortship
- **SOC** `o.targetId === c.id`: the other's act is aimed at it

Number literals in its conditions: 12, 0.75, 10, 0.3. Hand-set numbers in its advice, quota and dice conditions: 4.

### 79. Beg meat from an animal holding some (`src/sim/candidates.ts:1429`)

`offer('beg', o.id, …, V.MEAT)` in `meatAndHunting`; kind: share_food; key `meatAndHunting/beg/MEAT#1`, print `9ac60a38`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through meatAndHunting() called at line 916:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `c.age >= 12` (through `adolescentOrAdult`): structure: adolescents and adults reach this through one call of the helper and the young through the other; together everyone who is not carried *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.carryingMeat > 0.15`: the other holds meat
- **PER** `dist < P.begMeatRangeM`: the meat holder is within begging reach [begMeatRangeM = 25]
- **ADV** `c.carryingMeat < 0.05`: it holds (almost) no meat itself *(proposal: keep)*

Reached through meatAndHunting() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PHY** `o.carryingMeat > 0.15`: the other holds meat
- **PER** `dist < P.begMeatRangeM`: the meat holder is within begging reach [begMeatRangeM = 25]
- **ADV** `c.carryingMeat < 0.05`: it holds (almost) no meat itself *(proposal: keep)*

Number literals in its conditions: 12, 0.15, 0.05. Hand-set numbers in its advice, quota and dice conditions: 1.

### 80. Share meat with an animal begging from it (`src/sim/candidates.ts:1433`)

`offer('share', o.id, …, V.MEAT)` in `meatAndHunting`; kind: share_food; key `meatAndHunting/share/MEAT#1`, print `a98b677b`. **live**; carries physical, perceptual, social fact; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold).

Reached through meatAndHunting() called at line 916:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `c.age >= 12` (through `adolescentOrAdult`): structure: adolescents and adults reach this through one call of the helper and the young through the other; together everyone who is not carried *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **SOC** `o.action === 'beg'`: the other is begging
- **SOC** `o.targetId === c.id`: the other's act is aimed at it
- **PER** `dist < P.shareRangeM`: the beggar is within sharing reach [shareRangeM = 5]
- **PHY** `c.carryingMeat > 0.25`: it holds meat

Reached through meatAndHunting() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **SOC** `o.action === 'beg'`: the other is begging
- **SOC** `o.targetId === c.id`: the other's act is aimed at it
- **PER** `dist < P.shareRangeM`: the beggar is within sharing reach [shareRangeM = 5]
- **PHY** `c.carryingMeat > 0.25`: it holds meat

Number literals in its conditions: 12, 0.25. Hand-set numbers in its advice, quota and dice conditions: 0.

### 81. Share plant food with its begging ward (`src/sim/candidates.ts:1435`)

`offer('share', o.id, …, V.PLANT)` in `meatAndHunting`; kind: share_food; key `meatAndHunting/share/PLANT#1`, print `cbf9e213`. **live**; carries physical, perceptual, social fact; nothing to rule: possible is offered. Teacher: the rules' own judgment (scaffold).

Reached through meatAndHunting() called at line 916:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `c.age >= 12` (through `adolescentOrAdult`): structure: adolescents and adults reach this through one call of the helper and the young through the other; together everyone who is not carried *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **SOC** `o.action === 'beg'`: the other is begging
- **SOC** `o.targetId === c.id`: the other's act is aimed at it
- **PER** `dist < P.shareRangeM`: the beggar is within sharing reach [shareRangeM = 5]
- **PHY** `c.carryingMeat <= 0.25`: it holds no meat to share
- **PHY** `c.action === 'forage'`: it is feeding
- **SOC** `guardianOf(world, o) === c`: it is the other's guardian (its mother or caretaker)

Reached through meatAndHunting() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **SOC** `o.action === 'beg'`: the other is begging
- **SOC** `o.targetId === c.id`: the other's act is aimed at it
- **PER** `dist < P.shareRangeM`: the beggar is within sharing reach [shareRangeM = 5]
- **PHY** `c.carryingMeat <= 0.25`: it holds no meat to share
- **PHY** `c.action === 'forage'`: it is feeding
- **SOC** `guardianOf(world, o) === c`: it is the other's guardian (its mother or caretaker)

Number literals in its conditions: 12, 0.25. Hand-set numbers in its advice, quota and dice conditions: 0.

### 82. Join a hunt of red colobus under way (`src/sim/candidates.ts:1445`)

`offer('hunt', p.id, …, V.JOIN)` in `meatAndHunting`; kind: hunt; key `meatAndHunting/hunt/JOIN#1`, print `873f2262`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through meatAndHunting() called at line 916:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.preyId > 0`: red colobus are in view or heard nearby
- **ADV** `world.environment.rain < 0.3`: it is not raining hard (rain under 0.3) *(proposal: keep)*
- **ADV** `c.energy > 0.35`: its energy is above 0.35 *(proposal: keep)*
- **PHY** `p`: the partner or prey exists
- **SOC** `s.hunts.find(q => q.preyId === p.id && q.troopId === c.troopId)` (through `hunt`): a hunt of this colobus group by its community is under way

Reached through meatAndHunting() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `x.preyId > 0`: red colobus are in view or heard nearby
- **ADV** `c.age >= 12`: it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **ADV** `world.environment.rain < 0.3`: it is not raining hard (rain under 0.3) *(proposal: keep)*
- **ADV** `c.energy > 0.35`: its energy is above 0.35 *(proposal: keep)*
- **PHY** `p`: the partner or prey exists
- **SOC** `s.hunts.find(q => q.preyId === p.id && q.troopId === c.troopId)` (through `hunt`): a hunt of this colobus group by its community is under way

Number literals in its conditions: 12, 0.3, 0.35. Hand-set numbers in its advice, quota and dice conditions: 3.

### 83. Start a hunt of red colobus (`src/sim/candidates.ts:1458`)

`offer('hunt', p.id, …, V.LEAD)` in `meatAndHunting`; kind: hunt; key `meatAndHunting/hunt/LEAD#1`, print `49969d78`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through meatAndHunting() called at line 916:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.preyId > 0`: red colobus are in view or heard nearby
- **ADV** `world.environment.rain < 0.3`: it is not raining hard (rain under 0.3) *(proposal: keep)*
- **ADV** `c.energy > 0.35`: its energy is above 0.35 *(proposal: keep)*
- **PHY** `p`: the partner or prey exists
- **SOC** `!hunt | hunt := s.hunts.find(q => q.preyId === p.id && q.troopId === c.troopId)`: no hunt of this colobus group is under way yet
- **SWI** `huntValueOn(P)`: the hunt is valued as food *(true on the base)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*
- **QUO** `((s.huntDay[c.troopId] ?? NEVER) > time && x.ownMales >= P.huntMinMales) || (x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id && x.impulseUntil > time && x.ownMales >= P.huntEncMinMales)`: he has only just met this colobus group with enough own males in view (the lead is weighed for 0.1 h after the encounter; or on an experiment's hunting day) [huntMinMales = 3, huntEncMinMales = 2] *(proposal: keep)*
- **ADV** `r > 0 | r := huntRate(c, P, dist, x.ownMales, gaitOn(P) ? runSpeedOf(c, P) * 0.8 * bodyState(c) : P.walkMps)`: a capture can be expected and he needs energy: the hunt's expected energy rate is positive (the rules' value used as a gate) [walkMps = 0.35] *(proposal: keep)*

Reached through meatAndHunting() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `x.preyId > 0`: red colobus are in view or heard nearby
- **ADV** `c.age >= 12`: it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **ADV** `world.environment.rain < 0.3`: it is not raining hard (rain under 0.3) *(proposal: keep)*
- **ADV** `c.energy > 0.35`: its energy is above 0.35 *(proposal: keep)*
- **PHY** `p`: the partner or prey exists
- **SOC** `!hunt | hunt := s.hunts.find(q => q.preyId === p.id && q.troopId === c.troopId)`: no hunt of this colobus group is under way yet
- **SWI** `huntValueOn(P)`: the hunt is valued as food *(true on the base)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*
- **QUO** `((s.huntDay[c.troopId] ?? NEVER) > time && x.ownMales >= P.huntMinMales) || (x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id && x.impulseUntil > time && x.ownMales >= P.huntEncMinMales)`: he has only just met this colobus group with enough own males in view (the lead is weighed for 0.1 h after the encounter; or on an experiment's hunting day) [huntMinMales = 3, huntEncMinMales = 2] *(proposal: keep)*
- **ADV** `r > 0 | r := huntRate(c, P, dist, x.ownMales, gaitOn(P) ? runSpeedOf(c, P) * 0.8 * bodyState(c) : P.walkMps)`: a capture can be expected and he needs energy: the hunt's expected energy rate is positive (the rules' value used as a gate) [walkMps = 0.35] *(proposal: keep)*

Number literals in its conditions: 12, 0.3, 0.35, 0.8. Hand-set numbers in its advice, quota and dice conditions: 7.

### 84. Start a hunt (the older, quota-gated valuation) (`src/sim/candidates.ts:1465`)

`offer('hunt', p.id, …, V.LEAD)` in `meatAndHunting`; kind: hunt; key `meatAndHunting/hunt/LEAD#2`, print `0d6a9f18`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `NOT huntValueOn(P)`.

Reached through meatAndHunting() called at line 916:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `x.preyId > 0`: red colobus are in view or heard nearby
- **ADV** `world.environment.rain < 0.3`: it is not raining hard (rain under 0.3) *(proposal: keep)*
- **ADV** `c.energy > 0.35`: its energy is above 0.35 *(proposal: keep)*
- **PHY** `p`: the partner or prey exists
- **SOC** `!hunt | hunt := s.hunts.find(q => q.preyId === p.id && q.troopId === c.troopId)`: no hunt of this colobus group is under way yet
- **SWI** `NOT huntValueOn(P)`: the hunt is not valued as food *(**false on the base**)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*
- **QUO** `time - (s.lastHunt[c.troopId] ?? NEVER) > P.huntGapH`: the community gap since its last hunt has passed [huntGapH = 6] *(proposal: keep)*
- **QUO** `((s.huntDay[c.troopId] ?? NEVER) > time && x.ownMales >= P.huntMinMales) || (x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id && x.impulseUntil > time && x.ownMales >= P.huntEncMinMales)`: he has only just met this colobus group with enough own males in view (the lead is weighed for 0.1 h after the encounter; or on an experiment's hunting day) [huntMinMales = 3, huntEncMinMales = 2] *(proposal: keep)*

Reached through meatAndHunting() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `x.preyId > 0`: red colobus are in view or heard nearby
- **ADV** `c.age >= 12`: it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **ADV** `world.environment.rain < 0.3`: it is not raining hard (rain under 0.3) *(proposal: keep)*
- **ADV** `c.energy > 0.35`: its energy is above 0.35 *(proposal: keep)*
- **PHY** `p`: the partner or prey exists
- **SOC** `!hunt | hunt := s.hunts.find(q => q.preyId === p.id && q.troopId === c.troopId)`: no hunt of this colobus group is under way yet
- **SWI** `NOT huntValueOn(P)`: the hunt is not valued as food *(**false on the base**)*
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*
- **QUO** `time - (s.lastHunt[c.troopId] ?? NEVER) > P.huntGapH`: the community gap since its last hunt has passed [huntGapH = 6] *(proposal: keep)*
- **QUO** `((s.huntDay[c.troopId] ?? NEVER) > time && x.ownMales >= P.huntMinMales) || (x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id && x.impulseUntil > time && x.ownMales >= P.huntEncMinMales)`: he has only just met this colobus group with enough own males in view (the lead is weighed for 0.1 h after the encounter; or on an experiment's hunting day) [huntMinMales = 3, huntEncMinMales = 2] *(proposal: keep)*

Number literals in its conditions: 12, 0.3, 0.35.

### 85. Reconcile with its last opponent (`src/sim/candidates.ts:1481`)

`offer('reconcile', o.id, …)` in `affiliationRepair`; kind: make_up; key `affiliationRepair/reconcile/NONE#1`, print `d4a585f6`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through affiliationRepair() called at line 917:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `c.age >= 12` (through `adolescentOrAdult`): structure: adolescents and adults reach this through one call of the helper and the young through the other; together everyone who is not carried *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SOC** `c.lastConflict` (through `lc`): it had a conflict
- **QUO** `time - lc.time < P.reconcileWindowH | lc := c.lastConflict`: the conflict was within the post-conflict window [reconcileWindowH = 0.3] *(proposal: keep)*
- **QUO** `x.recon < lc.time | lc := c.lastConflict`: it has not reconciled since that conflict (once per conflict) *(proposal: keep)*
- **PHY** `o`: the other exists
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PER** `x.seen.includes(o.id)`: the opponent is in view
- **PER** `dcc(c, o) < P.reconcileRangeM`: the opponent is within reach [reconcileRangeM = 50]
- **ADV** `!(o.action === 'charge' || o.action === 'attack')`: the opponent is not charging or attacking now *(proposal: keep)*

Reached through affiliationRepair() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **SOC** `c.lastConflict` (through `lc`): it had a conflict
- **QUO** `time - lc.time < P.reconcileWindowH | lc := c.lastConflict`: the conflict was within the post-conflict window [reconcileWindowH = 0.3] *(proposal: keep)*
- **QUO** `x.recon < lc.time | lc := c.lastConflict`: it has not reconciled since that conflict (once per conflict) *(proposal: keep)*
- **PHY** `o`: the other exists
- **PHY** `o.alive`: the other is alive
- **SOC** `o.troopId === c.troopId`: the other is a member of its own community
- **PER** `x.seen.includes(o.id)`: the opponent is in view
- **PER** `dcc(c, o) < P.reconcileRangeM`: the opponent is within reach [reconcileRangeM = 50]
- **ADV** `!(o.action === 'charge' || o.action === 'attack')`: the opponent is not charging or attacking now *(proposal: keep)*

Number literals in its conditions: 12. Hand-set numbers in its advice, quota and dice conditions: 1.

### 86. Console the victim of a recent attack (`src/sim/candidates.ts:1493`)

`offer('console', v.id, …)` in `affiliationRepair`; kind: make_up; key `affiliationRepair/console/NONE#1`, print `32cb4182`. **live**; carries physical, perceptual, social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through affiliationRepair() called at line 917:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `c.age >= 12` (through `adolescentOrAdult`): structure: adolescents and adults reach this through one call of the helper and the young through the other; together everyone who is not carried *(always from 8)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `v.alive`: the victim is alive
- **SOC** `v.troopId === c.troopId`: the victim is a member of its own community
- **QUO** `time - vx.victimAt <= P.consoleWindowH`: the other was a victim within the consolation window [consoleWindowH = 0.15] *(proposal: keep)*
- **SOC** `vx.victimOf !== c.id`: it was not itself the aggressor
- **SOC** `vx.victimOf >= 0`: there was an aggressor
- **QUO** `x.consoleAt <= vx.victimAt`: it has not consoled since that attack (once per event) *(proposal: keep)*
- **QUO** `vx.consoledAt <= vx.victimAt`: the victim has not been consoled yet (once per event) *(proposal: keep)*
- **ADV** `NOT b < P.consoleBondMin && !kin | kin := maternalKin(c, v)`: the victim is its maternal kin, or a partner with a bond at the consolation minimum or above [consoleBondMin = 0.55] *(proposal: keep)*
- **PER** `dcc(c, v) < P.consoleRangeM`: the victim is within reach [consoleRangeM = 6]
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*

Reached through affiliationRepair() called at line 919:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **PHY** `!adolescentOrAdult | adolescentOrAdult := c.age >= 12 && !caretaker | caretaker := dependentOn(world, c)`: structure: the second call of this helper, for animals under 12 or dependent; the first call covers the rest *(always from 8)*
- **PHY** `!carried | carried := caretaker ? isCarried(c, caretaker) : false | caretaker := dependentOn(world, c)`: it is not being carried *(always from 8)*
- **PER** `EACH of x.seen`: each animal in view
- **PHY** `v.alive`: the victim is alive
- **SOC** `v.troopId === c.troopId`: the victim is a member of its own community
- **QUO** `time - vx.victimAt <= P.consoleWindowH`: the other was a victim within the consolation window [consoleWindowH = 0.15] *(proposal: keep)*
- **SOC** `vx.victimOf !== c.id`: it was not itself the aggressor
- **SOC** `vx.victimOf >= 0`: there was an aggressor
- **QUO** `x.consoleAt <= vx.victimAt`: it has not consoled since that attack (once per event) *(proposal: keep)*
- **QUO** `vx.consoledAt <= vx.victimAt`: the victim has not been consoled yet (once per event) *(proposal: keep)*
- **ADV** `NOT b < P.consoleBondMin && !kin | kin := maternalKin(c, v)`: the victim is its maternal kin, or a partner with a bond at the consolation minimum or above [consoleBondMin = 0.55] *(proposal: keep)*
- **PER** `dcc(c, v) < P.consoleRangeM`: the victim is within reach [consoleRangeM = 6]
- **ADV** `c.age >= 5`: it is 5 or older (a hand-set age) *(always from 8; proposal: keep)*

Number literals in its conditions: 12, 5. Hand-set numbers in its advice, quota and dice conditions: 2.

### 87. Carry on with the border patrol (`src/sim/candidates.ts:1511`)

`offer('patrol', patrol.leaderId === c.id ? -1 : patrol.leaderId, …, V.CONTINUE)` in `patrolAndCalls`; kind: confront_strangers; key `patrolAndCalls/patrol/CONTINUE#1`, print `c39df3f7`. **live**; carries physical, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SOC** `s.patrols[c.troopId]` (through `patrol`): a patrol of its community is under way
- **PHY** `c.action === 'patrol'`: it is on that patrol (carrying on)

Number literals in its conditions: 12. Hand-set numbers in its advice, quota and dice conditions: 1.

### 88. Join the border patrol under way (`src/sim/candidates.ts:1514`)

`offer('patrol', leader.id, …, V.JOIN)` in `patrolAndCalls`; kind: confront_strangers; key `patrolAndCalls/patrol/JOIN#1`, print `7a27a7e8`. **live**; carries physical, perceptual, social fact, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SOC** `s.patrols[c.troopId]` (through `patrol`): a patrol of its community is under way
- **ADV** `c.action !== 'patrol'`: it is not on patrol *(proposal: keep)*
- **PHY** `leader`: the patrol's leader exists
- **PHY** `leader.alive`: the leader is alive
- **PHY** `leader.id !== c.id`: it is not the leader
- **PER** `x.seen.includes(leader.id)`: the leader is in view
- **ADV** `c.hunger < 0.75`: its hunger is under 0.75 *(proposal: keep)*
- **SWI** `patrolValueOn(P)` (through `pv`): the patrol is valued from state *(true on the base)*

Number literals in its conditions: 12, 0.75. Hand-set numbers in its advice, quota and dice conditions: 2.

### 89. Join the patrol (the older valuation by sex) (`src/sim/candidates.ts:1515`)

`offer('patrol', leader.id, …, V.JOIN)` in `patrolAndCalls`; kind: confront_strangers; key `patrolAndCalls/patrol/JOIN#2`, print `56701e22`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!pv | pv := patrolValueOn(P)`.

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SOC** `s.patrols[c.troopId]` (through `patrol`): a patrol of its community is under way
- **ADV** `c.action !== 'patrol'`: it is not on patrol *(proposal: keep)*
- **PHY** `leader`: the patrol's leader exists
- **PHY** `leader.alive`: the leader is alive
- **PHY** `leader.id !== c.id`: it is not the leader
- **PER** `x.seen.includes(leader.id)`: the leader is in view
- **ADV** `c.hunger < 0.75`: its hunger is under 0.75 *(proposal: keep)*
- **SWI** `!pv | pv := patrolValueOn(P)`: the patrol is not valued from state *(**false on the base**)*

Number literals in its conditions: 12, 0.75.

### 90. Lead a border patrol (`src/sim/candidates.ts:1523`)

`offer('patrol', -1, …, V.LEAD)` in `patrolAndCalls`; kind: confront_strangers; key `patrolAndCalls/patrol/LEAD#1`, print `c385d8bb`. **live**; carries social fact, advice, quota or timer; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SOC** `!patrol | patrol := s.patrols[c.troopId]`: no patrol of its community is under way
- **SWI** `patrolValueOn(P)` (through `pv`): the patrol is valued from state *(true on the base)*
- **ADV** `isAdultMale(c)`: it is an adult male *(proposal: keep)*
- **ADV** `x.ownMales >= P.patrolMinMales`: at least the minimum number of adult males of its own in view [patrolMinMales = 3] *(proposal: keep)*
- **ADV** `c.hunger < P.patrolMaxHunger`: its hunger is under the patrol maximum [patrolMaxHunger = 0.75] *(proposal: keep)*
- **ADV** `env.rain < P.patrolMaxRain`: it is not raining hard [patrolMaxRain = 0.3] *(proposal: keep)*
- **QUO** `!(P.patrolValue >= 2) || (x.impulse === IMPULSE_PATROL && x.impulseUntil > time)`: his party has only just come to hold enough adult males (the lead is weighed for 0.1 h after that fusion; nothing is rolled) [patrolValue = 2] *(proposal: keep)*
- **ADV** `v > 0`: the mechanism gives the act a positive value: the rules' value used as a gate (patrol lead: stale border, odds, daylight left, fatigue; pant-hoot: what allies out of sight learn against what the crop loses) *(proposal: keep)*

Number literals in its conditions: 12. Hand-set numbers in its advice, quota and dice conditions: 5.

### 91. Lead a patrol (opened by the patrol hazard's roll) (`src/sim/candidates.ts:1528`)

`offer('patrol', -1, …, V.LEAD)` in `patrolAndCalls`; kind: confront_strangers; key `patrolAndCalls/patrol/LEAD#2`, print `0c7f3d50`. **legacy: unreachable on the working base**. Teacher: none.

Unreachable because: `!pv | pv := patrolValueOn(P)`.

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SOC** `!patrol | patrol := s.patrols[c.troopId]`: no patrol of its community is under way
- **SWI** `!pv | pv := patrolValueOn(P)`: the patrol is not valued from state *(**false on the base**)*
- **DIC** `x.impulse === IMPULSE_PATROL`: a patrol impulse was rolled from the patrol hazard *(proposal: rules)*
- **QUO** `x.impulseUntil > time`: the impulse is still open (a window of 0.1 h after it was raised) *(proposal: rules)*
- **ADV** `isAdultMale(c)`: it is an adult male *(proposal: keep)*
- **ADV** `x.ownMales >= P.patrolMinMales`: at least the minimum number of adult males of its own in view [patrolMinMales = 3] *(proposal: keep)*
- **ADV** `c.hunger < P.patrolMaxHunger`: its hunger is under the patrol maximum [patrolMaxHunger = 0.75] *(proposal: keep)*
- **ADV** `env.rain < P.patrolMaxRain`: it is not raining hard [patrolMaxRain = 0.3] *(proposal: keep)*

Number literals in its conditions: 12.

### 92. Pant-hoot (`src/sim/candidates.ts:1538`)

`offer('call', -1, …, V.CONTACT)` in `patrolAndCalls`; kind: call; key `patrolAndCalls/call/CONTACT#1`, print `3528442e`. **live**; carries advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `callValueOn(P)` (through `cv`): the pant-hoot is valued from state *(true on the base)*
- **ADV** `env.daylight > P.contactCallMinDaylight`: daylight is above the minimum for calling [contactCallMinDaylight = 0.3] *(proposal: keep)*
- **ADV** `v > 0`: the mechanism gives the act a positive value: the rules' value used as a gate (patrol lead: stale border, odds, daylight left, fatigue; pant-hoot: what allies out of sight learn against what the crop loses) *(proposal: keep)*

Number literals in its conditions: 12. Hand-set numbers in its advice, quota and dice conditions: 2.

### 93. Food call at a rich tree (older) (`src/sim/candidates.ts:1539`)

`offer('call', -1, …, V.FOODCALL)` in `patrolAndCalls`; kind: call; key `patrolAndCalls/call/FOODCALL#1`, print `6a463d0f`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!cv | cv := callValueOn(P)`.

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `!cv | cv := callValueOn(P)`: the pant-hoot is not valued from state *(**false on the base**)*
- **QUO** `(cv && callGapOn(P, 1)) || time - x.lastCall > 0.5 | cv := callValueOn(P)` (through `callReady`): 0.5 h since its last call *(not read on the base; proposal: keep)*
- **PHY** `c.action === 'forage'`: it is feeding
- **ADV** `x.fruitNear >= 0.6`: much fruit nearby (0.6 or more) *(proposal: keep)*

Number literals in its conditions: 12, 0.5, 0.6.

### 94. Join the dawn or dusk chorus (older) (`src/sim/candidates.ts:1540`)

`offer('call', -1, …, V.CHORUS)` in `patrolAndCalls`; kind: call; key `patrolAndCalls/call/CHORUS#1`, print `dc75d3ad`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!cv | cv := callValueOn(P)`.

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `!cv | cv := callValueOn(P)`: the pant-hoot is not valued from state *(**false on the base**)*
- **QUO** `time - x.lastCall > 1.5`: 1.5 h since its last call *(proposal: keep)*
- **ADV** `(hour >= 18 && hour < 19) || (hour >= 6.4 && hour < 7.4)`: the clock is in the dusk hour (18 to 19) or the dawn hour (6.4 to 7.4) *(proposal: keep)*
- **ADV** `env.daylight > 0.05`: some daylight *(proposal: keep)*

Number literals in its conditions: 12, 1.5, 18, 19, 6.4, 7.4, 0.05.

### 95. Pant-hoot at a reunion (a male) (`src/sim/candidates.ts:1541`)

`offer('call', -1, …, V.REUNION)` in `patrolAndCalls`; kind: call; key `patrolAndCalls/call/REUNION#1`, print `2fbb9c2b`. **live**; carries perceptual, advice; stays on the menu behind its rules, counted. Teacher: the rules' own judgment (scaffold).

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **QUO** `(cv && callGapOn(P, 1)) || time - x.lastCall > 0.5 | cv := callValueOn(P)` (through `callReady`): 0.5 h since its last call *(not read on the base; proposal: keep)*
- **PER** `x.newcomers > 0`: an animal it had not seen for more than the reunion span has come into view
- **ADV** `c.sex === 'male'`: the actor is male *(proposal: keep)*

Number literals in its conditions: 12, 0.5. Hand-set numbers in its advice, quota and dice conditions: 1.

### 96. Contact pant-hoot when alone (older) (`src/sim/candidates.ts:1547`)

`offer('call', -1, …, V.CONTACT)` in `patrolAndCalls`; kind: call; key `patrolAndCalls/call/CONTACT#2`, print `0ead52ef`. **legacy: unreachable on the working base**. Teacher: the rules' own judgment (scaffold).

Unreachable because: `!cv | cv := callValueOn(P)`.

Reached through patrolAndCalls() called at line 918:
- **PHY** `c.alive`: the animal is alive *(always from 8)*
- **ADV** `c.age >= 12` (through `adolescentOrAdult`): it is 12 or older (adolescent or adult; a hand-set age) *(proposal: keep)*
- **PHY** `!caretaker | caretaker := dependentOn(world, c)` (through `adolescentOrAdult`): it is not a dependent (weaned, or 6 or older) *(always from 8)*
- **SWI** `!cv | cv := callValueOn(P)`: the pant-hoot is not valued from state *(**false on the base**)*
- **SWI** `P.contactCallW > 0`: contact calls are on [contactCallW = 0.5] *(true on the base)*
- **QUO** `time - x.lastCall > P.contactCallGapH`: the contact-call gap since its last call has passed [contactCallGapH = 0.75] *(proposal: keep)*
- **ADV** `env.daylight > P.contactCallMinDaylight`: daylight is above the minimum for calling [contactCallMinDaylight = 0.3] *(proposal: keep)*
- **ADV** `x.visibleOwn < 2`: fewer than 2 companions in view *(proposal: keep)*

Number literals in its conditions: 12, 2.

## 6. Every advice, quota and dice condition of a live site

| Class | Condition | In plain words | Proposal | Packet line | Sites (lines) |
|---|---|---|---|---|---|
| ADV | `drive > 0.25 \| drive := (company ? nestDrive + company : nestDrive) - raceG \| company := P.nestCompany === 1 && inNest && !caretaker && c.age >= 5 ? nestCompany …` | the nest's own value, less what waiting would lose of a contested crop, is above 0.25: the rules' value used as a gate | drop (only once body outcomes are allowed as a teacher) | `body (sleepiness and body clock) and now (the light)` | 287 |
| ADV | `open \| open := rS ? env.daylight < 1 : hour >= 12 \|\| night \| rS := P.rhythmSleep === 1 \| night := env.daylight < 0.1` | a new nest may be started only when daylight is below full (with the sleep mechanism, as on the base; otherwise from 12:00 or at night) | keep |  | 287 |
| ADV | `cold > 0` | its body is colder than neutral (thermal load below zero): sheltering is offered only then | drop (only once body outcomes are allowed as a teacher) | `body (temperature) and now (the weather)` | 422 |
| ADV | `c.age < P.juvenileFollowMaxAgeY` | it is younger than the age up to which a juvenile keeps up with its guardian | keep |  | 453 |
| ADV | `water ? c.thirst > 0 : c.thirst > 0.25 \| water := waterOn(P)` | it is thirsty at all: the water ledger's thirst is above zero (above 0.25 without the ledger) | drop (only once body outcomes are allowed as a teacher) | `body (water)` | 597 |
| ADV | `EACH k < 4 && _mem.length` | only the four trees the rules value most are offered (the trip shortlist: a ranking by the rules' own value) | drop | `each target's belief words (crop when seen, hours since, distance and direction)` | 648 |
| ADV | `c.age >= 10` | it is 10 or older (a hand-set age) | keep |  | 648, 1370, 1374, 1384 |
| ADV | `c.action !== 'patrol'` | it is not on patrol | keep |  | 691, 701, 1514 |
| ADV | `c.action !== 'consort'` | it is not on a consortship | keep |  | 701, 1384 |
| ADV | `c.action !== 'transfer'` | it is not transferring | keep |  | 701 |
| ADV | `here > P.homeLevel` | it stands outside its community's range (use level above the home level) | keep |  | 701 |
| ADV | `c.age < 16` | it is younger than 16 (play-climbing is for the young) | keep |  | 704 |
| ADV | `o.action === 'rest' \|\| o.action === 'groom' \|\| o.action === 'shelter' \|\| o.action === 'nurse'` | the other is settled: resting, grooming, sheltering or nursing | drop (only for the pairs a wild choice record covers) | `nearby (each animal's act)` | 810 |
| ADV | `o.age >= 1` | the other is at least 1 year old | keep |  | 810, 822, 825 |
| ADV | `!busy \| busy := o.action === 'flee' \|\| o.action === 'charge' \|\| o.action === 'attack' \|\| o.action === 'display' \|\| o.action === 'transfer'` | the other is not fleeing, charging, attacking, displaying or transferring | keep |  | 822, 825 |
| ADV | `Math.abs(o.age - c.age) < 7` | the two are within 7 years of age | keep |  | 822 |
| ADV | `c.age < 15` | it is younger than 15 | keep |  | 822 |
| ADV | `o.age < 15` | the other is younger than 15 | keep |  | 822 |
| ADV | `NOT c.age >= 1 && c.age < 15 && o.age < 15 && Math.abs(o.age - c.age) < 7 && !(dependentOn(world, o) && isCarried(o, dependentOn(world, o)))` | the two are not a pair of young peers (the first play rule did not apply) | keep |  | 825 |
| ADV | `c.age >= 15` | it is 15 or older | keep |  | 825, 898, 1203, 1213, 1374, 1384 |
| ADV | `o.age < 8` | the other is under 8 | keep |  | 825 |
| ADV | `!AFFILIATIVE[o.action]` | the other is not reconciling, grooming, consoling, playing or sharing | keep |  | 833 |
| ADV | `!night \| night := env.daylight < 0.1` | it is not night (daylight at 0.1 or more) | keep |  | 833, 845, 853, 888, 898, 908, 1156, 1172, 1188, 1191, 1197, 1203, 1213, 1225, 1232, 1240, 1255, 1260 |
| ADV | `!repairing \| repairing := c.lastConflict?.opponentId === o.id && time - c.lastConflict.time < P.reconcileWindowH && b >= P.avoidRepairBondMin` | it has no fresh conflict with a valued partner to repair with that animal | keep |  | 833 |
| ADV | `d < P.avoidCloseM \|\| o.targetId === c.id \|\| o.action === 'display' \|\| o.action === 'charge'` | the other is very close, is aiming at it, or is displaying or charging | keep |  | 833 |
| ADV | `dominates(o, c)` | the other outranks it (the direction of rank) | keep |  | 833, 881 |
| ADV | `tn >= P.rivalTension` | its tension with the other is at the rival level or above | keep |  | 833, 1197 |
| ADV | `c.age >= 12` | it is 12 or older (adolescent or adult; a hand-set age) | keep |  | 858, 898, 908, 1156, 1172, 1188, 1191, 1197, 1203, 1213, 1225, 1232, 1240, 1255, 1260, 1287, 1288, 1319, 1320, 1322, 1324, 1325, 1340, 1341, 1342, 1355, 1370, 1374, 1384, 1398, 1399, 1445, 1458, 1511, 1514, 1523, 1538, 1541 |
| ADV | `c.sex === 'female'` | the actor is female | keep |  | 858 |
| ADV | `o.age >= 15` | the other is 15 or older | keep |  | 858, 1191, 1232 |
| ADV | `o.sex === 'male'` | the other is male | keep |  | 858, 1191 |
| ADV | `(o.sex === 'male' && o.age >= P.pantGruntMaleAgeY) \|\| o.age >= 15` | the other is a male of the greeting age or more, or anyone of 15 or more | keep |  | 881 |
| ADV | `sc > bestGruntScore \| sc := 0.3 + (troop?.alphaId === o.id ? 0.4 : 0.05) + (displaying ? 0.8 : 0) + c.stress * 0.3 + (x.newcomers > 0 ? 0.15 : 0) + (o.sex === ' …` | of the dominants in reach, only the one the rules score highest is offered (alpha, displaying, nearer score more) | drop | `nearby (rank, distance, what it is doing) and last (greeted when)` | 881 |
| ADV | `c.sex === 'male'` | the actor is male | keep |  | 898, 908, 1203, 1232, 1319, 1320, 1324, 1458, 1541 |
| ADV | `sc > 0 \| sc := fast ? rainFastScore(c, x, time, P) : rainScore(c, x, P) \| fast := endoOn(P, 'endoFast')` | its arousal gives the display a positive value: the rules' value used as a gate | keep |  | 898 |
| ADV | `dispOpen \|\| (quotaTrace.on && male && e > 0.3) \| dispOpen := male && e > 0.3 && (aggrBit(P, 4) \|\| time - x.lastDisplay > 0.75) \| male := c.sex === 'male' \| e := …` | the display's gate as the diagnostic hook sees it: a male with energy above 0.3 and, without the switch, 0.75 h since his last display (its parts are listed after it) | keep |  | 908 |
| ADV | `e > 0.3 \| e := c.energy` | its energy is above 0.3 | keep |  | 908 |
| ADV | `cl > rivalCloseness` | of the ranked males in view, only the one closest to it in rank score is its rival | keep |  | 1156 |
| ADV | `o.age >= 12` | the other is 12 or older | keep |  | 1156 |
| ADV | `rankedMale(c)` | it is a ranked male | keep |  | 1156 |
| ADV | `rankedMale(o)` | the other is a ranked male | keep |  | 1156 |
| ADV | `!kin \| kin := maternalKin(c, o)` | the other is not its maternal kin (kin are never charged) | keep |  | 1188, 1197, 1203, 1225, 1232 |
| ADV | `dominates(c, o)` | it outranks the other (the direction of rank) | keep |  | 1188, 1197, 1225 |
| ADV | `o.age >= 5` | the other is 5 or older | keep |  | 1188, 1197, 1225 |
| ADV | `Math.abs(o.elo - c.elo) < P.escalateEloGap` | the other is close to it in rank score | keep |  | 1191 |
| ADV | `endoEsc \|\| (tr && escOn) \| endoEsc := escOn && cooled \| escOn := endoOn(P, 'endoEscalate') && isAdultMale(c) \| cooled := aggrBit(P, 1) \|\| time - x.lastAgg > 1.5 …` | an adult male past the aggression cooldown (the gate as the diagnostic hook sees it; its parts are listed after it) | keep |  | 1191 |
| ADV | `isAdultMale(c)` | it is an adult male | keep |  | 1191, 1523 |
| ADV | `sc > 0` | the slow states give the attack a positive value: the rules' value used as a gate | keep |  | 1191 |
| ADV | `o.sex === 'female'` | the other is female | keep |  | 1203, 1213, 1232 |
| ADV | `o.swelling >= P.coerceSwellingMin` | her swelling is at the coercion level or above | keep |  | 1203 |
| ADV | `!male \| male := c.sex === 'male'` | the actor is female | keep |  | 1213 |
| ADV | `tenureC >= 3 \| tenureC := ix(c).immigrantAge < 0 ? c.age - 10 : c.age - ix(c).immigrantAge` | the actor has 3 or more years of tenure (a resident) | keep |  | 1213 |
| ADV | `guardianOf(world, o) !== c` | it is not the other's guardian (a guardian never supplants its ward) | keep |  | 1225 |
| ADV | `o.targetId === forageTree \|\| (h > P.feedChargeHungerMin && x.trees.includes(o.targetId)) \| forageTree := c.action === 'forage' ? c.targetId : -1 \| h := c.hunger` | the other feeds in the tree it feeds in itself, or, when its own hunger is above the threshold, in a tree in view | keep |  | 1225 |
| ADV | `world.environment.fruitIndex < 0.4 \|\| (t !== undefined && (P.patchEcology === 1 ? fruitAt(world, t) : t.fruit) < 0.3)` | fruit is scarce: in the habitat (index under 0.4, a figure no animal perceives) or in that tree (crop under 0.3) | keep |  | 1225 |
| ADV | `c.age < P.femaleDomMaxAgeY` | the actor is younger than the age limit (an adolescent male) | keep |  | 1232 |
| ADV | `!guardBySize(P) \|\| !wardHoldsOwn(world, o, ag, P)` | its ward cannot hold its own against the aggressor (assessed odds under even) | keep |  | 1240 |
| ADV | `c.sex === ag.sex \|\| stranger \| stranger := ag.troopId !== c.troopId` | the aggressor is of its own sex, or a stranger (no charging back across the sexes inside the community) | keep |  | 1287, 1288 |
| ADV | `!transferring \| transferring := c.action === 'transfer' \|\| (x.transferTo > 0 && c.troopId === c.natalTroopId)` | it is not transferring to another community (a transferring female keeps going) | keep |  | 1319, 1320, 1322, 1324, 1325 |
| ADV | `NOT c.sex === 'male' && immigrantLike \| immigrantLike := s.sex === 'female' && s.swelling >= P.immigrantLikeSwelling && !s.lactating` | not a male facing a swollen, childless stranger female (males tolerate a likely immigrant) | keep |  | 1319, 1320, 1322, 1324, 1325 |
| ADV | `own >= 3 \| own := x.ownMales` | at least 3 males of its own in view | keep |  | 1319, 1320, 1340, 1341 |
| ADV | `own >= str + 2 \| own := x.ownMales \| str := x.strangerMales` | at least 2 more males than the strangers have | keep |  | 1319, 1320 |
| ADV | `NOT c.sex === 'male' && own >= 3 && own >= str + 2 && (aggrBit(P, 2) \|\| time - x.lastAgg > 0.2) \| own := x.ownMales \| str := x.strangerMales` | the charge rule did not apply: not a male with 3 or more own males and 2 more than theirs | keep |  | 1322, 1324, 1325 |
| ADV | `own < str + 1 \|\| own < 2 \|\| fear > 0.3 \| own := x.ownMales \| str := x.strangerMales \| fear := withInfant ? 0.6 : c.sex === 'female' ? 0.25 : 0 \| withInfant := c …` | outnumbered, alone among males, or fearful (a female with an infant) | keep |  | 1322 |
| ADV | `fear <= 0.3 \| fear := withInfant ? 0.6 : c.sex === 'female' ? 0.25 : 0 \| withInfant := c.sex === 'female' && c.lactating` | not fearful (a female with an infant is) | keep |  | 1324, 1325 |
| ADV | `own >= 2 \| own := x.ownMales` | at least 2 males of its own in view | keep |  | 1324, 1325 |
| ADV | `own >= str + 1 \| own := x.ownMales \| str := x.strangerMales` | at least one more male of its own than the strangers have | keep |  | 1324, 1325 |
| ADV | `c.sex !== 'male'` | the actor is female | keep |  | 1325 |
| ADV | `NOT own >= 3 && c.sex === 'female' && !inRange \| own := x.ownMales \| inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < tro …` | not a female with 3 or more males around hearing calls from outside the range (she stays quiet with the males) | keep |  | 1340, 1341, 1342 |
| ADV | `c.sex === 'male' \|\| inRange \| inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troop.radius * 1.05 : false` | a male, or the calls came from inside its own range | keep |  | 1340, 1341 |
| ADV | `NOT own >= 3 && (c.sex === 'male' \|\| inRange) \| own := x.ownMales \| inRange := troop ? Math.hypot(x.heardX - troop.center[0], x.heardZ - troop.center[2]) < troo …` | fewer than 3 own males in view (or a female hearing calls from outside the range) | keep |  | 1342 |
| ADV | `NOT maternalKin(c, o)` | the other is not its maternal kin (no mating between maternal kin) | keep |  | 1370, 1374, 1384, 1398, 1399 |
| ADV | `o.age >= 10` | the other is 10 or older | keep |  | 1370, 1374, 1384, 1398, 1399 |
| ADV | `!(g && g !== c && g.alive && dcc(c, g) < P.guardRivalRangeM)` | no other male is guarding her nearby | keep |  | 1374 |
| ADV | `!guarded \| guarded := !!g && g.alive && g !== c && dcc(c, g) < P.guardedRangeM && dominates(g, c)` | she is not guarded by a male who outranks it | keep |  | 1374, 1384 |
| ADV | `c.rankOrder <= 2 \|\| isAlpha \| isAlpha := troop?.alphaId === c.id` | it holds one of the top two ranks (or is the alpha) | keep |  | 1374 |
| ADV | `o.swelling >= P.guardSwellingMin` | her swelling is at the guarding level or above | keep |  | 1374 |
| ADV | `!isAlpha \| isAlpha := troop?.alphaId === c.id` | it is not the alpha (the alpha guards instead) | keep |  | 1384 |
| ADV | `bond(c, o) >= P.consortBondMin` | its bond with her is at the consortship minimum or above | keep |  | 1384 |
| ADV | `o.swelling >= P.consortSwellingMin` | her swelling is at the consortship level or above | keep |  | 1384 |
| ADV | `c.carryingMeat < 0.05` | it holds (almost) no meat itself | keep |  | 1429 |
| ADV | `c.energy > 0.35` | its energy is above 0.35 | keep |  | 1445, 1458 |
| ADV | `world.environment.rain < 0.3` | it is not raining hard (rain under 0.3) | keep |  | 1445, 1458 |
| ADV | `r > 0 \| r := huntRate(c, P, dist, x.ownMales, gaitOn(P) ? runSpeedOf(c, P) * 0.8 * bodyState(c) : P.walkMps)` | a capture can be expected and he needs energy: the hunt's expected energy rate is positive (the rules' value used as a gate) | keep |  | 1458 |
| ADV | `!(o.action === 'charge' \|\| o.action === 'attack')` | the opponent is not charging or attacking now | keep |  | 1481 |
| ADV | `NOT b < P.consoleBondMin && !kin \| kin := maternalKin(c, v)` | the victim is its maternal kin, or a partner with a bond at the consolation minimum or above | keep |  | 1493 |
| ADV | `c.hunger < 0.75` | its hunger is under 0.75 | keep |  | 1514 |
| ADV | `c.hunger < P.patrolMaxHunger` | its hunger is under the patrol maximum | keep |  | 1523 |
| ADV | `env.rain < P.patrolMaxRain` | it is not raining hard | keep |  | 1523 |
| ADV | `v > 0` | the mechanism gives the act a positive value: the rules' value used as a gate (patrol lead: stale border, odds, daylight left, fatigue; pant-hoot: what allies out of sight learn against what the crop loses) | keep |  | 1523, 1538 |
| ADV | `x.ownMales >= P.patrolMinMales` | at least the minimum number of adult males of its own in view | keep |  | 1523 |
| ADV | `env.daylight > P.contactCallMinDaylight` | daylight is above the minimum for calling | keep |  | 1538 |
| QUO | `time - x.joinAt < 0.3` | it heard the call within the last 0.3 h (a window after the event) | keep |  | 691 |
| QUO | `c.age - x.immigrantAge < 2` | it immigrated less than 2 years ago (a window) | keep |  | 858 |
| QUO | `open \| open := greetMem ? x.greet[o.id] === undefined \|\| ((o.action === 'charge' \|\| o.action === 'attack') && o.targetId === c.id) : time - last > P.pantGruntRe …` | once per association: it has not greeted this animal since they last met, or that animal has just charged or attacked it (without the switch: 8 h since the last greeting) | keep |  | 881 |
| QUO | `open \|\| quotaTrace.on \| open := greetMem ? x.greet[o.id] === undefined \|\| ((o.action === 'charge' \|\| o.action === 'attack') && o.targetId === c.id) : time - las …` | once per association: it has not greeted this animal since they last met, or that animal has just charged or attacked it (without the switch: 8 h since the last greeting) | keep |  | 881 |
| QUO | `time - (x.hooAt ?? NEVER) <= P.travelHooWindowMin / 60` | it heard the hoo within the last few minutes (a window after the event) | keep |  | 888 |
| QUO | `time - at < (fast ? fastSpanH(P) : P.impulseDurationH) \| fast := endoOn(P, 'endoFast')` | a storm began within the span of the fast arousal state (a window after the event) | keep |  | 898 |
| QUO | `x.lastDisplay < at` | it has not displayed since the storm began (once per storm) | keep |  | 898 |
| QUO | `x.impulseUntil > time` | the impulse is still open (a window of 0.1 h after it was raised) | rules |  | 1172 |
| QUO | `time - x.lostAt < (fastRed ? fastSpanH(P) : endoRed ? P.endoStressTauH : P.redirectWindowH) \| fastRed := endoOn(P, 'endoFastRedirect') \| endoRed := endoOn(P, 'e …` | it lost a contest within the last stress time constant (a window after the event) | keep |  | 1188 |
| QUO | `x.lastAgg < x.lostAt` | it has not aggressed since that loss (once per loss) | keep |  | 1188 |
| QUO | `(ix(o).coerce[c.id] ?? 0) < P.coerceMaxRepeats` | it has charged her fewer times than the repeat limit | keep |  | 1203 |
| QUO | `o.age - ox.immigrantAge < 2` | she immigrated less than 2 years ago (a window) | keep |  | 1213 |
| QUO | `time - ox.victimAt < 0.05` | the other was attacked within the last 0.05 h (a window after the event) | keep |  | 1240 |
| QUO | `time - x.coalAt < P.coalitionWindowH` | it was alerted to a conflict within the last 0.05 h (a window; who is alerted is decided in conflict.ts) | keep |  | 1255 |
| QUO | `world.time - x.victimAt <= 0.03` | it was threatened within the last 0.03 h, about 2 minutes (a window after the event) | keep |  | 1283, 1284, 1287, 1288 |
| QUO | `time - x.heardAt < 0.2` | it heard them within the last 0.2 h (a window after the event) | keep |  | 1340, 1341, 1342 |
| QUO | `(mateOpen && pg > 0) \|\| quotaTrace.on \| mateOpen := mv \|\| time - x.lastMate > P.mateIntervalH \| mv := matingValueOn(P) \| pg := mv ? paternityGain(o, c, P, world …` | the mating quota: 1.5 h since his last copulation (the diagnostic hook aside) | keep |  | 1370 |
| QUO | `mv \|\| time - x.lastMate > P.mateIntervalH \| mv := matingValueOn(P)` | the mating quota: 1.5 h since his last copulation | keep |  | 1370 |
| QUO | `(maleOpen && pg > 0) \|\| quotaTrace.on \| maleOpen := mv \|\| time - ix(o).lastMate > P.mateIntervalH \| mv := matingValueOn(P) \| pg := mv ? paternityGain(c, o, P, w …` | the male's mating quota gates her offer too: 1.5 h since his last copulation (the diagnostic hook aside) | keep |  | 1398, 1399 |
| QUO | `mv \|\| time - ix(o).lastMate > P.mateIntervalH \| mv := matingValueOn(P)` | the male's mating quota gates her offer too: 1.5 h since his last copulation | keep |  | 1398, 1399 |
| QUO | `mv \|\| time - x.lastMate > 0.3 \| mv := matingValueOn(P)` | 0.3 h since her last copulation | keep |  | 1398, 1399 |
| QUO | `((s.huntDay[c.troopId] ?? NEVER) > time && x.ownMales >= P.huntMinMales) \|\| (x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id && x.impulseUntil > time &&  …` | he has only just met this colobus group with enough own males in view (the lead is weighed for 0.1 h after the encounter; or on an experiment's hunting day) | keep |  | 1458 |
| QUO | `time - lc.time < P.reconcileWindowH \| lc := c.lastConflict` | the conflict was within the post-conflict window | keep |  | 1481 |
| QUO | `x.recon < lc.time \| lc := c.lastConflict` | it has not reconciled since that conflict (once per conflict) | keep |  | 1481 |
| QUO | `time - vx.victimAt <= P.consoleWindowH` | the other was a victim within the consolation window | keep |  | 1493 |
| QUO | `vx.consoledAt <= vx.victimAt` | the victim has not been consoled yet (once per event) | keep |  | 1493 |
| QUO | `x.consoleAt <= vx.victimAt` | it has not consoled since that attack (once per event) | keep |  | 1493 |
| QUO | `!(P.patrolValue >= 2) \|\| (x.impulse === IMPULSE_PATROL && x.impulseUntil > time)` | his party has only just come to hold enough adult males (the lead is weighed for 0.1 h after that fusion; nothing is rolled) | keep |  | 1523 |
| DIC | `(x.impulse === IMPULSE_TRANSFER && x.impulseUntil > time) \|\| c.action === 'transfer' \|\| intent \| intent := x.transferTo > 0 && c.troopId === c.natalTroopId` | a dispersal impulse was rolled (a yearly hazard for a natal female of dispersal age while swollen), or the transfer it began is still under way | rules |  | 939 |
| DIC | `x.impulse === IMPULSE_INFANTICIDE` | an infanticide impulse was rolled at perception (per look at a stranger's infant when its males outnumber theirs by the margin, or for a new alpha and an infant he did not sire) | rules |  | 1172 |
| DIC | `gangT \| gangT := x.impulse === IMPULSE_GANG && x.impulseUntil > time ? byId.get(x.impulseTarget) : undefined` | a gang-attack impulse was rolled at perception (probability 0.5, one roll per 6 h at most, with 3 or more own males against a lone stranger of 10 or more, on patrol or near the range's edge) | rules |  | 1320 |

123 distinct conditions: 92 advice, 28 quota or timer, 3 dice. Proposed: keep 113, drop 6, leave with the rules 4. Of the 6 to drop, 2 need no teacher but the rules (the rules value every option the rule cut), 1 can go only for the pairs a wild choice record covers and 3 only once body outcomes are allowed as a teacher.

## 7. The switches of the working base the sites stand behind

trace off; resources off; menu1 off; menu2 off; circ on; dark on; rH on; rS on; race on; fr on; gv off; shortlist on; routeChain off; callerRate on; social4 on; cohesion on; callTrip off; party on; joinChoice on; partyJoinTrip on; travelHoo on; followCarer on; endoRain on; endoEscalate on; body off; carry off; respond off; bodyAny off; huntValue on; huntEncounter on; pv on; pv2 on; cv on; callGap1 on; callGap2 on; contactCall on; mv off; aggr1 on; aggr2 on; aggr4 on; social1 on; social2 on; social8 on; weanOutcome off; water on; dv on; guardBySize on.

374 distinct conditions over 96 sites; classification file sha256 627cb7d6c8e4….

