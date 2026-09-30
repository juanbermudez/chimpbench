import assert from 'node:assert/strict';
import test from 'node:test';
import { exportFileName, importedName, libraryFileName } from '../src/persist/controller';

// Export and import file names since the MGOGO → ChimpBench rename. Import detects the format by content, so only the
// imported simulation's name depends on the file name.

test('a simulation exports as .chimpbench.json.gz', () => {
  assert.equal(exportFileName('Kibale Run #2', 14), 'kibale-run-2-day-14.chimpbench.json.gz');
});

test('the library exports as chimpbench-simulations-<date>.sqlite3', () => {
  assert.equal(libraryFileName(new Date('2026-09-30T12:00:00Z')), 'chimpbench-simulations-2026-09-30.sqlite3');
});

test('an import named like a current export drops the extension', () => {
  assert.equal(importedName('kibale-run-2-day-14.chimpbench.json.gz'), 'kibale-run-2-day-14 (imported)');
});

test('an old .mgogo.json.gz export still imports under its own name', () => {
  assert.equal(importedName('kibale-run-2-day-14.mgogo.json.gz'), 'kibale-run-2-day-14 (imported)');
});

test('a plain or legacy .json export drops the extension', () => {
  assert.equal(importedName('mgogo-seed-48-day-3.json'), 'mgogo-seed-48-day-3 (imported)');
});

test('an export name round-trips to the simulation slug', () => {
  assert.equal(importedName(exportFileName('Dry season', 90)), 'dry-season-day-90 (imported)');
});
