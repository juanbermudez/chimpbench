# R4b numbers, evaluation B: the year-round held-out set (seed 21, 365 days, both bases) (generated)

Written by `scripts/r4-report.ts`; do not edit by hand. Registration: `docs/staging/r4b-prereg.md` §6 B. 1,500 decision points drawn in the proportions of §2 (day classes and situation classes); all three models scored now. The input is the state-only packet unless a row says otherwise. Intervals: 95% bootstraps over animals (2,000 resamples). A difference is called one only if its paired interval excludes 0.

## 1. Agreement with the rules' decision

1500 held-out decision points of 39 animals (1036 draws, 464 kept or arrived acts); the rules' decision is on the menu at 1477 (the others are left out).

| decision points | n | chance | untuned | r4-rules-state | r4b-rules-state | r4-rules-state minus untuned (a difference?) | r4b-rules-state minus untuned (a difference?) | r4b-rules-state minus r4-rules-state (a difference?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| draws | 1036 | 0.183 | 0.292 (0.256 to 0.332) | 0.589 (0.554 to 0.626) | 0.591 (0.560 to 0.623) | 0.296 (0.257 to 0.334) **yes** | 0.298 (0.251 to 0.344) **yes** | 0.002 (-0.024 to 0.031) no |
| kept or arrived | 441 | 0.187 | 0.435 (0.379 to 0.490) | 0.676 (0.626 to 0.725) | 0.671 (0.627 to 0.720) | 0.240 (0.170 to 0.309) **yes** | 0.236 (0.169 to 0.302) **yes** | -0.005 (-0.029 to 0.019) no |
| all | 1477 | 0.184 | 0.335 (0.305 to 0.373) | 0.615 (0.588 to 0.643) | 0.615 (0.591 to 0.640) | 0.280 (0.243 to 0.317) **yes** | 0.280 (0.237 to 0.320) **yes** | 0.000 (-0.021 to 0.020) no |
| draws, base W50 | 504 | 0.183 | 0.290 (0.251 to 0.330) | 0.605 (0.555 to 0.653) | 0.585 (0.541 to 0.633) | 0.315 (0.260 to 0.376) **yes** | 0.296 (0.239 to 0.356) **yes** | -0.020 (-0.062 to 0.021) no |
| draws, base W25 | 532 | 0.183 | 0.295 (0.245 to 0.349) | 0.573 (0.538 to 0.612) | 0.596 (0.554 to 0.637) | 0.278 (0.229 to 0.331) **yes** | 0.301 (0.242 to 0.358) **yes** | 0.023 (-0.009 to 0.051) no |
| draws: feeding | 279 | 0.185 | 0.068 (0.044 to 0.095) | 0.437 (0.385 to 0.492) | 0.419 (0.368 to 0.472) | 0.369 (0.315 to 0.424) **yes** | 0.351 (0.304 to 0.398) **yes** | -0.018 (-0.065 to 0.027) no |
| draws: travel | 152 | 0.175 | 0.217 (0.145 to 0.297) | 0.599 (0.522 to 0.674) | 0.605 (0.512 to 0.687) | 0.382 (0.293 to 0.473) **yes** | 0.388 (0.262 to 0.507) **yes** | 0.007 (-0.092 to 0.103) no |
| draws: rest | 302 | 0.189 | 0.311 (0.243 to 0.379) | 0.682 (0.625 to 0.737) | 0.745 (0.694 to 0.791) | 0.371 (0.290 to 0.458) **yes** | 0.434 (0.358 to 0.515) **yes** | 0.063 (0.025 to 0.101) **yes** |
| draws: social | 202 | 0.149 | 0.436 (0.369 to 0.507) | 0.530 (0.437 to 0.613) | 0.450 (0.379 to 0.520) | 0.094 (-0.010 to 0.195) no | 0.015 (-0.079 to 0.106) no | -0.079 (-0.127 to -0.031) **yes** |
| draws: night | 101 | 0.239 | 0.683 (0.577 to 0.782) | 0.832 (0.764 to 0.894) | 0.861 (0.783 to 0.926) | 0.149 (0.048 to 0.252) **yes** | 0.178 (0.050 to 0.296) **yes** | 0.030 (-0.032 to 0.082) no |
| draws: the rules feed where they stand | 143 | 0.177 | 0.070 (0.035 to 0.108) | 0.524 (0.448 to 0.597) | 0.476 (0.400 to 0.549) | 0.455 (0.373 to 0.532) **yes** | 0.406 (0.328 to 0.472) **yes** | -0.049 (-0.110 to 0.013) no |
| draws: the rules take a trip to food | 130 | 0.198 | 0.038 (0.000 to 0.083) | 0.323 (0.252 to 0.393) | 0.377 (0.300 to 0.453) | 0.285 (0.217 to 0.347) **yes** | 0.338 (0.269 to 0.410) **yes** | 0.054 (0.007 to 0.102) **yes** |
| draws: the rules drink | 29 | 0.224 | 0.448 (0.258 to 0.682) | 0.483 (0.280 to 0.676) | 0.414 (0.231 to 0.577) | 0.034 (-0.310 to 0.353) no | -0.034 (-0.345 to 0.226) no | -0.069 (-0.208 to 0.065) no |
| all decision points: the rules take a trip to food | 141 | 0.195 | 0.035 (0.000 to 0.077) | 0.333 (0.263 to 0.397) | 0.383 (0.305 to 0.459) | 0.298 (0.234 to 0.360) **yes** | 0.348 (0.276 to 0.421) **yes** | 0.050 (0.007 to 0.094) **yes** |
| all decision points: the rules drink | 36 | 0.217 | 0.444 (0.263 to 0.645) | 0.528 (0.353 to 0.683) | 0.500 (0.364 to 0.634) | 0.083 (-0.182 to 0.333) no | 0.056 (-0.182 to 0.258) no | -0.028 (-0.143 to 0.091) no |
| draws, part: food out of sight | 79 | 0.203 | 0.329 (0.207 to 0.443) | 0.557 (0.448 to 0.662) | 0.532 (0.422 to 0.632) | 0.228 (0.111 to 0.347) **yes** | 0.203 (0.082 to 0.319) **yes** | -0.025 (-0.103 to 0.052) no |
| draws, part: hot day | 133 | 0.176 | 0.278 (0.201 to 0.358) | 0.632 (0.548 to 0.724) | 0.594 (0.512 to 0.677) | 0.353 (0.252 to 0.457) **yes** | 0.316 (0.211 to 0.414) **yes** | -0.038 (-0.115 to 0.026) no |
| draws, part: hot now | 77 | 0.160 | 0.273 (0.184 to 0.373) | 0.390 (0.305 to 0.479) | 0.519 (0.406 to 0.624) | 0.117 (-0.013 to 0.229) no | 0.247 (0.077 to 0.397) **yes** | 0.130 (0.036 to 0.227) **yes** |
| draws, part: lean-season day | 208 | 0.185 | 0.303 (0.235 to 0.376) | 0.601 (0.536 to 0.667) | 0.596 (0.537 to 0.654) | 0.298 (0.214 to 0.374) **yes** | 0.293 (0.203 to 0.377) **yes** | -0.005 (-0.063 to 0.051) no |
| draws, part: middle day | 102 | 0.189 | 0.363 (0.262 to 0.456) | 0.598 (0.526 to 0.678) | 0.539 (0.446 to 0.639) | 0.235 (0.133 to 0.350) **yes** | 0.176 (0.065 to 0.297) **yes** | -0.059 (-0.126 to 0.000) no |
| draws, part: rainy day | 79 | 0.173 | 0.304 (0.194 to 0.417) | 0.570 (0.453 to 0.682) | 0.582 (0.480 to 0.677) | 0.266 (0.130 to 0.403) **yes** | 0.278 (0.171 to 0.373) **yes** | 0.013 (-0.106 to 0.115) no |
| draws, part: rich day | 179 | 0.187 | 0.296 (0.233 to 0.359) | 0.531 (0.466 to 0.590) | 0.547 (0.488 to 0.610) | 0.235 (0.156 to 0.308) **yes** | 0.251 (0.161 to 0.343) **yes** | 0.017 (-0.030 to 0.071) no |
| draws, part: run down | 82 | 0.182 | 0.329 (0.222 to 0.444) | 0.610 (0.506 to 0.716) | 0.659 (0.548 to 0.753) | 0.280 (0.134 to 0.404) **yes** | 0.329 (0.173 to 0.459) **yes** | 0.049 (-0.024 to 0.119) no |
| draws, part: short of water, water offered | 97 | 0.187 | 0.155 (0.089 to 0.229) | 0.784 (0.707 to 0.854) | 0.763 (0.675 to 0.844) | 0.629 (0.500 to 0.741) **yes** | 0.608 (0.477 to 0.725) **yes** | -0.021 (-0.066 to 0.019) no |

Reference rows (draws):

|  | agreement |
| --- | --- |
| untuned, the v4 packet as served (rate, company and rule sentences shown) | n/a |
| untuned: state-only minus as served | n/a no |
| untuned: agreement with the rules' argmax (draws) | 0.280 (0.245 to 0.316) |
| r4-rules-state: agreement with the rules' argmax (draws) | 0.590 (0.553 to 0.629) |
| r4b-rules-state: agreement with the rules' argmax (draws) | 0.586 (0.554 to 0.619) |
| the rules' argmax against the rules' decision (draws) | 0.964 (0.953 to 0.975) |

## 2. What is chosen (draws; share of picks by kind)

| kind | the rules | untuned | r4-rules-state | r4b-rules-state |
| --- | --- | --- | --- | --- |
| feeding | 0.269 | 0.097 | 0.225 | 0.219 |
| travel | 0.147 | 0.085 | 0.160 | 0.158 |
| rest | 0.292 | 0.264 | 0.309 | 0.369 |
| social | 0.195 | 0.458 | 0.208 | 0.156 |
| night: nest | 0.069 | 0.059 | 0.081 | 0.077 |
| night: other | 0.029 | 0.039 | 0.016 | 0.020 |

Grooming picked when a grooming option is offered (draws, 461 menus): the rules 0.100; untuned 0.364; r4-rules-state 0.113; r4b-rules-state 0.113.

