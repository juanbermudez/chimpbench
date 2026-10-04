# E4h pre-registration: how far a fight goes (contest assessment in place of the escalation, hit and support dice)

Status: skeleton committed in the stage's first 15 minutes (3 October 2026, branch `e4h-contests`, from `track-e`
37a2042, 311c11b); diagnosis, sources, field rows, mechanism, readouts, predictions and kill criterion written and
committed before any run of the switch on (this revision). Track E, stage E4, piece h. Patrols, hunting, gang attacks on
strangers and infanticide are not touched.

Rule served: field values of behaviour are targets, never inputs. No escalation, hit, injury or support probability is
set from a field value or tuned to hit a rate.

## 1. The dice in question (S9, `src/sim/conflict.ts` at 37a2042)

| Die | Where | Registry entry (class) | Decides |
| --- | --- | --- | --- |
| Escalation of a counter-charge to contact | `resolveCharge`, conflict.ts:133 | `escalationBaseP` 0.08, `escalationEvenP` 0.3 (outcome-encoding, probability), `escalationEvenExp` 4 (design) | whether two animals that charge each other fight |
| A hit when a target gives way within `hitRangeM` | `resolveCharge`, conflict.ts:124 | `hitP` 0.12 (outcome-encoding, probability) | whether a charge makes contact |
| A serious wound in a fight | `resolveFight`, conflict.ts:164 | `seriousInjuryP` 0.05 (outcome-encoding, probability) | whether a fight wounds badly |
| Support for the aggressor (bonded member or kin; against a stranger) | `notifyAllies`, conflict.ts:41 | `coalitionBondP` 0.5 × bond, `coalitionStrangerP` 0.8 (outcome-encoding, probability) | whether an ally may join |
| Support for the victim | `notifyAllies`, conflict.ts:44 | `coalitionBondP` 0.5 × bond | whether an ally may join |

Unregistered literals in the same paths (not counted by the ledger): the hit's wound `0.01 + U·0.04` (conflict.ts:126),
the winner's light wound `random < 0.2` (conflict.ts:165, excused by the ledger as an injury outcome), death at injury ≥
0.98 `random < 0.1` (conflict.ts:171, excused as mortality). Who wins (`contest`, conflict.ts:103, a draw on relative
power) is the contest's outcome, not one of the six; it stays.

## 2. Diagnosis (S9, quick: seeds 48 and 7, 30-day burn-in + 30 days, simulation truth)

Tool: `scripts/contest-diagnose.ts` (committed dca1ce9, 7774a7a, 7921a32) reads every contest through a hook in
conflict.ts (`contestTrace`, null in every simulation; it draws and writes nothing: S9 seed 48 after 8 days hashes
identical to 37a2042, 422bb3edd2db147e). Run on the reference and its three re-draws (`rgTemperature` 0.1641, 0.1639,
0.16405), from a frozen checkout. Table printed by `e4h_diag.py` (scratch) from the JSON; see §2.1 for the block.

### 2.1 What the dice decide (numbers per run: S9q / S9q1 / S9q2 / S9q3)

Printed by `e4h_diag.py` from `contest-diagnose` JSON (7921a32, the readout version of §5; switch off, so the worlds are
S9's own). Wounds on the hit path are below 0.05 by construction (an earlier version rounded 0.0499 up; corrected).

```
runs: ['S9q', 'S9q1', 'S9q2', 'S9q3']
adult-male days per run: 840 / 822 / 840 / 840 ; adult-male dyad-days: 1800 / 1764 / 1800 / 1800
  decided          1562 / 1133 / 1499 / 1266
  charges          1561 / 1133 / 1499 / 1266
  counters         2 / 11 / 5 / 16
  escalatedByDie   0 / 2 / 2 / 7
  fights           1 / 2 / 2 / 7
  hits             100 / 76 / 83 / 73
  contacts         101 / 78 / 85 / 80
  injuries         1 / 2 / 2 / 8
  serious          0 / 0 / 0 / 0
  takeovers        0 / 0 / 0 / 0
  coalitionJoins   96 / 113 / 103 / 109
  alphaChanges     0 / 1 / 0 / 0
  orderSwaps       2 / 1 / 1 / 7
per adult male-day:
  conflicts        1.627 / 1.262 / 1.560 / 1.220
  conflictsWithAM  1.055 / 0.851 / 1.051 / 0.826
  contacts         0.104 / 0.079 / 0.088 / 0.070
  fights           0.002 / 0.002 / 0.005 / 0.015
  escalationsByDie 0.000 / 0.002 / 0.005 / 0.013
  injuries         0.001 / 0.001 / 0.002 / 0.008
adult-male dyads: conflicts per dyad-day 0.267 / 0.192 / 0.237 / 0.184 ; dyads with a conflict 53 / 48 / 49 / 48

THE DICE (draws and outcomes per run)
  escalation die: counter-charges (draws) 2 / 11 / 5 / 16 | escalated 0 / 2 / 2 / 7 | mean p 0.291 / 0.252 / 0.263 / 0.296
  hit die: give-ways 970 / 684 / 896 / 758 | in range (draws) 876 / 596 / 808 / 680 | hits 100 / 76 / 83 / 73
  hits as share of all contact: 0.990 / 0.974 / 0.976 / 0.912 | contact share of decided conflicts: 0.065 / 0.069 / 0.057 / 0.063
  serious die: fights (draws) 1 / 2 / 2 / 7 | serious 0 / 0 / 0 / 0 | deaths 0 / 0 / 0 / 0
  ally die: draws 1200 / 1392 / 1435 / 1376 | alerts (joined the draw) 460 / 476 / 529 / 504 | mean p 0.363 / 0.362 / 0.366 / 0.362 | coalition charges started 96 / 113 / 103 / 109 | per decided conflict 0.061 / 0.1 / 0.069 / 0.086
  ally die by side: {"aggressor": {"n": 732, "mean": 0.363}, "victim": {"n": 468, "mean": 0.415}} / {"aggressor": {"n": 760, "mean": 0.334}, "victim": {"n": 632, "mean": 0.351}} / {"aggressor": {"n": 788, "mean": 0.359}, "victim": {"n": 647, "mean": 0.38}} / {"aggressor": {"n": 781, "mean": 0.371}, "victim": {"n": 595, "mean": 0.36}}
  contest die: counter not escalated 2 / 9 / 3 / 9 | stood, contest 80 / 87 / 102 / 127 | stood, dominance 509 / 351 / 496 / 365

ATTRIBUTION (pooled over runs): decided conflicts, Elo moved, upsets, wounds >= 0.05 by the path the contest took
  gave way, no contact                                 n  2977  Elo   5813 (0.518)  upsets   0  wounds   0  serious 0
  stood ground: dominance, no die                      n  1722  Elo   2808 (0.250)  upsets   0  wounds   0  serious 0
  stood ground: contest die                            n   395  Elo    926 (0.082)  upsets   8  wounds   0  serious 0
  counter-charge, not escalated: contest die           n    22  Elo    622 (0.055)  upsets   6  wounds   0  serious 0
  gave way, hit landed (hit die)                       n   332  Elo    486 (0.043)  upsets   0  wounds   0  serious 0
  fight after the escalation die: contest die          n    10  Elo    459 (0.041)  upsets   5  wounds  10  serious 0
  fight from an attack ESCALATE: contest die           n     2  Elo    116 (0.010)  upsets   2  wounds   2  serious 0
  total Elo moved 11230

HIT DIE: hit share among caught targets that gave way, pooled, by pair and by contested resource
  AM>AM 85/870, AM>adolM 37/419, AM>AF 31/279, adolM>AF 25/217, AFlact>AF 26/198, AFlact>imm 26/174, AF>AF 18/171, adolM>AFlact 16/118, AM>adolF 12/82, AF>adolM 8/77, AFlact>adolF 9/64, AM>AFlact 10/59, AF>adolF 7/51, AFlact>AFlact 3/42, AF>imm 6/40, AM>imm 4/35, AFlact>adolM 4/21, adolM>adolF 2/17, AF>AFlact 2/10
  GUARD 104/1051, IMMIGRANT 41/343, REDIRECT 38/320, DEFEND 37/263, FEMALE_DOM 34/261, COALITION 28/244, COERCE 23/208, FEED 17/161, TENSION 8/55, COUNTER 1/31, STATUS 1/23
  strRatio: caught and hit, median 1.293; caught, not hit, median 1.287
  even: caught and hit, median 0.767; caught, not hit, median 0.776
  mass ratio charger/target: hit median 1.0 ; not hit median 1.0

RESPONSES to charges (pooled): {'gave-way': 3308, 'stood': 2117, 'counter': 34}
  by contested resource: {'COALITION': {'gave-way': 299, 'stood': 225}, 'COERCE': {'gave-way': 234, 'stood': 89}, 'COUNTER': {'gave-way': 35, 'counter': 22, 'stood': 1}, 'DEFEND': {'gave-way': 286, 'stood': 121, 'counter': 2}, 'FEED': {'gave-way': 202, 'stood': 32}, 'FEMALE_DOM': {'gave-way': 308, 'stood': 368}, 'GUARD': {'gave-way': 1108, 'stood': 812}, 'IMMIGRANT': {'gave-way': 388, 'stood': 203}, 'REDIRECT': {'gave-way': 353, 'stood': 205, 'counter': 2}, 'STATUS': {'gave-way': 27, 'stood': 17}, 'TENSION': {'stood': 44, 'gave-way': 68, 'counter': 8}}

ALLY DIE (pooled): draws 5403 alerts 1969 ; by joiner class {'AFlact': 436, 'imm': 786, 'AM': 3157, 'AF': 384, 'adolM': 503, 'adolF': 137}

FIELD READOUTS (per run)
  R1 contact share, males >= 12 y: 0.059 (66/1115) / 0.061 (56/914) / 0.053 (60/1123) / 0.057 (55/961)
  R1b contact share, all contests: 0.065 / 0.069 / 0.057 / 0.064
  R2 female-female middle   0.075 (4/53) / 0.061 (4/66) / 0.056 (4/72) / 0.093 (5/54)
  R2 female-female small    0.083 (13/157) / 0.070 (4/57) / 0.030 (4/133) / 0.098 (11/112)
  R2 male-male large        0.067 (19/285) / 0.065 (20/310) / 0.059 (19/324) / 0.040 (8/202)
  R2 male-male middle       0.057 (11/194) / 0.057 (6/106) / 0.051 (8/157) / 0.020 (2/98)
  R2 male-male small        0.053 (11/207) / 0.039 (4/102) / 0.051 (9/177) / 0.086 (16/187)
  R3 coalitionary share, males >= 12 y: 0.070 / 0.112 / 0.090 / 0.109
  R9 wounds >= 0.05 per individual-year: 0.124 / 0.251 / 0.248 / 0.993
```

### 2.2 Reading

- **Contact is the hit die.** 91–99% of all contact in a run is the 12% hit on a target that already gave way within
  1.6 m; the contact share of decided conflicts (0.057–0.069) is the die times the share of give-ways caught in range. The
  hit rate is flat over who charges whom (AM→AM 85/870, AM→imm 4/35, AF→AF 18/171) and over the contested resource (8–14%),
  and does not depend on the strength ratio or evenness (medians 1.29 and 0.77 in hit and non-hit cases alike): an
  assessment would make contact depend on the pair and the stake.
- **Fights, and with them every wound, run through the escalation die.** Counter-charges are rare (2–16 per run), the die
  escalated 11 of 34, and those fights carry 10 of the 12 wounds ≥ 0.05 in the four runs (the other 2: E4a attacks); the hit
  path's wounds are below 0.05 by construction (0.01–0.05). Injuries ≥ 0.05: 0.001–0.010 per adult male-day.
- **The serious-wound die is dormant:** 12 draws in four runs, no serious wound. Not implicated; it stays.
- **Support runs through the ally die:** 1,200–1,435 draws per run (mean p 0.36) decide which bonded or related bystanders
  may consider joining; 96–113 coalition charges follow (0.06–0.10 per decided conflict). The die ignores the joiner's own
  risk and whether its support changes the outcome; those enter only the later coalition score as a binary (dominates the
  target or not).
- **Rank change does not run through the dice.** 77% of the Elo moved follows the target's own choice to give way (52%)
  or the dominance order (25%); the contest die moves 14% (stood 8%, unescalated counters 5.5%), fights after the escalation
  die 4%, attacks 1%. No takeover; one alpha change (S9q1); 1–7 swaps in the adult-male order per run.
- **A defect decides "stood its ground".** 39% of charges end with the target neither yielding nor resisting; in S9q 465 of
  589 such charges (79%) were resolved in the very tick the target was charged, before it could answer: at run speed
  (2.5 m/s) a charge covers 37.5 m in one 15-s tick and arrives in its first execution step, while the target's interrupt
  is answered at its next decision (execution.ts:657 with onStart at execution.ts:241–262). The outcome is then decided by
  the dominance order or the contest die, without contact.

**What the dice decide that an assessment would:** whether a charge makes contact (hit die: 91–99% of contact, flat
across pairs and stakes), whether a counter-charge goes to a fight and so every wound (escalation die: 11 of 34
counter-charges, 10 of 12 wounds ≥ 0.05), and which bystanders may join (ally die: 5,403 draws, 36% pass). The serious die
draws 12 times in 240 seed-days and decides nothing measurable.

## 3. Field rows, their samples, and the rates found (sources: research.md "Addendum: E4h contests")

Rows scored by e-bench that this stage can move (all held-out unless stated):

| Row | Source and sample | Method |
| --- | --- | --- |
| T-SOC-5 male hierarchy steepness (band 0.2–0.7) | kaburuNewtonFisher2015: Sonso Dec 2003–Aug 2004, 8 adult males, 1,109.5 h (0.70); Mahale M Feb–Nov 2011, 10 adult males, 800.9 h (0.30 stable, 0.26 unstable); six values from published matrices of unstated interaction type (0.22–0.57); males only, no mass or reproductive data | all-occurrence agonism within focal parties; slope of normalized David's scores from decided contact aggression, chases and directed charging displays (pant-grunts only checked the order) |
| T-SOC-9 reconciliation (fitted, 0.08–0.22) | kutsukakeCastles2004 (Abs): Mahale M, individual corrected conciliatory tendency 14.4%; both sexes | PC–MC |
| T-SOC-10 third-party affiliation (0.1–0.3) | wittigBoesch2010: Taï 1996–1999, 18 individuals of both sexes, 164 of 876 conflicts | all-occurrence |
| T-SOC-6 pant-grunts to the top 3 males (0.6–0.9) | gilby2013: Gombe 1995–2008, 16 males ≥ 12 y | full-day focal follows |
| T-DEM-23 aggression received by immatures | sabbi2021 (Abs this pass): Kanyawara 2005–2017, 49 immatures < 9 y (25 F, 24 M) | **sealed (C8 proof row): not scored by e-bench and not computed here** |
| T-FIS-4 former associates as victims | sandelWatts2021, Ngogo (one victim) | C9 scenario only; n/a in e-bench |

Rates found (no row in data/targets.json measures them; staged in `docs/staging/e4h-targets.patch.json`, not applied):
- Contact share: Gombe males ≥ 12 y, 15.1% of 654 dyadic aggressive interactions (mouginot2024: 14 males, 7,309 focal h,
  2006–2009); Taï, 19% / 37% / 36% at large / middle / small rank difference (wittigBoesch2003b: 876 conflicts, 4 adult
  males and 10–12 adult females); Kanyawara males, attacks ≈ 8% of displays, chases and attacks (derived from
  mullerWrangham2004b and wranghamWilsonMuller2006, low confidence). Masses: not reported by any of them (adult males 39 kg,
  females 31.3 kg at Gombe, pusey2005).
- Contact rate: 0.013 contact acts per focal-male hour (Gombe, given or received; median, range 0–0.025); attacks given per
  male-hour ≈ 0.023 (median of four community-years, Kanyawara and Gombe).
- Coalitionary share of male-initiated aggression: 13.2% (Gombe; Kasekela 20.2% with 14 males ≥ 12 y, Mitumba 3.2% with 2).
- Wounds: 7–84 per community-year by site (massaro2024, intra- and intergroup), not per conflict or per individual-year.

## 4. Mechanism (switch `contestAssess`, 0 = today; committed 7921a32)

Principle: parker1974 — escalation happens only where both contestants judge it worth it (each one's chance of winning,
from relative resource-holding power, above the threshold its stake sets); outside that range the weaker withdraws after
display. A joiner weighs P(win)·b against P(lose)·c (ihara2024). Everything an animal assesses is the model's own contest
function (`winOdds`, hierarchy.ts: strength with condition and wounds, the rank edge, supporters charging nearby; the same
function decides who wins), so assessment is unbiased by construction (design).

1. **The target answers before the contest is decided (defect fix, §2.2).** A charge is resolved no earlier than its
   second tick (execution.ts, charge case). Its target, interrupted at the charge's start, has then made its decision.
2. **The target's answer reads its assessed chance** (candidates.ts `threatResponses`): within the community, y = 1 − q,
   q = its chance against its aggressor, weights the dominated values in place of binary dominance: submit 0.25 + 1.25·y,
   flee 0.2 + 1.0·y, counter-charge 0.95 − 0.9·y, so today's values hold at q = 0 and q = 1 (no new magnitude). The
   stake enters through the animal's own decision: conceding competes with the value of what it is doing.
3. **Contact only where neither side conceded** (conflict.ts `resolveCharge`; replaces `hitP`, `escalationBaseP`,
   `escalationEvenP`):
   - the target conceded (submitted, fled or pant-grunted at the charger): settled without contact;
   - the target counter-charged and the charger, challenged and having chosen again by the same assessed answer, still
     charges: a contact fight (as the die's escalation did);
   - the target neither conceded nor resisted (went on with its own act): if the charger prevails (dominance, else the
     contest) within striking range it strikes (contact), otherwise the target wins without contact.
4. **Support** (conflict.ts `notifyAllies`, candidates.ts coalition offer; replaces `coalitionBondP`, `coalitionStrangerP`):
   every bystander the existing gates admit (awake, in range, bonded or kin, age and sex) perceives the conflict and is
   alerted, no draw; one bonded to both sides is alerted for the one it values more (kin = full bond; ties: the aggressor's
   side). Joining is its own choice: the coalition charge's score keeps its bond, kin, boldness, tension and age terms and
   replaces dominance over the target (+0.25 / −0.45) with 0.25·q − 0.45·(1 − q), q the coalition's assessed odds with the
   joiner added as a supporter (ihara2024's P(win)·b − P(lose)·c with the old term's two values; bissonnette2009: outcomes
   follow the summed-strength asymmetry). Against a stranger the term stays +0.25.
5. **Wounds follow contact and mass** (design; no primate source relates a fight's damage to the fighters' masses): a
   strike's wound (0.01 + U·0.04) and a fight's wounds (loser: `fightInjuryMin` + U·`fightInjurySpan`; winner's light wound)
   scale with the striker's mass over the struck animal's (`massOf`). The draws on wound size (where a blow lands) and the
   winner's light-wound coin stay: physical spread given contact, not how often contact happens. `seriousInjuryP` stays
   (not implicated, §2.2) and stays counted.

**Draws that stay with the switch on, and why the ledger does not count them:** who wins (`contest`: a draw on the
model's contest function, the power ratio to the `contestExponent`; outcomes follow the strength asymmetry with spread,
bissonnette2009; no fixed probability); the size of a wound given contact (`fightInjuryMin` + U·`fightInjurySpan`,
0.01 + U·0.04: where a blow lands, design ranges); the winner's light wound in a fight (`random < 0.2`, a literal the
ledger excuses as an injury outcome given contact; drews1996: the winner is sometimes the one wounded); death at an injury
of 0.98 or more (mortality). `seriousInjuryP` is a counted prescription and stays counted.

Prescription ledger (`--count --params`): S9 74 → S9 + `contestAssess` 69 (the five entries above switched out through
ACTIVE_WHEN; today's model 135 → 130 with the switch alone). Switch 0 hash-identical (S9 seed 48 day 8; all-off seed 7
day 3; tests/sim-contest.test.ts).

**Known issues, deferred (file:line at 7921a32):**
- Mutual assessment against the meta-analyses: species that fight with contact mostly show self-assessment (pinto2019,
  massote2025). Not resolved here; a self-assessment variant is a candidate iteration.
- A target asleep in its nest that is charged "stands" (conflict.ts resolveCharge, stood branch): with the switch it is
  struck when the charger prevails (16 of 589 stood cases in S9q were asleep). Left as is (rare).
- The coalition alert slot holds one side (`coalA/coalB`, conflict.ts notifyAllies): a bystander cannot weigh both sides
  as options; it is alerted for the side it values more.
- `hitRangeM` (1.6 m, design) still bounds a strike.

## 5. Readouts (defined before any arm; smoke-tested on S9 with the switch off, 2 days, 7921a32)

From `contest-diagnose.ts` (simulation truth) unless stated:
- **R1 contact share, males ≥ 12 y** (mouginot2024's sample): contests (charges resolved, attacks begun) between
  individuals ≥ 12 y with a male ≥ 12 y as a party; contact = a landed hit or strike, an escalation to a fight, or a fight
  begun as an attack. The source: aggression with "physical contact between the aggressor and the victim such as hit, pull,
  bite, kick, jump-on". Also R1b over all contests.
- **R2 contact share by rank difference** (wittigBoesch2003b), same-sex ranked dyads, their cut-offs (males: neighbours
  small, two apart middle, three or more large; adult females: ≤ 3 small, 4–6 middle, > 6 large). The source: intensity
  levels "ordered according to the aggression's likelihood of injuring the partner", levels 4–5 physical contact.
- **R3 coalitionary share of male-initiated aggression** (mouginot2024): coalition charges started by males ≥ 12 y at
  community members ≥ 12 y ÷ all charges and attacks they started. The source scores aggression as coalitionary "if the
  focal-male acted together with other males in targeting an opponent".
- **R4 per adult male-day** (the brief's table): decided conflicts (each adult-male party counted), contacts, fights,
  escalations, wounds ≥ 0.05 received.
- **R5 coalition joins per decided conflict.** **R6** swaps in the hourly adult-male order; alpha changes; takeovers.
- **R7** T-SOC-5, T-SOC-9, T-SOC-10 (e-bench observer). **R8** deaths by cause; viability (e-bench); nursing mothers' and
  juveniles' reserves, % of the store per day (energy-diagnose, OLS as the integrator's judge scripts).
- **R9** wounds ≥ 0.05 per individual-year (context only; massaro2024 counts every visible wound, intergroup included).

## 6. Arm, predictions and kill criterion

**Arm A1** = S9 + `contestAssess` 1, quick (seeds 48, 7; 30 + 30 days): `e-bench --quick`, `energy-diagnose`,
`contest-diagnose`, from a frozen detached checkout of the commit that adds this text. Judged by docs/staging/e-noise.md
amendment 2 against the four S9 quick realizations (`judge_vs_reps.py quick custom`), with and without T-HUN-4 and T-BRD-1
(and without T-IGE-3); readouts against the reference's mean ± SD (`e4h_table.py`).

| Quantity | S9 reference (diagnosis) | Prediction for A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 74 | 69 | high |
| Viability; deaths from fights | pass; 0 | pass; 0 | moderate |
| Charges ending "stood" (no concession, no resistance) | 39% | < 15% | high |
| R1b contact share, all contests | 0.057–0.069 | 0.05–0.15 | low |
| R1 contact share, males ≥ 12 y | (§2.1) | 0.05–0.20 | low |
| R2 male–male: contact at small rank difference ≥ at large | not tested | holds | low |
| Counter-charges per run | 2–16 | up (the assessed answer lets closely matched targets resist) | moderate |
| Fights and wounds ≥ 0.05 per adult male-day | 0.002–0.015; 0.001–0.010 | up, wounds ≤ 0.05 per adult male-day | moderate |
| R5 coalition joins per decided conflict | 0.06–0.10 | 0.10–0.30 (offers to every eligible bystander) | moderate |
| R3 coalitionary share, males ≥ 12 y | (§2.1) | up | moderate |
| R6 rank swaps; alpha changes | 1–7; 0–1 | inside 0–10; 0–1 | low |
| T-SOC-5 | 0.19–0.52 (four runs) | inside 0.15–0.60 | low |
| Fitted; held-out with and without T-HUN-4 and T-BRD-1 | group mean | inside noise (\|z\| ≤ 2) | moderate |
| Nursing mothers' and juveniles' reserves | group mean | within 2 SD of the group | low |

**Kill criterion (the switch stays off and the result is recorded as a null)** if any holds: viability fails; any death
from a within-community fight that the reference group does not have; held-out up beyond noise (z > 2) with or without the
rare rows; contact share of all contests above 0.74 or below 0.016 (twice the highest field value, a fifth of the lowest);
wounds ≥ 0.05 above 0.05 per adult male-day (5 × the reference's highest run).

**Keep rule (standard):** viability passes; held-out not up beyond noise with and without the rare rows; prescriptions
fall (69 < 74).

## 7. Iterations

At most three, each changing the mechanism from first principles, logged here and committed before its run. No weight is
tuned to a behavioural rate. A miss is a finding.

### A1 result (f0ff48c, clean; one arm; full tables in §8)

Keep rule passed as registered (sums inside noise: fitted z −0.5, held-out +1.1, without the rare rows −0.2; viability
passes, no death; prescriptions 69); no kill criterion met. Readouts moved far: contact share 0.063 ± 0.005 → 0.170, coalition
joins per conflict 0.079 ± 0.017 → 0.275, wounds ≥ 0.05 per individual-year 0.40 ± 0.40 → 5.34. **A defect in the
mechanism under test explains much of it:** of the 354 charges that ended "stood", 105 met a target submitting (and 28
fleeing or pant-grunting) to *another* aggressor of the same conflict, mostly the primary aggressor of a coalition charge
(116 of the 354 were coalition charges): §4.3 counted a concession only toward the charger, so a joiner struck a target that
had already given up to the coalition. Contact and wounds are inflated by it.

### Iteration 1 (written after A1, before its run): a concession to any aggressor of the conflict ends it

*Change (one, from first principles; parker1974: a contestant that gives up ends the contest):* with `contestAssess` a
target that submits to, flees from or pant-grunts at an animal that is charging or attacking it has conceded, whichever of
its aggressors it faces (conflict.ts `yieldsToAggressor`); the contest is settled without contact as for a concession to the
charger. Nothing else changes; no new parameter; switch 0 still hash-identical (S9 seed 48 day 8 422bb3edd2db147e).
*Arm A2* = A1's parameters at the commit that adds this text, same settings and judgement.
*Expected (against A1; low confidence on sizes):* stood share of charges 0.229 → below 0.17; contact share of all contests
0.170 → 0.08–0.14, males ≥ 12 y likewise; wounds ≥ 0.05 per individual-year 5.3 → below 3; coalition joins per conflict
unchanged within ± 0.05 (alerts and scores untouched); male–male contact at a small rank difference still above large;
sums inside noise; prescriptions 69. Readout added before the run (the diagnosis script, not the world): coalition types of
ranked males (conservative / bridging / revolutionary by the joiner's and partner's dominance over the target; ihara2024
Table 1: Taï 1 / 4 / 8, Mahale 6 / 8 / 5), reported, not judged.

## 8. Results

*pending*
