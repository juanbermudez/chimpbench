// Worker for scripts/lib/pool.ts: runs one paid-arm world of the Jev decisive test (scripts/lib/jev-paid.ts) per message.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parentPort } from 'node:worker_threads';
import { runPaidWorld, WorkerBridge, type PaidJob } from './jev-paid';

// Each finished world is written to its result file at once (atomically), so an interrupted run resumes without
// repeating it (scripts/jev-test.ts --resume).
parentPort!.on('message', (m: { index: number; job: PaidJob & { repo: string; resultFile?: string } }) => {
  runPaidWorld(m.job, async () => { const b = new WorkerBridge(m.job, m.job.repo); await b.start(); return b; })
    .then(result => {
      if (m.job.resultFile) { mkdirSync(dirname(m.job.resultFile), { recursive: true }); writeFileSync(m.job.resultFile + '.tmp', JSON.stringify(result)); renameSync(m.job.resultFile + '.tmp', m.job.resultFile); }
      parentPort!.postMessage({ index: m.index, result });
    })
    .catch(e => parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }));
});
