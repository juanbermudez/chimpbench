# E4g pre-registration: calls and travel

Status: skeleton committed at the start of the stage (2 October 2026, branch `e4g-calltravel`, from `track-e` d066cdc),
before any run and before any code change. Track E, stage E4, follows E4c (`callValue`, docs/staging/e4c-prereg.md) and
the integrated confirm's attribution (docs/staging/e-stack2-confirm.md).

Rule served: field values of behaviour are targets, never inputs. Nothing here is tuned to a travel share, a day range,
a party size or a call rate.

## 0. The problem (from e-stack2-confirm.md, attribution; simulation truth, quick seeds 48 and 7)

On S2 every class walks 3.1–4.0 km a day on the ground (R: 1.6–2.3). Leaving out `callValue` alone takes males from 3.71
to 2.97 km a day and removes the juveniles' energy deficit (−0.148 → +0.004%/day). E4c's confirm showed calls raising
party size (T-PTY-1 3.57 → 3.84) and intergroup contacts (T-IGE-1 3.4 → 7.5).

## 1. Audit of the field's recruitment and travel data (step 0)

Read 2 October 2026 from full texts already cited in docs/research.md and docs/staging/e-sources.md (local copies from
the Track E session; nothing fetched anew). FT = full text read here; Abs = abstract only; [H]/[M]/[L] as in research.md.
**Nothing below is a model input.** Each item says what it can and cannot be compared with.

### 1.1 Recruitment by calls: how often a call is followed by others coming

| Source | Sample and method (quoted where it decides comparability) | Result | Comparable model readout |
| --- | --- | --- | --- |
| fedurek2014 (FT) [M], Kanyawara | Oct 2010 – Sep 2011; 10–11 adult males, 169 nest-to-nest focal days (mean 550 min); "instantaneous scan samples at 5-min intervals" of party composition, party = "all individuals within 50 m"; only calls with no other call by the focal "within two scans before and two scans after", and "pant hoots given during feeding (N=115 out of 368)" excluded "because ... independent attraction to food sources would confound" | Of 368 isolated calls, 31.25% "associated with a change in the composition of males"; males joining the caller's party in 25.27% (93), leaving in 10.32% (38), within ±2 scans (±10 min); joins after the call (median 0.27 males) vs before (0.15) not significant (P = 0.105). Fusion "significantly more likely" in the two scans after the last call of a sequence than during it (β −0.65 ± 0.27) | Share of an adult male's isolated non-feeding pant-hoots with another adult male entering his 50-m party within ±10 min |
| southern2025 (FT) [M], Loango (*P. t. troglodytes*) | 10 adult males, 16 months, 1,747 pant hoots; "inquiring" pant hoots (IPH) = travel context with waiting or scanning ≥ 3 s (352 calls, 20%); fusion = "the caller and responder were in the same party composition within 30 min of the call, defined as having moved into the same party"; who moved is not reported | 75% of IPHs drew a vocal reply; 67% (238) were followed by fusion, on average 5.16 ± 8.54 min later. Other pant hoots: no fusion share reported | Not comparable as a share of all calls (a selected subset, defined partly by the caller's own waiting); direction only: calls when travelling and alone are followed by reunions within minutes |
| kalanBoesch2015 (FT) [M], Taï (*P. t. verus*) | 5 males, 4 females, 754.5 h; 557 complete feeding events; others' arrival counted if "within 30 min of the focal arriving"; "nearby" = seen with the focal in the 30 min before, not arriving with it ("a few hundred metres"); food calls carry ≤ ~300 m at Taï | Arrivals of others in 153 of 557 events (27%); 89.9% of patches empty on the focal's arrival. All foods: food calls did not raise arrivals (P = 0.21), pant hoots did (log-odds +0.72 ± 0.28). Fruit only (319 events): food calls +0.81 ± 0.31, pant hoots +0.85 ± 0.38. "Individuals who arrived always began to join in eating" | Share of a focal's crown-feeding events with another community member arriving within 30 min; its rise when the focal called |
| clarkWrangham1994 (Abs) [M], Kanyawara | 272 party arrivals at food over 16 months | Arrival pant-hoots at unoccupied trees came only from parties with a high-ranking male; calling was unrelated to the amount of ripe fruit and **did not change other parties' arrival** | Direction: an arrival pant-hoot at a crown need not draw others (Kibale's only direct test; abstract only, so sample per call unknown) |
| bouchard2022a (FT) [M], Budongo Sonso | 10 males, 692 h, 233 arrival events (from ~30 m of the tree to feeding) | Pant hoots in 0.35 ± 0.14 of events in which the male joined others, 0.08 ± 0.04 when being joined | The joiner calls, not the joined: calls by arriving animals, not recruitment |
| gruberZuberbuhler2013 (FT) [H], Budongo Sonso | 166 travel initiations (quiet travel hoos, ~50 m, not pant-hoots) | 71.4% of vocal and 33.7% of silent initiations recruited at least one follower | Short-range coordination of animals already together; not travel to distant callers |
| Playbacks of strangers (wilson2001; herbinger2009 not read) | Intergroup | Approach depends on the number of males | Not within-community recruitment; not used |

**Distances.** No source read gives the distance travelled by animals that come to a caller. Indirect bounds only:
southern2025 estimated caller–responder distances (Supporting Information, not read) and fusion came on average 5.2 min
after an IPH (at the 1.9 km/h travel speed of batesByrne2009 that is ~160 m; derived [L], a mean over a skewed
distribution); kalanBoesch2015 assumed a 300-m, 30-min window for food calls; pant-hoot audibility "1–2 km" rests on
secondary citations (research.md, low confidence). The model hears pant-hoots to `hearPantHootM` (1 km).

**Who approaches.** Not separable in any source read: fedurek2014 counts males entering the focal's 50-m party (the
focal or the other may have moved), southern2025 counts caller and responder "moved into the same party", kalanBoesch2015
counts others arriving at the focal's patch (the only one where the mover is the listener).

### 1.2 Daily travel (day ranges and travel share)

| Source | Sample and method | Value |
| --- | --- | --- |
| pontzerWrangham2004 via wilson2021 [L], **Kanyawara** | n and method not seen (primary closed) | males 2.4 km/day, adult females 2.0 |
| batesByrne2009 (FT) [M], Budongo Sonso | 8 males, 6 lactating/gestating females; follows ≥ 8 h; GPS "every five minutes when it was travelling", movements within halts ≥ 20 min not recorded | males 2.7 ± 1.5 km (27 days), lactating 1.2 ± 0.8 (13), receptive 2.2 ± 0.8 (3) |
| wrangham1975 (FT) [M], Gombe | nest-to-nest days; moves within ~30 m of a point ignored | medians: males 4.2 and 3.8 km, mostly anoestrous females 2.8 |
| jang2019 [M], Taï | 274 days, continuous GPS (inflates path) | females median 4.03 km |
| villioth2025 (FT) [M], Budongo Waibira | 19 adults, 491 h, continuous focal; canopy movement scored as travel | travel 0.21 of time (males), 0.20 (females) |
| amsler2010 (Abs) [M], **Ngogo** | 29 patrols and control days, focal follows | travel 0.14 of time on non-patrol days, 0.58 on patrols |

No Ngogo day range was found in the sources already cited (not searched further: not needed to name the targets).

### 1.3 Party fusion rates

| Source | Sample and method | Value |
| --- | --- | --- |
| fedurek2014 (FT) [M], **Kanyawara** | as in 1.1; a change = "one or more males left or joined the party in one scan, compared with the previous scan" (5-min scans, 50 m) | 6.33 ± 3.95 changes in male composition per focal day, 6.52 ± 3.90 in female composition; ≈ 0.69 male changes per hour (derived [L], ÷ 9.2 h) |
| southern2025 (FT) [M], Loango | 10-min scans; "entry or exit events ... divided by ... observation hours" | rate used as a predictor; the mean is not given in the text read |

No Ngogo fusion rate was found in the sources already cited.

### 1.4 What this stage scores (targets, never inputs)

- **Benchmark rows:** T-ACT-2 (travel share; fitted, tuned in C5a; band 0.12–0.25 from Ngogo control days to Waibira),
  T-PTY-1 (party size; fitted, tuned in C5a; 3–9), T-IGE-1 (encounters per community-year; fitted; 5–12), T-COM-1
  (male pant-hoots per hour; fitted, encoded before E4c; 0.5–1.5), T-RNG-4 (male day range on 5-min fixes while
  travelling; 1.5–3.5 km; held as failed since C6b).
- **Readouts with a field value (no row; reported, never fitted):** the share of an adult male's isolated non-feeding
  pant-hoots with another adult male entering his 50-m party within ±10 min (fedurek2014: 0.25); adult-male party
  composition changes per hour (fedurek2014: ≈ 0.69, derived); the share of crown-feeding events with others arriving
  within 30 min (kalanBoesch2015: 0.27, Taï) and whether calling raises it; simulation-truth day ranges against Kanyawara
  (2.4 / 2.0 km, [L]) and Sonso (2.7 / 1.2 km). Truth path and the observer's 5-min path differ by method (moves within
  halts and within ~30 m of a point are not recorded in the field): the comparison is reported, not scored.
- **What the field cannot tell this stage:** how far listeners travel to a caller, or who moves. A mechanism must not
  assume either.

## 2. Diagnosis (step 1; registered 2 October 2026 before its runs)

**Question.** Which part of the walking does `callValue` add: food trips, joining or following a party, approaching a
caller, water, patrol or other? How many approaches does a heard call start and from how far, how often is the caller
reached, what does the joiner gain on arrival, and what do approaches cost in energy?

**Code path (read before the run).** A community member's pant-hoot or drum heard within its radius (1 km) sets the
listener's join cue: the call, the caller and the caller's position at the call, and `joinRich` = the caller was
foraging with a target (`src/sim/perception.ts:316-318`). For 0.3 h the listener is offered 'travel' to the call's
position (`V.CALLER`) at pull × (1 − rain/2) − distance ÷ `joinCallDistScaleM` (1,500 m), pull = 0.15 + 0.35 × the
habitat fruit index + 0.3 × hunger + 0.15 × sociability when the call was at food, else 0.3 × sociability × fruit
index − 0.05, plus (1 − social) × `joinSocialW` (0.55; × 0.4 with ≥ 2 companions in view) and `joinMaleW` 0.2 for adult
male to adult male (`src/sim/candidates.ts:400-408`). Nothing in it reads the crop or the crowding at the caller's
crown, the energy the walk costs, or how old and far the information is. The walk ends 25 m from the goal
(`joinCallStopM`). Under `callValue` 1 most adult-male pant-hoots are given on arrival in a crown or by the contact
value (E4c §9), so more calls are "at food" and carry the larger pull.

**Known issue found while writing the readouts (deferred; not fixed before measuring, because any fix moves today's
behaviour and must sit behind a switch):** the walk's goal is read live from `x.joinX/joinZ` (`src/sim/execution.ts:588`),
which every later community pant-hoot or drum heard overwrites (`src/sim/perception.ts:317`), so an animal that chose
to approach caller A walks to whichever community member called last, without a new decision. The diagnosis measures
how often (`goalRedirected`). A mechanism may include a fix only behind its switch.

**Runs.** `scripts/approach-diagnose.ts` (new; header defines every readout), seeds 48 and 7, field profile, 30-day
burn-in + 30 days, rules policy, from a frozen detached checkout of the commit that adds this section: **RC** = R +
`callValue` 1 and **R** (handoff §3). Simulation truth only.

**Readouts** (definitions in the script header; field ones quote the source's Methods, §1):
- path km per chimp-day by purpose and part, per class (adult males, adult females pooled, lactating, other adult
  females, adolescents, juveniles 5–12 y), and locomotion kcal (walk, climb, carry) by purpose;
- approaches (travel to a heard call): per chimp-day, start distance (bins at 250, 500, 750 m), share to calls at food,
  the caller's act when it called, path, minutes and kcal per approach, ended at the goal or abandoned, goal
  redirected by a later call, caller within 50 m at the end, party size at start and end, and in the 30 min after:
  fed in the caller's crown, fed in another crown, came within 50 m of the caller, nothing;
- per call at food and not at food: listeners ≥ 5 y in range, approaches started;
- adult-male and adult-female pant-hoots per awake daylight hour;
- fedurek2014: adult-male composition changes per awake hour at 5-min scans (field ≈ 0.69, derived); share of isolated
  non-feeding adult-male pant-hoots with males joining within ±2 scans (0.25) or leaving (0.10); mean males joining in
  the two scans after vs before (field medians 0.27 vs 0.15);
- kalanBoesch2015: share of adult crown-feeding events with another community member arriving after the first minute
  and within 30 min (0.27, Taï), by the focal's pant-hoot or food grunt before the first arrival;
- viability: reserves ÷ store slope (%/day) for adult males, other adult females, lactating females, juveniles
  (energy-diagnose's `traj`), deaths by cause.
Smoke test (seed 48, 1 + 2 days, RC): every readout filled; nothing read from it beyond that.

**Reading rule (registered).** Δ = RC − R per purpose, adult males and adult females separately. The term that adds
the walking is the purpose with the largest Δ, if it carries at least 40% of the total Δ path; otherwise the walking is
shared and the two largest are named. If it is 'callers', the approaches are split by calls at food and not at food
and by outcome, and the mechanism (§3) addresses what makes approaches not worth their walk. Differences under 0.1 km
a day are not resolved (single runs, 2 seeds).

**Expected (before the run).** The largest Δ is 'callers' for adult males (moderate confidence) and adult females
(low); 'party' (joined trips and follows) is second (low). Under RC most approaches go to calls at food (≥ 50%,
moderate), a call at food starts more approaches than one not at food (high), and fewer than 25% of approaches end
with the joiner feeding in the caller's crown within 30 min (moderate). Viability passes in both (high).

### 2.1 Diagnosis results (RC and R; seeds 48, 7; 30 + 30 days; run-d2e6e1d, clean)

Generated from `rc-diag.json` and `r-diag.json` (scratch `e4g/out`); simulation truth, km per chimp-day.

| | R | RC | Δ | share of Δ path |
| --- | --- | --- | --- | --- |
| Adult males: path | 2.204 | 2.540 | +0.336 | |
| … party (joined trips + follow party) | 0.697 | 0.940 | +0.243 | 72% |
| … approaching callers | 0.336 | 0.424 | +0.088 | 26% |
| … food trips | 0.431 | 0.378 | −0.053 | |
| … patrol | 0.146 | 0.183 | +0.037 | |
| Adult females: path | 1.842 | 2.109 | +0.267 | |
| … party | 0.576 | 0.772 | +0.196 | 73% |
| … approaching callers | 0.270 | 0.359 | +0.089 | 33% |
| Juveniles 5–12 y: path | 2.762 | 3.224 | +0.462 | party +0.192, other +0.153, callers +0.063, water +0.063 |

- Bouts: follow-party bouts per adult-male day 2.82 → 4.69 (≈ 60–70 m each), joined trips 3.43 → 4.23, approaches 1.69
  → 2.00 (females 1.26 → 1.69).
- Calls: calls at food per community-day 4.9 → 11.1, each starting 1.10 → 1.25 approaches (≈ 12–13 listeners in range);
  calls not at food 78 → 61, 0.16 approaches each. Approaches to calls at food 27% → 55% of adult males' approaches.
- Approaches (adult males, RC): start 242 m (59% within 250 m, 1% beyond 750 m), walk 209 m in 10.7 min for 7.5 kcal;
  69% end at the goal; the goal is moved by a later call in 44% (R 50%); the caller is within 50 m at the end in 50%
  (R 36%). In the next 30 min: fed in the caller's crown 8% (calls at food: 14%), fed in another crown 38%, within 50 m
  of the caller 63% (R 48%), nothing 23% (R 32%). Party size around the joiner at the end 4.60 (R 3.37).
- Field readouts: male composition changes per awake hour R 0.89, RC 1.24 (fedurek2014 ≈ 0.69); isolated non-feeding
  pant-hoots with males joining within ±2 scans R 0.245, RC 0.275 (0.25), leaving 0.21 / 0.245 (0.10); crown-feeding
  events with others arriving R 0.16, RC 0.20 (kalanBoesch2015 0.27), after a pant-hoot 0.24 / 0.21 against 0.14 / 0.08
  with no call.
- Pant-hoots per awake hour, adult males R 0.80, RC 0.59. Viability: no deaths; reserves %/day RC (R): lactating −0.027
  (−0.010), juveniles +0.001 (−0.013), other females −0.013 (0.000), males −0.002 (−0.002).
- Observer (single runs, R-quick at 612bf15 against RC0 here): T-ACT-2 0.150 → 0.188 (males 0.153 → 0.207), T-PTY-1
  3.70 → 4.24, T-RNG-4 1.84 → 2.39, T-COM-1 0.75 → 0.55.

**Reading by the registered rule:** the largest Δ is **party** (joined trips and following a party member), 72–73% of
the adults' extra path; approaches to callers are second (26–33%). The expectation that 'callers' would be the largest
was wrong. Approaches end in the caller's company more often under RC (63% vs 48%), parties around joiners are larger,
and followers then walk more.

### 2.2 Why following rises: step 1b (registered before its run)

The rule names party walking, but not why it rises with calls. Two readings predict different mechanisms: (a) companions
follow an animal that is approaching a caller, so each approach drags its party along (the term is the approach);
(b) larger parties give each member more departures to follow (the term is how following scales with party size). A
2-day smoke test of a new readout (adult males, RC, seed 48) also showed adult males following animals that are
themselves following their mothers ('follow party' offered for any companion in a follow act, `candidates.ts:487`,
including a dependent's `V.MOTHER` follow), a possible defect.

**Readout added** (`approach-diagnose`, step 1b): the 'follow party' path split by the followed animal's part in the
same tick, and the 'joined trip' path split by its leader's part. **Runs:** RC and R again, same seeds and length, from
a frozen checkout of the commit that adds this section. **Reading rule:** (a) if following an approacher carries at
least half of the RC − R rise in follow-party path; (b) if following animals on other acts (trips, mothers, drinking)
carries most of it; the dependent-follow defect is named if following an animal in a `V.MOTHER` follow carries more
than 25% of adult follow-party path in either run.

## 3. Mechanism (step 2)

Not started. Only for the term the diagnosis implicates.

## 4. Benchmark and judging

docs/staging/e-noise.md amendment 2: reference = R + `callValue` at this branch's committed head, run once plus three
re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405), quick mode; each arm judged against the reference mean.

## 5. Iterations

At most three, each logged here and committed before its run.
