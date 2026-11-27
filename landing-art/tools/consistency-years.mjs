// Consistency sheet: one row per household member, sheet-A face first, then six crops from different sets.
// Face boxes come from tools/faces.swift (macOS Vision); the person is picked by left-to-right index.
// Usage: node tools/consistency.mjs <faces-binary>
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ART = join(dirname(fileURLToPath(import.meta.url)), '..')
const RAW = join(ART, 'raw')
const ROWS = {
  IVY: [['_sheetA', 2], ['g-years-1', 0], ['g-years-2', 0], ['g-years-3', 0], ['g-years-4', 0], ['g-years-5', 0]],
  LEO: [['_sheetA', 3], ['g-years-1', 1], ['g-years-2', 1], ['g-years-3', 1], ['g-years-4', 1], ['g-years-5', 1]],
};const _OLD = {
  MAYA: [['../ref/cast-a', 0], ['g-family-hero', 1], ['photo-coast-summit', 0], ['photo-tetons-22', 0], ['photo-maui-sunrise', 0], ['photo-kitchen-tiling', 0], ['photo-wedding-family', 1]],
  TOM: [['../ref/cast-a', 1], ['g-family-hero', 2], ['photo-coast-summit', 1], ['photo-tetons-24', 0], ['photo-maui-sunrise', 2], ['photo-race-finish', 0], ['photo-wedding-family', 0]],
  IVY: [['../ref/cast-a', 2], ['photo-coast-cliff', 3], ['photo-tetons-18', 0], ['photo-maui-snorkel', 1], ['photo-wedding-ready', 2], ['photo-year-gala', 0], ['p-ivy-trophy', 0]],
  LEO: [['../ref/cast-a', 3], ['photo-coast-beach', 0], ['photo-tetons-07', 0], ['photo-maui-shave-ice', 1], ['photo-year-halloween', 0], ['photo-year-school', 0], ['p-leo-school', 0]],
  JOE: [['../ref/cast-a', 5], ['photo-trip-joe', 0], ['photo-wedding-dance', 5], ['photo-year-joe70', 3], ['photo-year-birthday', 5], ['photo-wedding-family', 7], ['p-joe-wave', 0]],
}
const files = [...new Set(Object.values(ROWS).flat().map(([f]) => join(RAW, f + '.png')))]
const faces = {}
for (const l of execFileSync(process.argv[2], files).toString().trim().split('\n')) {
  const d = JSON.parse(l)
  faces[d.file] = { w: d.w, h: d.h, f: d.faces.filter((b) => b[2] > 0.02).sort((a, b) => a[0] - b[0]) }
}
const S = 240, PAD = 10, LAB = 90
const comp = []
let svg = ''
let y = PAD
for (const [name, cells] of Object.entries(ROWS)) {
  svg += `<text x="${PAD}" y="${y + S / 2 + 8}" font-family="Menlo" font-size="22" fill="#101B3B">${name}</text>`
  for (let i = 0; i < cells.length; i++) {
    const [id, k] = cells[i]
    const F = faces[join(RAW, id + '.png')]
    const [fx, fy, fw, fh] = F.f[k]
    const cx = (fx + fw / 2) * F.w, cy = (fy + fh / 2) * F.h, side = Math.max(fw * F.w, fh * F.h) * 1.7
    const left = Math.max(0, Math.round(cx - side / 2)), top = Math.max(0, Math.round(cy - side / 2))
    const width = Math.min(F.w - left, Math.round(side)), height = Math.min(F.h - top, Math.round(side))
    const buf = await sharp(join(RAW, id + '.png')).extract({ left, top, width, height }).resize(S, S, { fit: 'cover' }).flatten({ background: '#ffffff' }).png().toBuffer()
    const x = LAB + i * (S + PAD)
    comp.push({ input: buf, left: x, top: y })
    svg += `<text x="${x + S / 2}" y="${y + S + 16}" font-family="Menlo" font-size="12" fill="#555" text-anchor="middle">${id.replace('../ref/', '')}</text>`
  }
  y += S + 26
}
const W = LAB + 6 * (S + PAD)
comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}">${svg}</svg>`), left: 0, top: 0 })
const out = join(ART, 'sheets', 'consistency-years-faces.jpg')
await sharp({ create: { width: W, height: y, channels: 3, background: '#ffffff' } }).composite(comp).jpeg({ quality: 90 }).toFile(out)
console.log(out)
