// Short portrait screens (owner: film). On a phone or a tablet held upright, a chapter's copy
// sits at the top and its docks and the chapter rail at the bottom, all sized in px, while its
// art is placed in u against a floor line at a fixed share of the height. When the visible
// height is short (a phone with its browser bars showing) the copy and the docks take a bigger
// share of it and the art runs into them.
//
// fit() measures each chapter's art at rest and, column by column, the room between the bottom
// of its copy and whatever sits below each part of it (a dock, the rail). If the art does not sit inside that
// room it moves the floor (and the art with it) by the least that makes it fit. If the room is
// too small, the scene first lets its readout row go (data-tight: the row of facts is hidden and
// the audience chip takes its place) and only then shrinks its unit. The result is written on
// the scene as --fit-floor and --fit-u (stage.module.css reads them); the engine uses the same
// numbers for its motion.
//
// The art is every named part of the scene (data-f) except its copy, its docks, its giant word
// and the people: people may stand behind the copy, but a print, a tag or a card may not.
//
// Called by the engine on every resize (pinned) and by Film for the poster column.
import { FIT, STAGE, pick } from './layout.js'

/** The stage unit, as stage.module.css defines it (100u = min(100svh, 62.5vw) and so on). */
export function stageUnit(W, H) {
  const phone = W / H <= 0.9
  const tablet = phone && W >= 700
  const u = tablet ? Math.min(H / 85, W * 0.0172) : phone ? Math.min(H / 100, W * 0.0216) : Math.min(H / 100, W * 0.00625)
  return { u, kind: tablet ? 't' : phone ? 'm' : 'd' }
}

const GAP = 10 // px of air kept between the art and the copy, and between the art and a dock
const NOT_ART = /:(copy|bl|br|body|ghost)$/

function setVars(el, u, floor) {
  if (u == null) {
    el.removeAttribute('data-fit')
    el.style.removeProperty('--fit-u')
    el.style.removeProperty('--fit-floor')
    return
  }
  el.setAttribute('data-fit', '')
  el.style.setProperty('--fit-u', `${u.toFixed(3)}px`)
  el.style.setProperty('--fit-floor', `${floor.toFixed(1)}px`)
}

/** The art's parts: named, laid out, and not copy, docks, giant word or people. */
function artParts(el, skip) {
  const out = []
  el.querySelectorAll('[data-f]').forEach((n) => {
    const name = n.getAttribute('data-f')
    if (NOT_ART.test(name) || skip.includes(name)) return
    if (n.closest('[data-actor]') || n.closest('[data-f$=":copy"], [data-f$=":bl"], [data-f$=":br"]')) return
    out.push(n)
  })
  return out
}

/** What sits along the scene's bottom edge, as { top, left, right } in scene px: its docks, and the rail. */
function bottomBoxes(el, rail) {
  const out = rail ? [rail] : []
  el.querySelectorAll(':scope > [data-f$=":bl"], :scope > [data-f$=":br"]').forEach((d) => {
    if (!d.offsetHeight || getComputedStyle(d).display === 'none') return
    const r = d.getBoundingClientRect()
    out.push({ top: d.offsetTop, left: r.left, right: r.right })
  })
  return out
}

/**
 * The copy as boxes, one per block (its slate row, its headline, its sentence): top and bottom
 * in scene px, columns (left, right) in page px. A part under a block's columns must clear its
 * bottom; nothing of the art may rise above the copy's top (the nav and the counter are there).
 */
function copyBoxes(el, copy) {
  const top0 = el.getBoundingClientRect().top
  const out = []
  for (const c of copy.children) {
    const r = c.getBoundingClientRect()
    if (!r.width) continue
    out.push({ bottom: r.bottom - top0, left: r.left, right: r.right })
  }
  return { top: copy.offsetTop, bottom: Math.max(copy.offsetTop + copy.offsetHeight, ...out.map((b) => b.bottom)), blocks: out }
}

/**
 * Where the floor may go, for the art as laid out now with its floor at floor0: low enough that
 * every part under the copy's columns clears the copy, high enough that every part clears the
 * boxes below it that share its columns. Returns [lo, hi]; the art fits when lo <= hi.
 */
function room(el, parts, floor0, copy, boxes, H) {
  const top0 = el.getBoundingClientRect().top
  let lo = -Infinity
  let hi = Infinity
  for (const n of parts) {
    const r = n.getBoundingClientRect()
    if (!r.width || !r.height) continue
    let below = copy.top
    for (const b of copy.blocks) if (b.left < r.right && b.right > r.left) below = Math.max(below, b.bottom + GAP)
    lo = Math.max(lo, below + floor0 - (r.top - top0))
    let limit = H
    for (const b of boxes) if (b.left < r.right && b.right > r.left) limit = Math.min(limit, b.top)
    hi = Math.min(hi, limit - GAP - (r.bottom - top0 - floor0))
  }
  return [lo, hi]
}

/**
 * Fit one scene. Returns { u, floor } in px when it was refitted, or null when it is left as
 * designed (landscape, no FIT entry, or it already fits). rail: the rail's box, or null.
 * `rest` runs a measurement with every engine transform taken off (pinned), so the parts are
 * measured where they rest.
 */
export function fitScene(el, k, W, H, rail, rest = (fn) => fn()) {
  const { u: u0, kind } = stageUnit(W, H)
  // a wide screen keeps its art beside the copy, not under it: it is left as designed
  const f = FIT[k] && kind !== 'd' ? FIT[k] : null
  const copy = f ? el.querySelector(`[data-f="${k}:copy"]`) : null
  el.removeAttribute('data-tight')
  setVars(el, null)
  if (!copy) return null

  const floor0 = (pick(STAGE[k], kind).floor / 100) * H
  const box = copyBoxes(el, copy)
  // where the copy ends, for parts that hang from it rather than from the floor (07 on a tablet)
  el.style.setProperty('--copy-b', `${Math.round(box.bottom)}px`)
  const skip = f.skip ? (Array.isArray(f.skip) ? f.skip : pick(f.skip, kind) || []) : []
  const parts = artParts(el, skip)
  const readouts = !!el.querySelector(':scope > [data-f$=":bl"]')
  return rest(() => {
    // u: the unit to try; returns where the floor goes, or null if the art does not fit
    const tryUnit = (u) => {
      if (u < u0) setVars(el, u, floor0)
      const [lo, hi] = room(el, parts, floor0, box, bottomBoxes(el, rail), H)
      return lo <= hi + 0.5 ? Math.min(Math.max(floor0, lo), hi) : null
    }
    let floor = tryUnit(u0)
    if (floor == null && readouts) {
      el.setAttribute('data-tight', '')
      floor = tryUnit(u0)
      if (floor == null) el.removeAttribute('data-tight')
    }
    let u = u0
    if (floor == null) {
      // shrink: the largest unit that fits, found by halving (px-sized parts do not scale)
      if (readouts) el.setAttribute('data-tight', '')
      let lo = 0.4
      let hi = 1
      let best = null
      for (let i = 0; i < 7; i++) {
        const s = (lo + hi) / 2
        const at = tryUnit(u0 * s)
        if (at == null) hi = s
        else {
          lo = s
          best = { s, at }
        }
      }
      if (!best) setVars(el, u0 * lo, floor0)
      u = u0 * (best ? best.s : lo)
      floor = best ? best.at : Math.max(floor0, room(el, parts, floor0, box, [], H)[0])
    }
    if (u >= u0 && Math.abs(floor - floor0) < 0.5) {
      setVars(el, null)
      return null
    }
    setVars(el, u, floor)
    return { u, floor }
  })
}

/** Fit every scene inside the film's pin. Returns { [key]: { u, floor } } for the refitted ones. */
export function fit(pin, rest) {
  const out = {}
  const rail = pin.querySelector('[data-f="hud:rail"]')
  pin.querySelectorAll('[data-scene]').forEach((el) => {
    const W = el.clientWidth
    const H = el.clientHeight
    if (!W || !H) return
    // the rail sits in a zero-height slot on the stage's bottom edge (offsets ignore the engine's transforms)
    let box = null
    if (rail && rail.offsetParent) {
      const r = rail.getBoundingClientRect()
      box = { top: rail.offsetParent.offsetTop + rail.offsetTop, left: r.left, right: r.right }
    }
    const k = el.getAttribute('data-scene')
    const r = fitScene(el, k, W, H, box, rest)
    if (r) out[k] = r
  })
  return out
}
