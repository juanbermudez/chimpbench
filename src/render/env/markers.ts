import * as THREE from 'three';
import type { Stimulus, World } from '../../types';
import { Owner } from './shared';

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
