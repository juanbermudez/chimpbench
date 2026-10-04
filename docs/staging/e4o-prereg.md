# E4o pre-registration: three small rules (meat, guarding, mating)

Branch `e4o-small-rules` from `track-e` eea2d85. Track E, stage E4o. Rules policy only; development seeds 48 and 7; no
run longer than 90 days in all. Started 4 October 2026, 13:22.

Rule served: field values of behaviour are targets to benchmark against, never inputs. No value, bonus or weight is
added or tuned to reach a rate.

This file is written in steps, each committed before the step it governs: §0–§3 (problem, plan, rows and samples,
diagnosis plan) before the diagnosis runs on unchanged code; §5–§8 (mechanism, readouts, arms, predictions, kill
criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 0. The problem (from the brief; verified in §4)

Three counted prescriptions are still active on S27 (the best integrated candidate, 42 prescriptions;
`docs/staging/e-stack2-confirm.md` "S26 and S27 results"; `scripts/prescription-ledger.ts --count --params <S27>` and the
ledger's rows list all three):

| Entry (value; ledger class) | Where (eea2d85) | What it decides (as read from the code) |
| --- | --- | --- |
| `meatEatPerH` 0.35 units per eco-hour (design; "need timer", encodes T-ACT-1 by the ledger's rule) | `src/sim/life.ts:163–168` (needs), `src/sim/energy.ts:620` (`meatKcalPerUnit`), `src/sim/huntvalue.ts` (the hunt's expected meat) | a holder eats 0.35 of a carcass an hour while awake, as the gut takes it; one unit (one capture) is worth 60 × `ledgerMeatKcalPerMin` ÷ 0.35 = 1,149 kcal whatever the prey, takes 2.9 h to eat alone, and a share (0.2 units, `execution.ts:736`) is worth 230 kcal |
| `guardMaxAgeY` 12 y ([M] crockford2020, hobaiter2014, stanton2020; field copy) | `src/sim/candidates.ts:151–166` (`guardianOf`, `guarded`), `src/sim/conflict.ts:43` (`coalitionKin`) | the oldest ward whose seen guardian deters charges at it (−`guardDeterW` 0.3, −`guardFeedDeterW` on feeding supplants), the end of an adoptive caretaker's guardianship (defence, plant sharing, the follow) and of caretaker kinship in coalitions; a living mother is the guardian at any age |
| `mateIntervalH` 1.5 h (design; quota) | `src/sim/candidates.ts:1108, 1124`, `src/sim/execution.ts:589, 775, 787, 1174–1182` | a male may copulate again only 1.5 h after his last copulation (his mate offer, a female's offer to him, copulation in guarding, consorting and the mate act); a failed approach blocks him for 0.5 h; set so a maximally swollen female gets about one copulation an hour with ~7 males (its note: between Taï 0.14/h and Ngogo 3.5/h, sources not checked) |

Candidates from the brief (first principles, tested by the diagnosis before anything is built): a carcass's energy from
the prey's mass, its edible fraction and meat's energy density, shared by the existing holding, begging and sharing
code, the eating time following from mass ÷ eating rate; a guardian that defends while the ward cannot hold its own
against the threat (E4h's strength model and assessment), so the age limit follows from growth; copulation from the
male's state (E4a's testosterone-like state, a sourced post-copulatory refractory physiology) and the female's swelling
and proceptivity, without a quota. A rule that cannot be replaced on sources stays, recorded with why.

## 1. Plan

1. Sources and samples (§2): every row the stage is scored on, and the inputs each candidate needs (red colobus masses
   by age class and the edible share; chimpanzee male post-ejaculatory refractory physiology; copulation rates per
   swollen female-hour with their methods). BioC first, 2 routes or 10 minutes per source.
2. Diagnosis (§3, registered before its runs) on S27 with unchanged code, simulation truth, seeds 48 and 7, 30-day
   burn-in + 60 days: meat kcal per capture and per eater, eating time, sharing; guarding and defence by ward age and by
   the ward's strength against the threat; copulations per swollen female-hour and which constraint binds (the quota,
   the female's choice, distance, night).
3. One switch, `smallRules` (a bit per rule; 0 = today), only for what the diagnosis and the sources support.
4. Arms on S27 in quick mode against the integrator's S27q and its three `rngSalt` re-draws (bench-run3 28d249e); at most
   three iterations, each logged in §9 and committed before its run.

## 2. Rows scored, and their samples

Rows from `data/targets.json`, as recorded by the stages that audited them (cited); sources re-opened by this stage are
marked. No row measures kcal per carcass, guarding by ward age or copulation rates: they are reported as simulation
truth beside the readouts' sourced values (context, never summed).

| Row (role; band) | Source and sample (sex, reproductive state, mass, method) | Opened |
| --- | --- | --- |
| T-HUN-1 hunts per community-year (fitted; 5–25, a band of 4–11 staged) | gilby2015: Kanyawara 1996–2014, 194 hunts in 224 months, 11.4 adult males, encounters within 100 m in 15-min party scans; party follows; community counts (no sex, state or mass restriction); wattsMitani2002 Ngogo (closed, as recorded) | e4n-prereg §2.1 (FT at an earlier pass) |
| T-HUN-2 success, T-HUN-3 hunted share of encounters, T-HUN-7 kills per success (fitted) | gilby2015 Table 1; mitaniWatts1999 (Ngogo 1995–98, 49 hunts, 128 prey, FT); hunters adult and adolescent males | e4n-prereg §2.1, e4k-prereg §2.1 |
| T-HUN-4 (held-out, rare row), -5, -6, -8 | gilby2015 (logistic odds per male), gilbyWrangham2007, stanford1994 (abstract), mitaniWatts1999 Table 3 (86% of kills by adult males) | as recorded |
| T-HUN-9 meat sharing (held-out pattern, not summed) | wattsMitani2002 (Ngogo 1995–99: 15.2 adult males present, 8.7 ate meat; 12.1 individuals ate per hunt; closed, as recorded); samuni2018 (Taï 2013–15, 312 events: owners shared with 48% of adults present; with 62% of bond partners vs 35% of others) | as recorded |
| T-ACT-1..4 (fitted) | villioth2025 (Budongo Waibira 2016–17, 10 M and 9 F, 491 h continuous focal recording), uwimbabazi2019 (Kanyawara 2014–15, females, full-day focal follows; 14 nursing mothers per the field audit), amsler2010, potts2011: adult daytime activity shares, no mass | as recorded (e-field-audit.md) |
| T-SOC-5, T-SOC-10 (held-out; guarding can touch them) | kaburuNewtonFisher2015 (Sonso, 8 adult males, 1,109.5 h; Mahale M, 10 adult males); wittigBoesch2010 (Taï 1996–99, 18 individuals of both sexes, 876 conflicts) | e4h-prereg §3 |
| T-DEM-15, -16, -17, -24 (orphans; held-out, need years) | crockford2020 (Taï, sons orphaned at 4–12 y), stanton2020 (Gombe), hobaiter2014 (Sonso adoptions), nakamura2014 (Mahale) | not scorable under the 90-day cap (reported insufficient) |
| (context) copulation rate per male–female dyad-hour | **muller2007 (re-opened this stage, FT, author copy):** Kanyawara 1998–2005, 13 adult males and 15 parous females (long-term data); "Copulations, defined as mounting with intromission and pelvic thrusting, were recorded using all-occurrence sampling"; dyads "observed together for at least 25 h when the female was in oestrus" (oestrus = maximal swelling); per male, median copulation rates with the parous females he was more aggressive towards 0.064 ± 0.008 copulations per hour, less aggressive 0.03 ± 0.006 (Figure 2; n = 13 males, 2–14 females per male); parous females < 500 copulations per conception, nulliparous > 1,000 (Wrangham 2002 as cited) | FT this stage |
| (context) copulations per swollen female-hour; male physiology | pending (a source search for the "Taï 0.14/h, Ngogo 3.5/h" of `mateIntervalH`'s note and for male refractory physiology; results go in §2.1 before any mechanism) | — |
| (context) energy of a capture | pending (red colobus masses by age class, the edible share, meat's energy density; results go in §2.1 before any mechanism) | — |

## 3. Diagnosis plan (step 1; unchanged simulation code; written and committed before any run)

Tool: `scripts/e4o-diagnose.ts` (new, read-only; based on `e4m-diagnose.ts`). It reads the world after each tick and
calls only pure functions, plus four hooks that draw nothing and write nothing: `huntTap` (captures), `energyTap` (meat
kcal eaten, the ledger's own books), `rulesTap` (each rules decision's candidate list) and `quotaTrace`, to which this
stage adds the two mating gates (`'mate'`: a male's offer to a swollen female in range; `'mateF'`: a swollen female's
offer to a male, which the male's quota also gates), traced with the score the offer has or would have. The gates were
restructured so the score is computed when the trace is on even if the quota blocks; with the trace off the same offers
are made with the same scores: S27 seed 48 after 2 days hashes 6005ce06d37e5df1 at 13b0364 (before the hook) and at the
hooked code, with the hooks off and on.

Simulation truth, field profile, S27's parameters (`bench-run3/artifacts/validation/e/s27q/S27q-params.json`), seeds 48
and 7, 30-day burn-in + 60 days, one seed per process.

Readouts (each defined here before the first run):

- **Meat.** Per community meat episode (units held from 0 back to 0, as E4m): captures, meat kcal eaten (energyTap 'eaten',
  kind meat), kcal per capture, eaters (> 0.5 kcal) and kcal per eater, the captors' kcal, minutes from the first capture
  to the last unit, holder-minutes awake, gut-limited holder ticks (as E4m), meat shares (a share interaction whose giver
  held meat and whose receiver's meat rose) and their recipients, begs at a holder. Pooled: kcal per capture, median and
  mean kcal per eater.
- **Guarding.** Every charge or attack started inside a community: the target's age class and the charge's variant;
  whether the target's guardian qualifies for the deterrence test without the age limit (seen by the charger, within
  `defendRangeM` of the target, not dominated by it); whether the age limit made the difference (target ≥ 12 y); the
  target's assessed odds against the charger (E4h `assessOdds`, with `winOdds` beside it), by age class × odds class
  (< 0.1, 0.1–0.3, 0.3–0.5, 0.5–0.7, ≥ 0.7); the charges the age rule and an odds rule (odds < 0.5: the ward cannot hold
  its own) would treat differently. Defence charges (variant DEFEND) by ward age and by the ward's assessed odds against
  its aggressor. Ward-days with an adoptive caretaker by age.
- **Mating.** Copulations (interactions of kind `mate`), by the male's and the female's act at the tick's start, female
  initiative (her act was `mate` at him), swelling, the female's parity (as endocrine.ts: ≥ `endoParousAgeY` or a birth),
  daylight and hour. Female-hours at maximal swelling (swelling 1, the model's cycle phase between `cycleMaxDay` and
  `cycleMaxEndDay`; daylight > 0.1 separately) and at ≥ 0.75 (the offers' threshold). **Dyad-hours** (muller2007's
  denominator): an adult male (≥ 15 y) and an unrelated maximally swollen female of his community in the same party
  (`partyId`, the model's proximity chain), counted per tick; copulations per dyad-hour (pooled; and the median over dyads
  with ≥ 5 h together, a reduced version of muller2007's ≥ 25 h that 60 days allow). Intervals between a male's
  copulations and between a female's. At each rules decision with a mate gate traced in the same tick: blocked or open,
  the hours since the male's last copulation, the distance, night, and whether the offer's published score (its score plus
  the candidate jitter `offer()` adds, a hash) exceeds the decision's best published score ("would win"); the act that
  tops the list. Mate acts started and ended: copulated or not, and the partner's act at the end (refusal: flee, charge,
  attack, submit).
- **Context from the bench runs:** deaths by cause; reserves %/day by class; T-HUN-1..9 and T-ACT-1..4 (e-bench quick
  scorecards, the integrator's reference).

Runs (from a frozen detached checkout of the commit that adds this text, in my scratch directory): smoke (seed 48, 1 + 2
days: every readout produced; done at the hooked code, logged in the run log); **D0** = the tool on S27, seeds 48 and 7,
30 + 60 days; **D1–D3** = the same on S27 with `rngSalt` 1, 2, 3 (the parameters of the integrator's S27q1–S27q3), for the
spread of the truth readouts. The e-bench quick reference (S27q and its three re-draws) is the integrator's and is not
re-run.

### Run log (each entry written before its run, unless marked)

- **Smoke** (logged after the run, at the hooked code before this commit, scripts only beyond the hook): S27, seed 48,
  1 + 2 days: every readout produced (89 copulations, 0 captures, 0 guard-qualified charges in two days).
- **D0, D1–D3** (as registered above), from `scratchpad/e4o/frozen-d0` (the commit that adds this entry): seeds 48 then 7,
  one process at a time if the load is above 8, else two; outputs `artifacts/validation/e4o/D{0,1,2,3}-{48,7}.json`.
- **Readouts added after D0 and before any arm (disclosed; D0–D3 re-run as D0b–D3b, the tables use only these).** Reading
  D0 showed that the dyad readout counted the night: the field's denominator is observation hours, so a dyad's hours and
  copulations are now counted in daylight only (daylight > 0.1; copulations with a maximally swollen female and a male
  ≥ 15 y), and two readouts are added: muller2007's statistic in the reduced form 60 days allow (per adult male, the median
  of his dyadic rates over dyads with ≥ 5 daylight hours together, then the median over males), and a maximally swollen
  female's copulations per daylight hour by the adult males in her party (0, 1–2, 3–4, 5–6, ≥ 7; the party at the
  previous tick's end), the form in which party size enters field copulation rates. Simulation code unchanged
  (`scratchpad/e4o/frozen-d0b`, the commit that adds this entry); outputs `D{0,1,2,3}b-{48,7}.json`.
