# Integrator kit (Track E)

The Track E integrator's working files, committed on 5 October 2026 so they survive the move to another computer. Until
then they lived only in gitignored folders (`artifacts/integrator/`, the session scratchpads). Nothing here runs in the
app or the tests.

| Folder | What |
| --- | --- |
| `scripts/` | Judges and run drivers. `judge_e1v.py <M6\|M12> [W25 W50]` judges the E1v wadging arms against S39's group; `judge_e1t.py`, `judge_c.py` (Part C), `judge_vs_reps.py` (the noise rule of `docs/staging/e-noise.md`), `night.py` (night safety from a rhythm JSON). `e1vrun.sh`, `e1trun.sh`, `m6run.sh` drive one `scripts/e-run.ts` runner for up to ~100 minutes (relaunch when one stops on its budget); `loadwatch.sh` waits for the load to drop. |
| `params/` | The exact parameter files of every recent arm: `M6-S39{,-s1,-s2,-s3}.json` (the best stack, S39, and its three re-draws by `rngSalt`), `M6-T0…` (today's model), `M6-E1t…`, `WB-S27…S37` (the walk-back), and `M6-W50…` / `M6-W25…` (S39 with `pithFibreSwallowed` 0.5 / 0.25: the E1v arms, not yet run). The same files serve the 12-month extensions. |
| `prompts/` | Stage-agent prompt templates (`e*-prompt.txt`, `eA`…`eR`), the shared blocks (`hard-block.txt`, `common-block.txt`, `preflight.txt`) and `e1v-prompt.txt` (the prompt that built E1v). Reuse their structure; refresh the facts. |

**Paths.** The scripts find the repo from their own location (`MGOGO_ROOT` overrides), with frozen run checkouts under
`.claude/worktrees/` (`bench-run`, `bench-run2` hold the Part C reference runs where they were copied; `bench-e1v` is
E1v's run checkout at 1af4543). `judge_e1v.py` reads S39's group from `bench-run` if it is there, else from `bench-e1v`
(`E1V_REF` names another checkout). The judges find `night.py` beside themselves. Use `/usr/bin/python3` (or any
Python 3 with the standard library only). Run the drivers under Node 22.22.3 (`fnm exec --using=22.22.3 -- zsh e1vrun.sh …`); `armphase.sh <M6|M12> <TAG>` plans and runs one arm's four runs and waits for them.

**The reference runs are not in git.** `artifacts/` is gitignored, so the S39 and today's-model groups that every 6- and
12-month comparison uses (`bench-run*/artifacts/validation/e/runs/{M6,M12}-…`, about 2.8 GB) stay on the old computer
unless copied by hand. Without them, regenerate the S39 group from `params/M6-S39*.json` at commit dbee12e (see
`HANDOFF.md`, "Set up").
