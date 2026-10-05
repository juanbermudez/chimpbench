// JSON that keeps what JSON.stringify loses and the pooling of e-bench's per-seed parts needs bit for bit: NaN, ±Infinity
// and −0 (as {"$n": "NaN"}), Sets and Maps (as {"$set": […]} and {"$map": [[k, v], …]}). Array holes and undefined
// array items still become null, and undefined object values are still dropped: every reader of a part treats null,
// undefined and a hole alike. Both the multi-seed run and --merge pool parts that went through this encoding, so they
// see identical inputs.
const replacer = (_k: string, v: unknown): unknown => {
  if (typeof v === 'number') return Number.isFinite(v) && !Object.is(v, -0) ? v : { $n: String(Object.is(v, -0) ? '-0' : v) };
  if (v instanceof Set) return { $set: [...v] };
  if (v instanceof Map) return { $map: [...v] };
  if (ArrayBuffer.isView(v)) throw new TypeError('lossless JSON: typed arrays are not supported');
  return v;
};
const reviver = (_k: string, v: unknown): unknown => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>, keys = Object.keys(o);
    if (keys.length === 1) {
      if (keys[0] === '$n' && typeof o.$n === 'string') return Number(o.$n);
      if (keys[0] === '$set' && Array.isArray(o.$set)) return new Set(o.$set);
      if (keys[0] === '$map' && Array.isArray(o.$map)) return new Map(o.$map as [unknown, unknown][]);
    }
  }
  return v;
};
export const encodeLossless = (value: unknown, space?: number): string => JSON.stringify(value, replacer, space);
export const decodeLossless = <T>(text: string): T => JSON.parse(text, reviver) as T;
