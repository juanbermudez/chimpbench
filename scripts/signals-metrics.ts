// Stage C10 signature calibration (docs/realism-design.md "C10 pre-registration", rule 1): an offline Monte Carlo of the
// observer's recorder protocol that fixes sigIdentitySD and sigCommunitySD without running the simulation.
//
//   pnpm exec tsx scripts/signals-metrics.ts --calibrate [--reps 12]
//
// Protocol: two communities of 9 callers each, 20 recorded pant-hoots per caller, features from src/sim/signals.ts.
// Targets: leave-one-out discriminant accuracy ÷ chance 2.8 for caller identity (desai2022: 19.5% vs 6.9%) and ~1.3 for
// community (group differences weaker than individual ones; the 1.3x reading is design, realism-design.md 5.8).
// Search: alternating bisection on each SD (identity accuracy rises with sigIdentitySD, community accuracy with
// sigCommunitySD), mean over replicate draws with fresh ids.
import { DEFAULTS, type Params } from '../src/sim/params';
import { pantHootFeatures } from '../src/sim/signals';
import { ldaLeaveOneOut, mean } from '../src/field/stats';

const args = process.argv.slice(2);
const REPS = +(args[args.indexOf('--reps') + 1] && args.includes('--reps') ? args[args.indexOf('--reps') + 1] : 12);
const CALLERS = 9, CALLS = 20, T_ID = 2.8, T_COMM = 1.3;

function evaluate(sId: number, sComm: number): { id: number; comm: number } {
  const P = { ...DEFAULTS, sigIdentitySD: sId, sigCommunitySD: sComm } as Params;
  const id: number[] = [], comm: number[] = [];
  for (let r = 0; r < REPS; r++) {
    const X: number[][] = [], who: number[] = [], where: number[] = [];
    for (let k = 0; k < 2; k++) for (let i = 0; i < CALLERS; i++) {
      const chimp = 10000 + r * 100 + k * CALLERS + i, natal = 500 + r * 10 + k;
      for (let j = 0; j < CALLS; j++) { X.push(pantHootFeatures(P, chimp, natal, 5_000_000 + chimp * 1000 + j)); who.push(chimp); where.push(k); }
    }
    const a = ldaLeaveOneOut(X, who), b = ldaLeaveOneOut(X, where);
    id.push(a.accuracy / a.chance); comm.push(b.accuracy / b.chance);
  }
  return { id: mean(id), comm: mean(comm) };
}

function bisect(f: (v: number) => number, target: number, lo: number, hi: number): number {
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; }
  return Math.round((lo + hi) / 2 * 1000) / 1000;
}

if (args.includes('--calibrate')) {
  let sId = 0.5, sComm = 0.2;
  for (let round = 0; round < 3; round++) {
    sId = bisect(v => evaluate(v, sComm).id, T_ID, 0.05, 2);
    sComm = bisect(v => evaluate(sId, v).comm, T_COMM, 0, 1);
    const e = evaluate(sId, sComm);
    console.log(`round ${round + 1}: sigIdentitySD ${sId}, sigCommunitySD ${sComm} -> identity ${e.id.toFixed(2)}x chance, community ${e.comm.toFixed(2)}x chance`);
  }
} else console.log('usage: pnpm exec tsx scripts/signals-metrics.ts --calibrate [--reps 12]');
