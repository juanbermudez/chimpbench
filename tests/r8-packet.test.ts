// Stage R8 (IMPLEMENTATION_PLAN.md, Track R; docs/staging/r8-prereg.md): the animal's own experience in the packet
// (packet 5) and neutral option wording, behind observeV5 (0 by default). No model is loaded, no network call is made,
// no benchmark is run. Seeds 48 and 7 only.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { BELIEF_FIELDS as STATE_BELIEFS, buildStateOnlyQuestion, removedWordingsIn, tokensOf } from '../scripts/lib/packet-state';
import { withAboutFromReason } from '../scripts/lib/r8-about';
import { sampleR4 } from '../scripts/r4-contexts';
import { hashWithoutOwn, packetsOf, sampleR8, type R8Rec } from '../scripts/r8-contexts';
import { leakedIn, rerender, uniqueIds } from '../scripts/r8-rerender';
import { estimateByBlock } from '../scripts/r8-tokens';
import { wordingReport } from '../scripts/r8-wording-report';
import { nearbyOrder, pickRates, wordingOnly } from '../scripts/r8-wording-probe';
import { buildJevQuestion, buildLocalQuestion, buildOwnQuestion, decisionContextError, neutralized, optionParts, rulesWordings, situationRules, TOKEN_BUDGET_STATE, withoutOwn,
  type LocalPacket, type OwnBlock } from '../server/decide';
import { actLabel, askedWords, BELIEF_FIELDS, bodyDepartures, doingWords, lastWords, latelyWords, neutralOption, OWN_INSTRUCTION } from '../src/kernel/packet-own';
import { bodyWordsV4 } from '../src/kernel/packet-words';
import { worldShapeProblem } from '../src/persist/envelope';
import { candidateMeta, CODE, computeCandidates, V } from '../src/sim/candidates';
import { applyDecision } from '../src/sim/decide';
import { ownPercept } from '../src/sim/own';
import { paramsOf } from '../src/sim/params';
import { buildRequest } from '../src/sim/request';
import { index, isChimpId, isTreeId, ix, OPTIONAL_X } from '../src/sim/state';
import { createWorld, observe, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, DecisionContext, OwnExperience, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// the working base: S39 with pithFibreSwallowed 0.5 (the user's decision of 6 October 2026, item 1)
const BASE = JSON.parse(readFileSync(new URL('../docs/staging/integrator-kit/params/M6-W50.json', import.meta.url), 'utf8')) as Record<string, number>;
const HOUR = 240;
const ticks = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };
/** A copy of the world in the same state with registry overrides added (the copy resolves its own parameters). */
function withParams(w: World, extra: Record<string, number>): World {
  const copy = structuredClone(w), settings = (copy as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...extra };
  return copy;
}
const textOf = (p: unknown) => JSON.stringify(p);
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
/** The compass word of a horizontal step (+x east, −z north), and the turn between two compass words in eighths. */
const compassOf = (dx: number, dz: number) => COMPASS[Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360) / 45) % 8];
const eighths = (a: string, b: string) => { const d = Math.abs(COMPASS.indexOf(a) - COMPASS.indexOf(b)); return Math.min(d, 8 - d); };

// One field world on the working base with observeV5 1, seed 48. Every rules decision of an animal aged 8 or over is
// recorded from 09:30 of the second day to its dusk (scripts/r8-contexts.ts, the stage's own sampler), and the world is
// kept at three moments: 12:30 (day), about 18:45 (dusk) and 02:30 (night), the moments of stage R2's tests.
const DAY_TICK = 30 * HOUR, DUSK_TICK = DAY_TICK + Math.round(6.25 * HOUR);
let built: { recs: R8Rec[]; day: World; dusk: World; night: World; hash: string } | null = null;
function world5() {
  if (built) return built;
  const kept: Record<string, World> = {};
  const r = sampleR8({ seed: 48, base: 'W50', params: BASE, burnIn: 27 / 24, days: (DUSK_TICK - 27 * HOUR) / (24 * HOUR), p: 1,
    onTick: (w, tick) => { if (tick === DAY_TICK) kept.day = structuredClone(w); if (tick === DUSK_TICK) kept.dusk = structuredClone(w); } });
  built = { recs: r.recs, day: kept.day, dusk: kept.dusk, night: ticks(structuredClone(kept.dusk), Math.round(7.75 * HOUR)), hash: r.hash };
  return built;
}
const states = (): [string, World][] => { const b = world5(); return [['day', b.day], ['dusk', b.dusk], ['night', b.night]]; };

// ---------------------------------------------------------------------------------------------------------------------
// The switch: 0 by default, 0 = today
// ---------------------------------------------------------------------------------------------------------------------

test('observeV5 is 0 by default in both profiles, and is not a Track E switch', () => {
  const reg = JSON.parse(readFileSync(new URL('../data/params.json', import.meta.url), 'utf8')) as { params: { id: string; notes: string; value: number }[] };
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(48, { profile })) as unknown as Record<string, number>;
    assert.equal(P.observeV5, 0, profile);
    assert.equal(P.ownKeep, 8, profile);
  }
  for (const id of ['observeV5', 'ownKeep']) assert.match(reg.params.find(p => p.id === id)!.notes, /^Stage R8/);
  assert.ok(OPTIONAL_X.includes('own'), 'the record is optional for the load-time shape check');
});

test('with observeV5 0 the requests and both text packets hash as at dea2643 (compressed seeds 48 and 7; the field working base, with and without the state-only packet\'s switches)', () => {
  // docs/staging/r8-prereg.md §1: printed by one script at the untouched base commit before any code of this stage.
  // [requests of every living animal, GLiNER and Jev text of every valid request, the state-only packet where built]
  const hashes = (w: World, stateOnly: boolean) => {
    const h = createHash('sha256'), t = createHash('sha256'), s = createHash('sha256');
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const r = buildRequest(w, c);
      h.update(JSON.stringify(r));
      if (r.options.length >= 2 && decisionContextError(r.context) === '') {
        t.update(JSON.stringify(buildLocalQuestion(r.context))); t.update(JSON.stringify(buildJevQuestion(r.context)));
        if (stateOnly) s.update(JSON.stringify(buildStateOnlyQuestion(r.context)));
      }
    }
    return [h.digest('hex').slice(0, 16), t.digest('hex').slice(0, 16), ...(stateOnly ? [s.digest('hex').slice(0, 16)] : [])];
  };
  const COMPRESSED: Record<string, string[]> = { '48 noon': ['e2a8ceeddecec9ea', '25c1a437a46f8c26'], '48 dusk': ['7eb562dc80143a22', '73b5649f644be88b'],
    '7 noon': ['96d75aa2580993a0', '66b58144b90fa1ff'], '7 dusk': ['b82e466483971e16', '4d9762f375854092'] };
  for (const seed of [48, 7]) {
    const w = ticks(createWorld(seed), 1440);
    assert.deepEqual(hashes(w, false), COMPRESSED[`${seed} noon`], `compressed, seed ${seed}, noon`);
    assert.deepEqual(hashes(ticks(w, 1720), false), COMPRESSED[`${seed} dusk`], `compressed, seed ${seed}, dusk`);
  }
  const FIELD: [Record<string, number>, string[], string[], string][] = [
    [{}, ['ba7ab9bba4f3ceef', '1704e1f1b912e977'], ['d02807f187e258ff', 'f43accb54b96e50a'], 'the working base'],
    [{ observeV4: 1, menuParity: 1 }, ['16d952c50a156690', '78ccd982f778350f', 'b84ab84166fce8e8'], ['6fc68e69c057f7f9', 'c11c227d5ca8646f', '93425aefa90aaba1'], 'with observeV4 and menuParity'],
  ];
  for (const [extra, day, dusk, name] of FIELD) {
    const w = ticks(createWorld(48, { profile: 'field', params: { ...BASE, ...extra } }), DAY_TICK), so = 'observeV4' in extra;
    assert.deepEqual(hashes(w, so), day, `field, ${name}, 12:30`);
    assert.equal(worldHash(w), '11cc8f4360cf6cd6');
    assert.deepEqual(hashes(ticks(w, DUSK_TICK - DAY_TICK), so), dusk, `field, ${name}, dusk`);
    assert.equal(worldHash(w), '8e5fa7068c1d4ba7');
  }
});

test('the animals\' own record never changes the world: with it removed, a world run with observeV5 1 is the world run without (field working base and compressed, seeds 48 and 7)', () => {
  const b = world5();
  // the sampled world, recorded at every decision point and read by observe() at each: the world of dea2643
  assert.equal(hashWithoutOwn(b.day), '11cc8f4360cf6cd6', 'field, seed 48, 12:30 of day 2');
  assert.equal(hashWithoutOwn(b.dusk), '8e5fa7068c1d4ba7', 'field, seed 48, dusk of day 2');
  assert.notEqual(worldHash(b.day), '11cc8f4360cf6cd6', 'the record is there');
  const off7 = ticks(createWorld(7, { profile: 'field', params: BASE }), 12 * HOUR), on7 = ticks(createWorld(7, { profile: 'field', params: { ...BASE, observeV5: 1 } }), 12 * HOUR);
  assert.equal(hashWithoutOwn(on7), worldHash(off7), 'field, seed 7, 12 h');
  for (const seed of [48, 7]) {
    const off = ticks(createWorld(seed), 2500), on = ticks(createWorld(seed, { params: { observeV5: 1 } }), 2500);
    assert.equal(hashWithoutOwn(on), worldHash(off), `compressed, seed ${seed}`);
    assert.ok(on.chimps.some(c => ix(c).own?.at), 'the compressed world keeps the record too');
  }
  // plain data, and accepted by the load-time shape check
  assert.deepEqual(JSON.parse(JSON.stringify(b.dusk)), b.dusk, 'JSON-lossless');
  assert.equal(worldShapeProblem(JSON.parse(JSON.stringify(b.dusk)) as World), '');
  const P = paramsOf(b.dusk);
  let parts = 0;
  for (const c of b.dusk.chimps) {
    const r = ix(c).own;
    if (!r) continue;
    for (const k of Object.keys(r)) parts += +['ask', 'was', 'at', 'eat', 'trip', 'trips', 'fed', 'g', 'gb'].includes(k);
    assert.ok((r.trips?.length ?? 0) <= 2 * P.ownKeep && (r.fed?.length ?? 0) <= 2 * P.ownKeep, 'the lists are capped by ownKeep');
    assert.ok(Object.keys(r.g ?? {}).length <= P.ownKeep && Object.keys(r.gb ?? {}).length <= P.ownKeep);
  }
  assert.ok(parts > 100, `parts of the record written: ${parts}`);
});

// ---------------------------------------------------------------------------------------------------------------------
// The observation
// ---------------------------------------------------------------------------------------------------------------------

test('observeV5 1: the observeV4 observation plus the animal\'s own fields and the marker; pure and local', t => {
  const seen: Record<string, number> = {};
  const count = (k: string) => { seen[k] = (seen[k] ?? 0) + 1; };
  for (const [label, w] of states()) {
    const v4 = withParams(w, { observeV5: 0, observeV4: 1 });
    const before = JSON.stringify(w), rng = w.rng, idx = index(w);
    const known = (c: Chimp) => new Set([...ix(c).trees, ...c.memory.filter(m => m.kind === 'tree').map(m => m.entityId),
      ...((w as unknown as { sim: { knownTrees?: Record<number, number[]> } }).sim.knownTrees?.[c.troopId] ?? []).filter((_, i) => i % 2 === 0), ...(c.nest ? [c.nest.treeId] : []), c.targetId]);
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const ctx = observe(w, c), x = ix(c), c4 = v4.chimps.find(k => k.id === c.id)!;
      assert.equal(ctx.packet, 5);
      assert.deepEqual(withoutOwn(ctx), observe(v4, c4), `${label} ${c.name}: without its own fields it is the observeV4 observation`);
      assert.deepEqual(observe(w, c), ctx, 'deterministic');
      const bad = decisionContextError(ctx);
      assert.ok(bad === '' || bad === 'option count', `${label} ${c.name}: ${bad}`);
      // what it is doing: the act in progress and the minutes in it
      const d = ctx.own!.doing!;
      assert.equal(d.minutes, Math.round(c.actionTime / 60));
      if (!ix(c).own?.ask) { assert.equal(d.action, c.action); assert.equal(d.ended, undefined); assert.equal(ctx.own!.asked, undefined, 'no decision point is open: nothing is asked'); }
      if (d.who) { count('doing.who'); assert.equal(d.who, idx.byId.get(c.targetId)?.name); }
      // local: a tree is named only if the animal sees it, remembers it, knows it from its community's list, nests in it or is at it
      const trees = known(c), near = new Set([...x.seen, ...c.memory.filter(m => m.kind === 'chimp').map(m => m.entityId), x.caretaker, c.motherId]);
      const live = computeCandidates(w, c, []);
      for (const k of ctx.candidates) {
        const m = candidateMeta.get(live.find(o => o.action === k.action && o.targetId === k.targetId)!)!;
        if (k.about?.place) { count('about.place'); assert.ok(isTreeId(k.targetId) && trees.has(k.targetId), `${label} ${c.name}: ${k.action} names a tree it does not know`); assert.equal(k.about.place, idx.treeById.get(k.targetId)!.species); }
        if (k.about?.with) { count('about.with'); assert.ok(near.has(m.aux) || m.aux === x.joinCaller || (x.cg !== undefined && x.cg[1] === m.aux), `${label} ${c.name}: ${k.action} names a companion it neither sees nor heard`); }
        if (k.about?.form) count(`form.${k.about.form}`);
        if (k.about?.dir) count('about.dir');
      }
      // companions: a direction only for an animal on the move; "leaving" when its distance grows; the times are the record's
      for (const p of ctx.social) {
        const o = idx.byId.get(p.id)!;
        if (p.dir !== undefined) { count('percept.dir'); assert.ok(['travel', 'follow', 'patrol', 'flee', 'transfer'].includes(p.action)); assert.equal(typeof p.away, 'boolean'); } else assert.equal(p.away, undefined);
        // a companion on a trip to a tree: the way to that tree, walking or standing (a standing animal's heading is left over from an earlier act)
        const goal = o.action === 'travel' && isTreeId(o.targetId) ? idx.treeById.get(o.targetId) : undefined;
        if (goal && (goal.position[0] !== o.position[0] || goal.position[2] !== o.position[2])) {
          count('percept.dir to its tree');
          assert.equal(p.dir, compassOf(goal.position[0] - o.position[0], goal.position[2] - o.position[2]), `${label} ${c.name}: ${p.name} is going to its tree`);
          assert.equal(p.away, (goal.position[0] - o.position[0]) * (o.position[0] - c.position[0]) + (goal.position[2] - o.position[2]) * (o.position[2] - c.position[2]) > 0);
        }
        if (p.toMe) { count('percept.toMe'); assert.equal(o.targetId, c.id); }
        if (p.groomedH !== undefined) { count('percept.groomedH'); assert.equal(p.groomedH, Math.round((w.time - x.own!.g![p.id]) * 10) / 10); }
        if (p.groomedByH !== undefined) { count('percept.groomedByH'); assert.equal(p.groomedByH, Math.round((w.time - x.own!.gb![p.id]) * 10) / 10); }
        if (p.greetedH !== undefined) { count('percept.greetedH'); assert.equal(p.greetedH, Math.round((w.time - x.greet[p.id]) * 10) / 10); }
      }
      const l = ctx.own!.lately;
      if (l?.eating !== undefined) { count('lately.eating'); assert.ok(x.own!.eat![4] >= 2); }
      if (l?.trips) { count('lately.trips'); assert.ok(l.trips.length <= paramsOf(w).ownKeep && l.trips.every(y => y >= 0 && y <= 1)); }
      if (l?.crowns) { count('lately.crowns'); assert.equal(l.crowns, x.own!.fed!.length / 2); }
      const g = ctx.own!.aggression;
      if (g) { count('aggression'); const who = Object.keys(x.incident).map(Number).find(id => idx.byId.get(id)?.name === g.name && Math.abs(w.time - x.incident[id][0] - g.hours) < 0.06); assert.ok(who !== undefined, 'the last incident of its own memory'); }
    }
    assert.equal(w.rng, rng, 'no rng draw');
    assert.equal(JSON.stringify(w), before, 'no world mutation');
  }
  t.diagnostic(`own fields seen over 3 moments: ${JSON.stringify(seen)}`);
  for (const k of ['doing.who', 'about.place', 'about.dir', 'form.tree', 'form.stay', 'percept.groomedH', 'percept.groomedByH', 'percept.greetedH', 'lately.trips', 'lately.crowns', 'aggression'])
    assert.ok((seen[k] ?? 0) > 5, `${k}: ${seen[k] ?? 0}`);
});

test('at decision points: what it is doing, how its act ended, and why it is asked, which is never a timer', t => {
  const { recs } = world5(), kinds: Record<string, number> = {}, byWhy: Record<string, number> = {};
  let aside = 0;
  const kind = (a: OwnExperience['asked']) => !a ? 'none' : a.event ? 'event' : a.ended ? 'ended' : a.felt ? 'felt' : 'light';
  assert.ok(recs.length > 800, `only ${recs.length} decision points`);
  for (const r of recs) {
    const own = r.context.own!, d = own.doing!, a = own.asked;
    assert.equal(decisionContextError(r.context), '');
    assert.equal(d.action, r.act.action, 'the act in progress');
    assert.equal(d.minutes, Math.round(r.act.seconds / 60));
    // an end is told exactly when the act came to its own end, or when it can no longer go on (off the animal's legal list):
    // the loop sets such an act aside for a waiting animal, and the sampler's packet must say what the loop's does
    assert.equal(d.ended !== undefined, r.act.finished || !r.act.onMenu, 'an end is told exactly when the act came to its own end or can no longer go on');
    if (!r.act.finished && !r.act.onMenu) { aside++; assert.equal(d.ended, 'not-possible'); assert.match(r.packets.own.state.doing as string, /; it is no longer possible$/); }
    else assert.notEqual(d.ended, 'not-possible');
    kinds[kind(a)] = (kinds[kind(a)] ?? 0) + 1; byWhy[`${r.why}:${kind(a)}`] = (byWhy[`${r.why}:${kind(a)}`] ?? 0) + 1;
    // one reason, and it follows what opened the decision point
    if (r.opened === 1) assert.ok(a?.event && !a.ended && !a.felt, 'an interrupt: the perception is the reason');
    else if (r.opened === 2) assert.ok(a?.ended === d.ended && !a.event && !a.felt, 'the act\'s own end is the reason');
    else assert.ok(!a || (!a.event && !a.ended && (a.felt?.length || a.light)), 'a scheduled end: nothing, or a change it feels or sees');
    // the loop's own reason: a timer or a clock period never gives a perceived event or a felt change
    // (fear is a drive of the packet's feeling line that the gate's need buckets do not watch: it can move at any decision point)
    const onlyFear = !!a?.felt?.every(f => f.drive === 'fear') && !a.light;
    if (r.why === 'max-age') assert.ok(!a || a.ended || onlyFear, `max-age gave ${kind(a)}: ${JSON.stringify(a)}`);
    if (r.why === 'period') assert.ok(!a || a.ended || a.light || onlyFear, `period gave ${kind(a)}: ${JSON.stringify(a)}`);
    if (r.why === 'interrupt') assert.equal(kind(a), 'event');
    if (r.why === 'need-bucket') assert.ok(kind(a) === 'felt' || kind(a) === 'ended', `need-bucket gave ${kind(a)}`);
    // the text says it
    const p = r.packets.own.state as Record<string, unknown>;
    assert.equal(p.doing, doingWords(d));
    assert.equal(p['asked because'], a ? askedWords(a, r.context.body?.sleepPressure !== undefined, true) : undefined);
    if (a?.ended) assert.equal(p['asked because'], 'my act ended', 'the doing line says how; it is not said twice');
    assert.match(p.doing as string, d.ended ? /^was / : d.minutes < 1 ? /, just begun$/ : /, \d+ min$/);
    assert.equal(p.urgent, undefined);
  }
  t.diagnostic(`asked: ${JSON.stringify(kinds)}; by the loop's reason: ${JSON.stringify(byWhy)}; acts that could not go on (not ended, off the menu): ${aside} of ${recs.length}`);
  assert.ok(aside > 20, `acts that could not go on: ${aside}`);
  for (const k of ['none', 'event', 'ended', 'felt']) assert.ok((kinds[k] ?? 0) > 10, `${k}: ${kinds[k] ?? 0}`);
  assert.ok((byWhy['max-age:none'] ?? 0) > 5 && (byWhy['kept:none'] ?? 0) > 50, 'timers are seen, and say nothing');
  // labels: fresh draws, kept acts and arrivals are told apart, and the scores without the hash jitter are saved
  const labels = new Set(recs.map(r => r.label));
  assert.deepEqual([...labels].sort(), ['arrived', 'fresh', 'kept']);
  for (const r of recs) { assert.equal(r.draw, r.label === 'fresh'); for (const o of r.options) assert.ok(o.raw !== undefined && o.jitter !== undefined && Math.abs(o.jitter) <= 0.12 + 1e-9, 'the value before the jitter, on the working base'); }
});

test('the reason for asking, case by case, on one animal (the record set by hand)', () => {
  const w = structuredClone(world5().day), c = w.chimps.find(k => k.alive && k.age >= 15 && k.action !== 'nest')!, x = ix(c), time = w.time;
  const step = (v: number) => v >= 0.88 ? 4 : v >= 0.7 ? 3 : v >= 0.55 ? 2 : v >= 0.4 ? 1 : 0; // the packet's drive words
  const drives = [c.hunger, c.thirst, 1 - c.energy, 1 - c.social, c.stress].map(step), phase = 2; // (12:30: full daylight)
  const asked = (own: NonNullable<typeof x.own>, f?: () => void) => { x.own = { ...x.own, ...own }; x.intr = ''; f?.(); return ownPercept(w, c).asked; };
  delete x.own!.ask; delete x.own!.was;
  assert.equal(ownPercept(w, c).asked, undefined, 'no decision point open');
  // a scheduled end and nothing felt or seen has changed: a loop timer, so no line
  assert.equal(asked({ ask: [time, 0], at: [...drives, phase] }), undefined);
  // a feeling moved to another word since it last chose: grown, eased
  c.hunger = 0.6;
  assert.deepEqual(asked({ ask: [time, 0], at: [0, ...drives.slice(1), phase] }), { felt: [{ drive: 'hunger', to: 2, up: true }] });
  assert.deepEqual(asked({ ask: [time, 0], at: [4, ...drives.slice(1), phase] }), { felt: [{ drive: 'hunger', to: 2, up: false }] });
  assert.equal(asked({ ask: [time, 0], at: [2, ...drives.slice(1), phase] }), undefined, 'the same word: no line');
  // the light passed into another phase
  assert.deepEqual(asked({ ask: [time, 0], at: [2, ...drives.slice(1), 1] }), { light: 'day' });
  // an interrupt: the loop's own words for the perception, and only that
  assert.deepEqual(asked({ ask: [time, 1], at: [0, ...drives.slice(1), 1] }, () => { x.lastIntr = 'Obi is moving off'; }), { event: 'Obi is moving off' });
  // the act's own end
  assert.deepEqual(asked({ ask: [time, 2], was: [2, c.targetId, 600, 2, 0, -1] }), { ended: 'crop-finished' });
  assert.equal(ownPercept(w, c).doing!.ended, 'crop-finished');
  assert.equal(ownPercept(w, c).doing!.action, 'forage');
  assert.equal(ownPercept(w, c).doing!.minutes, 10);
});

test('a model-driven animal set to wait still knows what it was doing; an applied choice closes the decision point', () => {
  const w = structuredClone(world5().day);
  w.modelPolicy = { mode: 'lockstep', asyncGraceMinutes: 2 };
  const focal = w.chimps.filter(c => c.alive && c.age >= 12).slice(0, 14);
  for (const c of focal) c.controller = 'model';
  let ended = 0, aside = 0, applied = 0;
  for (let i = 0; i < 3 * HOUR && (ended < 3 || applied < 3); i++) {
    tickWorld(w);
    for (const c of focal) {
      if (!c.alive || c.awaitingDecisionSince === null) continue;
      const r = ix(c).own!, req = buildRequest(w, c), d = req.context.own!.doing!;
      assert.ok(r.ask, 'the decision point is noted');
      if (r.was) {
        assert.equal(c.action, 'rest', 'set to rest while it waits');
        assert.ok(d.ended, 'what it was doing, and how it ended');
        if (r.was[3] === 11) { aside++; assert.equal(d.ended, 'not-possible'); } else ended++;
        const ask = [...r.ask];
        tickWorld(w); // polled again while it waits: the same decision point
        if (c.alive && c.awaitingDecisionSince !== null && !ix(c).intr && ix(c).own!.ask![1] !== 1) assert.deepEqual(ix(c).own!.ask, ask);
      }
      if (!c.alive || c.awaitingDecisionSince === null) continue;
      const again = buildRequest(w, c);
      if (again.options.length >= 2 && applyDecision(w, c.id, again.options[0], 'decide', again.context.version)) {
        applied++;
        assert.equal(ix(c).own!.ask, undefined, 'an act has started: nothing is being asked');
        assert.equal(ix(c).own!.was, undefined);
        assert.equal(observe(w, c).own!.asked, undefined);
      }
    }
  }
  assert.ok(ended >= 3 && applied >= 3, `ended acts seen while waiting: ${ended} (set aside ${aside}); choices applied: ${applied}`);
});

test('in the loop a waiting animal\'s packet is the one the sampler saves: an ended feeding bout keeps its eating line, its crown is not yet counted as left, and the leave is entered when a choice is applied', () => {
  // A rules-driven animal is observed at its decision point before it leaves its act (the sampler's tap); a model-driven
  // animal is set to rest first and observed while it waits. The record must read the same at both, or a kernel is
  // trained on one packet and sent another.
  const w = structuredClone(world5().day);
  w.modelPolicy = { mode: 'lockstep', asyncGraceMinutes: 2 };
  const focal = w.chimps.filter(c => c.alive && c.age >= 12).slice(0, 20);
  for (const c of focal) c.controller = 'model';
  const steps = new Map<number, number>(); // complete 5 minute steps of each animal's feeding bout before the tick
  let bouts = 0, applied = 0;
  for (let i = 0; i < 6 * HOUR && bouts < 12; i++) {
    for (const c of focal) steps.set(c.id, ix(c).own?.eat?.[4] ?? 0);
    tickWorld(w);
    for (const c of focal) {
      if (!c.alive || c.awaitingDecisionSince === null) continue;
      const r = ix(c).own!, req = buildRequest(w, c), own = req.context.own!, was = r.was;
      const fedBout = was !== undefined && was[0] === CODE.forage && isTreeId(was[1]) && was[3] !== 11 && steps.get(c.id)! >= 2;
      if (fedBout) {
        bouts++;
        assert.equal(c.action, 'rest', 'set to rest while it waits');
        assert.equal(own.doing!.action, 'forage');
        assert.ok(own.doing!.ended, 'how the bout ended');
        assert.ok(own.lately?.eating !== undefined, 'eating now against the start of the bout is still told');
        assert.match(buildOwnQuestion(req.context).state.lately as string, /^was eating /);
        const fed = r.fed ?? [];
        assert.ok(!fed.some((id, k) => k % 2 === 0 && id === was![1] && fed[k + 1] >= r.ask![0]), 'the crown is not yet among those it has left');
        assert.equal(own.lately!.crowns ?? 0, fed.length / 2);
      }
      if (req.options.length >= 2 && applyDecision(w, c.id, req.options[Math.max(0, req.rulesIndex)], 'decide', req.context.version) && fedBout) {
        applied++;
        const after = ix(c).own!;
        assert.equal(after.was, undefined);
        assert.equal(after.eat, undefined, 'the feeding bout is over');
        assert.equal(after.fed![after.fed!.length - 2], was![1], 'the crown it fed in is the last it has left');
      }
    }
  }
  assert.ok(bouts >= 12 && applied >= 8, `ended feeding bouts seen while waiting: ${bouts}; choices applied after them: ${applied}`);
});

test('a companion\'s direction agrees with the trip it leads: "leaving northwest" beside "Go with it to the …, northwest"', t => {
  // A leader that stands and checks who comes along has not turned yet: its heading is left over from an earlier act.
  // The line must give the way it is going, which the option to join its trip states from the focal animal's own place.
  const { recs } = world5();
  let pairs = 0, same = 0;
  for (const r of recs) {
    for (const k of r.context.candidates) {
      const a = k.about;
      if (a?.form !== 'joined' || !a.with || !a.dir || (a.distM ?? 0) < 150) continue;
      const p = r.context.social.find(q => q.name === a.with && q.action === 'travel' && q.distance <= 40);
      if (!p) continue;
      pairs++; same += +(p.dir === a.dir);
      assert.ok(p.dir !== undefined, `${p.name} leads a trip: its direction is told`);
      assert.ok(eighths(p.dir!, a.dir) <= 1, `${r.id}: ${p.name} is ${p.away ? 'leaving' : 'travelling'} ${p.dir}, and the trip it leads goes ${a.distM} m ${a.dir}`);
    }
  }
  t.diagnostic(`${pairs} leaders within 40 m of a trip of 150 m or more: the same compass word ${same} times, a neighbouring one ${pairs - same}`);
  assert.ok(pairs > 100, `${pairs} pairs`);
});

test('the request validation accepts the own fields and rejects malformed ones', () => {
  const r = world5().recs.find(k => k.context.own?.asked?.event && k.context.own.lately?.trips && k.context.candidates.some(c => c.about?.place) && k.context.social.some(p => p.groomedH !== undefined))!;
  const context = r.context;
  assert.equal(decisionContextError(context), '');
  const bad = (f: (x: DecisionContext) => void) => { const x = structuredClone(context); f(x); return decisionContextError(x); };
  assert.equal(bad(x => { delete x.own; }), 'packet version', 'packet 5 marks a context that carries the animal\'s own experience');
  assert.equal(bad(x => { x.packet = 4; }), 'own experience');
  assert.equal(bad(x => { (x as unknown as Record<string, unknown>).packet = 6; }), 'packet version');
  assert.equal(bad(x => { x.own!.doing!.minutes = -1; }), 'own experience');
  assert.equal(bad(x => { (x.own!.doing as Record<string, unknown>).ended = 'bored'; }), 'own experience');
  assert.equal(bad(x => { x.own!.asked = {}; }), 'own experience');
  assert.equal(bad(x => { x.own!.asked = { felt: [{ drive: 'hunger', to: 7, up: true }] }; }), 'own experience');
  assert.equal(bad(x => { x.own!.lately!.trips = [1.4]; }), 'own experience');
  assert.equal(bad(x => { (x.own as Record<string, unknown>).score = 1; }), 'own experience');
  assert.equal(bad(x => { x.social.find(p => p.groomedH !== undefined)!.groomedH = -2; }), 'social percepts');
  assert.equal(bad(x => { x.social[0].away = true; delete x.social[0].dir; }), 'social percepts');
  assert.equal(bad(x => { (x.candidates.find(c => c.about?.place)!.about as Record<string, unknown>).form = 'best'; }), 'option shape');
  assert.equal(bad(x => { (x.candidates[0] as unknown as Record<string, unknown>).about = { rate: 1 }; }), 'option shape');
});

// ---------------------------------------------------------------------------------------------------------------------
// The wording
// ---------------------------------------------------------------------------------------------------------------------

test('packet 5 wording: the registered lines, word for word', () => {
  assert.equal(doingWords({ action: 'forage', minutes: 25, about: { form: 'tree', place: 'Uvariopsis congensis', distM: 2 } }), 'feeding in the Uvariopsis congensis, 25 min');
  assert.equal(doingWords({ action: 'travel', minutes: 12, about: { form: 'tree', place: 'Ficus natalensis', distM: 4, dir: 'north' }, ended: 'arrived' }), 'was walking to the Ficus natalensis for 12 min; I have arrived');
  assert.equal(doingWords({ action: 'groom', minutes: 0, who: 'Chiriku' }), 'grooming Chiriku, just begun');
  assert.equal(doingWords({ action: 'nest', minutes: 310, about: { form: 'stay' } }), 'in my nest, 310 min');
  assert.equal(askedWords({ event: 'Chiriku is moving off' }, true), 'Chiriku is moving off');
  assert.equal(askedWords({ event: 'Nobody came along' }, true), 'nobody came along');
  assert.equal(askedWords({ ended: 'crop-finished' }, true), 'the crop here is finished');
  assert.equal(askedWords({ ended: 'crop-finished' }, true, true), 'my act ended');
  assert.equal(latelyWords({ eating: 0.9 }, true), 'was eating as fast as when I began');
  assert.equal(askedWords({ felt: [{ drive: 'hunger', to: 2, up: true }, { drive: 'fatigue', to: 0, up: false }], light: 'dusk' }, true), 'my hunger has grown (now moderate); my sleepiness has passed; it is getting dark');
  assert.equal(askedWords({ felt: [{ drive: 'fatigue', to: 1, up: false }] }, false), 'my fatigue has eased (now mild)');
  assert.equal(latelyWords({ eating: 0.5, trips: [0.9, 0, 0, 0.6], crowns: 3 }),
    'eating at about half the rate I began at; my last trip gave less than I expected; 2 of my last 4 trips ended in a feed; fed in 3 crowns since leaving my nest');
  assert.equal(latelyWords({ eating: 1.3 }), 'eating faster than when I began');
  assert.equal(latelyWords({ eating: 0.9, trips: [0] }), 'eating as fast as when I began; my last trip gave nothing');
  assert.equal(latelyWords({ eating: 0.7, trips: [0.2], crowns: 1 }), 'eating a little slower than when I began; my last trip gave much less than I expected; fed in 1 crown since leaving my nest');
  assert.equal(latelyWords({ eating: 0.1, trips: [1] }), 'eating much slower than when I began; my last trip gave what I expected');
  // neutral labels: the act and its target; the beliefs in the state-only packet's own words; never a rate or a company value
  assert.equal(actLabel('rest', undefined, undefined), 'Rest here');
  assert.equal(actLabel('travel', { form: 'tree', place: 'Ficus natalensis', distM: 99, dir: 'northwest' }, undefined), 'Go to the Ficus natalensis, 100 m northwest');
  assert.equal(actLabel('travel', { form: 'joined', place: 'Ficus natalensis', with: 'Nkeru', distM: 99, dir: 'northwest' }, undefined), 'Go with Nkeru to the Ficus natalensis, 100 m northwest');
  assert.equal(actLabel('travel', { form: 'caller', with: 'Mbelo', distM: 300, dir: 'north' }, undefined), 'Go toward Mbelo\'s calls, 300 m north');
  assert.equal(actLabel('nest', { form: 'stay' }, undefined), 'Stay in my nest');
  assert.equal(actLabel('charge', undefined, 'Kato'), 'Charge at Kato');
  const ctx = { social: [{ id: 7, name: 'Chiriku' }], bodies: undefined } as unknown as DecisionContext;
  assert.equal(neutralOption(ctx, { action: 'groom', targetId: 7 }), 'Groom Chiriku');
  assert.equal(neutralOption(ctx, { action: 'forage', targetId: 100002, about: { form: 'tree', place: 'Uvariopsis congensis', distM: 2 }, value: { kcalH: 410, share: 0.5, cropKcal: 1700, seenH: 0, feeders: 2, distM: 2 } }),
    'Feed in the Uvariopsis congensis, 2 m (1,700 kcal of fruit there; 2 feeding there)');
  assert.equal(neutralOption(ctx, { action: 'travel', targetId: 100003, about: { form: 'tree', place: 'Ficus natalensis', distM: 99, dir: 'northwest' }, value: { kcalH: 300, share: 0.4, company: 0.5, cropKcal: 2200, seenH: 3, spreadKcal: 600, feeders: 1, distM: 99, swingLow: -0.1, swingHigh: 0.2 } }),
    'Go to the Ficus natalensis, 100 m northwest (2,200 kcal of fruit there when I saw it 3 h ago, may have changed; 1 other going there)');
  assert.equal(neutralOption(ctx, { action: 'submit', targetId: 7, value: { odds: 0.2 } }), 'Crouch and submit to Chiriku (I would likely lose)');
  assert.deepEqual([...BELIEF_FIELDS].sort(), [...STATE_BELIEFS].sort(), 'the belief fields are the state-only packet\'s');
  assert.equal(OWN_INSTRUCTION.split(/[.!?]/).filter(s => s.trim()).length, 1, 'the instruction is one sentence');
  // the short body line: only what departs from normal; the stomach and a shortfall always
  const body = { reserves: 0.01, deficit: 0.3, needKcal: 950, awakeH: 6, gutFill: 0.7, hindFill: 0.2, waterDeficitPct: 0.1, heat: 0, sleepPressure: 0.2, sleepiness: 0.05, clock: 0.8, clockRising: false, stress: 0.1 };
  assert.equal(bodyDepartures(body, { level: 1, trend: 0 }), 'slight energy shortfall: about 950 kcal still to find, some hours of waking left; stomach mostly full');
  assert.equal(bodyDepartures({ ...body, heat: 0.5, clock: -0.8, waterDeficitPct: 1.2, stress: 0.8 }, { level: 1, trend: 0 }),
    'slight energy shortfall: about 950 kcal still to find, some hours of waking left; stomach mostly full; short of water; hot; body clock at its night low; stress load high');
  for (const part of bodyDepartures(body, { level: 1, trend: 0 }).split('; ')) assert.ok(bodyWordsV4(body).includes(part), 'the words are the v4 body line\'s');
});

/** Every sampled context, rendered every way the stage registers. */
function renderings(ctx: DecisionContext): [string, LocalPacket][] {
  const p = packetsOf(ctx), blocks: OwnBlock[] = ['doing', 'asked', 'acts', 'lately', 'last'];
  return [['own', p.own], ['own short', p.ownShort], ['neutral', p.neutral], ...blocks.map((b): [string, LocalPacket] => [`own without ${b}`, buildOwnQuestion(ctx, { without: [b] })])];
}

test('none of the rules\' wording can appear in packet 5: the text does not depend on a reason, a score or a valuation, and carries no phrase the builder\'s tables write', t => {
  const { recs } = world5(), W = rulesWordings();
  // the banned phrases, from the code that writes them: each purpose, and each of its parts of two words or more
  const purposes = [...new Set(W.purposes.flatMap(p => [p, ...p.split(/[,:] /).filter(s => s.trim().split(' ').length >= 2)]))];
  assert.ok(purposes.includes('food, eases hunger') && purposes.includes('eases hunger') && purposes.includes('appeases a dominant') && purposes.includes('asserts dominance') && purposes.length > 40, `${purposes.length} purpose phrases`);
  assert.ok(W.urgent.includes('needs water') && W.urgent.includes('needed now'));
  const sentences = W.instructions.flatMap(s => s.split(/(?<=\.) /)).filter(s => s !== '');
  assert.ok(sentences.some(s => /dominance \(subordinates/.test(s)) && sentences.some(s => /field primatologist/.test(s)));
  let checked = 0, bare = 0, differ = 0, urgentToday = 0, rulesToday = 0;
  const bareSeen = new Set<string>();
  const BARE = new Set(['Groom NAME', 'Charge at NAME', 'Pant-grunt to NAME']); // reasons that, once the builder has trimmed rank and distance, are themselves the bare act and target
  for (const r of recs) {
    const ctx = r.context;
    // (1) the same context with every reason replaced, every score and valuation changed: the same text
    const marked: DecisionContext = { ...ctx, body: { ...ctx.body, feedDrive: 1.99, fullKcalH: 9990 }, candidates: ctx.candidates.map((c, i): Candidate => ({ ...c, score: 2.5 - i * 0.1, reason: `REASON ${i}`,
      ...(c.value ? { value: { ...c.value, ...(c.value.kcalH !== undefined ? { kcalH: 7770, share: 0.77 } : {}), ...(c.value.company !== undefined ? { company: 0.77 } : {}), ...(c.value.swingLow !== undefined ? { swingLow: -0.7, swingHigh: 0.7 } : {}) } } : {}) })) };
    assert.equal(decisionContextError(marked), '');
    for (const v of ['full', 'short'] as const) assert.deepEqual(buildOwnQuestion(marked, { variant: v }), buildOwnQuestion(ctx, { variant: v }), 'the text reads no reason, score or valuation');
    assert.deepEqual(buildLocalQuestion(ctx), r.packets.own, 'the one builder writes packet 5 for a packet 5 context');
    const jev = buildJevQuestion(ctx);
    assert.deepEqual(buildJevQuestion(marked), jev);
    urgentToday += +(r.packets.state.state.urgent !== undefined); rulesToday += situationRules(ctx).length;
    for (const [name, packet] of [...renderings(ctx), ['jev', jev as unknown as LocalPacket] as [string, LocalPacket]]) {
      const text = textOf(packet);
      // (2) no phrase the builder's tables write for the rules
      for (const p of purposes) assert.ok(!text.includes(p), `${name}: the purpose "${p}" in ${text.slice(0, 300)}`);
      for (const s of sentences) assert.ok(!text.includes(s), `${name}: the instruction sentence "${s}"`);
      for (const u of W.urgent) assert.ok(!text.includes(u), `${name}: "${u}"`);
      for (const rule of situationRules(ctx)) assert.ok(!text.includes(rule), `${name}: a situational rule`);
      assert.deepEqual(removedWordingsIn(packet), [], `${name}: the state-only packet's removed wordings`);
      assert.equal(packet.state.urgent, undefined, `${name}: no urgent line`);
      if (name !== 'jev') assert.equal(packet.questions.action.instructions, OWN_INSTRUCTION);
      assert.doesNotMatch(JSON.stringify(packet.questions), /dominan|subordinat|primatologist|REASON/);
    }
    // (3) no label contains its option's reason sentence, unless the reason is itself the bare act and target
    ctx.candidates.forEach((c, i) => {
      const phrase = optionParts(ctx, c).phrase, label = r.packets.own.questions.action.criteria[`c${i}`];
      checked++;
      if (label.includes(phrase)) { bare++; const name = ctx.social.find(p => p.id === c.targetId)?.name; bareSeen.add(name ? phrase.replace(name, 'NAME') : phrase); } else differ++;
      assert.ok(!label.includes(c.reason));
    });
  }
  t.diagnostic(`${recs.length} contexts, ${checked} options: ${differ} labels differ from the reason, ${bare} reasons are the bare act and target (${[...bareSeen].join(' | ')}); today's packets of the same contexts carry an urgent line in ${urgentToday} and ${rulesToday} situational rules`);
  assert.deepEqual([...bareSeen].filter(s => !BARE.has(s)), [], 'a label may equal a reason only where the reason is the bare act and target');
  assert.ok(checked > 4000 && differ / checked > 0.85);
  assert.ok(urgentToday > 20, 'the sample exercises what is removed');
});

test('packet 5 lists the animals nearby nearest first: the order of the observation\'s list, which follows the rules\' scores, never reaches the text', t => {
  // observe() lists the perceived animals with the targets of the rules' best-valued options first, so in today's
  // packets the first animal on the nearby line is the partner the rules would take. A ranking the rules computed.
  const { recs } = world5();
  let picks = 0, firstListed = 0, firstInText = 0, chance = 0, lists = 0;
  for (const r of recs) {
    const ctx = r.context, lines = (r.packets.own.state.nearby ?? []) as string[];
    if (ctx.social.length < 2) continue;
    lists++;
    // nearest first
    const dist = lines.map(l => ctx.social.find(p => l.startsWith(`${p.name}: `))!.distance);
    for (let i = 1; i < dist.length; i++) assert.ok(dist[i - 1] <= dist[i], `${r.id}: nearest first (${dist.join(', ')})`);
    // the text is the same whatever the order of the observation's list
    const turned: DecisionContext = { ...ctx, social: [...ctx.social].reverse() };
    assert.equal(decisionContextError(turned), '');
    for (const v of ['full', 'short'] as const) assert.deepEqual(buildOwnQuestion(turned, { variant: v }), buildOwnQuestion(ctx, { variant: v }), 'the order of the observation\'s list does not reach the text');
    assert.deepEqual(buildJevQuestion(turned), buildJevQuestion(ctx));
    for (const b of ['doing', 'asked', 'acts', 'lately', 'last'] as OwnBlock[]) assert.deepEqual(buildOwnQuestion(turned, { without: [b] }), buildOwnQuestion(ctx, { without: [b] }));
    // how much the two orders tell of the rules' pick, on the fresh draws whose pick names a listed animal
    const target = r.draw && r.rgIndex >= 0 ? r.options[r.rgIndex].targetId : -1, at = ctx.social.findIndex(p => p.id === target);
    if (at < 0) continue;
    picks++; chance += 1 / ctx.social.length;
    firstListed += +(at === 0);
    firstInText += +lines[0].startsWith(`${ctx.social[at].name}: `);
    assert.equal(((r.packets.state.state.nearby ?? []) as string[])[0].startsWith(`${ctx.social[0].name}: `), true, 'today\'s packet writes the observation\'s order');
  }
  t.diagnostic(`${lists} contexts with two or more animals nearby; fresh draws whose pick names one of them: ${picks}; that animal is first in the observation's order ${firstListed} times, first on packet 5's nearby line ${firstInText} times, by chance ${chance.toFixed(1)}`);
  assert.ok(lists > 1000 && picks > 100, `${lists} lists, ${picks} picks`);
  assert.ok(firstListed / picks > 0.9, 'the observation\'s order tells the rules\' partner: what packet 5 must not carry');
  assert.ok(firstInText < firstListed, 'the nearest animal is the partner less often than the first listed');
});

test('the same act has the same words whatever the rules\' motive; the wording test\'s packet changes only the leaked wording', t => {
  const { recs } = world5(), byAct = new Map<string, Set<string>>();
  let options = 0;
  for (const r of recs) {
    const ctx = r.context, a = r.packets.state, b = r.packets.neutral;
    // (b) of the wording test: every state line of today's packet but `urgent`; the options and the instruction change
    const { urgent: _u, ...rest } = a.state;
    assert.deepEqual(b.state, rest);
    assert.equal(b.questions.action.instructions, OWN_INSTRUCTION);
    assert.deepEqual(Object.keys(b.questions.action.criteria), Object.keys(a.questions.action.criteria));
    assert.deepEqual(b.questions.action.criteria, r.packets.own.questions.action.criteria, 'the neutral options are packet 5\'s');
    assert.deepEqual(b, neutralized(ctx, buildStateOnlyQuestion(withoutOwn(ctx))));
    r.options.forEach((o, i) => {
      // the label with names, species and numbers masked: one wording per act and form
      const about = ctx.candidates[i].about, label = b.questions.action.criteria[o.alias].replace(/ \(.*\)$/, '');
      const name = ctx.social.find(p => p.id === o.targetId)?.name ?? ctx.bodies?.find(q => q.id === o.targetId)?.name;
      let masked = label.replace(/, \d+ m(?: \w+)?$/, '');
      if (name) masked = masked.replace(name, 'NAME');
      if (about?.place) masked = masked.replace(about.place, 'SPECIES');
      if (about?.with) masked = masked.replace(about.with, 'NAME');
      const k = `${o.action}/${about?.form ?? ''}`;
      if (!byAct.has(k)) byAct.set(k, new Set());
      byAct.get(k)!.add(masked); options++;
    });
  }
  const many = [...byAct].filter(([k, s]) => s.size > (k.startsWith('display/') || k.startsWith('flee/') ? 2 : 1));
  assert.deepEqual(many.map(([k, s]) => `${k}: ${[...s].join(' | ')}`), [], 'one wording per act and form (a display or a flight with and without a target are two)');
  t.diagnostic(`${options} options, ${byAct.size} acts and forms: ${[...byAct].map(([k, s]) => `${k} "${[...s][0]}"`).join('; ')}`);
  // the rules wrote several sentences for one act: the rest option alone
  const rests = new Set(recs.flatMap(r => r.context.candidates.filter(c => c.action === 'rest').map(c => c.reason)));
  assert.ok(rests.size >= 2, `rest reasons: ${[...rests].join(' | ')}`);
});

test('a context saved before observeV5 gives the same neutral options: the reason parser agrees with observe()\'s own account (scripts/lib/r8-about.ts)', t => {
  // the same decision points sampled by stage R4's sampler (observeV4, the saved shape) and by this stage's
  const o = { seed: 48, base: 'W50', params: BASE, burnIn: 1.2, days: 0.35, p: 0.5 };
  const old = sampleR4({ ...o, keepContext: true }).recs, now = sampleR8({ ...o, tag: 'r4' }).recs;
  let same = 0, joined = 0, calls = 0, n = 0;
  assert.ok(old.length > 300, `${old.length} records`);
  assert.deepEqual(now.map(r => r.id), old.map(r => r.id), 'the same decision points, in order (an animal may decide twice in a tick)');
  for (const [at, r] of old.entries()) {
    const twin = now[at];
    assert.deepEqual(r.packet, twin.packets.state, 'today\'s state-only packet, from the packet 5 context without its own fields');
    assert.deepEqual(r.context, withoutOwn(twin.context));
    const b = neutralized(withAboutFromReason(r.context!, r.options), r.packet);
    assert.deepEqual(b.state, twin.packets.neutral.state);
    r.options.forEach((opt, i) => {
      const mine = b.questions.action.criteria[opt.alias], theirs = twin.packets.neutral.questions.action.criteria[opt.alias], about = twin.context.candidates[i].about;
      n++;
      if (mine === theirs) same++;
      // a saved context does not name the leader of a joined trip, nor the distance of stranger calls heard
      else if (about?.form === 'joined') { joined++; assert.equal(mine, theirs.replace(`Go with ${about.with} to`, 'Go with a companion to')); }
      else if (about?.form === 'calls') { calls++; assert.equal(mine.replace(/, \w+$/, ''), theirs.replace(/, \d+ m \w+$/, '')); }
      else assert.equal(mine, theirs, `${opt.action} ${opt.variant}: "${r.context!.candidates[i].reason}"`);
    });
  }
  t.diagnostic(`${old.length} decision points, ${n} options: ${same} labels equal, ${joined} joined trips without the leader's name, ${calls} stranger calls without the distance`);
  assert.ok(same / n > 0.9);
});

// ---------------------------------------------------------------------------------------------------------------------
// Lines and length
// ---------------------------------------------------------------------------------------------------------------------

test('each new line on the built world: companions\' acts, foraging returns, social timing; the short variant keeps them', t => {
  const { recs } = world5(), n: Record<string, number> = {};
  const count = (k: string, by = 1) => { n[k] = (n[k] ?? 0) + by; };
  for (const r of recs) {
    const ctx = r.context, full = r.packets.own.state as Record<string, unknown>, short = r.packets.ownShort.state as Record<string, unknown>, today = r.packets.state.state as Record<string, unknown>;
    // companions: every perceived animal's routine act is told (today's packet names only notable ones)
    // (packet 5 lists them nearest first, today's packet in the observation's order: a line is found by its animal's name)
    const nearby = (full.nearby ?? []) as string[], before = (today.nearby ?? []) as string[];
    const lineOf = (lines: string[], name: string) => { const of = lines.filter(l => l.startsWith(`${name}: `)); assert.equal(of.length, 1, `one line for ${name}`); return of[0]; };
    assert.equal(nearby.length, ctx.social.length);
    ctx.social.forEach(p => {
      const word = p.action === 'forage' ? 'feeding' : p.action === 'rest' ? 'resting' : p.action === 'travel' ? (p.dir ? (p.away ? `leaving ${p.dir}` : `travelling ${p.dir}`) : 'travelling') : null;
      if (!word) return;
      count(`nearby ${word.split(' ')[0]}`);
      assert.ok(lineOf(nearby, p.name).endsWith(`, ${word}`), `${lineOf(nearby, p.name)} (${word})`);
      assert.ok(!lineOf(before, p.name).includes(word.split(' ')[0]), 'today\'s packet leaves the routine act out');
    });
    for (const p of ctx.social) if (p.toMe) { count('nearby toMe'); assert.match(nearby.find(l => l.startsWith(`${p.name}: `))!, / me$/); }
    assert.deepEqual(short.nearby, full.nearby);
    // lately and last
    if (ctx.own!.lately) { count('lately'); assert.equal(full.lately, latelyWords(ctx.own!.lately, ctx.own!.doing!.ended !== undefined)); assert.equal(short.lately, full.lately); } else assert.equal(full.lately, undefined);
    // (the timing lines follow the order of the nearby line: nearest first)
    const near = { ...ctx, social: nearby.map(l => ctx.social.find(p => l.startsWith(`${p.name}: `))!) }, last = lastWords(near, () => true);
    if (last.length) {
      count('last'); assert.deepEqual(full.last, last);
      assert.deepEqual([...last].sort(), [...lastWords(ctx, () => true)].sort(), 'the same lines as the observation gives, in the nearby line\'s order');
      const named = new Set(ctx.candidates.map(c => c.targetId));
      assert.deepEqual(short.last ?? [], lastWords(near, p => named.has(p.id)));
      // what `last` says is not said again as a memory
      for (const m of (full.memories ?? []) as string[]) assert.doesNotMatch(m, /^(?:Groomed|Was groomed by|Pant-grunted to) /);
    }
    if (ctx.own!.asked?.event) for (const m of (full.memories ?? []) as string[]) assert.ok(!m.replace(/\b(?:is|are|was|were)\b/g, '').replace(/\s+/g, ' ').includes(ctx.own!.asked.event.replace(/\b(?:is|are)\b/g, '').replace(/\s+/g, ' ')), `the interrupt is told once: ${m}`);
    for (const k of ['doing', 'asked because', 'lately']) assert.equal(short[k], full[k], `the short variant keeps ${k}`);
    assert.ok(((short.memories ?? []) as string[]).length <= 1 && short.history === undefined && ((full.memories ?? []) as string[]).length <= 3 && ((full.history ?? []) as string[]).length <= 2);
    if (ctx.body) { count('body'); for (const part of ((short.body ?? '') as string).split('; ').filter(Boolean)) assert.ok((full.body as string).includes(part)); assert.match((short.body ?? 'stomach') as string, /stomach/); }
    // any one line can be left out, and only that line goes
    for (const [b, key] of [['doing', 'doing'], ['asked', 'asked because'], ['lately', 'lately'], ['last', 'last']] as [OwnBlock, string][]) {
      const without = buildOwnQuestion(ctx, { without: [b] }).state as Record<string, unknown>;
      assert.equal(without[key], undefined);
      // (without `doing`, the reason for asking tells the end itself)
      for (const k of Object.keys(full)) if (k !== key && k !== 'memories' && !(b === 'doing' && k === 'asked because')) assert.deepEqual(without[k], full[k], `without ${b}: ${k}`);
    }
    assert.deepEqual([...((buildOwnQuestion(ctx, { without: ['acts'] }).state as Record<string, unknown>).nearby ?? []) as string[]].sort(), [...before].sort(), 'without the acts, the nearby lines are today\'s (nearest first)');
  }
  t.diagnostic(JSON.stringify(n));
  for (const k of ['nearby feeding', 'nearby resting', 'nearby leaving', 'nearby travelling', 'nearby toMe', 'lately', 'last', 'body']) assert.ok((n[k] ?? 0) > 20, `${k}: ${n[k] ?? 0}`);
});

test('length: both variants are shorter than today\'s state-only packet by the project\'s estimate, and nothing is near the hard limit of 1,280', t => {
  const { recs } = world5();
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
  const of = (f: (r: R8Rec) => number) => recs.map(f);
  const state = of(r => r.tokens.state), neutral = of(r => r.tokens.neutral), own = of(r => r.tokens.own), short = of(r => r.tokens.ownShort);
  for (const r of recs) {
    for (const p of [r.packets.own, r.packets.ownShort, r.packets.neutral]) assert.ok(tokensOf(p) <= TOKEN_BUDGET_STATE, 'inside the estimate\'s budget');
    assert.ok(r.tokens.own + 37 < 1280 && r.tokens.ownShort <= r.tokens.own, 'the largest under-estimate measured (37) still leaves the hard limit far');
    assert.ok(r.tokens.neutral < r.tokens.state);
  }
  t.diagnostic(`estimated tokens over ${recs.length} decision points, median (largest): state-only ${med(state)} (${Math.max(...state)}), neutral options ${med(neutral)} (${Math.max(...neutral)}), `
    + `packet 5 full ${med(own)} (${Math.max(...own)}), short ${med(short)} (${Math.max(...short)})`);
  assert.ok(med(short) < med(own) && med(own) < med(state), 'short < full < today\'s');
  assert.ok(Math.max(...own) < 1000);
  // R8_DUMP_ROWS=<file>: this built world's packets as {id, packets} rows, for a real count by the tokenizer alone
  // (training/decide_ft/r8_tokens.py); the stage's token table of a second day comes from it. Off unless asked for.
  if (process.env.R8_DUMP_ROWS) writeFileSync(process.env.R8_DUMP_ROWS, uniqueIds(recs).map(r => JSON.stringify({ id: r.id, packets: r.packets })).join('\n') + '\n');
});

// ---------------------------------------------------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------------------------------------------------

test('the sampler: deterministic, changes nothing in the world, and saves the label\'s kind, the scores and both reasons', () => {
  const o = { seed: 48, base: 'W50', params: BASE, burnIn: 0.05, days: 0.45, p: 0.3 };
  const a = sampleR8({ ...o, check: true }), b = sampleR8(o);
  assert.deepEqual(a.recs, b.recs);
  assert.equal(a.hash, b.hash);
  assert.ok(a.recs.length > 80, `${a.recs.length} records`);
  for (const r of a.recs) {
    assert.equal(r.context.packet, 5);
    assert.ok(['fresh', 'kept', 'arrived'].includes(r.label));
    assert.equal(r.pick, r.rgIndex >= 0 ? `c${r.rgIndex}` : null);
    assert.deepEqual(Object.keys(r.packets.own.questions.action.criteria), r.options.map(k => k.alias));
    assert.ok([0, 1, 2].includes(r.opened));
    assert.deepEqual(r.asked, r.context.own?.asked ?? null);
    assert.deepEqual(r.packets, packetsOf(r.context));
  }
  assert.throws(() => sampleR8({ ...o, seed: 5 }), /48 and 7/);
});

test('on the small map (no Track E state) packet 5 still builds: the act, the reason for asking and neutral options', () => {
  const w = ticks(createWorld(7, { params: { observeV5: 1 } }), 1500);
  let n = 0, doing = 0;
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const r = buildRequest(w, c);
    if (r.options.length < 2) continue;
    assert.equal(decisionContextError(r.context), '', c.name);
    assert.equal(r.context.packet, 5);
    for (const v of ['full', 'short'] as const) {
      const p = buildOwnQuestion(r.context, { variant: v });
      assert.deepEqual(leakedIn(p), [], 'none of the rules\' wording');
      assert.equal(p.state.body, undefined, 'no body books on the small map: no body line');
      assert.equal(typeof p.state.doing, 'string'); doing++;
      assert.ok(tokensOf(p) < 700);
    }
    n++;
  }
  assert.ok(n > 30 && doing === 2 * n);
});

test('the wording test\'s files: a saved record renders twice, and the readout compares the two score sets on the fresh draws', () => {
  const recs = uniqueIds(sampleR4({ seed: 48, base: 'W50', params: BASE, burnIn: 0.3, days: 0.2, p: 0.5, keepContext: true }).recs);
  assert.ok(recs.length > 100);
  const scores: { id: string; packet: string; probs: number[] }[] = [];
  for (const r of recs) {
    const p = rerender(r);
    assert.ok(p.rebuilt, 'today\'s packet is rebuilt exactly from the saved context');
    assert.deepEqual(leakedIn(p.neutral), []);
    assert.ok(leakedIn(p.state).length > 0, 'today\'s packet carries the wording under test');
    const { urgent: _u, ...rest } = p.state.state;
    assert.deepEqual(p.neutral.state, rest);
    // a made-up scorer: right on today's packet, right on the neutral one only for an even animal
    const k = r.options.length, right = (ok: boolean) => r.options.map((_, i) => (i === (ok ? Math.max(0, r.rgIndex) : (r.rgIndex + 1) % k) ? 0.6 : 0.4 / (k - 1)));
    scores.push({ id: r.id, packet: 'state', probs: right(true) }, { id: r.id, packet: 'neutral', probs: right(r.chimpId % 2 === 0) });
  }
  const rep = wordingReport(recs, scores), used = recs.filter(r => r.draw && r.rgIndex >= 0);
  assert.equal(rep.draws, used.length);
  assert.equal(rep.table[0].state, 1);
  assert.equal(rep.table[0].neutral, used.filter(r => r.chimpId % 2 === 0).length / used.length);
  assert.ok(rep.difference!.low <= rep.difference!.mean && rep.difference!.mean <= rep.difference!.high && rep.difference!.high < 0);
  assert.equal(rep.table.slice(1).reduce((s, t) => s + t.draws, 0), used.length, 'every draw has one kind');
  // the estimate by block adds up to the estimate
  const p = rerender(recs[0]).neutral, parts = estimateByBlock(p);
  assert.equal(Math.round(Object.values(parts).reduce((s, v) => s + v, 0)), tokensOf(p));
});

test('the wording probe: pick rates by wording, and a predictor that reads the wording alone', () => {
  const rec = (texts: string[], pick: number, draw = true) => ({ draw, rgIndex: pick, options: texts.map((_, i) => ({ action: i === 0 ? 'rest' : 'forage', variant: 'NONE', family: i === 0 ? 'rest' : 'feed' })),
    packet: { questions: { action: { criteria: Object.fromEntries(texts.map((s, i) => [`c${i}`, s])) } } } });
  const train = [rec(['Sit and digest after feeding (a pause)', 'Feed on ripe figs in the Ficus 3 m away (crop 40%) (food)'], 0), rec(['Sit and digest after feeding (a pause)', 'Forage on leaves and pith nearby (food)'], 0),
    rec(['Sit and rest nearby (a pause)', 'Feed on ripe fruit in the Celtis 12 m away (crop 80%) (food)'], 1), rec(['Sit and rest nearby (a pause)', 'Forage on leaves and pith nearby (food)'], 1),
    rec(['Sit and rest nearby (a pause)', 'Forage on leaves and pith nearby (food)'], 0, false)];
  const rates = pickRates(train as never, 'rest');
  assert.deepEqual(rates.get('Sit and digest after feeding'), { n: 2, picked: 2 });
  assert.deepEqual(rates.get('Sit and rest nearby'), { n: 2, picked: 0 }, 'draws only');
  const w = wordingOnly(train as never, train as never);
  assert.equal(w.rules.hit, 4, 'the rules\' wording tells the pick apart');
  assert.equal(w.n, 4);
  assert.ok(w.neutral.hit < 4, 'the act alone does not');
  // the order of the nearby list: is the animal a social pick names the first one listed?
  const ctx = (targets: number[], social: [number, number][]) => ({ candidates: targets.map(targetId => ({ targetId })), social: social.map(([id, distance]) => ({ id, distance })) });
  const order = nearbyOrder([{ draw: true, rgIndex: 1, context: ctx([-1, 7], [[7, 12], [9, 3]]) }, { draw: true, rgIndex: 1, context: ctx([-1, 9], [[7, 12], [9, 3], [4, 20]]) },
    { draw: true, rgIndex: 0, context: ctx([-1, 7], [[7, 12], [9, 3]]) }, { draw: true, rgIndex: 1, context: ctx([-1, 7], [[7, 12]]) }, { draw: false, rgIndex: 1, context: ctx([-1, 7], [[7, 12], [9, 3]]) }, { draw: true, rgIndex: 1 }]);
  assert.deepEqual(order, { draws: 4, picksNamingListed: 3, listsOfTwoOrMore: 2, first: 1, chance: 1 / 2 + 1 / 3, nearest: 1 });
});
