import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates } from '../src/sim/candidates';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E3b (revisitByCrop; docs/staging/e3b-prereg.md §5): a crown the animal has fed in is valued like any other crown,
// by the crop it believes is there (C7a's belief, written when it leaves; the truth while in view). The crop-blind
// devaluation of a crown just used (revisitW × exp(−h / revisitTauH), C6b design) is not applied and no fed-tree list is kept.

const REPLACED = ['revisitW', 'revisitTauH'];

test('revisitByCrop is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).revisitByCrop, 0);
});

test('revisitByCrop on (field): deterministic over a day; the devaluation is not read and no fed-tree list is kept', () => {
  const T = { revisitByCrop: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  let feeding = 0;
  for (let i = 0; i < 5760; i++) {
    tickWorld(a); tickWorld(b);
    if (i % 31 === 0) for (const c of index(a).alive) if (c.action === 'forage' && c.targetId > 0 && ix(c).phase >= 2) feeding++;
  }
  assert.equal(worldHash(a), worldHash(b));
  for (const id of REPLACED) assert.ok(!read.has(id), `${id} is not read`);
  for (const id of ['fruitValueRef', 'memCropBelief', 'memTravelHungerW']) assert.ok(read.has(id), `${id} is read`);
  assert.ok(feeding > 0, `animals feed in crowns (${feeding} samples)`);
  assert.ok(a.chimps.every(c => (ix(c).fedTree ?? []).length === 0), 'no fed-tree list is kept');
  // off, the same day keeps one (the C6b list is in use in the field profile)
  const o = createWorld(48, { profile: 'field' });
  for (let i = 0; i < 5760; i++) tickWorld(o);
  assert.ok(o.chimps.some(c => (ix(c).fedTree ?? []).length > 0), 'off: the fed-tree list is kept');
});

// A field world after a day, one adult next to one fruiting crown; the forage score of that crown under each setting.
const snapshot = (() => { let s = ''; return (): World => { if (!s) { const w = createWorld(48, { profile: 'field' }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s = JSON.stringify(w); } return JSON.parse(s) as World; }; })();

function crownScore(on: 0 | 1, opts: { fedHere?: boolean; cropScale?: number } = {}) {
  const w = snapshot();
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, revisitByCrop: on };
  const P = paramsOf(w);
  const c = w.chimps.find(x => x.alive && x.age >= 15 && x.sex === 'female' && !x.lactating && x.action !== 'nest')!;
  const t = w.trees.filter(q => q.common !== 'fig').reduce((a, q) => fruitAt(w, q) > fruitAt(w, a) ? q : a); // the largest drupe crop
  c.position = [t.position[0] + 3, 0, t.position[2]];
  c.action = 'rest'; c.targetId = -1; c.hunger = 0.6;
  if (opts.cropScale !== undefined) t.depletion = [fruitAt(w, t) * (1 - opts.cropScale), w.time];
  const x = ix(c); x.trees = [t.id]; x.seen = [];
  if (opts.fedHere) { x.fedTree = [t.id]; x.fedAt = [w.time]; } else { x.fedTree = []; x.fedAt = []; }
  const out: Candidate[] = [];
  computeCandidates(w, c, out);
  const k = out.find(q => q.action === 'forage' && q.targetId === t.id);
  return { score: k?.score ?? NaN, P };
}

test('revisitByCrop: a crown just fed in keeps its worth (off: it loses revisitW, whatever is left)', () => {
  const on = crownScore(1), onFed = crownScore(1, { fedHere: true }), off = crownScore(0), offFed = crownScore(0, { fedHere: true });
  assert.ok(Math.abs(onFed.score - on.score) < 1e-9, 'on: no devaluation');
  assert.ok(Math.abs(off.score - offFed.score - off.P.revisitW) < 1e-9, 'off: the crown just fed in loses revisitW');
});

test('revisitByCrop: a crown is worth less when less is left in it (the crop, not the visit, sets its worth)', () => {
  const full = crownScore(1, { fedHere: true }), emptied = crownScore(1, { fedHere: true, cropScale: 0.2 });
  assert.ok(emptied.score < full.score - 1e-6, `on: a depleted crown is worth less (${emptied.score} < ${full.score})`);
});
