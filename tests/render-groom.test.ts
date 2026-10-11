import assert from 'node:assert/strict';
import test from 'node:test';
import type { Chimp } from '../src/types';
import { B, LIMB, PI, computeMorph, createFK, createMorph, createPose, lowestPoint, solveFK } from '../src/render/creatures/rig';
import { CLIPS, GROOMEE, GROOM_LAP, Pw, groomeePosture, type PoseCtx } from '../src/render/creatures/poses';

// Stage W5 (docs/staging/w5-grooming.md): the grooming choreography is a stylization, so these tests hold its
// mechanics, not field numbers: the hands travel, picks to the mouth stay off, a held infant is groomed in the lap
// with the arms down, and the receiver's posture obeys the two exclusions.
const ctx = (over: Partial<PoseCtx> = {}): PoseCtx => ({
  t: 0, time: 0, phase: 0, speedU: 0, freq: 0, seed: 0.37, stage: 'adult', male: true, age: 24, injury: 0, mood: 'calm', energy: 1,
  vocal: null, hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: false, wet: 0, stride: 0, lp: 0.6, lapse: 0,
  pb: new Float32Array(15), hasBones: false, pairT: 0, side: 1, ...over,
});
const pose = createPose(), w = new Pw();
function run(clip: string, c: PoseCtx): Float32Array { w.bind(pose).reset(); CLIPS[clip](w, c); return pose.v; }
const arm = (v: Float32Array, limb: number) => [v[PI.ik + limb * 5], v[PI.ik + limb * 5 + 1], v[PI.ik + limb * 5 + 2], v[PI.ik + limb * 5 + 3]];
/** IK targets of both hands over 14 s of the pair clock in 50 ms steps (the fact-check's window). */
function sweep(c: PoseCtx, each?: (v: Float32Array) => void) {
  const min = [[9, 9, 9], [9, 9, 9]], max = [[-9, -9, -9], [-9, -9, -9]], path = [0, 0];
  let last: number[][] | null = null;
  for (let i = 0; i <= 280; i++) {
    c.pairT = 100 + i * 0.05; c.t = i * 0.05; c.time = 40 + i * 0.05;
    const v = run('groom', c), hands = [arm(v, LIMB.armL), arm(v, LIMB.armR)];
    each?.(v);
    hands.forEach((h, k) => { for (let j = 0; j < 3; j++) { min[k][j] = Math.min(min[k][j], h[j]); max[k][j] = Math.max(max[k][j], h[j]); } if (last) path[k] += Math.hypot(h[0] - last[k][0], h[1] - last[k][1], h[2] - last[k][2]); });
    last = hands;
  }
  return { range: max.map((m, k) => m.map((x, j) => x - min[k][j])), min, max, path };
}

test('the groomer\'s hands travel over the partner and comb; picks to the mouth stay off', () => {
  // A seated partner 0.8 body lengths ahead, known by its root only (no posed bones).
  let jaw = 0;
  const s = sweep(ctx({ hasTarget: true, tz: 0.8, tdist: 0.8 }), v => { jaw = Math.max(jaw, v[PI.mouth]); });
  // Before stage W5 the hands stayed within 0.02 body lengths of one height (3 cm on an adult); now the work site
  // moves over the back at least once in the window.
  assert.ok(s.range[0][1] > 0.08 && s.range[1][1] > 0.08, `both hands travel up and down the back (${s.range.map(r => r[1].toFixed(2))})`);
  assert.ok(s.path[1] > 4 * s.path[0], 'the combing hand strokes; the parting hand only shifts its hold');
  // GROOM_PICK_TO_MOUTH is off (the folded arm lifts its elbow over the head until the rig has a per-clip elbow pole):
  // the jaw only lip-smacks (a pick would open it by a further 0.22) and the combing hand stays on the partner.
  assert.ok(jaw <= 0.111, `jaw ${jaw}`);
  assert.ok(s.min[1][2] > 0.5, 'the combing hand never comes back to the face');
});

test('an infant held on the belly is groomed there: arms down in front, shorter strokes', () => {
  // The infant's root as placeCarried puts it: on the chest, about a quarter of a body length ahead and up.
  const s = sweep(ctx({ role: GROOM_LAP, male: false, hasTarget: true, tx: 0, ty: 0.3, tz: 0.24, tdist: 0.24, tsize: 0.45 }));
  for (const k of [0, 1]) {
    assert.ok(s.max[k][1] < 0.75, `hand ${k} stays below the shoulders (${s.max[k][1].toFixed(2)})`);
    assert.ok(s.min[k][2] > 0.15 && s.max[k][2] < 0.6, `hand ${k} stays in front of the belly`);
  }
  assert.ok(s.range[1][1] > 0.04, 'the combing hand moves over the infant\'s back');
  assert.equal(s.path[0], 0, 'the other hand supports the infant');
  // The same clip without a partner in reach falls back to the hands resting in front (no reach at all).
  const v = run('groom', ctx({ role: GROOM_LAP }));
  assert.ok(arm(v, LIMB.armL)[1] < 0.5 && arm(v, LIMB.armR)[1] < 0.5);
});

test('receiver postures: every one is a finite pose, and the lying ones lie', () => {
  const m = createMorph(), fk = createFK();
  for (const [name, role] of Object.entries(GROOMEE)) for (const seed of [0.1, 0.9]) {
    const v = run('groomee', ctx({ role, seed, pairT: 123.4, time: 55 }));
    assert.ok(v.every(Number.isFinite), `${name} is finite`);
    solveFK(pose, m, fk);
    const hips = fk.p[B.hips * 3 + 1], head = fk.p[B.head * 3 + 1];
    if (role === GROOMEE.prone || role === GROOMEE.side) assert.ok(head - hips < 0.25, `${name}: the head is near the hips' height (${(head - hips).toFixed(2)})`);
    else assert.ok(head - hips > 0.3, `${name}: seated, head above the hips`);
    if (role === GROOMEE.prone) {
      // Prone limbs are posed by joint angles: under IK the rig's limb poles stood the elbows and knees in the air.
      for (const limb of [LIMB.armL, LIMB.armR, LIMB.legL, LIMB.legR]) assert.equal(v[PI.ik + limb * 5 + 3], 0, 'no IK on a prone limb');
      for (const bone of [B.farmL, B.farmR, B.handL, B.handR, B.shinL, B.shinR]) assert.ok(fk.p[bone * 3 + 1] < fk.p[B.chest * 3 + 1] + 0.06, 'elbows, wrists and knees lie no higher than the back');
    }
    // A clip is a pure function of its context.
    assert.deepEqual(Array.from(run('groomee', ctx({ role, seed, pairT: 123.4, time: 55 }))), Array.from(v));
  }
});

test('receiver posture rule: shares, the ground, and the two exclusions', () => {
  const tally = new Map<number, number>();
  for (let i = 0; i < 1000; i++) { const r = groomeePosture((i + 0.5) / 1000, true, false, false); tally.set(r, (tally.get(r) ?? 0) + 1); }
  assert.deepEqual([GROOMEE.sit, GROOMEE.present, GROOMEE.prone, GROOMEE.side].map(r => tally.get(r)), [400, 200, 220, 180]);
  for (let i = 0; i < 200; i++) {
    const pick = (i + 0.5) / 200;
    // Off the ground, or with an infant on its body: never lying down.
    for (const [ground, holds] of [[false, false], [true, true], [false, true]] as const) {
      const r = groomeePosture(pick, ground, holds, false);
      assert.ok(r === GROOMEE.sit || r === GROOMEE.present, `pick ${pick} ground ${ground} holds ${holds} gave ${r}`);
    }
    // Cradling a dead infant (or groomed by the infant it holds): the plain seated posture, whatever was picked.
    assert.equal(groomeePosture(pick, true, true, true), GROOMEE.sit);
  }
  // The harness override passes the same tests.
  for (const forced of [GROOMEE.prone, GROOMEE.side, GROOMEE.present, GROOMEE.sit]) {
    assert.equal(groomeePosture(0.1, true, true, true, forced), GROOMEE.sit);
    assert.equal(groomeePosture(0.1, true, false, false, forced), forced);
  }
  assert.equal(groomeePosture(0.1, true, true, false, GROOMEE.prone), GROOMEE.present);
  assert.equal(groomeePosture(0.1, false, false, false, GROOMEE.side), GROOMEE.present);
});

test('arm raised: the hand is at the head on a folded arm, at every age', () => {
  // As brought from the prototype the arm stood straight up with the wrist 0.4 body lengths above the head bone (the
  // review of 10 October listed arms held straight up as a fault). The hand's place grows with the head, which is up
  // to 1.75 times an adult's for the body in an infant.
  const m = createMorph(), fk = createFK();
  const at = (bone: number) => [fk.p[bone * 3], fk.p[bone * 3 + 1], fk.p[bone * 3 + 2]];
  const gap = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  for (const [age, male] of [[1.3, false], [2.5, true], [3.5, false], [7, true], [12, false], [24, true], [40, false]] as const) for (const seed of [0.1, 0.45, 0.9]) for (const pairT of [10, 777, 2600]) {
    computeMorph({ age, sex: male ? 'male' : 'female' } as Chimp, m);
    run('groomee', ctx({ role: GROOMEE.present, seed, age, male, stage: age < 5 ? 'infant' : 'adult', pairT, time: 55 }));
    solveFK(pose, m, fk);
    const right = seed > 0.5, head = at(B.head), wrist = at(right ? B.handR : B.handL), elbow = at(right ? B.farmR : B.farmL), shoulder = at(right ? B.uarmR : B.uarmL);
    const where = `age ${age} seed ${seed} pairT ${pairT}`, hs = m.headScale, d = gap(wrist, head) / m.size;
    assert.ok(d < 0.24 * hs, `${where}: the wrist is at the head (${d.toFixed(2)} body lengths from the head bone, head ${hs.toFixed(2)})`);
    assert.ok(d > 0.1 * hs, `${where}: the wrist is not inside the head (${d.toFixed(2)})`);
    assert.ok(wrist[1] > shoulder[1], `${where}: the hand is above the shoulder`);
    const fold = gap(shoulder, wrist) / (gap(shoulder, elbow) + gap(elbow, wrist));
    assert.ok(fold < 0.85, `${where}: the elbow is bent (${fold.toFixed(2)} of the arm's length from shoulder to wrist)`);
    // The other arm keeps the seated rest.
    assert.ok(at(right ? B.handL : B.handR)[1] < shoulder[1]);
  }
});

test('on its side: no knee goes through the ground, so the body is not lifted onto it', () => {
  // As brought, the legs were under IK: the knee of the leg underneath sat 0.10 to 0.13 body lengths below the ground
  // plane and the creature layer lifted the whole body by 0.15 to 0.19 to stand on it (trunk, hands and feet in the air).
  const m = createMorph(), fk = createFK();
  for (const seed of [0.1, 0.45, 0.6, 0.9]) {
    const v = run('groomee', ctx({ role: GROOMEE.side, seed, pairT: 123.4, time: 55 }));
    solveFK(pose, m, fk);
    for (const limb of [LIMB.legL, LIMB.legR]) assert.equal(v[PI.ik + limb * 5 + 3], 0, 'no IK on the legs');
    for (const bone of [B.shinL, B.shinR, B.footL, B.footR]) assert.ok(fk.p[bone * 3 + 1] > 0, `seed ${seed}: knees and ankles are above the ground plane (${fk.p[bone * 3 + 1].toFixed(3)})`);
    // What is left is the shoulder and hand underneath: the lift that rests them on the ground.
    assert.ok(lowestPoint(fk, m) > -0.13, `seed ${seed}: lowest point ${lowestPoint(fk, m).toFixed(3)}`);
  }
});

