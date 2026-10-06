# ChimpBench: handoff for the move to a new computer (5 October 2026, 23:00 New York time)

**Repo: https://github.com/juanbermudez/chimpbench (public).** Its history was rewritten on 5 October 2026 before the first push: `public/audio/` (sound
derived from the user's Epidemic Sound subscription, not licensed for public redistribution) was removed from every
commit, and the author email was replaced by a GitHub no-reply address. **Every commit hash changed.** Hashes quoted in
docs written before then refer to the old history: translate them with
[docs/staging/commit-map.tsv](docs/staging/commit-map.tsv) (old → new, full hashes; match short ones by prefix). The
hashes in this file are already the new ones. Sound is off until rebuilt locally with `node scripts/build-audio.mjs`
from the user's own Epidemic Sound downloads; `public/audio/` is gitignored, so it can never be committed again.

Work is **paused** so the project can move to another computer. Nothing is running. This file is the entry point. Then
read [docs/staging/handoff-2026-10-05.md](docs/staging/handoff-2026-10-05.md) (the full takeover handoff: the user, the
rules, the science, the tools), [AGENTS.md](AGENTS.md), and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (Track E
and Track R).

## 1. What this project is and where it is going

ChimpBench is a deterministic 3D simulation of wild eastern chimpanzees (Kibale-like, 8 km field map). It also
demonstrates a small local decision model, GLiNER2.5-Decide, choosing each chimp's next action from what that chimp
perceives and feels. A virtual field observer scores the behaviour against 150 cited field targets.

- **Track E ("Emergence")** replaces hand-written rules (clock hours, timers, dice, tuned bonuses) with mechanisms:
  an energy ledger with a gut, sleep pressure, a body clock, hormone-like states and beliefs. Field numbers are
  targets, never inputs. The best stack, **S39**, has **42 prescriptions left against 147** in today's model. But it
  **starves at 12 months**: 6 starvation deaths in 20 seed-runs during the lean season. Fixing that is the open
  problem.
- **Track R ("Recurrent decision model"; [docs/recurrent-decision-model.md](docs/recurrent-decision-model.md))** is
  the direction the user chose. A memoryless decision kernel (rules, GLiNER, a small stand-in network, or Jev) is
  called at decision points inside a loop that carries the chimp's body and mind state. "Recurrent" means the loop,
  not learned recurrent weights. Only the framing exists (R0). The finding that matters: untuned GLiNER ignores the
  body state. It agrees with the rules 28% of the time (chance 19%), and chimps driven by it underfeed. It needs
  re-teaching on the new state (R4: needs GPU spend the user approves).
- **UI and graphics.** The user is iterating on the interface (range map done; a larger redesign started) and asked
  for a plan to lift the graphics.

## 2. Branch map

All work is in git; worktrees were only local copies. **Never commit to `main`** (user rule); integrate on `track-e`.

| Branch | Head | What | State |
| --- | --- | --- | --- |
| `track-e` | this commit | Integration branch: Track E, Track R docs, this handoff, the integrator kit | 943 tests: 942 pass, 0 fail, 1 skipped |
| `main` | 549d1a4 | Base | Unchanged since 1 October |
| `main-wip-2026-10-05` | d8b6047 | Snapshot of the main checkout's uncommitted work by other sessions (UI, in-browser GLiNER providers, model loader, Jev gateway and design docs, About page, guide, training changes) | Byte copies; not tested as a set. The LotIQ PDF was left out on purpose |
| `site` | ff6b548 | Hosted static build (GLiNER in the browser, Real time speed, hidden decision guide) | Deploy is held by the user |
| `ui-minimap` | 090c728 | Range-map card: the card is the map, community key inside it (fades on hover), controls along the foot | Done, user-reviewed; from `main` |
| `ui-redesign` | d2dbb46 | UI redesign (bottom chimp panel with a snapshot, flat right sidebar for Experiments and Society, hover popovers, α instead of the crown) | Paused before any redesign code: `site` + `ui-minimap` merged; plan in `docs/staging/ui-redesign-status.md` |
| `gfx-next` | 1746a1f | Graphics "next level" assessment | Paused: partial plan in `docs/graphics-next-level.md` (Status section at the top) |
| `feat-realtime` | bd961de | Real time speed (1 s/s) | Done; also inside `site` |
| `e1v-wadge` and ~100 `e*` stage branches | | Finished Track E stages | All merged into `track-e` |
| `c15-foraging`, `worktree-agent-ad2ed4f57e19b309a` | c8a6ac7, 7ac379a | Older sessions' uncommitted work, saved as WIP commits for the move | Untested; ask the user before using |
| `worktree-agent-a954b443db4b6f22a`, `jev-free-arms`, `c17-fusion`, `c11-calibration`, `c10-communication`, `c13-rg`, `site-about` | | Older or other-session work, not merged into `track-e` | Do not touch without the user |

## 3. Set up on the new computer

**Where the repo lives (second computer, since 6 October 2026, 01:10): `/Volumes/Drive/chimpbench/MGOGO`** (external
APFS drive, 700 GB free), not `~/Desktop/MGOGO`. On that Mac `~/Desktop` is synced by iCloud Drive with "Optimise Mac
Storage": within an hour of the clone macOS had evicted 14,230 of 18,704 files (the git pack and parts of
`node_modules` among them), reads hung or came back short, `git status` failed ("far too short to be a packfile") and
every runner stopped. **Never put the repo, a worktree or run outputs under `~/Desktop` or `~/Documents` on a Mac with
iCloud Desktop & Documents on** (`defaults read com.apple.finder FXICloudDriveDesktop` prints 1; `ls -lO` shows
`dataless` on evicted files; `brctl download <file>` brings one back). The kit scripts find the repo from their own
location (`MGOGO_ROOT` overrides).


1. Clone https://github.com/juanbermudez/chimpbench and check out `track-e`. **Node 22.22.3 exactly** (`.node-version`;
   with fnm: `fnm install 22.22.3`, then prefix commands with `fnm exec --using=22.22.3 --`), pnpm 8.15.9
   (`packageManager`), then `pnpm install`. Node 22.19.0 passes the tests but breaks every benchmark: tsx's loader does
   not reach worker threads there (`ERR_MODULE_NOT_FOUND … scripts/lib/bench-run` from `bench-worker.ts`; seen
   6 October 2026 on the second computer). Check with `pnpm test` (on `track-e`: 943 tests, 942 pass, 1 skipped; 941
   pass and 2 skipped without the hand-copied `c7a-field1y.json`) and `pnpm build`.
2. **Not in git; copy by hand (USB or AirDrop, never a public place):**
   - `data/raw/` (43 MB, 8 downloaded field datasets with their `PROVENANCE.md`). It holds **location-sensitive raw
     chimpanzee coordinates: never commit or publish them.** The simulation runs without it (phenology is generated
     into `src/sim/phenology.gen.ts`). The `src/compare/*` scripts and `ingest-phenology.ts` need it.
   - `artifacts/validation/c7a-field1y.json`: `tests/guide-data.test.ts` reads it. Without it that test skips its
     scorecard check (since 6 October).
   - **Optional:** the Track E reference runs (about 2.8 GB): `.claude/worktrees/bench-run/artifacts/validation/e/runs/`
     (S39 groups) and `bench-run2/…` (today's model). If you skip them, regenerate S39's group before judging E1v
     (§5, task 1).
   - **Optional:** `artifacts/decide-ft/` (1.3 GB: fine-tuned GLiNER adapters and receipts), needed only for Track R's
     R4/R5.
3. **The real model** (`pnpm dev` with GLiNER) needs the private repo `juanbermudez/GHN` at `~/Desktop/GHN` (or set
   `MGOGO_GHN_ROOT`). It is read-only and identity-checked by source hash. Everything else runs with
   `MGOGO_NO_MODEL=1`.
4. **Browser scripts** (`scripts/shot.mjs`, `verify-browser.mjs`, `gpu-probe.mjs`, `visual-scenes.mjs` and 10 more)
   load Playwright through `scripts/lib/playwright.mjs` and launch `/Applications/Google Chrome.app`. Playwright is not
   a dependency of the app: install it once outside the repo with
   `npm install --prefix ~/.cache/chimpbench/playwright playwright-core` (or set `MGOGO_PLAYWRIGHT` to its `index.mjs`).
5. Use `/usr/bin/python3` (or any Python 3 with the standard library) for the integrator scripts.
6. **Disk:** the long-run runner (`scripts/e-run.ts`) refuses to start below 5 GB free plus each job's outputs. Plan
   about 8 GB free for one wadging arm at 6 → 12 months. This is why the old computer was paused.
7. Worktrees for agents: the recipe is in `docs/staging/handoff-2026-10-05.md` §3. `node_modules`, `data/raw` and the
   c7a file are symlinks; never commit them. A symlinked `node_modules` shows as untracked (`.gitignore` names the
   directory): add `node_modules` and `data/raw` to `.git/info/exclude` once, or the runner refuses the checkout as
   dirty. Branches with other dependencies (`ui-redesign`, `site`: `@huggingface/transformers`) need their own
   `pnpm install` in the worktree instead of the symlink.

## 4. The integrator kit

`docs/staging/integrator-kit/` (README inside) holds the judge scripts, run drivers, the exact parameter files of
every recent arm (S39 and its re-draws, today's model, the walk-back, the E1v wadging arms) and the agent prompt
templates. The scripts find the repo from their own location (`MGOGO_ROOT` overrides).

## 5. Next specific tasks, in order

**State on 6 October 2026, 05:00 (second computer).** Task 1 is done: 0 starvation deaths in 20 seed-runs at 12 months
at a swallowed share of 0.5 and of 0.25, against S39's 6 (`docs/staging/e1v-prereg.md` §8.4); adopting a value is the
user's. Tasks 2 and 3 are done on their branches (`ui-redesign` 31a93fd, `gfx-next` 07401a6; the user's decisions are
listed in the status files there). Task 4 (R1) is merged, with the research part of a new stage RW (wild choice
benchmark) and a direction amendment from the user (`IMPLEMENTATION_PLAN.md`, Track R). Running: three years in one
run (`docs/staging/e-years-prereg.md`, checkout `bench-y3`). Next: the full test suite on the merged head, the user's
four R1 decisions (`docs/staging/r1-prereg.md` §8), then R1b. Today's local commits before b3bbe90 carry the machine's
default git identity: re-author them before any push.


1. **E1v: run the wadging arms** (registered in `docs/staging/e1v-prereg.md`; code merged at 1af4543; the user's
   decision: test a range, choose no value). Frozen checkout: `git worktree add --detach .claude/worktrees/bench-e1v
   1af4543`, plus the symlinks (`git status --short` must print nothing). From it, for each `S` in "", -s1, -s2, -s3:
   `pnpm exec tsx scripts/e-run.ts plan --label M6-W25$S --m6 --params-file <kit>/params/M6-W25$S.json --out
   artifacts/validation/e/runs/M6-W25$S`. Then run each plan in the background with `<kit>/scripts/e1vrun.sh
   M6-W25$S 1` (one job per runner while the load is above 8; relaunch any runner that stops on its budget). Then
   extend to 12 months: `plan --label M12-W25$S --m12 --params-file <same file> --from
   artifacts/validation/e/runs/M6-W25$S/run.json --out artifacts/validation/e/runs/M12-W25$S`. Repeat for W50. Judge:
   `/usr/bin/python3 <kit>/scripts/judge_e1v.py M6` (then `M12`). The judge expects S39's group in `bench-run`; if
   it wasn't copied, regenerate it in `bench-e1v` from `params/M6-S39*.json` (same commands, labels M6-S39…; it
   should reproduce the old group exactly, since every newer switch is off and was tested hash-identical at its default)
   and point the judge's `REF` there. Write the
   results under §6 of `e1v-prereg.md` (the statement: "S39 has no starvation in 20 seed-runs at a swallowed share of
   X or less", or that neither arm gets there) and report to the user in under 200 words. Adopting a value is the
   user's decision.
2. **UI redesign:** resume on `ui-redesign` from `docs/staging/ui-redesign-status.md`. The user's words are quoted
   there.
3. **Graphics:** resume on `gfx-next` from the Status section of `docs/graphics-next-level.md`: baseline shots, GPU
   baseline with `gpu-probe --ab`, then prototypes behind the 'high' quality setting. Main finding so far: zoomed
   out, the field view reads as parkland in a crater ringed by a turtle-shell canopy, and from about 1.5 km it is
   flat green felt.
4. **Track R, stage R1** (kernel contract) once E1v's arms are in: `IMPLEMENTATION_PLAN.md`, "Track R".
5. Then the list in `docs/staging/handoff-2026-10-05.md` §6.2: fermentation yield correction, observer fixes for
   T-LET-1, decision-guide and hosted-copy refresh.

## 6. Waiting on the user

- Deploy route and timing (held). `chimpbench.pages.dev` is live but not in the Cloudflare account on the old Mac.
- Whether to merge `ui-minimap` / `main-wip-2026-10-05` / `feat-realtime` into `main` (their call; never an agent's).
- GPU or Jev spend for Track R (R4/R5), with a cap.
- After E1v: adopt a wadging value, or keep "viability depends on wadging".
- ~~Repo visibility~~: answered 5 October: public, with `public/audio/` removed from history (see the top of this
  file).
- Older branches (§2, last rows) and the stale worktrees on the old computer.

## 7. Rules in one breath (details: handoff §2 and AGENTS.md)

Field numbers are targets, never inputs. Pre-register and commit before any run of changed code; at most 3 iterations
per stage. Seeds: 48 and 7 for development, 48, 7, 21, 5, 11 for confirms; never the reserved or retired seeds in
AGENTS.md. Switches stay 0 by default; goldens and the field pin test must not move. Benchmarks only from frozen
detached checkouts. At most 3 agents running simulations at once, 1–2 workers each, 1 above load 8. Never commit to
`main`; never deploy without the user's go. Never send the user's email or personal data to an external service;
never use Unpaywall; stop at any CAPTCHA. Never commit `data/raw`, the LotIQ PDF or secrets. Reports to the user:
short, plain English, the answer first, explicit confidence levels.
