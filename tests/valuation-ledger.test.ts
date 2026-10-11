import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { constantsOf, scanSource, tokenize } from '../scripts/lib/valuation';
import { buildValuation, CANDIDATES_OPTS, valuationMarkdown } from '../scripts/valuation-ledger';

// Stage R7 (docs/staging/r7-ledger.md §5): the valuation ledger's counting rules, each on a small source text, then the
// real files.

test('tokens: comments, strings and template text never count; numbers, names and operators do', () => {
  const t = tokenize('const a = 1.5; // 99 in a comment\n/* 7\n8 */ let s = \'3 in a string\', u = `x ${b > 2 ? `n${4}` : "5"} y`;\nif (a >= .25 && b?.c !== 0x1f) a += 2e3;');
  assert.deepEqual(t.filter(k => k.t === 'num').map(k => k.s), ['1.5', '.25', '0x1f', '2e3']);
  assert.deepEqual(t.filter(k => k.t === 'str').map(k => k.s), ['3 in a string', 'x ${b > 2 ? `n${4}` : "5"} y']);
  assert.ok(t.some(k => k.s === '?.') && t.some(k => k.s === '!==') && t.some(k => k.s === '>=') && t.some(k => k.s === '+='));
  assert.equal(t.find(k => k.s === 'if')!.line, 4, 'lines are counted through comments and templates');
  assert.equal(tokenize('x = y / 2 / z; r = s.replace(/a\\/b[/]c/g, 1.25)').filter(k => k.t === 'num').map(k => k.s).join(), '2,1.25', 'a division is not a regular expression, and a regular expression is one string');
});

const SRC = `
const V = { NONE: 0, TREE: 30 } as const;
const CODE: Record<string, number> = { rest: 1, forage: 2 };
function offer(action: string, target: number, score: number, v = 0): void { if (!(score > -0.4)) return; }
function helper(c: Chimp): number { return c.hunger * 0.7 + 3; }
function unused(c: Chimp): number { return c.x * 9.5; }
function reasonFor(c: Chimp): string { return c.hunger < 0.2 ? 'digest' : 'rest'; }
function compute(world: World, c: Chimp, P: Params): void {
  const h = c.hunger, male = c.sex === 'male';
  const rest = 0.12 + (1 - h) * 0.9 + (hour >= 11.5 && hour < 14.5 ? 0.3 : 0);
  offer('rest', -1, rest);
  for (let i = 0; i < x.seen.length; i += 2) {
    const o = byId.get(x.seen[i + 3])!;
    if (c.age >= 12 && dominates(o, c) && time - x.last > 0.75) offer('pant-grunt', o.id, 0.3 + (male ? 0.25 : 0.05) + helper(c) - (hash01(c.id, 77) - 0.5) * P.span);
    if (P.switchA === 2 && x.phase >= 2 && socialBit(P, 4)) offer('groom', o.id, (maternalKin(c, o) ? 0.2 : 0) + P.groomW * 4);
  }
  const act = pick(c);
  offer(act, -1, env.daylight < 0.1 ? 1.5 : 0);
  if (o.troopId !== c.troopId) { offer('flee', o.id, (s.table[c.troopId] ?? 0) > 5 ? 0.6 : 0.1); }
}
`;
const S = scanSource('small.ts', SRC, { tables: ['V', 'CODE'], offerFns: ['offer'], wordingFns: ['reasonFor'], bitFns: ['socialBit'] });

test('offer sites: one per call with a literal action; a computed action is listed apart; the declaration is not a site', () => {
  assert.deepEqual(S.sites.map(s => s.action), ['rest', 'pant-grunt', 'groom', 'flee']);
  assert.equal(S.dynamic.length, 1);
  assert.equal(S.sites[0].line, 11);
});

test('numbers: structure is left out by rule, every other number has one context', () => {
  const left = (why: RegExp) => S.left.filter(l => why.test(l.why)).map(l => l.value);
  assert.deepEqual(left(/table/), ['0', '30', '1', '2'], 'ids of the two tables');
  assert.deepEqual(left(/array position/), ['3']);
  assert.deepEqual(left(/loop/), ['2'], 'the step of the loop (its start is a 0)');
  assert.deepEqual(left(/hash salt/), ['77']);
  assert.deepEqual(left(/registry switch/).sort(), ['2', '4'], 'P.switchA === 2 and the bit of socialBit(P, 4)');
  assert.deepEqual(left(/phase/), ['2']);
  assert.ok(S.left.filter(l => l.why === '0 or 1').length >= 6);
  const ctx = (c: string) => S.literals.filter(l => l.context === c).map(l => l.value);
  assert.deepEqual(ctx('offer'), ['0.3', '0.25', '0.05', '0.5', '0.2', '4', '0.1', '1.5', '5', '0.6', '0.1']);
  assert.deepEqual(ctx('gate'), ['12', '0.75'], 'the condition in front of an offer');
  assert.deepEqual(ctx('reaches'), ['-0.4', '0.7', '3', '0.12', '0.9', '11.5', '14.5', '0.3'], 'offer\'s own threshold, a helper called in a score, a name used in a score');
  assert.deepEqual(ctx('wording'), ['0.2']);
  assert.deepEqual(ctx('other'), ['9.5'], 'a function no offer reaches');
  const role = (v: string) => S.literals.find(l => l.value === v)!.role;
  assert.deepEqual([role('12'), role('0.75'), role('0.9'), role('11.5')], ['age', 'threshold', 'weight', 'threshold']);
});

test('terms switched by who the animal is: a conditional in a score, or the condition in front of an offer', () => {
  const at = (line: number) => S.terms.filter(t => t.line === line).map(t => `${t.where}: ${t.categories.join('+')}`);
  assert.deepEqual(at(14).sort(), ['offer-gate: age class+rank or dominance', 'score-term: sex'].sort());
  assert.deepEqual(at(15), ['score-term: kinship']);
  assert.deepEqual(at(19), ['offer-gate: community membership'], 'two communities compared; the table indexed by a community is not a term');
  assert.equal(S.terms.length, 4, 'the hour test at line 10 names nobody');
});

test('clock constants: a number compared with the hour, with elapsed time or with daylight', () => {
  assert.deepEqual(S.clock.map(c => `${c.kind} ${c.value}`), ['hour of day 11.5', 'hour of day 14.5', 'elapsed time 0.75', 'daylight 0.1']);
});

test('registry ids read, and the numbers of a constants file by declaration', () => {
  assert.deepEqual(S.params, ['groomW', 'span', 'switchA']);
  const c = constantsOf('gate.ts', 'export const GATE = { maxAgeH: 1.5, patchRatio: 2, arriveM: 6, on: 1 } as const;\nexport const bucketOf = (v: number) => v >= 0.88 ? \'severe\' : v >= 0.4 ? \'mild\' : \'none\';\nfunction f() { const inner = 0x10 + 7; return inner - 0; }');
  assert.deepEqual(c.map(x => `${x.name} ${x.value}`), ['GATE 1.5', 'GATE 2', 'GATE 6', 'bucketOf 0.88', 'bucketOf 0.4', 'f 7']);
});

test('the real files: stable, non-empty counts that a second method confirms', () => {
  const L = buildValuation(JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')));
  // a second count of the offer sites: the text with line comments removed, calls with a quoted action
  const src = readFileSync('src/sim/candidates.ts', 'utf8').split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
  assert.equal(L.offerSites.total, (src.match(/\boffer\('[a-z-]+',/g) ?? []).length);
  assert.equal(L.offerSites.dynamic, 0);
  assert.equal(Object.values(L.offerSites.byAction).reduce((a, b) => a + b, 0), L.offerSites.total);
  assert.ok(L.offerSites.actions >= 25 && L.literals.score > 200 && L.terms.total > 40 && L.clock.candidates > 10 && L.registry.read > 200);
  assert.equal(L.literals.counted, Object.values(L.literals.byContext).reduce((a, b) => a + b, 0), 'every counted number has exactly one context');
  assert.deepEqual(L.decide.constants.filter(c => c.name === 'bucketOf').map(c => c.value).sort(), ['0.4', '0.55', '0.7', '0.88'], 'the gate\'s need thresholds');
  assert.deepEqual(L.decide.constants.filter(c => c.name === 'periodOf').map(c => c.value).sort(), ['11.5', '14.5'], 'the gate\'s clock periods');
  assert.deepEqual(L.decide.constants.filter(c => c.name === 'GATE').map(c => c.value), ['1.5', '2', '6']);
  assert.ok(L.registry.list.every(r => r.cls !== 'not in the registry'), 'every P.<id> read is a registry entry');
  assert.deepEqual(scanSource('src/sim/candidates.ts', readFileSync('src/sim/candidates.ts', 'utf8'), CANDIDATES_OPTS).sites.length, L.offerSites.total, 'the scan repeats');
  assert.match(valuationMarkdown(L), /Offer sites by action/);
});

// --- added by the review of the stage (docs/staging/r7-ledger.md §9, amendment 9) --------------------------------------
test('a wording function keeps its numbers even when a name it shares reaches an offer', () => {
  // names are followed without scope: `a` reaches the offer below, and so does every definition called `a`, the one
  // inside reasonFor included; `cand` reaches it too, and with it the whole of reasonFor
  const src = `
function offer(action: string, target: number, score: number): void {}
function reasonFor(c: Chimp): string { const a = c.energy < 0.45 ? 'low' : 'fine'; return world.hour < 12 ? a : 'late'; }
function compute(c: Chimp): void {
  const a = c.hunger * 0.7;
  const cand = { reason: reasonFor(c) };
  offer('rest', -1, a + weigh(cand) + 0.3);
}
`;
  const named = scanSource('w.ts', src, { wordingFns: ['reasonFor'] }), unnamed = scanSource('w.ts', src);
  const ctx = (s: typeof named, c: string) => s.literals.filter(l => l.context === c).map(l => l.value);
  assert.deepEqual(ctx(named, 'wording'), ['0.45', '12'], 'the reason\'s own thresholds choose words');
  assert.deepEqual([ctx(named, 'reaches'), ctx(named, 'offer')], [['0.7'], ['0.3']]);
  assert.deepEqual(ctx(unnamed, 'reaches'), ['0.45', '12', '0.7'], 'not named as wording, the name-following rule takes them: the count is an upper one');
  assert.deepEqual(named.clock.map(c => `${c.kind} ${c.value} ${c.wording}`), ['hour of day 12 true'], 'a clock comparison in a wording function is marked');
});

test('the real file: no number of the reason sentences is counted as a score literal', () => {
  const lines = readFileSync('src/sim/candidates.ts', 'utf8').split('\n');
  const from = lines.findIndex(l => l.startsWith('export function reasonFor(')) + 1, to = from + lines.slice(from).findIndex(l => l === '}') + 1;
  assert.ok(from > 0 && to > from + 20, `reasonFor at lines ${from} to ${to}`);
  const L = buildValuation(JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')));
  const inside = L.literals.list.filter(l => l.line >= from && l.line <= to);
  assert.ok(inside.length >= 10, `${inside.length} numbers stand in reasonFor`);
  assert.deepEqual([...new Set(inside.map(l => l.context))], ['wording']);
  assert.equal(L.literals.score, L.literals.list.filter(l => l.context === 'offer' || l.context === 'reaches').length);
  assert.ok(L.clock.wording > 0 && L.clock.wording < L.clock.candidates, `${L.clock.wording} of ${L.clock.candidates} clock constants only choose words`);
  assert.equal(L.clock.wording, L.clock.list.filter(c => c.line >= from && c.line <= to).length, 'they are the ones inside reasonFor');
});
