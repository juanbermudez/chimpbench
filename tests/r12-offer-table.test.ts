import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { atomIndex, offerSites } from '../scripts/lib/offer-sites';
import { scanSource } from '../scripts/lib/valuation';
import { buildTable, callCosts, CALLS_FILE, callsMarkdown, readBase, readClasses, readSource, SOURCE, tableMarkdown, type CallExamples, type Classes } from '../scripts/r12-offer-table';
import { CANDIDATES_OPTS } from '../scripts/valuation-ledger';

// Stage R12 (docs/staging/r12-prereg.md §2): the reader of offer sites and their gates on a small source text, then
// the real file with the committed classification. Nothing is simulated.

const SRC = `
const V = { NONE: 0, TREE: 30, MOTHER: 33 } as const;
function offer(action: string, target: number, score: number, v = 0, aux = -1): void { if (!(score > -0.4)) return; }
function helper(world: World, c: Chimp, quiet: boolean, near: number): void {
  const x = ix(c);
  if (world.time - x.at > 0.03) return;
  const ag = byId.get(x.of);
  if (!ag || !ag.alive) return;
  if (!quiet) offer('flee', ag.id, 0.5);
  if (c.age >= 12 && near < 4) offer('charge', ag.id, 0.2, V.NONE, 7);
}
function compute(world: World, c: Chimp, P: Params): void {
  const x = ix(c), male = c.sex === 'male', h = c.hunger;
  const night = env.daylight < 0.1, cooled = bit(P, 1) || time - x.last > 1.5;
  const carried = caretaker ? isCarried(c, caretaker) : false;
  if (!c.alive) { out.push(1); return; }
  if (P.clock === 1) { if (!night) offer('rest', -1, 0.1); }
  else if (h < 0.2) offer('rest', -1, 0.3);
  else offer('rest', -1, 0.2);
  let best = -1, bestScore = -Infinity;
  for (let i = 0; i < x.seen.length; i++) {
    const o = byId.get(x.seen[i])!;
    if (!o.alive) continue;
    const d = dist(o, c), same = o.troopId === c.troopId;
    if (!same || d > P.rangeM) continue;
    if (male && cooled && dominates(c, o)) offer('charge', o.id, 0.4, male ? V.TREE : V.NONE);
    if (dominates(o, c)) { const sc = 0.3 - d / 90; if (sc > bestScore) { bestScore = sc; best = o.id; } }
  }
  if (best > 0) offer('greet', best, bestScore);
  const go = (id: number, minD: number): boolean => { const d = far(id); if (!(d > minD)) return false; offer('travel', id, 1, V.TREE); return true; };
  const first = P.calls === 1 && x.call > 0 && go(x.call, P.minM);
  if (!first && x.own) go(x.own, -1);
  helper(world, c, carried, 3);
  if (male) helper(world, c, false, x.reach);
}
`;
const sites = offerSites(SRC, 'compute');
const site = (action: string, n = 0) => sites.filter(s => s.action === action)[n];
const texts = (action: string, n = 0, path = 0) => site(action, n).paths[path].atoms.map(a => a.text);

test('a condition: conjuncts of an if, negated earlier branches, and the guard before it', () => {
  assert.equal(sites.length, 8);
  assert.deepEqual(texts('rest', 0), ['c.alive', 'P.clock === 1', '!night | night := env.daylight < 0.1']);
  assert.deepEqual(texts('rest', 1), ['c.alive', 'P.clock !== 1', 'h < 0.2 | h := c.hunger'], 'the negation of one comparison is the opposite comparison');
  assert.deepEqual(texts('rest', 2), ['c.alive', 'P.clock !== 1', 'h >= 0.2 | h := c.hunger']);
  assert.deepEqual(site('rest', 0).paths[0].atoms.map(a => a.how), ['guard', 'if', 'if']);
});

test('a loop, its guards by De Morgan, and local names opened to their definitions', () => {
  assert.deepEqual(texts('charge', 1), ['c.alive', 'EACH of x.seen', 'o.alive', 'o.troopId === c.troopId', 'd <= P.rangeM',
    'c.sex === \'male\'', 'bit(P, 1) || time - x.last > 1.5', 'dominates(c, o)']);
  const charge = site('charge', 1);   // (the first charge of the text is the helper's)
  assert.equal(charge.paths[0].atoms.find(a => a.text.startsWith('c.sex'))!.via, 'male', 'a bare local name is replaced by its definition');
  assert.deepEqual(charge.paths[0].atoms.find(a => a.text.startsWith('bit('))!.numbers, ['1.5'], 'the number literals of a condition; a bit of a switch is no number here only for the named helpers');
  assert.deepEqual(charge.paths[0].atoms.find(a => a.text.startsWith('d <='))!.params, ['rangeM']);
  assert.deepEqual(charge.variants, ['TREE', 'NONE']);
  assert.equal(charge.key, 'compute/charge/TREE+NONE#1');
});

test('a target chosen before the offer: the conditions around each place the name is set', () => {
  const greet = site('greet');
  assert.deepEqual(texts('greet'), ['c.alive', 'best > 0']);
  assert.equal(greet.sources.length, 1);
  assert.match(greet.sources[0].label, /^best set at line \d+$/);
  assert.deepEqual(greet.sources[0].atoms.map(a => a.text), ['c.alive', 'EACH of x.seen', 'o.alive', 'o.troopId === c.troopId', 'd <= P.rangeM', 'dominates(o, c)', 'sc > bestScore']);
});

test('a helper: one path per call, a parameter shown as the argument, operands before a call in a chain', () => {
  const travel = site('travel');
  assert.equal(travel.fn, 'go');
  assert.equal(travel.paths.length, 2);
  assert.deepEqual(travel.paths[0].atoms.map(a => a.text), ['c.alive', 'P.calls === 1', 'x.call > 0', 'd > minD | minD := P.minM']);
  assert.deepEqual(travel.paths[0].atoms.map(a => a.how), ['guard', 'and', 'and', 'guard']);
  assert.deepEqual(travel.paths[1].atoms.map(a => a.text), ['c.alive', '!first | first := P.calls === 1 && x.call > 0 && go(x.call, P.minM)', 'x.own', 'd > minD | minD := -1']);
  const flee = site('flee');
  assert.equal(flee.paths.length, 2);
  assert.deepEqual(flee.paths[0].atoms.map(a => a.text), ['c.alive', 'world.time - x.at <= 0.03', 'ag', 'ag.alive', '!quiet | quiet := carried | carried := caretaker ? isCarried(c, caretaker) : false']);
  assert.deepEqual(flee.paths[1].atoms.map(a => a.text), ['c.alive', 'c.sex === \'male\'', 'world.time - x.at <= 0.03', 'ag', 'ag.alive', '!quiet | quiet := false']);
  assert.deepEqual(texts('charge', 0, 0).slice(-2), ['c.age >= 12', 'near < 4 | near := 3']);
  assert.deepEqual(texts('charge', 0, 1).slice(-2), ['c.age >= 12', 'near < 4 | near := x.reach']);
  assert.equal(site('charge', 0).aux, true, 'a fifth argument other than -1');
});

test('a print follows the gating, not the lines', () => {
  const moved = offerSites(`\n\n// a comment\n${SRC}`, 'compute');
  assert.deepEqual(moved.map(s => s.print), sites.map(s => s.print));
  assert.notDeepEqual(moved.map(s => s.line), sites.map(s => s.line));
  const changed = offerSites(SRC.replace('near < 4', 'near < 5'), 'compute');
  assert.deepEqual(changed.filter((s, i) => s.print !== sites[i].print).map(s => s.key), ['helper/charge/NONE#1']);
  assert.equal(site('charge', 0).key, 'helper/charge/NONE#1');
});

// --- the real file ---------------------------------------------------------------------------------------------------------
const src = readSource(), { classes, text } = readClasses(), base = readBase();
const T = buildTable(src, classes, base, text);

test('the sites are the valuation ledger\'s, and every site and condition is classified', () => {
  const ledger = scanSource(SOURCE, src, CANDIDATES_OPTS).sites;
  assert.equal(T.rows.length, ledger.length);
  assert.deepEqual(T.rows.map(r => `${r.site.action}:${r.site.line}`).sort(), ledger.map(s => `${s.action}:${s.line}`).sort());
  assert.deepEqual(T.problems, []);
  assert.equal(new Set(T.rows.map(r => r.site.key)).size, T.rows.length, 'site keys are unique');
  for (const r of T.rows) { assert.ok(r.cls && r.cls.act && r.cls.teacher.length, r.site.key); assert.ok(r.site.paths.length >= 1 && r.site.paths.every(p => p.atoms.length >= 1), r.site.key); }
  for (const [t] of T.atoms) { const a = classes.atoms[t]; assert.ok(a && a.w, t); if (a.c === 'ADV' || a.c === 'QUO' || a.c === 'DIC') assert.ok(a.fix, t); if (a.fix === 'drop') assert.ok(a.line, t); }
  assert.equal(classes.rulings.length, 10);
});

test('the status of a site follows from the base: legacy behind a switch that is off, young behind a dependent\'s condition', () => {
  const by = (line: number, action: string) => T.rows.find(r => r.site.line === line && r.site.action === action)!;
  const at = (action: string, variant: string, n = 0) => T.rows.filter(r => r.site.action === action && r.site.variants.includes(variant))[n];
  assert.equal(at('call', 'FOODCALL').status, 'legacy');
  assert.equal(at('call', 'CONTACT', 0).status, 'live');
  assert.equal(at('nurse', 'NONE').status, 'young');
  assert.equal(at('transfer', 'NONE').plan, 'rules');
  assert.deepEqual(at('transfer', 'NONE').carried, ['DIC']);
  assert.equal(at('pant-grunt', 'NONE').carried.includes('ADV'), true);
  assert.ok(by(T.rows.find(r => r.site.key === 'computeCandidates/forage/NONE#2')!.site.line, 'forage').carried.every(c => c === 'PHY' || c === 'PER'), 'feeding in a tree in view is gated by possibility alone');
  // a base without the pant-hoot's valuation reaches the older call sites: their status is derived, not typed
  const older = buildTable(src, classes, { ...base, callValue: 0 }, text);
  assert.equal(older.rows.find(r => r.site.variants.includes('FOODCALL'))!.status, 'live');
  assert.ok(older.rows.filter(r => r.status === 'legacy').length < T.rows.filter(r => r.status === 'legacy').length);
  // a legacy claim the file states by a base fact is reported when the fact stops holding
  const flipped = buildTable(src, classes, { ...base, joinChoice: 0 }, text);
  assert.ok(flipped.problems.some(p => /claimed unreachable/.test(p)), flipped.problems.join('\n'));
});

test('the table regenerates to the same text, and its first page is counted', () => {
  const a = tableMarkdown(T), b = tableMarkdown(buildTable(src, classes, base, text));
  assert.equal(a, b);
  assert.ok(!/UNCLASSIFIED|## Problems/.test(a));
  const live = T.rows.filter(r => r.status === 'live').length;
  assert.ok(a.includes(`| **Live for an animal the model decides for (aged 8 or over)** | **${live}** |`));
  assert.equal(T.rows.length, T.rows.filter(r => r.status === 'legacy').length + T.rows.filter(r => r.status === 'young').length + live);
});

test('an offer site the classification does not cover, or a changed gate, is a problem', () => {
  const mark = '  // --- materialize';
  assert.ok(src.includes(mark));
  const added = buildTable(src.replace(mark, `  if (c.age >= 99) offer('rest', -1, 0.5);\n${mark}`), classes, base, text);
  assert.ok(added.problems.some(p => /^uncovered offer site computeCandidates\/rest\/NONE#4/.test(p)), added.problems.join('\n'));
  assert.ok(added.problems.some(p => /^unclassified condition/.test(p) && p.includes('c.age >= 99')));
  const gate = 'if (c.age >= 5 && d < P.snakeAlarmRangeM) offer(\'alarm\'';
  assert.ok(src.includes(gate));
  const changed = buildTable(src.replace(gate, 'if (c.age >= 5 && d < P.snakeAlarmRangeM && !night) offer(\'alarm\''), classes, base, text);
  assert.ok(changed.problems.some(p => /^changed offer site computeCandidates\/alarm\/SNAKE#1/.test(p)), changed.problems.join('\n'));
  // a site that leaves the source leaves an entry behind
  const cut = 'offer(\'climb\', t.id';
  assert.ok(src.includes(cut));
  const gone = buildTable(src.replace(cut, 'void (t.id'), classes, base, text);
  assert.ok(gone.problems.some(p => /a classified site is no longer in the source: computeCandidates\/climb/.test(p)), gone.problems.join('\n'));
  // and a classification with a condition missing is not accepted
  const some = Object.keys(classes.atoms)[40], less: Classes = { ...classes, atoms: Object.fromEntries(Object.entries(classes.atoms).filter(([k]) => k !== some)) };
  assert.ok(buildTable(src, less, base, text).problems.some(p => p.startsWith('unclassified condition')));
});

test('every distinct condition is indexed with the sites that carry it', () => {
  const ix = atomIndex(T.rows.map(r => r.site));
  assert.equal(ix.size, T.atoms.size);
  assert.equal(ix.get('c.alive')!.length, T.rows.length, 'every site stands behind the animal being alive');
});

test('the cost of the two calls: the estimator on the example packets, one real count as the anchor, the measured law', () => {
  const E = JSON.parse(readFileSync(new URL(`../${CALLS_FILE}`, import.meta.url), 'utf8')) as CallExamples;
  const { ratio, rows, secondsAt } = callCosts(E), at = (role: string) => rows.find(r => r.role === role)!;
  assert.equal(Math.round(at('one').real), E.realTokens.tokens, 'the anchor packet comes out at its real count');
  assert.ok(ratio > 0.7 && ratio < 1, `the estimate runs high, as stage R8 found (${ratio})`);
  for (const [tokens, seconds] of E.law.measured) assert.ok(Math.abs(secondsAt(tokens) - seconds) / seconds < 0.08, `the law at ${tokens} tokens`);
  assert.ok(at('first').real < at('one').real, 'the kinds call is shorter than today\'s packet');
  assert.ok(at('second-partner').real < at('second-place-short').real && at('second-place-short').real < at('second-place').real);
  assert.ok(at('long').real > at('one').real && rows.every(r => r.options >= 2));
  assert.ok(rows.filter(r => r.role !== 'long').every(r => r.options <= 8), 'every call of the design fits the eight options a request may hold');
  assert.equal(callsMarkdown(E), callsMarkdown(E));
});
