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
question has two halves: why R's males travel less than B's, and what sets the mothers' day range.

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

### 2.3 Other sites

Pending (source check of pontzerWrangham2004 and pontzerWrangham2006 for Kanyawara, Gombe and Taï sex-class day ranges;
2 routes or 10 minutes per source). research.md already records, from an indexed excerpt only, Kanyawara males 2.4
km/day, adult females about 2.0 and mothers about 1.9 (pontzerWrangham2004): a ratio near 0.8 if verified.
