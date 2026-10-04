# E4j pre-registration: how often neighbours meet (intergroup encounters on S16)

Status: skeleton committed in the stage's first 15 minutes (4 October 2026, branch `e4j-encounters`, from `track-e`
0777e95): the problem, the field rows and their samples, the diagnosis plan. The diagnosis tool, its readouts and the
run log are written and committed before the diagnosis runs; the mechanism, readouts, predictions and kill criterion
before any run of a switch on. Track E, stage E4, piece j. Rules policy only; development seeds 48 and 7; no run longer
than 90 days in all.

Rule served: field values of behaviour are targets, never inputs. No encounter rate, patrol rate, response share or
detection distance is set from a field value or tuned to hit a row.

## 1. The problem

- S16 (docs/staging/e-stack2-confirm.md "S16 results"; S13 + `socialTiming` 15 + `patrolValue` 2; 49 prescriptions)
  scores T-IGE-1 (intergroup encounters per community-year, fitted, band 5–12) at **22.8** in its 5-seed confirm,
  against 11.4 / 7.19 / 7.46 / 6.55 on S13's four confirm runs. S15 (S13 + `patrolValue` 2 alone) gave 22.6. S16's
  fitted sum is worse beyond noise (z +3.9 against the S13 group), mostly through T-IGE-1 (distance 0 → 1.54).
- `patrolValue` 2 (E4i) raised patrols on the observer from T-PAT-1 0.05–0.09 to 0.23–0.25 per community-week (band
  0.1–0.5) and incursions to T-PAT-6 0.57 (band 0.4–0.7). In truth (E4i, two seeds, 30 + 60 days) S13 started 0.74
  patrols per community-week and value 2 1.85. No patrol turns violent on the observer (T-PAT-7 0 on S13's runs and
  S15; 0.031 on S16).
- E4i left open: the rate of patrolling follows from design constants (`patrolStaleTauDays`, the C6 lead score, RG's
  temperature) that no source fixes, and half of the patrols never hold three adult males. E4f found that the
  observer's colobus encounter scoring differs from the field's (focal against party follows; a new encounter at every
  change of nearest group) and staged scorer fixes, not applied. Whether the intergroup scoring has a like problem is
  part of this stage's diagnosis.

## 2. Field rows scored, and their samples

Sex, reproductive state, body mass and method as the source gives them; body mass enters no row. wilson2012 read in
full this stage (author copy, the E5a stage's download); the rest as E4i recorded them (e4i-prereg.md §2).

| Row (role; band) | Source and sample | Method | Sim scoring (src/field) |
| --- | --- | --- | --- |
| T-IGE-1 (fitted; 5–12 per community-year) | wilson2012 (FT): Kanyawara Jan 1992–Feb 2006 (180 months); community median 47 (43–51), 11 adult males ≥ 12 y (10–13), 15 adult females; 5,527 party follows (median 5.3 h, 0.25–14 h), 35,083 h; 120 encounters (102 acoustic, 15 visual, 3 physical) on 103 follows (1.9%), nine follows with two; 0.34 per 100 h. lemoine2020a (FT): Taï, 4 groups (P. t. verus) 1997–2016, 384 encounters (281 vocal, 103 visual or physical) in 54 group-years, effort as observation days between encounters. watts2006: Ngogo, 95 patrols + 68 other encounters in 41 researcher-months (peak seasons) | party follows staying with the larger subgroup; encounters compiled from the day's narrative notes and the field diary, acoustic ones when calls "appeared to come from a distance and direction towards or beyond the edge" of the range; ambiguous cases rejected; encounters more than 1 h apart scored as separate | encounters on party follows (larger subgroup) ÷ follow-hours × 2,339 h (Kanyawara's effort per year); an encounter = a stranger long call heard by the team or strangers seen by the followed party, one per neighbour community until 60 min without a detection |
| T-IGE-2 (held-out; 0.7–0.9) | wilson2012: 102 acoustic of 120; lemoine2020a: 281 vocal of 384 | as above | share of encounters with no stranger seen, focal follows |
| T-IGE-3 (held-out; 0.25–0.75 log-odds per adult male) | wilson2012: approach +0.49 (SE 0.12) per adult male, 120 encounters | approach = moved at least 50 m toward the foreign chimpanzees within 1 h of first detection | logistic regression of approach on own adult males, focal follows |
| T-PAT-1 (fitted; 0.1–0.5 per week) | wattsMitani2001: Gombe Kasekela and Taï North ~0.3 per week (second hand); massaro2022: Gombe 1978–2007, 180 patrols, median 4.5 a year | observers' recognition of patrols on follows | classified patrols on focal follows ÷ community-days with a follow × 7; instrument bar |
| T-PAT-2 (held-out; 7–18 per male-year) | langergraber2017: Ngogo 1996–2015, 284 patrols, males ≥ 13 y | participation per male | classified patrols joined per adult male-year |
| T-PAT-3 (held-out; 0.55–0.85) | massaro2022: 74.5 ± 11.1% of Gombe's males per patrol; wattsMitani2001: Taï 72% | patrol composition | adult males on a classified patrol ÷ the community's |
| T-PAT-5 (held-out; 60–240 min) | amsler2010: Ngogo, 29 patrols, 134 min (15–348); mitaniWatts2005: 2.13 ± 1.01 h; massaro2022: median 88.5 min | focal follows of patrolling males | duration of classified patrols |
| T-PAT-6 (fitted; 0.4–0.7) | mitaniWatts2005: Ngogo 1999–2003, 42 of 72 patrols entered the neighbours' range | patrol routes | share of classified patrols (male-party follows) entering a neighbour's 95% isopleth |
| T-PAT-7 (held-out; 0.15–0.45) | watts2006: Ngogo 1997–2003, contact on 30 of 95 patrols, physical aggression on 12 | case records | share of classified patrols with a seen or physical encounter |
| T-BRD-1 (held-out, rare row; 0.037–0.107) | lemoine2023: Taï East and South 2013–16, 625 stops ≥ 5 min on 283 group-days, adults present | advance vs retreat at border stops | logistic slope of the focal's advance on adults present at halts at 0.8–1.0 R |
| T-LET-* | need a year (NEEDS_YEAR) | — | reported from truth only (deaths by cause) |

## 3. Diagnosis plan (step 1; unchanged code; to be detailed and committed before any run)

Cheapest decisive check first: a read-only tool (`scripts/e4j-encounter-diagnose.ts`, new) on S16 and on S13, seeds
48 and 7, 30-day burn-in + 60 days (simulation truth and the observer's own records), logging every intergroup
contact: context (patrol, incursion, foraging near the border, pursuit of strangers, other), seen or heard, the pair
of communities, distance, the listener's and the caller's positions relative to both ranges, and whether the
observer's party-follow team counted it. Then: encounters per patrol, encounters outside patrols, and the observer's
definition against wilson2012's Methods. The question to answer with numbers: did more patrols, more contacts per
patrol, more contacts outside patrols, or the scoring double the encounters?

### Run log (each entry written before its run, unless marked)

- **P16a, P16b (the stage's encounter reference; unchanged code).** `e-bench --seeds 48,7 --burn-in 30 --days 60
  --workers 1` on S16 (bench-run4 `artifacts/validation/e/s16/S16-params.json`), P16b with `rgTemperature` 0.1641 added,
  one after the other, from a frozen detached checkout of the commit that adds this entry
  (`scratchpad/e4j/frozen-p`); outputs `artifacts/validation/e4j/P16{a,b}.json` there. Load ~10–19 at launch (other
  agents' runs), hence one worker.
