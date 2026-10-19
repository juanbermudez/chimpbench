// Stage V1, the look by eye (docs/staging/v1-field.md, section 10): what a person reads on the page "How close to the
// wild" is plain words (no file of this repository, no source key), band edges carry no more digits than a label needs,
// and the life table's rates carry their intervals.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { bandShort, edgeText, plainWords } from '../src/yardstick/words';
import { refState, refusal, worldState } from '../src/yardstick/view';
import { lifeRecord } from '../src/yardstick/life';
import { detailHtml, rowHtml, stripSvg, type RowView } from '../src/ui/yardstick';
import { lifeTableSvg } from '../src/ui/life-charts';
import type { ReferenceFile, TargetsLite } from '../src/yardstick/bundle';
import { createWorld } from '../src/simulation';

const lite = JSON.parse(readFileSync(new URL('../public/field/targets-lite.json', import.meta.url), 'utf8')) as TargetsLite;
const ref = JSON.parse(readFileSync(new URL('../public/field/reference.json', import.meta.url), 'utf8')) as ReferenceFile;
const REPO_FILE = /\b(?:scripts|src|docs|data|tests|artifacts)\/[\w.-]/;

test('plain words: files of this repository and code-name lists go, source keys become authors and year', () => {
  const src = { wilson2012: { authors: 'Wilson ML, Kahlenberg SM, Wells M, Wrangham RW', year: 2012 } };
  assert.equal(plainWords('needs a year: life history over years (scripts/e-bench.ts NEEDS_YEAR)'), 'needs a year: life history over years');
  assert.equal(plainWords('for a source-text or bug reason (data/targets.json protocolLog)'), 'for a source-text or bug reason');
  assert.equal(plainWords('bootstrap 90% CI over months (docs/realism-design.md §5.3.1 P5 rule), computed before any run'), 'bootstrap 90% CI over months, computed before any run');
  assert.equal(plainWords('C8c taper (docs/staging/c8c-lactation-taper.md; made after the values were seen): revised'), 'C8c taper (made after the values were seen): revised');
  assert.equal(plainWords('scored by scripts/c9-scenario.ts (large-community scenario)'), 'scored on paired scenario runs (large-community scenario)');
  assert.equal(plainWords('memory digests; covered by tests/sim-relations.test.ts, not an observer metric'), 'memory digests; covered by the simulation’s tests, not an observer metric');
  assert.equal(plainWords('(S3 Data, CC BY 4.0); cluster bootstrap over group-days; scripts/patrol-bands-metrics.ts'), '(S3 Data, CC BY 4.0); cluster bootstrap over group-days');
  assert.equal(plainWords('9 values read under switches (bodyBonesDays, gutSizeExp, ownKeep); the golden world is unchanged.'), '9 values read under switches; the golden world is unchanged.');
  assert.equal(plainWords('stranger calls heard; wilson2012', src), 'stranger calls heard; Wilson et al. 2012');
  assert.equal(plainWords('an unknown key smith1999 stays', src), 'an unknown key smith1999 stays');
  assert.equal(plainWords('Ngogo 0.15 (F 0.17, M 0.12)'), 'Ngogo 0.15 (F 0.17, M 0.12)');   // nothing else changes
});

test('band edges on the strips carry at most three significant digits', () => {
  assert.equal(edgeText(6.1905), '6.19'); assert.equal(edgeText(11.4069), '11.4');
  assert.equal(edgeText(0.0385), '0.0385'); assert.equal(edgeText(1900), '1900'); assert.equal(edgeText(-0.057), '-0.057');
  assert.equal(bandShort({ lo: 6.1905, hi: 11.4069 }), '6.19–11.4');
  const fis5 = lite.targets.find(t => t.id === 'T-FIS-5')!;
  const svg = stripSvg(fis5, [], []);
  assert.doesNotMatch(svg, /6\.1905|11\.4069/);
});

test('no row and no detail on the page prints a file of this repository or a bare source key', () => {
  const w = createWorld(48), life = lifeRecord(w), refused = refusal(w, false);
  const keys = new Set(Object.keys(lite.sources));
  const visible = (html: string) => html.replace(/<[^>]*>/g, ' ');   // what is read, not the markup (titles, hrefs)
  for (const arm of ref.arms) for (const t of lite.targets) {
    const v: RowView = { t, arm, ref: refState(t, arm), world: worldState(t, w, life, 120, refused), communities: '', open: true, detail: '', matchNote: ref.todayMatch };
    const text = visible(rowHtml(v)) + visible(detailHtml(v, lite.sources, ref.arms, new Set([arm.id])));
    assert.doesNotMatch(text, REPO_FILE, `${arm.id} ${t.id}`);
    for (const m of text.matchAll(/\b[a-z][a-z-]*\d{4}[a-z]?\b/g)) assert.ok(!keys.has(m[0]), `${arm.id} ${t.id}: source key ${m[0]}`);
    assert.doesNotMatch(text, /\((?:\s*[a-z]+[A-Z]\w*\s*,)+\s*[a-z]+[A-Z]\w*\s*\)/, `${arm.id} ${t.id}: an aside of code names`);
  }
});

test('the life table draws each rate with its Poisson interval, and the axis holds the interval', () => {
  const zero = (): number[] => Array(15).fill(0);
  const ex = { male: zero(), female: zero() }, de = { male: zero(), female: zero() };
  ex.female[0] = 2.5; de.female[0] = 1; ex.male[8] = 0.6; de.male[8] = 1;
  const svg = lifeTableSvg(ex, de);
  assert.equal((svg.match(/class="lc-ltw"/g) ?? []).length, 2);
  assert.equal((svg.match(/class="lc-lt /g) ?? []).length, 2);
  // one death in 0.6 animal-years: 95% about 0.022 to 9.3 a year, so the axis runs from 0.01 to 10
  const labels = [...svg.matchAll(/text-anchor="end">([\d.]+)</g)].map(m => Number(m[1]));
  assert.ok(Math.min(...labels) <= 0.01 && Math.max(...labels) >= 10, `axis ${labels}`);
  assert.match(svg, /1 death in 0\.6 animal-years \(95% 0\.022–9\.3 a year\)/);
});
