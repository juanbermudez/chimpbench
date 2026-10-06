# RW bench: the test harness of the wild choice benchmark (registration)

Stage RW of Track R, second part. Branch `rw-bench`, from track-e 2137b62. Registered 6 October 2026, **before any code of the harness and before any score through it**. The research part is merged (`docs/staging/rw-prereg.md`, `docs/staging/rw-numbers.md`): the record, the three parts, the sealing rule and the baselines are fixed there and are not changed here.

The user's decision (6 October 2026, `IMPLEMENTATION_PLAN.md`, Track R, item 3), verbatim: "Wild-choice benchmark: go, as a test first. Field labels go into a separate, small, named adapter, not the main label source. Derived packets (never raw rows) may go to an outside model once I name the provider. Mark the five overlapping targets as compromised for field-trained engines. Allow menus wider than 8 for partner choice."

This stage loads no model, trains nothing, runs no simulation and no benchmark of the simulation, and uses no network. No provider has been named, so no packet leaves this computer. The held-out part stays sealed: the flag that opens it is built and is not used.

## 1. What is built

1. **The wild packet**: one choice record in, a kernel request out (`KernelRequest`, `src/kernel/types.ts`) plus the position of the label, with a mask that names every field the data cannot supply.
2. **A scorer**, `scripts/rw-score.ts`: any kernel of R1's interface (sync or async) over a named part.
3. **Kernels run now, on train and development only**: the null kernel of R1 and the registered simple rules wrapped as kernels that read the packet and nothing else.
4. **A GLiNER path**, ready and not exercised: R1's adapter (`scripts/lib/kernels.ts glinerKernel`) with a wild text packet, behind the same command, tested against a fake worker.
5. **The compromised list** (`data/rw-compromised.json`) and a helper for later reports. `data/targets.json` is frozen and is not edited.
6. **A manifest format** for the future field-label adapter (section 8), documented only.

## 2. The wild packet

Input: one eligible record of `scripts/rw-ngogo-choices.ts` (a bout of grooming given by the focal male; the set is the session's party list restricted to the roster, without the focal) and what preceded its decision scan, computed by the parser's own history walk: sessions of earlier days of the open parts, and earlier scans of the same session. Nothing dated at or after the decision scan enters, no other session of the same day, no file other than the scan file (so no membership label, no yearly network, no population snapshot). The packet does not depend on the label.

### 2.1 Options, order and names

- One option per male of the set: `{ action: 'groom', targetId, score: 0, reason: '' }`. Nothing else is on the menu. `rulesIndex` is −1.
- **Order.** The set is first sorted by code (so the order the observer wrote cannot enter), then shuffled (Fisher–Yates) with a generator seeded per record. The observer's order alone scores 0.34 (`rw-prereg.md` §5); after the shuffle "the first option" must score chance (acceptance test).
- **Seeds.** A run has a base seed `S` (default 20261006) and a shuffle number `k` (0 for the primary score). The generator is `mulberry32` (`src/compare/sampling.ts`) seeded with a 32-bit FNV-1a hash of the text `rw-bench-v1:<S>:<k>:<stream>:<session>#<scan>`, with one stream each for the option order (`order`), the names (`names`, which leaves `k` out so names stay fixed across shuffles) and the draw lent to a kernel (`draw`). `S`, the number of shuffles and the generator's name are written with every result.
- **Names.** Per-record pseudonyms from a fixed pool of 80 invented four-letter names (consonant, vowel, consonant, vowel), dealt by the `names` stream to the focal male and the set. An animal has a different name in every record, so no identity or dyad can be memorised. No code appears in a packet.
- **Ids.** The focal is chimp 1; option *i* targets chimp *i* + 2; `social[i]` is the individual of option *i*.
- **Width.** A set holds up to 33 males in the open parts and at most 76 by construction (77 roster males less the focal). The request validation gains explicit limits: `decisionContextError(value, limits)` with the default `{ options: 8, social: 8 }` (today's check, unchanged for every existing caller) and the wide limits `{ options: 76, social: 76 }` passed by the wild builder only. A wild request must also be a partner-choice menu: every option is `groom` at a perceived individual (checked by `wildRequestError`). The simulation's cap of 8 (`src/sim/menu.ts`, `observe()`, the server) does not change.

### 2.2 What the packet says

| part | content | source |
| --- | --- | --- |
| `focal.name` | pseudonym | |
| `focal.sex`, `focal.stage` | male, adult | the dataset's design |
| `focal.community` | Ngogo | the site (public) |
| `environment.partyAdultMales` | set size + 1 | the party list |
| `social[i].name`, `sex`, `stage` | pseudonym, male, adult | |
| `social[i].distance` | 1 (within 2 m) or 3.5 (the 2 to 5 m ring) at the **previous** scan; otherwise masked | `prox2`, `prox5` of the previous scan |
| `social[i].action` | `groom` if he was in a grooming dyad at the previous scan; otherwise masked | `gdyad` of the previous scan |
| `recent` (at most 3 lines; 2 after amendment A1) | `Last scan: groomed by A, B; I groomed C` · `Last scan: within 2 m: A; 2 to 5 m: B` (dropped, A1) · `Earlier this hour: I groomed A; groomed by B` (bouts of this session that ended before the previous scan, most recent first) | earlier scans of the session |
| `history` (at most 3 lines) | `Groomed with, most first: A, B=C, D` (bouts in either direction) · `I groomed, most first: …` (bouts given) · `Often near me, most first: …` (scans within 5 m) | earlier days of the open parts plus earlier scans of the session |
| `candidates` | the options of 2.1 | |

- History is written as **ranks, never counts** (`rw-prereg.md` §2): names in falling order, `=` between ties, `, ` between ranks; a male with a count of zero is not listed. Only members of the set are named (others have no name in the packet).
- **Limits kept.** `recent` lines hold at most 160 characters and `history` lines 120, as the validation demands. A line that would be longer is cut at the last whole rank that fits and ends with `, others`; if even its first rank does not fit, as many names of it as fit are kept. The number of records with a cut line is reported per part. A kernel must read an unlisted male as "below every listed one".
- Proximity at the decision scan is the answer (0.97 of partners are within 2 m then) and never enters.

### 2.3 The mask

The data cannot supply most of `DecisionContext`. Each such field holds a **neutral value** that passes the validation, and is named in a **mask** carried beside the context: `request.mask` on a `WildRequest` (which extends `KernelRequest`; nothing in `src/kernel` changes). A kernel or a serializer must ignore a masked field; the wild serializer leaves it out. `wildRequestError` checks that every masked field holds its neutral value, so nothing can leak through one.

| masked | neutral value |
| --- | --- |
| `time`, `version`, `stimuli` | 0, 0, none |
| focal: `ageYears`; `rankOrder`, `rankOf`, `isAlpha`; `hunger`, `thirst`, `energy`, `social`, `stress`, `health`, `injury`; `carryingMeat`; `currentAction`; `mood`; `personality`; `skills` | 20; 0, 0, false; 0, 0, 1, 1, 0, 1, 0; 0; `rest`; `calm`; 0.5 each; 0.5 each |
| environment: `hour`, `phase`, `weather`, `rain`, `temperature`, `fruitNearby`, `partySize`, `nearTerritoryEdge`, `strangersSeen`, `strangersHeard` | 12, `day`, `clear`, 0, 25, 0, the number of adult males (a lower bound), false, 0, 0 |
| every individual: `relation`, `ageYears`, `rankOrder`, `isAlpha`, `bond`, `injured`, `hasMeat`; `tension` | `community`, 20, 0, false, 0, false, false; left out |
| an individual not listed near at the previous scan (or no previous scan, or no proximity written): `distance` | 10 |
| an individual in no grooming dyad at the previous scan: `action` | `rest` |
| every option: `score`, `reason` | 0, empty |
| `body`, `light`, option `value` | absent |

Not masked because known from sex: `swelling` 0, `lactating` false, `hasDependentInfant` false. `relation` is masked although every male is of the community: the value must not be read as "not kin". `bond` stays masked (`rw-prereg.md` §7: a derived value would be our function); social history is in the `history` lines instead.

### 2.4 The text packet for GLiNER

`scripts/lib/rw-serialize.ts buildWildQuestion(request)` writes the worker's packet from the request and its mask: `me` (name, adult male, community), `now` (the number of adult males in the party), `nearby` (one line for each individual with an unmasked distance or action, in coarse words: "within 2 m", "2 to 5 m", "grooming"), `memories` (`recent`), `history`; the instructions and the option text are the serving path's own (`actionInstructions`, `optionText` of `server/decide.ts`), so no new wording is introduced. No masked field appears. The HTTP request path (`httpKernel`) sends the context alone and its server cannot see the mask, so it is **not** a wild path.

## 3. Scores

Every answer first passes R1's answer check (`readAnswer`: a probability per option, a position on the menu). An answer that fails it, or a kernel that throws, is a **miss** and is counted as refused (there are no rules to fall back on here).

- **Top-1 accuracy (primary):** the share of records whose answered option names the partner.
- **Top-1 with ties split:** the share of the highest-probability options that name the partner, averaged over records. For a rule that names a tied set this is the registered "expected top-1, ties split evenly" of `rw-numbers.md`; for a model it equals the primary score unless probabilities tie.
- **Mean reciprocal rank:** options ranked by probability; the expected reciprocal rank of the partner under random order within ties.
- **Log loss:** the mean of −ln(probability of the partner), probabilities floored at 1e-9, reported only for kernels whose probabilities are declared a distribution (the null kernel, GLiNER; not the rules, whose probabilities only rank).
- **Chance:** the mean of 1 / set size; every accuracy is also given minus chance.
- **Uncertainty:** 95% percentile intervals from a cluster bootstrap over **focal males** (2,000 draws, seed 20261006, the parser's own scheme, so intervals of the same per-record values are identical to `rw-numbers.md`). The mean of the males' own accuracies is given beside the pooled figure.
- **By choice-set size:** 2 to 4, 5 to 8, 9 to 16, 17 and over; and 8 or fewer against more than 8.
- **By what preceded** (fresh, continuation, unknown) and, in development, by stratum (unseen animals; seen animals in 2014–2015).
- **Option-order sensitivity:** the same records under 5 shuffles (`k` = 0 to 4). Reported: top-1 per shuffle, its range, the share of records where the same male is answered under all 5, and the mean relative position of the answered option (0 first, 1 last; 0.5 when position does not matter).

## 4. The sealed part

`scripts/rw-score.ts --part held-out` refuses unless given `--open-sealed <reason>`. With the flag it appends a line (date, reason, kernels, commit) to `docs/staging/rw-sealed-log.md` **before** any held-out outcome is read. Without it the held-out rows are blanked at load, as in the parser. When opened, records get history from all earlier sessions, and with `--history open` from train and development sessions only (`rw-prereg.md` §2). **The flag is not used in this stage.**

## 5. Kernels run now

| kernel | what it does | must give |
| --- | --- | --- |
| null (`src/kernel/kernels.ts nullKernel`) | uniform over the menu, one draw from the loop | chance within sampling error: 0.171 train, 0.168 development; ties-split exactly chance |
| most frequent past partner, grooming given | the first rank of "I groomed, most first" | 0.389 (0.337 to 0.448) train; 0.438 (0.357 to 0.493) development |
| most frequent past partner, either direction | the first rank of "Groomed with, most first" | 0.389 (0.337 to 0.450); 0.434 (0.355 to 0.489) |
| nearest at the previous scan | the nearest unmasked distance step | 0.314 (0.282 to 0.352); 0.310 (0.256 to 0.377) |
| stack | groomed me at the last scan, then nearest, then past partner (either direction) | 0.452 (0.399 to 0.511); 0.487 (0.416 to 0.548) |

The rule kernels read the request only. Their ties-split score must equal the registered figure to three decimals with the same interval; a difference must be traced to records with a cut history line (2.2) and reported with their number. Their answered option is a draw from the tied set, so their primary top-1 matches only within sampling error.

**The simulation's rules kernel is not scored.** It reads the live animal (`env.live`, R1 decision D3) and its packet-only form picks the highest rules score on the menu, which is masked here. No world is faked for it; the stack is its wild counterpart (`rw-prereg.md` §7 point 5).

## 6. Packet sizes

For every record of the part: characters of the request (JSON) and of the text packet, and the server's token estimate (`estimateInputTokens`, fitted on packets of at most 8 options, so extrapolated here), against the worker's hard limit of 1,280 tokens and a registered budget of 1,200 on the estimate. If no tokenizer can be run offline without a download or a read outside the project, real token counts are not reported. The GLiNER path refuses a packet over the budget (a miss, counted). How to handle such records is proposed in the results, not built.

## 7. Compromised targets

`data/rw-compromised.json`: label source "field choices, Ngogo male grooming"; T-SOC-1, T-SOC-2, T-FIS-1, T-FIS-3, T-FIS-5, each with its reason from `rw-prereg.md` §9. `src/rw/compromised.ts`: for a kernel whose manifest names that label source, which target ids are compromised, and a function that flags scorecard rows. A kernel only scored on RW is not marked by it.

## 8. Manifest of a field-label adapter (format only; nothing is trained)

```json
{
  "name": "ngogo-groom-v0",
  "kind": "adapter",
  "baseModel": "GLiNER2.5-Decide <revision>",
  "labelSources": ["field choices, Ngogo male grooming"],
  "part": "train",
  "records": 977,
  "recordIdsHash": "<sha256 of the sorted record keys session#scan, one per line>",
  "splitRuleHash": "<sha256 of the split rule text (PART_RULE of scripts/rw-ngogo-choices.ts)>",
  "packet": { "version": "rw-bench-v1", "seed": 20261006, "shuffles": [0] },
  "created": "<date>", "commit": "<commit>"
}
```

Rules: one label source per adapter unless the manifest lists every one; `part` is `train` and never `held-out`; the two hashes are the ones `scripts/rw-score.ts` prints for the part; a report that scores the adapter on the field scorecard calls the helper of section 7 with this manifest. The hashes are fingerprints: no record key is committed.

## 9. Acceptance tests (`tests/rw-bench.test.ts`, synthetic records only)

1. The validation's default limits are today's; the wide limits admit a wide partner-choice menu and nothing else changes. A wild request of 8 or fewer passes the default check too.
2. A wild request passes `decisionContextError` (wide limits) and `wildRequestError`; every masked field holds its neutral value; changing a masked field is caught.
3. The packet holds no code, no date, no year and no session id; it is identical when only the written order of the party changes, when anything at or after the decision scan changes (later scans, later days, other sessions of the same day) and when the label changes.
4. The order is a pure function of (seed, shuffle, record); shuffles differ; "always the first option" scores chance on many synthetic records.
5. Metrics on hand-made answers: ties, reciprocal rank, log loss, a failed answer check, a throwing kernel, an async kernel. The bootstrap resamples animals.
6. The null kernel gives chance; the rule kernels give the parser's own expected hits record by record on synthetic sessions, read from the packet alone.
7. A cut history line is cut at a whole rank, stays within the limit and is counted.
8. The sealed part is refused without the flag; with it a log line is written first (a temporary log); a default load has blank held-out outcomes.
9. The GLiNER path on a fake worker: the text packet names no masked field; a packet over the budget is refused and never sent.
10. The compromised helper: the five ids for a field-trained manifest, none otherwise; `data/targets.json` is not touched.

Also: `tsc --noEmit -p .`, `gen-params --check`, the goldens and the field pin unchanged, one full `pnpm test` at the end.

## 10. Not built

The simulation's rules on wild records; any outside model or provider; real token counts if no offline tokenizer; a simulated packet cut to the wild fields (R2's "RW view"); training; opening the sealed part.

## 11. Amendments (each written before the code it covers, and before any score)

**A1 (6 October 2026, before any packet was built from a field record). The proximity memory line is dropped.** Section 2.2 listed a `recent` line "Last scan: within 2 m: …; 2 to 5 m: …". The same fact is already in `social[i].distance`, and the serving path's own finding is that a partner described twice is favoured (`server/decide.ts optionParts`). So `recent` holds at most 2 lines (the grooming of the last scan; earlier bouts of the hour), and nearness at the last scan is carried by `distance` alone; the text packets print it once, on the individual's line, as "within 2 m at the last scan" or "2 to 5 m at the last scan".

**A2 (6 October 2026, relayed by the integrator; before any code of this kernel). A Codex kernel, built and not run.** The integrator relayed the user's naming of the outside general model: "you can use the local version of codex on my computer." The harness gains a `codex` kernel behind R1's async interface. **This stage sends nothing to it:** it is tested against a fake executable only, and the real binary is not run. The integrator runs the pilot on the development part after reading the serializer.

- *Call.* `codex exec --sandbox read-only --skip-git-repo-check --ephemeral -C <empty scratch directory> --output-schema <schema.json> -o <out.json> [-m <model>] [-c model_reasoning_effort=<effort>] "<prompt>"`, standard input closed, no shell. One call at a time. Options: the binary, the model, the reasoning effort, the batch size, a timeout per call, and a gate as for Jev (an explicit approval flag and a cap on calls; refused without both).
- *What the prompt contains* (`scripts/lib/rw-serialize.ts buildCodexPrompt`, beside the GLiNER serializer): a fixed instruction, then per case the lines of the GLiNER text packet's state and nothing more — `me` (pseudonym, adult male, the community's name), `now` (the number of adult males in the party), `nearby` (individuals with an unmasked distance or action, in the same coarse words), `memories` (`recent`), `history` — and the options as numbered lines "Groom <pseudonym>". It contains no code, no date, no year, no session or record key, no raw field, no count and no masked field. The instruction states only the task (he now grooms one of the listed males; choose for each case from that case alone; names are dealt afresh per case; the option order is random) and the answer format. It adds no fact about the animals or the protocol that the packet does not hold.
- *Answer.* The schema forces `{"choices":[{"case":<number>,"choice":<option number>}]}`, one entry per case. Each case is validated on its own: a whole number inside that case's menu becomes an R1 answer (the position, and a probability of 1 on it and 0 elsewhere, so log loss is not reported and the reciprocal rank is that of a single pick), which then passes `readAnswer` like every kernel's; anything else is a refused answer for that case only. A timeout or an unreadable output refuses every case of the call.
- *Batches.* Several packets may share one prompt (batch size 1 by default). Cases in a batch are not independent calls; the batch size is written with every result.
- *Accounting.* Per call: seconds, tokens as the tool reports them (read from its output; null when it reports none), the prompt's characters, the number of cases. Prompts and raw answers go to `artifacts/` only.
- *Pilot.* `--limit N` scores a seeded sample of N records of the part (stream `sample` of the base seed), not the first N, which would all be early years.
- *Tests* (fake executable only): a well-formed batch, a malformed entry (that case alone refused), a timeout (every case refused, the process killed), the gate, the exact argument list, standard input closed.

## 12. Results (6 October 2026; train and development only; no model, no network, the sealed part not opened)

Numbers are copied from `docs/staging/rw-bench-numbers.md`, which `scripts/rw-score.ts --md` writes (aggregates only). If the two disagree, the generated file is right.

**What the harness scores today.** Any kernel of R1's interface, sync or async, on the 977 training and 448 development choices, through a request that passes `decisionContextError` (wide limits) and its own mask check. Run now: the null kernel and the registered rules as packet-only kernels.

| kernel | train (977 records, 34 males) | development (448 records, 30 males) | registered figure |
| --- | --- | --- | --- |
| null, answered option | 0.182 (0.160 to 0.204) | 0.179 (0.125 to 0.226) | chance 0.171 and 0.168: inside both intervals |
| null, ties split | 0.171 (0.160 to 0.183) | 0.168 (0.151 to 0.180) | reproduced exactly |
| most frequent past partner, grooming given | 0.389 (0.337 to 0.448) | 0.438 (0.357 to 0.493) | reproduced exactly, with its interval |
| most frequent past partner, either direction | 0.389 (0.337 to 0.450) | 0.434 (0.355 to 0.489) | reproduced exactly |
| nearest at the previous scan | 0.314 (0.282 to 0.352) | 0.310 (0.256 to 0.377) | reproduced exactly |
| stack | 0.452 (0.399 to 0.511) | 0.487 (0.416 to 0.548) | reproduced exactly |
| also: the male grooming him; most frequent past neighbour | 0.283; 0.347 | 0.261; 0.436 | reproduced exactly |

- The rule kernels' figures are top-1 with ties split, the registration's definition; they match the parser's value on every record (0 records differ in either part), so the packet holds everything the rules use. Their answered option is one draw from the tied set and lands within about 0.015 of it (stack: 0.454 in train, 0.487 in development).
- **Cut lines.** 45 training and 44 development records have a history line cut to 120 characters. None of them changes a rule's answer here: a cut removes the lowest ranks, and could change the stack's answer only when its tie falls among them. A model reading the packet does lose those ranks on about 5 and 10% of records.
- **Order.** "Always the first option" scores 0.174 (0.147 to 0.200) in train and 0.147 (0.120 to 0.174) in development: chance. The observer's order scored 0.339 and 0.344. Under five shuffles the rules' top-1 moves by 0.003 to 0.025 (only their tie draws change), the mean relative position of their answers is 0.49 to 0.51, and the stack answers the same male under all five on 0.93 and 0.95 of records.
- **By set size** (stack, ties split): 0.509 on sets of 8 or fewer and 0.370 on larger ones in train; 0.550 and 0.405 in development. The wide menus are the harder half, so cutting the benchmark to 8 would have flattered every kernel.
- **Log loss** exists for the null kernel only (1.978 train, 2.019 development: the mean of ln set size). The rules' probabilities only rank.

**Packet sizes.** No tokenizer could be run offline: none is in a cache outside the project, the system Python has no tokenizer library, and the worker's own environment is under a directory this stage may not read. So sizes are characters, with the server's estimate for tokens (fitted on packets of at most 8 options; extrapolated here).

| development, shuffle 0 | median | 90th percentile | largest |
| --- | --- | --- | --- |
| options | 8 | 21 | 33 |
| GLiNER text packet, characters | 1,109 | 1,999 | 2,754 |
| GLiNER text packet, estimated tokens | 249 | 463 | 664 |
| Codex prompt, characters per case | 430 | 752 | 1,012 |

- **Development records over the worker's 1,280-token limit: 0 by the estimate, and 0 even if the estimate were low by half** (largest 664; training largest 655). 4 development and 5 training records exceed 613, the serving path's latency budget, which matters for speed only.
- A set of 76, possible in the sealed part, would be about 1,350 by the same arithmetic (about 14 tokens an option). **Proposal, not built:** first drop the purpose words every option repeats ("eases loneliness, strengthens the bond": about 9 tokens an option, and identical for all, so no information is lost); if a packet is still over, split the set into sub-menus of at most 24 dealt by the record's seed, ask once per sub-menu and once among the winners, and score the final answer. Either rule would be registered before the sealed part is opened. Real token counts need the worker's tokenizer: `--packets` writes the requests to `artifacts/` for that.

**The Codex kernel (amendment A2): built, tested against a fake executable, never run.** Nothing was sent. From the measured prompt sizes (development: 208,333 characters of cases in all, about 60,000 tokens at 3.5 characters a token; the instruction is about 200 tokens a call) and the integrator's one measurement (20,577 tokens and 8.8 s for a one-line question at the default model and effort), the full development part under one shuffle would take about:

| batch size | calls | tokens (overhead + cases) | time at 8.8 s a call |
| --- | --- | --- | --- |
| 1 | 448 | about 9.4 million | 66 minutes or more |
| 8 | 56 | about 1.2 million | 8 minutes or more |
| 16 | 28 | about 0.65 million | 4 minutes or more |

These are floors: reasoning tokens grow with the number of cases and are unknown until the pilot. Almost all of the cost is the per-call overhead, so batching and a lower reasoning effort decide it. How the tool reports tokens is assumed ("tokens used", then a number) and is checked only against the fake.

**Acceptance tests.** `tests/rw-bench.test.ts`: 16 tests, 16 pass (synthetic records; fake worker; fake Codex executable). Section 9's ten items are covered by tests 1 to 13 and 16; amendment A2 by tests 14 and 15. Full `pnpm test`, run once at the end (1-minute load 19.3 at the start): 986 tests, 985 pass, 0 fail, 1 skipped (the stand-in artifact absent from the worktree, as before); 970 before this stage. `tsc --noEmit -p .` and `gen-params --check` clean; the goldens and the field pin did not move.

**Deviations and limits, stated.**
- Amendments A1 and A2 (section 11), both before the code they cover.
- `scripts/rw-ngogo-choices.ts` gained a hook that hands each eligible record's history to a caller, and its preparation step became a function. `rw-numbers.md` regenerates byte for byte.
- The mask lives on `WildRequest`, beside the context, not inside it; `src/kernel/*` is unchanged. A kernel that reads only `request.context` (the HTTP request path, the stand-in's features) sees neutral values as if they were facts, so only the wild text serializers and the rule kernels are wild paths today. R2 should adopt this mask or replace it.
- The GLiNER text packet says of a male who groomed the focal both "grooming at the last scan" (his line) and "groomed by" (the memory line). The registration asked for both fields; the serving path's finding that a twice-described partner is favoured applies, and is a thing to test when the model is first run.
- `--limit N` (a seeded sample) was added for pilots.
- The GLiNER worker's default interpreter path is the existing harness's (`scripts/ft-society.ts`); `--kernels gliner` refuses without `--load-model` and was not run.

**Not built.** The simulation's rules on wild records (they read the live animal; no world was faked). Real token counts. A simulated packet cut to the wild fields (R2). Any training. The second held-out score is built (`--history open`) and tested on synthetic rows only. The sealed part was not opened: `docs/staging/rw-sealed-log.md` has no entry.

**Decisions for the user.**
1. Whether the Codex pilot goes ahead as relayed, with which model, reasoning effort, batch size and cap on calls. Suggested pilot: 16 development records in two calls of 8.
2. Whether the first GLiNER run on development (local, untuned) may load the model, and whether real token counts may be taken with the worker's tokenizer first.
3. Whether the wide-menu rule for the sealed part (drop the repeated purpose words; split above the limit) is accepted, or sets over a size are reported apart.
4. Whether a cut history line is acceptable (5 to 10% of records lose their lowest ranks) or the validation's line limits should widen for wild packets too.

## Privacy

Packets, per-record outputs and record keys go to `artifacts/rw/` (gitignored). Committed: code, this file, the generated aggregate table (`docs/staging/rw-bench-numbers.md`: counts and rates only), the compromised list. Tests use synthetic records.

## 13. Integrator's entries (6 October 2026)

**A3. Codex pilot, as run (07:55).** The serializer was read first (`scripts/lib/rw-serialize.ts`: pseudonyms dealt per
case, nearness and grooming at the last scan, memory and history lines, numbered options; no raw row, no date, no
individual code). Command: `rw-score.ts --part development --kernels stack,codex --limit 16 --codex-approved
--codex-max-calls 2 --codex-batch 8 --codex-effort low`. Result, 16 development records from 8 males: Codex top-1 0.438
(7 of 16), the three-rule stack 0.438 (7 of 16); nothing can be read from 16 records. Cost: 2 calls, 44,361 tokens,
33 seconds: about 22,000 tokens a call whatever the batch, so the tool's fixed overhead dominates. Model as the tool
reported it on this computer today: gpt-6.1-sol (provider openai).

**A4. Registered before it runs: Codex on the whole development part.** 448 records, `--codex-batch 8
--codex-effort low`, the tool's default model, one shuffle (seed as the harness sets it), at most 60 calls; beside the
null kernel and the three registered rules on the same records and shuffle. Expected cost from A3: 56 calls, about
1.25 million tokens, about 15 minutes. Readouts: top-1 with its bootstrap interval over focal males, by choice-set
size and by what preceded the bout, and the paired difference against the stack on the same records (records where
exactly one of the two is right, with a sign test). It is called a difference only if the interval of the paired
difference excludes 0; the registered resolution of this part is about 0.07. The sealed part stays sealed. This is the
general-model arm before any tuning of the prompt: the prompt is not changed after seeing this result without a new
entry here.

**A5. Result of A4 (6 October 2026; numbers from `artifacts/rw/codex-dev/summary-development.json` and `paired.txt`,
both written by scripts).** The first launch named a kernel the scorer does not have (`past`) and exited before any
call; the run below used `--kernels null,past-given,nearest,stack,codex`, otherwise as registered. 448 development
records from 30 focal males, one shuffle.

| kernel | top-1 (95% interval, bootstrap over males) |
| --- | --- |
| null (random) | 0.179 (0.125 to 0.226) |
| nearest at the last scan | 0.315 (0.242 to 0.381) |
| most frequent past partner | 0.433 (0.345 to 0.488) |
| the three-rule stack | 0.487 (0.418 to 0.545) |
| Codex (gpt-6.1-sol as reported by the tool, effort low, batches of 8) | 0.493 (0.424 to 0.556) |

Paired, on the same records: both right 202, only Codex 19, only the stack 16, neither 211; sign test on the 35
discordant records p = 0.74; Codex minus the stack +0.007 (−0.011 to +0.029). **By the registered rule this is no
difference.** Codex picks the same male as the stack in 388 of 448 records (0.87). Cost: 56 calls, 928,163 tokens, 575
seconds; no refusal, no malformed answer.

What it shows and does not: a general model given this packet does what three simple rules do, so on this benchmark
the limit is what the packet carries (who groomed me, who was near, whom I groomed before), not the kernel reading it.
It does not show that a general model cannot do better with rank, kinship, age or body state, none of which these
records hold. For the stages that follow: 0.49 is the mark an engine must reach to equal a general model here, a small
engine cannot be shown to beat a general one on this part, and the benchmark separates engines only below that mark
(an untuned engine against 0.18 chance and 0.49).

**A6. Registered before it runs: untuned GLiNER2.5-Decide on the development part (6 October 2026).** The model
runtime is now on this computer (HANDOFF.md §3 item 3: the base model at revision 7ee5da4c, the worker's identity check
passes, `verify-browser.mjs` 20 of 20). Command: `rw-score.ts --part development --kernels null,stack,gliner
--load-model --adapter base --device mps` with the environment variables of HANDOFF.md, the harness's default five
shuffles and seed, out `artifacts/rw/gliner-dev`. The packet is the serving path's own text packet (§2.4): its
instructions were written for menus of at most 8 options and 253 of the 448 records have more, so results are read by
set size as well as overall. Readouts: top-1 (answered option and ties split), mean reciprocal rank and log loss from
the model's scores, the interval over focal males, by set size and by what preceded the bout, the option-order check
(the same male under every shuffle; answers on the first option), and the paired difference against the stack and
against the null kernel on the same records. Marks fixed by A5: chance 0.18, the stack 0.49 (Codex 0.49). Prediction
(integrator, low confidence): between chance and "nearest" (0.18 to 0.32), worse above 8 options, with some
sensitivity to option order. Nothing is tuned from this result; it is the untuned engine's starting point for R4.

**A7. Result of A6 (6 October 2026; numbers from `artifacts/rw/gliner-dev/summary-development.json` and
`paired.txt`, written by scripts).** Untuned GLiNER2.5-Decide (base, mps), 448 development records from 30 males. The
model kernel ran one shuffle (the rule kernels five), so no option-order figure exists for it yet. Three records were
refused, all with 33 options, and count as wrong.

| | all 448 | 8 or fewer options (253) | more than 8 (195) | 17 and over (60) |
| --- | --- | --- | --- | --- |
| null (random) | 0.179 | 0.237 | 0.103 | 0.033 |
| the three-rule stack | 0.487 | 0.542 | 0.415 | 0.350 |
| Codex (A5, another shuffle) | 0.493 | 0.573 | | |
| untuned GLiNER | 0.373 (0.308 to 0.438) | 0.522 | 0.179 | 0.033 |

Paired on the same records: GLiNER minus the stack −0.114 (−0.146 to −0.072) over all records; **−0.020 (−0.083 to
+0.055; sign test p = 0.60) on menus of 8 or fewer, no difference by the registered rule; −0.236 (−0.293 to −0.172) on
wider menus**, where it falls to chance at 17 and over. GLiNER minus the null kernel +0.194 (+0.127 to +0.276).
Against Codex on menus of 8 or fewer (same records, different shuffles): −0.051 (−0.102 to +0.014), no difference.

Against the prediction: wrong on the level (0.37, above the predicted 0.18 to 0.32), right that wide menus hurt.
What it shows: on menus of the size it was built for, the untuned small model reads this packet about as well as the
rules and the general model; its deficit on this benchmark is entirely the menu width. What it does not show: anything
about body state or feeding, which these records do not hold. For R4 the measurable target on this benchmark is
therefore the wide menus (0.18 against the stack's 0.42), by training or by splitting a wide set into rounds of 8.

## 14. Amendment A8: fanning a wide menu out to a kernel built for 8 (registered 6 October 2026, before its code and before any model run through it)

**Why.** A7: untuned GLiNER2.5-Decide equals the three-rule stack on menus of 8 or fewer (0.522 against 0.542) and falls to chance on wider ones (0.179 against 0.415; 0.033 from 17 options up; three 33-option records refused). The user (relayed by the integrator): "why dont you install the jev skill, some of the techniqies could be applied to glineer like dfanning out but explore their docs to help you". The skill card was not available; TypeSafe's public documentation and the project's own Jev design notes were read and entered in `docs/research.md` ("Engineering sources: answering a wide menu with a narrow kernel") before this entry. Techniques only: no call to Jev, no key, no Jev output as a label. One thing the reading showed and is stated here: Jev's own documentation tells callers to give Jev the full list (up to 255 options); level-by-level choice with a beam, and one score per candidate, are its answers for hierarchies and re-ranking. Splitting a flat menu is therefore this project's answer to a kernel whose packet and training stop at 8, not a Jev recommendation.

### 14.1 The wrapper

`fanOutKernel(inner, variant)` (`src/kernel/fanout.ts`) is itself a kernel of R1's interface: a request in, one option position and a probability per option out. It knows nothing of the inner kernel but that interface, holds no state, and takes every random draw from the loop (`env.random`), so a run is fixed by the run's seed, shuffle number and record. A menu of **8 or fewer is passed through unchanged, in one call**: on such records every variant is the plain kernel by construction.

- **Groups.** The options still in play are shuffled (Fisher–Yates on the loop's draw) and dealt into ⌈m / 8⌉ groups whose sizes differ by at most one (so no group is a leftover of one). Each group is one sub-menu, asked once, in the dealt order. The seed and shuffle are the run's, written with every result.
- **The sub-request** is a valid request of the same kind with only the group's options. For a wild packet (`narrowWildRequest`, `src/rw/packet.ts`): the focal male and the party size unchanged; `social` and the options are the group's males, renumbered; the mask follows them; each memory and history line keeps only the group's males, in the same order and with the same ties, and a line left empty is dropped. It passes `wildRequestError` like any wild request. So a sub-packet has the shape of the packets the kernel handles at 8 or fewer, and says nothing about males who are not options in it (the documentation's advice against state unrelated to the question). The alternative, the full lines with a subset of options, is not run. For any other request the default keeps the context and cuts `candidates` and `options` to the group.
- **Reading a group's answer.** The answer passes R1's answer check. Options are ranked by the kernel's probability, the answered option first; a remaining tie goes to the earlier place in the dealt group, which is random.
- **Refusals.** A sub-call that throws or fails the answer check refuses the whole record: a miss, counted. No sub-menu is filled in by chance.
- **Sub-calls are independent**: within a round they may be asked at once; each gets its own draw stream seeded from the loop's draw before any is asked.

**Three variants; `fan2` is primary.**

| variant | rule | kernel calls for a menu of n |
| --- | --- | --- |
| **`fan2` (primary)** | rounds: every group sends its best 2 forward; repeat until 8 or fewer remain; then one final choice among them | 9–16: 3; 17–24: 4; 25–32: 5; 33: 8 (5 groups, then 2, then the final); 76: 14 |
| `fan1` | the same, every group sends its best 1 forward | 9–16: 3; 17–24: 4; 25–32: 5; 33: 6; 76: 13 (corrected with the code: 10 groups, then 2, then the final; the first entry said 12, an arithmetic slip) |
| `pool3` | no rounds and no final: three independent deals of the whole menu into groups; a male's score in a group is his probability times the group's size (1 is an even share); his score is the mean over the three deals; the highest score is the answer (a tie goes to the earlier option of the request) | 3 × ⌈n / 8⌉: 9–16: 6; 17–24: 9; 25–32: 12; 33: 15 |

- **The answer.** `fan2`, `fan1`: the final call's pick; its finalists carry the final call's probabilities and every other option 0. `pool3`: the scores, scaled to sum to 1. Log loss is not reported for a fanned-out kernel (its probabilities are not a distribution over the menu). The answer also carries the number of calls made and, as **confidence**, the top probability of the final call (`pool3`: the top scaled score).
- Why 2 as primary: a group round is the plain kernel on a menu of 5 to 8, where its first choice is right about half the time (A7); keeping one loses the partner in the first round about half the time, keeping two gives the final round a chance to correct it. `fan1` is the cheaper control; `pool3` asks whether scores from different groups can be compared at all.

### 14.2 Confidence-gated routing (a separate readout; no extra model call)

For a model kernel K and the three-rule stack on the same records and shuffle: the routed answer is K's when K's confidence is at least t, otherwise the stack's; a refused record routes to the stack. Two thresholds, both fixed before the development part is read: **t = 0.6** (the floor in the documentation's example) and **t\*** chosen on the **training part only**, the value on the grid 0, 0.05, …, 1 that maximises the routed top-1 there (a tie goes to the smaller t, the least routing; t = 0 never routes, t = 1 nearly always). Reported on development for plain GLiNER and for `fan2`: routed top-1 with its interval, the share of records routed, and the paired differences against the stack and against K unrouted. A t\* of 0 or 1 is a finding (routing adds nothing, or the kernel adds nothing), not a failure of the readout.

### 14.3 The runs (untuned GLiNER2.5-Decide, adapter `base`, `mps`; train and development only; the sealed part stays sealed; no Codex; nothing leaves this computer)

- One model process. Before loading: `sysctl -n vm.swapusage` and `uptime`, written into the results.
- Sub-requests reach the worker through its own batch path, up to 16 packets a batch, and an identical text packet is sent once per run and its answer reused; calls are counted as asked, not as sent. **Check:** plain GLiNER on development, shuffle 0, must give A7's 0.373 (0.522 at 8 or fewer, 0.179 above; three refusals). If it does not, batches are set to 1 and the difference is reported.
- Development (448 records): plain, `fan2`, `fan1`, `pool3` at shuffle 0; plain and `fan2` also at shuffles 1 and 2 (the option-order check GLiNER lacks). Training (977 records): plain and `fan2` at shuffle 0 (a second sample, and the routing threshold). The null kernel and the stack on the same records and shuffles.
- Expected cost (arithmetic from 14.1 and the set sizes): about 3,000 kernel calls on development at shuffle 0, about 2,500 for its two further shuffles, about 2,500 on training; at 1 s a call unbatched, about two hours.

### 14.4 Readouts and the rule for calling a difference

Numbers are written by `scripts/rw-fanout-report.ts` from the per-record outputs (aggregates only in git: `docs/staging/rw-fanout-numbers.md`).

- Top-1 of the answered option, with the 95% interval over focal males, for plain GLiNER, each variant, the stack and the null kernel: all records; 8 or fewer; more than 8; 9 to 16; 17 and over.
- **Primary comparison (development, menus of more than 8, shuffle 0): `fan2` minus plain GLiNER, and `fan2` minus the stack**, paired on the same records: the mean difference with a 95% interval from the same cluster bootstrap over focal males (2,000 draws, seed 20261006), the discordant counts and a two-sided sign test. **A difference is called one only if the paired interval excludes 0.** The same two comparisons on the training part are a second sample, reported beside it, not pooled.
- Secondary, same form: `fan1` and `pool3` against plain and against `fan2`; `fan2` against the stack over all records.
- Kernel calls per record (mean, by set size, largest), seconds per record and per call (wall time of the run over its records and calls; the machine is shared, so these are upper bounds).
- Routing (14.2). Order sensitivity for plain and `fan2`: top-1 per shuffle and its range, the share of records with the same male answered under all three shuffles, the mean relative position of the answer, answers on the first option against expectation.
- "Closes the gap" means: on development menus of more than 8, `fan2` is above plain GLiNER by the rule above **and** its paired interval against the stack includes 0. Above plain but below the stack is "narrows"; neither is "does not help".

**Prediction (mine, low confidence):** `fan2` reaches 0.28 to 0.36 on development menus of more than 8: above plain (0.18), below the stack (0.42); `fan1` a few points lower; `pool3` no better than `fan1`; routing at t\* lands within 0.02 of the stack.

### 14.5 Tests (`tests/rw-fanout.test.ts`; synthetic records and fake kernels only)

A kernel that is right whenever the partner is on its sub-menu is right through every variant, for sets of 9 to 76; a kernel that ranks him second in group rounds is right through `fan2` and wrong through `fan1`. Call counts as in the table. Every sub-request is a valid wild request of at most 8 options whose lines name only its own males; every option is in exactly one group per round and group sizes differ by at most one. The same seed gives the same groups and answer; another shuffle gives other groups. A menu of 8 or fewer makes one call with the request unchanged. A refused sub-call refuses the record. The routing readout and the threshold choice on hand-made records; the paired difference on hand-made records. The batching scorer against a fake worker.

**Correction with the code, before any model run.** The first sentence above cannot hold for `pool3` as written: a kernel that is as sure of a wrong male on a sub-menu without the partner as it is of the partner elsewhere gives two group winners the same score, and no pooling can tell them apart. The test's kernel is therefore right when the partner is on its sub-menu and unsure (even probabilities) when he is not; through `fan2` and `fan1` the stronger statement holds and is tested as written. The "second in group rounds" test uses sets whose final round holds 4 males.

### 14.6 Results of A8 (6 October 2026; untuned GLiNER2.5-Decide, `base`, `mps`; train and development only; nothing left this computer)

Numbers are copied from `docs/staging/rw-fanout-numbers.md`, which `scripts/rw-fanout-report.ts --md` writes from the per-record outputs (aggregates only). If the two disagree, the generated file is right. Before loading: swap 8.4 of 9.2 GB used, 1-minute load 11; one model process at a time. **Check passed:** plain GLiNER on development through the batch path gives A7's figures exactly (0.373; 0.522 at 8 or fewer; 0.179 above; three refusals) and the same answered option on 448 of 448 records.

**Answer: fanning out narrows the wide-menu gap and does not close it.** On development menus of more than 8 (195 records, 25 males):

| | more than 8 | 9 to 16 (135) | 17 and over (60) | all 448 | 8 or fewer (253) |
| --- | --- | --- | --- | --- | --- |
| null | 0.103 | 0.133 | 0.033 | 0.179 | 0.237 |
| plain GLiNER | 0.179 (0.123 to 0.238) | 0.244 | 0.033 | 0.373 (0.308 to 0.438) | 0.522 |
| **`fan2` (primary)** | **0.323 (0.235 to 0.417)** | 0.348 | 0.267 | 0.435 (0.371 to 0.511) | 0.522 (the same calls) |
| `fan1` | 0.272 (0.214 to 0.349) | 0.274 | 0.267 | 0.413 | 0.522 |
| `pool3` | 0.318 (0.239 to 0.400) | 0.356 | 0.233 | 0.433 | 0.522 |
| the three-rule stack | 0.415 (0.338 to 0.497) | 0.444 | 0.350 | 0.487 (0.418 to 0.545) | 0.542 |

- **`fan2` minus plain GLiNER, wide menus: +0.144 (+0.082 to +0.210); 38 records only `fan2` right, 10 only plain; sign test p below 0.001. A difference.** From 17 options up it lifts the model from chance (0.033) to 0.267, and the three 33-option records the model refuses whole are answered.
- **`fan2` minus the stack, wide menus: −0.092 (−0.140 to −0.031); 10 against 28; p = 0.005. A difference: still below the rules.** Over all records −0.051 (−0.096 to −0.004).
- **Second sample, training part** (398 wide records, 28 males): plain 0.138, `fan2` 0.349, the stack 0.372. `fan2` minus plain +0.211 (+0.156 to +0.261), a difference; `fan2` minus the stack −0.023 (−0.056 to +0.012), **no difference there**. The two parts agree that fanning out about doubles the model's wide-menu accuracy; they disagree on whether what is left is distinguishable from the stack. By the registered rule the verdict is the development one: narrows.
- A new fact from the training part: on menus of 8 or fewer the untuned model is below the stack there (0.465 against 0.511; −0.047, −0.085 to −0.011), where development showed no difference (A7). So "equal to the rules on narrow menus" does not hold on both parts.
- **The variants.** `fan1` minus `fan2` on wide menus −0.051 (−0.116 to +0.022) and `pool3` minus `fan2` −0.005 (−0.060 to +0.043): neither is a difference. Keeping two is not shown to beat keeping one; pooled scores from three deals do as well as rounds, at twice the calls.
- **Against the prediction:** `fan2` at 0.323 is inside the predicted 0.28 to 0.36; `fan1` lower, as predicted; `pool3` equal to `fan2`, not "no better than `fan1`" (wrong).

**Cost in kernel calls.** `fan2`: 3 calls for 9 to 16 options, 4 to 5 for 17 to 32, 8 for 33; a mean of 3.5 a wide record and 2.1 over all development records (2.0 on training), against 1. `fan1`: 3.5 and 2.1 (largest 6). `pool3`: 7.4 and 3.8 (largest 15). Wall time on this loaded machine, from the run log: sub-menus of at most 8 cost 0.15 to 0.27 s a call in batches of up to 16 (554 s for 2,045 packets; 279 s for 1,344), so a wide record costs about 0.7 to 0.8 s fanned out; the plain packet of a wide menu is one slower call (about 0.6 s a record over all records in the later shuffles). In time, fanning out costs about as much as the plain call it replaces; in calls, two to three and a half times.

**Routing (development; thresholds fixed first).** The model answers when its top probability is at least t, the stack otherwise.

| kernel | threshold | routed top-1 | share routed to the stack | minus the stack |
| --- | --- | --- | --- | --- |
| plain GLiNER | 0.6 | 0.473 (0.386 to 0.544) | 0.76 | −0.013 (−0.036 to +0.005): none |
| plain GLiNER | t\* = 1 (training part) | 0.487 | 1.00 | 0: the stack itself |
| `fan2` | 0.6 | 0.491 (0.418 to 0.551) | 0.78 | +0.004 (0 to +0.012): none |
| `fan2` | t\* = 0.75 (training part) | 0.487 (0.410 to 0.549) | 0.89 | 0 (−0.012 to +0.007): none |

Routing turns either kernel into the stack: the training part's best threshold for the plain model is "never trust it", and for `fan2` it trusts 11% of answers. Where the model is confident it agrees with the rules, so nothing is gained over them (the prediction, "within 0.02 of the stack", held). Routing is a safety net, not a gain, while the kernel is untuned.

**Option order (development; three orders for the model, the check A7 lacked).**

| | top-1 per order | same male under all three | wide menus: same male | 8 or fewer: same male | answers on the first option (expected) |
| --- | --- | --- | --- | --- | --- |
| plain GLiNER | 0.373, 0.386, 0.368 | 0.47 | 0.19 | 0.70 | 0.105 (0.169) |
| `fan2` | 0.435, 0.453, 0.446 | 0.63 | 0.54 | 0.70 | 0.120 (0.168) |
| the stack (five orders) | 0.484 to 0.493 | 0.95 | 0.94 | 0.96 | 0.174 (0.168) |

Accuracy hardly moves with the order (range 0.018), but the answer does: the untuned model names the same male under three orders on 70% of narrow menus and 19% of wide ones, and it under-picks the first option (0.105 against 0.169 expected; mean position of its answer 0.565, where 0.5 is no lean). Fanning out raises wide-menu agreement to 54%. The lean is the opposite of the one TypeSafe documents for Jev (toward the first option), and it is in the model, not the menu width: it is there at 8 or fewer.

**What it shows and does not.** A kernel-agnostic wrapper, with no training, recovers about half of the untuned model's wide-menu deficit on development (0.18 → 0.32 against 0.42) and nearly all of it on training (0.14 → 0.35 against 0.37), at 3 to 8 calls a wide record. It does not make the untuned model better than three rules anywhere, and routing by confidence adds nothing over those rules. What is left for R4 on this benchmark is no longer only the width: on training the model is below the stack on narrow menus too, and its answers depend on option order.

**Deviations and limits, stated.**
- A smoke run of 24 development records (plain and `fan2`) was made before the registered runs to check the model path. It showed that the worker refuses a whole batch when one packet has 33 options; the batching scorer now asks such a batch again packet by packet. Nothing in the variants, the routing or the readouts was changed after it.
- Two corrections entered with the code and before any model run (14.1 `fan1` at 76 options; 14.5 the `pool3` test).
- The development table was read while the training part was still running; the routing thresholds are computed by the script from the training records alone.
- After the development numbers were seen, the generated table gained columns that split the order figures by menu width, and a caveat on the seconds. No rule changed.
- The seconds are from a machine under load (1-minute load 11 to 47) and with the model's first load inside the first kernel's time: upper bounds, not benchmarks.
- An identical packet was sent to the model once per run and its answer reused. The model's answers were taken as deterministic; the 448 of 448 match with A7 supports that.
- The null kernel and the stack ran under the harness's five orders, the model under three (development) and one (training).

**Tests.** `tests/rw-fanout.test.ts`: 11 tests, 11 pass (synthetic records, fake kernels, a fake worker). Full `pnpm test`, once at the end (1-minute load 14.7 at the start): 997 tests, 996 pass, 0 fail, 1 skipped (the stand-in artifact absent from the worktree, as before). `tsc --noEmit -p .` and `gen-params --check` clean; the goldens and the field pin did not move. The sealed part was not opened (`docs/staging/rw-sealed-log.md` has no entry).

## 15. Design note for stage R2: the same wrapper, and "kind first, then target", on the simulation's own menus (no code; nothing here has been run)

**Where the simulation stands.** `buildRequest` (`src/sim/request.ts`) sends at most 8 options, chosen from the legal list by `boundedCandidates`: the rules' pick, a response to a disturbance, rest, then **the best target of each action type by the rules' score**, then other partners. So today the rules choose the target of most acts for every kernel, and partners compete with acts for the 8 places. The project's Jev notes measured what that does to a model (N4: probability on social options rose from 0.27 with one social option to 0.73 with four or more, at a fixed menu size) and proposed one entry per kind of activity with a sub-question per kind that has several concrete options (`docs/research.md`, "Engineering sources").

**Three ways to use what A8 built, by cost.**

| design | what the kernel is asked | kernel calls per decision |
| --- | --- | --- |
| A. flat, fanned out | the whole legal list L through `fanOutKernel` with the default sub-request (the context unchanged, `candidates` cut to the group) | L ≤ 8: 1; 9–16: 3; 17–24: 4; 25–32: 5 (`fan2`) |
| B. kind first, then target | call 1: one option per kind of activity that has a legal member (the Jev note counts 5 to 8 as usual; over 8, the wrapper). Call 2, only if the chosen kind has two or more members: its members (partners, trees, places); over 8, the wrapper | 1 when the kind has one member; 2 otherwise; 1 + 3 for 9–16 targets |
| C. the same, asked at once | the kind question and every kind's target question in one batch; code reads the target answer of the kind chosen and drops the rest (speculative fan-out) | 1 + the number of kinds with two or more members (about 2 to 4 packets), in **one batch** |

- **B is two calls for most decisions and removes the rules' ranking from target choice.** It also answers N4 by construction: three grooming partners are one entry at the first call. Its cost is latency: two calls in sequence, and the app's loop holds the animal while it waits.
- **C costs more packets and no more waiting.** Measured here, small packets cost 0.15 to 0.27 s each in a batch on a loaded machine against about 0.6 s for one wide packet alone; the worker already has the batch path. For a kernel billed by tokens (Jev) C is the documented pattern; for the local model it is one forward pass over several short packets.
- **A is the cheapest to build** (the wrapper exists and needs no new packet wording) and the most expensive to run, and it keeps partners and acts in one list, so it does not answer N4.

**What it would cost in the loop.** With the intention gate in the loop (R1, `kernelGate` 1) a kernel is asked about half as often as at every decision point (144 calls against 261 in R1's test). Design B then costs up to twice that, so about the calls of today's ungated loop; C the same in waiting as one call. Stage P2's rate (about 17 GPU-minutes per population-day at one call a decision) would roughly double under B without the gate and stay about level with it.

**What must be registered before it is built (R2), not assumed.**
1. The kind list and which legal options belong to each kind: a design assumption that decides behaviour. A response to danger, an infant's acts and the night menu must survive the grouping.
2. The first call's wording is new for GLiNER: every adapter was trained on flat menus of acts with targets. Untuned agreement at the first call must be measured on R2's probe set before any claim; A8 shows only that sub-menus of the kind the model already knows work.
3. Each sub-request must pass `decisionContextError` unchanged (it does when it holds 2 to 8 options over the same context); the choice that is applied is still one option of the legal list, re-checked by `applyDecision`; the intention stored is the final option's. A sub-menu left with one option is forwarded without a call.
4. Draws: the wrapper takes them from the loop (`env.random`), so inside the tick they are `world.rng` and the run stays reproducible; between ticks they are fixed by seed, chimp and decision version, as R1 does.
5. The order check and the same-male-under-several-orders figure belong in R2's readouts for every model kernel: A8 found the untuned model changes its answer with the order on 30% of narrow menus.
6. Routing by confidence needs a fallback that is not the rules if the aim is less behaviour from hand-written code; A8's readout shows that with the rules as fallback an untuned kernel is routed away nine times in ten.
