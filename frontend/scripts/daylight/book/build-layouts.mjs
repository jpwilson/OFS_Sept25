#!/usr/bin/env node
// Lays out every sample story as a book and saves the display lists (owner: book ENGINE).
//
//   node scripts/daylight/book/build-layouts.mjs [--sizes hc-8x8,hc-10x8] [--check]
//   -> scripts/daylight/book/fixtures/<slug>.<size>.json      the Book (README.md), for PREVIEW, PDF and BUILDER
//      scripts/daylight/book/fixtures/index.json              what was built: pages, templates, notices
//
// Image sources keep the sample's __ORIGIN__ token, as sample.json does; a consumer swaps it
// for its own origin. --check exits 1 when a saved layout differs from a fresh one (the
// determinism check for CI: same input, same bytes).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSamples, nodeFonts } from './lib/samples.mjs'
import { everyShape } from './lib/synthetic.mjs'
import { layoutBook, bookToJSON, checkBook } from '../../../src/daylight/book/engine/index.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, 'fixtures')
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const sizes = arg('--sizes', 'hc-8x8,hc-10x8').split(',')
const check = process.argv.includes('--check')

const fonts = await nodeFonts()
const samples = await loadSamples()
// one made-up story with every photo shape and some photos too small to print large (no
// image files: its sources are example.invalid placeholders)
samples.push(everyShape())
fs.mkdirSync(OUT, { recursive: true })
const index = []
let diffs = 0
for (const s of samples) {
  for (const size of sizes) {
    const book = layoutBook(s.source, { fonts, edits: { size } })
    const json = bookToJSON(book)
    const file = path.join(OUT, `${s.event.slug}.${size}.json`)
    if (check) {
      const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
      if (old !== json + '\n') { diffs++; console.log(`DIFF ${path.basename(file)}`) }
    } else fs.writeFileSync(file, json + '\n')
    const problems = checkBook(book)
    const t = book.stats.templates
    index.push({ file: path.basename(file), story: s.event.title, size, pages: book.pageCount, templates: t, minPpi: book.stats.minPpi, cover: book.cover.style, notices: book.notices.map((n) => n.code), problems })
    console.log(`${book.pageCount.toString().padStart(3)} pp  ${size.padEnd(8)} ${s.event.title.padEnd(36)} ${Object.entries(t).map(([k, v]) => `${k}:${v}`).join(' ')}  minPpi ${book.stats.minPpi}  cover ${book.cover.style}${book.notices.length ? '  [' + [...new Set(book.notices.map((n) => n.code))].join(',') + ']' : ''}${problems.length ? '  PROBLEMS: ' + problems.join('; ') : ''}`)
  }
}
if (!check) fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1) + '\n')
if (check) {
  console.log(diffs ? `[book] ${diffs} saved layouts differ from a fresh build` : '[book] every saved layout matches a fresh build, byte for byte')
  process.exit(diffs ? 1 : 0)
}
