# Early-life (maternal) effects: pre-registration and C8 design

Stage B7, WP2. First draft 29 September 2026; revised the same day after the WP3 independent review (`artifacts/validation/b7-review.md`, PASS WITH FIXES) and the integrator's sealing ruling. Written before any C8 code and before any simulation value of an early-life outcome exists.

**Staging only:** nothing here is registered. The integrator applies it at WP4.

**Inputs read word for word:**
- `data/targets.json`: `protocolPolicy`, the T-DEM rows, T-SOC-11 and T-LET-5;
- `docs/realism-roadmap.md`: the proof standard;
- `docs/realism-design.md` §5.7 and §8 C8;
- `docs/research.md`, "Early life and maternal effects (chimpanzees)" (WP1);
- the WP3 review;
- the C3–C7a scorecards and JSON in `artifacts/validation/`;
- the sim and observer code listed in §0.

**Evidence rule:**
- Every number comes from `docs/research.md` (WP1), from the WP3 review, or from a source I fetched myself (Appendix A).
- Numbers seen only in an abstract, a press release or a figure are marked UNVERIFIED and never set a band.
- Every target is pattern-only (direction).

**Untouched:** the rows of T-DEM-14, T-DEM-15 and T-LET-5: their definition, band, role, flags and observer protocol. §1.11 pre-registers how T-DEM-15 is computed from its unchanged row.

---

## Review fixes (WP3)

The integrator's items map to WP3 findings 1–11. Findings 12–25 (Low) are also fixed here.

### Old → new target ids

Rows were split so that `encoded` is a per-row flag, which the harness already handles (`src/field/targets.ts` counts encoded rows apart, row by row).

| Old | New | Change |
| --- | --- | --- |
| T-DEM-16 (a) males | not scored; reported as unscored parts of T-DEM-17 | Overlapped T-DEM-15's survival part. Dropped, instead of a "count as one item" rule the harness cannot enforce |
| T-DEM-16 (b) females < 10 | **T-DEM-16**, now daughters orphaned at 5–9.99 | 0–4.99 is dominated by the encoded self-feeding ramp (see T-DEM-24), so it is reported, not scored |
| T-DEM-16 (c) females 10–15 | **T-DEM-17**: sex contrast at 10–14.99, with a power rule | Finding 9 |
| T-DEM-17 stress | **T-DEM-18** (encoded) | |
| T-DEM-18 (a) lean mass, orphans | **T-DEM-19** (encoded) | |
| T-DEM-18 (b) lean mass, alpha mother | **T-DEM-20** (encoded) | Finding 1 |
| T-DEM-19 (a) neighbour pressure | **T-DEM-21** (counted) | |
| T-DEM-19 (b) pregnancy vs lactation | **T-DEM-22** (encoded) | |
| T-DEM-20 aggression by sex | **T-DEM-23** (counted; evidence M) | Finding 15 |
| T-DEM-21 orphan one-year survival | **T-DEM-24** (encoded) | |

### Fix list

| # | Finding (severity) | Resolution | Where |
| --- | --- | --- | --- |
| 1 | T-DEM-18(b) is encoded by the `!dominates(c, guardian)` rule (High) | **Chose: mark it encoded and keep the lever.** A mother can deter only animals she outranks, which is the plausible form of maternal support. Stripping rank out of the rule to rescue a held-out row would be designing for validation. The alpha-mother contrast is now T-DEM-20, encoded-descriptive, so the lean-mass rows count nothing. | §1.7, §2.2, §5.2, §6 |
| 2 | Part-level encoding and "count as one" are not machine-readable (High) | Every encoded part is its own row with `encoded: true`. The "count as one item" rule is dropped. The male survival row that overlapped T-DEM-15 is no longer scored. No harness change is needed. A unit test on the summary counts is added. | §1, §4.1 |
| 3 | Sealing contradicts itself; the T-SOC-11 log is wrong (Medium) | "Sealed" now means **never computed**: the metric function is not called; the JSON, MD, worker messages and scorecards carry no value, n, parts, interval, verdict or "would be" note; `--unseal` refuses unless the registry and freeze hashes match the logged C8 freeze. The sealing check found **no existing value** for T-DEM-14, T-DEM-15 or T-LET-5 (§1.2), so all three are sealed. T-SOC-11 **has** values (C3–C7a) and is not sealed: it falls under the normal policy. Also added: T-DEM-15's full computation (§1.11), the event-log rule, and the ruling text (§1.12). | §1.2, §1.11, §1.12 |
| 4 | F3's path is wrong; caretaker-death re-adoption of adults (Medium) | The younger-sibling path exists only in the caretaker-death branch, which has no age gate. **Fix:** gate that branch like the mother-death branch; honour a caretaker only while the ward is under `guardMaxAgeY`; keep the older-sibling check. Regression tests added. | §2.11, §4.1 |
| 5 | `adopt()` weans orphans at 3 (Medium) | **Fix:** `adopt()` no longer sets `weaned`. Orphans wean at their own `weanAge` and stay on the self-feeding ramp. The literals 3 and 12 move to the registry. The interaction is stated in §2.7 and in T-DEM-24. | §2.7, §2.11, §3 |
| 6 | The structural test misses mating and `contest()`; it fails on today's `giveBirth` (Medium) | (a) now covers the mating offers of a son of 15 or more and of a swollen female toward him, plus `contest()` odds with a fixed ally list. (b) scans all of `src/sim` against an allowlist that includes the `giveBirth` write to `.caretaker` and the `state.ts` declarations. A canary test injects a violation. | §4.3 |
| 7 | The ablation is ill-posed (Medium) | Replaced by two paired ablations with effect sizes, a minimum detectable effect and a stated tolerance. It is a descriptive attribution, never a violation test. It still runs after scoring. | §4.4 |
| 8 | T-DEM-15's computation is not pre-registered (Medium) | Fully specified from its unchanged row and crockford2020 Methods (via WP3): observer data, cohort, statistics, decision rule and minimum samples. Outlines added for T-DEM-14 and T-LET-5. | §1.11 |
| 9 | T-DEM-16(c) passes on low power (Medium) | Now T-DEM-17. It scores the sex contrast of log hazard ratios, is **insufficient** below 200 orphan-years per sex or when the female interval spans more than a factor 4, and reports the minimum detectable effect. | §1.4 |
| 10 | Sonso adoptions misstated (Medium) | Corrected: 3 older immature siblings (9–11 y) cared for 3 younger ones (4–6 y, weaned). The older siblings were orphans too, so the source counts 7 adopted of 11. `docs/research.md` carries the "6 by older siblings" error; see the report. | §2.11, §3 |
| 11 | Proof-plan gaps (Medium) | Held-out rows are scored on 10 fresh seeds never run before the unsealing. Added: a full-table regression run, the compressed bench and `sim-metrics.ts`, the expansion scenario for T-LET-5, the `--unseal` hash binding, and sample-size estimates published before runs. | §8 |
| 12 | "No rule reads sex" is overstated (Low) | Reworded to "no new rule reads the ward's sex"; the existing sex-specific systems are listed. | §2.10, §1.4 |
| 13 | nakamura2014's "under 4.5–5 cannot survive" is the abstract's premise (Low) | Relabelled as a premise. hobaiter2014 is the only age-specific orphan survival data used. | §2.7, §3 |
| 14 | walker2018 medians are in the text (Low) | Deferral text corrected (medians per WP3). The deferral stands: no mechanism makes maturation depend on condition. | §1.1, §7 |
| 15 | T-DEM-20 (now T-DEM-23) evidence H vs the targets.json scale (Low) | Set to M (one community). | §1.9 |
| 16 | Registry labels (Low) | The two flags and `condLow`/`condGood` use `assumed`; `adoptSiblingP` stays `design` with hobaiter2014 in its notes; the counts are fixed; stanton2020 is added to `guardMaxAgeY`'s sources. | §3 |
| 17 | `grow` initialized on the wrong scale (Low) | The newborn's `grow` starts at min(1, gestCond / condGood). | §2.8 |
| 18 | The worked example ignores the hunger term (Low) | Corrected to about 55 days; the test bound is 90 days. | §2.7, §4.1 |
| 19 | Ratio invariance is approximate (Low) | The strength floors (0.1, 0.05) are stated; invariance tests use strengths above them. | §2.6, §4.1 |
| 20 | Bereavement stress reaches Elo for sons of 10–12 (Low) | Acknowledged. It is included in the all-channels-off ablation and in the allowlist rationale. | §2.9, §4.3, §4.4 |
| 21 | `guardMaxAgeY` = 12 comes from T-DEM-15's source (Low) | T-DEM-15's C8 report note is pre-written: "direction partly encoded; guardMaxAgeY = 12 from crockford2020". | §1.11, §5.2 |
| 22 | T-DEM-19 (now T-DEM-21) covariates differ from the source (Low) | Replaced with the source's predictors, controls and random effects (per WP3); the implementer confirms them from the Methods. | §1.8 |
| 23 | reddyMitani2019 statistics (Low) | Marked as table values; P values not confirmed in the text. | §2.4, §3 |
| 24 | The observer cannot compile before the mechanism state exists (Low) | The freeze commit adds inert state fields, the registry entries and pure proxy functions. No sim code reads them until the mechanism commit. | §1.2, §8 |
| 25 | The pre-run condition check is under-specified (Low) | It pools juveniles, never split by orphan status or maternal rank; the 0.55–0.85 band is logged as design; the reset rule and result are logged before any lever run. | §2.6 |

---

## 0. What the code does today (read, not edited)

| # | Finding | Where |
| --- | --- | --- |
| F1 | Losing the mother acts only through `hazardOrphan` (+2.5 per bio-year) for an unweaned orphan under 3 with no caretaker, plus health −0.02 per slow tick while its hunger is above 0.8. | `life.ts` `hazard()`, `slowLife()` |
| F2 | **Adoption of weaned orphans has no behavioural effect.** `adopt()` sets `weaned = true` for orphans of 3 or more; `dependentOn()` ignores the caretaker once an animal is weaned or 6 or older; the juvenile follow (`V.JUVENILE`) reads only `motherId`. | `life.ts`, `candidates.ts` |
| F3 | **Adoption bugs** (as corrected by WP3): `adopt()` runs from two branches, the mother's death (only if the orphan is unweaned or under 8) and the caretaker's death (`ix(k).caretaker === c.id`, **no age gate**). `caretaker` is never cleared. So whenever an adoptive caretaker dies, adoption re-runs for the ward at any age, adults included: it draws from the RNG, sets `weaned` and logs an adoption. Only in that branch can a younger sibling "adopt" an older ward, because there is no older-than check. | `life.ts` `killChimp()`, `adopt()` |
| F4 | Mothers already charge an aggressor of their offspring (`V.DEFEND`, any offspring age). Kin join conflicts through `notifyAllies`: a mother counts as kin at any age, and females join only for kin. An orphan loses both. | `candidates.ts`, `conflict.ts` |
| F5 | Feeding, redirect and grudge charges never target animals under 5 or kin. Nothing in them depends on the target's mother being present. | `candidates.ts` `aggression()` |
| F6 | Individuals under 12 start no aggression. | `candidates.ts` |
| F7 | There is no body-condition or growth variable. | `life.ts` |
| F8 | `strength()` is used in ratios or orderings. A factor common to everyone cancels, **except** where a floor applies (`Math.max(0.1, strength(o))` and `Math.max(0.05, …)` in `candidates.ts` and `conflict.ts`). | `hierarchy.ts`, `conflict.ts`, `candidates.ts` |
| F9 | Male Elo drifts toward the order of `strength()`. | `hierarchy.ts` `maleStrengthDrift()` |
| F10 | 87% of natal females transfer at about 11–13 y. | `params.json` |
| F11 | T-DEM-14, T-DEM-15 and T-LET-5 have no computation (n/a in `src/field/metrics.ts`). | `metrics.ts` |
| F12 | Focal follows take only independent adults of 15 or more. | `protocols.ts` |
| F13 | Pattern targets resolve through a `custom` pool that returns pass or fail, or a null value, which gives the verdict `insufficient`. No harness change is needed for the rules below. | `targets.ts` |

---

## 1. New held-out targets (T-DEM-16 to T-DEM-24)

### 1.1 Summary

| ID | Metric | Rule (pattern) | Encoded | Counts | Weakness |
| --- | --- | --- | --- | --- | --- |
| T-DEM-16 | Survival of daughters orphaned at 5–9.99 y | HR > 1 | no | yes (weak) | abstract-only source; direction partly built in |
| T-DEM-17 | Sex difference in the survival cost of loss at 10–14.99 y | log HR(sons) − log HR(daughters) > 0 | no | yes | abstract-only source; small cells; power rule |
| T-DEM-18 | Stress activation after maternal loss fades | recent orphans above non-orphans; the rest not different | **yes** | no | 7 recent orphans; designed from the source |
| T-DEM-19 | Lean-mass proxy: orphans vs non-orphans | orphans lower | **yes** | no | truth proxy; lever designed with it in view |
| T-DEM-20 | Lean-mass proxy: alpha mother vs other mothers | offspring of the alpha higher | **yes** | no | the dominance rule builds the gradient in |
| T-DEM-21 | Neighbour pressure during pregnancy and offspring survival | HR per SD > 1 | no | yes | one site; depends on C6/C7a |
| T-DEM-22 | Pregnancy window stronger than lactation windows | pregnancy estimate above each lactation estimate | **yes** | no | the prenatal channel exists because of the source |
| T-DEM-23 | Aggression received by immatures, by sex | age × sex > 0; males above females from 4.5 y | no | yes | one community; **expected fail** |
| T-DEM-24 | One-year survival after loss, by age at loss | under 4 lower than 4 or more | **yes** | no | N = 33 pooled; the ramp builds it in |

Counted: T-DEM-16, T-DEM-17, T-DEM-21 and T-DEM-23. Encoded-descriptive (reported, never counted): T-DEM-18, T-DEM-19, T-DEM-20, T-DEM-22 and T-DEM-24.

**Deferred, not registered: walker2018.**
- WP3 reads model-predicted medians in the text: sexual maturity 10.7 y with the mother vs 13.3 y without; first birth 13.6 vs 16.8 y.
- Hazard ratios: 0.07 for maturity (the β is seen in a table only) and 0.45 for first birth. Orphan means losing the mother before 8. The number of orphans is unreported.
- It stays deferred because no C8 mechanism makes maturation depend on condition: `firstSwell` is drawn at birth. A later stage that adds such a mechanism could register it, but it would be encoded if designed from walker2018.

**Not registered: murray2014.** There is no sex-biased maternal term, so no mechanism exists (§2.4, §7).

### 1.2 Rules common to all rows

- **Sealed means never computed** (integrator ruling, §1.12).
  - Covers T-DEM-14, T-DEM-15, T-LET-5 and T-DEM-16…24.
  - The metric function is not called unless `scripts/field-metrics.ts --unseal` is given.
  - JSON, MD, worker messages and scorecards show only the id, the metric and "sealed (C8 proof)", with no value, n, parts, interval, verdict or note.
  - `--unseal` refuses unless the registry hash and the protocol freeze hash equal those logged at the C8 freeze.
  - One logged unsealed run happens at the proof (§8).
- **Sealing check (29 September 2026).**
  - T-DEM-14, T-DEM-15 and T-LET-5 are n/a with n = 0 in every scorecard and JSON: `c3-baseline(-prereview)`, `c3-scorecard(-prereview)`, `c5a-compressed`, `c5a-field`, `c5a-field10(-review)`, `c5a-review-fresh365`, `c5a-review-proof180`, `c5a-scorecard`, `c6-field10y`, `c6-fresh`, `c6-scorecard`, `c6b-field1y`, `c7a-field1y` and `c7a-fresh`.
  - The C6 expansion summaries (`c6/expansion-summary-*`, `scenario-summary.txt`) contain no birth or infant statistic.
  - No value exists, so all three can be sealed.
- **T-SOC-11 is not sealable.** Its values appear in the C3–C7a scorecards, for example:
  - `c6-field10y`: "would be fail", seed interval 0.21–0.28, n 208;
  - `c7a-fresh`: "would be fail", 0.06–0.43;
  - `c7a-field1y`: "would be pass", 0.18–0.58.

  It stays under the normal policy (§1.12).
- **No hand tallies.** During C8 development, no script, notebook or session may tally, from event logs, field logs, genetic-record events or saved worlds, any of:
  - orphan vs non-orphan paternity, survival, growth, stress or aggression;
  - fertility or infant survival by maternal rank;
  - births around an expansion.

  The residual risk (a person reading the app's event feed) is accepted and logged.
- **Known ages only.** Orphan outcomes use individuals born during the run (roster `knownAge`).
- **Orphan status from the census.**
  - The mother is the roster's `mother`.
  - The loss date is her death or, if she disappears, the first day of the observer's `disappearDays` window.
  - The offspring must have been in her community on that date.
  - Transferring daughters are followed in the destination community (all communities are habituated).
- **Pooling and intervals.**
  - The primary verdict uses fresh set B (10 seeds, §8), with seed × community as a stratum or random effect.
  - 90% intervals come from a cluster bootstrap over mothers (1,000 resamples, observer RNG).
- **Verdicts.**
  - Each rule gives **pass** or **fail** when its power rule is met; otherwise **insufficient**, the harness verdict, with the minimum detectable effect (MDE) reported.
  - Power rules are design, fixed now, before any value.
- **Protocol before mechanism.** The freeze commit contains:
  - the observer code for these rows and for T-DEM-15;
  - the registry entries;
  - inert `SimChimp` fields (`cond`, `grow`, `bereft`, `gestCond`, initialized, never read by sim code);
  - pure proxy functions (`leanIndex`).

  The new freeze hash is taken then, **before** any mechanism code exists. Golden hashes move at the freeze commit because of the inert fields; the move is logged as intended.

### 1.3 T-DEM-16: Survival of daughters orphaned at 5–9.99 y

- **Definition.** Hazard of death after the loss for daughters orphaned at 5–9.99 y, compared with daughters whose mother was alive, and in the community, at the same age. Both groups are followed from that age on.
- **Observer protocol.** `census + genealogy`.
  - Cox model with orphan status as a time-varying covariate (on at the loss) and age as the time scale, stratified by seed × community.
  - The 0–4.99 class is reported as an unscored part. It is dominated by the encoded self-feeding ramp; see T-DEM-24.
- **Unit.** Individual. **Statistic:** HR, orphan vs not.
- **Rule** (stanton2020, Abstract, female classes; direction only, n UNVERIFIED):
  - pass if HR > 1 with the 90% lower bound > 1; fail otherwise;
  - **insufficient** below 300 orphan-years or 10 orphan deaths;
  - MDE reported.
- **Role:** held-out. **Encoded:** false.
- **Weakness.** The direction is partly built in: orphans lose protection, condition and bereavement buffering by design (WP3: "counted, weak"). Abstract only, one site.
- **Sources:** stanton2020.

```json
{
 "id": "T-DEM-16",
 "objectives": ["O9"],
 "metric": "Survival of daughters orphaned at 5–9.99 y",
 "definition": "Hazard of death after the mother's death for daughters orphaned at 5–9.99 y vs daughters whose mother was alive and in the community at the same age, followed from that age.",
 "observer": { "protocol": "census + genealogy", "interval_min": null, "unit": "individual" },
 "field": [
  { "population": "Gombe (two communities)", "years": "over 50 y of demographic records", "value": "females orphaned at 0–4.99 and 5–9.99 y survived less than non-orphans", "n": "UNVERIFIED (abstract only)", "method": "survival by age class at maternal loss", "source": "stanton2020", "note": "abstract only; hazard ratios UNVERIFIED" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "direction only: HR > 1 (90% lower bound > 1); insufficient below 300 orphan-years or 10 orphan deaths" },
 "evidence": "M",
 "role": "held-out",
 "encoded": false,
 "notes": "Weak: the direction is partly built in by the C8 levers. The 0–4.99 class is reported, not scored (dominated by the self-feeding ramp; see T-DEM-24). Known-age daughters only; transfers followed.",
 "sources": ["stanton2020"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New held-out target T-DEM-16 (survival of daughters orphaned at 5–9.99 y): census + genealogy protocol, time-varying Cox, pattern rule and power rule (insufficient below 300 orphan-years or 10 orphan deaths) as in docs/staging/early-life-prereg.md §1.3",
 "reason": "B7 pre-registration before any C8 code; rule from stanton2020 Abstract (female classes; direction only, n UNVERIFIED)",
 "targets": ["T-DEM-16"],
 "verdicts": "new",
 "class": "new targets"
}
```

### 1.4 T-DEM-17: Sex difference in the survival cost of maternal loss at 10–14.99 y

- **Definition.** For individuals orphaned at 10–14.99 y: the orphan-vs-non-orphan hazard ratio of sons minus that of daughters, on the log scale.
- **Observer protocol.** `census + genealogy`.
  - The same time-varying Cox model, fitted by sex, with the non-orphan comparison as in §1.3.
  - Statistic: Δ = log HR(sons) − log HR(daughters) at 10–14.99, with its 90% interval from the joint bootstrap.
  - **Unscored parts** (reported with intervals): the class-level log HRs for sons (0–4.99, 5–9.99, 10–14.99) and daughters (10–14.99). The son rows are not scored because sons orphaned at 4–12 are T-DEM-15's survival part.
- **Unit.** Individual.
- **Rule** (stanton2020, Abstract: daughters orphaned at 10–14.99 were no more likely to die than non-orphans, and lived longer after the loss than sons orphaned then):
  - pass if Δ > 0 with the 90% lower bound > 0; fail otherwise;
  - **insufficient** if either sex has fewer than 200 orphan-years or 10 orphan deaths in the class, or if the daughters' 90% interval on HR spans more than a factor of 4;
  - MDE for Δ reported.
- **Role:** held-out. **Encoded:** false. No rule designs the sex contrast; WP3 calls it the genuine test.
- **Weakness.**
  - Abstract only; small cells.
  - The asymmetry can also come from existing sex-specific systems, not only from philopatry and transfer: `dominates()`, male-only status rivalry and Elo drift, the female queue, `notifyAllies` joins by males of 12 or more, and sex-specific strength curves (§2.10).
- **Sources:** stanton2020.

```json
{
 "id": "T-DEM-17",
 "objectives": ["O9"],
 "metric": "Sex difference in the survival cost of maternal loss at 10–14.99 y",
 "definition": "For individuals orphaned at 10–14.99 y: log hazard ratio (orphan vs non-orphan) of sons minus that of daughters.",
 "observer": { "protocol": "census + genealogy", "interval_min": null, "unit": "individual" },
 "field": [
  { "population": "Gombe (two communities)", "years": "over 50 y of demographic records", "value": "males orphaned at 10–14.99 y survived less than non-orphans; females orphaned at 10–14.99 y were no more likely to die than non-orphans and lived longer after the loss than males orphaned at that age; males orphaned at 0–4.99 and 5–9.99 y also survived less", "n": "UNVERIFIED (abstract only)", "method": "survival by age class at maternal loss", "source": "stanton2020", "note": "abstract only" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "log HR(sons) − log HR(daughters) at 10–14.99 y > 0 (90% lower bound > 0); insufficient below 200 orphan-years or 10 orphan deaths per sex, or a daughters' HR interval wider than 4-fold" },
 "evidence": "M",
 "role": "held-out",
 "encoded": false,
 "notes": "Class-level HRs (sons 0–4.99, 5–9.99, 10–14.99; daughters 10–14.99) reported as unscored parts; sons' post-weaning survival is scored only in T-DEM-15. The asymmetry may also arise from existing sex-specific systems (dominance, male rivalry, female queue).",
 "sources": ["stanton2020"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New held-out target T-DEM-17 (sex difference in the survival cost of maternal loss at 10–14.99 y): statistic log HR(sons) − log HR(daughters), pattern rule and power rule as in docs/staging/early-life-prereg.md §1.4; class-level HRs reported as unscored parts",
 "reason": "B7 pre-registration; WP3 finding 9 (power); rule from stanton2020 Abstract",
 "targets": ["T-DEM-17"],
 "verdicts": "new",
 "class": "new targets"
}
```

### 1.5 T-DEM-18: Stress activation after maternal loss fades (encoded)

- **Definition.** Early-morning stress reading of immatures under 12 in three groups: orphaned less than 2 y before the sample, orphaned 2 y or more before, and non-orphans. Also mature males (12 or older) orphaned before 12 vs not.
- **Observer protocol.** `endocrine proxy (truth)`.
  - Once per follow-day, the observer reads `chimp.stress` for each immature and adult male in the focal party between 06:00 and 08:00. The window is chosen because the source's steeper slope came from higher early-morning cortisol.
  - Model: log reading on group, age and sex, with a random individual effect.
  - Truth read without noise. The sim has no diurnal rhythm, so the source's slope cannot be reproduced.
- **Unit.** Sample.
- **Rule** (girardButtoz2021, Results; all-immature and all-adult-male models):
  - recent orphans above non-orphans (90% lower bound > 0);
  - earlier orphans, and adult males orphaned before 12, not different (interval includes 0);
  - insufficient below 5 recently orphaned individuals with samples.
- **Role:** held-out. **Encoded: true**: the decay and age limit come from this source.
- **Source:** girardButtoz2021.

```json
{
 "id": "T-DEM-18",
 "objectives": ["O9"],
 "metric": "Stress activation after maternal loss fades",
 "definition": "Early-morning stress reading of immatures under 12 orphaned < 2 y before, orphaned >= 2 y before, and non-orphans; mature males orphaned before 12 vs not.",
 "observer": { "protocol": "endocrine proxy (truth)", "interval_min": null, "unit": "sample" },
 "field": [
  { "population": "Taï (P. t. verus)", "years": "2000–2018", "value": "recently orphaned immatures (< 2 y since loss): diurnal cortisol slope 58% steeper (−0.60 vs −0.38), from higher early-morning cortisol; immatures orphaned earlier did not differ; mature males orphaned before 12 showed no consistent difference", "n": "immatures: 7 recent, 16 earlier, 36 non-orphans (846 samples, 50 individuals; some in more than one class); mature males 11 vs 17 (2,184 samples)", "method": "Bayesian mixed models of diurnal cortisol slope", "source": "girardButtoz2021", "note": "" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "recent orphans above non-orphans; earlier orphans and adult orphan males not different" },
 "evidence": "M",
 "role": "held-out",
 "encoded": true,
 "notes": "Encoded-descriptive: bereaveHalfLifeD and bereaveMaxAgeY were designed from this source; reported, never counted. Truth read of stress at 06:00–08:00 (no diurnal rhythm in the sim).",
 "sources": ["girardButtoz2021"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New check T-DEM-18 (stress activation after maternal loss fades), held-out and encoded: endocrine proxy protocol and pattern rule as in docs/staging/early-life-prereg.md §1.5",
 "reason": "B7 pre-registration; the bereavement mechanism is designed from girardButtoz2021, so the row is encoded-descriptive and never counted",
 "targets": ["T-DEM-18"],
 "verdicts": "new (encoded-descriptive)",
 "class": "new targets"
}
```

### 1.6 T-DEM-19: Lean-mass proxy, orphans vs non-orphans (encoded)

- **Definition.** Lean-mass proxy of individuals 4–15 y, by age and sex: orphans (mother lost after weaning and before 10) vs age-matched non-orphans.
- **Observer protocol.** `urine proxy (truth) + census`.
  - Collection: once per 10 follow-days on which an individual aged 4–15 is in the focal party. This sampling-effort rule is design; it matches the source's 18.8 ± 19.2 samples per subject.
  - Reading: the pure function `leanIndex = ageBase(age, sex) × ((1 − growStrengthW) + growStrengthW × grow)`, where `ageBase` is the age part of `strength()`. No noise.
  - Model: log index with half-year age bins × sex, an orphan term, and a random individual effect.
- **Unit.** Sample.
- **Rule** (samuni2020, Results, Table 1):
  - orphan coefficient < 0 (90% upper bound < 0);
  - insufficient below 10 orphans with samples.
- **Role:** held-out. **Encoded: true.** The feeding lever and the condition-to-growth route were designed with this result and its proposed mechanism in view.
- **Source:** samuni2020.

```json
{
 "id": "T-DEM-19",
 "objectives": ["O9"],
 "metric": "Lean-mass proxy: orphans vs non-orphans",
 "definition": "Lean-mass proxy of individuals aged 4–15 by age and sex: orphans (mother lost after weaning and before 10) vs age-matched non-orphans.",
 "observer": { "protocol": "urine proxy (truth) + census", "interval_min": null, "unit": "sample" },
 "field": [
  { "population": "Taï (P. t. verus)", "years": "two decades", "value": "orphans had less lean mass than age-matched non-orphans (−0.122 ± 0.046 on log SG-corrected creatinine, χ² = 6.376, P = 0.012)", "n": "1,318 samples from 70 individuals aged 4–15, 18 orphans", "method": "LMM of SG-corrected urinary creatinine", "source": "samuni2020", "note": "no sex × orphan term reported" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "orphans lower" },
 "evidence": "M",
 "role": "held-out",
 "encoded": true,
 "notes": "Encoded-descriptive: the feeding lever and condition-to-growth route were designed with this result in view; reported, never counted. The proxy reads the growth record without noise.",
 "sources": ["samuni2020"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New check T-DEM-19 (lean-mass proxy, orphans vs non-orphans), held-out and encoded: urine-proxy protocol (one sample per 10 follow-days present; truth read of leanIndex) and pattern rule as in docs/staging/early-life-prereg.md §1.6",
 "reason": "B7 pre-registration; split from the former T-DEM-18 (WP3 finding 2); rule from samuni2020 Table 1",
 "targets": ["T-DEM-19"],
 "verdicts": "new (encoded-descriptive)",
 "class": "new targets"
}
```

### 1.7 T-DEM-20: Lean-mass proxy, alpha mother vs other mothers (encoded)

- **Definition.** Among 4–10-year-olds whose mothers are alive and in the community, the lean-mass proxy of the alpha female's offspring vs that of all other mothers' offspring. The alpha female is the top of the female Elo order at the sample date.
- **Observer protocol.** `urine proxy (truth) + census + Elo`: the same collection and reading as T-DEM-19, with a not-alpha-mother term.
- **Unit.** Sample.
- **Rule** (samuni2020, Results, Table 2):
  - not-alpha coefficient < 0 (90% upper bound < 0);
  - no rank gradient required (continuous rank P = 0.093);
  - insufficient below 5 offspring of alpha mothers.
- **Role:** held-out. **Encoded: true** (WP3 finding 1). The feeding deterrence works only against supplanters who do not dominate the mother, so an alpha female's offspring are protected from every female supplanter. That builds a monotone maternal-rank gradient, and the lever is motivated by this source.
- **Source:** samuni2020.

```json
{
 "id": "T-DEM-20",
 "objectives": ["O9"],
 "metric": "Lean-mass proxy: alpha mother vs other mothers",
 "definition": "Among 4–10-year-olds with living mothers in the community, lean-mass proxy of the alpha female's offspring vs of other mothers' offspring.",
 "observer": { "protocol": "urine proxy (truth) + census + Elo", "interval_min": null, "unit": "sample" },
 "field": [
  { "population": "Taï (P. t. verus)", "years": "two decades", "value": "offspring of subordinate mothers had less lean mass than offspring of the alpha female (−0.292 ± 0.103, P = 0.006); continuous maternal rank not significant (P = 0.093)", "n": "414 samples, 48 offspring aged 4–10, 29 mothers", "method": "LMM of SG-corrected urinary creatinine", "source": "samuni2020", "note": "" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "offspring of the alpha female higher than of all other mothers; no gradient required" },
 "evidence": "M",
 "role": "held-out",
 "encoded": true,
 "notes": "Encoded-descriptive (WP3 finding 1): the feeding deterrence reads dominance relative to the mother, which builds the gradient in; reported, never counted.",
 "sources": ["samuni2020"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New check T-DEM-20 (lean-mass proxy, alpha mother vs other mothers), held-out and encoded: protocol and pattern rule as in docs/staging/early-life-prereg.md §1.7",
 "reason": "B7 pre-registration; split from the former T-DEM-18 and labelled encoded per WP3 finding 1 (the lever reads dominance relative to the mother); rule from samuni2020 Table 2",
 "targets": ["T-DEM-20"],
 "verdicts": "new (encoded-descriptive)",
 "class": "new targets"
}
```

### 1.8 T-DEM-21: Neighbour pressure during pregnancy and offspring survival

- **Definition.** Offspring survival against the community's neighbour-pressure index (NPI), averaged over the 8.5 months before each birth.
- **Observer protocol.** `all-occurrence encounters + fixes + census`.
  - Encounters: the encounter classifier's seen and heard encounters, with locations.
  - Territory: centre, and 75% and 95% kernels, from the observer's location fixes. The 95% UD is per calendar year; the 75% border and use classes cover the preceding 12 months.
  - Index: NPI = mean over encounters j of (I_j × K_j), multiplied by F (lemoine2020a STAR Methods, "Food availability and neighbor pressure index"):
    - I: the encounter's distance from the centre, relative to the distance to the 75% kernel border;
    - K: past-12-month use of the location, in 10% kernel classes;
    - F: mean encounter frequency, from observation days between consecutive encounters.
  - **The exact transform of I is UNVERIFIED.** The implementer quotes the Methods text into the protocolLog before the freeze; if it is not fixed there, I = max(0, 1 − d/d75) (design), logged before the freeze.
  - Survival: census; a Cox model on the source's variables (per WP3), which the implementer confirms from the Methods before the freeze:
    - test predictors: number of mature males, NPI, number of within-group weaned individuals, and food availability;
    - controls: mother's rank, her age at the birth, and offspring sex;
    - random effects: mother and group (here seed × community).
  - NPI is z-scored over all offspring.
- **Unit.** Offspring. **Statistic:** HR per SD.
- **Rule** (lemoine2020a, Results, Table 1):
  - HR > 1 with the 90% lower bound > 1;
  - insufficient below 30 offspring deaths.
- **Role:** held-out. **Encoded:** false. The predictor is C6 behaviour. The prenatal channel is motivated by the same paper, so a pass is moderate evidence (WP3).
- **Weakness.** One site, 81 offspring. It depends on the frozen C6/C7a model (§5.5).
- **Source:** lemoine2020a.

```json
{
 "id": "T-DEM-21",
 "objectives": ["O4", "O9"],
 "metric": "Neighbour pressure during pregnancy and offspring survival",
 "definition": "Offspring survival (Cox) vs the community's neighbour-pressure index averaged over the 8.5 months before birth, with the source's predictors and controls.",
 "observer": { "protocol": "all-occurrence encounters + fixes + census", "interval_min": 30, "unit": "offspring" },
 "field": [
  { "population": "Taï (P. t. verus)", "years": "1997–2016 (54 group-years)", "value": "higher neighbour pressure during pregnancy raised offspring mortality (b = 1.025 ± 0.391, P = 0.008; hazard-ratio 95% CI 1.51–4.85; full model LRT χ² = 9.50, df = 4, P = 0.04); maternal rank no effect (P = 0.55)", "n": "81 offspring of 44 mothers (37 died)", "method": "mixed-effects Cox model", "source": "lemoine2020a", "note": "index = mean(I × K) × F, STAR Methods" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "HR per SD of pregnancy-window pressure > 1 (90% lower bound > 1); insufficient below 30 offspring deaths" },
 "evidence": "M",
 "role": "held-out",
 "encoded": false,
 "notes": "The prenatal condition channel (birthCondFromMother) is motivated by this source's hypothesis: a pass is moderate evidence. Touched by any C6/C7a change to encounters, ranging or contact memory made after its value is seen.",
 "sources": ["lemoine2020a"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New held-out target T-DEM-21 (neighbour pressure during pregnancy and offspring survival): NPI = mean(I × K) × F per lemoine2020a STAR Methods (I transform UNVERIFIED: quoted before the freeze, else max(0, 1 − d/d75), logged), 8.5-month window, Cox with the source's predictors, controls and random effects (confirmed from the Methods before the freeze), pattern rule as in docs/staging/early-life-prereg.md §1.8",
 "reason": "B7 pre-registration; split from the former T-DEM-19 (WP3 finding 2); covariates per WP3 finding 22; rule from lemoine2020a Table 1",
 "targets": ["T-DEM-21"],
 "verdicts": "new",
 "class": "new targets"
}
```

### 1.9 T-DEM-22: Pregnancy window stronger than lactation windows (encoded)

- **Definition.** The T-DEM-21 model refitted with NPI averaged over the first 1, 2 and 3 years of lactation, compared with the pregnancy-window estimate.
- **Observer protocol.** As T-DEM-21.
- **Unit.** Offspring.
- **Rule** (lemoine2020a, Results, lactation-window models: P = 0.64–0.80):
  - the pregnancy-window log HR exceeds each lactation-window log HR (point estimates);
  - insufficient below 30 offspring deaths.
- **Role:** held-out. **Encoded: true.** The only new prenatal channel exists because of this source, so the contrast is partly built in.
- **Source:** lemoine2020a.

```json
{
 "id": "T-DEM-22",
 "objectives": ["O4", "O9"],
 "metric": "Neighbour pressure: pregnancy window stronger than lactation windows",
 "definition": "Offspring survival vs neighbour pressure averaged over the first 1, 2 and 3 years of lactation, compared with the pregnancy-window estimate (T-DEM-21 model).",
 "observer": { "protocol": "all-occurrence encounters + fixes + census", "interval_min": 30, "unit": "offspring" },
 "field": [
  { "population": "Taï (P. t. verus)", "years": "1997–2016 (54 group-years)", "value": "averaged over the first 1, 2 or 3 years of lactation, neighbour pressure had no effect on survival (P = 0.64–0.80), unlike the pregnancy window (P = 0.008)", "n": "81 offspring of 44 mothers", "method": "mixed-effects Cox models", "source": "lemoine2020a", "note": "" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "pregnancy-window log HR above each lactation-window log HR" },
 "evidence": "M",
 "role": "held-out",
 "encoded": true,
 "notes": "Encoded-descriptive: the prenatal channel exists because of this source; reported, never counted.",
 "sources": ["lemoine2020a"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New check T-DEM-22 (pregnancy vs lactation windows of neighbour pressure), held-out and encoded: protocol as T-DEM-21, pattern rule as in docs/staging/early-life-prereg.md §1.9",
 "reason": "B7 pre-registration; split from the former T-DEM-19 part (b) (WP3 finding 2)",
 "targets": ["T-DEM-22"],
 "verdicts": "new (encoded-descriptive)",
 "class": "new targets"
}
```

### 1.10 T-DEM-23: Aggression received by immatures, by sex

- **Definition.** Rate of aggression received (charging displays, chases, attacks) by immatures under 9, per hour present in the followed party, by half-year of age and sex.
- **Observer protocol.** `all-occurrence agonism + party scans`.
  - Aggression: all-occurrence records during follows in which the recipient is an immature under 9. These are the decided conflicts it lost or gave way in, plus chases.
  - Exposure: hours in the focal party from the 15-minute scans (0.25 h per scan present).
  - Model: negative binomial GLMM with age × sex, an offset of log hours, and a random individual effect.
- **Unit.** Individual-half-year.
- **Rule** (sabbi2021, Results):
  - pass if both hold: the age × sex coefficient > 0 (90% lower bound > 0), and the male:female rate ratio pooled over 4.5–6.0 y > 1 (90% lower bound > 1);
  - fail otherwise;
  - insufficient below 10 immatures of each sex with ≥ 20 h present at 4.5–6.0 y.
- **Role:** held-out. **Encoded:** false. **Evidence:** M (one community).
- **Expected verdict: fail, reported as a gap.** The source's main predictor, the juvenile's own aggression (β = 2.694), has no sim counterpart (F6), and feeding supplants skip animals under 5 (F5).
- **Source:** sabbi2021.

```json
{
 "id": "T-DEM-23",
 "objectives": ["O9", "O11"],
 "metric": "Aggression received by immatures, by sex",
 "definition": "Rate of aggression received (charging displays, chases, attacks) per hour present in the followed party by immatures under 9, by half-year of age and sex.",
 "observer": { "protocol": "all-occurrence agonism + party scans", "interval_min": 15, "unit": "individual-half-year" },
 "field": [
  { "population": "Kanyawara", "years": "2005–2017", "value": "aggression received rose faster with age in males (age × sex β = 0.115 ± 0.06, P = 0.04); males received more than females by about 4–5 y (about 3× by 5 y); aggression displayed predicted aggression received (β = 2.694, P < 0.001), not mediated by sex; time in parties with or near adult males did not differ by sex", "n": "49 immatures under 9 (25 F, 24 M); focal subsample 25 (14 F, 11 M), 2015–2017", "method": "all-occurrence aggression during party follows, per hour observed", "source": "sabbi2021", "note": "" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "age × sex > 0 and male:female rate ratio > 1 at 4.5–6 y (90% lower bounds); insufficient below 10 immatures per sex with >= 20 h at 4.5–6 y" },
 "evidence": "M",
 "role": "held-out",
 "encoded": false,
 "notes": "Pre-registered expectation: fail (no juvenile aggression mechanism; supplants skip animals under 5). Reported as a gap, never tuned.",
 "sources": ["sabbi2021"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New held-out target T-DEM-23 (aggression received by immatures under 9, by sex): all-occurrence agonism with party-scan exposure, negative binomial age × sex model, pattern rule as in docs/staging/early-life-prereg.md §1.10; expectation: fail",
 "reason": "B7 pre-registration; rule from sabbi2021 Results; evidence M per the targets.json scale (WP3 finding 15)",
 "targets": ["T-DEM-23"],
 "verdicts": "new",
 "class": "new targets"
}
```

### 1.11 T-DEM-24: One-year survival after maternal loss, by age at loss (encoded)

- **Definition.** Share of orphans (immatures under 12) alive one year after the loss: orphaned under 4 vs at 4 or more.
- **Observer protocol.** `census + genealogy`, known-age orphans.
- **Unit.** Orphan.
- **Rule** (hobaiter2014, Results, logistic regression on age, N = 33, four sites):
  - survival under 4 is lower than at 4 or more (90% interval of the difference excludes 0);
  - the field's 42% and 95% are quoted, not scored;
  - insufficient below 10 orphans in either class.
- **Role:** held-out. **Encoded: true.** The self-feeding ramp, which runs to each individual's weaning age now that `adopt()` no longer weans at 3 (§2.7), builds the direction in.
- **Source:** hobaiter2014.

```json
{
 "id": "T-DEM-24",
 "objectives": ["O9"],
 "metric": "One-year survival after maternal loss, by age at loss",
 "definition": "Share of orphans (immatures under 12) alive one year after the mother's death, orphaned under 4 vs at 4 or more.",
 "observer": { "protocol": "census + genealogy", "interval_min": null, "unit": "orphan" },
 "field": [
  { "population": "Budongo Sonso; Gombe; Mahale; Taï (pooled)", "years": "various", "value": "one-year survival depended only on age at loss (P = 0.017): 42% of orphans under 4 vs 95% of those 4 or older; at Sonso adopted orphans 100% vs non-adopted 25% (Fisher P = 0.024)", "n": "N = 33 (pooled); Sonso 11 orphans", "method": "logistic regression", "source": "hobaiter2014", "note": "" }
 ],
 "accept": { "lo": null, "hi": null, "units": "pattern", "basis": "survival lower for loss under 4" },
 "evidence": "M",
 "role": "held-out",
 "encoded": true,
 "notes": "Encoded-descriptive: the self-feeding ramp to each individual's weaning age builds the direction in (adopt() no longer weans at 3); checks the replacement of hazardOrphan; reported, never counted.",
 "sources": ["hobaiter2014"]
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (no C8 mechanism)",
 "param": "New check T-DEM-24 (one-year survival after maternal loss, under 4 vs 4 or more), held-out and encoded: census + genealogy protocol and pattern rule as in docs/staging/early-life-prereg.md §1.11",
 "reason": "B7 pre-registration; checks the replacement of hazardOrphan by energy effects; rule from hobaiter2014 Results (N = 33 pooled); encoded-descriptive, never counted",
 "targets": ["T-DEM-24"],
 "verdicts": "new (encoded-descriptive)",
 "class": "new targets"
}
```

### 1.12 Pre-registered computation of T-DEM-15 (row unchanged)

T-DEM-15's registered row: definition "Sons orphaned at 4–12 y vs non-orphaned: age at first paternity, offspring per conception opportunity, survival"; band basis "orphaned sons later and less successful". The computation below implements that row. It takes its method details from crockford2020 Methods, as confirmed by WP3 (finding 8), and changes nothing in the row.

**Observer data.**
- Census roster: sex, known age, mother, community, loss dates.
- Detected births with the genetic record (truth `fatherId`, the analogue of genotyping) and the offspring's survival to 2 y.
- Deaths.

**Cohort.**
- Males born during the run (known age) whose mother is known.
- **Orphans:** the mother died when the son was 4.0–11.99 y, and he was in her community then.
- **Non-orphans:** the mother was alive and in the community until the son was 12.0.
- Sons who lost the mother before 4 are excluded. So are sons whose mother left the community before he was 12, and sons that transferred.
- **Paternity parts:** males aged 14 or more at death or at the run's end (crockford2020's orphans were 14 or older).

**Statistics.**
1. **Age at first paternity.**
   - The son's age at the **conception** date (birth − 228 d, the sim's gestation) of his first offspring that survived at least 2 y and was born in his community.
   - Among males with at least one such paternity, as in the source.
   - Estimate: the orphan − non-orphan difference in means, with the 90% bootstrap interval.
   - The share who never sired is reported by group (unscored).
   - crockford2020's reference point (conception or birth) is UNVERIFIED: the implementer quotes it from the Methods before the freeze. If it is birth, the birth date is used instead, and that is logged.
2. **Offspring per conception opportunity.**
   - Poisson GLMM of the number of paternities (offspring surviving at least 2 y, born in his community), with offset log(number of conceptions in his community that led to offspring surviving at least 2 y, from his age 10 until his death or the run's end).
   - Orphan status as the predictor; seed × community as the random effect.
   - Estimate: the orphan coefficient (a log rate ratio) with its 90% interval.
   - A secondary model adds alpha tenure, as in the source; it is reported, unscored.
   - The sim cannot sire before 12, which applies to both groups.
3. **Survival.**
   - Time-varying Cox from age 4: the orphan term switches on at a loss at 4.0–11.99 y, with age as the time scale and stratified by seed × community.
   - Estimate: HR with its 90% interval.
   - The row cites nakamura2014, which gives no method, so this form is design, fixed now.

**Decision rule** (band basis "later and less successful"; survival is part of the definition).
- **Insufficient** if any holds:
  - fewer than 8 orphans or 8 non-orphans with at least one paternity (crockford2020 had 12 and 11);
  - fewer than 10 orphan deaths in part 3.
- Otherwise **pass** if all three parts are in the field direction with their 90% interval excluding the null: difference > 0, log rate ratio < 0, HR > 1.
- **Fail** otherwise.
- The MDE for each part is reported.

**Report note** (C8 report only, not a row edit): "direction partly encoded: the lever directions follow crockford2020's proposed mechanisms, and guardMaxAgeY = 12 is crockford2020's age of social independence" (WP3 ruling and finding 21).

**Outlines for the other never-computed targets.** These are written from their unchanged rows. The source-specific definitions are marked for quoting before the freeze.

- **T-DEM-14** (female rank and fertility):
  - Birth hazard: Cox model of the time from a birth whose infant survived to the next birth, with a "high-ranking" indicator for the mother. The definition of "high-ranking" is to be quoted from jones2010's Methods (UNVERIFIED here).
  - Infant survival to 1 and 5 y by the same indicator.
  - Pattern: shorter intervals and higher infant survival for high-ranking mothers (the row's band basis).
  - Census plus the female Elo order at conception.
  - Insufficient below 30 intervals per group.
- **T-LET-5** (payoff of expansion):
  - `scripts/field-scenario.ts expansion` with the C8 model at natural aging, 10 years, the fresh seeds of §8, and the paired baseline.
  - The expansion date is the first month in which the winner's annual 95% range exceeds its year-1 range by at least 10%. That is a design threshold in the spirit of T-LET-4's band; wood2025's own definition of the 2009 expansion is to be quoted before the freeze.
  - Births, and infant deaths before 3, in the 3 y before vs after that date, vs the paired baseline over the same years.
  - Pattern: more births and fewer infant deaths after expansion than before, and more than the baseline change.
  - Insufficient if no expansion happens in a seed. Such seeds are reported, not re-run.

### 1.13 Further protocolLog entries (ruling text and labels)

**Integrator ruling on sealing.** Text for the integrator to apply at WP4:

```json
{
 "date": "2026-09-29 (ruling; logged at WP4)",
 "by": "integrator (ruling; text drafted by B7 WP2)",
 "seen": "T-DEM-14, T-DEM-15 and T-LET-5: no value exists (n/a with n = 0 in every C3–C7a scorecard and JSON in artifacts/validation/; no birth or infant statistic in the C6 expansion summaries); T-DEM-16..24: new, no value",
 "param": "Ruling. (1) The first implementation of a never-computed held-out target does not touch it, provided that it is written from the registered definition and the source's methods, that no mechanism code that could move it exists yet, and that a new freeze hash is taken before any run. (2) Sealed means never computed: the metric function is not called unless scripts/field-metrics.ts --unseal is given; JSON, MD, worker messages and scorecards carry no value, n, parts, interval, verdict or 'would be' note (tested on the JSON output). (3) --unseal refuses unless the parameter-registry hash and the protocol freeze hash equal those logged at the C8 freeze. (4) During C8 development no script, notebook or session tallies orphan vs non-orphan outcomes, fertility or infant survival by maternal rank, or births around an expansion from event logs, field logs, genetic-record events or saved worlds; the residual risk of a person reading the app's event feed is accepted. Sealed until the C8 proof: T-DEM-14, T-DEM-15, T-LET-5, T-DEM-16..24",
 "reason": "WP3 review (sealing answer and finding 3); protocolPolicy intent: block value-informed changes",
 "targets": ["T-DEM-14", "T-DEM-15", "T-LET-5", "T-DEM-16", "T-DEM-17", "T-DEM-18", "T-DEM-19", "T-DEM-20", "T-DEM-21", "T-DEM-22", "T-DEM-23", "T-DEM-24"],
 "verdicts": "sealed until the C8 proof",
 "class": "ruling"
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists (n/a in every C3–C7a scorecard)",
 "param": "T-DEM-15 computation pre-registered from its unchanged row and crockford2020 Methods (via WP3 finding 8): cohort (known-age sons; orphans lost the mother at 4.0–11.99 y; non-orphans' mother alive to 12; paternity parts need age >= 14), statistics (first paternity at conception of the first offspring surviving >= 2 y; Poisson paternities with offset log conceptions from age 10; time-varying Cox survival from 4), decision rule and insufficient thresholds as in docs/staging/early-life-prereg.md §1.12; report note 'direction partly encoded; guardMaxAgeY = 12 from crockford2020'",
 "reason": "WP3 finding 8; row untouched",
 "targets": ["T-DEM-15"],
 "verdicts": "no value",
 "class": "pre-registration"
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "C3–C7a scorecards and JSON (for example c6-field10y 'would be fail', seed interval 0.21–0.28, n 208; c7a-fresh 'would be fail', 0.06–0.43; c7a-field1y 'would be pass', 0.18–0.58)",
 "param": "T-SOC-11 is not sealed (values exist). Under the normal policy: C8 changes strength (growth record), feeding and health for every animal, so C8 is a model change after its value was seen; T-SOC-11 is re-tested on the fresh seeds of the C8 proof, labelled 'model revised post-freeze', and counts only if no parameter was set by looking at it",
 "reason": "WP3 finding 3 (correction of the earlier draft's 'no value exists'); C6 precedent for model changes after a value was seen",
 "targets": ["T-SOC-11"],
 "verdicts": "model revised post-freeze (pending)",
 "class": "labels"
}
```

```json
{
 "date": "2026-09-29",
 "by": "B7 WP2 design agent (pre-registration after WP3; entered by the integrator at WP4)",
 "seen": "no value exists",
 "param": "walker2018 (maturation of daughters orphaned before 8) considered and deferred, not registered: model-predicted medians in the text (maturity 10.7 vs 13.3 y; first birth 13.6 vs 16.8 y, per WP3), hazard ratios 0.07 and 0.45, number of orphans unreported; no C8 mechanism makes maturation depend on condition",
 "reason": "no mechanism; a later registration designed from walker2018 would be encoded",
 "targets": [],
 "verdicts": "deferred",
 "class": "labels"
}
```

---

## 2. C8 mechanism design

### 2.1 Principle

After weaning, the mother acts **only through levers that already exist**, now defined for a *guardian*. A juvenile's guardian is its mother, if she is alive and in its community. Otherwise it is its adoptive caretaker, if the caretaker is alive and in the community **and the ward is under `guardMaxAgeY`**. Otherwise there is none.

The levers:
1. feeding tolerance: energy → condition → growth → strength;
2. protection: aggression received;
3. association: following the guardian;
4. coalition support: the rank climb.

Two effects come from the loss and from before birth:
5. a transient bereavement stress;
6. the prenatal condition channel.

**What no rule does:**
- no new rule reads the ward's sex;
- no rule keys paternity, rank or fertility on orphan status;
- no rule has an orphan-specific branch.

`guardianOf(world, c)` is a pure helper in `candidates.ts`. It uses no RNG and does not read `x.seen`; callers check perception themselves.

### 2.2 Lever 1: feeding tolerance

- **Rule** (`candidates.ts`, `aggression()`, `V.FEED`). The supplant score on `o` drops by `guardFeedDeterW` when all of these hold:
  - `o.age < guardMaxAgeY`;
  - `g = guardianOf(o)` exists and `g !== c`;
  - `g` is in `x.seen`;
  - `g` is within `defendRangeM` of `o`;
  - `!dominates(c, g)`.
- A guardian never supplants its ward.
- **Consequence.**
  - Adult males are never deterred (`dominates`).
  - Offspring of higher-ranking mothers are protected from more supplanters. **This builds a maternal-rank gradient in** (WP3 finding 1), which is why T-DEM-20 is encoded. The rule is kept, because a mother deterring only animals she outranks is the plausible form of support.
- **Energy route.** Fewer displacements mean more fruit feeding, lower hunger, higher `cond`, higher `grow` and higher `strength()` (§2.6).
- **Evidence.** Design, motivated by the mechanism that crockford2020 and samuni2020 propose (agonistic support at food). That mechanism is proposed, not measured.

### 2.3 Lever 2: protection

- **Rule** (`candidates.ts`, `aggression()`).
  - The same presence test lowers every other within-community charge on `o` by `guardDeterW`: redirect, grudge, status, coercion and immigrant charges. Infanticide and escalation impulses are unchanged.
  - `V.DEFEND` fires for `guardianOf(o) === c`.
- **Evidence.** Design. hobaiter2014's definition of adoption includes protection in conflicts. sabbi2021 finds aggression toward immatures driven by their own aggression, which C8 does not add (§7).

### 2.4 Lever 3: association

- **Rule** (`candidates.ts`, juvenile follow).
  - The literal `c.age < 10` becomes `juvenileFollowMaxAgeY` (value unchanged).
  - The target becomes `guardianOf(c)`.
  - Dependents keep following `dependentOn()`.
- **Consequence.** Adoption becomes real for weaned orphans (F2). An orphan's exposure to adult males may rise or fall: **the sign is not built in.**
- **No sex-biased maternal term:**
  - murray2014's mixed-sex party effect covers only the first 6 months, and "sons meet more males" is the authors' inference;
  - sabbi2021 found no sex difference in time near adult males under 9.
- **Evidence.**
  - reddyMitani2019: orphaned siblings associated more after the loss, 6.05 (SE 1.79) times more often (a table value; the P value is not confirmed in the text; 4 pairs).
  - hobaiter2014: carers wait for orphans during travel.

### 2.5 Lever 4: coalition support

- **Rule** (`conflict.ts`, `notifyAllies()`). A caretaker counts as kin of its ward only while the ward is under `guardMaxAgeY`: `kinOfV ||= ix(v).caretaker === o.id && v.age < guardMaxAgeY`, and likewise for `kinOfA`. Mothers remain kin at any age (existing behaviour).
- **Why the caretaker limit.** Hobaiter's adoption is care of immatures. Without a limit, a caretaker would become lifelong coalition kin (WP3 finding 4). Mothers keep their lifelong kinship because it already exists and is not a C8 design choice.
- **Rank path.** Rank, mating and paternity follow through the existing Elo, mate-guarding and copulation rules, which read no orphan status (§4.3).

### 2.6 Condition and growth (shared C8 state)

- **Condition.** `x.cond ∈ [0, 1]`, updated each slow tick:
  - `cond += ((1 − hunger) − cond) × (1 − exp(−ecoDays / condTauD))`;
  - founders start at `1 − hunger`.
- **Health.** The health target gains `− max(0, condLow − cond) / condLow`. The existing −0.3 when hunger is above 0.9 is kept.
- **Growth record.** `x.grow ∈ [0, 1]`, an exponential average of `min(1, cond / condGood)` with time constant `growTauY`, updated only while `age < growEndY`.
  - Founders start at 1.
  - Newborns start at `min(1, gestCond / condGood)` (§2.8).
- **Strength.** `strength()` × `(1 − growStrengthW) + growStrengthW × grow`. Uses are ratios or orders **except where floors apply** (F8), so invariance is approximate for very weak animals.
- **Pre-run condition check** (truth only, levers off, before any lever run).
  - One 2-year run with `maternalLevers` = 0, `bereaveStress` = 0 and `birthCondFromMother` = 0.
  - It records juvenile `cond` **pooled over all juveniles**, never split by orphan status, maternal rank or sex.
  - If the pooled median lies outside 0.55–0.85 (a design band, logged as such), set `condGood` to the pooled 25th percentile and `condLow` to the pooled 5th percentile, once.
  - The run, the band, the rule and the result are logged before any lever run.
- **Not included:** stress → growth (§7).

### 2.7 Replacing `hazardOrphan`

`hazardOrphan` and the orphan-only health drain are removed, and `hazard(c, P)` loses its orphan argument.

- **Self-feeding ramp** (`execution.ts`, fruit and fallback intake).
  - An unweaned animal's intake is multiplied by `clamp((age − selfFeedStartY) / (weanAge − selfFeedStartY), 0, 1)`.
  - **`adopt()` no longer sets `weaned`** (WP3 finding 5). Orphans wean at their own `weanAge` (4.1–5.2 y) through the existing `slowLife()` check, so an orphaned 3.5-year-old stays on the ramp. Before this fix, the literal 3 in `adopt()` set T-DEM-24's survival cliff.
- **Worked example** (corrected, finding 18).
  - An infant that cannot feed starts at `cond` 0.6. With the existing −0.3 when hunger is above 0.9, its health target is `cond/0.3 − 0.3` once condition is below `condLow`.
  - It reaches health ≤ 0.02 at `cond` ≈ 0.096, after about 30 · ln(0.6 / 0.096) ≈ 55 days.
  - The hazard multiplier below health 0.6 shortens this further.
- **Evidence.**
  - hobaiter2014 is the only age-specific orphan survival data here: 42% of orphans under 4 survived a year, vs 95% of those 4 or older (N = 33).
  - nakamura2014's "offspring younger than 4.5–5 y cannot survive" is **the abstract's background premise, not a Mahale result** (finding 13).
  - The ramp is design.
- **Cause of death.** The existing orphan string is kept for unweaned motherless deaths, so T-DEM-4's classification does not shift.
- **Life-course mode.** Distorted, and not validated (§5.7, "Two clocks").

### 2.8 Prenatal condition

- **Rule** (`reproduction.ts`).
  - The mother keeps `x.gestCond`, a running mean of her `cond` over the pregnancy.
  - At birth, the newborn's `cond` is `gestCond` and its `grow` is `min(1, gestCond / condGood)` (finding 17), when `birthCondFromMother` = 1.
  - When the switch is 0, the newborn starts as a founder does.
- **Route.** Neighbour pressure (C6) → maternal energy → newborn condition → early health.
- **Evidence.** Design, motivated by lemoine2020a's hypothesis. It is expected to be weak.

### 2.9 Bereavement stress: rises, then decays

- **Rule** (`life.ts`).
  - In `killChimp()`, each living offspring in the mother's community and younger than `bereaveMaxAgeY` gets `x.bereft = max(x.bereft, bereaveStress)`.
  - In `slowLife()`, `bereft *= 0.5 ** (bioDays / bereaveHalfLifeD)`.
  - In `needs()`, stress relaxes toward `stressFloor + bereft`.
- **Evidence.**
  - The source gives no half-life. girardButtoz2021 shows an effect within 2 y and none later, so the half-life is a **design assumption bounded by that window** (≤ 25% left at 2 y).
  - The all-day floor is a **stylization**: midday levels did not differ, and the sim has no diurnal rhythm.
- **Acknowledged path (finding 20).** For sons aged 10–12, who are ranked males, stress raises the submit score in threat responses, submissions are decided contests, and `eloUpdate` follows. This is a transient orphan-state → Elo path outside the four levers. It is small and washed out by `maleStrengthDrift`, it is included in the all-channels-off ablation (§4.4), and it is allowlisted in §4.3 as `threatResponses` reading `stress`.

### 2.10 Sex asymmetry

No **new** rule reads the ward's sex. The asymmetry can come from:
- **transfer and philopatry:** `guardianOf` requires the same community, and 87% of daughters leave at about 11–13;
- **existing sex-specific systems:**
  - `dominates()`: adult males dominate every female, and adolescent males dominate them progressively;
  - `notifyAllies`: only males of 12 or more join for non-kin;
  - male-only status rivalry and Elo drift;
  - the female queue;
  - sex-specific strength curves.

If the asymmetry fails to appear, it is reported, never added as a sex term.

### 2.11 Adoption: fixes and evidence

- **Sonso, corrected** (finding 10).
  - Of 11 orphans, 7 counted as adopted: one by an unrelated parous female after 11 months alone, and 6 in three sets of maternal siblings.
  - In each set the older sibling (9–11 y) cared for the younger one (4–6 y, already weaned). So there were **3 sibling carers and 3 younger adoptees**; the older siblings were orphans themselves.
  - Pooled over four sites: 20 unrelated, 14 sibling and 2 other-kin adoptions of 36. In none of 16 cases with an older maternal sibling present did an unrelated individual adopt.
  - Unrelated adopters took 5.2 ± 6.6 months to start care, vs 0.3 ± 0.2 for siblings.
- **Fixes** (findings 4 and 5).
  1. **Older-than check:** a sibling adopter must be older than the orphan.
  2. **Caretaker-death branch gated:** in `killChimp()`, when `ix(k).caretaker === c.id`, run `adopt()` only if `!ix(k).weaned || k.age < adoptMaxAgeY`, the same rule as the mother-death branch. Otherwise set `ix(k).caretaker = -1` and draw no RNG.
  3. **Caretaker honoured only to independence:** `guardianOf` and the `notifyAllies` kin rule use a caretaker only while the ward is under `guardMaxAgeY`.
  4. **No weaning in `adopt()`:** the `if (o.age >= 3) x.weaned = true` line is removed.
     - An unweaned orphan with a caretaker is now a dependent of the caretaker (`dependentOn`, under 6). It follows and begs from the caretaker. Nursing still requires the mother, so no milk.
     - The existing plant-sharing offer (`o.motherId === c.id`) extends to the guardian (`guardianOf(o) === c`), because hobaiter2014's definition of adoption includes sharing food.
  5. **Literals moved to the registry** (values unchanged):
     - the infant vs older-orphan split, 3 → `adoptInfantAgeY`;
     - the minimum age of an unrelated adopter, 12 → `adoptOtherMinAgeY`;
     - the sibling minimum age, 8 → `adoptSiblingMinAgeY`;
     - the orphan maximum age, 8 → `adoptMaxAgeY`.
- **RNG.** Fixes 1 and 2 change whether `adopt()` draws, so golden hashes move (intended, logged).

### 2.12 Rules changed, file by file

| File | Change | Lever |
| --- | --- | --- |
| `candidates.ts` | New pure `guardianOf()` (the caretaker only under `guardMaxAgeY`). `V.FEED` − `guardFeedDeterW`; other within-community charges − `guardDeterW`; `V.DEFEND` by the guardian; the juvenile follow targets the guardian; plant sharing by the guardian; a guardian never supplants its ward. | 1–3, adoption |
| `conflict.ts` | `notifyAllies()`: a caretaker is kin while the ward is under `guardMaxAgeY`. | 4 |
| `life.ts` | `hazard(c, P)`; the orphan drain removed; `cond`, health from `cond`, `grow`, `bereft` decay; stress floor + `bereft`; `killChimp()` sets `bereft` and gates the caretaker-death branch; `adopt()`: older-than check, no weaning, registry literals. | energy, 5, adoption |
| `execution.ts` | Self-feeding ramp for unweaned animals. | energy |
| `hierarchy.ts` | `strength()` × the growth factor; nothing else. | growth |
| `reproduction.ts` | `gestCond`; the newborn's `cond` and `grow`. | 6 |
| `generation.ts` | Founders' `cond`, `grow`, `bereft`, `gestCond`. | state |
| `state.ts` | `SimChimp` gains `cond`, `grow`, `bereft`, `gestCond` (added inert in the freeze commit). **`STATE_SHAPE` changes, so older saves are incompatible, by design.** | state |
| `src/field/*` | T-DEM-15…24 computations, sealing, and `leanIndex`, all in the freeze commit before any mechanism. | — |

**Performance, determinism and saves.** No new RNG use. The pure functions stay pure. The new state is plain numbers. The bench must stay ≤ 0.3 s per eco-day (field) and ≤ 0.8 s at 120 living.

---

## 3. Parameters (`data/params.json`)

Every value is design or a source threshold, and none is chosen to hit a target. All have `calibrate: false` until C11.

### 3.1 New entries (20: 15 new parameters, 5 moved literals)

| id | value | range | units | clock | evidence | rangeBasis | sources | file | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `guardFeedDeterW` | 0.3 | 0.15–0.6 | score | none | design | assumed-x2 | — | candidates.ts | Lowers a feeding-supplant score on a ward under `guardMaxAgeY` whose guardian is seen, within `defendRangeM` of the ward and not dominated by the supplanter. Motivation: agonistic support at food (proposed in crockford2020 and samuni2020, not measured). Builds a maternal-rank gradient (T-DEM-20 encoded). |
| `guardDeterW` | 0.3 | 0.15–0.6 | score | none | design | assumed-x2 | — | candidates.ts | The same presence test for other within-community charges (not infanticide or escalation). |
| `guardMaxAgeY` | 12 | 10–15 | y | none | M | source | crockford2020, hobaiter2014, stanton2020 | candidates.ts, conflict.ts | Oldest protected ward; also the end of caretaker kinship. 12 is social independence (crockford2020) and the immature limit (hobaiter2014); 15 is stanton2020's upper class. |
| `juvenileFollowMaxAgeY` | 10 | 8–12 | y | none | design | assumed | — | candidates.ts | Moved literal. Weaned juveniles under this age follow their guardian. Upper bound from crockford2020's age 12. Orphaned siblings associate more after the loss: reddyMitani2019, 4 pairs (table value 6.05, SE 1.79). |
| `bereaveMaxAgeY` | 12 | 10–12 | y | none | M | source | girardButtoz2021, samuni2020 | life.ts | Offspring under this age in the mother's community get the bereavement stress. |
| `bereaveStress` | 0.2 | 0.1–0.4 | stress | none | stylized | assumed-x2 | girardButtoz2021 | life.ts | Added to the resting stress floor at the loss. Direction from the source; the all-day floor is a stylization; the magnitude is design. |
| `bereaveHalfLifeD` | 180 | 90–365 | bio-days | bio | design | assumed | — | life.ts | Bounded by girardButtoz2021's 2-year window: 6% remains at 2 y (25% at the upper bound). |
| `condTauD` | 30 | 15–60 | eco-days | eco | design | assumed-x2 | — | life.ts | Body condition: an exponential average of (1 − hunger). |
| `condLow` | 0.3 | 0.15–0.45 | condition | none | design | assumed | — | life.ts | The health target falls linearly to 0 as condition falls from this to 0. Subject to the §2.6 pre-run check. |
| `condGood` | 0.5 | 0.25–0.75 | condition | none | design | assumed | — | life.ts | Growth is limited only below this condition. Subject to the §2.6 pre-run check. |
| `growTauY` | 3 | 1.5–6 | bio-years | bio | design | assumed-x2 | — | life.ts | Time constant of the growth record. |
| `growEndY` | 15 | 12–16 | y | none | design | assumed | — | life.ts | The growth record freezes after this age. |
| `growStrengthW` | 0.5 | 0.25–1 | fraction | none | design | assumed-x2 | — | hierarchy.ts | `strength()` × ((1 − w) + w × grow); ratio-invariant except at the floors. |
| `selfFeedStartY` | 0.5 | 0.25–1.5 | y | none | design | assumed | — | execution.ts | An unweaned animal's intake ramps from 0 at this age to 1 at its weaning age. hobaiter2014: 42% of orphans under 4 survived a year. nakamura2014's under-4.5–5 statement is the abstract's premise, not data. |
| `birthCondFromMother` | 1 | 0–1 | flag | none | design | assumed | — | reproduction.ts | Newborn `cond` = the mother's mean condition over the pregnancy, and `grow` = min(1, gestCond / condGood). Motivation: lemoine2020a (proposed, not measured). hardRange [0, 1]. |
| `maternalLevers` | 1 | 0–1 | flag | none | design | assumed | — | candidates.ts, conflict.ts, life.ts | Ablation only (`calibrationExcluded`). At 0 it disables every post-weaning maternal pathway, C8 and pre-existing; care of dependents is kept. Never 0 in validation runs. hardRange [0, 1]. |
| `adoptSiblingMinAgeY` | 8 | 6–11 | y | none | M | source | hobaiter2014 | life.ts | Moved literal. Sibling carers were 8–11 y in East Africa (Gombe 8–10, Sonso 9–11) and 6–11 at Taï. The adopter must also be older than the orphan. |
| `adoptMaxAgeY` | 8 | 8–12 | y | none | design | assumed | — | life.ts | Moved literal. Orphans under this age, or unweaned, get an adoption roll, after the mother's or the caretaker's death. hobaiter2014 counts immatures under 12. |
| `adoptInfantAgeY` | 3 | 2–4 | y | none | design | assumed | — | life.ts | Moved literal. Below this age the infant sibling probability applies, and unrelated adoption is not rolled. No longer weans the orphan. |
| `adoptOtherMinAgeY` | 12 | 12–20 | y | none | M | source | hobaiter2014 | life.ts | Moved literal. The youngest unrelated adopter. hobaiter2014 Table 1: unrelated adopters were 13–35+ (Taï), 20–26 (Gombe) and 30 (Sonso). The value stays 12 (unchanged). |

### 3.2 Removed

| id | old | new | reason |
| --- | --- | --- | --- |
| `hazardOrphan` | 2.5 per bio-year (design) | entry and read removed | Replaced by energy and protection effects (§2.7). A model change, logged. |

### 3.3 Evidence or notes revised (values unchanged)

| id | value | evidence | change |
| --- | --- | --- | --- |
| `adoptOtherP` | 0.3 | design → **stylized** (sources: hobaiter2014) | "Unrelated adoption is common at Taï (13 of 20 pooled unrelated cases) and a minority in East Africa; it starts after 5.2 ± 6.6 months (siblings 0.3 ± 0.2). The sim adopts at once (stylization)." |
| `adoptSiblingP` | 0.6 | design (unchanged) | Notes cite hobaiter2014: "Where an older maternal sibling exists, siblings adopt (no unrelated adoption in 16 such cases); at Sonso, 3 older immature siblings (9–11 y) cared for 3 younger ones (4–6 y). Pooled, unrelated adults adopted more often (20 vs 14 of 36), mostly at Taï. The value is design." |
| `adoptSiblingInfantP` | 0.15 | design (unchanged) | Notes: "hobaiter2014 reports one-year survival by age (42% under 4), not adoption by age." |
| `adoptBondMin` | 0.35 | design (unchanged) | Notes: "No source gives a bond threshold for adoption." |
| `defendRangeM` | 20 / field 45 | stylized (unchanged) | Notes: "also the radius at which a guardian's presence deters charges on its ward (C8)." |
| `sharePlantBase`, `sharePlantBondW` | 0.4, 0.4 | design (unchanged) | Notes: "the offer now comes from the guardian (the mother, or a caretaker; hobaiter2014 adoption includes food sharing)." |

**Counts:** 20 new entries (15 new parameters, 5 moved literals), 1 removed, 1 evidence change, 6 note revisions.

The source keys hobaiter2014, reddyMitani2019, girardButtoz2021, samuni2020, stanton2020, sabbi2021 and murray2014 must be added to `data/targets.json` `sources` from `docs/research.md`, because `gen-params` validates against them. walker2018's access field should read FT (WP3 finding 14).

---

## 4. Tests

### 4.1 Unit tests

- **`tests/sim-life.test.ts`**
  - `hazard(c, P)`: the Ngogo life-table numbers are unchanged.
  - Condition convergence, and the health target from condition.
  - **Starvation:** an unweaned, motherless 1-year-old that cannot feed dies within 90 eco-days at natural aging (expected about 55; §2.7). A weaned 5-year-old orphan's condition does not collapse under the same scarcity.
  - **Bereavement:** set only on offspring under `bereaveMaxAgeY` in the mother's community; one half-life halves it; stress relaxes toward floor + `bereft`.
  - **Adoption regressions:**
    - a sibling adopter is older than the orphan;
    - when a 20-year-old's caretaker dies, `adopt()` is not called, **no RNG is drawn** (the RNG state is compared) and `caretaker` becomes −1;
    - an orphaned 3.5-year-old stays unweaned until its `weanAge`, and its intake follows the ramp;
    - an adopted 4-year-old follows its caretaker;
    - a caretaker is not kin in `notifyAllies` once the ward is 12.
- **`tests/sim-hierarchy.test.ts`**
  - The growth factor in `strength()`.
  - `grow` changes only below `growEndY`.
  - Contest odds are unchanged when everyone's `grow` is equal, **with strengths above the 0.1 and 0.05 floors** (finding 19).
- **`tests/sim-reproduction.test.ts`**
  - The newborn's `cond` = `gestCond` and `grow` = min(1, gestCond / condGood).
- **`tests/sim-guardian.test.ts`**
  - The presence test, all conditions: the exact `guardFeedDeterW` drop; no drop when the guardian is dead, out of range, unseen or dominated; adult males never deterred.
  - `guardianOf` gives the mother, else the caretaker under `guardMaxAgeY`, else nothing, and nothing across communities.
  - A guardian never supplants its ward.
  - `computeCandidates` and `observe()` stay pure.
- **`tests/field-metrics.test.ts`**
  - **Sealing:**
    - with sealed rows, the metric function is never invoked (a spy);
    - the JSON and MD rows contain only the id, the metric and "sealed", with no value, n, parts, interval, verdict or note;
    - `--unseal` with a mismatched registry or freeze hash exits non-zero.
  - **Summary counts:** encoded rows (T-DEM-18, -19, -20, -22, -24) land in `encoded` whatever their verdict; counted rows land in their verdict (finding 2).
- **`tests/field-observer.test.ts`**
  - Orphan classification (age at loss, the disappearance rule, transfers followed).
  - The urine-proxy rate.
  - The endocrine window.
  - Party-scan exposure.
  - NPI against a hand calculation.
  - T-DEM-15's cohort rules on a constructed genealogy.
- **`tests/persist-envelope.test.ts`**
  - The new fields are finite numbers.
  - The `STATE_SHAPE` change marks older saves incompatible.
- **Golden hashes:** re-recorded at the freeze commit (inert fields) and at the mechanism commit, each logged as intended.

### 4.2 Determinism and saves

Existing checks, re-run:
- the same seed and tick count give a deep-equal world however ticks are batched;
- save → reload → exact resume.

### 4.3 Structural test: no path keys paternity, rank or fertility on orphan status

A new `tests/sim-orphan-blind.test.ts`.

**(a) Invariance, behavioural.**
- **Worlds.** World A has:
  - a known son aged 15 or more, whose mother is alive;
  - a maximally swollen female in the same community, in his perception, and whose copulation record includes him;
  - a rival male.

  `structuredClone` A into B, including the RNG state. In B, mark the son's mother dead directly (`alive = false`, `deathTime`), and set his `caretaker = -1` and `bereft = 0`.

  **In both worlds the mother is placed out of range** (farther than `defendRangeM` and outside the son's and the female's perception), so the legitimate levers do not differ.
- **Assert identical results for:**
  - `strength`, `power` and `dominates`;
  - **`contest()` win odds** with a fixed ally list: compare `power(a, b, allies)` on both sides, and the Boolean outcome under the same RNG state;
  - `eloUpdate` deltas, `maleStrengthDrift` over one bio-year, `femaleQueue` and `recomputeHierarchies`;
  - **the mating offers** (`mate`, `guard`, `consort`) in `computeCandidates` for the son, and the female's offers toward him, as the same actions, targets and scores;
  - `reproSlow` on the female through one cycle, giving the same conception and the same sire.

**(b) Static scan of all of `src/sim`.** Forbidden patterns:
- `guardianOf(`, `.caretaker`, `bereft`, `gestCond`;
- a `motherId` lookup followed by `.alive`;
- `dependentOn(`.

**Allowlist:** named sites only, each with a reason.

| Site | Allowed read |
| --- | --- |
| `state.ts` | Declarations and defaults |
| `generation.ts` | Founder initialization (including the existing `x.caretaker = motherId`) |
| `reproduction.ts` `giveBirth` | The existing `bx.caretaker = mother.id` write; the newborn's `cond`, `grow` and `gestCond` |
| `reproduction.ts` `reproSlow` | `gestCond` update |
| `life.ts` | `killChimp`, `adopt`, `slowLife`, `needs` (the lever and bereavement sites) |
| `candidates.ts` | `guardianOf`, `dependentOn`, the juvenile-follow branch, `aggression()` (the presence test and `V.DEFEND`), the plant-share offer, `threatResponses` (reads `stress` only; see finding 20) |
| `conflict.ts` | `notifyAllies` (caretaker kin) |
| `execution.ts` | The dependent-follow, nurse and nest code that already calls `dependentOn` |
| `tick.ts` | The existing `dependentOn` call |
| `observe.ts` | The existing caretaker perceivability and dependency flag |

- Identity-only kin tests (`maternalKin`, `relationOf`, incest avoidance) are allowed anywhere, because they compare ids, not liveness.
- Every other site fails, in particular every function in `hierarchy.ts` and `ovulate`/`fecundity` in `reproduction.ts`.
- **Canary:** the test runs its checker on an in-memory copy of `reproduction.ts` with `guardianOf(` injected into `ovulate`, and asserts that the checker reports it. No file is written.

### 4.4 Ablation: attribution, not a violation test (runs after scoring)

- **Runs**, on fresh set B (§8), paired seeds:
  - **F** (full model);
  - **A1** (`maternalLevers` = 0: post-weaning levers off);
  - **A2** (A1 plus `bereaveStress` = 0 and `birthCondFromMother` = 0: all maternal channels off, including the bereavement → Elo path).
- **Effects E** (orphan − non-orphan, T-DEM-15 cohort):
  - the difference in age at first paternity (years);
  - the log rate ratio of offspring per opportunity;
  - the log HR of survival.

  Each is reported with a paired-bootstrap 90% interval and the MDE.
- **Attribution rule** (fixed now; tolerance 50%). For each effect where E_F is in the field direction, the levers account for it if:
  - (E_F − E_A2) is in the field direction with its 90% interval excluding 0; **and**
  - |E_A2| ≤ 0.5 |E_F|.
- **Interpretation.**
  - A residual |E_A2| > 0.5 |E_F| is reported as confounding by maternal condition (mothers who die are selected for low condition, and fertility halves below health 0.6) or as an unmodelled route. It is **not** evidence of a direct rule; §4.3 excludes those.
  - If E_F is not in the field direction, attribution is moot, and that is reported.
- **Scope.** Never counts as validation. Runs only after the held-out rows are scored, because its statistics are T-DEM-15's.

---

## 5. Validation risks

### 5.1 Tuning against T-DEM-15 (never)

- Sealed, which means never computed (§1.2), until one hash-bound unsealed run.
- No hand tallies (§1.2).
- The ablation runs after scoring.
- The pre-run condition check pools juveniles.
- If anyone computes it earlier, it is compromised and reported.
- **Missing route.** crockford2020's effect held with alpha tenure in the model, and the sim's routes to paternity all pass through strength, Elo, allies and mate-guarding. A T-DEM-15 miss on offspring per opportunity after a match on first-paternity age would point to that missing route, which is never to be fixed by a direct rule.

### 5.2 Circular tests

- **Counted:** T-DEM-15 (with its report note), T-DEM-16 (weak), T-DEM-17, T-DEM-21 (moderate) and T-DEM-23.
- **Encoded rows, never counted:** T-DEM-18, T-DEM-19, T-DEM-20, T-DEM-22 and T-DEM-24.
- The `encoded` flag is per row, and the summary test (§4.1) proves that encoded rows never reach the counted tally.

### 5.3 Small samples, with sample-size estimates

**Sources:**

| Source | Sample |
| --- | --- |
| crockford2020 | 23 males |
| stanton2020 | n UNVERIFIED |
| girardButtoz2021 | 7 recent orphans |
| samuni2020 | 18 orphans |
| lemoine2020a | 81 offspring |
| hobaiter2014 | N = 33 |
| reddyMitani2019 | 4 pairs |
| murray2014 | 9 mothers |

Hence pattern-only rules everywhere.

**Sim estimates** (low confidence, before any run). About 20 adult females with an adult hazard near 0.02–0.03 per year give about 0.5 maternal deaths per community-set-year. With about 2 living immature offspring each, and known ages only after the first ~10 years, that is about 20–25 known-age orphaning events per seed per 40 years. Over fresh set B (10 seeds):

| Target | Estimated sample (set B) | Power risk |
| --- | --- | --- |
| T-DEM-15 | ~200–250 orphaned sons and daughters in total, ~40–50 sons orphaned at 4–12 | orphans with a paternity may be near the minimum of 8 |
| T-DEM-16 | ~40 daughters in 5–9.99 | deaths near the minimum |
| T-DEM-17 | ~40 per sex in 10–14.99 | female cell likely near the 200 orphan-years and 10 deaths minimum |
| T-DEM-21 | ~1,400 births, ~200 infant deaths | adequate if encounter rates hold |
| T-DEM-23 | immatures of each sex at 4.5–6 y adequate | exposure hours depend on focal-party membership |
| T-DEM-24 | ~50 orphans under 4 and ~150 at 4 or more | — |

**Rule:**
- Before the proof, the implementer publishes exposure counts from the levers-off pre-run: orphaning events by sex and class, births and immature-years. **Exposure only:** no survival, paternity, lean-mass, stress or aggression statistic is computed.
- Analytic expected deaths come from the fitted baseline hazards.
- If a target is projected to be insufficient, this is reported before the run; it is not remedied by post-hoc seeds.

### 5.4 Observer limits

- Stress and lean mass are truth reads.
- Immatures are never focals; exposure comes from party scans.
- Ages at loss need known ages.
- The 30-day disappearance rule can misdate a loss.
- Paternity comes from the complete genetic record, which is better coverage than the field has.

### 5.5 Interaction with C6/C7a

- **T-DEM-21 and T-DEM-22's predictor is C6 behaviour.** C8 runs on the frozen C6/C7a model, and any C6/C7a change to encounters, ranging or contact memory, made after their values are seen, compromises them.
- **C7a phenology, through condition-dependent health, now affects mortality.** The baseline refit is done with all levers on, after the pre-run check, and fitted rows are replicated.
- **The energy lever may be weak.** Fallback food has no quality term. This must not be "fixed" by raising `guardFeedDeterW`.
- **The prenatal channel creates paths relevant to T-DEM-14 and T-LET-5.** Both are sealed and never computed; neither was used in the design. Noted for WP3.
- **T-SOC-11** is re-tested on fresh seeds as "model revised post-freeze" (§1.13).

---

## 6. Proposed edits to `docs/realism-design.md`

### 6.1 §5.7, row "Maternal care": replacement text

> | Maternal care | Pre-registered in `docs/staging/early-life-prereg.md` (B7, revised after WP3). After weaning, the mother, or an adoptive caretaker while the ward is under 12, acts only through existing levers. (1) **Feeding tolerance:** a within-community feeding supplant of a ward under 12 is less likely while the guardian is seen, within her defence range and not dominated by the supplanter (`guardFeedDeterW`). Intake, body condition (`cond`) and a growth record (`grow`, which scales `strength()`) follow. (2) **Protection:** the same presence test for other within-community charges (`guardDeterW`); caretakers defend. (3) **Association:** weaned juveniles under 10 follow the guardian. (4) **Coalition support:** existing kin joins, with caretakers counted as kin until the ward is 12. The loss adds a bereavement stress that halves every `bereaveHalfLifeD`: a design bounded by the 2-year window of girardButtoz2021, with no permanent offset. The newborn's condition starts at the mother's pregnancy condition. `hazardOrphan` is removed: unweaned animals can only partly feed themselves until their own weaning age (`adopt()` no longer weans at 3), and low condition lowers health for everyone. Adoption fixes: an older-sibling check, the caretaker-death branch gated by age, and caretakers honoured only to independence. No new rule reads the ward's sex. No code keys paternity, rank or fertility on orphan status (structural test covering Elo, strength, `contest()`, the mating offers and conception). T-DEM-14, T-DEM-15 and T-LET-5 are sealed (never computed) until the C8 proof; new held-out rows T-DEM-16–24 (T-DEM-18, -19, -20, -22 and -24 are encoded rows). |

The "Files" row of §5.7 should list `candidates.ts` (guardian), `conflict.ts` (caretaker kin), `hierarchy.ts` (growth in `strength`) and the `SimChimp` fields `cond`, `grow`, `bereft` and `gestCond`. The §2 demography table gains T-DEM-16…24, generated from `data/targets.json`.

### 6.2 §8, Stage C8: replacement text

> ### Stage C8: Demography and health (O9)
> **Goal**: cause-specific hazards with a re-fitted baseline; respiratory epidemics through party contacts; snare injuries; body condition; age- and condition-dependent fertility; rank effects through mechanisms; post-weaning maternal effects through the guardian levers of `docs/staging/early-life-prereg.md`, with `hazardOrphan` removed and the adoption fixes applied.
> **Order** (fixed before any C8 code):
> 0. Freeze commit: the observer code for T-DEM-14, T-DEM-15, T-LET-5 and T-DEM-16…24, sealing ("never computed"), the registry entries, inert `SimChimp` fields and pure proxies; a new freeze hash; the integrator's sealing ruling logged.
> 1. Mechanism commit; the pre-run condition check (pooled juveniles, levers off, logged); exposure counts published.
> 2. Baseline hazard refit to the fitted rows with every lever on; fitted-only development on seeds 48, 7, 21, 5, 11.
> 3. Fitted replication on fresh set A (1111, 1212, 1313, 1414, 1515); parameter freeze (registry hash logged).
> 4. One hash-bound `--unseal` run: held-out rows scored on fresh set B (1616, 1717, 1818, 1919, 2020, 2121, 2222, 2323, 2424, 2525), with the development seeds and set A reported as replication and spread; T-LET-5 from `field-scenario.ts expansion` on set B.
> 5. Full-table regression (every target, field profile, 1 year, 5 seeds) against the C7a proof; compressed bench and `scripts/sim-metrics.ts`.
> 6. Ablations A1 and A2 after scoring; independent review.
> **Success Criteria** (natural aging, field profile, 40 years; fertility measured only below 90% of the population cap; spread reported for every row):
> - Fitted: T-DEM-1 0.11–0.19; T-DEM-2 females 31–39 y, males 18–24 y; T-DEM-5 0.07–0.15; T-DEM-6 attack 0.4–0.9, mortality ≤ 0.17 per outbreak; T-DEM-9 0.10–0.30; T-DEM-10 peak 0.15–0.25 births per female-year at 20–30 y and no births after 55; T-DEM-11 13.5–16 y; T-DEM-12 4.8–6.6 y; each replicated on set A.
> - Held out (counted, set B): T-DEM-3, T-DEM-4, T-DEM-7, T-DEM-8, T-DEM-13, T-DEM-14, T-DEM-15 (report note: direction partly encoded), T-DEM-16, T-DEM-17, T-DEM-21, T-DEM-23 (pre-registered expectation: fail), T-LET-5; T-SOC-11 labelled "model revised post-freeze".
> - Encoded rows (reported, never counted): T-DEM-18, T-DEM-19, T-DEM-20, T-DEM-22, T-DEM-24.
> - Ablation (descriptive): lever attribution per the tolerance rule.
> - Bench ≤ 0.3 s per eco-day outside outbreaks (field), ≤ 0.8 s at 120 living; the compressed bench within its target. Determinism and JSON-lossless saves hold; `STATE_SHAPE` changes (older saves incompatible, by design); golden hashes re-recorded at the freeze and mechanism commits.
> **Tests**: `tests/sim-life.test.ts` and `tests/sim-reproduction.test.ts` extended (analytic life table; outbreak spread only through co-party contact; snare hazard only on the ground in risky cells; fertility curve shape; no direct rank term in conception; condition; starvation; bereavement; adoption regressions); `tests/sim-hierarchy.test.ts`; `tests/sim-guardian.test.ts`; `tests/sim-orphan-blind.test.ts` (invariance of strength, contests, Elo, mating offers, conception and sire choice; whole-`src/sim` scan with allowlist; canary); `tests/field-metrics.test.ts` (sealing and summary counts); observer tests.
> **Proof**: `scripts/field-metrics.ts --profile field --years 40 --demography --unseal` on set B through the pool; `scripts/field-scenario.ts expansion`; the regression table, life-table plot and orphan-outcome tables under `artifacts/validation/c8/`.
> **Effort / risk**: L (8–12 days plus ~3 nights of runs). Risk: medium–high (rare events and small cells; the population cap; the energy lever may be weak; T-DEM-21 depends on the frozen C6/C7a model).
> **Status**: Not Started

---

## 7. Exclusions and open gaps (recorded, not implemented)

| Gap | Why excluded | What would reopen it |
| --- | --- | --- |
| Violence begets violence | No wild-chimpanzee evidence. sabbi2021 ends at 9 and ties aggression received to the juvenile's own aggression. | A longitudinal wild study with adult outcomes |
| Permanent stress offset | girardButtoz2021: about 2 years in immatures, absent in adult males | — |
| Serotonin × rearing | Captive rhesus only (bennett2002); human findings not replicated (culverhouse2018, border2019); no chimpanzee data | Chimpanzee data |
| Cultural transmission of tolerance | One baboon troop (sapolskyShare2004); testard2024 shows adjustment, not transmission | — |
| Direct orphan → paternity, rank or fertility rule | Would encode T-DEM-15; guarded by §4.3 | Never |
| Sex-biased maternal gregariousness | murray2014: first 6 months only; the male-exposure claim is inference; sabbi2021: no sex difference under 9 | An infant-age party-choice stage with its own held-out check |
| Rank-independent reproductive cost | crockford2020's effect held with alpha tenure in the model; the sim has no such route | A male–female relationship mechanism designed without T-DEM-15 |
| Juvenile aggression | sabbi2021's main predictor; outside this scope | A development-of-aggression stage (T-DEM-23 tests it) |
| Stress → growth | samuni2020's hypothesis only; would build in T-DEM-19 | Wild evidence |
| Prenatal frailty or disease susceptibility | No magnitude except T-DEM-21's own | An independent estimate |
| Food quality in condition | Condition tracks hunger only | A diet-quality design, logged as a model change |
| Delay before unrelated adoption | 5.2 ± 6.6 months vs 0.3; the sim adopts at once (stylized) | A monthly adoption hazard |
| Condition-dependent maturation (walker2018: model-predicted medians 10.7 vs 13.3 y and 13.6 vs 16.8 y; pusey1997) | First swelling is drawn at birth | A growth-dependent first swelling; a walker2018 row designed with it would be encoded |
| Baboon and macaque analogies | Never a target or parameter source | — |

---

## 8. Proof plan for C8

1. **WP4.**
   - Register T-DEM-16…24 and the §1 protocolLog entries, including the integrator's ruling (§1.13), the T-DEM-15 computation and the T-SOC-11 label.
   - Add the source keys.
   - **Freeze commit:** the observer code for T-DEM-14, T-DEM-15, T-LET-5 and T-DEM-16…24, sealing ("never computed") with hash-bound `--unseal`, the registry entries, inert `SimChimp` fields and pure proxies. New freeze hash. **No mechanism code exists.** Golden hashes re-recorded (inert fields), logged.
2. **Mechanism commit** (§2, §3).
   - `pnpm test`, `pnpm build`, `gen-params --check`.
   - Pre-run condition check: pooled juveniles, levers off, logged.
   - Exposure counts and sample-size estimates published (§5.3).
3. **Baseline hazard refit.** Every lever on, fitted rows only, on development seeds 48, 7, 21, 5, 11. Held-out rows print "sealed" and are never computed.
4. **Fitted replication** on fresh set A (1111, 1212, 1313, 1414, 1515), spread reported. **Parameter freeze** (registry hash logged).
5. **Proof run.**
   - One hash-bound `--unseal` run at natural aging, field profile, 40 years.
   - **Held-out rows scored on fresh set B** (1616, 1717, 1818, 1919, 2020, 2121, 2222, 2323, 2424, 2525). None of sets A or B was used in any logged run as of 29 September 2026; the integrator confirms.
   - The development seeds and set A are reported alongside as replication and spread.
   - T-LET-5 from `scripts/field-scenario.ts expansion --years 10` on set B, with the paired baseline.
   - Counted and encoded rows listed apart.
6. **Regression and engineering.**
   - **Full-table regression:** every target, field profile, 1 year, 5 seeds, against the C7a proof (`c7a-field1y`, `c7a-fresh`), with every changed verdict listed.
   - **Compressed bench** and `scripts/sim-metrics.ts` (compressed golden hashes move).
   - Field bench ≤ 0.3 s per eco-day, ≤ 0.8 s at 120 living.
   - Determinism across batching; JSON-lossless saves; save → reload → exact resume.
   - `STATE_SHAPE` changed (older saves incompatible, by design).
7. **Ablations** A1 and A2 on set B, after step 5 is scored (§4.4).
8. **Independent review** before anything is marked Complete. Misses are reported, never tuned away.

---

## Appendix A. Verification record

WP1's `docs/research.md` and the WP3 review are the references for every number. I fetched these myself on 29 September 2026:

| Source | Read | Used for | Notes |
| --- | --- | --- | --- |
| crockford2020 | FT (PMC7500924) | T-DEM-15 computation; §5.1 | Effect held with alpha tenure in the model. Offset details per WP3 finding 8 |
| stanton2020 | Abstract (Duke Scholars) | T-DEM-16, T-DEM-17 | No full-text access |
| nakamura2014 | Abstract (PubMed) | §2.7 | "Under 4.5–5 cannot survive" is the abstract's premise (WP3 finding 13) |
| girardButtoz2021 | FT (PMC8208813) | T-DEM-18; half-life bounds | Class counts agree with WP1 once overlap is counted; midday levels did not differ |
| samuni2020 | FT (PMC6945487) | T-DEM-19, T-DEM-20 | No sex × orphan term reported |
| lemoine2020a | FT with STAR Methods (PMC6971690) | T-DEM-21, T-DEM-22 | I transform UNVERIFIED. My earlier doubt about the 3-year analysis is resolved in WP1's favour by WP3 |
| hobaiter2014 | FT (PMC4118915) | T-DEM-24; adoption | Sonso: 3 sibling carers, 3 younger adoptees (corrected) |
| reddyMitani2019 | Abstract (PubMed) | Association evidence | Statistics are table values; P values not confirmed (WP3 finding 23) |
| murray2014 | Abstract (Europe PMC) | §2.4 (not used) | WP1 and WP3 numbers used |
| sabbi2021 | FT (PMC8000022) | T-DEM-23 | |
| walker2018 | Abstract (PubMed) | Deferral | Medians per WP3 finding 14 |
