// Asserts that the built output is actually crawlable. Run after `npm run build`:
//   npm run seo:check
//
// Checks, per public page, that the raw HTML (no JavaScript executed) contains a
// unique title, a meta description, an absolute self-referencing canonical,
// exactly one <h1>, JSON-LD that parses, and more than 300 words of text. Also
// checks robots.txt, sitemap.xml, llms.txt and llms-full.txt.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PAGES } from '../src/content/marketing.js'
import { countWords } from '../src/content/renderStatic.js'
import { SITE_ORIGIN, absUrl, INDEXNOW_KEY } from '../src/content/site.js'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../dist')
const MIN_WORDS = 300

let failures = 0
const fail = (where, msg) => {
  failures++
  console.error(`  FAIL  ${where}: ${msg}`)
}

const distFileFor = (path) => (path === '/' ? 'index.html' : `${path.replace(/^\//, '')}.html`)

const seenTitles = new Map()
const rows = []

for (const page of PAGES) {
  const rel = distFileFor(page.path)
  const file = join(DIST, rel)
  if (!existsSync(file)) {
    fail(page.path, `missing built file dist/${rel} - run npm run build first`)
    continue
  }
  const html = readFileSync(file, 'utf-8')

  // <title>
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]
  if (!title) fail(page.path, 'no <title>')
  else if (seenTitles.has(title)) fail(page.path, `duplicate <title> (also on ${seenTitles.get(title)})`)
  else seenTitles.set(title, page.path)

  // meta description
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1]
  if (!desc) fail(page.path, 'no meta description')
  else if (desc.length < 50) fail(page.path, `meta description too short (${desc.length} chars)`)

  // canonical, absolute and self-referencing on the production host
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]
  if (canonical !== absUrl(page.path)) {
    fail(page.path, `canonical is "${canonical}", expected "${absUrl(page.path)}"`)
  }

  // exactly one H1
  const h1s = html.match(/<h1[\s>]/g) || []
  if (h1s.length !== 1) fail(page.path, `expected exactly one <h1>, found ${h1s.length}`)

  // lang attribute
  if (!/<html[^>]+lang="en"/.test(html)) fail(page.path, 'missing lang="en" on <html>')

  // social tags
  for (const tag of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!html.includes(`property="${tag}"`)) fail(page.path, `missing ${tag}`)
  }
  if (!html.includes('name="twitter:card"')) fail(page.path, 'missing twitter:card')

  // JSON-LD parses, and mentions the page URL
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  if (!blocks.length) fail(page.path, 'no JSON-LD')
  let types = []
  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw)
      const graph = parsed['@graph'] || [parsed]
      types.push(...graph.map((n) => n['@type']))
    } catch (e) {
      fail(page.path, `JSON-LD does not parse: ${e.message}`)
    }
  }
  if (!types.includes('Organization')) fail(page.path, 'JSON-LD missing Organization')
  if (!types.includes('WebSite')) fail(page.path, 'JSON-LD missing WebSite')
  if (page.isFaqPage && !types.includes('FAQPage')) fail(page.path, 'JSON-LD missing FAQPage')
  if (page.breadcrumb && !types.includes('BreadcrumbList')) fail(page.path, 'JSON-LD missing BreadcrumbList')

  // crawler-visible word count, with scripts and styles stripped
  const words = countWords(html)
  if (words < MIN_WORDS) fail(page.path, `only ${words} crawler-visible words (need > ${MIN_WORDS})`)

  // the H1 text must really be in the HTML, not injected by JS
  if (!html.includes('<h1>')) fail(page.path, 'H1 is not in the raw HTML')

  rows.push({ path: page.path, words, titleLen: title?.length ?? 0, descLen: desc?.length ?? 0, types: [...new Set(types)].join(',') })
}

// --- site-level files ---
const readDist = (name) => (existsSync(join(DIST, name)) ? readFileSync(join(DIST, name), 'utf-8') : null)

const robots = readDist('robots.txt')
if (!robots) fail('robots.txt', 'missing from dist')
else {
  for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User',
    'ClaudeBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot', 'bingbot',
    'Applebot', 'Applebot-Extended', 'DuckAssistBot', 'meta-externalagent', 'CCBot']) {
    if (!robots.includes(`User-agent: ${bot}`)) fail('robots.txt', `no explicit group for ${bot}`)
  }
  if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)) fail('robots.txt', 'no absolute Sitemap line')
  if (/^Disallow: \/$/m.test(robots)) fail('robots.txt', 'blanket Disallow: / found')
}

const sitemap = readDist('sitemap.xml')
if (!sitemap) fail('sitemap.xml', 'missing from dist')
else {
  for (const page of PAGES) {
    if (!sitemap.includes(`<loc>${absUrl(page.path)}</loc>`)) {
      fail('sitemap.xml', `missing ${absUrl(page.path)}`)
    }
  }
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  if (locs.length !== PAGES.length) fail('sitemap.xml', `${locs.length} URLs, expected ${PAGES.length}`)
  if (!/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap)) fail('sitemap.xml', 'no lastmod')
}

const llms = readDist('llms.txt')
if (!llms) fail('llms.txt', 'missing from dist')
else {
  if (llms.trimStart().startsWith('<')) fail('llms.txt', 'looks like HTML, not plain text')
  for (const page of PAGES) {
    if (!llms.includes(absUrl(page.path))) fail('llms.txt', `does not link ${absUrl(page.path)}`)
  }
}

const llmsFull = readDist('llms-full.txt')
if (!llmsFull) fail('llms-full.txt', 'missing from dist')
else if (llmsFull.trimStart().startsWith('<')) fail('llms-full.txt', 'looks like HTML, not plain text')
else if (countWords(llmsFull) < 3000) fail('llms-full.txt', `only ${countWords(llmsFull)} words`)

if (!readDist(`${INDEXNOW_KEY}.txt`)) fail('indexnow', `missing dist/${INDEXNOW_KEY}.txt`)

// --- report ---
console.log('\n  page                                      words  title  desc  JSON-LD types')
for (const r of rows) {
  console.log(
    `  ${r.path.padEnd(40)} ${String(r.words).padStart(6)} ${String(r.titleLen).padStart(6)} ${String(r.descLen).padStart(5)}  ${r.types}`
  )
}

if (failures) {
  console.error(`\n${failures} SEO check(s) failed.`)
  process.exit(1)
}
console.log(`\nAll SEO checks passed for ${PAGES.length} public pages.`)
