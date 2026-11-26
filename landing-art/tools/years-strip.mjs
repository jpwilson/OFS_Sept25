// The five years pairs on one strip at the SAME scale and canvas position (raw, untrimmed) so the floor line and growth can be compared.
import sharp from 'sharp'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ART = join(dirname(fileURLToPath(import.meta.url)), '..')
const W = 600, PAD = 10
const comp = []
let svg = ''
for (let i = 1; i <= 5; i++) {
  const buf = await sharp(join(ART, 'raw', `g-years-${i}.png`)).resize(W).flatten({ background: '#E3E9F2' }).png().toBuffer()
  const { height } = await sharp(buf).metadata()
  comp.push({ input: buf, left: PAD + (i - 1) * (W + PAD), top: PAD })
  svg += `<text x="${PAD + (i - 1) * (W + PAD) + W / 2}" y="${PAD + height + 24}" font-family="Menlo" font-size="20" fill="#101B3B" text-anchor="middle">g-years-${i}</text>`
}
const H = PAD + 400 + 40
// floor guide: lowest opaque row of stage 1
const { data, info } = await sharp(join(ART, 'raw', 'g-years-1.png')).resize(W).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
let floor = 0
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 64) floor = y
svg += `<line x1="0" x2="${5 * (W + PAD) + PAD}" y1="${PAD + floor}" y2="${PAD + floor}" stroke="#F247AF" stroke-width="2"/>`
comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${5 * (W + PAD) + PAD}" height="${H}">${svg}</svg>`), left: 0, top: 0 })
const out = join(ART, 'sheets', 'consistency-years.jpg')
await sharp({ create: { width: 5 * (W + PAD) + PAD, height: H, channels: 3, background: '#ffffff' } }).composite(comp).jpeg({ quality: 90 }).toFile(out)
console.log(out)
