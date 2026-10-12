import assert from 'node:assert/strict';
import test from 'node:test';
import { CLIPS, Pw, type PoseCtx } from '../src/render/creatures/poses';
import { B, LIMB, PI, createFK, createMorph, createPose, solveFK } from '../src/render/creatures/rig';
import { Posture, postureOf } from '../src/render/creatures/intention';
import { GRIP_HELD, HEAD_HAND, Lie, SCRATCH_BELLY, SCRATCH_CUT_MOVING_S, SCRATCH_CUT_S, SCRATCH_HZ, SCRATCH_POINT, createIdleCtx, handHolds, idleFace, idleOverlay, lieOf, mayScratch, nodAt, nodLids, scratchReach, scratchRelease, scratchWrist, seatIdles, yawnAt, type IdleCtx } from '../src/render/creatures/idle';
import { PERCH, perchLies } from '../src/render/creatures/perch';
import {
  BLINK_SLOW, IDLE, IDLE_GAP, IDLE_SETTLE, IDLE_SHARE, SCRATCH, blinkAt, createBlink, createIdle, idleBit, idleCancel, idleGap, idleLean, idleRate, idleSpend, idleStep,
} from '../src/render/creatures/secondary';

// Stage W8 (docs/staging/w8b-state-on-body.md): idle life. The schedule of one-shot events (src/render/creatures/
// secondary.ts) and the layer that draws them over a stationary clip (src/render/creatures/idle.ts). Stylizations:
// the tests pin that the schedule is deterministic, different for every animal and follows its drives, and what the
// layer does to a pose. They do not say how often a chimpanzee scratches.

const ALL = idleBit(IDLE.scratch) | idleBit(IDLE.yawn) | idleBit(IDLE.shift) | idleBit(IDLE.glance) | idleBit(IDLE.nod);
/** Runs one animal's schedule for `seconds` at `fps`; returns [start time, kind, site, side, length] per event. */
function run(id: number, seconds: number, o: { fps?: number; rate?: number; allow?: number | ((t: number) => number); scratchK?: number; yawnK?: number; nodK?: number } = {}) {
  const s = createIdle(id), dt = 1 / (o.fps ?? 30), events: [number, number, number, number, number][] = [];
  for (let t = 0; t < seconds; t += dt) {
    const allow = typeof o.allow === 'function' ? o.allow(t) : o.allow ?? ALL;
    if (idleStep(s, id, dt, o.rate ?? 1, allow, o.scratchK ?? 1, o.yawnK ?? 1, o.nodK ?? 0)) events.push([+t.toFixed(3), s.kind, s.site, s.side, +s.dur.toFixed(3)]);
  }
  return events;
}
const count = (ev: [number, number, number, number, number][], kind: number) => ev.filter(e => e[1] === kind).length;

test('the schedule is deterministic: the same animal and the same steps give the same events', () => {
  for (const id of [1, 7, 42]) assert.deepEqual(run(id, 240), run(id, 240));
  // What an event is (kind, place, side, length) depends on the animal and the event's number, not on the frame rate.
  const a = run(9, 300, { fps: 30 }), b = run(9, 300, { fps: 60 });
  const n = Math.min(a.length, b.length);
  assert.ok(n >= 10);
  for (let i = 0; i < n; i++) { assert.deepEqual(a[i].slice(1), b[i].slice(1)); assert.ok(Math.abs(a[i][0] - b[i][0]) < 0.5 + i * 0.1, 'and it starts at about the same time'); }
});

test('no two neighbours are in step: every animal has its own schedule', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], seq = ids.map(id => run(id, 180));
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = seq[i], b = seq[j];
    // The same kind starting within a quarter second of each other is chance (about one start in eighty for two
    // independent schedules): never more than twice in the ten or so events each has in three minutes.
    let together = 0;
    for (const x of a) for (const y of b) if (x[1] === y[1] && Math.abs(x[0] - y[0]) < 0.25) together++;
    assert.ok(together <= 2 && together <= 0.25 * Math.min(a.length, b.length), `animals ${ids[i]} and ${ids[j]} start the same event together ${together} times of ${a.length} and ${b.length}`);
    assert.notDeepEqual(a.map(e => e[1]), b.map(e => e[1]), 'and their sequences of kinds differ');
  }
  // Over all 66 pairs such chance meetings stay a small share of the starts.
  { let meet = 0, starts = 0; for (let i = 0; i < ids.length; i++) { starts += seq[i].length; for (let j = i + 1; j < ids.length; j++) for (const x of seq[i]) for (const y of seq[j]) if (x[1] === y[1] && Math.abs(x[0] - y[0]) < 0.25) meet++; }
    assert.ok(meet < 0.15 * starts, `${meet} meetings among ${starts} starts`); }
  // The first event of twelve neighbours is spread over many seconds, not one moment.
  const first = seq.map(s => s[0][0]);
  assert.ok(Math.max(...first) - Math.min(...first) > 8);
  assert.ok(new Set(first.map(t => Math.round(t))).size >= 8);
});

test('gaps, kinds and lengths are what the constants say', () => {
  const ev = Array.from({ length: 60 }, (_, i) => run(i + 1, 600)).flat();
  const share = (k: number) => count(ev, k) / ev.length;
  for (const k of [IDLE.scratch, IDLE.yawn, IDLE.shift, IDLE.glance]) assert.ok(Math.abs(share(k) - IDLE_SHARE[k]) < 0.04, `kind ${k}: ${share(k)} against ${IDLE_SHARE[k]}`);
  assert.equal(count(ev, IDLE.nod), 0, 'nobody nods unless asked');
  for (const e of ev) assert.ok(e[4] >= 1.2 && e[4] <= 3.6 && e[2] >= 0 && e[2] <= 2 && (e[3] === 0 || e[3] === 1));
  for (let id = 1; id <= 20; id++) for (let n = 0; n < 20; n++) { const g = idleGap(id, n); assert.ok(g >= IDLE_GAP[0] && g <= IDLE_GAP[1]); }
  // One event every 13 to 18 seconds per animal at Real time (the gap and the event itself).
  const perAnimal = ev.length / 60 / 600;
  assert.ok(perAnimal > 1 / 18 && perAnimal < 1 / 13, `${(1 / perAnimal).toFixed(1)} s per event`);
});

test('events come faster at a faster playback rate, and keep their own length', () => {
  assert.equal(idleRate(1), 1); assert.equal(idleRate(4), 1, 'Real time and Watch 4x: as they are');
  assert.equal(idleRate(60), 3, '1 min/s: three times as often');
  assert.equal(idleRate(600), 3); assert.equal(idleRate(0), 1); assert.ok(idleRate(16) > 1.9 && idleRate(16) < 2.1);
  let prev = 0; for (const r of [0, 1, 4, 10, 30, 60, 120, 3600]) { assert.ok(idleRate(r) >= prev); prev = idleRate(r); }
  const slow = run(5, 240, { rate: idleRate(1) }), fast = run(5, 240, { rate: idleRate(60) });
  assert.ok(fast.length > 1.9 * slow.length, `${fast.length} against ${slow.length} events`);
  const mean = (ev: typeof slow) => ev.reduce((s, e) => s + e[4], 0) / ev.length;
  assert.ok(Math.abs(mean(fast) - mean(slow)) < 0.5, 'an event lasts as long in real seconds at either rate');
});

test('the drives: more scratching when aroused or after aggression, more yawning when sleepy, nods only when asked', () => {
  const ids = Array.from({ length: 40 }, (_, i) => i + 1);
  const tally = (o: Parameters<typeof run>[2]) => { const ev = ids.map(id => run(id, 300, o)).flat(); return { n: ev.length, scratch: count(ev, IDLE.scratch), yawn: count(ev, IDLE.yawn), nod: count(ev, IDLE.nod) }; };
  const base = tally({}), itchy = tally({ scratchK: 3.5 }), sleepy = tally({ yawnK: 7, nodK: 1 });
  assert.ok(itchy.scratch > 2 * base.scratch, `${itchy.scratch} against ${base.scratch} scratches`);
  assert.ok(itchy.n > base.n, 'and more events in all, not fewer of the others');
  assert.ok(sleepy.yawn > 4 * base.yawn && sleepy.nod > 0 && base.nod === 0);
  // Monotonic in the drive.
  let prev = 0; for (const k of [0, 0.5, 1, 2, 3.5, 6]) { const s = tally({ scratchK: k }).scratch; assert.ok(s >= prev, `scratches fall from ${prev} to ${s} at drive ${k}`); prev = s; }
  for (const k of [1, 2, 3.5]) assert.ok(idleGap(3, 4, k) <= idleGap(3, 4, 1) + 1e-12, 'a higher drive never lengthens a gap');
});

test('only what the pose permits: a forbidden kind gives way, nothing starts while the animal is not idle, nor the moment it is idle again', () => {
  const faceOnly = idleBit(IDLE.yawn) | idleBit(IDLE.glance);
  for (const id of [1, 2, 3, 4, 5, 6]) for (const e of run(id, 300, { allow: faceOnly })) assert.ok(e[1] === IDLE.yawn || e[1] === IDLE.glance);
  // A scratch or a shift that is not permitted becomes a glance, never a yawn: yawns keep their own share.
  { const ev = Array.from({ length: 40 }, (_, i) => run(i + 1, 300, { allow: faceOnly })).flat(); assert.ok(Math.abs(count(ev, IDLE.yawn) / ev.length - IDLE_SHARE[IDLE.yawn]) < 0.04, `yawns ${count(ev, IDLE.yawn)} of ${ev.length}`); }
  // A clip that permits nothing but a yawn (being groomed, sitting out rain) yawns at its own share of turns and skips the rest.
  { const all = Array.from({ length: 40 }, (_, i) => run(i + 1, 300)).flat().length, ev = Array.from({ length: 40 }, (_, i) => run(i + 1, 300, { allow: idleBit(IDLE.yawn) })).flat();
    assert.ok(ev.every(e => e[1] === IDLE.yawn) && ev.length > 0 && ev.length < 0.15 * all, `${ev.length} yawns against ${all} events of a free animal`); }
  assert.deepEqual(run(3, 120, { allow: 0 }), [], 'walking, calling, asleep: nothing');
  // Not idle for a minute, then idle: the first event waits at least IDLE_SETTLE.
  for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) { const ev = run(id, 120, { allow: t => (t < 60 ? 0 : ALL) }); assert.ok(ev.length > 0 && ev[0][0] >= 60 + IDLE_SETTLE - 0.05, `animal ${id}: first event at ${ev[0]?.[0]}`); }
  // An event under way ends when the pose stops permitting it (the animal walks off, a call arrives).
  const s = createIdle(4); let t = 0;
  while (!idleStep(s, 4, 1 / 30, 1, ALL) && t < 100) t += 1 / 30;
  assert.notEqual(s.kind, IDLE.none);
  idleStep(s, 4, 1 / 30, 1, 0);
  assert.equal(s.kind, IDLE.none); assert.ok(s.next >= s.clock + 1.9);
  idleCancel(s); assert.equal(s.kind, IDLE.none, 'cancelling twice is harmless');
});

test('a weight shift moves to one of five positions, never the one it is in, and eases there', () => {
  const s = createIdle(11); const seen = new Set<number>(); let last = 0, shifts = 0;
  for (let t = 0; t < 2000 && shifts < 12; t += 1 / 30) {
    if (idleStep(s, 11, 1 / 30, 1, idleBit(IDLE.shift)) && s.kind === IDLE.shift) {
      assert.notEqual(s.lean, last, 'it moves'); assert.equal(s.leanFrom, last); assert.equal(idleLean(s), last, 'from where it was');
      seen.add(s.lean); shifts++; last = s.lean;
    }
    const l = idleLean(s); assert.ok(l >= -1 && l <= 1);
    if (s.kind === IDLE.none) assert.equal(l, s.lean, 'and holds it afterwards');
  }
  assert.equal(shifts, 12);
  for (const v of seen) assert.ok([-1, -0.5, 0, 0.5, 1].includes(v));
  assert.ok(seen.size >= 3);
});

test('blinks: unchanged by default, slower for a sleepy animal, never popping from open to shut', () => {
  const times = (id: number, dur?: number) => { const b = createBlink(id), out: number[] = []; let prev = 0, jump = 0; for (let t = 0; t < 120; t += 1 / 120) { const v = dur === undefined ? blinkAt(b, id, t) : blinkAt(b, id, t, dur); if (v > 0 && prev === 0) out.push(+t.toFixed(2)); jump = Math.max(jump, Math.abs(v - prev)); prev = v; } return { out, jump }; };
  for (const id of [3, 8, 21]) {
    assert.deepEqual(times(id, 0.13).out, times(id).out, 'the default length is the old schedule');
    const slow = times(id, BLINK_SLOW);
    assert.ok(slow.jump < 0.12, `a slow blink closes and opens smoothly (largest step ${slow.jump})`);
    assert.ok(slow.out.length >= times(id).out.length * 0.9 && slow.out.length <= times(id).out.length);
  }
  // A slow blink lasts BLINK_SLOW.
  const b = createBlink(5); let closed = 0, n = 0;
  for (let t = 0; t < 600; t += 1 / 240) { if (blinkAt(b, 5, t, BLINK_SLOW) > 0) closed++; n++; }
  const b2 = createBlink(5); let closed2 = 0;
  for (let t = 0; t < 600; t += 1 / 240) if (blinkAt(b2, 5, t) > 0) closed2++;
  assert.ok(closed / closed2 > 2.5 && closed / closed2 < 3.6, `eyes shut ${(closed / closed2).toFixed(2)} times as long`);
});

// --- The layer over a pose --------------------------------------------------------------------------------------------
const ctx = (o: Partial<PoseCtx> = {}): PoseCtx => ({
  t: 1.3, time: 7.1, phase: 0.3, speedU: 0, freq: 0, seed: 0.2, stage: 'adult', male: true, age: 20, injury: 0, mood: 'calm', energy: 1, vocal: null,
  hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: false, wet: 0, stride: 0, lp: 0.6, lapse: 0, settle: 0, pb: new Float32Array(15), hasBones: false, pairT: 0, side: 1, ...o,
});
const pose = (clip: string, o: Partial<PoseCtx> = {}) => { const w = new Pw().bind(createPose()).reset(); CLIPS[clip](w, ctx(o)); return w; };
const idle = (o: Partial<IdleCtx> = {}): IdleCtx => ({ ...createIdleCtx(), ...o });

test('nothing to draw, nothing changed; breathing moves the chest and shoulders and comes back', () => {
  for (const clip of ['sitIdle', 'stand', 'rest', 'perch', 'forage']) {
    const base = pose(clip), w = pose(clip);
    idleOverlay(w, postureOf(w.v), idle());
    assert.deepEqual([...w.v], [...base.v], clip);
    const inn = pose(clip), out = pose(clip);
    idleOverlay(inn, postureOf(inn.v), idle({ breath: 1 })); idleOverlay(out, postureOf(out.v), idle({ breath: -1 }));
    assert.ok(inn.v[B.chest * 3] < base.v[B.chest * 3] && out.v[B.chest * 3] > base.v[B.chest * 3], `${clip}: the ribcage lifts breathing in and sinks breathing out`);
    assert.ok(inn.v[B.clavL * 3 + 2] > base.v[B.clavL * 3 + 2] && inn.v[B.clavR * 3 + 2] < base.v[B.clavR * 3 + 2], 'both shoulders rise');
    // Twice as deep is twice as far; no limb target is touched.
    const deep = pose(clip); idleOverlay(deep, postureOf(deep.v), idle({ breath: 1, breathAmp: 2 }));
    assert.ok(Math.abs((deep.v[B.chest * 3] - base.v[B.chest * 3]) - 2 * (inn.v[B.chest * 3] - base.v[B.chest * 3])) < 1e-6);
    for (let i = PI.ik; i < PI.ik + 20; i++) assert.equal(inn.v[i], base.v[i]);
    assert.ok(Math.abs(inn.v[B.chest * 3] - base.v[B.chest * 3]) < 0.05, 'a breath is small');
  }
});

test('a yawn opens the jaw wide, tips the head back and closes the eyes at its peak; it starts and ends at nothing', () => {
  const base = pose('sitIdle');
  const at = (t: number) => { const w = pose('sitIdle'); idleOverlay(w, postureOf(w.v), idle({ kind: IDLE.yawn, t, dur: 3 })); return w; };
  assert.deepEqual([...at(0).v], [...base.v]); assert.deepEqual([...at(3).v], [...base.v]);
  const peak = at(1.5);
  assert.ok(peak.v[PI.mouth] > 0.9 && peak.v[PI.eyes] > 0.8 && peak.v[B.head * 3] < base.v[B.head * 3] - 0.15);
  let prev = 0; for (let t = 0; t <= 0.9; t += 0.05) { const e = yawnAt(t, 3); assert.ok(e >= prev - 1e-12 && e <= 1); prev = e; }
  // It never closes a mouth a call or a clip holds open.
  const chew = pose('forage', { t: 2.4 }), y = pose('forage', { t: 2.4 });
  idleOverlay(y, postureOf(y.v), idle({ kind: IDLE.yawn, t: 0.1, dur: 3 }));
  assert.ok(y.v[PI.mouth] >= chew.v[PI.mouth] - 1e-9);
});

test('a nod lets the head sink with the eyes closing, then brings it back', () => {
  const base = pose('sitIdle'), w = pose('sitIdle');
  idleOverlay(w, postureOf(w.v), idle({ kind: IDLE.nod, t: 2.5, dur: 3.6 }));
  assert.ok(w.v[B.head * 3] > base.v[B.head * 3] + 0.25 && w.v[PI.eyes] > 0.9);
  assert.equal(nodAt(0), 0); assert.ok(nodAt(2.6) > 0.99); assert.ok(nodAt(3.1) < 0.01);
  // The lids sink at its start and open at its end; they never jump (review: they stood at 0.45 from the first frame
  // to the last, a step of 0.45 at both).
  assert.equal(nodLids(0, 3.6), 0); assert.ok(nodLids(3.6, 3.6) < 1e-9); assert.ok(nodLids(2.6, 3.6) > 0.99);
  assert.ok(Math.abs(nodLids(1, 3.6) - (0.45 + 0.55 * nodAt(1))) < 1e-9, 'in between: half shut, closing with the head');
  let prevLid = 0, step = 0;
  for (let t = 0; t <= 3.6 + 1e-9; t += 1 / 60) { const l = nodLids(t, 3.6); assert.ok(l >= 0 && l <= 1); step = Math.max(step, Math.abs(l - prevLid)); prevLid = l; }
  assert.ok(step < 0.07, `the lids move ${step.toFixed(3)} in a sixtieth of a second at most`);
  const first = pose('sitIdle'), last = pose('sitIdle');
  idleOverlay(first, postureOf(first.v), idle({ kind: IDLE.nod, t: 0, dur: 3.6 })); idleOverlay(last, postureOf(last.v), idle({ kind: IDLE.nod, t: 3.6, dur: 3.6 }));
  assert.deepEqual([...first.v], [...base.v], 'it starts at nothing'); assert.deepEqual([...last.v], [...base.v], 'and ends at nothing');
});

test('an event cut short: a yawn or a nod in mid-course has something to blend out of, one that ended by itself has not', () => {
  // (Review: a yawn cut by a decision beat or a heard call dropped the jaw, the lids and 0.3 rad of head in one frame.
  // The layer starts a blend when idleFace is above 0.05 at the cut: creatures.ts stepState.)
  const base = pose('sitIdle');
  for (const [kind, dur] of [[IDLE.yawn, 3], [IDLE.nod, 3.6]] as const) {
    assert.equal(idleFace(kind, 0, dur), 0, 'nothing at its start');
    assert.ok(idleFace(kind, dur, dur) < 1e-9, 'and nothing left when it ends by itself');
    let peak = 0;
    for (let t = 0; t <= dur; t += 0.05) {
      const f = idleFace(kind, t, dur); assert.ok(f >= 0 && f <= 1); peak = Math.max(peak, f);
      // Whenever the pose differs from the clip's by more than a hair, idleFace says so (no cut goes unblended).
      const w = pose('sitIdle'); idleOverlay(w, postureOf(w.v), idle({ kind, t, dur }));
      let far = 0; for (let i = 3; i < PI.root; i++) far = Math.max(far, Math.abs(w.v[i] - base.v[i]));
      far = Math.max(far, Math.abs(w.v[PI.mouth] - base.v[PI.mouth]), Math.abs(w.v[PI.eyes] - base.v[PI.eyes]));
      if (far > 0.06) assert.ok(f > 0.05, `kind ${kind} at ${t.toFixed(2)} s: the pose is ${far.toFixed(2)} from the clip and idleFace is ${f.toFixed(3)}`);
    }
    assert.ok(peak > 0.99);
  }
  for (const kind of [IDLE.none, IDLE.scratch, IDLE.shift, IDLE.glance]) assert.equal(idleFace(kind, 1, 3), 0, 'the other kinds are eased where they are drawn');
});

test('a weight shift moves a seated or standing trunk sideways and leaves a lying one alone', () => {
  for (const [clip, posture] of [['sitIdle', Posture.seated], ['stand', Posture.quad]] as const) {
    const base = pose(clip), l = pose(clip), r = pose(clip);
    assert.equal(postureOf(base.v), posture);
    idleOverlay(l, posture, idle({ lean: 1 })); idleOverlay(r, posture, idle({ lean: -1 }));
    assert.ok(l.v[PI.root] > base.v[PI.root] + 0.015 && r.v[PI.root] < base.v[PI.root] - 0.015, clip);
    assert.ok(Math.abs(l.v[PI.root] - base.v[PI.root]) < 0.05, 'by a few centimetres');
    assert.ok(Math.abs((l.v[PI.root] - base.v[PI.root]) + (r.v[PI.root] - base.v[PI.root])) < 1e-6, 'the same to either side');
  }
  const lying = pose('sleep'), w = pose('sleep');
  assert.equal(postureOf(lying.v), Posture.lying);
  idleOverlay(w, Posture.lying, idle({ lean: 1 }));
  assert.deepEqual([...w.v], [...lying.v]);
});

test('a scratch: the reach comes in and goes out, the hand leaves the ground and rakes, the wrist goes to the animal\'s own body', () => {
  assert.equal(scratchReach(0, 3), 0); assert.ok(scratchReach(1.5, 3) > 0.999); assert.ok(scratchReach(3, 3) < 1e-9);
  for (let t = 0; t <= 3; t += 0.05) { const k = scratchReach(t, 3); assert.ok(k >= 0 && k <= 1); }
  for (const side of [0, 1] as const) {
    const base = pose('stand'), w = pose('stand'), limb = side ? LIMB.armR : LIMB.armL;
    assert.equal(base.v[PI.contact + limb], 1, 'a standing hand is planted');
    idleOverlay(w, postureOf(w.v), idle({ kind: IDLE.scratch, t: 1.5, dur: 3, site: SCRATCH.flank, side }));
    assert.equal(w.v[PI.contact + limb], 0, 'the scratching hand lets go of the ground');
    assert.equal(w.v[PI.contact + (side ? LIMB.armL : LIMB.armR)], 1, 'the other stays planted');
    for (let i = PI.ik; i < PI.ik + 20; i++) assert.equal(w.v[i], base.v[i], 'no limb target is written into the pose');
  }
  // Over the crown the hand is laid in across the head, mirrored for the right hand.
  const l = pose('sitIdle'), r = pose('sitIdle');
  idleOverlay(l, Posture.seated, idle({ kind: IDLE.scratch, t: 1.5, dur: 3, site: SCRATCH.head, side: 0 })); idleOverlay(r, Posture.seated, idle({ kind: IDLE.scratch, t: 1.5, dur: 3, site: SCRATCH.head, side: 1 }));
  assert.ok(Math.abs(l.v[B.handL * 3 + 2] - HEAD_HAND[2]) < 1e-3 && Math.abs(r.v[B.handR * 3 + 2] + HEAD_HAND[2]) < 1e-3);
  assert.ok(l.v[B.head * 3 + 2] < 0 && r.v[B.head * 3 + 2] > 0, 'the head tilts toward the hand');
  // The wrist target lies near the place on the solved body: within reach of the shoulder, on the animal's own side,
  // and it rakes (it moves with time, by centimetres).
  const w = pose('sitIdle'), m = createMorph(), fk = createFK(), a = new Float32Array(3), b = new Float32Array(3);
  solveFK(w.pose, m, fk);
  for (const site of [SCRATCH.flank, SCRATCH.thigh, SCRATCH.head, SCRATCH_BELLY]) for (const side of [0, 1] as const) {
    scratchWrist(fk, m, site, side, 0, a); scratchWrist(fk, m, site, side, 0.25 / SCRATCH_HZ, b);
    const sh = (side ? B.uarmR : B.uarmL) * 3, d = Math.hypot(a[0] - fk.p[sh], a[1] - fk.p[sh + 1], a[2] - fk.p[sh + 2]);
    assert.ok(d < 0.56, `site ${site} side ${side}: ${d.toFixed(2)} body lengths from the shoulder (the arm is 0.55 long)`);
    if (site !== SCRATCH_BELLY) assert.ok(side ? a[0] < 0 : a[0] > 0, 'on its own side');
    const rake = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    assert.ok(rake > 0.01 && rake < 0.05, `rake ${rake.toFixed(3)}`);
    assert.ok(a.every(Number.isFinite));
  }
  assert.equal(SCRATCH_POINT.length, 4);
});

test('how a lying body lies is read from the pose', () => {
  assert.equal(lieOf(pose('sleep').v), Lie.side);
  assert.equal(lieOf(pose('groomee', { role: 2 }).v), Lie.prone);
  const kinds = new Set<number>();
  for (let role = 0; role < 3; role++) for (const seed of [0.05, 0.2, 0.4, 0.6, 0.8, 0.95]) { const w = pose('rest', { role, seed }); if (postureOf(w.v) === Posture.lying) kinds.add(lieOf(w.v)); }
  assert.deepEqual([...kinds].sort(), [Lie.side, Lie.supine]);
});

test('the seated rest no longer scratches by itself: its arms rest on the knees at every moment', () => {
  // (The old clip raised the left hand to the head for about 9 s of every 30 on a sine of the clock.)
  for (let time = 0; time < 60; time += 0.5) {
    const w = pose('rest', { role: 0, seed: 0.2, time });
    assert.equal(postureOf(w.v), Posture.seated);
    assert.ok(Math.abs(w.v[PI.ik + LIMB.armL * 5 + 1] - 0.3) < 1e-6 && Math.abs(w.v[PI.ik + LIMB.armR * 5 + 1] - 0.3) < 1e-6, `at ${time} s`);
  }
});

// --- Where stages W8 and W9 meet (the merge of 12 October 2026): idle life over the postures of a crown -----------------
test('in a crown the hand that holds on is not free to scratch, and a body lying along a bough does not scratch', () => {
  // The three seated resting postures keep one hand on a support: the left when the individual's seed is 0.5 or
  // less, else the right (poses.ts perchRest). That hand holds, in every one of them and at every moment; the other
  // is free, so a scratch drawn for the holding side goes to the other hand (creatures.ts stepIdle).
  for (const seed of [0.1, 0.37, 0.5, 0.51, 0.8]) for (const role of [PERCH.hold, PERCH.overhead, PERCH.foot]) for (const time of [0, 3.3, 41, 97.5]) {
    const w = pose('perch', { role, seed, time, inTree: true }), hold = seed > 0.5 ? 1 : 0;
    assert.equal(postureOf(w.v), Posture.seated, `posture ${role} is seated`);
    assert.ok(handHolds(w.v, hold), `posture ${role}, seed ${seed}: the hand on the support holds`);
    assert.ok(!handHolds(w.v, 1 - hold), `posture ${role}, seed ${seed}: the other hand is free`);
    assert.ok(mayScratch(Posture.seated, 0, true));
  }
  // The hand on a limb at hip height is the case the height test alone missed (0.05 body lengths up, far under 0.9).
  { const w = pose('perch', { role: PERCH.hold, seed: 0.2, inTree: true }); assert.ok(w.v[PI.ik + LIMB.armL * 5 + 1] < 0.9 && w.v[B.fingL2 * 3] > GRIP_HELD); }
  // The two lying postures read as lying, and neither scratches: on the back along the bough one hand is on it (it
  // holds) and the other arm is folded behind the head; prone, the chin is on a forearm.
  for (const seed of [0.2, 0.8]) for (const role of [PERCH.recline, PERCH.prone]) {
    const w = pose('perch', { role, seed, inTree: true });
    assert.ok(perchLies(role));
    assert.equal(postureOf(w.v), Posture.lying, `posture ${role} reads as lying`);
    assert.ok(!mayScratch(Posture.lying, lieOf(w.v), true), `posture ${role} does not scratch in a crown`);
  }
  assert.equal(lieOf(pose('perch', { role: PERCH.recline, inTree: true }).v), Lie.supine);
  assert.ok(handHolds(pose('perch', { role: PERCH.recline, seed: 0.2, inTree: true }).v, 0), 'reclining, the hand on the bough holds');
  // On the ground nothing changes: a lying body scratches on its side or its back, never prone; a seated one does; no
  // seated or lying ground clip that permits a scratch has a holding hand.
  assert.ok(mayScratch(Posture.lying, Lie.side, false) && mayScratch(Posture.lying, Lie.supine, false) && !mayScratch(Posture.lying, Lie.prone, false));
  assert.ok(mayScratch(Posture.seated, 0, false) && !mayScratch(Posture.quad, 0, false) && !mayScratch(Posture.other, 0, false));
  for (const clip of ['sitIdle', 'guard']) for (const side of [0, 1]) assert.ok(!handHolds(pose(clip).v, side), `${clip}: both hands free`);
  for (let role = 0; role < 3; role++) for (const seed of [0.05, 0.4, 0.6, 0.95]) for (const side of [0, 1]) assert.ok(!handHolds(pose('rest', { role, seed }).v, side), 'rest: both hands free');
});

test('crown feeding: the idle layer never takes a hand (it permits no scratch) and a weight shift leaves the hands on the cluster', () => {
  // Feeding permits a weight shift and a glance only (creatures.ts IDLE_ALLOW): neither writes a limb target, so the
  // hand that holds the cluster and the hand that picks from it are where the clip put them, through a whole cycle.
  for (let time = 0; time < 14; time += 0.35) for (const lean of [-1, 1]) {
    const base = pose('forage', { inTree: true, seed: 0.37, time }), w = pose('forage', { inTree: true, seed: 0.37, time });
    idleOverlay(w, postureOf(w.v), idle({ breath: 1, kind: IDLE.shift, t: 0.7, dur: 1.4, lean }));
    for (let i = PI.ik; i < PI.ik + 20; i++) assert.equal(w.v[i], base.v[i], `at ${time} s: limb targets untouched`);
    for (const bone of [B.uarmL, B.uarmR, B.farmL, B.farmR, B.handL, B.handR, B.fingL, B.fingR, B.fingL2, B.fingR2]) for (let k = 0; k < 3; k++) assert.equal(w.v[bone * 3 + k], base.v[bone * 3 + k], 'arm and hand joints untouched');
    assert.equal(w.pose.propL, base.pose.propL); assert.equal(w.pose.propR, base.pose.propR);
  }
});

test('the resting seat of a crown has idle life only in a quiet act: not in a display, a fight or a greeting drawn in it', () => {
  // In a crown these acts have no clip of their own and are drawn seated (creatures.ts chooseClip); on the ground
  // their clips permit no idle event.
  for (const act of ['display', 'charge', 'attack', 'submit', 'pant-grunt', 'flee', 'hunt', 'patrol', 'mate', 'reconcile', 'console', 'call', 'alarm', 'dead']) assert.ok(!seatIdles(act), `${act}: nothing but the breath`);
  for (const act of ['rest', 'follow', 'travel', 'guard', 'groom', 'nest']) assert.ok(seatIdles(act), `${act}: idle life`);
});

// Stage W11 (docs/staging/w11-polish.md), item 4. A glance needs a neighbour within reach. With nobody there the turn
// used to be cancelled and drawn again 2 s later, so an animal alone went through its turns several times as fast as
// one in a party and every other event came that much sooner. Now the turn is used up.
test('an animal alone has the same events at the same moments as one in company, less the glances', () => {
  const FEED = idleBit(IDLE.shift) | idleBit(IDLE.glance);
  /** One animal's schedule for `seconds`; `lone`: no neighbour, so a glance uses up its turn (what the creature layer does). */
  const play = (id: number, seconds: number, allow: number, rate: number, lone: boolean) => {
    const s = createIdle(id), dt = 1 / 30, events: [number, number][] = [];
    for (let t = 0; t < seconds; t += dt) {
      if (!idleStep(s, id, dt, rate, allow)) continue;
      if (lone && s.kind === IDLE.glance) { idleSpend(s, id, rate); continue; }
      events.push([t, s.kind]);
    }
    return events;
  };
  for (const [allow, rate] of [[FEED, 1], [ALL, 1], [FEED, 3]] as const) for (const id of [3, 12, 27, 44]) {
    const company = play(id, 1800, allow, rate, false), alone = play(id, 1800, allow, rate, true);
    const others = company.filter(e => e[1] !== IDLE.glance);
    assert.ok(company.length > others.length + 5, 'in company there are glances');
    // (As many: a used-up turn ends up to a frame sooner than a glance that ran, so the last event of the half hour may fall on either side of its end.)
    assert.ok(Math.abs(alone.length - others.length) <= 1, `animal ${id}: alone it has as many other events (${alone.length} against ${others.length})`);
    assert.ok(alone.every(e => e[1] !== IDLE.glance));
    for (let i = 0; i < Math.min(alone.length, others.length); i++) { assert.equal(alone[i][1], others[i][1]); assert.ok(Math.abs(alone[i][0] - others[i][0]) < 0.25 + 0.05 * i, `event ${i} starts at the same moment (${alone[i][0].toFixed(2)} against ${others[i][0].toFixed(2)})`); }
  }
  // The fault this replaces, for the record: with the turn cancelled an animal feeding alone shifts its weight about
  // twice as often (a cancelled turn is drawn again after 2 idle seconds).
  const cancelled = (() => { const s = createIdle(12), dt = 1 / 30; let n = 0; for (let t = 0; t < 1800; t += dt) if (idleStep(s, 12, dt, 1, FEED)) { if (s.kind === IDLE.glance) idleCancel(s); else n++; } return n; })();
  const now = play(12, 1800, FEED, 1, true).length;
  assert.ok(cancelled > 1.6 * now, `cancelled turns: ${cancelled} weight shifts in half an hour against ${now}`);
});

// Stage W11, item 3. A scratch cut short (a call arrives, a new act is announced) used to lose its reach at a fixed
// rate of 14 a second: a fifth of it in the first frame, which pulled the wrist back 55 cm in a fifth of a second.
test('a scratch cut short lets go like one that ends: no speed at the cut, never rising, gone in half a second', () => {
  for (const from of [1, 0.6, 0.2]) for (const fps of [20, 30, 60, 120]) {
    const dt = 1 / fps; let prev = from, worst = 0;
    assert.equal(scratchRelease(from, 0), from, 'it starts from the reach the scratch had');
    for (let t = dt; t < 1; t += dt) { const k = scratchRelease(from, t); assert.ok(k <= prev + 1e-12 && k >= 0, 'it never rises'); worst = Math.max(worst, (prev - k) / dt); prev = k; }
    assert.equal(scratchRelease(from, SCRATCH_CUT_S), 0); assert.equal(scratchRelease(from, 2), 0);
    // The fastest it ever falls: one and a half times the reach over the time (the smooth step's steepest point).
    assert.ok(worst <= 1.5 * from / SCRATCH_CUT_S + 1e-9, `fastest fall ${worst.toFixed(2)} a second`);
  }
  // The first sixtieth of a second moves next to nothing (the old rule took 21% of the reach in it); the largest
  // step of any sixtieth is a twentieth of the reach, a quarter of what the old rule's first frame took.
  const dt = 1 / 60, first = 1 - scratchRelease(1, dt), old = 1 - Math.exp(-14 * dt);
  assert.ok(first < 0.004, `first frame ${first.toFixed(4)} of the reach`);
  assert.ok(old > 0.2 && 1.5 / SCRATCH_CUT_S * dt < old / 4);
  // A body that has started to move lets go sooner.
  assert.ok(SCRATCH_CUT_MOVING_S < SCRATCH_CUT_S); assert.equal(scratchRelease(1, SCRATCH_CUT_MOVING_S, SCRATCH_CUT_MOVING_S), 0);
  // The body's part follows the same reach: with the event gone from the schedule, the head and the fingers are
  // where a scratch at that reach has them, and at no reach the pose is the clip's own.
  for (const site of [SCRATCH.flank, SCRATCH.head]) for (const side of [0, 1] as const) {
    const base = pose('sitIdle'), live = pose('sitIdle'), half = pose('sitIdle'), gone = pose('sitIdle');
    idleOverlay(live, Posture.seated, idle({ kind: IDLE.scratch, t: 1.5, dur: 3, site, side }));
    idleOverlay(half, Posture.seated, idle({ kind: IDLE.none, site, side, letGo: 0.5, letT: 1.5 }));
    idleOverlay(gone, Posture.seated, idle({ kind: IDLE.none, site, side, letGo: 0, letT: 1.5 }));
    const h = B.head * 3, f = (side ? B.fingR2 : B.fingL2) * 3;
    for (let i = 0; i < PI.root; i++) assert.ok(Math.abs(gone.v[i] - base.v[i]) < 1e-9, 'nothing is left when the reach is 0');
    for (const o of [h, h + 1, h + 2]) assert.ok(Math.abs((half.v[o] - base.v[o]) - 0.5 * (live.v[o] - base.v[o])) < 1e-6, 'the head is half way back');
    assert.ok(Math.abs(half.v[f] - base.v[f]) > 0.05 && Math.abs(half.v[f] - base.v[f]) < Math.abs(live.v[f] - base.v[f]), 'the fingers are part way back');
  }
});
