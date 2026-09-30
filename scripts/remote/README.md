# Remote run bundle

Runs the heavy simulation compute (combined proof, C9 proof, C11) on a many-core Linux machine and brings the outputs
home. Nothing here uploads, creates accounts or contacts a remote host: moving the bundle and the results is the user's
call and the user's action.

## What leaves this machine, and what never does

`make-bundle.sh` packs the committed tree (`git archive HEAD`) plus `BUNDLE_COMMIT`. It excludes:

- `data/raw/`: downloaded field datasets, including raw chimpanzee coordinates (location-sensitive). **No remote step
  reads them.** Only the comparison and guide steps do, and they stay local (below).
- `public/audio/`: derived from the user's Epidemic Sound files; not for redistribution.
- `artifacts/`, `node_modules/`, `training/`.

The script refuses a dirty tree, checks that `expected-hashes.json` still matches, and fails if an excluded path slips in.

## Setup (fresh Ubuntu 22.04 or 24.04)

```sh
# Node 22+ (e.g. NodeSource), then:
tar -xzf mgogo-<commit>.tar.gz -C mgogo && cd mgogo
scripts/remote/setup.sh          # pnpm install --frozen-lockfile, then the determinism check
scripts/remote/run-all.sh --smoke --out ~/run     # ~5 min of plumbing at 6+ vCPUs; marks nothing done
scripts/remote/run-all.sh --out ~/run             # workers default to $(nproc)
```

Run it under `tmux` or `nohup`. `run-all.sh` runs, in order: `verify` (determinism) → `proof` (combined proof, simulation
steps only, independent steps in parallel within the worker and memory budget) → `c9` (C9 proof, 40 years, seeds
5303–5707) → `c11` (runs `scripts/c11-run.ts` once C11 is built; until then the stage stays open). Finished stages are
listed in `<out>/stages.done` and skipped on re-run; inside the proof, finished steps are skipped too (`--resume`).
`--from <stage>` restarts at a stage. `<out>/manifest.json` holds the commit and protocol hash; a folder never mixes two
builds (the scripts refuse).

The combined proof refuses to start until its preconditions hold (C8 merged, every ablation set declared, protocol hash
equal to the frozen one): `pnpm exec tsx scripts/proof.ts --list` shows them. Make the bundle after that point.

## Determinism check

`verify.ts` recomputes four hashes and compares them with `expected-hashes.json`, recorded on this machine: the compressed
golden world (seed 48, 2 days, also checked against `tests/fixtures/golden-world.json`), a field world (seed 7, 3 days),
a C9 fission world (compressed, seed 21, 2 days) and the observer's records (seed 48, 3 days). Any mismatch stops the
run. After an intended change: `pnpm exec tsx scripts/remote/verify.ts --record`, commit, re-bundle.

## Back home: the local steps (read `data/raw/`)

Copy `<out>` back, then from a checkout at the manifest's commit (`git worktree add ../MGOGO-proof <commit>`, with the
`data/raw` and `node_modules` symlinks):

```sh
pnpm exec tsx scripts/proof.ts --run --plan full --workers 6 --out <copy>/proof \
  --only compare-ranging,compare-movement,compare-gombe-paths,compare-patrols,guide-data
```

About 10 minutes. The raw files they read:

| Step | `data/raw/` inputs |
| --- | --- |
| compare-ranging (C12, Ngogo) | `zenodo-18603419` (Ngogo GPS) |
| compare-movement (C12, Taï) | `plos-pbio-3002350` S015–S017, `figshare-rsos200577` si_002 |
| compare-gombe-paths (held out) | `dryad-jg05d` ChimpanzeeRanges.xlsx |
| compare-patrols | `dryad-kk33f`, `dryad-z8w9ghxdb`, `dryad-sf7m0cgkg`, `dryad-gf1vhhmk8` (phenology CSV), `plos-pbio-3002350` S017 |
| guide-data | `dryad-gf1vhhmk8` CSV, `dryad-jg05d`, `dryad-kk33f`, `dryad-z8w9ghxdb`, `dryad-sf7m0cgkg` |

## Sizing

Per-job costs measured on an M3 Pro performance core; cloud vCPUs are usually 1.3–1.6× slower per job (the ranges
below include that). Parallelism is per job (`scripts/lib/pool.ts`, worker threads, never more workers than jobs), so
each stage is bounded by its longest job once workers ≥ jobs.

| Stage | Jobs | Longest job | 32 vCPUs | 64 vCPUs | 6 workers (M3) |
| --- | --- | --- | --- | --- | --- |
| Combined proof (sim steps) | ~66 | C8, 40 years (~2 h) | 2.5–3.5 h | 2.5–3.5 h | 8.5–14 h |
| C9 proof | 15 | 40 years, large community | 5–6.5 h | 5–6.5 h | ~12 h |
| C11 (≈ 400 worker-hours) | many | 10 years | 18–21 h | 10–12 h | ~67 h |
| **Total** | | | **~26–31 h** | **~18–22 h** | **~88–93 h** |

- **Memory:** a 10-year observer run peaks near 2 GB (≈ 0.38 MB per simulated day plus ~0.25 GB); 40-year demography jobs
  are budgeted at 3 GB. Give ≥ 2 GB per vCPU (4 GB is comfortable). The proof runner caps concurrency at 80% of RAM
  (`--mem-gb`), and `run-all.sh` raises V8's per-thread heap cap to 8 GB.
- **Disk:** under 10 GB for all outputs; the bundle is a few MB.
- More than ~66 vCPUs does not help the proof or C9; only C11 scales further.
