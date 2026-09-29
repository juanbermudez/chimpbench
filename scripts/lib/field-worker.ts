// Worker for scripts/lib/pool.ts: runs one observed field job per message (src/field/run.ts) and posts the result.
import { parentPort } from 'node:worker_threads';
import { runFieldJob, type FieldJob } from '../../src/field/run';
import { lifeCourseRun } from '../../src/field/lifecourse';

type Msg = { index: number; job: FieldJob | { life: true; seed: number; years: number } };

parentPort!.on('message', (m: Msg) => {
  try {
    const result = 'life' in m.job ? lifeCourseRun(m.job.seed, m.job.years) : runFieldJob(m.job);
    parentPort!.postMessage({ index: m.index, result });
  } catch (e) {
    parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) });
  }
});
