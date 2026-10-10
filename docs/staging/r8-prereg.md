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

(Filled in after the build.)

## For the integrator

(Filled in after the build.)
