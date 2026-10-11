import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { focalSet } from '../scripts/em-loop';
import { Worker } from '../scripts/ft-society';
import { newDecoder, newTally, tallyAsk, BLOCK_H, type DecodeRecord, type HarnessDecode } from '../scripts/lib/decoder';
import { asksOf, missingShare, replay, walk } from '../scripts/r9-held-replay';
import { heldBreaks, R9_ARMS, specOf } from '../scripts/r9-loop';
import { differs, noHarm, noiseOf, overturn, verdicts, whatFor, type Rows } from '../scripts/r9-report';
import { ARMS, decodeDiffers, replayKernel, runArm, type ArmSpec, type DayRow, type Receipt } from '../scripts/r5-pilot';
import { decode, DECODE_MODES, drawAt, gumbel, heldAt, heldNoise, optionKey, topIndex, unit, type DecodeAt } from '../src/kernel/decode';
import { nullKernel } from '../src/kernel/kernels';
import { answerWaiting } from '../src/kernel/loop';
import type { Kernel, KernelRequest } from '../src/kernel/types';
import { requestFor } from '../src/sim/decide';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage R9 (docs/staging/r9-prereg.md): the decode (src/kernel/decode.ts), its place in the loop (src/kernel/loop.ts),
// the harness's epochs and receipts (scripts/lib/decoder.ts, scripts/r5-pilot.ts), the offline replay and the rules of
// the report. No model: the kernels here are fakes. One short field world (seed 48, the first morning) serves the loop tests.
const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>, observeV4: 1, menuParity: 1 };
let cached: World | null = null;
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 240; i++) tickWorld(cached); } return cached; };
const SHORT = 0.125; // three hours of the morning: 720 ticks
const collect = () => { const got: Receipt[] = []; return { got, receipts: (r: Receipt) => { got.push(r); } }; };
const at = (o: Partial<DecodeAt> = {}): DecodeAt => ({ seed: 48, chimpId: 3, version: 0, epoch: 0, ...o });
const KEYS = ['rest:-1', 'forage:100007', 'travel:100123', 'groom:5'], P = [0.5, 0.3, 0.15, 0.05];

/** A fake scoring kernel with odds that never move: an option's weight is a fixed function of its key, so the same option has the same odds against any other at every ask. Its own pick is the first maximum, as a scoring kernel's. */
const steady: Kernel = { id: 'gliner', label: 'fake: steady odds', decide(request: KernelRequest) {
  const w = request.options.map(o => Math.exp(3 * unit(`odds|${optionKey(o)}`))), z = w.reduce((a, b) => a + b, 0), probabilities = w.map(x => x / z), index = topIndex(probabilities);
  return { index, choice: `c${index}`, probabilities };
} };
const arm = (decode?: HarnessDecode, gate: 0 | 1 = 1): ArmSpec => ({ kernel: 'gliner', adapter: 'fake', ...(gate ? { gate } : {}), ...(decode ? { decode } : {}) });

test('draw and held are draws from the probabilities as they are; the noise is a fixed function of what is logged', () => {
  const N = 20000, draw = [0, 0, 0, 0], held = [0, 0, 0, 0];
  let sum = 0, lag = 0, last = 0.5, cross = 0;
  for (let i = 0; i < N; i++) {
    draw[decode({ mode: 'draw', salt: 1 }, at({ version: i }), KEYS, P, 0).index]++;
    const h = decode({ mode: 'held', salt: 1 }, at({ epoch: i }), KEYS, P, 0);
    held[h.index]++;
    const u = unit(`held|48|1|3|${i}|rest:-1`), v = unit(`held|48|2|3|${i}|rest:-1`);
    sum += u; lag += (u - 0.5) * (last - 0.5); cross += (u - 0.5) * (v - 0.5); last = u;
    assert.ok(u > 0 && u < 1);
  }
  for (let k = 0; k < 4; k++) {
    assert.ok(Math.abs(draw[k] / N - P[k]) < 0.012, `draw takes option ${k} at ${draw[k] / N}, its probability is ${P[k]}`);
    assert.ok(Math.abs(held[k] / N - P[k]) < 0.012, `a held draw's first ask takes option ${k} at ${held[k] / N}, its probability is ${P[k]}`);
  }
  // the hash behind the noise: even, and unrelated from one epoch to the next and from one salt to another
  assert.ok(Math.abs(sum / N - 0.5) < 0.01 && Math.abs(lag / N * 12) < 0.03 && Math.abs(cross / N * 12) < 0.03, `mean ${sum / N}, lag correlation ${lag / N * 12}, salt correlation ${cross / N * 12}`);
  // deterministic, and the receipt's numbers are the decode's: u for a draw, g per option for a held draw
  const d = decode({ mode: 'draw', salt: 7 }, at({ version: 12 }), KEYS, P, 0), h = decode({ mode: 'held', salt: 7 }, at({ epoch: 12 }), KEYS, P, 0);
  assert.deepEqual(decode({ mode: 'draw', salt: 7 }, at({ version: 12 }), KEYS, P, 0), d);
  assert.deepEqual(decode({ mode: 'held', salt: 7 }, at({ epoch: 12 }), KEYS, P, 0), h);
  assert.equal(d.index, drawAt(P, d.u!)); assert.equal(h.index, heldAt(P, h.g!));
  assert.deepEqual(h.g, KEYS.map(k => heldNoise(7, at({ epoch: 12 }), k)));
  assert.ok(Math.abs(gumbel(Math.exp(-1))) < 1e-12);
});

test('top is the kernel\'s own pick; an option with probability 0 is never taken; the decode has nothing to fit', () => {
  for (const k of [0, 1, 2, 3]) assert.deepEqual(decode({ mode: 'top', salt: 0 }, at(), KEYS, P, k), { index: k }, 'top passes the kernel\'s pick through, whatever it is');
  assert.equal(topIndex([0.2, 0.4, 0.4]), 1, 'the first maximum');
  for (let i = 0; i < 2000; i++) {
    assert.notEqual(decode({ mode: 'draw', salt: 1 }, at({ version: i }), KEYS, [0.6, 0, 0.4, 0], 1).index % 2, 1);
    assert.notEqual(decode({ mode: 'held', salt: 1 }, at({ epoch: i }), KEYS, [0.6, 0, 0.4, 0], 1).index % 2, 1);
  }
  assert.equal(decode({ mode: 'draw', salt: 1 }, at(), KEYS, [0, 0, 0, 0], 2).index, 2, 'no option can be drawn: the kernel\'s pick');
  assert.equal(decode({ mode: 'held', salt: 1 }, at(), KEYS, [0, 0, 0, 0], 2).index, 2);
  assert.equal(decode({ mode: 'draw', salt: 1 }, at(), KEYS, [0, 0, 1, 0], 0).index, 2, 'a certain kernel is not changed by drawing');
  assert.equal(decode({ mode: 'held', salt: 1 }, at(), KEYS, [0, 0, 1, 0], 0).index, 2, 'or by holding');
  // probabilities that do not sum to 1 are used in proportion (their own scale), not rescaled by anything else
  for (let i = 0; i < 200; i++) assert.equal(decode({ mode: 'draw', salt: 1 }, at({ version: i }), KEYS, P.map(x => x / 4), 0).index, decode({ mode: 'draw', salt: 1 }, at({ version: i }), KEYS, P, 0).index);
  // nothing to fit: a setting is a mode and a salt (a harness adds which epoch); extra fields are not read
  assert.deepEqual([...DECODE_MODES], ['top', 'draw', 'held']);
  for (const mode of DECODE_MODES) assert.deepEqual(decode({ mode, salt: 3, temperature: 0.2, offset: [5, 0, 0, 0], prior: [0, 0, 0, 1], weights: [9, 1, 1, 1] } as never, at({ version: 5, epoch: 5 }), KEYS, P, 1), decode({ mode, salt: 3 }, at({ version: 5, epoch: 5 }), KEYS, P, 1));
  for (const a of Object.values(R9_ARMS)) if (a.decode) assert.deepEqual(Object.keys(a.decode).sort(), ['hold', 'mode', 'salt']);
  const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const f of ['src/kernel/decode.ts', 'scripts/lib/decoder.ts']) assert.equal(/temperature|offset|prior|weight|bias|calibrat|threshold|rescale|softmax|Math\.pow|\*\*/i.exec(code(f)), null, `${f} has no fitted knob`);
  assert.ok(!/world\.rng|random\(|Math\.random/.test(code('src/kernel/decode.ts') + code('scripts/lib/decoder.ts')), 'the decode has no random generator and never reads the world\'s');
});

test('a held draw keeps its option through a re-ask, a changed menu order and a wider menu; a rival wins only on the model\'s own odds', () => {
  for (let e = 0; e < 300; e++) {
    const a = at({ epoch: e }), first = decode({ mode: 'held', salt: 1 }, a, KEYS, P, 0), won = KEYS[first.index];
    // asked again in the same state, at another decision version: the same option
    assert.equal(KEYS[decode({ mode: 'held', salt: 1 }, at({ epoch: e, version: 99 }), KEYS, P, 0).index], won);
    // the menu in another order: the same option, because the noise follows the option's key
    const order = [2, 0, 3, 1], again = decode({ mode: 'held', salt: 1 }, a, order.map(i => KEYS[i]), order.map(i => P[i]), 0);
    assert.equal(order.map(i => KEYS[i])[again.index], won);
    // a narrower menu that still holds it: the same option
    const keep = [0, 1, 2, 3].filter(i => i === first.index || i % 2 === 0), narrow = decode({ mode: 'held', salt: 1 }, a, keep.map(i => KEYS[i]), keep.map(i => P[i]), 0);
    assert.equal(keep.map(i => KEYS[i])[narrow.index], won);
    // a new option: either the held option stays or the newcomer takes it; no third option can
    const wide = decode({ mode: 'held', salt: 1 }, a, [...KEYS, 'drink:200001'], [...P, 0.2], 0);
    assert.ok(wide.index === first.index || wide.index === 4);
    // the odds move toward a rival: it wins exactly when its ln p + g passes the winner's
    const g = first.g!, rival = (first.index + 1) % 4, lead = Math.log(P[first.index]) + g[first.index] - (Math.log(P[rival]) + g[rival]);
    for (const shift of [lead - 0.01, lead + 0.01]) {
      const p = P.map((x, i) => i === rival ? x * Math.exp(shift) : x), z = Math.max(1, ...p), moved = decode({ mode: 'held', salt: 1 }, a, KEYS, p.map(x => x / z), 0).index;
      if (shift < lead) assert.equal(moved, first.index, 'short of the lead: the held option stays');
      else assert.notEqual(moved, first.index, 'past the lead: the held draw is overturned');
    }
    // another epoch, another salt, another animal: other noise
    assert.notDeepEqual(decode({ mode: 'held', salt: 1 }, at({ epoch: e + 1000 }), KEYS, P, 0).g, g);
    assert.notDeepEqual(decode({ mode: 'held', salt: 2 }, a, KEYS, P, 0).g, g);
    assert.notDeepEqual(decode({ mode: 'held', salt: 1 }, at({ epoch: e, chimpId: 4 }), KEYS, P, 0).g, g);
  }
  // a fresh draw is re-rolled by a re-ask; two salts give two series
  const series = (salt: number) => Array.from({ length: 300 }, (_, v) => decode({ mode: 'draw', salt }, at({ version: v }), KEYS, P, 0).index).join('');
  assert.equal(series(1), series(1)); assert.notEqual(series(1), series(2));
  assert.ok(new Set(series(1)).size === 4, 'every option is drawn sometimes');
});

test('the decode step of the loop: absent it is today\'s path; given, it reads the checked answer and never writes the world', async () => {
  const w = structuredClone(base()), focal = focalSet(w).map(f => f.id);
  w.modelPolicy = { ...w.modelPolicy, mode: 'lockstep' };
  let passes = 0, calls = 0, moved = 0;
  for (let i = 0; i < 400 && passes < 12; i++) {
    for (const c of w.chimps) c.controller = c.alive && focal.includes(c.id) ? 'model' : 'rules';
    tickWorld(w);
    if (!w.chimps.some(c => c.controller === 'model' && c.awaitingDecisionSince !== null)) continue;
    // the same pass twice on two copies: without a step, and with a step that takes the last option
    const plain = structuredClone(w), withTop = structuredClone(w), rng = w.rng;
    await answerWaiting(plain, c => focal.includes(c.id) ? steady : null);
    await answerWaiting(withTop, c => focal.includes(c.id) ? steady : null, { decode: (_c, _request, answer) => answer.index });
    assert.equal(worldHash(withTop), worldHash(plain), 'a step that returns the kernel\'s pick changes nothing');
    const results = await answerWaiting(w, c => focal.includes(c.id) ? steady : null, { decode: (c, request, answer) => {
      calls++;
      assert.equal(request.context.chimpId, c.id); assert.equal(answer.probabilities.length, request.options.length); assert.equal(answer.index, topIndex(answer.probabilities));
      assert.equal(w.rng, rng, 'the world\'s random stream is where the tick left it');
      return request.options.length - 1;
    } });
    for (const r of results) if (r.by === 'kernel') {
      assert.equal(r.index, r.request!.options.length - 1, 'the position the step chose is the one applied');
      if (r.index !== topIndex((steady.decide(r.request!, { random: () => 0 }) as { probabilities: number[] }).probabilities)) moved++;
    }
    passes++;
  }
  assert.ok(passes >= 5 && calls >= passes && moved > 0, `${passes} passes, ${calls} decode calls, ${moved} choices moved by the step`);
  // an answer that fails the answer check never reaches the step, and the rules decide as before
  const broken: Kernel = { id: 'gliner', label: 'fake: broken', decide: request => ({ index: 0, probabilities: request.options.map(() => 2) }) };
  const b = structuredClone(base()); b.modelPolicy = { ...b.modelPolicy, mode: 'lockstep' };
  let reached = 0, refused = 0;
  for (let i = 0; i < 200 && refused < 3; i++) {
    for (const c of b.chimps) c.controller = c.alive && focal.includes(c.id) ? 'model' : 'rules';
    tickWorld(b);
    for (const r of await answerWaiting(b, c => focal.includes(c.id) ? broken : null, { decode: () => { reached++; return 0; } })) if (r.refusal === 'invalid-answer') refused++;
  }
  assert.ok(refused >= 3 && reached === 0);
});

test('the harness\'s epochs: an act epoch opens when the act is replaced, at an interrupt or after a fallback, and never by asking again; a block epoch by the clock', () => {
  const w = structuredClone(base()), c = w.chimps.find(x => x.alive && x.age >= 15 && requestFor(w, x).refusal === '')!;
  assert.ok(c, 'an adult with a real choice');
  const ask = (dec: ReturnType<typeof newDecoder>, world = w) => { const r = requestFor(world, c).request, p = (steady.decide(r, { random: () => 0 }) as { probabilities: number[] }).probabilities; const i = dec.step(world)(c, r, { index: topIndex(p), probabilities: p }); return { r, i }; };
  const settle = (dec: ReturnType<typeof newDecoder>, a: { r: KernelRequest; i: number }, by: 'kernel' | 'rules' = 'kernel') => dec.settle(w, { chimpId: c.id, kernel: 'gliner', by, refusal: '', detail: '', index: a.i, request: a.r, calls: 1 })!;
  const doing = (o: { action: string; targetId: number }) => { c.action = o.action as never; c.targetId = o.targetId; };
  const h0 = worldHash(w), rng0 = w.rng;
  const dec = newDecoder({ mode: 'held', salt: 1, hold: 'act' });
  let a = ask(dec), rec = settle(dec, a);
  assert.equal(worldHash(w), h0, 'the decode step and its notes write nothing in the world'); assert.equal(w.rng, rng0);
  assert.deepEqual([rec.open, rec.prev, rec.epoch, rec.mode, rec.salt, rec.hold], ['first', null, c.decisionVersion, 'held', 1, 'act']);
  assert.equal(rec.g!.length, a.r.options.length); assert.equal(rec.index, a.i); assert.equal(rec.kernel, topIndex((steady.decide(a.r, { random: () => 0 }) as { probabilities: number[] }).probabilities));
  const first = rec, firstKeys = a.r.options.map(optionKey);
  // the animal is doing what was applied; it is asked again and again (a bout end, a timer): the same epoch, and every option keeps its noise
  let applied = a.r.options[a.i];
  for (let k = 0; k < 5; k++) {
    doing(applied); c.decisionVersion++;
    a = ask(dec); rec = settle(dec, a);
    const keys = a.r.options.map(optionKey);
    assert.equal(rec.open, '', 'a re-ask opens nothing'); assert.equal(rec.epoch, first.epoch);
    assert.equal(rec.prev, keys.indexOf(optionKey(applied)), 'where the option applied last sits on this menu (-1: missing)');
    keys.forEach((key, j) => { const was = firstKeys.indexOf(key); if (was >= 0) assert.equal(rec.g![j], first.g![was], 'the same option, the same noise'); });
    if (rec.prev! >= 0 && keys.every(key => firstKeys.includes(key))) assert.equal(a.i, rec.prev, 'steady odds and no new option: the held option is taken again');
    applied = a.r.options[a.i];
  }
  // an event it perceived: a new epoch, with other noise
  doing(applied); c.decisionVersion++; ix(c).lastIntrAt = w.time + 0.001; w.time += 0.002;
  a = ask(dec); rec = settle(dec, a);
  assert.deepEqual([rec.open, rec.epoch], ['interrupt', c.decisionVersion]);
  a.r.options.map(optionKey).forEach((key, j) => { const was = firstKeys.indexOf(key); if (was >= 0) assert.notEqual(rec.g![j], first.g![was]); });
  // its act was replaced (it ended and the loop set it to rest, or the world changed it)
  doing(a.r.options[a.i].action === 'rest' ? { action: 'travel', targetId: -1 } : { action: 'rest', targetId: -1 });
  c.decisionVersion++;
  a = ask(dec); rec = settle(dec, a);
  assert.equal(rec.open, 'replaced');
  // a trip the loop's gate turned into the meal at its tree
  const trip = { ...a.r, options: a.r.options.map((o, j) => j === 0 ? { ...o, action: 'travel' as const, targetId: 100123 } : o) };
  c.decisionVersion++;
  dec.step(w)(c, trip, { index: 0, probabilities: trip.options.map((_, j) => +(j === 0)) });
  settle(dec, { r: trip, i: 0 });
  doing({ action: 'forage', targetId: 100123 }); c.decisionVersion++;
  a = ask(dec); rec = settle(dec, a);
  assert.equal(rec.open, 'arrived');
  // the last ask went to the rules: the next one opens an epoch
  doing(a.r.options[a.i]); c.decisionVersion++;
  a = ask(dec); settle(dec, a, 'rules');
  c.decisionVersion++;
  a = ask(dec); rec = settle(dec, a);
  assert.deepEqual([rec.open, rec.prev], ['rules', null]);
  // an interrupt raised in the same pass, after the choice was applied, is pending: the next ask opens an epoch
  doing(a.r.options[a.i]); ix(c).intr = 'A display nearby';
  c.decisionVersion++; a = ask(dec); rec = settle(dec, a);
  ix(c).intr = ''; doing(a.r.options[a.i]); c.decisionVersion++;
  a = ask(dec); rec = settle(dec, a);
  assert.equal(rec.open, 'interrupt');

  // the whole-act hold (exploratory): an interrupt asks again under the same noise; only a replaced act opens an epoch
  const whole = newDecoder({ mode: 'held', salt: 1, hold: 'whole' });
  ix(c).intr = ''; a = ask(whole); const w0 = settle(whole, a);
  doing(a.r.options[a.i]); c.decisionVersion++; ix(c).lastIntrAt = w.time + 0.001; w.time += 0.002;
  a = ask(whole); rec = settle(whole, a);
  assert.deepEqual([rec.open, rec.epoch], ['', w0.epoch], 'held through the interrupt');
  doing(a.r.options[a.i].action === 'rest' ? { action: 'travel', targetId: -1 } : { action: 'rest', targetId: -1 }); c.decisionVersion++; ix(c).lastIntrAt = w.time + 0.001; w.time += 0.002;
  a = ask(whole); rec = settle(whole, a);
  assert.equal(rec.open, 'replaced');
  // the act hold says when an interrupted ask's act had also been replaced
  const both = newDecoder({ mode: 'top', salt: 0, hold: 'act' });
  a = ask(both); settle(both, a);
  doing(a.r.options[a.i]); c.decisionVersion++; ix(c).lastIntrAt = w.time + 0.001; w.time += 0.002;
  a = ask(both); rec = settle(both, a);
  assert.deepEqual([rec.open, rec.also], ['interrupt', undefined]);
  doing(a.r.options[a.i].action === 'rest' ? { action: 'travel', targetId: -1 } : { action: 'rest', targetId: -1 }); c.decisionVersion++; ix(c).lastIntrAt = w.time + 0.001; w.time += 0.002;
  a = ask(both); rec = settle(both, a);
  assert.deepEqual([rec.open, rec.also], ['interrupt', 'replaced']);

  // a run that stops and resumes: the decoder's notes are plain data, and a decoder rebuilt from them goes on as the first would
  const one = newDecoder({ mode: 'held', salt: 3, hold: 'act' });
  a = ask(one); settle(one, a); doing(a.r.options[a.i]); c.decisionVersion++;
  const saved = JSON.parse(JSON.stringify(one.snapshot())) as ReturnType<typeof one.snapshot>, two = newDecoder({ mode: 'held', salt: 3, hold: 'act' }, saved);
  assert.deepEqual(saved[c.id], { key: optionKey(a.r.options[a.i]), at: w.time, epoch: c.decisionVersion - 1, pending: false });
  const x1 = ask(one), r1 = settle(one, x1), x2 = ask(two), r2 = settle(two, x2);
  assert.deepEqual(r2, r1); assert.equal(r1.open, ''); assert.deepEqual(two.snapshot(), one.snapshot());
  assert.equal(settle(newDecoder({ mode: 'held', salt: 3, hold: 'act' }), ask(newDecoder({ mode: 'held', salt: 3, hold: 'act' }))), null, 'a result no decode step saw has no record');

  // the block hold: the half hour of the world's clock, whatever the animal does
  const blk = newDecoder({ mode: 'held', salt: 1, hold: 'block' });
  w.time = 100 * BLOCK_H + 0.01; ix(c).lastIntrAt = 0;
  a = ask(blk); rec = settle(blk, a);
  assert.deepEqual([rec.open, rec.epoch], ['first', 100]);
  doing({ action: 'rest', targetId: -1 }); ix(c).lastIntrAt = w.time; w.time += 0.2; c.decisionVersion++;
  a = ask(blk); const same = settle(blk, a);
  assert.deepEqual([same.open, same.epoch], ['', 100], 'an interrupt and a new act do not open a block epoch');
  w.time += BLOCK_H; c.decisionVersion++;
  a = ask(blk); rec = settle(blk, a);
  assert.deepEqual([rec.open, rec.epoch], ['block', 101]);
  // the tally of a day: epochs by reason, re-asks, held option there or gone, changes
  const t = newTally(), R = (open: DecodeRecord['open'], prev: number | null): DecodeRecord => ({ mode: 'held', salt: 1, hold: 'act', epoch: 1, open, prev, kernel: 0, index: 0 });
  tallyAsk(t, R('first', null), 2); tallyAsk(t, R('', 2), 2); tallyAsk(t, R('', 2), 1); tallyAsk(t, R('', -1), 0); tallyAsk(t, R('', 1), -1); tallyAsk(t, R('interrupt', 1), 3);
  assert.deepEqual(t, { opened: { first: 1, interrupt: 1 }, reasks: 4, there: 2, flips: 1, gone: 1 });
});

test('in the loop: top is today byte for byte; draw and held are deterministic, salted, logged, and replayed from the receipts with no kernel', async () => {
  const b = base(), h0 = worldHash(b), focal = focalSet(b), none = collect(), top = collect(), d1 = collect(), d1b = collect(), d2 = collect(), h = collect();
  const plain = await runArm(b, 'plain', arm(), SHORT, focal, steady, { receipts: none.receipts });
  const asTop = await runArm(b, 'top', arm({ mode: 'top', salt: 0, hold: 'act' }), SHORT, focal, steady, { receipts: top.receipts });
  assert.equal(asTop.endHash, plain.endHash, 'mode top ends on the world of an arm with no decode step');
  assert.ok(none.got.length > 30 && none.got.every(r => !('dec' in r)), 'an arm without a decode step writes the receipts of earlier stages');
  assert.equal(JSON.stringify(top.got.map(({ dec: _dec, ms: _ms, ...r }) => r)), JSON.stringify(none.got.map(({ ms: _ms, ...r }) => r)), 'and mode top only adds its record to them');
  assert.ok(top.got.every(r => r.by !== 'kernel' || (r.dec!.mode === 'top' && r.dec!.index === r.index && r.picked === r.index && r.dec!.u === undefined && r.dec!.g === undefined)));

  const draw1 = await runArm(b, 'draw', arm({ mode: 'draw', salt: 1, hold: 'act' }), SHORT, focal, steady, { receipts: d1.receipts });
  const again = await runArm(b, 'draw', arm({ mode: 'draw', salt: 1, hold: 'act' }), SHORT, focal, steady, { receipts: d1b.receipts });
  const draw2 = await runArm(b, 'draw', arm({ mode: 'draw', salt: 2, hold: 'act' }), SHORT, focal, steady, { receipts: d2.receipts });
  const strip = (v: Receipt[]) => JSON.stringify(v.map(({ ms: _ms, ...r }) => r));
  assert.equal(again.endHash, draw1.endHash); assert.equal(strip(d1b.got), strip(d1.got), 'the same salt repeats exactly');
  assert.notEqual(draw2.endHash, draw1.endHash, 'another decode salt is another world'); assert.notEqual(draw1.endHash, plain.endHash, 'a draw is not the top pick');
  for (const r of d1.got) if (r.by === 'kernel') {
    assert.ok(r.dec!.mode === 'draw' && typeof r.dec!.u === 'number' && r.dec!.kernel === r.index && r.dec!.index === r.picked);
    assert.equal(r.picked, drawAt(r.p!, r.dec!.u!), 'the option applied is the one the logged draw gives on the logged probabilities');
  }
  assert.ok(d1.got.some(r => r.by === 'kernel' && r.picked !== r.index), 'some draws leave the top pick');

  // held, with the gate off so that the animals are asked again inside their acts
  const hd = collect(), free = collect();
  const held = await runArm(b, 'held', arm({ mode: 'held', salt: 1, hold: 'act' }, 0), SHORT, focal, steady, { receipts: h.receipts });
  const drawFree = await runArm(b, 'draw-free', arm({ mode: 'draw', salt: 1, hold: 'act' }, 0), SHORT, focal, steady, { receipts: free.receipts });
  const count = (v: Receipt[]) => { const t = newTally(); for (const r of v) if (r.dec) tallyAsk(t, r.dec, r.by === 'kernel' ? r.picked : -1); return t; };
  const th = count(h.got), td = count(free.got);
  assert.ok(th.there > 20 && td.there > 20, `${th.there} and ${td.there} re-asks with the option applied last on the menu`);
  assert.equal(heldBreaks(h.got), 0, 'a held draw is never re-rolled by a re-ask: with steady odds only an option new to the menu can take its place');
  assert.ok(th.flips / th.there < 0.5 * td.flips / td.there, `held draws overturned at ${(th.flips / th.there).toFixed(2)} of re-asks against ${(td.flips / td.there).toFixed(2)} re-rolled by a fresh draw`);
  for (const r of h.got) if (r.by === 'kernel') assert.equal(r.picked, heldAt(r.p!, r.dec!.g!), 'the option applied is the one the logged noise gives on the logged probabilities');
  // replay from the receipts: no kernel, the same world, the same decode
  for (const [run, log, spec] of [[held, h.got, arm({ mode: 'held', salt: 1, hold: 'act' }, 0)], [draw1, d1.got, arm({ mode: 'draw', salt: 1, hold: 'act' })]] as const) {
    const stats = { missing: 0, menuDiffers: 0 }, out = collect();
    const rp = await runArm(b, 'replay', spec, SHORT, focal, replayKernel(log, stats), { replay: stats, receipts: out.receipts });
    assert.equal(rp.endHash, run.endHash, 'the replay ends in the run\'s world'); assert.deepEqual([stats.missing, stats.menuDiffers], [0, 0]);
    assert.equal(decodeDiffers(log, out.got), 0, 'and reproduces every draw and every noise value');
  }
  // the check can fail: the receipts replayed under another salt give other noise and another world
  const stats = { missing: 0, menuDiffers: 0 };
  const off = await runArm(b, 'replay', arm({ mode: 'held', salt: 2, hold: 'act' }, 0), SHORT, focal, replayKernel(h.got, stats), { replay: stats, receipts: hd.receipts });
  assert.ok(decodeDiffers(h.got, hd.got) > 0 && off.endHash !== held.endHash);
  assert.ok(drawFree.rows.length === 0 && held.rows.length === 0, 'a window shorter than a day has no day rows');
  assert.equal(worldHash(base()), h0, 'the burned-in world is never written');
});

test('a day of the loop carries the new readouts: act changes in every arm, the decode\'s tallies where there is a decode', async () => {
  const b = base(), focal = focalSet(b), got = collect();
  const rules = await runArm(b, 'rules', ARMS.rules, 1, focal, null), plain = structuredClone(b);
  for (let i = 0; i < 5760; i++) tickWorld(plain);
  assert.equal(rules.endHash, worldHash(plain), 'counting writes nothing');
  for (const r of rules.rows) { assert.ok(r.changes! > 5 && r.changes! < 600 && r.kindChanges! > 5 && r.kindChanges! < 600, `${r.changes} act changes, ${r.kindChanges} of kind`); assert.equal(r.dec, undefined); }
  const even = await runArm(b, 'even-block', specOf('even-block')!, 1, focal, nullKernel, { receipts: got.receipts });
  const t = newTally(); for (const r of got.got) if (r.dec) tallyAsk(t, r.dec, r.by === 'kernel' ? r.picked : -1);
  const o = overturn(even.rows.map(row => ({ seed: 48, row })));
  assert.deepEqual([o.reasks, o.there, o.flips, o.gone], [t.reasks, t.there, t.flips, t.gone], 'the day rows hold the receipts\' tallies');
  assert.ok(o.epochs >= 50 && o.opened.block > 0 && o.reasks > 0 && heldBreaks(got.got) === 0);
});

test('the offline replay walks saved asks under each decode and epoch rule (first order)', () => {
  // one animal, six asks five minutes apart, the odds A : B : C always 6 : 3 : 1; the menu loses A at the fourth ask, inside the first epoch
  const mk = (i: number, opts: [string, number][], p: number[], open: string, epoch: number): Receipt => ({ tick: 1000 + 20 * i, t: 10 + i / 12, id: 7, v: 50 + i, phase: 'day', n: opts.length, rulesIndex: 0, opts, fam: opts.map(([a]) => a === 'travel' ? 'food-trip' : a), by: 'kernel', refusal: '', detail: '',
    index: topIndex(p), p, picked: topIndex(p), sha: '', tokens: 0, ms: 0, dec: { mode: 'top', salt: 0, hold: 'act', epoch, open: open as never, prev: null, kernel: topIndex(p), index: topIndex(p) } });
  const A: [string, number] = ['forage', 100001], B: [string, number] = ['travel', 100002], C: [string, number] = ['rest', -1];
  const log = [mk(0, [A, B, C], [0.6, 0.3, 0.1], 'first', 50), mk(1, [A, B, C], [0.6, 0.3, 0.1], '', 50), mk(2, [C, B, A], [0.1, 0.3, 0.6], '', 50), mk(3, [B, C], [0.75, 0.25], '', 50), mk(4, [A, B, C], [0.6, 0.3, 0.1], 'replaced', 54), mk(5, [A, B, C], [0.6, 0.3, 0.1], 'interrupt', 55)];
  const by = asksOf([...log, { ...log[0], id: 7, tick: 5000, by: 'rules', picked: -1 }]);
  assert.equal(by.get(7)!.length, 6, 'a pass the rules settled is left out');
  assert.deepEqual(missingShare(by), { n: 5, share: 1 / 5 });
  // the top pick as run: A, A, A, then B when A is off the menu (a trip begun), A, A
  const top = walk(by.get(7)!, 'top', 0, 'act', 21);
  assert.deepEqual(top, { asks: 6, opens: 3, reasks: 3, there: 2, flips: 0, gone: 1, changes: 3, trips: 1 });
  // the sceptic's rule opens when the held option is missing, so nothing is ever "gone" there
  const sc = walk(by.get(7)!, 'top', 0, 'sceptic', 21);
  assert.deepEqual([sc.opens, sc.gone, sc.there, sc.flips], [2, 0, 4, 1]);
  // block: asks 0 to 5 fall in two half hours (t 10.0 to 10.42)
  assert.equal(walk(by.get(7)!, 'top', 0, 'block', 21).opens, 1);
  // held: inside an epoch with the same odds the option never changes, whatever the salt; a fresh draw does change
  let heldFlips = 0, drawFlips = 0;
  for (let s = 1; s <= 200; s++) { heldFlips += walk(by.get(7)!, 'held', s, 'act', 21).flips; drawFlips += walk(by.get(7)!, 'draw', s, 'act', 21).flips; }
  assert.equal(heldFlips, 0); assert.ok(drawFlips > 100);
  // whole: the interrupt at the last ask (its act still going) is a re-ask; one marked as also replaced opens
  assert.deepEqual([walk(by.get(7)!, 'top', 0, 'whole', 21).opens, walk(by.get(7)!, 'top', 0, 'whole', 21).reasks], [2, 4]);
  assert.equal(walk(asksOf(log.map((x, i) => i === 5 ? { ...x, dec: { ...x.dec!, also: 'replaced' as const } } : x)).get(7)!, 'top', 0, 'whole', 21).opens, 3);
  const r = replay(by, 'held', 'act', 21, 40);
  assert.equal(r.perSalt.length, 40); assert.equal(r.mean.asks, 6);
  assert.equal(replay(by, 'top', 'act', 21, 40).perSalt.length, 1);
  assert.throws(() => walk(asksOf(log.map(({ dec: _dec, ...x }) => x as Receipt)).get(7)!, 'held', 1, 'act', 21), /needs receipts that carry the epoch/);
});

test('the registered rules: no harm, what a decode is for, and the four statements', () => {
  // ten animals (two seeds of five), two days; a row is built from a few numbers
  const rows = (f: (animal: number, day: number) => Partial<DayRow> & { flips?: number }): Rows => Array.from({ length: 20 }, (_, i) => { const animal = i >> 1, day = i & 1, x = f(animal, day);
    return { seed: animal < 5 ? 21 : 5, row: { id: animal % 5, name: '', cls: '', day, alive: true, kcalIn: 0, kcalFormula: 1600, kcalOut: 0, reserveKcal: 0, reservePct: 0, min: {}, daylightMin: 700, km: 2.5 + 0.2 * (animal % 5), kmFixes: 0, nightMin: 600, nestShare: 1,
      trips: 2, tripsDone: 1, changes: 30, kindChanges: 25, asked: 55, dec: { opened: { first: 1 }, reasks: 20, there: 20, flips: x.flips ?? 10, gone: 0 }, ...x } as DayRow }; });
  const wob = (a: number, d: number) => ((a * 7 + d * 3) % 5 - 2) / 10; // a little spread between animals, the same in every arm
  const rules = rows((a, d) => ({ trips: 8 + wob(a, d), changes: 40 })), top = rows((a, d) => ({ trips: 2 + wob(a, d) })), top3 = rows((a, d) => ({ trips: 14 + wob(a, d) }));
  const redraws = [rows((a, d) => ({ trips: 8.2 + wob(a, d), changes: 41, kcalFormula: 1610, reservePct: 0.02 }))];
  const drawA = rows((a, d) => ({ trips: 4 + wob(a, d) + a / 20, changes: 36 + a / 10, flips: 12 })), drawB = rows((a, d) => ({ trips: 4.3 + wob(a, d) + a / 20, changes: 37 + a / 10 }));
  const noise = (id: string) => noiseOf(id, drawA, drawB, rules, redraws);
  assert.ok(Math.abs(noise('trips') - 0.3) < 1e-9 && Math.abs(noise('changes') - 1) < 1e-9 && Math.abs(noise('kcalFormula') - 10) < 1e-9, 'the larger of the salt difference and the largest re-draw difference');
  assert.ok(differs(drawA, top, 'trips', noise('trips')).differs, 'an interval off 0 and a size above the noise');
  assert.ok(!differs(drawB, drawA, 'trips', noise('trips')).differs, 'a size at the noise is not a difference');
  // no harm, and each way to fail it
  assert.ok(noHarm(drawA, top, rules, noise).holds);
  assert.ok(!noHarm(rows(() => ({ changes: 61 })), top, rules, noise).h2.holds, 'switching doubled');
  assert.ok(noHarm(rows(() => ({ changes: 59 })), top, rules, noise).h2.holds);
  const lost = noHarm(rows(a => ({ nestShare: a < 3 ? 0.5 : 1 })), top, rules, noise);
  assert.deepEqual([lost.h1.arm, lost.h1.top, lost.h1.holds, lost.holds], [14, 20, false, false], 'nights in a nest lost');
  assert.ok(noHarm(rows((a, d) => ({ nestShare: a === 0 && d === 0 ? 0.5 : 1 })), top, rules, noise).h1.holds, 'one night fewer is within the rule');
  assert.ok(!noHarm(rows(a => ({ kcalFormula: 1500 - a })), top, rules, noise).energy.holds, 'energy more than 5% of the rules\' mean below top, interval below 0');
  assert.ok(noHarm(rows(a => ({ kcalFormula: 1540 - a })), top, rules, noise).energy.holds, 'a shortfall inside 5% is not the guard\'s business');
  assert.ok(!noHarm(rows(a => ({ reservePct: -0.3 - a / 100 })), top, rules, noise).reserves.holds);
  assert.ok(!noHarm(rows(a => ({ km: 2.5 + 0.2 * (a % 5) + 0.5 })), top, rules, noise).distance.holds && noHarm(rows(a => ({ km: 2.5 + 0.2 * (a % 5) + 0.2 })), top, rules, noise).distance.holds, 'the limit is the rules\' spread across animals');
  // what a decode is for
  const third = rows((a, d) => ({ trips: 12 + wob(a, d) + a / 20, changes: 38 + a / 10, flips: 12 }));
  assert.ok(whatFor({ arm: drawA, top }, { arm: third, top: top3 }, noise('trips')).holds);
  assert.ok(!whatFor({ arm: top, top }, { arm: third, top: top3 }, noise('trips')).holds, 'the first adapter\'s trips did not move');
  assert.ok(!whatFor({ arm: drawA, top }, { arm: rows((a, d) => ({ trips: 16 + wob(a, d) + a / 20 })), top: top3 }, noise('trips')).holds, 'the third adapter begins more trips still');
  // the statements
  const heldSame = rows((a, d) => ({ trips: 4 + wob(a, d) + a / 20, changes: 36 + a / 10, flips: 3 })), held3same = rows((a, d) => ({ trips: 12 + wob(a, d) + a / 20, changes: 38 + a / 10, flips: 3 }));
  let v = verdicts({ top, draw: drawA, held: heldSame, block: null }, { top: top3, draw: third, held: held3same, block: null }, rules, noise);
  assert.deepEqual([v.drawStandard, v.heldNeeded, v.neither, v.timerDoesAsWell], [true, false, false, false], 'drawing does no harm and does what it is for; holding changes nothing more');
  const heldLess = rows((a, d) => ({ trips: 4.5 + wob(a, d) + a / 20, changes: 30 + a / 12, flips: 3 })), held3less = rows((a, d) => ({ trips: 11 + wob(a, d) + a / 20, changes: 31 + a / 12, flips: 3 }));
  v = verdicts({ top, draw: drawA, held: heldLess, block: heldLess }, { top: top3, draw: third, held: held3less, block: held3less }, rules, noise);
  assert.deepEqual([v.drawStandard, v.act.ii, v.act.mechanism, v.heldNeeded, v.timerDoesAsWell, v.neither], [true, true, true, true, true, false], 'holding switches less beyond noise, by fewer overturned draws; here the block does as well');
  v = verdicts({ top, draw: drawA, held: rows((a, d) => ({ trips: 4.5 + wob(a, d) + a / 20, changes: 30 + a / 12, flips: 12 })), block: null }, { top: top3, draw: third, held: rows((a, d) => ({ trips: 11 + wob(a, d) + a / 20, changes: 31 + a / 12, flips: 12 })), block: null }, rules, noise);
  assert.deepEqual([v.heldNeeded, v.heldUnexplained], [false, true], 'holding wins without overturning less: unexplained, not needed');
  const wild = rows((a, d) => ({ trips: 4 + wob(a, d) + a / 20, changes: 70 }));
  v = verdicts({ top, draw: wild, held: heldSame, block: null }, { top: top3, draw: third, held: held3same, block: null }, rules, noise);
  assert.deepEqual([v.drawStandard, v.act.i, v.heldNeeded], [false, true, true], 'drawing doubles the switching and holding does not');
  v = verdicts({ top, draw: wild, held: wild, block: null }, { top: top3, draw: third, held: held3same, block: null }, rules, noise);
  assert.deepEqual([v.drawStandard, v.heldNeeded, v.neither], [false, false, true], 'both harm: the top pick stays');
  v = verdicts({ top, draw: top, held: top, block: null }, { top: top3, draw: top3, held: top3, block: null }, rules, noise);
  assert.deepEqual([v.drawStandard, v.heldNeeded, v.neither], [false, false, true], 'nothing moves the first adapter\'s trips: no measurable effect');
});

test('the wiring check\'s fake worker speaks the worker\'s protocol, holds no model, and repeats', async () => {
  const was = { python: process.env.MGOGO_DECIDE_PYTHON, server: process.env.MGOGO_DECIDE_SERVER };
  process.env.MGOGO_DECIDE_PYTHON = resolve('scripts/lib/fake-worker.mjs'); delete process.env.MGOGO_DECIDE_SERVER;
  const w = new Worker('none');
  try {
    await w.start();
    assert.equal(w.ready.ready, true); assert.match(JSON.stringify(w.ready.adapters), /no model/);
    const packet = { state: {}, questions: { action: { criteria: { c0: 'Rest here', c1: 'Feed on ripe fruit', c2: 'Groom Tavuni' } } } };
    const [p] = await w.score([{ adapter: 'fake', packet }]), [again] = await w.score([{ adapter: 'fake', packet }]);
    assert.equal(p.length, 3); assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-9 && p.every(x => x > 0)); assert.deepEqual(again, p);
  } finally { w.stop(); if (was.python === undefined) delete process.env.MGOGO_DECIDE_PYTHON; else process.env.MGOGO_DECIDE_PYTHON = was.python; if (was.server !== undefined) process.env.MGOGO_DECIDE_SERVER = was.server; }
  assert.ok(specOf('wire-draw-1')!.kernel === 'gliner' && !['rules', ...Object.keys(R9_ARMS).filter(a => R9_ARMS[a].step === 'dry' && !a.startsWith('wire-'))].includes('wire-draw-1'), 'the wire arms are never part of the default plumbing check');
});
