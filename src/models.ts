// Legacy entry point. The chimpanzee models (procedural SDF body, GPU-skinned
// instancing, pose library, overlays) live in the creature layer; this module
// only re-exports it so older imports keep resolving.
export { createCreatures } from './render/creatures';
export type { CreatureContext, CreatureFrame, CreatureLayer } from './render/creatures';
