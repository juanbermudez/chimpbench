// Forgiving screen-space picking (pure math, CSS pixels). The scene tries a label first, then the animal's own pick
// volume, then the nearest animal within a screen radius, so a click does not have to land exactly on a small body.
// CSS pixels are what pointer events report, so the reach is the same physical size at any device pixel ratio.

/** Reach of a click (CSS px) around an animal's on-screen body centre with a mouse (about 28 px at 1440 × 900). */
export const PICK_RADIUS = 28;
/** Reach with a finger (touch screens): design assumption, fingertips cover more than a cursor. */
export const PICK_RADIUS_TOUCH = 40;
/** The hovered animal keeps winning a click unless another animal is this much nearer the cursor (CSS px). */
export const PREFER_SLACK = 10;
/** Label hit box: at least this tall (CSS px), centred on the label, and this much wider on each side. */
export const LABEL_MIN_H = 32;
export const LABEL_PAD_X = 6;

export function pickRadius(pointerType: string): number {
  return pointerType === 'touch' || pointerType === 'pen' ? PICK_RADIUS_TOUCH : PICK_RADIUS;
}

/**
 * Index of the candidate nearest (px, py) whose screen point (xs[i], ys[i]) lies within max(radius, rs[i]) (rs: the
 * animal's own on-screen half-size, so a large close-up body is reachable anywhere on it), or −1 when none is.
 * prefer (an index or −1): the hovered candidate wins when it is within its own reach and at most slack farther away
 * than the nearest, so an animal walking past does not steal a click the user aimed at the highlighted one.
 */
export function nearestOnScreen(n: number, xs: ArrayLike<number>, ys: ArrayLike<number>, rs: ArrayLike<number>,
  px: number, py: number, radius: number, prefer: number, slack = PREFER_SLACK): number {
  let best = -1, bestD = Infinity, preferD = Infinity;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - px, dy = ys[i] - py, d = Math.sqrt(dx * dx + dy * dy);
    if (d > Math.max(radius, rs[i])) continue;
    if (i === prefer) preferD = d;
    if (d < bestD) { bestD = d; best = i; }
  }
  return prefer >= 0 && preferD <= bestD + slack ? prefer : best;
}

/** Whether (px, py) is inside the hit box of a w × h label centred at cx whose bottom edge is at bottom (CSS px). */
export function inLabelBox(px: number, py: number, cx: number, bottom: number, w: number, h: number, minH = LABEL_MIN_H, padX = LABEL_PAD_X): boolean {
  const cy = bottom - h / 2, halfH = Math.max(h / 2 + 4, minH / 2), halfW = w / 2 + padX;
  return Math.abs(px - cx) <= halfW && Math.abs(py - cy) <= halfH;
}
