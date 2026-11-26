// The book's design constants (owner: book ENGINE): colours, type and margins. Product
// geometry (trim, bleed, safe zone, spine) is never here: it comes from products.js.
// Colours are opaque sRGB hex (print files avoid live transparency), mixed from the
// Daylight tokens so the book and the app are the same family.
import { COLOR, WASH, DAY_WASHES } from '../../styles/tokens.js'

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** a over b at opacity t, as an opaque hex colour. */
export function mix(a, b, t) {
  const A = hex(a), B = hex(b)
  return '#' + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join('').toUpperCase()
}

export const INK = COLOR.ink.toUpperCase()
export const WHITE = '#FFFFFF'
export const PAPER = COLOR.paper.toUpperCase()
export const PAPER_DEEP = COLOR.paperDeep.toUpperCase()
export const CAPTION = mix(COLOR.ink, '#FFFFFF', 0.78) // ink 78% on white
export const MUTE = mix(COLOR.ink, '#FFFFFF', 0.62)
export const HAIRLINE = mix(COLOR.ink, '#FFFFFF', 0.16)

/** The day/section colour, as the map uses it: azure fizz lime zest violet tide sun, in turn. */
export function washOf(i) {
  const name = DAY_WASHES[((i % DAY_WASHES.length) + DAY_WASHES.length) % DAY_WASHES.length]
  const w = WASH[name]
  return { name, base: w.base.toUpperCase(), deep: w.deep.toUpperCase(), tint: w.tint.toUpperCase() }
}
export function washNamed(name) {
  const w = WASH[name] || WASH.tide
  return { name, base: w.base.toUpperCase(), deep: w.deep.toUpperCase(), tint: w.tint.toUpperCase() }
}

/** Margins in inches (BOOKS.md "Rules": wider than the printer's safe zone, about 0.5 in outside, 0.625 in at the gutter). */
export const MARGIN_IN = { top: 0.5, bottom: 0.625, outside: 0.5, inside: 0.625 }
/** Never closer to the trim than the catalog's safe zone plus this much (points). */
export const SAFE_EXTRA = 18

// Type, in points. Story text: Literata about 10.5 on 15, about 65 characters a line.
export const TYPE = {
  body: { size: 10.5, leading: 15, paraGap: 7.5, chars: 65 },
  h2: { font: 'heading', size: 14, leading: 18, gapBefore: 15, gapAfter: 4 },
  h3: { font: 'ui-semibold', size: 11, leading: 15, gapBefore: 11, gapAfter: 2 },
  quoteIndent: 14,
  caption: { font: 'ui', size: 8.5, leading: 12, gap: 6, minWidth: 200 },
  stop: { font: 'mono-medium', size: 7.5, leading: 15, tracking: 0.9, gapBefore: 9, gapAfter: 0 },
  folio: { font: 'mono', size: 7.5, tracking: 0.6 },
  label: { font: 'mono-medium', size: 8.5, tracking: 1.1 },
  title: { font: 'display', size: 40, leading: 42, tracking: -0.6 },
  opener: { font: 'display', size: 34, leading: 36, tracking: -0.5 },
}

// Layout numbers that are design, not printer geometry.
export const LAYOUT = {
  gap: 12, // between photos
  ppi: 180, // a photo prints only at 180 pixels per inch or better (BOOKS.md decision 3)
  leadPpi: 150, // a section's lead photo, and the cover photo
  cropFramed: 0.15, // at most this much of a photo is cropped away in a framed slot
  cropBleed: 0.25, // or in a full-bleed slot
  smallFrame: 0.5, // a single photo held to under this share of the content box is matted
  mat: 9, // white mat around a photo held small
  keyline: 0.75,
}
