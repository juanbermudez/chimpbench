// Stage R12 build (docs/staging/r12-build-prereg.md §10.3, with amendment A1.10): the runs without a model, and the
// numbers file written from their files. Development seeds 48 and 7 only; one simulation at a time; no model, no worker,
// no lock. Nothing here is read as behaviour: M1 describes the instrument on a world where every animal is on the rules,
// M2 shows that the two-call loop runs on the ruled menu with no model (control kernels only).
//
//   fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r12-runs.ts m1 --seed 48|7 [--out artifacts/r12/m1]
//   fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r12-runs.ts m2 [--out artifacts/r12/m2]
//   fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r12-runs.ts numbers [--md docs/staging/r12-build-numbers.md]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { topIndex } from '../src/kernel/decode';
import type { Kernel, KernelRequest } from '../src/kernel/types';
import { r15Packet } from '../src/providers/packet';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { loopTap } from '../src/sim/decide';
import { isAdultMale } from '../src/sim/hierarchy';
import { optionKind, same } from '../src/sim/menu';
import { paramsOf } from '../src/sim/params';
import { isDiceOption, settledPartner } from '../src/sim/possible';
import { buildRequest, targetRequest } from '../src/sim/request';
import { resourcePercepts } from '../src/sim/resources';
import { rgMenu } from '../src/sim/rg';
import { index, simOf, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import type { HarnessDecode } from './lib/decoder';
import { estimatedTokens, listedNotOwn, ownTrip, possibleNotOffered, treeSource, type TreeSource } from './lib/r12-menu';
import { r15TrainingRows, socialTarget } from './lib/r15-training';
import { published } from './lib/soft-labels';
import { hashR15, r15FakeKernel, runR15, type R15Call } from './lib/r15-loop';
import { u01 } from './r4-contexts';
import { tapRulesDecisions } from './r8-contexts';
import { BASE_FILE } from './r12-offer-table';
import { countOf, onPath, printSection, readList } from './r12-hand-rules';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DAY = Math.round(24 / TICK_HOURS);
export const SWITCHES = { observeV4: 1, observeV5: 1, menuParity: 1, activityFirst: 2, resourceTargets: 1, kernelGate: 1 } as const;
const base = (): Record<string, number> => JSON.parse(readFileSync(resolve(ROOT, BASE_FILE), 'utf8')) as Record<string, number>;
/** M1's window (R7's: 30 days of burn-in, 5 tapped days) and the bounds of A1.10. */
export const M1 = { burnInDays: 30, days: 5, level: 2, comparePackets: { p: 0.01, max: 30 }, label: { p: 0.02, max: 40, capSeconds: 900 } };
/** M2's runs: R15's wiring run (720 ticks, the first five adults of 8 or more, no burn-in) at both levels, both decodes, three kernels. */
export const M2 = { ticks: 720, seeds: [48, 7], levels: [1, 2], decodes: ['draw', 'held'] as HarnessDecode['mode'][], kernels: ['fake', 'rules-option', 'uniform'] as const };
const SEEDS = [48, 7];
const git = (args: string[]) => { try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };
const inc = (o: Record<string, number>, k: string, n = 1) => { o[k] = (o[k] ?? 0) + n; };
/** The counted-rules list's hash and counts under a run's parameters: every run's summary carries them (registration §5, test 11). */
export function handRulesOf(params: Record<string, number>): { hash: string; on: number; cut: number; byStatus: Record<string, number> } {
  const list = readList();
  if (!list) throw new Error('data/r12-hand-rules.json is missing: run scripts/r12-hand-rules.ts');
  const p = onPath(list, params);
  return { hash: list.hash, on: p.on.length, cut: p.cut.length, byStatus: countOf(p.on).byStatus };
}
const hist = (o: Record<string, number>, v: number) => inc(o, String(v));

// =====================================================================================================================
// M1: a rules world read by a tap
// =====================================================================================================================

export interface M1Result {
  seed: number; level: number; burnInDays: number; days: number; head: string; seconds: number;
  burnHash: string; endHash: string; endHashUntapped: string; equal: boolean;
  decisions: number; asks: number; adultHours: number; adultDays10: number;
  greet: { onMenu: number; sizes: Record<string, number>; past8: number };
  groom: { onMenu: number; adultMaleOnMenu: number; sizes: Record<string, number>; opened: number; members: number; past8: number };
  dice: { best: Record<string, number>; perAnimalHour: number };
  ruling3: { trips: number; bySource: Record<TreeSource, number>; listedOnMenu: number; perAdultDay10: Record<string, number> };
  possible: Record<string, number>; listedNotOwn: { never: number; old: number; unremembered: number; decisions: number };
  packets: { compared: number; equal: number; withDice: number; withDiceEqual: number };
  tokens: { social: { n: number; max: number; mean: number }; resource: { n: number; max: number; mean: number }; over1280: number };
  label: { sampled: number; goToFoodMass: number; fromList: Record<TreeSource, number>; seconds: number; capped: boolean };
  handRules: ReturnType<typeof handRulesOf>;
  /** The labels of the new target stages against the rules' realised picks (at fresh rules decisions whose pick is a pant-grunt, or an adult male's grooming of an adult male, with a group of two or more). */
  realised: Record<'greet' | 'groom', Realised>;
}
export interface Realised { n: number; inGroup: number; argmaxJitter: number; labelTop: number; mass: number; chance: number }
const realisedNew = (): Realised => ({ n: 0, inGroup: 0, argmaxJitter: 0, labelTop: 0, mass: 0, chance: 0 });

export function runM1(seed: number, log: (s: string) => void): M1Result {
  if (!SEEDS.includes(seed)) throw new Error('development seeds 48 and 7 only');
  const t0 = Date.now(), params = { ...base(), ...SWITCHES, menuPossible: M1.level };
  const w = createWorld(seed, { profile: 'field', params });
  for (let i = 0; i < M1.burnInDays * DAY; i++) tickWorld(w);
  const burnHash = worldHash(w), plain = structuredClone(w);
  delete (simOf(plain).params.overrides as Record<string, number>).menuPossible;   // the same world at level 0 (paramsOf resolves per world object)
  log(`M1 seed ${seed}: burn-in of ${M1.burnInDays} days, hash ${burnHash}, ${Math.round((Date.now() - t0) / 1000)} s`);
  const P = paramsOf(w);
  const r: M1Result = { seed, level: M1.level, burnInDays: M1.burnInDays, days: M1.days, head: git(['rev-parse', '--short', 'HEAD']), seconds: 0, burnHash, endHash: '', endHashUntapped: '', equal: false,
    decisions: 0, asks: 0, adultHours: 0, adultDays10: 0,
    greet: { onMenu: 0, sizes: {}, past8: 0 }, groom: { onMenu: 0, adultMaleOnMenu: 0, sizes: {}, opened: 0, members: 0, past8: 0 },
    dice: { best: {}, perAnimalHour: 0 }, ruling3: { trips: 0, bySource: { own: 0, never: 0, old: 0, unremembered: 0 }, listedOnMenu: 0, perAdultDay10: {} },
    possible: {}, listedNotOwn: { never: 0, old: 0, unremembered: 0, decisions: 0 }, packets: { compared: 0, equal: 0, withDice: 0, withDiceEqual: 0 },
    tokens: { social: { n: 0, max: 0, mean: 0 }, resource: { n: 0, max: 0, mean: 0 }, over1280: 0 },
    label: { sampled: 0, goToFoodMass: 0, fromList: { own: 0, never: 0, old: 0, unremembered: 0 }, seconds: 0, capped: false }, handRules: handRulesOf(params),
    realised: { greet: realisedNew(), groom: realisedNew() } };
  const tok = { social: [] as number[], resource: [] as number[] };
  let labelMs = 0;
  const untap = tapRulesDecisions(w, { minAge: P.rgMinAge, want: () => true, onDecision: d => {
    const c = d.c; r.decisions++;
    const best = d.list[0];
    if (best && isDiceOption(best)) inc(r.dice.best, best.action === 'transfer' ? 'transfer' : candidateMeta.get(best)?.v === V.INFANTICIDE ? 'attack on an infant' : 'gang attack');
    // ruling 3: the own trips the rules start (a new act: not the gate keeping the act in progress)
    const fresh = d.why !== 'kept' && d.why !== 'arrived';
    if (fresh && ownTrip(d.chosen) && !(d.act.action === d.chosen.action && d.act.targetId === d.chosen.targetId)) {
      r.ruling3.trips++; const s = treeSource(w, c, d.chosen.targetId); r.ruling3.bySource[s]++;
      if (c.age >= 10 && s !== 'own') inc(r.ruling3.perAdultDay10, s);
    }
    if (d.menu.some(k => ownTrip(k) && treeSource(w, c, k.targetId) !== 'own')) r.ruling3.listedOnMenu++;
    // what is possible but not offered (§7), from the state alone
    const p = possibleNotOffered(w, c, d.list);
    for (const [k, v] of Object.entries(p)) inc(r.possible, k, typeof v === 'boolean' ? (v ? 1 : 0) : v > 0 ? 1 : 0);
    if (c.age >= 10) { const l = listedNotOwn(w, c); r.listedNotOwn.never += l.never; r.listedNotOwn.old += l.old; r.listedNotOwn.unremembered += l.unremembered; r.listedNotOwn.decisions++; }
    if (!fresh || d.req.options.length < 2 || d.req.context.resourceChoice !== 'kind') return;
    r.asks++;
    const req = d.req, kinds = req.context.resourceKinds!;
    const gi = kinds.indexOf('greet_or_appease'), mi = kinds.indexOf('groom');
    const pool = gi >= 0 || mi >= 0 ? resourcePercepts(w, c) : [];
    if (gi >= 0) { r.greet.onMenu++; hist(r.greet.sizes, req.groups![gi].length); if (pool.filter(k => candidateMeta.get(k)?.open && optionKind(k) === 'greet_or_appease').length > 7) r.greet.past8++; }
    if (mi >= 0) {
      r.groom.onMenu++;
      if (isAdultMale(c)) {
        r.groom.adultMaleOnMenu++; const g = req.groups![mi]; hist(r.groom.sizes, g.length);
        r.groom.members += g.length; r.groom.opened += g.filter(k => !settledPartner(index(w).byId.get(k.targetId)!)).length;
        if (pool.filter(k => candidateMeta.get(k)?.open && optionKind(k) === 'groom').length > 7) r.groom.past8++;
      }
    }
    // the labels of the new target stages against the rules' realised pick (the teacher's arithmetic with the realised jitter, and the label's mass on it)
    const ck = optionKind(d.chosen), co = index(w).byId.get(d.chosen.targetId);
    const which = d.chosen.action === 'pant-grunt' ? 'greet' : ck === 'groom' && isAdultMale(c) && co && isAdultMale(co) ? 'groom' : null;
    const ri = which ? kinds.indexOf(which === 'greet' ? 'greet_or_appease' : 'groom') : -1;
    if (which && ri >= 0 && req.groups![ri].length > 1) {
      const R = r.realised[which], st = socialTarget(w, c, req, ri, `r12-m1:${seed}:${d.tick}:${c.id}`), at = st.request.options.findIndex(o => same(o, d.chosen));
      R.n++; R.chance += 1 / st.request.options.length;
      if (at >= 0) {
        R.inGroup++; R.mass += st.q[at];
        if (st.q.indexOf(Math.max(...st.q)) === at) R.labelTop++;
        const withJitter = st.request.options.map(o => { const m = candidateMeta.get(o); return m?.raw === undefined || m.jit === undefined ? -Infinity : published(m.raw + m.jit); });
        if (withJitter.indexOf(Math.max(...withJitter)) === at) R.argmaxJitter++;
      }
    }
    // the length of every target packet (A1.10): the new social ones and R15's resource ones
    req.groups!.forEach((g, i) => {
      if (g.length < 2) return;
      const t = targetRequest(req, i)!, n = estimatedTokens(t), k = kinds[i];
      (k === 'greet_or_appease' || k === 'groom' ? tok.social : tok.resource).push(n); if (n > 1280) r.tokens.over1280++;
    });
    // the kind packet against R15's (test 5 on the run): a copy of the world at level 0 builds the request R15 would send
    if (r.packets.compared < M1.comparePackets.max && u01(`r12-m1-packet:${seed}:${d.tick}:${c.id}`) < M1.comparePackets.p) {
      const copy = structuredClone(w); delete (simOf(copy).params.overrides as Record<string, number>).menuPossible;
      const r15 = buildRequest(copy, index(copy).byId.get(c.id)!), same = JSON.stringify(r15Packet(r15.context)) === JSON.stringify(r15Packet(req.context));
      const dice = computeCandidates(w, c, []).some(isDiceOption);
      r.packets.compared++; if (same) r.packets.equal++; if (dice) { r.packets.withDice++; if (same) r.packets.withDiceEqual++; }
    }
    // R15's kind label: the share of "Go to food elsewhere" that comes from trips to listed trees (sampled, capped)
    if (labelMs < M1.label.capSeconds * 1000 && r.label.sampled < M1.label.max && u01(`r12-m1-label:${seed}:${d.tick}:${c.id}`) < M1.label.p) {
      const l0 = Date.now(), got = r15TrainingRows(w, c, req, `r12-m1:${seed}:${d.tick}:${c.id}`, { social: 'none', target: 'none', realised: { chosen: d.chosen, rngBefore: d.rng } });
      const k = got.detail.kind;
      if (k) {
        const menu = rgMenu(w, c, computeCandidates(w, c, [])), total = k.label.counts.reduce((a, b) => a + b, 0);
        r.label.sampled++;
        menu.forEach((o, i) => { if (optionKind(o) !== 'go_to_food') return; const share = k.label.counts[i] / total; r.label.goToFoodMass += share; r.label.fromList[ownTrip(o) ? treeSource(w, c, o.targetId) : 'own'] += share; });
      }
      labelMs += Date.now() - l0;
      if (labelMs >= M1.label.capSeconds * 1000) r.label.capped = true;
    }
  } });
  try {
    for (let i = 0; i < M1.days * DAY; i++) {
      tickWorld(w);
      for (const c of w.chimps) if (c.alive && c.age >= P.rgMinAge) { r.adultHours += TICK_HOURS; if (c.age >= 10) r.adultDays10 += TICK_HOURS / 24; }
      if (i > 0 && i % DAY === 0) log(`M1 seed ${seed}: day ${i / DAY} of ${M1.days}, ${r.decisions} decisions, ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  } finally { untap(); }
  r.endHash = worldHash(w);
  for (let i = 0; i < M1.days * DAY; i++) tickWorld(plain);
  r.endHashUntapped = worldHash(plain); r.equal = r.endHash === r.endHashUntapped;
  const mean = (v: number[]) => v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 0;
  r.tokens.social = { n: tok.social.length, max: Math.max(0, ...tok.social), mean: mean(tok.social) };
  r.tokens.resource = { n: tok.resource.length, max: Math.max(0, ...tok.resource), mean: mean(tok.resource) };
  const dice = Object.values(r.dice.best).reduce((a, b) => a + b, 0);
  r.dice.perAnimalHour = r.adultHours > 0 ? dice / r.adultHours : 0;
  r.label.seconds = Math.round(labelMs / 1000);
  r.seconds = Math.round((Date.now() - t0) / 1000);
  log(`M1 seed ${seed}: ${r.decisions} decisions, ${r.asks} fresh asks, end hash ${r.endHash} (${r.equal ? 'equal to' : 'DIFFERENT FROM'} the untapped world at level 0), ${r.seconds} s`);
  return r;
}

// =====================================================================================================================
// M2: the wiring of the two-stage loop, with control kernels
// =====================================================================================================================

/** The rules' own option at each call: the entry or target the rules would take (rulesIndex), else the first. A control, not a policy. */
export const rulesOptionKernel: Kernel = { id: 'null', label: 'the rules\' own option (control, no model)', decide(request) {
  const i = request.rulesIndex >= 0 ? request.rulesIndex : 0, probabilities = request.options.map((_, j) => j === i ? 1 : 0);
  return { index: i, probabilities, choice: `c${i}` };
} };
/** A uniform chooser: equal odds on every option, the loop's decode draws. A control, not a policy. */
export const uniformKernel: Kernel = { id: 'null', label: 'uniform odds (control, no model)', decide(request) {
  const probabilities = request.options.map(() => 1 / request.options.length);
  return { index: topIndex(probabilities), probabilities, choice: 'c0' };
} };
const KERNELS: Record<(typeof M2.kernels)[number], Kernel> = { fake: r15FakeKernel, 'rules-option': rulesOptionKernel, uniform: uniformKernel };

export interface M2Run {
  seed: number; level: number; decode: string; kernel: string; ticks: number; focal: number[]; startHash: string; endHash: string; replay: 'exact' | 'differs';
  journalHash: string; receiptsHash: string; asks: number; kindCalls: number; targetCalls: Record<string, number>; groupSizes: Record<string, Record<string, number>>;
  applied: number; fallbacks: Record<string, number>; dice: Record<string, number>; dicePerAnimalHour: number; socialApplied: number; socialEnded: number;
  identityHash: string;
}
export async function runM2One(seed: number, level: number, mode: HarnessDecode['mode'], kernel: (typeof M2.kernels)[number]): Promise<M2Run> {
  const decode: HarnessDecode = { mode, salt: 1, hold: 'act' };
  const world = createWorld(seed, { profile: 'field', params: { ...base(), ...SWITCHES, menuPossible: level } });
  world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' };
  const focal = world.chimps.filter(c => c.alive && c.age >= 8).slice(0, 5).map(c => c.id);
  for (const c of world.chimps) c.controller = focal.includes(c.id) ? 'model' : 'rules';
  const initial = structuredClone(world), startHash = worldHash(world);
  // the run's identity names the contract (A1.5: no git HEAD in it), so an R12 journal and an R15 one cannot be swapped
  const identity = hashR15({ stage: 'R12-build', contract: 'menu-targets-v1', level, kernel, decode });
  const journal: R15Call[] = [], dice: Record<string, number> = {}, groupSizes: Record<string, Record<string, number>> = {};
  loopTap.dice = (c, k) => { if (focal.includes(c.id)) inc(dice, k.action === 'transfer' ? 'transfer' : 'attack'); };
  let result: Awaited<ReturnType<typeof runR15>>;
  try {
    result = await runR15(world, KERNELS[kernel], { ticks: M2.ticks, identity, decode, onCall: call => journal.push(call),
      onRequest: (_w, request: KernelRequest) => { if (request.context.resourceChoice === 'kind') request.groups!.forEach((g, i) => { const k = request.context.resourceKinds![i]; groupSizes[k] ??= {}; hist(groupSizes[k], g.length); }); } });
  } finally { loopTap.dice = null; }
  const replay = await runR15(structuredClone(initial), r15FakeKernel, { ticks: M2.ticks, identity, decode, journal, replayOnly: true });
  const exact = replay.endHash === result.endHash && JSON.stringify(replay.receipts) === JSON.stringify(result.receipts);
  const targetCalls: Record<string, number> = {}, fallbacks: Record<string, number> = {};
  for (const c of journal) if (c.stage.startsWith('target/')) inc(targetCalls, c.stage.slice(7));
  for (const rc of result.receipts) if (rc.by === 'rules') inc(fallbacks, rc.refusal || 'rules');
  const hours = focal.length * M2.ticks * TICK_HOURS, nDice = Object.values(dice).reduce((a, b) => a + b, 0);
  // a social choice applied, then ended: the same animal was asked again later in the run (its act had come to an end, or was set aside)
  const isSocial = (rc: (typeof result.receipts)[number]) => rc.by === 'kernel' && rc.calls.some(k => k.stage === 'target/greet_or_appease' || k.stage === 'target/groom');
  const socialEnded = result.receipts.filter((rc, i) => isSocial(rc) && result.receipts.slice(i + 1).some(o => o.id === rc.id)).length;
  return { seed, level, decode: mode, kernel, ticks: M2.ticks, focal, startHash, endHash: result.endHash, replay: exact ? 'exact' : 'differs', journalHash: hashR15(journal), receiptsHash: hashR15(result.receipts),
    asks: result.receipts.length, kindCalls: journal.filter(c => c.stage === 'kind').length, targetCalls, groupSizes, applied: result.receipts.filter(r => r.by === 'kernel').length, fallbacks,
    dice, dicePerAnimalHour: hours ? nDice / hours : 0, socialApplied: result.receipts.filter(rc => rc.by === 'kernel' && rc.calls.some(k => k.stage === 'target/greet_or_appease' || k.stage === 'target/groom')).length, socialEnded, identityHash: identity.slice(0, 16) };
}

// =====================================================================================================================
// The numbers file
// =====================================================================================================================

const pct = (a: number, b: number) => b > 0 ? `${(100 * a / b).toFixed(1)}%` : '–';
const fmtHist = (h: Record<string, number>) => Object.entries(h).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';

export function numbersMarkdown(m1: M1Result[], m2: M2Run[]): string {
  const o: string[] = [], B = base();
  o.push('# Stage R12 build: the numbers (generated by `scripts/r12-runs.ts numbers`; do not edit)', '');
  o.push(`Every number below is read from the run files under \`artifacts/r12/\` (M1: ${m1.map(r => `seed ${r.seed} at ${r.head}`).join(', ')}; M2: ${m2.length} runs). Registration: \`docs/staging/r12-build-prereg.md\` (with amendment A1). **No model was run and nothing was trained.** M1 is a world in which every animal is on the rules ("no model: the rules"), read by a tap; M2 runs the two-call loop with control kernels ("no model: the rules' top option on the R12 menu", "no model: a random chooser on the R12 menu", and the wiring check's fake odds). These describe the instrument, not behaviour, and are compared with no field figure; nothing here is about wild chimpanzees.`, '');
  o.push('## M1: a rules world read by a tap', '');
  o.push(`The working base on the field map with R15's switches and \`menuPossible\` ${m1[0]?.level ?? M1.level} (the level only changes the requests the tap builds: no rules path reads it), ${M1.burnInDays} days of burn-in and ${M1.days} tapped days per seed. Each world was run a second time at level 0 with no tap from the same burned-in state: ${m1.map(r => `seed ${r.seed} ${r.equal ? 'ended on the same hash' : 'ENDED ON ANOTHER HASH'} (${r.endHash})`).join('; ')}.`, '');
  o.push('| | ' + m1.map(r => `seed ${r.seed}`).join(' | ') + ' |', '|---|' + m1.map(() => '---|').join(''));
  const row = (name: string, f: (r: M1Result) => string) => o.push(`| ${name} | ${m1.map(f).join(' | ')} |`);
  row('rules decisions of animals 8 and over; fresh asks with a kind menu of two or more', r => `${r.decisions}; ${r.asks}`);
  row('asks with "Greet or appease" on the kind menu; its group sizes', r => `${r.greet.onMenu}; ${fmtHist(r.greet.sizes)}`);
  row('greeting groups the cap of 8 would cut', r => String(r.greet.past8));
  row('asks of an adult male with "Groom someone" on the menu (of all asks with it); group sizes at level 2', r => `${r.groom.adultMaleOnMenu} (of ${r.groom.onMenu}); ${fmtHist(r.groom.sizes)}`);
  row('share of an adult male\'s grooming group that is not settled (opened by level 2)', r => pct(r.groom.opened, r.groom.members));
  row('grooming groups the cap of 8 would cut', r => String(r.groom.past8));
  row('decisions whose rules\' best option is a dice act; per animal-hour of animals 8 and over', r => `${Object.entries(r.dice.best).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}; ${r.dice.perAnimalHour.toExponential(2)}`);
  row('kind packets compared with R15\'s at sampled asks: equal (with a dice act among the candidates: equal)', r => `${r.packets.equal} of ${r.packets.compared} (${r.packets.withDiceEqual} of ${r.packets.withDice})`);
  row('estimated tokens of the new social target packets: mean; largest (R15\'s resource target packets in the same run: mean; largest); over 1,280', r => `${r.tokens.social.mean}; ${r.tokens.social.max} (${r.tokens.resource.mean}; ${r.tokens.resource.max}); ${r.tokens.over1280}`);
  o.push('', '### The labels of the new target stages against the rules\' realised picks', '');
  o.push('At fresh rules decisions whose pick was a pant-grunt (the greeting group) or an adult male\'s grooming of an adult male (the grooming group at level 2), with a group of two or more: whether the pick is in the group, whether the teacher\'s arithmetic with the realised jitter (the published clamp of raw value plus jitter) ranks it first, whether the label (2,000 redraws of the jitter) ranks it first, and the label\'s mean mass on it against chance (one over the group\'s size). The rules pick the dominant to greet by its score before the jitter, and the grooming partner among settled partners only, so neither agreement is expected to be complete.', '');
  for (const k of ['greet', 'groom'] as const) row(`${k === 'greet' ? 'greeting' : 'grooming among adult males'}: decisions; pick in the group; first by the realised jitter; first by the label; label mass on it (chance)`, r => { const R = r.realised[k]; return `${R.n}; ${R.inGroup}; ${R.argmaxJitter}; ${R.labelTop}; ${R.n ? (R.mass / R.n).toFixed(3) : '–'} (${R.n ? (R.chance / R.n).toFixed(3) : '–'})`; });
  o.push('', '### Ruling 3: how often the rules go to a tree from the community\'s list (A1.4)', '');
  row('own food trips the rules started', r => String(r.ruling3.trips));
  row('… to a tree in its own memory within 240 h', r => `${r.ruling3.bySource.own} (${pct(r.ruling3.bySource.own, r.ruling3.trips)})`);
  row('… to a listed tree it never saw itself (a)', r => `${r.ruling3.bySource.never} (${pct(r.ruling3.bySource.never, r.ruling3.trips)})`);
  row('… to a listed tree it saw more than 240 h ago (b)', r => `${r.ruling3.bySource.old} (${pct(r.ruling3.bySource.old, r.ruling3.trips)})`);
  row('… to a listed tree it saw within 240 h but no longer holds in memory (c: seen by itself, out of R15\'s pool)', r => `${r.ruling3.bySource.unremembered} (${pct(r.ruling3.bySource.unremembered, r.ruling3.trips)})`);
  row('per adult-day of animals 10 and over: (a), (b), (c)', r => ['never', 'old', 'unremembered'].map(k => ((r.ruling3.perAdultDay10[k] ?? 0) / Math.max(1e-9, r.adultDays10)).toFixed(3)).join(', '));
  row('decisions with a listed-tree trip on the rules\' menu', r => `${r.ruling3.listedOnMenu} of ${r.decisions}`);
  row('R15\'s "Go to food elsewhere" kind label from listed trees, at sampled decisions: (a), (b), (c) as shares of that kind\'s mass', r => `${(['never', 'old', 'unremembered'] as const).map(k => pct(r.label.fromList[k], r.label.goToFoodMass)).join(', ')} (${r.label.sampled} decisions, ${r.label.seconds} s${r.label.capped ? ', stopped at the cap' : ''})`);
  o.push('', 'No threshold is set: whether this is large enough for a slot "known to my community" is the user\'s call (ruling 3), and class (c) is put to the user as a question for ruling 2.', '');
  o.push('### Possible, not offered (section 7; decisions of animals 8 and over where it held)', '');
  const P: Record<string, string> = { maleUnsettled: 'an adult male with an unsettled adult male in reach (open only at level 2, on the target call)', groomUnsettledOther: 'an unsettled community member in grooming reach, any other pair ("only a settled partner")', greetNonDominant: 'an animal in greeting reach that does not outrank it ("only to a dominant")', waterNoThirst: 'a remembered water while not thirsty (ruling 4)', nestGated: 'a nest possible but not offered (ruling 5: the nest\'s value)', shelterWarm: 'rain at or above 0.12 and not colder than neutral (ruling 5)' };
  for (const [k, w] of Object.entries(P)) row(w, r => `${r.possible[k] ?? 0} (${pct(r.possible[k] ?? 0, r.decisions)})`);
  row('listed trees out of its own memory it could walk to, per decision of an animal 10 and over: (a), (b), (c)', r => ['never', 'old', 'unremembered'].map(k => ((r.listedNotOwn as Record<string, number>)[k] / Math.max(1, r.listedNotOwn.decisions)).toFixed(2)).join(', '));
  o.push('', '## M2: the two-call loop with control kernels', '');
  o.push(`R15's wiring run (${M2.ticks} ticks from the first light, the first five animals of 8 or more on the kernel, no burn-in) on the field map with R15's switches, at levels ${M2.levels.join(' and ')}, seeds ${M2.seeds.join(' and ')}, the decodes ${M2.decodes.join(' and ')}, and three kernels: the wiring check's fake odds, the rules' own option at each call, and uniform odds. Every run was replayed from its journal with no kernel: ${m2.every(r => r.replay === 'exact') ? `all ${m2.length} replays exact (the same receipts and end hash)` : `${m2.filter(r => r.replay !== 'exact').length} REPLAYS DIFFER`}.`, '');
  o.push('| level, seed, decode, kernel | asks | kind calls | target calls by kind | applied; fallbacks | social choices applied; ended | dice acts the rules started (per animal-hour) | replay |', '|---|---|---|---|---|---|---|---|');
  for (const r of m2) o.push(`| ${r.level}, ${r.seed}, ${r.decode}, ${r.kernel} | ${r.asks} | ${r.kindCalls} | ${Object.entries(r.targetCalls).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'} | ${r.applied}; ${Object.entries(r.fallbacks).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'} | ${r.socialApplied}; ${r.socialEnded} | ${Object.entries(r.dice).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'} (${r.dicePerAnimalHour.toFixed(3)}) | ${r.replay} |`);
  const sizes: Record<string, Record<string, number>> = {};
  for (const r of m2) for (const [k, h] of Object.entries(r.groupSizes)) for (const [n, v] of Object.entries(h)) { sizes[k] ??= {}; sizes[k][n] = (sizes[k][n] ?? 0) + v; }
  o.push('', `Options per group on the kind requests of all M2 runs: ${Object.entries(sizes).filter(([k]) => ['greet_or_appease', 'groom', 'go_to_food', 'eat_here', 'drink'].includes(k)).map(([k, h]) => `${k}: ${fmtHist(h)}`).join('; ')}. Too short to read behaviour: no energy, nest or timing figure is read from M2.`, '');
  o.push(...printSection({ ...B, ...SWITCHES, menuPossible: 1 }, readList(), 'the runs at level 1'));
  o.push(...printSection({ ...B, ...SWITCHES, menuPossible: 2 }, readList(), 'the runs at level 2'));
  return o.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2), cmd = args[0], flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
  const log = (s: string) => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${s}`);
  if (cmd === 'm1') {
    const seed = Number(flag('seed', '48')), out = resolve(ROOT, flag('out', 'artifacts/r12/m1'));
    mkdirSync(out, { recursive: true });
    const r = runM1(seed, log);
    writeFileSync(join(out, `m1-s${seed}.json`), JSON.stringify(r, null, 1) + '\n'); log(`wrote ${join(out, `m1-s${seed}.json`)}`);
  } else if (cmd === 'm2') {
    const out = resolve(ROOT, flag('out', 'artifacts/r12/m2')), runs: M2Run[] = [];
    mkdirSync(out, { recursive: true });
    for (const level of M2.levels) for (const seed of M2.seeds) for (const mode of M2.decodes) for (const kernel of M2.kernels) {
      const t0 = Date.now(), r = await runM2One(seed, level, mode, kernel); runs.push(r);
      log(`M2 level ${level} seed ${seed} ${mode} ${kernel}: ${r.asks} asks, ${r.kindCalls} kind calls, targets ${JSON.stringify(r.targetCalls)}, replay ${r.replay}, ${Math.round((Date.now() - t0) / 1000)} s`);
    }
    const handRules = Object.fromEntries(M2.levels.map(l => [`level${l}`, handRulesOf({ ...base(), ...SWITCHES, menuPossible: l })]));
    writeFileSync(join(out, 'm2.json'), JSON.stringify({ head: git(['rev-parse', '--short', 'HEAD']), handRules, runs }, null, 1) + '\n'); log(`wrote ${join(out, 'm2.json')}`);
  } else if (cmd === 'numbers') {
    const m1 = SEEDS.map(s => resolve(ROOT, `artifacts/r12/m1/m1-s${s}.json`)).filter(existsSync).map(f => JSON.parse(readFileSync(f, 'utf8')) as M1Result);
    const m2f = resolve(ROOT, 'artifacts/r12/m2/m2.json'), m2 = existsSync(m2f) ? (JSON.parse(readFileSync(m2f, 'utf8')) as { runs: M2Run[] }).runs : [];
    const md = resolve(ROOT, flag('md', 'docs/staging/r12-build-numbers.md'));
    writeFileSync(md, numbersMarkdown(m1, m2) + '\n'); log(`wrote ${md}`);
  } else { console.error('usage: scripts/r12-runs.ts m1 --seed 48|7 | m2 | numbers'); process.exitCode = 2; }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e instanceof Error ? e.stack : e); process.exitCode = 1; });
