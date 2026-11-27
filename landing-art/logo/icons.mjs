// The chosen logo (C, Journey Pin) -> the site's favicon, app icons and share image.
//   frontend/public/favicon.svg                 the 16-unit favicon cut (C-journey-pin-16.svg)
//   frontend/public/icons/apple-touch-icon.png  180, full square lime, no transparency (iOS rounds it)
//   frontend/public/icons/icon-192x192.png      the rounded home-screen tile (C-journey-pin-icon.svg)
//   frontend/public/icons/icon-512x512.png
//   frontend/public/icons/icon-maskable-*.png   full-bleed lime, mark at ~60% so Android's mask never crops it
//   frontend/public/og-share.jpg                the old tile beside the name swapped for the new one
// Re-runnable: everything is rebuilt from the SVGs in this folder and og-share-source.jpg.
// Usage (Node 22): cd landing-art && node logo/icons.mjs
import sharp from 'sharp'
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const PUB = join(DIR, '..', '..', 'frontend', 'public')
const LIME = '#C6F135'

const tile = readFileSync(join(DIR, 'C-journey-pin-icon.svg'), 'utf8')
const mark = readFileSync(join(DIR, 'C-journey-pin.svg'), 'utf8') // 64-unit art, transparent

/** The mark (its 64-unit box) on a full-bleed lime square, scaled to `share` of the side. */
const square = (share) => {
  const s = share
  const o = (64 * (1 - s)) / 2
  const body = mark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${LIME}"/><g transform="translate(${o} ${o}) scale(${s})">${body}</g></svg>`
}

const png = (svg, size) => sharp(Buffer.from(svg), { density: (72 * size) / 64 * 4 }).resize(size, size)

// Favicon: the simplified cut, as is.
copyFileSync(join(DIR, 'C-journey-pin-16.svg'), join(PUB, 'favicon.svg'))

// Apple: same proportions as the tile (.78), but square and opaque.
await png(square(0.78), 180).flatten({ background: LIME }).removeAlpha().png().toFile(join(PUB, 'icons', 'apple-touch-icon.png'))
for (const n of [192, 512]) {
  await png(tile, n).png().toFile(join(PUB, 'icons', `icon-${n}x${n}.png`))
  await png(square(0.6), n).flatten({ background: LIME }).removeAlpha().png().toFile(join(PUB, 'icons', `icon-maskable-${n}x${n}.png`))
}

// Share image: keep the untouched original once, then always patch from it.
const OG = join(PUB, 'og-share.jpg')
const OG_SRC = join(DIR, 'og-share-source.jpg')
if (!existsSync(OG_SRC)) copyFileSync(OG, OG_SRC)
const T = { x: 72, y: 123, size: 46 } // the old tile's box in og-share-source.jpg
const PAD = 4
const { data, info } = await sharp(OG_SRC).raw().toBuffer({ resolveWithObject: true })
const at = (x, y) => (y * info.width + x) * info.channels
for (let y = T.y - PAD; y < T.y + T.size + PAD; y++) {
  const ref = at(T.x - PAD - 2, y) // the flat paper just left of the tile, row by row
  for (let x = T.x - PAD; x < T.x + T.size + PAD; x++) {
    for (let c = 0; c < 3; c++) data[at(x, y) + c] = data[ref + c]
  }
}
const newTile = await png(tile, T.size).png().toBuffer()
const og = await sharp(data, { raw: info })
  .composite([{ input: newTile, left: T.x, top: T.y }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toBuffer()
writeFileSync(OG, og)
console.log('logo C: favicon, 5 icons, og-share written')
