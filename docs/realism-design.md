# Realism design

The design for objectives O1–O12 in [realism-roadmap.md](realism-roadmap.md): quantitative field targets, the virtual field observer, the parameter registry, mechanism designs, the calibration pipeline and the stage plan for `IMPLEMENTATION_PLAN.md` C3–C11. Research pass: 28 September 2026. Machine-readable targets: [`data/targets.json`](../data/targets.json).

**Status:** design only. Nothing here is implemented. Numbers about the current simulation come from `docs/simulation.md` §18.

**Contents:** 0 [Summary](#0-summary) · 1 [How to read](#1-how-to-read-this-document) · 2 [Targets](#2-target-table) · 3 [Observer (O1)](#3-virtual-field-observer-o1) · 4 [Registry (O2)](#4-parameter-registry-o2) · 5 [Mechanisms (O3–O10)](#5-mechanism-designs-o3o10) · 6 [O11 validation](#6-o11-validation-targets) · 7 [Calibration (O12)](#7-calibration-and-validation-pipeline-o12) · 8 [Stage plan](#8-stage-plan-c3c11) · 9 [Datasets](#9-datasets) · 10 [Open questions and risks](#10-open-questions-and-risks) · [Sources](#sources)

---

## 0. Summary

### Findings that change the roadmap

| # | Finding | Evidence | Consequence |
| --- | --- | --- | --- |
| 1 | The "adult males feed ~45–55%" target is not supported. Verified values: Waibira males 36%, females 37% (continuous focal, 491 h); Kanyawara females ~43% (309 min/day). | T-ACT-1 | The sim's 37% male feeding is **inside** the band. The real misses are **travel** (sim 5% vs 12–25%) and **grooming** (sim 26% vs 8–18%). O7's stated rationale should change. |
| 2 | Party size tracks **patch size** strongly (R² 0.23–0.80) and habitat-wide fruit only weakly (R² 0.05 at Ngogo; no monthly correlation). | T-PTY-2 | O8's proof "party size tracks fruit" should read "weakly with fruit, strongly with patch size". |
| 3 | Hunting: field success is 53–82% (sim 34%); small communities take 1.3–1.9 prey per success (sim exactly 1). The code comment "62 hunts in 471 days with ~24 males" counts 62 hunting *episodes and attempts* (13 were finds of chimpanzees already eating meat or carrying carcasses), and the paper reports 26 adult males. | T-HUN-1, -2, -7 | Replace the hunting-day gate with an encounter-based hunt decision (§5.6). |
| 4 | "Too few killings" is not established. The median community rate is ≈ 0.08 per year, so zero killings in 9 community-years happens about half the time. | T-LET-1 | Keep killing rate as a fitted target with a wide band; do not inflate. |
| 5 | Encounters: Kanyawara 8.0 and Taï 7.1 per community-year, 85% and 73% heard only. The sim's 35 and 63% are off because **sight (21×) and party links (9×) are inflated relative to range size**, far more than hearing (1.8×). | T-IGE-1, -2 | O3 is confirmed as the top priority; the fix is ratios, not metres (§5.1). |
| 6 | Patrols: Gombe and Taï communities patrol ~0.3 per week; Ngogo (~25 males) 0.72 per week. The sim imposes the Ngogo rate on 3–7-male communities. Per-male participation is similar across sites (10–14 per year). | T-PAT-1, -2 | Patrol hazard driven by males and boundary staleness (§5.3). |
| 7 | A 2026 *Science* paper documents the Ngogo fission with 30 years of network data, and its data are public (CC0): yearly networks, patrol counts, population snapshots. Fission is known from only two cases, both in large communities. | T-FIS-1..3 | Best held-out dataset in the program. ChimpBench's small communities and 120-chimp cap make emergent fission nearly impossible without a large-community scenario and faster ticks at 150+ chimps. |
| 8 | Chimpanzees **slow down** as they approach a remembered tree, choose the nearest productive tree only 30% of the time, and revisit trees every 2.5–5.4 days. Travel linearity (0.96) is trivially ~1 in a sim that moves in straight lines. | T-FOOD-5..9 | Validate O7 with goal-directedness metrics, not linearity. |
| 9 | Pant-hoot caller identity is only moderately distinctive (19.5% vs 6.9% chance). Kanyawara drumming shows no individual signature. | T-COM-5, -6 | O10 signatures must be noisy; "stable across calls" means stable means, not perfect identifiability. |
| 10 | The existing reconciliation band "14–22%" could not be verified; the verified wild value is 14.4% (Mahale). | T-SOC-9 | Replace the band. |

### Changes to the delivery order

1. **Move the run pool and target harness into C3** (with the observer). Every later stage needs ≥ 5-seed validation, and several need multi-year runs; without the pool that is slow and manual.
2. **Split O3 into C5a (simulation, headless, behind a profile flag) and C5b (renderer: field window plus overview).** C5b is a renderer-owner stage that is not in the plan today. C6–C8 can proceed on C5a headless.
3. **Ingest phenology data at C5a.** Patch density and fruit timing set ranging and encounter rates; calibrating territories (C6) on synthetic fruit would have to be redone at C7.
4. **Run O6 (fission) after the first calibration pass (C11), as a scenario stage.** It needs large communities, performance work at 150+ chimps, and a calibrated baseline to be meaningful. Its targets are all held out.

### Target count

97 targets: **37 fitted, 60 held out** (5 flagged *encoded*, meaning the mechanism was designed from that pattern, so a match is weak evidence). 19 parameter constraints feed registry priors. 121 sources, all with bibliographic data checked against Crossref.

---

## 1. How to read this document

| Term | Meaning |
| --- | --- |
| **Fitted** | May be used for calibration (in priors, objectives or tuning decisions). Chosen because it constrains one or a few parameters fairly directly. Mostly ranging, activity budgets, encounter and hunt rates, life-table anchors, call rates. |
| **Held out** | Never used for any tuning decision. Chosen because it emerges from several interacting mechanisms or sits at a different level of organization: network structure, range-size scaling, expansion and prey scenarios, hunting seasonality and bursts, rank and maternal effects, fission. A held-out match is the strongest evidence the program can produce. |
| **Encoded** | The current or planned mechanism was designed from this very pattern (for example the ≥ 3-male playback rule). Reported, but not counted as independent validation. |
| **Accept band** | The range the simulation must hit, scaled to ChimpBench communities (12–22 members, 3–7 adult males) where stated. Field values are quoted as reported next to it. |
| **Evidence** | H: multi-site or large-sample, full text read. M: one site, abstract only, or derived by arithmetic. L: secondary citation, captive animals, or qualitative only. |
| **Access** | FT full text read; Abs abstract only; Data dataset inspected; Meta metadata only. Every source's authors, year, title, journal and DOI were checked against Crossref. |
| **Derived** | Arithmetic on reported numbers, done in this pass (for example 120 encounters ÷ 15 years). Marked wherever used. |
| **Population caveat** | Taï and Loango values are *P. t. verus* or other populations, not *P. t. schweinfurthii*; Budongo, Gombe and Mahale are eastern chimpanzees outside Kibale. Each row names its population. |

**Split principle.** Fit what sets scale and rate at one level; hold out what emerges across levels. Concretely: ranging, activity and demography anchors are fitted; network structure, the expansion scenario, hunting seasonality, prey decline, and fission are held out. This follows pattern-oriented modeling [grimm2005]: several weak patterns at different levels filter parameter sets better than one strong pattern.

---

## 2. Target table

Full records (definition, observer protocol, sample sizes, methods, notes) are in `data/targets.json`. The observer protocol for each family is in §3.6.

#### Activity budgets

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-ACT-1 | Adult feeding share of daytime | Budongo Waibira, 2016-10 to 2017-06: males 0.36, females 0.37 [villioth2025]<br>Kanyawara females, 2014-2015: 309 ± 85 min/day feeding (≈0.43 of a 12 h day, derived) [uwimbabazi2019] | 0.33–0.5 fraction of daytime | fitted | M |
| T-ACT-2 | Adult travel share of daytime | Budongo Waibira, 2016-2017: males 0.21, females 0.20 [villioth2025]<br>Ngogo, 2004-2006: 0.14 on non-patrol control days (0.58 during patrols) [amsler2010] | 0.12–0.25 fraction | fitted | M |
| T-ACT-3 | Adult grooming share of daytime | Budongo Waibira, 2016-2017: males 0.15, females 0.12 [villioth2025] | 0.08–0.18 fraction | fitted | M |
| T-ACT-4 | Adult resting (including grooming) share of daytime | Ngogo; Kanyawara, 2005-2006; 2006: 0.340; 0.448 (monthly means, n = 12 months each) [potts2011]<br>Budongo Waibira, 2016-2017: rest + groom ≈ 0.43 (derived) [villioth2025] | 0.3–0.47 fraction | fitted | M |
| T-ACT-5 | Sex and reproductive-state differences in activity | Budongo Waibira, 2016-2017: no category differs by more than 0.03 between sexes [villioth2025]<br>Budongo Sonso, 2002-2003: lactating females travel less than males (p = 0.028); active day 11 h 34 min (M) vs 10 h 57 min (lactating F) [batesByrne2009] | male–female feeding difference ≤ 0.05; lactating females travel less than males | held-out | M |

#### Parties and gregariousness

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-PTY-1 | Mean party size | Kanyawara, 1992-2006: 9.2 ± 7.0 individuals per follow; 3.0 ± 3.0 adult males, 2.3 ± 1.8 adult females [wilson2012]<br>Kanyawara; Ngogo, 2005-2006: feeding party 8.39 (1–32); 7.29 (1–40) [potts2011] | 3–9 individuals (22-member community) | fitted | M |
| T-PTY-2 | Party size vs fruit and patch size | Ngogo, 1999-2003: male party size vs fruit index R² = 0.05 (F1,143 = 6.75, P = 0.01) [mitaniWatts2005]<br>Ngogo, —: monthly mean party size not correlated with fruit [wakefield2008]<br>Kanyawara; Ngogo, 2005-2006: feeding party vs patch DBH R² = 0.227; 0.801 [potts2011] | weak habitat-fruit effect (R² ≤ 0.1); patch-size effect R² 0.2–0.8 | held-out | M |
| T-PTY-3 | More males per party in the periphery | Kanyawara, 1997-1998: median males 5.9 (periphery-visiting, N = 62) vs 2.2 (core-only, N = 149) [wilson2007] | periphery parties have ≥ 1.5× the males of core-only parties | held-out | M |
| T-PTY-4 | Female gregariousness | Ngogo, —: females with ≥ 1 other female 64% of time; less gregarious than males [wakefield2008]<br>Taï (P. t. verus), 1988: females alone 45% of time [doran1997]<br>Taï (P. t. verus), —: females with other adults ~82% of time [lehmannBoesch2008] | 0.15–0.45 fraction of female time alone | held-out | L |

#### Ranging

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-RNG-1 | Annual home range of a 22-member community | Kanyawara, 1992-2006: median annual 16.4 km² (10.8–29.5) [wilson2012]<br>Budongo Sonso, 1994-1995: 6.78 km² (MCP) [newtonFisher2003]<br>Budongo Waibira, 2016-2017: 8.79 km² (MCP); 50% core 2.46 km² [villioth2025]<br>Taï, 4 groups (P. t. verus), 1997-2016: annual 95% kernel 6.42–36.59 km² [lemoine2020b] | 5–16 km² | fitted | M |
| T-RNG-2 | Range size scales with community size | Taï (P. t. verus), 1997-2016: +0.78 ± 0.17 km² per weaned individual (between groups); +1.10 ± 0.48 km² per added male within a group (p = 0.052) [lemoine2020b]<br>Gombe, 18 y: number of males did not correlate with range size [williams2004] | 0.3–1.2 km² per weaned individual | held-out | M |
| T-RNG-3 | Core concentration | Kanyawara, 1996-1998: core 36% of area holds 85% of observation time; periphery 39.9% of area, 11% of time [wilson2007]<br>Taï South (P. t. verus), 2009-2011: 50% kernel 6.40 km² = 23% of 95% kernel 27.61 km² (derived) [jang2019] | 0.75–0.9 share of use in densest 36% of area | fitted | M |
| T-RNG-4 | Adult male day range | Budongo Sonso, 2002-2003: males 2.7 ± 1.5 km/day [batesByrne2009]<br>Taï South (P. t. verus), 2009-2011: females median 4.03 km (1.11–14.16) [jang2019] | 1.5–3.5 km/day | fitted | M |
| T-RNG-5 | Lactating female day range relative to males | Budongo Sonso, 2002-2003: lactating 1.2 ± 0.8, receptive 2.2 ± 0.8, males 2.7 ± 1.5 km [batesByrne2009] | 0.3–0.6 ratio | held-out | M |
| T-RNG-6 | Range variability over years | Kanyawara, 1998-2006: annual range 29.5 km² (1998) → 13.8 km² (2006); median 16.4 (10.8–29.5) [wilson2012] | 1.2–3 max/min ratio | held-out | M |

#### Intergroup encounters

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-IGE-1 | Intergroup encounters per community-year | Kanyawara, 1992-2006: 120 encounters in 15 y = 8.0 per year (derived); on 1.9% of follows [wilson2012]<br>Taï, 4 groups (P. t. verus), 1997-2016: 384 encounters in 54 group-years = 7.1 per year (derived) [lemoine2020a]<br>Ngogo, 1997-2003: 95 patrols + 68 other encounters in 41 researcher-months ≈ 29 per 12 observed months (derived; biased to peak seasons) [watts2006] | 5–12 per community-year | fitted | H |
| T-IGE-2 | Share of encounters that are auditory only | Kanyawara, 1992-2006: 0.85 (102 acoustic, 15 visual, 3 physical) [wilson2012]<br>Taï (P. t. verus), 1997-2016: 0.73 (281 vocal of 384, derived) [lemoine2020a] | 0.7–0.9 fraction | held-out | H |
| T-IGE-3 | Approach depends on own males | Kanyawara, 1992-2006: log-odds of approach +0.49 (SE 0.12) per adult male; vocal response +0.34 (SE 0.075); oestrous females lower approach [wilson2012] | 0.25–0.75 log-odds per male | held-out | M |
| T-IGE-4 | Playback response by party composition | Kanyawara, 1996-1998: ≥ 3 males: approach 12/13, call 12/13; 1–2 males: approach 5/9, call 1/9; female-only: never called [wilson2001] | as reported | fitted (enc.) | H |
| T-IGE-5 | Encounters happen in the periphery | Kanyawara, 1992-2006: median 1,867 m (288–4,406) from centre; equal-area radius of 16.4 km² = 2.28 km → 0.82 R (derived) [wilson2012] | 0.6–1.1 range radii | held-out | M |

#### Patrols

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-PAT-1 | Patrol rate in small communities | Gombe Kasekela; Taï North, 1977-1982; —: 0.30 and 0.3 per week [wattsMitani2001]<br>Gombe, 1978-2007: 180 patrols in 30 y; annual median 4.5 (0–19) [massaro2022]<br>Ngogo (~24+ males), 1998-1999; 1996-2015: 0.72 per week (1 per 9.7 d); ~1 per 9.2 d [wattsMitani2001] | 0.1–0.5 per week | fitted | M |
| T-PAT-2 | Per-male patrol participation | Ngogo; Taï; Gombe, 1996-2015: 14.2; ~10; 14.4 patrols per male per year [langergraber2017] | 7–18 patrols per male-year | held-out | M |
| T-PAT-3 | Patrol composition | Gombe, 1978-2007: 74.5 ± 11.1% of males per patrol; median 8 males (1–13) [massaro2022]<br>Taï; Ngogo, —; 1998-1999: Taï 72% of males, females on 57% of patrols; Ngogo 9.4 adult males (3–19), females essentially absent [wattsMitani2001]<br>Ngogo, 1996-2015: 37.5 ± 15.5% of the community's males [langergraber2017] | 0.55–0.85 share of males (≤ 10-male communities) | held-out | M |
| T-PAT-4 | Patrol predictors | Ngogo, 1999-2003: +17% odds per extra male; fruit index 812 vs 642 on patrol vs other days (+0.10% odds per unit); oestrous females and intruder pressure no effect [mitaniWatts2005] | positive male and fruit effects; no oestrous effect | held-out (enc.) | M |
| T-PAT-5 | Patrol duration and distance | Ngogo, 2004-2006: 134 min (15–348, SD 88); 2,456 m (SD 1,492); travel 58% of patrol time [amsler2010] | 60–240 min (distance 1–4 km) | held-out | M |
| T-PAT-6 | Incursion share | Ngogo, 1999-2003: 0.58 (42/72) [mitaniWatts2005] | 0.4–0.7 fraction | fitted | M |
| T-PAT-7 | Patrol contact and violence | Ngogo, 1997-2003: contact 30/95 (0.32); physical aggression 12/95 (0.13); attacks in 40% of patrols with contact [watts2006] | 0.15–0.45 contact fraction | held-out | M |
| T-PAT-8 | Patrols and fruit | Ngogo, 1998-2015: Spearman ρ 0.059 between monthly patrol rate and ripe fruit score, 211 months (computed from [langergraber2017] × [potts2020] open data) | −0.057 to 0.170 ρ (month bootstrap 90%); **not scorable**: the record has no observation effort | held-out, not scorable | M |
| T-BRD-1 | Advance after border stops | Taï, 2013-2016: advance 0.448 of 625 stops; +0.072 log-odds per adult present (computed from [lemoine2023] S3 Data) | 0.037–0.107 log-odds per adult (cluster bootstrap 90%); share reported, partly encoded | held-out | M |
| T-PAT-9 | Patrol sector concentration (check) | Ngogo: repeat patrols on contested edges, months of neglect elsewhere [wattsMitani2001] | ≥ 0.5 of community-years show both | held-out, encoded-descriptive (never counted) | M |

#### Lethal aggression and territory change

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-LET-1 | Killings per community-year | 18 communities, 12 eastern, various; 426 community-years: pooled observed + inferred 0.23; incl. suspected 0.36; median across communities ≈ 0.08 (derived from Fig. 1); Kanyawara ≈ 0.08; Ngogo ≈ 1.67 [wilson2014] | 0.02–0.36 per community-year | fitted | H |
| T-LET-2 | Victim composition | 18 communities, various: 73% of victims male; 66% of killings intercommunity; males and infants at highest risk [wilson2014] | 0.6–0.85 male share | held-out | H |
| T-LET-3 | Numerical odds in lethal attacks | 18 communities, various: median 9 attacking males (2–28) vs median 0 defending males; attackers outnumber defenders by a median factor of 8 (1–32) [wilson2014] | 4–16 attacker/defender ratio (median) | held-out (enc.) | H |
| T-LET-4 | Territorial expansion after killings (scenario) | Ngogo, 1999-2009: +6.4 km² (+22.3%) after 21 killings (18 observed, 3 inferred) in 10 y; 13 of 21 in the NE, where the expansion happened; NE used on 32.6% of days after June 2009 [mitani2010] | 0.1–0.35 proportional range gain | held-out | H |
| T-LET-5 | Payoff of expansion (scenario) | Ngogo, 3 y before vs after the 2009 expansion: births 15 → 37 (RR 2.75, 95% CI 1.4–5.2); infant death before age 3: 41% → 8% [wood2025] | higher fertility and infant survival after expansion | held-out | M |
| T-LET-6 | Killings happen on patrols | Ngogo, 1999-2008: 17 of 18 observed killings by males on patrol [mitani2010] | 0.6–1 fraction | held-out | M |

#### Community fission

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-FIS-1 | Fission is rare and needs a large community | Gombe; Ngogo, 1973; 2015-2018: the only two permanent fissions observed; Ngogo had ~200 members and > 30 adult males by 2015 [sandelWatts2021]<br>Ngogo, 1998-2022: network polarized in 2015; two distinct groups by 2018 [sandel2026] | no fission below ~10 adult males; ≤ 1 per 100 community-years in 20–40-male communities | held-out | M |
| T-FIS-2 | Fission antecedents | Gombe, 1967-1973: subgrouping in grooming and association networks rose sharply in 1971–72; split 1973; coincided with a struggle among 3 top males and high male:female ratio [feldblum2018]<br>Ngogo, 2003: two stable male subgroups with overlapping ranges and no split [mitaniAmsler2003] | 1–3 years of rising modularity | held-out | M |
| T-FIS-3 | Lethal violence after fission | Gombe, 1974-1977: ≥ 4 (probably 5) adult males and 1 adult female of Kahama killed by Kasekela over ~4 y [sandelWatts2021]<br>Ngogo, 2018-2025: 24 attacks; ≥ 7 mature males and 17 infants of the Central group killed by the West group [sandel2026] | ≥ 5 post-split rate ÷ baseline rate | held-out | M |
| T-FIS-4 | Former associates become victims | Ngogo, 1998-2019: victim Basie had 12.5–24.8% yearly party association with western males; last coalitions with attackers in 2011–12 [sandelWatts2021] | bonds do not protect after fission | held-out | M |

#### Food, phenology and spatial memory

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-FOOD-1 | Phenology index | Ngogo, 1998-2017: mean 8.7% (SD 4.1), range 0.7–20.3% [potts2020]<br>Kanyawara, 1998-2013: mean 8.41% (SD 4.40), monthly CV 0.52, between-year CV 0.25 (computed from data) [chapman2018]<br>Ngogo, 1998-2009: bimodal ripe fruit score; CV of monthly means 0.41 [watts2012b] | 0.06–0.11 mean share of stems | fitted | H |
| T-FOOD-2 | Fruit share of feeding time | Ngogo, 1995-2010: all fruit 72.1% (SD 12.5; monthly 36.2–94.1); figs 26.2%; leaves 19.4%; pith 2.5% [watts2012a]<br>Kanyawara, 1994-2018: fruit 64.0% (annual 50.0–74.1); leaves 11.2% [emeryThompson2020] | 0.6–0.78 fraction | fitted | H |
| T-FOOD-3 | Fallback switching | Ngogo, 1998-2009: fallback: leaves (mainly Pterygota saplings, 8.5% of feeding); pith not a fallback; figs a staple [watts2012b]<br>Kanyawara, 1990s: pith is the fallback [wrangham1998]<br>Kanyawara; Ngogo, 2005-2006: pith 17.4% vs 1.0% of feeding [potts2011] | ≥ 0.3 Pearson r (fruit share vs phenology index) | held-out | M |
| T-FOOD-4 | Feeding trees visited per day | Taï (P. t. verus), 2009-2011: 7.14 trees/day (1–21); inspections 4.97/day [janmaat2013b]<br>Taï, 2006-2007: two females: 14.0 and 18.1 trees/day over 28 days [normand2009] | 4–15 trees/day | held-out | M |
| T-FOOD-5 | Nearest-tree choice share | Taï (P. t. verus), 2006-2007: nearest productive tree chosen only 30% of the time [normand2009] | 0.15–0.45 fraction | held-out | M |
| T-FOOD-6 | Revisit interval | Taï (P. t. verus), 2006-2007: 5.37 days [normand2009]<br>Taï, 2009-2011: 2.5 days (max 26) [ban2014] | 2–7 days | held-out | M |
| T-FOOD-7 | Out-of-sight approach distance | Taï (P. t. verus), 2009-2011: mean 537.5 m (SD 499; 6.5–2,842 m), about 80 min [ban2014] | 300–800 m (median) | held-out | M |
| T-FOOD-8 | Goal-directed inspections | Taï (P. t. verus), 2009-2011: 13% of inspections goal-directed (more for large crowns); empty-tree inspections rise after the first fruit of that species and track its synchrony [janmaat2013a] | 0.05–0.25 fraction | held-out | M |
| T-FOOD-9 | Approach kinematics | Taï (P. t. verus), 2006-2007: significant slowing before reaching the resource [normandBoesch2009]<br>Taï, —: approach speed to figs 0.33 m/s vs 0.16 m/s for other fruit [janmaat2014] | slow near goal; faster to figs | held-out | M |
| T-FOOD-10 | Breakfast planning | Taï (P. t. verus), —: 18% of departures before sunrise; nested in the breakfast tree only 2% [janmaat2014] | 0.08–0.3 fraction | held-out | M |
| T-FOOD-11 | Fruiting food trees encountered along travel | Kanyawara, 1990-2011: one fruiting food tree per 97 m (worst month one per 1,730 m); a large crop every 21 km over all transects (10 km in old growth) [janmaat2016] | 60–160 m per fruiting tree (annual mean) | fitted | M |

#### Hunting and prey

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-HUN-1 | Hunts per community-year | Kanyawara (11.4 males), 1996-2014: 194 hunts in 224 months ≈ 10.4 per year (derived) [gilby2015]<br>Ngogo (~24 males), 1995-1999: 45.1 successful hunts per year (55.2 in 1998–99) [wattsMitani2002] | 5–25 per community-year (3–7 males) | fitted | M |
| T-HUN-2 | Hunt success | Kanyawara; Kasekela; Mitumba, 1996-2014; 1976-2013; 2000-2014: 0.613; 0.623; 0.532 [gilby2015]<br>Ngogo, 1995-1998: 0.73 (36/49); red colobus 0.78 (32/41) [mitaniWatts1999]<br>Ngogo, 1995-1999: red colobus 0.82 (67/82) [wattsMitani2002] | 0.5–0.8 fraction | fitted | H |
| T-HUN-3 | Hunting probability per colobus encounter | Kanyawara; Kasekela; Mitumba, as above: 0.079; 0.647; 0.480 [gilby2015]<br>Ngogo, 1998-1999: 0.37 (61/164) [mitaniWatts2001] | 0.05–0.4 fraction | fitted | H |
| T-HUN-4 | More males, more hunting | Kanyawara; Kasekela; Mitumba, as above: +48%; +8%; +72% odds per male [gilby2015]<br>Ngogo, 1995-1999: parties with ≤ 5 males hunted red colobus 3 times (1 success); every hunt with ≥ 20 males succeeded [wattsMitani2002] | 1.05–1.8 odds ratio per male | held-out | H |
| T-HUN-5 | Hunting tracks fruit | Ngogo, 1998-1999: hunts per day vs ripe fruit r² = 0.38 (16 months) [wattsMitani2002]<br>Ngogo, 1998-1999: hunts per month vs ripe fruit r² = 0.37; rainfall no effect [mitaniWatts2001]<br>Kanyawara, 14 y: hunting rises with ripe drupe fruit eaten, after controlling for males and swollen females [gilbyWrangham2007] | ≥ 0.1 r² (positive slope) | held-out | M |
| T-HUN-6 | Hunting comes in bursts | Ngogo, Oct-Dec 1998: 57-day binge: 17 red colobus hunts (15 successful), 69 killed, during a Uvariopsis crop [wattsMitani2002]<br>Gombe, 1982-1991: strong binge tendency; peak Aug–Sep, low Apr–May [stanford1994] | ≥ 1.5 dispersion index | held-out | M |
| T-HUN-7 | Kills per successful hunt | Kanyawara; Kasekela; Mitumba, as above: 1.28; 1.90; 1.30 [gilby2015]<br>Ngogo, 1995-1998: 3.41 ± 1.79 [mitaniWatts1999] | 1.2–2 prey per success (3–7 males) | fitted | H |
| T-HUN-8 | Adult males make most kills | Ngogo, 1995-1998: 0.86 (n = 90 kills) [mitaniWatts1999]<br>Ngogo, 1995-1999: 0.90 (235/261) [wattsMitani2002]<br>Gombe, 1982-1991: males 0.893, females 0.107 [stanford1994] | 0.8–0.95 fraction | held-out | H |
| T-HUN-9 | Meat sharing | Ngogo, 1995-1999: 15.2 adult males present, 8.7 ate meat; 12.1 individuals ate per hunt [wattsMitani2002]<br>Taï (P. t. verus), 2013-2015: owners shared with 48% of adults present; with 62% of bond partners vs 35% of others [samuni2018] | about half of those present eat; bond partners favoured ~1.8× | held-out | M |
| T-HUN-10 | Prey decline under heavy predation (scenario) | Ngogo, 1975-2008: red colobus down about 89% on one transect [lwanga2011]<br>Ngogo, 1975-2021: encounters fell (r = −0.903 over 47 y); no recovery [chapman2023]<br>Ngogo, 1995-1999: offtake 6.5–12% of the population per year [wattsMitani2002] | decline under 6–12%/y offtake; persistence under low offtake | held-out | M |

#### Social relationships and dominance

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-SOC-1 | Male bond persistence | Ngogo, 1998-2007: longest bond per male 7.1 ± 2.0 y; bonds last 1–10 y (mean 1.8 ± 0.7); 7/28 bonded their whole observed span; bonds in year t predict t+1 [mitani2009] | 4–10 years (mean longest bond) | held-out | H |
| T-SOC-2 | Bonds are mostly with non-kin | Ngogo, 1998-2007: 22 of 28 males formed their longest bond with a non-relative [mitani2009]<br>Ngogo, —: males prefer maternal brothers, but most affiliative dyads are unrelated [langergraber2007] | 0.55–0.9 fraction | held-out | H |
| T-SOC-3 | Grooming reciprocity | Budongo Sonso; Mahale M, 2003-2004; 2011: β = 0.655 ± 0.079; 0.721 ± 0.083 (stable), 0.515 ± 0.134 (unstable) [kaburuNewtonFisher2015] | 0.45–0.8 slope | held-out | M |
| T-SOC-4 | Association by sex | Kanyawara, 10 y: male–male association stronger than female–female; preferences stable over 10 y [gilbyWrangham2008]<br>Gombe, 1974-2011: female mean HWI 0.19 ± 0.07 (0–0.94); mother–daughter 0.63 ± 0.18; sisters 0.43 [foerster2015] | 0.1–0.3 female mean HWI; male > female | held-out | M |
| T-SOC-5 | Male hierarchy steepness | Multiple sites, various: mean 0.40 ± 0.16; steepness falls with number of males aged 20–30 (r = −0.743) [kaburuNewtonFisher2015] | 0.2–0.7 steepness | held-out | M |
| T-SOC-6 | Pant-grunts concentrate on top males | Gombe, 1995-2008: top 3 males received > 75% of pant-grunts [gilby2013] | 0.6–0.9 fraction | held-out | M |
| T-SOC-7 | Alpha tenure | Gombe, 36 y: 8 alpha tenures in 36 y (≈ 4.5 y mean, derived) [bray2016] | 3–7 years | fitted | M |
| T-SOC-8 | Females queue | Gombe, 1969-2013: best model: no reversals after entry; ~10% of contests against rank without lasting reversal; queue-jumping at 69% of entries [foerster2016] | as reported | fitted (enc.) | H |
| T-SOC-9 | Reconciliation | Mahale M, —: mean individual corrected conciliatory tendency 14.4% [kutsukakeCastles2004]<br>Budongo Sonso, —: much less reconciliation than in captivity; compatibility predicts it [arnoldWhiten2001] | 0.08–0.22 fraction | fitted | M |
| T-SOC-10 | Third-party post-conflict affiliation | Taï (P. t. verus), 1996-1999: 164/876 (18.7%, likely underestimated); 26 to victim vs 83 to aggressor of 109 [wittigBoesch2010] | 0.1–0.3 fraction | held-out | M |
| T-SOC-11 | Alpha paternity share | Gombe, 22 y: alpha sired 30.3% (36.8% predicted) [wroblewski2009]<br>Taï (P. t. verus), 1987-2000: alpha sired 50% (67% with few competitors, 38% with ≥ 4) [boesch2006] | 0.25–0.55 fraction | held-out | H |
| T-SOC-12 | Relationship-quality components | Captive chimpanzees, —: three components as described [fraser2008] | captive; qualitative | held-out | L |
| T-SOC-13 | Long-term recognition | Captive chimpanzees and bonobos, —: looked 0.244 ± 0.072 s longer at former groupmates; no effect of time apart (non-kin up to 9.54 y); a bonobo recognized kin after > 26 y [lewis2023] | ≥ 26 years a former partner stays in memory digests | held-out | M |

#### Demography and health

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-DEM-1 | First-year mortality | Ngogo, 1995-2016: 0.15 (F 0.17, M 0.12) [wood2017]<br>Kanyawara; Gombe; Taï, various: 0.11; 0.18; 0.08 [wood2017] | 0.11–0.19 probability | fitted | H |
| T-DEM-2 | Life expectancy at 15 | Ngogo, 1995-2016: F 35.1, M 20.98 y [wood2017] | F 31–39, M 18–24 (±~3 y) | fitted | H |
| T-DEM-3 | Survival to 45 | Ngogo, 1995-2016: 0.35 (F 0.51, M 0.20) [wood2017] | 0.25–0.45 probability (both sexes) | held-out | H |
| T-DEM-4 | Causes of death | Gombe Kasekela, 1960-2006: illness 58%, aggression 20% of 86 known-cause deaths; half of illness deaths in epidemics [williams2008]<br>Kanyawara, 1987-2017: respiratory illness 27% of all deaths [emeryThompson2018] | disease 0.25–0.6, aggression 0.1–0.25 | held-out | H |
| T-DEM-5 | Epidemic frequency | Kanyawara, 1987-2017: 3 epidemics (2001, 2006–07, 2013) [emeryThompson2018]<br>Gombe, 1966-2000: 5 epidemics (1966, 1968, 1987, 1997, 2000) [williams2008] | 0.07–0.15 per community-year | fitted | M |
| T-DEM-6 | Outbreak attack rate and mortality | Ngogo, 2016-2017: MPV: 43.8% ill, 25 died (12.2%); R0 1.27 [negrey2019]<br>Kanyawara, 2016-2017: HRV3: 69.1% ill, 0 died; R0 1.48 [negrey2019]<br>Kanyawara, 2013: rhinovirus C: 5 of ~56 died (8.9%); R0 1.83 [scully2018]<br>Gombe, 1968; 1987; 2000: 63% ill, 8% died; 40% ill, 17% died; 75% ill, 4% died [williams2008] | attack 0.4–0.9; mortality 0–0.17 (median ~0.08) | fitted | H |
| T-DEM-7 | Who dies in epidemics | Ngogo, 2016-2017: infants OR 5.01 (1.53–19.56); ≥ 30 y OR 3.86 (1.16–15.15) [negrey2019] | infants and older adults at higher risk | held-out | M |
| T-DEM-8 | Respiratory death rate | Kanyawara, 1995-2016: 11.6 per 1,000 chimp-years [emeryThompson2018] | 5–20 per 1,000 chimp-years | held-out | M |
| T-DEM-9 | Snare injury prevalence | Ngogo, 1995-2016: ~10% of chimps > 3 y [wood2017]<br>Kanyawara, —: ~29% (Wrangham & Mugume 2000, cited in Wood et al. 2017); about 1 in 3 (cited in Emery Thompson et al. 2020) [emeryThompson2020]<br>Budongo Sonso, 2017: 26% with permanent snare injuries [fedurek2022] | 0.1–0.3 fraction | fitted | M |
| T-DEM-10 | Age-specific fertility | Kanyawara; Gombe, various: peak 0.197 births/y at 23.6 y; 0.145 at 23.3 y [muller2020]<br>Ngogo, 1995-2016: fertility falls after ~30; no births after 50; post-reproductive representation 0.195 [wood2023]<br>6 sites, various: fertility falls ~0.008 births/y per year after 25; oldest Kibale mother 55.0 y [emeryThompson2007] | 0.15–0.25 peak births per female-year (at 20–30 y) | fitted | H |
| T-DEM-11 | Age at first birth | Gombe, —: 14.9 y (11.1–22.1) [walker2018]<br>Kibale, various: youngest mother 14.1 y [emeryThompson2007] | 13.5–16 years | fitted | H |
| T-DEM-12 | Birth interval after a surviving infant | Kibale, various: 79.1 months (6.6 y) [emeryThompson2007]<br>Ngogo, 1995-2016: 5.5 y (SD 1.2) [wood2023]<br>Kanyawara, before / since 2004: 5.8 y / 4.8 y [emeryThompson2020] | 4.8–6.6 years | fitted | H |
| T-DEM-13 | Birth interval after infant death | Kibale; all sites, various: 29.6 months; 26.6 months [emeryThompson2007] | 1.8–2.6 years | held-out | H |
| T-DEM-14 | Female rank and fertility | Gombe, —: birth hazard of non-high-ranking females 0.155× that of high-ranking (P = 0.001) [jones2010]<br>Gombe, 35 y: high-ranking females: higher infant survival, faster-maturing daughters, shorter intervals [pusey1997] | rank advantage in interval and infant survival; magnitude uncertain | held-out | M |
| T-DEM-15 | Maternal loss after weaning | Taï (P. t. verus), —: first paternity 16.3 ± 2.0 vs 12.9 ± 1.6 y; 0.08 vs 0.20 offspring per opportunity [crockford2020]<br>Mahale, —: orphaned males die young even after weaning [nakamura2014] | orphaned sons later and less successful | held-out | M |

#### Communication

| ID | Metric | Field values (population, years; source) | Accept band | Role | Ev |
| --- | --- | --- | --- | --- | --- |
| T-COM-1 | Male pant-hoot rate | Mahale M, 1990: 0.88–2.36 per hour, mean 1.40 (computed) [mitaniNishida1993]<br>Kanyawara, 1997-1998: core areas: median 0.76/h (0.14–1.7) [wilson2007] | 0.5–1.5 per male-hour | fitted | M |
| T-COM-2 | High-ranking males call more | Kanyawara, 1997-1998: τ = −0.545 (N = 12); the alpha called 1.5/h in the core and 5.8/h at the periphery [wilson2007]<br>Mahale M, 1990: τ = −0.714 (N = 7) [mitaniNishida1993] | rate falls with rank number | held-out | M |
| T-COM-3 | Quiet at the edges | Kanyawara, 1997-1998: male focal median 0.76/h core, 0.19/h periphery, 0.0 at crop edges; calls rise with males in party (coefficient 0.33) [wilson2007] | periphery rate below core rate | held-out | M |
| T-COM-4 | Calling context | Mahale M, 1990: before calling: travel 43%, feeding 22%, rest 19%, other 16% (computed) [mitaniNishida1993]<br>Kanyawara, 1997-1998: core: 0.42/h while feeding on fruit vs 0.0 on herbs [wilson2007] | travel most common; fruit > herbs | held-out | M |
| T-COM-5 | Pant-hoot caller identity is moderately distinctive | Gombe + Kanyawara, 2010-2017: 19.5% vs 6.9% chance (18 individuals, structural features); 35.8% vs 24.7% with context controlled [desai2022] | 2–4 accuracy ÷ chance | fitted | M |
| T-COM-6 | Drumming structure | Eastern chimpanzees, 11 communities, —: median 4 hits per bout (mode 3); mean inter-hit 229 ms [eleuteri2025]<br>Kanyawara; Taï, 1996–1997; 1990: 61% of male bouts without a call vs 6%; no females drummed; no individual signature at Kanyawara [clarkArcadi2004] | as reported | fitted | M |
| T-COM-7 | Drumming context | Budongo Waibira, —: −29% odds per +1 SD party size; +99% in display and +87% in travel vs rest [eleuteri2022] | less drumming in large parties | held-out | M |
| T-COM-8 | Food calls | Taï (P. t. verus), —: food calls at about half of feeding events; more males present → more calling [kalanBoesch2015]<br>Wild males (site not stated in abstract), —: more likely with an important social partner nearby [slocombe2010] | 0.3–0.6 fraction of fruit-feeding events | fitted | L |
| T-COM-9 | Arrival pant-hoots signal status | Kanyawara, 16 months: arrival pant-hoots only from parties with ≥ 1 high-ranking male; unrelated to ripe-fruit amount [clarkWrangham1994] | status, not food amount | held-out | M |
| T-COM-10 | Gesture repertoire | Budongo Sonso, 2007-2009: 66 types; individual mean 10.0 ± 8.9 (1–41); juveniles 15.1, adults 5.1 [hobaiterByrne2011]<br>Budongo Sonso, —: 19 meanings; 4.6 ± 3.0 meanings per gesture [hobaiterByrne2014] | core repertoire fitted; juvenile > adult repertoire held out | fitted | H |
| T-COM-11 | Alarm calls track audience knowledge | Budongo Sonso, 2008-2010: alert hoos in 46/111 encounters (41.4%); receiver knowledge lowers calling (−0.96, p = 0.030) [crockford2012] | 0.25–0.55 fraction | fitted (enc.) | H |

#### Parameter constraints (registry priors, not targets)

| ID | Registry parameter | Value | Units | Source | Ev | Note |
| --- | --- | --- | --- | --- | --- | --- |
| P-SCALE-1 | `partyLinkM` | ≈ 50 (parties ≥ 90 m apart) | m | [wilson2001] | M | Kanyawara party definition; also the observer party rule. |
| P-SCALE-2 | `sightDayM` | 31–37 (fruit-tree detection: trunk 36 [18–50], crown 31 [14–50]; species max mean 37) | m | [normand2009], [janmaat2013a] | M | Taï; no primary Kibale visibility measurement found. |
| P-SCALE-3 | `hearPantHootM` | 1,000–2,000 (to humans) | m | [wilson2001], [wilsonWrangham2003] | L | Secondary citations of Reynolds & Reynolds 1965 and Ghiglieri 1984. |
| P-SCALE-4 | `hearDrumM` | ≥ 1,000; drums and pant-hoots both clear at 100–200 m | m | [arcadi1998] | L | Personal observation, not a measurement. |
| P-SCALE-5 | `hearPantHootM (lower bound)` | responses to playbacks from median 300 m (110–610) | m | [wilson2001] | M | 92.4 dB at 5 m. |
| P-SCALE-6 | `walkMps` | 0.3–0.4 (derived: 2.7 km/day ÷ ~21% of an 11.5 h day); approach speeds 0.16–0.33 | m/s | [batesByrne2009], [villioth2025], [janmaat2014] | M | Effective travel speed including pauses. |
| P-SCALE-7 | `activeDayH` | males 11 h 34 min; lactating females 10 h 57 min | h | [batesByrne2009] | M | Nest-to-nest. |
| P-FOOD-1 | `foodTreeDensity` | 9.8 feeding-size trees/ha (DBH > 67 cm); 237 chimp-fruit trees/ha; 406 trees/ha | per ha | [janmaat2016] | M | Kanyawara. |
| P-FOOD-2 | `speciesSynchrony` | 64% of species fruit synchronously within species; Uvariopsis ~60% of trees together in Jun–Jul, gaps up to 4 y | — | [chapman1999], [chapman2005] | M | Kibale. |
| P-FOOD-3 | `figAvailability` | F. mucuso and F. natalensis in fruit 72.2% of months vs 42.7% for the average species; fig and non-fig scores correlated r = 0.28 | — | [watts2012b] | H | Ngogo; figs are a staple, not a counter-cyclical fallback there. |
| P-FOOD-4 | `treeMemoryWindow` | ≥ 2 months up to ~3 years (fruiting intervals 2–37 months) | months | [janmaat2013a] | M | Taï. |
| P-FOOD-5 | `dataPhenology` | monthly per-species ripe fruit, Ngogo 1998–2017 (CC0) and Kanyawara 1998–2013 (CC BY 4.0) | — | [potts2020], [chapman2018] | H | Forcing data; see datasets. |
| P-HUN-1 | `colobusDensity` | 2.04–2.92 groups/km², ~42 per group (Ngogo 1997–99) | groups/km² | [mitaniWatts1999], [wattsMitani2002] | M | Pre-decline Ngogo. |
| P-HUN-2 | `colobusOfftake` | ≥ 3%/y (minimum) to 6.5–12%/y | per year | [mitaniWatts1999], [wattsMitani2002] | M | Ngogo estimates. |
| P-HUN-3 | `huntHabitat` | hunted 64% of encounters in broken canopy vs 15% in tall primary forest; success 92% vs 55% | — | [wattsMitani2002] | M | Ngogo. |
| P-HUN-4 | `huntSwollenFemale` | a swollen female present lowers hunt odds by 22% (Kanyawara); impact hunter present 18.9% vs 2.3% of encounters hunted | — | [gilby2015] | M | Kanyawara. |
| P-DEM-1 | `epidemicTransmission` | R0 1.27–1.83; illness ~3.2 days | — | [negrey2019], [scully2018] | M | Human-origin respiratory viruses. |
| P-DEM-2 | `lifeTable` | Ngogo Table 2 and 3 (by sex); Hill et al. Tables 1–2 (deaths and years at risk by age and site) | — | [wood2017], [hill2001] | H | Transcribe for baseline hazards. |
| P-PAT-1 | `patrolMaleOdds` | +17% odds per extra male in party | odds ratio | [mitaniWatts2005] | M | Using it encodes part of T-PAT-4. |

---

## 3. Virtual field observer (O1)

The observer measures the simulation the way a field team measures chimpanzees: the "virtual ecologist" approach [zurell2010], with sampling rules from Altmann [altmann1974]. It never writes to the world. Every metric is reported twice: **observed** (field protocol, with its sampling limits) and **truth** (omniscient). The gap between the two is the observation bias, and it is part of every report.

### 3.1 Rules

| Rule | How it is enforced |
| --- | --- |
| Read-only | The observer receives `Readonly<World>` and imports no function that writes world state. Test: a run with the observer attached deep-equals a run without it (seeds 48, 7, 21; 3 eco-days; `ageRate` 1 and 365). |
| Own randomness | `ObserverState.rng` is its own xorshift32, seeded with `mixSeed((world.seed ^ 0x0b5e ^ cfg.seed) >>> 0)`. It never calls `random(world)`. Test: `world.rng` is identical with and without the observer. |
| Deterministic | The same world trajectory with the same observer config and seed gives byte-identical records. Test: two runs, compare NDJSON hashes. |
| No text parsing | Protocols read state, interactions (through an id cursor) and calls. They do not parse `world.events` text; the regexes in `scripts/sim-metrics.ts` are retired. |
| Protocol stated | Every metric carries `{protocol, interval, unit, effort}`. |
| Cheap | ≤ 5% of the sim bench: ≤ 7 ms per eco-day at the default world, ≤ 40 ms at 120 living. Sampling is gated by `tick % k`; continuous recording walks only interaction ids newer than the cursor. |

### 3.2 Where it lives

New module `src/field/`. It is not in `src/sim/` (the only writer) and not in rendering. Scripts use it now; a UI "field notebook" can use it later.

| File | Contents |
| --- | --- |
| `src/field/observer.ts` | `createObserver(world, cfg)`, `observerStep(obs, world)` (call after each `tickWorld`), `observerRecords(obs)`. |
| `src/field/protocols.ts` | Focal follow and lost-follow model, point samples, party scans, location fixes, all-occurrence capture, daily census, phenology transect, encounter/patrol/hunt classifiers, bioacoustic recorder. |
| `src/field/categories.ts` | The single mapping from sim action and bout phase to field activity category (feed, rest, travel, groom, other social, agonistic). Every script uses it. |
| `src/field/metrics.ts` | Pure functions from records to target metrics, one per target id, each implementing its source's computation. |
| `src/field/targets.ts` | Loads `data/targets.json`, scores metrics against accept bands, emits report rows. |
| `scripts/field-metrics.ts` | Runs worlds with the observer and prints the target table (≥ 5 seeds). `scripts/sim-metrics.ts` stays as a thin wrapper for one release. |
| `scripts/lib/pool.ts` | `node:worker_threads` pool for seeds and parameter sets (no new dependency). Built here so every later stage can run ≥ 5 seeds in parallel. |

### 3.3 Configuration

| Field | Default | Why |
| --- | --- | --- |
| `seed` | 1 | Independent of `world.seed`. |
| `teams` | 1 per community | Kibale projects follow one or more parties per community per day. |
| `followWindow` | nest to nest | Full-day follows (T-RNG-4 needs ≥ 8 h). |
| `focalRotation` | balanced random order over eligible independent adults, males and females separately, redrawn every 10-day block with the observer RNG | Field teams rotate focals to balance hours. |
| `pointIntervalMin` | 1 (targets may resample to 2, 5, 10 or 15) | Continuous-like instantaneous samples; each target resamples to its source's interval. |
| `scanIntervalMin` | 15 | Party composition scans (T-PTY-1, T-HUN-3). |
| `fixIntervalMin` | 5 | Location fixes; ranging targets thin them to 30 min where the source did. |
| `partyRule` | chain within 50 m (field profile) | Kanyawara party definition [wilson2001]; P-SCALE-1. |
| `visibilityM` | 35 × (1 − 0.3·rain), halved at dusk | What an observer on the ground sees (P-SCALE-2; no primary Kibale value). |
| `hearingM` | the chimps' pant-hoot and drum radii | Observers hear what chimps hear. |
| `loseHazardPerH` | 0.05, ×4 while the focal runs or climbs above 15 m (design) | Follows get lost; a lost follow ends that focal day. |
| `ageErrorY` | 0 for known-age individuals; uniform ±2 for founders and immigrants (design) | Field ages of immigrants are estimates [wood2017]. |
| `transect` | 20 trees per species, checked monthly; one 5 km walk per month | Phenology index (T-FOOD-1) and fruiting-tree encounter rate (T-FOOD-11), as in [potts2020] and [janmaat2016]. |

### 3.4 What it records

| Record | Protocol (Altmann's term) | Fields |
| --- | --- | --- |
| `Point` | Focal-animal instantaneous sample | t, team, focal, category, action, height band, party size (rule), independent individuals within 5 m and 10 m |
| `Scan` | Instantaneous scan of the focal party | t, team, members (independent, dependent), adult males, maximally swollen females, category per member, prey within 100 m |
| `Fix` | Observer location (GPS stand-in) | t, team, focal, x, z (logical metres) |
| `Bout` | Focal continuous recording | kind (groom, play, feed in tree, travel leg), start, end, actor, partner, direction, mutual |
| `Event` | All-occurrence within visibility or hearing | t, kind (aggression, pant-grunt, coalition, reconciliation, consolation, copulation, hunt, share, call, drum, gesture), actors, outcome, detected by (seen/heard), distance |
| `Encounter` | All-occurrence, field definition | t, own and other community, modality (heard only / seen / physical), own party size and adult males, other party if seen, response (approach ≥ 50 m within 1 h, avoid, call, silent, attack), outcome |
| `Patrol` | Behavioral classifier | t0, t1, members, adult males, path, max depth beyond own 95% isopleth, entered neighbour range, contact, aggression |
| `Hunt` | All-occurrence | t, prey group, hunters by age-sex class, duration, captures, captors, sharing events |
| `Call` | Bioacoustic recorder | t, caller, kind, context label, feature vector (pant-hoot or drum signature) |
| `Census` | Daily presence list | day, community, ids seen; last-seen dates drive disappearance-based deaths and emigration |
| `Phenology` | Monthly transect | month, tree, species, ripe (yes/no), crop score |
| `Effort` | Observation effort | per community: follow-hours, days with contact, point and scan counts |

### 3.5 Field classifiers

| Classifier | Field criteria encoded | Truth comparison |
| --- | --- | --- |
| Patrol | Party with ≥ 2 adult males travelling silently (no pant-hoots by members for ≥ 20 min), moving to or beyond the own 90% isopleth, with ≥ 2 stationary listening stops ≤ 5 min, after [wattsMitani2001] | Precision and recall against `action === 'patrol'`. |
| Encounter | Focal party sees strangers within visibility, or hears stranger pant-hoots or drums and at least one member responds within 10 min, after [wilson2012] | Truth: all detections by any chimp. |
| Hunt | Chase of prey with ≥ 1 chimp climbing toward it; colobus encounter = prey within 100 m in a scan [gilby2015] | Truth: `HuntState`. |
| Death | Seen dead, or not seen for 30 days and not a disperser-age female | Truth: `killChimp`. Female disappearances split into death vs emigration by truth, reported as misclassification. |

### 3.6 How each target family is computed

| Family | Computation (as the source computed it) |
| --- | --- |
| Activity (T-ACT) | Share of point samples per category for each focal, then the mean of individual means, by sex [villioth2025]; resting including grooming for T-ACT-4 [potts2011]. |
| Parties (T-PTY) | Mean and distribution of scan party size, all individuals, 50 m chain rule [wilson2012]; monthly means against the phenology index; feeding-party size against crown size. |
| Ranging (T-RNG) | Polygon around 98% of unique daily 500 m cells [wilson2012] and 95%/50% fixed-kernel isopleths from 30-min fixes; day range = sum of 5-min fix distances on follows ≥ 8 h [batesByrne2009]. |
| Encounters (T-IGE) | Classified encounters ÷ community-days with a follow × 365 [wilson2012]; approach log-odds by logistic regression on adult males. |
| Patrols (T-PAT) | Classified patrols per community-week; depth and duration from fixes; participation per male-year [langergraber2017]. |
| Killings (T-LET) | All killings (observed + inferred via census) ÷ community-years [wilson2014]. |
| Fission (T-FIS) | Yearly association networks (simple ratio index from 15-min scans), modularity, cluster ranging overlap [sandel2026]. |
| Food (T-FOOD) | Phenology transect index [potts2020]; feeding shares by food type [watts2012a]; tree visits, nearest-tree choice, revisit interval and approach distance from bouts and fixes [normand2009] [ban2014]. |
| Hunting (T-HUN) | Hunts per community-year from observed hunts and effort; P(hunt) per colobus encounter within 100 m; odds per male by logistic regression [gilby2015]. |
| Social (T-SOC) | Strong bonds from 5 m proximity above the 97.5% randomization tail [mitani2009]; grooming reciprocity slope [kaburuNewtonFisher2015]; Elo from observed decided conflicts and pant-grunts [neumann2011]; conciliatory tendency by post-conflict/matched-control comparison. |
| Demography (T-DEM) | Life table from census exposure with disappearance-based deaths and the age-error model [wood2017]; fertility by age; interbirth intervals split by first-infant survival [emeryThompson2007]. |
| Communication (T-COM) | Pant-hoots initiated per focal male-hour [mitaniNishida1993]; leave-one-out linear discriminant accuracy on recorded feature vectors vs chance [desai2022]. |

---

## 4. Parameter registry (O2)

### 4.1 Files

| File | Role |
| --- | --- |
| `data/params.json` | The registry: every behavioral, ecological and demographic constant with metadata. Human-edited, sorted by `id`. |
| `src/sim/params.gen.ts` | Generated by `scripts/gen-params.ts`: `export const DEFAULTS = { … } as const` and `export type ParamId = keyof typeof DEFAULTS`. Hot code imports this, never the JSON. Committed. |
| `src/sim/params.ts` | `paramsOf(world)`: the resolved, frozen parameter object for a world (defaults, then profile, then overrides), cached in a `WeakMap` keyed by the world. This is an allowed derived cache (simulation.md §20). |
| `tests/sim-params.test.ts` | Registry validity, generated-file drift, golden-hash default equivalence, override wiring, coverage of simulation.md §17. |

### 4.2 Entry schema

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | camelCase string | Unique key and TS property name, e.g. `sightDayM`. |
| `group` | string | `scale`, `perception`, `movement`, `needs`, `feeding`, `social`, `dominance`, `conflict`, `territory`, `patrol`, `hunting`, `prey`, `phenology`, `reproduction`, `mortality`, `disease`, `communication`, `observer`. |
| `value` | number | Default; must lie in `range`. |
| `units` | string | `m`, `m/s`, `per eco-h`, `per bio-y`, `probability`, `score`, `Elo`, and so on. |
| `range` | [lo, hi] | Plausible range from sources, or ×÷2 for design constants. Priors live inside it. |
| `hardRange` | [lo, hi] | Physical or logical limits; overrides outside throw. |
| `calibrate` | boolean | In the calibration set. |
| `prior` | `{dist: uniform \| loguniform \| normal \| beta, …}` | Required when `calibrate` is true. |
| `evidence` | `H \| M \| L \| design \| stylized \| calibrated` | Same vocabulary as research.md and code tags. `calibrated` only after a fit that passed held-out checks. |
| `sources` | citation keys | Keys from `data/targets.json#sources`; parameter constraints P-* in §2 map onto ids here. |
| `population`, `years` | string | Where and when the source measured it. |
| `clock` | `eco \| bio \| none` | Which clock the rate runs on (simulation.md §3). |
| `symbol`, `file` | string | Code location, checked by the drift test. |
| `profiles` | `{compressed?: number, field?: number}` | Scale-profile values for spatial parameters (§5.1). |
| `calibratedBy` | run id | Set only when a calibration result is adopted. |
| `notes` | string | Plain-English basis. |

```json
{ "id": "sightDayM", "group": "perception", "value": 15, "units": "m",
  "range": [20, 60], "hardRange": [1, 200], "calibrate": true, "prior": { "dist": "uniform" },
  "evidence": "stylized", "sources": ["normand2009", "janmaat2013a"], "population": "Taï (fruit-tree detection)",
  "clock": "none", "symbol": "SIGHT_DAY", "file": "src/sim/state.ts",
  "profiles": { "compressed": 15, "field": 35 },
  "notes": "Daylight sight radius. The compressed profile keeps the 1/3-range-width stylization; range and prior apply to the field profile." }
```

### 4.3 How the sim reads it

- `createWorld(seed, opts?)` gains `opts = { profile?: 'compressed' | 'field', params?: Partial<Record<ParamId, number>> }`. The default profile stays `compressed` until the renderer supports `field` (C5b).
- Profile and overrides are stored as plain data in `world.sim.params = { profile, overrides }`. They serialize with the world, so a saved world resumes with the same parameters, and they are covered by determinism checks.
- Hot functions start with `const P = paramsOf(world);` and read `P.sightDayM`. The object has a fixed shape, so property loads stay monomorphic. Expected bench cost: not measurable; verify with `scripts/bench-sim.ts`.
- Module-level constants that derive from parameters (for example `DAILY_DECAY` in relations.ts) become derived fields computed once in `paramsOf` (`P.tensionDailyDecay`).
- Reading a parameter never consumes `world.rng`.

### 4.4 Proving defaults are unchanged

1. Before migrating, record golden hashes: FNV-1a over canonical JSON of the world (sorted keys, derived caches excluded) after 2 eco-days for seeds 48, 7, 21 at `ageRate` 1, and after 3 eco-days at `ageRate` 365. Store them in `tests/fixtures/golden-world.json`.
2. Migrate one module at a time (state, perception, candidates, execution, conflict, hierarchy, relations, life, reproduction, environment, ecology, parties). After each module the golden test must pass unchanged.
3. Wiring test: for 10 registry entries chosen by a fixed hash, a +10% override changes the hash.
4. Coverage test: every row of simulation.md §17 maps to at least one registry id (a checked list in the test). A grep lint fails on numeric literals in `src/sim` next to an evidence tag (`[H]`, `[M]`, `[L]`, `design`, `stylized`) without a registry id, with an allowlist for true constants (π, id ranges, tick length).

### 4.5 How calibration overrides it

- Calibration never edits `data/params.json`. Runs pass overrides through `createWorld(seed, {params})`.
- A run writes `artifacts/calibration/<run-id>/posterior.json` (per parameter: median, 50% and 90% intervals, prior, sensitivity indices).
- Adoption is a reviewed edit: copy chosen medians into `data/params.json`, set `calibratedBy`, and set `evidence: "calibrated"` only if held-out targets pass. Regenerate the TS file and re-record golden fixtures in the same change, citing the run id.

---

## 5. Mechanism designs (O3–O10)

Performance budget for everything in this section: the default world must stay ≤ 0.3 s per eco-day in the field profile (today 0.13 s in the compressed profile; hard limit 0.8 s). Estimated costs below are for 49–60 living chimps unless stated; each stage measures them.

### 5.1 O3: Logical vs visual scale

**What matters is ratios, not metres.** If every length and speed were scaled by the same factor, encounter rates and day-range-to-range ratios would not change. The current map is wrong because it shrank ranges ~50× but shrank sight and party links much less. Simulating in real metres makes the ratios right by construction; legibility becomes a renderer problem.

Ratios below use West's diameter (64 m compressed; 3.2 km in the field profile at scale factor 50).

| Dimensionless group | Compressed now | Field profile | Inflation now | What it drives |
| --- | --- | --- | --- | --- |
| sight / range diameter | 15 / 64 = 0.23 | 35 / 3,200 = 0.011 (P-SCALE-2) | **21×** | seen encounters (T-IGE-2), fruit detection, the need for memory |
| party link / range diameter | 9 / 64 = 0.14 | 50 / 3,200 = 0.016 (P-SCALE-1) | **9×** | party size and fragmentation (T-PTY-1) |
| pant-hoot audibility / range diameter | 36 / 64 = 0.56 | 1,000 / 3,200 = 0.31 (P-SCALE-3) | 1.8× | heard encounters, joining calls |
| hearing / sight | 2.4 | ~29 | — | share of encounters heard only (T-IGE-2) |
| daily path / range diameter | 118 / 64 = 1.8 | 2.7 km / 3.2 km = 0.84 (T-RNG-4) | 2× | boundary visits, encounter rate (T-IGE-1) |

#### C5a: simulation side

| Change | Detail |
| --- | --- |
| Profiles | Registry profiles `compressed` (today's values, the default until C5b) and `field` (real metres). Every spatial parameter carries both. |
| Map | `world.size` in logical metres. Field profile keeps today's layout ×50: an 8 km map; West r 1.6 km (8.0 km²), East r 1.35 km (5.7 km²), North r 1.25 km (4.9 km²), inside T-RNG-1. From C6 on, ranges come from use (§5.2). |
| Speeds | Walk 0.35 m/s (P-SCALE-6: derived from 2.7 km/day and ~21% travel); run and climb from the registry. A tick moves ≤ ~5 m walking. |
| Food | Each `Tree` becomes a large **food patch** (feeding-size crown, DBH > 67 cm class; 9.8/ha at Kanyawara, P-FOOD-1), thinned to ~150–200 per km² of range (~3,000 total; stylized, labelled). Small trees, leaves and pith become a gridded **forage field** (§5.6). Density is fitted to T-FOOD-11 (one fruiting food tree per ~97 m walked). |
| Fruit | Crop is evaluated lazily from time and depletion state when read (`fruitAt(tree, t)`), so ~3,000 patches cost nothing until perceived. `updateFruit` no longer loops all trees every slow step. |
| Spatial indexes | `GRID_CELL` 16 m → 64 m for trees; the same grid for chimps so `perceive` and `computeParties` stop scanning all living chimps (needed at 120+). |
| Stream | The 1 m occupancy grid (`streamCell`) cannot scale to 8 km (64 M cells). Replace with a segment grid and analytic distance to the polyline, same API (bank A, bank B, channel, ford). |
| Calls | Radii in metres from the registry; hearing stays pushed from caller to listeners within radius. |
| Party link | 50 m chain (P-SCALE-1). |
| Files | `state.ts`, `generation.ts`, `stream.ts`, `environment.ts` (lazy fruit), `perception.ts`, `parties.ts`, `execution.ts` (step limits), `events.ts` (radii), `params.ts`. |
| Cost | Fruit loop removed (−~10 ms/day); grids add ~5 ms/day. Net ≈ neutral. |

**Expected effect:** encounter rate falls toward T-IGE-1 and heard share rises toward T-IGE-2; travel share rises toward T-ACT-2 because food is farther apart; party sizes shrink toward T-PTY-1; grooming share falls because more time goes to travel.

**Risks:** many hand-tuned score terms contain distances (`d/55`, `d/80`, 20 m grooming search). Each must become a registry parameter with both profile values, or behavior silently changes. Mitigation: C4 (registry) lands before C5a, and the migration lint in §4.4 catches untagged literals.

#### C5b: renderer side (renderer owner)

The 3D scene cannot show an 8 km range and a 1 m grooming distance at once. Two views:

| View | What it shows | Mapping |
| --- | --- | --- |
| Field (zoomed in) | A 1:1 window (~250 m) around the camera target. Terrain and vegetation stream by tile from logical coordinates; food patches are sim trees; filler vegetation is procedural from a hash of logical coordinates (render-only). | render = logical − window origin |
| Overview (zoomed out) | The whole map compressed into today's 160 m diorama, canopy surface only (no individual trees, so no chimp–tree mismatch). Each party is drawn as a cluster at `s · anchor`, with `s = 160 / world.size` and `anchor` a render-side smoothed party centroid; member offsets are kept but softly capped at ~6 render m. | render = s·anchor + softcap(logical − anchor) |

The views cross-fade by zoom. The minimap needs only the new extent. The renderer still only reads the World; anchor smoothing is render state. Today's terrain uses a fixed 1 m heightmap (`src/render/env/terrain.ts`), so the field view needs tiled terrain. **Why not one compressed view:** at `s ≈ 0.02` a grooming distance becomes 2 cm, and party-anchored compression would put feeding chimps outside their rendered tree.

### 5.2 O4: Living territories

| Aspect | Design |
| --- | --- |
| Data | `world.sim.ud[troopId]`: utilization grid (100 m cells in the field profile, 4 m compressed; 80 × 80 = 6,400 cells per community). `world.sim.danger[troopId]`: same grid, where the community lost encounters or heard outnumbering strangers. `world.sim.sectorVisit[troopId]`: last time the community's periphery was used in each of 8 compass sectors (for patrols). All plain `number[]`. |
| Update | Every party update (2 eco-min): add (independent members × Δt) to the cell of each party centroid. On an encounter outcome: add to `danger` at the location, weighted by the loss (flee, injury, death). |
| Daily | Decay `ud` by `exp(−1/τ_ud)` (τ_ud 180 days, design) and `danger` by `exp(−1/τ_danger)` (60 days, design). Sort cells, compute 95% and 50% isopleths, centroid, and an equal-area radius. `troop.center` and `troop.radius` keep their meaning as the equal-area circle (no field repurposed); an optional `troop.range?: { cell: number; cells: number[]; core: number[] }` is added to the contract for the UI. |
| Behavior | Replace the circle cost `outsideRange` with a territory cost for forage and travel targets: `a·(1 − f) + b·g·risk`, where `f` = own-UD percentile of the target cell (1 in the core, 0 outside the 99% isopleth), `g` = neighbours' normalized UD plus `danger`, and `risk` falls with own adult males in view (numerical assessment already exists). Calls are suppressed where `g` is high. Larger parties then use the periphery (T-PTY-3) and edges are quiet (T-COM-3) without scripting either. |
| Knowledge | Each member knows its community's UD as long-term familiarity (stylization, labelled). Immigrants' familiarity scales from 0.3 to 1 over 2 years of tenure. |
| Territory change | Remove the scripted `shiftRange` and the 1%/day `territory` relaxation. Ranges move because food depletion in the core pushes use outward, unexploited overlap food attracts it, and `danger` repels it. A community that loses males loses encounters, so its neighbours' periphery use grows (T-LET-4). |
| Initialization | Seed `ud` from today's circles (Gaussian, σ = radius/2). Validation scripts run a 180-day burn-in. |
| Parameters | `a`, `b` (planned as fitted to T-RNG-3 and T-RNG-1; as built they are design values with calibration off, see the C6 results and C6 review finding 8), τ_ud, τ_danger, cell size (design). Since the C6 patrol corrections the community `danger` grid is replaced by per-chimp contact memory (§5.3.1 P2). |
| Targets | Fitted: T-RNG-1, T-RNG-3. Held out: T-RNG-2, T-RNG-6, T-IGE-5, T-PTY-3, T-COM-3, T-LET-4, T-LET-5. |
| Files | New `src/sim/territory.ts`; `candidates.ts` (territory cost), `parties.ts` (UD increments), `tick.ts` (daily), `conflict.ts` (remove `shiftRange`, add danger marks), `state.ts`, `generation.ts`, `types.ts` (optional `Troop.range`). |
| Cost | ~1–3 ms per eco-day (19,200 cells decayed and sorted daily). |
| Risks | Self-reinforcing collapse into the core, or drift of ranges over decades. Countered by core depletion and by anchoring nest and water sites; tested with a 10-year baseline (range area must stay within 0.5–2× of its start). |

### 5.3 O5: Grounded patrols

| Aspect | Design |
| --- | --- |
| Start | Remove the fixed 8–13-day gap. At perception, an adult male in a party with ≥ 3 adult males in view rolls a patrol impulse (as gang impulses are rolled today, so candidates stay pure) with hourly hazard `h = h0 · OR^(m − 3) · S(staleness) · E(energy) · (1 + β_h·heard24h)`, in the 08:00–15:30 window. `m` = adult males in view; `OR` prior 1.0–1.3 (centred on +17% per male, [mitaniWatts2005]); `S = 1 − exp(−days/τ_s)` using the stalest boundary sector (males' "border checking", [batesByrne2009]; functional form is design); `E` rises with the party's mean energy (the fruit effect of T-PAT-4 comes through energy, not a direct fruit term). |
| Route | Target the stalest sector that faces a neighbour. Waypoint 1: the own 95% isopleth edge. Waypoint 2: with probability `p_inc` (planned as fitted to T-PAT-6; as built 0.4, not fitted, see the C6 results), an incursion into the neighbour's range to a depth drawn up to the neighbour's 50% isopleth; otherwise a sweep along the edge. Waypoint 3: home. Deep incursions (≥ 1 km, [wilson2004]) arise when the neighbour's periphery is wide. |
| Joining and abort | Unchanged joining rules (males keen, lactating females not). Abort and retreat when heard or seen stranger males ≥ own males. |
| Parameters | `h0` (tuned to T-PAT-1 on simulation truth in development, labelled tuned), `p_inc` (planned as fitted to T-PAT-6; as built 0.4, not fitted), `OR`, `τ_s`, `β_h` (0 since the C6 patrol corrections, P1). |
| Targets | Fitted: T-PAT-1, T-PAT-6. Held out: T-PAT-2 (per-male participation), T-PAT-3 (composition), T-PAT-4 (predictors; encoded for the male term), T-PAT-5 (duration, distance), T-PAT-7 (contact, violence), T-LET-6 (killings on patrol). |
| Files | `perception.ts` (`rollImpulses`), `candidates.ts` (lead from impulse), `parties.ts` (`updatePatrols` route through `territory.ts`), `territory.ts` (sector staleness), `state.ts`. |
| Cost | Negligible. |
| Risks | New RNG draws change trajectories (golden fixtures re-recorded, as expected). The 3-male community (North) will rarely patrol; that matches small communities, not a bug. |

### 5.3.1 C6 patrol corrections (pre-registered 2026-09-29, before any run)

Adopted by the user: recommendations 1–5 of the patrol review. The evidence check (Step 1) is `docs/patrol-evidence.md`. Values below are fixed now, before any run. Evidence tags marked "pending" take their final level from Step 1. If Step 1 refutes an item's premise, that item reverts and the change is logged; nothing is tuned to recover a verdict. The readiness state is deferred until Samuni et al. 2017 is verified. Who initiates a patrol stays as is, labelled weakly evidenced in docs/simulation.md.

**Principle.** A natural feel should come from the right timescales and visible behaviour, not from patrols that are more frequent or more reactive.

| # | Change | Values (fixed now) | Evidence |
| --- | --- | --- | --- |
| P1 | Drop the heard-strangers boost to the patrol hazard. The immediate reaction to heard strangers (V.HEARD: approach silently or counter-call with ≥ 3 males, retreat quietly when outnumbered) is unchanged. | `patrolHeardBeta` 1 → 0 | [M] pending: intruder pressure did not predict patrol occurrence at Ngogo (mitaniWatts2005) |
| P2 | Per-chimp contact memory, shared by travelling together, replaces the community-global danger grid. It drives two effects: patrol route interest (check where the neighbours were) and avoidance (the existing territory-cost danger term, now read from the chimp's own memory; the risk term that makes many males bolder is unchanged). No separate wins map. | ≤ `contactSlots` 8 hot spots per chimp, each with a contact weight c and a loss weight l. Writes: heard strangers c += 1 at the heard position; strangers seen in an encounter c += 1; retreat from strangers or a patrol turning back l += `dangerFleeW`; wounded by strangers l += `dangerInjuryW`; a group member killed by strangers in view l += `dangerDeathW` (existing weights). Merge radius 2 × `udCellM`. Both weights decay with `dangerTauDays`. When full, the weakest spot is evicted. Sharing, hourly within a party: a member lacking a spot gets it at 0.5× (`contactShareFrac`), taking the max with any existing weight, never the sum. Route: sector score = S(staleness) × (1 + `patrolContactW` · min(1, C/`dangerScale`)), where `patrolContactW` = 1 and C is the leader's contact weight in that sector beyond the core. | design (consistent with border checking; wattsMitani2001 descriptive) |
| P3 | Female participation becomes a site setting. The default keeps today's Ngogo-like behaviour; the Taï option is a documented override, not tuned. | `patrolFemaleJoin` 0.2, `patrolLactatingJoin` −1, `patrolFemaleStay` −0.3 (today's literals in candidates.ts, moved to the registry). Taï override `data/presets/tai-patrols.json`: female join = the male base score (0.85), female stay penalty 0, lactating unchanged. | [M] pending: site difference in female participation (wattsMitani2001) |
| P4a | Patrol presentation, sim side. **Single file:** during patrol travel, each member follows the member ahead in join order. **Silence:** patrol members make no calls on the way out, at stops or during incursions. **Edge caution:** slower in neighbour range, faster home. **Release:** after contact, or on returning to the core, adult males give a pant-hoot chorus with drumming and a display. | File gap `patrolFileGapM` 3 m (body scale, both profiles). `patrolEdgeSpeed` 0.6 outside the own 95% isopleth; `patrolReturnSpeed` 1.3 until back in the core. `patrolReleaseP` 1 after contact, 0.5 on return without contact. | single file and silence [M] pending (wattsMitani2001); speeds and release design unless Step 1 verifies them |
| P4b | Patrol presentation, render side (creature/render agent). Listening stops read as listening: still, heads up, some sniff the ground or look back. Careful gait at the edge. The release display. | Contract: optional `Party.patrolPhase` ('out', 'listen', 'incursion', 'return'). | stylization of the P4a states |
| P5 | New non-circular held-outs; see below. | | |

**Scope.** P1–P4a apply in both profiles. Compressed golden hashes are expected to move, and are re-recorded only for this intended change. Bench: within 3% of the pre-change build, measured A/B interleaved on the same machine state.

**Validation rules (fixed now).**
- **T-PAT-4 is compromised this cycle.** P1 changes its predictor after its value was seen. It is reported, never counted, and nothing is tuned against it.
- **T-LET-4 becomes partially encoded.** P2 makes expansion toward contested edges more likely. It is scored against the paired baseline, per the C6 review.
- **The other patrol targets (T-PAT-2, 3, 5, 7, T-LET-6) are touched by a model change after the freeze.** They are re-tested on fresh seeds never used before (606, 707, 808, 909 and 1010 at first; 707, 808, 909, 1013 and 1014 since 30 September, because 606 and 1010 had been run; protocolLog), and labelled "model revised post-freeze". They count as validation only if no parameter was set by looking at them.
- **The fitted T-PAT-1 and T-PAT-6 keep their fitted parameters.** `patrolH0` and `patrolIncursionP` may be refitted once, to those targets only, and the refit is logged. Fresh-seed replication is required.

**P5: new held-out targets.** The definitions are fixed now; the bands are computed from the real data by the rule stated here, before any post-change simulation value is seen.
- **T-PAT-8: patrols and fruit.**
  - **Real:** Ngogo patrol dates (Dryad kk33f, Langergraber et al. 2017, CC0; `data/raw/dryad-kk33f/`) joined to a monthly Ngogo fruit-availability series. Statistic: Spearman ρ between monthly patrol rate and monthly fruit availability, with a bootstrap 90% CI over months. Band = that CI. Optional second site: Gombe (Dryad z8w9ghxdb, Massaro et al. 2022, CC0), only if its files carry monthly patrol counts and a fruit series.
  - **Sim:** the observer's patrol classifier on focal follows × `environment.fruitIndex`, by month, 10-year runs.
  - **Blocked:** Ngogo fruit phenology is not open; it has to be requested or taken from a published table.
- **T-BRD-1: advance after border stops.**
  - **Real:** Taï S3 Data (PLOS Biol 10.1371/journal.pbio.3002350, CC BY 4.0; `data/raw/plos-pbio-3002350/`). The share of border stops followed by an advance toward the border rather than a retreat, and its slope on the number of males present.
  - **Sim:** listening stops within the outer 20% of the own 95% isopleth radius (normalized distance); advance means net displacement toward the nearest neighbour range over the next 30 min.
  - **Scoring:** the male-count slope is the non-circular part. The overall share is partly encoded through `patrolIncursionP` (fitted to T-PAT-6), and is labelled so.
- **Kept held out: Ngogo GPS ranging divergence** (C12 `pairBA`, edge use, year-to-year shift), which none of P1–P4 was shaped by.

**Amendment A (2026-09-29, after the Step 1 evidence check, still before any run).** docs/patrol-evidence.md confirmed gaps 1, 3, 4 and 7, partly confirmed 2, 5 and 6, and refuted none. These changes come from the evidence only; no simulation value of the corrected model has been seen.

| # | Change to the plan above | Values | Evidence |
| --- | --- | --- | --- |
| A1 | **P2 route form.** The multiplicative score let a never-contacted stale sector beat a hot one, which predicts rotation; the field shows repeat patrols on contested edges and months of neglect elsewhere. New additive score over neighbour-facing sectors: `w_s·S + w_c·min(1, C/dangerScale) − w_l·min(1, L/dangerScale)·risk`. C and L are the leader's contact and loss weights in the sector; `risk` is the existing territory-cost risk factor, so many males press on and few retreat. **Kills write contact:** a stranger killed by own members adds c += `dangerDeathW` at the site for witnesses (wins leave a trace through contact memory; still no separate wins map). | `patrolStaleW` 0.25, `patrolContactW` 1, `patrolLossW` 1 (design) | pattern [M] (wattsMitani2001, mitani2010, wilson2012, watts2006); weights design |
| A2 | **Energy gate removed from the hazard** (E = 1). Fruit acts through male party size in the field. Individual hunger still lowers join and continue scores. | remove `patrolEnergyLow` from the hazard | [M] mitaniWatts2005 (fruit n.s. with party size, P = 0.21; lean periods did not deter patrols) |
| A3 | **Patrol cap raised.** 2.5 h cut about a third of Ngogo patrols short. | `patrolMaxH` 2.5 → 6 h, both profiles | [M] mitaniWatts2005 (2.13 ± 1.01 h, up to ~6 h) |
| A4 | **Alpha lead bonus removed.** The other lead terms stay and are labelled weakly evidenced. | 0.1 → 0 (registry id `patrolAlphaLeadBonus`) | [M] wattsMitani2001, massaro2022 (rank does not predict patrolling; langergraber2017 found a rank effect on participation, so mixed) |
| A5 | **Taï preset corrected.** Lactating females are not excluded. The swelling and late-gestation effects are direction-only in samuni2021 (encounter participation), with no usable effect size, so they are noted and not implemented. | Taï override: `patrolLactatingJoin` = the female join value | [M] samuni2021, wattsMitani2001 (secondary Taï figure) |
| A6 | **Readiness state closed.** The oxytocin rise is a correlate of unknown direction, and the anticipation result rests on 6 animals and 14 samples. | not implemented | samuni2017 |
| A7 | **Evidence tags settled.** P1 [M]. P3 [M]. Single file, silence, listening stops and vigilance until back toward the centre [H]. The release display exists [M] ("sometimes"); its probabilities stay design. Edge and return speeds stay design. The 08:00–15:30 start window stays design (unverified). | | patrol-evidence.md |

**Added check, labelled encoded-descriptive, not validation:** T-PAT-9, patrol sector concentration. In a community-year, the top neighbour-facing sector gets ≥ 1/3 of patrols, and at least one neighbour-facing sector goes ≥ 100 d without a patrol (wattsMitani2001). A1 was chosen after reading this pattern, so the check is reported but never counted as validation.

**Implementation notes (2026-09-29, before any run of the corrected model).**
- **Code.** P1–P4a and A1–A5 are in `src/sim/contact.ts` (new: per-chimp contact memory, sharing, sector scores, witnesses), `territory.ts` (the community danger grid is gone; `territoryCost` and pressure read the animal's own losses; `neighbourSectors` over all neighbour-facing sectors), `execution.ts` (A1 route, single file, edge and return pace, flee writes loss), `parties.ts` (release chorus, contact flag, outnumbered retreat writes loss, `Party.patrolPhase`), `conflict.ts` (kills and wounds write contact and loss for witnesses), `perception.ts` (hazard without the energy gate; heard and seen strangers write contact) and `candidates.ts` (registry join and lead scores; patrol members make no calls). Tests: `tests/sim-patrol.test.ts`.
- **Bands (P5).** Computed by `scripts/patrol-bands-metrics.ts` from the raw files before any simulated value of the corrected model was seen; only derived statistics were written. T-PAT-8: 279 Ngogo patrols in 211 months (1998–2015; 113 months without a patrol), ρ 0.059, band −0.057 to 0.170. Ngogo patrols do not track fruit month by month, which fits mitaniWatts2005 (the fruit effect vanished once male party size was in the model). T-BRD-1: 625 Taï stops, advance 0.448 (0.411–0.486), slope +0.072 (0.037–0.107) log-odds per adult present. The Gombe files (Dryad z8w9ghxdb) have no fruit series, so the optional second site is not used.
- **T-PAT-8 not scorable (integrator ruling, same day, before any simulated value).** The Ngogo patrol file is not continuous observation: 43% of patrols fall in June–July, 113 of 211 months are empty, gaps reach 286–367 d, and Langergraber et al. 2017 report 2,621 observation days against ~6,900 calendar days. Without an effort column a monthly patrol rate cannot be computed, so the band measures observation effort as much as patrolling. Over the 98 months with a patrol, ρ = −0.054. The row is kept for the record and never counted; it returns if monthly observation days are obtained.
- **Deviations forced by the data (logged).** S3 Data record adults present, not males (Lemoine et al. count all adults because Taï females join encounters), so the "male-count slope" is a slope on adults present, measured the same way in the simulation (adult males + adult females of the nearest party scan). Taï stops are ≥ 5-min rests; simulated listening stops last 2–4 min, so simulated halts of ≥ 1 min count.
- **Labels applied** (from the pre-registration): T-PAT-4 compromised; T-PAT-2, 3, 5, 7 and T-LET-6 "model revised post-freeze" (fresh seeds 707, 808, 909, 1013, 1014); T-LET-4 "partially encoded" (paired baseline); T-PAT-9 encoded. The protocol is re-frozen with the new rows.

### 5.4 O6: Community fission

| Aspect | Design |
| --- | --- |
| Pre-conditions (behavior) | Association must be able to become modular: joining travel and following weighted by bond with the caller or leader; rivals' allies avoid each other during hierarchy instability (the Gombe split coincided with a struggle among three top males, [feldblum2018]); feeding competition in large communities fragments parties. |
| Data | `world.sim.assoc[troopId]`: integer-keyed dyad counts (`a·100000 + b`) of co-membership at 15-min scans, and per-individual scan counts; per-individual sparse location histograms at 400 m cells; `world.sim.fissionLog`: monthly `{month, troopId, Q, sizes, males, overlap}`, capped at 240 entries. |
| Monthly | For each community: simple ratio index over independent individuals ≥ 10 y with ≥ 50 scans; community detection by deterministic Louvain with Leiden refinement ([traag2019]; nodes processed in id order, ties broken by smaller id, so no RNG); best two-cluster split; modularity Q; adult males and females per cluster; ranging overlap = Bhattacharyya coefficient between the clusters' location histograms. |
| Split rule | A field-recognition proxy, set a priori, not tuned: Q ≥ Q\* and overlap ≤ O\* for ≥ M consecutive months, with ≥ 3 adult males and ≥ 3 adult females per cluster. Priors: Q\* 0.3–0.5, O\* 0.3–0.6, M 6–24 months (design; Gombe and Ngogo took 1–3 years, T-FIS-2). |
| On split | The cluster farther from the original UD centroid becomes a new `Troop` (id 4+). Dependents follow their mothers. The UD is divided by cluster histograms. Hierarchies and alpha are recomputed. Bonds and memory digests are kept (O11); the two groups are now strangers, so existing intergroup mechanics apply. Nothing scripts violence. |
| Targets | All held out: T-FIS-1 (rarity, size), T-FIS-2 (antecedents), T-FIS-3 (post-split killing rate), T-FIS-4 (former associates as victims). |
| Validation data | Sandel et al. 2026 Dryad package (CC0): yearly networks 1998–2022, group labels, quarterly patrol counts (§9). |
| Files | New `src/sim/fission.ts`; `parties.ts` (15-min association), `tick.ts` (monthly), `candidates.ts` (bond-weighted joining), `hierarchy.ts`, `generation.ts` (colors and emblems for new communities), `types.ts` (no change needed: new troops are appended). The UI must handle more than 3 communities (UI owner). |
| Cost | Association increments ~1 ms/day; monthly detection < 5 ms for n ≤ 80. The real cost is community size: fission needs a community of ~60+ with 15+ males, so the 120 cap and the 0.72–0.88 s/day at 120 living must improve first (spatial grids from C5a). |
| Risks | **High.** Emergence may never happen in 40-year runs; thresholds are arbitrary; two field cases cannot calibrate a rate. If fission fails to emerge, report the negative result rather than tuning on held-out targets. |

### 5.5 O7: Long-term spatial memory of food

| Aspect | Design |
| --- | --- |
| Data | Per chimp in `chimp.sim`: `treeMem`, a flat `number[]` of up to K = 96 entries × 5 fields (tree id, last seen, last crop, largest crop seen, last visit). `phen`: 9 species × 2 numbers (last time ripe fruit was seen, smoothed share of conspecific trees seen ripe). The 72 h tree lifetime ends; the short-term `memory` list keeps chimps, prey and water. |
| Acquisition | Trees seen within sight (35 m field) are written to `treeMem`. Founders start with their community's major trees inside their UD (females weighted to their core). Infants copy entries from their mother when feeding with her. Immigrants start nearly empty. |
| Expectation | For a remembered tree: if seen within ~5 days (revisit intervals 2.5–5.4 d, T-FOOD-6), expected crop = last crop recovering toward the species' current availability; otherwise the species belief × the tree's largest crop × a synchrony factor (64% of Kibale species fruit synchronously, P-FOOD-2; after the first ripe tree of a species is found, conspecifics are worth inspecting, [janmaat2013b]). Memory window 2 months to 3 years (P-FOOD-4). |
| Choice | `travel` candidates to the top 3 remembered trees by marginal gain `E·q / (1 + d/d0) − c·d`, plus `inspect` candidates for synchronous species with unknown state. Choosing a target before moving gives goal-directed travel and a nearest-tree share well below 1 (T-FOOD-5). |
| Kinematics | Slow down over the last ~50 m of an approach (T-FOOD-9, [normandBoesch2009]); faster approach to high-value figs. |
| Breakfast | Evening nest choice prefers trees near tomorrow's best expected target; far targets and scarcity bring earlier departure (T-FOOD-10, [janmaat2014]). |
| Parameters | K (design; real chimps remember far more trees, labelled stylization), `d0`, `c`, synchrony gain, inspection bonus. |
| Targets | Fitted: T-ACT-1, T-FOOD-2. Held out: T-FOOD-4..10. |
| Files | New `src/sim/foodmemory.ts`; `perception.ts` (write memory, species beliefs), `candidates.ts` (travel and inspect targets, nest choice), `execution.ts` (approach slowdown), `generation.ts` (initial knowledge), `life.ts` (infant copying), `state.ts`. |
| Cost | ~3,000 decisions/day × 96 entries ≈ 0.3 M evaluations/day: ~5–15 ms/day. Storage ~0.4 MB of JSON at 120 living (flag for C2 persistence). |
| Risks | Memory makes feeding faster, which may lower feeding share; intake rates are recalibrated with T-ACT-1. O7 alone will not fix activity budgets (finding 1). |

### 5.6 O8: Real ecology (phenology, fallback foods, prey)

| Aspect | Design |
| --- | --- |
| Phenology forcing | `scripts/ingest-phenology.ts` turns the Ngogo 1998–2017 (CC0) and Kanyawara 1998–2013 (CC BY 4.0) datasets into `data/phenology/*.json`: per-species monthly ripe share and a year series (§9). The sim draws a starting year once per world and steps through observed years in order, resampling blocks with `world.rng` at year boundaries after the record ends. Inter-annual variability therefore comes from data (T-FOOD-1: between-year CV ~0.25). |
| Species mapping | The 9 sim species come from the Ngogo column of Potts et al. 2009 (research.md §1). Which of them are among the 20 species monitored in the Ngogo dataset is not yet checked (the files were not downloaded); unmatched species use the mean curve of their functional class (HFA, aLFA, sLFA) and are flagged. |
| Per tree | Phase offset within species from a hash (spread fitted so the within-species synchrony matches P-FOOD-2); figs keep asynchronous per-tree cycles with ~72% of months in fruit (P-FOOD-3); crop scales with crown class. |
| Fallback | A 100 m forage-field grid with leaf and pith yield by habitat (low, never exhausted, seasonal young leaves); site profile decides the fallback type (Ngogo: leaves such as *Pterygota* saplings; Kanyawara: pith), [watts2012b] [wrangham1998]. Chimps switch when fruit is scarce (T-FOOD-3 held out). |
| Prey population | Red colobus groups at 2.04–2.92 groups/km², ~42 per group at start (P-HUN-1). Per group: monthly births and deaths with density dependence (r_max 0.05–0.10 per year, design [L]; no verified colobus vital rates were found), group split above ~60, loss below 4, rare immigration from the map edge. |
| Hunt decision | Replace hunting days. On detecting colobus within 100 m in daylight, adult males roll a hunt impulse with `logit P = β0 + ln(OR_m)·(m − 3) + β_e·(energy − 0.5) + β_c·brokenCanopy + β_s·swollen + β_i·impactHunter + β_b·meat3d`. `OR_m` is not fixed: T-HUN-4 is held out. Energy (via fruit) produces T-HUN-5; the recent-meat term (design [L], a hypothesis) is one candidate for bursts (T-HUN-6). Habitat and swollen-female terms from P-HUN-3, P-HUN-4. |
| Success and captures | Success logistic in hunters and canopy type; captures per success 1 + Poisson(λ·(hunters − 2)), capped by the group's immature share. |
| Parameters | β0 (fitted to T-HUN-3 and T-HUN-1), success intercept (T-HUN-2), λ (T-HUN-7), prey vital rates (priors only), fallback yields (T-FOOD-2). |
| Targets | Fitted: T-FOOD-1, T-FOOD-2, T-FOOD-11, T-HUN-1, -2, -3, -7. Held out: T-FOOD-3, T-PTY-2, T-HUN-4, -5, -6, -8, -9, -10. |
| Files | New `src/sim/phenology.ts`, `data/phenology/*.json`, `scripts/ingest-phenology.ts`; `environment.ts`, `generation.ts` (patches, forage field), `execution.ts` (fallback feeding, captures), `ecology.ts` (colobus demography, hunt resolution), `candidates.ts` (hunt from impulse), `perception.ts` (100 m prey detection), `tick.ts` (remove `huntingDays`). |
| Cost | Colobus groups 20–60: ~1 ms/day. Forage lookups negligible. |
| Risks | Dryad files need a web login to download (a human step). No verified colobus vital rates: the prey decline scenario (T-HUN-10) tests direction, not rate. |

### 5.7 O9: Demography and health

| Aspect | Design |
| --- | --- |
| Hazard decomposition | `h = h_base(age, sex) + h_disease + h_snare` plus emergent violence, infanticide and starvation. `h_base` is re-fitted so the total matches the Ngogo life table (T-DEM-1, -2) given the emergent causes; cause shares stay held out (T-DEM-4). Avoids double counting deaths inside a fitted all-cause hazard (research.md §8). |
| Epidemics | Arrival: a Poisson draw per community per day with rate fitted to T-DEM-5 (~0.1 per year). Spread: SIR through party co-membership at the party cadence, transmission fitted so attack rates fall in 0.4–0.9 and R0 in 1.27–1.83 (T-DEM-6, P-DEM-1). Sick chimps rest more, travel less and cough (a call for the audio layer). Death risk per case by age, with infants and ages ≥ 30 raised (odds ratios 5.0 and 3.9 as priors; the resulting age pattern T-DEM-7 is still checked). |
| Snares | A snare-risk grid, higher toward map edges (park boundary proxy, design). Hazard per km of ground travel in risky cells; injury is a permanent limb disability (slower climbing and feeding) with a small death risk (Ngogo reports no known snare deaths). Fitted to T-DEM-9 (10–30%). |
| Fertility | Replace the flat fecundity plateau with a per-cycle conception curve by age, multiplied by body condition, fitted to T-DEM-10 (peak 0.15–0.25 births per female-year at 20–30 y; none after ~50) and T-DEM-11, T-DEM-12. |
| Rank effects | No direct rank bonus. Higher-ranking females get better cores through the queue; cores with more food raise energy balance, which raises conception and infant survival. T-DEM-14 is held out. |
| Maternal care | Orphan outcomes come from mechanisms: losing the mother cuts feeding tolerance, social integration and coalition support, which delays rank and first paternity (T-DEM-15 held out). The flat orphan hazard is replaced by energy and protection effects. |
| Two clocks | At `ageRate` 365 behavior runs 365× slower than biology, so behavior-driven demography (rank via food, epidemics, maternal effects) is distorted. **Demographic validation uses natural aging:** 40-year runs, 5 seeds in parallel (~25–60 min each at 0.13–0.3 s/day). Life-course mode stays a demonstration. |
| Population cap | The 120-living cap blocks conception and biases fertility. Validation runs either stay under 90% of the cap (fertility measured only then) or use a raised cap once C5a grids make 150+ affordable. |
| Files | New `src/sim/disease.ts`; `life.ts` (hazards, causes, orphans), `reproduction.ts` (fertility curve, condition), `candidates.ts` and `execution.ts` (sick and injured behavior), `territory.ts` (snare grid), `state.ts`, `types.ts` (optional `sick?`, `snareInjury?` on Chimp). |
| Cost | Epidemics only during outbreaks; otherwise negligible. |
| Risks | Rare events (outbreaks ~1 per decade) need long runs for stable statistics; cause-of-death shares are sensitive to the unknown-cause fraction in field data (25–40% unknown at Gombe). |

### 5.8 O10: Communication

| Aspect | Design |
| --- | --- |
| Signatures | Per chimp: pant-hoot feature vector `s_i = c_k + δ_i` (community mean plus individual offset) of ~6 features (build-up duration, climax peak frequency, element count, inter-element interval, let-down presence, overall duration). Each call: `x = s_i + context shift + ε`. The variances are fitted so leave-one-out discriminant accuracy is 2–4× chance for identity and ~1.3× for community (T-COM-5; [desai2022], [eleuteri2025]). Drums: hits per bout (eastern median 4), inter-hit intervals alternating short and long (mean ~229 ms), weak individual offsets, males only (T-COM-6). |
| Hearing | Listeners recognize a caller with a probability that falls with distance and rises with familiarity, using the same noisy features. `heardN` counts callers the listener can tell apart, not true ids. |
| Calling rules | Pant-hoot probability rises with rank and males in party and falls where territory pressure is high (T-COM-2, -3 held out); arrival calls at unoccupied trees depend on a high-ranking male being present (T-COM-9 held out). Food-call probability ~0.5 per fruit-feeding event, rising with crop size and with an important partner nearby (T-COM-8). Drumming odds fall with party size (T-COM-7 held out). |
| Gestures | A core subset of the 66 Sonso gesture types [hobaiterByrne2011], chosen and transcribed in C10 with their meanings [hobaiterByrne2014], used as requests before social actions (groom, play, travel together, stop). Recorded as interactions; they raise the chance the partner accepts. Individual repertoires grow with use, so juveniles have more types than adults (T-COM-10). |
| Audio | `Call` gets an optional `features?: number[]`; the audio layer (A1 owner) maps features to pitch and tempo so each chimp sounds like itself. |
| Targets | Fitted: T-COM-1, -5, -6, -8, -10, -11. Held out: T-COM-2, -3, -4, -7, -9. |
| Files | New `src/sim/signals.ts`; `events.ts` (`emitCall` features), `perception.ts` (`hear` recognition), `candidates.ts` (calling and gesture rules), `execution.ts`, `types.ts` (optional `Call.features`, `Interaction.gesture`). |
| Cost | Negligible. |
| Risks | Low for the simulation; moderate for coordination with audio. Gestures add little calibration value and can be cut if time is short. |

---

## 6. O11 validation targets

O11 (tension and memory digests) is being implemented in parallel. These targets validate it; none is used to tune it.

| Target | Test |
| --- | --- |
| T-SOC-1 bond persistence | 10-year natural-aging run: each adult male's longest strong-bond run (proximity index above the 97.5% randomization tail) averages 4–10 years; bond in year *t* predicts *t*+1. |
| T-SOC-2 non-kin bonds | ≥ 55% of males' longest bonds are with non-maternal kin. |
| T-SOC-3 reciprocity | Grooming given on received slope 0.45–0.80. |
| T-SOC-9 reconciliation | Corrected conciliatory tendency 0.08–0.22 (fitted; today's 17% uses an uncorrected ratio, so recompute with the observer's post-conflict/matched-control method). |
| T-SOC-10 third-party affiliation | 0.10–0.30 of conflicts, more often toward the aggressor. |
| T-SOC-12 components | Principal components of dyadic tallies (grooming, support, aggression, tension, reconciliation) separate value from compatibility; kin score higher on both; longer co-residence raises value and compatibility. Captive source, qualitative. |
| T-SOC-13 long-term recognition | Unit test: a former partner separated for 26 simulated years (transfer or fission) is still present in yearly digests; digests stay bounded (size cap) over a 60-year life. |
| T-FIS-4 | After a fission, former close associates can become victims: bonds do not block intergroup aggression. |
| T-HUN-9 | Meat goes to bond partners about 1.8× as often as to others present. |

---

## 7. Calibration and validation pipeline (O12)

### 7.1 Principle

A model is credible when one parameter set reproduces several patterns at different levels at once (individual budgets, party structure, community ranging, population demography) [grimm2005]. Targets were split into fitted and held-out sets **before** any tuning (§2). Held-out targets never enter priors, distances, or tuning decisions. The model is documented with ODD [grimm2020] (the 2006 and 2010 versions [grimm2006] [grimm2010] are superseded) in a new `docs/odd.md`, with patterns stated as "qualitative but testable" with a reproducible match rule, as the 2020 update asks.

### 7.2 Steps

Assumptions: field profile at ~0.25 s per eco-day with the observer; 8 effective workers (6 performance + 6 efficiency cores on the M3 Pro); screening runs are 1 natural-aging year (~90 s), fitting runs 2 years (~180 s).

| Step | Method | Runs | Wall time |
| --- | --- | --- | --- |
| 0. Noise floor | Default parameters, 20 seeds, observer on. Gives the stochastic variance of each fitted statistic. | 20 | ~10 min |
| 1. Screening | Morris elementary effects, r = 20 trajectories chosen for spread from ~500 candidates, 4 levels, k ≈ 40 calibratable parameters; rank by μ\* and σ [morris1991] [campolongo2007]. Parameters with μ\* below 5% of the maximum on every fitted statistic are frozen. ten Broeke et al. recommend also running one-at-a-time sweeps first to see response shape and tipping points [tenBroeke2016]. | r(k+1) ≈ 820 | ~3 h |
| 2. History matching | Waves of maximin Latin hypercube designs over the space not yet ruled out; one Gaussian-process emulator per fitted statistic; rule out points with maximum implausibility I > 3 in waves 1–3, then second- and third-maximum tests [vernon2010] [andrianakis2015]. I = \|z − E[f(x)]\| / √(Var_emulator + Var_observation + Var_discrepancy). | 3–4 waves × 250 | ~6–8 h |
| 3. Posterior | ABC rejection inside the final non-implausible region using the emulators, then local-linear regression adjustment [beaumont2002]; confirm the accepted region with direct runs. Distance = sum of squared standardized differences over fitted statistics, each scaled by √(Var_obs + Var_sim) [vanderVaart2015]. | 500 direct | ~3 h |
| 4. Global sensitivity | Sobol first-order and total indices on the reduced set, computed on the emulators (no extra simulation) [saltelli2010]. | emulator only | minutes |
| 5. Held-out validation | Posterior predictive: 50 posterior draws × 5 seeds, observer on. For each held-out target: predictive median, 90% interval, coverage, standardized error; coverage and cross-validation as in [vanderVaart2015]. | 250 | ~2 h |
| 5b. Demography | Natural-aging 40-year runs for demographic parameters and targets: ~60 runs to fit the few demographic parameters, then 10 posterior draws × 5 seeds. | ~110 | ~2 nights |

Total: about two nights for behavior (steps 0–5) and two for demography. The bench budget (≤ 0.3 s per eco-day) is what keeps this feasible; at 0.8 s it would take ~3× longer.

### 7.3 Summary statistics and uncertainty

- Each fitted target contributes one statistic (distribution targets contribute 3–5 quantiles).
- Field uncertainty: the reported SE or CI when available; for an inter-site range, the range is treated as ±2 SD; for a single value without error, a CV of 20% (recorded per target).
- Model discrepancy: the landscape is synthetic and the communities are smaller than Ngogo or Kanyawara, so every site-specific statistic carries a discrepancy variance (default 10% of the target value squared; more for rates that differ strongly among Kibale sites, such as hunting). This stops the fit from chasing one site.
- Encoded targets are fitted like any other but are excluded from validation claims.

### 7.4 Scripts to add

| Script | Purpose | Stage |
| --- | --- | --- |
| `scripts/lib/pool.ts` | `node:worker_threads` pool for `{seed, params, profile, days, observerCfg}` jobs | C3 |
| `scripts/field-metrics.ts` | Observer-based target table for one parameter set (≥ 5 seeds), JSON output | C3 |
| `scripts/scenario.ts` | Named scenarios: `expansion`, `prey-ngogo`, `prey-kanyawara`, `large-community` | C6–C9 |
| `scripts/ingest-phenology.ts` | Data files to `data/phenology/*.json` | C5a |
| `scripts/gen-params.ts` | Registry JSON to `src/sim/params.gen.ts`, `--check` for drift | C4 |
| `scripts/lib/design.ts` | Latin hypercube, Morris trajectories, Sobol sequences | C11 |
| `scripts/lib/gp.ts` | Gaussian-process emulator (squared-exponential kernel, Cholesky, maximum-likelihood length scales) for ≤ 2,000 points | C11 |
| `scripts/sa-morris.ts` | Screening; writes `artifacts/calibration/<run>/morris.json` | C11 |
| `scripts/calibrate.ts` | History-matching waves and ABC; writes the posterior | C11 |
| `scripts/validate.ts` | Posterior predictive on held-out targets; writes `artifacts/validation/<date>/report.md` and `.json` | C11 |

### 7.5 Report format

`artifacts/validation/<date>/report.md`:

1. **Manifest:** content hash of `src/sim` and `src/field`, registry hash, profile, seeds, run lengths, observer config.
2. **Fitted targets:** field value and uncertainty, simulated predictive median and 90% interval, standardized error, in band (yes/no).
3. **Held-out targets:** same columns. The headline number is held-out coverage, with encoded targets listed separately.
4. **Parameters:** prior range, posterior median and 90% interval, Morris μ\*, Sobol total index; flag posteriors piled against a range edge.
5. **Observation bias:** observed vs truth for each metric.
6. **Off target:** what remains outside its band, with the suspected mechanism.

---

## 8. Stage plan (C3–C11)

Stage ids match `IMPLEMENTATION_PLAN.md`. **Recommended execution order:** C3 → C4 → C5a → C6 → C7 → C8 → C10 → C11 → C9, with C5b (renderer) in parallel with C6–C8. "Held out (reported)" rows are evidence, not gates: a stage never tunes to pass them.

Validation run conventions: "5 seeds" = 48, 7, 21, 5, 11; field profile unless stated; 180-day burn-in before measuring; all numbers from `scripts/field-metrics.ts` through the observer.

### Stage C3: Virtual field observer and target harness (O1)
**Goal**: `src/field/` observer, metric functions for every target whose mechanism exists, `data/targets.json` scoring, worker pool, and a baseline scorecard of today's model.
**Success Criteria**:
- Every metric in simulation.md §18 is produced by the observer with its protocol stated.
- Every target whose mechanism exists today is scored; the rest print "n/a (mechanism missing)".
- A run with the observer deep-equals a run without it; `world.rng` identical; records byte-identical on rerun.
- Observer overhead ≤ 5% of `scripts/bench-sim.ts`.
- Activity shares from 1-min point samples within ±0.02 of truth for the same focal-hours; patrol classifier precision and recall ≥ 0.8 against truth.
- 5 seeds × 365 days completes in ≤ 1.5× the wall time of one seed.
**Tests**: `tests/field-observer.test.ts` (read-only, RNG isolation, determinism, category mapping for all 30 actions, classifiers on constructed scenes); `tests/field-metrics.test.ts` (each metric against hand-computed fixtures: kernel isopleths on synthetic points, conciliatory tendency, discriminant accuracy on synthetic features).
**Proof**: `pnpm exec tsx scripts/field-metrics.ts --profile compressed --days 365 --seeds 48,7,21,5,11 --json artifacts/validation/c3-baseline.json`. Expected baseline failures: T-IGE-1, T-IGE-2, T-ACT-2, T-ACT-3, T-HUN-2, T-HUN-7, T-PAT-1. Bench with and without the observer.
**Effort / risk**: M (3–5 days). Low risk.
**Status**: Not Started

#### C3 review (29 September 2026)

Independent review of the observer as the proof instrument. **Verdict: pass with fixes.** Scorecard: `artifacts/validation/c3-scorecard.md` (pre-review version kept as `c3-scorecard-prereview.md`). Every change is logged in `data/targets.json` `protocolLog`; the protocol is frozen as `protocolFreeze` (hash printed by `scripts/field-metrics.ts --protocol-hash`).

**Verified by rerunning:**
- Read-only and RNG isolation over 12-day runs at `ageRate` 365 (50 births, 23 deaths, 5 transfers) and 1, with experiments every 3 days: worlds deep-equal.
- Records byte-identical in-process and in a worker.
- Activity shares within 0.001 of per-tick truth. This checks sampling error only: points and truth use the same category mapping.
- Patrol classifier precision 0.89, recall 0.85 against patrol interactions (162 episodes).
- Observer CPU 4.2–4.5% of `tickWorld` in year runs (7.4% in a 3-day bench with truth series on, 4.8% with them off).
- Pool ratio 1.78 on a machine at load ~21 (the ≤ 1.5 criterion holds only on an idle machine).
- The 2-minute cadence was checked against full 1-minute capture (3 seeds × 60 days): differences within Poisson noise.

**Corrections to this design:**
- §3.5 misstated the encounter rule. Wilson et al. 2012 (p. 281) scored acoustic encounters as foreign calls heard "with or without vocal response", with responses scored within 1 h. The observer now follows the source. This changes nothing today: the followed focal was within 36 m of a stranger long call once in 40 days.
- The patrol classifier cannot use the field definition's listening stops, because the simulation's patrols never stop. Only 0.004 per week of classified patrols have ≥ 2 stops. This is a **model** gap for C6, not a classifier choice. The classifier's precision also relies on travel being rare (5% of daylight). Re-validate it against truth whenever travel changes (C7).

**Metric fixes** (source text or bug; flagged `protocolRevisedPostHoc`, before and after values in the log):

| Target | Fix | Before → after |
| --- | --- | --- |
| T-IGE-4 | Playback windows from the source: counter-call (pant-hoot, waa-bark or scream) within 5 min, approach within 20 min, calm parties only. The implementer's post-hoc change from 60 to 10 min was outcome-driven; this replaces it. | pass → **fail**: 3+-male parties counter-call within 5 min in only 38% of trials (field 12/13). The sim responds in minutes, the field in seconds. |
| T-COM-11 | Alert hoos counted per individual encounter (crockford2012). Before, any alarm-hoo anywhere in the world counted. | 0.91 → 0.31 |
| T-DEM-11 | Only mothers known to be nulliparous count. Before, founders with unknown earlier births counted. | 18.4 y → insufficient |
| T-LET-1, -2, -3 | Violent disappearances count only as "suspected"; T-LET-3 uses observed killings only. | no killings |
| T-SOC-3 | Adult-male dyads only. The estimator is still approximate (the source fits an LMM on log durations). | 0.91 → 0.90 |
| T-SOC-5 | Steepness from agonistic interactions only; the version with pant-grunts is kept as a part. | 0.98 → 0.95 |
| T-SOC-9, T-SOC-10 | Post-conflict affiliation and matched controls count only when a team saw them (before, they were read omnisciently). | 0.11 → 0.11; 0.30 → 0.29 |

**Scoring fixes:**
- Lengths and areas under the compressed profile get the verdict `scale`: reported, not scored until C5a (T-RNG-1, -2, -4, T-FOOD-7, -11). The ×50 conversion does not scale walking speed, sight or party links, so a pass or fail there carries no information. This withdraws the held-out T-RNG-2 pass.
- A pass or fail whose 95% interval over seeds crosses a band edge is `inconclusive`. Before this rule, 8 of 14 held-out passes sat inside seed noise.

**Protocol rule (adopted):**
1. Protocol parameters come from the source's methods text, or from validating the instrument against truth. They are never set by looking at a field verdict.
2. Every change is logged with its reason, the results already seen, and the verdicts before and after.
3. A held-out target touched after its value was seen is `compromised` (reported, never counted as validation) unless the change is a bug fix or follows the source text **and** was made before the freeze. After the freeze, any change that touches a held-out target compromises it.
4. Fitted targets changed post hoc without such a reason revert to the source value.

No target is compromised today. The implementer's only outcome-driven change (T-IGE-4) was on a fitted, encoded target and was reverted to the source. Held-out verdicts moved only toward weaker claims:
- One held-out verdict flipped because of a protocol fix: T-IGE-5 moved from 0.598 to 0.624, across its 0.6 band edge, when heard encounters were added. It is inconclusive under the seed-interval rule.
- T-RNG-2 is withdrawn under the `scale` rule.
- Seven other held-out passes and one held-out fail became inconclusive under the seed-interval rule.

**Effort semantics:**
- The observer's rate, from one team following one focal per community, is the primary field comparison. Truth diagnoses mechanisms. Report both, with the detection ratio.
- The observer logs ~3,100 follow-hours per community-year against Kanyawara's ~2,340 (35,083 h in 15 y).
- Per 100 follow-hours, encounters are 0.33 (Kanyawara 0.34) and hunts 0.26 (≈ 0.29). Colobus encounters are 45 against 3.7, so the T-HUN-3 denominator is inflated about 12× by prey density on the compressed map.
- The T-IGE-1 value is a coincidence of two errors: 8.6 seen encounters per year (Kanyawara 1.2) and 1.7 heard (Kanyawara 6.8). Read it together with T-IGE-2.
- Kanyawara followed parties and stayed with the larger subgroup when parties split; Ngogo followed male parties. The observer rotates individual focals, half of them female. This lowers the detection of patrols, encounters and hunts: patrols are 0.42 per male-follow week against 0.20 overall.

**For C4 and C5a:**
- Before any calibration, decide and log whether effort-dependent rates (T-IGE-1, T-HUN-1, T-PAT-1) are scored per follow-day or per follow-hour at the source's effort.
- Add a party-follow mode (Kanyawara: larger subgroup; Ngogo: male parties) and pick one per target source.
- Re-validate the patrol and encounter classifiers against truth at field scale.
- Run ≥ 10 seeds where verdicts are inconclusive.
- Score the `scale` rows once C5a runs in logical metres.

### Stage C4: Parameter registry (O2)
**Goal**: `data/params.json`, generated `params.gen.ts`, `paramsOf(world)`, `createWorld(seed, {profile, params})`, all simulation.md §17 constants migrated.
**Success Criteria**:
- 100% of §17 rows map to registry ids; the lint finds no evidence-tagged literal without an id.
- Golden hashes identical for seeds 48, 7, 21 at `ageRate` 1 and 365.
- Wiring test passes for 10 hashed parameters.
- Bench median within ±3% of before.
- C3 baseline scorecard unchanged byte for byte.
- Every P-* constraint in §2 is attached to its registry entry as `sources` and `range`.
**Tests**: `tests/sim-params.test.ts` (validity, drift, golden, wiring, coverage, hard-range rejection).
**Proof**: golden test output before and after each module; bench before and after; `scripts/gen-params.ts --check`; empty scorecard diff.
**Effort / risk**: M (3–4 days). Low risk, but touches every sim file: must not overlap with other `src/sim` owners.
**Status**: Complete (2026-09-29).
**Results**:
- Registry: `data/params.json` holds 505 entries: 494 live and 11 planned (P-* constraints whose mechanisms arrive in C5a–C8). Evidence: 2 H, 84 M, 7 L, 24 stylized, 377 design assumption. 15 entries are marked `calibrate` with priors. The field profile sets 5 values (`sightDayM` 35, `partyLinkM` 50, `walkMps` 0.35, `hearPantHootM` and `hearDrumM` 1,000 m). `memTtlTreeH` is flagged `outOfRange`: its compressed value lies outside the plausible range. All 19 P-* constraints are attached with their sources and range (8 on live entries, 11 on planned ones).
- Runtime: `src/sim/params.gen.ts` is generated by `scripts/gen-params.ts`. `src/sim/params.ts` provides `paramsOf(world)` (cached per world with a last-world fast path), `resolveParams` and `checkOverrides`. `createWorld(seed, {profile, params})` rejects unknown ids, non-finite values, values outside the hard range and fractions for whole-number entries. The `field` profile throws until C5a. A world stores only `world.sim.params = {registry, profile, overrides}`, 69 bytes of a 288 KB default world. Resolved values are never stored. The new `SimState` key makes pre-C4 saves incompatible through the persistence shape check, by design.
- Coverage: all 128 §17 rows name registry ids, including 22 new rows for constants the table lacked. Every live id is read in `src/sim` (overridable ones through resolved parameters, never `DEFAULTS`) and appears in §17. The lint (`gen-params.ts --check`) finds no evidence-tagged literal without an id.
- Golden hashes are identical after every module and at the end: `seed48-rate1-2d` abc2d755861d1aee, `seed48-rate365-3d` 65a4a87a946a5b63, `seed7-rate1-2d` ced4adf3bc0f3ab0, `seed7-rate365-3d` 5eb59b3e4ed1ecf3, `seed21-rate1-2d` d5bf243e98ed5a5b, `seed21-rate365-3d` 5689f6e05ce1bb9b. Longer checks against the pre-C4 code also match: seed 7 over 30 natural days, and seed 21 over 12 life-course years.
- C3: `field-metrics.ts --rescore` of `c3-baseline.json` reproduces `c3-scorecard.md` byte for byte. A fresh 20-day run (seeds 48, 7, `--no-pool`) gives record hashes 1e16c56d184ab276 and e4f2b4210933e056, equal to the pre-C4 run, with identical rows, counts and values.
- Bench, on the same loaded machine: `bench-sim.ts` median 192 against 189 ms per eco-day before (+1.6%). A fresh-process A/B over 4 rounds × 12 days gives median ratios of 1.006–1.028, and 1.021 on best-of-4 days.
- Wiring (deviation from §4.4 item 3): the test picks 10 overridable entries by a fixed hash among those the scenario reads (a natural day, all 7 experiments, another day, plus 3 life-course years). Reads are recorded with `traceParamReads`. Each override must change the world hash, trying +10% first, then the plausible-range ends, then the hard-range ends. +10% suffices for 5 of the 10. The others are rare-event rates and thresholds where +10% flips no draw within days: `hazardInfant` needed 10, `immigrantFollowMaxM` 7.5, `gangImpulseP` 1, `fecundityLateY` 22.5, and `reconcileRepairW` 0.8. Registry-wide, +10% changes the scenario for 275 of 485 overridable entries. Short runs are insensitive to the rest, which matters for C5a+ sensitivity analysis.
- Not migrated: untagged hand-tuned score terms in `candidates.ts`, including 14 distance scales. The lint does not require ids for them. They are listed as a C5a prerequisite.

#### C4 review (29 September 2026)

Independent review. **Verdict: pass with fixes.** Every success criterion holds. One lint gap was fixed; the problems below are about evidence metadata and override hygiene, not about default behavior.

**Verified by rerunning:**
- The pre-C4 copy (scratchpad `prec4/`: no registry, `createWorld(seed)`) recomputes all six fixture hashes. Full canonical world strings, not just hashes, are equal old vs new in the 6 golden cases. They are also equal in 4 more cases: seeds 1 and 99 over 4 natural days, seed 2024 at `ageRate` 365 over 6 days, and seed 5 at 30 over 5 days. Those cases add every experiment on all 3 communities, `stepWorld`, model decisions through `applyDecision`, and 11,025 `observe`/`getEligibleActions`/`rulesChoice` results, all equal.
- A second check that does not depend on `prec4/`: a fresh 365-day × 5-seed field run matches `c3-baseline.json`, which C3 wrote before C4 started. All five record hashes and every row, count and value are identical. The scorecard differs only in its timestamp and timing lines. The `--rescore` byte match also holds, but it never runs the simulation, so on its own it proves nothing about C4.
- `gen-params.ts --check` passes, and a tagged literal injected into a scratch copy of `src/sim` is caught. **Fixed:** the tag regex missed pairings other than `[M-H]` and `[M/L]` (docs already use `[M/H]`), the en dash, and "stylization"/"assumption". It now matches them, with 0 new hits in `src/sim`. The test checks each variant.
- Hard-range, integer and unknown-id rejection work. A world stores 69 bytes of settings.
- 15 spot-checked entries equal the pre-C4 literals.
- Bench: median 187 ms per eco-day. An interleaved A/B against `prec4/` gives a median paired ratio of 0.99–1.07 at load 10–24. That is consistent with +1.6%, but it cannot resolve ±3% on this machine.

**Problems (open):**
- Evidence metadata overclaims:
  - 72 of the 93 H/M/L entries have no source key.
  - Labels were inherited from tags on whole functions. Examples: `fecundityEndY` is M, but the code calls the curve a design curve. `weatherNightFactor` is M for a tuned rate. `coalitionRangeStrangerM` took the coalition docstring's tag.
  - 82 of the 93 H/M/L ranges are ×÷2 rather than taken from sources.
  - 268 of 494 hard ranges are [0, 1e6].
  - The planned P-* entries use ±10% bands, which are not uncertainty intervals.
- Wiring: the ladder approach is sound for plumbing, because any change proves the value is read. But the pool excludes entries that are never read, and the static test needs only one read through `P`. So partial bypasses through exports derived from `DEFAULTS` pass both tests: `RAIN_MM_PER_H` in `src/field/protocols.ts`, `RIVAL_TENSION` in `src/ui/inspector.ts`, and `newX().sight`. The first two are wrong under overrides.
- Registry-wide ladder scan of all 485 overridable entries:
  - 389 change the scenario.
  - 58 are never read in it.
  - 38 are read but have no effect. Three of these (escalation, `powerEloScale`, `consoleRepair`) change the world over 8 days.
  - `hearBarkM`, `hearFoodGruntM`, `hearPantGruntM`, `hearWhimperM` and `hearLaughM` only set `world.calls[].radius`, which is drawn but has no listener logic. They are inert in the simulation and should stay out of calibration.
- `REGISTRY_HASH` is stored per world but never checked. After a registry edit, a save resumes with the new defaults.
- simulation.md §17 says "every constant lives in the registry". It does not: `candidates.ts` still holds hundreds of score literals.

**For C5a:**
- Migrate the 14 score divisors in `candidates.ts` (lines 141, 162, 172, 175, 182, 218, 225, 227, 244, 463, 474, 492, 508, 511), confirmed.
- Also migrate about 38 untagged distance thresholds: candidates 17, execution 16, conflict 3, perception 1 (the snake at 12 m), parties 1. Contact distances of 3 m or less can stay. The 8–30 m social and alert radii are compressed stand-ins that need profile values.
- Use year-scale runs for sensitivity screens.

**Addressed in C5a (step 0):**
- Evidence: 73 entries re-tagged. Unsourced H/M/L became `assumed` (47), `design` (19), `stylized` (2) or `calibrated` (3: the weather factors tuned to annual rainfall); gestation and earliest weaning keep M with a docs/research.md reference (`refs`). `gen-params.ts` now rejects an H/M/L entry without a source key or reference.
- Ranges: every entry has a `rangeBasis`; 559 of 620 are `assumed-x2` (the ÷2..×2 default), 16 `source`, 24 other assumed bands, 9 ±2 h, 8 fixed, 4 `placeholder-pm10` (planned values, not uncertainty). Calibration treats everything but `source` as a weak prior.
- The five render-only hearing radii (`hearBarkM`, `hearFoodGruntM`, `hearPantGruntM`, `hearWhimperM`, `hearLaughM`) carry `calibrationExcluded`.
- Bypasses: `RAIN_MM_PER_H` in `src/field/protocols.ts` now reads `paramsOf(world)`; `newX().sight` no longer copies a default (makeChimp sets it from the world); every `DEFAULTS`-derived export of an overridable entry was removed from `src/sim` (19), and parameter arguments no longer default to `DEFAULT_PARAMS`. `tests/sim-params.test.ts` fails on any `DEFAULTS.<overridable>` or `DEFAULT_PARAMS` read in `src/` or `scripts/`, and checks that the observer's rain doubles with the world's rain rate.
- The ~52 untagged distance terms (14 score divisors, the thresholds in candidates, execution, conflict, perception, parties, ecology and reproduction) are registry entries with compressed values equal to the old literals (golden hashes unchanged) and field values.

### Stage C5: Logical vs visual scale (O3)
**Goal**: C5a: `field` profile in real metres, food patches with lazy fruit, forage field, spatial grids, stream segment grid, phenology ingest. C5b (renderer owner): field window and overview.
**Success Criteria** (C5a, field profile, 5 seeds × 365 days):
- Fitted: T-IGE-1 5–12 per community-year; T-RNG-4 1.5–3.5 km/day; T-ACT-2 0.12–0.25; T-PTY-1 3–9; T-FOOD-11 60–160 m; T-FOOD-1 mean 0.06–0.11.
- Held out (reported): T-IGE-2 (expect 0.70–0.90), T-IGE-3, T-IGE-5, T-ACT-3.
- ≥ 95% of weaned chimps nested at 22:00; wake and settle medians within ±45 min of sunrise and sunset; stream-channel ground time < 0.2%.
- Bench ≤ 0.3 s per eco-day (default world), ≤ 0.8 s at 120 living.
- Compressed-profile golden hashes unchanged.
- C5b: ≥ 60 fps at 1440×900 in both views (`scripts/perf-probe.mjs`); chimps render inside their tree crowns in the field view.
**Tests**: `tests/sim-scale.test.ts` (profile switching; the stream segment grid classifies the compressed map exactly as the old grid; lazy fruit equals eager fruit at sampled times; grid perception equals brute force).
**Proof**: `scripts/field-metrics.ts --profile field --days 365 --seeds 48,7,21,5,11`; `scripts/bench-sim.ts --profile field`; `scripts/visual-scenes.mjs` for both views.
**Effort / risk**: C5a L (5–8 days), C5b L (5–10 days). Risk: medium-high (distance-dependent score terms; renderer terrain rework).
**Prerequisites (C3 review; see §4.5 "For C4 and C5a")**:
- Before any calibration, decide how to normalize effort, and log the decision: score effort-dependent rates (T-IGE-1, T-HUN-1, T-PAT-1) per follow-day or per follow-hour at the source's effort.
- Add a party-follow observer mode (Kanyawara: stay with the larger subgroup; Ngogo: follow male parties), and pick one mode per target source.
- Re-check the patrol and encounter classifiers against truth at field scale. They were validated on the compressed map.
- Run ≥ 10 seeds wherever a verdict is inconclusive at 5.
- Calibration moves registry entries only through `createWorld(seed, {params})` overrides. In short runs, 210 of 485 entries have no effect at +10% (C4 wiring scan), so sensitivity screens need year-scale runs.
- Migrate the untagged distance scales in the `candidates.ts` score terms (14 literals such as `d / 35`, `d / 55`, `d / 80`, `dist / 60`) into the registry with both profile values. The C4 lint covers only evidence-tagged lines, so it does not flag them (risk in §5.1).
**Status**: C5a Complete (2026-09-29), pending review; C5b implemented (2026-09-29): field window and whole-map overview, animals render in their crowns (20/20 by day, 27/27 at night over 8 windows), compressed map unchanged; the ≥ 60 fps proof is pending an idle GPU (the machine's GPU was saturated by other applications; field ≥ compressed in paired runs). Record and deviations: docs/graphics-camera-plan.md §9.
**C5a results** (scorecard: `artifacts/validation/c5a-scorecard.md`; mechanisms: docs/simulation.md §22):
- Built: `createWorld(seed, {profile: 'field'})` in real metres (8 km map; stream segment grid; ~43,000 lazy food patches; phenology record with a labelled synthetic fallback and `scripts/ingest-phenology.ts` for the Kibale files; forage field; 64 m tree grid and a 50 m chimp grid). 141 registry entries have field values; field-only mechanisms are gated by entries that are 0 in the compressed profile. Compressed golden hashes are unchanged throughout.
- Deviations from §5.1, each a registry value: community centres are the layout × 31.75 rather than × 50, so neighbouring ranges meet (at × 50 they lay 1.3 km apart and encounters were ~0; T-IGE-1 is steep in this spacing: × 31 gave 14 observed per year, × 32 gave 3 over 60 days). Patch density is 18 per ha in ranges (fitted to T-FOOD-11; the ~3,000 patches of §5.1 would give ~900 m per fruiting tree). Three party-cohesion mechanisms (following a departing companion, a cost of leaving companions, contact pant-hoots and social joining) were needed: without them mean party size was 1.5–2.
- Fitted criteria, 10 seeds × 365 days (5-seed verdicts in parentheses): T-RNG-4 1.69 km/day pass (pass); T-ACT-2 0.17 pass (pass); T-PTY-1 4.49 pass (pass); T-FOOD-11 125 m pass (pass); T-FOOD-1 0.08 pass (pass); T-IGE-1 10.4 per community-year inconclusive (12.4, inconclusive): per-seed values run from 3.7 to 25.8.
- Held out: T-IGE-2 0.99 fail (no visual encounters: parties rarely come within the 35 m sight of strangers); T-IGE-3 0.88 inconclusive; T-IGE-5 0.61 inconclusive (0.48 fail at 5 seeds); T-ACT-3 0.14 pass.
- Nesting 1.00 at 22:00; leaving the nest 1.8 min before sunrise and settling 34 min before sunset (medians); no ground time in the channel.
- Lost passes against the C3 baseline: T-FOOD-2 (fruit share 0.89, band 0.60–0.78) and T-HUN-1 (1.3 hunts per community-year; hunting days and prey at field density; C7), T-HUN-4 (now inconclusive), T-COM-7 and T-COM-11 (drumming context, snake alarms).
- Carry-overs from the C3 review: effort normalization decided and logged before calibration (T-IGE-1 per follow-hour at Kanyawara's 2,339 h per year; T-HUN-1 and T-PAT-1 stay per day); party-follow mode added (larger subgroup; male parties available) and used for T-IGE-1, T-PTY-1 and T-HUN-1 only, because a post-freeze change would compromise held-out targets; classifiers re-checked at field scale: activity sampling max |Δ| ≤ 0.0007, patrol precision 0.56 and recall 0.89 (compressed 0.89 / 0.85), encounter classifier recall 0.56 and precision 1.00 against truth episodes of followed parties, detection 0.36 of all truth episodes (compressed 0.52 / 0.98 / 0.34), hunts 44 of 69 detected; 10 seeds run for every criterion. Protocol re-frozen at C5a (e32903a5319deff5) with five protocolLog entries; on the compressed profile the change moves only T-IGE-1 (10.33 → 6.56), T-PTY-1 (7.65 → 9.14) and T-HUN-1 (8.20 → 8.07).
- Bench, under load 9–12: default world 330 ms per eco-day (criterion 300), 1.2 × the compressed profile in the same minutes (~0.16–0.23 s at the compressed idle speed); 120 living 1.2–1.8 s (criterion 0.8 s), 1.02 × compressed. Not met as measured.
- Open for review: T-IGE-1's seed-to-seed spread; T-IGE-2 (held-out) shows that encounters are almost all heard; patrol classifier precision falls at field scale; the observer now costs 10–14% of the simulation (two team sets).

#### C5a review (29 September 2026)

Independent review. **Verdict: pass with fixes.** The field profile, the proof numbers and the compressed goldens reproduce exactly. The claim that T-IGE-1 is fitted is withdrawn. Details and numbers: `artifacts/validation/c5a-review.md`. Labels: `data/targets.json` (review protocolLog entry; hash unchanged, e32903a5319deff5). Scorecard with the flags: `artifacts/validation/c5a-field10-review.md`.

**Verified by rerunning:**
- Seed 42 × 365 d gives a record hash identical to the proof.
- Proof seeds × 180 d are consistent with the report: T-RNG-4 1.78, T-ACT-2 0.17, T-PTY-1 4.38, T-FOOD-11 123, T-IGE-1 8.94, T-IGE-2 0.99.
- `pnpm test` passes 223/223 with the C4 golden hashes.
- Compressed profile: 73 of 76 targets are unchanged per seed over 365 d.
- **Fresh seeds (101, 202, 303, 404, 505; 365 d; never used in tuning):**
  - T-ACT-2, T-PTY-1, T-RNG-4 and T-FOOD-1 hold, and T-FOOD-11 is inconclusive at 134.
  - **T-IGE-1 is 1.8 / 2.5 / 24.6 / 2.2 / 4.3**, with no seed inside 5–12.
  - Across 15 seeds, 1 lies in the band. The distribution is bimodal, so the pooled means inside the band are averages of misses.

**Degrees of freedom:**
- **Protocol changes accepted.** Effort normalization per follow-hour matches the source: wilson2012 gives 35,083 h over 5,527 follows and reports rates per 100 h. The party-follow mode matches wilson2012 p. 279 ("stay with the larger subgroup"). The rain fix, the plumbing and the truth bookkeeping are also accepted.
- **Spacing was tuned to the answer.** `centerScale` was chosen by sweeping against T-IGE-1 with every held-out value printed. It then moved from 31.75 to 31.9 after a 10-seed run on the proof seeds.
  - At ×31.9 the nominal ranges are tangent, while used ranges are only 56% of nominal (T-RNG-1 4.5 km², fail; T-RNG-3 0.93).
  - Encounters therefore happen by hearing across about 1 km of unused ground. The spacing fits encounters at the cost of ranging.
- **Cohesion mechanisms are plausible; their weights are tuned.** Joint departure, the cost of leaving companions and contact calls are plausible and honestly labelled design. Their weights were tuned to T-PTY-1, T-ACT-2 and T-RNG-4.
- **Contact-call trigger has conflicting evidence.** "Call when alone" contradicts two sources already in the target list: mitaniNishida1993 (no party-size effect) and wilson2007 (calls rise with males in the party). It has support only in a 2025 Loango study.

**Labels applied:**
- **Tuned:** T-IGE-1, T-PTY-1, T-ACT-2, T-RNG-4 and T-FOOD-11. T-FOOD-1 is a pass by construction (synthetic phenology mean = the target).
- **Compromised:** T-IGE-5, T-PTY-4 and T-SOC-4 (encoded).
- **Not scored, instrument below bar:** T-PAT-1..7 and T-LET-6.
- **Held-out passes that still count:** 5 of 10 (T-FOOD-4, T-FOOD-5, T-SOC-2, T-SOC-12, T-COM-2).

**Instrument findings:**
- **Patrol classifier (precision 0.56).** Most false positives are C5a cohesion travel: `follow` runs of at least 2 silent males reaching the 0.9 isopleth. The simulation's patrols never make listening stops or incursions. Any threshold fitted to separate the two would be circular. Fix it at the C6 freeze with the source criterion (`minStops` 2) once C6 patrols stop to listen.
- **T-IGE-2 (0.99): a model result, not an observer artefact.** Truth gives 126 heard and 1 seen.
  - Parties of different communities never came within 35 m in 76,914 daylight pair-samples.
  - Heard-stranger approaches stop at an unscaled 900-s cap. That cap reaches about 350 m at field speed, against 1,000 m of hearing.
  - Patrols end at the nominal edge.

**Bench:**
- **Default world:** 355–371 ms per eco-day at load 8–13, 1.2–1.7 × the compressed profile in the same minutes. The miss is probably load (moderate confidence); it needs an idle measurement.
- **120 living:** structurally unmet, and the compressed profile misses too. About half of CPU time goes to `decisionPoint` (candidates 33%, reason text 7.6%), then `perceive` 14%, prey movement 5.6% and lazy fruit 5%.

**Before C6:**
1. Scale the 900-s approach cap and audit all distance-implying time caps (implementer; T-IGE-2 is then revised post hoc, never tuned).
2. Re-derive `centerScale` from a rule stated in advance, fit ranging (T-RNG-1, -3) before encounters, and require fitted criteria to hold on fresh seeds.
3. Correct the stale `centerScale` notes (registry "40", the generic "tuned against" stamp, ×31.75 above) and record the model changes made after the 10-seed dev run.
4. Ingest the Kibale phenology before calibrating territories.
5. Make `summarize()` exclude compromised rows, and show `tuned` and `instrumentWarning` in reports; set `encoded` on T-FOOD-1 and T-SOC-4 at the C6 freeze.
6. Bring observer overhead to ≤ 5%.

**C5b may start.** It depends on the field world's structure, not on calibration; it must not bake `centerScale` or patch density.

#### C5a review response: rules stated before running (29 September 2026)

Written before any run with these settings.
- **Centre spacing (`centerScale`, field).** The two neighbouring pairs of nominal ranges (West–North, East–North) are tangent on average: `centerScale = (r_W + r_N + r_E + r_N) / (d_WN + d_EN)`, with the field radii from community size at Kanyawara density (1.6, 1.35, 1.25 km) and the compressed centre distances (83.23, 78.82) = 5,450 / 162.05 = **33.63**. West–North then overlap by 51 m and East–North lie 51 m apart; West–East, not neighbours, 0.9 km apart. No target is consulted; the value is not changed after results. *(C6 review correction: West–East lie 214 m apart, not 0.9 km (94.09 × 33.63 − 2,950 m); treating West–East as neighbours too would give 32.79, so the choice of pairs is not unique. The premise that nominal circles approximate used ranges no longer holds: used ranges are 0.3–1 km² against 4.9–8 km² nominal.)*
- **Fitting order (C6).** Fit the territory cost to T-RNG-1 and T-RNG-3 first, on the proof seeds, and patrol parameters to T-PAT-1 and T-PAT-6 only after the patrol classifier's source criterion is on and validated. T-IGE-1 is then reported as it falls, never swept. Every fitted target is reported on the proof seeds and on fresh seeds 101, 202, 303, 404, 505; a target fitted on the proof seeds and missed on fresh seeds is reported as not replicated.
- **T-IGE-2** (held-out) is reported as "revised post hoc (model)" after the approach cap fix and is not tuned.

#### C5a review fixes: interim note (29 September 2026)

Approach caps scale with the profile (`approachTimeoutS` 900 → 3,600 s, `mateApproachS` 150 → 240 s). `centerScale` 33.63 by the rule above. Registry notes fixed; `gestationSpanDays` → assumed, `phenologyForcing` → design; `rangeShiftM`, `rangeRadiusStepM` removed with scripted shifts. `summarize()` counts compromised, instrument-flagged and tuned rows separately. Observer overhead 3.2–4.6% with two team sets (was 12–14%). Between the C5a dev run (09:33Z) and proof (10:12Z) only `centerScale` 31.75 → 31.9 and `patchesPerHa` 16 → 18 changed. T-FOOD-1 still passes by construction (no Kibale phenology files).

#### C6 decisions stated before the proof (29 September 2026)

Written after development runs (5 proof seeds × 365 d after a 180-day burn-in, `territoryCostA` 1.0 and 0.6) and diagnostics, before the proof.
- **Territory cost `a` is not fitted.** T-RNG-1 and T-RNG-3 do not respond to it: observer T-RNG-1 4.92 / 4.75 km² and T-RNG-3 0.95 / 0.95 at `a` 1.0 / 0.6, and with the whole territory cost and home pull off (seed 48, 180 d) the simulation's own 95% range and core concentration match the runs with it on. Range size and concentration are set by foraging ecology (food landscape, memory; stage C7). `a` stays at its prior, 1.0. *(C6 review correction: not supported. The a = 1.0 and 0.6 runs straddled the travel-call change, and both estimators used were blind to a 2× change in a 1 km² range; with the honest use record, the cost and home pull together roughly halve the West range in 2 of 3 seeds. See "C6 review fixes".)*
- **Familiarity `f`** now follows the §5.2 text (1 inside the 50% core, 0 at the 99% isopleth); the first implementation used 1 − isopleth level. Found while checking T-RNG-3; it did not move T-RNG-3.
- **Travel pant-hoots** (adult males, 3 per travel-hour; `mitaniNishida1993`) separate silent patrols from ordinary male travel: focal patrol classifier precision 0.45 → 0.83, recall 0.94 → 0.89. T-COM-4 is marked encoded.
- **T-PAT-1 and T-PAT-6** are scored on male-party follows, the Ngogo protocol (revised post hoc, logged). `patrolH0` 0.004/h was set on simulation truth in development (seed 48); T-PAT-1 is labelled tuned. `patrolIncursionP` stays 0.4 (not fitted): the observer's 95% kernel of a neighbour covers 0.2–1.6 km², so leader paths that enter the simulation's 95% isopleth of the neighbour (45–65% of patrols) are not counted. T-PAT-6 is reported with the simulation-truth share from the baseline scenario.
- **Instrument bar** is mechanical: patrol rows count only if their team set's classifier reaches 0.8 / 0.8 in the same run.
- **Stability** is reported against year 1 and against the seeded circle at creation.
- **Proof:** 5 seeds (48, 7, 21, 5, 11) × 10 years natural aging after a 180-day burn-in, 3 workers (memory); fresh seeds 101, 202, 303, 404, 505 × 365 d after the same burn-in for every fitted target; baseline and expansion scenarios, 10 years × 5 seeds, with yearly UD maps.

### Stage C6: Living territories and grounded patrols (O4, O5)
**Goal**: utilization-distribution ranges with danger maps and territory cost; patrol hazard with boundary staleness and incursions; scripted range shifts removed.
**Success Criteria** (5 seeds × 10 years natural aging):
- Fitted: T-RNG-1 5–16 km² (West); T-RNG-3 0.75–0.90; T-PAT-1 0.1–0.5 per week; T-PAT-6 0.40–0.70; T-IGE-1 still 5–12.
- Stability: each community's range area stays within 0.5–2× its start in the baseline.
- Held out (reported): T-RNG-2, T-RNG-6, T-IGE-5, T-PTY-3, T-PAT-2, T-PAT-3, T-PAT-4, T-PAT-5, T-PAT-7, T-LET-1 (fitted, reported here first), T-LET-2, T-LET-6, T-COM-3 (once calls respond to territory pressure).
- Expansion scenario (held out, T-LET-4): expectation is +10–35% range gain toward the losers in ≥ 3 of 5 seeds; reported either way.
- Bench ≤ 0.3 s per eco-day.
**Tests**: `tests/sim-territory.test.ts` extended (UD increments and isopleths on constructed tracks; danger marks after a lost encounter; patrol impulse only for eligible males; incursion geometry stays within the neighbour's range; no `shiftRange` calls remain).
**Proof**: `scripts/field-metrics.ts --years 10`; `scripts/field-scenario.ts expansion --years 10 --seeds 48,7,21,5,11`; yearly UD maps written as PNG under `artifacts/validation/c6/`.
**Effort / risk**: L (5–8 days). Risk: medium (range collapse or drift).
**Status**: Proof run (C6 results below); awaiting review

#### C6 results (29 September 2026)

Proof: 5 seeds × 10 years natural aging after a 180-day burn-in (`artifacts/validation/c6-field10y.{json,md,log}`), fresh seeds 101–505 × 365 days (`c6-fresh.*`), scenarios (`c6/`, yearly UD maps as PNG). Protocol hash `5fcac8ce92cb2cfe` = C6 freeze. Scorecard and comparison with C5a: `artifacts/validation/c6-scorecard.md`. The machine was heavily loaded throughout (load 8–15; training jobs), so timings are not idle measurements.

| Criterion | Proof (10 y) | Fresh seeds (1 y) | Verdict |
| --- | --- | --- | --- |
| T-RNG-1 West range, 5–16 km² | 5.40 (2.75–7.00) | 4.22 (3.25–5.38) | **fail** (C6 review: the 98%-cell polygon is an estimator artifact; the 95% kernel of the same fixes is 4.4–5.7× smaller, ~0.5 km²) |
| T-RNG-3 core concentration, 0.75–0.90 | 0.98 | 0.92 | fail / inconclusive; ecological (C7) |
| T-PAT-1 patrols per week, 0.1–0.5 | 0.20 (truth 0.34) | 0.18 (truth 0.32) | pass values (tuned); proof row flagged instrument below bar |
| T-PAT-6 incursion share, 0.40–0.70 | 0.16 | 0.18 | fail; simulation truth 0.47–0.94 (baseline scenario) |
| T-IGE-1 encounters per year, 5–12 | 8.70 (2.7–19.4) | 7.81 (0.7–22.9) | inconclusive both; reported as it falls |
| Stability 0.5–2× (`troop.range`) | **fail as written** (vs the start: 0 of 5); 4 of 5 vs year 1 (seed 21 West 0.497×) | | measured on the pre-C6b 400 m record, which lagged use |
| T-LET-4 expansion (≥ 3 of 5 seeds) | vs the paired baseline +89 / +6 / +168 / +61 / −1%: **0 of 5 in band** (C6 review; +31 / −36 / +33 / +21 / −44% against year 1) | | **not tested**: 0–1 killings per run, so there were no lethal wins |

- **Ranging is far too local (C12a comparison, `artifacts/compare/scorecard.md`).** Measured from simulated positions (5 seeds × 3 years after the burn-in), the community annual 95% kernel is 0.89 km² (0.66–1.03) and an individual's 0.71 km², against 5–16 km² for a 22-member community; displacement between same-day fixes ≥ 3 h apart is 80 m (Ngogo 660 m), although males walk ~2 km a day. Animals shuttle between nearby patches. T-RNG-1's 98%-of-daily-500 m-cells polygon (the source's method) reads 4–7 km² largely because each visited cell adds 0.25 km², and `troop.range` (400 m kernel, 180-day memory, seeded from the circles) lags and smooths actual use, so the stability check below describes the bookkeeping, not the animals. Range shapes match once normalized (core fraction 0.22 in both). The cause is the food landscape and short-range foraging (dense patches, distance costs, no goal-directed long-distance travel), which is stage C7's scope; the C6 territory cost does not set it.
- **Patrol instrument.** On 1-year runs the classifier clears the bar (focal 0.92 / 0.96, male-party 0.94 / 0.95). Over 10 years precision falls (focal 0.67, male-party 0.78; recall 0.85 / 0.93) as the population grows (49 → 69) and larger male parties travel silently with pauses. By the rule stated before the proof, every patrol row of the proof is reported, not scored.
- **Held out (proof):** T-RNG-2 0.53 inconclusive; T-RNG-6 2.67 pass; T-IGE-5 0.51 (compromised since C5a); T-PTY-3 1.00 fail (periphery parties do not carry more males); T-PAT-2 3.1 per male-year fail, T-PAT-3 0.74 pass, T-PAT-4 fail, T-PAT-5 105 min pass, T-PAT-7 0.04 fail (all instrument-flagged); T-LET-1 0.03 inconclusive (fitted, first report); T-LET-2 0.50 inconclusive; T-LET-6 0 fail (instrument-flagged); T-COM-3 −0.11 pass (quieter periphery); T-IGE-2 0.95 fail (fresh 0.71, inconclusive).
- **Other changes against C5a** (365-day runs are not directly comparable with 10-year runs): T-COM-1 passes (0.69; travel pant-hoots); T-COM-8 food calls 0.24 fails (calls are suppressed near neighbours); T-ACT-1 fails on females (53% feeding); T-PTY-1 6.9 as the population grows.
- **T-FOOD-1** passes by construction (synthetic phenology; no Kibale files).
- **Bench (loaded, re-measure idle):** field 289 ms per eco-day and compressed 324 ms at load ~8 (single process); 120 living 1.08–1.10 s. Hot path (8 field days, CPU profile): `decisionPoint` 41% inclusive, candidate generation 25–29%, `reasonFor` 6%, `perceive` 10%, `movePrey` 6%; territory code < 2%.
- **Observer overhead:** 3.2–4.6% with two team sets (development), 5.6–7.9% with the third (male-party) set on 1-year runs, and 17–30% on 10-year runs, where it grows with population. The ≤ 5% criterion is not met with three team sets.
- **Not done:** lazy reason text. Candidate reasons are stored in the World (saves, golden hashes, the mind panel), so making them lazy changes saved state; queued with the allocation work.

#### C6b: goal-directed foraging and an honest range record (rules stated before running, 29 September 2026)

Response to the C12 comparison (held-out; nothing below is tuned against it). The C6 proof above ran on sim code `98298d24ad4b2365`, the same code the C12 comparison measured. Diagnosis (seed 48, 90-day burn-in, 6 days, 24 adults, 07:00–18:00): 62% of 30-min steps are under 15 m; a new forage tree is a median 15 m away (p90 31 m, i.e. within crown-detection range); 47% of tree changes return to a tree already used that day; remembered trees (a 48-record memory shared with animals and water) supply 26% of the path. Animals feed, rest and feed again in the same few crowns.

Changes (values set here, design unless noted; the deeper fix remains C7's long-term tree memory and real phenology):
1. **Tree memory of its own.** Remembered fruit trees get a separate cap (`memTreeCap` 60 field, 24 compressed); animals and water keep `memoryCap`. Taï chimpanzees travel to out-of-sight trees from a mean 537.5 m [ban2014] and choose the nearest productive tree only 30% of the time [normand2009], which needs more than the last few trees seen.
2. **Harvested crowns are devalued (inhibition of return).** When a feeding bout at a tree ends, the individual notes it; for `revisitTauH` 12 h that tree's forage and travel scores fall by `revisitW` 0.5 × exp(−Δt / 12 h) (the fruit within reach has been taken; design). The last 6 trees are kept.
3. **Range record follows use.** The UD kernel is the reference bandwidth of the community's own current use (Worton 1989, the estimator the observer uses): h = √((var x + var z)/2) · n^(−1/6), with n = `udTauDays` × 22 daylight half-hour fixes, floored at one cell and capped at `udKernelM`; the seed is `udSeedDays` 3 (was 30), so the starting circle is forgotten within weeks.
   *Addendum after the first diagnostic (before any comparison run):* with that kernel also driving behavior, West/East/North ranges shrank to 1.3 / 0.6 / 0.6 km² in 180 days against 2.8 / 0.8 / 1.3 km² with the territory cost and home pull off (seed 48), i.e. a tight record feeds back into contraction. So two maps: **use** (reference bandwidth) for the range record, range edges, incursion depths and periphery visits; **familiarity** (the C6 400 m kernel) for the territory cost, call suppression and the pull home, since animals know more than the places they spent time in.
4. **T-RNG-4** gets parts for 30-min path, nest-to-nest net displacement and straightness (observer, parts only). It is reported as **failed** until trajectories are goal-directed, whatever its value.

Checks, in this order: unit tests; the diagnostic above (direction of change only); the C12 compare scripts (held-out, reported as deltas); field-metrics 5 proof seeds × 365 days after the burn-in for the C6 criteria. The C6 10-year proof and scenarios are not re-run in this pass and describe the pre-C6b model.

#### C6b results (29 September 2026)

- **C12 comparisons (diagnostic, seen: C6b was designed from them; before → after):** ranging verdicts different 12 → 9, similar 6 → 9; community 95% kernel 0.89 → 0.65 km²; same-day displacement 0.08 → 0.14 km (Ngogo 0.66). Movement against Taï: path 72 → 89 m/h (314), straightness 0.23 → 0.25 (0.50), turning 1.94 → 1.52 rad, 30-min step 3.4 → 3.9 m (95), travel share 0.18 → 0.16. Before/after scorecards in `artifacts/validation/c6/compare-before/` and `artifacts/compare*/scorecard.md`.
- **C6 criteria after C6b** (proof seeds × 365 days, protocol `6892380336dcd836`): T-RNG-1 2.35 km² fail; T-RNG-3 0.94 fail; T-PAT-1 0.13 inconclusive (truth 0.24); T-PAT-6 0.17 fail; T-IGE-1 3.19 fail (truth 21.6); T-RNG-4 1.84 km on 5-min fixes, 1.21 km on 30-min fixes, net 0.26 km, straightness 0.24 (reported as failed). Patrol classifier 1.00 / 0.92 (focal) and 0.92 / 0.93 (male parties). Observer 3.8–4.2% of simulation CPU; simulation 0.33–0.36 s per eco-day at load ~5.
- **Reading.** The light mechanism moves animals a little more but does not create km-scale ranging, and the honest record shows ~1 km² per community. Tighter real ranges also cut encounters and patrol staleness. Ranging needs C7 (sparser, species-synchronous food and long-term tree memory); the C6 10-year proof and scenarios describe the pre-C6b model.

#### C6 review fixes (29 September 2026)

The C6 review (`artifacts/validation/c6-review.md`) passed C6 with fixes. Each fix and its outcome:

| # | Finding | Fix | Outcome |
| --- | --- | --- | --- |
| 1 | T-RNG-1 5.40 km² is an estimator artifact (500 m cell hull, decade-pooled) | T-RNG-1 now scores the annual 95% fixed kernel of 30-min fixes (median over years); the cell polygon is the part `cells98` (logged, source methods; C7a freeze) | T-RNG-1 recorded as **fail** in the C6 results; kernel ~0.5 km² |
| 2 | "Range size doesn't respond to the territory cost" unsupported | One-at-a-time check on the C6b model (`scripts/territory-sensitivity-metrics.ts`, seeds 48, 7, 21; `artifacts/validation/c7a/territory-sensitivity.*`) | West 95% kernel vs base: `territoryCostA` 0 → 1.85×, `territoryCostB` 0 → 0.87×, `homeW` 0 → 0.88×, all three → 2.16×. The familiarity term roughly halves ranges; the neighbour/danger term and the pull home alone do not. Ranges stay 0.4–2 km² with all three off, so most of the shortfall is elsewhere (C7a diagnosis). The C6 decision is annotated; C7a rule 9 changes the familiarity term |
| 3 | `summarize()` counts encoded rows as passes | Encoded rows counted apart (`encoded`); scorecards print (enc.) marks; `field-compare` rescores both runs; T-COM-1 and T-COM-3 marked encoded; T-COM-3's ratio reported (0.84 vs field 0.25) | C6 proof passes (review recount) fitted 4 → 3, held-out 10 → 9 |
| 4 | T-PAT-1 switched to male-party follows citing Ngogo, but its band is Gombe/Taï | Reverted to focal follows per protocolPolicy; the male-party value is the part `maleParties`; protocol text corrected (listening stops are required) | T-PAT-1 scored on focal follows again (C6 development value 0.08) |
| 5 | Expansion "3 of 5 in band" ignores the paired baseline | Reported against the baseline | +89 / +6 / +168 / +61 / −1%: 0 of 5 in band; **T-LET-4 not tested** (0–1 killings) |
| 6 | Stability claimed against year 1 | Reported as written | **fail** (0 of 5 within 0.5–2× of the start) |
| 7 | `centerScale` rule arithmetic and stale comment | West–East gap corrected to 214 m; premise noted as obsolete; `generation.ts` comment fixed | text only |
| 8 | Stale "fitted" notes and text drift | `territoryCostA` (calibrate off) and `patrolIncursionP` notes; simulation.md §11/§17; golden fixture note; T-RNG-4 now "held as fail" by rule (`heldAsFail`) | text and labels |
| 9 | T-RNG-3 and T-RNG-6 follow from the 500 m grid | Cell-based rows (T-RNG-2/3/6, T-IGE-5) get the verdict **scale** (reported, not scored) when a community-year uses fewer than 20 cells | applied from the C7a freeze |
| 10 | Untagged behavioural literals | `patrolMaxRain`, `patrolMaxHunger`, `homeFarRadii`, `homeFarW` in the registry (same values; goldens unchanged) | lint clean |
| 11 | T-PAT-6 truth not comparable; C12 "after" values seen | T-PAT-6 truth statement withdrawn; C12 values after C6b labelled "diagnostic, seen" | text |

#### C7a diagnosis: why field chimpanzees pace in small loops (29 September 2026)

Measurement only (`scripts/movement-metrics.ts`, no behaviour change; sim code after C6b). Seeds 48, 7 and 21, 120-day burn-in, then 6 days of every adult (≥ 15 y) from 07:00 to 18:00: 552 adult-days, 22,120 movement decisions. Output: `artifacts/validation/c7a/diagnosis-before.{txt,json}`.

| Measure | Simulation | Field (source) |
| --- | --- | --- |
| 30-min step, median | 5 m (56% under 15 m) | 95 m (Taï follows, C12) |
| Share of path by action | party follow 32%, travel to a remembered tree 24%, travel toward a caller 18%, drinking 14%, walking into a crown 6% | — |
| Distance to the chosen target, median (p90) | crown to feed in 9 m (29); remembered tree 85 m (160); caller 146 m (379); party follow 9 m (27) | out-of-sight approaches to fruit trees 537.5 m on average [ban2014] |
| Nearest-tree choice | *corrected after the C7a review:* the observer's held-out T-FOOD-5 was 0.09 at C6b, so the sim already skipped the nearest productive tree more often than the field; the defect was short target distance, not nearest-first choice | nearest productive tree chosen 30% of the time [normand2009] |
| Trees remembered | 41 per adult, median 322 m away (p90 638 m), 71% in fruit now | many trees remembered [normand2009]; large trees monitored across seasons [janmaat2013a] |
| Feeding trees visited per day | ~8.3 | 7.1 (1–21) [janmaat2013b]; 14–18 [normand2009] |
| Feeding bout per crown | median 26 min (11–40); ends at the scheduled bout end 44%, interrupted 23%, crop gone 1%; 25% of the crop left | no bout-length source in the registry |
| Fruiting crowns around an adult | 1.5 within detection range (none 13% of the time), 6 within 100 m, 1.5 per ha | one fruiting food tree per 97 m of transect; a large crop only every 21 km over all transects, logged forest included (10 km in old growth) [janmaat2016]; 9.8 feeding-size trees/ha (P-FOOD-1, [janmaat2016]; ≈ 6/ha of food species) × 8.7% ripe [potts2020] ≈ 0.85/ha |
| Crop sizes of fruiting crowns | nearly uniform (C6b crops were proportional to the species maximum with a ±12.5% draw); *the figures once quoted here (median 0.54, p90 0.84, largest 10% hold 16%) are not in the saved diagnosis output and are withdrawn (C7a review finding 10)* | strongly skewed: large crops are rare [janmaat2016] |
| Direction reversals (> 2.5 rad between 30-min steps) | 23% of turns; the most common is party follow → party follow (132 of the top 10's 408), then travel to a tree → feeding in it | turning angles centred near 0.76 rad (Taï, C12) |
| Party follows | 11,288 episodes (20 per adult-day) triggered mostly by "is moving off" interrupts (3,091); 68% target an animal that is itself following | — |

**Diagnosis.**
1. **Following chains.** A third of all walking is party-following over a median 9 m. Two-thirds of follows target an animal that is itself following, so short departures ripple back and forth through the party. This is the largest source of reversals.
2. **Goals are chosen by distance, not value.** Adults remember ~41 trees at a median 322 m, most still in fruit, yet feed a median 9 m away and travel to remembered trees a median 85 m away. Remembered trees are scored by hunger and distance only (their crop is not remembered), so the nearest wins; field chimpanzees skip the nearest tree 70% of the time and head for trees half a kilometre away.
3. **Food is everywhere in small, equal portions.** A fruiting crown is almost always within sight, crowns are left with a quarter of their crop, the crop recovers within a day, and there are no large crops worth a long trip. Nothing in the landscape rewards travel.

Travel to callers ends short of the caller 55% of the time and drinking trips re-decide at the bout end 16% of the time; both add short, broken legs. Travel speed while moving (15–19 m/min) is already close to the field's.

4. **The territory cost's familiarity term pulls use inward** (added after the C6 review). On the C6b model, removing it alone enlarges the West range 1.85× (95% kernel of all independent individuals' 30-min fixes, seeds 48, 7, 21); removing the neighbour/danger term or the pull home alone does not (0.87×, 0.88×). Even with all three off, ranges stay 0.4–2 km², so foraging (points 1–3) remains the larger cause.
5. **Real phenology does not rescue movement.** With the ingested Ngogo record instead of the synthetic one (C6b model, seeds 48 and 7): path 91 → 100 m/h and 09:00 → 15:00 displacement 0.17 → 0.12 km. The food landscape's timing is not what keeps animals local; its density and crop sizes are.

#### C7a mechanisms: rules stated before running (29 September 2026)

Field profile only; each is gated by a parameter that leaves the compressed profile (and its golden hashes) unchanged. Values are set here, before any run. Sources are in docs/research.md.

1. **Trees are valued by their crop, near or far.** Crowns in sight are scored by `(1.6h + 0.1)(0.55 + 0.45q)` with q = crop ÷ `fruitValueRef`; `fruitValueRef` rises from 0.45 (where most crowns already count as full) to 1, a full crown, so bigger crops are worth more. Remembered trees get the same value from what the animal saw there: `treeCrop`, the crop when the tree was last in sight or when the animal left it (C6b's devaluation still applies). Chimpanzees skip the nearest productive tree 70% of the time [normand2009] and head for high-valued trees from half a kilometre away [ban2014]. Remembered crops are not refreshed out of sight (no omniscience).
2. **Crops scale with crown area.** A tree's crop capacity is its species maximum × (crown radius ÷ species mean crown radius)², renormalized so each species' mean is unchanged (`cropSkewExp` 2; allometric design assumption). Large crops become rare and valuable, as in the field, where a large crop turns up only every 21 km of transect (all transects; 10 km in old growth) while a fruiting tree turns up every 97 m [janmaat2016]. janmaat2016 supports only the rarity of large *full* crops, which combines crown size with ≥ 50% fullness (fullness alone is at least 9× rarer); the area scaling itself is not from the source.
3. **Committed travel to a chosen tree.** A trip to a remembered tree is not re-decided at the scheduled bout end: the bout lasts the walking time to the tree plus 5 min (`travelCommit`). Interrupts still apply. Travel to out-of-sight trees is near-linear at Taï, with linearity 0.962 [normandBoesch2009].
4. **Parties follow the one who leads.** Only a goal-directed departure (travel) alerts companions ("is moving off"); an animal already following does not. A companion who would follow a follower follows that follower's leader instead, up to three links (`partyLeaderFollow`; design). This removes the follow chains found in the diagnosis.
5. **Fitted parameter.** Only `travelDistScaleM` (field; the distance cost of a trip to a remembered tree) is fitted, against the two C12 statistics declared fitted below.

*Addendum after the first mechanism check (before any held-out run; corrected after the C7a review: the check printed the fitted statistics and mechanism counts, and the diagnosis had measured the source quantities of T-FOOD-5 and T-FOOD-7, which are now labelled encoded).* Rules 1–4 removed the follow chains (party follows per adult-day 21.9 → 5.8; follows of a follower 70% → 5%) but did not lengthen trips (path 91 → 80 m/h; 09:00 → 15:00 displacement 0.17 km both; seeds 48 and 7), because a fruiting crown is almost always in sight and crowns outlast a bout. Two more rules, from the diagnosis:
6. **Food density from the literature prior.** `patchesPerHa` (field) 18 → 9.8 feeding-size trees per ha (P-FOOD-1, Kanyawara [janmaat2016]). The C5a value was tuned against T-FOOD-11 (labelled tuned); T-FOOD-11 becomes a consequence again and is reported as such.
7. **Feeding bouts end when the crown is emptied or the animal is sated**, not at a scheduled bout end, up to 90 min in one crown (`feedMaxMin`; design, following the integrator's "crop depletion that ends feeding bouts"). The crown is then left nearly empty, so the next goal is another tree.

*Second addendum (mechanism check; corrected after the C7a review: not fitted statistics only, since it printed feeding trees per adult-day, T-FOOD-4's quantity, which fed the decision below; T-FOOD-4 is therefore compromised).* With rules 1–7: path 56 m/h, displacement 0.11 km, feeding bouts 52 min, 2.3 feeding trees per adult-day (field 7–18, T-FOOD-4). Crowns outlast a party's appetite, so rule 7 turns feeding into long sittings. **Rule 7 is withdrawn** (`feedMaxMin` 0) until crop sizes are grounded in C7. Rule 8 addresses the remaining cause, that animals only know trees they passed within 35 m in the last 10 days:
8. **Long-range knowledge of productive trees.** Adolescents and adults (independent, ≥ 10 y; the text said "adults", the code has always used ≥ 10) know where their range's productive trees stand and which species are fruiting now (long-term spatial memory of many trees [normand2009]; large trees monitored across seasons, with empty-tree inspections tracking a species' synchrony [janmaat2013a]). Each day the simulation lists, per community, the `knownTreesK` 40 trees inside the familiar range with the highest expected crop: capacity × the share of that species' trees in fruit today. Animals aged ≥ 10 (not dependents) consider them as travel goals, valued like remembered trees; *stylization:* the list uses the true fruiting share of each species and every tree's capacity, including trees no animal has seen (community omniscience about the top 40 trees); their own last sighting of a tree overrides the expectation, so an empty tree is learned on arrival [janmaat2013b]. Design value for K.

*Third addendum (after the C6 review's sensitivity request, before any held-out run).* The clean one-at-a-time check (`scripts/territory-sensitivity-metrics.ts`, C6b model, seeds 48, 7, 21, 60-day burn-in + 365 days, community 95% kernels) found that the familiarity term `a` alone shrinks West ranges to 0.54× (off: 1.85×), while `b` (neighbours and danger) and the pull home alone do not (0.87×, 0.88×); all three off gives 2.16×. Rule 9 follows:
9. **Animals are familiar with their whole range** (post hoc on range results: chosen after the range-size sensitivity run above, so the C12 range-area statistics are labelled "diagnostic, seen", C7a review finding 3). The familiarity term applies only beyond the familiar range: `f` = 1 up to the 95% familiarity isopleth, falling to 0 at the 99% isopleth (`familiarFullLevel` 0.95 field; the compressed profile keeps 0.5, the C6 core). Inside its range a community knows all ground; the C6 form penalized everything outside the 50% core, which pulls use inward and shrinks ranges (design; C6 review finding 2).
Probes of the fitted knob on the two fitted statistics only (seeds 48, 7): path per hour 102 / 137 / 150 m/h at `travelDistScaleM` 2,000 / 6,000 / 20,000 m, 09:00 → 15:00 displacement 0.20–0.22 km throughout; the knob saturates far below Taï's 314 m/h.

**C12 statistics declared fitted before tuning (the rest stay held out):** path per hour over full-day follows (Taï follows, not Ngogo GPS; labelled "tuned against Taï") and displacement between an individual's two same-day fixes ≥ 3 h apart (labelled "tuned against Ngogo GPS"). Fitting uses `scripts/movement-metrics.ts --fitted-only` on proof seeds, which prints only these two statistics and the mechanism checks; the held-out C12 statistics are computed only by the compare scripts at the proof.

#### C7a results (29 September 2026)

Proof: sim code with rules 1–6, 8 and 9 (rule 7 withdrawn), the ingested Ngogo phenology, `travelDistScaleM` 60,000 m (fitted). C12 comparisons on proof seeds 48, 7, 21, 5, 11 (movement 1 year, ranging 3 years, 180-day burn-in; `artifacts/compare*/`, `docs/data/*-compare.json`) and fresh seeds 101–505 (`artifacts/validation/c7a/compare-fresh-*`; untouched by C7a tuning but not unseen: they were run in C6 and C6b); field observer 5 seeds × 365 days (`artifacts/validation/c7a-field1y.*`, fresh `c7a-fresh.*`; protocol `4e8a1df9e91bb81d` = C7a freeze). Baselines: C6b with synthetic phenology (`c7a/compare-c6b-synth`) and C6b with the Ngogo phenology (`c7a/compare-c6b-real-*`). Machine load 5–10 throughout.

| C12 statistic (real) | C6b, synthetic | C6b, Ngogo phenology | C7a proof | C7a fresh | Verdict (C7a) |
| --- | --- | --- | --- | --- | --- |
| 30-min step (95 m, Taï) | 3.9 m | 5.7 m | 2.2 m | 4.6 m | different |
| Path per hour (314 m/h, Taï) — *fitted* | 89 | 86 | 165 | 177 | different |
| Straightness (0.50) | 0.25 | 0.24 | 0.23 | 0.23 | different |
| Turning angle (0.76 rad) | 1.52 | 1.54 | 1.04 | 1.08 | different |
| Travel share (0.20) | 0.16 | 0.15 | 0.21 | 0.23 | similar / inconclusive |
| Party size (6) | 3 | 3 | 2 | 2 | different |
| Individual 95% range (16.9 km², Ngogo) | 0.59 | 0.48 | 1.76 | 1.71 | different |
| Community 95% range (25.6 km², Ngogo) | 0.65 | 0.60 | 2.06 | 2.08 | different |
| Same-day displacement (0.66 km, Ngogo) — *fitted* | 0.14 | 0.12 | 0.26 | 0.27 | different |
| Pair overlap BA (0.72) | 0.88 | 0.91 | 0.88 | 0.89 | different |
| Taï territory at matched size (13.6 km²) | 0.37 | — | 1.25 | 1.18 | different |

Shape statistics that were similar stay similar (core fraction, edge and centre distances, elongation, year-to-year individual overlap, normalized maps); the year-to-year community overlap moved from similar to inconclusive, and periphery ÷ core travel from inconclusive to different (1.85 vs 1.42).

| T-* target | C6b (1 y) | C7a proof | C7a fresh |
| --- | --- | --- | --- |
| T-RNG-1 West range, 95% kernel (5–16 km²) | ~0.5 (review) | 1.85 fail | 2.27 fail |
| T-RNG-3 core concentration | 0.94 fail | 0.89 scale (< 20 cells) | 0.89 scale |
| T-RNG-4 male day range | 1.84 (tuned) | 3.54 held as fail (30-min path 2.66 km, net 0.45 km, straightness 0.19) | 3.59 held as fail |
| T-IGE-1 encounters (5–12) | 3.19 fail | 2.59 fail (truth 78; true episodes rose 3.6×, C7a review) | 2.44 inconclusive |
| T-PAT-1 patrols/week, focal (0.1–0.5) | 0.13 | 0.03 fail (truth 0.10; male parties 0.05) | 0.01 fail |
| T-PAT-6 incursion share (0.40–0.70) | 0.17 fail | 0.19 fail | 0.26 inconclusive |
| T-PTY-1 party size (3–9) | 4.51 | 3.24 pass (tuned) | 3.24 inconclusive |
| T-ACT-2 travel share (0.12–0.25, both sexes) | 0.16 pass | 0.23 fail (males 0.30) | 0.23 fail |

- **C7a review findings 9–12 (29 September 2026).** Tests now cover the encoded summary count, the CELL_MIN scale verdict, `heldAsFail`, T-RNG-1's annual-kernel median and `familiarFullLevel`. Writing the T-RNG-1 test exposed a bug: with a burn-in, observation years were counted from world time 0, so the "annual" range, cell-count and bond metrics used only part of the first observation year; they now count from the observer's start (logged, flagged revised post hoc). Sources: janmaat2013b is in research.md, the janmaat2016 figures are accepted there, P-FOOD-1 is cited to janmaat2016 (≈ 6/ha of food species), and 21 km is stated as all transects (10 km in old growth). The phenology ingest merges spelling variants (42 names → 39 species) and warns on month skew. Only the fig class mean changes, so field world hashes move (model input, logged).
- **C12 roles (integrator ruling, 29 September 2026).** Every Taï movement and Ngogo ranging row above is a development diagnostic (seen): these comparisons were looked at repeatedly and used for direction checks. The held-out movement validation is the Gombe 15-min focal paths (`scripts/compare-gombe-paths.ts`, Pusey & Schroepfer-Walker 2013), which no designer has seen; its code is in the protocol fingerprint.
- **T-IGE-1 and the encounter classifier (C7a review fix 2).** The review read the fall in classifier recall (0.63 → 0.25) as an observer artifact. Instrument validation against truth (seeds 48, 21, 5, 11; days 100–200; patrol-corrected model) shows the classifier catches every encounter the followed party can observe: recall 1.00 on 10 focal and 7 party-follow episodes, precision 1.00. The low recall came from the truth reference, which also counted acoustic episodes where only the stranger heard the followed party (24 of 34 focal episodes; C7a's travel pant-hoots multiplied them). The field protocol cannot observe those (wilson2012 scores foreign calls heard by the observers' party). Recall now uses the observable reference, the earlier one is still reported, and the 0.8 instrument bar now covers the encounter rows (T-IGE-1 on party follows; T-IGE-2, 3, 5 and T-PAT-7 on focal follows). T-IGE-1 stays low because few true episodes put a stranger's call in the followed party's ears. The truth rate (78 per community-year) counts one-sided episodes the protocol cannot see.
- **Diagnosis in one line:** chimps followed followers, chose goals by distance not value, and lived in a landscape where food is everywhere in small equal portions; the familiarity cost halved ranges.
- **What changed movement (headline corrected after the C7a review):** ranges tripled in area (still 8–12× too small). The two fitted rates doubled (still 40–55% of field). Turning and travel share improved. Step length and straightness did not improve, and stationary half-hours stay at 56%. Party size, patrols and four field targets regressed. The mechanism was value-driven goals over the whole familiar range (rules 1, 8, 9), a distance cost the fit effectively switched off (`travelDistScaleM` 60,000 m) and committed trips: animals shuttle on long legs and then sit. The real Ngogo phenology on its own changes almost nothing (C6b synthetic vs Ngogo).
- **What is still off, and why:** ranges are ~8–12× too small and paths not straight (0.23). Animals now take long trips but then sit: the median 30-min step fell to 2 m because feeding bouts lengthened and movement is concentrated in a few long legs. Parties shrank to 2 (followers no longer chain). Patrols became rare (truth 0.10/week) with smaller parties and fewer 3-male groups. Food per unit area is still too high, so a small area feeds a community; crop sizes and regrowth are not grounded, and C7's tree-level memory, species synchrony and fallback-food limits are the next levers.
- **Fitted vs held out.** Only `travelDistScaleM` was fitted, against path per hour (Taï, labelled "tuned against Taï") and same-day displacement (Ngogo GPS), labelled in targets.json (`c12Fitted`), the compare notes and the guide JSON. After the C7a review: the C12 range-area rows (individual 95% and 50%, by sex, community 95%, Taï territory at matched size) are "diagnostic, seen" (rule 9 came after a range-size run); T-FOOD-4 is compromised and T-FOOD-5 and T-FOOD-7 encoded, so held-out passes fall from 8 to 7. The knob saturates below the field values. All other C12 statistics are held out; C6b's values were seen, so the C7a values are best read as held out from tuning, not unseen.
- **Bench (loaded, re-measure idle):** `bench-sim --profile field` 284 ms per eco-day (days 1–3, load ~5); in-loop simulation 0.35–0.49 s per eco-day in the 1-year runs (load 5–10, 2 workers) — likely above the 0.3 s target at steady state. Observer 3.4–4.6%.

### Stage C7: Spatial memory and real ecology (O7, O8)
**Goal**: long-term tree memory with species phenology beliefs, goal-directed travel and breakfast planning; data-driven phenology; fallback forage field; colobus demography; encounter-based hunt decisions with multiple captures.
**Success Criteria** (5 seeds × 2 years):
- Fitted: T-ACT-1 0.33–0.50 both sexes; T-ACT-2 0.12–0.25; T-FOOD-2 0.60–0.78; T-FOOD-11 60–160 m; T-HUN-1 5–25; T-HUN-2 0.50–0.80; T-HUN-3 0.05–0.40; T-HUN-7 1.2–2.0.
- Held out (reported): T-FOOD-3..10, T-PTY-2, T-HUN-4, T-HUN-5, T-HUN-6, T-HUN-8, T-HUN-9.
- Prey scenario (held out, T-HUN-10), 30 years × 5 seeds: colobus decline under Ngogo-like predation and persistence under Kanyawara-like predation; reported either way.
- Bench ≤ 0.3 s per eco-day; saved-world size growth reported for C2.
**Tests**: `tests/sim-memory.test.ts` (memory written only for perceived trees; expectation uses species beliefs; infants copy, immigrants start empty; no RNG in candidate scoring); `tests/sim-ecology.test.ts` (phenology series reproduces the ingested monthly means; colobus demography bounded; hunt impulse only on detected prey; captures ≤ group immatures).
**Proof**: `scripts/field-metrics.ts --years 2`; `scripts/scenario.ts prey-ngogo` and `prey-kanyawara --years 30`.
**Effort / risk**: L (6–10 days). Risk: medium (memory changes intake; data download is a human step).
**Status**: Not Started

### Stage C8: Demography and health (O9)
**Goal**: cause-specific hazards with a re-fitted baseline; respiratory epidemics through party contacts; snare injuries; age- and condition-dependent fertility; rank and maternal effects through mechanisms.
**Success Criteria** (natural aging, 5 seeds × 40 years; fertility measured only below 90% of the population cap):
- Fitted: T-DEM-1 0.11–0.19; T-DEM-2 females 31–39 y, males 18–24 y; T-DEM-5 0.07–0.15; T-DEM-6 attack 0.4–0.9, mortality ≤ 0.17 per outbreak; T-DEM-9 0.10–0.30; T-DEM-10 peak 0.15–0.25 births per female-year at 20–30 y and no births after 55; T-DEM-11 13.5–16 y; T-DEM-12 4.8–6.6 y.
- Held out (reported): T-DEM-3, T-DEM-4, T-DEM-7, T-DEM-8, T-DEM-13, T-DEM-14, T-DEM-15, T-SOC-11, T-LET-5.
- Bench ≤ 0.3 s per eco-day outside outbreaks.
**Tests**: `tests/sim-life.test.ts` and `tests/sim-reproduction.test.ts` extended (analytic life table from the new baseline; outbreak spread only through co-party contact; snare hazard only on the ground in risky cells; fertility curve shape; no direct rank term in conception).
**Proof**: `scripts/field-metrics.ts --years 40 --demography` through the pool (5 seeds in parallel); life-table plot vs Wood et al. 2017 under `artifacts/validation/c8/`.
**Effort / risk**: M–L (5–8 days plus ~1 night of runs). Risk: medium (rare events; population cap).
**Status**: Not Started

### Stage C9: Community fission (O6)
**Goal**: bond-weighted association, monthly deterministic community detection, a priori split rule, new-community creation. Scheduled after C11 (see order above).
**Success Criteria**:
- Unit-level: detection reproduces known partitions on constructed networks; no split unless all rule conditions hold; a split conserves individuals, kin links, bonds and digests.
- Held out (reported), baseline 5 seeds × 40 years: expectation zero fissions in communities below ~10 adult males (T-FIS-1); monthly Q logged.
- Held out (reported), `large-community` scenario (≥ 60 members, ≥ 15 adult males) 5 seeds × 40 years: whether fission occurs; years of rising Q before it (T-FIS-2, expectation 1–3); post-split killing rate vs baseline (T-FIS-3, expectation ≥ 5×); former associates among victims (T-FIS-4); yearly Q trajectory compared with the Ngogo networks in the Sandel et al. 2026 data.
- Bench ≤ 0.8 s per eco-day at 150 living.
**Tests**: `tests/sim-fission.test.ts`.
**Proof**: `scripts/scenario.ts large-community --years 40 --seeds 48,7,21,5,11`; Q-by-year plots.
**Effort / risk**: L (5–10 days). Risk: high (may not emerge; a negative result is reported, not tuned away).
**Status**: Not Started

#### C9 pre-registration (29 September 2026, docs only; nothing built, no run)

This fixes C9's rules, values, sources and held-out rules before any C9 code exists. It builds on §5.4 and the open Ngogo data: the fission networks and quarterly patrols in `data/raw/dryad-sf7m0cgkg` [sandel2026], and the fission range divergence in `docs/data/ranging-compare.json`. Sources are listed in docs/research.md ("Community fission, stage C9").

**Ablation switches.** With both off, the model is the pre-C9 model. Association bookkeeping is written only when `fissionOn` is 1, so worlds with it off are identical to pre-C9 worlds.

| Switch | Mechanism | Off (0) means |
| --- | --- | --- |
| `fissionOn` | association bookkeeping, monthly detection, the split rule and new-community creation | no association data, no split |
| `assocBondW` | party-following and join-call pull weighted by bond with the leader or caller | the C7c scores |

**Rules and values (fixed now; not tuned).**
1. **Association.** Every 15 min, each pair of independent individuals ≥ 10 y in the same party gets a co-membership count, and each individual gets a scan count. Counts are integer-keyed (`a·100000 + b`) in `world.sim.assoc`. Each individual also gets a 400 m location histogram. Everything is plain data and serializable (§5.4).
2. **Monthly detection.** For each community, the simple ratio index over pairs with ≥ 50 scans each, then deterministic Louvain with Leiden refinement [traag2019]: nodes in id order, ties to the smaller id, no RNG. The output is the best two-cluster split, its modularity Q [newman2006], adult males and females per cluster, and the Bhattacharyya overlap of the clusters' location histograms. A monthly row goes to `world.sim.fissionLog` (at most 240).
3. **Split rule (a field-recognition proxy).** Q ≥ `fissionQ` and overlap ≤ `fissionOverlap` for ≥ `fissionMonths` consecutive months, with ≥ 3 adult males and ≥ 3 adult females in each cluster. Values, taken at the middle of the §5.4 priors (design): `fissionQ` 0.4 (prior 0.3–0.5), `fissionOverlap` 0.5 (prior 0.3–0.6), `fissionMonths` 12 (prior 6–24). For reference only, not used to choose the values: at Ngogo the West–Central pooled-range overlap was 0.65–0.77 in 2011–2015 and 0.31–0.44 from 2016 (`ranging-compare.json`, derived from sandel2026's data), so 0.5 lies between the two regimes.
4. **On a split.** The cluster farther from the original range centroid becomes a new `Troop` (id 4 and up). Dependents follow their mothers. The range is divided by the clusters' location histograms. Hierarchies and alphas are recomputed. Bonds, memories and digests are kept, and the two groups become strangers: the existing intergroup mechanics apply, and nothing scripts violence. The observer adds a following team for the new community from the split month on, as the Ngogo researchers followed both groups.
5. **Bond-weighted association** (`assocBondW`). The party-follow and join-call scores gain `assocBondW` × bond with the leader or caller. Allies were recruited to travel more often [gruberZuberbuhler2013] [M]; the weight is design, 0.3.

**Deliberately not built.** §5.4 also proposes that rivals' allies avoid each other during hierarchy instability. It would be designed from the Gombe antecedent [feldblum2018], which is part of T-FIS-2's own pattern ("coincident hierarchy upheaval"), so it would encode that target. It stays out; if an upheaval coincides with a split, it has emerged.

**Held-out targets and rules** (all counted only if nothing was set by looking at them).

| Target | Rule, fixed now | Where it runs |
| --- | --- | --- |
| T-FIS-1 | Fissions per community-year by adult-male class. Pass: zero fissions in communities with < 10 adult males, and ≤ 1 per 100 community-years at 20–40 males. | Baseline: every 40-year natural-aging run of the combined proof (C8 sets A and B), so no extra cost. Scenario below. |
| T-FIS-2 | Years of rising Q (yearly mean of the monthly Q, strictly increasing run) before the month the split condition first held. It is measured to the onset, not the recognized split, so the 12-month persistence rule cannot make the lead. Band 1–3 years. Hierarchy changes (an alpha change or a contested vacancy) within ±1 year of onset are reported. | `large-community` scenario |
| T-FIS-3 | Killings between the daughter communities in the 7 years after the split ÷ the baseline intercommunity killing rate of the same seeds. Band ≥ 5. | scenario, paired baseline |
| T-FIS-4 | Share of victims killed by the other daughter community whose killers include a former associate (simple ratio index ≥ the median of adult male pairs in the year before onset). Pass: ≥ 0.5 (bonds do not protect). | scenario |
| T-FIS-5 (new) | After a split, adult-male patrols per 10 males per year, smaller daughter ÷ larger daughter. Real value by the rule: 2017–2022 of `patrol-data-quarterly.csv` with the males of `population_snapshots.csv`, median of yearly ratios, with a bootstrap 90% CI over years. The band is that CI, computed by a script before any C9 run; the data only have been looked at, never a simulated value. | scenario |
| Range divergence (C12 `fission` row) | Daughter-community range overlap before vs after the split. **Encoded:** the split rule requires overlap ≤ 0.5, so a low overlap after the split holds by construction. Reported, never counted. | scenario |

**Scenario `large-community`.** At the start, the West community gets extra members, including adult males, up to ≥ 60 members and ≥ 15 adult males. This mirrors the expansion scenario's extra males. It runs 40 years at natural aging, with the population cap raised to 180. Seeds 5101, 5202, 5303, 5404 and 5505, reserved and never run (the first choice, 3505–3909, had already served C7c–C7e movement direction checks with fission off; corrected before any C9 run, logged). If no fission occurs, that negative result is reported and nothing is tuned to produce one.

**Contract and other owners.** New troops are appended to `world.troops`, and the current types allow that. The UI, renderer and audio must handle more than 3 communities (colours, emblems, labels), and the integrator should confirm before the build.

**Shared files at build time.** A new `src/sim/fission.ts`. Also `parties.ts` (15-min association), `tick.ts` (monthly), `candidates.ts` (one local term per score for `assocBondW`), `hierarchy.ts` (recompute after a split), `generation.ts` (new troop records), and `src/field` (a team per new community, plus the T-FIS metrics).

**Cost.** Association counts are about 1 ms per eco-day and monthly detection < 5 ms for n ≤ 80. The bench target is ≤ 0.8 s per eco-day at 150 living.

#### C9 build addendum (29 September 2026, before any C9 run)

Built in `src/sim/fission.ts`, off by default (`fissionOn` 0, `assocBondW` 0; the C9 scenario turns on both, with `assocBondW` at 0.3), so the combined proof is unaffected. With it off, no state is written and worlds are identical to `main`: the compressed goldens are unchanged, and field seeds 48 and 7 at days 3 and 40 are identical. Implementation details fixed now, before any run:
- **Time window.** Association counts, scans and location histograms decay by e^(−1/12) each month, a 12-month window (design). The clusters' range overlap uses the same decayed histograms.
- **Community detection.** Deterministic Louvain levels are followed by a connectivity refinement: a community that is not connected is split into its components, which is the guarantee Leiden adds [traag2019]. Leiden's full refinement phase is simplified to this. Communities are then merged greedily to the best two, and single nodes move while modularity rises.
- **Who counts.**
  - Network nodes are independent animals aged ≥ 10 with ≥ 50 decayed scans.
  - A community needs at least 12 nodes (four times `fissionMinAdults`) to be tested.
  - Adults for the composition rule: males per `isAdultMale`, and females ≥ 15 y.
- **Which cluster leaves.** The daughter is the cluster whose histogram centroid lies farther from the parent's range centre. Animals outside the network go with their mother, processed oldest first, or else to the nearer cluster centroid.
- **The daughter community.**
  - It gets the next colour and emblem from the UI's order (#c9a4f0 ■, #e8c36a ★, #9fb0c8 ⬟, #f08a8a ✚) and the name "<parent> (new)".
  - Its parent is recorded in `world.sim.fission.parents`, so no contract field is needed.
  - An ongoing patrol of the parent ends.
  - The parent's use is divided cell by cell by the clusters' histogram shares, with equal shares where neither cluster was seen.
- **Observer.** A community that appears gets a following team (`ensureTeams`), and its id is added to the records.
- **Still to build for the C9 proof.** The T-FIS observer metrics, the `large-community` scenario and the T-FIS-5 band script.

#### C9 proof preparation (29 September 2026, before any C9 scenario run)

- **T-FIS-5 band.** Computed from the real data by the pre-registered rule (`scripts/fission-bands-metrics.ts`, adult males of `population_snapshots.csv`, 2017–2022). Median ratio 7.35, 90% CI 6.19–11.41. Every year West, the smaller group (7–11 adult males), patrolled 5–15 times more per male than Central (23–26). The row is in data/targets.json, held out.
- **Scenario script.** `scripts/c9-scenario.ts` scores T-FIS-1…5 and the range divergence from simulation truth, by the pre-registered rules. It runs three kinds at natural aging:
  - `baseline`: default communities with fission on.
  - `large`: West cloned up to ≥ 60 members and ≥ 15 adult males, cloning adult males and mothers with their young; `popCap` 180.
  - `large-off`: the same start with fission off. It gives the paired intercommunity killing rate for T-FIS-3, per community pair per year over the three communities.
- **Change from the pre-registration** (integrator ruling: `fissionOn` stays off by default). The T-FIS-1 baseline can no longer come from the combined proof's 40-year runs, so it runs as the scenario's `baseline` kind. Logged.
- **Fix after the first plumbing run** (compressed, seed 42, 3 years; not a proof, and no C9 value is tuned on it). When Louvain finds a single community, the monthly Q was reported as 0, which hid a network that is starting to divide. The best two-way split now comes from the leading eigenvector of the modularity matrix [newman2006], polished by node moves. Q stays 0 only when no split has positive modularity. On the compressed map a 60-member community forms one party chain (every pair's association index is near 1), so Q stays 0 there; the proof uses the field profile.
- **Proof command.** `pnpm exec tsx scripts/c9-scenario.ts --years 40 --workers 6` on the reserved seeds 5303, 5404, 5505, 5606 and 5707 (5101 and 5202 were replaced on 30 September: the decide-ft track had run them; protocolLog). Rough wall time: about 12 h at 6 workers and 30 h at 2. The large communities approach the cap of 180, which costs about 0.6–1 s per eco-day.
- **Lean local proof** (29 September 2026, user decision, logged before any C9 value). The combined proof's lean plan (`scripts/proof.ts --plan lean`) runs one `large` world on 5606 × 75 years instead of the three kinds on the five C9 seeds × 40 years.
  - T-FIS-1, -2, -4 and -5 come from that world. T-FIS-3 has no paired `large-off` run and is reported insufficient.
  - Fission is not switched on in a generation world, because C9's setting (`assocBondW` 0.3) changes party joining from the first day and a split would contaminate the demography rows.
  - The pre-registered 5 × 3 × 40-year proof stays available for a later full run.

### Stage C10: Communication (O10)
**Goal**: individual and community call signatures, recognition by listeners, context- and audience-dependent calling, drumming structure, core gestures, features exposed to the audio layer.
**Success Criteria** (5 seeds × 1 year):
- Fitted: T-COM-1 0.5–1.5 per male-hour; T-COM-5 identity accuracy 2–4× chance; T-COM-6 median 3–5 hits per bout, males only; T-COM-8 0.3–0.6; T-COM-10 individual repertoires with population-level types transcribed; T-COM-11 0.25–0.55.
- Held out (reported): T-COM-2, T-COM-3, T-COM-4, T-COM-7, T-COM-9.
- Each chimp's mean signature is constant over a life; the audio layer consumes `Call.features`.
**Tests**: `tests/sim-signals.test.ts` (signature stability; recognition error rises with distance; `heardN` uses discriminated callers; food-call probability rises with crop size).
**Proof**: `scripts/field-metrics.ts --years 1` with the bioacoustic recorder's discriminant analysis; an audio loudness and variation check with the audio owner.
**Effort / risk**: M (3–5 days). Risk: low.
**Status**: Not Started

#### C10 pre-registration (29 September 2026, before any C10 run)

Rules, values and sources are fixed here before any simulation run with C10 code. Sources are added to docs/research.md ("Communication, stage C10"). Evidence tags follow AGENTS.md.

**Ablation switches (new rule for every stage).** Each C10 mechanism has a registry switch; with all of them 0 the model is the pre-C10 model (goldens reproduce). Defaults are on in both profiles, so the combined proof can run "all on" against "C10 off".

| Switch | Mechanism | Off (0) means |
| --- | --- | --- |
| `callSignatures` | pant-hoot feature vectors and drum structure on calls | calls carry no features; T-COM-5 and T-COM-6 are n/a |
| `callerDiscrim` | listeners count stranger callers by their perceived features | `heardN` counts distinct true caller ids (C6 rule) |
| `foodCallRule` | probabilistic, audience-dependent food grunts at arrival | the C7a rule (a grunt whenever the crop exceeds 0.3) |
| `gestureRequests` | gestures before social actions (C10b, below) | no gestures |

**Rules and values.**
1. **Pant-hoot signatures** (`callSignatures`). Each chimpanzee has a constant mean signature over six standardized features (build-up duration, climax peak frequency, element count, inter-element interval, let-down strength, overall duration): `s_i = c_k + δ_i`, with `c_k ~ N(0, sigCommunitySD²)` for its natal community and `δ_i ~ N(0, sigIdentitySD²)`, both drawn from hashes of the ids (no RNG, constant over a life). Each call adds call-to-call variation `ε ~ N(0, 1)` per feature, hashed from the call id. No context shift: desai2022 shows context adds variation, but its size is not transcribed (design 0, labelled). The features go on the call (`Call.features`, contract request below) for listeners, the observer and the audio layer. Individual signatures exist but are noisy: identity 19.5% vs 6.9% chance, group differences weaker [desai2022] [M]. Feature choice follows §5.8 (design).
   - **Values, fixed by an offline Monte Carlo of the observer's recorder protocol, with no simulation run:** `sigIdentitySD` so that leave-one-out discriminant accuracy for 18 callers × 20 calls is 2.8× chance (desai2022: 19.5 ÷ 6.9); `sigCommunitySD` so that community accuracy for two communities is ~1.3× chance (the §5.8 reading of desai2022, "less reliably than group differences"). T-COM-5 is then tuned by construction and labelled so.
2. **Caller discrimination** (`callerDiscrim`). A listener perceives a call's features with extra noise `σ_p = discrimNoise0 + discrimDistW · d / hearing radius`, hashed per listener and call. Within the stranger-caller window it counts a new caller only when the perceived vector's root-mean-square distance to every caller already counted exceeds `discrimThreshold`; `heardN` ≥ 1. Values: `discrimNoise0` 0.3, `discrimDistW` 1, `discrimThreshold` 1.5 (design [L]; the premise, that callers are only partly distinguishable, is desai2022 [M]).
3. **Food calls** (`foodCallRule`). On arrival in a crown with crop > 0.3 (the existing condition, when no arrival pant-hoot is given, 0.3 h since the last food call), a food grunt with probability `clamp01(foodCallBase + foodCallCropW · (crop − 0.3) + foodCallMaleW · min(3, other adult males within sight) + foodCallPartnerW · [a partner with bond ≥ 0.5, or the alpha, in sight])`, drawn from `world.rng`. Values: `foodCallBase` 0.35, `foodCallCropW` 0.3, `foodCallMaleW` 0.05, `foodCallPartnerW` 0.15, which gives about one call per two feeding arrivals: food calls at about half of feeding events, more with more males present [kalanBoesch2015] (Taï, *P. t. verus*; abstract) [M]; more with an important partner nearby [slocombe2010] (abstract) [M]; the crop term and all magnitudes are design. `foodCallBase` may be refitted once to T-COM-8's band centre (0.45) on development seeds, logged. T-COM-8's audience part would be encoded; the current protocol does not measure it.
4. **Drum structure** (`callSignatures`). Each drum call carries its inter-hit intervals. Hits per bout = max(2, round(exp(ln `drumHitsMedian` + `drumHitsSigma` · z))), z hashed from the call id: median 4, and σ 0.45 puts the mode at 3 (eastern chimpanzees: median 4 hits per bout, mode 3, mean inter-hit interval 229 ms [eleuteri2025] [M]). Intervals alternate short and long around `drumIntervalMs` 229 with swing `drumSwing` 0.3 (the alternation is eleuteri2025; the swing size is design) and 10% jitter. No individual offset: Kanyawara drumming shows no individual signature [clarkArcadi2004] [M]. Who drums and when is unchanged (adult males in displays, counter-calls and patrol releases).
5. **Gestures (C10b, after the contract fields and a transcription of hobaiterByrne2014).** A core subset of Sonso gesture types with their meanings, used as requests before grooming, play, travelling together and "stop", recorded as interactions; they raise the partner's acceptance, and a chimpanzee's repertoire grows with use (T-COM-10: 66 types, individual mean 10.0, juveniles 15.1 vs adults 5.1 [hobaiterByrne2011]; 19 meanings, 4.6 per gesture [hobaiterByrne2014]). Rules and values will be fixed in an addendum before any C10b run.

**Deliberately not implemented.** §5.8 also lists a rank term and a males-in-party term on pant-hoot rates, status-dependent arrival calls and a party-size term on drumming. Each would be built from the pattern of a held-out target (T-COM-2 [mitaniNishida1993] [wilson2007], T-COM-9 [clarkWrangham1994], T-COM-7 [eleuteri2022]). C10 leaves these patterns to emerge or fail, so the targets stay held out.

**Observer (protocol additions, frozen with the rows).**
- *Recorder (T-COM-5):* every pant-hoot of an adult male heard by a following team within 100 m is recorded with its features. Per seed: leave-one-out linear discriminant accuracy over callers with ≥ 10 recorded calls, ÷ chance (1/callers); part: community accuracy ÷ chance.
- *Drums (T-COM-6):* drums heard by a team. Median hits per bout, mean inter-hit interval, share of male bouts without the drummer's pant-hoot within 1 min (reported), share of bouts by females (must be 0). Pass: median 3–5 hits and no female bouts.

**Targets.** Fitted: T-COM-5 (tuned by construction, above), T-COM-6, T-COM-8, T-COM-10 (C10b). Held out: T-COM-2, T-COM-7, T-COM-9; T-COM-3 and T-COM-4 have been encoded since C6. T-COM-1 and T-COM-11 are unchanged.

**Direction checks** (not proof). Seeds 31, 32 and 33 (outside 606–1010, 1111–2525 and the proof seeds), 120 field days. Checks: signatures are constant per chimpanzee, recognition errors rise with distance, the food-call share moves toward 0.3–0.6, and the drum median is 3–5. The proof runs combined after the merges.

**Contract request (src/types.ts, integrator):** `Call.features?: number[]` (pant-hoot: six standardized features; drum: inter-hit intervals in ms), and for C10b `InteractionKind` 'gesture' with `Interaction.gesture?: string`.

**Shared files.** `events.ts` (`emitCall` features), `perception.ts` (`hear`), `execution.ts` (the food-call lines of the arrival block only), a new `src/sim/signals.ts`, and `src/field` (recorder, drums). No `candidates.ts` edits before C10b.

#### C10 addendum 1: travel hoos (29 September 2026, before any travel-hoo code or run)

Adopted at the integrator's suggestion. C7c models travel recruitment without a call. Values verified in the full text of gruberZuberbuhler2013 (PLoS ONE, Budongo Sonso):
- 60.3% of 456 travel events included a "travel hoo".
- 71.4% (55/77) of vocally initiated travel events led to a travel party, against 33.7% (30/89) of silent ones.
- Callers called more with an ally in the audience: 75.6% vs 55.4%.
- Travel hoos are low-intensity, short (0.125 s) and low-pitched.

| Switch | Rule | Values | Evidence |
| --- | --- | --- | --- |
| `travelHoo` | When an independent animal starts a goal-directed trip (to a tree, or initiating a C7c joint trip) with at least one own-community companion within `partyLinkM`, it gives a quiet travel hoo. The hoo is heard only by own-community animals within `hearTravelHooM`. For `travelHooWindowMin`, a hearer's party-follow candidate toward the caller is offered with `travelHooFollowW` added. | P(hoo) `travelHooP` 0.554, or `travelHooAllyP` 0.756 with an ally in sight; `hearTravelHooM` = `partyLinkM` (field 50 m, compressed 9 m); window 5 min; `travelHooFollowW` 0.3 | [M] for the call rates (gruberZuberbuhler2013); hearing range, window and follow weight are design |

- **Refit rule, fixed now.** `travelHooFollowW` may be refitted once on seeds 31–33 (a direction check, not a proof). The goal is a ratio of hooted to silent trips followed by at least one companion of 1.6–2.6 (source 2.1). The refit is logged. There is no target row: the pattern is fitted, so it is not validation.
- **Other rules.** Travel hoos carry no signature features. They are not counted by `heardN`, and the observer does not record them.
- **Contract request.** `CallKind` 'travel-hoo'.
- **Shared file.** The follow offer in `candidates.ts` gets one local term.

**Addendum 1 result (direction check, seeds 31–33, not a proof).** Initiators with a companion hooed on 45–51% of trips; the rate is below the source's 60% because the companion check uses the attention-limited view. Trips followed within 5 min: 0.59 vs 0.51 and 0.63 vs 0.55, hooed vs silent (ratio 1.13–1.15, source 2.1). The one-time refit scan (`travelHooFollowW` 0.6, 1.0, 1.5 on seed 33) gave ratios of 1.22, 1.21 and 1.12. No value reaches 1.6, because silent trips already recruit about half the time through C7c's joint travel. So the weight stays at the pre-registered 0.3, and the travel hoo's effect on recruitment is weaker than in Budongo.

#### C10 addendum 2: gestures (C10b) blocked on the source table

The type-to-meaning lexicon of hobaiterByrne2014 cannot be transcribed from here: the publisher and ScienceDirect refuse automated access, and the paper is not in PubMed Central. Accessible secondary accounts name only a few pairs (a rear foot extended to offer a ride; grabbing for "stop" or "move away"; leaf nibbling as a sexual advance). Two options, for the integrator or user:
- supply the PDF, and the lexicon will be transcribed; or
- accept abstract gesture types with the three request meanings the simulation uses (groom me, play with me, follow me), labelled a stylization.

T-COM-10 stays n/a until then.

### Stage C11: Calibration and validation report (O12)
**Goal**: sensitivity analysis, history matching, ABC posterior, held-out posterior predictive checks, ODD document, validation report.
**Success Criteria**:
- Morris screening over ≥ 30 calibratable parameters; ≥ 3 history-matching waves; posterior written.
- ≥ 80% of the 37 fitted targets inside their bands at the posterior median (5 seeds).
- Held-out coverage reported for all 60 held-out targets with standardized errors; encoded targets listed separately. The aim is ≥ 60% inside 90% predictive intervals; the report is the deliverable either way.
- `docs/odd.md` complete per [grimm2020]; `docs/simulation.md` §18 regenerated from the observer.
**Tests**: `tests/calibration-lib.test.ts` (Latin hypercube and Morris designs have the right marginals; the GP emulator interpolates a known function; implausibility and ABC distance match hand calculations).
**Proof**: `scripts/sa-morris.ts`, `scripts/calibrate.ts`, `scripts/validate.ts`; `artifacts/validation/<date>/report.md` in the §7.5 format.
**Effort / risk**: L (5–8 days plus 2–4 nights of compute). Risk: medium (emulator quality on noisy ABM outputs; ten Broeke et al. warn variance-based indices can mislead on skewed outputs).
**Status**: Not Started


#### C11 pre-registration (29 September 2026, docs only; nothing built, no run)

This fixes C11's rules before any calibration code or run. It refines §7, and where the two differ, this text applies. C11 starts after the combined proof, and the proof's scorecard is the pre-calibration reference.

**1. What is calibrated.**
- **Candidates.** Registry entries with `calibrate: true` at the C11 freeze, plus the knobs below. Registry flags change before the freeze only, each change logged.
  - The 16 now flagged: `amenorrheaMinY`, `dispersalHazardPerY`, `fecundityMax`, `foodCallBase`, `fruitIntakePerH`, `gangImpulseP`, `hazardInfant`, `hearPantHootM`, `huntDayPerMale`, `huntSuccessMax`, `huntSuccessRate`, `partyLinkM`, `patrolH0`, `sightDayM`, `tensionHalfLifeDays`, `walkMps`.
  - Proposed additions, knobs that stages set by design: `territoryCostA`, `territoryCostB`, `patrolIncursionP`, `partyFollowW`, `partyFollowBase`, `joinSocialW`, `crowdCompeteW`, `memTravelHungerW`, `contactCallW`, `partyStayW`, `revisitW`, `fallbackForageW`, `forageDistScaleM`, `joinCallDistScaleM`, `riskMaleW`, `encounterGapH`. Each stage owner confirms or strikes its knobs before the freeze. C8 names its demography parameters; they are refitted only in step 5b.
  - About 32 candidates in all, plus C8's.
- **Never calibrated.**
  - Ablation switches.
  - Values taken from data: phenology, P-FOOD-1 density, T-FIS-5's band.
  - The C10 signature SDs, fitted offline to T-COM-5.
  - Parameters whose registry `range` is a hard physical bound.
- **Priors.** Uniform over each registry `range`, or the registry `prior` where one is given. A prior is never widened after any held-out value from C11 has been seen. A posterior piled against a range edge is reported, not fixed.
- **Statistics used.** Fitted rows of data/targets.json only, with these exclusions:
  - flagged compromised, not scorable or held as fail (T-RNG-4);
  - fixed by construction: T-FOOD-1 (the ingested phenology) and T-COM-5 (the offline fit);
  - pattern rows with no numeric band. These are checked at the end as constraints and reported pass or fail.
- **Encoded fitted rows** (T-IGE-4, T-SOC-8, T-COM-1, T-COM-11) enter the fit like any other (§7.3) and are never cited as validation. Held-out rows, C12 development diagnostics and the Gombe paths never enter priors, distances or any decision.
- **Field value and uncertainty per statistic.**
  - z is the band midpoint, and Var_obs = ((hi − lo) / 4)², treating the band as ±2 SD (§7.3). One-sided bands are checked as constraints.
  - Discrepancy variance: 10% of z², or 25% for the hunting rows (T-HUN-1, -2, -3, -7), whose rates differ strongly among Kibale sites.
  - Stochastic variance comes from the noise floor (step 0).

**2. Seeds, all reserved and never run before C11.**
- Calibration pool C: 7004–7023.
  - Step 0 uses all 20.
  - Design points use common random numbers: screening on 7021 and 7022; history matching and the direct confirmation on 7021, 7022, 7023, 7004 and 7005.
- Validation set V1: 8101, 8202, 8303, 8404, 8505, for the posterior predictive field rows and the Gombe paths.
- Scenario set V2: 8606, 8707, 8808, 8909, 9010, for the expansion scenario (T-LET-4, T-LET-5) and the C9 scenario at the posterior median.
- Demography set V3: 9202, 9303, 9404, 9505, 9606 (step 5b).
- None overlaps 48/7/21/5/11, 101–505, the patrol re-test set, the C8 sets, the C9 set or any direction-check seed. The sets are in AGENTS.md's reserved list.
- *Seed replacement (30 September 2026, before any C11 run):* 7001, 7002 and 7003 became 7021, 7022 and 7023, each in the same role, and 9101 became 9606. The decide-ft track had run model-driven worlds on them (protocolLog).

**3. Method** (§7.2, with the budget fixed now). Field profile, observer on, 180-day burn-in.
- **Step 0, noise floor.** Default parameters on the 20 C seeds × 1 year. Gives the per-statistic SD, which feeds the emulator nugget and the distance.
- **Step 1, Morris screening** [morris1991] [campolongo2007]. r = 16 trajectories picked for spread from 500 candidates, 4 levels, 2 seeds, 1-year runs. A parameter is frozen at its default when its μ* is below 5% of the largest μ* on every fitted statistic; μ* comes with bootstrap intervals. One-at-a-time sweeps of the top 5 show response shape [tenBroeke2016].
- **Step 2, history matching** [vernon2010] [andrianakis2015]. Three waves of 200 maximin Latin-hypercube points over the region not yet ruled out, 5 seeds, 2-year runs.
  - One Gaussian-process emulator per statistic: squared-exponential kernel, maximum-likelihood length scales, nugget from step 0.
  - Implausibility I = |z − E[f(x)]| / √(Var_em + Var_obs + Var_disc).
  - Waves 1–2 rule out points with max I > 3. Wave 3 adds the second- and third-maximum tests (> 2.5 and > 2.0).
  - A statistic joins the maximum only once its emulator's leave-one-out diagnostics pass: ≥ 90% of standardized LOO errors within ±2.
- **Step 3, posterior.**
  - ABC rejection on 100,000 emulator draws from the final non-implausible region. Distance = Σ ((E[f(x)] − z) / √(Var_obs + Var_sim))² [vanderVaart2015]. Tolerance: accept the closest 1%.
  - Then local-linear regression adjustment [beaumont2002].
  - Confirmed with direct runs: 100 posterior draws × 5 C seeds. The emulator is trusted only if the direct runs' distance distribution matches it within a two-sample KS test at p > 0.05; otherwise another wave runs.
  - The calibrated model is the posterior median. Its registry hash is logged at the C11 freeze.
- **Step 4, Sobol indices** on the emulators [saltelli2010], with ten Broeke's caveat on skewed outputs noted per statistic.
- **Step 5, held-out validation** on V1 at the posterior: 50 posterior draws × 5 seeds × 1 year, the full observer.
- **Step 5b, demography.** 40-year natural-aging runs on V3: the C8 demography parameters refitted within their priors (about 60 runs), then 10 posterior draws × 5 seeds.

**4. How held-out targets are reported.**
- **For each held-out row:** field value and uncertainty; predictive median and 90% interval over draws × seeds; standardized error (z − median) / √(Var_pred + Var_obs); covered if |z − median| ≤ 1.645 √(Var_pred + Var_obs); and the band verdict at the posterior median.
- **Headline:** coverage over the counted held-out rows. Counted rows exclude those flagged compromised, encoded, not scorable or partially encoded. Rows labelled model revised post-freeze count, with the label shown.
- **Scenario rows** (T-LET-4, T-LET-5, T-FIS-1…5) run once at the posterior median on V2, because they are too costly per draw. They are scored by their frozen scripts and reported beside, not in, the coverage number.
- **Gombe 15-min paths:** the held-out movement validation. Fresh follows come from `compare-movement.ts` on V1 at the posterior median, then `compare-gombe-paths.ts`. The verdict rules are those of the script; its paired seed rule is extended to V1.
- **C12 Taï and Ngogo comparisons:** re-run at the posterior median and shown as development diagnostics, never counted.
- **Pre-calibration reference:** every row also shows the combined proof's value, so the calibration's effect is visible.

**5. Report format.** `artifacts/validation/c11-<date>/report.md` and `.json`: §7.5 with these sections.
1. Manifest: code hashes of `src/sim` and `src/field`, registry hash before and after, protocol freeze, profile, seed sets, run lengths, observer config.
2. Fitted table.
3. Held-out table, with the headline coverage and each label's rows listed apart.
4. Scenario rows.
5. Gombe paths.
6. Parameters: prior, posterior median and 90% interval, Morris μ*, Sobol total index, edge flags, and whether frozen at screening.
7. Observation bias: observed vs truth.
8. Ablation table from the combined proof, re-run at the posterior median for C7a, C7c, C7e, C8, C10 and the patrol corrections on V1 × 2 years.
9. Off-target list, with suspected mechanisms.

A condensed copy regenerates docs/simulation.md §18 and the guide JSON (`guide-data.ts`). `docs/odd.md` follows [grimm2020].

**6. Reuse and scripts.**
- `scripts/lib/design.ts`, `scripts/lib/gp.ts`, `scripts/sa-morris.ts` and `scripts/calibrate.ts` as in §7.4. Every simulation job goes through `runFieldJob` in the worker pool.
- `scripts/validate.ts` runs the posterior predictive.
- The posterior-median runs reuse the proof runner: `scripts/proof.ts` gains `--params-file` and `--seed-set` overrides, then `proof.ts --run --params-file posterior-median.json --seed-set V1,V2` covers the ablations, the comparisons, compare-patrols and guide-data.
- `--dry-run` carries over.
- Tests: `tests/calibration-lib.test.ts` (§8).

**7. Compute budget** (estimates at the combined proof's planning costs).

| Step | Wall time at 6 workers |
| --- | --- |
| Step 0 | 10 min |
| Step 1 | about 6 h |
| Step 2 | about 15 h |
| Step 3 | about 6 h |
| Step 5 | about 2 h |
| Posterior-median runs | about 8 h |
| Step 5b | about 30 h |

About 67 h in all, or 3–4 nights at 6 workers, and about 3× that at 2. If the budget must shrink, the order is fixed now: first r = 12, then 2 history-matching waves plus a smaller third, and step 5b last.

**8. Guardrails.**
- The protocol and registry hashes are frozen before step 1. Any change after that is logged under the protocol policy.
- No parameter is changed outside the design.
- Held-out outputs are computed only in step 5 and after, and are never looked at before the posterior is frozen.
- If the posterior-median model fails a fitted row that passed before calibration, it is reported, and nothing is re-tuned after validation.
---

## 9. Datasets

None were downloaded into the project. Every Dryad and Zenodo DOI and license below was checked against DataCite on 28 September 2026 (contents as described by the landing pages and the research pass). Dryad files download through the web interface; its API needs a login token, so downloading is a human step.

### Open, ready to ingest

| Dataset | Where | License | Contents | Use | How to ingest |
| --- | --- | --- | --- | --- | --- |
| Ngogo phenology 1998–2017 [potts2020] | [doi:10.5061/dryad.gf1vhhmk8](https://doi.org/10.5061/dryad.gf1vhhmk8) | CC0 | `Ngogo_phenology_data_full_set.csv` (15.2 MB, 717 trees, monthly presence of ripe fruit); `phenology_file_Jan2020.csv` (monthly ripe fruit score, rain, temperature, solar radiation) | O8 forcing; T-FOOD-1 | `scripts/ingest-phenology.ts`: per-species monthly ripe share and a year series into `data/phenology/ngogo.json` |
| Kanyawara phenology 1998–2013 [chapman2018] | [doi:10.5281/zenodo.1194839](https://doi.org/10.5281/zenodo.1194839) | CC BY 4.0 (attribution) | `forest.csv`: 185 months; trees monitored, number and share with ripe fruit, min/max temperature, rain, solar radiation, ENSO index | Second site profile; between-year variability | Same script into `data/phenology/kanyawara.json` |
| Kibale phenology incl. leaves and flowers (Federman et al. supplement, deposited as "Supporting Data: The paucity of frugivores in Madagascar…") | [doi:10.5281/zenodo.192841](https://doi.org/10.5281/zenodo.192841) | CC BY 4.0 | `kibale.csv`: the Kanyawara series plus unripe fruit, young and mature leaves, flowers; R scripts. Its `month` column counts from June. | Fallback-food seasonality (young leaves) | Same script; re-index months |
| Ngogo fission, 1998–2022 [sandel2026] | [doi:10.5061/dryad.sf7m0cgkg](https://doi.org/10.5061/dryad.sf7m0cgkg) | CC0 | `chimp_behav_data.csv` (10-min proximity, grooming, party data), yearly adjacency matrices (219 individuals; 77-male proximity network), group labels, quarterly patrol counts, population snapshots by age and sex | Held-out only: T-FIS-1..4, T-SOC-1, T-PAT | Loader in `scripts/scenario.ts large-community` for yearly Q and cluster sizes |
| Ngogo fission space use and code | Zenodo records 18603419 (GPS, 15 MB) and 18626723 (network code and data) | CC BY 4.0 | `gps_qualified.csv`, cluster membership by year, R Markdown | Held-out: cluster ranging divergence | Same loader |
| Ngogo patrol participation [langergraber2017] | [doi:10.5061/dryad.kk33f](https://doi.org/10.5061/dryad.kk33f) | CC0 | 284 patrols × males ≥ 13 y, participation, age | T-PAT-2, T-PAT-3 | Summaries into `data/validation/ngogo-patrols.json` |
| Gombe life tables [bronikowski2016] | [doi:10.5061/dryad.v28t5](https://doi.org/10.5061/dryad.v28t5) | CC0 | One xlsx: female and male life tables (1-year classes), female fertility by age; Gombe 1963–2013 | Cross-site demography check (held out) | Export sheets 2A/2B to CSV; filter chimpanzee |
| Kanyawara female relationships (Fox et al., Phil Trans B, rstb.2021.0427) | [doi:10.5061/dryad.44j0zpchh](https://doi.org/10.5061/dryad.44j0zpchh) | CC0 | Kibale females 2010–2019: dyadic association, 5 m proximity, grooming, coalitions | T-SOC-4 | Summaries only |
| Budongo party composition (Ramos-Fernández et al., Proc R Soc B, rspb.2018.0532) | [doi:10.5061/dryad.51b68](https://doi.org/10.5061/dryad.51b68) | CC0 | Presence/absence of each individual every 15 min, 2008–2009 | Party-size distribution; checks the observer's scan format | Direct comparison |
| Gombe female ranges (Pusey & Schroepfer-Walker, Phil Trans B, rstb.2013.0077) | [doi:10.5061/dryad.jg05d](https://doi.org/10.5061/dryad.jg05d) | CC0 | UTM locations, Kasekela, 2000–2003 | Female core areas | Kernel isopleths |
| Chimpanzee drumming [eleuteri2025] | [doi:10.5281/zenodo.15175482](https://doi.org/10.5281/zenodo.15175482) | CC BY 4.0 | `drumming_long.csv`, `drumming_wide.csv`: hits per bout, intervals, community | T-COM-6 | Summaries into signature priors |
| Kanyawara respiratory health [emeryThompson2018] | [doi:10.5061/dryad.1m004jc](https://doi.org/10.5061/dryad.1m004jc) | CC0 | Health monitoring records behind the paper | T-DEM-5..8 | Outbreak and monthly illness summaries |
| Wood et al. 2023 supplement [wood2023] | journal supplementary materials (`Supplemental_data.zip`) | journal terms | Ngogo fertility and survival data and R functions | T-DEM-10 | Summaries only |
| Tables printed in papers | [wood2017] Tables 2–3; [hill2001] Tables 1–2; [wilson2014] Extended Data Tables 1–4; [muller2020] Tables 2–3 | journal terms | Life tables; deaths and years at risk by age and site; killings case list; fertility risk-years | Baseline hazards (P-DEM-2); T-LET-1..3; T-DEM-10 | Transcribe summary numbers into `data/validation/` with page references |

### Not open: worth requesting

| Data | Holder | Why it matters |
| --- | --- | --- |
| Activity budgets by age and sex, day ranges, and party composition with phenology, Kanyawara 1987– | Kibale Chimpanzee Project (Harvard, Emery Thompson, Muller, Machanda, Wrangham) | The biggest gap: T-ACT and T-PTY rest on Budongo and abstracts. Kibale sex-specific budgets would replace them. |
| Focal activity by sex and ranging, Ngogo | Ngogo Chimpanzee Project (Mitani, Watts, Langergraber, Wood) | Same, for the second Kibale site. |
| Taï GPS feeding-tree records | Taï Chimpanzee Project (Janmaat, Normand, Boesch) | Raw data for nearest-tree choice, revisits, approach distances (T-FOOD-4..10). |
| Primate Life History Database | PLHD working group [strier2010] | Access is limited to working-group members; a public demo schema exists. |
| Sandel & Watts 2021 data | on request from the authors | Victim association histories (T-FIS-4). |
| Pant-hoot recordings (Desai et al. 2022) | authors (code on GitHub) | Feature distributions for signatures (T-COM-5). |

---

## 10. Open questions and risks

### What cannot be validated without raw field data

| Gap | Effect | Mitigation |
| --- | --- | --- |
| Kibale activity budgets by sex are not verified (figures only, paywalled chapters) | T-ACT rests on Budongo Waibira plus Kanyawara female feeding minutes | Wide bands; request Kibale data |
| No primary measurement of forest visibility or pant-hoot audibility (all "1–2 km" values are secondary) | Sight and hearing are priors, not facts | Keep them calibratable with wide priors; T-IGE-2 is held out and tests their ratio |
| Distributions, not just means: most sources give means ± SD | ABC uses means and a few quantiles; distribution shape is weakly constrained | Use the open Budongo 15-min scans and Ngogo networks where possible |
| Colobus vital rates at Ngogo not verified (Teelen 2008 abstract only) | Prey scenario tests direction, not rate | Report as qualitative |
| Fission: two cases worldwide | No rate can be fitted; any outcome is weak evidence | All fission targets held out; negative results reported |
| Individual-level histories (who bonds with whom for how long) | Only summary statistics compared | Ngogo network data for held-out comparison |

### Model and method risks

| Risk | Likelihood | Impact | Response |
| --- | --- | --- | --- |
| Synthetic landscape and small communities differ from every field site | Certain | Site values cannot be matched exactly | Discrepancy variance per target; bands scaled to community size and stated |
| Many "held-out" patterns are partly encoded in hand-designed rules | High | Inflated validation claims | `encoded` flag; report encoded targets separately; replace direct terms with mechanisms (energy instead of fruit, males emerging from joining) |
| Distance-dependent score terms break silently at the field scale | High | Behavior shifts in C5a | Registry first (C4), lint for untagged literals, profile values for every spatial constant |
| Performance: field scale, memory and territories push past 0.3 s per eco-day | Medium | Calibration takes too long | Lazy fruit, spatial grids, per-stage bench gates; fall back to shorter runs for screening |
| Two clocks: behavior-driven demography is distorted at `ageRate` 365 | Certain | Life-course demographics mislead | Validate demography only in natural aging; life course stays a demonstration |
| Population cap 120 biases fertility | Certain | T-DEM-10, -12 biased | Measure below 90% of the cap; raise the cap after C5a grids |
| Observer classifiers differ from field definitions (for example the encounter radius is 100 m at Kanyawara and 50 m at Gombe) | Medium | Cross-site comparisons shift | Each target names its source's definition; the observer implements that one |
| Save size grows (UD grids, tree memory, association ledgers) | High | C2 persistence budget (< 1 s saves) | Report size per stage; sparse storage; persistence design (B2) must plan for ~1–2 MB worlds |
| Renderer work for O3 is unscheduled | High | Field profile stays headless | Add C5b to `IMPLEMENTATION_PLAN.md` with the renderer owner |
| Determinism fixtures change at every stage that adds RNG draws | Certain | Test churn | Re-record golden fixtures in the same change with the reason stated |
| GP emulators on noisy, skewed ABM outputs | Medium | Wrong ruled-out regions | Replicate runs per design point, conservative implausibility cut-off 3, direct-run confirmation of the final region |

### Open questions for the integrator

1. Should ChimpBench keep three small communities (Budongo/Gombe scale) or grow one toward Kanyawara size (~50, 10+ males)? Many targets are from larger communities; growing costs performance.
2. Which site profile is the default for phenology and fallback foods: Ngogo (leaves as fallback, figs a staple) or Kanyawara (pith as fallback)? The design supports both; calibration should target one.
3. Is the field profile's scale factor of 50 (8 km map) acceptable for the renderer's overview, or should the overview use a different aggregation?
4. Should the observer run in the browser (a live "field notebook" panel), or stay script-only until C11?

---

## Sources

Bibliographic data checked against Crossref on 2026-09-28. Access: FT = full text read, Abs = abstract only, Data = dataset inspected, Meta = metadata only.

| Key | Reference | Access |
| --- | --- | --- |
| altmann1974 | Altmann J 1974. Observational Study of Behavior: Sampling Methods. *Behaviour* 49(3-4):227-266. [doi:10.1163/156853974x00534](https://doi.org/10.1163/156853974x00534) | Abs |
| amsler2010 | Amsler SJ 2010. Energetic costs of territorial boundary patrols by wild chimpanzees. *American Journal of Primatology* 72(2):93-103. [doi:10.1002/ajp.20757](https://doi.org/10.1002/ajp.20757) | FT |
| andrianakis2015 | Andrianakis I, Vernon IR, McCreesh N et al. 2015. Bayesian History Matching of Complex Infectious Disease Models Using Emulation: A Tutorial and a Case Study on HIV in Uganda. *PLoS Computational Biology* 11(1):e1003968. [doi:10.1371/journal.pcbi.1003968](https://doi.org/10.1371/journal.pcbi.1003968) | FT |
| arcadi1998 | Arcadi AC, Robert D, Boesch C 1998. Buttress drumming by wild chimpanzees: Temporal patterning, phrase integration into loud calls, and preliminary evidence for individual distinctiveness. *Primates* 39(4):505-518. [doi:10.1007/BF02557572](https://doi.org/10.1007/BF02557572) | FT |
| arnoldWhiten2001 | Arnold K, Whiten A 2001. POST-CONFLICT BEHAVIOUR OF WILD CHIMPANZEES (PAN TROGLODYTES SCHWEINFURTHII) IN THE BUDONGO FOREST, UGANDA. *Behaviour* 138(5):649-690. [doi:10.1163/156853901316924520](https://doi.org/10.1163/156853901316924520) | Abs |
| ban2014 | Ban SD, Boesch C, Janmaat KRL 2014. Taï chimpanzees anticipate revisiting high-valued fruit trees from further distances. *Animal Cognition* 17(6):1353-1364. [doi:10.1007/s10071-014-0771-y](https://doi.org/10.1007/s10071-014-0771-y) | FT |
| batesByrne2009 | Bates LA, Byrne RW 2009. Sex differences in the movement patterns of free-ranging chimpanzees (Pan troglodytes schweinfurthii): foraging and border checking. *Behavioral Ecology and Sociobiology* 64(2):247-255. [doi:10.1007/s00265-009-0841-3](https://doi.org/10.1007/s00265-009-0841-3) | FT |
| beaumont2002 | Beaumont MA, Zhang W, Balding DJ 2002. Approximate Bayesian Computation in Population Genetics. *Genetics* 162(4):2025-2035. [doi:10.1093/genetics/162.4.2025](https://doi.org/10.1093/genetics/162.4.2025) | Abs |
| boesch2006 | Boesch C, Kohou G, Néné H et al. 2006. Male competition and paternity in wild chimpanzees of the Taï forest. *American Journal of Physical Anthropology* 130(1):103-115. [doi:10.1002/ajpa.20341](https://doi.org/10.1002/ajpa.20341) | Abs |
| bray2016 | Bray J, Pusey AE, Gilby IC 2016. Incomplete control and concessions explain mating skew in male chimpanzees. *Proceedings of the Royal Society B: Biological Sciences* 283(1842):20162071. [doi:10.1098/rspb.2016.2071](https://doi.org/10.1098/rspb.2016.2071) | Abs |
| bronikowski2016 | Bronikowski AM, Cords M, Alberts SC et al. 2016. Female and male life tables for seven wild primate species. *Scientific Data* 3(1):160006. [doi:10.1038/sdata.2016.6](https://doi.org/10.1038/sdata.2016.6) | FT |
| campolongo2007 | Campolongo F, Cariboni J, Saltelli A 2007. An effective screening design for sensitivity analysis of large models. *Environmental Modelling & Software* 22(10):1509-1518. [doi:10.1016/j.envsoft.2006.10.004](https://doi.org/10.1016/j.envsoft.2006.10.004) | FT |
| chapman1999 | Chapman CA, Wrangham RW, Chapman LJ et al. 1999. Fruit and flower phenology at two sites in Kibale National Park, Uganda. *Journal of Tropical Ecology* 15(2):189-211. [doi:10.1017/S0266467499000759](https://doi.org/10.1017/S0266467499000759) | Abs |
| chapman2005 | Chapman CA, Chapman LJ, Struhsaker TT et al. 2005. A long-term evaluation of fruiting phenology: importance of climate change. *Journal of Tropical Ecology* 21(1):31-45. [doi:10.1017/S0266467404001993](https://doi.org/10.1017/S0266467404001993) | FT |
| chapman2018 | Chapman CA, Valenta K, Bonnell TR et al. 2018. Solar radiation and ENSO predict fruiting phenology patterns in a 15‐year record from Kibale National Park, Uganda. *Biotropica* 50(3):384-395. [doi:10.1111/btp.12559](https://doi.org/10.1111/btp.12559) | Data |
| chapman2023 | Chapman CA, Angedakin S, Butynski TM et al. 2023. Primate population dynamics in Ngogo, Kibale National Park, Uganda, over nearly five decades. *Primates* 64(6):609-620. [doi:10.1007/s10329-023-01087-4](https://doi.org/10.1007/s10329-023-01087-4) | FT |
| clarkArcadi2004 | Clark Arcadi A, Robert D, Mugurusi F 2004. A comparison of buttress drumming by male chimpanzees from two populations. *Primates* 45(2):135-139. [doi:10.1007/s10329-003-0070-8](https://doi.org/10.1007/s10329-003-0070-8) | FT |
| clarkWrangham1994 | Clark AP, Wrangham RW 1994. Chimpanzee arrival pant-hoots: Do they signify food or status?. *International Journal of Primatology* 15(2):185-205. [doi:10.1007/BF02735273](https://doi.org/10.1007/BF02735273) | Abs |
| crockford2012 | Crockford C, Wittig RM, Mundry R et al. 2012. Wild Chimpanzees Inform Ignorant Group Members of Danger. *Current Biology* 22(2):142-146. [doi:10.1016/j.cub.2011.11.053](https://doi.org/10.1016/j.cub.2011.11.053) | FT |
| crockford2020 | Crockford C, Samuni L, Vigilant L et al. 2020. Postweaning maternal care increases male chimpanzee reproductive success. *Science Advances* 6(38):eaaz5746. [doi:10.1126/sciadv.aaz5746](https://doi.org/10.1126/sciadv.aaz5746) | FT |
| csillery2010 | Csilléry K, Blum MG, Gaggiotti OE et al. 2010. Approximate Bayesian Computation (ABC) in practice. *Trends in Ecology & Evolution* 25(7):410-418. [doi:10.1016/j.tree.2010.04.001](https://doi.org/10.1016/j.tree.2010.04.001) | Abs |
| desai2022 | Desai NP, Fedurek P, Slocombe KE et al. 2022. Chimpanzee pant‐hoots encode individual information more reliably than group differences. *American Journal of Primatology* 84(11):e23430. [doi:10.1002/ajp.23430](https://doi.org/10.1002/ajp.23430) | FT |
| doran1997 | Doran D 1997. Influence of Seasonality on Activity Patterns, Feeding Behavior, Ranging, and Grouping Patterns in Taï Chimpanzees. *International Journal of Primatology* 18(2):183-206. [doi:10.1023/A:1026368518431](https://doi.org/10.1023/A:1026368518431) | Abs |
| eleuteri2022 | Eleuteri V, Henderson M, Soldati A et al. 2022. The form and function of chimpanzee buttress drumming. *Animal Behaviour* 192:189-205. [doi:10.1016/j.anbehav.2022.07.013](https://doi.org/10.1016/j.anbehav.2022.07.013) | FT |
| eleuteri2025 | Eleuteri V, van der Werff J, Wilhelm W et al. 2025. Chimpanzee drumming shows rhythmicity and subspecies variation. *Current Biology* 35(10):2448-2456.e4. [doi:10.1016/j.cub.2025.04.019](https://doi.org/10.1016/j.cub.2025.04.019) | FT |
| emeryThompson2007 | Emery Thompson M, Jones JH, Pusey AE et al. 2007. Aging and Fertility Patterns in Wild Chimpanzees Provide Insights into the Evolution of Menopause. *Current Biology* 17(24):2150-2156. [doi:10.1016/j.cub.2007.11.033](https://doi.org/10.1016/j.cub.2007.11.033) | FT |
| emeryThompson2018 | Emery Thompson M, Machanda ZP, Scully EJ et al. 2018. Risk factors for respiratory illness in a community of wild chimpanzees ( Pan troglodytes schweinfurthii ). *Royal Society Open Science* 5(9):180840. [doi:10.1098/rsos.180840](https://doi.org/10.1098/rsos.180840) | FT |
| emeryThompson2020 | Emery Thompson M, Muller MN, Machanda ZP et al. 2020. The Kibale Chimpanzee Project: Over thirty years of research, conservation, and change. *Biological Conservation* 252:108857. [doi:10.1016/j.biocon.2020.108857](https://doi.org/10.1016/j.biocon.2020.108857) | FT |
| fedurek2022 | Fedurek P, Akankwasa JW, Danel DP et al. 2022. The effect of warning signs on the presence of snare traps in a Ugandan rainforest. *Biotropica* 54(3):721-728. [doi:10.1111/btp.13088](https://doi.org/10.1111/btp.13088) | FT |
| feldblum2018 | Feldblum JT, Manfredi S, Gilby IC et al. 2018. The timing and causes of a unique chimpanzee community fission preceding Gombe's “Four‐Year War”. *American Journal of Physical Anthropology* 166(3):730-744. [doi:10.1002/ajpa.23462](https://doi.org/10.1002/ajpa.23462) | Abs |
| foerster2015 | Foerster S, McLellan K, Schroepfer-Walker K et al. 2015. Social bonds in the dispersing sex: partner preferences among adult female chimpanzees. *Animal Behaviour* 105:139-152. [doi:10.1016/j.anbehav.2015.04.012](https://doi.org/10.1016/j.anbehav.2015.04.012) | FT |
| foerster2016 | Foerster S, Franz M, Murray CM et al. 2016. Chimpanzee females queue but males compete for social status. *Scientific Reports* 6(1):35404. [doi:10.1038/srep35404](https://doi.org/10.1038/srep35404) | FT |
| fraser2008 | Fraser ON, Schino G, Aureli F 2008. Components of Relationship Quality in Chimpanzees. *Ethology* 114(9):834-843. [doi:10.1111/j.1439-0310.2008.01527.x](https://doi.org/10.1111/j.1439-0310.2008.01527.x) | Abs |
| gilby2013 | Gilby IC, Brent LJN, Wroblewski EE et al. 2013. Fitness benefits of coalitionary aggression in male chimpanzees. *Behavioral Ecology and Sociobiology* 67(3):373-381. [doi:10.1007/s00265-012-1457-6](https://doi.org/10.1007/s00265-012-1457-6) | FT |
| gilby2015 | Gilby IC, Machanda ZP, Mjungu DC et al. 2015. ‘Impact hunters’ catalyse cooperative hunting in two wild chimpanzee communities. *Philosophical Transactions of the Royal Society B: Biological Sciences* 370(1683):20150005. [doi:10.1098/rstb.2015.0005](https://doi.org/10.1098/rstb.2015.0005) | FT |
| gilbyWrangham2007 | Gilby IC, Wrangham RW 2007. Risk-prone hunting by chimpanzees (Pan troglodytes schweinfurthii) increases during periods of high diet quality. *Behavioral Ecology and Sociobiology* 61(11):1771-1779. [doi:10.1007/s00265-007-0410-6](https://doi.org/10.1007/s00265-007-0410-6) | Abs |
| gilbyWrangham2008 | Gilby IC, Wrangham RW 2008. Association patterns among wild chimpanzees (Pan troglodytes schweinfurthii) reflect sex differences in cooperation. *Behavioral Ecology and Sociobiology* 62(11):1831-1842. [doi:10.1007/s00265-008-0612-6](https://doi.org/10.1007/s00265-008-0612-6) | Abs |
| grimm2005 | Grimm V, Revilla E, Berger U et al. 2005. Pattern-Oriented Modeling of Agent-Based Complex Systems: Lessons from Ecology. *Science* 310(5750):987-991. [doi:10.1126/science.1116681](https://doi.org/10.1126/science.1116681) | Abs |
| grimm2006 | Grimm V, Berger U, Bastiansen F et al. 2006. A standard protocol for describing individual-based and agent-based models. *Ecological Modelling* 198(1-2):115-126. [doi:10.1016/j.ecolmodel.2006.04.023](https://doi.org/10.1016/j.ecolmodel.2006.04.023) | Meta |
| grimm2010 | Grimm V, Berger U, DeAngelis DL et al. 2010. The ODD protocol: A review and first update. *Ecological Modelling* 221(23):2760-2768. [doi:10.1016/j.ecolmodel.2010.08.019](https://doi.org/10.1016/j.ecolmodel.2010.08.019) | Meta |
| grimm2020 | Grimm V, Railsback SF, Vincenot CE et al. 2020. The ODD Protocol for Describing Agent-Based and Other Simulation Models: A Second Update to Improve Clarity, Replication, and Structural Realism. *Journal of Artificial Societies and Social Simulation* 23(2):7. [doi:10.18564/jasss.4259](https://doi.org/10.18564/jasss.4259) | FT |
| hartig2011 | Hartig F, Calabrese JM, Reineking B et al. 2011. Statistical inference for stochastic simulation models - theory and application. *Ecology Letters* 14(8):816-827. [doi:10.1111/j.1461-0248.2011.01640.x](https://doi.org/10.1111/j.1461-0248.2011.01640.x) | Abs |
| hill2001 | Hill K, Boesch C, Goodall J et al. 2001. Mortality rates among wild chimpanzees. *Journal of Human Evolution* 40(5):437-450. [doi:10.1006/jhev.2001.0469](https://doi.org/10.1006/jhev.2001.0469) | FT |
| hobaiterByrne2011 | Hobaiter C, Byrne RW 2011. The gestural repertoire of the wild chimpanzee. *Animal Cognition* 14(5):745-767. [doi:10.1007/s10071-011-0409-2](https://doi.org/10.1007/s10071-011-0409-2) | FT |
| hobaiterByrne2014 | Hobaiter C, Byrne RW 2014. The Meanings of Chimpanzee Gestures. *Current Biology* 24(14):1596-1600. [doi:10.1016/j.cub.2014.05.066](https://doi.org/10.1016/j.cub.2014.05.066) | FT |
| jang2019 | Jang H, Boesch C, Mundry R et al. 2019. Travel linearity and speed of human foragers and chimpanzees during their daily search for food in tropical rainforests. *Scientific Reports* 9(1):11066. [doi:10.1038/s41598-019-47247-9](https://doi.org/10.1038/s41598-019-47247-9) | FT |
| janmaat2013a | Janmaat KR, Ban SD, Boesch C 2013. Chimpanzees use long-term spatial memory to monitor large fruit trees and remember feeding experiences across seasons. *Animal Behaviour* 86(6):1183-1205. [doi:10.1016/j.anbehav.2013.09.021](https://doi.org/10.1016/j.anbehav.2013.09.021) | FT |
| janmaat2013b | Janmaat KRL, Ban SD, Boesch C 2013. Taï chimpanzees use botanical skills to discover fruit: what we can learn from their mistakes. *Animal Cognition* 16(6):851-860. [doi:10.1007/s10071-013-0617-z](https://doi.org/10.1007/s10071-013-0617-z) | FT |
| janmaat2014 | Janmaat KRL, Polansky L, Ban SD et al. 2014. Wild chimpanzees plan their breakfast time, type, and location. *Proceedings of the National Academy of Sciences* 111(46):16343-16348. [doi:10.1073/pnas.1407524111](https://doi.org/10.1073/pnas.1407524111) | FT |
| janmaat2016 | Janmaat KR, Boesch C, Byrne R et al. 2016. Spatio‐temporal complexity of chimpanzee food: How cognitive adaptations can counteract the ephemeral nature of ripe fruit. *American Journal of Primatology* 78(6):626-645. [doi:10.1002/ajp.22527](https://doi.org/10.1002/ajp.22527) | FT |
| jones2010 | Jones JH, Wilson ML, Murray C et al. 2010. Phenotypic quality influences fertility in Gombe chimpanzees. *Journal of Animal Ecology* 79(6):1262-1269. [doi:10.1111/j.1365-2656.2010.01687.x](https://doi.org/10.1111/j.1365-2656.2010.01687.x) | FT |
| kaburuNewtonFisher2015 | Kaburu SS, Newton-Fisher NE 2015. Egalitarian despots: hierarchy steepness, reciprocity and the grooming-trade model in wild chimpanzees, Pan troglodytes. *Animal Behaviour* 99:61-71. [doi:10.1016/j.anbehav.2014.10.018](https://doi.org/10.1016/j.anbehav.2014.10.018) | FT |
| kalanBoesch2015 | Kalan AK, Boesch C 2015. Audience effects in chimpanzee food calls and their potential for recruiting others. *Behavioral Ecology and Sociobiology* 69(10):1701-1712. [doi:10.1007/s00265-015-1982-1](https://doi.org/10.1007/s00265-015-1982-1) | Abs |
| kutsukakeCastles2004 | Kutsukake N, Castles D 2004. Reconciliation and post-conflict third-party affiliation among wild chimpanzees in the Mahale Mountains, Tanzania. *Primates* 45(3):None. [doi:10.1007/s10329-004-0082-z](https://doi.org/10.1007/s10329-004-0082-z) | Abs |
| langergraber2007 | Langergraber KE, Mitani JC, Vigilant L 2007. The limited impact of kinship on cooperation in wild chimpanzees. *Proceedings of the National Academy of Sciences* 104(19):7786-7790. [doi:10.1073/pnas.0611449104](https://doi.org/10.1073/pnas.0611449104) | Abs |
| langergraber2017 | Langergraber KE, Watts DP, Vigilant L et al. 2017. Group augmentation, collective action, and territorial boundary patrols by male chimpanzees. *Proceedings of the National Academy of Sciences* 114(28):7337-7342. [doi:10.1073/pnas.1701582114](https://doi.org/10.1073/pnas.1701582114) | FT |
| lehmannBoesch2008 | Lehmann J, Boesch C 2008. Sexual Differences in Chimpanzee Sociality. *International Journal of Primatology* 29(1):65-81. [doi:10.1007/s10764-007-9230-9](https://doi.org/10.1007/s10764-007-9230-9) | Abs |
| lemoine2020a | Lemoine S, Preis A, Samuni L et al. 2020. Between-Group Competition Impacts Reproductive Success in Wild Chimpanzees. *Current Biology* 30(2):312-318.e3. [doi:10.1016/j.cub.2019.11.039](https://doi.org/10.1016/j.cub.2019.11.039) | FT |
| lemoine2020b | Lemoine S, Boesch C, Preis A et al. 2020. Group dominance increases territory size and reduces neighbour pressure in wild chimpanzees. *Royal Society Open Science* 7(5):200577. [doi:10.1098/rsos.200577](https://doi.org/10.1098/rsos.200577) | FT |
| lewis2023 | Lewis LS, Wessling EG, Kano F et al. 2023. Bonobos and chimpanzees remember familiar conspecifics for decades. *Proceedings of the National Academy of Sciences* 120(52):e2304903120. [doi:10.1073/pnas.2304903120](https://doi.org/10.1073/pnas.2304903120) | FT |
| lwanga2011 | Lwanga J, Struhsaker T, Struhsaker P et al. 2011. Primate population dynamics over 32.9 years at Ngogo, Kibale National Park, Uganda. *American Journal of Primatology* 73(10):997-1011. [doi:10.1002/ajp.20965](https://doi.org/10.1002/ajp.20965) | Abs |
| massaro2022 | Massaro AP, Gilby IC, Desai N et al. 2022. Correlates of individual participation in boundary patrols by male chimpanzees. *Philosophical Transactions of the Royal Society B* 377(1851):20210151. [doi:10.1098/rstb.2021.0151](https://doi.org/10.1098/rstb.2021.0151) | FT |
| mitani2009 | Mitani JC 2009. Male chimpanzees form enduring and equitable social bonds. *Animal Behaviour* 77(3):633-640. [doi:10.1016/j.anbehav.2008.11.021](https://doi.org/10.1016/j.anbehav.2008.11.021) | FT |
| mitani2010 | Mitani JC, Watts DP, Amsler SJ 2010. Lethal intergroup aggression leads to territorial expansion in wild chimpanzees. *Current Biology* 20(12):R507-R508. [doi:10.1016/j.cub.2010.04.021](https://doi.org/10.1016/j.cub.2010.04.021) | FT |
| mitaniAmsler2003 | Mitani J, Amsler S 2003. Social and spatial aspects of male subgrouping in a community of wild chimpanzees. *Behaviour* 140(7):869-884. [doi:10.1163/156853903770238355](https://doi.org/10.1163/156853903770238355) | Abs |
| mitaniNishida1993 | Mitani JC, Nishida T 1993. Contexts and social correlates of long-distance calling by male chimpanzees. *Animal Behaviour* 45(4):735-746. [doi:10.1006/anbe.1993.1088](https://doi.org/10.1006/anbe.1993.1088) | FT |
| mitaniWatts1999 | Mitani JC, Watts DP 1999. Demographic influences on the hunting behavior of chimpanzees. *American Journal of Physical Anthropology* 109(4):439-454. [doi:10.1002/(SICI)1096-8644(199908)109:4<439::AID-AJPA2>3.0.CO;2-3](https://doi.org/10.1002/(SICI)1096-8644(199908)109:4<439::AID-AJPA2>3.0.CO;2-3) | FT |
| mitaniWatts2001 | Mitani JC, Watts DP 2001. Why do chimpanzees hunt and share meat?. *Animal Behaviour* 61(5):915-924. [doi:10.1006/anbe.2000.1681](https://doi.org/10.1006/anbe.2000.1681) | FT |
| mitaniWatts2005 | Mitani JC, Watts DP 2005. Correlates of territorial boundary patrol behaviour in wild chimpanzees. *Animal Behaviour* 70(5):1079-1086. [doi:10.1016/j.anbehav.2005.02.012](https://doi.org/10.1016/j.anbehav.2005.02.012) | FT |
| morris1991 | Morris MD 1991. Factorial Sampling Plans for Preliminary Computational Experiments. *Technometrics* 33(2):161-174. [doi:10.1080/00401706.1991.10484804](https://doi.org/10.1080/00401706.1991.10484804) | Abs |
| muller2020 | Muller MN, Blurton Jones NG, Colchero F et al. 2020. Sexual dimorphism in chimpanzee (Pan troglodytes schweinfurthii) and human age-specific fertility. *Journal of Human Evolution* 144:102795. [doi:10.1016/j.jhevol.2020.102795](https://doi.org/10.1016/j.jhevol.2020.102795) | FT |
| nakamura2014 | Nakamura M, Hayaki H, Hosaka K et al. 2014. Brief Communication: Orphaned male Chimpanzees die young even after weaning. *American Journal of Physical Anthropology* 153(1):139-143. [doi:10.1002/ajpa.22411](https://doi.org/10.1002/ajpa.22411) | Abs |
| negrey2019 | Negrey JD, Reddy RB, Scully EJ et al. 2019. Simultaneous outbreaks of respiratory disease in wild chimpanzees caused by distinct viruses of human origin. *Emerging Microbes & Infections* 8(1):139-149. [doi:10.1080/22221751.2018.1563456](https://doi.org/10.1080/22221751.2018.1563456) | FT |
| neumann2011 | Neumann C, Duboscq J, Dubuc C et al. 2011. Assessing dominance hierarchies: validation and advantages of progressive evaluation with Elo-rating. *Animal Behaviour* 82(4):911-921. [doi:10.1016/j.anbehav.2011.07.016](https://doi.org/10.1016/j.anbehav.2011.07.016) | Meta |
| newman2006 | Newman MEJ 2006. Modularity and community structure in networks. *Proceedings of the National Academy of Sciences* 103(23):8577-8582. [doi:10.1073/pnas.0601602103](https://doi.org/10.1073/pnas.0601602103) | Abs |
| newtonFisher2003 | Newton‐Fisher NE 2003. The home range of the Sonso community of chimpanzees from the Budongo Forest, Uganda. *African Journal of Ecology* 41(2):150-156. [doi:10.1046/j.1365-2028.2003.00408.x](https://doi.org/10.1046/j.1365-2028.2003.00408.x) | Abs |
| normand2009 | Normand E, Ban SD, Boesch C 2009. Forest chimpanzees (Pan troglodytes verus) remember the location of numerous fruit trees. *Animal Cognition* 12(6):797-807. [doi:10.1007/s10071-009-0239-7](https://doi.org/10.1007/s10071-009-0239-7) | FT |
| normandBoesch2009 | Normand E, Boesch C 2009. Sophisticated Euclidean maps in forest chimpanzees. *Animal Behaviour* 77(5):1195-1201. [doi:10.1016/j.anbehav.2009.01.025](https://doi.org/10.1016/j.anbehav.2009.01.025) | FT |
| potts2011 | Potts KB, Watts DP, Wrangham RW 2011. Comparative Feeding Ecology of Two Communities of Chimpanzees (Pan troglodytes) in Kibale National Park, Uganda. *International Journal of Primatology* 32(3):669-690. [doi:10.1007/s10764-011-9494-y](https://doi.org/10.1007/s10764-011-9494-y) | FT |
| potts2020 | Potts KB, Watts DP, Langergraber KE et al. 2020. Long‐term trends in fruit production in a tropical forest at Ngogo, Kibale National Park, Uganda. *Biotropica* 52(3):521-532. [doi:10.1111/btp.12764](https://doi.org/10.1111/btp.12764) | FT |
| pusey1997 | Pusey A, Williams J, Goodall J 1997. The Influence of Dominance Rank on the Reproductive Success of Female Chimpanzees. *Science* 277(5327):828-831. [doi:10.1126/science.277.5327.828](https://doi.org/10.1126/science.277.5327.828) | Abs |
| ramosFernandez2006 | Ramos-Fernández G, Boyer D, Gómez VP 2006. A complex social structure with fission–fusion properties can emerge from a simple foraging model. *Behavioral Ecology and Sociobiology* 60(4):536-549. [doi:10.1007/s00265-006-0197-x](https://doi.org/10.1007/s00265-006-0197-x) | Abs |
| saltelli2010 | Saltelli A, Annoni P, Azzini I et al. 2010. Variance based sensitivity analysis of model output. Design and estimator for the total sensitivity index. *Computer Physics Communications* 181(2):259-270. [doi:10.1016/j.cpc.2009.09.018](https://doi.org/10.1016/j.cpc.2009.09.018) | Meta |
| samuni2018 | Samuni L, Preis A, Mielke A et al. 2018. Social bonds facilitate cooperative resource sharing in wild chimpanzees. *Proceedings of the Royal Society B: Biological Sciences* 285(1888):20181643. [doi:10.1098/rspb.2018.1643](https://doi.org/10.1098/rspb.2018.1643) | FT |
| sandel2026 | Sandel AA, He Y, Ren J et al. 2026. Lethal conflict after group fission in wild chimpanzees. *Science* 392(6794):216-220. [doi:10.1126/science.adz4944](https://doi.org/10.1126/science.adz4944) | Abs |
| sandelWatts2021 | Sandel AA, Watts DP 2021. Lethal Coalitionary Aggression Associated with a Community Fission in Chimpanzees (Pan troglodytes) at Ngogo, Kibale National Park, Uganda. *International Journal of Primatology* 42(1):26-48. [doi:10.1007/s10764-020-00185-0](https://doi.org/10.1007/s10764-020-00185-0) | FT |
| scully2018 | Scully EJ, Basnet S, Wrangham RW et al. 2018. Lethal Respiratory Disease Associated with Human Rhinovirus C in Wild Chimpanzees, Uganda, 2013. *Emerging Infectious Diseases* 24(2):267-274. [doi:10.3201/eid2402.170778](https://doi.org/10.3201/eid2402.170778) | FT |
| slocombe2010 | Slocombe KE, Kaller T, Turman L et al. 2010. Production of food-associated calls in wild male chimpanzees is dependent on the composition of the audience. *Behavioral Ecology and Sociobiology* 64(12):1959-1966. [doi:10.1007/s00265-010-1006-0](https://doi.org/10.1007/s00265-010-1006-0) | Abs |
| stanford1994 | Stanford CB, Wallis J, Matama H et al. 1994. Patterns of predation by chimpanzees on red colobus monkeys in gombe national park, 1982–1991. *American Journal of Physical Anthropology* 94(2):213-228. [doi:10.1002/ajpa.1330940206](https://doi.org/10.1002/ajpa.1330940206) | Abs |
| strier2010 | Strier KB, Altmann J, Brockman DK et al. 2010. The Primate Life History Database: a unique shared ecological data resource. *Methods in Ecology and Evolution* 1(2):199-211. [doi:10.1111/j.2041-210x.2010.00023.x](https://doi.org/10.1111/j.2041-210x.2010.00023.x) | Abs |
| teBoekhorst1994 | Te Boekhorst IJ, Hogeweg P 1994. Self-Structuring in Artificial "Chimps" Offers New Hypotheses for Male Grouping in Chimpanzees. *Behaviour* 130(3-4):229-252. [doi:10.1163/156853994x00541](https://doi.org/10.1163/156853994x00541) | Abs |
| tenBroeke2016 | ten Broeke G, van Voorn G, Ligtenberg A 2016. Which Sensitivity Analysis Method Should I Use for My Agent-Based Model?. *Journal of Artificial Societies and Social Simulation* 19(1):5. [doi:10.18564/jasss.2857](https://doi.org/10.18564/jasss.2857) | FT |
| thiele2014 | Thiele JC, Kurth W, Grimm V 2014. Facilitating Parameter Estimation and Sensitivity Analysis of Agent-Based Models: A Cookbook Using NetLogo and 'R'. *Journal of Artificial Societies and Social Simulation* 17(3):11. [doi:10.18564/jasss.2503](https://doi.org/10.18564/jasss.2503) | FT |
| toni2009 | Toni T, Welch D, Strelkowa N et al. 2009. Approximate Bayesian computation scheme for parameter inference and model selection in dynamical systems. *Journal of The Royal Society Interface* 6(31):187-202. [doi:10.1098/rsif.2008.0172](https://doi.org/10.1098/rsif.2008.0172) | Abs |
| traag2019 | Traag VA, Waltman L, van Eck NJ 2019. From Louvain to Leiden: guaranteeing well-connected communities. *Scientific Reports* 9(1):5233. [doi:10.1038/s41598-019-41695-z](https://doi.org/10.1038/s41598-019-41695-z) | Abs |
| uwimbabazi2019 | Uwimbabazi M, Rothman JM, Basuta GI et al. 2019. Influence of fruit availability on macronutrient and energy intake by female chimpanzees. *African Journal of Ecology* 57(4):454-465. [doi:10.1111/aje.12636](https://doi.org/10.1111/aje.12636) | FT |
| vanderVaart2015 | van der Vaart E, Beaumont MA, Johnston AS et al. 2015. Calibration and evaluation of individual-based models using Approximate Bayesian Computation. *Ecological Modelling* 312:182-190. [doi:10.1016/j.ecolmodel.2015.05.020](https://doi.org/10.1016/j.ecolmodel.2015.05.020) | FT |
| vernon2010 | Vernon I, Goldstein M, Bower RG 2010. Galaxy formation: a Bayesian uncertainty analysis. *Bayesian Analysis* 5(4):None. [doi:10.1214/10-BA524](https://doi.org/10.1214/10-BA524) | Abs |
| villioth2025 | Villioth J, Lim J, Hobaiter C et al. 2025. Diet and Foraging in the Waibira Chimpanzee Community, Budongo Central Forest Reserve, Uganda. *American Journal of Primatology* 87(12):e70104. [doi:10.1002/ajp.70104](https://doi.org/10.1002/ajp.70104) | FT |
| wakefield2008 | Wakefield ML 2008. Grouping Patterns and Competition Among Female Pan troglodytes schweinfurthii at Ngogo, Kibale National Park, Uganda. *International Journal of Primatology* 29(4):907-929. [doi:10.1007/s10764-008-9280-7](https://doi.org/10.1007/s10764-008-9280-7) | Abs |
| walker2018 | Walker KK, Walker CS, Goodall J et al. 2018. Maturation is prolonged and variable in female chimpanzees. *Journal of Human Evolution* 114:131-140. [doi:10.1016/j.jhevol.2017.10.010](https://doi.org/10.1016/j.jhevol.2017.10.010) | Abs |
| watts2006 | Watts DP, Muller M, Amsler SJ et al. 2006. Lethal intergroup aggression by chimpanzees in Kibale National Park, Uganda. *American Journal of Primatology* 68(2):161-180. [doi:10.1002/ajp.20214](https://doi.org/10.1002/ajp.20214) | FT |
| watts2012a | WATTS DP, POTTS KB, LWANGA JS et al. 2012. Diet of chimpanzees ( Pan troglodytes schweinfurthii ) at Ngogo, Kibale National Park, Uganda, 1. diet composition and diversity. *American Journal of Primatology* 74(2):114-129. [doi:10.1002/ajp.21016](https://doi.org/10.1002/ajp.21016) | FT |
| watts2012b | WATTS DP, POTTS KB, LWANGA JS et al. 2012. Diet of chimpanzees (Pan troglodytes schweinfurthii) at Ngogo, Kibale National Park, Uganda, 2. temporal variation and fallback foods. *American Journal of Primatology* 74(2):130-144. [doi:10.1002/ajp.21015](https://doi.org/10.1002/ajp.21015) | FT |
| wattsMitani2001 | Watts D, Mitani J 2001. BOUNDARY PATROLS AND INTERGROUP ENCOUNTERS IN WILD CHIMPANZEES. *Behaviour* 138(3):299-327. [doi:10.1163/15685390152032488](https://doi.org/10.1163/15685390152032488) | FT |
| wattsMitani2002 | Watts DP, Mitani JC 2002. Hunting Behavior of Chimpanzees at Ngogo, Kibale National Park, Uganda. *International Journal of Primatology* 23(1):1-28. [doi:10.1023/A:1013270606320](https://doi.org/10.1023/A:1013270606320) | FT |
| williams2004 | Williams JM, Oehlert GW, Carlis JV et al. 2004. Why do male chimpanzees defend a group range?. *Animal Behaviour* 68(3):523-532. [doi:10.1016/j.anbehav.2003.09.015](https://doi.org/10.1016/j.anbehav.2003.09.015) | Abs |
| williams2008 | Williams JM, Lonsdorf EV, Wilson ML et al. 2008. Causes of death in the Kasekela chimpanzees of Gombe National Park, Tanzania. *American Journal of Primatology* 70(8):766-777. [doi:10.1002/ajp.20573](https://doi.org/10.1002/ajp.20573) | FT |
| wilson2001 | Wilson ML, Hauser MD, Wrangham RW 2001. Does participation in intergroup conflict depend on numerical assessment, range location, or rank for wild chimpanzees?. *Animal Behaviour* 61(6):1203-1216. [doi:10.1006/anbe.2000.1706](https://doi.org/10.1006/anbe.2000.1706) | FT |
| wilson2004 | Wilson ML, Wallauer WR, Pusey AE 2004. New Cases of Intergroup Violence Among Chimpanzees in Gombe National Park, Tanzania. *International Journal of Primatology* 25(3):523-549. [doi:10.1023/b:ijop.0000023574.38219.92](https://doi.org/10.1023/b:ijop.0000023574.38219.92) | FT |
| wilson2007 | Wilson M, Hauser M, Wrangham R 2007. Chimpanzees (Pan troglodytes) modify grouping and vocal behaviour in response to location-specific risk. *Behaviour* 144(12):1621-1653. [doi:10.1163/156853907782512137](https://doi.org/10.1163/156853907782512137) | FT |
| wilson2012 | Wilson ML, Kahlenberg SM, Wells M et al. 2012. Ecological and social factors affect the occurrence and outcomes of intergroup encounters in chimpanzees. *Animal Behaviour* 83(1):277-291. [doi:10.1016/j.anbehav.2011.11.004](https://doi.org/10.1016/j.anbehav.2011.11.004) | FT |
| wilson2014 | Wilson ML, Boesch C, Fruth B et al. 2014. Lethal aggression in Pan is better explained by adaptive strategies than human impacts. *Nature* 513(7518):414-417. [doi:10.1038/nature13727](https://doi.org/10.1038/nature13727) | FT |
| wilsonWrangham2003 | Wilson ML, Wrangham RW 2003. Intergroup Relations in Chimpanzees. *Annual Review of Anthropology* 32(1):363-392. [doi:10.1146/annurev.anthro.32.061002.120046](https://doi.org/10.1146/annurev.anthro.32.061002.120046) | FT |
| wittigBoesch2010 | Wittig RM, Boesch C 2010. Receiving Post-Conflict Affiliation from the Enemy's Friend Reconciles Former Opponents. *PLoS ONE* 5(11):e13995. [doi:10.1371/journal.pone.0013995](https://doi.org/10.1371/journal.pone.0013995) | FT |
| wood2017 | Wood BM, Watts DP, Mitani JC et al. 2017. Favorable ecological circumstances promote life expectancy in chimpanzees similar to that of human hunter-gatherers. *Journal of Human Evolution* 105:41-56. [doi:10.1016/j.jhevol.2017.01.003](https://doi.org/10.1016/j.jhevol.2017.01.003) | FT |
| wood2023 | Wood BM, Negrey JD, Brown JL et al. 2023. Demographic and hormonal evidence for menopause in wild chimpanzees. *Science* 382(6669):eadd5473. [doi:10.1126/science.add5473](https://doi.org/10.1126/science.add5473) | FT |
| wood2025 | Wood BM, Watts DP, Langergraber KE et al. 2025. Female fertility and infant survivorship increase following lethal intergroup aggression and territorial expansion in wild chimpanzees. *Proceedings of the National Academy of Sciences* 122(47):e2524502122. [doi:10.1073/pnas.2524502122](https://doi.org/10.1073/pnas.2524502122) | FT |
| wrangham1998 | Wrangham RW, Conklin-Brittain NL, Hunt KD 1998. Dietary Response of Chimpanzees and Cercopithecines to Seasonal Variation in Fruit Abundance. I. Antifeedants. *International Journal of Primatology* 19(6):949-970. [doi:10.1023/A:1020318102257](https://doi.org/10.1023/A:1020318102257) | Abs |
| wroblewski2009 | Wroblewski EE, Murray CM, Keele BF et al. 2009. Male dominance rank and reproductive success in chimpanzees, Pan troglodytes schweinfurthii. *Animal Behaviour* 77(4):873-885. [doi:10.1016/j.anbehav.2008.12.014](https://doi.org/10.1016/j.anbehav.2008.12.014) | FT |
| zurell2010 | Zurell D, Berger U, Cabral JS et al. 2010. The virtual ecologist approach: simulating data and observers. *Oikos* 119(4):622-635. [doi:10.1111/j.1600-0706.2009.18284.x](https://doi.org/10.1111/j.1600-0706.2009.18284.x) | Abs |
