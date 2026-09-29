// Worker for scripts/field-scenario.ts (scripts/lib/pool.ts): runs one territory scenario per message.
import { parentPort } from 'node:worker_threads';
import { runScenario } from '../field-scenario';

parentPort!.on('message', (m: { index: number; job: Parameters<typeof runScenario>[0] }) => {
  try { parentPort!.postMessage({ index: m.index, result: runScenario(m.job) }); }
  catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
});
