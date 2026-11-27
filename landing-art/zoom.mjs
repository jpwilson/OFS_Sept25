// Zoom check: node zoom.mjs <out.jpg> <id>:<x0>,<y0>,<x1>,<y1> ...  (fractions of the raw image), composited on a mid grey.
import sharp from 'sharp'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ART = dirname(fileURLToPath(import.meta.url))
const [out, ...specs] = process.argv.slice(2)
const tiles = []
for (const s of specs) {
  const [id, box] = s.split(':')
  const [a, b, c, d] = (box || '0,0,1,1').split(',').map(Number)
  const img = sharp(join(ART, 'raw', id + '.png'))
  const { width: w, height: h } = await img.metadata()
  const ex = { left: Math.round(a * w), top: Math.round(b * h), width: Math.round((c - a) * w), height: Math.round((d - b) * h) }
  const buf = await sharp(join(ART, 'raw', id + '.png')).extract(ex).resize(900, 900, { fit: 'inside' })
    .flatten({ background: '#8a93a3' }).png().toBuffer()
  tiles.push(buf)
}
const metas = await Promise.all(tiles.map((t) => sharp(t).metadata()))
const cols = Math.min(2, tiles.length), cw = 920, rows = Math.ceil(tiles.length / cols)
const rowH = []; for (let r = 0; r < rows; r++) rowH.push(Math.max(...metas.slice(r * cols, r * cols + cols).map((m) => m.height)) + 20)
const comp = []; let y = 10
for (let r = 0; r < rows; r++) { for (let c = 0; c < cols && r * cols + c < tiles.length; c++) comp.push({ input: tiles[r * cols + c], left: 10 + c * cw, top: y }); y += rowH[r] }
await sharp({ create: { width: cols * cw + 10, height: y, channels: 3, background: '#ffffff' } }).composite(comp).jpeg({ quality: 88 }).toFile(join(ART, 'sheets', out))
console.log(join(ART, 'sheets', out))
