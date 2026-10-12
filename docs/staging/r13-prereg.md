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

(Filled after the runs of §10.)

## For the integrator

(Filled at the end of this stage: the launch order, the status file, the block for `IMPLEMENTATION_PLAN.md`.)
