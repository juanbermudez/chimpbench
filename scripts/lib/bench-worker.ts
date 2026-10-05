// Worker for scripts/lib/pool.ts: runs one seed of e-bench's single pass (scripts/lib/bench-run.ts) and posts its part,
// already in the lossless JSON a part file holds (scripts/lib/lossless-json.ts), so a multi-seed run pools exactly what
// e-bench --merge pools from files. Progress goes to stderr (pool messages are results).
import { parentPort } from 'node:worker_threads';
import { runBenchSeed, type BenchJob } from './bench-run';
import { encodeLossless } from './lossless-json';

parentPort!.on('message', (m: { index: number; job: BenchJob }) => {
  try {
    const r = runBenchSeed(m.job, msg => console.error(msg));
    parentPort!.postMessage({ index: m.index, result: r.kind === 'part' ? { kind: 'part', part: encodeLossless(r.part) } : r });
  } catch (e) {
    parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.name === 'ResumeRefused' ? 'ResumeRefused: ' : ''}${e.message}\n${e.stack}` : String(e) });
  }
});
