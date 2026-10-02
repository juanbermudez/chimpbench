# E1o pre-registration: what an older infant drinks

Registered 2 October 2026 (first commit 13:15), before any run of this stage. Track E, stage E1o, branch
`e1o-milk-demand` (from `track-e` c7a4c75). Any new switch is 0 by default in both profiles and is read only with
`energyLedger` 1, so the compressed goldens and the field pin cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. No suckling rate, milk share, weaning age or
mother's balance is set from a field value; no weight or input is tuned to hit one. A miss is a finding.

**Seen before this registration (disclosed).** The integrator's S5 confirm energy log
(`bench-run/artifacts/validation/e/s5/S5-energy.log`, 5 seeds × 60 days, 5911b36): infants of 1–4 y drink 307–309
kcal/day (day 168–171, night 138–139), eat 49 / 98 / 121 min a day at 1–2 / 2–3 / 3–4 y at 2.97 / 3.20 / 4.08 kcal per
eating minute; at their daylight decisions with the nurse option offered their hunger is 0.29–0.32, their foregut 0.41–0.52
full, the gland holds 7–16 kcal and is dry in 19–24% of them; the store is never full (0% of ticks) at 1–4 y; mothers'
balance −93 / −144 / −129 kcal/day at 1–2 / 2–3 / 3–4 y (−47 at 0.5–1 y). E1m §3.1 and E1n §2.4–§3.7 (read in full).
No run of this stage had been made.

## 0. The problem (from the brief; integrator's confirms, simulation truth)

- Nursing mothers are the class in deficit on every stack (S5: −0.23% of the store a day; other adult females −0.05,
  males −0.03). On S3 their balance falls with infant age: −42, −99, −147, −150 kcal/day at 0.5–1, 1–2, 2–3, 3–4 y;
  the field gives the opposite direction (emeryThompson2012: depressed for six months, then a net gain through year 2).
- E1m: from about 0.9 y every infant drinks the whole yield (307 kcal/day; the mother pays 384) to 4 y. At the
  field's eating minutes the model's infants would need 45–196 kcal/day of milk at 1–2 y, 27–130 at 2–3 y and none at
  3–4 y; they eat 0.31–0.57 of the field's eating minutes at 2.4–5.2 × the per-minute intake the field's time implies.
- E1n: a mother who refuses by day does not change the volume: the refused milk is drunk at night. The weaning age is
  still prescribed (`weanAgeMinY`, `weanAgeSpanY`).

**Question: what holds an older infant's drinking at the cap?**

## 1. Step 1: diagnosis (readouts defined here; smoke-tested on 2 days before use)

Reserved; filled in and committed before the diagnosis run.

## 2. Step 2: mechanism (only for the term the diagnosis implicates)

Reserved; filled in and committed before any run of changed code.

## 3. Benchmark and judging (from the brief; e-noise.md amendment 2)

Reference: S5 (e-stack2-confirm.md, "S5 results"; 32 switches, `bench-run/artifacts/validation/e/s5/S5-params.json`) in
quick mode, run by the integrator once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run
5911b36 (simulation code identical to this branch's start), each with `energy-diagnose` (seeds 48, 7; burn-in 30;
30 days): `bench-run/artifacts/validation/e/s5q/{S5q,S5q1,S5q2,S5q3}.json` and `…-energy.json`. Not re-run here.
Each arm = S5 + this stage's switch, same quick settings, from a frozen detached checkout of a committed head.
Judged with `judge_vs_reps.py quick custom` against the mean of the four: z = (arm − mean) ÷ (SD × √(1 + 1/n)), quick
per-run SD fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if
larger; |z| > 2 is a result. Energy, travel and party readouts against the reference's own spread (mean ± SD of its
4 runs). Viability must pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S5: 77); a switch that
removes a named rule must lower it.
