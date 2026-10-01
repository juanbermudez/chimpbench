// One seed of the Jev decisive test's free arms (docs/staging/jev-decisive-test.md): a rules burn-in, then each arm on
// an exact copy of the burned-in world (structuredClone; World is plain JSON-lossless data, so a copy continues exactly
// as the original would), 2 unscored days, then 5 scored days with simulation-truth tallies for the endpoint and the
// three field-observer team sets beside them. Pure computation, no file I/O (the caller writes reports).
import { createHash } from 'node:crypto';
import { applyDecision, createWorld, resolveByRules, rulesChoice, tickWorld } from '../../src/simulation';
import type { Candidate, Chimp, World } from '../../src/types';
import { buildRequest } from '../../src/decision';
import { buildFacts } from '../../src/decide/facts';
import { gateCheck, intentOf, newGateState, type GateState } from '../../src/decide/gate';
import { drawIndex, drawUniform, rulesProbs, uniform, utilityProbs } from '../../src/decide/policies';
import { candidateMeta } from '../../src/sim/candidates';
import { paramsOf } from '../../src/sim/params';
import { index, type SimChimp } from '../../src/sim/state';
import { activityCategory, CAT_FEED, CAT_GROOM, CAT_NONE, CAT_REST, CAT_TRAVEL, CATEGORIES } from '../../src/field/categories';
import { PROFILES, TARGET_FOLLOW, type ProfileName } from '../../src/field/config';
import { derive } from '../../src/field/derive';
import { METRICS } from '../../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../../src/field/observer';
import { bandDistance, type Band } from './band-distance';
import { buildLocalQuestion, decisionContextError, estimateInputTokens, TOKEN_BUDGET } from '../../server/decide';

export const FREE_ARMS = ['R', 'RG', 'U', 'X'] as const;
export const PAID_ARMS = ['J1', 'J2', 'J2s'] as const;
export type FreeArm = typeof FREE_ARMS[number];
/** Chimps aged 8+ are policy-driven (the model-eligible age of every decide-ft harness, scripts/ft-society.ts MIN_AGE). */
export const MIN_AGE = 8;
/** Adults for truth tallies: 15+ (the field observer's focal and truth age, src/field/protocols.ts). */
export const ADULT_AGE = 15;
const TICKS_PER_DAY = 5760, TICK_MIN = 0.25;

export interface SeedJob {
  seed: number; arms: FreeArm[]; profile: ProfileName;
  burnInDays: number; warmupDays: number; scoredDays: number;
  /** Registry overrides (tests only; the decisive run uses none). */
  params?: Record<string, number>;
}

type Group = 'male' | 'femaleNonLact' | 'femaleLact';
type HungerGroup = 'male' | 'lactating' | 'pregnant' | 'cycling';
export interface ArmResult {
  arm: FreeArm; seed: number;
  /** Simulation truth over the scored days (lactating females apart). */
  truth: {
    /** Daylight activity counts per group (1-min samples of every adult, daylight > 0.5, the observer truth's classifier). */
    activity: Record<Group, number[]>;
    /** Party size of adult focals (15-min daylight scans, chain rule at the profile party link, all community members counted). */
    party: { endpoint: { sum: number; n: number }; lactFocal: { sum: number; n: number } };
    /** Adult male day range: path from 5-min fixes per complete 24-h scored day (km). */
    maleDayKm: number[]; lactDayKm: number[];
  };
  /** Hunger and thirst every 15 min, all adults, by group (raw samples, rounded to 0.01). */
  hunger: Record<HungerGroup, number[]>; thirst: Record<HungerGroup, number[]>;
  /** Calls by the policy-driven population (aged 8+) in the scored days, by call kind; and their chimp-days. */
  calls: Record<string, number>; chimpDays: number;
  /** Decision points (decisionVersion increments) of the policy-driven population over the scored days. */
  decisionPoints: number;
  /** Scored days: policy choices, gate continuations by reason, gate triggers, rules fallbacks by reason, and would-be GLiNER budget fallbacks. */
  decisions: number; kept: Record<string, number>; triggers: Record<string, number>; fallbacks: Record<string, number>; glinerOverBudget: number; glinerChecked: number;
  /** Chosen kinds (policy choices only) and agreement with the rules' pick. */
  kinds: Record<string, number>; rulesAgree: number; topProb: number[];
  /** Field-observer values over the same scored days (as the field metrics compute them; female parts include lactating females). */
  observer: Record<string, { value: number | null; male?: number | null; female?: number | null; n: number }>;
  wallMs: number;
}
export interface SeedResult { seed: number; burnInHash: string; alive: number; policyDriven: number; arms: ArmResult[]; burnInMs: number }

/** sha256 of the world's JSON (the world after burn-in; identical for every arm of a seed). */
export const worldHash = (w: World) => createHash('sha256').update(JSON.stringify(w)).digest('hex').slice(0, 16);

export function runSeed(job: SeedJob): SeedResult {
  const t0 = performance.now();
  const base = createWorld(job.seed, { profile: job.profile, params: job.params ?? {} });
  for (let i = 0, n = Math.round(job.burnInDays * TICKS_PER_DAY); i < n; i++) tickWorld(base);
  const burnInHash = worldHash(base), burnInMs = performance.now() - t0;
  const alive = base.chimps.filter(c => c.alive);
  const arms = job.arms.map(arm => runArm(structuredClone(base), arm, job));
  return { seed: job.seed, burnInHash, alive: alive.length, policyDriven: alive.filter(c => c.age >= MIN_AGE).length, arms, burnInMs };
}

const inc = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };

/** Every living chimp aged MIN_AGE+ is policy-driven in non-R arms; everyone else follows rules (call before each tick). */
export function setControllers(world: World, arm: FreeArm): void {
  for (const c of world.chimps) if (c.alive) c.controller = arm !== 'R' && c.age >= MIN_AGE ? 'model' : 'rules';
}

export interface Stats { decisions: number; kept: Record<string, number>; triggers: Record<string, number>; fallbacks: Record<string, number>; glinerOverBudget: number; glinerChecked: number; kinds: Record<string, number>; rulesAgree: number; topProb: number[] }
export const newStats = (): Stats => ({ decisions: 0, kept: {}, triggers: {}, fallbacks: {}, glinerOverBudget: 0, glinerChecked: 0, kinds: {}, rulesAgree: 0, topProb: [] });

/** The probabilities an arm puts on the menu. */
export function armProbs(world: World, c: Chimp, arm: Exclude<FreeArm, 'R'>, options: Candidate[]): number[] {
  if (arm === 'RG') return rulesProbs(options);
  if (arm === 'U') return utilityProbs(buildFacts(world, c, options));
  return uniform(options.length);
}

/**
 * Answers every policy-driven chimp waiting after a tick, in chimp order: the gate first (a kept intent is re-applied
 * through applyDecision, which re-checks legality), otherwise the arm chooses from the legal bounded menu
 * (src/decision.ts buildRequest). Menus that are no real choice, invalid contexts and answers the engine refuses go
 * to rules, counted by reason. `record` false skips the tallies (unscored days).
 */
export function answerWaiting(world: World, arm: Exclude<FreeArm, 'R'>, gate: GateState, stats: Stats, record: boolean): void {
  for (const c of world.chimps) {
    if (!c.alive || c.controller !== 'model' || c.awaitingDecisionSince === null) continue;
    const v = gateCheck(world, c, gate.intents[c.id]);
    if (v.keep) {
      if (applyDecision(world, c.id, { action: v.action, targetId: v.targetId }, 'decide', c.decisionVersion)) {
        if (record) inc(stats.kept, v.reason);
        if (v.reason === 'arrived') gate.intents[c.id] = { ...intentOf(world, c, v.action, v.targetId, 0), buckets: gate.intents[c.id].buckets };
        continue;
      }
      if (record) inc(stats.triggers, 'illegal');
    } else if (record) inc(stats.triggers, v.reason);
    const req = buildRequest(world, c);
    const fall = (reason: string) => { if (record) inc(stats.fallbacks, reason); delete gate.intents[c.id]; resolveByRules(world, c.id); };
    if (req.options.length < 2) { fall('fewer-than-two-options'); continue; }
    if (decisionContextError(req.context) !== '') { fall('invalid-context'); continue; }
    if (record) {
      // judge 2: scripts/ft-contexts.ts capture() hands a context to rules when the GLiNER packet exceeds TOKEN_BUDGET,
      // even for Jev chimps; the free arms do not use GLiNER, so this only counts how often a model arm would have lost it
      stats.glinerChecked++;
      const packet = buildLocalQuestion(req.context);
      if (estimateInputTokens(packet.state, packet.questions) > TOKEN_BUDGET) stats.glinerOverBudget++;
    }
    const probs = armProbs(world, c, arm, req.options);
    const k = drawIndex(probs, drawUniform(world.seed, c.id, c.decisionVersion));
    const o = req.options[k], meta = candidateMeta.get(o) ?? { v: 0, aux: -1 };
    if (!applyDecision(world, c.id, o, 'decide', c.decisionVersion)) { fall('not-applied'); continue; }
    gate.intents[c.id] = intentOf(world, c, o.action, o.targetId, meta.v, meta.aux);
    if (record) {
      stats.decisions++;
      inc(stats.kinds, gate.intents[c.id].kind);
      if (k === req.rulesIndex) stats.rulesAgree++;
      stats.topProb.push(Math.round(Math.max(...probs) * 1000) / 1000);
    }
  }
}

function groupOf(c: Chimp): Group { return c.sex === 'male' ? 'male' : c.lactating ? 'femaleLact' : 'femaleNonLact'; }
function hungerGroupOf(c: Chimp): HungerGroup { return c.sex === 'male' ? 'male' : c.lactating ? 'lactating' : c.pregnancy > 0 ? 'pregnant' : 'cycling'; }

/** Simulation-truth tallies over the scored window (reads the world only). */
class Truth {
  activity: Record<Group, number[]> = { male: CATEGORIES.map(() => 0), femaleNonLact: CATEGORIES.map(() => 0), femaleLact: CATEGORIES.map(() => 0) };
  party = { endpoint: { sum: 0, n: 0 }, lactFocal: { sum: 0, n: 0 } };
  maleDayKm: number[] = []; lactDayKm: number[] = [];
  hunger: Record<HungerGroup, number[]> = { male: [], lactating: [], pregnant: [], cycling: [] };
  thirst: Record<HungerGroup, number[]> = { male: [], lactating: [], pregnant: [], cycling: [] };
  calls: Record<string, number> = {}; chimpTicks = 0;
  private path = new Map<number, { m: number; x: number; z: number; group: Group }>();
  private callCursor: number; private startVersion = new Map<number, number>(); decisionPoints = 0;
  constructor(world: World, private link: number, private lengthScale: number) {
    this.callCursor = world.nextId - 1;
    for (const c of world.chimps) if (c.alive) this.startVersion.set(c.id, c.decisionVersion);
  }
  tick(world: World, i: number): void {
    const alive = index(world).alive;
    for (const c of alive) if (c.age >= MIN_AGE) this.chimpTicks++;
    for (const call of world.calls) if (call.id > this.callCursor) {
      const k = index(world).byId.get(call.callerId);
      if (k && k.age >= MIN_AGE) inc(this.calls, call.kind);
    }
    if (world.calls.length) this.callCursor = Math.max(this.callCursor, ...world.calls.map(c => c.id));
    const daylit = world.environment.daylight > 0.5;
    if (i % 4 === 0 && daylit) this.activitySample(world, alive);
    if (i % 60 === 0) {
      for (const c of alive) if (c.age >= ADULT_AGE) { const g = hungerGroupOf(c); this.hunger[g].push(Math.round(c.hunger * 100) / 100); this.thirst[g].push(Math.round(c.thirst * 100) / 100); }
      if (daylit) this.partyScan(world, alive);
    }
    if (i % 20 === 0) for (const c of alive) {
      if (c.age < ADULT_AGE || (c.sex === 'female' && !c.lactating)) continue;
      const p = this.path.get(c.id);
      if (p) { p.m += Math.hypot(c.position[0] - p.x, c.position[2] - p.z); p.x = c.position[0]; p.z = c.position[2]; }
      else this.path.set(c.id, { m: 0, x: c.position[0], z: c.position[2], group: groupOf(c) });
    }
    if (i > 0 && i % TICKS_PER_DAY === 0) this.closeDay(world);
  }
  /** A 24-h window ends: every male (and lactating female) followed the whole window gets a day range. */
  closeDay(world: World): void {
    const byId = index(world).byId;
    for (const [id, p] of this.path) {
      const c = byId.get(id);
      // km per day, field-equivalent (the metric's scale: the compressed map is the field layout / lengthScale)
      if (c && c.alive) (p.group === 'male' ? this.maleDayKm : this.lactDayKm).push(Math.round(p.m * this.lengthScale) / 1000);
    }
    this.path.clear();
    for (const c of index(world).alive) {
      if (c.age < ADULT_AGE || (c.sex === 'female' && !c.lactating)) continue;
      this.path.set(c.id, { m: 0, x: c.position[0], z: c.position[2], group: groupOf(c) });
    }
  }
  private activitySample(world: World, alive: Chimp[]): void {
    const groomed = new Set<number>();
    for (const c of alive) if (c.action === 'groom' && c.targetId > 0 && (c as SimChimp).sim.phase >= 1) groomed.add(c.targetId);
    const water = index(world).waterById;
    for (const c of alive) {
      if (c.age < ADULT_AGE) continue;
      let atWater = false;
      if (c.action === 'drink') { const w = water.get(c.targetId); atWater = !!w && Math.hypot(c.position[0] - w.position[0], c.position[2] - w.position[2]) <= 1.2; }
      const cat = activityCategory(c.action, (c as SimChimp).sim.phase, c.targetId, groomed.has(c.id), c.carryingMeat > 0.02, atWater);
      if (cat !== CAT_NONE) this.activity[groupOf(c)][cat]++;
    }
  }
  private partyScan(world: World, alive: Chimp[]): void {
    const L2 = this.link * this.link;
    for (const f of alive) {
      if (f.age < ADULT_AGE) continue;
      const mates = alive.filter(m => m.troopId === f.troopId);
      const inParty = new Set<number>([f.id]), q = [f];
      for (let h = 0; h < q.length; h++) {
        const p = q[h];
        for (const m of mates) if (!inParty.has(m.id) && (m.position[0] - p.position[0]) ** 2 + (m.position[2] - p.position[2]) ** 2 <= L2) { inParty.add(m.id); q.push(m); }
      }
      const slot = f.sex === 'female' && f.lactating ? this.party.lactFocal : this.party.endpoint;
      slot.sum += inParty.size; slot.n++;
    }
  }
  finish(world: World): void {
    for (const c of world.chimps) {
      const v0 = this.startVersion.get(c.id);
      if (v0 !== undefined && c.age >= MIN_AGE) this.decisionPoints += c.decisionVersion - v0;
    }
  }
}

/** One arm on its copy of the burned-in world. */
export function runArm(world: World, arm: FreeArm, job: SeedJob): ArmResult {
  const t0 = performance.now();
  world.modelPolicy = { ...world.modelPolicy, mode: arm === 'R' ? 'off' : 'async' };
  const gate = newGateState(), stats = newStats();
  const step = (record: boolean) => {
    setControllers(world, arm);
    tickWorld(world);
    if (arm !== 'R') answerWaiting(world, arm, gate, stats, record);
  };
  for (let i = 0, n = Math.round(job.warmupDays * TICKS_PER_DAY); i < n; i++) step(false);
  // scored days: observers start here (as scripts/ft-field.ts starts them with the model), truth tallies too
  const prof = PROFILES[job.profile];
  const obs = createObserver(world, { seed: 1, profile: prof, truth: true });
  const pobs = createObserver(world, { seed: 1 + 7919, profile: prof, truth: true, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  const mobs = createObserver(world, { seed: 1 + 2 * 7919, profile: prof, truth: true, followMode: 'party-males', lite: true, pointIntervalMin: 1 });
  const truth = new Truth(world, paramsOf(world).partyLinkM, prof.lengthScale);
  const ticks = Math.round(job.scoredDays * TICKS_PER_DAY);
  for (let i = 1; i <= ticks; i++) {
    step(true);
    observerStep(obs, world); observerStep(pobs, world); observerStep(mobs, world);
    truth.tick(world, i);
  }
  truth.finish(world);
  const rec = finishObserver(obs, world), prec = finishObserver(pobs, world), mrec = finishObserver(mobs, world);
  const d = derive(rec), pd = derive(prec), md = derive(mrec);
  const observer: ArmResult['observer'] = {};
  for (const id of ['T-ACT-1', 'T-ACT-2', 'T-ACT-3', 'T-ACT-4', 'T-PTY-1', 'T-RNG-4']) {
    const m = METRICS.find(x => x.id === id)!, mode = TARGET_FOLLOW[id];
    const v = m.compute!(mode === 'party-larger' ? pd : mode === 'party-males' ? md : d);
    observer[id] = { value: v.value, ...(v.parts && 'male' in v.parts ? { male: v.parts.male, female: v.parts.female } : {}), n: v.n };
  }
  const chimpDays = truth.chimpTicks * TICK_MIN / 60 / 24;
  return { arm, seed: job.seed, truth: { activity: truth.activity, party: truth.party, maleDayKm: truth.maleDayKm, lactDayKm: truth.lactDayKm },
    hunger: truth.hunger, thirst: truth.thirst, calls: truth.calls, chimpDays, decisionPoints: truth.decisionPoints,
    decisions: stats.decisions, kept: stats.kept, triggers: stats.triggers, fallbacks: stats.fallbacks, glinerOverBudget: stats.glinerOverBudget, glinerChecked: stats.glinerChecked,
    kinds: stats.kinds, rulesAgree: stats.rulesAgree, topProb: stats.topProb, observer, wallMs: performance.now() - t0 };
}

// ---------------------------------------------------------------------------
// Endpoint (pre-registered): summed band distance on simulation truth
// ---------------------------------------------------------------------------

// 0 inside the band, else the gap to the nearest edge divided by the band width (docs/staging/jev-decisive-test.md).
// The function is shared with scripts/e-bench.ts (Track E) and lives in ./band-distance.ts.
export { bandDistance, type Band };

export interface EndpointRow { id: string; part: 'male' | 'female' | 'pooled'; label: string }
/** T-ACT-1 to 3 with their sex parts (bandParts male and female in src/field/metrics.ts), T-ACT-4 pooled, party size, male day range. */
export const ENDPOINT_ROWS: EndpointRow[] = [
  { id: 'T-ACT-1', part: 'male', label: 'feeding, males' }, { id: 'T-ACT-1', part: 'female', label: 'feeding, females' },
  { id: 'T-ACT-2', part: 'male', label: 'travel, males' }, { id: 'T-ACT-2', part: 'female', label: 'travel, females' },
  { id: 'T-ACT-3', part: 'male', label: 'grooming, males' }, { id: 'T-ACT-3', part: 'female', label: 'grooming, females' },
  { id: 'T-ACT-4', part: 'pooled', label: 'rest incl. grooming' },
  { id: 'T-PTY-1', part: 'pooled', label: 'party size' },
  { id: 'T-RNG-4', part: 'male', label: 'male day range (km)' },
];
export const rowKey = (r: EndpointRow) => r.part === 'pooled' ? r.id : `${r.id} ${r.part}`;

const share = (a: number[], cat: (s: number[]) => number) => { const t = a.reduce((p, q) => p + q, 0); return t ? cat(a.map(v => v / t)) : NaN; };
const meanOf = (a: number[]) => a.length ? a.reduce((p, q) => p + q, 0) / a.length : NaN;

/** Truth value of each endpoint row for one arm-seed (lactating females excluded) and a second set with them included. */
export function truthValues(t: ArmResult['truth'], withLactating = false): Record<string, number> {
  const F = withLactating ? t.activity.femaleNonLact.map((v, i) => v + t.activity.femaleLact[i]) : t.activity.femaleNonLact, M = t.activity.male;
  const cats: Record<string, (s: number[]) => number> = { 'T-ACT-1': s => s[CAT_FEED], 'T-ACT-2': s => s[CAT_TRAVEL], 'T-ACT-3': s => s[CAT_GROOM] };
  const out: Record<string, number> = {};
  for (const [id, f] of Object.entries(cats)) { out[`${id} male`] = share(M, f); out[`${id} female`] = share(F, f); }
  const rest = (s: number[]) => s[CAT_REST] + s[CAT_GROOM];
  out['T-ACT-4'] = (share(M, rest) + share(F, rest)) / 2; // as the metric's truth: (male + female) / 2
  const p = withLactating ? { sum: t.party.endpoint.sum + t.party.lactFocal.sum, n: t.party.endpoint.n + t.party.lactFocal.n } : t.party.endpoint;
  out['T-PTY-1'] = p.n ? p.sum / p.n : NaN;
  out['T-RNG-4 male'] = meanOf(t.maleDayKm);
  return out;
}

export function endpoint(values: Record<string, number>, bands: Record<string, Band>): { rows: Record<string, number>; D: number } {
  const rows: Record<string, number> = {};
  let D = 0;
  for (const r of ENDPOINT_ROWS) { const k = rowKey(r), x = values[k]; const d = Number.isFinite(x) ? bandDistance(x, bands[r.id]) : NaN; rows[k] = d; D += d; }
  return { rows, D };
}

/** Rules pick and menu for calibration: the probabilities each sampled arm would give on a rules-world menu. */
export function menuSample(world: World, c: Chimp): { options: Candidate[]; rulesIndex: number } | null {
  const req = buildRequest(world, c);
  if (req.options.length < 2 || decisionContextError(req.context) !== '' || !rulesChoice(world, c)) return null;
  return { options: req.options, rulesIndex: req.rulesIndex };
}
