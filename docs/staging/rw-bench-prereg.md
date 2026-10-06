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

**Acceptance tests.** `tests/rw-bench.test.ts`: 16 tests, 16 pass (synthetic records; fake worker; fake Codex executable). Section 9's ten items are covered by tests 1 to 13 and 16; amendment A2 by tests 14 and 15.

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
