// Stage RW bench, amendment A8 (docs/staging/rw-bench-prereg.md §14.5): fanning a wide menu out to a kernel built for 8.
// SYNTHETIC records and FAKE kernels only: no field record is read, no model is loaded, nothing leaves this computer.
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScoreItem, Scorer } from '../scripts/ft-society';
import { batchingScorer, buildWildQuestion, wildGlinerKernel } from '../scripts/lib/rw-serialize';
import { bySize, callsBySize, fanoutMarkdown, routingReadout } from '../scripts/rw-fanout-report';
import { mulberry32 } from '../src/compare/sampling';
import { deal, fanCalls, fanOutKernel, narrowRequest, type FanVariant } from '../src/kernel/fanout';
import { nullKernel } from '../src/kernel/kernels';
import { KernelError, type KernelRequest } from '../src/kernel/types';
import { ruleKernel, type WildKernel } from '../src/rw/kernels';
import { buildWildPacket, narrowWildRequest, P_EITHER, restrictLine, wildFacts, wildRequestError, type WildChoice, type WildRequest } from '../src/rw/packet';
import { chooseThreshold, pairedDifference, routed, runKernel, signTest, type RecordScore } from '../src/rw/score';

const codes: string[] = [];
for (const a of 'abcdefghijklmnopqrstuvwxyz') for (const b of 'abcdefghijklmnopqrstuvwxyz') codes.push(a + b);
/** A hand-made choice of n males with some history; the partner is the first code. */
function choice(n: number, key = `s${n}#3`, focal = 'zz'): WildChoice {
  const set = codes.slice(100, 100 + n), rng = mulberry32(n * 7919 + key.length);
  const counts = () => Object.fromEntries(set.filter(() => rng() < 0.5).map(c => [c, 1 + Math.floor(rng() * 4)]));
  return { key, focal, part: 'train', partStratum: 'train', preceded: 'continuation', set, labels: [set[0]],
    prev: { near2: [set[1]], near5: [set[2]], groomedBy: [set[3]], iGroomed: [set[4]], grooming: [set[3], set[4]] }, earlier: { iGroomed: [set[5]], groomedBy: [set[6]] }, given: counts(), received: counts(), near: counts() };
}
const env = (seed = 1) => ({ random: mulberry32(seed) });
const nameAt = (r: KernelRequest, i: number) => r.context.social.find(s => s.id === r.options[i].targetId)!.name;
/**
 * A fake kernel that knows the partner's pseudonym: `place(n)` is the rank it gives him on a sub-menu of n that holds him
 * (0 first); on a sub-menu without him it is unsure (even probabilities). It keeps what it was sent.
 */
function knowing(partner: string, place: (n: number) => number = () => 0) {
  const seen: KernelRequest[] = [];
  const kernel: WildKernel = { id: 'fake', label: 'fake', decide(request) {
    seen.push(request);
    const n = request.options.length, at = request.options.findIndex((_, i) => nameAt(request, i) === partner), rank = at < 0 ? -1 : Math.min(n - 1, place(n));
    // probabilities fall with a fixed order of the others; the partner is put at `rank`
    const others = request.options.map((_, i) => i).filter(i => i !== at), order = at < 0 ? others : [...others.slice(0, rank), at, ...others.slice(rank)];
    const probabilities = new Array<number>(n).fill(1 / n), total = n * (n + 1) / 2;
    if (at >= 0) order.forEach((i, r) => { probabilities[i] = (n - r) / total; });
    return { index: order[0], choice: `c${order[0]}`, probabilities };
  } };
  return { kernel, seen };
}
const VARIANTS: FanVariant[] = ['fan2', 'fan1', 'pool3'];
const fan = (k: WildKernel, v: FanVariant, onSub?: (sub: KernelRequest, positions: number[], round: number) => void) => fanOutKernel(k, v, { narrow: narrowWildRequest, onSub });

test('registered call counts: a menu of 8 or fewer is one call; wider menus as in the table', () => {
  const table: Record<FanVariant, [number, number][]> = {
    fan2: [[2, 1], [8, 1], [9, 3], [16, 3], [17, 4], [24, 4], [25, 5], [32, 5], [33, 8], [40, 8], [76, 14]],
    fan1: [[2, 1], [8, 1], [9, 3], [16, 3], [17, 4], [24, 4], [25, 5], [32, 5], [33, 6], [64, 9], [76, 13]],
    pool3: [[8, 1], [9, 6], [16, 6], [17, 9], [24, 9], [25, 12], [32, 12], [33, 15], [76, 30]],
  };
  for (const v of VARIANTS) for (const [n, calls] of table[v]) assert.equal(fanCalls(v, n), calls, `${v}, ${n} options`);
});

test('a kernel that is right whenever the partner is on its sub-menu is right through every variant, with the registered number of calls', async () => {
  for (const n of [9, 12, 16, 17, 24, 25, 33, 50, 76]) {
    const p = buildWildPacket(choice(n)), partner = nameAt(p.request, p.labels[0]);
    for (const v of VARIANTS) {
      const fake = knowing(partner), answer = await fan(fake.kernel, v).decide(p.request, env(n));
      assert.equal(answer.index, p.labels[0], `${v}, ${n} options`);
      assert.deepEqual([answer.calls, fake.seen.length], [fanCalls(v, n), fanCalls(v, n)], `${v}, ${n} options: calls`);
      const probs = answer.probabilities as number[];
      assert.ok(probs.length === n && probs.every(x => x >= 0 && x <= 1) && Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-9 && Math.max(...probs) === probs[p.labels[0]], 'a probability per option, the answer on top');
      assert.ok(fake.seen.every(r => r.options.length >= 2 && r.options.length <= 8), 'no sub-menu wider than 8');
    }
  }
});

test('keeping two lets the final round correct a group round: a kernel that ranks the partner second on big sub-menus is right through fan2 and wrong through fan1', async () => {
  // sets whose final round holds 4 males (two groups, or five groups and then two): second in the group rounds, first in the final
  for (const n of [10, 13, 16, 33, 40]) {
    const p = buildWildPacket(choice(n)), partner = nameAt(p.request, p.labels[0]), second = (m: number) => m > 4 ? 1 : 0;
    assert.equal((await fan(knowing(partner, second).kernel, 'fan2').decide(p.request, env(3))).index, p.labels[0], `fan2, ${n}`);
    assert.notEqual((await fan(knowing(partner, second).kernel, 'fan1').decide(p.request, env(3))).index, p.labels[0], `fan1, ${n}`);
  }
  // and a kernel that never ranks him in the first two loses him either way
  const p = buildWildPacket(choice(20)), third = knowing(nameAt(p.request, p.labels[0]), () => 2);
  assert.notEqual((await fan(third.kernel, 'fan2').decide(p.request, env(3))).index, p.labels[0]);
});

test('groups: every option once per round, sizes within one of each other, sub-requests valid wild requests that name only their own males', async () => {
  for (const [m, groups] of [[9, 2], [16, 2], [17, 3], [33, 5], [76, 10]] as const) {
    const dealt = deal(Array.from({ length: m }, (_, i) => i), 8, mulberry32(m)), sizes = dealt.map(g => g.length);
    assert.equal(dealt.length, groups);
    assert.deepEqual(dealt.flat().sort((a, b) => a - b), Array.from({ length: m }, (_, i) => i));
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1 && Math.max(...sizes) <= 8 && Math.min(...sizes) >= 4, `${m}: ${sizes}`);
  }
  const c = choice(33), p = buildWildPacket(c), all = new Set(p.request.context.social.map(s => s.name)), rounds = new Map<number, number[]>();
  const subs: { sub: KernelRequest; positions: number[] }[] = [];
  await fan(knowing(nameAt(p.request, p.labels[0])).kernel, 'fan2', (sub, positions, round) => { subs.push({ sub, positions }); rounds.set(round, [...(rounds.get(round) ?? []), ...positions]); }).decide(p.request, env(5));
  assert.deepEqual([...rounds.keys()], [0, 1, 2]);
  assert.deepEqual([rounds.get(0)!.length, new Set(rounds.get(0)).size, rounds.get(1)!.length, rounds.get(2)!.length], [33, 33, 10, 4], '33 → 5 groups → 10 → 2 groups → 4 → the final');
  for (const { sub, positions } of subs) {
    assert.equal(wildRequestError(sub), '', 'a valid wild request');
    const names = sub.context.social.map(s => s.name), mine = new Set(names);
    assert.deepEqual(names, positions.map(i => nameAt(p.request, i)), 'the group\'s males, in the dealt order');
    assert.ok(sub.options.every((o, i) => o.targetId === i + 2 && sub.context.social[i].id === i + 2));
    assert.deepEqual([sub.context.focal, sub.context.environment], [p.request.context.focal, p.request.context.environment], 'the focal male and the party size unchanged');
    const mentioned = [...sub.context.recent, ...(sub.context.history ?? [])].join(' ').match(/[A-Z][a-z]{3}\b/g) ?? [];
    assert.ok(mentioned.filter(w => all.has(w)).every(w => mine.has(w)), 'a line names only males of the sub-menu');
    // facts about a male are the same in the sub-menu as in the whole menu, ranks apart (which keep their order)
    const whole = wildFacts(p.request), part = wildFacts(sub);
    part.forEach((f, i) => { const w = whole[positions[i]]; assert.deepEqual([f.name, f.groomedMe, f.iGroomed, f.near, f.grooming], [w.name, w.groomedMe, w.iGroomed, w.near, w.grooming]); });
    for (const key of ['either', 'given', 'often'] as const) for (let i = 0; i < part.length; i++) for (let j = 0; j < part.length; j++)
      assert.equal(Math.sign(part[i][key] - part[j][key] || 0), Math.sign(whole[positions[i]][key] - whole[positions[j]][key] || 0), `${key}: order kept`);
    // the text packet of a sub-menu is an ordinary wild text packet
    assert.deepEqual(Object.keys(buildWildQuestion(sub).questions.action.criteria), positions.map((_, i) => `c${i}`));
  }
  // the lines
  const keep = new Set(['Nasi', 'Gusu']);
  assert.equal(restrictLine(`${P_EITHER}Kugu, Nasi=Tuza, Gusu, others`, keep), `${P_EITHER}Nasi, Gusu, others`);
  assert.equal(restrictLine(`${P_EITHER}Kugu=Tuza`, keep), '');
  assert.equal(restrictLine('Last scan: groomed by Kugu, Nasi; I groomed Tuza', keep), 'Last scan: groomed by Nasi');
  assert.equal(restrictLine('Earlier this hour: I groomed Gusu, Kugu; groomed by Nasi', keep), 'Earlier this hour: I groomed Gusu; groomed by Nasi');
  assert.equal(restrictLine('Last scan: I groomed Tuza', keep), '');
  assert.throws(() => narrowWildRequest({ context: p.request.context, options: p.request.options, rulesIndex: -1 }, [0, 1]), /mask/);
  // the default sub-request, for any other request: the context unchanged but for its options
  const plain = narrowRequest({ ...p.request, rulesIndex: 4 }, [7, 4, 2]);
  assert.deepEqual([plain.options, plain.context.candidates, plain.rulesIndex, plain.context.social.length], [[7, 4, 2].map(i => p.request.options[i]), [7, 4, 2].map(i => p.request.options[i]), 1, 33]);
});

test('determinism: the same seed gives the same groups and answer; another draw gives other groups; nothing but the loop\'s draw is used', async () => {
  const p = buildWildPacket(choice(29)), run = async (seed: number, v: FanVariant) => { const groups: number[][] = []; const a = await fan(nullKernel, v, (_s, positions) => groups.push(positions)).decide(p.request, env(seed)); return { groups, index: a.index, probabilities: a.probabilities }; };
  for (const v of VARIANTS) {
    assert.deepEqual(await run(11, v), await run(11, v), v);
    assert.notDeepEqual((await run(11, v)).groups, (await run(12, v)).groups, v);
  }
  // through the scorer: fixed by the run's seed and shuffle
  const many = [9, 14, 20, 33, 6].map((n, i) => choice(n, `k${i}#1`, `f${i % 2}`)), k = fan(nullKernel, 'fan2');
  const a = await runKernel(k, many, { shuffle: 1 }), b = await runKernel(k, many, { shuffle: 1, concurrency: 4 }), c = await runKernel(k, many, { shuffle: 2 });
  assert.deepEqual(a, b, 'the same whatever is asked at once');
  assert.notDeepEqual(a.map(s => s.picked), c.map(s => s.picked));
  assert.deepEqual(a.map(s => s.calls), [3, 3, 4, 8, 1]);
  assert.ok(a.every(s => s.conf !== null && s.conf > 0 && s.refused === ''));
});

test('a menu of 8 or fewer is passed through: one call, the request unchanged, the inner answer', async () => {
  for (const n of [2, 5, 8]) for (const v of VARIANTS) {
    const p = buildWildPacket(choice(n)), fake = knowing(nameAt(p.request, p.labels[0])), answer = await fan(fake.kernel, v).decide(p.request, env());
    assert.equal(fake.seen.length, 1);
    assert.equal(fake.seen[0], p.request, 'the very request');
    assert.deepEqual(answer, { ...await fake.kernel.decide(p.request, env()), calls: 1 });
  }
  // a rule kernel is the same kernel through the wrapper on narrow menus, and still a rule on wide ones
  const narrow = [3, 6, 8].map((n, i) => choice(n, `n${i}#1`)), stack = ruleKernel('stack');
  assert.deepEqual((await runKernel(fan(stack, 'fan2'), narrow)).map(s => [s.hit, s.tieHit, s.index]), (await runKernel(stack, narrow)).map(s => [s.hit, s.tieHit, s.index]));
  assert.equal((await runKernel(fan(stack, 'fan2'), [choice(30)]))[0].refused, '');
});

test('a refused sub-call refuses the whole record: a throwing kernel, an invalid answer', async () => {
  const p = buildWildPacket(choice(20));
  let n = 0;
  const flaky = (bad: () => unknown): WildKernel => ({ id: 'flaky', label: 'flaky', decide(request, e) { if (++n === 3) return bad() as never; return nullKernel.decide(request, e); } });
  n = 0; await assert.rejects(() => fan(flaky(() => { throw new KernelError('down'); }), 'fan2').decide(p.request, env()), /down/);
  n = 0; await assert.rejects(() => fan(flaky(() => ({ index: 99, probabilities: [1] })), 'fan2').decide(p.request, env()), (e: unknown) => e instanceof KernelError && /failed the answer check/.test(e.message));
  n = 0; await assert.rejects(() => fan(flaky(() => ({ index: 0 })), 'pool3').decide(p.request, env()), /failed the answer check/);
  n = 0;
  const [s] = await runKernel(fan(flaky(() => { throw new KernelError('down'); }), 'fan1'), [choice(20)]);
  assert.deepEqual([s.hit, s.picked, s.conf, s.calls], [0, null, null, 0]);
  assert.match(s.refused, /kernel-error: down/);
  assert.throws(() => fanOutKernel(nullKernel, 'fan9' as FanVariant), /no fan-out variant/);
});

const rec = (key: string, focal: string, hit: number, conf: number | null, setSize = 12): RecordScore => ({ key, focal, picked: null, setSize, preceded: 'fresh', partStratum: 'train', refused: conf === null ? 'kernel-error' : '', index: 0, hit, tieHit: hit, rr: hit, nll: null, chance: 1 / setSize, relPos: 0, lineCut: false, conf, calls: conf === null ? 0 : 3 });

test('paired difference on the same records: cells, sign test, an interval over males; called a difference only if the interval excludes 0', () => {
  const a = Array.from({ length: 60 }, (_, i) => rec(`r${i}`, `m${i % 6}`, +(i % 3 !== 0), 0.5)), b = a.map((s, i) => ({ ...s, hit: +(i % 6 === 1) }));
  const d = pairedDifference(a, b, undefined, 400);
  assert.deepEqual([d.records, d.animals, d.a, d.b, d.difference, d.bothRight, d.onlyA, d.onlyB, d.neither], [60, 6, 0.667, 0.167, 0.5, 10, 30, 0, 20]);
  assert.ok(d.isDifference && d.ci[0]! > 0 && d.signP < 0.001);
  const same = pairedDifference(a, a, undefined, 100);
  assert.deepEqual([same.difference, same.ci, same.isDifference, same.signP], [0, [0, 0], false, 1]);
  // a difference carried by one male of two is not one: the interval over males includes 0
  const lop = [...Array.from({ length: 30 }, (_, i) => rec(`a${i}`, 'm1', 1, 0.5)), ...Array.from({ length: 30 }, (_, i) => rec(`b${i}`, 'm2', 0, 0.5))], none = lop.map(s => ({ ...s, hit: 0 }));
  const one = pairedDifference(lop, none, undefined, 400);
  assert.deepEqual([one.difference, one.ci, one.isDifference], [0.5, [0, 1], false]);
  assert.equal(pairedDifference(a, b, s => s.setSize > 100, 50).isDifference, false, 'no records, no difference');
  assert.throws(() => pairedDifference(a, b.slice(1)), /not the same records/);
  assert.throws(() => pairedDifference(a, [...b.slice(1), b[0]]), /not the same records/);
  assert.deepEqual([signTest(0, 0), signTest(5, 5), Math.round(signTest(19, 16) * 100) / 100, signTest(10, 0)], [1, 1, 0.74, 2 / 1024]);
});

test('routing: the kernel answers at or above the threshold, the stack below it; a refusal routes; the threshold comes from the training records only', () => {
  // the kernel is right when confident (0.9) and wrong when not (0.3); the stack is right on half of each
  const model = Array.from({ length: 40 }, (_, i) => rec(`r${i}`, `m${i % 4}`, +(i < 20), i < 20 ? 0.9 : i === 39 ? null : 0.3)), stack = model.map((s, i) => ({ ...s, hit: i % 2, conf: 1, refused: '' }));
  assert.deepEqual([routed(model, stack, 0).share, routed(model, stack, 0).scores.reduce((a, s) => a + s.hit, 0)], [1 / 40, 21], 't = 0 routes only the refused record');
  const half = routed(model, stack, 0.6);
  assert.deepEqual([half.share, half.scores.reduce((a, s) => a + s.hit, 0)], [0.5, 30]);
  assert.deepEqual(routed(model, stack, 1).scores.map(s => s.hit), stack.map(s => s.hit), 't = 1: the stack');
  const chosen = chooseThreshold(model, stack);
  assert.deepEqual([chosen.t, chosen.top1, chosen.curve.length], [0.35, 0.75, 21], 'the smallest threshold with the best routed top-1');
  // a kernel better than the stack everywhere: never route
  assert.equal(chooseThreshold(model.map(s => ({ ...s, hit: 1 })), stack).t, 0);
  // the readout applies the training threshold to development, whatever development would have chosen
  const dev = { model: model.map(s => ({ ...s, hit: 1 - s.hit })), stack }, R = routingReadout({ model, stack }, dev, 100);
  assert.deepEqual([R.chosenOnTrain!.t, R.rows.map(r => r.t), R.rows[1].shareRouted, R.rows[1].top1], [0.35, [0.6, 0.35], 0.5, 0.25]);
  assert.equal(routingReadout(null, dev, 50).rows.length, 1, 'without a training run only the fixed threshold');
});

test('the batching scorer gathers calls made at once, keeps answers aligned and sends an identical packet once', async () => {
  const batches: number[] = [], worker: Scorer = { async score(batch: ScoreItem[]) { batches.push(batch.length); await new Promise(r => setTimeout(r, 2)); return batch.map(b => { const n = Object.keys((b.packet as ReturnType<typeof buildWildQuestion>).questions.action.criteria).length; return Array.from({ length: n }, (_, i) => (i + 1) / (n * (n + 1) / 2)); }); } };
  const scorer = batchingScorer(worker, 4), kernel = wildGlinerKernel(scorer, 'base');
  const requests = [3, 4, 5, 6, 7, 8].map((n, i) => buildWildPacket(choice(n, `b${i}#1`)).request);
  const answers = await Promise.all(requests.map(r => kernel.decide(r, env()))) as { index: number; probabilities: number[] }[];
  assert.deepEqual(answers.map(a => [a.index, a.probabilities.length]), requests.map(r => [r.options.length - 1, r.options.length]), 'each answer is its own request\'s');
  assert.deepEqual([batches, scorer.stats.asked, scorer.stats.sent, scorer.stats.batches], [[4, 2], 6, 6, 2]);
  const again = await Promise.all(requests.map(r => kernel.decide(r, env())));
  assert.deepEqual(again, answers);
  assert.deepEqual([scorer.stats.asked, scorer.stats.sent], [12, 6], 'identical packets are not sent twice');
  // fanned out through the scorer: sub-menus of a round share batches; calls are counted as asked
  const wide = [choice(33, 'w0#1'), choice(20, 'w1#1'), choice(7, 'w2#1')], sent = scorer.stats.sent;
  const scores = await runKernel(fanOutKernel(kernel, 'fan2', { narrow: narrowWildRequest }), wide, { concurrency: 3 });
  assert.deepEqual(scores.map(s => [s.calls, s.refused]), [[8, ''], [4, ''], [1, '']]);
  assert.equal(scorer.stats.sent - sent, 13);
  assert.ok(Math.max(...batches) <= 4);
  // a worker that refuses a whole batch for one packet (33 criteria, as the real one does): only that packet's record is refused
  const picky: Scorer = { async score(batch: ScoreItem[]) { const ns = batch.map(b => Object.keys((b.packet as ReturnType<typeof buildWildQuestion>).questions.action.criteria).length); if (ns.some(n => n > 32)) throw new Error('ValueError: invalid decision criteria'); return ns.map(n => Array.from({ length: n }, () => 1 / n)); } };
  const careful = batchingScorer(picky, 8), mixed = await runKernel(wildGlinerKernel(careful, 'base'), [choice(5, 'p0#1'), choice(33, 'p1#1'), choice(12, 'p2#1'), choice(4, 'p3#1')], { concurrency: 4 });
  assert.deepEqual(mixed.map(s => s.refused), ['', 'kernel-error: ValueError: invalid decision criteria', '', '']);
  assert.equal(careful.stats.retried, 4);
  assert.equal((await runKernel(fanOutKernel(wildGlinerKernel(careful, 'base'), 'fan2', { narrow: narrowWildRequest }), [choice(33, 'p1#1')]))[0].refused, '', 'fanned out, the 33-option record is answered');
  // a failing worker refuses every call of its batch
  const broken = batchingScorer({ async score() { throw new Error('worker died'); } }, 4);
  assert.match((await runKernel(wildGlinerKernel(broken, 'base'), [choice(5)]))[0].refused, /kernel-error: worker died/);
});

test('the report: by set size, paired differences, calls and routing from per-record runs; aggregates only', async () => {
  // 70 synthetic choices whose focal pseudonyms differ, so the fake below can tell which record a sub-menu belongs to
  const rng = mulberry32(9), many: WildChoice[] = [], partnerOf = new Map<string, string>();
  for (let i = 0; many.length < 70; i++) {
    const c = choice(2 + Math.floor(rng() * 30), `k${i}#${i % 7}`, codes[300 + (i % 10)]), p = buildWildPacket(c), focal = p.request.context.focal.name;
    if (!partnerOf.has(focal)) { partnerOf.set(focal, nameAt(p.request, p.labels[0])); many.push(c); }
  }
  // a fake model: right on a sub-menu of 8 or fewer when it holds the partner, lost on anything wider
  const narrowOnly: WildKernel = { id: 'gliner', label: 'fake model', decide(request, e) {
    const n = request.options.length;
    if (n > 8) return nullKernel.decide(request, e);
    const name = partnerOf.get(request.context.focal.name)!;
    const at = request.options.findIndex((_, i) => nameAt(request, i) === name), index = at < 0 ? 0 : at;
    return { index, choice: `c${index}`, probabilities: request.options.map((_, i) => i === index ? 0.7 : 0.3 / (n - 1)) };
  } };
  const run = async (k: WildKernel, shuffles = 1) => { const out: RecordScore[][] = []; for (let s = 0; s < shuffles; s++) out.push(await runKernel(k, many, { shuffle: 0 })); return out; };
  const runs = { null: await run(nullKernel), stack: await run(ruleKernel('stack')), gliner: await run(narrowOnly, 2), 'gliner+fan2': await run(fan(narrowOnly, 'fan2'), 2), 'gliner+fan1': await run(fan(narrowOnly, 'fan1')), 'gliner+pool3': await run(fan(narrowOnly, 'pool3')) };
  const plain = bySize(runs.gliner[0], 100), fanned = bySize(runs['gliner+fan2'][0], 100), cut = (t: typeof plain, name: string) => t.find(c => c.cut === name)!;
  assert.deepEqual([cut(plain, '8 or fewer').top1, cut(fanned, '8 or fewer').top1, cut(fanned, 'more than 8').top1], [1, 1, 1]);
  assert.ok(cut(plain, 'more than 8').top1! < 0.3);
  assert.equal(cut(plain, 'all').records, 70);
  assert.deepEqual(callsBySize(runs.gliner[0]).map(c => c.mean), [1, 1, 1, 1, 1]);
  assert.deepEqual([callsBySize(runs['gliner+fan2'][0])[1].mean, callsBySize(runs['gliner+fan2'][0])[3].largest], [1, 3]);
  const md = fanoutMarkdown({ development: runs, train: runs }, 'gliner', { development: { 'gliner+fan2': { seconds: 12, kernelCalls: 300 } } }, ['swap: test'], 100);
  assert.match(md, /## development part: 70 records/);
  assert.match(md, /\| gliner\+fan2 minus gliner \| more than 8 \| \d+ \(\d+\) \| 1 \| [\d.]+ \| [\d.]+ \| [\d.]+ to [\d.]+ \| yes \|/);
  assert.match(md, /\| gliner\+fan2 minus gliner \| 8 or fewer \| \d+ \(\d+\) \| 1 \| 1 \| 0 \| 0 to 0 \| no \|/);
  assert.match(md, /Confidence-gated routing/); assert.match(md, /t\* = 0[^.]/); assert.match(md, /- swap: test/);
  assert.match(md, /\| gliner\+fan2 \| 2 \| 1, 1 \| 0 \| 1 \|/);
  for (const c of [...new Set(many.flatMap(x => [...x.set, x.focal]))]) assert.ok(!new RegExp(`\\b${c}\\b`).test(md.replace(/\b(to|of|in|on|is|if|or|at|as|by|no|do|an)\b/g, '')), `code ${c} in the report`);
  assert.ok(!/#\d/.test(md), 'no record key in the report');
});
