import assert from 'node:assert/strict';
import test from 'node:test';
import type { Chimp, Party } from '../src/types';
import {
  Listen, PatrolCode, PatrolRole, backSide, createFileCue, createPatrolLook, fileCue, listenVariant, patrolClip, patrolLook, patrolTension, phaseCode,
  phasedParties, scanHold, stepLeg, type LegState, type PatrolClip,
} from '../src/render/creatures/patrol';

const clip = (): PatrolClip => ({ clip: '', role: 0, gait: null });

// Small synthetic world slice: a phased patrol of four listed in file order (leader 12 first, not id order), a
// foraging party, and a patrol party without a published phase (today's sim).
type Who = Pick<Chimp, 'id' | 'alive' | 'action' | 'partyId'>;
const PARTIES: Party[] = [
  { id: 3, troopId: 0, members: [12, 3, 20, 7], center: [0, 0, 0], kind: 'patrol', patrolPhase: 'listen' },
  { id: 1, troopId: 0, members: [1, 2], center: [5, 0, 5], kind: 'foraging' },
  { id: 30, troopId: 1, members: [30, 31, 32], center: [9, 0, 9], kind: 'patrol' },
];
const who = (id: number, partyId: number, action: Chimp['action'] = 'patrol', alive = true): Who => ({ id, partyId, action, alive });

test('file cue from a synthetic world: order, neighbours, and degrading to no cue', () => {
  const phased = phasedParties(PARTIES, new Map());
  assert.deepEqual([...phased.keys()], [3], 'only the party that publishes a leg');
  const cue = createFileCue();
  assert.deepEqual({ ...fileCue(who(12, 3), phased, cue) }, { code: PatrolCode.listen, index: 0, count: 4, ahead: -1, behind: 3 });
  assert.deepEqual({ ...fileCue(who(20, 3), phased, cue) }, { code: PatrolCode.listen, index: 2, count: 4, ahead: 3, behind: 7 });
  assert.deepEqual({ ...fileCue(who(7, 3), phased, cue) }, { code: PatrolCode.listen, index: 3, count: 4, ahead: 20, behind: -1 });
  // A member doing something else (a release display), a dead one, a patrol without a phase, a foraging party.
  for (const w of [who(3, 3, 'display'), who(3, 3, 'patrol', false), who(31, 30), who(1, 1, 'forage')]) {
    assert.deepEqual({ ...fileCue(w, phased, cue) }, { code: PatrolCode.none, index: 0, count: 0, ahead: -1, behind: -1 });
  }
  // No phased parties at all (the sim before P4a): nothing resolves.
  assert.equal(fileCue(who(12, 3), phasedParties([PARTIES[1], PARTIES[2]], new Map()), cue).code, PatrolCode.none);
});

test('phase codes: each published leg maps to its code; absent means no patrol presentation', () => {
  assert.equal(phaseCode('out'), PatrolCode.out);
  assert.equal(phaseCode('listen'), PatrolCode.listen);
  assert.equal(phaseCode('incursion'), PatrolCode.incursion);
  assert.equal(phaseCode('return'), PatrolCode.return);
  assert.equal(phaseCode(undefined), PatrolCode.none);
  assert.equal(patrolClip(PatrolCode.none, true, 0, clip()), null, 'no phase: the caller keeps today\'s patrol clips');
  assert.equal(patrolClip(PatrolCode.none, false, 0, clip()), null);
});

test('moving legs: file walk out and while a stop closes up, careful sneak in neighbour range, loose walk home', () => {
  assert.deepEqual({ ...patrolClip(PatrolCode.out, true, 0, clip())! }, { clip: 'walk', role: PatrolRole.walkFile, gait: 'walk' });
  assert.deepEqual({ ...patrolClip(PatrolCode.listen, true, Listen.sniff, clip())! }, { clip: 'walk', role: PatrolRole.walkFile, gait: 'walk' });
  assert.deepEqual({ ...patrolClip(PatrolCode.incursion, true, 0, clip())! }, { clip: 'sneak', role: PatrolRole.sneakCareful, gait: 'sneak' });
  assert.deepEqual({ ...patrolClip(PatrolCode.return, true, 0, clip())! }, { clip: 'walk', role: PatrolRole.walkLoose, gait: 'walk' });
  // Patrol variants never reuse role 0, which stays the ordinary walk and sneak.
  assert.notEqual(PatrolRole.walkFile, 0); assert.notEqual(PatrolRole.walkLoose, 0); assert.notEqual(PatrolRole.sneakCareful, 0);
});

test('still legs: listening variant at a stop, wait on the way out, crouch in neighbour range, ordinary stance home', () => {
  for (const v of [Listen.scan, Listen.tall, Listen.sniff, Listen.back]) assert.deepEqual({ ...patrolClip(PatrolCode.listen, false, v, clip())! }, { clip: 'listen', role: v, gait: null });
  assert.equal(patrolClip(PatrolCode.out, false, Listen.sniff, clip())!.role, Listen.wait);
  assert.equal(patrolClip(PatrolCode.incursion, false, Listen.scan, clip())!.role, Listen.crouch);
  assert.deepEqual({ ...patrolClip(PatrolCode.return, false, 0, clip())! }, { clip: 'stand', role: 0, gait: null });
});

test('listening variants: heads come up staggered, then a few sniff or look back, never all in unison', () => {
  const ids = Array.from({ length: 400 }, (_, i) => 101 + i * 7);
  // Onset: every animal waits 0.2–1.2 s after the stop begins, each for its own time.
  const onsets = new Set<number>();
  for (const id of ids.slice(0, 12)) {
    let t = 0;
    while (listenVariant(id, 2, 6, t, 0) === Listen.wait && t < 2) t += 0.01;
    assert.ok(t >= 0.2 - 1e-9 && t <= 1.2 + 0.011, `onset ${t}`);
    onsets.add(Math.round(t * 100));
  }
  assert.ok(onsets.size >= 8, 'onsets are staggered');
  // Middle of the file, long after the onset: shares near the stated 20% sniff / 18% back.
  const n = { sniff: 0, back: 0, tall: 0, scan: 0 };
  for (const id of ids) for (let k = 0; k < 10; k++) {
    const v = listenVariant(id, 3, 6, 40 + k * 11, 0);
    if (v === Listen.sniff) n.sniff++; else if (v === Listen.back) n.back++; else if (v === Listen.tall) n.tall++; else n.scan++;
  }
  const all = ids.length * 10;
  assert.ok(n.sniff / all > 0.14 && n.sniff / all < 0.26, `sniff ${n.sniff / all}`);
  assert.ok(n.back / all > 0.12 && n.back / all < 0.24, `back ${n.back / all}`);
  assert.ok(n.scan / all > 0.4, `scan ${n.scan / all}`);
  // A file of six at one instant is not all in the same variant, at most instants.
  let uniform = 0;
  for (let t = 20; t < 200; t += 1.7) { const vs = new Set([0, 1, 2, 3, 4, 5].map(i => listenVariant(300 + i, i, 6, t, 0))); if (vs.size === 1) uniform++; }
  assert.ok(uniform < 3, `uniform instants ${uniform}`);
  // The leader never sniffs or looks back; the tail mostly looks back.
  let tailBack = 0;
  for (const id of ids) {
    const lead = listenVariant(id, 0, 6, 50, 0);
    assert.ok(lead === Listen.tall || lead === Listen.scan);
    if (listenVariant(id, 5, 6, 50, 0) === Listen.back) tailBack++;
  }
  assert.ok(tailBack / ids.length > 0.4, `tail back ${tailBack / ids.length}`);
});

test('variants hold for seconds, not frames (no posture flicker)', () => {
  for (const id of [5, 77, 1234]) {
    let changes = 0, prev = listenVariant(id, 2, 6, 10, 0);
    for (let t = 10; t < 70; t += 1 / 60) { const v = listenVariant(id, 2, 6, t, 0); if (v !== prev) changes++; prev = v; }
    assert.ok(changes <= 12, `changes ${changes} in 60 s`); // segments of 5–10 s
  }
});

test('scan holds: heads up, yaw within the amplitude, still between turns', () => {
  const L = createPatrolLook();
  for (let t = 0; t < 30; t += 0.25) {
    scanHold(42, t, 1.1, L);
    assert.ok(Math.abs(L.yaw) <= 1.1 + 1e-9);
    assert.ok(L.pitch >= 0.06 && L.pitch <= 0.18 + 1e-9);
  }
  let changes = 0, prev = NaN;
  for (let t = 0; t < 30; t += 1 / 60) { scanHold(42, t, 1.1, L); if (L.yaw !== prev) changes++; prev = L.yaw; }
  assert.ok(changes >= 8 && changes <= 25, `turns ${changes} in 30 s`);
});

test('look targets: file ahead on the way out, slow scans at stops, back along the file, nothing while sniffing or home', () => {
  const L = createPatrolLook();
  patrolLook(PatrolCode.out, 0, 7, 3, 9, true, 5, L);
  assert.equal(L.mode, 2); assert.equal(L.memberId, 3);
  patrolLook(PatrolCode.out, 0, 7, -1, 9, true, 5, L);
  assert.equal(L.mode, 1, 'the leader looks ahead'); assert.equal(L.yaw, 0);
  patrolLook(PatrolCode.listen, Listen.scan, 7, 3, 9, false, 5, L);
  assert.equal(L.mode, 1); assert.ok(L.pitch > 0 && L.weight > 0.8 && L.halflife > 0.15, 'slow, heads-up scan');
  patrolLook(PatrolCode.listen, Listen.back, 7, 3, 9, false, 5, L);
  assert.equal(L.mode, 2); assert.equal(L.memberId, 9);
  patrolLook(PatrolCode.listen, Listen.back, 7, 3, -1, false, 5, L);
  assert.equal(L.mode, 1); assert.ok(Math.abs(L.yaw) > 2, 'the tail looks back along the path'); assert.equal(Math.sign(L.yaw), backSide(7));
  patrolLook(PatrolCode.listen, Listen.sniff, 7, 3, 9, false, 5, L);
  assert.equal(L.mode, 0);
  patrolLook(PatrolCode.incursion, 0, 7, 3, 9, true, 5, L);
  assert.equal(L.mode, 1); assert.ok(Math.abs(L.yaw) <= 0.6 + 1e-9);
  patrolLook(PatrolCode.return, 0, 7, 3, 9, true, 5, L);
  assert.equal(L.mode, 0, 'home: ordinary attention');
});

test('tension: silent legs press the lips, neighbour range is tensest, home is relaxed', () => {
  const out = patrolTension(PatrolCode.out), inc = patrolTension(PatrolCode.incursion), home = patrolTension(PatrolCode.return), none = patrolTension(PatrolCode.none);
  assert.ok(out.press > 0 && inc.press >= out.press && inc.bristle > out.bristle && inc.brow < out.brow);
  assert.deepEqual(home, { bristle: 0, press: 0, brow: 0 });
  assert.deepEqual(none, { bristle: 0, press: 0, brow: 0 });
});

test('drawn leg: changes between legs wait for the drawn (lagged) time; joining and leaving apply at once', () => {
  const s: LegState = { pCode: PatrolCode.none, pPub: PatrolCode.none, pPubAt: 0, pSince: 0 };
  assert.ok(stepLeg(s, PatrolCode.out, 10, 9.99, 1));
  assert.equal(s.pCode, PatrolCode.out); assert.equal(s.pSince, 1);
  // A stop is published at 10.1 h; the drawn animal is still 2 ticks behind.
  assert.equal(stepLeg(s, PatrolCode.listen, 10.1, 10.095, 2), false);
  assert.equal(s.pCode, PatrolCode.out);
  assert.equal(stepLeg(s, PatrolCode.listen, 10.105, 10.1, 3), true);
  assert.equal(s.pCode, PatrolCode.listen); assert.equal(s.pSince, 3);
  // Leaving the patrol (a release display, the party dissolved) is immediate.
  assert.ok(stepLeg(s, PatrolCode.none, 10.2, 10.19, 4));
  assert.equal(s.pCode, PatrolCode.none);
  // Deterministic and pure given its inputs.
  const a: LegState = { pCode: 1, pPub: 1, pPubAt: 0, pSince: 0 }, b: LegState = { ...a };
  stepLeg(a, 3, 5, 4.9, 1); stepLeg(b, 3, 5, 4.9, 1);
  assert.deepEqual(a, b);
});
