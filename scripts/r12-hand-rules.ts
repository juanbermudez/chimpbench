// Stage R12 build (docs/staging/r12-build-prereg.md §5, with amendment A1): the counted-rules list. Every rule the user's
// rulings of 17 October 2026 keep in code, generated (never typed) from the offer table (scripts/r12-offer-table.ts, on the
// working base, with the classification of data/r12-offer-classes.json), the numbers R15's menu and this build's menu read
// in src/sim/resources.ts and src/sim/possible.ts, the rules inside offer(), and stage R7's list of the loop's hand-set
// numbers (scripts/r7-ledger.ts handNumbers). "Count" means the rule stays in code and is listed and counted as a hand rule
// in every result: every result of this stage prints the section `printSection` writes, and so does stage R7's ledger.
// Read-only: source text and parameters in, a file out. No simulation, no model.
//
//   fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r12-hand-rules.ts [--check]
//   fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r12-hand-rules.ts print [--params <params file>] [--set id=value,...]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESOURCE_KIND_LABELS } from '../src/kernel/resource-contract';
import { MAX_OPTIONS } from '../src/sim/menu';
import { resolveParams, type Overrides } from '../src/sim/params';
import { BASE_FILE, buildTable, CLASS_NAMES, readBase, readClasses, readSource, type Cls, type Table } from './r12-offer-table';
import { handNumbers } from './r7-ledger';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const LIST_FILE = 'data/r12-hand-rules.json';

/** What the rulings did with a rule. */
export const STATUS = {
  kept: 'kept: stays in code, counted',
  body: 'kept until a body teacher: stays until a teacher that is not the rules exists for the body\'s acts (rulings 4 and 5)',
  pair: 'kept except for the adult male pair: stays for every other pair (ruling 6)',
  cut: 'cut on the model\'s path by its switch; kept and counted where the switch is off',
  rules: 'an act with the rules: the rules start, continue and end it (ruling 10)',
  limit: 'a limit of the built path, named and counted (not a gate the rulings speak to)',
} as const;
export type Status = keyof typeof STATUS;
export type Source = 'table' | 'inside offer()' | 'menu' | 'loop';

export interface HandRule {
  /** A short hash of the rule's text, stable when lines move. */
  id: string; text: string; words: string; class: Cls | 'NUM' | 'TEXT'; source: Source;
  sites: { key: string; line: number }[]; numbers: string[];
  /** The rulings whose places it stands in (1 to 10), or none (age lines, timers, "not at night", the loop's numbers). */
  rulings: number[]; status: Status;
  /** For `cut`: the switch whose value cuts it on the model's path (and the value from which it does). */
  cutBy?: { id: string; from: number };
  /** Where it is read, file and line or registry id. */
  where: string;
}
export interface HandRuleList { stage: 'R12-build'; tool: 'r12-hand-rules'; schema: 1; base: string; sourceHash: string; classesHash: string; hash: string; counts: Counts; rules: HandRule[] }
export interface Counts { all: number; byStatus: Record<string, number>; bySource: Record<string, number>; byClass: Record<string, number>; byRuling: Record<string, number> }

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const idOf = (s: string) => sha(s).slice(0, 10);
const HAND: Cls[] = ['ADV', 'QUO', 'DIC'];
/** Which switch cuts a rule a ruling drops at once (the rules value every option it cut): ruling 2 by R15, ruling 7 by this build. */
const CUT_BY: Record<number, { id: string; from: number }> = { 2: { id: 'resourceTargets', from: 1 }, 7: { id: 'menuPossible', from: 1 } };

function sourceNumbers(file: string, re: RegExp): { values: string[]; line: number } {
  const src = readFileSync(join(ROOT, file), 'utf8'), m = re.exec(src);
  if (!m) throw new Error(`${file}: pattern ${re} not found (the code changed: update scripts/r12-hand-rules.ts)`);
  return { values: m.slice(1), line: src.slice(0, m.index).split('\n').length };
}

/** The list, from the table on `overrides` (the working base) and the source. Throws when a dropped rule names no switch that cuts it. */
export function buildList(T: Table, overrides: Overrides): HandRuleList {
  const P = resolveParams('field', overrides) as unknown as Record<string, number>, rules: HandRule[] = [], problems: string[] = [];
  // --- A. the table: every advice, quota and dice condition that binds at a live place on the base ---------------------
  const byText = new Map<string, { a: Table['rows'][number]['binding'][number]; rows: Table['rows'] }>();
  for (const r of T.rows.filter(r => r.status === 'live')) for (const a of r.binding) {
    const k = r.of(a);
    if (!k || !HAND.includes(k.c)) continue;
    const e = byText.get(a.text) ?? { a, rows: [] };
    e.rows.push(r); byText.set(a.text, e);
  }
  const rulingOf = (key: string) => T.classes.rulings.flatMap((r, i) => r.sites.includes(key) ? [i + 1] : []);
  for (const [text, { a, rows }] of byText) {
    const k = rows[0].of(a)!, rulings = [...new Set(rows.flatMap(r => rulingOf(r.site.key)))].sort((x, y) => x - y);
    const status: Status = k.c === 'DIC' || k.fix === 'rules' ? 'rules' : k.fix === 'drop' ? (k.needs === 'body' ? 'body' : k.needs === 'wild' ? 'pair' : 'cut') : 'kept';
    const cut = status === 'cut' ? rulings.map(n => CUT_BY[n]).find(Boolean) : undefined;
    if (status === 'cut' && !cut) problems.push(`a rule the rulings drop at once names no switch that cuts it: ${text}`);
    rules.push({ id: idOf(`table:${text}`), text, words: k.w, class: k.c, source: 'table', sites: rows.map(r => ({ key: r.site.key, line: r.site.line })),
      numbers: [...new Set([...a.numbers, ...a.params.map(p => `${p}=${P[p]}`)])], rulings, status, ...(cut ? { cutBy: cut } : {}), where: `src/sim/candidates.ts:${rows.map(r => r.site.line).join(',')}` });
  }
  // --- B. inside offer(), in front of every place --------------------------------------------------------------------
  const nums = handNumbers(overrides, null), num = (re: RegExp) => nums.find(n => re.test(n.name))!;
  const off = (text: string, words: string, numbers: string[], where: string, status: Status, cutBy?: { id: string; from: number }) =>
    rules.push({ id: idOf(`offer:${text}`), text, words, class: 'ADV', source: 'inside offer()', sites: [], numbers, rulings: [], status, ...(cutBy ? { cutBy } : {}), where });
  off('score > threshold', 'an option the rules score at the threshold or below is not offered (cut for R15\'s resources and for the options this build opens)', [num(/score threshold/).value], num(/score threshold/).where, 'kept');
  off('slot caps', 'each act keeps one to three targets by the rules\' score (cut for R15\'s resources and for the options this build opens)', [num(/slot caps/).value], num(/slot caps/).where, 'kept');
  off('the patrol\'s silence', 'an animal on a silent patrol is offered no call and no display', [`patrolSilence=${P.patrolSilence}`], 'src/sim/candidates.ts offer; data/params.json patrolSilence', 'kept');
  // --- C. the menus: R15's numbers, this build's, the kind scaffold, and the limits named in the registration ---------
  const caps = sourceNumbers('src/sim/resources.ts', /const cap = kind === 'drink' \? (\d+) : (\d+);/), bands = sourceNumbers('src/sim/resources.ts', /distance\(k\) < (\d+) \? 0 : distance\(k\) < (\d+) \? 1 : distance\(k\) < (\d+) \? 2 : 3/);
  const hashKey = sourceNumbers('src/sim/resources.ts', /hash01\(world\.seed, c\.id, k\.targetId, c\.actionTime \* (\d+)\)/);
  const menu = (text: string, words: string, numbers: string[], where: string, rulings: number[], status: Status = 'kept', cls: HandRule['class'] = 'NUM') =>
    rules.push({ id: idOf(`menu:${text}`), text, words, class: cls, source: 'menu', sites: [], numbers, rulings, status, where });
  menu('R15 target menu caps', 'the second call shows at most this many water places and trees', [`water ${caps.values[0]}`, `trees ${caps.values[1]}`], `src/sim/resources.ts:${caps.line}`, [2, 4]);
  menu('R15 trip distance bands', 'the trips shown are a stable hash sample over four distance bands, metres', bands.values, `src/sim/resources.ts:${bands.line}`, [2]);
  menu('R15 sample key', 'the hash of the trips shown is keyed by the time spent in the current act (seconds times this factor), 0 for an animal set to rest while it waits (an R15 limit, not changed)', [hashKey.values[0]], `src/sim/resources.ts:${hashKey.line}`, [2], 'limit');
  menu('R15 current target kept', 'the current target is kept on the menu while it is legal', [], 'src/sim/resources.ts resourceTargetsFor', [2, 4]);
  menu('memory horizon', 'a remembered tree is a trip only within this many hours of its sighting', [`memTravelHorizonH=${P.memTravelHorizonH}`], 'data/params.json memTravelHorizonH', [2, 3]);
  menu('minimum trip distance', 'a remembered tree nearer than this, in metres, is no trip', [`memoryTreeMinM=${P.memoryTreeMinM}`], 'data/params.json memoryTreeMinM', [2, 3]);
  menu('the kind scaffold', 'the kinds on the first call are those of the rules\' bounded flat menu: at most 8, one place per action, kept picks first', [String(MAX_OPTIONS)], 'src/sim/menu.ts boundedCandidates; src/sim/request.ts buildResourceRequest', [], 'limit');
  menu('a kind\'s one target', 'every kind whose target is not opened keeps one target, the rules\' best option of the kind (R15\'s representative)', [], 'src/sim/request.ts buildResourceRequest', [6, 7]);
  menu('the representative\'s place', 'in an opened group the representative is kept, chosen by the rules\' score (A1.6)', [], 'src/sim/possible.ts socialTargetsFor', [6, 7], 'limit');
  menu('opened group cap and order', 'an opened social group: the current target, the representative, then the nearest, at most this many, listed nearest first', [String(MAX_OPTIONS)], 'src/sim/possible.ts socialTargetsFor', [6, 7]);
  menu('the target call\'s nearby list', 'a social target call lists its group\'s animals, then the nearest others in view, to this many, by distance', ['8'], 'src/sim/possible.ts targetSocial', [6, 7]);
  menu('the kind packet\'s nearby list', 'the kind call lists the animals of the rules\' best-valued options first (R15\'s observation, kept so the kind call stays R15\'s)', ['8'], 'src/sim/observe.ts observe', [], 'limit');
  menu('the adult male pair class', 'an adult male (15 or older) chooses among adult males only at menuPossible 2; the Ngogo protocol\'s adult males are 16 or older', ['15'], 'src/sim/hierarchy.ts isAdultMale; src/sim/possible.ts opensTarget', [6], 'pair');
  menu('the dice set', 'the acts that stay with the rules are the transfer, the attack on an infant and the gang attack; the escalation attack rolled at perception is unreachable on the working base and not among them', [], 'src/sim/possible.ts isDiceOption', [10], 'rules');
  menu('dice rates per decision point', 'the rolls are fixed per decision point, not per hour, so how often decisions come changes the hourly rate', [], 'src/sim/perception.ts, src/sim/reproduction.ts', [10], 'limit');
  menu('the kind labels and the target instructions', 'hand-set text shown to the model: the kind labels and R15\'s two instructions', [`${Object.keys(RESOURCE_KIND_LABELS).length} labels`, '2 instructions'], 'src/kernel/resource-contract.ts RESOURCE_KIND_LABELS; src/providers/packet.ts r15Packet', [], 'kept', 'TEXT');
  // --- D. the loop: stage R7's hand-set numbers on the path ------------------------------------------------------------
  const inMenu = /score threshold|slot caps/;
  for (const n of nums) if (!inMenu.test(n.name)) rules.push({ id: idOf(`loop:${n.name}`), text: n.name, words: `${n.name} (read: ${n.read})`, class: 'NUM', source: 'loop', sites: [], numbers: [n.value], rulings: [], status: 'kept', where: n.where });
  if (problems.length) throw new Error(problems.join('\n'));
  rules.sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0) || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
  const body = { rules };
  return { stage: 'R12-build', tool: 'r12-hand-rules', schema: 1, base: BASE_FILE, sourceHash: T.sourceHash, classesHash: T.classesHash, hash: sha(JSON.stringify(body)).slice(0, 16), counts: countOf(rules), rules };
}

export function countOf(rules: HandRule[]): Counts {
  const tally = (f: (r: HandRule) => string[]) => { const o: Record<string, number> = {}; for (const r of rules) for (const k of f(r)) o[k] = (o[k] ?? 0) + 1; return o; };
  return { all: rules.length, byStatus: tally(r => [r.status]), bySource: tally(r => [r.source]), byClass: tally(r => [r.class]), byRuling: tally(r => r.rulings.length ? r.rulings.map(String) : ['none']) };
}

/**
 * Whether a rule can bind for an animal a kernel decides for under a run's parameters. A table rule binds when it gates a
 * live place on those parameters; a rule a switch cuts does not bind on the model's path while that switch is on (it is
 * counted apart); every other rule binds.
 */
export function onPath(list: HandRuleList, overrides: Overrides): { on: HandRule[]; cut: HandRule[] } {
  const P = resolveParams('field', overrides) as unknown as Record<string, number>;
  const { classes, text } = readClasses(), T = buildTable(readSource(), classes, overrides, text);
  const live = new Set(T.rows.filter(r => r.status === 'live').flatMap(r => r.binding.map(a => a.text)));
  const on: HandRule[] = [], cut: HandRule[] = [];
  for (const r of list.rules) {
    if (r.cutBy && P[r.cutBy.id] >= r.cutBy.from) { cut.push(r); continue; }
    if (r.source === 'table' && !live.has(r.text)) continue;
    on.push(r);
  }
  return { on, cut };
}

/** The counted-rules section every result of this stage carries (and stage R7's ledger), for a run's parameters. */
export function printSection(overrides: Overrides, list: HandRuleList | null = readList(), label = 'this run'): string[] {
  if (!list) return ['### The hand rules the rulings keep', '', `The list (\`${LIST_FILE}\`) is not generated: run \`scripts/r12-hand-rules.ts\`.`, ''];
  const { on, cut } = onPath(list, overrides), c = countOf(on);
  const fmt = (o: Record<string, number>, names?: Record<string, string>) => Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${names?.[k] ?? k} ${v}`).join('; ');
  const P = resolveParams('field', overrides) as unknown as Record<string, number>;
  return ['### The hand rules the rulings keep (counted)', '',
    `List \`${LIST_FILE}\`, hash ${list.hash} (${list.counts.all} rules: ${fmt(list.counts.bySource)}). On the path of an animal a kernel decides for, under ${label}'s parameters (resourceTargets ${P.resourceTargets}, menuPossible ${P.menuPossible}): **${on.length} hand rules**.`,
    '', `- By status: ${fmt(c.byStatus)}.`, `- By ruling: ${fmt(c.byRuling, Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), `ruling ${i + 1}`])))}.`,
    `- By class: ${fmt(c.byClass, { ...CLASS_NAMES, NUM: 'number', TEXT: 'hand-set text' })}.`,
    `- Cut on the model's path by a switch that is on (still counted, off the path): ${cut.length ? cut.map(r => `${r.words} (${r.cutBy!.id})`).join('; ') : 'none'}.`,
    // second reading: the status "kept except for the adult male pair" says what level 2 would do; say whether it does here
    `- The adult male pair opening (ruling 6, \`menuPossible\` 2): ${P.menuPossible >= 2 ? 'on: an adult male\'s grooming target call lists the adult males in reach whatever they are doing, so "only a settled partner" binds for every other pair' : 'off: "only a settled partner" binds for every pair, adult males included'}.`, ''];
}

export function readList(file = LIST_FILE): HandRuleList | null { const f = resolve(ROOT, file); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as HandRuleList : null; }
export function generate(): HandRuleList { const { classes, text } = readClasses(), base = readBase(); return buildList(buildTable(readSource(), classes, base, text), base); }

function main(): void {
  const args = process.argv.slice(2), flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
  if (args[0] === 'print') {
    const set = flag('set', ''), extra = Object.fromEntries(set ? set.split(',').map(kv => { const [k, v] = kv.split('='); return [k, Number(v)]; }) : []);
    console.log(printSection({ ...readBase(flag('params', BASE_FILE)), ...extra }, readList(), flag('label', 'this run')).join('\n'));
    return;
  }
  const list = generate(), text = JSON.stringify(list, null, 1) + '\n', file = resolve(ROOT, LIST_FILE);
  if (args.includes('--check')) {
    const now = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (now !== text) { console.error(`${LIST_FILE} is stale or missing: run scripts/r12-hand-rules.ts`); process.exitCode = 1; return; }
    console.log(`${LIST_FILE} is current: ${list.counts.all} rules, hash ${list.hash}`);
    return;
  }
  writeFileSync(file, text);
  console.log(`wrote ${LIST_FILE}: ${list.counts.all} rules (${Object.entries(list.counts.byStatus).map(([k, v]) => `${k} ${v}`).join(', ')}), hash ${list.hash}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
