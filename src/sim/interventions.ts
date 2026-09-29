import type { Vec3 } from 'math';
import type { InterventionKind, Party, Stimulus, Troop, World } from '../types';
import { nearestNeighbor } from './candidates';
import { setWeather } from './environment';
import { addEvent, interrupt, nextId } from './events';
import { spawnPrey } from './generation';
import { recomputeHierarchies } from './hierarchy';
import { killChimp } from './life';
import { clamp } from './rng';
import { paramsOf } from './params';
import { NEVER, index, ix, simOf } from './state';

function mainParty(world: World, troop: Troop): Party | undefined {
  let best: Party | undefined;
  for (const p of world.parties) if (p.troopId === troop.id && (!best || p.members.length > best.members.length)) best = p;
  return best;
}

/**
 * Field-experiment style perturbations. Only individuals who can see or hear a stimulus react:
 * each is perceived locally and appears in observe().stimuli as plain words.
 * options.position is the observer's focus (usually a party); each protocol places its stimulus relative to it.
 */
export function applyIntervention(world: World, kind: InterventionKind, options: { troopId?: number; position?: Vec3 } = {}): Stimulus | null {
  const s = simOf(world);
  const idx = index(world);
  const time = world.time;
  const P = paramsOf(world);
  const troop = idx.troopById.get(options.troopId ?? -1) ?? world.troops.reduce((a, t) => t.adultMales + t.femaleHierarchy.length > a.adultMales + a.femaleHierarchy.length ? t : a);
  const party = mainParty(world, troop);
  const anchor: Vec3 = options.position ? [options.position[0], 0, options.position[2]] : party ? [party.center[0], 0, party.center[2]] : [troop.center[0], 0, troop.center[2]];
  const lim = world.size / 2 - 2;
  const make = (position: Vec3, radius: number, hours: number, label: string): Stimulus => {
    const st: Stimulus = { id: nextId(world), kind, position: [clamp(position[0], -lim, lim), position[1], clamp(position[2], -lim, lim)], radius, start: time, end: time + hours, troopId: troop.id, label };
    world.stimuli.push(st);
    return st;
  };
  const within = (p: Vec3, r: number, fn: (id: number) => void) => {
    for (const c of idx.alive) if (c.alive && Math.hypot(c.position[0] - p[0], c.position[2] - p[2]) <= r) fn(c.id);
  };
  let st: Stimulus | null = null;
  switch (kind) {
    case 'playback-stranger': {
      // Speaker ~18 m (map-scaled) outward from the focus point toward the range edge, after Wilson, Hauser & Wrangham (2001).
      // options.position is the focus (e.g. the selected chimp), never the speaker itself: a call from 1 m away is a startle, not an intrusion.
      let dx = anchor[0] - troop.center[0], dz = anchor[2] - troop.center[2];
      let l = Math.hypot(dx, dz);
      if (l < 5) { const nb = idx.troopById.get(nearestNeighbor(world, idx.byId.get(party?.members[0] ?? -1) ?? world.chimps[0]))!; dx = nb.center[0] - troop.center[0]; dz = nb.center[2] - troop.center[2]; l = Math.hypot(dx, dz); }
      const pos: Vec3 = [anchor[0] + dx / l * P.playbackDistM, 0, anchor[2] + dz / l * P.playbackDistM];
      let neighbor = -1, nd = Infinity;
      for (const t of world.troops) { if (t.id === troop.id) continue; const d = Math.hypot(t.center[0] - pos[0], t.center[2] - pos[2]); if (d < nd) { nd = d; neighbor = t.id; } }
      st = make(pos, P.playbackRadiusM, P.playbackDurationH, `Playback: a stranger male's pant-hoot at the edge of the ${troop.name} range`);
      world.calls.push({ id: nextId(world), kind: 'pant-hoot', callerId: -1, troopId: neighbor, position: [st.position[0], 0, st.position[2]], time, radius: P.playbackRadiusM });
      const stim = st;
      within(stim.position, stim.radius, id => {
        const c = idx.byId.get(id)!;
        if (c.troopId === neighbor) return;
        const x = ix(c);
        x.heardN = 1; x.heardAt = time; x.heardX = stim.position[0]; x.heardZ = stim.position[2]; x.heardTroop = neighbor; x.heardStim = stim.id; x.lastHeard = time;
        interrupt(world, c, 'heard a stranger male pant-hoot', true);
      });
      break;
    }
    case 'snake-model': {
      const member = party ? idx.byId.get(party.members[Math.floor(party.members.length / 2)]) : undefined;
      // Placed ~4 m from the focus so some party members see it and others do not.
      const base = options.position ? anchor : member ? member.position : anchor;
      const a = (time * 7.3) % (Math.PI * 2);
      st = make([base[0] + Math.cos(a) * P.snakeDistM, 0, base[2] + Math.sin(a) * P.snakeDistM], P.snakeRadiusM, P.snakeDurationH, `Snake model near a ${troop.name} party (after Crockford et al. 2012)`);
      const stim = st;
      const aware: number[] = [];
      within(stim.position, P.snakeAwareM, id => { aware.push(id); interrupt(world, idx.byId.get(id)!, 'saw a snake', true); });
      s.aware[stim.id] = aware;
      break;
    }
    case 'fig-mast': {
      let fig = idx.treeById.get(s.figTree);
      let bd = Infinity;
      for (const t of world.trees) {
        if (!t.species.startsWith('Ficus')) continue;
        const d = Math.hypot(t.position[0] - anchor[0], t.position[2] - anchor[2]);
        if (d < bd) { bd = d; fig = t; }
      }
      if (!fig) return null;
      s.figTree = fig.id; s.figUntil = time + P.figMastDurationH;
      fig.fruit = fig.maxFruit * P.figMastLevel;
      if (P.patchEcology === 1) delete fig.depletion; // the crop target is the mast level while it lasts (phenology.ts)
      st = make([fig.position[0], 0, fig.position[2]], P.figMastRadiusM, P.figMastDurationH, `Fig mast: a large ${fig.species} crop ripens at once`);
      within(st.position, P.figMastInterruptM, id => interrupt(world, idx.byId.get(id)!, 'a huge fig crop is ripe nearby'));
      break;
    }
    case 'storm': {
      setWeather(world, 'storm', P.stormIntensity);
      s.weather.forcedUntil = time + P.stormDurationH;
      st = make([0, 0, 0], world.size, P.stormDurationH, 'Storm: heavy rain and lightning now');
      break;
    }
    case 'drought': {
      s.droughtUntil = time + P.droughtDurationH;
      if (P.patchEcology !== 1) for (const t of world.trees) t.fruit *= P.droughtCropFactor; // patch ecology: cropTarget applies the drought factors
      world.environment.fruitIndex *= P.droughtFruitFactor;
      st = make([0, 0, 0], world.size, P.droughtDurationH, 'Drought: fruit scarce across the forest for three days');
      break;
    }
    case 'remove-alpha': {
      const alpha = idx.byId.get(troop.alphaId);
      if (!alpha || !alpha.alive) return null;
      s.alphaHow[troop.id] = `vacancy after ${alpha.name} disappeared`;
      s.unstableUntil[troop.id] = time + P.removeAlphaUnstableH;
      s.vacantUntil[troop.id] = time + P.removeAlphaVacancyH;
      const pos: Vec3 = [alpha.position[0], 0, alpha.position[2]];
      // the remaining top males' standing is unsettled without the alpha: their Elo gaps narrow and contests decide
      const top = troop.maleHierarchy.map(id => idx.byId.get(id)!).filter(m => m && m.alive && m !== alpha && m.age >= 15).slice(0, 3);
      if (top.length > 1) { const mean = top.reduce((a, m) => a + m.elo, 0) / top.length; top.forEach((m, i) => { m.elo = mean + P.removeAlphaEloSpread * (top.length - 1 - 2 * i) / 2; }); }
      killChimp(world, alpha, 'disappeared (removed by intervention; presumed dead)', 2, `${alpha.name}, alpha male of the ${troop.name}, disappeared`);
      recomputeHierarchies(world);
      for (const m of top) interrupt(world, m, `${alpha.name} is gone`);
      st = make(pos, 0, 1 / 30, `Removed the alpha (${alpha.name}) of the ${troop.name}`);
      break;
    }
    case 'colobus-troop': {
      const a = (time * 3.1) % (Math.PI * 2);
      const p = spawnPrey(world, [anchor[0] + Math.cos(a) * P.colobusDistM, 0, anchor[2] + Math.sin(a) * P.colobusDistM]);
      s.huntDay[troop.id] = time + P.colobusHuntDayH; // the experiment provokes a hunting opportunity on demand
      st = make([p.position[0], 0, p.position[2]], P.colobusRadiusM, P.colobusDurationH, `A red colobus group arrives near a ${troop.name} party`);
      within(st.position, P.colobusRadiusM, id => interrupt(world, idx.byId.get(id)!, 'red colobus are moving overhead'));
      break;
    }
  }
  if (st) addEvent(world, `Intervention: ${st.label}`, 'system', [], troop.id, 1);
  return st;
}

export function pruneStimuli(world: World): void {
  const s = simOf(world);
  for (let i = world.stimuli.length - 1; i >= 0; i--) {
    const st = world.stimuli[i];
    if (st.end < world.time - 0.25) { world.stimuli.splice(i, 1); delete s.aware[st.id]; }
  }
  if (s.droughtUntil !== NEVER && s.droughtUntil < world.time) s.droughtUntil = NEVER;
}
