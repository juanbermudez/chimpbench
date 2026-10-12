import assert from 'node:assert/strict';
import test from 'node:test';
import { CLIPS, Pw, type PoseCtx } from '../src/render/creatures/poses';
import { B, LIMB, PI, createPose } from '../src/render/creatures/rig';
import { Posture, intention, postureOf } from '../src/render/creatures/intention';

// Stage W6: the intention movement laid over a clip in the last second before the drawn body starts a new act
// (src/render/creatures/intention.ts). A stylization: the tests pin what it does to a pose, not how chimpanzees move.

const ctx = (o: Partial<PoseCtx> = {}): PoseCtx => ({
  t: 1.3, time: 7.1, phase: 0.3, speedU: 0, freq: 0, seed: 0.2, stage: 'adult', male: true, age: 20, injury: 0, mood: 'calm', energy: 1, vocal: null,
  hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: false, wet: 0, stride: 0, lp: 0.6, lapse: 0, settle: 0, pb: new Float32Array(15), hasBones: false, pairT: 0, side: 1, ...o,
});
const pose = (clip: string, o: Partial<PoseCtx> = {}) => { const w = new Pw().bind(createPose()).reset(); CLIPS[clip](w, ctx(o)); return w; };

test('the posture is read from the pose: seated, on all fours, lying, or neither', () => {
  for (const clip of ['sitIdle', 'forage', 'perch', 'guard', 'groomee', 'nurse', 'shelter']) assert.equal(postureOf(pose(clip).v), Posture.seated, clip);
  for (const clip of ['stand', 'walk', 'drink', 'sneak']) assert.equal(postureOf(pose(clip).v), Posture.quad, clip);
  for (const clip of ['sleep', 'dead']) assert.equal(postureOf(pose(clip).v), Posture.lying, clip);
  for (const clip of ['climb', 'clingTrunk', 'display', 'bipedWalk']) assert.equal(postureOf(pose(clip).v), Posture.other, clip);
  // Resting has three variants by individual and bout; each is read for what it is.
  const kinds = new Set<number>();
  for (let role = 0; role < 3; role++) for (const seed of [0.05, 0.2, 0.4, 0.6, 0.8, 0.95]) kinds.add(postureOf(pose('rest', { role, seed }).v));
  assert.deepEqual([...kinds].sort(), [Posture.seated, Posture.lying]);
  assert.equal(postureOf(pose('rest', { energy: 0.1 }).v), Posture.lying, 'exhausted: lying');
  // The receiver of grooming lying on its belly or its side.
  assert.equal(postureOf(pose('groomee', { role: 2 }).v), Posture.lying);
  assert.equal(postureOf(pose('groomee', { role: 3 }).v), Posture.lying);
});

test('a seated animal about to walk off half rises: rump up and forward, trunk tipped, hands down, head kept up', () => {
  const base = pose('sitIdle'), w = pose('sitIdle');
  intention(w, postureOf(w.v), 1, 0, true);
  assert.ok(w.v[PI.root + 1] > base.v[PI.root + 1] + 0.08, 'the hips rise');
  assert.ok(w.v[PI.root + 2] > base.v[PI.root + 2] + 0.05, 'and come forward');
  assert.ok(w.v[B.hips * 3] > base.v[B.hips * 3] + 0.5, 'the trunk tips toward all fours');
  assert.ok(w.v[B.neck * 3] < base.v[B.neck * 3], 'the neck lifts the head against it');
  for (const l of [LIMB.armL, LIMB.armR]) { const o = PI.ik + l * 5; assert.ok(Math.abs(w.v[o + 1] - 0.13) < 1e-6 && w.v[o + 2] > 0.3, 'hands on the ground in front'); }
  for (const l of [LIMB.legL, LIMB.legR]) { const o = PI.ik + l * 5; for (let k = 0; k < 5; k++) assert.equal(w.v[o + k], base.v[o + k], 'the feet stay where they are'); }
  assert.ok(w.v[PI.root + 1] < 0.4, 'not yet standing (all fours is 0.53)');
  // Half way in it is half way there; at 0 nothing changes.
  const half = pose('sitIdle'); intention(half, Posture.seated, 0.5, 0, true);
  assert.ok(Math.abs(half.v[PI.root + 1] - (base.v[PI.root + 1] + w.v[PI.root + 1]) / 2) < 1e-6);
  const none = pose('sitIdle'); intention(none, Posture.seated, 0, 0.8, true);
  assert.deepEqual([...none.v], [...base.v]);
});

test('it turns toward the goal, within a limit, and the hands go down on the goal\'s side', () => {
  const left = pose('sitIdle'), right = pose('sitIdle'), far = pose('sitIdle');
  intention(left, Posture.seated, 1, 0.4, true); intention(right, Posture.seated, 1, -0.4, true); intention(far, Posture.seated, 1, 3, true);
  assert.ok(left.v[B.chest * 3 + 1] > 0.1 && right.v[B.chest * 3 + 1] < -0.1, 'the chest turns to the side of the goal');
  assert.ok(left.v[PI.ik + LIMB.armL * 5] > right.v[PI.ik + LIMB.armL * 5]);
  assert.ok(far.v[B.chest * 3 + 1] < 0.4, 'a goal behind does not twist the trunk round');
});

test('a seated animal that stays, or sits in a tree, sits up; one on all fours shifts its weight; lying and upright bodies are left alone', () => {
  const base = pose('forage', { inTree: true }), up = pose('forage', { inTree: true });
  intention(up, postureOf(up.v), 1, 0.3, false);
  assert.ok(up.v[B.chest * 3] < base.v[B.chest * 3] - 0.1 && up.v[B.spine * 3] < base.v[B.spine * 3] - 0.1, 'the hunched back straightens');
  assert.ok(Math.abs(up.v[PI.root + 1] - base.v[PI.root + 1]) < 0.03 && up.v[PI.root + 2] === base.v[PI.root + 2], 'it stays seated where it is');
  assert.ok(up.v[B.chest * 3 + 1] > base.v[B.chest * 3 + 1], 'and turns its chest to the goal');
  const q0 = pose('stand'), q = pose('stand');
  intention(q, postureOf(q.v), 1, 0, true);
  assert.ok(q.v[PI.root + 2] > q0.v[PI.root + 2] + 0.04 && q.v[PI.root + 1] < q0.v[PI.root + 1], 'forward over the hands and a little down');
  assert.ok(q.v[B.neck * 3] < q0.v[B.neck * 3], 'head up');
  for (const clip of ['sleep', 'climb', 'display']) { const a = pose(clip), b = pose(clip); intention(b, postureOf(b.v), 1, 0.5, true); assert.deepEqual([...b.v], [...a.v], clip); }
});
