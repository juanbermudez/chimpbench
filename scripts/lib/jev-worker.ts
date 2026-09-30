// Worker for scripts/lib/pool.ts: runs one seed of the Jev decisive test's free arms (scripts/lib/jev-arm.ts) per message.
import { parentPort } from 'node:worker_threads';
import { runSeed, type SeedJob } from './jev-arm';

parentPort!.on('message', (m: { index: number; job: SeedJob }) => {
  try { parentPort!.postMessage({ index: m.index, result: runSeed(m.job) }); }
  catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
});
