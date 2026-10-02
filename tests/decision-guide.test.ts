import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ALL_LAYERS, buildData, checkContent, hostedCopy, LAYERS, STACK, STACKS } from '../scripts/decision-guide';
import { TRACK_E_SWITCHES } from '../scripts/lib/prescriptions';

// docs/decision-guide.html draws its statuses from the prescription ledger; its words and boxes live in
// scripts/lib/decision-guide-content.ts. When this fails after a ledger change, regroup the entries there and run
// pnpm exec tsx scripts/decision-guide.ts (then --check).
test('the decision guide puts every counted prescription in one domain and one box, and every box has one status', () => {
  const D = buildData();
  assert.deepEqual(checkContent(D), []);
  assert.equal(D.LS.count.total, D.setS.size);
});

test('the stack the guide shows is one constant: Track E switches only, no layer inside it', () => {
  assert.ok(Object.values(STACKS).some(s => s === STACK), 'STACK is one of STACKS');
  for (const s of Object.keys(STACK.switches)) assert.ok(TRACK_E_SWITCHES[s], `${s} is a Track E switch`);
  for (const l of LAYERS) assert.ok(Object.keys(l.on).every(s => !STACK.switches[s]), `layer ${l.key} is outside ${STACK.name}`);
  // a layer the stack holds is dropped, never shown twice
  for (const l of ALL_LAYERS) if (Object.keys(l.on).every(s => STACK.switches[s])) assert.ok(!LAYERS.includes(l), `${l.key} is in ${STACK.name}`);
});

const PAGE = new URL('../docs/decision-guide.html', import.meta.url);
const FROM = { branch: 'b-test', commit: 'abc1234' };

test('the hosted copy keeps no link to an undeployed note and is noindex', () => {
  const html = readFileSync(PAGE, 'utf8'), out = hostedCopy(html, FROM);
  const notes = (html.match(/<a href="(?:staging\/|simulation\.md|research\.md)[^"]*">/g) ?? []).length;
  assert.ok(notes > 0, 'the page links to notes');
  assert.doesNotMatch(out, /href="(?:staging\/|simulation\.md|research\.md)/);
  assert.equal((out.match(/<span class="doc-ref">/g) ?? []).length - (html.match(/<span class="doc-ref">/g) ?? []).length, notes);
  assert.equal((out.match(/<meta name="robots" content="noindex, nofollow">/g) ?? []).length, 1);
  assert.match(out, /<meta name="viewport"[^>]*>\n<meta name="robots" content="noindex, nofollow">/);
  assert.match(out, /<a href="\/about">The illustrated guide<\/a>/);
  assert.doesNotMatch(out, /architecture\.html/);
  assert.match(out, /^<!doctype html>\n<html lang="en">\n<head>\n<!-- Hosted copy of docs\/decision-guide\.html from branch b-test abc1234, .*Regenerate, do not edit\. -->/);
  const left = [...out.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map(x => x[1]).filter(h => !/^(?:data:|\/about|guide\/fonts\.css)/.test(h));
  assert.deepEqual(left, []);
});

test('the hosted copy makes anchored note links plain text and refuses any other outbound link', () => {
  const page = (body: string) => `<!doctype html>\n<html lang="en">\n<head>\n<meta name="viewport" content="width=device-width">\n</head><body>${body}<footer><a href="architecture.html">x</a></footer></body></html>`;
  const out = hostedCopy(page('<a href="simulation.md#s8">simulation.md §8</a> <a href="staging/e5a-prereg.md">e5a</a> <a href="#count">count</a>'), FROM);
  assert.match(out, /<span class="doc-ref">simulation\.md §8<\/span> <span class="doc-ref">e5a<\/span> <a href="#count">count<\/a>/);
  assert.throws(() => hostedCopy(page('<a href="https://example.org/">x</a>'), FROM), /outbound references left: https:\/\/example\.org\//);
  assert.throws(() => hostedCopy(page('<img src="pic.png">'), FROM), /outbound references left: pic\.png/);
  assert.throws(() => hostedCopy(page('<a href="architecture.html">twice</a>'), FROM), /architecture\.html/);
  assert.throws(() => hostedCopy(page('<a href="research.md" title="t">r</a>'), FROM), /made plain text/);
  assert.throws(() => hostedCopy(page('<a class="x" href="research.md">r</a>'), FROM), /outbound references left: research\.md/);
});
