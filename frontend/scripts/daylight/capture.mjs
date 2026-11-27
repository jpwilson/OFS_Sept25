#!/usr/bin/env node
// Screenshots of Daylight against the sample (owner: F0). PLAN-DAYLIGHT 5.6.
//
// Start your sample server first (see docs/app/handover/FOUNDATION.md), then:
//   node scripts/daylight/capture.mjs --base http://127.0.0.1:5331 --out feed --routes "/feed,/feed?view=map"
//   node scripts/daylight/capture.mjs --scene shell|ui|spike|look [--base ...] [--out name]
// Options:
//   --routes a,b,c     paths to shoot (each opened after /__fx/signin?as=<as>)
//   --as maya          who is signed in (any cast key); --signed-out to shoot as a visitor
//   --device phone|desktop|both|ipad|ipad-land|all   default both; phone (390x844) is always
//                      shot first; ipad is 820x1180, ipad-land 1180x820, all is the four
//   --scene auth       the sign-in screens and their states (steps in src/daylight/auth/dev/scenes.mjs)
//   --full             full-page shots       --wait <css>   wait for a selector before shooting
//   --click <css>      click before shooting  --reduced     prefers-reduced-motion
//   --focus N          press Tab N times and shoot the focused state
//   --settle ms        extra wait (default 700)
// Writes frontend/shots/daylight-<out>/<device>-NN.jpg, sheet.jpg (phone first, labelled),
// sheet-<device>.jpg (one per viewport), report.json. Every run reports console errors, sideways scroll at
// 390, 768, 1280 and 1920, and the hosts contacted. Service workers are blocked; every host
// except the app and the two tile hosts is aborted. Exits 1 if an API route had no sample
// answer, a page threw, or anything scrolled sideways.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../..')
const requirePw = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = requirePw('playwright')

const args = { base: 'http://127.0.0.1:5330', as: 'maya', device: 'both', settle: 700, out: null, routes: null, scene: null }
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, '')
  if (['full', 'reduced', 'signed-out'].includes(k)) args[k] = true
  else args[k] = process.argv[++i]
}
const TILE_HOSTS = new Set(['tiles.openfreemap.org', 'tiles.mapterhorn.com'])
const NOW = new Date('2026-11-26T12:00:00')

// ---------------------------------------------------------------- scenes
const SCENES = {
  shell: {
    routes: ['/feed', '/feed?view=map', '/event/seven-days-in-the-tetons', '/event/six-weeks-without-a-kitchen', '/create?from=photos', '/create', '/import', '/profile/maya', '/settings', '/family-tree', '/notifications', '/event/403', '/share/tetons-share'],
  },
  ui: { routes: ['/feed?only=ui'], full: true },
  spike: { routes: ['/feed?only=spike'], wait: '[data-map-state="idle"]', settle: 4000 }, // never full-page: resizing the viewport clears WebGL canvases
  look: { custom: lookScene },
  auth: { custom: (...a) => import('../../src/daylight/auth/dev/scenes.mjs').then((m) => m.authScene(...a)), signedOut: true },
}
const scene = args.scene ? SCENES[args.scene] : null
if (args.scene && !scene) throw new Error(`unknown scene ${args.scene}; one of ${Object.keys(SCENES).join(', ')}`)
const routes = (args.routes ? args.routes.split(',') : scene?.routes) || ['/feed']
const outName = args.out || args.scene || 'shots'
const OUT = path.join(FRONTEND, 'shots', `daylight-${outName}`)
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const full = args.full || scene?.full
const wait = args.wait || scene?.wait
const settleMs = Number(args.settle !== 700 ? args.settle : scene?.settle || 700)
const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  ipad: { width: 820, height: 1180 },
  'ipad-land': { width: 1180, height: 820 },
  desktop: { width: 1440, height: 900 },
}
const devices = args.device === 'both' ? ['phone', 'desktop'] : args.device === 'all' ? Object.keys(VIEWPORTS) : [args.device]
if (devices.some((d) => !VIEWPORTS[d])) throw new Error(`unknown device ${args.device}`)

const report = { base: args.base, as: args['signed-out'] ? null : args.as, shots: [], errors: [], unanswered: [], sideways: [], hosts: {}, aborted: {} }
const bump = (o, k) => (o[k] = (o[k] || 0) + 1)

const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })

async function newPage(device) {
  const phone = device === 'phone'
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[device],
    // full-page shots of long pages exceed Chromium's capture limit at 2x
    deviceScaleFactor: full ? 1 : 2,
    isMobile: phone,
    hasTouch: phone || device.startsWith('ipad'),
    serviceWorkers: 'block',
    reducedMotion: args.reduced ? 'reduce' : 'no-preference',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    permissions: ['microphone'],
    userAgent: phone ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' : undefined,
  })
  const appHost = new URL(args.base).host
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url())
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue()
    bump(report.hosts, u.host)
    if (u.host === appHost || TILE_HOSTS.has(u.host)) return route.continue()
    bump(report.aborted, u.host)
    return route.abort()
  })
  const page = await ctx.newPage()
  await page.clock.install({ time: NOW })
  await page.clock.resume()
  page.on('pageerror', (e) => report.errors.push(`${device} pageerror: ${e.message.split('\n')[0]}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/Failed to load resource: net::ERR_FAILED/.test(t)) return // aborted third-party hosts
    report.errors.push(`${device} console: ${t.slice(0, 220)}`)
  })
  page.on('response', async (res) => {
    if (res.status() !== 404) return
    const u = new URL(res.url())
    if (!u.pathname.startsWith('/api/v1/')) return
    const body = await res.text().catch(() => '')
    if (body.includes('no sample answer')) report.unanswered.push(`${res.request().method()} ${u.pathname}${u.search}`)
  })
  if (!args['signed-out'] && !scene?.signedOut) {
    await page.goto(`${args.base}/__fx/signin?as=${args.as}&next=/feed`, { waitUntil: 'load' })
    await page.waitForURL((u) => new URL(u).pathname === '/feed', { timeout: 15000 })
    await page.waitForFunction(() => !!document.querySelector('[data-ui="tabbar"], button[aria-label$="your menu"]'), null, { timeout: 15000 }).catch(() => report.errors.push('sign-in did not complete'))
  }
  return page
}

async function settle(page, { waitSel, waitAll } = {}) {
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
  if (waitSel) {
    if (waitAll) {
      await page.waitForFunction((sel) => {
        const els = [...document.querySelectorAll('[data-map-state]')]
        return els.length && els.every((e) => e.matches(sel) || e.dataset.mapState === 'failed')
      }, waitSel, { timeout: 45000 }).catch(() => report.errors.push(`timeout waiting for ${waitSel}`))
    } else await page.waitForSelector(waitSel, { timeout: 30000 }).catch(() => report.errors.push(`timeout waiting for ${waitSel}`))
  }
  await page.evaluate(async () => {
    await document.fonts?.ready
    const imgs = [...document.images].filter((i) => !i.complete)
    await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 6000) })))
  })
  await page.waitForTimeout(settleMs)
}

async function sideways(page, label) {
  const vp = page.viewportSize()
  const widths = [390, 768, 1280, 1920]
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: vp.height })
    await page.waitForTimeout(120)
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth
      if (sw <= vw) return null
      const wide = []
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect()
        const inFixed = (n) => { for (; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false }
        if ((b.right > vw + 1 || b.left < -1) && !inFixed(el)) {
          wide.push(`${el.tagName.toLowerCase()}${el.dataset.ui ? `[data-ui=${el.dataset.ui}]` : ''}.${String(el.className).split(' ')[0]} ${Math.round(b.left)}..${Math.round(b.right)}`)
          if (wide.length > 4) break
        }
      }
      return { vw, sw, wide }
    })
    if (r) report.sideways.push(`${label} at ${w}: scrollWidth ${r.sw} > ${r.vw}: ${r.wide.join('; ')}`)
  }
  await page.setViewportSize(vp)
}

async function shoot(page, device, label, { click } = {}) {
  if (click) {
    await page.click(click, { timeout: 8000 }).catch((e) => report.errors.push(`click ${click}: ${e.message.split('\n')[0]}`))
    await page.waitForTimeout(900) // let sheet and scrim transitions finish
  }
  if (args.focus) {
    for (let i = 0; i < Number(args.focus); i++) await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
  }
  const n = report.shots.filter((s) => s.device === device).length + 1
  const file = path.join(OUT, `${device}-${String(n).padStart(2, '0')}.jpg`)
  await page.screenshot({ path: file, type: 'jpeg', quality: 82, fullPage: !!full })
  report.shots.push({ device, label, file: path.relative(FRONTEND, file), url: page.url().replace(args.base, '') })
  console.log(`  ${device} ${String(n).padStart(2, '0')}  ${label}`)
}

async function lookScene(page, device) {
  await page.goto(`${args.base}/feed`)
  await settle(page)
  await shoot(page, device, 'Daylight: Stories')
  if (device === 'phone') await page.click('[data-ui="tabbar"] button:has-text("You")')
  else await page.click('button[aria-label$="your menu"]')
  await page.waitForTimeout(450)
  await shoot(page, device, device === 'phone' ? 'You sheet' : 'Avatar menu')
  // The menu no longer offers the previous look (production release); ?look=classic still does.
  await page.keyboard.press('Escape')
  await page.goto(`${args.base}/feed?look=classic`)
  await settle(page)
  await shoot(page, device, 'Classic look, with the way back')
  await page.getByText('Back to the new look').click()
  await settle(page)
  await shoot(page, device, 'Daylight again')
}

for (const device of devices) {
  const page = await newPage(device)
  if (scene?.custom) await scene.custom(page, device, { base: args.base, settle, shoot, sideways, report })
  else {
    for (const r of routes) {
      await page.goto(`${args.base}${r}`, { waitUntil: 'domcontentloaded' })
      await settle(page, { waitSel: wait, waitAll: scene?.waitAll })
      await shoot(page, device, r, { click: args.click })
      if (device === 'phone') await sideways(page, r)
    }
  }
  await page.context().close()
}

// ---------------------------------------------------------------- labelled contact sheet
async function sheet(only = null) {
  const tiles = report.shots.map((s) => ({ ...s, data: fs.readFileSync(path.join(FRONTEND, s.file)).toString('base64') }))
  const html = `<!doctype html><html><body style="margin:0;background:#F4F7FB;font:13px Menlo,monospace;color:#101B3B">
  <div style="padding:16px 16px 4px;font-weight:700">daylight-${outName}${only ? ` · ${only} ${VIEWPORTS[only].width}x${VIEWPORTS[only].height}` : ''} · ${new Date().toISOString().slice(0, 16)} · ${report.shots.length} shots · phone first</div>
  ${Object.keys(VIEWPORTS).filter((d) => !only || d === only).map((d) => {
    const t = tiles.filter((x) => x.device === d)
    if (!t.length) return ''
    const w = { phone: 260, ipad: 330, 'ipad-land': 470, desktop: 560 }[d]
    return `<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px">${t.map((x, i) => `<figure style="margin:0;width:${w}px"><div style="padding:4px 0">${d} ${String(i + 1).padStart(2, '0')} · ${x.label.replace(/</g, '&lt;')}</div><img style="width:${w}px;border:2px solid #101B3B;border-radius:8px;display:block;${full ? 'max-height:1800px;object-fit:cover;object-position:top' : ''}" src="data:image/jpeg;base64,${x.data}"></figure>`).join('')}</div>`
  }).join('')}</body></html>`
  const ctx = await browser.newContext({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.setContent(html, { waitUntil: 'load' })
  await p.screenshot({ path: path.join(OUT, only ? `sheet-${only}.jpg` : 'sheet.jpg'), type: 'jpeg', quality: 80, fullPage: true })
  await ctx.close()
}
await sheet()
if (devices.length > 1) for (const d of devices) await sheet(d)
await browser.close()

report.errors = [...new Set(report.errors)]
report.unanswered = [...new Set(report.unanswered)]
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\nsheet: ${path.relative(process.cwd(), path.join(OUT, 'sheet.jpg'))}`)
console.log(`hosts: ${Object.entries(report.hosts).map(([h, n]) => `${h} ${n}`).join(', ')}`)
if (Object.keys(report.aborted).length) console.log(`aborted: ${Object.entries(report.aborted).map(([h, n]) => `${h} ${n}`).join(', ')}`)
console.log(report.unanswered.length ? `✗ unanswered API routes:\n    ${report.unanswered.join('\n    ')}` : '✓ every API route answered')
console.log(report.sideways.length ? `✗ sideways scroll:\n    ${report.sideways.join('\n    ')}` : '✓ no sideways scroll at 390, 768, 1280, 1920')
console.log(report.errors.length ? `✗ errors (${report.errors.length}):\n    ${report.errors.slice(0, 20).join('\n    ')}` : '✓ no console errors')
process.exit(report.unanswered.length || report.sideways.length || report.errors.some((e) => /pageerror/.test(e)) ? 1 : 0)
