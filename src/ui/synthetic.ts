import type { Action, Candidate, Chimp, DecisionContext, Relation, SimEvent, SimEventKind, Troop, World } from '../types';
import type { DecisionTraceView, DeciderView } from './contracts';

// A self-contained synthetic world for previewing every UI surface without the
// simulation, decision loop or 3D scene (src/ui/preview.html). Values are
// arbitrary but structurally plausible: three communities, matrilines over
// three generations, dead and immigrant individuals, hierarchies and traces.

let s = 7;
const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const NAMES = ['Asha', 'Nia', 'Kato', 'Obi', 'Luma', 'Tano', 'Zuri', 'Biko', 'Sefu', 'Pip', 'Mina', 'Jabali', 'Kesi', 'Dume', 'Wema', 'Imani', 'Baraka', 'Rafiki', 'Tumaini', 'Neema', 'Hodari', 'Kito', 'Amani', 'Juma', 'Saba', 'Bahati', 'Chausiku', 'Duma', 'Faraji', 'Kamau', 'Lulu', 'Makena', 'Nuru', 'Oni', 'Penda', 'Rehema', 'Shani', 'Tatu', 'Uzuri', 'Wanjiru', 'Yaro', 'Zawadi', 'Ayo', 'Bora', 'Dalila', 'Eshe', 'Fumo', 'Gasira', 'Hasani', 'Issa', 'Jelani', 'Kiah', 'Lindiwe', 'Mosi', 'Nala', 'Pili', 'Sanaa', 'Tisa', 'Upendo', 'Zola', 'Chiku', 'Mwezi', 'Ngozi', 'Sudi'];
const ACTIONS: Action[] = ['forage', 'rest', 'groom', 'travel', 'play', 'patrol', 'call', 'nurse', 'climb', 'display'];

// Community colours match src/sim/generation.ts.
export function syntheticWorld(): World {
  s = 7;
  const troops: Troop[] = [
    { id: 1, name: 'West community', color: '#ea8b60', emblem: '', center: [-42, 0, -18], radius: 30, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
    { id: 2, name: 'East community', color: '#77b6e1', emblem: '', center: [38, 0, -12], radius: 30, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
    { id: 3, name: 'North community', color: '#e28dae', emblem: '', center: [0, 0, 42], radius: 30, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
  ];
  const now = 24 * 40 + 9.5; // day 41, 09:30 at run start 08:00
  const chimps: Chimp[] = [];
  let id = 0, nameI = 0;
  const make = (troop: Troop, sex: Chimp['sex'], age: number, motherId = -1, fatherId = -1, natal = troop.id): Chimp => {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * troop.radius * 0.8;
    const stage = age < 5 ? 'infant' : age < 10 ? 'juvenile' : age < 15 ? 'adolescent' : age < 38 ? 'adult' : 'elder';
    const c: Chimp = {
      id: id++, name: NAMES[nameI++ % NAMES.length], troopId: troop.id, natalTroopId: natal, sex, age, stage,
      position: [troop.center[0] + Math.cos(a) * r, 0, troop.center[2] + Math.sin(a) * r], heading: 0,
      action: stage === 'infant' ? 'nurse' : pick(ACTIONS), targetId: -1, actionTime: 0,
      hunger: rnd() * 0.8, thirst: rnd() * 0.6, energy: 0.4 + rnd() * 0.6, social: rnd(), stress: rnd() * 0.5, health: 0.7 + rnd() * 0.3,
      rank: 0, elo: 1000, rankOrder: 0, motherId, fatherId, birthTime: now - age * 24 * 365, deathTime: null, causeOfDeath: null,
      skills: { climbing: Math.min(1, age / 20), foraging: Math.min(1, age / 18) * (0.7 + rnd() * 0.3), hunting: sex === 'male' ? Math.min(1, age / 30) : 0.1, social: 0.3 + rnd() * 0.6 },
      bonds: {}, personality: { boldness: rnd(), sociability: rnd(), aggression: rnd(), playfulness: rnd() },
      appearance: { fur: rnd(), face: rnd(), build: rnd(), brow: rnd(), ears: rnd() },
      memory: [], episodes: [], candidates: [], reason: 'Following the party toward a ripening fig', decisionSource: 'rules', decisionVersion: 0, nextDecision: 0,
      controller: 'rules', awaitingDecisionSince: null, alive: true, pregnancy: 0, cooldown: 0, injury: 0,
      swelling: 0, cycleDay: -1, lactating: false, carryingMeat: 0, nest: null, mood: pick(['calm', 'calm', 'excited', 'playful', 'fearful'] as const),
      vocal: null, vocalUntil: 0, partyId: troop.id * 10 + Math.floor(rnd() * 3), lastConflict: null, allies: [],
    };
    chimps.push(c); return c;
  };
  const kill = (c: Chimp, yearsAgo: number, cause: string) => { c.alive = false; c.action = 'dead'; c.deathTime = now - yearsAgo * 24 * 365; c.causeOfDeath = cause; };

  for (const t of troops) {
    const males = [make(t, 'male', 31), make(t, 'male', 26), make(t, 'male', 22), make(t, 'male', 38), make(t, 'male', 17)];
    const deadAlpha = make(t, 'male', 44); kill(deadAlpha, 3.2, 'intergroup aggression');
    for (let m = 0; m < 3; m++) {
      const matriarch = make(t, 'female', 36 + m * 5);
      if (m === 2) kill(matriarch, 1.1, 'old age');
      const kids = m === 1 ? [18, 11, 6, 1.5] : [22, 13, 4];
      for (const age of kids) {
        const sire = age > 15 ? deadAlpha : pick(males);
        const k = make(t, rnd() < 0.5 ? 'female' : 'male', age, matriarch.id, sire.id);
        if (k.sex === 'female' && k.age > 17) {
          const g1 = make(t, 'male', 3.4, k.id, males[0].id); const g2 = make(t, 'female', 0.6, k.id, males[1].id);
          k.lactating = true; g1.action = 'play'; g2.action = 'nurse';
          if (t.id === 2) kill(g1, 0.2, 'infanticide');
        }
        if (age === 1.5 && t.id === 1) kill(k, 0.4, 'illness');
      }
    }
    // A cycling adult female and an immigrant from a neighboring community.
    const cyc = make(t, 'female', 19); cyc.swelling = 0.95; cyc.cycleDay = 14;
    const natal = troops[(t.id) % 3];
    const imm = make(t, 'female', 16, -1, -1, natal.id); imm.swelling = 0.4; imm.cycleDay = 6;
    if (t.id === 1) { males[1].injury = 0.35; males[0].carryingMeat = 0.4; cyc.pregnancy = 0; }
  }
  // Emigrant link: the West immigrant's mother lives in East.
  const westImm = chimps.find(c => c.troopId === 1 && c.natalTroopId !== 1)!;
  const eastMother = chimps.find(c => c.troopId === 2 && c.sex === 'female' && c.age > 36 && c.alive);
  if (eastMother) westImm.motherId = eastMother.id;

  const byTroop = (t: Troop) => chimps.filter(c => c.troopId === t.id && c.alive);
  for (const t of troops) {
    const mem = byTroop(t);
    const males = mem.filter(c => c.sex === 'male' && c.age >= 10).sort((a, b) => b.age >= 20 && a.age >= 20 ? a.age - b.age : b.age - a.age);
    males.forEach((c, i) => { c.elo = 1260 - i * (60 + rnd() * 40); c.rankOrder = i + 1; c.rank = 1 - i / males.length; });
    const females = mem.filter(c => c.sex === 'female' && c.age >= 15).sort((a, b) => b.age - a.age);
    females.forEach((c, i) => { c.elo = 1120 - i * (40 + rnd() * 30); c.rankOrder = i + 1; });
    t.maleHierarchy = males.map(c => c.id); t.femaleHierarchy = females.map(c => c.id);
    t.alphaId = males[0].id; t.alphaSince = now - 24 * 290; t.adultMales = males.filter(c => c.age >= 15).length;
    const dead = chimps.find(c => c.troopId === t.id && !c.alive && c.sex === 'male')!;
    t.alphaHistory = [
      { id: dead.id, from: 0, to: now - 24 * 520, how: 'founder' },
      { id: males[2].id, from: now - 24 * 520, to: now - 24 * 290, how: 'rose after the alpha died in an intergroup attack' },
      { id: males[0].id, from: now - 24 * 290, to: null, how: 'coalition with ' + males[1].name },
    ];
    for (const a of mem) for (const b of mem) {
      if (a === b) continue;
      const kin = a.motherId === b.id || b.motherId === a.id || (a.motherId >= 0 && a.motherId === b.motherId);
      const v = kin ? 0.6 + rnd() * 0.35 : a.sex === 'male' && b.sex === 'male' && a.age > 15 && b.age > 15 ? 0.2 + rnd() * 0.55 : rnd() < 0.25 ? rnd() * 0.4 : 0;
      if (v > 0.05) a.bonds[b.id] = +v.toFixed(2);
    }
    for (const c of mem) c.allies = Object.entries(c.bonds).filter(([oid]) => { const o = chimps[+oid]; return o.sex === 'male' && o.age > 14; }).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([oid]) => +oid);
    males[3].lastConflict = { opponentId: males[1].id, time: now - 3, won: false };
    males[1].lastConflict = { opponentId: males[3].id, time: now - 3, won: true };
  }
  const west = troops[0];
  const alpha = chimps[west.alphaId];
  alpha.controller = 'model'; alpha.decisionSource = 'decide'; alpha.action = 'patrol'; alpha.mood = 'excited';
  alpha.reason = 'Heard a stranger pant-hoot near the eastern boundary; party has 4 adult males';
  alpha.episodes = [
    { time: now - 0.4, text: 'Heard strangers pant-hoot from the east', kind: 'territory', otherId: -1 },
    { time: now - 2.1, text: `Groomed ${chimps[west.maleHierarchy[1]].name} for 14 minutes`, kind: 'social', otherId: west.maleHierarchy[1] },
    { time: now - 3, text: `Charged ${chimps[west.maleHierarchy[3]].name}; he submitted`, kind: 'conflict', otherId: west.maleHierarchy[3] },
    { time: now - 9, text: 'Shared colobus meat with two females', kind: 'hunt', otherId: -1 },
  ];

  const parties = troops.flatMap(t => [0, 1, 2].map(k => {
    const members = byTroop(t).filter(c => c.partyId === t.id * 10 + k).map(c => c.id);
    const cx = members.reduce((a, m) => a + chimps[m].position[0], 0) / Math.max(1, members.length);
    const cz = members.reduce((a, m) => a + chimps[m].position[2], 0) / Math.max(1, members.length);
    return { id: t.id * 10 + k, troopId: t.id, members, center: [cx, 0, cz] as [number, number, number], kind: pick(['foraging', 'social', 'traveling', 'patrol'] as const) };
  }));

  const ev = (dt: number, kind: SimEventKind, text: string, actors: number[], troopId: number, severity: number): SimEvent => ({ time: now - dt, kind, text, actors, troopId, severity });
  const w = (i: number) => west.maleHierarchy[i];
  const events: SimEvent[] = [
    ev(30, 'weather', 'Heavy rain began; most parties sheltered under the canopy', [], 0, 1),
    ev(22, 'reproduction', `${chimps[troops[2].femaleHierarchy[1]].name} gave birth to a daughter`, [troops[2].femaleHierarchy[1]], 3, 2),
    ev(14, 'hunt', `${alpha.name}'s party caught a red colobus`, [alpha.id], 1, 2),
    ev(9, 'hierarchy', `${chimps[troops[1].alphaId].name} pant-grunted to by three males`, [troops[1].alphaId], 2, 1),
    ev(6, 'play', `${chimps[w(4)].name} and a juvenile played chase for 20 minutes`, [w(4)], 1, 0),
    ev(4, 'territory', 'West patrol reached the eastern boundary', [alpha.id, w(1)], 1, 1),
    ev(3, 'conflict', `${alpha.name} charged ${chimps[w(3)].name}, who screamed and fled`, [alpha.id, w(3)], 1, 1),
    ev(2.5, 'social', `${chimps[w(3)].name} reconciled with ${alpha.name} by embracing`, [w(3), alpha.id], 1, 0),
    ev(1.2, 'conflict', `${chimps[troops[1].maleHierarchy[1]].name} was wounded in a fight`, [troops[1].maleHierarchy[1]], 2, 2),
    ev(0.9, 'model', `GLiNER chose patrol for ${alpha.name} (rules: forage)`, [alpha.id], 1, 1),
    ev(0.4, 'territory', 'Stranger pant-hoots heard from the east (playback)', [alpha.id], 1, 2),
    ev(0.1, 'food', 'A Ficus mucuso crop ripened near the river', [], 0, 0),
  ];
  const world: World = {
    seed: 48, time: now, day: 41, hour: 17.5, tick: 0, size: 160, chimps, trees: [], troops, water: [{ id: 2001, position: [-38, 0, -10], radius: 4 }, { id: 2002, position: [39, 0, -4], radius: 4 }, { id: 2003, position: [1, 0, 35], radius: 4 }],
    events, parties, interactions: [
      { id: 1, kind: 'groom', actorId: alpha.id, targetId: w(1), participants: [alpha.id, w(1)], start: now - 0.2, end: null, position: alpha.position, intensity: 0.3, troopId: 1 },
      { id: 2, kind: 'charge', actorId: alpha.id, targetId: w(3), participants: [alpha.id, w(3)], start: now - 3, end: now - 2.9, position: alpha.position, intensity: 0.7, troopId: 1 },
    ],
    calls: [], prey: [], stimuli: [{ id: 1, kind: 'playback-stranger', position: [-18, 0, -14], radius: 30, start: now - 0.4, end: now + 0.5, troopId: 1, label: 'Stranger pant-hoot playback' }],
    environment: { weather: 'rain', rain: 0.35, cloud: 0.7, wind: 0.42, humidity: 0.88, temperature: 21.4, lightningAt: -1, season: 'wet', dayOfYear: 101, daylight: 0.95, sunAltitude: 0.7, sunAzimuth: 1.2, moonPhase: 0.4, fruitIndex: 0.55 },
    rng: 1, nextId: id, births: 3, deaths: 7,
    stats: { births: 3, deaths: 7, conflicts: 41, injuries: 6, groomingBouts: 220, playBouts: 90, hunts: 5, huntSuccesses: 2, intergroupEncounters: 2, killings: 1, takeovers: 1, transfers: 2, reconciliations: 12 },
    ageRate: 1, modelPolicy: { mode: 'async', asyncGraceMinutes: 10 },
  };
  return world;
}

export function syntheticRelation(world: World, a: Chimp, b: Chimp): Relation {
  if (a.motherId === b.id) return 'mother';
  if (b.motherId === a.id) return 'offspring';
  if (a.motherId >= 0 && a.motherId === b.motherId) return 'maternal-sibling';
  if (a.troopId !== b.troopId) return 'stranger';
  if (a.allies.includes(b.id)) return 'ally';
  if (a.lastConflict?.opponentId === b.id) return 'rival';
  void world; return 'community';
}

export function syntheticDecider(world: World): DeciderView {
  const alpha = world.chimps[world.troops[0].alphaId];
  const troop = world.troops[0];
  const traces: DecisionTraceView[] = [];
  const specs: { dt: number; opts: [Action, number, number][]; choice: number; rules: number; applied: boolean; lat: number; stim: string[] }[] = [
    { dt: 5.2, opts: [['forage', 0.71, 0.52], ['groom', 0.58, 0.31], ['rest', 0.4, 0.09], ['travel', 0.33, 0.08]], choice: 0, rules: 0, applied: true, lat: 212, stim: [] },
    { dt: 3.1, opts: [['charge', 0.62, 0.44], ['groom', 0.55, 0.37], ['forage', 0.49, 0.12], ['rest', 0.3, 0.07]], choice: 0, rules: 0, applied: true, lat: 246, stim: [] },
    { dt: 2.2, opts: [['groom', 0.6, 0.61], ['forage', 0.52, 0.22], ['rest', 0.34, 0.1], ['play', 0.12, 0.07]], choice: 0, rules: 0, applied: true, lat: 198, stim: [] },
    { dt: 0.9, opts: [['forage', 0.66, 0.27], ['patrol', 0.52, 0.48], ['groom', 0.49, 0.18], ['rest', 0.3, 0.07]], choice: 1, rules: 0, applied: true, lat: 231, stim: [] },
    { dt: 0.35, opts: [['patrol', 0.64, 0.58], ['call', 0.61, 0.24], ['forage', 0.44, 0.1], ['display', 0.38, 0.05], ['rest', 0.2, 0.03]], choice: 0, rules: 0, applied: true, lat: 224, stim: ['Stranger pant-hoots from the east, ~180 m'] },
  ];
  const tr = (i: number) => world.chimps[troop.maleHierarchy[i]];
  const nearby = (k: number): DecisionContext['social'] => {
    const out: DecisionContext['social'] = [1, 2, 3].map(i => ({ id: tr(i).id, name: tr(i).name, relation: i === 3 ? 'rival' : 'ally', sex: 'male', ageYears: tr(i).age, stage: tr(i).stage, rankOrder: i + 1, isAlpha: false, bond: alpha.bonds[tr(i).id] ?? 0.3, distance: 3 + i * 4, action: tr(i).action, swelling: 0, injured: tr(i).injury > 0.1, hasMeat: false }));
    if (k === 4) out.push({ id: 999, name: 'Unknown male', relation: 'stranger', sex: 'male', ageYears: 25, stage: 'adult', rankOrder: 0, isAlpha: false, bond: 0, distance: 180, action: 'call', swelling: 0, injured: false, hasMeat: false });
    return out;
  };
  for (const [k, sp] of specs.entries()) {
    const opts: Candidate[] = sp.opts.map(([action, score]) => ({ action, targetId: action === 'groom' ? tr(1).id : action === 'charge' ? tr(3).id : -1, score, reason: `${action} utility` }));
    const context: DecisionContext = {
      chimpId: alpha.id, version: k, time: world.time - sp.dt,
      focal: { name: alpha.name, ageYears: alpha.age, stage: alpha.stage, sex: alpha.sex, community: troop.name, rankOrder: 1, rankOf: troop.maleHierarchy.length, isAlpha: true,
        hunger: 0.42, thirst: 0.3, energy: 0.7, social: 0.5, stress: 0.22 + k * 0.05, health: 0.95, injury: 0, swelling: 0, lactating: false, hasDependentInfant: false, carryingMeat: 0,
        currentAction: 'forage', mood: k === 4 ? 'excited' : 'calm', personality: alpha.personality, skills: alpha.skills },
      environment: { hour: 9, phase: 'day', weather: 'rain', rain: 0.35, temperature: 21, fruitNearby: 0.6, partySize: 7, partyAdultMales: 4, nearTerritoryEdge: k >= 3, strangersSeen: 0, strangersHeard: k === 4 ? 3 : 0 },
      social: nearby(k),
      recent: alpha.episodes.map(e => e.text).slice(0, 4), stimuli: sp.stim, candidates: opts,
    };
    const total = sp.opts.reduce((a, o) => a + o[2], 0);
    traces.push({ id: `t${k}`, chimpId: alpha.id, chimpName: alpha.name, time: world.time - sp.dt, context, options: opts, probabilities: sp.opts.map(o => o[2] / total), choiceIndex: sp.choice, rulesIndex: sp.rules, applied: sp.applied, discardedReason: '', latencyMs: sp.lat, inputTokens: 612 + k * 23, source: 'model', note: k === 3 ? 'applied to newer state (still legal)' : '' });
  }
  return { enabled: true, ready: true, busy: false, phase: 'ready', status: 'GLiNER2.5-Decide ready on mps · fp16', lastError: '', model: 'fastino/GLiNER2.5-Decide', device: 'mps', latencyMs: 224, inputTokens: 704, calls: 46, applied: 41, revalidated: 4, fallbacks: 2, waiting: 0, inflightChimpId: -1, discarded: 3, roster: 'selected', focalIds: [alpha.id], traces, agreement: { same: 33, total: 44 } };
}
