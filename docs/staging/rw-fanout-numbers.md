# RW bench: fanning a wide menu out to a kernel built for 8 (generated)

Written by `scripts/rw-fanout-report.ts --md`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw-bench-prereg.md` §14 (amendment A8).

Kernel: `gliner`. Top-1 is the answered option; intervals are 95% cluster bootstraps over focal males (2000 draws, seed 20261006); shuffle 0 unless said. A difference is called one only if its paired interval excludes 0.
- Before the model was loaded for the registered runs (6 October 2026): swap total = 9216.00M  used = 8446.69M  free = 769.31M  (encrypted); uptime  8:53  up 10 days, 18:10, 1 user, load averages: 11.08 12.46 12.31.
- After the runs: swap total = 10240.00M  used = 9299.19M  free = 940.81M  (encrypted); uptime  9:47  up 10 days, 19:05, 1 user, load averages: 12.84 16.50 23.47. One model process at a time; the worker was stopped after each part.
- Worker time from the run log, development: plain GLiNER under three option orders 1,503 s (the first includes loading the model), fan2 under three orders 554 s for 2,045 packets sent, fan1 28 s for 195, pool3 208 s for 962. Training: plain 657 s (with the load), fan2 279 s for 1,344 packets sent.

## development part: 448 records

Top-1 by choice-set size (records, focal males):

| kernel | all (448, 30) | 8 or fewer (253, 29) | more than 8 (195, 25) | 9 to 16 (135, 24) | 17 and over (60, 19) | refused |
| --- | --- | --- | --- | --- | --- | --- |
| null | 0.179 (0.125 to 0.226) | 0.237 (0.167 to 0.298) | 0.103 (0.067 to 0.14) | 0.133 (0.08 to 0.18) | 0.033 (0 to 0.102) | 0 |
| stack | 0.487 (0.418 to 0.545) | 0.542 (0.445 to 0.612) | 0.415 (0.338 to 0.497) | 0.444 (0.327 to 0.563) | 0.35 (0.244 to 0.466) | 0 |
| gliner | 0.373 (0.308 to 0.438) | 0.522 (0.449 to 0.609) | 0.179 (0.123 to 0.238) | 0.244 (0.165 to 0.321) | 0.033 (0 to 0.08) | 3 |
| gliner+fan2 | 0.435 (0.371 to 0.511) | 0.522 (0.449 to 0.609) | 0.323 (0.235 to 0.417) | 0.348 (0.241 to 0.456) | 0.267 (0.184 to 0.364) | 0 |
| gliner+fan1 | 0.413 (0.354 to 0.478) | 0.522 (0.449 to 0.609) | 0.272 (0.214 to 0.349) | 0.274 (0.207 to 0.356) | 0.267 (0.171 to 0.373) | 0 |
| gliner+pool3 | 0.433 (0.373 to 0.507) | 0.522 (0.449 to 0.609) | 0.318 (0.239 to 0.4) | 0.356 (0.265 to 0.455) | 0.233 (0.128 to 0.344) | 0 |

Paired differences on the same records (A minus B):

| pair | records | records (males) | A | B | difference | 95% interval | a difference | only A right / only B right | sign test p |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gliner+fan2 minus gliner | more than 8 | 195 (25) | 0.323 | 0.179 | 0.144 | 0.082 to 0.21 | yes | 38 / 10 | below 0.001 |
| gliner+fan2 minus gliner | all | 448 (30) | 0.435 | 0.373 | 0.063 | 0.034 to 0.095 | yes | 38 / 10 | below 0.001 |
| gliner+fan2 minus gliner | 8 or fewer | 253 (29) | 0.522 | 0.522 | 0 | 0 to 0 | no | 0 / 0 | 1 |
| gliner+fan2 minus stack | more than 8 | 195 (25) | 0.323 | 0.415 | -0.092 | -0.14 to -0.031 | yes | 10 / 28 | 0.005 |
| gliner+fan2 minus stack | all | 448 (30) | 0.435 | 0.487 | -0.051 | -0.096 to -0.004 | yes | 36 / 59 | 0.023 |
| gliner+fan2 minus stack | 8 or fewer | 253 (29) | 0.522 | 0.542 | -0.02 | -0.081 to 0.056 | no | 26 / 31 | 0.597 |
| gliner+fan1 minus gliner | more than 8 | 195 (25) | 0.272 | 0.179 | 0.092 | 0.042 to 0.16 | yes | 32 / 14 | 0.011 |
| gliner+fan1 minus gliner | all | 448 (30) | 0.413 | 0.373 | 0.04 | 0.018 to 0.076 | yes | 32 / 14 | 0.011 |
| gliner+fan1 minus gliner | 8 or fewer | 253 (29) | 0.522 | 0.522 | 0 | 0 to 0 | no | 0 / 0 | 1 |
| gliner+pool3 minus gliner | more than 8 | 195 (25) | 0.318 | 0.179 | 0.138 | 0.082 to 0.197 | yes | 36 / 9 | below 0.001 |
| gliner+pool3 minus gliner | all | 448 (30) | 0.433 | 0.373 | 0.06 | 0.034 to 0.092 | yes | 36 / 9 | below 0.001 |
| gliner+pool3 minus gliner | 8 or fewer | 253 (29) | 0.522 | 0.522 | 0 | 0 to 0 | no | 0 / 0 | 1 |
| gliner+fan1 minus gliner+fan2 | more than 8 | 195 (25) | 0.272 | 0.323 | -0.051 | -0.116 to 0.022 | no | 15 / 25 | 0.154 |
| gliner+fan1 minus gliner+fan2 | all | 448 (30) | 0.413 | 0.435 | -0.022 | -0.053 to 0.009 | no | 15 / 25 | 0.154 |
| gliner+fan1 minus gliner+fan2 | 8 or fewer | 253 (29) | 0.522 | 0.522 | 0 | 0 to 0 | no | 0 / 0 | 1 |
| gliner+pool3 minus gliner+fan2 | more than 8 | 195 (25) | 0.318 | 0.323 | -0.005 | -0.06 to 0.043 | no | 17 / 18 | 1 |
| gliner+pool3 minus gliner+fan2 | all | 448 (30) | 0.433 | 0.435 | -0.002 | -0.024 to 0.018 | no | 17 / 18 | 1 |
| gliner+pool3 minus gliner+fan2 | 8 or fewer | 253 (29) | 0.522 | 0.522 | 0 | 0 to 0 | no | 0 / 0 | 1 |
| gliner minus stack | more than 8 | 195 (25) | 0.179 | 0.415 | -0.236 | -0.292 to -0.171 | yes | 7 / 53 | below 0.001 |
| gliner minus stack | all | 448 (30) | 0.373 | 0.487 | -0.114 | -0.146 to -0.075 | yes | 33 / 84 | below 0.001 |
| gliner minus stack | 8 or fewer | 253 (29) | 0.522 | 0.542 | -0.02 | -0.081 to 0.056 | no | 26 / 31 | 0.597 |

Kernel calls per record (as asked) and wall time of the run on a shared machine. Read the seconds with care: the first model kernel's time includes loading the model, and a later kernel reuses the answers already given to identical packets (every menu of 8 or fewer), so its seconds are for its wide menus only.

| kernel | calls, all: mean (largest) | calls, 8 or fewer: mean (largest) | calls, more than 8: mean (largest) | calls, 9 to 16: mean (largest) | calls, 17 and over: mean (largest) | calls in all | seconds | seconds per record | seconds per call |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gliner | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 445 | 958.9 | 2.14 | 2.155 |
| gliner+fan2 | 2.087 (8) | 1 (1) | 3.497 (8) | 3 (3) | 4.617 (8) | 935 | 157.2 | 0.351 | 0.168 |
| gliner+fan1 | 2.074 (6) | 1 (1) | 3.467 (6) | 3 (3) | 4.517 (6) | 929 | 28.1 | 0.063 | 0.03 |
| gliner+pool3 | 3.786 (15) | 1 (1) | 7.4 (15) | 6 (6) | 10.55 (15) | 1696 | 207.8 | 0.464 | 0.123 |

Option-order sensitivity: the same records under several shuffles.

| kernel | shuffles | top-1 per shuffle | range | same male under every shuffle | mean relative position of the answer (0.5: none) | answers on the first option (expected) | more than 8: top-1 per shuffle | more than 8: same male under every shuffle | more than 8: mean relative position | 8 or fewer: same male under every shuffle | 8 or fewer: answers on the first option (expected) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| null | 5 | 0.179, 0.152, 0.167, 0.181, 0.167 | 0.029 | 0.002 | 0.495 | 0.179 (0.168) | 0.103, 0.087, 0.077, 0.067, 0.056 | 0 | 0.489 | 0.004 | 0.248 (0.237) |
| stack | 5 | 0.487, 0.487, 0.493, 0.489, 0.484 | 0.009 | 0.953 | 0.487 | 0.174 (0.168) | 0.415, 0.415, 0.405, 0.4, 0.4 | 0.944 | 0.487 | 0.96 | 0.242 (0.237) |
| gliner | 3 | 0.373, 0.386, 0.368 | 0.018 | 0.473 | 0.565 | 0.105 (0.169) | 0.179, 0.19, 0.164 | 0.185 | 0.542 | 0.696 | 0.165 (0.237) |
| gliner+fan2 | 3 | 0.435, 0.453, 0.446 | 0.018 | 0.629 | 0.563 | 0.12 (0.168) | 0.323, 0.344, 0.344 | 0.544 | 0.537 | 0.696 | 0.165 (0.237) |

## train part: 977 records

Top-1 by choice-set size (records, focal males):

| kernel | all (977, 34) | 8 or fewer (579, 34) | more than 8 (398, 28) | 9 to 16 (301, 28) | 17 and over (97, 25) | refused |
| --- | --- | --- | --- | --- | --- | --- |
| null | 0.182 (0.16 to 0.204) | 0.245 (0.211 to 0.278) | 0.09 (0.064 to 0.122) | 0.1 (0.07 to 0.131) | 0.062 (0.017 to 0.122) | 0 |
| stack | 0.454 (0.4 to 0.515) | 0.511 (0.442 to 0.592) | 0.372 (0.306 to 0.432) | 0.395 (0.319 to 0.467) | 0.299 (0.211 to 0.398) | 0 |
| gliner | 0.332 (0.288 to 0.377) | 0.465 (0.4 to 0.526) | 0.138 (0.107 to 0.175) | 0.173 (0.131 to 0.222) | 0.031 (0 to 0.072) | 5 |
| gliner+fan2 | 0.418 (0.365 to 0.473) | 0.465 (0.4 to 0.526) | 0.349 (0.28 to 0.411) | 0.375 (0.307 to 0.443) | 0.268 (0.165 to 0.367) | 0 |

Paired differences on the same records (A minus B):

| pair | records | records (males) | A | B | difference | 95% interval | a difference | only A right / only B right | sign test p |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gliner+fan2 minus gliner | more than 8 | 398 (28) | 0.349 | 0.138 | 0.211 | 0.156 to 0.261 | yes | 100 / 16 | below 0.001 |
| gliner+fan2 minus gliner | all | 977 (34) | 0.418 | 0.332 | 0.086 | 0.063 to 0.108 | yes | 100 / 16 | below 0.001 |
| gliner+fan2 minus gliner | 8 or fewer | 579 (34) | 0.465 | 0.465 | 0 | 0 to 0 | no | 0 / 0 | 1 |
| gliner+fan2 minus stack | more than 8 | 398 (28) | 0.349 | 0.372 | -0.023 | -0.056 to 0.012 | no | 31 / 40 | 0.342 |
| gliner+fan2 minus stack | all | 977 (34) | 0.418 | 0.454 | -0.037 | -0.061 to -0.012 | yes | 70 / 106 | 0.008 |
| gliner+fan2 minus stack | 8 or fewer | 579 (34) | 0.465 | 0.511 | -0.047 | -0.085 to -0.011 | yes | 39 / 66 | 0.011 |
| gliner minus stack | more than 8 | 398 (28) | 0.138 | 0.372 | -0.234 | -0.284 to -0.176 | yes | 17 / 110 | below 0.001 |
| gliner minus stack | all | 977 (34) | 0.332 | 0.454 | -0.123 | -0.158 to -0.089 | yes | 56 / 176 | below 0.001 |
| gliner minus stack | 8 or fewer | 579 (34) | 0.465 | 0.511 | -0.047 | -0.085 to -0.011 | yes | 39 / 66 | 0.011 |

Kernel calls per record (as asked) and wall time of the run on a shared machine. Read the seconds with care: the first model kernel's time includes loading the model, and a later kernel reuses the answers already given to identical packets (every menu of 8 or fewer), so its seconds are for its wide menus only.

| kernel | calls, all: mean (largest) | calls, 8 or fewer: mean (largest) | calls, more than 8: mean (largest) | calls, 9 to 16: mean (largest) | calls, 17 and over: mean (largest) | calls in all | seconds | seconds per record | seconds per call |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gliner | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 972 | 656.5 | 0.672 | 0.675 |
| gliner+fan2 | 1.968 (8) | 1 (1) | 3.377 (8) | 3 (3) | 4.546 (8) | 1923 | 278.5 | 0.285 | 0.145 |

Option-order sensitivity: the same records under several shuffles.

| kernel | shuffles | top-1 per shuffle | range | same male under every shuffle | mean relative position of the answer (0.5: none) | answers on the first option (expected) | more than 8: top-1 per shuffle | more than 8: same male under every shuffle | more than 8: mean relative position | 8 or fewer: same male under every shuffle | 8 or fewer: answers on the first option (expected) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| null | 5 | 0.182, 0.177, 0.181, 0.158, 0.169 | 0.025 | 0.006 | 0.501 | 0.17 (0.171) | 0.09, 0.103, 0.073, 0.073, 0.053 | 0 | 0.501 | 0.01 | 0.234 (0.234) |
| stack | 5 | 0.454, 0.454, 0.455, 0.452, 0.452 | 0.003 | 0.933 | 0.5 | 0.172 (0.171) | 0.372, 0.369, 0.369, 0.367, 0.369 | 0.947 | 0.505 | 0.924 | 0.24 (0.234) |

## Confidence-gated routing (development part; thresholds fixed before it was read)

The kernel answers when its top probability is at least t; otherwise the three-rule stack does. A refused record routes.

**gliner.** t* = 1 (training part: routed top-1 0.454; curve t → top-1, share routed: 0 → 0.333, 0.005; 0.1 → 0.333, 0.005; 0.2 → 0.347, 0.083; 0.3 → 0.381, 0.275; 0.4 → 0.402, 0.472; 0.5 → 0.414, 0.613; 0.6 → 0.427, 0.714; 0.7 → 0.437, 0.819; 0.8 → 0.444, 0.894; 0.9 → 0.449, 0.96; 1 → 0.454, 1).

| threshold | t | routed top-1 | 95% interval | share routed to the stack | minus the stack (interval) | a difference | minus the kernel unrouted (interval) | a difference | on menus of more than 8: minus the stack (interval) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.6 (fixed in advance) | 0.6 | 0.473 | 0.386 to 0.544 | 0.757 | -0.013 (-0.036 to 0.005) | no | 0.1 (0.054 to 0.141) | yes | -0.046 (-0.08 to -0.015) |
| t* (chosen on the training part) | 1 | 0.487 | 0.418 to 0.545 | 1 | 0 (0 to 0) | no | 0.114 (0.075 to 0.146) | yes | 0 (0 to 0) |

**gliner+fan2.** t* = 0.75 (training part: routed top-1 0.454; curve t → top-1, share routed: 0 → 0.418, 0; 0.1 → 0.418, 0; 0.2 → 0.419, 0.012; 0.3 → 0.422, 0.16; 0.4 → 0.442, 0.422; 0.5 → 0.439, 0.598; 0.6 → 0.446, 0.701; 0.7 → 0.453, 0.821; 0.8 → 0.452, 0.895; 0.9 → 0.454, 0.963; 1 → 0.454, 1).

| threshold | t | routed top-1 | 95% interval | share routed to the stack | minus the stack (interval) | a difference | minus the kernel unrouted (interval) | a difference | on menus of more than 8: minus the stack (interval) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.6 (fixed in advance) | 0.6 | 0.491 | 0.418 to 0.551 | 0.783 | 0.004 (0 to 0.012) | no | 0.056 (0.004 to 0.107) | yes | -0.005 (-0.016 to 0) |
| t* (chosen on the training part) | 0.75 | 0.487 | 0.41 to 0.549 | 0.893 | 0 (-0.012 to 0.007) | no | 0.051 (0 to 0.097) | no | 0 (0 to 0) |

