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

## 2. Diagnosis (step 1)

Not started. Registered before its run.

## 3. Mechanism (step 2)

Not started. Only for the term the diagnosis implicates.

## 4. Benchmark and judging

docs/staging/e-noise.md amendment 2: reference = R + `callValue` at this branch's committed head, run once plus three
re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405), quick mode; each arm judged against the reference mean.

## 5. Iterations

At most three, each logged here and committed before its run.
