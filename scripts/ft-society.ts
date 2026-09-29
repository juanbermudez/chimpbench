// Society-level test of the fine-tuned Decide adapters (docs/decide-finetune.md §6, Stage F6).
// Every chimp aged 8+ is model-driven by its community's adapter; everyone else follows rules. Decisions are
// answered before the next tick (lockstep semantics), batched across all waiting chimps. The model only
// chooses: legality is re-checked by applyDecision and rules decide whenever an answer does not apply.
//
//   pnpm exec tsx scripts/ft-society.ts --cond rules --seed 4001 --days 6
//   pnpm exec tsx scripts/ft-society.ts --cond rot0 --seed 4001 --days 6      # rot0..rot2: adapters rotated over communities
//   pnpm exec tsx scripts/ft-society.ts --cond base --seed 4001 --days 6      # untuned model everywhere
//   pnpm exec tsx scripts/ft-society.ts --cond jev2 --seed 4001 --days 3      # Jev drives one community (1-3), rules the rest
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { applyDecision, createWorld, resolveByRules, tickWorld } from '../src/simulation';
import { TICK_HOURS } from '../src/sim/state';
import type { Action, Chimp, Interaction, SimEvent, World } from '../src/types';
import { capture, codeHash, type ContextRecord } from './ft-contexts';

const ADAPTERS = ['baseline', 'aggressive', 'collaborative'] as const;
const MIN_AGE = 8; // matches the training contexts
const ACTIVITY: Record<string, Action[]> = {
  aggressive: ['display', 'charge', 'attack', 'guard'],
  affiliative: ['groom', 'play', 'reconcile', 'console', 'share', 'beg', 'pant-grunt'],
  collective: ['hunt', 'patrol'],
  feeding: ['forage', 'drink'],
  resting: ['rest', 'nest', 'shelter'],
  moving: ['travel', 'follow', 'climb'],
  avoidant: ['flee', 'submit', 'alarm'],
};
const COUNTED = ['display', 'charge', 'chase', 'fight', 'coalition', 'groom', 'play', 'reconcile', 'console', 'share', 'pant-grunt',
  'patrol', 'hunt', 'kill', 'intergroup', 'infanticide', 'takeover', 'guard', 'mate'] as const;

/** Which adapter drives each community (1 West, 2 East, 3 North); null means rules. */
export function assignment(cond: string): Record<number, string | null> {
  if (cond === 'rules') return { 1: null, 2: null, 3: null };
  if (cond === 'base') return { 1: 'base', 2: 'base', 3: 'base' };
  // One community driven by Jev (TypeSafe), the others by rules: jev1 West, jev2 East, jev3 North.
  const jev = /^jev([123])$/.exec(cond);
  if (jev) return { 1: null, 2: null, 3: null, [+jev[1]]: 'jev' };
  const m = /^rot(\d)$/.exec(cond);
  if (!m) throw new Error(`unknown --cond ${cond}`);
  const r = +m[1];
  return { 1: ADAPTERS[r % 3], 2: ADAPTERS[(r + 1) % 3], 3: ADAPTERS[(r + 2) % 3] };
}

class Worker {
  private lines: AsyncIterableIterator<string>;
  ready: Record<string, unknown> = {};
  constructor(device: string) {
    const python = process.env.MGOGO_DECIDE_PYTHON ?? resolve(homedir(), 'Desktop/GHN/data/raw/decide-env/bin/python');
    const child = spawn(python, ['-B', 'worker.py', '--device', device], {
      cwd: resolve('training/decide_ft'),
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.6', PYTORCH_MPS_LOW_WATERMARK_RATIO: '0.4' },
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    this.child = child;
    this.lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  }
  private child: ReturnType<typeof spawn>;
  async start() {
    const first = await this.lines.next();
    this.ready = JSON.parse(first.value);
    if (!this.ready.ready) throw new Error(`worker failed: ${first.value}`);
  }
  async score(batch: { adapter: string; packet: unknown }[]): Promise<number[][]> {
    this.child.stdin!.write(JSON.stringify({ batch }) + '\n');
    const line = await this.lines.next();
    const res = JSON.parse(line.value);
    if (res.error) throw new Error(res.error);
    return res.results;
  }
  stop() { this.child.kill(); }
}

interface CommunityTally {
  adultDays: number; activity: Record<string, number>; samples: number; interactions: Record<string, number>;
  deaths: number; injuries: number; decisions: number; applied: number;
  aggMenus: number; aggPicks: number; socMenus: number; socPicks: number; agreeRules: number;
}

function tally(): CommunityTally {
  return { adultDays: 0, activity: Object.fromEntries(Object.keys(ACTIVITY).map(k => [k, 0])), samples: 0,
    interactions: Object.fromEntries(COUNTED.map(k => [k, 0])), deaths: 0, injuries: 0, decisions: 0, applied: 0,
    aggMenus: 0, aggPicks: 0, socMenus: 0, socPicks: 0, agreeRules: 0 };
}

const argmax = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);

export async function run(cond: string, seed: number, days: number, device: string, jevPacket: 'native' | 'shared' = 'native') {
  const assign = assignment(cond);
  const world: World = createWorld(seed);
  world.modelPolicy = { ...world.modelPolicy, mode: 'async' };
  const inters: Interaction[] = [], events: SimEvent[] = [];
  const pi = world.interactions.push.bind(world.interactions), pe = world.events.push.bind(world.events);
  (world.interactions as any).push = (...i: Interaction[]) => { inters.push(...i); return pi(...i); };
  (world.events as any).push = (...e: SimEvent[]) => { events.push(...e); return pe(...e); };
  const byCommunity: Record<number, CommunityTally> = { 1: tally(), 2: tally(), 3: tally() };
  const worker = Object.values(assign).some(Boolean) ? new Worker(device) : null;
  if (worker) await worker.start();
  const startAlive = new Map(world.chimps.filter(c => c.alive).map(c => [c.id, c.troopId]));
  const ticks = Math.round(days * 24 / TICK_HOURS);
  const t0 = Date.now();
  let modelSeconds = 0;
  const driven = (c: Chimp) => c.alive && c.age >= MIN_AGE && !!assign[c.troopId];
  for (let t = 0; t < ticks; t++) {
    for (const c of world.chimps) if (c.alive) c.controller = driven(c) ? 'model' : 'rules';
    tickWorld(world);
    const waiting = world.chimps.filter(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);
    if (waiting.length && worker) {
      const recs: { c: Chimp; rec: ContextRecord }[] = [];
      for (const c of waiting) {
        const rec = capture(world, c, cond, seed);
        if (rec) recs.push({ c, rec }); else resolveByRules(world, c.id);
      }
      if (recs.length) {
        const s0 = Date.now();
        // Jev gets its native packet (server/decide.ts buildJevQuestion) unless --jev-packet shared asks for GLiNER's.
        const packetFor = (adapter: string, rec: ContextRecord) => adapter === 'jev' && jevPacket === 'native' ? rec.jev : rec.packet;
        const probs = await worker.score(recs.map(({ c, rec }) => ({ adapter: assign[c.troopId]!, packet: packetFor(assign[c.troopId]!, rec) })));
        modelSeconds += (Date.now() - s0) / 1000;
        recs.forEach(({ c, rec }, i) => {
          const k = argmax(probs[i]);
          const opt = rec.options[k];
          const tl = byCommunity[c.troopId];
          tl.decisions++;
          if (rec.options.some(o => o.cls === 'aggressive')) { tl.aggMenus++; if (opt.cls === 'aggressive') tl.aggPicks++; }
          if (rec.options.some(o => o.cls === 'affiliative' || o.cls === 'collective')) { tl.socMenus++; if (opt.cls === 'affiliative' || opt.cls === 'collective') tl.socPicks++; }
          if (k === rec.rulesIndex) tl.agreeRules++;
          if (applyDecision(world, c.id, opt, 'decide', c.decisionVersion)) tl.applied++;
          else resolveByRules(world, c.id);
        });
      }
    }
    if (t % 4 === 0) {
      for (const c of world.chimps) {
        if (!c.alive || c.age < MIN_AGE || !byCommunity[c.troopId]) continue;
        const tl = byCommunity[c.troopId];
        tl.samples++;
        tl.adultDays += 4 * TICK_HOURS / 24;
        for (const [k, acts] of Object.entries(ACTIVITY)) if (acts.includes(c.action)) tl.activity[k]++;
      }
    }
    if (t > 0 && t % Math.round(24 / TICK_HOURS) === 0) {
      const done = t * TICK_HOURS / 24;
      console.log(`${cond} seed ${seed}: day ${done}/${days} (${((Date.now() - t0) / 1000).toFixed(0)} s, model ${modelSeconds.toFixed(0)} s)`);
    }
  }
  worker?.stop();
  for (const i of inters) if (byCommunity[i.troopId] && (COUNTED as readonly string[]).includes(i.kind)) byCommunity[i.troopId].interactions[i.kind]++;
  for (const e of events) if (byCommunity[e.troopId] && e.kind === 'conflict' && e.severity >= 2) byCommunity[e.troopId].injuries++;
  for (const [id, troop] of startAlive) { const c = world.chimps.find(k => k.id === id); if (c && !c.alive && byCommunity[troop]) byCommunity[troop].deaths++; }
  const communities = Object.fromEntries(Object.entries(byCommunity).map(([id, tl]) => {
    const per = (n: number) => +(n / Math.max(1e-9, tl.adultDays)).toFixed(4);
    return [id, {
      adapter: assign[+id] ?? 'rules', adultDays: +tl.adultDays.toFixed(2),
      activity: Object.fromEntries(Object.entries(tl.activity).map(([k, v]) => [k, +(v / Math.max(1, tl.samples)).toFixed(4)])),
      perAdultDay: Object.fromEntries(Object.entries(tl.interactions).map(([k, v]) => [k, per(v)])),
      counts: tl.interactions, deaths: tl.deaths, injuries: tl.injuries,
      decisions: tl.decisions, applied: tl.applied,
      aggPickWhenOffered: tl.aggMenus ? +(tl.aggPicks / tl.aggMenus).toFixed(4) : null,
      socPickWhenOffered: tl.socMenus ? +(tl.socPicks / tl.socMenus).toFixed(4) : null,
      agreeRules: tl.decisions ? +(tl.agreeRules / tl.decisions).toFixed(4) : null,
    }];
  }));
  // Contexts were sampled with contexts/manifest.json codeSha256; a different hash here means the sim drifted since.
  return { cond, seed, days, jevPacket, codeSha256: codeHash(), seconds: Math.round((Date.now() - t0) / 1000), modelSeconds: Math.round(modelSeconds),
    worker: worker?.ready ?? null, stats: world.stats, communities };
}

if (process.argv[1]?.endsWith('ft-society.ts')) {
  const args = process.argv.slice(2);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const cond = flag('cond', 'rules'), seed = +flag('seed', '4001'), days = +flag('days', '6');
  const out = resolve(flag('out', 'artifacts/decide-ft/society'));
  mkdirSync(out, { recursive: true });
  run(cond, seed, days, flag('device', 'mps'), flag('jev-packet', 'native') === 'shared' ? 'shared' : 'native').then(result => {
    writeFileSync(`${out}/${cond}-${seed}.json`, JSON.stringify(result, null, 1) + '\n');
    console.log(`wrote ${out}/${cond}-${seed}.json (${result.seconds} s)`);
  }).catch(err => { console.error(err); process.exit(1); });
}
