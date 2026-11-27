// Structure to geometry (owner: FAMILY). docs/app/FAMILY.md section 2, "Placement" 5 to 10.
// Pure ESM: no DOM, no JSX, explicit extensions. Pixels at zoom 1.
//
//   sizeFor(frameWidth) -> 'compact' | 'regular' | 'wide'
//   layout(structure, {size, trayMax}) -> geometry {
//     size, metrics, width, height, rows: [{row, y}],
//     nodes: [{id, x, y, d, row, step, kind, asked, tray, first, word, pet}],
//     lines: [{id, d, tone, dashed, faint, step}], ticks: [{id, x, y, step}],
//     trays: [{id, key, caption, x, y, w, h, members, more, step}], add: {x, y, d, step},
//     you: {x, y}, focus: {x, y}
//   }
// Row 0 is built around you and your descendants; your side opens to the left and your
// partner's to the right; ancestors are centred over their children and pushed outward when
// they would collide; trays stand outside the drawn blocks. Rounded elbows absorb offsets.

export const SIZES = {
  compact: { face: 64, col: 100, gap: 176, name: 15, label: 11 },
  regular: { face: 84, col: 136, gap: 210, name: 18, label: 12 },
  wide: { face: 100, col: 160, gap: 232, name: 21, label: 13 },
}
export const KID = 0.88 // faces below your row, and faces in trays
const PARTNER = 1.5 // columns between partners' centres
const MIN_GAP = 0.4 // columns between neighbours
const BAR_DOWN = 0.62 // descent bars, as a share of the row gap
const BAR_INTO = 0.56 // the lines into you and your partner
const BAR_SIBS = 0.38 // a sibling bar with no parents, above the row
const LANE = 10

export function sizeFor(width) {
  if (width < 600) return 'compact'
  if (width < 1100) return 'regular'
  return 'wide'
}

// ---------------------------------------------------------------- text, without a DOM
// Bricolage Grotesque 800 at wdth 86 (names) and DM Mono 500 uppercase with 0.06em tracking
// (relation words). Measured once in the browser; close enough to space faces.
function nameWidth(text, px) {
  let em = 0
  for (const ch of String(text)) {
    if (' .,\'’-'.includes(ch)) em += 0.26
    else if ('iljtfrI!'.includes(ch)) em += 0.34
    else if ('mwMW'.includes(ch)) em += 0.86
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) em += 0.64
    else em += 0.55
  }
  return em * px
}
const labelWidth = (text, px) => String(text).length * px * 0.66

// ---------------------------------------------------------------- the elbow (the landing's geometry)
/** An orthogonal path through points, with rounded elbows of radius r (landing FamilyTree.jsx). */
export function elbow(pts, r = 22) {
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const a = Math.min(r, Math.hypot(x1 - x0, y1 - y0) / 2, Math.hypot(x2 - x1, y2 - y1) / 2)
    const ux = Math.sign(x1 - x0)
    const uy = Math.sign(y1 - y0)
    const vx = Math.sign(x2 - x1)
    const vy = Math.sign(y2 - y1)
    d += ` L${f(x1 - ux * a)},${f(y1 - uy * a)} Q${f(x1)},${f(y1)} ${f(x1 + vx * a)},${f(y1 + vy * a)}`
  }
  const e = pts[pts.length - 1]
  return `${d} L${f(e[0])},${f(e[1])}`
}
const f = (n) => (Math.round(n * 10) / 10).toString()

// ---------------------------------------------------------------- contours
// A contour is a Map row -> [left, right] (absolute x once placed).
const cExtend = (c, row, l, r) => {
  const cur = c.get(row)
  c.set(row, cur ? [Math.min(cur[0], l), Math.max(cur[1], r)] : [l, r])
}
const cShift = (c, dx) => new Map([...c].map(([row, [l, r]]) => [row, [l + dx, r + dx]]))
const cMerge = (a, b) => {
  const out = new Map(a)
  for (const [row, [l, r]] of b) cExtend(out, row, l, r)
  return out
}
/** How far right `b` must move to sit gap clear of `a` in every shared row (negative: it may move left). */
function clearRight(a, b, gap) {
  let need = -Infinity
  for (const [row, [l]] of b) {
    const ar = a.get(row)
    if (ar) need = Math.max(need, ar[1] + gap - l)
  }
  return need
}

// ---------------------------------------------------------------- the layout
export function layout(s, { size = 'wide', trayMax } = {}) {
  const M = SIZES[size] || SIZES.wide
  const col = M.col
  const gapX = MIN_GAP * col
  const maxInTray = trayMax ?? (size === 'compact' ? 4 : 6)
  const P = (id) => s.people.get(id)
  const rowOfId = (id) => (id === s.me ? 0 : P(id)?.info?.row ?? 0)
  const faceOf = (id, inTray) => M.face * (inTray || rowOfId(id) > 0 ? KID : 1)
  const boxOf = (id, inTray = false) => {
    const p = P(id)
    const d = faceOf(id, inTray)
    const nw = nameWidth(p.first, M.name) + 14
    const lw = p.id === s.me ? 0 : labelWidth(p.word || '', M.label) + 14
    return Math.max(d, nw, lw)
  }
  const pos = new Map() // id -> x
  const unitSpacing = (a, b) => Math.max(PARTNER * col, (boxOf(a) + boxOf(b)) / 2 + gapX)

  /** Member offsets for a unit, first member at 0. */
  const offsetsOf = (members) => {
    const out = [0]
    for (let i = 1; i < members.length; i++) out.push(out[i - 1] + unitSpacing(members[i - 1], members[i]))
    return out
  }
  const anchorX = (anchor, xOf) => (anchor.length === 2 ? (xOf(anchor[0]) + xOf(anchor[1])) / 2 : xOf(anchor[0]))

  // ---- descendants: a tidy block, relative to its blood member at x = 0
  function layDown(b) {
    const local = new Map()
    const off = offsetsOf(b.members)
    const bi = Math.max(0, b.members.indexOf(b.blood))
    b.members.forEach((m, i) => local.set(m, off[i] - off[bi]))
    let contour = new Map()
    const first = b.members[0], last = b.members[b.members.length - 1]
    cExtend(contour, b.row, local.get(first) - boxOf(first) / 2, local.get(last) + boxOf(last) / 2)
    const placedGroups = []
    for (const g of b.groups || []) {
      const ax = anchorX(g.anchor, (id) => local.get(id))
      // pack the children left to right
      let gc = new Map()
      const kids = []
      for (const c of g.children) {
        const sub = layDown(c)
        let dx = 0
        if (kids.length) dx = clearRight(gc, sub.contour, gapX)
        if (!Number.isFinite(dx)) dx = (kids.at(-1)?.dx ?? 0) + col
        kids.push({ sub, dx })
        gc = cMerge(gc, cShift(sub.contour, dx))
      }
      if (!kids.length) continue
      const mid = (kids[0].dx + kids[kids.length - 1].dx) / 2
      const shift = ax - mid
      placedGroups.push({ kids, shift, contour: cShift(gc, shift) })
    }
    // groups under different anchors: keep their order, push apart where they meet, then balance
    let pushed = 0
    for (let i = 1; i < placedGroups.length; i++) {
      const prev = placedGroups.slice(0, i).reduce((acc, g) => cMerge(acc, g.contour), new Map())
      const need = clearRight(prev, placedGroups[i].contour, gapX)
      if (need > 0) {
        for (let j = i; j < placedGroups.length; j++) {
          placedGroups[j].shift += need
          placedGroups[j].contour = cShift(placedGroups[j].contour, need)
        }
        pushed += need
      }
    }
    if (placedGroups.length > 1 && pushed) {
      for (const g of placedGroups) { g.shift -= pushed / 2; g.contour = cShift(g.contour, -pushed / 2) }
    }
    for (const g of placedGroups) {
      for (const k of g.kids) for (const [id, x] of k.sub.local) local.set(id, x + k.dx + g.shift)
      contour = cMerge(contour, g.contour)
    }
    return { local, contour }
  }

  // ---- the core: you and your descendants, you at x = 0
  let comp = new Map()
  const place = (local, dx) => {
    for (const [id, x] of local) pos.set(id, x + dx)
  }
  const core = layDown(s.root.core)
  place(core.local, 0)
  comp = cMerge(comp, core.contour)

  /** Pack a block toward `side` of everything placed so far; returns the blood member's x. */
  function packSide(block, side) {
    const sub = layDown(block)
    let dx
    if (side === 'left') {
      // move right as far as allowed: the largest dx with sub's right edge gap clear of comp's left edge
      let lim = Infinity
      for (const [row, [, r]] of sub.contour) {
        const c = comp.get(row)
        if (c) lim = Math.min(lim, c[0] - gapX - r)
      }
      dx = Number.isFinite(lim) ? lim : Math.min(...[...comp.values()].map((v) => v[0])) - gapX - Math.max(...[...sub.contour.values()].map((v) => v[1]))
    } else {
      const need = clearRight(comp, sub.contour, gapX)
      dx = Number.isFinite(need) ? need : Math.max(...[...comp.values()].map((v) => v[1])) + gapX - Math.min(...[...sub.contour.values()].map((v) => v[0]))
    }
    place(sub.local, dx)
    comp = cMerge(comp, cShift(sub.contour, dx))
    return dx
  }

  /** Put a unit in its row at `want` (first member's x), pushed right of anything already there. */
  function placeUnit(members, row, want) {
    const off = offsetsOf(members)
    const lw = boxOf(members[0]) / 2, rw = boxOf(members[members.length - 1]) / 2
    let x0 = want
    const c = comp.get(row)
    if (c && x0 - lw < c[1] + gapX && x0 + off[off.length - 1] + rw > c[0] - gapX) x0 = Math.max(x0, c[1] + gapX + lw)
    members.forEach((m, i) => pos.set(m, x0 + off[i]))
    cExtend(comp, row, x0 - lw, x0 + off[off.length - 1] + rw)
  }

  const bars = [] // sibling bars: {members, row, faint}
  function composeUp(u, side) {
    if (!u) return
    const lineGroup = u.groups.find((g) => g.line) || u.groups[0]
    const others = u.groups.filter((g) => g !== lineGroup)
    // the blocks to place toward the side, nearest the line first
    const li = lineGroup ? lineGroup.children.indexOf('LINE') : -1
    const near = lineGroup ? (side === 'left' ? lineGroup.children.slice(0, li).reverse() : lineGroup.children.slice(li + 1)) : []
    const far = side === 'left' ? [...others].reverse().flatMap((g) => [...g.children].reverse()) : others.flatMap((g) => g.children)
    for (const b of [...near, ...far]) if (b !== 'LINE') packSide(b, side === 'none' ? 'right' : side)
    if (u.bar) {
      bars.push({ members: lineGroup.children.map((c) => (c === 'LINE' ? u.line : c.blood)) })
      return
    }
    // the unit over its children
    const off = offsetsOf(u.members)
    const idx = new Map(u.members.map((m, i) => [m, i]))
    let sum = 0, w = 0
    for (const g of u.groups) {
      const xs = g.children.map((c) => pos.get(c === 'LINE' ? u.line : c.blood)).filter((x) => x != null)
      if (!xs.length) continue
      const want = (Math.min(...xs) + Math.max(...xs)) / 2
      const ao = g.anchor.length === 2 ? (off[idx.get(g.anchor[0])] + off[idx.get(g.anchor[1])]) / 2 : off[idx.get(g.anchor[0])]
      sum += (want - ao) * xs.length
      w += xs.length
    }
    placeUnit(u.members, u.row, w ? sum / w : pos.get(u.line) ?? 0)
    for (const x of u.ups) composeUp(x.up, x.up.flank === 'none' ? 'none' : x.up.flank)
  }

  composeUp(s.root.left, 'left')
  for (const x of s.root.extra || []) {
    const want = pos.get(x.line) ?? 0
    const off = offsetsOf(x.members)
    const i = x.members.indexOf(x.own)
    placeUnit(x.members, x.row, want - off[i])
  }
  composeUp(s.root.right, 'right')

  // ---- trays and Add: outside the drawn blocks, in side columns; centred ones above or below
  let gl = Infinity, gr = -Infinity
  for (const [, [l, r]] of comp) { gl = Math.min(gl, l); gr = Math.max(gr, r) }
  if (!Number.isFinite(gl)) { gl = 0; gr = 0 }
  const trays = []
  const trayFace = M.face * KID
  const trayPad = Math.round(col * 0.14)
  const captionH = Math.round(M.label * 1.6)
  const trayGeom = (t) => {
    const ids = t.members
    const over = ids.length > maxInTray
    const shown = over ? ids.slice(0, maxInTray - 1) : ids
    const widths = shown.map((id) => boxOf(id, true))
    if (over) widths.push(trayFace)
    let inner = 0
    const xs = []
    widths.forEach((w, i) => {
      if (i) inner += gapX * 0.7
      xs.push(inner + w / 2)
      inner += w
    })
    const capW = labelWidth(t.caption, M.label) + 8
    const w = Math.max(inner, capW) + trayPad * 2
    const lead = (w - inner) / 2
    return { shown, more: over ? ids.length - shown.length : 0, w, xs: xs.map((x) => x + lead), moreX: over ? xs[xs.length - 1] + lead : null }
  }
  const leftEdge = new Map(), rightEdge = new Map()
  const nextLeft = (row) => leftEdge.get(row) ?? gl - gapX
  const nextRight = (row) => rightEdge.get(row) ?? gr + gapX
  for (const t of s.trays) {
    const g = trayGeom(t)
    let x0
    if (t.side === 'left') { x0 = nextLeft(t.row) - g.w; leftEdge.set(t.row, x0 - gapX) }
    else if (t.side === 'right') { x0 = nextRight(t.row); rightEdge.set(t.row, x0 + g.w + gapX) }
    else {
      const c = comp.get(t.row)
      let cx
      if (t.side === 'above') cx = s.root.left?.members?.length ? avg(s.root.left.members.map((m) => pos.get(m))) : avg(s.root.core.members.map((m) => pos.get(m)))
      else {
        const kids = s.root.core.groups.flatMap((g) => g.children.map((c) => pos.get(c.blood)))
        cx = kids.length ? avg(kids) : avg(s.root.core.members.map((m) => pos.get(m)))
      }
      x0 = cx - g.w / 2
      if (c) x0 = Math.max(x0, c[1] + gapX)
      const taken = rightEdge.get(t.row)
      if (taken != null && x0 < taken) x0 = taken
      rightEdge.set(t.row, Math.max(rightEdge.get(t.row) ?? -Infinity, x0 + g.w + gapX))
      cExtend(comp, t.row, x0, x0 + g.w)
    }
    trays.push({ t, g, x0 })
  }
  const addRow = s.rows.includes(-1) || [...s.drawn].some((id) => rowOfId(id) === -1) ? -1 : 0
  const addW = Math.max(M.face, nameWidth('relative', M.name * 0.85) + 14)
  const addX = nextRight(addRow) + addW / 2
  // a tree with only you: Add a relative stands beside you
  const addXFinal = s.drawn.size === 1 && !s.trays.length ? (pos.get(s.me) ?? 0) + PARTNER * col : addX

  // ---- rows: y, with empty gaps shrunk
  const rowsUsed = [...new Set([...[...s.drawn].map(rowOfId), ...s.trays.map((t) => t.row), addRow])].sort((a, b) => a - b)
  const lineRows = new Set()
  for (const l of s.lines) {
    if (l.kind === 'couple') continue
    if (l.kind === 'bar') { lineRows.add(`${rowOfId(l.members[0]) - 1}>${rowOfId(l.members[0])}`); continue }
    const r0 = Math.min(...l.from.map(rowOfId)), r1 = rowOfId(l.to)
    for (let r = r0; r < r1; r++) lineRows.add(`${r}>${r + 1}`)
  }
  const top = M.face / 2 + Math.round(M.face * 0.42) + captionH
  const labelBelow = Math.round(M.name * 1.05 + M.label * 1.5 + 14)
  // what each row holds, and how far it reaches above and below the row's line
  const items = new Map()
  const hold = (r, l, rr, up, down) => (items.get(r) || items.set(r, []).get(r)).push({ l, r: rr, up, down })
  for (const id of s.drawn) {
    const d = faceOf(id, false), w = boxOf(id)
    if (pos.has(id)) hold(rowOfId(id), pos.get(id) - w / 2, pos.get(id) + w / 2, d / 2, d / 2 + labelBelow)
  }
  for (const { t, g, x0 } of trays) hold(t.row, x0, x0 + g.w, trayFace / 2 + captionH + 16, trayFace / 2 + labelBelow + 6)
  const yOf = new Map()
  let y = top
  rowsUsed.forEach((r, i) => {
    if (i) {
      const prev = rowsUsed[i - 1]
      const spanned = [...Array(r - prev)].some((_, k) => lineRows.has(`${prev + k}>${prev + k + 1}`))
      // never so close that something in one row runs into something above or below it
      let need = 0
      for (const a of items.get(prev) || []) for (const b of items.get(r) || []) if (a.l < b.r && b.l < a.r) need = Math.max(need, a.down + b.up + 14)
      y += Math.max(spanned ? M.gap : Math.round(M.gap * 0.75), need)
    }
    yOf.set(r, y)
  })
  const bottomRow = rowsUsed[rowsUsed.length - 1]
  const lastFace = bottomRow > 0 ? M.face * KID : M.face
  let height = yOf.get(bottomRow) + lastFace / 2 + labelBelow + Math.round(M.face * 0.36)

  // ---- lines: couples, descents with bars (and lanes), own lines, sibling bars
  const Y = (id) => yOf.get(rowOfId(id))
  const X = (id) => pos.get(id)
  const lines = []
  const ticks = []
  const groupsByGap = new Map() // "r" -> [{key, l, r, lane}]
  const descents = s.lines.filter((l) => (l.kind === 'descent' || l.kind === 'own') && X(l.to) != null && l.from.every((m) => X(m) != null))
  const anchorsOfGap = new Map()
  for (const l of descents) {
    const r = Math.min(...l.from.map(rowOfId))
    const key = `${l.kind}:${l.from.join('+')}`
    const ax = l.from.length === 2 ? (X(l.from[0]) + X(l.from[1])) / 2 : X(l.from[0])
    const list = anchorsOfGap.get(r) || anchorsOfGap.set(r, new Map()).get(r)
    const cur = list.get(key) || { key, l: ax, r: ax, into: !!l.into }
    cur.l = Math.min(cur.l, X(l.to))
    cur.r = Math.max(cur.r, X(l.to))
    list.set(key, cur)
  }
  const LANES = [0, -1, 1, -2, 2]
  const laneOf = new Map()
  for (const [r, list] of anchorsOfGap) {
    const spans = [...list.values()].sort((a, b) => a.l - b.l || a.r - b.r || (a.key < b.key ? -1 : 1))
    const ends = []
    for (const sp of spans) {
      let lane = 0
      while (lane < ends.length && ends[lane] > sp.l - 6 && sp.r - sp.l > 1) lane++
      if (sp.r - sp.l <= 1) { laneOf.set(`${r}|${sp.key}`, 0); continue }
      ends[lane] = sp.r
      laneOf.set(`${r}|${sp.key}`, LANES[lane] ?? lane)
    }
    groupsByGap.set(r, spans)
  }
  for (const l of s.lines) {
    if (l.kind === 'couple') {
      if (X(l.a) == null || X(l.b) == null) continue
      const yy = Y(l.a)
      lines.push({ id: l.id, d: `M${f(X(l.a))},${f(yy)} L${f(X(l.b))},${f(yy)}`, tone: l.tone, dashed: l.dashed, faint: l.faint, step: l.step, kind: 'couple', ends: [l.a, l.b] })
      if (l.tick) ticks.push({ id: `t:${l.id}`, x: (X(l.a) + X(l.b)) / 2, y: yy, step: s.finalStep })
      continue
    }
    if (l.kind === 'bar') {
      const ms = l.members.filter((m) => X(m) != null)
      if (ms.length < 2) continue
      const yy = Y(ms[0])
      const by = yy - M.gap * BAR_SIBS
      const anchorId = ms[ms.length - 1] === s.me || ms.includes(s.me) ? s.me : ms[0]
      for (const m of ms) {
        if (m === anchorId) continue
        lines.push({ id: `${l.id}:${m}`, d: elbow([[X(anchorId), yy], [X(anchorId), by], [X(m), by], [X(m), yy]]), tone: s.asked.has(m) ? null : l.tone, dashed: P(m)?.kind === 'tag', faint: s.asked.has(m), step: Math.max(l.step, s.steps.get(m) ?? 0), kind: 'bar', ends: [anchorId, m] })
      }
      continue
    }
    if (X(l.to) == null || l.from.some((m) => X(m) == null)) continue
    const r = Math.min(...l.from.map(rowOfId))
    const y0 = yOf.get(r)
    const y1 = Y(l.to)
    const ax = l.from.length === 2 ? (X(l.from[0]) + X(l.from[1])) / 2 : X(l.from[0])
    const cx = X(l.to)
    const gapH = y1 - y0
    const lane = laneOf.get(`${r}|${l.kind}:${l.from.join('+')}`) || 0
    const by = y0 + gapH * (l.into || l.kind === 'own' ? BAR_INTO : BAR_DOWN) + lane * LANE
    const straight = Math.abs(ax - cx) < 1
    const d = straight ? `M${f(ax)},${f(y0)} L${f(cx)},${f(y1)}` : elbow([[ax, y0], [ax, by], [cx, by], [cx, y1]])
    lines.push({ id: l.id, d, tone: l.tone, dashed: l.dashed, faint: l.faint, step: l.step, kind: l.kind, ends: [...l.from, l.to] })
    if (l.tick) {
      const myTop = y1 - M.face / 2
      ticks.push({ id: `t:${l.id}`, x: cx, y: straight ? y0 + (y1 - y0) * 0.6 : (by + myTop) / 2, step: s.finalStep })
    }
  }

  // ---- nodes
  const nodes = []
  for (const id of s.drawn) {
    if (X(id) == null) continue
    const p = P(id)
    nodes.push({ id, x: X(id), y: Y(id), d: faceOf(id, false), row: rowOfId(id), step: s.steps.get(id) ?? 0, kind: p.kind, asked: p.status === 'asked', tray: null, first: p.first, word: p.word, pet: !!p.info?.pet, w: boxOf(id) })
  }
  const trayOut = []
  for (const { t, g, x0 } of trays) {
    const ry = yOf.get(t.row)
    const capY = ry - trayFace / 2 - captionH - 6
    const h = trayFace + labelBelow + captionH + 22
    g.shown.forEach((id, i) => {
      const p = P(id)
      nodes.push({ id, x: x0 + g.xs[i], y: ry, d: trayFace, row: t.row, step: t.step, kind: p.kind, asked: p.status === 'asked', tray: t.id, first: p.first, word: p.word, pet: !!p.info?.pet, w: boxOf(id, true) })
    })
    trayOut.push({ id: t.id, key: t.key, caption: t.caption, row: t.row, side: t.side, x: x0, y: capY - 10, w: g.w, h, captionY: capY, members: t.members, shown: g.shown, more: g.more, moreX: g.moreX != null ? x0 + g.moreX : null, moreY: ry, moreD: trayFace, step: t.step })
  }

  // ---- normalise: everything at x >= the left padding
  const padX = Math.round(M.face * 0.5)
  let minX = Infinity, maxX = -Infinity
  for (const n of nodes) { minX = Math.min(minX, n.x - n.w / 2); maxX = Math.max(maxX, n.x + n.w / 2) }
  for (const t of trayOut) { minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x + t.w) }
  minX = Math.min(minX, addXFinal - addW / 2)
  maxX = Math.max(maxX, addXFinal + addW / 2)
  const shift = padX - minX
  const sx = (n) => Math.round((n + shift) * 10) / 10
  for (const n of nodes) n.x = sx(n.x)
  for (const t of trayOut) { t.x = sx(t.x); if (t.moreX != null) t.moreX = sx(t.moreX) }
  for (const tk of ticks) tk.x = sx(tk.x)
  const moved = lines.map((l) => ({ ...l, d: shiftPath(l.d, shift) }))
  const addY = yOf.get(addRow)
  const add = { x: sx(addXFinal), y: addY, d: addRow > 0 ? M.face * KID : M.face, w: addW, step: s.finalStep }
  const width = Math.ceil(maxX + shift + padX)
  const you = nodes.find((n) => n.id === s.me)
  const coreXs = s.root.core.members.map((m) => nodes.find((n) => n.id === m)?.x).filter((x) => x != null)
  height = Math.ceil(height)
  return {
    size,
    metrics: { ...M, kid: KID },
    width,
    height,
    rows: rowsUsed.map((r) => ({ row: r, y: yOf.get(r) })),
    nodes,
    lines: moved,
    ticks,
    trays: trayOut,
    add,
    you: you ? { x: you.x, y: you.y } : { x: width / 2, y: top },
    focus: { x: coreXs.length ? avg(coreXs) : width / 2, y: you ? you.y : top },
  }
}

function avg(xs) {
  const v = xs.filter((x) => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
}

/** Shift every x in an M/L/Q path. */
function shiftPath(d, dx) {
  return d.replace(/([MLQ ])(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, c, x, yv) => `${c}${f(Number(x) + dx)},${yv}`)
}
