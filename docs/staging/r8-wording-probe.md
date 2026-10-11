# Stage R8: the rules' pick by an option's wording alone (no model)

Written by `scripts/r8-wording-probe.ts` from the saved records of stage R4 (3200 training records, 2091 of them fresh draws; 1500 held-out, 954 fresh draws). Fresh draws only: a kept act is not a choice among the wordings.

## The rest option, by the sentence the rules wrote

| Sentence (training records) | Draws | Rules picked it | Rate |
| --- | --- | --- | --- |
| Sit and digest after feeding | 773 | 280 | 0.362 |
| Sit and rest nearby | 517 | 8 | 0.015 |
| Rest here; energy is low (N%) | 350 | 76 | 0.217 |
| Rest through the midday heat (N °C) | 173 | 55 | 0.318 |
| Sit quietly in the dark | 40 | 14 | 0.350 |
| Rest to favor my wounds | 3 | 0 | 0.000 |

| Sentence (held-out records) | Draws | Rules picked it | Rate |
| --- | --- | --- | --- |
| Sit and digest after feeding | 351 | 148 | 0.422 |
| Sit and rest nearby | 212 | 2 | 0.009 |
| Rest here; energy is low (N%) | 183 | 43 | 0.235 |
| Rest through the midday heat (N °C) | 53 | 22 | 0.415 |
| Sit quietly in the dark | 10 | 5 | 0.500 |

## The groom option

| Sentence | Records | Draws | Rules picked it | Rate |
| --- | --- | --- | --- | --- |
| Groom my ally NAME to keep his support | training | 30 | 10 | 0.333 |
| every other groom sentence | training | 1436 | 134 | 0.093 |
| Groom my ally NAME to keep his support | held-out | 15 | 2 | 0.133 |
| every other groom sentence | held-out | 580 | 66 | 0.114 |

## A predictor that reads the wording alone

| Fitted on the training draws, read on | Draws | Chance | The neutral label alone | The rules' sentence alone |
| --- | --- | --- | --- | --- |
| the held-out draws | 954 | 0.186 | 0.425 | 0.516 |
| the training draws themselves | 2091 | 0.176 | 0.381 | 0.517 |

Distinct wordings in the training draws: 31 neutral labels, 111 rules' sentences (names, species, numbers and compass words masked).

## By act: the lowest and the highest pick rate among the sentences the rules wrote for it

(training draws; sentences with 30 draws or more)

| Act | Sentences | Lowest (rate, draws) | Highest (rate, draws) | Gap |
| --- | --- | --- | --- | --- |
| play | 6 | Play with the young NAME (0.000, 427) | Play back with NAME, who is inviting me with a play face (0.786, 56) | 0.786 |
| pant-grunt | 3 | Pant-grunt to NAME (0.152, 467) | Pant-grunt to NAME, displaying (0.833, 36) | 0.681 |
| rest | 5 | Sit and rest nearby (0.015, 517) | Sit and digest after feeding (0.362, 773) | 0.347 |
| groom | 12 | Groom NAME, juvenile (0.000, 30) | Groom my ally NAME to keep his support (0.333, 30) | 0.333 |
| nest | 3 | Build a night nest in the SPECIES N m away; dusk is falling (0.730, 63) | Stay in my night nest for the night (0.922, 77) | 0.192 |
| display | 4 | Charging display with branch-dragging (0.032, 665) | Arrival display with branch-dragging as the party reunites (0.160, 94) | 0.128 |
| forage | 8 | Forage on leaves and pith nearby; no ripe fruit in sight (0.059, 388) | Feed on ripe fruit in the SPECIES N m away (crop N%) (0.174, 396) | 0.115 |
| travel | 4 | Travel N m DIR to a SPECIES I remember with ripe figs (0.212, 656) | Travel toward NAME's pant-hoots N m DIR (0.306, 170) | 0.094 |
| charge | 6 | Charge at NAME (0.000, 191) | Charge at NAME, a recent immigrant, near my food (0.081, 37) | 0.081 |
| follow | 2 | Follow NAME, who is moving off DIR (0.083, 36) | Keep up with my mother NAME (0.113, 53) | 0.030 |
| call | 2 | Pant-hoot and drum as the party reunites (0.009, 113) | Pant-hoot so my allies out of sight know where I am (0.021, 700) | 0.013 |
