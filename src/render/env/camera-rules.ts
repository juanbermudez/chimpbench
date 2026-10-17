import { hyp2 } from '../fastmath';
// Camera rules for the close follow and the cinematic director (visual plan G1–G3). Pure; no three.js.
// Trunks are packed (x, z, radius, crown-base height) as vegetation.trunkList provides them.

/** Pushes a camera at (x, z) out of every trunk's clearance (radius + pad). Writes out[0..1]; true if moved. */
export function pushOutOfTrunks(x: number, z: number, trunks: ArrayLike<number>, pad: number, out: number[] | Float64Array): boolean {
  let moved = false;
  for (let i = 0; i + 3 < trunks.length; i += 4) {
    const dx = x - trunks[i], dz = z - trunks[i + 1], min = trunks[i + 2] + pad;
    if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
    const d = hyp2(dx, dz);
    if (d >= min) continue;
    const k = d > 1e-5 ? min / d : 0;
    x = d > 1e-5 ? trunks[i] + dx * k : trunks[i] + min; z = d > 1e-5 ? trunks[i + 1] + dz * k : z;
    moved = true;
  }
  out[0] = x; out[1] = z;
  return moved;
}

/**
 * True when a trunk stands between a camera at (ax, ay, az) and a subject at (bx, by, bz): the segment passes
 * within the trunk's radius + pad in plan, at a height below the trunk's crown base. skip: index (in trunks / 4) of
 * the subject's host tree, which is not counted; every other trunk counts, however close to the subject (a trunk
 * beside a ground forager is an ordinary occluder, faded by the keep-clear camera).
 */
export function sightBlocked(ax: number, ay: number, az: number, bx: number, by: number, bz: number, trunks: ArrayLike<number>, pad: number, skip = -1): boolean {
  for (let i = 0; i + 3 < trunks.length; i += 4) if (i / 4 !== skip && trunkBlocks(ax, ay, az, bx, by, bz, trunks, i / 4, pad)) return true;
  return false;
}

/** True when trunk `index` (in trunks / 4) stands between camera and subject (see sightBlocked). */
export function trunkBlocks(ax: number, ay: number, az: number, bx: number, by: number, bz: number, trunks: ArrayLike<number>, index: number, pad: number): boolean {
  const i = index * 4;
  if (index < 0 || i + 3 >= trunks.length) return false;
  const sx = bx - ax, sz = bz - az, len2 = sx * sx + sz * sz;
  if (len2 < 1e-6) return false;
  const tx = trunks[i], tz = trunks[i + 1], r = trunks[i + 2] + pad;
  const t = Math.min(1, Math.max(0, ((tx - ax) * sx + (tz - az) * sz) / len2));
  const px = ax + sx * t - tx, pz = az + sz * t - tz;
  if (px * px + pz * pz > r * r) return false;
  // The subject stands at the trunk (hugging or climbing it): only a trunk nearer the camera than the subject blocks.
  if (t > 0.999 && hyp2(bx - tx, bz - tz) < trunks[i + 2] + pad) return false;
  return ay + (by - ay) * t < trunks[i + 3];
}

/** Which side (−1 / 1) of the actor → target axis a camera at (px, pz) stands on. */
export function axisSide(ax: number, az: number, bx: number, bz: number, px: number, pz: number): number {
  return (bx - ax) * (pz - az) - (bz - az) * (px - ax) >= 0 ? 1 : -1;
}

/** 180° rule: a cut between two shots of the same pair must keep the camera on one side of their axis. */
export function crossesLine(prevSide: number, ax: number, az: number, bx: number, bz: number, px: number, pz: number): boolean {
  return prevSide !== 0 && axisSide(ax, az, bx, bz, px, pz) !== prevSide;
}

/** 30° rule: a cut to the same subject must move the camera at least 30° around it (angles in radians). */
export function tooSimilar(prevAngle: number, nextAngle: number): boolean {
  const d = Math.abs(Math.atan2(Math.sin(nextAngle - prevAngle), Math.cos(nextAngle - prevAngle)));
  return d < Math.PI / 6;
}

/** Dead zone: re-aim only when the subject has moved more than share × the frame height at its distance. */
export function outsideDeadZone(offset: number, frameHeight: number, share = 0.08): boolean {
  return offset > frameHeight * share;
}

// Stage W14: the cinematic director's subject for an episode. Its own scratch (never the caller's out): subjectOf used
// to read each participant's position into the very vector it was summing into, so an episode of one animal was framed
// at twice its coordinates (on the 160 m map 50 m off, on the field map kilometres off: the camera filmed empty ground
// while the caption named the animal), and one of two at the second animal alone.
const GF_P = new Float64Array(3), GF_A = new Float64Array(3);
/**
 * Centre (out[0..2]) and size (m) of an episode's group: the actor and the first `limit` listed participants within
 * `near` m of it (in the plane), at least 1.6 m; the actor alone when none is near; 0 when nobody is drawn. pos writes a
 * drawn position into its second argument and says whether the animal is drawn.
 */
export function groupFrame(ids: readonly number[], actorId: number, pos: (id: number, o: Float64Array) => boolean, near: number, out: Float64Array, limit = 6): number {
  const anchored = actorId >= 0 && pos(actorId, GF_A);
  let n = 0, sx = 0, sy = 0, sz = 0, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let k = 0; k < ids.length && k < limit; k++) {
    const id = ids[k];
    if (id < 0 || !pos(id, GF_P)) continue;
    if (anchored && hyp2(GF_P[0] - GF_A[0], GF_P[2] - GF_A[2]) > near) continue;
    sx += GF_P[0]; sy += GF_P[1]; sz += GF_P[2]; n++;
    if (GF_P[0] < minX) minX = GF_P[0]; if (GF_P[0] > maxX) maxX = GF_P[0]; if (GF_P[2] < minZ) minZ = GF_P[2]; if (GF_P[2] > maxZ) maxZ = GF_P[2];
  }
  if (n) { out[0] = sx / n; out[1] = sy / n; out[2] = sz / n; return Math.max(1.6, hyp2(maxX - minX, maxZ - minZ) * 1.15); }
  if (anchored) { out[0] = GF_A[0]; out[1] = GF_A[1]; out[2] = GF_A[2]; return 1.6; }
  return 0;
}
