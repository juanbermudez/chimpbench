# RW bench: scores of the wild-choice harness (generated)

Written by `scripts/rw-score.ts --md`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw-bench-prereg.md`.

Packet rw-bench-v1; base seed 20261006; option order and names from mulberry32 seeded by FNV-1a of the record's stream text; shuffle 0 is the primary score. Intervals: 95% cluster bootstrap over focal males, 2000 draws, seed 20261006. Split rule hash 289bc621352e5e25….

## train part: 977 records, 34 focal males

Record-ids hash 3ee9db86c6559678….

| kernel | top-1 (answered option) | 95% interval | per male | minus chance | top-1, ties split | 95% interval | registered figure | reproduced | reciprocal rank | log loss | refused |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) | 0.182 | 0.16 to 0.204 | 0.204 | 0.012 (-0.013 to 0.036) | 0.171 | 0.16 to 0.183 | 0.171 (0.16 to 0.183) | yes | 0.385 (0.372 to 0.402) | 1.978 (1.916 to 2.03) | 0 |
| most frequent past partner (grooming given) | 0.392 | 0.34 to 0.453 | 0.369 | 0.221 (0.171 to 0.281) | 0.389 | 0.337 to 0.448 | 0.389 (0.337 to 0.448) | yes | 0.595 (0.553 to 0.637) | n/a | 0 |
| most frequent past partner (either direction) | 0.391 | 0.337 to 0.456 | 0.381 | 0.22 (0.165 to 0.286) | 0.389 | 0.337 to 0.45 | 0.389 (0.337 to 0.45) | yes | 0.592 (0.551 to 0.634) | n/a | 0 |
| nearest at the previous scan | 0.32 | 0.289 to 0.358 | 0.348 | 0.15 (0.121 to 0.185) | 0.314 | 0.282 to 0.352 | 0.314 (0.282 to 0.352) | yes | 0.502 (0.474 to 0.534) | n/a | 0 |
| stack: groomed me, then nearest, then past partner | 0.454 | 0.4 to 0.515 | 0.449 | 0.284 (0.232 to 0.342) | 0.452 | 0.399 to 0.511 | 0.452 (0.399 to 0.511) | yes | 0.631 (0.59 to 0.672) | n/a | 0 |
| the male grooming him at the previous scan | 0.297 | 0.265 to 0.331 | 0.319 | 0.126 (0.095 to 0.159) | 0.283 | 0.251 to 0.32 | 0.283 (0.251 to 0.32) | yes | 0.467 (0.44 to 0.499) | n/a | 0 |
| most frequent past neighbour (within 5 m) | 0.347 | 0.311 to 0.388 | 0.328 | 0.176 (0.137 to 0.217) | 0.347 | 0.312 to 0.385 | 0.347 (0.312 to 0.385) | yes | 0.564 (0.535 to 0.592) | n/a | 0 |
| check, not a rule: the first option | 0.174 | 0.147 to 0.2 | 0.174 | 0.003 (-0.019 to 0.024) | 0.174 | 0.147 to 0.2 | none | n/a | 0.388 (0.362 to 0.414) | n/a | 0 |

Chance (mean of 1 / set size): 0.171. Records with a history or memory line cut to the line limit: 45.

By choice-set size (top-1 with ties split; records, focal males):

| kernel | 2 to 4 (233, 31) | 5 to 8 (346, 32) | 9 to 16 (301, 28) | 17 and over (97, 25) | 8 or fewer (579, 34) | more than 8 (398, 28) |
| --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) | 0.344 (0.326 to 0.36) | 0.16 (0.157 to 0.163) | 0.088 (0.086 to 0.09) | 0.047 (0.045 to 0.048) | 0.234 (0.221 to 0.248) | 0.078 (0.075 to 0.081) |
| most frequent past partner (grooming given) | 0.52 (0.428 to 0.609) | 0.418 (0.35 to 0.482) | 0.31 (0.241 to 0.371) | 0.217 (0.129 to 0.313) | 0.459 (0.397 to 0.523) | 0.287 (0.226 to 0.342) |
| most frequent past partner (either direction) | 0.511 (0.433 to 0.602) | 0.418 (0.349 to 0.49) | 0.305 (0.235 to 0.367) | 0.256 (0.158 to 0.35) | 0.455 (0.393 to 0.529) | 0.293 (0.235 to 0.346) |
| nearest at the previous scan | 0.493 (0.446 to 0.538) | 0.292 (0.252 to 0.339) | 0.252 (0.213 to 0.297) | 0.159 (0.101 to 0.23) | 0.373 (0.339 to 0.409) | 0.229 (0.188 to 0.272) |
| stack: groomed me, then nearest, then past partner | 0.579 (0.495 to 0.665) | 0.462 (0.388 to 0.544) | 0.394 (0.315 to 0.465) | 0.295 (0.209 to 0.387) | 0.509 (0.44 to 0.586) | 0.37 (0.303 to 0.43) |
| the male grooming him at the previous scan | 0.469 (0.427 to 0.512) | 0.261 (0.229 to 0.297) | 0.223 (0.178 to 0.273) | 0.104 (0.059 to 0.164) | 0.345 (0.314 to 0.376) | 0.194 (0.153 to 0.237) |
| most frequent past neighbour (within 5 m) | 0.492 (0.412 to 0.589) | 0.358 (0.306 to 0.409) | 0.266 (0.21 to 0.328) | 0.206 (0.128 to 0.303) | 0.412 (0.365 to 0.466) | 0.251 (0.204 to 0.298) |
| check, not a rule: the first option | 0.378 (0.299 to 0.443) | 0.15 (0.108 to 0.196) | 0.09 (0.058 to 0.123) | 0.031 (0 to 0.073) | 0.242 (0.199 to 0.281) | 0.075 (0.05 to 0.102) |

By what preceded the bout, and by stratum (top-1 with ties split):

| kernel | fresh (511, 33) | continuation (258, 27) | unknown (208, 29) |
| --- | --- | --- | --- |
| Null (uniform over the menu) | 0.166 | 0.182 | 0.167 |
| most frequent past partner (grooming given) | 0.382 | 0.421 | 0.368 |
| most frequent past partner (either direction) | 0.367 | 0.435 | 0.385 |
| nearest at the previous scan | 0.262 | 0.536 | 0.167 |
| stack: groomed me, then nearest, then past partner | 0.403 | 0.605 | 0.385 |
| the male grooming him at the previous scan | 0.166 | 0.609 | 0.167 |
| most frequent past neighbour (within 5 m) | 0.326 | 0.376 | 0.361 |
| check, not a rule: the first option | 0.168 | 0.19 | 0.168 |

Option-order sensitivity: the same records under several shuffles (top-1 of the answered option).

| kernel | shuffles | top-1 per shuffle | range | same male under every shuffle | mean relative position of the answer (0.5: none) | answers on the first option (expected) |
| --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) | 5 | 0.182, 0.177, 0.181, 0.158, 0.169 | 0.025 | 0.006 | 0.501 | 0.17 (0.171) |
| most frequent past partner (grooming given) | 5 | 0.392, 0.393, 0.393, 0.394, 0.385 | 0.009 | 0.84 | 0.505 | 0.168 (0.171) |
| most frequent past partner (either direction) | 5 | 0.391, 0.397, 0.395, 0.385, 0.387 | 0.012 | 0.897 | 0.502 | 0.169 (0.171) |
| nearest at the previous scan | 5 | 0.32, 0.313, 0.33, 0.31, 0.307 | 0.023 | 0.298 | 0.504 | 0.167 (0.171) |
| stack: groomed me, then nearest, then past partner | 5 | 0.454, 0.454, 0.455, 0.452, 0.452 | 0.003 | 0.933 | 0.5 | 0.172 (0.171) |
| the male grooming him at the previous scan | 5 | 0.297, 0.285, 0.298, 0.273, 0.279 | 0.025 | 0.197 | 0.506 | 0.167 (0.171) |
| most frequent past neighbour (within 5 m) | 5 | 0.347, 0.347, 0.346, 0.349, 0.347 | 0.003 | 0.96 | 0.502 | 0.171 (0.171) |
| check, not a rule: the first option | 5 | 0.174, 0.177, 0.185, 0.156, 0.162 | 0.03 | 0.007 | 0 | 1 (0.171) |

Packet sizes, shuffle 0 (977 records). No tokenizer could be run offline, so tokens are the server's estimate (`estimateInputTokens`, fitted on packets of at most 8 options: extrapolated).

|  | median | 90th percentile | largest |
| --- | --- | --- | --- |
| options | 7 | 16 | 33 |
| request (JSON), characters | 2753 | 5249 | 9646 |
| GLiNER text packet (JSON), characters | 1080 | 1718 | 2824 |
| GLiNER text packet, estimated tokens | 239 | 398 | 655 |
| Codex prompt, characters per case | 414 | 658 | 1025 |

Against the worker's hard limit of 1280 tokens: 0 records over it by the estimate; 0 if the estimate were low by half; 0 over the registered budget of 1200; 5 over the serving path's latency budget of 613. Largest estimate by set size: 8 or fewer: 349; 9 to 16: 448; 17 and over: 655. Codex cases of the part together: 431246 characters.

## development part: 448 records, 30 focal males

Record-ids hash 5537e23a9156ad29….

| kernel | top-1 (answered option) | 95% interval | per male | minus chance | top-1, ties split | 95% interval | registered figure | reproduced | reciprocal rank | log loss | refused |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) | 0.179 | 0.125 to 0.226 | 0.18 | 0.011 (-0.034 to 0.051) | 0.168 | 0.151 to 0.18 | 0.168 (0.151 to 0.18) | yes | 0.379 (0.354 to 0.398) | 2.019 (1.925 to 2.132) | 0 |
| most frequent past partner (grooming given) | 0.433 | 0.345 to 0.488 | 0.421 | 0.265 (0.186 to 0.314) | 0.438 | 0.357 to 0.493 | 0.438 (0.357 to 0.493) | yes | 0.62 (0.559 to 0.662) | n/a | 0 |
| most frequent past partner (either direction) | 0.442 | 0.363 to 0.495 | 0.436 | 0.274 (0.207 to 0.319) | 0.434 | 0.355 to 0.489 | 0.434 (0.355 to 0.489) | yes | 0.623 (0.568 to 0.662) | n/a | 0 |
| nearest at the previous scan | 0.315 | 0.242 to 0.381 | 0.297 | 0.147 (0.083 to 0.21) | 0.31 | 0.256 to 0.377 | 0.31 (0.256 to 0.377) | yes | 0.494 (0.446 to 0.545) | n/a | 0 |
| stack: groomed me, then nearest, then past partner | 0.487 | 0.418 to 0.545 | 0.471 | 0.319 (0.261 to 0.372) | 0.487 | 0.416 to 0.548 | 0.487 (0.416 to 0.548) | yes | 0.66 (0.608 to 0.706) | n/a | 0 |
| the male grooming him at the previous scan | 0.261 | 0.209 to 0.31 | 0.26 | 0.094 (0.048 to 0.141) | 0.261 | 0.217 to 0.317 | 0.261 (0.217 to 0.317) | yes | 0.445 (0.41 to 0.487) | n/a | 0 |
| most frequent past neighbour (within 5 m) | 0.438 | 0.373 to 0.486 | 0.461 | 0.27 (0.214 to 0.313) | 0.436 | 0.375 to 0.484 | 0.436 (0.375 to 0.484) | yes | 0.618 (0.565 to 0.658) | n/a | 0 |
| check, not a rule: the first option | 0.147 | 0.12 to 0.174 | 0.139 | -0.02 (-0.05 to 0.01) | 0.147 | 0.12 to 0.174 | none | n/a | 0.374 (0.347 to 0.404) | n/a | 0 |

Chance (mean of 1 / set size): 0.168. Records with a history or memory line cut to the line limit: 44.

By choice-set size (top-1 with ties split; records, focal males):

| kernel | 2 to 4 (101, 21) | 5 to 8 (152, 25) | 9 to 16 (135, 24) | 17 and over (60, 19) | 8 or fewer (253, 29) | more than 8 (195, 25) |
| --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) | 0.355 (0.333 to 0.373) | 0.159 (0.155 to 0.165) | 0.092 (0.089 to 0.096) | 0.042 (0.04 to 0.046) | 0.237 (0.224 to 0.248) | 0.077 (0.071 to 0.083) |
| most frequent past partner (grooming given) | 0.628 (0.49 to 0.732) | 0.462 (0.346 to 0.541) | 0.342 (0.257 to 0.441) | 0.278 (0.169 to 0.424) | 0.528 (0.409 to 0.591) | 0.322 (0.264 to 0.383) |
| most frequent past partner (either direction) | 0.605 (0.477 to 0.681) | 0.436 (0.318 to 0.533) | 0.358 (0.259 to 0.461) | 0.317 (0.192 to 0.46) | 0.503 (0.389 to 0.579) | 0.345 (0.275 to 0.411) |
| nearest at the previous scan | 0.551 (0.488 to 0.626) | 0.283 (0.216 to 0.37) | 0.236 (0.167 to 0.317) | 0.143 (0.084 to 0.212) | 0.39 (0.333 to 0.467) | 0.207 (0.157 to 0.268) |
| stack: groomed me, then nearest, then past partner | 0.691 (0.585 to 0.763) | 0.456 (0.355 to 0.547) | 0.43 (0.318 to 0.546) | 0.35 (0.244 to 0.466) | 0.55 (0.454 to 0.621) | 0.405 (0.331 to 0.487) |
| the male grooming him at the previous scan | 0.491 (0.42 to 0.583) | 0.234 (0.187 to 0.311) | 0.188 (0.121 to 0.271) | 0.105 (0.045 to 0.158) | 0.336 (0.288 to 0.409) | 0.163 (0.107 to 0.221) |
| most frequent past neighbour (within 5 m) | 0.642 (0.549 to 0.742) | 0.439 (0.372 to 0.491) | 0.356 (0.257 to 0.439) | 0.267 (0.13 to 0.451) | 0.52 (0.473 to 0.56) | 0.328 (0.236 to 0.407) |
| check, not a rule: the first option | 0.297 (0.209 to 0.373) | 0.151 (0.098 to 0.22) | 0.081 (0.047 to 0.122) | 0.033 (0 to 0.08) | 0.209 (0.163 to 0.256) | 0.067 (0.039 to 0.1) |

By what preceded the bout, and by stratum (top-1 with ties split):

| kernel | fresh (248, 27) | continuation (101, 21) | unknown (99, 25) | development: seen animals, 2014-2015 (136, 21) | development: unseen animals, 1998-2015 (312, 9) |
| --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) | 0.159 | 0.179 | 0.179 | 0.154 | 0.174 |
| most frequent past partner (grooming given) | 0.46 | 0.345 | 0.48 | 0.39 | 0.46 |
| most frequent past partner (either direction) | 0.414 | 0.404 | 0.517 | 0.398 | 0.45 |
| nearest at the previous scan | 0.262 | 0.559 | 0.179 | 0.319 | 0.307 |
| stack: groomed me, then nearest, then past partner | 0.431 | 0.594 | 0.517 | 0.467 | 0.496 |
| the male grooming him at the previous scan | 0.159 | 0.591 | 0.179 | 0.282 | 0.251 |
| most frequent past neighbour (within 5 m) | 0.411 | 0.411 | 0.527 | 0.401 | 0.452 |
| check, not a rule: the first option | 0.141 | 0.139 | 0.172 | 0.118 | 0.16 |

Option-order sensitivity: the same records under several shuffles (top-1 of the answered option).

| kernel | shuffles | top-1 per shuffle | range | same male under every shuffle | mean relative position of the answer (0.5: none) | answers on the first option (expected) |
| --- | --- | --- | --- | --- | --- | --- |
| Null (uniform over the menu) | 5 | 0.179, 0.152, 0.167, 0.181, 0.167 | 0.029 | 0.002 | 0.495 | 0.179 (0.168) |
| most frequent past partner (grooming given) | 5 | 0.433, 0.438, 0.438, 0.444, 0.44 | 0.011 | 0.902 | 0.492 | 0.176 (0.168) |
| most frequent past partner (either direction) | 5 | 0.442, 0.435, 0.44, 0.446, 0.433 | 0.013 | 0.929 | 0.488 | 0.178 (0.168) |
| nearest at the previous scan | 5 | 0.315, 0.308, 0.308, 0.31, 0.313 | 0.007 | 0.299 | 0.495 | 0.165 (0.168) |
| stack: groomed me, then nearest, then past partner | 5 | 0.487, 0.487, 0.493, 0.489, 0.484 | 0.009 | 0.953 | 0.487 | 0.174 (0.168) |
| the male grooming him at the previous scan | 5 | 0.261, 0.257, 0.257, 0.266, 0.266 | 0.009 | 0.163 | 0.493 | 0.178 (0.168) |
| most frequent past neighbour (within 5 m) | 5 | 0.438, 0.44, 0.44, 0.433, 0.438 | 0.007 | 0.969 | 0.499 | 0.168 (0.168) |
| check, not a rule: the first option | 5 | 0.147, 0.176, 0.176, 0.165, 0.154 | 0.029 | 0.007 | 0 | 1 (0.168) |

Packet sizes, shuffle 0 (448 records). No tokenizer could be run offline, so tokens are the server's estimate (`estimateInputTokens`, fitted on packets of at most 8 options: extrapolated).

|  | median | 90th percentile | largest |
| --- | --- | --- | --- |
| options | 8 | 21 | 33 |
| request (JSON), characters | 2994 | 6492 | 9647 |
| GLiNER text packet (JSON), characters | 1109 | 1999 | 2754 |
| GLiNER text packet, estimated tokens | 249 | 463 | 664 |
| Codex prompt, characters per case | 430 | 752 | 1012 |

Against the worker's hard limit of 1280 tokens: 0 records over it by the estimate; 0 if the estimate were low by half; 0 over the registered budget of 1200; 4 over the serving path's latency budget of 613. Largest estimate by set size: 8 or fewer: 346; 9 to 16: 461; 17 and over: 664. Codex cases of the part together: 208333 characters.
