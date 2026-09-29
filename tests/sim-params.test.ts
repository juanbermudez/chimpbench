import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GEN_PATH, ROOT, generate, lintSim, loadRegistry, validateRegistry } from '../scripts/gen-params';
import { applyIntervention, createWorld, tickWorld } from '../src/simulation';
import { DEFAULTS, HARD_RANGES, INTEGER_IDS, PROFILE_VALUES, REGISTRY_HASH, type ParamId } from '../src/sim/params.gen';
import { paramsOf, resolveParams, traceParamReads, type Overrides } from '../src/sim/params';
import { simOf } from '../src/sim/state';
import { createObserver, observerStep } from '../src/field/observer';
import { GOLDEN_CASES, caseKey, fnv, runCase, worldHash } from './fixtures/golden';

const reg = loadRegistry();
const targets = JSON.parse(readFileSync(join(ROOT, 'data/targets.json'), 'utf8')) as { sources: Record<string, unknown>; parameterConstraints: { id: string; sources: string[] }[] };
const live = reg.params.filter(p => !p.planned);

test('the registry is valid, and every parameter constraint (P-*) is attached to one entry with its sources and a range', () => {
  assert.deepEqual(validateRegistry(reg, new Set(Object.keys(targets.sources)), new Set(targets.parameterConstraints.map(c => c.id))), []);
  for (const c of targets.parameterConstraints) {
    const e = reg.params.find(p => p.constraints?.includes(c.id))!;
    for (const s of c.sources) assert.ok(e.sources.includes(s), `${c.id} → ${e.id} lacks source ${s}`);
    assert.ok(e.range[0] <= e.range[1]);
  }
  assert.ok(live.length > 450, `${live.length} live parameters`);
});

test('src/sim/params.gen.ts is generated from data/params.json (no drift)', () => {
  assert.equal(readFileSync(GEN_PATH, 'utf8'), generate(reg));
  assert.equal(Object.keys(DEFAULTS).length, live.length);
});

test('lint: no evidence-tagged numeric literal in src/sim outside the registry, and the lint catches one', () => {
  assert.deepEqual(lintSim().map(h => `${h.file}:${h.line} [${h.literals.join(', ')}]`), []);
  const dir = mkdtempSync(join(tmpdir(), 'mgogo-lint-'));
  writeFileSync(join(dir, 'x.ts'), '// feeding competition [H]\nconst crowd = n * 0.37;\nconst ok = 1; // design\nconst age = c.age >= 15; // [M] stage boundary\n'
    + 'const a = n * 0.21; // [M/H]\nconst b = n * 0.33; // [L–M]\nconst e = n * 0.44; // stylization of a field value\n');
  const hits = lintSim(dir);
  assert.deepEqual(hits.map(h => h.literals.join()), ['0.37', '0.21', '0.33', '0.44']);
});

test('every live registry id is read by the simulation (overridable ones through resolved parameters) and named in simulation.md §17, and every §17 row resolves to registry ids', () => {
  const code = readdirSync(join(ROOT, 'src/sim')).filter(f => f.endsWith('.ts') && !f.endsWith('.gen.ts')).map(f => readFileSync(join(ROOT, `src/sim/${f}`), 'utf8')).join('\n');
  // an overridable entry must be read through a world's resolved parameters; DEFAULTS.x would ignore overrides
  const fixed = (id: string) => HARD_RANGES[id as ParamId][0] === HARD_RANGES[id as ParamId][1];
  // (a quoted id is a key of a table indexed into P, like the bout lengths; no table is indexed into DEFAULTS)
  assert.ok(!/DEFAULTS\[/.test(code), 'a string-keyed read of DEFAULTS');
  const unread = live.filter(p => !new RegExp(`(?:P0?|base|curP|paramsOf\\(\\w+\\)${fixed(p.id) ? '|DEFAULTS' : ''})\\.${p.id}\\b|'${p.id}'`).test(code)).map(p => p.id);
  assert.deepEqual(unread, [], 'registry entries never read through resolved parameters');
  const doc = readFileSync(join(ROOT, 'docs/simulation.md'), 'utf8');
  const sec = doc.slice(doc.indexOf('## 17. Parameter table'), doc.indexOf('## 18. Validation'));
  const rows = sec.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Parameter') && !l.startsWith('| ---'));
  assert.ok(rows.length >= 120, `${rows.length} rows`);
  const ids = live.map(p => p.id), named = new Set<string>();
  const glob = (t: string) => new RegExp(`^${t.replace(/\*/g, '.*')}$`);
  for (const row of rows) {
    const tokens = [...row.split('|')[4].matchAll(/`([^`]+)`/g)].map(m => m[1]);
    assert.ok(tokens.length > 0, `row without registry ids: ${row.slice(0, 60)}`);
    for (const t of tokens) {
      const hit = ids.filter(i => glob(t).test(i));
      assert.ok(hit.length > 0, `unknown registry id ${t}`);
      hit.forEach(i => named.add(i));
    }
  }
  assert.deepEqual(ids.filter(i => !named.has(i)), [], 'registry ids missing from §17');
});

test('no default copies: nothing outside the registry module reads an overridable default, and no function falls back to one', () => {
  const walk = (dir: string): string[] => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.(ts|mjs)$/.test(d.name) ? [`${dir}/${d.name}`] : []);
  const files = [...walk('src'), ...walk('scripts')].filter(f => !['src/sim/params.ts', 'src/sim/params.gen.ts', 'scripts/gen-params.ts'].includes(f));
  const overridable = new Set((Object.keys(DEFAULTS) as ParamId[]).filter(id => HARD_RANGES[id][0] !== HARD_RANGES[id][1]));
  const hits: string[] = [];
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    for (const m of text.matchAll(/\bDEFAULTS\.(\w+)/g)) if (overridable.has(m[1] as ParamId)) hits.push(`${f}: DEFAULTS.${m[1]}`);
    if (/\bDEFAULT_PARAMS\b/.test(text)) hits.push(`${f}: DEFAULT_PARAMS`);
    if (/:\s*Params\s*=/.test(text)) hits.push(`${f}: a Params argument with a default`);
  }
  assert.deepEqual(hits, [], 'a copy of a default ignores the world\'s overrides and profile; read paramsOf(world)');
});

test('the field observer reads the world\'s own rain rate (the C4 review bypass)', () => {
  const run = (params: Overrides) => {
    const w = createWorld(7, { params });
    const o = createObserver(w, { truth: false });
    applyIntervention(w, 'storm', { troopId: 1 });
    for (let i = 0; i < 1200; i++) { tickWorld(w); observerStep(o, w); }
    return { obs: o.rec.weather.rainMm, sim: simOf(w).weather.rainMm };
  };
  const a = run({}), b = run({ rainMmPerH: 60 });
  assert.ok(a.obs > 1, `${a.obs} mm observed`);
  assert.ok(Math.abs(b.sim / a.sim - 2) < 1e-9, 'the simulation doubles its rain');
  assert.ok(Math.abs(b.obs / a.obs - 2) < 1e-9, 'and so does the observer');
});

test('golden world hashes are identical to those recorded before the registry (seeds 48, 7, 21; ageRate 1 and 365)', () => {
  const want = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/golden-world.json'), 'utf8')).hashes as Record<string, string>;
  for (const c of GOLDEN_CASES) assert.equal(worldHash(runCase(c)), want[caseKey(c)], caseKey(c));
});

/** +10% (or -10% at the hard ceiling; one step for whole numbers). */
function bumped(id: ParamId): number {
  const v = DEFAULTS[id], [lo, hi] = HARD_RANGES[id], int = INTEGER_IDS.includes(id);
  const up = int ? (Math.round(v * 1.1) === v ? v + 1 : Math.round(v * 1.1)) : v * 1.1;
  const down = int ? (Math.round(v * 0.9) === v ? v - 1 : Math.round(v * 0.9)) : v * 0.9;
  return v === 0 ? lo + (hi - lo) * 0.1 : up <= hi ? up : down;
}
/** Override values, weakest first: +10% (the design's step), then the plausible-range ends, then the hard-range ends
 *  (an unbounded ceiling is capped at 10x). Rare-event rates and thresholds cannot flip a draw within days at +10%. */
function ladder(id: ParamId): number[] {
  const v = DEFAULTS[id], [lo, hi] = HARD_RANGES[id], [rlo, rhi] = reg.params.find(p => p.id === id)!.range;
  const farFirst = (a: number, b: number) => (Math.abs(b - v) > Math.abs(v - a) ? [b, a] : [a, b]);
  const int = INTEGER_IDS.includes(id);
  const all = [bumped(id), ...farFirst(rlo, rhi), ...farFirst(lo, Math.min(hi, 10 * Math.max(Math.abs(v), 1)))].map(x => (int ? Math.round(x) : x));
  return all.filter((x, i) => x !== v && x >= lo && x <= hi && all.indexOf(x) === i);
}
/** The wiring scenario, natural arm: a day, every field experiment on community 1, another day. */
function natural(params: Overrides, trace?: Set<string>): string {
  const w = createWorld(48, { params });
  if (trace) traceParamReads(w, trace);
  for (let i = 0; i < 5760; i++) tickWorld(w);
  for (const k of ['playback-stranger', 'snake-model', 'fig-mast', 'colobus-troop', 'storm', 'drought', 'remove-alpha'] as const) applyIntervention(w, k, { troopId: 1 });
  for (let i = 0; i < 5760; i++) tickWorld(w);
  return worldHash(w);
}
/** The wiring scenario, life-course arm: three days at ageRate 365 (three years of life history). */
function lifeCourse(params: Overrides, trace?: Set<string>): string {
  const w = createWorld(48, { params });
  w.ageRate = 365;
  if (trace) traceParamReads(w, trace);
  for (let i = 0; i < 3 * 5760; i++) tickWorld(w);
  return worldHash(w);
}

test('wiring: overrides of 10 parameters chosen by a fixed hash change the world (+10% first, then range ends)', t => {
  const read = new Set<string>();
  const base = [natural({}, read), lifeCourse({}, read)];
  // the frame: overridable entries the scenario reads after creation (an entry it never reads cannot change it)
  const pool = (Object.keys(DEFAULTS) as ParamId[]).filter(id => HARD_RANGES[id][0] !== HARD_RANGES[id][1] && read.has(id));
  assert.ok(pool.length > 350, `${pool.length} entries read`);
  const picked = pool.map(id => ({ id, h: fnv(`c4-wiring:${id}`) })).sort((a, b) => (a.h < b.h ? -1 : 1)).slice(0, 10).map(p => p.id);
  const steps: string[] = [];
  for (const id of picked) {
    const values = ladder(id);
    const hit = values.findIndex(v => natural({ [id]: v }) !== base[0] || lifeCourse({ [id]: v }) !== base[1]);
    assert.ok(hit >= 0, `${id}: no override in [${values.join(', ')}] changed the world`);
    steps.push(`${id}=${values[hit]}${hit === 0 ? ' (+10%)' : ''}`);
  }
  t.diagnostic(steps.join(', '));
});

test('a traced world is unchanged by tracing', () => {
  const read = new Set<string>();
  const a = createWorld(7), b = createWorld(7);
  traceParamReads(b, read);
  for (let i = 0; i < 400; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(b), worldHash(a));
  assert.ok(read.has('walkMps') && read.size > 100);
});

test('createWorld stores the profile and overrides as small plain data and rejects unknown ids, hard-range violations and unknown profiles', () => {
  const w = createWorld(7, { params: { walkMps: 0.05, popCap: 80 } });
  assert.deepEqual(simOf(w).params, { registry: REGISTRY_HASH, profile: 'compressed', overrides: { popCap: 80, walkMps: 0.05 } });
  assert.equal(paramsOf(w).walkMps, 0.05);
  assert.equal(paramsOf(w).sightDayM, DEFAULTS.sightDayM);
  assert.ok(JSON.stringify(simOf(w).params).length < 200, 'settings stay small');
  assert.deepEqual(simOf(createWorld(7)).params.overrides, {});
  assert.throws(() => createWorld(7, { params: { notAParameter: 1 } as never }), /Unknown parameter/);
  assert.throws(() => createWorld(7, { params: { hitP: 1.5 } }), /outside its hard range/);
  assert.throws(() => createWorld(7, { params: { walkMps: -1 } }), /outside its hard range/);
  assert.throws(() => createWorld(7, { params: { tickSeconds: 20 } }), /outside its hard range/, 'the tick length is fixed');
  assert.throws(() => createWorld(7, { params: { attentionN: 12.5 } }), /whole number/);
  assert.throws(() => createWorld(7, { params: { walkMps: Number.NaN } }), /finite/);
  assert.throws(() => createWorld(7, { profile: 'wide' as never }), /Unknown profile/);
  assert.equal(simOf(createWorld(7, { profile: 'field' })).params.profile, 'field');
});

test('overrides are deterministic, survive a JSON round trip, and profiles resolve their values', () => {
  const run = () => { const w = createWorld(21, { params: { tensionHalfLifeDays: 10, huntDayPerMale: 0.01 } }); for (let i = 0; i < 2000; i++) tickWorld(w); return w; };
  const a = run(), b = run();
  assert.deepEqual(a, b);
  const copy = JSON.parse(JSON.stringify(a));
  assert.equal(paramsOf(copy).tensionHalfLifeDays, 10);
  assert.equal(paramsOf(copy).tensionDailyDecay, Math.pow(0.5, 1 / 10));
  for (let i = 0; i < 500; i++) { tickWorld(a); tickWorld(copy); }
  assert.equal(worldHash(copy), worldHash(a), 'a saved world resumes with its parameters');
  const field = resolveParams('field');
  for (const [id, v] of Object.entries(PROFILE_VALUES.field)) assert.equal(field[id as ParamId], v);
  assert.equal(field.sightDayM, 35); assert.equal(field.partyLinkM, 50);
  assert.equal(resolveParams('compressed').sightDayM, DEFAULTS.sightDayM);
});
