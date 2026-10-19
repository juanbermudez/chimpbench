import { TICK_HOURS } from '../sim/state';
import type { StepResult } from '../kernel/types';
import type { World } from '../types';

// "Who decides", exactly as R16's meter counts it (scripts/lib/r10-run.ts meterTick and scripts/lib/r16-run.ts runDay16;
// stage R7's ledger categories, docs/staging/r7-ledger.md §2): every living animal carries the owner of the act it is in,
// a fresh model choice, an intention the loop's gate held, or the rules, and each tick adds a tick's minutes to that
// owner. The owner changes when the gate keeps or begins an act for an animal on the model (held), when the rules start an
// act for an animal that is not on the model inside the tick (rules), and when a pass settles a waiting animal's ask (the
// model, or the rules for a fallback). Kept here as a rolling simulated hour for the interface, and as totals since the
// mode began (which a test holds equal to R16's own minutes on the same run). Reads the world; writes nothing in it.

export type Owner = 'model' | 'held' | 'rules';
const MODEL = 1, HELD = 2, RULES = 3, RULES_YOUNG = 4;
/** Minutes in one tick (R16's TICK_MIN). */
export const TICK_MIN = TICK_HOURS * 60;
/** One simulated hour of ticks: the window the readout shows. */
export const WINDOW = Math.round(1 / TICK_HOURS);

export interface Minutes { model: number; held: number; rules: number }
interface Animal { owner: Owner; total: Minutes; ring: Uint8Array }
/** Minutes of the window by owner, the rules' split into animals under the mode's age and adults. */
export interface WindowMinutes extends Minutes { rulesYoung: number; rulesAdult: number; ticks: number }

export class DriveLedger {
  private animals = new Map<number, Animal>();
  /** Per tick of the window: animal-minutes by code (index 1 to 4), as counts of animals. */
  private slots = new Uint16Array(WINDOW * 5);
  private head = 0; private filled = 0;
  /** Ticks counted since the ledger began. */
  ticks = 0;
  /**
   * `owners`: who set each animal's act in progress, as a saved simulation recorded it (R16 carries its meter's owners in
   * every checkpoint the same way). Absent: R16's meterStart, every animal alive when the run begins on the rules' account
   * (the burn-in's acts are the rules'). The hour itself is not saved: after a reopen the window fills again from empty.
   */
  constructor(world: World, readonly minAge: number, owners?: Record<string, Owner>) {
    for (const c of world.chimps) if (c.alive) { const a = this.fresh(); const o = owners?.[c.id]; if (o === 'model' || o === 'held' || o === 'rules') a.owner = o; this.animals.set(c.id, a); }
  }
  private fresh(): Animal { return { owner: 'rules', total: { model: 0, held: 0, rules: 0 }, ring: new Uint8Array(WINDOW) }; }
  /** Who set each animal's act in progress, for a save (plain data). */
  owners(): Record<string, Owner> { return Object.fromEntries([...this.animals].map(([id, a]) => [String(id), a.owner])); }

  /** After the tick: an animal not on the model whose decision count rose inside it was set going by the rules. */
  afterTick(world: World, before: Map<number, number>, byId: Map<number, World['chimps'][number]>): void {
    for (const [id, v] of before) {
      const c = byId.get(id), a = this.animals.get(id);
      if (!c || !a) continue;
      if (c.controller !== 'model' && c.decisionVersion > v && c.alive) a.owner = 'rules';
    }
  }
  /** The gate kept or began an act for these animals inside the tick, without asking. */
  held(ids: readonly number[]): void { for (const id of ids) { const a = this.animals.get(id); if (a) a.owner = 'held'; } }
  /** A pass settled these asks: the model's choice applied, or the rules for anything refused. */
  settled(results: readonly StepResult[]): void {
    for (const r of results) { const a = this.animals.get(r.chimpId); if (a) a.owner = r.by === 'kernel' ? 'model' : 'rules'; }
  }
  /** The tick is over (after its pass, if it had one): every living animal adds a tick's minutes to the owner of its act. */
  close(world: World): void {
    const at = this.head, base = at * 5;
    this.slots.fill(0, base, base + 5);
    for (const a of this.animals.values()) a.ring[at] = 0;
    for (const c of world.chimps) {
      if (!c.alive) continue;
      let a = this.animals.get(c.id);
      if (!a) { a = this.fresh(); this.animals.set(c.id, a); }
      a.total[a.owner] += TICK_MIN;
      const code = a.owner === 'model' ? MODEL : a.owner === 'held' ? HELD : c.age < this.minAge ? RULES_YOUNG : RULES;
      a.ring[at] = code; this.slots[base + code]++;
    }
    this.head = (this.head + 1) % WINDOW; this.filled = Math.min(WINDOW, this.filled + 1); this.ticks++;
  }

  /** The last simulated hour (or as much of it as has run since the ledger began), in animal-minutes. */
  window(): WindowMinutes {
    const out: WindowMinutes = { model: 0, held: 0, rules: 0, rulesYoung: 0, rulesAdult: 0, ticks: this.filled };
    for (let t = 0; t < WINDOW; t++) {
      const b = t * 5;
      out.model += this.slots[b + MODEL]; out.held += this.slots[b + HELD];
      out.rulesAdult += this.slots[b + RULES]; out.rulesYoung += this.slots[b + RULES_YOUNG];
    }
    for (const k of ['model', 'held', 'rulesAdult', 'rulesYoung'] as const) out[k] *= TICK_MIN;
    out.rules = out.rulesAdult + out.rulesYoung;
    return out;
  }
  /** One animal's last simulated hour, in minutes, or null when the ledger has not seen it alive. */
  animal(id: number): (Minutes & { ticks: number }) | null {
    const a = this.animals.get(id);
    if (!a) return null;
    const out = { model: 0, held: 0, rules: 0, ticks: 0 };
    for (let t = 0; t < WINDOW; t++) {
      const code = a.ring[t];
      if (!code) continue;
      out.ticks++;
      if (code === MODEL) out.model += TICK_MIN; else if (code === HELD) out.held += TICK_MIN; else out.rules += TICK_MIN;
    }
    return out;
  }
  /** Minutes by owner since the ledger began, per animal (R16's `own` minutes). */
  totals(): Map<number, Minutes> { return new Map([...this.animals].map(([id, a]) => [id, { ...a.total }])); }
  /** The owner an animal's act carries now. */
  ownerOf(id: number): Owner | null { return this.animals.get(id)?.owner ?? null; }
}

/** Shares of a set of minutes (0 when there are none). */
export function shares(m: Minutes): Minutes {
  const sum = m.model + m.held + m.rules;
  return sum > 0 ? { model: m.model / sum, held: m.held / sum, rules: m.rules / sum } : { model: 0, held: 0, rules: 0 };
}
