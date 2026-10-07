# EY follow-up: why juveniles starve in years two and three at a swallowed share of 0.5

Branch `juv-starve` (from track-e b6e35dc). Diagnosis only: nothing under `src/` or `data/` changes, no parameter moves.
Question and result it follows: `e-years-prereg.md` §7.

(The answer, the tables and the code path are written after the short runs below; this first commit holds the run log.)

## Run log (written before any run)

**What the saved outputs cannot give.** The three-year parts hold class readouts and group sums, no per-animal record,
and no end checkpoint. They show who died and when (group counts, survivors) but not the energy budget of one animal
after it is weaned: milk lost, energy absorbed against energy spent by term, eating minutes, the share of the day with
a full gut, the fallback share. Those are the variables explanation (d) is about.

**What was checked first, without a run.** The first 365 scored days of every three-year seed-run are equal, float for
float, to the 12-month run with the same seed, share and `rngSalt` (class reserve trajectories; `scripts/ey-juv/analyse.py`).
So the 12-month end checkpoints (`bench-e1v/…/M12-W50`, `M12-W25`, day 395) are the three-year runs' worlds at scored
day 365.

**Why not `e-bench --resume … --animal-days`.** A resume is refused unless it shares the checkpoint's settings
(`scripts/lib/bench-run.ts` `settingsOf`), and the checkpoints were made without the per-animal readout. So
`scripts/ey-juv/resume-probe.ts` loads the checkpoint's world and drives the same readout (`scripts/lib/energy-probe.ts`,
`animalDays`) over it with `tickWorld` only: no parameter change, no observer (the observer and the field experiments
never write the world: `bench-run.ts` runs the experiments on copies). The sim code is imported from the frozen
checkout `bench-y3` (src tree e88a533e, the checkpoints' own), read only. Outputs go to this worktree's
`artifacts/validation/ey-juv/` (gitignored). Check on each result: its class reserve trajectories must equal the saved
three-year run's on scored days 365 to 484.

| run | checkpoint | simulated days | what it is meant to show |
| --- | --- | --- | --- |
| P0 | M12-W50, seed 48, day 395 | 1 | smoke run: the script loads the world, the readout writes rows, the trajectory check passes on day 365 |
| P1 | M12-W50, seed 48, day 395 | 120 | the budget of the one weaned animal under 6 y (id 22, weaned on about day 223) at 0.5, and of id 37 before and after its weaning (due about day 413), against the older juveniles and the unweaned of the same age |
| P2 | M12-W25, seed 48, day 395 | 120 | the same animals at 0.25: which term differs |
| P3 | M12-W50, seed 7, day 395 | 120 | the same two animals where the seed drew later weaning ages (both still on milk in the window): the control |
| P4 | M12-W25, seed 7, day 395 | 120 | the control at 0.25 |

Seeds 48 and 7 only, `rngSalt` 0, at most two jobs at a time, `uptime` and swap checked before each launch (no launch
above 6 GB of swap used). Nothing longer, no other arm.
