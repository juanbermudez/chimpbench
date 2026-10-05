import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ACTIVE_WHEN, ENCODED_BY, LITERAL_ALLOW, LITERAL_JUDGEMENT, LITERAL_OFF, OVERRIDES, TRACK_E_SWITCHES, classify, fittedIn, isActive, lintSource, type RegistryEntry } from '../scripts/lib/prescriptions';
import { movedLine } from '../scripts/param-reads';
import type { Overrides } from '../src/sim/params';
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
  // "never fitted" is a denial too: ledgerWildCostMult (E1g) is a sensitivity parameter at the identity, swept and never fitted
  assert.deepEqual(fittedIn('A sensitivity parameter, swept and never fitted.'), { fitted: false, targets: [] });
  assert.notEqual(classify(byId.get('ledgerWildCostMult')!).cls, 'outcome-encoding');
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

// ---------------------------------------------------------------------------------------------------------------------
// Track E switches (audit of 1 October 2026: E1 and E2a had registered nothing, so the stack's count did not move)
// ---------------------------------------------------------------------------------------------------------------------

/** ACTIVE_WHEN entries and LITERAL_OFF lines that switch `id` turns out, from the switches it needs. */
function flipped(id: string): string[] {
  const s = TRACK_E_SWITCHES[id], base = fieldParams(s.needs as Overrides), on = fieldParams({ ...s.needs, [id]: 1 } as Overrides);
  return [...Object.entries(ACTIVE_WHEN).filter(([, e]) => e.when(base) && !e.when(on)).map(([k]) => k), ...LITERAL_OFF.filter(a => !a.off(base) && a.off(on)).map(a => `${a.file}: ${a.has}`)];
}

test('every Track E switch in the registry is listed, with real ids', () => {
  const inRegistry = entries.filter(e => /^(switch|flag)$/.test(e.units) && /^Stage E\d/.test(e.notes)).map(e => e.id).sort();
  assert.deepEqual(Object.keys(TRACK_E_SWITCHES).sort(), inRegistry);
  for (const s of Object.values(TRACK_E_SWITCHES)) for (const id of Object.keys(s.needs)) assert.ok(TRACK_E_SWITCHES[id] || byId.has(id), id);
});

test('every Track E switch switches an entry or a literal out, or says that it removes nothing', () => {
  for (const [id, s] of Object.entries(TRACK_E_SWITCHES)) assert.ok(flipped(id).length > 0 || !!s.removesNothing, `${id} (${s.stage}) switches nothing out and has no removesNothing note`);
});

test('a Track E switch lowers the count from its base exactly when it has no removesNothing note', () => {
  for (const [id, s] of Object.entries(TRACK_E_SWITCHES)) {
    const before = prescriptionCount(s.needs as Overrides).total, after = prescriptionCount({ ...s.needs, [id]: 1 } as Overrides).total;
    if (s.removesNothing) assert.ok(after >= before, `${id} says it removes nothing but lowers the count ${before} → ${after}`);
    else assert.ok(after < before, `${id} has no removesNothing note but leaves the count at ${before} → ${after}`);
  }
});

test('the full stack: timers, nest clock and midday rest out; rhythmDarkW in; the stage E1 food rates are inputs', () => {
  const stack: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseByMilk: 1, ledgerDigesta: 1, ledgerDrive: 1,
    rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1 };
  const off = prescriptionCount(), on = prescriptionCount(stack);
  for (const id of ['hungerAwakePerH', 'hungerRunPerH', 'hungerSleepPerH', 'hungerLactationPerH', 'hungerPregnancyPerH', 'fruitHungerFactor', 'fallbackHungerPerH',
    'energySleepPerH', 'energyRestPerH', 'energyWalkPerH', 'energyRunPerH', 'energyOtherPerH', 'nestEveningFromH', 'nestEveningStartH', 'nestEveningEndH', 'nestEveningDrive',
    'nestMorningDrive', 'nestNightBonus', 'nestWakeHour', 'boutRestMiddayMin', 'boutRestMiddayMax', 'redirectBaseP', 'escalateImpulseBase', 'rainDisplayP', 'stressRelaxPerH']) {
    assert.ok(off.activeIds.includes(id), `${id} in use with every switch off`);
    assert.ok(on.inactive.includes(id), `${id} not in use on the stack`);
  }
  assert.ok(on.activeIds.includes('rhythmDarkW') && off.inactive.includes('rhythmDarkW'), 'rhythmDarkW counts only under rhythmSleep');
  for (const id of ['ledgerFruitKcalPerMin', 'ledgerFigKcalPerMin', 'ledgerFallbackKcalPerMin', 'ledgerWalkJPerKgM']) assert.equal(cls(id), 'input', id);
  assert.equal(cls('rhythmDarkW'), 'outcome-encoding');
  // the clock literals: the nest gate, the morning nest bout, the midday rest (twice); the chorus windows and menus stay
  assert.equal(off.literals - on.literals, 4);
  const lit = lintSim(fieldParams(stack)).filter(l => l.counted);
  assert.ok(!lit.some(l => l.values.includes(11.5) || l.values.includes(5.5) || l.values.includes(12)), 'no nest or midday hour counted on the stack');
  assert.equal(prescriptionCount({ rhythmFreeNight: 1 }).literals, off.literals - 2, 'the two menus, for rules-driven chimps');
});

test('the nest gate is counted once, on whichever line runs (departRace moves it)', () => {
  const at = (P: Overrides) => lintSim(fieldParams(P)).filter(l => l.counted && l.file === 'candidates.ts' && l.values.includes(12)).map(l => l.text.includes('race &&'));
  assert.deepEqual(at({}), [false]);
  assert.deepEqual(at({ departRace: 1 }), [true]);
  assert.deepEqual(at({ departRace: 1, rhythmSleep: 1 }), []);
});

// ---------------------------------------------------------------------------------------------------------------------
// Stage E0b (docs/staging/e0b-prereg.md): time literals and the bonuses the clock switches on
// ---------------------------------------------------------------------------------------------------------------------

test('lint (E0b): time literals in the clock arithmetic; not registry values, unit conversions, comments or strings', () => {
  const src = [
    'const cooled = time - x.lastAgg > 1.5;',                          // 1 elapsed time against a literal
    'if (world.time - (s.enc[k] ?? -1e9) < 0.2) continue;',             // 2 the stamp in parentheses
    'if (st.end < world.time - 0.25) drop();',                           // 3 a stamp against the clock less a literal
    'if (world.time > h.resolveAt + 0.25) end();',                       // 4 the clock against a stamp plus a literal
    'x.until = world.time + 1.5 / 60;',                                  // 5 a deadline (a literal expression)
    'x.lastMate = Math.max(x.lastMate, world.time - GAP + 0.5);',        // 6 a backdated stamp
    'if (world.tick % 4 === 0) scan();',                                 // 7 a cadence
    "if (gate(world, `pg-${c.troopId}`, 2)) addEvent(world, 'x');",      // 8 the event log's rate limit
    'if (time - x.lastCall > P.contactCallGapH) call();',                // 9 a registry value: none
    'x.ill = world.time + 24 * P.epidemicIllDays;',                      // 10 a unit conversion: none
    '// time - x.lastCall > 0.5 in a comment',                           // 11 none
    "why = 'time - x.lastCall > 0.5';",                                  // 12 none
    'const days = (world.time - t) / 24;',                               // 13 no comparison: none
    'if (now - slots[i + 4] > 3 * MONTH) drop();',                       // 14 a count of a named unit
  ].join('\n');
  const found = lintSource('synthetic.ts', src).filter(l => l.kind === 'interval');
  assert.deepEqual(found.map(l => [l.line, l.values]), [[1, [1.5]], [2, [0.2]], [3, [0.25]], [4, [0.25]], [5, [0.025]], [6, [0.5]], [7, [4]], [8, [2]], [14, [3]]]);
  assert.ok(found.every(l => l.counted), 'a time literal no rule excuses is counted (the conservative default)');
  const lines = src.split('\n');
  assert.equal(movedLine(lines[4], found[4].spans!), 'x.until = world.time + (2 * (1.5 / 60));');
  assert.equal(movedLine(lines[5], found[5].spans!), 'x.lastMate = Math.max(x.lastMate, world.time - GAP + (2 * (0.5)));');
  assert.ok(lintSource('environment.ts', src).every(l => !l.counted), 'world files stay excluded');
});

test('lint (E0b): a bonus is a literal ternary switched by a comparison of the clock with a stored time', () => {
  const src = [
    'const sc = (grooming ? (time >= x.actEnd ? -0.25 : 0.35) : 0) + b;', // 1 continuation terms
    'offer(0.2 + (time - x.victimAt < 1 ? 0.3 : 0));',                     // 2 a weight on an event, and its window
    'const r = 0.1 + (x.ill > time ? P.epidemicRestW : 0);',               // 3 a registry value: none
    'const g = (night ? 1.5 : 0) + (c.action === \'transfer\' ? 1.2 : 1.3);', // 4 not switched by the clock: none
  ].join('\n');
  const found = lintSource('synthetic.ts', src);
  assert.deepEqual(found.map(l => [l.line, l.kind, l.values]), [[1, 'bonus', [-0.25, 0.35]], [2, 'interval', [1]], [2, 'bonus', [0.3]]]);
});

test('lint (E0b): every allow and off entry matches exactly its lines, with a literal of its kind', () => {
  const lits = lintSim();
  const sim = (f: string) => readFileSync(new URL(`../src/sim/${f}`, import.meta.url), 'utf8').split('\n');
  const lines = (e: { file: string; has: string; kind?: string }) => sim(e.file).map((s, i) => [s, i + 1] as const)
    .filter(([s, n]) => s.includes(e.has) && lits.some(l => l.file === e.file && l.line === n && (!e.kind || l.kind === e.kind)));
  for (const e of LITERAL_ALLOW) assert.equal(lines(e).length, e.n ?? 1, `allow ${e.file} "${e.has}" (${e.kind ?? 'any kind'})`);
  for (const e of LITERAL_OFF) assert.equal(lines(e).length, 1, `off ${e.file} "${e.has}" (${e.kind ?? 'any kind'})`);
  for (const e of LITERAL_OFF.filter(x => x.same)) assert.equal(lines({ file: e.file, has: e.same!, kind: e.kind }).length, 1, `twin of ${e.file} "${e.has}"`);
  for (const e of LITERAL_JUDGEMENT) {
    assert.equal(lines(e).length, 1, `judgement ${e.file} "${e.has}"`);
    const l = lits.find(q => q.file === e.file && q.line === lines(e)[0][1] && q.kind === e.kind)!;
    assert.ok(l.counted && l.borderline && l.why.startsWith('judgement call'), `${e.file} "${e.has}" is counted and marked`);
  }
});

test('lint (E0b): scheduling, logging, display, windows, cadences and episodes are not counted', () => {
  const lit = lintSim().filter(l => l.kind === 'interval' || l.kind === 'bonus');
  const at = (file: string, has: string) => lit.filter(l => l.file === file && l.text.includes(has));
  for (const [file, has] of [['tick.ts', 'time - s.lastDaily >= 24'], ['events.ts', 'world.time - last.time < 0.25'], ['observe.ts', 'time - x.heardAt < 0.25'],
    ['execution.ts', "gate(world, `mate-"], ['candidates.ts', 'time - x.joinAt < 0.3'], ['candidates.ts', 'time - ox.victimAt < 0.05'], ['candidates.ts', '(time - x.victimAt < 1 ? 0.3 : 0)'],
    ['conflict.ts', 'world.time - ox.gangAt > 0.5'], ['perception.ts', 'world.time - x.lastHeard > 0.08'], ['execution.ts', "actionTime % 120 === 0) emitCall(world, c, 'laugh')"]]) {
    assert.ok(at(file, has).length > 0, `${file} "${has}" found`);
    assert.ok(at(file, has).every(l => !l.counted), `${file} "${has}" not counted`);
  }
  assert.ok(!lit.some(l => l.counted && ['environment.ts', 'phenology.ts', 'generation.ts', 'tick.ts', 'events.ts', 'observe.ts'].includes(l.file)));
});

/** The time literals stage E0b counts on today's model (file, a piece of the line, kind). A change here is a change of the count: say why in the commit. */
const HIDDEN_TIMERS: [string, string, string][] = [
  ['candidates.ts', '0.35) : 0) - femaleOffset', 'bonus'],          // grooming continuation terms (general branch)
  ['candidates.ts', 'time - x.lastDisplay > 0.75', 'interval'],     // display gap
  ['candidates.ts', '(time - x.lastCall < 0.03 ? 0.4 : 0)', 'bonus'], // alarm penalty after a call (judgement call)
  ['candidates.ts', 'aggrBit(P, 1) || time - x.lastAgg > 1.5', 'interval'], // aggression cooldown (E4q: the piece follows the bit's guard)
  ['candidates.ts', 'aggrBit(P, 2) || time - x.lastAgg > 0.2', 'interval'], // charge at strangers (E4q, as above)
  ['candidates.ts', 'time - x.lastMate > 0.3', 'interval'],         // a female's mating gap
  ['candidates.ts', 'const callReady = time - x.lastCall > 0.5', 'interval'], // food and reunion calls
  ['candidates.ts', '!cv && time - x.lastCall > 1.5', 'interval'],  // chorus gap
  ['execution.ts', 'dominates(c, r) && time - x.lastAgg > 0.25', 'interval'], // mate guard's chase
  ['execution.ts', "actionTime % 60 === 0 && c.actionTime > 0) emitCall(world, c, 'alarm-hoo')", 'interval'], // alarm hoos (judgement call)
  ['execution.ts', 'c.age >= 12 && time - x.lastCall > 0.75', 'interval'], // arrival pant-hoot at figs
  ['execution.ts', 'time - x.lastFoodCall > 0.3', 'interval'],      // food grunt gap
  ['execution.ts', 'WALK * 1.2, 1)) { if (c.actionTime > P.mateApproachS) { x.lastMate = Math.max(x.lastMate, world.time - MATE_INTERVAL_H + 0.5)', 'interval'], // mate block
];

test('lint (E0b): the hidden timers counted on today\'s model', () => {
  const got = lintSim(fieldParams()).filter(l => l.counted && (l.kind === 'interval' || l.kind === 'bonus'));
  const sim = (f: string, n: number) => readFileSync(new URL(`../src/sim/${f}`, import.meta.url), 'utf8').split('\n')[n - 1];
  const key = (l: { file: string; line: number; kind: string }) => HIDDEN_TIMERS.findIndex(([f, has, k]) => f === l.file && k === l.kind && sim(f, l.line).includes(has));
  assert.deepEqual(got.map(key).sort((a, b) => a - b), HIDDEN_TIMERS.map((_, i) => i), got.map(l => `${l.file}:${l.line} ${l.kind}`).join('; '));
});

test('lint (E0b): callValue takes the call gaps out; redecideValue the grooming terms; groomDrive moves them, counted once', () => {
  const timers = (o: Overrides) => lintSim(fieldParams(o)).filter(l => l.counted && (l.kind === 'interval' || l.kind === 'bonus'));
  const has = (o: Overrides, s: string) => timers(o).filter(l => readFileSync(new URL(`../src/sim/${l.file}`, import.meta.url), 'utf8').split('\n')[l.line - 1].includes(s)).length;
  for (const s of ['!cv && time - x.lastCall > 1.5', 'c.age >= 12 && time - x.lastCall > 0.75', 'time - x.lastFoodCall > 0.3']) {
    assert.equal(has({}, s), 1, s);
    assert.equal(has({ callValue: 1 }, s), 0, `${s} with callValue`);
  }
  assert.equal(has({ callValue: 1 }, 'const callReady = time - x.lastCall > 0.5'), 1, 'the reunion call keeps its gap under callValue');
  const groom = '(time >= x.actEnd ? -0.25 : 0.35)';
  assert.deepEqual([{}, { groomDrive: 1 }, { groomNeedDyad: 1 }, { redecideValue: 1 }, { redecideValue: 2, groomDrive: 1 }].map(o => has(o as Overrides, groom)), [1, 1, 1, 0, 0]);
  assert.equal(timers({}).length - timers({ redecideValue: 2 }).length, 1);
  assert.equal(timers({}).length - timers({ callValue: 1 }).length, 3);
});
