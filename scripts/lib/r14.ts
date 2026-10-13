// Stage R14's fixed arms and state-only sampling. No model or world is started by this module.
import { createHash } from 'node:crypto';
import type { LocalPacket } from '../../server/decide';
import type { EngineArm } from '../r11-loop';

export const R14 = { trainSeeds: [48, 7], testSeed: 21, populationSeeds: [3457, 3823], days: 10,
  params: 'docs/staging/integrator-kit/params/M6-W50.json', burnIn: 30 };
export type Stratum = 'plain' | 'dayNest' | 'aloneDusk' | 'darkOut';
export interface PacketState { nest: boolean; day: boolean; dawn: boolean; dusk: boolean; dark: boolean; alone: boolean; companyNest: boolean }
export function stateOf(packet: LocalPacket): PacketState {
  const doing = String(packet.state.doing ?? ''), now = String(packet.state.now ?? ''), nearby = packet.state.nearby;
  const near = Array.isArray(nearby) ? nearby.filter((x): x is string => typeof x === 'string') : [];
  return { nest: doing.startsWith('in my nest,'), day: now.startsWith('full daylight;'), dawn: now.includes('getting lighter'),
    dusk: now.includes('getting darker'), dark: now.startsWith('dark;'), alone: near.length === 0, companyNest: near.some(s => s.includes('in a nest')) };
}
export function stratumOf(packet: LocalPacket): Stratum {
  const s = stateOf(packet);
  return s.nest && s.day ? 'dayNest' : s.nest && s.dusk && s.alone ? 'aloneDusk' : !s.nest && s.dark ? 'darkOut' : 'plain';
}
export function r14Arm(name: string): EngineArm | null {
  const match = /^r14-(source|trained|wire)-s(7|11)-draw-1$/.exec(name);
  if (!match) return null;
  const source = match[1], seed = match[2], adapter = source === 'wire' ? 'fake' : `${source === 'source' ? 'r11' : 'r14'}-p5b-s${seed}`;
  return { name, key: `r14-${source}-s${seed}`, adapter, packet: 'p5b', decodeName: 'draw-1',
    decode: { mode: 'draw', salt: 1, hold: 'act' }, worldSalt: 0, what: `R14 ${source}, training seed ${seed}; rules-taught model on a rules menu` };
}
export function r14Refusal(arm: EngineArm, seed: number, days: number, burnIn: number, profile: string, params: string, stop: boolean, timeout: number, contexts: boolean): string {
  if (arm.adapter === 'fake') return seed === 48 && days <= 2 ? '' : 'R14 dry run: seed 48, at most two days';
  if (profile !== 'field' || params !== R14.params || burnIn !== R14.burnIn || !stop || timeout !== 120 || !contexts) return 'R14 requires its fixed field world, 30-day burn-in, stop check, 120-second asks and saved contexts';
  if (arm.key.includes('source')) return (arm.adapter.endsWith('s7') ? [48, 21] : [7]).includes(seed) && days === 10 ? '' : 'R14 source: s7 on 48/21, s11 on 7, ten days';
  return (seed === 48 && days === 5) || (days === 20 && seed === (arm.adapter.endsWith('s7') ? 3457 : 3823)) ? '' : 'R14 trained: five-day rehearsal on 48, or 20-day confirmation on its registered world';
}
export interface SelectionRow { id: string; chimpId: number; day: number; split: 'train' | 'dev' | 'test'; stratum: Stratum; state?: PacketState; selectedVia?: string }
export const hash = (s: string): string => createHash('sha256').update(s).digest('hex');
export function selectRows<T extends SelectionRow>(rows: T[], source: 'learner' | 'rules'): T[] {
  const out: T[] = [], chosen = new Set<string>();
  for (const split of ['train', 'dev', 'test'] as const) {
    const scale = split === 'dev' ? 0.1 : 1, plain = split === 'test' ? 1500 : 780;
    const quotas: Record<Stratum, number> = { plain: source === 'learner' ? Math.ceil(plain * scale) : 0,
      dayNest: source === 'learner' ? Math.ceil(260 * scale) : 0, aloneDusk: Math.ceil(130 * scale), darkOut: Math.ceil(130 * scale) };
    const ordered = rows.filter(r => r.split === split).sort((a, b) => hash(`r14:${a.id}`).localeCompare(hash(`r14:${b.id}`)));
    // Plain means an unbiased sample of all asks. Rare top-ups exclude already selected rows.
    for (const group of ['plain', 'dayNest', 'aloneDusk', 'darkOut'] as const) {
      const perDay = new Map<string, number>(); let n = 0;
      for (const r of ordered) {
        if (n >= quotas[group]) break;
        if (chosen.has(r.id) || (group !== 'plain' && r.stratum !== group)) continue;
        const key = `${r.chimpId}:${r.day}`;
        if (group !== 'plain' && (perDay.get(key) ?? 0) >= 2) continue;
        chosen.add(r.id); out.push({ ...r, selectedVia: group }); n++; perDay.set(key, (perDay.get(key) ?? 0) + 1);
      }
    }
  }
  const test = rows.filter(r => r.split === 'test').sort((a, b) => hash(`r14-guard:${a.id}`).localeCompare(hash(`r14-guard:${b.id}`)));
  for (const kind of ['dawn', 'dusk', 'dark'] as const) {
    let n = 0;
    for (const r of test) {
      if (n >= 250) break;
      if (chosen.has(r.id) || !r.state?.nest || !r.state[kind] || (kind === 'dusk' && !r.state.companyNest)) continue;
      chosen.add(r.id); out.push({ ...r, selectedVia: `guard-${kind}` }); n++;
    }
  }
  return out;
}
