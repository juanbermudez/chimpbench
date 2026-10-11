# Stage R8: packet length (contexts with the animal's own experience)

Written by `scripts/r8-tokens.ts` over 2572 contexts (the unit test's built world: seed 48, the second day from 09:30 to dusk, every rules decision of an animal aged 8 or over). Estimate: the project's `estimateInputTokens`. Real: the model's own count, by its tokenizer alone (`training/decide_ft/r8_tokens.py`; no model loaded).

| Packet | Estimate: median | 95th | largest | Real: median | 95th | largest | over 512 | Seconds at the real median (projected) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| today's state-only packet | 532 | 649 | 734 | 476 | 591 | 659 | 33.7% | 0.45 |
| the same with neutral options | 399 | 495 | 579 | 353 | 453 | 524 | 0.1% | 0.29 |
| packet 5, full | 470 | 612 | 736 | 392 | 520 | 624 | 6.1% | 0.33 |
| packet 5, short | 387 | 499 | 605 | 330 | 442 | 530 | 0.1% | 0.26 |

Real over estimate (means): today's state-only packet 0.898; the same with neutral options 0.886; packet 5, full 0.831; packet 5, short 0.857.

Seconds: the review's measurement on the untuned model (0.34 s at 396 tokens, 0.54 s at 541) read as a power law of exponent 1.48. A projection, not a measurement of these packets.

## By block (mean estimated tokens per packet)

| Block | today's state-only packet | the same with neutral options | packet 5, full | packet 5, short |
| --- | --- | --- | --- | --- |
| options | 196.5 | 87.7 | 87.7 | 87.7 |
| body | 82.9 | 82.9 | 82.9 | 45.8 |
| nearby | 55.6 | 55.6 | 63.4 | 63.4 |
| lately | 0.0 | 0.0 | 56.9 | 56.9 |
| me | 38.4 | 38.4 | 38.4 | 30.5 |
| now | 32.8 | 32.8 | 32.7 | 30.0 |
| last | 0.0 | 0.0 | 31.5 | 18.8 |
| history | 16.0 | 16.0 | 16.0 | 0.0 |
| doing | 0.0 | 0.0 | 15.8 | 15.8 |
| memories | 56.0 | 56.0 | 12.2 | 7.2 |
| instruction | 23.1 | 8.5 | 8.5 | 8.5 |
| asked because | 0.0 | 0.0 | 8.2 | 8.2 |
| feeling | 8.7 | 8.7 | 7.1 | 7.1 |
| (constant) | 5.7 | 5.7 | 5.7 | 5.7 |
| urgent | 4.0 | 0.0 | 0.0 | 0.0 |
