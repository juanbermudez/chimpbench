// Compare two field-metrics runs (--json outputs) target by target and write a markdown scorecard diff.
//
//   pnpm exec tsx scripts/field-compare.ts <before.json> <after.json> [out.md] [--title "…"] [--focus T-IGE-1,T-RNG-4,…] [--extra notes.md]
//
// Rows: every target present in either run, with value (pooled) and verdict before and after, and whether the
// verdict changed. --focus lists the stage's criteria first. --extra appends a markdown file (proof notes, bench).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { SeedValue } from '../src/field/metrics';
import { applyInstrumentBar, scoreTargets, summarize, type TargetFile } from '../src/field/targets';

interface Row { id: string; metric: string; role: string; band: string; verdict: string; encoded?: boolean; pooled: number | null; sd: number | null; perSeed: (number | null)[]; truth: number | null; note: string; flags: string[] }
interface Run { manifest: Record<string, unknown>; summary: Record<string, Record<string, number>>; rows: Row[]; s18: { key: string; label: string; field: string; observedMean: number | null; truthMean: number | null }[]; accuracy: Record<string, unknown> }

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [beforeFile, afterFile, outFile] = pos;
if (!beforeFile || !afterFile) { console.error('usage: field-compare.ts before.json after.json [out.md]'); process.exit(2); }
const A = JSON.parse(readFileSync(beforeFile, 'utf8')) as Run, B = JSON.parse(readFileSync(afterFile, 'utf8')) as Run;
// rescore both runs with today's scoring rules (encoded rows counted apart, instrument bar, scale and held-as-fail
// verdicts; C6 review) from their per-seed values, so the two summaries are comparable
const targetFile = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as TargetFile;
for (const r of [A, B] as (Run & { values?: Record<string, SeedValue[]> })[]) {
  if (!r.values) continue;
  const rows = scoreTargets(targetFile, r.values, r.manifest.profile as string);
  const acc = r.accuracy as { patrol?: { precision: number; recall: number }; patrolMales?: { precision: number; recall: number } };
  if (acc?.patrol) applyInstrumentBar(rows, { focal: acc.patrol, males: acc.patrolMales ?? { precision: NaN, recall: NaN } });
  r.rows = rows as unknown as Row[]; r.summary = summarize(rows);
}
const focus = flag('focus', '').split(',').filter(Boolean);
const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(d));
const byId = (r: Run) => new Map(r.rows.map(x => [x.id, x]));
const a = byId(A), b = byId(B);
const ids = [...new Set([...a.keys(), ...b.keys()])];
const order = (id: string) => (focus.includes(id) ? focus.indexOf(id) : 1000);
const line = (id: string) => {
  const x = a.get(id), y = b.get(id), r = y ?? x!;
  const changed = x && y && x.verdict !== y.verdict ? (y.verdict === 'pass' ? '▲' : x.verdict === 'pass' ? '▼' : '•') : '';
  return `| ${id}${r.encoded ? ' (enc.)' : ''}${r.flags?.length ? ` *${r.flags.join(', ')}*` : ''} | ${r.metric} | ${r.band} | ${f(x?.pooled)} | ${x?.verdict ?? '—'} | ${f(y?.pooled)}${y?.sd !== null && y?.sd !== undefined ? ` ± ${f(y.sd)}` : ''} | ${f(y?.truth)} | **${y?.verdict ?? '—'}** ${changed} | ${(y?.note ?? '').replace(/\|/g, '/')} |`;
};
const o: string[] = [];
o.push(`# ${flag('title', 'Field-observer scorecard comparison')}`, '');
o.push(`Before: \`${beforeFile}\` — profile ${A.manifest.profile}, ${A.manifest.days} days × seeds ${(A.manifest.seeds as number[]).join(', ')}, ${A.manifest.date}.`);
o.push(`After: \`${afterFile}\` — profile ${B.manifest.profile}, ${B.manifest.days} days × seeds ${(B.manifest.seeds as number[]).join(', ')}, ${B.manifest.date}${B.manifest.phenology ? `, phenology ${B.manifest.phenology}` : ''}.`);
o.push(`Protocol hash: before ${A.manifest.protocolHash}, after ${B.manifest.protocolHash} (frozen: ${B.manifest.frozenProtocolHash ?? 'none'}).`, '');
o.push('| Role | Before: pass / tuned pass / fail / inconclusive / insufficient / n/a / scale / compromised / instrument below bar / encoded | After |', '| --- | --- | --- |');
for (const role of ['fitted', 'held-out']) {
  const s = (r: Run) => { const q = r.summary[role]; return `${q.pass} / ${q.tuned ?? 0} / ${q.fail} / ${q.inconclusive} / ${q.insufficient} / ${q['n/a']} / ${q.scale ?? 0} / ${q.compromised ?? 0} / ${q.instrument ?? 0} / ${q.encoded ?? 0}`; };
  o.push(`| ${role} | ${s(A)} | ${s(B)} |`);
}
o.push('', '▲ became a pass, ▼ lost a pass, • other verdict change. Values are pooled over seeds; truth is the omniscient value where defined.', '');
const table = (list: string[]) => { o.push('| Target | Metric | Band | Before | Verdict | After (± sd over seeds) | Truth | Verdict | Note |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'); for (const id of list) o.push(line(id)); o.push(''); };
if (focus.length) { o.push('## Stage criteria', ''); table(focus.filter(id => a.has(id) || b.has(id))); }
for (const role of ['fitted', 'held-out']) {
  o.push(`## ${role === 'fitted' ? 'Fitted' : 'Held-out'} targets`, '');
  table(ids.filter(id => (b.get(id) ?? a.get(id))!.role === role && !focus.includes(id)).sort((p, q) => order(p) - order(q) || (p < q ? -1 : 1)));
}
o.push('## docs/simulation.md §18 metrics through the observer', '', '| Metric | Before | After | After truth | Field / target |', '| --- | --- | --- | --- | --- |');
const s18a = new Map(A.s18.map(x => [x.key, x]));
for (const y of B.s18) o.push(`| ${y.label} | ${f(s18a.get(y.key)?.observedMean)} | ${f(y.observedMean)} | ${f(y.truthMean)} | ${y.field} |`);
o.push('');
const acc = B.accuracy as { patrol?: { precision: number; recall: number; classified: number; truthEpisodes: number }; encounter?: { recall: number; precision: number; detection: number; followedTruth: number; classified: number; truthEpisodes: number }; hunt?: { detection: number; detected: number; truth: number }; activityMaxAbsDiff?: number[] };
o.push('## Instruments against truth (after)', '');
if (acc.activityMaxAbsDiff) o.push(`- Activity shares, 1-min points vs per-tick truth: max |Δ| ${acc.activityMaxAbsDiff.map(x => x.toFixed(4)).join(', ')}.`);
if (acc.patrol) o.push(`- Patrol classifier: precision ${f(acc.patrol.precision)}, recall ${f(acc.patrol.recall)} (${acc.patrol.classified} classified, ${acc.patrol.truthEpisodes} truth episodes).`);
if (acc.encounter) o.push(`- Encounter classifier (focal teams): recall ${f(acc.encounter.recall)} of ${acc.encounter.followedTruth} truth episodes involving a followed party, precision ${f(acc.encounter.precision)} of ${acc.encounter.classified} classified, detection ${f(acc.encounter.detection)} of ${acc.encounter.truthEpisodes} truth episodes.`);
if (acc.hunt) o.push(`- Hunt classifier: ${acc.hunt.detected} of ${acc.hunt.truth} hunts detected (${f(acc.hunt.detection)}).`);
o.push('');
const extra = flag('extra', '');
if (extra && existsSync(extra)) o.push(readFileSync(extra, 'utf8'));
const text = o.join('\n') + '\n';
if (outFile) writeFileSync(outFile, text); else console.log(text);
