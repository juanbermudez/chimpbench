// e-bench's single pass (track E, parts E1 and E2): the observed loop of scripts/lib/bench-run.ts is runFieldJob's
// (src/field/run.ts), the readouts never move the world, and a run continued from a checkpoint is the uninterrupted run.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFieldJob, type FieldResult } from '../src/field/run';
import { recordsHash } from '../src/field/records';
import { runBenchSeed, ResumeRefused, type BenchJob, type BenchPart, type RunState } from '../scripts/lib/bench-run';
import { readCheckpoint, restoreColumns } from '../scripts/lib/checkpoint';
import { energyReport, mergeEnergy } from '../scripts/lib/energy-probe';
import { decodeLossless, encodeLossless } from '../scripts/lib/lossless-json';

// a stack with the energy ledger, rhythm, endocrine and belief switches on, so every readout and most hidden state is live
const STACK = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1,
  endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, waterLedger: 1,
  choiceBelief: 2, tripBeliefs: 3, walkGait: 1, crownMove: 1 };
// 1.5 h of burn-in, then 10.5 h observed from 08:00 (field experiments at 10:00: experimentEveryDays 1 runs them on day 0)
const BURN = 360 / 5760, DAYS = 2520 / 5760, MID = 720 / 5760, END = BURN + DAYS;
const job = (over: Partial<BenchJob> = {}): BenchJob => ({ seed: 48, profile: 'field', params: STACK, burnInDays: BURN, days: DAYS, observerSeed: 1, experimentEveryDays: 1, truth: true,
  energy: true, rhythm: true, checkpointDays: [], stopDay: null, checkpointPrefix: null, resume: null, identity: { code: 'test' }, ...over });
const part = (r: ReturnType<typeof runBenchSeed>): BenchPart => { assert.equal(r.kind, 'part'); return (r as { part: BenchPart }).part; };
/** A FieldResult without its clocks. */
const fieldOf = (f: FieldResult) => ({ ...f, wallMs: 0, simMs: 0, observerMs: 0, experimentMs: 0, metricsMs: 0 });
/** A part without what differs between an uninterrupted and a continued run (clocks, checkpoint bookkeeping). */
const partOf = (p: BenchPart) => ({ ...p, field: fieldOf(p.field), viability: { ...p.viability, wallMs: 0 }, timing: null, resumedFrom: null, checkpoints: null });

test('lossless JSON keeps NaN, ±Infinity, −0, Sets and Maps (part files)', () => {
  const v = { a: NaN, b: [Infinity, -Infinity, -0, 0, 1.5], c: new Set([3, 1]), d: new Map([[2, 'x']]), e: null, f: { g: [null, NaN] } };
  const back = decodeLossless<typeof v>(encodeLossless(v));
  assert.ok(Number.isNaN(back.a));
  assert.deepEqual(back.b.map(x => Object.is(x, -0) ? '-0' : x), [Infinity, -Infinity, '-0', 0, 1.5]);
  assert.deepEqual([...back.c], [3, 1]);
  assert.deepEqual([...back.d], [[2, 'x']]);
  assert.equal(back.e, null);
  assert.ok(Number.isNaN(back.f.g[1]) && back.f.g[0] === null);
});

test('single pass: the observed loop gives runFieldJob\'s FieldResult, readouts on (seed 48, field, with field experiments)', () => {
  const ref = runFieldJob({ seed: 48, days: DAYS, profile: 'field', params: STACK, burnInDays: BURN, observerSeed: 1, experimentEveryDays: 1, truth: true });
  const p = part(runBenchSeed(job()));
  assert.ok(ref.counts.experiments > 0, 'the window holds field experiments');
  assert.deepStrictEqual(fieldOf(p.field), fieldOf(ref));
  assert.ok(p.energy && p.energy.acc['adult male'].ticks > 0 && p.rhythm && p.rhythm.hourly.flat().some(n => n > 0), 'the energy and rhythm readouts ran');
});

test('checkpoints: a run stopped and continued is the uninterrupted run (world, observers, readouts, part)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ebench-ckpt-'));
  try {
    const whole = part(runBenchSeed(job({ checkpointDays: [MID, END], checkpointPrefix: join(dir, 'whole') })));
    const stop = runBenchSeed(job({ stopDay: MID, checkpointPrefix: join(dir, 'split') }));
    assert.equal(stop.kind, 'stopped');
    const cont = part(runBenchSeed(job({ resume: join(dir, `split.ckpt-d${MID}.v8.gz`), checkpointDays: [END], checkpointPrefix: join(dir, 'cont') })));
    assert.deepStrictEqual(partOf(cont), partOf(whole));
    // the run states at the end: the world deep-equal, the observers' records identical
    const a = readCheckpoint<RunState>(join(dir, `whole.ckpt-d${END}.v8.gz`)).state, b = readCheckpoint<RunState>(join(dir, `cont.ckpt-d${END}.v8.gz`)).state;
    assert.equal(a.done, Math.round(END * 5760));
    assert.deepStrictEqual(b.world, a.world);
    for (const k of ['obs', 'pobs', 'mobs'] as const) { restoreColumns(a[k]); restoreColumns(b[k]); assert.equal(recordsHash(b[k]!.rec), recordsHash(a[k]!.rec), k); }
    assert.deepStrictEqual(b.en!.acc, a.en!.acc);
    assert.deepStrictEqual(b.rh, a.rh);
    // a checkpoint from other settings is refused
    assert.throws(() => runBenchSeed(job({ params: { ...STACK, walkGait: 0 }, resume: join(dir, `split.ckpt-d${MID}.v8.gz`) })), ResumeRefused);
    // pooling one seed changes nothing, and the part's lossless JSON keeps the energy report bit for bit
    const meta = { profile: 'field', seeds: [48], burnIn: BURN, days: DAYS, params: STACK, termBirths: false };
    const direct = energyReport(whole.energy!, meta).json, pooled = energyReport(mergeEnergy([decodeLossless<BenchPart>(encodeLossless(whole)).energy!]), meta).json;
    assert.equal(JSON.stringify(pooled), JSON.stringify(direct));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('ladder: a shorter run\'s end checkpoint, extended to a longer horizon, is the longer run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ebench-ladder-'));
  try {
    const SHORT = 1080 / 5760, cut = BURN + SHORT;
    part(runBenchSeed(job({ days: SHORT, checkpointDays: [cut], checkpointPrefix: join(dir, 'short') })));
    const ext = part(runBenchSeed(job({ resume: join(dir, `short.ckpt-d${cut}.v8.gz`) })));
    const whole = part(runBenchSeed(job()));
    assert.equal(ext.config.days, DAYS);
    assert.deepStrictEqual(partOf(ext), partOf(whole));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
