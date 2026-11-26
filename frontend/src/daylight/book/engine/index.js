// The book engine's front door (owner: book ENGINE). Pure JavaScript: no React, no DOM.
// The display-list format is documented in README.md; this file is the functions other
// packages call.
//
//   ENGINE_VERSION, FORMAT
//   loadFonts(readBytes) -> Promise<Fonts>        FONT_FILES, FONT_BASE ('/book/fonts/')
//   measurePhotos(srcs, readHead) -> Promise<{[src]: {w, h} | null}>    imageSize(bytes)
//   buildSource({event, parsed, journey, tags, mediaStats, measured}) -> Source
//   layoutBook(source, {fonts, edits}) -> Book     (the display list; same input, same bytes)
//   bookToJSON(book) -> string                      stable serialisation
//   coverGeometry(productId, pageCount)   layoutCover(...)   COVER_STYLES
//   PRODUCTS LAUNCH_PRODUCTS DEFAULT_PRODUCT getProduct pageLimits spineWidth CATALOG_INFO
//   bookPrice printerCost shippingCost WORKING_PRICES
//   applyEdits normaliseEdits
//   checkBook(book) -> [problem]                    the rules, checked on a finished book
import { applyEdits, normaliseEdits, COVER_STYLES } from './edits.js'
import { paginate } from './layout.js'
import { renderPage, collect } from './render.js'
import { coverGeometry, layoutCover, coverStyleFor } from './cover.js'
import { getProduct, PRODUCTS, LAUNCH_PRODUCTS, DEFAULT_PRODUCT, pageLimits, spineWidth, CATALOG_INFO } from './products.js'
import { FONT_FILES, FONT_BASE, loadFonts, makeFonts } from './text.js'
import { LAYOUT } from './style.js'


export const ENGINE_VERSION = '1.0.0'
export const FORMAT = 'ofs-book-display-list'

export { buildSource } from './source.js'
export { measurePhotos, imageSize } from './measure.js'
export { bookPrice, printerCost, shippingCost, WORKING_PRICES } from './price.js'
export { applyEdits, normaliseEdits, COVER_STYLES, coverGeometry, layoutCover, coverStyleFor }
export { getProduct, PRODUCTS, LAUNCH_PRODUCTS, DEFAULT_PRODUCT, pageLimits, spineWidth, CATALOG_INFO }
export { FONT_FILES, FONT_BASE, loadFonts, makeFonts }

const r2 = (v) => Math.round(v * 100) / 100

/**
 * Lay out a whole book. source: from buildSource. options: {fonts (from loadFonts), edits}.
 * Returns the Book display list (README.md). Throws only on programming errors; a book that
 * cannot meet a rule says so in `notices`.
 */
export function layoutBook(source, { fonts, edits = {} } = {}) {
  if (!fonts) throw new Error('layoutBook: fonts are required (loadFonts)')
  const ed = applyEdits(source, edits)
  const src = ed.source
  const directives = ed.directives
  const product = getProduct(directives.size || DEFAULT_PRODUCT)
  const { ctx, plans, notices } = paginate(src, directives, { product, fonts })

  // the first page of "More photos" carries its label
  const firstMore = plans.findIndex((p) => p.section === 'more-photos')
  if (firstMore >= 0) plans[firstMore] = { ...plans[firstMore], firstOfMore: true }

  const pages = plans.map((plan, i) => renderPage(fonts, ctx, plan, i, src, directives))
  const pageCount = pages.length

  // cover
  const coverPhoto = directives.coverPhoto ? src.photos[directives.coverPhoto] : null
  const firstChapter = src.sections.find((s) => s.kind === 'chapter')
  const cover = layoutCover(fonts, product.id, pageCount, {
    style: directives.coverStyle,
    photo: coverPhoto,
    title: directives.title,
    subtitle: directives.subtitle,
    author: src.author.name,
    dates: src.dates.label,
    summary: src.summary,
    washIndex: firstChapter ? firstChapter.washIndex : 0,
  })

  // images used, with their real pixel sizes
  const used = new Set([...pages.flatMap((p) => p.photos), ...(cover.photo ? [cover.photo.id] : [])])
  const images = {}
  for (const id of Object.keys(src.photos).sort()) {
    if (!used.has(id)) continue
    const p = src.photos[id]
    images[id] = { src: p.src, px: { ...p.px }, sizeFrom: p.sizeFrom, caption: p.caption || '' }
  }

  // notices for the person: photos kept small, unplaced media, missing glyphs
  const held = []
  for (const page of pages) {
    for (const it of collect(page.items, (x) => x.type === 'image' && x.frame === 'mat')) held.push({ id: it.ref, page: page.number, ppi: it.ppi })
  }
  for (const h of held) notices.push({ code: 'held-small', photoId: h.id, page: h.page, message: "This photo is small, so we've kept it small in the book." })
  if (src.skipped.videos) notices.push({ code: 'videos', count: src.skipped.videos, message: src.skipped.videos === 1 ? 'A video in this story is not in the book.' : `${src.skipped.videos} videos in this story are not in the book.` })
  for (const n of cover.notes) notices.push(n)
  const missing = missingGlyphs(fonts, [...pages.flatMap((p) => p.items), ...cover.items])
  if (missing.length) notices.push({ code: 'missing-glyphs', chars: missing, message: 'Some characters in this story have no letter in the book\'s type and will not print.' })

  // sections: where each starts and ends
  const sections = src.sections.map((s) => {
    const nums = pages.filter((p) => p.section === s.id).map((p) => p.number)
    return { id: s.id, kind: s.kind, title: s.title, label: s.label || null, firstPage: nums[0] ?? null, lastPage: nums[nums.length - 1] ?? null }
  })

  const fontsUsed = new Set()
  for (const it of collect([...pages.flatMap((p) => p.items), ...cover.items], (x) => x.type === 'text')) fontsUsed.add(it.font)
  const fontTable = Object.fromEntries(Object.keys(FONT_FILES).filter((id) => fontsUsed.has(id)).map((id) => [id, { ...FONT_FILES[id], url: FONT_BASE + FONT_FILES[id].file }]))

  const book = {
    format: FORMAT,
    version: 1,
    engine: ENGINE_VERSION,
    units: 'pt',
    origin: 'top-left of each page\'s media (bleed) box, y down',
    story: { id: src.id, slug: src.slug, title: src.title },
    title: directives.title,
    product: {
      id: product.id,
      sku: product.sku,
      label: product.label,
      binding: product.binding,
      trim: { ...product.trim },
      bleed: { ...product.bleed },
      safe: { ...product.safe },
      catalog: { ...CATALOG_INFO },
    },
    pageCount,
    limits: pageLimits(product),
    fonts: fontTable,
    images,
    cover: {
      style: cover.style,
      size: cover.size,
      trim: cover.trim,
      bleed: { x: 0, y: 0, w: cover.size.w, h: cover.size.h },
      wrap: cover.wrap,
      panels: cover.panels,
      hinge: cover.hinge,
      safe: cover.safe,
      spineWidth: cover.spineWidth,
      spineText: cover.spineText,
      background: cover.background,
      photo: cover.photo,
      items: cover.items,
    },
    pages,
    sections,
    notices,
    edits: { ...ed.edits, applied: ed.applied, ignored: ed.ignored },
    stats: stats(pages, ctx),
  }
  return book
}

function missingGlyphs(fonts, items) {
  const out = new Set()
  for (const it of collect(items, (x) => x.type === 'text')) for (const ch of fonts.missing(it.font, it.text)) out.add(ch)
  return [...out].sort()
}

function stats(pages, ctx) {
  const by = {}
  let minPpi = Infinity
  for (const p of pages) {
    by[p.template] = (by[p.template] || 0) + 1
    for (const it of collect(p.items, (x) => x.type === 'image')) minPpi = Math.min(minPpi, it.ppi)
  }
  return {
    templates: Object.fromEntries(Object.keys(by).sort().map((k) => [k, by[k]])),
    minPpi: Number.isFinite(minPpi) ? minPpi : null,
    measure: r2(ctx.measure),
    contentBox: { w: r2(ctx.cb.w), h: r2(ctx.cb.h) },
    margins: Object.fromEntries(Object.entries(ctx.margins).map(([k, v]) => [k, r2(v)])),
  }
}

/** Stable JSON: the book's own key order, two-space indent. */
export function bookToJSON(book) {
  return JSON.stringify(book, null, 1)
}

/**
 * The rules, checked on a finished book. Returns a list of problems (empty when the book
 * keeps them all): page count, resolution floors, safe zone, crop caps, image boxes inside
 * one page.
 */
export function checkBook(book) {
  const problems = []
  const { pageCount, limits } = book
  if (pageCount % 2) problems.push(`odd page count ${pageCount}`)
  if (pageCount < limits.min || pageCount > limits.max) problems.push(`page count ${pageCount} outside ${limits.min}-${limits.max}`)
  for (const page of book.pages) {
    const s = page.safe
    for (const it of collect(page.items, () => true)) {
      if (it.type === 'image') {
        if (it.ppi < it.floor) problems.push(`page ${page.number}: ${it.ref} at ${it.ppi} ppi, under its floor of ${it.floor}`)
        const img = book.images[it.ref]
        const lost = 1 - (it.crop.w * it.crop.h) / (img.px.w * img.px.h)
        const cap = it.fit === 'bleed' ? LAYOUT.cropBleed : LAYOUT.cropFramed
        if (lost > cap + 0.005) problems.push(`page ${page.number}: ${it.ref} cropped ${(lost * 100).toFixed(1)}%`)
        if (it.fit !== 'bleed' && (it.x < s.x - 0.01 || it.y < s.y - 0.01 || it.x + it.w > s.x + s.w + 0.01 || it.y + it.h > s.y + s.h + 0.01)) problems.push(`page ${page.number}: ${it.ref} outside the safe zone`)
        if (it.x < -0.01 || it.x + it.w > page.size.w + 0.01) problems.push(`page ${page.number}: ${it.ref} crosses the page edge`)
      }
      if (it.type === 'text') {
        const x2 = it.x + (it.w || 0)
        if (it.x < s.x - 0.01 || x2 > s.x + s.w + 0.01 || it.y - it.size < s.y - 0.01 || it.y > s.y + s.h + 0.01) problems.push(`page ${page.number}: text "${it.text.slice(0, 24)}" outside the safe zone`)
      }
    }
  }
  return problems
}

export { makeFonts as _makeFonts }
