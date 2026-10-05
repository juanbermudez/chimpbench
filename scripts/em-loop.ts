// Stage M3 (docs/staging/em-prereg.md §M3): S39 with a focal set of adults driven by a decision provider in lockstep,
// against the same chimps on the rules in the same world. One rules burn-in per seed (S39 + observeState 1, field
// profile); each arm continues an exact copy of the burned-in world (structuredClone: World is JSON-lossless plain data,
// as scripts/lib/jev-arm.ts relies on). In the model arm the focal animals are model-controlled with the app's lockstep
// semantics: at every decision point the animal waits (src/sim/decide.ts), and before the next tick it gets the
// provider's argmax over the menu the app would send (src/decision.ts buildRequest; the new observation's packet,
// server/decide.ts); a menu with fewer than two options, an invalid context or an answer the engine refuses goes to the
// rules (resolveByRules), counted. Everyone else, and every animal in the rules arm, follows the rules (RG).
// The provider is training/decide_ft/worker.py (scripts/ft-society.ts Worker; one resident process): `base` (untuned
// GLiNER), an adapter name (MGOGO_FT_ROOT), or `jev` (MGOGO_JEV_LEDGER, _RUN, _CAP; the guard's cap is never raised here).
//
//   pnpm exec tsx scripts/em-loop.ts --seed 48 [--burn-in 30] [--days 5] [--provider base] [--arms rules,model] [--out artifacts/em/m3/s48]
// --provider argmax: no model; the focal animals take the rules' argmax at every decision point (the loop's own effect).
// Development seeds only (48, 7).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildJevQuestion, buildLocalQuestion, decisionContextError } from '../server/decide';
import { buildRequest } from '../src/decision';
import { activityCategory, CATEGORIES } from '../src/field/categories';
import { candidateMeta, V } from '../src/sim/candidates';
import { reserveCap } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { index, ix, TICK_HOURS, TICK_SECONDS } from '../src/sim/state';
import { applyDecision, createWorld, resolveByRules, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { familyOf } from './em-sample';
import { Worker } from './ft-society';

const DAY = Math.round(24 / TICK_HOURS), TICK_MIN = TICK_HOURS * 60;

/** The focal set: in the community with the most adults, its alpha male, its median-ranked other adult male, a lactating
 * female with a dependent infant, an adult female who is not lactating, and an adolescent (12–15 y); first by rank or id. */
export function focalSet(w: World): { id: number; cls: string }[] {
  const idx = index(w), alive = w.chimps.filter(c => c.alive);
  const adults = (t: number) => alive.filter(c => c.troopId === t && c.age >= 15).length;
  const troop = [...w.troops].sort((a, b) => adults(b.id) - adults(a.id) || a.id - b.id)[0];
  const mine = alive.filter(c => c.troopId === troop.id), out: { id: number; cls: string }[] = [];
  const add = (c: Chimp | undefined, cls: string) => { if (c && !out.some(o => o.id === c.id)) out.push({ id: c.id, cls }); };
  const alpha = idx.byId.get(troop.alphaId);
  add(alpha && alpha.alive && alpha.sex === 'male' && alpha.age >= 15 ? alpha : undefined, 'adult male (alpha)');
  const males = troop.maleHierarchy.map(id => idx.byId.get(id)!).filter(c => c && c.alive && c.age >= 15 && c.id !== troop.alphaId);
  add(males[Math.floor((males.length - 1) / 2)], 'adult male');
  const byId = (a: Chimp, b: Chimp) => a.id - b.id;
  add(mine.filter(c => c.sex === 'female' && c.age >= 15 && c.lactating).sort(byId)[0], 'female, lactating');
  add(mine.filter(c => c.sex === 'female' && c.age >= 15 && !c.lactating).sort(byId)[0], 'female, other');
  add(mine.filter(c => c.age >= 12 && c.age < 15).sort(byId)[0], 'adolescent 12-15 y');
  return out;
}

interface Tally {
  id: number; name: string; cls: string;
  dayTicks: number; cat: number[]; nightTicks: number; nightOut: number; pathM: number; px: number; pz: number; fixPathM: number; fixX: number; fixZ: number;
  res0: number; res1: number; fin0: number; fin1: number; cap: number; alive: boolean; cause: string | null;
  decisions: number; applied: number; fallbacks: Record<string, number>; rulesAgree: number; picks: Record<string, number>; rulesPicks: Record<string, number>;
}
const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER);

function measure(w: World, focal: Tally[], first: boolean): void {
  const P = paramsOf(w), idx = index(w), env = w.environment, light = env.daylight >= 0.5, night = env.daylight <= 0.03;
  for (const t of focal) {
    const c = idx.byId.get(t.id)!;
    if (!c.alive) { if (t.alive) { t.alive = false; t.cause = c.causeOfDeath; } continue; }
    const x = ix(c), L = x.en;
    if (first) { t.res0 = L?.res ?? 0; t.fin0 = L?.fin ?? L?.in ?? 0; t.cap = reserveCap(c, P); t.fixX = c.position[0]; t.fixZ = c.position[2]; }
    t.res1 = L?.res ?? 0; t.fin1 = L?.fin ?? L?.in ?? 0;
    // ground path: the real displacement of the tick, a placement jump bounded as rhythm.ts bounds it
    if (!first) t.pathM += Math.min(Math.hypot(c.position[0] - t.px, c.position[2] - t.pz), P.runMps * TICK_SECONDS * 2);
    t.px = c.position[0]; t.pz = c.position[2];
    // T-RNG-4's method: straight lines between successive 5-min fixes
    if (w.tick % 20 === 0) { t.fixPathM += Math.hypot(c.position[0] - t.fixX, c.position[2] - t.fixZ); t.fixX = c.position[0]; t.fixZ = c.position[2]; }
    if (light) {
      let groomed = false;
      if (c.action === 'rest' || c.action === 'shelter' || c.action === 'nest') for (const m of idx.alive) if (m.action === 'groom' && m.targetId === c.id && m.alive && ix(m).phase >= 1) { groomed = true; break; }
      let atW = false;
      if (c.action === 'drink') { const s = idx.waterById.get(c.targetId); atW = !!s && (s.position[0] - c.position[0]) ** 2 + (s.position[2] - c.position[2]) ** 2 <= 1.44; }
      const k = activityCategory(c.action, x.phase, c.targetId, groomed, c.carryingMeat > 0.02, atW);
      if (k < CATEGORIES.length) { t.cat[k]++; t.dayTicks++; }
    }
    if (night) { t.nightTicks++; if (!inNest(c)) t.nightOut++; }
  }
}

const argmax = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);
const inc = (r: Record<string, number>, k: string) => { r[k] = (r[k] ?? 0) + 1; };

export async function runArm(base: World, arm: 'rules' | 'model', days: number, provider: string, focalIds: { id: number; cls: string }[], worker: Worker | null) {
  const w = structuredClone(base), idx0 = index(w), t0 = Date.now();
  const focal: Tally[] = focalIds.map(({ id, cls }) => ({ id, name: idx0.byId.get(id)!.name, cls, dayTicks: 0, cat: CATEGORIES.map(() => 0), nightTicks: 0, nightOut: 0, pathM: 0, px: 0, pz: 0, fixPathM: 0,
    fixX: 0, fixZ: 0, res0: 0, res1: 0, fin0: 0, fin1: 0, cap: 1, alive: true, cause: null, decisions: 0, applied: 0, fallbacks: {}, rulesAgree: 0, picks: {}, rulesPicks: {} }));
  const byFocal = new Map(focal.map(t => [t.id, t]));
  if (arm === 'model') w.modelPolicy = { ...w.modelPolicy, mode: 'lockstep' };
  measure(w, focal, true);
  let modelMs = 0, calls = 0;
  for (let i = 0; i < days * DAY; i++) {
    if (arm === 'model') for (const c of w.chimps) c.controller = c.alive && byFocal.has(c.id) ? 'model' : 'rules';
    tickWorld(w);
    if (arm === 'model') {
      const waiting = w.chimps.filter(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);
      const items: { c: Chimp; req: ReturnType<typeof buildRequest>; packet: unknown }[] = [];
      for (const c of waiting) {
        const t = byFocal.get(c.id)!, req = buildRequest(w, c);
        if (req.options.length < 2) { inc(t.fallbacks, 'fewer-than-two-options'); resolveByRules(w, c.id); continue; }
        if (decisionContextError(req.context) !== '') { inc(t.fallbacks, 'invalid-context'); resolveByRules(w, c.id); continue; }
        let packet: unknown;
        if (provider === 'jev') { const { keys: _k, ...p } = buildJevQuestion(req.context); packet = p; } else packet = buildLocalQuestion(req.context);
        items.push({ c, req, packet });
      }
      if (items.length) {
        const s = Date.now();
        // provider 'argmax': no model; the rules' argmax on the same menu (the loop's own effect: asked at every decision point)
        const probs = provider === 'argmax' ? items.map(it => it.req.options.map((_, k) => +(k === it.req.rulesIndex)))
          : await worker!.score(items.map(it => ({ adapter: provider, packet: it.packet })));
        modelMs += Date.now() - s; calls += items.length;
        items.forEach(({ c, req }, j) => {
          const t = byFocal.get(c.id)!, k = argmax(probs[j]), opt = req.options[k];
          const fam = (o: typeof opt) => { const m = candidateMeta.get(o); return familyOf(o.action, m?.v ?? V.NONE, m?.aux ?? -1); };
          t.decisions++; inc(t.picks, fam(opt));
          if (req.rulesIndex >= 0) { inc(t.rulesPicks, fam(req.options[req.rulesIndex])); if (k === req.rulesIndex) t.rulesAgree++; }
          if (applyDecision(w, c.id, opt, 'decide', c.decisionVersion)) t.applied++;
          else { inc(t.fallbacks, 'engine-refused'); resolveByRules(w, c.id); }
        });
      }
    }
    measure(w, focal, false);
    if (i > 0 && i % DAY === 0) console.log(`${arm} day ${i / DAY}/${days}: ${Math.round((Date.now() - t0) / 1000)} s (model ${Math.round(modelMs / 1000)} s, ${calls} calls)`);
  }
  const dayFrac = days;
  const rows = focal.map(t => ({
    id: t.id, name: t.name, cls: t.cls, alive: t.alive, cause: t.cause,
    share: Object.fromEntries(CATEGORIES.map((k, i) => [k, t.dayTicks ? +(t.cat[i] / t.dayTicks).toFixed(4) : null])),
    restOrGroom: t.dayTicks ? +((t.cat[CATEGORIES.indexOf('rest')] + t.cat[CATEGORIES.indexOf('groom')]) / t.dayTicks).toFixed(4) : null,
    feedMinPerDay: +(t.cat[CATEGORIES.indexOf('feed')] * TICK_MIN / dayFrac).toFixed(1),
    kcalPerDay: Math.round((t.fin1 - t.fin0) / dayFrac), reservePctPerDay: +(100 * (t.res1 - t.res0) / t.cap / dayFrac).toFixed(4),
    pathKmPerDay: +(t.pathM / 1000 / dayFrac).toFixed(3), fixPathKmPerDay: +(t.fixPathM / 1000 / dayFrac).toFixed(3),
    nightOutPct: t.nightTicks ? +(100 * t.nightOut / t.nightTicks).toFixed(2) : null,
    decisions: t.decisions, applied: t.applied, fallbacks: t.fallbacks, rulesAgree: t.decisions ? +(t.rulesAgree / t.decisions).toFixed(4) : null, picks: t.picks, rulesPicks: t.rulesPicks,
  }));
  const deaths = w.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime >= base.time).map(c => ({ id: c.id, cause: c.causeOfDeath }));
  return { arm, provider: arm === 'model' ? provider : 'rules', days, seconds: Math.round((Date.now() - t0) / 1000), modelSeconds: Math.round(modelMs / 1000), calls, endHash: worldHash(w), deaths, focal: rows };
}

if (process.argv[1]?.endsWith('em-loop.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const seed = +arg('seed', '48');
  if (seed !== 48 && seed !== 7) throw new Error('development seeds 48 and 7 only (docs/staging/em-prereg.md)');
  const burnIn = +arg('burn-in', '30'), days = +arg('days', '5'), provider = arg('provider', 'base'), arms = arg('arms', 'rules,model').split(',') as ('rules' | 'model')[];
  const out = resolve(arg('out', `artifacts/em/m3/s${seed}`));
  const params = { ...JSON.parse(readFileSync(resolve(arg('params-file', 'artifacts/em/S39-params.json')), 'utf8')), observeState: 1 };
  (async () => {
    const t0 = Date.now(), base = createWorld(seed, { profile: 'field', params });
    for (let i = 0; i < burnIn * DAY; i++) tickWorld(base);
    const focal = focalSet(base), burnInHash = worldHash(base);
    console.log(`seed ${seed}: burn-in ${burnIn} d in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}; focal ${JSON.stringify(focal)}`);
    let worker: Worker | null = null;
    if (arms.includes('model') && provider !== 'argmax') { worker = new Worker(arg('device', 'mps')); await worker.start(); console.log(`worker ready ${JSON.stringify(worker.ready)}`); }
    const results = [];
    for (const arm of arms) results.push(await runArm(base, arm, days, provider, focal, worker));
    worker?.stop();
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(`${out}.json`, JSON.stringify({ seed, burnIn, days, provider, params, burnInHash, focal, worker: worker?.ready ?? null, results }, null, 1) + '\n');
    console.log(`wrote ${out}.json`);
  })().catch(e => { console.error(e); process.exit(1); });
}
