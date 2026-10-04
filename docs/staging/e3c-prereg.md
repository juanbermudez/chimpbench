# E3c pre-registration: where to eat, valued as an energy rate

Status: complete (3 October 2026, 23:40): one iteration, `forageRate` a provisional keep candidate (§8). Skeleton
committed at the start of the stage (22:46, branch `e3c-forage-rate`, from `track-e` 37a2042), before any run and before
any code change. Track E, stage E3c. Rule served: field values of behaviour are
targets, never inputs. No weight or scale is tuned to a travel share, a day range, a number of trees or a fruit share.

## 0. The problem

- **The weights under test (field profile, which e-bench runs; the brief quoted the compressed defaults).** Where to eat
  is chosen among a crown in view, the fallback food where the animal stands, an own trip to a remembered or
  community-known tree and a joined trip to a leader's goal, each in score units:
  - a crown in view: `(1.6 h + 0.1) × (0.55 + 0.45 × min(1, crop ÷ fruitValueRef)) × tripWorth − d ÷ forageDistScaleM`
    (candidates.ts:347–348; `forageDistScaleM` field 400 m, compressed 55: "tuned to T-ACT-2 and T-RNG-4 in stage C5a");
  - the fallback: `h × fallbackForageW × bestFallbackNear × leafWorth + 0.03` (candidates.ts:355; `fallbackForageW`
    field 0.45, compressed 0.65: "tuned in C5a against T-ACT-2 and T-RNG-4");
  - a trip: `h × memTravelHungerW × (0.55 + 0.45 × min(1, crop ÷ fruitValueRef)) × tripWorth − tripCost`
    (candidates.ts:373, 393, 456; `memTravelHungerW` field 1.25, compressed 0.95: "tuned to T-ACT-2 and T-RNG-4");
  - the crop shape 0.55 + 0.45 × min(1, crop ÷ `fruitValueRef`) (field 1 unit; design) on crowns and trips;
  - a hunt under `huntValue` (off in S9) also pays `dist ÷ forageDistScaleM` (candidates.ts:967).
- **Two more fitted or copied numbers, read before deciding their scope.** `fruitIntakePerH` (field 0.11 fruit units/h,
  compressed 0.055; "tuned in C5a") converts the ledger's kcal per feeding minute into crop units
  (energy.ts:593: one unit = 60 × kcal/min ÷ `fruitIntakePerH`), so it sets how many feeding hours a crown holds;
  `walkMps` (field 0.35 m/s, compressed 0.04; "from 2.7 km/day over ~21% of an 11.5 h day") is a copy of the day range
  over the travel share, used both for moving and for the walk time of every trip valuation (intake.ts:60,
  departure.ts:35, candidates.ts:670).
- **The currency the ledger already offers.** The energy an option can deliver per unit of time, net of the walk (the
  net cost of transport, sockol2007, already charged by the ledger per metre moved): the long-term average rate of net
  energy gain of optimal foraging theory (charnov1976; stephensKrebs1986).
- **E5c's lesson (e5c-prereg.md §6.1–6.2, §7).** Valuing a crown by the share of the day's need it covers, or by the
  rate at which it meets the need, cost nursing mothers 0.3–1.2% of the store a day, because dividing by the need makes
  the neediest value the same crop least. Here the two questions stay apart: how hungry the animal is decides whether
  to forage at all (the drive, E1e); where to forage is decided by the expected net rate, the same for every animal of
  a size and skill.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S9 in quick mode (seeds 48 and 7, 30 + 30 days), simulation
   truth: for foraging decisions, the terms of the chosen and the best rejected options (crop shape, distance penalty,
   fallback worth, memory worth, rain, territory, crowding), what each fitted weight contributes to the choice and to
   travel, and the realized net energy rate (kcal absorbed per minute of walking plus feeding, net of the walking cost)
   of chosen against rejected options. Reuse crown-share-diagnose (E5c) and revisit-diagnose (E3b) where they already
   read these terms. Name the terms that would change under a net-rate valuation, with numbers.
2. **Mechanism** behind a new switch (`forageRate`, 0 = today), from first principles (rate maximization: charnov1976,
   stephensKrebs1986; the walking cost sockol2007), only for the terms the diagnosis implicates. Every input sourced or
   tagged design; no fitted scale. If it removes `forageDistScaleM`, `fallbackForageW` or `memTravelHungerW`, the
   prescription count must fall accordingly.
3. At most three iterations, each logged here and committed before its run; arms = S9 + the switch, quick mode.

## 2. Diagnosis (step 1; registered 3 October 2026, 22:59, commit bdb03ac, before its runs)

**What the code does (read at 37a2042, field profile, S9's 39 switches).** A non-dependent animal's feeding options
(candidates.ts:289–457):
- a crown in view (sight 35 m by day): `(1.6 h + 0.1)·Q·tw(n) − d ÷ 400 − n·0.1·(1.3 − fruit index)·(rank factor) −
  0.45·rain − 0.6·territory − core + fig bonus`, with Q = 0.55 + 0.45·min(1, crop) the crop shape and tw(n) the C13b
  share of the animal's own full fruit rate a bout delivers, walk included (`treeIntake`: E = min(crop ÷ (1 + n) × kcal
  per unit, energy need, the bout's gut room), tw = (E ÷ R) ÷ (walk + E ÷ R); the E2c dark branch in poor light);
- the fallback where it stands: `0.45·h·leafV + 0.03 − 0.3·rain`, leafV = the fallback's kcal per hour here ÷ the
  animal's fruit rate (≈ 0.44 × the forage field's yield ÷ the skill factor; × vision in the dark);
- an own trip to a remembered or community-known tree (shortlist of 4, two travel slots): `1.25·h·Q·tw(0) −
  d ÷ 62,900 − 0.4·rain − 0.8·territory − core + sociability·fruit index·0.1`;
- a joined trip (E5a): `1.25·h·Q·tw(n at the goal) − d ÷ 62,900 + company margin − 0.3·rain`.
All carry the hash jitter (± 0.12) and the continuation bonus (+0.25, −0.5 once finished). The bounded menu holds one
option per action (menu.ts `boundedCandidates`: "places stay single"), so the fallback competes with the best crown in
view for the single forage place, and own trips with callers and the home pull for the travel place (the joined trip
keeps its own); a softmax at `rgTemperature` 0.164 draws from it. So against a crown in view, the fallback is valued at
0.45 h ÷ (1.6 h + 0.1) ≈ 0.26 of its rate and a trip at 1.25 h ÷ (1.6 h + 0.1) ≈ 0.72 of its rate, and every fruit
option carries Q (0.55–1).

**Tools.** (1) `scripts/revisit-diagnose.ts` (E3b, unchanged): walking by purpose per class, visits, returns, what ends a
visit, trees per day. **Disclosure:** it ran on S9q's parameters (seeds 48 and 7, 30 + 30 days) at 22:53–22:55, before
this registration, from the frozen checkout of f007a48 (simulation code identical); its output has not been read.
(2) `scripts/forage-rate-diagnose.ts` (new; its header defines every readout): for rules decisions of animals ≥ 8 y in
daylight (fresh draws) whose menu holds a feeding option: every feeding option's score split into its food worth, the
distance term, the crowding term and the rest, and the named contributions of the weights (crop shape; `forageDistScaleM`
on crowns, the energetic tripCost on trips; `fallbackForageW` against the crown's drive 1.6 h + 0.1; `memTravelHungerW`
against the same drive); the expected rates of every option in kcal per hour from the model's own physics (E_bout as
treeIntake, E without the need, E without the gut cap; walk time at `walkMps` with the dark pace; walking and climbing
cost from sockol2007's net cost of transport, the ledger's own); a static counterfactual of the choice (the menu rebuilt
with rg.ts `rgMenu` from the re-scored candidate list and the softmax at `rgTemperature`; identity check: the unchanged
variant must reproduce the menu and probabilities drawn from, and every rebuilt raw score must equal the published one
where it is not clamped); the realized net rate of every chosen feeding option (episodes); class energy as
energy-diagnose defines it. Static means: each decision's own options re-scored, no feedback on hunger, position or
later choices; options dropped from the candidate list (beyond the slot limits, or scored ≤ −0.4) cannot enter.

**Smoke test (seed 48, 1 + 2 days, S9; done before this registration; disclosed):** identity exact (4,483 decisions, 0
menu mismatches, probability error 0, raw scores exact for all 18,043 options); every readout filled. Seen: crown options
bind E on the gut room in 78% (need 13%, share 10%), walk 0.1 min and cost 1.7% of E (median); trips 205 m, 9.8 min,
cost 3.7% of E; the fallback's rate 0.49 of the fruit rate; counterfactual walking per decision 33 m, +47% with trips at
the crown's drive, +11% without the crop shape, −13% with the fallback at the crown's drive, +62% with the full net-rate
valuation (feeding options chosen 32% → 48% of decisions). Two days after a one-day burn-in are not representative; no
expectation below is a fit to them.

**Runs.** forage-rate-diagnose on S9q's parameters and its three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405;
seeds 48 and 7, 30 + 30 days, `--workers` 1 above load 8), from a frozen detached checkout of the commit that adds this
section. Identity: adult males' eating minutes and ground km equal `S9q-energy.json` (energy-diagnose, same world) when
the integrator's file exists.

**Reading rules (registered).**
- *R1, what each weight contributes to where animals eat:* each term put in the crown's currency alone (`-dist`: crowns
  lose d ÷ `forageDistScaleM`; `fbD`: the fallback at (1.6 h + 0.1)·leafV; `memD`: trips and joins at (1.6 h +
  0.1)·Q·tw; `noQ`: Q = 1; `noCrowd`: the habitat-index crowding off). The term is **implicated** if, in each of the
  four realizations, it moves the expected share of a chosen kind (crown, fallback, own trip + joined trip, any feeding
  option) or the expected walking distance per decision by ≥ 10% of its actual value.
- *R2, do choices follow the net rate:* among decisions with a chosen and a rejected feeding option, the share where the
  chosen one promises the higher net rate (E without the need), and both rates. Choices "follow the rate" if ≥ 70%.
- *R3, what bounds a bout's energy:* the shares of crown and trip options where the crop share, the need or the gut room
  binds E_bout; the need "matters" as a cap if it binds in ≥ 10% of either kind.
- *R4, are the expectations right:* realized net rate of chosen options by kind against the median expected; "calibrated"
  within ± 20%.
- *R5, what a net-rate valuation would change (the static `rate` variant against `actual`):* the change of each chosen
  kind's share, of the walking distance per decision and of the feeding share of decisions, reported with the reference
  spread; and by class (adult males, nursing mothers, other females, juveniles 8–12 y).

**Expected (low confidence unless stated; written knowing the smoke test).** R1: `memD` and `noQ` implicated (trips up,
distance up), `fbD` implicated (fallback up, distance down), `-dist` not implicated (crowns in view are within 35 m, so
d ÷ 400 ≤ 0.09; moderate), `noCrowd` not implicated. R2: chosen options promise the higher net rate in 60–90%. R3: the
gut room binds in ≥ 70% of crown options, the need in < 15% (moderate, E5c: 99.8% gut room below the need). R4: within
± 25%. R5: feeding options chosen more often (food is worth more against rest and grooming once the discounts go),
walking per decision up.

### 2.1 Diagnosis results (frozen checkout of 940eb94: bdb03ac plus a fix of the tool's summary, see below; seeds 48 and 7, 30 + 30 days; simulation truth)

Generated by `diag_table.py` (session scratch `e3c/`) from the tool's JSON of the four S9 realizations (S9q and the
three `rgTemperature` re-draws, the integrator's parameters). **Run note:** the first launch (frozen bdb03ac) simulated
S9q in full but its summary overflowed the stack (a spread of 124,533 values into `Math.max`) and wrote nothing; the
chain was stopped and every run repeated from 940eb94, whose only change is that line (no readout was seen from the
failed run). **Identity:** for every realization the rebuilt menu equals the menu drawn from (0 mismatches over
~120,000 decisions), the softmax probabilities match exactly, and every rebuilt raw score equals the published one
where it is not clamped (0 mismatches over ~490,000 options; 14% clamped at 0 are rebuilt from their parts). Adult
males' eating minutes and ground km equal energy-diagnose's `S9q-energy.json` (239.838 min, 1.907 km: the same world).
revisit-diagnose on S9q (walking by purpose, adult males, km a day): own trips 0.57, joined trips 0.46, callers 0.41,
drinking 0.14, patrols 0.13, other 0.11, crown approach 0.05, fallback 0.01 (ground path 1.91; nursing mothers 1.66, of
which own trips 0.58 and joined trips 0.35).

**Counterfactual choice, all (expected per decision; S9 mean ± SD of 4; change against actual, % of actual, min–max over the realizations).**

| Quantity | actual | -dist | fbD | memD | noQ | noCrowd | rate | rateStay | rateQ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| crown | 0.145 ± 0.002 | +8% (+8…+8) | -26% (-28…-26) | -18% (-19…-18) | +57% (+55…+57) | +9% (+8…+10) | +18% (+17…+19) | +7% (+6…+8) | -33% (-35…-32) |
| fallback | 0.032 ± 0.001 | -5% (-6…-3) | +297% (+284…+312) | -13% (-13…-12) | -25% (-26…-24) | -4% (-6…-3) | +76% (+65…+85) | +46% (+35…+55) | +234% (+219…+248) |
| trip + join | 0.145 ± 0.001 | -2% (-3…-2) | -12% (-14…-11) | +58% (+58…+59) | +11% (+10…+12) | -2% (-3…-1) | +78% (+77…+79) | +121% (+120…+122) | +38% (+36…+39) |
| any feeding option | 0.323 ± 0.002 | +2% (+2…+2) | +12% (+11…+14) | +17% (+16…+17) | +28% (+27…+28) | +2% (+2…+3) | +50% (+50…+52) | +62% (+61…+63) | +25% (+24…+26) |
| walking per decision (m) | 25.7 ± 0.5 | -1% (-1…-1) | -14% (-15…-13) | +54% (+53…+54) | +5% (+4…+5) | -2% (-2…-2) | +55% (+54…+56) | +119% (+117…+122) | +33% (+33…+34) |
| net rate of the food chosen (kcal/h) | 353.4 ± 0.7 | +1% (+1…+1) | -9% (-10…-9) | -1% (-1…-1) | +4% (+4…+4) | +1% (+1…+1) | -0% (-0…+0) | -3% (-4…-3) | -7% (-8…-7) |
| crop of the tree chosen | 0.412 ± 0.005 | -0% (-0…-0) | +3% (+2…+3) | +3% (+3…+4) | -11% (-12…-11) | -0% (-0…-0) | -11% (-12…-11) | -8% (-9…-8) | +5% (+4…+5) |

**Counterfactual choice, female, lactating (expected per decision; S9 mean ± SD of 4; change against actual, % of actual, min–max over the realizations).**

| Quantity | actual | -dist | fbD | memD | noQ | noCrowd | rate | rateStay | rateQ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| crown | 0.168 ± 0.003 | +8% (+7…+8) | -37% (-41…-35) | -20% (-21…-20) | +63% (+61…+66) | +8% (+7…+10) | +13% (+12…+16) | +1% (+0…+4) | -45% (-48…-42) |
| fallback | 0.043 ± 0.001 | -5% (-5…-5) | +362% (+340…+393) | -15% (-17…-14) | -34% (-35…-32) | -5% (-5…-5) | +91% (+81…+105) | +58% (+51…+68) | +288% (+267…+316) |
| trip + join | 0.146 ± 0.003 | -2% (-3…-2) | -20% (-22…-18) | +70% (+68…+71) | +14% (+13…+16) | -2% (-2…-2) | +93% (+87…+97) | +141% (+136…+145) | +39% (+36…+41) |
| any feeding option | 0.357 ± 0.006 | +2% (+2…+2) | +18% (+16…+21) | +17% (+16…+18) | +32% (+30…+33) | +2% (+2…+3) | +55% (+53…+58) | +66% (+63…+68) | +30% (+28…+32) |
| walking per decision (m) | 27.0 ± 1.6 | -1% (-1…-1) | -22% (-24…-20) | +63% (+62…+65) | +9% (+7…+11) | -2% (-2…-2) | +67% (+62…+72) | +140% (+135…+145) | +33% (+31…+36) |
| net rate of the food chosen (kcal/h) | 369.0 ± 1.0 | +1% (+1…+1) | -14% (-15…-13) | -1% (-1…-1) | +5% (+4…+5) | +1% (+1…+1) | -1% (-2…-1) | -4% (-4…-3) | -11% (-12…-10) |
| crop of the tree chosen | 0.410 ± 0.010 | -0% (-1…-0) | +3% (+3…+5) | +3% (+2…+3) | -12% (-13…-12) | -0% (-1…-0) | -13% (-14…-12) | -9% (-10…-8) | +5% (+4…+5) |

**Counterfactual choice, adult male (expected per decision; S9 mean ± SD of 4; change against actual, % of actual, min–max over the realizations).**

| Quantity | actual | -dist | fbD | memD | noQ | noCrowd | rate | rateStay | rateQ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| crown | 0.137 ± 0.003 | +9% (+9…+9) | -17% (-18…-16) | -17% (-18…-16) | +51% (+50…+51) | +8% (+8…+9) | +21% (+20…+22) | +13% (+12…+14) | -23% (-24…-23) |
| fallback | 0.019 ± 0.001 | -8% (-11…-5) | +272% (+258…+280) | -13% (-16…-11) | -22% (-25…-21) | -7% (-10…-5) | +50% (+47…+56) | +29% (+26…+35) | +196% (+184…+206) |
| trip + join | 0.148 ± 0.002 | -3% (-3…-2) | -7% (-8…-7) | +53% (+52…+53) | +9% (+8…+10) | -2% (-3…-2) | +74% (+72…+76) | +105% (+104…+107) | +40% (+39…+41) |
| any feeding option | 0.303 ± 0.004 | +2% (+2…+3) | +6% (+6…+7) | +17% (+17…+18) | +26% (+26…+26) | +2% (+2…+3) | +49% (+48…+50) | +59% (+59…+60) | +22% (+21…+22) |
| walking per decision (m) | 26.0 ± 0.6 | -1% (-1…-1) | -8% (-9…-8) | +51% (+50…+51) | +3% (+3…+4) | -2% (-2…-2) | +53% (+53…+54) | +102% (+100…+106) | +37% (+37…+38) |
| net rate of the food chosen (kcal/h) | 364.4 ± 0.8 | +0% (+0…+0) | -6% (-6…-5) | -1% (-1…-1) | +3% (+3…+3) | +1% (+1…+1) | +0% (+0…+1) | -3% (-3…-2) | -4% (-5…-4) |
| crop of the tree chosen | 0.409 ± 0.007 | -0% (-0…-0) | +2% (+2…+2) | +4% (+4…+4) | -11% (-11…-10) | -0% (-0…-0) | -10% (-11…-9) | -8% (-8…-7) | +5% (+4…+5) |

```
R1 (all decisions): a term is implicated if in every realization it moves a chosen-kind share or the walking per decision by ≥ 10%
  -dist: not implicated
  fbD: IMPLICATED: crown (26–28%); fallback (284–312%); trip + join (11–14%); any feeding option (11–14%); walking per decision (m) (13–15%)
  memD: IMPLICATED: crown (18–19%); fallback (12–13%); trip + join (58–59%); any feeding option (16–17%); walking per decision (m) (53–54%)
  noQ: IMPLICATED: crown (55–57%); fallback (24–26%); trip + join (10–12%); any feeding option (27–28%)
  noCrowd: not implicated

R2: chosen feeding option promises the higher net rate than the best rejected one (E without the need; with the stay E in brackets)
  all: n 156107; share 0.595 ± 0.003 [0.567]; net rate chosen 354 vs best rejected 337 kcal/h; distance chosen 80 vs 112 m
  crown: n 70821; share 0.930 ± 0.004 [0.912]; net rate chosen 409 vs best rejected 336 kcal/h; distance chosen 7 vs 123 m
  fallback: n 14379; share 0.324 ± 0.010 [0.009]; net rate chosen 228 vs best rejected 266 kcal/h; distance chosen 0 vs 146 m
  trip: n 47716; share 0.306 ± 0.002 [0.373]; net rate chosen 323 vs best rejected 353 kcal/h; distance chosen 183 vs 101 m
  join: n 23191; share 0.336 ± 0.011 [0.255]; net rate chosen 332 vs best rejected 354 kcal/h; distance chosen 141 vs 84 m
  terms, chosen − best rejected (mean of the realizations):
   crown: food +0.511/+0.319 (Δ +0.193), dist -0.018/-0.010 (Δ -0.007), crowd -0.019/-0.002 (Δ -0.017), company +0.000/+0.013 (Δ -0.013), rest +0.008/+0.033 (Δ -0.025), shape -0.182/-0.110 (Δ -0.072), distW -0.018/-0.010 (Δ -0.007), fbW +0.000/-0.027 (Δ +0.027), memW +0.000/-0.099 (Δ +0.099)
   fallback: food +0.084/+0.184 (Δ -0.100), dist +0.000/-0.005 (Δ +0.005), crowd +0.000/-0.003 (Δ +0.003), company +0.000/+0.011 (Δ -0.011), rest +0.062/-0.038 (Δ +0.100), shape +0.000/-0.068 (Δ +0.068), distW +0.000/-0.005 (Δ +0.005), fbW -0.162/+0.000 (Δ -0.162), memW +0.000/-0.077 (Δ +0.077)
   trip: food +0.278/+0.355 (Δ -0.077), dist -0.003/-0.010 (Δ +0.008), crowd +0.000/-0.008 (Δ +0.008), company +0.000/+0.001 (Δ -0.001), rest +0.063/+0.008 (Δ +0.055), shape -0.088/-0.125 (Δ +0.037), distW -0.003/-0.010 (Δ +0.008), fbW +0.000/-0.014 (Δ +0.014), memW -0.138/-0.065 (Δ -0.073)
   join: food +0.262/+0.340 (Δ -0.078), dist -0.002/-0.009 (Δ +0.007), crowd +0.000/-0.007 (Δ +0.007), company +0.393/+0.001 (Δ +0.392), rest +0.036/+0.056 (Δ -0.020), shape -0.112/-0.122 (Δ +0.011), distW -0.002/-0.009 (Δ +0.007), fbW +0.000/-0.028 (Δ +0.028), memW -0.130/-0.062 (Δ -0.068)

R3: what binds E_bout (share / need / gut room), and the walk
  crown: n 244534; binds share 0.068, need 0.024, room 0.909, none 0.000; d median 3 m; walk 0.1 min; cost 4.5 kcal = 0.017 of E; E_bout 227, E_stay 884 kcal; Q 0.730; tw 0.964; net 414 kcal/h
     mean terms: food +0.457, dist -0.018, crowd -0.017, company +0.000, rest -0.005, shape -0.169, distW -0.018, fbW +0.000, memW +0.000
  trip: n 265975; binds share 0.005, need 0.020, room 0.972, none 0.003; d median 145 m; walk 6.9 min; cost 9.3 kcal = 0.037 of E; E_bout 243, E_stay 1092 kcal; Q 0.742; tw 0.755; net 332 kcal/h
     mean terms: food +0.234, dist -0.003, crowd +0.000, company +0.000, rest +0.071, shape -0.076, distW -0.003, fbW +0.000, memW -0.122
  join: n 48260; binds share 0.213, need 0.010, room 0.776, none 0.001; d median 112 m; walk 5.3 min; cost 7.9 kcal = 0.040 of E; E_bout 206, E_stay 403 kcal; Q 0.693; tw 0.789; net 341 kcal/h
     mean terms: food +0.236, dist -0.002, crowd +0.000, company +0.280, rest +0.028, shape -0.103, distW -0.002, fbW +0.000, memW -0.121
  fallback: n 86061; binds share 0.000, need 0.000, room 0.000, none 1.000; d median 0 m; walk 0.0 min; cost 0.0 kcal = 0.000 of E; E_bout 0, E_stay 0 kcal; Q 1.000; tw 1.000; net 229 kcal/h; leafV 0.532
     mean terms: food +0.078, dist +0.000, crowd +0.000, company +0.000, rest +0.045, shape +0.000, distW +0.000, fbW -0.146, memW +0.000

R4: realized net rate of the chosen options (episodes) against the expected median (kcal/h)
  all: n 87349; realized 408 ± 2; expected 394; ratio 1.04; move 2.8 min, eat 18.6 min, kcal 149, cost 3.8
  crown: n 47952; realized 525 ± 2; expected 419; ratio 1.25; move 0.2 min, eat 18.8 min, kcal 169, cost 2.5
  fallback: n 11050; realized 237 ± 2; expected 232; ratio 1.02; move 2.5 min, eat 29.4 min, kcal 126, cost 0.3
  trip: n 15121; realized 324 ± 1; expected 336; ratio 0.96; move 7.7 min, eat 13.8 min, kcal 124, cost 7.5
  join: n 13226; realized 340 ± 6; expected 347; ratio 0.98; move 7.0 min, eat 14.0 min, kcal 127, cost 7.6

Class energy (this tool; energy-diagnose definitions): net rate kcal/min, realized episodes kcal/h
  adult male: class net 4.367 ± 0.046; episodes 422 ± 3; ground km 1.992; eating min 238.3
  female, lactating: class net 4.505 ± 0.024; episodes 439 ± 3; ground km 1.697; eating min 281.7
  female, other: class net 3.938 ± 0.064; episodes 371 ± 3; ground km 1.589; eating min 242.9
  juvenile 8–12 y: class net 3.865 ± 0.080; episodes 378 ± 4; ground km 1.780; eating min 258.1
```

**Reading by the registered rules.**
- **R1, what each weight does to where animals eat** (each term put in the crown's currency alone, static): the fallback
  weight (`fbD`) and the memory weight (`memD`) and the crop shape (`noQ`) are **implicated**; `forageDistScaleM` (`-dist`)
  and the habitat-index crowding (`noCrowd`) are not (crowns +8% and +9%, walking −1% and −2%: crowns in view lie within
  35 m, so d ÷ 400 is at most 0.09). `fallbackForageW` holds the fallback to a quarter of what its rate in the crown's
  currency would draw (×4.0 without it), and without it the walk per decision would be 14% shorter; `memTravelHungerW` holds trips and joins
  to 0.63 of theirs (+58% without it) and walking to 0.65 (+54%); the crop shape holds crowns to 0.64 (+57%), every
  feeding option to 0.78 against non-feeding acts (+28%), and is the only term that makes choices follow the crop (the crop
  of the tree chosen falls 11% without it).
- **R2, do choices follow the net rate:** no, by the registered rule (≥ 70%): the chosen feeding option promises the
  higher net rate than the best rejected one in 60% of decisions. Crowns in view chosen: 93% (they are 7 m away against
  122 m); own trips chosen: 31% (182 m against 100 m; carried by the rest of the score, +0.055: jitter, continuation, the
  sociability × fruit bonus, and by the crop shape, +0.037), joined trips 34% (carried by company, +0.39), the fallback
  33% (carried by the jitter and continuation, +0.10).
- **R3, what bounds a bout's energy:** the gut room (91% of crown options, 97% of trips, 78% of joins); the crop share
  in 7%, 0.5% and 21% (feeders at a leader's goal); **the need in 2%** (does not matter as a cap). A bout's energy is
  ~230 kcal, the walk costs 1.7% of it for a crown in view and 3.7% for a trip (median 145 m, 7 min).
- **R4, are the expectations right:** for trips, joins and the fallback the realized net rate is within 4% of the
  expected (calibrated); for crowns in view it is 25% higher, because the realized energy is what enters the ledger
  (fibre credited at its fermentation yield, 3 kcal/g against the formula's 1.6: × 1.24 on drupes) and figs (8.12 against
  7.39 kcal/min) are valued as drupes; trips realize 0.96 of the expectation (slower walks, shorter bouts).
- **R5, what a net-rate valuation would change (static `rate`):** feeding options chosen +51% of decisions (32% → 49%),
  the fallback +76%, own and joined trips +78%, crowns in view +18%, walking per decision +55%, the crop of the tree
  chosen −11%; the expected net rate of the food chosen does not change (353 kcal/h), because the currency raises the
  low-rate options (fallback, far trips) as much as the high-rate ones. By class the direction is the same (nursing
  mothers: feeding options 0.36 → 0.55, the fallback 0.043 → 0.082, walking per decision +67%).

**Terms that would change under a net-rate valuation, with numbers (the diagnosis's answer).** (1) The fallback's weight:
in the crown's currency the fallback would be chosen four times as often. (2) The trips' weight: trips would be chosen
58% more often and the walk per decision would rise by half. (3) The crop shape: crowns would be chosen 57% more often,
feeding options 28% more often against all other acts, and choices would no longer follow the crop beyond one bout (a
bout is ~230 kcal; E without the gut cap, min(share, need), has a median of ~880 kcal on crowns and ~1,090 on trips). The distance scale of crowns in view and the crowding
change little. The need almost never bounds a bout, so leaving it out of the rate costs nothing.

**Against the expectations of §2.** R1: as expected (`memD`, `noQ`, `fbD` implicated; `-dist` and `noCrowd` not). R2: at
the low edge of the expected 60–90% (0.60). R3: as expected (gut room ≥ 70%, need < 15%). R4: within ± 25% (crowns at
+25%, the others within 4%). R5: as expected (feeding options and walking up).

## 3. Field rows scored here: samples (sources opened or as recorded by the stage that read them; written before any arm)

| Row | Source | Sample, method (quoted where it decides the readout) | Value, band |
| --- | --- | --- | --- |
| T-ACT-1, T-ACT-2, T-ACT-3 (fitted) | villioth2025 (FT, PMC12701709 through NCBI BioC, opened here 3 October) | Budongo Waibira 2016–17, 10 adult males and 9 adult females: "Seven of the females were lactating, while two females were not lactating but travelled with a single juvenile offspring"; 491 h of focal sampling, follows 1–12 h (median 4 h); "the behavioural state of the focal individual was recorded continuously ... feeding (all behaviours related to food handling; the entire process of picking and ingesting food items), travelling (terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy), grooming (giving or receiving), resting (any period > 1 min in which the individual was sitting or lying ...)"; mass not reported | feeding 0.36 M / 0.37 F (band 0.33–0.5; uwimbabazi2019's Kanyawara mothers 309 ± 85 min); travel 0.21 / 0.20 (band 0.12–0.25; amsler2010 Ngogo control days 0.14); grooming 0.15 / 0.12 (band 0.08–0.18) |
| T-ACT-4 rest + groom (fitted) | potts2011 (read in full by E5c, Harvard DASH through Wayback), villioth2025 | Ngogo 2005–06 (1,059 h) and Kanyawara 2006 (961 h): continuous focal follows of adult males, cycling females and pregnant or lactating females; "resting includes grooming"; monthly means; mass not reported | 0.340 (Ngogo), 0.448 (Kanyawara); Waibira ≈ 0.43 (derived); band 0.3–0.47 |
| T-RNG-4 male day range (fitted) | batesByrne2009 (as e5c-prereg §2.2, e3b-prereg §3) | Budongo Sonso 2002–03, 8 adult males, GPS every 5 min while travelling, full-day follows; mass not reported | 2.7 ± 1.5 km/day; band 1.5–3.5 |
| T-FOOD-2 fruit share (fitted) | watts2012a, emeryThompson2020 (as e5c-prereg §2.2) | Ngogo 1995–2010, 125 months, focal + 15-min scans; Kanyawara 1994–2018, 240,601 feeding scans; all age-sex classes in the feeding scans; mass not reported | 72.1%, 64.0%; band 0.60–0.78 |
| T-FOOD-4 trees per day (held out, compromised) | janmaat2013b, normand2009 (as e3b-prereg §3) | Taï, 5 adult females with young, 275 full-day follows; normand2009's two females over 28 days | 7.14; 14.0 and 18.1; band 4–15 (the observer counts returns after ≥ 10 min as visits, e3b-prereg §7) |
| T-FOOD-6 revisit interval (held out) | normand2009 (FT, read by E3b), ban2014 (abstract) | Taï, the same individual, trees < 30 m apart one resource, two females followed 28 consecutive days; "On average, chimpanzees revisit a tree within 5.37 days" | 5.37; 2.5 days; band 2–7 (observer pools focals, e3b-prereg §7) |
| T-FOOD-10 departures before sunrise (held out) | janmaat2014 (FT, read by E2h) | Taï, "five adult habituated female chimpanzees", "all with young offspring (<7 y)", three fruit-scarce periods; 179 fruit-breakfast mornings; mass not given | 18% of departures before sunrise; band 0.08–0.3 |
| T-HUN-1 hunts per community-year (fitted) | gilby2015, wattsMitani2002 (as e4e-prereg §2) | Kanyawara 1996–2014: 194 hunts in 224 months, mean 11.4 adult males, all-occurrence by the followed party; Ngogo ~24 males | ≈ 10.4 per year (Kanyawara); band 5–25 (unscaled; e4e's staged 4–11 not applied) |
| True day ranges by class; reserves %/day; net energy rate by class (truth) | none scored by e-bench | energy-diagnose: ground km (horizontal steps on the ground, < 100 m a tick), the OLS slope of the daily reserves ÷ usable store (the integrator's judge convention); net rate defined in §2's tool header and below | judged against the S9 reference's own spread |

**Readouts the predictions need, and where they come from** (each defined in its tool's header; all smoke-tested on 2
days with the switch on before any arm, §5):
- T-ACT-1..4, T-RNG-4, T-FOOD-2, T-FOOD-4, T-FOOD-6, T-FOOD-10, T-HUN-1, T-PTY-1: e-bench's observer rows (pooled values
  and distances), as the sources define them through the frozen observer (src/field/metrics.ts); the known scorer
  differences for T-FOOD-4/5/6 are e3b-prereg §7's (not changed).
- True day ranges (ground km per day), eating minutes, fruit share of eating, reserves %/day by class: energy-diagnose
  (seeds 48 and 7, 30 + 30 days), the integrator's reference files for S9 and one run per arm.
- **Net energy rate by class** (simulation truth; no field row): from energy-diagnose's rows, (energy taken into the
  books − passed out unabsorbed − walking cost) ÷ (eating minutes + ground km ÷ `walkMps`), kcal per minute: "kcal
  absorbed per minute of walking plus feeding, net of walking cost" with walking minutes at the model's walking pace
  (the ground path is walked at `walkMps` except the forage pace inside a fallback cell, so this is a lower bound on the
  minutes); forage-rate-diagnose reports the same per class and per chosen option (episodes).
- Walking by purpose (own trip, joined trip, crown approach, fallback, caller, …): revisit-diagnose (E3b).

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **S9** (docs/staging/e-stack2-confirm.md, "S9 results"; parameters
  `bench-run/artifacts/validation/e/s9q/S9q-params.json`), run by the integrator in quick mode once plus three re-draws
  (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run 2bcbd33 (simulation code identical to this branch's start),
  each with `energy-diagnose` (seeds 48, 7; burn-in 30, 30 days): `bench-run/artifacts/validation/e/s9q/{S9q,S9q1,S9q2,
  S9q3}.json` and `…-energy.json`. Not re-run here.
- Each arm (S9 + this stage's switch, same quick settings) against the reference mean with the integrator's
  `judge_vs_reps.py`: z = (arm − mean) ÷ (SD × √(1 + 1/n)), quick per-run SD fitted 0.69, held-out 1.26, held-out without
  T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result; on rows scored in all runs,
  with and without T-HUN-4 and T-BRD-1, and without T-IGE-3 as well (unstable on few events).
- Energy, travel and party readouts against the reference's own spread (mean ± SD of its four runs). Viability must
  pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S9: 74); a switch that removes a named rule
  must lower it.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

- **Iteration 1** (`forageRate`; arm A1): registered in §5.1 and committed before its run (with the diagnosis results, §2.1).
  Results §6.1: provisional keep candidate.
- **No iteration 2 or 3** (decided after A1, recorded here before any further run). The two alternatives the diagnosis
  priced do not answer A1's costs: valuing a crown over the whole stay (E = min(share, need), `rateStay`) restores
  crop-following only from −11% to −8% in the static counterfactual while doubling the walk per decision (+119% against
  +55%), and keeping the crop shape on the rate (`rateQ`) keeps a design term the rate is meant to replace and raises the
  fallback further (+234%). A1's two main costs have causes outside the valuation: choices stop following the crop
  because a crown's intake never falls while it is used and parties do not empty it (E3b, E5c: the crown physics), and
  the half-rate fallback is drawn often because the choice noise (`rgTemperature`, a counted prescription, E3's
  question) is wide against the rate differences. An opportunity-cost threshold (the prey model's rule: an option below
  the animal's average rate is not taken) was considered and not built: with intake that never falls inside a crown,
  the average rate is set by in-crown eating (~0.8 of the full rate), every trip would fall below it, and an animal in an
  emptied area would value no food (a trap with no source for how the expectation decays). Code committed at ec10ed5 as
  work in progress (unrun until this registration except its unit tests and the 2-day smoke tests disclosed in §5.1).

### 5.1 Iteration 1 (registered before its run): every feeding option valued by the net energy rate it promises (`forageRate`)

**Why (§2.1).** The choice of where to eat rests on three weights that the ledger's currency can replace, and the
diagnosis names each one's part: the fallback is valued at `fallbackForageW` 0.45 h, about a quarter of what the crown's
drive gives the same rate (in the crown's currency the fallback would be chosen about four times as often); trips at
`memTravelHungerW` 1.25 h, about 0.7 of the crown's drive (in the crown's currency trips would be chosen 58% more often
and the walk per decision would rise by about half); and every fruit option carries the crop shape Q (0.55–1, mean 0.73),
which discounts food against every other act (without it feeding options would be chosen 28% more often) and is the only
term that makes choices follow the crop. `forageDistScaleM` is not implicated (crowns in view lie within 35 m: its
removal moves crowns by 8%, walking by 1%), and the habitat-index crowding moves crowns by 9% (not implicated, left
unchanged). The bout's energy is bounded by the gut room in 91% of crown and 97% of trip options and by the need in 2%
(R3), so a valuation without the need loses nothing the need was doing.

**Change (switch `forageRate`, 0 = today; acts only with `energyLedger`, `ledgerDrive` and `intakeValue` 1, as in S9).**
Every feeding option is worth the crown's drive times the net energy rate it promises, as a share of the animal's own
full ripe-fruit rate R (kcal/h; fruitRate × the ledger's kcal per fruit unit):
- a crown in view, an own trip to a remembered or community-known tree, a joined trip (E5a's destWorth):
  (1.6 h + 0.1) × (E − C) ÷ (T_walk + E ÷ (R × see)) ÷ R (intake.ts `netRateShare`), with E = min(the crop it believes
  ÷ (1 + the feeders it sees), E1e's `boutRoom`), the energy of one bout at its own intake rate (the need is not in it:
  hunger decides whether to forage, through the drive, not where); C = the energy of the walk and the climb at its own
  mass (energy.ts `locomotionKcal`: `ledgerWalkJPerKgM` × d, sockol2007's net cost of transport, plus the climb to the
  crown at `ledgerClimbEff`, the ledger's own charges); T_walk = d ÷ (`walkMps` × the E2c dark pace); feeding at the E2c
  vision on arrival (1 by day). A tree whose bout does not pay its walk is worth 0. Drupe energy, as treeIntake.
- the fallback where it stands: (1.6 h + 0.1) × leafV (its own rate here ÷ R, × vision in the dark: the existing C13b
  term), in place of `fallbackForageW` × h × leafV + 0.03.
- Not read under the switch: the crop shape (`fruitValueRef`, design), `forageDistScaleM` (crowns; hunts under
  `huntValue`, off in S9), `fallbackForageW`, `memTravelHungerW` (counted: 74 → 71) and the trips' energetic tripCost
  (`travelDistScaleM`, an input; its energy is C). `forageDistScaleM` goes because the walk's time and energy are in the
  rate (a separate distance scale would count the walk twice), not because the diagnosis implicates it.
- Unchanged: rain, territory, core area, the fig-mast bonus, the habitat-index crowding, the continuation bonus, the
  jitter, E2b's race stakes (they read the new worth), the joined trip's company, the gate's patch test.
- Sources: charnov1976, stephensKrebs1986 (the currency, research.md "Addendum: E3c forage rate"), sockol2007 (the
  walk's cost, an input already in the ledger). No new magnitude; the drive's form (1.6 h + 0.1) is the crown option's
  existing design term. Code: candidates.ts (`forageRateOn`, `rateWorth`), intake.ts (`netRateShare`), energy.ts
  (`locomotionKcal`); data/params.json `forageRate` (design, switch); scripts/lib/prescriptions.ts (ACTIVE_WHEN for the
  three ids; TRACK_E_SWITCHES); tests/sim-forage-rate.test.ts (0 by default; deterministic over a field day; the three
  weights and the crop shape unread; count −3; a crown's worth independent of `forageDistScaleM` on, dependent off; a
  farther crown worth less; a crop beyond one bout adds nothing, a smaller one lowers the rate; co-feeders take their
  share; the rate independent of the reserves; the fallback independent of `fallbackForageW` on).

**Smoke tests with the switch on (seed 48, 1 + 2 days; disclosed):** forage-rate-diagnose (identity exact with the
switch-aware decomposition: 0 menu mismatches, 0 raw-score mismatches), energy-diagnose and e-bench (`--days 2`):
every readout filled, prescriptions 71. Seen: adult males walked 3.2 km/day over those two days (2.7 in the switch-off
smoke test of §2); not representative and not used below.

**Arm A1** = S9 + `forageRate` 1 (S9q's parameters), from a frozen detached checkout of the commit that adds this
section: energy-diagnose, then forage-rate-diagnose, then `e-bench --quick` (seeds 48 and 7, burn-in 30, 30 days;
`--workers` 1 above load 8). Judged per §4 with `e3c_judge.py` (session scratch `e3c/`: the integrator's
`judge_vs_reps.py` for the sums, the integrator's slope convention for reserves, the tables from the JSON).

**Predictions (A1 against the S9q mean ± SD of its four realizations; low confidence unless stated).**

| Quantity | S9q (mean ± SD) | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 74 | 71 | high |
| Viability | pass | pass | moderate |
| Chosen feeding options among fresh decisions (forage-rate-diagnose `actual`): trips + joins; fallback | 0.145; 0.032 | both ≥ 25% up | moderate |
| Crop of the tree chosen | 0.41 | ≥ 5% lower | moderate |
| True ground km, adult males / mothers / other females / juveniles | 1.99 / 1.70 / 1.56 / 1.88 (± 0.03–0.10) | each +15% to +50% | low |
| T-ACT-2 travel | 0.173 ± 0.011 | 0.19–0.25 | low |
| T-RNG-4 male day range (observer, km) | 1.82 ± 0.19 | 2.0–2.8 | low |
| T-FOOD-2 fruit share | 0.800 ± 0.013 | 0.70–0.78 (into its band) | moderate |
| Fruit share of eating, by class (energy-diagnose) | males 0.85, mothers 0.78 | each lower | moderate |
| T-ACT-1 feeding; eating minutes by class | 0.371 ± 0.006; 235–282 min | 0.36–0.42; each within −5 to +30 min | low |
| T-ACT-4 rest + groom; T-ACT-3 grooming | 0.391 ± 0.011; 0.097 ± 0.003 | lower; 0.07–0.10 | low |
| Net energy rate by class (energy-diagnose definition, kcal/min) | males 4.37, mothers 4.51, other F 3.96, juveniles 3.27 (± 0.02–0.08) | each lower by 3–15% (more walking minutes, more fallback) | low |
| Reserves %/day, mothers / juveniles 5–12 y | −0.002 ± 0.007 / −0.014 ± 0.012 | each within ± 0.03 of the reference | low |
| T-HUN-1 | 43.8 ± 7.1 | 45–65 (more walking meets more colobus) | low |
| T-FOOD-4; T-FOOD-6; T-FOOD-10 | 7.9 ± 0.3; 5.1 ± 0.5; 0.71 ± 0.05 | 8–11; no direction; within ± 0.1 | low |
| Fitted; held-out with and without T-HUN-4 and T-BRD-1 | reference mean | inside noise | low |

**Kill criterion (registered).** Null if (a) viability fails (a starvation death, or a seed below 80% of its start); (b)
any class's reserve slope is more than 0.05% of the store a day below the S9q mean; (c) held-out without the rare rows is
worse beyond noise (z > +2), or with them; or (d) the mechanism does not run (neither trips + joins nor the fallback
chosen at least 10% more often than in every reference realization).

**Verdict rule (registered).** `forageRate` removes three counted prescriptions, so the track's keep rule applies:
viability passes, held-out (with and without T-HUN-4 and T-BRD-1, and reported without T-IGE-3) not worse beyond noise,
prescriptions 74 → 71. If none of (a)–(d) holds and the keep rule passes, it is a **provisional keep candidate** for the
integrator's 5-seed confirm; otherwise it is recorded and stays off. Travel, day ranges and the fruit share are reported
against the reference, never used to choose.

- **Final checks** (after merging track-e 22de34b once, da893b1): `gen-params --check` clean, `tsc --noEmit` clean,
  `pnpm test` 728 tests: 727 pass, 0 fail, 1 skipped. Outputs (local, gitignored, copied from the session scratch `e3c/` to `artifacts/validation/e3c/`): `diag/` (the four S9
  diagnoses, revisit-diagnose on S9q), `arms/` (A1's e-bench, energy and rate JSON, the judge's output), the table scripts
  `diag_table.py`, `e3c_judge.py`, `final_table.py`, `fill_diag.py`.

## 6. Results

### 6.1 Iteration 1: A1 = S9 + `forageRate` (frozen checkout of 17d8765)

Generated by `e3c_judge.py` and `diag_table.py` (session scratch `e3c/`) from the JSON: e-bench, energy-diagnose and
forage-rate-diagnose of A1 (frozen checkout of 17d8765, `git.dirty` 0; 23:17–23:24, load 7.7–9.5) against the four S9
realizations (the integrator's runs at 2bcbd33; forage-rate-diagnose of the same parameters at 940eb94).

```
reference runs: ['S9q', 'S9q1', 'S9q2', 'S9q3']; arms: ['A1']
  S9q: 2bcbd33 dirty 0 prescriptions 74 viability pass (seed, deaths, starvation, living): [(48, 0, 0, 49), (7, 0, 0, 49)]
  S9q1: 2bcbd33 dirty 0 prescriptions 74 viability pass (seed, deaths, starvation, living): [(48, 0, 0, 49), (7, 2, 0, 47)]
  S9q2: 2bcbd33 dirty 0 prescriptions 74 viability pass (seed, deaths, starvation, living): [(48, 0, 0, 49), (7, 0, 0, 49)]
  S9q3: 2bcbd33 dirty 0 prescriptions 74 viability pass (seed, deaths, starvation, living): [(48, 0, 0, 49), (7, 0, 0, 49)]
  A1: 17d8765 dirty 0 prescriptions 71 viability pass (seed, deaths, starvation, living): [(48, 0, 0, 49), (7, 0, 0, 49)]

quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 13
  fitted             (16 rows) ref 1.96, 2.56, 1.94, 3.91 (mean 2.59, sd 0.92; used 0.92) | A1.json: 1.59, Δ -1.00, z -1.0 (inside noise)
  held-out           (13 rows) ref 5.57, 5.02, 5.49, 4.15 (mean 5.06, sd 0.65; used 1.26) | A1.json: 4.09, Δ -0.97, z -0.7 (inside noise)
  held-out w/o rare  (12 rows) ref 4.91, 4.39, 4.83, 3.91 (mean 4.51, sd 0.46; used 0.48) | A1.json: 4.08, Δ -0.43, z -0.8 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-7  held-out ref 0.24±0.02 | A1.json 0.35 (fail)
   T-HUN-1   fitted   ref 0.94±0.35 | A1.json 0.05 (inconclusive)
   T-HUN-4   held-out ref 0.55±0.20 | A1.json 0.01 (fail)

held-out without T-BRD-1, T-HUN-4, T-IGE-3 (12 rows): S9q 4.91 / 4.39 / 4.83 / 3.91 (mean 4.51, sd 0.46; used 0.48); A1 4.08 (z -0.8)
fitted without T-BRD-1, T-HUN-4, T-IGE-3 (16 rows): S9q 1.96 / 2.56 / 1.94 / 3.91 (mean 2.59, sd 0.92; used 0.92); A1 1.59 (z -1.0)
T-IGE-3 distance by run (S9q group, then arms): [None, None, None, None, None]
T-RNG-5 distance by run (S9q group, then arms): [1.35, 0.95, 1.38, 0.41, 0.27]
T-HUN-4 distance by run (S9q group, then arms): [0.66, 0.63, 0.66, 0.24, 0.01]
T-BRD-1 distance by run (S9q group, then arms): [None, None, None, None, None]
T-FOOD-5 distance by run (S9q group, then arms): [0, 0, 0, 0, 0]

```

| Reserves ÷ store, % per day (OLS) | S9q runs | S9q mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male | +0.005 / -0.004 / -0.002 / +0.004 | +0.001 ± 0.004 | -0.005 (z -1.2) |
| female, other | -0.009 / +0.006 / -0.004 / +0.018 | +0.003 ± 0.012 | +0.024 (z +1.6) |
| female, lactating | +0.001 / -0.007 / +0.007 / -0.008 | -0.002 ± 0.007 | -0.023 (z -2.7) |
| juvenile 5–12 y | -0.029 / +0.001 / -0.013 / -0.015 | -0.014 ± 0.012 | -0.018 (z -0.3) |
| infant 2–5 y | +0.002 / -0.013 / +0.007 / -0.005 | -0.002 ± 0.008 | -0.004 (z -0.1) |
| infant 0.5–2 y | -0.001 / -0.003 / +0.005 / -0.005 | -0.001 ± 0.004 | -0.040 (z -7.8) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Ground km / eating min / fruit share / kcal in / net rate (energy-diagnose) | S9q runs | S9q mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male: groundKm | 1.907 / 1.917 / 2.044 / 2.099 | 1.992 ± 0.095 | 2.267 (z +2.6) |
| adult male: eatingMin | 239.838 / 237.370 / 238.410 / 237.599 | 238.304 ± 1.116 | 251.833 (z +10.8) |
| adult male: fruitShare | 0.840 / 0.837 / 0.855 / 0.863 | 0.849 ± 0.012 | 0.782 (z -4.9) |
| adult male: kcalIn | 2030.659 / 1997.897 / 2033.349 / 2027.961 | 2022.467 ± 16.527 | 2057.937 (z +1.9) |
| adult male: net rate kcal/min | 4.423 / 4.380 / 4.355 / 4.312 | 4.368 ± 0.046 | 4.072 (z -5.7) |
| adult male: walk kcal/day | 69.730 / 69.959 / 74.430 / 76.432 | 72.638 ± 3.328 | 82.431 (z +2.6) |
| female, other: groundKm | 1.652 / 1.439 / 1.582 / 1.584 | 1.564 ± 0.090 | 1.598 (z +0.3) |
| female, other: eatingMin | 237.759 / 233.114 / 235.628 / 233.580 | 235.020 ± 2.127 | 262.431 (z +11.5) |
| female, other: fruitShare | 0.634 / 0.669 / 0.660 / 0.672 | 0.659 ± 0.017 | 0.539 (z -6.2) |
| female, other: kcalIn | 1717.546 / 1692.311 / 1715.210 / 1719.126 | 1711.048 ± 12.595 | 1754.128 (z +3.1) |
| female, other: net rate kcal/min | 3.854 / 4.042 / 3.944 / 3.980 | 3.955 ± 0.078 | 3.659 (z -3.4) |
| female, other: walk kcal/day | 48.674 / 42.371 / 46.638 / 46.817 | 46.125 ± 2.666 | 47.108 (z +0.3) |
| female, lactating: groundKm | 1.664 / 1.677 / 1.733 / 1.715 | 1.697 ± 0.032 | 1.980 (z +7.9) |
| female, lactating: eatingMin | 281.249 / 280.082 / 284.396 / 280.965 | 281.673 ± 1.882 | 316.464 (z +16.5) |
| female, lactating: fruitShare | 0.776 / 0.786 / 0.774 / 0.787 | 0.781 ± 0.007 | 0.613 (z -22.0) |
| female, lactating: kcalIn | 2252.364 / 2238.465 / 2262.725 / 2256.394 | 2252.487 ± 10.275 | 2312.851 (z +5.3) |
| female, lactating: net rate kcal/min | 4.519 / 4.520 / 4.470 / 4.511 | 4.505 ± 0.024 | 3.991 (z -19.4) |
| female, lactating: walk kcal/day | 53.317 / 53.496 / 54.986 / 54.834 | 54.158 ± 0.873 | 61.246 (z +7.3) |
| juvenile 5–12 y: groundKm | 1.905 / 1.803 / 1.852 / 1.975 | 1.884 ± 0.073 | 2.039 (z +1.9) |
| juvenile 5–12 y: eatingMin | 267.035 / 267.966 / 268.155 / 266.443 | 267.400 ± 0.804 | 274.938 (z +8.4) |
| juvenile 5–12 y: fruitShare | 0.927 / 0.921 / 0.922 / 0.926 | 0.924 ± 0.003 | 0.845 (z -21.9) |
| juvenile 5–12 y: kcalIn | 1625.856 / 1615.757 / 1630.262 / 1630.154 | 1625.507 ± 6.816 | 1637.114 (z +1.5) |
| juvenile 5–12 y: net rate kcal/min | 3.257 / 3.301 / 3.290 / 3.242 | 3.272 ± 0.028 | 3.148 (z -4.0) |
| juvenile 5–12 y: walk kcal/day | 61.743 / 56.584 / 61.140 / 61.212 | 60.170 ± 2.406 | 63.809 (z +1.4) |

| Row (pooled) | Band | S9q runs | S9q mean ± SD | A1 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.379 / 0.368 / 0.365 / 0.370 | 0.371 ± 0.006 | 0.396 (z +3.9) |
| T-ACT-2 | 0.12–0.25 | 0.166 / 0.162 / 0.176 / 0.188 | 0.173 ± 0.011 | 0.197 (z +1.9) |
| T-ACT-3 | 0.08–0.18 | 0.101 / 0.100 / 0.095 / 0.094 | 0.097 ± 0.003 | 0.085 (z -3.4) |
| T-ACT-4 | 0.3–0.47 | 0.396 / 0.376 / 0.391 / 0.400 | 0.391 ± 0.011 | 0.299 (z -7.7) |
| T-PTY-1 | 3–9 | 4.096 / 3.938 / 3.861 / 3.942 | 3.959 ± 0.098 | 4.124 (z +1.5) |
| T-RNG-4 | 1.5–3.5 | 1.670 / 1.682 / 1.840 / 2.068 | 1.815 ± 0.186 | 2.592 (z +3.7) |
| T-RNG-5 | 0.3–0.6 | 1.006 / 0.886 / 1.013 / 0.724 | 0.907 ± 0.135 | 0.681 (z -1.5) |
| T-HUN-1 | 5–25 | 37.896 / 43.641 / 39.891 / 53.852 | 43.820 ± 7.100 | 25.929 (z -2.3) |
| T-HUN-3 | 0.05–0.4 | 0.081 / 0.075 / 0.102 / 0.085 | 0.086 ± 0.012 | 0.081 (z -0.4) |
| T-FOOD-2 | 0.6–0.78 | 0.798 / 0.789 / 0.795 / 0.818 | 0.800 ± 0.013 | 0.701 (z -7.0) |
| T-FOOD-4 | 4–15 | 8.148 / 7.528 / 7.981 / 7.897 | 7.888 ± 0.262 | 8.429 (z +1.8) |
| T-FOOD-5 | 0.15–0.45 | 0.394 / 0.392 / 0.386 / 0.388 | 0.390 ± 0.004 | 0.268 (z -28.7) |
| T-FOOD-6 | 2–7 | 4.985 / 4.660 / 5.086 / 5.861 | 5.148 ± 0.509 | 4.245 (z -1.6) |
| T-FOOD-10 | 0.08–0.3 | 0.696 / 0.657 / 0.769 / 0.712 | 0.709 ± 0.046 | 0.772 (z +1.2) |

A1 T-ACT-1 by sex {'male': 0.359, 'female': 0.426}; T-ACT-2 {'male': 0.228, 'female': 0.172}; T-ACT-3 {'male': 0.109, 'female': 0.065}
  A1: 1.98 ÷ 2.27 = 0.873

| forage-rate-diagnose (truth) | S9q runs | S9q mean ± SD | A1 |
| --- | --- | --- | --- |
| actual: crown | 0.143 / 0.145 / 0.144 / 0.148 | 0.145 ± 0.002 | 0.112 (z -13.7) |
| actual: fallback | 0.033 / 0.031 / 0.032 / 0.031 | 0.032 ± 0.001 | 0.059 (z +25.5) |
| actual: trip | 0.097 / 0.098 / 0.099 / 0.100 | 0.099 ± 0.001 | 0.139 (z +28.1) |
| actual: join | 0.047 / 0.047 / 0.047 / 0.046 | 0.047 ± 0.001 | 0.114 (z +120.3) |
| actual: other | 0.679 / 0.677 / 0.677 / 0.674 | 0.677 ± 0.002 | 0.575 (z -44.1) |
| actual: pFood | 0.320 / 0.322 / 0.323 / 0.325 | 0.323 ± 0.002 | 0.424 (z +43.6) |
| actual: dPerDecision | 25.476 / 25.038 / 26.104 / 26.156 | 25.694 ± 0.535 | 29.310 (z +6.0) |
| actual: netGivenFood | 353.333 / 354.060 / 352.378 / 353.799 | 353.392 ± 0.740 | 350.123 (z -4.0) |
| actual: cropGivenTree | 0.415 / 0.405 / 0.415 / 0.412 | 0.412 ± 0.005 | 0.307 (z -19.9) |
| decisions per animal-day: adult male | 58.569 / 58.497 / 57.146 / 58.218 | 58.108 ± 0.659 | 64.780 (z +9.1) |
| decisions per animal-day: female, lactating | 51.085 / 49.100 / 47.713 / 48.400 | 49.075 ± 1.455 | 51.713 (z +1.6) |
| decisions per animal-day: female, other | 51.789 / 48.833 / 51.061 / 51.546 | 50.807 ± 1.351 | 51.198 (z +0.3) |
| decisions per animal-day: juvenile 8–12 y | 45.611 / 42.322 / 45.878 / 46.017 | 44.957 ± 1.765 | 47.406 (z +1.2) |
| episodes all: realized net kcal/h | 408.155 / 407.711 / 406.413 / 410.134 | 408.103 ± 1.542 | 365.720 (z -24.6) |
| episodes crown: realized net kcal/h | 525.329 / 521.496 / 524.824 / 526.538 | 524.547 ± 2.157 | 504.882 (z -8.2) |
| episodes fallback: realized net kcal/h | 240.096 / 238.010 / 236.148 / 235.674 | 237.482 ± 2.013 | 244.435 (z +3.1) |
| episodes trip: realized net kcal/h | 324.014 / 326.093 / 324.725 / 323.000 | 324.458 ± 1.300 | 338.621 (z +9.7) |
| episodes join: realized net kcal/h | 343.584 / 338.806 / 344.899 / 331.856 | 339.786 ± 5.900 | 353.318 (z +2.1) |
| episodes crown: n | 12152.000 / 11645.000 / 11861.000 / 12294.000 | 11988.000 ± 291.153 | 8921.000 (z -9.4) |
| episodes fallback: n | 2945.000 / 2577.000 / 2847.000 / 2681.000 | 2762.500 ± 164.822 | 4856.000 (z +11.4) |
| episodes trip: n | 3776.000 / 3812.000 / 3760.000 / 3773.000 | 3780.250 ± 22.277 | 4890.000 (z +44.6) |
| episodes join: n | 3363.000 / 3322.000 / 3263.000 / 3278.000 | 3306.500 ± 45.229 | 5684.000 (z +47.0) |
| class net rate kcal/min: adult male | 4.423 / 4.380 / 4.355 / 4.312 | 4.367 ± 0.046 | 4.072 (z -5.7) |
| class net rate kcal/min: female, lactating | 4.519 / 4.520 / 4.470 / 4.511 | 4.505 ± 0.024 | 3.991 (z -19.4) |
| class net rate kcal/min: female, other | 3.861 / 4.004 / 3.915 / 3.974 | 3.938 ± 0.064 | 3.405 (z -7.5) |
| class net rate kcal/min: juvenile 8–12 y | 3.778 / 3.956 / 3.904 / 3.820 | 3.865 ± 0.080 | 3.825 (z -0.4) |
| realized net kcal/h (episodes): adult male | 422.053 / 417.821 / 423.220 / 423.548 | 421.661 ± 2.639 | 392.443 (z -9.9) |
| realized net kcal/h (episodes): female, lactating | 440.739 / 437.516 / 435.629 / 441.238 | 438.781 ± 2.671 | 385.732 (z -17.8) |
| realized net kcal/h (episodes): female, other | 371.027 / 372.609 / 366.671 / 372.012 | 370.580 ± 2.686 | 311.535 (z -19.7) |
| realized net kcal/h (episodes): juvenile 8–12 y | 381.104 / 371.637 / 378.062 / 379.911 | 377.678 ± 4.218 | 362.103 (z -3.3) |

**T-IGE-1 (fitted) is not in the shared sums** (excluded in S9q3, too few events). A1 scores 2.20 (27.4 encounters per
community-year: seed 48 6.0, seed 7 49.5) against 0.06–0.49 in the three reference runs that score it (4.6–15.4 per
community-year; seed 7 3.2–20.7). Sensitivity, not the registered test: fitted on the 17 rows counted in A1 and those
three runs, S9q 2.45 / 2.76 / 2.00 against A1 3.79, z +1.7 (inside noise). The e-bench headline (every row A1 scores)
is fitted 3.79, held-out 4.69.

**What changed (simulation truth).** Feeding options were chosen at 42% of fresh decisions instead of 32% (+31%): the
fallback +86%, own trips +41%, joined trips +144%, crowns in view −23%; daylight hunger fell in every adult class
(males 0.276 → 0.223, nursing mothers 0.33 → 0.27), eating minutes rose (males +14, other females +27, mothers +35,
juveniles +8) and intake by 1–3%. The fruit share of eating fell in every class (mothers 0.78 → 0.61, other females 0.66
→ 0.54) and the hindgut was full more often (mothers 3% → 14% of daylight: the fallback's fibre). Walking rose for males
(+14%), mothers (+17%) and juveniles (+8%), barely for other females (+2%); walking per decision +14%. The net energy
rate per minute of eating and walking fell (males −7%, mothers −11%, other females −7%, juveniles −4%): the animals took
more of the half-rate fallback. Of the chosen feeding options, 58% promised a higher net rate than the best rejected
one (59.5% in S9): with rate differences of 0.1–0.3 score units against the choice noise (`rgTemperature` 0.164, the
± 0.12 jitter, the +0.25 continuation) the valuation does not make the choices follow the rate any better. The crop of
the tree chosen fell 25% (the static counterfactual put the loss of crop-following at 11%; the rest is lower crops).
Hunting fell (T-HUN-1 43.8 → 25.9, the band's top): the design-valued hunt lead now loses to food valued at its rate.
Infants of 0.5–2 y show a slope of −0.040%/day because their class starts the window higher (−0.020 against −0.025 to
−0.033) and ends where the reference's does (−0.030): the burn-in ran with the switch on.

**Against the predictions.** Prescriptions 71: held. Viability: held (no death). Trips + joins and the fallback ≥ 25%
up: held (+72%, +86%). Crop of the tree chosen ≥ 5% lower: held (−25%). True ground km +15% to +50% for every class:
missed for other females (+2%), juveniles (+8%) and narrowly males (+14%); mothers +17% held. T-ACT-2 0.19–0.25: held
(0.197). T-RNG-4 2.0–2.8: held (2.59). T-FOOD-2 0.70–0.78: held, at its edge (0.701). Fruit share lower in every class:
held. T-ACT-1 0.36–0.42: held (0.396); eating minutes within −5 to +30: missed for mothers (+35). T-ACT-4 lower: held
(0.299, just below its band); T-ACT-3 0.07–0.10: held (0.085; females 0.065, below their band). Net rate lower by 3–15%:
held (−4% to −11%). Reserves within ± 0.03: held (mothers −0.023 against −0.002; juveniles −0.018 against −0.014).
T-HUN-1 45–65: missed, in reverse (25.9). T-FOOD-4 8–11: held (8.43); T-FOOD-10 within ± 0.1: held (+0.06). Sums inside
noise: held (fitted z −1.0; held-out z −0.7; without the rare rows z −0.8; T-BRD-1 and T-IGE-3 are not scored in quick
mode, so the three held-out readings without them coincide).

**Kill criterion: not met.** (a) No death; (b) the largest fall against the S9q mean is infants of 0.5–2 y, −0.039% of
the store a day (under 0.05; a starting-level effect, above), then mothers −0.021; (c) held-out not worse (z −0.7 with
the rare rows, −0.8 without); (d) the mechanism runs (trips + joins +72%, fallback +86%).

**Verdict rule: met. `forageRate` is a provisional keep candidate** for the integrator's 5-seed confirm (S9 +
`forageRate`): viability passes, held-out is not worse beyond noise with or without the rare rows (and without
T-IGE-3), prescriptions 74 → 71 (`forageDistScaleM`, `fallbackForageW`, `memTravelHungerW` out). Costs to watch in the
confirm (reported, never used to choose): rest at its band's floor (T-ACT-4 0.299) and females' grooming below theirs
(0.065), reconciliation below band (T-SOC-9 0.04), intergroup encounters on one seed (T-IGE-1, 49 per community-year),
nursing mothers' energy (−0.021% of the store a day against S9q, eating +35 min, net rate −11%), crop-blind choices.
Gains: fruit share into its band (0.80 → 0.70), hunting to its band (43.8 → 25.9), T-RNG-5 closer (0.91 → 0.68).

## 7. Known defects in the code under test

Deferred (written before A1's run), none in the paths the switch leaves at 0:
- `netRateShare` (src/sim/intake.ts:89) values every crown at drupe energy, as `treeIntake` (intake.ts:58) has since
  C13b, while feeding eats figs at fig energy (execution.ts:996, `fruitKcalPerUnit(P, fig)`): under the sugar-based food
  energy a fig crown yields 8.12 kcal/min against 7.39 valued (+10%). Not changed: the fig-mast bonus and the gate read
  the same convention, and changing the food types' valuation is not this stage's question.
- The walk's cost in `netRateShare` is the animal's own mass (energy.ts `locomotionKcal`); the ledger also charges a
  carrier for a carried infant's mass (energy.ts `rideTick`), so a carrying mother's walk is valued 10–30% too cheaply on
  a term that is 2–4% of a bout's energy. Not changed (second order).
- The gate's patch test (rg.ts `patchPoorHere`) still compares gross rates from `treeIntake` (the need and gut cap in E):
  when to leave is not this stage's question.
- forage-rate-diagnose's realized energy is what enters the ledger (fibre at its fermentation yield, × 1.24 on drupes),
  the expected one formula energy: the 25% excess of crowns' realized rate over the expected is partly this definition.

## 8. Stage verdict

- **Diagnosis (S9, quick, four realizations, simulation truth).** Where an animal eats rests on three weights fitted in
  C5a: in the crown's currency the fallback would be chosen four times as often (`fallbackForageW` 0.45 h values it at a
  quarter of its rate) and trips 58% more often with half again the walk per decision (`memTravelHungerW` 1.25 h); the
  crop shape (design) discounts every fruit option by about a quarter against other acts and is the only term that makes
  choices follow the crop; `forageDistScaleM` changes choices by 8% (crowns in view lie within 35 m). A bout's energy
  (~230 kcal) is bounded by the gut room in 91–97% of options and by the need in 2%; only 60% of chosen feeding options
  promise a higher net rate than the best rejected one.
- **Iteration 1, `forageRate`** (every feeding option worth the crown's drive × the net energy rate it promises ÷ the
  animal's own fruit rate; a bout's energy less the walk's and the climb's cost over walk and eating; the fallback at
  its own rate): viable, fitted and held-out inside noise (z −1.0, −0.7; −0.8 without the rare rows), prescriptions 74 →
  71: **provisional keep candidate**, off, for the integrator's 5-seed confirm. Food chosen at 42% of decisions instead
  of 32%, the fallback and trips up by 86% and 72%, walking +2–17%, fruit share 0.80 → 0.70 (into its band), hunting
  43.8 → 25.9 (to its band); costs: rest at its band's floor, females' grooming and reconciliation below theirs, nursing
  mothers eat 35 min more for a −0.021%/day lower slope, the net rate per minute falls 4–11% (more half-rate fallback),
  choices no longer follow the crop.
- **What it means.** One currency is enough to replace the three fitted weights without breaking the stack, and it puts
  the hunger drive and the rate in their places (whether, where). It exposes two prescriptions that the weights were
  compensating: the choice noise (`rgTemperature`: rate differences of 0.1–0.3 score units are drawn at a temperature of
  0.164, so a valuation by rate does not make choices follow the rate any better, 58%), and the crown physics (a crown's
  intake never falls while it is used and parties do not empty it, so a crop beyond one bout is worth nothing more).
- **Open.** (i) Choice sharpness from the animal's state instead of `rgTemperature` (E3's `urgencyChoice` on this
  currency). (ii) Within-crown diminishing returns or party depletion, so that the crop matters beyond one bout (E3b,
  E5c). (iii) The fallback's gut cost (fibre fills the hindgut: mothers' hindgut full 3% → 14% of daylight), which a rate
  per minute does not see. (iv) `fruitIntakePerH` (field 0.11) sets how many feeding hours a crop unit holds and
  `walkMps` (0.35 m/s) how long a walk takes: both are copies of behaviour and enter the rate (§0); replacing them needs a
  sourced crown energy content and a wild travel speed between trees.
