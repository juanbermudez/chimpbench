// Interaction and vocal FX, kept tasteful: expanding sound rings patterned per
// call type, dust/leaf bursts and impact flashes for fights and displays, a
// slow red danger pulse for intergroup encounters and killings, a gold crown
// flare for alpha takeovers, soft light links for grooming/consolation and
// motion streaks behind chases. All timing is in real seconds so effects stay
// readable at any simulation speed.
import * as THREE from 'three';
import type { CallKind, Interaction, World } from '../../types';
import type { Anim, CreatureContext, CreatureFrame } from '../creatures';
import { clamp } from './util';

const MAX_RINGS = 192;
const MAX_PARTICLES = 1600;
const MAX_LINKS = 64;
const LINK_SEG = 12;
const TRAIL_LEN = 14;
const MAX_TRAILS = 40;

interface RingSpec { x: number; y: number; z: number; r0: number; r1: number; life: number; thick: number; alpha: number; color: THREE.Color; jag: number; fill: number; follow: number; }
interface Ring extends RingSpec { start: number; }
interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; age: number; size: number; grow: number; r: number; g: number; b: number; a: number; drag: number; grav: number; flutter: number; }

const C = (hex: string) => new THREE.Color(hex);
const COL = {
  hoot: C('#ffe3a3'), hootPeak: C('#fff1cf'), scream: C('#ff5646'), grunt: C('#d6e4ff'), laugh: C('#ffc477'), alarm: C('#9eeeff'),
  bark: C('#ffa057'), drum: C('#e2b77c'), whimper: C('#b9c9ff'), food: C('#dbf08c'), danger: C('#ff3b2f'), kill: C('#c4121c'), gold: C('#ffd060'),
};

export function createFX(parent: THREE.Object3D, ctx: CreatureContext) {
  const reduceMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const group = new THREE.Group();
  group.name = 'fx';
  parent.add(group);
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };

  // ---- Rings (instanced ground-plane quads) --------------------------------
  const ringGeo = own(new THREE.InstancedBufferGeometry());
  const base = new THREE.PlaneGeometry(2, 2); base.rotateX(-Math.PI / 2);
  ringGeo.index = base.index; ringGeo.setAttribute('position', base.getAttribute('position')); ringGeo.setAttribute('uv', base.getAttribute('uv'));
  const aRing = new THREE.InstancedBufferAttribute(new Float32Array(MAX_RINGS * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aStyle = new THREE.InstancedBufferAttribute(new Float32Array(MAX_RINGS * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const aColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_RINGS * 3), 3).setUsage(THREE.DynamicDrawUsage);
  ringGeo.setAttribute('aRing', aRing); ringGeo.setAttribute('aStyle', aStyle); ringGeo.setAttribute('aColor', aColor);
  ringGeo.instanceCount = 0;
  const ringMat = own(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true,
    vertexShader: `attribute vec4 aRing; attribute vec4 aStyle; attribute vec3 aColor; varying vec2 vUv; varying vec4 vStyle; varying vec3 vColor;
      void main(){ vUv = uv * 2.0 - 1.0; vStyle = aStyle; vColor = aColor;
        vec3 p = aRing.xyz + vec3(position.x * aRing.w, 0.0, position.z * aRing.w);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying vec2 vUv; varying vec4 vStyle; varying vec3 vColor;
      void main(){ float r = length(vUv); float ang = atan(vUv.y, vUv.x);
        r += vStyle.z * 0.035 * sin(ang * 23.0) * sin(ang * 7.0 + 1.3);
        float w = max(0.012, vStyle.x);
        float ring = exp(-pow((r - (1.0 - w)) / w, 2.0));
        float fill = vStyle.w * smoothstep(1.0, 0.0, r) * 0.35;
        float a = (ring + fill) * vStyle.y * smoothstep(1.02, 0.96, r);
        if (a < 0.003) discard; gl_FragColor = vec4(vColor * a, a); }`,
  }));
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.frustumCulled = false; ringMesh.renderOrder = 12;
  group.add(ringMesh);
  const rings: Ring[] = [];
  const scheduled: { at: number; spec: RingSpec }[] = [];
  function ring(spec: RingSpec, now: number, delay = 0) {
    if (delay > 0) { if (scheduled.length < 400) scheduled.push({ at: now + delay, spec }); return; }
    if (rings.length >= MAX_RINGS) rings.shift();
    rings.push({ ...spec, start: now });
  }

  // ---- Particles --------------------------------------------------------------
  const pGeo = own(new THREE.BufferGeometry());
  const pPos = new Float32Array(MAX_PARTICLES * 3), pCol = new Float32Array(MAX_PARTICLES * 4), pSize = new Float32Array(MAX_PARTICLES);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 4).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage));
  const pMat = own(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uViewH: { value: 800 } },
    vertexShader: `attribute vec4 aColor; attribute float aSize; uniform float uViewH; varying vec4 vC;
      void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        bool persp = projectionMatrix[2][3] == -1.0;
        gl_PointSize = aSize * projectionMatrix[1][1] * uViewH * 0.5 / (persp ? max(0.1, -mv.z) : 1.0); }`,
    fragmentShader: `varying vec4 vC; void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r = dot(d, d); if (r > 1.0) discard; float a = vC.a * (1.0 - r) * (1.0 - r); gl_FragColor = vec4(vC.rgb, a); }`,
  }));
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false; points.renderOrder = 13;
  group.add(points);
  const particles: Particle[] = [];
  const pool: Particle[] = [];
  function particle(p: Partial<Particle> & { x: number; y: number; z: number }) {
    if (particles.length >= MAX_PARTICLES) return;
    const q = pool.pop() ?? ({} as Particle);
    q.x = p.x; q.y = p.y; q.z = p.z; q.vx = p.vx ?? 0; q.vy = p.vy ?? 0; q.vz = p.vz ?? 0;
    q.life = p.life ?? 1; q.age = 0; q.size = p.size ?? 0.2; q.grow = p.grow ?? 0; q.r = p.r ?? 1; q.g = p.g ?? 1; q.b = p.b ?? 1; q.a = p.a ?? 1;
    q.drag = p.drag ?? 1; q.grav = p.grav ?? 0; q.flutter = p.flutter ?? 0;
    particles.push(q);
  }
  const rnd = Math.random;
  function dust(x: number, y: number, z: number, n: number, s: number, strength = 1) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, sp = (0.4 + rnd() * 1.2) * strength;
      const shade = 0.55 + rnd() * 0.2;
      particle({ x: x + Math.sin(a) * 0.25 * s, y: y + 0.04, z: z + Math.cos(a) * 0.25 * s, vx: Math.sin(a) * sp, vy: 0.15 + rnd() * 0.35, vz: Math.cos(a) * sp,
        life: 0.7 + rnd() * 0.6, size: 0.1 * s, grow: 0.32 * s, r: 0.62 * shade + 0.1, g: 0.52 * shade + 0.08, b: 0.38 * shade, a: 0.26, drag: 2.6, grav: 0.1 });
    }
  }
  function leaves(x: number, y: number, z: number, n: number, s: number) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, sp = 0.5 + rnd() * 1.5;
      const g = 0.35 + rnd() * 0.25;
      particle({ x, y, z, vx: Math.sin(a) * sp, vy: 0.6 + rnd() * 1.4, vz: Math.cos(a) * sp, life: 1.6 + rnd(), size: 0.06 * s, r: 0.18 + rnd() * 0.25, g, b: 0.1, a: 0.9, drag: 1.4, grav: 2.2, flutter: 3 });
    }
  }
  function flash(x: number, y: number, z: number, s: number, color = COL.hootPeak) {
    particle({ x, y, z, life: 0.14, size: 0.3 * s, grow: 0.8 * s, r: color.r, g: color.g, b: color.b, a: 0.7 });
    for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2; particle({ x, y, z, vx: Math.sin(a) * 2.2, vy: 0.8 + rnd(), vz: Math.cos(a) * 2.2, life: 0.25, size: 0.07 * s, r: 1, g: 0.92, b: 0.7, a: 0.9, drag: 4, grav: 3 }); }
  }
  function goldBurst(x: number, y: number, z: number, s: number) {
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2, sp = 0.4 + rnd() * 1.4;
      particle({ x: x + Math.sin(a) * 0.3, y: y + rnd() * 0.3, z: z + Math.cos(a) * 0.3, vx: Math.sin(a) * sp, vy: 1.5 + rnd() * 2.5, vz: Math.cos(a) * sp, life: 1.6 + rnd(), size: 0.12 * s, r: 1, g: 0.8 + rnd() * 0.15, b: 0.35, a: 0.95, drag: 1.2, grav: -0.3 });
    }
  }

  // ---- Links (grooming / consolation / sharing) and chase streaks ---------------
  const lGeo = own(new THREE.BufferGeometry());
  const lPos = new Float32Array((MAX_LINKS * LINK_SEG * 2 + MAX_TRAILS * TRAIL_LEN * 2) * 3);
  const lCol = new Float32Array((MAX_LINKS * LINK_SEG * 2 + MAX_TRAILS * TRAIL_LEN * 2) * 4);
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage));
  lGeo.setAttribute('color', new THREE.BufferAttribute(lCol, 4).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(lGeo, own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  lines.frustumCulled = false; lines.renderOrder = 14;
  group.add(lines);
  const trails = new Map<number, { pts: Float32Array; n: number; head: number; at: number; col: THREE.Color; alive: number }>();

  // ---- Event bookkeeping ----------------------------------------------------------
  const seenCalls = new Set<number>();
  const seenInteractions = new Map<number, number>(); // id → last burst time
  const activeIds = new Set<number>();
  let staleNow = 0;
  const forgetStale = (last: number, id: number) => { if (!activeIds.has(id) && staleNow - last > 5) seenInteractions.delete(id); };
  const lastVocalRing = new Map<number, number>();
  const lastAlpha = new Map<number, number>();
  let spawnBudget = 0;

  function callPattern(kind: CallKind, x: number, y: number, z: number, radius: number, s: number, now: number, gy: number) {
    const R = clamp(radius, 5, 18);
    const mk = (r1: number, life: number, thick: number, alpha: number, color: THREE.Color, jag = 0, fill = 0, yy = y): RingSpec => ({ x, y: yy, z, r0: 0.25 * s, r1, life, thick, alpha, color, jag, fill, follow: 0 });
    switch (kind) {
      case 'pant-hoot':
        [0, 0.45, 0.85, 1.15].forEach((d, i) => ring(mk(R * (0.22 + i * 0.07), 1.2, 0.05, 0.18 + i * 0.05, COL.hoot), now, d));
        ring(mk(R * 0.85, 1.8, 0.06, 0.5, COL.hootPeak, 0, 0.08), now, 1.55);
        ring(mk(R * 0.65, 1.5, 0.05, 0.32, COL.hoot), now, 1.8);
        break;
      case 'scream': [0, 0.16, 0.32].forEach(d => ring(mk(R * 0.3, 0.75, 0.05, 0.55, COL.scream, 1), now, d)); break;
      case 'pant-grunt': [0, 0.28].forEach(d => ring(mk(1.6 * s, 0.9, 0.12, 0.5, COL.grunt), now, d)); break;
      case 'laugh': [0, 0.22, 0.44].forEach(d => ring(mk(1.9 * s, 0.8, 0.1, 0.55, COL.laugh, 0.3), now, d)); break;
      case 'alarm-hoo': [0, 0.55, 1.1, 1.65].forEach(d => ring(mk(R * 0.35, 1.1, 0.07, 0.45, COL.alarm, 0, 0.08), now, d)); break;
      case 'bark': ring(mk(R * 0.3, 0.6, 0.06, 0.85, COL.bark, 0.5), now); break;
      case 'drum': [0, 0.3, 0.55].forEach(d => ring(mk(R * 0.25, 1.1, 0.16, 0.7, COL.drum, 0, 0.2, gy + 0.08), now, d)); dust(x, gy, z, 10, s, 0.8); break;
      case 'whimper': ring(mk(0.9 * s, 0.9, 0.12, 0.35, COL.whimper), now); break;
      case 'food-grunt': [0, 0.3].forEach(d => ring(mk(2.2 * s, 0.9, 0.1, 0.5, COL.food), now, d)); break;
    }
  }

  function linkArc(ln: number, a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color, alpha: number, now: number, lift: number) {
    for (let i = 0; i < LINK_SEG; i++) for (let k = 0; k < 2; k++) {
      const t = (i + k) / LINK_SEG;
      const o = ln * LINK_SEG * 2 + i * 2 + k;
      lPos[o * 3] = a.x + (b.x - a.x) * t; lPos[o * 3 + 1] = a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * lift; lPos[o * 3 + 2] = a.z + (b.z - a.z) * t;
      const flow = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 12 - now * 4), 3);
      const aa = alpha * flow * Math.sin(Math.PI * t) ** 0.5;
      lCol[o * 4] = color.r * aa; lCol[o * 4 + 1] = color.g * aa; lCol[o * 4 + 2] = color.b * aa; lCol[o * 4 + 3] = aa;
    }
  }

  const A = new THREE.Vector3(), Bv = new THREE.Vector3();
  const LINK_COL: Record<string, THREE.Color> = { groom: C('#8ff0d4'), console: C('#ffc0d8'), reconcile: C('#ffd9ec'), share: C('#ffd27a'), beg: C('#ffd27a'), coalition: C('#ffc24a'), consort: C('#ff9fc4'), guard: C('#ff9fc4') };

  function update(frame: CreatureFrame, world: World, anims: Map<number, Anim>, dt: number) {
    const now = frame.elapsed;
    pMat.uniforms.uViewH.value = frame.viewH || 800;
    spawnBudget = Math.min(8, spawnBudget + dt * 30);
    // Calls → sound rings (once per call record).
    for (const call of world.calls ?? []) {
      if (seenCalls.has(call.id)) continue;
      seenCalls.add(call.id);
      if (world.time - call.time > 0.25 || spawnBudget < 1) continue;
      const a = anims.get(call.callerId);
      if (a && !a.visible && rings.length > MAX_RINGS * 0.5) continue;
      spawnBudget -= 1;
      const s = a?.morph.size ?? 1.4;
      const x = a ? a.head.x : call.position[0], z = a ? a.head.z : call.position[2];
      const gy = ctx.groundHeight(x, z);
      const y = a ? a.head.y : gy + 1.2;
      callPattern(call.kind, x, y, z, (call.radius ?? 20) * 0.3, s, now, a ? (a.elevated > 0.5 ? a.by : gy) : gy);
      lastVocalRing.set(call.callerId, now);
    }
    if (seenCalls.size > 4000) seenCalls.clear();
    // Vocal fallback for animals vocalizing without a call record.
    for (const a of anims.values()) {
      const c = a.chimp;
      if (!a.visible || !c.vocal || (c.vocalUntil ?? -1) < world.time || spawnBudget < 1) continue;
      const last = lastVocalRing.get(a.id) ?? -99;
      const period = c.vocal === 'pant-hoot' ? 4.5 : c.vocal === 'alarm-hoo' ? 2.5 : c.vocal === 'scream' ? 1.2 : 1.8;
      if (now - last < period) continue;
      lastVocalRing.set(a.id, now);
      spawnBudget -= 1;
      const gy = a.elevated > 0.5 ? a.by : ctx.groundHeight(a.bx, a.bz);
      callPattern(c.vocal, a.head.x, a.head.y, a.head.z, 20 * 0.3, a.morph.size, now, gy);
    }
    // Alpha changes → crown flare.
    for (const t of world.troops) {
      const prev = lastAlpha.get(t.id);
      if (prev !== undefined && prev !== t.alphaId && t.alphaId >= 0) crownFlare(anims.get(t.alphaId), now);
      lastAlpha.set(t.id, t.alphaId);
    }
    // Interactions.
    let ln = 0;
    const active = world.interactions ?? [];
    for (const it of active) {
      const ended = it.end != null && it.end < world.time;
      const a = anims.get(it.actorId), b = anims.get(it.targetId);
      interactionFX(it, a, b, now, ended);
      if (!ended && a && b && (a.visible || b.visible) && ln < MAX_LINKS) {
        const col = LINK_COL[it.kind];
        if (col) {
          A.copy(a.head); Bv.copy(b.head);
          A.y -= 0.12 * a.morph.size; Bv.y -= 0.12 * b.morph.size;
          const d = A.distanceTo(Bv);
          if (d < 25) { linkArc(ln++, A, Bv, col, it.kind === 'groom' ? 0.55 : 0.45, now, Math.min(1.2, 0.25 + d * 0.15)); }
        }
      }
    }
    // Groom links also from pairings without an interaction record.
    if (!active.length) for (const a of anims.values()) {
      if (ln >= MAX_LINKS) break;
      if (a.chimp.action !== 'groom' || !a.paired || a.partnerId < 0) continue;
      const b = anims.get(a.partnerId);
      if (!b || (!a.visible && !b.visible)) continue;
      A.copy(a.head); Bv.copy(b.head); A.y -= 0.12 * a.morph.size; Bv.y -= 0.12 * b.morph.size;
      linkArc(ln++, A, Bv, LINK_COL.groom, 0.5, now, 0.3);
    }
    // Forget bursts of interactions that are gone (O(n) with a reused set; this ran a closure per entry per
    // interaction every frame, ~14 MB/s of garbage at 1 day/s).
    activeIds.clear();
    for (let i = 0; i < active.length; i++) activeIds.add(active[i].id);
    staleNow = now;
    seenInteractions.forEach(forgetStale);
    // Streaks behind fast agonistic / chase movement.
    let tn = 0;
    const baseOff = MAX_LINKS * LINK_SEG * 2;
    // Time-lapse smear (visual plan A2, subtle): in close views an animal moving faster than any real gait leaves
    // a faint dark streak; off with prefers-reduced-motion.
    const smearOk = frame.closeView && !reduceMotion.matches;
    for (const a of anims.values()) {
      const lapse = smearOk && a.visible && a.lapse > 0.5 && a.gait !== 'gallop';
      const fast = (a.visible && a.gait === 'gallop' && a.speed > 1.2 * a.morph.size) || lapse;
      let tr = trails.get(a.id);
      if (fast && !tr) { if (trails.size < MAX_TRAILS) { tr = { pts: new Float32Array(TRAIL_LEN * 3), n: 0, head: 0, at: 0, col: new THREE.Color(), alive: 1 }; trails.set(a.id, tr); } }
      if (!tr) continue;
      const act = a.chimp.action;
      if (lapse) tr.col.setRGB(0.09, 0.08, 0.07);
      else tr.col.copy(act === 'flee' ? COL.alarm : act === 'charge' || act === 'attack' || act === 'display' ? COL.scream : act === 'hunt' ? COL.bark : COL.hoot);
      tr.alive = fast ? 1 : tr.alive - dt * 2;
      if (tr.alive <= 0) { trails.delete(a.id); continue; }
      if (fast && now - tr.at > 0.035) {
        tr.at = now;
        const y = a.by + a.lift * 0.6 + 0.35 * a.morph.size;
        tr.pts[tr.head * 3] = a.bx; tr.pts[tr.head * 3 + 1] = y; tr.pts[tr.head * 3 + 2] = a.bz;
        tr.head = (tr.head + 1) % TRAIL_LEN; tr.n = Math.min(TRAIL_LEN, tr.n + 1);
        if (!lapse && Math.random() < dt * 8 && a.elevated < 0.5) dust(a.bx, ctx.groundHeight(a.bx, a.bz), a.bz, 2, a.morph.size, 0.5);
      }
      for (let i = 0; i + 1 < tr.n && tn < MAX_TRAILS * TRAIL_LEN; i++) {
        const i0 = (tr.head - 1 - i + TRAIL_LEN * 2) % TRAIL_LEN, i1 = (tr.head - 2 - i + TRAIL_LEN * 2) % TRAIL_LEN;
        const o = (baseOff + tn * 2);
        const p = tr.pts;
        lPos[o * 3] = p[i0 * 3]; lPos[o * 3 + 1] = p[i0 * 3 + 1]; lPos[o * 3 + 2] = p[i0 * 3 + 2];
        lPos[o * 3 + 3] = p[i1 * 3]; lPos[o * 3 + 4] = p[i1 * 3 + 1]; lPos[o * 3 + 5] = p[i1 * 3 + 2];
        const a0 = (1 - i / tr.n) * 0.6 * tr.alive, a1 = (1 - (i + 1) / tr.n) * 0.6 * tr.alive;
        const cr = tr.col.r, cg = tr.col.g, cb = tr.col.b, q = o * 4;
        lCol[q] = cr * a0; lCol[q + 1] = cg * a0; lCol[q + 2] = cb * a0; lCol[q + 3] = a0;
        lCol[q + 4] = cr * a1; lCol[q + 5] = cg * a1; lCol[q + 6] = cb * a1; lCol[q + 7] = a1;
        tn++;
      }
    }
    // Compact: links occupy the first block, trails a second block; draw both ranges via zeroed gaps.
    for (let i = ln * LINK_SEG * 2; i < MAX_LINKS * LINK_SEG * 2; i++) lCol[i * 4 + 3] = 0, lCol[i * 4] = lCol[i * 4 + 1] = lCol[i * 4 + 2] = 0;
    lGeo.setDrawRange(0, baseOff + tn * 2);
    lGeo.attributes.position.needsUpdate = true; lGeo.attributes.color.needsUpdate = true;

    // Scheduled rings.
    for (let i = scheduled.length - 1; i >= 0; i--) if (scheduled[i].at <= now) { ring(scheduled[i].spec, now); scheduled.splice(i, 1); }
    // Ring attributes.
    let rn = 0;
    const R = aRing.array as Float32Array, S = aStyle.array as Float32Array, Cc = aColor.array as Float32Array;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const t = (now - r.start) / r.life;
      if (t >= 1 || t < 0) { rings.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - t, 2.2);
      const rad = r.r0 + (r.r1 - r.r0) * e;
      R[rn * 4] = r.x; R[rn * 4 + 1] = r.y; R[rn * 4 + 2] = r.z; R[rn * 4 + 3] = rad;
      S[rn * 4] = r.thick; S[rn * 4 + 1] = r.alpha * (1 - t) * Math.min(1, t * 8); S[rn * 4 + 2] = r.jag; S[rn * 4 + 3] = r.fill;
      Cc[rn * 3] = r.color.r; Cc[rn * 3 + 1] = r.color.g; Cc[rn * 3 + 2] = r.color.b;
      rn++;
    }
    ringGeo.instanceCount = rn;
    aRing.needsUpdate = aStyle.needsUpdate = aColor.needsUpdate = true;
    // Particles.
    let pn = 0;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles[i] = particles[particles.length - 1]; particles.pop(); pool.push(p); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.grav * dt;
      if (p.flutter) { p.vx += Math.sin(p.age * 7 + p.x) * p.flutter * dt; p.vz += Math.cos(p.age * 6 + p.z) * p.flutter * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = p.age / p.life;
      pPos[pn * 3] = p.x; pPos[pn * 3 + 1] = p.y; pPos[pn * 3 + 2] = p.z;
      pCol[pn * 4] = p.r; pCol[pn * 4 + 1] = p.g; pCol[pn * 4 + 2] = p.b; pCol[pn * 4 + 3] = p.a * (1 - t) * Math.min(1, t * 10 + 0.3);
      pSize[pn] = p.size + p.grow * t;
      pn++;
    }
    pGeo.setDrawRange(0, pn);
    pGeo.attributes.position.needsUpdate = true; (pGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true; (pGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  function crownFlare(a: Anim | undefined, now: number) {
    if (!a) return;
    const s = a.morph.size;
    const gy = a.elevated > 0.5 ? a.by : ctx.groundHeight(a.bx, a.bz);
    ring({ x: a.bx, y: gy + 0.1, z: a.bz, r0: 0.3, r1: 7, life: 1.6, thick: 0.08, alpha: 1, color: COL.gold, jag: 0, fill: 0.3, follow: 0 }, now);
    ring({ x: a.bx, y: gy + 0.1, z: a.bz, r0: 0.3, r1: 4, life: 1.2, thick: 0.1, alpha: 0.8, color: COL.gold, jag: 0.2, fill: 0, follow: 0 }, now, 0.3);
    ring({ x: a.head.x, y: a.top + 0.4 * s, z: a.head.z, r0: 0.1, r1: 1.4 * s, life: 1.1, thick: 0.12, alpha: 0.9, color: COL.gold, jag: 0, fill: 0.4, follow: 0 }, now, 0.1);
    goldBurst(a.head.x, a.top, a.head.z, s);
  }

  function interactionFX(it: Interaction, a: Anim | undefined, b: Anim | undefined, now: number, ended: boolean) {
    const last = seenInteractions.get(it.id);
    const first = last === undefined;
    if (first) seenInteractions.set(it.id, now);
    if (ended) return;
    const lastT = last ?? -99;
    const px = a && b ? (a.bx + b.bx) / 2 : it.position[0], pz = a && b ? (a.bz + b.bz) / 2 : it.position[2];
    const gy = ctx.groundHeight(px, pz);
    const s = a?.morph.size ?? 1.4;
    const visible = (a?.visible ?? false) || (b?.visible ?? false);
    switch (it.kind) {
      case 'fight': case 'infanticide': {
        if (!visible) break;
        if (now - lastT > 0.35) {
          seenInteractions.set(it.id, now);
          dust(px, gy, pz, 4, s, 1.1);
          if (a && b) { A.copy(a.head).lerp(b.head, 0.5); flash(A.x, A.y - 0.1 * s, A.z, s, COL.hootPeak); }
          if (Math.random() < 0.3) leaves(px, gy + 0.4 * s, pz, 3, s);
        }
        if (first || now - lastT > 1.3) { ring({ x: px, y: gy + 0.1, z: pz, r0: 0.5, r1: 3.2 + 4 * (it.intensity ?? 0.5), life: 1.3, thick: 0.1, alpha: 0.45 + 0.4 * (it.intensity ?? 0.5), color: it.kind === 'infanticide' ? COL.kill : COL.danger, jag: 0, fill: 0.25, follow: 0 }, now); }
        break;
      }
      case 'intergroup': case 'kill': {
        if (first || now - lastT > 1.4) {
          seenInteractions.set(it.id, now);
          const k = it.kind === 'kill';
          ring({ x: it.position[0], y: ctx.groundHeight(it.position[0], it.position[2]) + 0.12, z: it.position[2], r0: 1, r1: k ? 9 : 12, life: 1.8, thick: 0.06, alpha: k ? 0.8 : 0.55, color: k ? COL.kill : COL.danger, jag: 0, fill: 0.35, follow: 0 }, now);
        }
        break;
      }
      case 'display': case 'rain-display': case 'charge': {
        if (!a || !a.visible) break;
        if (now - lastT > 0.45) {
          seenInteractions.set(it.id, now);
          const gg = a.elevated > 0.5 ? a.by : ctx.groundHeight(a.bx, a.bz);
          dust(a.bx, gg, a.bz, a.speed > 1 ? 5 : 3, a.morph.size, 0.9);
          if (it.kind !== 'charge' && Math.random() < 0.5) leaves(a.head.x, a.head.y + 0.4 * a.morph.size, a.head.z, 4, a.morph.size);
        }
        break;
      }
      case 'takeover': if (first) crownFlare(a, now); break;
      case 'chase': {
        if (!a || !a.visible) break;
        if (now - lastT > 0.5) { seenInteractions.set(it.id, now); dust(a.bx, ctx.groundHeight(a.bx, a.bz), a.bz, 3, a.morph.size, 0.8); }
        break;
      }
      case 'alarm': {
        if (first) ring({ x: it.position[0], y: ctx.groundHeight(it.position[0], it.position[2]) + 0.15, z: it.position[2], r0: 0.5, r1: 6, life: 1.4, thick: 0.08, alpha: 0.5, color: COL.alarm, jag: 0, fill: 0.2, follow: 0 }, now);
        break;
      }
      default: break;
    }
  }

  return {
    update,
    /** Test hook: fire a call pattern at a position. */
    ring, callPattern,
    dispose() { parent.remove(group); base.dispose(); disposables.forEach(d => d.dispose()); },
  };
}
