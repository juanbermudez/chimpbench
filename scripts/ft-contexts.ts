// Decision contexts for fine-tuning GLiNER2.5-Decide (docs/decide-finetune.md §3).
// Every chimp is model-controlled in async mode; at each fresh decision point we record the exact
// packet the browser would send, then resolve by rules, so the world evolves as it does under rules.
// Sampling uses its own PRNG, never world.rng, and splits by seed so no world feeds two splits.
//
//   pnpm exec tsx scripts/ft-contexts.ts                          # default splits -> artifacts/decide-ft/contexts/
//   pnpm exec tsx scripts/ft-contexts.ts --split test --seeds 3001 --per-world 20 --days 6 --out /tmp/x
//   ... --profile field   sample the 8 km field profile (default compressed)
//   ... --feats   also record per-option stand-in features;  --capture-p p --per-chimp n   denser sampling (distillation)
//   ... --v1    also record the pre-context-aware inputs (full night menu, fixed prompt) for an A/B
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildJevQuestion, buildLocalQuestion, decisionContextError, estimateInputTokens, TOKEN_BUDGET } from '../server/decide';
import { buildRequest } from '../src/decision';
import { applyDecision, createWorld, rulesChoice, tickWorld } from '../src/simulation';
import { computeCandidates, candidateMeta, V } from '../src/sim/candidates';
import { TICK_HOURS } from '../src/sim/state';
import { optionFeatures } from './ft-features';
import type { Action, Candidate, Chimp, World } from '../src/types';

export type OptionClass = 'aggressive' | 'protective' | 'collective' | 'affiliative' | 'avoidant' | 'mating' | 'maintenance';
export type Bucket = 'both' | 'agg' | 'soc' | 'maint';

const VARIANT = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k])) as Record<number, string>;
const AFFILIATIVE = new Set<Action>(['groom', 'play', 'reconcile', 'console', 'share', 'beg', 'nurse', 'follow', 'pant-grunt', 'submit']);

/** What an option means socially. Coalition charges and joint hunts or patrols are collective; defending young is protective. */
export function optionClass(action: Action, variant: number): OptionClass {
  if (action === 'charge') return variant === V.COALITION ? 'collective' : variant === V.DEFEND ? 'protective' : 'aggressive';
  if (action === 'display' || action === 'attack' || action === 'guard') return 'aggressive';
  if (action === 'call') return variant === V.COUNTERCALL ? 'aggressive' : 'affiliative';
  if (action === 'hunt' || action === 'patrol') return 'collective';
  if (AFFILIATIVE.has(action)) return 'affiliative';
  if (action === 'flee' || action === 'alarm' || action === 'shelter') return 'avoidant';
  if (action === 'mate' || action === 'consort') return 'mating';
  return 'maintenance';
}

export function bucketOf(classes: OptionClass[]): Bucket {
  const agg = classes.includes('aggressive');
  const soc = classes.some(c => c === 'affiliative' || c === 'collective');
  return agg && soc ? 'both' : agg ? 'agg' : soc ? 'soc' : 'maint';
}

// Share of each split per menu bucket (design assumption: over-samples menus where temperament can matter).
export const QUOTA: Record<Bucket, number> = { both: 0.35, agg: 0.2, soc: 0.3, maint: 0.15 };

export interface ContextRecord {
  id: string; split: string; seed: number; tick: number; time: number;
  chimpId: number; name: string; community: number; sex: string; age: number; bucket: Bucket;
  options: { alias: string; action: Action; targetId: number; variant: string; cls: OptionClass }[];
  rulesIndex: number;
  packet: ReturnType<typeof buildLocalQuestion>;
  /** The Jev-native packet for the same menu (server/decide.ts buildJevQuestion). */
  jev: Omit<ReturnType<typeof buildJevQuestion>, 'keys'>;
  /** With { v1: true }: the pre-context-aware inputs for the same moment (full menu, fixed prompt), to A/B them. */
  v1?: { options: ContextRecord['options']; rulesIndex: number; packet: ReturnType<typeof buildLocalQuestion> };
  /** With { feats: true }: per-option features for the distilled stand-ins (scripts/ft-features.ts), in option order. */
  feats?: number[][];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const same = (a: Pick<Candidate, 'action' | 'targetId'>, b: Pick<Candidate, 'action' | 'targetId'>) => a.action === b.action && a.targetId === b.targetId;

function describe(world: World, c: Chimp, options: Candidate[]): ContextRecord['options'] {
  const all = computeCandidates(world, c, []);
  return options.map((o, i) => {
    const source = all.find(a => same(a, o));
    const v = (source && candidateMeta.get(source)?.v) ?? V.NONE;
    return { alias: `c${i}`, action: o.action, targetId: o.targetId, variant: VARIANT[v] ?? 'NONE', cls: optionClass(o.action, v) };
  });
}

/**
 * The packets plus option classes for one waiting chimp, or null when the menu is not a real choice. With v1, the
 * record is kept when the old menu is a real choice even if the night or dusk menu leaves fewer than two options (then
 * rules decide in v2, and `options` holds what is left).
 */
export function capture(world: World, c: Chimp, split: string, seed: number, opts: { v1?: boolean; feats?: boolean } = {}): ContextRecord | null {
  const cur = buildRequest(world, c);
  const old = opts.v1 ? buildRequest(world, c, { phaseMenu: false }) : null;
  const gate = old ?? cur;
  if (gate.options.length < 2 || decisionContextError(gate.context) !== '') return null;
  const packet = buildLocalQuestion(cur.context);
  if (estimateInputTokens(packet.state, packet.questions) > TOKEN_BUDGET) return null;
  const described = describe(world, c, cur.options);
  const { keys: _keys, ...jev } = buildJevQuestion(cur.context);
  const v1 = old ? { options: describe(world, c, old.options), rulesIndex: old.rulesIndex, packet: buildLocalQuestion(old.context, { staticInstructions: true }) } : undefined;
  return {
    id: `${seed}-${world.tick}-${c.id}`, split, seed, tick: world.tick, time: +world.time.toFixed(4),
    chimpId: c.id, name: c.name, community: c.troopId, sex: c.sex, age: +c.age.toFixed(2),
    bucket: bucketOf((v1 ?? { options: described }).options.map(d => d.cls)), options: described, rulesIndex: cur.rulesIndex, packet, jev,
    ...(v1 ? { v1 } : {}),
    ...(opts.feats ? { feats: optionFeatures(cur.context, cur.options, cur.rulesIndex) } : {}),
  };
}

export interface SampleOptions { split: string; seed: number; days: number; warmupDays: number; perWorld: number; minAge: number; captureP: number; spacingH: number; perChimp: number; v1?: boolean; feats?: boolean; profile?: 'compressed' | 'field' }

/** Run one world, pool candidate contexts at decision points, then draw a stratified sample. */
export function sampleWorld(o: SampleOptions): ContextRecord[] {
  const world = createWorld(o.seed, { profile: o.profile ?? 'compressed' });
  world.modelPolicy = { ...world.modelPolicy, mode: 'async' };
  const rand = mulberry32(o.seed * 7919 + 17);
  const lastTaken = new Map<number, number>();
  const pool: ContextRecord[] = [];
  const ticks = Math.round(o.days * 24 / TICK_HOURS), warm = Math.round(o.warmupDays * 24 / TICK_HOURS);
  for (let t = 0; t < ticks; t++) {
    for (const c of world.chimps) if (c.alive) c.controller = 'model';
    tickWorld(world);
    for (const c of world.chimps) {
      if (!c.alive || c.awaitingDecisionSince === null) continue;
      if (t >= warm && c.age >= o.minAge && world.time - (lastTaken.get(c.id) ?? -1e9) >= o.spacingH && rand() < o.captureP) {
        const rec = capture(world, c, o.split, o.seed, { v1: o.v1, feats: o.feats });
        if (rec) { pool.push(rec); lastTaken.set(c.id, world.time); }
      }
      const pick = rulesChoice(world, c);
      if (pick) applyDecision(world, c.id, pick, 'rules', c.decisionVersion);
    }
  }
  return stratify(pool, o.perWorld, o.perChimp, rand);
}

/** Fill bucket quotas in random order with a per-chimp cap; spare quota flows to whatever buckets have stock. */
export function stratify(pool: ContextRecord[], n: number, perChimp: number, rand: () => number): ContextRecord[] {
  const shuffled = pool.map(r => ({ r, k: rand() })).sort((a, b) => a.k - b.k).map(x => x.r);
  const taken: ContextRecord[] = [];
  const perId = new Map<number, number>();
  const take = (r: ContextRecord) => { taken.push(r); perId.set(r.chimpId, (perId.get(r.chimpId) ?? 0) + 1); };
  const ok = (r: ContextRecord) => !taken.includes(r) && (perId.get(r.chimpId) ?? 0) < perChimp;
  for (const b of Object.keys(QUOTA) as Bucket[]) {
    let want = Math.round(n * QUOTA[b]);
    for (const r of shuffled) { if (want <= 0) break; if (r.bucket === b && ok(r)) { take(r); want--; } }
  }
  for (const r of shuffled) { if (taken.length >= n) break; if (ok(r)) take(r); }
  return taken.slice(0, n).sort((a, b) => a.seed - b.seed || a.tick - b.tick || a.chimpId - b.chimpId);
}

/** Fingerprint of the code that shapes packets, so labels are tied to the sim version that produced them. */
export function codeHash(): string {
  const h = createHash('sha256');
  const files = [...readdirSync('src/sim').filter(f => f.endsWith('.ts')).map(f => `src/sim/${f}`), 'src/decision.ts', 'server/decide.ts'].sort();
  for (const f of files) h.update(f + '\0').update(readFileSync(f));
  return h.digest('hex');
}

const SPLITS: Record<string, { seeds: number[]; perWorld: number }> = {
  train: { seeds: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012], perWorld: 75 },
  dev: { seeds: [2001, 2002], perWorld: 50 },
  test: { seeds: [3001, 3002, 3003, 3004], perWorld: 50 },
  // Unlabeled contexts for the stand-in fits (Stage P4); run only with --split distill --seeds ...
  distill: { seeds: [], perWorld: 300 },
};

if (process.argv[1]?.endsWith('ft-contexts.ts')) {
  const args = process.argv.slice(2);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const out = resolve(flag('out', 'artifacts/decide-ft/contexts'));
  const only = flag('split', '');
  const days = +flag('days', '24'), warmupDays = +flag('warmup', '3');
  mkdirSync(out, { recursive: true });
  const manifest: Record<string, unknown> = { codeSha256: codeHash(), profile: flag('profile', 'compressed'), days, warmupDays, quota: QUOTA, splits: {} };
  for (const [split, cfg] of Object.entries(SPLITS)) {
    if (only && split !== only) continue;
    const seeds = flag('seeds', '') ? flag('seeds', '').split(',').map(Number) : cfg.seeds;
    const perWorld = +flag('per-world', String(cfg.perWorld));
    const rows: ContextRecord[] = [];
    for (const seed of seeds) {
      const t0 = Date.now();
      const got = sampleWorld({ split, seed, days, warmupDays, perWorld, minAge: 8, captureP: +flag('capture-p', '0.08'), spacingH: 2, perChimp: +flag('per-chimp', '6'), v1: args.includes('--v1'), feats: args.includes('--feats'), profile: flag('profile', 'compressed') === 'field' ? 'field' : 'compressed' });
      rows.push(...got);
      const mix = Object.fromEntries((Object.keys(QUOTA) as Bucket[]).map(b => [b, got.filter(r => r.bucket === b).length]));
      console.log(`${split} seed ${seed}: ${got.length} contexts ${JSON.stringify(mix)} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    }
    writeFileSync(`${out}/${split}.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    (manifest.splits as Record<string, unknown>)[split] = { seeds, perWorld, count: rows.length };
  }
  writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`wrote ${out}`);
}
