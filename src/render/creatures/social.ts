// Community differentiation and the social layer.
// - Ground disc per animal in its community colour: a filled disc in the RTS view that also shows
//   through the canopy (an x-ray pass biased ~1.2 m toward the camera so it never paints over the
//   animal itself), a faint ring in close view. Model-controlled animals get a gold inner ring that
//   pulses when a model decision lands.
// - Party outlines: a dashed ribbon around each fission-fusion party in its community colour; a patrol that
//   publishes its leg (Party.patrolPhase, members in file order) gets a dashed line along the file instead.
// - Bonds layer: arcs to the few strongest visible partners (kin, allies, bonds), faded by distance.
import * as THREE from 'three';
import type { World } from '../../types';
import type { Anim, CreatureContext, CreatureFrame } from '../creatures';
import { clamp, damp, preToneMapped, vividColor } from './util';
import { hyp2 } from '../fastmath';
import { phaseCode } from './patrol';

const CAP = 160;
const MAX_LINKS = 90;
const SEG = 10;
const MAX_PARTIES = 24;
const PARTY_SEG = 72;

export interface PartyView {
  id: number; troopId: number; kind: string; count: number; x: number; y: number; z: number; r: number; color: string;
  /** Patrols with a published leg: the leg, and the members in file order (the world's array, not a copy). */
  phase?: string; file?: readonly number[];
}

export function createSocial(parent: THREE.Object3D, ctx: CreatureContext) {
  const group = new THREE.Group();
  group.name = 'social';
  parent.add(group);
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };

  // --- Discs.
  const discGeo = own(new THREE.PlaneGeometry(2, 2));
  discGeo.rotateX(-Math.PI / 2);
  const aDisc = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4).setUsage(THREE.DynamicDrawUsage); // alpha, model, pulse, spare
  discGeo.setAttribute('aDisc', aDisc);
  // uGold: the UI accent #e2bf79 for model-controlled animals, pre-compensated for ACES (raw gold reads lime).
  const discUniforms = { uMode: { value: 1 }, uGold: { value: preToneMapped('#e2bf79', new THREE.Color()) } };
  const discMat = (xray: boolean) => own(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthFunc: xray ? THREE.GreaterDepth : THREE.LessEqualDepth,
    polygonOffset: !xray, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    uniforms: { uMode: discUniforms.uMode, uGold: discUniforms.uGold, uXray: { value: xray ? 1 : 0 } },
    vertexShader: `attribute vec4 aDisc; uniform float uXray; varying vec2 vUv; varying vec4 vD; varying vec3 vC;
      void main(){ vUv = uv * 2.0 - 1.0; vD = aDisc;
        #ifdef USE_INSTANCING_COLOR
        vC = instanceColor;
        #else
        vC = vec3(1.0);
        #endif
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        mv.z += uXray * 1.2; // x-ray only for occluders well in front (canopy), not the animal itself
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uMode; uniform float uXray; uniform vec3 uGold; varying vec2 vUv; varying vec4 vD; varying vec3 vC;
      void main(){ float r = length(vUv); if (r > 1.0) discard;
        vec3 c = vC;
        float edge = smoothstep(0.1, 0.0, abs(r - 0.84));
        float outline = smoothstep(0.035, 0.0, abs(r - 0.96));
        // RTS (uMode 1): filled disc + bright rim + dark outline. Close (uMode 0): thin ring.
        float fillA = mix(0.0, 0.42, uMode) * smoothstep(1.0, 0.75, r);
        float a = max(fillA, edge * mix(0.7, 0.95, uMode));
        vec3 col = mix(c * 0.85, c, edge);
        col = mix(col, vec3(0.02), outline * uMode);
        a = max(a, outline * uMode * 0.8);
        // Model-controlled (GLiNER) animals: gold inner ring, brighter while a decision pulse plays.
        float gold = vD.y * smoothstep(0.06, 0.0, abs(r - 0.62)) * (0.75 + 0.25 * vD.z);
        float pulseRing = vD.z * smoothstep(0.08, 0.0, abs(r - (0.4 + 0.55 * (1.0 - vD.z))));
        col = mix(col, uGold, clamp(gold + pulseRing, 0.0, 1.0));
        a = max(a, gold * 0.95 + pulseRing);
        a *= vD.x * mix(1.0, 0.8, uXray);
        if (a < 0.004) discard; gl_FragColor = vec4(col, a); }`,
  }));
  const discs = new THREE.InstancedMesh(discGeo, discMat(false), CAP);
  const discsX = new THREE.InstancedMesh(discGeo, discMat(true), CAP);
  for (const d of [discs, discsX]) { d.instanceMatrix.setUsage(THREE.DynamicDrawUsage); d.frustumCulled = false; d.count = 0; group.add(d); }
  discs.setColorAt(0, new THREE.Color());
  discsX.instanceColor = discs.instanceColor; discsX.instanceMatrix = discs.instanceMatrix;
  discs.renderOrder = 2; discsX.renderOrder = 3;

  // --- Party outlines: dashed ribbons on the ground.
  const partyGeo = own(new THREE.BufferGeometry());
  const partyPos = new Float32Array(MAX_PARTIES * PARTY_SEG * 6 * 3), partyCol = new Float32Array(MAX_PARTIES * PARTY_SEG * 6 * 4);
  partyGeo.setAttribute('position', new THREE.BufferAttribute(partyPos, 3).setUsage(THREE.DynamicDrawUsage));
  partyGeo.setAttribute('color', new THREE.BufferAttribute(partyCol, 4).setUsage(THREE.DynamicDrawUsage));
  const partyMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, forceSinglePass: true, fog: false }));
  const partyMesh = new THREE.Mesh(partyGeo, partyMat);
  partyMesh.frustumCulled = false; partyMesh.renderOrder = 4;
  group.add(partyMesh);
  const parties: PartyView[] = [];

  // --- Bond arcs.
  const linkGeo = own(new THREE.BufferGeometry());
  const linkPos = new Float32Array(MAX_LINKS * SEG * 2 * 3), linkCol = new Float32Array(MAX_LINKS * SEG * 2 * 4);
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3).setUsage(THREE.DynamicDrawUsage));
  linkGeo.setAttribute('color', new THREE.BufferAttribute(linkCol, 4).setUsage(THREE.DynamicDrawUsage));
  const links = new THREE.LineSegments(linkGeo, own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false })));
  links.frustumCulled = false; links.renderOrder = 15;
  group.add(links);

  const M = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3(), Qh = new THREE.Quaternion(), N = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  const KIN = new THREE.Color('#ff7fa6'), ALLY = new THREE.Color('#ffc233'), BOND = new THREE.Color('#3fd6c2');
  let mode = 1;
  const pulses = new Map<number, { version: number; at: number }>();
  // Bond lists refresh a few times per second; parsing Record keys every frame is wasteful.
  let bondCache: { a: number; b: number; w: number; kind: 0 | 1 | 2 }[] = [];
  let bondAt = -1;
  let partyAt = -1;
  let partyVerts = 0;

  /** Up to three strongest partners per animal (eight for the focal one), kin and allies first. */
  function refreshBonds(animList: Anim[], anims: Map<number, Anim>, selectedId: number | null) {
    bondCache = [];
    const seen = new Set<string>();
    const cand: { o: number; w: number; kind: 0 | 1 | 2 }[] = [];
    for (const a of animList) {
      const c = a.chimp;
      if (!c.alive || !a.visible) continue;
      const sel = c.id === selectedId;
      cand.length = 0;
      if (c.motherId >= 0 && c.age < 12 && anims.get(c.motherId)?.visible) cand.push({ o: c.motherId, w: 1.2, kind: 0 });
      for (const ally of c.allies ?? []) if (anims.get(ally)?.visible) cand.push({ o: ally, w: 1.1, kind: 1 });
      const bonds = c.bonds ?? {};
      for (const key in bonds) {
        const w = bonds[key as unknown as number];
        const other = Number(key);
        if ((w > 0.5 || (sel && w > 0.3)) && anims.get(other)?.visible) cand.push({ o: other, w, kind: 2 });
      }
      cand.sort((p, q) => q.w - p.w);
      const cap = sel ? 8 : 3;
      for (let i = 0, n = 0; i < cand.length && n < cap; i++) {
        const k = `${Math.min(c.id, cand[i].o)}:${Math.max(c.id, cand[i].o)}`;
        if (seen.has(k)) continue;
        seen.add(k); n++;
        bondCache.push({ a: c.id, b: cand[i].o, w: Math.min(1, cand[i].w), kind: cand[i].kind });
      }
    }
  }

  function updateParties(world: World, anims: Map<number, Anim>, frame: CreatureFrame) {
    parties.length = 0;
    for (const p of world.parties ?? []) {
      if (parties.length >= MAX_PARTIES || !p.members || p.members.length < 2) continue;
      let sx = 0, sz = 0, n = 0, size = 1.4;
      for (const id of p.members) { const a = anims.get(id); if (!a || !a.chimp.alive) continue; sx += a.bx; sz += a.bz; n++; size = Math.max(size, a.morph.size); }
      if (n < 2) continue;
      const cx = sx / n, cz = sz / n;
      let r = 0;
      for (const id of p.members) { const a = anims.get(id); if (a && a.chimp.alive) r = Math.max(r, hyp2(a.bx - cx, a.bz - cz)); }
      const troop = world.troops.find(t => t.id === p.troopId);
      parties.push({ id: p.id, troopId: p.troopId, kind: p.kind, count: n, x: cx, y: ctx.groundHeight(cx, cz), z: cz, r: r + 1.2 * size + 0.8, color: troop?.color ?? '#cccccc', phase: p.patrolPhase, file: phaseCode(p.patrolPhase) ? p.members : undefined });
    }
    void frame;
  }

  /**
   * A patrol's file (stylized strategy-view cue): a dashed ribbon through the members in file order, leader to tail,
   * in the community colour (col), with the same width and alpha as a party outline. At most PARTY_SEG dashes (the
   * party's share of the buffer); dashes lengthen for a long file. Returns the new vertex count.
   */
  function fileLine(file: readonly number[], anims: Map<number, Anim>, v: number, alpha: number, w: number): number {
    let total = 0, px = NaN, pz = NaN;
    for (const id of file) { const a = anims.get(id); if (!a || !a.chimp.alive) continue; if (!Number.isNaN(px)) total += hyp2(a.bx - px, a.bz - pz); px = a.bx; pz = a.bz; }
    if (!(total > 0)) return v;
    const period = Math.max(14 * w, total / (PARTY_SEG - 2)), dash = period * 0.5;
    const end = v + PARTY_SEG * 6;
    let phase = 0;
    px = NaN;
    for (const id of file) {
      const a = anims.get(id);
      if (!a || !a.chimp.alive) continue;
      if (!Number.isNaN(px)) {
        const dx = a.bx - px, dz = a.bz - pz, len = hyp2(dx, dz);
        if (len > 1e-4) {
          const ux = dx / len, uz = dz / len, nx = -uz * w, nz = ux * w;
          // Dashes start every `period` along the whole file, carried across segments.
          for (let t = -phase; t < len && v + 6 <= end; t += period) {
            const t0 = Math.max(0, t), t1 = Math.min(len, t + dash);
            if (t1 <= t0) continue;
            for (let k = 0; k < 6; k++) {
              const along = k === 0 || k === 1 || k === 3 ? t0 : t1, side = k === 0 || k === 3 || k === 5 ? -1 : 1;
              const x = px + ux * along + nx * side, z = pz + uz * along + nz * side, o = (v + k) * 3, q = (v + k) * 4;
              partyPos[o] = x; partyPos[o + 1] = ctx.groundHeight(x, z) + 0.25; partyPos[o + 2] = z;
              partyCol[q] = col.r; partyCol[q + 1] = col.g; partyCol[q + 2] = col.b; partyCol[q + 3] = alpha;
            }
            v += 6;
          }
          phase = (phase + len) % period;
        }
      }
      px = a.bx; pz = a.bz;
    }
    return v;
  }

  function update(frame: CreatureFrame, animList: Anim[], anims: Map<number, Anim>, dt: number) {
    const world = ctx.world;
    mode = damp(mode, frame.closeView ? 0 : 1, 3, dt);
    discUniforms.uMode.value = mode;
    let n = 0;
    const discA = aDisc.array as Float32Array;
    for (const a of animList) {
      const c = a.chimp;
      // Decision pulse when a model decision lands (decisionSource 'decide' and a new decisionVersion).
      let pulse = pulses.get(a.id);
      if (!pulse) { pulse = { version: c.decisionVersion ?? 0, at: -99 }; pulses.set(a.id, pulse); }
      if ((c.decisionVersion ?? 0) !== pulse.version) { pulse.version = c.decisionVersion ?? 0; if (c.decisionSource === 'decide') pulse.at = frame.elapsed; }
      if (!a.visible || a.carry !== 0 || n >= CAP || !c.alive) continue;
      const s = a.morph.size;
      const y = a.elevated > 0.5 ? a.by + 0.02 : ctx.groundHeight(a.bx, a.bz) + 0.06;
      const e = 0.6;
      N.set(ctx.groundHeight(a.bx - e, a.bz) - ctx.groundHeight(a.bx + e, a.bz), 2 * e, ctx.groundHeight(a.bx, a.bz - e) - ctx.groundHeight(a.bx, a.bz + e)).normalize();
      Qh.setFromUnitVectors(UP, N);
      const upp = s / Math.max(1, a.px);
      const r = frame.closeView ? Math.max(0.5 * s, 0.5) : Math.max(0.6 * s, 12 * upp);
      P.set(a.bx, y, a.bz); S.set(r, 1, r);
      M.compose(P, Qh, S);
      discs.setMatrixAt(n, M);
      vividColor(a.troopColor, col);
      discs.setColorAt(n, col);
      const hl = frame.highlightTroopId;
      const focus = hl == null ? 1 : c.troopId === hl ? 1.2 : 0.25;
      const model = c.controller === 'model' ? 1 : 0;
      const pk = clamp(1 - (frame.elapsed - pulse.at) / 1.2, 0, 1);
      discA[n * 4] = (0.2 + 0.8 * mode + (model ? 0.35 : 0) * (1 - mode)) * focus * (1 - a.fade);
      discA[n * 4 + 1] = model; discA[n * 4 + 2] = pk; discA[n * 4 + 3] = 0;
      n++;
    }
    discs.count = discsX.count = n;
    discs.instanceMatrix.needsUpdate = true;
    if (discs.instanceColor) discs.instanceColor.needsUpdate = true;
    aDisc.needsUpdate = true;
    discsX.visible = mode > 0.05;

    // Party outlines (RTS only).
    partyMesh.visible = mode > 0.05;
    const rebuild = frame.elapsed - partyAt > 0.2 || partyAt < 0;
    if (rebuild) { updateParties(world, anims, frame); partyAt = frame.elapsed; }
    let v = partyVerts;
    // World units per pixel from any visible animal, so ribbons stay ~2 px wide at every zoom.
    let upp = 0.1;
    for (const a of animList) if (a.visible && a.px > 0) { upp = a.morph.size / a.px; break; }
    if (rebuild) v = 0;
    if (partyMesh.visible && rebuild) for (const p of parties) {
      if (p.file) { vividColor(p.color, col); const hl = frame.highlightTroopId; v = fileLine(p.file, anims, v, 0.6 * mode * (hl == null || hl === p.troopId ? 1 : 0.3), 1.1 * upp); continue; }
      if (p.r > 30) continue; // a scattered "party" is not a legible group: banner only
      vividColor(p.color, col);
      const hl = frame.highlightTroopId;
      const alpha = 0.6 * mode * (hl == null || hl === p.troopId ? 1 : 0.3);
      const w = 1.1 * upp;
      for (let i = 0; i < PARTY_SEG; i++) {
        if (i % 2 === 1) continue; // dashes
        const a0 = i / PARTY_SEG * Math.PI * 2, a1 = (i + 1) / PARTY_SEG * Math.PI * 2;
        // Two triangles per dash: (a0 in, a0 out, a1 out), (a0 in, a1 out, a1 in); written in place, no temporaries.
        for (let k = 0; k < 6; k++) {
          const ang = k === 0 || k === 1 || k === 3 ? a0 : a1;
          const rr = k === 0 || k === 3 || k === 5 ? p.r - w : p.r + w;
          const x = p.x + Math.sin(ang) * rr, z = p.z + Math.cos(ang) * rr, o = (v + k) * 3, q = (v + k) * 4;
          partyPos[o] = x; partyPos[o + 1] = ctx.groundHeight(x, z) + 0.25; partyPos[o + 2] = z;
          partyCol[q] = col.r; partyCol[q + 1] = col.g; partyCol[q + 2] = col.b; partyCol[q + 3] = alpha;
        }
        v += 6;
      }
    }
    if (rebuild) {
      partyVerts = v;
      partyGeo.setDrawRange(0, v);
      partyGeo.attributes.position.needsUpdate = true; partyGeo.attributes.color.needsUpdate = true;
    }

    // Bond arcs.
    links.visible = frame.layers.social;
    if (!frame.layers.social) return;
    if (frame.elapsed - bondAt > 0.4 || bondAt < 0) { refreshBonds(animList, anims, frame.selectedId); bondAt = frame.elapsed; }
    let ln = 0;
    for (const b of bondCache) {
      if (ln >= MAX_LINKS) break;
      const A = anims.get(b.a), Bn = anims.get(b.b);
      if (!A || !Bn || !A.visible || !Bn.visible) continue;
      const selected = frame.selectedId === b.a || frame.selectedId === b.b;
      const base = b.kind === 0 ? KIN : b.kind === 1 ? ALLY : BOND;
      const d = hyp2(A.bx - Bn.bx, A.bz - Bn.bz);
      const maxD = selected ? 60 : 28;
      if (d > maxD) continue;
      const lift = Math.min(4, 0.6 + d * 0.12);
      const alpha = (selected ? 0.95 : 0.5) * (0.45 + 0.55 * b.w) * (frame.selectedId != null && !selected ? 0.3 : 1) * (1 - d / maxD) ** 0.7;
      for (let i = 0; i < SEG; i++) {
        for (let k = 0; k < 2; k++) {
          const t = (i + k) / SEG;
          const x = A.head.x + (Bn.head.x - A.head.x) * t, z = A.head.z + (Bn.head.z - A.head.z) * t;
          const y = A.head.y + (Bn.head.y - A.head.y) * t + Math.sin(Math.PI * t) * lift;
          const o = ln * SEG * 2 + i * 2 + k;
          linkPos[o * 3] = x; linkPos[o * 3 + 1] = y; linkPos[o * 3 + 2] = z;
          const fadeEnds = 0.5 + 0.5 * Math.sin(Math.PI * t);
          linkCol[o * 4] = base.r; linkCol[o * 4 + 1] = base.g; linkCol[o * 4 + 2] = base.b; linkCol[o * 4 + 3] = alpha * fadeEnds;
        }
      }
      ln++;
    }
    linkGeo.setDrawRange(0, ln * SEG * 2);
    linkGeo.attributes.position.needsUpdate = true; linkGeo.attributes.color.needsUpdate = true;
  }
  return {
    update, parties,
    /** 0..1 decision pulse for an animal (label accent). */
    pulse(id: number, elapsed: number) { const p = pulses.get(id); return p ? clamp(1 - (elapsed - p.at) / 1.2, 0, 1) : 0; },
    dispose() { parent.remove(group); discs.dispose(); disposables.forEach(d => d.dispose()); },
  };
}
