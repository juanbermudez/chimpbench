import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ACTIVE_WHEN, ENCODED_BY, OVERRIDES, classify, fittedIn, isActive, lintSource, type RegistryEntry } from '../scripts/lib/prescriptions';
import { buildLedger, fieldParams, lintSim, loadEntries, prescriptionCount } from '../scripts/prescription-ledger';

const entries = loadEntries(), byId = new Map(entries.map(e => [e.id, e]));
const cls = (id: string) => classify(byId.get(id)!).cls;
const targets = (JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as { targets: { id: string; encoded: boolean }[] }).targets;

test('every registry entry gets exactly one class', () => {
  const L = buildLedger();
  assert.equal(L.rows.length, entries.length);
  assert.equal(L.classes.input + L.classes.design + L.classes['outcome-encoding'], entries.length);
  assert.equal(new Set(L.rows.map(r => r.id)).size, entries.length);
  for (const r of L.rows) assert.ok(r.rule && r.reason && r.kind, r.id);
});

test('the audit\'s seed list is outcome-encoding', () => {
  for (const id of ['hungerAwakePerH', 'hungerRunPerH', 'hungerSleepPerH', 'hungerLactationPerH', 'hungerPregnancyPerH', 'thirstAwakePerH', 'energyRestPerH',
    'nestEveningStartH', 'nestEveningEndH', 'nestWakeHour', 'patrolStartH', 'patrolEndH', 'patrolH0', 'patrolMaleOddsRatio', 'patrolIncursionP', 'gangImpulseP', 'rainDisplayP',
    'huntGapH', 'rgTemperature', 'rgMaxAgeH', 'continueBonus', 'finishedPenalty', 'escalationBaseP', 'escalateImpulseBase', 'infanticideStrangerP', 'infanticideKillP', 'redirectBaseP',
    'fruitHungerFactor', 'walkMps', 'travelCallPerH']) assert.equal(cls(id), 'outcome-encoding', id);
});

test('inputs and design entries', () => {
  for (const id of ['gestationMinDays', 'fecundityMax', 'hearPantHootM', 'sightDayM', 'fallbackRateRatio', 'hazardInfant', 'rainAprMm', 'lactTaperStartY', 'runMps', 'epidemicR0']) assert.equal(cls(id), 'input', id);
  for (const id of ['boutGroomMin', 'groomRangeM', 'rgOn', 'huntEncounter', 'patrolLeadScore', 'tickSeconds', 'eloK', 'territoryCostA', 'travelHooFollowW', 'encounterGapH', 'memoryCap', 'snakeDistM']) assert.equal(cls(id), 'design', id);
});

test('encoded target rows are read from the notes, and denials are respected', () => {
  assert.deepEqual(classify(byId.get('patrolH0')!).encodes, ['T-PAT-1']);
  assert.deepEqual(classify(byId.get('patrolIncursionP')!).encodes, ['T-PAT-6']);
  assert.deepEqual(classify(byId.get('snareHazardPerKm')!).encodes, ['T-DEM-9']);
  assert.ok(classify(byId.get('fruitHungerFactor')!).encodes.includes('T-ACT-2'));
  assert.deepEqual(fittedIn('Fitted to T-PAT-1 at stage C6. Another sentence about T-RNG-1.'), { fitted: true, targets: ['T-PAT-1'] });
  assert.deepEqual(fittedIn('Not fitted: planned as fitted to T-RNG-1 in C6.'), { fitted: false, targets: [] });
  assert.deepEqual(fittedIn('Design value 0.4, not fitted (the observer cannot count it).'), { fitted: false, targets: [] });
  assert.deepEqual(fittedIn('May be refitted once to T-COM-8\'s band centre.'), { fitted: false, targets: [] });
  assert.deepEqual(fittedIn('Copulations that do not fit accelerated time.'), { fitted: false, targets: [] });
  const known = new Set(targets.map(t => t.id));
  for (const e of entries) for (const t of classify(e).encodes) assert.ok(known.has(t), `${e.id} names ${t}`);
});

test('rules by unit', () => {
  const e = (o: Partial<RegistryEntry>): RegistryEntry => ({ id: 'x', group: 'social', value: 1, units: 'score', evidence: 'design', calibrate: false, notes: '', ...o });
  assert.deepEqual([classify(e({ units: 'h (time of day)' })).kind, classify(e({ units: 'h (time of day)', group: 'weather', evidence: 'assumed' })).cls], ['clock', 'input']);
  assert.equal(classify(e({ units: 'probability' })).kind, 'probability');
  assert.equal(classify(e({ units: 'per perception' })).kind, 'hazard');
  assert.equal(classify(e({ units: 'per eco-h', group: 'needs' })).kind, 'timer');
  assert.equal(classify(e({ units: 'per eco-h' })).cls, 'design');             // a relaxation rate outside the needs is a mechanism constant
  assert.equal(classify(e({ id: 'someGapH', units: 'h' })).kind, 'quota');
  assert.equal(classify(e({ evidence: 'M' })).kind, 'field-copy');
  assert.equal(classify(e({ units: 'switch', evidence: 'M', notes: 'Fitted to T-PAT-1.' })).cls, 'design');
  assert.equal(classify(e({ notes: 'Fitted so that hooed trips recruit in 71% of cases.' })).kind, 'fitted');
  assert.equal(classify(e({})).cls, 'design');
  assert.equal(classify(e({ planned: 'C7', units: 'probability' })).planned, true);
});

test('the tables name real ids', () => {
  for (const id of [...Object.keys(OVERRIDES), ...Object.keys(ACTIVE_WHEN)]) assert.ok(byId.has(id), id);
  const encoded = targets.filter(t => t.encoded).map(t => t.id).sort();
  assert.deepEqual(Object.keys(ENCODED_BY).sort(), encoded);        // all 18 encoded targets are cross-referenced
  assert.equal(encoded.length, 18);
  for (const [t, e] of Object.entries(ENCODED_BY)) for (const id of e.params) assert.ok(byId.has(id), `${t}: ${id}`);
  for (const e of buildLedger().encoded) if (e.literal) assert.match(e.literal, /^src\/sim\/\w+\.ts:\d+$/, e.target);
});

test('lint: hour-of-day literals, dice against numbers, menus; not reason texts, hazards or the weather', () => {
  const src = [
    'const midday = hour >= 11.5 && hour < 14.5 ? 0.3 : 0;',
    'if (world.hour >= 11.5 && world.hour < 14.5) return `Rest through the midday heat`;',
    'return world.hour >= 12 ? \'evening\' : \'dawn\';',
    '// hour >= 3 in a comment',
    'if (random(world) < 0.35 * strength) defend();',
    'if (random(world) < 1 - Math.exp(-P.patrolH0 * dt)) patrol();',
    'if (random(world) < P.rainDisplayP) display();',
    'const h = hunger; if (h > 0.35) beg();',
  ].join('\n');
  const found = lintSource('candidates.ts', src);
  assert.deepEqual(found.map(l => [l.line, l.kind, l.counted]), [[1, 'hour', true], [2, 'hour', false], [3, 'hour', false], [5, 'probability', true]]);
  assert.deepEqual(found[0].values, [11.5, 14.5]);
  assert.ok(lintSource('environment.ts', src).every(l => !l.counted));
  assert.deepEqual(lintSource('params.gen.ts', src), []);
  assert.deepEqual(lintSource('menu.ts', "  night: new Set<Action>(['nest', 'rest']),\n  dusk: new Set<Action>(['nest']),").map(l => l.kind), ['menu', 'menu']);
});

test('lint finds the known literals in src/sim', () => {
  const lit = lintSim().filter(l => l.counted);
  assert.ok(lit.some(l => l.file === 'candidates.ts' && l.kind === 'hour' && l.values.join() === '11.5,14.5'), 'midday rest');
  assert.ok(lit.some(l => l.file === 'candidates.ts' && l.kind === 'hour' && l.values.includes(6.4)), 'chorus windows');
  assert.equal(lit.filter(l => l.file === 'menu.ts' && l.kind === 'menu').length, 2);
  assert.ok(!lit.some(l => l.file === 'environment.ts' || l.file === 'reproduction.ts'));
});

test('the count follows overrides that switch a prescription off or on', () => {
  const base = prescriptionCount();
  assert.equal(base.total, base.registryActive + base.literals);
  assert.ok(base.activeIds.includes('patrolH0') && base.inactive.includes('huntDayPerMale') && base.inactive.includes('activeDayH'));
  assert.equal(prescriptionCount({ patrolH0: 0 }).total, base.total - 1);
  assert.equal(prescriptionCount({ rainDisplayP: 0, gangImpulseP: 0 }).total, base.total - 2);
  assert.equal(prescriptionCount({ huntEncounter: 0 }).total, base.total + 1);     // the hunting-day lottery comes back
  assert.equal(prescriptionCount({ rgOn: 0 }).total, base.total - 2);              // rgTemperature and rgMaxAgeH are read only with rgOn
  const P = fieldParams();
  assert.equal(isActive({ id: 'patrolH0', planned: false }, P), true);
  assert.equal(isActive({ id: 'patrolH0', planned: true }, P), false);
  assert.equal(isActive({ id: 'partyFollowHungerW', planned: false }, P), false);  // 0 in the field profile
});
