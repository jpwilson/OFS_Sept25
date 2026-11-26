// Page plans -> display-list pages (owner: book ENGINE). Every position, crop and line is
// decided here; a drawer only draws. See README.md for the format.
import { r2, rect, circle, path, text, textBlock, image, circlePath } from './draw.js'
import { capHeight } from './templates.js'
import { INK, WHITE, PAPER, PAPER_DEEP, CAPTION, MUTE, HAIRLINE, TYPE, LAYOUT, washOf, washNamed } from './style.js'
import { washFor } from '../../styles/tokens.js'

const FOLIO_KINDS = new Set(['text', 'text-photo', 'text-photo-side', 'photo-text', 'photos', 'map', 'people'])

// ---------------------------------------------------------------- shared bits

/** A sticker: white, ink keyline, a hard ink shadow, a small tilt (the brand's Sticker). */
export function sticker(fonts, { x, y, label, font = 'mono-medium', size = 8.5, tracking = 1.1, padX = 7, padY = 5, tilt = -2, fill = WHITE }) {
  const w = fonts.measure(font, size, label, tracking) + padX * 2
  const capH = (fonts.font(font).capHeight / fonts.font(font).unitsPerEm) * size
  const h = capH + padY * 2
  const items = [
    rect(x + 1.6, y + 1.6, w, h, INK, { r: 3 }),
    rect(x, y, w, h, fill, { r: 3, stroke: INK, strokeWidth: 1 }),
    text(x + padX, y + padY + capH, label, font, size, INK, { w: r2(w - padX * 2), tracking }),
  ]
  return { item: { type: 'group', rotate: tilt, ox: r2(x + w / 2), oy: r2(y + h / 2), items }, w, h }
}

function captionItems(fonts, cap, ox, oy) {
  if (!cap) return []
  const items = []
  if (cap.label) items.push(rect(ox + cap.label.x, oy + cap.label.y, cap.label.w, cap.label.h, WHITE, { r: 3, stroke: INK, strokeWidth: 0.75 }))
  const b = textBlock(fonts, cap.runs, { x: ox + cap.x, y: oy + cap.y, width: cap.w, size: TYPE.caption.size, leading: TYPE.caption.leading, color: CAPTION, align: cap.align })
  return [...items, ...b.items]
}

/** The items for one photo-template slot, placed with the content box at (ox, oy). */
function slotItems(fonts, s, ox, oy, boxes) {
  const items = []
  if (s.frame === 'bleed') {
    const m = boxes.media
    items.push(image({ id: s.id }, m, s.crop, { fit: 'bleed', floor: s.floor }))
    items.push(...captionItems(fonts, s.cap, ox, oy))
    return items
  }
  const box = { x: ox + s.x, y: oy + s.y, w: s.w, h: s.h }
  if (s.frame === 'mat') {
    const m = LAYOUT.mat
    items.push(rect(box.x - m, box.y - m, box.w + 2 * m, box.h + 2 * m, PAPER, { stroke: HAIRLINE, strokeWidth: LAYOUT.keyline }))
  }
  items.push(image({ id: s.id }, box, s.crop, { frame: s.frame, floor: s.floor }))
  items.push(...captionItems(fonts, s.cap, ox, oy))
  return items
}

function folio(fonts, page, ctx, boxes) {
  const label = String(page.number)
  const st = TYPE.folio
  const w = fonts.measure(st.font, st.size, label, st.tracking)
  const y = boxes.trim.y + boxes.trim.h - ctx.margins.bottom / 2 + 2.5
  const x = page.side === 'left' ? boxes.content.x : boxes.content.x + boxes.content.w - w
  return text(x, y, label, st.font, st.size, MUTE, { w: r2(w), tracking: st.tracking })
}

// ---------------------------------------------------------------- text flow

/** Items for flow[a, b) in a column at (x, y) of width `width`; returns {items, height}. */
function flowItems(fonts, flow, a, b, x, y, sec) {
  const items = []
  let cy = y
  for (let i = a; i < b; i++) {
    const it = flow[i]
    if (i > a) cy += it.gap
    if (it.kind === 'label') {
      const st = TYPE.stop
      const para = it.para$
      const base = cy + 10.5
      const wash = washOf(para.stop?.dayIndex ?? sec?.washIndex ?? 0)
      items.push(circle(x + 3, base - 2.7, 3, wash.base, { stroke: INK, strokeWidth: 0.75 }))
      const label = para.runs.map((r) => r.text).join('')
      items.push(text(x + 11, base, label, st.font, st.size, INK, { w: r2(fonts.measure(st.font, st.size, label, st.tracking)), tracking: st.tracking }))
    } else if (it.kind === 'heading') {
      const st = TYPE[it.style]
      const base = cy + st.leading * 0.78
      for (const run of it.line.runs) items.push(text(x + run.dx, base, run.text, run.font, st.size, INK, { w: r2(run.w) }))
    } else {
      const size = TYPE.body.size
      const base = cy + it.h * 0.74
      if (it.bullet) items.push(text(x + 2, base, '•', 'story', size, INK, { w: r2(fonts.measure('story', size, '•')) }))
      for (const run of it.line.runs) {
        if (!run.text.trim()) continue
        items.push(text(x + it.indent + run.dx, base, run.text, run.font, size, INK, { w: r2(run.w) }))
      }
    }
    cy += it.h
  }
  return { items, height: cy - y }
}

// ---------------------------------------------------------------- page kinds

function openerHead(fonts, ctx, sec, boxes, { top, compact }) {
  const items = []
  const wash = washOf(sec.washIndex)
  const x = boxes.content.x
  // number sticker
  const num = String(sec.number ?? sec.index + 1).padStart(2, '0')
  const r = compact ? 17 : 30
  const cx = x + r, cy = top + r
  items.push(circle(cx + 1.8, cy + 1.8, r, INK))
  items.push(circle(cx, cy, r, wash.base, { stroke: INK, strokeWidth: 1.25 }))
  const ns = compact ? 14 : 24
  const nw = fonts.measure('display', ns, num)
  const capH = (fonts.font('display').capHeight / 1000) * ns
  items.push(text(cx - nw / 2, cy + capH / 2, num, 'display', ns, INK, { w: r2(nw) }))
  // label and date beside it
  const lx = cx + r + 14
  const lab = [sec.label, sec.date ? sec.date.toUpperCase() : null].filter(Boolean)
  const st = TYPE.label
  lab.forEach((s, i) => items.push(text(lx, cy - (lab.length - 1) * 6 + i * 12 + 3, s, st.font, st.size, INK, { w: r2(fonts.measure(st.font, st.size, s, st.tracking)), tracking: st.tracking })))
  return { items, bottom: top + 2 * r }
}

function drawOpener(fonts, ctx, plan, sec, page, boxes, source) {
  const wash = washOf(sec.washIndex)
  const items = []
  const T = boxes.trim, C = boxes.content
  if (plan.kind === 'opener') {
    page.background = wash.tint
    const head = openerHead(fonts, ctx, sec, boxes, { top: C.y })
    items.push(...head.items)
    const st = TYPE.opener
    const size = st.size + 12, leading = st.leading + 11
    const runs = [{ text: sec.title || '', font: st.font }]
    const probe = textBlock(fonts, runs, { x: C.x, y: 0, width: C.w * 0.92, size, leading, color: INK, tracking: -0.8 })
    const ty = T.y + T.h * 0.5 - probe.height / 2
    items.push(...textBlock(fonts, runs, { x: C.x, y: ty, width: C.w * 0.92, size, leading, color: INK, tracking: -0.8 }).items)
    // the stops in this section, as on the map
    const stops = sec.units.flatMap((u) => u.paras).filter((p) => p.kind === 'stop').map((p) => p.runs[0].text)
    if (stops.length) {
      const s2 = TYPE.stop
      let y = C.y + C.h - (stops.length - 1) * 14
      for (const s of stops) {
        items.push(circle(C.x + 3, y - 2.7, 3, wash.base, { stroke: INK, strokeWidth: 0.75 }))
        items.push(text(C.x + 11, y, s, s2.font, s2.size, INK, { w: r2(fonts.measure(s2.font, s2.size, s, s2.tracking)), tracking: s2.tracking }))
        y += 14
      }
    }
    return items
  }
  // a band across the top with the number and the title, then text or the lead photo
  const band = plan.band
  items.push(rect(0, 0, boxes.media.w, T.y + band.height, wash.tint))
  const head = openerHead(fonts, ctx, sec, boxes, { top: C.y, compact: true })
  items.push(...head.items)
  const st = TYPE.opener
  const titleRuns = [{ text: sec.title || '', font: st.font }]
  items.push(...textBlock(fonts, titleRuns, { x: C.x, y: C.y + band.titleTop, width: C.w * 0.92, size: st.size, leading: st.leading, color: INK, tracking: st.tracking }).items)
  const top = C.y + band.textTop
  if (plan.kind === 'opener-text') {
    items.push(...flowItems(fonts, plan.flow, plan.from, plan.to, columnX(ctx, boxes), top, sec).items)
    if (plan.cand) items.push(...photoAtFoot(fonts, ctx, plan.cand.slots[0], C, top + plan.textH + 18, boxes))
  } else if (plan.kind === 'opener-photo') {
    items.push(...photoAtFoot(fonts, ctx, plan.cand.slots[0], C, top, boxes))
  }
  return items
}

// a framed photo placed in the area from areaTop to the content box's foot, sitting at the foot
function photoAtFoot(fonts, ctx, s, C, areaTop, boxes) {
  const blockH = s.h + (s.cap ? capHeight(ctx, { caption: s.cap.runs[0].text }, s.w) : 0)
  const oy = areaTop + Math.max(0, C.y + C.h - areaTop - blockH)
  return slotItems(fonts, s, C.x, oy, boxes)
}

const columnX = (ctx, boxes) => boxes.content.x + Math.round((ctx.cb.w - ctx.measure) / 2)

function drawText(fonts, ctx, plan, sec, boxes) {
  return flowItems(fonts, plan.flow, plan.from, plan.to, columnX(ctx, boxes), boxes.content.y, sec).items
}

function drawTextPhoto(fonts, ctx, plan, sec, page, boxes) {
  const C = boxes.content
  const items = []
  if (plan.kind === 'photo-text') {
    // the photo at the top, the text that follows it underneath
    const s = plan.cand.slots[0]
    items.push(...slotItems(fonts, s, C.x, C.y, boxes))
    items.push(...flowItems(fonts, plan.flow, plan.from, plan.to, columnX(ctx, boxes), C.y + C.h - plan.textH, sec).items)
    return items
  }
  if (plan.kind === 'text-photo') {
    const f = flowItems(fonts, plan.flow, plan.from, plan.to, columnX(ctx, boxes), C.y, sec)
    items.push(...f.items)
    items.push(...photoAtFoot(fonts, ctx, plan.cand.slots[0], C, C.y + plan.textH + 18, boxes))
    return items
  }
  // side by side on a wide page: photo on the outside, text on the inside
  const photoW = C.w - ctx.measure - 24
  const left = page.side === 'left'
  const px = left ? C.x : C.x + ctx.measure + 24
  const tx = left ? C.x + photoW + 24 : C.x
  const s = plan.cand.slots[0]
  const blockH = s.h + (s.cap ? capHeight(ctx, { caption: s.cap.runs[0].text }, s.w) : 0)
  items.push(...slotItems(fonts, s, px, C.y + Math.max(0, (C.h - blockH) * 0.42), boxes))
  items.push(...flowItems(fonts, plan.flow, plan.from, plan.to, tx, C.y, sec).items)
  return items
}

function drawPhotos(fonts, ctx, plan, sec, boxes, firstOfMore) {
  const C = boxes.content
  const items = []
  for (const s of plan.cand.slots) items.push(...slotItems(fonts, s, C.x, C.y, boxes))
  if (firstOfMore) {
    const st = TYPE.label
    items.push(text(C.x, boxes.trim.y + ctx.margins.top - 14, 'MORE PHOTOS', st.font, st.size, INK, { w: r2(fonts.measure(st.font, st.size, 'MORE PHOTOS', st.tracking)), tracking: st.tracking }))
  }
  return items
}

function drawTitle(fonts, ctx, source, directives, boxes) {
  const C = boxes.content, T = boxes.trim
  const items = []
  const st = TYPE.title
  const title = directives.title
  const tb = textBlock(fonts, [{ text: title, font: st.font }], { x: C.x, y: 0, width: C.w * 0.88, size: st.size, leading: st.leading, color: INK, tracking: st.tracking })
  const ty = T.y + T.h * 0.36 - tb.height / 2
  items.push(...textBlock(fonts, [{ text: title, font: st.font }], { x: C.x, y: ty, width: C.w * 0.88, size: st.size, leading: st.leading, color: INK, tracking: st.tracking }).items)
  let y = ty + tb.height + 22
  // a row of the section colours, the route's colours
  const n = Math.max(1, source.sections.filter((s) => s.kind === 'chapter').length)
  for (let i = 0; i < Math.min(n, 7); i++) {
    items.push(circle(C.x + 6 + i * 15, y, 6, washOf(i).base, { stroke: INK, strokeWidth: 1 }))
  }
  y += 26
  const lab = TYPE.label
  const sub = directives.subtitle || ''
  if (sub) {
    items.push(...textBlock(fonts, [{ text: sub, font: 'story-italic' }], { x: C.x, y, width: C.w * 0.8, size: 13, leading: 18, color: INK }).items)
    y += 30
  }
  const lines = [source.dates.label, source.place].filter(Boolean).map((s) => s.toUpperCase())
  for (const s of lines) {
    items.push(text(C.x, y, s, lab.font, lab.size, INK, { w: r2(fonts.measure(lab.font, lab.size, s, lab.tracking)), tracking: lab.tracking }))
    y += 14
  }
  if (source.summary) {
    y += 14
    items.push(...textBlock(fonts, [{ text: source.summary, font: 'story-italic' }], { x: C.x, y, width: Math.min(ctx.measure, C.w * 0.8), size: 11, leading: 16, color: INK }).items)
  }
  // the author, at the foot
  if (source.author.name) {
    const s = `A STORY BY ${source.author.name.toUpperCase()}`
    items.push(text(C.x, C.y + C.h - 4, s, lab.font, lab.size, INK, { w: r2(fonts.measure(lab.font, lab.size, s, lab.tracking)), tracking: lab.tracking }))
  }
  return items
}

function drawDedication(fonts, ctx, directives, boxes) {
  const C = boxes.content, T = boxes.trim
  const w = Math.min(ctx.measure, C.w * 0.75)
  const runs = [{ text: directives.dedication, font: 'story-italic' }]
  const probe = textBlock(fonts, runs, { x: 0, y: 0, width: w, size: 13, leading: 19, color: INK, align: 'center' })
  return textBlock(fonts, runs, { x: C.x + (C.w - w) / 2, y: T.y + T.h * 0.38 - probe.height / 2, width: w, size: 13, leading: 19, color: INK, align: 'center' }).items
}

function drawPeople(fonts, ctx, source, boxes, { height } = {}) {
  const C = boxes.content
  const H = height || C.h
  const items = []
  items.push(...textBlock(fonts, [{ text: 'Who was there', font: 'display' }], { x: C.x, y: C.y, width: C.w, size: 24, leading: 26, color: INK, tracking: -0.3 }).items)
  const people = source.people
  const cols = people.length <= 4 ? people.length : people.length <= 6 ? 3 : 4
  const R = people.length <= 4 ? 34 : 28
  const cellW = Math.min(R * 2 + 56, C.w / Math.max(cols, 1))
  const rows = Math.ceil(people.length / Math.max(cols, 1))
  const cellH = R * 2 + 52
  const blockH = rows * cellH
  const top = C.y + 64 + Math.max(0, (H - 64 - blockH) * 0.4)
  people.forEach((p, i) => {
    const row = Math.floor(i / cols), col = i % cols
    const inRow = Math.min(cols, people.length - row * cols)
    const x0 = C.x + (C.w - inRow * cellW) / 2 + col * cellW
    const cx = x0 + cellW / 2, cy = top + row * cellH + R
    const wash = washNamed(washFor(p.key))
    items.push(circle(cx + 2, cy + 2, R, INK))
    items.push(circle(cx, cy, R, wash.base, { stroke: INK, strokeWidth: 1.25 }))
    const ini = initials(p.name)
    const size = R * 0.62
    const iw = fonts.measure('heading', size, ini)
    const capH = (fonts.font('heading').capHeight / 1000) * size
    items.push(text(cx - iw / 2, cy + capH / 2, ini, 'heading', size, INK, { w: r2(iw) }))
    items.push(...textBlock(fonts, [{ text: p.name, font: 'ui-semibold' }], { x: x0 + 4, y: cy + R + 12, width: cellW - 8, size: 10, leading: 13, color: INK, align: 'center' }).items)
  })
  return items
}

const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

/** The wordmark: three overlapping dots and the name, "Family" on a sticker. */
export function wordmark(fonts, x, y, size = 11) {
  const items = []
  const r = size * 0.42
  const cols = [washNamed('tide').base, washNamed('zest').base, washNamed('fizz').base]
  cols.forEach((c, i) => items.push(circle(x + r + i * r * 1.2, y - size * 0.36, r, c, { stroke: INK, strokeWidth: 0.9 })))
  let tx = x + r * 2 + r * 2.4 + 6
  const f = 'heading'
  const part = (s) => {
    const w = fonts.measure(f, size, s)
    items.push(text(tx, y, s, f, size, INK, { w: r2(w) }))
    tx += w
  }
  part('Our ')
  const fw = fonts.measure(f, size, 'Family')
  const pad = size * 0.28
  const capH = (fonts.font(f).capHeight / 1000) * size
  const sx = tx, sy = y - capH - pad * 0.9
  items.push({
    type: 'group', rotate: -2, ox: r2(sx + fw / 2 + pad), oy: r2(sy + (capH + pad * 2) / 2),
    items: [
      rect(sx + 1.2, sy + 1.2, fw + pad * 2, capH + pad * 2 + 1, INK, { r: 2.5 }),
      rect(sx, sy, fw + pad * 2, capH + pad * 2 + 1, WHITE, { r: 2.5, stroke: INK, strokeWidth: 0.9 }),
      text(sx + pad, y, 'Family', f, size, INK, { w: r2(fw) }),
    ],
  })
  tx += fw + pad * 2 + fonts.measure(f, size, ' ')
  part('Socials')
  return { items, width: tx - x }
}

function drawColophon(fonts, ctx, source, directives, boxes, withPeople) {
  const C = boxes.content
  const items = withPeople ? drawPeople(fonts, ctx, source, boxes, { height: C.h - 70 }) : []
  const probe = wordmark(fonts, 0, 0, 12)
  const wm = wordmark(fonts, C.x + (C.w - probe.width) / 2, C.y + C.h - 40, 12)
  items.push(...wm.items)
  const line = `Made from “${directives.title}”${source.author.name ? `, a story by ${source.author.name}` : ''}.`
  items.push(...textBlock(fonts, [{ text: line, font: 'ui' }], { x: C.x + C.w * 0.15, y: C.y + C.h - 22, width: C.w * 0.7, size: 8, leading: 11, color: MUTE, align: 'center' }).items)
  return items
}

// ---------------------------------------------------------------- the map page

export function drawMap(fonts, ctx, source, boxes) {
  const C = boxes.content
  const items = []
  const route = source.route
  items.push(...textBlock(fonts, [{ text: 'Where we went', font: 'display' }], { x: C.x, y: C.y, width: C.w, size: 24, leading: 26, color: INK, tracking: -0.3 }).items)
  // legend: stops grouped by day, in columns under the map
  const named = route.stops.filter((s) => s.kind === 'named')
  const stopsFull = source.stops
  const days = route.days
  const rows = []
  for (const d of days) {
    const ss = named.filter((s) => s.dayIndex === d.index)
    if (!ss.length) continue
    rows.push({ day: d, label: true })
    for (const s of ss) rows.push({ day: d, stop: s })
  }
  const cols = ctx.cb.w > 560 ? 4 : 3
  const perCol = Math.ceil(rows.length / cols)
  const legendH = perCol * 11.5 + 4
  const mapTop = C.y + 40
  const mapH = C.h - 40 - legendH - 18
  const box = { x: C.x, y: mapTop, w: C.w, h: mapH }
  items.push(rect(box.x, box.y, box.w, box.h, PAPER, { r: 8, stroke: INK, strokeWidth: 1 }))
  // dot grid, one path
  let dots = ''
  const step = 14
  for (let gy = box.y + step; gy < box.y + box.h - 4; gy += step) for (let gx = box.x + step; gx < box.x + box.w - 4; gx += step) dots += circlePath(gx, gy, 0.7)
  if (dots) items.push(path(dots, { fill: PAPER_DEEP }))
  // project
  const pts = [...route.stops.map((s) => [s.lng, s.lat]), ...route.legs.flatMap((l) => l.line)]
  const P = projector(pts, box, 30)
  for (const l of route.legs) items.push(path(lineD(l.line, P), { stroke: INK, strokeWidth: 4.6, lineCap: 'round', lineJoin: 'round' }))
  for (const l of route.legs) items.push(path(lineD(l.line, P), { stroke: washOf(l.dayIndex).base, strokeWidth: 2.4, lineCap: 'round', lineJoin: 'round' }))
  const R = 7.5
  const at = Object.fromEntries(route.stops.map((s) => [s.id, P(s.lng, s.lat)]))
  // ease apart discs that would overlap (as the route sketch does)
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < named.length; i++) for (let j = i + 1; j < named.length; j++) {
      const a = at[named[i].id], b = at[named[j].id]
      let dx = b[0] - a[0], dy = b[1] - a[1]
      const d = Math.hypot(dx, dy), min = R * 2 + 1
      if (d >= min) continue
      if (d < 0.5) { dx = 1; dy = 0 }
      const push = Math.min(R * 0.6, (min - d) / 2) / Math.max(d, 1)
      a[0] -= dx * push; a[1] -= dy * push
      b[0] += dx * push; b[1] += dy * push
    }
  }
  for (const s of route.stops.filter((x) => x.kind !== 'named')) {
    const [x, y] = at[s.id]
    items.push(circle(x, y, 3, washOf(s.dayIndex).base, { stroke: INK, strokeWidth: 0.9 }))
  }
  const boxes2 = named.map((s) => { const [x, y] = at[s.id]; return [x - R - 1, y - R - 1, x + R + 1, y + R + 1] })
  const labelItems = []
  const fs = 7.5
  for (const s of named) {
    const [x, y] = at[s.id]
    items.push(circle(x, y, R, WHITE, { stroke: INK, strokeWidth: 1.2 }))
    items.push(circle(x, y, R - 2, null, { stroke: washOf(s.dayIndex).base, strokeWidth: 1.8 }))
    const n = String(s.n)
    const nw = fonts.measure('mono-medium', 7, n)
    items.push(text(x - nw / 2, y + 2.5, n, 'mono-medium', 7, INK, { w: r2(nw) }))
    const short = s.short
    if (!short) continue
    const w = fonts.measure('ui-semibold', fs, short), h = fs + 3
    const g = R + 4
    const tries = [
      { tx: x + g, ty: y + fs * 0.34, box: [x + g - 2, y - h / 2, x + g + w + 2, y + h / 2] },
      { tx: x - g - w, ty: y + fs * 0.34, box: [x - g - w - 2, y - h / 2, x - g + 2, y + h / 2] },
      { tx: x - w / 2, ty: y - g - 1, box: [x - w / 2 - 2, y - g - h, x + w / 2 + 2, y - g + 2] },
      { tx: x - w / 2, ty: y + g + fs * 0.8, box: [x - w / 2 - 2, y + g - 2, x + w / 2 + 2, y + g + h] },
    ]
    const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
    const ok = tries.find((t) => t.box[0] >= box.x + 4 && t.box[2] <= box.x + box.w - 4 && t.box[1] >= box.y + 4 && t.box[3] <= box.y + box.h - 4 && !boxes2.some((b) => hit(b, t.box)))
    if (ok) {
      boxes2.push(ok.box)
      labelItems.push(rect(ok.box[0], ok.box[1] + 0.5, ok.box[2] - ok.box[0], ok.box[3] - ok.box[1] - 1, PAPER, { r: 2 }))
      labelItems.push(text(ok.tx, ok.ty, short, 'ui-semibold', fs, INK, { w: r2(w) }))
    }
  }
  items.push(...labelItems)
  // legend
  const colW = C.w / cols
  rows.forEach((row, i) => {
    const col = Math.floor(i / perCol), k = i % perCol
    const x = C.x + col * colW, y = mapTop + mapH + 22 + k * 11.5
    if (row.label) {
      const st = TYPE.label
      items.push(rect(x, y - 6.5, 7, 7, washOf(row.day.index).base, { stroke: INK, strokeWidth: 0.75 }))
      const s = String(row.day.label || '').toUpperCase()
      items.push(text(x + 11, y, s, st.font, 7, INK, { w: r2(fonts.measure(st.font, 7, s, 0.8)), tracking: 0.8 }))
    } else {
      const n = String(row.stop.n)
      const full = stopsFull.find((s) => s.id === row.stop.id)
      const nw = fonts.measure('mono-medium', 7, n)
      items.push(text(x + 9 - nw, y, n, 'mono-medium', 7, INK, { w: r2(nw) }))
      const label = `${row.stop.short}${full?.time ? `  ${full.time}` : ''}`
      const maxW = colW - 24
      let s = row.stop.short
      while (s.length > 4 && fonts.measure('ui', 8, s) > maxW - (full?.time ? fonts.measure('mono', 6.5, full.time) + 6 : 0)) s = s.slice(0, -1)
      if (s !== row.stop.short) s = s.replace(/\s+$/, '') + '…'
      void label
      const sw = fonts.measure('ui', 8, s)
      items.push(text(x + 14, y, s, 'ui', 8, INK, { w: r2(sw) }))
      if (full?.time) items.push(text(x + 14 + sw + 5, y, full.time, 'mono', 6.5, MUTE, { w: r2(fonts.measure('mono', 6.5, full.time)) }))
    }
  })
  return items
}

function projector(points, box, pad) {
  const lats = points.map((p) => p[1]), lngs = points.map((p) => p[0])
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const k = Math.cos((midLat * Math.PI) / 180) || 1
  const x0 = Math.min(...lngs) * k, x1 = Math.max(...lngs) * k
  const y0 = Math.min(...lats), y1 = Math.max(...lats)
  const sx = (box.w - pad * 2) / Math.max(x1 - x0, 1e-6), sy = (box.h - pad * 2) / Math.max(y1 - y0, 1e-6)
  const sc = Math.min(sx, sy)
  const ox = (box.w - (x1 - x0) * sc) / 2, oy = (box.h - (y1 - y0) * sc) / 2
  return (lng, lat) => [box.x + ox + (lng * k - x0) * sc, box.y + box.h - (oy + (lat - y0) * sc)]
}
const lineD = (line, P) => 'M' + line.map(([lng, lat]) => P(lng, lat).map((v) => r2(v)).join(' ')).join('L')

// ---------------------------------------------------------------- one page

export function renderPage(fonts, ctx, plan, index, source, directives, flows) {
  const number = index + 1
  const side = number % 2 === 0 ? 'left' : 'right'
  const boxes = ctx.boxes(side)
  const sec = plan.section ? source.sections.find((s) => s.id === plan.section) : null
  const page = {
    index,
    number,
    side,
    kind: plan.kind,
    template: plan.kind === 'photos' ? plan.cand.template : plan.kind,
    section: plan.section || null,
    size: { w: boxes.media.w, h: boxes.media.h },
    trim: boxes.trim,
    bleed: boxes.bleed,
    safe: boxes.safe,
    content: boxes.content,
    background: WHITE,
    folio: false,
    photos: [],
    items: [],
  }
  if (plan.unit != null && flows) plan = { ...plan, flow: flows[plan.section][plan.unit] }
  let items = []
  switch (plan.kind) {
    case 'title': items = drawTitle(fonts, ctx, source, directives, boxes); break
    case 'dedication': items = drawDedication(fonts, ctx, directives, boxes); break
    case 'map': items = drawMap(fonts, ctx, source, boxes); break
    case 'opener': case 'opener-text': case 'opener-photo': items = drawOpener(fonts, ctx, plan, sec, page, boxes, source); break
    case 'text': items = drawText(fonts, ctx, plan, sec, boxes); break
    case 'text-photo': case 'text-photo-side': case 'photo-text': items = drawTextPhoto(fonts, ctx, plan, sec, page, boxes); break
    case 'photos': items = drawPhotos(fonts, ctx, plan, sec, boxes, plan.firstOfMore); break
    case 'people': items = drawPeople(fonts, ctx, source, boxes); break
    case 'colophon': items = drawColophon(fonts, ctx, source, directives, boxes, plan.people); break
    case 'blank': items = []; break
    default: throw new Error(`unknown page kind ${plan.kind}`)
  }
  const bleedPage = plan.cand?.kind === 'bleed'
  if (FOLIO_KINDS.has(plan.kind) && !bleedPage) {
    items.push(folio(fonts, page, ctx, boxes))
    page.folio = true
  }
  page.items = items
  // which story text this page carries (unit and flow items), for checks and the builder
  page.text = plan.flow ? { unit: plan.unit, from: plan.from, to: plan.to, ends: plan.to >= plan.flow.length } : null
  page.photos = collect(items, (it) => it.type === 'image').map((it) => it.ref)
  return page
}

function collect(items, pred, out = []) {
  for (const it of items) {
    if (it.type === 'group') collect(it.items, pred, out)
    else if (pred(it)) out.push(it)
  }
  return out
}
export { collect }
