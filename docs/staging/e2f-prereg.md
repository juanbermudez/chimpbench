# Stage E2f pre-registration: the sleep window (chimpanzee sleep physiology in place of human values)

Written 2 October 2026, before any run of changed code. Track E rule: field values of behaviour are targets, never
inputs; a parameter may carry a field value only when it is physiology measured independently of the behaviour it
helps produce. Branch `e2f-sleep` (from `track-e` 49d8a3b; every Track E switch off by default). Sources: research.md
and e-sources.md "Addendum: E2f sleep window" (this stage), and the E2a, E2d and E2e addenda. Commits: 31dea54
(skeleton), c8eb087 (readouts), then this file with the mechanism, before any run of it.

## 0. The question

E2d entered process S (rise τ 18.2 h, decay τ 4.2 h; thresholds 0.67 / 0.17, amplitude 0.12) and process C (the
forger1999 pacemaker, τ 24.2 h) with human values, tagged *assumed*. On the rhythm reference R0 (`rhythmSleep`,
`rhythmHeat`, `departRace`, `nestLightDecide`, `rhythmCircadian`) sleep runs from ~100 min after sunset to ~128 min
before sunrise (8.2 h); adults are held by the night menu until −13 min and leave (99% before sunrise); independent
5–8-year-olds, whom no menu filters, are out of the nest 96% of the two pre-dawn hours. Is the sleep window wrong for
chimpanzees, and does a sourced chimpanzee window fix the pre-dawn problem without a holder (`rhythmDarkW`, already
unread on R0, or the night menu)?

## 1. Sources (pass of 2 October 2026; research.md / e-sources.md "Addendum: E2f sleep window")

Read by this stage (locally saved texts: the E2d scratch copies of videan2005 and campbellTobler1984; a literature
subagent of this stage fetched the rest through NASA NTRS, Europe PMC, Crossref and a university repository; numbers
below re-checked against the saved texts where FT).

| Key | Access | Sample | Method | Numbers (location) | Use |
| --- | --- | --- | --- | --- | --- |
| bert1970 | secondary (campbellTobler1984 FT; the paper is closed, no abstract) | 3 adults (2 *P. t. troglodytes*, 1 *P. t. schweinfurthii*), unrestrained in home cages, "natural illumination (a very dim light was used at night for observation)"; site and season not given in the relay | EEG telemetry, 14-h nocturnal records 17:00–07:00 | "average sleep duration was reported to be 9.7 hr (69.3%)"; one animal napped briefly twice by day; REM 15.0% (videan2005 Table 1, secondary) | **input**: adult sleep amount [M] captive |
| mcnew1971 (McNew, Howe, Adey 1971, EEG Clin Neurophysiol 30:489–503) | FT (NTRS manuscript) | 3 "tamed immature" chimpanzees, 14.7, 13.4 and 16.8 kg, single home cages (UCLA vivarium); lights off 18:00, on 06:30 | EEG, EOG and EMG telemetry, infrared TV; 7 nights each (21) | "during their 13.5 hour nightly recording sessions averaged 11 hrs and 52 min of sleep" (17:30–07:00); "From the onset of sleep to morning awakenings the animals averaged 27 min in the awake stage" (16–49 min); light/medium/deep/REM 6.5/53.9/20.3/19.3% of sleep; "DS was generally found dominant during the first half of the session, while MS dominated the latter half" | immature sleep amount (not used in iteration 1, §4.3); consolidation (27 min awake inside the sleep period); deep sleep front-loaded, the direction of process S's decay |
| freemon1971 | Abs (NTRS) + secondary (campbellTobler1984) | 2 juveniles, 4 y (secondary), 7 nights | EEG/EOG telemetry, 12-h sessions 19:00–07:00 | 10.8 h asleep (90.1% of the session), naps "usually between 1200 hr and 1330 hr" | context (a session that may cut the night) |
| hoshizaki1972; mcnew1972 (Aerospace Medicine 43) | Abs (NTRS) | 1 young male, 30 days in isolation: LD 12:12, 10 days of constant light, LD 12:12 | urination record; EEG | "A 24-hour rhythm was seen when the subject was entrained to 12L:12D treatments and 24.8-hour rhythm when he was exposed to continuous light" (micturition); the sleep–wake period is not in the abstract | **not used**: n = 1, constant light (which changes the period), a urine rhythm, abstract only. The only great-ape free-running period found |
| havercamp2021 | FT (accepted manuscript) | 12 males, 23 to ~48 y, Kumamoto Sanctuary; indoor lights 07:00–19:00 plus skylights | infrared video, 1-min scans 17:00–06:00 | "slept for a nightly mean duration of 10.5 ± SD 1.8 h" (2018–19; 11.2 ± 1.5 h in 2007–08); 15.1 awakenings a night | sensitivity bound only (video; the window ends before waking) |
| videan2005 (videan2006) | FT (dissertation) | 18–19 captive adults (Texas), outdoor runs under natural light (SWF) or indoors under a light schedule (MDA) | video; retiring = "reclines and remains inactive for at least 5 minutes", rising = "arises and leaves the sleeping platform/area" | 8.83 h sleep of 10.30 h retired (efficiency 0.86; prime adults 0.83 ± 0.03); SWF "retired 15 -30 minutes after sunset and rose 45-60 minutes before sunrise"; MDA (lights off 3.5 h before sunset) rose ~45 min before sunrise too | **target / context**: retiring and rising are behaviour |
| samsonShumaker2013; samsonShumaker2015 | Abs | orangutans (3 F, 2 M), Indianapolis Zoo, 70 nights | video scoring | 9.11 h (5.85–11.2) a night; 9.3 h against 7.3 h in baboons | context (great-ape comparator) |
| hozer2026 | Abs | wild chimpanzees, Budongo | infrared video | group nesting lengthened sleep but "delayed nesting times and advanced wake times"; no numbers reached | context |
| skeldonDijk2025 | FT (already read for E2d) | — | model review | "Increasing the drive to sleep active regions lowers the mean value of the thresholds while leaving the distance between then unchanged" (Fig. 5: "lowering the thresholds increases sleep duration"); of Phillips et al.'s neuronal model across species: "increasing the mean drive to sleep active neurons increased the percentage of time spent asleep", while shorter homeostatic time constants turn monophasic into polyphasic sleep; in human infants and children "homeostatic parameters played a major role" | structure: which parameter carries a species difference in sleep amount |

Not found or not verified: any great-ape circadian period in constant darkness, phase-response curve, melatonin onset
or temperature minimum; chimpanzee actigraphy or accelerometry; the sleep onset and waking clock times, site and
season of bert1970; balzamo1972 (EEG ontogeny 2–41 months; closed, no abstract); samsonNunn2015 numbers; hozer2026
numbers (a CC BY copy is listed on HAL, not fetched).

## 2. Which numbers may be inputs (the argument)

- **Input:** the amount of sleep measured by EEG, a property of the sleep system measured at night in a cage where no
  morning option competes (bert1970, adults, 9.7 h, natural light). It enters as the size of the drive to sleep-active
  neurons, never as a time of day.
- **Not an input, though physiology:** the immature EEG amount (mcnew1971, freemon1971). In the human model literature
  development is carried by the homeostatic time constants (skeldonDijk2025), not by the threshold level, and no
  chimpanzee time constant exists; entering it would need a design route (§4.3).
- **Not an input:** the 24.8-h rhythm of one chimpanzee in constant light (n = 1, constant light, urination, abstract):
  process C keeps the human τ, *assumed*.
- **Targets or context (behaviour):** retiring and rising in captivity (videan2005: leaving the platform 45–60 min
  before sunrise), nest entry and departure in the wild (janmaat2014, batesByrne2009), video sleep durations (video
  scores stillness, not sleep; havercamp2021's window ends at 06:00 while its lights came on at 07:00).
- **How the amount maps onto the model.** The model's sleep episode (latch on) is consolidated and S decays through
  it. The EEG amount is total sleep; McNew's immatures spent only 27 min awake between sleep onset and the morning
  awakening, so total sleep is within about half an hour of the sleep period. Iteration 1 sets the episode to the total
  sleep (9.7 h): a lower bound on the adult sleep period, which errs toward waking early.

## 3. Diagnosis (run on committed, unchanged code before the mechanism; scratch scripts, not in the repository)

### 3.1 Who is awake before dawn, and why they leave (R0, seeds 48 and 7, 30-day burn-in, 4 mornings each; `predawn-diag.ts`)

| Class | Last waking, min after sunrise: median (p10–p90) | S at waking (= waking threshold) | Pre-dawn window: asleep / awake in a nest / out | Exit from the nest: median min after sunrise; min after waking | What wins at the exit (nest worth vs chosen option, medians) |
| --- | --- | --- | --- | --- | --- |
| adult males | −126 (−131 to −122) | 0.089 (x −0.68) | 0.000 / 0.893 / 0.107 | −13.1; 113 | travel 41, drink 23, forage 22, pant-hoot at dawn 16 of 108; nest 0.08 vs 0.56 |
| lactating | −129 (−134 to −126) | 0.089 | 0.000 / 0.895 / 0.105 | −13.0; 116 | forage 24, travel 22, call 10 of 63; nest 0.08 vs 0.66 |
| other adult females | −127 (−136 to −123) | 0.089 | 0.000 / 0.893 / 0.106 | −13.0; 114 | forage 19, call 16, drink 16, travel 16 of 72; nest 0.05 vs 0.51 |
| independent 8–15 y | −127 (−133 to −123) | 0.088 | 0.000 / 0.892 / 0.107 | −13.1; 114 | travel 21, forage 12 of 56; nest 0.09 vs 0.53 |
| independent 5–8 y (argmax) | −127 (−131 to −122) | 0.089 | 0.001 / 0.000 / 0.999 | −124; 0 (24 of 34 exits in the night phase) | travel 18, forage 7, drink 6 of 34; nest 0.17 vs 0.46 |

Every class wakes together about 2 h before sunrise (the sun at −31°), when sleep pressure, decaying with the human
χs, reaches the lower threshold 0.17 + 0.12·x at x ≈ −0.68 (process C two hours past its minimum, which falls 5.6 h
before sunrise). After waking the nest is worth only the rest score (felt sleepiness starts at 0), so the first
decision that offers food or water ends the nest: for rules-driven animals of 8 y and more that is the first dawn
decision after the night menu opens (−13 min); for the argmax 5–8-year-olds, waking itself.

### 3.2 The term that sets waking (offline: the model's own `oscStep` and `thresholds` under its sun and sky, steady state, cloud 0.4; scratch `osc-sens.ts`)

Base: onset +97 min after sunset, waking −128 min, 8.15 h asleep, x minimum −338 min. One parameter at a time:

| Change | Waking (min) | Onset (min) | Hours asleep |
| --- | --- | --- | --- |
| τ 24.0 / 24.4 h | −38 / +40 | −36 / +39 | −0.03 / +0.03 |
| lower threshold 0.14 / 0.20 | +42 / −44 | +21 / −22 | +0.35 / −0.38 |
| upper threshold 0.64 / 0.70 | −17 / +18 | −36 / +38 | +0.32 / −0.33 |
| amplitude 0.09 / 0.15 | −26 / +19 | −1 / −2 | −0.42 / +0.35 |
| χs 3.7 / 4.7 h | −28 / +25 | −5 / +4 | −0.38 / +0.35 |
| χw 16.2 / 20.2 h | −15 / +14 | −45 / +42 | +0.50 / −0.47 |

Waking is set by process C's phase (τ and the human light response place the whole episode) and by the waking threshold
that the decaying S must reach; the human sleep amount (8.15 h) fixes how far before dawn that is. Every route that
gives the chimpanzee EEG amount (9.7 h) moves waking later, by an amount that depends on the route: both thresholds
lowered (gap unchanged) −65 min, onset +67; amplitude 0.31 −58, onset +75; χs 6.8 h −20, onset +112; the lower
threshold alone, a symmetric widening of the gap and a common scaling of χs and χw lose one episode per day (no
entrainment); χw or the upper threshold alone cannot reach 9.7 h. This map was computed before the route of §4 was
chosen; the route is chosen by the source (skeldonDijk2025), and it is the most conservative of the three entrained
routes (earliest waking).

## 4. Mechanism (iteration 1)

### 4.1 The switch
`sleepChimp` (0/1; needs `rhythmSleep` and `rhythmCircadian`; 0 = E2d bit-identical). Both thresholds of the
two-process gate fall by `sleepDriveShift` (`circadian.ts` `thresholds`, used by the latch, the entrainment run and felt
sleepiness):
H⁻ = H₀⁻ − δ + a·x, H⁺ = H₀⁺ − δ + a·x, δ = `sleepDriveShift`.

### 4.2 The input
δ = 0.0654 (S units): the shift that gives 9.7 h asleep (bert1970, EEG) in the model's own steady state under its
Kibale light (`scripts/sleep-calibrate.ts`: onset +67 min after sunset, waking −65 min, 9.70 h). Tag [M] captive;
the route (the drive to sleep-active neurons, both thresholds, gap unchanged) is skeldonDijk2025's; the shift itself
is derived. Nothing else changes: τ, χs, χw, the amplitude, the light response, the nest values, the menus.

### 4.3 Not done in iteration 1 (registered so a later iteration is not a fit)
- Immature sleep (mcnew1971 11.9 h at ~15 kg; freemon1971 ≥ 10.8 h at 4 y): one δ for every age. A juvenile term
  would need the homeostatic route (no chimpanzee value) or a design route; iteration 2 may take it only as a labelled
  design assumption, and only if iteration 1 leaves juveniles out of the nest at night beyond R0's adults.
- Night awakenings (WASO): sleep stays consolidated.
- τ 24.8 h (hoshizaki1972): not used (§2).
- Prescriptions: the switch removes none (115 on R0; `removesNothing` in `scripts/lib/prescriptions.ts`). The decisive
  test of "without a holder" is the free night (`rhythmFreeNight` 1, which switches the night and dusk menus out: 113).
  The switch does not remove the nest option, so the `menu.length === 1 && (darkOn || circadianOn)` guard in rg.ts
  needs no change.

## 5. Field rows and readouts (pre-flight)

| Row | Sample (source opened in research.md) | Readout |
| --- | --- | --- |
| T-FOOD-10 (held-out, e-bench, band 0.08–0.30) and staged T-RHY-3 (0.05–0.35) | janmaat2014 (FT, PMC author manuscript via the Internet Archive; research.md, E2b): 5 habituated adult females at Taï, all with offspring under 7 y; 275 full days in three fruit-scarce periods 2009–2011; departure model on 179 mornings; departure time in seconds from astronomical sunrise (NOAA); "18% of all departures were before sunrise"; intercept +779 s (+13 min) | share of adult departures (last exit from a nest between solar midnight and noon) before sunrise (sun at −0.833°) |
| Staged T-RHY-1 (10.5–12 h) | batesByrne2009, Budongo: nest-to-nest active day, males 11 h 34, lactating 10 h 57 | mean active day, adults |
| Staged T-RHY-4 (start of the last nest −30 to +90 min before sunset) | batesByrne2009 (derived) | median start of the last nest |
| Staged T-RHY-5 (0–0.05) and night safety | tagg2018 (camera traps, 22 sites): 1.8% of activity at night; lacroux2022 (Sebitoli): 3.3% of forest clips | night (daylight ≤ 0.03) out-of-nest share of adults and of juveniles 5–15 y; T-RHY-5; m per night; night deaths |
| Sleep window (no field row; captive context) | bert1970, videan2005 | last waking and first sleep onset by class (adults; independent 5–8 y and 8–15 y), hours asleep, S at waking |
| Pre-dawn (no field row) | — (E2e's definition) | out-of-nest share in the pre-dawn window (the sun rising and between −30° and −0.833°) for adults, independent 8–15 y and 5–8 y |

Every readout is in `scripts/rhythm-metrics.ts` (E2f additions committed in c8eb087 and smoke-tested for 2 days on
R0). The e-bench rows other than T-FOOD-10 (hunting, patrol, intergroup, activity, ranging) are not expected to move
and are judged as sums against noise.

## 6. Arms and predictions (registered before any run of the switch)

Runs: field profile, seeds 48 and 7, 30-day burn-in + 30 days, `--workers 1` (load 13–15), from frozen detached
checkouts. Reference **R0** at 31dea54 (e-bench) and c8eb087 (rhythm-metrics), each run once and re-drawn three times
(`rgTemperature` 0.1641, 0.1639, 0.16405): R0 = R0a…R0d. Arms at the commit that adds this file:

- **W** = R0 + `sleepChimp` (the chimpanzee window, menu on).
- **WF** = W + `rhythmFreeNight` (no menu: the window as the only holder; the decisive arm).
- Sensitivity, rhythm-metrics only: **WH** = W + `sleepDriveShift` 0.0974 (10.5 h, havercamp2021's video lower bound;
  not an input) and **WHF** = WH + `rhythmFreeNight`.

| Readout | R0 (E2e, 77c4163) | W (predicted) | WF (predicted) | WH / WHF (predicted) |
| --- | --- | --- | --- | --- |
| Last waking, adults, median | −128 | −75 to −55 | as W | −40 to −20 |
| Last waking, independent 5–8 y | −127 | −75 to −55 | as W | −40 to −20 |
| Hours asleep (adults) | 8.2 | 9.5–9.8 | as W | 10.3–10.6 |
| Sleep onset after sunset | +97 to +102 | +60 to +75 | as W | +50 to +65 |
| Adult departure, median; share before sunrise | −13; 0.99 | −13; 0.95–1.00 | −75 to −55; 0.98–1.00 | WH −13, 0.95–1.00; WHF −40 to −15, 0.9–1.0 |
| T-FOOD-10 (e-bench) | 1.00 | 0.95–1.00 | 0.98–1.00 | — |
| Adults out of a nest in the pre-dawn window | ~0.11 | 0.08–0.13 | 0.35–0.55 | WHF 0.15–0.35 |
| 5–8 y out of a nest in the pre-dawn window | 0.96 | **0.40–0.65** | 0.40–0.65 | 0.15–0.40 |
| Last nest entry after sunset, median | −32 | −45 to −30 | −45 to −30 | as W |
| Active day, adults (mean) | 11.9 h | 11.6–12.0 h | 12.3–12.9 h | — |
| Adults out of a nest, share of night (daylight ≤ 0.03) | 0.1% | 0.0–0.3% | **4–8%** | WHF 0.5–2.5% |
| T-RHY-5 (adults) | 0.001 | ≤ 0.005 | **0.04–0.08** | WHF 0.005–0.03 |
| Juveniles 5–15 y out of a nest, share of night | 4.6% | 1–3% | 4–8% | — |
| Night deaths | 0 | 0 | 0 | 0 |
| Prescriptions | 115 | 115 | 113 | — |
| Fitted / held-out vs R0 mean | — | inside noise (\|z\| < 2) | not benchmarked if killed | — |

Registered expectation: the chimpanzee sleep amount moves waking about an hour later (−128 → about −65 min) and halves
the juveniles' pre-dawn wandering, but waking stays about an hour before sunrise, so adults are still released by the
menu (W) or leave in the dark (WF). **WF is expected to fail night safety (high confidence); W is expected to be a
recorded mechanism that removes no prescription.** The sensitivity arm shows how much the verdict depends on the adult
amount: at 10.5 h (video) WHF may pass the night criterion while departures stay before sunrise.

## 7. Kill criteria and judging

An arm is kept (provisionally, off by default until the integrator rules) only if all hold:
1. **Viability:** no starvation death beyond R0's; reserve trends by class not worse than R0's.
2. **Night safety** (night = daylight ≤ 0.03): adults' out-of-nest share of night ≤ 3.3% and T-RHY-5 ≤ 0.033 (the
   field's 1.8–3.3%); juveniles 5–15 y not above R0's 4.6%; no night death.
3. **Benchmark:** e-bench --quick on rows scored in both, each sum with and without T-HUN-4 and T-BRD-1, judged against
   the mean of R0's four realizations (docs/staging/e-noise.md amendment 2): z = (arm − mean) ÷ (SD × √(1 + 1/4)),
   SD = the per-run SD registered for quick mode (0.69 fitted, 1.26 held-out, 0.48 held-out without the rare rows) or
   R0's own spread if larger; |z| > 2 is a result, anything less "inside noise". Held-out must not rise beyond noise.
4. **Prescriptions:** a keep needs the count to fall: only an arm with `rhythmFreeNight` can (115 → 113).
5. With the switch off, the compressed goldens and the field pin in `tests/sim-track-e.test.ts` do not move.

The rhythm readouts are reported with R0's spread over its four runs (min–max). An arm killed by criterion 2 on
rhythm-metrics is not benchmarked.

## 8. Known defects
- None known in the code under test. Deferred, measurement only: the co-departure readout of `rhythm-metrics.ts` is
  quadratic in departures (fine at 30 days; scripts/rhythm-metrics.ts, `joint`).
- A design consequence to watch, not a defect: a sleeping animal makes no decision, so an independent juvenile that
  sleeps longer than its mother is not woken by her departure (no social arousal of sleepers in the model).

## 9. Iterations
At most three, each logged here and committed before its run. No input moves to hit a benchmark.

### Iteration 1 (§4, §6; frozen 646af95): read so far (rhythm-metrics, 30 + 30, seeds 48 and 7)
W as predicted on every readout: adults wake at −65 min (R0 −128), 9.71 h asleep, onset +67; with the menu they still
leave at −13 (99% before sunrise); independent 5–8-year-olds are out of a nest 51% of the pre-dawn window (R0 96%);
juveniles' share of night out of a nest 1.9% (R0 4.6%). WF (menu off) is **killed by night safety** as predicted:
adults leave on waking (−63), out of a nest 6.2% of the night, T-RHY-5 0.064, juveniles 6.2%; not benchmarked. Full
table in §10 after the sensitivity arms and W's benchmark.

### Iteration 2 (registered before its run): the hold without the menu, on the chimpanzee window
- **Reading.** The chimpanzee sleep amount leaves adults awake about 40–45 min before the night ends (−65 → −21 min,
  daylight 0.03) instead of 105; captive chimpanzees under natural light leave their platform 45–60 min before sunrise
  (videan2005), so an awake chimpanzee with nothing to hold it gets up, while wild ones stay in the nest until about
  sunrise. The remaining hold is the wild animal's choice to stay, which the model can only give through the
  mechanisms already built and recorded for it: E2e's company at the nest (`nestCompany`, `nestAudience`; held
  animals with an adult nest-mate to a sun altitude of about −4°) and E2c's darkness (`darkCost`: vision and pace from
  physics and human physiology).
- **Arms (no code change; frozen at the commit that adds this entry):** **WFS** = WF + `nestCompany` + `nestAudience`;
  **WFSD** = WFS + `darkCost`. rhythm-metrics first; e-bench --quick only for an arm that passes night safety (§7.2).
  Prescriptions: 113 (the menus are off; the three switches remove nothing more with `rhythmCircadian` on).
- **Predictions** (scaled from E2e's free-night arms, whose adults were awake 105 min before the night's end, to WF's
  ~42 min): WFS adults out of a nest 3–4.5% of the night (T-RHY-5 0.03–0.045), juveniles 5–15 y 4–5.5%; WFSD 2.5–3.5%
  (T-RHY-5 0.025–0.04), juveniles 3.5–4.5%. Departure median −35 to −10 min, 0.80–0.95 before sunrise (T-FOOD-10 and
  T-RHY-3 still out of band); 5–8 y out of a nest 30–45% of the pre-dawn window; active day 12.2–12.6 h. Passing night
  safety: WFSD possible (low confidence), WFS not expected. No night deaths.
- **Kill criteria:** §7 unchanged. A pass would be the first hold of the pre-dawn hours without the night menu
  (prescriptions 115 → 113), with a sourced sleep window, a physics-based darkness cost and a design-weighted company
  value; it would still leave departures before sunrise.

#### Iteration 2 results (rhythm-metrics, frozen 9d4fac9; read before the benchmark)
WFS fails night safety (adults out of a nest 3.93% of the night, T-RHY-5 0.044); **WFSD passes it, narrowly** (adults
2.96% against ≤ 3.3%, T-RHY-5 0.030 against ≤ 0.033, juveniles 5–15 y 3.50% against R0's 4.61%, no night death):
benchmarked (registered rule). Departures: median −60 (WFS) and −14 (WFSD), 83% before sunrise in both. Full table in
§10.

#### Replication of WFSD (registered before its run; measurement, no change of mechanism)
The pass is within 0.3 points of the line, and R0's rhythm readouts barely vary between realizations while free-night
arms may vary more. WFSD is re-drawn three times on rhythm-metrics (`rgTemperature` 0.1641, 0.1639, 0.16405 added; same
frozen commit) to give its own spread. Reading rule: the night-safety pass stands if the mean of the four WFSD runs
passes both lines (adults ≤ 3.3% of the night, T-RHY-5 ≤ 0.033); if any single run fails, the pass is reported as
"marginal".

## 10. Results

Runs: field profile, seeds 48 and 7, 30-day burn-in + 30 days, `--workers 1` (load 10–24), from frozen detached
checkouts: R0 and its re-draws at 31dea54 (e-bench) and c8eb087 (rhythm-metrics; same simulation code), iteration 1 at
646af95, iteration 2 at 9d4fac9; every e-bench JSON `git.dirty` 0. R0 reproduces E2e's R0 exactly (fitted 4.267,
held-out 6.429, prescriptions 115; departures −13 min, 99% before sunrise, 1,770 departures in R0a, 5–8 y out 96.0% of
the pre-dawn window). Every number below is printed by the scratch scripts `rhy_table.py` and `bench_judge.py` from the
JSON (copies of the scripts and runs in `artifacts/validation/e2f/`, gitignored). Prescription counts from
`scripts/prescription-ledger.ts --count`: R0 115, W 115, every arm with `rhythmFreeNight` 113. `rhythmDarkW` is read in
no arm (nor in R0): traced over 2 days, seed 48.

### 10.1 Rhythm readouts (rhythm-metrics; R0 as the mean ± SD of its four realizations)

| Readout | R0 mean ± SD (min to max) of its 4 runs | W | WF | WH | WHF | WFS | WFSD | WFSD1 | WFSD2 | WFSD3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Last waking, adults (min after sunrise, median) | -128 ± 1 (-128 to -127) | -65 | -64 | -28 | -28 | -65 | -65 | -64 | -65 | -65 |
| Last waking, independent 5–8 y | -126 ± 1 (-127 to -126) | -63 | -62 | -27 | -28 | -63 | -64 | -62 | -62 | -62 |
| Hours asleep, adults (mean) | 8.16 ± 0.00 (8.16 to 8.16) | 9.71 | 9.71 | 10.51 | 10.50 | 9.71 | 9.71 | 9.71 | 9.70 | 9.71 |
| Sleep onset, adults (min after sunset, median) | 97 ± 1 (97 to 98) | 67 | 68 | 56 | 55 | 67 | 67 | 68 | 67 | 67 |
| S at the last waking (median) | 0.089 ± 0.000 (0.089 to 0.089) | 0.056 | 0.056 | 0.045 | 0.045 | 0.056 | 0.056 | 0.056 | 0.056 | 0.056 |
| Departure, adults (min after sunrise, median) | -13 ± 0 (-13 to -13) | -13 | -63 | -13 | -28 | -60 | -14 | -13 | -13 | -14 |
| Departures before sunrise, adults | 0.99 ± 0.00 (0.99 to 1.00) | 0.99 | 0.96 | 1.00 | 0.99 | 0.83 | 0.83 | 0.82 | 0.83 | 0.85 |
| T-RHY-3: adult-female departures before sunrise | 1.00 ± 0.00 (0.99 to 1.00) | 1.00 | 0.98 | 1.00 | 0.99 | 0.90 | 0.90 | 0.90 | 0.89 | 0.89 |
| Departures (n) | 1793 ± 16 (1770 to 1803) | 1801 | 1801 | 1799 | 1769 | 1762 | 1811 | 1776 | 1800 | 1775 |
| Pre-dawn window out of a nest: adults | 0.106 ± 0.000 (0.106 to 0.107) | 0.105 | 0.497 | 0.109 | 0.226 | 0.334 | 0.269 | 0.261 | 0.267 | 0.285 |
| … independent 8–15 y | 0.106 ± 0.001 (0.105 to 0.106) | 0.106 | 0.499 | 0.109 | 0.226 | 0.343 | 0.290 | 0.301 | 0.291 | 0.291 |
| … independent 5–8 y | 0.961 ± 0.002 (0.959 to 0.963) | 0.512 | 0.507 | 0.220 | 0.228 | 0.397 | 0.362 | 0.347 | 0.334 | 0.349 |
| 5–8 y metres per pre-dawn window | 611 ± 36 (576 to 662) | 345 | 419 | 187 | 196 | 303 | 604 | 590 | 562 | 621 |
| Last nest entry (min after sunset, median) | -33 ± 1 (-34 to -32) | -32 | -30 | -32 | -32 | -32 | -33 | -31 | -32 | -32 |
| Start of the last nest (min before sunset, median) | 39 ± 1 (38 to 39) | 37 | 36 | 37 | 38 | 38 | 38 | 37 | 37 | 38 |
| Active day, adults (h, mean) | 11.88 ± 0.03 (11.86 to 11.91) | 11.90 | 12.69 | 11.89 | 12.15 | 12.26 | 12.11 | 12.13 | 12.17 | 12.21 |
| Adults out of a nest, share of night | 0.0006 ± 0.0002 (0.0003 to 0.0009) | 0.0004 | 0.0618 | 0.0003 | 0.0119 | 0.0393 | 0.0296 | 0.0288 | 0.0304 | 0.0317 |
| T-RHY-5 (adults) | 0.001 ± 0.000 (0.000 to 0.001) | 0.000 | 0.064 | 0.000 | 0.013 | 0.044 | 0.030 | 0.028 | 0.029 | 0.031 |
| Juveniles 5–15 y out of a nest, share of night | 0.0461 ± 0.0001 (0.0459 to 0.0462) | 0.0192 | 0.0615 | 0.0028 | 0.0115 | 0.0417 | 0.0350 | 0.0358 | 0.0355 | 0.0348 |
| Night deaths | 0 ± 0 (0 to 0) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Deaths (all) | 0 ± 0 (0 to 0) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

(WH, WHF: the sensitivity arms at 10.5 h of sleep, not an input. WFSD1–3: WFSD's three re-draws.)

### 10.2 Benchmark (e-bench --quick; against the mean of R0's four realizations, e-noise.md amendment 2)

```
ref R0: commit 31dea54861 dirty 0 fitted 4.267 held-out 6.429 presc 115 viab pass
ref R1: commit 31dea54861 dirty 0 fitted 5.884 held-out 6.784 presc 115 viab pass
ref R2: commit 31dea54861 dirty 0 fitted 4.362 held-out 6.510 presc 115 viab pass
ref R3: commit 31dea54861 dirty 0 fitted 3.847 held-out 7.342 presc 115 viab pass

arm W: commit 646af95f8c dirty 0 fitted 3.812 held-out 7.156 presc 115 viab pass
  fitted           rows 15  ref mean 2.664 (runs 3.001, 2.602, 3.028, 2.024; own SD 0.469, used 0.69)  arm 2.478  diff -0.186  z -0.24  inside noise
  held-out         rows 12  ref mean 5.908 (runs 6.429, 5.297, 6.010, 5.897; own SD 0.468, used 1.26)  arm 6.656  diff +0.748  z +0.53  inside noise
  held-out-norare  rows 11  ref mean 4.866 (runs 4.564, 4.650, 4.902, 5.349; own SD 0.353, used 0.48)  arm 4.931  diff +0.064  z +0.12  inside noise
  largest row moves vs ref mean: T-HUN-4 (h) +0.684, T-HUN-1 (f) +0.490, T-COM-11 (f) -0.402, T-HUN-7 (f) -0.219, T-SOC-6 (h) +0.105, T-ACT-3 (f) +0.101
  T-FOOD-10: arm 1 vs refs [1, 1, 1, 1]

arm WFSD: commit 9d4fac918e dirty 0 fitted 2.006 held-out 5.432 presc 113 viab pass
  fitted           rows 15  ref mean 2.664 (runs 3.001, 2.602, 3.028, 2.024; own SD 0.469, used 0.69)  arm 1.858  diff -0.806  z -1.05  inside noise
  held-out         rows 12  ref mean 5.908 (runs 6.429, 5.297, 6.010, 5.897; own SD 0.468, used 1.26)  arm 4.932  diff -0.976  z -0.69  inside noise
  held-out-norare  rows 11  ref mean 4.866 (runs 4.564, 4.650, 4.902, 5.349; own SD 0.353, used 0.48)  arm 4.247  diff -0.619  z -1.15  inside noise
  largest row moves vs ref mean: T-FOOD-10 (h) -0.833, T-HUN-2 (f) -0.392, T-HUN-4 (h) -0.357, T-RNG-5 (h) +0.322, T-HUN-1 (f) -0.285, T-COM-11 (f) -0.249
  T-FOOD-10: arm 0.8166666666666667 vs refs [1, 1, 1, 1]
```

Single-reference `--compare` against R0a, for the record: W fitted −1.789 (16 rows), held-out +0.227 (12) / +0.367 (11
without T-HUN-4 and T-BRD-1); WFSD fitted −1.144 (15), held-out −1.497 (12) / −0.316 (11). R0a was a high-fitted draw
(3.001 on the common rows against a mean of 2.664), which is why the single-reference figures look better than the
judged ones.

### 10.3 Predictions against results
- **W:** every registered range held: waking −65 (−75 to −55), 9.71 h (9.5–9.8), onset +67 (+60 to +75), departures
  −13 and 0.99 before sunrise, adults' pre-dawn share 0.105 (0.08–0.13), 5–8 y 0.512 (0.40–0.65), last nest entry −32
  (−45 to −30), active day 11.90 h, adults' night 0.04%, juveniles 1.9% (1–3%), no deaths, benchmark inside noise
  (z −0.24 / +0.53 / +0.12), prescriptions 115.
- **WF:** killed by night safety as predicted: adults 6.2% of the night (4–8%), T-RHY-5 0.064 (0.04–0.08), juveniles
  6.2% (4–8%); departures −63, 0.96 before sunrise.
- **WH / WHF (sensitivity):** waking −28 (−40 to −20); 5–8 y 0.22 (0.15–0.40); WHF passes the night lines (adults 1.2%,
  T-RHY-5 0.013) with departures −28 and 0.99 before sunrise.
- **WFS:** fails night safety as predicted (adults 3.9%, T-RHY-5 0.044; predicted 3–4.5% and 0.03–0.045).
- **WFSD:** passes night safety (predicted possible, low confidence): over its four realizations adults 3.01 ± 0.12%
  of the night (2.88–3.17%, line 3.3%), T-RHY-5 0.029 ± 0.001 (line 0.033), juveniles 3.53 ± 0.05% (R0 4.61%), no
  death; every single run passes, so the pass stands by the registered reading rule, with a margin of 0.1–0.4 points.
  Departures −14 min, 0.83 ± 0.01 before sunrise (predicted −35 to −10, 0.80–0.95); 5–8 y 0.35 of the window
  (predicted 0.30–0.45) but ~590 m in it (R0 611 m); active day 12.15 h (predicted 12.2–12.6; staged T-RHY-1 10.5–12
  slightly above). Benchmark inside noise in the improving direction (z −1.05 / −0.69 / −1.15), T-FOOD-10 1.00 → 0.82.

## 11. Verdict

| Arm | Result | Decision |
| --- | --- | --- |
| `sleepChimp` alone (W) | The sleep window was wrong: with captive EEG sleep (9.7 h) in place of the human 8.2 h, waking moves from 128 to 65 min before sunrise and sleep onset from 97 to 67 min after sunset; independent 5–8-year-olds' pre-dawn wandering halves (96% → 51% of the window, 611 → 345 m) and juveniles' night activity falls (4.6% → 1.9%). Adults are still released by the night menu (−13 min, 99% before sunrise). Inside noise; removes no prescription | **recorded mechanism, off** (no prescription removed) |
| Without the menu (WF) | Adults leave on waking (−63 min), out 6.2% of the night | **killed** (night safety) |
| Without the menu, with E2e's company and E2c's darkness (WFSD) | The first hold of the pre-dawn hours without the night menu: adults 3.0% of the night (≤ 3.3%), T-RHY-5 0.029, juveniles 3.5%, no night death, in all four realizations; prescriptions 115 → 113; viability passes; fitted and held-out inside noise (z −1.05, −0.69; −1.15 without the rare rows). Departures still 83% before sunrise (T-FOOD-10 0.82, band 0.08–0.30) | **keep candidate (provisional, a package of five switches), off by default; recommend a 5-seed confirm and the full stack before any default** |

Reading:
- **Is the sleep window wrong?** Yes, in amount: the human two-process values sleep 8.2 h under Kibale light, captive
  chimpanzee EEG gives 9.7 h (adults) and 10.8–11.9 h (immatures). The amount is the term that sets waking once the
  route is fixed. Process C's phase (τ, light response) stays human: the only chimpanzee period (24.8 h, n = 1, constant
  light, urine) is not admissible.
- **Does the sourced window fix the pre-dawn problem without a holder?** Not alone: adults still wake 65 min before
  sunrise and leave on waking without the menu. It shrinks the awake-in-the-dark time from about 107 to about 44 min
  before the night ends (daylight 0.03, about 21 min before sunrise), and that is what lets the recorded non-prescriptive mechanisms (company, darkness) hold the
  night without the menu, which they could not do on the human window (E2e: 7.3% of the night). With a slightly
  larger adult amount (10.5 h, the video lower bound) the free night is safe even without them (WHF 1.2%).
- **What still fails:** departure timing. Captive chimpanzees under natural light leave their platform 45–60 min
  before sunrise (videan2005), about when the chimpanzee window wakes them; wild ones mostly stay until about sunrise
  (janmaat2014: 18% before). The model's held animals leave when joining a departure opens (sun about −4°, ~13 min
  before sunrise); nothing measured holds an awake wild chimpanzee in its nest for the last quarter hour.
- **Margins:** the WFSD night pass is narrow (0.1–0.4 points under the line) and rests on two switches that earlier
  stages did not keep alone (`nestCompany`, `nestAudience`: design values; `darkCost`: a null on the human window).

Biggest open problem: what keeps an awake wild chimpanzee in its nest until about sunrise (captive ones get up 45–60
min before it), and the adult sleep period under natural light by EEG (onset and final waking clock times), which
decides how much of the pre-dawn hold is sleep at all (9.7 h leaves 44 min awake before the night ends; 10.5 h, 7).

## 11. Five-seed night-safety check (integrator, registered 2 October 2026 before its run)

Why: WFSD's night-safety pass is within 0.3 points of the line on seeds 48 and 7. Its benchmark sums were inside
noise, so the deciding readout is night safety, and `rhythm-metrics` is the cheapest decisive check.

Runs: `rhythm-metrics --seeds 48,7,21,5,11 --burn-in 30 --days 60` (confirm length, 90 days in all), field, rules
policy, from a frozen detached checkout at the commit that adds this section: **R0** (`rhythmSleep`, `rhythmHeat`,
`departRace`, `nestLightDecide`, `rhythmCircadian` 1) and **WFSD** (R0 + `sleepChimp`, `rhythmFreeNight`,
`nestCompany`, `nestAudience`, `darkCost` 1), one run each.

Reading rule (as §7.2): the pass stands on 5 seeds if WFSD's adults are out of a nest ≤ 3.3% of the night and T-RHY-5
≤ 0.033, with no night death and juveniles 5–15 y not worse than R0's; otherwise WFSD is recorded as failing night
safety on 5 seeds. Expected (integrator, before the run): adults 2.5–4.0% of the night (low confidence: the margin is
small and three seeds are new).

### 11.1 Result (integrator, 2 October 2026; frozen 6069e15; values computed from the JSON with the report's own formulas)

| | R0 | WFSD |
| --- | --- | --- |
| Adults out of a nest, share of night time (pooled; per seed 48, 7, 21, 5, 11) | 0.075% (0.08, 0.07, 0.04, 0.08, 0.10) | **2.988%** (2.89, 2.95, 2.97, 3.13, 3.01) |
| T-RHY-5 (adults; band 0–0.05; line 0.033) | 0.0006 | **0.0295** |
| Juveniles 5–15 y out of a nest, share of night time | 4.608% | 3.514% |
| Independent 5–8 y out of a nest in the two hours before sunrise | 95.7% | 34.2% |
| Departures before sunrise (all adults; T-RHY-3 band 0.05–0.35); median, min after sunrise | 0.99; −14 | 0.84; −14 (lactating −59) |
| Night deaths; deaths | 0; 0 | 0; 0 |

**Reading (§11 rule): the night-safety pass stands on 5 seeds**, every seed below the line, juveniles better than R0,
no night death; the registered expectation (2.5–4.0%) held. WFSD stays a provisional keep candidate as a package
(prescriptions 115 → 113, benchmark sums inside noise on 2 seeds). Departures remain far too early (84% before sunrise
against the field's 18%): the sleep window and the company hold the night but not the last hour before sunrise.
