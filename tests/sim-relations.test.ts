import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, getEligibleActions, observe, relationshipOf, stepWorld, tickWorld } from '../src/simulation';
import { startAction } from '../src/sim/execution';
import { dominates, maternalKin, relationOf } from '../src/sim/hierarchy';
import { dailyLife } from '../src/sim/life';
import { perceive } from '../src/sim/perception';
import { noteEvent, recordAggression, recordGrooming, recordReconciliation, recordSupport, tensionOf } from '../src/sim/relations';
import { ix } from '../src/sim/state';
import { DEFAULTS } from '../src/sim/params';
const TENSION_HALF_LIFE_DAYS = DEFAULTS.tensionHalfLifeDays, MONTH_HOURS = DEFAULTS.memoryMonthDays * 24;
import type { Chimp, Interaction, MemoryDigest, PartnerTally, World } from '../src/types';

const runTo = (w: World, hour: number) => { while (w.time < hour - 6.5 - 1e-9) tickWorld(w); };
const byId = (w: World, id: number) => w.chimps.find(c => c.id === id)!;
const place = (c: Chimp, x: number, z: number) => { c.position = [x, 0, z]; c.nest = null; };
const TICKS_PER_MONTH = 172_800; // 30 ecological days of 15 s ticks
const months = (c: Chimp) => (c.digests ?? []).filter(d => d.period === 'month');
const years = (c: Chimp) => (c.digests ?? []).filter(d => d.period === 'year');

test('tension rises after an attack, more for the victim, and falls after reconciliation, most when the bond is high', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const t = w.troops[0];
  const A = byId(w, t.maleHierarchy[1]), B = byId(w, t.maleHierarchy[2]);
  place(A, -52, 8); place(B, -51, 8);
  startAction(w, A, { action: 'attack', targetId: B.id, score: 1, reason: 'probe' }, 'rules');
  const given = tensionOf(A, B), received = tensionOf(B, A);
  assert.ok(given > 0 && received > given, `victim ${received.toFixed(3)} > aggressor ${given.toFixed(3)} > 0`);
  assert.equal(relationshipOf(w, B, A).lastIncident?.direction, 'received');
  assert.equal(relationshipOf(w, A, B).lastIncident?.kind, 'attack');
  for (let i = 0; i < 12; i++) tickWorld(w);
  place(A, -52, 8); place(B, -51, 8);
  startAction(w, A, { action: 'reconcile', targetId: B.id, score: 1, reason: 'probe' }, 'rules');
  const start = w.time;
  let beforeA = 0, beforeB = 0;
  for (let i = 0; i < 20 && !(ix(A).recon > start); i++) { beforeA = tensionOf(A, B); beforeB = tensionOf(B, A); tickWorld(w); }
  assert.ok(ix(A).recon > start, 'the reconciliation happened');
  assert.ok(beforeA > 0 && tensionOf(A, B) <= beforeA * 0.66 && tensionOf(B, A) <= beforeB * 0.66, 'reconciliation removes at least a third of the tension');
  assert.ok((relationshipOf(w, A, B).counts.month.reconciliations ?? 0) >= 1);
  // Valuable relationships are repaired more by the same reconciliation.
  const [C, D, E] = t.femaleHierarchy.slice(0, 3).map(id => byId(w, id));
  for (const [p, q] of [[C, D], [D, C], [C, E], [E, C]]) ix(p).tension[q.id] = 0.8;
  C.bonds[D.id] = D.bonds[C.id] = 0.9; C.bonds[E.id] = E.bonds[C.id] = 0.1;
  recordReconciliation(w, C, D); recordReconciliation(w, C, E);
  assert.ok(tensionOf(C, D) < tensionOf(C, E) - 0.2, `high bond ${tensionOf(C, D).toFixed(2)} vs low bond ${tensionOf(C, E).toFixed(2)}`);
});

test('tension decays with a three-week half-life when nothing happens', () => {
  const w = createWorld(7);
  const a = w.chimps.find(c => c.troopId === 1 && c.age > 20)!, b = w.chimps.find(c => c.troopId === 2 && c.age > 20)!;
  ix(a).tension[b.id] = 0.8;
  for (let d = 0; d < TENSION_HALF_LIFE_DAYS; d++) dailyLife(w);
  assert.ok(Math.abs(tensionOf(a, b) - 0.4) < 1e-9, `after ${TENSION_HALF_LIFE_DAYS} days: ${tensionOf(a, b)}`);
  for (let d = 0; d < 7 * TENSION_HALF_LIFE_DAYS; d++) dailyLife(w);
  assert.equal(ix(a).tension[b.id], undefined, 'negligible tension is forgotten');
});

test('tension lowers grooming, drives avoidance of a dominant and grudge charges by a dominant', () => {
  const w = createWorld(48);
  runTo(w, 9.5);
  const t = w.troops[0];
  const dom = byId(w, t.maleHierarchy[0]);
  const sub = w.chimps.find(c => c.alive && c.troopId === t.id && c.sex === 'female' && c.age > 18 && c.swelling < 0.5 && !maternalKin(c, dom))!;
  assert.ok(dominates(dom, sub));
  sub.allies = sub.allies.filter(id => id !== dom.id);
  place(sub, -40, 10); place(dom, -38.5, 10);
  dom.action = 'rest'; dom.targetId = -1; sub.action = 'rest'; sub.targetId = -1;
  ix(dom).lastAgg = -1e9; dom.hunger = sub.hunger = 0.2; sub.social = 0.2;
  perceive(w, sub); perceive(w, dom);
  // only the pair in view, so other grooming partners cannot take the limited candidate slots (scene independent of who else is near)
  ix(sub).seen = [dom.id]; ix(dom).seen = [sub.id];
  const score = (c: Chimp, action: string, target: number) => getEligibleActions(w, c).find(k => k.action === action && k.targetId === target);
  const groomCalm = score(sub, 'groom', dom.id);
  assert.ok(groomCalm, 'a lonely subordinate would groom a resting dominant');
  assert.equal(score(sub, 'flee', dom.id), undefined, 'no avoidance without tension');
  ix(sub).tension[dom.id] = 0.8; ix(sub).incident[dom.id] = [w.time, 3];
  const groomTense = score(sub, 'groom', dom.id);
  assert.ok(!groomTense || groomTense.score < groomCalm.score, 'tension lowers the grooming score');
  const avoid = score(sub, 'flee', dom.id);
  assert.ok(avoid && /Keep away from .*attacked me/.test(avoid.reason), 'a tense subordinate keeps away from the dominant');
  assert.equal(relationOf(w, sub, dom), 'rival', 'high tension makes a rival');
  assert.equal(score(dom, 'charge', sub.id), undefined, 'no grudge charge without tension');
  ix(dom).tension[sub.id] = 0.8; ix(dom).incident[sub.id] = [w.time, 1];
  const grudge = score(dom, 'charge', sub.id);
  assert.ok(grudge && /tension between us/.test(grudge.reason), 'a dominant charges a subordinate whose aggression is unrepaired');
});

// One 30-day world shared by the digest, history and relationship tests.
let month: { w: World; mates: number; consoles: number } | null = null;
function monthWorld() {
  if (month) return month;
  const w = createWorld(48);
  const inters: Interaction[] = [];
  const push = w.interactions.push.bind(w.interactions);
  (w.interactions as unknown as { push: (...i: Interaction[]) => number }).push = (...i: Interaction[]) => { inters.push(...i); return push(...i); };
  for (let i = 0; i < TICKS_PER_MONTH; i++) tickWorld(w);
  month = { w, mates: inters.filter(i => i.kind === 'mate').length, consoles: inters.filter(i => i.kind === 'console').length };
  return month;
}
const sumAll = (w: World, key: keyof PartnerTally) => {
  let s = 0;
  for (const c of w.chimps) {
    for (const d of months(c)) s += d.totals[key] ?? 0;
    for (const k in ix(c).month.partners) s += ix(c).month.partners[k][key] ?? 0;
  }
  return s;
};

test('a monthly digest closes at 30 ecological days with counts that match what happened', () => {
  const { w, mates, consoles } = monthWorld();
  const founders = w.chimps.filter(c => c.alive && c.birthTime <= 0);
  assert.ok(founders.length > 40);
  for (const c of founders) {
    const ds = months(c);
    assert.equal(ds.length, 1, `${c.name} has one monthly digest`);
    assert.equal(ds[0].from, 0); assert.ok(Math.abs(ds[0].to - MONTH_HOURS) < 1e-9);
    assert.match(ds[0].text, /^Days 1–30: /);
    assert.ok(Object.keys(ds[0].partners).length <= 10 && ds[0].events.length <= 8);
  }
  assert.equal(sumAll(w, 'matings'), 2 * mates, 'every copulation is remembered by both partners');
  assert.equal(sumAll(w, 'reconciliations'), 2 * w.stats.reconciliations, 'every reconciliation is remembered by both');
  assert.equal(sumAll(w, 'consoledThem'), consoles); assert.equal(sumAll(w, 'consoledMe'), consoles);
  for (const [g, r] of [['threatsGiven', 'threatsReceived'], ['attacksGiven', 'attacksReceived'], ['supportGiven', 'supportReceived'], ['meatGiven', 'meatReceived']] as const)
    assert.equal(sumAll(w, g), sumAll(w, r), `${g} = ${r}`);
  assert.ok(sumAll(w, 'threatsGiven') > 100 && sumAll(w, 'groomGiven') > 100, 'a month is eventful');
  assert.ok(Math.abs(sumAll(w, 'groomGiven') - sumAll(w, 'groomReceived')) < 0.01 * founders.length, 'grooming hours given = received');
});

test('observe() history lines are about perceived individuals only and stay within caps', () => {
  const { w } = monthWorld();
  const names = w.chimps.map(c => c.name);
  let withHistory = 0, withTension = 0;
  for (const c of w.chimps.filter(k => k.alive)) {
    const ctx = observe(w, c);
    for (const p of ctx.social) if (p.tension !== undefined) { assert.ok(p.tension >= 0 && p.tension <= 1); if (p.tension > 0) withTension++; }
    if (!ctx.history) continue;
    withHistory++;
    assert.ok(ctx.history.length >= 1 && ctx.history.length <= 3);
    const present = new Set(ctx.social.map(p => p.name));
    for (const line of ctx.history) {
      assert.ok(line.length <= 110, line);
      assert.match(line, /^(This month|Last month|Last year): /);
      for (const n of names) if (new RegExp(`\\b${n}\\b`).test(line)) assert.ok(present.has(n), `${c.name} recalls ${n}, who is not perceived: ${line}`);
    }
  }
  assert.ok(withHistory > 10, `${withHistory} chimps have history lines`);
  assert.ok(withTension > 5, 'some perceived relationships carry tension');
});

test('relationshipOf combines this month with the remembered monthly digests', () => {
  const { w } = monthWorld();
  const a = w.chimps.find(c => c.alive && Object.keys(months(c)[0]?.partners ?? {}).length > 0)!;
  const bId = Number(Object.keys(months(a)[0].partners)[0]);
  const rel = relationshipOf(w, a, byId(w, bId));
  const fromDigest = months(a)[0].partners[bId];
  for (const k of Object.keys(fromDigest) as (keyof PartnerTally)[]) assert.ok((rel.counts.year[k] ?? 0) >= (fromDigest[k] ?? 0) - 1e-9, k);
  assert.ok(rel.bond >= 0 && rel.bond <= 1 && rel.tension >= 0 && rel.tension <= 1);
});

test('yearly compression bounds memory over 40 ecological years (month-long clock jumps)', () => {
  const w = createWorld(21);
  const focal = w.chimps.filter(c => c.alive && c.age > 15).slice(0, 4);
  const others = w.chimps.filter(c => c.alive);
  for (let m = 0; m < 480; m++) {
    for (const c of focal) {
      for (const o of others) if (o !== c && o.troopId === c.troopId && o.alive) {
        for (let k = 0; k < 1 + ((o.id + m) % 5); k++) recordGrooming(w, c, o);
        if ((o.id + m) % 3 === 0) recordAggression(w, o, c, 'threat');
        if ((o.id + m) % 4 === 0) recordSupport(w, o, c);
      }
      for (let e = 0; e < 12; e++) noteEvent(w, c, e % 3 ? 'rank' : 'injury', `event ${m}-${e}`);
    }
    w.tick += TICKS_PER_MONTH - 1;
    tickWorld(w);
  }
  for (const c of focal.filter(k => k.alive)) {
    const ds = c.digests!;
    assert.equal(years(c).length, 40, `${c.name}: one yearly digest per 12 months`);
    assert.equal(months(c).length, 12, 'monthly detail is kept for the last 12 months only');
    for (let i = 1; i < ds.length; i++) assert.ok(ds[i].to >= ds[i - 1].to, 'digests are ordered by end time');
    for (const y of years(c)) { assert.ok(Object.keys(y.partners).length <= 5 && y.events.length <= 5); assert.match(y.text, /^Year, days /); }
    const last = years(c).at(-1)!, recent = months(c);
    assert.equal(last.to, recent.at(-1)!.to);
    const sum = (ds: MemoryDigest[], k: keyof PartnerTally) => ds.reduce((s, d) => s + (d.totals[k] ?? 0), 0);
    assert.equal(last.totals.threatsReceived, sum(recent, 'threatsReceived'), 'a year sums its months');
    assert.ok(Math.abs(last.totals.groomGiven! - sum(recent, 'groomGiven')) < 0.2);
    assert.ok(JSON.stringify(ds).length < 80_000, `bounded size: ${JSON.stringify(ds).length} bytes`);
  }
});

test('determinism across tick batching holds through a month boundary and tension decay', () => {
  const make = () => {
    const w = createWorld(48);
    for (const c of w.chimps) ix(c).month.start = -(MONTH_HOURS - 24);
    const [a, b] = w.chimps; ix(a).tension[b.id] = 0.6;
    return w;
  };
  const a = make(), b = make(), c = make();
  for (let i = 0; i < 25; i++) stepWorld(a, 60);
  for (let i = 0; i < 6000; i++) stepWorld(b, 0.25);
  for (let i = 0; i < 6000; i++) tickWorld(c);
  assert.ok(a.chimps.filter(k => k.alive && k.birthTime <= 0).every(k => months(k).length === 1), 'the month closed at the first daily step');
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});
