// Band distance lives in src/yardstick/band-distance.ts since stage V1 (docs/staging/v1-field.md), so the app's page
// "How close to the wild" and the benchmark scripts share one definition. Re-exported here unchanged for
// scripts/e-bench.ts and scripts/lib/jev-arm.ts. (Not part of the frozen protocol: scripts/lib/protocol-hash.ts hashes
// src/field, src/compare and the scenario scripts, not this file.)
export * from '../../src/yardstick/band-distance';
