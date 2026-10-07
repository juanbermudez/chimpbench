# R4 numbers: the wild-choice benchmark, development part (generated)

Written by `scripts/r4-wild-report.ts` from the per-record outputs of `scripts/rw-score.ts`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/r4-prereg.md` §6.4. Whom a wild adult male groomed among the adult males of his party; top-1 of the answered option, shuffle 0; intervals are 95% cluster bootstraps over focal males (2,000 draws). A difference is called one only if its paired interval excludes 0. The held-out part is sealed and was not read.

## Top-1 by choice-set size (448 records)

| kernel | all | 8 or fewer | more than 8 | refused |
| --- | --- | --- | --- | --- |
| untuned, plain | 0.373 (0.308 to 0.438; n 448) | 0.522 (0.449 to 0.609; n 253) | 0.179 (0.123 to 0.238; n 195) | 3 |
| untuned, fan-out | 0.435 (0.371 to 0.511; n 448) | 0.522 (0.449 to 0.609; n 253) | 0.323 (0.235 to 0.417; n 195) | 0 |
| r4-rules-state, plain | 0.406 (0.331 to 0.47; n 448) | 0.553 (0.466 to 0.623; n 253) | 0.215 (0.153 to 0.276; n 195) | 3 |
| r4-rules-state, fan-out | 0.48 (0.414 to 0.542; n 448) | 0.553 (0.466 to 0.623; n 253) | 0.385 (0.31 to 0.458; n 195) | 0 |
| r4-field-groom, plain | 0.4 (0.32 to 0.474; n 448) | 0.549 (0.473 to 0.611; n 253) | 0.205 (0.13 to 0.303; n 195) | 3 |
| r4-field-groom, fan-out | 0.48 (0.417 to 0.55; n 448) | 0.549 (0.473 to 0.611; n 253) | 0.39 (0.317 to 0.489; n 195) | 0 |
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
| r4-field-groom, plain minus untuned, plain | all | 448 | 0.4 | 0.373 | 0.027 | -0.01 to 0.057 | no | 43 / 31 | 0.201 |
| r4-field-groom, plain minus untuned, plain | 8 or fewer | 253 | 0.549 | 0.522 | 0.028 | -0.033 to 0.067 | no | 30 / 23 | 0.41 |
| r4-field-groom, plain minus untuned, plain | more than 8 | 195 | 0.205 | 0.179 | 0.026 | -0.031 to 0.094 | no | 13 / 8 | 0.383 |
| r4-field-groom, fan-out minus untuned, fan-out | all | 448 | 0.48 | 0.435 | 0.045 | 0.012 to 0.077 | **yes** | 57 / 37 | 0.049 |
| r4-field-groom, fan-out minus untuned, fan-out | 8 or fewer | 253 | 0.549 | 0.522 | 0.028 | -0.033 to 0.067 | no | 30 / 23 | 0.41 |
| r4-field-groom, fan-out minus untuned, fan-out | more than 8 | 195 | 0.39 | 0.323 | 0.067 | 0.004 to 0.133 | **yes** | 27 / 14 | 0.06 |
| r4-field-groom, plain minus stack | all | 448 | 0.4 | 0.487 | -0.087 | -0.116 to -0.055 | **yes** | 29 / 68 | 0 |
| r4-field-groom, plain minus stack | 8 or fewer | 253 | 0.549 | 0.542 | 0.008 | -0.037 to 0.057 | no | 21 / 19 | 0.875 |
| r4-field-groom, plain minus stack | more than 8 | 195 | 0.205 | 0.415 | -0.21 | -0.269 to -0.14 | **yes** | 8 / 49 | 0 |
| r4-field-groom, fan-out minus stack | all | 448 | 0.48 | 0.487 | -0.007 | -0.032 to 0.032 | no | 33 / 36 | 0.81 |
| r4-field-groom, fan-out minus stack | 8 or fewer | 253 | 0.549 | 0.542 | 0.008 | -0.037 to 0.057 | no | 21 / 19 | 0.875 |
| r4-field-groom, fan-out minus stack | more than 8 | 195 | 0.39 | 0.415 | -0.026 | -0.088 to 0.051 | no | 12 / 17 | 0.458 |
| untuned, plain minus stack | all | 448 | 0.373 | 0.487 | -0.114 | -0.146 to -0.075 | **yes** | 33 / 84 | 0 |
| untuned, plain minus stack | 8 or fewer | 253 | 0.522 | 0.542 | -0.02 | -0.081 to 0.056 | no | 26 / 31 | 0.597 |
| untuned, plain minus stack | more than 8 | 195 | 0.179 | 0.415 | -0.236 | -0.292 to -0.171 | **yes** | 7 / 53 | 0 |
| untuned, fan-out minus stack | all | 448 | 0.435 | 0.487 | -0.051 | -0.096 to -0.004 | **yes** | 36 / 59 | 0.023 |
| untuned, fan-out minus stack | 8 or fewer | 253 | 0.522 | 0.542 | -0.02 | -0.081 to 0.056 | no | 26 / 31 | 0.597 |
| untuned, fan-out minus stack | more than 8 | 195 | 0.323 | 0.415 | -0.092 | -0.14 to -0.031 | **yes** | 10 / 28 | 0.005 |

