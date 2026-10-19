// Probe server for the app mode "Model decides for every adult" (docs/staging/app-model-drives.md) with no model: the
// probe server (scripts/vite.probe.config.mjs: no HMR, no watching, its own dependency cache) plus the app's R15 route
// (server/r15.ts createR15Handler and the real server/r15-worker.ts R15Worker, with every check it makes) served by
// stage R16's fake scorer (scripts/lib/r16-fake-scorer.mjs, which holds no model) over a dry adapter folder. The folder,
// the worker's lock and the receipts live in a scratch directory (MGOGO_FAKE_R15_DIR, default <tmp>/chimpbench-fake-r15),
// never in artifacts/ (artifacts/r14-chain.lock is the real chains' lock). Every status says `dry`, and the app says
// "dry run: a fake scorer, no model" on every readout. Never 5173 or 5182.
//   MGOGO_NO_MODEL=1 MGOGO_PROBE_PORT=5197 pnpm exec vite --config scripts/vite.fake-r15.config.ts
// then open http://127.0.0.1:5197/?drive=adults&burnin=1 and start the adapter in the model panel (M).
// MGOGO_FAKE_R15_ADAPTER=r16-agg-s11 serves another dry adapter (a saved world bound to the first must refuse it).
// MGOGO_FAKE_R15_MS=300 holds every answer that long, a stand-in for a model's time per call (0.25 to 0.4 s on this
// computer, AGENTS.md), so the queue and the achieved speed can be looked at as they will read with a model.
import { existsSync, mkdirSync, appendFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
// @ts-expect-error: a plain JavaScript config with no declaration file (scripts/vite.probe.config.mjs)
import probe from './vite.probe.config.mjs';
import { createR15Handler } from '../server/r15';
import { R15Worker } from '../server/r15-worker';
import { fakeR15Root } from './lib/fake-r15-root';

const scratch = resolve(process.env.MGOGO_FAKE_R15_DIR || resolve(tmpdir(), 'chimpbench-fake-r15')), root = resolve(scratch, 'dry', 'ft');
const fakeR15: Plugin = {
  name: 'fake-r15',
  configureServer(server) {
    // MGOGO_FAKE_R15_ADAPTER: another dry adapter name (r16-zero|agg-s7|11), to check that a saved world refuses it
    const adapter = fakeR15Root(root, process.env.MGOGO_FAKE_R15_ADAPTER || 'r16-agg-s7');
    // the worker's lock in this scratch directory (its "main checkout"): a lock left by a server stopped hard is this probe's own
    const lock = resolve(scratch, 'artifacts', 'r14-chain.lock');
    mkdirSync(resolve(scratch, 'artifacts'), { recursive: true });
    if (existsSync(lock)) unlinkSync(lock);
    // processes: the fake holds no model, so the one-model-at-a-time rule is not at stake here (the real route keeps it)
    const worker = new R15Worker({ trainingRoot: root, adapter, mainRoot: scratch, python: resolve(import.meta.dirname, 'lib', 'r16-fake-scorer.mjs') }, { processes: () => '' });
    const hold = Math.max(0, Number(process.env.MGOGO_FAKE_R15_MS ?? 0) || 0);
    const dry = { start: () => worker.start(), status: () => ({ ...worker.status(), dry: true }),
      score: async (b: Parameters<R15Worker['score']>[0]) => { if (hold) await new Promise(done => setTimeout(done, hold)); return worker.score(b); } };
    server.middlewares.use(createR15Handler(dry, row => appendFileSync(resolve(scratch, 'receipts.jsonl'), JSON.stringify(row) + '\n')));
    server.httpServer?.once('close', () => { void worker.close(); });
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void worker.close().finally(() => process.exit(0)); });
  },
};
export default { ...probe, plugins: [fakeR15] };
