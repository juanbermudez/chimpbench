// Prescription ledger (Track E, stage E0; IMPLEMENTATION_PLAN.md): classes every entry of data/params.json as input,
// design or outcome-encoding (rules and judgement calls: scripts/lib/prescriptions.ts), lints src/sim for prescriptions
// outside the registry (hour-of-day literals, dice against fixed numbers, time-of-day menus), and cross-references the
// targets flagged `encoded` in data/targets.json to the parameters that encode them.
//
//   pnpm exec tsx scripts/prescription-ledger.ts                       # writes artifacts/validation/e/e0-ledger.{md,json}
//   pnpm exec tsx scripts/prescription-ledger.ts --out dir/name        # dir/name.md and dir/name.json
//   pnpm exec tsx scripts/prescription-ledger.ts --params '{"id":v}'   # the count with registry overrides (field profile)
//   pnpm exec tsx scripts/prescription-ledger.ts --count               # print the headline count only; writes nothing
//
// Headline "prescription count" = outcome-encoding registry entries in use under the FIELD profile (non-zero, generated,
// not switched out) + counted literals outside the registry. scripts/e-bench.ts prints the same number.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveParams, type Overrides } from '../src/sim/params';
import { ACTIVE_WHEN, ENCODED_BY, classify, countPrescriptions, isActive, lintSource, type Classified, type Literal, type PrescriptionCount, type RegistryEntry } from './lib/prescriptions';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIM = join(ROOT, 'src/sim');

export function loadEntries(): RegistryEntry[] { return (JSON.parse(readFileSync(join(ROOT, 'data/params.json'), 'utf8')) as { params: RegistryEntry[] }).params; }
/** The resolved field-profile parameters with overrides (planned entries are absent: they are not generated). */
export function fieldParams(overrides: Overrides = {}): Record<string, number> { return resolveParams('field', overrides) as unknown as Record<string, number>; }
/** Lints every src/sim/*.ts file (generated files excluded). */
export function lintSim(P: Record<string, number> = {}): Literal[] {
  return readdirSync(SIM).filter(f => f.endsWith('.ts')).sort().flatMap(f => lintSource(f, readFileSync(join(SIM, f), 'utf8'), P));
}
/** The headline count under the field profile and these overrides. */
export function prescriptionCount(overrides: Overrides = {}): PrescriptionCount {
  const P = fieldParams(overrides);
  return countPrescriptions(loadEntries(), P, lintSim(P));
}

interface EncodedRef { target: string; metric: string; role: string; params: { id: string; cls: string; active: boolean }[]; literal: string | null; how: string }

export function buildLedger(overrides: Overrides = {}) {
  const entries = loadEntries(), P = fieldParams(overrides), literals = lintSim(P);
  const rows = entries.map(e => {
    const c = classify(e), field = e.profiles?.field ?? e.value;
    return { ...c, value: e.value, fieldValue: P[e.id] ?? field, units: e.units, evidence: e.evidence, calibrate: e.calibrate, file: e.file ?? null, active: isActive(c, P), activeNote: ACTIVE_WHEN[e.id]?.why ?? null };
  });
  const count = countPrescriptions(entries, P, literals);
  const classes = { input: 0, design: 0, 'outcome-encoding': 0 } as Record<Classified['cls'], number>;
  for (const r of rows) classes[r.cls]++;
  const targets = (JSON.parse(readFileSync(join(ROOT, 'data/targets.json'), 'utf8')) as { targets: { id: string; metric: string; role: string; encoded: boolean }[] }).targets;
  const byId = new Map(rows.map(r => [r.id, r]));
  const find = (l: { file: string; has: string }) => {
    const i = readFileSync(join(SIM, l.file), 'utf8').split('\n').findIndex(s => s.includes(l.has));
    return i >= 0 ? `src/sim/${l.file}:${i + 1}` : `src/sim/${l.file} (line not found: "${l.has}")`;
  };
  const encoded: EncodedRef[] = targets.filter(t => t.encoded).map(t => {
    const e = ENCODED_BY[t.id];
    return { target: t.id, metric: t.metric, role: t.role, how: e?.how ?? 'no cross-reference recorded',
      params: (e?.params ?? []).map(id => ({ id, cls: byId.get(id)?.cls ?? 'unknown id', active: byId.get(id)?.active ?? false })), literal: e?.literal ? find(e.literal) : null };
  });
  // the reverse view: target rows named by outcome-encoding entries
  const targetIds = new Set(targets.map(t => t.id));
  const unknownTargets = [...new Set(rows.flatMap(r => r.encodes).filter(t => !targetIds.has(t)))];
  return { date: new Date().toISOString(), profile: 'field', overrides, entries: rows.length, classes, count, rows, literals, encoded, unknownTargets };
}

const fmt = (v: number) => Number.isInteger(v) ? String(v) : String(+v.toPrecision(4));

export function ledgerMarkdown(L: ReturnType<typeof buildLedger>): string {
  const o: string[] = [];
  const oe = L.rows.filter(r => r.cls === 'outcome-encoding');
  o.push('# E0 prescription ledger', '');
  o.push(`Generated ${L.date} by \`scripts/prescription-ledger.ts\` (rules and judgement calls: \`scripts/lib/prescriptions.ts\`). Field profile${Object.keys(L.overrides).length ? `, overrides ${JSON.stringify(L.overrides)}` : ', registry defaults'}.`, '');
  o.push(`**Prescription count: ${L.count.total}** = ${L.count.registryActive} outcome-encoding registry entries in use + ${L.count.literals} literals outside the registry.`, '');
  o.push('| Class | Entries | Meaning |', '| --- | --- | --- |');
  o.push(`| input | ${L.classes.input} | physiology, physics, ecology or life history measured apart from the behaviour |`);
  o.push(`| design | ${L.classes.design} | weights, thresholds, distances, durations and switches that state no outcome |`);
  o.push(`| outcome-encoding | ${L.classes['outcome-encoding']} | clock hours, hazards, probabilities, rates, quotas, bonuses; values fitted to a target row or copied from a field rate of the behaviour (${L.count.registryActive} in use, ${L.count.inactive.length} zero, planned or switched out) |`);
  o.push(`| all | ${L.entries} | |`, '');
  const kinds: Record<string, number> = {};
  for (const r of oe.filter(r => r.active)) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  o.push(`Outcome-encoding entries in use, by kind: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}.`, '');
  o.push('Limits. The classes follow written rules, so they are reproducible, not certain: entries marked † are judgement calls. Bout lengths (`bout*Min`/`Max`) are classed design (re-decision cadence) except the two tied to clock windows. Score literals in `src/sim` (weights such as the rest score\'s 0.12) and gap literals (`time - x.lastCall > 1.5`) are outside this lint, which covers hour-of-day comparisons, dice against fixed numbers and the time-of-day menus only.', '');

  o.push('## Outcome-encoding registry entries', '');
  o.push('| Id | Group | Field value | Units | Kind | In use | Encodes | Rule | Why |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of oe) o.push(`| \`${r.id}\`${r.borderline ? ' †' : ''} | ${r.group} | ${fmt(r.fieldValue)} | ${r.units} | ${r.kind} | ${r.active ? 'yes' : r.planned ? 'no (planned)' : r.fieldValue === 0 ? 'no (0)' : `no (${r.activeNote ?? 'switched out'})`} | ${r.encodes.join(', ') || '—'} | ${r.rule} | ${r.reason} |`);
  o.push('');

  o.push('## Prescriptions outside the registry (src/sim literals)', '');
  o.push('| Where | Kind | Values | Counted | Why | Code |', '| --- | --- | --- | --- | --- | --- |');
  for (const l of L.literals) o.push(`| src/sim/${l.file}:${l.line} | ${l.kind} | ${l.values.join(', ') || '—'} | ${l.counted ? '**yes**' : 'no'} | ${l.why} | \`${l.text.replace(/\|/g, '\\|').slice(0, 110)}\` |`);
  o.push('');

  o.push('## Encoded targets and what encodes them', '');
  o.push('| Target | Role | Metric | Parameters (class; in use) | Outside the registry | How |', '| --- | --- | --- | --- | --- | --- |');
  for (const e of L.encoded) o.push(`| ${e.target} | ${e.role} | ${e.metric} | ${e.params.map(p => `\`${p.id}\` (${p.cls}${p.active ? '' : '; not in use'})`).join(', ') || '—'} | ${e.literal ?? '—'} | ${e.how} |`);
  o.push('');
  const fitted = new Map<string, string[]>();
  for (const r of oe) for (const t of r.encodes) (fitted.get(t) ?? fitted.set(t, []).get(t)!).push(r.id);
  o.push('## Target rows named by outcome-encoding entries', '');
  o.push('| Target | Entries |', '| --- | --- |');
  for (const [t, ids] of [...fitted].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))) o.push(`| ${t} | ${ids.map(i => `\`${i}\``).join(', ')} |`);
  if (L.unknownTargets.length) o.push('', `Named in notes but absent from data/targets.json: ${L.unknownTargets.join(', ')}.`);
  o.push('');

  for (const cls of ['input', 'design'] as const) {
    o.push(`## ${cls === 'input' ? 'Input' : 'Design'} entries (${L.classes[cls]})`, '');
    const groups: Record<string, typeof L.rows> = {};
    for (const r of L.rows.filter(r => r.cls === cls)) (groups[`${r.kind} · ${r.rule}`] ??= []).push(r);
    for (const [k, rs] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) o.push(`- **${k}** (${rs.length}): ${rs.map(r => `\`${r.id}\`${r.borderline ? ' †' : ''}`).join(', ')}`);
    o.push('');
  }
  return o.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const overrides = JSON.parse(flag('params', '{}')) as Overrides;
  if (args.includes('--count')) { const c = prescriptionCount(overrides); console.log(`${c.total} (${c.registryActive} registry entries in use + ${c.literals} literals)`); return; }
  const L = buildLedger(overrides), out = resolve(flag('out', 'artifacts/validation/e/e0-ledger'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.json`, JSON.stringify(L, null, 1) + '\n');
  writeFileSync(`${out}.md`, ledgerMarkdown(L));
  console.log(`${L.entries} entries: input ${L.classes.input}, design ${L.classes.design}, outcome-encoding ${L.classes['outcome-encoding']}`);
  console.log(`prescription count ${L.count.total} = ${L.count.registryActive} registry entries in use + ${L.count.literals} literals (${L.literals.length - L.count.literals} literals found and not counted)`);
  console.log(`wrote ${out}.{md,json}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
