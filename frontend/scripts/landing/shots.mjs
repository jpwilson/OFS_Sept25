#!/usr/bin/env node
// Checkpoint screenshots plus a contact sheet (owner: F0). Port of otherwise/scripts/shots.mjs.
//
//   node scripts/landing/shots.mjs --url http://127.0.0.1:5320/ --out shots/<name>
//     [--selector '#lp-film'] [--from 0 --to 1 --steps 12] [--phone] [--w 1440 --h 900]
//     [--reduced] [--nojs] [--click '<selector>'] [--press <key>] [--wait load|domcontentloaded|networkidle]
//     [--settle 900] [--quality 78] [--storage '{"token":"x"}'] [--full]
//
// Scrolls to evenly spaced positions across the page (or across one element's scroll range
// with --selector), waits for smoothing to settle and images to decode, and saves NN.jpg
// (1440x900, or 390x844 with --phone) and sheet.jpg. --click / --press act once after load
// (before the first shot). --storage sets localStorage before any page script runs.
// --wait domcontentloaded with --steps 1 shoots the first paint.
// Prints console errors and warnings, failed requests, the final URL, and whether the page
// scrolls sideways. Output goes under frontend/shots/ (gitignored).
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Playwright lives in another project; do not npm-install it here.
const require = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = require('playwright')

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '../..')
const FLAGS = new Set(['phone', 'reduced', 'nojs', 'full'])

function parseArgs(argv) {
  const a = { url: 'http://127.0.0.1:5320/', out: 'shots/run', from: 0, to: 1, steps: 12, settle: 900, quality: 78, wait: 'networkidle' }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '')
    if (FLAGS.has(k)) a[k] = true
    else a[k] = argv[++i]
  }
  for (const k of ['from', 'to', 'settle', 'quality']) a[k] = Number(a[k])
  a.steps = Math.max(1, Math.round(Number(a.steps)))
  a.w = Number(a.w || (a.phone ? 390 : 1440))
  a.h = Number(a.h || (a.phone ? 844 : 900))
  return a
}

const args = parseArgs(process.argv.slice(2))
const outDir = resolve(FRONTEND, args.out)
if (!outDir.startsWith(join(FRONTEND, 'shots'))) {
  console.error('--out must be under frontend/shots/')
  process.exit(1)
}
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] })
const context = await browser.newContext({
  viewport: { width: args.w, height: args.h },
  deviceScaleFactor: 1,
  isMobile: !!args.phone,
  hasTouch: !!args.phone,
  javaScriptEnabled: !args.nojs,
  reducedMotion: args.reduced ? 'reduce' : 'no-preference',
})
if (args.storage) {
  const entries = JSON.parse(args.storage)
  await context.addInitScript((e) => {
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  }, entries)
}
const page = await context.newPage()

const consoleErrors = []
const consoleWarnings = []
const failed = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
  else if (m.type() === 'warning') consoleWarnings.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText ?? 'failed'} ${r.url()}`))
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
})

await page.goto(args.url, { waitUntil: args.wait, timeout: 45_000 }).catch((e) => console.warn('goto:', e.message))
if (args.wait !== 'domcontentloaded') {
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForTimeout(400)
}
if (args.click) {
  await page.click(args.click, { timeout: 5000 }).catch((e) => console.warn('click:', e.message))
  await page.waitForTimeout(500)
}
if (args.press) {
  await page.keyboard.press(args.press).catch((e) => console.warn('press:', e.message))
  await page.waitForTimeout(500)
}

// The scroll range to sample.
const range = await page.evaluate((sel) => {
  const vh = innerHeight
  const docMax = Math.max(0, document.documentElement.scrollHeight - vh)
  if (!sel) return { start: 0, end: docMax, found: true }
  const el = document.querySelector(sel)
  if (!el) return { start: 0, end: docMax, found: false }
  const r = el.getBoundingClientRect()
  const top = r.top + scrollY
  return { start: Math.min(docMax, top), end: Math.min(docMax, top + Math.max(0, r.height - vh)), found: true }
}, args.selector ?? null)
if (args.selector && !range.found) console.warn(`! selector ${args.selector} not found; sampling the whole page`)

/** Scroll to y and wait until the page stops moving (Lenis smoothing settles). */
async function settleAt(y) {
  if (args.wait === 'domcontentloaded' && args.steps === 1) return
  await page.evaluate((y) => window.scrollTo(0, y), y)
  if (!args.nojs) {
    await page.evaluate(
      () =>
        new Promise((res) => {
          let last = -1
          let still = 0
          const t0 = performance.now()
          const tick = () => {
            const y = scrollY
            still = Math.abs(y - last) < 0.5 ? still + 1 : 0
            last = y
            if (still >= 8 || performance.now() - t0 > 4000) res()
            else requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }),
    )
    await page.evaluate(async () => {
      const vh = innerHeight
      const imgs = [...document.images].filter((img) => {
        const r = img.getBoundingClientRect()
        return r.bottom > -vh * 0.25 && r.top < vh * 1.25 && r.width > 0
      })
      await Promise.race([
        Promise.all(
          imgs.map((img) =>
            img.complete
              ? img.decode?.().catch(() => {})
              : new Promise((r) => {
                  img.addEventListener('load', r, { once: true })
                  img.addEventListener('error', r, { once: true })
                }).then(() => img.decode?.().catch(() => {})),
          ),
        ),
        new Promise((r) => setTimeout(r, 5000)),
      ])
    })
  }
  await page.waitForTimeout(args.settle)
}

const n = args.steps
const taken = []
for (let i = 0; i < n; i++) {
  const t = n === 1 ? args.from : args.from + ((args.to - args.from) * i) / (n - 1)
  const y = Math.round(range.start + (range.end - range.start) * t)
  await settleAt(y)
  const file = join(outDir, `${String(i + 1).padStart(2, '0')}.jpg`)
  await page.screenshot({ path: file, type: 'jpeg', quality: args.quality, fullPage: !!args.full })
  const actual = await page.evaluate(() => Math.round(scrollY))
  taken.push({ file, y, actual, t })
}

// Sideways scroll check, with the worst offenders named.
const width = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth
  const sw = document.documentElement.scrollWidth
  const wide = []
  if (sw > vw) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 || r.left < -1) {
        if (getComputedStyle(el).position === 'fixed') continue
        const cls = typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
        wide.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls} (${Math.round(r.left)}..${Math.round(r.right)})`)
        if (wide.length >= 6) break
      }
    }
  }
  return { vw, sw, wide, boot: document.documentElement.dataset.boot || '(none)', href: location.href }
})

await browser.close()

// Contact sheet.
const cols = args.phone ? Math.min(6, n) : Math.min(4, n)
const rows = Math.ceil(n / cols)
const tileW = args.phone ? 260 : 480
const sheet = join(outDir, 'sheet.jpg')
try {
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-start_number', '1', '-i', join(outDir, '%02d.jpg'), '-vf', `scale=${tileW}:-1,tile=${cols}x${rows}:padding=8:margin=8:color=white`, '-frames:v', '1', '-q:v', '3', sheet],
    { stdio: 'inherit' },
  )
} catch (e) {
  console.warn('! ffmpeg contact sheet failed:', e.message)
}

console.log(`\nshots: ${args.url}  ${args.w}x${args.h}${args.phone ? ' phone' : ''}${args.reduced ? ' reduced-motion' : ''}${args.nojs ? ' no-js' : ''}${args.selector ? `  selector ${args.selector}` : ''}`)
console.log(`final: ${width.href}  data-boot=${width.boot}`)
console.log(`range: y ${Math.round(range.start)}..${Math.round(range.end)}  (${n} checkpoints, t ${args.from}..${args.to})`)
for (const s of taken) console.log(`  ${s.file.split('/').pop()}  t=${s.t.toFixed(3)}  y=${s.y}${s.actual !== s.y ? ` (at ${s.actual})` : ''}`)
console.log(`sheet: ${sheet}`)
console.log(`files: ${readdirSync(outDir).length} in ${outDir}`)
console.log(width.sw > width.vw ? `✗ WIDER THAN VIEWPORT: scrollWidth ${width.sw} > ${width.vw}\n    ${width.wide.join('\n    ')}` : `✓ no sideways scroll (scrollWidth ${width.sw} = viewport ${width.vw})`)
console.log(consoleErrors.length ? `✗ console errors (${consoleErrors.length}):\n    ${[...new Set(consoleErrors)].join('\n    ')}` : '✓ no console errors')
if (consoleWarnings.length) console.log(`! console warnings (${consoleWarnings.length}):\n    ${[...new Set(consoleWarnings)].slice(0, 12).join('\n    ')}`)
console.log(failed.length ? `✗ failed requests (${failed.length}):\n    ${[...new Set(failed)].join('\n    ')}` : '✓ no failed requests')
