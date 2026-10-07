# R4 numbers: the offline evaluation on simulated contexts (generated)

Written by `scripts/r4-report.ts`; do not edit by hand. Registration: `docs/staging/r4-prereg.md` §6. Held-out contexts: seed 21, both bases. The input is the state-only packet unless a row says otherwise. Intervals: 95% bootstraps over animals (2,000 resamples). A difference is called one only if its paired interval excludes 0.

## 1. Agreement with the rules' decision

1500 held-out decision points of 38 animals (954 draws, 546 kept or arrived acts); the rules' decision is on the menu at 1455 (the others are left out).

| decision points | n | chance | untuned | r4-rules-state | r4-field-groom | r4-rules-state minus untuned (a difference?) | r4-field-groom minus untuned (a difference?) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| draws | 954 | 0.186 | 0.286 (0.255 to 0.318) | 0.609 (0.572 to 0.649) | 0.291 (0.259 to 0.323) | 0.323 (0.282 to 0.363) **yes** | 0.005 (-0.015 to 0.024) no |
| kept or arrived | 501 | 0.192 | 0.397 (0.350 to 0.446) | 0.663 (0.621 to 0.705) | 0.413 (0.361 to 0.467) | 0.265 (0.213 to 0.324) **yes** | 0.016 (-0.026 to 0.059) no |
| all | 1455 | 0.188 | 0.324 (0.296 to 0.356) | 0.627 (0.601 to 0.655) | 0.333 (0.302 to 0.367) | 0.303 (0.270 to 0.337) **yes** | 0.009 (-0.013 to 0.030) no |
| draws, base W50 | 484 | 0.178 | 0.244 (0.204 to 0.288) | 0.620 (0.568 to 0.672) | 0.244 (0.206 to 0.282) | 0.376 (0.314 to 0.438) **yes** | 0.000 (-0.028 to 0.026) no |
| draws, base W25 | 470 | 0.193 | 0.330 (0.284 to 0.374) | 0.598 (0.546 to 0.651) | 0.340 (0.295 to 0.383) | 0.268 (0.204 to 0.338) **yes** | 0.011 (-0.019 to 0.039) no |
| draws: feeding | 279 | 0.189 | 0.075 (0.043 to 0.113) | 0.369 (0.304 to 0.435) | 0.043 (0.020 to 0.069) | 0.294 (0.227 to 0.359) **yes** | -0.032 (-0.056 to -0.014) **yes** |
| draws: travel | 88 | 0.182 | 0.102 (0.023 to 0.196) | 0.727 (0.633 to 0.815) | 0.057 (0.000 to 0.117) | 0.625 (0.474 to 0.762) **yes** | -0.045 (-0.098 to 0.000) no |
| draws: rest | 287 | 0.190 | 0.307 (0.250 to 0.367) | 0.777 (0.720 to 0.827) | 0.415 (0.351 to 0.480) | 0.470 (0.389 to 0.543) **yes** | 0.108 (0.068 to 0.150) **yes** |
| draws: social | 203 | 0.150 | 0.419 (0.352 to 0.491) | 0.542 (0.435 to 0.641) | 0.409 (0.332 to 0.490) | 0.123 (0.000 to 0.240) no | -0.010 (-0.064 to 0.036) no |
| draws: night | 97 | 0.240 | 0.722 (0.631 to 0.817) | 0.835 (0.750 to 0.906) | 0.608 (0.509 to 0.703) | 0.113 (0.011 to 0.202) **yes** | -0.113 (-0.200 to -0.042) **yes** |

Reference rows (draws):

|  | agreement |
| --- | --- |
| untuned, the v4 packet as served (rate, company and rule sentences shown) | 0.301 (0.268 to 0.336) |
| untuned: state-only minus as served | -0.015 (-0.031 to 0.002) no |
| untuned: agreement with the rules' argmax (draws) | 0.282 (0.252 to 0.312) |
| r4-rules-state: agreement with the rules' argmax (draws) | 0.608 (0.571 to 0.646) |
| r4-field-groom: agreement with the rules' argmax (draws) | 0.289 (0.257 to 0.321) |
| the rules' argmax against the rules' decision (draws) | 0.981 (0.973 to 0.989) |

## 2. What is chosen (draws; share of picks by kind)

| kind | the rules | untuned | r4-rules-state | r4-field-groom |
| --- | --- | --- | --- | --- |
| feeding | 0.292 | 0.094 | 0.204 | 0.058 |
| travel | 0.092 | 0.036 | 0.136 | 0.027 |
| rest | 0.301 | 0.245 | 0.361 | 0.353 |
| social | 0.213 | 0.523 | 0.197 | 0.460 |
| night: nest | 0.079 | 0.072 | 0.091 | 0.064 |
| night: other | 0.023 | 0.029 | 0.010 | 0.038 |

Grooming picked when a grooming option is offered (draws, 453 menus): the rules 0.150; untuned 0.508; r4-rules-state 0.135; r4-field-groom 0.442.

## 3. The same menu with its options shuffled (387 decision points)

|  | untuned | r4-rules-state | r4-field-groom |
| --- | --- | --- | --- |
| the same option is picked | 0.747 | 0.886 | n/a |
| picks at the first position | 0.248 | 0.290 | 0.384 |
| (the rules' decision is at the first position) | 0.280 | 0.280 | 0.280 |

## 4. The rules' pick removed from the menu (954 draws; the same decision points, `kernelNoRulesPick` 1)

There is no rules' pick to agree with. Read: how often the pick is the best remaining option by the rules' score, and how often it is of the same kind as the pick that was removed.

| model | n | chance | picks the best remaining option | minus untuned (a difference?) | pick of the same kind as the removed one |
| --- | --- | --- | --- | --- | --- |
| untuned | 954 | 0.213 | 0.210 (0.182 to 0.238) |  | 0.192 (0.159 to 0.224) |
| r4-rules-state | 954 | 0.213 | 0.460 (0.429 to 0.493) | 0.251 (0.212 to 0.287) **yes** | 0.194 (0.168 to 0.222) |

## 5. State probes (stage M2's design on held-out situations; the consistent rendering)

Δ = probability on the target options at the high level minus at the low level (mean over situations, 95% interval). Right way: the interval is above 0; wrong way: below 0; does not respond: it includes 0.

| probe (target) | model | situations | low | mid | high | Δ high − low | verdict | target is the pick: low → high | share of situations moving up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| deficit | untuned | 100 | 0.165 | 0.179 | 0.290 | 0.125 (0.103 to 0.149) | right way | 0.080 → 0.290 | 0.880 |
| deficit | r4-rules-state | 100 | 0.312 | 0.362 | 0.477 | 0.165 (0.144 to 0.190) | right way | 0.250 → 0.540 | 0.930 |
| deficit | r4-field-groom | 100 | 0.210 | 0.219 | 0.246 | 0.036 (0.028 to 0.044) | right way | 0.020 → 0.110 | 0.710 |
| reserves | untuned | 100 | 0.152 | 0.151 | 0.149 | -0.003 (-0.006 to -0.001) | WRONG way | 0.020 → 0.020 | 0.110 |
| reserves | r4-rules-state | 100 | 0.302 | 0.305 | 0.305 | 0.002 (-0.000 to 0.005) | does not respond | 0.250 → 0.240 | 0.250 |
| reserves | r4-field-groom | 100 | 0.202 | 0.198 | 0.197 | -0.005 (-0.007 to -0.003) | WRONG way | 0.020 → 0.020 | 0.020 |
| sleep | untuned | 100 | 0.272 | 0.264 | 0.424 | 0.152 (0.128 to 0.177) | right way | 0.350 → 0.520 | 0.980 |
| sleep | r4-rules-state | 100 | 0.250 | 0.306 | 0.363 | 0.113 (0.094 to 0.134) | right way | 0.270 → 0.420 | 0.860 |
| sleep | r4-field-groom | 100 | 0.316 | 0.315 | 0.406 | 0.090 (0.077 to 0.103) | right way | 0.410 → 0.570 | 0.980 |
| light | untuned | 100 | 0.848 | 0.866 | 0.868 | 0.020 (0.013 to 0.029) | right way | 0.900 → 0.930 | 0.330 |
| light | r4-rules-state | 100 | 0.824 | 0.938 | 0.940 | 0.116 (0.088 to 0.146) | right way | 0.890 → 0.980 | 0.540 |
| light | r4-field-groom | 100 | 0.538 | 0.557 | 0.560 | 0.022 (0.017 to 0.026) | right way | 0.790 → 0.810 | 0.720 |
| heat | untuned | 100 | 0.247 | 0.249 | 0.223 | -0.024 (-0.029 to -0.020) | WRONG way | 0.290 → 0.250 | 0.060 |
| heat | r4-rules-state | 100 | 0.314 | 0.316 | 0.293 | -0.021 (-0.024 to -0.018) | WRONG way | 0.310 → 0.290 | 0.000 |
| heat | r4-field-groom | 100 | 0.319 | 0.316 | 0.296 | -0.022 (-0.025 to -0.020) | WRONG way | 0.370 → 0.340 | 0.010 |
| water | untuned | 100 | 0.035 | 0.053 | 0.203 | 0.168 (0.144 to 0.193) | right way | 0.000 → 0.240 | 0.990 |
| water | r4-rules-state | 100 | 0.043 | 0.148 | 0.299 | 0.256 (0.228 to 0.286) | right way | 0.000 → 0.310 | 0.980 |
| water | r4-field-groom | 100 | 0.049 | 0.064 | 0.148 | 0.099 (0.089 to 0.111) | right way | 0.000 → 0.030 | 1.000 |

untuned: 4 of 6 the right way, 2 the wrong way; r4-rules-state: 4 of 6 the right way, 1 the wrong way; r4-field-groom: 4 of 6 the right way, 2 the wrong way.

Targets: deficit and reserves → feeding and food trips; sleep → rest and nest; light → nest; heat → rest; water → drink.

## 6. Real token counts (the worker's count; hard limit 1,280)

| packet | n | median | 95th percentile | largest | over 1,280 |
| --- | --- | --- | --- | --- | --- |
| state | 1500 | 452 | 583 | 646 | 0 |
| v4 | 1500 | 493 | 639 | 718 | 0 |
| removed | 954 | 444 | 583 | 659 | 0 |
| probe | 1800 | 474 | 597 | 645 | 0 |

