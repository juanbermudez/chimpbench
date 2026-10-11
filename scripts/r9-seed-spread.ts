// Stage R9, the second training seed (docs/staging/r9-prereg.md §8): the offline readouts of two or more adapters on the
// same held-out draws of stage R4 (seed 21, 38 animals), side by side and paired, so the spread between two training
// seeds of one recipe can be read against the differences earlier rounds read between recipes. No model: it reads the
// score files scripts/r4-eval.sh and scripts/r9-seed2.sh write.
//
//   pnpm exec tsx scripts/r9-seed-spread.ts --dir <evaluation folder with test.jsonl and all.<provider>.jsonl> \
//     --providers r4-rules-state,r4-rules-state-s2,r4b-rules-state,r4c-rules-state,base [--md docs/staging/r9-seed2-numbers.md]
// The first provider is the reference every other is paired with. Intervals: 95% bootstraps over animals (2,000
// resamples, a fixed stream), the method of scripts/r4-report.ts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { clusterMean, type Stat } from './r4-report';

/** A held-out record of stage R4 (scripts/r4-evalset.ts), as far as this script reads it. */
export interface TestRow { id: string; chimpId: number; phase: string; draw: boolean; pick?: string; rulesIndex: number; options: { family: string }[] }
export interface Scored { row: TestRow; p: number[]; trip: number }
const argmax = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);
/** The rules' decision at a record: the label the adapters were taught (`pick`, "c{position}"), which at a draw is the option the rules' policy drew, not always their top score (`rulesIndex`). */
export const label = (r: TestRow): number => Number(r.pick!.slice(1));
function mulberry32(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The area under the curve of a score for telling taken from not taken (ties count half). NaN without both classes. */
export function auc(items: { score: number; taken: boolean }[]): number {
  const s = [...items].sort((a, b) => a.score - b.score), n1 = s.filter(x => x.taken).length, n0 = s.length - n1;
  if (!n1 || !n0) return NaN;
  let rank = 0;
  for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j].score === s[i].score) j++; const mid = (i + 1 + j) / 2; for (let k = i; k < j; k++) if (s[k].taken) rank += mid; i = j; }
  return (rank - n1 * (n1 + 1) / 2) / (n1 * n0);
}
/** A statistic of a set of rows, and of a paired difference between two providers, with a 95% bootstrap interval over animals. */
export function bootstrap(rows: { cluster: string }[], stat: (pick: number[]) => number, reps = 2000, seed = 20261010): Stat {
  const by = new Map<string, number[]>();
  rows.forEach((r, i) => { if (!by.has(r.cluster)) by.set(r.cluster, []); by.get(r.cluster)!.push(i); });
  const cl = [...by.values()], rnd = mulberry32(seed), boots: number[] = [];
  for (let b = 0; b < reps; b++) { const pick: number[] = []; for (let i = 0; i < cl.length; i++) for (const k of cl[Math.floor(rnd() * cl.length)]) pick.push(k); const v = stat(pick); if (Number.isFinite(v)) boots.push(v); }
  boots.sort((a, b) => a - b);
  return { n: rows.length, clusters: cl.length, value: stat(rows.map((_, i) => i)), lo: boots[Math.floor(0.025 * boots.length)], hi: boots[Math.ceil(0.975 * boots.length) - 1] };
}

/** The readouts of one provider on the shared rows. `draws`: every held-out draw; `trips`: day and dawn draws with a trip to food on the menu. */
export function readouts(draws: Scored[], trips: Scored[]) {
  const c = (rows: Scored[], v: (s: Scored) => number) => clusterMean(rows.map(s => ({ cluster: String(s.row.chimpId), v: v(s) })));
  return {
    agreement: c(draws, s => +(argmax(s.p) === label(s.row))), drawnAgreement: c(draws, s => s.p[label(s.row)] ?? 0),
    rulesTrip: c(trips, s => +(label(s.row) === s.trip)), tripProbability: c(trips, s => s.p[s.trip]), topTrip: c(trips, s => +(argmax(s.p) === s.trip)),
    tripAuc: bootstrap(trips.map(s => ({ cluster: String(s.row.chimpId) })), pick => auc(pick.map(i => ({ score: trips[i].p[trips[i].trip], taken: label(trips[i].row) === trips[i].trip }))), 2000),
  };
}

if (process.argv[1]?.endsWith('r9-seed-spread.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/decide-ft/r9/evalA')), wanted = arg('providers', 'r4-rules-state,r4-rules-state-s2,r4b-rules-state,r4c-rules-state,base').split(',');
  const lines = <T>(f: string): T[] => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T);
  const providers = wanted.filter(p => existsSync(join(dir, `all.${p}.jsonl`))), absent = wanted.filter(p => !providers.includes(p));
  if (providers[0] !== wanted[0]) throw new Error(`no score file for the reference ${wanted[0]} under ${dir}`);
  // A score file holds one `state` row per held-out record, in the records' order. They are joined by position: the R4
  // and untuned files name the second decision of a tick by the first one's id (21 records whose id ends in "~2"), so a
  // join by id would drop or mismatch those rows (fact-check of 10 October). The ids are checked up to that suffix.
  const all = lines<TestRow>(join(dir, 'test.jsonl')), stem = (id: string) => id.replace(/~\d+$/, '');
  const scores = new Map(providers.map(p => {
    const rows = lines<{ id: string; packet: string; probs: number[] }>(join(dir, `all.${p}.jsonl`)).filter(r => r.packet === 'state');
    if (rows.length !== all.length || rows.some((r, i) => stem(r.id) !== stem(all[i].id) || r.probs.length !== all[i].options.length)) throw new Error(`all.${p}.jsonl does not line up with test.jsonl (${rows.length} state rows against ${all.length} records)`);
    return [p, new Map(rows.map((r, i) => [all[i].id, r.probs]))];
  }));
  const test = all.filter(r => r.pick && r.draw), shared = test;
  const of = (p: string) => { const draws: Scored[] = shared.map(row => ({ row, p: scores.get(p)!.get(row.id)!, trip: row.options.findIndex(o => o.family === 'food-trip') })); return { draws, trips: draws.filter(s => s.trip >= 0 && (s.row.phase === 'day' || s.row.phase === 'dawn')) }; };
  const R = new Map(providers.map(p => { const x = of(p); return [p, { ...x, r: readouts(x.draws, x.trips) }]; }));
  const f3 = (v: number) => Number.isFinite(v) ? v.toFixed(3) : 'n/a', show = (s: Stat) => `${f3(s.value)} (${f3(s.lo)} to ${f3(s.hi)})`, sg = (v: number) => `${v > 0 ? '+' : ''}${f3(v)}`, showD = (s: Stat) => `${sg(s.value)} (${sg(s.lo)} to ${sg(s.hi)})${s.lo > 0 || s.hi < 0 ? ' **differs**' : ''}`;
  const ref = providers[0], A = R.get(ref)!;
  const md: string[] = ['# R9 second training seed: offline readouts side by side (generated by scripts/r9-seed-spread.ts; do not edit)', '',
    `Registration: \`docs/staging/r9-prereg.md\` §8. **Rules-taught model on a rules menu**, offline: the held-out draws of stage R4 (seed 21), the state-only packet. ${shared.length} labelled draws of ${new Set(shared.map(r => r.chimpId)).size} animals, joined to each score file by position; ${A.trips.length} of them are day or dawn draws with a trip to food on the menu. Intervals: 95% bootstraps over animals (2,000 resamples).${absent.length ? ` No score file yet for: ${absent.join(', ')}.` : ''}`, '',
    '| Adapter | picks the rules\' decision (top pick) | probability on the rules\' decision (what a draw would agree at) | trip menus: the rules take the trip | mean probability on the trip | top pick takes the trip | trip AUC |', '|---|---|---|---|---|---|---|'];
  for (const [p, x] of R) md.push(`| \`${p}\` | ${show(x.r.agreement)} | ${show(x.r.drawnAgreement)} | ${show(x.r.rulesTrip)} | ${show(x.r.tripProbability)} | ${show(x.r.topTrip)} | ${show(x.r.tripAuc)} |`);
  md.push('', `Paired with \`${ref}\` on the same rows (the other adapter minus it):`, '', '| Adapter | picks the rules\' decision | probability on the rules\' decision | mean probability on the trip | top pick takes the trip | trip AUC |', '|---|---|---|---|---|---|');
  for (const [p, x] of R) {
    if (p === ref) continue;
    const d = (rows: Scored[], other: Scored[], v: (s: Scored) => number) => clusterMean(rows.map((s, i) => ({ cluster: String(s.row.chimpId), v: v(other[i]) - v(s) })));
    const dAuc = bootstrap(A.trips.map(s => ({ cluster: String(s.row.chimpId) })), pick => auc(pick.map(i => ({ score: x.trips[i].p[x.trips[i].trip], taken: label(x.trips[i].row) === x.trips[i].trip }))) - auc(pick.map(i => ({ score: A.trips[i].p[A.trips[i].trip], taken: label(A.trips[i].row) === A.trips[i].trip }))));
    md.push(`| \`${p}\` | ${showD(d(A.draws, x.draws, s => +(argmax(s.p) === label(s.row))))} | ${showD(d(A.draws, x.draws, s => s.p[label(s.row)] ?? 0))} | ${showD(d(A.trips, x.trips, s => s.p[s.trip]))} | ${showD(d(A.trips, x.trips, s => +(argmax(s.p) === s.trip)))} | ${showD(dAuc)} |`);
  }
  md.push('', 'How to read it (prereg §8): the row of the second training seed against the rows of the other recipes. If the two seeds of one recipe differ on a readout by as much as two recipes did, that comparison between recipes was not resolved by a single run.');
  const text = md.join('\n') + '\n', out = arg('md', '');
  if (out) writeFileSync(resolve(out), text);
  console.log(text);
}
