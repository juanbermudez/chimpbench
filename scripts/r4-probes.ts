// Stage R4 state probes (docs/staging/r4-prereg.md §6.3): stage M2's probe design (scripts/em-probes.ts PROBES, the
// consistent rendering: the Track E field and its readouts move together) on the held-out contexts, rendered as the
// state-only packet. The same situation (observation and menu) with one physiological state set to three levels;
// everything else is the situation's own. The probes are never trained on.
//
//   pnpm exec tsx scripts/r4-probes.ts --in artifacts/decide-ft/r4/contexts/test.jsonl [--per 100] --out artifacts/decide-ft/r4/eval/probes.jsonl
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROBES } from './em-probes';
import type { Rec } from './em-sample';
import { buildStateOnlyQuestion, removedWordingsIn } from './lib/packet-state';
import { u01, type R4Rec } from './r4-contexts';

export interface ProbeRow { id: string; rec: string; seed: number; chimpId: number; probe: string; level: number; levelName: string; target: string[]; options: string[]; packets: { probe: unknown } }

/** Probe rows for the records that carry their context: per probe, up to `per` eligible situations in hash order, three levels each. */
export function probeRows(recs: R4Rec[], per: number): { rows: ProbeRow[]; counts: Record<string, number> } {
  const rows: ProbeRow[] = [], counts: Record<string, number> = {};
  for (const p of PROBES) {
    // em-probes reads the phase, the verdict, the hour, the option families and the context: the R4 record has them all
    const pool = recs.filter(r => r.context && p.eligible(r as unknown as Rec)).sort((a, b) => u01(`${p.id}:${a.id}`) - u01(`${p.id}:${b.id}`)).slice(0, per);
    counts[p.id] = pool.length;
    for (const r of pool) for (const [li, lv] of p.levels.entries()) {
      const ctx = structuredClone(r.context!);
      lv.consistent(ctx);
      const packet = buildStateOnlyQuestion(ctx), bad = removedWordingsIn(packet);
      if (bad.length) throw new Error(`probe packet holds a removed wording: ${bad.join(', ')}`);
      rows.push({ id: `${r.id}|${p.id}|${li}`, rec: r.id, seed: r.seed, chimpId: r.chimpId, probe: p.id, level: li, levelName: lv.name, target: p.target, options: r.options.map(o => o.family), packets: { probe: packet } });
    }
  }
  return { rows, counts };
}

if (process.argv[1]?.endsWith('r4-probes.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const recs = readFileSync(resolve(arg('in', 'artifacts/decide-ft/r4/contexts/test.jsonl')), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as R4Rec);
  const { rows, counts } = probeRows(recs, +arg('per', '100'));
  writeFileSync(resolve(arg('out', 'artifacts/decide-ft/r4/eval/probes.jsonl')), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(`probe situations ${JSON.stringify(counts)}; rows ${rows.length}`);
}
