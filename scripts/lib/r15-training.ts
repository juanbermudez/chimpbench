import { createHash } from 'node:crypto';
import type { Kind } from '../../src/decide/facts';
import type { KernelRequest } from '../../src/kernel/types';
import { optionKey } from '../../src/kernel/decode';
import { isResourceKind, R15_PACKET_VERSION } from '../../src/kernel/resource-contract';
import { r15Packet } from '../../src/providers/packet';
import { candidateMeta, computeCandidates } from '../../src/sim/candidates';
import { optionKind } from '../../src/sim/menu';
import { paramsOf } from '../../src/sim/params';
import { targetRequest } from '../../src/sim/request';
import { rgMenu } from '../../src/sim/rg';
import { validateDecisionContext, record } from '../../src/sim/context-check';
import type { Chimp, DecisionContext, World } from '../../src/types';
import { splitOf } from '../r4-contexts';
import { beliefOf, labelData, REDRAWS, SAME_MIN } from '../r11-contexts';
import { beliefDraw, published, seeded, type Belief } from './soft-labels';
export { r15Packet, R15_PACKET_VERSION };
export const R15_KIND_TEACHER = 'r11-original-menu-kind-marginal-v1';
export const R15_TARGET_TEACHER = 'counterfactual-resource-valuation-v1';
export const R15_TARGET_REDRAWS = 2000;
export const digest = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export interface R15Row {
  id: string; decisionId: string; seed: number; chimpId: number; split: 'train' | 'dev' | 'test';
  phase: 'kind' | 'target'; packetVersion: typeof R15_PACKET_VERSION; teacher: string;
  context: DecisionContext; contextHash: string; packet: ReturnType<typeof r15Packet>; packetHash: string;
  pick: string; soft: Record<string, number>; diagnostics: { redraws: number; matchedMenus: number; excludedKindMass: number };
}
export function normalize(values: number[]): number[] {
  if (!values.length || values.some(v => !Number.isFinite(v) || v < 0)) throw new Error('invalid label');
  const sum = values.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) throw new Error('label has no mass');
  return values.map(v => v / sum);
}
export function kindMarginal(kinds: Kind[], originalKinds: Kind[], probabilities: number[]): { q: number[]; excluded: number } | null {
  if (originalKinds.length !== probabilities.length || new Set(kinds).size !== kinds.length) throw new Error('misaligned kinds');
  const p = normalize(probabilities), q = kinds.map(k => p.reduce((s, v, i) => s + (originalKinds[i] === k ? v : 0), 0));
  if (!q.some(v => v > 0)) return null;
  return { q: normalize(q), excluded: Math.max(0, 1 - q.reduce((a, b) => a + b, 0)) };
}
export interface TargetValue { key: string; raw: number; belief: Belief | null }
/** Conditional counterfactual teacher; packet order never decides ties or assigns random numbers. */
export function targetDistribution(values: TargetValue[], span: number, id: string, draws = R15_TARGET_REDRAWS): number[] {
  return normalize(targetCounts(values, span, id, draws).counts);
}
/** The teacher's draws as counts per option, in the values' order; `halves`: the same split into draws 1 to draws/2 and the rest (stage R16's teacher-half check). The sequence of random numbers is targetDistribution's own. */
export function targetCounts(values: TargetValue[], span: number, id: string, draws = R15_TARGET_REDRAWS): { counts: number[]; halves: [number[], number[]] } {
  if (!Number.isInteger(draws) || draws < 1 || !Number.isFinite(span) || span < 0 || values.some(v => !Number.isFinite(v.raw)) || new Set(values.map(v => v.key)).size !== values.length) throw new Error('invalid target valuation');
  const order = values.map((v, i) => ({ ...v, index: i })).sort((a, b) => a.key.localeCompare(b.key));
  const counts = values.map(() => 0), halves: [number[], number[]] = [values.map(() => 0), values.map(() => 0)], rnd = seeded(`r15-target:${id}`);
  for (let r = 0; r < draws; r++) {
    let best = -Infinity, winner = -1;
    for (const v of order) {
      const jitter = (rnd() - .5) * span, belief = v.belief ? beliefDraw(v.belief, rnd(), rnd()) : 0;
      const score = published(v.raw + jitter) + belief;
      if (score > best) { best = score; winner = v.index; }
    }
    if (winner < 0) throw new Error('no target');
    counts[winner]++; halves[r < draws / 2 ? 0 : 1][winner]++;
  }
  return { counts, halves };
}
/**
 * Stage R16's validity rule for the target teacher (docs/staging/r16-prereg.md §4.4): true when every option's raw value
 * plus half the jitter span is at or below 0, so that the published clamp, not the valuation, decides the label.
 */
export function clampTied(values: Pick<TargetValue, 'raw'>[], span: number): boolean {
  return values.length > 0 && values.every(v => v.raw + span / 2 <= 0);
}
/** Options of a target menu that the clamp holds at 0 in every draw (raw + span/2 at or below 0): counted, kept. */
export const alwaysClamped = (values: Pick<TargetValue, 'raw'>[], span: number): number => values.filter(v => v.raw + span / 2 <= 0).length;

export function exportRow(world: Pick<World, 'seed'>, chimp: Pick<Chimp, 'id'>, request: KernelRequest, decisionId: string,
  q: number[], teacher: string, diagnostics: R15Row['diagnostics']): R15Row {
  if (![48, 7, 21].includes(world.seed)) throw new Error('R15 training worlds are 48/7; evaluation is 21');
  const context: unknown = JSON.parse(JSON.stringify(request.context));
  if (!validateDecisionContext(context)) throw new Error('invalid training context');
  const phase = request.context.resourceChoice;
  if (!phase || request.context.chimpId !== chimp.id || q.length !== request.options.length) throw new Error('row identity or label mismatch');
  const probabilities = normalize(q), packet = r15Packet(context);
  if (JSON.stringify(packet) !== JSON.stringify(r15Packet(request.context))) throw new Error('JSON transport changed packet');
  const best = probabilities.reduce((b, v, i) => v > probabilities[b] ? i : b, 0);
  return { id: `${decisionId}/${phase}`, decisionId, seed: world.seed, chimpId: chimp.id, split: splitOf(world.seed, chimp.id), phase,
    packetVersion: R15_PACKET_VERSION, teacher, context, contextHash: digest(context), packet, packetHash: digest(packet), pick: `c${best}`,
    soft: Object.fromEntries(probabilities.map((v, i) => [`c${i}`, v])), diagnostics };
}
/** Options of the labeler beyond stage R15's defaults (stage R16; every field absent gives R15's behaviour exactly). */
export interface R15LabelOptions {
  /** Which resource group gives the target row: R15's hash choice among multi-target groups ('hash', the default), the first kind of a list that has a multi-target group, or none. */
  target?: 'hash' | 'none' | { kinds: Kind[] };
  /** Also return each teacher's two halves (the kind label of odd and even redraws; the target label of the first and second half of its draws). */
  halves?: boolean;
  /** Leave out a target row the published clamp decides (clampTied), reporting 'clamp-tied target' as an exclusion. */
  clampRule?: boolean;
  /** The kind teacher's redraw rule (default R11's). */
  redraws?: typeof REDRAWS;
}
/** What the labeler computed beyond the rows (stage R16's readings and checks; never in a packet). */
export interface R15LabelDetail {
  kind?: { label: Exclude<ReturnType<typeof labelData>, string>; marginal: { q: number[]; excluded: number }; halves?: [number[], number[]] | null; originalKinds: Kind[] };
  target?: { kind: Kind; group: number; request: KernelRequest; values: TargetValue[]; q: number[]; halves?: [number[], number[]]; clampTied: boolean; clamped: number };
}
/** Call at a fresh live decision; bounded selection belongs to the sampler, not to this labeler. */
export function r15TrainingRows(w: World, c: Chimp, request: KernelRequest, id: string, opts: R15LabelOptions = {}): { rows: R15Row[]; exclusions: string[]; detail: R15LabelDetail } {
  if (request.context.resourceChoice !== 'kind' || !request.context.resourceKinds || !request.groups) throw new Error('R15 needs a kind request with groups');
  const rows: R15Row[] = [], exclusions: string[] = [], detail: R15LabelDetail = {}, rng = w.rng, version = c.decisionVersion;
  const list = computeCandidates(w, c, []), menu = rgMenu(w, c, list);
  if (menu.length < 2) return { rows, exclusions: ['fewer than two original teacher options'], detail };
  const best = menu.reduce((b, k, i) => k.score > menu[b].score ? i : b, 0);
  const options = menu.map((k, i) => ({ alias: `c${i}`, action: k.action, targetId: k.targetId, variant: '', family: '', score: k.score }));
  const label = labelData({ id, options, rgIndex: best }, { w, c, list, menu, chosen: menu[best], rngBefore: rng }, opts.redraws ?? REDRAWS, !!opts.halves);
  if (typeof label === 'string' || !label.listOk || label.same < SAME_MIN) return { rows, exclusions: [typeof label === 'string' ? label : 'insufficient original-menu label reconstruction'], detail };
  const originalKinds = menu.map(optionKind), marginal = kindMarginal(request.context.resourceKinds, originalKinds, label.counts);
  if (!marginal) return { rows, exclusions: ['zero-retained-kind-mass'], detail };
  const half = (k: number) => label.halves ? kindMarginal(request.context.resourceKinds!, originalKinds, label.halves[k].map(v => v + 0)) : null;
  detail.kind = { label, marginal, originalKinds, ...(opts.halves ? { halves: label.halves && label.halves.every(h => h.some(v => v > 0)) ? [half(0)?.q ?? [], half(1)?.q ?? []] as [number[], number[]] : null } : {}) };
  rows.push(exportRow(w, c, request, id, marginal.q, R15_KIND_TEACHER, { redraws: label.n, matchedMenus: label.same, excludedKindMass: marginal.excluded }));
  const targets = request.groups.map((group, i) => ({ group, i, kind: request.context.resourceKinds?.[i] }))
    .filter(g => g.kind && isResourceKind(g.kind) && g.group.length > 1)
    .sort((a, b) => digest(`${id}:${a.kind}`).localeCompare(digest(`${id}:${b.kind}`)));
  const want = opts.target ?? 'hash';
  const chosen = want === 'none' ? undefined : want === 'hash' ? targets[0] : want.kinds.map(k => targets.find(t => t.kind === k)).find(Boolean);
  if (chosen) {
    const target = targetRequest(request, chosen.i);
    if (!target || target.context.resourceChoice !== 'target') throw new Error('R15 target request missing stage');
    const P = paramsOf(w), values = target.options.map(k => {
      const meta = candidateMeta.get(k);
      if (meta?.raw === undefined) throw new Error('target has no true raw valuation');
      return { key: optionKey(k), raw: meta.raw, belief: beliefOf(w, c, k, P)?.table ?? null };
    });
    const t = targetCounts(values, P.candidateJitterSpan, id), q = normalize(t.counts), tied = clampTied(values, P.candidateJitterSpan);
    detail.target = { kind: chosen.kind!, group: chosen.i, request: target, values, q, ...(opts.halves ? { halves: t.halves } : {}), clampTied: tied, clamped: alwaysClamped(values, P.candidateJitterSpan) };
    if (opts.clampRule && tied) exclusions.push('clamp-tied target');
    else rows.push(exportRow(w, c, target, id, q, R15_TARGET_TEACHER, { redraws: R15_TARGET_REDRAWS, matchedMenus: R15_TARGET_REDRAWS, excludedKindMass: 0 }));
  }
  if (w.rng !== rng || c.decisionVersion !== version) throw new Error('teacher changed live random state or decision version');
  return { rows, exclusions, detail };
}
/** The adapters each training stage may name, with the stage its manifest must carry (stage R16 adds two rounds; docs/staging/r16-prereg.md §8). */
export const ADAPTER_NAME = /^(r15-resources|r16-zero|r16-agg)-s(7|11)$/;
export const adapterStage = (name: string): 'R15' | 'R16' | null => !ADAPTER_NAME.test(name) ? null : name.startsWith('r15-') ? 'R15' : 'R16';
export function assertR15AdapterManifest(value: unknown): asserts value is Record<string, unknown> {
  if (!record(value) || typeof value.adapter !== 'string' || value.stage !== adapterStage(value.adapter) || value.packetVersion !== R15_PACKET_VERSION || value.kindTeacher !== R15_KIND_TEACHER || value.targetTeacher !== R15_TARGET_TEACHER || value.labels !== 'soft'
    || typeof value.adapter_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.adapter_sha256)
    || !record(value.hyperparameters) || value.hyperparameters.seed !== Number(value.adapter.split('-s')[1]) || value.hyperparameters.epochs !== 3) throw new Error('incompatible or incomplete R15 adapter manifest');
}
