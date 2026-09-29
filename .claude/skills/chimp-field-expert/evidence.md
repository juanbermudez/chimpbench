# Evidence digest for labeling

Documented patterns and field values the rubric reasons from. Target IDs refer to `data/targets.json`; verified source keys are listed in `docs/realism-design.md` (Sources). Named studies are in `docs/research.md`. Levels: [H] pattern well documented; [M] one site or derived; [L] weak.

## Daily budget (what "most plausible" means most of the time)
- Feeding 33–50% of the day (T-ACT-1); travel 12–25% (T-ACT-2); grooming 8–18% (T-ACT-3; about 15% for males and 12% for females, [villioth2025]); rest including grooming 30–47% (T-ACT-4). [M]
- The sexes differ little in activity (by ≤ 0.03 per category). Lactating females travel less: day range 1.2 km vs 2.7 km for males ([batesByrne2009]). [M]
- Nests are built at dusk; a chimpanzee stays in its nest until light. [H]

## Dominance and within-community aggression
- Aggression is frequent, mostly non-contact (charges and displays); contact fights are a minority and serious injury is rare. [H] (No sourced per-hour rate exists.)
- Adult males dominate all females. Subordinates pant-grunt to dominants; the top 3 males receive more than 75% of pant-grunts (T-SOC-6, [gilby2013]). [H]
- Male hierarchies are moderately steep (steepness 0.40 ± 0.16, [kaburuNewtonFisher2015]). About 10% of contests go against rank without a lasting reversal. Females queue for rank rather than contest it ([foerster2016]). [M]
- Alpha tenure is about 3–7 years (T-SOC-7). Rank challenges come from nearby-rank prime males, usually with an ally. [M]
- Triggers for charges: status (a near-rank rival), a contested food patch (supplant), a swollen female with rivals near, redirected aggression after a loss, tension or a grudge, recent female immigrants (resident females target them [M]), defence of offspring.
- Adolescent males establish dominance over females. [H]

## Coalitions, bonds and grooming
- Male bonds last years (a male's longest bond is 7.1 ± 2.0 y), mostly with non-relatives (T-SOC-1/2, [mitani2009]). [H]
- Grooming is reciprocated (slope 0.45–0.8, T-SOC-3), less so when the hierarchy is unstable. East African males are the most avid groomers; adult females groom mostly kin. [H/M]
- Grooming is traded for coalition support; allies support each other in conflicts. [M-H]
- Relationship quality has value, compatibility and security components ("Fraser, Schino and Aureli (2008)").

## Conflict resolution
- Reconciliation: corrected conciliatory tendency of about 14% in the wild (Mahale, [kutsukakeCastles2004]; band 0.08–0.22, T-SOC-9); much less than in captivity ([arnoldWhiten2001]). [M]
- Third-party affiliation after conflicts is about 18.7% (Taï, [wittigBoesch2010]; band 0.1–0.3, T-SOC-10). Consolation is a minority response. [M]

## Food and meat sharing
- Meat owners share with about half the adults present, favouring bond partners about 1.8× ([samuni2018], T-HUN-9). Sharing favours allies and grooming partners ([mitaniWatts2001]). "Mitani and Watts" describes reciprocal meat sharing, and does not justify a universal cooperative role script. [M]
- Mothers share plant food with offspring. [M]

## Hunting (red colobus)
- Party size and the number of males predict hunting and success ("Mitani and Watts"). Success is 0.5–0.8 (T-HUN-2). [H]
- Hunts happen at 5–40% of colobus encounters, depending on site (T-HUN-3). Each extra male raises the odds (T-HUN-4). Adult males make 80–95% of kills (T-HUN-8). A swollen female present lowers hunt odds by 22% ([gilby2015]). [M]

## Intergroup relations and patrols
- Numerical assessment: with ≥ 3 males, parties approach and call back (12/13); with 1–2 males, they approach 5/9 and call 1/9; female-only parties never called ([wilson2001]). Each adult male raises the odds of approach ([wilson2012], T-IGE-3). [H]
- Patrols are silent, male-biased collective action: 0.1–0.5 per week (T-PAT-1), 55–85% of males joining (T-PAT-3), 60–240 min (T-PAT-5). They contact strangers in 15–45% (T-PAT-7). [H]
- Killings are rare: median about 0.08 per community-year (Ngogo about 1.67 is an outlier; T-LET-1). Victims are mostly males and infants. Attackers outnumber victims by a median of 8 to 1 ([wilson2014]). Most killings happen on patrol (T-LET-6). [H]
- "Foreign chimp seen" must allow avoidance, observation, vocalization, retreat and joining allies, not automatic combat (research.md §5).

## Mating
- Males court, guard and consort with maximally swollen females; the alpha sires a large share (25–55%, T-SOC-11). Mate-guarding is contest competition. [M-H]
- Oestrous females lower the odds of approaching strangers and of hunting. [M]

## Mothers, infants and juveniles
- Infants depend on the mother for years: first solid food about 7.9 months, suckling ends about 4.8 y ("Bray et al."). Play is common in the young ("Heintz et al."). [H]
- Orphans fare badly; mothers carry and defend infants. [H]

## Party life (fission–fusion)
- Parties are about 3–9 individuals (T-PTY-1) and track patch size. The whole community is rarely together. Females are less gregarious than males; Taï females are alone 45% of the time. [H/M]

## Range of real variation (what temperaments may borrow)
- Communities differ widely: killing rate (Ngogo about 1.67 vs Kanyawara about 0.08 per community-year), hunting propensity per encounter (Kanyawara 0.079 vs Gombe 0.647), reconciliation, and hierarchy steepness and stability.
- Individuals differ in patrol participation, in being "impact hunters" ([gilby2015]), in gesture repertoires and in boldness. The sim's personality axes (boldness, sociability, aggression, playfulness) are illustrative ([L]).
- So `agg` and `coop` must stay inside this envelope. An aggressive chimpanzee still mostly feeds, rests and travels. A collaborative one still competes for mates and defends its young.
