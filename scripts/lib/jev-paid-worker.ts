// Worker for scripts/lib/pool.ts: runs one paid-arm world of the Jev decisive test (scripts/lib/jev-paid.ts) per message.
import { parentPort } from 'node:worker_threads';
import { runPaidWorld, WorkerBridge, type PaidJob } from './jev-paid';

parentPort!.on('message', (m: { index: number; job: PaidJob & { repo: string } }) => {
  runPaidWorld(m.job, async () => { const b = new WorkerBridge(m.job, m.job.repo); await b.start(); return b; })
    .then(result => parentPort!.postMessage({ index: m.index, result }))
    .catch(e => parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }));
});
