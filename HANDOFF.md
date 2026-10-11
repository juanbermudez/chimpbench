# ChimpBench: handoff (Sunday 11 October 2026, 16:45 New York time)

This file is the entry point for whoever opens this repository next, a person or an agent. Read it first. Then read
[AGENTS.md](AGENTS.md) (binding conventions, commands, gotchas), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
(every stage and its status; Track R is the live one) and, for how to work with the user and the older science,
[docs/staging/handoff-2026-10-05.md](docs/staging/handoff-2026-10-05.md).

**Repo: https://github.com/juanbermudez/chimpbench (public).** Its history was rewritten on 5 October 2026 before the
first push: `public/audio/` (sound cut from the owner's Epidemic Sound files, not licensed for redistribution) was
removed from every commit, and the author email was replaced by a GitHub no-reply address. Every commit hash changed:
translate older hashes with [docs/staging/commit-map.tsv](docs/staging/commit-map.tsv) and `commit-map-2026-10-06.tsv`.
A fresh clone has no sound until `node scripts/build-audio.mjs` rebuilds it locally from the owner's own downloads.

## 1. What this project is and where it is going

ChimpBench is a deterministic 3D simulation of wild eastern chimpanzees (Kibale-like, an 8 km field map). It is also a
demo of a small local decision model, GLiNER2.5-Decide, choosing an animal's next act from what that animal perceives
and feels. A virtual field observer scores behaviour against 150 cited field targets (`data/targets.json`).

- **Direction (the user, 6 October 2026):** "we want to correct whe still relly on code, and we want to compare to what
  wild chimps display in the wild, and that the behavior can be driven with a simple desicion engine with the recurrent
  chape we designed". So: less hand-written code in the choice; what wild chimpanzees do as the yardstick; a small
  local engine making the choice inside the loop of the Recurrent Decision Model (the name is never abbreviated;
  [docs/recurrent-decision-model.md](docs/recurrent-decision-model.md)). The loop stays code by design: body and
  mind state, perception, the legal menu, the legality re-check.
- **The user's rulings of 10 October 2026.** Asked five questions after a review of the whole project, the user
  answered "yes to all recomendations. Move forward with the implementation": the packet may show the animal's own
  experience, and the loop may draw from the model's odds and hold the result, with nothing fitted. The Taï activity
  records are a yardstick only, the three approved Dryad files were to be downloaded, and a watching speed and the
  grooming clip go ahead of the held canopy work (plan, "User decisions (10 October 2026)").
- **Track E ("Emergence")**, the mechanisms under the choice: the best stack, S39, has 42 prescriptions left against
  147 in the default model. The working base for engine comparisons is S39 with a swallowed share of pith fibre of
  0.5, and 0.25 as the sensitivity check; no value is adopted as a claim about chimpanzees.
- **Names every result must carry** (plan, 10 October): "rules-taught model on a rules menu" for the adapters of stages
  R4 to R5-gate and for the app with an adapter; "untuned model on a rules menu" for today's app; "copy of adapter X,
  audited, agreement A" for a stand-in. In every result so far the rules taught the model and wrote its menu.

## 2. Where things stand

### 2.1 What 10 and 11 October 2026 established

Fourteen stage branches were merged into `track-e` on 11 October. Each line names its document under `docs/staging/`.

- **The review (10 October).** A read-only review found that no kernel had ever chosen a tree (the menu held exactly
  one feeding option on 99.6% of asks) and that 35% of the first adapter's training labels were acts the gate kept or
  that had arrived. Plan, "What the review changed"; reports in `/Volumes/Drive/chimpbench/shots/review-2026-10-10/`.
- **Who decides today.** With the first adapter (`r4-rules-state`) and the gate on, the model picked the kind of act
  from a real choice for 34.8% to 63.0% of waking minutes, the target of 7.6% of acts and no ending. A trip could go
  to 50.8 trees on average and the menu shows 0.74. `r7-ledger.md`; the timing card: `r7-prereg.md`.
- **The wording test.** The first adapter picks the rules' decision on 0.609 of 954 held-out fresh draws with the
  packet it was trained on, and on 0.386 with neutral option labels (chance 0.186, the untuned model 0.286). More than
  half of what it learned over chance was read from the rules' own sentences. `r8-wording-numbers.md`.
- **Draw and hold.** Neither decode becomes the standard. A seeded draw brings the first adapter's switching and
  trips toward the rules' and fails "does no harm" (nights in a nest, reserves); a held draw is worse. The top pick
  stays, with a draw arm beside it in every later engine test. `r9-prereg.md` §10.6, `r9-numbers.md`.
- **The second training seed.** The first recipe trained again is the same adapter offline (0.597 against 0.609) and
  with the top pick in the loop, and differs under a draw. So the single trainings of R4 to R4c were readable, and an
  arm that draws needs both seeds. `r9-seed2-numbers.md`.
- **The first whole population on the real model.** Every animal aged 8 and over on the first adapter for nine
  simulated days, seed 48. It is viable (no death, 342 of 342 nights in a nest) and sedentary: beside the same 38
  animals on the rules it eats 1,487 against 1,597 kcal a day, walks 1.63 against 2.50 km and begins 2.4 trips to food
  against 7.6. A level on one training seed, a rules-taught model on a rules menu, animals under 8 on the rules.
  `r10-prereg.md` §10.8, `r10-night-s48-paired.md`.
- **Forked outcomes do not repeat.** Each option was forced on a copy of the world and the animal's body read later.
  The best kind of act of four replicates is the best of four others at 0.39 of decision points after 3 simulated
  hours and 0.34 after 6 (the registered line was 0.70, chance 0.23). `r7b-prereg.md`, `r7b-numbers.md`.
- **The scorecard can hardly show "closer".** Measured as distance outside the field band, the rules already sit
  inside the band on 11 of the 15 short-scorecard rows at the population unit and on 10 of 12 at ten animals. An
  engine could be shown closer than the rules on one row (T-SOC-6) at the population unit and on none at ten animals.
  A claim of "closer to wild chimpanzees" has to come from elsewhere. `r7-prereg.md` §13a, `r7b-prereg.md`.
- **The three downloaded deposits.** Taï grooming is a true wild choice record, and a narrow one: the first adult
  groomed among those in sight (557 records to learn from, 329 to tune on, 420 sealed). The Kanyawara coalitions
  record who attacked together, not who chose: a small test, never a teacher. The Budongo scans are a yardstick for
  party size only. On the Taï development part no kernel reaches the simple rule "the partner it groomed first most
  often before" (0.353; the untuned model 0.301, the Ngogo-taught adapter 0.319, the rules-taught adapters 0.261 to
  0.289). `rw2-prereg.md` (the plain page and §8.4).
- **The viewer fixes merged (W1 to W5).** Travelling animals walk at every speed; a watching speed exists (Watch 4×,
  key 2); no white-out facing a low sun; the young have eyes; a selected animal shows its reason and an "about to"
  tag; grooming pairs on the ground move. Frame time is unchanged. Plan, "Stages W1 to W5".

### 2.2 Running or queued (true at 16:45 EDT on 11 October 2026; this part goes stale within a day)

**The retraining chain of stage R11 is running.** It is the first training on the honest packet (packet 5, fresh
draws only, the rules' own odds as labels; `docs/staging/r11-prereg.md`). It was launched at 16:21 EDT in a detached
`screen` session named `r11chain`, from the frozen checkout `.claude/worktrees/bench-r11` (5b5a506). Nothing has
been read. Expect it to end on the morning of 12 October: 11 to 15 hours, more with the optional steps and swap holds.

- **To check it, only read.** `cat .claude/worktrees/bench-r11/artifacts/r11-chain/status.log` (a START and an END
  line per step, with its exit code) and `cat …/r11-chain/state` (`running`, `failed` or `done`). Each step's output
  is `…/r11-chain/<step>.log`; `…/r11-chain/milestone` appears when night one is done; `screen -ls` shows the session.
- **Do not disturb it.** Do not attach to the session, edit or commit in `bench-r11` (a model step refuses a tree that
  is not clean), or start any Python from `/Volumes/Drive/chimpbench/decide-env`: one model process runs at a time,
  and every model step refuses while another is alive. That also rules out `pnpm dev` without `MGOGO_NO_MODEL=1`,
  `scripts/rw2-eval.sh` and `scripts/r10-night.ts` until the chain has ended.
- **The steps, in order.** `00-check`, `01-dry` (the whole path against a fake worker), `02-parity` (both arms);
  night one: `10-train-p5b-7`, `11-train-p5a-7`, `12-offline`, `13-baseline` (optional), `14-loop-4111`,
  `15-loop-4222`, `16-report`; night two: `20-train-p5b-11`, `21-train-p5a-11`, `22-offline`, `23-loop-4111`,
  `24-loop-4222`, `25-old-draw` (optional), `26-report`. The first three passed, and the first training began at 16:26.
- **Where its output goes.** Adapters and scores: `.claude/worktrees/r11-honest-retrain/artifacts/decide-ft/r11`. Loop
  arms: `…/r11-honest-retrain/artifacts/r11/loop`. Tables: `bench-r11/artifacts/r11/tables`, until
  `scripts/r11-run.sh publish` copies them to `docs/staging`. None of it is in git.
- **If it failed.** `state` reads `failed` and the last line of `status.log` names the step: read that step's log. The
  chain does not resume by itself. Run the remaining steps by hand in the same order, from `bench-r11`, with the two
  exports at the top of `…/r11-chain/chain.sh`, in a detached `screen` session. A training cut short: delete its
  half-made folder under `adapters/` first (an adapter counts only with its `manifest.json`). `offline` and
  `loop <seed>` can be run again as they are: they skip what is on file. Details: the end of `r11-prereg.md`.

**Five viewer stages are being built by agents** on branches cut from 7f9ec5b: `w6-decision-beat` (the decision shown
on the body), `w7-fruit` (fruit you can see), `w8-state-on-body`, `w9-tree-pairs` and `w10-calls-map` (calls you can
see, and a map of what the community is doing). At 16:45, `w6`, `w7` and `w10` held commits and a stage document, and
`w8` and `w9` held none. None is merged. Pictures: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/`.

## 3. Set-up on this computer

**The repo lives at `/Volumes/Drive/chimpbench/MGOGO`** (an external APFS drive; Apple M4, 16 GB), never under
`~/Desktop` or `~/Documents`. On this Mac iCloud Drive syncs those folders with "Optimise Mac Storage": within an hour
of the first clone macOS had evicted 14,230 of 18,704 files (the git pack among them) and every runner stopped.
**Never put the repo, a worktree or run outputs in an iCloud folder** (`ls -lO` shows `dataless` on evicted files).

1. **Node 22.22.3 exactly** (`.node-version`; prefix commands with `fnm exec --using=22.22.3 --`), pnpm 8.15.9, then
   `pnpm install`. Node 22.19.0 passes the tests and breaks every worker-pool script. The whole suite last ran at
   7f9ec5b: 1,280 tests, all passing (`/Volumes/Drive/chimpbench/shots/watch-2026-10-11/stale-docs-from-pre-push-check.md`).
   Stages RW2 and R11 have added tests since, and no whole-suite run on the present head is on record.
2. **Not in git; copy by hand, never to a public place:** `data/raw/` (12 folders of downloaded field datasets with
   their `PROVENANCE.md`; it holds location-sensitive raw coordinates and animal identities: never commit or publish
   them); `artifacts/validation/c7a-field1y.json` (`tests/guide-data.test.ts` skips its scorecard check without it);
   the adapters and run folders listed in §4. The simulation itself runs without any of them.
3. **The real model.** Everything is under `/Volumes/Drive/chimpbench/`:
   - **GHN:** `/Volumes/Drive/chimpbench/GHN`, a clone of the private repository that holds the model's serving
     code, read-only. The worker (`experiments/active_perception/decide_provider.py`) is on the branch
     `ghn-live/semantic-graph-and-shape-review` (c26b0ec), which is checked out. Keep it checked out.
   - **Environment:** `/Volumes/Drive/chimpbench/decide-env` (uv, CPython 3.12.12), from GHN's pinned
     `decide-requirements.txt`: torch 2.14.0 (MPS), gliner2 2.0.0, transformers 4.57.6, peft 0.21.0. The worker
     refuses anything but torch 2.14.0 and its pinned gliner2 source hash.
   - **Model cache:** `/Volumes/Drive/chimpbench/hf-cache`; `fastino/GLiNER2.5-Decide`, revision `7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6`.
   - **Variables** (set both cache variables, or the model is looked for on the internal disk):
     `MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN`, `MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python`,
     `HF_HOME=/Volumes/Drive/chimpbench/hf-cache`, `HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub`. The offline
     flags are set by the code. Adapters: `MGOGO_FT_ROOT` (the folder that holds `adapters/<name>`) and
     `MGOGO_FT_ADAPTERS`. `training/decide_ft/r4_py.sh <script>` sets them all; `parity.py` must print `PARITY OK`.
   - **Measured here:** 0.44 s per decision at 467 tokens for the untuned model, and the packet's length is the only
     speed lever (plan, "What the review changed"); 0.52 s a call over the population run; the model loads on a
     worker's first batch, 55 to 220 s; a training runs at 0.6 s an example and 6.1 GiB (`r11-prereg.md` §12).
   - **Through the app:** the four variables, then `fnm exec --using=22.22.3 -- pnpm exec vite --host 127.0.0.1 --port
     5183 --strictPort` and `node scripts/verify-browser.mjs http://127.0.0.1:5183` (all 20 checks passed on
     6 October 2026). Everything else runs with `MGOGO_NO_MODEL=1`.
4. **Browser scripts** (`scripts/shot.mjs`, `verify-browser.mjs`, the probes) load Playwright through
   `scripts/lib/playwright.mjs` and launch `/Applications/Google Chrome.app`. Install it once outside the repo:
   `npm install --prefix ~/.cache/chimpbench/playwright playwright-core` (or set `MGOGO_PLAYWRIGHT`).
5. Use `/usr/bin/python3` for the integrator scripts and for `scripts/rw2/rw2_ingest.py` (run as `-I`).
6. **Disk:** `scripts/e-run.ts` and `scripts/r10-night.ts` refuse to start below 5 GB free.
7. **Worktrees:** `git worktree add -b <name> .claude/worktrees/<name> track-e`, then link `node_modules` and
   `data/raw` from the main checkout (AGENTS.md, "Gotchas"). A frozen run checkout is the same with `--detach
   <commit>`; `git status --short` must print nothing. The integrator's judge scripts, run drivers and prompt
   templates are in `docs/staging/integrator-kit/` (README inside).

## 4. Branch map and frozen checkouts

**`main` is never committed to.** It moves only by fast-forward to a tested `track-e` head, on the user's word
(6 October: "merge and push to main, and make sure these issues get addresssed and we move faster parelalizing more
work to get closer to the real results"; `docs/staging/handoff-2026-10-05.md` §2.2). Deploys stay held.

| Branch or checkout | Head | State |
| --- | --- | --- |
| `main`, and `track-e` on the remote | 7f9ec5b | Equal. Pushed on 11 October 2026 at 14:59 EDT, at the user's request |
| `track-e` (local, the integration branch; the main checkout is on it) | 5718008 when this was written | **51 commits ahead of the remote, not pushed:** stage R11's preparation, stage RW2, their merges and RW2's model scores |
| `docs-refresh` | this file's branch | The shared documents brought up to date; to be merged by the integrator |
| `r7-card`, `r7-ledger`, `r7b-forks`, `r8-packet5`, `r9-draw-hold`, `r10-night`, `r11-honest-retrain`, `r12-menu-design`, `rw2-wild-records`, `w1-travel-walk` to `w5-grooming` | | Merged into `track-e` on 11 October (R7 to R10 and W1 to W5 through `integrate-t1`). Keep the worktrees `r4-train`, `r4b-retrain`, `r5-pilot` and `r11-honest-retrain`: their `artifacts/` hold adapters and receipts that are not in git |
| `w6-decision-beat` to `w10-calls-map` | | In progress (§2.2); not merged |
| `bench-t1` (frozen, a11c45c) | | Not in git: `artifacts/r8/rerender` (the wording test), `artifacts/r9` (the decode arms and tables), `artifacts/decide-ft/r9` (the adapter `r4-rules-state-s2`), `artifacts/r10/night-s48` and `rules-s48` (the population run: receipts, contexts, checkpoints; kept for relabelling) |
| `bench-rw2` (frozen, 97be5bf) | | Not in git: `artifacts/rw2`, the derived wild records (no animal code, no date; never commit them) and the per-record model scores |
| `bench-r11` (frozen, 5b5a506) | | **The running chain (§2.2). Do not touch** |
| `bench-run`, `bench-y3`, `bench-e1v`, `bench-e1x`, `bench-e1x3`, `bench-wean`, `bench-r1b`, `ab-base` (frozen) | | Older reference runs (Track E, R1b) and a comparison base. Keep |
| `gfx-next` | 2abb1cb | The closed canopy, held by the user's decision; its grooming clip was merged as W5 |
| On the remote only: `site`, `ui-minimap`, `feat-realtime`, `main-wip-2026-10-05`, `c15-foraging`, `jev-free-arms`, `c17-fusion`, `c11-calibration`, `c10-communication`, `c13-rg`, `site-about`, `worktree-agent-*` | | Older or other sessions' work. **Do not touch without the user.** `site` is the hosted build; its deploy is held |

## 5. Next tasks, in order

1. **Read the R11 chain** when `state` says `done` (or repair it, §2.2). Its last step writes the report; then
   `scripts/r11-run.sh publish` copies the tables to `docs/staging`. Commit them on a branch, and write the result
   into `r11-prereg.md` and the plan by the registered marks ("How to read the result" there). Night one alone, one
   training per arm, carries no registered statement.
2. **Review and merge the viewer stages** `w6` to `w10` as they finish: `pnpm test`, `pnpm build`, one look in the
   running app, before and after pictures.
3. **Merge `docs-refresh`** and run the whole suite on the merged head. Before any push: a privacy check of the
   range (no personal data, no raw rows), and only the two branches by name (§4).
4. **Put §6 to the user**, the ten rulings first. Nothing of stage R12 is built before them.
5. **Then, one model process at a time:** the next population run, registered first, with the first of stage R11's
   adapters on a fresh unseen seed (`r10-prereg.md` §10.8); the Taï grooming adapter if the user agrees (§6); the real
   token count and time of stage R12's two short calls (`r12-prereg.md`, "For the integrator", item 3).
6. **Small repairs on record:** the model-process guard of `scripts/r9-run.sh` and `scripts/r9-seed2.sh` looks by the
   interpreter's path only (AGENTS.md, "Gotchas"); the population script does not yet log items 3 to 8 of the
   ledger's list (`r7-ledger.md` §13). The older Track E list (the fermentation yield correction, the 24-month
   reference) is in `docs/staging/handoff-2026-10-05.md` §6.2 and was not re-checked on 11 October.

## 6. Waiting on the user

- **The ten rulings on the menu**, on the first page of `docs/staging/r12-menu-table.md`: what counts as a fact about
  what is possible and what is advice, which tree, which water, whom to groom and greet, what stays with the rules.
- **May forked body outcomes ever be a label source?** Recommended: no, as designed (`r7b-prereg.md` §8).
- **A stay question** ("still in this act later?") trained into the model. Recommended: not now (`r7b-prereg.md` §8).
- **The working base:** a swallowed share of 0.5 (declared) or 0.25 (the sensitivity check). Over three years there
  were 13 starvation deaths in 10 seed-runs at 0.5 and 2 at 0.25 (`e-years-prereg.md` §7; plan, 7 October).
- **Who decides for animals under 8.** The rules today, and every result says so.
- **Whether to ask the Budongo field station for its sheets**, the only route found to wild "join or leave" labels.
- **A Taï grooming adapter** (separate, small, named) and whether its two targets, T-HUN-9 and T-END-12, count as
  compromised for it or are only flagged (`rw2-prereg.md` §10.1).
- **The viewer:** the default layout, life-size animals, and whether the close view opens at the watching speed.
- **Deploys:** still held. Also unanswered: the repository has no LICENSE file and states no terms of use.

## 7. Rules in one breath (details: `docs/staging/handoff-2026-10-05.md` §2 and AGENTS.md)

Field numbers are targets, never inputs; wild choice records may train a separate, named adapter, with a sealed part.
Pre-register and commit before any run of changed code; at most 3 iterations per stage. Seeds: 48 and 7 for
development; 48, 7, 21, 5, 11 for confirms; 4111 and 4222 are open for stage R11, 4333 and 4444 sealed; never the
reserved or retired seeds in AGENTS.md. Switches stay 0 by default; goldens and the field pin test must not move.
Benchmarks and model runs only from frozen detached checkouts; one model process at a time; no rented compute. At most
3 agents running simulations at once, 1 to 2 workers each, 1 above load 8. Never commit to `main`; never deploy
without the user's go. Never send the user's email or personal data to an external service; never use Unpaywall; stop
at any CAPTCHA. Never commit `data/raw`, the derived wild records, the sound files or secrets. Name every result as §1
says. Reports to the user: short, plain English, the answer first, explicit confidence levels.
