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


### A2 result (iteration 1; ca17a1f, clean; tables in §8.2)

Keep rule passed (fitted z −0.9, held-out −1.1, without the rare rows −1.9; viable, no death; 69). Against the
predictions: stood 0.188 (predicted below 0.17: missed narrowly); contact share 0.129 (0.08–0.14: held), males ≥ 12 y
0.129; male–male contact at a small rank difference 0.209 above large 0.100 (held); wounds ≥ 0.05 per individual-year 5.34
(below 3: missed); coalition joins per conflict 0.363 (A1 ± 0.05: missed, up); prescriptions 69 (held). Beyond the
reference's spread with no e-bench row: coalitionary share of males' aggression 0.266 (S9 0.095 ± 0.019; Gombe 0.132,
Kasekela 0.202 with 14 males), 31 swaps in the adult-male order (S9 2.75 ± 2.87), 62 upsets (30 in coalition charges), one
alpha change by takeover. Coalition types of ranked males (conservative / bridging / revolutionary): S9q 28 /
5 / 2, A2 90 / 67 / 15 (ihara2024: Taï 1 / 4 / 8, Mahale 6 / 8 / 5).

### Iteration 2 (written after A2, before its run): the value of joining is the difference it makes

*Finding that motivates it:* with every eligible bystander alerted, the joining decision alone sets support, and §4.4
scored the outcome by the coalition's odds q1 (ihara2024's P(win)·b). That counts a win the partner gets anyway as a gain
of joining, so support piles onto contests the aggressor wins alone: conservative coalitions (both above the target) were
the commonest type (S9q 80%, A2 52%; chimpanzees: Taï 1 of 13, Mahale 6 of 19), and joins per conflict rose to 0.36.
*Change (one, from first principles: an option is worth the difference it makes against not taking it):* the outcome term
becomes 0.25·(q1 − q0) − 0.45·(1 − q1), q0 the partner's odds without the joiner, q1 with it; the joiner's own risk is
unchanged; the bond, kin, boldness, tension and age terms are unchanged. No new magnitude (the old term's 0.25 and 0.45),
no parameter; switch 0 hash-identical (S9 seed 48 day 8 422bb3edd2db147e).
*Arm A3* = A2's parameters at the commit that adds this text, same settings and judgement.
*Expected (against A2; low confidence on sizes):* coalition joins per conflict 0.363 → 0.12–0.25; conservative share of
male coalitions 0.52 → below 0.35; coalitionary share of males' aggression 0.266 → 0.10–0.20; upsets in coalition charges
and order swaps down (low); contact share 0.08–0.15; sums inside noise; prescriptions 69; viability passes.


### A3 result (iteration 2; 9db2cbb, clean; tables in §8.3)

Keep rule passed (fitted z −0.3, held-out −0.2, without the rare rows −1.0; viable, no death; 69); T-SOC-10 and T-SOC-3 back
in band. Against the predictions: coalition joins per conflict 0.240 (0.12–0.25: held); coalitionary share of males'
aggression 0.174 (0.10–0.20: held; Gombe 0.132, Kasekela 0.202); conservative share of male coalitions 37 of
66 (below 0.35: missed; types 37 / 19 / 10); contact share 0.111 (0.08–0.15: held), male–male
contact at a small rank difference 0.262 against 0.073 at a large one; prescriptions 69 (held). **New problem:** six alpha
changes in one community in 30 days (S9 0.25 ± 0.5 per run) and 14 swaps in the adult-male order: on seed 48 the alpha
lost 17 decided conflicts (615 Elo), 6 of them by giving way to a mate-guarding male and 4 to coalitions. The cause is §4.2:
the answer read rank only through the contest function's incumbency edge (0.2 × tanh(ΔElo / 400)), so an alpha weaker than
a challenger, or facing his supporters, submits as a stranger would; the binary dominance it replaced carried the
relationship's inertia. Over a year this would drive T-SOC-7 (alpha tenure, fitted) far below its band.

### Iteration 3 (written after A3, before its run): the remembered dominance relationship is the assessment's prior

*Change (one, from first principles: assessment accumulates evidence, enquistLeimar1983, and a dominance relationship is
the record of past contests):* where the two keep a dominance relationship (same sex, both ranked: where Elo is updated) a
threatened animal's assessed chance is the Elo expected score of the relationship (`eloLogisticScale`, as `eloUpdate`)
plus the present cues, log-odds on log-odds: logit q = 0.01·ΔElo + 3·ln(P_self ÷ P_aggressor), the powers from strength
with condition and wounds and the supporters on each side, without the contest function's rank edge (rank enters once,
through the memory). Other pairs (across sexes, unranked) keep the contest function. Used only in the answer (§4.2); the
coalition odds and who wins are unchanged. No new magnitude (`eloLogisticScale`, `contestExponent`, `powerAllyWeight`);
switch 0 hash-identical (S9 seed 48 day 8 422bb3edd2db147e).
*Arm A4* = A3's parameters at the commit that adds this text, same settings and judgement.
*Expected (against A3; low confidence on sizes):* alpha changes 0–1 per run and swaps in the adult-male order ≤ 7 (inside
the reference's range); upsets fewer than A3's; contact share 0.06–0.15 with male–male contact at a small rank difference
still above large; coalition joins per conflict 0.12–0.30; sums inside noise; prescriptions 69; viability passes.


### A4 result (iteration 3; d656c0d, clean; tables in §8.4)

Keep rule passed (fitted z −1.0, held-out −0.2, without the rare rows +0.6, without T-HUN-4, T-BRD-1 and T-IGE-3 +0.6;
viable, no death; prescriptions 69). Against the predictions: alpha changes 0 and 6 swaps in the adult-male order (inside
the reference's range: held); contact share 0.097 (0.06–0.15: held), males ≥ 12 y 0.101; male–male contact 0.151 / 0.127 /
0.035 at a small / middle / large rank difference (small above large: held; the reference was flat, 0.057 / 0.046 / 0.058);
coalition joins per conflict 0.241 (0.12–0.30: held); prescriptions 69 and viability (held). Not predicted: wounds ≥ 0.05 per
individual-year 2.86 (S9 0.40 ± 0.40), coalition types 43 / 15 / 11 (conservative still the commonest).

### Verdict

**`contestAssess` (iterations 1–3): a provisional keep candidate, recommended for a 5-seed confirm on S9.** It removes five
counted prescriptions (S9 74 → 69: `hitP`, `escalationBaseP`, `escalationEvenP`, `coalitionBondP`, `coalitionStrangerP`),
every sum stays inside noise in all four arms, viability passes with no death, and three things the dice could not do now
emerge: contact follows from whether either side conceded (0.063 → 0.097 of contests; field 0.15 for Gombe males, 0.19–0.37
at Taï), it rises as the rank difference shrinks (wittigBoesch2003b's direction; flat under the dice), and support follows
each bystander's own choice (coalitionary share of males' aggression 0.095 → 0.165; Gombe 0.132, Kasekela 0.202). It also
fixes a defect the dice hid (39% of charges decided before their target could answer). Costs and open problems: wounds of
0.05 or more are seven times the reference's (mass-scaled strikes on smaller animals; the model's injury scale has no
field anchor per contact), and conservative coalitions stay the commonest type (62% of male coalitions; Taï 1 of 13,
Mahale 6 of 19): a joiner gains no rank from a coalition win (Elo moves only between the primary pair), so nothing makes
bridging or revolutionary support worth more. One realization per arm: every reading is provisional until the confirm.

## 8. Results

Every number below is printed by `e4h_results.sh` (scratch: `judge_vs_reps.py quick custom` against the four S9 quick
realizations at bench-run 2bcbd33, then `e4h_table.py` over the e-bench, energy-diagnose and contest-diagnose JSON; the
reference's contest readouts from the 7921a32 diagnosis, switch off).

### 8.1 A1 (S9 + contestAssess, f0ff48c, clean)

```
A1.json commit f0ff48c dirty 0 prescriptions 69 viability True deaths [{}, {}]
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.96, 2.56, 1.94, 3.91 (mean 2.59, sd 0.92; used 0.92) | A1.json: 2.04, Δ -0.55, z -0.5 (inside noise)
  held-out           (13 rows) ref 5.57, 5.02, 5.49, 4.15 (mean 5.06, sd 0.65; used 1.26) | A1.json: 6.55, Δ +1.50, z +1.1 (inside noise)
  held-out w/o rare  (12 rows) ref 4.91, 4.39, 4.83, 3.91 (mean 4.51, sd 0.46; used 0.48) | A1.json: 4.39, Δ -0.12, z -0.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-1   fitted   ref 0.94±0.35 | A1.json 0.23 (inconclusive)
   T-HUN-4   held-out ref 0.55±0.20 | A1.json 2.16 (fail)
   T-SOC-10  held-out ref 0.00±0.00 | A1.json 0.13 (fail)
   T-SOC-3   held-out ref 0.01±0.03 | A1.json 0.19 (fail)
held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.91 / 4.39 / 4.83 / 3.91 (mean 4.51, sd 0.46; used 0.48); A1.json 4.39 (z -0.2)
T-SOC-5: S9 0.519 / 0.190 / 0.464 / 0.288 | A1.json 0.470 (pass)
T-SOC-9: S9 0.186 / 0.144 / 0.260 / 0.068 | A1.json 0.155 (pass)
T-SOC-10: S9 0.237 / 0.223 / 0.298 / 0.301 | A1.json 0.325 (fail)
T-SOC-6: S9 0.485 / 0.403 / 0.420 / 0.432 | A1.json 0.408 (fail)
T-ACT-1: S9 0.379 / 0.368 / 0.365 / 0.370 | A1.json 0.371 (pass)
T-ACT-2: S9 0.166 / 0.162 / 0.176 / 0.188 | A1.json 0.175 (pass)
T-ACT-3: S9 0.101 / 0.100 / 0.095 / 0.094 | A1.json 0.088 (fail)
T-ACT-4: S9 0.396 / 0.376 / 0.391 / 0.400 | A1.json 0.384 (pass)
T-PTY-1: S9 4.096 / 3.938 / 3.861 / 3.942 | A1.json 3.869 (pass)
T-HUN-1: S9 37.896 / 43.641 / 39.891 / 53.852 | A1.json 29.595 (inconclusive)
| Readout | S9q / S9q1 / S9q2 / S9q3 | S9 mean ± SD | A1 |
| --- | --- | --- | --- |
| conflicts / AM-day | 1.627 / 1.262 / 1.560 / 1.220 | 1.417 ± 0.206 | 1.636 |
| contacts / AM-day | 0.104 / 0.079 / 0.088 / 0.070 | 0.085 ± 0.014 | 0.264 |
| fights / AM-day | 0.002 / 0.002 / 0.005 / 0.015 | 0.006 ± 0.006 | 0.013 |
| escalations by the die / AM-day | 0 / 0.002 / 0.005 / 0.013 | 0.005 ± 0.006 | 0.011 |
| injuries (>= 0.05) / AM-day | 0.001 / 0.001 / 0.002 / 0.008 | 0.003 ± 0.003 | 0.007 |
| decided conflicts (n) | 1562 / 1133 / 1499 / 1266 | 1365.000 ± 200.325 | 1547 |
| contact share of conflicts | 0.065 / 0.069 / 0.057 / 0.063 | 0.063 ± 0.005 | 0.169 |
| hits (n) | 100 / 76 / 83 / 73 | 83.000 ± 12.083 | 244 |
| fights (n) | 1 / 2 / 2 / 7 | 3.000 ± 2.708 | 17 |
| counter-charges (n) | 2 / 11 / 5 / 16 | 8.500 ± 6.245 | 16 |
| injuries (n) | 1 / 2 / 2 / 8 | 3.250 ± 3.202 | 43 |
| serious (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 1 |
| coalition joins / conflict | 0.061 / 0.100 / 0.069 / 0.086 | 0.079 ± 0.017 | 0.275 |
| ally alerts drawn (n) | 1200 / 1392 / 1435 / 1376 | 1350.750 ± 103.542 | 1160 |
| rank swaps, adult males (n) | 2 / 1 / 1 / 7 | 2.750 ± 2.872 | 11 |
| alpha changes (n) | 0 / 1 / 0 / 0 | 0.250 ± 0.500 | 0 |
| takeovers (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 0 |
| Elo moved through a die (share) | 0.099 / 0.168 / 0.073 / 0.344 | 0.171 ± 0.122 | 0.310 |
| deaths (n) | 0 / 2 / 0 / 0 | 0.500 ± 1.000 | 0 |
| deaths by cause | none / respiratory illness (outbreak) 2 / none / none | — | none |
| R1 contact share, males >= 12 y | 0.059 / 0.061 / 0.053 / 0.057 | 0.057 ± 0.003 | 0.179 |
| R1b contact share, all contests | 0.065 / 0.069 / 0.057 / 0.064 | 0.064 ± 0.005 | 0.170 |
| R2 female-female middle | 0.075 / 0.061 / 0.056 / 0.093 | 0.071 ± 0.017 | 0.155 |
| R2 female-female small | 0.083 / 0.070 / 0.030 / 0.098 | 0.070 ± 0.029 | 0.144 |
| R2 male-male large | 0.067 / 0.065 / 0.059 / 0.040 | 0.058 ± 0.012 | 0.181 |
| R2 male-male middle | 0.057 / 0.057 / 0.051 / 0.020 | 0.046 ± 0.018 | 0.087 |
| R2 male-male small | 0.053 / 0.039 / 0.051 / 0.086 | 0.057 ± 0.020 | 0.261 |
| R2 female-female middle (n) | 53 / 66 / 72 / 54 | 61.250 ± 9.287 | 58 |
| R2 female-female small (n) | 157 / 57 / 133 / 112 | 114.750 ± 42.664 | 188 |
| R2 male-male large (n) | 285 / 310 / 324 / 202 | 280.250 ± 54.604 | 270 |
| R2 male-male middle (n) | 194 / 106 / 157 / 98 | 138.750 ± 45.162 | 173 |
| R2 male-male small (n) | 207 / 102 / 177 / 187 | 168.250 ± 45.894 | 180 |
| R3 coalitionary share, males >= 12 y | 0.070 / 0.112 / 0.090 / 0.109 | 0.095 ± 0.019 | 0.206 |
| R9 wounds per individual-year | 0.124 / 0.251 / 0.248 / 0.993 | 0.404 ± 0.397 | 5.338 |
| stood share of charges | 0.377 / 0.387 / 0.399 / 0.389 | 0.388 ± 0.009 | 0.229 |
| T-SOC-5 | 0.519 / 0.190 / 0.464 / 0.288 | 0.365 ± 0.153 | 0.470 |
| T-SOC-9 | 0.186 / 0.144 / 0.260 / 0.068 | 0.164 ± 0.080 | 0.155 |
| T-SOC-10 | 0.237 / 0.223 / 0.298 / 0.301 | 0.265 ± 0.041 | 0.325 |
| T-DEM-23 | sealed / sealed / sealed / sealed | — | sealed |
| prescriptions | 74 / 74 / 74 / 74 | 74.000 ± 0.000 | 69 |
| viability | pass / pass / pass / pass | — | pass |
| reserves %/day, female, lactating | 0.001 / -0.007 / 0.007 / -0.008 | -0.002 ± 0.007 | 0.001 |
| reserves %/day, juvenile 5–12 y | -0.029 / 0.001 / -0.013 / -0.015 | -0.014 ± 0.012 | -0.034 |
| deaths (energy run) | {} / {'respiratory illness (outbreak)': 2} / {} / {} | — | {} |
```

### 8.2 A2 (iteration 1, ca17a1f, clean), beside A1

```
A1.json commit f0ff48c dirty 0 prescriptions 69 viability True deaths [{}, {}]
A2.json commit ca17a1f dirty 0 prescriptions 69 viability True deaths [{}, {}]
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.96, 2.56, 1.94, 3.91 (mean 2.59, sd 0.92; used 0.92) | A1.json: 2.04, Δ -0.55, z -0.5 (inside noise) | A2.json: 1.71, Δ -0.88, z -0.9 (inside noise)
  held-out           (13 rows) ref 5.57, 5.02, 5.49, 4.15 (mean 5.06, sd 0.65; used 1.26) | A1.json: 6.55, Δ +1.50, z +1.1 (inside noise) | A2.json: 3.50, Δ -1.56, z -1.1 (inside noise)
  held-out w/o rare  (12 rows) ref 4.91, 4.39, 4.83, 3.91 (mean 4.51, sd 0.46; used 0.48) | A1.json: 4.39, Δ -0.12, z -0.2 (inside noise) | A2.json: 3.50, Δ -1.01, z -1.9 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-1   fitted   ref 0.94±0.35 | A1.json 0.23 (inconclusive) | A2.json 0.33 (inconclusive)
   T-HUN-4   held-out ref 0.55±0.20 | A1.json 2.16 (fail) | A2.json 0.00 (pass)
   T-RNG-5   held-out ref 1.02±0.45 | A1.json 0.56 (fail) | A2.json 0.00 (pass)
   T-SOC-10  held-out ref 0.00±0.00 | A1.json 0.13 (fail) | A2.json 0.09 (fail)
   T-SOC-3   held-out ref 0.01±0.03 | A1.json 0.19 (fail) | A2.json 0.03 (fail)
held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.91 / 4.39 / 4.83 / 3.91 (mean 4.51, sd 0.46; used 0.48); A1.json 4.39 (z -0.2); A2.json 3.50 (z -1.9)
T-SOC-5: S9 0.519 / 0.190 / 0.464 / 0.288 | A1.json 0.470 (pass) | A2.json 0.405 (pass)
T-SOC-9: S9 0.186 / 0.144 / 0.260 / 0.068 | A1.json 0.155 (pass) | A2.json 0.146 (pass)
T-SOC-10: S9 0.237 / 0.223 / 0.298 / 0.301 | A1.json 0.325 (fail) | A2.json 0.318 (fail)
T-SOC-6: S9 0.485 / 0.403 / 0.420 / 0.432 | A1.json 0.408 (fail) | A2.json 0.430 (fail)
T-ACT-1: S9 0.379 / 0.368 / 0.365 / 0.370 | A1.json 0.371 (pass) | A2.json 0.369 (pass)
T-ACT-2: S9 0.166 / 0.162 / 0.176 / 0.188 | A1.json 0.175 (pass) | A2.json 0.157 (pass)
T-ACT-3: S9 0.101 / 0.100 / 0.095 / 0.094 | A1.json 0.088 (fail) | A2.json 0.111 (pass)
T-ACT-4: S9 0.396 / 0.376 / 0.391 / 0.400 | A1.json 0.384 (pass) | A2.json 0.400 (pass)
T-PTY-1: S9 4.096 / 3.938 / 3.861 / 3.942 | A1.json 3.869 (pass) | A2.json 4.256 (pass)
T-HUN-1: S9 37.896 / 43.641 / 39.891 / 53.852 | A1.json 29.595 (inconclusive) | A2.json 31.568 (inconclusive)
| Readout | S9q / S9q1 / S9q2 / S9q3 | S9 mean ± SD | A1 | A2 |
| --- | --- | --- | --- | --- |
| conflicts / AM-day | 1.627 / 1.262 / 1.560 / 1.220 | 1.417 ± 0.206 | 1.636 | 2.110 |
| contacts / AM-day | 0.104 / 0.079 / 0.088 / 0.070 | 0.085 ± 0.014 | 0.264 | 0.282 |
| fights / AM-day | 0.002 / 0.002 / 0.005 / 0.015 | 0.006 ± 0.006 | 0.013 | 0.039 |
| escalations by the die / AM-day | 0 / 0.002 / 0.005 / 0.013 | 0.005 ± 0.006 | 0.011 | 0.025 |
| injuries (>= 0.05) / AM-day | 0.001 / 0.001 / 0.002 / 0.008 | 0.003 ± 0.003 | 0.007 | 0.021 |
| decided conflicts (n) | 1562 / 1133 / 1499 / 1266 | 1365.000 ± 200.325 | 1547 | 1800 |
| contact share of conflicts | 0.065 / 0.069 / 0.057 / 0.063 | 0.063 ± 0.005 | 0.169 | 0.129 |
| hits (n) | 100 / 76 / 83 / 73 | 83.000 ± 12.083 | 244 | 204 |
| fights (n) | 1 / 2 / 2 / 7 | 3.000 ± 2.708 | 17 | 29 |
| counter-charges (n) | 2 / 11 / 5 / 16 | 8.500 ± 6.245 | 16 | 23 |
| injuries (n) | 1 / 2 / 2 / 8 | 3.250 ± 3.202 | 43 | 43 |
| serious (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 1 | 1 |
| coalition joins / conflict | 0.061 / 0.100 / 0.069 / 0.086 | 0.079 ± 0.017 | 0.275 | 0.363 |
| ally alerts drawn (n) | 1200 / 1392 / 1435 / 1376 | 1350.750 ± 103.542 | 1160 | 1838 |
| rank swaps, adult males (n) | 2 / 1 / 1 / 7 | 2.750 ± 2.872 | 11 | 31 |
| alpha changes (n) | 0 / 1 / 0 / 0 | 0.250 ± 0.500 | 0 | 1 |
| takeovers (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 0 | 1 |
| Elo moved through a die (share) | 0.099 / 0.168 / 0.073 / 0.344 | 0.171 ± 0.122 | 0.310 | 0.273 |
| deaths (n) | 0 / 2 / 0 / 0 | 0.500 ± 1.000 | 0 | 0 |
| deaths by cause | none / respiratory illness (outbreak) 2 / none / none | — | none | none |
| R1 contact share, males >= 12 y | 0.059 / 0.061 / 0.053 / 0.057 | 0.057 ± 0.003 | 0.179 | 0.129 |
| R1b contact share, all contests | 0.065 / 0.069 / 0.057 / 0.064 | 0.064 ± 0.005 | 0.170 | 0.129 |
| R2 female-female middle | 0.075 / 0.061 / 0.056 / 0.093 | 0.071 ± 0.017 | 0.155 | 0.056 |
| R2 female-female small | 0.083 / 0.070 / 0.030 / 0.098 | 0.070 ± 0.029 | 0.144 | 0.141 |
| R2 male-male large | 0.067 / 0.065 / 0.059 / 0.040 | 0.058 ± 0.012 | 0.181 | 0.100 |
| R2 male-male middle | 0.057 / 0.057 / 0.051 / 0.020 | 0.046 ± 0.018 | 0.087 | 0.088 |
| R2 male-male small | 0.053 / 0.039 / 0.051 / 0.086 | 0.057 ± 0.020 | 0.261 | 0.209 |
| R2 female-female middle (n) | 53 / 66 / 72 / 54 | 61.250 ± 9.287 | 58 | 54 |
| R2 female-female small (n) | 157 / 57 / 133 / 112 | 114.750 ± 42.664 | 188 | 149 |
| R2 male-male large (n) | 285 / 310 / 324 / 202 | 280.250 ± 54.604 | 270 | 391 |
| R2 male-male middle (n) | 194 / 106 / 157 / 98 | 138.750 ± 45.162 | 173 | 182 |
| R2 male-male small (n) | 207 / 102 / 177 / 187 | 168.250 ± 45.894 | 180 | 254 |
| R3 coalitionary share, males >= 12 y | 0.070 / 0.112 / 0.090 / 0.109 | 0.095 ± 0.019 | 0.206 | 0.266 |
| R9 wounds per individual-year | 0.124 / 0.251 / 0.248 / 0.993 | 0.404 ± 0.397 | 5.338 | 5.338 |
| stood share of charges | 0.377 / 0.387 / 0.399 / 0.389 | 0.388 ± 0.009 | 0.229 | 0.188 |
| T-SOC-5 | 0.519 / 0.190 / 0.464 / 0.288 | 0.365 ± 0.153 | 0.470 | 0.405 |
| T-SOC-9 | 0.186 / 0.144 / 0.260 / 0.068 | 0.164 ± 0.080 | 0.155 | 0.146 |
| T-SOC-10 | 0.237 / 0.223 / 0.298 / 0.301 | 0.265 ± 0.041 | 0.325 | 0.318 |
| T-DEM-23 | sealed / sealed / sealed / sealed | — | sealed | sealed |
| prescriptions | 74 / 74 / 74 / 74 | 74.000 ± 0.000 | 69 | 69 |
| viability | pass / pass / pass / pass | — | pass | pass |
| reserves %/day, female, lactating | 0.001 / -0.007 / 0.007 / -0.008 | -0.002 ± 0.007 | 0.001 | 0.000 |
| reserves %/day, juvenile 5–12 y | -0.029 / 0.001 / -0.013 / -0.015 | -0.014 ± 0.012 | -0.034 | 0.002 |
| deaths (energy run) | {} / {'respiratory illness (outbreak)': 2} / {} / {} | — | {} | {} |
```

### 8.3 A3 (iteration 2, 9db2cbb, clean), beside A1 and A2

```
A1.json commit f0ff48c dirty 0 prescriptions 69 viability True deaths [{}, {}]
A2.json commit ca17a1f dirty 0 prescriptions 69 viability True deaths [{}, {}]
A3.json commit 9db2cbb dirty 0 prescriptions 69 viability True deaths [{}, {}]
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.96, 2.56, 1.94, 3.91 (mean 2.59, sd 0.92; used 0.92) | A1.json: 2.04, Δ -0.55, z -0.5 (inside noise) | A2.json: 1.71, Δ -0.88, z -0.9 (inside noise) | A3.json: 2.24, Δ -0.35, z -0.3 (inside noise)
  held-out           (13 rows) ref 5.57, 5.02, 5.49, 4.15 (mean 5.06, sd 0.65; used 1.26) | A1.json: 6.55, Δ +1.50, z +1.1 (inside noise) | A2.json: 3.50, Δ -1.56, z -1.1 (inside noise) | A3.json: 4.75, Δ -0.31, z -0.2 (inside noise)
  held-out w/o rare  (12 rows) ref 4.91, 4.39, 4.83, 3.91 (mean 4.51, sd 0.46; used 0.48) | A1.json: 4.39, Δ -0.12, z -0.2 (inside noise) | A2.json: 3.50, Δ -1.01, z -1.9 (inside noise) | A3.json: 3.96, Δ -0.55, z -1.0 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-1   fitted   ref 0.94±0.35 | A1.json 0.23 (inconclusive) | A2.json 0.33 (inconclusive) | A3.json 0.74 (inconclusive)
   T-HUN-4   held-out ref 0.55±0.20 | A1.json 2.16 (fail) | A2.json 0.00 (pass) | A3.json 0.79 (fail)
   T-RNG-5   held-out ref 1.02±0.45 | A1.json 0.56 (fail) | A2.json 0.00 (pass) | A3.json 0.37 (fail)
   T-SOC-10  held-out ref 0.00±0.00 | A1.json 0.13 (fail) | A2.json 0.09 (fail) | A3.json 0.00 (pass)
   T-SOC-3   held-out ref 0.01±0.03 | A1.json 0.19 (fail) | A2.json 0.03 (fail) | A3.json 0.00 (pass)
held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.91 / 4.39 / 4.83 / 3.91 (mean 4.51, sd 0.46; used 0.48); A1.json 4.39 (z -0.2); A2.json 3.50 (z -1.9); A3.json 3.96 (z -1.0)
T-SOC-5: S9 0.519 / 0.190 / 0.464 / 0.288 | A1.json 0.470 (pass) | A2.json 0.405 (pass) | A3.json 0.307 (pass)
T-SOC-9: S9 0.186 / 0.144 / 0.260 / 0.068 | A1.json 0.155 (pass) | A2.json 0.146 (pass) | A3.json 0.187 (pass)
T-SOC-10: S9 0.237 / 0.223 / 0.298 / 0.301 | A1.json 0.325 (fail) | A2.json 0.318 (fail) | A3.json 0.249 (pass)
T-SOC-6: S9 0.485 / 0.403 / 0.420 / 0.432 | A1.json 0.408 (fail) | A2.json 0.430 (fail) | A3.json 0.423 (fail)
T-ACT-1: S9 0.379 / 0.368 / 0.365 / 0.370 | A1.json 0.371 (pass) | A2.json 0.369 (pass) | A3.json 0.373 (pass)
T-ACT-2: S9 0.166 / 0.162 / 0.176 / 0.188 | A1.json 0.175 (pass) | A2.json 0.157 (pass) | A3.json 0.162 (pass)
T-ACT-3: S9 0.101 / 0.100 / 0.095 / 0.094 | A1.json 0.088 (fail) | A2.json 0.111 (pass) | A3.json 0.101 (pass)
T-ACT-4: S9 0.396 / 0.376 / 0.391 / 0.400 | A1.json 0.384 (pass) | A2.json 0.400 (pass) | A3.json 0.403 (pass)
T-PTY-1: S9 4.096 / 3.938 / 3.861 / 3.942 | A1.json 3.869 (pass) | A2.json 4.256 (pass) | A3.json 3.848 (pass)
T-HUN-1: S9 37.896 / 43.641 / 39.891 / 53.852 | A1.json 29.595 (inconclusive) | A2.json 31.568 (inconclusive) | A3.json 39.891 (inconclusive)
| Readout | S9q / S9q1 / S9q2 / S9q3 | S9 mean ± SD | A1 | A2 | A3 |
| --- | --- | --- | --- | --- | --- |
| conflicts / AM-day | 1.627 / 1.262 / 1.560 / 1.220 | 1.417 ± 0.206 | 1.636 | 2.110 | 1.555 |
| contacts / AM-day | 0.104 / 0.079 / 0.088 / 0.070 | 0.085 ± 0.014 | 0.264 | 0.282 | 0.190 |
| fights / AM-day | 0.002 / 0.002 / 0.005 / 0.015 | 0.006 ± 0.006 | 0.013 | 0.039 | 0.031 |
| escalations by the die / AM-day | 0 / 0.002 / 0.005 / 0.013 | 0.005 ± 0.006 | 0.011 | 0.025 | 0.026 |
| injuries (>= 0.05) / AM-day | 0.001 / 0.001 / 0.002 / 0.008 | 0.003 ± 0.003 | 0.007 | 0.021 | 0.017 |
| decided conflicts (n) | 1562 / 1133 / 1499 / 1266 | 1365.000 ± 200.325 | 1547 | 1800 | 1502 |
| contact share of conflicts | 0.065 / 0.069 / 0.057 / 0.063 | 0.063 ± 0.005 | 0.169 | 0.129 | 0.111 |
| hits (n) | 100 / 76 / 83 / 73 | 83.000 ± 12.083 | 244 | 204 | 146 |
| fights (n) | 1 / 2 / 2 / 7 | 3.000 ± 2.708 | 17 | 29 | 20 |
| counter-charges (n) | 2 / 11 / 5 / 16 | 8.500 ± 6.245 | 16 | 23 | 18 |
| injuries (n) | 1 / 2 / 2 / 8 | 3.250 ± 3.202 | 43 | 43 | 29 |
| serious (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 1 | 1 | 2 |
| coalition joins / conflict | 0.061 / 0.100 / 0.069 / 0.086 | 0.079 ± 0.017 | 0.275 | 0.363 | 0.240 |
| ally alerts drawn (n) | 1200 / 1392 / 1435 / 1376 | 1350.750 ± 103.542 | 1160 | 1838 | 1201 |
| rank swaps, adult males (n) | 2 / 1 / 1 / 7 | 2.750 ± 2.872 | 11 | 31 | 14 |
| alpha changes (n) | 0 / 1 / 0 / 0 | 0.250 ± 0.500 | 0 | 1 | 6 |
| takeovers (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 0 | 1 | 1 |
| Elo moved through a die (share) | 0.099 / 0.168 / 0.073 / 0.344 | 0.171 ± 0.122 | 0.310 | 0.273 | 0.276 |
| deaths (n) | 0 / 2 / 0 / 0 | 0.500 ± 1.000 | 0 | 0 | 0 |
| deaths by cause | none / respiratory illness (outbreak) 2 / none / none | — | none | none | none |
| R1 contact share, males >= 12 y | 0.059 / 0.061 / 0.053 / 0.057 | 0.057 ± 0.003 | 0.179 | 0.129 | 0.124 |
| R1b contact share, all contests | 0.065 / 0.069 / 0.057 / 0.064 | 0.064 ± 0.005 | 0.170 | 0.129 | 0.111 |
| R2 female-female middle | 0.075 / 0.061 / 0.056 / 0.093 | 0.071 ± 0.017 | 0.155 | 0.056 | 0.085 |
| R2 female-female small | 0.083 / 0.070 / 0.030 / 0.098 | 0.070 ± 0.029 | 0.144 | 0.141 | 0.078 |
| R2 male-male large | 0.067 / 0.065 / 0.059 / 0.040 | 0.058 ± 0.012 | 0.181 | 0.100 | 0.073 |
| R2 male-male middle | 0.057 / 0.057 / 0.051 / 0.020 | 0.046 ± 0.018 | 0.087 | 0.088 | 0.083 |
| R2 male-male small | 0.053 / 0.039 / 0.051 / 0.086 | 0.057 ± 0.020 | 0.261 | 0.209 | 0.262 |
| R2 female-female middle (n) | 53 / 66 / 72 / 54 | 61.250 ± 9.287 | 58 | 54 | 47 |
| R2 female-female small (n) | 157 / 57 / 133 / 112 | 114.750 ± 42.664 | 188 | 149 | 116 |
| R2 male-male large (n) | 285 / 310 / 324 / 202 | 280.250 ± 54.604 | 270 | 391 | 314 |
| R2 male-male middle (n) | 194 / 106 / 157 / 98 | 138.750 ± 45.162 | 173 | 182 | 109 |
| R2 male-male small (n) | 207 / 102 / 177 / 187 | 168.250 ± 45.894 | 180 | 254 | 145 |
| R3 coalitionary share, males >= 12 y | 0.070 / 0.112 / 0.090 / 0.109 | 0.095 ± 0.019 | 0.206 | 0.266 | 0.174 |
| R9 wounds per individual-year | 0.124 / 0.251 / 0.248 / 0.993 | 0.404 ± 0.397 | 5.338 | 5.338 | 3.600 |
| stood share of charges | 0.377 / 0.387 / 0.399 / 0.389 | 0.388 ± 0.009 | 0.229 | 0.188 | 0.151 |
| T-SOC-5 | 0.519 / 0.190 / 0.464 / 0.288 | 0.365 ± 0.153 | 0.470 | 0.405 | 0.307 |
| T-SOC-9 | 0.186 / 0.144 / 0.260 / 0.068 | 0.164 ± 0.080 | 0.155 | 0.146 | 0.187 |
| T-SOC-10 | 0.237 / 0.223 / 0.298 / 0.301 | 0.265 ± 0.041 | 0.325 | 0.318 | 0.249 |
| T-DEM-23 | sealed / sealed / sealed / sealed | — | sealed | sealed | sealed |
| prescriptions | 74 / 74 / 74 / 74 | 74.000 ± 0.000 | 69 | 69 | 69 |
| viability | pass / pass / pass / pass | — | pass | pass | pass |
| reserves %/day, female, lactating | 0.001 / -0.007 / 0.007 / -0.008 | -0.002 ± 0.007 | 0.001 | 0.000 | -0.000 |
| reserves %/day, juvenile 5–12 y | -0.029 / 0.001 / -0.013 / -0.015 | -0.014 ± 0.012 | -0.034 | 0.002 | -0.014 |
| deaths (energy run) | {} / {'respiratory illness (outbreak)': 2} / {} / {} | — | {} | {} | {} |
```

### 8.4 A4 (iteration 3, d656c0d, clean), beside A1–A3

```
A1.json commit f0ff48c dirty 0 prescriptions 69 viability True deaths [{}, {}]
A2.json commit ca17a1f dirty 0 prescriptions 69 viability True deaths [{}, {}]
A3.json commit 9db2cbb dirty 0 prescriptions 69 viability True deaths [{}, {}]
A4.json commit d656c0d dirty 0 prescriptions 69 viability True deaths [{}, {}]
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.96, 2.56, 1.94, 3.91 (mean 2.59, sd 0.92; used 0.92) | A1.json: 2.04, Δ -0.55, z -0.5 (inside noise) | A2.json: 1.71, Δ -0.88, z -0.9 (inside noise) | A3.json: 2.24, Δ -0.35, z -0.3 (inside noise) | A4.json: 1.52, Δ -1.07, z -1.0 (inside noise)
  held-out           (13 rows) ref 5.57, 5.02, 5.49, 4.15 (mean 5.06, sd 0.65; used 1.26) | A1.json: 6.55, Δ +1.50, z +1.1 (inside noise) | A2.json: 3.50, Δ -1.56, z -1.1 (inside noise) | A3.json: 4.75, Δ -0.31, z -0.2 (inside noise) | A4.json: 4.81, Δ -0.25, z -0.2 (inside noise)
  held-out w/o rare  (12 rows) ref 4.91, 4.39, 4.83, 3.91 (mean 4.51, sd 0.46; used 0.48) | A1.json: 4.39, Δ -0.12, z -0.2 (inside noise) | A2.json: 3.50, Δ -1.01, z -1.9 (inside noise) | A3.json: 3.96, Δ -0.55, z -1.0 (inside noise) | A4.json: 4.81, Δ +0.30, z +0.6 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-1   fitted   ref 0.94±0.35 | A1.json 0.23 (inconclusive) | A2.json 0.33 (inconclusive) | A3.json 0.74 (inconclusive) | A4.json 0.36 (inconclusive)
   T-HUN-4   held-out ref 0.55±0.20 | A1.json 2.16 (fail) | A2.json 0.00 (pass) | A3.json 0.79 (fail) | A4.json 0.00 (pass)
   T-RNG-5   held-out ref 1.02±0.45 | A1.json 0.56 (fail) | A2.json 0.00 (pass) | A3.json 0.37 (fail) | A4.json 1.07 (fail)
   T-SOC-10  held-out ref 0.00±0.00 | A1.json 0.13 (fail) | A2.json 0.09 (fail) | A3.json 0.00 (pass) | A4.json 0.00 (pass)
   T-SOC-3   held-out ref 0.01±0.03 | A1.json 0.19 (fail) | A2.json 0.03 (fail) | A3.json 0.00 (pass) | A4.json 0.00 (pass)
held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.91 / 4.39 / 4.83 / 3.91 (mean 4.51, sd 0.46; used 0.48); A1.json 4.39 (z -0.2); A2.json 3.50 (z -1.9); A3.json 3.96 (z -1.0); A4.json 4.81 (z +0.6)
T-SOC-5: S9 0.519 / 0.190 / 0.464 / 0.288 | A1.json 0.470 (pass) | A2.json 0.405 (pass) | A3.json 0.307 (pass) | A4.json 0.479 (pass)
T-SOC-9: S9 0.186 / 0.144 / 0.260 / 0.068 | A1.json 0.155 (pass) | A2.json 0.146 (pass) | A3.json 0.187 (pass) | A4.json 0.218 (pass)
T-SOC-10: S9 0.237 / 0.223 / 0.298 / 0.301 | A1.json 0.325 (fail) | A2.json 0.318 (fail) | A3.json 0.249 (pass) | A4.json 0.242 (pass)
T-SOC-6: S9 0.485 / 0.403 / 0.420 / 0.432 | A1.json 0.408 (fail) | A2.json 0.430 (fail) | A3.json 0.423 (fail) | A4.json 0.438 (fail)
T-ACT-1: S9 0.379 / 0.368 / 0.365 / 0.370 | A1.json 0.371 (pass) | A2.json 0.369 (pass) | A3.json 0.373 (pass) | A4.json 0.361 (pass)
T-ACT-2: S9 0.166 / 0.162 / 0.176 / 0.188 | A1.json 0.175 (pass) | A2.json 0.157 (pass) | A3.json 0.162 (pass) | A4.json 0.184 (pass)
T-ACT-3: S9 0.101 / 0.100 / 0.095 / 0.094 | A1.json 0.088 (fail) | A2.json 0.111 (pass) | A3.json 0.101 (pass) | A4.json 0.091 (fail)
T-ACT-4: S9 0.396 / 0.376 / 0.391 / 0.400 | A1.json 0.384 (pass) | A2.json 0.400 (pass) | A3.json 0.403 (pass) | A4.json 0.361 (pass)
T-PTY-1: S9 4.096 / 3.938 / 3.861 / 3.942 | A1.json 3.869 (pass) | A2.json 4.256 (pass) | A3.json 3.848 (pass) | A4.json 4.005 (pass)
T-HUN-1: S9 37.896 / 43.641 / 39.891 / 53.852 | A1.json 29.595 (inconclusive) | A2.json 31.568 (inconclusive) | A3.json 39.891 (inconclusive) | A4.json 32.265 (inconclusive)
| Readout | S9q / S9q1 / S9q2 / S9q3 | S9 mean ± SD | A1 | A2 | A3 | A4 |
| --- | --- | --- | --- | --- | --- | --- |
| conflicts / AM-day | 1.627 / 1.262 / 1.560 / 1.220 | 1.417 ± 0.206 | 1.636 | 2.110 | 1.555 | 1.804 |
| contacts / AM-day | 0.104 / 0.079 / 0.088 / 0.070 | 0.085 ± 0.014 | 0.264 | 0.282 | 0.190 | 0.163 |
| fights / AM-day | 0.002 / 0.002 / 0.005 / 0.015 | 0.006 ± 0.006 | 0.013 | 0.039 | 0.031 | 0.021 |
| escalations by the die / AM-day | 0 / 0.002 / 0.005 / 0.013 | 0.005 ± 0.006 | 0.011 | 0.025 | 0.026 | 0.014 |
| injuries (>= 0.05) / AM-day | 0.001 / 0.001 / 0.002 / 0.008 | 0.003 ± 0.003 | 0.007 | 0.021 | 0.017 | 0.011 |
| decided conflicts (n) | 1562 / 1133 / 1499 / 1266 | 1365.000 ± 200.325 | 1547 | 1800 | 1502 | 1591 |
| contact share of conflicts | 0.065 / 0.069 / 0.057 / 0.063 | 0.063 ± 0.005 | 0.169 | 0.129 | 0.111 | 0.096 |
| hits (n) | 100 / 76 / 83 / 73 | 83.000 ± 12.083 | 244 | 204 | 146 | 141 |
| fights (n) | 1 / 2 / 2 / 7 | 3.000 ± 2.708 | 17 | 29 | 20 | 12 |
| counter-charges (n) | 2 / 11 / 5 / 16 | 8.500 ± 6.245 | 16 | 23 | 18 | 11 |
| injuries (n) | 1 / 2 / 2 / 8 | 3.250 ± 3.202 | 43 | 43 | 29 | 23 |
| serious (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 1 | 1 | 2 | 0 |
| coalition joins / conflict | 0.061 / 0.100 / 0.069 / 0.086 | 0.079 ± 0.017 | 0.275 | 0.363 | 0.240 | 0.241 |
| ally alerts drawn (n) | 1200 / 1392 / 1435 / 1376 | 1350.750 ± 103.542 | 1160 | 1838 | 1201 | 1487 |
| rank swaps, adult males (n) | 2 / 1 / 1 / 7 | 2.750 ± 2.872 | 11 | 31 | 14 | 6 |
| alpha changes (n) | 0 / 1 / 0 / 0 | 0.250 ± 0.500 | 0 | 1 | 6 | 0 |
| takeovers (n) | 0 / 0 / 0 / 0 | 0.000 ± 0.000 | 0 | 1 | 1 | 0 |
| Elo moved through a die (share) | 0.099 / 0.168 / 0.073 / 0.344 | 0.171 ± 0.122 | 0.310 | 0.273 | 0.276 | 0.153 |
| deaths (n) | 0 / 2 / 0 / 0 | 0.500 ± 1.000 | 0 | 0 | 0 | 0 |
| deaths by cause | none / respiratory illness (outbreak) 2 / none / none | — | none | none | none | none |
| R1 contact share, males >= 12 y | 0.059 / 0.061 / 0.053 / 0.057 | 0.057 ± 0.003 | 0.179 | 0.129 | 0.124 | 0.101 |
| R1b contact share, all contests | 0.065 / 0.069 / 0.057 / 0.064 | 0.064 ± 0.005 | 0.170 | 0.129 | 0.111 | 0.097 |
| R2 female-female middle | 0.075 / 0.061 / 0.056 / 0.093 | 0.071 ± 0.017 | 0.155 | 0.056 | 0.085 | 0.032 |
| R2 female-female small | 0.083 / 0.070 / 0.030 / 0.098 | 0.070 ± 0.029 | 0.144 | 0.141 | 0.078 | 0.070 |
| R2 male-male large | 0.067 / 0.065 / 0.059 / 0.040 | 0.058 ± 0.012 | 0.181 | 0.100 | 0.073 | 0.035 |
| R2 male-male middle | 0.057 / 0.057 / 0.051 / 0.020 | 0.046 ± 0.018 | 0.087 | 0.088 | 0.083 | 0.127 |
| R2 male-male small | 0.053 / 0.039 / 0.051 / 0.086 | 0.057 ± 0.020 | 0.261 | 0.209 | 0.262 | 0.151 |
| R2 female-female middle (n) | 53 / 66 / 72 / 54 | 61.250 ± 9.287 | 58 | 54 | 47 | 62 |
| R2 female-female small (n) | 157 / 57 / 133 / 112 | 114.750 ± 42.664 | 188 | 149 | 116 | 142 |
| R2 male-male large (n) | 285 / 310 / 324 / 202 | 280.250 ± 54.604 | 270 | 391 | 314 | 398 |
| R2 male-male middle (n) | 194 / 106 / 157 / 98 | 138.750 ± 45.162 | 173 | 182 | 109 | 126 |
| R2 male-male small (n) | 207 / 102 / 177 / 187 | 168.250 ± 45.894 | 180 | 254 | 145 | 166 |
| R3 coalitionary share, males >= 12 y | 0.070 / 0.112 / 0.090 / 0.109 | 0.095 ± 0.019 | 0.206 | 0.266 | 0.174 | 0.165 |
| R9 wounds per individual-year | 0.124 / 0.251 / 0.248 / 0.993 | 0.404 ± 0.397 | 5.338 | 5.338 | 3.600 | 2.855 |
| stood share of charges | 0.377 / 0.387 / 0.399 / 0.389 | 0.388 ± 0.009 | 0.229 | 0.188 | 0.151 | 0.156 |
| T-SOC-5 | 0.519 / 0.190 / 0.464 / 0.288 | 0.365 ± 0.153 | 0.470 | 0.405 | 0.307 | 0.479 |
| T-SOC-9 | 0.186 / 0.144 / 0.260 / 0.068 | 0.164 ± 0.080 | 0.155 | 0.146 | 0.187 | 0.218 |
| T-SOC-10 | 0.237 / 0.223 / 0.298 / 0.301 | 0.265 ± 0.041 | 0.325 | 0.318 | 0.249 | 0.242 |
| T-DEM-23 | sealed / sealed / sealed / sealed | — | sealed | sealed | sealed | sealed |
| prescriptions | 74 / 74 / 74 / 74 | 74.000 ± 0.000 | 69 | 69 | 69 | 69 |
| viability | pass / pass / pass / pass | — | pass | pass | pass | pass |
| reserves %/day, female, lactating | 0.001 / -0.007 / 0.007 / -0.008 | -0.002 ± 0.007 | 0.001 | 0.000 | -0.000 | 0.005 |
| reserves %/day, juvenile 5–12 y | -0.029 / 0.001 / -0.013 / -0.015 | -0.014 ± 0.012 | -0.034 | 0.002 | -0.014 | -0.028 |
| deaths (energy run) | {} / {'respiratory illness (outbreak)': 2} / {} / {} | — | {} | {} | {} | {} |
```

### 8.5 Final checks (after `git merge --no-ff track-e` at 1002bb4: conflicts in research.md, e-sources.md, params.gen.ts and the switch list resolved as handoff §6)

`gen-params --check` clean (996 entries); `tsc --noEmit -p .` clean; `pnpm test` 733 tests, 732 pass, 0 fail, 1 skipped;
prescriptions after the merge: S9 74, S9 + `contestAssess` 69; switch 0 hash-identical (S9 seed 48 day 8 422bb3edd2db147e);
`git ls-files data/raw node_modules` empty. Arm outputs (JSON, tables, scripts, the source helpers' notes) in
`artifacts/validation/e4h/` (gitignored, local; the PDFs among the source notes are copyrighted and stay local).
