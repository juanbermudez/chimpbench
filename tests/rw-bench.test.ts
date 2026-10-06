// Stage RW bench (docs/staging/rw-bench-prereg.md §9 and amendment A2): the wild-choice test harness on SYNTHETIC
// records only. No field record is read, no model is loaded, the GLiNER worker and the Codex executable are fakes, and
// nothing leaves this computer.
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codexArgs, codexKernel, readCodexAnswer, tokensUsed } from '../scripts/lib/rw-codex';
import { logOpening, recordIdsHash, splitRuleHash, wildChoices } from '../scripts/lib/rw-load';
import { buildCodexPrompt, buildWildQuestion, CODEX_SCHEMA, packetSizes, wildGlinerKernel, WILD_TOKEN_BUDGET } from '../scripts/lib/rw-serialize';
import { glinerKernel } from '../scripts/lib/kernels';
import type { ScoreItem, Scorer } from '../scripts/ft-society';
import { hashOf, heldOutFocal, parseCsv, toRows } from '../scripts/rw-ngogo-choices';
import { markdown, REGISTERED, scoreKernel, sizeReport } from '../scripts/rw-score';
import { mulberry32 } from '../src/compare/sampling';
import { nullKernel } from '../src/kernel/kernels';
import { KernelError, type KernelRequest } from '../src/kernel/types';
import { ruleKernel, WILD_RULES, type WildKernel } from '../src/rw/kernels';
import { compromisedFor, flagCompromised, manifestError, type CompromisedList, type KernelManifest } from '../src/rw/manifest';
import { buildWildPacket, HISTORY_MAX, NAME_POOL, NEUTRAL, P_EITHER, rankLine, readRankLine, wildFacts, WILD_LIMITS, wildRequestError, type WildChoice } from '../src/rw/packet';
import { clusterStats, orderSensitivity, runKernel, scoreAnswer, summarizeRun, type RecordScore } from '../src/rw/score';
import { decisionContextError, MAX_OPTIONS, SIM_LIMITS } from '../src/sim/context-check';

// Made-up two-letter codes (as in tests/rw-ngogo-choices.test.ts): training animals, one development animal, one held out.
const codes: string[] = [];
for (const a of 'abcdefghijklmnopqrstuvwxyz') for (const b of 'abcdefghijklmnopqrstuvwxyz') codes.push(a + b);
const TRAIN = codes.filter(c => hashOf(c) >= 2).slice(0, 12), [F, P, Q, R, S] = TRAIN, H = codes.find(heldOutFocal)!;
const HEAD = 'date,code,prox2,prox5,gdyad,party,year,season,grooming,groomer,groomee,focal_id,scan_id';
interface Line { date?: string; code?: string; prox2?: string; prox5?: string; gdyad?: string; party?: string; year?: number; focal: number; scan: number }
const q = (v: string | undefined) => v === undefined ? 'NA' : v.includes(',') ? `"${v}"` : v;
const csv = (lines: Line[]) => [HEAD, ...lines.map(l => [l.date ?? '6/1/01', l.code ?? F, q(l.prox2), q(l.prox5), q(l.gdyad), q(l.party), l.year ?? 2001, l.year ?? 2001, q(l.gdyad), 'NA', 'NA', l.focal, l.scan].join(','))].join('\n') + '\n';
const load = (lines: Line[]) => toRows(parseCsv(csv(lines)));
/** One empty scan each, long before: puts the partners on the roster of mature males (the focal codes). */
const onRoster = (cs: string[]): Line[] => cs.map((code, i) => ({ focal: 9000 + i, scan: 1, code, date: '1/5/99', year: 1999 }));
const session = (focal: number, at: Record<number, Partial<Line>>, base: Partial<Line> = {}): Line[] => [1, 2, 3, 4, 5, 6, 7].map(scan => ({ focal, scan, ...base, ...(scan === 1 ? {} : { party: undefined }), ...(at[scan] ?? {}) }));

/** A hand-made choice: `set` in the order "the observer wrote", the label first unless told otherwise. */
function choice(n: number, over: Partial<WildChoice> = {}): WildChoice {
  const set = Array.from({ length: n }, (_, i) => codes[100 + i]);
  return { key: `s${n}#3`, focal: 'zz', part: 'train', partStratum: 'train', preceded: 'fresh', set, labels: [set[0]], prev: null, earlier: { iGroomed: [], groomedBy: [] }, given: {}, received: {}, near: {}, ...over };
}
/** Many synthetic sessions of training animals, through the parser: random parties, proximity and grooming. */
function synthetic(seed: number, sessions = 90): Line[] {
  const rng = mulberry32(seed), pick = <T>(a: T[]) => a[Math.floor(rng() * a.length)], some = <T>(a: T[], n: number) => [...a].sort(() => rng() - 0.5).slice(0, n), lines: Line[] = [];
  for (let s = 0; s < sessions; s++) {
    const day = Math.floor(s / 2), focal = TRAIN[(s * 5 + Math.floor(rng() * 3)) % 9], others = TRAIN.filter(c => c !== focal);
    const party = some(others.slice(0, 10), 2 + Math.floor(rng() * 7)), date = `${1 + Math.floor((day % 300) / 25)}/${1 + (day % 25)}/01`, year = 2001 + Math.floor(day / 300);
    lines.push(...session(s + 1, Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map(scan => {
      const near = rng() < 0.5 ? some(party, Math.floor(rng() * 3)) : null, ring = near && rng() < 0.6 ? some(party.filter(c => !near.includes(c)), Math.floor(rng() * 3)) : null;
      const partner = rng() < 0.9 ? pick(party) : pick(others), u = rng(), gdyad = rng() < 0.4 ? (u < 0.5 ? `${focal},${partner}` : u < 0.8 ? `${partner},${focal}` : `${focal}=${partner}`) : undefined;
      return [scan, { prox2: near?.length ? near.join(',') : undefined, prox5: ring?.length ? ring.join(',') : undefined, gdyad }];
    })), { code: focal, date, year, party: party.join(',') }));
  }
  return lines;
}
const packetText = (c: WildChoice, o: { seed?: number; shuffle?: number } = {}) => JSON.stringify(buildWildPacket(c, o).request);
const env = { random: () => 0.5 };

// ---------------------------------------------------------------------------------------------------------------------
// The request validation and the wide menu
// ---------------------------------------------------------------------------------------------------------------------

test('the validation\'s default limits are the simulation\'s; only the wide limits admit a wide partner-choice menu', () => {
  assert.deepEqual(SIM_LIMITS, { options: MAX_OPTIONS, social: 8 });
  assert.equal(MAX_OPTIONS, 8, 'the simulation\'s cap is unchanged');
  const wide = buildWildPacket(choice(20)).request, small = buildWildPacket(choice(8)).request;
  assert.equal(decisionContextError(wide.context), 'social percepts', 'the default check refuses more than 8 individuals');
  assert.equal(decisionContextError({ ...wide.context, social: wide.context.social.slice(0, 8) }), 'option count', 'and more than 8 options');
  assert.equal(decisionContextError(wide.context, WILD_LIMITS), '');
  assert.equal(decisionContextError(wide.context, SIM_LIMITS), 'social percepts');
  assert.equal(decisionContextError(small.context), '', 'a wild request of 8 or fewer passes the simulation\'s own check');
  assert.equal(wildRequestError(wide), '');
  assert.throws(() => buildWildPacket(choice(77)), /a set of 77/, 'more than the roster allows');
  assert.throws(() => buildWildPacket(choice(1)), /a set of 1/, 'no choice');
  // the wide limits are for partner choice only
  const other = structuredClone(wide); other.context.candidates[0].action = 'rest'; other.context.candidates[0].targetId = -1; other.options = other.context.candidates;
  assert.equal(decisionContextError(other.context, WILD_LIMITS), '', 'the shared check knows nothing of the benchmark');
  assert.equal(wildRequestError(other), 'not a partner-choice menu');
});

test('a wild packet: one groom option per male, ids and names per record, every masked field at its neutral value', () => {
  const c = choice(12, { prev: { near2: [codes[101]], near5: [codes[102]], groomedBy: [codes[103]], iGroomed: [], grooming: [codes[103]] }, given: { [codes[101]]: 3, [codes[104]]: 1 }, received: { [codes[101]]: 1 }, near: { [codes[105]]: 4 } });
  const p = buildWildPacket(c), r = p.request, ctx = r.context;
  assert.equal(wildRequestError(r), '');
  assert.deepEqual([r.rulesIndex, r.options.length, ctx.social.length, ctx.environment.partyAdultMales, ctx.environment.partySize], [-1, 12, 12, 13, 13]);
  assert.ok(r.options.every((o, i) => o.action === 'groom' && o.targetId === i + 2 && o.score === 0 && o.reason === '' && ctx.social[i].id === i + 2));
  assert.deepEqual([...p.order].sort(), [...c.set].sort(), 'every male of the set, once');
  assert.deepEqual(p.labels, [p.order.indexOf(codes[100])]);
  const names = [ctx.focal.name, ...ctx.social.map(s => s.name)];
  assert.ok(names.every(n => NAME_POOL.includes(n)) && new Set(names).size === 13);
  assert.equal(new Set(NAME_POOL).size, 80);
  assert.deepEqual([ctx.focal.sex, ctx.focal.stage, ctx.focal.community, ctx.time, ctx.version, ctx.stimuli.length], ['male', 'adult', 'Ngogo', 0, 0, 0]);
  for (const [k, v] of Object.entries(NEUTRAL.focal)) assert.deepEqual((ctx.focal as unknown as Record<string, unknown>)[k], v, `focal.${k}`);
  for (const [k, v] of Object.entries(NEUTRAL.environment)) assert.deepEqual((ctx.environment as unknown as Record<string, unknown>)[k], v, `environment.${k}`);
  // unmasked: nearness and grooming at the previous scan; everything else about an individual is neutral
  const at = (code: string) => ctx.social[p.order.indexOf(code)];
  assert.deepEqual([at(codes[101]).distance, at(codes[102]).distance, at(codes[103]).distance, at(codes[103]).action, at(codes[101]).action], [1, 3.5, 10, 'groom', 'rest']);
  assert.deepEqual(r.mask.individual[at(codes[101]).id], ['action']);
  assert.deepEqual(r.mask.individual[at(codes[103]).id], ['distance']);
  assert.deepEqual(r.mask.individual[at(codes[106]).id], ['distance', 'action']);
  assert.ok(ctx.social.every(s => s.relation === 'community' && s.bond === 0 && s.rankOrder === 0 && s.tension === undefined && s.sex === 'male' && s.stage === 'adult'));
  assert.ok(ctx.body === undefined && ctx.light === undefined);
  // history is ranks, never counts
  const N = (code: string) => at(code).name;
  assert.deepEqual(ctx.recent, [`Last scan: groomed by ${N(codes[103])}`]);
  assert.deepEqual(ctx.history, [`Groomed with, most first: ${N(codes[101])}, ${N(codes[104])}`, `I groomed, most first: ${N(codes[101])}, ${N(codes[104])}`, `Often near me, most first: ${N(codes[105])}`]);
  assert.ok(!/\d/.test(ctx.history!.join(' ')), 'no count in a history line');
  // a changed masked field is caught; an unmasked one is information
  const bad = (f: (x: typeof r) => void) => { const x = structuredClone(r); f(x); return wildRequestError(x); };
  assert.equal(bad(x => { x.context.focal.hunger = 0.9; }), 'masked focal field is not neutral');
  assert.equal(bad(x => { x.context.environment.weather = 'rain'; }), 'masked environment field is not neutral');
  assert.equal(bad(x => { x.context.environment.partySize = 30; }), 'masked environment field is not neutral');
  assert.equal(bad(x => { at(codes[106]); x.context.social[p.order.indexOf(codes[106])].bond = 0.7; }), 'masked individual field is not neutral');
  assert.equal(bad(x => { x.context.social[p.order.indexOf(codes[106])].distance = 1; }), 'masked individual field is not neutral');
  assert.equal(bad(x => { x.context.social[p.order.indexOf(codes[106])].tension = 0.4; }), 'masked individual field is not neutral');
  assert.equal(bad(x => { x.context.candidates[0].score = 2; x.options = x.context.candidates; }), 'masked option field is not neutral');
  assert.equal(bad(x => { x.context.stimuli = ['A stranger called']; }), 'masked stimuli present');
  assert.equal(bad(x => { x.context.time = 5; }), 'masked context field is not neutral');
  assert.equal(bad(x => { x.context.social[p.order.indexOf(codes[101])].distance = 3.5; }), '', 'an unmasked distance is data');
  assert.equal(bad(x => { delete (x as { mask?: unknown }).mask; }), 'no mask');
});

test('the packet holds no code, date, year or session id, and does not change with the written order, the future or the label', () => {
  const party = `${P},${Q},${R},${S}`, before = [
    ...onRoster([P, Q, R, S]), ...session(1, { 2: { gdyad: `${F},${Q}`, prox2: Q }, 5: { gdyad: `${R},${F}` } }, { date: '6/1/01', party }),
    ...session(2, { 2: { prox2: R, prox5: S, gdyad: `${S},${F}` }, 3: { gdyad: `${F},${P}`, prox2: P } }, { date: '6/2/01', party }),
  ];
  const pick = (lines: Line[]) => wildChoices(load(lines), 'train').find(c => c.key === '2#3')!;
  const base = pick(before), text = packetText(base), packet = buildWildPacket(base);
  assert.deepEqual([base.labels, base.preceded, base.set.length], [[P], 'continuation', 4]);
  assert.deepEqual(base.prev, { near2: [R], near5: [S], groomedBy: [S], iGroomed: [], grooming: [S] });
  assert.deepEqual([base.given[Q], base.received[R], base.received[S], base.near[Q], base.near[R]], [1, 1, 1, 1, 1], 'earlier days and earlier scans of the session');
  for (const c of [F, P, Q, R, S]) assert.ok(!new RegExp(`\\b${c}\\b`, 'i').test(text), `code ${c} in the packet`);
  assert.ok(!/\d+\/\d+/.test(text) && !/\b(19|20)\d\d\b/.test(text) && !text.includes('2#3') && !text.includes('"key"'), 'no date, year or record key');
  // the order the observer wrote
  const rewritten = before.map(l => l.party ? { ...l, party: `${S},${R},${Q},${P}` } : l);
  assert.equal(packetText(pick(rewritten)), text);
  // the future: later scans, a later day, and another session of the same day (its order within the day is unknown)
  const future = [...before.map(l => l.focal === 2 && l.scan > 3 ? { ...l, gdyad: `${F},${Q}`, prox2: Q } : l),
    ...session(3, { 2: { gdyad: `${F},${R}`, prox2: R }, 3: { gdyad: `${F},${R}` } }, { date: '6/2/01', party }), ...session(4, { 2: { gdyad: `${F},${S}` } }, { date: '6/3/01', party })];
  assert.equal(packetText(pick(future)), text);
  // the decision scan itself: another partner and another neighbour give the same packet, with the label elsewhere
  const relabelled = pick(before.map(l => l.focal === 2 && l.scan === 3 ? { ...l, gdyad: `${F},${Q}`, prox2: Q } : l));
  assert.deepEqual(relabelled.labels, [Q]);
  assert.equal(packetText(relabelled), text);
  assert.notDeepEqual(buildWildPacket(relabelled).labels, packet.labels);
  // an earlier day does change it (history is input)
  assert.notEqual(packetText(pick(before.map(l => l.focal === 1 && l.scan === 2 ? { ...l, gdyad: `${F},${S}` } : l))), text);
});

test('the option order is a seeded shuffle: a pure function of seed, shuffle and record; names stay fixed across shuffles', () => {
  const c = choice(15), a = buildWildPacket(c), b = buildWildPacket({ ...c, set: [...c.set].reverse() });
  assert.deepEqual(a, b, 'the written order cannot enter');
  assert.deepEqual(buildWildPacket(c, { seed: 20261006, shuffle: 0 }), a, 'the defaults are recorded');
  const k1 = buildWildPacket(c, { shuffle: 1 }), s2 = buildWildPacket(c, { seed: 7 }), other = buildWildPacket({ ...c, key: 'other#1' });
  assert.notDeepEqual(k1.order, a.order); assert.notDeepEqual(s2.order, a.order); assert.notDeepEqual(other.order, a.order);
  const nameOf = (p: typeof a) => new Map(p.order.map((code, i) => [code, p.request.context.social[i].name]));
  assert.deepEqual([...nameOf(k1)].sort(), [...nameOf(a)].sort(), 'the same male keeps his name under another shuffle');
  assert.equal(k1.request.context.focal.name, a.request.context.focal.name);
  assert.notDeepEqual([...nameOf(other)].sort(), [...nameOf(a)].sort(), 'and has another name in another record');
});

test('after the shuffle the first option scores chance, although the label is always written first', async () => {
  const rng = mulberry32(5), many = Array.from({ length: 600 }, (_, i) => choice(2 + Math.floor(rng() * 12), { key: `k${i}#1`, focal: `f${i % 30}` }));
  const first = await runKernel(ruleKernel('first-option'), many), s = summarizeRun(first, 200);
  const chance = many.reduce((a, c) => a + 1 / c.set.length, 0) / many.length, se = Math.sqrt(chance * (1 - chance) / many.length);
  assert.ok(Math.abs(s.top1.value! - chance) < 4 * se, `first option ${s.top1.value} against chance ${chance.toFixed(3)}`);
  assert.equal(s.chance.value, Math.round(chance * 1000) / 1000);
  // label positions are spread evenly over the list
  const rel = many.filter(c => c.set.length >= 6).map(c => { const p = buildWildPacket(c); return p.labels[0] / (p.order.length - 1); });
  assert.ok(Math.abs(rel.reduce((a, b) => a + b, 0) / rel.length - 0.5) < 0.06);
});

// ---------------------------------------------------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------------------------------------------------

test('scores of one answer: ties split, expected reciprocal rank, log loss, the answer check', () => {
  const p = buildWildPacket(choice(4)), L = p.labels[0], probs = (f: (i: number) => number) => [0, 1, 2, 3].map(f);
  const at = (i: number, v: number, rest: number) => probs(j => j === i ? v : rest);
  const hit = scoreAnswer({ index: L, probabilities: at(L, 0.7, 0.1) }, p, true);
  assert.deepEqual([hit.hit, hit.tieHit, hit.rr, hit.refused], [1, 1, 1, '']);
  assert.ok(Math.abs(hit.nll! - -Math.log(0.7)) < 1e-12);
  const other = (L + 1) % 4, miss = scoreAnswer({ choice: `c${other}`, probabilities: at(other, 0.7, 0.1) }, p, true);
  assert.deepEqual([miss.hit, miss.tieHit, miss.index], [0, 0, other]);
  assert.ok(Math.abs(miss.rr - (1 / 2 + 1 / 3 + 1 / 4) / 3) < 1e-12, 'the partner is tied over places 2 to 4');
  const flat = scoreAnswer({ index: other, probabilities: probs(() => 0.25) }, p, true);
  assert.deepEqual([flat.hit, flat.tieHit], [0, 0.25], 'a uniform answer: ties split is chance whatever was drawn');
  assert.ok(Math.abs(flat.rr - (1 + 1 / 2 + 1 / 3 + 1 / 4) / 4) < 1e-12 && Math.abs(flat.nll! - Math.log(4)) < 1e-12);
  assert.equal(scoreAnswer({ index: L, probabilities: at(L, 1, 0) }, p, false).nll, null, 'no log loss for probabilities that only rank');
  assert.ok(Math.abs(scoreAnswer({ index: other, probabilities: at(other, 1, 0) }, p, true).nll! - -Math.log(1e-9)) < 1e-9, 'floored');
  assert.equal(scoreAnswer({ index: L, probabilities: at(L, 0.5, 0.4) }, p, true).nll, null, 'not a distribution');
  assert.deepEqual([scoreAnswer({ index: L, probabilities: at(L, 0.6, 0.2) }, p, true).relPos, L / 3].map(v => Math.round(v! * 1e6)), [L / 3, L / 3].map(v => Math.round(v * 1e6)));
  for (const bad of [{ index: 9, probabilities: probs(() => 0.25) }, { index: L }, { index: L, probabilities: [0.5, 0.5] }, { index: L, probabilities: probs(() => NaN) }, null, 'c1'])
    assert.deepEqual([scoreAnswer(bad, p, true).refused, scoreAnswer(bad, p, true).hit, scoreAnswer(bad, p, true).rr], ['invalid-answer', 0, 0]);
});

test('the scorer runs sync and async kernels; a throwing kernel and a bad answer are misses, counted as refused', async () => {
  const many = Array.from({ length: 40 }, (_, i) => choice(5, { key: `k${i}#1`, focal: `f${i % 4}` }));
  const oracleOf = (async_: boolean): WildKernel => ({ id: 'oracle', label: 'test oracle', decide(request) {
    // the test's oracle reads the label through a side door no real kernel has: the packet it is given is rebuilt here
    const c = many.find(m => buildWildPacket(m).request.context.focal.name === request.context.focal.name && JSON.stringify(buildWildPacket(m).request) === JSON.stringify(request))!;
    const index = buildWildPacket(c).labels[0], answer = { index, probabilities: request.options.map((_, i) => +(i === index)) };
    return async_ ? new Promise(r => setTimeout(() => r(answer), 1)) : answer;
  } });
  for (const async_ of [false, true]) {
    const s = summarizeRun(await runKernel(oracleOf(async_), many, { concurrency: async_ ? 8 : 1 }), 100);
    assert.deepEqual([s.top1.value, s.top1Ties.value, s.mrr.value, s.refused, s.records, s.animals], [1, 1, 1, 0, 40, 4]);
  }
  let n = 0;
  const flaky: WildKernel = { id: 'flaky', label: 'test', decide(request) { n++; if (n % 4 === 0) throw new KernelError('down'); if (n % 4 === 1) return { index: 99 }; return nullKernel.decide(request, env); } };
  const scores = await runKernel(flaky, many, { distribution: true }), s = summarizeRun(scores, 100);
  assert.equal(s.refused, 20);
  assert.deepEqual([...new Set(scores.filter(x => x.refused).map(x => x.refused))].sort(), ['invalid-answer', 'kernel-error: down']);
  assert.ok(scores.filter(x => x.refused).every(x => x.hit === 0 && x.picked === null && x.nll === null));
  assert.ok(Math.abs(s.logLoss!.value! - Math.round(Math.log(5) * 1000) / 1000) < 1e-9, 'log loss over the answered records');
});

test('intervals resample focal males, not records', () => {
  const rec = (focal: string, hit: number, i: number): RecordScore => ({ key: `${focal}${i}`, focal, picked: null, setSize: 4, preceded: 'fresh', partStratum: 'train', refused: '', index: 0, hit, tieHit: hit, rr: hit, nll: null, chance: 0.25, relPos: 0, lineCut: false, conf: 0.5, calls: 1 });
  const two = [...Array.from({ length: 50 }, (_, i) => rec('a', 1, i)), ...Array.from({ length: 50 }, (_, i) => rec('b', 0, i))];
  const s = clusterStats(two, { top1: x => x.hit }, 500).stats.top1;
  assert.deepEqual([s.value, s.ci, s.perAnimal], [0.5, [0, 1], 0.5], 'two males: the interval is the whole range; 100 independent records would give about 0.4 to 0.6');
  // an unbalanced male moves the pooled figure, not the per-male mean
  const lop = [...Array.from({ length: 90 }, (_, i) => rec('a', 1, i)), ...Array.from({ length: 10 }, (_, i) => rec('b', 0, i))];
  assert.deepEqual([clusterStats(lop, { top1: x => x.hit }, 50).stats.top1.value, clusterStats(lop, { top1: x => x.hit }, 50).stats.top1.perAnimal], [0.9, 0.5]);
  const sized = summarizeRun([...two, rec('c', 1, 0)].map((x, i) => ({ ...x, setSize: i % 2 ? 3 : 20 })), 50);
  assert.deepEqual(sized.bySetSize.map(b => [b.cut, b.records]), [['2 to 4', 50], ['17 and over', 51], ['8 or fewer', 50], ['more than 8', 51]]);
});

test('the null kernel gives chance; the rule kernels give the parser\'s own expected hits, record by record, from the packet alone', async t => {
  const choices = wildChoices(load(synthetic(11)), 'train');
  assert.ok(choices.length >= 60, `${choices.length} synthetic choices`);
  assert.ok(choices.some(c => c.prev?.groomedBy.length) && choices.some(c => c.prev?.near2.length) && choices.some(c => c.earlier.iGroomed.length) && choices.some(c => c.preceded === 'unknown'), 'every kind of record is in the sample');
  const nul = await scoreKernel(nullKernel, choices, { seed: 20261006, shuffles: 5, reps: 200, distribution: true });
  assert.deepEqual([nul.summary.top1Ties.value, nul.registered?.reproduced, nul.registered?.recordsThatDiffer], [nul.summary.chance.value, true, 0], 'ties split: exactly chance');
  const chance = choices.reduce((a, c) => a + 1 / c.set.length, 0) / choices.length, n = choices.length * 5;
  assert.ok(Math.abs(nul.order!.top1Mean! - chance) < 4 * Math.sqrt(chance * (1 - chance) / n), `the draws: ${nul.order!.top1Mean} against ${chance.toFixed(3)}`);
  assert.ok(Math.abs(nul.summary.logLoss!.value! - choices.reduce((a, c) => a + Math.log(c.set.length), 0) / choices.length) < 0.001);
  assert.ok(Math.abs(nul.order!.meanRelativePosition! - 0.5) < 0.08);
  for (const id of Object.keys(WILD_RULES).filter(k => k !== 'first-option')) {
    const run = await scoreKernel(ruleKernel(id), choices, { seed: 20261006, shuffles: 3, reps: 200, distribution: false });
    assert.deepEqual([run.registered?.rule, run.registered?.reproduced, run.registered?.recordsThatDiffer], [REGISTERED[id], true, 0], id);
    assert.equal(run.summary.logLoss, null, 'a rule\'s probabilities only rank');
    assert.equal(run.summary.refused, 0);
    // the rule's tied set does not depend on the option order: ties split is identical under every shuffle
    for (const k of [1, 2]) { const again = await runKernel(ruleKernel(id), choices, { shuffle: k }); assert.ok(again.every((s, i) => Math.abs(s.tieHit - choices[i].base![REGISTERED[id]]) < 1e-9), `${id}, shuffle ${k}`); }
    t.diagnostic(`${id}: ties split ${run.summary.top1Ties.value} = parser ${run.registered!.value}; answered option ${run.summary.top1.value}`);
  }
  // the rules differ from each other and from chance on this sample (the comparison is not vacuous)
  const kinds = new Set(choices.map(c => ['pastGiven', 'nearestPrev', 'groomedMePrev', 'stack'].map(k => c.base![k].toFixed(3)).join(' ')));
  assert.ok(kinds.size > 20, `${kinds.size} distinct patterns of expected hits`);
  // a kernel reads the packet: facts round-trip
  const c = choices.find(x => x.prev?.groomedBy.length && x.prev.near2.length)!, p = buildWildPacket(c), facts = wildFacts(p.request);
  assert.deepEqual(facts.map(f => f.groomedMe), p.order.map(code => c.prev!.groomedBy.includes(code)));
  assert.deepEqual(facts.map(f => f.near), p.order.map(code => c.prev!.near2.includes(code) ? 2 : c.prev!.near5.includes(code) ? 1 : 0));
  assert.deepEqual(facts.map(f => f.given === Infinity), p.order.map(code => !(c.given[code] > 0)));
});

test('a history line longer than the limit is cut at a whole rank, stays inside the limit and is counted', async () => {
  const names = NAME_POOL.slice(0, 40), all = names.map((name, i) => ({ name, count: 100 - i }));
  const full = rankLine(P_EITHER, all.slice(0, 5), HISTORY_MAX);
  assert.deepEqual([full.cut, full.line], [false, `${P_EITHER}${names.slice(0, 5).join(', ')}`]);
  assert.deepEqual(rankLine(P_EITHER, [{ name: 'Nasi', count: 0 }], HISTORY_MAX), { line: '', cut: false });
  const cut = rankLine(P_EITHER, all, HISTORY_MAX), read = readRankLine(cut.line, P_EITHER);
  assert.ok(cut.cut && cut.line.length <= HISTORY_MAX && cut.line.endsWith(', others') && read.cut);
  assert.deepEqual([...read.rank.keys()], names.slice(0, read.rank.size), 'the ranks kept are the first ones, whole');
  assert.ok(read.rank.size >= 14);
  // ties: a rank is kept whole or not at all; a first rank too long for the line keeps the names that fit
  const tied = rankLine(P_EITHER, [{ name: 'Nasi', count: 9 }, ...names.slice(1, 30).map(name => ({ name, count: 1 }))], HISTORY_MAX);
  assert.deepEqual([tied.line, tied.cut], [`${P_EITHER}Nasi, others`, true]);
  const flat = rankLine(P_EITHER, names.map(name => ({ name, count: 1 })), HISTORY_MAX);
  assert.ok(flat.cut && flat.line.length <= HISTORY_MAX && flat.line.includes('=') && !flat.line.slice(P_EITHER.length, -', others'.length).includes(', '));
  assert.deepEqual(readRankLine(`${P_EITHER}Nasi, Kugu=Gusu, Tuza`, P_EITHER), { rank: new Map([['Nasi', 0], ['Kugu', 1], ['Gusu', 1], ['Tuza', 2]]), cut: false });
  // in a packet: still a valid request, and the cut is reported
  const c = choice(40), wide = { ...c, given: Object.fromEntries(c.set.map((code, i) => [code, 50 - i])) }, p = buildWildPacket(wide);
  assert.deepEqual(p.cut, ['groomed with', 'I groomed']);
  assert.equal(wildRequestError(p.request), '');
  assert.ok(p.request.context.history!.every(l => l.length <= HISTORY_MAX));
  assert.equal(summarizeRun(await runKernel(nullKernel, [wide, choice(3)]), 20).withACutLine, 1);
});

// ---------------------------------------------------------------------------------------------------------------------
// The sealed part
// ---------------------------------------------------------------------------------------------------------------------

test('the held-out part is refused unless opened; a default load cannot depend on a held-out outcome; an opening is logged', () => {
  const party = `${P},${Q},${R}`, open = [...onRoster([P, Q, R]), ...session(1, { 3: { gdyad: `${F},${P}` } }, { party })];
  const heldA = session(2, { 3: { gdyad: `${H},${P}` } }, { code: H, date: '5/1/01', party }), heldB = session(2, { 4: { gdyad: `${H},${Q}`, prox2: Q } }, { code: H, date: '5/1/01', party: `${Q},${R}` });
  assert.throws(() => wildChoices(load([...open, ...heldA]), 'held-out'), /sealed/);
  assert.throws(() => wildChoices(load([...open, ...heldA]), 'held-out', { opened: false }), /sealed/);
  const a = wildChoices(load([...open, ...heldA]), 'train'), b = wildChoices(load([...open, ...heldB]), 'train');
  assert.deepEqual(a, b, 'held-out outcomes are blanked at load');
  assert.equal(a.length, 1);
  assert.deepEqual(wildChoices(load([...open, ...heldA]), 'train', { opened: true }), a, 'an opening does not reach the open parts');
  // opened (synthetic rows): the record exists, with history from all earlier sessions or from the open parts only
  const earlier = session(3, { 2: { gdyad: `${H},${Q}` } }, { code: H, date: '4/1/01', party }), rows = load([...earlier, ...open, ...heldA]);
  const [, late] = wildChoices(rows, 'held-out', { opened: true }), [, lateOpen] = wildChoices(rows, 'held-out', { opened: true, history: 'open' });
  assert.deepEqual([late.key, late.part, late.given[Q], lateOpen.given[Q]], ['2#3', 'held-out', 1, 0]);
  // the log: written by the opening, one line, a real reason
  const dir = mkdtempSync(join(tmpdir(), 'rw-seal-')), log = join(dir, 'log.md');
  writeFileSync(log, '| date | reason | kernels | commit |\n| --- | --- | --- | --- |\n');
  assert.throws(() => logOpening('test', ['null'], 'abc1234', log), /needs a reason/);
  assert.throws(() => logOpening('--kernels null', ['null'], 'abc1234', log), /needs a reason/);
  const line = logOpening('unit test of the log | synthetic rows', ['null', 'stack'], 'abc1234', log, new Date('2026-10-06T12:00:00Z'));
  assert.equal(line, '| 2026-10-06 | unit test of the log / synthetic rows | null, stack | abc1234 |');
  assert.ok(readFileSync(log, 'utf8').endsWith(line + '\n'));
  rmSync(dir, { recursive: true });
  // the committed log holds no opening
  assert.ok(!/^\| \d{4}-/m.test(readFileSync('docs/staging/rw-sealed-log.md', 'utf8')), 'the sealed part has not been opened');
  assert.match(recordIdsHash(a), /^[0-9a-f]{64}$/); assert.match(splitRuleHash(), /^[0-9a-f]{64}$/);
  assert.notEqual(recordIdsHash(a), recordIdsHash([...a, late]));
});

test('the command: scores a synthetic file, writes aggregates only, and refuses the held-out part without the flag', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rw-cli-')), file = join(dir, 'synthetic.csv'), before = readFileSync('docs/staging/rw-sealed-log.md', 'utf8');
  writeFileSync(file, csv([...synthetic(3, 40), ...session(900, { 3: { gdyad: `${H},${P}` } }, { code: H, date: '5/1/01', party: `${P},${Q},${R}` })]));   // synthetic rows, in a temporary directory
  const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/rw-score.ts', '--csv', file, '--out', join(dir, 'out'), '--reps', '50', ...args], { encoding: 'utf8' });
  const refused = run('--part', 'held-out');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /sealed/);
  assert.equal(run('--part', 'train,held-out').status, 1, 'nor beside an open part');
  assert.equal(readFileSync('docs/staging/rw-sealed-log.md', 'utf8'), before, 'a refusal writes no log line');
  for (const k of ['gliner', 'codex']) { const r = run('--part', 'train', '--kernels', k); assert.equal(r.status, 1, k); assert.match(r.stderr, k === 'gliner' ? /--load-model/ : /--codex-approved/); }
  const ok = run('--part', 'train', '--shuffles', '2', '--md', join(dir, 'numbers.md'), '--limit', '20');
  assert.equal(ok.status, 0, ok.stderr);
  const md = readFileSync(join(dir, 'numbers.md'), 'utf8');
  assert.match(md, /## train part: 20 records, \d+ focal males \(a seeded sample of 20\)/);
  assert.match(md, /stack: groomed me, then nearest, then past partner \| [\d.]+ \|/);
  assert.equal((md.match(/\| yes \|/g) ?? []).length, 5, 'the five local kernels reproduce the parser\'s figures on the sample');
  for (const c of [...TRAIN, H]) assert.ok(!new RegExp(`\\b${c}\\b`).test(md.replace(/\bto\b/g, '')), `code ${c} in the report`);
  assert.ok(!/\d+\/\d+\/\d+/.test(md) && !/#\d/.test(md), 'no date and no record key in the report');
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------------------------------------------------
// The GLiNER path (fake worker) and the serializers
// ---------------------------------------------------------------------------------------------------------------------

const rich = () => { const c = choice(10); return { ...c, prev: { near2: [c.set[1]], near5: [c.set[2]], groomedBy: [c.set[3]], iGroomed: [c.set[4]], grooming: [c.set[3], c.set[4]] },
  earlier: { iGroomed: [c.set[5]], groomedBy: [] }, given: { [c.set[1]]: 2, [c.set[5]]: 1 }, received: { [c.set[3]]: 4 }, near: { [c.set[1]]: 3, [c.set[2]]: 3 } } as WildChoice; };
const MASKED_WORDS = /rank|mood|calm|°C|daytime|12:00|clear|pressing|hunger|bond,|friendly|outranks|y;|\d+ y\b/;

test('GLiNER path: the fake worker is sent the wild text packet, which names no masked field; a packet over the budget is refused', async () => {
  const seen: ScoreItem[] = [], scorer: Scorer = { async score(batch) { seen.push(...batch); return batch.map(b => { const n = Object.keys((b.packet as ReturnType<typeof buildWildQuestion>).questions.action.criteria).length; return Array.from({ length: n }, (_, i) => i === 2 ? 0.5 : 0.5 / (n - 1)); }); } };
  const c = rich(), p = buildWildPacket(c), kernel = wildGlinerKernel(scorer, 'base'), answer = await kernel.decide(p.request, env) as { index: number; inputTokens: number };
  assert.equal(kernel.id, 'gliner');
  assert.deepEqual([seen.length, seen[0].adapter, answer.index], [1, 'base', 2]);
  const q = buildWildQuestion(p.request), name = (code: string) => p.request.context.social[p.order.indexOf(code)].name;
  assert.deepEqual(seen[0].packet, q, 'the wild text packet, built from the request and its mask');
  assert.deepEqual(Object.keys(q.questions.action.criteria), p.order.map((_, i) => `c${i}`), 'the same option ids');
  assert.equal(q.questions.action.criteria.c0, `Groom ${p.request.context.social[0].name} (eases loneliness, strengthens the bond)`, 'the serving path\'s own option text');
  assert.deepEqual(Object.keys(q.state), ['me', 'now', 'nearby', 'memories', 'history']);
  assert.equal(q.state.me, `${p.request.context.focal.name}, adult male, Ngogo community`);
  assert.equal(q.state.now, 'party with 11 adult males');
  assert.deepEqual([...(q.state.nearby as string[])].sort(), [`${name(c.set[1])}: within 2 m at the last scan`, `${name(c.set[2])}: 2 to 5 m at the last scan`, `${name(c.set[3])}: grooming at the last scan`, `${name(c.set[4])}: grooming at the last scan`].sort());
  assert.deepEqual(q.state.memories, [`Last scan: groomed by ${name(c.set[3])}; I groomed ${name(c.set[4])}`, `Earlier this hour: I groomed ${name(c.set[5])}`]);
  assert.ok(!MASKED_WORDS.test(JSON.stringify(q.state)), 'no masked field in the state');
  assert.ok(!/night|dusk|Strangers|Urgent|rain|infant/.test(q.questions.action.instructions), 'no situational rule fires on neutral values');
  assert.equal(answer.inputTokens, packetSizes(p.request).glinerTokensEstimate);
  assert.ok(packetSizes(p.request).glinerTokensEstimate < WILD_TOKEN_BUDGET);
  // through the scorer; then a budget the packet exceeds: refused, never sent
  const run = await runKernel(kernel, [c, choice(4)], { distribution: true });
  assert.deepEqual([run.map(s => s.refused), run.every(s => s.nll !== null)], [['', ''], true]);
  const sent = seen.length, tight = glinerKernel(scorer, 'base', { packet: buildWildQuestion, budget: 50 });
  await assert.rejects(() => Promise.resolve(tight.decide(p.request, env)), (e: unknown) => e instanceof KernelError && /token budget/.test(e.message));
  assert.match((await runKernel(tight, [c]))[0].refused, /kernel-error: packet over the token budget/);
  assert.equal(seen.length, sent, 'the worker was not called');
  assert.throws(() => buildWildQuestion({ context: p.request.context, options: p.request.options, rulesIndex: -1 }), /mask/, 'a request without its mask is not serialized');
  // sizes
  const z = sizeReport([c, choice(4), choice(33)], 20261006);
  assert.deepEqual([z.records, z.options.max, z.overHardLimit], [3, 33, 0]);
  assert.ok(z.glinerTokensEstimate.max > z.glinerTokensEstimate.median && z.codexCaseCharsTotal > 0);
});

// ---------------------------------------------------------------------------------------------------------------------
// The Codex kernel (fake executable only: the real tool is never run and nothing is sent)
// ---------------------------------------------------------------------------------------------------------------------

function fakeCodex() {
  const dir = mkdtempSync(join(tmpdir(), 'rw-fake-codex-')), bin = join(dir, 'codex'), log = join(dir, 'calls.jsonl');
  writeFileSync(bin, `#!${process.execPath}
const fs = require('fs'), a = process.argv.slice(2), at = k => a[a.indexOf(k) + 1], prompt = a[a.length - 1], mode = process.env.FAKE_CODEX_MODE || 'ok';
const stdinBytes = fs.readFileSync(0).length;   // an open standard input would block here
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ argv: a.slice(0, -1), prompt, cwdEntries: fs.readdirSync(at('-C')).length, schema: JSON.parse(fs.readFileSync(at('--output-schema'), 'utf8')), stdinBytes }) + '\\n');
const cases = (prompt.match(/^Case \\d+$/gm) || []).length;
if (mode === 'timeout') setTimeout(() => {}, 60000);
else {
  const choices = Array.from({ length: cases }, (_, i) => ({ case: i + 1, choice: mode === 'malformed' && i === 1 ? 99 : 1 }));
  fs.writeFileSync(at('-o'), mode === 'garbage' ? 'I think option 1' : JSON.stringify({ choices: mode === 'short' ? choices.slice(1) : choices }));
  process.stderr.write('tokens used\\n1,234\\n');
  if (mode === 'fail') process.exit(3);
}
`);
  chmodSync(bin, 0o755);
  return { bin, calls: () => readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as { argv: string[]; prompt: string; cwdEntries: number; schema: unknown; stdinBytes: number }), done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('Codex kernel: gated; batches packets into one prompt; each case validated on its own; a timeout refuses the call (fake executable)', async () => {
  const fake = fakeCodex(), five = [rich(), ...[3, 5, 12, 6].map((n, i) => choice(n, { key: `c${i}#2`, focal: `f${i}` }))], requests = five.map(c => buildWildPacket(c).request);
  const mode = (m: string) => { process.env.FAKE_CODEX_MODE = m; };
  try {
    // the gate: no approval, no cap, a cap reached
    await assert.rejects(() => Promise.resolve(codexKernel({ approved: false, maxCalls: 5, bin: fake.bin }).decide(requests[0], env)), (e: unknown) => e instanceof KernelError && e.phase === 'gated' && /approval/.test(e.message));
    await assert.rejects(() => Promise.resolve(codexKernel({ approved: true, maxCalls: 0, bin: fake.bin }).decide(requests[0], env)), /call cap/);
    await assert.rejects(() => Promise.resolve(codexKernel({ approved: true, maxCalls: 5, bin: fake.bin }).decide({ context: requests[0].context, options: requests[0].options, rulesIndex: -1 } as KernelRequest, env)), /wild packets only/);
    // a batch of three: five requests asked at once make two calls
    mode('ok');
    const kernel = codexKernel({ approved: true, maxCalls: 3, bin: fake.bin, model: 'some-model', effort: 'low', batch: 3, timeoutS: 20 });
    const answers = await Promise.all(requests.map(r => kernel.decide(r, env))) as { index: number; probabilities: number[]; model: string }[];
    assert.deepEqual(answers.map(a => a.index), [1, 1, 1, 1, 1]);
    assert.ok(answers.every((a, i) => a.probabilities.length === requests[i].options.length && a.probabilities[1] === 1 && a.probabilities.reduce((x, y) => x + y, 0) === 1 && a.model === 'codex:some-model'));
    const made = fake.calls(), log = kernel.calls();
    assert.deepEqual([made.length, log.map(c => c.cases), log.map(c => c.tokens), log.map(c => c.error)], [2, [3, 2], [1234, 1234], ['', '']]);
    assert.ok(log.every(c => c.seconds > 0 && c.promptChars > 0));
    assert.deepEqual(made[0].argv.map((v, i) => [6, 8, 10].includes(i) ? '<path>' : v), codexArgs({ model: 'some-model', effort: 'low' }, '<path>', '<path>', '<path>', 'x').slice(0, -1));
    assert.deepEqual(made[0].argv.slice(0, 6), ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '-C']);
    assert.deepEqual(made[0].argv.slice(-4), ['-m', 'some-model', '-c', 'model_reasoning_effort=low']);
    assert.deepEqual([made[0].cwdEntries, made[0].stdinBytes, made[0].schema], [0, 0, CODEX_SCHEMA], 'an empty working directory, standard input closed, the schema');
    assert.deepEqual(codexArgs({}, 'd', 's', 'o', 'p'), ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral', '-C', 'd', '--output-schema', 's', '-o', 'o', 'p'], 'the tool\'s own model and effort unless given');
    // the prompt is the serializer's, and holds only what the packet holds
    assert.equal(made[0].prompt, buildCodexPrompt(requests.slice(0, 3)));
    assert.equal(made[1].prompt, buildCodexPrompt(requests.slice(3)));
    const prompt = made[0].prompt, name = (i: number) => requests[0].context.social[i].name;
    assert.ok(prompt.includes(`Case 1\nme: ${requests[0].context.focal.name}, adult male, Ngogo community\nnow: party with 11 adult males\nnearby:\n- `) && prompt.includes(`\noptions:\n0: Groom ${name(0)}\n1: Groom ${name(1)}\n`) && prompt.includes('\n\nCase 3\n'));
    for (const l of [...requests[0].context.recent, ...requests[0].context.history!]) assert.ok(prompt.includes(`- ${l}\n`), l);
    assert.ok(!MASKED_WORDS.test(prompt.slice(prompt.indexOf('Case 1'))) && !/\b(19|20)\d\d\b/.test(prompt) && !/#\d/.test(prompt), 'no masked field, year or record key');
    for (const c of five.flatMap(x => x.set)) assert.ok(!new RegExp(`\\b${c}\\b`).test(prompt), `code ${c} in the prompt`);
    const words = new Set(prompt.slice(prompt.indexOf('Case 1')).match(/[A-Z][a-z]{3}\b/g)), allowed = new Set([...NAME_POOL, 'Case', 'Last']);
    assert.ok([...words].every(w => allowed.has(w) || ['Groo', 'Ngog', 'Earl', 'Ofte'].includes(w)), 'only pseudonyms name an animal');
    // the cap: a third call passes, a fourth is refused without being made
    assert.equal(((await kernel.decide(requests[0], env)) as { index: number }).index, 1);
    await assert.rejects(() => Promise.resolve(kernel.decide(requests[0], env)), /call cap reached \(3\)/);
    assert.equal(fake.calls().length, 3);
    // a malformed entry refuses that case alone; a missing one too; an answer that is not JSON, or a failed run, refuses the call
    mode('malformed');
    const part = await Promise.allSettled(requests.slice(0, 3).map(r => codexKernel({ approved: true, maxCalls: 1, bin: fake.bin, batch: 3 }).decide(r, env)));
    assert.deepEqual(part.map(x => x.status), ['fulfilled', 'fulfilled', 'fulfilled'], 'three kernels, one case each: choice 1 is on every menu');
    const k2 = codexKernel({ approved: true, maxCalls: 9, bin: fake.bin, batch: 3 }), mal = await Promise.allSettled(requests.slice(0, 3).map(r => k2.decide(r, env)));
    assert.deepEqual(mal.map(x => x.status), ['fulfilled', 'rejected', 'fulfilled']);
    assert.match(String((mal[1] as PromiseRejectedResult).reason.message), /not an option of this case/);
    mode('short');
    assert.deepEqual((await Promise.allSettled(requests.slice(0, 3).map(r => k2.decide(r, env)))).map(x => x.status), ['rejected', 'fulfilled', 'fulfilled']);
    for (const m of ['garbage', 'fail']) { mode(m); const all = await Promise.allSettled(requests.slice(0, 3).map(r => k2.decide(r, env))); assert.deepEqual(all.map(x => x.status), ['rejected', 'rejected', 'rejected'], m); }
    assert.deepEqual(k2.calls().slice(-2).map(c => c.error), ['', 'codex exited with 3']);
    // a timeout: the call is killed and every case of it is refused; through the scorer these are misses
    mode('timeout');
    const slow = codexKernel({ approved: true, maxCalls: 9, bin: fake.bin, batch: 4, timeoutS: 1 }), t0 = Date.now();
    const scored = await runKernel(slow, five.slice(0, 4), { concurrency: 4 });
    assert.ok(Date.now() - t0 < 15000);
    assert.ok(scored.every(s => /kernel-error: codex timed out after 1 s/.test(s.refused) && s.hit === 0));
    assert.deepEqual(slow.calls().map(c => [c.cases, c.tokens, c.error]), [[4, null, 'codex timed out after 1 s']]);
    // a well-formed run through the scorer, in batches of two
    mode('ok');
    const good = codexKernel({ approved: true, maxCalls: 9, bin: fake.bin, batch: 2 }), run = await scoreKernel(good, five, { seed: 20261006, shuffles: 1, reps: 20, distribution: false, concurrency: 2 });
    assert.deepEqual([run.summary.refused, run.summary.logLoss, good.calls().map(c => c.cases)], [0, null, [2, 2, 1]]);
  } finally { delete process.env.FAKE_CODEX_MODE; fake.done(); }
});

test('Codex answers and token reports are read strictly', () => {
  assert.deepEqual(readCodexAnswer('{"choices":[{"case":1,"choice":0},{"case":2,"choice":2}]}', [2, 3]).map(a => typeof a === 'string' ? a : a.index), [0, 2]);
  assert.deepEqual(readCodexAnswer('{"choice":1}', [3]).map(a => typeof a === 'string' ? a : a.index), [1], 'a single case may answer {"choice": n}');
  assert.deepEqual(readCodexAnswer('{"choice":1}', [3, 3]).map(a => typeof a), ['string', 'string']);
  assert.deepEqual(readCodexAnswer('{"choices":[{"case":1,"choice":1.5},{"case":2,"choice":"1"},{"case":3,"choice":-1},{"case":4,"choice":4},{"case":5,"choice":0},{"case":5,"choice":1}]}', [4, 4, 4, 4, 4]).map(a => typeof a),
    ['string', 'string', 'string', 'string', 'string']);
  assert.deepEqual(readCodexAnswer('not json', [2]).map(a => a), ['codex output is not JSON']);
  assert.deepEqual([tokensUsed('...\ntokens used\n20,577\n'), tokensUsed('tokens used: 812'), tokensUsed('tokens used: 5\nlater\nTokens used 1.234'), tokensUsed('no report')], [20577, 812, 1234, null]);
});

// ---------------------------------------------------------------------------------------------------------------------
// Compromised targets and the manifest
// ---------------------------------------------------------------------------------------------------------------------

test('compromised targets: the five ids for a kernel trained on field choices, none otherwise; the frozen targets file is only read', () => {
  const list = JSON.parse(readFileSync('data/rw-compromised.json', 'utf8')) as CompromisedList, targets = JSON.parse(readFileSync('data/targets.json', 'utf8')) as { targets: { id: string; role?: string; compromised?: unknown }[] };
  assert.equal(list.labelSource, 'field choices, Ngogo male grooming');
  assert.deepEqual(list.targets.map(t => t.id), ['T-SOC-1', 'T-SOC-2', 'T-FIS-1', 'T-FIS-3', 'T-FIS-5']);
  assert.ok(list.targets.every(t => t.reason.length > 40 && /^[AB]: /.test(t.overlap) && targets.targets.some(x => x.id === t.id)), 'each is a target of the scorecard, with its reason');
  const manifest: KernelManifest = { name: 'ngogo-groom-v0', kind: 'adapter', baseModel: 'GLiNER2.5-Decide', labelSources: ['field choices, Ngogo male grooming'], part: 'train', records: 977,
    recordIdsHash: 'a'.repeat(64), splitRuleHash: splitRuleHash(), packet: { version: 'rw-bench-v1', seed: 20261006, shuffles: [0] }, created: '2026-10-06', commit: 'abc1234' };
  assert.equal(manifestError(manifest), '');
  assert.deepEqual([...compromisedFor(manifest, list).keys()], list.targets.map(t => t.id));
  assert.equal(compromisedFor({ labelSources: ['rules decisions', ' Field choices, Ngogo male grooming '] }, list).size, 5, 'beside other label sources, and whatever the case');
  for (const other of [null, undefined, { labelSources: [] }, { labelSources: ['rules decisions', 'expert rubric'] }]) assert.equal(compromisedFor(other, list).size, 0);
  const rows = targets.targets.map(t => ({ id: t.id, role: t.role })), flagged = flagCompromised(rows, manifest, list);
  assert.deepEqual(flagged.filter(r => r.compromised).map(r => r.id).sort(), [...list.targets.map(t => t.id)].sort());
  assert.equal(flagged.find(r => r.id === 'T-SOC-1')!.compromised, list.targets[0].reason);
  assert.deepEqual(flagCompromised(rows, { labelSources: ['rules decisions'] }, list), rows, 'a kernel only scored on wild choices is not marked');
  assert.ok(rows.every(r => !('compromised' in r)), 'the input rows are not written');
  for (const [field, value, why] of [['part', 'held-out', /part/], ['part', 'development', /part/], ['labelSources', [], /label sources/], ['recordIdsHash', 'abc', /hashes/], ['name', '', /name/], ['records', 0, /records/]] as const)
    assert.match(manifestError({ ...manifest, [field]: value }), why);
});
