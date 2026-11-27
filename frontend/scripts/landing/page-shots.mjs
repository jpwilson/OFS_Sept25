// Full-page screenshots of the marketing pages, plus one contact sheet per viewport
// (owner: pages; see docs/landing/handover/PAGES.md).
//
//   node scripts/landing/page-shots.mjs --url http://127.0.0.1:5348 [--only m,tp,tl,d] [--pages /faq,/pricing]
//
// Writes shots/pages-<m|tp|tl|d>/<nn>-<slug>.jpg and sheet.jpg (every page, top to bottom,
// side by side). Prints console errors and any page that scrolls sideways.
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = require('playwright')

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '../..')
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : def
}
const BASE = arg('url', 'http://127.0.0.1:5348').replace(/\/$/, '')

export const VIEWPORTS = {
  m: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2, tile: 300 },
  tp: { width: 820, height: 1180, isMobile: true, hasTouch: true, deviceScaleFactor: 1, tile: 340 },
  tl: { width: 1180, height: 820, isMobile: true, hasTouch: true, deviceScaleFactor: 1, tile: 400 },
  d: { width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1, tile: 420 },
}
export const PAGES = [
  '/alternatives',
  '/compare/facebook-groups',
  '/compare/tinybeans',
  '/compare/familyalbum',
  '/compare/private-instagram',
  '/compare/how-to-share-photos-privately',
  '/features',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/privacy',
  '/terms',
  '/this-page-does-not-exist',
]

const only = arg('only', 'm,tp,tl,d').split(',')
const pages = arg('pages', '') ? arg('pages').split(',') : PAGES
const slug = (p) => p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home'

const browser = await chromium.launch()
for (const key of only) {
  const vp = VIEWPORTS[key]
  const out = join(FRONTEND, `shots/pages-${key}`)
  if (!arg('pages', '')) rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  })
  const files = []
  for (const [i, path] of pages.entries()) {
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    if (path === '/faq') await page.click('button[class*=question]').catch(() => {})
    await page.waitForTimeout(400)
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    const small = await page.evaluate(() => {
      // touch targets under 44px tall (links and buttons with a box)
      return [...document.querySelectorAll('.ofsl a, .ofsl button, .ofsl input, .ofsl textarea')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          if (!r.width || !r.height) return false
          if (el.closest('p, li') && el.tagName === 'A' && !el.closest('footer')) return false // links inside running text
          return r.height < 44
        })
        .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().height)}px`)
    })
    const file = join(out, `${String(PAGES.indexOf(path) + 1).padStart(2, '0')}-${slug(path)}.jpg`)
    await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 78 })
    files.push({ path, file })
    console.log(`${key} ${path}${wide > 0 ? `  SIDEWAYS ${wide}px` : ''}${errors.length ? `  errors: ${errors.slice(0, 3).join(' | ')}` : ''}`)
    if (vp.hasTouch && small.length) console.log(`   small targets: ${small.slice(0, 20).join('; ')}`)
    await page.close()
  }
  // Contact sheet: every page full length, side by side.
  const sheet = await ctx.newPage()
  await sheet.setViewportSize({ width: 1600, height: 1000 })
  const imgs = files
    .map(
      (f) =>
        `<figure><figcaption>${f.path}</figcaption><img src="data:image/jpeg;base64,${readFileSync(f.file).toString('base64')}"></figure>`
    )
    .join('')
  await sheet.setContent(
    `<style>body{margin:0;background:#3a3a3a;font:14px system-ui;color:#fff}main{display:flex;gap:12px;padding:12px;align-items:flex-start;width:max-content}figure{margin:0;width:${vp.tile}px}figcaption{padding:0 0 6px}img{width:100%;display:block}</style><main>${imgs}</main>`,
    { waitUntil: 'load' }
  )
  await sheet.screenshot({ path: join(out, 'sheet.jpg'), fullPage: true, type: 'jpeg', quality: 70 })
  await sheet.close()
  await ctx.close()
  console.log(`sheet: shots/pages-${key}/sheet.jpg`)
}
await browser.close()
