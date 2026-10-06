import type { Chimp, World } from '../../src/types';
import { isAdultMale } from '../../src/sim/hierarchy';
import { index, simOf, type SimWorld } from '../../src/sim/state';

// Stage ED readouts (docs/staging/ed-prereg.md §5): measurement only. A watcher stepped after every tick records, for each
// body the simulation holds (deadBody 1), whether its carer had access, whether and for how long she carried it, and who
// walked up to it or groomed it. Nothing here writes the world. The field figures these are compared with are minima
// from intermittent observation (lonsdorf2020, soldati2022); the simulation's are exact.

export type ApproachClass = 'carer' | 'maternal sibling' | 'immature' | 'adult male' | 'other';
export interface DeadCase {
  id: number; name: string; ageY: number; infant: boolean; cause: string; deathTime: number;
  /** The carer had the body in her hands at death or saw it at a decision point afterwards (BodyState.acc). */
  access: boolean;
  /** Ticks the body was held after the death tick, hours held, times it was taken up again, and the eco-hours from the death to the last tick it was held. */
  heldTicks: number; heldHours: number; takeUps: number; carryHours: number;
  /** Still held when the watch ended (the duration is then a minimum). */
  open: boolean;
  /** Who walked up and looked, and who groomed it, with their class when first seen doing so. */
  inspected: { id: number; cls: ApproachClass }[]; groomed: { id: number; cls: ApproachClass }[];
}

export function approachClass(c: Chimp, body: Chimp, carer: number): ApproachClass {
  if (c.id === carer) return 'carer';
  if (body.motherId > 0 && c.motherId === body.motherId) return 'maternal sibling';
  if (c.age < 10) return 'immature';
  return isAdultMale(c) ? 'adult male' : 'other';
}

export class DeadWatch {
  readonly cases = new Map<number, DeadCase>();
  private by = new Map<number, number>();
  constructor(private world: World, private tickHours: number) {}
  /** Call once after every tickWorld. */
  step(): void {
    const bodies = (this.world as SimWorld).sim?.bodies;
    for (const k of this.by.keys()) if (!bodies || !bodies[k]) { const c = this.cases.get(k); if (c) c.open = false; this.by.delete(k); }
    if (!bodies) return;
    const byId = index(this.world).byId;
    for (const key in bodies) {
      const id = +key, st = bodies[id], b = byId.get(id);
      if (!b) continue;
      let c = this.cases.get(id);
      if (!c) {
        c = { id, name: b.name, ageY: b.age, infant: b.stage === 'infant', cause: b.causeOfDeath ?? '', deathTime: b.deathTime ?? this.world.time, access: false,
          heldTicks: 0, heldHours: 0, takeUps: 0, carryHours: 0, open: false, inspected: [], groomed: [] };
        this.cases.set(id, c);
        this.by.set(id, -1);
        if (c.deathTime === this.world.time) { this.by.set(id, st.by); c.access = st.acc === 1; c.open = st.by >= 0; continue; } // the death tick itself is not carrying
      }
      c.access = st.acc === 1;
      const was = this.by.get(id) ?? -1;
      if (st.by >= 0) { c.heldTicks++; c.heldHours = c.heldTicks * this.tickHours; c.carryHours = this.world.time - c.deathTime; if (was < 0) c.takeUps++; }
      c.open = st.by >= 0;
      this.by.set(id, st.by);
      for (const who of st.insp) if (!c.inspected.some(e => e.id === who)) { const a = byId.get(who); if (a) c.inspected.push({ id: who, cls: approachClass(a, b, st.carer) }); }
      for (const who of st.grm) if (!c.groomed.some(e => e.id === who)) { const a = byId.get(who); if (a) c.groomed.push({ id: who, cls: approachClass(a, b, st.carer) }); }
    }
  }
}

const quantile = (v: number[], q: number): number => {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b), p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
  return s[lo] + (s[hi] - s[lo]) * (p - lo);
};

export interface DeadSummary {
  infantDeaths: number; withAccess: number; carried: number;
  /** Carried ÷ deaths with access (null when no death had access). Field: 1.00 at Gombe, 0.71 at Budongo. */
  carriedShare: number | null;
  /** Days from the death to the last tick held, over carried bodies (exact; the field figures are minima). */
  carryDays: { n: number; median: number; q1: number; q3: number; max: number; over10: number; open: number };
  oldestCarriedY: number | null;
  /** Bodies of infants that at least one animal of the class walked up to or groomed, and the acts counted. */
  inspectedBy: Record<ApproachClass, number>; groomedBy: Record<ApproachClass, number>;
}

/** The registered readouts over the infant bodies a watch has seen. */
export function summarizeDead(cases: Iterable<DeadCase>): DeadSummary {
  const all = [...cases].filter(c => c.infant), acc = all.filter(c => c.access), car = acc.filter(c => c.heldTicks > 0);
  const days = car.map(c => c.carryHours / 24);
  const zero = (): Record<ApproachClass, number> => ({ carer: 0, 'maternal sibling': 0, immature: 0, 'adult male': 0, other: 0 });
  const inspectedBy = zero(), groomedBy = zero();
  for (const c of all) { for (const e of c.inspected) inspectedBy[e.cls]++; for (const e of c.groomed) groomedBy[e.cls]++; }
  return {
    infantDeaths: all.length, withAccess: acc.length, carried: car.length, carriedShare: acc.length ? car.length / acc.length : null,
    carryDays: { n: days.length, median: quantile(days, 0.5), q1: quantile(days, 0.25), q3: quantile(days, 0.75), max: days.length ? Math.max(...days) : NaN,
      over10: days.filter(d => d > 10).length, open: car.filter(c => c.open).length },
    oldestCarriedY: car.length ? Math.max(...car.map(c => c.ageY)) : null, inspectedBy, groomedBy,
  };
}

/** For tests and scripts: the body records as plain data (a copy). */
export function bodiesOf(world: World): Record<number, { by: number; exp: number; carer: number; insp: number[]; grm: number[]; acc: number; held: number }> {
  return JSON.parse(JSON.stringify(simOf(world).bodies ?? {}));
}
