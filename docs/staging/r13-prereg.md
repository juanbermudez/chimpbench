# Stage R13: a whole population on the first honest-packet adapter (pre-registration)

Agent r13-population, branch `r13-population` from `track-e` d6a8e0e. Registered 12 October 2026, 04:48 EDT, before
any code of this stage and before any run. It follows `docs/staging/r10-prereg.md` §8 and §10.8 ("the next population
run is registered with the first of them", the first adapter of stage R11, "on a fresh unseen seed") and
`HANDOFF.md` §5, task 5.

**This stage registers the run and builds what it needs. It does not run it.** No model process is started here: the
retraining chain of stage R11 is running on this machine (its second night). The run is launched later by the
integrator, one model process at a time.

**The name every result of this stage carries: "rules-taught model on a rules menu".** In full: a model taught the
rules' own odds (soft labels from fresh draws of rules worlds, stage R11), reading packet 5, choosing on the rules'
menu (at most eight options, one feeding option on almost every ask), with the loop's gate on. Its teacher is the
rules, so it cannot be shown better than the rules, and agreement with the rules is not correctness about
chimpanzees. **Animals under 8 years stay on the rules, and every output says so.** One training of the recipe, one
world seed: a level measurement.

## 0. What is known and not known when this is written

- **Known, and used here:** stage R10's first population run (`r10-prereg.md` §10.8): nine simulated days of the
  first adapter (`r4-rules-state`, the state-only packet, the top pick) on seed 48 were viable and sedentary (1.63
  against 2.50 km a day, 2.4 trips to food begun against 7.6, 31.1 act changes against 40.2, beside the same 38
  animals on the rules). Stage R11's first night (one training per arm; tables under
  `.claude/worktrees/bench-r11/artifacts/r11/tables`, written at 01:01 EDT on 12 October; a description only, by
  `r11-prereg.md` §11.2): at ten focal animals for five days on seeds 4111 and 4222 the adapter `r11-p5b-s7` with the
  top pick changes act 36.6 times a day (the rules 53.9 ± 14.3) and carries on its act at 0.778 of fresh choices (the
  rules 0.564); under a draw from its odds it reads 53.9 and 54.1 act changes, 7.22 and 7.80 trips begun (the rules
  7.49 ± 1.72) and 50 and 49 of 50 nights in a nest.
- **Not known:** anything of stage R11's second night (the second training seed of each arm, and so every registered
  statement of that stage: S0 to S3, L1, N1 for a recipe, O1 to O4, W1). The chain's status file read "running" at
  04:40 EDT with the step `21-train-p5a-11` in progress. Nothing in this document depends on how it ends, except
  through the rule of §3, which is fixed now.
- **Not known either:** anything about a population on any adapter of stage R11, and anything about seed 3613.

## 1. What is built (after this file is committed)

1. `scripts/r10-night.ts` and its libraries are extended; no script of an earlier stage changes its registered
   behaviour, and with the default flags the night script's old arms run as before (the same world hashes, the same
   receipt lines).
   - **The packet 5 path.** `--packet p5b` (or an arm of stage R11, which fixes its packet): the world is created
     with `observeV5` 1 beside `observeV4` 1 and `menuParity` 1, and the kernel is sent the packet stage R11's loop
     sends. The packet, the kernel, the arm and its decode are built by the functions of `scripts/r11-loop.ts`
     (`engineArm`, `packetOf`, the kernel maker), exported and shared, not copied.
   - **The arms of stage R11**, by their own names (`p5b-s7-top`, `p5b-s7-draw-1`, …): the name fixes the adapter,
     the packet and the decode, as in stage R11's loop. The dry arms of that stage (`wire-p5b-…`, a worker that
     holds no model) are accepted only with the fake worker and only on seed 48.
   - **Refusals**, each before anything is written: every refusal the old path has (a dirty tree, a reserved or
     retired seed, low disk, an output folder that holds a run, missing runtime variables, an adapter whose weights
     are not under `MGOGO_FT_ROOT` or that `MGOGO_FT_ADAPTERS` does not name, another model process running, a worker
     whose ready line does not carry the adapter's hash); and three more: a sealed seed (4333, 4444); an adapter
     folder with weights and no `manifest.json` (a training cut short, `r11-prereg.md` §12.2); an arm of stage R11
     with a real adapter on any world seed but the one registered here.
   - **Receipts and journal.** A packet 5 run writes receipts of schema `r10-receipt-3`: an ask line is a line of
     `r10-receipt-2` plus `pk`, the packet version (`r11-p5b`), beside `dec`, the decode's record of that ask
     (stage R9's fields). A journal line carries `pk` and `dc`, the decode setting (`draw:1`), and a journalled
     answer is reused on a resume only under the same packet and setting. The decode's record of an ask cannot be on
     the journal line: the journal is written the moment the answer arrives, and the loop's decode step runs after
     it; the record is a pure function of what the journal, the world and the checkpoint's notes hold. The registry
     carries the packet version, the switches and the decode setting. Old-path runs keep `r10-receipt-2`, line for
     line.
   - **Resume and replay** on the new path as on the old: a resume continues from the newest whole checkpoint with
     the decoder's notes; the replay rebuilds every context and every packet and must regenerate every receipt line
     (the packet's hash among its fields).
   - **Two commands for the reading of §8.** `controls`: stage R7's sixteen no-model control arms at the population
     unit on this run's own burned-in world, by stage R7's own code (`scripts/r7-card.ts` `runArm`), for a given
     number of days. `replay <out> --r7 <dir>`: the replayed run read by stage R7's card and row readers
     (`armReaders`, unit P) and written as an arm file beside the control arms.
   - **One command for the packets.** `packets <out>`: the estimated length of every packet a run sent, the check
     that each is the packet stage R11's loop builds for the same decision point, and the projection of §10.
2. `scripts/r13-report.ts`: the statements of §8 from the arm files and the two run folders. No number is typed.
3. `scripts/r13-run.sh`: the launch order of §12 with a status file.
4. `tests/r13-population.test.ts`.

Nothing under `src/` or `data/` changes: no parameter, no switch, no default. The goldens
(`tests/fixtures/golden-world.json`) and the field pin (`tests/sim-track-e.test.ts`) cannot move.

## 2. The run (fixed settings)

- **Adapter.** `r11-p5b-s7`: the first adapter of stage R11 on the whole packet 5 (arm P5b), training seed 7,
  trained on 11 October 2026 from 16:26 to 18:26 EDT. Its weights file hashes to sha256
  `582e409abd2e91a8016b41bcc5ffbbf59616080313e3ebb67b8c92a2aa04c74c` (read today from
  `.claude/worktrees/r11-honest-retrain/artifacts/decide-ft/r11/adapters/r11-p5b-s7`, which holds its manifest). The
  run refuses any other bytes under that name.
- **Packet.** P5b, the whole packet 5 in its short variant (`scripts/lib/r11-packets.ts` `armPacket`): neutral
  option labels, the lines `me`, `feeling`, `doing`, `asked because`, `body`, `now`, `nearby`, `lately`, `last`,
  `memories`, the one-sentence instruction, none of the rules' wording. It is the text the adapter was trained on.
- **World.** Field map; base `docs/staging/integrator-kit/params/M6-W50.json` (the declared working base, swallowed
  share 0.5) with `observeV4` 1, `menuParity` 1 and `observeV5` 1 from the first tick, so the animals' own record is a
  month old when the window opens (`ownKeep` stays at its default, 8). Burn-in: 30 simulated days on the rules. The
  rules never read that record: at the burn-in the script builds the same world without `observeV5` and stops unless
  the two are the same world once the record is removed. Then the arm's switches on its copy: the loop's gate on
  (`kernelGate` 1), the rules' pick kept on the menu (`kernelNoRulesPick` 0).
- **Who is driven.** After every tick, every living animal aged 8 years or over, in every community, is on the
  kernel (lockstep); membership is taken again at every tick. **Animals under 8 stay on the rules** (the user's
  ruling of 6 October; still open as a question, `HANDOFF.md` §6).
- **The step.** `src/kernel/loop.ts` `answerWaiting`, unchanged: the request, its validation, the kernel (one call at
  a time, 120 s at most, then the rules and a new worker), the answer check, the decode, the legality re-check, the
  rules for anything refused. Every worker answers one packet no one applies before it serves.
- **The stream.** The model arm and the paired rules arm continue the one burned-in world with no salt (stage R10's
  design: the rules arm is the plain rules world). The control arms carry stage R7's salts.

## 3. The decode: a rule fixed now, read from stage R11's registered statements

The adapter is fixed (§2). Which decode the population runs with depends on one registered mark of stage R11, in the
words of `r11-prereg.md` §11.1:

> **Mark N1, nights in a nest under a draw** … An adapter meets N1 when every draw arm of it on file meets both
> parts. **The recipe P5b meets N1 only when both its trainings do.** If it does, the result reads: for a model
> taught the rules' own odds the draw no longer costs nests on these worlds. If it does not: the draw still costs
> nests even then, and it stays an arm beside the top pick, whatever it does to timing.

- **If N1 is met for the recipe P5b** (the line "N1 for the recipe P5b: MET" of stage R11's generated
  `r11-numbers.md`, with both trainings on file): the run is **`draw`, decode salt 1** (one seeded draw per ask from
  the adapter's odds, nothing fitted; the arm `p5b-s7-draw-1` of stage R11's loop).
- **If N1 is not met for the recipe, or is not read** (an arm it needs is not on file, for example because the
  chain failed): the run is **the top pick** (`p5b-s7-top`), stage R9's standing decode and stage R11's registered
  primary one. No draw runs on a population in this stage then.
- Nothing else of stage R11 enters the choice. In particular it does not depend on S1 to S3 (they are read on the
  top-pick arms of ten animals and name no decode), on anything read from the first night alone (one training: a
  description, `r11-prereg.md` §11.2), or on what would make the population look better.
- **One reading rule tied to S0.** If stage R11's S0 holds for P5b on the line of the decode that is run here (the
  two trainings differ by more than 2 D on a timing row), every table of this stage says so in its heading: "one
  training of a recipe whose trainings differ". The run is still made and read as a level of this one adapter.
- Why N1 and not more: stage R9 fixed that a decode which fails a "does no harm" guard is never the standard
  (`r9-prereg.md` §10.5, item 1), and N1 is the statement stage R11 registered for exactly that guard under a draw.
  Why a draw at all if it holds: the first population was sedentary, and a draw is the registered candidate for
  bringing switching and trips back to the rules' level; whether it does so when every adult draws is what this run
  can show.

The mode, the salt and the arm's name are written into the registry and on every receipt.

## 4. The seed: 3613, never run before

One fresh world seed, **3613**. Searched today (12 October 2026, 04:44 to 04:48 EDT), from the main checkout:

- **Reserved and retired lists.** `AGENTS.md`, "Gotchas", and `scripts/e-run.ts` `RESERVED_SEEDS` (C8 proof 1111 to
  1515 and 1717 to 2626; patrol re-tests 707, 808, 909, 1013, 1014; C9 proof 5303 to 5707; C11 pools 7004 to 7023,
  8101 to 8505, 8606 to 9010, 9202 to 9606; retired 606, 1010, 1616, 5101, 5202, 7001 to 7003, 9101): 3613 is in
  none.
- **Seeds named by earlier stages.** Training and development worlds 48 and 7; held-out and confirm worlds 21, 5 and
  11; trainer seeds 7 and 11; stage R7's and R11's test seeds 4111 and 4222 and the sealed 4333 and 4444
  (`r7-prereg.md` §9, `r11-prereg.md` §5); the Jev test's 6203, 6301 to 6303 and 6501 to 6905 and the decide-ft
  track's 12001 onward (`docs/decide-finetune.md` §8, `docs/decide-jev-design.md`); the other session's 91011 to
  91013; "the used 4001 to 4010 and 5001" (`r7-prereg.md` §9): 3613 is none of them.
- **Tracked files.** `git grep -w 3613` over all 177 local and remote branch heads, no path left out: no hit.
- **Run folders.** File names under `artifacts/` of the main checkout and of every worktree (to a depth of six
  folders): none contains 3613. The 1,375 run registries, manifests, notes and logs there (`run.json`,
  `*.meta.json`, `manifest.json`, `registry.json`, `*.md`, `*.log`, under 2 MB each) were searched for the seed as a
  field, a flag or a folder tag: no hit.
- Two other candidates (6247 and 2843) were searched in the tracked files of every local branch and in the file
  names under `artifacts/`, and are unused too; 3613 was taken because it lies far from every used block. Not taken: a seed of the 4111 to 4444 family beyond the sealed pair (the user may
  yet name the next sealed pair there, `r11-prereg.md`, "Decisions that are the user's", item 1).

**How it stays fresh until the registered run.** In this stage only the rules run on seed 3613: the plain world and
the rules arm through the script, two days, for the equivalence proof of §10. No kernel of any kind decides on it
before the registered model arm, and the stand-in proofs of §10 run on seed 48. The script refuses an arm of stage
R11 with a real adapter on any other seed.

## 5. Length

- **The model arm:** `--days 20 --hours 9`: at most 20 simulated days, and no new day is begun once another would
  not fit nine hours of wall time. N is the number of whole days it completed.
- **The paired rules arm and the control arms** run for the same N days, afterwards (they need no model).
- **Too short to read:** with N under 9 (the length of stage R10's first run) the level and field statements of §8
  are printed as "not read: N days" and only viability is described. A run the stop check ended is read for
  viability alone.
- A run that dies or is interrupted is continued with `--resume` (not an iteration; nothing is asked twice). An arm
  on file is never run again.

## 6. The stop check after five simulated days

Stage R10's check, unchanged (`r10-prereg.md` §5: two or more deaths by starvation; reserves of driven animals
falling faster than 1.0% of the usual store a day; fewer than 0.80 of driven animal-nights in a nest; the rules
settling more than 10% of asks, or more than 2% timing out). It ends a night that can no longer answer its
question; passing it is not "viable" (§8.1 is). Its thresholds are harness thresholds from the first adapter's
pilot and have been read on one population run.

## 7. What a run writes, and the replay

As `r10-prereg.md` §3, with the additions of §1. Afterwards, with no model:

- `replay <out>`: from the start world, every ask answered from the receipts through the same loop and a new
  decoder of the registry's setting. It must land on every day's world hash, with no receipt missing, no menu that
  differs and no receipt line that differs when regenerated (the context's hash, the packet's hash and the decode's
  record are fields of the line). It reads the run through the field observer and the timing card by value, as in
  stage R10.
- `replay <out> --r7 <dir>`: the same replay read by stage R7's own readers at the population unit, written as
  `<dir>/P/s3613/<label>.json` beside the control arms.
- `packets <out>`: §10, proofs 4 and 5.

## 8. What is read afterwards, and what each outcome would mean (fixed now)

**The yardstick is the rules on the same world, the same animals and the same days.** Stage R7's sixteen control
arms at the population unit, on this run's own burned-in world, for the same N days: eight rules re-draws, random
choice twice, the rules with 10, 20 and 30% of choices random twice each. **D** is the smallest difference one arm
run once can show against the eight re-draws (2.51 standard deviations, stage R7 §6), per row, measured on this
test's own world. A value is **told from the rules** when it lies outside the rules' mean ± D. Every value is read
by one code path (stage R7's card and row readers) on the animals aged 8 and over at the start of the window, in
every arm. Field numbers are yardsticks only and enter nothing.

**A check of the instrument first.** The paired rules arm (the rules through the night script, no salt, read
through the replay like the model arm) must not be told from the eight re-draws on any row of §8.2. If it is, the
two paths do not read alike and nothing below is read until that is explained.

### 8.1 Viability (read first)

| # | Readout | It holds when |
| --- | --- | --- |
| V0 | the stop check after day 5 | it did not end the run |
| V1 | deaths in the window, by cause, every animal | the model arm has no more deaths by starvation than the largest count among the eight rules re-draws |
| V2 | nights in a nest (animal-nights with at least 0.9 of the dark hours in a nest; animals on the kernel) | its share is not below the rules' mean by more than D, or by more than 0.01 when D is smaller than that |
| V3 | reserves (mean daily change, % of the usual store; animals on the kernel) | not below the rules' mean by more than D |

The 0.01 of V2 is a harness threshold, a design assumption: the eight re-draws may all sit at 1, and D is then 0.
**"Viable"** is all four. Deaths by other causes, and each count of the control arms, are printed beside.

- *All four hold:* a population on this adapter with this decode lives, nests and keeps its reserves for N days,
  as the first adapter's did. Under a draw this is also the population-unit reading of stage R11's N1: a draw from
  odds taught on the rules' own does not cost nests when every adult draws.
- *V2 fails under a draw:* the draw costs nests at the population unit although it did not at ten animals; the
  draw does not become a decode for population runs, and the next population run is on the top pick.
- *V1 or V3 fails, or the stop check ended the run:* not viable; the level of §8.2 is printed and not named.

### 8.2 Level against the same animals on the rules

Per animal and day: **distance** (km by 5-minute fixes), **trips to food begun**, **trips completed**, **act
changes** (the four movement rows) and, beside them, **energy eaten** (kcal, the field's intake measure). For each:
the model arm, the paired rules arm, the rules' mean ± D, the control arms, and whether the model arm is told from
the rules and on which side. Also printed, as description: the paired difference per animal (model arm less paired
rules arm, a 95% interval over animals, from the night script's own rows; the two runs are different worlds after
the first decision), and stage R10's first run beside it (another adapter, seed and length).

The outcome is named by the first line that holds, for a viable run:

| Outcome | Rule | What it would mean |
| --- | --- | --- |
| **at the rules' level** | told from the rules on none of the four movement rows | A whole population on this adapter moves, sets out and switches as the same animals do on the rules. The sedentary population of stage R10 was a property of the first adapter, its packet and its decode, not of putting every adult on a model. It would not mean the model is better than its teacher or nearer to wild chimpanzees. |
| **sedentary** | told from the rules downward on distance and on trips begun | The honest packet and labels (and the draw, if it ran) do not remove the under-travel when every adult is on the model. If the draw ran: what it showed at ten animals does not carry to a population (companions on the same model compound it, as stage R7 §13.3 expected). If the top pick ran: the lock-in of one training at ten animals (carrying on at 0.778 of fresh choices) is what a population shows too. Next would be the "who decided" ledger and the odds by kind on this run's own states, not another population night. |
| **restless** | told from the rules upward on act changes or on trips begun, and downward on no movement row | Drawing when everyone draws switches or sets out more than the rules do: the signature of the rules with a share of random choices (stage R7 §13.3: 43.2 act changes a day against 54.9 with 10% random). The draw would then need a hold or a smaller share of asks before it drives a population. |
| **mixed** | anything else | Reported row by row, with no name. |

Energy eaten is not part of the rule (every control arm of stage R7 eats more than the rules, so intake cannot be a
guard); it is printed with the same columns.

### 8.3 The field observer's rows, by the distance outside the band

The fifteen daily rows of the short scorecard and the timing card's two field anchors (patch residency, the
half-hour share), by stage R7's rule as amended (`r7-prereg.md` §13a): the distance **outside** the field band, 0
anywhere inside it; for the model arm, the rules' mean, and the best arm of the rules-plus-random family; D beside
them. Party size (T-PTY-1), the grooming share and the greeting direction are printed by value from the replay, as
in stage R10. Per row, no sums, no pass counts.

- **No row is reported as "closer to wild chimpanzees" by this stage**, whatever a cell says: one training, one
  world seed, one run, and a teacher that is the rules. A row on which the model arm's distance outside the band is
  smaller than the family's best by more than D is listed as "nearer on this run (description)" and named as a
  candidate for a registered test with both trainings.
- **"Left the band"** is reported: a row on which the rules' mean is inside the band and the model arm is outside
  it by more than D. Stage R10's first run left it on several (adult male day range 0.89 km against a band of 1.5
  to 3.5; travel share, pant-hoots, fruit share, rest). What it would mean: the engine moves the population away
  from the field where its teacher sits inside it. With the outcome "at the rules' level" none is expected on the
  movement rows; one found elsewhere is reported as it fell.
- On a row where the rules are inside the band and the model arm stays inside: "not worse", and nothing more.

### 8.4 Beside the statements, as description

Asks per animal and day, the share the kernel's choice settled, fallbacks by reason, timeouts, seconds per ask; the
share of the day in an act a fresh choice of the model set, an intention the gate held, or the rules set; the
share of fresh choices that carry on the act in progress; real seconds per ask against §10's projection.

## 9. What no outcome of this stage can show

That the model is better than the rules (they taught it). Anything about wild chimpanzees (§8.3). Anything about the
recipe (one training seed; under a draw the first recipe's two trainings differed by more than D at ten animals).
Anything about another world (one seed). Anything about choosing a tree, a partner among many, or an ending (the
menu and the gate are the rules'). Anything about animals under 8 (the rules decide for them).

## 10. Proof without a model (run in this stage, after the code is committed)

Tests (`tests/r13-population.test.ts`, the small map, the working base, seed 48):

1. With the default flags the old arms are unchanged: the test files of stage R10 (`tests/r10-night.test.ts`,
   `tests/r10-wiring.test.ts`) pass unedited, and an old-path run still writes `r10-receipt-2` lines with no new
   field.
2. The packet 5 path: a rules arm equals the plain rules world day by day, and equals the world without
   `observeV5` once the animals' own record is removed; a no-model kernel with decode `draw` runs, is stopped inside
   a day with answers journalled, resumed, and ends on the uninterrupted run's hash with every journalled answer
   reused; the replay regenerates every receipt line; a journalled answer of another packet or decode setting is not
   reused.
3. The packet sent: for every decision point of a packet 5 run, the bytes the night script hands the scorer are
   the bytes stage R11's own kernel hands it for the same request, and their hash is the receipt's.
4. The refusals: a sealed seed; an adapter with weights and no manifest; an arm of stage R11 on another seed than
   3613; a dry arm without the fake worker; a packet or a decode flag that contradicts the arm's name.
5. The report: the statements of §8 on made-up arm files (each outcome reachable; each can fail).

Field map, no model, one process at a time:

0. **The old path is unmoved, seed 48.** The old arm `argmax-gate` for two days, as in `r10-prereg.md` §10.3: the
   burn-in and the two day hashes stage R10 recorded (4b5cc61f8ad797e0, then 95bfc1fd4e6ddfda and
   07ec9b9f26b64f60) and its count of receipt lines (6,423).
1. **Rules equivalence on seed 3613.** `plain --seed 3613 --packet p5b --days 2` against `run --seed 3613 --arm
   rules --packet p5b --days 2`: the burn-in hash and both day hashes equal; and the same world without the animals'
   own record equals the plain world without `observeV5`.
2. **A stand-in through the model path, seed 48.** The arm `wire-p5b-draw-1` of stage R11's dry run (the fake
   worker of `scripts/lib/fake-worker.mjs`, which holds no model; packet P5b; decode draw, salt 1) for two days:
   asks, held acts, fallbacks by reason (packets over the estimate budget among them), wall time.
3. **Killed and resumed.** The same run killed with SIGKILL inside day 2 and resumed: the uninterrupted run's end
   hash, the journalled answers reused.
4. **Replay.** Every day hash equal, no receipt missing, no line that differs when regenerated; and `packets`:
   every packet of the run rebuilt from its saved context by stage R11's builder hashes to its receipt's `sha`.
5. **Length and time.** The estimated tokens of the packets sent (median, 95th percentile, largest, the share over
   the kernel's budget), projected to real tokens by the ratio stage R11 measured on P5b (0.83), and the projection
   of the night: simulated days in 9 hours = 32,400 s ÷ (asks a day × seconds an ask + the no-model seconds a day).

**Written before the runs** (to be checked, not to be met): the burned-in world of seed 48 with the own record
removed is the pilot's (4b5cc61f8ad797e0) if nothing in the simulation has moved since 7 October. A population is
asked 55 to 85 times per animal on the kernel and day (stage R10 measured 55.2 for the first adapter on seed 48;
stage R11's P5b arms 71 to 76 on ten focal animals of other seeds; the fake worker's odds are arbitrary, so its own
rate is a rate of the path and not of the adapter): 2,100 to 3,200 asks a day for 38 animals. The packets'
estimate has a median near 409 (stage R11's training file) and none is over the budget of 1,000. At the 0.41 to
0.50 s an ask of stage R11's P5b arms on its first night (a shared machine; the smoke run measured 0.32) a
simulated day takes 14 to 27 minutes, so nine hours cover 20 to 38 days and `--days 20` may or may not be reached.

At most 3 iterations per problem.

## 11. Machine rules, and iterations

One simulation at a time, one process, no worker pool; `uptime` before anything heavy. Runs only from a committed
head with a clean tree. No model process in this stage; nothing in `bench-r11` is touched. The whole test suite is
run at most twice.

- **Iteration 0** (this agent, no model; logged 12 October 2026, 04:48 EDT, before any run): the code and tests; the
  proofs of §10.
- **Iteration 1** (the integrator): the model arm, the paired rules arm, the control arms, the replays and the
  report; §8 read.
- One more is kept for a failed run or a defect, logged here before it runs. The statements of §8 and the rule of
  §3 do not change.

## 12. Iteration log and results

Sections 0 to 11 stand as registered at 04:51 EDT (commit 1386135; the code came after it, commit e0ec7e6 at 05:16).
**The registered run has not been made, and no model process was started at any point.** Everything below is
iteration 0: no model, one process at a time, from a committed head with a clean tree. Run folders and logs are
under `artifacts/r13/` of the worktree `r13-population` (not in git).

### 12.1 What was built beyond §1, and what was left out (none of it changes §2 to §8)

- **A command `rule <r11-numbers.md>`** prints the decode rule of §3 as the script reads it, and `scripts/r13-run.sh
  model` refuses unless the integrator's `R13_ARM` is the arm that rule names. `R13_R11_NUMBERS` has no default: the
  copy of `r11-numbers.md` under `docs/staging` was written before any engine arm existed and would silently read
  "N1 not read".
- **The check for another model process** also knows the scripts stage R11 added (`train_r11.py`, `em_score.py`,
  `parity.py` and four others) by name. It already counted every Python started from the model environment.
- **The field table has two words §8.3 did not name**, both description: "outside by less than D" (the rules inside
  the band, the model arm outside it by no more than D: not told from inside) and "further out" (the rules outside
  the band, the model arm further outside by more than D).
- **The first adapter's arms of stage R11's loop** (`old-…`, the state-only packet in a world with `observeV5` 1) are
  accepted like the others, on seed 3613 only. Nothing registers a run of them.
- **Not built:** a re-draw of the rules through the night script. The eight re-draws are stage R7's own control
  arms, on the run's burned-in world (§8).
- **Two words of §1 and §7, explained here and not edited there:** "unit P" and the folder `P` are stage R7's name
  for the population unit; "the launch order of §12" is the launch order under "For the integrator".

### 12.2 The proofs of §10 (12 October 2026, 05:16 to 05:24 EDT; head e0ec7e6, tree clean; load 4 to 9)

| # | Proof | Result |
| --- | --- | --- |
| 0 | The old path, `argmax-gate`, seed 48, two days | **Unmoved.** The burned-in world is the pilot's (4b5cc61f8ad797e0); 2,060 and 2,069 asks; day hashes 95bfc1fd4e6ddfda and 07ec9b9f26b64f60; the replay regenerates all 6,423 lines: each figure is the one in `r10-prereg.md` §10.3 |
| 1 | Seed 3613: the rules arm through the script against the plain rules world | **Equal.** `plain --packet p5b`: 909ec298b1169a33 after 30 days, then 250e63547c2ee49f and ec253e94405682e7; the rules arm through the script: the same three. Without the animals' own record: 46fa3807cbcdc8e4, 0e6f3c9b0720a72c, bf8b2d5bac9ce290, which are the three hashes of the plain world without `observeV5`. 49 living, 38 aged 8 and over |
| 2 | Seed 48: a stand-in through the model path (`wire-p5b-draw-1`: the fake worker, packet P5b, decode draw, salt 1), two days | Burn-in b35818060f2fe16b, which without the own record is the pilot's; day hashes 4789054307f31932 and 119e075380e536ca. **2,235 and 2,304 asks** (59.7 per animal on the kernel and day); the stand-in's choice settled 2,207 and 2,281, the rules 28 and 23 (every one `not-applied`); 1,032 and 1,035 acts held by the gate; no packet over the kernel's budget, no death, no timeout. Per day: receipts 1.8 MB, contexts 7.3 MB before gzip, a checkpoint 0.9 MB; 0.1 minutes of wall time; largest memory 525 MB |
| 3 | The same run killed with SIGKILL after 8,000 ticks (inside day 2; exit code 137) and resumed | 3 files of the day set aside, **1,492 journalled answers reused**, the decoder's notes of 38 animals read from the checkpoint, end hash **119e075380e536ca**, the uninterrupted run's. No worker process was left behind |
| 4 | Replay, and the packet check | The receipts reproduce the run: 2 of 2 day hashes equal, 0 asks without a receipt, 0 menus differ, **0 of 6,606 receipt lines differ** when regenerated (the context's hash, the packet's hash, the packet version and the decode's record are fields of a line), 0 row files differ. `packets`: **4,539 of 4,539** packets rebuilt from their saved contexts by stage R11's builder hash to the receipt's `sha`; every ask line carries `r11-p5b`. The killed and resumed run replays and checks the same way |
| 5 | Length and time | Estimated input tokens of the 4,539 packets: median 364, mean 370, 95th percentile 495, largest 600 (the kernel's budget on the estimate is 1,000). At stage R11's measured ratio for this packet (0.83): about 302, 307, 411 and 498 real tokens. Projection below |

**The projection of the night** (printed by `packets` from proof 2: this run's asks a day at a model's seconds an
ask, plus this run's own seconds a day):

| Seconds per ask | Where the figure is from | Minutes per simulated day | Simulated days in 9 hours |
| --- | --- | --- | --- |
| 0.32 | stage R11's smoke run, one P5b packet at a time (`r11-prereg.md` §12.4) | 12.2 | 44 |
| 0.41 | stage R11's first night, `p5b-s7-top` on seed 4111 (872 s for 2,126 calls) | 15.6 | 34 |
| 0.50 | the same night, `p5b-s7-draw-1` (974 s for 1,955 calls), on a shared machine | 19.0 | 28 |

That is at the stand-in's 2,270 asks a day. Stage R11's P5b arms asked 71 to 76 times per focal animal and day; a
population asked at that rate (2,700 to 2,900 asks a day) takes 18.5 to 24.2 minutes a day at 0.41 to 0.50 s, so
nine hours cover 22 to 29 days. **`--days 20` is expected to end the run, after 4 to 8 hours**; `--hours 9` is the
guard. Not in the table: the model load (55 to 220 s here) and the hold while swap in use is above 6 GB (up to 30
minutes).

**The whole reading, dry** (`scripts/r13-run.sh dry`, seed 48, two days, 3 minutes in all; a fake worker, never a
result): the stand-in arm, the rules arm, stage R7's sixteen control arms on the same burn-in (4 to 8 s each), four
replays, the packet check, stage R7's report with both runs beside the control arms and this stage's report. The
check of the instrument holds: the rules through the night script are told from the eight re-draws on none of the
five level rows, hold all five guards and are told on 0 of stage R7's 14 timing rows. The stand-in's "population"
reads not viable (nights in a nest 0.342 against 0.998 ± 0.005 for the rules; reserves −0.504% a day against a line
of −0.087), as arbitrary odds should: V2 and V3 can fail. Its tables are under `artifacts/r13/dry/tables` and are
not published. Run once more at the stage's last code (head e5aa077, 05:29 to 05:32 EDT, a fresh burn-in): the same
day hashes, 6,606 lines and 4,539 packets.

**The refusals, from the command line** (each exit code 2, nothing written; in `tests/r13-population.test.ts`): a
sealed seed (4333) for a run and for the control arms; `p5b-s7-draw-1` on seed 48; a dry arm on seed 7; `--packet
p5a` or `--decode top` against the arm's name; a dry arm without the fake worker; on seed 3613 an adapter folder
with weights and no manifest, and one with a manifest and other bytes than the registered ones; `--r7` on a run of
the small map. The last two model refusals come before the check for another model process and before any world
is built, so the test starts nothing and runs nothing on seed 3613. **Another model process:** read on this machine
at 05:23 EDT with two `ps` calls and nothing started, the script's check saw one (the offline scoring of stage
R11's chain); a model arm launched then would have been refused and named it.

**Written before the runs, checked.** The burned-in world of seed 48 without the own record is the pilot's: yes.
"Asked 55 to 85 times per animal and day, 2,100 to 3,200 asks a day": the stand-in 59.7, and 2,235 and 2,304.
"The estimate has a median near 409": no, 364 (the packets of days 31 and 32 of a population are shorter than the
training file's); none over the budget: yes. "A day takes 14 to 27 minutes, nine hours cover 20 to 38 days": 12.2
to 19.0 minutes and 28 to 44 days at the stand-in's rate; 18.5 to 24.2 minutes and 22 to 29 days at stage R11's.

### 12.3 What seed 3613 has seen

The rules, twice: the plain world for 32 days (with and without `observeV5`) and the rules arm through the script
for the same 32 days. No kernel, no stand-in, no control arm. Nothing was read from those runs but their hashes and
the count of animals (49 living, 38 aged 8 and over). The two-day rules folder of the proof is under
`artifacts/r13/smoke`; the registered paired rules arm is run again by the integrator, for N days, into its own
folder.

### 12.4 Tests and checks (12 October 2026, 05:08 to 05:43 EDT)

| What | Head | Result |
| --- | --- | --- |
| `tests/r13-population.test.ts` (the small map, seed 48; one test starts the script as a child process 15 times, the fake worker among them) | e0ec7e6; again after the last script edit | 8 of 8 |
| `tests/r10-night.test.ts`, `tests/r10-wiring.test.ts`, unedited | ee8684b | 13 of 13, 6 of 6 |
| `tests/r11.test.ts`, `r5-pilot`, `r9-decode`, `r7-engine`, unedited | ee8684b | 13 of 13, 5 of 5, 11 of 11, 2 of 2 |
| `tsc --noEmit` | e5aa077 | clean |
| the stage's scripts and tests under the same strict options (a temporary configuration; a planted error is caught) | the last code | clean |
| `scripts/gen-params.ts --check` | e5aa077 | valid: 1,050 entries, none added; `params.gen.ts` up to date; lint clean |
| `git diff d6a8e0e -- src data server tests/fixtures` | e5aa077 | empty: the goldens and the field pin cannot have moved |
| the whole suite, once (`tsx --test`, four files at a time) | e5aa077, this document being edited | **1,313 tests: 1,312 pass, 0 fail, 1 skipped** (the guide's scorecard check, whose data file is not on this computer); 8 min 12 s. `tests/sim-params.test.ts` (the goldens) and `tests/sim-track-e.test.ts` (the field pin) are in it |
| `pnpm build` | e5aa077 | passes (9 s) |

One problem met while building, one iteration: a test asserted that the packet P5a of a context never equals its
P5b packet; 4 packets of the test's run carry neither of the two lines P5a deletes, so the two are the same there.
The assertion was wrong, not the code.

### 12.5 Not done, and limits

- **The run.** No model arm, no paired rules arm of N days, no control arm on seed 3613, no statement of §8 read.
- **Nothing on the model's path has met a real worker in this stage:** the worker's start with the adapter of stage
  R11 named, its ready line with the adapter's hash, the warm-up on a P5b packet, a timeout and a replacement. The
  same code ran on the first adapter in stage R10's night and stage R11's loop ran P5b packets through its own
  harness; the combination is new. The first minutes of the run are where a surprise would show.
- **Real token counts were not taken** (the tokenizer belongs to the model's environment). The lengths are the
  project's estimate and the 0.83 is stage R11's ratio for the training file.
- The swap hold of the night script is stage R10's (up to 30 minutes above 6 GB, then it goes ahead), not stage
  R11's shorter one.
- One world seed, one training of the recipe. Stage R7's report prints its section 3 under the heading "the
  population for 30 days"; the window is N days, as its first lines say.
- A journal line carries the decode setting, not the decode's record of the ask (§1).

## 13. The second reader's review and amendments (12 October 2026, 05:43 to 06:47 EDT; before any run of the registered arm; no model process)

A second agent read the branch at 531e961 with the instruction to refute the builder's report, not to trust it. **The
registered run has still not been made. No model process was started; nothing in `bench-r11` or in the main checkout
was written; stage R11's chain was running throughout** (its loop step on seed 4111 at 06:36).

Sections 0 to 12 above are not edited. What changes is said here, with the reason. Each amendment was logged in the
message of the commit that carries its code (cec52d4 and 65c6434 at 06:26 EDT, 17c616c at 06:32) before that code
first ran outside its unit tests (the dry runs on seed 48 at 06:27 and 06:32), and is written out here at 06:36. No
model arm exists, and nothing but the rules has run on seed 3613. None of the six amendments makes a statement of §8
easier to hold: two add refusals, one removes a way to be listed as "nearer", one closes a way to hold V0, one adds
description, and one replaces a judgement that would have been made after the result by a check that is exact.

### 13.1 What was re-measured, and held

- **The order.** `git log` and the branch's reflog: the registration is commit 1386135 at 04:51:20 EDT, the first
  code commit e0ec7e6 at 05:16:09. Between 1386135 and the builder's last commit, sections 0 to 11 do not differ by
  a character (`git diff 1386135 531e961` touches the file only from §12 on).
- **The decode rule against stage R11's own words.** The quotation in §3 is `r11-prereg.md` §11.1 word for word. The
  line the rule reads is written by `scripts/r11-report.ts` (`recipeN1`): MET only when both trainings of P5b have a
  top-pick arm and a draw arm on file on both seeds and every draw arm meets both parts; "not read" when one is
  missing. That script and `scripts/r11-loop.ts` at the base of this branch are byte for byte the ones in stage R11's
  frozen checkout (5b5a506). Read at 06:32 EDT from stage R11's first-night table, the rule gave "N1 not read: the
  top pick". Nothing else of stage R11 enters it.
- **The seed.** 3613 does not occur, not even inside a longer number, in any tracked file of the other 177 branch
  heads (`git grep 3613`; the neighbouring numbers 3612 and 3614 do occur, so the search works). No file or folder
  name under the main checkout or any worktree carries it but this stage's own burn-in caches and its rules
  folders. A search of file contents under the main checkout and every worktree (files up to 8 MB; compressed
  files left out) for the number in a seed's place found none: the 38 files that hold the bare number hold it as a
  count, a decision version or an energy figure. The review folders outside the repository: none. On this branch
  seed 3613 has seen the rules only: the builder's two days, and the same two days again by this review.
- **The proofs of §10, run again** (head 531e961, tree clean, 06:08 to 06:14 EDT; logs under
  `artifacts/r13/review/logs`). The old arm `argmax-gate` on seed 48: the burn-in 4b5cc61f8ad797e0, the day hashes
  95bfc1fd4e6ddfda and 07ec9b9f26b64f60, 2,060 and 2,069 asks and a replay of 6,423 lines, each as `r10-prereg.md`
  §10.3 has it, with receipts of schema `r10-receipt-2` and no new field. Seed 3613: the plain world, the rules arm
  through the script and the world without `observeV5` give the hashes of §12.2. The stand-in on seed 48: 2,235
  and 2,304 asks, day hashes 4789054307f31932 and 119e075380e536ca; killed with SIGKILL after 8,000 ticks and
  resumed: 1,492 journalled answers reused, the same end hash, no worker left behind; the replay regenerates all
  6,606 lines; 4,539 of 4,539 packets rebuilt; estimated tokens 364, 370, 495 and 600 (median, mean, 95th
  percentile, largest).
- **The adapter.** The weights file of `r11-p5b-s7` hashes to the registered sha256, and its folder holds a manifest
  whose own name for its results is "rules-taught model on a rules menu".
- **Another model process.** Called at 06:12 EDT with nothing started, the script's own check saw stage R11's
  worker; `scripts/r13-run.sh check` at 06:32 said the same. A model arm would have been refused.
- **Nothing under `src/`, `data/`, `server/` or `tests/fixtures/` changed** on this branch, before or after the
  review (`git diff d6a8e0e` on those paths is empty): no switch, no default, and the goldens and the field pin
  cannot have moved.
- **The name.** "Rules-taught model on a rules menu" is what stage R11's own report and the adapter's manifest call
  it, and every table and registry of this stage carries it with "animals under 8 years stay on the rules".

### 13.2 The packet, byte for byte (the builder's test compared a function with itself)

The unit test that claimed "the bytes stage R11's own kernel hands the scorer" built both sides with `engineKernel`,
the function this stage added. This review compared against stage R11's kernel written out as its frozen checkout has
it (`glinerKernel(scorer, adapter, { packet: r => armPacket(r.context, arm) })`), on the line a worker is written
(`scripts/ft-society.ts` `Worker.score`). The script is `scripts/r13-packet-proof.ts`; it holds no model.

| What was compared | Decision points | The same line |
| --- | --- | --- |
| The script itself on seed 48, two days, against a fake worker that kept every line it was handed (5.5 MB); each line against stage R11's kernel on the saved context | 4,539 | 4,539 (and one warm-up line) |
| The night engine wired as the script wires the arm `p5b-s7-draw-1`, the whole population for one day, seed 48 | 2,235 | 2,235 |
| The same, seed 7 | 2,105 | 2,105 |
| Stage R11's own harness (`scripts/r5-pilot.ts` `runArm`, five focal animals, one day), its requests put to the population script's kernel; seeds 48 and 7 | 391 and 306 | 391 and 306 |

The 4,340 population points of the two seeds cover twelve kinds (day, dawn, dusk and night, each opened by an
interrupt, a finished act or an act's scheduled end), menus of two to eight options, all 38 animals on the kernel,
and menus with feeding, rest, trips to food, grooming, aggression, calls, nests, greetings, drinking, mating and
care. On each, the receipt's `sha` is the hash of the packet in the line and its version is `r11-p5b`. The unit test
now makes the same comparison. **The decode is stage R11's:** the same setting object (`draw`, salt 1, the epoch rule
`act`), the same `newDecoder`, and the same two calls per pass in both harnesses (`step` handed to the loop, then
`settle` for every result in order). What differs is registered in §2: the population arm continues the world with
no salt and drives every animal aged 8 and over.

### 13.3 Amendments (12 October 2026; before any model arm)

- **A1. The check of the instrument has an exact form, and it decides** (amends §8, "A check of the instrument
  first"). *Why:* the paired rules arm is one more draw of the rules, so it lies outside the eight re-draws' mean ±
  D on a given row about once in twenty by chance, and on one of the five level rows in about one run in six. The
  registration then said "nothing below is read until that is explained", which leaves the explanation to be
  judged after the result is seen. *What changes:* the control arms now include stage R7's own code on the rules
  world with no salt (`rules-plain`; not one of the eight re-draws, in no spread). That is the world the paired
  rules arm continues, so the two must end on the same world and give the same number on every readout. If they
  do, the two paths read alike; a paired rules arm that is told from the re-draws on a row is then chance, is
  printed as such, and the statements are read. If they do not, nothing is read. Without the file the check stands
  as first registered. *Measured on seed 48, two days:* the same end world and 66 of 66 readouts equal.
- **A2. A field row is "nearer on this run" only with stage R7's five guards held** (amends §8.3). *Why:* §8.3
  names stage R7's rule as amended, and that rule counts a smaller distance outside the band only when reserves
  and nights in a nest are not below the rules' mean by more than D and distance, act changes and trips completed
  are inside the rules' mean ± D. The report had left the guards out. A population that does less than the rules
  can carry a row into its band: stage R10's first run walked a third less and its grooming share (T-ACT-3, one
  of the fifteen rows) rose into the band (0.101 against the rules' 0.073; band 0.08 to 0.18), as did party size,
  which is printed beside them. And on the builder's own dry table a fake worker with arbitrary odds, not viable
  (0.342 of nights in a nest), was listed as "nearer on this run" on patch residency and the half-hour share. *What changes:* with a guard failed such a row reads "nearer by value with a guard failed (not listed)"
  and is no candidate for a later test. The five guards and which of them fail are printed.
- **A3. With a real adapter only the registered arm runs** (amends §1 and withdraws the fourth item of §12.1).
  *Why:* the script accepted every arm of stage R11's loop on seed 3613 (the first adapter, P5a, the second
  training, other decode salts, held draws), and checked the arm against the decode rule only in
  `scripts/r13-run.sh`. Either would have spent the fresh seed on something nobody registered, against §4. *What
  changes:* the script refuses every arm with a real adapter but `p5b-s7-draw-1` and `p5b-s7-top`, and of those
  the one the rule does not name. It reads the table from `R13_R11_NUMBERS` itself and starts nothing without it.
  The rule does not read a dry run's table. The rule as read, the table's path and its hash go into the registry.
- **A4. The world and the length are the registered ones, and the nine hours are the run's** (amends §5). *Why:*
  `--days`, `--hours`, `--profile`, `--burn-in`, `--params-file`, `--timeout-s`, `--no-stop-check` and
  `--no-contexts` could be given for the registered arm, and each resume began nine new hours, so N could be moved
  by how a run was launched or resumed. A finished run could also be resumed and run on. *What changes:* the
  registered arm starts only on the field map after 30 days of burn-in on the working base, with `--days 20`,
  `--hours 9` or less, the stop check on, 120 s an ask and its contexts saved. At a resume the script counts the
  wall time of the whole days on file: the segment gets what is left of nine hours, and when another day would
  not fit (the rule the run itself ends on) the run is closed as it stands. Time lost inside a day that was cut is
  not counted.
- **A5. A run the stop check ended stays ended** (amends §6 and V0 of §8.1). *Why:* `scripts/r13-run.sh model`, or
  the chain, called again after the stop check had ended the run, resumed it past the check (the night script's
  resume goes on "on purpose"), and V0 read the registry's state, which then said "done". *What changes:* neither
  script resumes the registered run past a stop check that said STOP, and V0 reads the check's own verdict.
- **A6. Two descriptions beside the level, and one sentence tightened** (adds to §8.2). The level table prints D as
  a share of the rules' mean and, per group of control arms, the movement rows on which both of its realizations
  are told from the rules. "At the rules' level" is a statement of not being told: the sentence printed with it
  now begins "to within D on each of the four movement rows". The name and the rule do not change.

### 13.4 Another defect repaired

`--packet p5b` or `p5a` with a model arm that is not stage R11's (`trained-gate`, `untuned-gate`) built a packet 5
world, sent the kernel the state-only packet and wrote the packet 5 version and hash on every receipt. It is refused.

### 13.5 What stays open, and limits of this review

- **Nothing on the model's path has met a real worker**, as §12.5 says. That includes the path of a real launch
  past the new refusals: they were exercised from the command line as far as the check of the adapter's hash, with
  a runtime that can load nothing. The first minutes of the run are still where a surprise would show.
- **The decode rule was written with stage R11's first night in view** (§0): for the one training then on file the
  draw arms kept their nests and read nearer the rules than the top pick. The rule is fixed and turns on the second
  training, which was not known; a reader should still know which way the builder could expect it to fall.
- The content search for the seed left out compressed files and files over 8 MB (their names were searched).
- "Viable" does not tell a population that does less from one that does as much: fewer trips cost no nests and no
  reserves. That is what §8.2 is for; V1 to V3 are guards, not a result.
- With one world seed, D comes from eight re-draws of one world. A level within D of the rules is a statement about
  this world, and a short run has a wide D: the table now says how wide.
- The V2 floor of 0.01, the minimum of nine days and the cap of 20 are the builder's and are not changed; they are
  the user's to change before the run.
- A resume that follows a death between a day's checkpoint and its registry entry counts one day too few towards
  the nine hours (at most one day's wall time).
- `scripts/r13-run.sh report` asks for the sixteen control arms and not for `rules-plain.json`; without that file
  the report says so in its §0 and falls back to the check as first registered.
- Not checked by this review: real token counts (the tokenizer belongs to the model's environment); the swap hold;
  stage R7's report at the population unit, beyond its running on the dry files.

### 13.6 Tests and checks

| What | Head | Result |
| --- | --- | --- |
| `tests/r13-population.test.ts` (8 tests; one starts the script as a child process about forty times, none with a model) | 17c616c | 8 of 8 |
| the stage's scripts and tests under the project's strict options (a temporary configuration; a planted error is caught) | 17c616c | clean |
| the whole reading, dry (`scripts/r13-run.sh dry`, seed 48, a fake worker; 06:32 to 06:35 EDT) | 17c616c | the stand-in's day hashes 4789054307f31932 and 119e075380e536ca, 6,606 lines, 4,539 packets; the seventeen control files; the exact check holds (66 of 66 readouts); "not viable", as arbitrary odds should read; no row listed as nearer |
| `tsc --noEmit`; `scripts/gen-params.ts --check` | 925018b | clean; valid, 1,050 entries, none added |
| the whole suite, once (`tsx --test`, four files at a time; 06:37 to 06:45 EDT) | 925018b | **1,313 tests: 1,312 pass, 0 fail, 1 skipped** (the guide's scorecard check, whose data file is not on this computer); 8 min 1 s. The goldens' test and the field pin are in it; `tests/r10-night.test.ts`, `tests/r10-wiring.test.ts` and `tests/r11.test.ts` are unedited |

The suite ran on 925018b, which holds every line of code of this branch. The two commits after it add these rows,
two sentences and the section's end time to this document (written 06:46 EDT) and touches nothing else; no test reads this file.

## 14. Results (the integrator, 12 October 2026, written 15:13 EDT; frozen checkout `bench-r13` at fcbd612)

Tables, generated, no number typed: [r13-numbers.md](r13-numbers.md) (the statements), [r13-card.md](r13-card.md),
[r13-model-replay.md](r13-model-replay.md), [r13-rules-replay.md](r13-rules-replay.md). **Every number of the model
arm is a rules-taught model on a rules menu** (stage R11's first adapter on the whole packet 5, one training of the
recipe, a draw from its odds; animals under 8 on the rules). One training, one world seed, one run: a level. Nothing
here is about wild chimpanzees.

### 14.1 The run

- The decode, by the rule of §3, read by the script from stage R11's final table: N1 met for the recipe P5b, so a
  draw (`p5b-s7-draw-1`). The chain ran in the model queue behind stage RW3: check and dry step from 10:41, the model
  arm 10:43 to 15:01 EDT, the paired rules arm, the seventeen control files and the report by 15:11.
- **20 simulated days in 4.23 hours**: 48,034 asks (2,402 a day; 63.2 per animal on the kernel and day), 0.31 s a
  call, **no timeout**, the kernel's choice settled 97.9% of asks, the warm-up took 186 s. The stop check after day 5
  did not end the run. This session ran no heavy process beside the registered asks.
- **The check of the instrument holds both ways** (amendment A1): the paired rules arm ends on the same world as
  stage R7's own reading of it with 66 of 66 readouts equal, and is not told from the eight re-draws on any level row.

### 14.2 The registered reading

**Viable: no.** V0 holds (the stop check did not end the run); V1 holds (no death in 20 days, in any arm). **V2
fails**: 0.972 of animal-nights in a nest against a floor of 0.982 (the eight rules re-draws 0.997 ± 0.006, the
paired rules arm 1.000). **V3 fails**: reserves change by −0.054% of the usual store a day against a floor of −0.011
(the re-draws +0.005 ± 0.006, the paired rules arm +0.008).

**In the registered words** (§8.1): the draw costs nests at the population unit although it did not at ten animals;
the draw does not become a decode for population runs. And, for V3: not viable; the level is printed and not named.

**The level, printed and not named** (per animal and day; the rules' mean ± D on this world): distance 2.37 km
against 2.10 ± 0.22 (**told, above**); trips to food begun 7.33 against 7.13 ± 0.64 (not told); completed 2.07
against 2.00 ± 0.26 (not told); act changes 44.4 against 44.1 ± 3.6 (not told); energy eaten 1,591 kcal against
1,627 ± 20 (**told, below**; not a guard). Paired per animal against the rules arm: +0.47 km (0.35 to 0.59), −26 kcal
(−48 to −3), reserves −0.061% a day (−0.080 to −0.042), and the share of the dark hours in a nest −0.001 (−0.006 to
0.004).

**The field rows** (§8.3): no row left its band; none is listed as nearer (three of stage R7's five guards fail:
reserves, distance, nights in a nest); the half-hour share is further out than the rules'.

### 14.3 Beside the registered reading (description; no statement rests on it)

1. **The sedentary population of stage R10 is gone.** That run (the first adapter, the state-only packet, the top
   pick) read 1.63 against 2.50 km, 2.4 against 7.6 trips begun and 31.1 against 40.2 act changes. This one sets
   out, completes trips and changes act as often as the rules do, and walks about an eighth further.
2. **What fails is narrow and is not survival**: about one animal-night in 36 falls short of nine tenths of the dark
   hours in a nest while the share of dark hours in a nest is the rules' (0.981 against 0.982), and the store falls
   by about a twentieth of a percent a day while nobody dies. Whether the short nights are late nests, nests left
   for a while or nights with no nest was not read here; it is in the run's receipts.
3. **The two decodes now fail on opposite sides.** The top pick of this recipe is told from the rules downward at
   ten animals (lock-in, stage R11's S2); a draw from the same odds is at the rules' level on three of four movement
   rows at the population unit and fails two viability readouts. Stage R11's offline table says where a draw goes
   wrong: at asks where the rules put 0.99 or more on one option the adapter puts 0.72 on it, 0.90 for a nest at
   dusk or night, so one draw in ten leaves it.
4. **By this stage's own rule the next population run is on the top pick.** The integrator does not launch it
   without a registration of its own: what it would show is known from ten animals. The folder
   `bench-r13/artifacts/r13` (the receipts of 48,034 asks, each with its odds) is kept; reading where the nights and the
   reserves go is the next step and needs no model.

## For the integrator

**Changed by the review of 12 October 2026 (§13); read this before the launch order.**

- **`R13_R11_NUMBERS` must be exported in every shell that starts the model arm**, also when the night script is
  called by hand: the script reads the decode rule from it itself and refuses without it, or when the arm is not
  the one the rule names. The launch order below already exports it.
- **By hand, the model arm takes exactly** `--seed 3613 --arm "$R13_ARM" --days 20 --hours 9` (fewer hours are
  allowed). Other days, another map, burn-in or parameter file, `--no-stop-check`, `--no-contexts` or another
  `--timeout-s` are refused.
- **After an interruption** call `scripts/r13-run.sh model` (or the chain) again and leave `R13_HOURS` unset: the
  script gives the run what is left of its nine hours and closes it when another day would not fit. **After the
  stop check has ended the run the same call does not resume it**; the chain goes on to the rules arm, the control
  arms and the report with the five days.
- **The control arms write seventeen files**: stage R7's sixteen and `rules-plain.json`. In `r13-numbers.md` read §0
  first: "Exact: it does" says the two paths read alike. If it says "not on file" (the control arms were cut short
  after the sixteenth), run `scripts/r13-run.sh controls` again, which adds what is missing, then `report`.
- **For the `IMPLEMENTATION_PLAN.md` block below**, add to its *Status*: "Reviewed by a second agent on 12 October
  (`r13-prereg.md` §13): six amendments before any run (an exact check of the instrument; a row is 'nearer' only
  with stage R7's guards held; only the arm the decode rule names, read by the script itself; the registered world
  and length, nine hours for the whole run; a stopped run stays stopped; D printed as a share of the mean). The
  packet is the one stage R11's frozen kernel builds, byte for byte, on 5,037 decision points of seeds 48 and 7
  and on all 4,539 lines of a two-day run of the script."
- **For the `AGENTS.md` line below**, add: "the model arm needs R13_R11_NUMBERS (the night script reads the decode
  rule itself and refuses another arm, other days or hours, or a resume past a stop check that ended the run);
  `controls` also writes rules-plain.json (stage R7's own reading of the rules world with no salt: the exact check
  of the instrument); `scripts/r13-packet-proof.ts inprocess | wire` compares the bytes sent with stage R11's
  kernel, no model".


*(Written by the builder on 12 October 2026. The frozen checkout must hold this branch's last commit or a merge of
it.)*

**Read first.** (1) Nothing here is a result: the stage registers a run and delivers the script, a report, a run
script and the no-model proofs. (2) The decode is not chosen yet. It is read from stage R11's final table by the rule
of §3, once the chain of stage R11 has ended; at 05:25 EDT on 12 October that table held one training per arm, so
the rule read "N1 not read: the top pick". (3) Seed 3613 has only seen the rules (§12.3). (4) The first population
run was on another adapter, packet, seed and length: nothing here is a comparison with it.

**The launch order.** One model process at a time; from a frozen detached checkout; in a detached `screen` session
(a closed terminal kills a run, `r10-prereg.md` §10.6). Restart the Mac first if swap in use is above 6 GB, or
expect a hold of up to 30 minutes before the model loads.

```sh
# 0. the frozen checkout (a minute)
cd /Volumes/Drive/chimpbench/MGOGO
git worktree add --detach .claude/worktrees/bench-r13 <the head that holds this branch>
cd .claude/worktrees/bench-r13
ln -s /Volumes/Drive/chimpbench/MGOGO/node_modules node_modules
ln -s /Volumes/Drive/chimpbench/MGOGO/data/raw data/raw      # the report's Taï anchor reads it (aggregates only)
git status --short                                            # must print nothing

# 1. the variables (the same in every shell that runs a step)
export MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN
export MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python
export HF_HOME=/Volumes/Drive/chimpbench/hf-cache HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub
export R13_FT_ROOT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r11-honest-retrain/artifacts/decide-ft/r11
# stage R11's table AFTER its second night (the chain's state must read "done"); after `scripts/r11-run.sh publish` and a merge it is docs/staging/r11-numbers.md
export R13_R11_NUMBERS=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r11/artifacts/r11/tables/r11-numbers.md

# 2. the decode, by the rule of §3 (starts nothing): prints the line of the table it read and the arm it names
scripts/r13-run.sh decode
export R13_ARM=<the arm it printed: p5b-s7-draw-1 if N1 is MET for the recipe P5b, else p5b-s7-top>

# 3. the pre-flight (starts nothing): the adapter's hash, the arm, other model processes, the tree, swap, disk
scripts/r13-run.sh check

# 4. everything, with a status file, in a detached session. The line is whole in itself: put the arm of step 2 in it
screen -dmS r13 sh -c 'cd /Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r13 && export MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python HF_HOME=/Volumes/Drive/chimpbench/hf-cache HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub R13_FT_ROOT=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/r11-honest-retrain/artifacts/decide-ft/r11 R13_R11_NUMBERS=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r11/artifacts/r11/tables/r11-numbers.md R13_ARM=<the arm of step 2> && scripts/r13-run.sh chain'

# to watch (reading only)
cat artifacts/r13/chain/state            # running | failed | done
tail artifacts/r13/chain/status.log      # a START and an END line per step, with its exit code
scripts/r13-run.sh status                # the same, and the model run's own status (days done, asks, seconds a call, the stop check)
```

The chain's steps: `00-check`, `01-dry` (no model, three minutes: the whole path on seed 48 against a fake worker),
`10-model`, `11-rules`, `12-controls`, `20-report`; each step's output is `artifacts/r13/chain/<step>.log`. The
steps by hand, which is what the chain runs:

```sh
# the model arm (the only step with a model): at most 20 simulated days in 9 hours; 4 to 8 hours expected
export MGOGO_FT_ROOT="$R13_FT_ROOT" MGOGO_FT_ADAPTERS=r11-p5b-s7
caffeinate -i fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r10-night.ts run --seed 3613 --arm "$R13_ARM" --days 20 --hours 9 --out artifacts/r13/model-s3613
#   (scripts/r13-run.sh model does this, and resumes instead when the folder holds an unfinished run)

# the paired rules arm, N = the whole days the model arm completed (seconds a day, no model)
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r10-night.ts run --seed 3613 --arm rules --packet p5b --days <N> --out artifacts/r13/rules-s3613

# stage R7's sixteen control arms at the population unit on the same burned-in world, the same N days (about a minute an arm at 20 days)
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r10-night.ts controls --seed 3613 --packet p5b --days <N> --out artifacts/r13/card

# the replays, the arm files beside the control arms, the packet check and both reports (no model, some minutes)
scripts/r13-run.sh report
scripts/r13-run.sh publish        # afterwards: copies the four tables to docs/staging; commit them on a branch
```

- **If it stops.** `state` reads `failed` and the last line of `status.log` names the step. A model arm that was
  interrupted or died is continued by `scripts/r13-run.sh model` (it resumes from the newest checkpoint and asks
  nothing twice; *amended by the review, §13 A4: the script counts the hours left itself, `R13_HOURS` can only lower
  them*), then `rules`, `controls`, `report`; or launch `chain` again, which skips the
  dry run and resumes. To stop the model arm on purpose: `kill -TERM` to the script's own process (`status` prints
  its pid). An arm on file is never run again.
- **Healthy first minutes:** "the burned-in world … without the animals' own record is the same burn-in without
  observeV5"; "worker warm: the model answered its first packet in N s"; "worker ready" with `r11-p5b-s7` and the
  hash `582e409a…c74c`; "packet: r11-p5b (p5b)"; "decode: draw (one seeded draw per ask, salt 1)" or "top"; then a
  line every simulated hour and "0 timeouts". A day should take 12 to 25 minutes.
- **If the stop check ends the run after day 5** (exit code 3, state `stopped`; *the review, §13 A5: it is never
  resumed*), the chain goes on: the rules arm,
  the control arms and the report are made for five days, and the report reads "not viable" (§5, §8.1).
- **What comes out:** `artifacts/r13/tables/r13-numbers.md` (the registered statements, in §8's order),
  `r13-card.md` (stage R7's whole card with both runs beside the control arms), `r13-model-replay.md` and
  `r13-rules-replay.md` (the replays through the field observer: party size, grooming, greeting by value). The run
  folders carry this machine's host name and paths: never publish one as it is.

**How to read the result.** `r13-numbers.md` §0 first: if the paired rules arm is told from the re-draws, stop and
find out why. Then §1 (viable or not), §2 (the outcome and what it means, in §8.2's words), §3 (rows that left the
band; "nearer" is a description and never a claim). Name it "rules-taught model on a rules menu", say "animals under
8 years stay on the rules" and "one training of the recipe, one world seed" beside every number.

**Proposed block for `IMPLEMENTATION_PLAN.md`** (after "Stage R11"):

> ## Stage R13: A whole population on the first honest-packet adapter
> **Goal**: the population run stage R10 left open: every animal aged 8 and over on the first adapter of stage R11
> (`r11-p5b-s7`, the whole packet 5, taught the rules' own odds), the gate on, on a world seed nothing has run on,
> beside the same animals on the rules and stage R7's control arms at the population unit.
> **Success Criteria** (registered in `docs/staging/r13-prereg.md` before any code or run): the decode is read from
> stage R11's registered mark N1 by a rule fixed beforehand (a draw from the adapter's odds only if N1 is met for the
> recipe P5b, else the top pick); the run is read in a fixed order: viability (the stop check, deaths by starvation,
> nights in a nest, reserves), then the level on distance, trips begun, trips completed and act changes against the
> rules' mean ± the smallest difference eight re-draws can show on the same world, with the outcome named by rule
> ("at the rules' level", "sedentary", "restless", "mixed"), then the field observer's rows by the distance outside
> the band, where no row is reported as closer to wild chimpanzees; the name "rules-taught model on a rules menu";
> animals under 8 on the rules.
> **Tests**: `tests/r13-population.test.ts` (8 tests); `tests/r10-night.test.ts` and `tests/r10-wiring.test.ts`
> unedited.
> **Status**: Registered and built on branch `r13-population` (12 October 2026; agent-reported, awaiting review);
> **not run, and no model process was started.** *Fixed:* adapter `r11-p5b-s7` (sha256 `582e409a…c74c`), packet
> P5b, world seed 3613 (searched in every tracked file of 177 branch heads, the reserved and retired lists, and the
> names and registries under every `artifacts/` folder: unused), at most 20 simulated days in 9 hours, the stop
> check of stage R10, the paired rules arm and stage R7's sixteen control arms for the same days. *Built:*
> `scripts/r10-night.ts` runs the arms of stage R11's loop by their own names, with the packet, the kernel and the
> decode made by that stage's exported functions; packet 5 runs write receipts of schema `r10-receipt-3` (the packet
> version on every ask line; the journal also carries the decode setting); new refusals (sealed seeds, an adapter
> without its manifest, registered weights with other bytes, an arm of stage R11 on another seed than 3613);
> `controls`, `replay --r7`, `packets` and `rule` commands; `scripts/r13-report.ts` (the registered statements);
> `scripts/r13-run.sh` (the launch order with a status file). *Proved without a model:* the old arm `argmax-gate` on
> seed 48 lands on stage R10's recorded hashes and 6,423 receipt lines, so the old path is unmoved; on seed 3613 a
> rules arm through the script equals the plain rules world (909ec298b1169a33, then 250e63547c2ee49f and
> ec253e94405682e7), and without the animals' own record it is the world without `observeV5`; a stand-in through the
> model path (a fake worker, packet P5b, a draw) is asked 2,235 and 2,304 times a day on seed 48, and killed inside
> day 2 and resumed it ends on the uninterrupted run's hash (119e075380e536ca) with 1,492 journalled answers reused;
> the replay regenerates all 6,606 receipt lines; all 4,539 packets rebuilt by stage R11's builder hash to their
> receipts; the whole reading runs dry in three minutes, with the rules through the night script told from the
> re-draws on no row. Packets: an estimated median of 364 tokens (about 302 real), none over the budget. Projection:
> 12 to 25 minutes a simulated day, so the 20 days are expected in 4 to 8 hours. Nothing under `src/` or `data/`
> changed. *Open:* the run itself (the integrator, after stage R11's chain has ended and its table is read for the
> decode); real token counts; whether one training and one world seed are enough to act on.

**Proposed line for `AGENTS.md`, Commands** (after the `r10-night.ts` line):

```
scripts/r13-run.sh check | decode | dry | model | rules | controls | report | chain | status | publish   # stage R13 (docs/staging/r13-prereg.md; launch order at its end): every animal aged 8 and over on stage R11's first adapter (r11-p5b-s7, packet P5b) on the fresh seed 3613, beside the same animals on the rules and stage R7's sixteen control arms at the population unit on the same burned-in world. Through scripts/r10-night.ts: run --seed 3613 --arm p5b-s7-draw-1 | p5b-s7-top (an arm of stage R11's loop by its own name: adapter, packet and decode are that stage's), run --arm rules --packet p5b, controls --seed N --packet p5b --days N, replay <out> --r7 <dir> (the replay read by stage R7's readers, an arm file beside the control arms), packets <out> (every packet rebuilt from its saved context against the receipt's hash; lengths; the night's projection), rule <r11-numbers.md> (the decode rule: a draw only if stage R11's N1 is met for the recipe P5b), plain --packet p5b. A packet 5 run puts observeV5 1 on the world from the first tick (checked against the plain burn-in) and writes receipts r10-receipt-3; refused: sealed seeds, an adapter without manifest.json, registered weights with other bytes, an arm of stage R11 on another seed. dry: the whole path on seed 48 against a fake worker (no model, three minutes). Then scripts/r13-report.ts prints the registered statements (viability, the level and its outcome, the field rows by the distance outside the band); tables under artifacts/r13/tables until publish
```

**Proposed line for `HANDOFF.md`, next tasks:** "R13: when stage R11's chain reads `done` and its report is
written, the launch order at the end of `docs/staging/r13-prereg.md` from a frozen detached checkout: `decode`
(reads N1 from stage R11's final table), `check`, then `chain` in a detached `screen` session (4 to 8 hours of
model time, one model process). Seed 3613 is spent by that run; name another for whatever follows."

`docs/simulation.md`: **no rows.** The stage adds no parameter and no switch.

**Merge notes.** `scripts/r11-loop.ts` and `scripts/lib/r11-packets.ts` changed only by moving `packetOf` into the
library and exporting three makers (`engineSpec`, `engineKernel`, `workerRefusal`) that the loop itself now calls;
`tests/r11.test.ts` passes unedited. `scripts/lib/r10-run.ts` gains an optional packet for `runDay`, two optional
fields on a journal line and one on an ask line, and optional registry fields; without the packet its lines are
those of `r10-receipt-2`. A run folder of stage R10 (`bench-t1/artifacts/r10/night-s48`) still replays at this
head as far as this stage is concerned.

**Decisions that are the user's or the integrator's.**

1. **Whether to run it as registered once stage R11 has reported**, or to wait for a second training of the
   adapter under the population (nothing here covers the recipe).
2. **The V2 floor of 0.01** (one animal-night in a hundred below the rules' mean when the eight re-draws leave no
   spread). If one lost night in 760 should already count, it must be tightened before the run.
3. **The minimum of nine days** for reading the level, and the cap of 20.
4. **Seed 3613 is spent by this run.** The next sealed pair is still to be named (`r11-prereg.md`, the user's
   decisions, item 1).
5. Whether the swap hold of the night script should become stage R11's (it goes ahead after five minutes when swap
   is not falling).
