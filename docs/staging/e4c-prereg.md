# E4c pre-registration: calls as decisions

Status: written and committed before the first run of the changed model (1 October 2026, branch `e4c-calls`, from `track-e` 591daed). Track E, stage E4, third piece. Builds on E4a and E4b (`docs/staging/e4a-prereg.md`, `docs/staging/e4b-prereg.md`). The reference model (§5) was run before any E4c code existed in the run's path; nothing with `callValue` on has been run.

Rule served: field values of behaviour are targets, never inputs. A probability or hazard set to make a behaviour happen at its field rate is a prescription to remove.

## 1. What is removed

E4b's finding: adult-male pant-hoots come from isolation (contact calls, 34%) and a fitted travel hazard (47%, `travelCallPerH` = 3 per travel-hour, derived from T-COM-1's and T-COM-4's own source), so no internal state can produce the field's hormone–call relations and every call rate is prescribed.

| Prescription today | Where | Kind | Encodes |
| --- | --- | --- | --- |
| `travelCallPerH` 3 per travel-hour, `travelCallGapH` 0.1 h | `execution.ts executeAction` | hazard, quota | T-COM-1, T-COM-4 |
| `contactCallGapH` 0.75 h (and the gate "fewer than 2 community members in sight") | `candidates.ts patrolAndCalls` | quota | T-COM-1 |
| Chorus windows 06:24–07:24 and 18:00–19:00 (literal) | `candidates.ts patrolAndCalls` | clock | — |
| Arrival pant-hoot at rich figs, `random(world) < 0.5` (literal) | `execution.ts forageTick` | coin | (T-COM-9 context) |
| `travelHooP` 0.554, `travelHooAllyP` 0.756 | `execution.ts travelHoo` | probability | gruberZuberbuhler2013's own rates |
| `foodCallBase` 0.35, `foodCallCropW`, `foodCallMaleW`, `foodCallPartnerW` | `execution.ts foodCallChance` | probability | T-COM-8 |

One switch, `callValue` (0 = today, bit-identical; both profiles default 0), switches all eleven out (9 registry entries, 2 counted literals). The food-call pant-hoot variant (design score, foraging with fruit in view ≥ 0.6) goes with them: its function (recruitment to food) is part of the new value. Kept unchanged: counter-calls to strangers, reunion calls, display and status-charge pant-hoots, patrol release choruses, alarm hoos, the C6 hush (`callSuppressW`, which encodes T-COM-3), and what listeners do with a call (join cues, `joinHooW`).

## 2. What the sources say

Read 1 October 2026; details, tags and the unverified list in `docs/staging/e-sources.md` §21 and `docs/research.md` E.21. Nothing below is a model input.

**Functions the mechanism draws on (direction only).**
- *Contact with absent partners.* Arrival pant-hoots at Sonso were more likely when bond partners (β 1.08) and high-ranking males (β 1.30) were absent and in smaller parties (bouchard2022a); inquiring pant-hoots at Loango were more likely when the preferred partner was absent (β −0.58), in smaller parties and at high fission–fusion, and 75% drew a reply and 67% a fusion within about 5 min (southern2025). Fission–fusion with males is the strongest predictor of male pant-hooting at Kanyawara (fedurek2014, fedurek2016), and 25% of isolated calls coincided with males joining. Mahale's result (mitaniNishida1993) is known only at second hand and is ambiguous about which way ally absence acts.
- *Recruitment to food.* Food calls at Taï raised the arrival of others on fruit (kalanBoesch2015); pant hoots are more likely at abundant food (notmanRendall2005); non-fig fruit days had about twice the pant-hoot rate (fedurek2014). Against it: arrival pant-hoots were unrelated to the amount of ripe fruit and marked status (clarkWrangham1994), and food calls at Taï did not follow tree size or fruit count (kalanBoesch2015).
- *Travel coordination.* Travel hoos were given at 60% of travel initiations, almost never alone (2 of 34 events by a lone animal hooed), more with an ally present (75.6% against 55.4%) (gruberZuberbuhler2013).
- *Costs.* Calls are rarer where neighbours range (wilson2007: none in crops, fewer at the periphery; kept as the C6 hush). Females suppress copulation calls when equal- or higher-ranking females are near (townsend2008); low-ranking males and females are quiet outside mixed parties (clark1993). No cost of calling to rivals within the community is wired here (rank is not used).

**Targets this stage can test (none fitted).**
- Male pant-hoots per hour: Kanyawara ≈ 0.85 (fedurek2014, derived), core median 0.76 (wilson2007); Loango 1.21 (southern2025); T-COM-1's band 0.5–1.5.
- Context: travel 45–50%, feeding 25–29%, rest 17–18%, display 7.5–8% (fedurek2014, southern2025).
- Time of day: a strong morning peak, falling through the day: ≈ 1.46 per hour at 07 h to 0.13 at 18 h at Kanyawara (fedurek2016 Fig. 4, read from the figure), morning peak 07–08 h (wilson2007), with a late-afternoon rise at Issa (crunchant2021, piel2018). Ratio of the 07–08 h mean to the 15–18 h mean ≈ 4.3 (fedurek2016, ≈).
- Sexes: females at about 0.35–0.45 of the male rate (crunchant2021 Issa, all loud calls, 0.44; holden2024 Budongo, preprint, 0.38; Taï via crunchant2021, 0.35).
- Associations of a male's calling: positive with fission–fusion with males and with a parous oestrous female present (fedurek2014), with rank (fedurek2016, wilson2007, southern2025), with non-fig fruit (fedurek2014).
- Arrival calls: pant hoots on 0.35 ± 0.14 of a male's arrivals when joining others at Sonso (bouchard2022a), 4% in the first minute of feeding events at Taï (kalanBoesch2015); food calls 0.36 ± 0.16 (Sonso males joining) and 19% in the first minute (Taï), 41% at any time.
- Replies and choruses: most pant hoots at Budongo were replies (70% of male, 90% of female calls; holden2024, preprint); 75% of inquiring pant-hoots drew a reply (southern2025); males chorus with preferred partners (fedurek2013).

**Samples of the rows scored and the arrival readout** (added at the resume, 1 October 2026, after the first pass and before the iteration-1 re-run; from `data/targets.json` and §21 of e-sources; bouchard2022a's Methods read in the CC BY repository copy, St Andrews hdl 10023/24998). Sex and method matter here; reproductive state and body mass do not enter any call row.
- T-COM-1: adult males, focal continuous. Kanyawara 1997–98, 12 males, about 200 h, core median 0.76 per hour (wilson2007); Mahale M 1990, 7 males, 175 h, focal-initiated bouts only, 1.40 per hour (mitaniNishida1993, second hand); Kanyawara 2010–11, 9 adult males, 169 focal days of at least 6 h, about 0.85 per hour derived (fedurek2014). Sim truth: pant-hoots per awake daylight hour (daylight > 0.3, not in a finished nest) of adult males.
- T-COM-4: adult males, activity before the call. Mahale (245 calls, second hand); Kanyawara core: 0.42 per hour feeding on fruit against 0 on herbs (wilson2007); fedurek2014's shares (travel 50%, feeding 25%) are a readout.
- T-COM-8: Taï (*P. t. verus*), 5 males and 4 females, 754.5 h of focal follows, 557 feeding events; food calls in 41% of events at any time and 19% in the first minute (kalanBoesch2015). The observer counts food calls or pant-hoots in the arrival minute of fruit-feeding events (the band-scope correction in "Corrections found").
- Arrival pant-hoots (readout, no row): Sonso, 10 adult males, 692 h of focal follows (07:00–16:30) over 141 days, 233 arrival events, 190 of them males joining others: pant hoots in 0.35 ± 0.14 of joining events, 0.08 ± 0.04 when being joined (bouchard2022a). Methods: an arrival event runs from the male "approaching in visual range of the food tree (i.e. approximately 30 m)" to the moment he starts feeding. The sim readout (calls-diagnose) counts a pant-hoot by an adult male in the tick he enters the feeding phase in a crown, over all his crown arrivals, occupied or not: it misses calls during the last 30 m of the walk and includes arrivals at empty crowns, so it is comparable in size, not in definition. Taï's 4% (pant hoots in the first minute of any feeding event, both sexes; kalanBoesch2015) is the low end.
- T-PTY-1: party size at 15-min scans, all ages and sexes; Kanyawara 1992–2006, 5,527 party follows, 35,083 h, 9.2 ± 7.0 individuals (wilson2012); band 3–9 scaled to a 22-member community.
- T-IGE-1: encounters (strangers seen, or their calls heard) per community-year on party follows; Kanyawara 1992–2006, 120 in 15 years, 8.0 per year (wilson2012); band 5–12. With 2 seeds × 30 days (0.49 community-years) this row rests on a handful of events; the noise arm moved it from 7.7 to 0 (inconclusive).

**Corrections found.** `travelCallPerH`'s note cites "43% of calls after travel" from mitaniNishida1993, which could not be verified; the verified context shares (fedurek2014 50.3%, southern2025 45%) are of the same size. T-COM-8's band (0.3–0.6) comes from food calls at any time in an event (kalanBoesch2015: 41%) but the observer counts the arrival minute, where the Taï value is 19% (food calls) and 4% (pant hoots): recommended to the integrator.

## 3. Mechanism (`src/sim/calls.ts`)

A call is a decision with a gain and a cost to the caller, computed from its own perception and memory (`x.seen`, `x.metAt`, the last community pant-hoot it heard, its memory of individuals, its allies and bonds). No randomness: the 'call' act competes with every other act through the rules policy's existing softmax; calls attached to an event (arrival, departure) are given when their net value is positive.

**Pant-hoot (long-distance, heard within 1 km).**
- Gain = (`contactCallBase` + `contactCallW` × social need) × A × S, where
  - A, separation: the share of the caller's ally bond weight (its allies, up to 3, bond plus support ≥ 0.42) that it has neither seen nor heard pant-hooting within `callFixH`. No allies, no gain.
  - S, staleness of its own last pant-hoot for listeners: 1 once `callFixH` has passed since it; before that, the distance moved since it ÷ `sightDayM` (capped at 1): listeners walking to where it called would not find it. Any pant-hoot counts (displays, status charges and releases too).
- Cost = the C6 hush (`callSuppressW` × neighbour pressure, unchanged) + at a crown (feeding in it, or arriving in it): (`contactCallBase` + `contactCallW`) × the share of its own need (fruit units, `needFruit`) it loses if the k community members it remembers within earshot and out of view come: crop ÷ (1 + feeders) against crop ÷ (1 + feeders + k).
- At decision points: offered as the 'call' act (variant CONTACT) when gain − cost > 0, at that score, to animals of 12 y and over (as today) in daylight above `contactCallMinDaylight`. It replaces the contact, chorus-window and food-call variants.
- On arrival in a crown (age ≥ 12, same daylight): given when gain − cost > 0, replacing the coin at rich figs.

**Travel hoo (quiet, heard within `hearTravelHooM`, 50 m).** At the start of an own trip to a tree. Gain = the sum of bonds with the own-community companions (5 y and over) in view within earshot that would not notice a silent departure: feeding in a crown, grooming, or being groomed (stage C13e's noticing rule). Cost = the share of its own need lost to those k at the destination (believed crop; feeders in view there). Given when gain > cost.

**Food grunt (short-range, 50 m).** On arrival in a crown. Gain = the sum of bonds with own-community companions (5 y and over) in view within earshot that are not yet feeding in it. Cost = the share of its own need lost to those k here (feeders already in the crown counted). Given when gain > cost; no crop gate, no 0.3-h gap.

| Parameter | Value | Basis |
| --- | --- | --- |
| `callValue` | 0 / 1 | switch |
| `callFixH` | 0.3 h | design: the life of a heard pant-hoot as a travel cue for listeners (the 0.3 h join-cue window of `candidates.ts`), so the caller's estimate of what listeners know uses the listeners' own rule. Not fitted to any rate |
| contact gain weights | `contactCallBase` 0.05 + `contactCallW` 0.5 × social need | unchanged design weights of today's contact call; the male bonus `contactCallMaleW` is not read (a sex difference in calling must come from allies and company, not be written in) |
| pant-hoot food cost weight | `contactCallBase` + `contactCallW` (0.55) | design assumption: losing the whole need's worth of food at the crown weighs as much as the most a contact call can gain. Set before any run, not tuned |
| hoo and grunt exchange rate | 1 unit of bond = the whole need | design assumption, set before any run, not tuned |
| staleness distance | `sightDayM` (35 m) | the listeners' sight radius (existing) |

**Not wired, on purpose** (they stay tests): rank, testosterone-like arousal, the fast state, stress, affiliation, oestrous females, time of day, party size as such. No reply to a heard pant-hoot is added (no new decision point); hearing an ally's call only locates it.

## 4. Rows: encoded by construction and genuine tests

| Row | Under `callValue` | Note |
| --- | --- | --- |
| T-COM-1 (pant-hoots per male-hour, fitted) | **genuine** | no rate is written anywhere; it was encoded through `travelCallPerH` |
| T-COM-4 (calling context, held-out) | **genuine in size, direction partly built in** | the travel hazard that built its share in is gone; but moving makes a caller's last call stale (S), so moving raises the value of calling again by design |
| T-COM-8 (food calls at arrivals, fitted) | **genuine** for the share; the audience part is partly encoded | the share is no longer set by `foodCallBase`; that more companions not yet in the crown raise the gain is written in (the cost rises with them too, so the net direction is not) |
| T-COM-2 (rank) | genuine | no rank term |
| T-COM-9 (arrival pant-hoots and status) | genuine | arrival calls follow separation and food, not status: expected to fail |
| T-COM-3 (quiet at edges) | encoded, as before | the C6 hush is kept |
| T-COM-7 (drumming and party size) | genuine, unchanged | drumming is not touched |
| T-COM-5, T-COM-6, T-COM-11 | unchanged | signatures, drum structure, alarm hoos |
| T-END-8 (arousal and pant-hoots) | genuine | arousal is not read by any call |
| T-END-12 (affiliation and intergroup conflict) | genuine, unchanged | not touched |
| Travel hoos (gruberZuberbuhler2013: 60.3% of initiations, 75.6% with an ally in sight against 55.4% without) | **genuine** (readout, no target row) | were the inputs `travelHooP`/`travelHooAllyP`; the ally effect is not written in (allies count only through their bond) |
| Dawn and dusk calling (time of day) | genuine (readout) | the clock windows are gone |
| Sex difference in pant-hooting | genuine (readout) | the male bonus is not read |
| Contact-call function (more calling with allies out of sight) | **encoded** | it is the mechanism (separation A); reported, never counted as evidence |

## 5. Reference (run before any E4c code ran: `callValue` 0)

Seeds 48 and 7, field profile, 30-day burn-in + 30 days, rules policy, `endoStates`, `endoEscalate`, `endoRedirect`, `endoFast`, `endoRainDisplay` = 1. Simulation truth from `scripts/calls-diagnose.ts` (new, committed 505c76a) and `scripts/endocrine-diagnose.ts`; observer from `e-bench --quick` (`artifacts/validation/e4c/ref*`).

| Quantity | Reference |
| --- | --- |
| Pant-hoots per awake daylight hour: adult males / adult females / adolescents | 0.85 / 0.28 / 0.46 |
| Adult-male pant-hoots by source | travel hazard 47%, contact call 34%, displays 11%, chorus window 2%, arrival in a crown 2%, food-call variant 1%, reunion 1% |
| Adult-male pant-hoots by context (act before the call): per hour in it (share of calls; share of time) | travel 2.44 (49%; 17%), feeding 0.40 (20%; 42%), rest 0.39 (13%; 29%), social 0.23 (3%; 12%), other (displays) 15% |
| By hour (adult males, calls per male-hour) | 06 h 5.0 (chorus window), 07–11 h 0.85–1.08, 12–13 h 0.41–0.45, 14–17 h 0.79–0.93, 18 h 0.50 |
| Choruses (another community member's pant-hoot within 1 min and 100 m) | 3% of adult-male pant-hoots |
| Travel hoos: share of trip initiations with a companion in view / ally in view / no ally | 0.62 / 0.76 / 0.57 (the prescribed 0.554 and 0.756) |
| Food grunts at arrivals with crop > 0.3: overall; 0, 1, 2, 3+ adult males in view; bonded partner no / yes | 0.46; 0.43, 0.52, 0.60, 0.60; 0.39 / 0.57 |
| Arrival pant-hoots by adult males (60 seed-days) | 138; 51% from parties with a top-2 male |
| Rank τ (truth, rank number vs rate) | −0.02 |
| Adult males alone (no community member 5+ within 50 m) at hourly samples | 43% (adult females 54%) |
| Allies (from the reference world at day 30): adult males / adult females | 2.6 / 0.8 per animal; 55–59% of adult females have none. Unlocated share A in daylight: adult males 0.81–0.92, all allies unlocated 69–83% of samples |
| Adult-male hours in which adult males joined or left his party (within 50 m) against hours without | 0.97 vs 0.76 per hour |
| Adult-male hours with a swollen parous female in the party against without | 0.65 vs 0.82 per hour |
| Adult males feeding in a crown against on ground foods | 0.31 vs 0.38 per hour |
| 07–08 h ÷ 15–18 h rate | 1.28 |
| Female ÷ male rate | 0.33 |
| T-COM-1 / T-COM-8 (observer, fitted) | 0.82 pass / 0.48 pass |
| T-COM-2 / -3 / -4 / -7 / -9 (observer, pattern) | −0.08 pass / periphery 0.82 vs core 0.81 fail / travel 0.47 top but fruit 0.06 < ground 0.09 per h, fail / 0.01 fail / 0.52 fail |
| T-END-8: E4a readout (arousal with ≥ 1 own pant-hoot in the hour vs none); fedurek2016 form (mean within-male r, 07–18 h) | 0.023 vs 0.032 (reversed); −0.22 (4 of 28 males positive) |
| T-END-12: adult affiliation with strangers seen or heard in the hour vs none | 0.074 vs 0.099 (fail) |
| T-PTY-1 (observer, fitted, tuned) | 2.71 (fail; band 3–9) |
| Band distance: fitted / held-out (rows scored) | 3.29 (17) / 5.77 (17) |
| Prescriptions | 129 |
| Viability | pass (0 births, 0 deaths, 49 living at the end on each seed) |

## 6. Arms and predictions (stated before any run of the changed model)

Seeds 48 and 7 only, field profile, 30-day burn-in + 30 days, rules policy, `--workers 1`. Each arm: `calls-diagnose.ts`, `endocrine-diagnose.ts`, `e-bench --quick`.
- **R** reference (§5).
- **Rn** R with `rgTemperature` 0.1641 instead of 0.164 (E4a's noise arm: one draw in thousands changes and the trajectory re-draws), to show how far the call readouts move by chance.
- **T** R + `callValue`.
- **S0** the full physiological stack (`energyLedger`, `ledgerGrowSurplus`, `ledgerNightNurse`, `ledgerInfantIntake`, `ledgerNurseByMilk`, `ledgerDigesta`, `ledgerDrive`, `rhythmSleep`, `rhythmHeat` = 1) with R's switches; **S1** = S0 + `callValue`. If time allows.

| Quantity (T against R unless noted) | Prediction | Confidence |
| --- | --- | --- |
| Adult-male pant-hoots per awake hour (truth) | 0.5–1.3. The hazard (0.40/h) goes; the contact call is offered more often (in company too, every `callFixH` or after moving out of sight) at a lower score (no male bonus), and arrival calls rise | low |
| T-COM-1 (observer) | inside 0.5–1.5 | low |
| Share of adult-male pant-hoots after travel (truth context) | falls from 0.49 to ≤ 0.35 | moderate |
| T-COM-4 | travel not the most common context (fails on that part) | moderate |
| Adult-female rate | falls by ≥ 30% (more than half of adult females have no ally, so no contact gain) | moderate |
| Female ÷ male rate (field 0.35–0.45) | below R's 0.33 | moderate |
| 06–07 h rate | no spike: at most 2 × the 08–11 h mean (R: about 5 ×) | high |
| 07–08 h ÷ 15–18 h rate (field ≈ 4.3) | above R's 1.28 but below 2.5: the first decisions after the night find allies unlocated and the own last call old, but nothing makes calling fall through the day | low |
| Rate in hours when adult males joined or left (field: positive, fedurek2014) | above hours without (calls are followed by listeners coming) | moderate |
| Rate with a swollen parous female in the party (field: positive) | not above hours without (no route: arousal is not read and allies are more often present in such parties) | moderate |
| Feeding in a crown against on ground foods (field: fruit higher) | crown above ground (arrival calls fall in crowns) | moderate |
| Share of adult-male arrivals in a crown with a pant-hoot (field 0.04–0.35) | 0.2–0.6, above the field | low |
| Choruses (field: most pant hoots are replies) | ≤ 5% of adult-male pant-hoots: no reply is modelled, and hearing an ally only locates it | moderate |
| Arrival pant-hoots by adult males | more than R's 138 | moderate |
| T-COM-9 (top-2 male share of arrival pant-hoots ≥ 0.9) | fails (≤ 0.6) | high |
| T-COM-2 (rank τ, observer) | within ±0.15 of 0, sign a coin | moderate |
| Travel hoos with a companion in view | 0.3–0.6 | low |
| Travel hoos, ally in view vs not | ally ≥ no ally | moderate |
| T-COM-8 (food call or pant-hoot in the arrival minute) | 0.3–0.7 | low |
| Food grunts rise with adult males in view (0 → 2+) | yes | moderate |
| T-END-8, E4a readout | still reversed (arousal lower in hours with own pant-hoots) | moderate |
| T-END-8, fedurek2016 form | mean within-male r ≤ 0 | moderate |
| T-END-12 | still fails | high |
| T-PTY-1 | within ±0.3 of R (2.71) | low |
| Adult males alone at hourly samples | within ±0.05 of R (0.43) | low |
| Band distances (fitted, held-out) | within the noise floor (±1.1 each) of R | moderate |
| Prescriptions | 129 → 118 | high |
| Viability | passes | high |
| Stack (S1 against S0) | the same directions as T against R | low |

## 7. Kill criterion

`callValue` stays off, and the result is recorded as a null, if on the development seeds (T against R, or S1 against S0):
- viability fails (births ÷ deaths when applicable, any starvation death the reference does not have, a seed below 80% of its start);
- held-out band distance rises beyond the noise floor (+1.1) against its reference;
- calling collapses or explodes: adult-male pant-hoots below 0.25 or above 3 per awake hour (half the lower edge, twice the upper edge of T-COM-1's band), or travel hoos given at under 10% of initiations with a companion in view: the value comparison does not produce calling at a field magnitude;
- party cohesion breaks: T-PTY-1 falls by more than 0.5, or the share of adult males alone at hourly samples rises by more than 0.10.

Keep rule (track): viability passes, held-out distance does not rise beyond the noise floor, the prescription count falls. Even then the switch stays off by default (track rule); it would be a provisional keep candidate.

## 8. Iterations

At most three, each a change of mechanism from first principles, written here before its run. No weight, exchange rate or time constant is tuned to a call rate. A miss is a finding.

## 9. Results

### Run log (each entry written before its run)

- **R** (1 October 2026): diagnosis and bench at 505c76a, before any E4c code; the calls diagnosis re-run with the added readouts (fission–fusion, oestrous female, feeding, morning ratio) at f0ec770 with `callValue` 0, which the field switches-off pin shows to be bit-identical (§5).
- **Rn, T, S0, S1** (written before running; code at the commit that adds this file): as in §6. Outputs in `artifacts/validation/e4c/` (gitignored), one run at a time, `--workers 1`.
- **Re-diagnosis** (no mechanism change): the calls diagnosis missed arrivals where the forage act starts at the crown in the same tick (9f41b48: an arrival is now the tick the feeding phase is entered), and the endocrine diagnosis gained the pooled daily profiles behind T-END-8 (14d1442). R, Rn, T, S0 and S1 were re-diagnosed with the first-pass code (`callValue` as at f0ec770).
- **Protocol breach, disclosed.** The iteration-1 code (below) was written while the first S1 arm was running; the S1 endocrine diagnosis and bench started after the edit and so ran the iteration-1 mechanism. I read their output (rate 0.59 per hour, 12–25% of adult-male arrivals with a pant-hoot, T-END-8 r +0.26 with 24 of 28 males positive, T-PTY-1 4.32) before writing the iteration-1 entry. Those outputs are discarded; S1 was re-run on the first-pass code (clean numbers below). The first S1 calls diagnosis also ran the iteration-1 code and was discarded and re-run on the first-pass code too (the `s1-calls.json` behind the table is that re-run, from the re-diagnosis above). The iteration-1 code was saved as written at that moment and is committed unchanged after this entry; its stack arm (S1b) is reported with that preview stated, not as a prediction.

### First-pass results (`callValue` as pre-registered; seeds 48, 7; 30 + 30 days; field; rules policy)

R = reference, Rn = noise arm, T = R + `callValue`; S0 = stack + R's switches, S1 = S0 + `callValue`. Simulation truth (calls-diagnose, endocrine-diagnose) and observer (e-bench --quick). AM = adult males.

| Quantity | R | Rn | T | S0 | S1 |
| --- | --- | --- | --- | --- | --- |
| Pant-hoots per awake hour: AM / adult females / adolescents | 0.85 / 0.28 / 0.46 | 0.81 / 0.29 / 0.48 | 0.76 / 0.21 / 0.65 | 0.83 / 0.27 / 0.42 | 0.85 / 0.40 / 0.63 |
| Female ÷ male (field 0.35–0.45) | 0.33 | 0.36 | 0.28 | 0.32 | 0.47 |
| AM calls by context: travel / feeding / rest / social / other (displays) (field 45–50 / 25–29 / 17–18 / — / 7.5–8) | 49 / 20 / 13 / 3 / 15% | 48 / 20 / 14 / 3 / 16% | 13 / 66 / 6 / 3 / 12% | 34 / 22 / 15 / 4 / 25% | 10 / 57 / 7 / 4 / 21% |
| AM per hour while travelling / feeding | 2.44 / 0.40 | 2.36 / 0.38 | 0.38 / 1.22 | 2.36 / 0.55 | 0.41 / 1.48 |
| AM sources | travel hazard 47%, contact 34%, displays 11% | the same | arrival in a crown 57%, contact 25%, displays 10% | hazard 35%, contact 28%, displays 21% | arrival 47%, contact 19%, displays 19% |
| AM arrivals in a crown with a pant-hoot (field 0.04 first minute at Taï, 0.35 ± 0.14 when joining at Sonso) | 0.03 | 0.03 | 0.73 | 0.04 | 0.63 |
| 07–08 h ÷ 15–18 h (field ≈ 4.3) | 1.28 | 1.25 | 1.23 | 1.40 | 1.19 |
| AM in hours when males joined or left vs not (field: positive) | 0.97 vs 0.76 | 0.92 vs 0.71 | 0.80 vs 0.67 | 0.92 vs 0.75 | 0.86 vs 0.80 |
| AM with a swollen parous female in the party vs not (field: positive) | 0.65 vs 0.82 | 0.49 vs 0.78 | 0.66 vs 0.74 | 0.52 vs 0.83 | 0.62 vs 0.86 |
| AM feeding in a crown vs on ground foods (field: fruit higher) | 0.31 vs 0.38 | 0.31 vs 0.37 | 1.35 vs 0.22 | 0.41 vs 0.44 | 1.91 vs 0.30 |
| Choruses (share of AM pant-hoots) | 0.03 | 0.04 | 0.13 | 0.05 | 0.17 |
| Rank τ, truth (negative = high rank calls more) | −0.02 | 0.12 | 0.22 | 0.30 | 0.41 |
| Travel hoos: with a companion / ally in view / no ally (field 60–67% / 75.6% / 55.4%) | 0.62 / 0.76 / 0.57 | 0.61 / 0.78 / 0.56 | 0.58 / 0.70 / 0.51 | 0.63 / 0.76 / 0.55 | 0.53 / 0.65 / 0.40 |
| Food grunts at arrivals (12+, all crops); with 0 / 3+ adult males in view (crop > 0.3) | 0.42; 0.43 / 0.61 | 0.43; 0.44 / 0.66 | 0.31; 0.14 / 0.61 | 0.44; 0.46 / 0.59 | 0.41; 0.16 / 0.66 |
| AM alone at hourly samples | 0.43 | 0.40 | 0.24 | 0.31 | 0.19 |
| T-END-8, E4a readout (arousal, hours with ≥ 1 own pant-hoot vs none) | 0.023 vs 0.032 | 0.02 vs 0.04 | 0.06 vs 0.07 | 0.04 vs 0.06 | 0.07 vs 0.08 |
| T-END-8, fedurek2016 form (mean within-male r; males r > 0) | −0.22 (4/28) | −0.20 (7/28) | −0.22 (3/28) | −0.14 (10/28) | 0.04 (17/28) |
| T-END-12 (affiliation, strangers in the hour vs none) | 0.07 vs 0.10 | 0.06 vs 0.10 | 0.06 vs 0.10 | 0.08 vs 0.18 | 0.08 vs 0.19 |
| T-COM-1 (observer, 0.5–1.5) | 0.82 pass | 0.79 pass | 0.80 pass | 0.78 pass | 0.81 pass |
| T-COM-2 (rank, negative required) | −0.08 pass | 0.09 fail | 0.26 fail | 0.25 fail | 0.26 fail |
| T-COM-3 (periphery below core) | fail | fail | fail | fail | fail |
| T-COM-4 (travel top; fruit > ground) | fail (travel 0.47; fruit 0.06 < 0.09) | fail | **pass** (0.74; 0.77 > 0.05) | fail (0.34) | **pass** (0.67; 1.53 > 0.10) |
| T-COM-7 (drumming and party size) | fail | fail | fail | fail | fail |
| T-COM-8 (0.3–0.6) | 0.48 pass | 0.49 pass | 0.76 fail | 0.51 pass | 0.91 fail |
| T-COM-9 (≥ 0.9) | 0.52 fail | 0.46 fail | 0.56 fail | 0.38 fail | 0.61 fail |
| T-PTY-1 (3–9) | 2.71 fail | 2.69 fail | 4.55 pass | 3.47 pass | 5.88 pass |
| Fitted / held-out distance (rows) | 3.29 (17) / 5.77 (17) | 1.93 (16) / 2.14 (16) | 6.89 (17) / 1.38 (13) | 3.05 (19) / 5.36 (17) | 6.03 (19) / 4.57 (18) |
| Shared rows against the reference: fitted / held-out | — | −1.37 / −3.13 | +3.59 / −2.88 | — | +2.99 / −1.77 |
| … without hunting, patrol and intergroup rows | — | −0.16 / −0.88 | +1.15 / −1.16 | — | +0.74 / −0.29 |
| Prescriptions | 129 | 129 | 118 | 103 | 92 |
| Viability | pass | pass | pass | pass | pass |
| Decided conflicts (30 days, both seeds) | 290 | 321 | 674 | 865 | 1,601 |

Viability: every arm 0 births, 0 deaths, no starvation, 49 living at the end of each seed. The noise arm moves the call readouts by at most a few per cent and the observer sums by up to 3.1 (hunting and patrol rows).

**Reading.** The value comparison produces calling at a field magnitude without any rate (adult males 0.76–0.85 per hour), keeps the travel hoo's ally effect without the probabilities (0.70 vs 0.51; stack 0.65 vs 0.40), gives food grunts an audience effect (0 adult males in view 0.14–0.16, 3 or more 0.61–0.66) and brings the female-to-male ratio into the field band on the stack (0.47; timer world 0.28). But its arrival pant-hoot fires at 63–73% of adult-male arrivals in a crown, ten times the reference and two to twenty times the field, and makes 47–57% of adult-male calls. Each of those calls draws hearers to the crown (the join cue), so parties grow (T-PTY-1 2.7 → 4.6; stack 3.5 → 5.9; adult males alone 0.43 → 0.24), travel and day range rise (T-ACT-2 out of band), many more stranger pant-hoots are heard (T-IGE-1 7.7 → 28.9 in the timer world) and decided conflicts double. T-COM-8 (fitted) leaves its band (0.76, 0.91). Kill criterion (§7): not met in either world (viability passes, held-out falls, the rate is in range, hoos at 53–58%, cohesion rises rather than breaks).

**§6 predictions, first pass** (T against R): rate 0.5–1.3 confirmed (0.76); T-COM-1 in band confirmed; travel share ≤ 0.35 confirmed (0.13) and T-COM-4 failing on travel **missed** (the observer files the walk into the crown as travel: T-COM-4 passes); female rate falls ≥ 30% missed (−25%); female ÷ male below 0.33 confirmed (0.28; stack 0.47 missed); no 06–07 h spike **missed** (4.4 per hour: the first decisions and arrivals after the night, not a clock); morning ratio above 1.28 missed (1.23); fission–fusion association positive confirmed; oestrous-female association not above confirmed; crown above ground confirmed; arrival share 0.2–0.6 missed (0.73); choruses ≤ 5% missed (13%); arrival pant-hoots more than R confirmed; T-COM-9 fails confirmed; rank τ within ±0.15 missed (+0.22, observer +0.26: low-ranking males call more); hoos 0.3–0.6 confirmed (0.58) and ally ≥ no ally confirmed; T-COM-8 0.3–0.7 missed (0.76); grunts rise with males confirmed; T-END-8 both forms confirmed (reversed, r ≤ 0); T-END-12 fails confirmed; T-PTY-1 within ±0.3 **missed** (+1.8); alone within ±0.05 missed (−0.19); band distances within the noise floor: held-out yes (falls), fitted **missed** (+3.6, of which +2.4 is T-IGE-1); prescriptions 129 → 118 confirmed; viability confirmed. Stack: same directions, as predicted.

**T-END-8, why it fails.** The pooled daily profiles show the slow arousal state *rising* through the day in every arm (R 0.013 at 07 h → 0.039 at 17 h; S1 0.032 → 0.114): it integrates exposure to swollen females and rivals while awake and decays overnight. Field testosterone falls through the day (mullerLipson2003). Pant-hoots are flat with a midday dip. No call mechanism can give the field's within-male hourly association while the arousal state runs the wrong way through the day; that is the endocrine model's daily course, not the call system's.

- **Iteration 1** (written after the first pass, before its run; one mechanism change; see the breach note above). *Finding:* the arrival pant-hoot fires at 63–73% of adult-male arrivals. The gain at arrival is about the full contact value (allies unlocated, the own last call stale after any walk), and the cost is almost nothing, because the caller counts as competitors only the community members it saw in the last 15 minutes (its memory of individuals). But in the model every own-community animal within 1 km hears a pant-hoot and may come (the join cue, stronger when the caller is at food). The caller's estimate of its audience ignores the physics of its own call. *Change:* the competitors a pant-hoot at a crown may bring are the community members aged 5 or more it does not see, times the share of its community's range within earshot (`hearPantHootM`² ÷ range radius², capped at 1; the range is the 95% isopleth as an equal-area circle, `troop.radius`). This is geometry and the caller's knowledge of its own community. No rate and no new parameter. Pant-hoots away from a crown, hoos and grunts are unchanged. *Expected (T1 = T with iteration 1, against T; timer world, the only arm predicted):* adult-male arrivals with a pant-hoot fall from 0.73 to at most 0.25, the rest at the largest crops and by animals near satiety (moderate). Pant-hoots at food come later in feeding bouts, at decision points when the need is small (low). The AM rate is 0.35–0.8 per hour (low). T-COM-8 is 0.25–0.5 (low). T-PTY-1 falls back toward R, below 3.6 (moderate). T-IGE-1 falls toward R (moderate). The AM alone share rises back above 0.3 (moderate). T-COM-9 still fails (high). The fitted distance falls back to within +1.1 of R on shared rows (low). Prescriptions stay at 118 (high). The kill criterion and keep rule are unchanged. **S1b** (stack with iteration 1) is run and reported against S0 and S1. Its direction was previewed by the discarded run (above), so it carries no prediction.

- **Iteration 1 run** (1–2 October 2026; logged after the run, which re-ran the registered iteration 1 with no change): the app restart killed the first attempt after `t1-calls.json` (unread). `run-it1.sh` was re-run in full (T1, then S1b; calls diagnosis, endocrine diagnosis, `e-bench --quick --workers 1` per arm) from a frozen detached checkout of 2b81df8 (`.claude/worktrees/e4c-run`, removed afterwards), load 6–11. The new `t1-calls.json` is byte-identical to the killed run's (determinism). Outputs in `artifacts/validation/e4c/` (gitignored).

### Iteration 1 results (T1 = T + iteration 1; S1b = S1 + iteration 1; seeds 48, 7; 30 + 30 days; field; rules policy)

Every number in this table is printed by `artifacts/validation/e4c/e4c-md.mjs` from the arms' JSON (calls-diagnose, endocrine-diagnose, e-bench); none is typed. Shared rows: rows scored in both runs. "Without hunting, patrol and intergroup rows" is the first-pass table's set (T-HUN-1 to -4, T-PAT-*, T-IGE-*, T-BRD-*; T-HUN-7 and T-HUN-8 kept), which reproduces its figures exactly. The registered noise floor is ±1.1.

| Quantity | R | T | T1 | S0 | S1 | S1b |
| --- | --- | --- | --- | --- | --- | --- |
| Pant-hoots per awake hour: AM / adult females / adolescents | 0.85 / 0.28 / 0.46 | 0.76 / 0.21 / 0.65 | 0.49 / 0.12 / 0.47 | 0.83 / 0.27 / 0.42 | 0.85 / 0.40 / 0.63 | 0.59 / 0.24 / 0.52 |
| Female ÷ male (field 0.35–0.45) | 0.33 | 0.28 | 0.24 | 0.32 | 0.47 | 0.41 |
| AM crown arrivals with a pant-hoot, pooled (field 0.04 first minute at Taï, 0.35 ± 0.14 joining at Sonso) | 0.03 | 0.73 | 0.28 | 0.04 | 0.63 | 0.20 |
| … by crop > 0.55 / 0.3–0.55 / ≤ 0.3 | 0.08 / 0.00 / 0.00 | 0.76 / 0.72 / 0.72 | 0.32 / 0.25 / 0.25 | 0.10 / 0.00 / 0.00 | 0.69 / 0.61 / 0.56 | 0.26 / 0.18 / 0.13 |
| AM arrival pant-hoots (60 seed-days); share with a top-2 male | 144; 0.52 | 4230; 0.61 | 1372; 0.54 | 201; 0.63 | 3742; 0.65 | 997; 0.68 |
| AM calls by context, %: travel / feeding / rest / social / other (field 45–50 / 25–29 / 17–18 / — / 7.5–8) | 49 / 20 / 13 / 3 / 15 | 13 / 66 / 6 / 3 / 12 | 16 / 41 / 15 / 6 / 22 | 34 / 22 / 15 / 4 / 25 | 10 / 57 / 7 / 4 / 21 | 11 / 34 / 15 / 7 / 32 |
| AM sources, top 3 (share) | travelling (hazard) 0.47; call/CONTACT 0.34; display 0.09 | arrival in a crown 0.57; call/CONTACT 0.25; display 0.06 | call/CONTACT 0.39; arrival in a crown 0.29; display 0.13 | travelling (hazard) 0.35; call/CONTACT 0.28; display 0.16 | arrival in a crown 0.47; call/CONTACT 0.19; display 0.14 | call/CONTACT 0.31; display 0.23; arrival in a crown 0.18 |
| 06 h rate ÷ mean of 08–11 h (first-pass prediction ≤ 2) | 5.04 ÷ 0.95 = 5.33 | 4.38 ÷ 0.84 = 5.23 | 2.50 ÷ 0.53 = 4.70 | 11.6 ÷ 0.82 = 14.2 | 6.27 ÷ 0.82 = 7.62 | 4.75 ÷ 0.55 = 8.60 |
| 07–08 h ÷ 15–18 h (field ≈ 4.3) | 1.28 | 1.23 | 1.03 | 1.40 | 1.19 | 1.00 |
| AM per hour: males joined or left vs not (field: positive) | 0.97 vs 0.76 | 0.80 vs 0.67 | 0.59 vs 0.43 | 0.92 vs 0.75 | 0.86 vs 0.80 | 0.63 vs 0.54 |
| AM per hour: swollen parous female vs not (field: positive) | 0.65 vs 0.82 | 0.66 vs 0.74 | 0.45 vs 0.48 | 0.52 vs 0.83 | 0.62 vs 0.86 | 0.43 vs 0.60 |
| AM per hour feeding: crown vs ground foods (field: fruit higher) | 0.31 vs 0.38 | 1.35 vs 0.22 | 0.45 vs 0.35 | 0.41 vs 0.44 | 1.91 vs 0.30 | 0.63 vs 0.33 |
| Choruses (share of AM pant-hoots) | 0.03 | 0.13 | 0.06 | 0.05 | 0.17 | 0.07 |
| Rank τ, truth (negative = high rank calls more) | -0.02 | 0.22 | 0.18 | 0.30 | 0.41 | 0.22 |
| Travel hoos: with a companion / ally / no ally (field 60–67% / 75.6% / 55.4%) | 0.62 / 0.76 / 0.57 | 0.58 / 0.70 / 0.51 | 0.54 / 0.66 / 0.49 | 0.63 / 0.76 / 0.55 | 0.53 / 0.65 / 0.40 | 0.43 / 0.59 / 0.34 |
| Food grunts at arrivals (crop > 0.3), 0 / 3+ adult males in view | 0.43 / 0.61 | 0.14 / 0.61 | 0.20 / 0.75 | 0.46 / 0.59 | 0.16 / 0.66 | 0.28 / 0.82 |
| AM alone at hourly samples | 0.43 | 0.24 | 0.35 | 0.31 | 0.19 | 0.27 |
| T-END-8, E4a readout (arousal, hours with ≥ 1 own pant-hoot vs none) | 0.02 vs 0.03 | 0.06 vs 0.07 | 0.04 vs 0.04 | 0.04 vs 0.06 | 0.07 vs 0.08 | 0.07 vs 0.08 |
| T-END-8, fedurek2016 form (mean within-male r; males r > 0) | -0.22 (4/28) | -0.22 (3/28) | -0.04 (15/28) | -0.14 (10/28) | 0.04 (17/28) | 0.26 (24/28) |
| T-END-12 (affiliation, strangers in the hour vs none) | 0.07 vs 0.10 | 0.06 vs 0.10 | 0.03 vs 0.11 | 0.08 vs 0.18 | 0.08 vs 0.19 | 0.06 vs 0.18 |
| T-COM-1 (observer, 0.5–1.5) | 0.82 pass | 0.80 pass | 0.46 fail | 0.78 pass | 0.81 pass | 0.54 pass |
| T-COM-2 (rank, negative required) | -0.08 pass | 0.26 fail | -0.08 fail | 0.25 fail | 0.26 fail | 0.24 fail |
| T-COM-4 (travel top; fruit > ground per h) | travel 0.47; 0.06 vs 0.09 fail | travel 0.74; 0.77 vs 0.05 pass | travel 0.54; 0.23 vs 0.10 pass | travel 0.34; 0.13 vs 0.15 fail | travel 0.67; 1.53 vs 0.10 pass | travel 0.40; 0.30 vs 0.07 pass |
| T-COM-8 (0.3–0.6) | 0.48 pass | 0.76 fail | 0.50 pass | 0.51 pass | 0.91 fail | 0.67 fail |
| T-COM-9 (≥ 0.9) | 0.52 fail | 0.56 fail | 0.54 fail | 0.38 fail | 0.61 fail | 0.71 fail |
| T-PTY-1 (3–9) | 2.71 fail | 4.55 pass | 3.31 pass | 3.47 pass | 5.88 pass | 4.32 pass |
| T-IGE-1 (5–12 per community-year) | 7.67 pass | 28.9 fail | 4.50 inconclusive | 10.3 pass | 3.09 inconclusive | 0.00 inconclusive |
| T-ACT-2 (fitted) | 0.19 pass | 0.29 fail | 0.22 fail | 0.15 pass | 0.27 fail | 0.17 pass |
| Fitted / held-out distance (rows) | 3.29 (17) / 5.77 (17) | 6.89 (17) / 1.38 (13) | 3.35 (17) / 1.77 (12) | 3.05 (19) / 5.36 (17) | 6.03 (19) / 4.57 (18) | 3.93 (16) / 3.26 (12) |
| Against the reference (T, T1: R; S1, S1b: S0), fitted / held-out Δ (rows), all | — | +3.59 / −2.88 (16, 13) | −0.56 / −1.98 (16, 12) | — | +2.99 / −1.77 (19, 17) | +0.94 / −0.70 (16, 12) |
| Iteration 1 against the first pass (T1: T; S1b: S1), all | — | — | −3.54 / +0.89 (17, 12) | — | — | −1.11 / +0.99 (16, 12) |
| Against the reference (T, T1: R; S1, S1b: S0), fitted / held-out Δ (rows), without T-HUN-4 and T-BRD-1 | — | +3.59 / −1.16 (16, 12) | −0.56 / −0.22 (16, 11) | — | +2.99 / −0.37 (19, 16) | +0.94 / −0.65 (16, 11) |
| Iteration 1 against the first pass (T1: T; S1b: S1), without T-HUN-4 and T-BRD-1 | — | — | −3.54 / +0.93 (17, 11) | — | — | −1.11 / −0.36 (16, 11) |
| Against the reference (T, T1: R; S1, S1b: S0), fitted / held-out Δ (rows), without hunting, patrol and intergroup rows | — | +1.15 / −1.16 (12, 11) | −0.21 / −0.22 (12, 11) | — | +0.74 / −0.29 (13, 11) | +0.07 / −0.65 (13, 11) |
| Iteration 1 against the first pass (T1: T; S1b: S1), without hunting, patrol and intergroup rows | — | — | −0.74 / +0.93 (13, 11) | — | — | −0.67 / −0.36 (13, 11) |
| Prescriptions | 129 | 118 | 118 | 103 | 92 | 92 |
| Viability (living start → end, births, deaths, starvation; per seed) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) | pass (49→49 b0 d0 s0; 49→49 b0 d0 s0) |
| Decided conflicts (30 days, both seeds) | 290 | 674 | 464 | 865 | 1601 | 1157 |
| Commit of the bench run; uncommitted files | 505c76a; 0 | 8f7b80e; 0 | 2b81df8; 0 | 8f7b80e; 1 | 9f41b48; 0 | 2b81df8; 0 |

The last row is the commit each bench ran at and its count of uncommitted files: T1 and S1b ran the committed iteration-1 code from a clean checkout.

**Predictions of iteration 1** (T1 against T; registered in the iteration-1 entry above). Eight of ten confirmed, one missed narrowly, one not measured.
- Adult-male arrivals with a pant-hoot fall from 0.73 to at most 0.25: **missed** (0.28, inside the field's 0.04–0.35). The rest is only mildly concentrated at the largest crops (0.32 at crop > 0.55, 0.25 below); "by animals near satiety" was not measured (no readout was registered).
- Pant-hoots at food come later in feeding bouts: **not measured** (no readout was registered).
- AM rate 0.35–0.8 per hour: confirmed (0.49). T-COM-8 0.25–0.5: confirmed (0.50, at the edge). T-PTY-1 below 3.6: confirmed (3.31). T-IGE-1 falls toward R: confirmed in direction (28.9 → 4.5, inconclusive; the noise arm moves this row from 7.7 to 0, so it is inside noise). AM alone above 0.3: confirmed (0.35). T-COM-9 fails: confirmed. Fitted distance within +1.1 of R on shared rows: confirmed (−0.56). Prescriptions 118: confirmed.

**Against the references, rows scored in both.** T1 against R: fitted −0.56, held-out −1.98 on all shared rows; −0.56 / −0.22 without T-HUN-4 and T-BRD-1; −0.21 / −0.22 without hunting, patrol and intergroup rows. S1b against S0: +0.94 / −0.70; +0.94 / −0.65; +0.07 / −0.65. Every difference against the references is inside noise (the held-out −1.98 is T-HUN-4: −0.22 without it). The iteration's own effect: T1 against T, fitted −3.54 on all rows (T-IGE-1 and T-COM-8 return), −0.74 without hunting, patrol and intergroup rows, held-out +0.89 / +0.93 (inside noise); S1b against S1, fitted −1.11 (at the noise floor) and −0.67 without those rows, held-out +0.99, −0.36 without the rare-event rows.

**Kill criterion (§7), T1 against R and S1b against S0: not met.** Viability passes in both worlds (0 births, 0 deaths, no starvation, 49 living at the end of each seed). Held-out distance falls. Adult males call 0.49 and 0.59 times per awake hour (inside 0.25–3) and give travel hoos at 54% and 43% of trip initiations with a companion in view (≥ 10%). Cohesion does not break: T-PTY-1 rises (2.71 → 3.31; 3.47 → 4.32), the share of adult males alone falls (0.43 → 0.35; 0.31 → 0.27).

**Keep rule: met in both worlds** (viability passes, held-out inside noise, prescriptions 129 → 118 and 103 → 92). `callValue` with iteration 1 is a provisional keep candidate. It stays off by default (track rule) and needs a 5-seed confirm: every difference above is a quick-mode difference inside noise.

**Reading.** A pant-hoot is a broadcast: in the field world the 95% range of a community has an equal-area radius of 0.9–1.1 km after the burn-in (seeds 48 and 7, measured with a scratch script), so a 1-km call reaches 78–100% of it. Counting every unseen member aged 5 or more, times that share, as a possible competitor at the crown cuts arrival pant-hoots by 62% (timer) and 68% (stack) into the field's range, and most of the first pass's side effects go with them: party size returns toward the reference (3.31; stack 4.32 against S1's 5.88), intergroup contacts and the fitted distance return to the reference, and T-COM-8 is back in band in the timer world. What remains:
- The timer world's rate is just under T-COM-1's band (observer 0.46, truth 0.49; the stack gives 0.54 and passes). A miss, recorded; nothing is tuned.
- On the stack T-COM-8 is 0.67 (band 0.3–0.6). Food grunts at arrivals follow the audience (0.28 with no adult male in view, 0.82 with three or more) and are frequent; against the arrival-minute value of the band's own source (19% at Taï) both worlds call too often at arrival. The grunt's exchange rate (1 unit of bond = the whole need) is a design assumption set before any run.
- Decided conflicts stay above the references (464 against 290; 1,157 against 865) as parties stay larger; no scored aggression row worsens.
- Calls have no daily course: a burst in the first hour after the night (06 h at 4.7 × the 08–11 h mean in T1, 8.6 × in S1b; the 06 h bin holds only the minutes after leaving the nest, which inflates it), then flat (07–08 h ÷ 15–18 h 1.0 against the field's ≈ 4.3).
- Choruses stay rare (6–7% of adult-male pant-hoots; no reply is modelled), and low-ranking males still call more (truth τ +0.18 and +0.22; T-COM-2 fails).
- Female ÷ male: 0.24 in the timer world (below 0.35–0.45), 0.41 on the stack (inside).

**T-END-8 (outside E4c; reported, not fixed here).** On the stack the fedurek2016 form turns positive (r +0.26, 24 of 28 males), for the wrong reason: the slow arousal state triples from 07 to 17 h in every arm (S1b 0.034 → 0.104; T1 0.019 → 0.051), and on the stack the pant-hoot rate also rises in the late afternoon (0.52 per male-hour at 07–09 h, 0.65 at 15–17 h), whereas field testosterone falls through the day (mullerLipson2003) and so does pant-hooting (fedurek2016). This is the endocrine model's daily course, not the call system's. Correction to the first-pass text: R's arousal peaks at 0.039 at 16 h and is 0.033 at 17 h (pooled profile in `ref-diag.json`).

**Decision: no iteration 2.** Iteration 1 did what it was for, and both worlds meet the keep rule. The remaining misses are not defects of the value comparison as registered:
- the daily course needs a state with the field's daily course (the endocrine model, outside E4c);
- replies need a decision point on hearing a call, which §3 left out on purpose and which would change what every listener within 1 km does: a stage of its own, with a reply readout defined from southern2025's and holden2024's methods (latency and distance; the chorus readout here counts only calls within 1 min and 100 m);
- raising T-COM-1's 0.46 would be tuning.

**Known issues, deferred** (for the reply stage):
- `src/sim/calls.ts:32` (`unlocatedShare`) counts an ally heard pant-hooting within `callFixH` as located. The gain is what out-of-sight allies learn about the caller, and a heard ally has learnt nothing about the listener, so as written hearing an ally lowers the listener's value of calling (an anti-reply term). The registered reading (separation: a heard ally can be joined without calling) is kept for this stage.
- `scripts/calls-diagnose.ts` (arrival block, `arrived`): the arrival readout counts a pant-hoot in the tick the feeding phase is entered at any crown; bouchard2022a counts the whole approach from about 30 m when joining others. The hourly readout divides by awake time, so the first hour after the night holds few awake minutes.

**Recommended next.** A 5-seed confirm of T1 against R and S1b against S0. A reply stage (calls heard as decision points, with the deferred `unlocatedShare` question). The endocrine daily course (T-END-8). For the integrator: T-COM-8's band scope (the observer counts the arrival minute, where the Taï value is 19%).
