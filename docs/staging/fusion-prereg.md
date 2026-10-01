# Finding company: measurement, design and pre-registration

Status: design and pre-registration, 1 October 2026, written before any code or run of the change. Measurements are truth probes on `main` f24c9ae (`departPersist` on): field profile, seeds 48 and 7, 30-day burn-in then 20 days, 2 processes (`artifacts/validation/party/fusion-probe.ts`, `fusion-48.json`, `fusion-7.json`). Subjects and companions are animals of 12 y or more; "alone" means no other such animal in the party (50 m chain); samples every minute in daylight.

## 1. What a solitary animal does, hears and finds

| Quantity | Model (seed 48 / 7) | Field | Source |
| --- | --- | --- | --- |
| Time alone, all | 48% / 50% | — | — |
| Time alone, females | 52% / 56% | 45% (Taï 1988); about 18% (Taï: with other adults 82% of time); Ngogo: with another female 64% of time | doran1997; lehmannBoesch2008; wakefield2008 |
| Time alone, males | 44% / 44% | less than females | wakefield2008 |
| A solitary spell, median (mean) | 30 min (65 min); one in ten lasts over 170 min | not reported | — |
| Alone: feeding in a crown / resting / on a trip to a tree / travelling to a caller | 35% / 27% / 9% / 4% and 33% / 25% / 10% / 3% | — | — |
| Own-community pant-hoots heard while alone | 4.4 / 4.8 per hour, from a median of 455–467 m | males give 0.5–1.5 pant-hoots per hour | T-COM-1 (mitaniNishida1993, wilson2007) |
| of those, approached within 5 min | 7.5% / 5.6% | not reported; pant-hoots serve to keep contact with, and recruit, allies and associates | mitaniNishida1993 (indexed summary) |
| approached when the caller is an ally | 9.8% / 7.5% | allies are recruited more often to joint travel | gruberZuberbuhler2013 |
| in the caller's party within 30 min | 7.1% / 6.8% | not reported | — |
| Company gained by the animal's own move | 56% / 56%: a trip to a tree 37–43%, travel to a caller 26–30%, a trip to water 17% | not reported | — |

- A lone animal hears a community pant-hoot every 13 minutes and answers one in fifteen. The pull toward a caller is its unmet social need, which builds at 0.035 per hour (design), minus the distance. At the usual 450 m that leaves almost nothing.

## 2. The other half of fission

Partings in which the leaver moved (53–56% of all; the rest are the same events seen by the one left behind):

| The leaver was on | Seed 48 | Seed 7 | Covered by `departPersist` |
| --- | --- | --- | --- |
| A trip to water | 40% | 43% | no |
| Travel to a pant-hoot caller | 23% | 21% | no |
| An own trip to a tree | 22% | 24% | yes (these are attempts that went ahead: unjoined after 13 min, or with companions out of the audience) |
| Someone else's trip to a tree | 10% | 7% | not a departure of its own |
| Other | 5% | 5% | — |

- **Two thirds of the remaining own-move partings are uncovered: trips to water and to callers.**
- A trip to water cannot be shared at all today. Companions are not alerted, and the party-follow option only reads companions who `travel` or `follow`, not one who walks to water.

## 3. The change

Field profile only; each part behind its own switch; both off is `main` f24c9ae, hash-identical.

### 3.1 `departPersistAll`: every own departure is an attempt

- The departure-attempt rule of `departPersist` (stand and check for 1 min, give up if unjoined, re-launch after 3.8 min, leave alone after 13 min) also applies to an own trip to water that lies beyond the party link, and to travel to a pant-hoot caller.
- Companions notice a departure to water as they notice any other, and may follow the animal walking to water with the existing party-follow option.
- Sourced [M]: the source's travel event is any locomotion of 10 m or more between two non-locomotion activities, and its recruitment, waiting and re-launching are about such events (gruberZuberbuhler2013). Design: that companions can follow to water with the same weights as any other departure.
- No new magnitude.

### 3.1a `fruitWaterRelief`: water from fruit (added before any run of the changed model, at the integrator's request)

- **Measured** (`drink-probe.ts`, `main` f24c9ae, seeds 48 and 7, 20 days, animals of 5 y or more): 2.2 trips to water and 1.3–1.4 drinks per animal per day; 0.11–0.12 drinks per daylight hour; 28 min a day on water trips, 230 m each.
- **Field:** about 0.005–0.010 observed drinks per individual per hour of observation at Kanyawara, or one every 8–17 days; chimpanzees are not obliged to drink daily, because food supplies water (mackenzie2025).
- **So the model drinks 11–24 times too often.** The water share of partings in §2 is an artifact of that.
- **Change:** with `fruitWaterRelief` above 0, a fruit unit eaten relieves that much thirst, in place of `fruitThirstFactor` (0.55 in the field, tuned in C5a against the travel share and the day range, not against drinking). Its own switch and ablation row; 0 is today's model.
- **Fitted to the sourced rate**, not to any target row: bisection between 0.55 and 2.0, at most 6 steps, each step the drinking probe on seeds 48 and 7 (30-day burn-in + 20 days, `departPersistAll` on, `joinLoneW` 0), reading only drinks per daylight hour. Target 0.0075 per hour, accepted inside 0.005–0.010. The field figure is a lower bound, so the fit aims at its middle rather than below it.
- **The `joinLoneW` fit of §4 runs with this correction on.** Party size is reported for both arms (correction on and off).
- Predictions for the correction alone (untuned rows): time on water trips from 28 min to under 3 min a day; T-ACT-2 from 0.195 to 0.16–0.19 and T-RNG-4 from 2.59 to 2.1–2.5 km (water trips are about 0.5 km a day now; both rows were tuned in C5a with thirst as it was, and both must stay in band: guard G2); T-PTY-1 from 2.86 to 3.0–3.3 with `departPersistAll` on and `joinLoneW` 0; own-move partings on a trip to water under 5%.

### 3.2 `joinLoneW`: a lone animal answers community pant-hoots

- For an animal with no companion of 12 y or more within the party link, the pull toward an own-community pant-hoot caller gains `joinLoneW` + `joinBondW` × its bond with the caller.
- Sourced [M] for direction: pant-hoots keep contact with and recruit allies and associates (mitaniNishida1993); allies are recruited more (gruberZuberbuhler2013). `joinBondW` (0.5) is the existing C13e weight of a bond in joining a leader.
- **`joinLoneW` is fitted**: no source gives how readily a lone animal answers. It is the one fitted parameter, against T-PTY-1 alone (§4).

## 4. Pre-registration

**Fitted:** `fruitWaterRelief` to the sourced drinking rate (§3.1a), first. Then `joinLoneW`, by bisection between 0 and 0.8, at most 5 steps, with `departPersistAll` and the water correction on; if T-PTY-1 is already 3.35 or more at `joinLoneW` 0, it stays 0. Each step is one observer run (field, seeds 48 and 7, 30-day burn-in + 60 days) read through a script that prints only T-PTY-1. Target: pooled T-PTY-1 = 3.5 ± 0.15 (the target pre-registered for the earlier cohesion re-fit). If 0.8 does not reach 3.35 the fit stops there, reported as not reached, and `joinLoneW` is set to the largest value that passes the guard, or to 0. T-PTY-1 stays fitted and labelled tuned.

**Untuned:** everything else. Nothing is changed after T-PTY-2, -3 or -4 are seen.

**Conflict noted.** T-PTY-4 (female time alone, held out, compromised) is 0.51 against 0.15–0.45. More cohesion moves it toward its band. It is not read by the fit and is reported before and after.

**Checks** (field, seeds 48 and 7, all three switches on at the fitted values against all off, at most 2 processes; plus one observer run with only the water correction off, for the party size of that arm): 30-day burn-in + 60 days; then 30 + 180 days if the guard passes.

**Guard (merge gate).**
- G1: all three off reproduce `main` f24c9ae (hash); the compressed goldens do not move.
- G2: T-ACT-1 (0.33–0.5), T-ACT-2 (0.12–0.25), T-ACT-3, T-ACT-4 and T-RNG-4 (1.5–3.5 km) stay in band with the change on.
- G3: median hunger of adults and of lactating females at most 0.03 above the off arm, read by `party-truth.ts` (15-min daylight samples of animals of 15 y or more); no starvation death the off arm lacks.
- G4: company gained per solitary hour is higher on than off in each seed, and own-move partings by trips to water are a smaller share on than off in each seed (`fusion-probe.ts`).
- G5: hooed attempts that recruit, per attempt, stay within 0.71 ± 0.05 (C13e fitted row; `visit-probe.ts`).

**Predictions (pass or fail reported; not a gate).** "Now" is `main` f24c9ae over 6 months unless a 20-day probe is named.

| Quantity | Now | Predicted on | Role |
| --- | --- | --- | --- |
| T-PTY-1 | 2.86 | 3.35–3.65 | fitted here |
| Time alone, animals of 12 y or more (probe) | 0.48–0.50 | 0.33–0.43 | untuned |
| Company gained per solitary hour (probe) | 0.56–0.59 | 0.75–1.0 | untuned |
| A pair still together after 60 min | 0.62–0.63 | 0.66–0.74 | untuned |
| T-PTY-4, female time alone | 0.509 | 0.38–0.47 | held out, untuned |
| T-RNG-4, day range | 2.59 km | 2.6–3.1 km | fitted row, guard |
| T-ACT-1 / T-ACT-2 | 0.425 / 0.195 | 0.40–0.43 / 0.20–0.24 | fitted rows, guard |
| Adult median hunger | 0.41–0.43 | +0.00 to +0.03 | guard |
| Lone animals approaching a pant-hoot heard | 6–7% | 15–35% | untuned |
| Own-move partings on a trip to water | 40–43% | 15–30% | untuned |
| T-PTY-2, patch R² (6 months) | 0.010 | unchanged, 0.00–0.03 | held out, untuned |
| T-FOOD-6 (6 months) | 7.5 d | unchanged, 6.5–8.5 d | held out, untuned |

Also reported, untuned: the C13e rows (called, silent, ratio), T-PTY-3, and the truth patrol reads (count per community-week, share reaching 3 adult males, males per patrol), since C14 fitted the patrol rate.

**What these runs cannot resolve.** T-RNG-1 (annual range), demography, and whether the fitted weight holds on other seeds.
