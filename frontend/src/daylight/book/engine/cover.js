// The one-piece cover (owner: book ENGINE): back, spine and front side by side on one
// sheet, with the wrap that folds over the boards, from the catalog for a product and page
// count. Checked in tests against RPI's own cover templates (data/rpi-catalog.js templates).
//
//   coverGeometry(product, pageCount) -> {
//     size:{w,h}                 the cover PDF page (MediaBox = BleedBox)
//     trim:{x,y,w,h}             the TrimBox: back + spine + front, the wrap/bleed outside it
//     wrap:{top,bottom,left,right} hardcover: the board wrap; softcover: bleed
//     panels:{back, spine, front} each {x,y,w,h} at the trim
//     hinge:[{x,y,w,h} back, {x,y,w,h} front]   hardcover only: keep faces and words out
//     safe:{back, front, spine}  where words and faces may go
//     spineWidth, spineText (true from 56 pages, BOOKS.md), binding, pageCount }
//   layoutCover(fonts, product, pageCount, {style, photo, title, subtitle, author, dates, wash})
//     -> {...geometry, style, background, items, photo:{id, ppi}|null, notes}
//   coverStyleFor(product, pageCount, photo, wanted) -> 'photo'|'framed'|'type'
//
// The three styles: 'photo' (the photo wraps the front edge to edge, title on a sticker; only
// when the photo has the pixels for it), 'framed' (a coloured cloth with the photo matted on
// the front, title beneath), 'type' (a coloured cloth and the title, no photo).
import { getProduct, spineWidth } from './products.js'
import { r2, rect, text, textBlock, image, cropFor } from './draw.js'
import { INK, WHITE, TYPE, LAYOUT, washOf } from './style.js'
import { wordmark, sticker } from './render.js'

export function coverGeometry(productId, pageCount) {
  const p = getProduct(productId)
  const c = p.cover
  const spine = spineWidth(p, pageCount)
  const wrap = { ...c.bleeds }
  const bw = c.post_trim_width, bh = c.post_trim_height
  const size = { w: wrap.left + bw + spine + bw + wrap.right, h: wrap.top + bh + wrap.bottom }
  const trim = { x: wrap.left, y: wrap.top, w: bw * 2 + spine, h: bh }
  const back = { x: wrap.left, y: wrap.top, w: bw, h: bh }
  const sp = { x: wrap.left + bw, y: wrap.top, w: spine, h: bh }
  const front = { x: wrap.left + bw + spine, y: wrap.top, w: bw, h: bh }
  const hw = c.hasHinge ? c.hinge_width : 0
  const hinge = c.hasHinge ? [{ x: back.x + bw - hw, y: back.y, w: hw, h: bh }, { x: front.x, y: front.y, w: hw, h: bh }] : []
  const sz = c.safe_zone
  const safe = {
    back: { x: back.x + sz.left, y: back.y + sz.top, w: bw - sz.left - Math.max(sz.right, hw), h: bh - sz.top - sz.bottom },
    front: { x: front.x + Math.max(sz.left, hw), y: front.y + sz.top, w: bw - Math.max(sz.left, hw) - sz.right, h: bh - sz.top - sz.bottom },
    spine: { x: sp.x + c.spine_safety_margin, y: sp.y + sz.top, w: Math.max(0, spine - 2 * c.spine_safety_margin), h: bh - sz.top - sz.bottom },
  }
  return {
    binding: p.binding,
    productId: p.id,
    pageCount,
    size,
    trim,
    wrap,
    panels: { back, spine: sp, front },
    hinge,
    safe,
    spineWidth: spine,
    spineText: pageCount >= 56 && safe.spine.w >= 12,
  }
}

/** What a front-wrapping photo would print at, in pixels per inch. */
function photoWrapPpi(g, photo) {
  const box = frontWrapBox(g)
  const crop = cropFor(photo.px, box.w / box.h)
  return { ppi: Math.min(crop.w / (box.w / 72), crop.h / (box.h / 72)), lost: crop.lost, crop, box }
}
// the front board and its wrap: from the spine's edge to the sheet's right edge
const frontWrapBox = (g) => ({ x: g.panels.front.x, y: 0, w: g.size.w - g.panels.front.x, h: g.size.h })

export function coverStyleFor(productId, pageCount, photo, wanted) {
  const g = coverGeometry(productId, pageCount)
  const floor = Math.max(LAYOUT.leadPpi, getProduct(productId).minPpi)
  const photoOk = photo && (() => { const r = photoWrapPpi(g, photo); return r.ppi >= floor && r.lost <= LAYOUT.cropBleed })()
  if (wanted === 'type') return 'type'
  if (wanted === 'photo' && photoOk) return 'photo'
  if (!photo) return 'type'
  if (wanted === 'framed') return 'framed'
  return photoOk ? 'photo' : 'framed'
}

export function layoutCover(fonts, productId, pageCount, o) {
  const g = coverGeometry(productId, pageCount)
  const p = getProduct(productId)
  const floor = Math.max(LAYOUT.leadPpi, p.minPpi)
  const style = coverStyleFor(productId, pageCount, o.photo, o.style)
  const wash = washOf(o.washIndex ?? 0)
  const notes = []
  if (o.style && o.style !== style) notes.push({ code: 'cover-style', message: style === 'framed' ? 'This photo is small, so we\'ve framed it on the cover.' : 'We used the title cover.' })
  const items = []
  let background = wash.tint
  let photoInfo = null
  const F = g.safe.front
  const title = o.title || ''
  const st = TYPE.title

  if (style === 'photo') {
    background = INK
    const r = photoWrapPpi(g, o.photo)
    items.push(image(o.photo, r.box, r.crop, { fit: 'bleed', floor }))
    photoInfo = { id: o.photo.id, ppi: Math.floor(r.ppi) }
    // title on a white sticker, bottom of the front's safe area
    const w = Math.min(F.w * 0.8, 340)
    const tb = textBlock(fonts, [{ text: title, font: st.font }], { x: 0, y: 0, width: w - 28, size: 26, leading: 28, color: INK, tracking: -0.4 })
    const h = tb.height + 26 + (o.dates ? 16 : 0)
    const x = F.x + 6, y = F.y + F.h - h - 6
    items.push(rect(x + 2.5, y + 2.5, w, h, INK, { r: 5 }))
    items.push(rect(x, y, w, h, WHITE, { r: 5, stroke: INK, strokeWidth: 1.5 }))
    items.push(...textBlock(fonts, [{ text: title, font: st.font }], { x: x + 14, y: y + 14, width: w - 28, size: 26, leading: 28, color: INK, tracking: -0.4 }).items)
    if (o.dates) items.push(text(x + 14, y + h - 12, o.dates.toUpperCase(), TYPE.label.font, 8, INK, { w: r2(fonts.measure(TYPE.label.font, 8, o.dates.toUpperCase(), 1)), tracking: 1 }))
  } else if (style === 'framed') {
    background = wash.tint
    // the photo matted on the front, as large as its pixels allow, above the title
    const tb = textBlock(fonts, [{ text: title, font: st.font }], { x: 0, y: 0, width: F.w - 20, size: 30, leading: 32, color: INK, tracking: -0.5 })
    const titleH = tb.height + (o.dates ? 22 : 0)
    const roomH = F.h - titleH - 40
    const a = o.photo.aspect
    let w = Math.min(F.w - 40, (o.photo.px.w / floor) * 72, roomH * a)
    let h = w / a
    if (h > roomH) { h = roomH; w = h * a }
    const m = 10
    const x = F.x + (F.w - w) / 2, y = F.y + 12 + m
    items.push(rect(x - m + 2.5, y - m + 2.5, w + 2 * m, h + 2 * m, INK, { r: 3 }))
    items.push(rect(x - m, y - m, w + 2 * m, h + 2 * m, WHITE, { r: 3, stroke: INK, strokeWidth: 1.25 }))
    const crop = cropFor(o.photo.px, w / h)
    items.push(image(o.photo, { x, y, w, h }, crop, { frame: 'mat', floor }))
    photoInfo = { id: o.photo.id, ppi: Math.floor(Math.min(crop.w / (w / 72), crop.h / (h / 72))) }
    const ty = y + h + m + 26
    items.push(...textBlock(fonts, [{ text: title, font: st.font }], { x: F.x + 10, y: ty, width: F.w - 20, size: 30, leading: 32, color: INK, tracking: -0.5, align: 'center' }).items)
    if (o.dates) {
      const d = o.dates.toUpperCase()
      const dw = fonts.measure(TYPE.label.font, 8.5, d, 1.1)
      items.push(text(F.x + (F.w - dw) / 2, ty + tb.height + 16, d, TYPE.label.font, 8.5, INK, { w: r2(dw), tracking: 1.1 }))
    }
  } else {
    background = wash.base
    const tb = textBlock(fonts, [{ text: title, font: st.font }], { x: F.x, y: F.y + F.h * 0.3, width: F.w * 0.92, size: 44, leading: 45, color: INK, tracking: -0.8 })
    items.push(...tb.items)
    if (o.dates) {
      const d = o.dates.toUpperCase()
      items.push(text(F.x, F.y + F.h * 0.3 + tb.height + 22, d, TYPE.label.font, 9, INK, { w: r2(fonts.measure(TYPE.label.font, 9, d, 1.2)), tracking: 1.2 }))
    }
    const s = sticker(fonts, { x: F.x, y: F.y + 4, label: (o.author ? `BY ${o.author}` : 'OUR STORY').toUpperCase() })
    items.push(s.item)
  }

  // back: the story's own summary, then the wordmark, centred low on the back board, clear
  // of the printer's barcode corner
  const B = g.safe.back
  if (o.summary) {
    const w = Math.min(B.w * 0.72, 300)
    const runs = [{ text: o.summary, font: 'story-italic' }]
    const tb = textBlock(fonts, runs, { x: 0, y: 0, width: w, size: 13, leading: 19, color: INK, align: 'center' })
    const colour = style === 'photo' ? WHITE : INK
    items.push(...textBlock(fonts, runs, { x: B.x + (B.w - w) / 2, y: B.y + B.h * 0.36 - tb.height / 2, width: w, size: 13, leading: 19, color: colour, align: 'center' }).items)
  }
  const probe = wordmark(fonts, 0, 0, 11)
  items.push(...wordmark(fonts, B.x + (B.w - probe.width) / 2, B.y + B.h - 30, 11).items.map((it) => (style === 'photo' ? recolour(it) : it)))
  if (style === 'photo') items.unshift(rect(0, 0, g.panels.spine.x + g.panels.spine.w, g.size.h, INK))

  // spine: the title, reading top to bottom, from 56 pages
  if (g.spineText) {
    const S = g.safe.spine
    const size = Math.min(11, S.w * 0.62)
    const label = title + (o.author ? `  ·  ${o.author}` : '')
    let s = label
    while (s.length > 3 && fonts.measure('heading', size, s) > S.h - 20) s = s.slice(0, -2).replace(/\s+$/, '') + '…'
    const w = fonts.measure('heading', size, s)
    const cx = S.x + S.w / 2, cy = S.y + S.h / 2
    const capH = (fonts.font('heading').capHeight / 1000) * size
    const colour = style === 'photo' ? WHITE : INK
    items.push({ type: 'group', rotate: 90, ox: r2(cx), oy: r2(cy), items: [text(cx - w / 2, cy + capH / 2, s, 'heading', size, colour, { w: r2(w) })] })
  }
  return { ...g, style, background, items, photo: photoInfo, notes }
}

// on an ink back cover the wordmark's text turns white
function recolour(it) {
  if (it.type === 'text' && it.color === INK) return { ...it, color: WHITE }
  if (it.type === 'group') return { ...it, items: it.items.map((x) => (x.type === 'text' ? x : x)) }
  return it
}
