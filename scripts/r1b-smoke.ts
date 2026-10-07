// Stage R1b smoke readout (docs/staging/r1b-prereg.md §4): who decides at the decision points of e-bench's path when a
// parameter file sets kernelSim. Measurement only: it reads through the two read-only taps of src/sim/decide.ts
// (kernelTap after every pass of the shared kernel step, rulesTap at every rules decision); nothing here writes a world.
//
// Per parameter file, seed and horizon, two passes over the same world:
//   A. e-bench's own seed loop (scripts/lib/bench-run.ts runBenchSeed, called in this process with the job e-bench
//      builds for a seed: field profile, observer seed 1, experiments every 30 days, truth, energy and rhythm readouts),
//      with the taps counting: decisions the kernel made, decisions refused and given to the rules (by reason), and the
//      rules' own decisions (animals under rgMinAge with kernelSim 1; every animal with kernelSim 0).
//   B. the same world ticked plainly (createWorld + tickWorld, what runBenchSeed runs), with the same taps and a scan of
//      every animal's decisionVersion after each tick. The scan gives what no tap sees: decision points at which the
//      loop's gate (kernelGate 1) kept the act without asking a kernel (source 'decide' without a kernel pass). Pass B also
//      splits the counts by light phase and records the kernel's menu sizes and how often it took the rules' pick.
// The tap totals of A and B must be equal (the readouts of the benchmark loop do not write the world); the script
// exits 1 if they are not.
//
//   pnpm exec tsx scripts/r1b-smoke.ts --params-files LABEL=<p.json>[,LABEL=<q.json>…] [--seed 48] [--burn-in 1] [--days 1] --out <prefix>
// Writes <prefix>.json and <prefix>.md (the table of the prereg, printed from the JSON object). Development seeds only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { kernelTap, rulesTap } from '../src/sim/decide';
import { dayPhase } from '../src/sim/environment';
import { paramsOf, type Overrides } from '../src/sim/params';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { runBenchSeed, type BenchJob } from './lib/bench-run';
import { TICKS_PER_DAY } from './lib/horizon';

const DEV_SEEDS = new Set([48, 7, 21, 5, 11]);
type Phase = 'dawn' | 'day' | 'dusk' | 'night';
const PHASES: Phase[] = ['dawn', 'day', 'dusk', 'night'];
const zero = (): Record<Phase, number> => ({ dawn: 0, day: 0, dusk: 0, night: 0 });

interface Taps {
  /** The kernel's choice was applied. */ kernel: number;
  /** A kernel pass that ended with the rules, by reason (src/kernel/types.ts Refusal). */ refused: Record<string, number>;
  /** Rules decisions through the policy (decideByRules with policy): animals under rgMinAge, and those aged rgMinAge and over. */ rulesYoung: number; rulesOld: number;
  /** Rules decisions without the policy (the argmax after a refusal). */ rulesFallback: number;
  /** A kernel pass for an animal under rgMinAge (must be 0). */ kernelUnderAge: number;
}
const newTaps = (): Taps => ({ kernel: 0, refused: {}, rulesYoung: 0, rulesOld: 0, rulesFallback: 0, kernelUnderAge: 0 });

function withTaps<T>(minAge: number, taps: Taps, extra: { onKernel?: (phase: string, options: number, tookRules: boolean, rulesOnMenu: boolean, by: 'kernel' | 'rules') => void; onRules?: (policy: boolean, young: boolean) => void }, run: () => T): T {
  kernelTap.fn = (c, r) => {
    if (c.age < minAge) taps.kernelUnderAge++;
    if (r.by === 'kernel') taps.kernel++; else taps.refused[r.refusal || 'unknown'] = (taps.refused[r.refusal || 'unknown'] ?? 0) + 1;
    extra.onKernel?.(r.request?.context.environment.phase ?? 'day', r.request?.options.length ?? 0, r.by === 'kernel' && r.request !== null && r.request.rulesIndex >= 0 && r.index === r.request.rulesIndex, (r.request?.rulesIndex ?? -1) >= 0, r.by);
  };
  rulesTap.fn = (c, _list, policy) => {
    if (!policy) taps.rulesFallback++; else if (c.age < minAge) taps.rulesYoung++; else taps.rulesOld++;
    extra.onRules?.(policy, c.age < minAge);
  };
  try { return run(); } finally { kernelTap.fn = null; rulesTap.fn = null; }
}

interface ArmOut {
  label: string; file: string; params: Overrides; switches: { kernelSim: number; kernelGate: number; kernelNoRulesPick: number; rgMinAge: number };
  seed: number; burnInDays: number; days: number;
  /** Pass A: e-bench's seed loop. */ bench: Taps & { wallS: number };
  /** Pass B: the plain loop. */ plain: Taps & { wallS: number; gateHeld: number; decideSteps: number; rulesSteps: number;
    kernelByPhase: Record<Phase, number>; refusedByPhase: Record<Phase, number>; rulesYoungByPhase: Record<Phase, number>; rulesOldByPhase: Record<Phase, number>; gateHeldByPhase: Record<Phase, number>;
    menuSizes: Record<string, number>; tookRulesPick: number; rulesPickOnMenu: number; livingStart: number; livingEnd: number; aged8Start: number; under8Start: number; deaths: number };
  identical: boolean;
}

function runArm(label: string, file: string, seed: number, burnInDays: number, days: number): ArmOut {
  const params = JSON.parse(readFileSync(file, 'utf8')) as Overrides;
  // pass A: the job e-bench builds for a seed (scripts/e-bench.ts, the --part path), no checkpoints
  const job: BenchJob = { seed, profile: 'field', params, burnInDays, days, observerSeed: 1, experimentEveryDays: 30, truth: true, energy: true, rhythm: true,
    checkpointDays: [], stopDay: null, checkpointPrefix: null, resume: null, identity: { tool: 'r1b-smoke' } };
  const probe = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(probe), minAge = P.rgMinAge;
  const a = newTaps();
  let t0 = performance.now();
  const res = withTaps(minAge, a, {}, () => runBenchSeed(job));
  if (res.kind !== 'part') throw new Error('the benchmark loop stopped before its end');
  const benchWall = (performance.now() - t0) / 1000;

  // pass B: the same world, ticked plainly
  const w: World = createWorld(seed, { profile: 'field', params });
  const b = newTaps();
  const kernelByPhase = zero(), refusedByPhase = zero(), rulesYoungByPhase = zero(), rulesOldByPhase = zero(), gateHeldByPhase = zero();
  const menuSizes: Record<string, number> = {};
  let tookRulesPick = 0, rulesPickOnMenu = 0, gateHeld = 0, decideSteps = 0, rulesSteps = 0, kernelThisTick = 0, deaths = 0;
  const livingStart = w.chimps.filter(c => c.alive).length, aged8Start = w.chimps.filter(c => c.alive && c.age >= minAge).length;
  const version = new Map<number, number>();
  t0 = performance.now();
  withTaps(minAge, b, {
    onKernel: (phase, options, took, onMenu, by) => {
      const ph = phase as Phase;
      if (by === 'kernel') { kernelByPhase[ph]++; kernelThisTick++; menuSizes[String(options)] = (menuSizes[String(options)] ?? 0) + 1; if (onMenu) rulesPickOnMenu++; if (took) tookRulesPick++; }
      else refusedByPhase[ph]++;
    },
    onRules: (policy, young) => { if (policy) (young ? rulesYoungByPhase : rulesOldByPhase)[dayPhase(w)]++; },
  }, () => {
    const total = Math.round((burnInDays + days) * TICKS_PER_DAY);
    for (let i = 0; i < total; i++) {
      version.clear();
      for (const c of w.chimps) if (c.alive) version.set(c.id, c.decisionVersion);
      kernelThisTick = 0;
      const phase = dayPhase(w);
      tickWorld(w);
      let decide = 0;
      for (const c of w.chimps) {
        const before = version.get(c.id);
        if (before === undefined) continue;
        if (!c.alive) { deaths++; continue; }
        const d = c.decisionVersion - before;
        if (d <= 0) continue;
        if (c.decisionSource === 'decide') decide += d; else rulesSteps += d;
      }
      decideSteps += decide;
      // acts started with source 'decide' that no kernel pass applied: the loop's gate kept the intention (kernelGate 1)
      const held = Math.max(0, decide - kernelThisTick);
      gateHeld += held; gateHeldByPhase[phase] += held;
    }
  });
  const plainWall = (performance.now() - t0) / 1000;
  const same = JSON.stringify(a) === JSON.stringify(b);
  return { label, file, params, switches: { kernelSim: P.kernelSim, kernelGate: P.kernelGate, kernelNoRulesPick: P.kernelNoRulesPick, rgMinAge: minAge }, seed, burnInDays, days,
    bench: { ...a, wallS: benchWall },
    plain: { ...b, wallS: plainWall, gateHeld, decideSteps, rulesSteps, kernelByPhase, refusedByPhase, rulesYoungByPhase, rulesOldByPhase, gateHeldByPhase, menuSizes, tookRulesPick, rulesPickOnMenu,
      livingStart, livingEnd: w.chimps.filter(c => c.alive).length, aged8Start, under8Start: livingStart - aged8Start, deaths },
    identical: same };
}

const pct = (n: number, d: number) => d > 0 ? `${(100 * n / d).toFixed(1)}%` : '-';
const sum = (o: Record<string, number>) => Object.values(o).reduce((x, y) => x + y, 0);

export function smokeMarkdown(arms: ArmOut[]): string {
  const L: string[] = [];
  const h = arms[0];
  L.push(`Seed ${h.seed}, field profile, ${h.burnInDays} burn-in day(s) + ${h.days} observed day(s); printed by scripts/r1b-smoke.ts from its JSON.`, '');
  L.push('**Who decided** (pass A, e-bench\'s seed loop; a decision = one pass of the kernel step or one rules decision):', '');
  L.push('| arm | kernelSim / kernelGate / kernelNoRulesPick | decisions | null kernel | rules: menu under two options | rules: other refusals | rules: animals under 8 | rules: animals aged 8 and over | kernel pass under age 8 | same counts in the plain loop |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of arms) {
    const t = x.bench, few = t.refused['fewer-than-two-options'] ?? 0, other = sum(t.refused) - few, all = t.kernel + sum(t.refused) + t.rulesYoung + t.rulesOld;
    L.push(`| ${x.label} | ${x.switches.kernelSim} / ${x.switches.kernelGate} / ${x.switches.kernelNoRulesPick} | ${all} | ${t.kernel} (${pct(t.kernel, all)}) | ${few} (${pct(few, all)}) | ${other} (${pct(other, all)})${other ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(t.refused).filter(([k]) => k !== 'fewer-than-two-options'))) : ''} | ${t.rulesYoung} (${pct(t.rulesYoung, all)}) | ${t.rulesOld} (${pct(t.rulesOld, all)}) | ${t.kernelUnderAge} | ${x.identical ? 'yes' : 'NO'} |`);
  }
  L.push('', '**Animals aged 8 and over only** (pass A): of the decisions made for them, the share the null kernel made and the share that went back to the rules:', '');
  L.push('| arm | decisions for animals aged 8 and over | null kernel | back to the rules (menu under two options) | back to the rules (other) | rules argmax calls after a refusal (check) |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  for (const x of arms) {
    const t = x.bench, few = t.refused['fewer-than-two-options'] ?? 0, other = sum(t.refused) - few, all = t.kernel + sum(t.refused) + t.rulesOld;
    L.push(`| ${x.label} | ${all} | ${t.kernel} (${pct(t.kernel, all)}) | ${few} (${pct(few, all)}) | ${other} (${pct(other, all)}) | ${t.rulesFallback} |`);
  }
  L.push('', '**By light phase, the gate, the menu** (pass B, the plain loop on the same world):', '');
  L.push('| arm | null kernel decisions: dawn / day / dusk / night | refused to the rules: dawn / day / dusk / night | decision points the loop\'s gate held (no kernel asked): total; dawn / day / dusk / night | kernel menus by size | rules\' pick on the kernel\'s menu | kernel took the rules\' pick | living at start (aged 8 and over / under 8) | deaths | wall s: benchmark loop / plain loop |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const x of arms) {
    const p = x.plain, ph = (o: Record<Phase, number>) => PHASES.map(k => o[k]).join(' / ');
    const sizes = Object.keys(p.menuSizes).map(Number).sort((m, n) => m - n).map(k => `${k}: ${p.menuSizes[String(k)]}`).join(', ') || '-';
    L.push(`| ${x.label} | ${ph(p.kernelByPhase)} | ${ph(p.refusedByPhase)} | ${p.gateHeld}; ${ph(p.gateHeldByPhase)} | ${sizes} | ${p.rulesPickOnMenu} (${pct(p.rulesPickOnMenu, p.kernel)}) | ${p.tookRulesPick} (${pct(p.tookRulesPick, p.kernel)}) | ${p.livingStart} (${p.aged8Start} / ${p.under8Start}) | ${p.deaths} | ${x.bench.wallS.toFixed(0)} / ${p.wallS.toFixed(0)} |`);
  }
  return L.join('\n') + '\n';
}

function main(): void {
  const argv = process.argv.slice(2);
  const flag = (k: string, d = '') => { const i = argv.indexOf(`--${k}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const files = flag('params-files').split(',').filter(Boolean).map(s => { const i = s.indexOf('='); if (i <= 0) throw new Error('--params-files LABEL=<file>[,LABEL=<file>…]'); return [s.slice(0, i), resolve(s.slice(i + 1))] as const; });
  const out = flag('out');
  const seed = +flag('seed', '48'), burnInDays = +flag('burn-in', '1'), days = +flag('days', '1');
  if (!files.length || !out) throw new Error('usage: r1b-smoke.ts --params-files LABEL=<p.json>[,…] [--seed 48] [--burn-in 1] [--days 1] --out <prefix>');
  if (!DEV_SEEDS.has(seed)) throw new Error(`seed ${seed} is not a development seed (48, 7, 21, 5, 11)`);
  if (!(burnInDays >= 0 && days > 0 && burnInDays + days <= 5)) throw new Error('a smoke run is at most 5 days in all');
  const arms: ArmOut[] = [];
  for (const [label, file] of files) { console.error(`r1b-smoke: ${label} (${file})`); arms.push(runArm(label, file, seed, burnInDays, days)); }
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(`${resolve(out)}.json`, JSON.stringify({ tool: 'r1b-smoke', version: 1, date: new Date().toISOString(), seed, burnInDays, days, arms }, null, 1));
  const md = smokeMarkdown(arms);
  writeFileSync(`${resolve(out)}.md`, md);
  process.stdout.write(md);
  if (arms.some(x => !x.identical)) { console.error('r1b-smoke: the benchmark loop and the plain loop gave different tap counts'); process.exit(1); }
}

main();
