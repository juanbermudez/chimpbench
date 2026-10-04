import type { Chimp, World } from '../types';
import { V } from './candidates';
import { addEvent, emitCall, endInteraction, episode, flashInteraction, gate, interrupt, startInteraction } from './events';
import { bond, dominates, eloUpdate, isAdultMale, strength, supporters, tryTakeover, winOdds } from './hierarchy';
import { killChimp } from './life';
import { clamp, random } from './rng';
import { noteEvent, recordAggression, recordWound, tensionOf } from './relations';
import { paramsOf, type Params } from './params';
import { endoOn, endoThreat } from './endocrine';
import { markDanger, noteContact, witnesses } from './contact';
import { massOf } from './energy';
import { index, ix, simOf } from './state';

const hd = (a: Chimp, b: Chimp) => Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);

/** Stage E4h (contestAssess; docs/staging/e4h-prereg.md §4): how far a contest goes follows the animals' assessments. */
export const assessOn = (P: Params) => P.contestAssess === 1;
/** Stage E4h: a wound scales with the striker's body mass over the struck animal's (design: force grows with the mass behind the blow). */
const massRatio = (striker: Chimp, struck: Chimp, P: Params) => massOf(striker, P) / Math.max(1, massOf(struck, P));

/**
 * Diagnosis hook (stage E4h, scripts/contest-diagnose.ts; docs/staging/e4h-prereg.md): null in every simulation. A
 * diagnosis script may set `contestTrace.on` to read each contest's inputs and outcomes as they are decided. The callback
 * must not write the world or draw from world.rng (determinism); nothing here changes the order of draws.
 */
export type ContestTrace =
  | { kind: 'ally'; o: Chimp; a: Chimp; v: Chimp; side: 'aggressor' | 'victim'; p: number; joined: boolean }
  | { kind: 'charge'; c: Chimp; o: Chimp; response: 'gave-way' | 'counter' | 'stood'; hitP: number; inRange: boolean; hit: boolean; escP: number; escalated: boolean; dominant: boolean; winP: number; won: boolean }
  | { kind: 'fight'; c: Chimp; o: Chimp; variant: number; winP: number; won: boolean; injury: number; seriousP: number; serious: boolean; winnerWound: number; died: boolean }
  | { kind: 'decided'; w: Chimp; l: Chimp; how: 'charge' | 'fight'; injury: number; eloW: number; eloL: number; dElo: number; allies: number; takeover: boolean };
export const contestTrace: { on: ((e: ContestTrace) => void) | null } = { on: null };
/** The win probability of the last contest() call (diagnosis only; contestTrace). */
let lastWinP = -1;

/**
 * Coalition kin of `w` (stage C8, early-life-prereg §2.5): its mother (for weaned offspring only while maternalLevers is on,
 * the ablation switch), its maternal siblings, and an adoptive caretaker while the ward is under guardMaxAgeY. Stage E4o
 * (bodyRules bit 2): the caretaker stays kin at any age, as the mother does (whether it joins is its own choice).
 */
export function coalitionKin(o: Chimp, w: Chimp, P: Params): boolean {
  const wx = ix(w);
  if (w.motherId === o.id) return P.maternalLevers === 1 || (!wx.weaned && w.age < 6);
  if (w.motherId > 0 && o.motherId === w.motherId) return true;
  return wx.caretaker === o.id && ((P.bodyRules & 2) !== 0 || w.age < P.guardMaxAgeY) && (P.maternalLevers === 1 || (!wx.weaned && w.age < 6));
}

/** Nearby bonded individuals are alerted and may join either side (coalitions). [M-H] */
export function notifyAllies(world: World, a: Chimp, v: Chimp): void {
  const P = paramsOf(world), maxRange = Math.max(P.coalitionRangeStrangerM, P.coalitionRangeM);
  for (const o of index(world).alive) {
    if (o === a || o === v || !o.alive) continue;
    if (o.action === 'nest' && ix(o).phase >= 2) continue;
    const dv = hd(o, v);
    if (dv > maxRange) continue;
    const kinOfV = coalitionKin(o, v, P), kinOfA = coalitionKin(o, a, P);
    if (o.age < 10 && !kinOfA && !kinOfV) continue;
    const ox = ix(o);
    if (((o.action === 'charge' || o.action === 'attack') && (o.targetId === v.id || o.targetId === a.id)) || (world.time - ox.coalAt < 0.1 && (ox.coalB === v.id || ox.coalB === a.id))) continue;
    const joiner = o.sex === 'male' && o.age >= 12;
    if (!joiner && !kinOfA && !kinOfV) continue;
    // stage E4h (contestAssess): no draw. Every bystander the gates admit perceives the conflict and is alerted; whether it
    // joins is its own choice (the coalition charge, scored by the coalition's assessed odds in candidates.ts). A bystander
    // bonded to both sides is alerted for the one it values more (kin counts as a full bond; ties: the aggressor's side)
    if (assessOn(P)) {
      const gateA = o.troopId === a.troopId && (bond(o, a) > P.coalitionBondMin || kinOfA) && (v.troopId !== a.troopId || !kinOfV) && dv < (v.troopId !== a.troopId ? P.coalitionRangeStrangerM : P.coalitionRangeM);
      const gateV = o.troopId === v.troopId && (bond(o, v) > P.coalitionBondMin || kinOfV) && dv < P.coalitionRangeM;
      if (!gateA && !gateV) continue;
      const forA = gateA && (!gateV || (kinOfA ? 1 : bond(o, a)) >= (kinOfV ? 1 : bond(o, v)));
      if (contestTrace.on) contestTrace.on({ kind: 'ally', o, a: forA ? a : v, v: forA ? v : a, side: forA ? 'aggressor' : 'victim', p: 1, joined: true });
      ox.coalA = forA ? a.id : v.id; ox.coalB = forA ? v.id : a.id; ox.coalAt = world.time;
      interrupt(world, o, forA ? `${a.name} is ${a.action === 'attack' ? 'attacking' : 'charging'} ${v.name}` : `${v.name} is under attack by ${a.name}`);
      continue;
    }
    // tension with the one who needs help lowers the chance of joining (design) [M: compatibility]
    // (E4h: written as two steps, the gate and the draw, so the diagnosis hook can read them; the draws are unchanged)
    let joinA = false;
    if (o.troopId === a.troopId && (bond(o, a) > P.coalitionBondMin || kinOfA) && (v.troopId !== a.troopId || !kinOfV) && dv < (v.troopId !== a.troopId ? P.coalitionRangeStrangerM : P.coalitionRangeM)) {
      const p = (v.troopId !== a.troopId ? P.coalitionStrangerP : P.coalitionBondP * bond(o, a)) * (1 - P.coalitionTensionW * tensionOf(o, a));
      joinA = random(world) < p;
      if (contestTrace.on) contestTrace.on({ kind: 'ally', o, a, v, side: 'aggressor', p, joined: joinA });
    }
    if (joinA) {
      ox.coalA = a.id; ox.coalB = v.id; ox.coalAt = world.time;
      interrupt(world, o, `${a.name} is ${a.action === 'attack' ? 'attacking' : 'charging'} ${v.name}`);
    } else if (o.troopId === v.troopId && (bond(o, v) > P.coalitionBondMin || kinOfV) && dv < P.coalitionRangeM) {
      const p = P.coalitionBondP * bond(o, v) * (1 - P.coalitionTensionW * tensionOf(o, v));
      const joinV = random(world) < p;
      if (contestTrace.on) contestTrace.on({ kind: 'ally', o, a: v, v: a, side: 'victim', p, joined: joinV });
      if (joinV) {
        ox.coalA = v.id; ox.coalB = a.id; ox.coalAt = world.time;
        interrupt(world, o, `${v.name} is under attack by ${a.name}`);
      }
    }
  }
}


function decided(world: World, w: Chimp, l: Chimp, how: 'charge' | 'fight', injury: number): void {
  const time = world.time;
  const eloW = w.elo, eloL = l.elo;
  eloUpdate(world, w, l);
  w.lastConflict = { opponentId: l.id, time, won: true };
  l.lastConflict = { opponentId: w.id, time, won: false };
  const lx = ix(l);
  const P = paramsOf(world);
  // stage E4a (endoRedirect): every loss is noted and nothing is drawn; whether he redirects follows from his stress load (candidates.ts)
  if (endoOn(P, 'endoRedirect')) lx.lostAt = time;
  else if (random(world) < P.redirectBaseP + P.redirectAggrP * l.personality.aggression) lx.lostAt = time; // redirected aggression follows some losses [M]
  lx.victimOf = w.id; lx.victimAt = time;
  endoThreat(world, l); // stage E4b (endoFast): a decided loss kicks the fast arousal
  world.stats.conflicts++;
  l.stress = clamp(l.stress + (how === 'fight' ? 0.35 : 0.2));
  w.stress = clamp(w.stress + 0.05);
  l.mood = injury > 0.05 ? 'distressed' : 'fearful';
  if (injury > 0) { l.injury = clamp(l.injury + injury); if (injury >= 0.05) world.stats.injuries++; }
  const allies = supporters(world, w, l);
  const troop = index(world).troopById.get(w.troopId);
  let takeover = false;
  if (troop && troop.alphaId === l.id && w.sex === 'male' && allies.length > 0) takeover = tryTakeover(world, w, l, allies.map(a => a.id));
  if (contestTrace.on) contestTrace.on({ kind: 'decided', w, l, how, injury, eloW, eloL, dElo: w.elo - eloW, allies: allies.length, takeover });
  episode(world, w, 'conflict', how === 'fight' ? `Won a fight against ${l.name}` : `Charged ${l.name}, who gave way`, l.id);
  episode(world, l, 'conflict', how === 'fight' ? `Lost a fight with ${w.name}${injury >= 0.3 ? ' and was badly wounded' : injury >= 0.05 ? ' and was wounded' : ''}` : `Was charged by ${w.name}`, w.id);
  if (takeover) return;
  const bothMales = isAdultMale(w) && isAdultMale(l);
  const serious = injury >= 0.3;
  const severity = serious ? 2 : how === 'fight' || bothMales ? 1 : 0;
  const key = `conflict-${w.troopId}-${severity}`;
  if (serious || gate(world, key, severity >= 1 ? 0.75 : 2)) {
    const help = allies.length ? ` with ${allies.map(a => a.name).join(' and ')}'s support` : '';
    const text = how === 'fight'
      ? `${w.name} fought ${l.name}${help}; ${l.name} lost${serious ? ' and was seriously wounded' : injury >= 0.05 ? ' and was wounded' : ''}`
      : `${w.name} charged ${l.name}${help}; ${l.name} ${l.action === 'flee' ? 'fled screaming' : 'crouched and screamed'}`;
    addEvent(world, text, 'conflict', [w.id, l.id, ...allies.map(a => a.id)], w.troopId, severity);
  }
}

/** Probability that a beats b in a contest, from relative power (strength, rank edge, coalition partners). */
export function contest(world: World, a: Chimp, b: Chimp): boolean {
  lastWinP = winOdds(world, a, b, paramsOf(world));
  return random(world) < lastWinP;
}

/**
 * Charges are mostly non-contact [H]. The target's response decides: giving way, counter-charging (a
 * power contest that sometimes escalates to contact), or standing its ground (also a power contest when
 * the charger is the subordinate). Returns true when the charge escalated into a fight that continues.
 */
export function resolveCharge(world: World, c: Chimp, o: Chimp): boolean {
  const P = paramsOf(world);
  if (o.troopId !== c.troopId) {
    if (o.action === 'flee' || hd(c, o) > P.chaseOffM) {
      episode(world, c, 'territory', `Chased off ${o.name}, a stranger`, o.id);
      episode(world, o, 'territory', `Was chased off by ${c.name}'s community`, c.id);
    } else interrupt(world, o, `${c.name} charged me`, true);
    return false;
  }
  const responded = o.targetId === c.id;
  const yielding = o.action === 'submit' || o.action === 'flee' || o.action === 'pant-grunt';
  // stage E4h iteration 1 (contestAssess): a target yielding to another aggressor of the same conflict (the one it submits
  // to or flees from is charging or attacking it, as a coalition partner's first charge does) has conceded too
  const gaveWay = yielding && (responded || (assessOn(P) && yieldsToAggressor(world, o)));
  if (gaveWay) {
    // stage E4h (contestAssess): the target conceded before contact, so the contest is settled without it (parker1974:
    // escalation only where both judge it worth it); no hit is drawn
    if (assessOn(P)) {
      if (contestTrace.on) contestTrace.on({ kind: 'charge', c, o, response: 'gave-way', hitP: 0, inRange: hd(c, o) < P.hitRangeM, hit: false, escP: 0, escalated: false, dominant: true, winP: 1, won: true });
      decided(world, c, o, 'charge', 0);
      return false;
    }
    // a minority of charges end in a brief hit or slap when the target is caught (contact is the exception) [H]
    const inRange = hd(c, o) < P.hitRangeM;
    const hit = inRange && random(world) < P.hitP;
    if (contestTrace.on) contestTrace.on({ kind: 'charge', c, o, response: 'gave-way', hitP: P.hitP, inRange, hit, escP: 0, escalated: false, dominant: true, winP: 1, won: true });
    if (hit) { flashInteraction(world, 'fight', c, o.id, [c.id, o.id], 0.7); emitCall(world, o, 'scream'); }
    decided(world, c, o, 'charge', hit ? 0.01 + random(world) * 0.04 : 0);
    return false;
  }
  if ((o.action === 'charge' || o.action === 'attack') && responded) {
    // stage E4h (contestAssess): the target answered with a counter-charge and the charger, challenged and having chosen
    // again (threatResponses: yield or persist, by its assessed odds), is still charging: neither conceded, so the
    // contest goes to contact (parker1974); no draw
    if (assessOn(P)) {
      if (contestTrace.on) contestTrace.on({ kind: 'charge', c, o, response: 'counter', hitP: 0, inRange: false, hit: false, escP: 1, escalated: true, dominant: false, winP: -1, won: false });
      escalate(world, c, o); return true;
    }
    // evenly matched opponents escalate to contact more often (design) [M for rarity of contact]
    const pa = strength(c, P), pb = strength(o, P);
    const even = Math.min(pa, pb) / Math.max(0.05, pa, pb);
    const escP = P.escalationBaseP + P.escalationEvenP * even ** P.escalationEvenExp;
    if (random(world) < escP) {
      if (contestTrace.on) contestTrace.on({ kind: 'charge', c, o, response: 'counter', hitP: 0, inRange: false, hit: false, escP, escalated: true, dominant: false, winP: -1, won: false });
      escalate(world, c, o); return true;
    }
    const won = contest(world, c, o);
    if (contestTrace.on) contestTrace.on({ kind: 'charge', c, o, response: 'counter', hitP: 0, inRange: false, hit: false, escP, escalated: false, dominant: false, winP: lastWinP, won });
    if (won) decided(world, c, o, 'charge', 0); else decided(world, o, c, 'charge', 0);
    return false;
  }
  const dominant = dominates(c, o);
  const won = dominant || contest(world, c, o);
  // stage E4h (contestAssess): a target that neither conceded nor resisted (it chose to go on with what it was doing) has
  // not given way, so a charger that prevails settles it by contact: a strike, its wound scaled by the masses
  const strike = assessOn(P) && won && hd(c, o) < P.hitRangeM;
  if (contestTrace.on) contestTrace.on({ kind: 'charge', c, o, response: 'stood', hitP: 0, inRange: hd(c, o) < P.hitRangeM, hit: strike, escP: 0, escalated: false, dominant, winP: dominant ? 1 : lastWinP, won });
  if (strike) {
    flashInteraction(world, 'fight', c, o.id, [c.id, o.id], 0.7); emitCall(world, o, 'scream');
    decided(world, c, o, 'charge', (0.01 + random(world) * 0.04) * massRatio(c, o, P));
  } else if (won) decided(world, c, o, 'charge', 0);
  else decided(world, o, c, 'charge', 0);
  return false;
}

/** Stage E4h iteration 1: the animal `o` submits to, flees from or pant-grunts at is charging or attacking it. Pure. */
function yieldsToAggressor(world: World, o: Chimp): boolean {
  const t = index(world).byId.get(o.targetId);
  return t !== undefined && t.alive && (t.action === 'charge' || t.action === 'attack') && t.targetId === o.id;
}

/** Turn a charge into a contact fight: the charger resolves it; the opponent grapples without resolving. */
function escalate(world: World, c: Chimp, o: Chimp): void {
  const x = ix(c), ox = ix(o);
  if (x.interId >= 0) endInteraction(world, x.interId);
  if (ox.interId >= 0) { endInteraction(world, ox.interId); ox.interId = -1; }
  c.action = 'attack'; x.phase = 1; x.prog = 0; x.v = V.ESCALATE; x.finished = false; x.flag = 0;
  x.actEnd = world.time + 1.5 / 60; c.nextDecision = x.actEnd; c.reason = `Fight ${o.name}, who charged back`;
  x.interId = startInteraction(world, 'fight', c, o.id, [c.id, o.id], 0.9).id;
  o.action = 'attack'; o.targetId = c.id; ox.phase = 1; ox.prog = 0; ox.v = V.FIGHTBACK; ox.flag = 2; ox.finished = false;
  ox.actEnd = world.time + 1.5 / 60; o.nextDecision = ox.actEnd; o.reason = `Fight back against ${c.name}`;
  o.actionTime = 0; c.actionTime = 0;
  recordAggression(world, c, o, 'attack'); recordAggression(world, o, c, 'attack');
}

export function resolveFight(world: World, c: Chimp, o: Chimp, variant: number): void {
  if (variant === V.INFANTICIDE) return infanticide(world, c, o);
  if (o.troopId !== c.troopId) return gangAttack(world, c, o);
  const aWins = contest(world, c, o), winP = lastWinP;
  const w = aWins ? c : o, l = aWins ? o : c;
  // serious injury is rare in within-community aggression [H]
  const P = paramsOf(world);
  let injury = P.fightInjuryMin + random(world) * P.fightInjurySpan;
  const serious = random(world) < P.seriousInjuryP;
  if (serious) injury += P.seriousInjuryAdd;
  // stage E4h (contestAssess): wounds scale with the mass behind the blows (winner over loser, and loser over winner)
  const assess = assessOn(P);
  if (assess) injury *= massRatio(w, l, P);
  const w0 = w.injury;
  if (random(world) < 0.2) w.injury = clamp(w.injury + (0.02 + random(world) * 0.04) * (assess ? massRatio(l, w, P) : 1));
  const winnerWound = w.injury - w0;
  emitCall(world, l, 'scream');
  decided(world, w, l, 'fight', injury);
  recordWound(world, w, l, injury);
  if (l.action === 'attack' && ix(l).flag === 2) { ix(l).flag = 0; ix(l).finished = true; }
  interrupt(world, l, `lost a fight with ${w.name}`, true);
  let died = false;
  if (l.injury >= 0.98 && random(world) < 0.1) { died = true; killChimp(world, l, `wounds from a fight with ${w.name}`, 2); }
  if (contestTrace.on) contestTrace.on({ kind: 'fight', c, o, variant: ix(c).v, winP, won: aWins, injury, seriousP: P.seriousInjuryP, serious, winnerWound, died });
}

/** Gang attacks on isolated strangers: rare and sometimes lethal (Mitani et al. 2010; Wilson et al. 2014). [M] */
function gangAttack(world: World, c: Chimp, o: Chimp): void {
  const s = simOf(world);
  const attackers = [c, ...supporters(world, c, o)];
  const n = attackers.length;
  const ox = ix(o);
  o.injury = n < 3 ? Math.min(0.85, o.injury + 0.05 + 0.05 * random(world)) : clamp(o.injury + 0.08 + 0.06 * n * random(world));
  world.stats.injuries++;
  emitCall(world, o, 'scream');
  o.mood = 'fearful'; o.stress = clamp(o.stress + 0.4);
  ox.victimOf = c.id; ox.victimAt = world.time;
  endoThreat(world, o); // stage E4b (endoFast)
  const key = `${c.troopId}>${o.troopId}`;
  const troop = index(world).troopById.get(c.troopId)!, other = index(world).troopById.get(o.troopId)!;
  const names = attackers.map(a => a.name).join(', ');
  if (world.time - ox.gangAt > 0.5) {
    ox.gangAt = world.time;
    const maleVictim = o.sex === 'male' && o.age >= 10;
    const P = paramsOf(world);
    const p = n < 3 ? 0 : maleVictim ? Math.min(P.gangKillMaleMax, P.gangKillMalePerAttacker * (n - 2)) : o.age < 5 ? P.gangKillInfantP : P.gangKillOtherP;
    if (random(world) < p || (n >= 3 && o.injury >= 1)) {
      flashInteraction(world, 'kill', c, o.id, [...attackers.map(a => a.id), o.id], 1);
      world.stats.killings++;
      s.kills[key] = (s.kills[key] ?? 0) + 1;
      // contact memory (§5.3.1 P2, A1): the losers' witnesses remember where they lost a member, the winners' witnesses
      // where a neighbour died; ranges then move through use (territory.ts), not by script
      if (P.patrolContactMemory === 1) {
        for (const w of witnesses(world, o.troopId, o.position[0], o.position[2])) if (w !== o) noteContact(world, w, o.position[0], o.position[2], 0, P.dangerDeathW);
        for (const w of witnesses(world, c.troopId, o.position[0], o.position[2])) noteContact(world, w, o.position[0], o.position[2], P.dangerDeathW, 0);
      } else markDanger(world, o.troopId, o.position[0], o.position[2], P.dangerDeathW); // ablation: the C6 community grid
      killChimp(world, o, `killed in an intergroup attack by ${troop.name} males`, 3,
        `${n} ${troop.name} males (${names}) attacked ${o.name}, an isolated ${other.name} ${o.sex === 'male' ? (o.age >= 15 ? 'adult male' : 'adolescent male') : o.age < 5 ? 'infant' : 'female'}; ${o.name} died of the injuries`);
      for (const a of attackers) { episode(world, a, 'territory', `Joined the attack that killed ${o.name}, a stranger`, o.id); noteEvent(world, a, 'intergroup', `Joined the attack that killed ${o.name} of the ${other.name}`, o.id); }
      return;
    }
    noteEvent(world, o, 'injury', `Wounded in an attack by ${troop.name} males`, c.id);
    if (P.patrolContactMemory === 1) noteContact(world, o, o.position[0], o.position[2], 0, P.dangerInjuryW); // wounded by strangers (§5.3.1 P2)
    else markDanger(world, o.troopId, o.position[0], o.position[2], P.dangerInjuryW); // ablation: the C6 community grid
    addEvent(world, `${troop.name} males (${names}) attacked ${o.name} of ${other.name}; ${o.sex === 'male' ? 'he' : 'she'} escaped wounded`, 'territory', [c.id, o.id], c.troopId, 2);
  }
  episode(world, o, 'territory', `Was attacked by ${troop.name} males`, c.id);
  interrupt(world, o, `attacked by ${troop.name} males`, true);
}

/** Infanticide by males occurs within and between communities; rare. [H occurs, L rate] */
function infanticide(world: World, c: Chimp, infant: Chimp): void {
  const mother = index(world).byId.get(infant.motherId);
  let defended = false;
  if (mother && mother.alive && hd(mother, infant) < 3) {
    const help = supporters(world, mother, c).length;
    const P = paramsOf(world);
    defended = random(world) < 0.35 * (strength(mother, P) / Math.max(0.1, strength(c, P))) + help * 0.2;
  }
  emitCall(world, infant, 'scream');
  if (mother) emitCall(world, mother, 'scream');
  const troop = index(world).troopById.get(c.troopId)!;
  if (!defended && random(world) < paramsOf(world).infanticideKillP) {
    flashInteraction(world, 'infanticide', c, infant.id, [c.id, infant.id, ...(mother ? [mother.id] : [])], 1);
    world.stats.killings++;
    const months = Math.max(1, Math.round(infant.age * 12));
    killChimp(world, infant, `infanticide by ${c.name} (${troop.name})`, 3,
      `${c.name} (${troop.name}) killed ${infant.name}, the ${months}-month-old infant of ${mother?.name ?? 'an unknown mother'}`);
    if (mother) { mother.stress = clamp(mother.stress + 0.5); mother.mood = 'distressed'; }
    noteEvent(world, c, 'infanticide', `Killed ${infant.name}, the infant of ${mother?.name ?? 'an unknown mother'}`, infant.id);
  } else {
    infant.injury = clamp(infant.injury + 0.2);
    addEvent(world, `${c.name} attacked ${infant.name}, the infant of ${mother?.name ?? 'an unknown mother'}; ${defended ? 'the mother fought him off' : 'the infant survived, wounded'}`, 'conflict', [c.id, infant.id], c.troopId, 2);
    if (mother) { ix(mother).coalA = mother.id; interrupt(world, mother, `${c.name} attacked my infant`, true); }
  }
}
