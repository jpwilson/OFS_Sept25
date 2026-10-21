// Build-time prerender of every public marketing page.
//
// Vite ships an empty <div id="root">, which means GPTBot, ClaudeBot,
// PerplexityBot and most other AI fetchers (which do not run JavaScript) saw
// about eight words on the home page. This script writes a static HTML file per
// public page into dist/, with the full text already in the markup plus the
// per-page title, description, canonical, Open Graph tags and JSON-LD.
//
// Same text for humans and bots: React mounts into #root and replaces the
// prerendered markup. The new pages re-render these very blocks through
// src/components/MarketingPage.jsx, and the home page re-renders the shared
// sections (marketing.js HOME_SHARED_BLOCKS) inside src/pages/Landing.jsx, so
// nothing a crawler was shown disappears once JavaScript runs. Landing.jsx adds
// its own illustrated sections on top of that.
//
// Routing is handled by vercel.json: cleanUrls serves /faq from faq.html, the
// real React routes are rewritten to /, and anything else gets dist/404.html
// with a real HTTP 404 instead of a soft-404 copy of the home page.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NOT_FOUND_PAGE, PAGES } from '../src/content/marketing.js'
import { buildHead, renderBody, countWords } from '../src/content/renderStatic.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '../dist')

// Minimal on-brand styling for the pre-hydration / no-JavaScript view. The
// React app replaces this markup as soon as it mounts.
const SHELL_STYLE = `<style>
.prerender-shell{max-width:900px;margin:0 auto;padding:2rem 1.25rem;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.7;color:#E5E7EB;background:#0F1419}
.prerender-shell h1{font-size:2.25rem;line-height:1.2;color:#F9FAFB;margin:.5rem 0 1rem}
.prerender-shell h2{font-size:1.6rem;color:#F9FAFB;margin:2rem 0 .75rem}
.prerender-shell h3{font-size:1.15rem;color:#F9FAFB;margin:1.5rem 0 .5rem}
.prerender-shell p,.prerender-shell li{color:#C9CDD4}
.prerender-shell a{color:#8b9bf0}
.prerender-shell nav a{margin-right:1rem}
.prerender-shell table{border-collapse:collapse;width:100%;margin:1rem 0}
.prerender-shell th,.prerender-shell td{border:1px solid #1F2937;padding:.6rem;text-align:left;vertical-align:top}
.prerender-shell footer{margin-top:3rem;border-top:1px solid #1F2937;padding-top:1.5rem}
</style>`

const NOSCRIPT =
  '<noscript><p>Our Family Socials needs JavaScript for the app itself (feed, events, maps). ' +
  'Everything on this page is readable without it.</p></noscript>'

const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf-8')

const SEO_BLOCK = /<!-- SEO:START[\s\S]*?<!-- SEO:END -->/
if (!SEO_BLOCK.test(baseHtml)) {
  throw new Error('prerender: SEO:START/SEO:END markers missing from dist/index.html')
}
if (!baseHtml.includes('<!-- SEO:BODY -->')) {
  throw new Error('prerender: SEO:BODY marker missing from dist/index.html')
}

const outputPathFor = (path) =>
  path === '/' ? join(DIST, 'index.html') : join(DIST, `${path.replace(/^\//, '')}.html`)

const report = []

// NOT_FOUND_PAGE is written to dist/404.html, which Vercel serves with an HTTP
// 404 for any address that is neither a static file nor a rewritten React
// route. It carries robots: noindex and stays out of the sitemap.
for (const page of [...PAGES, NOT_FOUND_PAGE]) {
  const body = renderBody(page)
  const html = baseHtml
    .replace(SEO_BLOCK, buildHead(page))
    .replace('<!-- SEO:BODY -->', SHELL_STYLE + body)
    .replace('</body>', `${NOSCRIPT}</body>`)

  const out = outputPathFor(page.path)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html, 'utf-8')
  report.push({ path: page.path, words: countWords(body), file: out.replace(DIST, 'dist') })
}

for (const r of report) {
  console.log(`  prerendered ${r.path.padEnd(40)} ${String(r.words).padStart(5)} words  -> ${r.file}`)
}
console.log(`\n${report.length} marketing pages prerendered.`)
