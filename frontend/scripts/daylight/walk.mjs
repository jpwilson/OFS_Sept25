#!/usr/bin/env node
// The integration walkthrough (owner: F0 / integration). One scripted run through the whole
// app on the sample family, signed in as the sample user, phone (390x844) first, then
// desktop (1440x900): the feed, a filter, the calendar, the timeline, the Tetons story with
// the map following, Play, the lightbox with a reaction, comments, the world map, the
// thirty Teton photos becoming a draft and being published, and the profile.
//
//   node scripts/daylight/walk.mjs [--base http://127.0.0.1:5333] [--device phone|desktop|both] [--as maya]
//                                  [--viewport 375x560,1024x700] [--overlap]
//
// --viewport walks at those sizes instead (narrower than 900 walks the phone path; written to
// daylight-walk-<w>x<h>/). --overlap runs the overlap detector (scripts/daylight/overlap.mjs)
// on every frame, outlines what collides in the frame, lists it in report.json and exits 1 if
// anything does. For every page scrolled top to bottom, see check-overlap.mjs.
//
// Writes frontend/shots/daylight-walk-m/ (phone) and daylight-walk-d/ (desktop):
// NN-name.jpg, sheet.jpg (labelled contact sheet) and report.json. Capture conventions as
// scripts/daylight/capture.mjs (FOUNDATION.md "Shooting"): sign in through /__fx/signin,
// service workers blocked, only the app and the two tile hosts reachable, fake clock
// 26 Nov 2026 noon America/Chicago, never full-page (WebGL clears), wait for maps to go idle.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { detectOverlap, highlight, unhighlight } from './overlap.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../..')
const KIT = path.resolve(FRONTEND, '../landing-art/kits/tetons')
const requirePw = createRequire('/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/')
const { chromium } = requirePw('playwright')

const args = { base: 'http://127.0.0.1:5333', device: 'both', as: 'maya', only: null, viewport: null, overlap: false }
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, '')
  if (k === 'overlap') args.overlap = true
  else args[k] = process.argv[++i]
}
const TILE_HOSTS = new Set(['tiles.openfreemap.org', 'tiles.mapterhorn.com'])
const NOW = new Date('2026-11-26T12:00:00')
const TETONS = 'Seven days in the Tetons'
const KIT_FILES = fs.readdirSync(KIT).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => path.join(KIT, f))
const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } }
const devices = args.viewport
  ? args.viewport.split(',').map((v) => { const [width, height] = v.split('x').map(Number); return { key: v, width, height, phone: width < 900 } })
  : (args.device === 'both' ? ['phone', 'desktop'] : [args.device]).map((d) => ({ key: d, ...SIZES[d], phone: d === 'phone' }))
let overlapTotal = 0
const only = args.only ? new Set(args.only.split(',')) : null

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})

for (const dev of devices) {
  const { phone, key: device } = dev
  const OUT = path.join(FRONTEND, 'shots', `daylight-walk-${args.viewport ? device : phone ? 'm' : 'd'}`)
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const report = { device, base: args.base, as: args.as, shots: [], errors: [], unanswered: [], notes: [], hosts: {}, aborted: {}, overlap: [] }
  const bump = (o, k) => (o[k] = (o[k] || 0) + 1)

  const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height },
    deviceScaleFactor: 2,
    isMobile: dev.width < 600,
    hasTouch: phone,
    serviceWorkers: 'block',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    permissions: ['microphone'],
    userAgent: dev.width < 600 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1' : undefined,
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
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message.split('\n')[0]}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/Failed to load resource: net::ERR_FAILED/.test(t)) return
    report.errors.push(`console: ${t.slice(0, 220)}`)
  })
  page.on('response', async (res) => {
    if (res.status() !== 404) return
    const u = new URL(res.url())
    if (!u.pathname.startsWith('/api/v1/')) return
    const body = await res.text().catch(() => '')
    if (body.includes('no sample answer')) report.unanswered.push(`${res.request().method()} ${u.pathname}${u.search}`)
  })

  // ---------------------------------------------------------------- helpers
  const tap = async (sel, opts) => {
    const loc = typeof sel === 'string' ? page.locator(sel).first() : sel
    await loc.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {})
    if (phone) await loc.tap({ timeout: 10000, ...opts })
    else await loc.click({ timeout: 10000, ...opts })
  }
  async function idle(ms = 500, timeout = 45000) {
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await page.waitForFunction(() => {
      const els = [...document.querySelectorAll('[data-map-state]')]
      return els.every((e) => e.dataset.mapState === 'idle' || e.dataset.mapState === 'failed')
    }, null, { timeout }).catch(() => report.errors.push(`timeout waiting for the map to go idle (${page.url().replace(args.base, '')})`))
    await page.evaluate(async () => {
      await document.fonts?.ready
      const imgs = [...document.images].filter((i) => !i.complete && i.loading !== 'lazy')
      await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000) })))
    })
    await page.waitForTimeout(ms)
  }
  async function shot(name, label) {
    const n = report.shots.length + 1
    const file = path.join(OUT, `${String(n).padStart(2, '0')}-${name}.jpg`)
    const found = args.overlap ? (await page.evaluate(detectOverlap)).findings : []
    if (found.length) {
      report.overlap.push(...found.map((f) => ({ shot: n, name, ...f })))
      for (const f of found) console.log(`  ${device} ✗ ${name}: ${f.kind} ${f.a}${f.b ? `  x  ${f.b}` : ''}${f.note ? ` (${f.note})` : ''}`)
      await highlight(page, found)
    }
    await page.screenshot({ path: file, type: 'jpeg', quality: 84 })
    if (found.length) await unhighlight(page)
    report.shots.push({ n, name, label, file: path.relative(FRONTEND, file), url: page.url().replace(args.base, '') })
    console.log(`  ${device} ${String(n).padStart(2, '0')}  ${label}`)
  }
  async function step(name, fn) {
    if (only && !only.has(name)) return
    try {
      await fn()
    } catch (e) {
      report.errors.push(`step ${name}: ${e.message.split('\n')[0]}`)
      console.log(`  ${device} ✗ ${name}: ${e.message.split('\n')[0]}`)
      await shot(`${name}-failed`, `${name}: FAILED here (${e.message.split('\n')[0].slice(0, 80)})`).catch(() => {})
    }
  }
  const scrollToSel = (sel, at = 0.38) => page.evaluate(([q, f]) => {
    const el = document.querySelector(q)
    if (!el) throw new Error(`nothing at ${q}`)
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - window.innerHeight * f + 6, behavior: 'instant' })
  }, [sel, at])
  const waitText = (sel, text, timeout = 40000) => page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent.includes(t), [sel, text], { timeout })
  const waitCard = (stopId, scope, timeout = 40000) => page.waitForFunction(([s, id]) => !!document.querySelector(`${s} [data-ui="stop-card"][data-stop="${id}"], ${s}[data-key="${id}"]`), [scope, stopId], { timeout })
  async function swipeTo(rowSel, key) {
    await page.evaluate(([sel, k]) => {
      const box = document.querySelector(sel)
      const card = [...box.children].find((c) => c.dataset.key === k)
      box.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      box.scrollTo({ left: card.offsetLeft - (box.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
    }, [rowSel, key])
  }
  async function tapMarker(sel) {
    const pt = await page.evaluate((q) => {
      const box = document.querySelector('[data-ui="world-map"]').getBoundingClientRect()
      for (const el of document.querySelectorAll(q)) {
        const r = el.getBoundingClientRect()
        const x = r.left + r.width / 2, y = r.top + r.height / 2
        if (el.classList.contains('maplibregl-marker-covered')) continue
        if (x < box.left + 30 || x > box.right - 30 || y < box.top + 70 || y > box.bottom - 30) continue
        const hit = document.elementFromPoint(x, y)
        if (hit && (el === hit || el.contains(hit))) return { x, y }
      }
      return null
    }, sel)
    if (!pt) throw new Error(`no visible marker for ${sel}`)
    if (phone) await page.touchscreen.tap(pt.x, pt.y)
    else await page.mouse.click(pt.x, pt.y)
  }

  // ---------------------------------------------------------------- sign in, fresh sample
  await page.request.get(`${args.base}/__fx/reset`)
  await page.request.get(`${args.base}/api/v1/__create/sample/reset`).catch(() => {})
  await page.goto(`${args.base}/__fx/signin?as=${args.as}&next=/feed`, { waitUntil: 'load' })
  await page.waitForURL((u) => new URL(u).pathname === '/feed', { timeout: 20000 })
  await page.waitForFunction(() => !!document.querySelector('[data-ui="tabbar"], button[aria-label$="your menu"]'), null, { timeout: 20000 }).catch(() => report.errors.push('sign-in did not complete'))

  // ---------------------------------------------------------------- the feed
  await step('feed', async () => {
    await page.waitForSelector('[data-ui="story-card"]', { timeout: 20000 })
    await idle(700)
    await shot('feed', 'Stories: the feed, newest first')
  })
  await step('filter', async () => {
    await tap('[data-ui="filter-button"]')
    await page.waitForSelector('[data-ui="filter-sheet"]')
    await page.waitForTimeout(700)
    await shot('filter-sheet', 'Filter: the sheet')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await tap(page.locator('[data-ui="chip-row"] button', { hasText: 'Vacations' }))
    await idle(600)
    await shot('filtered', 'A filter applied: Vacations')
    await tap(page.locator('[data-ui="chip-row"] button', { hasText: 'All categories' }))
    await page.waitForTimeout(400)
  })
  await step('calendar', async () => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await tap(page.getByRole('radio', { name: 'Calendar' }))
    await idle(700)
    await shot('calendar', 'Calendar: the year')
  })
  await step('timeline', async () => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await tap(page.getByRole('radio', { name: 'Timeline' }))
    await idle(700)
    await shot('timeline', 'Timeline')
    await page.evaluate(() => window.scrollTo(0, 0))
    await tap(page.getByRole('radio', { name: 'Feed' }))
    await page.waitForTimeout(500)
  })

  // ---------------------------------------------------------------- the Tetons story
  await step('open-story', async () => {
    const link = page.locator('[data-ui="story-card"] a', { hasText: TETONS }).first()
    await link.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, -120))
    await page.waitForTimeout(500)
    await shot('feed-tetons', `The feed at "${TETONS}"`)
    await tap(link)
    await page.waitForURL(/\/event\//, { timeout: 15000 })
    await page.waitForSelector('[data-ui="story-view"]', { timeout: 20000 })
    await idle(900)
    await shot('story-top', `Opening "${TETONS}"`)
  })
  if (phone) {
    await step('journey-card', async () => {
      await scrollToSel('[data-ui="journey-card"]', 0.25)
      await idle(700)
      await shot('journey-card', 'The journey card: the route, Play and Open map')
    })
    await step('reading', async () => {
      await scrollToSel('[data-stop-id="stop-4"]')
      await idle(800)
      await shot('reading', 'Reading day 3: the bottom bar follows the stop')
    })
    await step('map-sheet', async () => {
      await tap(page.getByRole('button', { name: /^(Open the map|Map|Show the map)$/ }).first()).catch(async () => {
        await scrollToSel('[data-ui="journey-card"]', 0.25)
        await tap(page.getByRole('button', { name: 'Open map' }).first())
      })
      await page.waitForSelector('[data-ui="journey-sheet"]', { timeout: 10000 })
      await page.waitForTimeout(900)
      await idle(1000)
      await shot('map-sheet', 'The full-screen map: where the reader is, with stop cards')
      await swipeTo('[data-ui="journey-cards"]', 'stop-6')
      await page.waitForTimeout(1300)
      await idle(1000)
      await shot('map-sheet-swipe', 'Swiped to stop 6: the map follows the cards')
      await tap('[data-ui="journey-sheet"] button[aria-label="Close the map"]')
      await page.waitForTimeout(600)
    })
    await step('play', async () => {
      await scrollToSel('[data-ui="journey-card"]', 0.25)
      await page.waitForTimeout(300)
      await tap(page.getByRole('button', { name: 'Play the journey' }).first())
      await waitText('[data-ui="journey-daycard"]', 'Day 1')
      await page.waitForTimeout(700)
      await shot('play-1', 'Play the journey (1): a title card opens each day')
      await waitCard('stop-1', '[data-ui="journey-cards"] [data-current]')
      await page.waitForTimeout(1500)
      await shot('play-2', 'Play (2): stop 1, its photos take turns')
      await waitCard('stop-3', '[data-ui="journey-cards"] [data-current]')
      await page.waitForTimeout(900)
      await shot('play-3', 'Play (3): travelling on to stop 3')
      await tap('[data-ui="journey-sheet"] button[aria-label="Close the map"]')
      await page.waitForTimeout(600)
    })
  } else {
    await step('panel', async () => {
      await scrollToSel('[data-stop-id="stop-1"]', 0.62)
      await idle(900)
      await shot('panel-top', 'Desktop: the reading column and the wide map panel')
      await scrollToSel('[data-stop-id="stop-4"]')
      await page.waitForTimeout(700)
      await idle(900)
      await shot('panel-day3', 'Scrolling: the map follows to day 3')
      await scrollToSel('[data-stop-id="stop-9"]')
      await page.waitForTimeout(700)
      await idle(900)
      await shot('panel-day5', 'Day 5: Oxbow Bend')
    })
    await step('play', async () => {
      await scrollToSel('[data-stop-id="stop-1"]', 0.62)
      await idle(600)
      await tap('[data-ui="journey-play"]')
      await waitText('[data-ui="journey-daycard"]', 'Day 1')
      await page.waitForTimeout(700)
      await shot('play-1', 'Play the journey (1): a title card opens each day')
      await waitCard('stop-1', '[data-ui="journey-dock"]')
      await page.waitForTimeout(2000)
      await shot('play-2', 'Play (2): stop 1, its photos take turns')
      await waitText('[data-ui="journey-daycard"]', 'Day 2')
      await page.waitForFunction(() => !document.querySelector('[data-ui="journey-daycard"]'), null, { timeout: 15000 })
      await page.waitForTimeout(1200)
      await shot('play-3', 'Play (3): travelling, the leg draws itself')
      await page.keyboard.press('k')
      await page.waitForTimeout(400)
    })
  }
  await step('lightbox', async () => {
    await scrollToSel('[data-ui="story-body"] figure[data-stop-id="stop-4"], [data-ui="story-body"] figure', 0.3)
    await page.waitForTimeout(600)
    await tap('[data-ui="story-body"] figure[data-stop-id="stop-4"] button[aria-haspopup="dialog"], [data-ui="story-body"] figure button[aria-haspopup="dialog"]')
    await page.waitForSelector('[data-ui="lightbox-foot"]', { timeout: 10000 })
    await page.waitForTimeout(1000)
    await shot('lightbox', 'The photo lightbox')
    await tap('[data-ui="lightbox-foot"] [data-ui="reaction-button"]')
    await page.waitForSelector('[data-ui="reaction-tray"]', { timeout: 8000 })
    await page.waitForTimeout(500)
    await shot('reaction-tray', 'The ten reactions, on touch too')
    await tap('[data-ui="reaction-tray"] button:nth-child(2)')
    await page.waitForTimeout(800)
    await shot('reacted', 'A reaction given')
    await tap('button[aria-label="Close photos"]')
    await page.waitForTimeout(600)
  })
  await step('comments', async () => {
    await scrollToSel('#ofsa-comments', 0.12)
    await idle(700)
    await shot('comments', 'Comments, with a reply thread and real faces')
  })

  // ---------------------------------------------------------------- the world map
  await step('world', async () => {
    // the phone story brings its own bars in place of the tab bar: go back to Stories first
    await page.goto(`${args.base}/feed`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-ui="story-card"]', { timeout: 20000 })
    if (phone) await tap('[data-ui="tabbar"] a:has-text("Map"), [data-ui="tabbar"] button:has-text("Map")')
    else await tap(page.getByRole('link', { name: 'Map', exact: true }).first())
    await page.waitForSelector('[data-ui="world-map"]', { timeout: 20000 })
    await idle(1200)
    await shot('globe', 'The world map: the globe')
    await tapMarker('[data-ui="map-cluster"]')
    await page.waitForTimeout(900)
    await idle(1300)
    await shot('group', 'A group opened: the map goes in until its stories stand apart')
    if (phone) {
      await tapMarker('[data-ui="map-pin"]')
    } else {
      await tap('[data-ui="world-list"] [data-story="110"] button')
    }
    await page.waitForTimeout(900)
    await idle(1300)
    await shot('story-card', 'A story chosen: its card')
    const flat = page.getByRole('radio', { name: 'Flat' })
    if (await flat.count()) {
      if (!phone) await page.keyboard.press('Escape')
      await tap(flat)
      await page.waitForTimeout(900)
      await idle(1300)
      await shot('flat', 'Flat')
    } else report.notes.push('no Globe or Flat switch on this screen')
  })

  // ---------------------------------------------------------------- New: the thirty Teton photos
  let published = null
  await step('new', async () => {
    if (phone) await tap('[data-ui="tabbar"] >> text=New')
    else await tap('button:has-text("New story")')
    await page.waitForTimeout(700)
    await shot('new-menu', 'New: the three ways to start')
    await page.keyboard.press('Escape')
    await page.goto(`${args.base}/create?from=photos`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-ui="photo-input"]', { state: 'attached', timeout: 20000 })
    await page.setInputFiles('[data-ui="photo-input"]', KIT_FILES)
    await page.waitForSelector('[data-ui="create-summary"]', { timeout: 20000 })
    await page.waitForTimeout(1500)
    await idle(900)
    await shot('draft', 'Thirty photos became a draft: days, stops and the route')
    if (phone) {
      await tap('[data-ui="create-open-map"]')
      await page.waitForSelector('[data-ui="journey-sheet"]', { timeout: 10000 })
      await page.waitForTimeout(900)
      await idle(1200)
      await shot('draft-map', 'The draft on the real map')
      await tap('[data-ui="journey-sheet"] button[aria-label="Close the map"]')
      await page.waitForTimeout(600)
    }
  })
  await step('voice', async () => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await tap('[data-ui="mic"]')
    await page.waitForSelector('[data-ui="recording"]', { timeout: 10000 })
    await page.waitForTimeout(1800)
    await shot('recording', 'A voice note, recording')
    await tap('[data-ui="mic-stop"]')
    await page.waitForSelector('[data-ui="word-voice"][data-state="ready"]', { timeout: 30000 })
    await page.waitForTimeout(500)
    await shot('transcript', 'The voice note, transcribed')
    await page.waitForFunction(() => /Written|did not arrive|used up/.test(document.querySelector('[data-ui="job-write"]')?.textContent || ''), null, { timeout: 90000 })
    await idle(900)
    await shot('written', 'The write-up arrived, in the draft')
    if (phone) {
      await scrollToSel('[data-ui="create-preview"] [data-ui="story-body"]', 0.2).catch(() => {})
      await page.waitForTimeout(600)
      await shot('written-text', 'The write-up in the draft, with its stops')
      await page.evaluate(() => window.scrollTo(0, 0))
    } else {
      await scrollToSel('[data-ui="story-view"] h2:nth-of-type(3)', 0.3).catch(() => {})
      await page.waitForTimeout(700)
      await idle(900)
      await shot('written-map', 'The draft and its map in step')
      await page.evaluate(() => window.scrollTo(0, 0))
    }
  })
  await step('settings', async () => {
    await tap(phone ? '[data-ui="chip-audience"]' : '[data-ui="setting-audience"]')
    await page.waitForTimeout(800)
    await shot('audience', 'Publish settings: who sees it')
    await tap('[data-ui="sheet"] footer button:has-text("Done")')
    await page.waitForTimeout(500)
    await shot('ready', 'Ready to publish')
  })
  await step('publish', async () => {
    await tap(phone ? '[data-ui="create-phone-bar"] button:has-text("Publish")' : '[data-ui="publish"]')
    await page.waitForURL(/\/event\//, { timeout: 40000 })
    published = page.url()
    await page.waitForSelector('[data-ui="story-view"]', { timeout: 20000 })
    await idle(1200)
    await shot('published', 'Published: the new story')
    if (phone) await scrollToSel('[data-ui="journey-card"]', 0.25).catch(() => {})
    else await scrollToSel('[data-ui="story-body"] [data-stop-id]', 0.4).catch(() => {})
    await page.waitForTimeout(600)
    await idle(1000)
    await shot('published-map', 'The published story with its journey')
  })

  // ---------------------------------------------------------------- the profile
  await step('profile', async () => {
    await page.goto(`${args.base}/profile/${args.as}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-ui="story-card"], [data-ui="profile-page"]', { timeout: 20000 }).catch(() => {})
    await idle(900)
    await shot('profile', 'Your profile')
  })
  // ---------------------------------------------------------------- the family tree
  await step('family', async () => {
    await page.goto(`${args.base}/family-tree`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-tree-state="grown"], [data-ui="family-empty"], [data-ui="empty-state"]', { timeout: 20000 })
    await idle(700)
    await shot('family', 'Your family tree')
  })
  report.published = published
  await ctx.close()

  // ---------------------------------------------------------------- contact sheet
  const w = phone ? 300 : 620
  const tiles = report.shots.map((s) => `<figure style="margin:0;width:${w}px"><div style="padding:4px 0;min-height:34px">${String(s.n).padStart(2, '0')} · ${s.label.replace(/</g, '&lt;')}</div><img style="width:${w}px;border:2px solid #101B3B;border-radius:8px;display:block" src="data:image/jpeg;base64,${fs.readFileSync(path.join(FRONTEND, s.file)).toString('base64')}"></figure>`).join('')
  const html = `<!doctype html><html><body style="margin:0;background:#F4F7FB;font:13px Menlo,monospace;color:#101B3B">
  <div style="padding:16px 16px 4px;font-weight:700">Daylight walkthrough · ${phone ? 'phone' : 'desktop'} ${dev.width}x${dev.height} · signed in as ${args.as} · ${report.shots.length} frames</div>
  <div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px">${tiles}</div></body></html>`
  const sctx = await browser.newContext({ viewport: { width: phone ? 1600 : 1940, height: 900 }, deviceScaleFactor: 1 })
  const sp = await sctx.newPage()
  await sp.setContent(html, { waitUntil: 'load' })
  await sp.screenshot({ path: path.join(OUT, 'sheet.jpg'), type: 'jpeg', quality: 80, fullPage: true })
  await sctx.close()
  report.errors = [...new Set(report.errors)]
  report.unanswered = [...new Set(report.unanswered)]
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`sheet: ${path.relative(process.cwd(), path.join(OUT, 'sheet.jpg'))}`)
  console.log(report.unanswered.length ? `✗ unanswered: ${report.unanswered.join(', ')}` : '✓ every API route answered')
  console.log(report.errors.length ? `✗ errors (${report.errors.length}):\n    ${report.errors.slice(0, 20).join('\n    ')}` : '✓ no errors')
  if (args.overlap) console.log(report.overlap.length ? `✗ ${report.overlap.length} overlaps in ${new Set(report.overlap.map((f) => f.shot)).size} frames` : '✓ nothing collides in any frame')
  overlapTotal += report.overlap.length
}
await browser.close()
if (args.overlap && overlapTotal) process.exit(1)
