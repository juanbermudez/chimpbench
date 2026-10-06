// Stage RW (Track R): wild choice records from the Ngogo adult-male focal scans (Sandel et al. 2026, Science,
// doi:10.1126/science.adz4944; data Dryad doi:10.5061/dryad.sf7m0cgkg, CC0). Registration: docs/staging/rw-prereg.md.
//
//   pnpm exec tsx scripts/rw-ngogo-choices.ts [--out artifacts/rw] [--md docs/staging/rw-numbers.md] [--unseal]
//
// Turns the CSV into grooming-partner choice records with their available sets and exclusion reasons, and scores the
// registered simple baselines on the train and development parts. Nothing here fits or trains anything.
// Privacy: data/raw is private. Individual-level output (records, per-animal counts) goes to --out (gitignored);
// --md writes aggregate counts and rates only (no animal code, no date finer than a year).
// Three parts (rule fixed in the registration before any baseline was computed), with h = the hash below of the focal
// animal's code: held out when the year is 2016 or later or h is 0; development when not held out and the year is 2014
// or 2015 or h is 1; train otherwise. Without --unseal every outcome field of a held-out row is blanked at load, so no
// statistic can depend on it; only rows, scans, sessions and animals are counted.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mulberry32 } from '../src/compare/sampling';

export const HELD_OUT_FROM_YEAR = 2016, DEV_FROM_YEAR = 2014, HELD_OUT_SALT = 'rw-heldout-v1:';
export const PART_RULE = `h = int(sha256("${HELD_OUT_SALT}" + lowercase(code))[:8], 16) % 5; held-out: year >= ${HELD_OUT_FROM_YEAR} or h == 0; development: not held out, and year >= ${DEV_FROM_YEAR} or h == 1; train: the rest.`;
export const hashOf = (code: string) => parseInt(createHash('sha256').update(HELD_OUT_SALT + code.trim().toLowerCase()).digest('hex').slice(0, 8), 16) % 5;
export const heldOutFocal = (code: string) => hashOf(code) === 0;
export const isHeldOut = (r: { code: string; year: number }) => r.year >= HELD_OUT_FROM_YEAR || heldOutFocal(r.code);
export const PARTS = ['train', 'development', 'held-out'] as const;
export type Part = typeof PARTS[number];
export const partOf = (r: { code: string; year: number }): Part => isHeldOut(r) ? 'held-out' : r.year >= DEV_FROM_YEAR || hashOf(r.code) === 1 ? 'development' : 'train';
/** The part, split by why a session is in it (unseen animal or later years). */
export const stratumOf = (r: { code: string; year: number }): string => { const p = partOf(r), h = hashOf(r.code);
  return p === 'train' ? p : p === 'development' ? (h === 1 ? 'development: unseen animals, 1998-2015' : 'development: seen animals, 2014-2015')
    : r.year < HELD_OUT_FROM_YEAR ? 'held-out: unseen animals, 1998-2015' : h === 0 ? 'held-out: unseen animals, 2016-2022' : 'held-out: seen animals, 2016-2022'; };

// ------------------------------------------------------------------------------------------------ rows

export interface Row {
  date: string; code: string; year: number; focalId: string; scanId: number;
  prox2: string | null; prox5: string | null; gdyad: string | null; party: string | null;
  grooming: string | null; groomer: string | null; groomee: string | null;
}

/** RFC 4180 reader (quoted fields hold the comma-separated lists). */
export function parseCsv(text: string): Record<string, string>[] {
  const out: string[][] = []; let row: string[] = [], f = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') out.push(row); row = []; }
    else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); out.push(row); }
  const [h, ...rest] = out;
  return rest.map(v => Object.fromEntries(h.map((k, i) => [k.trim(), v[i] ?? ''])));
}

const na = (v: string | undefined) => { const t = (v ?? '').trim(); return t === '' || t === 'NA' ? null : t; };
export function toRows(raw: Record<string, string>[]): Row[] {
  return raw.map(r => ({ date: r.date.trim(), code: r.code.trim().toLowerCase(), year: +r.year, focalId: r.focal_id.trim(), scanId: +r.scan_id,
    prox2: na(r.prox2), prox5: na(r.prox5), gdyad: na(r.gdyad), party: na(r.party), grooming: na(r.grooming), groomer: na(r.groomer), groomee: na(r.groomee) }));
}
/** Blanks every outcome field of the held-out rows (the default): what is left can only be counted. */
export const seal = (rows: Row[]): Row[] => rows.map(r => isHeldOut(r) ? { ...r, prox2: null, prox5: null, gdyad: null, party: null, grooming: null, groomer: null, groomee: null } : r);

/** List field to lower-case tokens; empty tokens (trailing commas) are dropped. */
export const tokens = (v: string | null) => v === null ? [] : v.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');

export interface Dyad { from: string; to: string; mutual: boolean }
/** `gdyad`: dyads separated by "/"; "a,b" = a grooms b; "a=b" = mutual (both directions). Returns the unparsed part count. */
export function parseDyads(gdyad: string | null): { dyads: Dyad[]; unparsed: number } {
  const dyads: Dyad[] = []; let unparsed = 0;
  if (gdyad === null) return { dyads, unparsed };
  for (const part of gdyad.split('/')) {
    const mutual = part.includes('='), t = part.split(mutual ? '=' : ',').map(x => x.trim().toLowerCase());
    if (t.length !== 2 || !t[0] || !t[1] || t[0] === t[1]) { unparsed++; continue; }
    dyads.push({ from: t[0], to: t[1], mutual });
    if (mutual) dyads.push({ from: t[1], to: t[0], mutual });
  }
  return { dyads, unparsed };
}

// ------------------------------------------------------------------------------------------------ sessions

export interface Scan { id: number; proxRecorded: boolean; prox2: string[]; prox5: string[]; dyads: Dyad[]; gives: string[]; receives: string[]; unparsed: number; textOnly: boolean; rows: number }
export interface Session { id: string; focal: string; year: number; day: number; party: string[] | null; partySelf: boolean; scans: Scan[] }

/** Day key for ordering only (never written to a committed file). The order of the month and day fields is detected. */
export function dayKeys(rows: Row[]): Map<string, number> {
  let a = 0, b = 0;
  const parts = new Map<string, number[]>();
  for (const r of rows) if (!parts.has(r.date)) { const p = r.date.split(/[/-]/).map(Number); parts.set(r.date, p); a = Math.max(a, p[0]); b = Math.max(b, p[1]); }
  if (a > 12 && b > 12) throw new Error('date fields: neither of the first two is a month');
  const monthFirst = a <= 12;   // if both are ≤ 12 the file gives no way to tell; month first is the US convention of the source
  const out = new Map<string, number>();
  for (const [d, p] of parts) out.set(d, (monthFirst ? p[0] : p[1]) * 100 + (monthFirst ? p[1] : p[0]));
  return out;
}

const uniq = <T>(a: T[]) => [...new Set(a)];
export function buildSessions(rows: Row[]): Session[] {
  const md = dayKeys(rows), by = new Map<string, Row[]>();
  for (const r of rows) (by.get(r.focalId) ?? by.set(r.focalId, []).get(r.focalId)!).push(r);
  const out: Session[] = [];
  for (const [id, rs] of by) {
    const focal = rs[0].code, year = rs[0].year;
    if (rs.some(r => r.code !== focal || r.date !== rs[0].date)) throw new Error(`session ${id}: more than one focal animal or date`);
    const partyRaw = rs.find(r => r.party !== null)?.party ?? null, pt = tokens(partyRaw);
    const scans: Scan[] = [];
    for (const sid of uniq(rs.map(r => r.scanId)).sort((x, y) => x - y)) {
      const g = rs.filter(r => r.scanId === sid);
      const dy = new Map<string, Dyad>(); let unparsed = 0;
      for (const r of g) {
        const p = parseDyads(r.gdyad); unparsed = Math.max(unparsed, p.unparsed);
        // `gdyad` is the record; the groomer/groomee pair of a row is used only when `gdyad` is empty
        const ds = p.dyads.length || r.gdyad !== null || !r.groomer || !r.groomee ? p.dyads : [{ from: r.groomer.toLowerCase(), to: r.groomee.toLowerCase(), mutual: false }];
        for (const d of ds) if (d.from !== d.to) dy.set(`${d.from}>${d.to}`, d);
      }
      const dyads = [...dy.values()], p2 = g.find(r => r.prox2 !== null)?.prox2 ?? null, p5 = g.find(r => r.prox5 !== null)?.prox5 ?? null;
      scans.push({ id: sid, proxRecorded: p2 !== null || p5 !== null, prox2: uniq(tokens(p2)).filter(t => t !== focal), prox5: uniq(tokens(p5)).filter(t => t !== focal), dyads,
        gives: uniq(dyads.filter(d => d.from === focal).map(d => d.to)), receives: uniq(dyads.filter(d => d.to === focal).map(d => d.from)),
        unparsed, textOnly: dyads.length === 0 && g.some(r => r.grooming !== null), rows: g.length });
    }
    out.push({ id, focal, year, day: year * 10000 + md.get(rs[0].date)!, party: partyRaw === null ? null : uniq(pt).filter(t => t !== focal), partySelf: pt.includes(focal), scans });
  }
  return out.sort((x, y) => x.day - y.day || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** Runs of consecutive scans (scan numbers one apart) of each directed dyad in a session: one run is one bout. */
export interface Run { from: string; to: string; start: number; end: number; length: number }
export function runs(s: Session): Run[] {
  const open = new Map<string, Run>(), out: Run[] = [];
  for (const sc of s.scans) for (const d of sc.dyads) {
    const k = `${d.from}>${d.to}`, o = open.get(k);
    if (o && o.end === sc.id - 1) { o.end = sc.id; o.length++; }
    else { const n = { from: d.from, to: d.to, start: sc.id, end: sc.id, length: 1 }; open.set(k, n); out.push(n); }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ choice records

export const EXCLUSIONS = ['partner-not-a-mature-male', 'no-party-record', 'party-under-2-males', 'partner-outside-party', 'partner-focal-in-another-part-that-day'] as const;
export type Exclusion = typeof EXCLUSIONS[number];
export const SET_KINDS = ['party', 'proxPrev', 'union'] as const;
export type SetKind = typeof SET_KINDS[number];
export interface ChoiceRecord {
  session: string; focal: string; year: number; day: number; part: Part; partStratum: string;
  /** Decision scan (first scan of the bout) and bout length in scans. */
  scan: number; length: number;
  /** Every partner whose bout starts at this scan, and those of them on the roster of mature males. */
  labels: string[]; maleLabels: string[];
  /** The bout was already under way at the session's first scan (its start was not seen). */
  atFirstScan: boolean; hasPrevScan: boolean;
  /** fresh: the focal neither gave nor received grooming at the previous scan; continuation: he did; unknown: no previous scan. */
  stratum: 'fresh' | 'continuation' | 'unknown';
  firstOfSession: boolean; firstOfSessionPartner: boolean;
  sets: Record<SetKind, string[] | null>;
  exclusion: Exclusion | null;
  /** Diagnostic only (never an input): is a male label listed within 2 m / in the 5 m ring at the decision scan itself. */
  labelInProx2Now: boolean; labelInProx5Now: boolean;
  /** Filled by score(): expected top-1 accuracy of each baseline (ties split evenly). */
  base?: Record<string, number>;
  /** Filled by score(): the focal and a male label groomed each other (either direction) before the decision scan. */
  labelGroomedBefore?: boolean;
}

/**
 * One record per bout of grooming GIVEN by the focal animal; bouts that start at the same scan are one record with
 * several labels. The available set is the session's `party` list restricted to the roster and without the focal; the
 * label is never used to build a set. Exclusions apply in the order of `EXCLUSIONS`. The last one (the same bout may be
 * written in a session of another part: the partner is a focal animal of another part that day) needs `otherPartSameDay`,
 * which is built from codes and days only.
 */
export function extractRecords(s: Session, roster: Set<string>, otherPartSameDay?: (focal: string, label: string, day: number) => boolean): ChoiceRecord[] {
  const out: ChoiceRecord[] = [], mine = runs(s).filter(r => r.from === s.focal), first = s.scans[0]?.id, seen = new Set<string>();
  const male = (a: string[]) => a.filter(t => roster.has(t) && t !== s.focal);
  for (const start of uniq(mine.map(r => r.start)).sort((a, b) => a - b)) {
    const rs = mine.filter(r => r.start === start), labels = rs.map(r => r.to), maleLabels = male(labels);
    const prev = s.scans.find(x => x.id === start - 1), now = s.scans.find(x => x.id === start)!;
    const party = s.party === null ? null : male(s.party);
    const before = s.scans.filter(x => x.id < start);
    const union = uniq(male([...(s.party ?? []), ...before.flatMap(x => [...x.prox2, ...x.prox5, ...x.dyads.flatMap(d => [d.from, d.to])])]));
    const exclusion: Exclusion | null = !maleLabels.length ? 'partner-not-a-mature-male' : party === null ? 'no-party-record' : party.length < 2 ? 'party-under-2-males'
      : !maleLabels.some(l => party.includes(l)) ? 'partner-outside-party' : otherPartSameDay && maleLabels.some(l => otherPartSameDay(s.focal, l, s.day)) ? 'partner-focal-in-another-part-that-day' : null;
    out.push({ session: s.id, focal: s.focal, year: s.year, day: s.day, part: partOf({ code: s.focal, year: s.year }), partStratum: stratumOf({ code: s.focal, year: s.year }), scan: start, length: Math.max(...rs.map(r => r.length)), labels, maleLabels,
      atFirstScan: start === first, hasPrevScan: !!prev, stratum: !prev ? 'unknown' : prev.gives.length || prev.receives.length ? 'continuation' : 'fresh',
      firstOfSession: out.length === 0, firstOfSessionPartner: !labels.some(l => seen.has(l)),
      sets: { party, proxPrev: prev && prev.proxRecorded ? male([...prev.prox2, ...prev.prox5]) : null, union }, exclusion,
      labelInProx2Now: maleLabels.some(l => now.prox2.includes(l)), labelInProx5Now: maleLabels.some(l => now.prox5.includes(l)) });
    for (const l of labels) seen.add(l);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ history and baselines

const pair = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
export const BASELINES = ['chance', 'pastGiven', 'pastEither', 'lastPartner', 'nearestPrev', 'groomedMePrev', 'pastNeighbour', 'pastParty', 'stack', 'listedFirst'] as const;

/** Expected top-1 accuracy of "pick the best-scored member", ties split evenly. Scores compare lexicographically. */
export function expectedHit(set: string[], labels: string[], score: (b: string) => number[]): number {
  let best: number[] | null = null, top: string[] = [];
  for (const b of set) {
    const v = score(b); let c = 0;
    if (best) for (let i = 0; i < v.length && c === 0; i++) c = v[i] - best[i];
    if (!best || c > 0) { best = v; top = [b]; } else if (c === 0) top.push(b);
  }
  return top.length ? top.filter(b => labels.includes(b)).length / top.length : 0;
}

/** What preceded one eligible record's decision scan, as the baselines read it (the wild packet is built from this; stage RW bench). */
export interface RecordView {
  /** The available set (the party's roster males without the focal), in the order the observer wrote it. */
  set: string[];
  /** The previous scan of the session, if there is one, and every bout of the session that started before the decision scan. */
  prev: Scan | undefined; earlier: Run[];
  /** Bouts of grooming the focal gave to / received from b, and scans with b within 5 m, before the decision scan. */
  given(b: string): number; received(b: string): number; near(b: string): number;
  /** At the previous scan: 2 within 2 m, 1 in the 2 to 5 m ring, 0 further or unknown; 1 if b was grooming the focal. */
  dist(b: string): number; invited(b: string): number;
}
export interface ScoreOptions {
  /** Called once per eligible record, after its baselines are scored. The view's functions are valid only during the call. */
  onEligible?: (r: ChoiceRecord, view: RecordView) => void;
  /** Which sessions feed the history of later days (default: all passed in). A session that does not feed is still scored. */
  feeds?: (s: Session) => boolean;
}

/**
 * Scores every eligible record with the registered baselines, using only what precedes its decision scan: sessions of
 * earlier DAYS (the file has no clock time, so other sessions of the same day are left out) and earlier scans of its
 * own session. Histories are built from the sessions passed in, so a sealed run uses train and development sessions only.
 */
export function score(sessions: Session[], roster: Set<string>, otherPartSameDay?: (focal: string, label: string, day: number) => boolean, opts: ScoreOptions = {}): ChoiceRecord[] {
  const given = new Map<string, number>(), lastDay = new Map<string, number>(), near = new Map<string, number>(), together = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
  const all: ChoiceRecord[] = [];
  const ordered = [...sessions].sort((a, b) => a.day - b.day);
  for (let i = 0; i < ordered.length;) {
    let j = i; while (j < ordered.length && ordered[j].day === ordered[i].day) j++;
    const today = ordered.slice(i, j);
    for (const s of today) {
      const rs = runs(s);
      for (const r of extractRecords(s, roster, otherPartSameDay)) {
        all.push(r);
        const S = r.sets.party;
        if (r.exclusion || !S) continue;
        const f = r.focal, earlier = rs.filter(x => x.start < r.scan), before = s.scans.filter(x => x.id < r.scan), prev = s.scans.find(x => x.id === r.scan - 1);
        const g = (a: string, b: string) => (given.get(`${a}>${b}`) ?? 0) + earlier.filter(x => x.from === a && x.to === b).length;
        const last = (b: string) => { const here = earlier.filter(x => x.from === f && x.to === b).map(x => x.start); return here.length ? 1e9 + Math.max(...here) : lastDay.get(`${f}>${b}`) ?? -1; };
        const dist = (b: string) => !prev || !prev.proxRecorded ? 0 : prev.prox2.includes(b) ? 2 : prev.prox5.includes(b) ? 1 : 0;
        const invited = (b: string) => prev && prev.receives.includes(b) ? 1 : 0;
        const nb = (b: string) => (near.get(pair(f, b)) ?? 0) + before.filter(x => x.prox2.includes(b) || x.prox5.includes(b)).length;
        const hit = (fn: (b: string) => number[]) => expectedHit(S, r.maleLabels, fn);
        r.base = { chance: hit(() => [0]), pastGiven: hit(b => [g(f, b)]), pastEither: hit(b => [g(f, b) + g(b, f)]), lastPartner: hit(b => [last(b)]),
          nearestPrev: hit(b => [dist(b)]), groomedMePrev: hit(b => [invited(b)]), pastNeighbour: hit(b => [nb(b)]), pastParty: hit(b => [together.get(pair(f, b)) ?? 0]),
          stack: hit(b => [invited(b), dist(b), g(f, b) + g(b, f)]),
          // not a behavioural rule: a check that the order in which the observer wrote the party does not give the answer away
          listedFirst: hit(b => [-S.indexOf(b)]) };
        r.labelGroomedBefore = r.maleLabels.some(b => S.includes(b) && g(f, b) + g(b, f) > 0);
        opts.onEligible?.(r, { set: S, prev, earlier, given: b => g(f, b), received: b => g(b, f), near: nb, dist, invited });
      }
    }
    for (const s of today) {
      if (opts.feeds && !opts.feeds(s)) continue;
      for (const r of runs(s)) { bump(given, `${r.from}>${r.to}`); lastDay.set(`${r.from}>${r.to}`, s.day); }
      for (const sc of s.scans) for (const b of uniq([...sc.prox2, ...sc.prox5])) bump(near, pair(s.focal, b));
      for (const b of s.party ?? []) bump(together, pair(s.focal, b));
    }
    i = j;
  }
  return all;
}

// ------------------------------------------------------------------------------------------------ summaries

const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const quant = (a: number[], q: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, lo = Math.floor(p); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (p - lo); };
const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
const dist5 = (a: number[]) => ({ n: a.length, min: r3(quant(a, 0)), q25: r3(quant(a, 0.25)), median: r3(quant(a, 0.5)), q75: r3(quant(a, 0.75)), max: r3(quant(a, 1)), mean: r3(mean(a)) });

/** Pooled accuracy per baseline with a cluster bootstrap over focal animals (the independent unit). */
export function baselineTable(recs: ChoiceRecord[], reps = 2000, seed = 20261006) {
  const byFocal = new Map<string, ChoiceRecord[]>();
  for (const r of recs) (byFocal.get(r.focal) ?? byFocal.set(r.focal, []).get(r.focal)!).push(r);
  const groups = [...byFocal.values()], rng = mulberry32(seed), draws: number[][] = [];
  for (let k = 0; k < reps; k++) draws.push(groups.map(() => Math.floor(rng() * groups.length)));
  const out: Record<string, { perRecord: number | null; ci: (number | null)[]; perAnimal: number | null; minusChance: number | null; minusChanceCi: (number | null)[] }> = {};
  for (const b of BASELINES) {
    const sums = groups.map(g => [g.reduce((x, r) => x + r.base![b], 0), g.reduce((x, r) => x + r.base!.chance, 0), g.length]);
    const pooled = (ix: number[]) => { let h = 0, c = 0, n = 0; for (const i of ix) { h += sums[i][0]; c += sums[i][1]; n += sums[i][2]; } return [h / n, (h - c) / n]; };
    const bs = draws.map(pooled), full = pooled(groups.map((_, i) => i));
    out[b] = { perRecord: r3(full[0]), ci: [r3(quant(bs.map(x => x[0]), 0.025)), r3(quant(bs.map(x => x[0]), 0.975))], perAnimal: r3(mean(sums.map(s => s[0] / s[2]))),
      minusChance: r3(full[1]), minusChanceCi: [r3(quant(bs.map(x => x[1]), 0.025)), r3(quant(bs.map(x => x[1]), 0.975))] };
  }
  return { records: recs.length, animals: groups.length, baselines: out };
}

const count = <T>(a: T[], key: (x: T) => string | number) => { const m: Record<string, number> = {}; for (const x of a) { const k = String(key(x)); m[k] = (m[k] ?? 0) + 1; } return m; };
const share = (n: number, d: number) => d ? r3(n / d) : null;

/** Sources in data/targets.json that share records or animals with this dataset (the classification is the registration's). */
export const LEAK_SOURCES: Record<string, string[]> = {
  'A. same data package (Sandel et al. 2026)': ['sandel2026'],
  'B. same focal protocol and males, 1998-2007, probably the same records': ['mitani2009'],
  'C. same males, other records (kinship, fission, subgroups, patrols, hunting, killings)': ['langergraber2007', 'sandelWatts2021', 'mitaniAmsler2003', 'langergraber2017', 'mitaniWatts2005', 'wattsMitani2001', 'watts2006', 'mitani2010', 'amsler2010', 'wattsMitani2002', 'mitaniWatts1999', 'mitaniWatts2001', 'sobolewski2012', 'sobolewski2013', 'wood2025'],
};
const OTHER_NGOGO = 'D. same community (a field value from Ngogo), other records';
interface TargetsFile { targets: { id: string; role?: string; sources?: string[]; field?: { population?: string; source?: string }[] }[] }
/** Each target appears once, under the closest overlap. Class D is every other target with a field value from Ngogo. */
export function leakage(file: TargetsFile): Record<string, string[]> {
  const out: Record<string, string[]> = { ...Object.fromEntries(Object.keys(LEAK_SOURCES).map(k => [k, [] as string[]])), [OTHER_NGOGO]: [] };
  for (const t of file.targets) {
    const src = [...(t.sources ?? []), ...(t.field ?? []).map(f => f.source ?? '')];
    const k = Object.keys(LEAK_SOURCES).find(c => src.some(s => LEAK_SOURCES[c].includes(s))) ?? ((t.field ?? []).some(f => /ngogo/i.test(f.population ?? '')) ? OTHER_NGOGO : null);
    if (k) out[k].push(`${t.id} (${t.role ?? '?'})`);
  }
  return out;
}

function taskA(recs: ChoiceRecord[], sessions: Session[], reps: number) {
  const elig = recs.filter(r => !r.exclusion), maleRecs = recs.filter(r => r.maleLabels.length);
  const order: (Exclusion | 'eligible')[] = [...EXCLUSIONS, 'eligible'], ex = count(recs, r => r.exclusion ?? 'eligible');
  let left = recs.length;
  const funnel = order.map(k => { const n = ex[k] ?? 0, row = { step: k, records: n, remainingBefore: left }; if (k !== 'eligible') left -= n; return row; });
  const coverage = Object.fromEntries(SET_KINDS.map(k => {
    const have = maleRecs.filter(r => r.sets[k] !== null && (k !== 'union' || r.sets[k]!.length > 0)), inSet = have.filter(r => r.maleLabels.some(l => r.sets[k]!.includes(l)));
    return [k, { maleLabelRecords: maleRecs.length, setRecorded: have.length, setRecordedShare: share(have.length, maleRecs.length), labelInSet: inSet.length, labelInSetShare: share(inSet.length, have.length), labelOutsideSetShare: share(have.length - inSet.length, have.length), size: dist5(have.map(r => r.sets[k]!.length)) }];
  }));
  const sizes = elig.map(r => r.sets.party!.length), pa = Object.values(count(elig, r => r.focal));
  const years = uniq(sessions.map(s => s.year)).sort();
  const perYear = years.map(y => { const e = elig.filter(r => r.year === y), ss = sessions.filter(s => s.year === y);
    return { year: y, sessions: ss.length, scans: ss.reduce((a, s) => a + s.scans.length, 0), animals: new Set(ss.map(s => s.focal)).size, boutsGiven: recs.filter(r => r.year === y).length, eligible: e.length,
      animalsWithEligible: new Set(e.map(r => r.focal)).size, medianSet: r3(quant(e.map(r => r.sets.party!.length), 0.5)), chance: r3(mean(e.map(r => r.base!.chance))), pastEither: r3(mean(e.map(r => r.base!.pastEither))), stack: r3(mean(e.map(r => r.base!.stack))) }; });
  const cuts: Record<string, ChoiceRecord[]> = { 'bout (primary)': elig, 'first bout with each partner in a session': elig.filter(r => r.firstOfSessionPartner), 'first bout of a session': elig.filter(r => r.firstOfSession),
    'fresh (no grooming at the previous scan)': elig.filter(r => r.stratum === 'fresh'), 'continuation (grooming at the previous scan)': elig.filter(r => r.stratum === 'continuation'), 'unknown (no previous scan)': elig.filter(r => r.stratum === 'unknown') };
  for (const st of uniq(elig.map(r => r.partStratum)).sort()) if (st !== elig[0]?.part) cuts[st] = elig.filter(r => r.partStratum === st);
  // second score: a record whose male partner is outside the party counts as a miss for every rule
  const missIncl = recs.filter(r => r.exclusion === null || r.exclusion === 'partner-outside-party');
  return { sessions: sessions.length, boutsGivenByFocal: recs.length, boutsReceivedOnly: sessions.reduce((a, s) => a + runs(s).filter(r => r.to === s.focal).length, 0), boutLengthScans: dist5(recs.map(r => r.length)),
    multiLabel: recs.filter(r => r.labels.length > 1).length, atFirstScan: share(recs.filter(r => r.atFirstScan).length, recs.length), funnel, coverage,
    setSize: { ...dist5(sizes), q10: r3(quant(sizes, 0.1)), q90: r3(quant(sizes, 0.9)), shareOver8: share(sizes.filter(n => n > 8).length, sizes.length), shareOver7: share(sizes.filter(n => n > 7).length, sizes.length) },
    diagnosticLabelWithin2mAtDecisionScan: share(maleRecs.filter(r => r.labelInProx2Now).length, maleRecs.length), diagnosticLabelIn5mRingAtDecisionScan: share(maleRecs.filter(r => r.labelInProx5Now).length, maleRecs.length),
    eligible: elig.length, eligibleAnimals: pa.length, eligibleDyads: new Set(elig.flatMap(r => r.maleLabels.map(l => `${r.focal}>${l}`))).size, eligibleDistinctPartners: new Set(elig.flatMap(r => r.maleLabels)).size,
    perAnimal: { ...dist5(pa), animalsWith10: pa.filter(n => n >= 10).length, animalsWith30: pa.filter(n => n >= 30).length, animalsWith100: pa.filter(n => n >= 100).length, shareOfRecordsFromTop5Animals: share([...pa].sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0), elig.length) },
    eligibleWithSetOf8OrFewer: sizes.filter(n => n <= 8).length, eligibleIfSameDayRuleDropped: elig.length + (ex['partner-focal-in-another-part-that-day'] ?? 0),
    partnerNeverGroomedBefore: share(elig.filter(r => !r.labelGroomedBefore).length, elig.length),
    eligiblePerSession: share(elig.length, sessions.length), sessionsWithEligible: new Set(elig.map(r => r.session)).size, perYear,
    tables: Object.fromEntries(Object.entries(cuts).map(([k, v]) => [k, baselineTable(v, reps)])),
    countingOutsidePartyAsMiss: { records: missIncl.length, chance: r3(mean(missIncl.map(r => r.base?.chance ?? 0))), pastEither: r3(mean(missIncl.map(r => r.base?.pastEither ?? 0))), stack: r3(mean(missIncl.map(r => r.base?.stack ?? 0))) } };
}

/**
 * What every reader of the file starts from: the roster, the same-day rule (codes and days of every part, no outcome),
 * and the sessions that may be read. Without `unsealed` the held-out rows are blanked and dropped, so nothing built
 * from the result can depend on a held-out outcome.
 */
export function prepare(rows: Row[], unsealed: boolean) {
  const roster = new Set(rows.map(r => r.code));
  // structure only (codes and days of every part): which animals are focal on which day, and in which part
  const md = dayKeys(rows), focalDayPart = new Map<string, Part>();
  for (const r of rows) focalDayPart.set(`${r.code}@${r.year * 10000 + md.get(r.date)!}`, partOf(r));
  const otherPartSameDay = (focal: string, label: string, day: number) => { const p = focalDayPart.get(`${label}@${day}`); return p !== undefined && p !== focalDayPart.get(`${focal}@${day}`); };
  const used = unsealed ? rows : seal(rows).filter(r => !isHeldOut(r));
  return { roster, otherPartSameDay, used, sessions: buildSessions(used) };
}

export function summarize(rows: Row[], unsealed: boolean, reps = 2000) {
  const scanKey = (r: Row) => `${r.focalId}#${r.scanId}`;
  const struct = (rs: Row[]) => ({ rows: rs.length, scans: new Set(rs.map(scanKey)).size, sessions: new Set(rs.map(r => r.focalId)).size, animals: new Set(rs.map(r => r.code)).size });
  const parts: Record<string, ReturnType<typeof struct>> = {};
  for (const p of [...PARTS, ...uniq(rows.map(stratumOf)).sort()]) if (!parts[p]) parts[p] = struct(rows.filter(r => partOf(r) === p || stratumOf(r) === p));
  const { roster, otherPartSameDay, used, sessions } = prepare(rows, unsealed), scans = sessions.flatMap(s => s.scans.map(sc => ({ s, sc })));
  const recs = score(sessions, roster, otherPartSameDay);

  // field filling, per row and per session
  const fill = Object.fromEntries((['prox2', 'prox5', 'gdyad', 'party', 'grooming', 'groomer', 'groomee'] as const).map(k => [k, share(used.filter(r => r[k] !== null).length, used.length)]));
  // prox2 against prox5 on scans where both are recorded
  const both = scans.filter(x => x.sc.prox2.length && x.sc.prox5.length);
  const proxRel = { scansWithBoth: both.length, disjoint: both.filter(x => !x.sc.prox2.some(t => x.sc.prox5.includes(t))).length,
    prox2InsideProx5: both.filter(x => x.sc.prox2.every(t => x.sc.prox5.includes(t))).length, scansOnlyProx2: scans.filter(x => x.sc.prox2.length && !x.sc.prox5.length).length, scansOnlyProx5: scans.filter(x => !x.sc.prox2.length && x.sc.prox5.length).length };
  // who is named: roster males against everyone else (females, immatures, "unknown")
  const tok = (a: string[]) => ({ tokens: a.length, notOnRoster: share(a.filter(t => !roster.has(t)).length, a.length) });
  const named = { prox2: tok(scans.flatMap(x => x.sc.prox2)), prox5: tok(scans.flatMap(x => x.sc.prox5)), party: tok(sessions.flatMap(s => s.party ?? [])),
    groomedByFocal: tok(recs.flatMap(r => r.labels)), sessionsListingTheFocalInHisOwnParty: sessions.filter(s => s.partySelf).length };
  // is the party list a superset of the males seen near the focal? (a second check of the set, independent of grooming)
  const withParty = sessions.filter(s => s.party !== null);
  const nearMales = withParty.flatMap(s => uniq(s.scans.flatMap(sc => [...sc.prox2, ...sc.prox5])).filter(x => roster.has(x)).map((x): number => s.party!.includes(x) ? 1 : 0));
  const partyStats = { sessions: sessions.length, sessionsWithParty: withParty.length, share: share(withParty.length, sessions.length),
    malesInParty: dist5(withParty.map(s => s.party!.filter(t => roster.has(t)).length)), nearbyMalesAlsoInParty: share(nearMales.reduce((a, b) => a + b, 0), nearMales.length), nearbyMaleSessionPairs: nearMales.length };
  // the same bout written twice: the focal's partner is himself focal that day and his session shows the same dyad
  const byFocalDay = new Map<string, Session[]>();
  for (const s of sessions) (byFocalDay.get(`${s.focal}@${s.day}`) ?? byFocalDay.set(`${s.focal}@${s.day}`, []).get(`${s.focal}@${s.day}`)!).push(s);
  const elig = recs.filter(r => !r.exclusion || r.exclusion === 'partner-focal-in-another-part-that-day');
  const partnerFocalToo = elig.filter(r => r.maleLabels.some(l => byFocalDay.has(`${l}@${r.day}`)));
  const twice = partnerFocalToo.filter(r => r.maleLabels.some(l => (byFocalDay.get(`${l}@${r.day}`) ?? []).some(s => s.scans.some(sc => sc.dyads.some(d => d.from === r.focal && d.to === l)))));
  const sameBout = { recordsWithPartyAndPartnerInIt: elig.length, partnerIsFocalThatDay: partnerFocalToo.length, andHisSessionShowsTheSameDyad: twice.length };

  const bySessionPart = (p: string) => sessions.filter(s => partOf({ code: s.focal, year: s.year }) === p);
  const A = Object.fromEntries((unsealed ? PARTS : PARTS.filter(p => p !== 'held-out')).map(p => [p, taskA(recs.filter(r => r.part === p), bySessionPart(p), reps)]));

  // Task B (whether he grooms at a scan) and Task C (who is near): base rates only
  const sp = scans.filter(x => x.s.party !== null && x.s.party.some(t => roster.has(t)));
  const taskB = { scans: scans.length, scansWithAMaleInParty: sp.length, givesGrooming: share(sp.filter(x => x.sc.gives.length).length, sp.length), givesToAMale: share(sp.filter(x => x.sc.gives.some(t => roster.has(t))).length, sp.length),
    receivesOnly: share(sp.filter(x => !x.sc.gives.length && x.sc.receives.length).length, sp.length), groomingAmongOthersOnly: share(sp.filter(x => !x.sc.gives.length && !x.sc.receives.length && x.sc.dyads.length).length, sp.length),
    textButNoDyad: scans.filter(x => x.sc.textOnly).length, unparsedDyadParts: scans.reduce((a, x) => a + x.sc.unparsed, 0), scansWithMoreThanOneRow: scans.filter(x => x.sc.rows > 1).length };
  const taskC = { scansWithAnyProximity: share(scans.filter(x => x.sc.proxRecorded).length, scans.length), within2mWhenRecorded: dist5(scans.filter(x => x.sc.proxRecorded).map(x => x.sc.prox2.length)), ring2to5mWhenRecorded: dist5(scans.filter(x => x.sc.proxRecorded).map(x => x.sc.prox5.length)),
    shareOfPartyMalesWithin5m: r3(mean(sp.map(x => uniq([...x.sc.prox2, ...x.sc.prox5]).filter(t => x.s.party!.includes(t)).length / x.s.party!.filter(t => roster.has(t)).length))) };
  const sameDay = count(Object.values(count(sessions, s => `${s.focal}@${s.day}`)), n => n);
  // projection of the held-out sample from the development rate (the held-out outcomes are not read)
  const rate = A.development ? A.development.eligible / Math.max(1, A.development.sessions) : NaN;
  const projection = unsealed ? null : Object.fromEntries(Object.entries(parts).filter(([k]) => k.startsWith('held-out')).map(([k, v]) => [k, { sessions: v.sessions, animals: v.animals, projectedEligibleBouts: Math.round(v.sessions * rate) }]));
  return { summary: { sealed: !unsealed, rule: PART_RULE, whole: struct(rows), years: uniq(rows.map(r => r.year)).sort(), parts, rosterMales: roster.size,
      analysed: struct(used), fill, sessionsPerAnimalDay: sameDay, proxRel, named, party: partyStats, sameBout, taskA: A, taskB, taskC, projection }, records: recs };
}

// ------------------------------------------------------------------------------------------------ report (aggregates only)

export function markdown(S: ReturnType<typeof summarize>['summary'], leak: Record<string, string[]>, targetCount?: number): string {
  const L: string[] = [], t = (h: string[], rows: (string | number | null)[][]) => { L.push('', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(v => v ?? 'n/a').join(' | ')} |`), ''); };
  const d = (x: ReturnType<typeof dist5>) => `min ${x.min}, quartiles ${x.q25} / ${x.median} / ${x.q75}, max ${x.max}, mean ${x.mean}`;
  const pooled = S.sealed ? 'Train and development parts, pooled' : 'All parts, pooled';
  L.push('# RW: numbers behind the registration (generated)', '', 'Written by `scripts/rw-ngogo-choices.ts --md`; do not edit by hand. Aggregate counts and rates only. Source: Sandel et al. 2026, Dryad doi:10.5061/dryad.sf7m0cgkg (CC0).',
    '', `Held-out part: **${S.sealed ? 'sealed' : 'UNSEALED'}**. Rule: ${S.rule}`, '', '## 1. Structure (the only figures that include held-out rows)');
  t(['part', 'rows', 'scans', 'sessions', 'focal animals'], [['whole file', S.whole.rows, S.whole.scans, S.whole.sessions, S.whole.animals], ...Object.entries(S.parts).map(([k, v]) => [k, v.rows, v.scans, v.sessions, v.animals])]);
  L.push(`Years in the file: ${S.years[0]}–${S.years[S.years.length - 1]} (${S.years.length} years). Roster of mature males (the focal codes): ${S.rosterMales}. A scan with several grooming dyads is stored as several rows, so rows exceed scans.`,
    '', `## 2. ${pooled}: filling and meaning of the fields`);
  t(['field', 'share of rows with a value'], Object.entries(S.fill));
  L.push(`- Party list: recorded for ${S.party.sessionsWithParty} of ${S.party.sessions} sessions (${S.party.share}), on the first scan only. Roster males per list: ${d(S.party.malesInParty)}. The focal names himself in ${S.named.sessionsListingTheFocalInHisOwnParty} lists (dropped).`,
    `- Party as a superset of the males seen near the focal: of ${S.party.nearbyMaleSessionPairs} (session, male within 5 m at some scan) pairs, ${S.party.nearbyMalesAlsoInParty} are in that session's party list.`,
    `- \`prox2\` against \`prox5\`: on ${S.proxRel.scansWithBoth} scans with both, the two lists share no animal on ${S.proxRel.disjoint} and \`prox2\` lies inside \`prox5\` on ${S.proxRel.prox2InsideProx5}; ${S.proxRel.scansOnlyProx2} scans have only \`prox2\`, ${S.proxRel.scansOnlyProx5} only \`prox5\`.`,
    `- Names not on the male roster (females, immatures, "unknown"): ${S.named.prox2.notOnRoster} of ${S.named.prox2.tokens} \`prox2\` names, ${S.named.prox5.notOnRoster} of ${S.named.prox5.tokens} \`prox5\` names, ${S.named.party.notOnRoster} of ${S.named.party.tokens} party names, ${S.named.groomedByFocal.notOnRoster} of ${S.named.groomedByFocal.tokens} partners groomed by the focal.`,
    `- Sessions of one animal on one day: ${Object.entries(S.sessionsPerAnimalDay).map(([k, v]) => `${v} animal-days with ${k}`).join(', ')}.`,
    `- The same bout written twice: of ${S.sameBout.recordsWithPartyAndPartnerInIt} bouts with the partner in the party, the partner is himself a focal animal that day in ${S.sameBout.partnerIsFocalThatDay}, and his own session shows the same dyad in ${S.sameBout.andHisSessionShowsTheSameDyad}.`,
    `- Task B. Of ${S.taskB.scansWithAMaleInParty} scans with at least one male in the party (of ${S.taskB.scans} scans): the focal gives grooming on ${S.taskB.givesGrooming}, to a roster male on ${S.taskB.givesToAMale}; he only receives on ${S.taskB.receivesOnly}; grooming among others only on ${S.taskB.groomingAmongOthersOnly}. Scans with a text note but no dyad: ${S.taskB.textButNoDyad}; unparsed dyad parts: ${S.taskB.unparsedDyadParts}; scans stored as more than one row: ${S.taskB.scansWithMoreThanOneRow}.`,
    `- Task C. Proximity is recorded on ${S.taskC.scansWithAnyProximity} of scans; when it is, animals within 2 m: ${d(S.taskC.within2mWhenRecorded)}; in the 2–5 m ring: ${d(S.taskC.ring2to5mWhenRecorded)}. Mean share of the party's males within 5 m at a scan: ${S.taskC.shareOfPartyMalesWithin5m}.`);
  const names: Record<string, string> = { chance: 'chance (uniform over the set)', pastGiven: 'most frequent past partner (grooming given)', pastEither: 'most frequent past partner (either direction)', lastPartner: 'last partner groomed', nearestPrev: 'nearest at the previous scan', groomedMePrev: 'the male grooming him at the previous scan', pastNeighbour: 'most frequent past neighbour (within 5 m)', pastParty: 'most frequent past party companion', stack: 'stack: groomed me, then nearest, then past partner', listedFirst: 'check, not a rule: the male written first in the party list' };
  let n = 3;
  for (const [part, A] of Object.entries(S.taskA)) {
    L.push('', `## ${n++}. Task A (whom the focal grooms), ${part} part`,
      '', `Sessions: ${A.sessions}. Bouts of grooming given by the focal: ${A.boutsGivenByFocal} (received only: ${A.boutsReceivedOnly} bouts, not scored). Bout length in scans: ${d(A.boutLengthScans)}. Records with more than one partner at the decision scan: ${A.multiLabel}. Share already under way at a session's first scan: ${A.atFirstScan}.`);
    t(['step', 'records removed (last row: kept)', 'records before the step'], A.funnel.map(f => [f.step, f.records, f.remainingBefore]));
    L.push('Candidate available sets, on bouts whose partner is a roster male:');
    t(['set', 'records', 'set recorded', 'share', 'partner in the set', 'share', 'partner outside', 'set size (median; mean; max)'], Object.entries(A.coverage).map(([k, v]) => [k, v.maleLabelRecords, v.setRecorded, v.setRecordedShare, v.labelInSet, v.labelInSetShare, v.labelOutsideSetShare, `${v.size.median}; ${v.size.mean}; ${v.size.max}`]));
    L.push(`Diagnostic, never an input: at the decision scan itself the partner is listed within 2 m on ${A.diagnosticLabelWithin2mAtDecisionScan} of these bouts and in the 2–5 m ring on ${A.diagnosticLabelIn5mRingAtDecisionScan}.`,
      '', `**Eligible records: ${A.eligible}, from ${A.eligibleAnimals} focal animals and ${A.sessionsWithEligible} sessions** (${A.eligiblePerSession} per session); ${A.eligibleDyads} distinct chooser-partner pairs, ${A.eligibleDistinctPartners} distinct partners.`,
      `- Set size (party males): ${d(A.setSize)}; 10th and 90th percentiles ${A.setSize.q10} and ${A.setSize.q90}; share over 8 (the cap of the simulation's social percept): ${A.setSize.shareOver8}; over 7: ${A.setSize.shareOver7}.`,
      `- With a set of 8 males or fewer: ${A.eligibleWithSetOf8OrFewer} records. If the same-day rule were dropped: ${A.eligibleIfSameDayRuleDropped} records. Share of eligible records whose partner the focal had never groomed or been groomed by in the record before: ${A.partnerNeverGroomedBefore}.`,
      `- Eligible records per focal animal: ${d(A.perAnimal)}; animals with at least 10: ${A.perAnimal.animalsWith10}, at least 30: ${A.perAnimal.animalsWith30}, at least 100: ${A.perAnimal.animalsWith100}; share of records from the 5 animals with most: ${A.perAnimal.shareOfRecordsFromTop5Animals}.`);
    t(['year', 'sessions', 'scans', 'focal animals', 'bouts given', 'eligible', 'animals with eligible', 'median set', 'chance', 'past partner (either direction)', 'stack'], A.perYear.map(y => [y.year, y.sessions, y.scans, y.animals, y.boutsGiven, y.eligible, y.animalsWithEligible, y.medianSet, y.chance, y.pastEither, y.stack]));
    const P = A.tables['bout (primary)'];
    L.push(`Baselines, ${part} part, primary unit (${P.records} records, ${P.animals} animals). Expected top-1 accuracy, ties split evenly. "per record" pools records; intervals are 95% cluster bootstraps over focal animals; "per animal" is the mean of the animals' own accuracies.`);
    t(['rule', 'per record', '95% interval', 'per animal', 'minus chance', '95% interval'], Object.entries(P.baselines).map(([b, x]) => [names[b], x.perRecord, `${x.ci[0]} to ${x.ci[1]}`, x.perAnimal, x.minusChance, `${x.minusChanceCi[0]} to ${x.minusChanceCi[1]}`]));
    const cuts = Object.entries(A.tables).filter(([k]) => k !== 'bout (primary)');
    L.push('The same rules on other cuts (per record):');
    t(['rule', ...cuts.map(([k, v]) => `${k}: ${v.records} records, ${v.animals} animals`)], BASELINES.map(b => [names[b], ...cuts.map(([, v]) => v.baselines[b].perRecord)]));
    const m = A.countingOutsidePartyAsMiss;
    L.push(`Second score, a partner outside the party counted as a miss for every rule (${m.records} records): chance ${m.chance}, past partner (either direction) ${m.pastEither}, stack ${m.stack}.`);
  }
  if (S.projection) { L.push('', `## ${n++}. Held-out part: projected sample (development rate × held-out sessions; no held-out outcome was read)`); t(['stratum', 'sessions', 'focal animals', 'projected eligible bouts'], Object.entries(S.projection).map(([k, v]) => [k, v.sessions, v.animals, v.projectedEligibleBouts])); }
  L.push('', `## ${n++}. Targets in \`data/targets.json\` that share records or animals with this dataset`, '', 'Compromised for any kernel trained on the training part; flagged for any kernel scored on both.');
  t(['overlap', 'targets'], Object.entries(leak).map(([k, v]) => [k, `${v.length}: ${v.join(', ') || 'none'}`]));
  const flagged = Object.values(leak).flat();
  L.push(`Flagged in all: ${flagged.length}${targetCount ? ` of ${targetCount} targets` : ''} (${flagged.filter(x => x.includes('(fitted)')).length} fitted, ${flagged.filter(x => x.includes('(held-out)')).length} held-out by their role in the file).`);
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

if (process.argv[1]?.endsWith('rw-ngogo-choices.ts')) {
  const arg = (k: string, dflt: string) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : dflt;
  const unsealed = process.argv.includes('--unseal'), out = arg('--out', 'artifacts/rw');
  if (unsealed) console.error('UNSEALED: held-out outcomes are being read. This is for stage R5 and needs the user\'s go (docs/staging/rw-prereg.md §2).');
  const rows = toRows(parseCsv(readFileSync(arg('--csv', 'data/raw/dryad-sf7m0cgkg/chimp_behav_data.csv'), 'utf8')));
  const { summary, records } = summarize(rows, unsealed);
  const targets = JSON.parse(readFileSync('data/targets.json', 'utf8')), leak = leakage(targets);
  mkdirSync(out, { recursive: true });
  const tag = unsealed ? 'all' : 'sealed';
  writeFileSync(`${out}/ngogo-choices-${tag}-summary.json`, JSON.stringify({ ...summary, leakage: leak }, null, 1) + '\n');
  writeFileSync(`${out}/ngogo-choices-${tag}-records.jsonl`, records.map(r => JSON.stringify(r)).join('\n') + '\n');   // individual-level: private, gitignored
  const md = markdown(summary, leak, targets.targets.length);
  if (process.argv.includes('--md')) writeFileSync(arg('--md', ''), md);
  console.log(md);
}
