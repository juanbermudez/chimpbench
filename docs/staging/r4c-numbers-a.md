# R4c numbers, evaluation A: R4's own held-out file (seed 21, days 6 to 14), the three adapters side by side (generated)

Written by `scripts/r4-report.ts`; do not edit by hand. Registration: `docs/staging/r4b-prereg.md` §11.3. The file, the untuned scores and the first adapter's scores are R4's, unchanged; `r4b-rules-state` was scored in stage R4b and `r4c-rules-state` now. The input is the state-only packet unless a row says otherwise. Intervals: 95% bootstraps over animals (2,000 resamples). A difference is called one only if its paired interval excludes 0.

## 1. Agreement with the rules' decision

1500 held-out decision points of 38 animals (954 draws, 546 kept or arrived acts); the rules' decision is on the menu at 1455 (the others are left out).

| decision points | n | chance | untuned | r4-rules-state | r4b-rules-state | r4c-rules-state | r4-rules-state minus untuned (a difference?) | r4b-rules-state minus untuned (a difference?) | r4c-rules-state minus untuned (a difference?) | r4b-rules-state minus r4-rules-state (a difference?) | r4c-rules-state minus r4-rules-state (a difference?) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| draws | 954 | 0.186 | 0.286 (0.255 to 0.318) | 0.609 (0.572 to 0.649) | 0.572 (0.536 to 0.611) | 0.608 (0.577 to 0.640) | 0.323 (0.282 to 0.363) **yes** | 0.286 (0.252 to 0.320) **yes** | 0.322 (0.280 to 0.363) **yes** | -0.037 (-0.061 to -0.010) **yes** | -0.001 (-0.037 to 0.035) no |
| kept or arrived | 501 | 0.192 | 0.397 (0.350 to 0.446) | 0.663 (0.621 to 0.705) | 0.663 (0.611 to 0.712) | 0.573 (0.523 to 0.618) | 0.265 (0.213 to 0.324) **yes** | 0.265 (0.204 to 0.331) **yes** | 0.176 (0.119 to 0.232) **yes** | 0.000 (-0.025 to 0.026) no | -0.090 (-0.120 to -0.064) **yes** |
| all | 1455 | 0.188 | 0.324 (0.296 to 0.356) | 0.627 (0.601 to 0.655) | 0.603 (0.575 to 0.634) | 0.596 (0.570 to 0.622) | 0.303 (0.270 to 0.337) **yes** | 0.279 (0.246 to 0.313) **yes** | 0.271 (0.237 to 0.305) **yes** | -0.024 (-0.045 to -0.002) **yes** | -0.032 (-0.057 to -0.007) **yes** |
| draws, base W50 | 484 | 0.178 | 0.244 (0.204 to 0.288) | 0.620 (0.568 to 0.672) | 0.570 (0.522 to 0.619) | 0.612 (0.570 to 0.651) | 0.376 (0.314 to 0.438) **yes** | 0.326 (0.274 to 0.378) **yes** | 0.368 (0.305 to 0.425) **yes** | -0.050 (-0.085 to -0.009) **yes** | -0.008 (-0.054 to 0.032) no |
| draws, base W25 | 470 | 0.193 | 0.330 (0.284 to 0.374) | 0.598 (0.546 to 0.651) | 0.574 (0.522 to 0.632) | 0.604 (0.566 to 0.644) | 0.268 (0.204 to 0.338) **yes** | 0.245 (0.177 to 0.314) **yes** | 0.274 (0.216 to 0.334) **yes** | -0.023 (-0.056 to 0.006) no | 0.006 (-0.055 to 0.065) no |
| draws: feeding | 279 | 0.189 | 0.075 (0.043 to 0.113) | 0.369 (0.304 to 0.435) | 0.315 (0.253 to 0.385) | 0.437 (0.370 to 0.508) | 0.294 (0.227 to 0.359) **yes** | 0.240 (0.185 to 0.300) **yes** | 0.362 (0.266 to 0.452) **yes** | -0.054 (-0.100 to -0.007) **yes** | 0.068 (-0.039 to 0.172) no |
| draws: travel | 88 | 0.182 | 0.102 (0.023 to 0.196) | 0.727 (0.633 to 0.815) | 0.500 (0.384 to 0.615) | 0.432 (0.305 to 0.560) | 0.625 (0.474 to 0.762) **yes** | 0.398 (0.236 to 0.562) **yes** | 0.330 (0.156 to 0.512) **yes** | -0.227 (-0.320 to -0.131) **yes** | -0.295 (-0.387 to -0.202) **yes** |
| draws: rest | 287 | 0.190 | 0.307 (0.250 to 0.367) | 0.777 (0.720 to 0.827) | 0.861 (0.821 to 0.898) | 0.767 (0.709 to 0.821) | 0.470 (0.389 to 0.543) **yes** | 0.554 (0.490 to 0.620) **yes** | 0.460 (0.381 to 0.532) **yes** | 0.084 (0.038 to 0.137) **yes** | -0.010 (-0.063 to 0.039) no |
| draws: social | 203 | 0.150 | 0.419 (0.352 to 0.491) | 0.542 (0.435 to 0.641) | 0.433 (0.335 to 0.529) | 0.586 (0.493 to 0.671) | 0.123 (0.000 to 0.240) no | 0.015 (-0.102 to 0.126) no | 0.167 (0.050 to 0.280) **yes** | -0.108 (-0.154 to -0.063) **yes** | 0.044 (-0.004 to 0.098) no |
| draws: night | 97 | 0.240 | 0.722 (0.631 to 0.817) | 0.835 (0.750 to 0.906) | 0.814 (0.741 to 0.890) | 0.835 (0.747 to 0.917) | 0.113 (0.011 to 0.202) **yes** | 0.093 (0.000 to 0.178) no | 0.113 (0.044 to 0.186) **yes** | -0.021 (-0.081 to 0.035) no | 0.000 (-0.082 to 0.083) no |
| draws: the rules feed where they stand | 129 | 0.197 | 0.109 (0.056 to 0.167) | 0.527 (0.433 to 0.620) | 0.527 (0.419 to 0.626) | 0.109 (0.044 to 0.181) | 0.419 (0.339 to 0.508) **yes** | 0.419 (0.333 to 0.500) **yes** | 0.000 (-0.094 to 0.093) no | 0.000 (-0.068 to 0.060) no | -0.419 (-0.551 to -0.288) **yes** |
| draws: the rules take a trip to food | 142 | 0.185 | 0.000 (0.000 to 0.000) | 0.204 (0.143 to 0.267) | 0.113 (0.064 to 0.171) | 0.690 (0.620 to 0.769) | 0.204 (0.143 to 0.267) **yes** | 0.113 (0.064 to 0.171) **yes** | 0.690 (0.620 to 0.769) **yes** | -0.092 (-0.151 to -0.032) **yes** | 0.486 (0.414 to 0.564) **yes** |
| draws: the rules drink | 20 | 0.208 | 0.550 (0.333 to 0.750) | 0.350 (0.125 to 0.619) | 0.250 (0.048 to 0.500) | 0.750 (0.500 to 1.000) | -0.200 (-0.579 to 0.222) no | -0.300 (-0.667 to 0.100) no | 0.200 (-0.150 to 0.556) no | -0.100 (-0.316 to 0.095) no | 0.400 (0.174 to 0.647) **yes** |
| all decision points: the rules take a trip to food | 154 | 0.184 | 0.000 (0.000 to 0.000) | 0.240 (0.179 to 0.299) | 0.110 (0.061 to 0.164) | 0.701 (0.629 to 0.776) | 0.240 (0.179 to 0.299) **yes** | 0.110 (0.061 to 0.164) **yes** | 0.701 (0.629 to 0.776) **yes** | -0.130 (-0.192 to -0.068) **yes** | 0.461 (0.386 to 0.532) **yes** |
| all decision points: the rules drink | 22 | 0.208 | 0.545 (0.350 to 0.739) | 0.364 (0.150 to 0.600) | 0.273 (0.083 to 0.500) | 0.727 (0.500 to 0.947) | -0.182 (-0.524 to 0.158) no | -0.273 (-0.600 to 0.053) no | 0.182 (-0.125 to 0.474) no | -0.091 (-0.273 to 0.087) no | 0.364 (0.150 to 0.619) **yes** |

Reference rows (draws):

|  | agreement |
| --- | --- |
| untuned, the v4 packet as served (rate, company and rule sentences shown) | 0.301 (0.268 to 0.336) |
| untuned: state-only minus as served | -0.015 (-0.031 to 0.002) no |
| untuned: agreement with the rules' argmax (draws) | 0.282 (0.252 to 0.312) |
| r4-rules-state: agreement with the rules' argmax (draws) | 0.608 (0.571 to 0.646) |
| r4b-rules-state: agreement with the rules' argmax (draws) | 0.572 (0.537 to 0.610) |
| r4c-rules-state: agreement with the rules' argmax (draws) | 0.614 (0.582 to 0.648) |
| the rules' argmax against the rules' decision (draws) | 0.981 (0.973 to 0.989) |

## 2. What is chosen (draws; share of picks by kind)

| kind | the rules | untuned | r4-rules-state | r4b-rules-state | r4c-rules-state |
| --- | --- | --- | --- | --- | --- |
| feeding | 0.292 | 0.094 | 0.204 | 0.173 | 0.279 |
| travel | 0.092 | 0.036 | 0.136 | 0.093 | 0.066 |
| rest | 0.301 | 0.245 | 0.361 | 0.456 | 0.334 |
| social | 0.213 | 0.523 | 0.197 | 0.176 | 0.219 |
| night: nest | 0.079 | 0.072 | 0.091 | 0.086 | 0.082 |
| night: other | 0.023 | 0.029 | 0.010 | 0.016 | 0.020 |

Grooming picked when a grooming option is offered (draws, 453 menus): the rules 0.150; untuned 0.508; r4-rules-state 0.135; r4b-rules-state 0.132; r4c-rules-state 0.152.

## 3. The same menu with its options shuffled (387 decision points)

|  | untuned | r4-rules-state | r4b-rules-state | r4c-rules-state |
| --- | --- | --- | --- | --- |
| the same option is picked | 0.747 | 0.886 | 0.897 | 0.889 |
| picks at the first position | 0.248 | 0.290 | 0.375 | 0.257 |
| (the rules' decision is at the first position) | 0.280 | 0.280 | 0.280 | 0.280 |

## 4. The rules' pick removed from the menu (954 draws; the same decision points, `kernelNoRulesPick` 1)

There is no rules' pick to agree with. Read: how often the pick is the best remaining option by the rules' score, and how often it is of the same kind as the pick that was removed.

| model | n | chance | picks the best remaining option | minus untuned (a difference?) | pick of the same kind as the removed one | minus r4-rules-state (a difference?) |
| --- | --- | --- | --- | --- | --- | --- |
| untuned | 954 | 0.213 | 0.210 (0.182 to 0.238) |  | 0.192 (0.159 to 0.224) |  |
| r4-rules-state | 954 | 0.213 | 0.460 (0.429 to 0.493) | 0.251 (0.212 to 0.287) **yes** | 0.194 (0.168 to 0.222) |  |
| r4b-rules-state | 954 | 0.213 | 0.410 (0.384 to 0.437) | 0.200 (0.168 to 0.235) **yes** | 0.179 (0.153 to 0.209) | -0.050 (-0.079 to -0.023) **yes** |
| r4c-rules-state | 954 | 0.213 | 0.507 (0.479 to 0.535) | 0.298 (0.264 to 0.333) **yes** | 0.236 (0.212 to 0.261) | 0.047 (0.014 to 0.082) **yes** |

## 5. State probes (stage M2's design on held-out situations; the consistent rendering)

Δ = probability on the target options at the high level minus at the low level (mean over situations, 95% interval). Right way: the interval is above 0; wrong way: below 0; does not respond: it includes 0.

| probe (target) | model | situations | low | mid | high | Δ high − low | verdict | target is the pick: low → high | share of situations moving up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| deficit | untuned | 100 | 0.165 | 0.179 | 0.290 | 0.125 (0.103 to 0.149) | right way | 0.080 → 0.290 | 0.880 |
| deficit | r4-rules-state | 100 | 0.312 | 0.362 | 0.477 | 0.165 (0.144 to 0.190) | right way | 0.250 → 0.540 | 0.930 |
| deficit | r4b-rules-state | 100 | 0.268 | 0.360 | 0.519 | 0.251 (0.220 to 0.283) | right way | 0.190 → 0.600 | 0.950 |
| deficit | r4c-rules-state | 100 | 0.412 | 0.522 | 0.630 | 0.218 (0.182 to 0.258) | right way | 0.380 → 0.650 | 0.890 |
| reserves | untuned | 100 | 0.152 | 0.151 | 0.149 | -0.003 (-0.006 to -0.001) | WRONG way | 0.020 → 0.020 | 0.110 |
| reserves | r4-rules-state | 100 | 0.302 | 0.305 | 0.305 | 0.002 (-0.000 to 0.005) | does not respond | 0.250 → 0.240 | 0.250 |
| reserves | r4b-rules-state | 100 | 0.266 | 0.270 | 0.269 | 0.002 (0.000 to 0.004) | right way | 0.180 → 0.180 | 0.200 |
| reserves | r4c-rules-state | 100 | 0.344 | 0.346 | 0.345 | 0.002 (-0.001 to 0.005) | does not respond | 0.300 → 0.310 | 0.200 |
| sleep | untuned | 100 | 0.272 | 0.264 | 0.424 | 0.152 (0.128 to 0.177) | right way | 0.350 → 0.520 | 0.980 |
| sleep | r4-rules-state | 100 | 0.250 | 0.306 | 0.363 | 0.113 (0.094 to 0.134) | right way | 0.270 → 0.420 | 0.860 |
| sleep | r4b-rules-state | 100 | 0.333 | 0.341 | 0.347 | 0.014 (-0.005 to 0.035) | does not respond | 0.390 → 0.460 | 0.480 |
| sleep | r4c-rules-state | 100 | 0.219 | 0.244 | 0.295 | 0.077 (0.060 to 0.093) | right way | 0.210 → 0.350 | 0.700 |
| light | untuned | 100 | 0.848 | 0.866 | 0.868 | 0.020 (0.013 to 0.029) | right way | 0.900 → 0.930 | 0.330 |
| light | r4-rules-state | 100 | 0.824 | 0.938 | 0.940 | 0.116 (0.088 to 0.146) | right way | 0.890 → 0.980 | 0.540 |
| light | r4b-rules-state | 100 | 0.787 | 0.800 | 0.800 | 0.013 (0.009 to 0.018) | right way | 0.860 → 0.870 | 0.370 |
| light | r4c-rules-state | 100 | 0.564 | 0.887 | 0.886 | 0.322 (0.281 to 0.362) | right way | 0.700 → 0.940 | 0.930 |
| heat | untuned | 100 | 0.247 | 0.249 | 0.223 | -0.024 (-0.029 to -0.020) | WRONG way | 0.290 → 0.250 | 0.060 |
| heat | r4-rules-state | 100 | 0.314 | 0.316 | 0.293 | -0.021 (-0.024 to -0.018) | WRONG way | 0.310 → 0.290 | 0.000 |
| heat | r4b-rules-state | 100 | 0.358 | 0.351 | 0.340 | -0.018 (-0.022 to -0.013) | WRONG way | 0.460 → 0.420 | 0.070 |
| heat | r4c-rules-state | 100 | 0.323 | 0.322 | 0.305 | -0.018 (-0.021 to -0.015) | WRONG way | 0.360 → 0.330 | 0.000 |
| water | untuned | 100 | 0.035 | 0.053 | 0.203 | 0.168 (0.144 to 0.193) | right way | 0.000 → 0.240 | 0.990 |
| water | r4-rules-state | 100 | 0.043 | 0.148 | 0.299 | 0.256 (0.228 to 0.286) | right way | 0.000 → 0.310 | 0.980 |
| water | r4b-rules-state | 100 | 0.027 | 0.239 | 0.346 | 0.319 (0.287 to 0.353) | right way | 0.000 → 0.520 | 1.000 |
| water | r4c-rules-state | 100 | 0.043 | 0.305 | 0.491 | 0.448 (0.390 to 0.503) | right way | 0.010 → 0.570 | 0.970 |

untuned: 4 of 6 the right way, 2 the wrong way; r4-rules-state: 4 of 6 the right way, 1 the wrong way; r4b-rules-state: 4 of 6 the right way, 1 the wrong way; r4c-rules-state: 4 of 6 the right way, 1 the wrong way.

Targets: deficit and reserves → feeding and food trips; sleep → rest and nest; light → nest; heat → rest; water → drink.

## 6. Real token counts (the worker's count; hard limit 1,280)

| packet | n | median | 95th percentile | largest | over 1,280 |
| --- | --- | --- | --- | --- | --- |
| state | 1500 | 452 | 583 | 646 | 0 |
| v4 | 1500 | 493 | 639 | 718 | 0 |
| removed | 954 | 444 | 583 | 659 | 0 |
| probe | 1800 | 474 | 597 | 645 | 0 |

