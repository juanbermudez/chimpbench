# RW3: the Taï-taught adapters on the development part of the Taï record (generated)

Written by `scripts/rw3-report.ts`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw3-prereg.md`.

Every figure for `rw3-tai-groom-s7` and `-s11` is a result of a **Taï-taught adapter on the Taï record's own menu** (label source: `field choices, Tai first grooming partner`; two training seeds). Beside them: the untuned model, the Ngogo-taught adapter (`r4-field-groom`) and the simple rule `stack-own` (the bar). The sealed part is not opened.

329 records of 13 animals; own view; shuffle 0. Top-1 of the answered option, pooled over records (for chance and the bar: the expected top-1 with ties split). Intervals: 95%, a bootstrap over animals. A difference is called one only if its interval excludes 0.

## Scores

| kernel | one call a record (the primary reading) | fanned out | each animal weighted equally, one call | minus chance, one call | refused |
| --- | --- | --- | --- | --- | --- |
| chance | 0.244 (0.223 to 0.266) |  | 0.239 (0.221 to 0.257) |  |  |
| the bar: the simple rule `stack-own` | 0.353 (0.304 to 0.391) |  | 0.333 (0.27 to 0.4) | 0.109 (0.069 to 0.151) | 0 |
| the untuned model | 0.301 (0.248 to 0.355) | 0.295 (0.238 to 0.346) | 0.302 (0.249 to 0.362) | 0.057 (-0.001 to 0.124) | 0 |
| the Ngogo-taught adapter `r4-field-groom` | 0.319 (0.278 to 0.356) | 0.328 (0.273 to 0.366) | 0.335 (0.282 to 0.397) | 0.075 (0.042 to 0.117) | 0 |
| the Taï-taught adapter `rw3-tai-groom-s7` | 0.307 (0.245 to 0.369) | 0.307 (0.227 to 0.367) | 0.33 (0.262 to 0.393) | 0.063 (-0.001 to 0.136) | 0 |
| the Taï-taught adapter `rw3-tai-groom-s11` | 0.353 (0.287 to 0.408) | 0.362 (0.284 to 0.411) | 0.337 (0.262 to 0.411) | 0.109 (0.041 to 0.176) | 0 |

Stage RW2 read (rw2-prereg.md §8.4): chance 0.244, the bar 0.353, the untuned model 0.301 and 0.295 fanned out, the Ngogo-taught adapter 0.319 and 0.328. Scored again here: the untuned model 0.301 and 0.295, the Ngogo-taught adapter 0.319 and 0.328.

## Paired differences on the same records, one call a record (the primary reading)

| a minus b | a | b | difference (95% over animals) | only a right | only b right | a difference |
| --- | --- | --- | --- | --- | --- | --- |
| seed 7 minus the untuned model (S1) | 0.307 | 0.301 | 0.006 (-0.049 to 0.073) | 38 | 36 | no |
| seed 7 minus the bar (S2) | 0.307 | 0.353 | -0.046 (-0.091 to 0.013) | 31 | 46 | no |
| seed 7 minus the Ngogo-taught adapter (S3) | 0.307 | 0.319 | -0.012 (-0.068 to 0.05) | 25 | 29 | no |
| seed 11 minus the untuned model (S1) | 0.353 | 0.301 | 0.052 (-0.011 to 0.101) | 50 | 33 | no |
| seed 11 minus the bar (S2) | 0.353 | 0.353 | 0 (-0.048 to 0.046) | 34 | 34 | no |
| seed 11 minus the Ngogo-taught adapter (S3) | 0.353 | 0.319 | 0.033 (-0.035 to 0.089) | 37 | 26 | no |
| seed against seed (S4) | 0.307 | 0.353 | -0.046 (-0.07 to 0) | 9 | 24 | no |
| reference: the untuned model minus the bar | 0.301 | 0.353 | -0.052 (-0.106 to 0.01) | 40 | 57 | no |
| reference: the Ngogo-taught adapter minus the bar | 0.319 | 0.353 | -0.033 (-0.062 to 0.006) | 41 | 52 | no |
| reference: the Ngogo-taught adapter minus the untuned model | 0.319 | 0.301 | 0.018 (-0.029 to 0.07) | 50 | 44 | no |

## The same, fanned out (beside the primary reading)

| a minus b | a | b | difference (95% over animals) | only a right | only b right | a difference |
| --- | --- | --- | --- | --- | --- | --- |
| seed 7 minus the untuned model (S1) | 0.307 | 0.295 | 0.012 (-0.049 to 0.075) | 41 | 37 | no |
| seed 7 minus the bar (S2) | 0.307 | 0.353 | -0.046 (-0.103 to 0.008) | 29 | 44 | no |
| seed 7 minus the Ngogo-taught adapter (S3) | 0.307 | 0.328 | -0.021 (-0.071 to 0.031) | 24 | 31 | no |
| seed 11 minus the untuned model (S1) | 0.362 | 0.295 | 0.067 (0.013 to 0.098) | 57 | 35 | yes |
| seed 11 minus the bar (S2) | 0.362 | 0.353 | 0.009 (-0.052 to 0.057) | 33 | 30 | no |
| seed 11 minus the Ngogo-taught adapter (S3) | 0.362 | 0.328 | 0.033 (-0.031 to 0.077) | 37 | 26 | no |
| seed against seed (S4) | 0.307 | 0.362 | -0.055 (-0.093 to 0) | 9 | 27 | no |
| reference: the untuned model minus the bar | 0.295 | 0.353 | -0.058 (-0.113 to 0) | 38 | 57 | no |
| reference: the Ngogo-taught adapter minus the bar | 0.328 | 0.353 | -0.024 (-0.052 to 0) | 41 | 49 | no |
| reference: the Ngogo-taught adapter minus the untuned model | 0.328 | 0.295 | 0.033 (-0.01 to 0.079) | 54 | 43 | no |

## The statements (registered in rw3-prereg.md §5 before any run)

- **S0, the run is valid:** yes
- **S1, the Taï choices taught the model something** (the adapter minus the untuned model, above 0 on both seeds): **not shown**: not shown; with this record's power that is not "no effect". By seed: seed 7 includes, seed 11 includes; fanned out: seed-dependent: not shown.
- **S2, it reaches the simple rule** (the adapter minus the bar): **not shown**: level with the bar within the interval: nothing is shown beyond the rule, and the rule is the cheaper kernel. By seed: seed 7 includes, seed 11 includes; fanned out: not shown.
- **S3, the site's own choices against another site's** (the adapter minus the Ngogo-taught adapter): **not shown**: no difference is shown between a Taï-taught and a Ngogo-taught adapter; whatever either learned is not shown to be particular to the site. By seed: seed 7 includes, seed 11 includes; fanned out: not shown.
- **S4, the two seeds:** no difference between the seeds is shown; they answer the same option on 0.802 of records. Where the seeds differ, a statement both seeds meet is written "seed-dependent: not shown".
- **The whole, in the registered words:** 557 choices did not teach the model anything this record can show; the Taï record stays a test, not a teacher, at this size.

Power, stated before any score: no unpaired difference under about 0.08 to 0.10 and no paired one under about 0.04 to 0.06 can be shown on this record, so "not shown" is not "no effect". No result here changes the main label source, enters the simulation's loop or says when or whether chimpanzees groom.

## Cuts (descriptions; nothing is claimed on them)

One call a record. Female choice and wide menus rest on few records.

| cut | records | animals | chance | the bar | the untuned model | the Ngogo-taught adapter | seed 7 | seed 11 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 options or fewer | 270 | 13 | 0.276 | 0.396 | 0.33 | 0.359 | 0.348 | 0.396 |
| more than 8 options | 59 | 10 | 0.099 | 0.153 | 0.169 | 0.136 | 0.119 | 0.153 |
| seen animals, January and February 2015 | 131 | 9 | 0.236 | 0.374 | 0.29 | 0.321 | 0.321 | 0.374 |
| unseen animals, January and February 2015 | 38 | 3 | 0.239 | 0.395 | 0.263 | 0.368 | 0.316 | 0.316 |
| unseen animals, before 2015 | 160 | 4 | 0.252 | 0.325 | 0.319 | 0.306 | 0.294 | 0.344 |
| male choosers | 292 | 8 | 0.248 | 0.37 | 0.305 | 0.325 | 0.305 | 0.366 |
| female choosers | 37 | 5 | 0.213 | 0.216 | 0.27 | 0.27 | 0.324 | 0.243 |

## The trainings (from the adapters' manifests; the training loss describes fit and is not a score)

| adapter | answers unlike the untuned model's | mean training loss by epoch | training time | seconds an example | peak footprint |
| --- | --- | --- | --- | --- | --- |
| `rw3-tai-groom-s7` | 134 | 1.6163, 1.5592, 1.555, 1.5427 | 18.6 min | 0.501 | 5.08 GiB |
| `rw3-tai-groom-s11` | 142 | 1.6193, 1.5525, 1.5439, 1.5484 | 15.1 min | 0.405 | 5.36 GiB |

