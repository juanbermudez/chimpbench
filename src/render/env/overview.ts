import * as THREE from 'three';
import type { World } from '../../types';
import { MAX_TROOPS, Owner, patchMaterial, type SharedUniforms } from './shared';
import { CANOPY_BROAD, CANOPY_HASH, FIELD_CANOPY_COLOR, createBaseHeight, createCanopyHeight, type RiverInfo } from './terrain';
import { approach, partyMarkerPx } from './field';
import { hyp2 } from '../fastmath';

// Field-view overview (C5b; docs/realism-design.md §5.1): the whole ~8 km map at km scale. A canopy surface (the far
// canopy's Voronoi crowns, no individual trees, so no chimp-tree mismatch) with a hole where the detailed window's
// canopy ring takes over; community ranges drawn into it with a pixel-wide edge; the stream as a map line; and one
// marker per party, sized in screen pixels, at a smoothed party anchor. Stylizations (map overlays): the stream line
// and party markers are drawn above the canopy so they read at km scale. Render-only: reads World, never writes it.

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
  dispose(): void;
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
  const quad = owner.own(new THREE.InstancedBufferGeometry());
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 2, 1, 3]);
  const centreData = new Float32Array(MAX_MARKERS * 3), styleData = new Float32Array(MAX_MARKERS * 4), colorData = new Float32Array(MAX_MARKERS * 3);
  const centreAttr = new THREE.InstancedBufferAttribute(centreData, 3).setUsage(THREE.DynamicDrawUsage);
  const styleAttr = new THREE.InstancedBufferAttribute(styleData, 4).setUsage(THREE.DynamicDrawUsage);
  const colorAttr = new THREE.InstancedBufferAttribute(colorData, 3).setUsage(THREE.DynamicDrawUsage);
  quad.setAttribute('aCentre', centreAttr); quad.setAttribute('aStyle', styleAttr); quad.setAttribute('aColor', colorAttr);
  quad.instanceCount = 0;
  const viewport = { value: new THREE.Vector2(1440, 900) };
  const markerMaterial = owner.own(new THREE.ShaderMaterial({
    uniforms: { uViewport: viewport, uW: weightU },
    vertexShader: /* glsl */`
      attribute vec3 aCentre; attribute vec4 aStyle; attribute vec3 aColor;
      uniform vec2 uViewport;
      varying vec2 vQ; varying vec4 vStyle; varying vec3 vColor;
      void main() {
        vec4 clip = projectionMatrix * viewMatrix * vec4( aCentre, 1.0 );
        float R = aStyle.x + 4.0;
        clip.xy += position.xy * R * 2.0 / uViewport * clip.w;
        gl_Position = clip;
        vQ = position.xy * R; vStyle = aStyle; vColor = aColor;
      }`,
    fragmentShader: /* glsl */`
      uniform float uW;
      varying vec2 vQ; varying vec4 vStyle; varying vec3 vColor;
      void main() {
        float r = length( vQ ), R = vStyle.x;
        float disc = 1.0 - smoothstep( R - 0.8, R + 0.4, r );
        float rim = smoothstep( R - 2.4, R - 1.4, r );
        vec3 col = mix( vColor, vec3( 0.03, 0.035, 0.03 ), rim * 0.85 );
        // Selected party: a light outer ring.
        float sel = vStyle.y * ( 1.0 - smoothstep( 1.0, 1.9, abs( r - ( R + 2.4 ) ) ) );
        float a = max( disc * vStyle.z, sel );
        col = mix( col, vec3( 0.95, 0.96, 0.92 ), sel * ( 1.0 - disc ) );
        if ( a < 0.01 ) discard;
        gl_FragColor = vec4( col, a * uW );
      }`,
    transparent: true, depthTest: false, depthWrite: false, fog: false,
  }));
  const markerMesh = new THREE.Mesh(quad, markerMaterial);
  markerMesh.name = 'overview-parties';
  markerMesh.frustumCulled = false;
  markerMesh.renderOrder = 9;
  group.add(markerMesh);

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
  const markerIds = new Int32Array(MAX_MARKERS);   // party index into world.parties this frame
  let lastParties: World['parties'] = [];

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
    count = 0;
    lastParties = w.parties;
    if (f.weight > 0.01) {
      if (colourKey !== w.troops || colourLen !== w.troops.length) { colourKey = w.troops; colourLen = w.troops.length; colours.clear(); for (const t of w.troops) colours.set(t.id, new THREE.Color(t.color)); }
      for (let i = 0; i < w.parties.length && count < MAX_MARKERS; i++) {
        const p = w.parties[i];
        if (!p.members.length) continue;
        let a = anchors.get(p.id);
        if (!a) anchors.set(p.id, a = { x: p.center[0], z: p.center[2], seen: frameNo });
        a.x = approach(a.x, p.center[0], f.dt, 0.5); a.z = approach(a.z, p.center[2], f.dt, 0.5); a.seen = frameNo;
        centreData[count * 3] = a.x; centreData[count * 3 + 1] = canopyTop(a.x, a.z) + 4; centreData[count * 3 + 2] = a.z;
        const selected = f.selectedId !== null && p.members.includes(f.selectedId) ? 1 : 0;
        const dim = f.highlightTroopId !== null && f.highlightTroopId !== p.troopId ? 0.35 : 1;
        styleData.set([partyMarkerPx(p.members.length), selected, dim, 0], count * 4);
        col.copy(colours.get(p.troopId) ?? fallbackColour);
        colorData.set([col.r, col.g, col.b], count * 3);
        markerIds[count++] = i;
      }
      if (anchors.size > 4 * Math.max(8, w.parties.length)) for (const [id, a] of anchors) if (a.seen !== frameNo) anchors.delete(id);
      centreAttr.needsUpdate = styleAttr.needsUpdate = colorAttr.needsUpdate = true;
      centreAttr.clearUpdateRanges(); centreAttr.addUpdateRange(0, count * 3);
      styleAttr.clearUpdateRanges(); styleAttr.addUpdateRange(0, count * 4);
      colorAttr.clearUpdateRanges(); colorAttr.addUpdateRange(0, count * 3);
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
      if (d <= R && d < bestD) { bestD = d; const p = lastParties[markerIds[k]]; best = p ? p.members[0] : null; }
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
    dispose() { labelRoot.remove(); },
  };
}
