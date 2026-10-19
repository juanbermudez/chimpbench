// What the page "How close to the wild" takes from the field observer (stage V1, docs/staging/v1-field.md). src/field is
// the frozen protocol (scripts/lib/protocol-hash.ts hashes every file in it, 215ed6ab282a57de on 7 October 2026), so
// nothing is moved out of it or edited: this module imports from it and re-exports, in one direction only. Screen and
// scorer then share one Poisson interval and one necropsy table.
export { poissonInterval, mean, median } from '../field/stats';
export { necropsy } from '../field/protocols';
