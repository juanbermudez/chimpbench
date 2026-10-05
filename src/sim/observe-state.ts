import type { BodyPercept, Candidate, Chimp, DecisionContext, OptionValue, World } from '../types';
import { candidateMeta, cohesionOn, companyValue, dependentOn, forageRateOn, presentCompany, socialBit, treeRateShare, V } from './candidates';
import { circadianOn, circadianSleepiness } from './circadian';
import { brightening } from './departure';
import { deficitDrive, digestaCaps, energyNeed, feedHorizon, fruitKcalPerUnit, gutCap, massOf, reserveCap } from './energy';
import { endoOn, fastNow } from './endocrine';
import { bestFallbackNear, fallbackOn } from './fallback';
import { fruitRate, leafWorth } from './intake';
import { darkOn, visionNow } from './light';
import type { Params } from './params';
import { fruitAt } from './phenology';
import { sleepiness } from './rhythm';
import { index, isChimpId, isTreeId, ix } from './state';
import { waterOn } from './water';

// Stage M1 (docs/staging/em-prereg.md §M1; switch observeState): the parts of Track E's state the decision model's
// observation shows (observe.ts adds them at observeState 1). Everything here reads the focal animal's own body, its last
// perception snapshot (trees and animals in view), its memory, or a belief the rules' valuation already holds it to (the
// crop a trip to a crown out of sight is valued at, candidateMeta.bel), through the functions that valuation calls, never
// a second formula. Pure: no world.rng; nothing opens books that are not open (a state with no open books gives no field).

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;
const dxz = (p: readonly number[], c: Chimp) => Math.hypot(p[0] - c.position[0], p[2] - c.position[2]);

/** The focal animal's Track E state (BodyPercept): each field only while its mechanism runs and the books it reads are open. */
export function bodyPercept(world: World, c: Chimp, P: Params): BodyPercept {
  const x = ix(c), b: BodyPercept = {};
  const L = P.energyLedger === 1 ? x.en : undefined;
  if (L) {
    b.reserves = r3(L.res / reserveCap(c, P));
    // the drive's functions open nothing once its books are open (eAvg set at the animal's first ledger tick)
    if (P.ledgerDrive === 1 && L.eAvg !== undefined) {
      b.deficit = r2(deficitDrive(c, P));
      b.needKcal = Math.round(energyNeed(c, P) / 10) * 10;
      if (P.rhythmSleep === 1) b.awakeH = r1(feedHorizon(c, L, P)[0]);
    }
    // foregut fill as the drive's satiation reads it (energy.ts gutFill): dry matter with ledgerDigesta, energy without
    b.gutFill = r2(clamp01(L.dm !== undefined && P.ledgerDigesta === 1 ? L.dm / digestaCaps(c, P)[0] : L.gut / gutCap(c, P)));
  }
  if (P.rhythmSleep === 1 && x.slp !== undefined) {
    b.sleepPressure = r2(x.slp);
    b.sleepiness = r2(circadianOn(P) ? circadianSleepiness(P, c) : sleepiness(x.slp, world.environment.daylight));
  }
  if (circadianOn(P) && x.cx !== undefined) { b.clock = r2(x.cx); b.clockRising = (x.cxc ?? 0) > 0; }
  if (waterOn(P) && x.wat) b.waterDeficitPct = r2(Math.max(0, x.wat.def) / (massOf(c, P) * 10));
  if (P.rhythmHeat === 1 && x.heat !== undefined) b.heat = r2(x.heat);
  if (P.endoStates === 1) {
    b.stress = r2(c.stress);
    if (x.arousal !== undefined) b.arousal = r2(x.arousal);
    if (x.affil !== undefined) b.affiliation = r2(x.affil);
    if (endoOn(P, 'endoFast')) b.acute = r2(fastNow(x, world.time, P));
  }
  // JSON-safe: a state at an extreme can make a derived value non-finite (an animal that never sleeps in a nest drives
  // sleep pressure to 1, and the drive's horizon and need with it); such a field is left out rather than sent as null
  for (const k of Object.keys(b) as (keyof BodyPercept)[]) { const v = b[k]; if (typeof v === 'number' && !Number.isFinite(v)) delete b[k]; }
  return b;
}

/** The light the animal sees (environment.daylight) and its change per hour over the last tick (what E2b's animals perceive). */
export function lightPercept(world: World): NonNullable<DecisionContext['light']> {
  return { level: r3(world.environment.daylight), trend: r2(brightening(world)) };
}

const _fb: [number, number] = [0, 0];

/**
 * What Track E's valuation gives option `k` (OptionValue), or undefined when it has none or the animal's books are not
 * open. Under forageRate only (the valuation is a rate). `R` is the animal's own full ripe-fruit rate in kcal/h (the
 * scale of intake.ts netRateShare); `present` is presentCompany when already computed.
 */
export function optionValue(world: World, c: Chimp, k: Candidate, P: Params, R: number): OptionValue | undefined {
  const x = ix(c), idx = index(world), meta = candidateMeta.get(k);
  const unit = fruitKcalPerUnit(P, false); // the valuation counts every crown's crop at a drupe unit (netRateShare)
  const crown = (treeId: number, travel: boolean, bel: number[] | undefined, feedersInView: () => number): OptionValue | undefined => {
    const t = idx.treeById.get(treeId);
    if (!t) return undefined;
    // a crown out of sight: the belief the trip was valued at ([tree, crop, hours unseen, feeders, distance, (chance of fruit)])
    if (bel && bel[0] === treeId) {
      const share = bel.length > 5 ? bel[5] : 1;
      return { kcalH: Math.round(treeRateShare(world, c, P, t, bel[1], bel[3], bel[4], travel, share) * R / 10) * 10,
        cropKcal: Math.round(bel[1] * unit / 50) * 50, seenH: Number.isFinite(bel[2]) ? r1(bel[2]) : -1, feeders: bel[3], distM: Math.round(bel[4]) };
    }
    if (!x.trees.includes(treeId)) return undefined; // neither in view nor believed: nothing the animal knows to show
    const crop = P.patchEcology === 1 ? fruitAt(world, t) : t.fruit, feeders = feedersInView(), d = dxz(t.position, c);
    return { kcalH: Math.round(treeRateShare(world, c, P, t, crop, feeders, d, travel) * R / 10) * 10,
      cropKcal: Math.round(crop * unit / 50) * 50, seenH: 0, feeders, distM: Math.round(d) };
  };
  /** Others in view feeding at or walking to crown `id` (computeCandidates' destWorth count), not counting `skip`. */
  const goingTo = (id: number, skip: number) => {
    let n = 0;
    for (const sid of x.seen) { const o = idx.byId.get(sid); if (o && o.alive && o !== c && o.id !== skip && o.targetId === id && (o.action === 'forage' || o.action === 'travel')) n++; }
    return n;
  };
  const gain = (o: Chimp, margin: boolean) => r2(margin ? Math.max(0, companyValue(c, o, P) - presentCompany(world, c, P)) : companyValue(c, o, P));
  const caretaker = dependentOn(world, c);
  switch (k.action) {
    case 'forage': {
      if (isTreeId(k.targetId)) return crown(k.targetId, false, undefined, () => Math.max(0, meta?.aux ?? 0));
      if (caretaker) return undefined; // a dependent's own foraging is not valued as a rate
      // leaves where it stands: their rate relative to ripe fruit (the best fallback cell in view scales it), by sight in the dark
      const fb = fallbackOn(P) ? bestFallbackNear(world, c.position[0], c.position[2], x.sight, _fb) : 1;
      const leaf = leafWorth(world, c, c.position[0], c.position[2], P, fruitRate(c, P).hungerPerH) * (darkOn(P) ? visionNow(world, 0) : 1);
      return { kcalH: Math.round(fb * leaf * R / 10) * 10 };
    }
    case 'travel': {
      const v = meta?.v ?? V.NONE, aux = meta?.aux ?? -1;
      if (v === V.TREE && isTreeId(k.targetId)) {
        const L = aux > 0 ? idx.byId.get(aux) : undefined;
        const food = crown(k.targetId, true, meta?.bel, () => goingTo(k.targetId, -1));
        // a joined trip (C13e, E5a): the leader's company (E5d's margin) plus the crown it goes to
        if (L && L.alive && cohesionOn(P)) return { ...(food ?? {}), company: gain(L, P.followMargin === 1) };
        return food;
      }
      if (v === V.CALLER && cohesionOn(P)) {
        const caller = aux > 0 ? idx.byId.get(aux) : undefined;
        const out: OptionValue = caller && caller.alive ? { company: gain(caller, P.companyMargin === 1) } : {};
        // the call's place and, under E5e bit 4, the crown the caller fed in (E3i's own call when the trip holds one)
        const own = x.cg !== undefined && x.cg[0] === k.targetId ? x.cg : undefined;
        const px = own ? own[3] : x.joinX, pz = own ? own[4] : x.joinZ;
        out.distM = Math.round(Math.hypot(px - c.position[0], pz - c.position[2]));
        const jt = own ? own[5] : k.targetId === x.joinCall ? x.jt : undefined;
        if (socialBit(P, 4) && jt !== undefined && jt > 0) {
          const food = crown(jt, true, meta?.bel, () => 1 + goingTo(jt, aux));
          if (food) return { ...food, ...out, distM: food.distM };
        }
        return out;
      }
      return undefined;
    }
    case 'follow': {
      const o = isChimpId(k.targetId) ? idx.byId.get(k.targetId) : undefined;
      if (!o || !o.alive || meta?.v !== V.PARTY || !cohesionOn(P)) return undefined;
      return { company: gain(o, P.followMargin === 1), distM: Math.round(dxz(o.position, c)) };
    }
    case 'drink': {
      const m = c.memory.find(e => e.kind === 'water' && e.entityId === k.targetId);
      return m ? { distM: Math.round(dxz(m.position, c)) } : undefined;
    }
    default: return undefined;
  }
}

/** Candidates with their OptionValue (copies keep their meta), for observe() at observeState 1. */
export function withValues(world: World, c: Chimp, list: Candidate[], P: Params, copy: (k: Candidate) => Candidate): Candidate[] {
  const L = ix(c).en;
  if (!forageRateOn(P) || !L || L.eAvg === undefined) return list;
  const R = fruitRate(c, P).fruitPerH * fruitKcalPerUnit(P, false);
  return list.map(k => {
    const v = optionValue(world, c, k, P, R);
    if (v) for (const key of Object.keys(v) as (keyof OptionValue)[]) { const n = v[key]; if (typeof n === 'number' && !Number.isFinite(n)) delete v[key]; } // JSON-safe
    if (!v || !Object.keys(v).length) return k;
    const out = copy(k);
    out.value = v;
    return out;
  });
}
