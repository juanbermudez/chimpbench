import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates } from '../src/sim/candidates';
import { intentOf } from '../src/decide/gate';
import { periodNow } from '../src/decide/facts';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { rgChoice, rgMenu, rgTap } from '../src/sim/rg';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E3d (redecideValue; docs/staging/e3d-prereg.md §5.1): an act is kept while it is still the best by the valuation
// that chose it. The draw is a Gumbel-max over the menu whose noise is held in the intention; a later decision point
// keeps the act unless another option, valued now with its own noise, out-values it. rgMaxAgeH and continueBonus are not
// read; the finished penalty is.

test('redecideValue is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).redecideValue, 0);
});

test('redecideValue on (field): deterministic over a day, JSON-lossless; rgMaxAgeH and continueBonus are not read', () => {
  const T = { redecideValue: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  for (const id of ['rgMaxAgeH', 'continueBonus']) assert.ok(!read.has(id), `${id} is not read`);
  for (const id of ['finishedPenalty', 'rgTemperature', 'candidateJitterSpan']) assert.ok(read.has(id), `${id} is read`);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a, 'the world (intentions with their noise) survives a JSON round trip');
  const held = index(a).alive.filter(c => c.age >= paramsOf(a).rgMinAge && ix(c).rgIntent?.noise);
  assert.ok(held.length > 0, 'intentions hold the noise of their draw');
  for (const c of held) for (const v of Object.values(ix(c).rgIntent!.noise!)) assert.ok(Number.isFinite(v));
});

test('redecideValue removes rgMaxAgeH, continueBonus and the grooming continuation terms from the prescription count', () => {
  // the grooming bout's +0.35 / −0.25 literals are counted since stage E0b (docs/staging/e0b-prereg.md §3) and not applied
  // under redecideValue (candidates.ts groom offer)
  assert.equal(prescriptionCount({ redecideValue: 1 }).total, prescriptionCount({}).total - 3);
});

// A field world after a day with the switch on; one adult (≥ rgMinAge) resting, its intention set by the test.
const snapshot = (() => { let s = ''; return (): World => { if (!s) { const w = createWorld(48, { profile: 'field', params: { redecideValue: 1 } }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s = JSON.stringify(w); } return JSON.parse(s) as World; }; })();
function resting(w: World): { c: Chimp; list: Candidate[] } {
  const P = paramsOf(w);
  const c = index(w).alive.find(k => k.age >= Math.max(15, P.rgMinAge) && k.action !== 'nest' && !ix(k).finished)!;
  c.action = 'rest'; c.targetId = -1;
  const x = ix(c); x.finished = false; x.impulse = 0; x.impulseUntil = -1e9; x.actEnd = w.time;
  const list: Candidate[] = [];
  computeCandidates(w, c, list);
  return { c, list };
}

test('redecideValue: an ongoing act still the best by its valuation is kept; one another option out-values is drawn again', () => {
  for (const [bias, expect] of [[100, 'kept'], [-100, 'outvalued']] as const) {
    const w = snapshot(), { c, list } = resting(w), x = ix(c);
    assert.ok(list.some(k => k.action === 'rest' && k.targetId === -1), 'rest is on the list');
    x.rgIntent = { ...intentOf(w, c, 'rest', -1, 0), noise: { 'rest:-1': bias } };
    let why = '';
    rgTap.fn = (_c, _l, _m, _p, _k, y) => { why = y; };
    const pick = rgChoice(w, c, list);
    rgTap.fn = null;
    assert.equal(why, expect);
    if (expect === 'kept') assert.ok(pick && pick.action === 'rest' && pick.targetId === -1, 'the act is kept');
    else {
      const menu = rgMenu(w, c, list), keys = Object.keys(ix(c).rgIntent!.noise!);
      assert.deepEqual(keys.sort(), menu.map(k => `${k.action}:${k.targetId}`).sort(), 'the new intention holds one noise per menu option');
    }
  }
});

test('redecideValue: an interrupt does not force a draw; the keep test decides', () => {
  const w = snapshot(), { c, list } = resting(w), x = ix(c);
  x.rgIntent = { ...intentOf(w, c, 'rest', -1, 0), noise: { 'rest:-1': 100 } };
  x.lastIntrAt = w.time; // an interrupt after the choice
  let why = '';
  rgTap.fn = (_c, _l, _m, _p, _k, y) => { why = y; };
  rgChoice(w, c, list);
  rgTap.fn = null;
  assert.equal(why, 'kept');
});

test('redecideValue: below rgMinAge the argmax keeps an act that is the best by the jitter of the decision that chose it', () => {
  const w = snapshot(), P = paramsOf(w);
  const c = index(w).alive.find(k => k.age >= 5 && k.age < P.rgMinAge && !ix(k).finished)!;
  const x = ix(c), list: Candidate[] = [];
  computeCandidates(w, c, list);
  const cur = list.find(k => k.action === c.action && k.targetId === c.targetId);
  if (!cur) return; // its act is not on its list at this moment: nothing to keep
  x.jv = c.decisionVersion; // chosen now: the act is the best of this decision's own scores only if it is the top
  const kept = rgChoice(w, c, list);
  assert.equal(kept === cur, list[0] === cur, 'kept exactly when it is the best by the jitter of its choice');
});

// Iteration 2 (redecideValue 2; e3d-prereg.md §5.2): iteration 1's keep test, and a need crossing into another state or
// the light passing into another phase re-opens the choice with a fresh draw; the gate's midday hours are not read.
test('redecideValue 2 (field): deterministic over a day, JSON-lossless; rgMaxAgeH and continueBonus are not read; count −2', () => {
  const T = { redecideValue: 2 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  for (const id of ['rgMaxAgeH', 'continueBonus']) assert.ok(!read.has(id), `${id} is not read`);
  for (const id of ['finishedPenalty', 'rgTemperature']) assert.ok(read.has(id), `${id} is read`);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  assert.equal(prescriptionCount(T).total, prescriptionCount({}).total - 3); // and the grooming continuation terms (stage E0b)
});

const snapshot2 = (() => { let s = ''; return (): World => { if (!s) { const w = createWorld(48, { profile: 'field', params: { redecideValue: 2 } }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s = JSON.stringify(w); } return JSON.parse(s) as World; }; })();

function decideWith(w: World, c: Chimp, list: Candidate[], edit: (it: ReturnType<typeof intentOf>) => void): string {
  const x = ix(c), it = { ...intentOf(w, c, 'rest', -1, 0), noise: { 'rest:-1': 100 } };
  edit(it);
  x.rgIntent = it;
  let why = '';
  rgTap.fn = (_c, _l, _m, _p, _k, y) => { why = y; };
  rgChoice(w, c, list);
  rgTap.fn = null;
  return why;
}

test('redecideValue 2: kept on its held valuation (interrupts included); a need in another state or another light phase re-opens it; the midday hours do not', () => {
  const w = snapshot2(), { c, list } = resting(w);
  ix(c).lastIntrAt = w.time;
  assert.equal(decideWith(w, c, list, () => {}), 'kept', 'an interrupt alone does not re-open the choice');
  const other = (b: string) => (b === 'none' ? 'severe' : 'none') as typeof b;
  assert.equal(decideWith(w, c, list, it => { it.buckets = { ...it.buckets, loneliness: other(it.buckets.loneliness) as never }; }), 'need-bucket');
  const phase = periodNow(w), night = phase === 'night' ? 'dawn' : 'night';
  assert.equal(decideWith(w, c, list, it => { it.period = night; }), 'light-phase');
  if (phase === 'morning' || phase === 'midday' || phase === 'afternoon') {
    const sameLight = phase === 'midday' ? 'morning' : 'midday';
    assert.equal(decideWith(w, c, list, it => { it.period = sameLight; }), 'kept', 'a clock period within the same light phase is not a change');
  }
});

test('redecideValue 2: below rgMinAge an ongoing act is kept by the jitter of its choice until a need or the light changes', () => {
  const w = snapshot2(), P = paramsOf(w);
  const c = index(w).alive.find(k => k.age >= 5 && k.age < P.rgMinAge && !ix(k).finished)!;
  const x = ix(c), list: Candidate[] = [];
  computeCandidates(w, c, list);
  const cur = list.find(k => k.action === c.action && k.targetId === c.targetId);
  if (!cur) return;
  candidateMeta.get(cur)!.raw = 100; // the best by far: kept unless the choice is re-opened
  x.rgIntent = intentOf(w, c, c.action, c.targetId, 0); x.jv = c.decisionVersion;
  assert.equal(rgChoice(w, c, list), cur);
  x.rgIntent = { ...intentOf(w, c, c.action, c.targetId, 0), period: periodNow(w) === 'night' ? 'dawn' : 'night' };
  assert.equal(rgChoice(w, c, list), null, 'a light change re-opens it: the argmax decides');
});
