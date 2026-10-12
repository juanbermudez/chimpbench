// Stage R13, the second reader's proof (docs/staging/r13-prereg.md §13): the bytes the population script hands the
// scorer on the packet 5 path against the bytes stage R11's loop hands it for the same decision point. No model: every
// scorer here is a recorder with the fake worker's rule (scripts/lib/fake-worker.mjs).
//
// Stage R11's side is written out here as the frozen checkout the adapter was run from has it (scripts/r11-loop.ts at
// 5b5a506, lines 106 to 107 and 294), and not through the functions stage R13 added (engineKernel, the moved packetOf):
//     export function packetOf(name, ctx) { return name === 'state' ? buildStateOnlyQuestion(ctx) : armPacket(ctx, name); }
//     const kernel = glinerKernel(s.scorer, a.adapter, { packet: r => packetOf(a.packet, r.context) });
// and the line a worker is written is scripts/ft-society.ts Worker.score:
//     JSON.stringify({ batch: batch.map(({ adapter, packet }) => ({ adapter, packet })) }) + '\n'
//
//   pnpm exec tsx scripts/r13-packet-proof.ts inprocess [--seeds 48,7] [--arm p5b-s7-draw-1] [--burn-in 30]
//       per seed: one day of the whole population through scripts/lib/r10-run.ts runDay wired as scripts/r10-night.ts
//       wires it (engineSpec, engineKernel, runPacket, newDecoder), every request kept; stage R11's kernel is then asked
//       the same requests; and one day of stage R11's own harness (scripts/r5-pilot.ts runArm on the focal animals, its
//       kernel as above), whose requests the population script's kernel is then asked. Lines compared byte for byte.
//   pnpm exec tsx scripts/r13-packet-proof.ts wire <run folder> <captured stdin lines>
//       a run of the script itself against a fake worker that kept every line it was handed (never seed 3613: the script
//       runs a dry arm on seed 48 only): stage R11's kernel on each saved context of the run against those lines.
// Seed 3613 is refused: no kernel, not even a recorder, decides on it before the registered run.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { Kernel, KernelRequest } from '../src/kernel/types';
import type { LocalPacket } from '../src/providers/packet';
import { createWorld, tickWorld } from '../src/simulation';
import type { DecisionContext, World } from '../src/types';
import { RESERVED_SEEDS } from './e-run';
import { focalSet } from './em-loop';
import type { ScoreItem, Scorer } from './ft-society';
import { newDecoder } from './lib/decoder';
import { glinerKernel } from './lib/kernels';
import { buildStateOnlyQuestion } from './lib/packet-state';
import { runPacket } from './lib/r10-read';
import { DAY, dayName, keyOf, meterStart, MIN_AGE, readLines, readRegistry, RECEIPT_SCHEMA_PACKET, runDay, sha16, type AskLine, type Engine, type Line } from './lib/r10-run';
import { armPacket, PACKET_VERSION, type Arm } from './lib/r11-packets';
import { R13 } from './lib/r13';
import { engineArm, engineKernel, engineSpec, LOOP_SWITCHES, SEALED_SEEDS } from './r11-loop';
import { armWorld, runArm } from './r5-pilot';
import { salted } from './r7-card';

/** Stage R11's packet and kernel, as its frozen checkout builds them (see the header). */
const r11PacketOf = (name: Arm | 'state', ctx: DecisionContext): LocalPacket => name === 'state' ? buildStateOnlyQuestion(ctx) : armPacket(ctx, name);
const r11Kernel = (scorer: Scorer, adapter: string, packet: Arm | 'state'): Kernel => glinerKernel(scorer, adapter, { packet: r => r11PacketOf(packet, r.context) });
/** The line a worker is written for a batch (scripts/ft-society.ts Worker.score). */
const wireLine = (batch: ScoreItem[]): string => JSON.stringify({ batch: batch.map(({ adapter, packet }) => ({ adapter, packet })) }) + '\n';
const fakeHash = (text: string) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) % 7; };
/** A scorer that holds no model: it keeps the line a worker would be written and answers by the fake worker's rule. */
function recorder(): { scorer: Scorer; lines: string[] } {
  const lines: string[] = [];
  return { lines, scorer: { async score(batch: ScoreItem[]) { lines.push(wireLine(batch)); return batch.map(b => { const w = Object.values((b.packet as LocalPacket).questions.action.criteria).map(t => 1 + fakeHash(String(t))), z = w.reduce((x, y) => x + y, 0); return w.map(x => x / z); }); } } };
}
/** The line a kernel hands the scorer for one request, or the reason it handed none (a packet over the estimate budget). */
async function lineOf(kernel: Kernel, rec: { lines: string[] }, request: KernelRequest): Promise<string> {
  const n = rec.lines.length;
  try { await kernel.decide(request, { random: () => 0 }); } catch (error) { return `no line: ${error instanceof Error ? error.message.replace(/\d+/g, 'N') : error}`; }
  return rec.lines.length === n + 1 ? rec.lines[n] : `no line: ${rec.lines.length - n} lines`;
}
const inc = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };
const table = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
const bytes = (lines: string[]) => lines.reduce((s, l) => s + Buffer.byteLength(l, 'utf8'), 0);
const refuseSeed = (seed: number) => { if (!Number.isInteger(seed) || RESERVED_SEEDS.has(seed) || SEALED_SEEDS.includes(seed) || seed === R13.seed) throw new Error(`seed ${seed}: a development seed only (never a reserved, retired or sealed seed, and never ${R13.seed})`); };

async function inprocess(argv: string[]): Promise<number> {
  const arg = (k: string, d: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const seeds = arg('seeds', '48,7').split(',').map(Number), arm = engineArm(arg('arm', R13.arms.draw)), burnIn = +arg('burn-in', '30');
  if (!arm || arm.packet === 'state') throw new Error('an arm of stage R11 on a packet 5');
  seeds.forEach(refuseSeed);
  const params = { ...JSON.parse(readFileSync(resolve('docs/staging/integrator-kit/params/M6-W50.json'), 'utf8')) as Record<string, number>, ...LOOP_SWITCHES };
  let bad = 0, total = 0;
  for (const seed of seeds) {
    const base: World = createWorld(seed, { profile: 'field', params });
    for (let i = 0; i < burnIn * DAY; i++) tickWorld(base);
    // (a) the population script's engine, wired as scripts/r10-night.ts wires an arm of stage R11
    const world = armWorld(base, engineSpec(arm)), e: Engine = { world, day: 0, meter: meterStart(world) }, mine = recorder(), kernel13 = engineKernel(mine.scorer, arm), requests: KernelRequest[] = [], sent: string[] = [], lines: Line[] = [];
    const kept: Kernel = { ...kernel13, async decide(request, env) { requests.push(structuredClone(request)); const n = mine.lines.length; try { return await kernel13.decide(request, env); } finally { sent.push(mine.lines.length === n + 1 ? mine.lines[n] : 'no line'); } } };
    await runDay(e, kept, { minAge: MIN_AGE, decoder: newDecoder(arm.decode), packet: runPacket({ receiptSchema: RECEIPT_SCHEMA_PACKET, packet: PACKET_VERSION[arm.packet], packetName: arm.packet }), sink: { lines: l => { lines.push(...l); } } });
    const asks = lines.filter((l): l is AskLine => l.k === 'ask'), reached = asks.filter(l => l.sha !== '');
    const theirs = recorder(), kernel11 = r11Kernel(theirs.scorer, arm.adapter, arm.packet);
    let same = 0, shaSame = 0; const kinds: Record<string, number> = {}, sizes: Record<string, number> = {}, animals = new Set<number>(), fams: Record<string, number> = {};
    for (const [i, request] of requests.entries()) {
      const a = sent[i].startsWith('no line') ? 'no line' : sent[i], b = await lineOf(kernel11, theirs, request);
      if (a === (b.startsWith('no line') ? 'no line' : b)) same++; else if (bad++ < 3) console.log(`  DIFFERS at request ${i} (animal ${request.context.chimpId}):\n    population script: ${a.slice(0, 200)}\n    stage R11's loop:  ${b.slice(0, 200)}`);
      const l = reached[i];
      if (l && l.id === request.context.chimpId && l.v === request.context.version && a !== 'no line' && sha16(JSON.stringify((JSON.parse(a) as { batch: { packet: unknown }[] }).batch[0].packet)) === l.sha && l.pk === PACKET_VERSION[arm.packet]) shaSame++;
      if (l) { inc(kinds, `${l.phase}/${l.trig.why}`); inc(sizes, `${l.n} options`); animals.add(l.id); for (const f of new Set(l.fam)) inc(fams, f); }
    }
    total += requests.length;
    console.log(`seed ${seed}, the population script's engine, arm ${arm.name} (adapter ${arm.adapter}, packet ${arm.packet}), one day after ${burnIn}: ${asks.length} asks, ${reached.length} reached the kernel, ${requests.length} requests kept, ${animals.size} animals`);
    console.log(`  byte for byte the line stage R11's loop hands the scorer: ${same} of ${requests.length} (${bytes(sent.filter(s => s !== 'no line'))} bytes compared); the receipt's sha is the hash of the packet in that line and its version is ${PACKET_VERSION[arm.packet]}: ${shaSame} of ${reached.length}`);
    console.log(`  by phase and what opened the ask: ${table(kinds)}`);
    console.log(`  by menu size: ${table(sizes)}`);
    console.log(`  asks with a kind of act on the menu: ${table(fams)}`);
    if (same !== requests.length || shaSame !== reached.length || requests.length !== reached.length) bad++;
    // (b) stage R11's own harness on the same burned-in world: its focal animals, its kernel; the population script's kernel is asked the same requests
    const focal = focalSet(base), theirs2 = recorder(), k11 = r11Kernel(theirs2.scorer, arm.adapter, arm.packet), reqs2: KernelRequest[] = [], sent2: string[] = [];
    const kept2: Kernel = { ...k11, async decide(request, env) { reqs2.push(structuredClone(request)); const n = theirs2.lines.length; try { return await k11.decide(request, env); } finally { sent2.push(theirs2.lines.length === n + 1 ? theirs2.lines[n] : 'no line'); } } };
    const own = structuredClone(base); own.rng = salted(own.rng, arm.worldSalt);   // the arm's own stream, as scripts/r11-loop.ts engineRun
    await runArm(own, arm.name, engineSpec(arm), 1, focal, kept2, { packet: r => r11PacketOf(arm.packet, r.context), carryOn: true });
    const mine2 = recorder(), k13 = engineKernel(mine2.scorer, arm);
    let same2 = 0;
    for (const [i, request] of reqs2.entries()) { const b = await lineOf(k13, mine2, request); if ((b.startsWith('no line') ? 'no line' : b) === sent2[i]) same2++; else if (bad++ < 3) console.log(`  DIFFERS at focal request ${i}`); }
    total += reqs2.length;
    console.log(`seed ${seed}, stage R11's own harness (${focal.length} focal animals, one day): ${reqs2.length} requests; the population script's kernel hands the scorer the same line for ${same2} of ${reqs2.length}`);
    if (same2 !== reqs2.length) bad++;
  }
  console.log(bad ? `THE PACKETS DIFFER (${bad})` : `every line is the same: ${total} decision points on seeds ${seeds.join(' and ')}`);
  return bad ? 1 : 0;
}

async function wire(argv: string[]): Promise<number> {
  const [out, capture] = argv.map(a => resolve(a));
  if (!out || !capture || !existsSync(capture)) throw new Error('wire <run folder> <the file of lines the fake worker was handed>');
  const reg = readRegistry(out);
  refuseSeed(reg.seed);
  if (reg.adapter !== 'fake' || !reg.packetName || reg.packetName === 'state') throw new Error('a run of a dry arm of stage R11 on a packet 5 (a fake worker)');
  const lines: Line[] = [], contexts = new Map<string, DecisionContext>();
  for (let d = 1; d <= reg.days.length; d++) {
    lines.push(...readLines<Line>(resolve(out, 'receipts', `${dayName(d)}.jsonl`)));
    const gz = resolve(out, 'contexts', `${dayName(d)}.jsonl.gz`), plain = resolve(out, 'contexts', `${dayName(d)}.jsonl`);
    const text = existsSync(gz) ? gunzipSync(readFileSync(gz)).toString('utf8') : readFileSync(plain, 'utf8');
    for (const l of text.split('\n')) if (l) { const c = JSON.parse(l) as { t: number; id: number; v: number; context: DecisionContext }; contexts.set(keyOf(c.t, c.id, c.v), c.context); }
  }
  const handed = readFileSync(capture, 'utf8').split('\n').filter(Boolean).map(l => l + '\n');
  // what reached the worker: not a packet over the estimate budget (the kernel refuses it first), not an answer reused from a journal
  const reached = lines.filter((l): l is AskLine => l.k === 'ask' && l.sha !== '' && l.re !== 1 && !(l.refusal === 'kernel-error' && /^packet over the token budget/.test(l.detail)));
  const theirs = recorder(), kernel11 = r11Kernel(theirs.scorer, 'fake', reg.packetName);
  // the lines the worker was handed are in order; a line that is no ask's is counted apart (a warm-up packet: one per worker start, before it serves)
  let same = 0, at = 0, extra = 0, missing = 0;
  for (const l of reached) {
    const ctx = contexts.get(keyOf(l.t, l.id, l.v));
    if (!ctx) { missing++; continue; }
    const b = await lineOf(kernel11, theirs, { context: ctx, options: [], rulesIndex: -1 });
    while (at < handed.length && handed[at] !== b) { at++; extra++; }
    if (at < handed.length) { same++; at++; }
  }
  extra += handed.length - at;
  const ok = same === reached.length && !missing && extra <= reg.segments.length;
  console.log(`${reg.label}: seed ${reg.seed}, ${reg.days.length} days, ${reached.length} asks reached the worker; the worker was handed ${handed.length} lines (${bytes(handed)} bytes)`);
  console.log(`${ok ? 'every line the script wrote to its worker for an ask is the line stage R11\'s loop builds for that decision point, byte for byte' : 'THE LINES DIFFER'}: ${same} of ${reached.length}; ${missing} asks without a saved context; ${extra} line(s) that are no ask's (a warm-up packet per worker start; ${reg.segments.length} segment${reg.segments.length === 1 ? '' : 's'})`);
  return ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('r13-packet-proof.ts')) {
  const [cmd, ...rest] = process.argv.slice(2);
  (cmd === 'inprocess' ? inprocess(rest) : cmd === 'wire' ? wire(rest) : Promise.reject(new Error('usage: r13-packet-proof.ts inprocess [--seeds 48,7] | wire <run folder> <captured lines>')))
    .then(code => process.exit(code), error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
