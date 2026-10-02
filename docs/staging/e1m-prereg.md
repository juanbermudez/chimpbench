# E1m pre-registration: milk output, an audit of the input

Registered 2 October 2026 (10:10), before any source value of this stage was read and before any run of changed code.
Track E, stage E1m, branch `e1m-milk` (from `track-e` eeded56). Any new switch is 0 by default in both profiles and is
read only with `energyLedger` 1, so the compressed goldens and the field pin cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. Milk energy output measured by isotope dilution,
deuterium turnover or test-weighing is physiology measured independently of the behaviour it helps produce, so it may
be an input. A mother's reserve trend is not. **No input is set because it balances the mothers**; a miss is a finding.

## 0. The inputs under audit (data/params.json; all `assumed`, all human)

| id | value | what it is |
| --- | --- | --- |
| `ledgerMilkYieldCoef` | 23.2 kcal/day per kg^0.75 | the human 501 kcal/day (749 g/day × 2.8 kJ/g, butteKing2005) at an assumed 60 kg, scaled by M^0.75: 307 kcal/day at 31.3 kg |
| `ledgerMilkEff` | 0.8 | human efficiency of milk synthesis: the mother pays milk drunk ÷ 0.8 (384 kcal/day at full yield) |
| `ledgerMilkKcalPerMin` | 2.5 kcal/min | milk energy per nursing minute (human 501 kcal/day over an assumed 2 h of suckling, scaled) |

## 1. How the model's milk books work (code, read before any run)

- Synthesis fills a store at the yield rate `ledgerMilkYieldCoef ÷ 24 × M^0.75` per hour while the mother lactates and
  stops when the store holds `ledgerMilkStoreH` hours of yield (`src/sim/energy.ts:383–384`). **Synthesis itself costs
  nothing.** The mother pays only for milk her infant drinks: cost = milk ÷ `ledgerMilkEff` (`nurseTick`,
  `src/sim/energy.ts:531–540`).
- So a yield above what infants drink is neither paid for nor wasted: it is never made (the store is full). The yield
  coefficient matters only where it binds, i.e. where infants would drink more than the mother makes.
- What S3 shows (integrator's `bench-run/artifacts/validation/e/s3/S3-energy.log`, d066cdc, 5 seeds × 60 days; read
  before this registration): infants drink 284 kcal/day at 0.5–1 y and 307–308 kcal/day at 1–2, 2–3 and 3–4 y, i.e.
  the yield cap (23.2 × 31.3^0.75 = 307) binds from about 0.9 y on; mothers pay 355–385 kcal/day for milk; their balance
  is −42, −99, −147 and −150 kcal/day by infant age (0.5–1, 1–2, 2–3, 3–4 y). There are no infants under 0.5 y in the
  window (no births). These numbers are context for the consistency check (§3); they play no part in the step-0 rule.

## 2. Step 0 decision rule (registered before any source value was read)

A primate- or ape-specific value replaces the human input only if it is **better supported** for a 31.3 kg wild
chimpanzee mother than the human value scaled by M^0.75. Registered meaning:

1. **Method.** Only daily milk output measured by isotope dilution (deuterium dose-to-mother or infant water
   turnover) or 24-hour test-weighing counts as an output value. Milk obtained by manual expression after a separation,
   milk composition alone, and nipple time are not output values (composition changes a volume, not an energy output;
   the model's input is in energy).
2. **Sample.** n ≥ 3 mothers, a stated maternal body mass (to scale by M^0.74–0.75, riek2021) and a stated lactation
   stage. Values read only through an abstract or a secondary source count as support only if the numbers themselves
   are quoted there.
3. **Closeness.** The human value is a hominoid value with large samples and the best methods. A value is better
   supported only if (a) it is from a great ape (none is known), or (b) it is a comparative primate relation (≥ 5
   primate species, mass-scaled) in which humans sit off the primate line by more than the line's scatter, so that
   human scaling is the outlier and the primate line's prediction at 31.3 kg is the better estimate for an ape; or
   (c) the human value itself turns out to rest on something other than registered (for example a maternal mass other
   than 60 kg), in which case the coefficient is corrected and stays human.
4. **Not better supported:** a single monkey species (Old World monkeys and callitrichids wean at about 1 y or earlier
   and their infants grow fast for their size; a different life history from an ape's) or a mammal-wide line without
   a primate term. Such values are recorded as a **bracket** around the human-scaled value, not used as the input.
5. **Efficiency.** `ledgerMilkEff` changes only if a primate measurement of the efficiency of milk synthesis exists
   (energy in milk ÷ extra metabolisable energy for it); otherwise it stays human.
6. If nothing passes 1–3, the stage records a valid null for the input and does not build a switch (STEP 2 is skipped).
   The consistency check (§3) is still done and reported.

## 3. Step 1: consistency check of the infant side (offline arithmetic first, then a 2-day smoke)

Question: does the infant side of the ledger agree with the input? Registered computation (numbers generated by a
script from the registry and the field tables, never typed):
- **Need by age** (0–0.5, 0.5–1, 1–2, 2–3, 3–4, 4–5 y): resting cost (Kleiber, `ledgerRmrCoef` × M^`ledgerRmrExp`) ×
  the day's activity multiple (sleep and awake shares from the registry multipliers), plus growth at E1f's captive
  potential (`ledgerGrowFirstYearKg`, then the sanctuary rates) × `ledgerGrowthKcalPerG`, plus diet-induced
  thermogenesis (`digestaTefFrac`); mass on the E1f potential curve.
- **Own food**: field eating time by age (badescu2022 foraging share; lonsdorf2014 eating share) × daylight minutes ×
  the model's own-food kcal per eating minute by age (S3's E1f table), absorbed at the ledger's digestibility.
- **Milk needed** = need − own food absorbed; compared with the input's yield (307 kcal/day at 31.3 kg) and with what
  infants drink in the model (S3, and the smoke).
- A 2-day smoke (seed 48, the S3 stack) checks that energy-diagnose's milk-by-age readout and the mothers' milk cost
  print, before any arm.

Samples of the field values this check uses (sources opened; research.md entries): lonsdorf2014 (Gombe, 40 infants,
mother–offspring follows with point samples; eating share of observation time by half-year of age); badescu2022 (Ngogo,
72 immatures 0–9 y, 1,245 focal hours, follows 07:00–17:30; foraging share by age); bray2018 (Kanyawara, 26 immatures;
first solid food at 7.9 ± 0.7 months, n = 9); batesByrne2009 (Budongo Sonso; active day of lactating females 10 h 57
min). No row is scored by e-bench in this stage (no arm was run, §7).

### 3.1 Step 1 result (offline; written after the step-0 rule was committed, before any source value was evaluated)

Generated by `consistency.py` (local copy `artifacts/validation/e1m/consistency.py`, not tracked) from
`data/params.json` at eeded56 and the integrator's `S3-energy.json` (5 seeds × 60 days). Need = (Kleiber resting
rate × 1.125 for 12 h asleep at ×1.0 and 12 h awake at ×1.25 + growth at E1f's captive potential × 4.5 kcal/g) ÷ (1 −
diet-induced thermogenesis 0.10), on E1f's potential masses (sexes averaged). Field eating minutes = eating share of
observation time (lonsdorf2014's 6-month blocks; badescu2022 foraging), linear in age between block midpoints, × 657 min (active day of
lactating females, batesByrne2009).

| age | mass kg (F / M) | maintenance | growth | need (absorbed kcal/day) | need without growth | field eating min/day (lonsdorf / badescu) | S3: milk drunk | S3: own food | S3: kcal out | S3: own food kcal per eating min (min/day, share of daylight) | own-food rate the field implies, (need − drunk) ÷ field min | yield − need |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0–0.5 y | 2.5 / 2.5 | 157 | 34 | 212 | 174 | 2 / 6 | — | — | — | — | — | +95 |
| 0.5–1 y | 3.9 / 3.9 | 219 | 34 | 281 | 243 | 35 / 113 | 284 | −0 | 284 | — (0 min, 0.0%) | −0.09 / −0.03 | +26 |
| 1–2 y | 6.3 / 6.5 | 317 | 44 | 401 | 352 | 94 / 163 | 308 | 148 | 420 | 2.98 (50 min, 6.6%) | 0.99 / 0.57 | −94 |
| 2–3 y | 9.7 / 10.3 | 443 | 44 | 541 | 492 | 169 / 211 | 307 | 316 | 546 | 3.27 (97 min, 12.9%) | 1.39 / 1.11 | −234 |
| 3–4 y | 13.1 / 14.1 | 558 | 44 | 669 | 620 | 225 / 259 | 307 | 504 | 685 | 4.17 (121 min, 16.0%) | 1.61 / 1.40 | −362 |
| 4–5 y | 16.5 / 17.9 | 665 | 44 | 788 | 739 | 274 / 307 | — | — | — | — | — | −481 |

Need equals the yield (307 kcal/day at 31.3 kg) at 0.96 y with captive growth, at 1.21 y without growth.

Reading:
- **The input is not far above the infants' needs.** An exclusively milk-fed infant (field: solids under 1% of
  observation time before 6 months, first solids at 7.9 ± 0.7 months, bray2018) needs about 210 kcal/day at 3 months and
  280 at 9 months on the captive potential; the human-scaled yield exceeds that by 95 and 26 kcal/day and equals it at
  about 1 y. The registry need matches the model's own books (S3 kcal out 284 / 420 / 546 / 685 against 281 / 401 / 541
  / 669).
- **Excess yield is neither paid for nor wasted: it is never made.** Below about 1 y the store fills and synthesis
  stops (no cost); the mother pays only for milk drunk. From about 0.9 y the yield binds: S3's infants drink 307–308
  kcal/day at every age from 1 to 4 y and the mothers pay 384.
- **What the infant side cannot check: the cap after 1 y.** From 1 y the need exceeds any plausible yield and own food
  fills the gap. At the field's eating time, the own food that would close the need is 0.6–1.6 kcal per eating minute
  (milk at 307), against the model's 3.0–4.2 (E1f's finding, reproduced): at 1–4 y the model's infants eat 0.31–0.57
  of the field's eating minutes at 2.4–5.2 × the per-minute intake the field's time implies, and drink the whole
  yield. Whether wild mothers make 307 kcal/day after the first year is not testable from the infant side: milk
  transfer has not been measured in chimpanzees (badescu2022 infers a plateau from nipple time and isotopes; isotopes
  put the milk share falling from about 1–1.5 y to zero at 4–4.5 y).
- Bound from the infant side (registered reading, not an input): a chimpanzee yield below about 210–280 kcal/day at
  3–9 months could not feed an infant growing at the captive potential on milk alone (212 kcal/day = 16.0 per kg^0.75
  of a 31.3 kg mother at 3 months; 281 = 21.2 at 9 months); at Gombe's growth (about 1.6 kg/y, [L]) the 9-month need is
  221 kcal/day (16.7 per kg^0.75).

## 4. Step 2 (only if step 0 passes; filled in and committed before any run of changed code)

Reserved: a new switch, 0 by default (0 = today), selecting the sourced primate or ape milk energy output (and the
efficiency, if sourced), each tagged; infant intake and growth then follow from the same ledger (no change to infant
growth inputs). It removes no prescription (an input correction, like E1h): `removesNothing` in
`scripts/lib/prescriptions.ts`.

## 5. Benchmark and judging (from the brief; only if an arm exists)

Two bases, quick mode (seeds 48 and 7, 30 + 30 days), each at this branch's committed head, run once plus three
re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405), each with `energy-diagnose`: (a) **S3** (e-stack2-confirm.md:
the integrated candidate stack + `waterLedger`); (b) **T** = R + `ledgerFoodEnergyFix` (without E1i's pair). The arm
on each base is judged against that base's four-run mean: z = (arm − mean) ÷ (SD × √(1 + 1/n)), quick per-run SD
fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the base's own spread if larger; energy
readouts against the base's own spread. Viability: no starvation death; every class's reserve slope reported against
the 0.05%/day line; infants' growth and weaning readouts must not get worse beyond the base's spread (if they do, that
is a finding about the input, not a reason to retune). At most 3 iterations, each logged here and committed before
its run.

## 6. Sources (STEP 0; filled in as they are verified)

Two helpers verified sources in parallel with disjoint lists (measured outputs; composition and allometry); their
notes with verbatim quotes and URLs are kept locally (`artifacts/validation/e1m/sources-*.md`, not tracked). Existing
entries in research.md §E.11, §E.13 and §E.14.3 were read first. Blocked hosts (dropped at the first challenge, not
routed around): www.sciencedirect.com (captcha; AJCN and J Nutr back issues now resolve there), discovery.ucl.ac.uk
(Cloudflare), link.springer.com (client challenge).

### 6.1 Measured milk energy output (isotope dilution, deuterium turnover, test-weighing)

| Species | Source | Method, sample | Maternal mass | Milk energy output | Read | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Baboon | roberts1985 (AJCN 41:1270) | energy intake, milk output and balance, ad libitum vs 80% and 60% of it; method, n and values not in the abstract (Hinde 2009 FT: "three captive baboons" restricted) | not verified | not verified | Abs (2 full-text routes: captcha, Cloudflare) | **not verified** |
| Baboon | bussVoss1971 (J Nutr 101:901–909) | four methods of estimating yield | not verified | not verified | none (PubMed has no abstract; publisher host blocked) | **not verified** |
| Rhesus | hinde2009 (PMC2615798) | 58 captive mothers; milk let down with oxytocin and stripped after 3.5–4 h separation: "should not be considered an estimate of the absolute or daily milk yield"; isotope and test-weighing methods were judged unsuitable for socially housed rhesus | 8.6 (1 mo) and 8.9 kg (3.5 mo) | not a daily output (11.4 g at 0.83 kcal/g and 17.0 g at 0.99 kcal/g per 3.5–4 h) | FT | not an output value (rule 1) |
| Marmoset | tardif2001 (Behav Ecol Sociobiol 51:17) | cited by secondary sources for milk composition only | not verified | not verified | none (closed; Springer challenge) | **not verified** |
| Other primates, great apes | PubMed and Europe PMC searches (terms in the helper's notes) | no measured milk output in any nonhuman primate other than the above; none in any great ape | — | — | searches | none exists that was found |
| Human | butteKing2005 (FT, Cambridge PDF) | 749 g/day × 2.8 kJ/g × efficiency 0.80 = 2.62 MJ/day; the 749 g/day is a WHO review value (Brown, Dewey & Allen 1998) for exclusive breastfeeding to 5 months; **no maternal mass is stated** | not stated (the registry's 60 kg is an assumption) | 501 kcal/day | FT | the registered basis |
| Human | butteKing2005 Tables 12 and 15 (FT): four studies with doubly labelled water and milk energy output, rows paired by their TEE | Lovelady 1993 (n 9, 12–24 wk), Goldberg 1991 (n 10, 4–12 wk), Forsum 1992 (n 23, 8 wk), Butte 2001 (n 24, 12 wk); milk method of the originals not stated in this text | 64.8, 58.6–58.9, 64.4, 62.8 kg | 2.20, 2.22–2.24, 1.97, 2.02 MJ/day (mean 2.15) | FT (secondary to the four studies) | **confirms the coefficient** (below) |
| Human | daCosta2010 (J Nutr 140:2227; PMC3592484 front matter) | deuterium dose-to-mother, 1,115 infant measurements, 12 countries: intake 0.78 kg/day, above 0.80 kg/day until 6–7 months | not in the abstract | — | Abs | infant intake, no mass |

Coefficients from butteKing2005's measured rows (`brackets.py`, local copy): Lovelady 23.0, Goldberg 25.1 (mean of 4, 8
and 12 wk), Forsum 20.7, Butte 21.6 kcal/day per kg^0.75; mean of the four studies 22.6, weighted by n 22.0; the pooled
mean output (2.15 MJ/day) at the four studies' mean mass (62.7 kg) gives 23.1. The registered 23.2 (501 kcal/day at an
assumed 60 kg) sits inside the measured range (20.7–25.1), 3% above the unweighted mean and 5% above the n-weighted one.

Efficiency of synthesis (`ledgerMilkEff` 0.80), butteKing2005 (FT): a biochemical derivation ("Applying this correction
to the estimate of biochemical efficiency derived above (91–94%) would yield a figure of 80–85%") backed by a 1970
estimate from food-intake differences of lactating and non-lactating women that measured no milk ("Given the imprecision
of these estimates, the biochemical derivation of 80% seems reasonable"). No primate measurement was found (roberts1985's
"increase in efficiency, estimated at 17–25%" under restriction is a change, not a level, and its full text was not
reached).

Also checked: emeryThompson2013 (Annu Rev Anthropol 42:287, the review research.md names for a chimpanzee lactation
estimate): closed access; the abstract (OpenAlex) has no numbers. **Not verified.**

### 6.2 Composition and allometry

| Item | Source | Sample, method | Value | Read | Use |
| --- | --- | --- | --- | --- | --- |
| Chimpanzee milk | milligan2007 (PhD thesis, University of Arizona, hdl:10150/194078; Tables 9.1, 9.2) | 4 captive females, one sample each (3 at SNPRC on days 451, 473, 550, sedated, no oxytocin; 1 at the St. Louis Zoo on day 97, with oxytocin); Smithsonian Nutrition Laboratory assays; gross energy from fat, protein and sugar at 9.11, 5.86 and 3.95 kcal/g | fat 2.01 ± 0.83%, protein 0.90 ± 0.10%, lactose 7.43 ± 0.30%, dry matter 11.45 ± 0.75%; **0.53 ± 0.07 kcal/g** | FT | composition only (rule 1) |
| Other apes | milligan2007 Tables 9.2, 9.4, 9.6 | captive gorilla 0.47 (n 4), bonobo 0.44 (1), orangutan 0.53 (1); wild mountain gorilla 0.49 (4); Hominidae pooled 0.50 ± 0.04 SE (13); captive rhesus 1.03 (22). "fat and total gross energy were not significantly different between captive and wild living hominoids" | — | FT | context |
| Wild mountain gorilla | whittier2011 (Zoo Biol 30:308–317) | 7 healthy free-ranging mothers, 1–50 months | 0.53 kcal/g (1.9% fat) | Abs | context (E.14 had it) |
| Chimpanzee, older | Ben Shaul 1962 via milligan2007 Table 3.4 | n ≤ 3, method and stage not given; excluded by Oftedal & Iverson 1995 for sample size | fat 3.7, protein 1.2, lactose 7.0% (derived 0.68 kcal/g) | secondary | not used |
| Great apes, stage | garcia2017 (Am J Primatol 79:e22614) | 53 samples, 4 captive gorillas to 48 months, 3 orangutans to 22 months | no energy values in the abstract | Abs | not verified |
| MEO allometry | riek2021 | 47 species at peak lactation, PGLS: milk output and MEO "scaled identically to the power of 0.74 ± 0.05" | coefficient, units and primate rows not verified (closed; the OpenAgrar copy showed a proof-of-work page); its reference list names only baboon (bussVoss1971) and human (Coward 1979) milk-intake sources | Abs | exponent only (as E.11) |
| Milk intake allometry | riek2011 (Mamm Biol 76:3–11; DOI 10.1016/j.mambio.2010.03.004, the one in the brief belongs to another paper) | — | nothing verified (closed; the Göttingen copy showed a bot check) | none | not verified |
| Offspring intake | riek2008 (J Zool 274:160–170) | 62 species, weigh-suckle-weigh or isotopes | young at peak lactation drink about 883 kJ/day per kg^0.82 of their own mass | Abs | context |
| Oftedal 1984 | Symp Zool Soc Lond 51:33–85 | not online; secondary sources give only the exponent's range ("between 2/3 and 3/4", douhard2016) and, in words, low primate output (oftedal1991, hinde2009, dufourSauther2002) | no coefficient, no primate offset | secondary | not verified |
| Primate milk review | hindeMilligan2011 (Evol Anthropol 20:9–23) | closed; its reference list (Crossref) cites milligan2007, whittier, Oftedal 1984 and Riek for apes and allometry | — | Abs | not verified |

Derived (`derived.py`, local copy): human milk 0.669 kcal/g (2.8 kJ/g) against captive chimpanzee milk 0.53 kcal/g, a
ratio of 0.79. Chimpanzee milk's dry matter per kcal is 0.216 g (11.45% at 0.53 kcal/g) against the registry's human
0.185 (`digestaMilkDmGPerKcal`).

## 7. Step 0 decision (by the rule of §2, registered before any value was read): valid null

- **Rule 1–2 (method, sample).** No nonhuman primate daily milk output measured by isotope dilution, deuterium turnover
  or test-weighing was verified: the baboon studies (roberts1985, bussVoss1971) sit behind a publisher captcha, the
  rhesus values are 3.5–4 h expressions the authors call no daily yield, the marmoset paper was not reached, and the
  searches found none for any great ape.
- **Rule 3(a).** No great-ape output exists. **Rule 3(b).** No comparative primate relation with a coefficient or a
  primate offset could be read (riek2021, riek2011, Oftedal 1984, hindeMilligan2011); riek2021's references suggest its
  primates are baboon and human only.
- **Rule 3(c), checked.** The registered 60 kg is an assumption (butteKing2005 states no mass for its 749 g/day), but
  the same paper's four studies with measured milk energy output and maternal weight (66 women) give 20.7–25.1
  kcal/day per kg^0.75 (mean 22.6, SD 1.9; pooled 23.1). The registered 23.2 sits +2.6% above the studies' mean, 0.3 of
  their SD: the measured human outputs **confirm** the coefficient; there is nothing to correct.
- **Rule 5.** No primate measurement of the efficiency of synthesis; 0.80 is the human biochemical derivation (80–85%).
- **`ledgerMilkKcalPerMin`.** No primate or ape milk transfer rate per minute of suckling was found; unchanged.
- **Composition** (rule 1: not an output). Recorded as a bracket: if hominoids conserved milk *volume* per kg^0.75
  rather than energy, chimpanzee milk at 0.53 kcal/g would make the yield 0.79 of today's, 18.4 kcal/day per kg^0.75 or
  243 kcal/day at 31.3 kg. Nothing measured says which is conserved (riek2021: both scale with the same exponent across
  mammals).

**Verdict: null for the input.** The human-scaled coefficient stays, now as a human value confirmed by measured outputs
with maternal mass (still `assumed` as a cross-species input). No switch was built and no arm was run (§2.6), so STEP 2
and the benchmark (§5) do not apply.

**Brackets for a chimpanzee yield (recorded, not inputs).** Infant side (§3.1): an exclusively milk-fed infant needs
212 kcal/day at 3 months and 281 at 9 months on the captive potential, 221 at 9 months at Gombe's growth. Composition:
243 kcal/day if volume rather than energy were conserved. Human scaling: 307 (range of the four human studies scaled to
31.3 kg: 274–333). A wild chimpanzee yield between about 220 and 310 kcal/day agrees with every piece read; the input
sits at the top of that bracket.

## 8. What the audit leaves open (for the integrator)

- **The mothers' milk cost after the first year is set by the cap, not by a measured output.** From about 0.9 y every
  infant drinks the whole yield (307 kcal/day, so the mother pays 384) at every age to 4 y, while it eats 0.31–0.57 of
  the field's eating minutes at 2.4–5.2 × the per-minute intake the field's eating time implies (§3.1; E1f's open
  problem). In the field the milk share falls from about 1–1.5 y (isotopes), and no chimpanzee milk transfer has ever
  been measured. A lower cap would lower the mothers' cost, but no measured value supports one; the lever the evidence
  points to is the infants' intake rate per eating minute (`ledgerIntakeSizeExp`, design), a demand-side input, not the
  yield.
- **Candidate input correction (not made here; outside this stage's three inputs):** `digestaMilkDmGPerKcal` 0.185 g/kcal
  is human; captive chimpanzee milk gives 0.216 (milligan2007, n = 4). It changes how much milk an infant's foregut takes
  at a feed, not the mothers' cost.
- The bases' readouts quoted in the report come from the integrator's existing single 5-seed confirm runs of S3
  (`S3c`, `S3-energy`, d066cdc) and T (`e1h-T`, `e1h-T-energy`, 9392b67), generated by `basetable.py` (local copy); no
  new base realizations were run (no arm).
- Third full-text routes the helper found but did not try (cap of two): an academic.oup.com PDF of roberts1985 listed in
  Crossref, and a Groningen repository copy of daCosta2010. Neither could change the verdict (a baboon value is a bracket
  under rule 4; daCosta2010 has no maternal mass in the abstract).

## 9. Known defects and caveats

- None in code: no code was changed. The step-1 need uses the registry's Kleiber rate for infants (human infants run
  above Kleiber per kg^0.75) and E1f's captive growth potential; both are registered inputs, and the need matches the
  model's own books within 4% (§3.1).
- The 2-day smoke (seed 48, S3, eeded56; `artifacts/validation/e1m/smoke-S3.log`) printed the milk-by-age and mothers'
  milk-cost readouts used here.
