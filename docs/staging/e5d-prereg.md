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
P. t. verus 40.3, 8.3%; bonobos 27.8, 5.7%; its log model with a chimpanzee sex ratio of 1 and female dispersal gives
4.5% at 22 members and 7.4% at 47; lehmann2008's linear equation 6.1% at 22). If that relation holds within chimpanzees,
the field's 0.12–0.15 is an upper reference for a 22-member community. No chimpanzee
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

### 4.1 Iteration 2 (registered 3 October 2026, after iteration 1's results, before any code of it): only grooming meets the relationship need

**Why (iteration 1, §7).** Under `socialUpkeep` 1 the social need stands for relationship upkeep: it rises by the bond
value the animal's relationships lose, in the units in which grooming restores it while rebuilding bonds (15 per bond
unit). Play (+0.15/h) and nursing (+0.2/h, the infant) still restore the need from v0.1's timer model, yet in the model
neither builds any bond. G2's diagnosis shows the consequence: mothers play 115 min a day with their infants and play
restores 0.289 of their 0.238 daily rise, so 41% of their restoration lands on a met need and they groom 30 min a day;
juveniles' play restores 0.243 of 0.214, infants' nursing 0.340 of 0.258. The mechanism's own accounting is broken there:
an act that maintains no relationship meets a need that stands for relationships. (Disclosure: the change is expected
to raise the grooming of mothers and juveniles, one of the rows G2 missed; its case rests on the mechanism's premise, not
on that row.)

**Change (same switch, a new value; 1 keeps iteration 1's form).** `socialUpkeep` 2 = value 1, and play and nursing
restore no social need (`execution.ts`: the +0.15/h of play and the two +0.2/h of nursing are not applied): only grooming,
whose bond building fixes the exchange rate, meets the relationship need. No new number. Not chosen: letting play and
nursing build bonds at the same exchange rate (0.01/h and 0.013/h), which would add an effect of play on relationships
that no source in hand supports. Count 74, as value 1.

**Arm G3** = S8 + `groomDrive` 1 + `socialUpkeep` 2, from a frozen checkout of the commit that implements this section,
after a 2-day smoke test with the switch on: e-bench quick, energy-diagnose, groom-diagnose (its budget counts no play or
nursing restoration under value 2), rhythm-metrics (night safety); and rhythm-metrics for G1 again (killed on 2 October).

**Predictions** (against S8's four realizations, G2 in brackets; low confidence unless stated):

| Quantity | S8 mean ± SD | G3 |
| --- | --- | --- |
| Prescriptions | 76 | 74 (high) |
| Clamped share: lactating; juveniles; infants 1–6 y | 0.66; 0.28; — | ≤ 0.10; ≤ 0.10; ≤ 0.15 (moderate) [0.41; 0.29; 0.31] |
| Grooming, min/day: lactating; juveniles; infants 1–6 y | 238; 80; 270 | 40–90; 30–60; 40–100 [30; 15; 29] |
| Grooming, min/day: males; other females | 119; 121 | 70–95; 35–65 [83; 46] |
| Daylight need: lactating; juveniles | 0.116; 0.345 | 0.25–0.50; 0.35–0.60 [0.115; 0.237] |
| T-ACT-3 pooled; M; F | 0.196; 0.155; 0.229 | 0.08–0.11; 0.10–0.13; 0.06–0.09 [0.085; 0.117; 0.058] |
| T-ACT-2; T-PTY-1 | 0.163; 3.56 | 0.165–0.20; 3.2–4.2 (a higher need in mothers and juveniles values company more) |
| T-SOC-9 | 0.163 ± 0.060 | 0.10–0.35 [0.536] |
| Reserves, every class | S8 values | inside S8 mean ± 2 SD or above −0.03%/day (moderate) |
| Fitted; held-out; held-out without T-HUN-4, T-BRD-1 | S8 mean | inside noise |
| Viability | pass | pass (high) |

**Kill criteria and verdict** as iteration 1 (§4: K1 harm, K2 mechanism with the count 74 and the timers not read, K3
noise); G3 is a keep candidate (provisional) if K1–K3 pass. Night safety as registered.

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
- **Iteration 2** (§4.1; arm G3 = S8 + `groomDrive` 1 + `socialUpkeep` 2): registered 3 October 2026 in this commit, after
  iteration 1's results (§7) and before any code of it.

## 7. Iteration 1 results (arms G1, G2; run-5abafba, clean; every number below printed by the stage's `e5d_judge.py`, `diag_compact.py`, `extra_blocks.py` from the JSON)

Runs: e-bench quick, energy-diagnose and groom-diagnose (seeds 48 and 7; 30 + 30 days) for each arm, 23:11–23:26 on
2 October, `--workers 2` (load 5–9); cohesion-diagnose on S8 and G1 afterwards (same window). The night-safety run of G1
(rhythm-metrics, `--workers 1`) was killed by the session's interruption at 23:35 and is re-run with iteration 2.
Deaths: none in G1; one in G2 (an adult male, respiratory outbreak, seed 7); no starvation.

```
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.94, 1.46, 2.46, 3.02 (mean 2.22, sd 0.67; used 0.69) | G1.json: 2.42, Δ +0.21, z +0.3 (inside noise) | G2.json: 5.33, Δ +3.11, z +4.0 RESULT
  held-out           (13 rows) ref 3.45, 4.91, 5.19, 5.19 (mean 4.69, sd 0.83; used 1.26) | G1.json: 3.85, Δ -0.84, z -0.6 (inside noise) | G2.json: 4.12, Δ -0.57, z -0.4 (inside noise)
  held-out w/o rare  (12 rows) ref 3.45, 4.02, 4.23, 3.24 (mean 3.74, sd 0.47; used 0.48) | G1.json: 3.60, Δ -0.14, z -0.3 (inside noise) | G2.json: 4.09, Δ +0.36, z +0.7 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-3   fitted   ref 0.25±0.03 | G1.json 0.00 (pass) | G2.json 0.11 (fail)
   T-COM-8   fitted   ref 0.00±0.00 | G1.json 0.40 (fail) | G2.json 0.00 (pass)
   T-HUN-1   fitted   ref 0.28±0.33 | G1.json 1.06 (fail) | G2.json 0.35 (inconclusive)
   T-HUN-4   held-out ref 0.95±0.80 | G1.json 0.25 (fail) | G2.json 0.02 (fail)
   T-SOC-3   held-out ref 0.42±0.07 | G1.json 0.00 (pass) | G2.json 0.19 (fail)
   T-SOC-5   held-out ref 0.00±0.00 | G1.json 0.00 (pass) | G2.json 0.16 (fail)
```

| Row (pooled; by sex where scored) | S8 runs | S8 mean ± SD | G1 | G2 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.349 / 0.356 / 0.359 / 0.362 | 0.356 ± 0.005 | 0.367 (z +1.6) | 0.359 (z +0.5) |
| T-ACT-1 male | 0.346 / 0.347 / 0.361 / 0.369 | 0.356 ± 0.011 | 0.354 (z -0.1) | 0.351 (z -0.4) |
| T-ACT-1 female | 0.352 / 0.364 / 0.357 / 0.356 | 0.357 ± 0.005 | 0.377 (z +3.5) | 0.366 (z +1.6) |
| T-ACT-2 | 0.160 / 0.161 / 0.166 / 0.164 | 0.163 ± 0.003 | 0.225 (z +20.5) | 0.173 (z +3.3) |
| T-ACT-2 male | 0.184 / 0.181 / 0.205 / 0.201 | 0.193 ± 0.012 | 0.236 (z +3.2) | 0.207 (z +1.0) |
| T-ACT-2 female | 0.141 / 0.145 / 0.134 / 0.136 | 0.139 ± 0.005 | 0.217 (z +14.6) | 0.145 (z +1.0) |
| T-ACT-3 | 0.210 / 0.200 / 0.185 / 0.190 | 0.196 ± 0.011 | 0.119 (z -6.3) | 0.085 (z -9.0) |
| T-ACT-3 male | 0.184 / 0.155 / 0.136 / 0.143 | 0.155 ± 0.021 | 0.122 (z -1.4) | 0.117 (z -1.6) |
| T-ACT-3 female | 0.230 / 0.237 / 0.225 / 0.226 | 0.229 ± 0.006 | 0.117 (z -18.1) | 0.058 (z -27.6) |
| T-ACT-4 | 0.431 / 0.421 / 0.405 / 0.397 | 0.414 ± 0.015 | 0.360 (z -3.2) | 0.393 (z -1.2) |
| T-PTY-1 | 3.433 / 3.624 / 3.498 / 3.679 | 3.559 ± 0.113 | 4.680 (z +8.9) | 3.302 (z -2.0) |
| T-SOC-2 | 0.824 / 0.857 / 0.895 / 0.792 | 0.842 ± 0.044 | 0.842 (z +0.0) | 0.882 (z +0.8) |
| T-SOC-3 | 0.926 / 0.970 / 0.928 / 0.964 | 0.947 ± 0.023 | 0.745 (z -7.7) | 0.867 (z -3.0) |
| T-SOC-5 | 0.361 / 0.289 / 0.472 / 0.508 | 0.407 ± 0.101 | 0.487 (z +0.7) | 0.121 (z -2.5) |
| T-SOC-6 | 0.423 / 0.437 / 0.382 / 0.503 | 0.436 ± 0.050 | 0.462 (z +0.5) | 0.474 (z +0.7) |
| T-SOC-9 | 0.246 / 0.124 / 0.165 / 0.116 | 0.163 ± 0.060 | 0.124 (z -0.6) | 0.536 (z +5.6) |
| T-SOC-10 | 0.276 / 0.269 / 0.246 / 0.296 | 0.271 ± 0.021 | 0.256 (z -0.7) | 0.249 (z -1.0) |
| T-RNG-4 | 1.866 / 1.974 / 2.238 / 2.363 | 2.110 ± 0.230 | 2.630 (z +2.0) | 1.904 (z -0.8) |
| T-HUN-1 | 19.945 / 24.199 / 33.907 / 38.315 | 29.092 ± 8.482 | 46.126 (z +1.8) | 32.088 (z +0.3) |

| Reserves ÷ store, % per day (OLS over the window) | S8 runs | S8 mean ± SD | G1 | G2 |
| --- | --- | --- | --- | --- |
| adult male | +0.000 / +0.003 / -0.006 / +0.020 | +0.005 ± +0.011 | +0.016 (z +0.9) | -0.005 (z -0.7) |
| female, other | +0.014 / +0.009 / -0.000 / -0.002 | +0.005 ± +0.007 | +0.013 (z +0.9) | -0.023 (z -3.5) |
| female, lactating | +0.014 / -0.002 / -0.008 / -0.002 | +0.000 ± +0.010 | +0.003 (z +0.2) | +0.006 (z +0.5) |
| juvenile 5–12 y | +0.018 / -0.012 / +0.004 / +0.000 | +0.003 ± +0.012 | -0.029 (z -2.3) | -0.013 (z -1.1) |
| infant 2–5 y | +0.004 / +0.003 / -0.002 / +0.006 | +0.003 ± +0.003 | -0.001 (z -1.0) | +0.020 (z +4.9) |
| infant 0.5–2 y | +0.015 / -0.007 / -0.016 / -0.006 | -0.003 ± +0.013 | +0.006 (z +0.6) | -0.002 (z +0.1) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± +0.000 | +0.000 (z +nan) | +0.000 (z +nan) |

| Ground km / eating min (energy-diagnose) | S8 runs | S8 mean ± SD | G1 | G2 |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 1.85 / 1.88 / 1.98 / 1.99 | 1.93 ± 0.07 | 2.64 (z +9.1) | 2.07 (z +1.8) |
| adult male: eatingMin | 236.75 / 237.12 / 236.61 / 237.22 | 236.92 ± 0.29 | 241.46 (z +13.9) | 236.10 (z -2.5) |
| female, other: groundKm | 1.49 / 1.49 / 1.56 / 1.51 | 1.51 ± 0.03 | 2.21 (z +20.2) | 1.64 (z +3.6) |
| female, other: eatingMin | 228.19 / 223.59 / 220.90 / 223.84 | 224.13 ± 3.02 | 226.65 (z +0.7) | 225.50 (z +0.4) |
| female, lactating: groundKm | 1.41 / 1.45 / 1.45 / 1.47 | 1.45 ± 0.02 | 2.35 (z +33.8) | 1.54 (z +3.7) |
| female, lactating: eatingMin | 265.42 / 264.09 / 267.41 / 266.23 | 265.79 ± 1.40 | 279.58 (z +8.8) | 286.36 (z +13.2) |
| juvenile 5–12 y: groundKm | 1.68 / 1.64 / 1.74 / 1.82 | 1.72 ± 0.08 | 2.50 (z +9.1) | 1.67 (z -0.6) |
| juvenile 5–12 y: eatingMin | 245.17 / 245.93 / 248.06 / 241.31 | 245.12 ± 2.82 | 270.61 (z +8.1) | 254.96 (z +3.1) |

| Grooming (groom-diagnose, simulation truth, per subject-day) | S8 runs | S8 mean ± SD | G1 | G2 |
| --- | --- | --- | --- | --- |
| adult male: grooming min/day (daylight, given or received) | 119.329 / 122.415 / 119.782 / 112.589 | 118.529 ± 4.187 | 86.288 (z -6.9) | 82.580 (z -7.7) |
| female, other: grooming min/day (daylight, given or received) | 127.250 / 117.345 / 119.687 / 117.769 | 120.513 ± 4.606 | 88.408 (z -6.2) | 45.725 (z -14.5) |
| female, lactating: grooming min/day (daylight, given or received) | 242.802 / 246.814 / 228.941 / 232.666 | 237.806 ± 8.389 | 82.553 (z -16.6) | 30.023 (z -22.2) |
| lact: infant < 2 y: grooming min/day (daylight, given or received) | 151.635 / 152.323 / 133.889 / 134.997 | 143.211 ± 10.138 | 82.304 (z -5.4) | 34.336 (z -9.6) |
| lact: infant ≥ 2 y: grooming min/day (daylight, given or received) | 333.968 / 341.304 / 323.993 / 330.334 | 332.400 ± 7.227 | 82.802 (z -30.9) | 25.709 (z -38.0) |
| adolescent 12–15 y: grooming min/day (daylight, given or received) | 99.953 / 87.965 / 90.429 / 82.193 | 90.135 ± 7.400 | 66.506 (z -2.9) | 40.138 (z -6.0) |
| juvenile 5–12 y: grooming min/day (daylight, given or received) | 89.978 / 78.953 / 74.651 / 77.288 | 80.218 ± 6.744 | 51.910 (z -3.8) | 14.800 (z -8.7) |
| infant 1–6 y: grooming min/day (daylight, given or received) | 273.744 / 278.297 / 261.081 / 266.201 | 269.831 ± 7.675 | 77.831 (z -22.4) | 29.239 (z -28.0) |
| adult male: rest min/day (daylight) | 157.984 / 158.801 / 160.210 / 151.002 | 156.999 ± 4.103 | 153.876 (z -0.7) | 190.146 (z +7.2) |
| female, other: rest min/day (daylight) | 204.867 / 207.689 / 201.784 / 214.738 | 207.269 ± 5.532 | 196.683 (z -1.7) | 277.440 (z +11.3) |
| female, lactating: rest min/day (daylight) | 79.801 / 79.707 / 89.377 / 91.349 | 85.058 ± 6.178 | 134.222 (z +7.1) | 194.218 (z +15.8) |
| juvenile 5–12 y: rest min/day (daylight) | 124.316 / 128.839 / 124.079 / 128.069 | 126.326 ± 2.479 | 77.510 (z -17.6) | 164.842 (z +13.9) |
| adult male: daylight need | 0.342 / 0.325 / 0.309 / 0.335 | 0.328 ± 0.014 | 0.532 (z +12.8) | 0.504 (z +11.0) |
| female, other: daylight need | 0.312 / 0.352 / 0.359 / 0.331 | 0.339 ± 0.021 | 0.530 (z +8.0) | 0.319 (z -0.8) |
| female, lactating: daylight need | 0.107 / 0.100 / 0.126 / 0.129 | 0.116 ± 0.014 | 0.406 (z +18.3) | 0.115 (z -0.0) |
| juvenile 5–12 y: daylight need | 0.341 / 0.357 / 0.332 / 0.349 | 0.345 ± 0.011 | 0.626 (z +23.5) | 0.237 (z -9.0) |
| adult male: restoration at a full need (share) | 0.377 / 0.399 / 0.398 / 0.362 | 0.384 ± 0.018 | 0.027 (z -17.9) | 0.029 (z -17.8) |
| female, other: restoration at a full need (share) | 0.394 / 0.335 / 0.348 / 0.337 | 0.353 ± 0.028 | 0.030 (z -10.4) | 0.113 (z -7.7) |
| female, lactating: restoration at a full need (share) | 0.670 / 0.672 / 0.651 / 0.653 | 0.661 ± 0.011 | 0.029 (z -51.3) | 0.414 (z -20.0) |
| lact: infant ≥ 2 y: restoration at a full need (share) | 0.770 / 0.773 / 0.764 / 0.765 | 0.768 ± 0.004 | 0.032 (z -157.2) | 0.515 (z -54.0) |
| juvenile 5–12 y: restoration at a full need (share) | 0.312 / 0.285 / 0.244 / 0.283 | 0.281 ± 0.028 | 0.004 (z -8.9) | 0.288 (z +0.2) |
| adult male: need rise per day (timers or upkeep) | 0.516 / 0.518 / 0.519 / 0.514 | 0.517 ± 0.002 | 0.524 (z +2.9) | 0.483 (z -13.6) |
| female, other: need rise per day (timers or upkeep) | 0.527 / 0.524 / 0.526 / 0.528 | 0.526 ± 0.002 | 0.530 (z +2.0) | 0.236 (z -152.0) |
| female, lactating: need rise per day (timers or upkeep) | 0.545 / 0.547 / 0.547 / 0.547 | 0.546 ± 0.001 | 0.544 (z -2.2) | 0.238 (z -275.9) |
| juvenile 5–12 y: need rise per day (timers or upkeep) | 0.540 / 0.538 / 0.540 / 0.541 | 0.540 ± 0.001 | 0.541 (z +0.9) | 0.214 (z -231.5) |

Grooming in detail (simulation truth; compare §2.1):

| readout (G1 / G2) | adult male | other adult F | lactating | lact., infant ≥ 2 y | juvenile 5–12 y |
| --- | --- | --- | --- | --- | --- |
| grooming, given or received (daylight min/day) | 86 / 83 | 88 / 46 | 83 / 30 | 83 / 26 | 52 / 15 |
|   given / mutual (min/day) | 64·36 / 63·32 | 64·34 / 28·12 | 68·17 / 21·3 | 73·11 / 21·1 | 47·21 / 10·4 |
| rest, not groomed (daylight min/day) | 154 / 190 | 197 / 277 | 134 / 194 | 129 / 176 | 78 / 165 |
| free time (daylight − eat − forage − travel − nest, min/day) | 275 / 294 | 303 / 338 | 296 / 342 | 312 / 357 | 230 / 280 |
| daylight social need n (mean) | 0.53 / 0.50 | 0.53 / 0.32 | 0.41 / 0.12 | 0.37 / 0.05 | 0.63 / 0.24 |
| need budget/day: timers | 0.52 / 0.48 | 0.53 / 0.24 | 0.54 / 0.24 | 0.54 / 0.23 | 0.54 / 0.21 |
| need budget/day: restored by grooming | 0.51 / 0.47 | 0.51 / 0.24 | 0.37 / 0.13 | 0.33 / 0.09 | 0.28 / 0.08 |
| need budget/day: restored at a full need (clamped) | 0.01 / 0.01 | 0.02 / 0.03 | 0.02 / 0.17 | 0.02 / 0.24 | 0.00 / 0.09 |
|   clamped share of all restoration | 3% / 3% | 3% / 11% | 3% / 41% | 3% / 51% | 0% / 29% |
| bouts started: n at start | 0.62 / 0.60 | 0.63 / 0.43 | 0.51 / 0.18 | 0.48 / 0.05 | 0.71 / 0.46 |
|   score: need term (0.55·n) | 0.34 / 0.33 | 0.35 / 0.24 | 0.28 / 0.10 | 0.26 / 0.03 | 0.39 / 0.26 |
|   score: partner terms (bond, kin, reciprocity, rank) | 0.23 / 0.23 | 0.14 / 0.11 | 0.20 / 0.05 | 0.22 / 0.02 | 0.37 / 0.23 |
|   score: invitation | 0.11 / 0.10 | 0.14 / 0.09 | 0.06 / 0.03 | 0.02 / 0.00 | 0.03 / 0.03 |
|   score: costs | -0.16 / -0.16 | -0.18 / -0.19 | -0.19 / -0.19 | -0.19 / -0.19 | -0.19 / -0.17 |
|   score chosen / best non-grooming option | 0.56·0.47 / 0.53·0.45 | 0.48·0.44 / 0.30·0.38 | 0.38·0.40 / 0.11·0.36 | 0.35·0.40 / 0.02·0.35 | 0.65·0.48 / 0.43·0.42 |
|   partner: mean bond; share kin | 0.58·0.20 / 0.59·0.17 | 0.48·0.20 / 0.45·0.24 | 0.71·0.60 / 0.68·0.58 | 0.81·0.75 / 0.81·0.76 | 0.67·0.63 / 0.63·0.63 |
|   displaced act: rest / feed / travel (share) | 0.28·0.25·0.07 / 0.27·0.29·0.08 | 0.33·0.22·0.08 / 0.32·0.26·0.11 | 0.25·0.32·0.08 / 0.27·0.28·0.08 | 0.21·0.35·0.07 / 0.25·0.28·0.09 | 0.13·0.33·0.22 / 0.21·0.32·0.23 |
| decisions with a groom option that chose another act: best groom / best rest score | 0.24·0.30 / 0.22·0.29 | 0.19·0.28 / 0.09·0.28 | 0.15·0.22 / 0.03·0.22 | 0.15·0.21 / 0.01·0.21 | 0.24·0.21 / 0.06·0.24 |
| a settled partner in reach (share of daylight) | 0.38 / 0.38 | 0.39 / 0.32 | 0.55 / 0.59 | 0.61 / 0.67 | 0.35 / 0.27 |
| stress; affiliation (daylight) | 0.13·0.08 / 0.11·0.07 | 0.13·0.07 / 0.14·0.03 | 0.14·0.12 / 0.14·0.06 | 0.14·0.14 / 0.14·0.06 | 0.16·0.05 / 0.16·0.01 |

T-SOC-9's sample, and what restores the need of mothers, juveniles and infants:

| run | T-SOC-9 per seed (individuals with ≥ 3 PC–MC pairs) | truth: reconciliations ÷ decided conflicts | detected conflicts (T-SOC-10 denominator) |
| --- | --- | --- | --- |
| S8q | 0.206 (6) / 0.286 (8) | 0.161 / 0.222 | 107 / 194 |
| S8q1 | 0.247 (15) / 0.000 (2) | 0.205 / 0.177 | 158 / 54 |
| S8q2 | 0.125 (2) / 0.205 (9) | 0.137 / 0.190 | 49 / 175 |
| S8q3 | 0.149 (14) / 0.083 (4) | 0.185 / 0.181 | 203 / 115 |
| G1 | 0.142 (16) / 0.107 (9) | 0.168 / 0.138 | 272 / 251 |
| G2 | 0.343 (3) / 0.729 (4) | 0.189 / 0.229 | 76 / 93 |

| run | class | need rise/day | restored by grooming given / received | by play | by nursing | at a full need | play min/day |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S8q | female, lactating | 0.545 | 0.680 / 0.886 | 0.121 | 0.000 | 1.130 | 48 |
| S8q | juvenile 5–12 y | 0.540 | 0.253 / 0.326 | 0.209 | 0.000 | 0.246 | 83 |
| S8q | infant 1–6 y | 0.546 | 0.523 / 1.343 | 0.074 | 0.320 | 1.666 | 29 |
| G1 | female, lactating | 0.544 | 0.204 / 0.169 | 0.187 | 0.000 | 0.016 | 74 |
| G1 | juvenile 5–12 y | 0.541 | 0.141 / 0.138 | 0.244 | 0.000 | 0.002 | 97 |
| G1 | infant 1–6 y | 0.544 | 0.005 / 0.412 | 0.125 | 0.283 | 0.250 | 49 |
| G2 | female, lactating | 0.238 | 0.064 / 0.062 | 0.289 | 0.000 | 0.172 | 115 |
| G2 | juvenile 5–12 y | 0.214 | 0.029 / 0.047 | 0.243 | 0.000 | 0.092 | 97 |
| G2 | infant 1–6 y | 0.258 | 0.000 / 0.150 | 0.096 | 0.340 | 0.312 | 38 |

Where G1's extra walking goes (cohesion-diagnose, S8 → G1, km per day by part):

| class | km/day S8 → G1 | joined trips | to callers | own trips |
| --- | --- | --- | --- | --- |
| adult male | 1.90 → 2.71 | 0.46 → 1.03 | 0.34 → 0.64 | 0.64 → 0.45 |
| lactating | 1.52 → 2.52 | 0.23 → 0.81 | 0.17 → 0.65 | 0.70 → 0.51 |
| female other | 1.54 → 2.40 | 0.47 → 1.00 | 0.34 → 0.65 | 0.38 → 0.30 |
| adolescent | 2.11 → 2.93 | 0.63 → 1.10 | 0.36 → 0.65 | 0.48 → 0.44 |
joins per subject-day 4.98 → 11.91; pair time together 0.132 → 0.193; T-PTY-1 (tool) 3.43 → 4.68

**Kill criteria.**
- G1: K1 passes (no death; juveniles' slope −0.029%/day is below S8's mean − 2 SD but above the −0.03 floor; every other
  class inside or better). K2 passes (clamped share 0.027 males, 0.030 other females). K3 passes (fitted z +0.3,
  held-out −0.6, without the rare rows −0.3). Prescriptions 76 (it removes nothing).
- G2: K1 passes (no starvation; other females −0.023%/day, below S8's mean − 2 SD, above the floor). K2 passes (0.029,
  0.113; count 74; the timers do not move the world under the switch, tests/sim-groom-drive.test.ts). **K3 fails: fitted
  z +4.0** (5.33 against 2.22). The excess is T-SOC-9 (distance 2.26 against 0.05 ± 0.09): its corrected conciliatory
  tendency rests on 3 and 4 individuals with three or more PC–MC pairs (the reference's runs: 2–16), while simulation
  truth (reconciliations per decided conflict, 0.189 / 0.229) is inside the reference's 0.137–0.222. Without T-SOC-9 G2's
  fitted sum is 3.07 against 2.17 (z +1.1, printed by the stage's check). Held-out and held-out without the rare rows are
  inside noise. **G2 is a null by its registered rule.**

**Predictions scored.**
- G1: count 76, clamped share ≤ 0.10, grooming of males (86), other females (88), lactating (83), mothers of infants
  ≥ 2 y (83) and juveniles (52) inside their ranges, need rise unchanged, males' daylight need 0.53 (0.40–0.60), T-ACT-3
  0.119 / M 0.122 / F 0.117 (all inside), T-ACT-1 0.367, mothers' eating +14 min, sums, viability: held. Missed: T-ACT-4
  0.360 (registered 0.37–0.44), T-ACT-2 0.225 (0.16–0.20), males' ground km 2.64 (1.9–2.3), T-PTY-1 4.68 (3.4–4.5), T-SOC-3
  0.745 (0.75–0.93; now inside its field band 0.45–0.80), juveniles' reserves (below S8's 2-SD range).
- G2: count 74; grooming of males 83 (55–90), other females 46 (35–65), mothers of infants ≥ 2 y 26 (≤ 100); need rise per
  day (males 0.48, other females 0.24, lactating 0.24: inside); T-ACT-3 0.085 / M 0.117 / F 0.058 (all inside the
  registered ranges); T-ACT-4 0.393, T-ACT-1 0.359, T-ACT-2 0.173, males' ground km 2.07, T-PTY-1 3.30, T-SOC-3 0.867;
  mothers' eating +21 min (+5 to +25): held. Missed: other females' clamped share 0.113 (≤ 0.10), lactating grooming 30
  (35–80), juveniles' 15 (25–55), T-SOC-5 0.121 and T-SOC-9 0.536 (outside the reference spread), the fitted sum.

**Reading.**
1. *The drive × incentive works as stated in both arms.* Grooming at a met need goes (clamped share 0.38 → 0.03 for
   males), mothers no longer groom their older infants at a need of 0.03 (332 → 83 or 26 min a day; Gombe mothers groom
   infants about 3% of the time), reciprocity falls toward its band (T-SOC-3 0.947 → 0.745 / 0.867).
2. *G1: the need, now held where grooming pays (males 0.33 → 0.53, juveniles 0.35 → 0.63), is the drive E5a's company
   value reads.* Freed grooming time goes to joining (joined trips +0.5 km a day per class) and approaching callers
   (+0.3–0.5 km), not to rest: joins per subject-day 5.0 → 11.9, parties 3.6 → 4.7, every class walks 0.7–1.0 km a day more,
   hunting 29 → 46. Inside their bands except hunting, and the sums are inside noise; but the field gives spare time to
   rest (lehmann2008, couturier2022), and here company is valued by a need that company does not relieve (only grooming,
   play and nursing restore it).
3. *G2: relationship upkeep sets the need's rise by the bonds each animal holds above baseline.* Males hold about twice
   the value of females (rise 0.48 against 0.24 a day), so males groom about as in G1 (83 min, T-ACT-3 M 0.117) and
   females half (46, 30; T-ACT-3 F 0.058, below its band); spare time goes to rest (rest +33 to +109 min a day; T-ACT-2
   0.173, parties 3.3: no company cascade, because only males' need stays high). The females' shortfall has a specific
   cause in the mechanism, not in its inputs: under `socialUpkeep` the need stands for relationship upkeep, yet play and
   nursing still restore it without building any bond. Mothers play 115 min a day with their infants (S8 48) and play
   restores 0.289 of their 0.238 daily rise, so 41% of mothers' restoration lands on a met need and they groom 30 min;
   juveniles' play restores 0.243 of 0.214; infants' nursing 0.340 of 0.258. G2's low female affiliation is also why its
   T-SOC-9 inflates (a corrected tendency rises as baseline affiliation falls) on few conflicts (76 / 93 detected against
   49–203).
4. *T-ACT-3's comparison* (§1.1): field 0.15 (M) and 0.12 (F) from a community of at least 88; the model's is 22.

**Verdict (iteration 1).** G1 (`groomDrive`) passes the kill criteria; it removes no prescription, so it is a candidate
correction only (T-ACT-3 and T-SOC-3 into their bands; cost: company-seeking walks, hunting). G2 (`groomDrive` +
`socialUpkeep`) removes both timers (76 → 74) and its spare time goes to rest as in the field, but it is a null by K3
(T-SOC-9 on 3–4 individuals), with the females' grooming below its band traced to a defect of the mechanism's own
accounting (play and nursing restore a relationship need while building no relationship).
