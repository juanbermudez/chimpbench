// The Jev decisive test, free part (docs/staging/jev-decisive-test.md, pre-registered 2026-09-29): arms R (rules as
// shipped), RG (rules + the intention gate + sampling from rules scores), U (a plain utility over the situation facts,
// same gate and sampling) and X (uniform over the legal menu, same gate), on five fresh seeds. Field profile, all three
// communities on the arm's policy (every chimp aged 8+), a 180-day rules burn-in, 2 unscored days, 5 scored days.
// Endpoint: summed distance to the wild band on simulation truth (T-ACT-1 to 3 by sex, T-ACT-4, party size, male day
// range), paired by seed; lactating females are excluded and reported apart; observer values beside truth.
//
//   pnpm exec tsx scripts/jev-test.ts --dry-run                       # plan, snapshot and hashes; runs nothing
//   pnpm exec tsx scripts/jev-test.ts --arms R,RG,U,X --workers 4     # the free arms on 6501, 6602, 6703, 6804, 6905
//   pnpm exec tsx scripts/jev-test.ts --calibrate                     # the RG and U temperatures (dev seed 6301)
//   pnpm exec tsx scripts/jev-test.ts --arms J1 --paid --cap 10 --ledger <file>   # refuses: the paid path is not built
//
// Development runs (--seeds other than the decisive set, --burn-in/--warmup/--scored/--profile) are labelled
// non-standard and written to free-arms-dev-*.{json,md}, never over free-arms.{json,md}. A standard run needs a clean
// git tree (the frozen snapshot is the recorded commit) unless --allow-dirty, which it records.
// Output: artifacts/decide-ft/jev-test/free-arms.{json,md} (or --out dir).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createWorld, resolveByRules, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { buildFacts } from '../src/decide/facts';
import { GATE } from '../src/decide/gate';
import { softmax, TEMPERATURE, U_WEIGHTS, utilities } from '../src/decide/policies';
import type { ProfileName } from '../src/field/config';
import { runPool } from './lib/pool';
import { ENDPOINT_ROWS, endpoint, FREE_ARMS, MIN_AGE, PAID_ARMS, rowKey, runSeed, setControllers, truthValues, type ArmResult, type Band, type FreeArm, type SeedJob, type SeedResult, menuSample } from './lib/jev-arm';

export const DECISIVE_SEEDS = [6501, 6602, 6703, 6804, 6905];
export const STANDARD = { profile: 'field' as ProfileName, burnInDays: 180, warmupDays: 2, scoredDays: 5 };
/** Pre-registered stop rule: R within this distance of the band on every row makes "Jev helps" unreachable. */
export const STOP_ROW_DISTANCE = 0.10;
const DEV_SEED = 6301;

// ---------------------------------------------------------------------------
// Paid arms: refused here
// ---------------------------------------------------------------------------

/**
 * J1, J2 and J2s need a paid model. This harness never builds or instantiates the Jev client (its constructor reads the
 * credential). They refuse without --paid, an explicit --cap in dollars and an initialized spend-guard ledger
 * (training/decide_ft/spend_guard.py); and with all three they still refuse, because the paid path is not built yet.
 */
export function refusePaidArms(arms: string[], flags: { paid: boolean; cap: string; ledger: string }): string {
  const paid = arms.filter(a => (PAID_ARMS as readonly string[]).includes(a));
  if (!paid.length) return '';
  const missing: string[] = [];
  if (!flags.paid) missing.push('--paid');
  const cap = Number(flags.cap);
  if (!flags.cap || !Number.isFinite(cap) || cap <= 0) missing.push('--cap <dollars> (explicit, finite, > 0; there is no default)');
  if (!flags.ledger) missing.push('--ledger <spend-guard ledger file>');
  else if (!existsSync(flags.ledger) || !isSqlite(flags.ledger)) missing.push(`--ledger ${flags.ledger} (not an initialized spend-guard ledger: run training/decide_ft/spend_guard.py init)`);
  if (missing.length) return `${paid.join(', ')} refused: missing ${missing.join('; ')}.`;
  return `${paid.join(', ')} refused: the paid path is not built in this harness (the spend guard must first be wired into the Jev client; see training/decide_ft/jev_spend_guard.patch). No request was made.`;
}
function isSqlite(file: string): boolean {
  try { return statSync(file).size >= 100 && readFileSync(file).subarray(0, 16).toString('latin1') === 'SQLite format 3\0'; } catch { return false; }
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

function hashFiles(files: string[]): string {
  const h = createHash('sha256');
  for (const f of [...files].sort()) h.update(f + '\0').update(readFileSync(f));
  return h.digest('hex').slice(0, 16);
}
const listTs = (dir: string) => readdirSync(dir).filter(f => f.endsWith('.ts')).map(f => join(dir, f));
const listAll = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? listAll(join(dir, e.name)) : [join(dir, e.name)]);

export function snapshot() {
  const git = (...a: string[]) => { try { return execFileSync('git', a, { encoding: 'utf8' }).trim(); } catch { return ''; } };
  const dirty = git('status', '--porcelain', '--', 'src', 'scripts', 'server', 'data/params.json', 'data/targets.json', 'data/phenology');
  return {
    commit: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD'), dirty: dirty.split('\n').filter(Boolean),
    /** The simulation: src/sim, the registry and the phenology record. */
    simHash: hashFiles([...listTs('src/sim'), 'data/params.json', ...listAll('data/phenology')]),
    /** The decision layer and this harness. */
    decideHash: hashFiles(['src/decision.ts', ...listTs('src/decide'), 'scripts/jev-test.ts', 'scripts/lib/jev-arm.ts', 'server/decide.ts']),
    /** The field observer and the target bands. */
    protocolHash: hashFiles([...listTs('src/field'), 'data/targets.json']),
  };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function bands(): Record<string, Band> {
  const t = JSON.parse(readFileSync('data/targets.json', 'utf8')) as { targets: { id: string; accept: { lo: number | null; hi: number | null } }[] };
  const out: Record<string, Band> = {};
  for (const r of ENDPOINT_ROWS) { const a = t.targets.find(x => x.id === r.id)!.accept; out[r.id] = { lo: a.lo!, hi: a.hi! }; }
  return out;
}

const mean = (a: number[]) => a.length ? a.reduce((p, q) => p + q, 0) / a.length : NaN;
const sd = (a: number[]) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / (a.length - 1)); };
function quantile(sorted: number[], q: number): number { if (!sorted.length) return NaN; const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); }
function dist(a: number[], urgent: number) {
  const s = [...a].sort((x, y) => x - y);
  return { n: s.length, mean: mean(s), p10: quantile(s, 0.1), p25: quantile(s, 0.25), median: quantile(s, 0.5), p75: quantile(s, 0.75), p90: quantile(s, 0.9), urgentShare: s.length ? s.filter(v => v >= urgent).length / s.length : NaN };
}
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export function summarize(results: SeedResult[], arms: FreeArm[], B: Record<string, Band>) {
  const perArm: Record<string, unknown> = {};
  const D: Record<string, Record<number, number>> = {};
  const rowD: Record<string, Record<string, number[]>> = {};
  for (const arm of arms) {
    D[arm] = {}; rowD[arm] = {};
    const seeds = results.map(r => ({ seed: r.seed, a: r.arms.find(x => x.arm === arm)! }));
    const perSeed = seeds.map(({ seed, a }) => {
      const truth = truthValues(a.truth), withLact = truthValues(a.truth, true), e = endpoint(truth, B);
      D[arm][seed] = e.D;
      for (const [k, v] of Object.entries(e.rows)) (rowD[arm][k] ??= []).push(v);
      const lact = a.truth.activity.femaleLact, lt = lact.reduce((p, q) => p + q, 0);
      return { seed, D: e.D, distances: e.rows, truth, truthWithLactating: withLact, observer: a.observer,
        lactating: { feed: lt ? lact[0] / lt : null, travel: lt ? lact[2] / lt : null, rest: lt ? lact[1] / lt : null, groom: lt ? lact[3] / lt : null, samples: lt, dayKm: mean(a.truth.lactDayKm), dayN: a.truth.lactDayKm.length },
        maleDays: a.truth.maleDayKm.length, partyScans: a.truth.party.endpoint.n, wallS: Math.round(a.wallMs / 1000) };
    });
    const all = seeds.map(s => s.a), cd = all.reduce((p, a) => p + a.chimpDays, 0);
    const pool = (k: 'hunger' | 'thirst', g: string) => all.flatMap(a => a[k][g as keyof ArmResult['hunger']]);
    const fallbacks: Record<string, number> = {}, kept: Record<string, number> = {}, triggers: Record<string, number> = {}, calls: Record<string, number> = {}, kinds: Record<string, number> = {};
    for (const a of all) {
      for (const [k, v] of Object.entries(a.fallbacks)) fallbacks[k] = (fallbacks[k] ?? 0) + v;
      for (const [k, v] of Object.entries(a.kept)) kept[k] = (kept[k] ?? 0) + v;
      for (const [k, v] of Object.entries(a.triggers)) triggers[k] = (triggers[k] ?? 0) + v;
      for (const [k, v] of Object.entries(a.calls)) calls[k] = (calls[k] ?? 0) + v;
      for (const [k, v] of Object.entries(a.kinds)) kinds[k] = (kinds[k] ?? 0) + v;
    }
    const decisions = all.reduce((p, a) => p + a.decisions, 0), gl = all.reduce((p, a) => p + a.glinerChecked, 0), over = all.reduce((p, a) => p + a.glinerOverBudget, 0);
    const top = all.flatMap(a => a.topProb).sort((x, y) => x - y);
    perArm[arm] = {
      meanD: mean(perSeed.map(s => s.D)), sdD: sd(perSeed.map(s => s.D)), perSeed,
      meanRowDistance: Object.fromEntries(Object.entries(rowD[arm]).map(([k, v]) => [k, mean(v)])),
      hunger: Object.fromEntries(['male', 'cycling', 'pregnant', 'lactating'].map(g => [g, dist(pool('hunger', g), 0.7)])),
      hungerAllAdults: dist(['male', 'cycling', 'pregnant', 'lactating'].flatMap(g => pool('hunger', g)), 0.7),
      thirst: Object.fromEntries(['male', 'cycling', 'pregnant', 'lactating'].map(g => [g, dist(pool('thirst', g), 0.55)])),
      chimpDays: cd,
      callsPerChimpDay: sum(calls) / cd, pantHootsPerChimpDay: (calls['pant-hoot'] ?? 0) / cd, calls,
      decisionPointsPerChimpDay: all.reduce((p, a) => p + a.decisionPoints, 0) / cd,
      policyDecisionsPerChimpDay: decisions / cd,
      gateKeepsPerChimpDay: sum(kept) / cd, kept, triggers,
      fallbacks, fallbacksPerChimpDay: sum(fallbacks) / cd,
      glinerOverBudget: { checked: gl, over, share: gl ? over / gl : null, note: 'would-be: capture() in scripts/ft-contexts.ts hands such contexts to rules, even for Jev chimps (judge 2); free arms do not use GLiNER, so none were applied' },
      kinds, rulesAgreeShare: decisions ? all.reduce((p, a) => p + a.rulesAgree, 0) / decisions : null, medianTopProb: quantile(top, 0.5),
    };
  }
  const paired = (a: string, b: string) => {
    if (!D[a] || !D[b]) return null;
    const deltas = results.map(r => D[a][r.seed] - D[b][r.seed]);
    return { meanDelta: mean(deltas), perSeed: Object.fromEntries(results.map((r, i) => [r.seed, deltas[i]])), lowerOn: deltas.filter(d => d < 0).length, higherOn: deltas.filter(d => d > 0).length, seeds: deltas.length };
  };
  const vsR = Object.fromEntries(arms.filter(a => a !== 'R').map(a => [a, paired(a, 'R')]));
  const vsU = Object.fromEntries(arms.filter(a => a !== 'U' && a !== 'R').map(a => [a, paired(a, 'U')]));
  // stop rule (pre-registered): R within 0.10 of the band on every row → "helps" unreachable
  let stop: Record<string, unknown> | null = null;
  if (rowD.R) {
    const meanRows = Object.fromEntries(Object.entries(rowD.R).map(([k, v]) => [k, mean(v)]));
    const everyRowMean = Object.values(meanRows).every(v => v <= STOP_ROW_DISTANCE);
    const everyRowEverySeed = Object.values(rowD.R).every(v => v.every(x => x <= STOP_ROW_DISTANCE));
    stop = { rule: `R within ${STOP_ROW_DISTANCE} of the band on every row (seed-mean distance per row)`, rowMeans: meanRows, triggered: everyRowMean, everyRowEverySeed,
      meanD_R: mean(Object.values(D.R)), rowsOver: Object.entries(meanRows).filter(([, v]) => v > STOP_ROW_DISTANCE).map(([k]) => k),
      conclusion: everyRowMean ? '"Jev helps" is unreachable: R is already within 0.10 of the band on every row; a paid run could only decide "no difference" or "hurts".'
        : '"Jev helps" stays reachable: R is more than 0.10 from the band on at least one row.' };
  }
  return { perArm, vsR, vsU, stop };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const f = (v: unknown, d = 3) => typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—';

export function markdown(doc: { snapshot: ReturnType<typeof snapshot>; settings: Record<string, unknown>; seeds: number[]; arms: FreeArm[]; standard: boolean; summary: ReturnType<typeof summarize>; seedInfo: { seed: number; burnInHash: string; alive: number; policyDriven: number }[]; wallS: number }): string {
  const { summary: s, arms, seeds } = doc;
  const A = s.perArm as Record<string, any>;
  const o: string[] = [];
  o.push(`# Jev decisive test: free arms${doc.standard ? '' : ' (NON-STANDARD development run)'}`, '');
  o.push(`Pre-registration: docs/staging/jev-decisive-test.md. Snapshot: commit \`${doc.snapshot.commit.slice(0, 12)}\` (${doc.snapshot.branch})${doc.snapshot.dirty.length ? `, **dirty**: ${doc.snapshot.dirty.join(', ')}` : ', clean'}; sim \`${doc.snapshot.simHash}\`, decision layer \`${doc.snapshot.decideHash}\`, protocol \`${doc.snapshot.protocolHash}\`. Wall time ${doc.wallS} s.`, '');
  o.push(`Settings: ${JSON.stringify(doc.settings)}`, '');
  o.push('## Endpoint: summed band distance on simulation truth (lower is better)', '');
  o.push(`| Arm | mean D | SD | ${seeds.join(' | ')} | Δ vs R (mean; seeds lower) |`, `| --- | --- | --- | ${seeds.map(() => '---').join(' | ')} | --- |`);
  for (const arm of arms) {
    const p = A[arm], v = s.vsR[arm] as any;
    o.push(`| ${arm} | ${f(p.meanD)} | ${f(p.sdD)} | ${p.perSeed.map((x: any) => f(x.D)).join(' | ')} | ${v ? `${f(v.meanDelta)}; ${v.lowerOn}/${v.seeds}` : '—'} |`);
  }
  if (Object.keys(s.vsU).length) {
    o.push('', 'Paired vs U: ' + Object.entries(s.vsU).map(([a, v]: [string, any]) => `${a} ${f(v.meanDelta)} (lower on ${v.lowerOn}/${v.seeds})`).join('; ') + '.');
  }
  o.push('', '### Rows: seed-mean truth value and distance (lactating females excluded)', '');
  o.push(`| Row | Band | ${arms.map(a => `${a} value | ${a} d`).join(' | ')} |`, `| --- | --- | ${arms.map(() => '--- | ---').join(' | ')} |`);
  const B = doc.settings.bands as Record<string, Band>;
  for (const r of ENDPOINT_ROWS) {
    const k = rowKey(r);
    o.push(`| ${k} (${r.label}) | ${B[r.id].lo}–${B[r.id].hi} | ${arms.map(a => `${f(mean(A[a].perSeed.map((x: any) => x.truth[k])))} | ${f(A[a].meanRowDistance[k])}`).join(' | ')} |`);
  }
  o.push('', '### Observer values beside truth (seed means; the field metrics include lactating females in the female parts)', '');
  o.push(`| Row | ${arms.map(a => `${a} truth | ${a} observer`).join(' | ')} |`, `| --- | ${arms.map(() => '--- | ---').join(' | ')} |`);
  const obsOf = (x: any, k: string) => { const [id, part] = k.split(' '); const v = x.observer[id]; return part === 'male' && id !== 'T-RNG-4' ? v?.male : part === 'female' ? v?.female : v?.value; };
  for (const r of ENDPOINT_ROWS) {
    const k = rowKey(r);
    o.push(`| ${k} | ${arms.map(a => `${f(mean(A[a].perSeed.map((x: any) => x.truth[k])))} | ${f(mean(A[a].perSeed.map((x: any) => obsOf(x, k)).filter((v: any) => typeof v === 'number')))}`).join(' | ')} |`);
  }
  o.push('', '### Lactating females (outside the endpoint)', '');
  o.push('| Arm | feeding | travel | rest | grooming | day range km | truth with lactating: D |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const a of arms) {
    const ps = A[a].perSeed;
    const Dw = mean(ps.map((x: any) => endpoint(x.truthWithLactating, B).D));
    o.push(`| ${a} | ${f(mean(ps.map((x: any) => x.lactating.feed)))} | ${f(mean(ps.map((x: any) => x.lactating.travel)))} | ${f(mean(ps.map((x: any) => x.lactating.rest)))} | ${f(mean(ps.map((x: any) => x.lactating.groom)))} | ${f(mean(ps.map((x: any) => x.lactating.dayKm).filter(Number.isFinite)), 2)} | ${f(Dw)} |`);
  }
  o.push('', '## Stop rule', '');
  if (s.stop) {
    const st = s.stop as any;
    o.push(`${st.conclusion}`, '', `R seed-mean row distances: ${Object.entries(st.rowMeans).map(([k, v]) => `${k} ${f(v)}`).join('; ')}. Rows over ${STOP_ROW_DISTANCE}: ${st.rowsOver.length ? st.rowsOver.join(', ') : 'none'}. R mean D ${f(st.meanD_R)}.`);
  } else o.push('R was not run.');
  o.push('', '## Hunger (every 15 min, all adults 15+, pooled over seeds)', '');
  o.push('| Arm | group | n | mean | p10 | p25 | median | p75 | p90 | share ≥ 0.7 |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of arms) {
    const rows: [string, any][] = [['all adults', A[a].hungerAllAdults], ...Object.entries(A[a].hunger) as [string, any][]];
    for (const [g, h] of rows) o.push(`| ${a} | ${g} | ${h.n} | ${f(h.mean, 2)} | ${f(h.p10, 2)} | ${f(h.p25, 2)} | ${f(h.median, 2)} | ${f(h.p75, 2)} | ${f(h.p90, 2)} | ${f(h.urgentShare, 2)} |`);
  }
  o.push('', 'Thirst median (share ≥ 0.55): ' + arms.map(a => `${a} ${Object.entries(A[a].thirst).map(([g, t]: [string, any]) => `${g} ${f(t.median, 2)} (${f(t.urgentShare, 2)})`).join(', ')}`).join('; ') + '.');
  o.push('', '## Decisions, calls and fallbacks (policy-driven population, aged 8+, scored days)', '');
  o.push('| Arm | decision points / chimp-day | policy choices / chimp-day | gate keeps / chimp-day | rules fallbacks / chimp-day | calls / chimp-day | pant-hoots / chimp-day | median top p | agrees with rules |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of arms) {
    const p = A[a];
    o.push(`| ${a} | ${f(p.decisionPointsPerChimpDay, 1)} | ${f(p.policyDecisionsPerChimpDay, 1)} | ${f(p.gateKeepsPerChimpDay, 1)} | ${f(p.fallbacksPerChimpDay, 2)} | ${f(p.callsPerChimpDay, 1)} | ${f(p.pantHootsPerChimpDay, 2)} | ${f(p.medianTopProb, 2)} | ${f(p.rulesAgreeShare, 2)} |`);
  }
  o.push('', 'Rules fallbacks by reason: ' + arms.filter(a => a !== 'R').map(a => `${a}: ${Object.entries(A[a].fallbacks).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`).join('; ') + '.');
  o.push('', 'GLiNER 613-token budget (would-be fallbacks, judge 2): ' + arms.filter(a => a !== 'R').map(a => `${a} ${A[a].glinerOverBudget.over}/${A[a].glinerOverBudget.checked} (${f(A[a].glinerOverBudget.share, 4)})`).join('; ') + '. The free arms do not use GLiNER; a GLiNER-gated model arm would have handed these contexts to rules.');
  o.push('', 'Gate: triggers ' + arms.filter(a => a !== 'R').map(a => `${a} {${Object.entries(A[a].triggers).map(([k, v]) => `${k} ${v}`).join(', ')}}`).join('; ') + '; keeps ' + arms.filter(a => a !== 'R').map(a => `${a} {${Object.entries(A[a].kept).map(([k, v]) => `${k} ${v}`).join(', ')}}`).join('; ') + '.');
  o.push('', 'Chosen kinds (policy choices): ' + arms.filter(a => a !== 'R').map(a => `${a} {${Object.entries(A[a].kinds).sort((x: any, y: any) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(', ')}}`).join('; ') + '.');
  o.push('', '## Seeds', '', ...doc.seedInfo.map(i => `- ${i.seed}: burn-in world hash \`${i.burnInHash}\`, ${i.alive} alive, ${i.policyDriven} aged 8+.`), '');
  return o.join('\n');
}

// ---------------------------------------------------------------------------
// Calibration of the sampled arms' temperatures
// ---------------------------------------------------------------------------

/** Median top-option probability at T over stored value vectors. */
export function medianTop(vectors: number[][], T: number): number {
  const tops = vectors.map(v => Math.max(...softmax(v, T))).sort((a, b) => a - b);
  return quantile(tops, 0.5);
}
/** T giving a median top probability of `target` (bisection on log T; the median top falls as T rises). */
export function calibrate(vectors: number[][], target: number): number {
  let lo = 1e-4, hi = 10;
  for (let k = 0; k < 60; k++) { const mid = Math.sqrt(lo * hi); if (medianTop(vectors, mid) > target) lo = mid; else hi = mid; }
  return Math.sqrt(lo * hi);
}

function calibrationRun(days: number, burnIn: number) {
  const world: World = createWorld(DEV_SEED, { profile: 'field' });
  for (let i = 0; i < burnIn * 5760; i++) tickWorld(world);
  world.modelPolicy = { ...world.modelPolicy, mode: 'async' };
  const scores: number[][] = [], utils: number[][] = [];
  for (let i = 0; i < days * 5760; i++) {
    setControllers(world, 'RG');
    tickWorld(world);
    // rules-world menus at real decision points: record, then let rules decide at once (the rules' own trajectory)
    for (const c of world.chimps) {
      if (!c.alive || c.controller !== 'model' || c.awaitingDecisionSince === null) continue;
      const m = menuSample(world, c);
      if (m) { scores.push(m.options.map(o => o.score)); utils.push(utilities(buildFacts(world, c, m.options))); }
      resolveByRules(world, c.id);
    }
  }
  return { scores, utils };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1]?.endsWith('jev-test.ts')) {
  const args = process.argv.slice(2);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const has = (name: string) => args.includes(`--${name}`);
  const out = resolve(flag('out', 'artifacts/decide-ft/jev-test'));
  if (has('calibrate')) {
    const target = +flag('target', '0.77'), days = +flag('days', '2'), burnIn = +flag('burn-in', '180');
    const t0 = performance.now();
    const { scores, utils } = calibrationRun(days, burnIn);
    const res = { devSeed: DEV_SEED, burnInDays: burnIn, days, menus: scores.length, target, T_RG: calibrate(scores, target), T_U: calibrate(utils, target),
      check: { RG_atT: 0, U_atT: 0 }, shipped: TEMPERATURE, snapshot: snapshot(), seconds: Math.round((performance.now() - t0) / 1000) };
    res.check = { RG_atT: medianTop(scores, res.T_RG), U_atT: medianTop(utils, res.T_U) };
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'calibration.json'), JSON.stringify(res, null, 1) + '\n');
    console.log(JSON.stringify(res, null, 1));
    process.exit(0);
  }
  const arms = flag('arms', FREE_ARMS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
  const unknown = arms.filter(a => !(FREE_ARMS as readonly string[]).includes(a) && !(PAID_ARMS as readonly string[]).includes(a));
  if (unknown.length) { console.error(`unknown arm(s) ${unknown.join(', ')} (free: ${FREE_ARMS.join(', ')}; paid: ${PAID_ARMS.join(', ')})`); process.exit(2); }
  const refusal = refusePaidArms(arms, { paid: has('paid'), cap: flag('cap', ''), ledger: flag('ledger', '') });
  if (refusal) { console.error(refusal); process.exit(2); }
  const seeds = flag('seeds', DECISIVE_SEEDS.join(',')).split(',').map(Number);
  if (seeds.some(s => !Number.isInteger(s))) { console.error('--seeds must be integers'); process.exit(2); }
  const cfg = { profile: flag('profile', STANDARD.profile) as ProfileName, burnInDays: +flag('burn-in', String(STANDARD.burnInDays)), warmupDays: +flag('warmup', String(STANDARD.warmupDays)), scoredDays: +flag('scored', String(STANDARD.scoredDays)) };
  const standard = JSON.stringify(cfg) === JSON.stringify(STANDARD) && JSON.stringify(seeds) === JSON.stringify(DECISIVE_SEEDS);
  const free = arms as FreeArm[];
  const workers = Math.max(1, +flag('workers', '4'));
  const snap = snapshot();
  const B = bands();
  const settings = { ...cfg, minAge: MIN_AGE, arms: free, temperature: TEMPERATURE, uWeights: U_WEIGHTS, gate: GATE, bands: B, stopRowDistance: STOP_ROW_DISTANCE };
  if (has('dry-run')) {
    console.log(JSON.stringify({ plan: { arms: free, seeds, ...cfg, standard, workers, worlds: seeds.length, armRuns: seeds.length * free.length,
      estimate: `about ${Math.round((cfg.burnInDays * 0.5 + free.length * (cfg.warmupDays + cfg.scoredDays) * 1.5) / 60 * Math.ceil(seeds.length / workers))} min on ${workers} workers (0.5 s per burn-in day; ~1.5 s per arm-day with observers and policies)`,
      output: standard ? join(out, 'free-arms.{json,md}') : join(out, 'free-arms-dev-*.{json,md}') }, snapshot: snap, settings }, null, 1));
    process.exit(0);
  }
  if (standard && snap.dirty.length && !has('allow-dirty')) { console.error(`the tree is dirty (${snap.dirty.join(', ')}): commit first so the snapshot is the recorded commit, or pass --allow-dirty`); process.exit(2); }
  (async () => {
    const t0 = performance.now();
    const jobs: SeedJob[] = seeds.map(seed => ({ seed, arms: free, ...cfg }));
    console.log(`jev-test: ${free.join(', ')} × seeds ${seeds.join(', ')} (${standard ? 'standard' : 'NON-STANDARD'}; ${workers} workers)`);
    const results = await runPool<SeedJob, SeedResult>(new URL('./lib/jev-worker.ts', import.meta.url), jobs, { size: workers,
      onDone: (i, ms) => console.log(`  seed ${jobs[i].seed} done in ${Math.round(ms / 1000)} s`) });
    const summary = summarize(results, free, B);
    const wallS = Math.round((performance.now() - t0) / 1000);
    const seedInfo = results.map(r => ({ seed: r.seed, burnInHash: r.burnInHash, alive: r.alive, policyDriven: r.policyDriven, burnInS: Math.round(r.burnInMs / 1000) }));
    const doc = { test: 'jev-decisive-test free arms', preregistration: 'docs/staging/jev-decisive-test.md', standard, snapshot: snap, settings, seeds, arms: free, seedInfo, summary, wallS };
    const tag = standard ? 'free-arms' : `free-arms-dev-${seeds.join('_')}-${cfg.profile}-${cfg.burnInDays}-${cfg.warmupDays}-${cfg.scoredDays}`;
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `${tag}.json`), JSON.stringify(doc, null, 1) + '\n');
    writeFileSync(join(out, `${tag}.md`), markdown(doc));
    console.log(`wrote ${join(out, tag)}.{json,md} (${wallS} s)`);
    const st = summary.stop as { conclusion?: string } | null;
    for (const a of free) console.log(`  ${a}: mean D ${(summary.perArm as any)[a].meanD.toFixed(3)} [${(summary.perArm as any)[a].perSeed.map((x: any) => x.D.toFixed(3)).join(', ')}]`);
    if (st?.conclusion) console.log(`  stop rule: ${st.conclusion}`);
  })().catch(err => { console.error(err); process.exit(1); });
}
