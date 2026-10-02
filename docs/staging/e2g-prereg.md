# E2g pre-registration: water balance (the thirst timers)

Branch `e2g-water` from `track-e` f64cf55. Track E, stage E2g. Rules policy only; development seeds 48 and 7; no run
longer than 90 days in all. Started 2 October 2026, 07:42.

This file is written in steps, each committed before the step it governs: §1–§2 (the rule removed, sources, audit of
the targets) before any run; §3 (diagnosis readouts) before the diagnosis runs on unchanged code; §5 onwards
(mechanism, switch, arms, predictions, kill criterion) before any run of changed code; every iteration in the run log
before its run.

**Rule of this stage.** Field values of behaviour are targets, never inputs. The water ledger's inputs (water content
of foods, metabolic water per kcal oxidised, evaporative, faecal and urinary losses) must be sourced physiology or
physics; none is tuned to a drinking rate, a ranging distance or a party size.

## 0. The problem

Thirst is a set of timers counted as prescriptions (group "needs"/"feeding", outcome-encoding "5d need timer" in
`scripts/lib/prescriptions.ts`): `thirstAwakePerH` 0.026/h, `thirstSleepPerH` 0.008/h, `thirstHotC` 22 °C with
`thirstHotPerH` 0.008/h, `thirstRainRelief` 0.03 per unit rain, `fruitThirstFactor` (field 0.55 per fruit unit; tuned in
C5a against T-ACT-2 and T-RNG-4) and `drinkThirstPerH` 1.4/h at the water (src/sim/life.ts:149, execution.ts:578,
execution.ts:957). The drink offer is `thirst × 1.5 − d / drinkDistScaleM − 0.05` above thirst 0.25
(candidates.ts:359–361; `drinkDistScaleM` field 2,000 m, tuned in C5a against T-ACT-2 and T-RNG-4). Thirst also
re-draws every rules decision when its need bucket changes (rg.ts:132).

E1j's attribution run A1 (e1j-prereg.md §10; R with the three thirst timers at 0): every adult walks to water 2.3–3.1
times a day on R; without the timers males' simulation-truth daily path falls by 0.64 km and mothers' by 0.38,
parties stay together (T-PTY-1 3.80 → 4.37), males stop walking to rejoin callers, T-RNG-4 falls to 1.50 and T-ACT-3
rises out of band; all sums inside noise. So the timers carry walking and a fission clock.

## 1. Sources (step 0; audit by two subagents with disjoint lists, 07:46–08:00; files `sources-inputs.md`, `sources-targets.md` in the session scratch `e2g/`)

### 1.1 Inputs of the water ledger (values registered here before any run; every one physiology or physics)

| Input | Value (range) | Source, sample, method | Tag |
| --- | --- | --- | --- |
| Water in ripe fruit (drupes) | 0.75 of fresh mass (0.66–0.84): 3.0 g water per g dry matter | masi2015 (FT, PMC4495928): dry-matter fraction 0.25 ± 0.09 for pulpy and 0.32 ± 0.11 for fibrous fruit; western gorilla foods, Bai Hokou (18 fruit species), weighed fresh, then field and lab drying | [M] |
| Water in figs | 0.75 (no fig value verified; conklinWrangham1994, Kibale figs, unreachable: ScienceDirect 403) | masi2015 pulpy fruit as stand-in | [L] |
| Water in fallback foods (young leaves, pith) | 0.75 (no verified value; rothman2006 (Abs): Bwindi gorilla foods 7–96% moisture) | masi2015 pulpy fruit as stand-in | [L] |
| Water in meat, milk | 0.73, 0.876 | the dry-matter fractions already in the registry (`digestaMeatDmGPerKcal` 27% dry matter, `digestaMilkDmGPerKcal` 12.4% solids) | assumed |
| Metabolic water | 0.14 mL per kcal oxidised (0.10–0.15) | blumstein2024 (FT, PMC11979454): 0.60 g/g carbohydrate, 1.07 fat, 0.41 protein, i.e. 0.15, 0.12 and 0.10 g/kcal; a fruit diet's energy is mostly sugar; sawka2015's +250–350 mL/d at 2,500–3,000 kcal/d gives 0.10–0.12 | [L] (stoichiometry) |
| Latent heat of evaporation | 2,426 J/g | baker2019 (FT, PMC6773238) | physics |
| Regulated evaporation (sweat, panting) | E2a's heat balance (`rhythmEvapW` 1.2 W/kg maximum; kamberov2018: chimpanzee eccrine density a tenth of human) ÷ latent heat | e2a-prereg.md | as E2a |
| Insensible loss: respiration | 1.7×10⁻⁵ · M · (5,867 − pa) W/m² (M metabolic rate per m² of skin, pa ambient vapour pressure in Pa) | Fanger / ISO 7730 as implemented in rinjea2022 (FT, PMC9324884); humans; at 25 °C, 80% RH about 117 g/m²/day, consistent with sawka2015's 250–350 mL/d | [L] |
| Insensible loss: skin diffusion | 3.05×10⁻³ · (5,733 − 6.99 · M − pa) W/m² | the same; human bare skin (fur not modelled); about 303 g/m²/day at 25 °C, 80% RH | [L] |
| Skin area | 0.1 · mass^(2/3) m² (Meeh) | E2a's assumed geometry (`rhythmAreaM2` is a quarter of it) | assumed |
| Faecal water | 0.75 of faecal mass (0.63–0.86) | rose2015 (FT, PMC4500995): human median 75% (n 47 study means; vegetarian 78.9%) | [L] |
| Obligatory urine | 10.7 mL per kg per day | popkin2010 (FT, PMC2908954): a solute load of 900–1,200 mOsm/d needs 0.75–1.0 L/d at the maximum concentration of 1,400 mOsm/kg (adult human, ~70 kg); the lower end, as a fruit diet carries less protein and salt | [L] |
| Thirst | none below a deficit of 1% of body mass, rising linearly to full at 2% | armstrongKavouras2019 (FT, PMC6950074): thirst perceived "beginning at the level of 1%–2% body mass loss"; the linear form is a design assumption | [L] |
| Drinking rate | 3.1 mL per kg per min (2.0–6.7) | armstrongKavouras2019: "dehydrated humans drink to satiation rapidly across 3–10 min"; derived: the deficit of full thirst (2% of mass) replaced in the middle of that window (6.5 min) | [L] |

Not found (not verified): water content of Kibale foods by type, chimpanzee sweat rates (whitford1976 blocked), chimpanzee
urine volume or concentrating ability, primate faecal moisture, an mL/min drinking rate of any primate (gart2015 not open
access), the osmotic thirst threshold. Water turnover of apes: pontzer2021's full text is not reachable (Cloudflare; not
in PMC): only the abstract's ~2.8 mL of water per kcal (zoo and sanctuary apes; wild values *estimated*, not measured).
No isotope water turnover of any wild great ape exists that either agent found (moderate confidence). Nearest wild primate:
simmen2010 (FT, PMC2845615), doubly labelled water in wild lemurs: 317–551 mL/day, 139–308 mL/kg/day, 2.1–3.7 mL/kcal.

### 1.2 Targets: the field's drinking data (audit)

- **T-RHY-6 is mislabelled.** nelson2022 (FT, accepted manuscript, NSF PAR; Gombe Kasekela, 1975–2016; 25 mothers with
  offspring under 4.5 y in each lactation stage; 1-min point samples on mother–infant follows; drinking = "ingestion of
  freestanding water") analyses **point samples scored as drinking**, not drinking bouts: "788 and 352 recorded drinking
  point samples" (mothers, offspring) in 10,517 and 10,680 h. So drinking takes about **0.12% of mothers' observed time**
  (0.9 min per 12 h; per-bin mean 0.001 ± 0.002); offspring 0.055%. No bout rate, no rate per day is printed. Season
  (derived from the GLMM, Table 3): mothers drink 2.9 × more in the dry season (May–October) than in the wet. The staged
  row's "0.9 drinks per 12 h" and its band 0.3–2.0 events per 12 h therefore have no source. A correction is staged in §1.3.
- wessling2018 (FT; Taï East and South, Fongoli; adults > 11 y; 12,675 focal hours): "number of drinks per focal
  observation time on the day prior", mean 0.059 ± 0.072; the unit is not stated (per hour would be ~0.7 drinks per 12 h)
  [L]. Taï (1,759 mm/yr) shows late-dry-season dehydration (urinary creatinine) as strong as Fongoli's.
- mackenzie2025 (FT, PMC12011317; Kanyawara 2005–2018, 81 chimpanzees): drinking recorded as all occurrences by the
  follow's second assistant during 15-min party scans; an event is "any instance where an identified chimpanzee was
  observed drinking water". 4,087 events; 77.6% of known locations at streams (T-RHY-7). No observation effort in the
  text (rates only in Fig. 5 and the ESM, not retrieved), so **no Kibale rate per day**. Females drank more than males.
- lindshield2021 (FT, review): Fongoli individuals "drink water almost daily" (secondary). peter2022 (FT, Budongo
  Waibira): no permanent rivers; one pool in the December–March dry season. No rates.
- Readouts compared here, therefore: the **share of daylight minutes spent drinking** (nelson2022's measure: ~0.12% for
  mothers, Gombe, all seasons), drinking events per 12 h of follow (wessling2018's unit-uncertain ~0.7 as context only),
  the stream share (T-RHY-7, 0.78), and the direction "more drinking when food water is low".

### 1.3 Staged correction (not applied; user decision, like other staged rows)

T-RHY-6 should read: "share of focal point samples scored as drinking free water, adult females; dry against wet
months"; field value 0.0012 (mothers, Gombe, nelson2022; dry season 2.9 × wet); band to be set by the integrator.
Nothing in `data/targets.json` or `e-targets.patch.json` is changed by this stage.

## 2. Plan (registered now; each step below gets its own section, committed before it runs)

1. §1 sources and the audit of T-RHY-6 (sample, method) — commit.
2. §3 diagnosis readouts (defined from the source's Methods, smoke-tested on 1–2 days) — commit; then the diagnosis
   on R, quick (seeds 48, 7; 30 + 30 days), unchanged code: drinking bouts per day and their timing, share of travel
   that heads to water, how often a party splits when one member heads to water, thirst at drinking; and offline
   arithmetic: the water balance the model's food intake implies if fruit water were counted.
3. §5 mechanism behind a new switch (0 = today): a water ledger beside the energy ledger (in: food water, metabolic
   water, drinking; out: evaporation from E2a's heat balance, faeces, urine), thirst read from the water deficit,
   drinking valued like eating; no hourly thirst rate, no hot-hour bonus, no fruit factor. Tests: conservation
   (in − out = change in stores, exact), determinism, switch-off identity; the prescription count must fall.
4. Arms (at most 3 iterations, each logged here and committed before its run), judged against the mean of R's
   replicated quick realizations (e-noise.md amendment 2), after an identity check of R at this head.

## 3. Diagnosis readouts (registered before the diagnosis runs; `scripts/water-diagnose.ts`, reads only)

World and focal observer as `scripts/ranging-diagnose.ts` builds them (e-bench's world; the T-RNG-4 and T-RNG-5 values
printed under "identity" must equal e-bench's per-seed values). Classes: adult male, lactating female, other adult
female (≥ 15 y), juvenile 5–15 y. Smoke test on R (seed 48, 1 + 2 days, 7.6 s): every readout filled, ledger columns
empty as expected on code without a water ledger.

| Readout | Definition (truth = simulation state every tick; observer = focal follows, 1-min point samples) | Why |
| --- | --- | --- |
| walks to water per chimp-day | entries into the drink act | E1j's "walks to water"; the timers' prescribed walks |
| drinking events per 12 h of daylight (truth) | runs of ticks in the drink act within 1.2 m of the site (the observer's `atWater`), starting in daylight (> 0.1), ÷ (daylight hours ÷ 12) | T-RHY-6's unit: "Drinking events (free water) per individual per 12 h of follow time" |
| drinking events per 12 h of follow (observer) | a run of consecutive 1-min samples with feeding type "drinking" (`FEED_WATER`) is one event; ÷ (follow hours ÷ 12), by the follow's class | T-RHY-6's "How to measure: count drink actions on focal follows of adult females; divide by follow hours" |
| minutes per event; share of daylight minutes drinking | ticks at the water ÷ events; daylight ticks at the water ÷ daylight ticks | nelson2022: "0.001 of observation minutes" |
| event starts by local hour | histogram of (06:30 + world.time) mod 24 | timing of drinking |
| share at stream-bank sites | event sites within the stream's half width + 3 m | T-RHY-7 (76% at streams, mackenzie2025), indicative: model sites carry no kind |
| drink path and its share of the daily path | path walked in the drink act ÷ all movement (teleports skipped, as ranging-diagnose) | "the share of travel that heads to water" |
| thirst at walk start and at event start | `c.thirst` at the first tick of each; with a water ledger also the deficit (mL, % of body mass) | thirst at drinking |
| party split per walk to water | for walks started in daylight with party mates (members ≥ 5 y): share ending with ≥ 1 of those mates out of the walker's party; mean share of mates lost; share of split walks with a lost mate back within 60 min of the walk's end | "how often a party splits when one member heads to water" |
| truth day range | km/day of all movement by class (ranging-diagnose's `pathKmPerDay`) | males' and mothers' true day range |
| water budget (ledger arms only) | mL/day by term from the ledger's tap: food, metabolic, drunk, milk in; evaporation (regulated), insensible, faecal, urine, milk out; mean deficit | the ledger's own balance |
| reserve slope | least-squares slope of the daily midday mean of energy reserves ÷ usable store, % per day, by class; deaths by cause | viability (as energy-diagnose's trajectories) |

**§3 addition (registered after iteration 1's first diagnosis, before its re-run; disclosed).** Kill criterion (a)
names "an individual held above 5%", which no §3 readout measured: `water-diagnose` now also reports, per class, the
largest deficit of any individual at any tick (% of mass) and the share of chimp-ticks above 3% of mass. W1's diagnosis
is re-run with it from a frozen checkout (simulation code unchanged); every earlier readout must reproduce exactly.

## 4. Diagnosis results (R at this head; unchanged simulation code)

**Identity.** R quick at 61550da (`e-bench --quick`, frozen checkout, `git.dirty` 0) equals the integrator's `R-quick`
(612bf15) on all 110 rows and the viability block (wall times aside): fitted 6.460, held-out 2.985, count 103. So R's
four quick realizations (`R-quick`, `NR1q`–`NR3q`, bench-run) are this stage's reference. The diagnosis's identity
values (T-RNG-4 1.994 / 1.695, T-RNG-5 0.620 / 0.778 for seeds 48 / 7) equal e-bench's per-seed values.

Water diagnosis on R (seeds 48, 7; 30 + 30 days; `D-R-{48,7}.json`, frozen checkout of 1d0b7c0; generated by
`tools/diag_compact.py`; M adult males, L lactating, F other adult females):

| readout (mean of seeds 48, 7) | R M | R L | R F |
| --- | --- | --- | --- |
| walks to water per day | 2.77 | 2.59 | 3.12 |
| drinking events per 12 h of daylight (truth) | 2.06 | 2.04 | 2.31 |
| minutes per event | 6.1 | 5.8 | 6.0 |
| daylight minutes drinking (%; Gombe mothers 0.12) | 1.75 | 1.60 | 1.90 |
| walk to water (km/day) | 0.45 | 0.41 | 0.49 |
| walk to water ÷ all movement | 0.20 | 0.24 | 0.25 |
| walks with mates that end split | 0.73 | 0.69 | 0.71 |
| split walks rejoined within 60 min | 0.37 | 0.41 | 0.38 |
| thirst at event start | 0.32 | 0.31 | 0.31 |
| events at stream banks (T-RHY-7 0.78) | 0.11 | 0.09 | 0.16 |
| truth day range (km/day) | 2.20 | 1.70 | 1.97 |
| reserve slope (% of store per day) | -0.003 | -0.010 | 0.004 |

Observer (focal follows): adult females 164 drinking events in 748 follow hours (2.63 per 12 h), males 137 in 726 h
(2.26). Event starts by local hour (adults): 16% in 07:00–08:00, then 6–12% in each hour to 18:00.

**Reading.** On R every adult walks to water 2.6–3.1 times a day and drinks for ~6 min each time: 1.6–1.9% of daylight,
**13–16 × Gombe mothers' 0.12%** (nelson2022, a drier site). A fifth to a quarter of all movement is walking to water, and
seven walks in ten that start with party mates end with the walker in a different party (fewer than half are rejoined
within an hour): the prescribed thirst clock is a fission clock, as E1j's A1 found. Drinking is spread evenly through
the day (the timers rise at a fixed rate), with a peak after leaving the nest. Model water sites carry no kind; 9–16% of
events are at stream-bank sites against 78% at Kanyawara (sites are 2 bank spots per community plus ~4 pools per km²,
design).

**Offline water balance** (`tools/offline_water.py`: R's intake from the integrator's `e1h-R-energy` run, 5 seeds × 60
days, with the §1.1 inputs; regulated evaporation not included; insensible loss at 20 °C, 85% RH by day and 16 °C, 95%
by night):

| class | DM in g/d | food water | metabolic | insensible | faecal | urine min | milk out | balance before excess urine and regulated evaporation | night deficit, 12.6 h, % of mass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adult male | 527 | 1580 | 211 | 584 | 382 | 417 | 0 | +408 | 1.67 |
| female, other | 463 | 1389 | 176 | 501 | 351 | 335 | 0 | +378 | 1.79 |
| female, lactating | 574 | 1722 | 237 | 534 | 416 | 335 | 401 | +271 | 2.24 |
| juvenile 5–12 y | 412 | 1236 | 171 | 394 | 293 | 214 | 0 | +507 | 2.08 |

So a day of R's feeding brings in ~1.2–1.7 L of food water and leaves a surplus of 0.3–0.5 L/day (passed as urine),
while a night without food builds a deficit of 1.7–2.2% of body mass by dawn (faeces and urine continue: the faecal term
is a human water fraction applied to E1b's fibre-only faecal dry matter, passed continuously). Expectation: thirst at
dawn, sated by a drink or by a fruit breakfast (~9 mL of water per feeding minute on drupes), and little thirst by day.

## 5. Mechanism, switch, arms, predictions, kill criterion (registered before any run of changed code)

**Rule removed.** The thirst timers and their conversions: `thirstAwakePerH`, `thirstSleepPerH`, `thirstHotPerH`
(outcome-encoding timers), `thirstHotC`, `thirstRainRelief` (design), `fruitThirstFactor` (tuned in C5a against T-ACT-2
and T-RNG-4), `drinkThirstPerH` (timer) and `drinkDistScaleM` (tuned in C5a). Switch **`waterLedger`** (0 = today,
hash-identical; read only with `energyLedger` and `ledgerDigesta` 1; regulated evaporation needs `rhythmHeat`).
Prescription count (`prescription-ledger --count`): R 103 → R + `waterLedger` **97** (all six counted prescriptions out
while E3's `urgencyChoice` and `urgencyPersist` are 0; ACTIVE_WHEN in scripts/lib/prescriptions.ts).

**Mechanism** (src/sim/water.ts; hooks in life.ts needs, energy.ts eat and nurseTick, rhythm.ts heatStep, execution.ts
drink/forage/nurse, candidates.ts drink offer). Per individual, a deficit `def` (mL below euhydration, opened at 0):
- in: food water when eaten (the food's dry matter per kcal from E1b × water share ÷ dry share; §1.1 shares), metabolic
  water (0.14 mL per kcal of the energy ledger's spending, milk energy exported excluded), drinking (3.1 mL/kg/min at a
  site, until the deficit is replaced);
- out: regulated evaporation (the evaporative part of E2a's heat loss, `heatOut.evapW`, ÷ 2,426 J/g), insensible
  respiration and skin diffusion (Fanger / ISO 7730 at the energy ledger's metabolic rate per m² of skin and the air's
  vapour pressure from `env.temperature` and `env.humidity`), faecal water (E1b's passed dry matter × 0.75 ÷ 0.25),
  obligatory urine (10.7 mL/kg/day), milk water (the mother loses what her infant's eat books in), and any water above
  euhydration as urine at once;
- thirst = clamp((def ÷ mass as % − 1) ÷ (2 − 1)); the drink offer (age ≥ 3, thirst > 0) is worth thirst × 1.5 × the
  share of the trip spent drinking (deficit at the drinking rate against the walk at `walkMps`: a food trip's valuation
  under the ledger, the share of the full intake rate delivered, walk included) − 0.05 (the offer's existing weights).
  No hourly thirst rate, no hot-hour bonus, no fruit factor, no distance scale.
- Tests (tests/sim-water.test.ts, 7 pass): conservation in − out = −Δdef per individual over a day in both profiles,
  milk water in = milk water out; switch-off identity (default, with the ledgers, and the switch alone without them);
  the six timers have no effect with the switch on; determinism however ticks are batched; saves round-trip; thirst
  scale and drinking; Fanger at 25 °C and 80% RH within 350–500 g/m²/day.

**Smoke tests** (≤ 2 days, switch on) check the readouts and the budget; a defect found there is fixed and logged here
before the arm runs (not an iteration).

**Known defects and limits, deferred (file:line):**
1. src/sim/urgency.ts:108, :115–116 (E3, off in every arm here): with `urgencyChoice` or `urgencyPersist` 1, payOf still
   values drinking by `drinkThirstPerH` and fruit by `fruitThirstFactor` (intake.ts:69, :76) on the ledger's thirst.
2. src/sim/energy.ts sharePlant: a shared piece moves without water (the giver booked it when eating). Minor.
3. src/sim/candidates.ts drink offer gate `c.age >= 3` (existing): dependants under 3 y never drink.
4. Water sites hold no stock and no kind (src/sim/generation.ts:260, :272): every site fills any deficit; T-RHY-7 not
   scorable.
5. Skin diffusion is a human bare-skin model (fur not modelled); faecal dry matter is E1b's unfermented fibre only; the
   energy of growth is counted as oxidised; dehydration has no effect on health or survival (the deficit is a readout
   judged in viability below).
6. The observer folds time at the water into feeding (src/field/categories.ts:47): T-ACT-1 falls by whatever drinking
   time falls (R: 1.6–1.9% of daylight).

**Arm (iteration 1).** W1 = R + `{"waterLedger":1}`. Quick mode (seeds 48, 7; 30 + 30 days; rules policy), from a
frozen checkout of the commit that adds this section: `e-bench --quick --workers 1 --compare R-quick` and
`water-diagnose` on both seeds. Judged against R's four quick realizations (`R-quick`, `NR1q`–`NR3q`; identity at this
head shown in §4) by e-noise.md amendment 2: z = (arm − mean) ÷ (SD × √1.25), SD = max(registered quick SD, R's own
spread); |z| > 2 is a result, reported with and without T-HUN-4 and T-BRD-1. Diagnosis readouts against R's diagnosis
(one realization, §4).

**Predictions (W1; registered ranges):**

| Readout | R | W1 expected |
| --- | --- | --- |
| walks to water per adult-day | 2.6–3.1 | 0.3–1.5 |
| drinking events per 12 h of daylight (truth, adults) | 2.0–2.3 | 0.3–1.5 |
| minutes per event | 5.8–6.1 | 2–8 |
| daylight minutes drinking (Gombe mothers 0.12%) | 1.6–1.9% | 0.1–0.7% |
| adult events starting 07:00–09:00 | 28% | ≥ 35% (thirst after the night) |
| walk to water (km/day) | 0.41–0.49 | 0.05–0.30 |
| walks with mates that end split | 0.69–0.73 | 0.55–0.80 (the per-walk mechanics are unchanged) |
| mean deficit (% of body mass), adult classes | — | 0.3–1.2; no class mean above 2 |
| truth day range, males / mothers (km/day) | 2.20 / 1.70 | 1.55–2.00 / 1.30–1.60 |
| T-RNG-4 (R mean ± SD 1.897 ± 0.126) | | 1.45–1.85 |
| T-RNG-5 (0.706 ± 0.080) | | 0.65–0.90 |
| T-PTY-1 (3.80 ± 0.15) | | 3.9–4.5 |
| T-ACT-1 feeding (0.298 ± 0.009; includes drinking) | | 0.27–0.30 |
| T-ACT-2 travel (0.152 ± 0.005) | | 0.11–0.145 |
| T-ACT-3 grooming (0.243 ± 0.014) | | 0.25–0.32 |
| fitted, held-out, held-out without T-HUN-4 and T-BRD-1 | | inside noise (\|z\| < 2); fitted may rise (A1: z +1.32) |
| prescription count | 103 | 97 |
| viability | pass | pass: no starvation, reserve slopes within R's range ± 0.05%/day |

**Kill criterion (iteration 1).** (a) Physiology fails: any adult class's mean deficit above 2% of body mass, or an
individual held above 5%: the inputs cannot be met through the model's access to water; stop and report. (b) Viability
fails (a starvation death, or any class's reserve slope 0.05%/day below R's). **Keep rule** (Track E): viability passes,
held-out not up beyond noise (z ≤ +2, both row sets), count down → provisional keep candidate, confirm recommended.

## 6. Run log

| Iteration | Registered (commit) | Arm | Status |
| --- | --- | --- | --- |
| 1 | e378e73 | W1 = R + `waterLedger` 1 | smoke test (seed 48, 1 + 2 days, 2.9 s): every readout filled; no defect; 68% of adult drinking events at 07:00–09:00, deficit at an event 1.7–2.2% of mass; budget (mL/day) e.g. adult males: food 1,113, metabolic 203, drunk 569 in; evaporation 164, insensible 603, faecal 307, urine 800 out. Ran from frozen checkouts of e378e73 (e-bench, diagnosis) and 75c722b (diagnosis re-run with the §3 addition; every earlier readout reproduced exactly). Done: §7 |
| 2, 3 | — | — | not used (§8) |

## 7. Iteration 1 results (W1 = R + `waterLedger` 1; quick, seeds 48 and 7, 30 + 30 days; rules policy)

Runs (frozen checkouts in the session scratch `e2g/`; copied with the scripts (`tools/`) and the two source audits
(`sources/`) to `artifacts/validation/e2g/` of the e2g-water worktree, gitignored): `W1-quick.json` (e-bench, `git.dirty` 0),
`D-W1b-{48,7}.json` (water-diagnose), `E-W1.json` and `E-R.json` (energy-diagnose, quick, same seeds). R's
diagnosis spread: `D-{R,NR1,NR2,NR3}-{48,7}.json` (the four quick realizations; each diagnosis's T-RNG-4 and T-RNG-5
equal the e-bench run of the same realization, so the worlds are the integrator's). Identity at this head: the R stack's
field world hashes after 2 days are equal before (61550da) and after (75c722b) the mechanism (seed 48 9deaf1df367a7d34,
seed 7 51357e4fb3248108). Every number below is printed by the scripts named (session scratch `e2g/tools/`).

**Sums against the mean of R's four realizations** (`tools/zscore.py`; e-noise.md amendment 2):

```
## W1-quick against the mean of 4 reference realizations (commit e378e73, dirty 0)
- fitted: 16 rows; arm 4.366; reference mean 3.900 (runs 5.13, 3.76, 3.42, 3.29; own SD 0.84); change +0.466; SD used 0.84; z +0.50 -> inside noise
  largest row changes vs the mean: T-SOC-9 -0.39, T-ACT-3 +0.36, T-HUN-2 +0.17, T-HUN-1 +0.15, T-ACT-4 +0.12, T-ACT-1 +0.05
- held-out: 12 rows; arm 2.216; reference mean 2.534 (runs 2.48, 2.40, 2.23, 3.03; own SD 0.35); change -0.318; SD used 1.26; z -0.23 -> inside noise
  largest row changes vs the mean: T-HUN-4 -0.24, T-SOC-3 -0.16, T-HUN-8 +0.14, T-RNG-5 -0.09, T-SOC-6 +0.09, T-SOC-10 -0.08
- held-out, no rare: 11 rows; arm 2.216; reference mean 2.292 (runs 2.48, 2.24, 2.23, 2.21; own SD 0.13); change -0.076; SD used 0.48; z -0.14 -> inside noise
  largest row changes vs the mean: T-SOC-3 -0.16, T-HUN-8 +0.14, T-RNG-5 -0.09, T-SOC-6 +0.09, T-SOC-10 -0.08, T-FOOD-7 +0.04
```

**Report table** (`tools/final_table.py`; diagnosis rows pool adults over classes and seeds by chimp-days):

| quantity | R (mean ± SD, 4 diag / 4 bench) | W1 |
| --- | --- | --- |
| drinking events per adult-day | 2.240 ± 0.013 | 0.839 |
| walks to water per adult-day | 2.803 ± 0.030 | 0.977 |
| daylight minutes drinking (%) | 1.783 ± 0.021 | 0.606 |
| share of adult movement walking to water | 0.221 ± 0.006 | 0.099 |
| split share of walks with mates | 0.708 ± 0.005 | 0.675 |
| males' true day range (km/day) | 2.159 ± 0.065 | 1.776 |
| mothers' true day range (km/day) | 1.696 ± 0.027 | 1.401 |
| T-RNG-4 | 1.897 ± 0.126 | 1.648 |
| T-RNG-5 | 0.706 ± 0.080 | 0.680 |
| T-PTY-1 | 3.799 ± 0.154 | 4.090 |
| T-ACT-1 | 0.298 ± 0.009 | 0.289 |
| T-ACT-2 | 0.152 ± 0.005 | 0.139 |
| T-ACT-3 | 0.243 ± 0.014 | 0.276 |
| T-ACT-4 | 0.493 ± 0.029 | 0.519 |
| fitted sum | 3.90 ± 0.84 | 4.37 (z +0.50; 16 rows) |
| held-out sum | 2.53 ± 0.35 | 2.22 (z -0.23; 12 rows) |
| held-out, no rare sum | 2.29 ± 0.13 | 2.22 (z -0.14; 11 rows) |
| prescription count | 103 | 97 |
| viability (bench; reserve slope %/day M, L, F; deaths) | pass; +0.001 ± 0.003, -0.001 ± 0.006, +0.001 ± 0.004 | pass; +0.001, +0.007, +0.003; deaths 0; max class mean deficit 0.94% |

**Water readouts by class** (`tools/diag_vs_ref.py`; R = mean ± SD of its four realizations):

| readout | R M (4) | R L (4) | R F (4) | W1 M | W1 L | W1 F |
| --- | --- | --- | --- | --- | --- | --- |
| walks to water per day | 2.77 ± 0.03 | 2.55 ± 0.04 | 3.08 ± 0.08 | 0.92 | 1.00 | 1.04 |
| drinking events per 12 h of daylight | 2.08 ± 0.02 | 2.04 ± 0.01 | 2.33 ± 0.03 | 0.72 | 0.86 | 0.87 |
| minutes per event | 6.1 ± 0.1 | 5.8 ± 0.0 | 6.0 ± 0.1 | 4.8 | 6.6 | 4.8 |
| daylight minutes drinking (%) | 1.78 ± 0.03 | 1.64 ± 0.03 | 1.93 ± 0.03 | 0.50 | 0.80 | 0.60 |
| walk to water (km/day) | 0.44 ± 0.01 | 0.40 ± 0.01 | 0.47 ± 0.02 | 0.14 | 0.17 | 0.18 |
| walk to water ÷ all movement | 0.202 ± 0.007 | 0.235 ± 0.004 | 0.241 ± 0.009 | 0.081 | 0.119 | 0.115 |
| walks with mates that end split | 0.72 ± 0.01 | 0.69 ± 0.02 | 0.70 ± 0.01 | 0.67 | 0.69 | 0.68 |
| split walks rejoined within 60 min | 0.39 ± 0.02 | 0.44 ± 0.02 | 0.40 ± 0.03 | 0.45 | 0.48 | 0.41 |
| thirst at event start | 0.32 ± 0.00 | 0.31 ± 0.00 | 0.31 ± 0.00 | 0.74 | 0.92 | 0.79 |
| deficit at event start (% of mass) | — | — | — | 1.77 | 2.42 | 1.83 |
| mean deficit (% of mass) | — | — | — | 0.70 | 0.93 | 0.69 |
| largest individual deficit (% of mass) | — | — | — | 3.21 | 3.28 | 2.70 |
| truth day range (km/day) | 2.16 ± 0.06 | 1.70 ± 0.03 | 1.94 ± 0.06 | 1.78 | 1.40 | 1.53 |
| reserve slope (% of store per day) | 0.001 ± 0.003 | -0.001 ± 0.006 | 0.001 ± 0.004 | 0.001 | 0.007 | 0.003 |

**Reserve slopes from energy-diagnose** (`tools/energy_slopes.py`; % of the usable store per day, least squares over daily midday means; one quick run each):

| arm | adult male | female, other | female, lactating | juvenile 5–12 y | infant 2–5 y | infant 0.5–2 y | deaths |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R | -0.002 (mean +0.005) | -0.000 (mean +0.001) | -0.010 (mean -0.047) | -0.012 (mean -0.007) | +0.002 (mean -0.009) | +0.006 (mean -0.003) | 0 |
| W1 | +0.001 (mean +0.004) | +0.004 (mean +0.002) | +0.007 (mean -0.045) | +0.024 (mean -0.008) | -0.007 (mean -0.011) | +0.013 (mean -0.005) | 0 |

Observer (focal follows): adult females 91 drinking events in 882 follow hours (1.24 per 12 h; R's four: 2.48), males
57 in 676 h (1.01; R 2.35). Event starts by local hour (adults): 74% in 07:00–08:00, 14% in 08:00–09:00, then ≤ 4% an
hour (R: 16% in the first hour, then 6–12% every hour to 18:00). No drinking at night. Water budget (mL/day; ledger tap):
adult males in: food 1,541, drunk 439, metabolic 209; out: urine 1,043 (obligatory 417 plus the passed surplus),
insensible 605, faecal 371, regulated evaporation 170. Lactating females in: food 1,748, drunk 583, metabolic 193; out:
urine 1,064, insensible 530, faecal 415, milk 394, evaporation 123. Water taken in per kcal eaten (energy-diagnose's
kcal): 1.17 (males), 1.20 (lactating), 1.25 (other females) mL/kcal, against ~2.8 in zoo and sanctuary apes
(pontzer2021, abstract; isotope turnover); the model eats 449–575 g of dry matter a day against the field mothers' 873
(T-ENE-3), so its food water is low too. Largest individual deficit 2.6–3.6% of body mass; at most 0.2% of chimp-ticks
above 3%.

**Against the predictions (§5):** held: walks to water 0.92–1.04 a day (0.3–1.5); events 0.72–0.87 per 12 h (0.3–1.5);
4.8–6.6 min per event (2–8); 88% of adult events at 07:00–09:00 (≥ 35%); walk to water 0.14–0.18 km/day (0.05–0.30);
split share per walk 0.67–0.69 (0.55–0.80); mean deficit 0.69–0.93% (0.3–1.2, no class above 2); truth day ranges 1.78
and 1.40 km/day (1.55–2.00, 1.30–1.60); T-RNG-4 1.648 (1.45–1.85); T-RNG-5 0.680 (0.65–0.90); T-PTY-1 4.09 (3.9–4.5);
T-ACT-1 0.289 (0.27–0.30); T-ACT-2 0.139 (0.11–0.145); T-ACT-3 0.276 (0.25–0.32); every sum inside noise; count 97;
viability pass. Missed: mothers' daylight drinking time 0.80% (registered 0.1–0.7%; males 0.50, other females 0.60).
Kill criteria: (a) not met (no class mean above 2%, no individual above 5%); (b) not met (no death; every class's
reserve slope within 0.04%/day of R's).
## 8. Verdict

**Iteration 1 (W1) passes the keep rule: provisional keep candidate; 5-seed confirm recommended.** Viability passes
(no death, reserve slopes as R's), held-out inside noise (z −0.23 on all shared rows, −0.14 without T-HUN-4 and T-BRD-1),
fitted inside noise (z +0.50), prescriptions 103 → 97. Every registered prediction held but one (mothers' daylight
drinking time 0.80% against ≤ 0.7%). Iterations 2 and 3 were not used: no defect or failed criterion called for one,
and the open questions below are inputs that need sources, not mechanism changes.

**What emerges.** With water in and out from sourced physiology, drinking becomes a dawn rehydration: a night without
food leaves a deficit of 1.8–2.4% of body mass (faeces, urine and insensible loss go on; no food water comes in), and
the first drink of the day replaces it; by day, food water (1.4–1.7 L/day on R's intake) exceeds losses and the surplus
leaves as urine. Walks to water fall from 2.6–3.1 to 0.9–1.0 a day and their path from ~0.45 to ~0.16 km/day. Each walk
still splits the walker's party as often as before (≈ 0.7), so the prescribed fission clock shrinks with the walks.

**Open problems.**
1. Drinking time is still 4–7 × Gombe mothers' 0.12% of observed time (nelson2022, a drier site; no Kibale rate
   exists). It is set by the dawn deficit, which rests on [L] human inputs: bare-skin diffusion (Fanger; a furred skin
   is not modelled, about a third of the night loss), urine and faeces passed continuously at night (no nocturnal
   antidiuresis, no defecation timing), and a human drinking rate. Chimpanzee insensible water loss and night urine
   flow would decide it.
2. Without the prescribed walks, males' day range falls (truth 2.20 → 1.78 km/day; T-RNG-4 1.90 → 1.65, band floor 1.5)
   and the freed time goes to grooming (T-ACT-3 0.24 → 0.28, further out of band): male ranging and fission–fusion now
   rest on food trips alone. That is the next stage's problem, not this one's.
3. The model takes in 1.2–1.25 mL of water per kcal eaten against ~2.8 in captive apes (pontzer2021, abstract): it eats
   about a third less dry matter than the field's nursing mothers (T-ENE-3), so its food water is low too; with the
   field's intake the daytime surplus would grow, not the dawn deficit.
4. Model water sites carry no kind or stock: 8–13% of drinking is at stream-bank sites against Kanyawara's 78%
   (T-RHY-7); the pools (`waterSitesPerKm2`, design) take the rest.

## 9. Files, merge and final checks

- Code: `src/sim/water.ts` (new), hooks in `src/sim/life.ts`, `energy.ts`, `rhythm.ts` (`heatOut`, a side output of
  `heatStep`; its result is unchanged), `execution.ts`, `candidates.ts`; `src/sim/state.ts` (`WaterLedger`, `wat` in
  `OPTIONAL_X`); 19 registry entries `water*` in `data/params.json` (every one in docs/simulation.md §17);
  `scripts/lib/prescriptions.ts` (switch and ACTIVE_WHEN); `scripts/water-diagnose.ts` (diagnosis, reads only);
  `tests/sim-water.test.ts` (7 tests); `tests/sim-track-e.test.ts` (switch list).
- Docs: this file; research.md and e-sources.md "Addendum: E2g water balance"; docs/simulation.md note and §17 rows.
- Merged `track-e` (85f1346, handoff only) once, before the final run: no conflict. Then `gen-params --check` clean,
  `tsc --noEmit` clean, `pnpm test` 669 tests: 668 pass, 0 fail, 1 skipped.
