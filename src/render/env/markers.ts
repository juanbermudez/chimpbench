import * as THREE from 'three';
import type { Stimulus, ViewMode, World } from '../../types';
import { Owner } from './shared';
import { createBaseHeight } from './terrain';
import { agoWords, beliefAlpha, collectBeliefs, createBeliefMarks, treeById, MAX_BELIEFS } from './fruit';
import { preToneMapped } from '../creatures/util';

// Subtle in-world markers for experimental interventions: a warm glow over a
// masting fig, the model snake coiled on the ground, and a field speaker on
// a tripod emitting sound rings during a stranger playback.

interface Marker { group: THREE.Group; rings: THREE.Mesh[]; kind: Stimulus['kind']; }

export interface Markers {
  group: THREE.Group;
  update(world: World, elapsed: number, height: (x: number, z: number) => number): void;
}

export function createMarkers(owner: Owner): Markers {
  const group = new THREE.Group();
  group.name = 'stimulus-markers';
  const ringGeometry = owner.own(new THREE.RingGeometry(0.92, 1, 64));
  ringGeometry.rotateX(-Math.PI / 2);
  const discGeometry = owner.own(new THREE.CircleGeometry(1, 48));
  discGeometry.rotateX(-Math.PI / 2);
  const glowMaterial = (color: string) => owner.own(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const snakeMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#3d4a22', roughness: 0.5 }));
  const speakerMaterial = owner.own(new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.4, metalness: 0.3 }));
  const snakeCurve = new THREE.CatmullRomCurve3(Array.from({ length: 14 }, (_, i) => new THREE.Vector3(Math.cos(i * 0.9) * (0.5 - i * 0.02), 0.06, i * 0.12 - 0.8 + Math.sin(i * 0.9) * 0.3)));
  const snakeGeometry = owner.own(new THREE.TubeGeometry(snakeCurve, 60, 0.05, 6, false));
  const boxGeometry = owner.own(new THREE.BoxGeometry(0.35, 0.28, 0.25));
  const legGeometry = owner.own(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4));
  const markers = new Map<number, Marker>();

  function build(stimulus: Stimulus): Marker | null {
    const g = new THREE.Group();
    const rings: THREE.Mesh[] = [];
    if (stimulus.kind === 'fig-mast') {
      const disc = new THREE.Mesh(discGeometry, glowMaterial('#ffb347'));
      disc.scale.setScalar(Math.max(4, stimulus.radius * 0.5));
      rings.push(disc);
      const ring = new THREE.Mesh(ringGeometry, glowMaterial('#ffd27a'));
      ring.scale.setScalar(Math.max(5, stimulus.radius * 0.6));
      rings.push(ring);
      g.add(disc, ring);
    } else if (stimulus.kind === 'snake-model') {
      const snake = new THREE.Mesh(snakeGeometry, snakeMaterial);
      snake.castShadow = true;
      g.add(snake);
      const ring = new THREE.Mesh(ringGeometry, glowMaterial('#ff6a4a'));
      ring.scale.setScalar(2.2);
      rings.push(ring);
      g.add(ring);
    } else if (stimulus.kind === 'playback-stranger') {
      const box = new THREE.Mesh(boxGeometry, speakerMaterial);
      box.position.y = 1.25;
      box.castShadow = true;
      g.add(box);
      for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(legGeometry, speakerMaterial);
        const a = i / 3 * Math.PI * 2;
        leg.position.set(Math.cos(a) * 0.22, 0.58, Math.sin(a) * 0.22);
        leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
        g.add(leg);
      }
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(ringGeometry, glowMaterial('#b6e3ff'));
        ring.position.y = 0.1;
        rings.push(ring);
        g.add(ring);
      }
    } else return null;
    group.add(g);
    return { group: g, rings, kind: stimulus.kind };
  }

  return {
    group,
    update(world, elapsed, height) {
      const stimuli = (world as Partial<World>).stimuli ?? [];
      const live = new Set<number>();
      for (const s of stimuli) {
        live.add(s.id);
        let m = markers.get(s.id);
        if (!m) { const built = build(s); if (!built) continue; m = built; markers.set(s.id, m); }
        const x = s.position[0], z = s.position[2];
        m.group.position.set(x, height(x, z) + 0.08, z);
        const remaining = s.end - world.time;
        const fade = THREE.MathUtils.clamp(Math.min((world.time - s.start) * 20, remaining * 10), 0, 1);
        m.group.visible = fade > 0.01;
        if (m.kind === 'fig-mast') {
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.6);
          (m.rings[0].material as THREE.MeshBasicMaterial).opacity = fade * (0.05 + pulse * 0.04);
          (m.rings[1].material as THREE.MeshBasicMaterial).opacity = fade * (0.25 + pulse * 0.15);
        } else if (m.kind === 'snake-model') {
          (m.rings[0].material as THREE.MeshBasicMaterial).opacity = fade * (0.18 + 0.12 * Math.sin(elapsed * 3));
        } else {
          m.rings.forEach((ring, i) => {
            const t = (elapsed * 0.6 + i / 3) % 1;
            ring.scale.setScalar(0.5 + t * Math.max(8, s.radius * 0.25));
            (ring.material as THREE.MeshBasicMaterial).opacity = fade * (1 - t) * 0.35;
          });
        }
      }
      for (const [id, m] of markers) if (!live.has(id)) { group.remove(m.group); markers.delete(id); }
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Stage W7: what the selected animal knows about trees (docs/staging/w7-fruit.md). A STYLIZATION and an overlay: a
// hollow diamond over each tree in its memory (fainter the longer since it saw the tree), a heavier one over each tree
// an option on its list goes to, the heaviest over the tree its act in progress goes to, with a dashed line from the
// animal and one line of text. Hollow, where the truth layer (overview.ts createFruitLayer) is filled: an outline with
// nothing inside is a tree it remembers that carries no crop to speak of now.
// Read from the public contract only (fruit.ts collectBeliefs: chimp.memory, chimp.candidates, chimp.action and
// targetId). The crop it BELIEVES a tree holds is in chimp.sim and is not shown; a contract field would add it.
// One instanced mesh (one draw call while an animal is selected); the marks are recomputed when the simulation ticks
// or the selection changes, never per frame; per frame: four uniforms, one projection for the label.
// ---------------------------------------------------------------------------------------------------------------------

export interface BeliefFrame {
  /** The Food layer toggle. */
  on: boolean;
  selectedId: number | null;
  camera: THREE.Camera; mode: ViewMode;
  viewW: number; viewH: number; dt: number;
}
export interface BeliefMarkers {
  mesh: THREE.Mesh;
  update(world: World, frame: BeliefFrame): void;
  /** Probes: marks drawn (memory, options, target), the label's text and the overlay's opacity. */
  stats(): { marks: number; memory: number; options: number; target: number; label: string; alpha: number };
  dispose(): void;
}

/** position(id, out): where the animal is drawn (the scene's getPosition). */
export function createBeliefMarkers(world0: World, owner: Owner, container: HTMLElement, position: (id: number, out: THREE.Vector3) => boolean): BeliefMarkers {
  const baseHeight = createBaseHeight(world0.seed);
  const MAX = MAX_BELIEFS + 1;   // + the line to the target
  const quad = owner.own(new THREE.InstancedBufferGeometry());
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 2, 1, 3]);
  const at = new Float32Array(MAX * 3), style = new Float32Array(MAX * 3);
  const atAttr = new THREE.InstancedBufferAttribute(at, 3), styleAttr = new THREE.InstancedBufferAttribute(style, 3);
  quad.setAttribute('aAt', atAttr); quad.setAttribute('aStyle', styleAttr);
  quad.instanceCount = 0;
  const uniforms = {
    uViewport: { value: new THREE.Vector2(1440, 900) }, uAlpha: { value: 0 }, uFrom: { value: new THREE.Vector3() },
    // Cream for memory, the interface's accent gold for options and the target; compensated for the tone-mapping pass.
    uMemory: { value: preToneMapped('#f1ead8', new THREE.Color()) }, uOption: { value: preToneMapped('#e2bf79', new THREE.Color()) },
  };
  const material = owner.own(new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      attribute vec3 aAt; attribute vec3 aStyle;
      uniform vec2 uViewport; uniform vec3 uFrom;
      varying vec2 vQ; varying vec3 vStyle; varying float vLen;
      void main() {
        // aStyle = (radius px, kind: 0 memory | 1 option | 2 the act's target | 3 the line from the animal, opacity)
        vStyle = aStyle; vLen = 0.0; vQ = vec2( 0.0 );
        vec4 clip = projectionMatrix * viewMatrix * vec4( aAt, 1.0 );
        if ( aStyle.y < 2.5 ) {
          float R = aStyle.x + 3.0;
          clip.xy += position.xy * R * 2.0 / uViewport * clip.w;
          vQ = position.xy * R;
        } else {
          vec4 from = projectionMatrix * viewMatrix * vec4( uFrom, 1.0 );
          if ( from.w <= 0.0 || clip.w <= 0.0 ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); return; }
          vec2 a = from.xy / from.w * uViewport * 0.5, b = clip.xy / clip.w * uViewport * 0.5;
          vec2 dir = b - a; vLen = length( dir ); dir /= max( vLen, 1e-3 );
          float t = position.x * 0.5 + 0.5;
          clip = mix( from, clip, t );
          clip.xy += vec2( - dir.y, dir.x ) * position.y * 3.0 * 2.0 / uViewport * clip.w;
          vQ = vec2( t * vLen, position.y * 3.0 );
        }
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */`
      uniform float uAlpha; uniform vec3 uMemory; uniform vec3 uOption;
      varying vec2 vQ; varying vec3 vStyle; varying float vLen;
      void main() {
        float a; vec3 col = vStyle.y < 0.5 ? uMemory : uOption;
        if ( vStyle.y < 2.5 ) {
          // A hollow diamond; heavier for an option, heaviest (with a centre point) for the tree the act goes to.
          float d = abs( vQ.x ) + abs( vQ.y ), w = vStyle.y < 0.5 ? 0.9 : vStyle.y < 1.5 ? 1.4 : 2.0;
          float line = 1.0 - smoothstep( w, w + 1.0, abs( d - vStyle.x ) );
          float dark = ( 1.0 - smoothstep( w + 0.8, w + 2.4, abs( d - vStyle.x ) ) ) * 0.45;   // a dark halo so it reads on pale canopy
          float dot_ = vStyle.y > 1.5 ? 1.0 - smoothstep( 1.6, 2.6, d ) : 0.0;
          a = max( max( line, dot_ ), dark );
          col = mix( vec3( 0.02 ), col, clamp( max( line, dot_ ) / max( a, 1e-3 ), 0.0, 1.0 ) );
        } else {
          // Dashes 7 px on, 6 off, stopping short of the animal and of the target's diamond.
          float dash = step( fract( vQ.x / 13.0 ), 0.54 ) * step( 10.0, vQ.x ) * step( vQ.x, vLen - 16.0 );
          a = dash * ( 1.0 - smoothstep( 0.8, 1.8, abs( vQ.y ) ) ) * 0.9;
        }
        a *= vStyle.z * uAlpha;
        if ( a < 0.01 ) discard;
        gl_FragColor = vec4( col, a );
      }`,
    transparent: true, depthTest: false, depthWrite: false, fog: false,
  }));
  const mesh = new THREE.Mesh(quad, material);
  mesh.name = 'belief-markers';
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;   // above the fruit layer and the party markers
  mesh.visible = false;

  // One line of text at the tree the act goes to (DOM; moved with CSS variables, written only when they change).
  const root = document.createElement('div');
  root.className = 'mg-belief-root';
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '1' });
  const label = document.createElement('div');
  Object.assign(label.style, {
    position: 'absolute', left: '0', top: '0', font: '500 11px/1.25 system-ui, sans-serif', color: '#f1ead8', background: 'rgba(12, 14, 13, 0.66)',
    padding: '2px 7px', borderRadius: '4px', borderLeft: '2px solid #e2bf79', whiteSpace: 'nowrap', willChange: 'transform', opacity: '0', transition: 'opacity 0.2s',
    transform: 'translate(var(--ox,0px), var(--oy,0px)) translate(14px, -50%)',
  });
  root.appendChild(label);
  container.appendChild(root);

  const marks = createBeliefMarks();
  let worldRef = world0;
  const treeOf = (id: number) => treeById(worldRef.trees, id);
  let n = 0, nMem = 0, nOpt = 0, target = -1, lastTick = -1, lastId = -2, lastMode: ViewMode | '' = '', lastTrees: World['trees'] | null = null;
  let alpha = 0, text = '', shownText = '', shown = false, lpx = -1, lpy = -1;
  const from = new THREE.Vector3(), tmp = new THREE.Vector3();

  function rebuild(w: World, id: number, mode: ViewMode) {
    worldRef = w;
    const c = w.chimps.find(x => x.id === id);
    const count = c ? collectBeliefs(c, w.time, treeOf, marks) : 0;
    n = 0; nMem = 0; nOpt = 0; target = -1; text = '';
    for (let i = 0; i < count; i++) {
      const b = marks[i];
      // The close view shows only where it is going (a sky full of diamonds would bury the animal); the strategy view all.
      if (mode !== 'rts' && b.kind !== 2) continue;
      const t = treeOf(b.treeId);
      at[n * 3] = b.x; at[n * 3 + 1] = Math.max(1, baseHeight(b.x, b.z)) + (t ? t.height : 20); at[n * 3 + 2] = b.z;
      style[n * 3] = b.kind === 2 ? 12 : b.kind === 1 ? 9.5 : 7.5; style[n * 3 + 1] = b.kind; style[n * 3 + 2] = b.kind === 0 ? beliefAlpha(b.hours) : 1;
      if (b.kind === 2) { target = n; const ago = agoWords(b.hours); text = `${c!.action === 'travel' ? 'going to' : c!.action === 'nest' ? 'nesting in' : 'in'} a ${t ? t.common : 'tree'} it ${b.hours < 0 ? 'knows of' : 'remembers'}${ago ? ` · ${ago}` : ''}`; }
      else if (b.kind === 1) nOpt++; else nMem++;
      n++;
    }
    if (target >= 0) {   // the line: from the animal (uFrom, per frame) to the target
      at[n * 3] = at[target * 3]; at[n * 3 + 1] = at[target * 3 + 1]; at[n * 3 + 2] = at[target * 3 + 2];
      style[n * 3] = 0; style[n * 3 + 1] = 3; style[n * 3 + 2] = 1;
      n++;
    }
    quad.instanceCount = n;
    atAttr.clearUpdateRanges(); atAttr.addUpdateRange(0, Math.max(1, n) * 3); atAttr.needsUpdate = true;
    styleAttr.clearUpdateRanges(); styleAttr.addUpdateRange(0, Math.max(1, n) * 3); styleAttr.needsUpdate = true;
  }

  function update(w: World, f: BeliefFrame) {
    const id = f.on && f.mode !== 'cinematic' && f.selectedId !== null ? f.selectedId : -1;
    // Recompute when the simulation has ticked, the selection or the view changed, or a world was swapped in. With
    // nothing selected the last marks stay and fade out.
    if (id >= 0 && (w.tick !== lastTick || id !== lastId || f.mode !== lastMode || w.trees !== lastTrees)) { lastTick = w.tick; lastId = id; lastMode = f.mode; lastTrees = w.trees; rebuild(w, id, f.mode); }
    if (id < 0) lastId = -2;
    const want = id >= 0 && n > 0 ? 1 : 0;
    alpha += (want - alpha) * (1 - Math.exp(-Math.max(0, f.dt) / 0.25));
    if (f.dt <= 0) alpha = want;   // paused harness frames: no easing clock
    mesh.visible = alpha > 0.01;
    let labelOn = false;
    if (mesh.visible) {
      uniforms.uAlpha.value = alpha;
      uniforms.uViewport.value.set(Math.max(1, f.viewW), Math.max(1, f.viewH));
      if (id >= 0 && position(id, from)) uniforms.uFrom.value.set(from.x, from.y + 0.6, from.z);
      if (target >= 0 && want === 1) {
        tmp.set(at[target * 3], at[target * 3 + 1], at[target * 3 + 2]).project(f.camera);
        labelOn = tmp.z < 1 && Math.abs(tmp.x) < 1 && Math.abs(tmp.y) < 1;
        if (labelOn) {
          const px = Math.round((tmp.x * 0.5 + 0.5) * f.viewW), py = Math.round((-tmp.y * 0.5 + 0.5) * f.viewH);
          if (px !== lpx) { lpx = px; label.style.setProperty('--ox', `${px}px`); }
          if (py !== lpy) { lpy = py; label.style.setProperty('--oy', `${py}px`); }
          if (text !== shownText) { shownText = text; label.textContent = text; }
        }
      }
    }
    if (labelOn !== shown) { shown = labelOn; label.style.opacity = labelOn ? '1' : '0'; }
  }

  return {
    mesh, update,
    stats: () => ({ marks: n, memory: nMem, options: nOpt, target: target >= 0 ? 1 : 0, label: text, alpha }),
    dispose() { root.remove(); },
  };
}
