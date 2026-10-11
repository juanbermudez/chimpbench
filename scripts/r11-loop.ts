// Stage R11 in the loop (docs/staging/r11-prereg.md §5): the focal design of stages R5 to R9 (scripts/r5-pilot.ts
// runArm: lockstep, a receipt per ask, replay) with packet 5 sent to the kernel, the gate on, and the decode of stage R9
// (scripts/lib/decoder.ts), read by stage R7's timing card and row readers (scripts/r7-card.ts armReaders) on the same
// burned-in worlds, animals and days as R7's sixteen no-model control arms, which this script also runs (R7's own
// runArm). Every arm continues an exact copy of one burned-in world per seed and carries its own salt in the world's
// random stream, so no two arms share a stream (control arms 1 to 18, engine arms from 21).
//
// Worlds: the working base with observeV4 1, menuParity 1 and observeV5 1 from the first tick, so the animals' own
// record is a month old when the window opens (the rules never read it: the burn-in is checked against a plain one).
// Seeds: 4111 and 4222 (test unit A of docs/staging/r7-prereg.md §9), and 48 for the dry run. 4333 and 4444 stay sealed.
//
//   no model:
//   pnpm exec tsx scripts/r11-loop.ts controls --seed 4111 [--arms rules-1,…]       the sixteen control arms of stage R7 at unit F
//   pnpm exec tsx scripts/r11-loop.ts engine --seed 4111 --arms <a,b> --replay      model arms on file, answered again from their receipts
//   pnpm exec tsx scripts/r11-loop.ts dry [--out artifacts/r11/dry]                 seed 48, one day after one: the controls, then the model arms' own path
//                                                                                   against scripts/lib/fake-worker.mjs (MGOGO_DECIDE_PYTHON), each replayed
//   model (the integrator; runtime variables of HANDOFF.md §3 item 3, MGOGO_FT_ROOT, MGOGO_FT_ADAPTERS):
//   pnpm exec tsx scripts/r11-loop.ts engine --seed 4111 --arms p5b-s7-draw-1,p5b-s7-draw-2
// Arms of the engine: <adapter>-<decode>; adapters p5b-s7, p5b-s11, p5a-s7, p5a-s11 (this stage's, on their own packet)
// and old (r4-rules-state on its own state-only packet); decodes top, draw-1, draw-2, held-1, held-2 (the number is the
// decode salt). `list --decode draw|held|top|none` prints the registered arms for what stage R9 named.
// Outputs: <out>/F/s<seed>/<arm>.json in the shape of scripts/r7-card.ts ArmFile (so scripts/r7-report.ts --engine reads
// them), with the loop's own result under `engine`; receipts beside them.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LocalPacket } from '../server/decide';
import { paramsOf, REGISTRY_HASH } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Kernel, KernelRequest } from '../src/kernel/types';
import type { DecisionContext, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { RESERVED_SEEDS } from './e-run';
import { focalSet } from './em-loop';
import { Worker, type Scorer } from './ft-society';
import type { HarnessDecode } from './lib/decoder';
import { glinerKernel } from './lib/kernels';
import { buildStateOnlyQuestion } from './lib/packet-state';
import { ARM_BANNED, armPacket, isArm, type Arm } from './lib/r11-packets';
import { DAY_TICKS } from './lib/timing-card';
import { DAY, decodeDiffers, GuardedScorer, replayKernel, runArm, type ArmResult, type ArmSpec, type Receipt } from './r5-pilot';
import { ARMS as CONTROL_ARMS, armReaders, runArm as runControl, salted, type ArmFile } from './r7-card';
import { hashWithoutOwn } from './r8-contexts';
import { heldBreaks } from './r9-loop';

export const TEST_SEEDS = [4111, 4222], SEALED_SEEDS = [4333, 4444], DRY_SEED = 48, BURN_IN = 30, DAYS = 5;
export const PARAMS_FILE = 'docs/staging/integrator-kit/params/M6-W50.json';
/** The switches of every world of this stage's loop test: the packet's fields, the rules' menu for every kernel, the animal's own experience. */
export const LOOP_SWITCHES = { observeV4: 1, menuParity: 1, observeV5: 1 };

export type PacketName = Arm | 'state';
/** The adapters of the loop test and the packet each is sent: this stage's four on their own arm's packet, the first adapter on the packet it was trained on, and the dry run's fake worker. */
export const ADAPTERS: Record<string, { adapter: string; packet: PacketName; what: string }> = {
  'p5b-s7': { adapter: 'r11-p5b-s7', packet: 'p5b', what: 'P5b (the whole packet 5), training seed 7' },
  'p5b-s11': { adapter: 'r11-p5b-s11', packet: 'p5b', what: 'P5b (the whole packet 5), training seed 11' },
  'p5a-s7': { adapter: 'r11-p5a-s7', packet: 'p5a', what: 'P5a (without lately and last), training seed 7' },
  'p5a-s11': { adapter: 'r11-p5a-s11', packet: 'p5a', what: 'P5a (without lately and last), training seed 11' },
  old: { adapter: 'r4-rules-state', packet: 'state', what: 'the first adapter (r4-rules-state) on its own state-only packet' },
  'wire-p5b': { adapter: 'fake', packet: 'p5b', what: 'a fake worker (no model) sent P5b' },
  'wire-p5a': { adapter: 'fake', packet: 'p5a', what: 'a fake worker (no model) sent P5a' },
  'wire-old': { adapter: 'fake', packet: 'state', what: 'a fake worker (no model) sent the state-only packet' },
};
export const DECODES: Record<string, HarnessDecode> = {
  top: { mode: 'top', salt: 0, hold: 'act' }, 'draw-1': { mode: 'draw', salt: 1, hold: 'act' }, 'draw-2': { mode: 'draw', salt: 2, hold: 'act' },
  'held-1': { mode: 'held', salt: 1, hold: 'act' }, 'held-2': { mode: 'held', salt: 2, hold: 'act' },
};
export interface EngineArm { name: string; key: string; adapter: string; packet: PacketName; decodeName: string; decode: HarnessDecode; worldSalt: number; what: string }
/** An engine arm by name (`<adapter>-<decode>`), or null. Its world-stream salt is fixed by its place in the two lists (21 onward; the control arms hold 1 to 18). */
export function engineArm(name: string): EngineArm | null {
  const keys = Object.keys(ADAPTERS), decodes = Object.keys(DECODES);
  for (const [ki, key] of keys.entries()) for (const [di, d] of decodes.entries()) if (name === `${key}-${d}`) {
    const a = ADAPTERS[key];
    return { name, key, adapter: a.adapter, packet: a.packet, decodeName: d, decode: DECODES[d], worldSalt: 21 + ki * decodes.length + di, what: `${a.what}; ${d === 'top' ? 'the top pick' : `${DECODES[d].mode === 'draw' ? 'a seeded draw' : 'a draw held for the act'}, decode salt ${DECODES[d].salt}`}` };
  }
  return null;
}
/**
 * The registered model arms for what stage R9 named (prereg §5 as amended in §11.1 and §11.2). Stage R9 named no
 * standard (11 October 2026), so the branch that is run is `none` (the same as `top`): each new adapter with the top
 * pick, the primary decode, and a draw arm (salt 1) beside it; p5b-s7 also with salt 2 (one salt spread on file); the old
 * adapter with the top pick and, last and only if time allows, under a draw (a reference for "nights in a nest under a
 * draw" on the same worlds; no statement needs it). In order of need (§11.2): the first training seed of each arm, P5b
 * before P5a, then the second seeds; the old adapter last. An arm's world stream is fixed by its name, not by this order.
 * `draw` and `held` are kept as first registered (each new adapter with decode salts 1 and 2, the old adapter with salt
 * 1); scripts/r11-run.sh no longer launches them.
 */
export function registeredArms(decode: string): { fresh: string[]; old: string[]; optional: string[] } {
  const fresh = ['p5b-s7', 'p5b-s11', 'p5a-s7', 'p5a-s11'], [b7, b11, a7, a11] = fresh;
  if (decode === 'draw' || decode === 'held') return { fresh: [`${b7}-${decode}-1`, `${b11}-${decode}-1`, `${b7}-${decode}-2`, `${b11}-${decode}-2`, `${a7}-${decode}-1`, `${a11}-${decode}-1`, `${a7}-${decode}-2`, `${a11}-${decode}-2`], old: [`old-${decode}-1`], optional: [] };
  if (decode === 'none' || decode === 'top' || decode === '') return { fresh: [`${b7}-top`, `${a7}-top`, `${b7}-draw-1`, `${a7}-draw-1`, `${b11}-top`, `${a11}-top`, `${b11}-draw-1`, `${a11}-draw-1`, `${b7}-draw-2`], old: ['old-top'], optional: ['old-draw-1'] };
  throw new Error(`the decode stage R9 named: draw | held | top | none (got "${decode}")`);
}

/** Why a list of engine arm names cannot be run, or '' (the run script asks before it holds for swap or loads a burn-in). */
export function armsRefusal(names: string[], dry = false): string {
  if (!names.length) return 'name the arms (--arms a,b)';
  for (const n of names) { const a = engineArm(n); if (!a) return `unknown engine arm ${n}: <${Object.keys(ADAPTERS).join('|')}>-<${Object.keys(DECODES).join('|')}>`; if ((a.adapter === 'fake') !== dry) return `arm ${n} ${dry ? 'is not part of' : 'belongs to'} the dry run`; }
  if (new Set(names).size !== names.length) return 'an arm is named twice';
  return '';
}

/** The packet an arm's kernel is sent. */
export function packetOf(name: PacketName, ctx: DecisionContext): LocalPacket { return name === 'state' ? buildStateOnlyQuestion(ctx) : armPacket(ctx, name); }

/** Why a seed may not be run here, or ''. */
export function seedRefusal(seed: number, dry: boolean): string {
  if (RESERVED_SEEDS.has(seed)) return `seed ${seed} is reserved or retired (AGENTS.md)`;
  if (SEALED_SEEDS.includes(seed)) return `seed ${seed} stays sealed (docs/staging/r11-prereg.md §5; docs/staging/r7-prereg.md §9)`;
  if (dry ? seed !== DRY_SEED : !TEST_SEEDS.includes(seed)) return dry ? `the dry run is on seed ${DRY_SEED}` : `seeds ${TEST_SEEDS.join(' and ')} only (docs/staging/r11-prereg.md §5); the dry run is on seed ${DRY_SEED}`;
  return '';
}

/** What an arm's kernel was actually sent: counted by a wrapper around the scorer, so the file can prove which packet reached it. */
export interface Sent { packets: number; stateKeys: Record<string, number>; instructions: string[]; bannedLines: number }
export function spy(scorer: Scorer, banned: string[]): { scorer: Scorer; sent: Sent } {
  const sent: Sent = { packets: 0, stateKeys: {}, instructions: [], bannedLines: 0 };
  return { sent, scorer: { async score(batch) {
    for (const b of batch) { const p = b.packet as LocalPacket | null; if (!p) continue; sent.packets++;
      for (const k of Object.keys(p.state)) { sent.stateKeys[k] = (sent.stateKeys[k] ?? 0) + 1; if (banned.includes(k)) sent.bannedLines++; }
      const ins = p.questions.action.instructions; if (!sent.instructions.includes(ins)) sent.instructions.push(ins); }
    return scorer.score(batch);
  } } };
}

/** The lock-in count of an engine arm, from its receipts (prereg §6.2): fresh choices the kernel settled, those at which carrying on was offered, and those at which it was applied. */
export function carryTally(receipts: Receipt[]): { fresh: number; possible: number; carried: number } {
  const t = { fresh: 0, possible: 0, carried: 0 };
  for (const r of receipts) if (r.by === 'kernel') { t.fresh++; if ((r.cur ?? -1) >= 0) { t.possible++; if (r.picked === r.cur) t.carried++; } }
  return t;
}

export type R11ArmFile = ArmFile & {
  stageR11: true; worldSalt: number;
  /** Lock-in: fresh choices, those at which the act in progress was on the menu and had not ended, and those that carried it on (the rules arms: from a read-only tap on the rules' draws; engine arms: from the receipts). */
  carry?: { fresh: number; possible: number; carried: number };
  engine?: { adapter: string; packet: PacketName; decode: HarnessDecode; what: string; sent: Sent | null; replay: boolean; replayOf?: { endHash: string; sameWorld: boolean; decodeDiffers: number; heldBreaks: number; missing: number }; worker: Record<string, unknown> | null; result: ArmResult };
};

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
const flat = (o: Record<string, number>) => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));

/** The burned-in world of a seed (built once and saved), with the check that the animals' own record changed nothing the rules read. */
export function burnIn(seed: number, days: number, params: Record<string, number>, root: string, log: (s: string) => void): { base: World; plainHash: string } {
  const file = resolve(root, `burnin-M6-W50-own-s${seed}-d${days}.json`), note = file.replace(/\.json$/, '.meta.json');
  if (existsSync(file) && existsSync(note)) {
    const base = JSON.parse(readFileSync(file, 'utf8')) as World, s = (base as unknown as { sim: { params: { registry: string; profile: string; overrides: Record<string, number> } } }).sim.params;
    if (base.seed !== seed || base.tick !== days * DAY_TICKS || s.registry !== REGISTRY_HASH || s.profile !== 'field' || flat(s.overrides) !== flat(params)) throw new Error(`the saved burn-in ${file} was made for another seed, length, parameter registry or parameter set: delete it and its .meta.json, and run every arm of this seed again`);
    return { base, plainHash: (JSON.parse(readFileSync(note, 'utf8')) as { plainHash: string }).plainHash };
  }
  const t0 = Date.now(), base = createWorld(seed, { profile: 'field', params });
  for (let i = 0; i < days * DAY_TICKS; i++) tickWorld(base);
  // the same burn-in without the animals' own record (observeV5 0): the rules' world must be the same
  const { observeV5: _own, ...plainParams } = params, plain = createWorld(seed, { profile: 'field', params: plainParams });
  for (let i = 0; i < days * DAY_TICKS; i++) tickWorld(plain);
  const plainHash = worldHash(plain), mine = hashWithoutOwn(base);
  if (mine !== plainHash) throw new Error(`seed ${seed}: the burn-in with observeV5 1, its own record removed, hashes ${mine}; the plain burn-in hashes ${plainHash}: the record changed the world`);
  mkdirSync(root, { recursive: true });
  writeFileSync(file, JSON.stringify(base));
  writeFileSync(note, JSON.stringify({ seed, days, params, registry: REGISTRY_HASH, hash: worldHash(base), plainHash, withoutOwnEqualsPlain: true, head: git('rev-parse --short HEAD') }, null, 1) + '\n');
  log(`seed ${seed}: burn-in ${days} d built twice in ${Math.round((Date.now() - t0) / 1000)} s; without the own record it is the plain burn-in (${plainHash})`);
  return { base, plainHash };
}

interface Ctx { seed: number; burnInDays: number; days: number; params: Record<string, number>; base: World; plainHash: string; focal: { id: number; cls: string }[]; out: string; head: string; dirty: boolean }

/** One of stage R7's control arms on this stage's burned-in world, by R7's own code; a rules arm also counts how often a fresh draw carries on the act in progress (a read-only tap). */
export function controlArm(x: Ctx, name: string): R11ArmFile {
  const spec = CONTROL_ARMS[name], ids = new Set(x.focal.map(f => f.id)), carry = { fresh: 0, possible: 0, carried: 0 };
  if (spec.share === null) rgTap.fn = (c, _list, menu, _probs, chosen, why) => {
    if (!ids.has(c.id) || why === 'kept' || why === 'arrived' || menu.length < 2) return;
    carry.fresh++;
    if (!ix(c).finished && menu.some(k => k.action === c.action && k.targetId === c.targetId)) { carry.possible++; if (chosen.action === c.action && chosen.targetId === c.targetId) carry.carried++; }
  };
  let r: ReturnType<typeof runControl>;
  try { r = runControl(x.base, spec, 'F', x.days, x.focal, x.params); } finally { rgTap.fn = null; }
  return { stage: 'r7-card', stageR11: true, unit: 'F', seed: x.seed, arm: name, spec, worldSalt: spec.salt, burnIn: x.burnInDays, days: x.days, paramsFile: PARAMS_FILE, head: x.head, dirty: x.dirty,
    burnInHash: worldHash(x.base), focal: x.focal, focalTroop: index(x.base).byId.get(x.focal[0].id)!.troopId, ...r, ...(spec.share === null ? { carry } : {}) };
}

/** One engine arm: a kernel on the focal animals between ticks (scripts/r5-pilot.ts runArm), read by stage R7's card and readers; `from`: answer from these receipts instead of a kernel (a replay). */
export async function engineRun(x: Ctx, arm: EngineArm, kernel: Kernel, opts: { replay?: { missing: number; menuDiffers: number }; guard?: GuardedScorer; sent?: Sent | null; worker?: Record<string, unknown> | null; log?: (s: string) => void } = {}): Promise<{ file: R11ArmFile; receipts: Receipt[] }> {
  const start = structuredClone(x.base); start.rng = salted(start.rng, arm.worldSalt);   // the arm's own stream
  const spec: ArmSpec = { kernel: 'gliner', adapter: arm.adapter, gate: 1, decode: arm.decode }, ids = x.focal.map(f => f.id), receipts: Receipt[] = [];
  let readers: ReturnType<typeof armReaders> | null = null, world: World | null = null, living0 = 0;
  const result = await runArm(start, arm.name, spec, x.days, x.focal, kernel, { receipts: r => receipts.push(r), replay: opts.replay, guard: opts.guard, log: opts.log, carryOn: true,
    packet: (r: KernelRequest) => packetOf(arm.packet, r.context),
    attach: w => { world = w; living0 = w.chimps.filter(c => c.alive).length; readers = armReaders(w, 'F', x.days, ids); return { after: () => readers!.after() }; } });
  const w = world as unknown as World, P = paramsOf(w), got = readers!.finish(x.params), focalIds = new Set(ids);
  const file: R11ArmFile = { stage: 'r7-card', stageR11: true, unit: 'F', seed: x.seed, arm: arm.name, spec: { engine: arm.what, adapter: arm.adapter, packet: arm.packet, decode: arm.decode, gate: 1 }, worldSalt: arm.worldSalt,
    burnIn: x.burnInDays, days: x.days, paramsFile: PARAMS_FILE, head: x.head, dirty: x.dirty, burnInHash: worldHash(x.base), focal: x.focal, focalTroop: index(x.base).byId.get(ids[0])!.troopId,
    startHash: result.startHash, endHash: result.endHash, seconds: result.seconds, rgMinAge: P.rgMinAge, living: { start: living0, end: w.chimps.filter(c => c.alive).length, driven: ids.filter(id => { const c = index(w).byId.get(id); return !!c && c.age >= P.rgMinAge; }).length },
    deaths: result.deaths.map(d => ({ ...d, focal: focalIds.has(d.id) })), ...got, carry: carryTally(receipts),
    engine: { adapter: arm.adapter, packet: arm.packet, decode: arm.decode, what: arm.what, sent: opts.sent ?? null, replay: !!opts.replay, worker: opts.worker ?? null, result } };
  return { file, receipts };
}

const lines = (file: string) => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Receipt);
const sameWorld = (a: ArmResult, b: ArmResult) => a.endHash === b.endHash && a.dayHashes.join() === b.dayHashes.join();

if (process.argv[1]?.endsWith('r11-loop.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const has = (k: string) => process.argv.includes(`--${k}`);
  const cmd = process.argv[2];
  if (cmd === 'list') { const r = registeredArms(arg('decode', 'none')); console.log(`${r.fresh.join(',')} ${r.old.join(',')} ${r.optional.join(',') || '-'}`); process.exit(0); }
  // names: no world is built; prints each arm's adapter, or the reason the list is refused (exit 2)
  if (cmd === 'names') { const names = arg('arms', '').split(',').filter(Boolean), why = armsRefusal(names); if (why) { console.error(`R11: ${why}`); process.exit(2); } console.log(names.map(n => engineArm(n)!.adapter).join(' ')); process.exit(0); }
  if (cmd !== 'controls' && cmd !== 'engine' && cmd !== 'dry') throw new Error('usage: r11-loop.ts controls --seed N | engine --seed N --arms a,b [--replay] | dry | list --decode top|none | names --arms a,b');
  const dry = cmd === 'dry', seed = dry ? DRY_SEED : +arg('seed', '0'), refused = seedRefusal(seed, dry);
  if (refused) throw new Error(refused);
  const root = resolve(arg('out', dry ? 'artifacts/r11/dry' : 'artifacts/r11/loop')), burnInDays = dry ? 1 : BURN_IN, days = dry ? 1 : DAYS;
  const head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
  if (dirty && !has('allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r11-prereg.md §7)');
  const params = { ...JSON.parse(readFileSync(resolve(PARAMS_FILE), 'utf8')), ...LOOP_SWITCHES } as Record<string, number>;
  const out = resolve(root, 'F', `s${seed}`);
  const write = (name: string, file: R11ArmFile, receipts?: Receipt[]) => {
    mkdirSync(out, { recursive: true });
    if (receipts) writeFileSync(resolve(out, `${name}.receipts.jsonl`), receipts.map(r => JSON.stringify(r)).join('\n') + (receipts.length ? '\n' : ''));
    writeFileSync(resolve(out, `${name}.json`), JSON.stringify(file) + '\n');
  };
  if (cmd === 'engine') { const why = armsRefusal(arg('arms', '').split(',').filter(Boolean)); if (why) throw new Error(why); }
  (async () => {
    const { base, plainHash } = burnIn(seed, burnInDays, params, root, s => console.log(s));
    const focal = focalSet(base), x: Ctx = { seed, burnInDays, days, params, base, plainHash, focal, out, head, dirty };
    console.log(`seed ${seed}: burn-in ${burnInDays} d, hash ${worldHash(base)} (plain ${plainHash}); focal ${JSON.stringify(focal)}`);
    let failed = 0;
    const controls = cmd === 'controls' ? arg('arms', Object.keys(CONTROL_ARMS).join(',')).split(',') : dry ? Object.keys(CONTROL_ARMS) : [];
    for (const name of controls) {
      if (!CONTROL_ARMS[name]) throw new Error(`unknown control arm ${name}; known: ${Object.keys(CONTROL_ARMS).join(', ')}`);
      const file = controlArm(x, name);
      write(name, file);
      console.log(`wrote ${name}: end hash ${file.endHash}, ${file.seconds} s, deaths ${file.deaths.length}${file.carry ? `, fresh draws ${file.carry.fresh}, carried on ${file.carry.carried} of ${file.carry.possible}` : ''}`);
    }
    const DRY_ENGINE = ['wire-p5b-top', 'wire-p5b-draw-1', 'wire-p5b-draw-2', 'wire-p5b-held-1', 'wire-p5a-draw-1', 'wire-old-draw-1'];
    const names = cmd === 'engine' ? arg('arms', '').split(',').filter(Boolean) : dry ? DRY_ENGINE : [], replayOnly = has('replay');
    const arms = names.map(n => { const a = engineArm(n); if (!a) throw new Error(`unknown engine arm ${n}: <${Object.keys(ADAPTERS).join('|')}>-<${Object.keys(DECODES).join('|')}>`); return a; });
    if (cmd === 'engine' && !arms.length) throw new Error('engine: name the arms (--arms a,b)');
    for (const a of arms) if ((a.adapter === 'fake') !== dry) throw new Error(`arm ${a.name} ${dry ? 'is not part of' : 'belongs to'} the dry run`);
    // (MGOGO_DECIDE_SERVER would make scripts/ft-society.ts Worker join a shared model server instead of spawning the fake worker)
    if (dry && (!(process.env.MGOGO_DECIDE_PYTHON ?? '').endsWith('fake-worker.mjs') || process.env.MGOGO_DECIDE_SERVER)) throw new Error('the dry run answers from scripts/lib/fake-worker.mjs with MGOGO_DECIDE_SERVER unset (scripts/r11-run.sh dry): it must never load or reach a model');
    const live = arms.length > 0 && !replayOnly;
    let workerReady: Record<string, unknown> | null = null;
    const guard = live ? new GuardedScorer(async () => { const w = new Worker(arg('device', 'mps')); await w.start(); workerReady = w.ready; console.log(`worker ready ${JSON.stringify(w.ready)}`); return w; }, +arg('timeout-s', '120') * 1000) : null;
    await guard?.start();
    // An arm must never be answered by the untuned model: the worker loads only the adapters MGOGO_FT_ADAPTERS names and
    // finds under MGOGO_FT_ROOT, and answers with the untuned model when it loaded none (training/decide_ft/adapters.py).
    // Checked on the worker's ready line, before the first ask (the model itself loads at the first ask).
    if (live) for (const a of arms) {
      const held = ((workerReady as Record<string, unknown> | null)?.adapters ?? {}) as Record<string, string>, listed = (process.env.MGOGO_FT_ADAPTERS ?? '').split(',');
      const why = !(a.adapter in held) ? `the worker finds no adapter ${a.adapter} under MGOGO_FT_ROOT (${process.env.MGOGO_FT_ROOT ?? 'unset'})` : !dry && !listed.includes(a.adapter) ? `MGOGO_FT_ADAPTERS must name ${a.adapter} (it is "${process.env.MGOGO_FT_ADAPTERS ?? ''}")` : '';
      if (why) { guard?.stop(); throw new Error(`arm ${a.name}: ${why}; nothing was asked`); }
    }
    const replay = async (a: EngineArm): Promise<boolean> => {
      const of = (JSON.parse(readFileSync(resolve(out, `${a.name}.json`), 'utf8')) as R11ArmFile).engine!.result, source = lines(resolve(out, `${a.name}.receipts.jsonl`)), stats = { missing: 0, menuDiffers: 0 };
      const r = await engineRun(x, a, replayKernel(source, stats), { replay: stats, log: s => console.log(s) });
      const same = sameWorld(r.file.engine!.result, of), differs = decodeDiffers(source, r.receipts), breaks = heldBreaks(r.receipts);
      r.file.engine!.replayOf = { endHash: of.endHash, sameWorld: same, decodeDiffers: differs, heldBreaks: breaks, missing: stats.missing };
      write(`${a.name}.replay`, r.file, r.receipts);
      console.log(`replay ${a.name}: end hash ${r.file.endHash} ${same ? '= the run\'s' : `DIFFERS from the run's ${of.endHash}`}; decode differs at ${differs} receipts; held draws re-rolled ${breaks}; receipts missing ${stats.missing}`);
      return same && !differs && !breaks && !stats.missing;
    };
    for (const a of arms) {
      if (!replayOnly) {
        const s = spy(guard!, a.packet === 'state' ? [] : ARM_BANNED[a.packet as Arm]);
        const kernel = glinerKernel(s.scorer, a.adapter, { packet: r => packetOf(a.packet, r.context) });
        const r = await engineRun(x, a, kernel, { guard: guard!, sent: s.sent, worker: workerReady, log: t => console.log(t) });
        write(a.name, r.file, r.receipts);
        console.log(`wrote ${a.name}: end hash ${r.file.endHash}, ${r.file.engine!.result.calls} calls, ${r.file.seconds} s; sent ${s.sent.packets} packets with lines ${Object.keys(s.sent.stateKeys).join(', ')}`);
        if (s.sent.bannedLines) { failed++; console.error(`${a.name}: ${s.sent.bannedLines} lines its arm leaves out were sent`); }
      }
      if (replayOnly || dry) { if (!(await replay(a))) failed++; }
    }
    guard?.stop();
    if (dry) {
      // the dry run's own verdicts: what reached the worker, and what the decode did with a fixed set of odds
      const F = (n: string) => JSON.parse(readFileSync(resolve(out, `${n}.json`), 'utf8')) as R11ArmFile, checks: Record<string, boolean | string | number> = {};
      const sentTo = (n: string) => F(n).engine!.sent!, keys = (n: string) => Object.keys(sentTo(n).stateKeys);
      checks['replays that reproduce their run'] = `${arms.length - failed} of ${arms.length}`;
      checks['P5b arms were sent packet 5 (a `doing` line, the one-sentence instruction, no `urgent` line)'] = ['wire-p5b-top', 'wire-p5b-draw-1'].every(n => keys(n).includes('doing') && !keys(n).includes('urgent') && sentTo(n).instructions.length === 1 && /^Choose what this wild chimpanzee does next/.test(sentTo(n).instructions[0]));
      checks['P5b arms were sent the lines `lately` and `last`'] = keys('wire-p5b-draw-1').includes('lately') && keys('wire-p5b-draw-1').includes('last');
      checks['the P5a arm was sent neither `lately` nor `last`, and a `doing` line'] = !keys('wire-p5a-draw-1').includes('lately') && !keys('wire-p5a-draw-1').includes('last') && keys('wire-p5a-draw-1').includes('doing') && sentTo('wire-p5a-draw-1').bannedLines === 0;
      checks['the old arm was sent the state-only packet (no `doing` line, the two-sentence instruction)'] = !keys('wire-old-draw-1').includes('doing') && sentTo('wire-old-draw-1').instructions.every(i => /^You are a field primatologist/.test(i));
      checks['two decode salts give two worlds'] = F('wire-p5b-draw-1').endHash !== F('wire-p5b-draw-2').endHash;
      checks['every engine arm ran on its own stream (start hashes all differ)'] = new Set(DRY_ENGINE.map(n => F(n).startHash)).size === DRY_ENGINE.length;
      checks['every arm continues the one burn-in'] = new Set([...Object.keys(CONTROL_ARMS), ...DRY_ENGINE].map(n => F(n).burnInHash)).size === 1;
      checks['the card read every engine arm (five focal animals, a day each)'] = DRY_ENGINE.every(n => F(n).card.animals.length === focal.length && F(n).card.days.length === focal.length);
      checks['receipts note where the act in progress stands on the menu'] = DRY_ENGINE.every(n => lines(resolve(out, `${n}.receipts.jsonl`)).every(r => typeof r.cur === 'number'));
      writeFileSync(resolve(root, 'dry-checks.json'), JSON.stringify({ head, dirty, seed, burnInDays, days, burnInHash: worldHash(base), plainHash, focal, checks }, null, 1) + '\n');
      console.log(`dry run: ${JSON.stringify(checks, null, 1)}`);
      if (Object.values(checks).some(v => v === false)) failed++;
    }
    if (failed) { console.error(`R11: ${failed} check(s) failed`); process.exit(1); }
  })().catch(e => { console.error(e); process.exit(1); });
}
