import * as THREE from 'three';
import type { World } from '../../types';
import { MAX_TROOPS, Owner, patchMaterial, type SharedUniforms } from './shared';
import { CANOPY_BROAD, CANOPY_HASH, FIELD_CANOPY_COLOR, createBaseHeight, createCanopyHeight, type RiverInfo } from './terrain';
import { approach, partyMarkerPx } from './field';
import { hyp2 } from '../fastmath';
import { MARK_STRIDE, FRUIT_CELL_M, FRUIT_MAX_CELLS, FRUIT_MAX_TREES, FRUIT_SCAN_FRAMES, cellMarkPx, cellWeight, createFruitMarks, cropSignaturePart, fruitColour, fruitMarks, mapLayerWeight, markColour, toHex, treeMarkPx } from './fruit';
import { preToneMapped } from '../creatures/util';
import { ACTIVITY_NAMES, GOAL_CALL, GOAL_NONE, GOAL_TREE, createPartyMap, heardLevel, updatePartyMap, type PartyMap } from './party-map';
import { createCallArcs, createGlyphAtlas, createMarkerMaterial, createPartyLines } from './party-marks';

// Field-view overview (C5b; docs/realism-design.md §5.1): the whole ~8 km map at km scale. A canopy surface (the far
// canopy's Voronoi crowns, no individual trees, so no chimp-tree mismatch) with a hole where the detailed window's
// canopy ring takes over; community ranges drawn into it with a pixel-wide edge; the stream as a map line; and one
// marker per party, sized in screen pixels, at a smoothed party anchor. Stylizations (map overlays): the stream line
// and party markers are drawn above the canopy so they read at km scale. Render-only: reads World, never writes it.
// Stage W10: a party marker also says what the party is doing (party-map.ts works it out, party-marks.ts draws it:
// activity, size, heading, a gold rim for a model-driven member, a tick when its members have just heard a call), each
// party leaves a trail of its last half simulated hour and a dashed line to its goal, and a call draws an arc out to
// its audible radius. The trails, goal lines and arcs are also drawn in the strategy view (any orthographic frame).

export interface OverviewFrame {
  /** 0..1 how much the overview shows (0: the window only). */
  weight: number;
  camera: THREE.Camera; dt: number;
  selectedId: number | null; highlightTroopId: number | null;
  /** Viewport size in CSS pixels. */
  viewW: number; viewH: number;
}
export interface Overview {
  group: THREE.Group;
  /** The detailed window's canopy ring covers radius r around (x, z); r = 0 draws the whole map. */
  setHole(x: number, z: number, r: number): void;
  update(world: World, frame: OverviewFrame): void;
  /** Member id of the party marker under CSS pixel (x, y), or null. */
  pick(x: number, y: number, camera: THREE.Camera, viewW: number, viewH: number): number | null;
  /** Party markers drawn (diagnostics and probes). */
  readonly markers: number;
  /** Stage W10: the tracker behind the marks (read-only), and what the map layer drew last (probes; allocates). */
  readonly partyMap: PartyMap;
  readout(): OverviewReadout;
  dispose(): void;
}
/** What the map layer drew, for probes and captures (stage W10). */
export interface OverviewReadout {
  ortho: boolean; weight: number; markers: number;
  marks: { id: number; troopId: number; members: number; activity: string; headingDeg: number | null; modelDriven: boolean; goal: { kind: 'tree' | 'call'; id: number; x: number; z: number } | null; heard: number; heardIn: number | null }[];
  arcs: { id: number; kind: string; x: number; z: number; radius: number; drawn: number; age: number }[];
  trails: { slots: number; segments: number }; goalLines: number;
}

const MAX_MARKERS = 256;
const GRID = 256;

export function createOverview(world: World, river: RiverInfo, uniforms: SharedUniforms, owner: Owner, container: HTMLElement): Overview {
  const group = new THREE.Group();
  group.name = 'field-overview';
  const baseHeight = createBaseHeight(world.seed), canopyHeight = createCanopyHeight(world.seed);
  const canopyTop = (x: number, z: number) => baseHeight(x, z) - 1.5 + canopyHeight(x, z);
  const half = world.size / 2;

  // --- Canopy surface over the whole map (~31 m spacing).
  const positions = new Float32Array((GRID + 1) * (GRID + 1) * 3);
  const index: number[] = [];
  for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) {
    const x = -half + i / GRID * world.size, z = -half + j / GRID * world.size, k = (j * (GRID + 1) + i) * 3;
    positions[k] = x; positions[k + 1] = canopyTop(x, z); positions[k + 2] = z;
    if (i > 0 && j > 0) { const a = (j - 1) * (GRID + 1) + i - 1, b = a + 1, c = a + GRID + 1, d = c + 1; index.push(a, c, b, b, c, d); }
  }
  const canopyGeometry = owner.own(new THREE.BufferGeometry());
  canopyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  canopyGeometry.setIndex(index);
  canopyGeometry.computeVertexNormals();
  const hole = { value: new THREE.Vector3(0, 0, 0) };
  const noHole = { value: new THREE.Vector3(0, 0, 0) };
  const weightU = { value: 0 };
  const makeCanopyMaterial = (holeU: { value: THREE.Vector3 }, transparent: boolean) => {
  const canopyMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide, transparent, depthWrite: !transparent }));
  patchMaterial(canopyMaterial, uniforms, { cloud: true, wet: 0.6 });
  const basePatch = canopyMaterial.onBeforeCompile;
  canopyMaterial.onBeforeCompile = (shader, renderer) => {
    basePatch.call(canopyMaterial, shader, renderer);
    Object.assign(shader.uniforms, { uHole: holeU, uOverviewW: weightU });
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${CANOPY_HASH}
        uniform vec3 uHole; uniform float uOverviewW;
        uniform vec4 uTroops[ ${MAX_TROOPS} ]; uniform vec3 uTroopColors[ ${MAX_TROOPS} ]; uniform int uTroopCount;
        void main() {
          if ( uHole.z > 0.0 && length( vEnvWorld.xz - uHole.xy ) < uHole.z ) discard;`)
      .replace('#include <color_fragment>', FIELD_CANOPY_COLOR + CANOPY_BROAD + /* glsl */`
        // Community ranges (map overlay): a faint fill and an edge about 1.5 px wide at any zoom.
        vec3 ovEdge = vec3( 0.0 );
        if ( uOverviewW > 0.001 ) {
          for ( int i = 0; i < ${MAX_TROOPS}; i ++ ) {
            if ( i >= uTroopCount ) break;
            vec4 t = uTroops[ i ];
            float d = length( vEnvWorld.xz - t.xy ) - t.z;
            float px = max( fwidth( d ), 1e-3 );
            float edge = 1.0 - smoothstep( 0.8 * px, 2.2 * px, abs( d ) );
            float fill = 1.0 - smoothstep( - px, px, d );
            diffuseColor.rgb = mix( diffuseColor.rgb, uTroopColors[ i ] * 0.22, fill * 0.22 * uOverviewW * ( 0.6 + t.w ) );
            ovEdge += uTroopColors[ i ] * edge * ( 0.45 + t.w * 0.6 );
          }
        }
      `)
      .replace('#include <normal_fragment_maps>', /* glsl */`
        normal = normalize( ( viewMatrix * vec4( normalize( mix( vEnvNormal, farDomeN, lod * 0.85 * ( 1.0 - farWall ) ) ), 0.0 ) ).xyz );
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */`
        #include <emissivemap_fragment>
        totalEmissiveRadiance += ovEdge * uOverviewW;
      `);
  };
  canopyMaterial.customProgramCacheKey = () => `mgogo-overview-canopy-v1${transparent ? 't' : ''}`;
  return canopyMaterial;
  };
  const canopyMaterial = makeCanopyMaterial(hole, false);
  const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
  canopy.name = 'overview-canopy';
  canopy.receiveShadow = true;
  canopy.frustumCulled = false;
  group.add(canopy);

  // --- Cross-fade cap: while the view zooms out over the detailed window, the overview canopy fades in over it (a
  // transparent disc 1 m above the window's canopy ring), so the window dissolves into the map instead of popping.
  const CAP_R = 1300, CAP_RINGS = 40, CAP_AROUND = 160;
  const capPositions = new Float32Array((CAP_RINGS + 1) * (CAP_AROUND + 1) * 3), capIndex: number[] = [];
  for (let i = 0; i < CAP_RINGS; i++) for (let j = 0; j < CAP_AROUND; j++) {
    const a0 = i * (CAP_AROUND + 1) + j, a1 = a0 + 1, b0 = a0 + CAP_AROUND + 1, b1 = b0 + 1;
    capIndex.push(a0, a1, b0, a1, b1, b0);
  }
  const capGeometry = owner.own(new THREE.BufferGeometry());
  const capAttr = new THREE.BufferAttribute(capPositions, 3);
  capGeometry.setAttribute('position', capAttr);
  capGeometry.setIndex(capIndex);
  const capMaterial = makeCanopyMaterial(noHole, true);
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  cap.name = 'overview-cap';
  cap.frustumCulled = false;
  cap.renderOrder = 6;
  cap.visible = false;
  group.add(cap);
  let capX = NaN, capZ = NaN;
  function buildCap(ox: number, oz: number) {
    capX = ox; capZ = oz;
    for (let i = 0; i <= CAP_RINGS; i++) {
      // Rings densest near the window (where the canopy ring rises), coarser outward.
      const r = CAP_R * Math.pow(i / CAP_RINGS, 1.6);
      for (let j = 0; j <= CAP_AROUND; j++) {
        const a = j / CAP_AROUND * Math.PI * 2, x = ox + Math.cos(a) * r, z = oz + Math.sin(a) * r, k = (i * (CAP_AROUND + 1) + j) * 3;
        capPositions[k] = x; capPositions[k + 1] = Math.max(canopyTop(x, z), baseHeight(x, z) + 14) + 1; capPositions[k + 2] = z;
      }
    }
    capAttr.needsUpdate = true;
    capGeometry.computeVertexNormals();
  }

  // --- Stream: a line at least ~1.2 px wide, just above the canopy (map overlay).
  const step = 10, pts: number[] = [], sides: number[] = [], normals: number[] = [], widths: number[] = [], idx: number[] = [];
  let rows = 0;
  for (let i = 0; i < river.points.length; i += step) {
    const p = river.points[i], t = river.tangents[i];
    if (Math.abs(p.x) > half || Math.abs(p.z) > half) { rows = 0; continue; }
    const y = canopyTop(p.x, p.z) + 1.5;
    for (const s of [-1, 1]) { pts.push(p.x, y, p.z); sides.push(s); normals.push(-t.z, t.x); widths.push(river.halfWidth[i] ?? river.width); }
    const n = pts.length / 3;
    if (rows > 0) { const k = n - 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    rows++;
  }
  const streamGeometry = owner.own(new THREE.BufferGeometry());
  streamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  streamGeometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  streamGeometry.setAttribute('aNrm', new THREE.Float32BufferAttribute(normals, 2));
  streamGeometry.setAttribute('aWidth', new THREE.Float32BufferAttribute(widths, 1));
  streamGeometry.setIndex(idx);
  const pixelWorld = { value: 1 };
  const streamMaterial = owner.own(new THREE.ShaderMaterial({
    uniforms: { uPx: pixelWorld, uW: weightU, uHole: hole },
    vertexShader: /* glsl */`
      attribute float aSide; attribute vec2 aNrm; attribute float aWidth;
      uniform float uPx; varying vec2 vXZ;
      void main() {
        float w = max( aWidth, uPx * 1.3 );
        vec3 p = position + vec3( aNrm.x, 0.0, aNrm.y ) * aSide * w;
        vXZ = p.xz;
        gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform float uW; uniform vec3 uHole; varying vec2 vXZ;
      void main() {
        if ( uHole.z > 0.0 && length( vXZ - uHole.xy ) < uHole.z ) discard;
        gl_FragColor = vec4( vec3( 0.045, 0.13, 0.21 ), uW * 0.95 );
      }`,
    transparent: true, depthWrite: false, depthTest: false, fog: false,
  }));
  const stream = new THREE.Mesh(streamGeometry, streamMaterial);
  stream.name = 'overview-stream';
  stream.frustumCulled = false;
  stream.renderOrder = 7;
  group.add(stream);

  // --- Party markers: one screen-sized disc per party, community colour, dark rim; the selected animal's party ringed.
  // Stage W10: the disc also carries the party's activity, size, heading, a gold rim and a heard tick (party-marks.ts).
  const quad = owner.own(new THREE.InstancedBufferGeometry());
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 2, 1, 3]);
  const centreData = new Float32Array(MAX_MARKERS * 3), styleData = new Float32Array(MAX_MARKERS * 4), colorData = new Float32Array(MAX_MARKERS * 3);
  const infoData = new Float32Array(MAX_MARKERS * 4), headData = new Float32Array(MAX_MARKERS * 2);
  const centreAttr = new THREE.InstancedBufferAttribute(centreData, 3).setUsage(THREE.DynamicDrawUsage);
  const styleAttr = new THREE.InstancedBufferAttribute(styleData, 4).setUsage(THREE.DynamicDrawUsage);
  const colorAttr = new THREE.InstancedBufferAttribute(colorData, 3).setUsage(THREE.DynamicDrawUsage);
  const infoAttr = new THREE.InstancedBufferAttribute(infoData, 4).setUsage(THREE.DynamicDrawUsage);
  const headAttr = new THREE.InstancedBufferAttribute(headData, 2).setUsage(THREE.DynamicDrawUsage);
  quad.setAttribute('aCentre', centreAttr); quad.setAttribute('aStyle', styleAttr); quad.setAttribute('aColor', colorAttr);
  quad.setAttribute('aInfo', infoAttr); quad.setAttribute('aHead', headAttr);
  quad.instanceCount = 0;
  const viewport = { value: new THREE.Vector2(1440, 900) };
  const dayU = { value: 1 };
  const markerMaterial = owner.own(createMarkerMaterial(viewport, weightU, owner.own(createGlyphAtlas()), dayU));
  const markerMesh = new THREE.Mesh(quad, markerMaterial);
  markerMesh.name = 'overview-parties';
  markerMesh.frustumCulled = false;
  markerMesh.renderOrder = 9;
  group.add(markerMesh);

  // --- Stage W10: trails and goal lines (one ribbon buffer for every party) and call arcs, under the markers; and the
  // tracker that works out what they show (party-map.ts). On the ground in the strategy view, above the canopy on the map.
  const heights = { ground: baseHeight, top: canopyTop };
  const partyLines = createPartyLines(owner, heights), callArcs = createCallArcs(owner, heights);
  group.add(partyLines.mesh, callArcs.mesh);
  const partyMap = createPartyMap();
  let linesVersion = -1, linesHighlight: number | null = null, lastOrtho = false, lastWeight = 0;

  // --- Community names at their range centres (DOM, positioned per frame with transforms; no layout reads).
  const labelRoot = document.createElement('div');
  labelRoot.className = 'mg-ov-root';
  labelRoot.setAttribute('aria-hidden', 'true');
  Object.assign(labelRoot.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '1' });
  container.appendChild(labelRoot);
  const labels = world.troops.slice(0, MAX_TROOPS).map(t => {
    const el = document.createElement('div');
    el.textContent = t.name;
    Object.assign(el.style, {
      position: 'absolute', left: '0', top: '0', font: '600 12px/1.2 system-ui, sans-serif', letterSpacing: '0.02em', color: '#e9ede9',
      background: 'rgba(12, 14, 13, 0.62)', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', willChange: 'transform',
      borderLeft: `3px solid ${t.color}`, opacity: '0', transition: 'opacity 0.2s',
      // Constant transform fed by --ox/--oy: rewriting inline transforms per frame slows Chrome's style recalc until GC.
      transform: 'translate(var(--ox,0px), var(--oy,0px)) translate(-50%, -50%)',
    });
    labelRoot.appendChild(el);
    return { el, troopId: t.id, shown: false, px: -1, py: -1 };
  });

  const anchors = new Map<number, { x: number; z: number; seen: number }>();
  // Community colours by id, rebuilt only when the community list changes.
  const colours = new Map<number, THREE.Color>();
  let colourKey: World['troops'] | null = null, colourLen = -1;
  const fallbackColour = new THREE.Color('#cccccc');
  const tmp = new THREE.Vector3(), col = new THREE.Color();
  let frameNo = 0, count = 0;
  const markerFirst = new Int32Array(MAX_MARKERS);   // first living member of each marker's party this frame
  const colourOf = (troopId: number) => colours.get(troopId) ?? fallbackColour;

  function update(w: World, f: OverviewFrame) {
    frameNo++;
    weightU.value = f.weight;
    group.visible = true;
    const cam = f.camera as THREE.OrthographicCamera;
    // World metres per CSS pixel at the focus (the stream line's minimum width).
    pixelWorld.value = cam.isOrthographicCamera ? (cam.top - cam.bottom) / cam.zoom / Math.max(1, f.viewH) : 1;
    viewport.value.set(Math.max(1, f.viewW), Math.max(1, f.viewH));
    stream.visible = markerMesh.visible = f.weight > 0.01;
    // The cap fades in over the second half of the band, while the window is still drawn under it.
    const capAlpha = Math.min(1, Math.max(0, (f.weight - 0.3) / 0.7));
    cap.visible = hole.value.z > 0 && capAlpha > 0.005;
    capMaterial.opacity = capAlpha;
    // Stage W10: follow the world in every view (so the trails are there when the view zooms out); the marks are
    // refreshed a few times a second inside, and the line buffer only when they were.
    const now = performance.now() / 1000;
    updatePartyMap(partyMap, w, now);
    const ortho = cam.isOrthographicCamera === true, lift = f.weight;
    dayU.value = Math.min(1, Math.max(0, w.environment.daylight));
    lastOrtho = ortho; lastWeight = f.weight;
    if (colourKey !== w.troops || colourLen !== w.troops.length) { colourKey = w.troops; colourLen = w.troops.length; colours.clear(); for (const t of w.troops) colours.set(t.id, new THREE.Color(t.color)); }
    partyLines.uniforms.uPx.value = callArcs.uniforms.uPx.value = pixelWorld.value;
    partyLines.uniforms.uLift.value = callArcs.uniforms.uLift.value = lift;
    // Quieter among the animals of the strategy view than on the map: 0.4 at a frame of 60 m, 0.7 at 260 m, 1 on the map.
    const hfNow = pixelWorld.value * Math.max(1, f.viewH), near = Math.min(1, Math.max(0, (hfNow - 60) / 200));
    partyLines.uniforms.uA.value = 0.4 + 0.3 * near * near * (3 - 2 * near) + 0.3 * lift;
    if (ortho && (linesVersion !== partyMap.version || linesHighlight !== f.highlightTroopId)) { linesVersion = partyMap.version; linesHighlight = f.highlightTroopId; partyLines.rebuild(partyMap, w.time, colourOf, f.highlightTroopId); }
    partyLines.mesh.visible = ortho && partyLines.segments > 0;
    if (ortho) callArcs.update(partyMap.calls, now); else callArcs.mesh.visible = false;
    count = 0;
    if (f.weight > 0.01) {
      const sc = f.selectedId !== null ? partyMap.byId[f.selectedId] : undefined;
      for (let i = 0; i < partyMap.n && count < MAX_MARKERS; i++) {
        const m = partyMap.marks[i];
        let a = anchors.get(m.id);
        if (!a) anchors.set(m.id, a = { x: m.x, z: m.z, seen: frameNo });
        a.x = approach(a.x, m.x, f.dt, 0.5); a.z = approach(a.z, m.z, f.dt, 0.5); a.seen = frameNo;
        const g = baseHeight(a.x, a.z), top = canopyTop(a.x, a.z) + 4;
        centreData[count * 3] = a.x; centreData[count * 3 + 1] = g + (top - g) * lift; centreData[count * 3 + 2] = a.z;
        const selected = sc !== undefined && sc.alive && sc.partyId === m.id && sc.troopId === m.troopId ? 1 : 0;
        const dim = f.highlightTroopId !== null && f.highlightTroopId !== m.troopId ? 0.35 : 1;
        styleData[count * 4] = partyMarkerPx(m.count); styleData[count * 4 + 1] = selected; styleData[count * 4 + 2] = dim; styleData[count * 4 + 3] = m.activity;
        col.copy(colours.get(m.troopId) ?? fallbackColour);
        colorData[count * 3] = col.r; colorData[count * 3 + 1] = col.g; colorData[count * 3 + 2] = col.b;
        infoData[count * 4] = m.count; infoData[count * 4 + 1] = m.model ? 1 : 0; infoData[count * 4 + 2] = heardLevel(m.heardAt, now); infoData[count * 4 + 3] = m.goalKind === GOAL_CALL ? 1 : 0;
        headData[count * 2] = m.headX; headData[count * 2 + 1] = m.headZ;
        markerFirst[count++] = m.firstId;
      }
      if (anchors.size > 4 * Math.max(8, partyMap.n)) for (const [id, a] of anchors) if (a.seen !== frameNo) anchors.delete(id);
      centreAttr.needsUpdate = styleAttr.needsUpdate = colorAttr.needsUpdate = infoAttr.needsUpdate = headAttr.needsUpdate = true;
      centreAttr.clearUpdateRanges(); centreAttr.addUpdateRange(0, count * 3);
      styleAttr.clearUpdateRanges(); styleAttr.addUpdateRange(0, count * 4);
      colorAttr.clearUpdateRanges(); colorAttr.addUpdateRange(0, count * 3);
      infoAttr.clearUpdateRanges(); infoAttr.addUpdateRange(0, count * 4);
      headAttr.clearUpdateRanges(); headAttr.addUpdateRange(0, count * 2);
    }
    quad.instanceCount = count;

    // Community labels fade in with the overview.
    const showLabels = f.weight > 0.5;
    for (const l of labels) {
      const t = w.troops.find(x => x.id === l.troopId);
      if (!t) continue;
      if (showLabels) {
        // At the range's north edge, clear of the party banners that gather near the centre.
        tmp.set(t.center[0], canopyTop(t.center[0], t.center[2] - t.radius), t.center[2] - t.radius).project(f.camera);
        const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        const px = Math.round((tmp.x * 0.5 + 0.5) * f.viewW), py = Math.round((-tmp.y * 0.5 + 0.5) * f.viewH);
        if (on && px !== l.px) { l.px = px; l.el.style.setProperty('--ox', `${px}px`); }
        if (on && py !== l.py) { l.py = py; l.el.style.setProperty('--oy', `${py}px`); }
        if (on !== l.shown) { l.shown = on; l.el.style.opacity = on ? '1' : '0'; }
      } else if (l.shown) { l.shown = false; l.el.style.opacity = '0'; }
    }
  }

  function pick(x: number, y: number, camera: THREE.Camera, viewW: number, viewH: number): number | null {
    let best: number | null = null, bestD = Infinity;
    for (let k = 0; k < count; k++) {
      tmp.set(centreData[k * 3], centreData[k * 3 + 1], centreData[k * 3 + 2]).project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * viewW, sy = (-tmp.y * 0.5 + 0.5) * viewH;
      const d = hyp2(sx - x, sy - y), R = styleData[k * 4] + 4;
      if (d <= R && d < bestD) { bestD = d; best = markerFirst[k] >= 0 ? markerFirst[k] : null; }
    }
    return best;
  }

  return {
    group,
    setHole(x, z, r) {
      hole.value.set(x, z, r);
      if (r > 0 && (x !== capX || z !== capZ)) buildCap(x, z);
    },
    update, pick,
    get markers() { return count; },
    partyMap,
    readout() {
      const now = performance.now() / 1000, pm = partyMap;
      let slots = 0;
      for (let k = 0; k < pm.trails.cap; k++) if (pm.trails.id[k] >= 0) slots++;
      return {
        ortho: lastOrtho, weight: lastWeight, markers: count,
        marks: pm.marks.slice(0, pm.n).map(m => ({ id: m.id, troopId: m.troopId, members: m.count, activity: ACTIVITY_NAMES[m.activity],
          headingDeg: m.headX || m.headZ ? Math.round((Math.atan2(m.headX, -m.headZ) * 180 / Math.PI + 360) % 360) : null,   // compass: 0 north, 90 east
          modelDriven: m.model, goal: m.goalKind === GOAL_NONE ? null : { kind: m.goalKind === GOAL_TREE ? 'tree' as const : 'call' as const, id: m.goalId, x: Math.round(m.goalX), z: Math.round(m.goalZ) },
          heard: +heardLevel(m.heardAt, now).toFixed(2), heardIn: Number.isFinite(m.heardAt) && m.heardAt > now ? +(m.heardAt - now).toFixed(2) : null })),
        arcs: callArcs.readout(pm.calls, now).map(a => ({ ...a, x: Math.round(a.x), z: Math.round(a.z), drawn: Math.round(a.drawn), age: +a.age.toFixed(2) })),
        trails: { slots, segments: partyLines.trailSegments }, goalLines: partyLines.goalLines,
      };
    },
    dispose() { labelRoot.remove(); },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Stage W7: the fruit layer (docs/staging/w7-fruit.md). A MAP OVERLAY and a STYLIZATION: one small diamond per tree in
// fruit (per map cell when zoomed far out), sized by its crop, in the species' fruit colour, drawn above the canopy at
// strategy and whole-map zooms so a viewer sees where the food is and why parties are where they are. One instanced
// mesh (one draw call while it shows), its buffers rewritten only when a mark would change (the simulation refreshes
// tree.fruit daily, and lowers it as a crown is fed in); per frame it sets four uniforms and reads the crops of one
// thirtieth of the trees (about 800), so a pass over all of them ends every half second and a changed pass rebuilds.
// Diamonds, so they are never read as party markers (discs). Render-only.
// ---------------------------------------------------------------------------------------------------------------------

export interface FruitLayerFrame {
  /** The Food layer toggle. */
  on: boolean;
  camera: THREE.Camera;
  /** Strategy-camera frame height (m) and whether the view is a perspective one (the layer is a map overlay: off there). */
  hf: number; perspective: boolean;
  /** Viewport size, CSS px; daylight 0..1 (marks dim at night with the map). */
  viewW: number; viewH: number; daylight: number;
}
export interface FruitLayer {
  mesh: THREE.Mesh;
  update(world: World, frame: FruitLayerFrame): void;
  /** Probes and tests: marks drawn, rebuilds so far, the layer's and the cell marks' weights. */
  stats(): { trees: number; cells: number; dropped: number; rebuilds: number; weight: number; cellWeight: number };
}

export function createFruitLayer(world: World, owner: Owner): FruitLayer {
  const baseHeight = createBaseHeight(world.seed);
  const marks = createFruitMarks(world.size);
  const MAX = FRUIT_MAX_TREES + FRUIT_MAX_CELLS;
  const quad = owner.own(new THREE.InstancedBufferGeometry());
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 2, 1, 3]);
  const centre = new Float32Array(MAX * 3), style = new Float32Array(MAX * 2), colour = new Float32Array(MAX * 3);
  const centreAttr = new THREE.InstancedBufferAttribute(centre, 3), styleAttr = new THREE.InstancedBufferAttribute(style, 2), colourAttr = new THREE.InstancedBufferAttribute(colour, 3);
  quad.setAttribute('aCentre', centreAttr); quad.setAttribute('aStyle', styleAttr); quad.setAttribute('aColor', colourAttr);
  quad.instanceCount = 0;
  const uniforms = { uViewport: { value: new THREE.Vector2(1440, 900) }, uW: { value: 0 }, uCell: { value: 0 }, uLight: { value: 1 } };
  const material = owner.own(new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      attribute vec3 aCentre; attribute vec2 aStyle; attribute vec3 aColor;
      uniform vec2 uViewport; uniform float uW; uniform float uCell;
      varying vec2 vQ; varying float vR; varying vec3 vColor; varying float vA;
      void main() {
        // aStyle = (radius px, 0 a tree's mark | 1 a cell's mark): the two sets cross-fade with the zoom.
        float a = uW * mix( 1.0 - uCell, uCell, aStyle.y );
        vQ = vec2( 0.0 ); vR = aStyle.x; vColor = aColor; vA = a;
        if ( a < 0.01 ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); return; }   // the hidden set costs no fragment
        vec4 clip = projectionMatrix * viewMatrix * vec4( aCentre, 1.0 );
        float R = aStyle.x + 1.5;
        clip.xy += position.xy * R * 2.0 / uViewport * clip.w;
        gl_Position = clip;
        vQ = position.xy * R;
      }`,
    fragmentShader: /* glsl */`
      uniform float uLight;
      varying vec2 vQ; varying float vR; varying vec3 vColor; varying float vA;
      void main() {
        float d = abs( vQ.x ) + abs( vQ.y );                       // a diamond
        float fill = 1.0 - smoothstep( vR - 0.7, vR + 0.7, d );
        float rim = smoothstep( vR - 2.0, vR - 0.8, d ) * smoothstep( 2.6, 4.2, vR );   // dark edge on the larger marks
        float a = fill * vA * 0.94;
        if ( a < 0.01 ) discard;
        gl_FragColor = vec4( mix( vColor, vec3( 0.03, 0.025, 0.02 ), rim * 0.75 ) * uLight, a );
      }`,
    transparent: true, depthTest: false, depthWrite: false, fog: false,
  }));
  const mesh = new THREE.Mesh(quad, material);
  mesh.name = 'overview-fruit';
  mesh.frustumCulled = false;
  // Above the canopy, the cap and the stream; under the party markers (9) and, since the merge with stage W10, under
  // the parties' trails, goal lines and the call arcs (8): a goal line ends in a small square on the tree the party
  // walks to, usually a tree in fruit, and a diamond drawn over it would hide where the party is going.
  mesh.renderOrder = 7.5;
  mesh.visible = false;

  // Mark colours per species, compensated for the tone-mapping pass once (preToneMapped iterates).
  const index = new Map<string, number>();
  const palette: number[] = [];
  const tmpRgb = [0, 0, 0], tmpCol = new THREE.Color();
  const colourOf = (species: string): number => {
    let k = index.get(species);
    if (k === undefined) {
      k = index.size; index.set(species, k);
      preToneMapped(toHex(markColour(fruitColour(species), tmpRgb)), tmpCol);
      palette.push(tmpCol.r, tmpCol.g, tmpCol.b);
    }
    return k;
  };

  let builtFor: World['trees'] | null = null, signature = NaN, rebuilds = 0, weight = 0, cellW = 0;
  // The scan: where the pass over the trees stands and its sum so far (fruit.ts cropSignaturePart).
  let scanAt = 0, scanSum = 0;
  // Ground height under each tree and each cell centre, looked up once (three noise samples each): a rebuild while a
  // party feeds comes every few seconds at 1 min/s, and would otherwise sample the terrain 3,000 times each time.
  let treeY = new Float32Array(0);
  const cellY = new Float32Array(Math.ceil(world.size / FRUIT_CELL_M) ** 2).fill(NaN);
  function rebuild(w: World) {
    if (builtFor !== w.trees || treeY.length !== w.trees.length) { treeY = new Float32Array(w.trees.length).fill(NaN); cellY.fill(NaN); }
    builtFor = w.trees; rebuilds++;
    scanAt = 0; scanSum = w.trees.length;
    signature = fruitMarks(w.trees, w.size, marks, colourOf).signature;   // one pass over the trees gives both
    let n = 0;
    const T = marks.trees, C = marks.cells;
    for (let i = 0; i < marks.nTrees; i++, n++) {
      const o = i * MARK_STRIDE, x = T[o], z = T[o + 1], k = T[o + 4], ti = T[o + 5];
      let y = treeY[ti];
      if (y !== y) y = treeY[ti] = Math.max(1, baseHeight(x, z));
      centre[n * 3] = x; centre[n * 3 + 1] = y + T[o + 3]; centre[n * 3 + 2] = z;
      style[n * 2] = treeMarkPx(T[o + 2]); style[n * 2 + 1] = 0;
      colour[n * 3] = palette[k * 3]; colour[n * 3 + 1] = palette[k * 3 + 1]; colour[n * 3 + 2] = palette[k * 3 + 2];
    }
    for (let i = 0; i < marks.nCells; i++, n++) {
      const o = i * MARK_STRIDE, x = C[o], z = C[o + 1], k = C[o + 4], ci = C[o + 5];
      let y = cellY[ci];
      if (y !== y) y = cellY[ci] = Math.max(1, baseHeight(x, z));
      centre[n * 3] = x; centre[n * 3 + 1] = y + 24; centre[n * 3 + 2] = z;
      style[n * 2] = cellMarkPx(C[o + 2]); style[n * 2 + 1] = 1;
      colour[n * 3] = palette[k * 3]; colour[n * 3 + 1] = palette[k * 3 + 1]; colour[n * 3 + 2] = palette[k * 3 + 2];
    }
    quad.instanceCount = n;
    const up = Math.max(1, n);
    centreAttr.clearUpdateRanges(); centreAttr.addUpdateRange(0, up * 3); centreAttr.needsUpdate = true;
    styleAttr.clearUpdateRanges(); styleAttr.addUpdateRange(0, up * 2); styleAttr.needsUpdate = true;
    colourAttr.clearUpdateRanges(); colourAttr.addUpdateRange(0, up * 3); colourAttr.needsUpdate = true;
  }

  function update(w: World, f: FruitLayerFrame) {
    weight = f.on && !f.perspective ? mapLayerWeight(f.hf) : 0;
    mesh.visible = weight > 0.01;
    if (!mesh.visible) return;
    cellW = cellWeight(f.hf / Math.max(1, f.viewH));
    uniforms.uW.value = weight; uniforms.uCell.value = cellW;
    uniforms.uViewport.value.set(Math.max(1, f.viewW), Math.max(1, f.viewH));
    uniforms.uLight.value = 0.3 + 0.7 * f.daylight;
    // Rebuild when the marks would change: a new tree list at once; else one slice of the trees a frame, and when a
    // pass over all of them does not sum to what was built, the crops have moved (a party feeding, the daily refresh).
    if (builtFor !== w.trees) { rebuild(w); return; }
    const n = w.trees.length, end = Math.min(n, scanAt + Math.ceil(n / FRUIT_SCAN_FRAMES));
    scanSum += cropSignaturePart(w.trees, scanAt, end);
    if (end < n) scanAt = end;
    else if (scanSum !== signature) rebuild(w);
    else { scanAt = 0; scanSum = n; }
  }

  return { mesh, update, stats: () => ({ trees: marks.nTrees, cells: marks.nCells, dropped: marks.dropped, rebuilds, weight, cellWeight: cellW }) };
}
