// Selection ring (compact, depth-tested so it sits under the feet), target
// tether, and the perception layer: a terrain-conforming vision fan (24 m)
// in the heading direction plus a handful of salient memory markers.
import * as THREE from 'three';
import type { Memory, World } from '../../types';
import type { Anim, CreatureContext, CreatureFrame } from '../creatures';
import { clamp, preToneMapped } from './util';
import { hyp2 } from '../fastmath';

const PERCEPTION_RADIUS = 24;
const FAN_HALF = THREE.MathUtils.degToRad(80);  // ~160° field of view
const FAN_SEG = 48;
const FAN_RINGS = 8;
const MAX_MARKERS = 6;
const LINE_MARKERS = 3;

export function createSelection(parent: THREE.Object3D, ctx: CreatureContext) {
  const group = new THREE.Group();
  group.name = 'selection';
  parent.add(group);
  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };

  // Ring: a dashed outer circle, a thin inner circle and a slow pulse, drawn in a shader. The UI accent gold
  // (#e2bf79; #efd6a3 inside for model-controlled animals), pre-compensated for the ACES output pass.
  const ringUniforms = { uTime: { value: 0 }, uColor: { value: preToneMapped('#e2bf79', new THREE.Color()) }, uModel: { value: 0 }, uModelColor: { value: preToneMapped('#efd6a3', new THREE.Color()) } };
  const ringGeo = own(new THREE.PlaneGeometry(2, 2));
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, own(new THREE.ShaderMaterial({
    uniforms: ringUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uModel; uniform vec3 uModelColor; varying vec2 vUv;
      void main(){
        float r = length(vUv); float a = atan(vUv.y, vUv.x);
        float outer = smoothstep(0.045, 0.0, abs(r - 0.9)) * (0.6 + 0.4 * step(0.45, fract(a / 6.2832 * 18.0 + uTime * 0.12)));
        float inner = smoothstep(0.03, 0.0, abs(r - 0.72)) * 0.55;
        float wave = smoothstep(0.03, 0.0, abs(r - 0.72 - fract(uTime * 0.45) * 0.26)) * (1.0 - fract(uTime * 0.45)) * 0.5;
        vec3 col = mix(uColor, uModelColor, uModel * step(r, 0.8));
        float alpha = outer + inner + wave;
        if (alpha < 0.01 || r > 1.0) discard;
        gl_FragColor = vec4(col, alpha * 0.95);
      }`,
  })));
  ring.renderOrder = 18;
  group.add(ring);
  // Tether from the selected animal to its current target.
  const tetherGeo = own(new THREE.BufferGeometry());
  const tetherPos = new Float32Array(24 * 3);
  tetherGeo.setAttribute('position', new THREE.BufferAttribute(tetherPos, 3).setUsage(THREE.DynamicDrawUsage));
  const tether = new THREE.Line(tetherGeo, own(new THREE.LineDashedMaterial({ color: preToneMapped('#e2bf79', new THREE.Color()), dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false })));
  tether.frustumCulled = false; tether.renderOrder = 17;
  group.add(tether);

  // Perception: vision fan (fill + edge) conforming to the terrain.
  const perception = new THREE.Group();
  group.add(perception);
  const cols = FAN_SEG + 1;
  const fanGeo = own(new THREE.BufferGeometry());
  const fanPos = new Float32Array((FAN_RINGS + 1) * cols * 3), fanR = new Float32Array((FAN_RINGS + 1) * cols), fanA = new Float32Array((FAN_RINGS + 1) * cols);
  const fanIdx: number[] = [];
  for (let r = 0; r <= FAN_RINGS; r++) for (let sI = 0; sI < cols; sI++) { fanR[r * cols + sI] = r / FAN_RINGS; fanA[r * cols + sI] = sI / FAN_SEG; }
  for (let r = 0; r < FAN_RINGS; r++) for (let sI = 0; sI < cols - 1; sI++) { const a = r * cols + sI, b = a + cols; fanIdx.push(a, b, a + 1, a + 1, b, b + 1); }
  fanGeo.setAttribute('position', new THREE.BufferAttribute(fanPos, 3).setUsage(THREE.DynamicDrawUsage));
  fanGeo.setAttribute('aR', new THREE.BufferAttribute(fanR, 1));
  fanGeo.setAttribute('aA', new THREE.BufferAttribute(fanA, 1));
  fanGeo.setIndex(fanIdx);
  const fanUniforms = { uTime: ringUniforms.uTime, uFill: { value: 1 } };
  const fan = new THREE.Mesh(fanGeo, own(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, uniforms: fanUniforms, forceSinglePass: true,
    vertexShader: `attribute float aR; attribute float aA; varying float vR; varying float vA; void main(){ vR = aR; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uFill; varying float vR; varying float vA;
      void main(){
        float edgeA = smoothstep(0.03, 0.0, min(vA, 1.0 - vA));
        float arc = smoothstep(0.025, 0.0, abs(vR - 0.985));
        float fill = 0.10 * uFill * (1.0 - vR * 0.6) * smoothstep(0.0, 0.08, vR);
        float sweep = smoothstep(0.06, 0.0, abs(vR - fract(uTime * 0.18))) * 0.1 * (1.0 - vR);
        float a = fill + sweep + max(edgeA * 0.35, arc * 0.65);
        gl_FragColor = vec4(0.78, 0.78, 0.8, a); // neutral: no mint in the chrome
      }`,
  })));
  fan.frustumCulled = false; fan.renderOrder = 14;
  // Memory markers: small diamonds with a stalk; lines only for the top few.
  const markerGeo = own(new THREE.OctahedronGeometry(0.14, 0));
  const markers = new THREE.InstancedMesh(markerGeo, own(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75, depthTest: false, depthWrite: false, fog: false })), MAX_MARKERS);
  markers.setColorAt(0, new THREE.Color());
  markers.frustumCulled = false; markers.renderOrder = 16; markers.count = 0;
  const memGeo = own(new THREE.BufferGeometry());
  const memPos = new Float32Array(MAX_MARKERS * 4 * 3), memCol = new Float32Array(MAX_MARKERS * 4 * 4);
  memGeo.setAttribute('position', new THREE.BufferAttribute(memPos, 3).setUsage(THREE.DynamicDrawUsage));
  memGeo.setAttribute('color', new THREE.BufferAttribute(memCol, 4).setUsage(THREE.DynamicDrawUsage));
  const memLines = new THREE.LineSegments(memGeo, own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false })));
  memLines.frustumCulled = false; memLines.renderOrder = 15;
  perception.add(fan, markers, memLines);

  const KIND: Record<string, THREE.Color> = { chimp: new THREE.Color('#f2e6c9'), tree: new THREE.Color('#8fd46b'), water: new THREE.Color('#6cc4ff'), prey: new THREE.Color('#ff7a5c') };
  const KIND_RANK: Record<string, number> = { chimp: 3, prey: 2.5, water: 1.5, tree: 1 };
  const tmpCol = new THREE.Color(), M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  let lastPX = Infinity, lastPZ = Infinity, lastH = Infinity;
  const picked: Memory[] = [];

  function update(frame: CreatureFrame, anims: Map<number, Anim>, world: World, dt: number) {
    ringUniforms.uTime.value = frame.elapsed;
    const a = frame.selectedId == null ? undefined : anims.get(frame.selectedId);
    group.visible = !!a && a.fade < 0.9;
    if (!a) return;
    const s = a.morph.size;
    const groundY = ctx.groundHeight(a.bx, a.bz);
    const baseY = a.elevated > 0.5 || a.carry ? a.by : groundY;
    const upp = s / Math.max(1, a.px);
    // ~40% smaller than before; depth-tested so the body hides the part of the ring behind its legs.
    const r = Math.max(0.46 * s, 0.55, 12 * upp);
    ring.position.set(a.bx, baseY + 0.05, a.bz); ring.scale.setScalar(r);
    ringUniforms.uModel.value = a.chimp.controller === 'model' ? 1 : 0;
    // Tether to the current target chimp.
    const target = a.chimp.targetId >= 0 ? anims.get(a.chimp.targetId) : undefined;
    if (target && target !== a && hyp2(target.x - a.x, target.z - a.z) > 0.8 * s) {
      const n = 24;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = a.head.x + (target.head.x - a.head.x) * t, z = a.head.z + (target.head.z - a.head.z) * t;
        const y = a.head.y + (target.head.y - a.head.y) * t + Math.sin(Math.PI * t) * Math.min(3, 0.15 * hyp2(target.x - a.x, target.z - a.z));
        tetherPos[i * 3] = x; tetherPos[i * 3 + 1] = y; tetherPos[i * 3 + 2] = z;
      }
      tetherGeo.setDrawRange(0, n);
      tetherGeo.attributes.position.needsUpdate = true;
      tether.computeLineDistances();
      tether.visible = true;
    } else tether.visible = false;

    perception.visible = frame.layers.perception;
    if (!frame.layers.perception) return;
    fanUniforms.uFill.value = frame.closeView ? 0.35 : 1; // close view: edges only, no haze over the foreground
    // Rebuild the fan only when the animal moved or turned.
    if (hyp2(a.bx - lastPX, a.bz - lastPZ) > 0.3 || Math.abs(a.heading - lastH) > 0.05) {
      lastPX = a.bx; lastPZ = a.bz; lastH = a.heading;
      for (let rr = 0; rr <= FAN_RINGS; rr++) for (let sg = 0; sg < cols; sg++) {
        const ang = a.heading - FAN_HALF + sg / FAN_SEG * FAN_HALF * 2, rad = rr / FAN_RINGS * PERCEPTION_RADIUS;
        const x = a.bx + Math.sin(ang) * rad, z = a.bz + Math.cos(ang) * rad;
        const o = (rr * cols + sg) * 3;
        fanPos[o] = x; fanPos[o + 1] = ctx.groundHeight(x, z) + 0.2; fanPos[o + 2] = z;
      }
      fanGeo.attributes.position.needsUpdate = true;
    }
    // Most salient memories: recent, and chimps/prey above trees.
    picked.length = 0;
    const mem = a.chimp.memory ?? [];
    // Animals already in plain view nearby are their own marker; mark what is remembered but not seen.
    const scored = mem.filter(m => m.position && world.time - m.seenAt < 6 && !(m.kind === 'chimp' && anims.get(m.entityId)?.visible && hyp2((anims.get(m.entityId)?.bx ?? 1e9) - a.bx, (anims.get(m.entityId)?.bz ?? 1e9) - a.bz) < 12))
      .map(m => ({ m, score: (KIND_RANK[m.kind] ?? 1) * (1.2 - clamp((world.time - m.seenAt) / 6, 0, 1)) }))
      .sort((p, q) => q.score - p.score);
    for (let i = 0; i < scored.length && picked.length < MAX_MARKERS; i++) picked.push(scored[i].m);
    let n = 0;
    for (const m of picked) {
      let col = KIND[m.kind] ?? KIND.chimp;
      let tx = m.position[0], tz = m.position[2], ty = ctx.groundHeight(tx, tz) + 1.2;
      if (m.kind === 'chimp') {
        const other = anims.get(m.entityId);
        if (other) { tmpCol.set(other.troopColor); col = tmpCol; if (world.time - m.seenAt < 0.05) { tx = other.head.x; ty = other.top + 0.5; tz = other.head.z; } }
      }
      const age = clamp((world.time - m.seenAt) / 6, 0, 1);
      const k = frame.closeView ? 1 : Math.max(1, 10 * upp);
      P.set(tx, ty + Math.sin(frame.elapsed * 2 + n) * 0.08, tz); Q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, frame.elapsed * 0.8 + n); S.set(k * 0.8, k * 1.3, k * 0.8);
      M.compose(P, Q, S);
      markers.setMatrixAt(n, M);
      markers.setColorAt(n, tmpCol.copy(col).multiplyScalar(1 - age * 0.5));
      const alpha = (1 - age * 0.7) * (n < LINE_MARKERS ? 0.7 : 0);
      memPos.set([a.head.x, a.head.y, a.head.z, tx, ty, tz, tx, ty, tz, tx, ctx.groundHeight(tx, tz) + 0.2, tz], n * 12);
      memCol.set([col.r, col.g, col.b, alpha * 0.25, col.r, col.g, col.b, alpha, col.r, col.g, col.b, 0.5, col.r, col.g, col.b, 0.15], n * 16);
      n++;
    }
    markers.count = n;
    markers.instanceMatrix.needsUpdate = true;
    if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
    memGeo.setDrawRange(0, n * 4);
    memGeo.attributes.position.needsUpdate = true; memGeo.attributes.color.needsUpdate = true;
    void dt;
  }
  return {
    update,
    dispose() { parent.remove(group); markers.dispose(); disposables.forEach(d => d.dispose()); },
  };
}
