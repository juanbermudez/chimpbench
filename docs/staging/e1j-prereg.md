# E1j pre-registration: mothers' ranging (T-RNG-5)

Branch `e1j-ranging` from `track-e` b0cb6e5. Track E, stage E1j. Rules policy only; development seeds 48 and 7; no run
longer than 90 days in all. Started 2 October 2026, 06:40.

This file is written in steps, each committed before the step it governs: §1–§2 (problem, field sample, audit) before
any run; §3 (diagnosis readouts) before the diagnosis runs on unchanged code; §5 onwards (mechanism, switch, arms,
predictions, kill criterion) before any run of changed code; every iteration in the run log before its run.

**Rule of this stage.** Field values of behaviour are targets, never inputs. Never tune a weight or an input to hit a
day-range ratio. A parameter may carry a field value only when it is physiology or physics measured independently of
the behaviour it helps produce (the cost of walking a metre, an infant's mass).

## 0. The problem (generated from the integrator's shared realizations by `tools/problem_table.py`, session scratch)

T-RNG-5 (held-out): lactating female day range ÷ adult male day range, band 0.3–0.6, one site. R = the reference stack
(track-e-handoff.md §3); B = every switch off. Four realizations each (the run plus three `rgTemperature` re-draws):

| set (4 realizations) | T-RNG-5 ratio | lactating km/day | male km/day (T-RNG-4) | male path30Km | T-RNG-5 distance |
| --- | --- | --- | --- | --- | --- |
| B quick (base-quick, NB1q-NB3q; 612bf15) | 0.595 ± 0.123 | 1.420 ± 0.173 | 2.428 ± 0.174 | 2.004 ± 0.134 | 0.148 ± 0.295 |
| R quick (R-quick, NR1q-NR3q; 612bf15) | 0.706 ± 0.080 | 1.328 ± 0.114 | 1.897 ± 0.126 | 1.476 ± 0.115 | 0.357 ± 0.260 |
| B confirm (base-head, NB1c-NB3c) | 0.629 ± 0.027 | 1.591 ± 0.071 | 2.525 ± 0.005 | 2.090 ± 0.034 | 0.098 ± 0.089 |
| R confirm (e1h-R, NR1c-NR3c) | 0.777 ± 0.050 | 1.516 ± 0.057 | 1.954 ± 0.050 | 1.533 ± 0.035 | 0.590 ± 0.165 |

**First reading (before any run of this stage):** R's ratio is higher than B's mostly because R's **males** range
less (confirm: 1.95 against 2.53 km/day, −23%), not because its mothers range more (1.52 against 1.59, −5%). E1i's
pair then raised the mothers' day range (quick, single runs: T 1.51 → B2 1.90 km/day; e1i-prereg.md §6). So the
question has two halves: why R's males travel less than B's, and what sets the mothers' day range. *(Later note, not a
change of registration: §4–§5.1 show that E1i's rise was follow-day sampling; in simulation truth the pair lowers the
ratio.)*

## 1. Field rows scored here: samples (source opened in full)

**batesByrne2009** (Bates & Byrne 2009, Behav Ecol Sociobiol, doi:10.1007/s00265-009-0841-3), the authors' accepted
manuscript (research.md E2b addendum; read in full this stage from the session copy). Sonso community, Budongo,
September 2002 – September 2003.

| Item | Field value (manuscript) |
| --- | --- |
| Subjects | 15 focal adults: 8 males (2 low, 2 mid, 4 high rank incl. the alpha; one died 9 months in) and 7 females |
| "Lactating females" | 6 females: 4 lactating throughout, 1 gestating then lactating (birth 6 months in), 1 cycling then pregnant; the paper pools "lactating/gestating" as "lactating females". Infant ages not reported |
| Receptive females | 1 (2 at the start) |
| Mass | not reported (not weighed) |
| Follows | focal animal sampling, one subject at a time, up to 3 consecutive days, nest to nest; 50 focal samples (1–6 per subject); a follow lost for over 120 min ends the sample |
| Day-range sample | only focal samples observed "for at least 8-hours consecutively": 27 days males, 13 lactating, 3 receptive (ANOVA F2,42) |
| Fixes | location "every five minutes when it was travelling" (hand-held GPS, error up to 14 m; a paper trail map at 100 m in thick cover) |
| Halts | a halt of 20 min or more: time and location marked; movements "within a 20+ minute halt were not recorded"; halt area = within 35 m of the initial stopping point (social, nesting, inactive, drinking) or the food patch (a crown or connected crowns) when feeding |
| Path | straight lines between consecutive 5-min locations (ArcView 3.2); phase = continuous movement ending at a 20+ min halt |
| Result: day range | males 2.7 ± 1.5 km, lactating 1.2 ± 0.8, receptive 2.2 ± 0.8 (F2,42 = 5.89, p = 0.006; lactating < males, p = 0.004) |
| Result: halts | 20+ min stops per day: males 6.5 ± 1.8, lactating 4.5 ± 1.0; mean stop 60 ± 50 min (males), 95 ± 83 (lactating), 56 ± 41 (receptive) |
| Result: phases (Table 1) | distance per phase: males 357 ± 368 m (n 244 in the table, 224 in the text), lactating 277 ± 266 (87), receptive 319 ± 361 (33); speed 1.9–2.2 km/h; linearity 0.94–0.96; no class difference (MANOVA p = 0.51) |
| Result: phase ends | feeding 68% (males), 84% (lactating); socialising 13% and 5% |
| Result: activity | time budgets did not differ by class overall (p = 0.085); lactating females travelled less than males (p = 0.028) |
| Other | lactating females revisited a used food patch 0.46 times per 8-h day (males 0.14); they used the outer 55% of the range less than expected |

Derived here [L]: ratio of class means 1.2 ÷ 2.7 = 0.44. Treating follow-days as independent, SE 0.8/√13 and 1.5/√27
give SE(ratio) ≈ 0.095 by the delta method, a 95% interval of about 0.26–0.63 (wider in truth: 6 and 8 individuals).
The band 0.3–0.6 is about that interval. The field's ratio decomposes into fewer 20+ min halts per day (4.5 ÷ 6.5 =
0.69) and shorter phases (277 ÷ 357 = 0.78), at the same speed and straightness.

T-RNG-4 (fitted, band 1.5–3.5 km): the same source's males (2.7 ± 1.5 km, 27 days); jang2019's Taï females (median
4.03 km, continuous GPS) is context only.

Other sites (lactating against male day range): §2.3, from a source check running while this was written.

## 2. Audit (step 0; nothing run yet)

### 2.1 What the model's observer does (code at b0cb6e5)

- **Who is followed** (`src/field/protocols.ts` chooseFocal, followStep; `config.ts` followMode `focal` for T-RNG-4/5):
  one team per community; each day's focal comes from a balanced random rotation of independent adults ≥ 15 y, males
  and females interleaved, redrawn every 10 days. Mothers and males are sampled by the same rule.
- **The follow-day:** starts when the focal is out of its night nest (from 04:00), ends *complete* when it is in a
  finished night nest after 15:00, or at 21:00 (incomplete), or lost (hazard 0.05 per hour, × 4 while running or above
  15 m). Class = `c.lactating` at the follow's start (pregnant females are not in the lactating class; the field's group
  held one or two gestating females).
- **The day range** (`src/field/metrics.ts` dayRange, lines 1295–1316): complete follows of at least 8 h only; the sum of
  straight-line distances between successive 5-min fixes over the **whole follow, whatever the focal is doing**.
  T-RNG-5 = the mean over seeds of (mean lactating day range ÷ mean male day range) in each seed.

### 2.2 Differences from the field method

1. **Movement within halts is counted** (the field recorded no fixes inside a 20+ min halt; the halt is a point). A
   path added inside halts that is similar in absolute size for both classes pulls the ratio toward 1 (e.g. 2.7 and
   1.2 km plus 0.5 km each give 0.53 instead of 0.44), so this difference inflates T-RNG-5 unless mothers move much more
   inside halts than males. The C6b review already found the model's 5-min path inflated by back-and-forth movement
   (male straightness of 30-min steps 0.23–0.29 against 0.50 at Taï). Size to be measured (D0, §3).
2. **Day eligibility:** complete nest-to-nest follows ≥ 8 h, against "at least 8 hours" continuous in the field. Alike
   for both classes; reported, not expected to matter.
3. **Class:** lactating only, against lactating or gestating. Reported (D0 also scores pregnant females separately).
4. **Pooling:** mean of per-seed ratios against the field's ratio of class means over days. Both reported.

A scorer fix is staged (`docs/staging/e1j-protocol.patch.json`, never applied here) only if D0 shows the field-method
ratio differs from today's by more than R's own spread over its realizations.

### 2.3 Other sites (source check, 06:43–06:55; files in the session scratch `e1j/sources/`)

| Site | Lactating or adult females | Males | Ratio | Sample, method | Access |
| --- | --- | --- | --- | --- | --- |
| Budongo Sonso 2002–03 | lactating/gestating 1.2 ± 0.8 km | 2.7 ± 1.5 km | 0.44 | §1 | batesByrne2009, full text |
| Gombe 1972–73 | females, "most" anoestrous, median 2.8 km (61 days, 10 females; a juvenile's record assigned to its mother when they travelled together) | median 4.2 km (northern, 83 days, 8 males), 3.8 (southern, 23 days, 7) | 0.67–0.74 | nest-to-nest days; movements around a point ignored unless over ~30 m; 100 m grid lines crossed | wrangham1975 (PhD thesis, Table 5.1, full text) |
| Kanyawara | adult females 2.0 km | 2.4 km | 0.83 | not seen | pontzerWrangham2004 as cited by wilson2021 (primary closed) |
| Gombe | adult females 3.2 km | 4.6 km | 0.70 | not seen | pontzerWrangham2004 as cited by wilson2021 |
| Kanyawara | maternal day range rose with the juvenile's body size, not with infant carrying | — | — | not seen | pontzerWrangham2006 as cited by stanton2017 (primary closed, no abstract) |

Not verified: "mothers about 1.9 km" at Kanyawara (research.md, from an indexed excerpt); otaliGilchrist2006 (Kanyawara;
title: mothers are less gregarious than nonmothers and males, the infant safety hypothesis; no abstract by OpenAlex or
Crossref, closed); Taï, Ngogo and Mahale sex-class day ranges (jang2019: 5 Taï females, median 4.03 km, continuous GPS).
Context for Budongo: Sonso had 33 intra-community infanticide attacks on 30 victims in 24 years; most of the 23
attacks with known perpetrators were by males only, and two thirds of the victims of known age were under one week old
(lowe2019, Primates, abstract read; open access).

**Reading [L–M].** The band 0.3–0.6 rests on one site and 13 lactating follow-days. Gombe's mostly anoestrous females
(verified, primary) and both sites in pontzerWrangham2004 (secondary) give 0.67–0.83. R's 0.71 (quick) and 0.78
(confirm) lie inside that cross-site range, outside Budongo's.

### 2.4 Audit result: the observer (D0, R and B quick; §3 defines it; tables in §4)

The field's rule (fixes only while travelling, nothing inside 20+ min halts) lowers both classes' day range by 0.15–0.21
km/day (10–15%) and the ratio by 0.03 on R (0.700 → 0.672, ratio of pooled means 0.674) and by nothing on B (0.777 →
0.782 per seed, 0.769 → 0.766 pooled); the activity rule changes it by ≤ +0.01. R's own spread over its four
realizations is 0.080, so **the observer does not inflate T-RNG-5 beyond noise**: no scorer fix is staged (rule of
§2.2). The other differences (day eligibility, class, pooling) move it by less than 0.01 (pooled 0.700 against 0.699).

## 3. Diagnosis readouts (defined before the diagnosis runs; unchanged simulation code)

Tool: `scripts/ranging-diagnose.ts` (new; reads only). One seed per process; the world and the focal observer are
e-bench's (focal team set, observer seed 1), without the party-follow team sets and the field experiments, which never
write the world: its T-RNG-4 and T-RNG-5 must equal e-bench's per-seed values (checked on every run, "identity").
Classes (adults ≥ 15 y): male; lactating (split by the youngest dependent infant, < 2 y and ≥ 2 y); pregnant (not
lactating); other adult female.

**D0, the observer (complete follows ≥ 8 h):** per class and follow-day,
- `todayKm`: today's day range (every 5-min fix of the follow);
- `fieldKm`: batesByrne2009's method. Methods: the location was recorded "every five minutes when it was travelling";
  "Movements of the target animal and its party within a 20+ minute halt were not recorded"; the halt area was "within a
  35m radius of the initial stopping point" (non-feeding) or the food patch. Rule: a halt is a run of 1-min point
  samples that stays within 35 m of its first point for 20 min or more; each 5-min fix inside it is recorded at the
  halt's first point (35 m stands in for the food-patch rule too: a design simplification);
- `actKm`: the same with halts from activity (20 min or more with no point sample in the travel category);
- halts and phases per follow-day, mean halt (min), mean phase (m) (field: 6.5 and 4.5 halts a day; 60 and 95 min;
  357 and 277 m per phase); share of follow minutes with another adult male in the focal's party.
Ratios reported both ways: the mean over seeds of per-seed ratios (today's T-RNG-5) and the ratio of class means over
pooled follow-days (the field's).

**D1, simulation truth (every tick):** per class and chimp-day,
- path (km/day; horizontal; teleport steps skipped) and its parts by the act executed: own trip to food (travel to a
  tree, no leader), joined trip (travel to a leader's tree), to callers, home pull, follow a party member, to the crown,
  in the crown, ground forage (fallback, walking at the forage pace), drink (to water), patrol, consort, nest, groom
  approach, play, mate guarding, other; bouts of each part per day (entries into it) and metres per bout; path by action;
- daylight (> 0.1): share of minutes with another adult male in the own party, alone (no other member ≥ 5 y), mean party
  size; halts and trips (the 35 m / 20 min rule on 1-min positions), trip length, halt length, path inside trips;
- mothers: minutes a day carrying an infant (`isCarried`), all day and in daylight; carry, walk and climb kcal a day
  (`energyTap`); daylight minutes with the dependent infant in the nurse act; the mother's speed then and otherwise.

**Code reading, no run (carrying):** the ledger charges the carrier for a carried infant's mass over every metre moved
and climbed (`src/sim/energy.ts` rideTick, lines 451–462; `src/sim/tick.ts` carryInfants, 59–75). No decision sees it: a
trip's value is energy per hour including the walk *time* (`src/sim/intake.ts` treeIntake, 58–70; candidates.ts
tripWorth, 305–318), the walk's energy cost is in no option score, and the pace is `walkMps` for every adult. Nursing
moves the infant to the mother and leaves her act alone (E1i D2).

**Smoke test (2 days, seed 48, R; seen before this section was written):** every readout non-empty; identity holds
(T-RNG-4 2.222 = D0 male `todayKm`). It already showed a part no candidate in the brief names: walks to water, about
2.8–3.2 per adult a day of 150–210 m (0.5–0.58 km/day, a quarter to a third of the path) in every class. Context, not a
target here: Gombe mothers drink about 0.9 times per 12-h day (nelson2022, research.md), and rainforest apes can go days
without drinking (pontzer2021).

**Runs:** R and B (all off), seeds 48 and 7, 30 + 30 days, from a frozen checkout of the commit that adds this section;
R's T-RNG-4/5 identity against R-quick.json per seed, B's against base-quick.json. Added (07:03, after R and B were read,
before its run): **TP** = R + `ledgerFoodEnergyFix`, `ledgerSatiationReserve`, `ledgerLactGut` (E1i's fed mothers, T-RNG-5
0.84 in E1i's quick run), same tool, seeds and checkout, to see what raises the mothers' day range when they eat more.

**Identity of R at the branch start (done 06:49):** e-bench --quick of R at b0cb6e5 equals R-quick.json (612bf15) on all
110 rows (per-seed values and parts), prescriptions 103, viability pass: the integrator's R quick realizations are valid
references for this stage while every new switch is 0.

## 4. Diagnosis results (R and B; registered readouts of §3)

Runs: frozen checkout of fd7cd89 (`git.dirty` clean), seeds 48 and 7, 30 + 30 days, rules policy; JSON in
`artifacts/validation/e1j/D1-{R,B}-{48,7}.json` of the frozen checkout (gitignored). Every number below was generated
from the JSON by `tools/d1_table.py` and `tools/decomp.py` (session scratch, copied to `artifacts/validation/e1j/tools/`).
Identity holds: the tool's T-RNG-4/5 equal e-bench's per-seed values for both arms (R-quick.json, base-quick.json).

**R** (seeds 48, 7)

identity (per seed): seed 48: T-RNG-4 1.994, T-RNG-5 0.620; seed 7: T-RNG-4 1.695, T-RNG-5 0.778

| class (observer, complete follows >= 8 h) | follow-days | today km | field km (35 m / 20 min) | activity-rule km | halts/day | halt min | phases/day | phase m | share with an adult male |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| male | 47 | 1.835 | 1.625 | 1.762 | 8.15 | 72 | 6.32 | 241 | 0.40 |
| lact | 24 | 1.285 | 1.096 | 1.252 | 5.92 | 104 | 4.46 | 223 | 0.39 |
| lact <2y | 9 | 1.599 | 1.395 | 1.570 | 6.22 | 94 | 5.11 | 256 | 0.47 |
| lact >=2y | 15 | 1.096 | 0.917 | 1.061 | 5.73 | 110 | 4.07 | 198 | 0.35 |
| pregnant | 6 | 2.095 | 1.850 | 2.061 | 8.33 | 70 | 6.83 | 252 | 0.52 |
| female other | 16 | 1.896 | 1.680 | 1.854 | 7.06 | 81 | 5.75 | 278 | 0.55 |

T-RNG-5 lactating ÷ male: today 0.699 (mean of per-seed ratios; e-bench's form), 0.700 (ratio of pooled means); field method 0.672 / 0.674; activity rule 0.709 / 0.710

| class (truth) | chimp-days | path km/day | daylight path | own trip | joined trip | to callers | home | follow party | to crown | in crown | ground forage | drink | patrol | consort | nest | groom approach | play | guard | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| male | 840 | 2.204 | 2.204 | 0.359 | 0.524 | 0.336 | 0.000 | 0.174 | 0.057 | 0.000 | 0.016 | 0.449 | 0.146 | 0.002 | 0.009 | 0.017 | 0.015 | 0.054 | 0.049 |
| lact | 480 | 1.702 | 1.702 | 0.474 | 0.364 | 0.142 | 0.000 | 0.091 | 0.060 | 0.000 | 0.019 | 0.408 | 0.000 | 0.000 | 0.007 | 0.003 | 0.114 | 0.000 | 0.017 |
| lact <2y | 240 | 1.952 | 1.952 | 0.371 | 0.522 | 0.244 | 0.000 | 0.117 | 0.060 | 0.000 | 0.024 | 0.454 | 0.000 | 0.000 | 0.007 | 0.004 | 0.126 | 0.000 | 0.022 |
| lact >=2y | 240 | 1.452 | 1.451 | 0.578 | 0.206 | 0.039 | 0.000 | 0.066 | 0.061 | 0.001 | 0.013 | 0.362 | 0.000 | 0.000 | 0.008 | 0.002 | 0.102 | 0.000 | 0.013 |
| pregnant | 199 | 2.213 | 2.212 | 0.261 | 0.529 | 0.537 | 0.000 | 0.225 | 0.045 | 0.000 | 0.025 | 0.490 | 0.018 | 0.000 | 0.009 | 0.013 | 0.029 | 0.000 | 0.030 |
| female other | 341 | 1.823 | 1.822 | 0.242 | 0.487 | 0.295 | 0.000 | 0.155 | 0.039 | 0.000 | 0.023 | 0.486 | 0.012 | 0.000 | 0.010 | 0.010 | 0.019 | 0.000 | 0.044 |

| class (truth) | own trips/day (m each) | joined trips/day (m) | to callers/day (m) | follow party/day (m) | drinks/day (m) | halts/day | halt min | trips/day | trip m | path in trips km/day | with adult male | alone | party size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| male | 3.19 (112) | 3.43 (154) | 1.61 (211) | 2.82 (62) | 2.77 (162) | 8.07 | 69 | 7.07 | 297 | 1.074 | 0.46 | 0.29 | 3.02 |
| lact | 3.94 (120) | 2.54 (145) | 0.67 (213) | 2.29 (40) | 2.59 (158) | 7.34 | 78 | 6.34 | 244 | 0.820 | 0.30 | 0.49 | 2.37 |
| lact <2y | 3.81 (97) | 3.62 (145) | 1.13 (218) | 3.18 (37) | 2.87 (159) | 8.03 | 71 | 7.03 | 254 | 0.937 | 0.38 | 0.33 | 2.80 |
| lact >=2y | 4.08 (142) | 1.45 (142) | 0.21 (183) | 1.40 (46) | 2.32 (156) | 6.66 | 87 | 5.66 | 232 | 0.702 | 0.23 | 0.64 | 1.94 |
| pregnant | 2.62 (99) | 3.54 (152) | 2.17 (246) | 2.92 (82) | 3.10 (159) | 8.14 | 68 | 7.14 | 295 | 1.091 | 0.45 | 0.31 | 2.89 |
| female other | 2.23 (108) | 3.05 (161) | 1.32 (227) | 2.21 (75) | 3.14 (156) | 7.39 | 77 | 6.39 | 272 | 0.854 | 0.44 | 0.33 | 2.71 |

| mothers (truth) | carrying min/day (daylight) | carry kcal/day | walk kcal/day | climb kcal/day | nursing min/day (daylight) | speed nursing m/min | speed otherwise m/min |
| --- | --- | --- | --- | --- | --- | --- | --- |
| lact | 973 (286) | 11.0 | 48.4 | 32.4 | 75 | 0.95 | 2.40 |
| lact <2y | 1134 (447) | 10.5 | 55.5 | 35.7 | 80 | 1.09 | 2.77 |
| lact >=2y | 812 (125) | 11.5 | 41.3 | 29.0 | 70 | 0.79 | 2.04 |
| female other | 0 (0) | 0.0 | 51.8 | 28.1 | 0 | 0.00 | 0.00 |
| male | 0 (0) | 0.0 | 78.1 | 44.0 | 0 | 0.00 | 0.00 |

**B** (seeds 48, 7)

identity (per seed): seed 48: T-RNG-4 2.483, T-RNG-5 0.645; seed 7: T-RNG-4 1.873, T-RNG-5 0.909

| class (observer, complete follows >= 8 h) | follow-days | today km | field km (35 m / 20 min) | activity-rule km | halts/day | halt min | phases/day | phase m | share with an adult male |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| male | 51 | 2.124 | 1.942 | 2.083 | 6.55 | 91 | 5.33 | 338 | 0.35 |
| lact | 13 | 1.633 | 1.488 | 1.617 | 6.23 | 100 | 4.23 | 321 | 0.20 |
| lact <2y | 5 | 1.881 | 1.725 | 1.861 | 7.20 | 85 | 4.80 | 338 | 0.24 |
| lact >=2y | 8 | 1.478 | 1.340 | 1.464 | 5.63 | 111 | 3.88 | 308 | 0.17 |
| pregnant | 9 | 2.399 | 2.200 | 2.376 | 6.67 | 87 | 5.78 | 369 | 0.46 |
| female other | 20 | 2.007 | 1.830 | 1.985 | 6.50 | 91 | 5.40 | 322 | 0.34 |

T-RNG-5 lactating ÷ male: today 0.777 (mean of per-seed ratios; e-bench's form), 0.769 (ratio of pooled means); field method 0.782 / 0.766; activity rule 0.786 / 0.776

| class (truth) | chimp-days | path km/day | daylight path | own trip | joined trip | to callers | home | follow party | to crown | in crown | ground forage | drink | patrol | consort | nest | groom approach | play | guard | other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| male | 840 | 2.546 | 2.545 | 0.752 | 0.740 | 0.432 | 0.000 | 0.092 | 0.056 | 0.000 | 0.009 | 0.355 | 0.037 | 0.000 | 0.008 | 0.009 | 0.005 | 0.026 | 0.026 |
| lact | 480 | 1.753 | 1.752 | 0.751 | 0.418 | 0.147 | 0.000 | 0.051 | 0.059 | 0.001 | 0.009 | 0.269 | 0.000 | 0.000 | 0.007 | 0.002 | 0.032 | 0.000 | 0.005 |
| lact <2y | 240 | 2.075 | 2.075 | 0.683 | 0.602 | 0.279 | 0.000 | 0.075 | 0.065 | 0.000 | 0.013 | 0.304 | 0.000 | 0.000 | 0.008 | 0.002 | 0.036 | 0.000 | 0.007 |
| lact >=2y | 240 | 1.430 | 1.430 | 0.818 | 0.233 | 0.016 | 0.000 | 0.028 | 0.052 | 0.001 | 0.006 | 0.235 | 0.000 | 0.000 | 0.007 | 0.001 | 0.029 | 0.000 | 0.004 |
| pregnant | 173 | 2.441 | 2.441 | 0.817 | 0.634 | 0.465 | 0.000 | 0.121 | 0.058 | 0.000 | 0.011 | 0.305 | 0.000 | 0.000 | 0.008 | 0.007 | 0.006 | 0.000 | 0.011 |
| female other | 367 | 2.207 | 2.207 | 0.682 | 0.587 | 0.352 | 0.000 | 0.091 | 0.059 | 0.000 | 0.014 | 0.368 | 0.000 | 0.000 | 0.009 | 0.006 | 0.008 | 0.000 | 0.032 |

| class (truth) | own trips/day (m each) | joined trips/day (m) | to callers/day (m) | follow party/day (m) | drinks/day (m) | halts/day | halt min | trips/day | trip m | path in trips km/day | with adult male | alone | party size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| male | 3.67 (205) | 2.60 (285) | 1.60 (268) | 1.06 (86) | 1.86 (191) | 7.30 | 73 | 6.32 | 391 | 1.261 | 0.36 | 0.39 | 2.30 |
| lact | 3.50 (214) | 1.42 (295) | 0.50 (298) | 0.85 (61) | 1.58 (170) | 5.94 | 92 | 4.96 | 337 | 0.886 | 0.24 | 0.54 | 1.89 |
| lact <2y | 3.62 (188) | 2.02 (298) | 0.93 (299) | 1.21 (62) | 1.70 (178) | 6.60 | 83 | 5.64 | 352 | 1.041 | 0.32 | 0.42 | 2.19 |
| lact >=2y | 3.39 (241) | 0.82 (282) | 0.06 (257) | 0.49 (56) | 1.45 (161) | 5.28 | 103 | 4.29 | 318 | 0.731 | 0.16 | 0.66 | 1.58 |
| pregnant | 4.36 (187) | 2.27 (281) | 1.78 (260) | 1.15 (105) | 1.69 (181) | 7.30 | 73 | 6.31 | 377 | 1.233 | 0.35 | 0.42 | 2.27 |
| female other | 3.58 (190) | 2.05 (286) | 1.35 (261) | 0.88 (105) | 2.08 (177) | 7.01 | 76 | 6.03 | 355 | 1.032 | 0.30 | 0.45 | 2.10 |

| mothers (truth) | carrying min/day (daylight) | carry kcal/day | walk kcal/day | climb kcal/day | nursing min/day (daylight) | speed nursing m/min | speed otherwise m/min |
| --- | --- | --- | --- | --- | --- | --- | --- |
| lact | 965 (279) | 0.0 | 0.0 | 0.0 | 124 | 0.69 | 2.65 |
| lact <2y | 1130 (443) | 0.0 | 0.0 | 0.0 | 95 | 0.92 | 3.02 |
| lact >=2y | 801 (114) | 0.0 | 0.0 | 0.0 | 152 | 0.54 | 2.24 |
| female other | 0 (0) | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 0.00 |
| male | 0 (0) | 0.0 | 0.0 | 0.0 | 0 | 0.00 | 0.00 |

Truth decomposition of the ratio (`tools/decomp.py`; lactating ÷ male path per chimp-day; one part substituted at a time):

```
truth ratio lact/male: R 0.772 (L 1.702, M 2.206); B 0.688 (L 1.753, M 2.547)
  lact <2y / male: R 0.885; lact >=2y / male: R 0.658; female other / male: R 0.826
Counterfactuals on R (one part substituted at a time):
  males' own trips at B's length: ratio 0.655 (change -0.117; L 1.702, M 2.599)
  both classes' own trips at B's: ratio 0.761 (change -0.010; L 1.978, M 2.599)
  no walks to water (both): ratio 0.736 (change -0.035; L 1.294, M 1.757)
  mothers <2y with the social travel of mothers >=2y: ratio 0.642 (change -0.130; L 1.415, M 2.206)
  no mothers' play walks: ratio 0.720 (change -0.052; L 1.588, M 2.206)
Part differences, male − lact (R, km/day): {'own trip': -0.115, 'joined trip': 0.16, 'to callers': 0.194, 'follow party': 0.082, 'drink': 0.04, 'patrol': 0.146, 'groom approach': 0.014, 'play': -0.099, 'guard': 0.054, 'other': 0.032}
R − B, males: {'own trip': -0.393, 'joined trip': -0.216, 'to callers': -0.096, 'follow party': 0.082, 'drink': 0.093, 'patrol': 0.109, 'play': 0.01, 'guard': 0.028, 'other': 0.023}
R − B, lact: {'own trip': -0.276, 'joined trip': -0.053, 'follow party': 0.04, 'drink': 0.139, 'play': 0.082, 'other': 0.012}
```

**What makes mothers range as far as they do (relative to males), with numbers.**
1. **Not the mothers' absolute range.** The observer's mothers walk 1.29 km/day (1.10 by the field's method), Budongo's
   1.2 ± 0.8. R's males walk 1.84 (1.63 by the field's method) against Budongo's 2.7 ± 1.5: the ratio is high because
   the denominator is short. The model reproduces the field's halt contrast (mothers 5.9 halts a day of 104 min against
   males' 8.2 of 72; field 4.5 of 95 against 6.5 of 60) but not its phase contrast (223 against 241 m; field 277 against
   357): males' trips between halts are a third shorter than Budongo's.
2. **Why R is worse than B (the integrator's question).** In truth R's males walk 0.34 km/day less than B's (own trips
   to food −0.39: 205 → 112 m each, and 13% fewer; joined trips −0.22; to callers −0.10; partly offset by
   walks to water +0.09, patrols +0.11, following +0.08), while mothers lose only 0.05 (own trips −0.28, offset by walks
   to water +0.14 and walks to play with the infant +0.08). Substituting B's own-trip distance per day for both classes leaves
   the ratio almost unchanged (−0.01): the stack shortens everyone's food trips, and in mothers the loss is refilled by
   water and play walks.
3. **Mother-side terms (truth, R):** mothers of infants under 2 y travel socially like other adult females (joined
   trips, callers and following: 0.88 km/day; with an adult male in 38% of daylight; ratio −0.13 if they travelled like
   mothers of older infants); mothers make more own food trips than males (3.94 against 3.19 a day, +0.12 km/day; −0.05
   at the males' level); walks to play with the infant 0.11 km/day (−0.05).
4. **Walks to water are a large class-independent part of every path:** 2.3–3.1 a day of about 160 m, 0.41–0.49
   km/day (a fifth to a quarter of the path) in every class (B: 1.5–2.1 a day). The thirst timers are design and the
   field values of `fruitThirstFactor` and `drinkDistScaleM` were tuned in C5a against T-ACT-2 and T-RNG-4. Removing
   them from both classes changes the ratio by only −0.035; it would take ~0.4 km/day from T-RNG-4. *(Later note: the
   attribution run A1, §10, shows that once the freed time is spent the change has the opposite sign: +0.08 in truth.)*
5. **Carrying is charged but trivial and unseen.** Mothers carry an infant 286 daylight min a day; the ledger charges
   11 kcal/day for it (walk 48, climb 32; about 0.6% of their spending), and no decision reads it. Arithmetic for the
   brief's first candidate: at `ledgerWalkJPerKgM` 3.8 J kg⁻¹ m⁻¹ (0.00091 kcal), a 120 m trip costs a 31 kg mother
   with a 7 kg load 4.1 kcal (the infant's share 0.8 kcal), against about 150 kcal absorbed per feeding bout (E1i's T:
   1,344 kcal a day over 9.2 bouts): a net-energy trip value would change trip scores by 2–4% (the infant ≤ 1%). Not
   built: it cannot move the ratio measurably.
6. **Nursing slows, never stops the mother:** her infant nurses 75 daylight min a day, during which she moves 0.95
   m/min against 2.4 otherwise.

**TP (E1i's fed mothers; registered in §3; same checkout):** tables generated by `tools/d1_table.py` in the session
scratch (`d1_TP.md`). Observer: males 2.259, mothers 1.896 km/day, T-RNG-5 0.837 (E1i's B2 value, same arm: identity).
Truth: males 2.651, mothers 1.821, ratio **0.69** (R 0.77, B 0.69). So in truth E1i's pair does **not** make mothers range
further relative to males (the food fix lengthens everyone's food trips; males gain 0.45 km/day, mothers 0.12); the
quick run's 0.84 is the observer's sample. Observer ÷ truth (same class, all chimp-days) is 0.83–0.85 for males in R, B
and TP but 0.75, 0.93 and 1.04 for mothers, whose mean rests on 13–24 complete follow-days per quick run (SE of the
mothers' mean 0.09–0.18 km, 7–11%).

## 5. Audit readouts added after §4 (registered before their run; diagnosis tool only)

The scatter of the mothers' observer ÷ truth (0.75–1.04) is either sampling (13–24 mothers' follow-days) or a selection
of days (complete follows only; the observer loses a focal 4 × as often while it runs or is above 15 m). To separate
them, `ranging-diagnose.ts` now also reports, per class: follows started, lost and complete; the focal's own per-tick
path while each complete follow ran (`truthKm`), so that today's day range ÷ `truthKm` is the 5-min resolution and
`truthKm` ÷ the class's truth path per chimp-day is the choice of days; and the share of daylight minutes above 15 m.
Smoke test (2 days, seed 48, R): non-empty; identity unchanged. Runs: R, B and TP again, same seeds and window, from a
frozen checkout of the commit that adds this section (the simulation is unchanged, so every earlier readout repeats).
Also registered here (07:12, before their run): the same tool on R's three re-draws (R + `rgTemperature` 0.1641, 0.1639,
0.16405: the integrator's NR1q–NR3q), seeds 48 and 7, same window and checkout, so that every readout of R in the final
table is a mean ± SD over R's four realizations; their T-RNG-4/5 must equal NR1q–NR3q's per-seed values (identity).

### 5.1 Results (frozen checkout of ee8cf7c; every earlier readout repeated exactly; generated by `tools/select_table.py`)

| arm | class | follows started | lost | complete >= 8 h | observer km (5-min fixes) | same follows, truth km (per tick) | resolution (observer ÷ follow truth) | class truth km per chimp-day | choice of days (follow truth ÷ class truth) | daylight share above 15 m |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R | male | 83 | 36 | 47 | 1.835 | 2.035 ± 0.111 | 0.90 | 2.204 | 0.92 | 0.057 |
| R | lact | 47 | 23 | 24 | 1.285 | 1.424 ± 0.098 | 0.90 | 1.702 | 0.84 | 0.060 |
| R | lact <2y | 23 | 14 | 9 | 1.599 | 1.734 ± 0.132 | 0.92 | 1.952 | 0.89 | 0.062 |
| R | lact >=2y | 24 | 9 | 15 | 1.096 | 1.238 ± 0.112 | 0.89 | 1.452 | 0.85 | 0.058 |
| R | female other | 33 | 17 | 16 | 1.896 | 2.085 ± 0.213 | 0.91 | 1.823 | 1.14 | 0.055 |
| R | pregnant | 17 | 11 | 6 | 2.095 | 2.243 ± 0.267 | 0.93 | 2.213 | 1.01 | 0.048 |
| B | male | 82 | 31 | 51 | 2.124 | 2.260 ± 0.141 | 0.94 | 2.546 | 0.89 | 0.058 |
| B | lact | 41 | 28 | 13 | 1.633 | 1.737 ± 0.179 | 0.94 | 1.753 | 0.99 | 0.082 |
| B | lact <2y | 18 | 13 | 5 | 1.881 | 2.034 ± 0.281 | 0.92 | 2.075 | 0.98 | 0.080 |
| B | lact >=2y | 23 | 15 | 8 | 1.478 | 1.552 ± 0.220 | 0.95 | 1.430 | 1.08 | 0.085 |
| B | female other | 42 | 22 | 20 | 2.007 | 2.117 ± 0.247 | 0.95 | 2.207 | 0.96 | 0.060 |
| B | pregnant | 15 | 6 | 9 | 2.399 | 2.537 ± 0.244 | 0.95 | 2.441 | 1.04 | 0.049 |
| TP | male | 81 | 34 | 47 | 2.259 | 2.480 ± 0.129 | 0.91 | 2.651 | 0.94 | 0.070 |
| TP | lact | 47 | 28 | 19 | 1.896 | 2.057 ± 0.133 | 0.92 | 1.821 | 1.13 | 0.085 |
| TP | lact <2y | 22 | 15 | 7 | 2.187 | 2.349 ± 0.190 | 0.93 | 2.078 | 1.13 | 0.077 |
| TP | lact >=2y | 25 | 13 | 12 | 1.726 | 1.887 ± 0.166 | 0.91 | 1.563 | 1.21 | 0.093 |
| TP | female other | 27 | 14 | 13 | 2.185 | 2.315 ± 0.223 | 0.94 | 2.274 | 1.02 | 0.065 |
| TP | pregnant | 25 | 14 | 11 | 1.902 | 2.121 ± 0.209 | 0.90 | 2.551 | 0.83 | 0.053 |

**Reading.**
- *Resolution:* the 5-min fixes recover 0.90–0.94 of the per-tick path of the same follows, equally for mothers and
  males in every arm: no class bias.
- *Choice of days:* the followed males' days carry 0.89–0.94 of their class's mean path in all three arms; the followed
  mothers' days carry 0.84 (R), 0.99 (B) and 1.13 (TP). Mothers' follows are lost more often (49%, 68%, 60% against
  38–43% for males; mothers spend 6.0–8.5% of daylight above 15 m against 5.7–7.0%), but the sign of their day choice
  flips between arms, so it is sampling, not a systematic selection: each quick run's mothers' mean rests on 13–24
  complete follow-days (SE 7–10%).
- So the observer's T-RNG-5 = the simulation's ratio × ±0.1 of day sampling: R 0.77 in truth is read as 0.70, TP's 0.69
  as 0.84 (E1i's "mothers range further" was this sampling). **No scorer change is staged.**

## 6. Mechanism: decision (registered 07:15, before any run of changed code; none is built)

The brief's candidates, each against the diagnosis (§4–§5):
1. **A trip valued by its net energy, the infant's mass included.** Ruled out by arithmetic (§4 item 5): walking is 2–4%
   of a trip's food and the infant ≤ 1%; the ledger already charges the carrying (11 kcal/day, 0.6% of a mother's
   spending). A decision that read it could not move the ratio measurably. Not built.
2. **Mothers' choice of company.** The model's mothers of infants under 2 y travel socially like other adult females
   (joined trips, callers and following 0.88 km/day; an adult male in their party 38% of daylight); were they as
   unsocial as mothers of older infants the truth ratio would fall by 0.13. But the field does not say this is wrong: at
   Kanyawara carrying an infant did not shorten mothers' day range (pontzerWrangham2006 via stanton2017), at Gombe
   mothers of sons were more gregarious in the first months (murray2014), and the infant-safety source
   (otaliGilchrist2006) could not be read. The model has no endogenous risk from community males to weigh (infanticide
   is a roll for strangers and new alphas, perception.ts:285), so a company term would need a free risk weight, i.e. a
   prescription. Not built.
3. **The infant's pace or demands.** Young infants are carried (`isCarried`), nursing slows the mother (0.95 against 2.4
   m/min) without stopping her, and only unweaned offspring of 4 y or more walk (the juvenile pace that
   pontzerWrangham2006 found to matter); the mothers of older infants already range least (truth 1.45 against 1.95
   km/day for infants under 2 y). Not built.
4. **What the diagnosis does implicate is not the mothers.** In truth the ratio is R 0.77, B 0.69 and TP 0.69, inside
   the cross-site range (Gombe 0.67–0.74, Kanyawara 0.83), and the observer's value is that ratio times ±0.1 of day
   sampling (§5). R's excess over B is its males' shorter food trips (205 → 112 m; mothers' 214 → 120 m, refilled by
   water and play walks); a likely cause, not tested here, is the trip value's bout, which on R is limited by the
   foregut (bouts of ~25 min, E1i) so that walking time weighs more. Every class carries ~0.45 km/day of prescribed
   walks to water. Both belong
   to other stages (male ranging; E2's water balance).

**Verdict on mechanisms: none; zero iterations used.** One attribution run (not an iteration, no code change) follows.

## 7. Attribution run A1 (registered before its run; not an iteration: no code change)

**A1** = R + `thirstAwakePerH` 0, `thirstSleepPerH` 0, `thirstHotPerH` 0: nobody grows thirsty, so nobody walks to water
(thirst has no other reader: the drink offer, candidates.ts:359–361, and the rules' need buckets, rg.ts:132). Question:
how much of T-RNG-4, T-RNG-5 and T-ACT-2 do the prescribed water walks carry once the freed time goes elsewhere? It
also tells the next stage (E2's water balance) what a physiological drinking rate would cost the fitted rows that C5a
tuned with `fruitThirstFactor` and `drinkDistScaleM`. Tools: `e-bench --quick` (compared with R's four realizations by
`tools/zscore.py`, e-noise.md amendment 2) and `ranging-diagnose.ts`, seeds 48 and 7, frozen checkout of ee8cf7c (the
simulation code of every run in §4–§5).

Predictions (by hand, from R's truth parts in §4; the freed time, about 2.7 walks of ~8 min plus time at the water a
day, goes mostly to resting, grooming and feeding):

| Quantity | R (one realization; R's 4-run mean ± SD where known) | Expected A1 |
| --- | --- | --- |
| Walks to water per adult-day | 2.3–3.1 | < 0.1 |
| Truth path, males / mothers (km/day) | 2.20 / 1.70 | 1.70–1.90 / 1.25–1.45 |
| Truth ratio | 0.77 | 0.72–0.77 |
| T-RNG-4 (observer, km) | 1.835 (1.897 ± 0.126) | 1.40–1.65 (likely below the band's 1.5) |
| T-RNG-5 (observer) | 0.699 (0.706 ± 0.080) | 0.60–0.75: inside noise |
| T-ACT-2 travel share (band 0.12–0.25) | 0.150 (0.152 ± 0.005) | 0.11–0.14 |
| Fitted, held-out sums (z against R's mean) | — | inside noise (|z| < 2) |
| Viability | pass | pass (water has no physiological role in the model) |

Kill criterion: none (no mechanism). Reading registered in advance: if the ratio moves by less than R's spread (0.08)
while T-RNG-4 falls by more than 0.25 km, the water walks are a fitted-row prop, not a mothers' term.

## 8. Follow-day sampling over R's four realizations (the noise on record; §5 registration)

Diagnosis tool on R and its three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405), seeds 48 and 7, 30 + 30 days,
frozen checkout of ee8cf7c; identity holds for every run (the tool's T-RNG-4/5 equal NR1q–NR3q's per-seed values).
Generated by `tools/noise_table.py`:

| realization | complete follow-days, males (seed 48 + 7) | mothers | observer T-RNG-5 | observer, ratio of pooled means | truth ratio (all chimp-days) | followed mothers' days ÷ class truth |
| --- | --- | --- | --- | --- | --- | --- |
| R | 22 + 25 = 47 | 10 + 14 = 24 | 0.699 | 0.700 | 0.772 | 0.84 |
| NR1 | 22 + 24 = 46 | 11 + 11 = 22 | 0.772 | 0.766 | 0.826 | 0.91 |
| NR2 | 22 + 17 = 39 | 7 + 16 = 23 | 0.757 | 0.752 | 0.779 | 1.00 |
| NR3 | 19 + 22 = 41 | 9 + 13 = 22 | 0.595 | 0.607 | 0.766 | 0.82 |
| mean ± SD | 43.2 ± 3.9 | 22.8 ± 1.0 | 0.706 ± 0.080 | | 0.786 ± 0.027 | |

Reading: each quick realization scores T-RNG-5 on 39–47 male and 22–24 mothers' complete follow-days (the field: 27
and 13). Over R's four realizations the observer's ratio is 0.706 ± 0.080 (the integrator's values, reproduced run by
run) while the simulation-truth ratio is 0.786 ± 0.027: the day sampling, not the mothers' behaviour, carries about
90% of the variance of a quick run's T-RNG-5 (SD 0.080 against 0.027), and in these four runs the followed mothers'
days carried 0.82–1.00 of their class's mean path, so the observer read R about 0.08 below its truth. A confirm run (5
seeds × 60 days) has about 5 × the follow-days; R's four confirm realizations spread 0.050 (§0).

*Integrator, during the stage (recorded in substance):* E1i's pair is not confirmed (null under the strict
viability line on 5 seeds), so the optional "best arm on R + `ledgerFoodEnergyFix` + E1i's pair" is skipped and R is
the only reference. The TP diagnosis of §3–§5 (registered and run before that message) stays as context only.

## 9. Known defects and caveats

- No defect was found in the simulation code under test that bears on these measurements; nothing was changed in
  `src/`.
- Observer design, not a defect (src/field/protocols.ts:408, config.ts `loseFactor` 4): a focal is lost 4 × as often while
  it runs or is above 15 m. Field teams lose animals mostly when they travel fast; the model's rule removes days with
  much time in crowns. Its effect on T-RNG-5 is within the day-sampling noise here (§5.1), not separately measured.
- Readout caveats (scripts/ranging-diagnose.ts): the field-method halt uses the 35 m radius for feeding halts too (the
  field used the food patch); a tick's displacement is attributed to the act being executed at the end of that tick;
  "trips" in truth are the movements between halts of the same 35 m / 20 min rule on 1-min daylight positions; the
  observer's class is the focal's state at the follow's start.
- Prescriptions met on the way (no change made): the thirst timers (`thirstAwakePerH`, `thirstSleepPerH`,
  `thirstHotPerH`; design) and the field values of `fruitThirstFactor` and `drinkDistScaleM` (tuned in C5a against
  T-ACT-2 and T-RNG-4), `partyStayW` and `joinSocialW` (tuned in C5a against T-PTY-1, T-ACT-2 and T-RNG-4), and `walkMps`
  (field-copy of the day range and the travel share): the male day range of T-RNG-4 is in large part prescribed.

## 10. Attribution run A1: results (registered in §7)

Runs: frozen checkout of ee8cf7c (`git.dirty` 0), seeds 48 and 7, 30 + 30 days, rules policy:
`artifacts/validation/e1j/A1-quick.json` (e-bench) and `D1-A1-{48,7}.json` (diagnosis), gitignored. Generated by
`tools/final_table.py` (R = mean ± SD over R-quick and NR1q–NR3q and their diagnosis runs) and `tools/zscore.py`:

| quantity | R (mean ± SD, 4 realizations) | A1 |
| --- | --- | --- |
| mothers' day range, observer (km) | 1.337 ± 0.107 | 1.252 |
| males' day range, observer (km) | 1.899 ± 0.128 | 1.547 |
| mothers' path, truth (km/day) | 1.696 ± 0.027 | 1.312 |
| males' path, truth (km/day) | 2.159 ± 0.065 | 1.521 |
| truth ratio (mothers ÷ males) | 0.786 ± 0.027 | 0.863 |
| mothers' daylight share with an adult male | 0.307 ± 0.015 | 0.380 |
| mothers' trips per day (35 m / 20 min) | 6.261 ± 0.056 | 5.079 |
| males' trips per day | 7.092 ± 0.096 | 5.387 |
| walks to water per day, mothers | 2.553 ± 0.035 | 0.000 |
| walks to water per day, males | 2.768 ± 0.032 | 0.000 |
| T-RNG-4 | 1.897 ± 0.126 | 1.499 |
| T-RNG-5 | 0.706 ± 0.080 | 0.880 |
| T-ACT-2 | 0.152 ± 0.005 | 0.114 |
| prescriptions | 103 (all four) | 100 (the three thirst timers at 0 count as not in use) |
| viability | pass | pass |

e-bench rows (A1 against R-quick): T-ACT-1 feeding 0.269 (R 0.298 ± 0.009), T-ACT-3 grooming 0.305 (0.243 ± 0.014,
fail), T-ACT-4 resting with grooming 0.54 (R-quick 0.449 pass; R's four 0.493 ± 0.029), T-ACT-2 travel 0.114 (0.152 ± 0.005, pass → fail),
T-PTY-1 party size 4.37 (3.80 ± 0.15). Sums against the mean of R's four realizations (e-noise.md amendment 2):

```
## A1 against the mean of 4 reference realizations
- fitted: 16 rows; arm 5.138; reference mean 3.900 (runs 5.13, 3.76, 3.42, 3.29; own SD 0.84); change +1.239; SD used 0.84; z +1.32 -> inside noise
  largest row changes vs the mean: T-ACT-3 +0.63, T-HUN-1 +0.46, T-ACT-4 +0.27, T-COM-11 -0.24, T-ACT-1 +0.16, T-SOC-9 -0.11
- held-out: 12 rows; arm 2.978; reference mean 2.534 (runs 2.48, 2.40, 2.23, 3.03; own SD 0.35); change +0.444; SD used 1.26; z +0.31 -> inside noise
  largest row changes vs the mean: T-RNG-5 +0.58, T-SOC-10 +0.25, T-HUN-4 -0.24, T-HUN-8 -0.19, T-FOOD-5 -0.13, T-SOC-6 +0.13
- held-out, no rare: 11 rows; arm 2.978; reference mean 2.292 (runs 2.48, 2.24, 2.23, 2.21; own SD 0.13); change +0.686; SD used 0.48; z +1.28 -> inside noise
  largest row changes vs the mean: T-RNG-5 +0.58, T-SOC-10 +0.25, T-HUN-8 -0.19, T-FOOD-5 -0.13, T-SOC-6 +0.13, T-SOC-3 +0.05
```

Against the predictions (§7): held: no walks to water; mothers' truth path 1.31 (1.25–1.45); T-RNG-4 1.499 (1.40–1.65,
at the band's floor); T-ACT-2 0.114 (0.11–0.14, below its band); every sum inside noise (fitted z +1.32, held-out
+0.31, without the rare-event rows +1.28); viability pass. Missed: males' truth path 1.52 (registered 1.70–1.90); truth
ratio 0.86 (registered 0.72–0.77, R 0.79 ± 0.03: about +3 of R's SDs); T-RNG-5 0.880 (registered 0.60–0.75; z +1.95
against R's four, just inside noise). The registered reading's condition (the ratio moving by less than 0.08) is **not**
met: the static decomposition of §4 (water walks −0.035 on the ratio) had the sign wrong once the freed time is spent.

Reading (attribution, not a candidate: no keep rule applies):
- Without thirst, walks to water vanish (−0.44 km/day for males, −0.40 for mothers, against R's mean) and so does part
  of fission–fusion: parties stay together (males alone 30% → 16% of daylight, with another adult male 45% → 59%;
  mothers alone 48% → 28%; T-PTY-1 3.80 → 4.37), males rejoin by calls half as often (to callers 1.57 → 0.73 a day,
  −0.20 km/day) and follow less, halts lengthen (males 69 → 89 min) and grooming rises out of its band (T-ACT-3 0.24 →
  0.31). Joined trips rise in both classes (+0.21 km/day).
- So the thirst timers do two jobs: about 0.4 km/day of walking per adult, and a fission clock (walks to water split
  parties; males then walk to rejoin them). Males lose 0.64 km/day, mothers 0.38: the water walks and the rejoining
  they trigger add more to males' path than to mothers', so R's ratio would be higher, not lower, without them.
- For E2's water balance: a physiological drinking rate (rainforest apes rarely need to drink, pontzer2021) would take
  away this fission driver too; T-RNG-4 (held at 1.5–3.5 by C5a tuning of `fruitThirstFactor` and `drinkDistScaleM`),
  T-ACT-2 and the activity budget would move with it. Thirst also redraws every rules decision when its bucket changes
  (rg.ts:132), so any change to its dynamics changes bout lengths too (not separated here).

## 11. Verdict and hand-off

**Verdict: no behavioural excess in the mothers; no mechanism built (zero iterations used).** With the integrator's
agreement (integrator's message during the stage: "ending E1j WITHOUT a mechanism is a valid, preferred result"):
1. *Audit.* T-RNG-5's band is Budongo's alone (6 lactating or gestating females, 13 follow-days, fixes only while
   travelling: 0.44, about 0.26–0.63). Gombe's mostly anoestrous females give 0.67–0.74 (wrangham1975, primary;
   movement around a point under ~30 m ignored); Kanyawara's adult females 0.83 and Gombe's 0.70 come from
   pontzerWrangham2004 only through wilson2021 (secondary). A multi-site band (0.3–0.75 from the primary sources;
   0.85 if the secondary figure is admitted) is staged in `docs/staging/e1j-targets.patch.json`, never applied.
2. *The observer.* No scorer fix: the field's travel-only rule moves the ratio by −0.03 (R) and 0 (B); the 5-min
   resolution is the same for both classes. The noise is on record (§8): 39–47 male and 22–24 mothers'
   complete follow-days per quick realization; the observer's ratio 0.706 ± 0.080 over R's four realizations against
   a simulation-truth ratio of 0.786 ± 0.027 (about 90% of a quick run's variance is day sampling).
3. *Mothers.* They walk about the field's distance (observer 1.33 ± 0.11 km/day over R's realizations; Budongo
   1.2 ± 0.8). In truth the ratio is R 0.79 ± 0.03 (B 0.69 and TP 0.69, single runs): above Budongo's band and Gombe's
   0.67–0.74, below Kanyawara's secondary 0.83. R's part above B (+0.10) is its males' (item 4), not its mothers'.
4. **For the energy thread: R's real change against B is its food trips.** On R every class's own trips to food are
   about half as long as on B (males 205 → 112–115 m, mothers 214 → 112–124 m over R's realizations); males also make
   fewer (3.7 → 3.1–3.2 a day) and lose joined and caller trips (−0.32 km/day), so their path falls 0.34 km/day while
   mothers' falls 0.05 (refilled by walks to water and play). Likely cause (not tested): on R a trip is valued by one
   gut-limited bout (~25 min, E1i), so walking time weighs more. As context only (E1i's pair is not confirmed): with the
   food-energy fix and the pair (TP) males' trips partly recover (4.3 a day of 122 m) and the truth ratio is 0.69.
5. *Prescribed path.* Every adult walks to water 2.3–3.1 times a day (~0.45 km, thirst timers; C5a tuned
   `fruitThirstFactor` and `drinkDistScaleM` against T-RNG-4). A1 (§10; attribution) shows the timers also drive
   fission–fusion: without them parties stay together, males stop walking to rejoin callers, males lose 0.64 km/day and
   mothers 0.38, T-RNG-4 falls to 1.50 and T-ACT-3 rises out of band (sums inside noise). E2's water balance will have
   to replace that fission driver, not only the walks.

**Biggest open problem.** Male ranging on the ledger: R halves everyone's food trips and its males' path rests on two
prescriptions (walks to water and the rejoining they trigger), so T-RNG-4 and with it T-RNG-5 are not yet emergent.

## 12. Files, merge and final checks

- Code: `scripts/ranging-diagnose.ts` (new, reads only; typechecked with the repo's strict settings plus node types).
  No change to `src/`, `data/` or `tests/`: R is the integrator's R (identity: e-bench at b0cb6e5 equals R-quick.json
  on all 110 rows; the tool reproduces R-quick and NR1q–NR3q's per-seed T-RNG-4/5, and base-quick's). No new switch,
  parameter or prescription.
- Docs: this file; `docs/staging/e1j-targets.patch.json` (staged multi-site band, never applied); research.md and
  e-sources.md "Addendum: E1j mothers' ranging"; docs/simulation.md note after E1i's.
- Outputs (gitignored, local): `artifacts/validation/e1j/` (the diagnosis JSON of R, NR1–NR3, B, TP and A1, A1's e-bench
  JSON, the first-round runs under `v1/`, and the table scripts under `tools/`).
- `track-e` (3da77a8: E1i's 5-seed confirm, the integrated-confirm registration, handoff; docs only) merged once, at
  dc58dee, without conflicts. After the merge: `gen-params --check` clean, `tsc --noEmit -p .` clean, `pnpm test` 662
  tests, 661 pass, 0 fail, 1 skipped; `git ls-files data/raw node_modules` prints nothing. Prescription count: R 103
  (no switch added); A1 100 (the three thirst timers at 0 are counted as not in use; an attribution, not a candidate).
