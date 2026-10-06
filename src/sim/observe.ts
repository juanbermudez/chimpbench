import type { Candidate, Chimp, DecisionContext, SocialPercept, World } from '../types';
import { computeCandidates, dependentOn } from './candidates';
import { dayPhase } from './environment';
import { bond, relationOf } from './hierarchy';
import { historyLines, tensionOf } from './relations';
import { copyCandidate } from './menu';
import { bodyPercept, lightPercept, withValues } from './observe-state';
import { paramsOf } from './params';
import { index, isChimpId, ix, simOf, TICK_HOURS } from './state';
import { bodySights } from './deadbody';

const r2 = (v: number) => Math.round(v * 100) / 100;

function ago(hours: number): string {
  const min = hours * 60;
  if (min < 1) return 'just now';
  if (min < 90) return `${Math.round(min)} min ago`;
  if (hours < 36) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
const when = (hours: number) => { const s = ago(hours); return s[0].toUpperCase() + s.slice(1); };

/**
 * An interrupt is written in the present as it fires ("Tavuni is charging at me"). After that tick the act may be over
 * (a reconcile option can already be on offer), so progressive phrases turn past; the nearby line shows what is ongoing.
 */
function interruptLine(text: string, hours: number): string {
  if (hours < TICK_HOURS / 2) return `Just now: ${text}`;
  return `${when(hours)}: ${text.replace(/\b(is|are) (\w+ing|under attack)\b/, (_, v: string, act: string) => `${v === 'is' ? 'was' : 'were'} ${act}`)}`;
}

function dirWord(dx: number, dz: number): string {
  const a = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(a / 45) % 8];
}

/**
 * The model's view: built only from the focal chimp's last perception, memory and body.
 * Every chimp id used as a candidate target appears in social; candidates that would not fit are dropped.
 * Stage M1 (observeState 1; docs/staging/em-prereg.md, observe-state.ts): plus the animal's Track E state (`body`), the
 * light it sees (`light`) and each option's Track E values (`value`, on copies); at 0 the observation is unchanged.
 */
export function observe(world: World, c: Chimp): DecisionContext {
  const x = ix(c);
  const idx = index(world);
  const troop = idx.troopById.get(c.troopId);
  const time = world.time;
  const env = world.environment;
  const all: Candidate[] = computeCandidates(world, c, []);
  const px = c.position[0], pz = c.position[2];
  const perceivable = (id: number) => x.seen.includes(id) || c.memory.some(m => m.kind === 'chimp' && m.entityId === id) || id === x.caretaker || id === c.motherId;
  // relevance: candidate targets first (by score), then kin, alpha, allies, rivals, strangers, swollen females, meat holders
  const chosen: number[] = [];
  for (const cand of all) {
    if (chosen.length >= 8) break;
    if (isChimpId(cand.targetId) && !chosen.includes(cand.targetId) && perceivable(cand.targetId) && idx.byId.get(cand.targetId)?.alive) chosen.push(cand.targetId);
  }
  const rest: { id: number; v: number }[] = [];
  for (const id of x.seen) {
    if (chosen.includes(id)) continue;
    const o = idx.byId.get(id);
    if (!o || !o.alive) continue;
    const rel = relationOf(world, c, o);
    const d = Math.hypot(o.position[0] - px, o.position[2] - pz);
    let v = rel === 'mother' || rel === 'offspring' ? 10 : rel === 'stranger' ? 7 : rel === 'ally' || rel === 'rival' ? 5 : rel === 'maternal-sibling' ? 4 : 1;
    if (troop?.alphaId === o.id) v += 6;
    if (c.sex === 'male' && o.sex === 'female' && o.swelling > 0.7) v += 4;
    if (o.carryingMeat > 0.05) v += 4.5;
    if (c.lastConflict?.opponentId === o.id) v += 5;
    v += (1 - Math.min(1, d / Math.max(1, x.sight))) * 2 + bond(c, o);
    rest.push({ id, v });
  }
  rest.sort((a, b) => b.v - a.v || a.id - b.id);
  for (const r of rest) { if (chosen.length >= 8) break; chosen.push(r.id); }
  const social: SocialPercept[] = chosen.map(id => {
    const o = idx.byId.get(id)!;
    const same = o.troopId === c.troopId;
    return {
      id, name: o.name, relation: relationOf(world, c, o), sex: o.sex, ageYears: Math.round(o.age * 10) / 10, stage: o.stage,
      rankOrder: same ? o.rankOrder : 0, isAlpha: same && troop?.alphaId === o.id, bond: r2(bond(c, o)),
      distance: Math.round(Math.hypot(o.position[0] - px, o.position[2] - pz) * 10) / 10, action: o.action,
      swelling: r2(o.swelling), injured: o.injury > 0.15, hasMeat: o.carryingMeat > 0.05,
      ...(same ? { tension: r2(tensionOf(c, o)) } : {}),
    };
  });
  // stage ED (deadBody; deadbody.ts): the bodies in sight, and the options about them (a body is never in `social`)
  const bodies = paramsOf(world).deadBody === 1 ? bodySights(world, c) : [];
  const candidates = all.filter(k => !isChimpId(k.targetId) || chosen.includes(k.targetId) || bodies.some(b => b.id === k.targetId));
  const recent: string[] = [];
  const shown = x.lastIntr && time - x.lastIntrAt < 0.05 ? x.lastIntr : '';
  if (shown) recent.push(interruptLine(shown, time - x.lastIntrAt));
  // A later conflict can reset the coalition pair while its interrupt is throttled (interrupts are spaced), so a
  // "join my ally against X" option could name a conflict the state never mentions. Name the pair it refers to.
  if (time - x.coalAt < paramsOf(world).coalitionWindowH) {
    const a = idx.byId.get(x.coalA), b = idx.byId.get(x.coalB);
    if (a && b && a.alive && b.alive && a.id !== c.id && b.id !== c.id && !(shown.includes(a.name) && shown.includes(b.name)))
      recent.push(`${when(time - x.coalAt)}: ${a.name} clashed with ${b.name}`);
  }
  for (let i = c.episodes.length - 1; i >= 0 && recent.length < 5; i--) { const e = c.episodes[i]; recent.push(`${e.text} ${ago(time - e.time)}`); }
  const stimuli: string[] = [];
  const s = simOf(world);
  for (const id of x.stims) {
    const st = world.stimuli.find(q => q.id === id);
    if (!st || st.end <= time) continue;
    const dx = st.position[0] - px, dz = st.position[2] - pz, d = Math.max(1, Math.round(Math.hypot(dx, dz))), dir = dirWord(dx, dz);
    switch (st.kind) {
      case 'playback-stranger': stimuli.push(`A stranger male pant-hooted from the ${dir}, about ${d} m away`); break;
      case 'snake-model': {
        const aware = s.aware[st.id] ?? [];
        const unaware = x.seen.filter(sid => { const o = idx.byId.get(sid); return o && o.troopId === c.troopId && !aware.includes(sid); }).length;
        stimuli.push(`A snake lies still ${d} m ${dir}; ${unaware} group member${unaware === 1 ? '' : 's'} nearby ${unaware === 1 ? 'has' : 'have'} not seen it`);
        break;
      }
      case 'fig-mast': stimuli.push(`A huge fig crop is ripe ${d} m ${dir}`); break;
      case 'storm': stimuli.push('A heavy thunderstorm is pouring down'); break;
      case 'drought': stimuli.push('Fruit has been scarce everywhere for days'); break;
      case 'colobus-troop': stimuli.push(`Red colobus monkeys are moving through the canopy ${d} m ${dir}`); break;
      case 'remove-alpha': break;
    }
  }
  const heard = time - x.heardAt < 0.25 ? x.heardN : 0;
  if (heard > 0 && x.heardStim < 0) stimuli.push(`Heard ${heard} stranger${heard > 1 ? 's' : ''} pant-hoot from the ${dirWord(x.heardX - px, x.heardZ - pz)}, ${Math.round(Math.hypot(x.heardX - px, x.heardZ - pz))} m away`);
  const partySize = 1 + x.visibleOwn;
  const fromCenter = troop ? Math.hypot(px - troop.center[0], pz - troop.center[2]) : 0;
  const dep = world.chimps.some(k => k.alive && k.motherId === c.id && dependentOn(world, k) === c);
  // longer-term memory, only about individuals present in `social`
  const history = historyLines(world, c, chosen);
  const P = paramsOf(world), track = P.observeState === 1;
  return {
    chimpId: c.id, version: c.decisionVersion, time,
    focal: {
      name: c.name, ageYears: Math.round(c.age * 10) / 10, stage: c.stage, sex: c.sex, community: troop?.name ?? '',
      rankOrder: c.rankOrder, rankOf: troop ? (c.sex === 'male' ? troop.maleHierarchy.length : troop.femaleHierarchy.length) : 0,
      isAlpha: troop?.alphaId === c.id,
      hunger: r2(c.hunger), thirst: r2(c.thirst), energy: r2(c.energy), social: r2(c.social), stress: r2(c.stress), health: r2(c.health), injury: r2(c.injury),
      swelling: r2(c.swelling), lactating: c.lactating, hasDependentInfant: dep, carryingMeat: r2(c.carryingMeat),
      currentAction: c.action, mood: c.mood, personality: { ...c.personality }, skills: { ...c.skills },
    },
    environment: {
      hour: r2(world.hour), phase: dayPhase(world), weather: env.weather, rain: r2(env.rain), temperature: Math.round(env.temperature * 10) / 10,
      fruitNearby: r2(x.fruitNear), partySize, partyAdultMales: x.ownMales,
      nearTerritoryEdge: !!troop && fromCenter > troop.radius * 0.8, strangersSeen: x.strangers, strangersHeard: heard,
    },
    social, recent, stimuli, candidates: track ? withValues(world, c, candidates, P, copyCandidate) : candidates,
    ...(history.length ? { history } : {}),
    ...(track ? { body: bodyPercept(world, c, P), light: lightPercept(world) } : {}),
    ...(bodies.length ? { bodies } : {}),
  };
}

