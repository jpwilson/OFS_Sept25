// Contact sheets for checking by eye, built from the processed webp files + manifest.
// Usage: cd landing-art && node process.mjs && node sheets.mjs [job]
//   jobs: washes, detail, photos, kitchen, plates  (none = all)
//   node sheets.mjs pick <name> <id> <id> ...   one ad-hoc detail sheet
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ART = dirname(fileURLToPath(import.meta.url))
const ROOT = join(ART, '..')
const PUBLIC = join(ROOT, 'frontend', 'public')
const OUT = join(ART, 'sheets')
const M = JSON.parse(readFileSync(join(ROOT, 'frontend', 'src', 'landing', 'art', 'manifest.json'), 'utf8'))
const MAXW = 2000

const WASHES = { tide: '#19CFC7', fizz: '#FF62C4', zest: '#FF8A1F', azure: '#3AA8FF', lime: '#C6F135' }
const KITCHEN = ['r-kitchen-before', 'r-kitchen-gutted', 'r-kitchen-fitted', 'r-kitchen-done']

const file = (id) => join(PUBLIC, M[id].src)
const ids = (pred) => Object.keys(M).filter((id) => pred(M[id], id))
const cutouts = ids((a, id) => a.alpha && !KITCHEN.includes(id))
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const text = (x, y, s, { size = 20, fill = '#101B3B' } = {}) =>
  `<text x="${x}" y="${y}" font-family="Menlo, monospace" font-size="${size}" fill="${fill}" text-anchor="middle">${esc(s)}</text>`

const resized = (id, w, h) => sharp(file(id)).resize(Math.round(w), Math.round(h)).png().toBuffer()

async function save(name, w, h, bg, layers, svg = '') {
  const comp = [...layers]
  if (svg) comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`), left: 0, top: 0 })
  let img = sharp({ create: { width: w, height: h, channels: 3, background: bg } }).composite(comp)
  if (w > MAXW) img = sharp(await img.png().toBuffer()).resize(MAXW)
  await img.jpeg({ quality: 88 }).toFile(join(OUT, name))
  console.log(join(OUT, name))
}

async function grid(name, list, bg, cols, cell, labelColor = '#101B3B') {
  if (!list.length) return
  const PAD = 20, LABEL = 30
  const W = cols * cell + (cols + 1) * PAD
  const rows = Math.ceil(list.length / cols)
  const H = rows * (cell + LABEL) + (rows + 1) * PAD
  const layers = []
  let svg = ''
  for (let i = 0; i < list.length; i++) {
    const a = M[list[i]]
    const s = Math.min(cell / a.w, cell / a.h)
    const w = Math.round(a.w * s), h = Math.round(a.h * s)
    const cx = PAD + (i % cols) * (cell + PAD), cy = PAD + Math.floor(i / cols) * (cell + LABEL + PAD)
    layers.push({ input: await resized(list[i], w, h), left: cx + Math.round((cell - w) / 2), top: cy + Math.round((cell - h) / 2) })
    svg += text(cx + cell / 2, cy + cell + 22, list[i], { size: 18, fill: labelColor })
  }
  await save(name, W, H, bg, layers, svg)
}

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

async function washes() {
  for (const [wash, col] of Object.entries(WASHES)) await grid(`wash-${wash}.jpg`, cutouts, col, 9, 200)
}

// Large cells on a pale ground: hands, faces, feet, the dog.
async function detail() {
  const figs = ids((a) => a.kind === 'person' || a.kind === 'group')
  const things = ids((a, id) => (a.kind === 'object' || a.kind === 'prop') && !KITCHEN.includes(id))
  let n = 1
  for (const c of chunk(figs, 8)) await grid(`detail-people-${n++}.jpg`, c, '#E3E9F2', 4, 470)
  n = 1
  for (const c of chunk(things, 12)) await grid(`detail-things-${n++}.jpg`, c, '#E3E9F2', 4, 470)
}

async function photos() {
  const sets = ['kitchen', 'race', 'coast', 'year', 'trip']
  for (const s of sets) await grid(`photos-${s}.jpg`, ids((a, id) => id.startsWith(`photo-${s}-`)), '#FFFFFF', 3, 640)
  await grid('photos-covers.jpg', ids((a, id) => id.startsWith('cover-')), '#FFFFFF', 3, 640)
}

// The four stages side by side, then each pair at 50/50 over the next.
async function kitchen() {
  const have = KITCHEN.filter((id) => M[id])
  if (have.length < 2) return
  const PAD = 20, LABEL = 30
  const a = M[have[0]]
  const w2 = Math.floor((MAXW - 3 * PAD) / 2), h2 = Math.round((a.h / a.w) * w2)
  const flat = async (id) => sharp({ create: { width: w2, height: h2, channels: 3, background: '#F4F7FB' } })
    .composite([{ input: await resized(id, w2, h2) }]).png().toBuffer()
  const tiles = []
  for (const id of have) tiles.push([id, await flat(id)])
  for (let i = 0; i < have.length - 1; i++) {
    const lower = await flat(have[i])
    const upper = await sharp(await flat(have[i + 1])).removeAlpha().ensureAlpha(0.5).png().toBuffer()
    tiles.push([`${have[i].slice(10)} + ${have[i + 1].slice(10)} 50/50`, await sharp(lower).composite([{ input: upper }]).png().toBuffer()])
  }
  const rows = Math.ceil(tiles.length / 2)
  const H = PAD + rows * (h2 + LABEL + PAD)
  const layers = []
  let svg = ''
  tiles.forEach(([label, buf], i) => {
    const x = PAD + (i % 2) * (w2 + PAD), y = PAD + Math.floor(i / 2) * (h2 + LABEL + PAD)
    layers.push({ input: buf, left: x, top: y })
    svg += `<rect x="${x}" y="${y}" width="${w2}" height="${h2}" fill="none" stroke="#9AA0A6" stroke-width="1"/>`
    svg += text(x + w2 / 2, y + h2 + 22, label)
  })
  await save('kitchen-overlay.jpg', MAXW, H, '#FFFFFF', layers, svg)
}

const plates = () => grid('plates.jpg', ids((a) => a.kind === 'plate'), '#FFFFFF', 2, 960)

mkdirSync(OUT, { recursive: true })
const [job, ...rest] = process.argv.slice(2)
if (job === 'pick') {
  const [name, ...list] = rest
  await grid(basename(name).replace(/\.jpg$/, '') + '.jpg', list.filter((id) => M[id]), '#E3E9F2', Math.min(4, list.length), 470)
} else {
  const jobs = { washes, detail, photos, kitchen, plates }
  for (const [k, fn] of Object.entries(jobs)) if (!job || job === k) await fn()
}
