// Small maths shared by the engine and the beats (owner: film).
import { clamp, win } from '../lib/math.js'

export const f1 = (v) => Math.round(v * 10) / 10
export const f3 = (v) => Math.round(v * 1000) / 1000
export const bump = (t) => Math.sin(Math.PI * clamp(t))
/** Ease out with an overshoot of strength s: things arrive, pass their mark, settle. */
export const back = (t, s = 1.70158) => {
  const x = clamp(t) - 1
  return 1 + (s + 1) * x * x * x + s * x * x
}
/** Height of something dropped from 1: falls, lands, one small rebound. */
export const drop = (t) => {
  const x = clamp(t)
  if (x < 0.62) {
    const k = x / 0.62
    return 1 - k * k
  }
  return 0.06 * Math.sin(Math.PI * ((x - 0.62) / 0.38))
}
export const floodEase = (t) => 1 - Math.pow(1 - clamp(t), 2.2)
/** Progress of S through a [a, b] range from the timeline. */
export const w = (S, r) => win(S, r[0], r[1])
/** Progress of the i-th item of a staggered run { a, step, dur }. */
export const wi = (S, run, i) => win(S, run.a + i * run.step, run.a + i * run.step + run.dur)

/**
 * A slow rise: eases in and out (never faster than one and a half times its average speed),
 * drifts a few percent past its mark near the end and settles. For people arriving.
 */
export const settle = (t, over = 0.03) => {
  const x = clamp(t)
  const s = x * x * (3 - 2 * x)
  return s + over * Math.sin(Math.PI * clamp((x - 0.72) / 0.28))
}
