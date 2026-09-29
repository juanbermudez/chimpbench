// Allocation-free distance helpers for per-frame render code. Math.hypot is a variadic builtin that V8 does not
// inline, so in hot loops it boxes every result (several MB/s of garbage at high playback speed); these small
// functions inline to plain arithmetic. Inputs here are metres or unit vectors, far from overflow.
export const hyp2 = (x: number, y: number): number => Math.sqrt(x * x + y * y);
export const hyp3 = (x: number, y: number, z: number): number => Math.sqrt(x * x + y * y + z * z);
export const hyp4 = (x: number, y: number, z: number, w: number): number => Math.sqrt(x * x + y * y + z * z + w * w);
