# ChimpBench: handoff (Monday 12 October 2026, 10:15 New York time)

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
- **Names every result must carry** (plan, 10 October): "rules-taught model on a rules menu" for every adapter the
  rules taught (stages R4 to R5-gate, R9 to R11, R13) and for the app with one; "untuned model on a rules menu" for
  today's app; "copy of adapter X, audited, agreement A" for a stand-in. In every result inside the simulation so far
  the rules taught the model and wrote its menu.

## 2. Where things stand

### 2.1 What 10 to 12 October 2026 established

Fourteen stage branches were merged into `track-e` on 11 October; the viewer stages W6 to W10 and the stages R13 and
RW3 followed on 12 October. Each line names its document under `docs/staging/`. "The first adapter" is
`r4-rules-state`. Inside the simulation every figure for an adapter is a result of a **rules-taught model on a rules
menu**, and "the untuned model" is the **untuned model on a rules menu**. On the wild Taï record the menu is the
record's own, and each adapter is named by what taught it.

- **The review (10 October).** A read-only review found that no kernel had ever chosen a tree (the menu held exactly
  one feeding option on 99.6% of asks) and that 35% of the first adapter's training labels were acts the gate kept or
  that had arrived. Plan, "What the review changed"; reports in `/Volumes/Drive/chimpbench/shots/review-2026-10-10/`.
- **Who decides today.** With the first adapter and the gate on, the model picked the kind of act from a real choice
  for 34.8% to 63.0% of waking minutes, the target of 7.6% of acts and no ending. A trip could go to 50.8 trees on
  average and the menu shows 0.74. `r7-ledger.md`; the timing card: `r7-prereg.md`.
- **The wording test.** The first adapter picks the rules' decision on 0.609 of 954 held-out fresh draws with the
  packet it was trained on, and on 0.386 with neutral option labels (chance 0.186, the untuned model 0.286). More than
  half of what it learned over chance was read from the rules' own sentences. `r8-wording-numbers.md`; chance and
  the untuned model: `r4-numbers.md` and `r8-prereg.md` §10a.
- **Draw and hold, and the second training seed.** For the first adapter neither decode became the standard: a seeded
  draw brings its switching and trips toward the rules' and fails "does no harm" (nights in a nest, reserves), and a
  held draw is worse. The top pick stays, with a draw arm beside it in every engine test. Trained again, the first
  recipe is the same adapter offline and under the top pick, and differs under a draw. `r9-prereg.md` §10.6,
  `r9-numbers.md`, `r9-seed2-numbers.md`.
- **The first whole population on the real model.** Every animal aged 8 and over on the first adapter for nine
  simulated days, seed 48: viable (no death, 342 of 342 nights in a nest) and sedentary. Beside the same 38 animals on
  the rules it eats 1,487 against 1,597 kcal a day, walks 1.63 against 2.50 km and begins 2.4 trips to food against
  7.6. A level on one training seed, animals under 8 on the rules. `r10-prereg.md` §10.8, `r10-night-s48-paired.md`.
- **The honest retraining (stage R11; ended at 09:06 EDT on 12 October).** The small model was taught the rules' own
  odds on packet 5, neutral option labels, fresh draws only, in two trainings. Offline both learned the rules'
  distribution and trip rate (marks O1, O2 met) and missed O3 (the heat probe moves 0.02 the wrong way) and O4
  (carrying on 0.052 and 0.059 above the rules', limit 0.05). In the loop under the top pick, the registered decode,
  the outcome is S2 with lock-in (36.6 and 33.7 act changes a day against the rules' 53.9 ± 14.3). Under a draw (the
  second line; no outcome is named from it) the recipe is told from the rules on no timing row, fails no guard and
  keeps its nests (N1 met). The two trainings agree. By the ablation's rule the shorter packet is the one to serve,
  though one shorter-packet draw arm had two deaths. Ten animals, five days; nothing in it is about wild
  chimpanzees. `r11-prereg.md` §14, `r11-numbers.md` §4 and §4a, `r11-offline.md` §10.
- **Forked outcomes do not repeat.** Each option was forced on a copy of the world and the animal's body read later.
  The best kind of act of four replicates is the best of four others at 0.39 of decision points after 3 simulated
  hours and 0.34 after 6 (the registered line was 0.70, chance 0.23). `r7b-prereg.md`, `r7b-numbers.md`.
- **The scorecard can hardly show "closer".** Measured as distance outside the field band, the rules already sit
  inside the band on 11 of the 15 short-scorecard rows at the population unit and on 10 of 12 at ten animals. An
  engine could be shown closer than the rules on one row (T-SOC-6) at the population unit and on none at ten animals.
  A claim of "closer to wild chimpanzees" has to come from elsewhere. `r7-prereg.md` §13a, `r7b-prereg.md`.
- **The three downloaded deposits.** Taï grooming is a true wild choice record, and a narrow one: the first adult
  groomed among those in sight (557 records to learn from, 329 to tune on, 420 sealed). The Kanyawara coalitions are
  a small test, never a teacher; the Budongo scans a yardstick for party size only. On the Taï development part no
  kernel reaches the simple rule "the partner it groomed first most often before" (0.353; the untuned model 0.301,
  the Ngogo-taught adapter 0.319), so a small Taï adapter was registered (stage RW3, §2.2). `rw2-prereg.md` §8.4.
- **The viewer (W1 to W10).** W1 to W5 (11 October): adults on the ground are drawn walking at Real time, at the new
  Watch 4× (key 2) and at 1 min/s; no white-out facing a low sun; the young have eyes; a selected animal shows its
  reason; grooming pairs on the ground move. W6 to W10 (on `track-e` since 12 October): a decision shows on the body
  before the act, fruit shows in crowns and on the map, calls draw their reach and listeners turn, the map says what
  each party is doing, the body shows state and idles, pairs sit together in crowns. They became `track-e` after an
  independent check (1,402 tests passing) and a measurement on the graphics card: no cost outside the noise in the
  scenes measured, except about 1 ms in 29 in the widest daytime strategy view of the 160 m map. None of W6 to W10
  was seen with a model. Plan, "Stages W6 to W10"; AGENTS.md, "Open issues".

### 2.2 Running or queued (true at 10:15 EDT on 12 October 2026; this part goes stale within the hour)

**A model queue is running: stage RW3, then stage R13.** It was started at 09:30 EDT on 12 October in a detached
`screen` session named `modelqueue`; each stage runs from its own frozen checkout, one model process at a time, and a
failure of the first does not stop the second. No result of either has been read. **Read the `state` files first
(third item). If the queue's no longer says `running`, the rest of this paragraph is history: go to §5, task 1.**

- **Stage RW3** (`docs/staging/rw3-prereg.md`): two small adapters taught 557 wild Taï first-grooming-partner
  choices, then scored on the 329 development records; about an hour; frozen checkout `.claude/worktrees/bench-rw3`
  (c6024c7). Its chain started at 09:31. At 10:15 the check and the dry step had ended with exit code 0; the two
  reference scorings had read stage RW2's figures again (0.301 for the untuned model, 0.319 for the Ngogo-taught
  adapter), the check `rw3-prereg.md` §14.4 asks for before the trainings; the first training had run from 09:41 to
  10:03 (exit code 0, its manifest written) and the second, begun at 10:03, was in its first epoch (its model load
  ended at 10:12). No Taï-taught adapter had been scored. Steps: `00-check`, `01-dry`, `10-eval-base`,
  `11-eval-ngogo`, `20-train-7`, `21-train-11`, `30-eval-7`, `31-eval-11`, `40-report`.
- **Stage R13** (`docs/staging/r13-prereg.md`): every animal aged 8 and over on stage R11's first adapter with a draw
  from its odds (the arm `p5b-s7-draw-1`, which the registered rule names because N1 is met), on the fresh seed 3613:
  at most 20 simulated days in 9 hours, then the rules arm, the control arms and the report; frozen checkout
  `.claude/worktrees/bench-r13` (fcbd612). At 10:15 its chain had not begun. Steps: `00-check`, `01-dry`, `10-model`,
  `11-rules`, `12-controls`, `20-report`.
- **To check, only read.** `cat` the `state` and `status.log` of the queue (`bench-r13/artifacts/queue/`), of RW3
  (`bench-rw3/artifacts/rw3-chain/`; a step's output is `<step>.log` beside them) and, once it has begun, of R13
  (`bench-r13/artifacts/r13/chain/`). A state reads `running`, `failed` or `done`; a status log has a START and an
  END line per step, with its exit code. `screen -ls` shows the session.
- **Do not disturb it.** Do not attach to the session. Do not edit, commit or run anything in `bench-rw3`, `bench-r13`
  or `bench-r11` (a model step refuses a tree that is not clean, and R13 reads its decode rule from
  `bench-r11/artifacts/r11/tables/r11-numbers.md`). Start no Python from `/Volumes/Drive/chimpbench/decide-env`, no
  `pnpm dev` without `MGOGO_NO_MODEL=1`, no `scripts/gpu-probe.mjs`. Run no whole test suite and no heavy build while
  a scoring, loop or population step loads its model or asks: a warm-up failed that way on 12 October (AGENTS.md,
  "Gotchas"). The population run of stage R13 is such a step for up to nine hours.
- **Where the output goes** (none of it in git): `bench-rw3/artifacts/decide-ft/rw3/adapters` and
  `bench-rw3/artifacts/rw3` (`tables/rw3-numbers.md`); `bench-r13/artifacts/r13` (`tables/r13-numbers.md`).
- **If a stage failed.** Its `state` reads `failed` and the last line of its `status.log` names the step. RW3: wait
  until the queue has ended (R13 follows it either way); a finished step does nothing when run again, so launch
  `artifacts/rw3-chain/chain.sh` again in a detached `screen` session, and after a training cut short (weights
  without `manifest.json`) delete that adapter's folder first (`rw3-prereg.md` §13, §14.4). R13:
  `scripts/r13-run.sh chain` again with the exports of `…/queue/queue.sh`; it resumes the model arm from its newest
  checkpoint with what is left of its nine hours, and never past a stop check that ended the run (`r13-prereg.md`,
  "For the integrator").

**Stage W11 (viewer polish) is on `track-e` since 10:18 EDT on 12 October** (merge cafc203 of branch `w11-polish`,
head bc513ba: the builder's eight fixes and the second reader's four repairs; its whole suite read 1,412 tests, 1,411
pass, 1 skipped, on the branch): no jump across a crown, a pair picture that agrees with its tag, an eased cut-off
scratch, a lone animal no busier, a steady nest heading, nests under sleepers, the bough as a limb of its tree with
a leafy spray, a hand that meets the mouth. Its document is `docs/staging/w11-polish.md`. Not yet done on the merged head: the
whole suite, `pnpm build`, and frame time on the graphics card (all wait for the model queue to end).

## 3. Set-up on this computer

**The repo lives at `/Volumes/Drive/chimpbench/MGOGO`** (an external APFS drive; Apple M4, 16 GB), never under
`~/Desktop` or `~/Documents`. On this Mac iCloud Drive syncs those folders with "Optimise Mac Storage": within an hour
of the first clone macOS had evicted 14,230 of 18,704 files (the git pack among them) and every runner stopped.
**Never put the repo, a worktree or run outputs in an iCloud folder** (`ls -lO` shows `dataless` on evicted files).

1. **Node 22.22.3 exactly** (`.node-version`; prefix commands with `fnm exec --using=22.22.3 --`), pnpm 8.15.9, then
   `pnpm install`. Node 22.19.0 passes the tests and breaks every worker-pool script. The whole suite ran once on
   the merged code on 12 October, 10:02 to 10:07 EDT, four files at a time, on `docs-12oct` at a3bbbb6 (`track-e`
   57718b5 plus changes to three documents no test reads): **1,420 tests, 1,419 passing, none failing, 1 skipped**
   (the guide's scorecard check, whose data file is not on this computer). That is the viewer branch's 1,402 with
   the 8 of stage R13 and the 10 of stage RW3; it was the first run with the three merges of 12 October together.
   It ran beside a training of stage RW3 and held the 1-minute load at 8 to 10; the second training's model load,
   which began a minute into it, took nearly nine minutes against about three for the first (AGENTS.md, "Gotchas").
   Do not run one beside a scoring, loop or population step (§2.2), and never two at once. `tsc --noEmit`,
   `gen-params --check`, `decision-guide --check` and `pnpm build` pass on this branch's head (12 October).
   **To run the app with no model at all** (the way to look at it while the queue of §2.2 runs): `MGOGO_NO_MODEL=1 fnm
   exec --using=22.22.3 -- pnpm exec vite --host 127.0.0.1 --port 5181 --strictPort`, then open
   `http://127.0.0.1:5181/?provider=server` (another free port if that one is taken). `MGOGO_NO_MODEL=1` starts no
   Python worker. `?provider=server` keeps the page from downloading and loading the in-browser model, which is the
   default (about 872 MB, on the GPU when the browser has one); the rules then decide for every animal. Every other
   command is in AGENTS.md, "Commands".
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
     `MGOGO_FT_ADAPTERS`. `training/decide_ft/r4_py.sh <script>` sets the four variables and a default
     `MGOGO_FT_ROOT`; `parity.py` must print `PARITY OK`.
   - **Measured here:** 0.44 s per decision at 467 tokens for the untuned model, and the packet's length is the only
     speed lever (plan, "What the review changed"); 0.52 s a call over the population run; a worker holds 1.97 GB at
     rest and 3.16 GB at peak (6 October) and loads the model on its first batch, in 55 to 220 s (372 s once on
     12 October, on a loaded machine); a training runs at 0.6 s an example and 6.1 GiB (`r11-prereg.md` §12).
   - **Through the app** (this starts a model process: never while the queue of §2.2 or any other model step is
     running): the four variables, then `fnm exec --using=22.22.3 -- pnpm exec vite --host 127.0.0.1 --port
     5183 --strictPort` and `node scripts/verify-browser.mjs http://127.0.0.1:5183` (all 20 checks passed on
     6 October 2026). Everything else runs with `MGOGO_NO_MODEL=1`.
4. **Browser scripts** (`scripts/shot.mjs`, `verify-browser.mjs`, the probes) load Playwright through
   `scripts/lib/playwright.mjs` and launch `/Applications/Google Chrome.app`. Install it once outside the repo:
   `npm install --prefix ~/.cache/chimpbench/playwright playwright-core` (or set `MGOGO_PLAYWRIGHT`).
5. Use `/usr/bin/python3` for the integrator scripts and for `scripts/rw2/rw2_ingest.py` (run as `-I`).
6. **Disk:** `scripts/e-run.ts` and `scripts/r10-night.ts` refuse to start below 5 GB free.
7. **Worktrees:** `git worktree add -b <name> .claude/worktrees/<name> track-e`, then link `node_modules` and
   `data/raw` from the main checkout (AGENTS.md, "Gotchas"). A frozen run checkout is the same with `--detach
   <commit>`; `git status --short` must print nothing. The integrator's kit: `docs/staging/integrator-kit/`.

## 4. Branch map and frozen checkouts

**`main` is never committed to.** Since 6 October every push has moved it together with `track-e`, by fast-forward
to the same commit. The user's instruction of 6 October: "merge and push to main, and make sure these issues get
addresssed and we move faster parelalizing more work to get closer to the real results"
(`docs/staging/handoff-2026-10-05.md` §2.2, which reads it as: the integrator may merge finished, tested work into
`main` and push it). On 12 October the next push waits for the user's ask (§6). Deploys stay held.

| Branch or checkout | Head | State |
| --- | --- | --- |
| `main`, and `track-e` on the remote | 7f9ec5b | Equal. Pushed on 11 October 2026 at 14:59 EDT, at the user's request. Nothing has been pushed since: a push needs the user's ask (§6) |
| `track-e` (local, the integration branch; the main checkout is on it) | 57718b5 when this was written | **191 commits ahead of the remote, not pushed:** stages RW2 and R11 with R11's results, the viewer stages W6 to W10 (`integrate-t2`, fast-forwarded at 9be7d44), the merges of `r13-population` (15798c1) and `rw3-tai-adapter` (e0fd29e). Count again before trusting this: `git rev-list --count origin/track-e..track-e` |
| `docs-12oct` | 65d2494 | The shared documents brought up to date on 12 October; merged into `track-e` |
| `w11-polish` | bc513ba | Stage W11, merged into `track-e` on 12 October (cafc203) |
| Merged into `track-e`: `r7-card` to `r12-menu-design`, `rw2-wild-records`, `w1-travel-walk` to `w5-grooming`, `docs-refresh` (11 October); `integrate-t2` with `w6-decision-beat`, `w7-fruit`, `w10-calls-map`, `w8b-state-on-body` and `w9b-tree-pairs`, then `r13-population` and `rw3-tai-adapter` (12 October) | | Nothing on them is missing from `track-e`. The cut-off first builds `w8-state-on-body` and `w9-tree-pairs` are superseded |
| **Worktrees to keep for their `artifacts/`** (not in git): `r11-honest-retrain`, `r4-train`, `r4b-retrain`, `r5-pilot` | | `r11-honest-retrain`: stage R11's four adapters and its loop arms (`artifacts/decide-ft/r11`, `artifacts/r11/loop`); stage R13 loads `r11-p5b-s7` from there. `r4-train`: the adapters of stage R4, among them the Ngogo-taught `r4-field-groom` that stage RW3 scores. `r4b-retrain`: the adapters of stages R4b and R4c, and the first adapter as the population run loaded it. `r5-pilot`: the pilot's run folders |
| `bench-rw3` (frozen, c6024c7) | | **Running (§2.2). Do not touch.** Keep afterwards: the Taï training file, the adapters `rw3-tai-groom-s7` and `-s11` and their scores exist only there, and its `artifacts/rw2` holds derived wild records (never commit them) |
| `bench-r13` (frozen, fcbd612) | | **Queued (§2.2). Do not touch.** It also holds the queue's own folder, `artifacts/queue`. Keep afterwards: the population run's folders exist only there |
| `bench-r11` (frozen, 5b5a506) | | Its chain is done. Keep, and write nothing there while stage R13 runs: R13 reads `artifacts/r11/tables/r11-numbers.md`. The chain's logs are in `artifacts/r11-chain` |
| `bench-t1` (frozen, a11c45c) | | Keep. Not in git: `artifacts/r8/rerender` (the wording test), `artifacts/r9` (the decode arms and tables), `artifacts/decide-ft/r9` (the adapter `r4-rules-state-s2`), `artifacts/r10/night-s48` and `rules-s48` (the population run: receipts, contexts, checkpoints; kept for relabelling) |
| `bench-rw2` (frozen, 97be5bf) | | Keep. Not in git: `artifacts/rw2`, the derived wild records (no animal code, no date; never commit them) and the per-record model scores, which stage RW3's report was checked against |
| `bench-run`, `bench-y3`, `bench-e1v`, `bench-e1x`, `bench-e1x3`, `bench-wean`, `bench-r1b`, `ab-base` (frozen) | | Older reference runs (Track E, R1b) and a comparison base. Keep |
| `gfx-next` | 2abb1cb | The closed canopy, held by the user's decision; its grooming clip was merged as W5 |
| On the remote only: `site`, `ui-minimap`, `feat-realtime`, `main-wip-2026-10-05`, `c15-foraging`, `jev-free-arms`, `c17-fusion`, `c11-calibration`, `c10-communication`, `c13-rg`, `site-about`, `worktree-agent-*` | | Older or other sessions' work. **Do not touch without the user.** `site` is the hosted build; its deploy is held |

## 5. Next tasks, in order

1. **Read the model queue** when its state says `done` (or repair it, §2.2). RW3 first: the two reference scorings
   read 0.301 and 0.319 as they must (§2.2); read `artifacts/rw3/tables/rw3-numbers.md`, S0 before anything else,
   and not the step logs, which print each adapter's score as they run (`rw3-prereg.md` §14.3). R13:
   `artifacts/r13/tables/r13-numbers.md`, §0 first (the check of the instrument), then viability,
   the level, the field rows. Each stage's `publish` copies its tables to `docs/staging`: commit them on a branch and
   write the result into the registration and the plan in the registered words. For RW3 a statement counts only if
   both seeds meet it; R13 is a level of one training on one world seed.
2. **Stage W11** is merged (cafc203). Still owed on the merged head, while no model step runs: `pnpm test` and
   `pnpm build`, one look in the running app, and frame time on the graphics card in a close view on a crown with a pair.
3. **`docs-12oct` is merged** (documents only; the whole suite on its code is on record, §3). Before any push: the
   user's ask, a privacy check of the range (no personal data, no raw rows), and only the two branches by name (§4).
4. **Put §6 to the user**, the ten rulings first. Nothing of stage R12 is built before them.
5. **Then:** with no model, the heat probe read on the rules' own odds (until then stage R11's failed mark O3 is not
   a finding about the teacher: `r11-prereg.md` §14.2); with the model, the real token count and time of stage R12's
   two short calls (`r12-prereg.md`, "For the integrator", item 3). Whatever is trained or run after R13 and RW3 is
   registered first and depends on their results and on §6.
6. **Small repairs on record:** the guards of `scripts/r9-run.sh` and `scripts/r9-seed2.sh` look for a model process
   by the interpreter's path only, and those of `scripts/r11-run.sh` and earlier do not know `train_rw3` (AGENTS.md,
   "Gotchas"); `scripts/r13-run.sh report` does not ask for `rules-plain.json` (`r13-prereg.md` §13.5); the
   population script does not log items 3 to 8 of the ledger's list (`r7-ledger.md` §13). The older Track E list is
   in `docs/staging/handoff-2026-10-05.md` §6.2 and was not re-checked on 12 October.

## 6. Waiting on the user

Every decision open for the user on 12 October 2026, the most consequential first, each with where it is written
and what is recommended. Where no recommendation is on file it says so, and what is built stands until a ruling.

1. **The ten rulings on the menu** (first page of `docs/staging/r12-menu-table.md`, each with its recommendation;
   four smaller design questions follow in `r12-prereg.md`, whose fifth, on the seeds, is item 11 here): nothing of
   stage R12 is built before them.
2. **A push, deploys and a licence:** `track-e` is 191 commits ahead of the remote, so nothing committed since the
   push of 11 October at 14:59 EDT is on the remote (stage RW2 with its model scores, stage R11 and its result, the
   viewer stages W6 to W10, stages R13 and RW3). A push needs the user's ask (before one: the privacy check of §5;
   the whole suite is on record, §3); deploys stay held; the repository has no LICENSE file and states no terms of
   use. No recommendation on file.
3. **Where may a claim of "closer to wild chimpanzees" come from**, now that the short scorecard can show it on one
   row at most: the timing card's anchors, new held-out rows, wild choice records? No recommendation on file
   (`r7b-prereg.md` §8).
4. **May forked body outcomes ever be a label source?** Recommended: no, as designed (`r7b-prereg.md` §8). Two of
   the ten rulings wait on this answer (a drink when not thirsty; a nest or shelter whenever possible).
5. **Should a stay question ("still in this act later?") be trained?** Recommended: not now (`r7b-prereg.md` §8).
6. **Should the training label keep the rules' continuation bonus and finished penalty?** They are hand rules about
   staying, and the review of 10 October asked for labels without them; stage R11 kept them because stripping them
   changes the teacher. No recommendation on file (`r11-prereg.md`, the end).
7. **The working base:** a swallowed share of 0.5 (declared; 13 starvation deaths in 10 seed-runs over three years)
   or 0.25 (2 deaths)? Both are carried until ruled (`e-years-prereg.md` §7).
8. **Who decides for animals under 8?** The rules today, as every result says; the menu table proposes that it stays.
9. **What counts as "the model picks the kind of act for most of the day":** do minutes the gate holds count (35 to
   63% becomes 99.9%), and is "most" more than half for kind, target and ending each? No recommendation on file
   (`r7-ledger.md`, "Decisions that are the user's").
10. **After stage R13 is read, is one training on one world seed enough to act on**, or do a second training and seed
    come first? No recommendation on file: the stage calls its own result a level (`r13-prereg.md`, the end).
11. **The next fresh seeds:** recommended that stage R12's loop test takes the sealed 4333 and 4444 and that a new
    sealed pair is named now (`r11-prereg.md`, the end).
12. **The Taï record:** are T-HUN-9 and T-END-12 compromised for the Taï adapter (recommended, and applied until
    ruled) or only flagged, and may a packet show the bystander bonds (recommended: no)? `rw2-prereg.md` §10.1. If
    stage RW3 reads "beats the simple rule", one registered opening of the sealed part needs the user's go
    (`rw3-prereg.md` §5).
13. **Budongo:** ask the field station for its sheets, the only route found to wild "join or leave" labels, and make
    its party-size figures a registered yardstick? No recommendation on file (`rw2-prereg.md` §10.1).
14. **Track E:** should the simulation offer a side in a conflict to an unrelated adult female? It never does, and
    about 96% of the Kanyawara partnerships are between unrelated females. No recommendation on file
    (`rw2-prereg.md` §10.1).
15. **Packet 5's wording:** four questions on what counts as the animal's own experience, and whether results on
    earlier packets must say they listed the rules' first partner first. No recommendation on file; as built all four
    are shown (`r8-prereg.md` §9).
16. **The viewer, what opens by default:** the layout, life-size animals, the close view at the watching speed, the
    Food layer. As built: today's layout and sizes, 1 min/s, Food on.
17. **The viewer's stylizations** (the plan's "The user's" lines for stages W6 to W10; the ends of `w2-bloom-sky.md`
    to `w5-grooming.md`): each stands as built; the larger ones are how busy idle life is, whether public stress
    raises the coat, the first mover's look back, which calls draw arcs on the whole map, and the prop bough.
18. **Stage W11's choices** (`docs/staging/w11-polish.md`): recommended to keep
    each as built, and a small registered simulation stage so that no animal grooms a partner that has climbed down.
19. **The Ngogo fission paper and its supplement:** only the user can save them (`docs/datasets.md`, row 24).
20. **Smaller, when convenient** (no recommendation on file): 2 h 45 min of model time for stage R9's gate-off
    contrast; the population script's four stop thresholds; the cap of 20,000 redraws for labels of rare menus.

## 7. Rules in one breath (details: `docs/staging/handoff-2026-10-05.md` §2 and AGENTS.md)

Field numbers are targets, never inputs; wild choice records may train a separate, named adapter, with a sealed part.
Pre-register and commit before any run of changed code; at most 3 iterations per stage. Seeds: 48 and 7 for
development; 48, 7, 21, 5, 11 for confirms; 4111 and 4222 were opened by stage R11, 3613 is stage R13's, 4333 and
4444 are sealed; never the reserved or retired seeds in AGENTS.md. Switches stay 0 by default; goldens and the field
pin test must not move. Benchmarks and model runs only from frozen detached checkouts; one model process at a time,
and no whole test suite or heavy build beside a scoring, loop or population step; no rented compute. At most
3 agents running simulations at once, 1 to 2 workers each, 1 above load 8. Never commit to `main`; never deploy or
push without the user's go. Never send the user's email or personal data to an external service; never use
Unpaywall; stop at any CAPTCHA. Never commit `data/raw`, the derived wild records, the sound files or secrets. Name
every result as §1 says. Reports to the user: short, plain English, the answer first, explicit confidence levels.
