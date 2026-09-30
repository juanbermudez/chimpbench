import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorld, tickWorld } from '../src/simulation';
import { drawIndex, drawUniform, rulesProbs, softmax, uniform, utilityProbs } from '../src/decide/policies';
import { buildFacts } from '../src/decide/facts';
import { buildRequest } from '../src/decision';
import { bandDistance, endpoint, ENDPOINT_ROWS, rowKey, runArm, runSeed, worldHash, type ArmResult, type SeedJob } from '../scripts/lib/jev-arm';
import { calibrate, medianTop, refusePaidArms } from '../scripts/jev-test';

const tiny: SeedJob = { seed: 6301, arms: ['R', 'RG', 'U', 'X'], profile: 'compressed', burnInDays: 0.25, warmupDays: 0.05, scoredDays: 0.3 };
const strip = (a: ArmResult) => ({ ...a, wallMs: 0 });

test('band distance: 0 inside, else the gap to the nearest edge over the band width', () => {
  const b = { lo: 0.33, hi: 0.5 };
  assert.equal(bandDistance(0.4, b), 0);
  assert.equal(bandDistance(0.33, b), 0);
  assert.ok(Math.abs(bandDistance(0.25, b) - 0.08 / 0.17) < 1e-12);
  assert.ok(Math.abs(bandDistance(0.6, b) - 0.1 / 0.17) < 1e-12);
  assert.equal(ENDPOINT_ROWS.length, 9);
  assert.deepEqual(ENDPOINT_ROWS.map(rowKey), ['T-ACT-1 male', 'T-ACT-1 female', 'T-ACT-2 male', 'T-ACT-2 female', 'T-ACT-3 male', 'T-ACT-3 female', 'T-ACT-4', 'T-PTY-1', 'T-RNG-4 male']);
  const B = { 'T-ACT-1': b, 'T-ACT-2': { lo: 0.12, hi: 0.25 }, 'T-ACT-3': { lo: 0.08, hi: 0.18 }, 'T-ACT-4': { lo: 0.3, hi: 0.47 }, 'T-PTY-1': { lo: 3, hi: 9 }, 'T-RNG-4': { lo: 1.5, hi: 3.5 } };
  const e = endpoint({ 'T-ACT-1 male': 0.4, 'T-ACT-1 female': 0.6, 'T-ACT-2 male': 0.2, 'T-ACT-2 female': 0.2, 'T-ACT-3 male': 0.1, 'T-ACT-3 female': 0.1, 'T-ACT-4': 0.4, 'T-PTY-1': 12, 'T-RNG-4 male': 1 }, B);
  assert.ok(Math.abs(e.D - (0.1 / 0.17 + 3 / 6 + 0.5 / 2)) < 1e-12);
});

test('paid arms refuse without --paid, an explicit cap and a ledger, and still refuse with them', () => {
  assert.equal(refusePaidArms(['R', 'U'], { paid: false, cap: '', ledger: '' }), '', 'free arms need nothing');
  const none = refusePaidArms(['J1', 'J2'], { paid: false, cap: '', ledger: '' });
  assert.match(none, /--paid/); assert.match(none, /--cap/); assert.match(none, /--ledger/);
  assert.match(refusePaidArms(['J2s'], { paid: true, cap: '0', ledger: '' }), /--cap/, 'a zero cap is no cap');
  const dir = mkdtempSync(join(tmpdir(), 'jev-'));
  const fake = join(dir, 'not-a-ledger.db'); writeFileSync(fake, 'hello');
  assert.match(refusePaidArms(['J1'], { paid: true, cap: '10', ledger: fake }), /not an initialized spend-guard ledger/);
  const ledger = join(dir, 'ledger.db'); writeFileSync(ledger, Buffer.concat([Buffer.from('SQLite format 3\0', 'latin1'), Buffer.alloc(200)]));
  assert.match(refusePaidArms(['J1'], { paid: true, cap: '10', ledger }), /not built in this harness/);
});

test('sampling: reproducible draws from (seed, chimp, version), distributions sum to 1, calibration hits its target', () => {
  assert.equal(drawUniform(6501, 12, 40), drawUniform(6501, 12, 40));
  assert.notEqual(drawUniform(6501, 12, 40), drawUniform(6501, 12, 41));
  assert.equal(drawIndex([0.2, 0.3, 0.5], 0.1), 0); assert.equal(drawIndex([0.2, 0.3, 0.5], 0.49), 1); assert.equal(drawIndex([0.2, 0.3, 0.5], 0.999999), 2);
  const w = createWorld(48);
  for (let i = 0; i < 600; i++) tickWorld(w);
  const rng = w.rng;
  for (const c of w.chimps.filter(k => k.alive && k.age >= 8)) {
    const { options } = buildRequest(w, c);
    if (options.length < 2) continue;
    for (const p of [rulesProbs(options), utilityProbs(buildFacts(w, c, options)), uniform(options.length)]) {
      assert.equal(p.length, options.length);
      assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-9 && p.every(v => v >= 0));
    }
  }
  assert.equal(w.rng, rng, 'policies never touch world.rng');
  const vectors = [[0, 1, 2], [0.5, 0.1, 0.3, 0], [1, 1.2]];
  const T = calibrate(vectors, 0.77);
  assert.ok(Math.abs(medianTop(vectors, T) - 0.77) < 1e-6);
  assert.ok(Math.max(...softmax([0, 1], 0.01)) > 0.999);
});

test('the harness is deterministic, and an arm on a copy of the burned-in world equals the arm on the world itself', () => {
  const a = runSeed(tiny), b = runSeed(tiny);
  assert.equal(a.burnInHash, b.burnInHash);
  assert.deepEqual(a.arms.map(strip), b.arms.map(strip));
  assert.ok(a.arms.find(r => r.arm === 'U')!.decisions > 0, 'U made choices');
  assert.ok(a.arms.find(r => r.arm === 'RG')!.kept.kept! > 0, 'the gate kept intents');
  // runSeed runs every arm on structuredClone(base); running on the original instead must give the same result
  const base = createWorld(tiny.seed, { profile: tiny.profile });
  for (let i = 0; i < tiny.burnInDays * 5760; i++) tickWorld(base);
  const copy = structuredClone(base);
  assert.equal(worldHash(copy), worldHash(base));
  const onCopy = runArm(copy, 'X', tiny), onBase = runArm(base, 'X', tiny);
  assert.deepEqual(strip(onCopy), strip(onBase));
  assert.equal(worldHash(copy), worldHash(base), 'both worlds end identical');
});
