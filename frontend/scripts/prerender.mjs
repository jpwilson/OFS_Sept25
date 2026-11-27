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
//
// Landing variant (scripts/landing/variant.mjs). In the classic variant everything
// below runs exactly as it always has. In the story variant "/" is instead the real
// React landing rendered to a string (dist-ssr/entry-server.mjs) and hydrated on the
// client; see storyHome() below.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { NOT_FOUND_PAGE, PAGES } from '../src/content/marketing.js'
import { buildHead, renderBody, renderText, countWords } from '../src/content/renderStatic.js'
import { resolveVariant } from './landing/variant.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
// OFS_DIST / OFS_DIST_SSR: prerender a build written somewhere other than dist/ (used to
// verify a scratch build without touching the shared dist/). Default: dist/ and dist-ssr/.
const DIST = process.env.OFS_DIST ? resolve(process.env.OFS_DIST) : join(__dirname, '../dist')
const DIST_SSR = process.env.OFS_DIST_SSR ? resolve(process.env.OFS_DIST_SSR) : join(__dirname, '../dist-ssr')

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

// Story variant: the same shell in the landing's light look (paper ground, ink text, the
// page head on a wash), so the first paint before the app mounts matches the story pages
// (src/landing/pages). The classic variant keeps SHELL_STYLE above, byte for byte.
const STORY_SHELL_STYLE = `<style>
html,body{background:#F4F7FB}
.prerender-shell{max-width:900px;margin:0 auto;padding:1.25rem 1.25rem 3rem;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:18px;line-height:1.6;color:#101B3B;background:#F4F7FB}
.prerender-shell nav{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:.25rem 1rem;align-items:center;padding:.75rem 1.25rem;background:#fff;border:2px solid #101B3B;border-radius:999px;box-shadow:4px 4px 0 #101B3B}
.prerender-shell nav a{font-weight:600;text-decoration:none;color:#101B3B}
.prerender-shell main{padding-top:1.5rem}
.prerender-shell h1{font-size:clamp(2.4rem,6vw,4.5rem);line-height:.98;letter-spacing:-.03em;font-weight:800;color:#101B3B;margin:1rem 0;padding:1.5rem 0 1rem;box-shadow:0 0 0 100vmax #19CFC7;clip-path:inset(-100vmax -100vmax 0 -100vmax);background:#19CFC7}
.prerender-shell h2{font-size:1.75rem;line-height:1.1;letter-spacing:-.02em;font-weight:800;color:#101B3B;margin:2.25rem 0 .75rem}
.prerender-shell h3{font-size:1.2rem;font-weight:700;color:#101B3B;margin:1.5rem 0 .5rem}
.prerender-shell p,.prerender-shell li{color:#101B3B}
.prerender-shell a{color:#101B3B;text-decoration-thickness:2px;text-underline-offset:.18em}
.prerender-shell table{border-collapse:collapse;width:100%;margin:1rem 0;background:#fff}
.prerender-shell th,.prerender-shell td{border:2px solid #101B3B;padding:.6rem;text-align:left;vertical-align:top}
.prerender-shell footer{margin-top:3rem;border-top:2px solid #101B3B;padding-top:1.5rem}
</style>`

const NOSCRIPT =
  '<noscript><p>Our Family Socials needs JavaScript for the app itself (feed, events, maps). ' +
  'Everything on this page is readable without it.</p></noscript>'

const VARIANT = resolveVariant()
let baseHtml = readFileSync(join(DIST, 'index.html'), 'utf-8')

// Vite's manifest (build.manifest) is only for this script; never ship it.
const MANIFEST_FILE = join(DIST, '.vite/manifest.json')
const viteManifest = existsSync(MANIFEST_FILE) ? JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8')) : null
rmSync(join(DIST, '.vite'), { recursive: true, force: true })

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

// ---------------------------------------------------------------------------
// Story variant: "/" is the React landing, server-rendered.
// ---------------------------------------------------------------------------
const LANDING_FONTS = ['/landing/fonts/bricolage-grotesque-latin-var-v5.woff2', '/landing/fonts/dm-mono-latin-500-v5.woff2']
const ASSETS_MARK = 'null /*LANDING:ASSETS*/'

/** CSS files of a manifest entry and every chunk it statically imports. */
function cssOf(key, seen = new Set()) {
  if (seen.has(key) || !viteManifest[key]) return []
  seen.add(key)
  const e = viteManifest[key]
  return [...(e.imports || []).flatMap((k) => cssOf(k, seen)), ...(e.css || [])]
}
/** JS files of a manifest entry and every chunk it statically imports (not the page entry). */
function jsOf(key, seen = new Set()) {
  if (seen.has(key) || !viteManifest[key] || viteManifest[key].isEntry) return []
  seen.add(key)
  const e = viteManifest[key]
  return [e.file, ...(e.imports || []).flatMap((k) => jsOf(k, seen))]
}
/** Manifest key of a dynamic entry, by source path or by chunk name. */
function keyOf(src, name) {
  if (viteManifest[src]) return src
  return Object.keys(viteManifest).find((k) => viteManifest[k].isDynamicEntry && viteManifest[k].name === name)
}

let storyHomeHtml = null
if (VARIANT === 'story') {
  if (!viteManifest) throw new Error('prerender: dist/.vite/manifest.json missing (build.manifest in vite.config.js)')
  const landingKey = keyOf('src/landing/entry-client.jsx', 'entry-client')
  const appKey = keyOf('src/boot-app.jsx', 'boot-app')
  if (!landingKey || !appKey) throw new Error('prerender: landing or app entry missing from the Vite manifest')
  const abs = (list) => [...new Set(list)].map((f) => `/${f}`)
  const assets = {
    css: abs(cssOf(landingKey)),
    js: abs(jsOf(landingKey)),
    fonts: LANDING_FONTS,
    appCss: abs(cssOf(appKey)),
    app: abs(jsOf(appKey))
  }
  if (!assets.css.length) throw new Error('prerender: no landing stylesheet found in the Vite manifest')
  if (!baseHtml.includes(ASSETS_MARK)) throw new Error('prerender: LANDING:ASSETS marker missing from the boot script')
  // Every page carries the asset map: the boot script picks the landing set on "/" and
  // the app set everywhere else (so app routes never wait on the landing stylesheet).
  baseHtml = baseHtml.replace(ASSETS_MARK, () => JSON.stringify(assets))

  const ssrEntry = join(DIST_SSR, 'entry-server.mjs')
  if (!existsSync(ssrEntry)) throw new Error('prerender: dist-ssr/entry-server.mjs missing (scripts/landing/build-ssr.mjs)')
  const { render } = await import(pathToFileURL(ssrEntry).href)
  const { storyHome } = await import('../src/landing/content/seo.js')
  const appHtml = render()

  // CSS Modules names must match between the server and client builds.
  const css = assets.css.map((f) => readFileSync(join(DIST, f), 'utf-8')).join('\n')
  const classes = new Set([...appHtml.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => /^_/.test(c)))
  const unknown = [...classes].filter((c) => !css.includes(`.${c}`))
  if (unknown.length) throw new Error(`prerender: ${unknown.length} CSS module classes in the server html are not in the client CSS (${unknown.slice(0, 5).join(', ')})`)

  const home = PAGES.find((p) => p.path === '/')
  const page = storyHome(home)
  const head =
    buildHead(page) +
    // App routes share this file and never load the landing stylesheet: keep the static
    // landing hidden for them from the first paint.
    `\n    <style>html[data-boot="app"]:not(.ofsl-on) #root>[data-ofsl]{display:none}</style>` +
    `\n    <noscript>${assets.css.map((f) => `<link rel="stylesheet" href="${f}">`).join('')}</noscript>`

  // Function replacers: the html contains "$" (prices), which a replacement string would read.
  storyHomeHtml = baseHtml
    .replace(SEO_BLOCK, () => head)
    .replace('<!-- SEO:BODY -->', () => appHtml)
    .replace('</body>', () => `${NOSCRIPT}</body>`)

  const h1s = storyHomeHtml.match(/<h1[\s>]/g) || []
  if (h1s.length !== 1) throw new Error(`prerender: story index.html must contain exactly one <h1, found ${h1s.length}`)

  // llms-full.txt (written to public/ by the prebuild with the classic home): swap in the
  // story home's text, in dist only, so public/ stays as committed.
  const llmsFile = join(DIST, 'llms-full.txt')
  const llms = readFileSync(llmsFile, 'utf-8')
  const before = renderText(home)
  if (!llms.includes(before)) throw new Error('prerender: classic home text not found in dist/llms-full.txt')
  writeFileSync(llmsFile, llms.replace(before, () => renderText(page)), 'utf-8')
}

// NOT_FOUND_PAGE is written to dist/404.html, which Vercel serves with an HTTP
// 404 for any address that is neither a static file nor a rewritten React
// route. It carries robots: noindex and stays out of the sitemap.
for (const page of [...PAGES, NOT_FOUND_PAGE]) {
  const body = renderBody(page)
  const html = page.path === '/' && storyHomeHtml ? storyHomeHtml : baseHtml
    .replace(SEO_BLOCK, buildHead(page))
    .replace('<!-- SEO:BODY -->', (VARIANT === 'story' ? STORY_SHELL_STYLE : SHELL_STYLE) + body)
    .replace('</body>', `${NOSCRIPT}</body>`)

  const out = outputPathFor(page.path)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html, 'utf-8')
  report.push({ path: page.path, words: countWords(page.path === '/' && storyHomeHtml ? storyHomeHtml : body), file: out.replace(DIST, 'dist') })
}

for (const r of report) {
  console.log(`  prerendered ${r.path.padEnd(40)} ${String(r.words).padStart(5)} words  -> ${r.file}`)
}
console.log(`\n${report.length} marketing pages prerendered (landing variant: ${VARIANT}).`)
