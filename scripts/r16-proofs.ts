// Stage R16 (docs/staging/r16-prereg.md §21): proofs that need no model, beyond the dry chain.
//
//   packets FT EVAL OUT        the serving path's bytes: R15's worker started on a fake scorer process that records every
//                              line it receives; each packet sent must be, byte for byte, the row's own packet and the
//                              packet the R15 path renders from the row's context (and the warm-up, the first dev row's)
//   kill-resume OUT            a dry population run killed with SIGKILL inside its second day and resumed must end on the
//                              uninterrupted run's world, with the same receipts, reusing the journalled calls
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { r15Packet } from '../src/providers/packet';
import { R15Worker } from '../server/r15-worker';
import { writeAtomic } from './lib/checkpoint';
import { readJsonl, type R16Row } from './lib/r16-collect';
import { comparable16, readReceipts16, readRegistry16 } from './lib/r16-run';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath, TSX = resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

async function packets(ft: string, evalFile: string, out: string): Promise<number> {
  const capture = resolve(out, 'capture.jsonl'); mkdirSync(out, { recursive: true }); rmSync(capture, { force: true });
  const rows = readJsonl<R16Row>(evalFile).slice(0, 60), adapter = readJsonl<{ id: string }>(resolve(ft, 'contexts', 'dev.jsonl')).length ? (JSON.parse(readFileSync(resolve(ft, 'contexts', 'manifest.json'), 'utf8')) as { round: string }).round : '';
  const name = `r16-${adapter}-s7`;
  process.env.R16_FAKE_CAPTURE = capture;
  const w = new R15Worker({ trainingRoot: ft, adapter: name, python: resolve(ROOT, 'scripts', 'lib', 'r16-fake-scorer.mjs') }, { scoreMs: 5000, startupMs: 20000 });
  try {
    await w.start();
    for (const r of rows) await w.score([{ adapter: name, packet: r.packet }]);
  } finally { await w.close(); delete process.env.R16_FAKE_CAPTURE; }
  const lines = readFileSync(capture, 'utf8').split('\n').filter(Boolean), warm = JSON.parse(lines[0]) as { warmup: unknown }, sent = lines.slice(1).map(l => JSON.parse(l) as { batch: { packet: unknown }[] });
  const dev0 = readJsonl<R16Row>(resolve(ft, 'contexts', 'dev.jsonl'))[0];
  let equalRow = 0, equalRender = 0;
  sent.forEach((s, i) => { const text = JSON.stringify(s.batch[0].packet); if (text === JSON.stringify(rows[i].packet)) equalRow++; if (text === JSON.stringify(r15Packet(rows[i].context))) equalRender++; });
  const result = { rows: rows.length, sent: sent.length, equalToTheRowsPacket: equalRow, equalToTheRenderedPacket: equalRender, warmupEqualsTheFirstDevRow: JSON.stringify(warm.warmup) === JSON.stringify(r15Packet(dev0.context)),
    holds: sent.length === rows.length && equalRow === rows.length && equalRender === rows.length && JSON.stringify(warm.warmup) === JSON.stringify(r15Packet(dev0.context)) };
  writeAtomic(resolve(out, 'packets.json'), JSON.stringify(result, null, 1) + '\n');
  console.log(JSON.stringify(result));
  return result.holds ? 0 : 1;
}

function runCli(args: string[], env: NodeJS.ProcessEnv = {}) { return spawnSync(NODE, [TSX, resolve(ROOT, 'scripts', 'r16-population.ts'), ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } }); }
async function killResume(out: string): Promise<number> {
  const a = resolve(out, 'uninterrupted'), b = resolve(out, 'killed');
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const base = ['run', '--seed', '48', '--days', '2', '--arm', 'fake', '--burn-in', '1'];
  const ra = runCli([...base, '--label', 'dry-kr-a', '--out', a]);
  if (ra.status !== 0) { console.error(ra.stdout, ra.stderr); return 1; }
  // the killed run: SIGKILL to its whole process group (tsx runs the script in a child) once its second day's journal holds some calls
  const child = spawn(NODE, [TSX, resolve(ROOT, 'scripts', 'r16-population.ts'), ...base, '--label', 'dry-kr-b', '--out', b], { cwd: ROOT, stdio: 'ignore', detached: true });
  const journal2 = resolve(b, 'journal', 'd002.jsonl');
  const t0 = Date.now();
  while (Date.now() - t0 < 300_000) {
    await new Promise(r => setTimeout(r, 200));
    if (existsSync(journal2) && readFileSync(journal2, 'utf8').split('\n').filter(Boolean).length > 500) break;
  }
  // a second process on the same run folder is refused while the first lives
  const twin = runCli([...base, '--label', 'dry-kr-b', '--out', b]);
  const exited = new Promise(r => child.once('exit', r));
  process.kill(-child.pid!, 'SIGKILL');
  await exited;
  const killedState = readRegistry16(b).state, killedDays = readRegistry16(b).days.length;
  const rb = runCli([...base, '--label', 'dry-kr-b', '--out', b]);
  if (rb.status !== 0) { console.error(rb.stdout, rb.stderr); return 1; }
  const A = readRegistry16(a), B = readRegistry16(b);
  const la = readReceipts16(a, 2).map(comparable16), lb = readReceipts16(b, 2).map(comparable16);
  const replay = runCli(['replay', b]);
  const result = { killedWhile: killedState, daysOnFileWhenKilled: killedDays, segments: B.segments.map(s => ({ fromDay: s.fromDay, journalCalls: s.journalCalls, setAside: s.setAside.length })),
    twinRefused: twin.status === 2 && /still alive/.test(twin.stderr + twin.stdout), hashes: { uninterrupted: A.days.map(d => d.hash), resumed: B.days.map(d => d.hash) }, receiptsEqual: la.length === lb.length && la.every((l, i) => l === lb[i]), reusedOnResume: B.days[1]?.reused ?? 0,
    replay: replay.status === 0, holds: false };
  result.holds = A.days.map(d => d.hash).join() === B.days.map(d => d.hash).join() && result.receiptsEqual && (B.segments[1]?.journalCalls ?? 0) > 0 && result.replay && result.twinRefused;
  writeAtomic(resolve(out, 'kill-resume.json'), JSON.stringify(result, null, 1) + '\n');
  console.log(JSON.stringify(result));
  return result.holds ? 0 : 1;
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'packets') return packets(resolve(rest[0]), resolve(rest[1]), resolve(rest[2]));
  if (cmd === 'kill-resume') return killResume(resolve(rest[0]));
  console.error('usage: r16-proofs.ts packets FT EVAL OUT | kill-resume OUT'); return 2;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().then(c => { process.exitCode = c; }).catch(e => { console.error(e); process.exitCode = 1; });
