// Page templates (owner: book ENGINE). BOOKS.md "What a book is": section opener, full
// bleed, framed single, pair (two landscapes stacked or two portraits side by side), trio
// (one large and two small), grid of four, text page, text with photo, map, title,
// dedication, colophon. No image crosses the gutter: every slot sits inside one page.
//
// Photo templates work in the content box's own coordinates (0,0 at its top left) and
// return a candidate, or null when the photos do not suit the template:
//   {template, kind, slots:[{id, x, y, w, h, crop, lost, ppi, floor, frame:'plain'|'mat', cap}],
//    coverage, lost, held, sizeShare:{[id]: share of the content box}}
//   cap: {x, y, w, align, runs} or null (the caption's box; drawn by layout.js)
// Resolution decides size (decision 3): a template is scaled down until every slot prints at
// its floor (180 pixels per inch, 150 for a lead photo); a single photo that ends up small
// is matted and centred instead of stretched.
import { cropFor, textHeight } from './draw.js'
import { breakParagraph, storyFont as storyFontOf } from './text.js'
import { LAYOUT, TYPE } from './style.js'

const captionRuns = (p) => (p.caption ? [{ text: p.caption, font: TYPE.caption.font }] : null)

/** Height of a photo's caption at a width (gap included), 0 without one. */
export function capHeight(ctx, p, w) {
  const runs = captionRuns(p)
  if (!runs) return 0
  const cw = Math.max(w, Math.min(TYPE.caption.minWidth, ctx.cb.w))
  return TYPE.caption.gap + textHeight(ctx.fonts, runs, { width: cw, size: TYPE.caption.size, leading: TYPE.caption.leading })
}

const floorOf = (ctx, p) => (p.lead || p.cover ? ctx.leadPpi : ctx.ppi)
/** Largest width (points) a crop of w pixels may print at. */
const maxW = (ctx, p, cropW) => (cropW / floorOf(ctx, p)) * 72 * 0.999 // a hair under, so rounding never lands below the floor

/** The crop variants a slot may use for a photo: its own shape, or a tighter one within the cap. */
function aspectsFor(p, cap) {
  const a = p.aspect
  const out = [a]
  for (const t of [4 / 3, 3 / 2, 1, 3 / 4, 16 / 9]) {
    const lost = a > t ? 1 - t / a : 1 - a / t
    if (lost > 1e-3 && lost <= cap) out.push(t)
  }
  return out
}

function slot(ctx, p, x, y, w, h, extra = {}) {
  const crop = cropFor(p.px, w / h)
  const ppi = Math.min(crop.w / (w / 72), crop.h / (h / 72))
  return { id: p.id, x, y, w, h, crop, lost: crop.lost, ppi, floor: floorOf(ctx, p), frame: 'plain', cap: null, ...extra }
}

function withCaption(ctx, s, p, align = 'left') {
  const runs = captionRuns(p)
  if (!runs) return s
  const cw = Math.max(s.w, Math.min(TYPE.caption.minWidth, ctx.cb.w))
  const cx = cw > s.w ? Math.max(0, Math.min(ctx.cb.w - cw, s.x + s.w / 2 - cw / 2)) : s.x
  const matPad = s.frame === 'mat' ? LAYOUT.mat : 0
  s.cap = { x: cx, y: s.y + s.h + matPad + TYPE.caption.gap, w: cw, align: cw > s.w ? 'center' : align, runs }
  return s
}

function finish(ctx, template, kind, slots, photos, extra = {}) {
  const area = ctx.cb.w * ctx.cb.h
  // photos held small in a group are matted like a small single: each shrinks inside its own
  // slot by the mat, so the cards never touch
  if (slots.length > 1 && slots.reduce((t, x) => t + x.w * x.h, 0) / area < 0.35) {
    const m = LAYOUT.mat + 2
    for (const s of slots) {
      const w = s.w - 2 * m
      if (w < 40) break
      const h = s.h * (w / s.w)
      s.x += m
      s.y += (s.h - h) - m
      s.w = w
      s.h = h
      s.ppi = Math.min(s.crop.w / (w / 72), s.crop.h / (h / 72))
      s.frame = 'mat'
    }
  }
  const coverage = slots.reduce((s, x) => s + x.w * x.h, 0) / area
  const sizeShare = Object.fromEntries(slots.map((s) => [s.id, (s.w * s.h) / area]))
  const lost = slots.reduce((s, x) => s + x.lost, 0)
  void photos
  for (const s of slots) if (s.ppi + 1e-6 < s.floor) return null
  return { template, kind, slots, coverage, lost, sizeShare, held: false, ...extra }
}

// Shrink a block of height h to the content box vertically: top offset that sits a block a
// little above the middle (optical centre).
const opticalTop = (H, h) => Math.max(0, (H - h) * 0.42)

/** Framed single: the whole photo, as large as the page and its pixels allow. */
export function framed(ctx, p, { maxShare = 1, area = null } = {}) {
  const W = area ? area.w : ctx.cb.w, H = area ? area.h : ctx.cb.h
  const a = p.aspect
  let w = Math.min(W, maxW(ctx, p, p.px.w), Math.sqrt(maxShare * ctx.cb.w * ctx.cb.h * a))
  for (let k = 0; k < 4; k++) {
    const h = w / a
    const room = H - capHeight(ctx, p, w)
    if (h > room) w = room * a
  }
  if (w < 40) return null
  const h = w / a
  const resLimited = w >= maxW(ctx, p, p.px.w) - 1
  const share = (w * h) / (ctx.cb.w * ctx.cb.h)
  const held = resLimited && share < LAYOUT.smallFrame && !area
  let s
  if (held) {
    // matted: white card, hairline keyline, centred with generous space around it
    const m = LAYOUT.mat
    const ww = Math.min(w, W - 2 * m), hh = ww / a
    const capH = capHeight(ctx, p, ww + 2 * m)
    const blockH = hh + 2 * m + capH
    s = slot(ctx, p, (W - ww) / 2, opticalTop(H, blockH) + m, ww, hh, { frame: 'mat' })
  } else {
    const blockH = h + capHeight(ctx, p, w)
    s = slot(ctx, p, (W - w) / 2, area ? 0 : opticalTop(H, blockH), w, h)
  }
  withCaption(ctx, s, p)
  const c = finish(ctx, 'framed', 'single', [s], [p])
  if (c) c.held = held
  return c
}

/** Full bleed: the photo fills the page and its bleed; earned only by enough pixels. */
export function fullBleed(ctx, p) {
  const bw = ctx.page.w + ctx.page.bleedW, bh = ctx.page.h + ctx.page.bleedH
  const crop = cropFor(p.px, bw / bh)
  if (crop.lost > LAYOUT.cropBleed) return null
  const ppi = Math.min(crop.w / (bw / 72), crop.h / (bh / 72))
  if (ppi < floorOf(ctx, p)) return null
  // in the content box's coordinates the bleed box starts outside it; layout.js places it
  const s = { id: p.id, x: -ctx.cb.x - ctx.page.bleedL, y: -ctx.cb.y - ctx.page.bleedT, w: bw, h: bh, crop, lost: crop.lost, ppi, floor: floorOf(ctx, p), frame: 'bleed', cap: null }
  if (p.caption) {
    // a white label inside the content box, bottom left
    const cw = Math.min(ctx.cb.w * 0.6, 260)
    const runs = captionRuns(p)
    const th = textHeight(ctx.fonts, runs, { width: cw - 16, size: TYPE.caption.size, leading: TYPE.caption.leading })
    s.cap = { x: 0, y: ctx.cb.h - th - 16, w: cw - 16, align: 'left', runs, label: { x: -8, y: ctx.cb.h - th - 24, w: cw, h: th + 16 } }
  }
  return { template: 'full-bleed', kind: 'bleed', slots: [s], coverage: 1, lost: crop.lost, sizeShare: { [p.id]: 1.3 }, held: false }
}

/** Solve for the largest scale (0..1] where make(scale) fits, by bisection. */
function largest(make) {
  let best = make(1)
  if (best) return best
  let lo = 0.2, hi = 1
  best = make(lo)
  if (!best) return null
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    const c = make(mid)
    if (c) { best = c; lo = mid } else hi = mid
  }
  return best
}

/** Two photos stacked, the same width (landscapes). */
export function pairStack(ctx, a, b) {
  if (a.aspect < 1.15 || b.aspect < 1.15) return null
  const W = ctx.cb.w, H = ctx.cb.h, g = ctx.gap * 1.5
  let best = null
  for (const ta of aspectsFor(a, LAYOUT.cropFramed).filter((t) => t >= 1.15)) {
    for (const tb of aspectsFor(b, LAYOUT.cropFramed).filter((t) => t >= 1.15)) {
      const c = largest((s) => {
        const w = W * s
        const ha = w / ta, hb = w / tb
        const total = ha + capHeight(ctx, a, w) + g + hb + capHeight(ctx, b, w)
        if (total > H) return null
        const x = (W - w) / 2, y0 = opticalTop(H, total)
        const sa = withCaption(ctx, slot(ctx, a, x, y0, w, ha), a)
        const sb = withCaption(ctx, slot(ctx, b, x, y0 + ha + capHeight(ctx, a, w) + g, w, hb), b)
        return finish(ctx, 'pair-stack', 'pair', [sa, sb], [a, b])
      })
      if (c && (!best || score(c) > score(best))) best = c
    }
  }
  return best
}

/** Photos side by side at one height (two portraits, or a mixed pair). */
export function pairSide(ctx, a, b) {
  const W = ctx.cb.w, H = ctx.cb.h, g = ctx.gap
  let best = null
  for (const ta of aspectsFor(a, LAYOUT.cropFramed)) {
    for (const tb of aspectsFor(b, LAYOUT.cropFramed)) {
      const c = largest((s) => {
        const ww = W * s
        const h = (ww - g) / (ta + tb)
        const wa = h * ta, wb = h * tb
        const capRow = Math.max(capHeight(ctx, a, wa), capHeight(ctx, b, wb))
        if (h + capRow > H) return null
        const x = (W - ww) / 2, y = opticalTop(H, h + capRow)
        const sa = withCaption(ctx, slot(ctx, a, x, y, wa, h), a)
        const sb = withCaption(ctx, slot(ctx, b, x + wa + g, y, wb, h), b)
        return finish(ctx, 'pair-side', 'pair', [sa, sb], [a, b])
      })
      if (c && (!best || score(c) > score(best))) best = c
    }
  }
  return best
}

/**
 * Two landscapes staggered: one top left, one bottom right, each caption in the space beside
 * its photo. Fills a square page far better than two photos stacked at one width.
 */
export function pairStagger(ctx, a, b) {
  if (a.aspect < 1.15 || b.aspect < 1.15) return null
  const W = ctx.cb.w, H = ctx.cb.h, g = ctx.gap * 1.5
  const capCol = Math.max(110, Math.min(170, W * 0.28)), cg = 14
  if (W - capCol - cg < W * 0.55) return null
  let best = null
  for (const ta of aspectsFor(a, LAYOUT.cropFramed).filter((t) => t >= 1.15)) {
    for (const tb of aspectsFor(b, LAYOUT.cropFramed).filter((t) => t >= 1.15)) {
      const c = largest((s) => {
        const pw = (W - capCol - cg) * s
        const ha = pw / ta, hb = pw / tb
        const total = ha + g + hb
        if (total > H) return null
        const y0 = opticalTop(H, total)
        const sa = slot(ctx, a, 0, y0, pw, ha)
        const sb = slot(ctx, b, W - pw, y0 + ha + g, pw, hb)
        for (const [sl, p, x, align] of [[sa, a, pw + cg, 'left'], [sb, b, W - pw - cg - capCol, 'right']]) {
          const runs = captionRuns(p)
          if (!runs) continue
          const th = textHeight(ctx.fonts, runs, { width: capCol, size: TYPE.caption.size, leading: TYPE.caption.leading })
          if (th > sl.h) return null
          sl.cap = { x, y: sl.y + sl.h - th, w: capCol, align, runs }
        }
        return finish(ctx, 'pair-stagger', 'pair', [sa, sb], [a, b])
      })
      if (c && (!best || score(c) > score(best))) best = c
    }
  }
  return best
}

/** One large on top, two small below. */
export function trioTop(ctx, a, b, c3) {
  if (a.aspect < 1.1) return null
  const W = ctx.cb.w, H = ctx.cb.h, g = ctx.gap
  let best = null
  for (const ta of aspectsFor(a, LAYOUT.cropFramed).filter((t) => t >= 1.1)) {
    const c = largest((s) => {
      const w = W * s
      const h1 = w / ta
      const h2 = (w - g) / (b.aspect + c3.aspect)
      const wb = h2 * b.aspect, wc = h2 * c3.aspect
      const cap1 = capHeight(ctx, a, w), cap2 = Math.max(capHeight(ctx, b, wb), capHeight(ctx, c3, wc))
      const total = h1 + cap1 + g * 1.5 + h2 + cap2
      if (total > H) return null
      if (w * h1 < 1.4 * Math.max(wb * h2, wc * h2)) return null
      const x = (W - w) / 2, y = opticalTop(H, total)
      const y2 = y + h1 + cap1 + g * 1.5
      return finish(ctx, 'trio', 'trio', [
        withCaption(ctx, slot(ctx, a, x, y, w, h1), a),
        withCaption(ctx, slot(ctx, b, x, y2, wb, h2), b),
        withCaption(ctx, slot(ctx, c3, x + wb + g, y2, wc, h2), c3),
      ], [a, b, c3], { variant: 'top' })
    })
    if (c && (!best || score(c) > score(best))) best = c
  }
  return best
}

/** One large beside two small stacked. */
export function trioSide(ctx, a, b, c3) {
  const W = ctx.cb.w, H = ctx.cb.h, g = ctx.gap
  let best = null
  for (const r of [0.62, 0.56, 0.5]) {
    const c = largest((s) => {
      const ww = W * s
      const w1 = (ww - g) * r, w2 = ww - g - w1
      const hTot = H * s
      const h1 = hTot - capHeight(ctx, a, w1)
      const capB = capHeight(ctx, b, w2), capC = capHeight(ctx, c3, w2)
      const hs = (hTot - g * 1.5 - capB - capC) / 2
      if (h1 < 60 || hs < 50) return null
      const sA = slot(ctx, a, 0, 0, w1, h1), sB = slot(ctx, b, 0, 0, w2, hs), sC = slot(ctx, c3, 0, 0, w2, hs)
      if (sA.lost > LAYOUT.cropFramed || sB.lost > LAYOUT.cropFramed || sC.lost > LAYOUT.cropFramed) return null
      const x = (W - ww) / 2, y = opticalTop(H, hTot)
      Object.assign(sA, { x, y })
      Object.assign(sB, { x: x + w1 + g, y })
      Object.assign(sC, { x: x + w1 + g, y: y + hs + capB + g * 1.5 })
      return finish(ctx, 'trio', 'trio', [withCaption(ctx, sA, a), withCaption(ctx, sB, b), withCaption(ctx, sC, c3)], [a, b, c3], { variant: 'side' })
    })
    if (c && (!best || score(c) > score(best))) best = c
  }
  return best
}

/** Four in a grid, equal cells, each cropped no more than the framed cap. */
export function grid4(ctx, ps) {
  const W = ctx.cb.w, H = ctx.cb.h, g = ctx.gap
  let best = null
  for (const t of [4 / 3, 1, 3 / 4, 3 / 2]) {
    if (ps.some((p) => cropFor(p.px, t).lost > LAYOUT.cropFramed)) continue
    const c = largest((s) => {
      const ww = W * s
      const cw = (ww - g) / 2, ch = cw / t
      const cap1 = Math.max(capHeight(ctx, ps[0], cw), capHeight(ctx, ps[1], cw))
      const cap2 = Math.max(capHeight(ctx, ps[2], cw), capHeight(ctx, ps[3], cw))
      const total = ch * 2 + cap1 + cap2 + g * 1.5
      if (total > H) return null
      const x = (W - ww) / 2, y = opticalTop(H, total)
      const y2 = y + ch + cap1 + g * 1.5
      return finish(ctx, 'grid', 'grid', [
        withCaption(ctx, slot(ctx, ps[0], x, y, cw, ch), ps[0]),
        withCaption(ctx, slot(ctx, ps[1], x + cw + g, y, cw, ch), ps[1]),
        withCaption(ctx, slot(ctx, ps[2], x, y2, cw, ch), ps[2]),
        withCaption(ctx, slot(ctx, ps[3], x + cw + g, y2, cw, ch), ps[3]),
      ], ps, { variant: String(Math.round(t * 100) / 100) })
    })
    if (c && (!best || score(c) > score(best))) best = c
  }
  return best
}

// how good a candidate looks on its own: big, little cropped
function score(c) {
  return c.coverage - c.lost * 1.5
}

/** Every photo-page candidate for a group of 1 to 4 photos (the least-cropped of each template). */
export function photoCandidates(ctx, ps, { allowBleed = true } = {}) {
  const out = []
  if (ps.length === 1) {
    const p = ps[0]
    if (allowBleed) {
      const fb = fullBleed(ctx, p)
      if (fb) out.push(fb)
    }
    const f = framed(ctx, p)
    if (f) out.push(f)
  } else if (ps.length === 2) {
    for (const c of [pairStack(ctx, ps[0], ps[1]), pairSide(ctx, ps[0], ps[1]), pairStagger(ctx, ps[0], ps[1])]) if (c) out.push(c)
  } else if (ps.length === 3) {
    for (const c of [trioTop(ctx, ps[0], ps[1], ps[2]), trioSide(ctx, ps[0], ps[1], ps[2])]) if (c) out.push(c)
  } else if (ps.length === 4) {
    const c = grid4(ctx, ps)
    if (c) out.push(c)
  }
  return out
}

// ---------------------------------------------------------------- text flow

/**
 * A unit's paragraphs broken into lines at the text measure: a flat list of items the
 * paginator fills pages with.
 * item: {kind:'line'|'label'|'heading', h, gap (space before when not at a page top),
 *        para, first, last, keep (items after this one that must share its page), lines:[...]}
 */
export function buildFlow(ctx, paras) {
  const { fonts } = ctx
  const items = []
  const body = TYPE.body
  paras.forEach((para, pi) => {
    const prev = paras[pi - 1]
    if (para.kind === 'stop') {
      items.push({ kind: 'label', h: TYPE.stop.leading, gap: pi ? TYPE.stop.gapBefore : 0, para: pi, first: true, last: true, keep: 2, para$: para })
      return
    }
    if (para.kind === 'h2' || para.kind === 'h3') {
      const st = TYPE[para.kind]
      const runs = para.runs.map((r) => ({ text: r.text, font: st.font }))
      const lines = breakLines(fonts, runs, ctx.measure, st.size)
      lines.forEach((ln, li) => items.push({ kind: 'heading', h: st.leading, gap: li === 0 && pi ? st.gapBefore : 0, para: pi, first: li === 0, last: li === lines.length - 1, keep: li === lines.length - 1 ? 2 : 1, line: ln, style: para.kind }))
      return
    }
    const indent = para.kind === 'li' ? 12 : para.kind === 'quote' ? TYPE.quoteIndent : 0
    const runs = para.runs.map((r) => ({ text: r.text, font: storyFontOf(r.b, r.i || para.kind === 'quote') }))
    const lines = breakLines(fonts, runs, ctx.measure - indent, body.size)
    const afterLabel = prev && (prev.kind === 'stop' || prev.kind === 'h2' || prev.kind === 'h3')
    lines.forEach((ln, li) => items.push({
      kind: 'line', h: body.leading,
      gap: li === 0 && pi && !afterLabel ? body.paraGap : li === 0 && afterLabel && prev.kind === 'stop' ? 2 : 0,
      para: pi, first: li === 0, last: li === lines.length - 1, n: lines.length, idx: li, keep: 0, line: ln, indent, bullet: para.kind === 'li' && li === 0,
    }))
  })
  return items
}

function breakLines(fonts, runs, width, size) {
  return breakParagraph(fonts, runs, { width, size })
}

/** Height of flow items [a, b) set on one page (the first item's gap is dropped). */
export function flowHeight(items, a, b) {
  let h = 0
  for (let i = a; i < b; i++) h += items[i].h + (i > a ? items[i].gap : 0)
  return h
}

/**
 * Where a page that starts at item `a` with `avail` points of height must end (exclusive),
 * keeping the rules: a heading or stop label stays with the two lines after it, no
 * paragraph leaves a single line at the foot of a page or carries a single line over.
 * Returns a (no progress) only when not even the first item fits.
 */
export function fillText(items, a, avail) {
  let b = a, h = 0
  while (b < items.length) {
    const add = items[b].h + (b > a ? items[b].gap : 0)
    if (h + add > avail + 0.01) break
    h += add
    b++
  }
  if (b >= items.length || b === a) return b
  // keep-with-next: no label or heading in the last items before the break
  for (let guard = 0; guard < 6; guard++) {
    let moved = false
    for (let k = Math.max(a, b - 3); k < b; k++) {
      const it = items[k]
      if ((it.kind === 'label' || it.kind === 'heading') && b - k <= it.keep) {
        let s = k
        while (s > a && items[s - 1].kind === 'heading' && items[s - 1].para === it.para) s--
        if (s > a) { b = s; moved = true }
        break
      }
    }
    // orphan: the first line of a paragraph alone at the foot
    const last = items[b - 1]
    if (last && last.kind === 'line' && !last.last && last.idx === 0 && b - 1 > a) { b -= 1; moved = true; continue }
    // widow: one line of a paragraph carried over
    const next = items[b]
    if (next && next.kind === 'line' && next.last && next.idx > 0 && next.idx === items[b - 1]?.idx + 1) {
      if (next.idx >= 2 && b - 1 > a) { b -= 1; moved = true; continue }
      const start = b - next.idx
      if (start > a) { b = start; moved = true; continue }
    }
    if (!moved) break
  }
  // never end a page on a heading or label; in a space too small for anything better, the
  // greedy fill stands
  const greedy = b
  while (b > a + 1 && (items[b - 1].kind === 'label' || items[b - 1].kind === 'heading')) b--
  if (items[b - 1].kind !== 'line') return greedyFill(items, a, avail) || greedy
  return b
}
function greedyFill(items, a, avail) {
  let b = a, h = 0
  while (b < items.length) {
    const add = items[b].h + (b > a ? items[b].gap : 0)
    if (h + add > avail + 0.01) break
    h += add
    b++
  }
  return b > a ? b : a + 1
}
