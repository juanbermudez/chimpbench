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

## 7. Known defects (fix before measuring, or listed here)
- `rhythm-metrics` co-departure readout is quadratic in departures per run (fine at 30 days).
- None other known at registration.

## 8. Iterations
(none yet)

## 9. Results
(none yet)
