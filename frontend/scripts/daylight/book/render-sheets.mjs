#!/usr/bin/env node
// Draws saved book layouts as page images and a contact sheet per story (owner: book ENGINE).
//
//   node scripts/daylight/book/render-sheets.mjs [--only <slug>] [--size hc-8x8] [--pages 1,5,9] [--guides]
//   -> shots/daylight-book-engine/<slug>.<size>.sheet.png      cover, then every spread
//      shots/daylight-book-engine/<slug>.<size>.p<N>.png       single pages asked for with --pages
//
// The drawer is lib/svg.mjs, which makes no layout decisions; Chromium draws the SVG with
// the book's own TTFs and the real photos. Reads scripts/daylight/book/fixtures/*.json
// (run build-layouts.mjs first).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pageSvg, coverSvg, fontFaces } from './lib/svg.mjs'
import { photoPath, FONT_DIR } from './lib/samples.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../../..')
const FIX = path.join(HERE, 'fixtures')
const OUT = path.join(FRONTEND, 'shots/daylight-book-engine')
const { chromium } = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')('playwright')
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const only = arg('--only', null)
const size = arg('--size', null)
const pagesWanted = (arg('--pages', '') || '').split(',').filter(Boolean).map(Number)
const guides = process.argv.includes('--guides')

const fontUrl = (file) => pathToFileURL(path.join(FONT_DIR, file)).href
// a made-up story's photos have no files: draw a labelled grey placeholder of the right shape
const placeholder = (src) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="#c9d2de"/><path d="M0 0L100 100M100 0L0 100" stroke="#a9b4c4" stroke-width="0.6"/></svg>`)}`
const imageUrl = (src) => { const f = photoPath(src); return f ? pathToFileURL(f).href : placeholder(src) }

fs.mkdirSync(OUT, { recursive: true })
const tmp = path.join(OUT, '.tmp')
fs.mkdirSync(tmp, { recursive: true })
const files = fs.readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'index.json')
  .filter((f) => !only || f.startsWith(only + '.')).filter((f) => !size || f.includes(`.${size}.`)).sort()

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ deviceScaleFactor: 1 })
for (const f of files) {
  const book = JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'))
  const base = f.replace(/\.json$/, '')
  const PW = 300 // a page drawn 300 px wide on the sheet
  const css = fontFaces(book, fontUrl)
  const pageHtml = (p) => `<figure><div class="pg ${p.side}">${pageSvg(book, p, { imageUrl, width: PW, guides })}</div><figcaption>${p.number} · ${p.template}${p.section ? '' : ''}</figcaption></figure>`
  const spreads = []
  spreads.push([null, book.pages[0]])
  for (let i = 1; i < book.pages.length; i += 2) spreads.push([book.pages[i], book.pages[i + 1] || null])
  const notices = book.notices.map((n) => `${n.code}${n.page ? ` p${n.page}` : ''}`).join(', ')
  const html = `<!doctype html><meta charset="utf-8"><style>${css}
    body{margin:0;padding:28px;background:#e9edf3;font:13px/1.4 -apple-system,system-ui,sans-serif;color:#101B3B}
    h1{font:800 22px/1.2 "B-display",sans-serif;margin:0 0 4px} .meta{margin:0 0 18px;color:#445}
    .cover{margin:0 0 26px} .cover svg{box-shadow:0 2px 10px rgba(0,0,0,.18);background:#fff}
    .grid{display:flex;flex-wrap:wrap;gap:26px 34px}
    .spread{display:flex;gap:0;box-shadow:0 2px 10px rgba(0,0,0,.16)}
    figure{margin:0;width:${PW}px;background:#fff;position:relative} figure.empty{background:transparent;box-shadow:none}
    figcaption{position:absolute;left:0;right:0;bottom:-18px;font:11px/1 ui-monospace,Menlo,monospace;color:#556;text-align:center}
    .pg svg{display:block} .pg.left{box-shadow:inset -8px 0 10px -8px rgba(0,0,0,.25)}
  </style><body><h1>${book.title}</h1><p class="meta">${book.product.label} · ${book.pageCount} pages · cover: ${book.cover.style} · smallest photo ${book.stats.minPpi} ppi${notices ? ` · notices: ${notices}` : ''}</p>
  <div class="cover">${coverSvg(book, { imageUrl, width: Math.min(1300, PW * 4.2), guides: true })}</div>
  <div class="grid">${spreads.map(([a, b]) => `<div class="spread">${a ? pageHtml(a) : '<figure class="empty"></figure>'}${b ? pageHtml(b) : '<figure class="empty"></figure>'}</div>`).join('')}</div></body>`
  const htmlFile = path.join(tmp, `${base}.html`)
  fs.writeFileSync(htmlFile, html)
  const page = await ctx.newPage()
  await page.setViewportSize({ width: 3 * (PW * 2 + 34) + 56, height: 900 })
  await page.goto(pathToFileURL(htmlFile).href)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT, `${base}.sheet.png`), fullPage: true })
  await page.close()
  for (const n of pagesWanted) {
    const p = book.pages[n - 1]
    if (!p) continue
    const one = `<!doctype html><meta charset="utf-8"><style>${css}body{margin:0;background:#fff}svg{display:block}</style>${pageSvg(book, p, { imageUrl, width: 1000, guides })}`
    const pf = path.join(tmp, `${base}.p${n}.html`)
    fs.writeFileSync(pf, one)
    const pg = await ctx.newPage()
    await pg.setViewportSize({ width: 1000, height: Math.ceil((1000 * p.trim.h) / p.trim.w) })
    await pg.goto(pathToFileURL(pf).href)
    await pg.evaluate(() => document.fonts.ready)
    await pg.screenshot({ path: path.join(OUT, `${base}.p${n}.png`) })
    await pg.close()
  }
  console.log(`[book] ${path.relative(FRONTEND, path.join(OUT, `${base}.sheet.png`))}`)
}
await browser.close()
fs.rmSync(tmp, { recursive: true, force: true })
