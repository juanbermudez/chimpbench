# RW: numbers behind the registration (generated)

Written by `scripts/rw-ngogo-choices.ts --md`; do not edit by hand. Aggregate counts and rates only. Source: Sandel et al. 2026, Dryad doi:10.5061/dryad.sf7m0cgkg (CC0).

Held-out part: **sealed**. Rule: h = int(sha256("rw-heldout-v1:" + lowercase(code))[:8], 16) % 5; held-out: year >= 2016 or h == 0; development: not held out, and year >= 2014 or h == 1; train: the rest.

## 1. Structure (the only figures that include held-out rows)

| part | rows | scans | sessions | focal animals |
| --- | --- | --- | --- | --- |
| whole file | 88046 | 87586 | 12536 | 77 |
| train | 42283 | 42085 | 6022 | 38 |
| development | 22699 | 22586 | 3233 | 33 |
| held-out | 23064 | 22915 | 3281 | 54 |
| development: seen animals, 2014-2015 | 3752 | 3718 | 532 | 23 |
| development: unseen animals, 1998-2015 | 18947 | 18868 | 2701 | 10 |
| held-out: seen animals, 2016-2022 | 11417 | 11327 | 1621 | 39 |
| held-out: unseen animals, 1998-2015 | 8038 | 7995 | 1144 | 13 |
| held-out: unseen animals, 2016-2022 | 3609 | 3593 | 516 | 9 |

Years in the file: 1998–2022 (24 years). Roster of mature males (the focal codes): 77. A scan with several grooming dyads is stored as several rows, so rows exceed scans.

## 2. Train and development parts, pooled: filling and meaning of the fields

| field | share of rows with a value |
| --- | --- |
| prox2 | 0.177 |
| prox5 | 0.126 |
| gdyad | 0.104 |
| party | 0.137 |
| grooming | 0.106 |
| groomer | 0.104 |
| groomee | 0.104 |

- Party list: recorded for 8869 of 9255 sessions (0.958), on the first scan only. Roster males per list: min 0, quartiles 4 / 7 / 11, max 35, mean 7.982. The focal names himself in 342 lists (dropped).
- Party as a superset of the males seen near the focal: of 12203 (session, male within 5 m at some scan) pairs, 0.909 are in that session's party list.
- `prox2` against `prox5`: on 2527 scans with both, the two lists share no animal on 2514 and `prox2` lies inside `prox5` on 7; 8548 scans have only `prox2`, 5551 only `prox5`.
- Names not on the male roster (females, immatures, "unknown"): 0.075 of 16520 `prox2` names, 0.067 of 13369 `prox5` names, 0.005 of 71147 party names, 0.091 of 2568 partners groomed by the focal.
- Sessions of one animal on one day: 7853 animal-days with 1, 538 animal-days with 2, 54 animal-days with 3, 14 animal-days with 4, 8 animal-days with 5, 3 animal-days with 6, 1 animal-days with 7, 3 animal-days with 8, 1 animal-days with 9, 1 animal-days with 10.
- The same bout written twice: of 2093 bouts with the partner in the party, the partner is himself a focal animal that day in 1395, and his own session shows the same dyad in 314.
- Task B. Of 60616 scans with at least one male in the party (of 64671 scans): the focal gives grooming on 0.055, to a roster male on 0.05; he only receives on 0.048; grooming among others only on 0.001. Scans with a text note but no dyad: 130; unparsed dyad parts: 5; scans stored as more than one row: 308.
- Task C. Proximity is recorded on 0.259 of scans; when it is, animals within 2 m: min 0, quartiles 0 / 1 / 1, max 8, mean 0.987; in the 2–5 m ring: min 0, quartiles 0 / 0 / 1, max 10, mean 0.799. Mean share of the party's males within 5 m at a scan: 0.081.

## 3. Task A (whom the focal grooms), train part

Sessions: 6022. Bouts of grooming given by the focal: 1654 (received only: 1539 bouts, not scored). Bout length in scans: min 1, quartiles 1 / 1 / 1, max 6, mean 1.322. Records with more than one partner at the decision scan: 0. Share already under way at a session's first scan: 0.214.

| step | records removed (last row: kept) | records before the step |
| --- | --- | --- |
| partner-not-a-mature-male | 137 | 1654 |
| no-party-record | 9 | 1517 |
| party-under-2-males | 79 | 1508 |
| partner-outside-party | 59 | 1429 |
| partner-focal-in-another-part-that-day | 393 | 1370 |
| eligible | 977 | 977 |

Candidate available sets, on bouts whose partner is a roster male:

| set | records | set recorded | share | partner in the set | share | partner outside | set size (median; mean; max) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| party | 1517 | 1508 | 0.994 | 1434 | 0.951 | 0.049 | 7; 7.906; 33 |
| proxPrev | 1517 | 687 | 0.453 | 463 | 0.674 | 0.326 | 1; 1.85; 8 |
| union | 1517 | 1506 | 0.993 | 1451 | 0.963 | 0.037 | 7; 8.012; 33 |

Diagnostic, never an input: at the decision scan itself the partner is listed within 2 m on 0.968 of these bouts and in the 2–5 m ring on 0.005.

**Eligible records: 977, from 34 focal animals and 802 sessions** (0.162 per session); 362 distinct chooser-partner pairs, 45 distinct partners.
- Set size (party males): min 2, quartiles 5 / 7 / 12, max 33, mean 8.865; 10th and 90th percentiles 3 and 16; share over 8 (the cap of the simulation's social percept): 0.407; over 7: 0.478.
- With a set of 8 males or fewer: 579 records. If the same-day rule were dropped: 1370 records. Share of eligible records whose partner the focal had never groomed or been groomed by in the record before: 0.147.
- Eligible records per focal animal: min 1, quartiles 8.25 / 22 / 41.5, max 85, mean 28.735; animals with at least 10: 24, at least 30: 14, at least 100: 0; share of records from the 5 animals with most: 0.38.

| year | sessions | scans | focal animals | bouts given | eligible | animals with eligible | median set | chance | past partner (either direction) | stack |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1998 | 493 | 3447 | 16 | 129 | 83 | 15 | 6 | 0.19 | 0.412 | 0.48 |
| 1999 | 228 | 1595 | 17 | 63 | 36 | 13 | 7 | 0.178 | 0.377 | 0.429 |
| 2000 | 457 | 3188 | 23 | 121 | 79 | 18 | 12 | 0.107 | 0.352 | 0.393 |
| 2001 | 470 | 3287 | 23 | 112 | 74 | 20 | 8 | 0.158 | 0.48 | 0.509 |
| 2002 | 364 | 2544 | 23 | 80 | 57 | 16 | 7 | 0.143 | 0.386 | 0.404 |
| 2003 | 267 | 1866 | 24 | 91 | 40 | 18 | 5 | 0.218 | 0.298 | 0.398 |
| 2004 | 332 | 2322 | 24 | 109 | 65 | 18 | 5 | 0.256 | 0.463 | 0.506 |
| 2005 | 711 | 4962 | 26 | 169 | 92 | 17 | 8 | 0.151 | 0.293 | 0.359 |
| 2006 | 330 | 2305 | 23 | 88 | 64 | 16 | 21 | 0.055 | 0.273 | 0.32 |
| 2007 | 278 | 1944 | 26 | 77 | 34 | 16 | 4 | 0.267 | 0.38 | 0.488 |
| 2008 | 370 | 2587 | 26 | 94 | 50 | 18 | 5 | 0.24 | 0.46 | 0.45 |
| 2009 | 378 | 2643 | 24 | 128 | 70 | 18 | 7 | 0.19 | 0.471 | 0.557 |
| 2010 | 302 | 2109 | 22 | 121 | 65 | 18 | 6 | 0.205 | 0.472 | 0.61 |
| 2011 | 411 | 2873 | 20 | 119 | 64 | 15 | 9 | 0.147 | 0.344 | 0.43 |
| 2012 | 296 | 2069 | 21 | 71 | 51 | 15 | 7 | 0.163 | 0.428 | 0.418 |
| 2013 | 335 | 2344 | 23 | 82 | 53 | 17 | 8 | 0.151 | 0.324 | 0.494 |

Baselines, train part, primary unit (977 records, 34 animals). Expected top-1 accuracy, ties split evenly. "per record" pools records; intervals are 95% cluster bootstraps over focal animals; "per animal" is the mean of the animals' own accuracies.

| rule | per record | 95% interval | per animal | minus chance | 95% interval |
| --- | --- | --- | --- | --- | --- |
| chance (uniform over the set) | 0.171 | 0.16 to 0.183 | 0.183 | 0 | 0 to 0 |
| most frequent past partner (grooming given) | 0.389 | 0.337 to 0.448 | 0.354 | 0.218 | 0.168 to 0.276 |
| most frequent past partner (either direction) | 0.389 | 0.337 to 0.45 | 0.366 | 0.219 | 0.165 to 0.28 |
| last partner groomed | 0.372 | 0.327 to 0.419 | 0.341 | 0.202 | 0.156 to 0.249 |
| nearest at the previous scan | 0.314 | 0.282 to 0.352 | 0.335 | 0.144 | 0.116 to 0.178 |
| the male grooming him at the previous scan | 0.283 | 0.251 to 0.32 | 0.29 | 0.113 | 0.083 to 0.144 |
| most frequent past neighbour (within 5 m) | 0.347 | 0.312 to 0.385 | 0.348 | 0.176 | 0.138 to 0.215 |
| most frequent past party companion | 0.304 | 0.272 to 0.342 | 0.315 | 0.134 | 0.103 to 0.168 |
| stack: groomed me, then nearest, then past partner | 0.452 | 0.399 to 0.511 | 0.438 | 0.282 | 0.231 to 0.339 |
| check, not a rule: the male written first in the party list | 0.339 | 0.298 to 0.383 | 0.37 | 0.168 | 0.134 to 0.208 |

The same rules on other cuts (per record):

| rule | first bout with each partner in a session: 882 records, 34 animals | first bout of a session: 750 records, 34 animals | fresh (no grooming at the previous scan): 511 records, 33 animals | continuation (grooming at the previous scan): 258 records, 27 animals | unknown (no previous scan): 208 records, 29 animals |
| --- | --- | --- | --- | --- | --- |
| chance (uniform over the set) | 0.164 | 0.166 | 0.166 | 0.182 | 0.167 |
| most frequent past partner (grooming given) | 0.356 | 0.373 | 0.382 | 0.421 | 0.368 |
| most frequent past partner (either direction) | 0.362 | 0.377 | 0.367 | 0.435 | 0.385 |
| last partner groomed | 0.308 | 0.355 | 0.359 | 0.405 | 0.364 |
| nearest at the previous scan | 0.268 | 0.288 | 0.262 | 0.536 | 0.167 |
| the male grooming him at the previous scan | 0.246 | 0.255 | 0.166 | 0.609 | 0.167 |
| most frequent past neighbour (within 5 m) | 0.328 | 0.339 | 0.326 | 0.376 | 0.361 |
| most frequent past party companion | 0.295 | 0.309 | 0.295 | 0.318 | 0.31 |
| stack: groomed me, then nearest, then past partner | 0.407 | 0.446 | 0.403 | 0.605 | 0.385 |
| check, not a rule: the male written first in the party list | 0.317 | 0.356 | 0.258 | 0.298 | 0.587 |

Second score, a partner outside the party counted as a miss for every rule (1036 records): chance 0.161, past partner (either direction) 0.367, stack 0.427.

## 4. Task A (whom the focal grooms), development part

Sessions: 3233. Bouts of grooming given by the focal: 914 (received only: 1000 bouts, not scored). Bout length in scans: min 1, quartiles 1 / 1 / 1, max 6, mean 1.301. Records with more than one partner at the decision scan: 0. Share already under way at a session's first scan: 0.195.

| step | records removed (last row: kept) | records before the step |
| --- | --- | --- |
| partner-not-a-mature-male | 97 | 914 |
| no-party-record | 3 | 817 |
| party-under-2-males | 52 | 814 |
| partner-outside-party | 39 | 762 |
| partner-focal-in-another-part-that-day | 275 | 723 |
| eligible | 448 | 448 |

Candidate available sets, on bouts whose partner is a roster male:

| set | records | set recorded | share | partner in the set | share | partner outside | set size (median; mean; max) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| party | 817 | 814 | 0.996 | 762 | 0.936 | 0.064 | 6; 8.082; 33 |
| proxPrev | 817 | 386 | 0.472 | 251 | 0.65 | 0.35 | 1; 1.694; 6 |
| union | 817 | 811 | 0.993 | 780 | 0.962 | 0.038 | 6; 8.197; 33 |

Diagnostic, never an input: at the decision scan itself the partner is listed within 2 m on 0.971 of these bouts and in the 2–5 m ring on 0.006.

**Eligible records: 448, from 30 focal animals and 367 sessions** (0.139 per session); 196 distinct chooser-partner pairs, 49 distinct partners.
- Set size (party males): min 2, quartiles 5 / 8 / 12, max 33, mean 9.518; 10th and 90th percentiles 3 and 21; share over 8 (the cap of the simulation's social percept): 0.435; over 7: 0.518.
- With a set of 8 males or fewer: 253 records. If the same-day rule were dropped: 723 records. Share of eligible records whose partner the focal had never groomed or been groomed by in the record before: 0.1.
- Eligible records per focal animal: min 1, quartiles 3.5 / 8 / 17.75, max 81, mean 14.933; animals with at least 10: 11, at least 30: 3, at least 100: 0; share of records from the 5 animals with most: 0.574.

| year | sessions | scans | focal animals | bouts given | eligible | animals with eligible | median set | chance | past partner (either direction) | stack |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1998 | 185 | 1289 | 6 | 45 | 13 | 5 | 4 | 0.286 | 0.387 | 0.387 |
| 1999 | 85 | 594 | 6 | 30 | 11 | 5 | 6 | 0.252 | 0.318 | 0.318 |
| 2000 | 179 | 1253 | 10 | 39 | 14 | 6 | 10 | 0.099 | 0.286 | 0.44 |
| 2001 | 200 | 1398 | 10 | 47 | 19 | 7 | 9 | 0.126 | 0.447 | 0.395 |
| 2002 | 133 | 931 | 9 | 26 | 17 | 9 | 6 | 0.195 | 0.265 | 0.412 |
| 2003 | 135 | 945 | 9 | 55 | 20 | 7 | 4.5 | 0.285 | 0.55 | 0.55 |
| 2004 | 170 | 1189 | 9 | 47 | 21 | 4 | 4 | 0.252 | 0.571 | 0.667 |
| 2005 | 311 | 2165 | 9 | 85 | 30 | 6 | 7 | 0.165 | 0.517 | 0.517 |
| 2006 | 173 | 1209 | 9 | 53 | 26 | 6 | 19.5 | 0.066 | 0.423 | 0.462 |
| 2007 | 126 | 879 | 8 | 36 | 12 | 5 | 3.5 | 0.253 | 0.25 | 0.333 |
| 2008 | 127 | 886 | 8 | 36 | 10 | 5 | 5 | 0.237 | 0.5 | 0.5 |
| 2009 | 129 | 897 | 8 | 44 | 16 | 6 | 9 | 0.148 | 0.656 | 0.5 |
| 2010 | 142 | 994 | 7 | 50 | 22 | 6 | 6.5 | 0.166 | 0.364 | 0.5 |
| 2011 | 197 | 1378 | 7 | 58 | 25 | 6 | 9 | 0.142 | 0.52 | 0.64 |
| 2012 | 108 | 755 | 7 | 32 | 18 | 5 | 11 | 0.108 | 0.389 | 0.389 |
| 2013 | 128 | 896 | 7 | 24 | 14 | 5 | 9 | 0.185 | 0.643 | 0.643 |
| 2014 | 383 | 2679 | 26 | 121 | 99 | 22 | 10 | 0.14 | 0.412 | 0.475 |
| 2015 | 322 | 2249 | 29 | 86 | 61 | 23 | 7 | 0.171 | 0.383 | 0.484 |

Baselines, development part, primary unit (448 records, 30 animals). Expected top-1 accuracy, ties split evenly. "per record" pools records; intervals are 95% cluster bootstraps over focal animals; "per animal" is the mean of the animals' own accuracies.

| rule | per record | 95% interval | per animal | minus chance | 95% interval |
| --- | --- | --- | --- | --- | --- |
| chance (uniform over the set) | 0.168 | 0.151 to 0.18 | 0.176 | 0 | 0 to 0 |
| most frequent past partner (grooming given) | 0.438 | 0.357 to 0.493 | 0.415 | 0.271 | 0.2 to 0.318 |
| most frequent past partner (either direction) | 0.434 | 0.355 to 0.489 | 0.423 | 0.267 | 0.198 to 0.314 |
| last partner groomed | 0.369 | 0.293 to 0.437 | 0.313 | 0.201 | 0.134 to 0.265 |
| nearest at the previous scan | 0.31 | 0.256 to 0.377 | 0.326 | 0.143 | 0.095 to 0.207 |
| the male grooming him at the previous scan | 0.261 | 0.217 to 0.317 | 0.269 | 0.093 | 0.048 to 0.15 |
| most frequent past neighbour (within 5 m) | 0.436 | 0.375 to 0.484 | 0.477 | 0.269 | 0.217 to 0.312 |
| most frequent past party companion | 0.365 | 0.303 to 0.43 | 0.374 | 0.197 | 0.14 to 0.259 |
| stack: groomed me, then nearest, then past partner | 0.487 | 0.416 to 0.548 | 0.497 | 0.319 | 0.26 to 0.374 |
| check, not a rule: the male written first in the party list | 0.344 | 0.269 to 0.414 | 0.394 | 0.176 | 0.11 to 0.239 |

The same rules on other cuts (per record):

| rule | first bout with each partner in a session: 406 records, 30 animals | first bout of a session: 346 records, 30 animals | fresh (no grooming at the previous scan): 248 records, 27 animals | continuation (grooming at the previous scan): 101 records, 21 animals | unknown (no previous scan): 99 records, 25 animals | development: seen animals, 2014-2015: 136 records, 21 animals | development: unseen animals, 1998-2015: 312 records, 9 animals |
| --- | --- | --- | --- | --- | --- | --- | --- |
| chance (uniform over the set) | 0.163 | 0.168 | 0.159 | 0.179 | 0.179 | 0.154 | 0.174 |
| most frequent past partner (grooming given) | 0.42 | 0.457 | 0.46 | 0.345 | 0.48 | 0.39 | 0.46 |
| most frequent past partner (either direction) | 0.41 | 0.446 | 0.414 | 0.404 | 0.517 | 0.398 | 0.45 |
| last partner groomed | 0.313 | 0.364 | 0.38 | 0.381 | 0.328 | 0.337 | 0.382 |
| nearest at the previous scan | 0.274 | 0.297 | 0.262 | 0.559 | 0.179 | 0.319 | 0.307 |
| the male grooming him at the previous scan | 0.238 | 0.25 | 0.159 | 0.591 | 0.179 | 0.282 | 0.251 |
| most frequent past neighbour (within 5 m) | 0.421 | 0.457 | 0.411 | 0.411 | 0.527 | 0.401 | 0.452 |
| most frequent past party companion | 0.346 | 0.372 | 0.332 | 0.332 | 0.48 | 0.401 | 0.349 |
| stack: groomed me, then nearest, then past partner | 0.454 | 0.509 | 0.431 | 0.594 | 0.517 | 0.467 | 0.496 |
| check, not a rule: the male written first in the party list | 0.33 | 0.367 | 0.266 | 0.327 | 0.556 | 0.368 | 0.333 |

Second score, a partner outside the party counted as a miss for every rule (487 records): chance 0.154, past partner (either direction) 0.4, stack 0.448.

## 5. Held-out part: projected sample (development rate × held-out sessions; no held-out outcome was read)

| stratum | sessions | focal animals | projected eligible bouts |
| --- | --- | --- | --- |
| held-out | 3281 | 54 | 455 |
| held-out: seen animals, 2016-2022 | 1621 | 39 | 225 |
| held-out: unseen animals, 1998-2015 | 1144 | 13 | 159 |
| held-out: unseen animals, 2016-2022 | 516 | 9 | 72 |

## 6. Targets in `data/targets.json` that share records or animals with this dataset

Compromised for any kernel trained on the training part; flagged for any kernel scored on both.

| overlap | targets |
| --- | --- |
| A. same data package (Sandel et al. 2026) | 3: T-FIS-1 (held-out), T-FIS-3 (held-out), T-FIS-5 (held-out) |
| B. same focal protocol and males, 1998-2007, probably the same records | 2: T-SOC-1 (held-out), T-SOC-2 (held-out) |
| C. same males, other records (kinship, fission, subgroups, patrols, hunting, killings) | 29: T-ACT-2 (fitted), T-PTY-2 (held-out), T-IGE-1 (fitted), T-PAT-1 (fitted), T-PAT-2 (held-out), T-PAT-3 (held-out), T-PAT-4 (held-out), T-PAT-5 (held-out), T-PAT-6 (fitted), T-PAT-7 (held-out), T-PAT-8 (held-out), T-PAT-9 (held-out), T-LET-4 (held-out), T-LET-5 (held-out), T-LET-6 (held-out), T-FIS-2 (held-out), T-FIS-4 (held-out), T-HUN-1 (fitted), T-HUN-2 (fitted), T-HUN-3 (fitted), T-HUN-4 (held-out), T-HUN-5 (held-out), T-HUN-6 (held-out), T-HUN-7 (fitted), T-HUN-8 (held-out), T-HUN-9 (held-out), T-HUN-10 (held-out), T-END-7 (held-out), T-END-9 (held-out) |
| D. same community (a field value from Ngogo), other records | 21: T-ACT-4 (fitted), T-PTY-1 (fitted), T-PTY-4 (held-out), T-FOOD-1 (fitted), T-FOOD-2 (fitted), T-FOOD-3 (held-out), T-DEM-1 (fitted), T-DEM-2 (fitted), T-DEM-3 (held-out), T-DEM-6 (fitted), T-DEM-7 (held-out), T-DEM-9 (fitted), T-DEM-10 (fitted), T-DEM-12 (fitted), T-ENE-2 (fitted), T-RHY-4 (held-out), T-RHY-10 (held-out), T-END-2 (held-out), T-INF-1 (held-out), T-INF-2 (held-out), T-INF-5 (held-out) |

Flagged in all: 55 of 150 targets (19 fitted, 36 held-out by their role in the file).
