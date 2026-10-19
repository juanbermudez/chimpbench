// The shapes of the two files the page "How close to the wild" fetches on first open (stage V1,
// docs/staging/v1-field.md): public/field/targets-lite.json and public/field/reference.json. Both are written by
// scripts/field-bundle.ts from data/targets.json and the frozen reference checkouts, and checked against them
// (`--check`). Plain data only; no numbers are computed here.

import type { OpenBand } from './band-distance';

/** One flag of a target as the page shows it: the label everywhere, the reason in words from data/targets.json. */
export interface LiteFlag { key: string; label: string; reason: string }

/** A field row of data/targets.json, kept as the free text it is (no site ticks are plotted from it). */
export interface LiteField { population: string; years: string; value: string; n: string; method: string; source: string; note: string }

/** The shortest stretch of watching a row's protocol needs before its value means what the band means. */
export interface LiteWindow {
  /** 'days': at least `days` of watching; 'year', 'decades'; 'experiment': needs field experiments; 'scenario': a
   * scenario row, never scored in a watched world. */
  kind: 'days' | 'year' | 'decades' | 'experiment' | 'scenario';
  /** Simulated days needed (null for experiment and scenario rows). */
  days: number | null;
  /** Why, in words. */
  why: string;
}

export interface LiteTarget {
  id: string;
  /** The plain metric name of data/targets.json. */
  metric: string;
  definition: string;
  /** The field team's protocol and sampling unit, from `observer`. */
  method: string; unit: string;
  role: 'fitted' | 'held-out';
  encoded: boolean;
  evidence: string;
  accept: { lo: number | null; hi: number | null; units: string; basis: string };
  /** Bands per part where the row is scored on parts (both sexes, causes); absent otherwise. */
  partBands?: Record<string, OpenBand>;
  field: LiteField[];
  sources: string[];
  flags: LiteFlag[];
  /** Scored by scripts/e-bench.ts from simulation truth, not by a field team. */
  truth: boolean;
  /** T-ENE-1: the band the field value would have under a corrected method. */
  comparisonBand?: { lo: number; hi: number; units: string; basis: string };
  /** Lengths and areas: not comparable on the 160 m map. */
  scaleSensitive: boolean;
  /** The chapter that is the row's home, and the chapters that list it too. */
  section: string; also: string[];
  window: LiteWindow;
  /** Set for bands written for a community size: the size the band is written for, in words, and the members or adult
   * males it names, so the page can set this world's community sizes beside it and say when they differ a lot. */
  scaled?: { words: string; members?: number; adultMales?: [number, number] };
  /** For a tuned row: one plain sentence for the row itself (the full reason is in `flags`). */
  tunedLine?: string;
  /** The scorer's note where a watched world cannot measure the row (src/field/metrics.ts `na` or `structural`). */
  notMeasured?: string;
}

export interface LiteSource { authors: string; year: number | string; title: string; journal: string; doi: string }

export interface TargetsLite {
  version: 1;
  /** The protocol freeze the targets file carries (hash, date, stage). */
  freeze: { hash: string; date: string; stage: string };
  /** Count of sealed rows left out (never their ids). */
  sealed: number;
  targets: LiteTarget[];
  sources: Record<string, LiteSource>;
}

/** One reference row: the scorecard's (or, for a simulation-truth row, e-bench's) numbers, copied as they are. */
export interface RefRow {
  pooled: number | null;
  perSeed: (number | null)[];
  interval: [number, number] | null;
  n: number;
  parts: Record<string, number | null>;
  /** The scorer's verdict word (shown in the detail only) and its note. */
  verdict: string;
  note: string;
  /** The scorer's flags as it printed them. */
  flags: string[];
  /** Simulation truth beside a field-team value (the scorecard's `truth`), when the scorer kept one. */
  truthValue: number | null;
  /** 'card': from the scorecard; 'truth': a simulation-truth row from e-bench. */
  from: 'card' | 'truth';
}

export interface RefWorld {
  seed: number; livingStart: number; livingEnd: number; births: number; deaths: number;
  starvationDeaths: number;
  /** Deaths by cause as e-bench counted them (the simulation's own words). */
  deathsByCause: Record<string, number>;
}

export interface RefArm {
  id: string;
  /** In words: what model this is. */
  name: string; what: string;
  /** The arm's parameter overrides (empty: today's default model). */
  overrides: Record<string, number>;
  seeds: number[]; days: number; burnInDays: number; profile: string;
  runDate: string; commit: string;
  protocol: { hash: string; current: boolean };
  /** Rows whose observer code changed after this run: no number, "needs a recount". */
  recount: Record<string, string>;
  viability: { pass: boolean; reasons: string[]; births: number; deaths: number; starvationDeaths: number; minLivingShare: number; worlds: RefWorld[] };
  /** Field-team patrol detection: patrols the teams classified and patrols that happened, per world. */
  patrolCatch: { seed: number; detected: number; truth: number }[];
  /** The detectors' checks against what happened while a team followed (the scorecard's `accuracy`): pooled precision
   * and recall of the patrol classifier (focal follows) and of the encounter classifier (larger-party follows). */
  instrument: { patrol: { precision: number; recall: number; classified: number; truthEpisodes: number } | null; encounter: { precision: number; recall: number } | null };
  rows: Record<string, RefRow>;
}

export interface ReferenceFile {
  version: 1;
  /** Today's protocol freeze, against which `protocol.current` and `recount` were worked out. */
  freeze: string;
  /** How the today's-model arm's match with today's default world is worded (from the defaults and golden fixture check). */
  todayMatch: string;
  arms: RefArm[];
}
