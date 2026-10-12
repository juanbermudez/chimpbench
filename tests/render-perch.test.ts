import assert from 'node:assert/strict';
import test from 'node:test';
import type { Chimp } from '../src/types';
import { B, PI, computeMorph, createFK, createMorph, createPose, solveFK } from '../src/render/creatures/rig';
import { CLIPS, FEED_HOLD_INFANT, GROOM_FRONT, GROOM_HIGH, PROP, Pw, feedCycle, feedHold, feedPicks, groomerRole, type PoseCtx } from '../src/render/creatures/poses';
import { LIMB_TIP, leafSprayGeometry } from '../src/render/creatures/props';
import { headLook } from '../src/render/creatures/secondary';
import { CLAMBER_MPS, CLAMBER_OFF_M, CLAMBER_ON_M, CROWN_JUMP_M, NEST_TURNS, NEST_TURN_RAD, PAIR_HEIGHT_M, PAIR_REACH_M, PERCH, SEAT_REACH_M, STEM_REACH_M, boughStem, clamberSpeed, clambering, crownStep, nestTurn, pairReach, perchBout, perchLies, perchPeriod, perchPosture, seatAllowed, seatGroups, type SeatPairs } from '../src/render/creatures/perch';
import { dampAngle } from '../src/render/creatures/util';

// Stage W9 (docs/staging/w9b-tree-pairs.md): pairs and postures in trees. Everything drawn here is a stylization, so
// these tests hold the rules, not field numbers: who sits where on a shared bough, which resting posture an individual
// is in, that a hand or foot is on a support in each, and that the feeding hand reaches the mouth elbow down.
const ctx = (over: Partial<PoseCtx> = {}): PoseCtx => ({
  t: 0, time: 0, phase: 0, speedU: 0, freq: 0, seed: 0.37, stage: 'adult', male: true, age: 24, injury: 0, mood: 'calm', energy: 1,
  vocal: null, hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: true, wet: 0, stride: 0, lp: 0.6, lapse: 0, settle: 0,
  pb: new Float32Array(15), hasBones: false, pairT: 0, side: 1, ...over,
});
const pose = createPose(), w = new Pw(), fk = createFK();
const morphOf = (age: number, sex: 'male' | 'female') => { const m = createMorph(); computeMorph({ age, sex, id: 3, appearance: { fur: 0.5, face: 0.5, build: 0.5, brow: 0.5, ears: 0.5 } } as unknown as Chimp, m); return m; };
/** Joint position in unit body space (body lengths) after forward kinematics. */
const at = (bone: number, size: number) => [fk.p[bone * 3] / size, fk.p[bone * 3 + 1] / size, fk.p[bone * 3 + 2] / size];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ---- Seats on a shared bough (perch.ts seatGroups) ----
/** Runs seatGroups for pairings given as [actor, partner, sep] over slots whose ids are `ids`; ranks default to the ids. */
function seats(pairs: [number, number, number][], ids: number[], rank?: number[]) {
  const n = ids.length;
  const sp: SeatPairs = { a: Int32Array.from(pairs.map(p => p[0])), b: Int32Array.from(pairs.map(p => p[1])), sep: Float32Array.from(pairs.map(p => p[2])), n: pairs.length };
  const host = new Int32Array(n).fill(-1), s = new Float32Array(n), done = new Uint8Array(n);
  seatGroups(sp, Int32Array.from(ids), Float64Array.from(rank ?? ids), host, s, done);
  return { host: [...host], s: [...s].map(x => +x.toFixed(3)) };
}

test('a pair in a crown shares one bough at the ground layout\'s distance, whoever acts', () => {
  const oneWay = seats([[0, 1, 1.2]], [7, 9]);
  assert.deepEqual(oneWay.host, [0, 0], 'both sit on the bough of the better-ranked animal');
  assert.equal(Math.abs(oneWay.s[0] - oneWay.s[1]), 1.2);
  assert.equal(oneWay.s[0], 0, 'the host keeps its own place');
  // The other one grooms, or both do (a mutual pair is laid out once, from the lower id): the same two seats.
  const reversed = seats([[1, 0, 1.2]], [7, 9]);
  assert.deepEqual(reversed, oneWay, 'the seats do not change when the grooming changes direction');
  // An animal in no pairing is left alone (the caller's -1).
  assert.equal(seats([[0, 1, 1.2]], [7, 9, 11]).host[2], -1);
});

test('a chain keeps each groomer at its partner; two groomers of one animal take its two sides', () => {
  // 0 grooms 1, 1 grooms 2. Whatever the order of the pairings and of the ids, each actor is `sep` from its partner
  // and no two animals share a place.
  for (const ids of [[5, 6, 7], [7, 6, 5], [6, 9, 2], [9, 2, 6]]) for (const order of [[[0, 1, 1.2], [1, 2, 1.1]], [[1, 2, 1.1], [0, 1, 1.2]]] as [number, number, number][][]) {
    const r = seats(order, ids);
    assert.ok(r.host.every(h => h === r.host[0]), 'one bough for the whole chain');
    assert.ok(Math.abs(Math.abs(r.s[0] - r.s[1]) - 1.2) < 1e-6 && Math.abs(Math.abs(r.s[1] - r.s[2]) - 1.1) < 1e-6, `each groomer sits at its partner (${r.s})`);
    assert.ok(Math.abs(r.s[0] - r.s[2]) > 2.2, `the first groomer is on the far side of the middle animal (${r.s})`);
  }
  // Before this stage the first groomer was laid out behind the middle animal's simulated position.
  // A star: 0 and 2 both groom 1.
  const star = seats([[0, 1, 1.2], [2, 1, 1.2]], [4, 5, 6]);
  assert.ok(star.host.every(h => h === star.host[0]));
  assert.ok(Math.abs(star.s[0] - star.s[2]) > 2.3, `one on each side of the animal they work on (${star.s})`);
  // A chain of four and a ring of three: still one bough, nobody within half a seat of another.
  for (const r of [seats([[0, 1, 1.2], [1, 2, 1.2], [2, 3, 1.2]], [3, 1, 4, 2]), seats([[0, 1, 1.2], [1, 2, 1.2], [2, 0, 1.2]], [3, 1, 2])]) {
    assert.ok(r.host.every(h => h === r.host[0]));
    for (let i = 0; i < r.s.length; i++) for (let j = i + 1; j < r.s.length; j++) assert.ok(Math.abs(r.s[i] - r.s[j]) > 0.6, `no two in one place (${r.s})`);
  }
});

test('the bough stays with the best-ranked animal, and separate groups get separate boughs', () => {
  // Ranks as creatures.ts gives them: a host of the frame before first, then an animal that is only worked on.
  const a = seats([[0, 1, 1.2]], [7, 9], [2e6 + 7, 1e6 + 9]);
  assert.deepEqual(a.host, [1, 1], 'the others come to the animal that is only worked on');
  assert.equal(a.s[1], 0);
  const b = seats([[0, 1, 1.2]], [7, 9], [7, 1e6 + 9]);
  assert.deepEqual(b.host, [0, 0], 'a bough already hosted stays where it is');
  const two = seats([[0, 1, 1.2], [2, 3, 1.0]], [1, 2, 3, 4]);
  assert.deepEqual(two.host, [0, 0, 2, 2]);
  // Deterministic: the same pairings give the same seats.
  assert.deepEqual(seats([[0, 1, 1.2], [1, 2, 1.1]], [5, 6, 7]), seats([[0, 1, 1.2], [1, 2, 1.1]], [5, 6, 7]));
});

test('a pair seat is refused beyond 9 m of the simulated position unless the animal\'s own branch is further', () => {
  // 9 m: as far as an own limb already draws an animal from its simulated position on the field map (8.9 m measured).
  assert.equal(SEAT_REACH_M, 9);
  assert.ok(seatAllowed(8.9, 0.5) && seatAllowed(9, 0));
  assert.ok(seatAllowed(6.3, 1.7), 'a chain\'s first groomer 6.3 m from its place in a wide crown joins its partner');
  assert.ok(!seatAllowed(9.1, 0.5), 'further than an own limb is ever drawn: it keeps its own branch');
  assert.ok(seatAllowed(9.9, 10), 'no further than its own branch already is');
  assert.ok(!seatAllowed(10.1, 10));
});

// ---- Resting postures (perch.ts perchPosture, poses.ts 'perch') ----
test('the resting posture is a pure function of individual and bout, and changes when the bout does', () => {
  const seen = new Set<number>(), count = [0, 0, 0, 0, 0];
  for (let id = 1; id <= 60; id++) {
    assert.ok(perchPeriod(id) >= 50 && perchPeriod(id) <= 120);
    for (let bout = 0; bout < 40; bout++) {
      const p = perchPosture(id, bout, 2);
      assert.equal(p, perchPosture(id, bout, 2), 'the same individual in the same bout is drawn the same way');
      assert.ok(Number.isInteger(p) && p >= 0 && p <= 4);
      assert.notEqual(p, perchPosture(id, bout + 1, 2), `the posture changes with the bout (id ${id}, bout ${bout})`);
      seen.add(p); count[p]++;
      // What the tree offers: prone needs a large limb, reclining a bough; a small tree has seated postures only. The
      // change of posture from bout to bout holds in each.
      const mid = perchPosture(id, bout, 1), small = perchPosture(id, bout, 0);
      assert.notEqual(mid, PERCH.prone);
      assert.ok(!perchLies(small), 'nobody lies down in a small tree');
      assert.notEqual(mid, perchPosture(id, bout + 1, 1));
      assert.notEqual(small, perchPosture(id, bout + 1, 0));
    }
  }
  assert.equal(seen.size, 5, 'all five postures are taken');
  assert.ok(count.every(c => c > 0.08 * 2400), `none is rare (${count})`);
  // Individuals differ at one moment, and one individual's bouts come round at its own times.
  const at100 = new Set<number>();
  for (let id = 1; id <= 30; id++) at100.add(perchPosture(id, perchBout(id, 100), 2));
  assert.ok(at100.size >= 4, 'a crown of animals is not in one posture');
  assert.equal(perchBout(7, 10), perchBout(7, 10.5));
  assert.ok(perchBout(7, 10 + perchPeriod(7)) === perchBout(7, 10) + 1);
  assert.equal(perchPosture(3, 5, 0, PERCH.recline), PERCH.recline, 'the harness can force one');
  assert.ok(perchLies(PERCH.recline) && perchLies(PERCH.prone) && !perchLies(PERCH.hold) && !perchLies(PERCH.overhead) && !perchLies(PERCH.foot));
});

test('in every resting posture a hand or a foot is on a support', () => {
  const m = morphOf(24, 'male'), s = m.size;
  for (const seed of [0.2, 0.8]) for (const role of [PERCH.hold, PERCH.overhead, PERCH.foot, PERCH.recline, PERCH.prone]) {
    w.bind(pose).reset();
    CLIPS.perch(w, ctx({ role, seed, time: 12 }));
    assert.equal(pose.v[PI.ground], 0, 'drawn at its seat, not dropped onto a ground plane');
    solveFK(pose, m, fk, null);
    // The support under the animal runs along its Z axis through the seat (the limb, or the bough of the lying
    // postures): a hand or foot is on it when its joint is within 0.12 body lengths of that line near seat height.
    const onSupport = [B.handL, B.handR, B.footL, B.footR].some(b => { const p = at(b, s); return Math.abs(p[0]) <= 0.12 && p[1] > -0.03 && p[1] < 0.12; });
    // Or it grips a branch overhead, or one below the seat with the toes curled.
    const overhead = [B.handL, B.handR].some(b => at(b, s)[1] > 0.9) && (pose.v[B.fingL * 3] > 0.6 || pose.v[B.fingR * 3] > 0.6);
    assert.ok(onSupport || overhead, `posture ${role}, seed ${seed}: a hand or foot holds on`);
    if (role === PERCH.overhead) assert.ok(overhead, 'a hand grips overhead');
    // The plain seat by name: the holding hand (the left one for a seed of 0.5 or less) is on the limb with the fingers
    // closed; the other hand rests on its knee, off the limb.
    if (role === PERCH.hold) { const h = at(seed > 0.5 ? B.handR : B.handL, s); assert.ok(Math.abs(h[0]) <= 0.12 && h[1] > -0.03 && h[1] < 0.12 && pose.v[(seed > 0.5 ? B.fingR : B.fingL) * 3] > 0.6, `the holding hand is on the limb (${h.map(v => v.toFixed(2))})`); }
    if (role === PERCH.foot) assert.ok([B.footL, B.footR].some(b => at(b, s)[1] < -0.1) && (pose.v[B.toeL * 3] > 0.8 || pose.v[B.toeR * 3] > 0.8), 'a leg hangs with the toes curled round a branch below');
    // The lying postures lie: the trunk is level (hips pitched a quarter turn), the seated ones sit.
    const pitch = Math.abs(pose.v[B.hips * 3]);
    assert.equal(pitch > 1.3, perchLies(role));
  }
  // Role 0 is the plain seat the layer uses for an animal paused on its way: upright, both feet up on the limb.
  w.bind(pose).reset(); CLIPS.perch(w, ctx({ role: 0 })); solveFK(pose, m, fk, null);
  assert.ok(at(B.footL, s)[1] > 0 && at(B.footR, s)[1] > 0 && at(B.head, s)[1] > 0.5);
});

// ---- Crown feeding (poses.ts 'forage' in a tree) ----
/** The feeding pose of an individual at clip time T. */
function feed(seed: number, T: number, age = 24) { w.bind(pose).reset(); CLIPS.forage(w, ctx({ seed, time: T, t: T, age })); return pose.v; }
const PULL = 1.6, PICK = 2.1; // poses.ts FEED_PULL_S, FEED_PICK_S

test('crown feeding: a cluster in one hand, one to three picks from it with the other, then chewing; hands alternate', () => {
  for (const seed of [0.1, 0.45, 0.62, 0.93]) {
    const L = feedCycle(seed);
    assert.ok(L >= 11 && L <= 14);
    const counts = new Set<number>();
    for (let n = 3; n < 40; n++) {
      const picks = feedPicks(n, seed), hold = feedHold(n, seed);
      assert.ok(picks >= 1 && picks <= 3);
      counts.add(picks);
      assert.notEqual(hold, feedHold(n + 1, seed), 'the holding hand changes every cycle');
      // In the middle of the first pick the holding hand has the cluster and the other hand the fruit.
      feed(seed, n * L + PULL + 0.5 * PICK);
      assert.equal(hold ? pose.propR : pose.propL, PROP.leaves, 'the free hand holds a leaf-and-fruit cluster');
      assert.equal(hold ? pose.propL : pose.propR, PROP.fruit, 'the other hand has plucked from it');
      // Chewing: at least 3 s between the last pick and the next cycle, with the jaw working and both hands empty at the end.
      const chew = L - PULL - picks * PICK;
      assert.ok(chew >= 3 && chew <= 10.5, `chewing lasts ${chew.toFixed(1)} s`);
      let open = 0, shut = 1;
      for (let k = 0; k < 20; k++) { const v = feed(seed, n * L + PULL + picks * PICK + 1.2 + k * 0.05); open = Math.max(open, v[PI.mouth]); shut = Math.min(shut, v[PI.mouth]); }
      assert.ok(open - shut > 0.08, 'the jaw works while chewing');
      feed(seed, n * L + PULL + picks * PICK + 1.5);
      assert.ok(pose.propL === 0 && pose.propR === 0, 'nothing in the hands once it only chews');
    }
    assert.ok(counts.size >= 2, 'the number of picks varies from cycle to cycle');
    // The pick point on the cluster differs between picks of one cycle and between cycles.
    const pts = new Set<string>();
    for (let n = 3; n < 9; n++) for (let j = 0; j < feedPicks(n, seed); j++) { const v = feed(seed, n * L + PULL + (j + 0.28) * PICK), o = PI.ik + (feedHold(n, seed) ? 0 : 1) * 5; pts.add(`${Math.abs(v[o]).toFixed(3)},${v[o + 1].toFixed(3)}`); }
    assert.ok(pts.size >= 4, 'the picks land on different points');
  }
});

test('crown feeding: the hand reaches the mouth with the elbow below the shoulder, at every age and on both sides', () => {
  for (const [age, sex] of [[24, 'male'], [21, 'female'], [8, 'male'], [2, 'female']] as const) {
    const m = morphOf(age, sex), s = m.size;
    for (const seed of [0.3, 0.7]) for (const n of [4, 5]) {
      const L = feedCycle(seed), pick = feedHold(n, seed) ? 0 : 1;
      let worst = -Infinity, sawMouth = false;
      // The whole pick, in 30 ms steps: the elbow never rises above the shoulder; at the mouth the fingers are at the lips.
      for (let t = 0; t <= PICK; t += 0.03) {
        const v = feed(seed, n * L + PULL + t, age);
        solveFK(pose, m, fk, null);
        const shoulder = at(pick ? B.uarmR : B.uarmL, s), elbow = at(pick ? B.farmR : B.farmL, s);
        worst = Math.max(worst, elbow[1] - shoulder[1]);
        if (v[PI.ik + pick * 5 + 3] < 1e-3) {   // the arm is on its joint angles alone: the hand is at the mouth
          sawMouth = true;
          const gap = dist(at(pick ? B.fingR : B.fingL, s), at(B.lipL, s));
          assert.ok(gap < 0.06, `fingers ${gap.toFixed(3)} body lengths from the lower lip (age ${age}, seed ${seed}, cycle ${n})`);
          assert.ok(shoulder[1] - elbow[1] > 0.2, `elbow ${(shoulder[1] - elbow[1]).toFixed(2)} below the shoulder at the mouth`);
        }
      }
      assert.ok(sawMouth, 'the pick reaches the mouth');
      assert.ok(worst < 0, `the picking elbow stays below the shoulder all through the pick (highest ${worst.toFixed(3)})`);
    }
  }
  // On the ground the old loop is untouched (and still lifts the elbow: the rig change is deferred).
  w.bind(pose).reset(); CLIPS.forage(w, ctx({ inTree: false, t: 2 }));
  assert.equal(pose.v[PI.ground], 1);
});

// Stage W11 (docs/staging/w11-polish.md), item 8. The arm's angles at the mouth were solved for the head as the clip
// tips it; the look system could turn the head away meanwhile, and the hand then met the cheek.
test('crown feeding: the head is held while a hand is at the mouth, whatever the look system wants', () => {
  assert.equal(headLook(0.4, 0.9), 0.9); assert.equal(headLook(0.7, 0.2), 0.7); assert.equal(headLook(0, 0.5), 0.5);
  assert.equal(headLook(-1, 0.9), 0); assert.ok(Math.abs(headLook(-0.5, 0.8) - 0.4) < 1e-12); assert.equal(headLook(-3, 1), 0);
  const look = new Float32Array(3);
  let worstHeld = 0, worstFree = 0;
  for (const [age, sex] of [[24, 'male'], [8, 'male']] as const) {
    const m = morphOf(age, sex), s = m.size;
    for (const seed of [0.3, 0.7]) for (const side of [-1, 1]) {
      const n = 4, L = feedCycle(seed), pick = feedHold(n, seed) ? 0 : 1;
      for (let t = 0; t <= PICK; t += 0.03) {
        const v = feed(seed, n * L + PULL + t, age);
        const atMouth = v[PI.ik + pick * 5 + 3] < 1e-3;
        // The clip's own request: nothing outside a pick's way to the mouth, the whole head at the mouth.
        assert.ok(v[PI.look] <= 0 && v[PI.look] >= -1);
        if (atMouth) assert.ok(v[PI.look] < -0.999, 'at the mouth the clip holds the head wholly');
        if (!atMouth) continue;
        // A look point far out to one side at eye height, at full weight: as the layer does it (headLook), then as it was (the larger of the two).
        look[0] = side * 5 * s; look[1] = 0.8 * s; look[2] = 1 * s;
        const clip = v[PI.look];
        v[PI.look] = headLook(clip, 1); solveFK(pose, m, fk, look);
        worstHeld = Math.max(worstHeld, dist(at(pick ? B.fingR : B.fingL, s), at(B.lipL, s)));
        v[PI.look] = Math.max(clip, 1); solveFK(pose, m, fk, look);
        worstFree = Math.max(worstFree, dist(at(pick ? B.fingR : B.fingL, s), at(B.lipL, s)));
        v[PI.look] = clip;
      }
    }
  }
  assert.ok(worstHeld < 0.06, `held: fingers at most ${worstHeld.toFixed(3)} body lengths from the lower lip`);
  assert.ok(worstFree > 2 * worstHeld, `as it was, a head turned by a gaze left them ${worstFree.toFixed(3)} away`);
  // Chewing and reaching leave the head to the look system.
  const chew = feed(0.3, 4 * feedCycle(0.3) + PULL + 3 * PICK + 1, 24);
  assert.equal(chew[PI.look], 0);
});

// ---- A partner with an infant on its body (poses.ts groomerRole) ----
test('a partner carrying an infant is groomed where the infant is not', () => {
  assert.equal(groomerRole(false, false, false), 0, 'one-way grooming is done from behind');
  assert.equal(groomerRole(false, false, true), 0, 'an infant on the belly is in front: the back is free');
  assert.equal(groomerRole(false, true, false), GROOM_FRONT, 'an infant on the back: the partner turns and its front is worked on');
  assert.equal(groomerRole(true, false, false), 1);
  assert.equal(groomerRole(true, true, false), 1, 'face to face, an infant on the back is out of the way');
  assert.equal(groomerRole(true, false, true), GROOM_HIGH, 'face to face, an infant on the belly is between the two');
  // Faced with an infant between them, the hands stay at the partner's shoulders and head, above the infant: a seated
  // partner 0.8 body lengths ahead, known by its root.
  let low = 9, lowMutual = 9;
  for (let i = 0; i < 400; i++) {
    const c = ctx({ inTree: false, hasTarget: true, tz: 0.8, tdist: 0.8, pairT: 50 + i * 0.1, t: i * 0.1, time: i * 0.1 });
    w.bind(pose).reset(); CLIPS.groom(w, { ...c, role: GROOM_HIGH }); low = Math.min(low, pose.v[PI.ik + 1], pose.v[PI.ik + 6]);
    w.bind(pose).reset(); CLIPS.groom(w, { ...c, role: 1 }); lowMutual = Math.min(lowMutual, pose.v[PI.ik + 1], pose.v[PI.ik + 6]);
  }
  assert.ok(low > 0.42, `the hands stay high (${low.toFixed(2)})`);
  assert.ok(lowMutual < low - 0.05, 'lower than that in ordinary mutual grooming');
});

// ---- Crown variants of other acts ----
test('sheltering, alarm and nursing have crown variants; their ground poses are untouched', () => {
  for (const clip of ['shelter', 'alarm', 'nurse']) {
    w.bind(pose).reset(); CLIPS[clip](w, ctx({ inTree: false, t: 1, time: 1 }));
    const ground = Float32Array.from(pose.v);
    assert.equal(ground[PI.ground], 1);
    w.bind(pose).reset(); CLIPS[clip](w, ctx({ inTree: true, t: 1, time: 1 }));
    assert.equal(pose.v[PI.ground], 0, `${clip}: on its branch`);
    assert.ok(pose.v[B.toeL * 3] > 0.5 && pose.v[B.toeR * 3] > 0.5, `${clip}: the feet grip`);
  }
  // Alarm in a crown: a hand holds on overhead.
  w.bind(pose).reset(); CLIPS.alarm(w, ctx({ inTree: true }));
  assert.ok(pose.v[PI.ik + 1] > 1.2 && pose.v[PI.ik + 3] === 1 && pose.v[B.fingL * 3] > 0.6);
});

// Stage W11 (docs/staging/w11-polish.md), item 5. The nest builder's turns, and why one heading target matters.
test('a nest builder faces five ways in turn, 1.9 rad apart, and one heading target does not depend on the frame time', () => {
  assert.equal(NEST_TURNS, 5); assert.equal(NEST_TURN_RAD, 1.9);
  const seen: number[] = [];
  for (let k = 0; k < 1; k += 0.001) { const t = nestTurn(k); if (seen[seen.length - 1] !== t) seen.push(t); }
  assert.equal(seen.length, 5, 'five headings');
  for (let i = 1; i < seen.length; i++) assert.ok(Math.abs(seen[i] - seen[i - 1] - 1.9) < 1e-12, 'each 1.9 rad on from the last');
  assert.equal(nestTurn(0), 0); assert.equal(nestTurn(1), 0, 'done: it lies down facing as it sat at first'); assert.equal(nestTurn(-0.1), 0);
  // The two pulls on a nesting animal's heading, as the layer applies them each frame: the motion step toward its
  // target at 4.5 a second of frame time, then the placement toward its own at 3 a second over a fixed thirtieth.
  // With two targets (the simulated heading and the turn) the heading settles between them at a point that moves with
  // the frame time, so uneven frames make it tremble and a turn of 1.9 rad comes out short. With one it sits still.
  const settle = (motionTarget: number, placeTarget: number, frames: number[]) => {
    let h = placeTarget, travel = 0, last = h;
    for (let i = 0; i < 600; i++) { const dt = frames[i % frames.length]; h = dampAngle(h, motionTarget, 4.5, dt); h = dampAngle(h, placeTarget, 3, 1 / 30); if (i >= 300) travel += Math.abs(h - last); last = h; }
    return { h, travel };
  };
  const even = [1 / 60], uneven = [1 / 60, 1 / 60, 1 / 60 + 0.035];
  const sim = 0.4, turn = 0.4 + 1.9;
  const two = settle(sim, turn, uneven), twoEven = settle(sim, turn, even), one = settle(turn, turn, uneven);
  assert.ok(two.travel > 1, `two targets, uneven frames: ${two.travel.toFixed(2)} rad of travel in 300 frames`);
  assert.ok(Math.abs(twoEven.h - turn) > 0.5, `two targets: it stops ${Math.abs(twoEven.h - turn).toFixed(2)} rad short of the turn`);
  assert.ok(one.travel < 1e-9 && Math.abs(one.h - turn) < 1e-9, 'one target: at the turn, and still');
});

// Stage W11, item 2. A pair is a pair for as long as the two drawn bodies are within reach of each other.
test('a pair is formed from the drawn bodies: a partner the simulation has already sent down its trunk is still within reach while its body sits there', () => {
  assert.equal(PAIR_REACH_M, 4.5); assert.equal(PAIR_HEIGHT_M, 1.5);
  // Two bodies on one bough, 1.2 m apart at one height.
  assert.ok(pairReach(0, 15, 0, 1.2, 15, 0));
  // The reach: 4.5 m in the plane whatever the height in between, 1.5 m in height.
  assert.ok(pairReach(0, 15, 0, 4.5, 15, 0)); assert.ok(!pairReach(0, 15, 0, 4.6, 15, 0));
  assert.ok(pairReach(0, 15, 0, 0.5, 13.5, 0)); assert.ok(!pairReach(0, 15, 0, 0.5, 13.4, 0)); assert.ok(pairReach(0, 13.6, 0, 0.5, 15, 0));
  assert.ok(pairReach(3, 0, 3.3, 0, 0, 0)); assert.ok(!pairReach(3.3, 0, 3.3, 0, 0, 0));
  // The case filmed: the leaving partner's simulated position is two ticks ahead of its drawn body, 3.8 m and then
  // 7.6 m down the trunk, while its drawn path is still at the bough. Asked with the simulated positions the pair was
  // gone; asked with the drawn paths it holds until the body itself has gone 1.5 m down.
  const stays = [0, 15.1, 0], drawn = [1.2, 15.1, 0];
  for (const simY of [11.3, 7.5]) assert.ok(!pairReach(stays[0], stays[1], stays[2], 1.2, simY, 0), 'by the simulated position: apart');
  assert.ok(pairReach(stays[0], stays[1], stays[2], drawn[0], drawn[1], drawn[2]), 'by the drawn bodies: together');
  assert.ok(!pairReach(stays[0], stays[1], stays[2], drawn[0], drawn[1] - 1.6, drawn[2]), 'and apart once the body is on its way down');
});

// Stage W11, item 1. A place in a tree that changes (a pairing ends, the body goes to the trunk) is reached at a
// clamber's speed, never in one frame.
test('a body in a tree goes to its place no faster than a clamber, plus what its own path moves', () => {
  assert.equal(CLAMBER_MPS, 2.5); assert.ok(CLAMBER_OFF_M < CLAMBER_ON_M); assert.ok(CROWN_JUMP_M > SEAT_REACH_M);
  assert.equal(clamberSpeed(1), 2.5); assert.equal(clamberSpeed(4), 2.5); assert.equal(clamberSpeed(60), 37.5);
  /** Frames and the largest step of a body going `dist` metres to a place that stands still. */
  const go = (dist: number, dts: number[], rate: number) => { let left = dist, frames = 0, worst = 0; while (left > 1e-9 && frames < 100000) { const dt = dts[frames % dts.length], k = crownStep(left, dt, rate, 0), step = left * k; worst = Math.max(worst, step); left -= step; frames++; } return { frames, worst }; };
  // The filmed case: 7.8 m across a crown. At 60 frames a second it takes 3.1 s and no frame moves it more than 4.2 cm;
  // with frames of a tenth of a second (the longest step the layer takes) no frame moves it more than 25 cm.
  const a = go(7.8, [1 / 60], 4), b = go(7.8, [0.1], 1), c = go(7.8, [1 / 60, 1 / 60, 1 / 60 + 0.035], 4);
  assert.ok(Math.abs(a.frames / 60 - 7.8 / 2.5) < 0.05 && a.worst < 0.042, `60 Hz: ${(a.frames / 60).toFixed(2)} s, largest step ${a.worst.toFixed(3)} m`);
  assert.ok(b.worst <= 0.25 + 1e-12 && c.worst < 0.13);
  // A place within one frame's reach is taken exactly: a body at its seat is exactly there.
  assert.equal(crownStep(0.03, 1 / 60, 1, 0), 1); assert.equal(crownStep(0, 1 / 60, 1, 0), 1);
  // What its own drawn path moved in the frame comes on top: a body is never held back from its path. Going down a
  // trunk at 1 min/s (half a metre a frame) with the bark 5 m from its seat, it gains on the bark every frame.
  assert.ok(Math.abs(crownStep(5, 1 / 60, 4, 0.5) * 5 - (2.5 / 60 + 0.5)) < 1e-12);
  assert.ok(crownStep(5, 1 / 60, 60, 0.5) * 5 > 0.5 + 0.6);
  // At 1 min/s the move takes the simulated time it takes at Watch 4x (15 times fewer real seconds).
  assert.ok(Math.abs(go(7.8, [1 / 60], 60).frames * 15 - a.frames) <= 15);
  // Clambering starts beyond a metre and ends within 30 cm, so a body does not flicker in and out of the clip.
  assert.ok(!clambering(false, 0.9)); assert.ok(clambering(false, 1.1)); assert.ok(clambering(true, 0.5)); assert.ok(!clambering(true, 0.25));
});

// Stage W11, item 7. The bough reads as a limb of its tree, and the cluster as a spray held clear of an infant.
test('a bough is joined to its tree: its fork lies in a drawn limb, or a stem comes from the nearest limb, or from the bark', () => {
  const out = new Float64Array(4), r = 0.1;
  // The fork lies in the host's own limb (its axis 8 cm away, the limb 12 cm thick): the halves grow out of it, no stem.
  assert.equal(boughStem(3, 15, 0, r, true, 3, 14.92, 0, 0.12, 0, 0, 0.5, out), 0);
  // A limb half a metre below the fork: the stem begins on its axis, no thicker than the limb.
  assert.equal(boughStem(3, 15, 0, r, true, 3, 14.5, 0.1, 0.12, 0, 0, 0.5, out), 1);
  assert.deepEqual([out[0], out[1], out[2]], [3, 14.5, 0.1]); assert.ok(out[3] <= 0.12 && out[3] >= r);
  // No limb in reach (the nearest is further than STEM_REACH_M), or none drawn at all: the stem leaves the bark, on the
  // fork's side of the trunk, lower than the fork, and never from inside the trunk's axis or outside its bark.
  for (const limb of [true, false]) {
    assert.equal(boughStem(3, 15, 0, r, limb, 3, 15 - STEM_REACH_M - 0.5, 0, 0.12, 0, 0, 0.5, out), 2);
    const fromAxis = Math.hypot(out[0], out[2]);
    assert.ok(fromAxis > 0.3 && fromAxis <= 0.5, `it begins in the bark (${fromAxis.toFixed(2)} m from the axis of a trunk 0.5 m thick)`);
    assert.ok(out[0] > 0 && Math.abs(out[2]) < 1e-9, 'on the side the fork is on');
    assert.ok(out[1] < 15 && out[1] >= 15 - 1.2, 'and rises to the fork');
    assert.ok(out[3] <= 0.3, 'no thicker than the trunk allows');
  }
  // A fork on the trunk's axis (never laid, but it must not divide by nothing).
  assert.equal(boughStem(0, 15, 0, r, false, 0, 0, 0, 0, 0, 0, 0.5, out), 2); assert.ok([...out].every(Number.isFinite));
  assert.ok(LIMB_TIP > 0.4 && LIMB_TIP < 0.8, 'the branch prop tapers');
});

test('the cluster is a small leafy spray, and an animal with an infant on its belly holds it beside the infant', () => {
  // The spray: within 16 by 16 by 16 cm for a body length of 1 m (the block it replaces was 26 by 16 by 20 cm and solid),
  // a twig with five two-sided blades.
  const g = leafSprayGeometry(); g.computeBoundingBox();
  const b = g.boundingBox!, size = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  assert.ok(size.every(d => d > 0.08 && d <= 0.16), `spray ${size.map(d => d.toFixed(3)).join(' x ')} m`);
  assert.ok(size[0] * size[1] * size[2] < 0.5 * 0.26 * 0.16 * 0.2, 'under half the block\'s box');
  assert.equal(g.getAttribute('position').count, (3 + 5 * 8) * 3, 'a three-sided twig and five blades of four facets, both faces');
  assert.ok(b.max.y > 0 && b.min.y < -0.1, 'the hand holds it near the top of the twig');
  g.dispose();
  // The holding hand: 0.11 body lengths from the mid-line without an infant (in front of the chest), 0.3 with one.
  for (const seed of [0.3, 0.7]) for (const n of [4, 5]) {
    const L = feedCycle(seed), hold = feedHold(n, seed), m = morphOf(21, 'female');
    for (let u = PULL; u < PULL + 2; u += 0.1) {
      for (const bears of [0, 1, 2]) {
        w.bind(pose).reset(); CLIPS.forage(w, ctx({ seed, time: n * L + u, t: n * L + u, age: 21, male: false, bears }));
        solveFK(pose, m, fk, null);
        const hand = at(hold ? B.handR : B.handL, m.size), side = hold ? -1 : 1;
        if (bears & 1) { assert.ok(hand[0] * side > 0.27, `beside the infant: ${(hand[0] * side).toFixed(2)} from the mid-line`); assert.ok(hand[1] > 0.45, 'and no lower than its back'); }
        else assert.ok(Math.abs(hand[0] * side - 0.11) < 0.03, `in front of the chest: ${(hand[0] * side).toFixed(2)}`);
      }
    }
  }
  assert.deepEqual([...FEED_HOLD_INFANT], [0.3, 0.5, 0.36]);
});
