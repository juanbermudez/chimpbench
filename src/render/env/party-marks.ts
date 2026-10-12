import * as THREE from 'three';
import type { Owner } from './shared';
import { ARC_LIFE_S, ARC_MAX, arcAlpha, arcRadius, type CallLog } from '../callreach';
import { GOAL_CALL, GOAL_NONE, MAX_MARKS, TRAIL_SAMPLES, TRAIL_SLOTS, trailPoints, type PartyMap } from './party-map';
import { preToneMapped } from '../creatures/util';
import type { CallKind } from '../../types';

// Stage W10 (calls you can see, and a map that shows what the community is doing): the map marks that party-map.ts
// works out, as three.js objects for the field overview (overview.ts). Render-only: reads World through party-map.ts,
// never writes it.
//
// STYLIZATIONS (map conventions, none of them a claim about chimpanzees):
// - the party marker's glyphs: an activity pictogram inside the disc (the name tags' own glyphs: fruit, arrow, moon,
//   heart, bolt), the party's size as a number in a badge, a tick outside the rim pointing where a travelling party is
//   heading, a gold rim where a member is driven by the decision model, two short arcs while its members have just
//   heard a call;
// - the trail: where the party's centre has been for the last half simulated hour, fading with age;
// - the goal line: dashes from a party to the tree, or to the place of the call, most of its members are walking to;
// - the call arc: a thin ring growing from the caller to the call's audible radius (callreach.ts) and fading.
// Sizes are in screen pixels and are design assumptions.
//
// Cost: one instanced quad mesh for the markers (as before, a longer fragment shader on a few hundred pixels each), one
// ribbon mesh for every trail and goal line (one draw call, rebuilt a few times a second, never per frame), and one
// instanced ring mesh for the call arcs (drawn only while a call is fresh). No render pass, no render target; one
// 1024 × 64 glyph texture.

/** Glyph atlas: 16 cells of 64 px in a row: digits 0 to 9, then the five activity pictograms (ACT_* order). */
const CELLS = 16, CELL = 64;
// The name tags' glyphs (creatures/labels.ts CAT_ICON), in a 12 × 12 box.
const PICTOGRAM_PATHS: ((g: CanvasRenderingContext2D) => void)[] = [
  g => { g.beginPath(); g.arc(6, 7.1, 3.6, 0, Math.PI * 2); g.fill(); g.lineWidth = 1.3; g.lineCap = 'round'; g.stroke(new Path2D('M6 3.7c0-1.2.6-2 1.9-2.5')); },                                          // feeding: a fruit
  g => { g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D('M1.8 6h7.6M6.2 2.6l3.4 3.4-3.4 3.4')); },                                                                    // travelling: an arrow (points +x)
  g => { g.fill(new Path2D('M9.9 7.8A4.3 4.3 0 1 1 4.3 2.2a3.5 3.5 0 0 0 5.6 5.6Z')); },                                                                                                               // resting: a moon
  g => { g.fill(new Path2D('M6 10.6 2 6.7a2.4 2.4 0 0 1 3.4-3.4L6 3.9l.6-.6A2.4 2.4 0 0 1 10 6.7Z')); },                                                                                               // social: a heart
  g => { g.fill(new Path2D('M7 .8 2.8 6.7h2.8L4.9 11.2l4.4-6.1H6.5Z')); },                                                                                                                             // patrolling: a bolt
];
export function createGlyphAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CELLS * CELL; canvas.height = CELL;
  const g = canvas.getContext('2d')!;
  g.fillStyle = g.strokeStyle = '#ffffff';
  g.font = `700 ${Math.round(CELL * 0.8)}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  for (let d = 0; d < 10; d++) {
    const m = g.measureText(String(d)), asc = m.actualBoundingBoxAscent || CELL * 0.58, desc = m.actualBoundingBoxDescent || 0;
    g.fillText(String(d), d * CELL + CELL / 2, CELL / 2 + (asc - desc) / 2);
  }
  PICTOGRAM_PATHS.forEach((draw, i) => {
    g.save();
    g.translate((10 + i) * CELL + CELL * 0.1, CELL * 0.1); g.scale(CELL * 0.8 / 12, CELL * 0.8 / 12);
    draw(g);
    g.restore();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  return tex;
}

// Overlay colours drawn inside the tone-mapped scene (AGENTS.md: raw gold goes lime under ACES).
const GOLD = preToneMapped('#e2bf79', new THREE.Color());      // the interface's accent for model-driven animals
const HOOT = preToneMapped('#ffe3a3', new THREE.Color());      // the pant-hoot ring colour of creatures/fx.ts
const ARC_COLOURS: Partial<Record<CallKind, THREE.Color>> = {
  scream: preToneMapped('#ff8a7a', new THREE.Color()), bark: preToneMapped('#ffb27a', new THREE.Color()),
  'alarm-hoo': preToneMapped('#aeeeff', new THREE.Color()), drum: preToneMapped('#f0cf9c', new THREE.Color()),
};

/** How far the marker is dimmed at full night (design assumption, set by eye against the night picture). */
const NIGHT_DIM = 0.2;
/**
 * The party marker's material. Instance attributes: aCentre (xyz), aStyle (radius px, selected, dim, activity),
 * aColor (community colour), aInfo (members, gold rim, heard 0..1, answering a call), aHead (travel direction x, z).
 */
export function createMarkerMaterial(viewport: { value: THREE.Vector2 }, weight: { value: number }, atlas: THREE.Texture, day: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uViewport: viewport, uW: weight, uAtlas: { value: atlas }, uGold: { value: GOLD }, uHoot: { value: HOOT }, uDay: day },
    vertexShader: /* glsl */`
      attribute vec3 aCentre; attribute vec4 aStyle; attribute vec3 aColor; attribute vec4 aInfo; attribute vec2 aHead;
      uniform vec2 uViewport;
      varying vec2 vQ; varying vec4 vStyle; varying vec3 vColor; varying vec4 vInfo; varying vec2 vHead;
      void main() {
        mat4 pv = projectionMatrix * viewMatrix;
        vec4 clip = pv * vec4( aCentre, 1.0 );
        // The travel direction on screen: where a point ten metres ahead lands.
        vec2 head = vec2( 0.0 );
        if ( dot( aHead, aHead ) > 0.25 ) {
          vec4 ahead = pv * vec4( aCentre + vec3( aHead.x, 0.0, aHead.y ) * 10.0, 1.0 );
          vec2 d = ( ahead.xy / ahead.w - clip.xy / clip.w ) * uViewport;
          if ( dot( d, d ) > 1e-12 ) head = normalize( d );
        }
        float ext = aStyle.x + 17.0;   // room for the tick, the badge and the heard arcs outside the rim
        clip.xy += position.xy * ext * 2.0 / uViewport * clip.w;
        gl_Position = clip;
        vQ = position.xy * ext; vStyle = aStyle; vColor = aColor; vInfo = aInfo; vHead = head;
      }`,
    fragmentShader: /* glsl */`
      uniform float uW; uniform sampler2D uAtlas; uniform vec3 uGold; uniform vec3 uHoot; uniform float uDay;
      varying vec2 vQ; varying vec4 vStyle; varying vec3 vColor; varying vec4 vInfo; varying vec2 vHead;
      float glyph( float cell, vec2 uv ) {
        if ( uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 ) return 0.0;
        return texture2D( uAtlas, vec2( ( cell + clamp( uv.x, 0.03, 0.97 ) ) / ${CELLS}.0, uv.y ) ).a;
      }
      float box( vec2 p, vec2 h, float rad ) { vec2 q = abs( p ) - h + rad; return length( max( q, 0.0 ) ) + min( max( q.x, q.y ), 0.0 ) - rad; }
      void main() {
        float r = length( vQ ), R = vStyle.x, sel = vStyle.y, act = vStyle.w;
        float members = vInfo.x, gold = vInfo.y, heard = vInfo.z, answering = vInfo.w;
        vec3 ink = vec3( 0.012, 0.014, 0.012 ), paper = vec3( 0.95, 0.96, 0.92 );
        bool heading = dot( vHead, vHead ) > 0.5;
        // Disc in the community colour; its rim dark, or gold where a member is driven by the decision model.
        float disc = 1.0 - smoothstep( R - 0.8, R + 0.4, r );
        float rim = smoothstep( R - 2.6, R - 1.6, r );
        vec3 col = mix( vColor, mix( ink, uGold, gold ), rim * mix( 0.85, 1.0, gold ) );
        float a = disc * vStyle.z;
        // Activity pictogram; the travelling arrow points where the party is heading.
        vec2 q = vQ;
        if ( act > 0.5 && act < 1.5 && heading ) q = vec2( dot( vQ, vHead ), dot( vQ, vec2( - vHead.y, vHead.x ) ) );
        float g = glyph( 10.0 + act, q / ( R * 0.66 ) * 0.5 + 0.5 ) * disc;
        col = mix( col, ink, g * 0.92 );
        // Selected party: a light outer ring.
        float selRing = sel * ( 1.0 - smoothstep( 1.0, 1.9, abs( r - ( R + 2.4 ) ) ) );
        col = mix( col, paper, selRing * ( 1.0 - disc ) ); a = max( a, selRing );
        float outer = R + 1.5 + sel * 3.0;
        // Heading tick: a chevron outside the rim, in the call's colour while the party walks toward a call.
        if ( heading ) {
          float u = dot( vQ, vHead ), v = abs( dot( vQ, vec2( - vHead.y, vHead.x ) ) );
          float d = min( u - ( outer + 1.0 ), ( outer + 9.5 - u ) * 0.75 - v );
          float tri = smoothstep( - 0.6, 0.6, d );
          float edge = 1.0 - smoothstep( 0.7, 1.9, d );
          vec3 tc = mix( mix( paper, uHoot, answering ), ink, edge * 0.9 );
          col = mix( col, tc, tri * ( 1.0 - disc ) ); a = max( a, tri * max( vStyle.z, 0.5 ) );
        }
        // Heard tick: two short arcs up and to the left of the disc, fading over a few seconds.
        if ( heard > 0.01 ) {
          float ang = atan( vQ.y, - vQ.x );
          float wedge = 1.0 - smoothstep( 0.5, 0.66, abs( ang - 0.785 ) );
          float arcs = max( 1.0 - smoothstep( 0.8, 1.6, abs( r - ( outer + 3.0 ) ) ), 1.0 - smoothstep( 0.8, 1.6, abs( r - ( outer + 7.0 ) ) ) );
          float h = arcs * wedge * min( 1.0, heard * 3.0 ) * vStyle.z;   // dimmed with its marker when another community is highlighted
          col = mix( col, uHoot, h * ( 1.0 - disc ) ); a = max( a, h );
        }
        // Size: the number of members in a small badge, lower right.
        float two = step( 9.5, members );
        vec2 p = vQ - vec2( R * 0.72 + 3.0, - ( R * 0.72 + 3.0 ) );
        float bd = box( p, vec2( 5.4 + 3.0 * two, 6.0 ), 3.2 );
        float badge = 1.0 - smoothstep( - 0.5, 0.5, bd );
        if ( badge > 0.0 ) {
          float ones = mod( members, 10.0 ), tens = floor( members / 10.0 );
          float dg = two > 0.5
            ? max( glyph( tens, vec2( ( p.x + 3.1 ) / 12.0 + 0.5, p.y / 12.0 + 0.5 ) ), glyph( ones, vec2( ( p.x - 3.1 ) / 12.0 + 0.5, p.y / 12.0 + 0.5 ) ) )
            : glyph( ones, p / 12.0 + 0.5 );
          col = mix( col, mix( vec3( 0.06, 0.065, 0.07 ), paper, dg ), badge );
          a = max( a, badge * max( vStyle.z, 0.6 ) );
        }
        if ( a < 0.01 ) discard;
        // At night the picture's exposure rises many times over (the forest is dark) and an unlit mark burns out to
        // white, glyph and all: the marker is dimmed as daylight goes so it keeps its colours (NIGHT_DIM, by eye).
        col *= mix( ${NIGHT_DIM.toFixed(2)}, 1.0, uDay );
        gl_FragColor = vec4( col, a * uW );
      }`,
    transparent: true, depthTest: false, depthWrite: false, fog: false,
  });
}

export interface MarkHeights { ground(x: number, z: number): number; top(x: number, z: number): number; }

// --- Trails and goal lines: one ribbon buffer for every party --------------------------------------------------

const MAX_SEGS = TRAIL_SLOTS * TRAIL_SAMPLES + MAX_MARKS * 2;
/** Height of the lines above the ground (strategy view) and above the canopy top (map), m. */
const LINE_GROUND = 0.4, LINE_TOP = 3;
const TRAIL_HALF_PX = 1.3, GOAL_HALF_PX = 0.9, GOAL_DOT_PX = 2.6;

export interface PartyLines {
  mesh: THREE.Mesh;
  /** World metres per CSS pixel, 0..1 lift (0: on the ground, 1: above the canopy), opacity. */
  uniforms: { uPx: { value: number }; uLift: { value: number }; uA: { value: number } };
  /** Rebuilds the buffer from the tracker (a few times a second at most). troopColour: the community's colour. */
  rebuild(pm: PartyMap, worldTime: number, troopColour: (troopId: number) => THREE.Color, highlightTroopId: number | null): void;
  /** Segments in the buffer (diagnostics). */
  readonly segments: number; readonly trailSegments: number; readonly goalLines: number;
}
export function createPartyLines(owner: Owner, heights: MarkHeights): PartyLines {
  const verts = MAX_SEGS * 4;
  const pos = new Float32Array(verts * 3), seg = new Float32Array(verts * 4), misc = new Float32Array(verts * 3), col = new Float32Array(verts * 4);
  const index = new Uint16Array(MAX_SEGS * 6);
  for (let s = 0; s < MAX_SEGS; s++) { const v = s * 4, o = s * 6; index[o] = v; index[o + 1] = v + 1; index[o + 2] = v + 2; index[o + 3] = v + 2; index[o + 4] = v + 1; index[o + 5] = v + 3; }
  const geometry = owner.own(new THREE.BufferGeometry());
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage), aSeg = new THREE.BufferAttribute(seg, 4).setUsage(THREE.DynamicDrawUsage);
  const aMisc = new THREE.BufferAttribute(misc, 3).setUsage(THREE.DynamicDrawUsage), aCol = new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', aPos); geometry.setAttribute('aSeg', aSeg); geometry.setAttribute('aMisc', aMisc); geometry.setAttribute('aCol', aCol);
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.setDrawRange(0, 0);
  const uniforms = { uPx: { value: 1 }, uLift: { value: 1 }, uA: { value: 1 } };
  const material = owner.own(new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      attribute vec4 aSeg;    // direction x, z; side × half width (px); end × cap (px)
      attribute vec3 aMisc;   // metres along the line; dashed (1) or solid (0); lift to the canopy top (m)
      attribute vec4 aCol;
      uniform float uPx; uniform float uLift;
      varying vec4 vCol; varying vec2 vDash;
      void main() {
        vec3 p = position;
        p.y += aMisc.z * uLift;
        p.xz += vec2( - aSeg.y, aSeg.x ) * aSeg.z * uPx + aSeg.xy * aSeg.w * uPx;
        vCol = aCol; vDash = vec2( aMisc.x / uPx + aSeg.w, aMisc.y );
        gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform float uA;
      varying vec4 vCol; varying vec2 vDash;
      void main() {
        float a = vCol.a * uA;
        if ( vDash.y > 0.5 ) a *= step( mod( vDash.x, 11.0 ), 6.0 );
        if ( a < 0.01 ) discard;
        gl_FragColor = vec4( vCol.rgb, a );
      }`,
    transparent: true, depthTest: false, depthWrite: false, fog: false,
  }));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'overview-party-lines';
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.visible = false;
  let n = 0, trails = 0, goals = 0;
  /** One ribbon segment from (x0, z0) to (x1, z1): colour, opacity at each end, half width and end caps in pixels. */
  function put(x0: number, z0: number, x1: number, z1: number, r: number, g: number, b: number, a0: number, a1: number, halfPx: number, capPx: number, dashed: number, along0: number): void {
    if (n >= MAX_SEGS) return;
    let dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) { dx /= len; dz /= len; } else { dx = 1; dz = 0; }
    const g0 = heights.ground(x0, z0) + LINE_GROUND, g1 = heights.ground(x1, z1) + LINE_GROUND;
    const l0 = heights.top(x0, z0) + LINE_TOP - g0, l1 = heights.top(x1, z1) + LINE_TOP - g1;
    for (let k = 0; k < 4; k++) {
      const end = k < 2 ? 0 : 1, side = k % 2 === 0 ? -1 : 1, v = n * 4 + k;
      pos[v * 3] = end ? x1 : x0; pos[v * 3 + 1] = end ? g1 : g0; pos[v * 3 + 2] = end ? z1 : z0;
      seg[v * 4] = dx; seg[v * 4 + 1] = dz; seg[v * 4 + 2] = side * halfPx; seg[v * 4 + 3] = (end ? 1 : -1) * capPx;
      misc[v * 3] = along0 + (end ? len : 0); misc[v * 3 + 1] = dashed; misc[v * 3 + 2] = end ? l1 : l0;
      col[v * 4] = r; col[v * 4 + 1] = g; col[v * 4 + 2] = b; col[v * 4 + 3] = end ? a1 : a0;
    }
    n++;
  }
  const flush = (a: THREE.BufferAttribute) => { a.clearUpdateRanges(); a.addUpdateRange(0, n * 4 * a.itemSize); a.needsUpdate = true; };
  const pts = new Float32Array((TRAIL_SAMPLES + 1) * 3);
  const slotTroop = new Int32Array(TRAIL_SLOTS).fill(-1), slotMark = new Int32Array(TRAIL_SLOTS).fill(-1);
  // Trails fade from this opacity at the party to nothing half an hour back (design assumption).
  const fade = (age: number) => 0.86 * Math.pow(1 - Math.min(1, age), 1.5) + 0.07;
  function rebuild(pm: PartyMap, worldTime: number, troopColour: (troopId: number) => THREE.Color, highlightTroopId: number | null): void {
    n = 0;
    const tr = pm.trails;
    slotMark.fill(-1);
    for (let i = 0; i < pm.n; i++) { const m = pm.marks[i]; if (m.slot >= 0 && m.slot < TRAIL_SLOTS) { slotMark[m.slot] = i; slotTroop[m.slot] = m.troopId; } }
    for (let s = 0; s < tr.cap && s < TRAIL_SLOTS; s++) {
      if (tr.id[s] < 0) { slotTroop[s] = -1; continue; }
      let k = trailPoints(tr, s, worldTime, pts);
      // The party's place now closes the trail (a party that is gone leaves its trail to fade where it ended).
      const mi = slotMark[s];
      if (mi >= 0 && k > 0) { pts[k * 3] = pm.marks[mi].x; pts[k * 3 + 1] = pm.marks[mi].z; pts[k * 3 + 2] = 0; k++; }
      if (k < 2 || slotTroop[s] < 0) continue;
      const c = troopColour(slotTroop[s]), dim = highlightTroopId !== null && highlightTroopId !== slotTroop[s] ? 0.3 : 1;
      let along = 0;
      for (let j = 0; j + 1 < k; j++) {
        const x0 = pts[j * 3], z0 = pts[j * 3 + 1], x1 = pts[j * 3 + 3], z1 = pts[j * 3 + 4];
        if (Math.abs(x1 - x0) + Math.abs(z1 - z0) < 0.05) continue;   // the party did not move
        put(x0, z0, x1, z1, c.r, c.g, c.b, fade(pts[j * 3 + 2]) * dim, fade(pts[j * 3 + 5]) * dim, TRAIL_HALF_PX, 0, 0, along);
        along += Math.hypot(x1 - x0, z1 - z0);
      }
    }
    trails = n;
    for (let i = 0; i < pm.n; i++) {
      const m = pm.marks[i];
      if (m.goalKind === GOAL_NONE) continue;
      const toCall = m.goalKind === GOAL_CALL, c = troopColour(m.troopId), dim = highlightTroopId !== null && highlightTroopId !== m.troopId ? 0.3 : 1;
      // To a tree: the community colour, lightened; to a call: the call's colour.
      const r = toCall ? HOOT.r : c.r * 0.5 + 0.5, g = toCall ? HOOT.g : c.g * 0.5 + 0.5, b = toCall ? HOOT.b : c.b * 0.5 + 0.5;
      put(m.x, m.z, m.goalX, m.goalZ, r, g, b, 0.85 * dim, 0.85 * dim, GOAL_HALF_PX, 0, 1, 0);
      put(m.goalX, m.goalZ, m.goalX, m.goalZ, r, g, b, 0.95 * dim, 0.95 * dim, GOAL_DOT_PX, GOAL_DOT_PX, 0, 0);   // the goal: a small square
    }
    goals = (n - trails) / 2;
    geometry.setDrawRange(0, n * 6);
    flush(aPos); flush(aSeg); flush(aMisc); flush(aCol);
  }
  return { mesh, uniforms, rebuild, get segments() { return n; }, get trailSegments() { return trails; }, get goalLines() { return goals; } };
}

// --- Call arcs ------------------------------------------------------------------------------------------------

// As many rings as the call log lets be in the air at once (callreach.ts ARC_MAX), so none is cut off while it grows.
const MAX_ARCS = ARC_MAX, ARC_STEPS = 192, ARC_HALF_PX = 2.6;

export interface CallArcs {
  mesh: THREE.Mesh;
  uniforms: { uPx: { value: number }; uLift: { value: number }; uA: { value: number } };
  /** Per frame while the view can show them: one ring per fresh call of the log. Returns the rings drawn. */
  update(log: CallLog, now: number): number;
  /** The rings drawn last (diagnostics): call id, kind, the call's radius and the radius drawn, age in seconds. */
  readout(log: CallLog, now: number): { id: number; kind: CallKind; x: number; z: number; radius: number; drawn: number; age: number }[];
}
export function createCallArcs(owner: Owner, heights: MarkHeights): CallArcs {
  const geometry = owner.own(new THREE.InstancedBufferGeometry());
  const ring = new Float32Array((ARC_STEPS + 1) * 2 * 3), index: number[] = [];
  for (let i = 0; i <= ARC_STEPS; i++) for (let s = 0; s < 2; s++) { const v = (i * 2 + s) * 3; ring[v] = i / ARC_STEPS * Math.PI * 2; ring[v + 1] = s * 2 - 1; ring[v + 2] = 0; }
  for (let i = 0; i < ARC_STEPS; i++) { const a = i * 2; index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  geometry.setAttribute('position', new THREE.BufferAttribute(ring, 3));   // x: angle, y: side (−1 inner, +1 outer)
  geometry.setIndex(index);
  const arc = new Float32Array(MAX_ARCS * 4), arcY = new Float32Array(MAX_ARCS * 2), arcCol = new Float32Array(MAX_ARCS * 3);
  const aArc = new THREE.InstancedBufferAttribute(arc, 4).setUsage(THREE.DynamicDrawUsage), aArcY = new THREE.InstancedBufferAttribute(arcY, 2).setUsage(THREE.DynamicDrawUsage);
  const aArcCol = new THREE.InstancedBufferAttribute(arcCol, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aArc', aArc); geometry.setAttribute('aArcY', aArcY); geometry.setAttribute('aArcCol', aArcCol);
  geometry.instanceCount = 0;
  const uniforms = { uPx: { value: 1 }, uLift: { value: 1 }, uA: { value: 1 } };
  const material = owner.own(new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      attribute vec4 aArc;      // centre x, z; radius (m); opacity
      attribute vec2 aArcY;     // height on the ground; lift to the canopy top (m)
      attribute vec3 aArcCol;
      uniform float uPx; uniform float uLift;
      varying vec4 vCol; varying float vEdge;
      void main() {
        float r = max( 0.0, aArc.z + position.y * ${ARC_HALF_PX.toFixed(1)} * uPx );
        vec3 p = vec3( aArc.x + cos( position.x ) * r, aArcY.x + aArcY.y * uLift, aArc.y + sin( position.x ) * r );
        vCol = vec4( aArcCol, aArc.w ); vEdge = position.y;
        gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
      }`,
    fragmentShader: /* glsl */`
      uniform float uA;
      varying vec4 vCol; varying float vEdge;
      void main() {
        float a = vCol.a * uA * ( 1.0 - smoothstep( 0.3, 1.0, abs( vEdge ) ) );
        if ( a < 0.01 ) discard;
        gl_FragColor = vec4( vCol.rgb, a );
      }`,
    transparent: true, depthTest: false, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true,
  }));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'overview-call-arcs';
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.visible = false;
  function update(log: CallLog, now: number): number {
    let k = 0;
    for (let i = 0; i < log.n && k < MAX_ARCS; i++) {
      const s = (log.next - 1 - i + 2 * log.cap) % log.cap, age = now - log.at[s];
      if (age >= ARC_LIFE_S) break;   // newest first: the rest are older
      if (age < 0) continue;
      const x = log.x[s], z = log.z[s], g = heights.ground(x, z) + 1.2, c = ARC_COLOURS[log.kind[s]] ?? HOOT;
      arc[k * 4] = x; arc[k * 4 + 1] = z; arc[k * 4 + 2] = arcRadius(log.radius[s], age); arc[k * 4 + 3] = arcAlpha(age) * 0.9;
      arcY[k * 2] = g; arcY[k * 2 + 1] = heights.top(x, z) + LINE_TOP + 1 - g;
      arcCol[k * 3] = c.r; arcCol[k * 3 + 1] = c.g; arcCol[k * 3 + 2] = c.b;
      k++;
    }
    geometry.instanceCount = k;
    mesh.visible = k > 0;
    if (k > 0) {
      aArc.clearUpdateRanges(); aArc.addUpdateRange(0, k * 4); aArc.needsUpdate = true;
      aArcY.clearUpdateRanges(); aArcY.addUpdateRange(0, k * 2); aArcY.needsUpdate = true;
      aArcCol.clearUpdateRanges(); aArcCol.addUpdateRange(0, k * 3); aArcCol.needsUpdate = true;
    }
    return k;
  }
  function readout(log: CallLog, now: number) {
    const out: { id: number; kind: CallKind; x: number; z: number; radius: number; drawn: number; age: number }[] = [];
    for (let i = 0; i < log.n && out.length < MAX_ARCS; i++) {
      const s = (log.next - 1 - i + 2 * log.cap) % log.cap, age = now - log.at[s];
      if (age >= ARC_LIFE_S) break;
      if (age >= 0) out.push({ id: log.id[s], kind: log.kind[s], x: log.x[s], z: log.z[s], radius: log.radius[s], drawn: arcRadius(log.radius[s], age), age });
    }
    return out;
  }
  return { mesh, uniforms, update, readout };
}
