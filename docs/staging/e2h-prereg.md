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

**Derived (this stage, [L]; `scripts/departure-bands-metrics.ts`, the NOAA formula of src/sim/environment.ts with the
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
a share near 0.5 or above is what they imply. Other sites: §1b.

### 1b. Other sites (source search of this stage, 09:25–09:42; quotes re-checked in the saved texts)

| Key | Access | Site, sample | Method, definition | Numbers |
| --- | --- | --- | --- | --- |
| zamma2014 | FT (Kyoto University repository manuscript) | Mahale M group; 5 nights, 26 Aug – 2 Sep 2011, dry season, new moon on 29 Aug; parties of 21–47 (mean 33.6) | night-long direct observation of a nesting party; recording "stopped when the first chimpanzee in the party left its bed in the morning" | "mean finish time 6:48, range 6:07–7:13"; derived −15.0 min (−56 to +10) from NOAA sunrise (EAT assumed; scripts/departure-bands-metrics.ts). The earliest of a large party, so a lower bound of the party's departures; context, not a site mean (it was found after the band rule was registered and does not enter it) |
| uwimbabazi2021 | FT (PMC8225573) | Kanyawara, Kibale; female focal follows, January 2014 – June 2015 | follows "started at dawn when the focal individual left her nest" | "sometimes the focal individual had already left the nest before dawn" (no times) |
| lacroux2022 | FT | Sebitoli, Kibale; 14 camera traps, January 2017 – April 2018 | camera events, not nest exits; twilight = "30 min before sunrise to sunrise" (and the same after sunset) | in the forest 26 twilight and 10 night events of 36 nocturnal; "Most nocturnal activity occurred in the early morning, within an hour before sunrise" |
| stewart2011 | FT (PhD thesis) | Fongoli | afternoon-to-nest follows | "the chimpanzees frequently nested and arose in the dark"; nests built on average 30 min after sunset |
| drummondclarke2023 | FT (PMC10651548) | Issa Valley; one morning (4 June 2020), 8 males | event narrative | 06:20 "the entire party still in their nests"; 07:10 the party "began pant-hooting and ran" (n = 1, context) |
| hozer2026 | Abs | Budongo, infrared video | — | group nesting "delayed nesting times and advanced wake times"; no numbers (HAL served a bot check; not used) |

Not verified: pruetz2018 full text (closed), Ngogo, Kalinzu, Seringbara, Toro-Semliki, Goualougo and Lopé, Kahuzi,
Mt Assirik, the Anderson reviews of primate sleep, Ghiglieri 1984 (a book); link.springer.com and HAL served bot checks
and were not used again.

**Reading of 1 and 1b together.** Leaving the nest before sunrise is ordinary in the wild: three sites give a mean at or
before sunrise for most classes (Gombe, Budongo, the first riser at Mahale), two Kibale studies and Fongoli describe it,
and the one late site (Taï) is a site with a twilight predator, scored on mothers in fruit-scarce periods. What no
source shows is a class leaving an hour before sunrise as its typical behaviour.

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

## 3. Staged changes (never applied here; docs/staging/e2h-targets.patch.json and e2h-protocol.patch.json)

**Disclosure.** Written after model values were seen in earlier stages' documents (R0: departures −13 min, 0.99 before
sunrise, T-FOOD-10 1.00; S3: T-FOOD-10 0.686, truth 0.67 before sunrise; B 0.017; e-stack2-confirm.md, e2f-prereg.md)
and before this stage's diagnosis runs were read. The rules below use field values only.

**Band rule (registered here, 09:38).**
- *Median departure relative to NOAA sunrise, adults* (proposed as the scored value of T-RHY-3; the share before sunrise
  becomes a reported part): band = from the lowest to the highest site mean of adults in §1, rounded outward to 5 min:
  Gombe males in the wet season −19.6 → **−20 min**; Taï mothers +13.0 → **+15 min**. Class parts reported, not scored:
  adult females (Budongo lactating −3.9, receptive −12.9; Taï +13.0) and males (Gombe −13.9 to −19.6; Budongo +6.1).
- *T-FOOD-10 share before sunrise* (kept as the Taï construct, scored like for like by the protocol fix below): the
  lowest and highest site values for adult females with dependent offspring, each with the registered band's margins
  (−0.10 below, +0.12 above the Taï 0.18): lower 0.18 − 0.10 = **0.08**; upper: Budongo lactating females, derived
  0.60–0.66 (§1), 0.66 + 0.12 = **0.78**. The registered one-site band (0.08–0.30) is kept under `revisions`, and the
  alternative of keeping it with basis "one site, a site with a twilight predator (boesch1991) absent at Kibale
  (wood2017)" is given for the integrator to choose.

**Protocol fix for T-FOOD-10 (staged, frozen observer untouched).** Score only follows whose focal is an adult female
with a dependent offspring (lactating, or mother of a living offspring under 7 y), whose first food item after leaving
the nest is fruit (janmaat2014: "Breakfast was defined as the first food item eaten after waking up"; water and milk
are not food items), on fruit-scarce days if the scored window has any (the day's community fruit index below its
long-run mean, `fruitIndexAtMean`; report n), with sunrise at −0.833° (NOAA) and without follows that start at 04:00
with the focal already out of its nest (not a departure).

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
- Deferred, src/sim/water.ts `drinkWorth` (`walkH = d / P.walkMps / 3600`): under `darkCost` a food trip is valued at
  the light-limited pace (candidates.ts `tripWorth`), a drink trip at the daylight pace. Not fixed: `walkDarkPace` is
  0.92, so the fix would lengthen a walk to water by about 8% and leave its worth almost unchanged (§8).

## 8. Step 1 results (diagnosis, committed code, simulation truth and the frozen observer)

Runs: `e2h-diag.ts` (scripts, outputs and tables kept locally in `artifacts/validation/e2h/`, gitignored) from a frozen checkout at de0046b (one simulation per configuration and seed:
the observer exactly as e-bench runs it, plus every adult's morning exit from a nest), seeds 48 and 7, 30 + 30 days;
R0 and its three `rgTemperature` re-draws (R1–R3), S3 (the integrated candidate stack, S3-params.json of bench-run) and B
(all off). The R0 runs reproduce E2f's R0 references exactly (783 male departures, T-FOOD-10 90/90 per seed), so E2f's
quick e-bench and rhythm references of R0 (31dea54) stand for this head. Tables generated by `summ.py` and
`final_table.py` (scratch); nothing typed in. Deviation from §4: the readouts were computed with this script rather than
rhythm-metrics (the same departure definition: the last exit from `nest` phase 2 between solar midnight and noon, NOAA
sunrise), so that truth and the observer come from one simulation per configuration.

**The habitat fruit index of the scored windows** (`fruitwin.ts`): seed 48's quick window is fruit-rich (0.95 on every
day), seed 7's fruit-scarce (all 30 days below the long-run mean 0.6; mean 0.56). The registered T-FOOD-10 is scored on
both alike.

**Departures (last exit from a nest between solar midnight and noon, minutes after NOAA sunrise; both seeds pooled).**
- **B (today's model):** every adult leaves at +15 (p10 +11, p90 +20), 1% before sunrise, at about 2,200 lux; breakfast
  type and distance change nothing (figs or other fruit, near or far: median +15). A clock.
- **R0 (4 runs):** every adult leaves at −13 (p10 −14, p90 −13), 99–100% before sunrise, at 21–24 lux (open sky, median), whatever the
  class, breakfast, distance or weather (no wet departure). The night menu's end releases everyone in the same minute;
  what wins at that minute is the first daytime option (travel 0.39, feed 0.24, call 0.16, drink 0.14; the nest's score
  0.07 against 0.60). In the 30 min after leaving: feeding 0.50–0.54 of the ticks, travel 0.30–0.34, drinking 0.10–0.11.
- **S3 (1 run):** a spread (all adults median −8, p10 −66, p90 +46; 0.63 before sunrise) with a class split: males +3
  (0.47 before), other adult females −8 (0.65), **lactating females −60** (p10 −67, p90 +3; 0.88 before; 63% of their
  exits below 1 lux). Their distribution is bimodal: 62% leave 40 min or more before sunrise (p25 −64, p60 −56), 33% between −20 and +10. Distance now
  matters: near breakfasts +8 to +10 min (figs 0.33 before sunrise, other fruit 0.38), far ones (> 200 m) −13 (0.77–0.78),
  for figs and other fruit alike. What wins at leaving the night nest: drinking 0.45, travel 0.35, feeding 0.13; for
  lactating females drinking 0.57, travel 0.35 (walks to remembered food, median 1,323 m, p25–p75 592–1,509 m), feeding 0.07, with hunger at
  its ceiling (median 1.00; males 0.49, other females 0.58) and the nest worth 0.22 against 0.42–0.58 for the others.
  In the 30 min after leaving: travel 0.36, feeding 0.29, drinking 0.28. Rain delays departure, as in the field: 26 wet
  departures (rain ≥ 0.05 at the exit) at a median +8 min against −8 for all.
- **Waking and the first 30 min after it** (the circadian latch off in a nest before sunrise; `wake_summ.py`, re-runs of
  R0 and S3 with waking records, identical T-FOOD-10 counts): on R0 every class wakes at −128 to −130 min and lies awake
  in its nest for the whole first 30 min (100% of the ticks), leaving 114–117 min after waking. On S3 every class wakes
  at −62 to −64; males leave in the waking minute in 21% of mornings and spend 79% of the first 30 min in the nest
  (first exit a median 64 min after waking), other adult females 27% and 74% (53 min), **lactating females 63% and 38%**
  (median 0 min: most leave the instant they wake; drinking 0.26 and travel 0.25 of their first 30 min).
- The same early mothers appear on E2f's WFS and WFSD runs, which have neither the energy nor the water ledger
  (lactating median −64 and −57; E2f `it2/rhy-WFS.json`, `rhy-WFSD.json`): mothers leave within minutes of waking
  whatever the hunger model, once nothing but the nest's own worth holds them.

**Against the field (§1).** R0's −13 and S3's males (+3) and other females (−8) lie inside the range of site means
(−20 to +15 min; Gombe males −14 to −20, Budongo −13 to +6, Taï mothers +13; the first riser at Mahale −15). B's +15 is
at its edge. Two misses remain: (1) R0 has no spread and no context (one release minute for everyone; the field's
departures spread with SDs of 12–32 min and move with breakfast type, distance, rain and party, janmaat2014); (2) S3's
nursing mothers leave an hour before sunrise, in the dark, mostly to drink or to walk far: no site shows a class doing
that as its typical behaviour (Budongo lactating females −4; Taï mothers +13), and the field gives no sign that energy
state drives departure (janmaat2014: relative energy balance −118 ± 108 s, P = 0.28, the opposite sign to the
expected). S3 also reverses one direction: far non-fig breakfasts bring departure earlier, the field later.

**T-FOOD-10 under the staged scoring** (mothers with a lactating focal as the proxy for "dependent offspring", since the
follow record has no offspring field; fruit first food; fruit-scarce days; NOAA sunrise): R0 1.00 in all four runs
(17–21 follows), S3 0.78 (7 of 9), B 0.00 (0 of 19). No follow started at 04:00 with the focal out of its nest in any of
the 12 runs. The staged band (0.08–0.78) takes S3 in at its edge on 9 follows; mothers on every day give S3 0.91 (39 of
43).

| | R0 reference, 4 runs (mean ± SD) | S3, 1 run | B, 1 run | Field |
| --- | --- | --- | --- | --- |
| Departure median vs NOAA sunrise, males (min, truth) | -13 ± 0 | 3 | 15 | Gombe −14 to −20; Budongo +6 |
| … lactating females | -13 ± 0 | -60 | 15 | Budongo −4 |
| … other adult females | -13 ± 0 | -8 | 15 | Budongo receptive −13; Taï mothers +13 |
| Share before sunrise, all adults (truth) | 0.99 ± 0.00 | 0.63 | 0.01 | Budongo ≈ 0.5 (derived) |
| … mothers of dependants (truth) | 1.00 ± 0.00 | 0.85 | 0.01 | Taï 0.18; Budongo lactating 0.60–0.66 (derived) |
| T-FOOD-10 as scored (observer, all adults, sun at 0°) | 1.00 ± 0.00 | 0.63 | 0.01 | band 0.08–0.30 |
| … its distance (registered band) | 3.18 ± 0.00 | 1.51 | 0.31 | |
| T-FOOD-10, staged scoring (mothers, fruit breakfast, fruit-scarce days, NOAA sunrise) | 1.00 ± 0.00 (n 18/19/21/17) | 0.78 (n 9) | 0.00 (n 19) | staged band 0.08–0.78 |
| … its distance (staged band) | 0.31 ± 0.00 | 0.00 | 0.11 | |
| Adults out of a nest, share of night ticks | 0.06% ± 0.02 (E2f rhythm refs) | 2.19% (integrator, confirm, 5 seeds) | — | ≤ 3.3% |
| Fitted sum (e-bench quick, E2f refs) | 4.59 ± 0.89 | — | — | |
| Held-out sum: registered / staged T-FOOD-10 | 6.77 ± 0.41 / 3.90 ± 0.41 | — | — | |
| Held-out without T-HUN-4, T-BRD-1: registered / staged | 5.72 ± 0.96 / 2.86 ± 0.96 | — | — | |
| Prescriptions (prescription-ledger at de0046b) | 115 | 83 | 135 | |
| Viability | pass, pass, pass, pass | — | — | |

## 9. Step 2 decision: no mechanism

The rule of §5 is a necessary condition ("only if"), and it is met three times: S3's nursing mothers leave outside the
range of site means; R0 has no context at all; and S3 has the distance effect (far breakfasts earlier) but not the fig
effect, and it reverses the non-fig one. None of the three leaves a mechanism whose inputs are sourced and whose effect
is not set by construction:
- **R0's single release minute** is the night menu's end, a prescription. The rhythm package without the menu (S3)
  already removes it: departures spread (p10–p90 −66 to +46 min), far breakfasts bring them earlier, rain delays them.
  Nothing to build on R0.
- **Figs and non-figs.** The field's fig effect is competition with other frugivores for ephemeral figs (janmaat2014:
  hetero-specific foragers in fig trees, median share 0.45 against 0.35; ripe figs present for shorter periods). E2c found
  no removal rate of ripe fruit by other frugivores at any African site (research.md E.20, not verified), so the model
  has nothing to make figs more urgent at dawn. The non-fig reversal is read by the authors as mothers avoiding twilight
  travel where leopards hunt; leopards are absent from Kibale (wood2017), so for this population it is not a miss.
- **S3's mothers.** No sourced cost holds an awake, hungry animal in the dark: `darkCost` already carries what darkness
  is measured to do (fruit and leaves are found by sight; walking slows to `walkDarkPace` 0.92 of the daylight pace,
  figueiro2011), and drinking needs no sight in the model, its walk slowing by 8% at most (§7). A fall or predation cost
  of climbing down and walking in the dark has no source (E2c found no chimpanzee or primate fall rate by light; no
  leopards at Kibale): any weight for it would set the mothers' departure time by construction, which is tuning to a
  departure time. What drives the mothers out is their state at waking: hunger at its ceiling (1.00; the nursing deficit
  of the stack, −0.25% of the store a day in S3, e-stack2-confirm.md) and thirst (drinking wins 57% of their exits after a
  night of milk water out and nothing in). Both are upstream of departure: the nursing-deficit thread (E1i, E1k) and the
  water ledger's overnight balance for mothers (E2g, inputs mostly [L]). A departure holder built first would hide them.

So the stage ends with the audit, the staged target rows and scorer fix (§3), and this diagnosis. No switch, no
parameter, no code change in `src/`. The staged T-FOOD-10 band (0.08–0.78) takes S3 in only at its edge and on 9 follows;
S3's mothers on every day (0.91) and in truth (0.85) stay above it, so the mothers' miss is real under the staged scoring
too.
