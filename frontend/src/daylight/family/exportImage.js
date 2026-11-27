// Save image (owner: FAMILY). docs/app/FAMILY.md section 3: the same geometry drawn on a
// canvas (lines from the same path strings through Path2D, round photos with crossOrigin and
// an initials fallback, text after document.fonts.load), on paper, with "{First}'s family
// tree", the month and year, and the wordmark. Up to 4096px wide. People you asked and Add a
// relative are left out. Browser only.
import { arrange } from './arrange.js'
import { layout } from './layout.js'
import { COLOR, WASH, FONT, washFor } from '../styles/tokens.js'
import { initialsOf } from '../ui/Avatar.jsx'
import { possessive } from './words.js'

const MARGIN = 72
const HEAD = 112
const FOOT = 104
const PIN = 'M8 15C6.9 12.6 2.6 9.6 2.6 6.4a5.4 5.4 0 0 1 10.8 0C13.4 9.6 9.1 12.6 8 15z'

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    const t = setTimeout(() => resolve(null), 8000)
    img.onload = () => { clearTimeout(t); resolve(img) }
    img.onerror = () => { clearTimeout(t); resolve(null) }
    img.src = src
  })
}

const font = (weight, px, family) => `${weight} ${px}px ${family}`

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draws the tree and returns a PNG blob. */
export async function drawTree({ input, now = new Date() }) {
  // the confirmed tree only: nobody you asked
  const structure = arrange({ ...input, sent: [] })
  const g = layout(structure, { size: 'wide' })
  const W = g.width + MARGIN * 2
  const H = HEAD + g.height + FOOT
  const scale = Math.min(2, 4096 / W)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  try {
    await Promise.all([
      document.fonts?.load(font(800, 21, FONT.ui)),
      document.fonts?.load(font(500, 13, FONT.mono)),
    ])
  } catch {
    /* the fallback faces still draw */
  }
  const people = new Map([...structure.people])
  const images = new Map()
  await Promise.all(g.nodes.map(async (n) => images.set(n.id, await loadImage(people.get(n.id)?.avatar))))

  // paper, title, date
  ctx.fillStyle = COLOR.paper
  ctx.fillRect(0, 0, W, H)
  const me = people.get(structure.me)
  ctx.fillStyle = COLOR.ink
  ctx.textBaseline = 'alphabetic'
  ctx.font = font(800, 46, FONT.ui)
  if ('fontStretch' in ctx) ctx.fontStretch = 'semi-condensed'
  ctx.fillText(`${possessive(me.first)} family tree`, MARGIN, 88)
  ctx.font = font(500, 15, FONT.mono)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px'
  ctx.fillStyle = COLOR.mute
  ctx.fillText(now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(), MARGIN, 120)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

  ctx.save()
  ctx.translate(MARGIN, HEAD - 28)
  const M = g.metrics

  // trays
  for (const t of g.trays) {
    ctx.fillStyle = COLOR.paperDeep
    roundRect(ctx, t.x, t.y, t.w, t.h, 22)
    ctx.fill()
    ctx.fillStyle = COLOR.ink
    ctx.font = font(500, M.label, FONT.mono)
    ctx.textAlign = 'center'
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(M.label * 0.12).toFixed(1)}px`
    ctx.fillText(t.caption.toUpperCase(), t.x + t.w / 2, t.captionY + M.label)
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  }

  // lines: every wash branch first, then every ink line (as the SVG does), so a dashed line to
  // a tag never paints over a shared trunk
  const drawn = g.lines.filter((l) => !l.faint).map((l) => ({ l, path: new Path2D(l.d) }))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.85
  ctx.lineWidth = 13
  for (const { l, path } of drawn) {
    if (!l.tone) continue
    ctx.strokeStyle = WASH[l.tone]?.base || COLOR.paperDeep
    ctx.stroke(path)
  }
  ctx.globalAlpha = 1
  ctx.strokeStyle = COLOR.ink
  ctx.lineWidth = 3.2
  for (const { l, path } of [...drawn.filter((x) => !x.l.dashed), ...drawn.filter((x) => x.l.dashed)]) {
    ctx.setLineDash(l.dashed ? [9, 8] : [])
    ctx.stroke(path)
  }
  ctx.setLineDash([])

  // faces, stickers, names and words
  for (const n of g.nodes) {
    const p = people.get(n.id)
    if (!p || n.asked) continue
    const r = n.d / 2
    const you = n.id === structure.me
    const tag = p.kind === 'tag'
    if (!tag) {
      ctx.fillStyle = COLOR.ink
      ctx.beginPath()
      ctx.arc(n.x + 3, n.y + 3, r, 0, Math.PI * 2)
      ctx.fill()
    }
    if (you) {
      ctx.fillStyle = WASH.lime.base
      ctx.beginPath()
      ctx.arc(n.x, n.y, r + n.d * 0.065, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.save()
    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.clip()
    const img = images.get(n.id)
    if (img) {
      const k = Math.max(n.d / img.naturalWidth, n.d / img.naturalHeight)
      const w = img.naturalWidth * k, h = img.naturalHeight * k
      ctx.drawImage(img, n.x - w / 2, n.y - h / 2, w, h)
    } else {
      ctx.fillStyle = WASH[washFor(p.name)]?.base || COLOR.white
      ctx.fillRect(n.x - r, n.y - r, n.d, n.d)
      ctx.fillStyle = COLOR.ink
      ctx.font = font(800, Math.round(n.d * 0.36), FONT.ui)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initialsOf(p.name), n.x, n.y + 1)
      ctx.textBaseline = 'alphabetic'
    }
    ctx.restore()
    ctx.strokeStyle = COLOR.ink
    ctx.lineWidth = you ? 4 : 3
    ctx.setLineDash(tag ? [7, 5] : [])
    ctx.beginPath()
    ctx.arc(n.x, n.y, r - ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    if (you || tag) sticker(ctx, n, you ? 'You' : 'TAG', you)
    label(ctx, n, M, you)
  }
  for (const t of g.trays) {
    if (!t.more) continue
    ctx.fillStyle = COLOR.white
    ctx.strokeStyle = COLOR.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(t.moreX, t.moreY, t.moreD / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = COLOR.ink
    ctx.font = font(800, Math.round(t.moreD * 0.3), FONT.ui)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`+${t.more}`, t.moreX, t.moreY + 1)
    ctx.textBaseline = 'alphabetic'
  }
  for (const tk of g.ticks) {
    ctx.fillStyle = WASH.lime.base
    ctx.strokeStyle = COLOR.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(tk.x, tk.y, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(tk.x - 5, tk.y)
    ctx.lineTo(tk.x - 1.5, tk.y + 3.5)
    ctx.lineTo(tk.x + 5.5, tk.y - 4)
    ctx.stroke()
  }
  ctx.restore()

  // the wordmark: the journey pin and the name
  const fy = HEAD + g.height + FOOT / 2 + 8
  ctx.save()
  ctx.translate(MARGIN, fy - 22)
  ctx.scale(2.6, 2.6)
  ctx.fillStyle = WASH.zest.base
  ctx.strokeStyle = COLOR.ink
  ctx.lineWidth = 1.4
  ctx.lineJoin = 'round'
  const pin = new Path2D(PIN)
  ctx.fill(pin)
  ctx.stroke(pin)
  ctx.fillStyle = COLOR.white
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.arc(8, 6.3, 2.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = COLOR.ink
  ctx.font = font(800, 24, FONT.ui)
  ctx.textAlign = 'left'
  ctx.fillText('Our Family Socials', MARGIN + 50, fy + 8)

  const blob = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The picture could not be made.'))), 'image/png')
    } catch (e) {
      reject(e)
    }
  })
  return blob
}

function sticker(ctx, n, text, you) {
  ctx.save()
  const px = you ? 15 : 12
  ctx.font = you ? font(800, px, FONT.ui) : font(500, px, FONT.mono)
  const w = ctx.measureText(text).width + 16
  const h = px + 9
  ctx.translate(n.x + n.d * 0.36, n.y - n.d * 0.42)
  ctx.rotate((6 * Math.PI) / 180)
  if (you) {
    ctx.fillStyle = COLOR.ink
    roundRect(ctx, 2, 2, w, h, 6)
    ctx.fill()
  }
  ctx.fillStyle = you ? WASH.lime.base : COLOR.white
  roundRect(ctx, 0, 0, w, h, 6)
  ctx.fill()
  ctx.strokeStyle = COLOR.ink
  ctx.lineWidth = 2
  ctx.setLineDash(you ? [] : [4, 3])
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = COLOR.ink
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 8, h / 2 + 1)
  ctx.restore()
}

function label(ctx, n, M, you) {
  const p = n
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = font(800, M.name, FONT.ui)
  const nameW = ctx.measureText(p.first).width
  let wordW = 0
  const word = you ? '' : String(p.word || '').toUpperCase()
  if (word) {
    ctx.font = font(500, M.label, FONT.mono)
    wordW = ctx.measureText(word).width + word.length * M.label * 0.06
  }
  const w = Math.max(nameW, wordW) + 16
  const top = n.y + n.d / 2 + 6
  const h = M.name + (word ? M.label + 8 : 4) + 4
  if (!n.tray) {
    ctx.fillStyle = COLOR.paper
    roundRect(ctx, n.x - w / 2, top, w, h, 8)
    ctx.fill()
  }
  ctx.fillStyle = COLOR.ink
  ctx.font = font(800, M.name, FONT.ui)
  ctx.fillText(p.first, n.x, top + M.name)
  if (word) {
    ctx.fillStyle = COLOR.mute
    ctx.font = font(500, M.label, FONT.mono)
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(M.label * 0.06).toFixed(1)}px`
    ctx.fillText(word, n.x, top + M.name + M.label + 5)
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  }
}

/** Shares the picture on a phone that can, else downloads family-tree.png. */
export async function saveTreeImage({ input, phone }) {
  const blob = await drawTree({ input })
  const file = new File([blob], 'family-tree.png', { type: 'image/png' })
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Our family tree' })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'family-tree.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'downloaded'
}
