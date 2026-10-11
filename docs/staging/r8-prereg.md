# Stage R8: the animal's own experience in the packet (packet 5), and neutral option wording (pre-registration)

Agent r8-packet5, branch `r8-packet5` from `track-e` dea2643. Registered 10 October 2026, 19:43 EDT, before any code.
Specification: `IMPLEMENTATION_PLAN.md`, Track R, "User decisions (10 October 2026)" and "Stage R8".

The user's decision that binds this stage (10 October 2026), as the integrator recorded it: the packet may show the
animal's own experience (its current act and the time in it, why it is being asked when that is something it perceived
or felt, its companions' routine acts, its own foraging returns, its social timing). Still barred: any rate, score or
ranking the rules computed for an option. The rules' own wording leaves the model's input (the reason sentence on each
option, the purpose phrase, the instruction's sentence on dominance, the "urgent … needs X now" line).

No model is loaded here, nothing is trained, no benchmark is run. Simulation: unit-test worlds, and one simulated day of
the working base on seed 48 for the sampler's smoke test. No switch default changes. Goldens and the field pin must not
move.

## 1. The switch

`observeV5`, registry group `decision`, 0 by default in both profiles. Its note begins "Stage R8", so it is not a Track E
switch.

- **0 (today):** nothing changes. Requests and both text packets hash as they do at dea2643. The hashes below were
  printed by one script at the untouched base commit before any code was written, and the test pins them.
- **1:** `observe()` returns everything `observeV4` 1 returns (the body, the light, each option's values) plus the
  fields of §2, with the marker `packet: 5`. The loop keeps the small record of §3. The text builder writes the packet
  of §5 for a context with `packet: 5`.

Hashes at dea2643 (requests of every living animal; then the GLiNER and Jev texts of every valid request; then, where
the world carries `observeV4` 1 and `menuParity` 1, the state-only packet of `scripts/lib/packet-state.ts`):

| World | Requests | Both texts | State-only |
| --- | --- | --- | --- |
| compressed, seed 48, noon | e2a8ceeddecec9ea | 25c1a437a46f8c26 | |
| compressed, seed 48, dusk | 7eb562dc80143a22 | 73b5649f644be88b | |
| compressed, seed 7, noon | 96d75aa2580993a0 | 66b58144b90fa1ff | |
| compressed, seed 7, dusk | b82e466483971e16 | 4d9762f375854092 | |
| field, working base, seed 48, 12:30 of day 2 | ba7ab9bba4f3ceef | 1704e1f1b912e977 | |
| field, working base, seed 48, dusk of day 2 | d02807f187e258ff | f43accb54b96e50a | |
| the same with `observeV4` 1, `menuParity` 1, 12:30 | 16d952c50a156690 | 78ccd982f778350f | b84ab84166fce8e8 |
| the same with `observeV4` 1, `menuParity` 1, dusk | 6fc68e69c057f7f9 | c11c227d5ca8646f | 93425aefa90aaba1 |

The compressed rows are the ones stage R2 pinned. World hashes of the field rows: 11cc8f4360cf6cd6 (12:30) and
8e5fa7068c1d4ba7 (dusk), the same with and without the two packet switches.

## 2. What the observation gains (all optional, all documented in `src/types.ts`)

Everything is built inside `observe()` from the focal animal's own body, its last perception snapshot, its memory and
the record of §3. No draw from `world.rng`, no write, no animal or tree it neither perceives nor remembers.

**`own.doing`: what it is doing.** The act, its target in words (a partner's name, a tree's species, the form of the
act), the minutes in it, and, when the act has just come to its own end, how: arrived; the crop here is finished; eaten
its fill; drunk its fill; the partner moved away; the partner is gone; caught up; lost sight of the one followed; the
rain eased; nobody came along; over; no longer possible. Each is read from the animal's own state at the moment the
act ended.

**`own.asked`: why it is being asked.** Only something the animal perceived or felt. One reason, in this order:

1. A perceived event opened the decision point: the loop's own interrupt text, which is always a perception ("Chiriku
   is moving off", "Nkeru gave a travel hoo", "Kato began grooming me", "Obi is displaying nearby", "heard 2 strangers
   pant-hoot", "nobody came along").
2. Its act came to its own end (the word of `own.doing`).
3. A feeling moved to another word since it last chose (hunger, thirst, sleepiness, loneliness or fear: grown or
   eased), or the light passed into another phase (dawn, day, dusk, night).
4. Otherwise the field is absent. A scheduled end of a bout, the 30 minute limit and the clock periods (11:30 and
   14:30) are loop timers and are never named.

Two notes. Item 3 includes a feeling that eased; the plan's examples name only a feeling that stepped up. Both are
felt, so both are shown, and §9 puts it to the user. And the words of item 3 are the packet's own drive words, whose
four thresholds are also the gate's need buckets: when the gate re-opens a choice on a need bucket, this line names the
feeling. It describes the change; it does not decide when the animal is asked.

**Companions' acts in `social`.** Each perceived animal already carries its act. New: the compass direction it is
moving in when it is on the move, whether its distance from the focal animal is growing ("leaving"), and whether its
act is aimed at the focal animal ("grooming me"). All visible to an animal that sees it.

**`own.lately`: its own foraging returns.**

- Eating now against the start of this bout: the amount eaten in the latest complete 5 minute step of this feeding bout
  over the amount in its first step, shown once two steps are complete. The 5 minutes are the simulation's slow step,
  not a new number.
- What its last trips gave against what it expected: for each closed trip to a crown, what it ate there over the meal
  it set out for (the believed crop's share, capped by the room in its gut; the function the trip mechanism already
  uses). Only the comparison is ever worded; the number is not shown.
- Crowns it fed in since it last left a nest.

**Social timing.** On each perceived animal: hours since the focal animal groomed it, was groomed by it, and greeted it
(a pant-grunt). On the context, `own.aggression`: its last aggression given or received (threat or attack, when, with
whom).

**`about` on each option.** What the option is in the animal's own terms, so a label can be written without the rules'
reason sentence: which form of the act it is where an act has physically different forms (a trip to a tree, a trip
joined with a companion, toward a caller, back toward the middle of the range; stay in the nest or build one; and so
on), the tree's species, the companion's name, the distance and the compass direction. The motive is never part of it.

**Not added.** No rate, score or ranking of an option. The observation still carries each option's rules `score` and
the valuation fields of stage R2 (`kcalH`, `share`, `company`, the swings, `feedDrive`, `fullKcalH`), because other
kernels read them; the packet 5 text never prints one of them, and a test changes each and asserts the text is the same.

## 3. What the loop keeps (new state)

One optional key on an animal's hidden state, `chimp.sim.own`, present only with the switch on, listed as optional for
the load-time shape check. Plain numbers and arrays.

| Part | Written when | Holds |
| --- | --- | --- |
| `ask` | a decision point opens | when, and what opened it: the scheduled end of a bout, an interrupt, or the act's own end |
| `was` | the act came to its own end, or a waiting animal's act is set aside | the act, its target, the seconds in it, how it ended |
| `at` | an act starts or is chosen again | the five drives and the light phase at that moment |
| `eat` | each tick of feeding | the amount eaten in the first, the latest complete and the current 5 minute step of the bout |
| `trip`, `trips` | a trip to a crown starts; food is eaten at its crown; the episode closes | the open trip, and the last closed trips as pairs (eaten, expected) |
| `fed`, `up` | it leaves a crown it fed in; it leaves a finished nest | the crowns fed in since it left the nest |
| `g`, `gb` | each tick of grooming | when it last groomed, and was last groomed by, each partner |

Greeting stamps (`greet`), the last incident with each partner (`incident`), and the last aggression given and received
already exist and are read as they are.

One new number, `ownKeep` (default 8): how many closed trips, crowns and grooming partners the record keeps. It is a
memory size, a design assumption, and changes nothing but the packet's words.

**The rules never read the record.** Nothing in the valuation, the gate or a mechanism reads `chimp.sim.own`. The test:
a world run with the switch on, with that key removed from every animal, hashes the same as the world run with the
switch off (field working base and compressed map, seeds 48 and 7).

## 4. Neutral option labels

A label is the act, its target, and the animal's belief words. The belief words are those the state-only packet keeps
(`scripts/lib/packet-state.ts`: crop, hours since seen, chance, spread, feeders, odds, distance), written by the same
function that writes them today.

| Act | Label |
| --- | --- |
| rest | Rest here |
| feed in a crown; on leaves | Feed in the *species*, *N* m; Feed on leaves and pith here |
| drink | Drink at the stream, *N* m *direction* |
| trip to a tree; joined; to a caller; home | Go to the *species*, *N* m *direction*; Go with *name* to the *species*, …; Go toward *name*'s calls, …; Go back toward the middle of my range, … |
| groom; play; follow | Groom *name*; Play with *name*; Follow *name* (Ride on *name* when carried) |
| nest | Stay in my nest; Build a nest in the *species*, *N* m; Sleep in my mother's nest |
| greet, contest, repair | Pant-grunt to *name*; Charging display (at *name*); Charge at *name*; Attack *name*; Crouch and submit to *name*; Flee from *name*; Keep away from *name*; Reconcile with *name*; Console *name* |
| mating | Mate with *name*; Mate-guard *name*; Go on a consortship with *name*; Stay on consortship with *name* |
| food sharing | Share meat (fruit) with *name*; Beg *name* for meat (fruit) |
| group acts | Pant-hoot; Give alarm calls; Hunt the red colobus; Join the hunt of the red colobus; Lead a border patrol; Join *name*'s border patrol; Carry on with the border patrol; Approach the stranger calls; Move away from the stranger calls |
| other | Climb into the *species*; Nurse from *name*; Sit hunched out of the rain; Leave for a neighbouring community; Back away from the snake; Groom the body of *name*; Go to the body of *name* |

Gone from every option: the rules' reason sentence ("Sit and digest after feeding", "Groom my ally Obi to keep his
support", "Rest through the midday heat"), the purpose phrase ("food, eases hunger", "appeases a dominant, eases
fear"), the mark on an urgent drive ("needed now"), the net rate and the company words. Gone from the state: the
`urgent` line. Gone from the instruction: everything but one sentence, "Choose what this wild chimpanzee does next,
from what it perceives, feels and remembers."

**The test that none of it can appear** takes its banned phrases from the code that writes them: every purpose phrase
of the builder's tables, the instruction sentences, the "needs X now" words, the situational rule sentences, and the
state-only packet's own list of removed wordings. For the reason sentences it does two things. It replaces every
option's reason with a marker and asserts the packet text does not change, so the text cannot depend on the reason. And
on built worlds it asserts that no label contains its option's reason phrase, except for a short named list of reasons
that are themselves the bare act and target (for example "Charge at Obi").

## 5. The packet text (`src/providers/packet.ts`, for a context with `packet: 5`)

Two registered variants. The integrator chooses.

| Line | Full | Short |
| --- | --- | --- |
| `me` | as today | without the community name; mood only when not calm |
| `feeling` | the drives at mild or above; absent when none | the same |
| `doing` | the act, its target, minutes, and how it ended | the same |
| `asked because` | §2 | the same |
| `body` | today's body line | only the parts that depart from normal (see below) |
| `now` | as today, without the "currently …" phrase | the light, the weather, the party, the edge, strangers |
| `nearby` | as today, plus each animal's act | the same |
| `lately` | §2 | the same |
| `last` | grooming and greeting times for every animal nearby that has one; the last aggression | only for animals an option names; the last aggression |
| `memories` | as today, without the lines `last` and `asked because` already say; at most 3 | at most 1 |
| `history` | at most 2 lines | none |
| `events`, `bodies` | as today | as today |
| instruction | the one sentence | the same |
| options | neutral labels with belief words | the same |

"Normal" for the short body line: reserves at the usual store, no energy shortfall, well watered, comfortable
temperature, wide awake, settled, and a body clock that agrees with the light (at its daytime high in bright light, at
its night low in the dark). The stomach and any shortfall are always shown.

Wording thresholds (design assumptions about wording, not about chimpanzees): eating now against the start, by the
ratio: 1.15 and over "faster than when I began", 0.85 "as fast as when I began", 0.6 "a little slower than when I
began", 0.35 "at about half the rate I began at", below "much slower than when I began". A trip, by eaten over
expected: 0 "gave nothing", below 0.5 "gave much less than I expected", below 0.85 "gave less than I expected",
otherwise "gave what I expected".

Example, composed by hand before any code (replaced by a real packet in §10):

```
me: Ebini, adult male, 18 y; rank 4 of 5 males; bold; sociable
feeling: mild loneliness
doing: feeding in the Uvariopsis congensis, 25 min
asked because: Chiriku is moving off
body: slight energy shortfall: about 950 kcal still to find, some hours of waking left; stomach mostly full
now: full daylight; clear, 22 °C; party of 2 with 2 adult males; at the territory edge
nearby: [Chiriku: my maternal sibling, adult male, outranks me, 2 m, close bond, leaving northwest]
lately: eating at about half the rate I began at; my last trip gave less than I expected; 1 of my last 4 trips ended in a feed; fed in 3 crowns since leaving my nest
last: [groomed Chiriku 2 h ago; groomed by Chiriku 2 h ago; threatened by Chiriku 16 h ago]
instructions: Choose what this wild chimpanzee does next, from what it perceives, feels and remembers.
c0: Rest here
c1: Feed in the Uvariopsis congensis, 2 m (1,700 kcal of fruit there)
c2: Go to the Ficus natalensis, 100 m northwest (2,200 kcal of fruit there when I saw it 3 h ago)
c3: Groom Chiriku
c4: Charging display
c5: Pant-grunt to Chiriku
c6: Pant-hoot
```

**Shortness.** Time per decision grows faster than tokens (about tokens to the power 1.5: 396 tokens 0.34 s, 541
tokens 0.54 s; `model-speed-probe.json` of the review). Target: a median at or under about 350 real tokens without
losing the new lines. Reported: the project's estimate (`estimateInputTokens`) by block, for today's state-only packet
and for both variants on the same contexts. The estimate ran about 70 tokens high on state-only packets (median 522
estimated against 452 real, stage R4); the real count is taken only if it can be had without loading the model, and
otherwise it is the integrator's first check. No packet may pass the hard limit of 1,280.

Which contexts: the saved R4 contexts were sampled before the new fields existed, so they can show only what the
neutral labels and the removed lines change. The new lines are measured on the smoke day of §7, whose contexts carry
them. Both tables are given and labelled.

## 6. The recorded failure: showing the current act locked the model onto continuing

`src/providers/packet.ts` records it at the "currently" phrase: with "currently mate-guarding" beside a "Mate-guard …"
option the untuned model put 90% or more on continuing in 7 of 36 real contexts, against 2 without the phrase. The
model scores an option largely by how its text relates to the state text, so an echo pulls. Today the phrase is
dropped whenever an option of the same act is on the menu, which is why the packet names the current act in 2.6% of
cases.

What this design does:

- The act is shown as state, on its own line, with its duration and whether it has ended. It is not written into the
  option. "Carry on" as an explicit option is a later stage.
- The line is in the participle and the option in the imperative ("feeding in the …" against "Feed in the …"). The
  target's name still repeats; that cannot be avoided without hiding the act.
- The builder can leave out any one new line (`without`), so the lock-in can be measured: the same packets with and
  without `doing`.
- The sampler of §7 saves whether each label is a fresh draw, a kept act or an arrival.

What a later training stage must watch:

- With `doing` shown, a kept act's label is readable from the state line. Training on kept and arrived records (35% of
  R4's labels) would teach "copy the doing line". Train on fresh draws, or make carrying on its own option.
- Report, on untuned and trained models, the share of packets where the option that repeats the current act gets 0.9
  or more, with and without the `doing` line. The 7 of 36 against 2 of 36 above is the yardstick.
- The same check for `asked because`: an interrupt that names a companion should not by itself pull every option that
  names that companion.

## 7. Scripts

- **`scripts/r8-rerender.ts` (the wording test, prepared for the integrator).** Reads the saved R4 held-out records
  that carry their context (read only) and writes into `artifacts/r8/rerender/`, for each record: (a) today's
  state-only packet, rebuilt and checked against the saved one; (b) the same state with neutral option labels, the
  `urgent` line removed and the one-sentence instruction. Every other state line is identical between the two. The
  output has the row shape the existing scorer reads, so the existing adapter can be re-scored on both. Run with the
  model by the integrator.
- **`scripts/r8-wording-probe.ts` (no model; run here).** On the saved records: the rules' pick rate by an option's
  wording. First the reviewer's figures: the rest option worded "Sit and rest nearby" against "Sit and digest after
  feeding" (0.015 against 0.362), and "Groom my ally … to keep his support" against a plain groom line (0.333 against
  0.085). Reproduced means within 0.01 on the same records; otherwise the difference and its cause are reported. Then
  one summary: how often the rules' pick is the option whose wording has the highest pick rate, fitted on the training
  records and read on the held-out ones, against the same predictor given only the neutral label, and against chance.
  The gap between the first two is the most the rules' wording can add beyond naming the act. Wording and state are
  confounded (the wording is written from the state), so it is an upper bound, not the answer; the model run is.
- **`scripts/r8-contexts.ts` (the sampler).** As `scripts/r4-contexts.ts`, with the switch on. Per decision point: the
  packet 5 context; whether the label is a fresh draw, a kept act or an arrival; each option's rules score and, where
  the code exposes it, the score with the hash jitter removed; the loop's reason for the decision and the animal's own
  `asked`. Smoke test: one simulated day of the working base, seed 48, and nothing more.
- **`scripts/r8-tokens.ts`.** The token tables of §5.

## 8. Tests (`tests/r8-packet.test.ts`)

Purity and determinism of `observe()` with the switch on. Locality: every name in the new lines belongs to an animal
the focal perceives or remembers, or to a tree it sees, remembers or knows from its community's list. Byte-identity
with the switch off (§1's hashes). The observation with the new fields removed equals the `observeV4` observation of
the same world. The record never changes the world (§3). The banned wording (§4). Each new line appears on a built
world and says what the state says. Token estimates under the budget, and no packet near 1,280. The save check accepts
a world with the record. `tests/r2-packet.test.ts`, `tests/kernel.test.ts`, the goldens and the field pin stay green.

## 9. Open questions for the user (listed, not ruled on here)

1. Mechanism outputs that stay in the state line and the belief words as they are today: "about N kcal still to find",
   the odds words ("I would likely win"), "probably in fruit". State or valuation?
2. "My last trip gave less than I expected" compares what was eaten with a meal size the trip mechanism computed from
   the animal's belief. Only the words are shown. Acceptable as own experience?
3. A feeling that eased is shown as a reason for asking, beside a feeling that grew. Keep both?
4. The last aggression names the other animal even when it is not in view (as memories do today). Keep?

## 10. Iteration log and results

Built on 10 October 2026, 19:45 to 20:43 EDT, on branch `r8-packet5`. No model was loaded. Every number below was
printed by a script; the tables are in `docs/staging/r8-wording-probe.md`, `r8-tokens-smoke.md`, `r8-tokens-day2.md` and
`r8-tokens-r4.md`.

### 10.1 What changed against the registration

1. **Packet 5 is tied to the animal's own fields.** The request check accepts `packet: 5` only on a context that carries
   `own`, and `own` only with `packet: 5`. Stage R2's test, which must stay unchanged, sets `packet: 5` on a v4 context
   and expects a refusal; it still gets one.
2. **`at` holds the step of each drive's word, not the drive's value.** A rounded value could land on the other side
   of a word's threshold and miss a change the gate saw. Found by the test (a need-bucket decision with no felt change).
3. **The act's end is said once.** With `doing` shown ("was feeding … ; I have eaten my fill"), `asked because` says
   "my act ended". Without the `doing` line it tells the end itself.
4. **Fear can move at a timer.** Fear is on the packet's `feeling` line but is not one of the gate's four need buckets.
   So at a decision the loop reopened on its 30 minute limit, the line can read "my fear has eased": a true change
   that happens to coincide. It never names the timer. Seen 2 times in 145 such decisions.
5. **"Leaving" at the moment of setting off.** An animal that has just started a trip to a tree has not turned yet, so
   its direction is the way to that tree until it has taken a step. The simulation's animals already see where a
   companion is going (they count who is heading to which crown).
6. **Eating now against the start** is kept for feeding in a crown only, not for leaves and pith.
7. **Real token counts were possible without the model** (§10.5), so they are reported beside the estimate.
8. **`ownKeep`** is one number for the three lists, as registered. No other parameter was added.
9. **Small departures from the tables of §3 to §5.** The record has no `up` part: the list of crowns is simply emptied
   when the animal leaves a finished nest. A companion's act is written last on its `nearby` line (today's packet puts
   a notable act before the distance). Three labels are not in the table of §4: "Go to the body of *name* and take it
   up" for the animal that cared for it, "Keep going to the neighbouring community" for an emigration under way, and
   "Feed here" when a saved context names no tree.
10. **Two scripts beyond the list of §7:** `scripts/r8-wording-report.ts` (the wording test's readout) and
    `training/decide_ft/r8_tokens.py` (real token counts by the tokenizer alone).

### 10.2 The switch, the record, the tests

- With `observeV5` 0 the requests and both text packets hash as at dea2643: all eight rows of §1. On saved data too:
  today's state-only packet rebuilt from each of stage R4's 1,500 saved held-out contexts equals the saved packet,
  1,500 of 1,500.
- The record never changes the world. With it removed, the world run with the switch on hashes as the world of
  dea2643 at 12:30 and at dusk of day 2 (seed 48, 11cc8f4360cf6cd6 and 8e5fa7068c1d4ba7), and as the world run without
  it on seed 7 (12 hours) and on the small map (seeds 48 and 7). The sampler's `--check` on the smoke day agrees.
- `tests/r8-packet.test.ts`: 18 tests, all pass. With `tests/r2-packet.test.ts`, `tests/kernel.test.ts`,
  `tests/r4-packet.test.ts`, `tests/r4b.test.ts`, `tests/r5-pilot.test.ts`, `tests/sim-track-e.test.ts` (the field pin),
  `tests/persist-envelope.test.ts` and `tests/em-observe.test.ts`: 96 tests, 96 pass. Type-check clean.
  `gen-params --check`: valid, 1,048 entries, lint clean.
- **One test fails on this branch by design:** `tests/sim-params.test.ts` asks that every registry id be named in
  `docs/simulation.md` §17, a shared file this stage may not edit. With the row proposed below inserted, it passes
  (11 of 11, goldens included); the file was restored afterwards.

### 10.3 Why it is being asked

Every rules decision of an animal aged 8 or over on the test's built world (seed 48, day 2 from 09:30 to dusk, 2,572
decision points):

| The animal's line | Decision points |
| --- | --- |
| a perceived event | 769 |
| its act ended | 652 |
| a feeling moved to another word | 192 |
| the light changed phase | 18 |
| none | 941 |

Against the loop's own reason: an interrupt gave the event 714 times of 714. The 30 minute limit gave no line 135
times, an ended act 8 times and the fear case 2 times. A clock period gave no line 39 times, a change of light 18
times, an ended act 14 times, fear once. A need bucket gave a felt change 164 times and an ended act 111 times. An act
the gate kept (never an ask) gave no line 715 times of 775.

### 10.4 The sampler's smoke day

`scripts/r8-contexts.ts --seed 48 --base W50 --burn-in 0 --days 1 --p 0.5 --check`: one simulated day, 6 seconds.
1,467 records of 38 animals. Labels: 882 fresh draws, 512 kept acts, 73 arrivals: 40% are not fresh draws (the review
found 35% in R4's files). The rules' decision is on the menu in 1,453. Every record carries each option's score with the
hash jitter removed. The animal's own reason: an event 238, its act ended 368, a felt change or the light 197, none
664. Nothing was skipped.

A real packet from it (record 48-W50-1670-12; the rules chose c0). Packet 5, full, 412 real tokens:

```
me: Nkeru, adult female, 33 y, West community; rank 3 of 7 females; mother of a dependent infant; mood calm; playful
doing: feeding in the Chrysophyllum albidum, 11 min
asked because: Ugazi gave a travel hoo
body: body reserves at my usual store; severe energy shortfall: about 390 kcal still to find, about to sleep; stomach full; well watered; warm; slightly sleepy; body clock at its daytime high; settled
now: daytime (full daylight); cloudy, 23 °C; party of 4 with 0 adult males
nearby: [Ugazi: my offspring, juvenile female, 3 m, close bond, travelling east; Dembiri: my offspring, adolescent male, 2 m, close bond, resting; Wakiro: my offspring, infant male, 1 m, close bond, following me]
lately: eating as fast as when I began; my last trip gave less than I expected; 4 of my last 8 trips ended in a feed; fed in 4 crowns since leaving my nest
last: [groomed Ugazi 12 min ago; groomed by Ugazi 12 min ago; groomed Dembiri 5 h ago; groomed by Dembiri 5 h ago]
history: [This month: groomed with Ugazi 51 min; groomed with Dembiri 41 min]
instructions: Choose what this wild chimpanzee does next, from what it perceives, feels and remembers.
c0: Rest here
c1: Feed in the Chrysophyllum albidum, 3 m (2,300 kcal of fruit there)
c2: Go with Ugazi to the Pterygota mildbraedii, 80 m southeast (250 kcal of fruit there when I saw it 6 h ago, may have changed; 1 other going there)
c3: Groom Dembiri
c4: Play with Ugazi
```

The short variant of the same moment (362 real tokens) differs in three lines and has no `history`:

```
me: Nkeru, adult female, 33 y; rank 3 of 7 females; mother of a dependent infant; playful
body: severe energy shortfall: about 390 kcal still to find, about to sleep; stomach full; warm; slightly sleepy
now: full daylight; cloudy, 23 °C; party of 4 with 0 adult males
```

Today's state-only packet of the same moment (453 real tokens) has no `doing`, `asked because`, `lately` or `last`
line, names no companion's act, and words the options so:

```
c0: Sit and digest after feeding (a pause: cools the body, digests, favours wounds)
c1: Feed on ripe star apples in the Chrysophyllum albidum 3 m away (crop 57%) (food, eases hunger; 2,300 kcal of fruit there)
c2: Travel 79 m southeast to a Pterygota mildbraedii I remember with ripe fruit (food, eases hunger; 250 kcal of fruit there when I saw it 6 h ago, may have changed; 1 other going there)
c3: Groom my son Dembiri (eases loneliness, strengthens the bond)
c4: Play with my daughter Ugazi (fun and practice for young chimpanzees)
```

### 10.5 Length

Real counts are the model's own, taken by its tokenizer alone (`training/decide_ft/r8_tokens.py`: the processor the
model builds, without the weights). The route was checked first on packets counted before: all 5,754 real counts
stage R4 saved came out the same.

Real tokens, median (95th percentile, largest):

| Contexts | Today's state-only | Neutral options | Packet 5, full | Packet 5, short |
| --- | --- | --- | --- | --- |
| Stage R4's saved held-out records (1,500; days 6 to 10, seed 21; no new lines possible) | 452 (583, 646) | 340 (448, 513) | | |
| The smoke day (1,467; day 1, seed 48) | 385 (493, 558) | 281 (367, 409) | 314 (415, 497) | 270 (352, 428) |
| The test's built world (2,572; day 2, 09:30 to dusk, seed 48) | 476 (591, 659) | 353 (453, 524) | 392 (520, 624) | 330 (442, 530) |

- **The target of about 350 is met by the short variant** on both worlds that carry the new lines (270 and 330), with
  every new line kept. The full variant meets it on the first day (314) and not on the busier second (392).
- Neutral options alone take 112 tokens off the saved R4 packets (452 to 340). Packets over 512 tokens, the browser's
  limit: 25% today on those records, 0.1% with neutral options; on day 2, 34% today, 6% for packet 5 full, 0.1% short.
- What the new lines cost on the smoke day, in real tokens per packet on average: `lately` 26, `doing` 11,
  companions' acts 4, `asked because` 2, `last` minus 3 (it replaces the grooming and greeting memories).
- By the project's estimate the medians are 430, 321, 382 and 322 on the smoke day and 532, 399, 470 and 387 on day 2.
  The estimate runs high: real over estimate is 0.90 for today's packet and 0.82 to 0.86 for packet 5.
- Seconds per decision, projected from the review's speed measurement (a power law of exponent 1.48 through 0.34 s at
  396 tokens and 0.54 s at 541; not measured on these packets): 0.45 for today's packet on day 2, 0.33 for packet 5
  full, 0.26 for short.
- No packet is near the hard limit of 1,280 (largest 624 real, 736 estimated).

### 10.6 The rules' pick by wording alone (no model)

On stage R4's saved records, fresh draws only (`docs/staging/r8-wording-probe.md`):

- **The reviewer's rest figures are reproduced exactly.** Training records: the rules took rest in 8 of 517 draws
  where they had worded it "Sit and rest nearby" (0.015) and in 280 of 773 where they had worded it "Sit and digest
  after feeding" (0.362). Held-out records: 2 of 212 (0.009) against 148 of 351 (0.422).
- **The groom figure is reproduced in part.** "Groom my ally … to keep his support": 10 of 30 (0.333), as claimed.
  The reviewer's 0.085 for "a plain groom line" has no single definition: the bare "Groom *name*" line is 30 of 657
  (0.046), and every other groom sentence together 134 of 1,436 (0.093). On the held-out records the ally sentence is
  2 of 15 (0.133) against 0.114 for the others, so that one does not hold up there.
- **A predictor that reads only the options' sentences** picks the rules' decision at 0.516 of the 954 held-out fresh
  draws. Given only the neutral label it gets 0.425. Chance is 0.186. For scale, the trained adapter reads the whole
  state and gets 0.61.
- So the rules' wording can add at most 0.09 beyond naming the act. It is an upper bound, because some of those
  sentences state a fact the state also holds ("who is inviting me with a play face", "displaying"): packet 5 moves
  such facts to the `nearby` line ("playing with me", "DISPLAYING"). The larger part, 0.43 against 0.19, is how often
  each kind of act is taken at all.
- The spread is widest for play (0.000 to 0.786 across its sentences), pant-grunt (0.152 to 0.833) and rest.

### 10.7 The wording test, ready for the integrator

`scripts/r8-rerender.ts` wrote `artifacts/r8/rerender/` (gitignored): `all.jsonl` and `test.jsonl`, 1,500 held-out
records (954 fresh draws), each as `state` (today's packet, rebuilt and equal to the saved one in 1,500 of 1,500) and
`neutral` (8,728 of 8,728 options reworded, the `urgent` line removed from 537, none of the rules' wording left).
`scripts/r8-wording-report.ts` reads the score file and prints agreement on the fresh draws for both, by kind, with
the paired difference over animals. Not run: it needs the model.

### 10.8 Not done

- No model run: the wording test, and any measure of the lock-in of §6, are the integrator's.
- No harness is switched to packet 5. `scripts/r5-pilot.ts` and `scripts/em-loop.ts` still send the state-only packet.
- The app serves packet 5 full for a world created with `observeV5` 1; nothing in the interface chooses the short one.
- Jev's packet 5 is the same lines under Jev's option keys; it was built and tested for wording, never sent.
- A context saved before this stage cannot name the leader of a joined trip ("a companion") or the distance of
  stranger calls heard; 210 of 7,256 option labels in the parser's test differ in that way and no other.
- When the gate reopens a choice because the light is rising in the nest, or because the act is simply no longer on
  the list at a scheduled end, the animal's line is absent (33 and 18 cases on the smoke day).

## For the integrator

**Merge notes.**

- Likely conflicts: the `OPTIONAL_X` list in `src/sim/state.ts`; the first lines of `decisionPoint` in
  `src/sim/decide.ts`; `src/types.ts` (additions beside `Candidate`, `SocialPercept`, `DecisionContext`);
  `data/params.json` and `src/sim/params.gen.ts` (after the merge: `pnpm exec tsx scripts/gen-params.ts`, then
  `--check`).
- `tests/sim-params.test.ts` fails until the §17 row below is in `docs/simulation.md`.
- `scripts/lib/packet-state.ts` gained two lines: a packet 5 context is first taken back to the v4 observation, so
  `buildStateOnlyQuestion` still returns stage R4's packet.

**Run next, with the model (one model process at a time).**

```sh
pnpm exec tsx scripts/r8-rerender.ts                      # writes artifacts/r8/rerender (seconds; no model)
MGOGO_FT_ROOT=<folder holding adapters/r4-rules-state> training/decide_ft/r4_py.sh em_score.py \
  --in "$PWD/artifacts/r8/rerender/all.jsonl" --packets state,neutral --provider r4-rules-state \
  --out "$PWD/artifacts/r8/rerender/all.r4-rules-state.jsonl"
pnpm exec tsx scripts/r8-wording-report.ts --dir artifacts/r8/rerender --provider r4-rules-state \
  --saved <stage R4's eval folder>/all.r4-rules-state.jsonl --md docs/staging/r8-wording-numbers.md
```

Read it this way: the `state` scores should equal the saved ones (the report prints the largest difference). If
agreement on the neutral rendering falls well below 0.61, earlier "state-only" results leaned on the rules'
sentences; the no-model bound says the fall cannot be explained by wording beyond about 0.09 unless the adapter also
lost the act's motive facts.

**Lines proposed for the shared files.**

`IMPLEMENTATION_PLAN.md`, Stage R8, in place of its Status line:

> **Status**: Built on branch `r8-packet5` (10 October 2026; agent-reported, awaiting the integrator's review and merge; no model run; `docs/staging/r8-prereg.md` §10, tables in `docs/staging/r8-wording-probe.md`, `r8-tokens-smoke.md`, `r8-tokens-day2.md`, `r8-tokens-r4.md`). One switch, `observeV5`, 0 by default (0 = today: requests and both text packets hash as at dea2643, and today's state-only packet is rebuilt exactly from all 1,500 saved R4 contexts). At 1 the observation and the packet carry what the animal is doing and for how long, why it is asked when that is a perception or a felt change (never a timer), companions' routine acts, its own foraging returns and its social timing; options are the act, its target and the animal's belief words, with none of the rules' wording (a test derives the banned phrases from the builder's own tables). The loop keeps one optional record per animal that nothing in the valuation reads: with it removed the world hashes as before. Real tokens, counted by the tokenizer alone (the route reproduces all 5,754 saved R4 counts): on a second simulated day, median 476 for today's packet, 392 for packet 5 in full and 330 for the registered short variant; neutral options alone take the saved R4 packets from 452 to 340. Without a model, the reviewer's figures are reproduced (the rest option is taken at 0.015 under one sentence and 0.362 under another), and a predictor reading only the options' sentences picks the rules' decision at 0.52 of held-out fresh draws against 0.43 for the neutral label and 0.19 by chance, so the wording can add at most 0.09. The wording test's files are written; the adapter's re-scoring is the integrator's. `tests/r8-packet.test.ts` 18 tests; goldens and the field pin unchanged. Open for the user: whether the mechanism outputs left in the state line are state or valuation; the comparison of a trip with the meal expected; a feeling that eased as a reason; naming an absent animal in the last aggression.

`AGENTS.md`, Commands, after the `r4-contexts.ts` line:

```sh
pnpm exec tsx scripts/r8-contexts.ts --seed 48 --base W50 [--burn-in 0] [--days 1] [--p 0.1] [--check]   # stage R8 (docs/staging/r8-prereg.md): decision points of a rules-driven world with the animal's own experience on (observeV5 1, menuParity 1): the packet 5 context, whether the label is a fresh draw, a kept act or an arrival, the rules' scores with and without the hash jitter, the loop's reason and the animal's own reason for being asked, and four text packets (today's state-only, the same with neutral options, packet 5 full and short); then scripts/r8-tokens.ts --source r8|r4|rows (length by block; real counts by training/decide_ft/r4_py.sh r8_tokens.py, the tokenizer alone, no model load), scripts/r8-wording-probe.ts (the rules' pick by wording alone, no model), scripts/r8-rerender.ts and scripts/r8-wording-report.ts (the wording test: R4's held-out records as today's packet and with neutral options, for the existing adapter)
```

`AGENTS.md`, Architecture, at the end of the "Kernel contract (stage R1)" row:

> Stage R8 (`docs/staging/r8-prereg.md`; `src/sim/own.ts`, `src/kernel/packet-own.ts`; 0 by default): `observeV5` (the animal's own experience in the observation and the packet: what it is doing, why it is asked when it perceived or felt the reason, companions' acts, its foraging returns and social timing; neutral option labels and none of the rules' wording; packet marker 5; the loop keeps `chimp.sim.own`, which nothing but `observe()` reads).

`AGENTS.md`, Gotchas, one line:

> - Packet 5 (`observeV5` 1): the packet builder never reads an option's `reason` or `score`; do not add words to an option from either. `buildLocalQuestion(ctx, { own: { variant: 'short' } })` gives the registered short variant, `{ without: [...] }` leaves a new line out. Real token counts need no model: `training/decide_ft/r4_py.sh r8_tokens.py`.

`docs/simulation.md` §17, one row after "What a kernel sees and the menu it faces (R2; off by default)" (checked: with it `tests/sim-params.test.ts` passes):

```
| The animal's own experience in the packet (R8; off by default) | `observeV5` 1: `observe()` returns the `observeV4` observation plus what the animal is doing, for how long and how the act ended (`own.doing`); why it is being asked when that is a perception or a felt change, never a loop timer (`own.asked`); its own foraging returns (`own.lately`: eating now against the start of the bout, what its last trips gave against the meal it set out for, crowns fed in since it left its nest); its last aggression given or received; on each perceived animal the direction it moves in, whether it is leaving or acting on the focal animal, and the hours since the focal groomed it, was groomed by it and greeted it; on each option what it is in the animal's own terms (`about`: the form of the act, the tree's species, a companion's name, distance and direction; never the motive); and the marker `packet: 5`, for which the packet builder writes neutral option labels and none of the rules' wording. The loop then keeps `chimp.sim.own` (written at decision points, at the start of an act, while feeding and grooming); `ownKeep` is how many closed trips, crowns and grooming partners it keeps. Nothing in the valuation, the gate or a mechanism reads the record: a world with the switch on is the world with it off plus that key. 0 = today, bit for bit | switch (0–1); records | `observeV5`, `ownKeep` | design (switch; a memory size) | [staging/r8-prereg.md](staging/r8-prereg.md); [own.ts](../src/sim/own.ts), [observe.ts](../src/sim/observe.ts), [src/kernel/packet-own.ts](../src/kernel/packet-own.ts), [src/providers/packet.ts](../src/providers/packet.ts); §8 |
```

`docs/simulation.md` §8, one paragraph after the R2 paragraph "Packet v4, one menu, activity first":

> **Packet 5: the animal's own experience (stage R8, Track R; [staging/r8-prereg.md](staging/r8-prereg.md); switch `observeV5`, off by default).** With 1, `observe()` adds `own` (what the animal is doing and how its act ended; why it is asked, only when it perceived or felt the reason; its foraging returns; its last aggression), the percepts' own fields (the direction a companion moves in, whether it is leaving or acting on the focal animal, hours since grooming and greeting) and each option's `about`, with `packet: 5`. The packet builder then writes neutral option labels (the act, its target, the animal's belief words) and none of the rules' wording. The loop keeps `chimp.sim.own` ([own.ts](../src/sim/own.ts)); nothing but `observe()` reads it.

`HANDOFF.md`, one line under the current state of Track R:

> - R8 (branch `r8-packet5`): packet 5 is built behind `observeV5`; the wording test's files are in `artifacts/r8/rerender` after `scripts/r8-rerender.ts`, and the adapter's re-scoring on them has not been run.

**Decisions that are the user's** (§9): the four questions there. A fifth for the integrator: which length to serve.
The short variant is the one that meets the 350 token target on a second day.
