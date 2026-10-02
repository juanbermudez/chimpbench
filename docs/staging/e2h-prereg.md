# Stage E2h pre-registration: departure timing, audit first

Written 2 October 2026 (started 09:22), before any run. Branch `e2h-departure` from `track-e` 702027e (every Track E
switch off by default). Track E rule: field values of behaviour are targets, never inputs; nothing here tunes a weight to
a departure time or to a share of departures before sunrise.

## 0. The question

On the integrated candidate stack S3 (e-stack2-confirm.md) the largest held-out cost is T-FOOD-10 ("breakfast
planning": share of nest departures before sunrise in fruit-scarce months; band 0.08–0.30; one site): today's model B
0.017, the reference stack R 0, the rhythm package (E2b–E2f) 0.69–0.76; staged T-RHY-3 (adult-female departures before
sunrise, 0.05–0.35) fails the same way (truth 0.67–0.99 on rhythm stacks). Seven stages found no physiological holder of
an awake animal in its nest until about sunrise. Before building an eighth, this stage audits the target and the
observer: is "too early" a behavioural miss, or a property of a one-site band and of how the model is scored?

## 1. Step 0a–b: the field departure data (sources read in full; each row's sample written out)

| Key | Access | Site, years, season | Sample (sex, reproductive state, mass) | Method and definitions (quoted) | Numbers |
| --- | --- | --- | --- | --- | --- |
| janmaat2014 | FT (PMC4246305 author manuscript via the Internet Archive, saved text) | Taï, Côte d'Ivoire (5.8°N, *P. t. verus*); 16 April 2009 – 30 August 2011, "three fruit-scarce periods", follows of 4–8 weeks | "five adult habituated female chimpanzees", "all with young offspring (<7 y)"; mass not given | "A target female was followed from the point of waking until construction of an evening sleeping nest"; "Astronomical sunrise times were retrieved from the website www.esrl.noaa.gov/gmd/grad/solcalc/sunrise.html" (NOAA's sunrise: upper limb with refraction, sun centre at −0.833°); "We only analyzed data from days that followed complete observation days"; "Breakfast was defined as the first food item eaten after waking up. Only mornings where breakfast consisted of fruit were considered (74% of all mornings)" | 275 full days in all; the departure model (Table 1) and Fig. 2A use **179 mornings** (N females 5); "18% of all departures were before sunrise" is said of Fig. 2, whose "datapoints (n = 179) show the observed departure times", so the share is of the 179 fruit-breakfast mornings. Intercept +779.1 ± 293.7 s (+13 min after sunrise) at average predictors; rain at the nest +437.6 s (P = 0.044); figs far from the nest earlier, non-fig far later (interaction P = 0.025); the authors read late departures of mothers to far non-fig sites as avoiding twilight predation by leopards |
| batesByrne2009 | FT (authors' accepted manuscript, saved text) | Budongo, Sonso (1.7°N, 31.5°E, East Africa Time); September 2002 – September 2003, all seasons | 15 focal adults: 8 males; 6 "lactating females" (lactating or gestating) and 1 receptive female; mass not given | "followed continuously … from when it left its night nest at sunrise to when it made another night nest around sunset"; "Males were observed at dawn leaving their night nests"; times are clock times; sunrise is not reported | Leaving the night nest, mean ± SD: males 06:56 ± 32 min (21), lactating females 06:46 ± 13 (12), receptive 06:37 ± 12 (4); no difference (F2,36 = 1.31, P = 0.28) |
| wrangham1975 | FT (PhD thesis, Apollo repository; saved text by E1j) | Gombe, Kakombe (4.7°S, 29.6°E); May 1972 – September 1973: dry Jul–Sep 1972, wet Nov 1972 – Jan 1973, dry Jul–Sep 1973 | adult males (target-male follows); mass not given | Table 3.1: "Mean times of leaving and entering night-nests are shown from all observations (N = 75)"; clock times (zone not stated); "Methods of finding a target included … starting at dawn where another observer had left a party the previous night" | Mean time of leaving the night nest: 06:50 (dry 1972), 06:28 (wet), 06:47 (dry 1973), 06:42 (all); entering 18:34, 18:36, 19:06, 18:43. Anecdote: Southern males "reached the second fig in the dark after leaving their nests before dawn" |
| videan2005 | FT (dissertation; read for E2d) | captive, Texas, outdoor runs under natural light | 18–19 adults | rising = "arises and leaves the sleeping platform/area" | "rose 45-60 minutes before sunrise" (context: captive, no breakfast to go to) |
| rissGoodall1976 | secondary (anderson2019) | captive adolescents | 6 | — | rose "at sunrise" indoors; outdoors about 06:40 (context) |
| wood2017 | FT (already cited, research.md E.20) | Kibale | — | — | "Leopards are now absent from Kibale" (the model's population has no twilight predator; Taï has one, boesch1991) |

**Derived (this stage, [L]; `scratchpad/e2h/audit/sunrise.py`, the NOAA formula of src/sim/environment.ts with the
sun's centre at −0.833°).** Sunrise is computed for each day of each study window and averaged; the sources give no
dates per departure, so these are offsets of a mean departure from a mean sunrise.
- Budongo (Sep 2002 – Sep 2003, EAT): mean sunrise 06:49.9 (06:35.8–07:06.4, SD 8.5 min). Mean departure − mean
  sunrise: males +6.1 min, lactating females −3.9, receptive −12.9, all 37 pooled +0.8. Share before sunrise if
  departures are normal: males 0.42–0.43, lactating 0.60–0.66, receptive 0.81–0.94 (range: departures tracking sunrise
  vs independent of it).
- Gombe (EAT): mean sunrise 07:03.9 (dry 1972), 06:47.6 (wet), 07:04.2 (dry 1973), 06:59.8 (all). Mean departure −
  mean sunrise: −13.9, −19.6, −17.2, −17.8 min. The clock is taken as EAT because mean nest entry is then −28, −33, +4
  and −20 min from sunset; in UTC+2 it would be +27 to +64 min after sunset, in the dark. No SD is given, so no share.
- Taï: +13 min at average predictors (Table 1 intercept); 18% before sunrise; a normal with that mean and share has an
  SD of about 14 min (derived, [L]).

**Reading (before any model run).** Three sites give the mean departure of adults relative to sunrise: about −18 min
(Gombe, males, every season), about 0 (Budongo, all classes; −4 for lactating females), +13 min (Taï, mothers with
young offspring, fruit-scarce periods, fruit breakfasts, a site with leopards). T-FOOD-10's band (0.08–0.30) and staged
T-RHY-3's (0.05–0.35) rest on the last alone; the two sites with all-season data put the mean at or before sunrise, so
a share near 0.5 or above is what they imply. Other sites (Kibale, Fongoli, Bossou, Mahale, camera and video studies):
search running (§1b, filled in when it reports).

### 1b. Other sites
(Pending the source search; at most 2 routes or 10 minutes per source.)

## 2. Step 0c: how the model scores departures (the observer and rhythm-metrics)

| Item | Field (janmaat2014) | Observer, T-FOOD-10 (frozen protocol) | rhythm-metrics (truth) |
| --- | --- | --- | --- |
| Who | adult females with offspring < 7 y | every adult focal ≥ 15 y, both sexes (`eligible`, src/field/protocols.ts:931) | every adult ≥ 15 y, by class |
| When in the year | three fruit-scarce periods | every day of the scored window (quick 28 Oct – 26 Nov; no season filter) | every day |
| Which mornings | days after a complete follow; fruit breakfasts only (74%) | every follow start (src/field/metrics.ts:717–722) | every adult morning with an exit |
| Departure | leaving the night nest ("from the point of waking") | first point sample (1 min) after 04:00 at which the focal is not in `nest` phase 2 (src/field/protocols.ts:392–403, `startFollow` 443); a focal already out of its nest at 04:00 is scored as departing at 04:00 | last exit from `nest` phase 2 between solar midnight and noon (scripts/rhythm-metrics.ts:125, 172) |
| Sunrise | NOAA sunrise (sun centre at −0.833°) | first point interval with the sun's centre above 0° (src/field/protocols.ts:83): **3.5 min later** than NOAA's in the quick window (derived) | −0.833° (scripts/rhythm-metrics.ts:104), as the field |

So the observer counts as "before sunrise" departures up to 3.5 min after the field's sunrise, pools males and all
females with mothers, all days with fruit-scarce ones, and every breakfast type with fruit breakfasts.

## 3. Staged changes (never applied here; docs/staging/e2h-targets.patch.json)
To be written from §1–§2: a T-FOOD-10 scorer fix (NOAA sunrise; adult females with a dependent offspring; fruit
breakfasts; mornings after a complete follow; no 04:00 pseudo-departures; a fruit-scarce-day filter if the window has
any) and a multi-site band for the general departure row (T-RHY-3), on the median departure relative to sunrise.

## 4. Step 1 diagnosis (registered readouts, before running)
On R0 (`rhythmSleep`, `rhythmHeat`, `departRace`, `nestLightDecide`, `rhythmCircadian`) and S3, quick mode
(rhythm-metrics, seeds 48 and 7, 30 + 30 days, committed code, simulation truth):
- departure relative to NOAA sunrise (−0.833°), median and p10–p90, by class (males, lactating, other females);
- the same by breakfast type (fig, other fruit, non-fruit) and distance from the nest (≤ 200 m, > 200 m);
- open-sky illuminance at departure; the share of departures in rain;
- what the animal does in its first 30 min after leaving (feed, travel, rest, groom, other: share of ticks);
- the T-FOOD-10 value under the staged scoring computed from truth (lactating or mother of a dependent, fruit
  breakfast, NOAA sunrise), against the observer's value from the same configuration's e-bench.
Definitions follow the sources: departure = leaving the night nest (janmaat2014 "from the point of waking";
batesByrne2009 "when it left its night nest"); breakfast = "the first food item eaten after waking up" (janmaat2014).

## 5. Step 2 rule (registered)
A mechanism is built only if, after the audit, the model's departures fall outside what the field evidence allows on a
like-for-like reading: the median adult departure outside the range of site means (about −20 to +15 min), or a
context the field shows (rain delays, far figs earlier, far non-figs later) absent or reversed. Otherwise the stage
ends with the audit and the staged changes.

## 6. Benchmark and judging (only if a mechanism is built)
Reference R0 or S3 at the committed head, once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405), quick
mode; z = (arm − mean) ÷ (SD × √(1 + 1/n)), SD quick fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1
0.48 (or the references' own spread if larger); |z| > 2 is a result. Night safety: adults out of a nest ≤ 3.3% of the
night, T-RHY-5 ≤ 0.033, no night deaths, juveniles included. At most 3 iterations, each logged here and committed
before its run. Seeds 48 and 7; no run longer than 90 days in all; rules policy only.

## 7. Known defects
- The observer's 04:00 pseudo-departure and its geometric sunrise (§2): scorer issues, staged (§3), not fixed here
  (the frozen protocol needs the integrator, a protocolLog entry and a new freeze).
