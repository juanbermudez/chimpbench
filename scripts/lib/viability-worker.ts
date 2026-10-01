// Worker for scripts/lib/pool.ts: replays one world without the observer and posts its viability (scripts/lib/viability.ts).
import { parentPort } from 'node:worker_threads';
import { runViability, type ViabilityJob } from './viability';

parentPort!.on('message', (m: { index: number; job: ViabilityJob }) => {
  try { parentPort!.postMessage({ index: m.index, result: runViability(m.job) }); }
  catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
});
