// The decode step of a harness (stage R9) lives in src/kernel/decoder.ts since the app mode "Model decides for every
// adult" (docs/staging/app-model-drives.md) runs it too; this file re-exports it unchanged for the scripts and tests.
export * from '../../src/kernel/decoder';
