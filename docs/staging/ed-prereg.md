# ED pre-registration: the dead (how long a body stays, who responds to it)

Status: registered 6 October 2026, 08:57 EDT, before any code (branch `ed-dead`, from `track-e` e0cf866). A stage
behind switches that are 0 by default; 0 is today's behaviour bit for bit. No benchmark run belongs to this stage.

Rule served (user, verbatim): "Field numbers are targets, never inputs; never tune an input to hit a behavioural rate.
Before building toward a field number that is far off, audit its source: sample, method, formula." The reported carrying
durations and shares (§1) are what the result is later compared with. No input below is set from them, and no input will
be changed to move a readout toward them.

The question (user): "dont we have skeletons or remains of chimps stay visible for time? their bones etc? what is
reported."

## 0. Today (code read at e0cf866)

- `src/render/creatures.ts:95` `DEAD_VISIBLE_HOURS = 24`: every body fades between 20 and 24 h after death. A
  stylization with no source. Nothing in `src/sim` knows a body exists after `killChimp`.
- `src/sim/life.ts:41-48`: when an unweaned infant under `carryDeadMaxAgeY` (3 y, assumed) dies and its mother lives,
  one roll (`carryDeadP` 0.35, assumed) decides whether she carries it, and a second draw sets a timer of
  `carryDeadMinDays` + U × `carryDeadSpanDays` (1 to 4 days, assumed). `life.ts:258` ends the carry when the timer runs
  out. A probability and a timer: both state the outcome. The body's own `position` never moves.
- No animal perceives a body: `perception.ts` scans the living only, `candidates.ts` skips the dead, `observe.ts`
  drops any option whose target is not alive.

## 1. Evidence (only docs/research.md, "Addendum: responses to the dead and how long remains persist")

Quoted from the addendum with its confidence. "FT" = full text read there, "Abs" = abstract only.

| Piece | What the addendum reports | Confidence |
| --- | --- | --- |
| A mother carries her dead infant | [lonsdorf2020] (FT; Gombe; 93 infants dead before 5 y, 42 corpses seen): "in every case where the mother had access to the body she carried it (the exceptions were seven infanticides where she never regained the body, one unwitnessed infanticide and one infant killed by humans)"; 33 carries, 30 with a measurable **minimum** duration, median 1.83 days (IQR 1.03–3.59), range 30 min to 15.70 days. [soldati2022] (FT; Budongo; 68 dead by 5 y): 12 of 17 cases where mother and body were seen together (71%), "all five that did not were infanticides"; 9 carries of 1–3 days, three of 18, 56 and 89 days, mummified. [bersacola2025] (FT; camera traps, 10 cases): a day or less to 28 days, median 7, a minimum between sparse detections. | high that she carries; durations are minima |
| How she carries | [lonsdorf2020]: "Nearly all carriers used atypical postures within hours of death (in the mouth, hand, groin pocket, neck pocket, slung over the shoulder, or dragged)". A dead infant does not cling. | high (Gombe) |
| What ends a carry | Not reported. [lonsdorf2020]: none of five hypotheses (infant age, season, firstborn, mother's age, cause of death) beat the null model; "mothers gradually increased their distance from the corpse as time passed" (Discussion, observers' note). [soldati2022] "Does not show: why a few mothers carry for weeks". | **unknown**; one qualitative note |
| Who is carried | [lonsdorf2020] "No infant over 3 years was seen carried"; [bersacola2025] all ten under 3 y; in 8 of 33 Gombe carries the carrier was not the mother (three orphans carried by adopters). | high for the age pattern at Gombe |
| Others and an infant's body | [lonsdorf2020]: "after the mother, siblings were the most likely to interact with a corpse; mothers and siblings groomed it more than other animals did; inspection with contact … mostly by mothers and siblings, but others did it too". [soldati2022]: "only some immatures (under 10 years) inspected the corpse and an adult male showed no interest"; "the mother did not stop others approaching". [shimada2023] (one case, a collapsed juvenile that **recovered**, not a death): 8 of 9 adult males, 3 of 8 adult females, 1 of 3 young males, 2 of 3 juvenile males came close; means 21.9 and 4.5 min. | moderate; "how long others stayed near or attended a body" is not shown |
| Others and an adult's body | [stewart2012] (Abs): 16 Gombe animals responded to a recently dead adult female, from observation and smelling or grooming to shaking, dragging and beating; the same abstract says that in a 1973 account 16 responded and none touched the body. Not verified beyond the abstract. | low; the two accounts disagree |
| How long a carcass lasts | "No chimpanzee-specific carcass-persistence study was found." [rouquet2005] (FT; gorilla, about 150 kg, Gabon and Congo): "reduced to a heap of bones and hair in 10 days"; maggots remove the flesh in 5 to 10 days; "after about 3 weeks only a few bones with small-mammal gnaw marks are left". [heon2025] (FT; one orangutan, about 30 kg, Borneo): fresh to dry remains in 6 days; "two years later the bones lay scattered over about 10 m², the skull was still visible". | low for a chimpanzee (other species, one description and one carcass) |
| Returning to old remains | "No source opened reports a wild chimpanzee returning to an old carcass, a place of death or a skeleton." Two Ngogo skeleton encounters of 2 and 5 minutes are second-hand and not verified. | unknown |

Source audit for the two figures that will be compared later (sample, method, formula):
- 1.83 days: Gombe, 30 carries; a **minimum** ("mothers are not seen every day", Methods); the carrier was not always
  the mother (8 of 33); the published literature beyond it "may favour extremely long cases".
- 71%: Budongo, 12 of 17 cases in which mother and body were **seen together**, after excluding deaths with the mother
  and infanticide with cannibalism; the denominator is observation, not deaths (in 36 further instances the mother
  reappeared alone). A simulation readout must use the same denominator: deaths where the mother had the body in reach.

## 2. Mechanism

Three switches, all 0 by default (§4). State is plain data; all randomness from `world.rng` (the stage draws none).

### 2.1 The body as an object (`deadBody` 1)

- At death the animal's record gets a body: `world.sim.bodies[id] = { by, exp, insp }` (lazily added key, listed in
  `OPTIONAL_SIM`) and `chimp.remains = 'body'` (optional contract field for the renderer and the UI, absent when the
  switch is off). The body's place is the dead animal's own `position`, which the simulation now moves while the body
  is held and leaves where it is put down.
- Decomposition: `exp` counts the hours the body has lain **on the ground, not held**. At `bodyFleshDays` × 24 h of it
  the body is bones: `remains = 'bones'`, nothing can hold or approach it. At a further `bodyBonesDays` × 24 h the
  remains are gone (`remains` removed, the `bodies` entry deleted). The count stops while a body is held: the long
  carried corpses were mummified, not reduced to bones ([soldati2022], three cases); why is not reported, so this is a
  design assumption resting on that observation.
- Perception: at its decision point an animal notes the bodies (stage 'body') of its own community inside its sight
  radius in `chimp.sim.bd` (lazily added, `OPTIONAL_X`). Local only, as for the living.

### 2.2 A mother and her dead infant (`deadCarry` 1, needs `deadBody` 1)

The roll (`carryDeadP`) and the timer (`carryDeadMinDays`, `carryDeadSpanDays`) are not read, and nothing is drawn.

- **Start.** A body that was on its carer at death stays in her hands: if the infant was being carried when it died
  (the simulation's own riding rule, `isCarried`, by the carer it depended on: its mother, or its adopter), `by` is that
  carer. Killed by another chimpanzee (cause "infanticide"), the body is not in her hands (`by` −1): it lies where the
  killing happened, and whether she regains it is her choice below ([lonsdorf2020]: the exceptions to carrying were
  infanticides where she never regained the body).
- **Holding.** A dead infant does not cling, so it is held (hand, mouth, pocket: [lonsdorf2020]). She keeps it through
  acts that leave a hand free (rest, shelter, nest, travel, follow, flee and the other moving acts, greeting, calling,
  tending the body). When she starts an act that needs her hands and body (feeding, drinking, grooming or playing with
  another, climbing, mating, contests, hunting, nursing another infant), she puts it down where she is (`by` −1). Which
  acts need her hands is a design assumption (the addendum gives postures, not a list).
- **Taking it up again.** While a body she may carry lies in her sight, her menu holds one more option: go to it and
  take it up (`follow`, variant `BODY`). It is valued as contact with that infant was valued in life: the partner terms
  of the existing grooming valuation (her social need, her bond to the infant, kinship; less distance, hunger, rain and
  night, with the weights grooming already uses). No new weight. Design assumption: she responds to the body as to the
  infant ([shimada2023] Discussion and [watts2020] abstract read responses to a body as an extension of those to an
  inanimate group member; the bond is the simulation's existing state and relaxes at its existing daily rate).
- **End.** A carry ends when she chooses another act over taking the body up and moves out of sight of it, or when she
  dies. There is no timer and no probability. Her own needs (a food trip that outscores the body), the party moving on
  (a follow that outscores it) and the fading bond are what end it. That is a mechanism of the simulation, not one the
  sources establish: **what ends a carry in the wild is unknown** (§1). The duration that results is a readout.
- **Who may carry.** The carer the infant depended on, for an infant she could still carry in life (the riding rule's
  age limit, under 4 y, already in the code). No one else takes a body.
- With `deadCarry` 0 and `deadBody` 1 the old roll and timer still decide, and the body follows her while they run
  (an ablation: the body object alone).

### 2.3 Others and an infant's body (`deadRespond` 1, needs `deadBody` 1)

Ordinary candidates, legal only for the classes the addendum names, for the body of an infant (under 5 y at death) of
their own community that is a body (not bones), lying or held by its carer:

- **Approach and inspect** (`follow`, variant `BODY`): maternal siblings, immatures (2 to under 10 y, not carried
  themselves) and adult males who have not yet inspected this body. Value `bodyInterestW` less distance, hunger, rain
  and night. On arrival within reach the animal looks for `bodyInspectMin`, is recorded in `insp`, and the option is not
  offered to it again for this body (it has seen it). One weight for every class: the sources give no class weights.
- **Groom or handle** (`groom`, variant `BODY`): the mother or carer and maternal siblings, valued as grooming that
  infant was valued in life (same terms as §2.2). The bout runs as a grooming bout does for the groomer; the body gives
  nothing back and no bond grows.
- The perceived body is in the decision packet: `DecisionContext.bodies` (at most 2: name, relation, age at death,
  distance, hours dead, whether it is held and by whom), and the request check accepts a body as the target of `follow`
  and `groom` only.

### 2.4 Rendering

- `deadBody` 0: the renderer does exactly what it does today (`DEAD_VISIBLE_HOURS`, `deadDrop`).
- `deadBody` 1 (the dead animal has `remains`): the body is drawn while `remains === 'body'` at the simulation's
  position, on its carrier while held (the existing attachment through `carryingDeadId`), with no 24-hour fade. The
  lying pose is today's. No new shader texel is planned.
- Bones: drawn only if it can be done without a new texel or per-frame allocation; any bone shape is a stylization and
  is labelled so. Decided and logged in §7 after reading the renderer.

## 3. Inputs

| Input | Value | Range | Label | Basis |
| --- | --- | --- | --- | --- |
| `bodyFleshDays` | 8 eco-days on the ground | 6–10 | [L], other great apes; design assumption for a chimpanzee | orangutan of about 30 kg: dry remains in 6 days ([heon2025], one carcass); gorilla of about 150 kg: bones and hair in 10 days ([rouquet2005], one description). The midpoint; no chimpanzee figure exists. Not scaled by body mass (two anecdotes do not carry a curve). |
| `bodyBonesDays` | 21 eco-days after that | 21–730 | [L], other great apes; design assumption | "after about 3 weeks only a few bones … are left" ([rouquet2005], an African forest with scavengers) is the latest time that source describes; an orangutan skull was visible at two years ([heon2025]). The value is the lower end: a floor on how long some bones last. |
| `bodyInterestW` | 0.4 score | 0.2–0.8 | design assumption | The value of approaching a body not yet inspected. No source gives it; the share of each class that approaches is a readout. |
| `bodyInspectMin` | 3 min | 2–20 | design assumption | Only durations are known, and none for a dead infant: 2 and 5 min at skeletons (second-hand, not verified), 4.5 and 21.9 min at a collapsed juvenile that lived ([shimada2023]). Needed so an inspection has an end. |
| contact valuation of the body | the existing grooming terms | — | design assumption (reuses design weights) | §2.2; no new number |
| who may be carried (under 4 y) | `isCarried`'s limit | — | existing rule, [H] for riding in life | not the 3 y of the sources: that figure is a readout ("age of the oldest infant carried") |
| acts that need the hands | list in §2.2 | — | design assumption | postures only are reported |
| switched out by `deadCarry` | `carryDeadP`, `carryDeadMinDays`, `carryDeadSpanDays`, `carryDeadMaxAgeY` | | probability, timer, timer, age rule | today's roll and timer |

Ledger class, stated honestly: `bodyFleshDays` and `bodyBonesDays` are durations of a physical process taken from
measurements of that process in other species (inputs with a low evidence level, not behaviour); `bodyInspectMin` is a
duration of a behaviour set by assumption inside a range of reported durations, so it is **borderline** and will be
classed as the ledger's rules class it, with this note; `bodyInterestW` is a score weight (design). No carrying
duration or carrying share enters anywhere.

## 4. Switches (all 0 by default; 0 = today, bit for bit)

| Switch | Needs | 1 does |
| --- | --- | --- |
| `deadBody` | — | §2.1 and §2.4 |
| `deadCarry` | `deadBody` 1 | §2.2; removes the roll and the timer |
| `deadRespond` | `deadBody` 1 | §2.3 |

Registered in `TRACK_E_SWITCHES` in `tests/sim-track-e.test.ts` and `scripts/lib/prescriptions.ts`; parameters as
text in `data/params.json`, rows in docs/simulation.md §17.

## 5. Readouts (measurement only; `scripts/lib/dead-readout.ts`, no benchmark run in this stage)

Each defined from the source's own denominator:
- **Carrying started / access**: of infant deaths (under 5 y) where the carer had the body in her hands at death or
  saw it lying at a decision point afterwards, the share in which she held it for at least one tick after the death
  tick. Compare: Gombe "every case where the mother had access", Budongo 12 of 17 seen together.
- **Carrying duration**: from the death to the last tick she held the body (days). Compare: Gombe minimum-duration
  median 1.83 days (IQR 1.03–3.59); the simulation's is exact, the field's a minimum, so the simulation should read
  the same or longer.
- **Who approached**: per body, the animals recorded in `insp` and those that groomed it, by class (mother or carer,
  maternal sibling, immature, adult male). Compare qualitatively with [lonsdorf2020]'s order (mother, then siblings).
- **Age of the oldest infant carried.** Compare: none over 3 y.

Proposed target rows for the user (not added to `data/targets.json`, which is frozen): see §8.

## 6. Tests (seeds 48 and 7 only)

1. Switches 0 in both profiles; the compressed goldens and the field pin do not move.
2. `deadBody` 1: a death leaves a body with `remains: 'body'`; left on the ground it is bones after `bodyFleshDays`
   and gone after `bodyBonesDays` more; held, `exp` does not advance.
3. `deadCarry` 1: an infant that dies on its mother stays in her hands with no draw from `world.rng`; the body's
   position follows her; a hands act puts it down; the take-up option appears only while the body is in her sight and
   is legal through `applyDecision`; an infanticide victim is not in her hands.
4. `deadRespond` 1: the options exist only for the named classes and only for an infant's body; an inspection is
   recorded once; `observe()` stays pure and carries `bodies`; the request passes `decisionContextError`.
5. Determinism with all three on: the same seed and tick count give a deep-equal world however ticks are batched; a
   save made with a body present (JSON round trip) resumes exactly; `worldShapeProblem` accepts it.
6. Prescription ledger and `gen-params --check` pass.

## 7. Iterations (at most 3 per problem; each logged here before it runs)

None yet.

## 8. Not built, and why

- **Responses to an adult's body**: nothing. Two Gombe accounts from one abstract that disagree (touching and beating
  against none touching), not verified. Low confidence does not carry a rule.
- **Returning to old remains, visits to a place of death, vigils, mourning**: nothing. No opened source reports them.
- **Responses to bones**: nothing. Two second-hand skeleton encounters, not verified.
- **Others carrying or taking the body, play or sexual behaviour with it, cannibalism, rough handling**: nothing.
  Reported as rare cases without a rate.
- **Adult females other than the carer approaching**: not offered. The addendum's summary names siblings, immatures
  and adult males; adult females appear only in the one case of a collapsed juvenile that lived.
- **A cost of carrying** (slower travel or feeding with a hand occupied): not built; no magnitude is reported.
- **Mummification as a state**: not built; held bodies simply do not decompose (§2.1).
- **Scavengers, smell, disease risk at a carcass**: not built.

Target rows proposed for the user (to be added to `data/targets.json` only by the user's decision):

| Proposed row | Field value | Source | Note |
| --- | --- | --- | --- |
| T-DED-1 carrying started, share of infant deaths with the body in the carer's reach | 1.00 (Gombe); 0.71 (Budongo, 12 of 17) | [lonsdorf2020], [soldati2022] | band 0.71–1.00 |
| T-DED-2 carrying duration, median days | ≥ 1.83 (IQR 1.03–3.59), a minimum | [lonsdorf2020] Table 2 | the simulation's exact duration should not fall below it |
| T-DED-3 share of carries longer than 10 days | 2 of 30 (Gombe); 3 of 12 (Budongo) | same | small n |
| T-DED-4 oldest infant carried, years | ≤ 3 | [lonsdorf2020], [bersacola2025] | the code allows under 4 |
| T-DED-5 who interacts with an infant's body, order | mother, then maternal siblings, then others | [lonsdorf2020] Results | qualitative |
