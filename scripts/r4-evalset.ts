// Stage R4 (docs/staging/r4-prereg.md §6): the files the offline evaluation scores, from the held-out contexts (seed 21).
//   test.jsonl     the assembled test split, a quarter of it also with its options shuffled (`statePerm`, `permOrder`)
//   removed.jsonl  the same decision points with the rules' pick withheld (the sampler's --no-rules-pick parts)
//   probes.jsonl   stage M2's state probes on the held-out records that carry their context (every sampled record of
//                  the test worlds, not only those taken into the test split)
//   all.jsonl      every packet above as {id, packets} rows for training/decide_ft/em_score.py (one model load per provider)
//
//   pnpm exec tsx scripts/r4-evalset.ts [--contexts artifacts/decide-ft/r4/contexts] [--out artifacts/decide-ft/r4/eval] [--per 100]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LocalPacket } from '../server/decide';
import { TEST_SEEDS, u01, type R4Rec } from './r4-contexts';
import { probeRows } from './r4-probes';

/** Share of the test split also scored with its options shuffled. */
export const PERM_SHARE = 0.25;
/** A packet with its option texts dealt to the aliases in `order` (new position j shows the old option order[j]). */
export function shuffledOptions(packet: LocalPacket, id: string): { packet: LocalPacket; order: number[] } {
  const texts = Object.values(packet.questions.action.criteria), base = texts.map((_, i) => i);
  let order = base, n = 0;
  while (texts.length > 1 && order.every((v, i) => v === i)) order = base.map(i => ({ i, k: u01(`r4-perm:${id}:${n}:${i}`) })).sort((a, b) => a.k - b.k).map(x => x.i), n++;
  return { packet: { ...packet, questions: { action: { ...packet.questions.action, criteria: Object.fromEntries(order.map((old, j) => [`c${j}`, texts[old]])) } } }, order };
}

if (process.argv[1]?.endsWith('r4-evalset.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const contexts = resolve(arg('contexts', 'artifacts/decide-ft/r4/contexts')), out = resolve(arg('out', 'artifacts/decide-ft/r4/eval')), parts = `${contexts}/parts`;
  const read = (f: string) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as R4Rec);
  mkdirSync(out, { recursive: true });
  const all: { id: string; packets: Record<string, unknown> }[] = [];
  const test = read(`${contexts}/test.jsonl`).map(r => {
    const { context: _c, ...row } = r;   // the context is only needed for the probes
    if (u01(`r4-perm-pick:${r.id}`) >= PERM_SHARE) return row;
    const s = shuffledOptions(r.packet, r.id);
    return { ...row, packets: { ...row.packets, statePerm: s.packet }, permOrder: s.order };
  });
  writeFileSync(`${out}/test.jsonl`, test.map(r => JSON.stringify(r)).join('\n') + '\n');
  for (const r of test) all.push({ id: r.id, packets: r.packets });
  const ids = new Set(test.map(r => r.id)), files = readdirSync(parts).filter(f => f.endsWith('.jsonl') && TEST_SEEDS.some(s => f.startsWith(`s${s}-`))).sort();
  const removed = files.filter(f => f.includes('-removed')).flatMap(f => read(`${parts}/${f}`)).filter(r => ids.has(r.id) && r.draw).map(({ context: _c, ...r }) => r);
  writeFileSync(`${out}/removed.jsonl`, removed.map(r => JSON.stringify(r)).join('\n') + (removed.length ? '\n' : ''));
  for (const r of removed) all.push({ id: `rm|${r.id}`, packets: r.packets });
  const pool = files.filter(f => !f.includes('-removed')).flatMap(f => read(`${parts}/${f}`)), probes = probeRows(pool, +arg('per', '100'));
  writeFileSync(`${out}/probes.jsonl`, probes.rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  for (const r of probes.rows) all.push({ id: r.id, packets: r.packets });
  writeFileSync(`${out}/all.jsonl`, all.map(r => JSON.stringify(r)).join('\n') + '\n');
  const count = (name: string) => all.filter(r => r.packets[name]).length;
  console.log(JSON.stringify({ test: test.length, shuffled: count('statePerm'), removed: removed.length, probeSituations: probes.counts, probeRows: probes.rows.length,
    packets: { state: count('state'), v4: count('v4'), statePerm: count('statePerm'), removed: count('removed'), probe: count('probe') } }));
}
