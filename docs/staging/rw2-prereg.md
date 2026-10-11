# RW2: wild choice records from the three Dryad deposits (registration)

Stage RW2 of Track R. Branch `rw2-wild-records`, from track-e 7f9ec5b. Registered Sunday 11 October 2026, 15:11 EDT (by `date`), **before any score was computed through this stage's code**. It extends stage RW (`docs/staging/rw-prereg.md`, `docs/staging/rw-bench-prereg.md`): the same kernel interface, the same scorer, the same seal.

## The plain page

The three files you downloaded on 11 October, each checked by one audit and one sceptic. (Updated with the results of section 8.)

**Taï grooming (Mielke et al. 2018): a true wild choice record, and a narrow one.**
- What it is: the first adult a chimpanzee groomed, among the adults in sight, when it started a grooming session.
- Wild decisions: 1,372 from 20 animals (599 to learn from, 353 to tune on, 420 sealed and unread).
- What only it can teach: partner choice with both sexes, rank, a bond measure, a female's state and a recent quarrel. The Ngogo record has none of these.
- What it cannot: whether or when to groom, or any other act. Western subspecies. The signal is weak: chance 0.24, the best simple rule 0.35.

**Kanyawara coalitions (Fox et al. 2022): a record of who attacked together, not of who chose.**
- Wild decisions: 122 joint attacks by adult females, about 100 independent days (73, 13, and 36 sealed).
- Use: a small test only, never a teacher. Past allies and grooming partners are the co-attackers more often than chance. It also shows that the simulation never offers a side to an unrelated adult female.
- What it cannot: whether to join, who started, who the victim was.

**Budongo scans (Ramos-Fernández et al. 2018): not a choice record.**
- Wild decisions: none. The rows are lists of who was near an unnamed animal, with no date or clock, and at least two observers' lists interleaved.
- Use: a yardstick for party size only (about 5 resident adults; one alone on a fifth of scans).
- What it cannot: staying, leaving or joining, or any rate of change. Wild "join or leave" labels would need the field station's own sheets.

No model was run. Scoring the untuned model and the existing adapters on these records takes about 2 minutes each (section 7).

## 0. Status, order of work and what was known at registration

Timestamps from `date`, 11 October 2026, EDT.

| step | when | what was read |
| --- | --- | --- |
| The integrator unpacked the deposits | before 14:25 | column names and row counts only |
| Three audits, each fixing its split rule before any outcome | 14:25 to 14:39 | structure of the whole files; outcomes of the train parts only |
| Three sceptics | 14:39 to 14:55 | the same; each re-implemented the split and reproduced the sizes |
| This stage: the reader in structure mode (`scripts/rw2/rw2_ingest.py --structure`) | 15:07 | no outcome value of any part; it reproduced every size below |
| **This registration** | 15:11 | nothing further |

Known at registration, and used to choose the rules of sections 2.5 and 3.5: the audits' and sceptics' **train-part** numbers (quoted where used). Not known to anyone: any outcome of the Taï development or sealed parts; who partnered whom in the Kanyawara development and sealed parts. The registered rules and packets below were therefore chosen with train numbers in hand and no development number.

Every number added after this commit comes from `docs/staging/rw2-numbers.md`, which `scripts/rw2-score.ts --md` writes (aggregates only). If the two disagree, the generated file is right.

This stage loads no model, trains nothing, runs no simulation and sends nothing off this computer.

## 1. Verdicts

| deposit | sceptic's verdict | registered as | parts (train, development, sealed) |
| --- | --- | --- | --- |
| Taï grooming partner choice, Dryad t8c88vh | usable with corrections | **a choice record** (label source for a separate named adapter, and a test) | 599, 353, 420 events; 557, 329, 420 after the same-day rule |
| Kanyawara female coalitions, Dryad 44j0zpchh | usable with corrections | **a symmetric record of co-participation**: a small test, never a teacher, no adapter | 73, 13, 36 events |
| Budongo party scans, Dryad 51b68 | not a choice record | **a yardstick only** | none |

## 2. Taï grooming: the choice record

Source: `data/raw/dryad-t8c88vh/Data+Model2.csv` only (7,781 rows, chimpanzees only; byte-identical to the Dryad zip member, sceptic's check). `Data+Model1.csv` (which adds sooty mangabeys) is never read. The authors' R script is never run.

### 2.1 What one record is

**The first adult the animal groomed, among the analysed adults in sight (usually 30 to 50 m), in a grooming session it started, with at least two such adults present.**

One event is one `(group, gr.bout.index)`. One row is one analysed adult of the focal animal's party at that moment; `gr.initiated` flags the one it groomed first. On the train part every event has exactly one flagged row (audit). 1,372 events, 20 choosers (10 males with 1,193 events, 10 females with 179), 28 partners, two communities, October 2013 to May 2015; 2 to 13 options, median 5.

It is never called "whom it chose to groom", and never a record of whether or when to groom. Stated limits, from the paper's Methods (Data collection) and the file:
- Only sessions the focal started, and only its first partner. Sessions another animal started are absent (640 of 1,032 numbered East sessions and 732 of 1,269 South sessions are in the file).
- No event has a single option; the paper does not mention dropping them.
- Immatures are outside the record by the session's definition. Seven adult females are left out as options.
- Invitation gestures and approaches were not recorded, and there is no distance or activity per candidate. **A zero means "in the party and not groomed first", not "declined".**
- How a first partner among the seven left-out females was handled is not stated. In 21 events a listed adult has no option row (cause unknown).
- Western subspecies; a different forest from the simulation's.

### 2.2 The split, exactly as the audit fixed it

Fixed Sun Oct 11 14:30:18 EDT 2026, before any value of `gr.initiated` was read. It uses only `group`, the focal's code, `sex.focal` and `r.date` (dd/mm/yyyy).

1. **Animals.** `key(group, code) = sha256("tai-groom-split-v1:" + lower(group) + ":" + lower(code))` as hex. Within each of the four strata (East or South) x (male or female focal), sort the focal codes by key, ascending: the first is a held-out animal, the second a development animal, the rest train animals (4, 4 and 12 animals).
2. **Dates.** Two fixed cut-offs, the same for both communities: 1 January 2015 and 1 March 2015.
3. **Parts.** Sealed: a held-out animal on any date, or any animal from 1 March 2015. Development: not sealed, and a development animal or a date from 1 January 2015. Train: the rest.
4. Mangabey rows are outside the record.

**The same-day rule (added here, before any score; it uses codes, dates and parts only).** The sceptic found that 28 of 440 community-days hold events of two parts. As for Ngogo, parts are made disjoint by community-day, the less protected part giving way: a train event on a community-day that also holds a development or sealed event, and a development event on a community-day that also holds a sealed event, is counted and left out of training and of every score. The sealed part is untouched.

| part | events | option rows | choosers | left out by the same-day rule | **eligible** | choosers | by male, by female choosers | more than 8 options |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| train | 599 | 3,485 | 11 | 42 | **557** | 11 | 499, 58 | 115 |
| development | 353 | 1,935 | 14 | 24 | **329** | 13 | 292, 37 | 59 |
| sealed | 420 | 2,361 | 20 | 0 | **420** (if each event has a flagged row; not read) | 20 | 343, 77 | 77 |

Strata, reported apart and never pooled silently:
- Development (eligible): unseen animals before 2015, 160; seen animals in January and February 2015, 131; unseen animals in January and February 2015, 38.
- Sealed: unseen animals before March 2015, 199; seen animals from March 2015, 181; unseen animals from March 2015, 40. The four never-seen choosers are two males (197 events) and two females (42 events, 38 of them from one animal).

Declared, not prevented:
- Held-out and development animals are options in train events, and dyads are shared across all parts.
- The bond column is a running index built from the same follows, so a train row's bond can echo grooming whose record sits in another part.
- The authors standardised their covariates over all rows, sealed ones included (a scale constant only; packets use order, never values).
- Up to 16 events per animal-day; 242 of 845 successive same-day events have an identical party.

### 2.3 The seal

- The reader deletes `gr.initiated` from every sealed row at load, before anything else is done with the row. No sealed record is built: a record needs its outcome for its own label and for the history of the chooser's later events.
- Opening takes `scripts/rw2/rw2_ingest.py --open-sealed "<reason>"`, which appends a line to `docs/staging/rw2-sealed-log.md` **before** any file is read, and then `scripts/rw2-score.ts --part sealed --open-sealed "<reason>"`, which appends its own line (kernels, commit) before it reads the opened records. Each opening needs the user's go. A line in the log that no registered evaluation explains is a breach.
- The sealed score is one final score per kernel, reported per stratum.
- History of an opened sealed record: from all the chooser's earlier events, and a second score with history from train and development events only, side by side (`--history open`).

### 2.4 The packet

One record in, one kernel request out (`KernelRequest`, `src/kernel/types.ts`), built by `src/rw2/packet.ts`. In the style of packet 5 (`docs/staging/r8-prereg.md`): the animal's own knowledge in plain words, a neutral label per option, one neutral instruction sentence, no rule sentence, no score, no reason text.

**Never in a packet:** an animal's code, a date, the community's name, the order of rows or lists in the file, the dyad label, bout or session numbers (they run in time order), any raw rank or bond number (a bond value identifies a dyad-day exactly; a rank value names one partner on 40% of rows), `party.size` (it counts something undocumented).

**Identities.** Each record deals fresh invented four-letter names (the pool of stage RW) to the animal and its options, so no animal or dyad can be memorised across records. Derived records carry no code at all: options have no identity, and the chooser has one hashed label used only to take intervals over individuals.

**Order.** The reader writes the options of a record in an order fixed by a hash of the record's key and the partner's code, so the file's order (one fixed roster order per community, where the first row is chosen 0.29 against 0.23 chance) cannot enter. The builder then shuffles them with a generator seeded per record (base seed 20261011, shuffle number 0 for the primary score), exactly as stage RW does. "The first option" must score chance (acceptance test).

**What the packet says (the "own" view, the default).**

| line | content | from |
| --- | --- | --- |
| `me` | invented name, adult, male or female | `sex.focal` |
| `now` | the clock hour; how many other adults are in sight (the number of options) | `start` (hour only), the option rows |
| `nearby`, one line per option | invented name, adult, male or female; for a female "maximally swollen" or "with an infant under 3 months"; "ranks above me" or "ranks below me"; "aggression between us in the last half hour" | `sex.partner`, `repr.state.partner`, the two rank columns, `prev.aggression` |
| `last` | "groomed X first earlier today" when the partner of its previous session today is present | earlier events of the same animal |
| `history` | "Rank here, highest first: …" with "me" in its place; "My bond with each, strongest first: …"; "I groomed first before, most often first: …" | order of `z.rank.partner` among those present; order of `z.ddsi.dyad`; earlier events of the same animal |
| options | "Groom X", one per adult in sight, nothing else | |

- Rank and bond enter as order among those present, with "=" between ties, never as numbers. The focal's own rank is put on the partners' scale by the exact linear link between the two rank columns (116 animal-days seen in both roles, largest residual 0; outcome-free). A higher value is a higher rank: male partners average 0.97 and female partners −0.73 on that column (outcome-free check; confidence high).
- History comes from the same animal's earlier events (earlier days, and earlier the same day by clock time) of the open parts. It enters as order, never as counts.
- The bond is the authors' modelled index (the paper: taken "for the day before"). The sceptic's train test does not rule out a small same-day effect, and the bond with the chooser predicts nothing on train (0.234 against chance 0.233), so it cannot give the answer away in practice.

**The "third" view (built, off by default; the user's call).** Two more history lines from the authors' bystander columns: "Bond with someone else here, strongest first: …" (`z.max.ddsi.partner`: each candidate's strongest bond with another adult present) and "Bonds with the others here on average, strongest first: …" (`z.average.ddsi.partner`, which the sceptic identified as the candidate's mean bond with the other adults present, the chooser left out). They are third-party knowledge and the authors' construct, and they carry most of the file's signal on train (0.32 and 0.29 against chance 0.23). **Whether a chimpanzee's packet may show them is for the user to rule.** Until then model runs use the own view; the simple rules that read these lines are scored on the third view and marked.

**One invented example (no real row; every name and fact is made up).**

```
me: Kugu, adult male, wild chimpanzee
now: 9:00; 5 other adults in sight
nearby:
  Nasi: adult female, maximally swollen; ranks below me
  Tuza: adult male; ranks above me
  Daga: adult female, with an infant under 3 months; ranks below me
  Gefo: adult male; ranks below me; aggression between us in the last half hour
  Basa: adult female; ranks below me
last:
  groomed Gefo first earlier today
history:
  Rank here, highest first: Tuza, me, Gefo, Nasi, Basa, Daga
  My bond with each, strongest first: Gefo, Nasi, Tuza=Basa, Daga
  I groomed first before, most often first: Gefo, Tuza
question: Choose what this wild chimpanzee does next, from what it perceives, feels and remembers.
options: c0 Groom Nasi | c1 Groom Tuza | c2 Groom Daga | c3 Groom Gefo | c4 Groom Basa
```

**The request.** The context passes the request validation every kernel shares (`decisionContextError`, with the wide limits stage RW introduced). It is a carrier: every field the record cannot fill holds the registered neutral value of stage RW and is named in the mask; the record's facts travel in a small typed block beside it (`wild2`: coarse words, small whole numbers and yes/no only), which the text builder and the rule kernels read. `rw2RequestError` refuses a request whose block holds anything else, or whose free-text lines are not empty.

**Menus wider than 8.** 115 of 557 train records, 59 of 329 development records and 77 of 420 sealed events have 9 to 13 options. They go through the existing fan-out wrapper unchanged (`src/kernel/fanout.ts`, `<kernel>+fan2`): sub-menus of at most 8, the best 2 of each forward, then a final choice. `narrowRw2Request` builds a sub-menu's request: only its options, with each order line cut to them (and "me"). A menu of 9 to 13 takes 3 kernel calls.

### 2.5 Baselines (registered before they are scored through this code)

Each is a kernel that reads the request and nothing else. Expected top-1 with ties split evenly; "none" means the fact is absent and the option ranks below every option that has it.

| id | rule | view | the audit's train figure (599 events, before the same-day rule) |
| --- | --- | --- | --- |
| `null` | chance, uniform over the options | own | 0.233 |
| `past-partner` | the adult it most often groomed first before | own | 0.345 |
| `last-today` | the partner of its previous session today | own | chosen 84 of 329 times against 65 expected |
| `rank-high` | the highest-ranking adult in sight | own | 0.297 |
| `rank-near` | the adult nearest to it in rank among those in sight | own | 0.205 (by rank value, not by place) |
| `bond-high` | the adult with the strongest bond with it | own | 0.234 |
| `same-sex` | an adult of its own sex | own | 0.225 |
| `aggression` | the adult it had aggression with in the last half hour | own | chosen 32 times against 21 expected |
| `young-infant` | the female with an infant under 3 months | own | chosen 35 times against 22 expected |
| `stack-own` | **the bar on the own view:** past partner, then the partner of earlier today, then highest rank | own | not scored |
| `third-max-low` | the adult whose strongest bond with a bystander is weakest | third | 0.294 |
| `third-mean-low` | the adult with the weakest mean bond with the others present | third | 0.323 |
| `stack-third` | **the bar on the third view:** past partner, then weakest mean bond with the others, then highest rank | third | not scored |
| `first-option` | check, not a rule: the first option (must score chance) | own | |

Not a kernel, because a packet carries no identity: "how often the other train choosers pick that individual" scored 0.321 on train (audit). It is the reason attributes cannot be told from identity here: 28 partners in all.

### 2.6 Scores, intervals and what can be claimed

- Primary score: top-1 of the answered option under shuffle 0 (for a rule, the expected top-1 with ties split), with chance (the mean of 1 over the number of options) beside it.
- **Intervals are over animals:** a bootstrap over choosers (2,000 draws, seed 20261011), for the pooled score and for the score with each chooser weighted equally. One animal holds 35% of the train events.
- **Comparisons are paired** on the same records (`pairedDifference`, stage RW), with the interval over animals. A difference is called one only if its interval excludes 0.
- **Power, stated before any score.** With animals as the unit, the train interval of the "highest rank" rule is 0.23 to 0.33 (sceptic), and two held-out males supply 197 of the 420 sealed events. No unpaired difference under about 0.08 to 0.10 is claimed. The file's covariates carry about 7 points over chance on train; a model that does not beat `stack-own` has learned nothing a three-line rule does not know.
- Cuts: menus of 8 or fewer against wider; stratum; male against female choosers (female choice rests on 58 train and 37 development records).
- Option order: every rule under 5 option orders; a model under the orders its run asks for.

### 2.7 What a model trained on it may be called, and which targets it compromises

- A model trained on the train part is **a separate named adapter** with its label source in its manifest (`src/rw/manifest.ts`): `field choices, Tai first grooming partner`. It is never mixed with the rules' labels or the Ngogo labels without saying so. Nothing is trained in this stage.
- **By citation or shared records: none.** No target in `data/targets.json` cites this paper and its key is not in the sources registry (audit and sceptic, confidence high).
- **Same animals, other records** (the class stage RW flagged and did not mark). Proposed, for the user's ruling:
  - marked compromised: **T-HUN-9** (its Taï row is meat sharing by bond partner, 2013 to 2015, with the same kind of bond index on the same animals; the packet shows the order of that index);
  - marked compromised, with moderate confidence in the overlap: **T-END-12** (same team, same communities, probably the same follows);
  - flagged only: T-BRD-1 (Taï East and South 2013 to 2016, a different behaviour), T-END-1 and T-END-2 (Taï males; their periods were not checked), T-SOC-9 (reconciliation, by topic: the "aggression" line teaches it in part).
- The list is proposed for `data/rw-compromised.json` in section 10.5; `data/targets.json` is frozen and is not edited.

### 2.8 Threats (kept from the audit and the sceptic)

1. A conditional record: no "do not groom", no other act.
2. The option set is by sight, not by reach; a zero mixes "passed over" with "was 40 m away".
3. Very few animals: 20 choosers, 28 partners, 158 dyads; males make 87% of events.
4. Attributes cannot be separated from identity (identity alone 0.32, all rank and bond columns together about 0.30 on train).
5. Covariates are the authors' modelled quantities; the bond index already contains past grooming.
6. Weak signal: a small adapter has little to learn, and the sealed part cannot show small gains.
7. Non-independence within animal-days.
8. Transfer from the western subspecies to a Kibale-like simulation is an assumption.

## 3. Kanyawara coalitions: a small test, never a teacher

Source: `data/raw/dryad-44j0zpchh/analysis2_datashare.csv` (1,815 rows) with the pair table `analysis1_datashare.csv` (811 rows) for the pairs' earlier values. Eastern subspecies, the simulation's own forest.

### 3.1 What one record is

**Given that a joint attack by adult females happened, which of the adult females present attacked alongside a participant.**

One event is one `coal_id`: 122 joint attacks on 100 dates, March 2010 to November 2019. One row is a pair (a participant, one other adult female in the party), flagged 1 if the two attacked together. A record is built per participant per event: her options are all the other adult females listed for the event (2 to 16, median 7), her labels are the other participants (one for most records, two to four in coalitions of three to five).

It is symmetric and has no chooser. Stated limits (paper Methods 2b and 2d; the file; both checked by the sceptic):
- Nothing says who started or who joined. Each pair is filed once, in an order that follows the pseudonym's number.
- Only fights that someone joined are in the file. There is no "stay out".
- The victim is not recorded and was an adult female for 74 of 129 targets, so she probably sits among the "not chosen" in about half the events (chance is then about 0.25, not 0.21).
- Options are adult females only. Attacks that included an adult male were dropped by the authors.
- The party is a 50 m chain read every 15 minutes; "present" does not mean within reach of the fight. The party list is identical across same-day events up to 160 minutes apart where that could be seen.
- **The simulation has no such menu today:** `src/sim/conflict.ts` lines 59 to 60 alert only males of 12 or more and kin of either side, so an unrelated adult female is never offered a side; about 96% of the wild partnerships here are between unrelated females.

So: no adapter, no label source, no training file. A kernel may be scored on it, and the scores say how well "pick the ally among those present" is done; they do not say the kernel decides to join as a wild female does.

### 3.2 The split, exactly as the audit fixed it

Fixed Sun Oct 11 14:31:07 EDT 2026, before any value of `event_factor` was read. It uses only `coal_id`; the calendar month of an event is never divided.

`m` = the first 7 characters of `coal_id`; `h = int(sha256("fox2022-coal-v1:" + m).hexdigest()[:8], 16) % 5`.
- Sealed: year 2018 or later (the whole of period E), or `h == 0`.
- Development: not sealed and `h == 1`.
- Train: not sealed and `h` in 2, 3, 4.

| part | events | rows | dates | months |
| --- | --- | --- | --- | --- |
| train | 73 | 1,117 | 62 | 33 |
| development | 13 | 173 | 11 | 5 |
| sealed | 36 (15 from 2018 and 2019, 21 from hashed months) | 525 | 27 | 18 |

Load rules that go with it:
1. A sealed event's rows are dropped at load by `coal_id`; only a row count is kept. Blanking the flag would not be enough: the participant column is itself the outcome.
2. The participant column of a development event is outcome too.
3. `coal_count_bi` of the pair table is the same outcome summed over all three parts. It is deleted at load, never joined and never an input.

Declared: the coalition-size mix of the unopened parts is already known by subtraction from published counts (39 pairs, 7 trios, 1 of four, 2 of five across development and sealed), so their chance level is known; who partnered whom there is unread. The published model was fitted on the whole file. The development part is too small to select anything on.

### 3.3 Units

- **Same-day repeats are collapsed:** of several events on one date with the same set of participants, the first by clock time is kept; the others are counted and left out (66 date-and-set units among the 73 train events, sceptic).
- **The unit of inference is the female.** One female takes part in 29 of the 73 train events. The primary score weights each female equally; intervals resample females. The pooled score is reported beside it and is not the headline.
- The two records of a pair coalition state the same fact. Roughly 62 independent days in train and 100 in the whole file.

### 3.4 The packet

Same builder, same rules of identity and order as section 2.4. No date and no clock time enters.

| line | content | from |
| --- | --- | --- |
| `me` | invented name, adult female, "newcomer to the community" when she is one | a female is a newcomer in a period when none of her pairs is resident with resident (`immdyad`) |
| `now` | how many other adult females are in the party; "I am attacking another chimpanzee" | the event's rows |
| `nearby`, one line per option | invented name, adult female; "newcomer to the community"; "my close kin (mother, daughter or sister)" | `immdyad`, `kinship` |
| `history` | "Rank here, highest first: …"; "In my party in the previous two years, most often first: …"; "Within 5 m of me in the previous two years, most often first: …"; "Groomed with me in the previous two years, most first: …" (amendment 1); "No history with me yet: …"; "Attacked alongside me before, most often first: …"; "In joint attacks before, most often first: …" | order of `ranksumbi_z`; the pair table's values **for the previous two-year period**; earlier events of the open parts, earlier days only |
| options | "Attack alongside X", one per other adult female present | |

- **Bonds are taken from the previous two-year period**, because the file's own columns average the period that contains the event and so look ahead. They enter as order within the menu only (the z-scores are pooled over all ten years). An option with no row in the previous period is named in "No history with me yet". Events of 2010 and 2011 have no previous period in the data: their packets carry no bond line at all, and scores are also reported for the records that do (periods B to E).
- Rank is a pair sum; within one female's menu it orders the options by their own rank. That a low number is a high rank is inferred, not stated by the authors: pairs with a newcomer have a higher sum (0.44 and 1.05 against −0.13; outcome-free check; confidence moderate). The focal's own place is not recoverable, so "me" is not in the line.
- Coalition history comes from train and development events of earlier days only.
- The context's act is a carrier (`follow`): the simulation has no "attack alongside". The label is written from the block.

**One invented example (no real row).**

```
me: Kugu, adult female, wild chimpanzee
now: in a party with 4 other adult females; I am attacking another chimpanzee
nearby:
  Nasi: adult female; my close kin (mother, daughter or sister)
  Tuza: adult female, newcomer to the community
  Daga: adult female
  Gefo: adult female
history:
  Rank here, highest first: Gefo, Nasi, Daga, Tuza
  In my party in the previous two years, most often first: Nasi, Daga, Gefo
  Within 5 m of me in the previous two years, most often first: Nasi, Gefo, Daga
  Groomed with me in the previous two years, most first: Nasi
  No history with me yet: Tuza
  Attacked alongside me before, most often first: Daga
  In joint attacks before, most often first: Gefo, Daga
question: Choose what this wild chimpanzee does next, from what it perceives, feels and remembers.
options: c0 Attack alongside Nasi | c1 Attack alongside Tuza | c2 Attack alongside Daga | c3 Attack alongside Gefo
```

Menus wider than 8 (44 of the 122 events) go through the same fan-out.

### 3.5 Baselines (registered before they are scored through this code)

| id | rule | the train figure known at registration |
| --- | --- | --- |
| `null` | chance | 0.21 (0.17 on pair coalitions) |
| `assoc-prev` | most often in her party in the previous two years | 0.40 against chance 0.17 on periods B to D (audit) |
| `near-prev` | most often within 5 m in the previous two years | 0.40 (audit) |
| `groomed-prev` | groomed with her in the previous two years | 0.32 (audit) |
| `groomdur-prev` | most grooming with her in the previous two years | not scored |
| `kin` | her close kin | chosen 8 of 19 times against 0.17 for non-kin (sceptic) |
| `rank-high` | the highest-ranking female present | 0.31 (audit; rank says who tends to attack, not whom she picks: sceptic) |
| `resident` | not a newcomer | not scored (newcomer pairs are 2.9% of partnerships against 20%) |
| `allied-before` | attacked alongside her most often before | 0.42 (sceptic, on a slightly different history) |
| `frequent-aggressor` | most often in joint attacks before | 0.36 to 0.44 (sceptic, with later events included; here earlier days only) |
| `stack` | **the bar:** attacked alongside her before, then most often in her party, then most often in joint attacks | not scored |
| `assoc-now` | comparison only, never in a packet: most often in her party in the period that contains the event (looks ahead) | 0.42, or 0.31 with each female weighted equally (sceptic) |
| `first-option` | check, not a rule | |

Corrected statements that this registration adopts from the sceptic:
- Association beats chance on average across females (0.31 against 0.17, gap 0.05 to 0.33 on train), but the event-weighted 0.42 is carried by one female and three to five recurring alliances.
- Kin are preferred partners about as strongly as close associates, with no extra effect beyond association (the paper's Table 2). That argues against a kin bonus on top of the bond, not against kin mattering.

### 3.6 Scores and power

As section 2.6, with the female as the unit and the equal-weight score first. The sealed part is 36 events (15 from 2018 and 2019, the only ones whose pair values never occur in train): a top-pick score there carries about ±0.16 at best. 76% of train partnerships are pairs that also partner in another train month, so the sealed part will mostly repeat alliances already seen.

### 3.7 Compromised targets

No adapter is trained on this file, so nothing is compromised. None by citation or shared records (the key is absent from the registry). If anything were ever trained on it, the 20 targets that mention Kanyawara females are flagged as same animals or community, other records: T-ACT-1, T-PTY-1, T-RNG-5, T-IGE-3, T-IGE-4, T-HUN-5, T-SOC-4, T-DEM-10, T-COM-6, T-DEM-23, T-ENE-1, T-ENE-2, T-ENE-3, T-ENE-6, T-ENE-7, T-ENE-9, T-END-3, T-END-6, T-END-7, T-SOC-14.

## 4. Budongo scans: a yardstick only

Source: `data/raw/dryad-51b68/subgroup_composition_chimpanzees_2008.csv` and `_2009.csv`.

**Registered as: not a choice record. No labels, no adapter, no benchmark.**

Why, in plain terms (audit and sceptic agree; the sceptic's checks are on train rows only):
- A row is who was recorded within 35 to 50 m of a focal animal that the file does not name. There is no date, clock, observer, follow or focal column; the first column is a row number.
- The rows mix at least two lists taken at the same times and written in turn. A fifth of rows share nobody with the row before and do share with the row two back; in one stretch of 2009 the file itself codes a second series with the value 2.
- Even adjacent rows that overlap are often two lists of one moment: an animal that is present, gone, then back is gone again at the next row 79% of the time. So a pair of rows is not a 15-minute step.
- A 0 never means "chose to leave": if the focal walks, everyone else "leaves". Where anyone went is unrecorded. Only adults resident all year are columns.

**What it can still measure** (single rows only; no row is compared with another):

| among adults resident all year, within 35 to 50 m of an unnamed focal | 2008 | 2009 |
| --- | --- | --- |
| scans with at least one such adult | 10,616 | 12,935 |
| individuals in the matrix | 29 | 30 |
| party size: mean; median; middle half | 4.8; 3; 2 to 7 | 5.2; 4; 2 to 7 |
| share of those scans with exactly one such adult | 0.20 | 0.23 |

(The value 2 is read as present, as the audit's rule says. Over all rows, empty ones included, the means are 4.7 and 5.1 and both medians 3.) These hold beside the simulation only when its virtual field observer is run the same way: focal-centred, 35 to 50 m, year-round adults only; and the lists are not independent scans. Whether to register even that as a target is the integrator's call.

**What it must never be called:** a choice record; a stay-or-leave or join record; a time series of 15-minute steps; a membership-change rate (the audit's "8.5% per step" is neither a floor nor a rate: about 3 to 5% where a series can be identified, 8 to 10% elsewhere); "brief absences" (mostly two lists disagreeing); how long a party lasts in minutes.

The audit's row blocks stay as fixed (2008: rows from 8,001; 2009: rows from 9,201 are sealed) and no code of this stage compares one row with another in any block. If anything were ever trained on this file, all 16 Sonso targets would need declaring (T-ACT-5, T-RNG-1, T-RNG-4, T-RNG-5, T-FOOD-10, T-SOC-3, T-SOC-9, T-DEM-9, T-COM-10, T-COM-11, T-DEM-24, T-RHY-1, T-RHY-2, T-RHY-3, T-END-4, T-END-5). A true stay-or-leave series would need the field station's original sheets (date, time, observer, focal): a new data request, which needs the user's go.

## 5. What is built

| file | what |
| --- | --- |
| `scripts/rw2/rw2_ingest.py` | the only reader of the raw files: standard library, run as `/usr/bin/python3 -I`, kept outside `data/raw`. Splits, the seal, derived records under `artifacts/rw2/<dataset>/` (gitignored), the manifest, the Budongo yardstick. `--structure` reads no outcome. |
| `data/rw2-manifest.json` | committed: counts and hashes, no row, no code, no date |
| `src/rw2/packet.ts` | a derived record in, a kernel request and its text out; the mask; the sub-menu builder for the fan-out |
| `src/rw2/kernels.ts` | the registered simple rules as kernels |
| `src/rw2/score.ts` | scores with intervals over individuals (pooled, and each individual weighted equally) |
| `src/rw/score.ts` | `runKernel` takes the packet builder as an option; stage RW's behaviour is unchanged |
| `scripts/rw2-score.ts`, `scripts/rw2-eval.sh` | the scorer: any kernel stage RW can score (the null kernel, a rule, GLiNER with any adapter, each with fan-out), the sealed gate, the generated numbers file; and the wrapper that runs one adapter (not run here) |
| `docs/staging/rw2-sealed-log.md` | openings of the sealed parts (empty) |
| `tests/rw2.test.ts` | invented fixtures only |

## 6. Acceptance tests (invented fixtures; never a real row)

1. The split is deterministic (two runs give identical records and manifest) and no event, and no community-day, lies in two parts.
2. The sealed part's outcome is blanked unless opened: two inputs that differ only in sealed outcomes give identical output; `--structure` output does not change when every outcome changes; opening without a reason is refused and an opening writes the log first.
3. Option order carries nothing: reversing the rows of the input gives identical records; the first-option kernel scores chance; a rule's score does not depend on the shuffle.
4. Identities are not recoverable: no code, date, event number or raw value of the fixture appears in any record or packet; the same chooser has a different invented name from record to record; two records with the same facts and different keys give the same text but for the names (amendment 3).
5. A request passes the shared validation and `rw2RequestError`; a block with a field outside its coarse set is refused; the own view carries no third-party line and no look-ahead field.
6. A sub-menu's request is valid and says nothing about options outside it; a wide menu through the fan-out takes the registered number of calls.
7. Each registered rule picks what its definition says on a hand-made record.

## 7. Model runs (none in this stage)

No model was loaded. The integrator runs, one model process at a time, after `/usr/bin/python3 -I scripts/rw2/rw2_ingest.py` has written the derived records (about 2 s):

```sh
W=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees      # where each stage left its adapter on this computer
scripts/rw2-eval.sh base                                                                         # the untuned model, development parts, own view
MGOGO_FT_ROOT=$W/r4-train/artifacts/decide-ft/r4     scripts/rw2-eval.sh r4-rules-state
MGOGO_FT_ROOT=$W/r4-train/artifacts/decide-ft/r4     scripts/rw2-eval.sh r4-field-groom         # the Ngogo grooming adapter: the nearest thing to a transfer test
MGOGO_FT_ROOT=$W/r4b-retrain/artifacts/decide-ft/r4b scripts/rw2-eval.sh r4b-rules-state
MGOGO_FT_ROOT=$W/r4b-retrain/artifacts/decide-ft/r4c scripts/rw2-eval.sh r4c-rules-state
MGOGO_FT_ROOT=$W/bench-t1/artifacts/decide-ft/r9     scripts/rw2-eval.sh r4-rules-state-s2
scripts/rw2-eval.sh base train,development                                                       # optional: both open parts
scripts/rw2-eval.sh base development third                                                       # only if the user allows the third view
```

Each scores chance, every registered rule, `gliner` (one call a record) and `gliner+fan2` (menus wider than 8 as sub-menus) on both records, and writes its table to `artifacts/rw2/bench/<adapter>-<view>/numbers.md` with the paired difference of each model kernel against the bar. The wrapper refuses the sealed parts.

Time, from the packet counts and the server's token estimate of every packet (0.44 s at 467 tokens, growing as tokens to the power 1.5; a menu of 8 or fewer is the same packet for the plain and the fanned-out kernel, so it is sent once):

| run | packets sent | estimated tokens, median and largest | estimated time |
| --- | --- | --- | --- |
| Taï development, plain and fanned out, own view | 329 + 177 sub-menus | 215, 409 | about 1.2 min (50 s plain, about 20 s of sub-menus) |
| Kanyawara development, plain and fanned out | 29 + 27 sub-menus | 268, 464 | about 15 s |
| **one adapter, development parts** (with about 20 s to load the model) | 562 | | **about 2 min** |
| Taï train, plain and fanned out, own view | 557 + 345 sub-menus | 224, 450 | about 2.2 min (89 s plain, about 40 s of sub-menus) |
| Kanyawara train, plain and fanned out | 145 + 165 sub-menus | 324, 549 | about 1.2 min |
| **one adapter, train and development** | about 1,770 | | **about 5 to 6 min** |
| the third view of Taï instead of the own view | the same counts | 269 to 278, 534 | about 1.3 times the Taï figures |

The untuned model and the five adapters named above, on the development parts, are therefore about 12 minutes in all, one process after another. The adapter folders are where each stage left them (other worktrees' `artifacts/`, read only); the commands are run from a checkout whose `artifacts/rw2` holds the derived records. Every packet is far under the worker's limit of 1,280 tokens and under the serving path's 613. The token figures are the server's word-count estimate, fitted on the simulation's packets; real counts were not measured here.

## 8. Results (11 October 2026; train and development parts only; no model; the sealed parts not opened)

Copied from `docs/staging/rw2-numbers.md` (generated at 7598b68). A rule's score is its expected top-1 with ties split; intervals are 95% over individuals.

**The reader reproduces the audits.** On all 599 Taï train events, before the same-day rule, the derived records give chance 0.2328, past partner 0.3446, highest rank 0.2972, bond 0.2337, weakest bystander bond 0.2938, weakest mean bond 0.3230 and same sex 0.2254: the audit's and the sceptic's figures to the last digit. For Kanyawara they give 73 events, 159 participant records, coalitions of 65, 5, 1 and 2, and 66 date-and-set units, as the sceptic counted. Every eligible Taï development record has exactly one flagged row (329 of 329), which the audit could not check.

### 8.1 Taï grooming

| rule | view | train: 557 records, 11 animals | development: 329 records, 13 animals |
| --- | --- | --- | --- |
| chance | | 0.232 | 0.244 |
| past partner | own | 0.344 (0.321 to 0.399) | 0.347 (0.307 to 0.383) |
| **stack-own, the bar** | own | **0.343 (0.323 to 0.395)** | **0.353 (0.304 to 0.391)** |
| highest rank | own | 0.300 (0.241 to 0.342) | 0.325 (0.247 to 0.378) |
| strongest bond with it | own | 0.242 (0.198 to 0.315) | 0.298 (0.252 to 0.363) |
| partner of earlier today | own | 0.257 | 0.270 |
| nearest in rank | own | 0.198 | 0.254 |
| same sex | own | 0.221 | 0.266 |
| recent aggression | own | 0.248 | 0.255 |
| female with a young infant | own | 0.250 | 0.264 |
| weakest bond with a bystander | third | 0.287 (0.258 to 0.336) | 0.255 (0.213 to 0.293) |
| weakest mean bond with the others | third | 0.324 (0.288 to 0.377) | 0.271 (0.237 to 0.327) |
| stack-third | third | 0.350 (0.327 to 0.409) | 0.365 (0.323 to 0.409) |
| order check: the first option | | 0.226 | 0.216 |

- **The bar is 0.34 to 0.35 on both parts, about 0.11 over chance** (train +0.111, 0.069 to 0.159; development +0.109, 0.069 to 0.151). The stack adds nothing to "past partner" alone.
- **The bystander lines do not hold up.** Strong on train (weakest mean bond 0.324), on development they sit near chance (0.271; over chance by 0.027, −0.011 to 0.093). The third view lifts the bar by about 0.01 (0.365 against 0.353). That is a reason not to show them, whatever the ruling on third-party knowledge.
- The bond with the chooser, at chance on train (0.242), is above it on development (0.298; +0.054, 0.002 to 0.126). Rank is about 0.07 to 0.08 over chance on both.
- Menus wider than 8: chance 0.10; past partner 0.24 on train (115 records) and 0.14 on development (59).
- Female choosers are too few to read: 0.44 on train (58 records, 5 females) and 0.25 against chance 0.21 on development (37 records, 5 females).
- Unseen animals (development, before 2015; 160 records, 4 animals): past partner 0.32 against chance 0.25.
- The order check sits at chance on both parts under five orders (train 0.22 to 0.27, development 0.22 to 0.26).

### 8.2 Kanyawara coalitions (each female weighted equally first; the pooled score beside it)

| rule | train, each of 20 females equal | train, pooled over 145 records | development, each of 13 females equal | development, pooled over 29 records |
| --- | --- | --- | --- | --- |
| chance | 0.179 | 0.218 | 0.246 | 0.239 |
| attacked alongside her before | 0.285 (0.201 to 0.377) | 0.417 (0.272 to 0.534) | 0.419 (0.275 to 0.573) | 0.552 (0.394 to 0.673) |
| **stack, the bar** | **0.248 (0.149 to 0.351)** | 0.395 (0.233 to 0.522) | **0.495 (0.272 to 0.726)** | 0.621 (0.435 to 0.765) |
| most often in joint attacks before | 0.259 | 0.367 | 0.431 | 0.534 |
| groomed with her, previous two years | 0.270 (0.185 to 0.377) | 0.317 | 0.291 | 0.327 |
| most often in her party, previous two years | 0.232 (0.146 to 0.327) | 0.351 (0.201 to 0.464) | 0.334 | 0.315 |
| most often within 5 m, previous two years | 0.242 | 0.365 | 0.388 | 0.419 |
| her close kin | 0.222 | 0.241 | 0.325 | 0.330 |
| highest rank | 0.201 | 0.310 | 0.464 | 0.414 |
| not a newcomer | 0.209 | 0.265 | 0.338 | 0.311 |
| comparison, looks ahead: most often in her party in the event's own period | 0.310 (0.182 to 0.446) | 0.400 | 0.300 | 0.345 |
| order check: the first option | 0.205 | 0.200 | 0.331 | 0.379 |

- **With each female weighted equally, little clears chance on train:** "attacked alongside her before" (+0.106, 0.046 to 0.173), "groomed with her" (+0.091, 0.017 to 0.198), "not a newcomer" (+0.030, 0.007 to 0.054) and the look-ahead association (+0.131, 0.019 to 0.263). The clean association of the previous two years does not clearly (+0.053, −0.011 to 0.124).
- The pooled scores are 0.13 to 0.20 over chance and rest on a few females, as the sceptic said. The sceptic's look-ahead figure (0.31 against 0.17 with females weighted equally) is reproduced (0.310 against 0.179).
- Development is 29 records from 13 females: every interval is wide (the order check itself reads 0.21 to 0.38 across five orders, against 0.24). Nothing is chosen on it.
- Kin, where a kin option exists, are few: the rule sits at chance over all records because most menus hold no kin.

### 8.3 Budongo

No score. The yardstick figures of section 4 are in `data/rw2-manifest.json`.

## 9. Amendments

Made after the registration commit (4be4e8c, 15:11) and before the first real record was read or any score computed (the harness commit 3d35ef2, 15:21; the first score at 15:21:46):

1. **Kanyawara's grooming line** reads "Groomed with me in the previous two years, most first: …", the names in order of grooming time, so that the rule `groomdur-prev` reads what the packet shows.
2. **The derived records of a part are written in order of their hashed key**, so a file's order is neither the source's nor the order in time.
3. Acceptance test 4's last clause ("renaming every animal changes nothing but hashes and names") cannot hold, because the split itself hashes the codes. It is replaced by: two records with the same facts and different keys give the same text but for the names; and the same chooser has a different invented name from record to record.
4. The scorer's per-record outputs go to `--out` (by default `artifacts/rw2/bench`), so runs of several adapters do not overwrite each other.

## 10. For the integrator

Nothing below was written into the files it names. Sources of the Methods details are the audits' and sceptics' readings of 11 October; this stage re-read none of the papers.

### 10.1 What is open for the user

1. **May a chimpanzee's packet show the bystander bonds (the "third" view)?** The numbers say it would add about 0.01 to the bar on development. Recommendation: no.
2. **Train a separate Taï adapter?** 557 train records from 11 animals, a bar of 0.35 against chance 0.24, and a sealed part that cannot show gains under about 0.08 to 0.10. Recommendation: score the untuned model and the existing adapters first (section 7); train only if the untuned model is below the bar, and then as `field choices, Tai first grooming partner`, separate and small, never the main label source.
3. **T-HUN-9 and T-END-12**: compromised or only flagged for such an adapter (section 2.7).
4. **The Budongo party-size figures as a registered yardstick**, or left as a description.
5. **A new data request** for the Budongo field sheets (date, time, observer, focal), the only route found to wild stay-or-leave labels.
6. **The simulation's alert gate** (`src/sim/conflict.ts` lines 59 to 60) never offers a side to an unrelated adult female, while about 96% of the Kanyawara partnerships are between unrelated females. A change there is a Track E matter, not this stage's.

### 10.2 `docs/datasets.md`, rows 21 to 23 (replacing the three rows)

```
| 21 | Taï grooming partner choice (Mielke et al. 2018), [Dryad t8c88vh](https://doi.org/10.5061/dryad.t8c88vh) | Taï South and East communities, October 2013 to May 2015; 1,372 chimpanzee events from 20 choosers of both sexes, 28 partners (sooty mangabeys only in `Data+Model1.csv`, never read) | none spatial; the first adult a focal animal groomed among the analysed adults in sight, with sex, reproductive state, recent aggression and the order of rank and bond among those present | wild choice record, stage RW2 (`docs/staging/rw2-prereg.md` §2): 599 train, 353 development, 420 sealed events (557, 329, 420 after the same-day rule) | open, CC0 | low (individual identities; derived records carry none) | **obtained 11 October 2026** (manual download), checked by an audit and a sceptic; the sealed part unopened |
| 22 | Budongo party scans (Ramos-Fernández et al. 2018), [Dryad 51b68](https://doi.org/10.5061/dryad.51b68) | Budongo Sonso, 2008 and 2009; 10,616 and 12,935 scans of 29 and 30 adults resident all year (geladas and spider monkeys in the deposit, not unpacked) | none spatial; who was recorded within 35 to 50 m of an unnamed focal animal; no date, clock, observer, focal or behaviour; the rows are not a time series | yardstick only, stage RW2 §4 (party size among resident adults); **not a choice record** | open, CC0 | low | **obtained 11 October 2026**, checked; a stay-or-leave series would need the field station's sheets |
| 23 | Kanyawara female coalition partners and relationships (Fox et al. 2022), [Dryad 44j0zpchh](https://doi.org/10.5061/dryad.44j0zpchh) | Kanyawara (Kibale), adult females, 2010–2019; 122 joint attacks on 100 dates; a pair table per two-year period (29 females) | none spatial; which adult females of the party attacked together, with the pair's association, grooming, kinship and rank sum | a small wild test, never a teacher, stage RW2 §3: 73 train, 13 development, 36 sealed events | open, CC0 | low | **obtained 11 October 2026**, checked by an audit and a sceptic; the sealed part unopened |
```

### 10.3 `docs/research.md`: "obtained and checked" notes (each replaces the entry's bullet "What the files contain: not obtained")

```
- **What the files contain: obtained and checked (11 October 2026; `docs/staging/rw2-prereg.md` §2).** Manual download by the
  user; one audit and one sceptic. `Data+Model2.csv` (7,781 rows, chimpanzees only) holds 1,372 events, one row per
  analysed adult in the focal's party when it started a grooming session, `gr.initiated` flagging the one it groomed
  first; 2 to 13 options (median 5); 20 choosers (10 males with 1,193 events, 10 females with 179), 28 partners;
  October 2013 to May 2015. `Data+Model1.csv` adds 157 mangabey events and is not used. So the file does record the
  chosen partner and the set available, as: the first adult groomed, among the analysed adults in sight (usually 30
  to 50 m), in a session the focal started, with at least two such adults present. Methods re-read through the
  Europe PMC full text of PMC6083658 (Data collection; Models and statistical analysis). Not in the paper:
  `z.average.ddsi.partner`, identified from the file as the candidate's mean bond with the other adults present; the
  treatment of a first partner among the seven left-out females; why no event has a single option. Registered as a
  wild choice record with a sealed part (599, 353, 420 events). [H for the file counts; M for the Methods reading]
```

```
- **Paper Methods, read 11 October 2026** from the authors' accepted manuscript (Liverpool John Moores repository,
  https://researchonline.ljmu.ac.uk/id/eprint/8830/), section 2.1, Figure 1 and Discussion; the published version and
  its supplement remain unread (publisher 403, Europe PMC 500, PMC bot check). Sonso community, Budongo, January 2008
  to December 2009; instantaneous scans every 15 minutes during focal follows, 06:00 to 18:00; a subgroup is everyone
  visible or known to be present within 35 to 50 m of the focal animal; only adults present all year (20 females in
  2008, 21 in 2009, 9 males); 10,616 and 12,935 scans. The Acknowledgements say the long-term data were shared by
  V. Reynolds (the field station's routine records).
- **What the files contain: obtained and checked (11 October 2026; `docs/staging/rw2-prereg.md` §4).** 10,747 rows and 29
  individual columns (2008), 13,134 and 30 (2009); cells 0 or 1, and an undocumented 2 on 201 rows of 2009; the first
  column is a row number. No date, clock, observer, focal, sex or behaviour. The rows mix at least two lists taken at
  the same times and written in turn, so a pair of rows is not a 15-minute step and a 0 never means "left". **Not a
  choice record: a yardstick only** (party size among resident adults: mean 4.8 and 5.2; one such adult on 0.20 and
  0.23 of scans). The sex of each column is unknown (the supplement was not obtained). [H for the file; M for the Methods]
```

```
- **Paper Methods, read 11 October 2026** from the copy in NSF's public access repository
  (par.nsf.gov/servlets/purl/10478051, publisher's layout), Methods 2a to 2e and Results, and the authors' analysis
  script (Zenodo doi:10.5281/zenodo.7039524, MIT, read as text, never run). 122 coalitions of two or more adult
  females in joint aggression, recorded ad libitum, 1 January 2010 to 31 December 2019; party = all individuals within
  50 m of any other, read every 15 minutes; events with an adult male among the aggressors not analysed; 129 targets
  (56 resident adult females, 18 immigrant females, 42 males under 15, 13 adult males); for each coalition every
  female of the party is paired with each coalition female; predictors are the pair's values for the two-year period
  that contains the event. No initiator or joiner is defined.
- **What the files contain: obtained and checked (11 October 2026; `docs/staging/rw2-prereg.md` §3).** `analysis2_datashare.csv`:
  1,815 rows, one per pair (a participant, one other adult female in the party) per event, flagged when the two
  attacked together; 122 events on 100 dates; 2 to 16 other females present (median 7). `analysis1_datashare.csv`: 811
  rows, one per pair per two-year period (29 females). A symmetric record with no chooser, no "stay out", the victim
  unrecorded and probably among the candidates in about half the events: **a small test, never a teacher** (73, 13
  and 36 sealed events). [H for the file counts; M for the Methods reading]
```

### 10.4 `IMPLEMENTATION_PLAN.md`, Track R: a paragraph for stage RW2

```
- **RW2: wild choice records from the three Dryad deposits (11 October 2026; branch `rw2-wild-records`; `docs/staging/rw2-prereg.md`, `rw2-numbers.md`, `data/rw2-manifest.json`).** The three downloads the user made on 11 October were each checked by an audit and a sceptic before anything was built, each split rule fixed before any outcome was read. **Taï grooming (Mielke et al. 2018) is a true choice record, and a narrow one:** the first adult a chimpanzee groomed among the analysed adults in sight, in a session it started; 1,372 events from 20 animals of both sexes (599 train, 353 development, 420 sealed; 557 and 329 after a same-day rule), with sex, reproductive state, recent aggression and the order of rank and bond, none of which the Ngogo record has; chance 0.23 to 0.24, the best simple rule (the partner it groomed first most often before) 0.34 to 0.35 on both open parts; the authors' bystander-bond columns score 0.32 on train and 0.27 on development, so they are left out of the packet. **Kanyawara coalitions (Fox et al. 2022) record who attacked together, not who chose:** 122 joint attacks by adult females (73, 13, 36 sealed), a small test and never a teacher; with each female weighted equally little beyond "attacked alongside her before" and "groomed with her" clears chance on train. **The Budongo scans (Ramos-Fernández et al. 2018) are not a choice record:** rows are undated lists around an unnamed focal animal, at least two observers' lists interleaved; a yardstick for party size among resident adults only. So the only route found to wild "join or leave" labels is closed until the field station's own sheets are asked for. The reader (`scripts/rw2/rw2_ingest.py`, standard-library Python, the only program that opens the raw files) writes derived records with no animal code and no date; `scripts/rw2-score.ts` scores any kernel stage RW can score through the same scorer and fan-out; both sealed parts are unopened (`docs/staging/rw2-sealed-log.md`). No model was run: `scripts/rw2-eval.sh <adapter>` scores the untuned model or an adapter on the development parts in about 2 minutes. A Taï adapter, if trained, is separate and named (`field choices, Tai first grooming partner`); T-HUN-9 and T-END-12 are proposed as compromised for it.
```

And in the block "User decisions (10 October 2026)", the last bullet's "Waiting on the user: the three manual downloads …" becomes: "The three manual downloads arrived on 11 October and were checked (stage RW2)."

### 10.5 `data/rw-compromised.json`: further label sources (the first entry stays as it is; `src/rw2/score.ts` `compromisedLists` reads this layout, and `src/rw/manifest.ts` `compromisedFor` applies each list)

```json
"sources": [
  {
    "labelSource": "field choices, Tai first grooming partner",
    "decision": "Proposed by stage RW2 (docs/staging/rw2-prereg.md section 2.7), awaiting the user's ruling. No target cites the paper or shares its records.",
    "targets": [
      { "id": "T-HUN-9", "overlap": "C: the same animals and years, other records (samuni2018, Tai 2013-2015)",
        "reason": "Its Tai row is meat sharing by bond partner, with the same kind of bond index on the same animals; a kernel trained on these choices is shown the order of that index." },
      { "id": "T-END-12", "overlap": "C: the same team and communities, probably the same follows (preis2018, samuni2017); moderate confidence",
        "reason": "Affiliation around intergroup conflict was measured on these animals in follows that probably include these sessions." }
    ],
    "flagged": [
      { "id": "T-BRD-1", "overlap": "C: Tai East and South 2013-2016, a different behaviour (lemoine2023)" },
      { "id": "T-END-1", "overlap": "C or D: Tai males; the period was not checked (preis2019)" },
      { "id": "T-END-2", "overlap": "C or D: Tai males; the period was not checked (preis2019)" },
      { "id": "T-SOC-9", "overlap": "by topic only: reconciliation, other populations" }
    ]
  },
  {
    "labelSource": "field co-participation, Kanyawara female coalitions",
    "decision": "Stage RW2 registers this record as a test only: no kernel is to be trained on it. The list applies if one ever is.",
    "targets": [],
    "flagged": [ "T-ACT-1", "T-PTY-1", "T-RNG-5", "T-IGE-3", "T-IGE-4", "T-HUN-5", "T-SOC-4", "T-DEM-10", "T-COM-6", "T-DEM-23", "T-ENE-1", "T-ENE-2", "T-ENE-3", "T-ENE-6", "T-ENE-7", "T-ENE-9", "T-END-3", "T-END-6", "T-END-7", "T-SOC-14" ]
  }
]
```

The Budongo scans are no label source. If anything were ever trained on them, the 16 Sonso targets of section 4 would be declared.

### 10.6 `AGENTS.md`, Commands (two lines)

```
/usr/bin/python3 -I scripts/rw2/rw2_ingest.py [--structure] [--datasets tai-groom,kanyawara-coalition,budongo-scans]   # stage RW2 (docs/staging/rw2-prereg.md): the only reader of the three Dryad deposits of 11 October 2026 (data/raw/dryad-t8c88vh, -44j0zpchh, -51b68); writes derived records without animal codes or dates to artifacts/rw2 and counts and hashes to data/rw2-manifest.json; the sealed parts are never read (--open-sealed "<reason>" logs to docs/staging/rw2-sealed-log.md first and needs the user's go); --structure reads no outcome
pnpm exec tsx scripts/rw2-score.ts --dataset tai-groom,kanyawara-coalition --part train,development [--kernels null,rules,gliner,gliner+fan2] [--view own|third] [--md docs/staging/rw2-numbers.md]   # scores any kernel stage RW can score on the Taï first-grooming-partner record and the Kanyawara co-attacker record (src/rw2); intervals over individuals; gliner needs --load-model (scripts/rw2-eval.sh <adapter> sets the runtime variables and runs one adapter on the development parts, about 2 min)
```

## Privacy

Nothing derived from a raw row is in git except aggregate counts, rates and hashes. The derived records (`artifacts/rw2`, gitignored) hold no animal code, no date, no clock time and no value of the source; an option has no identity and a chooser one hashed label. No raw row, code or date-by-individual listing was printed while this stage was built. The raw files were read only by `scripts/rw2/rw2_ingest.py` and three scratch scripts of the same kind (column shapes, the Budongo row sums, a cross-check of train figures), all run as `/usr/bin/python3 -I` from outside `data/raw`. The authors' R script was not opened by this stage.
