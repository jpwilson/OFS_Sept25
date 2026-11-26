// Display-list items (owner: book ENGINE). Every number is rounded to 1/100 point so the
// same input gives the same bytes. See README.md for the item types.
import { breakParagraph } from './text.js'

export const r2 = (v) => Math.round(v * 100) / 100
const r1 = (v) => Math.round(v * 10) / 10

export function rect(x, y, w, h, fill, extra = {}) {
  return { type: 'rect', x: r2(x), y: r2(y), w: r2(w), h: r2(h), fill: fill || null, ...extra }
}
export function circle(cx, cy, r, fill, extra = {}) {
  return { type: 'circle', cx: r2(cx), cy: r2(cy), r: r2(r), fill: fill || null, ...extra }
}
export function path(d, extra = {}) {
  return { type: 'path', d, ...extra }
}
/** One run of text on one baseline: x is the run's left edge, y its baseline. */
export function text(x, y, str, font, size, color, extra = {}) {
  return { type: 'text', x: r2(x), y: r2(y), text: str, font, size, color, ...extra }
}

/**
 * Lay out a block of text (already styled runs) in a box: returns {items, height, lines}.
 * opts: {x, y (top), width, size, leading, color, align:'left'|'center'|'right', tracking, firstBaseline}
 * The first baseline sits at y + firstBaseline (default 0.8 × size, about a cap height and
 * a little), so the top of the capitals lines up with y.
 */
export function textBlock(fonts, runs, o) {
  const lines = breakParagraph(fonts, runs, { width: o.width, size: o.size, tracking: o.tracking || 0 })
  const items = []
  const first = o.firstBaseline ?? r2(o.size * 0.8)
  lines.forEach((ln, i) => {
    const base = o.y + first + i * o.leading
    const off = o.align === 'center' ? (o.width - ln.w) / 2 : o.align === 'right' ? o.width - ln.w : 0
    for (const run of ln.runs) {
      const t = run.text
      if (!t.trim()) continue
      items.push(text(o.x + off + run.dx, base, t, run.font, o.size, o.color, { w: r2(run.w), ...(o.tracking ? { tracking: o.tracking } : {}) }))
    }
  })
  const height = lines.length ? first + (lines.length - 1) * o.leading + o.size * 0.25 : 0
  return { items, height, lines: lines.length, widths: lines.map((l) => l.w) }
}

/** Height a text block will take, without making items. */
export function textHeight(fonts, runs, o) {
  const n = breakParagraph(fonts, runs, { width: o.width, size: o.size, tracking: o.tracking || 0 }).length
  const first = o.firstBaseline ?? r2(o.size * 0.8)
  return n ? first + (n - 1) * o.leading + o.size * 0.25 : 0
}

/**
 * The crop of a photo for a slot of aspect A (width / height): the source rectangle in
 * pixels, and the share of the photo it cuts away. Landscapes crop evenly from both sides;
 * portraits keep their top (BOOKS.md: "keep the top of portraits").
 */
export function cropFor(px, A) {
  const a = px.w / px.h
  if (Math.abs(a - A) < 1e-6) return { x: 0, y: 0, w: px.w, h: px.h, lost: 0 }
  if (a > A) {
    const w = px.h * A
    return { x: (px.w - w) / 2, y: 0, w, h: px.h, lost: 1 - w / px.w }
  }
  const h = px.w / A
  const bias = a < 0.95 ? 0.2 : 0.45 // portraits keep their top; squarish nearly centred
  return { x: 0, y: (px.h - h) * bias, w: px.w, h, lost: 1 - h / px.h }
}

/** An image item: the crop rectangle (source pixels) drawn into the box (points). */
export function image(photo, box, crop, extra = {}) {
  const ppi = Math.min(crop.w / (box.w / 72), crop.h / (box.h / 72))
  return {
    type: 'image',
    ref: photo.id,
    x: r2(box.x), y: r2(box.y), w: r2(box.w), h: r2(box.h),
    crop: { x: r1(crop.x), y: r1(crop.y), w: r1(crop.w), h: r1(crop.h) },
    ppi: Math.floor(ppi),
    ...extra,
  }
}

/** SVG path data for a circle (four cubic Béziers), for drawers that only speak paths. */
export function circlePath(cx, cy, r) {
  const k = 0.5522847498 * r
  const f = (v) => r2(v)
  return `M${f(cx + r)} ${f(cy)}C${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)}C${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)}C${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)}C${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)}Z`
}
