import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIntervention, createWorld, tickWorld } from '../src/simulation';
import { updateClock, updateSun, updateWeatherValues, weatherTransition } from '../src/sim/environment';
import { paramsOf } from '../src/sim/params';
import { ix, simOf, SLOW_EVERY, TICK_HOURS } from '../src/sim/state';
import type { World } from '../src/types';

const runTo = (w: World, hour: number) => { while (w.time < hour - 6.5 - 1e-9) tickWorld(w); };

test('equatorial day length: sunrise ~06:45-07:00, sunset ~18:50, dark nights, moon phase', () => {
  const w = createWorld(1);
  let sunrise = -1, sunset = -1, noonAlt = 0;
  for (let t = 1; t <= 5760; t++) {
    w.tick = t; w.time = t * TICK_HOURS; updateClock(w); updateSun(w);
    if (sunrise < 0 && w.environment.sunAltitude > 0) sunrise = w.hour;
    if (sunrise > 0 && sunset < 0 && w.hour > 12 && w.environment.sunAltitude < 0) sunset = w.hour;
    if (Math.abs(w.hour - 12.8) < 0.01) noonAlt = w.environment.sunAltitude;
    if (w.hour > 20 || w.hour < 5) assert.equal(w.environment.daylight, 0);
    assert.ok(w.environment.moonPhase >= 0 && w.environment.moonPhase < 1);
  }
  assert.ok(sunrise > 6.7 && sunrise < 7.05, `sunrise ${sunrise}`);
  assert.ok(sunset > 18.7 && sunset < 19.1, `sunset ${sunset}`);
  assert.ok(noonAlt > 1.4, 'sun near zenith at the equinox');
  assert.ok(Math.abs(sunset - sunrise - 12) < 0.3, '~12 h day');
});

test('chimps wake after first light and build new night nests in tree crowns at dusk', () => {
  const w = createWorld(48);
  const nightTrees = new Map(w.chimps.map(c => [c.id, c.nest!.treeId]));
  runTo(w, 8.5);
  const alive = () => w.chimps.filter(c => c.alive);
  assert.ok(alive().filter(c => c.action === 'nest').length < 5, 'awake by mid-morning');
  assert.ok(alive().filter(c => c.nest === null).length > 40, 'left last night\'s nests');
  runTo(w, 21);
  const weaned = alive().filter(c => ix(c).weaned);
  const nesting = weaned.filter(c => c.action === 'nest' && c.nest && c.position[1] > 4);
  assert.ok(nesting.length / weaned.length > 0.9, `${nesting.length}/${weaned.length} in nests`);
  const newTree = nesting.filter(c => c.nest!.treeId !== nightTrees.get(c.id)).length;
  assert.ok(newTree / nesting.length > 0.6, 'most build a new nest');
  for (const c of alive().filter(k => !ix(k).weaned && k.age < 4)) {
    const m = w.chimps.find(k => k.id === c.motherId)!;
    if (m.alive && m.nest) assert.ok(Math.hypot(c.position[0] - m.position[0], c.position[2] - m.position[2]) < 1, 'infant with mother at night');
  }
  assert.ok(w.parties.some(p => p.kind === 'nesting'));
});

test('weather chain gives ~1,500-1,700 mm/yr, afternoon storms and ~15-24 °C', () => {
  let total = 0;
  const seeds = [1, 2, 3, 4];
  let afternoon = 0, morning = 0, tmin = 99, tmax = -99;
  for (const seed of seeds) {
    const w = createWorld(seed);
    const s = simOf(w);
    s.weather.rainMm = 0;
    for (let t = 1; t <= 5760 * 365; t++) {
      w.tick = t; w.time = t * TICK_HOURS;
      updateClock(w); updateSun(w);
      if (t % SLOW_EVERY === 0) weatherTransition(w);
      updateWeatherValues(w);
      const mm = w.environment.rain * paramsOf(w).rainMmPerH * TICK_HOURS;
      if (w.hour >= 13 && w.hour < 19) afternoon += mm; else if (w.hour >= 6 && w.hour < 12) morning += mm;
      if (t > 5760) { tmin = Math.min(tmin, w.environment.temperature); tmax = Math.max(tmax, w.environment.temperature); }
    }
    total += s.weather.rainMm;
  }
  const mean = total / seeds.length;
  assert.ok(mean > 1300 && mean < 1900, `mean annual rain ${mean.toFixed(0)} mm`);
  assert.ok(afternoon > morning * 3, 'convective afternoon peak');
  assert.ok(tmin > 12 && tmin < 16.5 && tmax > 22 && tmax < 26.5, `temperature ${tmin.toFixed(1)}..${tmax.toFixed(1)}`);
});

test('a storm forces heavy rain; chimps sit hunched and travel less', () => {
  const w = createWorld(5);
  runTo(w, 10);
  const moved = (ticks: number) => {
    const start = new Map(w.chimps.map(c => [c.id, [c.position[0], c.position[2]]]));
    for (let i = 0; i < ticks; i++) tickWorld(w);
    return w.chimps.filter(c => c.alive).reduce((a, c) => a + Math.hypot(c.position[0] - start.get(c.id)![0], c.position[2] - start.get(c.id)![1]), 0);
  };
  const dry = moved(80);
  const st = applyIntervention(w, 'storm');
  assert.ok(st && st.kind === 'storm');
  assert.equal(w.environment.weather === 'storm' || simOf(w).weather.state === 'storm', true);
  for (let i = 0; i < 20; i++) tickWorld(w);
  assert.ok(w.environment.rain > 0.5, 'heavy rain');
  const wet = moved(80);
  const sheltering = w.chimps.filter(c => c.alive && c.action === 'shelter').length;
  assert.ok(sheltering >= 10, `${sheltering} sheltering`);
  assert.ok(wet < dry, `movement in rain ${wet.toFixed(0)} < dry ${dry.toFixed(0)}`);
  assert.ok(w.events.some(e => e.kind === 'weather'));
});
