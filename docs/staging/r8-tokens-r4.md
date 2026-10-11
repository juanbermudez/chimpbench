# Stage R8: packet length (the saved held-out contexts of stage R4)

Written by `scripts/r8-tokens.ts` over 1500 contexts (sampled before observeV5: they carry none of the new lines). Estimate: the project's `estimateInputTokens`. Real: the model's own count, by its tokenizer alone (`training/decide_ft/r8_tokens.py`; no model loaded).

| Packet | Estimate: median | 95th | largest | Real: median | 95th | largest | over 512 | Seconds at the real median (projected) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| today's state-only packet | 513 | 647 | 725 | 452 | 583 | 646 | 25.1% | 0.41 |
| the same with neutral options | 391 | 498 | 570 | 340 | 448 | 513 | 0.1% | 0.27 |

Real over estimate (means): today's state-only packet 0.888; the same with neutral options 0.87.

Seconds: the review's measurement on the untuned model (0.34 s at 396 tokens, 0.54 s at 541) read as a power law of exponent 1.48. A projection, not a measurement of these packets.

## By block (mean estimated tokens per packet)

| Block | today's state-only packet | the same with neutral options |
| --- | --- | --- |
| options | 189.3 | 89.4 |
| body | 86.0 | 86.0 |
| memories | 57.9 | 57.9 |
| nearby | 47.1 | 47.1 |
| me | 38.4 | 38.4 |
| now | 33.8 | 33.8 |
| history | 19.6 | 19.6 |
| feeling | 8.5 | 8.5 |
| instruction | 23.1 | 8.5 |
| (constant) | 5.7 | 5.7 |
| urgent | 5.8 | 0.0 |
| events | 0.0 | 0.0 |
