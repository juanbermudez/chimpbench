# RW2: scores on the wild records of the three deposits (generated)

Written by `scripts/rw2-score.ts --md`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw2-prereg.md`.

Packet rw2-v1; base seed 20261011; shuffle 0 is the primary score. A rule's score is its expected top-1 with ties split evenly; a model's is the top-1 of the option it answered. Intervals: 95%, a bootstrap over individuals (2000 draws), for the score pooled over records and for the score with each individual weighted equally.

## Taï: the first adult groomed among those in sight, train part

557 eligible records from 11 animals; 599 written by the reader, left out: 42 same-day. Chance (the share of options that are partners): 0.232 pooled, 0.254 with each of the animals weighted equally.

| kernel | view | score, pooled (95% over animals) | score, each of the animals equal (95%) | minus chance, pooled (95%) | minus chance, equal weight (95%) | answered option top-1 | refused |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) `null` | own | 0.232 (0.205 to 0.271) | 0.254 (0.216 to 0.297) | 0 (0 to 0) | 0 (0 to 0) | 0.235 | 0 |
| the adult it most often groomed first before `past-partner` | own | 0.344 (0.321 to 0.399) | 0.381 (0.321 to 0.47) | 0.112 (0.079 to 0.16) | 0.127 (0.056 to 0.204) | 0.345 | 0 |
| the partner of its previous session today `last-today` | own | 0.257 (0.221 to 0.308) | 0.292 (0.245 to 0.368) | 0.025 (0.003 to 0.06) | 0.038 (-0.011 to 0.094) | 0.251 | 0 |
| the highest-ranking adult in sight `rank-high` | own | 0.3 (0.241 to 0.342) | 0.364 (0.238 to 0.514) | 0.068 (-0.002 to 0.106) | 0.11 (-0.004 to 0.256) | 0.3 | 0 |
| the adult nearest to it in rank among those in sight `rank-near` | own | 0.198 (0.155 to 0.232) | 0.215 (0.113 to 0.367) | -0.034 (-0.092 to 0.008) | -0.039 (-0.119 to 0.079) | 0.201 | 0 |
| the adult with the strongest bond with it `bond-high` | own | 0.242 (0.198 to 0.315) | 0.307 (0.18 to 0.47) | 0.01 (-0.029 to 0.065) | 0.052 (-0.09 to 0.22) | 0.242 | 0 |
| an adult of its own sex `same-sex` | own | 0.221 (0.175 to 0.263) | 0.195 (0.129 to 0.263) | -0.011 (-0.059 to 0.011) | -0.059 (-0.106 to -0.018) | 0.235 | 0 |
| the adult it had aggression with in the last half hour `aggression` | own | 0.248 (0.207 to 0.302) | 0.259 (0.214 to 0.304) | 0.016 (-0.003 to 0.041) | 0.005 (-0.012 to 0.022) | 0.251 | 0 |
| the female with an infant under 3 months `young-infant` | own | 0.25 (0.208 to 0.317) | 0.27 (0.223 to 0.32) | 0.018 (0.001 to 0.048) | 0.016 (0.001 to 0.033) | 0.251 | 0 |
| stack (own view): past partner, then the partner of earlier today, then highest rank `stack-own` | own | 0.343 (0.323 to 0.395) | 0.433 (0.33 to 0.56) | 0.111 (0.069 to 0.159) | 0.179 (0.062 to 0.31) | 0.343 | 0 |
| the adult whose strongest bond with a bystander is weakest `third-max-low` | third | 0.287 (0.258 to 0.336) | 0.364 (0.265 to 0.505) | 0.055 (0.018 to 0.088) | 0.11 (0.024 to 0.245) | 0.276 | 0 |
| the adult with the weakest mean bond with the others present `third-mean-low` | third | 0.324 (0.288 to 0.377) | 0.378 (0.29 to 0.512) | 0.092 (0.032 to 0.135) | 0.124 (0.021 to 0.266) | 0.316 | 0 |
| stack (third view): past partner, then weakest mean bond with the others, then highest rank `stack-third` | third | 0.35 (0.327 to 0.409) | 0.438 (0.33 to 0.566) | 0.118 (0.072 to 0.174) | 0.184 (0.062 to 0.313) | 0.35 | 0 |
| check, not a rule: the first option `first-option` | own | 0.226 (0.207 to 0.249) | 0.218 (0.155 to 0.282) | -0.006 (-0.041 to 0.018) | -0.036 (-0.087 to 0.006) | 0.226 | 0 |

By cut (score pooled, ties split; records and animals in the heading; the first row is chance):

| kernel | 8 options or fewer (442, 11) | more than 8 options (115, 7) | male choosers (499, 6) | female choosers (58, 5) |
| --- | --- | --- | --- | --- |
| chance | 0.267 | 0.097 | 0.23 | 0.253 |
| `null` | 0.267 | 0.097 | 0.23 | 0.253 |
| `past-partner` | 0.372 | 0.236 | 0.333 | 0.44 |
| `last-today` | 0.298 | 0.099 | 0.251 | 0.302 |
| `rank-high` | 0.319 | 0.226 | 0.293 | 0.362 |
| `rank-near` | 0.229 | 0.083 | 0.195 | 0.224 |
| `bond-high` | 0.281 | 0.096 | 0.24 | 0.259 |
| `same-sex` | 0.248 | 0.12 | 0.224 | 0.197 |
| `aggression` | 0.278 | 0.135 | 0.249 | 0.244 |
| `young-infant` | 0.289 | 0.102 | 0.249 | 0.259 |
| `stack-own` | 0.371 | 0.235 | 0.333 | 0.431 |
| `third-max-low` | 0.337 | 0.096 | 0.285 | 0.31 |
| `third-mean-low` | 0.347 | 0.235 | 0.32 | 0.362 |
| `stack-third` | 0.378 | 0.243 | 0.341 | 0.431 |
| `first-option` | 0.258 | 0.104 | 0.224 | 0.241 |

Option order: the same records under several shuffles (top-1 of the answered option). The order check must sit at chance.

| kernel | shuffles | top-1 per shuffle | range | answers on the first option (expected) |
| --- | --- | --- | --- | --- |
| `null` | 5 | 0.235, 0.233, 0.232, 0.235, 0.242 | 0.011 | 0.244 (0.232) |
| `past-partner` | 5 | 0.345, 0.33, 0.343, 0.341, 0.343 | 0.014 | 0.237 (0.232) |
| `last-today` | 5 | 0.251, 0.26, 0.251, 0.266, 0.239 | 0.027 | 0.255 (0.232) |
| `rank-high` | 5 | 0.3, 0.3, 0.3, 0.3, 0.3 | 0 | 0.238 (0.232) |
| `rank-near` | 5 | 0.201, 0.205, 0.212, 0.19, 0.208 | 0.022 | 0.23 (0.232) |
| `bond-high` | 5 | 0.242, 0.242, 0.242, 0.242, 0.242 | 0 | 0.236 (0.232) |
| `same-sex` | 5 | 0.235, 0.214, 0.237, 0.235, 0.241 | 0.027 | 0.23 (0.232) |
| `aggression` | 5 | 0.251, 0.244, 0.253, 0.259, 0.253 | 0.014 | 0.239 (0.232) |
| `young-infant` | 5 | 0.251, 0.246, 0.239, 0.259, 0.257 | 0.02 | 0.241 (0.232) |
| `stack-own` | 5 | 0.343, 0.343, 0.343, 0.343, 0.343 | 0 | 0.244 (0.232) |
| `third-max-low` | 5 | 0.276, 0.284, 0.284, 0.289, 0.294 | 0.018 | 0.236 (0.232) |
| `third-mean-low` | 5 | 0.316, 0.321, 0.32, 0.325, 0.336 | 0.02 | 0.231 (0.232) |
| `stack-third` | 5 | 0.35, 0.35, 0.35, 0.35, 0.35 | 0 | 0.242 (0.232) |
| `first-option` | 5 | 0.226, 0.26, 0.221, 0.271, 0.25 | 0.05 | 1 (0.232) |

Packet lengths (the server's token estimate, shuffle 0) and what one model pass over this part would take, from 0.44 s at 467 tokens growing as tokens to the power 1.5 (no model was run):

| view | kernel | records | kernel calls | tokens: median | 90th percentile | largest | estimated time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| own | plain (one call a record) | 557 | 557 | 224 | 337 | 450 | 89 s |
| own | fanned out, +fan2 (115 menus wider than 8) | 557 | 787 | 202 | 260 | 326 | 1.7 min |
| third | plain (one call a record) | 557 | 557 | 278 | 410 | 534 | 2.1 min |
| third | fanned out, +fan2 (115 menus wider than 8) | 557 | 787 | 254 | 320 | 391 | 2.4 min |

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

## Kanyawara: who attacked alongside a participant, train part

145 eligible records from 20 females; 159 written by the reader, left out: 14 same-day-repeat. Chance (the share of options that are partners): 0.218 pooled, 0.179 with each of the females weighted equally.

| kernel | view | score, pooled (95% over females) | score, each of the females equal (95%) | minus chance, pooled (95%) | minus chance, equal weight (95%) | answered option top-1 | refused |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) `null` | own | 0.218 (0.185 to 0.239) | 0.179 (0.144 to 0.215) | 0 (0 to 0) | 0 (0 to 0) | 0.255 | 0 |
| most often in her party in the previous two years `assoc-prev` | own | 0.351 (0.201 to 0.464) | 0.232 (0.146 to 0.327) | 0.133 (0.007 to 0.234) | 0.053 (-0.011 to 0.124) | 0.372 | 0 |
| most often within 5 m in the previous two years `near-prev` | own | 0.365 (0.212 to 0.485) | 0.242 (0.153 to 0.34) | 0.147 (0.015 to 0.253) | 0.064 (-0.004 to 0.138) | 0.386 | 0 |
| groomed with her in the previous two years `groomed-prev` | own | 0.317 (0.222 to 0.393) | 0.27 (0.185 to 0.377) | 0.099 (0.029 to 0.161) | 0.091 (0.017 to 0.198) | 0.324 | 0 |
| most grooming with her in the previous two years `groomdur-prev` | own | 0.307 (0.208 to 0.383) | 0.252 (0.158 to 0.365) | 0.089 (0.012 to 0.149) | 0.074 (-0.014 to 0.188) | 0.331 | 0 |
| her close kin `kin` | own | 0.241 (0.203 to 0.286) | 0.222 (0.157 to 0.306) | 0.023 (0 to 0.066) | 0.043 (0 to 0.104) | 0.283 | 0 |
| the highest-ranking female present, by rank over the previous two years `rank-high` | own | 0.254 (0.193 to 0.311) | 0.191 (0.129 to 0.253) | 0.037 (-0.007 to 0.084) | 0.012 (-0.036 to 0.06) | 0.276 | 0 |
| not a newcomer `resident` | own | 0.265 (0.218 to 0.299) | 0.209 (0.153 to 0.267) | 0.047 (0.031 to 0.062) | 0.03 (0.007 to 0.054) | 0.269 | 0 |
| attacked alongside her most often before `allied-before` | own | 0.417 (0.272 to 0.534) | 0.285 (0.201 to 0.377) | 0.199 (0.079 to 0.304) | 0.106 (0.046 to 0.173) | 0.428 | 0 |
| most often in joint attacks before `frequent-aggressor` | own | 0.367 (0.246 to 0.458) | 0.259 (0.154 to 0.361) | 0.15 (0.053 to 0.226) | 0.08 (-0.011 to 0.17) | 0.379 | 0 |
| stack: attacked alongside her before, then most often in her party, then most often in joint attacks `stack` | own | 0.395 (0.233 to 0.522) | 0.248 (0.149 to 0.351) | 0.177 (0.039 to 0.29) | 0.069 (0 to 0.147) | 0.4 | 0 |
| comparison only (looks ahead): most often in her party in the period of the event `assoc-now` | lookahead | 0.4 (0.241 to 0.535) | 0.31 (0.182 to 0.446) | 0.182 (0.049 to 0.302) | 0.131 (0.019 to 0.263) | 0.4 | 0 |
| comparison only (looks ahead): the highest-ranking female present, by rank over the period of the event `rank-now` | lookahead | 0.31 (0.221 to 0.385) | 0.201 (0.115 to 0.293) | 0.093 (0.024 to 0.152) | 0.023 (-0.047 to 0.094) | 0.31 | 0 |
| check, not a rule: the first option `first-option` | own | 0.2 (0.144 to 0.274) | 0.205 (0.104 to 0.328) | -0.018 (-0.075 to 0.07) | 0.027 (-0.069 to 0.143) | 0.2 | 0 |

By cut (score pooled, ties split; records and females in the heading; the first row is chance):

| kernel | 8 options or fewer (90, 16) | more than 8 options (55, 19) | with bonds from the previous two years (2012 on) (107, 19) | pair coalitions (116, 20) |
| --- | --- | --- | --- | --- |
| chance | 0.286 | 0.106 | 0.178 | 0.167 |
| `null` | 0.286 | 0.106 | 0.178 | 0.167 |
| `assoc-prev` | 0.43 | 0.222 | 0.359 | 0.293 |
| `near-prev` | 0.441 | 0.24 | 0.377 | 0.319 |
| `groomed-prev` | 0.394 | 0.191 | 0.313 | 0.253 |
| `groomdur-prev` | 0.359 | 0.222 | 0.299 | 0.255 |
| `kin` | 0.314 | 0.121 | 0.198 | 0.187 |
| `rank-high` | 0.363 | 0.076 | 0.228 | 0.232 |
| `resident` | 0.356 | 0.116 | 0.21 | 0.193 |
| `allied-before` | 0.496 | 0.287 | 0.393 | 0.344 |
| `frequent-aggressor` | 0.487 | 0.173 | 0.313 | 0.27 |
| `stack` | 0.481 | 0.255 | 0.364 | 0.313 |
| `assoc-now` | 0.489 | 0.255 | 0.346 | 0.319 |
| `rank-now` | 0.456 | 0.073 | 0.215 | 0.25 |
| `first-option` | 0.278 | 0.073 | 0.168 | 0.138 |

Option order: the same records under several shuffles (top-1 of the answered option). The order check must sit at chance.

| kernel | shuffles | top-1 per shuffle | range | answers on the first option (expected) |
| --- | --- | --- | --- | --- |
| `null` | 5 | 0.255, 0.186, 0.186, 0.221, 0.193 | 0.069 | 0.179 (0.163) |
| `assoc-prev` | 5 | 0.372, 0.366, 0.366, 0.379, 0.338 | 0.041 | 0.156 (0.163) |
| `near-prev` | 5 | 0.386, 0.379, 0.379, 0.393, 0.352 | 0.041 | 0.171 (0.163) |
| `groomed-prev` | 5 | 0.324, 0.331, 0.324, 0.317, 0.331 | 0.014 | 0.168 (0.163) |
| `groomdur-prev` | 5 | 0.331, 0.317, 0.317, 0.345, 0.303 | 0.041 | 0.163 (0.163) |
| `kin` | 5 | 0.283, 0.214, 0.2, 0.228, 0.221 | 0.083 | 0.178 (0.163) |
| `rank-high` | 5 | 0.276, 0.269, 0.269, 0.283, 0.241 | 0.041 | 0.161 (0.163) |
| `resident` | 5 | 0.269, 0.228, 0.262, 0.241, 0.248 | 0.041 | 0.164 (0.163) |
| `allied-before` | 5 | 0.428, 0.4, 0.421, 0.414, 0.421 | 0.028 | 0.154 (0.163) |
| `frequent-aggressor` | 5 | 0.379, 0.366, 0.366, 0.372, 0.359 | 0.021 | 0.171 (0.163) |
| `stack` | 5 | 0.4, 0.393, 0.4, 0.4, 0.386 | 0.014 | 0.15 (0.163) |
| `assoc-now` | 5 | 0.4, 0.4, 0.4, 0.4, 0.4 | 0 | 0.138 (0.163) |
| `rank-now` | 5 | 0.31, 0.31, 0.31, 0.31, 0.31 | 0 | 0.154 (0.163) |
| `first-option` | 5 | 0.2, 0.186, 0.172, 0.255, 0.179 | 0.083 | 1 (0.163) |

Packet lengths (the server's token estimate, shuffle 0) and what one model pass over this part would take, from 0.44 s at 467 tokens growing as tokens to the power 1.5 (no model was run):

| view | kernel | records | kernel calls | tokens: median | 90th percentile | largest | estimated time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| own | plain (one call a record) | 145 | 145 | 335 | 445 | 553 | 37 s |
| own | fanned out, +fan2 (55 menus wider than 8) | 145 | 255 | 280 | 345 | 379 | 50 s |

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

