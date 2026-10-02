// Stage E5a diagnosis (development tool, reads only; docs/staging/e5a-prereg.md §2): why parties form and split, and
// what holds them together. The world is e-bench's for the same seed and params (createWorld + burn-in + tickWorld, as
// scripts/approach-diagnose.ts); the party-follow observer is e-bench's own team set (src/field/run.ts runFieldJob
// `pobs`: seed 1 + 7919, 'party-larger', lite, 2-min points), so `observer.tpty1` must equal e-bench's per-seed T-PTY-1.
//
// Subjects: animals of 12 y or more (adult males ≥ 15 y, adult females ≥ 15 y split lactating / other, adolescents
// 12–15 y), awake (not in a finished nest) in daylight (> 0.1). Party = chain of community members of every age.
//
// Readouts (definitions are the registered ones; field quotes in the prereg §1):
//   observer: tpty1 = T-PTY-1 as scored (mean over all 15-min scans of the larger-subgroup party follows); s1 = the
//     staged fix S1, mean over follows of each follow's mean scan size (wilson2012: "mean values of party composition";
//     "individuals per follow"); follows, scans.
//   scans (truth, every 15 min): party size (all ages) in a chain at 50, 60 and 90 m; s2 = the staged fix S2 (chain at
//     50 m plus links between animals ≤ 60 m apart that were in one 50-m party at the previous scan; wilson2001);
//     independents (≥ 5 y) in the 50-m party; alone = no other animal ≥ 5 y in it.
//   pairs (truth, 1-min resolution): two subjects of one community are together when in one 50-m chain and apart when
//     not in one 90-m chain (between: unchanged; wilson2001's 50 m rule and 90 m practice). A join is apart → together,
//     a split together → apart; the mover is the member displaced more over the previous 5 min; events are counted by
//     the mover's part (approach-diagnose's parts) and per subject-day. "Same crown": at the join the mover's target is a
//     tree that the other feeds in or is going to (independent or joint arrival at food).
//   follows (truth): entries of animals ≥ 5 y into a party follow (V.PARTY) or a joined trip (travel to a leader's tree),
//     with the value terms of the offer that was taken, recomputed at entry from the follower's state:
//       follow party  = partyFollowBase + partyFollowW·bond + partyFollowSocialW·sociability + partyFollowMaleW·[leader
//                       adult male] + travelHooFollowW·[hoo heard] (− partyFollowHungerW·hunger, 0 in the field)
//       joined trip   = joinBase + joinBondW·bond + joinAllyW·[ally] + joinRankW·[leader dominates] +
//                       partyFollowSocialW·sociability + joinHooW·[hoo heard] − joinStayW·hunger·crop quality of the
//                       crown it was feeding in
//     The bond is read with the act's target (the leader the chain resolved to). Rain and oestrus terms are not
//     recomputed (oestrusPullW is 0). Means per entry, by follower class; who is followed (class, kin).
//   crowns (truth, every 15 min of daylight): each tree with feeders ≥ 5 y in its crown (forage, phase 2): feeders,
//     crop (fruitAt) in chimp-hours of feeding (crop ÷ an adult female's ripe-fruit intake per hour, intake.ts fruitRate;
//     potts2011's party visit is 3.3–6.5 chimp-hours, research.md, derived), and per feeder; feeders by crop tercile
//     (pooled cut points) and the R² of feeders on crop; the 50-m party size of feeders by the same terciles.
//   path (truth): km per chimp-day by class, all movement (steps longer than 2·runMps·tick + 2 m skipped), by part.
//   deaths by cause; living at start and end.
//
//   pnpm exec tsx scripts/cohesion-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { PROFILES } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../src/field/observer';
import { V } from '../src/sim/candidates';
import { bond, dominates, isAdultMale, maternalKin } from '../src/sim/hierarchy';
import { fruitRate } from '../src/sim/intake';
import { paramsOf } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = Math.round(24 / TICK_HOURS), MIN = Math.round(1 / 60 / TICK_HOURS), SCAN = 15 * MIN;

const CLASSES = ['adult male', 'lactating', 'female other', 'adolescent'] as const;
type Cls = typeof CLASSES[number];
const clsOf = (c: Chimp): Cls | null => !c.alive || c.age < 12 ? null : c.age < 15 ? 'adolescent' : c.sex === 'male' ? 'adult male' : c.lactating ? 'lactating' : 'female other';
const whoOf = (c: Chimp | undefined): string => !c ? 'gone' : c.age < 5 ? 'infant' : c.age < 12 ? 'juvenile' : c.age < 15 ? 'adolescent' : c.sex === 'male' ? 'adult male' : c.lactating ? 'lactating' : 'female other';
const PARTS = ['own trip', 'to crown', 'in crown', 'ground forage', 'joined trip', 'follow party', 'to callers', 'drink', 'patrol',
  'home', 'follow mother', 'consort', 'nest', 'groom', 'rest', 'other'] as const;
type Part = typeof PARTS[number];
function partOf(c: Chimp): Part {
  const x = ix(c);
  switch (c.action) {
    case 'travel': return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'to callers' : x.v === V.HOME ? 'home' : 'other';
    case 'follow': return x.v === V.PARTY ? 'follow party' : x.v === V.MOTHER || x.v === V.JUVENILE ? 'follow mother' : 'other';
    case 'forage': return c.targetId < 0 ? 'ground forage' : x.phase >= 2 ? 'in crown' : 'to crown';
    case 'patrol': return 'patrol';
    case 'consort': return 'consort';
    case 'nest': return 'nest';
    case 'drink': return 'drink';
    case 'groom': return 'groom';
    case 'rest': return 'rest';
    default: return 'other';
  }
}
const asleep = (c: Chimp) => c.action === 'nest' && ix(c).phase >= 2;
const zeros = <K extends string>(ks: readonly K[]) => Object.fromEntries(ks.map(k => [k, 0])) as Record<K, number>;
const inc = (m: Record<string, number>, k: string, v = 1) => { m[k] = (m[k] ?? 0) + v; };

/** Union-find partition of `list` by chained distance ≤ link (+ optional extra pair links). Returns root per index. */
function chain(list: Chimp[], link: number, extra?: (a: Chimp, b: Chimp, d2: number) => boolean): number[] {
  const n = list.length, par = Array.from({ length: n }, (_, i) => i), l2 = link * link;
  const find = (i: number): number => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = list[i], b = list[j], dx = a.position[0] - b.position[0], dz = a.position[2] - b.position[2], d2 = dx * dx + dz * dz;
    if (d2 <= l2 || (extra && extra(a, b, d2))) { const ra = find(i), rb = find(j); if (ra !== rb) par[Math.max(ra, rb)] = Math.min(ra, rb); }
  }
  return list.map((_, i) => find(i));
}

interface Seed {
  seed: number; observer: { tpty1: number | null; s1: number | null; follows: number; scans: number };
  scans: Record<Cls, { n: number; p50: number; p60: number; p90: number; s2: number; ind: number; alone: number }>;
  subjectDays: Record<Cls, number>;
  pairs: { joins: number; splits: number; joinBy: Record<string, number>; splitBy: Record<string, number>; joinSameCrown: number; stayerAtSplit: Record<string, number>; pairDaysTogether: number; pairDays: number };
  follow: Record<string, { n: number; terms: Record<string, number>; leader: Record<string, number>; kin: number }>;
  joined: Record<string, { n: number; terms: Record<string, number>; leader: Record<string, number>; kin: number }>;
  crowns: { crop: number[]; feeders: number[]; party: number[]; chimpH: number[] };
  path: Record<Cls, { days: number; km: number; parts: Record<Part, number> }>;
  deaths: Record<string, number>; livingStart: number; livingEnd: number;
}

const out: Seed[] = [];
for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w), MAX_STEP = 2 * P.runMps * TICK_HOURS * 3600 + 2;
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const pobs = createObserver(w, { seed: 1 + 7919, profile: PROFILES.field, truth: true, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const S: Seed = {
    seed, observer: { tpty1: null, s1: null, follows: 0, scans: 0 },
    scans: Object.fromEntries(CLASSES.map(k => [k, { n: 0, p50: 0, p60: 0, p90: 0, s2: 0, ind: 0, alone: 0 }])) as Seed['scans'],
    subjectDays: zeros(CLASSES),
    pairs: { joins: 0, splits: 0, joinBy: {}, splitBy: {}, joinSameCrown: 0, stayerAtSplit: {}, pairDaysTogether: 0, pairDays: 0 },
    follow: {}, joined: {},
    crowns: { crop: [], feeders: [], party: [], chimpH: [] },
    path: Object.fromEntries(CLASSES.map(k => [k, { days: 0, km: 0, parts: zeros(PARTS) }])) as Seed['path'],
    deaths: {}, livingStart: w.chimps.filter(c => c.alive).length, livingEnd: 0,
  };
  const lastPos = new Map<number, [number, number]>(), lastPart = new Map<number, Part>(), lastTarget = new Map<number, number>();
  const prevAct = new Map<number, string>(), prevTarget = new Map<number, number>(), prevPhase = new Map<number, number>();
  const ring = new Map<number, [number, number][]>(); // 1-min positions, last 6
  const pairState = new Map<string, boolean>();        // together?
  let prevParty50 = new Map<number, number>();          // id -> root id at the previous truth scan (S2 rule)
  // an adult female's ripe-fruit intake per hour (the crown readout's scale: chimp-hours of feeding)
  const refF = w.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 15 && !c.lactating) ?? w.chimps.find(c => c.alive && c.age >= 15)!;
  const fph = fruitRate(refF, P).fruitPerH;
  for (const c of w.chimps) { prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId); prevPhase.set(c.id, ix(c).phase); }

  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    observerStep(pobs, w);
    const idx = index(w), byId = idx.byId, t = w.time, day = w.environment.daylight > 0.1;
    const alive = idx.alive;
    // --- path and follow entries (every tick) ---
    for (const c of alive) {
      const x = ix(c), k = clsOf(c), part = partOf(c);
      const p = lastPos.get(c.id), x0 = c.position[0], z0 = c.position[2];
      lastPos.set(c.id, [x0, z0]);
      if (k) {
        let d = 0; if (p) { d = Math.hypot(x0 - p[0], z0 - p[1]); if (d > MAX_STEP) d = 0; }
        const a = S.path[k]; a.km += d / 1000; a.parts[part] += d / 1000;
      }
      const tgt = part === 'joined trip' ? x.aux : c.targetId;
      const entered = (part === 'follow party' || part === 'joined trip') && (lastPart.get(c.id) !== part || lastTarget.get(c.id) !== tgt);
      if (entered && c.age >= 5) {
        const L = byId.get(tgt), who = whoOf(c);
        const hooOn = P.travelHoo === 1 && L !== undefined && x.hooFrom === L.id && t - (x.hooAt ?? -1e9) <= P.travelHooWindowMin / 60;
        const kin = !!L && maternalKin(c, L);
        if (part === 'follow party') {
          const e = S.follow[who] ??= { n: 0, terms: {}, leader: {}, kin: 0 };
          e.n++; inc(e.leader, whoOf(L)); if (kin) e.kin++;
          inc(e.terms, 'partyFollowBase', P.partyFollowBase); inc(e.terms, 'partyFollowW·bond', L ? P.partyFollowW * bond(c, L) : 0);
          inc(e.terms, 'partyFollowSocialW·soc', c.personality.sociability * P.partyFollowSocialW); inc(e.terms, 'partyFollowMaleW', L && isAdultMale(L) ? P.partyFollowMaleW : 0);
          inc(e.terms, 'travelHooFollowW', hooOn ? P.travelHooFollowW : 0); inc(e.terms, '-partyFollowHungerW·h', -c.hunger * P.partyFollowHungerW);
        } else {
          const e = S.joined[who] ??= { n: 0, terms: {}, leader: {}, kin: 0 };
          e.n++; inc(e.leader, whoOf(L)); if (kin) e.kin++;
          let stay = 0;
          if (prevAct.get(c.id) === 'forage' && isTreeId(prevTarget.get(c.id)!)) { const tr = idx.treeById.get(prevTarget.get(c.id)!); if (tr) stay = c.hunger * Math.min(1, fruitAt(w, tr) / P.fruitValueRef); }
          inc(e.terms, 'joinBase', P.joinBase); inc(e.terms, 'joinBondW·bond', L ? P.joinBondW * bond(c, L) : 0);
          inc(e.terms, 'joinAllyW', L && c.allies.includes(L.id) ? P.joinAllyW : 0); inc(e.terms, 'joinRankW', L && dominates(L, c) ? P.joinRankW : 0);
          inc(e.terms, 'partyFollowSocialW·soc', c.personality.sociability * P.partyFollowSocialW); inc(e.terms, 'joinHooW', hooOn ? P.joinHooW : 0);
          inc(e.terms, '-joinStayW·stay', -P.joinStayW * stay);
        }
      }
      lastPart.set(c.id, part); lastTarget.set(c.id, tgt);
    }
    // --- 1-min: pair events ---
    if (w.tick % MIN === 0) {
      for (const c of alive) { const r = ring.get(c.id) ?? []; r.push([c.position[0], c.position[2]]); if (r.length > 6) r.shift(); ring.set(c.id, r); }
      if (day) for (const tr of w.troops) {
        const mem = alive.filter(c => c.troopId === tr.id);
        const r50 = chain(mem, 50), r90 = chain(mem, 90);
        const subj: number[] = [];
        for (let a = 0; a < mem.length; a++) if (clsOf(mem[a]) && !asleep(mem[a])) subj.push(a);
        for (let u = 0; u < subj.length; u++) for (let v = u + 1; v < subj.length; v++) {
          const ia = subj[u], ib = subj[v], A = mem[ia], B = mem[ib], key = A.id < B.id ? `${A.id}:${B.id}` : `${B.id}:${A.id}`;
          const tog = r50[ia] === r50[ib], apart = r90[ia] !== r90[ib], was = pairState.get(key);
          S.pairs.pairDays += 1 / (60 * 24); if (tog) S.pairs.pairDaysTogether += 1 / (60 * 24);
          if (was === undefined) { if (tog || apart) pairState.set(key, tog); continue; }
          const disp = (c: Chimp) => { const r = ring.get(c.id)!; const o = r[0]; return Math.hypot(c.position[0] - o[0], c.position[2] - o[1]); };
          if (!was && tog) {
            const m = disp(A) >= disp(B) ? A : B, o = m === A ? B : A;
            S.pairs.joins++; inc(S.pairs.joinBy, partOf(m));
            if (isTreeId(m.targetId) && (m.action === 'forage' || m.action === 'travel') && isTreeId(o.targetId) && o.targetId === m.targetId) S.pairs.joinSameCrown++;
            pairState.set(key, true);
          } else if (was && apart) {
            const m = disp(A) >= disp(B) ? A : B, o = m === A ? B : A;
            S.pairs.splits++; inc(S.pairs.splitBy, partOf(m)); inc(S.pairs.stayerAtSplit, partOf(o));
            pairState.set(key, false);
          }
        }
      }
    }
    // --- 15-min truth scans and crowns ---
    if (day && w.tick % SCAN === 0) {
      const next50 = new Map<number, number>();
      for (const tr of w.troops) {
        const mem = alive.filter(c => c.troopId === tr.id);
        const r50 = chain(mem, 50), r60 = chain(mem, 60), r90 = chain(mem, 90);
        const rs2 = chain(mem, 50, (a, b, d2) => d2 <= 3600 && prevParty50.has(a.id) && prevParty50.get(a.id) === prevParty50.get(b.id));
        const size = (r: number[], i: number) => { let n = 0; for (let j = 0; j < r.length; j++) if (r[j] === r[i]) n++; return n; };
        for (let a = 0; a < mem.length; a++) {
          next50.set(mem[a].id, mem[r50[a]].id);
          const c = mem[a], k = clsOf(c); if (!k || asleep(c)) continue;
          const s = S.scans[k]; s.n++;
          s.p50 += size(r50, a); s.p60 += size(r60, a); s.p90 += size(r90, a); s.s2 += size(rs2, a);
          let ind = 0; for (let j = 0; j < mem.length; j++) if (r50[j] === r50[a] && mem[j].age >= 5) ind++;
          s.ind += ind; if (ind <= 1) s.alone++;
        }
        // crowns: feeders ≥ 5 y in the crown of each tree
        const byTree = new Map<number, Chimp[]>();
        for (const c of mem) if (c.age >= 5 && c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase >= 2) { const l = byTree.get(c.targetId) ?? []; l.push(c); byTree.set(c.targetId, l); }
        for (const [tid, l] of byTree) {
          const tree = idx.treeById.get(tid); if (!tree) continue;
          const crop = fruitAt(w, tree), ia = mem.indexOf(l[0]);
          S.crowns.crop.push(crop); S.crowns.feeders.push(l.length); S.crowns.party.push(size(r50, ia));
          S.crowns.chimpH.push(crop / Math.max(1e-9, fph));
        }
      }
      prevParty50 = next50;
    }
    if (w.tick % DAY === 0) for (const c of alive) { const k = clsOf(c); if (k) { S.subjectDays[k]++; S.path[k].days++; } }
    for (const c of alive) { prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId); prevPhase.set(c.id, ix(c).phase); }
  }
  const prec = finishObserver(pobs, w), pd = derive(prec);
  const m = METRICS.find(q => q.id === 'T-PTY-1')!;
  S.observer.tpty1 = m.compute!(pd).value ?? null;
  const sz = prec.scans.size, per: number[] = [];
  pd.followScans.forEach(list => { if (list.length) { let s = 0; for (const i of list) s += sz.data[i]; per.push(s / list.length); } });
  S.observer.s1 = per.length ? per.reduce((a, b) => a + b, 0) / per.length : null;
  S.observer.follows = per.length; S.observer.scans = prec.scans.t.n;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) inc(S.deaths, c.causeOfDeath ?? 'unknown');
  S.livingEnd = w.chimps.filter(c => c.alive).length;
  out.push(S);
  const sc = S.scans['adult male'];
  console.log(`seed ${seed}: T-PTY-1 ${S.observer.tpty1?.toFixed(3)} (S1 ${S.observer.s1?.toFixed(3)}, ${S.observer.follows} follows); adult-male scan party ${(sc.p50 / sc.n).toFixed(2)}; joins ${S.pairs.joins}, splits ${S.pairs.splits}; deaths ${JSON.stringify(S.deaths)}`);
}

// ---------------- summary ----------------
const r3 = (v: number) => Math.round(v * 1000) / 1000;
function ols(x: number[], y: number[]): number { const n = x.length; if (n < 3) return NaN; const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? sxy * sxy / (sxx * syy) : 0; }
const summary: Record<string, unknown> = {};
summary.observer = { tpty1: out.map(s => s.observer.tpty1), s1: out.map(s => s.observer.s1), meanTpty1: r3(out.reduce((a, s) => a + (s.observer.tpty1 ?? 0), 0) / out.length), meanS1: r3(out.reduce((a, s) => a + (s.observer.s1 ?? 0), 0) / out.length) };
const scanSum: Record<string, unknown> = {};
for (const k of CLASSES) { const t = { n: 0, p50: 0, p60: 0, p90: 0, s2: 0, ind: 0, alone: 0 }; for (const s of out) for (const f of Object.keys(t) as (keyof typeof t)[]) t[f] += s.scans[k][f]; scanSum[k] = { scans: t.n, party50: r3(t.p50 / t.n), party60: r3(t.p60 / t.n), party90: r3(t.p90 / t.n), s2: r3(t.s2 / t.n), independents: r3(t.ind / t.n), alone: r3(t.alone / t.n) }; }
summary.scans = scanSum;
const subjDays = out.reduce((a, s) => a + CLASSES.reduce((b, k) => b + s.subjectDays[k], 0), 0);
const pj: Record<string, number> = {}, ps: Record<string, number> = {}, pst: Record<string, number> = {};
let joins = 0, splits = 0, same = 0, pdT = 0, pdA = 0;
for (const s of out) { joins += s.pairs.joins; splits += s.pairs.splits; same += s.pairs.joinSameCrown; pdT += s.pairs.pairDaysTogether; pdA += s.pairs.pairDays; for (const [k, v] of Object.entries(s.pairs.joinBy)) inc(pj, k, v); for (const [k, v] of Object.entries(s.pairs.splitBy)) inc(ps, k, v); for (const [k, v] of Object.entries(s.pairs.stayerAtSplit)) inc(pst, k, v); }
const shares = (m: Record<string, number>, n: number) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r3(v / Math.max(1, n))]));
summary.pairs = { joinsPerSubjectDay: r3(joins / subjDays), splitsPerSubjectDay: r3(splits / subjDays), joinMoverPart: shares(pj, joins), splitMoverPart: shares(ps, splits), splitStayerPart: shares(pst, splits), joinSameCrownShare: r3(same / Math.max(1, joins)), pairTimeTogether: r3(pdT / Math.max(1e-9, pdA)) };
const termSum = (key: 'follow' | 'joined') => {
  const r: Record<string, unknown> = {};
  const who = new Set(out.flatMap(s => Object.keys(s[key])));
  for (const k of who) { let n = 0, kin = 0; const terms: Record<string, number> = {}, leader: Record<string, number> = {}; for (const s of out) { const e = s[key][k]; if (!e) continue; n += e.n; kin += e.kin; for (const [q, v] of Object.entries(e.terms)) inc(terms, q, v); for (const [q, v] of Object.entries(e.leader)) inc(leader, q, v); }
    r[k] = { entries: n, perDay: r3(n / Math.max(1, out.reduce((a, s) => a + (k === 'infant' || k === 'juvenile' ? 0 : s.subjectDays[k as Cls] ?? 0), 0))), meanTerms: Object.fromEntries(Object.entries(terms).map(([q, v]) => [q, r3(v / n)])), leader: shares(leader, n), kinShare: r3(kin / n) }; }
  return r;
};
summary.follow = termSum('follow'); summary.joined = termSum('joined');
const crop = out.flatMap(s => s.crowns.crop), fe = out.flatMap(s => s.crowns.feeders), pa = out.flatMap(s => s.crowns.party), ch = out.flatMap(s => s.crowns.chimpH);
const sorted = [...crop].sort((a, b) => a - b), c1 = sorted[Math.floor(sorted.length / 3)], c2 = sorted[Math.floor(2 * sorted.length / 3)];
const terc = (i: number) => crop[i] <= c1 ? 0 : crop[i] <= c2 ? 1 : 2;
const tf = [0, 0, 0], tp = [0, 0, 0], tn = [0, 0, 0];
for (let i = 0; i < crop.length; i++) { const q = terc(i); tf[q] += fe[i]; tp[q] += pa[i]; tn[q]++; }
const med = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)] : NaN; };
summary.crowns = { occupiedCrownScans: crop.length, cropCuts: [r3(c1), r3(c2)], feedersByTercile: tf.map((v, q) => r3(v / tn[q])), partyByTercile: tp.map((v, q) => r3(v / tn[q])), meanFeeders: r3(fe.reduce((a, b) => a + b, 0) / fe.length), r2FeedersOnCrop: r3(ols(crop, fe)), r2PartyOnCrop: r3(ols(crop, pa)), chimpHoursMedian: r3(med(ch)), chimpHoursPerFeederMedian: r3(med(ch.map((v, i) => v / fe[i]))), chimpHoursMean: r3(ch.reduce((a, b) => a + b, 0) / Math.max(1, ch.length)) };
const pathSum: Record<string, unknown> = {};
for (const k of CLASSES) { let d = 0, km = 0; const parts = zeros(PARTS); for (const s of out) { d += s.path[k].days; km += s.path[k].km; for (const p of PARTS) parts[p] += s.path[k].parts[p]; } pathSum[k] = { kmPerDay: r3(km / Math.max(1, d)), parts: Object.fromEntries(PARTS.filter(p => parts[p] > 0).map(p => [p, r3(parts[p] / Math.max(1, d))])) }; }
summary.path = pathSum;
summary.deaths = out.map(s => s.deaths); summary.living = out.map(s => [s.livingStart, s.livingEnd]);
console.log(JSON.stringify(summary, null, 1));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ tool: 'cohesion-diagnose', seeds, burnIn, days, params, summary, perSeed: out.map(s => ({ ...s, crowns: undefined })) }, null, 1));
