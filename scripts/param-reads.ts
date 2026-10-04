// Dynamic check of the prescription count's "not in use" lists (Track E audit; scripts/lib/prescriptions.ts ACTIVE_WHEN).
// Each arm runs a field world on one development seed for a few eco-days with its parameter object traced
// (src/sim/params.ts traceParamReads: a read-only Proxy around the resolved parameters; the world and its RNG are
// unchanged by tracing, tests/sim-params.test.ts), and records which registry ids the simulation reads after creation.
//
//   pnpm exec tsx scripts/param-reads.ts [--seed 48] [--days 3] [--workers 4] [--arms off,stack,energyLedger,…] [--json f.json] [--md f.md]
//   pnpm exec tsx scripts/param-reads.ts --perturb [--arms stack] …   # also: which entries still move the world
//
// Reports, for every arm against the off arm (and against its own base when it depends on another switch):
//   - outcome-encoding entries read with the switches off and not under the arm: candidates for "not in use", to be
//     confirmed by reading the code (a short run misses rare branches; the code decides);
//   - entries read only under the arm (what the switch brings in), with their ledger class;
//   - whether scripts/lib/prescriptions.ts already treats each candidate as out of use under the arm.
// A read is not a use: values copied into a cache (life.ts needRates) are read whether or not a branch uses them.
// --perturb is the second check for those: each non-zero outcome-encoding entry the arm reads is moved (×2, else ×0.5,
// inside its hard range) in two worlds, the arm and off. Listed for a code read: entries the ledger counts under the arm
// that move the off world but not the arm's within the window (a missed "not in use"), and entries the ledger switches
// out that still move the arm's world (an over-claim, or a residue to state in the ACTIVE_WHEN reason).
// Development seeds only (AGENTS.md lists the reserved ones). Nothing here writes to src/ or data/.
//
//   pnpm exec tsx scripts/param-reads.ts --literals [--arms off,S27,callValue,S27+redecideValue=2] [--seeds 48,7] [--days 3] [--workers 4] [--tmp dir] [--all] [--json f.json] [--md f.md]
//
// --literals (stage E0b; docs/staging/e0b-prereg.md §4) checks the lint's literals the same way: each `interval` or
// `bonus` literal counted under an arm, or named by a LITERAL_OFF entry (with --all: every one), is moved ×2 in a
// scratch copy of src/ (sim, decide, types.ts, simulation.ts; under --tmp, default the OS temp directory, removed after
// unless --keep), and each arm runs from the copy and from the source: whether the literal changes the arm's world in the
// window is reported next to the ledger's verdict. A literal the ledger switches out that still moves the arm's world is
// an over-claim; a counted literal that moves no world waits for a branch the window did not reach (the code read
// decides). An arm is a name from the arms above or a stack of scripts/decision-guide.ts (S3 … S27), with `+id=value`
// overrides.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { HARD_RANGES, INTEGER_IDS, type ParamId } from '../src/sim/params.gen';
import { traceParamReads, type Overrides } from '../src/sim/params';
import { STACKS } from './decision-guide';
import { runPool } from './lib/pool';
import { LITERAL_OFF, TRACK_E_SWITCHES, classify, isActive, type Literal, type PClass } from './lib/prescriptions';
import { fieldParams, lintSim, loadEntries } from './prescription-ledger';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TICKS_PER_DAY = 5760;

/** The 5-seed confirm stack (artifacts/validation/e/stack1-params.json). */
export const STACK: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseByMilk: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1 };
const key = (p: Overrides) => JSON.stringify(Object.keys(p).sort().map(k => [k, p[k as keyof Overrides]]));
/** Arms: off, every Track E switch on top of the switches it needs (its base: off, another arm, or a base of its own), the stack. */
export const ARMS: Record<string, { params: Overrides; base: string }> = (() => {
  const arms: Record<string, { params: Overrides; base: string }> = { off: { params: {}, base: 'off' } };
  for (const [id, s] of Object.entries(TRACK_E_SWITCHES)) arms[id] = { params: { ...s.needs, [id]: 1 } as Overrides, base: '' };
  const byKey = new Map(Object.entries(arms).map(([n, a]) => [key(a.params), n]));
  for (const [id, s] of Object.entries(TRACK_E_SWITCHES)) {
    const k = key(s.needs as Overrides);
    let base = byKey.get(k);
    if (!base) { base = `base:${Object.keys(s.needs).join('+')}`; arms[base] = { params: s.needs as Overrides, base: 'off' }; byKey.set(k, base); }
    arms[id].base = base;
  }
  arms.stack = { params: STACK, base: 'off' };
  return arms;
})();

interface Job { seed: number; days: number; params: Overrides; trace: boolean; /** --literals: the root of a scratch copy whose src/ the world runs from. */ root?: string }
interface Result { reads: string[]; hash: string }
type Sim = { createWorld: typeof createWorld; tickWorld: typeof tickWorld };

/** One world: created, traced (when asked), run for `days`, hashed. Pure with respect to everything outside it. */
export function runJob(j: Job, sim: Sim = { createWorld, tickWorld }): Result {
  const w = sim.createWorld(j.seed, { profile: 'field', params: j.params });
  const read = new Set<string>();
  if (j.trace) traceParamReads(w, read);
  for (let i = 0, n = Math.round(j.days * TICKS_PER_DAY); i < n; i++) sim.tickWorld(w);
  // the stored override set (world.sim.params) differs by construction; the hash is of everything else
  const hash = createHash('sha256').update(JSON.stringify(w, function (this: unknown, k, v) { return k === 'params' && this === (w as { sim?: unknown }).sim ? undefined : v; })).digest('hex').slice(0, 16);
  return { reads: [...read].sort(), hash };
}

/** A job of --literals: the world from the scratch copy at `root` (a fresh worker each, so no copy stays loaded). */
async function runLiteralJob(j: Job): Promise<Result> {
  return runJob(j, j.root ? await import(pathToFileURL(join(j.root, 'src/simulation.ts')).href) as Sim : { createWorld, tickWorld });
}

/** An arm spec of --literals: a name of ARMS or STACKS, then `+id=value` overrides. */
export function armParams(spec: string): Overrides {
  const [name, ...rest] = spec.split('+');
  const stacks = STACKS as Record<string, { switches: Record<string, number> }>;
  const base = ARMS[name]?.params ?? stacks[name]?.switches;
  if (!base) throw new Error(`unknown arm ${name}; arms: ${Object.keys(ARMS).join(', ')}, ${Object.keys(STACKS).join(', ')}`);
  const out: Record<string, number> = { ...base };
  for (const kv of rest) { const [id, v] = kv.split('='); if (!id || v === undefined || !Number.isFinite(+v)) throw new Error(`bad override ${kv} in ${spec}`); out[id] = +v; }
  return out as Overrides;
}

/** The text of `line` with each [start, end) span's literal moved ×2 (spans from the lint, which keeps offsets). */
export function movedLine(line: string, spans: [number, number][]): string {
  let s = line;
  for (const [a, b] of [...spans].sort((p, q) => q[0] - p[0])) s = `${s.slice(0, a)}(2 * (${s.slice(a, b)}))${s.slice(b)}`;
  return s;
}

/** A scratch copy of the simulation's source with one literal moved; returns its root. */
function copyWithMoved(tmp: string, k: number, lit: Literal): string {
  const root = join(tmp, `l${k}`), src = join(root, 'src');
  mkdirSync(src, { recursive: true });
  for (const p of ['sim', 'decide', 'types.ts', 'simulation.ts']) cpSync(join(ROOT, 'src', p), join(src, p), { recursive: true });
  const file = join(src, 'sim', lit.file), lines = readFileSync(file, 'utf8').split('\n');
  const before = lines[lit.line - 1];
  lines[lit.line - 1] = movedLine(before, lit.spans!);
  if (lines[lit.line - 1] === before) throw new Error(`${lit.file}:${lit.line}: nothing moved`);
  writeFileSync(file, lines.join('\n'));
  return root;
}

async function literalsMain(args: string[]): Promise<void> {
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const seeds = flag('seeds', '48,7').split(',').map(Number), days = +flag('days', '3'), workers = Math.max(1, +flag('workers', '4'));
  const arms = flag('arms', 'off,S27').split(',');
  const Ps = arms.map(a => fieldParams(armParams(a)));
  // the ledger's verdict for every interval and bonus literal under each arm (the same lines in every arm)
  const per = Ps.map(P => lintSim(P).filter(l => l.kind === 'interval' || l.kind === 'bonus'));
  const key = (l: Literal) => `${l.file}:${l.line}:${l.kind}`;
  const rawLine = (l: Literal) => readFileSync(join(ROOT, 'src/sim', l.file), 'utf8').split('\n')[l.line - 1];
  const offNamed = (l: Literal) => LITERAL_OFF.some(a => a.file === l.file && rawLine(l).includes(a.has) && (!a.kind || a.kind === l.kind));
  const lits = per[0].filter((l, i) => args.includes('--all') || per.some(L => L[i].counted) || offNamed(l));
  const verdict = (ai: number, l: Literal) => { const q = per[ai].find(x => key(x) === key(l))!; return q.counted ? 'counted' : q.why.startsWith('switched off') ? 'off' : 'allowed'; };
  const tmp = mkdtempSync(join(resolve(flag('tmp', tmpdir())), 'mgogo-literals-'));
  console.error(`param-reads --literals: ${lits.length} literals × ${arms.length} arms × seeds ${seeds.join(',')}, ${days} days; copies in ${tmp}`);
  const jobs: Job[] = [];
  for (const P of arms.map(armParams)) for (const seed of seeds) jobs.push({ seed, days, params: P, trace: false });
  lits.forEach((l, k) => { const root = copyWithMoved(tmp, k, l); for (const P of arms.map(armParams)) for (const seed of seeds) jobs.push({ seed, days, params: P, trace: false, root }); });
  const self = new URL(import.meta.url);
  const r = await runPool<Job, Result>(self, jobs, { size: workers, fresh: true });
  if (!args.includes('--keep')) rmSync(tmp, { recursive: true, force: true });
  const nBase = arms.length * seeds.length, base = (ai: number, si: number) => r[ai * seeds.length + si].hash;
  const rows = lits.map((l, k) => {
    const cells = arms.map((a, ai) => {
      const moved = seeds.filter((_, si) => r[nBase + k * nBase + ai * seeds.length + si].hash !== base(ai, si)).length;
      const v = verdict(ai, l);
      const flagged = v === 'off' && moved > 0 ? 'OVER-CLAIM' : v === 'counted' && moved === 0 ? 'inert in the window' : '';
      return { arm: a, ledger: v, moved, of: seeds.length, flag: flagged };
    });
    return { where: `src/sim/${l.file}:${l.line}`, kind: l.kind, values: l.values, text: l.text.slice(0, 120), cells };
  });
  const out: string[] = [`# Literals moved ×2, by arm (seeds ${seeds.join(', ')}, ${days} eco-days, field profile)`, '',
    'Generated by `scripts/param-reads.ts --literals` (docs/staging/e0b-prereg.md §4). Each cell: the ledger\'s verdict under the arm (counted, off = switched out by LITERAL_OFF, allowed = not a prescription) and in how many seeds moving the literal changed the arm\'s world within the window. OVER-CLAIM: switched out but still moves the world. "inert in the window": counted, but its branch was not reached in the window (the code read decides).', '',
    `| Literal | Kind | Values | ${arms.join(' | ')} |`, `| --- | --- | --- | ${arms.map(() => '---').join(' | ')} |`];
  for (const x of rows) out.push(`| ${x.where} | ${x.kind} | ${x.values.join(', ')} | ${x.cells.map(c => `${c.ledger}, moves ${c.moved}/${c.of}${c.flag ? ` **${c.flag}**` : ''}`).join(' | ')} |`);
  const over = rows.flatMap(x => x.cells.filter(c => c.flag === 'OVER-CLAIM').map(c => `${x.where} (${c.arm})`));
  out.push('', `Over-claims: ${over.length ? over.join(', ') : 'none'}.`);
  const md = out.join('\n') + '\n';
  if (args.includes('--md')) { const f = resolve(flag('md', '')); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, md); }
  if (args.includes('--json')) { const f = resolve(flag('json', '')); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify({ seeds, days, arms: arms.map((a, i) => ({ spec: a, params: armParams(a), baseHashes: seeds.map((_, si) => base(i, si)) })), rows }, null, 1) + '\n'); }
  console.log(md);
  if (over.length) process.exitCode = 1;
}

/** A different legal value for `id` (×2, else ×0.5, else the middle of the hard range; whole numbers rounded). */
export function moved(id: ParamId, v: number): number | null {
  const [lo, hi] = HARD_RANGES[id], int = (INTEGER_IDS as readonly string[]).includes(id);
  const fix = (x: number) => (int ? Math.round(x) : x);
  for (const x of [v * 2, v * 0.5, v + 1, v - 1, (lo + Math.min(hi, lo + 10)) / 2].map(fix)) if (x !== v && x >= lo && x <= hi && Number.isFinite(x)) return x;
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--literals')) return literalsMain(args);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const seed = +flag('seed', '48'), days = +flag('days', '3'), workers = Math.max(1, +flag('workers', '4'));
  const names = flag('arms', Object.keys(ARMS).join(',')).split(',');
  for (const n of names) if (!ARMS[n]) { console.error(`unknown arm ${n}; arms: ${Object.keys(ARMS).join(', ')}`); process.exit(2); }
  const needed = [...new Set(['off', ...names.flatMap(n => [n, ARMS[n].base])])];
  const entries = loadEntries(), cls = new Map(entries.map(e => [e.id, classify(e)]));
  const registry = new Set(entries.map(e => e.id));
  const self = new URL(import.meta.url);

  console.error(`param-reads: seed ${seed}, ${days} days, field profile, arms ${needed.join(', ')}`);
  const res = await runPool<Job, Result>(self, needed.map(n => ({ seed, days, params: ARMS[n].params, trace: true })), { size: workers });
  const reads = new Map(needed.map((n, i) => [n, new Set(res[i].reads.filter(id => registry.has(id)))]));

  const out: string[] = [`# Parameter reads by arm (seed ${seed}, ${days} eco-days, field profile)`, '',
    'Generated by `scripts/param-reads.ts`. "Read off, not under the arm": an outcome-encoding entry the simulation reads with every switch off and never reads under the arm; **counted** marks those `scripts/lib/prescriptions.ts` still counts as in use under the arm (a candidate, or a rare branch the arm did not reach in this window). A short run can miss rare branches: the code read decides.', ''];
  const json: Record<string, unknown> = {};
  const tag = (id: string) => `\`${id}\`${cls.get(id)?.cls === 'outcome-encoding' ? ' (OE)' : ''}`;
  for (const n of names.filter(n => n !== 'off')) {
    const P = fieldParams(ARMS[n].params), A = reads.get(n)!, O = reads.get('off')!, B = reads.get(ARMS[n].base)!;
    const goneOE = [...O].filter(id => !A.has(id) && cls.get(id)?.cls === 'outcome-encoding');
    const goneBase = [...B].filter(id => !A.has(id));
    const added = [...A].filter(id => !B.has(id));
    const unflagged = goneOE.filter(id => isActive(cls.get(id)!, P));
    json[n] = { params: ARMS[n].params, base: ARMS[n].base, readCount: A.size, goneOE, goneVsBase: goneBase, added: added.map(id => ({ id, cls: cls.get(id)?.cls as PClass })), unflagged };
    out.push(`## ${n} (${JSON.stringify(ARMS[n].params)}; base ${ARMS[n].base})`, '');
    out.push(`Reads ${A.size} registry ids (off ${O.size}, base ${B.size}).`, '');
    out.push(`- Outcome-encoding, read off and not under the arm (${goneOE.length}): ${goneOE.map(id => `\`${id}\`${isActive(cls.get(id)!, P) ? ' **counted**' : ''}`).join(', ') || '—'}`);
    out.push(`- Any class, read under the base and not under the arm (${goneBase.length}): ${goneBase.map(tag).join(', ') || '—'}`);
    out.push(`- Read under the arm and not under the base (${added.length}): ${added.map(tag).join(', ') || '—'}`, '');
  }

  if (args.includes('--perturb')) {
    // the off world and its perturbations are shared by every arm: run once
    const Poff = fieldParams({});
    const pnames = names.filter(n => n !== 'off');
    const plan = new Map<string, ParamId[]>();
    for (const n of pnames) {
      const P = fieldParams(ARMS[n].params), A = reads.get(n)!;
      // outcome-encoding entries the arm reads that are non-zero: counted ones, and ones the ledger says the arm switches out
      plan.set(n, [...A].filter(id => cls.get(id)?.cls === 'outcome-encoding' && P[id] !== undefined && P[id] !== 0 && !cls.get(id)!.planned && moved(id as ParamId, P[id]) !== null) as ParamId[]);
    }
    const offIds = [...new Set([...plan.values()].flat())].filter(id => Poff[id] !== undefined && Poff[id] !== 0);
    const jobs: Job[] = [{ seed, days, params: {}, trace: false }, ...offIds.map(id => ({ seed, days, params: { [id]: moved(id, Poff[id])! } as Overrides, trace: false }))];
    const armAt = new Map<string, number>();
    for (const n of pnames) { armAt.set(n, jobs.length); jobs.push({ seed, days, params: ARMS[n].params, trace: false }); for (const id of plan.get(n)!) jobs.push({ seed, days, params: { ...ARMS[n].params, [id]: moved(id, fieldParams(ARMS[n].params)[id])! }, trace: false }); }
    console.error(`param-reads: perturbation, ${jobs.length} runs`);
    const r = await runPool<Job, Result>(self, jobs, { size: workers });
    const offMoves = new Map(offIds.map((id, i) => [id, r[1 + i].hash !== r[0].hash]));
    out.push('## Perturbation: outcome-encoding entries the arm reads, moved one at a time (×2, else ×0.5)', '');
    for (const n of pnames) {
      const P = fieldParams(ARMS[n].params), at = armAt.get(n)!;
      const rows = plan.get(n)!.map((id, i) => ({ id, v: P[id], to: moved(id, P[id])!, counted: isActive(cls.get(id)!, P), movesArm: r[at + 1 + i].hash !== r[at].hash, movesOff: offMoves.get(id) ?? null }));
      (json[n] as Record<string, unknown>).perturb = rows;
      const missed = rows.filter(x => x.counted && !x.movesArm && x.movesOff), over = rows.filter(x => !x.counted && x.movesArm), quiet = rows.filter(x => x.counted && !x.movesArm && !x.movesOff);
      out.push(`### ${n}`, '');
      out.push(`- Counted, moves the off world, inert under the arm (${missed.length}): ${missed.map(x => `\`${x.id}\``).join(', ') || '—'}`);
      out.push(`- Switched out by the ledger, still moves the arm's world (${over.length}): ${over.map(x => `\`${x.id}\``).join(', ') || '—'}`);
      out.push(`- Switched out and inert under the arm (${rows.filter(x => !x.counted && !x.movesArm).length}): ${rows.filter(x => !x.counted && !x.movesArm).map(x => `\`${x.id}\``).join(', ') || '—'}`);
      out.push(`- Counted, moves neither world in ${days} days (${quiet.length}): ${quiet.map(x => `\`${x.id}\``).join(', ') || '—'}`);
      out.push(`- Counted and moves the arm's world: ${rows.filter(x => x.counted && x.movesArm).length} of ${rows.length}.`, '');
    }
  }
  const md = out.join('\n') + '\n';
  if (args.includes('--md')) { const f = resolve(flag('md', '')); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, md); }
  if (args.includes('--json')) { const f = resolve(flag('json', '')); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify({ seed, days, reads: Object.fromEntries([...reads].map(([k, v]) => [k, [...v]])), arms: json }, null, 1) + '\n'); }
  console.log(md);
}

if (!isMainThread) {
  parentPort!.on('message', async (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: m.job.root !== undefined ? await runLiteralJob(m.job) : runJob(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });

