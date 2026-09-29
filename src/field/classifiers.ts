import { CAT_TRAVEL } from './categories';
import { P_CALLED, type Records } from './records';

// Offline behavioral classifiers over the observer's records (docs/realism-design.md §3.5).
//
// Patrol, after Watts & Mitani 2001: the focal party holds >= 2 adult males, travels silently (no party pant-hoot or
// drum for the whole run, >= 20 min), reaches the own 90% isopleth or beyond, and makes >= 2 stationary listening
// stops of <= 5 min. The stop criterion was off until stage C6 because the simulation's patrols did not stop to listen;
// since C6 they do, and the source criterion is on (C5a review; data/targets.json protocolLog).

export interface PatrolRule {
  minAdultMales: number;
  minMinutes: number;
  /** Share of the run's samples in which the focal travels. */
  minTravelShare: number;
  /** Share of the run's samples with at least `minAdultMales` in the party. */
  minMaleShare: number;
  /** Isopleth level the path must reach (0.9 = the own 90% isopleth). */
  minLevel: number;
  /** Listening stops (focal still for 1–5 min while its party waits) required. */
  minStops: number;
  /** Samples of a run may be broken by at most this many consecutive non-qualifying samples. */
  maxGap: number;
}
export const PATROL_RULE: PatrolRule = { minAdultMales: 2, minMinutes: 20, minTravelShare: 0.5, minMaleShare: 0.8, minLevel: 0.9, minStops: 2, maxGap: 3 };

export interface Patrol {
  follow: number; team: number; troop: number; i0: number; i1: number; t0: number; t1: number; minutes: number;
  maxLevel: number; stops: number; pathM: number;
  /** Truth share of the run's samples in which the focal was on a patrol (for classifier accuracy only). */
  truthShare: number;
}

/**
 * Classifies patrols on each follow. `followPts[f]` lists point indices of follow f in time order; `level(troop, x, z)`
 * is the own-range isopleth level (0 core … 1 outside).
 */
export function classifyPatrols(rec: Records, followPts: number[][], level: (troop: number, x: number, z: number) => number, rule: PatrolRule = PATROL_RULE): Patrol[] {
  const P = rec.points, out: Patrol[] = [];
  const tH = rec.tickHours, perMin = 1 / 60;
  for (let f = 0; f < followPts.length; f++) {
    const pts = followPts[f], fol = rec.follows[f];
    let k = 0;
    while (k < pts.length) {
      // a run: consecutive samples of silent travel, tolerating short gaps; any party call ends it
      const ok = (i: number) => P.cat.data[i] === CAT_TRAVEL && (P.flags.data[i] & P_CALLED) === 0;
      if (!ok(pts[k])) { k++; continue; }
      let end = k, gap = 0, j = k + 1;
      for (; j < pts.length; j++) {
        if ((P.flags.data[pts[j]] & P_CALLED) !== 0) break;
        if (ok(pts[j])) { end = j; gap = 0; } else if (++gap > rule.maxGap) break;
      }
      const run = pts.slice(k, end + 1);
      k = end + 1;
      const t0 = P.t.data[run[0]] * tH, t1 = P.t.data[run[run.length - 1]] * tH;
      const minutes = (t1 - t0) / perMin + 1;
      if (minutes < rule.minMinutes) continue;
      let travel = 0, males = 0, maxLevel = 0, truth = 0, pathM = 0, stops = 0, still = 0;
      for (let r = 0; r < run.length; r++) {
        const i = run[r];
        if (P.cat.data[i] === CAT_TRAVEL) travel++;
        if (P.partyAM.data[i] >= rule.minAdultMales) males++;
        if (P.truthPatrol.data[i]) truth++;
        const lv = level(fol.troop, P.x.data[i], P.z.data[i]);
        if (lv > maxLevel) maxLevel = lv;
        if (r > 0) {
          const d = Math.hypot(P.x.data[i] - P.x.data[run[r - 1]], P.z.data[i] - P.z.data[run[r - 1]]);
          pathM += d;
          if (d < 0.2) still++; else { if (still >= 1 && still <= 5) stops++; still = 0; }
        }
      }
      if (travel / run.length < rule.minTravelShare || males / run.length < rule.minMaleShare || maxLevel < rule.minLevel || stops < rule.minStops) continue;
      out.push({ follow: f, team: fol.team, troop: fol.troop, i0: run[0], i1: run[run.length - 1], t0, t1, minutes, maxLevel, stops, pathM, truthShare: truth / run.length });
    }
  }
  return out;
}

/**
 * Precision and recall of classified patrols against truth. A truth episode is a run of >= `minTruth` samples of one
 * follow with the focal on a patrol (patrol interaction membership); it is found when a classified patrol covers at
 * least half of it. A classified patrol is correct when at least half of its samples are truth-flagged.
 */
export function patrolAccuracy(rec: Records, followPts: number[][], patrols: Patrol[], minTruth = 10): { precision: number; recall: number; truthEpisodes: number; classified: number } {
  const P = rec.points;
  const covered = new Uint8Array(P.t.n);
  for (const p of patrols) for (const i of followPts[p.follow]) if (i >= p.i0 && i <= p.i1) covered[i] = 1;
  let episodes = 0, found = 0;
  for (const pts of followPts) {
    let run: number[] = [];
    const flush = () => { if (run.length >= minTruth) { episodes++; let c = 0; for (const i of run) c += covered[i]; if (c >= run.length / 2) found++; } run = []; };
    for (const i of pts) { if (P.truthPatrol.data[i]) run.push(i); else flush(); }
    flush();
  }
  const correct = patrols.filter(p => p.truthShare >= 0.5).length;
  return { precision: patrols.length ? correct / patrols.length : NaN, recall: episodes ? found / episodes : NaN, truthEpisodes: episodes, classified: patrols.length };
}
