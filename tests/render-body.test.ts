// Stage W3 (five defects of the body): mesh and pose checks at every mesh level. The eye paint itself is fragment
// shader code; what is checked here is that the region it paints is the nearest surface over the iris at every
// level and age, and that the per-vertex eye mask could never have done the job.
import assert from 'node:assert/strict';
import test from 'node:test';
import type { BufferGeometry } from 'three';
import type { Chimp } from '../src/types';
import { EAR, EYE, buildChimpGeometry } from '../src/render/creatures/body';
import { EYE_FRONT, EYE_RIM } from '../src/render/creatures/material';
import { CLIPS, Pw, type PoseCtx } from '../src/render/creatures/poses';
import { B, BIND, BONE_COUNT, OFFSET, PARENT, PI, bonePoint, computeMorph, createFK, createMorph, createPose, lowestPoint, solveFK } from '../src/render/creatures/rig';

// The levels the creature layer builds (creatures.ts LOD_RES, the coarse level and the shadow and x-ray proxy).
const LEVELS: [name: string, spacing: number, lo: boolean][] = [['hero', 0.009, false], ['fine', 0.0125, false], ['mid', 0.019, true], ['coarse', 0.033, true], ['proxy', 0.045, true]];
const built = new Map<string, BufferGeometry>();
const mesh = (name: string) => {
  let g = built.get(name);
  if (!g) { const [, h, lo] = LEVELS.find(l => l[0] === name)!; g = buildChimpGeometry(h, lo).geometry; built.set(name, g); }
  return { pos: g.getAttribute('position').array as Float32Array, nrm: g.getAttribute('normal').array as Float32Array, index: g.getIndex()!.array as ArrayLike<number>, regA: g.getAttribute('aRegA').array as Float32Array, regB: g.getAttribute('aRegB').array as Float32Array, si: g.getAttribute('aSkinIndex').array as Float32Array, sw: g.getAttribute('aSkinWeight').array as Float32Array };
};

test('every mesh level is closed and wound one way: no triangle faces inward', () => {
  for (const [name] of LEVELS) {
    const { pos, index } = mesh(name);
    // Each directed edge is matched by the same number of opposite ones (a closed surface with one winding), and the
    // enclosed volume is positive (that winding is outward).
    const edges = new Map<number, number>();
    const n = pos.length / 3;
    let volume = 0;
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t], b = index[t + 1], c = index[t + 2];
      for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u * n + v : v * n + u; edges.set(k, (edges.get(k) ?? 0) + (u < v ? 1 : -1)); }
      volume += (pos[a * 3] * (pos[b * 3 + 1] * pos[c * 3 + 2] - pos[b * 3 + 2] * pos[c * 3 + 1]) - pos[a * 3 + 1] * (pos[b * 3] * pos[c * 3 + 2] - pos[b * 3 + 2] * pos[c * 3]) + pos[a * 3 + 2] * (pos[b * 3] * pos[c * 3 + 1] - pos[b * 3 + 1] * pos[c * 3])) / 6;
    }
    let unmatched = 0;
    for (const v of edges.values()) if (v !== 0) unmatched++;
    assert.equal(unmatched, 0, `${name}: edges without an opposite partner`);
    assert.ok(volume > 0.02 && volume < 0.06, `${name}: body volume ${volume.toFixed(4)} m3`);
  }
});

test('ear: no line of sight onto the outer face sees into the mesh, and the plate is whole on the three near levels', () => {
  const ax = [Math.cos(EAR.rotY), 0, -Math.sin(EAR.rotY)], az = [Math.sin(EAR.rotY), 0, Math.cos(EAR.rotY)]; // plate-local x and z in bind space
  for (const [name, , lo] of LEVELS) {
    const { pos, index } = mesh(name);
    let inward = 0, absent = 0, rays = 0;
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      if ((i / 4) ** 2 + (j / 4) ** 2 > 1) continue;
      const u = i / 4 * 0.7 * EAR.r[1], v = j / 4 * 0.7 * EAR.r[2];
      const o = [EAR.c[0] + ax[0] * 0.04 + az[0] * v, EAR.c[1] + u, EAR.c[2] + ax[2] * 0.04 + az[2] * v], d = [-ax[0], 0, -ax[2]];
      // Nearest triangle on the ray (Möller–Trumbore) and whether it faces the viewer.
      let best = Infinity, facing = true;
      for (let t = 0; t < index.length; t += 3) {
        const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
        if (pos[a + 1] < 1.08 || pos[a + 1] > 1.21) continue;
        const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]], e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
        const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
        const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
        if (Math.abs(det) < 1e-14) continue;
        const tv = [o[0] - pos[a], o[1] - pos[a + 1], o[2] - pos[a + 2]];
        const bu = (tv[0] * p[0] + tv[1] * p[1] + tv[2] * p[2]) / det;
        if (bu < 0 || bu > 1) continue;
        const q = [tv[1] * e1[2] - tv[2] * e1[1], tv[2] * e1[0] - tv[0] * e1[2], tv[0] * e1[1] - tv[1] * e1[0]];
        const bv = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
        if (bv < 0 || bu + bv > 1) continue;
        const tt = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
        if (tt > 0 && tt < best) { best = tt; facing = (e1[1] * e2[2] - e1[2] * e2[1]) * d[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * d[1] + (e1[0] * e2[1] - e1[1] * e2[0]) * d[2] < 0; }
      }
      rays++;
      if (best < 1 && !facing) inward++;
      else if (best > 0.04 + EAR.r[0] * (lo ? 1.45 : 1)) absent++; // nothing within the plate: the ear is missing here
    }
    assert.equal(rays, 49);
    assert.equal(inward, 0, `${name}: lines of sight that meet an inward-facing triangle first`);
    if (name === 'hero' || name === 'fine' || name === 'mid') assert.equal(absent, 0, `${name}: lines of sight that meet no ear`);
  }
});

/** Bind-pose skinning with a morph (identity rotations), as the vertex shader does it; returns skinned positions and joints. */
function skinned(m: ReturnType<typeof createMorph>, pos: Float32Array, si: Float32Array, sw: Float32Array) {
  const jp = new Float32Array(BONE_COUNT * 3);
  for (let b = 0; b < BONE_COUNT; b++) { const p = PARENT[b]; for (let k = 0; k < 3; k++) jp[b * 3 + k] = p < 0 ? BIND[b * 3 + k] : jp[p * 3 + k] + OFFSET[b * 3 + k] * m.len[p]; }
  const sp = new Float32Array(pos.length);
  for (let v = 0; v < pos.length / 3; v++) for (let s = 0; s < 4; s++) { const b = si[v * 4 + s], w = sw[v * 4 + s]; if (!w) continue; for (let k = 0; k < 3; k++) sp[v * 3 + k] += w * (jp[b * 3 + k] + m.scale[b * 3 + k] * (pos[v * 3 + k] - BIND[b * 3 + k])); }
  return { sp, jp };
}

test('eye: the paint region (the eyeball sphere in bind space) is the nearest surface over most of the iris, at every age and level', () => {
  const young = (age: number, sex: 'male' | 'female') => ({ age, sex, appearance: { fur: 0.5, face: 0.5, build: 0.5, brow: 0.5, ears: 0.5 } }) as unknown as Chimp;
  const cover: string[] = [];
  for (const name of ['hero', 'fine', 'mid', 'coarse']) {
    const { pos, index, regA, si, sw } = mesh(name);
    // The old gate: the per-vertex eye mask, a weight-normalised mean that never reaches one half on the eyeball.
    let maxMask = 0;
    for (let v = 0; v < pos.length / 3; v++) maxMask = Math.max(maxMask, regA[v * 4 + 1]);
    assert.ok(maxMask < 0.5, `${name}: vertex eye mask peaks at ${maxMask.toFixed(2)}`);
    for (const [age, sex] of [[0.3, 'female'], [2, 'male'], [7, 'male'], [25, 'male']] as const) {
      const m = createMorph(); computeMorph(young(age, sex), m);
      const { sp, jp } = skinned(m, pos, si, sw);
      // Front view of the left eye: a small z-buffer in the head's scaled frame, 16 px to the eyeball radius.
      const hs = m.scale[B.head * 3];
      const ec = [0, 1, 2].map(k => jp[B.head * 3 + k] + m.scale[B.head * 3 + k] * (EYE.c[k] - BIND[B.head * 3 + k]));
      const N = 48, px = EYE.r * hs / 16;
      const zb = new Float32Array(N * N).fill(-1e9), painted = new Uint8Array(N * N);
      for (let t = 0; t < index.length; t += 3) {
        const a = index[t], b = index[t + 1], c = index[t + 2];
        const ax = (sp[a * 3] - ec[0]) / px + N / 2, ay = (sp[a * 3 + 1] - ec[1]) / px + N / 2, bx = (sp[b * 3] - ec[0]) / px + N / 2, by = (sp[b * 3 + 1] - ec[1]) / px + N / 2, cx = (sp[c * 3] - ec[0]) / px + N / 2, cy = (sp[c * 3 + 1] - ec[1]) / px + N / 2;
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(N - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(N - 1, Math.ceil(Math.max(ay, by, cy)));
        if (x0 > x1 || y0 > y1) continue;
        const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        if (Math.abs(den) < 1e-12) continue;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const u = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / den, v = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / den, w = 1 - u - v;
          if (u < 0 || v < 0 || w < 0) continue;
          const z = u * sp[a * 3 + 2] + v * sp[b * 3 + 2] + w * sp[c * 3 + 2];
          if (z <= zb[y * N + x]) continue;
          zb[y * N + x] = z;
          // The material's gate at this fragment (material.ts): inside the eyeball sphere in bind space plus half its
          // rim, the rim being deeper straight in front of the iris.
          const bx0 = u * pos[a * 3] + v * pos[b * 3] + w * pos[c * 3], by0 = u * pos[a * 3 + 1] + v * pos[b * 3 + 1] + w * pos[c * 3 + 1], bz0 = u * pos[a * 3 + 2] + v * pos[b * 3 + 2] + w * pos[c * 3 + 2];
          const ex = Math.abs(bx0) - EYE.c[0], ey = by0 - EYE.c[1], rho = Math.hypot(ex, ey), k = Math.max(0, Math.min(1, (rho - EYE_FRONT[1]) / (EYE_FRONT[2] - EYE_FRONT[1])));
          painted[y * N + x] = Math.hypot(ex, ey, bz0 - EYE.c[2]) < EYE.r + EYE_FRONT[0] * (1 - k * k * (3 - 2 * k)) + (EYE_RIM[0] + EYE_RIM[1]) / 2 ? 1 : 0;
        }
      }
      let disc = 0, on = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) > 12.6) continue; disc++; on += painted[y * N + x]; } // iris radius 0.0098 of 0.0124
      cover.push(`${name} ${age}: ${(on / disc * 100).toFixed(0)}%`);
      // Measured (W3_PRINT=1 prints them): 97 to 99% on the hero and fine levels, 71 to 80% on the mid level and 56 to
      // 60% on the coarse one, where the thickened brow covers the top of the thickened eyeball.
      const least = name === 'hero' || name === 'fine' ? 0.9 : name === 'mid' ? 0.6 : 0.45;
      assert.ok(on / disc > least, `${name}, ${age} y: ${(on / disc * 100).toFixed(0)}% of the iris disc is eye paint`);
    }
  }
  if (process.env.W3_PRINT) console.log(cover.join(', '));
});

test('swelling faces backward at hip height and the tail tuft sits above it, in the knuckle-walking stance', () => {
  const th = 1.1, c = Math.cos(th), s = Math.sin(th); // hips pitch of poses.ts quadStance
  const J = [BIND[B.hips * 3], BIND[B.hips * 3 + 1], BIND[B.hips * 3 + 2]];
  for (const name of ['hero', 'fine', 'mid']) {
    const { pos, nrm, regA, regB } = mesh(name);
    const centre = (arr: Float32Array, k: number) => {
      let sw = 0, cy = 0, cz = 0, ny = 0, nz = 0;
      for (let v = 0; v < pos.length / 3; v++) { const w = arr[v * 4 + k]; if (w < 0.5) continue; sw += w; cy += pos[v * 3 + 1] * w; cz += pos[v * 3 + 2] * w; ny += nrm[v * 3 + 1] * w; nz += nrm[v * 3 + 2] * w; }
      const dy = cy / sw - J[1], dz = cz / sw - J[2];
      return { n: sw, above: dy * c - dz * s, behind: -(dy * s + dz * c), up: (ny * c - nz * s) / sw, back: -(ny * s + nz * c) / sw };
    };
    const swell = centre(regA, 3), tuft = centre(regB, 0);
    assert.ok(swell.n > 10 && tuft.n > 4, `${name}: masks have vertices`);
    assert.ok(Math.abs(swell.above) < 0.04, `${name}: swelling ${swell.above.toFixed(3)} m above the hip joint`); // it was 0.088 above: on the back
    assert.ok(swell.behind > 0.09 && swell.back > 0.85 && swell.up < 0.3, `${name}: swelling behind ${swell.behind.toFixed(3)}, faces back ${swell.back.toFixed(2)}`);
    assert.ok(tuft.above > swell.above + 0.03 && tuft.above < 0.09, `${name}: tuft ${tuft.above.toFixed(3)} m above the hip joint`); // it was 0.112, facing up
    assert.ok(tuft.behind > 0.08 && tuft.back > 0.7, `${name}: tuft behind ${tuft.behind.toFixed(3)}, faces back ${tuft.back.toFixed(2)}`);
  }
});

test('knuckle-walking hand: the middle finger segment lies level and the wrist keeps the height it had', () => {
  const ctx = (over: Partial<PoseCtx>): PoseCtx => ({ t: 0, time: 0, phase: 0, speedU: 0, freq: 0, seed: 0.3, stage: 'adult', male: true, age: 24, injury: 0, mood: 'calm', energy: 1, vocal: null, hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: false, wet: 0, stride: 0, lp: 0.6, lapse: 0, pb: new Float32Array(15), hasBones: false, pairT: 0, side: 1, ...over });
  const m = createMorph(), fk = createFK(), pose = createPose(), w = new Pw().bind(pose), T = new Float32Array(3);
  const read = (clip: string, over: Partial<PoseCtx> = {}) => {
    w.reset(); CLIPS[clip](w, ctx(over));
    solveFK(pose, m, fk);
    const lift = -lowestPoint(fk, m) * pose.v[PI.ground];
    bonePoint(fk, m, B.fingL2, 0, -0.043, -0.002, T); // tip of the middle and end segment (its bind offset from the finger joint)
    const jy = fk.p[B.fingL2 * 3 + 1], jz = fk.p[B.fingL2 * 3 + 2];
    return { lift, wrist: fk.p[B.handL * 3 + 1] + lift, joint: jy + lift, slope: Math.atan2(T[1] - jy, Math.abs(T[2] - jz)) * 180 / Math.PI, tipBehind: jz - T[2] };
  };
  const stand = read('stand');
  // Unit space, adult male of size 1. Before W3 (commit dea2643): lift 0.028404, wrist 0.158404, slope +23.9 degrees
  // (the hand stood on one joint with the segment pointing up and back).
  assert.ok(Math.abs(stand.lift - 0.028404) < 5e-6, `ground snap ${stand.lift}`);
  assert.ok(Math.abs(stand.wrist - 0.158404) < 5e-6, `wrist height ${stand.wrist}`);
  assert.ok(stand.slope < 0 && stand.slope > -3, `middle segment slope ${stand.slope.toFixed(2)} degrees`);
  assert.ok(stand.tipBehind > 0.04, 'the segment points back, under the wrist');
  // The walk plants the same hand: a stance limb's wrist height is the standing one.
  const walk = read('walk', { phase: 0.1, speedU: 0.8, stride: 0.55, freq: 1.45 });
  assert.ok(Math.abs(walk.joint - stand.joint) < 0.02, 'walk keeps the finger joint near the ground');
});
