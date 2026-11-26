// Smart Import canvas (owner: explain). A made-up camera roll moves through five states,
// following the rules of backend/app/utils/photo_clustering.py:
//   0 pile   1 in time order   2 breaks   3 trips merge   4 albums
// Plain 2D canvas, one draw per changed frame; no allocation in the hot path beyond the
// per-thumb interpolation. Browser only: construct it in an effect.
import { maybeArt } from '../art/manifest.js'
import { clamp, easeInOutCubic, lerp, win } from '../lib/math.js'

const INK = '#101b3b'
const WHITE = '#ffffff'
const PAPER = '#f4f7fb'
const LIME = '#c6f135'
const FIZZ = '#ff62c4'
const ZEST = '#ff8a1f'
const MONO = '"OFSL DM Mono", ui-monospace, "SF Mono", Menlo, monospace'
const DISPLAY = '"OFSL Bricolage", system-ui, -apple-system, "Segoe UI", sans-serif'
export const STATES = 5

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed) {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const images = new Map()
function image(id, onload) {
  if (!id) return null
  let rec = images.get(id)
  if (!rec) {
    const a = maybeArt(id)
    const img = new Image()
    img.decoding = 'async'
    rec = { img, ok: false, waiters: new Set() }
    images.set(id, rec)
    if (a) {
      img.onload = () => {
        rec.ok = true
        rec.waiters.forEach((fn) => fn())
        rec.waiters.clear()
      }
      img.src = a.srcM || a.src
    }
  }
  if (!rec.ok && onload) rec.waiters.add(onload)
  return rec
}

/** Wrap text into lines that fit maxW. */
function lines(ctx, text, maxW) {
  const words = String(text).split(' ')
  const out = []
  let cur = ''
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w
    if (ctx.measureText(t).width > maxW && cur) {
      out.push(cur)
      cur = w
    } else cur = t
  }
  if (cur) out.push(cur)
  return out
}

export class ImportScene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{segments, undated:number, albums, text:{unsorted,trip,away,home}}} data
   */
  constructor(canvas, data) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.data = data
    this.seed = 7
    this.p = 0
    this.w = 0
    this.h = 0
    this.dirty = true
    this.thumbs = []
    data.segments.forEach((seg, si) => {
      seg.photos.forEach((id, k) => this.thumbs.push({ id, seg: si, k, album: seg.album, zone: seg.zone, undated: false }))
    })
    for (let u = 0; u < data.undated; u++) this.thumbs.push({ id: null, seg: -1, k: u, album: 'unsorted', zone: 'home', undated: true })
    // interleave the undated tiles into the pile order so the pile looks mixed
    const redraw = () => {
      this.dirty = true
    }
    for (const t of this.thumbs) t.img = image(t.id, redraw)
  }

  resize(w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = w
    this.h = h
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.layout()
    this.dirty = true
  }

  shuffle() {
    this.seed = (this.seed * 9301 + 49297) % 233280
    this.layout()
    this.dirty = true
  }

  set(p) {
    if (Math.abs(p - this.p) > 1e-4) {
      this.p = p
      this.dirty = true
    }
  }

  /* ---------------- layouts ---------------- */

  layout() {
    const { w, h } = this
    if (!w || !h) return
    const n = this.thumbs.length
    const pad = Math.max(12, Math.min(w, h) * 0.05)
    const top = w < 520 ? 34 : 18 // clear the stage label
    const area = { x: pad, y: pad + top, w: w - pad * 2, h: h - pad * 2 - top }
    this.area = area
    // leave room for the tray and the legend under the flow
    this.foot = w < 520 ? 58 : 30
    // the largest thumb size at which the trips layout (the tallest) still fits
    let T = clamp(Math.sqrt((area.w * (area.h - this.foot * 2) * 0.3) / n), 12, 46)
    for (; T > 12; T -= 1) {
      this.setT(T)
      if (this.flow(true, true).fits) break
    }
    this.setT(T)
    const L = [this.pile(), this.flow(false, false), this.flow(true, false), this.flow(true, true), this.albums()]
    this.L = L
  }

  setT(T) {
    const { area } = this
    const g = Math.max(3, Math.round(T * 0.14))
    this.T = T
    this.g = g
    // the unsorted tray (bottom right)
    const trayW = T * 3 + g * 6
    this.tray = { x: area.x + area.w - trayW, y: area.y + area.h - T - g * 6 - 14 - this.foot, w: trayW, h: T + g * 6 + 14 }
  }

  pile() {
    const { area, T, seed } = this
    const cx = area.x + area.w / 2
    const cy = area.y + area.h / 2
    const rx = area.w * 0.36
    const ry = area.h * 0.3
    return this.thumbs.map((t, j) => {
      const a = rand(seed * 131 + j) * Math.PI * 2
      const d = Math.sqrt(rand(seed * 17 + j * 3))
      return {
        x: cx + Math.cos(a) * d * rx,
        y: cy + Math.sin(a) * d * ry,
        s: T * 1.55,
        r: (rand(seed * 7 + j * 11) - 0.5) * 1.0,
        a: 1,
        z: rand(seed * 5 + j),
      }
    })
  }

  trayPos(k) {
    const { tray, T, g } = this
    return { x: tray.x + g * 3 + T / 2 + (k % 3) * (T + g), y: tray.y + 14 + g * 3 + T / 2, s: T, r: 0, a: 1, z: 0 }
  }

  /**
   * Time-ordered flow, wrapped like text. breaks: segments become words with a gap and a
   * marker between them. trips: away segments that the trip rule merges close up again.
   */
  flow(breaks, trips) {
    const { area, T, g, thumbs } = this
    const segs = this.data.segments
    const albums = this.data.albums
    const out = new Array(thumbs.length)
    const markers = []
    const W = area.w
    const step = T + g
    const bigGap = breaks ? Math.round(T * 0.9) : g
    const rowH = T + (breaks ? (T < 30 ? 16 : 34) : g + 6)
    // in the trips state every trip sits on rows of its own, with room above for its label
    const lift = T >= 30 ? 34 : 22
    const rowY = [0]
    let x = 0
    let row = 0
    const newRow = (extra = 0) => {
      row++
      rowY[row] = rowY[row - 1] + rowH + extra
      x = 0
    }
    let j = 0
    for (let si = 0; si < segs.length; si++) {
      const seg = segs[si]
      const prev = si > 0 ? segs[si - 1] : null
      const isTrip = !!(albums[seg.album] && albums[seg.album].trip)
      const joined = trips && prev && isTrip && prev.album === seg.album
      const startsTrip = trips && isTrip && !joined
      const endsTrip = trips && prev && albums[prev.album] && albums[prev.album].trip && prev.album !== seg.album
      const n = seg.photos.length
      if (si > 0) {
        const gap = joined ? Math.round(g * 3) : bigGap
        if (breaks) markers.push({ type: joined ? 'day' : seg.brk, row, x: x + gap / 2 - g / 2, seg: si })
        x += gap - g
      }
      if (startsTrip || endsTrip) {
        if (breaks && markers.length && markers[markers.length - 1].seg === si) markers[markers.length - 1].wrapped = true
        if (x > bigGap || startsTrip) {
          if (si === 0 && startsTrip) rowY[0] = lift
          else newRow(startsTrip ? lift : 6)
        }
        x = 0
      }
      const width = n * step - g
      if (x > 0 && x + width > W && width <= W) {
        // wrap the whole word; its marker would sit at the end of the row before
        newRow()
        if (breaks && markers.length && markers[markers.length - 1].seg === si) markers[markers.length - 1].wrapped = true
      }
      for (let k = 0; k < n; k++) {
        if (x + T > W) newRow()
        out[j] = { x: x + T / 2, row, s: T, r: 0, a: 1, z: 0 }
        x += step
        j++
      }
    }
    const rows = row + 1
    const blockH = rowY[row] + T
    const room = area.h - this.foot - (this.tray.h + 12)
    const top = area.y + Math.max(breaks ? 18 : 0, (room - blockH) / 2)
    // centre each row horizontally
    const rowW = new Array(rows).fill(0)
    for (let i = 0; i < j; i++) rowW[out[i].row] = Math.max(rowW[out[i].row], out[i].x + T / 2)
    for (let i = 0; i < j; i++) {
      const o = out[i]
      o.x = area.x + (W - rowW[o.row]) / 2 + o.x
      o.y = top + rowY[o.row] + T / 2
    }
    for (const m of markers) {
      m.x = area.x + (W - rowW[m.row]) / 2 + m.x
      m.y = top + rowY[m.row] + T / 2
    }
    // undated tiles sit in the tray from state 1 on
    let u = 0
    for (; j < thumbs.length; j++) out[j] = this.trayPos(u++)
    out.markers = breaks ? markers.filter((m) => !m.wrapped) : []
    out.rowH = rowH
    out.fits = blockH + (breaks ? 18 : 0) <= area.h - this.foot - 6
    return out
  }

  /**
   * The payoff: four album cards on a 2x2 grid, each with its photos stacked as a big cover,
   * and the unsorted pool as a strip along the bottom.
   */
  albums() {
    const { area, thumbs, T } = this
    const keys = Object.keys(this.data.albums).filter((k) => k !== 'unsorted').slice(0, 4)
    const gap = Math.max(10, Math.min(area.w, area.h) * 0.03)
    const stripH = Math.max(46, Math.min(70, T + 26))
    const gridH = area.h - stripH - gap
    const cw = (area.w - gap) / 2
    const ch = (gridH - gap) / 2
    const cards = {}
    keys.forEach((k, i) => {
      const c = i % 2
      const r = Math.floor(i / 2)
      const card = { x: area.x + c * (cw + gap), y: area.y + r * (ch + gap), w: cw, h: ch, key: k }
      const pad = Math.max(8, Math.min(cw, ch) * 0.07)
      card.pad = pad
      card.wide = cw / ch >= 1.25
      if (card.wide) {
        const sz = Math.min(ch - pad * 2, cw * 0.5)
        card.cover = { x: card.x + pad + sz / 2, y: card.y + ch / 2, s: sz * 0.9 }
        card.text = { x: card.x + pad * 2 + sz, y: card.y + pad + 2, w: cw - sz - pad * 3 }
      } else {
        const sz = Math.min(cw - pad * 2, ch * 0.6)
        card.cover = { x: card.x + cw / 2, y: card.y + pad + sz / 2, s: sz * 0.9 }
        card.text = { x: card.x + pad, y: card.y + pad + sz + 6, w: cw - pad * 2 }
      }
      cards[k] = card
    })
    const strip = { x: area.x, y: area.y + area.h - stripH, w: area.w, h: stripH, key: 'unsorted' }
    cards.unsorted = strip
    this.cards = cards
    const counters = {}
    const loose = thumbs.filter((t) => t.album === 'unsorted').length
    return thumbs.map((t) => {
      const k = (counters[t.album] = (counters[t.album] || 0) + 1) - 1
      if (t.album === 'unsorted') {
        const sz = strip.h - 16
        const step = sz * 0.72
        return { x: strip.x + strip.w - 12 - sz / 2 - (loose - 1 - k) * step, y: strip.y + strip.h / 2, s: sz, r: (k % 2 ? 1 : -1) * 0.06, a: 1, z: k }
      }
      const cv = cards[t.album].cover
      const jitter = ((k * 37) % 9) - 4
      return { x: cv.x + jitter * 1.3, y: cv.y + (((k * 53) % 7) - 3) * 1.1, s: cv.s, r: jitter * 0.022, a: 1, z: k }
    })
  }

  /* ---------------- drawing ---------------- */

  /** Which pair of states and how far between them, at progress p. */
  phase(p) {
    const f = clamp(p) * STATES
    const i = Math.min(STATES - 1, Math.floor(f))
    const t = f - i
    if (i === 0) return { from: 0, to: 0, t: 0, i }
    return { from: i - 1, to: i, t: win(t, 0, 0.5), i }
  }

  draw() {
    if (!this.dirty || !this.L || !this.w) return
    this.dirty = false
    const { ctx, w, h, thumbs, L, T } = this
    const { from, to, t } = this.phase(this.p)
    ctx.clearRect(0, 0, w, h)
    const A = L[from]
    const B = L[to]
    const wTo = easeInOutCubic(t)
    const weight = (state) => (state === to ? (from === to ? 1 : wTo) : 0) + (state === from && from !== to ? 1 - wTo : 0)

    // tray (states 1-3)
    const trayA = weight(1) + weight(2) + weight(3)
    if (trayA > 0.01) this.drawTray(trayA)
    // album cards (state 4)
    if (weight(4) > 0.01) this.drawCards(weight(4))
    // trip highlight (state 3)
    if (weight(3) > 0.01) this.drawTrip(L[3], weight(3))
    // zone bars and dates (states 2-3)
    const zA = Math.max(weight(2), weight(3))
    if (zA > 0.01) this.drawZones(from === 3 || to === 3 ? (weight(3) >= weight(2) ? L[3] : L[2]) : L[2], zA)

    // thumbs, per-thumb stagger so the move reads as many hands, not one slide
    const n = thumbs.length
    const cur = new Array(n)
    for (let j = 0; j < n; j++) {
      const a = A[j]
      const b = B[j]
      const d = (j / n) * 0.35
      const e = from === to ? 1 : easeInOutCubic(clamp((t - d * 0.5) / (1 - 0.35 * 0.5)))
      cur[j] = { j, x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), s: lerp(a.s, b.s, e), r: lerp(a.r, b.r, e), z: lerp(a.z, b.z, e) }
    }
    if (to === 0 || to === 4) cur.sort((p, q) => p.z - q.z)
    for (const c of cur) this.drawThumb(thumbs[c.j], c)

    // markers last, above the thumbs
    const mA = weight(2) + weight(3)
    if (mA > 0.01) this.drawMarkers(weight(3) >= weight(2) ? L[3].markers : L[2].markers, mA)
    void T
  }

  drawThumb(t, c) {
    const { ctx } = this
    const s = c.s
    const b = Math.max(2, s * 0.07)
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(c.r)
    ctx.fillStyle = INK
    ctx.fillRect(-s / 2 + 2, -s / 2 + 2, s, s)
    ctx.fillStyle = WHITE
    ctx.fillRect(-s / 2, -s / 2, s, s)
    if (t.undated) {
      // a screenshot: phone-shaped bars, no photo
      ctx.fillStyle = PAPER
      ctx.fillRect(-s / 2 + b, -s / 2 + b, s - 2 * b, s - 2 * b)
      ctx.fillStyle = 'rgba(16,27,59,.28)'
      const iw = s - 4 * b
      for (let r = 0; r < 4; r++) ctx.fillRect(-iw / 2, -s / 2 + b * 2.4 + r * (s * 0.17), iw * (r % 2 ? 0.6 : 0.9), Math.max(2, s * 0.07))
    } else {
      const im = t.img && t.img.ok ? t.img.img : null
      const iw = s - 2 * b
      if (im) {
        const side = Math.min(im.naturalWidth, im.naturalHeight)
        const sx = (im.naturalWidth - side) / 2 + ((t.k * 97) % 5) * side * 0.02
        ctx.drawImage(im, Math.min(sx, im.naturalWidth - side), (im.naturalHeight - side) / 2, side, side, -iw / 2, -iw / 2, iw, iw)
      } else {
        ctx.fillStyle = '#cfe6ff'
        ctx.fillRect(-iw / 2, -iw / 2, iw, iw)
      }
    }
    ctx.lineWidth = 1
    ctx.strokeStyle = INK
    ctx.strokeRect(-s / 2 + 0.5, -s / 2 + 0.5, s - 1, s - 1)
    ctx.restore()
  }

  drawTray(alpha) {
    const { ctx, tray } = this
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2
    ctx.strokeStyle = INK
    ctx.fillStyle = 'rgba(255,255,255,.35)'
    roundRect(ctx, tray.x, tray.y, tray.w, tray.h, 10)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = INK
    ctx.font = `500 11px ${MONO}`
    ctx.textBaseline = 'top'
    ctx.fillText(this.data.text.unsorted.toUpperCase(), tray.x + 9, tray.y + 7)
    ctx.restore()
  }

  drawZones(Lz, alpha) {
    const { ctx, thumbs, T, g } = this
    ctx.save()
    ctx.globalAlpha = alpha
    for (let j = 0; j < thumbs.length; j++) {
      const t = thumbs[j]
      if (t.undated) continue
      const o = Lz[j]
      ctx.fillStyle = t.zone === 'away' ? LIME : WHITE
      ctx.fillRect(o.x - T / 2 - g / 2, o.y + T / 2 + 5, T + g, 5)
    }
    // the date over the first photo of each run
    ctx.fillStyle = INK
    if (T < 30) {
      ctx.restore()
      return
    }
    ctx.font = `500 11px ${MONO}`
    ctx.textBaseline = 'bottom'
    let prev = -2
    let lastY = null
    let lastEnd = -Infinity
    for (let j = 0; j < thumbs.length; j++) {
      const t = thumbs[j]
      if (t.undated || t.seg === prev) continue
      prev = t.seg
      const o = Lz[j]
      const text = this.data.segments[t.seg].when
      const x0 = o.x - T / 2
      // skip a date that would run into the one before it on the same row
      if (lastY === o.y && x0 < lastEnd + 6) continue
      ctx.fillText(text, x0, o.y - T / 2 - 4)
      lastY = o.y
      lastEnd = x0 + ctx.measureText(text).width
    }
    ctx.restore()
  }

  drawMarkers(markers, alpha) {
    const { ctx, T } = this
    ctx.save()
    ctx.globalAlpha = Math.min(1, alpha)
    for (const m of markers) {
      if (m.type === 'day') {
        ctx.strokeStyle = INK
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(m.x, m.y - T / 2 - 2)
        ctx.lineTo(m.x, m.y + T / 2 + 2)
        ctx.stroke()
        ctx.setLineDash([])
        continue
      }
      ctx.fillStyle = m.type === 'moved' ? FIZZ : INK
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.5
      const bw = 6
      roundRect(ctx, m.x - bw / 2, m.y - T / 2 - 6, bw, T + 12, 3)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  drawTrip(L3, alpha) {
    const { ctx, thumbs, T, g } = this
    const albums = this.data.albums
    // one rounded band per row that each trip occupies
    const bands = new Map()
    for (let j = 0; j < thumbs.length; j++) {
      const al = thumbs[j].album
      if (!albums[al] || !albums[al].trip) continue
      const o = L3[j]
      const key = `${al}|${o.y}`
      const r = bands.get(key) || { al, x0: Infinity, x1: -Infinity, y: o.y }
      r.x0 = Math.min(r.x0, o.x - T / 2)
      r.x1 = Math.max(r.x1, o.x + T / 2)
      bands.set(key, r)
    }
    const pad = g * 2
    const below = T < 30 ? 6 : 12
    const above = T >= 30 ? 16 : 0 // room for the day dates inside the band
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    // outlines first, then fills, so the rows of one trip read as one shape
    const band = (r) => roundRect(ctx, r.x0 - pad, r.y - T / 2 - pad - above, r.x1 - r.x0 + pad * 2, T + pad * 2 + below + above, 8)
    ctx.lineWidth = 4
    for (const r of bands.values()) {
      band(r)
      ctx.stroke()
    }
    ctx.fillStyle = ZEST
    for (const r of bands.values()) {
      band(r)
      ctx.fill()
    }
    // the label sits on the top edge of each trip's first band
    const seen = new Set()
    ctx.font = `500 11px ${MONO}`
    ctx.textBaseline = 'middle'
    for (const r of bands.values()) {
      if (seen.has(r.al)) continue
      seen.add(r.al)
      const label = String(this.data.text[r.al] || this.data.text.trip).toUpperCase()
      const lw = ctx.measureText(label).width + 14
      const ly = r.y - T / 2 - pad - above - 9
      ctx.fillStyle = INK
      roundRect(ctx, r.x0 - pad, ly - 8, lw, 17, 8)
      ctx.fill()
      ctx.fillStyle = WHITE
      ctx.fillText(label, r.x0 - pad + 7, ly + 0.5)
    }
    ctx.restore()
  }

  drawCards(alpha) {
    const { ctx, cards } = this
    const albums = this.data.albums
    const rise = (1 - alpha) * 24
    ctx.save()
    ctx.globalAlpha = alpha
    for (const key of Object.keys(cards)) {
      const c = cards[key]
      const al = albums[key]
      const isTrip = !!(al && al.trip)
      const isLoose = key === 'unsorted'
      const y = c.y + rise
      if (!isLoose) {
        ctx.fillStyle = INK
        roundRect(ctx, c.x + 4, y + 4, c.w, c.h, 14)
        ctx.fill()
      }
      ctx.fillStyle = isTrip ? LIME : isLoose ? 'rgba(255,255,255,.4)' : WHITE
      ctx.strokeStyle = INK
      ctx.lineWidth = 2
      if (isLoose) ctx.setLineDash([6, 5])
      roundRect(ctx, c.x, y, c.w, c.h, 14)
      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = INK
      ctx.textBaseline = 'top'
      if (isLoose) {
        ctx.textBaseline = 'middle'
        ctx.font = `800 15px ${DISPLAY}`
        ctx.fillText(al.title, c.x + 14, y + c.h / 2 - (c.w > 420 ? 8 : 0))
        if (c.w > 420) {
          ctx.font = `500 11px ${MONO}`
          ctx.fillStyle = 'rgba(16,27,59,.75)'
          ctx.fillText(al.evidence, c.x + 14, y + c.h / 2 + 11)
        }
        continue
      }
      const tb = c.text
      const size = Math.round(Math.max(14, Math.min(24, c.h * 0.1, tb.w * 0.17)))
      ctx.font = `800 ${size}px ${DISPLAY}`
      let ty = tb.y + rise
      for (const ln of lines(ctx, al.title, tb.w).slice(0, 3)) {
        ctx.fillText(ln, tb.x, ty)
        ty += size * 1.02
      }
      // the evidence line only where it can be read (11px at the least)
      if (tb.w >= 120) {
        ctx.font = `500 11px ${MONO}`
        ctx.fillStyle = 'rgba(16,27,59,.75)'
        ty += 6
        const room = Math.floor((c.y + rise + c.h - c.pad - ty) / 14)
        for (const ln of lines(ctx, al.evidence, tb.w).slice(0, Math.max(0, room))) {
          ctx.fillText(ln, tb.x, ty)
          ty += 14
        }
      }
    }
    ctx.restore()
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
