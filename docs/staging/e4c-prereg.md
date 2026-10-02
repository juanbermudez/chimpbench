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
