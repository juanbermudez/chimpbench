import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld } from '../src/simulation';
import { chimpEvents } from '../src/ui/chimp-log';
import { flattenLine, matrilines } from '../src/ui/family-tree';

// Bottom chimp panel and sidebar Society lists: the pure data behind them (src/ui/chimp-log.ts, family-tree.ts).

test('the Log tab lists only the field-log entries that name the animal, newest first, up to its cap', () => {
  const w = createWorld(48), a = w.chimps[0], b = w.chimps[1];
  w.events.length = 0;
  for (let i = 0; i < 100; i++) w.events.push({ time: i, kind: 'social', text: `e${i}`, actors: i % 2 ? [a.id, b.id] : [b.id], troopId: a.troopId, severity: 0 });
  w.events.push({ time: 100, kind: 'system', text: 'no actors', actors: [], troopId: -1, severity: 0 });
  const mine = chimpEvents(w, a.id);
  assert.equal(mine.length, 50);
  assert.ok(mine.every(e => e.actors.includes(a.id)));
  assert.equal(mine[0].time, 99, 'newest first');
  for (let i = 1; i < mine.length; i++) assert.ok(mine[i - 1].time > mine[i].time);
  assert.equal(chimpEvents(w, b.id).length, 60, 'capped');
  assert.equal(chimpEvents(w, 99999).length, 0);
});

test('matrilines: every member of the community appears exactly once, lines largest first, mothers before offspring', () => {
  const w = createWorld(48);
  for (const t of w.troops) {
    const { lines, singles, members } = matrilines(w, t);
    const flat = lines.flatMap(flattenLine);
    const own = [...flat.filter(n => !n.emigrant).map(n => n.c.id), ...singles.map(c => c.id)];
    assert.equal(new Set(own).size, own.length, 'no one twice');
    assert.equal(own.length, members, 'everyone listed');
    assert.equal(members, w.chimps.filter(c => c.troopId === t.id).length);
    const sizes = lines.map(l => flattenLine(l).length);
    for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i - 1] >= sizes[i], 'largest line first');
    for (const l of lines) {
      const seen = new Set<number>();
      for (const n of flattenLine(l)) { if (n.depth > 0) assert.ok(seen.has(n.c.motherId), `${n.c.name} follows its mother`); seen.add(n.c.id); }
    }
    assert.ok(singles.every(c => !lines.some(l => l.c.id === c.id)));
  }
});
