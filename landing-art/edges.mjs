// Halo check: a native-resolution crop around the top of each cut-out (hair edge), on a given ground.
// Usage: node edges.mjs <out.jpg> <#hex> [id ...]   (no ids = every cut-out in raw/)
import sharp from 'sharp'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ART = dirname(fileURLToPath(import.meta.url))
const [out, bg, ...picked] = process.argv.slice(2)
const ids = picked.length ? picked : readdirSync(join(ART, 'raw')).filter((f) => /^(p-|g-|o-|prop-)/.test(f) && f.endsWith('.png')).map((f) => f.slice(0, -4)).sort()
const S = 260, COLS = 7, PAD = 8, LAB = 22
const tiles = []
for (const id of ids) {
  const { data, info } = await sharp(join(ART, 'raw', id + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  let ty = -1, tx = 0
  for (let y = 0; y < h && ty < 0; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) { ty = y; tx = x; break }
  if (ty < 0) continue
  const left = Math.max(0, Math.min(w - S, tx - S / 2)), top = Math.max(0, Math.min(h - S, ty - 30))
  const crop = await sharp(join(ART, 'raw', id + '.png')).extract({ left, top, width: S, height: S }).flatten({ background: bg }).png().toBuffer()
  tiles.push({ id, crop })
}
const rows = Math.ceil(tiles.length / COLS)
const W = COLS * (S + PAD) + PAD, H = rows * (S + LAB + PAD) + PAD
let svg = ''
const comp = tiles.map((t, i) => {
  const x = PAD + (i % COLS) * (S + PAD), y = PAD + Math.floor(i / COLS) * (S + LAB + PAD)
  svg += `<text x="${x + S / 2}" y="${y + S + 16}" font-family="Menlo" font-size="13" fill="#888" text-anchor="middle">${t.id}</text>`
  return { input: t.crop, left: x, top: y }
})
comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`), left: 0, top: 0 })
await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(comp).jpeg({ quality: 90 }).toFile(join(ART, 'sheets', out))
console.log(join(ART, 'sheets', out))
