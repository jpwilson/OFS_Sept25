// Art manifest reader (owner: F0). The ART producer writes manifest.json; this only reads it.
// Entry: { src, srcM, w, h, kind: person|group|object|prop|photo|plate|ui, alpha, feet, headTop, ax }
//   src  full-size WebP (content-hashed name under /landing/img or /landing/ui)
//   srcM phone-size WebP (may be missing; falls back to src)
//   feet / headTop  0..1 of the image height where the feet and the top of the head are
//   ax   0..1 of the width where the figure's centre of mass sits
import MANIFEST from './manifest.json'

/** @typedef {{id:string, src:string, srcM:string, w:number, h:number, kind:string, alpha:boolean, feet:number, headTop:number, ax:number}} Art */

const warned = new Set()

function normalise(id, e) {
  const w = Number(e.w) || 0
  const h = Number(e.h) || 0
  return {
    id,
    src: e.src,
    srcM: e.srcM || e.src,
    wM: Number(e.wM) || 0,
    w,
    h,
    kind: e.kind || 'object',
    alpha: !!e.alpha,
    feet: e.feet ?? 1,
    headTop: e.headTop ?? 0,
    ax: e.ax ?? 0.5,
  }
}

/** True when the manifest has a usable entry for id. */
export function hasArt(id) {
  const e = MANIFEST[id]
  return !!(e && e.src)
}

/** The entry, or null (logs once per missing id, never throws). @returns {Art|null} */
export function maybeArt(id) {
  if (hasArt(id)) return normalise(id, MANIFEST[id])
  if (!warned.has(id)) {
    warned.add(id)
    if (typeof console !== 'undefined') console.warn(`[art] "${id}" is not in art/manifest.json yet; showing a placeholder`)
  }
  return null
}

/**
 * The entry. A missing id returns a placeholder-shaped record ({ missing: true, src: '' })
 * so callers never crash; the primitives render a labelled box for it.
 * @returns {Art & {missing?: boolean}}
 */
export function art(id) {
  return maybeArt(id) || { id, src: '', srcM: '', w: 3, h: 4, kind: 'object', alpha: false, feet: 1, headTop: 0, ax: 0.5, missing: true }
}

/** Every id in the manifest (for the dev gallery). */
export const ART_IDS = Object.keys(MANIFEST)
