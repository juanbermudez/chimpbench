# RW2: scores on the wild records of the three deposits (generated)

Written by `scripts/rw2-score.ts --md`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw2-prereg.md`.

Packet rw2-v1; base seed 20261011; shuffle 0 is the primary score. A rule's score is its expected top-1 with ties split evenly; a model's is the top-1 of the option it answered. Intervals: 95%, a bootstrap over individuals (2000 draws), for the score pooled over records and for the score with each individual weighted equally.

## Taï: the first adult groomed among those in sight, development part

329 eligible records from 13 animals; 353 written by the reader, left out: 24 same-day. Chance (the share of options that are partners): 0.244 pooled, 0.239 with each of the animals weighted equally.

| kernel | view | score, pooled (95% over animals) | score, each of the animals equal (95%) | minus chance, pooled (95%) | minus chance, equal weight (95%) | answered option top-1 | refused |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) `null` | own | 0.244 (0.223 to 0.266) | 0.239 (0.221 to 0.257) | 0 (0 to 0) | 0 (0 to 0) | 0.216 | 0 |
| the adult it most often groomed first before `past-partner` | own | 0.347 (0.307 to 0.383) | 0.339 (0.284 to 0.394) | 0.103 (0.067 to 0.146) | 0.1 (0.051 to 0.152) | 0.331 | 0 |
| the partner of its previous session today `last-today` | own | 0.27 (0.239 to 0.288) | 0.247 (0.211 to 0.281) | 0.026 (0.003 to 0.047) | 0.008 (-0.025 to 0.036) | 0.258 | 0 |
| the highest-ranking adult in sight `rank-high` | own | 0.325 (0.247 to 0.378) | 0.291 (0.211 to 0.372) | 0.081 (0.006 to 0.148) | 0.053 (-0.034 to 0.137) | 0.325 | 0 |
| the adult nearest to it in rank among those in sight `rank-near` | own | 0.254 (0.202 to 0.304) | 0.252 (0.175 to 0.328) | 0.01 (-0.027 to 0.045) | 0.013 (-0.058 to 0.084) | 0.267 | 0 |
| the adult with the strongest bond with it `bond-high` | own | 0.298 (0.252 to 0.363) | 0.328 (0.246 to 0.419) | 0.054 (0.002 to 0.126) | 0.089 (0.014 to 0.174) | 0.298 | 0 |
| an adult of its own sex `same-sex` | own | 0.266 (0.213 to 0.297) | 0.248 (0.183 to 0.315) | 0.022 (-0.024 to 0.063) | 0.009 (-0.055 to 0.076) | 0.255 | 0 |
| the adult it had aggression with in the last half hour `aggression` | own | 0.255 (0.219 to 0.291) | 0.248 (0.22 to 0.281) | 0.011 (-0.005 to 0.028) | 0.009 (-0.005 to 0.031) | 0.243 | 0 |
| the female with an infant under 3 months `young-infant` | own | 0.264 (0.227 to 0.3) | 0.26 (0.224 to 0.303) | 0.02 (-0.001 to 0.048) | 0.022 (-0.014 to 0.061) | 0.24 | 0 |
| stack (own view): past partner, then the partner of earlier today, then highest rank `stack-own` | own | 0.353 (0.304 to 0.391) | 0.333 (0.27 to 0.4) | 0.109 (0.069 to 0.151) | 0.095 (0.036 to 0.155) | 0.353 | 0 |
| the adult whose strongest bond with a bystander is weakest `third-max-low` | third | 0.255 (0.213 to 0.293) | 0.271 (0.205 to 0.358) | 0.011 (-0.024 to 0.054) | 0.032 (-0.035 to 0.11) | 0.261 | 0 |
| the adult with the weakest mean bond with the others present `third-mean-low` | third | 0.271 (0.237 to 0.327) | 0.312 (0.251 to 0.377) | 0.027 (-0.011 to 0.093) | 0.073 (0.01 to 0.143) | 0.274 | 0 |
| stack (third view): past partner, then weakest mean bond with the others, then highest rank `stack-third` | third | 0.365 (0.323 to 0.409) | 0.368 (0.3 to 0.432) | 0.121 (0.077 to 0.173) | 0.129 (0.062 to 0.193) | 0.365 | 0 |
| check, not a rule: the first option `first-option` | own | 0.216 (0.147 to 0.269) | 0.168 (0.111 to 0.223) | -0.028 (-0.087 to 0.01) | -0.071 (-0.123 to -0.016) | 0.216 | 0 |
| GLiNER2.5-Decide (r4c-rules-state) `gliner` | own | 0.289 (0.254 to 0.324) | 0.272 (0.207 to 0.328) | 0.045 (-0.007 to 0.096) | 0.033 (-0.039 to 0.098) | 0.289 | 0 |
| GLiNER2.5-Decide (r4c-rules-state), fanned out (fan2) `gliner+fan2` | own | 0.301 (0.255 to 0.344) | 0.275 (0.213 to 0.328) | 0.057 (-0.009 to 0.116) | 0.037 (-0.034 to 0.099) | 0.301 | 0 |

By cut (score pooled, ties split; records and animals in the heading; the first row is chance):

| kernel | 8 options or fewer (270, 13) | more than 8 options (59, 10) | seen animals, January and February 2015 (131, 9) | unseen animals, January and February 2015 (38, 3) | unseen animals, before 2015 (160, 4) | male choosers (292, 8) | female choosers (37, 5) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| chance | 0.276 | 0.099 | 0.236 | 0.239 | 0.252 | 0.248 | 0.213 |
| `null` | 0.276 | 0.099 | 0.236 | 0.239 | 0.252 | 0.248 | 0.213 |
| `past-partner` | 0.391 | 0.144 | 0.369 | 0.382 | 0.321 | 0.36 | 0.247 |
| `last-today` | 0.299 | 0.136 | 0.278 | 0.249 | 0.269 | 0.283 | 0.169 |
| `rank-high` | 0.363 | 0.153 | 0.298 | 0.316 | 0.35 | 0.336 | 0.243 |
| `rank-near` | 0.285 | 0.11 | 0.229 | 0.276 | 0.269 | 0.252 | 0.27 |
| `bond-high` | 0.333 | 0.136 | 0.298 | 0.237 | 0.313 | 0.291 | 0.351 |
| `same-sex` | 0.297 | 0.127 | 0.234 | 0.265 | 0.293 | 0.274 | 0.202 |
| `aggression` | 0.291 | 0.088 | 0.248 | 0.245 | 0.262 | 0.26 | 0.208 |
| `young-infant` | 0.296 | 0.119 | 0.268 | 0.241 | 0.267 | 0.267 | 0.237 |
| `stack-own` | 0.396 | 0.153 | 0.374 | 0.395 | 0.325 | 0.37 | 0.216 |
| `third-max-low` | 0.281 | 0.136 | 0.237 | 0.303 | 0.259 | 0.253 | 0.27 |
| `third-mean-low` | 0.285 | 0.203 | 0.279 | 0.329 | 0.25 | 0.26 | 0.351 |
| `stack-third` | 0.411 | 0.153 | 0.405 | 0.395 | 0.325 | 0.377 | 0.27 |
| `first-option` | 0.256 | 0.034 | 0.168 | 0.237 | 0.25 | 0.223 | 0.162 |
| `gliner` | 0.333 | 0.085 | 0.305 | 0.289 | 0.275 | 0.298 | 0.216 |
| `gliner+fan2` | 0.333 | 0.153 | 0.321 | 0.342 | 0.275 | 0.312 | 0.216 |

Against the bar `stack-own` on the same records (answered option; the interval is over animals; a difference is called one only if it excludes 0):

| kernel | kernel | bar | difference (95%) | only the kernel right | only the bar right | a difference |
| --- | --- | --- | --- | --- | --- | --- |
| `gliner` | 0.289 | 0.353 | -0.064 (-0.109 to -0.013) | 31 | 52 | yes |
| `gliner+fan2` | 0.301 | 0.353 | -0.052 (-0.108 to 0.009) | 33 | 50 | no |

Option order: the same records under several shuffles (top-1 of the answered option). The order check must sit at chance.

| kernel | shuffles | top-1 per shuffle | range | answers on the first option (expected) |
| --- | --- | --- | --- | --- |
| `null` | 5 | 0.216, 0.231, 0.234, 0.249, 0.237 | 0.033 | 0.227 (0.244) |
| `past-partner` | 5 | 0.331, 0.347, 0.35, 0.347, 0.356 | 0.024 | 0.238 (0.244) |
| `last-today` | 5 | 0.258, 0.267, 0.271, 0.267, 0.258 | 0.012 | 0.215 (0.244) |
| `rank-high` | 5 | 0.325, 0.325, 0.325, 0.325, 0.325 | 0 | 0.233 (0.244) |
| `rank-near` | 5 | 0.267, 0.249, 0.24, 0.261, 0.264 | 0.027 | 0.232 (0.244) |
| `bond-high` | 5 | 0.298, 0.298, 0.298, 0.298, 0.298 | 0 | 0.24 (0.244) |
| `same-sex` | 5 | 0.255, 0.274, 0.271, 0.277, 0.313 | 0.058 | 0.233 (0.244) |
| `aggression` | 5 | 0.243, 0.246, 0.249, 0.267, 0.255 | 0.024 | 0.225 (0.244) |
| `young-infant` | 5 | 0.24, 0.246, 0.252, 0.271, 0.271 | 0.03 | 0.226 (0.244) |
| `stack-own` | 5 | 0.353, 0.353, 0.353, 0.353, 0.353 | 0 | 0.237 (0.244) |
| `third-max-low` | 5 | 0.261, 0.246, 0.234, 0.274, 0.255 | 0.04 | 0.236 (0.244) |
| `third-mean-low` | 5 | 0.274, 0.267, 0.255, 0.289, 0.271 | 0.033 | 0.238 (0.244) |
| `stack-third` | 5 | 0.365, 0.365, 0.365, 0.365, 0.365 | 0 | 0.237 (0.244) |
| `first-option` | 5 | 0.216, 0.216, 0.231, 0.258, 0.228 | 0.043 | 1 (0.244) |

Packet lengths (the server's token estimate, shuffle 0) and what one model pass over this part would take, from 0.44 s at 467 tokens growing as tokens to the power 1.5 (no model was run):

| view | kernel | records | kernel calls | tokens: median | 90th percentile | largest | estimated time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| own | plain (one call a record) | 329 | 329 | 215 | 326 | 409 | 50 s |
| own | fanned out, +fan2 (59 menus wider than 8) | 329 | 447 | 200 | 256 | 305 | 56 s |
| third | plain (one call a record) | 329 | 329 | 269 | 399 | 495 | 69 s |
| third | fanned out, +fan2 (59 menus wider than 8) | 329 | 447 | 254 | 316 | 367 | 79 s |

## Kanyawara: who attacked alongside a participant, development part

29 eligible records from 13 females; 29 written by the reader. Chance (the share of options that are partners): 0.239 pooled, 0.246 with each of the females weighted equally.

| kernel | view | score, pooled (95% over females) | score, each of the females equal (95%) | minus chance, pooled (95%) | minus chance, equal weight (95%) | answered option top-1 | refused |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) `null` | own | 0.239 (0.206 to 0.277) | 0.246 (0.189 to 0.306) | 0 (0 to 0) | 0 (0 to 0) | 0.345 | 0 |
| most often in her party in the previous two years `assoc-prev` | own | 0.315 (0.217 to 0.434) | 0.334 (0.203 to 0.482) | 0.076 (-0.006 to 0.175) | 0.089 (-0.008 to 0.216) | 0.31 | 0 |
| most often within 5 m in the previous two years `near-prev` | own | 0.419 (0.304 to 0.536) | 0.388 (0.245 to 0.543) | 0.18 (0.081 to 0.28) | 0.142 (0.03 to 0.28) | 0.414 | 0 |
| groomed with her in the previous two years `groomed-prev` | own | 0.327 (0.251 to 0.397) | 0.291 (0.206 to 0.378) | 0.088 (0.024 to 0.149) | 0.045 (-0.004 to 0.107) | 0.379 | 0 |
| most grooming with her in the previous two years `groomdur-prev` | own | 0.384 (0.274 to 0.519) | 0.373 (0.232 to 0.529) | 0.145 (0.053 to 0.257) | 0.127 (0.015 to 0.265) | 0.379 | 0 |
| her close kin `kin` | own | 0.33 (0.225 to 0.468) | 0.325 (0.223 to 0.433) | 0.091 (0 to 0.212) | 0.079 (0 to 0.164) | 0.448 | 0 |
| the highest-ranking female present, by rank over the previous two years `rank-high` | own | 0.315 (0.188 to 0.483) | 0.357 (0.218 to 0.509) | 0.076 (-0.036 to 0.223) | 0.112 (-0.009 to 0.251) | 0.31 | 0 |
| not a newcomer `resident` | own | 0.311 (0.252 to 0.395) | 0.338 (0.221 to 0.481) | 0.073 (0.043 to 0.122) | 0.093 (0.028 to 0.177) | 0.379 | 0 |
| attacked alongside her most often before `allied-before` | own | 0.552 (0.394 to 0.673) | 0.419 (0.275 to 0.573) | 0.314 (0.157 to 0.425) | 0.173 (0.036 to 0.326) | 0.586 | 0 |
| most often in joint attacks before `frequent-aggressor` | own | 0.534 (0.333 to 0.69) | 0.431 (0.226 to 0.664) | 0.296 (0.11 to 0.435) | 0.185 (0.007 to 0.377) | 0.517 | 0 |
| stack: attacked alongside her before, then most often in her party, then most often in joint attacks `stack` | own | 0.621 (0.435 to 0.765) | 0.495 (0.272 to 0.726) | 0.382 (0.213 to 0.504) | 0.249 (0.049 to 0.449) | 0.621 | 0 |
| comparison only (looks ahead): most often in her party in the period of the event `assoc-now` | lookahead | 0.345 (0.15 to 0.533) | 0.3 (0.113 to 0.497) | 0.106 (-0.088 to 0.287) | 0.054 (-0.141 to 0.252) | 0.345 | 0 |
| comparison only (looks ahead): the highest-ranking female present, by rank over the period of the event `rank-now` | lookahead | 0.414 (0.25 to 0.63) | 0.464 (0.231 to 0.687) | 0.175 (0.029 to 0.382) | 0.218 (0.018 to 0.413) | 0.414 | 0 |
| check, not a rule: the first option `first-option` | own | 0.379 (0.194 to 0.556) | 0.331 (0.138 to 0.536) | 0.141 (-0.056 to 0.337) | 0.085 (-0.132 to 0.315) | 0.379 | 0 |
| GLiNER2.5-Decide (r4c-rules-state) `gliner` | own | 0.414 (0.241 to 0.565) | 0.418 (0.195 to 0.639) | 0.175 (0.006 to 0.325) | 0.172 (-0.037 to 0.385) | 0.414 | 0 |
| GLiNER2.5-Decide (r4c-rules-state), fanned out (fan2) `gliner+fan2` | own | 0.345 (0.158 to 0.5) | 0.303 (0.103 to 0.528) | 0.106 (-0.065 to 0.248) | 0.057 (-0.119 to 0.241) | 0.345 | 0 |

By cut (score pooled, ties split; records and females in the heading; the first row is chance):

| kernel | 8 options or fewer (20, 11) | more than 8 options (9, 6) | with bonds from the previous two years (2012 on) (18, 8) | pair coalitions (20, 12) |
| --- | --- | --- | --- | --- |
| chance | 0.282 | 0.142 | 0.21 | 0.232 |
| `null` | 0.282 | 0.142 | 0.21 | 0.232 |
| `assoc-prev` | 0.346 | 0.247 | 0.333 | 0.169 |
| `near-prev` | 0.496 | 0.247 | 0.5 | 0.369 |
| `groomed-prev` | 0.375 | 0.219 | 0.352 | 0.313 |
| `groomdur-prev` | 0.446 | 0.247 | 0.444 | 0.369 |
| `kin` | 0.414 | 0.142 | 0.274 | 0.268 |
| `rank-high` | 0.396 | 0.136 | 0.333 | 0.269 |
| `resident` | 0.368 | 0.187 | 0.263 | 0.292 |
| `allied-before` | 0.59 | 0.469 | 0.535 | 0.526 |
| `frequent-aggressor` | 0.575 | 0.444 | 0.444 | 0.5 |
| `stack` | 0.7 | 0.444 | 0.556 | 0.6 |
| `assoc-now` | 0.4 | 0.222 | 0.278 | 0.2 |
| `rank-now` | 0.55 | 0.111 | 0.333 | 0.35 |
| `first-option` | 0.35 | 0.444 | 0.333 | 0.4 |
| `gliner` | 0.4 | 0.444 | 0.333 | 0.45 |
| `gliner+fan2` | 0.4 | 0.222 | 0.278 | 0.4 |

Against the bar `stack` on the same records (answered option; the interval is over females; a difference is called one only if it excludes 0):

| kernel | kernel | bar | difference (95%) | only the kernel right | only the bar right | a difference |
| --- | --- | --- | --- | --- | --- | --- |
| `gliner` | 0.414 | 0.621 | -0.207 (-0.407 to 0.042) | 4 | 10 | no |
| `gliner+fan2` | 0.345 | 0.621 | -0.276 (-0.472 to -0.083) | 2 | 10 | yes |

Option order: the same records under several shuffles (top-1 of the answered option). The order check must sit at chance.

| kernel | shuffles | top-1 per shuffle | range | answers on the first option (expected) |
| --- | --- | --- | --- | --- |
| `null` | 5 | 0.345, 0.379, 0.241, 0.207, 0.241 | 0.172 | 0.172 (0.199) |
| `assoc-prev` | 5 | 0.31, 0.414, 0.241, 0.276, 0.31 | 0.172 | 0.179 (0.199) |
| `near-prev` | 5 | 0.414, 0.517, 0.345, 0.379, 0.414 | 0.172 | 0.186 (0.199) |
| `groomed-prev` | 5 | 0.379, 0.517, 0.276, 0.276, 0.345 | 0.241 | 0.186 (0.199) |
| `groomdur-prev` | 5 | 0.379, 0.483, 0.31, 0.345, 0.379 | 0.172 | 0.193 (0.199) |
| `kin` | 5 | 0.448, 0.414, 0.345, 0.31, 0.379 | 0.138 | 0.159 (0.199) |
| `rank-high` | 5 | 0.31, 0.414, 0.241, 0.276, 0.31 | 0.172 | 0.186 (0.199) |
| `resident` | 5 | 0.379, 0.448, 0.414, 0.207, 0.345 | 0.241 | 0.152 (0.199) |
| `allied-before` | 5 | 0.586, 0.655, 0.517, 0.517, 0.621 | 0.138 | 0.255 (0.199) |
| `frequent-aggressor` | 5 | 0.517, 0.552, 0.517, 0.517, 0.552 | 0.034 | 0.207 (0.199) |
| `stack` | 5 | 0.621, 0.621, 0.621, 0.621, 0.621 | 0 | 0.228 (0.199) |
| `assoc-now` | 5 | 0.345, 0.345, 0.345, 0.345, 0.345 | 0 | 0.228 (0.199) |
| `rank-now` | 5 | 0.414, 0.414, 0.414, 0.414, 0.414 | 0 | 0.207 (0.199) |
| `first-option` | 5 | 0.379, 0.241, 0.276, 0.241, 0.207 | 0.172 | 1 (0.199) |

Packet lengths (the server's token estimate, shuffle 0) and what one model pass over this part would take, from 0.44 s at 467 tokens growing as tokens to the power 1.5 (no model was run):

| view | kernel | records | kernel calls | tokens: median | 90th percentile | largest | estimated time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| own | plain (one call a record) | 29 | 29 | 258 | 409 | 469 | 7 s |
| own | fanned out, +fan2 (9 menus wider than 8) | 29 | 47 | 288 | 358 | 390 | 9 s |

