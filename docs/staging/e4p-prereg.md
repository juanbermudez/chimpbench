# E4p pre-registration: mating without quotas

Branch `e4p-mating` from `track-e` aa698bd. Track E, stage E4p. Rules policy only; development seeds 48 and 7; no run
longer than 90 days in all. Started 4 October 2026, 15:49.

Rule served: field values of behaviour are targets to benchmark against, never inputs. No value, bonus or weight is
added or tuned to reach a copulation rate or a party composition.

This file is written in steps, each committed before the step it governs: §0–§1 (problem, plan) at the start; §2–§3
(rows and samples, diagnosis readouts) before the diagnosis runs on unchanged code; §5–§8 (mechanism, readouts, arms,
predictions, kill criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 0. The problem (from the brief; to be verified in §4)

Four counted mating rules are active on S27 (51 prescriptions on the current ledger, E0b):

| Rule (ledger) | Where (aa698bd) | What it does (as read from the code) |
| --- | --- | --- |
| `mateIntervalH` 1.5 h (registry, design; quota) | `src/sim/candidates.ts:1137, 1159` (offers), `src/sim/execution.ts:810` (guard), `:822` (consort), `:1216` (mateTick) | a male may copulate again only 1.5 h after his last copulation; it gates his offer, a female's offer to him, and copulation inside guarding, consorting and the mate act |
| female gap 0.3 h (literal, E0b) | `src/sim/candidates.ts:1158` | a swollen female offers to mate only 0.3 h after her own last copulation |
| failed-approach block 0.5 h (literal, E0b; with `mateApproachS`) | `src/sim/execution.ts:1212, 1217` (mateTick's two exits) | a male whose approach fails (not reached within `mateApproachS`, or 8 ticks beside her without copulating) is blocked as if he had copulated 1 h ago, i.e. for 0.5 h |
| rival-chase gap 0.25 h (literal, E0b) | `src/sim/execution.ts:807` | a guarding male interrupts himself to chase a rival only 0.25 h after his own last aggression |

E4o's diagnosis on S27 (e4o-prereg.md §4, 30 + 60 days, seeds 48 and 7, four realizations): ~0.6 copulations per
hour for each adult male with a maximally swollen female (dyadic rate 0.59 per daylight hour together), 10–20× Kanyawara's
(0.03–0.064, muller2007) and ~20× Taï's (~0.03, gomesBoesch2009); per adult male-hour 0.12 (Kalinzu 0.12, Mahale
0.20–0.22) only because males are rarely with a swollen female (most maximally swollen female-hours have 0–2 adult males
in the party, against 4–12 in the field); without the quota males would choose to mate about 6× as often. No measured
male refractory physiology exists; captive males ejaculate about hourly (marson1989).

## 1. Plan

1. Sources and samples (§2): every field value the stage reports, opened at its source, with its sample and method.
2. Diagnosis (§3, registered before its runs) on S27 with unchanged simulation code, 30 + 60 days, seeds 48 and 7
   (S27 once plus one `rngSalt` re-draw; E4o's D0b–D3b reused where their readouts suffice): maximally swollen
   female-hours by adult males in her party and why males are absent; attempts, refusals, successes per dyad-hour;
   which of the four gaps binds each time; guarding and rival chases.
3. One switch (0 = today), only for what the diagnosis implicates (§5).
4. Arms on S27 in quick mode against the integrator's S27q group (bench-run3 28d249e, four runs), plus the mating
   readouts at 30 + 60 days against the mating reference; at most three iterations, each logged in §9 and committed
   before its run.

## 2. Field values reported, and their samples (written before the diagnosis runs)

No row of `data/targets.json` measures copulation rates or the males with a swollen female; these values are reported as
simulation truth beside their sources (context, never summed, never inputs). The e-bench rows the arms are judged on
(T-ACT-1..4, T-PTY-1, T-RNG-4, T-HUN-*, T-SOC-*, T-IGE-*, T-PAT-*, T-FOOD-*) keep the samples recorded by the stages that
audited them (e4o-prereg.md §2; e5a-prereg.md §1.1; e5b-prereg.md §1). Opened by this stage (BioC full text) or by E4o
today (its downloads in the session scratch `e4o/src-mate/ft/`, read again here):

| Value | Source, sample, method (quoted where it decides comparability) | Opened |
| --- | --- | --- |
| Dyadic rate 0.03–0.064 copulations per hour together | muller2007 (Kanyawara 1998–2005, 13 adult males, 15 parous females; "Copulations ... recorded using all-occurrence sampling"; dyads "observed together for at least 25 h when the female was in oestrus"; per male, median rates with the parous females he was more / less aggressive towards, 0.064 / 0.03 per hour) | E4o FT (e4o-prereg §2) |
| Per oestrous female-hour 0.14 (Taï) | gomesBoesch2009 (FT, PMC2663035; Taï South 2003–06): "the group consisted of 49 individuals, 5 adult males and 14 adult females. Eight of the 14 adult females were in estrous"; copulations "came from 3000 h of focal target follows"; "We observed a total of 262 copulations during the 1814 h that females were observed in estrous" (oestrus includes partial swelling); "Of the 39 adult male-estrous female dyads that were seen together during the estrous phase of the female, 30 were observed to copulate at least once": 0.144 per female-hour, ≤ 0.029 per male (if all five were present) | this stage, BioC |
| Per maximally swollen female-hour 0.43 (Kalinzu), 0.79 (Mahale), ≥ 0.52 (Gombe); per adult male-hour 0.12 (Kalinzu), 0.20–0.22 (Mahale) | furuichiHashimoto2001 (FT, Japanese; read in the original by this stage, [L] for figure values). Kalinzu M group, Oct 1997 – Mar 1998, **16 adult males** (≥ 15 y); "each day the largest ranging party possible was chosen and followed as long as possible"; female rate from 1,207 five-minute units of maximally swollen females and 43 copulations; the male rate (Fig. 3) from 4,401 five-minute units and the same 43 copulations, so **per adult male present with a maximally swollen female**, not per male-hour of the day. Mahale 0.79 (Hasegawa 1991, cited); Gombe 0.52 per adult male near the female (Tutin 1979, cited) | this stage (E4o's download) |
| **"4.2 (Mahale), 12.3 (Gombe) adult males per swollen female" is the operational sex ratio, not party composition** | furuichiHashimoto2001: "性皮最大腫脹期のメス1頭あたりのオトナオスの数である発情性比は, マハレで4.2, ゴンベで12.3" (the oestrous sex ratio, the number of adult males per female in maximal swelling, Mahale 4.2, Gombe 12.3), computed from demographic parameters (Table 1: females in oestrus 6.4% / 4.2% of the interbirth interval), i.e. a community's adult males ÷ its simultaneously maximally swollen females. Party composition is given only for Kalinzu: 61 parties with "on average 4.43 adult males and 0.92 oestrous females" (OSR 4.8), out of 16 adult males (0.28 of the community's adult males), from the largest parties | this stage |
| Adult males per party, Kanyawara | wilson2012 (via T-PTY-1's record): 3.0 ± 3.0 adult males per party scan, all parties (~11 adult males) | as recorded |
| Female response to courtship | robertsRoberts2015 (FT, PMC4633128; Sonso 2008, "approximately 75 named individuals, 10 adult males and 22 adult females"; 6 adult focal males): mating gestures 2.60 per hour (median); "following the production of a sequence of gestures, the dominant response type—approach for copulation—occurred in a median proportion of 0.28 of cases (IQ = 0.12–0.75)"; females approached more "when the rival male was absent, or was present and looking away" | this stage, BioC |
| Males feed less with parous oestrous females | georgiev2014 (Abs; Kanyawara, 12 males, 11 months; staged T-ENE-7, direction only) | as recorded (research.md) |
| Males in parties rise with receptive females | emeryThompson2014 (Abs; Kanyawara; staged T-ENE-6) | as recorded |

**Correction to the brief's premise (registered before any run).** The field's "4–12 adult males with a swollen female"
(E4o §2, from furuichiHashimoto2001) is the operational sex ratio of the community, not the adult males in her party.
The model's communities hold 7, 4 and 3 adult males (smoke test, seed 48), so the comparable party measures are the share
of the community's adult males in her party (Kalinzu ~0.28 from the largest parties; Kanyawara 3.0 of ~11 in all parties)
and the model's own operational sex ratio (readout below). The dyadic rate (0.59 against 0.03–0.12 per dyad-hour) stands
as the discrepancy; Kalinzu's 0.12 per adult male is per male with a swollen female, so the model is ~5× Kalinzu as well.

## 3. Diagnosis (step 1; unchanged simulation code; written and committed before its runs)

Tool: `scripts/e4p-diagnose.ts` (new, read-only). Hooks that draw nothing and write nothing: `quotaTrace` (E4o's 'mate',
'mateF', plus 'mateFgap': every offer of a swollen female to a male in range, before her own 0.3-h gap, with the hours
since her last copulation), `mateTrace` (new, execution.ts: 'chase' when a guard sees a qualifying rival, with the hours
since his last aggression; 'copGuard', 'copConsort', 'copMate' when a copulation is due inside guarding, consorting or the
mate act, with whether `mateIntervalH` blocks it) and `rulesTap`. The literals stay on their own lines (the trace passes
elapsed times), so the ledger is unchanged (S27 51). Identity: S27 seed 48 after 2 days hashes 6005ce06d37e5df1 before
the hooks, after them with the hooks off, and with every hook on.

Definitions: daylight > 0.1 (the field's observation hours); adult male ≥ 15 y; maximally swollen = swelling ≥ 0.999;
a dyad = an adult male and a maximally swollen female of his community, not maternal kin; "her party" = the same partyId
(the 50-m chain, the field's party). Readouts:

1. **Party composition**: maximally swollen female daylight hours by adult males in her party (0, 1–2, 3–4, 5–6, 7+);
   mean adult males with her, and the same for anoestrous adult females (≥ 15 y, swelling 0); by her community: adult
   males in the community and the share of them in her party; the operational sex ratio (adult males ÷ maximally swollen
   females at a time, per community).
2. **Where absent males are**: dyad daylight hours by place (her party; sees her outside it; out of sight < 100, 100–250,
   250–500, 500–1,000, ≥ 1,000 m), by whether he saw her maximally swollen in the last 24 h, and by his act.
3. **Splits and joins** of dyads (one party at the previous tick, not at this one, and back): who was moving (travel,
   follow, patrol, hunt, flee, drink, consort, transfer, charge), his and her acts; median bout together.
4. **Decisions of adult males in a maximally swollen female's party** (rulesTap, resolved by the act held at the tick's
   end): chose her (an act targeting her, or her trip), left (travel, follow, patrol, hunt, drink), or stayed; for those who
   left: whether any option at her was on the list, the state of the mate offer (open; blocked by `mateIntervalH`; blocked
   only by the failed-approach block; none), the act chosen, the score gap to the best option at her.
5. **Mate acts**: attempts by adult males at maximally swollen females (per dyad daylight hour), female solicitations;
   outcome at the act's end (copulated; partner refusing: flee, charge, attack, submit; the failed-approach block, beside
   her or not; ended otherwise); the female's act at the end of the tick after a male starts an approach (accept, refuse,
   other).
6. **Which gap binds**: male offers (open; blocked by `mateIntervalH`; blocked only by the failed-approach block; each
   also "would top the list", the published score above the decision's best); female offers (her own 0.3-h gap closed;
   the male's quota closed; would top); copulation gates inside guard, consort and mate acts (tick counts, blocked or open);
   guard rival checks (every 4 ticks) blocked by the 0.25-h gap or open; backdated stamps (failed approaches).
7. **Guarding**: guard daylight hours, guard acts started by rank order, rival chases started (charge, variant GUARD).
8. **Rates**: copulations by adult males with maximally swollen females in daylight per maximally swollen female daylight
   hour (pooled and by adult males present), per dyad daylight hour (pooled; per-male median of dyadic rates over dyads
   with ≥ 5 h, as E4o), per adult male daylight hour; attempts per dyad daylight hour; intervals between a male's and a
   female's copulations.
9. **Males' feeding with parous oestrous females** (georgiev2014's direction): daylight forage-act minutes per adult-male
   day (days with ≥ 300 awake daylight minutes), days with a maximally swollen parous female in his party against days
   without.
10. Deaths by cause.

Runs (from a frozen detached checkout of the commit that adds this text): smoke (seeds 48 and 7, 1 + 2 days, every
readout produced: done before this commit at the hooked code, logged in §9); **D0** = S27, **D1** = S27 + `rngSalt` 1
(the integrator's S27q1), seeds 48 and 7, 30-day burn-in + 60 days, one seed per process, two at a time. E4o's D0b–D3b
(the same worlds for S27 and `rngSalt` 1–3) supply the spread of the readouts they share (copulations, rates by males
present, gate counts); D0 and D1 must reproduce D0b's and D1b's copulation counts exactly (2,764 and 2,955), a check that
the worlds are the same.

**Reading rule (registered).** A gap "binds" where it blocks an offer or a copulation that would otherwise happen (would
top the list, or a copulation gate reached); the share of male decisions blocked and would-top by each gap, and the share
of copulation-gate ticks blocked, name what sets the rate. Males are "absent for lack of value" if, at their decisions in
her party, they leave while the mate offer is blocked and no option at her is on the list; "absent by distance" if most
absent dyad-hours are out of sight beyond 250 m without having seen her swollen in 24 h.

## 4. Diagnosis result (D0 = S27, D1 = S27 + `rngSalt` 1; seeds 48 and 7, 30 + 60 days; frozen-d at fd5bf77, clean; printed by `artifacts/validation/e4p/diag_table.py` from the JSON)

D0 and D1 reproduce E4o's D0b and D1b exactly (2,764 and 2,955 copulations): the same worlds. One readout defect,
found reading this table and fixed in the tool before any arm (disclosed): the male inter-copulation interval read 0 h,
because the in-tick stamp of a copulation (added so that a decision later in the same tick is not read as blocked by a
failed-approach block) was also the interval's start; intervals now use the copulations seen in the scored window
(E4o's D0b gives the median, 2.1 h). No other readout reads that stamp.

```
| Readout (e4p-diagnose, seeds 48 + 7, 30 + 60 days) | D0 | D1 |
| --- | --- | --- |
| max-swollen female daylight h | 2385 | 2529 |
| adult males in her party (per max-swollen daylight h) | 1.423 | 1.431 |
| adult males with an anoestrous adult female (per daylight h) | 0.676 | 0.680 |
| party size, max-swollen female | 4.51 | 4.75 |
| party size, anoestrous adult female | 4.08 | 4.24 |
|   share of max-swollen daylight h with 0 adult males | 0.307 | 0.303 |
|   share of max-swollen daylight h with 1-2 adult males | 0.495 | 0.500 |
|   share of max-swollen daylight h with 3-4 adult males | 0.166 | 0.161 |
|   share of max-swollen daylight h with 5-6 adult males | 0.030 | 0.032 |
|   share of max-swollen daylight h with 7+ adult males | 0.001 | 0.004 |
|   seed 48 community 1: adult males in community / in her party / share / OSR | — | — |
|   seed 48 community 2: adult males in community / in her party / share / OSR | — | — |
|   seed 48 community 3: adult males in community / in her party / share / OSR | — | — |
|   seed 7 community 1: adult males in community / in her party / share / OSR | — | — |
|   seed 7 community 2: adult males in community / in her party / share / OSR | — | — |
|   seed 7 community 3: adult males in community / in her party / share / OSR | — | — |
  D0 seed 48: community 1: 7.0 males, 2.04 with her (0.29), OSR 10.4636, 506 female-h; community 2: 4.0 males, 1.00 with her (0.25), OSR 5.8197, 523 female-h; community 3: 3.0 males, 1.16 with her (0.39), OSR 4.9287, 455 female-h; OSR all 7.1247
  D0 seed 7: community 1: 7.0 males, 1.81 with her (0.26), OSR 9.4411, 547 female-h; community 2: 4.0 males, 0.94 with her (0.24), OSR 13.1581, 229 female-h; community 3: 3.0 males, 0.88 with her (0.29), OSR 17.7595, 126 female-h; OSR all 11.5287
  D1 seed 48: community 1: 7.0 males, 2.03 with her (0.29), OSR 12.6131, 425 female-h; community 2: 4.0 males, 1.17 with her (0.29), OSR 5.8197, 523 female-h; community 3: 3.0 males, 1.06 with her (0.35), OSR 4.9287, 455 female-h; OSR all 7.5636
  D1 seed 7: community 1: 7.0 males, 2.16 with her (0.31), OSR 9.2343, 560 female-h; community 2: 4.0 males, 1.03 with her (0.26), OSR 10.2128, 290 female-h; community 3: 3.0 males, 0.55 with her (0.18), OSR 8.0848, 276 female-h; OSR all 9.2058

| Dyad daylight hours by place (share) | D0 | D1 |
| --- | --- | --- |
| her party | 0.309 | 0.323 |
| out of sight 100-250 m | 0.152 | 0.149 |
| out of sight 250-500 m | 0.182 | 0.178 |
| out of sight 500-1000 m | 0.153 | 0.162 |
| out of sight <100 m | 0.036 | 0.042 |
| out of sight >=1000 m | 0.158 | 0.134 |
| sees her, not in her party | 0.011 | 0.011 |

| Dyad daylight hours by place and knowledge (share of all dyad-h) | D0 | D1 |
| --- | --- | --- |
| her party | not seen swollen in 24 h | 0.005 | 0.004 |
| her party | saw her swollen in the last 24 h | 0.305 | 0.320 |
| out of sight 100-250 m | not seen swollen in 24 h | 0.018 | 0.014 |
| out of sight 100-250 m | saw her swollen in the last 24 h | 0.134 | 0.136 |
| out of sight 250-500 m | not seen swollen in 24 h | 0.041 | 0.041 |
| out of sight 250-500 m | saw her swollen in the last 24 h | 0.141 | 0.137 |
| out of sight 500-1000 m | not seen swollen in 24 h | 0.058 | 0.087 |
| out of sight 500-1000 m | saw her swollen in the last 24 h | 0.095 | 0.075 |
| out of sight <100 m | not seen swollen in 24 h | 0.004 | 0.003 |
| out of sight <100 m | saw her swollen in the last 24 h | 0.032 | 0.039 |
| out of sight >=1000 m | not seen swollen in 24 h | 0.111 | 0.095 |
| out of sight >=1000 m | saw her swollen in the last 24 h | 0.047 | 0.039 |
| sees her, not in her party | saw her swollen in the last 24 h | 0.011 | 0.011 |

| absence.absentActH: share (top 10) | D0 | D1 |
| --- | --- | --- |
| forage | 0.332 | 0.334 |
| rest | 0.326 | 0.328 |
| nest | 0.108 | 0.108 |
| groom | 0.096 | 0.092 |
| travel:TREE | 0.067 | 0.074 |
| travel:CALLER | 0.032 | 0.031 |
| drink | 0.009 | 0.009 |
| patrol | 0.008 | 0.008 |
| guard | 0.008 | 0.006 |
| travel:HOME | 0.003 | 0.000 |

| absence.presentActH: share (top 10) | D0 | D1 |
| --- | --- | --- |
| forage | 0.297 | 0.295 |
| rest | 0.209 | 0.207 |
| guard | 0.213 | 0.200 |
| nest | 0.096 | 0.091 |
| travel:TREE | 0.080 | 0.091 |
| groom | 0.060 | 0.072 |
| travel:CALLER | 0.011 | 0.010 |
| charge | 0.005 | 0.005 |
| mate | 0.005 | 0.005 |
| drink | 0.004 | 0.004 |

| splitsJoins.splits: share (top 5) | D0 | D1 |
| --- | --- | --- |
| he moved | 0.299 | 0.308 |
| she moved | 0.307 | 0.288 |
| neither moving (the chain broke) | 0.244 | 0.252 |
| both moving | 0.149 | 0.152 |

| splitsJoins.splitMaleAct: share (top 8) | D0 | D1 |
| --- | --- | --- |
| travel:TREE | 0.300 | 0.328 |
| forage | 0.245 | 0.242 |
| rest | 0.164 | 0.168 |
| travel:CALLER | 0.080 | 0.071 |
| groom | 0.071 | 0.057 |
| nest | 0.050 | 0.061 |
| drink | 0.052 | 0.036 |
| hunt | 0.007 | 0.015 |

| splitsJoins.joins: share (top 5) | D0 | D1 |
| --- | --- | --- |
| he moved | 0.291 | 0.311 |
| she moved | 0.300 | 0.285 |
| neither moving (the chain joined) | 0.244 | 0.260 |
| both moving | 0.166 | 0.144 |

| splitsJoins.joinMaleAct: share (top 8) | D0 | D1 |
| --- | --- | --- |
| forage | 0.250 | 0.255 |
| travel:TREE | 0.222 | 0.267 |
| travel:CALLER | 0.183 | 0.155 |
| rest | 0.155 | 0.164 |
| groom | 0.063 | 0.050 |
| nest | 0.031 | 0.035 |
| drink | 0.031 | 0.024 |
| guard | 0.018 | 0.013 |
| median bout together (h), seed mean | 0.33 | 0.30 |

| Decisions of adult males in a max-swollen female's party | D0 | D1 |
| --- | --- | --- |
| decisions | 42633 | 47621 |
|   her (share) | 0.309 | 0.312 |
|   stay (share) | 0.534 | 0.525 |
|   leave (share) | 0.156 | 0.164 |
|   guarded by a dominant (courtship −1) (share) | 0.162 | 0.152 |
|   leave, mate offer blocked: mateIntervalH (share of leaves) | 0.491 | 0.482 |
|   leave, mate offer blocked: failed-approach block (share of leaves) | 0.001 | 0.004 |
|   leave, mate offer open (share of leaves) | 0.207 | 0.175 |
|   leave, mate offer none: out of mating range (share of leaves) | 0.170 | 0.193 |
|   leave, mate offer none: night (share of leaves) | 0.003 | 0.002 |
|   leave, mate offer none: other (share of leaves) | 0.127 | 0.144 |
|   leave, no option at her (share of leaves) | 0.382 | 0.418 |
|   leave: top − best option at her, median (seed mean) | 0.351 | 0.372 |
|   her company value when leaving / staying, median (seed mean) | 1.385 | 1.371 |
|   (staying) | 1.374 | 1.359 |

| decisions.leave.herOption: share (top 8) | D0 | D1 |
| --- | --- | --- |
| no option at her | 0.382 | 0.418 |
| an option at her (charge:COERCE) | 0.208 | 0.192 |
| an option at her (guard:NONE) | 0.125 | 0.108 |
| an option at her (mate:NONE) | 0.110 | 0.101 |
| an option at her (groom:NONE) | 0.065 | 0.078 |
| an option at her (travel:TREE) | 0.040 | 0.038 |
| an option at her (follow:PARTY) | 0.020 | 0.021 |
| an option at her (charge:FEED) | 0.015 | 0.012 |

| decisions.leave.chosenAct: share (top 5) | D0 | D1 |
| --- | --- | --- |
| travel:TREE | 0.838 | 0.867 |
| travel:CALLER | 0.112 | 0.089 |
| drink:NONE | 0.039 | 0.031 |
| hunt:JOIN | 0.005 | 0.006 |
| hunt:LEAD | 0.001 | 0.003 |

| Mate acts (adult males, max-swollen females) | D0 | D1 |
| --- | --- | --- |
| male attempts | 832 | 984 |
| attempts per dyad daylight h | 0.245 | 0.272 |
| female solicitations | 421 | 503 |

| mateActs.outcomes: share (top 10) | D0 | D1 |
| --- | --- | --- |
| male: copulated | 0.638 | 0.634 |
| female: copulated | 0.335 | 0.336 |
| male: ended otherwise | 0.020 | 0.016 |
| male: partner refusing | 0.005 | 0.007 |
| male: block: approach timed out | 0.001 | 0.004 |
| female: ended otherwise | 0.001 | 0.003 |
| male: block: beside her, no copulation | 0.001 | 0.000 |

| mateActs.femaleAnswer: share (top 10) | D0 | D1 |
| --- | --- | --- |
| other (rest) | 0.203 | 0.243 |
| accept (mate at him) | 0.160 | 0.188 |
| other (travel) | 0.172 | 0.166 |
| other (forage) | 0.145 | 0.153 |
| other (pant-grunt) | 0.085 | 0.064 |
| refuse (flee) | 0.075 | 0.045 |
| other (play) | 0.069 | 0.041 |
| other (groom) | 0.029 | 0.041 |
| other (mate) | 0.014 | 0.028 |
| other (drink) | 0.013 | 0.008 |

| Gaps (counts, two seeds) | D0 | D1 |
| --- | --- | --- |
| backdates | 6 | 17 |
| backdatesBeside | 1 | 1 |
| chase: blocked by the 0.25-h gap | 11032 | 11178 |
| chase: open | 2299 | 2386 |
| copConsort: blocked by mateIntervalH | 22 | 25 |
| copGuard: blocked by mateIntervalH | 187926 | 188818 |
| copGuard: blocked only by a failed-approach block | 0 | 14 |
| copGuard: open | 626 | 580 |
| copMate: blocked by mateIntervalH | 2981 | 3492 |
| copMate: open | 2138 | 2375 |
| female offer (own gap open): blocked by the male's mateIntervalH | 16576 | 18374 |
| female offer (own gap open): blocked by the male's mateIntervalH, would top the list | 5150 | 5632 |
| female offer (own gap open): open | 9122 | 10033 |
| female offer: her own 0.3-h gap closed | 22983 | 24438 |
| female offer: her own 0.3-h gap closed, would top the list | 7165 | 7775 |
| female offer: her own gap open | 25698 | 28407 |
| male offer: blocked by mateIntervalH | 39687 | 42612 |
| male offer: blocked by mateIntervalH, would top the list | 14279 | 15504 |
| male offer: blocked only by a failed-approach block | 44 | 131 |
| male offer: blocked only by a failed-approach block, would top the list | 9 | 33 |
| male offer: open | 16290 | 17470 |
| male offer: open and on top | 2541 | 2845 |

| Guarding | D0 | D1 |
| --- | --- | --- |
| guard daylight h | 818 | 809 |
| guard acts started | 2530 | 2421 |
|   by the alpha (rank order 1) | 1449 | 1616 |
| rival chases started | 1362 | 1313 |

| Rates (daylight; adult males, max-swollen females) | D0 | D1 | field |
| --- | --- | --- | --- |
| copulations (all) | 2764 | 2955 | — |
| per max-swollen female daylight h | 0.831 | 0.857 | Taï 0.14 (oestrous h); Kalinzu 0.43; Mahale 0.79 |
| per dyad daylight h (pooled) | 0.584 | 0.599 | Kanyawara 0.03–0.064; Kalinzu 0.12 per male with her |
| per-male median of dyadic rates (seed mean) | 0.586 | 0.611 | Kanyawara 0.03–0.064 |
| per adult male daylight h | 0.094 | 0.103 | — |
|   per max-swollen female daylight h, 0 adult males | 0.053 | 0.063 |  |
|   per max-swollen female daylight h, 1-2 adult males | 0.950 | 0.943 |  |
|   per max-swollen female daylight h, 3-4 adult males | 2.127 | 2.274 |  |
|   per max-swollen female daylight h, 5-6 adult males | 3.009 | 3.119 |  |
|   per max-swollen female daylight h, 7+ adult males | 3.371 | 4.316 |  |
| male interval median h (seed mean) | 0.00 | 0.00 | — |
| female interval median h (seed mean) | 0.66 | 0.65 | — |

| rates.copsByMaleAct: share (top 8) | D0 | D1 |
| --- | --- | --- |
| mate | 0.345 | 0.381 |
| forage | 0.216 | 0.216 |
| guard | 0.219 | 0.188 |
| rest | 0.085 | 0.080 |
| groom | 0.036 | 0.040 |
| travel | 0.029 | 0.031 |
| nest | 0.024 | 0.023 |
| submit | 0.012 | 0.012 |

| Males' feeding (forage-act daylight min per adult-male day) | D0 | D1 |
| --- | --- | --- |
| days with a max-swollen parous female in his party | 435 | 478 |
|   feeding min, with | 242.3 | 239.2 |
|   feeding min, without | 236.9 | 240.6 |

deaths: {'D0': [{}, {}], 'D1': [{}, {}]}

E4o D0b–D3b (same worlds for S27 and rngSalt 1–3; e4o-diagnose): copulations [2764, 2955, 2578, 2543]
```

**What sets the rates (with numbers from the table).**
- **`mateIntervalH` sets every copulation path.** Of the male offers to a maximally swollen female in range, 39,687 /
  42,612 were blocked by it (71%) and 14,279 / 15,504 of those would have topped the list, against 2,541 / 2,845 open
  offers chosen: without it males would choose to mate ~5.6× as often (E4o: ~6×). Inside guarding the copulation gate was
  closed 187,926 / 188,818 guard-ticks and open 626 / 580 times (each an in-guard copulation, 22% / 19% of copulations);
  inside mate acts 2,981 / 3,492 ticks closed, 2,138 / 2,375 open. Males' intervals: 25% end within 0.1 h of the quota
  (E4o). The dyadic rate is the quota's ceiling: 0.584 / 0.599 per dyad daylight hour (ceiling 1/1.5 = 0.67), 5× Kalinzu's
  0.12 per male with a swollen female and 9–20× Kanyawara's 0.03–0.064.
- **The female's own 0.3-h gap binds second**: it closed 22,983 / 24,438 of her offers (47%), 7,165 / 7,775 of which would
  have topped her list; with her gap open, the male's quota closed 16,576 / 18,374 of her offers (64%; 5,150 / 5,632 would
  top). Female-initiated copulations are a third of all (0.335 / 0.336 of mate acts ending in copulation).
- **The failed-approach block hardly acts**: 6 / 17 backdated stamps in 60 days on two seeds; male offers blocked
  only by it 44 / 131 (9 / 33 would top). It exists because the quota exists (it backdates the quota stamp).
- **The guard's 0.25-h gap sets the chase rate**: of guard checks finding a qualifying rival (courting or beside her,
  dominated), 11,032 / 11,178 were blocked by the gap and 2,299 / 2,386 open; 1,362 / 1,313 chases started.
- **Female choice does not bind**: at a male's approach the female's act one tick later was acceptance (mate at him) in
  16% / 19% of approaches and a refusal (flee) in 7.5% / 4.5%; the rest went on with what they did (rest, travel, forage,
  greeting, play), yet 96% of male acts ended in copulation (`mateTick` copulates unless she is fleeing, charging,
  attacking or submitting). robertsRoberts2015: females approach for copulation after a median 0.28 of courtship
  sequences.

**Why males are "absent": they are not, measured per community.** Adult males in a maximally swollen female's party:
1.42 / 1.43 per daylight hour (0 males 31%, 1–2 males 50%, 3–4 males 16%, 5+ males 3%), against 0.68 with an
anoestrous adult female: receptive females already double the males with them (emeryThompson2014's direction). The
communities hold 7, 4 and 3 adult males; the share of a community's adult males in her party is 0.18–0.39 by community
and seed (Kalinzu, from the largest parties: 4.43 of 16, 0.28). The model's operational sex ratio is 7.1–11.5 overall
(by community 4.9–17.8): between Mahale's 4.2 and Gombe's 12.3, the values the brief read as party counts (§2). Within her
party, 16% of an adult male's decisions leave her (84% on a trip to a tree); in half of those the quota had closed the
mate offer and in 38–42% no option at her was on the list at all: the quota removes her value between copulations, so it
also sends males away. Out of her party, dyad-hours spread over distance (37% of all dyad-hours out of sight within 500 m, 13–16% beyond
1 km), and 65–67% of the out-of-party hours are by males who saw her maximally swollen within 24 h. Splits are moves by him (30%), by her (29–31%), both (15%)
or a broken chain (24–25%); median bout together 0.30–0.33 h. Males feed as long on days with a maximally swollen parous
female in their party as without (242 / 239 against 237 / 241 min): georgiev2014's direction (less) is absent.

**Reading (registered rule, §3).** `mateIntervalH` binds: it sets the dyadic rate at its ceiling and every in-act
copulation; the female's gap binds second; the failed-approach block exists only as the quota's appendage; the chase gap
sets how often a guard chases. Males are absent neither for lack of value in the sense of the brief (they leave mostly
when the quota has removed her value) nor by distance beyond what the field shows per community; the brief's "4–12 males"
is the operational sex ratio, which the model matches. The discrepancy is the dyadic rate (5–20×) with too few males per
female to dilute it, and a female whose acceptance is not needed.

## 5. Mechanism (step 2): `matingValue` (one switch; 0 = today, hash-identical)

**Principle.** What limits copulation in the wild is not a male physiology (captive males ejaculate hourly, marson1989)
but the partners and their competitors (E4o §11; §4 above: the quota sets every path, the female's acceptance never
binds). Two first principles replace the four gaps: (a) **a copulation needs both partners' choice** (female choice:
robertsRoberts2015, females answer a median 0.28 of courtship sequences by approaching to copulate; watts2022, females
rarely refuse outright); (b) **a copulation is worth the paternity it adds**, in the model's own currency of paternity
(reproduction.ts: conception min(1, C / `matingSaturation`), the sire drawn in proportion to the cycle's weighted
copulations C, weights 1, and 2 in the periovulatory days, 0 outside maximal swelling): the value of one more falls as
the cycle's copulations accumulate (the brief's mechanism).

**Iteration 1 (A1, `matingValue` 1; src/sim/mating.ts, candidates.ts `reproduction`, execution.ts `mateTick`, guard,
consort, `startAction`):**
- `paternityGain(f, m)` = [E(k + w, C + w) − E(k, C)] ÷ min(1, 1 / S), E(k, C) = min(1, C / S) · k / C, with C her cycle's
  weighted copulations, k the male's, w the weight now (recordCopulation's rule), S = `matingSaturation` (3, design): 1 for
  a cycle's first copulation, 2 for a first periovulatory one, falling as C grows, 0 for a sole mate once conception has
  saturated, 0 outside maximal swelling. Both partners read her counts (design simplification: the female knows her own
  copulations; males are taken to know them, copulations being conspicuous; an open problem).
- It scales the value terms of the male's mate offer (`mateWorth` and the 0.6 for her invitation) and of the female's
  (her presenting terms, his rank, past coercion, the bond, the 0.7 for answering his approach) and her consort
  acceptance; the costs (distance, hunger, night, a dominant guard's −1) are unchanged; an offer worth nothing (gain 0)
  is not made.
- Consent: an approach interrupts the partner whichever sex starts it (today only a male's); a copulation happens when
  the actor reaches the partner and the partner's own act is mating with the actor, or, for a male, guarding or
  consorting with her; the partner's mate act ends with it (one agreement, one copulation). Guarding and consorting no
  longer copulate by themselves: the female presents to the guard or consort.
- Not read: `mateIntervalH`; the female's 0.3-h gap (short-circuited); the 0.5-h block after a failed approach (the
  backdated stamp is written but nothing reads `lastMate` under the switch); the guard's 0.25-h gap (a second branch of
  the same line chases while the rival courts her or stays beside her).
- Unchanged on purpose (not implicated by §4): who is with her (`companyValue`'s mating term, the guard and consort
  offers keep today's values), coercion charges, the guard's chase score (1.3).
- No new magnitude. Prescriptions: S27 51 → 47 (`scripts/prescription-ledger.ts --count`; today's model 147 → 143):
  `mateIntervalH` through ACTIVE_WHEN, the three literals through LITERAL_OFF. Switch 0 hash-identical: S27 seed 48
  after 2 days 6005ce06d37e5df1 with the code at this commit (hooks off and on). Tests: `tests/sim-mating-value.test.ts`.

## 6. Readouts (defined before any arm; smoke-tested with the switch on, run log)

- Simulation truth from `scripts/e4p-diagnose.ts` (§3 definitions; 30 + 60 days, seeds 48 and 7) against D0–D1 (and
  E4o's D0b–D3b for copulation counts), plus two readouts added with the switch, before any arm: copulations by their
  paternity weight at the time (0, 1, 2 = periovulatory), and the weighted copulations a female's record held when it was
  cleared (a cycle's total; not available for D0–D1, which ran before it); under the switch the copulation gates of mate
  acts are labelled "partner not consenting" instead of "blocked by mateIntervalH".
- `e-bench --quick` (seeds 48, 7; 30 + 30 days) against S27q and its three re-draws (`judge_vs_reps.py quick custom`,
  amendment 2; with and without T-HUN-4, T-BRD-1, T-IGE-3); T-PTY-1, T-ACT-1..4; prescription count; viability and deaths
  by cause. `energy-diagnose` (seeds 48, 7; 30 + 30): reserves ÷ store %/day by class. `rhythm-metrics` (seeds 48, 7;
  30 + 30): adults out of a nest share of the night, T-RHY-5. All exactly as the integrator ran S27q
  (`scratchpad/integrator/s27q.sh`) and E4o its arm.

## 7. Arms

- **A1** = S27 + `matingValue` 1, from a frozen detached checkout of the commit that registers its run in §9
  (`scratchpad/e4p/run-arm.sh`: e-bench quick, energy-diagnose, e4p-diagnose 30 + 60, rhythm-metrics; `--workers 1` above
  load 8).

## 8. Predictions and kill criterion (A1 against the S27 references)

The smoke test with the switch on (seed 48, 1 + 2 days, run log) was seen before these predictions were written: 5
copulations in 2 days against 89 at switch 0, females at C = 3–10 weighted copulations within the first day, the gain of
the next copulation 0.2–0.43 and the mate offers 0.16–0.34 against best options of 0.8–1.6; a sole mate's gain 0.

| Quantity | Reference (D0 / D1; S27q group) | Prediction (A1) |
| --- | --- | --- |
| Prescriptions | 51 | 47 (high) |
| Copulations per maximally swollen female daylight hour | 0.83 / 0.86 | ≤ 0.07, below Taï's 0.14 (high) |
| Copulations per dyad daylight hour | 0.58 / 0.60 | ≤ 0.05 (high) |
| Weighted copulations per cleared cycle | (not measured) | ≤ 12 (moderate) |
| Share of male intervals under 0.25 h | ~0 (the quota) | ≥ 0.3: no refractory, so copulations come in bursts (moderate) |
| Male approaches ending without consent (share of male mate acts) | ≤ 0.03 | ≥ 0.3 (moderate) |
| Adult males with a maximally swollen female (per daylight h) | 1.42 / 1.43 | lower, toward the anoestrous 0.68 (moderate: her mating value no longer holds them) |
| Fitted, held-out, held-out without the rare rows | S27q group | inside noise (moderate) |
| T-ACT-1..4, T-PTY-1, reserves %/day | S27q group | inside its spread (moderate) |
| Viability; night (≤ 3.3%, T-RHY-5 ≤ 0.033) | pass | pass (high) |

**Kill criterion (null; the switch stays off, recorded):** viability fails (a starvation death the references lack, or
a seed below 80% of its start); held-out without the rare rows worse beyond noise (z > +2); the count does not fall to
47; night unsafe; the mechanism does not run (copulations unchanged within the D spread, or no approach ends without
consent). **Rate line (the stage's own, registered):** the mechanism replaces the quota as a keep candidate only if the
rates it produces sit inside the sourced ranges, per maximally swollen female daylight hour 0.14–0.79 (Taï–Mahale) and
per dyad daylight hour 0.03–0.12 (Kanyawara–Kalinzu); outside them it is recorded as a mechanism finding, not a keep
candidate (a replacement that misses both ranges does not replace what the quota set).

## 9. Run log (each entry written before its run, unless marked)

- **Smoke** (logged after the run, at the hooked code; scripts only): S27, seeds 48 and 7, 1 + 2 days: every readout
  produced (89 and 87 copulations; communities of 7, 4 and 3 adult males). The operational-sex-ratio readout registered in
  §3 was missing from the first version of the tool and was added before any diagnosis run (smoke: 5.0, 4.0, 3.0 by
  community, seed 48).
- **D0, D1** (as registered in §3), from `scratchpad/e4p/frozen-d` (a detached checkout of the commit that adds this
  entry): seeds 48 and 7, two processes at a time (one if the load is above 8); outputs `scratchpad/e4p/diag/D{0,1}-{48,7}.json`.
- **Smoke, switch on** (logged after the run, at the code of this commit before it was committed; scripts and tests only
  beyond it): S27 + `matingValue` 1, seed 48, 1 + 2 days, e4p-diagnose and a read-only trace of the mate offers
  (`scratchpad/e4p/dbg1.mts`): every readout produced; 5 copulations (switch 0: 89); the offers' gains as in §8.
  Unit tests `tests/sim-mating-value.test.ts` 4 pass; ledger and Track E tests pass; S27 51 → 47.
- **A1** (as registered in §7): from `scratchpad/e4p/frozen-a1` (the commit that adds this entry),
  `run-arm.sh frozen-a1 A1 '{"matingValue":1}'`; outputs `frozen-a1/artifacts/validation/e4p/A1*`.
- **Readout added while A1 ran, before any of its results were read (disclosed; the integrator relayed E4q's request):**
  male → male aggression per co-present adult-male dyad-hour, E4q's definition (e4q-prereg.md §3: charges and attacks
  started by adult males at adult males of their community, plus displays aimed at one, per ordered pair of awake adult
  males of one party in daylight; muller2007's 0.015 per hour at Kanyawara), with the mate guard's chases (variant
  GUARD) apart. E4q's S27 reference: 0.097 ± 0.016 (30 + 30 days, four runs), 59% of adult males' charges guard chases.
  Re-runs on unchanged worlds from `scratchpad/e4p/frozen-m` (the commit that adds this entry): D0m, D1m (S27, S27 +
  `rngSalt` 1) and A1m (A1's parameters; matingValue 1 is hash-identical with the WIP code of iteration 2 present, S27
  seed 48 after 2 days dba5143146a2b7b4), 30 + 60 days, seeds 48 and 7; outputs `scratchpad/e4p/diagm/`.
