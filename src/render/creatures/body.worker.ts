// Builds finer chimpanzee LOD meshes off the main thread (the SDF polygonizer takes ~100–200 ms per level).
// Replies with the geometry's typed arrays, transferred, for createCreatures to wrap in a BufferGeometry.
import { buildChimpGeometry } from './body';

interface Request { level: number; h: number; lo: boolean }
self.onmessage = (event: MessageEvent<Request>) => {
  const { level, h, lo } = event.data;
  const { geometry } = buildChimpGeometry(h, lo);
  const attributes: Record<string, { array: Float32Array; itemSize: number }> = {};
  const transfer: ArrayBuffer[] = [];
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const array = attr.array as Float32Array;
    attributes[name] = { array, itemSize: attr.itemSize };
    transfer.push(array.buffer as ArrayBuffer);
  }
  const index = geometry.getIndex()!.array as Uint16Array | Uint32Array;
  transfer.push(index.buffer as ArrayBuffer);
  (self as unknown as Worker).postMessage({ level, attributes, index }, transfer);
};
