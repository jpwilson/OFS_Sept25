// Scroll maths (owner: F0). Pure functions; every beat is written in these.

/** Clamp v to [min, max] (default 0..1). @type {(v:number, min?:number, max?:number)=>number} */
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

/** a -> b by t (unclamped). @type {(a:number, b:number, t:number)=>number} */
export const lerp = (a, b, t) => a + (b - a) * t

/** Where v sits between a and b, as 0..1 (unclamped; wrap in clamp or use win()). */
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a))

/** Map v from [inA, inB] to [outA, outB], clamped to the output range. */
export const remap = (v, inA, inB, outA, outB) => lerp(outA, outB, clamp(invLerp(inA, inB, v)))

/** Ease both ends; t in 0..1. */
export const smoothstep = (t) => {
  const x = clamp(t)
  return x * x * (3 - 2 * x)
}

/** Arrives and settles. */
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3)

export const easeInOutCubic = (t) => {
  const x = clamp(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** Slight overshoot, for pops. Not clamped above 1 on purpose. */
export const easeOutBack = (t) => {
  const x = clamp(t)
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** Progress 0..1 of p inside the window [a, b], clamped. The unit every beat is written in. */
export function win(p, a, b) {
  return clamp(invLerp(a, b, p))
}
