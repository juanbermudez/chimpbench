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

## 9. Run log (each entry written before its run, unless marked)

- **Smoke** (logged after the run, at the hooked code; scripts only): S27, seeds 48 and 7, 1 + 2 days: every readout
  produced (89 and 87 copulations; communities of 7, 4 and 3 adult males). The operational-sex-ratio readout registered in
  §3 was missing from the first version of the tool and was added before any diagnosis run (smoke: 5.0, 4.0, 3.0 by
  community, seed 48).
- **D0, D1** (as registered in §3), from `scratchpad/e4p/frozen-d` (a detached checkout of the commit that adds this
  entry): seeds 48 and 7, two processes at a time (one if the load is above 8); outputs `scratchpad/e4p/diag/D{0,1}-{48,7}.json`.
