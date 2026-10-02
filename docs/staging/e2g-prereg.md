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
