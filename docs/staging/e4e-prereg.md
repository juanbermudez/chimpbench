# E4e pre-registration: hunting from state (the hunt decided at the encounter by a value comparison)

Branch `e4e-hunting` from `track-e` 4c86404. Stage E4, third removal in the plan's order (`huntGapH`). Rules policy
only; development seeds 48 and 7; no run longer than 90 days in all. Started 2 October 2026, 04:32.

This file is written in steps, each committed before the step it governs: §1–§3 (problem, target audit, diagnosis
plan) before the diagnosis runs on unchanged code; §4–§8 (mechanism, readouts, arms, predictions, kill criterion)
before any run of changed code; every iteration in the run log (§9) before its run.

## 1. The problem

Hunting is opened by prescriptions (`src/sim/candidates.ts` `meatAndHunting`, the `hunt` offers at lines 826–835):

- a community-wide gap since the community's last hunt (`huntGapH` 6 h, design);
- a hunting-day lottery (`huntDay`, `huntDayPerMale` 0.0045 per adult male per day, design; `src/sim/tick.ts`
  `huntingDays`), not drawn in the field profile since the hunting fix (`huntEncounter` 1, field), which instead opens
  the option for one decision at a newly perceived colobus group with `huntEncMinMales` 2 adult males in view
  (`src/sim/perception.ts:270`);
- male-count minimums (`huntMinMales` 3 on a hunting day, `huntEncMinMales` 2 at an encounter);
- a timer-energy gate (`c.energy > 0.35`, a literal) and a rain gate (`rain < 0.3`, a literal);
- a hand-set lead value: `0.5 + 0.15·(males − 3) + 0.35·skill + 0.15·boldness − dist ÷ huntDistScaleM`.

On the reference stack R (handoff §3) the observer's T-HUN-1 is 39.7 hunts per community-year (5-seed confirm; band
5–25; all switches off, B: 26.8). The stack's spare time (feeding ends early) is the suspected cause, not yet shown.

## 2. Target audit (step 0; 2 October 2026, 04:34–04:50; written before anything is built or run)

### 2.1 What was opened

- **gilby2015** (Phil Trans R Soc B 370:20150005; PMC4633842). NCBI BioC: no result (not in the open-access subset);
  efetch db=pmc: metadata and abstract only ("The publisher of this article does not allow download"). Two routes, so
  the full text was **not re-read by this stage**. The figures below are as recorded from the earlier full-text reading
  (research.md "Hunting decision at colobus encounters"; realism-design.md T-HUN rows and source list, access FT;
  `src/field/metrics.ts` T-HUN-1 protocol). The abstract, read now, agrees: 70 years of data from three communities;
  impact hunters at Kasekela and Kanyawara; none in "the third, smaller community (Mitumba)", where hunting probability
  rose with the number of females present at an encounter.
- **wattsMitani2002** (Int J Primatol 23:1–28). OpenAlex: closed, no repository full text; the University of Michigan
  repository answered with a Cloudflare challenge, so that host was dropped. **Not verified by this stage**; values as
  recorded (realism-design.md source list, access FT).
- **mitaniWatts2001** (T-HUN-3's Ngogo row): not opened (time box). Values as recorded.
- Read from the earlier session's cache (not in the source list; a review, used for reasoning only, not for a value):
  Mitani, Watts & Muller 2002, *Evolutionary Anthropology* ("Recent developments in the study of wild chimpanzee
  behavior"). Its hunting section argues that at Ngogo males hunt when success is likely (large parties, many male
  hunters) and forgo most attempts in small parties; hunting rose when fruit was abundant, not when it was scarce.

### 2.2 Samples and methods of the rows this stage is scored on

| Row | Population, years | Sample | Method (as recorded) |
| --- | --- | --- | --- |
| T-HUN-1 hunts per community-year | Kanyawara 1996–2014 (224 months) | 194 red colobus hunts; mean 11.4 adult males; 2,461 colobus encounters at 3.73 per 100 follow-hours (≈ 66,000 follow-hours, derived) | all-occurrence hunts by the followed party; a hunt = a chase with at least one chimpanzee climbing toward a colobus (realism-design.md observer table). 194 ÷ 18.67 y = 10.4 per year (derived; per calendar year, i.e. 0.29 per 100 follow-hours) |
| T-HUN-1 (second row) | Ngogo 1995–1999 | ~24 adult males (26 in June 1998, mitaniWatts1999); 45.1 successful red colobus hunts per year (55.2 in 1998–99) | success 0.82 (67/82) → about 55 hunts per year (derived) |
| T-HUN-2 success | Kanyawara; Kasekela; Mitumba; Ngogo | 194; 1,498; —; 49 and 82 hunts | share of hunts with at least one capture: 0.613; 0.623; 0.532; 0.73–0.82 |
| T-HUN-3 hunted share of encounters | Kanyawara; Kasekela; Mitumba; Ngogo 1998–99 | 2,461; 2,316; —; 164 encounters | encounter = red colobus within 100 m (Kanyawara) or 50 m (Gombe) of the party at a 15-min scan: 0.079; 0.647; 0.480; 0.37 (61/164) |
| T-HUN-4 odds per male (held-out) | the three gilby2015 communities | as T-HUN-3 | logistic regression of hunting per encounter on adult males in the scan: +48%, +8%, +72% per male |

Hunters are adult and adolescent males (T-HUN-8: 0.86–0.90 of captors are adult males); no sex, reproductive-state or
mass restriction applies to the community samples. The model's observer follows parties (`party-larger`) and uses the
100 m radius in the field profile (`src/field/config.ts` `preyEncounterM` 100), method-matched to Kanyawara.

### 2.3 The scaling of T-HUN-1's band: unsound

- The band is 5–25 "per community-year (3–7 males)", basis "Kanyawara scaled" (realism-design.md T-HUN-1, written on
  28 September before the repository's history; no computation is recorded anywhere in the repository).
- Numerically it brackets the **unscaled** Kanyawara figure (10.4; the band's geometric centre is 11.2) and not a value
  scaled to 3–7 males. Any scaling by males goes the other way: hunting rises with males within sites (T-HUN-4,
  +48% odds per extra adult male at Kanyawara encounters) and across sites (Kanyawara 10.4 ÷ 11.4 = 0.91 hunts per
  adult male-year; Ngogo about 55 ÷ 24 = 2.3, derived).
- The model's communities (field profile, seeds 48 and 7, day 0) have **7, 4 and 3 adult males** (22, 15 and 12
  individuals), 4.7 on average: 0.41 of Kanyawara's 11.4.
- Linear scaling by adult males from the two Kibale sites gives **0.9–2.3 hunts per adult male-year, i.e. 4–11 per
  community-year at 4.7 adult males** (3 males: 2.7–6.9; 7 males: 6.4–16.1). Linear scaling is generous to the smallest
  communities, because per-encounter odds rise with males. Proposed as a staged row
  (`docs/staging/e4e-targets.patch.json`, T-HUN-1 revision, original kept under `revisions`); **not applied**. Under it,
  B (26.8) and R (39.7) are 2.4–3.6 times the top of the band, not 1.1–1.6.

### 2.4 The two rate rows are tied by the encounter rate

T-HUN-1 = (colobus encounters per follow-year) × T-HUN-3. Kanyawara: 132 encounters a year. The model's observer
records about 3 times Kanyawara's encounter rate per follow-hour (10.8 against 3.73 per 100 h; hunting-fix log, prey at
pre-decline Ngogo density, `colobusDensityPerKm2` 2.48 groups/km²). At that rate T-HUN-1 ≤ 11 needs T-HUN-3 ≲ 0.013,
below T-HUN-3's band (0.05–0.40): with either band, the two rows cannot both pass until the encounter rate is
resolved (an unmerged branch fits `preySightFactor` to Kanyawara encounters; outside this stage, not touched).
**Consequence for this stage:** the mechanism is a decision per encounter, so T-HUN-3 (hunted share of encounters) and
T-HUN-4 (more males, more hunting) are its primary readouts; T-HUN-1 is reported against both bands and is not a
target the mechanism is built toward. T-HUN-3 and T-HUN-4 are not rescaled (Mitumba, the smallest community, hunted
48% of its encounters).

## 3. Diagnosis plan (step 1; runs on unchanged code, R and B)

Cheapest decisive check first: `scripts/hunt-diagnose.ts` (sim truth) on R and on B, seeds 48 and 7, 30-day burn-in +
30 days, extended with the readouts listed in §5 (encounters per community-day, share hunted, which gate opened each
hunt, males present, the leader's energy state and arousal at the start, hour of day). The question it answers: what
makes the stack hunt more than B: more encounters, a higher share of encounters hunted, or more decision points per
encounter (spare time).

## 4. Mechanism

(registered after the diagnosis, before any run of changed code)

## 9. Results

### Run log (each entry written before its run)
