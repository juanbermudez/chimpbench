// Valuation ledger (stage R7; docs/staging/r7-ledger.md §5), beside the prescription ledger (scripts/prescription-ledger.ts,
// whose lint leaves score literals out by its own text): counts, from the source text, what values behaviour by hand in
// src/sim/candidates.ts and src/decide/*.ts. Offer sites by action, inline score literals, terms switched by who the
// animal is, clock and bucket constants, and the registry parameters the valuation reads. Rules: scripts/lib/valuation.ts.
//
//   pnpm exec tsx scripts/valuation-ledger.ts [--out artifacts/r7/ledger/valuation] [--params-file docs/staging/integrator-kit/params/M6-W50.json] [--count]
//
// Writes <out>.json (every item with file and line) and <out>.md. Reads source only: no simulation.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveParams, type Overrides } from '../src/sim/params';
import { classify, type RegistryEntry } from './lib/prescriptions';
import { constantsOf, scanSource, type Scan } from './lib/valuation';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** The scan's settings for candidates.ts: the two id tables, the wrapper that offers a nest, the functions that only word a reason, the helpers that read one bit of a switch. */
export const CANDIDATES_OPTS = { tables: ['V', 'CODE'], offerFns: ['offer', 'offerOwnNest'], wordingFns: ['reasonFor', 'fruitWord', 'kinWord', 'dirWord', 'pct', 'm', 'cap', 'troopShort'], bitFns: ['socialBit', 'aggrBit', 'callGapOn'] };

const count = <T>(list: T[], key: (x: T) => string): Record<string, number> => { const o: Record<string, number> = {}; for (const x of list) o[key(x)] = (o[key(x)] ?? 0) + 1; return o; };
const lineList = (list: { file: string; line: number }[]) => { const by = new Map<string, number[]>(); for (const x of list) { const v = by.get(x.file) ?? []; if (!v.includes(x.line)) v.push(x.line); by.set(x.file, v); } return [...by].map(([f, v]) => `${f}:${v.join(',')}`).join('; '); };

export function buildValuation(overrides: Overrides = {}) {
  const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
  const cand: Scan = scanSource('src/sim/candidates.ts', read('src/sim/candidates.ts'), CANDIDATES_OPTS);
  const decideFiles = readdirSync(join(ROOT, 'src/decide')).filter(f => f.endsWith('.ts')).sort().map(f => `src/decide/${f}`);
  const decide = decideFiles.map(f => scanSource(f, read(f)));
  const constants = decideFiles.flatMap(f => constantsOf(f, read(f)));
  // registry parameters the valuation reads, classed by the prescription ledger's own rules, and whether the base uses them
  const entries = new Map((JSON.parse(read('data/params.json')) as { params: RegistryEntry[] }).params.map(e => [e.id, e]));
  const P = resolveParams('field', overrides) as unknown as Record<string, number>;
  const registry = cand.params.map(id => { const e = entries.get(id); const c = e ? classify(e) : null; return { id, cls: c?.cls ?? 'not in the registry', kind: c?.kind ?? '', value: P[id] ?? null, inUse: (P[id] ?? 0) !== 0 }; });
  const score = cand.literals.filter(l => l.context === 'offer' || l.context === 'reaches');
  const head = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } })();
  return {
    date: new Date().toISOString(), head, overrides,
    offerSites: { total: cand.sites.length, actions: Object.keys(count(cand.sites, s => s.action)).length, byAction: count(cand.sites, s => s.action), dynamic: cand.dynamic.length, list: cand.sites, dynamicList: cand.dynamic },
    literals: { counted: cand.literals.length, byContext: count(cand.literals, l => l.context), score: score.length, scoreLines: new Set(score.map(l => l.line)).size, scoreByRole: count(score, l => l.role), byContextRole: count(cand.literals, l => `${l.context}, ${l.role}`),
      leftOut: cand.left.length, leftOutByRule: count(cand.left, l => l.why), list: cand.literals, left: cand.left },
    terms: { total: cand.terms.length, byWhere: count(cand.terms, t => t.where), byCategory: count(cand.terms.flatMap(t => t.categories.map(c => ({ c }))), x => x.c),
      notAgeAlone: cand.terms.filter(t => !(t.categories.length === 1 && t.categories[0] === 'age class')).length, list: cand.terms },
    clock: { candidates: cand.clock.length, byKind: count(cand.clock, c => c.kind), list: cand.clock, decide: decide.flatMap(d => d.clock) },
    decide: { files: decideFiles, constants, byName: count(constants, c => `${c.file.replace('src/decide/', '')} ${c.name}`) },
    registry: { read: registry.length, byClass: count(registry, r => r.cls), inUse: registry.filter(r => r.inUse).length, inUseByClass: count(registry.filter(r => r.inUse), r => r.cls), list: registry },
  };
}
export type Valuation = ReturnType<typeof buildValuation>;

export function valuationMarkdown(L: Valuation, level = '#'): string {
  const o: string[] = [], kv = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  o.push(`${level} Valuation ledger`, '', `Generated ${L.date.slice(0, 16).replace('T', ' ')} UTC by \`scripts/valuation-ledger.ts\` at ${L.head} (rules: \`scripts/lib/valuation.ts\`; docs/staging/r7-ledger.md §5). A lexical count of the source text: nothing is run.`, '');
  o.push('| What is counted | Count |', '|---|---|');
  o.push(`| Offer sites in \`src/sim/candidates.ts\` (calls \`offer('<action>', …)\`) | ${L.offerSites.total} over ${L.offerSites.actions} actions${L.offerSites.dynamic ? `, plus ${L.offerSites.dynamic} with a computed action` : ''} |`);
  o.push(`| Inline score literals (numbers inside an offer call, or in the definition of a name that reaches one) | ${L.literals.score} on ${L.literals.scoreLines} lines: ${L.literals.scoreByRole.weight ?? 0} weights in a sum or product, ${L.literals.scoreByRole.threshold ?? 0} thresholds on a state, ${L.literals.scoreByRole.age ?? 0} thresholds on age |`);
  o.push(`| Numbers in the condition in front of an offer (eligibility thresholds) | ${L.literals.byContext.gate ?? 0} |`);
  o.push(`| Numbers that only choose a reason's wording | ${L.literals.byContext.wording ?? 0} |`);
  o.push(`| Other numbers in the file (geometry, helpers that reach no offer) | ${L.literals.byContext.other ?? 0} |`);
  o.push(`| Numbers left out as structure | ${L.literals.leftOut} |`);
  o.push(`| Terms switched by who the animal or its partner is | ${L.terms.total} (${L.terms.notAgeAlone} when those switched by age alone are set aside) |`);
  o.push(`| Clock constants in \`candidates.ts\` (a number compared with the hour, with elapsed time or with daylight) | ${L.clock.candidates} |`);
  o.push(`| Numbers in \`src/decide/*.ts\` (need thresholds, clock periods, gate constants and the rest) | ${L.decide.constants.length} |`);
  o.push(`| Registry parameters \`candidates.ts\` reads | ${L.registry.read} (${L.registry.inUse} not zero on the base given) |`, '');
  o.push(`**Offer sites by action:** ${kv(L.offerSites.byAction)}.`, '');
  o.push(`**Numbers by context:** ${kv(L.literals.byContext)}. Left out, by rule: ${kv(L.literals.leftOutByRule)}.`, '');
  o.push(`**Terms by what switches them** (a term can carry several): ${kv(L.terms.byCategory)}. By place: ${kv(L.terms.byWhere)}.`, '');
  o.push(`**Clock constants in \`candidates.ts\`:** ${kv(L.clock.byKind)}; lines ${lineList(L.clock.list)}.`, '');
  o.push(`**Numbers in \`src/decide\`, by declaration:** ${kv(L.decide.byName)}.`, '');
  o.push(`**Registry parameters read, by the prescription ledger's class:** ${kv(L.registry.byClass)}; not zero on the base: ${kv(L.registry.inUseByClass)}.`, '');
  o.push(`${level}# Where they are`, '');
  o.push(`- Offer sites: ${Object.keys(L.offerSites.byAction).sort().map(a => `${a} (${L.offerSites.list.filter(s => s.action === a).map(s => s.line).join(', ')})`).join('; ')}.`);
  o.push(`- Inline score literals, lines of \`src/sim/candidates.ts\`: ${[...new Set(L.literals.list.filter(l => l.context === 'offer' || l.context === 'reaches').map(l => l.line))].join(', ')}.`);
  o.push(`- Eligibility thresholds, lines: ${[...new Set(L.literals.list.filter(l => l.context === 'gate').map(l => l.line))].join(', ')}.`);
  o.push(`- Terms switched by who the animal is, lines: ${[...new Set(L.terms.list.map(t => t.line))].join(', ')}.`);
  o.push(`- \`src/decide\`: ${L.decide.constants.map(c => `${c.file.replace('src/decide/', '')}:${c.line} ${c.name} ${c.value}`).join('; ')}.`, '');
  return o.join('\n');
}

function main() {
  const args = process.argv.slice(2), flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const pf = flag('params-file', 'docs/staging/integrator-kit/params/M6-W50.json');
  const L = buildValuation(JSON.parse(readFileSync(resolve(ROOT, pf), 'utf8')) as Overrides);
  if (args.includes('--count')) { console.log(`${L.offerSites.total} offer sites over ${L.offerSites.actions} actions; ${L.literals.score} inline score literals on ${L.literals.scoreLines} lines; ${L.terms.total} terms switched by who the animal is; ${L.clock.candidates} clock constants; ${L.registry.read} registry parameters read`); return; }
  const out = resolve(flag('out', 'artifacts/r7/ledger/valuation'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}.json`, JSON.stringify({ ...L, paramsFile: pf }, null, 1) + '\n');
  writeFileSync(`${out}.md`, valuationMarkdown(L));
  console.log(`wrote ${out}.{json,md}: ${L.offerSites.total} offer sites, ${L.literals.score} score literals, ${L.terms.total} terms`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
