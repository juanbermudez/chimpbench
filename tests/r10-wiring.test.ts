import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { newDecoder, type DecodeRecord, type HarnessDecode } from '../scripts/lib/decoder';
import { decodeWords, nightDecode } from '../scripts/lib/r10-decode';
import { replayRun, replayReport } from '../scripts/lib/r10-read';
import { comparable, DAY, DayFiles, meterStart, MIN_AGE, readCkpt, RECEIPT_SCHEMA, runDay, writeCkpt, writeRegistry, type AskLine, type DaySummary, type Engine, type Line, type Registry, type Row } from '../scripts/lib/r10-run';
import { resultName } from '../scripts/r10-night';
import { ARMS, armWorld } from '../scripts/r5-pilot';
import { drawAt, heldAt } from '../src/kernel/decode';
import { nullKernel } from '../src/kernel/kernels';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';

// The wiring of the stages merged on 11 October 2026, on a short night with no model on the small map (the working base
// and the packet switches of the gate test, seed 48, the second morning; the arm `null-gate`: the null kernel, even
// odds, with the loop's gate on):
//   - scripts/r10-night.ts decodes through stage R9's decoder (scripts/lib/decoder.ts) in all three modes, logs R9's
//     record on every receipt, checkpoints the decoder's notes, and its replay reproduces the run;
//   - stage R7's "who decided" ledger (scripts/lib/who-decided.ts) reads the night's log;
//   - the replay reads stage R7's timing card through the tap hook.
const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>, observeV4: 1, menuParity: 1 };
let cached: World | null = null;
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'compressed', params }); for (let i = 0; i < DAY + 240; i++) tickWorld(cached); } return cached; };
const tmp = mkdtempSync(join(tmpdir(), 'r10-wiring-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const ARM = 'null-gate';
const start = (): Engine => { const world = armWorld(base(), ARMS[ARM]); return { world, day: 0, meter: meterStart(world) }; };
const asksOf = (lines: Line[]) => lines.filter((l): l is AskLine => l.k === 'ask');

function registry(startHash: string, days: DaySummary[], decodeSpec: HarnessDecode | null): Registry {
  const spec = ARMS[ARM];
  return { tool: 'r10-night', version: 1, receiptSchema: RECEIPT_SCHEMA, label: `${ARM}-${decodeSpec?.mode ?? 'none'}`, created: '', updated: '', state: 'done', ended: '', root: '', commit: 'test', branch: 'test', dirty: false, node: process.version, host: '', command: '',
    seed: 48, seedRole: 'test', profile: 'compressed', burnInDays: 0, daysAsked: days.length, hours: null, paramsFile: 'M6-W50.json', paramsSha256: '', params, switches: { observeV4: 1, menuParity: 1, kernelGate: spec.gate ?? 0, kernelNoRulesPick: spec.noPick ?? 0 },
    arm: ARM, kernel: spec.kernel, adapter: null, decode: decodeWords(decodeSpec), decodeSpec, packet: 'r4-state-1', name: resultName(spec.kernel, null), minAge: MIN_AGE, under: '', burnInHash: '', startHash, worker: null, env: {},
    machine: { load: [], swapUsedMB: null, freeGB: 0, freeWhere: '' }, contexts: false, timeoutS: 120, stopCheckOn: true, segments: [], days, stopCheck: null, events: [] };
}

/** One whole day of the arm with a decode setting, written to a run folder as the script writes one. */
interface Night { dir: string; lines: Line[]; rows: Row[]; day: DaySummary; reg: Registry; t0: number }
const nights = new Map<string, Promise<Night>>();
function night(spec: HarnessDecode | null): Promise<Night> {
  const name = spec ? `${spec.mode}-${spec.hold}-${spec.salt}` : 'none';
  if (!nights.has(name)) nights.set(name, (async () => {
    const dir = resolve(tmp, name), e = start(), t0 = e.world.time, files = new DayFiles(dir, 1, false, false), lines: Line[] = [];
    const startHash = writeCkpt(resolve(dir, 'ckpt', 'start.json.gz'), e).hash;
    const r = await runDay(e, nullKernel, { decoder: spec ? newDecoder(spec) : undefined, sink: { lines: l => { lines.push(...l); files.lines(l); }, arrival: a => files.arrival(a) } });
    files.close(r.rows);
    const reg = registry(startHash, [r.summary], spec);
    writeRegistry(dir, reg);
    return { dir, lines, rows: r.rows, day: r.summary, reg, t0 };
  })());
  return nights.get(name)!;
}
const TOP = nightDecode('top'), DRAW = nightDecode('draw'), HELD = nightDecode('held');

test('a night runs in each of the three modes through stage R9\'s decoder, logs its record on every ask, and replays exactly', async () => {
  const none = await night(null), hashes: Record<string, string> = { none: none.day.hash };
  assert.ok(asksOf(none.lines).every(l => l.dec === undefined && (l.by !== 'kernel' || l.picked === l.index)), 'without a decode step the kernel\'s own pick is applied and nothing is logged for it');
  for (const spec of [TOP, DRAW, HELD]) {
    const n = await night(spec), asks = asksOf(n.lines), settled = asks.filter(l => l.by === 'kernel');
    assert.ok(settled.length > 800, `${spec.mode}: ${settled.length} asks the kernel settled`);
    for (const l of settled) {
      const d = l.dec as DecodeRecord;
      assert.deepEqual(Object.keys(d).filter(k => k !== 'also').sort(), ['epoch', 'hold', 'index', 'kernel', 'mode', 'open', 'prev', 'salt', ...(spec.mode === 'draw' ? ['u'] : spec.mode === 'held' ? ['g'] : [])].sort(), 'the fields the arms of stage R9 log');
      assert.deepEqual([d.mode, d.salt, d.hold], [spec.mode, spec.salt, spec.hold]);
      assert.equal(d.kernel, l.index, 'the receipt\'s index is the kernel\'s own pick'); assert.equal(d.index, l.picked, 'and picked is the option the decode applied');
      // the applied option is what the logged draw or noise gives on the logged probabilities: the receipt is enough to decode again
      if (spec.mode === 'top') assert.equal(l.picked, l.index);
      else if (spec.mode === 'draw') assert.equal(drawAt(l.p!, d.u!), l.picked);
      else { assert.equal(d.g!.length, l.n); assert.equal(heldAt(l.p!, d.g!), l.picked); }
    }
    // an ask the rules settled after the kernel answered still carries the decode's record; one that never reached the kernel carries none
    assert.ok(asks.filter(l => l.by === 'rules' && l.dec === undefined).every(l => l.index === null || l.refusal === 'kernel-error' || l.refusal === 'invalid-answer'));
    const rep = await replayRun(n.dir, { field: false });
    assert.ok(rep.ok, `${spec.mode}: ${JSON.stringify({ ...rep, rows: undefined, summaries: undefined, taps: undefined })}`);
    assert.deepEqual([rep.missing, rep.menuDiffers, rep.linesDiffer, rep.rowsDiffer, rep.hashes[0].replay], [0, 0, 0, 0, n.day.hash], `${spec.mode}: every receipt line comes out again, the decode's record with it`);
    assert.match(replayReport(n.reg, rep), spec.mode === 'top' ? /decode: top \(the kernel's own pick\)/ : spec.mode === 'draw' ? /decode: draw \(one seeded draw per ask, salt 1\)/ : /decode: held \(a draw held for the act, salt 1\)/);
    hashes[spec.mode] = n.day.hash;
  }
  assert.equal(hashes.top, hashes.none, 'the top pick through the decoder is the run with no decode step');
  assert.equal(new Set([hashes.top, hashes.draw, hashes.held]).size, 3, 'a draw and a held draw are other worlds');
  // the top pick's lines are the plain run's but for the decode's record
  const strip = (l: Line) => { const { dec: _dec, ...rest } = l as AskLine; return comparable(rest as Line); };
  assert.deepEqual((await night(TOP)).lines.map(strip), none.lines.map(strip));
  const draw = asksOf((await night(DRAW)).lines).filter(l => l.by === 'kernel'), held = asksOf((await night(HELD)).lines).filter(l => l.by === 'kernel');
  assert.ok(draw.filter(l => l.picked !== l.index).length > draw.length / 3, 'with even odds a draw mostly leaves the kernel\'s own pick');
  // inside an epoch a held draw keeps its noise: the option applied last, still on the menu, wins again unless the menu brought a better-placed rival
  const re = held.filter(l => l.dec!.open === '' && (l.dec!.prev ?? -1) >= 0);
  assert.ok(re.length > 20 && re.filter(l => l.picked === l.dec!.prev).length > re.length * 0.6, `${re.filter(l => l.picked === l.dec!.prev).length} of ${re.length} re-asks inside an epoch kept the held option`);
  assert.ok(held.some(l => l.dec!.open === 'interrupt') && held.some(l => l.dec!.open === 'first'));
  // a replay with another setting than the run's is caught: the registry's setting is what reproduces it
  const wrong = await night(DRAW);
  writeRegistry(wrong.dir, { ...wrong.reg, decodeSpec: nightDecode('draw', 2) });
  const bent = await replayRun(wrong.dir, { field: false });
  writeRegistry(wrong.dir, wrong.reg);
  assert.equal(bent.ok, false); assert.ok(bent.linesDiffer > 0);
});

test('a held night stopped at a day\'s end and resumed from its checkpoint is the uninterrupted night; without the decoder\'s notes it is not', async () => {
  const T = 1200, spec = nightDecode('held', 1, 'act');
  const run = async (how: 'whole' | 'resumed' | 'notes-lost') => {
    let e = start(), dec = newDecoder(spec);
    const lines: Line[] = [], hashes: string[] = [];
    for (let d = 1; d <= 2; d++) {
      hashes.push((await runDay(e, nullKernel, { ticks: T, decoder: dec, sink: { lines: l => { lines.push(...l); } } })).summary.hash);
      if (d === 1 && how !== 'whole') {
        const file = resolve(tmp, 'ck', `${how}.json.gz`);
        writeCkpt(file, e);
        const back = readCkpt(file);
        assert.ok(back.dec && Object.keys(back.dec).length > 10, 'the checkpoint holds the decoder\'s notes');
        e = { world: back.world, day: back.day, meter: back.meter, dec: back.dec };
        dec = newDecoder(spec, how === 'resumed' ? e.dec : undefined);
      }
    }
    return { lines: lines.map(comparable), hashes };
  };
  const whole = await run('whole'), resumed = await run('resumed'), lost = await run('notes-lost');
  assert.deepEqual(resumed, whole, 'through the checkpoint: the same worlds and the same receipts, each ask\'s record included');
  assert.equal(lost.hashes[0], whole.hashes[0]);
  assert.notDeepEqual(lost.lines, whole.lines, 'a resume that drops the notes opens every epoch again (the check can fail)');
});

test('held is refused together with the kinds-first menu, by the engine and from the command line; the rules arm has nothing to decode', async () => {
  const world = armWorld(createWorld(48, { profile: 'compressed', params: { ...params, activityFirst: 1 } }), ARMS[ARM]);
  await assert.rejects(runDay({ world, day: 0, meter: meterStart(world) }, nullKernel, { ticks: 5, decoder: newDecoder(HELD) }), /decode "held" cannot run with the kinds-first menu \(activityFirst 1\)/);
  // a draw is one draw per request, so it runs there (one request per decision)
  const w2 = armWorld(createWorld(48, { profile: 'compressed', params: { ...params, activityFirst: 1 } }), ARMS[ARM]);
  assert.ok((await runDay({ world: w2, day: 0, meter: meterStart(w2) }, nullKernel, { ticks: 5, decoder: newDecoder(DRAW) })).summary.hash.length > 0);
  const script = resolve('scripts/r10-night.ts'), cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', script, ...args], { encoding: 'utf8', timeout: 240_000 });
  const kinds = resolve(tmp, 'kinds-first.json');
  writeFileSync(kinds, JSON.stringify({ ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>, activityFirst: 1 }));
  const common = ['run', '--profile', 'compressed', '--burn-in', '0', '--seed', '48', '--days', '1', '--allow-dirty', '--burnin-dir', resolve(tmp, 'burnin')];
  const refused = cli(...common, '--arm', ARM, '--decode', 'held', '--params-file', kinds, '--out', resolve(tmp, 'refused'));
  assert.equal(refused.status, 2, `${refused.stdout}${refused.stderr}`); assert.match(refused.stderr, /refused: decode "held" cannot run with the kinds-first menu \(activityFirst 1\)/);
  assert.ok(!existsSync(resolve(tmp, 'refused', 'run.json')), 'nothing is written');
  const rules = cli(...common, '--arm', 'rules', '--decode', 'draw', '--out', resolve(tmp, 'refused-rules'));
  assert.equal(rules.status, 2); assert.match(rules.stderr, /the rules arm has no kernel answer to decode/);
  const unknown = cli(...common, '--arm', ARM, '--decode', 'warm', '--out', resolve(tmp, 'refused-mode'));
  assert.equal(unknown.status, 2); assert.match(unknown.stderr, /unknown decode mode "warm"/);
});
