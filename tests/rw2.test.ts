// Stage RW2 (docs/staging/rw2-prereg.md §6): the reader, the packet and the scorer on INVENTED fixtures only. No field
// record is read, no model is loaded, nothing leaves this computer. The reader is run as it is run for real
// (/usr/bin/python3 -I), on made-up files laid out like the deposits; where that interpreter is missing those tests skip.
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cutsOf, loadRecords, markdown, scoreRw2, sizeReport } from '../scripts/rw2-score';
import { mulberry32 } from '../src/compare/sampling';
import { fanCalls, fanOutKernel } from '../src/kernel/fanout';
import { nullKernel } from '../src/kernel/kernels';
import type { KernelRequest } from '../src/kernel/types';
import { compromisedFor } from '../src/rw/manifest';
import { NAME_POOL } from '../src/rw/packet';
import type { RecordScore } from '../src/rw/score';
import { RW2_RULES, rw2RuleKernel } from '../src/rw2/kernels';
import { buildRw2Packet, buildRw2Question, narrowRw2Request, orderLine, rw2Lines, rw2RequestError, rw2Text, RW2_PREFIXES, type Rw2Option, type Rw2Record, type Rw2Request } from '../src/rw2/packet';
import { compromisedLists, individualStat, secondsAt } from '../src/rw2/score';
import { decisionContextError, SIM_LIMITS } from '../src/sim/context-check';

const PY = '/usr/bin/python3', READER = 'scripts/rw2/rw2_ingest.py', hasPy = existsSync(PY);
const sha = (t: string) => createHash('sha256').update(t).digest('hex');
const keyOf = (dataset: string, ident: string) => sha(`rw2-key-v1:${dataset}:${ident}`).slice(0, 16);
const read = (dir: string, dataset: string, part: string): Rw2Record[] => readFileSync(join(dir, dataset, `records-${part}.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
function ingest(raw: string, out: string, ...args: string[]) {
  mkdirSync(out, { recursive: true });
  return spawnSync(PY, ['-I', READER, '--raw', raw, '--out', out, '--manifest', join(out, 'manifest.json'), ...args], { encoding: 'utf8' });
}

// ---------------------------------------------------------------------------------------------------- fixtures

interface TaiEvent { group: string; bout: number; focal: string; date: string; start: string; partners: string[]; chosen: string }
const TAI_HEAD = ['focal', 'gr.initiated', 'group', 'gr.bout.index', 'start', 'r.date', 'group.composition', 'party.size', 'gr.session.index', 'pot.partner', 'dyad', 'sex.focal', 'sex.partner', 'repr.state.partner', 'bystanders',
  'eff.gr.size', 'z.rank.focal', 'z.rank.partner', 'z.average.ddsi.partner', 'z.ddsi.dyad', 'z.max.ddsi.partner', 'z.rel.ddsi.dyad', 'z.rel.rank.focal', 'z.rel.rank.partner', 'prev.aggression'];
/** Made-up animals: per community four males and four females, codes of the deposit's shape (a letter and two digits). */
const TAI_ANIMALS = (group: string) => Array.from({ length: 8 }, (_, i) => ({ code: `${group === 'East' ? 'q' : 'w'}${String(10 + i)}`, sex: i < 4 ? 'm' : 'f', raw: (8 - i) / 9 }));
function taiEvents(seed: number, n = 420, o: { perDay?: number; stepDays?: number; oneFocalADay?: boolean } = {}): TaiEvent[] {
  const rng = mulberry32(seed), out: TaiEvent[] = [], ofDay = new Map<string, string>();
  for (let k = 0; k < n; k++) {
    const group = k % 2 ? 'East' : 'South', animals = TAI_ANIMALS(group), day = Math.floor(k / (o.perDay ?? 4));   // by default four events a day, two per community
    const d = new Date(Date.UTC(2014, 8, 1) + day * (o.stepDays ?? 2) * 86400000), date = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
    const drawn = animals[Math.floor(rng() * 8)].code, focal = o.oneFocalADay ? ofDay.get(group + date) ?? ofDay.set(group + date, drawn).get(group + date)! : drawn, others = animals.filter(a => a.code !== focal).sort(() => rng() - 0.5).slice(0, 2 + Math.floor(rng() * 6)).map(a => a.code);
    out.push({ group, bout: k + 1, focal, date, start: `${String(7 + Math.floor(rng() * 10)).padStart(2, '0')}:${String(Math.floor(rng() * 60)).padStart(2, '0')}:00`, partners: others, chosen: others[Math.floor(rng() * others.length)] });
  }
  return out;
}
/** The file: the chosen row FIRST in every event unless `reverse` (so a leak of the source's order would show at once). */
function taiCsv(events: TaiEvent[], o: { reverse?: boolean; outcome?: (e: TaiEvent) => string } = {}): string {
  const z = (v: number) => v.toFixed(6), lines = [TAI_HEAD.join(',')];
  for (const e of o.reverse ? [...events].reverse() : events) {
    const animals = TAI_ANIMALS(e.group), of = (c: string) => animals.find(a => a.code === c)!, f = of(e.focal), chosen = o.outcome ? o.outcome(e) : e.chosen;
    const rows = [chosen, ...e.partners.filter(p => p !== chosen)], list = o.reverse ? [...e.partners].reverse() : e.partners;
    for (const p of o.reverse ? [...rows].reverse() : rows) {
      const a = of(p), h = parseInt(sha(`${e.bout}:${p}`).slice(0, 6), 16) / 0xffffff, h2 = parseInt(sha(`x${e.bout}:${p}`).slice(0, 6), 16) / 0xffffff;
      lines.push([e.focal, p === chosen ? 1 : 0, e.group, e.bout, e.start, e.date, [e.focal, ...list].join(';'), e.partners.length + 1, e.bout, p, `${e.focal}_${p}`, f.sex, a.sex,
        a.sex === 'f' && h > 0.8 ? 'swelling' : a.sex === 'f' && h < 0.1 ? 'lactating' : 'other', list.join(';'), e.partners.length, z((f.raw - 0.4) / 0.25), z((a.raw - 0.5) / 0.3), z(h2 - 0.5), z(h * 3 - 1.5), z(h2 * 2 - 1),
        z(h), z(f.raw), z(a.raw), h2 > 0.9 ? 1 : 0].join(','));
    }
  }
  return lines.join('\n') + '\n';
}

interface FoxEvent { id: string; period: string; members: string[]; party: string[] }
const FOX_F = Array.from({ length: 10 }, (_, i) => `zzq_${i + 1}`), PERIODS = ['A', 'B', 'C', 'D', 'E'];
const pairRow = (a: string, b: string, period: string) => { const h = parseInt(sha(`${[a, b].sort().join()}:${period}`).slice(0, 6), 16) / 0xffffff, newcomer = (x: string) => x === 'zzq_10' || (x === 'zzq_9' && period <= 'B');
  return { SRI_bi_z: (h * 4 - 2).toFixed(6), index_5m_bi_z: ((1 - h) * 3 - 1).toFixed(6), gmdur_index_z: (h > 0.5 ? h * 2 : -0.5).toFixed(6), gm_yn_bi: h > 0.5 ? 'Y' : 'N', kinship: [a, b].sort().join() === 'zzq_1,zzq_2' ? 1 : 0,
    immdyad: +newcomer(a) + +newcomer(b), ranksumbi_z: ((Number(a.slice(4)) + Number(b.slice(4))) / 10 - 1).toFixed(6) }; };
function foxEvents(seed: number, n = 150): FoxEvent[] {
  const rng = mulberry32(seed), out: FoxEvent[] = [];
  for (let k = 0; k < n; k++) {
    const year = 2010 + Math.floor(k / 15), month = 1 + (k % 12), day = 1 + Math.floor(rng() * 27), period = PERIODS[Math.floor((year - 2010) / 2)];
    const alive = period === 'A' ? FOX_F.slice(0, 9) : FOX_F, party = [...alive].sort(() => rng() - 0.5).slice(0, 4 + Math.floor(rng() * 5));
    out.push({ id: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}_${7 + Math.floor(rng() * 10)}:${String(Math.floor(rng() * 60)).padStart(2, '0')}:00`, period, members: party.slice(0, rng() < 0.2 ? 3 : 2), party });
  }
  return out;
}
function foxCsv(events: FoxEvent[], o: { counts?: number; members?: (e: FoxEvent) => string[] } = {}): { a1: string; a2: string } {
  const a1 = ['ID1,ID2,period,partycount_d,coal_count_bi,SRI_bi_z,index_5m_bi_z,gmdur_index_z,gm_yn_bi,ranksumbi_z,immdyad,kinship,total_AB_party'];
  for (const period of PERIODS) { const alive = period === 'A' ? FOX_F.slice(0, 9) : FOX_F; for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    const r = pairRow(alive[i], alive[j], period); a1.push([alive[i], alive[j], period, 2000, o.counts ?? 1, r.SRI_bi_z, r.index_5m_bi_z, r.gmdur_index_z, r.gm_yn_bi, r.ranksumbi_z, r.immdyad, r.kinship, 300].join(',')); } }
  const a2 = ['ID1,party_member,coal_id,event_factor,SRI_bi_z,index_5m_bi_z,gmdur_index_z,gm_yn_bi,kinship,period,party_size_fem_z,immdyad,ranksumbi_z'];
  for (const e of events) {
    const members = o.members ? o.members(e) : e.members, done = new Set<string>();
    for (const m of [...members].sort().reverse()) for (const x of e.party) {
      const pair = [m, x].sort().join();
      if (x === m || (members.includes(x) && done.has(pair))) continue;
      done.add(pair);
      const r = pairRow(m, x, e.period);
      a2.push([m, x, e.id, +members.includes(x), r.SRI_bi_z, r.index_5m_bi_z, r.gmdur_index_z, r.gm_yn_bi, r.kinship, e.period, ((e.party.length - 6) / 3).toFixed(6), r.immdyad, r.ranksumbi_z].join(','));
    }
  }
  return { a1: a1.join('\n') + '\n', a2: a2.join('\n') + '\n' };
}
function budongoCsv(year: number, rows: number, cols: number, o: { order?: (i: number) => number } = {}): string {
  const codes = Array.from({ length: cols }, (_, i) => `i${String(i + 1).padStart(2, '0')}`) /* made-up labels, not of the deposit's two-letter shape */, lines = [['', ...codes].map(c => `"${c}"`).join(',')];
  const body = Array.from({ length: rows }, (_, i) => codes.map((_c, j) => (i % 7 === 0 ? 0 : parseInt(sha(`${year}:${i}:${j}`).slice(0, 2), 16) < 50 ? (year === 2009 && i < 5 ? 2 : 1) : 0)));
  const order = Array.from({ length: rows }, (_, i) => i).sort((a, b) => (o.order ? o.order(a) - o.order(b) : a - b));
  order.forEach((i, at) => lines.push([`"${at + 1}"`, ...body[i]].join(',')));
  return lines.join('\n') + '\n';
}
/** A raw folder laid out like data/raw, holding made-up files only. */
function rawDir(root: string, name: string, files: { tai?: string; fox?: { a1: string; a2: string }; bud?: [string, string] }): string {
  const raw = join(root, name);
  for (const d of ['dryad-t8c88vh', 'dryad-44j0zpchh', 'dryad-51b68']) mkdirSync(join(raw, d), { recursive: true });
  writeFileSync(join(raw, 'dryad-t8c88vh', 'Data+Model2.csv'), files.tai ?? taiCsv(taiEvents(1, 40)));
  const fox = files.fox ?? foxCsv(foxEvents(1, 30));
  writeFileSync(join(raw, 'dryad-44j0zpchh', 'analysis1_datashare.csv'), fox.a1); writeFileSync(join(raw, 'dryad-44j0zpchh', 'analysis2_datashare.csv'), fox.a2);
  const bud = files.bud ?? [budongoCsv(2008, 60, 12), budongoCsv(2009, 60, 13)];
  writeFileSync(join(raw, 'dryad-51b68', 'subgroup_composition_chimpanzees_2008.csv'), bud[0]); writeFileSync(join(raw, 'dryad-51b68', 'subgroup_composition_chimpanzees_2009.csv'), bud[1]);
  return raw;
}
const sameFiles = (a: string, b: string, files: string[]) => { for (const f of files) assert.equal(readFileSync(join(a, f), 'utf8'), readFileSync(join(b, f), 'utf8'), f); };
const OPEN = ['tai-groom/records-train.jsonl', 'tai-groom/records-development.jsonl', 'kanyawara-coalition/records-train.jsonl', 'kanyawara-coalition/records-development.jsonl', 'manifest.json'];

// ---------------------------------------------------------------------------------------------------- the reader

test('reader: deterministic, no event and no community-day in two parts, the registered sizes add up', { skip: !hasPy }, () => {
  const root = mkdtempSync(join(tmpdir(), 'rw2-')), events = taiEvents(7), raw = rawDir(root, 'raw', { tai: taiCsv(events), fox: foxCsv(foxEvents(3)) });
  try {
    const a = ingest(raw, join(root, 'a')), b = ingest(raw, join(root, 'b'));
    assert.equal(a.status, 0, a.stderr); assert.equal(b.status, 0, b.stderr);
    sameFiles(join(root, 'a'), join(root, 'b'), OPEN);
    assert.ok(!existsSync(join(root, 'a', 'tai-groom', 'records-sealed.jsonl')) && !existsSync(join(root, 'a', 'kanyawara-coalition', 'records-sealed.jsonl')), 'no sealed record without an opening');
    const train = read(join(root, 'a'), 'tai-groom', 'train'), dev = read(join(root, 'a'), 'tai-groom', 'development'), m = JSON.parse(readFileSync(join(root, 'a', 'manifest.json'), 'utf8')).datasets['tai-groom'];
    assert.ok(train.length > 30 && dev.length > 30 && m.parts.sealed.events > 30, 'the fixture reaches all three parts');
    assert.equal(m.parts.train.events + m.parts.development.events + m.parts.sealed.events, events.length);
    assert.equal(m.parts.sealed.opened, false); assert.equal(m.parts.sealed.eligible, undefined);
    const keys = [...train, ...dev].map(r => r.key);
    assert.equal(new Set(keys).size, keys.length, 'an event lies in one part');
    // the same-day rule: no community-day holds eligible events of two parts, and none of an open part beside a sealed event
    const where = new Map(events.map(e => [keyOf('tai-groom', `${e.group}:${e.bout}`), `${e.group} ${e.date}`])), open = new Set(keys);
    const sealedDays = new Set(events.filter(e => !open.has(keyOf('tai-groom', `${e.group}:${e.bout}`))).map(e => `${e.group} ${e.date}`));
    const days = (rs: Rw2Record[]) => new Set(rs.filter(r => r.eligible).map(r => where.get(r.key)!));
    for (const d of days(train)) assert.ok(!days(dev).has(d) && !sealedDays.has(d), 'a train day is shared');
    for (const d of days(dev)) assert.ok(!sealedDays.has(d), 'a development day is shared with the sealed part');
    assert.ok(train.some(r => r.why === 'same-day') && train.filter(r => !r.eligible).every(r => r.why === 'same-day'));
    assert.equal(m.parts.train.eligible, train.filter(r => r.eligible).length);
    // every eligible record has exactly one label, inside its options, and at least two options
    for (const r of [...train, ...dev].filter(x => x.eligible)) assert.ok(r.labels.length === 1 && r.labels[0] < r.options.length && r.options.length >= 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('reader: the sealed outcome is never read unless opened, and an opening is logged first', { skip: !hasPy }, () => {
  const root = mkdtempSync(join(tmpdir(), 'rw2-')), events = taiEvents(11), fox = foxEvents(5), raw = rawDir(root, 'raw', { tai: taiCsv(events), fox: foxCsv(fox) }), log = join(root, 'sealed-log.md');
  try {
    writeFileSync(log, '| date | reason | kernels | commit |\n| --- | --- | --- | --- |\n');
    const closed = ingest(raw, join(root, 'closed'));
    assert.equal(closed.status, 0, closed.stderr);
    const refused = ingest(raw, join(root, 'no'), '--open-sealed', 'short', '--sealed-log', log);
    assert.notEqual(refused.status, 0); assert.ok(!existsSync(join(root, 'no', 'tai-groom')), 'nothing is written by a refused opening'); assert.equal(readFileSync(log, 'utf8').split('\n').filter(Boolean).length, 2);
    const opened = ingest(raw, join(root, 'opened'), '--open-sealed', 'a test of the seal on invented rows, nothing real', '--sealed-log', log);
    assert.equal(opened.status, 0, opened.stderr);
    assert.match(readFileSync(log, 'utf8').split('\n').filter(Boolean)[2], /^\| \d{4}-\d\d-\d\d \| a test of the seal on invented rows, nothing real \| ingest: tai-groom, kanyawara-coalition \|/);
    const sealedTai = new Set(read(join(root, 'opened'), 'tai-groom', 'sealed').map(r => r.key)), sealedFox = read(join(root, 'opened'), 'kanyawara-coalition', 'sealed');
    assert.ok(sealedTai.size > 30 && sealedFox.length > 10);
    // the opened run's open parts are the closed run's
    sameFiles(join(root, 'closed'), join(root, 'opened'), OPEN.slice(0, 4));
    // every sealed outcome changed (Taï: another partner; Kanyawara: other participants): the closed output is byte for byte the same
    const isSealed = (e: TaiEvent) => sealedTai.has(keyOf('tai-groom', `${e.group}:${e.bout}`)), changed = events.filter(e => isSealed(e) && e.partners.length > 1).length;
    assert.ok(changed > 20);
    const month = (e: FoxEvent) => e.id.slice(0, 7), sealedMonths = new Set(fox.filter(e => !read(join(root, 'closed'), 'kanyawara-coalition', 'train').concat(read(join(root, 'closed'), 'kanyawara-coalition', 'development')).some(r => e.members.some(mm => r.key === keyOf('kanyawara-coalition', `${e.id}:${mm}`)))).map(month));
    const raw2 = rawDir(root, 'raw2', { tai: taiCsv(events, { outcome: e => isSealed(e) ? e.partners.find(p => p !== e.chosen) ?? e.chosen : e.chosen }),
      fox: foxCsv(fox, { members: e => sealedMonths.has(month(e)) ? e.party.slice(-e.members.length) : e.members }) });   // (as many participants: a sealed event's row count is structure)
    const closed2 = ingest(raw2, join(root, 'closed2'));
    assert.equal(closed2.status, 0, closed2.stderr);
    sameFiles(join(root, 'closed'), join(root, 'closed2'), OPEN.slice(0, 4));
    const part = (dir: string, d: string) => JSON.parse(readFileSync(join(root, dir, 'manifest.json'), 'utf8')).datasets[d].parts;
    for (const d of ['tai-groom', 'kanyawara-coalition']) assert.deepEqual(part('closed', d), part('closed2', d));
    // structure mode reads no outcome at all: every outcome changed, the same output; and the pair table's outcome column is never read
    const raw3 = rawDir(root, 'raw3', { tai: taiCsv(events, { outcome: e => e.partners[e.partners.length - 1] }), fox: foxCsv(fox, { counts: 9, members: e => e.party.slice(-e.members.length) }) });
    const s1 = spawnSync(PY, ['-I', READER, '--raw', raw, '--structure', '--datasets', 'tai-groom,kanyawara-coalition'], { encoding: 'utf8' }), s3 = spawnSync(PY, ['-I', READER, '--raw', raw3, '--structure', '--datasets', 'tai-groom,kanyawara-coalition'], { encoding: 'utf8' });
    assert.equal(s1.status, 0, s1.stderr); assert.equal(s1.stdout, s3.stdout);
    const raw4 = rawDir(root, 'raw4', { tai: taiCsv(events), fox: foxCsv(fox, { counts: 9 }) }), closed4 = ingest(raw4, join(root, 'closed4'));
    assert.equal(closed4.status, 0, closed4.stderr);
    sameFiles(join(root, 'closed'), join(root, 'closed4'), OPEN.slice(0, 4));
    // the scorer's own gate: the sealed part without an opening is refused before any record is read
    const gate = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/rw2-score.ts', '--dataset', 'tai-groom', '--part', 'sealed', '--dir', join(root, 'opened'), '--sealed-log', log], { encoding: 'utf8' });
    assert.notEqual(gate.status, 0); assert.match(gate.stderr, /sealed part opens only with --open-sealed/); assert.equal(readFileSync(log, 'utf8').split('\n').filter(Boolean).length, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('reader: the order of rows and lists in the source carries nothing, and no identity, date or raw value survives', { skip: !hasPy }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'rw2-')), events = taiEvents(23, 900, { perDay: 8, stepDays: 1, oneFocalADay: true }), fox = foxEvents(9), raw = rawDir(root, 'raw', { tai: taiCsv(events), fox: foxCsv(fox) }), rev = rawDir(root, 'rev', { tai: taiCsv(events, { reverse: true }), fox: foxCsv(fox) });
  try {
    assert.equal(ingest(raw, join(root, 'a')).status, 0); assert.equal(ingest(rev, join(root, 'b')).status, 0);
    sameFiles(join(root, 'a'), join(root, 'b'), OPEN.slice(0, 2));   // (the manifest holds the file's hash, which differs)
    const train = loadRecords(join(root, 'a'), 'tai-groom', 'train').eligible;
    assert.ok(train.length > 150);
    // the chosen row is first in every event of the source: the reader's order must not keep it there
    const firstIsLabel = train.filter(r => r.labels[0] === 0).length / train.length, chance = train.reduce((a, r) => a + 1 / r.options.length, 0) / train.length;
    assert.ok(Math.abs(firstIsLabel - chance) < 0.08, `label first on ${firstIsLabel}, chance ${chance}`);
    // ... and after the builder's shuffle the first-option kernel sits at chance, while a rule's score does not move with the shuffle
    const o = { dataset: 'tai-groom' as const, view: 'own' as const, seed: 5, shuffles: 3, reps: 50, distribution: false };
    const first = (await scoreRw2(rw2RuleKernel('tai-groom', 'first-option'), train, o)).run, rank = (await scoreRw2(rw2RuleKernel('tai-groom', 'rank-high'), train, o)).run;
    assert.ok(Math.abs(first.summary.top1.pooled.value! - first.summary.chance.pooled.value!) < 0.08);
    const perShuffle = await Promise.all([0, 1, 2].map(async k => (await scoreRw2(rw2RuleKernel('tai-groom', 'rank-high'), train, { ...o, seed: 5 + k, shuffles: 1 })).run.summary.top1Ties.pooled.value));
    assert.ok(new Set(perShuffle).size === 1 && perShuffle[0] === rank.summary.top1Ties.pooled.value, 'ties-split score of a rule is the same under every order');
    // identities: nothing of the source's codes, dates, event numbers or values in a record, a packet or the manifest
    const files = [...OPEN.map(f => readFileSync(join(root, 'a', f), 'utf8')), ...train.slice(0, 80).map(r => rw2Text(buildRw2Packet(r, { view: 'third' }).request)), ...loadRecords(join(root, 'a'), 'kanyawara-coalition', 'train').eligible.slice(0, 40).map(r => rw2Text(buildRw2Packet(r).request))].join('\n');
    for (const code of [...TAI_ANIMALS('East'), ...TAI_ANIMALS('South')].map(a => a.code)) assert.ok(!new RegExp(`\\b${code}\\b`).test(files), 'an animal code');
    assert.ok(!/zzq_\d/.test(files) && !/\d\d\/\d\d\/\d{4}/.test(files) && !/20\d\d-\d\d-\d\d/.test(files) && !/\d\d:\d\d:\d\d/.test(files) && !/-?\d\.\d{6}/.test(files), 'a code, a date, a clock time or a raw value');
    for (const r of train) { assert.match(r.chooser, /^a[0-9a-f]{10}$/); assert.match(r.key, /^[0-9a-f]{16}$/); assert.deepEqual(Object.keys(r).sort(), ['act', 'chooser', 'dataset', 'eligible', 'focal', 'key', 'labels', 'options', 'part', 'stratum', 'why']); }
    // one chooser, many records: its invented name changes from record to record
    const mine = train.filter(r => r.chooser === train[0].chooser).slice(0, 30), names = new Set(mine.map(r => buildRw2Packet(r).request.context.focal.name));
    assert.ok(mine.length >= 10 && names.size > mine.length / 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('reader: Kanyawara menus are rebuilt for every participant, repeats of a day are left out, bonds come from the previous period', { skip: !hasPy }, () => {
  const root = mkdtempSync(join(tmpdir(), 'rw2-')), base = foxEvents(13, 120);
  // two hand-made events of one unsealed month: a pair coalition, and its repeat an hour later
  const month = ['2012-03', '2012-04', '2012-05', '2013-02', '2013-03', '2013-06', '2013-07'].find(m => { const h = parseInt(sha(`fox2022-coal-v1:${m}`).slice(0, 8), 16) % 5; return h >= 2; })!;
  const made: FoxEvent[] = [{ id: `${month}-28_9:15:00`, period: 'B', members: ['zzq_3', 'zzq_10'], party: ['zzq_3', 'zzq_10', 'zzq_1', 'zzq_5', 'zzq_9'] }, { id: `${month}-28_10:15:00`, period: 'B', members: ['zzq_3', 'zzq_10'], party: ['zzq_3', 'zzq_10', 'zzq_1', 'zzq_5'] }];
  const both = (e: FoxEvent) => e.members.includes('zzq_3') && e.members.includes('zzq_10');   // (the made pair never attacks together elsewhere)
  const raw = rawDir(root, 'raw', { fox: foxCsv([...base.filter(e => !e.id.startsWith(month) && !both(e)), ...made]) });
  try {
    const run = ingest(raw, join(root, 'a'), '--datasets', 'kanyawara-coalition');
    assert.equal(run.status, 0, run.stderr);
    const train = read(join(root, 'a'), 'kanyawara-coalition', 'train'), find = (e: FoxEvent, m: string) => train.find(r => r.key === keyOf('kanyawara-coalition', `${e.id}:${m}`))!;
    const a = find(made[0], 'zzq_3'), b = find(made[0], 'zzq_10');
    // each participant has the whole party less herself, and her partner is among her options though the pair is filed once
    assert.equal(a.options.length, 4); assert.equal(b.options.length, 4); assert.equal(a.labels.length, 1); assert.equal(b.labels.length, 1);
    assert.ok(a.eligible && b.eligible && a.chooser !== b.chooser);
    // zzq_10 is a newcomer (no pair of residents), and was not there in period A: no history with anyone
    assert.equal(b.focal.newcomer, true); assert.equal(a.focal.newcomer, false); assert.equal(a.focal.bonds, true);
    assert.ok(b.options.every(o => o.known === false && o.assoc === 0 && o.near === 0 && !o.groomed));
    assert.equal(a.options[a.labels[0]].newcomer, true); assert.equal(a.options[a.labels[0]].known, false);
    assert.equal(a.options.filter(o => o.known).length, 3); assert.deepEqual(a.options.filter(o => o.known).map(o => o.assoc).sort(), [1, 2, 3]);
    // rank, like the bonds, is of the previous period (the source's value is a two-year average that contains the event): the
    // newcomer has none, the others keep their order; the event's own period stays apart as the look-ahead rankNow
    assert.equal(a.options[a.labels[0]].rank, 0); assert.ok(a.options[a.labels[0]].rankNow! > 0); assert.ok(b.options.every(o => o.rank === 0 && o.rankNow! > 0));
    assert.deepEqual(a.options.filter(o => o.known).map(o => o.rank).sort(), [1, 2, 3]); assert.deepEqual(a.options.map(o => o.rankNow).sort(), [1, 2, 3, 4]);
    // the repeat of the same day and the same participants is written and left out
    for (const m of made[1].members) { const r = find(made[1], m); assert.equal(r.eligible, false); assert.equal(r.why, 'same-day-repeat'); }
    // coalition history is of earlier days only: the first event does not know the repeat, and the repeat does not know the first (same day)
    const again = find(made[1], 'zzq_3');
    assert.equal(a.options[a.labels[0]].allied, 0); assert.equal(again.options[again.labels[0]].allied, 0, 'an event of the same day is not history');
    const text = rw2Text(buildRw2Packet(b).request);
    assert.match(text, /newcomer to the community, wild chimpanzee/); assert.match(text, /No history with me yet: /); assert.match(text, /Attack alongside /);
    assert.ok(!text.includes(RW2_PREFIXES.assoc) && !text.includes('Rank here'), 'no order of a bond or of a rank she does not have');
    assert.match(rw2Text(buildRw2Packet(a).request), /Rank here over the previous two years, highest first: /);
    // the kin pair
    const kin = train.filter(r => r.options.some(o => o.kin));
    assert.ok(kin.length > 0 && kin.every(r => r.options.filter(o => o.kin).length === 1));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('reader: the Budongo yardstick uses single rows only (any order of the rows gives the same numbers)', { skip: !hasPy }, () => {
  const root = mkdtempSync(join(tmpdir(), 'rw2-'));
  const a = rawDir(root, 'a', { bud: [budongoCsv(2008, 70, 12), budongoCsv(2009, 80, 13)] }), b = rawDir(root, 'b', { bud: [budongoCsv(2008, 70, 12, { order: i => (i * 37) % 70 }), budongoCsv(2009, 80, 13, { order: i => 80 - i })] });
  try {
    const y = (raw: string, out: string) => { const r = ingest(raw, join(root, out), '--datasets', 'budongo-scans'); assert.equal(r.status, 0, r.stderr); return JSON.parse(readFileSync(join(root, out, 'manifest.json'), 'utf8')).datasets['budongo-scans']; };
    const ya = y(a, 'oa'), yb = y(b, 'ob'), strip = (v: { years: Record<string, { sha256?: string }> }) => { for (const k of Object.values(v.years)) delete k.sha256; return v; };
    assert.deepEqual(strip(ya), strip(yb));
    assert.equal(ya.status, 'yardstick only: not a choice record'); const empty = budongoCsv(2008, 70, 12).split('\n').slice(1).filter(l => l && l.split(',').slice(1).every(c => c === '0')).length;
    assert.equal(ya.years['2008'].rows, 70); assert.ok(empty >= 10); assert.equal(ya.years['2008'].emptyRows, empty); assert.equal(ya.years['2008'].nonEmptyRows, 70 - empty); assert.equal(ya.years['2009'].rowsWithAValue2 > 0, true);
    assert.ok(ya.neverCalled.includes('a choice record'));
    assert.ok(!existsSync(join(root, 'oa', 'budongo-scans')), 'no record is built from the scans');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------------- the packet

/** A hand-made Taï record: option i has the facts given; the label is option 0 unless told otherwise. */
function tai(options: Rw2Option[], over: Partial<Rw2Record> = {}): Rw2Record {
  return { dataset: 'tai-groom', key: `k${options.length}`, chooser: 'a000', part: 'train', stratum: 'train', eligible: true, why: '', act: 'groom-first', focal: { sex: 'm', hour: 9, above: options.filter(o => o.above).length },
    options: options.map(o => ({ sex: 'f', state: '', above: false, aggr: false, lastToday: false, rank: 1, bond: 1, past: 0, thirdMax: 1, thirdMean: 1, ...o })), labels: [0], ...over };
}
const wide = (n: number) => tai(Array.from({ length: n }, (_, i) => ({ rank: i + 1, bond: n - i, above: i < 3, sex: i % 2 ? 'm' : 'f', past: i === 4 ? 1 : 0, thirdMax: i + 1, thirdMean: n - i })), { key: `wide${n}` });
function fox(options: Rw2Option[], over: Partial<Rw2Record> = {}): Rw2Record {
  return { dataset: 'kanyawara-coalition', key: `f${options.length}`, chooser: 'a111', part: 'train', stratum: 'train', eligible: true, why: '', act: 'attack-with', focal: { sex: 'f', newcomer: false, bonds: true },
    options: options.map(o => ({ newcomer: false, kin: false, known: true, groomed: false, groomedNow: false, rank: 1, assoc: 1, near: 1, groomDur: 1, rankNow: 1, assocNow: 1, nearNow: 1, allied: 0, aggressor: 0, ...o })), labels: [0], ...over };
}

test('packet: a valid request of the shared contract, the registered words, nothing outside its view', () => {
  const r = tai([{ sex: 'f', state: 'swollen', rank: 3, bond: 2 }, { sex: 'm', rank: 1, above: true, bond: 3 }, { sex: 'f', state: 'infant', rank: 5, bond: 4 }, { sex: 'm', rank: 2, aggr: true, bond: 1, past: 1, lastToday: true }, { sex: 'f', rank: 4, bond: 3, past: 2 }]);
  const p = buildRw2Packet(r), req = p.request;
  assert.equal(rw2RequestError(req), ''); assert.equal(decisionContextError(req.context, { options: 24, social: 24 }), '');
  assert.equal(req.rulesIndex, -1); assert.equal(req.context.recent.length, 0); assert.equal(req.context.history, undefined);
  assert.ok(req.options.every(c => c.action === 'groom' && c.score === 0 && c.reason === ''));
  const name = (src: number) => req.context.social[p.order.indexOf(String(src))].name, l = rw2Lines(req);
  assert.equal(l.me, `${req.context.focal.name}, adult male, wild chimpanzee`); assert.equal(l.now, '9:00; 5 other adults in sight');
  assert.ok(l.nearby.includes(`${name(0)}: adult female, maximally swollen; ranks below me`) && l.nearby.includes(`${name(1)}: adult male; ranks above me`));
  assert.ok(l.nearby.includes(`${name(2)}: adult female, with an infant under 3 months; ranks below me`) && l.nearby.includes(`${name(3)}: adult male; ranks below me; aggression between us in the last half hour`));
  assert.deepEqual(l.last, [`groomed ${name(3)} first earlier today`]);
  assert.equal(l.history[0], `Rank here, highest first: ${name(1)}, me, ${name(3)}, ${name(0)}, ${name(4)}, ${name(2)}`);
  assert.equal(l.history[1].slice(0, RW2_PREFIXES.bond.length + 4), `${RW2_PREFIXES.bond}${name(3)}`); assert.match(l.history[1], /=/);   // options 1 and 4 share a bond rank
  assert.equal(l.history[2], `I groomed first before, most often first: ${name(3)}, ${name(4)}`); assert.equal(l.history.length, 3);
  const q = buildRw2Question(req);
  assert.equal(q.questions.action.instructions, 'Choose what this wild chimpanzee does next, from what it perceives, feels and remembers.');
  assert.deepEqual(Object.values(q.questions.action.criteria), req.context.social.map(s => `Groom ${s.name}`));
  assert.deepEqual(p.labels, [p.order.indexOf('0')]);
  // the own view holds no bystander field; the third view adds the two lines; nothing of a rule's wording anywhere
  assert.ok(req.wild2.options.every(o => o.thirdMax === undefined && o.thirdMean === undefined && o.pastOpen === undefined));
  const third = buildRw2Packet(r, { view: 'third' }).request;
  assert.equal(rw2RequestError(third), ''); assert.equal(rw2Lines(third).history.length, 5); assert.ok(rw2Lines(third).history[3].startsWith(RW2_PREFIXES.thirdMax));
  assert.ok(!/because|should|prefer|score|urgent|best/i.test(rw2Text(third)));
  // names: from the invented pool, distinct, the same under another shuffle, and the options move
  const other = buildRw2Packet(wide(13), { shuffle: 1 }), zero = buildRw2Packet(wide(13));
  assert.ok(zero.request.context.social.every(s => NAME_POOL.includes(s.name)) && new Set(zero.request.context.social.map(s => s.name)).size === 13);
  assert.notDeepEqual(other.order, zero.order); assert.equal(other.request.context.focal.name, zero.request.context.focal.name);
  assert.deepEqual([...other.request.context.social.map(s => s.name)].sort(), [...zero.request.context.social.map(s => s.name)].sort());
  assert.notEqual(decisionContextError(zero.request.context, SIM_LIMITS), '', 'a wide menu needs the wide limits, which only this builder passes');
  // two records with the same facts and different keys: the same text but for the names
  const blank = (rec: Rw2Record) => { const pk = buildRw2Packet(rec), t = rw2Lines(pk.request); return [...t.nearby.map(x => x.replace(/^\w+: /, '')).sort(), t.history.length, pk.labels.length].join('|'); };
  assert.equal(blank(r), blank({ ...r, key: 'another', chooser: 'a999' }));
});

test('packet: a block that holds anything but its coarse facts is refused, and the look-ahead view is never text', () => {
  const base = () => buildRw2Packet(tai([{ rank: 1 }, { rank: 2 }, { rank: 3 }])).request, bad = (edit: (r: Rw2Request) => void) => { const r = structuredClone(base()); edit(r); return rw2RequestError(r); };
  assert.equal(rw2RequestError(base()), '');
  assert.match(bad(r => { r.wild2.options[0].thirdMean = 2; }), /outside its view/);
  assert.match(bad(r => { (r.wild2.options[0] as Record<string, unknown>).code = 'q10'; }), /outside its view/);
  assert.match(bad(r => { (r.wild2.options[0] as Record<string, unknown>).rank = 0.731; }), /coarse set/);
  assert.match(bad(r => { (r.wild2.options[0] as Record<string, unknown>).state = 'q10'; }), /coarse set/);
  assert.match(bad(r => { r.context.recent.push('q10 groomed me'); }), /free text/);
  assert.match(bad(r => { r.context.history = ['a line']; }), /free text/);
  assert.match(bad(r => { r.context.candidates[0].reason = 'the closest bond'; r.options[0].reason = 'the closest bond'; }), /one-act menu/);
  assert.match(bad(r => { r.context.social[0].bond = 0.9; }), /not neutral/);
  assert.match(bad(r => { r.context.focal.rankOrder = 2; r.context.focal.rankOf = 5; }), /not neutral/);
  assert.match(bad(r => { r.context.social[0].name = 'Q10'; }), /names/);
  const f = fox([{ assocNow: 1 }, { assocNow: 2 }, { assocNow: 3 }]), own = buildRw2Packet(f).request, ahead = buildRw2Packet(f, { view: 'lookahead' }).request;
  assert.equal(rw2RequestError(own), ''); assert.equal(rw2RequestError(ahead), '');
  assert.ok(own.wild2.options.every(o => o.rankNow === undefined && o.assocNow === undefined && o.nearNow === undefined && o.groomedNow === undefined));
  assert.ok(ahead.wild2.options.every(o => o.rankNow === 1));
  assert.ok(own.options.every(c => c.action === 'follow') && own.mask.options.includes('action'));
  assert.throws(() => rw2Lines(ahead), /never written as text/); assert.throws(() => buildRw2Question(ahead), /never written as text/);
  // a sealed record's open-only history replaces the full one on request
  const sealed = tai([{ past: 1, pastOpen: 0, lastToday: true, lastTodayOpen: false }, { past: 2, pastOpen: 1 }]), full = buildRw2Packet(sealed).request.wild2.options, openOnly = buildRw2Packet(sealed, { history: 'open' }).request.wild2.options;
  assert.deepEqual(full.map(o => o.past).sort(), [1, 2]); assert.deepEqual(openOnly.map(o => o.past).sort(), [0, 1]); assert.ok(openOnly.every(o => !o.lastToday));
  assert.throws(() => buildRw2Packet(tai([{ rank: 1 }])), /menu of 1/);
});

test('packet: a sub-menu is a valid request that says nothing of the options outside it; the fan-out takes the registered calls', async () => {
  const p = buildRw2Packet(wide(13), { view: 'third' }), keep = [11, 2, 7, 5], sub = narrowRw2Request(p.request, keep);
  assert.equal(rw2RequestError(sub), ''); assert.equal(decisionContextError(sub.context), '');
  const gone = p.request.context.social.filter((_, i) => !keep.includes(i)).map(s => s.name), text = rw2Text(sub);
  for (const n of gone) assert.ok(!text.includes(n), 'a name outside the sub-menu');
  assert.deepEqual(sub.context.social.map(s => s.name), keep.map(i => p.request.context.social[i].name));
  assert.match(text, /13 other adults in sight/); assert.match(text, /Rank here, highest first: .*\bme\b/);
  // the order of the kept options within each line is the order of the whole menu
  const order = (t: string, prefix: string) => t.split('\n').find(l => l.trim().startsWith(prefix))!.trim().slice(prefix.length).split(/, |=/).filter(n => n !== 'me');
  const whole = order(rw2Text(p.request), RW2_PREFIXES.rank).filter(n => !gone.includes(n));
  assert.deepEqual(order(text, RW2_PREFIXES.rank), whole);
  const asked: KernelRequest[] = [], last = { id: 'last', label: 'last', decide: (r: KernelRequest) => { asked.push(r); const n = r.options.length; return { index: n - 1, probabilities: r.options.map((_, i) => (i + 1) / (n * (n + 1) / 2)) }; } };
  const answer = await fanOutKernel(last, 'fan2', { narrow: narrowRw2Request }).decide(p.request, { random: mulberry32(3) });
  assert.equal(answer.calls, fanCalls('fan2', 13)); assert.equal(answer.calls, 3); assert.equal(asked.length, 3);
  assert.ok(asked.every(r => r.options.length <= 8 && rw2RequestError(r) === '') && answer.index >= 0 && answer.index < 13);
  const small = buildRw2Packet(wide(6)).request;
  assert.equal((await fanOutKernel(last, 'fan2', { narrow: narrowRw2Request }).decide(small, { random: mulberry32(3) })).calls, 1);
  assert.equal(orderLine('x: ', [{ name: 'A', rank: 2 }, { name: 'B', rank: 0 }, { name: 'C', rank: 2 }, { name: 'D', rank: 1, above: true }], true), 'x: D, me, A=C');
  assert.equal(orderLine('x: ', [{ name: 'A', rank: 0 }]), '');
});

// ---------------------------------------------------------------------------------------------------- rules and scores

test('rules: each registered rule picks what its definition says', async () => {
  const top = async (rec: Rw2Record, id: string, view: 'own' | 'third' | 'lookahead' = RW2_RULES[rec.dataset][id].view) => {
    const p = buildRw2Packet(rec, { view }), a = await rw2RuleKernel(rec.dataset, id).decide(p.request, { random: () => 0 }), max = Math.max(...a.probabilities!);
    return a.probabilities!.flatMap((v, i) => v >= max - 1e-12 ? [Number(p.order[i])] : []).sort((x, y) => x - y);
  };
  //            0: top rank        1: just above me     2: just below me, past partner   3: bottom, strongest bond, same sex        4: aggression, infant
  const t = tai([{ rank: 1, above: true, bond: 4, sex: 'f', thirdMax: 1, thirdMean: 2 }, { rank: 2, above: true, bond: 3, sex: 'f', thirdMax: 2, thirdMean: 1 }, { rank: 3, bond: 2, past: 1, sex: 'f', thirdMax: 3, thirdMean: 3 },
    { rank: 5, bond: 1, sex: 'm', lastToday: true, past: 2, thirdMax: 5, thirdMean: 4 }, { rank: 4, bond: 5, aggr: true, state: 'infant', sex: 'f', thirdMax: 4, thirdMean: 5 }]);
  assert.deepEqual(await top(t, 'rank-high'), [0]); assert.deepEqual(await top(t, 'rank-near'), [1, 2]); assert.deepEqual(await top(t, 'bond-high'), [3]);
  assert.deepEqual(await top(t, 'past-partner'), [2]); assert.deepEqual(await top(t, 'last-today'), [3]); assert.deepEqual(await top(t, 'same-sex'), [3]);
  assert.deepEqual(await top(t, 'aggression'), [4]); assert.deepEqual(await top(t, 'young-infant'), [4]); assert.deepEqual(await top(t, 'stack-own'), [2]);
  assert.deepEqual(await top(t, 'third-max-low'), [3]); assert.deepEqual(await top(t, 'third-mean-low'), [4]); assert.deepEqual(await top(t, 'stack-third'), [2]);
  // with no history the stacks fall to their next terms
  const fresh = tai([{ rank: 2, thirdMean: 1 }, { rank: 1, above: true, thirdMean: 1 }, { rank: 3, thirdMean: 2, lastToday: true }]);
  assert.deepEqual(await top(fresh, 'stack-own'), [2]); assert.deepEqual(await top(fresh, 'stack-third'), [2]); assert.deepEqual(await top(fresh, 'past-partner'), [0, 1, 2]);
  await assert.rejects(async () => rw2RuleKernel('tai-groom', 'third-mean-low').decide(buildRw2Packet(t).request, { random: () => 0 }), /needs the third view/);
  const k = fox([{ assoc: 2, near: 1, rank: 3, rankNow: 2, allied: 0, aggressor: 2, assocNow: 3 }, { assoc: 1, near: 3, rank: 2, rankNow: 1, groomed: true, groomDur: 2, aggressor: 1, assocNow: 2 }, { assoc: 3, near: 2, rank: 1, rankNow: 3, kin: true, groomed: true, groomDur: 1, assocNow: 1 },
    { assoc: 0, near: 0, known: false, newcomer: true, rank: 0, rankNow: 4, allied: 1, assocNow: 4 }]);
  assert.deepEqual(await top(k, 'assoc-prev'), [1]); assert.deepEqual(await top(k, 'near-prev'), [0]); assert.deepEqual(await top(k, 'groomed-prev'), [1, 2]); assert.deepEqual(await top(k, 'groomdur-prev'), [2]);
  assert.deepEqual(await top(k, 'kin'), [2]); assert.deepEqual(await top(k, 'rank-high'), [2]); assert.deepEqual(await top(k, 'resident'), [0, 1, 2]); assert.deepEqual(await top(k, 'allied-before'), [3]);
  assert.deepEqual(await top(k, 'frequent-aggressor'), [1]); assert.deepEqual(await top(k, 'stack'), [3]); assert.deepEqual(await top(k, 'assoc-now'), [2]); assert.deepEqual(await top(k, 'rank-now'), [1]);
  await assert.rejects(async () => rw2RuleKernel('kanyawara-coalition', 'assoc-now').decide(buildRw2Packet(k).request, { random: () => 0 }), /needs the lookahead view/);
  await assert.rejects(async () => rw2RuleKernel('kanyawara-coalition', 'rank-now').decide(buildRw2Packet(k).request, { random: () => 0 }), /needs the lookahead view/);
  await assert.rejects(async () => rw2RuleKernel('tai-groom', 'rank-high').decide(buildRw2Packet(k).request, { random: () => 0 }), /takes a tai-groom request/);
  const lines = rw2Lines(buildRw2Packet(k).request);
  assert.equal(lines.history.length, 7); assert.ok(lines.history[0].startsWith(RW2_PREFIXES.rankPrev) && lines.history[3].startsWith(RW2_PREFIXES.groomed) && lines.history[4].startsWith(RW2_PREFIXES.unknown));
  assert.equal(lines.history[0].slice(RW2_PREFIXES.rankPrev.length).split(', ').length, 3, 'the option without a rank in the previous period is not in the rank line');
  assert.equal(rw2Lines(buildRw2Packet({ ...k, focal: { sex: 'f', newcomer: false, bonds: false } }).request).history.length, 2, 'no bond line and no rank line where the data hold no previous period');
});

test('scores: intervals over individuals, equal weight beside pooled, multi-partner records, aggregate output only', async () => {
  const s = (focal: string, tieHit: number): RecordScore => ({ key: `${focal}${Math.random()}`, focal, picked: null, setSize: 4, preceded: 'unknown', partStratum: 'train', refused: '', index: 0, hit: tieHit, tieHit, rr: 1, nll: null, chance: 0.25, relPos: 0, lineCut: false, conf: 1, calls: 1 });
  const st = individualStat([...Array.from({ length: 8 }, () => s('a', 1)), s('b', 0), s('c', 0)], x => x.tieHit, 500);
  assert.equal(st.records, 10); assert.equal(st.individuals, 3); assert.equal(st.pooled.value, 0.8); assert.equal(st.equal.value, 0.333);
  assert.ok(st.pooled.ci[0]! <= 0.8 && st.pooled.ci[1]! >= 0.8 && st.equal.ci[0]! < st.equal.ci[1]!);
  assert.equal(individualStat([], x => x.tieHit).pooled.value, null);
  assert.ok(Math.abs(secondsAt(467) - 0.44) < 1e-9 && Math.abs(secondsAt(934) - 0.44 * 2 ** 1.5) < 1e-9);
  // a trio: two partners among five options, chance 0.4; the rule that ranks both first scores 1
  const trio = fox([{ allied: 1 }, { allied: 1 }, { allied: 0 }, { allied: 0 }, { allied: 0 }], { labels: [0, 1] });
  const records = Array.from({ length: 24 }, (_, i) => ({ ...(i % 3 ? wideFox(i) : trio), key: `r${i}`, chooser: `a${i % 5}` }));
  function wideFox(i: number): Rw2Record { return fox(Array.from({ length: 9 + (i % 4) }, (_, j) => ({ allied: j === 0 ? 1 : 0, assoc: j + 1 })), { stratum: i % 2 ? 'train' : 'other' }); }
  const o = { dataset: 'kanyawara-coalition' as const, view: 'own' as const, seed: 3, shuffles: 2, reps: 100, distribution: false };
  const allied = await scoreRw2(rw2RuleKernel('kanyawara-coalition', 'allied-before'), records, o), nul = await scoreRw2(nullKernel, records, { ...o, distribution: true });
  assert.equal(allied.run.summary.top1Ties.pooled.value, 1); assert.equal(allied.run.summary.individuals, 5);
  assert.ok(Math.abs(nul.run.summary.top1Ties.pooled.value! - nul.run.summary.chance.pooled.value!) < 1e-9, 'the null kernel, ties split, is chance exactly');
  assert.deepEqual(cutsOf('kanyawara-coalition', records).map(c => c[0]).slice(0, 2), ['8 options or fewer', 'more than 8 options']);
  assert.ok(allied.run.cuts.some(c => c.cut === 'pair coalitions' && c.summary.records === 16));
  const sizes = sizeReport(records, 'own', 3);
  assert.equal(sizes.wide, 16); assert.equal(sizes.plain.calls, 24); assert.equal(sizes.fan2.calls, 8 + 16 * 3); assert.ok(sizes.fan2.tokens.max < sizes.plain.tokens.max && sizes.plain.seconds > 0);
  const md = markdown({ seed: 3, reps: 100, history: 'all', parts: [{ dataset: 'kanyawara-coalition', part: 'train', bar: 'stack', written: 30, eligible: 24, individuals: 5, leftOut: { 'same-day-repeat': 6 }, sample: null, kernels: [nul.run, allied.run], sizes: [sizes] }] });
  assert.match(md, /24 eligible records from 5 females/); assert.match(md, /6 same-day-repeat/); assert.match(md, /fanned out, \+fan2 \(16 menus wider than 8\)/);
  assert.ok(!/r\d+\b|a[0-4]\b/.test(md.replace(/\ba 95%|\ba bootstrap|\ba rule|\ba model|\ba difference/g, '')), 'no record key and no individual label in the report');
});

test('compromised lists: the first entry and further label sources are read, and applied by label source', () => {
  const json = { labelSource: 'field choices, Ngogo male grooming', decision: 'x', targets: [{ id: 'T-SOC-1', overlap: 'B', reason: 'r' }],
    sources: [{ labelSource: 'field choices, Tai first grooming partner', decision: 'y', targets: [{ id: 'T-HUN-9', overlap: 'C', reason: 'r' }], flagged: [{ id: 'T-BRD-1', overlap: 'C' }] }, { nothing: true }] };
  const lists = compromisedLists(json);
  assert.equal(lists.length, 2);
  const marks = (labelSources: string[]) => lists.flatMap(l => [...compromisedFor({ labelSources }, l).keys()]);
  assert.deepEqual(marks(['field choices, Tai first grooming partner']), ['T-HUN-9']); assert.deepEqual(marks(['field choices, ngogo male grooming']), ['T-SOC-1']); assert.deepEqual(marks(['the rules']), []);
  assert.deepEqual(compromisedLists(JSON.parse(readFileSync('data/rw-compromised.json', 'utf8'))).map(l => l.labelSource), ['field choices, Ngogo male grooming']);
});

test('GLiNER path: stage RW\'s adapter is sent the RW2 text packet (a fake worker; no model)', async () => {
  const { glinerKernel } = await import('../scripts/lib/kernels'), { batchingScorer, WILD_TOKEN_BUDGET } = await import('../scripts/lib/rw-serialize');
  const sent: { adapter: string; packet: { state: Record<string, unknown>; questions: { action: { instructions: string; criteria: Record<string, string> } } } }[] = [];
  const worker = { score: async (batch: { adapter: string; packet: unknown }[]) => batch.map(b => { sent.push(b as typeof sent[number]); const n = Object.keys((b as typeof sent[number]).packet.questions.action.criteria).length; return Array.from({ length: n }, (_, i) => (i === 1 ? 2 : 1) / (n + 1)); }) };
  const kernel = glinerKernel(batchingScorer(worker as Parameters<typeof batchingScorer>[0]), 'base', { packet: buildRw2Question, budget: WILD_TOKEN_BUDGET });
  const records = [wide(6), wide(13), tai([{ rank: 1 }, { rank: 2, above: true }], { key: 'two' })];
  const plain = await scoreRw2(kernel, records, { dataset: 'tai-groom', view: 'own', seed: 1, shuffles: 1, reps: 20, distribution: true });
  assert.equal(plain.run.summary.refused, 0); assert.equal(sent.length, 3); assert.ok(plain.first.every(s => s.index === 1 && s.conf !== null));
  assert.deepEqual(Object.keys(sent[0].packet.state), ['me', 'now', 'nearby', 'history']); assert.ok(sent.every(b => b.adapter === 'base' && Object.values(b.packet.questions.action.criteria).every(c => /^Groom [A-Z][a-z]{3}$/.test(c))));
  const fanned = await scoreRw2(fanOutKernel(kernel, 'fan2', { narrow: narrowRw2Request }), records, { dataset: 'tai-groom', view: 'own', seed: 1, shuffles: 1, reps: 20, distribution: false });
  assert.equal(fanned.run.cost[0].kernelCalls, 1 + 3 + 1); assert.equal(fanned.run.summary.refused, 0);
});
