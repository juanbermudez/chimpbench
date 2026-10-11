import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { cutsAt, CUTS, interruptKind, tickTrigger, type CutsAt } from '../scripts/lib/shadow-tap';
import { animalLedger, appliedOf, armLedger, endCredit, kindCredit, linesOf, targetClass, targetCredit, truthfulName, type ArmInfo, type LedgerReceipt } from '../scripts/lib/who-decided';
import { armEntry, handNumbers, receiptsLedger, reportMarkdown, runTap, teacherOf } from '../scripts/r7-ledger';
import { computeCandidates, offerTap, type OfferFate } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { MAX_OPTIONS } from '../src/sim/menu';
import { buildRequest } from '../src/sim/request';
import { rgMenu } from '../src/sim/rg';
import { createWorld, tickWorld } from '../src/simulation';
import { worldHash } from './fixtures/golden';

// Stage R7, second half (docs/staging/r7-ledger.md): one test per ledger rule on a small hand-built receipt log, then
// the shadow tap on a built world.

// --- a hand-built log: one animal, one day -------------------------------------------------------------------------
const TREE = 100005, TREE2 = 100009, WATER = 200003;
/** A receipt at hour `t` with decision version `v`: the menu as [act, target, family] and the position applied (-1: the rules decided, with `refusal`). */
const R = (t: number, v: number, menu: [string, number, string][], picked: number, extra: Partial<LedgerReceipt> = {}): LedgerReceipt =>
  ({ t, v, id: 1, opts: menu.map(m => [m[0], m[1]]), fam: menu.map(m => m[2]), rulesIndex: 0, by: picked >= 0 ? 'kernel' : 'rules', refusal: picked >= 0 ? '' : 'kernel-error', picked, ...extra });
const REST: [string, number, string] = ['rest', -1, 'rest'], FEED: [string, number, string] = ['forage', TREE, 'feed'], TRIP: [string, number, string] = ['travel', TREE2, 'food-trip'];
const GROOM_A: [string, number, string] = ['groom', 4, 'affiliative'], GROOM_B: [string, number, string] = ['groom', 7, 'affiliative'], NEST: [string, number, string] = ['nest', TREE, 'nest'], DRINK: [string, number, string] = ['drink', WATER, 'drink'];
const info = (gate: boolean, t0 = 0, t1 = 10): ArmInfo => ({ kernel: 'model', gate, t0, t1, focal: [1] });

test('kind credit: a real choice needs the kernel\'s answer applied and two kinds on the menu', () => {
  assert.equal(kindCredit(R(1, 1, [REST, FEED], 1)), 'chooser');
  assert.equal(kindCredit(R(1, 1, [GROOM_A, GROOM_B], 0)), 'one-kind', 'two partners of one kind are no choice of kind');
  assert.equal(kindCredit(R(1, 1, [REST, FEED], -1)), 'fallback');
});

test('kind credit by minutes: intervals run to the next receipt, the time before the first receipt belongs to the rules, nest minutes are not waking', () => {
  const log = [R(1, 10, [REST, FEED], 1), R(3, 11, [REST, FEED, NEST], 2), R(7, 12, [REST, FEED], -1), R(8, 13, [GROOM_A, GROOM_B], 1)];
  const L = animalLedger(1, log, info(false));
  assert.deepEqual(L.kind.before, { waking: 0, nest: 0, unknown: 60 }, 'hour 0 to 1: begun before the window, act not named');
  assert.deepEqual(L.kind.chooser, { waking: 120, nest: 240, unknown: 0 }, 'feeding 1 to 3 (waking), the nest 3 to 7');
  assert.deepEqual(L.kind.fallback, { waking: 60, nest: 0, unknown: 0 }, 'the rules decided at 7: their own pick on the menu (rest) names the act');
  assert.deepEqual(L.kind['one-kind'], { waking: 120, nest: 0, unknown: 0 }, 'two partners, one kind: 8 to the end of the window');
  const lines = linesOf(L);
  assert.equal(lines.wakingMin, 300);
  assert.equal(lines.kindHigh, 120 / 300, 'of 300 waking minutes, 120 in a kind the model picked from a real choice');
  assert.equal(lines.kindLow, lines.kindHigh, 'with the gate off every decision point is a receipt: no bracket');
  assert.equal(lines.dayHigh, 360 / 600);
  assert.deepEqual(L.fallbacks, { 'kernel-error': 1 });
});

test('a fallback whose pick is not on the menu opens an interval the receipts cannot name', () => {
  const L = animalLedger(1, [R(0, 1, [REST, FEED], -1, { rulesIndex: -1 }), R(2, 2, [REST, FEED], 0)], info(false, 0, 4));
  assert.deepEqual(L.kind.fallback, { waking: 0, nest: 0, unknown: 120 });
  assert.equal(appliedOf(R(0, 1, [REST, FEED], -1, { rulesIndex: -1 })).opt, null);
  assert.equal(L.unnamedEnded, 1, 'and the ending of that act cannot be judged');
  assert.equal(linesOf(L).wakingMin, 120, 'unnamed minutes are outside the waking denominator');
});

test('the gate bracket: only an interval with no hidden decision version is certainly under the fresh choice', () => {
  // versions 10 → 11: nothing hidden. 11 → 14: two hidden events (acts the gate kept or began)
  const log = [R(0, 10, [REST, FEED], 1), R(2, 11, [REST, FEED], 0), R(6, 14, [REST, FEED], 1)];
  const on = animalLedger(1, log, info(true, 0, 8)), off = animalLedger(1, log, info(false, 0, 8));
  assert.equal(on.hidden, 2); assert.equal(on.intervalsWithHidden, 1);
  assert.equal(on.certain.waking, 120, 'gate on: the first interval only (the last runs to the window\'s end, unknown)');
  assert.equal(on.kind.chooser.waking, 480);
  assert.deepEqual([linesOf(on).kindLow, linesOf(on).kindHigh], [0.25, 1]);
  assert.equal(off.certain.waking, 480, 'gate off: a hidden version is an interrupt, not an act; every minute is fresh');
});

test('target credit: none, a real choice between two targets of one kind, the slot cap, the rules', () => {
  assert.equal(targetCredit(R(1, 1, [REST, FEED], 0)), 'none');
  assert.equal(targetCredit(R(1, 1, [REST, GROOM_A, GROOM_B], 2)), 'chooser');
  assert.equal(targetCredit(R(1, 1, [REST, FEED, TRIP, GROOM_A], 2)), 'slot-cap', 'one tree to travel to: fixed before the model saw the menu');
  assert.equal(targetCredit(R(1, 1, [REST, ['groom', 4, 'affiliative'], ['play', 4, 'affiliative']], 1)), 'slot-cap', 'two acts toward one partner are not two targets');
  assert.equal(targetCredit(R(1, 1, [REST, GROOM_A, GROOM_B], -1, { rulesIndex: 1 })), 'fallback', 'the rules chose the partner');
  assert.equal(targetCredit(R(1, 1, [REST, GROOM_A, GROOM_B], -1)), 'none', 'the rules chose an act without a target');
  assert.deepEqual([targetClass(-1), targetClass(4), targetClass(TREE), targetClass(WATER), targetClass(300002), targetClass(1_000_050)], ['none', 'partner', 'tree', 'water', 'prey', 'call-or-stimulus']);
});

test('acts and ending credit: left with the act still on offer, not on offer, the rules, still running', () => {
  assert.equal(endCredit(['forage', TREE], R(2, 2, [REST, FEED], 0)), 'left');
  assert.equal(endCredit(['forage', TREE], R(2, 2, [REST, TRIP], 0)), 'gone');
  assert.equal(endCredit(['forage', TREE], R(2, 2, [REST, FEED], -1)), 'fallback');
  const log = [
    R(0, 1, [REST, FEED, GROOM_A, GROOM_B], 1),   // act 1: feed (one tree of its kind: slot cap)
    R(1, 2, [REST, FEED, GROOM_A, GROOM_B], 1),   // feed again, still on offer: stayed, same act
    R(2, 3, [REST, FEED, GROOM_A, GROOM_B], 3),   // act 2: groom B, chosen between two partners; feed was on offer: left
    R(3, 4, [REST, FEED, TRIP], 2),               // act 3: a trip; groom B not on the menu: gone
    R(4, 5, [REST, FEED, DRINK], -1),             // the rules decide (rest, their pick): act 4, the trip ended by the rules
    R(5, 6, [REST, NEST], 1),                     // act 5: the nest; rest was on offer: left; still running at the end
  ];
  const L = animalLedger(1, log, info(false, 0, 6));
  assert.equal(L.acts, 5);
  assert.deepEqual(L.target, { chooser: 1, held: 0, 'slot-cap': 3, none: 1, fallback: 0 }, 'feed, trip and nest each had one target of their kind; the rules\' rest has none');
  assert.deepEqual(L.targetByClass.partner, { chooser: 1, held: 0, 'slot-cap': 0, none: 0, fallback: 0 });
  assert.deepEqual(L.ending, { left: 2, gone: 1, arrived: 0, fallback: 1 });
  assert.equal(L.running, 1);
  assert.deepEqual([L.stayed, L.leftWhenOffered], [1, 2]);
  const lines = linesOf(L);
  assert.equal(lines.target, 1 / 5); assert.equal(lines.targetOfTargeted, 1 / 4); assert.equal(lines.left, 2 / 4); assert.equal(lines.gone, 1 / 4); assert.equal(lines.endedByRules, 1 / 4);
  assert.equal(lines.stayedWhenOffered, 1 / 3);
  assert.deepEqual([L.settled, L.settledTwoKinds, L.settledTwoTargets], [5, 5, 1]);
});

test('a log that holds the gate\'s own lines and the trigger of each ask closes the bracket and names what the saved receipts cannot', () => {
  // what a later run should log (docs/staging/r7-ledger.md, "For the integrator"): a line when the gate keeps or begins an act, and `why` on each ask
  const gate = (t: number, v: number, act: [string, number, string], refusal: 'kept' | 'arrived'): LedgerReceipt => ({ ...R(t, v, [act], 0), by: 'gate', refusal });
  const log = [
    R(0, 1, [REST, FEED, TRIP], 2, { why: 'ended' }),            // the model picks a trip
    gate(1, 2, TRIP, 'kept'),                                    // the gate keeps it: the same act, now a held intention
    gate(2, 3, ['forage', TREE2, 'feed'], 'arrived'),            // the trip becomes feeding at its tree: a new act the gate began
    R(3, 4, [REST, ['forage', TREE2, 'feed'], TRIP], 0, { why: 'need-bucket' }),   // asked because a need crossed a threshold: it leaves
  ];
  const L = animalLedger(1, log, { kernel: 'model', gate: true, t0: 0, t1: 4, focal: [1], gateLogged: true });
  assert.deepEqual([L.kind.chooser.waking, L.kind.held.waking], [120, 120], 'hour 0 to 1 and 3 to 4 under a fresh choice; 1 to 3 under a held intention');
  assert.equal(L.certain.waking, 120, 'nothing is hidden between the lines: no bracket');
  assert.equal(L.hidden, 0);
  assert.equal(L.acts, 3, 'the trip, the feeding the gate began, the rest');
  assert.deepEqual(L.target, { chooser: 0, held: 1, 'slot-cap': 1, none: 1, fallback: 0 }, 'the feeding tree is the held trip\'s');
  assert.deepEqual(L.ending, { left: 1, gone: 0, arrived: 1, fallback: 0 }, 'the trip ended by arriving; the feeding by the model\'s choice');
  assert.deepEqual(L.askedBy, { ended: 1, 'need-bucket': 1 });
  assert.deepEqual(L.leftBy, { 'need-bucket': 1 }, 'and the moment of that choice was a hand-set threshold');
  const lines = linesOf(L);
  assert.deepEqual([lines.kindLow, lines.kindHigh, lines.held, lines.arrived], [0.5, 0.5, 0.5, 0.5]);
});

test('an arm pools its focal animals; an animal with no receipt owns its window as time before the first decision', () => {
  const A = armLedger([R(0, 1, [REST, FEED], 1), { ...R(0, 1, [REST, FEED], 0), id: 2 }], { kernel: 'model', gate: false, t0: 0, t1: 2, focal: [1, 2, 3] });
  assert.equal(A.animals.length, 3);
  assert.equal(A.total.kind.chooser.waking, 240); assert.equal(A.total.kind.before.unknown, 120);
  assert.equal(A.lines.kindHigh, 1); assert.equal(A.lines.dayHigh, 240 / 360);
});

test('names: the configuration is named by its kernel and its adapter\'s teacher', () => {
  assert.equal(truthfulName('model', 'base', ''), 'untuned model on a rules menu');
  assert.equal(truthfulName('model', 'r4-rules-state', 'the rules kernel\'s decisions (rgChoice)'), 'rules-taught model on a rules menu');
  assert.match(truthfulName('model', 'x', null), /teacher not found/);
  assert.match(truthfulName('model', 'r4-field-groom', 'wild grooming choices'), /taught on "wild grooming choices"/);
  assert.match(truthfulName('rules-top', undefined, ''), /no model/); assert.match(truthfulName('random', undefined, ''), /no model/);
  assert.equal(teacherOf('base', []), ''); assert.equal(teacherOf('r4-rules-state', ['/nonexistent']), null);
});

// --- the shadow tap on a built world ---------------------------------------------------------------------------------
const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>, observeV4: 1, menuParity: 1 };
const key = (o: { action: string; target: number }) => `${o.action}:${o.target}`;

test('the tap is off by default and reading through it changes no hash (field map, the working base)', () => {
  assert.deepEqual([offerTap.fn, offerTap.pool], [null, null]);
  const r = runTap({ seed: 48, params, burnIn: 240 / 5760, days: 0.125, check: true });
  assert.equal(r.checkHash, r.endHash, 'the tapped world ends where the untapped one does');
  assert.deepEqual([offerTap.fn, offerTap.pool, rulesTap.fn], [null, null, null], 'and the taps are released');
  const a = r.groups.adults, y = r.groups.young;
  assert.ok(a.n > 300 && y.n > 20, `decision points read: ${a.n} and ${y.n}`);
  assert.equal(a.inconsistent + y.inconsistent, 0, 'the replayed cuts leave exactly the legal list, at every decision point');
  // triggers and verdicts are exhaustive
  for (const g of [a, y]) assert.equal(Object.values(g.trigger).reduce((s, v) => s + v, 0), g.n);
  assert.equal(Object.values(a.why).reduce((s, v) => s + v, 0), a.n);
  assert.ok(!('no verdict' in a.why), 'every decision of an animal aged 8 or over has the gate\'s verdict');
  assert.deepEqual(Object.keys(y.why), ['under 8: the rules\' top option']);
  assert.equal(r.groups.asks.n, Object.entries(a.why).filter(([k]) => !['kept', 'arrived', 'lead', 'phase', 'argmax'].includes(k)).reduce((s, [, v]) => s + v, 0));
  // sizes shrink along the cuts, and the menu never exceeds its cap
  const d = a.dist;
  assert.ok(d.offered.mean >= d.legal.mean && d.legal.mean >= d.perceived.mean && d.perceived.mean >= d.phased.mean && d.phased.mean >= d.menu.mean);
  assert.ok(d.menu.max <= MAX_OPTIONS);
  assert.equal(d.phased.mean, d.perceived.mean, 'no night or dusk menu on the working base (rhythmFreeNight 1)');
});

test('at each decision point every option removed has one cut, and what is left is the legal list and then the menu', () => {
  const w = createWorld(48, { profile: 'field', params });
  for (let i = 0; i < 240; i++) tickWorld(w);
  const before = worldHash(w), seen: { cuts: CutsAt; menu: string[]; request: string[] | null; calls: OfferFate[] }[] = [];
  rulesTap.fn = (c, list, policy) => {
    if (!policy || !c.alive || c.age < 8 || seen.length >= 400) return;
    const calls: OfferFate[] = [];
    offerTap.fn = (_a, _t, _s, _v, _x, fate) => { calls.push(fate); };
    computeCandidates(w, c, []);
    offerTap.fn = null;
    const req = buildRequest(w, c);
    seen.push({ cuts: cutsAt(w, c), menu: rgMenu(w, c, list).map(k => `${k.action}:${k.targetId}`), request: req.options.map(k => `${k.action}:${k.targetId}`), calls });
  };
  try { for (let i = 0; i < 480 && seen.length < 400; i++) tickWorld(w); } finally { rulesTap.fn = null; offerTap.fn = null; }
  assert.ok(seen.length >= 300, `${seen.length} decision points`);
  const plain = createWorld(48, { profile: 'field', params });
  for (let i = 0; i < w.tick; i++) tickWorld(plain);
  assert.equal(worldHash(w), worldHash(plain), 'reading the cuts, the menu and the request wrote nothing');
  assert.notEqual(worldHash(w), before);
  const fates = new Set(seen.flatMap(s => s.calls));
  for (const f of ['kept', 'threshold', 'slot'] as OfferFate[]) assert.ok(fates.has(f), `the tap reported the fate '${f}'`);
  let trips = 0, cutSomething = 0;
  for (const s of seen) {
    const c = s.cuts, removedKeys = CUTS.flatMap(k => c.removed[k].map(key));
    assert.ok(c.consistent);
    assert.equal(new Set(removedKeys).size, removedKeys.length, 'no option is removed by two cuts');
    const inside = CUTS.slice(0, 4).reduce((n, k) => n + c.removed[k].length, 0), after = CUTS.slice(4).reduce((n, k) => n + c.removed[k].length, 0);
    assert.equal(c.offered.length - inside, c.legal.length, 'offered less the cuts inside computeCandidates is the legal list');
    assert.equal(c.legal.length - after, c.menu.length, 'the legal list less the later cuts is the menu');
    assert.equal(c.legal.length - c.removed['perceived-list'].length, c.perceived.length);
    assert.deepEqual(c.menu.map(key).sort(), [...s.menu].sort(), 'the menu is the rules\' own (rg.ts rgMenu)');
    assert.deepEqual(c.menu.map(key).sort(), [...s.request!].sort(), 'and, with menuParity, the menu a kernel is sent (buildRequest)');
    for (const k of removedKeys) assert.ok(!c.menu.some(m => key(m) === k));
    // stages of each class of target never grow, and the possible sets hold the offered trees
    for (const st of [c.feedTrees, c.tripTrees, c.joinTrees, c.waters, c.partners]) assert.ok(st.offered >= st.passed && st.passed >= st.legal && st.legal >= st.perceived && st.perceived >= st.menu);
    assert.ok(c.feedTrees.offered <= c.feedTrees.inView, 'a tree is fed in only if it is in view');
    assert.ok(c.waters.offered <= c.waters.remembered);
    if (c.tripTrees.pool >= 0) { trips++; assert.ok(c.tripTrees.offered <= Math.min(c.tripTrees.pool, 5), 'at most the shortlist of four and the route-chain tree reach offer()'); assert.ok(c.tripTrees.pool <= c.tripTrees.remembered + c.tripTrees.listed); }
    assert.ok(c.widthPossible >= c.targetless);
    if (removedKeys.length) cutSomething++;
  }
  assert.ok(trips > 100 && cutSomething > 100, `${trips} decision points with a trip pool, ${cutSomething} with a cut`);
});

test('the trigger of a decision point and the reading of an interrupt', () => {
  assert.equal(tickTrigger(true, true, 5, 6), 'finished', 'an act that finished early comes first');
  assert.equal(tickTrigger(false, true, 9, 6), 'interrupt');
  assert.equal(tickTrigger(false, false, 6, 6), 'scheduled');
  assert.equal(tickTrigger(false, false, 9, 6), 'cut-short', 'the scheduled end was later: the bout was cut short within the tick');
  assert.equal(tickTrigger(false, false, undefined, 6), 'first');
  assert.equal(tickTrigger(false, false, 6, 6, true), 'cut-short', 'a sleeper\'s nest bout is held a tick ahead: its waking is not a scheduled end');
  assert.equal(tickTrigger(false, true, 6, 6, true), 'interrupt', 'woken by something perceived: the interrupt names it');
  assert.equal(interruptKind('Heard Tavuni\'s travel hoo'), 'a call or travel hoo');
  assert.equal(interruptKind('Kasoko is moving off'), 'a companion moving off');
  assert.equal(interruptKind('Ebini began grooming me'), 'grooming begun on it');
  assert.equal(interruptKind('something else'), 'other');
});

test('the hand-set numbers on the path are read from the parameters and the source, not typed', () => {
  const nums = handNumbers(params, null);
  assert.ok(nums.length >= 15);
  const by = (re: RegExp) => nums.find(n => re.test(n.name))!;
  assert.equal(by(/cap of the menu/).value, String(MAX_OPTIONS));
  assert.equal(by(/score threshold/).value, '-0.4');
  assert.equal(by(/slot caps/).value, '3; 2; 1');
  assert.equal(by(/30 minute limit/).value, '0.5');
  for (const n of nums) assert.ok(n.where.length > 0 && ['always', 'gate on', 'gate off'].includes(n.read));
});

// --- added by the review of the stage (docs/staging/r7-ledger.md §9, amendments 8 to 11) -------------------------------
test('an animal that died inside the window: its minutes end at its last receipt and nobody is credited with the rest', () => {
  const log = [R(0, 1, [REST, FEED], 1), R(2, 2, [REST, FEED], 0)];   // feeding 0 to 2, then rest; it dies soon after hour 2
  const whole = animalLedger(1, log, info(false, 0, 10)), cut = animalLedger(1, log, { ...info(false, 0, 10), end: { 1: 2 } });
  assert.equal(whole.kind.chooser.waking, 600, 'without the end of its window the last choice is credited with 8 hours it did not live');
  assert.equal(cut.kind.chooser.waking, 120, 'with it, only the two hours up to its last receipt');
  assert.equal(linesOf(cut).wakingMin, 120);
  assert.equal(animalLedger(1, [], { ...info(false, 0, 10), end: { 1: 4 } }).kind.before.unknown, 240, 'no receipt at all: the time before its death is still "before the first receipt"');
  assert.equal(animalLedger(1, log, { ...info(false, 0, 10), end: { 2: 2 } }).kind.chooser.waking, 600, 'another animal\'s death changes nothing');
});

test('the arm files\' own list of deaths ends a focal animal\'s window; the numbers file names it and each row carries its seeds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'r7-ledger-')), s = join(dir, 's48');
  try {
    mkdirSync(s);
    const arm = (deaths: { id: number; cause: string }[]) => ({ seed: 48, burnIn: 30, days: 1, params: {}, head: 'test', focal: [{ id: 1, cls: 'adult male' }, { id: 2, cls: 'female, other' }],
      result: { spec: { kernel: 'gliner', adapter: 'base' }, endHash: 'x', dayHashes: ['x'], deaths, rows: [], decisions: [] } });
    const t0 = 30 * 24, lines = [R(t0, 1, [REST, FEED], 1), { ...R(t0, 1, [REST, FEED], 1), id: 2 }, { ...R(t0 + 6, 2, [REST, FEED], 0), id: 2 }];   // animal 2 is last heard of 6 hours in
    writeFileSync(join(s, 'untuned.json'), JSON.stringify(arm([{ id: 2, cause: 'illness' }, { id: 77, cause: 'old age' }])));
    writeFileSync(join(s, 'untuned.receipts.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
    writeFileSync(join(s, 'argmax.json'), JSON.stringify({ ...arm([]), result: { ...arm([]).result, spec: { kernel: 'argmax' } } }));
    writeFileSync(join(s, 'argmax.receipts.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
    const e = armEntry(dir, [48, 7], 'untuned', [])!;
    assert.deepEqual(e.died, [{ seed: 48, id: 2, cls: 'female, other', lastReceiptH: t0 + 6, cause: 'illness' }], 'the focal animal the file lists as dead; an animal outside the focal group is not this ledger\'s');
    assert.deepEqual([e.fromDay, e.toDay, e.seeds, e.animals], [30, 31, [48], 2], 'the window and the seeds actually found are read from the files');
    assert.equal(e.total.kind.chooser.waking, 1440 + 360, 'animal 1 the whole day, animal 2 the six hours to its last receipt');
    assert.equal(armEntry(dir, [48], 'argmax', [])!.total.kind.chooser.waking, 2 * 1440, 'the same log with no death listed runs to the window\'s end');
    const md = reportMarkdown(receiptsLedger([{ name: 'pilot', dir, seeds: [48, 7] }], []), [], null, params);
    assert.match(md, /died inside their window[^\n]*untuned model, gate off, pilot, seed 48: animal 2 \(female, other; illness\), last receipt on day 30\.25 of a window that ends on day 31/);
    assert.match(md, /### pilot: the training seeds, days 30 to 31 \(seeds 48, 7;/, 'the days of the window come from the arm files');
    assert.match(md, /\| untuned model, gate off \| untuned model on a rules menu \|[^\n]*\| 3 \| 48; 2 \|/, 'a configuration found on one seed of two says so in its row');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the reading of an interrupt, on the simulation\'s own reason texts', () => {
  // the texts of src/sim's interrupt() calls, with a name in place of the animal
  assert.equal(interruptKind('Nobody came along'), 'nobody came along', 'a failed departure is not a companion coming');
  assert.equal(interruptKind('Tavuni gave alarm hoos'), 'a call or travel hoo');
  assert.equal(interruptKind('Tavuni gave a travel hoo'), 'a call or travel hoo');
  assert.equal(interruptKind('heard 2 strangers pant-hoot'), 'a call or travel hoo');
  assert.equal(interruptKind('Ebini moved away'), 'a companion moving off');
  assert.equal(interruptKind('Kasoko set off'), 'a companion moving off');
  assert.equal(interruptKind('Kasoko is heading out on patrol'), 'a companion moving off');
  assert.equal(interruptKind('Kasoko approaches to mate'), 'a companion approaching');
  assert.equal(interruptKind('Kasoko is charging at me'), 'a display, charge or attack');
  assert.equal(interruptKind('heard Kasoko scream'), 'a display, charge or attack');
  assert.equal(interruptKind('strangers from the Eastern in sight'), 'weather, strangers or other animals');
  assert.equal(interruptKind('heavy rain started'), 'weather, strangers or other animals');
  // every reason text in the source is read by this list: a new interrupt() text must be added here and to interruptKind
  const texts = new Set<string>();
  for (const f of readdirSync('src/sim').filter(n => n.endsWith('.ts'))) for (const m of readFileSync(join('src/sim', f), 'utf8').matchAll(/\binterrupt\(world, [^,]+, (?:[a-zA-Z]+ \? )?([`'])((?:(?!\1).)*)\1/g)) texts.add(m[2]);
  assert.ok(texts.size >= 30, `${texts.size} interrupt texts found in src/sim`);
  assert.ok(texts.has('Nobody came along') && [...texts].some(t => t.endsWith('gave alarm hoos')) && [...texts].some(t => t.endsWith('moved away')));
});
