# Stage E2e pre-registration: pre-dawn nest holding (company and insulation)

Written 1 October 2026, before the first run of changed code. Track E rule: field values of behaviour are targets,
never inputs. Branch `e2e-predawn` (from `track-e` 8919bb2; every Track E switch off by default). Sources: research.md
and e-sources.md "Addendum: E2e pre-dawn" (this stage), E2b, E2c and E2d addenda. Readouts committed first as
db010f4 ("E2e readouts").

## 1. The problem, measured on existing code (seed 48, 2-day smoke, no burn-in; the 30 + 30 reference comes in §6)

Reference **R0** = `{"rhythmSleep":1,"rhythmHeat":1,"departRace":1,"nestLightDecide":1,"rhythmCircadian":1}`.

- `rhythmDarkW` is **not read on R0**: `scripts/lib/prescriptions.ts` ACTIVE_WHEN (not while `rhythmCircadian` is 1),
  and `src/sim/candidates.ts:234-237` (the circadian nest drive replaces `nestValue`). The brief's target "a nest value
  without `rhythmDarkW`" is therefore already met on R0. What holds an awake adult before dawn on R0 is the **night
  menu** (`PHASE_ACTIONS.night`, `src/sim/menu.ts:60`): no trip or feeding is offered to a rules-driven adult until
  daylight > 0.03. Every adult leaves at **−13 min** (p10–p90 −13 to −9), the first ticks of the dawn menu; 98% before
  sunrise. The menu is a counted prescription (unless `rhythmFreeNight` is 1).
- With `rhythmFreeNight` 1 (the menu off for rules-driven chimps) adults leave at waking: median −112 min (last circadian
  waking −114, p10–p90 −123 to −105), feed in the dark (65% of the 05:00 hour feeding), and are out of a nest 14.6% of
  night time. **Nothing in the values makes an awake animal stay in its nest before dawn.**
- Waking is synchronous within ~20 min: every oscillator is entrained by the same sky.
- Independent animals of 5–8 y (argmax rules below `rgMinAge` 8, no menu) are out of a nest **94%** of the two hours
  before sunrise (570 m per animal-morning). This is a night-safety defect **of R0 itself** (§5 says how the kill
  criterion treats it).
- Co-departures (another adult of the community leaving its nest within 5 min and 50 m): 66% on these 2 days (the
  previous agent's 30-day figure, 43%, is unverified).

The decisive test of any holder is therefore the **free-night context** (R0 + `rhythmFreeNight` 1), where the menu
does not hold. On R0 itself a holder can only act after the menu opens.

## 2. Arm S (social, the live arm): company at the nest

### 2.1 The gap
- C13e (`joinChoice`, field 1) gives *joining* a departing leader a company value (`joinValue`, candidates.ts:417:
  `joinBase + joinBondW·bond + joinAllyW·[ally] + joinRankW·[leader dominates] + sociability·partyFollowSocialW + hoo
  − joinStayW·stay − 0.3·rain`). *Staying* in a nest beside companions carries no company value at all, so an awake
  animal's own trip in the dark costs it nothing socially.
- `departAudience` (candidates.ts:1082) skips animals in a finished nest (`action === 'nest' && phase >= 2`), so the
  moving-together procedure (`departPersist`, field 1: attempt, check `departCheckMin`, abandon, re-launch after
  `departRetryMin`, go alone after `departPersistMaxMin`) never coordinates a departure from a nest.
- Joining a leader and party follow are not offered while daylight < 0.1 (candidates.ts:193 `night`, 509, 474).

### 2.2 Mechanism (two switches; the arm is both on)
- **`nestCompany`** (0/1): the company of a nest-mate is worth the same whether the pair moves or stays. An animal of
  5 y or more in its own finished nest is offered staying (the own-nest option) with the company value of its best
  nest-mate added: the maximum, over own-community animals of 12 y or more in a nest (`action === 'nest'`, asleep or
  awake: a sleeping companion is also left behind) within `partyLinkM` (50 m, field), of `joinBase + joinBondW·bond +
  joinAllyW·[ally] + joinRankW·[nest-mate dominates] + sociability·partyFollowSocialW`. These are C13e's join terms
  without the hoo, the stay cost and rain (which belong to a departure). **No new magnitude**: the C13e terms are reused
  unchanged (they are design assumptions there, labelled as such; the hoo weight is C13e's one fitted value and is not
  used). Dependants (who follow their mother) are unchanged.
- **`nestAudience`** (0/1): `departAudience` counts awake animals in a finished nest (circadian latch off, or no latch
  when `rhythmCircadian` is 0) as the audience a departure leaves behind. With `departPersist` 1 a departure from a nest
  with an awake audience becomes an attempt (wait, abandon, re-launch, go alone after 13 min), as by day. Sleeping
  nest-mates are not audience: they cannot join an attempt (design; they still give company under `nestCompany`).
- Nothing else changes: the join value, the hoo, the night gate on joining, the menus.
- Evidence: direction from rissGoodall1976 (captive group settles and leaves within ~5 min, secondary through
  anderson2019) [L] and janmaat2014 (adult males at the nest move departure, Table 1) [M]; the reuse of the C13e terms
  and the audience definition are **design assumptions**.

### 2.3 Predictions (registered before any run)
On R0 (menu on):
- **P-S1** co-departure share (5 min, 50 m) rises by ≥ 10 points over R0 (moderate confidence).
- **P-S2** median adult departure moves later than R0's (direction; magnitude unknown) and the share before sunrise
  falls (direction). T-FOOD-10 (0.08–0.30) and staged T-RHY-3 (0.05–0.35) reached: not predicted (low confidence either
  way: if company outweighs a trip's margin the release is hunger, which could push departures past sunrise).
- **P-S3** independent 5–8 y out of a nest before dawn: falls below R0's (direction, moderate), because the mother's
  bond enters their nest value; below 50% not predicted.
In the free-night context (R0 + `rhythmFreeNight` 1, a diagnostic arm, §6):
- **P-S4** adults' median departure later than free-night alone (−112); reaching −30 or later: not predicted (low
  confidence), because waking is synchronous and company is symmetric: once one leaves, the others' company falls.
- **P-S5** adult night out-of-nest share falls from free-night's 14.6% toward R0's.

## 3. Arm T (thermal, a cheap registered check): insulation of the nest

### 3.1 Mechanism (only if §3.2 passes)
- **`nestInsulation`** (0/1): in a finished nest the body's conductance to air is multiplied by `nestInsulationF` < 1
  (a nest slows heat loss: stewart2018, direction [M]; its 7.32 ± 3.29 °C is a water-bottle temperature difference, not
  a conductance, so the factor would be a design assumption bounded by it). Staying then has thermal value only through
  E2a's existing heat balance (`heatStep`, `shelterValue`): a heat debt out of the nest is what makes staying worth
  anything.

### 3.2 The offline check that decides whether T is built (registered first)
- Script: `artifacts/track-e-session-scratch-2026-10-01/thermal-offline.ts` (previous agent; re-run here from this
  branch's head, unchanged model code). It evaluates E2a's heat balance (src/sim/rhythm.ts `heatStep`, the E2a mass,
  conductance and metabolic multiples) for an adult male (20 y), adult female (20 y), juvenile 5 y and 8 y: the lower
  critical temperature asleep / resting / feeding, dry; and the thermal load after 1 h out of a nest at the model's
  pre-dawn air (`tempBaseC − tempNightCoolC`) with rain 0, 0.02, 0.05, 0.1, 0.3, resting and feeding.
- **Decision rule:** build and run T only if some class (juveniles included) reaches a thermal load below −0.05 (the
  readout's "cold" line) within 1 h out of a nest, dry, at the pre-dawn air, at rest or feeding; or if pre-dawn rain
  ≥ 0.05 falls in ≥ 5% of the pre-dawn window on R0 (30 + 30 run). Otherwise the result is **"inert, not run"**.
- **Prediction:** inert. A dry adult's lower critical temperature asleep is near 8 °C against ~15 °C pre-dawn air
  (previous agent, unverified); pre-dawn rain fell in 0% of the window on the 2-day smoke (0.8% per the previous agent).
  Field context: night air at the Toro-Semliki sleeping platforms averaged 20.95 °C (range of nightly means 18.96–24.17;
  samsonHunt2012) [M]; the Kibale daily minimum of 16.2 °C quoted by the previous agent was not traced to a source and is
  not used.

### 3.3 Result of the offline check (run after §3.2 was committed, 77c4163; unchanged model code)
- Output: `thermal-offline.ts` from this branch's head (scratch copy; printed values). Pre-dawn air in the model
  (`tempBaseC − tempNightCoolC`) 15 °C. Lower critical temperature, dry, asleep / resting / feeding: adult male (39.0 kg)
  8.2 / 1.0 / −2.8 °C; adult female (31.3 kg) 9.3 / 2.3 / −1.3 °C; juvenile 5 y (16.4 kg) 12.2 / 6.0 / 2.8 °C; juvenile
  8 y (24.8 kg) 10.4 / 3.7 / 0.3 °C. Thermal load after 1 h out of a nest, dry, resting or feeding: **0.000 for every
  class**. A debt below −0.05 appears only with rain ≥ 0.05 (5-y juvenile −0.117 feeding, −0.268 resting; 8 y −0.134
  resting; adult female −0.071 resting) or 0.1 and more.
- R0 30 + 30 (seeds 48, 7; `rhythm-R0.md`, frozen 77c4163): pre-dawn rain ≥ 0.05 in **0.8%** of the pre-dawn window;
  **0 of 1,770** adult departures wet.
- **Decision (by the registered rule): arm T is inert; not built, not run.** No switch `nestInsulation` exists.

## 4. Field rows and readouts (pre-flight)

| Row | Sample (opened) | Readout (rhythm-metrics / e-bench) |
| --- | --- | --- |
| T-FOOD-10 (held-out, e-bench, 0.08–0.30) and staged T-RHY-3 (0.05–0.35) | janmaat2014: 5 habituated adult females at Taï, all with offspring under 7 y (mothers), 275 full-day follows in three fruit-scarce periods 2009–2011; departure model on 179 mornings; departure = leaving the nest, timed in seconds from astronomical sunrise (NOAA). "18% of all departures were before sunrise". | Share of adult departures before sunrise: the last exit from a nest between solar midnight and noon, minus sunrise (sun at −0.833°); adults ≥ 15 y. |
| Rising before sunrise, captive | videan2005: Southwest Foundation captive chimpanzees sleeping outdoors "rose 45–60 minutes before sunrise" (rising = leaving the sleeping place) | Median departure, min after sunrise (context only, captive) |
| Staged T-RHY-1 active day 10.5–12 h | batesByrne2009, Budongo | Active day (mean, median) |
| Staged T-RHY-5 night activity 0–0.05; night safety | tagg2018: camera traps at 22 sites, 1.8% of activity at night; lacroux2022: 3.3% of forest clips at Sebitoli | "Share of out-of-nest activity records that fall at night" (adults) and out-of-nest share of night time (adults; juveniles 5–15 y; 5–8 y before dawn) |
| Co-departure | no source defines a window: **5 min and 50 m is a measurement definition, design assumption** (rissGoodall1976: first to last within ~5 min, captive, direction only) | Share of adult departures with another adult of the community leaving its nest within 5 min and 50 m |

All readouts above are in `scripts/rhythm-metrics.ts` (committed db010f4, typechecked, smoke-tested on R0 for 2 days).
Before any arm, the S switches are smoke-tested for 2 days with the switch ON (§6).

## 5. Kill criterion (an arm is kept, provisionally, only if all hold)

1. **Viability:** no starvation deaths beyond R0's; reserve trends by class (e-bench viability) not worse than R0's.
2. **Night safety:** no night deaths beyond R0's; adults' night out-of-nest share ≤ max(R0's, 3.3%) and adults' T-RHY-5
   ≤ 0.033 (the field's 1.8–3.3%); juveniles 5–15 y out of a nest at night not above R0's. **R0's own defect** (5–8 y
   out 94% before dawn) is not charged to an arm: the comparison is against R0, so an arm fails only if it makes it
   worse; an arm may claim a fix only if the 5–8 y pre-dawn share falls below 50%.
3. **Benchmark:** fitted and held-out on rows scored in both (`--compare`), with and without T-HUN-4 and T-BRD-1, not
   worse than R0 beyond the noise threshold, registered as **1.5** for quick mode (handoff §4.5). A difference inside
   1.5 is "inside noise" and needs a confirm.
4. **Prescriptions:** on R0 neither arm removes a counted prescription (the menu stays), so S on R0 can only be kept as
   a mechanism, not as a hold. A *hold* is claimed only in the free-night context, where `rhythmFreeNight` removes the
   night and dusk menus (prescriptions fall); there criteria 1–3 apply against R0 too.

## 6. Runs, in order (frozen detached checkout of a committed head for every benchmark)

1. 2-day smoke (seed 48) of each new switch ON, R0 base and free-night base: readouts sane, no crash.
2. `rhythm-metrics` 30 + 30, seeds 48 and 7, `--workers 2` (1 if load > 8): R0; R0 + S; R0 + F (`rhythmFreeNight`);
   R0 + F + S. The thermal offline check (§3.2) before these.
3. `e-bench --quick` (seeds 48, 7, 30 + 30): R0 once (from the committed head, reused), then R0 + S; T and S + T only
   if T is live; R0 + F + S if it passes criterion 2 in step 2. If time allows, the best arm on the full stack R
   (handoff §3).
4. At most 3 iterations, each logged in §8 and committed before its run.

### 6.1 Reference measured (R0, 30 + 30, seeds 48 and 7, frozen 77c4163; `rhythm-R0.md`)
Adult departure median −13 min (p10–p90 −14 to −13), 99% before sunrise (n 1,770); co-departures 43.3%; 5–8 y out of a
nest 96.0% of the pre-dawn window, 576 m per animal-morning; adults out of a nest 0.1% of night time, T-RHY-5 0.00;
juveniles 5–15 y 4.6% of night time; last waking −128 min (p10–p90 −135 to −123); no deaths.

### 6.2 Smoke tests with the switches ON (seed 48, 2 days, no burn-in; sanity only, not a result)
Both arms ran without error; readouts sane. R0 + S: 56% of departures before sunrise (n 54), co-departures 40.7%,
5–8 y out 45.5% before dawn. R0 + F + S: adults out of a nest 9.0% of night time (T-RHY-5 0.10).

## 7. Known defects (fix before measuring, or listed here)
- `rhythm-metrics` co-departure readout is quadratic in departures per run (fine at 30 days).
- None other known at registration.

## 8. Iterations
See §8b (after the results of the registered arms, which motivate them).

## 9. Results

Runs: field profile, seeds 48 and 7, 30-day burn-in + 30 days, `--workers 1` (load 9–11), frozen detached checkouts:
R0 at 77c4163, the S arms at 786f26f. Every number below is printed by `e2e_table.py` / `e2e_bench.py` (scratch
scripts reading the rhythm-metrics and e-bench JSON). Arms: **R0**; **S** = R0 + `nestCompany` + `nestAudience`;
**F** = R0 + `rhythmFreeNight` (diagnostic); **FS** = F + S.

### 9.1 The registered arms (rhythm-metrics)

| Readout | R0 | S | F | FS |
| --- | --- | --- | --- | --- |
| departure, min after sunrise: median (p10–p90) | -13 (-14 to -13) | -13 (-14 to 12) | -124 (-131 to 4) | -57 (-129 to 28) |
| departures before sunrise, adults (adult females) | 99% (99%), n 1770 | 83% (90%), n 1810 | 89% (95%), n 1806 | 80% (89%), n 1781 |
| last nest entry, min after sunset (median) | -32 | -34 | -31 | -34 |
| active day, h: male / lactating / other female | 11.86 / 12.04 / 11.88 | 11.56 / 11.90 / 11.72 | 13.08 / 13.89 / 13.37 | 12.22 / 13.47 / 12.63 |
| adults: out of a nest, share of night; m per night | 0.1%; 1 m | 0.0%; 0 m | 14.7%; 488 m | 9.2%; 286 m |
| adults: T-RHY-5 (night share of activity records) | 0.001 | 0.000 | 0.135 | 0.092 |
| juveniles 5–15 y: out of a nest, share of night; m per night | 4.6%; 163 m | 2.4%; 75 m | 14.8%; 533 m | 9.5%; 349 m |
| 5–8 y: out of a nest before dawn; m per morning | 96.0%; 576 m | 53.4%; 328 m | 97.6%; 658 m | 70.9%; 475 m |
| co-departures (5 min, 50 m) | 43.3% | 35.0% | 22.6% | 22.3% |
| last waking, min after sunrise (median) | -128 | -128 | -126 | -126 |
| deaths (at night); causes | 0 (0); {} | 0 (0); {} | 0 (0); {} | 1 (0); {'illness': 1} |
| pre-dawn rain ≥ 0.05 | 0.8% | 1.3% | 0.0% | 0.3% |

e-bench --quick (S against R0; shared rows; noise threshold 1.5):

```
reference R0: fitted 4.267, held-out 6.429, prescriptions 115, viability pass, commit 77c4163 dirty 0
S: fitted 5.600, held-out 5.370, prescriptions 115, viability pass, commit 786f26f dirty 0
   on rows scored in both: fitted -0.195 (15 rows), held-out -1.715 (12 rows); without T-HUN-4 and T-BRD-1: fitted -0.195 (15), held-out -0.539 (11)
   largest row moves: T-HUN-4 (h) -1.176, T-FOOD-10 (h) -0.787, T-HUN-7 (f) -0.625, T-HUN-1 (f) +0.337, T-HUN-8 (h) +0.333, T-SOC-2 (h) +0.135
```

Registered predictions:
- **P-S1 fails.** Co-departures fell, 43.3% → 35.0% (predicted +10 points or more). R0's figure is an artefact of the
  menu: every adult is released at the same tick (−13 min), so departures coincide; company spreads them out.
- **P-S2 holds in direction.** Departures before sunrise 99% → 83% (adult females 99% → 90%); the median stays at −13
  (most adults still leave when the menu opens), the p90 moves from −13 to +12. T-FOOD-10 1.00 → 0.83 (band 0.08–0.30):
  still out of band.
- **P-S3 holds.** 5–8 y out of a nest before dawn 96.0% → 53.4% (not below 50%: no "fix" claimed); juveniles' night
  out-of-nest share halves (4.6% → 2.4%).
- **P-S4 holds.** In the free night company moves the median departure from −124 to −57 min, not to −30 or later.
- **P-S5 holds in direction, fails night safety.** Adults out of a nest 14.7% → 9.2% of night time (R0 0.1%); T-RHY-5
  0.092 against the field's ≤ 0.033.
- Diagnosis (`predawn-diag.ts`, seed 48, 30-day burn-in, 4 mornings, FS): adults with an adult nest-mate within 50 m at
  solar midnight were out of a nest 29.1% of the pre-dawn window and left at a median sun altitude of −4.0° (about 16 min
  before sunrise); adults with none were out 98.2% (they leave at waking). About 47% of adult pre-dawn time is spent by
  animals that nested with no adult within 50 m (42% counting nest-mates of 5 y and more): the model's parties are small
  (T-PTY-1 2.80 against 3–9), so company cannot hold them. The mean company value of an awake adult in a nest before dawn
  was 0.94.

### 9.2 Verdict on the registered arms
- **S on R0:** viable, night safety better than R0 on every readout, shared-row change fitted −0.195 and held-out
  −1.715 (−0.539 without T-HUN-4 and T-BRD-1: inside noise; the targeted row T-FOOD-10 moves −0.787). No prescription
  removed (115 = 115), so by the Track E rule it is not a keep: a mechanism that improves night safety and spreads
  departures, recorded, off by default.
- **FS (the hold without the menu):** killed by criterion 2 (adult night out-of-nest 9.2%, T-RHY-5 0.092).
- **T:** inert, not run (§3.3).

## 8b. Iterations (logged before each run)

### Iteration 1 (registered before its run): company needs darkness to cost something

- **Reading of the registered arms (§9.1).** Company holds an animal only while its best option outside the nest is worth
  less than staying. On R0 the night menu removes those options until −13 min, so S can act only after it opens. In the
  free night (F) nothing outside the nest loses value in the dark (`darkCost` 0: intake, sight and pace ignore light), so
  at waking a trip or a drink beats rest plus company, and an animal with no adult nest-mate within 50 m has no company
  to stay for.
- **Hypothesis (first principles).** An awake chimpanzee stays in its nest before dawn because a trip in the dark yields
  little (E2c: light-limited acuity, shlaer1937 fit, and pace; existing switch `darkCost`, unchanged) *and* staying keeps
  the company of its nest-mates (S). E2c showed the first alone does not hold (trips valued by the light on arrival and
  drinks still win, e2c-prereg §8); P-S4 tests the second alone. Neither component is new or retuned.
- **Arm I1** = R0 + `rhythmFreeNight` 1 + `darkCost` 1 + S (`nestCompany` 1, `nestAudience` 1). **Diagnostic I1d** =
  R0 + F + `darkCost` 1 (vision without company), same commit. With `darkCost` 1 the night/dusk single-option guard in
  rg.ts:168 does not apply (F is 1), so the menus are off for rules-driven chimps in both.
- **Predictions:** (i) adults' night out-of-nest share: I1 below FS's 9.2% and below I1d's (direction, moderate
  confidence). Passing night safety (§5.2: ≤ 3.3% and T-RHY-5 ≤ 0.033; juveniles 5–15 y not above R0's 4.6%) is **not
  predicted** (low confidence either way): animals that nest without an adult within 50 m (about half the adult
  pre-dawn time, §9.1) keep only the dark cost, and E2c found trips valued by the light on arrival and drinks still pull
  animals out. (ii) I1's median adult departure later than FS's −57 min and its share before sunrise below FS's 80%
  (direction, low confidence). (iii) 5–8 y pre-dawn out-of-nest share below FS's 70.9% (direction).
- **Kill criterion:** §5 unchanged. Prescriptions with F: 113 (menus off) against R0's 115; `rhythmDarkW` not read
  (circadian). If I1 passes §5.2 on `rhythm-metrics`, it goes to `e-bench --quick` against R0.

#### Iteration 1 results (frozen 0fc6ccf; rhythm-metrics 30 + 30, seeds 48 and 7)

| Readout | F | FS | I1d | I1 |
| --- | --- | --- | --- | --- |
| departure, min after sunrise: median (p10–p90) | -124 (-131 to 4) | -57 (-129 to 28) | -125 (-131 to -41) | -45 (-131 to 7) |
| departures before sunrise, adults (adult females) | 89% (95%), n 1806 | 80% (89%), n 1781 | 100% (100%), n 1799 | 86% (91%), n 1805 |
| last nest entry, min after sunset (median) | -31 | -34 | -33 | -34 |
| active day, h: male / lactating / other female | 13.08 / 13.89 / 13.37 | 12.22 / 13.47 / 12.63 | 13.54 / 13.64 / 13.43 | 12.48 / 12.95 / 12.65 |
| adults: out of a nest, share of night; m per night | 14.7%; 488 m | 9.2%; 286 m | 13.2%; 639 m | 7.3%; 399 m |
| adults: T-RHY-5 (night share of activity records) | 0.135 | 0.092 | 0.096 | 0.059 |
| juveniles 5–15 y: out of a nest, share of night; m per night | 14.8%; 533 m | 9.5%; 349 m | 13.4%; 704 m | 8.8%; 453 m |
| 5–8 y: out of a nest before dawn; m per morning | 97.6%; 658 m | 70.9%; 475 m | 92.6%; 1114 m | 65.3%; 847 m |
| co-departures (5 min, 50 m) | 22.6% | 22.3% | 27.0% | 24.0% |
| last waking, min after sunrise (median) | -126 | -126 | -126 | -128 |
| deaths (at night); causes | 0 (0); {} | 1 (0); {'illness': 1} | 0 (0); {} | 0 (0); {} |
| pre-dawn rain ≥ 0.05 | 0.0% | 0.3% | 0.3% | 0.3% |

- **(i) holds in direction, night safety fails:** adults out of a nest 7.3% of night time (FS 9.2%, I1d 13.2%), T-RHY-5
  0.059 (field ≤ 0.033); juveniles 8.8% (R0 4.6%). Killed by criterion 2; not benchmarked. Darkness alone (I1d) barely
  holds anyone (13.2% against F's 14.7%; departures still at waking, −125 min), as in E2c.
- **(ii) half holds:** median departure −45 min (later than FS's −57), but 86% before sunrise (not below FS's 80%).
- **(iii) holds:** 5–8 y out before dawn 65.3% (FS 70.9%).
- Diagnosis (seed 48, 4 mornings after 30 d; `predawn-diag.ts`): adults with an adult nest-mate at solar midnight out of
  a nest 21.3% of the pre-dawn window, leaving at a median sun altitude of −4.0°; adults with none out 81.3%, leaving at
  −11.6° when they leave inside the window. Out of a nest before dawn, solitary adults were travelling to crowns (7,838
  ticks), feeding (5,166), resting outside a nest (5,049) and drinking (3,118). 5–8 y with no adult nest-mate: 100% out.
- **A defect in `nestAudience` found here** (`attempt-diag.ts`, R0 + S, seed 48, 4 mornings): a departure from a nest
  with an awake audience becomes an attempt, but (1) nest-sitters are never told of a departure (src/sim/execution.ts:301
  and :313 skip `b.action === 'nest'`; the hoo too, src/sim/perception.ts:307), so the attempt cannot recruit them, and
  (2) a given-up attempt leaves the initiator outside its nest: its nest was dropped when it set off (execution.ts:214,
  `c.nest = null`), so "stays" means standing beside the tree. 12 of 118 adult exits (04:00–09:00) were attempts; 8 were
  given up; 10 min later 7 of those animals were out of a nest and none back in one.

### Iteration 2 (registered before its run): an audience that can notice, and staying means staying in the nest

- **Change (under `nestAudience`, no new switch; the registered mechanism made coherent):** (a) an awake animal in a
  finished nest (circadian latch off) gets the decision point every other companion gets when a companion sets off on
  a trip to a tree (the silent-departure notice and the travel hoo of C13e; the cue when `departCue` is 1); what it can
  then choose is unchanged (joining is still offered only from daylight 0.1, candidates.ts:474, 509). (b) An attempt
  launched from the initiator's own finished nest that is given up returns it to that nest (same tree and place,
  finished), where it stays until its own trips come back on the menu (`departRetryMin`, 3.8 min, [M]
  gruberZuberbuhler2013), as the moving-together stage's initiator stays where it was. One lazy key, `chimp.sim.tryNest`
  (the nest left by an attempt under way), in OPTIONAL_X. No parameter.
- **Arms (frozen at the commit that implements it):** **S2** = R0 + `nestCompany` + `nestAudience` (iteration 2), the
  main arm on R0; **FS2** = R0 + F + S (iteration 2), the hold without the menu (diagnostic). rhythm-metrics for both;
  e-bench --quick for S2 against R0, and for FS2 only if it passes §5.2.
- **Predictions:** S2 against S: co-departures rise (direction; P-S1's +10 points over R0 not predicted, low confidence);
  departures before sunrise fall a little (the 7 of 118 exits that were given-up attempts return to the nest; direction,
  low); night safety unchanged (menu). FS2: still fails night safety (solitary nesters, ≈ half of adult pre-dawn time,
  are untouched; high confidence).
- **Kill criterion:** §5 unchanged.

