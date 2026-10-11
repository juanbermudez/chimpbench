# Stage R8: packet length (contexts with the animal's own experience)

Written by `scripts/r8-tokens.ts` over 1467 contexts (the sampler's smoke day: seed 48, the first simulated day, half of the decision points). Estimate: the project's `estimateInputTokens`. Real: the model's own count, by its tokenizer alone (`training/decide_ft/r8_tokens.py`; no model loaded).

| Packet | Estimate: median | 95th | largest | Real: median | 95th | largest | over 512 | Seconds at the real median (projected) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| today's state-only packet | 430 | 547 | 636 | 385 | 493 | 558 | 2.3% | 0.33 |
| the same with neutral options | 321 | 414 | 463 | 281 | 367 | 409 | 0.0% | 0.2 |
| packet 5, full | 382 | 512 | 600 | 314 | 415 | 497 | 0.0% | 0.24 |
| packet 5, short | 322 | 416 | 505 | 270 | 352 | 428 | 0.0% | 0.19 |

Real over estimate (means): today's state-only packet 0.898; the same with neutral options 0.874; packet 5, full 0.817; packet 5, short 0.84.

Seconds: the review's measurement on the untuned model (0.34 s at 396 tokens, 0.54 s at 541) read as a power law of exponent 1.48. A projection, not a measurement of these packets.

## By block (mean estimated tokens per packet)

| Block | today's state-only packet | the same with neutral options | packet 5, full | packet 5, short |
| --- | --- | --- | --- | --- |
| options | 169.2 | 80.6 | 80.6 | 80.6 |
| body | 75.9 | 75.9 | 75.9 | 40.4 |
| lately | 0.0 | 0.0 | 49.4 | 49.4 |
| nearby | 33.0 | 33.0 | 38.7 | 38.7 |
| me | 38.3 | 38.3 | 38.3 | 30.1 |
| now | 33.7 | 33.7 | 33.6 | 30.6 |
| doing | 0.0 | 0.0 | 16.4 | 16.4 |
| last | 0.0 | 0.0 | 16.2 | 8.7 |
| history | 8.7 | 8.7 | 8.7 | 0.0 |
| instruction | 23.1 | 8.5 | 8.5 | 8.5 |
| asked because | 0.0 | 0.0 | 7.5 | 7.5 |
| (constant) | 5.7 | 5.7 | 5.7 | 5.7 |
| feeling | 8.1 | 8.1 | 5.6 | 5.6 |
| memories | 28.7 | 28.7 | 4.7 | 3.4 |
| urgent | 4.3 | 0.0 | 0.0 | 0.0 |

## What each new line costs (packet 5, full, with the line less without it)

| Line | Packets carrying it | Estimate: mean | Real: mean | median |
| --- | --- | --- | --- | --- |
| doing | 100% | 15.7 | 11.1 | 8 |
| asked because | 55% | 5.1 | 2.4 | 0 |
| companions' acts (in nearby) | 80% | 5.7 | 4.2 | 4 |
| lately | 93% | 49.4 | 25.7 | 29 |
| last | 56% | -3.4 | -2.7 | 0 |

Leaving a line out can bring a memory line back (the grooming memories that `last` replaces, the interrupt that `asked because` tells), so a cost here is net of that.
