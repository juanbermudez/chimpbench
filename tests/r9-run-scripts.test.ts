// Stage R9's run scripts keep the tree clean (the merge of 11 October 2026): a model step refuses a tree that is not
// clean, and the scripts used to rewrite committed tables between model steps. Generated tables now land under
// artifacts/r9/tables, which git ignores; `publish` copies them into docs/staging when the runs are over. No model,
// no simulation: the scripts' own text, and `publish` on temporary folders.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';

const tmp = mkdtempSync(join(tmpdir(), 'r9-run-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const TABLE_NAMES = ['r9-dry.md', 'r9-offline.md', 'r9-numbers.md', 'r9-seed2-numbers.md'];

test('no run script writes a table into docs/staging: every generated table goes under the tables folder, which git ignores', () => {
  const written: string[] = [];
  for (const file of ['scripts/r9-run.sh', 'scripts/r9-seed2.sh']) {
    const text = readFileSync(file, 'utf8'), code = text.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
    assert.match(code, /TABLES="\$\{R9_TABLES:-artifacts\/r9\/tables\}"/, `${file}: the tables folder`);
    const md = [...code.matchAll(/--md\s+(\S+)/g)].map(m => m[1]);
    assert.ok(md.length > 0, `${file} writes a table`);
    for (const target of md) { assert.match(target, /^"\$TABLES\/r9-[a-z0-9-]+\.md"/, `${file}: --md ${target}`); written.push(target.replace(/^"\$TABLES\//, '').replace(/".*$/, '')); }
    assert.ok(!/--md\s+"?docs\//.test(code), `${file}: no table is written over a committed one`);
  }
  assert.deepEqual([...new Set(written)].sort(), [...TABLE_NAMES].sort(), 'the four tables the stage generates, the ones `publish` knows');
  // the default folder is ignored by git, so a table written there leaves `git status` empty
  assert.equal(execFileSync('git', ['check-ignore', 'artifacts/r9/tables/r9-numbers.md'], { encoding: 'utf8' }).trim(), 'artifacts/r9/tables/r9-numbers.md');
  // and the committed copies are still where the stage document points
  for (const name of TABLE_NAMES) assert.ok(existsSync(join('docs/staging', name)), name);
});

test('publish copies the generated tables into the documents folder, only those, and says when nothing changed', () => {
  const tables = join(tmp, 'tables'), docs = join(tmp, 'docs');
  mkdirSync(tables); mkdirSync(docs);
  writeFileSync(join(tables, 'r9-numbers.md'), '# new numbers\n'); writeFileSync(join(tables, 'r9-offline.md'), '# offline\n'); writeFileSync(join(tables, 'notes.md'), 'not a table of the stage\n');
  writeFileSync(join(docs, 'r9-numbers.md'), '# old numbers\n'); writeFileSync(join(docs, 'r9-offline.md'), '# offline\n');
  const publish = () => spawnSync('sh', ['scripts/r9-run.sh', 'publish'], { encoding: 'utf8', env: { ...process.env, R9_TABLES: tables, R9_DOCS: docs } });
  const first = publish();
  assert.equal(first.status, 0, `${first.stdout}${first.stderr}`);
  assert.equal(readFileSync(join(docs, 'r9-numbers.md'), 'utf8'), '# new numbers\n');
  assert.ok(!existsSync(join(docs, 'notes.md')) && !existsSync(join(docs, 'r9-dry.md')), 'only the stage\'s tables that were generated');
  assert.match(first.stdout, /r9-offline\.md is already the generated table/); assert.match(first.stdout, /1 table\(s\) copied/);
  assert.match(publish().stdout, /0 table\(s\) copied/);
  // an unknown command prints the usage, with publish in it
  const usage = spawnSync('sh', ['scripts/r9-run.sh', 'nothing'], { encoding: 'utf8' });
  assert.equal(usage.status, 2); assert.match(usage.stdout, /report \| publish \| check/);
});
