# E5d pre-registration: why a chimpanzee grooms

Status: skeleton committed at the start of the stage (2 October 2026, 22:05, 842af88, branch `e5d-grooming`, from
`track-e` 9503ed4), before any run and before any code change; diagnosis tool committed at 4e1fa4d; sources at c268208;
diagnosis results, mechanism and iteration 1 registered in this revision, before any code of the mechanism exists.
Track E, stage E5d. Rule served: field values of behaviour are targets, never inputs. No rate or weight is tuned to a
grooming share, a rest share or a partner distribution; a miss is a finding.

## 0. The problem

- The social need (`1 − social`, "lonely") rises on two fixed timers, `socialAwakePerH` 0.035 and `socialSleepPerH`
  0.01 per hour (`src/sim/life.ts` `needs()`; design, no source). The prescription ledger counts both as rule 5d "need
  timer" and lists them as encoding T-ACT-3, the grooming share (`bench-run/artifacts/validation/e/e0-ledger.md`).
  Grooming (actor +0.18/h, recipient +0.3/h), play (+0.15/h) and nursing (+0.2/h, the infant) restore it; since E5a it
  also scales what a companion's company is worth (`companyValue`), the contact call and the approach pull.
- On S8 (S6 + E1p's `growYield` + E3b's `revisitByCrop`, the best integrated candidate; e-stack2-confirm.md "S8
  results") the time freed by less walking and eating goes to grooming and rest: T-ACT-3 0.164 → 0.208 (band 0.08–0.18;
  males 0.185, females 0.227 in the confirm run), T-ACT-4 0.361 → 0.430 (band 0.3–0.47).
- Working hypothesis to test (integrator's reading): while time was short grooming was limited by time; with time free
  it is limited only by the need, so the timers' rate sets the grooming share.

## 1. Field rows scored and their samples

Sources opened for this stage (research.md "Addendum: E5d why a chimpanzee grooms") or by the stage that last scored the
row (named). Rows the mechanism can move are marked ●.

| Row | Band | Source and sample (sex, reproductive state, method) | Opened |
| --- | --- | --- | --- |
| ● T-ACT-3 grooming share (fitted) | 0.08–0.18 (M 0.15, F 0.12) | villioth2025, Waibira (Budongo), a community of "at least 88 known individual chimpanzees, including 17 adult males (≥ 16 years old) and 29 adult females"; 10 adult males of high, mid and low rank and 9 adult females (7 lactating, 2 not lactating with one juvenile each); continuous focal recording from first light at the night nest, 4.1 ± 2.6 h per follow (491 h); "grooming (giving or receiving)" | here (BioC, PMC12701709) |
| ● T-ACT-4 rest including grooming (fitted) | 0.30–0.47 | potts2011, Kanyawara 2006 and Ngogo 2005–06, continuous focal follows rotating among party members, grooming counted as rest, monthly means (0.448, 0.340); villioth2025 rest + groom ≈ 0.43 (derived); villioth2025's resting: "any period > 1 min in which the individual was sitting or lying and not engaging in another behaviour" | research.md (potts2011 FT); here (villioth2025) |
| ● T-ACT-1 feeding (fitted) | 0.33–0.50 | villioth2025 (as above; M 0.36, F 0.37); uwimbabazi2019, 14 Kanyawara nursing mothers, full-day follows, 309 ± 85 min | E1k, field audit |
| T-ACT-2 travel (fitted) | 0.12–0.25 | villioth2025 (M 0.21, F 0.20); amsler2010, Ngogo non-patrol days 0.14 | E1k; amsler2010 abstract only |
| ● T-PTY-1 party size (fitted) | 3–9 | wilson2012, Kanyawara 1992–2006, 5,527 party follows, 15-min scans, 9.2 ± 7.0 per follow | E5a (FT) |
| ● T-SOC-3 grooming reciprocity (held-out) | 0.45–0.80 | kaburuNewtonFisher2015: Sonso 8 adult males (≥ 16 y), Dec 2003–Aug 2004; Mahale M group 10 (stable) and 9 (unstable) adult males, 2011; all-occurrence grooming within focal parties, durations, a bout ends after 30 s without grooming; slope of grooming given on received 0.68 / 0.72 / 0.52 | here (BioC, PMC4287234) |
| ● T-SOC-2 longest bond with non-kin (held-out) | 0.55–0.90 | mitani2009, Ngogo, 35 adult males, 1998–2007, hour-long focal samples with 10-min scans of partners within 5 m or grooming, 5,410 h; 22 of 28 longest bonds with non-relatives | here (author PDF) |
| T-SOC-5 steepness, T-SOC-6 pant-grunts to the top 3 (held-out) | 0.2–0.7; 0.6–0.9 | kaburuNewtonFisher2015 (as above); gilby2013, Gombe 1995–2008, 16 males | kaburu here; gilby2013 not re-opened (no grooming term) |
| T-SOC-9 reconciliation (fitted), T-SOC-10 third-party affiliation (held-out) | 0.08–0.22; 0.10–0.30 | kutsukakeCastles2004 (Mahale, abstract); wittigBoesch2010 (Taï, 18 individuals) | not re-opened (NCBI rate-limited the BioC request on 2 October; targets.json entries used) |

### 1.1 Audit note on T-ACT-3 (not staged)

T-ACT-3's only source is a community of at least 88 members; the model's West community has 22. The one quantitative
relation in hand (lehmann2007, 40 primate populations; [M] as structure, [L] as a rule within chimpanzees) has grooming
time rising with group size up to about 40 members and levelling off above it (P. t. schweinfurthii 59.2 members, 11.7%;
P. t. verus 40.3, 8.3%; bonobos 27.8, 5.7%; its chimpanzee-parameter model gives about 5.5% at 22 members). If that
relation holds within chimpanzees, the field's 0.12–0.15 is an upper reference for a 22-member community. No chimpanzee
study in hand measures grooming in a community of about 22, so no band is staged; the row stays as scored and the
comparison is flagged in the results.

## 2. Step 1, diagnosis

Tool: `scripts/groom-diagnose.ts` (committed 4e1fa4d; simulation truth, read-only; definitions in its header; it reuses
intake-diagnose's decision tap and runs e-bench's own focal observer). World: e-bench's (createWorld field profile +
30-day burn-in + 30 days, seeds 48 and 7, rules policy). Arms: **S8** (`bench-run/.../s8q/S8q-params.json`), its three
re-draws (S8q1–3 params), and **S6** (S8 without `growYield` and `revisitByCrop`); one run each, from a frozen checkout of
4e1fa4d (`run-4e1fa4d`, clean). Readouts as registered in the skeleton (grooming time given, received, mutual and by
partner; bout starts and ends with the state, the score's terms and the displaced act; the social need's daily budget
with the clamp at full satisfaction; decisions; partners in reach; hormone-like states).

**Identity.** The tool's observer gives T-ACT-3 per seed 0.2247 / 0.1943 (S8), 0.2061 / 0.1941, 0.2045 / 0.1648 and
0.1885 / 0.1920 (S8q1–3), equal to e-bench's per-seed values for all four S8 runs: the tool's worlds are e-bench's.

### 2.1 Results (S6 / S8, one run each; printed by the stage's `diag_compact.py` from the JSON)

| readout (S6 / S8) | adult male | other adult F | lactating | lact., infant ≥ 2 y | juvenile 5–12 y |
| --- | --- | --- | --- | --- | --- |
| grooming, given or received (daylight min/day) | 102 / 119 | 103 / 127 | 203 / 243 | 289 / 334 | 65 / 90 |
|   given / mutual (min/day) | 90·68 / 102·74 | 87·63 / 106·78 | 191·133 / 227·152 | 276·222 / 315·245 | 61·40 / 84·57 |
| rest, not groomed (daylight min/day) | 136 / 158 | 181 / 205 | 75 / 80 | 24 / 28 | 83 / 124 |
| free time (daylight − eat − forage − travel − nest, min/day) | 268 / 309 | 297 / 347 | 322 / 373 | 359 / 414 | 227 / 300 |
| daylight social need n (mean) | 0.36 / 0.34 | 0.41 / 0.31 | 0.16 / 0.11 | 0.05 / 0.03 | 0.47 / 0.34 |
| need budget/day: timers | 0.52 / 0.52 | 0.53 / 0.53 | 0.55 / 0.54 | 0.55 / 0.55 | 0.54 / 0.54 |
| need budget/day: restored by grooming | 0.72 / 0.81 | 0.69 / 0.86 | 1.33 / 1.57 | 2.04 / 2.32 | 0.42 / 0.58 |
| need budget/day: restored at a full need (clamped) | 0.21 / 0.31 | 0.17 / 0.35 | 0.88 / 1.13 | 1.59 / 1.89 | 0.09 / 0.25 |
|   clamped share of all restoration | 29% / 38% | 25% / 39% | 61% / 67% | 74% / 77% | 14% / 31% |
| bouts started: n at start | 0.39 / 0.34 | 0.46 / 0.32 | 0.16 / 0.11 | 0.06 / 0.05 | 0.47 / 0.30 |
|   score: need term (0.55·n) | 0.21 / 0.18 | 0.25 / 0.18 | 0.09 / 0.06 | 0.03 / 0.03 | 0.26 / 0.17 |
|   score: partner terms (bond, kin, reciprocity, rank) | 0.48 / 0.48 | 0.35 / 0.40 | 0.65 / 0.67 | 0.79 / 0.78 | 0.59 / 0.67 |
|   score: invitation | 0.15 / 0.15 | 0.20 / 0.17 | 0.10 / 0.09 | 0.10 / 0.09 | 0.04 / 0.03 |
|   score: costs | -0.19 / -0.16 | -0.20 / -0.18 | -0.22 / -0.19 | -0.21 / -0.19 | -0.23 / -0.18 |
|   score chosen / best non-grooming option | 0.68·0.46 / 0.67·0.46 | 0.63·0.41 / 0.60·0.41 | 0.65·0.39 / 0.65·0.40 | 0.71·0.40 / 0.72·0.41 | 0.72·0.46 / 0.76·0.47 |
|   partner: mean bond; share kin | 0.68·0.23 / 0.65·0.21 | 0.58·0.28 / 0.62·0.31 | 0.91·0.84 / 0.92·0.85 | 0.99·0.98 / 0.98·0.98 | 0.69·0.65 / 0.76·0.72 |
|   displaced act: rest / feed / travel (share) | 0.32·0.21·0.10 / 0.33·0.25·0.07 | 0.42·0.18·0.07 / 0.42·0.21·0.08 | 0.28·0.38·0.09 / 0.28·0.41·0.06 | 0.27·0.42·0.09 / 0.27·0.44·0.06 | 0.14·0.24·0.29 / 0.21·0.29·0.21 |
| decisions with a groom option that chose another act: best groom / best rest score | 0.27·0.24 / 0.28·0.26 | 0.19·0.24 / 0.18·0.25 | 0.29·0.18 / 0.30·0.18 | 0.40·0.15 / 0.41·0.16 | 0.24·0.18 / 0.24·0.20 |
| a settled partner in reach (share of daylight) | 0.32 / 0.36 | 0.33 / 0.40 | 0.53 / 0.61 | 0.60 / 0.68 | 0.27 / 0.33 |
| stress; affiliation (daylight) | 0.12·0.11 / 0.11·0.12 | 0.13·0.09 / 0.11·0.12 | 0.09·0.28 / 0.07·0.32 | 0.06·0.40 / 0.04·0.44 | 0.17·0.07 / 0.12·0.10 |

Per seed the pattern repeats (S8 clamped share 41% and 33% for males, 43% and 36% for other females, 76–77% for mothers
of infants ≥ 2 y). Over S8's four realizations (stage `e5d_judge.py`): grooming 118.5 ± 4.2 min/day (males), 120.5 ±
4.6 (other females), 237.8 ± 8.4 (lactating), 80.2 ± 6.7 (juveniles); clamped share 0.384 ± 0.018, 0.353 ± 0.028,
0.661 ± 0.011, 0.281 ± 0.028; daylight need 0.328 ± 0.014, 0.339 ± 0.021, 0.116 ± 0.014, 0.345 ± 0.011.

Partners (S8): adult males groom bonded partners (bond ≥ 0.6 in 63% of their grooming time, mean 0.71), half of it with
other adult males; other females 39% with their own weaned offspring; mothers of infants ≥ 2 y 98% with their own
unweaned infant; juveniles 65% with their mother. Bouts start mostly at a bout's natural end (34–40%), at a partner's
"began grooming me" interrupt (24–30%) or a need-bucket redraw (14–15%), and displace rest (33–42%) and feeding (21–25%);
they end mostly at need-bucket redraws (the hunger or loneliness bucket changes) or when a companion leaves.

**The social need's rise.** The timers are the only source of the need's rise (`life.ts:155` is the only subtraction;
the budget's residual, −0.008 to −0.014 per day for adults, is ≤ 3% of it): 0.52–0.55 per day in every class.

### 2.2 Reading: what sets grooming time on S8

1. **Grooming is not limited by the need.** By the registered rule it would be if the restoration by grooming equalled
   the timers' rise within 10% and bouts started at a need below the level held outside grooming. Neither holds: adults'
   grooming restores 0.81–0.86 a day against a rise of 0.52, and bouts start at the need held while resting or feeding
   (0.34 against 0.36 for males; means, where the skeleton said medians). The need term is 0.18 of a grooming score of
   0.60–0.67; the partner terms (0.4·bond, 0.2 kin, 0.2·reciprocity, rank) and invitations add 0.57–0.63 whatever the
   need. So grooming beats rest at a met need: 38% (males) and 39% (other females) of grooming's restoration lands on a
   full need (clamped at 1), 77% for mothers of infants of 2 y or more (E1k's loop: the need sits at 0.03).
2. **Free time sets the excess.** From S6 to S8 free time grows by 41–51 min a day; grooming takes 17 (males), 24
   (other females) and 40 (mothers) of it and rest the remainder; the extra restoration lands on a full need almost
   entirely (males +0.09 restored, +0.10 clamped; other females +0.17 and +0.18). The need-limited part of grooming is
   what the timers buy: restoration net of the clamp equals the timers' rise (0.50 against 0.52 for males).
3. **So:** on S8, grooming time = the need-limited part, set by the timers (≈ 62% of males' and 65% of other females'
   grooming), plus grooming at a met need, set by how much free time the need-independent partner terms win from rest
   (the remaining 35–40%; 77% for mothers of older infants). The integrator's reading is half right: the timers do encode
   the need-limited part, but the S6 → S8 rise is grooming at a met need. Partners in reach are not the limit (a settled
   partner is within reach 36–68% of daylight; resting at a need ≥ 0.4 takes 8–10% of adults' daylight). Stress and
   affiliation are low and play no part: neither enters the grooming score.

Field context (research.md addendum): grooming time is a requirement set by the number of relationships (lehmann2007,
lehmann2008: group size, not body size, dunbar1991); spare time goes to rest (lehmann2008's uncommitted rest;
couturier2022's Sebitoli: extra travel came out of rest); grooming is concentrated on enduring bonds and balanced over
weeks (mitani2009, gomes2009); hygiene (tanaka1993, akinyi2013) and tension reduction (wittig2016, shutt2007, schino1988)
are benefits of grooming but none gives a rate that would set its time.

## 3. Reference and judging

Reference (integrator, not re-run): S8 in quick mode, run once plus three re-draws (`rgTemperature` 0.1641, 0.1639,
0.16405) at bench-run cf22cde, each with energy-diagnose (seeds 48, 7; 30 + 30 days):
`bench-run/artifacts/validation/e/s8q/{S8q,S8q1,S8q2,S8q3}.json` and `…-energy.json`; all viable, no deaths, clean. Spread
on rows counted in all four (integrator): fitted 1.94 / 1.46 / 2.46 / 3.02; held-out 3.45 / 4.91 / 5.19 / 5.19; held-out
without T-HUN-4 and T-BRD-1 3.45 / 4.02 / 4.23 / 3.24. Judged by docs/staging/e-noise.md amendment 2
(`integrator/judge_vs_reps.py quick custom`): z = (arm − reference mean) ÷ (SD × √(1 + 1/4)), SD = the registered quick
per-run SD (fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48) or the reference's own spread if
larger; |z| > 2 is a result. Activity, social, energy and grooming readouts against the reference's own spread (its four
groom-diagnose runs are the stage's, above). Viability must pass. Prescriptions: `scripts/prescription-ledger.ts --count
--params` (S8: 76).

## 4. Mechanism, iteration 1 (registered 2 October 2026, before any code of it exists)

**Principle.** Two findings, two corrections, both from the evidence on why primates groom:
- *Drive × incentive.* What a stimulus is worth depends on the internal state it serves (alliesthesia, cabanac1971 [H]
  humans); the motivation to be groomed is regulated by grooming itself (opioid feedback, keverne1989 [M] monkeys). A
  partner's bond, kinship, reciprocity and rank make it the right partner to groom when grooming is needed, not a reason
  to groom when it is not. Today these terms are constants, so grooming fills free time at a met need (finding 1), while
  the field gives spare time to rest (lehmann2008, couturier2022). E1k applied this form inside the mother–infant dyad
  (`groomNeedDyad`); the diagnosis shows the same term at work in every class.
- *Relationship upkeep.* Grooming's main function is the upkeep of relationships: grooming time scales with the number
  of relationships (group size), not with body size or parasite load (dunbar1991, lehmann2007 [M] structure), and
  enduring bonds are kept by equitable grooming (mitani2009, gomes2009). The model already lets bonds fade without upkeep
  (each eco-day a bond relaxes toward its baseline by `bondRelaxPerDay` 0.015 of the gap: 0.6 maternal kin, 0.2 others;
  design, no source, not calibrated and linked to no target row in the registry; the code's comment: "without grooming,
  bonds relax toward a baseline over weeks") and grooming builds them (+0.012/h toward the groomed partner, +0.02/h
  toward the groomer). The social need can then be what the animal's relationships lose: the need rises by the bond
  value its relationships with living community members lose to that daily relaxation, in the units in which grooming
  restores the need. Those units are
  fixed by the model's own grooming effects: grooming restores 0.18 need/h and builds 0.012 bond/h in the groomer, 0.3
  and 0.02 in the recipient, both 15 need units per bond unit, so grooming that exactly rebuilds what the bonds lost
  exactly meets the need, with no new number. Grooming demand then follows the animal's relationships (how many, how
  strong, kin or not) instead of a clock.

**Switches** (both 0 = today in both profiles; hash-identical at 0):
- `groomDrive` 1: every groom option's social terms are weighted by the groomer's need n = 1 − social: score =
  persistence + n × (0.55 + 0.4·bond + 0.2·kin + 0.2·reciprocity + rank 0.12 + alpha ally 0.35 + 0.7·invited − female
  non-kin offset) − costs (tension, distance, 0.6·hunger, 0.6·rain, night, under 5), E1k's form for every partner (today's
  score at n = 1; at n = 0 only persistence and costs). Removes no counted prescription (weights literal score terms by a
  state; `removesNothing`).
- `socialUpkeep` 1: `needs()` lowers `social` by 15 × U ÷ 24 per hour, U = the bond value (bond units per day) that the
  animal's own bonds toward living members of its community above their baseline lose at the daily relaxation:
  Σ `bondRelaxPerDay` × (bond − baseline), set at each daily step (`dailyLife`) for the following day and computed from
  the current bonds before the first one; the two timers are not read. 15 = 0.18 ÷ 0.012 = 0.3 ÷ 0.02 (execution.ts
  grooming effects, made named constants; a test keeps the two ratios equal). Switches out `socialAwakePerH` and
  `socialSleepPerH` (count −2). Lazily added ChimpX key `upk` (OPTIONAL_X). Works alone, but without `groomDrive` grooming
  at a met need remains.

Not chosen: a hygiene state (no parasite growth rate for any primate; dunbar1991 puts grooming's time on group size,
not body surface); a stress-driven drive (stress at bout starts equals its daylight mean, 0.06–0.11: the diagnosis does
not implicate it, and wittig2016 finds no stronger effect for longer grooming); an endorphin-like decay (no time course
in keverne1989: its rate would be a free number in place of the timers').

**Arms (iteration 1)**, on S8's params, quick mode (seeds 48, 7; 30 + 30 days), each from a frozen checkout of the commit
that implements this section, after a 2-day smoke test of every readout with both switches on:
- **G1** = S8 + `groomDrive` 1 (control: the drive × incentive alone, timers kept);
- **G2** = S8 + `groomDrive` 1 + `socialUpkeep` 1 (the candidate).
Each: `e-bench --quick` (workers by load), `energy-diagnose --seeds 48,7 --burn-in 30 --days 30`, `groom-diagnose`
(same window; it reads the upkeep rate under `socialUpkeep`), `prescription-ledger --count`; `rhythm-metrics` on a kept
arm.

**Predictions** (against S8's four realizations; moderate confidence unless stated):

| Quantity | S8 mean ± SD | G1 | G2 |
| --- | --- | --- | --- |
| Prescriptions | 76 | 76 (high) | 74 (high) |
| Clamped share of restoration, males / other F / lactating | 0.38 / 0.35 / 0.66 | ≤ 0.10 each | ≤ 0.10 each |
| Grooming, min/day, males | 118.5 ± 4.2 | 70–100 | 55–90 (low) |
| Grooming, other females | 120.5 ± 4.6 | 75–105 | 35–65 (low) |
| Grooming, lactating; of which mothers of infants ≥ 2 y | 237.8 ± 8.4; 332 ± 7 | 70–120; ≤ 130 | 35–80; ≤ 100 (low) |
| Grooming, juveniles 5–12 y | 80.2 ± 6.7 | 50–80 | 25–55 (low) |
| Need rise per day, males / other F / lactating | 0.52 / 0.53 / 0.55 (timers) | unchanged | 0.40–0.55 / 0.20–0.40 / 0.20–0.35 |
| Daylight need, males | 0.328 ± 0.014 | 0.40–0.60 (low) | 0.35–0.60 (low) |
| T-ACT-3 pooled; M; F | 0.196; 0.155; 0.229 | 0.10–0.14; 0.09–0.13; 0.10–0.14 | 0.07–0.11; 0.08–0.12; 0.05–0.09 (low) |
| T-ACT-4 | 0.414 ± 0.015 | 0.37–0.44 | 0.37–0.44 |
| T-ACT-1 | 0.356 ± 0.005 | 0.35–0.38 | 0.35–0.38 |
| T-ACT-2; males' ground km | 0.163 ± 0.003; 1.93 ± 0.07 | 0.16–0.20; 1.9–2.3 (low: a higher need values company more, E5a) | same (low) |
| T-PTY-1 | 3.56 ± 0.11 | 3.4–4.5 (low) | 3.4–4.5 (low) |
| T-SOC-3 reciprocity | 0.947 ± 0.023 | 0.75–0.93 (low: fewer answers to invitations at a met need) | 0.75–0.93 (low) |
| T-SOC-2, -5, -6, -9, -10 | reference spread | inside it (low) | inside it (low) |
| Reserves, every class (%/day) | S8 values | inside S8 mean ± 2 SD or better | same |
| Mothers' eating min/day | 265.8 ± 1.4 | +5 to +20 (E1k's direction) | +5 to +25 |
| Fitted; held-out; held-out without T-HUN-4, T-BRD-1 | S8 mean | fitted lower or inside noise; held-out inside noise | same |
| Viability | pass | pass (high) | pass (high) |

**Kill criteria (iteration 1).** An arm is a null if any holds:
- K1 (harm): a starvation death or failed viability; or a class's 30-day reserve slope below its S8 mean − 2 SD and below
  −0.03%/day (a floor below which no field method resolves a balance: E1k's K1 fired on a −0.005%/day change);
- K2 (mechanism): adults' clamped share ≥ 0.15 in males or other females (the drive × incentive did not take hold); for
  G2 also a prescription count other than 74 or a timer still read under the switch (`scripts/param-reads.ts`);
- K3 (noise): fitted, held-out or held-out without T-HUN-4 and T-BRD-1 worse than the S8 mean beyond noise (z > +2).
Verdict: G2 is a **keep candidate (provisional)** if K1–K3 pass (the count falls by two and T-ACT-3 is no longer encoded
by the timers); G1 is the control (removes nothing) and is recorded. Night safety on a kept arm: adults out of a nest
≤ 3.3% of the night and T-RHY-5 ≤ 0.033 (`rhythm-metrics`, as the S-stack confirms). A grooming share outside its band
(e.g. G2's females below 0.08) is a finding about the bonds the model keeps, never grounds to change a weight or rate.

## 5. Known defects and limits in the code under test

- `scripts/groom-diagnose.ts` (budget): the need-rise readout assumes the timers; fixed before the arms to read the
  upkeep rate under `socialUpkeep` (with the mechanism's commit). The budget's residual (−0.008 to −0.014 per adult-day,
  −0.04 for infants) is unexplained and small (≤ 3%; likely the nursing branches' let-down and tick-order effects);
  deferred.
- Deferred, not part of grooming: the approach goal read live from `x.joinX/joinZ` (`src/sim/execution.ts:588`, E4g §2,
  E5a §2).
- `socialUpkeep` limits (by design, stated before the run): an animal with no bond above its baseline (a new immigrant)
  has no social need, so it seeks no grooming until others' grooming, sharing or support build a bond; play and nursing
  restore the need without building bonds, so juveniles' and infants' bonds can fade while their need is met; bonds to
  members of other communities and to the dead do not count.
- Persistence (+0.35 while a bout's timer runs) stays outside the product (design): a bout can run past a met need until
  its timer ends.

## 6. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

- **Iteration 1** (§4; arms G1 and G2): registered at 1940c7b, before any code of the mechanism existed; implemented at
  5abafba (`src/sim/upkeep.ts`, `life.ts`, `candidates.ts`, `execution.ts` constants, tests/sim-groom-drive.test.ts: 7
  pass; prescription count S8 76, G1 76, G2 74). Switch-off identity: an S8 world hashes the same after 3 days at 4e1fa4d
  and 5abafba (34d7e2cb94a01b6e). Smoke test (seed 48, 1 + 1 days, G1 and G2): every groom-diagnose readout filled; the
  score terms are reported as they enter the score (× n under the switch; fixed in the tool before the arms, residual
  0.04–0.09 = jitter and continuation). Runs from the frozen checkout `run-5abafba` (clean), started 23:12, G1 then G2.
