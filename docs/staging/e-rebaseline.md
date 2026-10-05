# Re-baseline on the new protocol (part C of the user's decision of 4 October 2026)

**Registered 5 October 2026, before any run.** User, verbatim: "apply the audited fixes and targets. You can run more
than 90 days. You can run 2 years for biggest tests, but work up from 6 months, 12 months and 24 months is only when you
do need to test something on a longer horizon."

## What is run

- **Protocol:** freeze 5d4fa5a2a500bce6 (data/targets.json, merged on track-e at ed18c1e); the old bands are scored too,
  from data/targets.c8.json (freeze a2228c2df476680b), for one full cycle, so no band change reads as model progress.
- **Tool:** e-bench's single pass (branch eB-bench at 1824a88, track-e 2a396d3 merged: bench, energy and rhythm readouts
  from one simulation per seed; verified identical to the separate tools on S39 quick and confirm), run from frozen
  detached checkouts (bench-run3, bench-run4) at 1824a88.
- **Stacks:** S39 (S37 + `tripBeliefs` 3; 42 prescriptions; parameters bench-run2/artifacts/validation/e/s39/S39-params.json)
  and today's model (every Track E switch 0; parameters `{}`; 147).
- **Groups (e-noise.md amendment 4):** per stack and horizon, 4 runs: the stack and its re-draws by `rngSalt` 1, 2, 3.
- **Horizons:** 60 days (`--confirm`: seeds 48, 7, 21, 5, 11; 30 + 60) for stage confirms, and 6 months (`--m6`: 30 + 180;
  the end checkpoints are kept so `--m12 --resume` can extend them).

## What is reported per horizon

Rows in band on the new and the old bands; rows newly scorable (truth rows, and rows that needed a longer window);
the biggest misses (expected among them: hunt success, the travel share 0.115, T-COM-11, T-FOOD-10, T-RNG-5); fitted and
held-out sums with and without the rare rows; viability, night safety and deaths by cause.

## Decision rule (part C2)

At 6 months S39 **holds** against today's model if it is viable (no starvation; e-bench's viability pass) and its held-out
sum on the new bands is not worse than today's group beyond noise (z ≤ 2 by amendment 4's 6-month rule; also reported
without the rare rows). If it holds, S39's group is extended to 12 months (`--m12 --resume`) for the year-long rows and
part D's event counts. If it fails, S39's latest switches are switched off one at a time at 6 months (`tripBeliefs` 3,
then `callGaps` 7, then `aggressionGaps` 7, …) to find the cause; past decisions are not re-run.

**Predictions (low confidence, before any run).** S39 viable at 6 months; its held-out sum not worse than today's (it was
better than S27 on the old bands); hunting outside the new 4–11 band (16.9 at 60 days on the old protocol); the travel
share below its band; T-COM-11 below its band; T-FOOD-10 above its band.

**Amendment (5 October 2026, 01:55, before any result).** The first 60-day runs were stopped minutes after starting (no
output read) and restarted on eB-bench 1f8553b, which adds the T-INF-1 readout (lonsdorf2014's ten Gombe blocks): 26
truth rows read, 14 not scorable; nothing else in the code path changes.

**Amendment 2 (5 October 2026, 02:10, before any 6-month run).** The 6-month groups run with the resumable runner
(`scripts/e-run.ts`, single pass, one job per seed) from frozen detached checkouts (bench-run for S39, bench-run2 for
today's model) at track-e 550d08d, which contains eB-bench 1f8553b plus the runner and eR-runs' behaviour-neutral memos
(2-day and 30-day world hashes identical on S39) and E3i's `callTrip` (0 in both stacks): the simulation of these
parameters is the same as at 1f8553b. Results at 60 days stay on 1f8553b.
