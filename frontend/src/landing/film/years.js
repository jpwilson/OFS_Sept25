// Chapter 07's geometry, worked out from the art itself (owner: film).
// The five pair cut-outs share one crop box, so they are drawn at one size and the children
// grow inside it: where each head is comes from the manifest (headTop), never from a guess.
// A stage whose art has not landed uses the stand-in, drawn at that age's height instead.
import { art as getArt, hasArt } from '../art/manifest.js'
import { YEARS as L } from './layout.js'

const LAST = L.tall.length - 1
const r3 = (v) => Math.round(v * 1000) / 1000
const lastReal = hasArt(L.art[LAST]) ? getArt(L.art[LAST]) : null
/** The drawn height of the shared crop box, in adult heights: the grown pair stands tall[LAST]. */
const BOX = L.tall[LAST] / (lastReal ? lastReal.feet - lastReal.headTop : 0.956)

/**
 * One entry per age. art: the cut-out; h: its drawn height (adult heights); feet, head: where
 * the children stand and where the taller head is, as fractions of the image; vis: the taller
 * child's height (adult heights); ivy, leo: each child's height for the pencil marks.
 */
export const AGES = L.art.map((id, i) => {
  const real = hasArt(id)
  const a = getArt(real ? id : L.standIn)
  const span = a.feet - a.headTop
  const h = real ? BOX : L.tall[i] / span
  const vis = span * h
  return {
    art: real ? id : L.standIn,
    real,
    h: r3(h),
    feet: a.feet,
    head: a.headTop,
    vis: r3(vis),
    ivy: r3((L.ivy[i] / L.tall[i]) * vis),
    leo: r3((L.leo[i] / L.tall[i]) * vis),
    half: r3((h * a.w) / a.h / 2),
  }
})

// A child who has stopped growing would stack her marks on one line: keep each mark a little
// above the last so every age can be read (the tick moves by at most a couple of percent).
const GAP = 0.03
for (const who of ['ivy', 'leo']) {
  for (let i = 1; i < AGES.length; i++) AGES[i][who] = r3(Math.max(AGES[i][who], AGES[i - 1][who] + GAP))
}

/** The grown pair's height, and half the widest pair's width (adult heights). */
export const TOP = AGES[LAST].vis
export const HALF = Math.max(...AGES.map((g) => g.half))
