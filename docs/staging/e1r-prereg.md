# E1r: lean-season starvation, a diagnosis (registered 5 October 2026, before any analysis)

Owner: agent `e1r-lean` (branch `e1r-lean` from `track-e`); integrator judges. E1r changes no behaviour: no switch, no
parameter value, nothing in `src/sim`.

## 1. Why

- Part C at 12 months (`docs/staging/e-rebaseline.md`): S39 is not viable. 6 starvation deaths in its 20 seeds
  (adolescents 3, pregnant females 2, an infant of 2–5 y 1; seeds 5, 11 and 48). The group's reserves dip from about day
  45 to day 230 of the scored year (juveniles of 5–12 y to about −0.16 to −0.20 of the store, nursing mothers to about
  −0.13), then partly recover. Today's model has no energy ledger and no starvation.
- Walk-back (same file, seed 48): S37, S34, S31 and S27 all starve (2–4 deaths each; S39's four runs 0, 0, 1, 0). By the
  registered rule the cause is older than S27: the energy ledger's response to the lean season.

## 2. Question

Which term of the energy balance leaves juveniles, adolescents and pregnant females in deficit through the lean season,
and how does each term compare with the field? Candidates, named before looking (not ranked):

1. **Supply:** fruit availability by month (the Ngogo phenology record the field profile reads) and what else is
   edible then (figs, young leaves, pith); whether the fallbacks are reachable and eaten.
2. **Feeding time:** whether it rises as fruit falls, and what caps it (daylight, gut fill, rest from heat, the value of
   other acts).
3. **Intake rate:** kcal per feeding minute by food and by class (juveniles and adolescents against adults).
4. **Expenditure:** by term (resting, activity, walking, climbing, carrying, growth, gestation, lactation) and month;
   whether travel rises in the lean season.
5. **Access:** displacement at food, party size and competition, sharing, milk; why these classes and not adult males.
6. **Reserve dynamics:** the store's size and the level at which starvation kills, against the field's dip without
   deep catabolism.

## 3. Field evidence (checks: targets, never inputs; every source already in `docs/research.md`)

- Feeding 309 ± 85 min per day and about 2,500 kcal per day; intake by food: ripe fruit 10.7 kcal/min, young leaves
  6.2, pith 3.4 [uwimbabazi2019].
- When food was abundant chimpanzees fed for less time and spent more energy [vale2020] (Taï; direction).
- Energy balance (urinary C-peptide) tracks fruit in the diet [emeryThompson2009]; no systematic ketone production was
  detected at Kanyawara or Mahale [knott2005]: lean seasons lower energy balance without deep catabolism (direction).
- Pith and stems 17.4% of feeding time at Kanyawara, 1.0% at Ngogo; young leaves about 6.9% at Kanyawara [potts2011];
  pith intake rose when fruit was scarce [wrangham1991] (direction).
- Nursing mothers' energy balance depressed for about 6 months after birth, then rising [emeryThompson2012].

## 4. Data

No new simulation unless a readout is missing. Read only:
- S39's four 12-month runs (20 seeds): `bench-run/artifacts/validation/e/runs/M12-S39{,-s1,-s2,-s3}/parts/*.part.json.gz`
  (`energy.daily`: per class and day, eating ticks, intake, faecal loss, expenditure, dry matter, hunger, gut fill;
  `energy.acc`: the year's expenditure by term; `energy.e1pTraj`, `trajSeeds`, `juvs`, `dyads`; viability deaths by
  cause) and the end worlds `*.ckpt-d395.v8.gz`.
- Today's model's four runs (same phenology; supply and feeding time, no ledger): `bench-run2/…/M12-T0{,-s1,-s2,-s3}`.
- The walk-back's seed-48 parts: `bench-run/…/WB-S37`, `WB-S34`; `bench-run2/…/WB-S31`, `WB-S27`.

If a readout is missing (for example expenditure by term per month, or food mix per month), it is added to e-bench's
energy readout only (measurement; switches 0; goldens and `tests/sim-track-e.test.ts` unchanged), committed, and then
run on development seed 48 only, on S39 (rngSalt 2: 1 starvation) and S31 (rngSalt 0: 4 starvations), 6 months first
(extended from its checkpoint to 12 months only if the deaths in that world fall after day 180). At most 3 runs, each
logged in this file before it starts; one job at a time while the load is above 8.

## 5. Readouts (fixed now)

By class (adult male, female other, lactating, pregnant, adolescent, juvenile 5–12 y, the infant classes) and by month
of the scored year, pooled over S39's 20 seeds and separately for the seeds with starvation: intake (kcal per day and
per kg^0.75), feeding minutes per day, food mix (fruit, figs, leaves, pith and other fallbacks, meat, milk), expenditure
per day by term, net balance, reserve relative to the store; fruit availability by month. Feeding minutes and food mix
for today's model where its readouts hold them. For each starved animal: its last 60 days (intake, expenditure, feeding
minutes, party size, displacements received, its mother's state if dependent) and the day of death.

## 6. Deliverable

The tables above; each candidate of §2 against its field check (inside, outside, no field number); a verdict naming the
responsible term or terms, with a confidence level. Then a proposal for E1s: a mechanism with its sources (in
`docs/research.md`, or added there first), entered from data and never set to hit a target; its switch (0 by default),
readouts and success criteria (viable at 12 months on S39's four runs; the lean-season dip of the right direction and no
starvation of weaned animals; feeding time rising as fruit falls; the keep rule otherwise). The integrator registers and
judges E1s; E1r does not run it.

## 7. Prediction (integrator, low confidence, before any analysis)

Feeding time does not rise enough as fruit falls (the decision values do not trade other acts for feeding as reserves
drop), and the fallbacks supply too little to cover it; expenditure is not the main term.

## 8. Run log (agent `e1r-lean`; sections 1–7 above are the registration, unchanged)

### 8.1 Why a run is needed (5 October 2026, before any run; read from the S39 group's parts and end worlds)

The existing data hold, by class and day: ticks, eating ticks, energy in, passed out, spent (total), dry matter, daylight
hunger and foregut-full ticks; the reserve trajectory for seven classes; the year's spending by term and fruit share by
class; and in the end worlds each dead animal's identity, time and cause of death. They cannot give five readouts of §5
that the verdict needs:
1. **Food mix by month** for any class (daily records have no food kind; only the year's fruit share exists).
2. **Spending by term by month** (only the year's sum per term exists).
3. **Adolescents (12–15 y)**: no class readout holds them (energy-probe.ts `classesOf` returns none for 12–15 y), yet 3
   of S39's 6 starvation deaths are adolescents (one female of seed 5 in three re-draws). Pregnant females have no
   reserve trajectory.
4. **The starved animals' last 60 days**: no readout is per animal; the end worlds keep only identity, time and cause
   (a dead animal's hidden state is slimmed 30 days after death).
5. **What caps feeding** by month: eating at a full foregut, the daylight acts, party size and food-competition charges
   received.

Finding that set the run plan (end worlds, `deathTime`): every starvation death in S39's group and in the walk-back falls
**after** scored day 180 except one (seed 11, rngSalt 1: day 189): S39 rngSalt 2 seed 48, id 22 at day 342; S31
rngSalt 0 seed 48, ids 17, 15, 47, 22 at days 235, 258, 339, 354. All are female.

### 8.2 The readout (committed before any run)

`e-bench --animal-days` (scripts/lib/energy-probe.ts `ANIMAL_DAY_FIELDS`, measurement only): one row per living animal
and window day with food taken by kind (drupe, fig, fallback, meat, milk, plant handed over), eating ticks by kind and
at a full foregut, spending by term, ground metres, daylight acts, hunger, foregut fill, party size, charges received
(and those by an actor competing for food), mass, reserves, store, the mother's reserves. Off unless asked; the part of
a run without it is unchanged. tests/lean-season.test.ts: the world is the same with and without it (field hash and the
whole energy readout), and the rows add up to the class readout (energy in, spent, passed out, dry matter within 0.1%).
No src/ or data/ change: compressed goldens, tests/fixtures and tests/sim-track-e.test.ts are untouched.

### 8.3 Runs (each logged here before it starts; seed 48 only; `--workers 1`; one job at a time while the load is above 8)

Frozen detached checkout of the readout commit (scratch worktree), outputs in this worktree's
`artifacts/validation/e1r/` (gitignored). At most 3 runs; both worlds' deaths fall after day 180, so only one can be
extended within the cap: S31's (four deaths, every starving class: pregnant female, juvenile, adolescent, and the infant
of 2–5 y that is also S39 rngSalt 2's only death).
- **R1**: S31 (WB-S31's parameters, rngSalt 0), `--m6 --seeds 48 --part --animal-days` (30 + 180 days, end checkpoint).
- **R2**: R1 extended to 12 months (`--m12 --resume` R1's checkpoint). Behaviour check: its field hash and deaths (ids,
  times) must equal WB-S31's seed-48 part and end world.
- **R3**: S39 rngSalt 2 (M12-S39-s2's parameters), `--m6 --seeds 48 --part --animal-days`. Behaviour check: its field hash
  must equal M6-S39-s2's seed-48 part. Its death (day 342) stays outside the window; the same animal starves in R2.
