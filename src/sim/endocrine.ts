import type { Chimp, World } from '../types';
import { bond, isAdultMale, maternalKin } from './hierarchy';
import { paramsOf, type Params } from './params';
import { NEVER, SLOW_EVERY, SLOW_HOURS, TICK_HOURS, index, ix, type ChimpX } from './state';

// Stage E4a (docs/staging/e4a-prereg.md): three slow internal states, each matched to a hormone field teams measure in
// urine. Rare acts then follow from an animal's standing state instead of a probability roll that opens an option.
//   stress load (cortisol-like)        chimp.stress itself: one stress notion, read by every score term that read it before
//   competitive arousal (testosterone) chimp.sim.arousal, adult males only
//   affiliation (oxytocin-like)        chimp.sim.affil
// Each is a leaky integrator in 0..1, S += (target − S) × (1 − exp(−dt/τ)), stepped every slow step (5 eco-min) from the
// animal's last perception, plus bounded kicks S += k × (1 − S) at events. Events are read from the timestamps the
// simulation already keeps (who was charged, who lost, who reconciled), so nothing else has to call in here except food
// sharing, which leaves no timestamp. No randomness, no allocation. Sources and tags: the registry notes (endo*).
//
// Not wired on purpose, so they stay tests of the mechanism: rank, hierarchy instability, time of day, patrols.

/**
 * Switches that need the states (review fix, E4b): a dependent switch counts as off unless endoStates is 1, so a
 * one-switch ablation keeps its dice instead of removing them and leaving a state that never runs (arousal undefined,
 * score 0, the act absent). Every reader of a dependent switch goes through this.
 */
export type EndoDependent = 'endoEscalate' | 'endoRedirect' | 'endoRainDisplay' | 'endoFast' | 'endoFastRedirect';
export function endoOn(P: Params, s: EndoDependent): boolean {
  if (P.endoStates !== 1 || P[s] !== 1) return false;
  return s !== 'endoFastRedirect' || (P.endoRedirect === 1 && P.endoFast === 1); // the fast redirect replaces E4a's, on the fast state
}

/** An event stamped at eco-hour `t` happened in the slow step that ended before tick `tick` (each event counts once). */
function since(t: number, tick: number): boolean {
  const e = Math.round(t / TICK_HOURS);
  return e >= tick - SLOW_EVERY && e < tick;
}

/** No parity record is kept: a female counts as parous from endoParousAgeY, or once a birth has set her amenorrhoea. */
function parous(f: Chimp, P: Params): boolean { return f.age >= P.endoParousAgeY || ix(f).amenUntil > 0; }

/** The one call from needs() (life.ts): runs the states on slow-step ticks only. `floor` is the resting stress level needs() used before. */
export function endoNeeds(world: World, c: Chimp, x: ChimpX, sleeping: boolean, floor: number): void {
  if (world.tick % SLOW_EVERY === 0) endoStep(world, c, x, sleeping, paramsOf(world), floor);
}

/** One slow step of the three states of `c`. Deterministic; reads the last perception snapshot (x.seen). */
export function endoStep(world: World, c: Chimp, x: ChimpX, sleeping: boolean, P: Params, floor: number): void {
  const tick = world.tick, byId = index(world).byId;
  const male = isAdultMale(c);
  // context in view: the closest-rank adult male, the most swollen parous female, a partner in grooming contact
  let rival = 0, oestrus = 0, groom = -1;
  if (!sleeping) {
    const seen = x.seen;
    for (let i = 0; i < seen.length; i++) {
      const o = byId.get(seen[i]);
      if (!o || !o.alive || o.troopId !== c.troopId) continue;
      if (o.action === 'groom' && o.targetId === c.id && ix(o).phase === 1) { const b = bond(c, o); if (b > groom) groom = b; }
      if (!male) continue;
      if (isAdultMale(o)) { const cl = 1 - Math.abs(o.elo - c.elo) / P.escalateEloGap; if (cl > rival) rival = cl; }
      else if (o.sex === 'female' && o.swelling > oestrus && parous(o, P) &&!maternalKin(c, o)) oestrus = o.swelling;
    }
    if (c.action === 'groom' && x.phase === 1) { const o = byId.get(c.targetId); if (o && o.alive) { const b = bond(c, o); if (b > groom) groom = b; } }
  }

  // affiliation: grooming contact pulls it toward the bond with the partner; repair after conflict kicks it
  let f = x.affil ?? 0;
  if (since(x.recon, tick)) f += P.endoAffilRepairKick * (1 - f);
  if (since(x.consoleAt, tick) || since(x.consoledAt, tick)) f += P.endoAffilRepairKick * (1 - f);
  f += ((groom > 0 ? groom : 0) - f) * (1 - Math.exp(-SLOW_HOURS / P.endoAffilTauH));
  x.affil = f < 1e-6 ? 0 : f > 1 ? 1 : f;

  // stress load: energy deficit and strangers set the level it settles at; aggression given or received kicks it;
  // affiliation speeds the way down. Losses, wins, grooming, reconciliation and consolation act on chimp.stress where
  // they happen, as before.
  let s = c.stress;
  // E4b fix: one kick per aggressive interaction, given or received. Aggression stamps less than one slow step after the
  // last kicked one belong to the same interaction (the charge, the counter-charge, the decision that re-stamps the
  // loser as victim), which before the fix could kick twice.
  const agg = x.victimAt > x.lastAgg ? x.victimAt : x.lastAgg;
  if (since(agg, tick) && agg - (x.aggKick ?? NEVER) >= SLOW_HOURS) { s += P.endoStressAggrKick * (1 - s); x.aggKick = agg; }
  // E4b fix: only the start of a hearing episode kicks (endoHeard), not every slow step while the calls go on
  if (since(x.heardFrom ?? NEVER, tick)) s += P.endoStressStrangerW * (1 - s);
  const deficit = (c.hunger + (1 - x.cond)) / 2;
  let target = floor + P.endoStressDeficitW * deficit + (!sleeping && x.strangers > 0 ? P.endoStressStrangerW : 0);
  if (target > 1) target = 1;
  s += (target - s) * (1 - Math.exp(-SLOW_HOURS * (s > target ? 1 + P.endoAffilBufferK * x.affil : 1) / P.endoStressTauH));
  c.stress = s < 0 ? 0 : s > 1 ? 1 : s;

  // competitive arousal: a parous swollen female and a close-rank rival in view set the level; a win kicks it
  if (male) {
    let a = x.arousal ?? 0;
    const lc = c.lastConflict;
    if (lc && lc.won && since(lc.time, tick)) a += P.endoArousalWinKick * (1 - a);
    let level = P.endoArousalOestrusW * oestrus + P.endoArousalRivalW * rival;
    if (level > 1) level = 1;
    a += (level - a) * (1 - Math.exp(-SLOW_HOURS / P.endoArousalTauH));
    x.arousal = a < 1e-6 ? 0 : a > 1 ? 1 : a;
  }
}

/**
 * A stranger call is about to be heard (perception.ts hear, interventions.ts playback): called before x.heardAt is
 * overwritten, it marks the start of a new hearing episode when nothing was heard for endoHeardEpisodeH (E4b fix).
 */
export function endoHeard(world: World, x: ChimpX, P: Params): void {
  if (P.endoStates === 1 && world.time - x.heardAt > P.endoHeardEpisodeH) x.heardFrom = world.time;
}

/** Food sharing raises affiliation in giver and receiver (execution.ts; the only event that leaves no timestamp). */
export function endoShared(giver: Chimp, receiver: Chimp, P: Params): void {
  const gx = ix(giver), rx = ix(receiver), g = gx.affil ?? 0, r = rx.affil ?? 0;
  gx.affil = g + P.endoAffilShareKick * (1 - g);
  rx.affil = r + P.endoAffilShareKick * (1 - r);
}

// --- stage E4b: fast arousal (docs/staging/e4b-prereg.md) ---------------------------------------------------------
// The slow states set the gain of acute reactions but cannot carry them (E4a: male arousal was near zero at storm
// onsets, and the redirect needed an event gate). A fast state, catecholamine-like (sympathetic-adrenomedullary), rises
// at salient events and falls back within minutes (endoFastTauMin). It is stored with the eco-hour it was last set and
// read with exact decay, so it costs nothing between events and reading it is pure. Kicks are bounded, S += k × (1 − S),
// and applied where the event happens: a daytime storm onset (tick.ts) and aggression received (execution.ts onStart,
// conflict.ts). Not wired on purpose (no act in E4b reads the fast state there): stranger calls or sight, attacks seen,
// food finds, reunions.

/** Fast arousal of `x` at eco-hour `time` (pure): the last kick, decayed with endoFastTauMin. */
export function fastNow(x: ChimpX, time: number, P: Params): number {
  const f = x.fast;
  if (!f) return 0;
  return f * Math.exp(-(time - (x.fastAt ?? time)) * 60 / P.endoFastTauMin);
}

/** How long an option opened by the fast state stays on offer, in eco-hours: endoFastSpanTau time constants. */
export function fastSpanH(P: Params): number { return P.endoFastSpanTau * P.endoFastTauMin / 60; }

/** A salient event kicks the fast state of `c` by `k` (bounded). Callers check endoOn(P, 'endoFast'). */
export function endoKick(world: World, c: Chimp, k: number, P: Params): void {
  const x = ix(c), f = fastNow(x, world.time, P);
  x.fast = f + k * (1 - f); x.fastAt = world.time;
}

/** Aggression received (charged or attacked, a decided loss, a gang attack): the threat kick, while endoFast is on. */
export function endoThreat(world: World, o: Chimp): void {
  const P = paramsOf(world);
  if (endoOn(P, 'endoFast')) endoKick(world, o, P.endoFastThreatKick, P);
}

/** The acute drive of a male competitive act: the fast state, amplified by competitive arousal up to twice (design). */
function acuteDrive(x: ChimpX, time: number, P: Params): number {
  const d = fastNow(x, time, P) * (1 + (x.arousal ?? 0));
  return d > 1 ? 1 : d;
}

// --- scores (pure; candidates.ts) ---------------------------------------------------------------------------------
// One rule for the three acts: the constant score the dice-opened option had is the ceiling, and levels in 0..1 scale it.

/** Escalated attack on close-rank rival `o`: rises with arousal, own aggression and tension toward him; falls with stress and with affiliation toward him. */
export function escalateScore(c: Chimp, o: Chimp, x: ChimpX, P: Params): number {
  const a = x.arousal ?? 0;
  if (a <= 0) return 0;
  const drive = (c.personality.aggression + (x.tension[o.id] ?? 0)) / 2;
  return P.endoEscalateScore * a * drive * (1 - c.stress) * (1 - (x.affil ?? 0) * bond(c, o));
}

/** Redirected charge at a bystander after a loss: today's redirect terms at full stress, scaled by the stress load. */
export function redirectScore(c: Chimp, tension: number, P: Params): number {
  return c.stress * (P.redirectBase + c.personality.aggression * P.redirectAggrW + tension * P.redirectTensionW + P.redirectStressW);
}

/** Rain display at a storm onset: arousal and boldness scale the old score. */
export function rainScore(c: Chimp, x: ChimpX, P: Params): number {
  return P.rainDisplayScore * (x.arousal ?? 0) * c.personality.boldness;
}

/** Stage E4b (endoFast): rain display from the fast state, competitive arousal as gain, boldness as the trait. */
export function rainFastScore(c: Chimp, x: ChimpX, time: number, P: Params): number {
  return P.rainDisplayScore * acuteDrive(x, time, P) * c.personality.boldness;
}

/**
 * Stage E4b (endoFastRedirect): redirected charge after a loss. The dice model's own score (stress in its own term, the
 * slow state as gain), opened by no roll and scaled by the fast state.
 */
export function redirectFastScore(c: Chimp, x: ChimpX, tension: number, time: number, P: Params): number {
  return fastNow(x, time, P) * (P.redirectBase + c.personality.aggression * P.redirectAggrW + c.stress * P.redirectStressW + tension * P.redirectTensionW);
}
