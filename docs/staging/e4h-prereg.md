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

*pending: the block is regenerated from the final diagnosis JSON (contest2) before the first arm and pasted here.*

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

## 8. Results

*pending*
