# R4b numbers: the wild-choice benchmark, development part (the untuned and r4-rules-state outputs are R4's) (generated)

Written by `scripts/r4-wild-report.ts` from the per-record outputs of `scripts/rw-score.ts`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/r4-prereg.md` §6.4. Whom a wild adult male groomed among the adult males of his party; top-1 of the answered option, shuffle 0; intervals are 95% cluster bootstraps over focal males (2,000 draws). A difference is called one only if its paired interval excludes 0. The held-out part is sealed and was not read.

## Top-1 by choice-set size (448 records)

| kernel | all | 8 or fewer | more than 8 | refused |
| --- | --- | --- | --- | --- |
| untuned, plain | 0.373 (0.308 to 0.438; n 448) | 0.522 (0.449 to 0.609; n 253) | 0.179 (0.123 to 0.238; n 195) | 3 |
| untuned, fan-out | 0.435 (0.371 to 0.511; n 448) | 0.522 (0.449 to 0.609; n 253) | 0.323 (0.235 to 0.417; n 195) | 0 |
| r4-rules-state, plain | 0.406 (0.331 to 0.47; n 448) | 0.553 (0.466 to 0.623; n 253) | 0.215 (0.153 to 0.276; n 195) | 3 |
| r4-rules-state, fan-out | 0.48 (0.414 to 0.542; n 448) | 0.553 (0.466 to 0.623; n 253) | 0.385 (0.31 to 0.458; n 195) | 0 |
| r4b-rules-state, plain | 0.417 (0.338 to 0.481; n 448) | 0.565 (0.48 to 0.632; n 253) | 0.226 (0.156 to 0.291; n 195) | 3 |
| r4b-rules-state, fan-out | 0.48 (0.408 to 0.545; n 448) | 0.565 (0.48 to 0.632; n 253) | 0.369 (0.299 to 0.443; n 195) | 0 |
| stack | 0.487 (0.418 to 0.545; n 448) | 0.542 (0.445 to 0.612; n 253) | 0.415 (0.338 to 0.497; n 195) | 0 |
| null | 0.179 (0.125 to 0.226; n 448) | 0.237 (0.167 to 0.298; n 253) | 0.103 (0.067 to 0.14; n 195) | 0 |

## Paired differences on the same records (A minus B)

| pair | records | n | A | B | difference | 95% interval | a difference | only A right / only B right | sign test p |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r4-rules-state, plain minus untuned, plain | all | 448 | 0.406 | 0.373 | 0.033 | -0.011 to 0.07 | no | 45 / 30 | 0.105 |
| r4-rules-state, plain minus untuned, plain | 8 or fewer | 253 | 0.553 | 0.522 | 0.032 | -0.035 to 0.08 | no | 31 / 23 | 0.341 |
| r4-rules-state, plain minus untuned, plain | more than 8 | 195 | 0.215 | 0.179 | 0.036 | -0.007 to 0.073 | no | 14 / 7 | 0.189 |
| r4-rules-state, fan-out minus untuned, fan-out | all | 448 | 0.48 | 0.435 | 0.045 | -0.009 to 0.092 | no | 55 / 35 | 0.045 |
| r4-rules-state, fan-out minus untuned, fan-out | 8 or fewer | 253 | 0.553 | 0.522 | 0.032 | -0.035 to 0.08 | no | 31 / 23 | 0.341 |
| r4-rules-state, fan-out minus untuned, fan-out | more than 8 | 195 | 0.385 | 0.323 | 0.062 | -0.01 to 0.132 | no | 24 / 12 | 0.065 |
| r4-rules-state, plain minus stack | all | 448 | 0.406 | 0.487 | -0.08 | -0.107 to -0.052 | **yes** | 27 / 63 | 0 |
| r4-rules-state, plain minus stack | 8 or fewer | 253 | 0.553 | 0.542 | 0.012 | -0.021 to 0.052 | no | 20 / 17 | 0.743 |
| r4-rules-state, plain minus stack | more than 8 | 195 | 0.215 | 0.415 | -0.2 | -0.252 to -0.148 | **yes** | 7 / 46 | 0 |
| r4-rules-state, fan-out minus stack | all | 448 | 0.48 | 0.487 | -0.007 | -0.032 to 0.024 | no | 31 / 34 | 0.804 |
| r4-rules-state, fan-out minus stack | 8 or fewer | 253 | 0.553 | 0.542 | 0.012 | -0.021 to 0.052 | no | 20 / 17 | 0.743 |
| r4-rules-state, fan-out minus stack | more than 8 | 195 | 0.385 | 0.415 | -0.031 | -0.078 to 0.027 | no | 11 / 17 | 0.345 |
| r4b-rules-state, plain minus untuned, plain | all | 448 | 0.417 | 0.373 | 0.045 | -0.004 to 0.079 | no | 48 / 28 | 0.029 |
| r4b-rules-state, plain minus untuned, plain | 8 or fewer | 253 | 0.565 | 0.522 | 0.043 | -0.026 to 0.087 | no | 33 / 22 | 0.177 |
| r4b-rules-state, plain minus untuned, plain | more than 8 | 195 | 0.226 | 0.179 | 0.046 | 0 to 0.084 | no | 15 / 6 | 0.078 |
| r4b-rules-state, fan-out minus untuned, fan-out | all | 448 | 0.48 | 0.435 | 0.045 | -0.004 to 0.087 | no | 55 / 35 | 0.045 |
| r4b-rules-state, fan-out minus untuned, fan-out | 8 or fewer | 253 | 0.565 | 0.522 | 0.043 | -0.026 to 0.087 | no | 33 / 22 | 0.177 |
| r4b-rules-state, fan-out minus untuned, fan-out | more than 8 | 195 | 0.369 | 0.323 | 0.046 | -0.014 to 0.105 | no | 22 / 13 | 0.175 |
| r4b-rules-state, plain minus stack | all | 448 | 0.417 | 0.487 | -0.069 | -0.099 to -0.042 | **yes** | 31 / 62 | 0.002 |
| r4b-rules-state, plain minus stack | 8 or fewer | 253 | 0.565 | 0.542 | 0.024 | -0.017 to 0.07 | no | 23 / 17 | 0.43 |
| r4b-rules-state, plain minus stack | more than 8 | 195 | 0.226 | 0.415 | -0.19 | -0.239 to -0.143 | **yes** | 8 / 45 | 0 |
| r4b-rules-state, fan-out minus stack | all | 448 | 0.48 | 0.487 | -0.007 | -0.032 to 0.021 | no | 33 / 36 | 0.81 |
| r4b-rules-state, fan-out minus stack | 8 or fewer | 253 | 0.565 | 0.542 | 0.024 | -0.017 to 0.07 | no | 23 / 17 | 0.43 |
| r4b-rules-state, fan-out minus stack | more than 8 | 195 | 0.369 | 0.415 | -0.046 | -0.085 to -0.005 | **yes** | 10 / 19 | 0.136 |
| untuned, plain minus stack | all | 448 | 0.373 | 0.487 | -0.114 | -0.146 to -0.075 | **yes** | 33 / 84 | 0 |
| untuned, plain minus stack | 8 or fewer | 253 | 0.522 | 0.542 | -0.02 | -0.081 to 0.056 | no | 26 / 31 | 0.597 |
| untuned, plain minus stack | more than 8 | 195 | 0.179 | 0.415 | -0.236 | -0.292 to -0.171 | **yes** | 7 / 53 | 0 |
| untuned, fan-out minus stack | all | 448 | 0.435 | 0.487 | -0.051 | -0.096 to -0.004 | **yes** | 36 / 59 | 0.023 |
| untuned, fan-out minus stack | 8 or fewer | 253 | 0.522 | 0.542 | -0.02 | -0.081 to 0.056 | no | 26 / 31 | 0.597 |
| untuned, fan-out minus stack | more than 8 | 195 | 0.323 | 0.415 | -0.092 | -0.14 to -0.031 | **yes** | 10 / 28 | 0.005 |
| r4b-rules-state, plain minus r4-rules-state, plain | all | 448 | 0.417 | 0.406 | 0.011 | 0 to 0.023 | no | 6 / 1 | 0.125 |
| r4b-rules-state, plain minus r4-rules-state, plain | 8 or fewer | 253 | 0.565 | 0.553 | 0.012 | 0 to 0.026 | no | 4 / 1 | 0.375 |
| r4b-rules-state, plain minus r4-rules-state, plain | more than 8 | 195 | 0.226 | 0.215 | 0.01 | 0 to 0.02 | no | 2 / 0 | 0.5 |
| r4b-rules-state, fan-out minus r4-rules-state, fan-out | all | 448 | 0.48 | 0.48 | 0 | -0.018 to 0.016 | no | 9 / 9 | 1 |
| r4b-rules-state, fan-out minus r4-rules-state, fan-out | 8 or fewer | 253 | 0.565 | 0.553 | 0.012 | 0 to 0.026 | no | 4 / 1 | 0.375 |
| r4b-rules-state, fan-out minus r4-rules-state, fan-out | more than 8 | 195 | 0.369 | 0.385 | -0.015 | -0.052 to 0.024 | no | 5 / 8 | 0.581 |

