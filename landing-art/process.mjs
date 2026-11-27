// Raw PNGs in landing-art/raw -> frontend/public/landing/img/<id>.<hash8>[.m].webp
// + frontend/src/landing/art/manifest.json.
// Re-runnable and idempotent: every run rebuilds every output from the raw files
// and removes outputs whose id or hash no longer exists.
// Usage: cd landing-art && node process.mjs
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ART = dirname(fileURLToPath(import.meta.url))
const ROOT = join(ART, '..')
const RAW = join(ART, 'raw')
// Superseded round-one raws. Used only for an id that has no new raw yet, so the page never loses an id mid-run.
const RAW_V1 = join(RAW, '_v1')
const RAW_V2 = join(RAW, '_v2') // superseded round-two raws (Marcus recast)
const RAW_V3 = join(RAW, '_v3') // superseded round-three raws (round four)
const OUT = join(ROOT, 'frontend', 'public', 'landing', 'img')
const MANIFEST = join(ROOT, 'frontend', 'src', 'landing', 'art', 'manifest.json')
const URL_BASE = '/landing/img/'

const ALPHA_FLOOR = 8 // alpha below this is generator noise -> 0
const MARGIN = 0.02 // transparent margin around the trimmed subject, share of its long edge
const KITCHEN = ['r-kitchen-before', 'r-kitchen-gutted', 'r-kitchen-fitted', 'r-kitchen-done']
// The years pairs share one crop box too, so the floor line and scale match and one can replace the next in place.
const YEARS = ['g-years-1', 'g-years-2', 'g-years-3', 'g-years-4', 'g-years-5']

// Long edge per kind: desktop, phone.
const SIZE = {
  person: [1400, 760],
  group: [1800, 760],
  object: [1800, 900],
  prop: [700, 760], // phone size is capped at the desktop size
  photo: [1600, 900],
  plate: [2400, 1200],
}

// Story covers: 16:10 crops, 1200 wide, from these photos (with the crop anchor).
const COVERS = {
  'cover-coast': ['photo-coast-cliff', 'north'], // keeps Leo's head on Tom's shoulders
  'cover-tetons': ['photo-tetons-30', 'centre'],
  'cover-maui': ['photo-maui-beach', 'centre'],
  'cover-wedding': ['photo-wedding-confetti', 'north'],
  'cover-kitchen': ['photo-kitchen-done', 'centre'],
  'cover-marathon': ['photo-race-finish', 'north'],
  'cover-birthday': ['photo-year-birthday', 'centre'],
  'cover-joe70': ['photo-year-joe70', 'north'], // keeps Joe's raised glass and head
}
const COVER_W = 1200, COVER_H = 750, COVER_WM = 760

export function kindOf(id) {
  if (id.startsWith('g-')) return 'group'
  if (id.startsWith('p-')) return 'person'
  if (id.startsWith('r-') || id.startsWith('o-')) return 'object'
  if (id.startsWith('prop-')) return 'prop'
  if (id.startsWith('photo-')) return 'photo'
  if (id.startsWith('plate-')) return 'plate'
  return null
}

async function loadRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

// Zero out alpha noise; report whether any pixel is transparent at all.
function cleanAlpha(img) {
  let opaque = true
  for (let i = 3; i < img.data.length; i += 4) {
    const a = img.data[i]
    if (a < ALPHA_FLOOR) {
      img.data[i] = 0
      img.data[i - 3] = img.data[i - 2] = img.data[i - 1] = 0
    }
    if (a < 255) opaque = false
  }
  return !opaque
}

function bbox(img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1
  for (let y = 0; y < img.h; y++) {
    const row = y * img.w * 4
    for (let x = 0; x < img.w; x++) {
      if (img.data[row + x * 4 + 3] > 0) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { x0, y0, x1, y1 }
}

const union = (a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) })

// Crop to the box plus a 2% margin; extend with transparency where the margin
// would fall outside the canvas, so every cut-out keeps the same breathing room.
function trimmed(img, b) {
  const m = Math.round(MARGIN * Math.max(b.x1 - b.x0 + 1, b.y1 - b.y0 + 1))
  const L = b.x0 - m, T = b.y0 - m, R = b.x1 + m, B = b.y1 + m
  const box = { left: Math.max(0, L), top: Math.max(0, T) }
  box.width = Math.min(img.w - 1, R) - box.left + 1
  box.height = Math.min(img.h - 1, B) - box.top + 1
  const ext = { left: box.left - L, top: box.top - T, right: R - Math.min(img.w - 1, R), bottom: B - Math.min(img.h - 1, B) }
  const base = sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).extract(box)
  return ext.left || ext.top || ext.right || ext.bottom
    ? base.extend({ ...ext, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    : base
}

// Vertical extent and foot centre of visible pixels, as 0..1 of the image.
async function figureMetrics(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const on = (x, y) => data[(y * w + x) * 4 + 3] >= 64
  let top = -1, bottom = -1
  for (let y = 0; y < h; y++) {
    let any = false
    for (let x = 0; x < w; x++) if (on(x, y)) { any = true; break }
    if (any) { if (top < 0) top = y; bottom = y }
  }
  // Feet band: the lowest 4% of the figure's height.
  const band = Math.max(2, Math.round((bottom - top) * 0.04))
  let fx0 = w, fx1 = -1
  for (let y = bottom - band; y <= bottom; y++)
    for (let x = 0; x < w; x++) if (on(x, y)) { if (x < fx0) fx0 = x; if (x > fx1) fx1 = x }
  return { headTop: top / h, feet: (bottom + 1) / h, ax: (fx0 + fx1 + 1) / 2 / w }
}

const r3 = (v) => Math.round(v * 1000) / 1000
const hash8 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8)

async function encode(input, longEdge, alpha) {
  const pipe = sharp(input).resize(longEdge, longEdge, { fit: 'inside', withoutEnlargement: true })
  return alpha
    ? pipe.webp({ quality: 86, alphaQuality: 100, effort: 5 }).toBuffer()
    : pipe.flatten({ background: '#ffffff' }).webp({ quality: 78, effort: 5 }).toBuffer()
}

function write(id, buf, bufM, written) {
  const h = hash8(buf)
  const name = `${id}.${h}.webp`, nameM = `${id}.${h}.m.webp`
  writeFileSync(join(OUT, name), buf)
  writeFileSync(join(OUT, nameM), bufM)
  written.add(name).add(nameM)
  return { src: URL_BASE + name, srcM: URL_BASE + nameM }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  mkdirSync(dirname(MANIFEST), { recursive: true })
  const pngIds = (dir) => (existsSync(dir) ? readdirSync(dir) : [])
    .filter((f) => f.endsWith('.png') && !f.startsWith('_'))
    .map((f) => f.slice(0, -4))
    .filter((id) => kindOf(id))
  const fresh = new Set(pngIds(RAW))
  const v2 = new Set(pngIds(RAW_V2))
  const v3 = new Set(pngIds(RAW_V3))
  const ids = [...new Set([...fresh, ...v3, ...v2, ...pngIds(RAW_V1)])].sort()
  const fallbacks = ids.filter((id) => !fresh.has(id))

  const imgs = {}
  for (const id of ids) {
    const img = await loadRgba(join(fresh.has(id) ? RAW : v3.has(id) ? RAW_V3 : v2.has(id) ? RAW_V2 : RAW_V1, id + '.png'))
    img.alpha = cleanAlpha(img)
    imgs[id] = img
  }

  // The kitchens share one crop box so they stay registered.
  let kitchenBox = null
  for (const id of KITCHEN) if (imgs[id]?.alpha) kitchenBox = kitchenBox ? union(kitchenBox, bbox(imgs[id])) : bbox(imgs[id])
  let yearsBox = null
  for (const id of YEARS) if (imgs[id]?.alpha) yearsBox = yearsBox ? union(yearsBox, bbox(imgs[id])) : bbox(imgs[id])

  const manifest = {}
  const rows = []
  const written = new Set()
  for (const id of ids) {
    const img = imgs[id]
    const kind = kindOf(id)
    const [L, LM] = SIZE[kind]
    let master
    if (img.alpha) {
      master = await trimmed(img, KITCHEN.includes(id) ? kitchenBox : YEARS.includes(id) ? yearsBox : bbox(img)).png().toBuffer()
    } else {
      master = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).removeAlpha().png().toBuffer()
    }
    const buf = await encode(master, L, img.alpha)
    const bufM = await encode(master, Math.min(L, LM), img.alpha)
    const meta = await sharp(buf).metadata()
    const entry = { ...write(id, buf, bufM, written), w: meta.width, h: meta.height, kind, alpha: img.alpha }
    if ((kind === 'person' || kind === 'group') && img.alpha) {
      const m = await figureMetrics(buf)
      entry.feet = r3(m.feet)
      entry.headTop = r3(m.headTop)
      entry.ax = r3(m.ax)
    }
    manifest[id] = entry
    rows.push([id, kind, `${img.w}x${img.h}`, `${meta.width}x${meta.height}`, buf.length + bufM.length])
  }

  for (const [id, [from, position]] of Object.entries(COVERS)) {
    if (!imgs[from]) continue
    const img = imgs[from]
    const base = await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
      .removeAlpha()
      .resize(COVER_W, COVER_H, { fit: 'cover', position })
      .png()
      .toBuffer()
    const buf = await sharp(base).webp({ quality: 78, effort: 5 }).toBuffer()
    const bufM = await sharp(base).resize(COVER_WM).webp({ quality: 78, effort: 5 }).toBuffer()
    manifest[id] = { ...write(id, buf, bufM, written), w: COVER_W, h: COVER_H, kind: 'photo', alpha: false }
    rows.push([id, 'photo', `from ${from}`, `${COVER_W}x${COVER_H}`, buf.length + bufM.length])
  }

  // Remove stale outputs (old hashes, ids that no longer exist).
  for (const f of readdirSync(OUT)) if (f.endsWith('.webp') && !written.has(f)) rmSync(join(OUT, f))

  // Merge: other builders' `kind: "ui"` entries are kept untouched. Re-read right before writing.
  const current = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
  for (const [k, v] of Object.entries(current)) if (v.kind === 'ui') manifest[k] = v
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]))
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n')

  const pad = (s, n) => String(s).padEnd(n)
  console.log(pad('id', 22) + pad('kind', 8) + pad('original', 22) + pad('output', 12) + 'bytes (both sizes)')
  for (const r of rows) console.log(pad(r[0], 22) + pad(r[1], 8) + pad(r[2], 22) + pad(r[3], 12) + String(r[4]).padStart(9))
  const total = readdirSync(OUT).reduce((s, f) => s + statSync(join(OUT, f)).size, 0)
  console.log(`\n${rows.length} images, public/landing/img total ${total} bytes (${(total / 1048576).toFixed(2)} MB)`)
  if (kitchenBox) console.log('kitchen union box', kitchenBox)
  if (fallbacks.length) console.log(`\nSTILL ON ROUND-ONE RAWS (${fallbacks.length}): ${fallbacks.join(' ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
